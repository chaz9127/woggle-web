import { useEffect, useState } from 'react';
import Modal from './Modal';

async function apiFetch(path) {
  const res = await fetch(path, { credentials: 'include' });
  if (!res.ok) throw new Error('Failed');
  return res.json();
}

export default function StatsModal({ open, onClose }) {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoading(true);
    apiFetch('/api/games/me')
      .then((data) => { if (!cancelled) setStats(data.stats); })
      .catch(() => { if (!cancelled) setStats(null); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [open]);

  return (
    <Modal open={open} title="Stats" onClose={onClose}>
      {loading || !stats ? (
        <p className="stats__empty">{loading ? 'Loading…' : 'No stats yet.'}</p>
      ) : (
        <div className="stats">
          <div className="stats__cell">
            <span>Total games</span>
            <strong>{stats.totalGames}</strong>
          </div>
          <div className="stats__cell">
            <span>Current streak</span>
            <strong>{stats.currentStreak}</strong>
          </div>
          <div className="stats__cell">
            <span>Longest streak</span>
            <strong>{stats.longestStreak}</strong>
          </div>
          <div className="stats__cell">
            <span>Highest score</span>
            <strong>{stats.highestGameScore}</strong>
          </div>
          <div className="stats__cell stats__cell--wide">
            <span>Best word</span>
            <strong>
              {stats.highestWord
                ? `${stats.highestWord.toUpperCase()} · ${stats.highestWordScore} ${stats.highestWordScore === 1 ? 'pt' : 'pts'}`
                : '—'}
            </strong>
          </div>
        </div>
      )}
    </Modal>
  );
}
