// Usage: node scripts/seed-users.js
// Creates test users test1..test5 (test1@test.com..test5@test.com), all with the
// password "testtest1". Existing users with those emails or usernames are left alone.
require("dotenv").config({
  path: require("path").resolve(__dirname, "..", ".env"),
});
const bcrypt = require("bcrypt");
require("../src/auth"); // creates the users table if it doesn't exist yet
const { db, dataDir } = require("../src/db");

const COUNT = 5;
const PASSWORD = "testtest1";

const exists = db.prepare(
  "SELECT 1 FROM users WHERE email = ? OR username = ?"
);
const insert = db.prepare(
  `INSERT INTO users (email, username, password_hash, clear_after_invalid, submit_after_swipe)
   VALUES (?, ?, ?, 1, 1)`
);

const hash = bcrypt.hashSync(PASSWORD, 12);
let created = 0;
for (let i = 1; i <= COUNT; i++) {
  const username = `test${i}`;
  const email = `${username}@test.com`;
  if (exists.get(email, username)) {
    console.log(`Skipping ${email} (already exists)`);
    continue;
  }
  insert.run(email, username, hash);
  created++;
  console.log(`Created ${email} / ${username}`);
}

console.log(
  `Created ${created} test user(s) in ${dataDir}. Password: ${PASSWORD}`
);
