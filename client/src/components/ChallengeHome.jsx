import { useState } from 'react';
import BetaBanner from './BetaBanner';
import ChallengeList from './ChallengeList';
import ChallengeRecord from './ChallengeRecord';
import ChallengeRulesModal from './ChallengeRulesModal';
import ChallengeStart from './ChallengeStart';
import { useAuth } from '../auth/AuthContext';
import { useChallengeList } from '../hooks/useChallengeList';

// The homepage Challenge tab: start a challenge, join one by code, and see
// your latest challenges (each linking to its page).
export default function ChallengeHome({ onSignIn }) {
  const { user } = useAuth();
  const [rulesOpen, setRulesOpen] = useState(false);
  const groups = useChallengeList(user);

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
            <ChallengeRecord record={groups?.record} />
            <ChallengeStart onOpenRules={() => setRulesOpen(true)} />
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
