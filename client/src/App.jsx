import { useState } from 'react';
import Header from './components/Header';
import Board from './components/Board';
import WordList from './components/WordList';
import RulesModal from './components/RulesModal';
import SummaryModal from './components/SummaryModal';
import { useGame } from './hooks/useGame';
import { useTheme } from './hooks/useTheme';
import { tilesToWord } from './utils/scoring';
import './App.css';

export default function App() {
  const { theme, toggle: toggleTheme } = useTheme();
  const {
    dateStr,
    board,
    selection,
    foundWords,
    error,
    submitting,
    elapsed,
    finished,
    totals,
    selectTile,
    clearSelection,
    submitWord,
    finish,
    resumeGame,
  } = useGame();

  const [rulesOpen, setRulesOpen] = useState(false);
  const currentWord = tilesToWord(selection);

  return (
    <div className="app">
      <Header
        theme={theme}
        onToggleTheme={toggleTheme}
        onOpenRules={() => setRulesOpen(true)}
        elapsed={elapsed}
      />
      <main className="main">
        <div className="date-row">Daily puzzle · {dateStr}</div>

        <div className="scoreboard">
          <div><span>Boggle</span><strong>{totals.boggle}</strong></div>
          <div><span>Scrabble</span><strong>{totals.scrabble}</strong></div>
          <div><span>Words</span><strong>{foundWords.length}</strong></div>
        </div>

        <div className={`current-word ${error ? 'current-word--error' : ''}`}>
          {error
            ? error
            : currentWord || (
                <span className="current-word__placeholder">
                  Tap letters to build a word
                </span>
              )}
        </div>

        <Board board={board} selection={selection} onSelect={selectTile} />

        <div className="controls">
          <button
            type="button"
            className="btn btn--ghost"
            onClick={clearSelection}
            disabled={selection.length === 0 || submitting}
          >
            Clear
          </button>
          <button
            type="button"
            className="btn btn--primary"
            onClick={submitWord}
            disabled={selection.length === 0 || submitting}
          >
            {submitting ? 'Checking…' : 'Submit'}
          </button>
          <button type="button" className="btn btn--ghost" onClick={finish}>
            Finish
          </button>
        </div>

        <WordList words={foundWords} />
      </main>

      <RulesModal open={rulesOpen} onClose={() => setRulesOpen(false)} />
      <SummaryModal
        open={finished}
        onClose={resumeGame}
        foundWords={foundWords}
        totals={totals}
        elapsed={elapsed}
      />
    </div>
  );
}
