import { useCallback, useEffect, useMemo, useState } from "react";
import { generateBoard, isAdjacent } from "../utils/board";
import { todayDateString } from "../utils/random";
import { boggleScore, scrabbleScore, tilesToWord, tilesToLetterCount } from "../utils/scoring";
import { checkWord } from "./useDictionary";

export function useGame() {
  const dateStr = useMemo(() => todayDateString(), []);
  const board = useMemo(() => generateBoard(dateStr), [dateStr]);

  const [selection, setSelection] = useState([]);
  const [foundWords, setFoundWords] = useState([]);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [startTime] = useState(() => Date.now());
  const [elapsed, setElapsed] = useState(0);
  const [finished, setFinished] = useState(false);

  useEffect(() => {
    if (finished) return;
    const id = setInterval(() => setElapsed(Math.floor((Date.now() - startTime) / 1000)), 1000);
    return () => clearInterval(id);
  }, [startTime, finished]);

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
    if (submitting) return;
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
      boggle: boggleScore(letterCount),
      scrabble: scrabbleScore(selection),
    };
    setFoundWords((prev) => [entry, ...prev]);
    setSelection([]);
  }, [selection, foundWords, submitting]);

  const totals = useMemo(() => foundWords.reduce((acc, w) => ({ boggle: acc.boggle + w.boggle, scrabble: acc.scrabble + w.scrabble }), { boggle: 0, scrabble: 0 }), [foundWords]);

  const finish = useCallback(() => setFinished(true), []);
  const resumeGame = useCallback(() => setFinished(false), []);

  return {
    dateStr,
    board,
    selection,
    foundWords,
    error,
    submitting,
    elapsed,
    finished,
    totals,
    selectTile,
    clearSelection,
    submitWord,
    finish,
    resumeGame,
  };
}
