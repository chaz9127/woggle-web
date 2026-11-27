const test = require("node:test");
const assert = require("node:assert/strict");
const { nextStreak, yesterdayOf } = require("../src/streak");

const stats = (current, longest, last) => ({
  current_streak: current,
  longest_streak: longest,
  last_completed_date: last,
});

test("yesterdayOf crosses month and year boundaries", () => {
  assert.equal(yesterdayOf("2026-03-01"), "2026-02-28");
  assert.equal(yesterdayOf("2026-01-01"), "2025-12-31");
});

test("first play starts a streak of 1", () => {
  assert.deepEqual(nextStreak(stats(0, 0, null), "2026-11-27"), {
    current: 1,
    longest: 1,
    lastDate: "2026-11-27",
  });
});

test("playing the day after extends the streak and the longest", () => {
  assert.deepEqual(nextStreak(stats(4, 4, "2026-11-26"), "2026-11-27"), {
    current: 5,
    longest: 5,
    lastDate: "2026-11-27",
  });
});

test("a missed day restarts at 1 but keeps the longest", () => {
  assert.deepEqual(nextStreak(stats(4, 9, "2026-11-25"), "2026-11-27"), {
    current: 1,
    longest: 9,
    lastDate: "2026-11-27",
  });
});

test("a second play on the same day changes nothing", () => {
  assert.deepEqual(nextStreak(stats(5, 7, "2026-11-27"), "2026-11-27"), {
    current: 5,
    longest: 7,
    lastDate: "2026-11-27",
  });
});

test("an earlier date than the last counted one changes nothing", () => {
  assert.deepEqual(nextStreak(stats(5, 7, "2026-11-27"), "2026-11-26"), {
    current: 5,
    longest: 7,
    lastDate: "2026-11-27",
  });
});
