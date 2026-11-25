// Usage: node scripts/remove-words.js <path-to-json-file> [--apply]
// Words with an approved suggestion are always kept. Previews by default. --apply backs up the database, then deletes the words.
const path = require("path");
const fs = require("fs");
const Database = require("better-sqlite3");

const args = process.argv.slice(2);
const apply = args.includes("--apply");
const filePath = args.find((arg) => !arg.startsWith("--"));
const unknownFlag = args.find(
  (arg) => arg.startsWith("--") && arg !== "--apply"
);

function removeWords(db, words) {
  const deleteWord = db.prepare("DELETE FROM words WHERE word = ?");
  const hasBoardStats = db
    .prepare(
      "SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = 'board_stats'"
    )
    .get();

  return db.transaction(() => {
    let removed = 0;
    for (const word of words) removed += deleteWord.run(word).changes;

    // Cached counts from today on are stale; the server recomputes them.
    let staleBoards = 0;
    if (hasBoardStats) {
      const today = new Date().toISOString().slice(0, 10);
      staleBoards = db
        .prepare("DELETE FROM board_stats WHERE game_date >= ?")
        .run(today).changes;
    }
    return { removed, staleBoards };
  })();
}

async function main() {
  if (!filePath || unknownFlag) {
    throw new Error(
      "Usage: node scripts/remove-words.js <path-to-json-file> [--apply]"
    );
  }
  const entries = JSON.parse(fs.readFileSync(path.resolve(filePath), "utf8"));
  if (
    !Array.isArray(entries) ||
    entries.some((w) => typeof w !== "string" || !/^[a-z]{1,16}$/.test(w))
  ) {
    throw new Error("Expected a JSON array of lowercase words.");
  }
  const words = [...new Set(entries)];

  const dataDir = process.env.DATA_DIR || path.resolve(__dirname, "..", "data");
  const dbPath = path.join(dataDir, "words.db");
  const db = new Database(dbPath, { readonly: !apply, fileMustExist: true });
  try {
    const exists = db.prepare("SELECT 1 FROM words WHERE word = ?");
    const approved = db.prepare(
      "SELECT 1 FROM word_suggestions WHERE word = ? AND status = 'approved'"
    );
    const present = words.filter((w) => exists.get(w));
    const keptWords = present.filter((w) => approved.get(w));
    const toDelete = present.filter((w) => !approved.get(w));
    const total = db.prepare("SELECT COUNT(*) AS n FROM words").get().n;

    console.log(`Database: ${dbPath}`);
    console.log(`Words in database: ${total}`);
    console.log(`In file: ${words.length}; will delete: ${toDelete.length}`);
    console.log(`Already absent: ${words.length - present.length}`);
    console.log(
      `Keeping (approved suggestions): ${keptWords.length} ${keptWords.join(", ")}`
    );

    if (!apply) {
      console.log("Preview only. Re-run with --apply to delete.");
      return;
    }
    if (!toDelete.length) return;

    const stamp = new Date().toISOString().replace(/[:.]/g, "-");
    const backupPath = path.join(dataDir, `words-backup-${stamp}.db`);
    await db.backup(backupPath);
    console.log(`Backup: ${backupPath}`);

    const { removed, staleBoards } = removeWords(db, toDelete);
    console.log(
      `Deleted ${removed} word(s); cleared ${staleBoards} cached board count(s).`
    );
  } finally {
    db.close();
  }
}

main().catch((err) => {
  console.error(err.message);
  process.exitCode = 1;
});
