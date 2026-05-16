import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../auth/AuthContext';
import { todayDateString } from '../utils/random';
import { hasResult, saveResult } from '../utils/gameStorage';

async function apiFetch(path, opts = {}) {
  const res = await fetch(path, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...(opts.headers || {}) },
    ...opts,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data?.error || `Request failed (${res.status})`);
    err.status = res.status;
    err.body = data;
    throw err;
  }
  return data;
}

export function useGameStats() {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [playedToday, setPlayedToday] = useState(false);
  const [todayDate, setTodayDate] = useState(null);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!user) {
      setStats(null);
      setPlayedToday(false);
      setTodayDate(null);
      return;
    }
    setLoading(true);
    try {
      const data = await apiFetch(`/api/games/me?date=${todayDateString()}`);
      const todayDateValue = data.todayDate || todayDateString();
      // Cross-device hydration: if backend has today's completed game but this
      // device's local cache is empty, seed the cache so the share grid and
      // word list render without re-fetching.
      if (
        data.playedToday &&
        Array.isArray(data.todayGame?.foundWords) &&
        !hasResult(todayDateValue)
      ) {
        saveResult(todayDateValue, data.todayGame.foundWords);
      }
      setStats(data.stats);
      setPlayedToday(!!data.playedToday);
      setTodayDate(data.todayDate);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const submitCompletion = useCallback(async (gameDate, words) => {
    try {
      const data = await apiFetch('/api/games/complete', {
        method: 'POST',
        body: JSON.stringify({ gameDate, words }),
      });
      if (user) {
        setStats(data.stats ? {
          totalGames: data.stats.total,
          currentStreak: data.stats.currentStreak,
          longestStreak: data.stats.longestStreak,
          lastCompletedDate: gameDate,
        } : null);
        setPlayedToday(true);
      }
      return data;
    } catch (err) {
      if (err.status === 409) {
        await refresh();
      }
      return null;
    }
  }, [user, refresh]);

  return { stats, playedToday, todayDate, loading, refresh, submitCompletion };
}
