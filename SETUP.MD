# Local Setup

Run all commands from the repo root unless noted. You need Git and Node.js 22.12 or newer (tested on Node 24).

## 1. Install dependencies

```sh
npm install
```

## 2. Configure the environment (optional for local development)

```sh
cp -n server/.env.example server/.env
```

The defaults work locally. The variables you may want to change:

| Variable                                                          | Purpose                                                                                                     |
| ----------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| `PORT`                                                            | API port. The Vite proxy expects `3001`, so change [client/vite.config.js](client/vite.config.js) to match. |
| `DATA_DIR`                                                        | Database directory. Leave blank for `server/data/`.                                                         |
| `SESSION_SECRET`                                                  | Session signing secret. Use a long random string in production.                                             |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_CALLBACK_URL` | Google sign-in. Leave blank to disable it.                                                                  |

## 3. Create the database

Start the server once, wait for `Server running on port 3001`, then stop it with Ctrl+C:

```sh
npm run dev:server
```

This creates `words.db` and all of its tables. Do this before seeding: the seed script does not create tables.

## 4. Seed the words

The word list is no longer in the working tree, so restore it from Git history. This needs a full clone, not a shallow one. The lists of words removed later are excluded.

```sh
mkdir -p /tmp/woggle-seed
git show '79841bc^:server/scripts/words_filtered.json' > /tmp/woggle-seed/all.json
git show 26f6141:server/scripts/words-to-remove-5-letter.json > /tmp/woggle-seed/rm5.json
git show 3fb6b2e:server/scripts/words-to-remove-4-letter.json > /tmp/woggle-seed/rm4.json
git show e562862:server/scripts/words-to-remove.json > /tmp/woggle-seed/rm.json

node -e '
const fs = require("fs");
const read = (f) => JSON.parse(fs.readFileSync("/tmp/woggle-seed/" + f + ".json"));
const drop = new Set([...read("rm"), ...read("rm4"), ...read("rm5")]);
const words = read("all").filter((w) => !drop.has(w));
fs.writeFileSync("/tmp/woggle-seed/words.json", JSON.stringify(words));
'

npm run seed:words --workspace=server -- /tmp/woggle-seed/words.json
```

Expected: `Seeded 302604 new word(s) out of 302604 in the file.`

- Rerunning is safe: existing words are skipped.
- The seed script does not read `server/.env`. If you set `DATA_DIR` there, also put `DATA_DIR=/your/path` before the seed command.
- The result may differ slightly from production, where words can be approved or edited.

## 5. Check the database

```sh
npm run db --workspace=server
```

At the `db>` prompt:

```js
q('SELECT COUNT(*) AS n FROM words');
```

Expected: `[ { n: 302604 } ]`. Type `.exit` to quit. This shell always opens `server/data/words.db`, even if `DATA_DIR` is set.

## 6. Run the app

```sh
npm run dev
```

Open the URL Vite prints (normally <http://localhost:5173>). The API runs on port 3001.

## Optional: create test users

```sh
npm run seed:users --workspace=server
```

This creates `test1` to `test5` with emails `test1@test.com` to `test5@test.com`, all with the password `testtest1`. Users that already exist are skipped.

## Optional: make yourself an admin

Roles are `user`, `tester` and `admin`. Sign up in the app, then run this at the `db>` prompt:

```js
q("UPDATE users SET role = 'admin' WHERE email = ?", 'you@example.com');
```

## Troubleshooting

- **`no such table: words` when seeding:** do step 3 first, and check that the server and seed script use the same `DATA_DIR`.
- **`no such table: main.users` on startup:** `server/src/dictionary.js` must load `./auth` before its queries. Update to a version with that fix.
- **Words are rejected, or the count is 0:** the database has not been seeded. Do step 4.
- **`git show` fails with an unknown revision:** run `git fetch --unshallow`.
- **Start over:** stop the server and move `server/data/` somewhere safe, then repeat from step 3. It also holds accounts and games.
- **`server/prod-snapshot/`:** its `words` table is empty, so it cannot be used to seed.
