export function boggleScore(wordLength) {
  if (wordLength < 3) return 0;
  if (wordLength === 3) return 1;
  if (wordLength === 4) return 1;
  if (wordLength === 5) return 2;
  if (wordLength === 6) return 3;
  if (wordLength === 7) return 5;
  return 11;
}

export function scrabbleScore(tiles) {
  return tiles.reduce((sum, t) => sum + t.value, 0);
}

export function tilesToWord(tiles) {
  return tiles
    .map((t) => t.letter)
    .join("")
    .toUpperCase();
}

export function tilesToLetterCount(tiles) {
  return tiles.reduce((n, t) => n + t.letter.length, 0);
}
