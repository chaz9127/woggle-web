const { db } = require("./db");

// One-time score bonuses an admin can grant to a specific user. A bonus is
// "claimable" once the user finishes any game on or after `active_from`; the
// first such completion consumes it (adds `points` to that game's score and
// marks it claimed) so it can never be redeemed twice.
db.exec(`
  CREATE TABLE IF NOT EXISTS user_bonuses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    active_from TEXT NOT NULL,
    points INTEGER NOT NULL,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    claimed_at TEXT,
    claimed_game_date TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );
  CREATE INDEX IF NOT EXISTS idx_user_bonuses_claimable
    ON user_bonuses (user_id, claimed_at, active_from);
  CREATE TRIGGER IF NOT EXISTS user_bonuses_updated_at
    AFTER UPDATE ON user_bonuses
    FOR EACH ROW
    BEGIN
      UPDATE user_bonuses SET updated_at = CURRENT_TIMESTAMP WHERE id = OLD.id;
    END;
`);

// Oldest unclaimed bonus that has become active by `gameDate`. Picking the
// oldest keeps redemption order predictable when a user has several pending.
const findClaimableBonus = db.prepare(`
  SELECT * FROM user_bonuses
  WHERE user_id = ? AND claimed_at IS NULL AND active_from <= ?
  ORDER BY active_from ASC, id ASC
  LIMIT 1
`);

const markBonusClaimed = db.prepare(`
  UPDATE user_bonuses
  SET claimed_at = CURRENT_TIMESTAMP, claimed_game_date = ?
  WHERE id = ?
`);

const insertBonus = db.prepare(`
  INSERT INTO user_bonuses (user_id, active_from, points, title, message)
  VALUES (?, ?, ?, ?, ?)
`);

const listBonuses = db.prepare(`
  SELECT b.id, b.points, b.active_from, b.title, b.message,
         b.claimed_at, b.claimed_game_date, b.created_at,
         u.email AS user_email, u.username AS user_username
  FROM user_bonuses b
  JOIN users u ON u.id = b.user_id
  ORDER BY b.created_at DESC
`);

const findBonus = db.prepare("SELECT * FROM user_bonuses WHERE id = ?");

const deleteUnclaimedBonus = db.prepare(
  "DELETE FROM user_bonuses WHERE id = ? AND claimed_at IS NULL"
);

module.exports = {
  findClaimableBonus,
  markBonusClaimed,
  insertBonus,
  listBonuses,
  findBonus,
  deleteUnclaimedBonus,
};
