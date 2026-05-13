export default function Header({ theme, onToggleTheme, onOpenRules, elapsed }) {
  const mm = String(Math.floor(elapsed / 60)).padStart(1, '0');
  const ss = String(elapsed % 60).padStart(2, '0');
  return (
    <header className="header">
      <h1 className="header__title">Woggle</h1>
      <div className="header__timer" aria-label="Elapsed time">{mm}:{ss}</div>
      <div className="header__actions">
        <button
          type="button"
          className="icon-btn"
          onClick={onOpenRules}
          aria-label="How to play"
          title="How to play"
        >
          ?
        </button>
        <button
          type="button"
          className="icon-btn"
          onClick={onToggleTheme}
          aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
          title="Toggle theme"
        >
          {theme === 'dark' ? '☀' : '☾'}
        </button>
      </div>
    </header>
  );
}
