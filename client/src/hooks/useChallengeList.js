import { useEffect, useState } from 'react';
import { challengesApi } from '../utils/challengesApi';

// The signed-in player's challenges (grouped) and overall record, or null
// while loading or signed out.
export function useChallengeList(user) {
  const [groups, setGroups] = useState(null);
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

  return userId ? groups : null;
}
