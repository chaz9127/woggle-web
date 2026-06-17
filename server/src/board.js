const fs = require("fs");
const path = require("path");
const diceData = require("./boggle-dice.json");

// These mirror client/src/utils/random.js and board.js exactly. The board is a
// pure function of the date string, so the server can regenerate the same board
// the client played and verify that submitted words are actually traceable on
// it — the only thing that keeps the leaderboard honest.

function hashDateString(dateStr) {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < dateStr.length; i++) {
    h ^= dateStr.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return h >>> 0;
}

function mulberry32(seed) {
  let t = seed >>> 0;
  return function () {
    t = (t + 0x6d2b79f5) >>> 0;
    let r = t;
    r = Math.imul(r ^ (r >>> 15), r | 1);
    r ^= r + Math.imul(r ^ (r >>> 7), r | 61);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffleInPlace(arr, rand) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function generateBoard(dateStr) {
  const seed = hashDateString(dateStr);
  const rand = mulberry32(seed);
  const rolled = diceData.dice.map((die) => {
    const face = die.faces[Math.floor(rand() * die.faces.length)];
    return { letter: face.letter, value: face.value };
  });
  shuffleInPlace(rolled, rand);
  return rolled.map((tile, i) => ({
    id: i,
    row: Math.floor(i / 4),
    col: i % 4,
    letter: tile.letter,
    value: tile.value,
  }));
}

function isAdjacent(a, b) {
  return (
    a.id !== b.id &&
    Math.abs(a.row - b.row) <= 1 &&
    Math.abs(a.col - b.col) <= 1
  );
}

// Can `word` be traced on `board` via an adjacent, non-repeating tile path?
// Tile letters may be multi-character ("Qu"), so we match by string prefix and
// advance the cursor by the tile's length rather than assuming one char/tile.
function isFormable(board, word) {
  const w = String(word).toLowerCase();
  if (!w) return false;

  const dfs = (pos, tile, used) => {
    const letter = tile.letter.toLowerCase();
    if (!w.startsWith(letter, pos)) return false;
    const next = pos + letter.length;
    if (next === w.length) return true;
    return board.some(
      (t) =>
        !used.has(t.id) &&
        isAdjacent(tile, t) &&
        dfs(next, t, new Set(used).add(t.id))
    );
  };

  return board.some((t) => dfs(0, t, new Set([t.id])));
}

// Divergence guard: in development the client's dice JSON is present on disk, so
// fail fast if the two copies have drifted (which would silently reject every
// legitimate word). In production the client source may not be deployed — only
// client/dist — so we skip the check when the file is absent.
(function assertDiceInSync() {
  const clientDice = path.resolve(
    __dirname,
    "..",
    "..",
    "client",
    "src",
    "data",
    "boggle-dice.json"
  );
  let clientRaw;
  try {
    clientRaw = fs.readFileSync(clientDice, "utf8");
  } catch {
    return; // client source not present (e.g. production) — nothing to compare
  }
  const serverRaw = fs.readFileSync(
    path.join(__dirname, "boggle-dice.json"),
    "utf8"
  );
  if (
    JSON.stringify(JSON.parse(clientRaw)) !==
    JSON.stringify(JSON.parse(serverRaw))
  ) {
    throw new Error(
      "boggle-dice.json has diverged between client/src/data and server/src — " +
        "board validation would reject valid words. Sync the two files."
    );
  }
})();

module.exports = { generateBoard, isAdjacent, isFormable };
