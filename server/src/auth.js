const path = require("path");
const express = require("express");
const session = require("express-session");
const bcrypt = require("bcrypt");
const passport = require("passport");
const { Strategy: LocalStrategy } = require("passport-local");
const { Strategy: GoogleStrategy } = require("passport-google-oauth20");
const rateLimit = require("express-rate-limit");
const SqliteStore = require("better-sqlite3-session-store")(session);
const Database = require("better-sqlite3");
const { db, dataDir } = require("./db");

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT NOT NULL UNIQUE,
    username TEXT UNIQUE,
    password_hash TEXT,
    google_id TEXT UNIQUE,
    clear_after_invalid INTEGER NOT NULL DEFAULT 0,
    role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('admin', 'tester', 'user')),
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );
  CREATE TRIGGER IF NOT EXISTS users_updated_at
    AFTER UPDATE ON users
    FOR EACH ROW
    BEGIN
      UPDATE users SET updated_at = CURRENT_TIMESTAMP WHERE id = OLD.id;
    END;
`);

const userCols = db.prepare("PRAGMA table_info(users)").all().map((c) => c.name);
if (!userCols.includes("role")) {
  db.exec(
    "ALTER TABLE users ADD COLUMN role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('admin', 'tester', 'user'))"
  );
}

const findById = db.prepare("SELECT * FROM users WHERE id = ?");
const findByEmail = db.prepare("SELECT * FROM users WHERE email = ?");
const findByUsername = db.prepare("SELECT * FROM users WHERE username = ?");
const findByGoogleId = db.prepare("SELECT * FROM users WHERE google_id = ?");
const insertLocalUser = db.prepare(
  "INSERT INTO users (email, username, password_hash) VALUES (?, ?, ?)"
);
const insertGoogleUser = db.prepare(
  "INSERT INTO users (email, google_id) VALUES (?, ?)"
);
const updateUsername = db.prepare(
  "UPDATE users SET username = ? WHERE id = ?"
);
const linkGoogleId = db.prepare(
  "UPDATE users SET google_id = ? WHERE id = ?"
);
const updateClearAfterInvalid = db.prepare(
  "UPDATE users SET clear_after_invalid = ? WHERE id = ?"
);

function publicUser(u) {
  if (!u) return null;
  return {
    id: u.id,
    email: u.email,
    username: u.username,
    role: u.role,
    hasPassword: !!u.password_hash,
    googleLinked: !!u.google_id,
    clearAfterInvalid: !!u.clear_after_invalid,
  };
}

passport.serializeUser((user, done) => done(null, user.id));
passport.deserializeUser((id, done) => {
  try {
    done(null, findById.get(id) || false);
  } catch (e) {
    done(e);
  }
});

passport.use(
  new LocalStrategy({ usernameField: "email" }, (email, password, done) => {
    try {
      const user = findByEmail.get(String(email || "").toLowerCase().trim());
      if (!user || !user.password_hash) {
        return done(null, false, { message: "Invalid credentials" });
      }
      bcrypt.compare(password, user.password_hash, (err, ok) => {
        if (err) return done(err);
        if (!ok) return done(null, false, { message: "Invalid credentials" });
        return done(null, user);
      });
    } catch (e) {
      done(e);
    }
  })
);

if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  passport.use(
    new GoogleStrategy(
      {
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL:
          process.env.GOOGLE_CALLBACK_URL ||
          "/api/auth/google/callback",
      },
      (accessToken, refreshToken, profile, done) => {
        try {
          const email = (profile.emails?.[0]?.value || "").toLowerCase();
          if (!email) {
            return done(null, false, { message: "Google account has no email" });
          }
          let user = findByGoogleId.get(profile.id);
          if (!user) {
            user = findByEmail.get(email);
            if (user) {
              linkGoogleId.run(profile.id, user.id);
              user = findById.get(user.id);
            } else {
              const result = insertGoogleUser.run(email, profile.id);
              user = findById.get(result.lastInsertRowid);
            }
          }
          done(null, user);
        } catch (e) {
          done(e);
        }
      }
    )
  );
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const USERNAME_RE = /^[a-zA-Z0-9_]{3,24}$/;

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: "draft-7",
  legacyHeaders: false,
});

function requireAuth(req, res, next) {
  if (!req.user) return res.status(401).json({ error: "Not signed in" });
  next();
}

function buildAuthRouter() {
  const router = express.Router();

  router.post("/register", authLimiter, async (req, res, next) => {
    try {
      const email = String(req.body?.email || "").toLowerCase().trim();
      const username = String(req.body?.username || "").trim();
      const password = String(req.body?.password || "");

      if (!EMAIL_RE.test(email)) {
        return res.status(400).json({ error: "Invalid email" });
      }
      if (!USERNAME_RE.test(username)) {
        return res.status(400).json({
          error: "Username must be 3-24 chars, letters/numbers/underscore",
        });
      }
      if (password.length < 8) {
        return res.status(400).json({ error: "Password must be 8+ chars" });
      }
      if (findByEmail.get(email)) {
        return res.status(409).json({ error: "Email already registered" });
      }
      if (findByUsername.get(username)) {
        return res.status(409).json({ error: "Username taken" });
      }

      const hash = await bcrypt.hash(password, 12);
      const result = insertLocalUser.run(email, username, hash);
      const user = findById.get(result.lastInsertRowid);
      req.login(user, (err) => {
        if (err) return next(err);
        res.status(201).json({ user: publicUser(user) });
      });
    } catch (e) {
      next(e);
    }
  });

  router.post("/login", authLimiter, (req, res, next) => {
    passport.authenticate("local", (err, user, info) => {
      if (err) return next(err);
      if (!user) {
        return res.status(401).json({ error: info?.message || "Invalid credentials" });
      }
      req.login(user, (loginErr) => {
        if (loginErr) return next(loginErr);
        res.json({ user: publicUser(user) });
      });
    })(req, res, next);
  });

  router.post("/logout", (req, res, next) => {
    req.logout((err) => {
      if (err) return next(err);
      req.session.destroy(() => res.json({ ok: true }));
    });
  });

  router.get("/me", (req, res) => {
    res.json({ user: publicUser(req.user) });
  });

  router.post("/username", requireAuth, (req, res) => {
    const username = String(req.body?.username || "").trim();
    if (!USERNAME_RE.test(username)) {
      return res.status(400).json({
        error: "Username must be 3-24 chars, letters/numbers/underscore",
      });
    }
    if (findByUsername.get(username)) {
      return res.status(409).json({ error: "Username taken" });
    }
    updateUsername.run(username, req.user.id);
    res.json({ user: publicUser(findById.get(req.user.id)) });
  });

  router.patch("/preferences", requireAuth, (req, res) => {
    const { clearAfterInvalid } = req.body || {};
    if (typeof clearAfterInvalid !== "boolean") {
      return res.status(400).json({ error: "clearAfterInvalid must be boolean" });
    }
    updateClearAfterInvalid.run(clearAfterInvalid ? 1 : 0, req.user.id);
    res.json({ user: publicUser(findById.get(req.user.id)) });
  });

  if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
    router.get(
      "/google",
      passport.authenticate("google", { scope: ["profile", "email"] })
    );
    router.get(
      "/google/callback",
      passport.authenticate("google", {
        failureRedirect: "/signin?error=google",
      }),
      (req, res) => {
        const dest = req.user?.username ? "/" : "/choose-username";
        res.redirect(dest);
      }
    );
  } else {
    router.get("/google", (_req, res) =>
      res.status(503).json({ error: "Google OAuth not configured" })
    );
  }

  return router;
}

function buildSessionMiddleware() {
  const sessionDb = new Database(path.join(dataDir, "sessions.db"));
  sessionDb.pragma("journal_mode = WAL");
  const isProd = process.env.NODE_ENV === "production";
  return session({
    store: new SqliteStore({
      client: sessionDb,
      expired: { clear: true, intervalMs: 15 * 60 * 1000 },
    }),
    secret: process.env.SESSION_SECRET || "dev-insecure-change-me",
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      sameSite: "lax",
      secure: isProd,
      maxAge: 1000 * 60 * 60 * 24 * 30,
    },
  });
}

module.exports = {
  buildAuthRouter,
  buildSessionMiddleware,
  passport,
  requireAuth,
};
