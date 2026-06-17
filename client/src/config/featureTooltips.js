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
  viewLeaderboard: {
    name: 'viewLeaderboard',
    targetId: 'header-menu-button',
    title: 'New Feature!',
    body: 'You can now change your username or password from the menu.',
    show: ({ user, dismissed }) => !!user && !dismissed,
  },
  viewWordsOnLeaderboard: {
    name: 'viewWordsOnLeaderboard',
    targetId: 'header-menu-button',
    title: 'New Feature!',
    body: "You can now view the words that each player has submitted on the leaderboard after you've played a game.",
    show: ({ user, dismissed }) => !!user && !dismissed,
  },
  leaderboardSignUp: {
    name: 'leaderboardSignUp',
    targetId: 'start-signup-button',
    title: 'Sign up for the leaderboard!',
    body: 'Sign up to be automatically added to the leaderboard and see how you rank against others!',
    show: ({ user, dismissed }) => !user && !dismissed,
  },
};
