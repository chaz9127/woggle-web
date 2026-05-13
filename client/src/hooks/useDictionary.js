export async function checkWord(word) {
  try {
    const res = await fetch(`/api/word/${encodeURIComponent(word.toLowerCase())}`);
    return res.status === 200;
  } catch {
    return false;
  }
}

export async function suggestWord(word) {
  try {
    await fetch(`/api/word/${encodeURIComponent(word.toLowerCase())}/suggest`, {
      method: "POST",
    });
  } catch {
    // best-effort
  }
}
