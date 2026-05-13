export default function WordList({ words }) {
  if (words.length === 0) {
    return (
      <div className="wordlist wordlist--empty">
        <p>No words found yet — start tapping tiles!</p>
      </div>
    );
  }
  return (
    <div className="wordlist">
      <h2 className="wordlist__title">Found Words ({words.length})</h2>
      <ul className="wordlist__list">
        {words.map((w) => (
          <li key={w.word} className="wordlist__item">
            <span className="wordlist__word">{w.word}</span>
            <span className="wordlist__meta">
              <span title="Letters">{w.letterCount}L</span>
              <span title="Scrabble score" className="wordlist__scrabble">{w.scrabble}</span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
