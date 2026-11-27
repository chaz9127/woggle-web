import { useEffect, useState } from 'react';
import BetaBanner from './BetaBanner';
import ChallengeList from './ChallengeList';
import ChallengeRulesModal from './ChallengeRulesModal';
import { useAuth } from '../auth/AuthContext';
import {
  challengesApi,
  challengePath,
  createAndOpenChallenge,
  normalizeCode,
} from '../utils/challengesApi';

// The homepage Challenge tab: start a challenge, join one by code, and see
// your existing challenges.
export default function ChallengeHome({ onSignIn }) {
  const { user } = useAuth();
  const [rulesOpen, setRulesOpen] = useState(false);
  const [groups, setGroups] = useState(null);
  const [codeInput, setCodeInput] = useState('');
  const [error, setError] = useState('');
  const [creating, setCreating] = useState(false);
  const userId = user?.id ?? null;

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    challengesApi.list().then(({ ok, data }) => {
      if (!cancelled && ok) setGroups(data);
    });
    return () => {
      cancelled = true;
    };
  }, [userId]);

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
    <div className="start">
      <div className="start__card challenge-home">
        <BetaBanner />
        <h2 className="start__title">Challenge a friend</h2>
        <p className="start__lead">
          You both play the same private board, whenever suits you. Highest
          score wins.
        </p>
        {user ? (
          <>
            <div className="btn-row">
              <button
                type="button"
                className="btn btn--primary"
                onClick={create}
                disabled={creating}
              >
                {creating ? 'Creating…' : 'New challenge'}
              </button>
              <button
                type="button"
                className="btn"
                onClick={() => setRulesOpen(true)}
              >
                Rules
              </button>
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
            {groups && (
              <>
                <h3 className="challenge-home__subtitle">Your challenges</h3>
                <ChallengeList groups={groups} />
              </>
            )}
          </>
        ) : (
          <>
            <div className="btn-row">
              <button
                type="button"
                className="btn btn--primary"
                onClick={onSignIn}
              >
                Sign in to play
              </button>
              <button
                type="button"
                className="btn"
                onClick={() => setRulesOpen(true)}
              >
                Rules
              </button>
            </div>
            <p className="challenge-home__note">
              Challenges need an account so your friend can see who they're
              playing.
            </p>
          </>
        )}
        <ChallengeRulesModal
          open={rulesOpen}
          onClose={() => setRulesOpen(false)}
        />
      </div>
    </div>
  );
}
