import { useState } from 'react';
import Modal from '../components/Modal';
import { useAuth } from './AuthContext';

export default function AccountModal({ onClose }) {
  const { user, setUsername, changePassword } = useAuth();

  const [username, setUsernameValue] = useState(user?.username || '');
  const [usernameError, setUsernameError] = useState('');
  const [usernameMsg, setUsernameMsg] = useState('');
  const [usernameBusy, setUsernameBusy] = useState(false);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [passwordMsg, setPasswordMsg] = useState('');
  const [passwordBusy, setPasswordBusy] = useState(false);

  const submitUsername = async (e) => {
    e.preventDefault();
    setUsernameError('');
    setUsernameMsg('');
    if (username === user?.username) {
      setUsernameMsg('That is already your username.');
      return;
    }
    setUsernameBusy(true);
    try {
      await setUsername(username);
      setUsernameMsg('Username updated.');
    } catch (err) {
      setUsernameError(err.message);
    } finally {
      setUsernameBusy(false);
    }
  };

  const submitPassword = async (e) => {
    e.preventDefault();
    setPasswordError('');
    setPasswordMsg('');
    if (newPassword !== confirmPassword) {
      setPasswordError('New passwords do not match.');
      return;
    }
    setPasswordBusy(true);
    try {
      await changePassword(currentPassword, newPassword);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setPasswordMsg(user?.hasPassword ? 'Password changed.' : 'Password set.');
    } catch (err) {
      setPasswordError(err.message);
    } finally {
      setPasswordBusy(false);
    }
  };

  return (
    <Modal open title="Account" onClose={onClose}>
      <form onSubmit={submitUsername} className="auth-form">
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
            onChange={(e) => setUsernameValue(e.target.value)}
          />
        </label>
        {usernameError && <div className="auth-error">{usernameError}</div>}
        {usernameMsg && <div className="auth-success">{usernameMsg}</div>}
        <button
          type="submit"
          className="btn btn--primary"
          disabled={usernameBusy}
        >
          {usernameBusy ? '…' : 'Save username'}
        </button>
      </form>

      <div className="auth-divider">
        <span>{user?.hasPassword ? 'Change password' : 'Set password'}</span>
      </div>

      <form onSubmit={submitPassword} className="auth-form">
        {user?.hasPassword && (
          <label className="auth-field">
            <span>Current password</span>
            <input
              type="password"
              autoComplete="current-password"
              required
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
            />
          </label>
        )}
        <label className="auth-field">
          <span>New password</span>
          <input
            type="password"
            autoComplete="new-password"
            required
            minLength={8}
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
          />
        </label>
        <label className="auth-field">
          <span>Confirm new password</span>
          <input
            type="password"
            autoComplete="new-password"
            required
            minLength={8}
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
          />
        </label>
        {passwordError && <div className="auth-error">{passwordError}</div>}
        {passwordMsg && <div className="auth-success">{passwordMsg}</div>}
        <button
          type="submit"
          className="btn btn--primary"
          disabled={passwordBusy}
        >
          {passwordBusy
            ? '…'
            : user?.hasPassword
              ? 'Change password'
              : 'Set password'}
        </button>
      </form>
    </Modal>
  );
}
