"use client";

import { useEffect, useId, useMemo, useRef } from "react";
import { popMark } from "@/feed/motion";
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

/** The app mark's shapes (docs/path-a/icons/app-mark.svg): the rounded point-up hexagon and Play. */
const HEX =
  "M-.097-.914A.194.194 0 0 1 .097-.914L.743-.541A.194.194 0 0 1 .84-.373L.84.373A.194.194 0 0 1 .743.541L.097.914A.194.194 0 0 1-.097.914L-.743.541A.194.194 0 0 1-.84.373L-.84-.373A.194.194 0 0 1-.743-.541Z";
const TRI = "M.332-.071A.082.082 0 0 1 .332.071L-.104.323A.082.082 0 0 1-.228.252L-.228-.252A.082.082 0 0 1-.104-.323Z";

/**
 * The app mark (DESIGN.md "Artist marks and the app mark", owner-picked "Inlay"): a point-up hexagon
 * with a Raised face and its top light, Play set into it in gold. No lip, no shadow. Its ids are this
 * mark's own: a gradient in a hidden screen's copy wouldn't paint for the others.
 */
/** The places whose mark has popped this visit (a windowed list can mount the same one again). */
const popped = new Set<string>();

export function AppMark({ className, popInView }: { className?: string; /** pop once per visit, keyed by this */ popInView?: string }) {
  const id = useId().replace(/[^\w-]/g, "");
  const el = useRef<HTMLSpanElement>(null);
  // "You're all caught up": it pops the first time it comes into view, not on later scrolls
  useEffect(() => {
    const m = el.current;
    if (!popInView || popped.has(popInView) || !m || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(
      ([e]) => {
        if (!e.isIntersecting) return;
        io.disconnect();
        popped.add(popInView);
        popMark(m);
      },
      { threshold: 0.6 },
    );
    io.observe(m);
    return () => io.disconnect();
  }, [popInView]);
  const [face, hex, tri] = [`${id}f`, `${id}h`, `${id}t`];
  return (
    <span ref={el} className={`mark mark-app ${className ?? ""}`} data-testid="app-mark" aria-hidden>
      <svg viewBox="-1 -1 2 2">
        <defs>
          <linearGradient id={face} x2="0" y2="1">
            <stop stopColor="#2B4D80" />
            <stop offset="1" stopColor="#1F3C67" />
          </linearGradient>
          <clipPath id={hex}>
            <path d={HEX} />
          </clipPath>
          <clipPath id={tri}>
            <path d={TRI} />
          </clipPath>
        </defs>
        <path d={HEX} fill={`url(#${face})`} />
        <g clipPath={`url(#${hex})`}>
          <path d={HEX} fill="rgba(255,255,255,.22)" />
          <path d={HEX} transform="translate(0 .04)" fill={`url(#${face})`} />
        </g>
        <g transform="translate(.034 0)">
          <path d={TRI} transform="translate(0 .04)" fill="rgba(255,255,255,.12)" />
          <path d={TRI} fill="#A8871F" />
          <g clipPath={`url(#${tri})`}>
            <path d={TRI} transform="translate(0 .06)" fill="#E8C446" />
          </g>
        </g>
      </svg>
    </span>
  );
}
