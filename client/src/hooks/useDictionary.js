export async function checkWord(word) {
  try {
    const res = await fetch(
      `https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(word.toLowerCase())}`
    );
    return res.status === 200;
  } catch {
    return false;
  }
}
