"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export function useTimer(initialSeconds: number) {
  const [secondsLeft, setSecondsLeft] = useState(initialSeconds);
  const [isRunning, setIsRunning] = useState(false);
  const intervalRef = useRef<number | null>(null);

  const stop = useCallback(() => setIsRunning(false), []);
  const start = useCallback(() => setIsRunning(true), []);
  const reset = useCallback((nextSeconds = initialSeconds) => {
    setIsRunning(false);
    setSecondsLeft(nextSeconds);
  }, [initialSeconds]);

  useEffect(() => {
    if (!isRunning) {
      if (intervalRef.current !== null) {
        window.clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    intervalRef.current = window.setInterval(() => {
      setSecondsLeft(prev => (prev > 0 ? prev - 1 : 0));
    }, 1000);

    return () => {
      if (intervalRef.current !== null) window.clearInterval(intervalRef.current);
      intervalRef.current = null;
    };
  }, [isRunning]);

  useEffect(() => {
    if (secondsLeft === 0) stop();
  }, [secondsLeft, stop]);

  return { secondsLeft, isRunning, start, stop, reset };
}
