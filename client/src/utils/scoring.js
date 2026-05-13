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
