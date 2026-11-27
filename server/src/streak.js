// Pure streak rules, shared by daily games and challenge runs (see
// server/test/streak.test.js). Dates are YYYY-MM-DD in the player's local day.

function yesterdayOf(dateStr) {
  const d = new Date(dateStr + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().slice(0, 10);
}

// The streak after the player plays on `dateStr`. Playing again on a day that
// already counted (a daily and a challenge, or two challenges) changes nothing,
// and so does a date earlier than the last counted one (a timezone wobble).
function nextStreak(stats, dateStr) {
  const current = stats.current_streak || 0;
  const longest = stats.longest_streak || 0;
  const last = stats.last_completed_date || null;
  if (last && dateStr <= last) {
    return { current, longest, lastDate: last };
  }
  const next = last === yesterdayOf(dateStr) ? current + 1 : 1;
  return {
    current: next,
    longest: Math.max(longest, next),
    lastDate: dateStr,
  };
}

module.exports = { yesterdayOf, nextStreak };
