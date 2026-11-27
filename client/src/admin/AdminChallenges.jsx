import { useEffect, useState } from 'react';
import StatCard from './StatCard';

const pct = (n, total) => (total ? `${Math.round((n / total) * 100)}%` : '—');

const STATUS_LABEL = {
  waiting: 'Waiting for opponent',
  in_progress: 'In progress',
  completed: 'Completed',
  retracted: 'Retracted',
  rejected: 'Rejected',
};

// created_at is stored as UTC "YYYY-MM-DD HH:MM:SS"; show it in local time.
function formatCreated(str) {
  const d = new Date(str.replace(' ', 'T') + 'Z');
  return Number.isNaN(d.getTime()) ? str : d.toLocaleString();
}

// Extra detail for the status column: who has played, or the final result.
function statusDetail(c) {
  if (c.status === 'completed' && c.result) {
    const score = `${c.result.creatorScore}–${c.result.opponentScore}`;
    return c.result.winner ? `${c.result.winner} won ${score}` : `Tie ${score}`;
  }
  if (c.status === 'waiting' || c.status === 'in_progress') {
    const played = [
      c.creatorFinished && c.creator,
      c.opponentFinished && c.opponent,
    ].filter(Boolean);
    return played.length ? `${played.join(', ')} played` : 'Nobody has played';
  }
  return '';
}

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

  const { total, completed, retracted, rejected, open, recent = [] } = counts;
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

      <h3 className="admin__section-title admin__subsection">
        Latest {recent.length} challenges
      </h3>
      {recent.length === 0 ? (
        <p className="admin__empty">No challenges yet.</p>
      ) : (
        <div className="admin__table-wrap">
          <table className="admin__table">
            <thead>
              <tr>
                <th>Code</th>
                <th>Created</th>
                <th>Creator</th>
                <th>Opponent</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {recent.map((c) => (
                <tr key={c.code}>
                  <td>
                    <code>{c.code}</code>
                  </td>
                  <td>{formatCreated(c.createdAt)}</td>
                  <td>
                    {c.creator || <span className="admin__muted">—</span>}
                  </td>
                  <td>
                    {c.opponent || <span className="admin__muted">—</span>}
                  </td>
                  <td>
                    {STATUS_LABEL[c.status] || c.status}
                    {statusDetail(c) && (
                      <div className="admin__muted">{statusDetail(c)}</div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
