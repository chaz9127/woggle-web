import { useState } from 'react';
import {
  challengePath,
  createAndOpenChallenge,
  normalizeCode,
} from '../utils/challengesApi';

// "Start challenge" plus the join-by-code field. Pass onOpenRules to put a
// Rules button beside Start (the homepage); the Challenges page has Rules in
// its header instead.
export default function ChallengeStart({ onOpenRules }) {
  const [codeInput, setCodeInput] = useState('');
  const [error, setError] = useState('');
  const [creating, setCreating] = useState(false);

  const create = async () => {
    setCreating(true);
    setError('');
    const err = await createAndOpenChallenge();
    if (err) {
      setError(err);
      setCreating(false);
    }
  };

  const join = (e) => {
    e.preventDefault();
    const code = normalizeCode(codeInput);
    if (!code) {
      setError('Codes are 4 letters or numbers, like K7RV.');
      return;
    }
    window.location.href = challengePath(code);
  };

  return (
    <>
      <div className="btn-row">
        <button
          type="button"
          className="btn btn--primary"
          onClick={create}
          disabled={creating}
        >
          {creating ? 'Starting…' : 'Start challenge'}
        </button>
        {onOpenRules && (
          <button type="button" className="btn" onClick={onOpenRules}>
            Rules
          </button>
        )}
      </div>
      <form className="code-entry" onSubmit={join}>
        <input
          value={codeInput}
          onChange={(e) => {
            setCodeInput(e.target.value.toUpperCase().slice(0, 4));
            setError('');
          }}
          placeholder="CODE"
          aria-label="Challenge code"
          autoCapitalize="characters"
          autoComplete="off"
          spellCheck={false}
          maxLength={4}
        />
        <button type="submit" className="btn btn--inline">
          Join
        </button>
      </form>
      {error && <p className="challenge-home__error">{error}</p>}
    </>
  );
}
