import { useState } from 'react';
import Modal from './Modal';
import { isTooltipDismissed, dismissTooltip } from '../utils/cookies';
import sOneImg from '../assets/s_one.png';
import sTwoImg from '../assets/s_two.png';
import sThreeImg from '../assets/s_three.png';
import sFourImg from '../assets/s_four.png';

// Change this to show the modal again for a new round of testing.
const DISMISS_KEY = 'testerChallenge';

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
      title="Challengers, Assemble!"
      onClose={handleClose}
    >
      <p>
        <strong>New "Challenge" Feature in Beta</strong>
        <br />
      </p>
      <ol className="rules">
        <li>
          New challenge section for a 1v1 challenge
          <img
            className="tester-modal__image"
            src={sOneImg}
            alt="Home screen with the Challenge tab circled next to Daily"
          />
          <br />
          <hr />
          <br />
          <img
            className="tester-modal__image"
            src={sTwoImg}
            alt="Challenge tab showing the win/loss/tie record, Start challenge, and code entry"
          />
        </li>
        <li>
          New challenge page to view past games
          <img
            className="tester-modal__image"
            src={sThreeImg}
            alt="Menu with an arrow pointing to the Challenges link"
          />
          <br />
          <hr />
          <br />
          <img
            className="tester-modal__image"
            src={sFourImg}
            alt="Challenges page with the record and a completed challenge expanded to its game summary"
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
