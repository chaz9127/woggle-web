import { useCallback, useEffect, useMemo, useState } from "react";
import { generateBoard, isAdjacent } from "../utils/board";
import { todayDateString } from "../utils/random";
import { scrabbleScore, tilesToWord, tilesToLetterCount } from "../utils/scoring";
import { checkWord, suggestWord } from "./useDictionary";
import { getPlayedCookie, setPlayedCookie, clearPlayedCookie } from "../utils/cookies";

export const GAME_DURATION_SECONDS = 120;
const RESULT_KEY_PREFIX = "woggle-result-";

function loadResult(dateStr) {
  try {
    const raw = localStorage.getItem(RESULT_KEY_PREFIX + dateStr);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed?.foundWords) ? parsed.foundWords : null;
  } catch {
    return null;
  }
}

function saveResult(dateStr, foundWords) {
  try {
    localStorage.setItem(
      RESULT_KEY_PREFIX + dateStr,
      JSON.stringify({ foundWords })
    );
  } catch {
    // ignore storage errors (quota / privacy mode)
  }
}

function clearResult(dateStr) {
  try {
    localStorage.removeItem(RESULT_KEY_PREFIX + dateStr);
  } catch {
    // ignore
  }
}

export function useGame({ clearAfterInvalid = false } = {}) {
  const dateStr = useMemo(() => todayDateString(), []);
  const board = useMemo(() => generateBoard(dateStr), [dateStr]);

  const initiallyLocked = getPlayedCookie() === dateStr;
  const [phase, setPhase] = useState(() => (initiallyLocked ? "locked" : "idle"));
  const [selection, setSelection] = useState([]);
  const [foundWords, setFoundWords] = useState(() =>
    initiallyLocked ? loadResult(dateStr) ?? [] : []
  );
  const [error, setError] = useState("");
  const [invalidWord, setInvalidWord] = useState("");
  const [suggested, setSuggested] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [startTime, setStartTime] = useState(null);
  const [remaining, setRemaining] = useState(GAME_DURATION_SECONDS);

  useEffect(() => {
    if (phase !== "playing" || startTime == null) return;
    const tick = () => {
      const elapsed = Math.floor((Date.now() - startTime) / 1000);
      const left = Math.max(0, GAME_DURATION_SECONDS - elapsed);
      setRemaining(left);
      if (left === 0) {
        setPhase("done");
        setPlayedCookie(dateStr);
      }
    };
    tick();
    const id = setInterval(tick, 250);
    return () => clearInterval(id);
  }, [phase, startTime, dateStr]);

  useEffect(() => {
    if (!error) return;
    if (invalidWord) return; // keep sticky so the user can click "Suggest?"
    const id = setTimeout(() => setError(""), 1800);
    return () => clearTimeout(id);
  }, [error, invalidWord]);

  useEffect(() => {
    if (phase === "done" || phase === "locked") {
      saveResult(dateStr, foundWords);
    }
  }, [phase, dateStr, foundWords]);

  const selectTile = useCallback((tile) => {
    setError("");
    setInvalidWord("");
    setSuggested(false);
    setSelection((prev) => {
      if (prev.length === 0) return [tile];
      const last = prev[prev.length - 1];
      if (last.id === tile.id) return prev.slice(0, -1);
      if (prev.some((t) => t.id === tile.id)) return prev;
      if (!isAdjacent(last, tile)) return prev;
      return [...prev, tile];
    });
  }, []);

  const clearSelection = useCallback(() => {
    setSelection([]);
    setError("");
    setInvalidWord("");
    setSuggested(false);
  }, []);

  const submitWord = useCallback(async () => {
    if (submitting || phase !== "playing") return;
    const word = tilesToWord(selection);
    const letterCount = tilesToLetterCount(selection);
    if (letterCount < 3) {
      setError("Too short!");
      if (clearAfterInvalid) setSelection([]);
      return;
    }
    if (foundWords.some((w) => w.word === word)) {
      setError("Already found");
      return;
    }
    setSubmitting(true);
    const ok = await checkWord(word);
    setSubmitting(false);
    if (!ok) {
      setError("Not a valid word");
      setInvalidWord(word);
      setSuggested(false);
      if (clearAfterInvalid) setSelection([]);
      return;
    }
    const entry = {
      word,
      letterCount,
      scrabble: scrabbleScore(selection),
      tileIds: selection.map((t) => t.id),
    };
    setFoundWords((prev) => [entry, ...prev]);
    setSelection([]);
    setInvalidWord("");
    setSuggested(false);
  }, [selection, foundWords, submitting, phase, clearAfterInvalid]);

  const suggestInvalid = useCallback(async () => {
    if (!invalidWord || suggested) return;
    setSuggested(true);
    await suggestWord(invalidWord);
  }, [invalidWord, suggested]);

  const totals = useMemo(
    () =>
      foundWords.reduce(
        (acc, w) => ({ scrabble: acc.scrabble + w.scrabble }),
        { scrabble: 0 }
      ),
    [foundWords]
  );

  const startGame = useCallback(() => {
    setSelection([]);
    setFoundWords([]);
    setError("");
    setInvalidWord("");
    setSuggested(false);
    setRemaining(GAME_DURATION_SECONDS);
    setStartTime(Date.now());
    setPhase("playing");
  }, []);

  const dismissSummary = useCallback(() => {
    setPhase("locked");
  }, []);

  const resetCookie = useCallback(() => {
    clearPlayedCookie();
    clearResult(dateStr);
    setPhase("idle");
    setSelection([]);
    setFoundWords([]);
    setRemaining(GAME_DURATION_SECONDS);
    setStartTime(null);
  }, [dateStr]);

  const hasPlayedCookie = phase === "locked" || getPlayedCookie() === dateStr;

  return {
    dateStr,
    board,
    phase,
    selection,
    foundWords,
    error,
    invalidWord,
    suggested,
    submitting,
    remaining,
    totals,
    hasPlayedCookie,
    selectTile,
    clearSelection,
    submitWord,
    suggestInvalid,
    startGame,
    dismissSummary,
    resetCookie,
  };
}
