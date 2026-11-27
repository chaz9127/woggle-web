import { useState } from 'react';

const TAB_KEY = 'woggle-home-tab';

function initialTab() {
  try {
    return sessionStorage.getItem(TAB_KEY) === 'challenge'
      ? 'challenge'
      : 'daily';
  } catch {
    return 'daily';
  }
}

// Homepage switcher between the daily game and Challenge mode. Remembers the
// chosen tab for the browser session so returning from a challenge lands on
// the Challenge tab.
export default function HomeScreen({
  daily,
  challenge,
  dailyPlayed,
  unseenCount,
}) {
  const [tab, setTab] = useState(initialTab);

  const choose = (next) => {
    setTab(next);
    try {
      sessionStorage.setItem(TAB_KEY, next);
    } catch {
      // ignore storage errors
    }
  };

  return (
    <div className="home">
      <div className="home-tabs" role="tablist" aria-label="Game type">
        <button
          type="button"
          role="tab"
          id="home-tab-daily"
          aria-selected={tab === 'daily'}
          aria-controls="home-panel"
          className={`home-tabs__tab ${tab === 'daily' ? 'home-tabs__tab--active' : ''}`}
          onClick={() => choose('daily')}
        >
          Daily
          {dailyPlayed && (
            <span aria-label="played today" className="home-tabs__check">
              ✓
            </span>
          )}
        </button>
        <button
          type="button"
          role="tab"
          id="home-tab-challenge"
          aria-selected={tab === 'challenge'}
          aria-controls="home-panel"
          className={`home-tabs__tab ${tab === 'challenge' ? 'home-tabs__tab--active' : ''}`}
          onClick={() => choose('challenge')}
        >
          Challenge <span className="pill">Beta</span>
          {unseenCount > 0 && (
            <>
              <span className="dot" aria-hidden="true" />
              <span className="visually-hidden">
                {unseenCount} completed challenge
                {unseenCount === 1 ? '' : 's'} with new results
              </span>
            </>
          )}
        </button>
      </div>
      <div
        id="home-panel"
        role="tabpanel"
        aria-labelledby={`home-tab-${tab}`}
        className="home__panel"
      >
        {tab === 'daily' ? daily : challenge}
      </div>
    </div>
  );
}
