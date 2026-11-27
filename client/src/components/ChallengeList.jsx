import { challengePath } from '../utils/challengesApi';

const GROUPS = [
  { key: 'waiting', title: 'Waiting on opponent' },
  { key: 'inProgress', title: 'In progress' },
  { key: 'completed', title: 'Completed' },
];

// The player's challenges, grouped by state, each linking to its page. Used
// by the header dropdown and the homepage Challenge tab. `maxCompleted` keeps
// old results from crowding out live challenges.
export default function ChallengeList({ groups, maxCompleted = 5, onOpen }) {
  const visible = GROUPS.map((g) => ({
    ...g,
    items:
      g.key === 'completed'
        ? (groups?.[g.key] || []).slice(0, maxCompleted)
        : groups?.[g.key] || [],
  })).filter((g) => g.items.length > 0);

  if (visible.length === 0) {
    return <p className="challenge-list__empty">No challenges yet.</p>;
  }

  return (
    <div className="challenge-list">
      {visible.map((g) => (
        <section key={g.key} className="challenge-list__group">
          <h4 className="challenge-list__title">{g.title}</h4>
          <ul className="challenge-list__items">
            {g.items.map((c) => (
              <li key={c.code}>
                <a
                  href={challengePath(c.code)}
                  className={`challenge-list__item ${c.unseen ? 'challenge-list__item--unseen' : ''}`}
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
        </section>
      ))}
    </div>
  );
}
