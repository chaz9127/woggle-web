import { useState, useLayoutEffect, useRef } from 'react';
import { X } from 'lucide-react';
import { isTooltipDismissed, dismissTooltip } from '../utils/cookies';

// Renders a "new feature" tooltip that anchors itself (fixed-positioned) beneath
// the element whose id matches `config.targetId`. Visibility is driven by
// `config.show` and by whether the target element exists. The X button
// permanently dismisses it via a cookie keyed on `config.name`.
export default function FeatureTooltip({ config, context = {} }) {
  const [dismissed, setDismissed] = useState(() =>
    isTooltipDismissed(config.name)
  );
  const [pos, setPos] = useState(null);
  const ref = useRef(null);

  const visible = config.show({ ...context, dismissed });

  useLayoutEffect(() => {
    if (!visible) return undefined;
    const update = () => {
      const target = document.getElementById(config.targetId);
      const el = ref.current;
      if (!target || !el) {
        setPos(null);
        return;
      }
      const r = target.getBoundingClientRect();
      const tipW = el.offsetWidth || 240;
      const margin = 8;
      const center = r.left + r.width / 2;
      const left = Math.max(
        margin,
        Math.min(center - tipW / 2, window.innerWidth - tipW - margin)
      );
      const caret = Math.max(14, Math.min(center - left, tipW - 14));
      setPos({ top: r.bottom + 10, left, caret });
    };
    update();
    window.addEventListener('resize', update);
    window.addEventListener('scroll', update, true);
    return () => {
      window.removeEventListener('resize', update);
      window.removeEventListener('scroll', update, true);
    };
  }, [visible, config.targetId]);

  if (!visible) return null;

  const handleClose = () => {
    dismissTooltip(config.name);
    setDismissed(true);
  };

  return (
    <div
      ref={ref}
      className="feature-tooltip"
      id={config.name}
      role="status"
      style={
        pos
          ? { top: pos.top, left: pos.left, '--caret-left': `${pos.caret}px` }
          : { visibility: 'hidden' }
      }
    >
      <button
        type="button"
        className="feature-tooltip__close"
        onClick={handleClose}
        aria-label="Dismiss"
        title="Dismiss"
      >
        <X size={14} aria-hidden="true" />
      </button>
      <strong className="feature-tooltip__title">{config.title}</strong>
      <p className="feature-tooltip__body">{config.body}</p>
    </div>
  );
}
