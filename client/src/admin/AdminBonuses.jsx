import { useEffect, useState } from 'react';
import { todayDateString } from '../utils/random';

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

function tomorrowDateString() {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return todayDateString(d);
}

const EMPTY_FORM = () => ({
  email: '',
  points: '20',
  activeFrom: tomorrowDateString(),
  title: '',
  message: '',
});

export default function AdminBonuses() {
  const [bonuses, setBonuses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [form, setForm] = useState(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [notice, setNotice] = useState('');

  const load = () => {
    setLoading(true);
    apiFetch('/api/admin/bonuses')
      .then((data) => setBonuses(data.bonuses || []))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  const setField = (key) => (e) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setNotice('');
    setSubmitting(true);
    try {
      await apiFetch('/api/admin/bonuses', {
        method: 'POST',
        body: JSON.stringify({
          email: form.email.trim(),
          points: Number(form.points),
          activeFrom: form.activeFrom,
          title: form.title.trim(),
          message: form.message.trim(),
        }),
      });
      setNotice(`Bonus granted to ${form.email.trim()}.`);
      setForm(EMPTY_FORM());
      load();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const revoke = async (id) => {
    setError('');
    setNotice('');
    try {
      await apiFetch(`/api/admin/bonuses/${id}`, { method: 'DELETE' });
      setBonuses((list) => list.filter((b) => b.id !== id));
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="admin__section">
      <h3 className="admin__section-title">Grant a one-time bonus</h3>
      <form className="admin__bonus-form" onSubmit={submit}>
        <label className="admin__bonus-field">
          <span>User email</span>
          <input
            type="email"
            value={form.email}
            onChange={setField('email')}
            placeholder="player@example.com"
            required
          />
        </label>
        <div className="admin__bonus-row">
          <label className="admin__bonus-field">
            <span>Points</span>
            <input
              type="number"
              min="1"
              max="1000"
              value={form.points}
              onChange={setField('points')}
              required
            />
          </label>
          <label className="admin__bonus-field">
            <span>Active from</span>
            <input
              type="date"
              value={form.activeFrom}
              onChange={setField('activeFrom')}
              required
            />
          </label>
        </div>
        <label className="admin__bonus-field">
          <span>Title</span>
          <input
            type="text"
            maxLength={80}
            value={form.title}
            onChange={setField('title')}
            placeholder="Happy Father's Day! 🎉"
            required
          />
        </label>
        <label className="admin__bonus-field">
          <span>Message</span>
          <input
            type="text"
            maxLength={280}
            value={form.message}
            onChange={setField('message')}
            placeholder="Here's 20 points on us!"
            required
          />
        </label>
        <p className="admin__muted">
          Redeemed the first time the user finishes a game on or after the active
          date, then consumed.
        </p>
        <button
          type="submit"
          className="btn btn--primary"
          disabled={submitting}
        >
          {submitting ? 'Granting…' : 'Grant bonus'}
        </button>
        {notice && <p className="admin__notice">{notice}</p>}
        {error && <p className="admin__error">{error}</p>}
      </form>

      <h3 className="admin__section-title">Granted bonuses ({bonuses.length})</h3>
      {loading ? (
        <p className="admin__empty">Loading bonuses…</p>
      ) : bonuses.length === 0 ? (
        <p className="admin__empty">No bonuses granted yet.</p>
      ) : (
        <div className="admin__table-wrap">
          <table className="admin__table">
            <thead>
              <tr>
                <th>User</th>
                <th>Points</th>
                <th>Active from</th>
                <th>Title</th>
                <th>Status</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {bonuses.map((b) => (
                <tr key={b.id}>
                  <td>{b.user_username || b.user_email}</td>
                  <td>+{b.points}</td>
                  <td>{b.active_from}</td>
                  <td>{b.title}</td>
                  <td>
                    {b.claimed_at ? (
                      <span className="admin__muted">
                        Claimed {b.claimed_game_date || ''}
                      </span>
                    ) : (
                      'Pending'
                    )}
                  </td>
                  <td>
                    {!b.claimed_at && (
                      <button
                        type="button"
                        className="btn btn--ghost btn--inline"
                        onClick={() => revoke(b.id)}
                      >
                        Revoke
                      </button>
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
