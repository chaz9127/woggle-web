import { useState, useRef, useEffect } from 'react';
import { Menu, Pencil } from 'lucide-react';
import { useAuth } from '../auth/AuthContext';
import FeatureTooltip from './FeatureTooltip';
import ChallengeList from './ChallengeList';
import { challengesApi, createAndOpenChallenge } from '../utils/challengesApi';
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
  // null = automatic (open only when there are new results); a click overrides.
  const [challengesOpen, setChallengesOpen] = useState(null);
  const [challengeGroups, setChallengeGroups] = useState(null);
  const [challengeError, setChallengeError] = useState('');
  const [creating, setCreating] = useState(false);
  const menuRef = useRef(null);
  const unseenText = `${unseenCount} completed challenge${unseenCount === 1 ? '' : 's'} with new results`;
  // New results open the Challenges section so the dotted entry is visible.
  const showChallenges = challengesOpen ?? unseenCount > 0;

  // Fetched each time the section is shown, so it's never stale.
  useEffect(() => {
    if (!menuOpen || !showChallenges || !user) return;
    let cancelled = false;
    challengesApi.list().then(({ ok, data }) => {
      if (!cancelled && ok) setChallengeGroups(data);
    });
    return () => {
      cancelled = true;
    };
  }, [menuOpen, showChallenges, user]);

  const newChallenge = async () => {
    setCreating(true);
    setChallengeError('');
    const err = await createAndOpenChallenge();
    if (err) {
      setChallengeError(err);
      setCreating(false);
    }
  };

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
                  <button
                    type="button"
                    className="header__menu-item header__menu-expander"
                    aria-expanded={showChallenges}
                    aria-controls="header-challenges"
                    onClick={() => setChallengesOpen(!showChallenges)}
                  >
                    <span>
                      Challenges <span className="pill">Beta</span>
                    </span>
                    <span className="header__menu-expander-end">
                      {unseenCount > 0 && (
                        <>
                          <span className="dot" aria-hidden="true" />
                          <span className="visually-hidden">{unseenText}</span>
                        </>
                      )}
                      <span aria-hidden="true">
                        {showChallenges ? '▴' : '▾'}
                      </span>
                    </span>
                  </button>
                  {showChallenges && (
                    <div id="header-challenges" className="header__challenges">
                      <button
                        type="button"
                        className="btn btn--primary btn--inline header__challenges-new"
                        onClick={newChallenge}
                        disabled={creating}
                      >
                        {creating ? 'Creating…' : '+ New challenge'}
                      </button>
                      {challengeError && (
                        <p className="challenge-home__error">
                          {challengeError}
                        </p>
                      )}
                      {challengeGroups ? (
                        <ChallengeList
                          groups={challengeGroups}
                          onOpen={() => setMenuOpen(false)}
                        />
                      ) : (
                        <p className="challenge-list__empty">Loading…</p>
                      )}
                    </div>
                  )}
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
