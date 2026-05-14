import { useEffect, useState } from 'react';

const STATUS_OPTIONS = [
  { value: 'pending', label: 'Pending' },
  { value: 'approved', label: 'Approved' },
  { value: 'denied', label: 'Denied' },
];

async function apiFetch(path, opts = {}) {
  const res = await fetch(path, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...(opts.headers || {}) },
    ...opts,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data?.error || `Request failed (${res.status})`);
    err.status = res.status;
    throw err;
  }
  return data;
}

export default function AdminWordSuggestions() {
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [savingWord, setSavingWord] = useState(null);
  const [statusFilter, setStatusFilter] = useState('all');

  useEffect(() => {
    let cancelled = false;
    apiFetch('/api/admin/word-suggestions')
      .then((data) => { if (!cancelled) setSuggestions(data.suggestions); })
      .catch((err) => { if (!cancelled) setError(err.message); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  const changeStatus = async (word, status) => {
    setSavingWord(word);
    const prev = suggestions;
    setSuggestions((list) =>
      list.map((s) => (s.word === word ? { ...s, status } : s))
    );
    try {
      await apiFetch(`/api/admin/word-suggestions/${encodeURIComponent(word)}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      });
    } catch (err) {
      setSuggestions(prev);
      setError(err.message);
    } finally {
      setSavingWord(null);
    }
  };

  if (loading) return <p className="admin__empty">Loading suggestions…</p>;
  if (error) return <p className="admin__error">{error}</p>;

  const visible = statusFilter === 'all'
    ? suggestions
    : suggestions.filter((s) => s.status === statusFilter);

  return (
    <div className="admin__section">
      <h3 className="admin__section-title">
        Word suggestions ({visible.length}{statusFilter !== 'all' ? ` of ${suggestions.length}` : ''})
      </h3>
      {suggestions.length === 0 ? (
        <p className="admin__empty">No suggestions yet.</p>
      ) : (
        <div className="admin__table-wrap">
          <table className="admin__table">
            <thead>
              <tr>
                <th>Word</th>
                <th>Submitted</th>
                <th>
                  <div className="admin__th-filter">
                    <span>Status</span>
                    <select
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value)}
                      className="admin__filter-select"
                    >
                      <option value="all">All</option>
                      {STATUS_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                  </div>
                </th>
              </tr>
            </thead>
            <tbody>
              {visible.length === 0 && (
                <tr><td colSpan={3} className="admin__empty">No suggestions match this filter.</td></tr>
              )}
              {visible.map((s) => (
                <tr key={s.word}>
                  <td><strong>{s.word.toUpperCase()}</strong></td>
                  <td className="admin__muted">{s.created_at}</td>
                  <td>
                    <select
                      value={s.status}
                      disabled={savingWord === s.word}
                      onChange={(e) => changeStatus(s.word, e.target.value)}
                      className={`admin__role-select admin__status-select admin__status-select--${s.status}`}
                    >
                      {STATUS_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
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
