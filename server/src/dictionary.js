const { db } = require("./db");

db.exec(`
  CREATE TABLE IF NOT EXISTS words (
    word TEXT PRIMARY KEY,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );
`);

const wordsCols = db
  .prepare("PRAGMA table_info(words)")
  .all()
  .map((c) => c.name);
if (!wordsCols.includes("created_at")) {
  db.exec(`
    BEGIN;
    CREATE TABLE words_new (
      word TEXT PRIMARY KEY,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    INSERT INTO words_new (word, created_at, updated_at)
      SELECT word, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP FROM words;
    DROP TABLE words;
    ALTER TABLE words_new RENAME TO words;
    COMMIT;
  `);
}

db.exec(`
  CREATE TRIGGER IF NOT EXISTS words_updated_at
    AFTER UPDATE ON words
    FOR EACH ROW
    BEGIN
      UPDATE words SET updated_at = CURRENT_TIMESTAMP WHERE word = OLD.word;
    END;
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS word_suggestions (
    word TEXT PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'denied', 'approved')),
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );
`);

const suggestionsCols = db
  .prepare("PRAGMA table_info(word_suggestions)")
  .all()
  .map((c) => c.name);
if (!suggestionsCols.includes("user_id")) {
  db.exec(
    "ALTER TABLE word_suggestions ADD COLUMN user_id INTEGER REFERENCES users(id) ON DELETE SET NULL"
  );
}
if (
  suggestionsCols.includes("approved") &&
  !suggestionsCols.includes("status")
) {
  db.exec(`
    BEGIN;
    CREATE TABLE word_suggestions_new (
      word TEXT PRIMARY KEY,
      status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'denied', 'approved')),
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    INSERT INTO word_suggestions_new (word, status, created_at, updated_at)
      SELECT word,
             CASE WHEN approved = 1 THEN 'approved' ELSE 'pending' END,
             created_at,
             updated_at
      FROM word_suggestions;
    DROP TABLE word_suggestions;
    ALTER TABLE word_suggestions_new RENAME TO word_suggestions;
    COMMIT;
  `);
}

db.exec(`
  CREATE TRIGGER IF NOT EXISTS word_suggestions_updated_at
    AFTER UPDATE ON word_suggestions
    FOR EACH ROW
    BEGIN
      UPDATE word_suggestions SET updated_at = CURRENT_TIMESTAMP WHERE word = OLD.word;
    END;
`);

const selectStmt = db.prepare("SELECT 1 FROM words WHERE word = ?");
const allWordsStmt = db.prepare("SELECT word FROM words ORDER BY word");
const insertSuggestionStmt = db.prepare(
  "INSERT OR IGNORE INTO word_suggestions(word, user_id) VALUES (?, ?)"
);

function handleWordLookup(req, res) {
  const raw = req.params.word || "";
  const word = raw.toLowerCase();
  if (!word || !/^[a-z]{1,16}$/.test(word)) {
    return res.status(404).end();
  }

  if (selectStmt.get(word)) {
    return res.status(200).end();
  }
  return res.status(404).end();
}

// Returns every known-valid word as a JSON array so the client can answer most
// lookups locally instead of round-tripping per word.
function handleWordList(req, res) {
  const words = allWordsStmt.all().map((r) => r.word);
  res.json(words);
}

function handleWordSuggest(req, res) {
  const word = (req.params.word || "").toLowerCase();
  if (!word || !/^[a-z]{1,16}$/.test(word)) {
    return res.status(400).end();
  }
  const userId = req.user?.id ?? null;
  insertSuggestionStmt.run(word, userId);
  res.status(204).end();
}

module.exports = { handleWordLookup, handleWordList, handleWordSuggest };
