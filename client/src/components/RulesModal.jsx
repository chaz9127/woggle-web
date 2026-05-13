import Modal from './Modal';

export default function RulesModal({ open, onClose }) {
  return (
    <Modal open={open} title="How to Play" onClose={onClose}>
      <ul className="rules">
        <li>Tap letters to build a word. Each new letter must be adjacent (including diagonals) to the last.</li>
        <li>Tap the last selected letter again to backtrack. No tile can be used twice in a single word.</li>
        <li>Words must be at least 3 letters long and exist in the dictionary.</li>
        <li>You earn two scores per word:
          <ul>
            <li><strong>Boggle:</strong> 3–4 letters = 1, 5 = 2, 6 = 3, 7 = 5, 8+ = 11.</li>
            <li><strong>Scrabble:</strong> sum of the small subscript values on each tile.</li>
          </ul>
        </li>
        <li>The board is the same for everyone today. Tap <strong>Finish</strong> when you're done.</li>
      </ul>
    </Modal>
  );
}
