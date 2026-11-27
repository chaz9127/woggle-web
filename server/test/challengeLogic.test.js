const test = require("node:test");
const assert = require("node:assert/strict");
const {
  CODE_ALPHABET,
  isAllowedCode,
  generateCode,
  normalizeCode,
  generateSeed,
  isRunExpired,
  RUN_SECONDS,
  GRACE_SECONDS,
  challengeStatus,
  isEnded,
  decideWinner,
  outcomeFor,
  tallyRecord,
  hasUnseenResult,
  viewerLabel,
} = require("../src/challengeLogic");

test("alphabet has no vowels, Y or lookalike characters", () => {
  assert.equal(CODE_ALPHABET.length, 26);
  for (const c of "AEIOUYLQ01") {
    assert.ok(!CODE_ALPHABET.includes(c), `alphabet should not contain ${c}`);
  }
  assert.equal(new Set(CODE_ALPHABET).size, CODE_ALPHABET.length);
});

test("generated codes are 4 allowed characters", () => {
  for (let i = 0; i < 2000; i++) {
    const code = generateCode();
    assert.match(code, /^[BCDFGHJKMNPRSTVWXZ2-9]{4}$/);
    assert.ok(isAllowedCode(code));
  }
});

test("generateCode skips denylisted codes", () => {
  // Feed indexes that spell F4G1 first (denied), then BCDF.
  const seq = [
    CODE_ALPHABET.indexOf("F"),
    CODE_ALPHABET.indexOf("4"),
    CODE_ALPHABET.indexOf("G"),
    CODE_ALPHABET.indexOf("B"),
    ...[..."BCDF"].map((c) => CODE_ALPHABET.indexOf(c)),
  ];
  let i = 0;
  assert.equal(
    generateCode(() => seq[i++]),
    "BCDF"
  );
});

test("denylist catches plain and leetspeak variants", () => {
  for (const bad of ["KKKB", "S3XB", "F4GZ", "BF4G", "NGGR", "R4P3"]) {
    assert.equal(isAllowedCode(bad), false, bad);
  }
  for (const ok of ["BCDF", "K7RV", "HWDG", "2345"]) {
    assert.equal(isAllowedCode(ok), true, ok);
  }
});

test("normalizeCode trims and uppercases, and rejects anything off-alphabet", () => {
  assert.equal(normalizeCode(" k7rv "), "K7RV");
  assert.equal(normalizeCode("KTRVX"), null);
  assert.equal(normalizeCode("KTR"), null);
  assert.equal(normalizeCode("KTRO"), null); // O is not in the alphabet
  assert.equal(normalizeCode(null), null);
});

test("seeds are unique and can't look like a daily date", () => {
  const a = generateSeed();
  const b = generateSeed();
  assert.notEqual(a, b);
  assert.match(a, /^challenge:[0-9a-f]{32}$/);
});

test("runs expire only after the run length plus grace", () => {
  const start = "2026-01-01T00:00:00.000Z";
  const t0 = Date.parse(start);
  const limit = (RUN_SECONDS + GRACE_SECONDS) * 1000;
  assert.equal(isRunExpired(start, t0 + limit), false);
  assert.equal(isRunExpired(start, t0 + limit + 1), true);
});

test("lifecycle status: waiting -> in_progress -> completed, retract wins", () => {
  const creator = { role: "creator" };
  const opponent = { role: "opponent" };
  assert.equal(challengeStatus({}, [creator]), "waiting");
  assert.equal(challengeStatus({}, [creator, opponent]), "in_progress");
  assert.equal(
    challengeStatus({ completed_at: "x" }, [creator, opponent]),
    "completed"
  );
  assert.equal(challengeStatus({ retracted_at: "x" }, [creator]), "retracted");
  assert.ok(isEnded("completed"));
  assert.ok(isEnded("retracted"));
  assert.ok(!isEnded("waiting"));
  assert.ok(!isEnded("in_progress"));
});

test("winner: score, then word count, then draw", () => {
  const p = (score, word_count) => ({ score, word_count });
  assert.equal(decideWinner(p(10, 1), p(9, 5)), "creator");
  assert.equal(decideWinner(p(9, 5), p(10, 1)), "opponent");
  assert.equal(decideWinner(p(10, 3), p(10, 4)), "opponent");
  assert.equal(decideWinner(p(10, 4), p(10, 4)), "draw");
});

test("outcome and record from the viewer's side", () => {
  assert.equal(outcomeFor("creator", "creator"), "win");
  assert.equal(outcomeFor("opponent", "creator"), "loss");
  assert.equal(outcomeFor("opponent", "draw"), "draw");
  assert.deepEqual(tallyRecord(["win", "loss", "win", "draw", null]), {
    wins: 2,
    losses: 1,
    draws: 1,
  });
  assert.deepEqual(tallyRecord([]), { wins: 0, losses: 0, draws: 0 });
});

test("green dot: only for completed challenges not yet viewed", () => {
  assert.equal(hasUnseenResult({}, {}), false);
  assert.equal(hasUnseenResult({ completed_at: "x" }, {}), true);
  assert.equal(
    hasUnseenResult({ completed_at: "x" }, { results_seen_at: "y" }),
    false
  );
  assert.equal(hasUnseenResult({ retracted_at: "x" }, {}), false);
});

test("viewer labels", () => {
  const me = { role: "creator", finished_at: null };
  const done = { role: "creator", finished_at: "x" };
  assert.equal(viewerLabel("waiting", me), "Your turn");
  assert.equal(viewerLabel("waiting", done), "Waiting for opponent");
  assert.equal(viewerLabel("in_progress", me, {}), "Your turn");
  assert.equal(viewerLabel("in_progress", done, {}), "Their turn");
  assert.equal(viewerLabel("completed", done, {}, "creator"), "You won");
  assert.equal(viewerLabel("completed", done, {}, "opponent"), "You lost");
  assert.equal(viewerLabel("completed", done, {}, "draw"), "Draw");
  assert.equal(viewerLabel("retracted", done), "Retracted");
});
