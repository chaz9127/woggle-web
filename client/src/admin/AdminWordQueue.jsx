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

// A reviewable list of words with a pending/approved/denied status. Shared by
// the word-suggestion and word-removal admin pages, which differ only in
// endpoint, labels and what approving/denying does to the words list.
export default function AdminWordQueue({
  endpoint,
  listKey,
  title,
  submittedByLabel,
  emptyText,
  confirmText,
  onPendingCountChange,
}) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [savingWord, setSavingWord] = useState(null);
  const [statusFilter, setStatusFilter] = useState('all');

  useEffect(() => {
    let cancelled = false;
    apiFetch(endpoint)
      .then((data) => {
        if (!cancelled) setItems(data[listKey]);
      })
      .catch((err) => {
        if (!cancelled) setError(err.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [endpoint, listKey]);

  useEffect(() => {
    if (onPendingCountChange) {
      onPendingCountChange(items.filter((s) => s.status === 'pending').length);
    }
  }, [items, onPendingCountChange]);

  const changeStatus = async (word, status) => {
    const message = confirmText[status]?.(word.toUpperCase());
    if (message && !window.confirm(message)) return;
    setSavingWord(word);
    const prev = items;
    setItems((list) =>
      list.map((s) => (s.word === word ? { ...s, status } : s))
    );
    try {
      await apiFetch(`${endpoint}/${encodeURIComponent(word)}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      });
    } catch (err) {
      setItems(prev);
      setError(err.message);
    } finally {
      setSavingWord(null);
    }
  };

  if (loading) return <p className="admin__empty">Loading…</p>;
  if (error) return <p className="admin__error">{error}</p>;

  const visible =
    statusFilter === 'all'
      ? items
      : items.filter((s) => s.status === statusFilter);

  return (
    <div className="admin__section">
      <h3 className="admin__section-title">
        {title} ({visible.length}
        {statusFilter !== 'all' ? ` of ${items.length}` : ''})
      </h3>
      {items.length === 0 ? (
        <p className="admin__empty">{emptyText}</p>
      ) : (
        <div className="admin__table-wrap">
          <table className="admin__table">
            <thead>
              <tr>
                <th>Word</th>
                <th>{submittedByLabel}</th>
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
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </th>
              </tr>
            </thead>
            <tbody>
              {visible.length === 0 && (
                <tr>
                  <td colSpan={4} className="admin__empty">
                    Nothing matches this filter.
                  </td>
                </tr>
              )}
              {visible.map((s) => (
                <tr key={s.word}>
                  <td>
                    <strong>{s.word.toUpperCase()}</strong>
                  </td>
                  <td className="admin__muted">{s.user_email || '—'}</td>
                  <td className="admin__muted">{s.created_at}</td>
                  <td>
                    <select
                      value={s.status}
                      disabled={savingWord === s.word}
                      onChange={(e) => changeStatus(s.word, e.target.value)}
                      className={`admin__role-select admin__status-select admin__status-select--${s.status}`}
                    >
                      {STATUS_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
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
