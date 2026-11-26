"use client";

import { useMemo } from "react";
import { avatarFor, type AvatarShape } from "@/lib/avatar";
import { arcPath, bendsFor, BENDS_GEOMETRY as G } from "@/lib/bends";

/**
 * An artist's mark: Bends on a raised navy disc (DESIGN.md "Avatars"). The svg turns when you
 * favourite or follow (`turnMark` in `src/feed/motion.ts`), so it's wrapped: the wrapper holds
 * the size and the gold New dot, the svg spins inside it.
 */
export default function Avatar({ seed, className, fresh = false }: { seed: string; className?: string; fresh?: boolean }) {
  const b = useMemo(() => bendsFor(seed), [seed]);
  return (
    <span className={`mark ${className ?? ""}`} data-new={fresh || undefined} data-testid="avatar" data-seed={seed} aria-hidden>
      <svg viewBox="-1 -1 2 2">
        <path d={arcPath(G.outer, b.a[0], b.w[0])} fill="none" stroke={b.colors[0]} strokeWidth={G.stroke} strokeLinecap="round" />
        <path d={arcPath(G.inner, b.a[1], b.w[1])} fill="none" stroke={b.colors[1]} strokeWidth={G.stroke} strokeLinecap="round" />
        <circle r={Math.round(b.dot * 1e4) / 1e4} fill={b.colors[2]} />
      </svg>
    </span>
  );
}

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

function Dot({ s, grow = 0, fade = 1 }: { s: AvatarShape; grow?: number; fade?: number }) {
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

/** The app mark: the kaleidoscope, kept for the app alone (caught up, empty states, the mascot). */
export function AppMark({ seed, className }: { seed: string; className?: string }) {
  const spec = useMemo(() => avatarFor(seed), [seed]);
  return (
    <span className={`mark mark-app ${className ?? ""}`} data-testid="app-mark" data-seed={seed} aria-hidden>
      <svg viewBox="-1 -1 2 2" style={{ background: spec.background }}>
        {HALOS.map(([spread, fade]) => (
          <g key={spread}>
            {spec.shapes.map((s, i) => (
              <Dot key={i} s={s} grow={spec.glow * spread} fade={fade} />
            ))}
          </g>
        ))}
        {spec.shapes.map((s, i) => (
          <Dot key={i} s={s} />
        ))}
      </svg>
    </span>
  );
}
