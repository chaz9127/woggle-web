import Modal from './Modal';

export default function SummaryModal({ open, onClose, foundWords, totals, elapsed }) {
  const mm = String(Math.floor(elapsed / 60)).padStart(1, '0');
  const ss = String(elapsed % 60).padStart(2, '0');
  return (
    <Modal open={open} title="Game Over" onClose={onClose}>
      <div className="summary">
        <div className="summary__stats">
          <div><span>Time</span><strong>{mm}:{ss}</strong></div>
          <div><span>Words</span><strong>{foundWords.length}</strong></div>
          <div><span>Boggle</span><strong>{totals.boggle}</strong></div>
          <div><span>Scrabble</span><strong>{totals.scrabble}</strong></div>
        </div>
        <h3>Words</h3>
        {foundWords.length === 0 ? (
          <p className="summary__empty">No words this round.</p>
        ) : (
          <ul className="summary__words">
            {foundWords.map((w) => (
              <li key={w.word}>
                <span>{w.word}</span>
                <span className="summary__scores">+{w.boggle} / {w.scrabble}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Modal>
  );
}
