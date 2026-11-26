"use client";

/**
 * Goo the mascot (DESIGN.md "Goo (the mascot)"): a drop of the app's goo with a face, made the way
 * the tab bar's goo and the heart's drip are — white shapes under a blur-and-threshold filter, so
 * body, spill and arm read as one liquid — with a Goo Shade copy under it and the face on top.
 * Five moods. A tap squashes it and spurts one to three drops onto the tab bar's goo; it is a toy,
 * pointer-only (not focusable, no label), and nothing depends on it.
 */
import { useId, useRef } from "react";
import { calm } from "@/feed/motion";
import { liveGoo } from "@/shell/gooLive";
import { motionFx } from "@/shell/lazy";
import { getGoo } from "@/state/goo";

export type GooMood = "wave" | "snooze" | "look" | "oops" | "busy";

const INK = "#020F23";
const PINK = "#FF8A95";
const BLUE = "#B4C7D9";
const LINE = { fill: "none", stroke: INK, strokeWidth: 2.8, strokeLinecap: "round", strokeLinejoin: "round" } as const;

/** a dewdrop whose tip is what is left of the neck it fell from (DESIGN.md: drawn in a 120 box) */
const BODY = "M60 100C38 100 24 90 24 74C24 56 42 43 52 27C55 21 58 14 64 8C67 12 66.5 18 66.5 24C69 35 96 52 96 74C96 90 82 100 60 100Z";
const SQUASH = "translate(60 100) scale(1.08 .86) translate(-60 -100)";
/** face: eyes 14.5 either side of x 59 at y 72, mouth at y 83 */
const X = 59;
const Y = 72;
const DX = 14.5;
const MY = 83;

function Eye({ cx, cy }: { cx: number; cy: number }) {
  return (
    <>
      <ellipse cx={cx} cy={cy} rx={4.2} ry={5.6} fill={INK} />
      <circle cx={cx - 1.26} cy={cy - 2.13} r={1.5} fill="#fff" />
    </>
  );
}

/** the :3 mouth: two scoops */
const cat = (w = 6.5, d = 4.6, ox = 0) => <path d={`M${X + ox - w} ${MY}q${w / 2} ${d} ${w} 0q${w / 2} ${d} ${w} 0`} {...LINE} />;

function Face({ mood }: { mood: GooMood }) {
  const shut = (cx: number) => <path d={`M${cx - 5} ${Y}q5 4.5 10 0`} {...LINE} />;
  const eyes =
    mood === "snooze" ? (
      <>
        {shut(X - DX)}
        {shut(X + DX)}
      </>
    ) : mood === "oops" ? (
      <>
        <path d={`M${X - DX - 4} ${Y - 4}l7 4l-7 4`} {...LINE} />
        <path d={`M${X + DX + 4} ${Y - 4}l-7 4l7 4`} {...LINE} />
      </>
    ) : mood === "look" ? (
      <>
        <Eye cx={X - DX + 3} cy={Y - 2} />
        <Eye cx={X + DX + 3} cy={Y - 2} />
      </>
    ) : (
      <>
        <Eye cx={X - DX} cy={Y} />
        <Eye cx={X + DX} cy={Y} />
      </>
    );
  const mouth =
    mood === "oops" ? (
      <path d={`M${X - 8} ${MY + 2}q4-5 8 0t8 0`} {...LINE} />
    ) : mood === "wave" ? (
      <>
        <ellipse cx={X} cy={MY + 4.4} rx={3.3} ry={3.5} fill={PINK} stroke={INK} strokeWidth={2.2} />
        {cat()}
      </>
    ) : mood === "snooze" ? (
      cat(5, 3.6)
    ) : mood === "look" ? (
      cat(5.5, 4, 2.5)
    ) : (
      cat()
    );
  const bx = DX + 11.5;
  return (
    // busy: the whole face looks left and right (CSS)
    <g className="goo-face">
      <ellipse cx={X - bx} cy={MY} rx={5} ry={3} fill={PINK} opacity={0.5} />
      <ellipse cx={X + bx} cy={MY} rx={5} ry={3} fill={PINK} opacity={0.5} />
      {eyes}
      {mouth}
    </g>
  );
}

/** the body, its spill and (waving) its arm, in one colour, under the goo filter */
function Liquid({ color, dy, by, mood, filter }: { color: string; dy: number; by: number; mood: GooMood; filter: string }) {
  return (
    <g fill={color} stroke={color} strokeWidth={0} filter={`url(#${filter})`}>
      <g transform={`translate(0 ${by})`}>
        <ellipse cx={60} cy={99} rx={42} ry={5.5} />
        <ellipse cx={91} cy={102.5} rx={11} ry={4} />
        <circle cx={109} cy={104.4} r={3.4} />
      </g>
      <g transform={`translate(0 ${dy})`}>
        <g className="goo-bd">
          <g transform={mood === "snooze" ? SQUASH : undefined}>
            <path d={BODY} />
            {mood === "wave" && (
              <g className="goo-arm">
                <path d="M89 78Q102 72 104 59" fill="none" strokeWidth={9.5} strokeLinecap="round" />
                <circle cx={104} cy={57} r={7.4} />
              </g>
            )}
          </g>
        </g>
      </g>
    </g>
  );
}

const pokedAt = new WeakMap<Element, number>();

/** Squash, spring back, and throw one to three drops from the tip onto the bar's goo. */
function poke(svg: SVGSVGElement, mood: GooMood) {
  const now = performance.now();
  if (now - (pokedAt.get(svg) ?? -1e9) < 260) return;
  pokedAt.set(svg, now);
  const n = 1 + Math.floor(Math.random() * 3);
  const bar = liveGoo();
  if (calm()) {
    // no squash, no flight: the drops are added to the bar in place
    if (bar) getGoo().add(n);
    return;
  }
  svg.classList.remove("goo-pop");
  void svg.getBoundingClientRect();
  svg.classList.add("goo-pop");
  const r = svg.getBoundingClientRect();
  const px = r.width / 120;
  // the snoozing body is squashed, so its tip sits lower
  const low = mood === "snooze";
  const x = r.left + (low ? 64.3 : 64) * px;
  const y = r.top + (low ? 21 : 8) * px;
  if (bar) bar.toss(x, y, n, px);
  else void motionFx().then((fx) => fx.gooSoak(x, y, n, px, r.top + 106 * px));
}

export function Goo({ mood, size = 112, className }: { mood: GooMood; size?: number; className?: string }) {
  const id = useId().replace(/:/g, "");
  const filter = `goo-m-${id}`;
  const ref = useRef<SVGSVGElement>(null);
  const unpress = () => ref.current?.classList.remove("goo-press");
  return (
    <svg
      ref={ref}
      className={`goo${className ? ` ${className}` : ""}`}
      viewBox="0 0 120 120"
      width={size}
      height={size}
      aria-hidden
      focusable="false"
      data-mood={mood}
      data-testid="goo"
      onPointerDown={(e) => {
        if (!calm() && !(e.pointerType === "mouse" && e.button)) e.currentTarget.classList.add("goo-press");
      }}
      onPointerUp={unpress}
      onPointerCancel={unpress}
      onPointerLeave={unpress}
      onClick={(e) => poke(e.currentTarget, mood)}
    >
      <defs>
        {/* DESIGN.md: blur 2.4, then alpha × 22 − 9 */}
        <filter id={filter} x="-20%" y="-20%" width="140%" height="150%" colorInterpolationFilters="sRGB">
          <feGaussianBlur in="SourceGraphic" stdDeviation={2.4} />
          <feColorMatrix mode="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 22 -9" />
        </filter>
      </defs>
      <ellipse cx={60} cy={109.5} rx={46} ry={4.5} fill="#000" opacity={0.28} />
      <Liquid color="var(--color-goo-shade)" dy={4} by={2.4} mood={mood} filter={filter} />
      <Liquid color="var(--color-goo)" dy={0} by={0} mood={mood} filter={filter} />
      <g className="goo-bd">
        <g transform={mood === "snooze" ? SQUASH : undefined}>
          <Face mood={mood} />
        </g>
      </g>
      {mood === "wave" && (
        <g className="goo-tick" fill="none" stroke={BLUE} strokeWidth={2.4} strokeLinecap="round">
          <path d="M115 48q4 6 2 12" />
          <path d="M97 43q5-3 10-1" opacity={0.7} />
        </g>
      )}
      {mood === "snooze" && (
        <g className="goo-zz" fill="none" stroke={BLUE} strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round">
          <path d="M94 36h8l-8 9h8" />
          <path d="M106 22h5.5l-5.5 6.5h5.5" opacity={0.7} />
        </g>
      )}
      {mood === "look" && (
        <text x={98} y={38} fontFamily="var(--font-rounded), sans-serif" fontWeight={600} fontSize={24} fill={BLUE} textAnchor="middle">
          ?
        </text>
      )}
      {mood === "busy" && (
        <g fill={BLUE}>
          {/* three dots rising from its right shoulder, each 3 higher and 0.5 bigger, taking turns */}
          <circle className="goo-dot" cx={86} cy={38} r={2.4} />
          <circle className="goo-dot" cx={94.5} cy={35} r={2.9} />
          <circle className="goo-dot" cx={103} cy={32} r={3.4} />
        </g>
      )}
      {mood === "oops" && <path d="M98 28c3.4 4.6 5 7 5 9.4a5 5 0 0 1-10 0c0-2.4 1.6-4.8 5-9.4Z" fill={BLUE} />}
    </svg>
  );
}
