import { useEffect, useState } from 'react';
import Board from './Board';
import WordList from './WordList';
import { tilesToWord } from '../utils/scoring';

// The in-game screen (scoreboard, board, controls, found words), shared by
// the daily game and challenge runs. `game` is the object useGame returns.
export default function GamePlay({ game, submitAfterSwipe }) {
  const {
    board,
    phase,
    selection,
    foundWords,
    error,
    invalidWord,
    suggested,
    successPoints,
    submitting,
    totals,
    possibleWords,
    selectTile,
    clearSelection,
    submitWord,
    suggestInvalid,
  } = game;
  const [boardRotation, setBoardRotation] = useState(0);
  const currentWord = tilesToWord(selection);

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

  return (
    <>
      <div
        className={`scoreboard ${error ? 'scoreboard--error' : ''} ${successPoints != null ? 'scoreboard--success' : ''}`}
      >
        {successPoints != null ? (
          <div className="scoreboard__alert">
            <span>
              {successPoints} {successPoints === 1 ? 'point' : 'points'}!
            </span>
          </div>
        ) : error ? (
          <div className="scoreboard__alert">
            <span>{error}</span>
            {invalidWord &&
              (suggested ? (
                <span className="current-word__suggested">Suggested!</span>
              ) : (
                <button
                  type="button"
                  className="btn btn--ghost btn--inline"
                  onClick={suggestInvalid}
                >
                  Suggest?
                </button>
              ))}
          </div>
        ) : currentWord ? (
          <div className="scoreboard__current">{currentWord}</div>
        ) : (
          <>
            <div>
              <span>Score</span>
              <strong>{totals.scrabble}</strong>
            </div>
            <div>
              <span>Words</span>
              <strong>
                {foundWords.length}
                {possibleWords != null && ` / ${possibleWords}`}
              </strong>
            </div>
          </>
        )}
      </div>

      <Board
        board={board}
        selection={selection}
        onSelect={selectTile}
        onSwipeEnd={submitAfterSwipe ? submitWord : undefined}
        rotation={boardRotation}
      />

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
          className="btn btn--ghost"
          onClick={() => setBoardRotation((r) => (r + 1) % 4)}
          disabled={phase !== 'playing'}
          aria-label="Rotate board"
          title="Rotate board"
        >
          ↻
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
  );
}
