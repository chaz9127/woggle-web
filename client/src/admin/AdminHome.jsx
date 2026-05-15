import { useEffect, useState } from 'react';
import { todayDateString } from '../utils/random';

function StatCard({ label, value, sub }) {
  return (
    <div className="stat-card">
      <div className="stat-card__label">{label}</div>
      <div className="stat-card__value">{value}</div>
      {sub && <div className="stat-card__sub">{sub}</div>}
    </div>
  );
}

export default function AdminHome() {
  const [stats, setStats] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/admin/stats?date=${todayDateString()}`, { credentials: 'include' })
      .then((res) => res.json().then((data) => ({ ok: res.ok, data })))
      .then(({ ok, data }) => {
        if (cancelled) return;
        if (!ok) setError(data?.error || 'Failed to load stats');
        else setStats(data);
      })
      .catch((err) => { if (!cancelled) setError(err.message); });
    return () => { cancelled = true; };
  }, []);

  if (error) return <p className="admin__error">{error}</p>;
  if (!stats) return <p className="admin__empty">Loading stats…</p>;

  return (
    <div className="admin__section">
      <div className="admin__dashboard-header">
        <h3 className="admin__section-title">Overview</h3>
        <span className="admin__muted">{stats.todayDate}</span>
      </div>
      <div className="stat-grid">
        <StatCard
          label="Total games completed"
          value={stats.totalGames.toLocaleString()}
        />
        <StatCard
          label="Words in dictionary"
          value={stats.totalWords.toLocaleString()}
        />
        <StatCard
          label="Lifetime high score"
          value={stats.lifetimeHigh ? stats.lifetimeHigh.score.toLocaleString() : '—'}
          sub={
            stats.lifetimeHigh
              ? `${stats.lifetimeHigh.username} · ${stats.lifetimeHigh.gameDate}`
              : 'No games yet'
          }
        />
        <StatCard
          label="Today's high score"
          value={stats.todayHigh ? stats.todayHigh.score.toLocaleString() : '—'}
          sub={stats.todayHigh ? stats.todayHigh.username : 'No games today'}
        />
      </div>
    </div>
  );
}
