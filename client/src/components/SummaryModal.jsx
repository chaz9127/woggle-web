import Modal from './Modal';

export default function SummaryModal({ open, onClose, foundWords, totals }) {
  return (
    <Modal open={open} title="Time's Up!" onClose={onClose}>
      <div className="summary">
        <div className="summary__stats">
          <div><span>Words</span><strong>{foundWords.length}</strong></div>
          <div><span>Score</span><strong>{totals.scrabble}</strong></div>
        </div>
        <h3>Words</h3>
        {foundWords.length === 0 ? (
          <p className="summary__empty">No words this round.</p>
        ) : (
          <ul className="summary__words">
            {foundWords.map((w) => (
              <li key={w.word}>
                <span>{w.word}</span>
                <span className="summary__scores">{w.scrabble}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Modal>
  );
}
