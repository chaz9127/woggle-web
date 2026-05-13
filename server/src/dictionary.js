const path = require("path");
const fs = require("fs");
const Database = require("better-sqlite3");

const dataDir = path.resolve(__dirname, "..", "data");
fs.mkdirSync(dataDir, { recursive: true });

const db = new Database(path.join(dataDir, "words.db"));
db.pragma("journal_mode = WAL");
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
    approved INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );
  CREATE TRIGGER IF NOT EXISTS word_suggestions_updated_at
    AFTER UPDATE ON word_suggestions
    FOR EACH ROW
    BEGIN
      UPDATE word_suggestions SET updated_at = CURRENT_TIMESTAMP WHERE word = OLD.word;
    END;
`);

const selectStmt = db.prepare("SELECT 1 FROM words WHERE word = ?");
const insertStmt = db.prepare("INSERT OR IGNORE INTO words(word) VALUES (?)");
const insertSuggestionStmt = db.prepare("INSERT OR IGNORE INTO word_suggestions(word) VALUES (?)");

const UPSTREAM = "https://api.dictionaryapi.dev/api/v2/entries/en/";
const TIMEOUT_MS = 4000;

async function fetchUpstream(word) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(UPSTREAM + encodeURIComponent(word), {
      signal: controller.signal,
    });
    return res.status;
  } finally {
    clearTimeout(timer);
  }
}

async function handleWordLookup(req, res) {
  const raw = req.params.word || "";
  const word = raw.toLowerCase();
  if (!word || !/^[a-z]{1,16}$/.test(word)) {
    return res.status(404).end();
  }

  if (selectStmt.get(word)) {
    return res.status(200).end();
  }

  let status;
  try {
    status = await fetchUpstream(word);
  } catch {
    return res.status(503).end();
  }

  if (status === 200) {
    insertStmt.run(word);
    return res.status(200).end();
  }
  if (status === 404) {
    return res.status(404).end();
  }
  return res.status(503).end();
}

function handleWordSuggest(req, res) {
  const word = (req.params.word || "").toLowerCase();
  if (!word || !/^[a-z]{1,16}$/.test(word)) {
    return res.status(400).end();
  }
  insertSuggestionStmt.run(word);
  res.status(204).end();
}

module.exports = { handleWordLookup, handleWordSuggest };
