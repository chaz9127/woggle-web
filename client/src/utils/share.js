export function buildShareText({ board, foundWords, totals, dateStr, theme }) {
  const used = new Set();
  for (const w of foundWords) {
    for (const id of w.tileIds || []) used.add(id);
  }
  const blank = theme === "dark" ? "⬛" : "⬜";
  const filled = "🟩";

  const rows = [];
  for (let r = 0; r < 4; r++) {
    let row = "";
    for (let c = 0; c < 4; c++) {
      const tile = board.find((t) => t.row === r && t.col === c);
      row += used.has(tile.id) ? filled : blank;
    }
    rows.push(row);
  }

  return [
    `Woggle ${dateStr}`,
    `${foundWords.length} word${foundWords.length === 1 ? "" : "s"} · ${totals.scrabble} pts`,
    "",
    ...rows,
  ].join("\n");
}

export async function copyToClipboard(text) {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // fall through to legacy path
  }
  try {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(ta);
    return ok;
  } catch {
    return false;
  }
}
