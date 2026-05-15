import { useState } from "react";
import { buildShareText, copyToClipboard } from "../utils/share";
import { useAuth } from "../auth/AuthContext";

export default function StartScreen({
  dateStr,
  phase,
  locked: lockedProp,
  onStart,
  onOverride,
  onSignUp,
  totals,
  foundWords,
  board,
  theme,
  stats,
}) {
  const locked = phase === "locked" || lockedProp;
  const [shareStatus, setShareStatus] = useState("");
  const { user } = useAuth();
  const isPrivileged = user?.role === "admin" || user?.role === "tester";

  const sharePreview =
    locked && board
      ? buildShareText({ board, foundWords, totals, dateStr, theme })
      : "";

  const handleShare = async () => {
    const text = buildShareText({ board, foundWords, totals, dateStr, theme });
    const ok = await copyToClipboard(text);
    setShareStatus(ok ? "Copied!" : "Copy failed");
    setTimeout(() => setShareStatus(""), 1800);
  };

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
            {(foundWords?.length > 0 || stats) && (
              <div className="start__recap">
                {stats && (
                  <>
                    <div>
                      <span>Streak</span>
                      <strong>{stats.currentStreak}</strong>
                    </div>
                    <div>
                      <span>Total</span>
                      <strong>{stats.totalGames}</strong>
                    </div>
                  </>
                )}
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
            {sharePreview && (
              <pre className="start__share-preview" aria-label="Share preview">
                {sharePreview}
              </pre>
            )}
            <button
              type="button"
              className="btn btn--primary"
              onClick={handleShare}
            >
              {shareStatus || "Share"}
            </button>
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
            {!user && (
              <button
                type="button"
                className="btn btn--ghost start__signup"
                onClick={onSignUp}
              >
                Sign up
              </button>
            )}
          </>
        )}

        {locked && (import.meta.env.DEV || isPrivileged) && (
          <button
            type="button"
            className="btn btn--ghost start__reset"
            onClick={onOverride}
            title="Override the daily play limit (one game)"
          >
            Tester: Play again
          </button>
        )}
      </div>
    </div>
  );
}
