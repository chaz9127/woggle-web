const { db } = require("./db");
const { isAdjacent } = require("./board");

const MIN_WORD_LEN = 3;

db.exec(`
  CREATE TABLE IF NOT EXISTS board_stats (
    game_date TEXT PRIMARY KEY,
    possible_words INTEGER NOT NULL,
    words TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );
`);

// Rows saved before the word list was stored have words = NULL and get
// re-solved the next time their date is needed.
const boardStatsCols = db
  .prepare("PRAGMA table_info(board_stats)")
  .all()
  .map((c) => c.name);
if (!boardStatsCols.includes("words")) {
  db.exec("ALTER TABLE board_stats ADD COLUMN words TEXT");
}

db.exec(`
  CREATE TRIGGER IF NOT EXISTS board_stats_updated_at
    AFTER UPDATE ON board_stats
    FOR EACH ROW
    BEGIN
      UPDATE board_stats SET updated_at = CURRENT_TIMESTAMP WHERE game_date = OLD.game_date;
    END;
`);

const selectAllWords = db.prepare("SELECT word FROM words");
const upsertBoardStats = db.prepare(`
  INSERT INTO board_stats (game_date, possible_words, words) VALUES (?, ?, ?)
  ON CONFLICT (game_date) DO UPDATE SET
    possible_words = excluded.possible_words,
    words = excluded.words
`);
const selectBoardStats = db.prepare(`
  SELECT possible_words AS possibleWords, words FROM board_stats
  WHERE game_date = ? AND words IS NOT NULL
`);

function buildTrie() {
  const root = { children: new Map(), end: false };
  for (const { word } of selectAllWords.all()) {
    let node = root;
    for (const ch of word) {
      let next = node.children.get(ch);
      if (!next) {
        next = { children: new Map(), end: false };
        node.children.set(ch, next);
      }
      node = next;
    }
    node.end = true;
  }
  return root;
}

// Single pruned DFS over the board's tiles, mirroring isFormable's traversal
// in board.js but walking trie edges instead of matching one target word —
// a path dies the instant its letters stop being a valid dictionary prefix.
// The trie (~250MB for the full dictionary) is built fresh here rather than
// cached, since boards are solved at most once per date — not worth holding
// that memory permanently. Callers solving several boards share one trie.
function findPossibleWords(board, trie) {
  const found = new Set();

  const dfs = (node, str, tile, used) => {
    const letter = tile.letter.toLowerCase();
    let n = node;
    for (const ch of letter) {
      n = n.children.get(ch);
      if (!n) return;
    }
    const nextStr = str + letter;
    if (n.end && nextStr.length >= MIN_WORD_LEN) found.add(nextStr);
    for (const t of board) {
      if (!used.has(t.id) && isAdjacent(tile, t)) {
        used.add(t.id);
        dfs(n, nextStr, t, used);
        used.delete(t.id);
      }
    }
  };

  for (const t of board) {
    dfs(trie, "", t, new Set([t.id]));
  }
  return [...found].sort();
}

// Solves and stores any of the given { gameDate, board } entries not yet saved.
function ensureBoardStats(entries) {
  const missing = entries.filter((e) => !selectBoardStats.get(e.gameDate));
  if (missing.length === 0) return;
  const trie = buildTrie();
  for (const { gameDate, board } of missing) {
    const words = findPossibleWords(board, trie);
    upsertBoardStats.run(gameDate, words.length, JSON.stringify(words));
  }
}

function getBoardStats(gameDate, board) {
  ensureBoardStats([{ gameDate, board }]);
  const { possibleWords, words } = selectBoardStats.get(gameDate);
  return { possibleWords, words: JSON.parse(words) };
}

const selectStatsContaining = db.prepare(
  "SELECT game_date AS gameDate, words FROM board_stats WHERE words LIKE ?"
);
const updateStatsWords = db.prepare(
  "UPDATE board_stats SET possible_words = ?, words = ? WHERE game_date = ?"
);

// Strips a deleted word from every cached solve instead of re-solving those
// boards, which would rebuild the full trie once per affected date.
const removeWordFromBoardStats = db.transaction((word) => {
  for (const row of selectStatsContaining.all(`%"${word}"%`)) {
    const words = JSON.parse(row.words).filter((w) => w !== word);
    updateStatsWords.run(words.length, JSON.stringify(words), row.gameDate);
  }
});

module.exports = { ensureBoardStats, getBoardStats, removeWordFromBoardStats };
