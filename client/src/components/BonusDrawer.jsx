import { useEffect, useState } from 'react';

// Top-down drawer that announces a one-time score bonus the player just earned.
// Slides in from the top, auto-dismisses after a few seconds, and can be closed
// manually. `bonus` is { points, title, message } or null when nothing to show.
export default function BonusDrawer({ bonus, onClose }) {
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    if (!bonus) return;
    setLeaving(false);
    const hide = setTimeout(() => setLeaving(true), 6000);
    const close = setTimeout(() => onClose?.(), 6300);
    return () => {
      clearTimeout(hide);
      clearTimeout(close);
    };
  }, [bonus, onClose]);

  if (!bonus) return null;

  const dismiss = () => {
    setLeaving(true);
    setTimeout(() => onClose?.(), 300);
  };

  return (
    <div className={`bonus-drawer ${leaving ? 'bonus-drawer--leaving' : ''}`}>
      <div className="bonus-drawer__inner">
        <span className="bonus-drawer__emoji" aria-hidden="true">
          🎉
        </span>
        <div className="bonus-drawer__text">
          <strong className="bonus-drawer__title">{bonus.title}</strong>
          <span className="bonus-drawer__message">{bonus.message}</span>
        </div>
        <span className="bonus-drawer__points">+{bonus.points}</span>
        <button
          type="button"
          className="bonus-drawer__close"
          onClick={dismiss}
          aria-label="Dismiss"
        >
          ×
        </button>
      </div>
    </div>
  );
}
