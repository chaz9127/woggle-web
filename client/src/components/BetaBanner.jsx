import { useState } from 'react';

const DISMISS_KEY = 'woggle-challenge-beta-dismissed';

function isDismissed() {
  try {
    return localStorage.getItem(DISMISS_KEY) === '1';
  } catch {
    return false;
  }
}

// Shown on the homepage Challenge tab and every challenge screen until the
// player dismisses it; the dismissal is remembered on this device.
export default function BetaBanner() {
  const [hidden, setHidden] = useState(isDismissed);
  if (hidden) return null;

  const dismiss = () => {
    try {
      localStorage.setItem(DISMISS_KEY, '1');
    } catch {
      // storage unavailable: hide for this visit only
    }
    setHidden(true);
  };

  return (
    <div className="beta-banner" role="note">
      <span>
        <strong>Challenge mode is in beta.</strong> Things may change or reset
        while we test it.
      </span>
      <button
        type="button"
        className="beta-banner__close"
        onClick={dismiss}
        aria-label="Dismiss beta notice"
      >
        ×
      </button>
    </div>
  );
}
