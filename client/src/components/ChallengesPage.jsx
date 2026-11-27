import { useState } from 'react';
import BetaBanner from './BetaBanner';
import ChallengeList from './ChallengeList';
import ChallengeRecord from './ChallengeRecord';
import ChallengeRulesModal from './ChallengeRulesModal';
import ChallengeStart from './ChallengeStart';
import { useAuth } from '../auth/AuthContext';
import { useChallengeList } from '../hooks/useChallengeList';
import { usePageTitle } from '../hooks/usePageTitle';

// /challenges: the player's record, start/join controls, and every recent
// challenge, with each completed one expandable to its game summary.
export default function ChallengesPage({ onSignIn, onSeen }) {
  usePageTitle('Challenges');
  const { user, loading } = useAuth();
  const [rulesOpen, setRulesOpen] = useState(false);
  const groups = useChallengeList(user);

  return (
    <div className="challenges-page">
      <div className="challenges-page__header">
        <h2 className="challenges-page__title">Challenges</h2>
        <button
          type="button"
          className="btn btn--ghost btn--inline"
          onClick={() => setRulesOpen(true)}
        >
          Rules
        </button>
      </div>
      <BetaBanner />
      {loading ? null : user ? (
        <>
          <ChallengeRecord record={groups?.record} />
          <ChallengeStart />
          {groups ? (
            <ChallengeList
              groups={groups}
              expandResults
              collapsibleCompleted={false}
              maxCompleted={Infinity}
              onSeen={onSeen}
            />
          ) : (
            <p className="challenge-list__empty">Loading…</p>
          )}
        </>
      ) : (
        <>
          <p className="challenge-home__note">
            Sign in to start challenges and see your record.
          </p>
          <button type="button" className="btn btn--primary" onClick={onSignIn}>
            Sign in
          </button>
        </>
      )}
      <ChallengeRulesModal
        open={rulesOpen}
        onClose={() => setRulesOpen(false)}
      />
    </div>
  );
}
