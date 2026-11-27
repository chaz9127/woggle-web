import { useId, useState } from 'react';
import { challengePath } from '../utils/challengesApi';

const OUTCOME_CLASS = {
  win: 'challenge-list__item--win',
  loss: 'challenge-list__item--loss',
};

function Record({ record }) {
  if (!record) return null;
  const { wins, losses, draws } = record;
  if (wins + losses + draws === 0) return null;
  return (
    <div className="challenge-record">
      <span className="challenge-record__label">Record</span>
      <span className="challenge-record__stat challenge-record__stat--win">
        <strong>{wins}</strong> W
      </span>
      <span className="challenge-record__stat challenge-record__stat--loss">
        <strong>{losses}</strong> L
      </span>
      <span className="challenge-record__stat">
        <strong>{draws}</strong> D
      </span>
    </div>
  );
}

function Items({ items, onOpen }) {
  return (
    <ul className="challenge-list__items">
      {items.map((c) => (
        <li key={c.code}>
          <a
            href={challengePath(c.code)}
            className={[
              'challenge-list__item',
              OUTCOME_CLASS[c.outcome],
              c.unseen && 'challenge-list__item--unseen',
            ]
              .filter(Boolean)
              .join(' ')}
            onClick={onOpen}
          >
            <span className="challenge-list__code">{c.code}</span>
            <span className="challenge-list__status">
              {c.unseen && (
                <>
                  <span className="dot" aria-hidden="true" />
                  <span className="visually-hidden">New result: </span>
                </>
              )}
              {c.opponent ? `vs ${c.opponent} · ` : ''}
              {c.label}
            </span>
          </a>
        </li>
      ))}
    </ul>
  );
}

// The player's challenges, grouped by state, each linking to its page, with
// their overall win/loss/draw record on top. Used by the header dropdown and
// the homepage Challenge tab. Completed challenges collapse so old results
// don't crowd out live ones; `maxCompleted` caps how many are shown.
export default function ChallengeList({ groups, maxCompleted = 5, onOpen }) {
  const completedId = useId();
  const waiting = groups?.waiting || [];
  const inProgress = groups?.inProgress || [];
  const completed = (groups?.completed || []).slice(0, maxCompleted);
  const unseenCompleted = completed.filter((c) => c.unseen).length;
  // null = automatic: open only when there's a new result to see.
  const [completedOpen, setCompletedOpen] = useState(null);
  const showCompleted = completedOpen ?? unseenCompleted > 0;

  if (!waiting.length && !inProgress.length && !completed.length) {
    return <p className="challenge-list__empty">No challenges yet.</p>;
  }

  return (
    <div className="challenge-list">
      <Record record={groups?.record} />
      {waiting.length > 0 && (
        <section className="challenge-list__group">
          <h4 className="challenge-list__title">Waiting on opponent</h4>
          <Items items={waiting} onOpen={onOpen} />
        </section>
      )}
      {inProgress.length > 0 && (
        <section className="challenge-list__group">
          <h4 className="challenge-list__title">In progress</h4>
          <Items items={inProgress} onOpen={onOpen} />
        </section>
      )}
      {completed.length > 0 && (
        <section className="challenge-list__group">
          <h4 className="challenge-list__title">
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
          </h4>
          {showCompleted && (
            <div id={completedId}>
              <Items items={completed} onOpen={onOpen} />
            </div>
          )}
        </section>
      )}
    </div>
  );
}
