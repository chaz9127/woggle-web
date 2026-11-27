import { useCallback, useEffect, useState } from 'react';
import { challengesApi } from '../utils/challengesApi';
import { isPrivilegedUser } from '../utils/roles';

const POLL_MS = 45 * 1000;

// Number of completed challenges whose results this player hasn't opened yet
// (drives the green dot). There are no websockets, so it refreshes on load, on
// window focus, and on a slow poll while the tab is visible. The endpoint is a
// single COUNT, so this stays cheap.
export function useChallengeUnseen(user) {
  const [count, setCount] = useState(0);
  // Challenge mode is tester-only during the beta.
  const userId = isPrivilegedUser(user) ? user.id : null;

  const refresh = useCallback(async () => {
    if (!userId) return;
    const { ok, data } = await challengesApi.unseen();
    if (ok && typeof data?.count === 'number') setCount(data.count);
  }, [userId]);

  useEffect(() => {
    if (!userId) return;
    const load = () => {
      refresh();
    };
    load();
    const onVisible = () => {
      if (document.visibilityState === 'visible') load();
    };
    const id = setInterval(() => {
      if (document.visibilityState === 'visible') load();
    }, POLL_MS);
    window.addEventListener('focus', load);
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      clearInterval(id);
      window.removeEventListener('focus', load);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [userId, refresh]);

  // Signed out: no dot, without needing to reset state.
  return { count: userId ? count : 0, refresh };
}
