// Pure challenge-mode rules, kept free of the DB and Express so they can be
// unit-tested with `node --test` (see server/test/challengeLogic.test.js).

const crypto = require("crypto");

// No vowels (A E I O U) or Y, so a code can't spell a real word. No lookalikes:
// I/L/1, O/0/Q, U/V. That leaves 18 consonants plus digits 2-9 = 26 symbols,
// 26^4 ≈ 457k codes. Codes are never reused, so this is the lifetime capacity.
const CODE_ALPHABET = "BCDFGHJKMNPRSTVWXZ23456789";
const CODE_LENGTH = 4;
const CODE_RE = new RegExp(`^[${CODE_ALPHABET}]{${CODE_LENGTH}}$`);

// Digits that read as letters ("leetspeak"), applied before the denylist check
// so codes like S3X or F4G are caught as well as plain consonant strings.
const LEET = { 2: "Z", 3: "E", 4: "A", 5: "S", 6: "G", 7: "T", 8: "B", 9: "G" };
const DENYLIST = [
  "FAG",
  "FCK",
  "FK",
  "SEX",
  "SXY",
  "RAPE",
  "NAZ",
  "NGG",
  "NGR",
  "KKK",
  "CNT",
  "DCK",
  "ASS",
  "TWAT",
  "WTF",
  "STFU",
  "PNS",
  "JEW",
  "GAY",
];

function isAllowedCode(code) {
  if (!CODE_RE.test(code)) return false;
  const read = [...code].map((c) => LEET[c] || c).join("");
  return !DENYLIST.some((bad) => read.includes(bad));
}

// `randomInt` is injectable for tests; production uses crypto.randomInt.
function generateCode(randomInt = crypto.randomInt) {
  for (;;) {
    let code = "";
    for (let i = 0; i < CODE_LENGTH; i++) {
      code += CODE_ALPHABET[randomInt(CODE_ALPHABET.length)];
    }
    if (isAllowedCode(code)) return code;
  }
}

function normalizeCode(raw) {
  const code = String(raw || "")
    .trim()
    .toUpperCase();
  return CODE_RE.test(code) ? code : null;
}

// The prefix keeps challenge seeds from ever colliding with a daily date seed.
function generateSeed() {
  return `challenge:${crypto.randomBytes(16).toString("hex")}`;
}

// The server enforces the production run length plus a grace period for the
// pre-play countdown, network latency and a retry, whatever the client uses.
const RUN_SECONDS = 120;
const GRACE_SECONDS = 30;

function runDeadlineMs(startedAtIso) {
  return Date.parse(startedAtIso) + (RUN_SECONDS + GRACE_SECONDS) * 1000;
}

function isRunExpired(startedAtIso, nowMs) {
  return nowMs > runDeadlineMs(startedAtIso);
}

// Lifecycle: waiting (no opponent yet) -> in_progress (opponent joined) ->
// completed (both finished). Retracted (by the creator) or rejected (by the
// invited player) ends it from either open state.
function challengeStatus(challenge, players) {
  if (challenge.retracted_at) return "retracted";
  if (challenge.rejected_at) return "rejected";
  if (challenge.completed_at) return "completed";
  if (!players.some((p) => p.role === "opponent")) return "waiting";
  return "in_progress";
}

function isEnded(status) {
  return (
    status === "retracted" || status === "rejected" || status === "completed"
  );
}

// Higher score wins; a tied score goes to whoever found more words; if both
// match it's a draw.
function decideWinner(creator, opponent) {
  if (creator.score !== opponent.score) {
    return creator.score > opponent.score ? "creator" : "opponent";
  }
  if (creator.word_count !== opponent.word_count) {
    return creator.word_count > opponent.word_count ? "creator" : "opponent";
  }
  return "draw";
}

// A completed challenge from one player's side.
function outcomeFor(role, winner) {
  if (winner === "draw") return "draw";
  return winner === role ? "win" : "loss";
}

function tallyRecord(outcomes) {
  const record = { wins: 0, losses: 0, draws: 0 };
  for (const o of outcomes) {
    if (o === "win") record.wins++;
    else if (o === "loss") record.losses++;
    else if (o === "draw") record.draws++;
  }
  return record;
}

// A participant has an unseen result once the challenge is completed and they
// haven't opened the results yet. Retracted and rejected challenges never
// complete, so they never produce a dot.
function hasUnseenResult(challenge, player) {
  return !!challenge.completed_at && !player.results_seen_at;
}

// One-line, per-viewer status shown in lists ("Your turn", "You won", ...).
function viewerLabel(status, me, opponent, winner) {
  if (status === "retracted") return "Retracted";
  if (status === "rejected") {
    return me.role === "opponent" ? "You rejected" : "Rejected";
  }
  if (status === "waiting") {
    return me.finished_at ? "Waiting for opponent" : "Your turn";
  }
  if (status === "in_progress") {
    if (!me.finished_at) return "Your turn";
    return opponent?.finished_at ? "Finishing up" : "Their turn";
  }
  if (winner === "draw") return "Draw";
  return winner === me.role ? "You won" : "You lost";
}

module.exports = {
  CODE_ALPHABET,
  CODE_LENGTH,
  RUN_SECONDS,
  GRACE_SECONDS,
  isAllowedCode,
  generateCode,
  normalizeCode,
  generateSeed,
  runDeadlineMs,
  isRunExpired,
  challengeStatus,
  isEnded,
  decideWinner,
  outcomeFor,
  tallyRecord,
  hasUnseenResult,
  viewerLabel,
};
