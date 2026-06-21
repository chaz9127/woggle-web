import { useState } from 'react';
import Modal from './Modal';
import {
  buildShareText,
  buildWordsText,
  copyToClipboard,
} from '../utils/share';
import { trackShareScore, trackShareWords } from '../utils/analytics';

export default function SummaryModal({
  open,
  onClose,
  foundWords,
  totals,
  board,
  dateStr,
  theme,
  bonus,
}) {
  const [shareStatus, setShareStatus] = useState('');
  const [wordsStatus, setWordsStatus] = useState('');

  const handleShare = async () => {
    const text = buildShareText({ board, foundWords, totals, dateStr, theme });
    const ok = await copyToClipboard(text);
    if (ok) trackShareScore();
    setShareStatus(ok ? 'Copied!' : 'Copy failed');
    setTimeout(() => setShareStatus(''), 1800);
  };

  const handleCopyWords = async () => {
    const text = buildWordsText({ foundWords, totals, dateStr });
    const ok = await copyToClipboard(text);
    if (ok) trackShareWords();
    setWordsStatus(ok ? 'Copied!' : 'Copy failed');
    setTimeout(() => setWordsStatus(''), 1800);
  };

  return (
    <Modal open={open} title="Time's Up!" onClose={onClose}>
      <div className="summary">
        <div className="summary__stats">
          <div>
            <span>Words</span>
            <strong>{foundWords.length}</strong>
          </div>
          <div>
            <span>Score</span>
            <strong>{totals.scrabble + (bonus?.points || 0)}</strong>
          </div>
        </div>
        {bonus && (
          <p className="summary__bonus">
            🎉 {bonus.title} <strong>+{bonus.points}</strong>
          </p>
        )}
        <h3>Words</h3>
        {foundWords.length === 0 ? (
          <p className="summary__empty">No words this round.</p>
        ) : (
          <ul className="summary__words">
            {[...foundWords]
              .sort((a, b) => b.scrabble - a.scrabble)
              .map((w) => (
                <li key={w.word}>
                  <span>{w.word}</span>
                  <span className="summary__scores">{w.scrabble}</span>
                </li>
              ))}
          </ul>
        )}
        <button
          type="button"
          className="btn btn--primary summary__share"
          onClick={handleShare}
        >
          {shareStatus || 'Share my score'}
        </button>
        <button
          type="button"
          className="btn btn--ghost summary__share"
          onClick={handleCopyWords}
          disabled={foundWords.length === 0}
        >
          {wordsStatus || 'Copy my words'}
        </button>
      </div>
    </Modal>
  );
}
