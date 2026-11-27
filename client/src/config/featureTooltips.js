// Config for "new feature" tooltips.
//
// Each entry:
//   name     - unique id; doubles as the dismissal cookie key and the element id
//   targetId - id of the element the tooltip should anchor to / point at
//   title    - bold heading shown in the tooltip
//   body     - descriptive text shown in the tooltip
//   show     - ({ user, dismissed }) => boolean; whether the tooltip should render.
//              `dismissed` is true once the user has closed it via the X.
//              (The tooltip also only shows when its `targetId` element exists.)
export const featureTooltips = {
  viewWordsOnLeaderboard: {
    name: 'mostWordsLeaderboard',
    targetId: 'header-menu-button',
    title: 'New Leaderboard Just Dropped!',
    body: "Can't crack a high score, but grab every 3-letter word in sight? There's a leaderboard for that now. Pick your strategy wisely.",
    show: ({ user, dismissed }) => !!user && !dismissed,
  },
  leaderboardSignUp2: {
    name: 'leaderboardSignUp2',
    targetId: 'start-signup-button',
    title: 'Join the leaderboard & more!',
    body: 'Create an account to join the leaderboard and save your progress.',
    show: ({ user, dismissed }) => !user && !dismissed,
  },
};
