"use client";

import { useEffect, useState } from "react";

/** How long this slide has left ("4 s", "1:20"), read off the progress bar's own animation. */
export function TimeLeft({ bar }: { bar: React.RefObject<HTMLDivElement | null> }) {
  const [left, setLeft] = useState<number | null>(null);
  useEffect(() => {
    const read = () => {
      const a = bar.current?.getAnimations()[0];
      const d = a?.effect?.getComputedTiming().duration;
      setLeft(a && typeof d === "number" ? Math.ceil(Math.max(0, d - Number(a.currentTime ?? 0)) / 1000) : null);
    };
    read();
    const id = setInterval(read, 250);
    return () => clearInterval(id);
  }, [bar]);
  if (left === null) return <span className="player-left" />;
  return (
    <span className="player-left" data-testid="time-left">
      {left < 60 ? `${left} s` : `${Math.floor(left / 60)}:${String(left % 60).padStart(2, "0")}`}
    </span>
  );
}
