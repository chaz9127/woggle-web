import { useEffect, useRef, useState } from 'react';
import Header from './components/Header';
import Board from './components/Board';
import WordList from './components/WordList';
import RulesModal from './components/RulesModal';
import StatsModal from './components/StatsModal';
import SummaryModal from './components/SummaryModal';
import StartScreen from './components/StartScreen';
import AuthModal from './auth/AuthModal';
import ChooseUsername from './auth/ChooseUsername';
import AdminPage from './admin/AdminPage';
import NotFound from './components/NotFound';
import { useAuth } from './auth/AuthContext';
import { useGame } from './hooks/useGame';
import { useGameStats } from './hooks/useGameStats';
import { useTheme } from './hooks/useTheme';
import { tilesToWord } from './utils/scoring';
import './App.css';

export default function App() {
  const { theme, toggle: toggleTheme } = useTheme();
  const { user, loading: authLoading } = useAuth();
  const {
    dateStr,
    board,
    phase,
    selection,
    foundWords,
    error,
    invalidWord,
    suggested,
    successPoints,
    submitting,
    remaining,
    totals,
    hasPlayedCookie,
    selectTile,
    clearSelection,
    submitWord,
    suggestInvalid,
    startGame,
    dismissSummary,
    resetCookie,
  } = useGame({ clearAfterInvalid: !!user?.clearAfterInvalid });

  const { stats, playedToday, submitCompletion } = useGameStats();

  const [rulesOpen, setRulesOpen] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);
  const [statsOpen, setStatsOpen] = useState(false);
  const currentWord = tilesToWord(selection);
  const showTimer = phase === 'playing' || phase === 'done';

  const submittedRef = useRef(null);
  useEffect(() => {
    if (phase !== 'done' || !user) return;
    const key = `${dateStr}:${foundWords.length}`;
    if (submittedRef.current === key) return;
    submittedRef.current = key;
    submitCompletion(dateStr, foundWords.map((w) => w.word));
  }, [phase, user, dateStr, foundWords, submitCompletion]);

  useEffect(() => {
    if (phase !== 'playing') return;
    const onKey = (e) => {
      if (e.key !== 'Enter') return;
      const target = e.target;
      const tag = target?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      const isTile = target?.closest?.('.tile');
      if (tag === 'BUTTON' && !isTile) return;
      if (submitting || selection.length === 0) return;
      e.preventDefault();
      if (isTile && typeof target.blur === 'function') target.blur();
      submitWord();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [phase, submitting, selection.length, submitWord]);

  if (!authLoading && user && !user.username) {
    return <ChooseUsername />;
  }
  if (!authLoading && window.location.pathname === '/choose-username' && user?.username) {
    window.history.replaceState({}, '', '/');
  }
  if (window.location.pathname.startsWith('/admin')) {
    if (authLoading) return null;
    if (user?.role === 'admin') return <AdminPage />;
    return <NotFound />;
  }

  return (
    <div className="app">
      <Header
        theme={theme}
        onToggleTheme={toggleTheme}
        onOpenRules={() => setRulesOpen(true)}
        onOpenAuth={() => setAuthOpen(true)}
        onOpenStats={() => setStatsOpen(true)}
        remaining={remaining}
        showTimer={showTimer}
      />
      <main className="main">
        {phase === 'idle' || phase === 'locked' ? (
          <StartScreen
            dateStr={dateStr}
            phase={phase}
            hasPlayedCookie={hasPlayedCookie || (!!user && playedToday)}
            onStart={startGame}
            onResetCookie={resetCookie}
            totals={totals}
            foundWords={foundWords}
            board={board}
            theme={theme}
            stats={stats}
          />
        ) : (
          <>
            <div className="date-row">Daily puzzle · {dateStr}</div>

            <div className="scoreboard">
              <div><span>Score</span><strong>{totals.scrabble}</strong></div>
              <div><span>Words</span><strong>{foundWords.length}</strong></div>
            </div>

            <div className={`current-word ${error ? 'current-word--error' : ''} ${successPoints != null ? 'current-word--success' : ''}`}>
              {successPoints != null ? (
                <span>{successPoints} {successPoints === 1 ? 'point' : 'points'}!</span>
              ) : error ? (
                <>
                  <span>{error}</span>
                  {invalidWord && (
                    suggested ? (
                      <span className="current-word__suggested">Suggested!</span>
                    ) : (
                      <button
                        type="button"
                        className="btn btn--ghost btn--inline"
                        onClick={suggestInvalid}
                      >
                        Suggest?
                      </button>
                    )
                  )}
                </>
              ) : (
                currentWord || (
                  <span className="current-word__placeholder">
                    Tap letters to build a word
                  </span>
                )
              )}
            </div>

            <Board board={board} selection={selection} onSelect={selectTile} />

            <div className="controls">
              <button
                type="button"
                className="btn btn--ghost"
                onClick={clearSelection}
                disabled={selection.length === 0 || submitting || phase !== 'playing'}
              >
                Clear
              </button>
              <button
                type="button"
                className="btn btn--primary"
                onClick={submitWord}
                disabled={selection.length === 0 || submitting || phase !== 'playing'}
              >
                {submitting ? 'Checking…' : 'Submit'}
              </button>
            </div>

            <WordList words={foundWords} />
          </>
        )}
      </main>

      <RulesModal open={rulesOpen} onClose={() => setRulesOpen(false)} />
      <AuthModal open={authOpen} onClose={() => setAuthOpen(false)} />
      <StatsModal open={statsOpen} onClose={() => setStatsOpen(false)} />
      <SummaryModal
        open={phase === 'done'}
        onClose={dismissSummary}
        foundWords={foundWords}
        totals={totals}
        board={board}
        dateStr={dateStr}
        theme={theme}
      />
    </div>
  );
}
