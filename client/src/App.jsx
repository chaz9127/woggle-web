import { useEffect, useRef, useState } from 'react';
import Header from './components/Header';
import GamePlay from './components/GamePlay';
import RulesModal from './components/RulesModal';
import StatsModal from './components/StatsModal';
import LeaderboardsPage from './components/LeaderboardsPage';
import SettingsPage from './components/SettingsPage';
import SummaryModal from './components/SummaryModal';
import BonusDrawer from './components/BonusDrawer';
import StartScreen from './components/StartScreen';
// import TesterModal from './components/TesterModal';
import WhySignUpModal from './components/WhySignUpModal';
import AuthModal from './auth/AuthModal';
import AccountModal from './auth/AccountModal';
import ChooseUsername from './auth/ChooseUsername';
import AdminPage from './admin/AdminPage';
import NotFound from './components/NotFound';
import { useAuth } from './auth/AuthContext';
import { useGame } from './hooks/useGame';
import { useGameStats } from './hooks/useGameStats';
import { useTheme } from './hooks/useTheme';
import { todayDateString } from './utils/random';
import { setUserType } from './utils/analytics';
import {
  getPlayedCookie,
  setPlayedCookie,
  getOverrideCookie,
  setOverrideCookie,
  clearOverrideCookie,
} from './utils/cookies';
import './App.css';

export default function App() {
  const { theme, toggle: toggleTheme } = useTheme();
  const { user, loading: authLoading } = useAuth();

  const today = todayDateString();
  const { stats, playedToday, submitCompletion } = useGameStats();
  const [playedCookieActive, setPlayedCookieActive] = useState(
    () => getPlayedCookie() === today
  );
  const [overrideActive, setOverrideActive] = useState(
    () => getOverrideCookie() === today
  );
  const locked = !overrideActive && (user ? playedToday : playedCookieActive);

  const game = useGame({
    clearAfterInvalid: user ? !!user.clearAfterInvalid : true,
    locked,
  });
  const {
    dateStr,
    board,
    phase,
    countdown,
    foundWords,
    remaining,
    totals,
    possibleWords,
    startGame,
    dismissSummary,
  } = game;

  const [rulesOpen, setRulesOpen] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState('signin');
  const [statsOpen, setStatsOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [whySignUpOpen, setWhySignUpOpen] = useState(false);
  const [whySignUpDismissed, setWhySignUpDismissed] = useState(false);
  const [bonus, setBonus] = useState(null);

  useEffect(() => {
    if (authLoading) return;
    if (user) {
      setWhySignUpOpen(false);
      return;
    }
    if (locked && !whySignUpDismissed) {
      setWhySignUpOpen(true);
    }
  }, [authLoading, user, locked, whySignUpDismissed]);
  useEffect(() => {
    if (authLoading) return;
    setUserType(!!user);
  }, [authLoading, user]);

  const showTimer = phase === 'playing' || phase === 'done';

  const submittedRef = useRef(null);
  useEffect(() => {
    if (phase !== 'done') return;
    const key = `${dateStr}:${foundWords.length}`;
    if (submittedRef.current === key) return;
    submittedRef.current = key;

    if (overrideActive) {
      clearOverrideCookie();
      setOverrideActive(false);
    } else if (!user) {
      setPlayedCookie(dateStr);
      setPlayedCookieActive(true);
    }

    submitCompletion(dateStr, foundWords).then((data) => {
      if (data?.bonus) setBonus(data.bonus);
    });
  }, [phase, dateStr, foundWords, submitCompletion, overrideActive, user]);

  if (!authLoading && user && !user.username) {
    return <ChooseUsername />;
  }
  if (
    !authLoading &&
    window.location.pathname === '/choose-username' &&
    user?.username
  ) {
    window.history.replaceState({}, '', '/');
  }
  if (window.location.pathname.startsWith('/admin')) {
    if (authLoading) return null;
    if (user?.role === 'admin') return <AdminPage />;
    return <NotFound />;
  }
  const isLeaderboards = window.location.pathname.startsWith('/leaderboards');
  const isSettings = window.location.pathname.startsWith('/settings');

  return (
    <div className="app">
      <Header
        onOpenRules={() => setRulesOpen(true)}
        onOpenAuth={() => {
          setAuthMode('signin');
          setAuthOpen(true);
        }}
        onOpenAccount={() => setAccountOpen(true)}
        onOpenStats={() => setStatsOpen(true)}
        onOpenLeaderboard={() => {
          window.location.href = '/leaderboards';
        }}
        onOpenSettings={() => {
          window.location.href = '/settings';
        }}
        remaining={remaining}
        showTimer={!isLeaderboards && !isSettings && showTimer}
      />
      <main className="main">
        {isLeaderboards ? (
          <LeaderboardsPage />
        ) : isSettings ? (
          <SettingsPage theme={theme} onToggleTheme={toggleTheme} />
        ) : phase === 'countdown' ? (
          <div className="countdown">
            <span className="countdown__label">Get ready…</span>
            <span className="countdown__number" key={countdown}>
              {countdown}
            </span>
          </div>
        ) : phase === 'idle' || phase === 'locked' ? (
          <StartScreen
            dateStr={dateStr}
            phase={phase}
            locked={locked}
            onStart={startGame}
            onOverride={() => {
              setOverrideCookie(dateStr);
              setOverrideActive(true);
            }}
            onSignUp={() => {
              setAuthMode('signup');
              setAuthOpen(true);
            }}
            totals={totals}
            foundWords={foundWords}
            board={board}
            theme={theme}
            stats={stats}
          />
        ) : (
          <GamePlay
            game={game}
            submitAfterSwipe={user ? user.submitAfterSwipe : true}
          />
        )}
      </main>

      <RulesModal open={rulesOpen} onClose={() => setRulesOpen(false)} />
      {/* <TesterModal
        open={
          (import.meta.env.DEV || user?.role === 'tester') &&
          !isLeaderboards &&
          !authOpen &&
          (phase === 'idle' || phase === 'locked')
        }
      /> */}
      <WhySignUpModal
        open={whySignUpOpen}
        onClose={() => {
          setWhySignUpOpen(false);
          setWhySignUpDismissed(true);
        }}
        onSignUp={() => {
          setWhySignUpOpen(false);
          setWhySignUpDismissed(true);
          setAuthMode('signup');
          setAuthOpen(true);
        }}
      />
      <AuthModal
        open={authOpen}
        onClose={() => setAuthOpen(false)}
        initialMode={authMode}
      />
      <StatsModal open={statsOpen} onClose={() => setStatsOpen(false)} />
      {accountOpen && <AccountModal onClose={() => setAccountOpen(false)} />}
      <SummaryModal
        open={phase === 'done'}
        onClose={dismissSummary}
        foundWords={foundWords}
        totals={totals}
        board={board}
        dateStr={dateStr}
        theme={theme}
        bonus={bonus}
        possibleWords={possibleWords}
        showMissedWords={!!user && playedToday}
      />
      <BonusDrawer bonus={bonus} onClose={() => setBonus(null)} />
    </div>
  );
}
