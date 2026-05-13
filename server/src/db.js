const path = require("path");
const fs = require("fs");
const Database = require("better-sqlite3");

const dataDir = process.env.DATA_DIR || path.resolve(__dirname, "..", "data");
fs.mkdirSync(dataDir, { recursive: true });

const db = new Database(path.join(dataDir, "words.db"));
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

module.exports = { db, dataDir };
