import { useCallback, useEffect, useRef, useState } from 'react';
import BetaBanner from './BetaBanner';
import ChallengeResults from './ChallengeResults';
import ChallengeRulesModal from './ChallengeRulesModal';
import GamePlay from './GamePlay';
import { useAuth } from '../auth/AuthContext';
import { useGame } from '../hooks/useGame';
import { clearResult } from '../utils/gameStorage';
import { copyToClipboard } from '../utils/share';
import {
  challengesApi,
  challengePath,
  challengeUrl,
  createAndOpenChallenge,
  normalizeCode,
} from '../utils/challengesApi';

const storageKeyFor = (code) => `challenge-${code}`;

function ShareCode({ code }) {
  const [status, setStatus] = useState('');
  const url = challengeUrl(code);

  const share = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Woggle challenge',
          text: `I challenge you to a game of Woggle! Code: ${code}`,
          url,
        });
        return;
      } catch {
        // dismissed or unsupported: fall back to copying the link
      }
    }
    const ok = await copyToClipboard(url);
    setStatus(ok ? 'Link copied!' : 'Copy failed');
    setTimeout(() => setStatus(''), 1800);
  };

  return (
    <div className="share-code">
      <span className="share-code__label">Challenge code</span>
      <strong className="share-code__code" aria-label={`Code ${code}`}>
        {code}
      </strong>
      <button type="button" className="btn btn--primary" onClick={share}>
        {status || 'Share code'}
      </button>
      <span className="share-code__url">{url}</span>
    </div>
  );
}

// One player's timed run. Mounted only after the server has recorded the
// start, so a refresh remounts it with the same start time and the words
// saved so far, rather than offering a fresh attempt.
function ChallengeRun({ code, seed, startTime, onFinished, onTimer }) {
  const { user } = useAuth();
  const storageKey = storageKeyFor(code);
  const game = useGame({
    clearAfterInvalid: user ? !!user.clearAfterInvalid : true,
    challenge: { seed, startTime, storageKey },
  });
  const { phase, remaining, foundWords } = game;
  const [submitError, setSubmitError] = useState('');

  useEffect(() => {
    onTimer(phase === 'playing' || phase === 'done' ? remaining : null);
  }, [phase, remaining, onTimer]);
  useEffect(() => () => onTimer(null), [onTimer]);

  // Submits once the clock runs out; `attempt` bumps on Retry. The server
  // ignores repeat submissions, so a double effect run in dev is harmless.
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    if (phase !== 'done') return;
    let cancelled = false;
    challengesApi.complete(code, foundWords).then(({ status, data }) => {
      if (cancelled) return;
      // 410 (retracted) and 200 both return the current view to show next.
      if (data?.code) {
        clearResult(storageKey);
        onFinished(data);
      } else {
        setSubmitError(
          status === 0
            ? 'Could not reach the server. Check your connection and retry.'
            : data?.error || 'Could not submit your words. Please retry.'
        );
      }
    });
    return () => {
      cancelled = true;
    };
  }, [phase, attempt, code, foundWords, storageKey, onFinished]);

  const retry = () => {
    setSubmitError('');
    setAttempt((n) => n + 1);
  };

  if (phase === 'done') {
    return (
      <div className="start">
        <div className="start__card">
          <h2 className="start__title">Time's up!</h2>
          {submitError ? (
            <>
              <p className="challenge-home__error">{submitError}</p>
              <button
                type="button"
                className="btn btn--primary"
                onClick={retry}
              >
                Retry
              </button>
            </>
          ) : (
            <p className="start__lead">Submitting your words…</p>
          )}
        </div>
      </div>
    );
  }

  return (
    <GamePlay
      game={game}
      submitAfterSwipe={user ? user.submitAfterSwipe : true}
    />
  );
}

function Card({ eyebrow, title, children }) {
  return (
    <div className="start">
      <div className="start__card">
        {eyebrow && <p className="start__date">{eyebrow}</p>}
        <h2 className="start__title">{title}</h2>
        {children}
      </div>
    </div>
  );
}

const REJECT_CONFIRM =
  "Reject this challenge? It ends for both players, no scores are shown, and it won't count toward either record.";

export default function ChallengePage({
  code: rawCode,
  onRequireAuth,
  onTimer,
  onSeen,
}) {
  const { user, loading: authLoading } = useAuth();
  const code = normalizeCode(rawCode);
  const userId = user?.id ?? null;
  const [view, setView] = useState(null);
  const [loadError, setLoadError] = useState(null); // 'notfound' | 'error'
  const [countdown, setCountdown] = useState(null);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState('');
  const [rulesOpen, setRulesOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const startingRef = useRef(false);

  // Each view records the server clock minus the local clock at arrival, so
  // the run timer follows server time even if this device's clock is off.
  const applyView = useCallback((v) => {
    setView({ ...v, clockOffset: v.serverNow - Date.now() });
  }, []);

  const handleLoad = useCallback(
    ({ ok, status, data }) => {
      if (ok) applyView(data);
      else setLoadError(status === 404 ? 'notfound' : 'error');
    },
    [applyView]
  );
  const load = useCallback(
    () => challengesApi.get(code).then(handleLoad),
    [code, handleLoad]
  );

  // Keep the address bar canonical (uppercase) so shared links match.
  useEffect(() => {
    if (code && rawCode !== code) {
      window.history.replaceState({}, '', challengePath(code));
    }
  }, [code, rawCode]);

  useEffect(() => {
    if (!userId || !code) return;
    let cancelled = false;
    challengesApi.get(code).then((result) => {
      if (!cancelled) handleLoad(result);
    });
    return () => {
      cancelled = true;
    };
  }, [userId, code, handleLoad]);

  // While waiting on the other player, pick up changes when the tab regains
  // focus (no websockets).
  const waiting =
    view?.me &&
    view.status !== 'completed' &&
    view.status !== 'retracted' &&
    view.status !== 'rejected';
  useEffect(() => {
    if (!waiting) return;
    const onFocus = () => load();
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, [waiting, load]);

  // Opening finished results clears this challenge's green dot.
  const unseen = !!view?.unseen;
  useEffect(() => {
    if (!unseen) return;
    challengesApi.seen(code).then(() => onSeen?.());
  }, [unseen, code, onSeen]);

  // Pre-run 3-2-1. The server start time is recorded when it reaches zero, so
  // the countdown never eats into the player's two minutes.
  useEffect(() => {
    if (countdown == null) return;
    if (countdown > 0) {
      const id = setTimeout(() => setCountdown((c) => c - 1), 1000);
      return () => clearTimeout(id);
    }
    if (startingRef.current) return;
    startingRef.current = true;
    challengesApi.start(code).then(({ data }) => {
      startingRef.current = false;
      if (data?.code) applyView(data);
      else setActionError(data?.error || 'Could not start your run.');
      setCountdown(null);
    });
  }, [countdown, code, applyView]);

  const act = async (fn, confirmText) => {
    if (confirmText && !window.confirm(confirmText)) return;
    setBusy(true);
    setActionError('');
    const { data } = await fn(code);
    setBusy(false);
    if (data?.code) applyView(data);
    else setActionError(data?.error || 'Something went wrong. Please retry.');
  };

  const newChallenge = async () => {
    setCreating(true);
    const err = await createAndOpenChallenge();
    if (err) {
      setActionError(err);
      setCreating(false);
    }
  };

  const rulesButton = (
    <button type="button" className="btn" onClick={() => setRulesOpen(true)}>
      Rules
    </button>
  );
  const homeLink = (
    <a href="/" className="btn btn--ghost">
      Home
    </a>
  );

  let content;
  let showBanner = true;
  if (!code) {
    content = (
      <Card title="That's not a challenge code">
        <p className="start__lead">
          Challenge codes are 4 letters or numbers, like K7RV.
        </p>
        {homeLink}
      </Card>
    );
  } else if (authLoading) {
    content = null;
  } else if (!user) {
    content = (
      <Card eyebrow={`Challenge ${code}`} title="You've been challenged!">
        <p className="start__lead">
          Sign in or create a free account to play this challenge. You'll come
          straight back here.
        </p>
        <div className="btn-row">
          <button
            type="button"
            className="btn btn--primary"
            onClick={() => onRequireAuth('signin')}
          >
            Sign in
          </button>
          <button
            type="button"
            className="btn"
            onClick={() => onRequireAuth('signup')}
          >
            Sign up
          </button>
        </div>
        {rulesButton}
      </Card>
    );
  } else if (loadError === 'notfound') {
    content = (
      <Card title="No challenge with that code">
        <p className="start__lead">
          Check the code and try again, or start your own challenge.
        </p>
        {homeLink}
      </Card>
    );
  } else if (loadError) {
    content = (
      <Card title="Couldn't load this challenge">
        <button type="button" className="btn btn--primary" onClick={load}>
          Try again
        </button>
      </Card>
    );
  } else if (!view) {
    content = <p className="stats__empty">Loading…</p>;
  } else if (!view.me) {
    // Viewer isn't one of the two players.
    if (view.joinable) {
      content = (
        <Card
          eyebrow={`Challenge ${code}`}
          title={`${view.creator?.username} challenged you!`}
        >
          <p className="start__lead">
            Play the same board as {view.creator?.username}, in your own
            2-minute run. Highest score wins.
          </p>
          {actionError && (
            <p className="challenge-home__error">{actionError}</p>
          )}
          <div className="btn-row">
            <button
              type="button"
              className="btn btn--primary"
              disabled={busy}
              onClick={() => act(challengesApi.join)}
            >
              Accept challenge
            </button>
            {rulesButton}
          </div>
          {view.canReject && (
            <button
              type="button"
              className="btn btn--ghost challenge-page__retract"
              disabled={busy}
              onClick={() => act(challengesApi.reject, REJECT_CONFIRM)}
            >
              Reject challenge
            </button>
          )}
          {homeLink}
        </Card>
      );
    } else if (view.full) {
      content = (
        <Card eyebrow={`Challenge ${code}`} title="This challenge is full">
          <p className="start__lead">
            Two players have already joined this challenge. Ask your friend for
            a new one, or start your own.
          </p>
          <div className="btn-row">
            <button
              type="button"
              className="btn btn--primary"
              disabled={creating}
              onClick={newChallenge}
            >
              Start challenge
            </button>
            {homeLink}
          </div>
        </Card>
      );
    } else {
      content = (
        <Card eyebrow={`Challenge ${code}`} title="This challenge has ended">
          <p className="start__lead">
            It was finished, retracted or rejected, so this code no longer
            works.
          </p>
          <div className="btn-row">
            <button
              type="button"
              className="btn btn--primary"
              disabled={creating}
              onClick={newChallenge}
            >
              Start challenge
            </button>
            {homeLink}
          </div>
        </Card>
      );
    }
  } else if (view.status === 'retracted') {
    content = (
      <Card eyebrow={`Challenge ${code}`} title="Challenge retracted">
        <p className="start__lead">
          {view.role === 'creator'
            ? 'You retracted this challenge.'
            : `${view.creator?.username} retracted this challenge.`}{' '}
          No scores are shown and the code no longer works.
        </p>
        {homeLink}
      </Card>
    );
  } else if (view.status === 'rejected') {
    content = (
      <Card eyebrow={`Challenge ${code}`} title="Challenge rejected">
        <p className="start__lead">
          {view.role === 'opponent'
            ? 'You rejected this challenge.'
            : `${view.opponent?.username} rejected this challenge.`}{' '}
          No scores are shown and it doesn't count toward either record.
        </p>
        {homeLink}
      </Card>
    );
  } else if (view.status === 'completed') {
    content = <ChallengeResults view={view} />;
  } else if (countdown != null) {
    showBanner = false;
    content = (
      <div className="countdown">
        <span className="countdown__label">Get ready…</span>
        <span className="countdown__number" key={countdown}>
          {countdown}
        </span>
      </div>
    );
  } else if (view.me.started && !view.me.finished && view.seed) {
    showBanner = false;
    content = (
      <ChallengeRun
        key={code}
        code={code}
        seed={view.seed}
        startTime={view.me.startedAtMs - view.clockOffset}
        onFinished={applyView}
        onTimer={onTimer}
      />
    );
  } else {
    const opponentName =
      view.role === 'creator'
        ? view.opponent?.username
        : view.creator?.username;
    const waitingForJoin = view.status === 'waiting';
    const title = view.me.finished
      ? `You scored ${view.me.score}`
      : opponentName
        ? `You vs ${opponentName}`
        : 'Your challenge is ready';
    let lead;
    if (view.me.finished) {
      lead = waitingForJoin
        ? "Nobody has accepted yet. Share the code; you'll see results once they've played."
        : view.otherFinished
          ? 'Both runs are in. Loading results…'
          : `Waiting for ${opponentName} to play. You'll see both scores once they finish.`;
    } else if (waitingForJoin) {
      lead =
        'Share the code with a friend. You can play your run now or after they join.';
    } else {
      lead = view.otherFinished
        ? `${opponentName} has played. Your turn! Their score stays hidden until you finish.`
        : 'You both play the same board in your own 2-minute run.';
    }

    content = (
      <Card eyebrow={`Challenge ${code}`} title={title}>
        {view.me.finished && (
          <p className="start__date">
            {view.me.wordCount} {view.me.wordCount === 1 ? 'word' : 'words'}
          </p>
        )}
        <p className="start__lead">{lead}</p>
        {actionError && <p className="challenge-home__error">{actionError}</p>}
        {!view.me.started && (
          <div className="btn-row">
            <button
              type="button"
              className="btn btn--primary start__play"
              onClick={() => {
                setActionError('');
                setCountdown(3);
              }}
            >
              Play my run
            </button>
            {rulesButton}
          </div>
        )}
        {waitingForJoin && view.role === 'creator' && <ShareCode code={code} />}
        {view.canRetract && (
          <button
            type="button"
            className="btn btn--ghost challenge-page__retract"
            disabled={busy}
            onClick={() =>
              act(
                challengesApi.retract,
                'Retract this challenge? It ends for both players, no scores are shown, and the code stops working.'
              )
            }
          >
            Retract challenge
          </button>
        )}
        {view.canReject && (
          <button
            type="button"
            className="btn btn--ghost challenge-page__retract"
            disabled={busy}
            onClick={() => act(challengesApi.reject, REJECT_CONFIRM)}
          >
            Reject challenge
          </button>
        )}
        {view.me.started && homeLink}
      </Card>
    );
  }

  return (
    <div className="challenge-page">
      {showBanner && <BetaBanner />}
      {content}
      <ChallengeRulesModal
        open={rulesOpen}
        onClose={() => setRulesOpen(false)}
      />
    </div>
  );
}
