import { useEffect, useState } from 'react';
import { Flag, List } from 'lucide-react';
import { todayDateString } from '../utils/random';
import { isPrivilegedUser } from '../utils/roles';
import { usePageTitle } from '../hooks/usePageTitle';
import { useAuth } from '../auth/AuthContext';
import Modal from './Modal';

async function apiFetch(path) {
  const res = await fetch(path, { credentials: 'include' });
  if (!res.ok) throw new Error('Failed');
  return res.json();
}

// onFlag is only passed for testers/admins viewing the answer key.
function WordsView({ words, title = 'Words', onFlag, flagged }) {
  const sorted = [...words].sort(
    (a, b) => b.scrabble - a.scrabble || a.word.localeCompare(b.word)
  );
  if (sorted.length === 0) {
    return <p className="stats__empty">No words found in this game.</p>;
  }
  return (
    <div className="wordlist">
      <h2 className="wordlist__title">
        {title} ({sorted.length})
      </h2>
      <ul className="wordlist__list">
        {sorted.map((w) => (
          <li key={w.word} className="wordlist__item">
            <span className="wordlist__word">{w.word}</span>
            <span className="wordlist__meta">
              <span title="Letters">{w.letterCount}L</span>
              <span title="Score" className="wordlist__scrabble">
                {w.scrabble}
              </span>
              {onFlag && (
                <button
                  type="button"
                  className={`wordlist__flag ${flagged.has(w.word) ? 'wordlist__flag--flagged' : ''}`}
                  disabled={flagged.has(w.word)}
                  title={
                    flagged.has(w.word)
                      ? 'Flagged for removal'
                      : 'Flag as fake word'
                  }
                  aria-label={
                    flagged.has(w.word)
                      ? `${w.word} flagged for removal`
                      : `Flag ${w.word} as a fake word`
                  }
                  onClick={() => onFlag(w.word)}
                >
                  <Flag size={14} aria-hidden="true" />
                </button>
              )}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function LeaderboardsPage() {
  const { user } = useAuth();
  const today = todayDateString();

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [metric, setMetric] = useState('score');
  const [tab, setTab] = useState('today');
  const [date, setDate] = useState(today);
  const [wordsModal, setWordsModal] = useState(null);

  usePageTitle('Leaderboard');

  // Re-fetch when the signed-in user changes (sign in/out) as well as on date
  // change: word visibility depends on who is viewing, so stale rows from a
  // previous auth state must not linger. Also close any open words modal.
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setWordsModal(null);
    apiFetch(`/api/games/leaderboard?date=${date}`)
      .then((d) => {
        if (!cancelled) setData(d);
      })
      .catch(() => {
        if (!cancelled) setData(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [date, user?.id]);

  // The answer key follows the same visibility rules as other players' words,
  // so the server decides; a 403 means the viewer hasn't finished this board.
  const [answerKey, setAnswerKey] = useState(null);
  const hasGames = !!data?.today?.length;
  useEffect(() => {
    if (!hasGames) return;
    let cancelled = false;
    fetch(`/api/games/possible-words?date=${date}`, { credentials: 'include' })
      .then(async (res) => {
        if (cancelled) return;
        if (res.ok) {
          const d = await res.json();
          if (!cancelled) setAnswerKey({ date, words: d.words });
        } else if (res.status === 403) {
          setAnswerKey({ date, gated: true });
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
      setAnswerKey(null);
    };
  }, [date, user?.id, hasGames]);

  const viewingToday = date === today;

  const showsGameDate = tab === 'all-time';
  const rows = !data
    ? []
    : metric === 'words'
      ? ((tab === 'today' ? data.mostWordsToday : data.mostWordsAllTime) ?? [])
      : tab === 'today'
        ? data.today
        : data.allTime;

  // Words flagged this session, so the button reflects the click immediately.
  // The server ignores repeat flags, so re-flagging after a reload is harmless.
  const [flagged, setFlagged] = useState(() => new Set());
  const flagWord = async (word) => {
    if (!window.confirm(`Flag "${word.toUpperCase()}" as a fake word?`)) return;
    const res = await fetch(`/api/word/${encodeURIComponent(word)}/flag`, {
      method: 'POST',
      credentials: 'include',
    }).catch(() => null);
    if (res?.ok) {
      setFlagged((prev) => new Set(prev).add(word));
    } else {
      window.alert('Could not flag that word. Please try again.');
    }
  };

  const answerKeyReason = !user
    ? 'Sign in and finish today’s game to view the answer key'
    : 'Finish today’s game to view the answer key';

  return (
    <div className="leaderboards">
      <h2 className="leaderboards__title">Leaderboards</h2>
      <p className="leaderboards__disclaimer">
        You must create an account to be included on the leaderboards.
      </p>

      <div className="leaderboards__metric" role="group" aria-label="Rank by">
        {[
          ['score', 'Highest Score'],
          ['words', 'Most Words'],
        ].map(([value, label]) => (
          <button
            key={value}
            type="button"
            aria-pressed={metric === value}
            className={`leaderboards__metric-btn ${metric === value ? 'leaderboards__metric-btn--active' : ''}`}
            onClick={() => setMetric(value)}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="leaderboards__tabs" role="tablist">
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'today'}
          className={`leaderboards__tab ${tab === 'today' ? 'leaderboards__tab--active' : ''}`}
          onClick={() => setTab('today')}
        >
          {viewingToday ? 'Today' : 'Daily'}{' '}
          {data?.todayDate ? `(${data.todayDate})` : ''}
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'all-time'}
          className={`leaderboards__tab ${tab === 'all-time' ? 'leaderboards__tab--active' : ''}`}
          onClick={() => setTab('all-time')}
        >
          All-Time
        </button>
      </div>

      {tab === 'today' && (
        <div className="leaderboards__date">
          <input
            type="date"
            value={date}
            max={today}
            onChange={(e) => setDate(e.target.value || today)}
          />
          {answerKey && answerKey.date === date && (
            <span className="leaderboard__words-tip-wrap">
              <button
                type="button"
                className={`btn btn--ghost btn--inline ${answerKey.gated ? 'leaderboard__words-btn--disabled' : ''}`}
                aria-disabled={!!answerKey.gated}
                aria-label={
                  answerKey.gated ? answerKeyReason : 'View the answer key'
                }
                onClick={
                  answerKey.gated
                    ? undefined
                    : () =>
                        setWordsModal({
                          title: 'Answer key',
                          isAnswerKey: true,
                          date,
                          words: answerKey.words.map((w) => ({
                            ...w,
                            letterCount: w.word.length,
                          })),
                        })
                }
              >
                <List size={16} aria-hidden="true" /> <span>&nbsp;Answer key</span>
              </button>
              {answerKey.gated && (
                <span className="leaderboard__words-tip" role="tooltip">
                  {answerKeyReason}
                </span>
              )}
            </span>
          )}
          {!viewingToday && (
            <button
              type="button"
              className="btn btn--ghost btn--inline"
              onClick={() => setDate(today)}
            >
              Back to today
            </button>
          )}
        </div>
      )}

      <section className="leaderboards__panel">
        {loading ? (
          <p className="stats__empty">Loading…</p>
        ) : !data || rows.length === 0 ? (
          <p className="stats__empty">
            {tab === 'today'
              ? viewingToday
                ? 'No games today yet.'
                : 'No games on this date.'
              : 'No games yet.'}
          </p>
        ) : (
          <ol className="leaderboard__list">
            {rows.map((row, i) => {
              const rowDate = showsGameDate ? row.gameDate : data.todayDate;
              const gated = row.words == null;
              const reason = !user
                ? 'Sign in and finish today’s game to view words'
                : 'Finish today’s game to view words';
              return (
                <li key={i} className="leaderboard__row">
                  <span className="leaderboard__rank">{i + 1}</span>
                  <span className="leaderboard__name">{row.username}</span>
                  {showsGameDate && (
                    <span className="leaderboard__date">{row.gameDate}</span>
                  )}
                  {metric === 'words' ? (
                    <span
                      className="leaderboard__score"
                      title={`${row.wordCount} words`}
                    >
                      {row.wordCount}
                    </span>
                  ) : (
                    <span className="leaderboard__score">{row.score}</span>
                  )}
                  <span className="leaderboard__words-tip-wrap">
                    <button
                      type="button"
                      className={`leaderboard__words-btn ${gated ? 'leaderboard__words-btn--disabled' : ''}`}
                      aria-disabled={gated}
                      aria-label={
                        gated ? reason : `View ${row.username}’s words`
                      }
                      onClick={
                        gated
                          ? undefined
                          : () =>
                              setWordsModal({
                                title: row.username,
                                date: rowDate,
                                words: row.words,
                              })
                      }
                    >
                      <List size={16} aria-hidden="true" />
                    </button>
                    <span className="leaderboard__words-tip" role="tooltip">
                      {gated ? reason : `View ${row.username}’s words`}
                    </span>
                  </span>
                </li>
              );
            })}
          </ol>
        )}
      </section>

      <Modal
        open={!!wordsModal}
        title={wordsModal ? `${wordsModal.title} — ${wordsModal.date}` : ''}
        onClose={() => setWordsModal(null)}
      >
        {wordsModal && (
          <WordsView
            words={wordsModal.words}
            title={wordsModal.isAnswerKey ? 'All words' : 'Words'}
            onFlag={
              wordsModal.isAnswerKey && isPrivilegedUser(user)
                ? flagWord
                : undefined
            }
            flagged={flagged}
          />
        )}
      </Modal>
    </div>
  );
}
