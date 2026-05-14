import { useState, useRef, useEffect } from 'react';
import { Trophy } from 'lucide-react';
import { useAuth } from '../auth/AuthContext';

export default function Header({ theme, onToggleTheme, onOpenRules, onOpenAuth, onOpenStats, onOpenLeaderboard, remaining, showTimer }) {
  const mm = String(Math.floor((remaining ?? 0) / 60)).padStart(1, "0");
  const ss = String((remaining ?? 0) % 60).padStart(2, "0");
  const low = showTimer && remaining <= 10;
  const { user, logout, updatePreferences } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const [prefBusy, setPrefBusy] = useState(false);
  const menuRef = useRef(null);

  const toggleClearAfterInvalid = async () => {
    if (prefBusy) return;
    setPrefBusy(true);
    try {
      await updatePreferences({ clearAfterInvalid: !user.clearAfterInvalid });
    } catch {
      // surface via UI in a future pass; ignore silently for now
    } finally {
      setPrefBusy(false);
    }
  };

  useEffect(() => {
    if (!menuOpen) return;
    const onDoc = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [menuOpen]);

  const initial = (user?.username || user?.email || '?').slice(0, 1).toUpperCase();

  return (
    <header className="header">
      <h1 className="header__title">
        <a href="/" className="header__title-link">Woggle</a>
      </h1>
      <div
        className={`header__timer ${low ? "header__timer--low" : ""}`}
        aria-label="Time remaining"
        aria-hidden={!showTimer}
        style={{ visibility: showTimer ? "visible" : "hidden" }}
      >
        {mm}:{ss}
      </div>
      <div className="header__actions">
        <button
          type="button"
          className="icon-btn"
          onClick={onOpenRules}
          aria-label="How to play"
          title="How to play"
        >
          ?
        </button>
        <button
          type="button"
          className="icon-btn"
          onClick={onToggleTheme}
          aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
          title="Toggle theme"
        >
          {theme === "dark" ? "☀" : "☾"}
        </button>
        <button
          type="button"
          className="icon-btn"
          onClick={onOpenLeaderboard}
          aria-label="Leaderboard"
          title="Leaderboard"
        >
          <Trophy size={18} aria-hidden="true" />
        </button>
        {user ? (
          <div className="header__account" ref={menuRef}>
            <button
              type="button"
              className="icon-btn icon-btn--avatar"
              onClick={() => setMenuOpen((v) => !v)}
              aria-label="Account menu"
              title={user.username || user.email}
            >
              {initial}
            </button>
            {menuOpen && (
              <div className="header__menu" role="menu">
                <div className="header__menu-user">
                  <strong>{user.username || '(no username)'}</strong>
                  <span>{user.email}</span>
                </div>
                <label className="header__menu-item header__menu-toggle">
                  <span>Clear after invalid word</span>
                  <span className={`switch ${user.clearAfterInvalid ? 'switch--on' : ''} ${prefBusy ? 'switch--busy' : ''}`}>
                    <input
                      type="checkbox"
                      className="switch__input"
                      checked={!!user.clearAfterInvalid}
                      disabled={prefBusy}
                      onChange={toggleClearAfterInvalid}
                    />
                    <span className="switch__thumb" />
                  </span>
                </label>
                <button
                  type="button"
                  className="header__menu-item"
                  onClick={() => { setMenuOpen(false); onOpenStats?.(); }}
                >
                  Stats
                </button>
                <button
                  type="button"
                  className="header__menu-item"
                  onClick={() => { setMenuOpen(false); logout(); }}
                >
                  Sign out
                </button>
              </div>
            )}
          </div>
        ) : (
          <button
            type="button"
            className="btn btn--ghost btn--inline"
            onClick={onOpenAuth}
          >
            Sign in
          </button>
        )}
      </div>
    </header>
  );
}
