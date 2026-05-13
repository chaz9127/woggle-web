import { useState } from 'react';
import { useAuth } from './AuthContext';

export default function ChooseUsername() {
  const { user, setUsername, logout } = useAuth();
  const [value, setValue] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      await setUsername(value);
      window.history.replaceState({}, '', '/');
      window.location.reload();
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  };

  return (
    <div className="app">
      <main className="main">
        <div className="choose-username">
          <h2>Pick a username</h2>
          <p>Signed in as <strong>{user?.email}</strong></p>
          <form onSubmit={submit} className="auth-form">
            <label className="auth-field">
              <span>Username</span>
              <input
                type="text"
                autoFocus
                required
                minLength={3}
                maxLength={24}
                pattern="[a-zA-Z0-9_]{3,24}"
                value={value}
                onChange={(e) => setValue(e.target.value)}
              />
            </label>
            {error && <div className="auth-error">{error}</div>}
            <button type="submit" className="btn btn--primary" disabled={busy}>
              {busy ? '…' : 'Continue'}
            </button>
            <button type="button" className="link-btn" onClick={logout}>
              Sign out
            </button>
          </form>
        </div>
      </main>
    </div>
  );
}
