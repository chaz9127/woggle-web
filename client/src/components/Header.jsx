import { useState, useRef, useEffect } from 'react';
import { Menu, Pencil } from 'lucide-react';
import { useAuth } from '../auth/AuthContext';
import FeatureTooltip from './FeatureTooltip';
import { featureTooltips } from '../config/featureTooltips';

export default function Header({
  onOpenRules,
  onOpenAuth,
  onOpenAccount,
  onOpenStats,
  onOpenLeaderboard,
  onOpenSettings,
  remaining,
  showTimer,
  unseenCount = 0,
}) {
  const mm = String(Math.floor((remaining ?? 0) / 60)).padStart(1, '0');
  const ss = String((remaining ?? 0) % 60).padStart(2, '0');
  const low = showTimer && remaining <= 10;
  const { user, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);
  const unseenText = `${unseenCount} completed challenge${unseenCount === 1 ? '' : 's'} with new results`;

  useEffect(() => {
    if (!menuOpen) return;
    const onDoc = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target))
        setMenuOpen(false);
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
        className={`header__timer ${low ? 'header__timer--low' : ''}`}
        aria-label="Time remaining"
        aria-hidden={!showTimer}
        style={{ visibility: showTimer ? 'visible' : 'hidden' }}
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
            aria-label={unseenCount > 0 ? `Menu, ${unseenText}` : 'Menu'}
            aria-haspopup="menu"
            aria-expanded={menuOpen}
            title={unseenCount > 0 ? `Menu (${unseenText})` : 'Menu'}
          >
            <Menu size={18} aria-hidden="true" />
            {unseenCount > 0 && (
              <span className="dot icon-btn__dot" aria-hidden="true" />
            )}
          </button>
          {!menuOpen && (
            <FeatureTooltip
              config={featureTooltips.viewWordsOnLeaderboard}
              context={{ user }}
            />
          )}
          {menuOpen && (
            <div className="header__menu" role="menu">
              {user && (
                <div className="header__menu-user">
                  <div className="header__menu-user-text">
                    <strong>{user.username || '(no username)'}</strong>
                    <span>{user.email}</span>
                  </div>
                  <button
                    type="button"
                    className="icon-btn header__menu-edit"
                    onClick={() => {
                      setMenuOpen(false);
                      onOpenAccount?.();
                    }}
                    aria-label="Edit account"
                    title="Edit account"
                  >
                    <Pencil size={15} aria-hidden="true" />
                  </button>
                </div>
              )}
              <a
                href="/challenges"
                className="header__menu-item header__menu-challenges"
                onClick={() => setMenuOpen(false)}
              >
                <span>
                  Challenges <span className="pill">Beta</span>
                </span>
                {unseenCount > 0 && (
                  <>
                    <span className="dot" aria-hidden="true" />
                    <span className="visually-hidden">{unseenText}</span>
                  </>
                )}
              </a>
              <button
                type="button"
                className="header__menu-item"
                onClick={() => {
                  setMenuOpen(false);
                  onOpenLeaderboard?.();
                }}
              >
                Leaderboard
              </button>
              {user && (
                <>
                  <button
                    type="button"
                    className="header__menu-item"
                    onClick={() => {
                      setMenuOpen(false);
                      onOpenStats?.();
                    }}
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
                </>
              )}
              <button
                type="button"
                className="header__menu-item"
                onClick={() => {
                  setMenuOpen(false);
                  onOpenSettings?.();
                }}
              >
                Settings
              </button>
              {user && (
                <button
                  type="button"
                  className="header__menu-item"
                  onClick={() => {
                    setMenuOpen(false);
                    logout();
                  }}
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
