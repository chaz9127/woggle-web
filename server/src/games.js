const express = require("express");
const { db } = require("./db");
const { requireAuth } = require("./auth");

const LETTER_VALUE = {
  A: 1, B: 3, C: 3, D: 2, E: 1, F: 4, G: 2, H: 4, I: 1, J: 8,
  K: 5, L: 1, M: 3, N: 1, O: 1, P: 3, Q: 10, R: 1, S: 1, T: 1,
  U: 1, V: 4, W: 4, X: 8, Y: 4, Z: 10,
};

function scoreWord(word) {
  let sum = 0;
  for (const ch of word.toUpperCase()) {
    sum += LETTER_VALUE[ch] ?? 0;
  }
  return sum;
}

db.exec(`
  CREATE TABLE IF NOT EXISTS user_games (
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    game_date TEXT NOT NULL,
    started_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    completed_at TEXT,
    score INTEGER NOT NULL DEFAULT 0,
    word_count INTEGER NOT NULL DEFAULT 0,
    found_words TEXT NOT NULL DEFAULT '[]',
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id, game_date)
  );
  CREATE INDEX IF NOT EXISTS idx_user_games_user_date
    ON user_games (user_id, game_date DESC);
  CREATE TRIGGER IF NOT EXISTS user_games_updated_at
    AFTER UPDATE ON user_games
    FOR EACH ROW
    BEGIN
      UPDATE user_games SET updated_at = CURRENT_TIMESTAMP
        WHERE user_id = OLD.user_id AND game_date = OLD.game_date;
    END;
`);

const userCols = db.prepare("PRAGMA table_info(users)").all().map((c) => c.name);
if (!userCols.includes("total_games")) {
  db.exec("ALTER TABLE users ADD COLUMN total_games INTEGER NOT NULL DEFAULT 0");
}
if (!userCols.includes("current_streak")) {
  db.exec("ALTER TABLE users ADD COLUMN current_streak INTEGER NOT NULL DEFAULT 0");
}
if (!userCols.includes("longest_streak")) {
  db.exec("ALTER TABLE users ADD COLUMN longest_streak INTEGER NOT NULL DEFAULT 0");
}
if (!userCols.includes("last_completed_date")) {
  db.exec("ALTER TABLE users ADD COLUMN last_completed_date TEXT");
}

const findGame = db.prepare(
  "SELECT * FROM user_games WHERE user_id = ? AND game_date = ?"
);
const insertGame = db.prepare(`
  INSERT INTO user_games (user_id, game_date, completed_at, score, word_count, found_words)
  VALUES (?, ?, CURRENT_TIMESTAMP, ?, ?, ?)
`);
const wordExists = db.prepare("SELECT 1 FROM words WHERE word = ?");
const findUserStats = db.prepare(`
  SELECT total_games, current_streak, longest_streak, last_completed_date
  FROM users WHERE id = ?
`);
const updateUserStats = db.prepare(`
  UPDATE users
  SET total_games = ?, current_streak = ?, longest_streak = ?, last_completed_date = ?
  WHERE id = ?
`);
const recentGames = db.prepare(`
  SELECT game_date, score, word_count, completed_at
  FROM user_games
  WHERE user_id = ? AND completed_at IS NOT NULL
  ORDER BY game_date DESC
  LIMIT ?
`);

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function utcToday() {
  return new Date().toISOString().slice(0, 10);
}

function yesterdayOf(dateStr) {
  const d = new Date(dateStr + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().slice(0, 10);
}

function effectiveStreak(user) {
  if (!user.last_completed_date) return 0;
  const today = utcToday();
  if (user.last_completed_date === today) return user.current_streak;
  if (user.last_completed_date === yesterdayOf(today)) return user.current_streak;
  return 0;
}

const completeGameTx = db.transaction((userId, gameDate, acceptedWords, score) => {
  const wordCount = acceptedWords.length;
  insertGame.run(userId, gameDate, score, wordCount, JSON.stringify(acceptedWords));

  const stats = findUserStats.get(userId);
  const total = (stats.total_games || 0) + 1;
  const prevStreak = stats.last_completed_date === yesterdayOf(gameDate)
    ? stats.current_streak || 0
    : 0;
  const newStreak = prevStreak + 1;
  const longest = Math.max(stats.longest_streak || 0, newStreak);
  updateUserStats.run(total, newStreak, longest, gameDate, userId);
  return { total, currentStreak: newStreak, longestStreak: longest };
});

function buildGamesRouter() {
  const router = express.Router();

  router.post("/complete", requireAuth, (req, res) => {
    const gameDate = String(req.body?.gameDate || "");
    const words = Array.isArray(req.body?.words) ? req.body.words : null;
    if (!DATE_RE.test(gameDate)) {
      return res.status(400).json({ error: "Invalid gameDate" });
    }
    const today = utcToday();
    if (gameDate !== today && gameDate !== yesterdayOf(today)) {
      return res.status(400).json({ error: "gameDate must be today or yesterday (UTC)" });
    }
    if (!words) {
      return res.status(400).json({ error: "words must be an array" });
    }

    const existing = findGame.get(req.user.id, gameDate);
    if (existing && existing.completed_at) {
      return res.status(409).json({
        error: "Already played",
        game: {
          gameDate: existing.game_date,
          score: existing.score,
          wordCount: existing.word_count,
        },
      });
    }

    const seen = new Set();
    const accepted = [];
    let score = 0;
    for (const raw of words) {
      if (typeof raw !== "string") continue;
      const w = raw.toLowerCase().trim();
      if (!/^[a-z]{3,16}$/.test(w)) continue;
      if (seen.has(w)) continue;
      if (!wordExists.get(w)) continue;
      seen.add(w);
      accepted.push(w);
      score += scoreWord(w);
    }

    let result;
    try {
      result = completeGameTx(req.user.id, gameDate, accepted, score);
    } catch (e) {
      if (String(e.message).includes("UNIQUE")) {
        return res.status(409).json({ error: "Already played" });
      }
      throw e;
    }

    res.json({
      game: { gameDate, score, wordCount: accepted.length },
      stats: result,
    });
  });

  router.get("/me", requireAuth, (req, res) => {
    const stats = findUserStats.get(req.user.id);
    const recent = recentGames.all(req.user.id, 30).map((g) => ({
      gameDate: g.game_date,
      score: g.score,
      wordCount: g.word_count,
      completedAt: g.completed_at,
    }));
    const today = utcToday();
    const todayGame = findGame.get(req.user.id, today);
    res.json({
      stats: {
        totalGames: stats.total_games,
        currentStreak: effectiveStreak(stats),
        longestStreak: stats.longest_streak,
        lastCompletedDate: stats.last_completed_date,
      },
      playedToday: !!(todayGame && todayGame.completed_at),
      todayDate: today,
      recent,
    });
  });

  return router;
}

module.exports = { buildGamesRouter };
