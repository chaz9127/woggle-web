import { useState } from 'react';
import Modal from './Modal';
import { isTooltipDismissed, dismissTooltip } from '../utils/cookies';
import wordCountImg from '../assets/tester-word-count.png';
import missedWordsImg from '../assets/tester-missed-words.png';

// Change this to show the modal again for a new round of testing.
const DISMISS_KEY = 'testerPossibleWords';

export default function TesterModal({ open }) {
  // Locally, ignore past dismissals so the modal shows on every page load.
  const [dismissed, setDismissed] = useState(
    () => !import.meta.env.DEV && isTooltipDismissed(DISMISS_KEY)
  );

  const handleClose = () => {
    dismissTooltip(DISMISS_KEY);
    setDismissed(true);
  };

  return (
    <Modal
      open={open && !dismissed}
      title="Hey Tester! I need your help!"
      onClose={handleClose}
    >
      <p>
        <strong>New "Possible Word Count" Feature</strong>
        <br />
        <br />
        Now live only for you guys to test it out 👍
        <br />
        (funny how that works)
      </p>
      <ol className="rules">
        <li>
          We have a possible word count now at the top when playing a game.
          <img
            className="tester-modal__image"
            src={wordCountImg}
            alt="Scoreboard showing 0 / 130 under Words"
          />
        </li>
        <li>
          We have a missed word list after the game.
          <img
            className="tester-modal__image"
            src={missedWordsImg}
            alt="Time's Up! summary with an arrow pointing to Missed words (123)"
          />
        </li>
      </ol>
      <p>
        <br />
        Please let me know what you think and let me know if anything breaks!
      </p>
      <div className="controls">
        <button
          type="button"
          className="btn btn--primary"
          onClick={handleClose}
        >
          Got it
        </button>
      </div>
    </Modal>
  );
}
