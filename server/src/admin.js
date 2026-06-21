const express = require("express");
const { db } = require("./db");
const { requireAuth } = require("./auth");
const {
  insertBonus,
  listBonuses,
  findBonus,
  deleteUnclaimedBonus,
} = require("./bonuses");

const ROLES = new Set(["user", "tester", "admin"]);
const SUGGESTION_STATUSES = new Set(["pending", "denied", "approved"]);
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const MAX_BONUS_POINTS = 1000;

const findUserByEmail = db.prepare(
  "SELECT id, email, username FROM users WHERE email = ?"
);

const listUsers = db.prepare(`
  SELECT id, email, username, role, created_at
  FROM users
  ORDER BY created_at DESC
`);
const updateRole = db.prepare("UPDATE users SET role = ? WHERE id = ?");
const findUser = db.prepare(
  "SELECT id, email, username, role FROM users WHERE id = ?"
);

const listSuggestions = db.prepare(`
  SELECT s.word, s.status, s.created_at, s.updated_at,
         s.user_id, u.email AS user_email, u.username AS user_username
  FROM word_suggestions s
  LEFT JOIN users u ON u.id = s.user_id
  ORDER BY
    CASE s.status WHEN 'pending' THEN 0 WHEN 'approved' THEN 1 ELSE 2 END,
    s.created_at DESC
`);
const updateSuggestionStatus = db.prepare(
  "UPDATE word_suggestions SET status = ? WHERE word = ?"
);
const findSuggestion = db.prepare(
  "SELECT word, status, created_at, updated_at FROM word_suggestions WHERE word = ?"
);
const insertApprovedWord = db.prepare(
  "INSERT OR IGNORE INTO words(word) VALUES (?)"
);
const deleteWord = db.prepare("DELETE FROM words WHERE word = ?");

const statsTotalGames = db.prepare(
  "SELECT COUNT(*) AS n FROM user_games WHERE completed_at IS NOT NULL"
);
const statsTotalWords = db.prepare("SELECT COUNT(*) AS n FROM words");
const statsGamesToday = db.prepare(
  "SELECT COUNT(*) AS n FROM user_games WHERE completed_at IS NOT NULL AND game_date = ?"
);
const statsTotalSignups = db.prepare("SELECT COUNT(*) AS n FROM users");
const statsLifetimeHigh = db.prepare(`
  SELECT u.username, g.score, g.game_date
  FROM user_games g
  JOIN users u ON u.id = g.user_id
  WHERE g.completed_at IS NOT NULL
  ORDER BY g.score DESC, g.completed_at ASC
  LIMIT 1
`);
const statsTodayHigh = db.prepare(`
  SELECT u.username, g.score
  FROM user_games g
  JOIN users u ON u.id = g.user_id
  WHERE g.completed_at IS NOT NULL AND g.game_date = ?
  ORDER BY g.score DESC, g.completed_at ASC
  LIMIT 1
`);
const statsBusiestDay = db.prepare(`
  SELECT game_date, COUNT(*) AS n
  FROM user_games
  WHERE completed_at IS NOT NULL
  GROUP BY game_date
  ORDER BY n DESC, game_date DESC
  LIMIT 1
`);
const gamesPlayedRange = db.prepare(`
  SELECT game_date, COUNT(*) AS n
  FROM user_games
  WHERE completed_at IS NOT NULL
    AND game_date >= ?
    AND game_date <= ?
  GROUP BY game_date
  ORDER BY game_date ASC
`);

function utcToday() {
  return new Date().toISOString().slice(0, 10);
}

function rangeStart(range, todayStr) {
  const d = new Date(todayStr + "T00:00:00Z");
  if (range === "year") {
    return `${d.getUTCFullYear()}-01-01`;
  }
  if (range === "month") {
    const m = String(d.getUTCMonth() + 1).padStart(2, "0");
    return `${d.getUTCFullYear()}-${m}-01`;
  }
  // week: Monday of the current ISO week (UTC)
  const dow = d.getUTCDay(); // 0=Sun..6=Sat
  const daysSinceMonday = (dow + 6) % 7;
  d.setUTCDate(d.getUTCDate() - daysSinceMonday);
  return d.toISOString().slice(0, 10);
}

function requireAdmin(req, res, next) {
  if (!req.user) return res.status(404).json({ error: "Not found" });
  if (req.user.role !== "admin")
    return res.status(404).json({ error: "Not found" });
  next();
}

function buildAdminRouter() {
  const router = express.Router();

  router.use(requireAuth, requireAdmin);

  router.get("/stats", (req, res) => {
    const requested = String(req.query?.date || "");
    const today = /^\d{4}-\d{2}-\d{2}$/.test(requested)
      ? requested
      : utcToday();
    const lifetime = statsLifetimeHigh.get();
    const todayHigh = statsTodayHigh.get(today);
    const busiest = statsBusiestDay.get();
    res.json({
      totalGames: statsTotalGames.get().n,
      gamesToday: statsGamesToday.get(today).n,
      totalWords: statsTotalWords.get().n,
      totalSignups: statsTotalSignups.get().n,
      lifetimeHigh: lifetime
        ? {
            username: lifetime.username,
            score: lifetime.score,
            gameDate: lifetime.game_date,
          }
        : null,
      todayHigh: todayHigh
        ? { username: todayHigh.username, score: todayHigh.score }
        : null,
      busiestDay: busiest
        ? { gameDate: busiest.game_date, count: busiest.n }
        : null,
      todayDate: today,
    });
  });

  router.get("/visualizations/games-played", (req, res) => {
    const range = ["week", "month", "year"].includes(req.query?.range)
      ? req.query.range
      : "week";
    const end = utcToday();
    const start = rangeStart(range, end);
    const rows = gamesPlayedRange.all(start, end);
    res.json({
      range,
      start,
      end,
      days: rows.map((r) => ({ date: r.game_date, count: r.n })),
    });
  });

  router.get("/users", (_req, res) => {
    res.json({ users: listUsers.all() });
  });

  router.patch("/users/:id/role", (req, res) => {
    const id = Number(req.params.id);
    const role = String(req.body?.role || "");
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ error: "Invalid id" });
    }
    if (!ROLES.has(role)) {
      return res.status(400).json({ error: "Invalid role" });
    }
    const existing = findUser.get(id);
    if (!existing) return res.status(404).json({ error: "User not found" });
    updateRole.run(role, id);
    res.json({ user: findUser.get(id) });
  });

  router.get("/word-suggestions", (_req, res) => {
    res.json({ suggestions: listSuggestions.all() });
  });

  router.patch("/word-suggestions/:word/status", (req, res) => {
    const word = String(req.params.word || "").toLowerCase();
    const status = String(req.body?.status || "");
    if (!/^[a-z]{1,16}$/.test(word)) {
      return res.status(400).json({ error: "Invalid word" });
    }
    if (!SUGGESTION_STATUSES.has(status)) {
      return res.status(400).json({ error: "Invalid status" });
    }
    if (!findSuggestion.get(word)) {
      return res.status(404).json({ error: "Suggestion not found" });
    }
    updateSuggestionStatus.run(status, word);
    if (status === "approved") {
      insertApprovedWord.run(word);
    } else if (status === "denied") {
      deleteWord.run(word);
    }
    res.json({ suggestion: findSuggestion.get(word) });
  });

  router.get("/bonuses", (_req, res) => {
    res.json({ bonuses: listBonuses.all() });
  });

  router.post("/bonuses", (req, res) => {
    const email = String(req.body?.email || "")
      .toLowerCase()
      .trim();
    const points = Number(req.body?.points);
    const activeFrom = String(req.body?.activeFrom || "").trim();
    const title = String(req.body?.title || "").trim();
    const message = String(req.body?.message || "").trim();

    if (!email) {
      return res.status(400).json({ error: "Email is required" });
    }
    if (!Number.isInteger(points) || points < 1 || points > MAX_BONUS_POINTS) {
      return res
        .status(400)
        .json({ error: `Points must be an integer 1-${MAX_BONUS_POINTS}` });
    }
    if (!DATE_RE.test(activeFrom)) {
      return res
        .status(400)
        .json({ error: "activeFrom must be a YYYY-MM-DD date" });
    }
    if (!title || title.length > 80) {
      return res.status(400).json({ error: "Title must be 1-80 chars" });
    }
    if (!message || message.length > 280) {
      return res.status(400).json({ error: "Message must be 1-280 chars" });
    }

    const user = findUserByEmail.get(email);
    if (!user) {
      return res.status(404).json({ error: "No user with that email" });
    }

    const result = insertBonus.run(user.id, activeFrom, points, title, message);
    res.status(201).json({ bonus: findBonus.get(result.lastInsertRowid) });
  });

  router.delete("/bonuses/:id", (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ error: "Invalid id" });
    }
    const existing = findBonus.get(id);
    if (!existing) return res.status(404).json({ error: "Bonus not found" });
    if (existing.claimed_at) {
      return res
        .status(409)
        .json({ error: "Bonus already claimed; cannot revoke" });
    }
    deleteUnclaimedBonus.run(id);
    res.json({ ok: true });
  });

  return router;
}

module.exports = { buildAdminRouter };
