import { useEffect, useState } from 'react';

async function apiFetch(path) {
  const res = await fetch(path, { credentials: 'include' });
  if (!res.ok) throw new Error('Failed');
  return res.json();
}

export default function LeaderboardsPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('today');

  useEffect(() => {
    let cancelled = false;
    apiFetch('/api/games/leaderboard')
      .then((d) => { if (!cancelled) setData(d); })
      .catch(() => { if (!cancelled) setData(null); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  const rows = !data
    ? []
    : tab === 'today'
      ? data.today
      : data.allTime;

  return (
    <div className="leaderboards">
      <h2 className="leaderboards__title">Leaderboards</h2>
      <p className="leaderboards__disclaimer">
        You must create an account to be included on the leaderboards.
      </p>

      <div className="leaderboards__tabs" role="tablist">
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'today'}
          className={`leaderboards__tab ${tab === 'today' ? 'leaderboards__tab--active' : ''}`}
          onClick={() => setTab('today')}
        >
          Today {data?.todayDate ? `(${data.todayDate})` : ''}
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'all-time'}
          className={`leaderboards__tab ${tab === 'all-time' ? 'leaderboards__tab--active' : ''}`}
          onClick={() => setTab('all-time')}
        >
          All-Time
        </button>
      </div>

      <section className="leaderboards__panel">
        {loading ? (
          <p className="stats__empty">Loading…</p>
        ) : !data || rows.length === 0 ? (
          <p className="stats__empty">
            {tab === 'today' ? 'No games today yet.' : 'No games yet.'}
          </p>
        ) : (
          <ol className="leaderboard__list">
            {rows.map((row, i) => (
              <li key={i} className="leaderboard__row">
                <span className="leaderboard__rank">{i + 1}</span>
                <span className="leaderboard__name">{row.username}</span>
                {tab === 'all-time' && (
                  <span className="leaderboard__date">{row.gameDate}</span>
                )}
                <span className="leaderboard__score">{row.score}</span>
              </li>
            ))}
          </ol>
        )}
      </section>
    </div>
  );
}
