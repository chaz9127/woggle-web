// In-memory cache of the server's known-valid words. Loaded once per session
// (kick-started during the pre-game countdown) so word checks can be answered
// locally before falling back to the /api/word/:word backend lookup.

let wordSet = null;
let loadPromise = null;

export function loadWordList() {
  if (loadPromise) return loadPromise;
  loadPromise = fetch('/api/words')
    .then((res) => (res.ok ? res.json() : []))
    .then((words) => {
      wordSet = new Set(words);
      return wordSet;
    })
    .catch(() => {
      // On failure, leave the cache empty and allow a retry on the next game so
      // a flaky download simply falls back to per-word backend checks.
      loadPromise = null;
      return null;
    });
  return loadPromise;
}

export function isWordCached(word) {
  return wordSet ? wordSet.has(word.toLowerCase()) : false;
}
