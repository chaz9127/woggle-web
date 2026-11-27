import { useEffect, useState } from 'react';

const ROLE_OPTIONS = [
  { value: 'user', label: 'User' },
  { value: 'tester', label: 'Tester' },
  { value: 'admin', label: 'Admin' },
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

export default function AdminUsers() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [savingId, setSavingId] = useState(null);
  const [query, setQuery] = useState('');

  useEffect(() => {
    let cancelled = false;
    apiFetch('/api/admin/users')
      .then((data) => {
        if (!cancelled) setUsers(data.users);
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
  }, []);

  const changeRole = async (id, role) => {
    setSavingId(id);
    const prev = users;
    setUsers((list) => list.map((u) => (u.id === id ? { ...u, role } : u)));
    try {
      await apiFetch(`/api/admin/users/${id}/role`, {
        method: 'PATCH',
        body: JSON.stringify({ role }),
      });
    } catch (err) {
      setUsers(prev);
      setError(err.message);
    } finally {
      setSavingId(null);
    }
  };

  if (loading) return <p className="admin__empty">Loading users…</p>;
  if (error) return <p className="admin__error">{error}</p>;

  // Case-insensitive match on username or email, filtered in the browser.
  const term = query.trim().toLowerCase();
  const shown = term
    ? users.filter(
        (u) =>
          (u.username || '').toLowerCase().includes(term) ||
          (u.email || '').toLowerCase().includes(term)
      )
    : users;

  return (
    <div className="admin__section">
      <h3 className="admin__section-title">
        Users ({term ? `${shown.length} of ${users.length}` : users.length})
      </h3>
      <input
        type="search"
        className="admin__search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search username or email"
        aria-label="Search users by username or email"
      />
      {term && shown.length === 0 && (
        <p className="admin__empty">No users match “{query.trim()}”.</p>
      )}
      <div className="admin__table-wrap">
        <table className="admin__table">
          <thead>
            <tr>
              <th>Username</th>
              <th>Email</th>
              <th>Role</th>
            </tr>
          </thead>
          <tbody>
            {shown.map((u) => (
              <tr key={u.id}>
                <td>
                  {u.username || <span className="admin__muted">(none)</span>}
                </td>
                <td>{u.email}</td>
                <td>
                  <select
                    value={u.role}
                    disabled={savingId === u.id}
                    onChange={(e) => changeRole(u.id, e.target.value)}
                    className="admin__role-select"
                  >
                    {ROLE_OPTIONS.map((opt) => (
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
    </div>
  );
}
