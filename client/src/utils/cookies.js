const PLAYED_COOKIE = 'woggle-played';
const OVERRIDE_COOKIE = 'woggle-override';

function read(name) {
  const match = document.cookie
    .split('; ')
    .find((row) => row.startsWith(`${name}=`));
  return match ? decodeURIComponent(match.split('=')[1]) : null;
}

function writeUntilMidnight(name, value) {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(0, 0, 0, 0);
  document.cookie = `${name}=${encodeURIComponent(value)}; expires=${tomorrow.toUTCString()}; path=/; SameSite=Lax`;
}

function clear(name) {
  document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; SameSite=Lax`;
}

export function getPlayedCookie() { return read(PLAYED_COOKIE); }
export function setPlayedCookie(dateStr) { writeUntilMidnight(PLAYED_COOKIE, dateStr); }
export function clearPlayedCookie() { clear(PLAYED_COOKIE); }

export function getOverrideCookie() { return read(OVERRIDE_COOKIE); }
export function setOverrideCookie(dateStr) { writeUntilMidnight(OVERRIDE_COOKIE, dateStr); }
export function clearOverrideCookie() { clear(OVERRIDE_COOKIE); }
