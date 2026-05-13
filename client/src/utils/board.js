import diceData from '../data/boggle-dice.json';
import { hashDateString, mulberry32, shuffleInPlace } from './random';

export function generateBoard(dateStr) {
  const seed = hashDateString(dateStr);
  const rand = mulberry32(seed);
  const rolled = diceData.dice.map((die) => {
    const face = die.faces[Math.floor(rand() * die.faces.length)];
    return { letter: face.letter, value: face.value };
  });
  shuffleInPlace(rolled, rand);
  return rolled.map((tile, i) => ({
    id: i,
    row: Math.floor(i / 4),
    col: i % 4,
    letter: tile.letter,
    value: tile.value,
  }));
}

export function isAdjacent(a, b) {
  if (!a || !b || a.id === b.id) return false;
  return Math.abs(a.row - b.row) <= 1 && Math.abs(a.col - b.col) <= 1;
}
