import { useState } from 'react';
import Modal from './Modal';
import { isTooltipDismissed, dismissTooltip } from '../utils/cookies';
import wordCountImg from '../assets/tester-word-count.png';
import missedWordsImg from '../assets/tester-missed-words.png';

// Change this to show the modal again for a new round of testing.
const DISMISS_KEY = 'testerPossibleWords';

export default function TesterModal({ open }) {
  const [dismissed, setDismissed] = useState(() =>
    isTooltipDismissed(DISMISS_KEY)
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
        New "Possible Word Count" feature is live only for you guys to test it
        out (funny how that works). Please let me know what you think and let me
        know if anything breaks!
      </p>
      <ol className="rules">
        <li>
          We have a possible word count now at the top. Make sure it shows!
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
