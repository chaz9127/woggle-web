import { useState } from 'react';
import { useAuth } from '../auth/AuthContext';
import { usePageTitle } from '../hooks/usePageTitle';

function SettingRow({ label, description, checked, busy, onChange }) {
  return (
    <label className="settings__row">
      <span className="settings__text">
        <span className="settings__label">{label}</span>
        {description && (
          <span className="settings__desc">{description}</span>
        )}
      </span>
      <span
        className={`switch ${checked ? 'switch--on' : ''} ${busy ? 'switch--busy' : ''}`}
      >
        <input
          type="checkbox"
          className="switch__input"
          checked={checked}
          disabled={busy}
          onChange={onChange}
        />
        <span className="switch__thumb" />
      </span>
    </label>
  );
}

// theme/onToggleTheme come from App: useTheme keeps local state, so calling it
// again here would drift out of sync with App's copy.
export default function SettingsPage({ theme, onToggleTheme }) {
  const { user, updatePreferences } = useAuth();
  const [prefBusy, setPrefBusy] = useState(false);
  const [error, setError] = useState('');

  usePageTitle('Settings');

  const togglePref = async (key) => {
    if (prefBusy) return;
    setPrefBusy(true);
    setError('');
    try {
      await updatePreferences({ [key]: !user[key] });
    } catch {
      setError('Could not save that setting. Please try again.');
    } finally {
      setPrefBusy(false);
    }
  };

  return (
    <div className="settings">
      <h2 className="settings__title">Settings</h2>

      <section className="settings__group">
        <h3 className="settings__group-title">Game</h3>
        {user ? (
          <>
            <SettingRow
              label="Clear after invalid word"
              description="Clear your selection when a word isn’t accepted."
              checked={!!user.clearAfterInvalid}
              busy={prefBusy}
              onChange={() => togglePref('clearAfterInvalid')}
            />
            <SettingRow
              label="Submit word after swipe"
              description="Submit the word automatically when you finish a swipe."
              checked={!!user.submitAfterSwipe}
              busy={prefBusy}
              onChange={() => togglePref('submitAfterSwipe')}
            />
            {error && <p className="settings__error">{error}</p>}
          </>
        ) : (
          <p className="settings__desc">Sign in to change game preferences.</p>
        )}
      </section>

      <section className="settings__group">
        <h3 className="settings__group-title">Appearance</h3>
        <SettingRow
          label="Dark mode"
          checked={theme === 'dark'}
          onChange={onToggleTheme}
        />
      </section>
    </div>
  );
}
