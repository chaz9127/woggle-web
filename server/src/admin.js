const express = require("express");
const { db } = require("./db");
const { requireAuth } = require("./auth");

const ROLES = new Set(["user", "tester", "admin"]);

const listUsers = db.prepare(`
  SELECT id, email, username, role, created_at
  FROM users
  ORDER BY created_at DESC
`);
const updateRole = db.prepare("UPDATE users SET role = ? WHERE id = ?");
const findUser = db.prepare("SELECT id, email, username, role FROM users WHERE id = ?");

function buildAdminRouter() {
  const router = express.Router();

  router.use(requireAuth);

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

  return router;
}

module.exports = { buildAdminRouter };
