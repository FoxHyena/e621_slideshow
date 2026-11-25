"use client";

import { useEffect, useState, type CSSProperties } from "react";
import {
  Brain,
  Check,
  Clapperboard,
  Dices,
  Film,
  Hash,
  Heart,
  Image as ImageIcon,
  Search,
  Shuffle,
  Sparkles,
  Star,
  Tags,
  type LucideIcon,
} from "lucide-react";
import { etaMs, formatEta, fraction, type Phase, type Step } from "@/lib/progress";

interface PhaseInfo {
  /** what's happening now */
  label: string;
  /** the icons the orb hops between while this phase runs */
  icons: LucideIcon[];
  detail?: (step: Step) => string | null;
}

const n = (x: number) => x.toLocaleString();

const PHASES: Record<Phase, PhaseInfo> = {
  favorites: {
    label: "Reading your favorites",
    icons: [Heart, Star],
    detail: ({ done, total }) =>
      total !== undefined && done !== undefined ? `${n(done)} of ${n(total)}` : done ? `${n(done)} so far` : null,
  },
  tags: {
    label: "Looking up your tags",
    icons: [Tags, Hash],
    detail: ({ done, total }) => (total !== undefined && done !== undefined ? `${n(done)} of ${n(total)} tags` : null),
  },
  sample: {
    label: "Sampling e621 to compare against",
    icons: [Dices, Shuffle],
    detail: ({ done, total }) =>
      total !== undefined && done !== undefined ? `page ${Math.min(done + 1, total)} of ${total}` : null,
  },
  learn: {
    label: "Learning your taste",
    icons: [Brain, Sparkles],
    detail: (step) => {
      const f = fraction(step);
      return f === null ? null : `${Math.round(f * 100)}%`;
    },
  },
  search: { label: "Searching e621", icons: [Search, ImageIcon, Clapperboard] },
  media: { label: "Loading", icons: [ImageIcon] },
};

/** One line for a step, for compact status text: "Reading your favorites · 640 of 3,412". */
export function stepText(step: Step): string {
  const info = PHASES[step.phase];
  const detail = info.detail?.(step);
  return detail ? `${info.label} · ${detail}` : info.label;
}

/** A clock that ticks once a second while `on`, so estimates count down between updates. */
function useNow(on: boolean): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!on) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [on]);
  return now;
}

const SWAP_MS = 1600;

/** The phase's icon, hopping to the next one in its set every so often; the old one tumbles out. */
function IconSwap({ icons, phase, size }: { icons: LucideIcon[]; phase: string; size: number }) {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    if (icons.length < 2) return;
    const t = setInterval(() => setTick((x) => x + 1), SWAP_MS);
    return () => clearInterval(t);
  }, [icons.length]);
  const i = tick % icons.length;
  const key = `${phase}:${i}:${icons.length}`;
  const Icon = icons[i];

  // The icon leaving is kept for its exit animation, then dropped.
  const [shown, setShown] = useState<{ key: string; Icon: LucideIcon; prev: { key: string; Icon: LucideIcon } | null }>({
    key,
    Icon,
    prev: null,
  });
  if (shown.key !== key) setShown({ key, Icon, prev: { key: shown.key, Icon: shown.Icon } });

  const Prev = shown.prev?.Icon;
  return (
    <span className="orb-hop relative grid place-items-center" style={{ width: size, height: size }} aria-hidden>
      {Prev && (
        <Prev
          key={shown.prev!.key}
          className="orb-icon-out absolute inset-0 text-white/70"
          style={{ width: size, height: size }}
          onAnimationEnd={() => setShown((s) => ({ ...s, prev: null }))}
        />
      )}
      <shown.Icon key={shown.key} className="orb-icon-in absolute inset-0 text-white" style={{ width: size, height: size }} />
    </span>
  );
}

const R = 30;
const CIRC = 2 * Math.PI * R;

/** The ring: fills as the step progresses, or spins when there's nothing to measure. */
function Ring({ frac, phase }: { frac: number | null; phase: string }) {
  return (
    // Keyed by phase: each new phase lands with a little pop.
    <svg key={phase} viewBox="0 0 72 72" className="orb-pop absolute inset-0 size-full -rotate-90" aria-hidden>
      <circle cx="36" cy="36" r={R} fill="none" strokeWidth="3" className="stroke-white/10" />
      {frac === null ? (
        <circle
          cx="36"
          cy="36"
          r={R}
          fill="none"
          strokeWidth="3"
          strokeLinecap="round"
          strokeDasharray={`${CIRC * 0.28} ${CIRC}`}
          className="orb-spin orb-arc-glow stroke-accent"
        />
      ) : (
        <circle
          cx="36"
          cy="36"
          r={R}
          fill="none"
          strokeWidth="3"
          strokeLinecap="round"
          strokeDasharray={CIRC}
          strokeDashoffset={CIRC * (1 - Math.max(0.02, frac))}
          className="orb-arc orb-arc-glow stroke-accent"
        />
      )}
    </svg>
  );
}

export interface ChecklistRow {
  id: string;
  label: string;
  state: "done" | "active" | "todo";
  /** shown at the end of a finished row, e.g. how many favorites it read */
  note?: string;
}

function Checklist({ rows }: { rows: ChecklistRow[] }) {
  return (
    <ol className="w-60 max-w-full space-y-1.5 text-left text-xs" data-testid="loader-steps">
      {rows.map((r) => (
        <li
          key={r.id}
          data-state={r.state}
          className={`flex items-center gap-2.5 transition-colors duration-300 ${
            r.state === "active" ? "text-neutral-100" : r.state === "done" ? "text-neutral-400" : "text-neutral-600"
          }`}
        >
          <span className="grid size-4 shrink-0 place-items-center" aria-hidden>
            {r.state === "done" ? (
              <span className="check-pop grid size-4 place-items-center rounded-full bg-accent/90 text-black">
                <Check className="size-2.5" strokeWidth={3.5} />
              </span>
            ) : r.state === "active" ? (
              <span className="step-pulse size-2 rounded-full bg-accent" />
            ) : (
              <span className="size-1.5 rounded-full bg-white/20" />
            )}
          </span>
          <span className="flex-1">{r.label}</span>
          {r.note && <span className="font-mono text-[11px] text-neutral-500">{r.note}</span>}
        </li>
      ))}
    </ol>
  );
}

const REC_ROWS: { id: string; label: string; phases: Phase[]; learning?: boolean }[] = [
  { id: "favorites", label: "Read your favorites", phases: ["favorites"] },
  { id: "compare", label: "Compare with the rest of e621", phases: ["tags", "sample"], learning: true },
  { id: "learn", label: "Learn your taste", phases: ["learn"], learning: true },
  { id: "search", label: "Find and rank posts", phases: ["search"] },
];

/**
 * Recommended's whole job as a checklist, up to `active`. `learned: false`
 * (no learned ranking this time) drops the learning rows.
 */
export function recSteps(active: Phase, opts: { favorites?: number; learned?: boolean } = {}): ChecklistRow[] {
  const rows = REC_ROWS.filter((r) => opts.learned !== false || !r.learning);
  const at = rows.findIndex((r) => r.phases.includes(active));
  return rows.map((r, i) => ({
    id: r.id,
    label: r.label,
    state: i < at ? "done" : i === at ? "active" : "todo",
    note: r.id === "favorites" && i < at && opts.favorites ? n(opts.favorites) : undefined,
  }));
}

export interface LoaderProps {
  /** what's being done; null for a plain wait */
  step: Step | null;
  size?: "lg" | "md";
  /** replaces the phase's own label */
  label?: string;
  /** replaces the phase's own detail (the time estimate is still added) */
  detail?: string | null;
  /** replaces the phase's icons */
  icons?: LucideIcon[];
  /** the whole job, step by step (lg only) */
  steps?: ChecklistRow[];
  /** hide the text: just the orb */
  bare?: boolean;
  /** wait this long before showing, so quick loads don't flash a loader */
  delayMs?: number;
  testId?: string;
}

/**
 * The app's loader: a ring that fills with progress (or spins when there's
 * none to measure) around an icon that hops between pictures of the current
 * phase, with what's happening, how far along, and roughly how long is left.
 */
export function Loader({ step, size = "lg", label, detail, icons, steps, bare, delayMs = 150, testId }: LoaderProps) {
  const phase = step?.phase ?? "search";
  const info = PHASES[phase];
  const frac = fraction(step);
  const timed = !!step && step.total !== undefined && step.startedAt !== undefined;
  const now = useNow(timed);
  const eta = timed ? formatEta(etaMs(step, now), step.bound) : null;
  const text = label ?? info.label;
  const sub = [detail !== undefined ? detail : step ? info.detail?.(step) : null, eta].filter(Boolean).join(" · ");
  const orb = size === "lg" ? 80 : 56;

  return (
    <div
      className="loader-in flex flex-col items-center gap-4 text-center"
      style={{ "--loader-delay": `${delayMs}ms` } as CSSProperties}
      role="status"
      data-testid={testId}
      data-phase={phase}
    >
      <div
        className="relative grid place-items-center"
        style={{ width: orb, height: orb }}
        role="progressbar"
        aria-label={text}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={frac === null ? undefined : Math.round(frac * 100)}
      >
        <span className="orb-glow absolute inset-3 rounded-full bg-accent/20 blur-md" aria-hidden />
        <Ring frac={frac} phase={phase} />
        <IconSwap icons={icons ?? info.icons} phase={phase} size={size === "lg" ? 28 : 20} />
      </div>
      {!bare && (
        <div className="space-y-1">
          <p className="text-sm font-medium text-neutral-100" aria-live="polite">
            {text}
          </p>
          <p
            className="mx-auto min-h-4 max-w-72 truncate font-mono text-[11px] tabular-nums text-neutral-400"
            title={sub}
            data-testid={testId && `${testId}-detail`}
          >
            {sub}
          </p>
        </div>
      )}
      {!bare && size === "lg" && steps && steps.length > 1 && <Checklist rows={steps} />}
    </div>
  );
}

/** A small spinning ring and a label, for loading more at the end of a list, or a status line. */
export function InlineLoader({ label, size = "sm" }: { label: string; size?: "sm" | "xs" }) {
  return (
    <span
      className={`loader-in flex items-center text-neutral-400 ${size === "xs" ? "gap-1.5 text-xs" : "gap-2 text-sm"}`}
      role="status"
      style={{ "--loader-delay": "0ms" } as CSSProperties}
    >
      <svg viewBox="0 0 20 20" className={`shrink-0 -rotate-90 ${size === "xs" ? "size-3" : "size-4"}`} aria-hidden>
        <circle cx="10" cy="10" r="8" fill="none" strokeWidth="2.5" className="stroke-white/10" />
        <circle
          cx="10"
          cy="10"
          r="8"
          fill="none"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeDasharray={`${2 * Math.PI * 8 * 0.3} 100`}
          className="orb-spin stroke-accent"
        />
      </svg>
      {label}
    </span>
  );
}

export { Film as VideoIcon, ImageIcon };
