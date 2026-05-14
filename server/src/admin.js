const express = require("express");
const { db } = require("./db");
const { requireAuth } = require("./auth");

const ROLES = new Set(["user", "tester", "admin"]);
const SUGGESTION_STATUSES = new Set(["pending", "denied", "approved"]);

const listUsers = db.prepare(`
  SELECT id, email, username, role, created_at
  FROM users
  ORDER BY created_at DESC
`);
const updateRole = db.prepare("UPDATE users SET role = ? WHERE id = ?");
const findUser = db.prepare("SELECT id, email, username, role FROM users WHERE id = ?");

const listSuggestions = db.prepare(`
  SELECT word, status, created_at, updated_at
  FROM word_suggestions
  ORDER BY
    CASE status WHEN 'pending' THEN 0 WHEN 'approved' THEN 1 ELSE 2 END,
    created_at DESC
`);
const updateSuggestionStatus = db.prepare(
  "UPDATE word_suggestions SET status = ? WHERE word = ?"
);
const findSuggestion = db.prepare(
  "SELECT word, status, created_at, updated_at FROM word_suggestions WHERE word = ?"
);

function requireAdmin(req, res, next) {
  if (!req.user) return res.status(404).json({ error: "Not found" });
  if (req.user.role !== "admin") return res.status(404).json({ error: "Not found" });
  next();
}

function buildAdminRouter() {
  const router = express.Router();

  router.use(requireAuth, requireAdmin);

  router.get("/users", (_req, res) => {
    res.json({ users: listUsers.all() });
  });

  router.patch("/users/:id/role", (req, res) => {
    const id = Number(req.params.id);
    const role = String(req.body?.role || "");
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ error: "Invalid id" });
    }
    if (!ROLES.has(role)) {
      return res.status(400).json({ error: "Invalid role" });
    }
    const existing = findUser.get(id);
    if (!existing) return res.status(404).json({ error: "User not found" });
    updateRole.run(role, id);
    res.json({ user: findUser.get(id) });
  });

  router.get("/word-suggestions", (_req, res) => {
    res.json({ suggestions: listSuggestions.all() });
  });

  router.patch("/word-suggestions/:word/status", (req, res) => {
    const word = String(req.params.word || "").toLowerCase();
    const status = String(req.body?.status || "");
    if (!/^[a-z]{1,16}$/.test(word)) {
      return res.status(400).json({ error: "Invalid word" });
    }
    if (!SUGGESTION_STATUSES.has(status)) {
      return res.status(400).json({ error: "Invalid status" });
    }
    if (!findSuggestion.get(word)) {
      return res.status(404).json({ error: "Suggestion not found" });
    }
    updateSuggestionStatus.run(status, word);
    res.json({ suggestion: findSuggestion.get(word) });
  });

  return router;
}

module.exports = { buildAdminRouter };
