/**
 * Structured progress for the loader. Producers (profile sync, the negative
 * sample, the model fit, the Recommended search) report a phase and, when
 * they know it, how far along it is; the UI turns that into a label, a ring
 * and an estimate of the time left.
 */

export type Phase =
  /** reading the user's favorites */
  | "favorites"
  /** global post counts for the profile's tags */
  | "tags"
  /** a sample of e621 to compare the favorites against */
  | "sample"
  /** fitting the tag weights */
  | "learn"
  /** paging through search results */
  | "search"
  /** one slide's image or video */
  | "media";

export interface Step {
  phase: Phase;
  /** units finished, when countable */
  done?: number;
  /** units in all, when known */
  total?: number;
  /** `total` is a ceiling: the work usually ends sooner */
  bound?: boolean;
  /** when this phase started (ms), for the time estimate */
  startedAt?: number;
  /** when `done` last moved (ms) */
  at?: number;
}

export type ProgressFn = (step: Step) => void;

/** Fraction finished, or null when there's no total to measure against. */
export function fraction(step: Step | null): number | null {
  if (!step || step.total === undefined || step.done === undefined || step.total <= 0) return null;
  return Math.min(1, Math.max(0, step.done / step.total));
}

/** Stamp a step with its phase's start time (kept from `prev` while the phase is the same) and now. */
export function stamp(prev: Step | null, next: Step, now: number): Step {
  const startedAt = prev?.phase === next.phase && prev.startedAt !== undefined ? prev.startedAt : now;
  return { ...next, startedAt, at: now };
}

/**
 * Milliseconds left at `now`, from the phase's average rate so far. Null until
 * there's a rate to go on (something done, some time passed).
 */
export function etaMs(step: Step | null, now: number): number | null {
  if (!step || step.done === undefined || step.total === undefined) return null;
  const { done, total, startedAt, at } = step;
  if (startedAt === undefined || at === undefined || done <= 0 || at <= startedAt) return null;
  const perUnit = (at - startedAt) / done;
  const atUpdate = Math.max(0, total - done) * perUnit;
  return Math.max(0, atUpdate - Math.max(0, now - at));
}

/** "about 20s left", "up to ~1 min left", "almost done"; null when there's nothing worth saying. */
export function formatEta(ms: number | null, bound = false): string | null {
  if (ms === null) return null;
  const s = Math.ceil(ms / 1000);
  if (s <= 3) return bound ? null : "almost done";
  const text = s < 10 ? `${s}s` : s < 60 ? `${Math.max(10, Math.round(s / 5) * 5)}s` : `${Math.round(s / 60)} min`;
  return bound ? `up to ~${text} left` : `about ${text} left`;
}
