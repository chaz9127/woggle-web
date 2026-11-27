import { useEffect, useState } from 'react';
import StatCard from './StatCard';

const pct = (n, total) => (total ? `${Math.round((n / total) * 100)}%` : '—');

export default function AdminChallenges() {
  const [counts, setCounts] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    fetch('/api/admin/challenges', { credentials: 'include' })
      .then((res) => res.json().then((data) => ({ ok: res.ok, data })))
      .then(({ ok, data }) => {
        if (cancelled) return;
        if (!ok) setError(data?.error || 'Failed to load challenge stats');
        else setCounts(data);
      })
      .catch((err) => {
        if (!cancelled) setError(err.message);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (error) return <p className="admin__error">{error}</p>;
  if (!counts) return <p className="admin__empty">Loading challenges…</p>;

  const { total, completed, retracted, rejected, open } = counts;
  return (
    <div className="admin__section">
      <div className="admin__dashboard-header">
        <h3 className="admin__section-title">Challenges</h3>
      </div>
      <div className="stat-grid">
        <StatCard
          label="Total challenges"
          value={total.toLocaleString()}
          sub={`${open.toLocaleString()} still open`}
        />
        <StatCard
          label="Completed"
          value={completed.toLocaleString()}
          sub={`${pct(completed, total)} of total`}
        />
        <StatCard
          label="Retracted"
          value={retracted.toLocaleString()}
          sub={`${pct(retracted, total)} of total`}
        />
        <StatCard
          label="Rejected"
          value={rejected.toLocaleString()}
          sub={`${pct(rejected, total)} of total`}
        />
      </div>
    </div>
  );
}
