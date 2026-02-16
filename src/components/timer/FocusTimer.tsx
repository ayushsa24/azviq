"use client";
import { useState, useEffect } from "react";

export default function FocusTimer() {
  const [time, setTime] = useState(1500); // 25 min
  const [running, setRunning] = useState(false);

  useEffect(() => {
    if (!running) return;

    const timer = setInterval(() => {
      setTime(t => t - 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [running]);

  return (
    <div>
      <h2 className="text-xl">
        {Math.floor(time / 60)}:{("0" + (time % 60)).slice(-2)}
      </h2>
      <button onClick={() => setRunning(!running)}>
        {running ? "Pause" : "Start"}
      </button>
    </div>
  );
}
