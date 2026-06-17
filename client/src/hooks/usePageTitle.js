import { useEffect } from 'react';

const DEFAULT_TITLE = 'Woggle: Daily Word Game';

// Sets document.title to "Woggle - {name}" while the component is mounted,
// restoring the default home-page title on unmount. Pass a falsy name to
// keep the default title (used by the home page).
export function usePageTitle(name) {
  useEffect(() => {
    document.title = name ? `Woggle: ${name}` : DEFAULT_TITLE;
    return () => {
      document.title = DEFAULT_TITLE;
    };
  }, [name]);
}
