const COOKIE_NAME = 'woggle-played';

export function getPlayedCookie() {
  const match = document.cookie
    .split('; ')
    .find((row) => row.startsWith(`${COOKIE_NAME}=`));
  return match ? decodeURIComponent(match.split('=')[1]) : null;
}

export function setPlayedCookie(dateStr) {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(0, 0, 0, 0);
  document.cookie = `${COOKIE_NAME}=${encodeURIComponent(dateStr)}; expires=${tomorrow.toUTCString()}; path=/; SameSite=Lax`;
}

export function clearPlayedCookie() {
  document.cookie = `${COOKIE_NAME}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; SameSite=Lax`;
}
