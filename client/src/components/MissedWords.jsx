import { useEffect, useState } from 'react';

export default function MissedWords({ dateStr, foundWords }) {
  const [possible, setPossible] = useState(null);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/games/possible-words?date=${dateStr}`, {
      credentials: 'include',
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!cancelled && Array.isArray(data?.words)) setPossible(data.words);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [dateStr]);

  if (!possible) return null;

  const found = new Set(foundWords.map((w) => w.word.toLowerCase()));
  const missed = possible
    .filter((w) => !found.has(w.word))
    .sort((a, b) => b.scrabble - a.scrabble || a.word.localeCompare(b.word));

  if (missed.length === 0) return null;

  return (
    <details className="summary__missed">
      <summary>Missed words ({missed.length})</summary>
      <ul className="summary__words">
        {missed.map((w) => (
          <li key={w.word}>
            <span>{w.word.toUpperCase()}</span>
            <span className="summary__scores">{w.scrabble}</span>
          </li>
        ))}
      </ul>
    </details>
  );
}
