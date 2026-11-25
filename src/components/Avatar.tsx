"use client";

import { useId, useMemo } from "react";
import { avatarFor } from "@/lib/avatar";

/** The kaleidoscope icon for a seed (an artist name, or a post id when there's no artist). */
export default function Avatar({ seed, className }: { seed: string; className?: string }) {
  const spec = useMemo(() => avatarFor(seed), [seed]);
  const glow = `glow${useId().replace(/:/g, "")}`;
  return (
    <svg
      viewBox="-1 -1 2 2"
      className={`shrink-0 rounded-full ${className ?? ""}`}
      style={{ background: spec.background }}
      aria-hidden
      data-testid="avatar"
      data-seed={seed}
    >
      <defs>
        <filter id={glow} x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation={spec.glow} result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      <g filter={`url(#${glow})`}>
        {spec.shapes.map((s, i) =>
          s.kind === "dot" ? (
            <circle key={i} cx={s.x} cy={s.y} r={s.r} fill={s.color} opacity={s.opacity} />
          ) : (
            <circle key={i} cx={s.x} cy={s.y} r={s.r} fill="none" stroke={s.color} strokeWidth={s.width} opacity={s.opacity} />
          ),
        )}
      </g>
    </svg>
  );
}
