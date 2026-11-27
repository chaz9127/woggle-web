import { todayDateString } from './random';

// Thin wrapper over /api/challenges. Every call resolves to
// { ok, status, data } rather than throwing, because several non-2xx answers
// (409 full, 410 ended) still carry a challenge view the UI needs to render.
async function request(method, path = '', body) {
  try {
    const res = await fetch(`/api/challenges${path}`, {
      method,
      credentials: 'include',
      headers: body ? { 'Content-Type': 'application/json' } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    });
    const data = await res.json().catch(() => null);
    return { ok: res.ok, status: res.status, data };
  } catch {
    return { ok: false, status: 0, data: null };
  }
}

const enc = encodeURIComponent;

export const challengesApi = {
  create: () => request('POST'),
  list: () => request('GET'),
  unseen: () => request('GET', '/unseen'),
  get: (code) => request('GET', `/${enc(code)}`),
  join: (code) => request('POST', `/${enc(code)}/join`),
  start: (code) => request('POST', `/${enc(code)}/start`),
  // localDate lets a finished run count toward the player's streak on their
  // own calendar day, the same way daily completions do.
  complete: (code, words) =>
    request('POST', `/${enc(code)}/complete`, {
      words,
      localDate: todayDateString(),
    }),
  seen: (code) => request('POST', `/${enc(code)}/seen`),
  retract: (code) => request('POST', `/${enc(code)}/retract`),
  reject: (code) => request('POST', `/${enc(code)}/reject`),
};

// Mirrors server/src/challengeLogic.js: consonants (no vowels, Y, L or Q) and
// digits 2-9.
const CODE_RE = /^[BCDFGHJKMNPRSTVWXZ2-9]{4}$/;

export function normalizeCode(raw) {
  const code = String(raw || '')
    .trim()
    .toUpperCase();
  return CODE_RE.test(code) ? code : null;
}

export function challengePath(code) {
  return `/challenge/${code}`;
}

export function challengeUrl(code) {
  return `${window.location.origin}${challengePath(code)}`;
}

// Creates a challenge and navigates to it. Returns an error message on failure.
export async function createAndOpenChallenge() {
  const { ok, data } = await challengesApi.create();
  if (!ok || !data?.code) {
    return data?.error || 'Could not create a challenge. Please try again.';
  }
  window.location.href = challengePath(data.code);
  return null;
}
