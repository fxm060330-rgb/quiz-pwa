"use client";

import { useEffect, useState } from "react";

interface Props {
  totalSeconds: number;
  onTimeout: () => void;
  running: boolean;
  onTick?: (sec: number) => void;
}

export default function ExamTimer({ totalSeconds, onTimeout, running, onTick }: Props) {
  const [remaining, setRemaining] = useState(totalSeconds);

  useEffect(() => {
    setRemaining(totalSeconds);
  }, [totalSeconds]);

  useEffect(() => {
    if (!running || remaining <= 0) return;
    const timer = setInterval(() => {
      setRemaining((prev) => {
        const next = prev - 1;
        if (next <= 0) {
          clearInterval(timer);
          setTimeout(onTimeout, 0);
          onTick?.(0);
          return 0;
        }
        // Persist every 10 seconds to avoid excessive writes
        if (next % 10 === 0) onTick?.(next);
        return next;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [running, onTimeout, onTick]);

  const minutes = Math.floor(remaining / 60);
  const seconds = remaining % 60;
  const isUrgent = remaining < 300; // < 5 minutes

  return (
    <div className={`flex items-center gap-1.5 font-mono text-sm ${isUrgent ? "text-wrong" : "text-primary"}`}>
      <span className="text-lg">⏱</span>
      <span className="font-semibold tabular-nums">
        {String(minutes).padStart(2, "0")}:{String(seconds).padStart(2, "0")}
      </span>
    </div>
  );
}
