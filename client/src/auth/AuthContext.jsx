import { createContext, useContext, useEffect, useState, useCallback } from 'react';

const AuthContext = createContext(null);

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
    throw err;
  }
  return data;
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const { user } = await apiFetch('/api/auth/me');
      setUser(user);
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const login = useCallback(async (email, password) => {
    const { user } = await apiFetch('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    setUser(user);
    return user;
  }, []);

  const register = useCallback(async (email, username, password) => {
    const { user } = await apiFetch('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, username, password }),
    });
    setUser(user);
    return user;
  }, []);

  const logout = useCallback(async () => {
    await apiFetch('/api/auth/logout', { method: 'POST' });
    setUser(null);
  }, []);

  const setUsername = useCallback(async (username) => {
    const { user } = await apiFetch('/api/auth/username', {
      method: 'POST',
      body: JSON.stringify({ username }),
    });
    setUser(user);
    return user;
  }, []);

  const updatePreferences = useCallback(async (prefs) => {
    const { user } = await apiFetch('/api/auth/preferences', {
      method: 'PATCH',
      body: JSON.stringify(prefs),
    });
    setUser(user);
    return user;
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, setUsername, updatePreferences, refresh }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
