import Modal from './Modal';

export default function WhySignUpModal({ open, onClose, onSignUp }) {
  return (
    <Modal
      open={open}
      title="Don't forget to make an account!"
      onClose={onClose}
    >
      Why?
      <ul className="rules">
        <li>Automatic leaderboard entries.</li>
        <li>Tailor the game with settings that match how you play.</li>
        <li>Track your streak, best word, high score, and more over time.</li>
      </ul>
      <div className="controls" style={{ marginTop: 12 }}>
        <button type="button" className="btn btn--ghost" onClick={onClose}>
          Maybe later
        </button>
        <button type="button" className="btn btn--primary" onClick={onSignUp}>
          Sign up
        </button>
      </div>
    </Modal>
  );
}
