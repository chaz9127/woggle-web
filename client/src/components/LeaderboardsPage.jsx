import { useEffect, useState } from 'react';
import { todayDateString } from '../utils/random';
import { usePageTitle } from '../hooks/usePageTitle';
import { useAuth } from '../auth/AuthContext';

async function apiFetch(path) {
  const res = await fetch(path, { credentials: 'include' });
  if (!res.ok) throw new Error('Failed');
  return res.json();
}

export default function LeaderboardsPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const today = todayDateString();

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('today');
  const [date, setDate] = useState(today);

  usePageTitle('Leaderboard');

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    apiFetch(`/api/games/leaderboard?date=${date}`)
      .then((d) => {
        if (!cancelled) setData(d);
      })
      .catch(() => {
        if (!cancelled) setData(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [date]);

  const viewingToday = date === today;

  const rows = !data ? [] : tab === 'today' ? data.today : data.allTime;

  return (
    <div className="leaderboards">
      <h2 className="leaderboards__title">Leaderboards</h2>
      <p className="leaderboards__disclaimer">
        You must create an account to be included on the leaderboards.
      </p>

      {isAdmin && tab === 'today' && (
        <div className="leaderboards__admin-date">
          <input
            type="date"
            value={date}
            max={today}
            onChange={(e) => setDate(e.target.value || today)}
          />
          {!viewingToday && (
            <button
              type="button"
              className="btn btn--ghost btn--inline"
              onClick={() => setDate(today)}
            >
              Back to today
            </button>
          )}
        </div>
      )}

      <section className="leaderboards__panel">
        {loading ? (
          <p className="stats__empty">Loading…</p>
        ) : !data || rows.length === 0 ? (
          <p className="stats__empty">
            {tab === 'today'
              ? viewingToday
                ? 'No games today yet.'
                : 'No games on this date.'
              : 'No games yet.'}

            <div className="leaderboards__tabs" role="tablist">
              <button
                type="button"
                role="tab"
                aria-selected={tab === 'today'}
                className={`leaderboards__tab ${tab === 'today' ? 'leaderboards__tab--active' : ''}`}
                onClick={() => setTab('today')}
              >
                {viewingToday ? 'Today' : 'Daily'}{' '}
                {data?.todayDate ? `(${data.todayDate})` : ''}
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
