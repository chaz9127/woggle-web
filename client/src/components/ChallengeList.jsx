import { useId, useState } from 'react';
import ChallengeResults from './ChallengeResults';
import { challengePath, challengesApi } from '../utils/challengesApi';

const OUTCOME_CLASS = {
  win: 'challenge-list__item--win',
  loss: 'challenge-list__item--loss',
};

function itemClass(c, unseen) {
  return [
    'challenge-list__item',
    OUTCOME_CLASS[c.outcome],
    unseen && 'challenge-list__item--unseen',
  ]
    .filter(Boolean)
    .join(' ');
}

function ItemText({ c, unseen }) {
  return (
    <>
      <span className="challenge-list__code">{c.code}</span>
      <span className="challenge-list__status">
        {unseen && (
          <>
            <span className="dot" aria-hidden="true" />
            <span className="visually-hidden">New result: </span>
          </>
        )}
        {c.opponent ? `vs ${c.opponent} · ` : ''}
        {c.label}
      </span>
    </>
  );
}

// A completed challenge whose game summary opens in place. The summary is
// fetched the first time it's opened, and opening an unseen result clears
// its dot, just like visiting the challenge page does.
function ExpandableResult({ c, onSeen }) {
  const panelId = useId();
  const [open, setOpen] = useState(false);
  const [view, setView] = useState(null);
  const [error, setError] = useState('');
  const [unseen, setUnseen] = useState(c.unseen);

  const toggle = async () => {
    const next = !open;
    setOpen(next);
    if (!next || view) return;
    setError('');
    const { ok, data } = await challengesApi.get(c.code);
    if (!ok || !data?.results) {
      setError('Could not load this game summary.');
      return;
    }
    setView(data);
    if (data.unseen) {
      setUnseen(false);
      challengesApi.seen(c.code).then(() => onSeen?.());
    }
  };

  return (
    <li>
      <button
        type="button"
        className={`${itemClass(c, unseen)} challenge-list__item--expandable`}
        aria-expanded={open}
        aria-controls={panelId}
        onClick={toggle}
      >
        <span className="challenge-list__chevron" aria-hidden="true">
          {open ? '▾' : '▸'}
        </span>
        <ItemText c={c} unseen={unseen} />
      </button>
      {open && (
        <div id={panelId} className="challenge-list__panel">
          {error ? (
            <p className="challenge-home__error">{error}</p>
          ) : view ? (
            <>
              <ChallengeResults view={view} embedded />
              <a href={challengePath(c.code)} className="challenge-list__open">
                Open challenge page →
              </a>
            </>
          ) : (
            <p className="challenge-list__empty">Loading…</p>
          )}
        </div>
      )}
    </li>
  );
}

function Items({ items, onOpen, expandResults, onSeen }) {
  return (
    <ul className="challenge-list__items">
      {items.map((c) =>
        expandResults && c.status === 'completed' ? (
          <ExpandableResult key={c.code} c={c} onSeen={onSeen} />
        ) : (
          <li key={c.code}>
            <a
              href={challengePath(c.code)}
              className={itemClass(c, c.unseen)}
              onClick={onOpen}
            >
              <ItemText c={c} unseen={c.unseen} />
            </a>
          </li>
        )
      )}
    </ul>
  );
}

// The player's challenges, grouped by state. Live challenges link to their
// page. Completed challenges sit in a collapsible group (open automatically
// when there's a new result); with `expandResults` each one opens its game
// summary in place instead of linking away. `maxCompleted` caps the group.
export default function ChallengeList({
  groups,
  maxCompleted = 5,
  onOpen,
  expandResults = false,
  // false = Completed is a plain, always-open group (the Challenges page).
  collapsibleCompleted = true,
  onSeen,
}) {
  const completedId = useId();
  const waiting = groups?.waiting || [];
  const inProgress = groups?.inProgress || [];
  const completed = (groups?.completed || []).slice(0, maxCompleted);
  const unseenCompleted = completed.filter((c) => c.unseen).length;
  // null = automatic: open only when there's a new result to see.
  const [completedOpen, setCompletedOpen] = useState(null);
  const showCompleted =
    !collapsibleCompleted || (completedOpen ?? unseenCompleted > 0);
  const itemProps = { onOpen, expandResults, onSeen };

  if (!waiting.length && !inProgress.length && !completed.length) {
    return <p className="challenge-list__empty">No challenges yet.</p>;
  }

  return (
    <div className="challenge-list">
      {waiting.length > 0 && (
        <section className="challenge-list__group">
          <h4 className="challenge-list__title">Waiting on opponent</h4>
          <Items items={waiting} {...itemProps} />
        </section>
      )}
      {inProgress.length > 0 && (
        <section className="challenge-list__group">
          <h4 className="challenge-list__title">In progress</h4>
          <Items items={inProgress} {...itemProps} />
        </section>
      )}
      {completed.length > 0 && (
        <section className="challenge-list__group">
          <h4 className="challenge-list__title">
            {collapsibleCompleted ? (
              <button
                type="button"
                className="challenge-list__toggle"
                aria-expanded={showCompleted}
                aria-controls={completedId}
                onClick={() => setCompletedOpen(!showCompleted)}
              >
                <span aria-hidden="true">{showCompleted ? '▾' : '▸'}</span>
                Completed ({completed.length})
                {!showCompleted && unseenCompleted > 0 && (
                  <>
                    <span className="dot" aria-hidden="true" />
                    <span className="visually-hidden">
                      , {unseenCompleted} with new results
                    </span>
                  </>
                )}
              </button>
            ) : (
              `Completed (${completed.length})`
            )}
          </h4>
          {showCompleted && (
            <div id={completedId}>
              <Items items={completed} {...itemProps} />
            </div>
          )}
        </section>
      )}
    </div>
  );
}
