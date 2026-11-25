"use client";

import { useMemo } from "react";
import { avatarFor, type AvatarShape } from "@/lib/avatar";

/**
 * The glow, as a few wider, fainter copies behind each mark (spread in multiples of the glow
 * radius, opacity as a share of the mark's): roughly a Gaussian falloff. It's drawn this way
 * instead of with an SVG blur filter because iOS Safari paints filtered content in this viewBox
 * (which starts at -1,-1) shifted down and right, off the circle.
 */
const HALOS: [spread: number, opacity: number][] = [
  [1.2, 0.04],
  [0.7, 0.07],
  [0.3, 0.12],
];

function Mark({ s, grow = 0, fade = 1 }: { s: AvatarShape; grow?: number; fade?: number }) {
  return s.kind === "dot" ? (
    <circle cx={s.x} cy={s.y} r={s.r + grow} fill={s.color} opacity={s.opacity * fade} />
  ) : (
    <circle
      cx={s.x}
      cy={s.y}
      r={s.r}
      fill="none"
      stroke={s.color}
      strokeWidth={(s.width ?? 0) + 2 * grow}
      opacity={s.opacity * fade}
    />
  );
}

/** The kaleidoscope icon for a seed (an artist name, or a post id when there's no artist). */
export default function Avatar({ seed, className }: { seed: string; className?: string }) {
  const spec = useMemo(() => avatarFor(seed), [seed]);
  return (
    <svg
      viewBox="-1 -1 2 2"
      className={`shrink-0 rounded-full ${className ?? ""}`}
      style={{ background: spec.background }}
      aria-hidden
      data-testid="avatar"
      data-seed={seed}
    >
      {HALOS.map(([spread, fade]) => (
        <g key={spread}>
          {spec.shapes.map((s, i) => (
            <Mark key={i} s={s} grow={spec.glow * spread} fade={fade} />
          ))}
        </g>
      ))}
      {spec.shapes.map((s, i) => (
        <Mark key={i} s={s} />
      ))}
    </svg>
  );
}
