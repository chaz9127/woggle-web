export default function StartScreen({
  dateStr,
  phase,
  hasPlayedCookie,
  onStart,
  onResetCookie,
  totals,
  foundWords,
}) {
  const locked = phase === "locked";
  return (
    <div className="start">
      <div className="start__card">
        <h2 className="start__title">{locked ? "See you tomorrow!" : "Ready to play?"}</h2>
        <p className="start__date">Daily puzzle · {dateStr}</p>

        {locked ? (
          <>
            <p className="start__lead">
              You've already played today's Woggle. A new board unlocks at
              midnight.
            </p>
            {foundWords?.length > 0 && (
              <div className="start__recap">
                <div>
                  <span>Words</span>
                  <strong>{foundWords.length}</strong>
                </div>
                <div>
                  <span>Score</span>
                  <strong>{totals.scrabble}</strong>
                </div>
              </div>
            )}
          </>
        ) : (
          <>
            <p className="start__lead">
              Find as many words as you can in <strong>2 minutes</strong>.
              Tap adjacent letters (including diagonals) to spell words of 3+
              letters. Once the timer runs out, you're done for the day.
            </p>
            <button
              type="button"
              className="btn btn--primary start__play"
              onClick={onStart}
            >
              Play
            </button>
          </>
        )}

        {hasPlayedCookie && (
          <button
            type="button"
            className="btn btn--ghost start__reset"
            onClick={onResetCookie}
            title="Dev only: clear the daily-play cookie"
          >
            Dev: Clear cookie & play again
          </button>
        )}
      </div>
    </div>
  );
}
