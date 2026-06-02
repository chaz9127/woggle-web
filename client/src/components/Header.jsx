import { useState, useRef, useEffect } from 'react';
import { Menu } from 'lucide-react';
import { useAuth } from '../auth/AuthContext';
import FeatureTooltip from './FeatureTooltip';
import { featureTooltips } from '../config/featureTooltips';

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

  const toggleSubmitAfterSwipe = async () => {
    if (prefBusy) return;
    setPrefBusy(true);
    try {
      await updatePreferences({ submitAfterSwipe: !user.submitAfterSwipe });
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

  return (
    <header className="header">
      <h1 className="header__title">
        <a href="/" className="header__title-link" aria-label="Woggle">
          <img src="/logo.png" alt="Woggle" className="header__logo" />
        </a>
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
        {!user && (
          <button
            type="button"
            className="btn btn--ghost btn--inline"
            onClick={onOpenAuth}
          >
            Sign in
          </button>
        )}
        <div className="header__account" ref={menuRef}>
          <button
            type="button"
            id="header-menu-button"
            className="icon-btn"
            onClick={() => setMenuOpen((v) => !v)}
            aria-label="Menu"
            aria-haspopup="menu"
            aria-expanded={menuOpen}
            title="Menu"
          >
            <Menu size={18} aria-hidden="true" />
          </button>
          {!menuOpen && (
            <FeatureTooltip
              config={featureTooltips.submitAfterSwipe}
              context={{ user }}
            />
          )}
          {menuOpen && (
            <div className="header__menu" role="menu">
              {user && (
                <div className="header__menu-user">
                  <strong>{user.username || '(no username)'}</strong>
                  <span>{user.email}</span>
                </div>
              )}
              <button
                type="button"
                className="header__menu-item"
                onClick={() => { setMenuOpen(false); onOpenLeaderboard?.(); }}
              >
                Leaderboard
              </button>
              {user && (
                <>
                  <button
                    type="button"
                    className="header__menu-item"
                    onClick={() => { setMenuOpen(false); onOpenStats?.(); }}
                  >
                    Stats
                  </button>
                  {user.role === 'admin' && (
                    <a
                      href="/admin"
                      className="header__menu-item"
                      onClick={() => setMenuOpen(false)}
                    >
                      Admin
                    </a>
                  )}
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
                  <label className="header__menu-item header__menu-toggle">
                    <span>Submit word after swipe</span>
                    <span className={`switch ${user.submitAfterSwipe ? 'switch--on' : ''} ${prefBusy ? 'switch--busy' : ''}`}>
                      <input
                        type="checkbox"
                        className="switch__input"
                        checked={!!user.submitAfterSwipe}
                        disabled={prefBusy}
                        onChange={toggleSubmitAfterSwipe}
                      />
                      <span className="switch__thumb" />
                    </span>
                  </label>
                </>
              )}
              <label className="header__menu-item header__menu-toggle">
                <span>Dark mode</span>
                <span className={`switch ${theme === 'dark' ? 'switch--on' : ''}`}>
                  <input
                    type="checkbox"
                    className="switch__input"
                    checked={theme === 'dark'}
                    onChange={onToggleTheme}
                  />
                  <span className="switch__thumb" />
                </span>
              </label>
              {user && (
                <button
                  type="button"
                  className="header__menu-item"
                  onClick={() => { setMenuOpen(false); logout(); }}
                >
                  Sign out
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
