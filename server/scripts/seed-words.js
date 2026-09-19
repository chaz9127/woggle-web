const path = require("path");
const fs = require("fs");
const { db } = require("../src/db");

const filePath = process.argv[2];
if (!filePath) {
  console.error("Usage: node scripts/seed-words.js <path-to-json-file>");
  process.exit(1);
}

const raw = fs.readFileSync(path.resolve(filePath), "utf8");
const words = JSON.parse(raw);
if (!Array.isArray(words)) {
  console.error("Expected the JSON file to contain an array of words.");
  process.exit(1);
}

const insertStmt = db.prepare("INSERT OR IGNORE INTO words(word) VALUES (?)");
const insertMany = db.transaction((list) => {
  let inserted = 0;
  for (const entry of list) {
    const word = String(entry).trim().toLowerCase();
    if (!/^[a-z]{1,16}$/.test(word)) {
      console.warn(`Skipping invalid word: ${JSON.stringify(entry)}`);
      continue;
    }
    const result = insertStmt.run(word);
    inserted += result.changes;
  }
  return inserted;
});

const inserted = insertMany(words);
console.log(`Seeded ${inserted} new word(s) out of ${words.length} in the file.`);
