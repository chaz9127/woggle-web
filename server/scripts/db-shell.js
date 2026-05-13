const path = require("path");
const repl = require("repl");
const Database = require("better-sqlite3");

const dbPath = path.resolve(__dirname, "..", "data", "words.db");
const db = new Database(dbPath);

function q(sql, ...params) {
  const stmt = db.prepare(sql);
  return /^\s*select|^\s*pragma/i.test(sql) ? stmt.all(...params) : stmt.run(...params);
}

console.log(`Connected to ${dbPath}`);
console.log(`Helpers: db (better-sqlite3 handle), q("SELECT ...") for quick queries.`);
console.log(`Example: q("SELECT COUNT(*) AS n FROM words")`);

const r = repl.start({ prompt: "db> " });
r.context.db = db;
r.context.q = q;
r.on("exit", () => db.close());
