// Google Analytics (GA4) integration.
// The measurement ID is read from VITE_GA_MEASUREMENT_ID so it can differ per
// environment and stays out of source control. If unset (e.g. local dev), all
// calls below become no-ops and no gtag script is loaded.

const MEASUREMENT_ID = import.meta.env.VITE_GA_MEASUREMENT_ID;

let initialized = false;

export function initAnalytics() {
  if (initialized || !MEASUREMENT_ID) return;
  initialized = true;

  const script = document.createElement('script');
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${MEASUREMENT_ID}`;
  document.head.appendChild(script);

  window.dataLayer = window.dataLayer || [];
  // gtag must use `arguments`, so it can't be an arrow function.
  function gtag() {
    window.dataLayer.push(arguments);
  }
  window.gtag = gtag;

  gtag('js', new Date());
  // Page path, referrer, device, and geography are captured automatically by
  // the default page_view that gtag sends on config.
  gtag('config', MEASUREMENT_ID);
}

// Sets a sticky user property so reports can segment by signed-up vs guest.
// `user_type` must be registered as a custom dimension in the GA4 admin
// (Admin → Custom definitions) before it shows up in reports.
export function setUserType(isRegistered) {
  if (!window.gtag) return;
  window.gtag('set', 'user_properties', {
    user_type: isRegistered ? 'registered' : 'guest',
  });
}

// Fires a distinct event for each share type so they can be counted
// separately in GA reports.
export function trackShareScore() {
  if (!window.gtag) return;
  window.gtag('event', 'share_score', { method: 'copy' });
}

export function trackShareWords() {
  if (!window.gtag) return;
  window.gtag('event', 'share_words', { method: 'copy' });
}
