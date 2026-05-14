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

  useEffect(() => {
    let cancelled = false;
    apiFetch('/api/admin/users')
      .then((data) => { if (!cancelled) setUsers(data.users); })
      .catch((err) => { if (!cancelled) setError(err.message); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
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

  return (
    <div className="admin__section">
      <h3 className="admin__section-title">Users ({users.length})</h3>
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
            {users.map((u) => (
              <tr key={u.id}>
                <td>{u.username || <span className="admin__muted">(none)</span>}</td>
                <td>{u.email}</td>
                <td>
                  <select
                    value={u.role}
                    disabled={savingId === u.id}
                    onChange={(e) => changeRole(u.id, e.target.value)}
                    className="admin__role-select"
                  >
                    {ROLE_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
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
