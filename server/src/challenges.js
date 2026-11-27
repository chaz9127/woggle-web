// Challenge mode: two signed-in players play the same private board, each in
// their own timed run. Fully separate from the daily game: own tables, own
// endpoints, and no writes to user_games, streaks or the leaderboard.
const express = require("express");
const rateLimit = require("express-rate-limit");
const { db } = require("./db");
const { requireAuth, requireTester } = require("./auth"); // also creates the users table
const { generateBoard } = require("./board");
const { validateSubmittedWords, recordStreakActivity } = require("./games");
const {
  RUN_SECONDS,
  GRACE_SECONDS,
  generateCode,
  normalizeCode,
  generateSeed,
  isRunExpired,
  challengeStatus,
  isEnded,
  decideWinner,
  outcomeFor,
  tallyRecord,
  hasUnseenResult,
  viewerLabel,
} = require("./challengeLogic");

// Rows are never deleted, so UNIQUE(code) alone guarantees an ended code is
// never handed out again. User deletes null the reference rather than
// cascading, for the same reason. UNIQUE(challenge_id, role) caps a challenge
// at two players at the database level.
db.exec(`
  CREATE TABLE IF NOT EXISTS challenges (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    code TEXT NOT NULL UNIQUE,
    seed TEXT NOT NULL,
    creator_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    retracted_at TEXT,
    completed_at TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );
  CREATE TRIGGER IF NOT EXISTS challenges_updated_at
    AFTER UPDATE ON challenges
    FOR EACH ROW
    BEGIN
      UPDATE challenges SET updated_at = CURRENT_TIMESTAMP WHERE id = OLD.id;
    END;

  CREATE TABLE IF NOT EXISTS challenge_players (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    challenge_id INTEGER NOT NULL REFERENCES challenges(id),
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    role TEXT NOT NULL CHECK (role IN ('creator', 'opponent')),
    started_at TEXT,
    finished_at TEXT,
    score INTEGER,
    word_count INTEGER,
    found_words TEXT,
    results_seen_at TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (challenge_id, role),
    UNIQUE (challenge_id, user_id)
  );
  CREATE INDEX IF NOT EXISTS challenge_players_user_idx
    ON challenge_players (user_id);
  CREATE TRIGGER IF NOT EXISTS challenge_players_updated_at
    AFTER UPDATE ON challenge_players
    FOR EACH ROW
    BEGIN
      UPDATE challenge_players SET updated_at = CURRENT_TIMESTAMP WHERE id = OLD.id;
    END;
`);

// Added after the first release, so existing databases get it here.
const challengeCols = db
  .prepare("PRAGMA table_info(challenges)")
  .all()
  .map((c) => c.name);
if (!challengeCols.includes("rejected_at")) {
  db.exec("ALTER TABLE challenges ADD COLUMN rejected_at TEXT");
}

const insertChallenge = db.prepare(
  "INSERT INTO challenges (code, seed, creator_id) VALUES (?, ?, ?)"
);
const insertPlayer = db.prepare(
  "INSERT INTO challenge_players (challenge_id, user_id, role) VALUES (?, ?, ?)"
);
const findByCode = db.prepare("SELECT * FROM challenges WHERE code = ?");
const findById = db.prepare("SELECT * FROM challenges WHERE id = ?");
const playersOf = db.prepare(`
  SELECT p.*, u.username
  FROM challenge_players p
  LEFT JOIN users u ON u.id = p.user_id
  WHERE p.challenge_id = ?
`);
const startRun = db.prepare(
  "UPDATE challenge_players SET started_at = ? WHERE id = ? AND started_at IS NULL"
);
const finishRun = db.prepare(`
  UPDATE challenge_players
  SET finished_at = ?, score = ?, word_count = ?, found_words = ?
  WHERE id = ? AND finished_at IS NULL
`);
const markCompleted = db.prepare(`
  UPDATE challenges SET completed_at = ?
  WHERE id = ? AND completed_at IS NULL AND retracted_at IS NULL
    AND rejected_at IS NULL
`);
const markSeen = db.prepare(
  "UPDATE challenge_players SET results_seen_at = ? WHERE id = ? AND results_seen_at IS NULL"
);
const retractChallenge = db.prepare(`
  UPDATE challenges SET retracted_at = ?
  WHERE id = ? AND completed_at IS NULL AND retracted_at IS NULL
    AND rejected_at IS NULL
`);
const rejectChallenge = db.prepare(`
  UPDATE challenges SET rejected_at = ?
  WHERE id = ? AND completed_at IS NULL AND retracted_at IS NULL
    AND rejected_at IS NULL
`);
const listMine = db.prepare(`
  SELECT c.*
  FROM challenges c
  JOIN challenge_players me ON me.challenge_id = c.id
  WHERE me.user_id = ?
  ORDER BY c.id DESC
  LIMIT 50
`);
const unseenCount = db.prepare(`
  SELECT COUNT(*) AS n
  FROM challenge_players p
  JOIN challenges c ON c.id = p.challenge_id
  WHERE p.user_id = ? AND c.completed_at IS NOT NULL AND p.results_seen_at IS NULL
`);
// Every completed challenge (not just the 50 listed), for the overall record.
// Retracted and rejected challenges never complete, so they don't count.
const completedForRecord = db.prepare(`
  SELECT me.role,
         cr.score AS creator_score, cr.word_count AS creator_words,
         op.score AS opponent_score, op.word_count AS opponent_words
  FROM challenges c
  JOIN challenge_players me ON me.challenge_id = c.id AND me.user_id = ?
  JOIN challenge_players cr ON cr.challenge_id = c.id AND cr.role = 'creator'
  JOIN challenge_players op ON op.challenge_id = c.id AND op.role = 'opponent'
  WHERE c.completed_at IS NOT NULL
`);

// Site-wide totals for the admin pages. Every challenge ever created counts
// toward the total; open ones are those not yet completed, retracted or
// rejected.
const challengeTotals = db.prepare(`
  SELECT COUNT(*) AS total,
         COUNT(completed_at) AS completed,
         COUNT(retracted_at) AS retracted,
         COUNT(rejected_at) AS rejected
  FROM challenges
`);

// Challenges created per UTC day (created_at is stored in UTC), for the
// admin charts. Dates are inclusive YYYY-MM-DD strings.
const challengesPerDayStmt = db.prepare(`
  SELECT date(created_at) AS day, COUNT(*) AS n
  FROM challenges
  WHERE date(created_at) BETWEEN ? AND ?
  GROUP BY day
  ORDER BY day ASC
`);

function challengesPerDay(start, end) {
  return challengesPerDayStmt
    .all(start, end)
    .map((r) => ({ date: r.day, count: r.n }));
}

function challengeCounts() {
  const t = challengeTotals.get();
  return { ...t, open: t.total - t.completed - t.retracted - t.rejected };
}

// The newest challenges with their current status, for the admin page.
// Scores only appear once a challenge is completed, as for the players.
const recentChallengesStmt = db.prepare(
  "SELECT * FROM challenges ORDER BY id DESC LIMIT ?"
);

function recentChallenges(limit = 20) {
  return recentChallengesStmt.all(limit).map((challenge) => {
    const players = playersOf.all(challenge.id);
    const creator = players.find((p) => p.role === "creator");
    const opponent = players.find((p) => p.role === "opponent");
    const status = challengeStatus(challenge, players);
    const name = (p) => (p ? p.username || "(deleted user)" : null);
    const item = {
      code: challenge.code,
      createdAt: challenge.created_at,
      status,
      creator: name(creator),
      opponent: name(opponent),
      creatorFinished: !!creator?.finished_at,
      opponentFinished: !!opponent?.finished_at,
    };
    if (status === "completed") {
      const winner = decideWinner(creator, opponent);
      item.result = {
        winner:
          winner === "draw"
            ? null
            : name(winner === "creator" ? creator : opponent),
        creatorScore: creator.score,
        opponentScore: opponent.score,
      };
    }
    return item;
  });
}

function recordFor(userId) {
  return tallyRecord(
    completedForRecord
      .all(userId)
      .map((r) =>
        outcomeFor(
          r.role,
          decideWinner(
            { score: r.creator_score, word_count: r.creator_words },
            { score: r.opponent_score, word_count: r.opponent_words }
          )
        )
      )
  );
}

// A run that was started but never submitted (closed tab, lost connection)
// is finalized at 0 once its deadline passes, so the other player isn't left
// waiting forever. Then any challenge with two finished runs is completed.
const expireStaleRuns = db.prepare(`
  UPDATE challenge_players
  SET finished_at = ?, score = 0, word_count = 0, found_words = '[]'
  WHERE finished_at IS NULL AND started_at IS NOT NULL AND started_at < ?
    AND challenge_id IN (
      SELECT id FROM challenges
      WHERE completed_at IS NULL AND retracted_at IS NULL
        AND rejected_at IS NULL
    )
`);
const completeReadyChallenges = db.prepare(`
  UPDATE challenges SET completed_at = ?
  WHERE completed_at IS NULL AND retracted_at IS NULL
    AND rejected_at IS NULL
    AND (
      SELECT COUNT(*) FROM challenge_players p
      WHERE p.challenge_id = challenges.id AND p.finished_at IS NOT NULL
    ) = 2
`);
const sweep = db.transaction((nowMs) => {
  const now = new Date(nowMs).toISOString();
  const cutoff = new Date(
    nowMs - (RUN_SECONDS + GRACE_SECONDS) * 1000
  ).toISOString();
  expireStaleRuns.run(now, cutoff);
  completeReadyChallenges.run(now);
});

function parseWords(json) {
  try {
    const parsed = JSON.parse(json || "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function publicPlayer(p) {
  return { role: p.role, username: p.username || "(deleted user)" };
}

// Everything the client may know about a challenge, from one viewer's side.
// Scores and words of the *other* player stay hidden until both have finished.
function buildView(challenge, players, userId, nowMs) {
  const status = challengeStatus(challenge, players);
  const me = players.find((p) => p.user_id === userId) || null;
  const creator = players.find((p) => p.role === "creator");
  const opponent = players.find((p) => p.role === "opponent");
  const view = {
    code: challenge.code,
    status,
    role: me?.role ?? null,
    creator: creator ? publicPlayer(creator) : null,
    opponent: opponent ? publicPlayer(opponent) : null,
    serverNow: nowMs,
  };
  if (!me) {
    view.joinable = status === "waiting";
    view.canReject = view.joinable;
    view.full = status === "in_progress";
    return view;
  }

  const other = me.role === "creator" ? opponent : creator;
  view.me = {
    started: !!me.started_at,
    startedAtMs: me.started_at ? Date.parse(me.started_at) : null,
    finished: !!me.finished_at,
    score: me.finished_at ? me.score : null,
    wordCount: me.finished_at ? me.word_count : null,
    words: me.finished_at ? parseWords(me.found_words) : [],
  };
  view.otherFinished = !!other?.finished_at;
  view.canRetract = me.role === "creator" && !isEnded(status);
  view.canReject = canReject(me, status);
  // The board is only revealed once this player has started their own run.
  if (me.started_at && status !== "retracted" && status !== "rejected") {
    view.seed = challenge.seed;
  }

  if (status === "completed") {
    const winner = decideWinner(creator, opponent);
    view.unseen = hasUnseenResult(challenge, me);
    view.results = {
      winner,
      players: [creator, opponent].map((p) => ({
        ...publicPlayer(p),
        score: p.score,
        wordCount: p.word_count,
        words: parseWords(p.found_words),
      })),
    };
  }
  return view;
}

// The invited player can turn a challenge down until they start their run
// (after that it plays out, so nobody can bail on a losing run).
function canReject(me, status) {
  return me.role === "opponent" && !me.started_at && !isEnded(status);
}

function loadChallenge(code) {
  const challenge = code ? findByCode.get(code) : null;
  if (!challenge) return null;
  return { challenge, players: playersOf.all(challenge.id) };
}

function listItem(challenge, players, userId) {
  const status = challengeStatus(challenge, players);
  const me = players.find((p) => p.user_id === userId);
  const other = players.find((p) => p.user_id !== userId);
  const winner =
    status === "completed"
      ? decideWinner(
          players.find((p) => p.role === "creator"),
          players.find((p) => p.role === "opponent")
        )
      : null;
  return {
    code: challenge.code,
    status,
    opponent: other ? other.username || "(deleted user)" : null,
    label: viewerLabel(status, me, other, winner),
    outcome: winner ? outcomeFor(me.role, winner) : null,
    unseen: hasUnseenResult(challenge, me),
  };
}

const createLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 20,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  keyGenerator: (req) => `user:${req.user.id}`,
  message: { error: "Too many new challenges. Try again later." },
});

// Codes are short, so throttle lookups to make guessing them impractical.
const lookupLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 60,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  keyGenerator: (req) => `user:${req.user.id}`,
});

const createChallengeTx = db.transaction((userId) => {
  for (let attempt = 0; attempt < 20; attempt++) {
    const code = generateCode();
    try {
      const { lastInsertRowid } = insertChallenge.run(
        code,
        generateSeed(),
        userId
      );
      insertPlayer.run(lastInsertRowid, userId, "creator");
      return code;
    } catch (err) {
      if (err.code !== "SQLITE_CONSTRAINT_UNIQUE") throw err;
      // Collision with an existing (possibly ended) code: try another.
    }
  }
  throw new Error("Could not allocate a challenge code");
});

// Rejecting from the invite screen takes the opponent seat first, so the
// challenge shows up in the rejecting player's history too.
const rejectTx = db.transaction((challenge, me, userId, nowMs) => {
  if (!me) insertPlayer.run(challenge.id, userId, "opponent");
  rejectChallenge.run(new Date(nowMs).toISOString(), challenge.id);
});

const completeRunTx = db.transaction(
  (challenge, me, other, result, nowMs, localDate) => {
    const now = new Date(nowMs).toISOString();
    const { changes } = finishRun.run(
      now,
      result.score,
      result.accepted.length,
      JSON.stringify(result.accepted),
      me.id
    );
    // Finishing your own run counts as playing today, for the streak.
    if (changes) recordStreakActivity(me.user_id, localDate);
    if (other?.finished_at) {
      markCompleted.run(now, challenge.id);
      // The last finisher sees the results straight away, so no dot for them.
      markSeen.run(now, me.id);
    }
  }
);

function buildChallengesRouter() {
  const router = express.Router();
  router.use(requireAuth);
  // Beta: testers and admins only.
  router.use(requireTester);
  router.use((req, res, next) => {
    sweep(Date.now());
    next();
  });

  // Loads the challenge named in the URL and the viewer's player row, or
  // answers 404 itself.
  const withChallenge = (handler) => (req, res) => {
    const loaded = loadChallenge(normalizeCode(req.params.code));
    if (!loaded) {
      return res.status(404).json({ error: "No challenge with that code" });
    }
    const me = loaded.players.find((p) => p.user_id === req.user.id) || null;
    return handler(req, res, { ...loaded, me });
  };
  const respond = (res, challengeId, userId, status = 200) => {
    const challenge = findById.get(challengeId);
    res
      .status(status)
      .json(
        buildView(challenge, playersOf.all(challengeId), userId, Date.now())
      );
  };

  router.post("/", createLimiter, (req, res) => {
    const code = createChallengeTx(req.user.id);
    res.status(201).json({ code });
  });

  router.get("/", (req, res) => {
    const groups = { waiting: [], inProgress: [], completed: [] };
    for (const challenge of listMine.all(req.user.id)) {
      const item = listItem(
        challenge,
        playersOf.all(challenge.id),
        req.user.id
      );
      if (item.status === "waiting") groups.waiting.push(item);
      else if (item.status === "in_progress") groups.inProgress.push(item);
      else groups.completed.push(item);
    }
    res.json({ ...groups, record: recordFor(req.user.id) });
  });

  // Polled by the client, so it's a single COUNT.
  router.get("/unseen", (req, res) => {
    res.json({ count: unseenCount.get(req.user.id).n });
  });

  router.get(
    "/:code",
    lookupLimiter,
    withChallenge((req, res, { challenge }) => {
      respond(res, challenge.id, req.user.id);
    })
  );

  router.post(
    "/:code/join",
    lookupLimiter,
    withChallenge((req, res, { challenge, players, me }) => {
      if (me) return respond(res, challenge.id, req.user.id);
      if (challengeStatus(challenge, players) !== "waiting") {
        return respond(res, challenge.id, req.user.id, 409);
      }
      try {
        insertPlayer.run(challenge.id, req.user.id, "opponent");
      } catch (err) {
        // Someone else took the opponent seat a moment ago.
        if (err.code !== "SQLITE_CONSTRAINT_UNIQUE") throw err;
        return respond(res, challenge.id, req.user.id, 409);
      }
      respond(res, challenge.id, req.user.id);
    })
  );

  // Idempotent: the first call stamps started_at, later calls (a refresh)
  // return the same start time, so a reload resumes rather than restarts.
  router.post(
    "/:code/start",
    withChallenge((req, res, { challenge, players, me }) => {
      if (!me) return res.status(403).json({ error: "Not your challenge" });
      if (isEnded(challengeStatus(challenge, players))) {
        return respond(res, challenge.id, req.user.id, 410);
      }
      startRun.run(new Date().toISOString(), me.id);
      respond(res, challenge.id, req.user.id);
    })
  );

  router.post(
    "/:code/complete",
    withChallenge((req, res, { challenge, players, me }) => {
      if (!me) return res.status(403).json({ error: "Not your challenge" });
      const words = Array.isArray(req.body?.words) ? req.body.words : null;
      if (!words) {
        return res.status(400).json({ error: "words must be an array" });
      }
      const status = challengeStatus(challenge, players);
      if (status === "retracted" || status === "rejected") {
        return respond(res, challenge.id, req.user.id, 410);
      }
      if (!me.started_at) {
        return res.status(409).json({ error: "Run not started" });
      }
      // One run per player: a finished (or expired, via the sweep) run keeps
      // its original result and later submissions are ignored.
      const nowMs = Date.now();
      if (me.finished_at || isRunExpired(me.started_at, nowMs)) {
        return respond(res, challenge.id, req.user.id);
      }
      const result = validateSubmittedWords(
        generateBoard(challenge.seed),
        words
      );
      const other = players.find((p) => p.id !== me.id);
      completeRunTx(
        challenge,
        me,
        other,
        result,
        nowMs,
        String(req.body?.localDate || "")
      );
      respond(res, challenge.id, req.user.id);
    })
  );

  router.post(
    "/:code/seen",
    withChallenge((req, res, { challenge, me }) => {
      if (!me) return res.status(403).json({ error: "Not your challenge" });
      if (challenge.completed_at) {
        markSeen.run(new Date().toISOString(), me.id);
      }
      res.json({ ok: true });
    })
  );

  // Creator only, any time before completion. The challenge ends for both
  // players: an in-progress run can no longer be submitted, and neither
  // player's score or words are ever revealed. Rows are kept, not deleted.
  router.post(
    "/:code/retract",
    withChallenge((req, res, { challenge, players, me }) => {
      if (me?.role !== "creator") {
        return res.status(403).json({ error: "Only the creator can retract" });
      }
      if (isEnded(challengeStatus(challenge, players))) {
        return respond(res, challenge.id, req.user.id, 409);
      }
      retractChallenge.run(new Date().toISOString(), challenge.id);
      respond(res, challenge.id, req.user.id);
    })
  );

  // The invited player turns the challenge down: either straight from the
  // invite (without joining first) or after accepting, until their run
  // starts. It ends for both players, no scores are shown, and it stays in
  // both histories without counting toward either record.
  router.post(
    "/:code/reject",
    lookupLimiter,
    withChallenge((req, res, { challenge, players, me }) => {
      const status = challengeStatus(challenge, players);
      const allowed = me ? canReject(me, status) : status === "waiting";
      if (!allowed) {
        if (me?.role === "creator") {
          return res
            .status(403)
            .json({ error: "Retract your own challenge instead" });
        }
        return respond(res, challenge.id, req.user.id, 409);
      }
      try {
        rejectTx(challenge, me, req.user.id, Date.now());
      } catch (err) {
        // Someone else took the opponent seat a moment ago.
        if (err.code !== "SQLITE_CONSTRAINT_UNIQUE") throw err;
        return respond(res, challenge.id, req.user.id, 409);
      }
      respond(res, challenge.id, req.user.id);
    })
  );

  return router;
}

module.exports = {
  buildChallengesRouter,
  challengeCounts,
  challengesPerDay,
  recentChallenges,
};
