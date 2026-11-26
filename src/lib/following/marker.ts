/**
 * When Following moves e621's "seen" marker (UX §5 Following, owner Q8: automatically). e621 can
 * only move it to its newest post and never back, so all three rules must hold:
 *
 * 1. you've scrolled a screen past the divider and rested 1.5 s, or the player went past the last
 *    new post (`seenPast`);
 * 2. no filter is on: with Media or Hide favorited on, some new posts were never shown;
 * 3. a quick check for anything newer than what's loaded found nothing (else the new-posts pill).
 *
 * ⋯ › Mark all as seen (`force`) asks first, and skips rules 1 and 2.
 */

export interface MarkState {
  /** e621's marker at the start of the session; null when there is none (you follow nothing) */
  threshold: number | null;
  /** the highest id e621 sent this feed, before the blacklist and filters dropped any */
  rawMax: number;
  seenPast: boolean;
  filtered: boolean;
  force: boolean;
  /** the "anything newer?" check: null until it has run */
  newer: boolean | null;
  /** marked already this session, or a mark is under way */
  done: boolean;
}

export type MarkStep = "wait" | "check" | "mark" | "newer";

export function shouldMarkSeen(s: MarkState): MarkStep {
  if (s.threshold === null || s.done || s.rawMax <= s.threshold) return "wait";
  if (!s.force && (s.filtered || !s.seenPast)) return "wait";
  if (s.newer === null) return "check";
  return s.newer ? "newer" : "mark";
}

/**
 * Rule 1 by scrolling: the divider has reached the top of the view, so the whole screen is older
 * posts (a screen past it). Near the end of the list that can't happen: there, reaching the bottom
 * with the divider on screen counts too.
 */
export const SEEN_IDLE_MS = 1500;
export function scrolledPast(dividerTop: number | null, view: { top: number; height: number }, total: number): boolean {
  if (dividerTop === null) return false;
  if (view.top >= dividerTop) return true;
  return view.top + view.height >= total - 1 && dividerTop < view.top + view.height;
}
