import { useCallback, useEffect, useMemo, useState } from "react";
import { generateBoard, isAdjacent } from "../utils/board";
import { todayDateString } from "../utils/random";
import { scrabbleScore, tilesToWord, tilesToLetterCount } from "../utils/scoring";
import { checkWord } from "./useDictionary";
import { getPlayedCookie, setPlayedCookie, clearPlayedCookie } from "../utils/cookies";

export const GAME_DURATION_SECONDS = 120;

export function useGame() {
  const dateStr = useMemo(() => todayDateString(), []);
  const board = useMemo(() => generateBoard(dateStr), [dateStr]);

  const [phase, setPhase] = useState(() =>
    getPlayedCookie() === dateStr ? "locked" : "idle"
  );
  const [selection, setSelection] = useState([]);
  const [foundWords, setFoundWords] = useState([]);
  const [error, setError] = useState("");
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
    const id = setTimeout(() => setError(""), 1800);
    return () => clearTimeout(id);
  }, [error]);

  const selectTile = useCallback((tile) => {
    setError("");
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
  }, []);

  const submitWord = useCallback(async () => {
    if (submitting || phase !== "playing") return;
    const word = tilesToWord(selection);
    const letterCount = tilesToLetterCount(selection);
    if (letterCount < 3) {
      setError("Too short!");
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
      return;
    }
    const entry = {
      word,
      letterCount,
      scrabble: scrabbleScore(selection),
    };
    setFoundWords((prev) => [entry, ...prev]);
    setSelection([]);
  }, [selection, foundWords, submitting, phase]);

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
    setRemaining(GAME_DURATION_SECONDS);
    setStartTime(Date.now());
    setPhase("playing");
  }, []);

  const dismissSummary = useCallback(() => {
    setPhase("locked");
  }, []);

  const resetCookie = useCallback(() => {
    clearPlayedCookie();
    setPhase("idle");
    setSelection([]);
    setFoundWords([]);
    setRemaining(GAME_DURATION_SECONDS);
    setStartTime(null);
  }, []);

  const hasPlayedCookie = phase === "locked" || getPlayedCookie() === dateStr;

  return {
    dateStr,
    board,
    phase,
    selection,
    foundWords,
    error,
    submitting,
    remaining,
    totals,
    hasPlayedCookie,
    selectTile,
    clearSelection,
    submitWord,
    startGame,
    dismissSummary,
    resetCookie,
  };
}
