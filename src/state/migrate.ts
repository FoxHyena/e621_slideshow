/**
 * localStorage schema migrations (ENGINEERING.md §8). Runs once per load, before anything
 * reads settings. Each step moves the stored data from version n to n + 1 and is recorded
 * as soon as it finishes, so a crash mid-way resumes at the right step.
 *
 * Old keys stay in place for one release after a step stops reading them, so rolling back
 * a deploy still finds them. A profile written by a newer build is left alone.
 */

export const SCHEMA_KEY = "e6ss:schema";
const PREFIX = "e6ss:v1:";

type Step = (ls: Storage) => void;

/**
 * Index i migrates version i → i + 1. Version 0 is every profile written before the shell.
 * Steps that change what a key means land with the slice that changes it (DECISIONS.md).
 */
const STEPS: Step[] = [
  // 0 → 1: the shell's first release; today's keys keep their meaning.
  () => {},
];

export const SCHEMA_VERSION = STEPS.length;

export function storedVersion(ls: Storage): number {
  const n = Number(ls.getItem(SCHEMA_KEY));
  return Number.isInteger(n) && n > 0 ? n : 0;
}

/** Returns the version the profile is at afterwards. Never throws. */
export function migrate(ls: Storage | null = typeof localStorage === "undefined" ? null : localStorage, steps = STEPS): number {
  if (!ls) return 0;
  try {
    let v = storedVersion(ls);
    if (v >= steps.length) return v;
    // A profile with no keys of ours needs nothing moved: start it at the current version.
    const empty = !Array.from({ length: ls.length }, (_, i) => ls.key(i)).some((k) => k?.startsWith(PREFIX));
    if (empty) v = steps.length;
    for (; v < steps.length; v++) {
      steps[v](ls);
      ls.setItem(SCHEMA_KEY, String(v + 1));
    }
    ls.setItem(SCHEMA_KEY, String(v));
    return v;
  } catch {
    // Private mode or a full quota: the app still runs on whatever it can read.
    return storedVersion(ls);
  }
}
