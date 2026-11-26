/**
 * Push/Back motion (DESIGN.md Motion: 150 ms cross-fade + 8 px rise). Wraps a React commit
 * in a View Transition where supported; instant otherwise, under reduced motion, and for a
 * gesture Back (the finger already did the motion).
 */
import { flushSync } from "react-dom";

export type NavDirection = "push" | "back" | "tab" | "none";

let token = 0;

export function runTransition(dir: NavDirection, commit: () => void): void {
  const doc = document as Document & { startViewTransition?: (cb: () => void) => { finished: Promise<void> } };
  const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
  if (dir === "none" || !doc.startViewTransition || reduce || document.visibilityState !== "visible") {
    commit();
    return;
  }
  const root = document.documentElement;
  const mine = ++token;
  root.dataset.nav = dir;
  try {
    doc
      .startViewTransition(() => flushSync(commit))
      .finished.catch(() => {})
      .finally(() => {
        // Only the latest transition clears the flag; an earlier one finishing mustn't cut it short.
        if (token === mine) delete root.dataset.nav;
      });
  } catch {
    delete root.dataset.nav;
    commit();
  }
}
