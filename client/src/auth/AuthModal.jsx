import { useEffect, useState } from 'react';
import Modal from '../components/Modal';
import { useAuth } from './AuthContext';

export default function AuthModal({ open, onClose, initialMode = 'signin' }) {
  const [mode, setMode] = useState(initialMode);
  useEffect(() => { if (open) setMode(initialMode); }, [open, initialMode]);
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const { login, register } = useAuth();

  const reset = () => {
    setEmail(''); setUsername(''); setPassword(''); setError(''); setBusy(false);
  };

  const close = () => { reset(); onClose(); };

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      if (mode === 'signin') {
        await login(email, password);
      } else {
        await register(email, username, password);
      }
      close();
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  };

  const title = mode === 'signin' ? 'Sign in' : 'Create account';

  return (
    <Modal open={open} title={title} onClose={close}>
      <form onSubmit={submit} className="auth-form">
        <label className="auth-field">
          <span>Email</span>
          <input
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </label>
        {mode === 'signup' && (
          <label className="auth-field">
            <span>Username</span>
            <input
              type="text"
              autoComplete="username"
              required
              minLength={3}
              maxLength={24}
              pattern="[a-zA-Z0-9_]{3,24}"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
          </label>
        )}
        <label className="auth-field">
          <span>Password</span>
          <input
            type="password"
            autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
            required
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </label>

        {error && <div className="auth-error">{error}</div>}

        <button type="submit" className="btn btn--primary" disabled={busy}>
          {busy ? '…' : title}
        </button>

        <div className="auth-divider"><span>or</span></div>

        <a href="/api/auth/google" className="btn btn--ghost auth-google">
          Continue with Google
        </a>

        <div className="auth-switch">
          {mode === 'signin' ? (
            <>No account? <button type="button" className="link-btn" onClick={() => { setMode('signup'); setError(''); }}>Create one</button></>
          ) : (
            <>Have an account? <button type="button" className="link-btn" onClick={() => { setMode('signin'); setError(''); }}>Sign in</button></>
          )}
        </div>
      </form>
    </Modal>
  );
}
