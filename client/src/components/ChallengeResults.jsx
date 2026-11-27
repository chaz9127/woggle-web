import { useMemo, useState } from 'react';
import Board from './Board';
import { generateBoard } from '../utils/board';
import { createAndOpenChallenge } from '../utils/challengesApi';

const noop = () => {};

// Shown once both players have finished: who won, both scores, and every word
// either player found, with words only one player found highlighted.
export default function ChallengeResults({ view }) {
  const { results, role, code, seed } = view;
  const me = results.players.find((p) => p.role === role);
  const them = results.players.find((p) => p.role !== role);
  const [error, setError] = useState('');
  const [creating, setCreating] = useState(false);

  const board = useMemo(() => (seed ? generateBoard(seed) : null), [seed]);

  const rows = useMemo(() => {
    const byWord = new Map();
    for (const [who, player] of [
      ['me', me],
      ['them', them],
    ]) {
      for (const w of player.words) {
        const row = byWord.get(w.word) || {
          word: w.word,
          scrabble: w.scrabble,
          me: false,
          them: false,
        };
        row[who] = true;
        byWord.set(w.word, row);
      }
    }
    return [...byWord.values()].sort(
      (a, b) => b.scrabble - a.scrabble || a.word.localeCompare(b.word)
    );
  }, [me, them]);

  const headline =
    results.winner === 'draw'
      ? "It's a draw!"
      : results.winner === role
        ? 'You won!'
        : `${them.username} won`;
  const decidedByWords = results.winner !== 'draw' && me.score === them.score;

  const rematch = async () => {
    setCreating(true);
    const err = await createAndOpenChallenge();
    if (err) {
      setError(err);
      setCreating(false);
    }
  };

  const scoreCard = (player, label) => {
    const won = results.winner === player.role;
    return (
      <div
        className={`challenge-results__player ${won ? 'challenge-results__player--winner' : ''}`}
      >
        <span className="challenge-results__name">
          {label}
          {won && <span className="pill pill--accent">Winner</span>}
        </span>
        <strong className="challenge-results__score">{player.score}</strong>
        <span className="challenge-results__words">
          {player.wordCount} {player.wordCount === 1 ? 'word' : 'words'}
        </span>
      </div>
    );
  };

  return (
    <div className="start__card challenge-results">
      <p className="start__date">Challenge {code}</p>
      <h2 className="start__title">{headline}</h2>
      <div className="challenge-results__scores">
        {scoreCard(me, 'You')}
        {scoreCard(them, them.username)}
      </div>
      {decidedByWords && (
        <p className="challenge-results__note">
          Tied on score, so the player with more words wins.
        </p>
      )}

      <h3 className="challenge-results__heading">All words ({rows.length})</h3>
      {rows.length === 0 ? (
        <p className="summary__empty">Neither of you found a word.</p>
      ) : (
        <>
          <p className="challenge-results__note">
            Highlighted words were found by only one of you.
          </p>
          <table className="challenge-words">
            <thead>
              <tr>
                <th scope="col">Word</th>
                <th scope="col">Pts</th>
                <th scope="col">You</th>
                <th scope="col">{them.username}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr
                  key={r.word}
                  className={
                    r.me !== r.them ? 'challenge-words__row--unique' : ''
                  }
                >
                  <td className="challenge-words__word">{r.word}</td>
                  <td>{r.scrabble}</td>
                  <td aria-label={r.me ? 'found by you' : 'not found by you'}>
                    {r.me ? '✓' : ''}
                  </td>
                  <td
                    aria-label={
                      r.them
                        ? `found by ${them.username}`
                        : `not found by ${them.username}`
                    }
                  >
                    {r.them ? '✓' : ''}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}

      {board && (
        <details className="challenge-results__board">
          <summary>Show board</summary>
          <Board board={board} selection={[]} onSelect={noop} />
        </details>
      )}

      {error && <p className="challenge-home__error">{error}</p>}
      <div className="btn-row">
        <button
          type="button"
          className="btn btn--primary"
          onClick={rematch}
          disabled={creating}
        >
          {creating ? 'Creating…' : 'New challenge'}
        </button>
        <a href="/" className="btn">
          Home
        </a>
      </div>
    </div>
  );
}
