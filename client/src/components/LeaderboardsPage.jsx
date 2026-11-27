import { useEffect, useState } from 'react';
import { List } from 'lucide-react';
import { todayDateString } from '../utils/random';
import { usePageTitle } from '../hooks/usePageTitle';
import { useAuth } from '../auth/AuthContext';
import Modal from './Modal';

async function apiFetch(path) {
  const res = await fetch(path, { credentials: 'include' });
  if (!res.ok) throw new Error('Failed');
  return res.json();
}

function WordsView({ words, title = 'Words' }) {
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

  const rows = !data ? [] : tab === 'today' ? data.today : data.allTime;

  const answerKeyReason = !user
    ? 'Sign in and finish today’s game to view the answer key'
    : 'Finish today’s game to view the answer key';

  return (
    <div className="leaderboards">
      <h2 className="leaderboards__title">Leaderboards</h2>
      <p className="leaderboards__disclaimer">
        You must create an account to be included on the leaderboards.
      </p>

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
                          date,
                          words: answerKey.words.map((w) => ({
                            ...w,
                            letterCount: w.word.length,
                          })),
                        })
                }
              >
                <List size={16} aria-hidden="true" /> Answer key
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
              const rowDate =
                tab === 'all-time' ? row.gameDate : data.todayDate;
              const gated = row.words == null;
              const reason = !user
                ? 'Sign in and finish today’s game to view words'
                : 'Finish today’s game to view words';
              return (
                <li key={i} className="leaderboard__row">
                  <span className="leaderboard__rank">{i + 1}</span>
                  <span className="leaderboard__name">{row.username}</span>
                  {tab === 'all-time' && (
                    <span className="leaderboard__date">{row.gameDate}</span>
                  )}
                  <span className="leaderboard__score">{row.score}</span>
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
            title={wordsModal.title === 'Answer key' ? 'All words' : 'Words'}
          />
        )}
      </Modal>
    </div>
  );
}
