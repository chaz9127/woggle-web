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
          <svg className="auth-google__logo" width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
            <path fill="#FFC107" d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z"/>
            <path fill="#FF3D00" d="M6.306 14.691l6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 16.318 4 9.656 8.337 6.306 14.691z"/>
            <path fill="#4CAF50" d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238C29.211 35.091 26.715 36 24 36c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z"/>
            <path fill="#1976D2" d="M43.611 20.083H42V20H24v8h11.303c-.792 2.237-2.231 4.166-4.087 5.571.001-.001.002-.001.003-.002l6.19 5.238C36.971 39.205 44 34 44 24c0-1.341-.138-2.65-.389-3.917z"/>
          </svg>
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
