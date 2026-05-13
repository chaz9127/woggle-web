import Modal from './Modal';

export default function RulesModal({ open, onClose }) {
  return (
    <Modal open={open} title="How to Play" onClose={onClose}>
      <ul className="rules">
        <li>Tap letters to build a word. Each new letter must be adjacent (including diagonals) to the last.</li>
        <li>Tap the last selected letter again to backtrack. No tile can be used twice in a single word.</li>
        <li>Words must be at least 3 letters long and exist in the dictionary.</li>
        <li>Each word's score is the sum of the small subscript Scrabble values on the tiles you used.</li>
        <li>The board is the same for everyone today. Tap <strong>Finish</strong> when you're done.</li>
      </ul>
    </Modal>
  );
}
