import { useState } from 'react';
import Header from './components/Header';
import Board from './components/Board';
import WordList from './components/WordList';
import RulesModal from './components/RulesModal';
import SummaryModal from './components/SummaryModal';
import StartScreen from './components/StartScreen';
import AuthModal from './auth/AuthModal';
import ChooseUsername from './auth/ChooseUsername';
import { useAuth } from './auth/AuthContext';
import { useGame } from './hooks/useGame';
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
  } = useGame();

  const [rulesOpen, setRulesOpen] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);
  const currentWord = tilesToWord(selection);
  const showTimer = phase === 'playing' || phase === 'done';

  if (!authLoading && user && !user.username) {
    return <ChooseUsername />;
  }
  if (!authLoading && window.location.pathname === '/choose-username' && user?.username) {
    window.history.replaceState({}, '', '/');
  }

  return (
    <div className="app">
      <Header
        theme={theme}
        onToggleTheme={toggleTheme}
        onOpenRules={() => setRulesOpen(true)}
        onOpenAuth={() => setAuthOpen(true)}
        remaining={remaining}
        showTimer={showTimer}
      />
      <main className="main">
        {phase === 'idle' || phase === 'locked' ? (
          <StartScreen
            dateStr={dateStr}
            phase={phase}
            hasPlayedCookie={hasPlayedCookie}
            onStart={startGame}
            onResetCookie={resetCookie}
            totals={totals}
            foundWords={foundWords}
            board={board}
            theme={theme}
          />
        ) : (
          <>
            <div className="date-row">Daily puzzle · {dateStr}</div>

            <div className="scoreboard">
              <div><span>Score</span><strong>{totals.scrabble}</strong></div>
              <div><span>Words</span><strong>{foundWords.length}</strong></div>
            </div>

            <div className={`current-word ${error ? 'current-word--error' : ''}`}>
              {error ? (
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
