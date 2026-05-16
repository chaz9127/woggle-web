const RESULT_KEY_PREFIX = "woggle-result-";

export function loadResult(dateStr) {
  try {
    const raw = localStorage.getItem(RESULT_KEY_PREFIX + dateStr);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed?.foundWords) ? parsed.foundWords : null;
  } catch {
    return null;
  }
}

export function saveResult(dateStr, foundWords) {
  try {
    localStorage.setItem(
      RESULT_KEY_PREFIX + dateStr,
      JSON.stringify({ foundWords })
    );
  } catch {
    // ignore storage errors (quota / privacy mode)
  }
}

export function clearResult(dateStr) {
  try {
    localStorage.removeItem(RESULT_KEY_PREFIX + dateStr);
  } catch {
    // ignore
  }
}

export function hasResult(dateStr) {
  try {
    return localStorage.getItem(RESULT_KEY_PREFIX + dateStr) != null;
  } catch {
    return false;
  }
}
