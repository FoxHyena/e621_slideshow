import type { TagCategoryName } from "../e621/types";
import type { Profile } from "./profile";

/** A tag must be on at least this many favorites to count. One odd favorite is not a taste. */
export const MIN_SUPPORT = 3;
/** Shrinkage: weight scales by n / (n + SHRINK), so small counts are damped. */
export const SHRINK = 5;
/**
 * Lift is capped at "50× more common in your favorites than on e621". Past
 * that, rarer isn't more telling: without the cap an artist with 500 posts and
 * 9 favorites (190×) outweighed a kink on 20% of the favorites (33×), and rare
 * tags crowded out the ones that actually describe the favorites. Above the
 * cap, how many favorites carry the tag decides.
 */
export const MAX_LIFT = Math.log(50);

/**
 * Meta tags (hi_res, 2024, ...) say nothing about taste. Artists get no bonus:
 * they're already rare on the site, which the lift rewards on its own.
 */
export const CAT_MULT: Record<TagCategoryName, number> = {
  artist: 1,
  character: 1,
  species: 1,
  general: 1,
  copyright: 0.5,
  lore: 0.5,
  contributor: 0.5,
  meta: 0,
  invalid: 0,
};

export interface Overrides {
  pinned: string[];
  muted: string[];
}

export const NO_OVERRIDES: Overrides = { pinned: [], muted: [] };

/**
 * Lift of each tag: how much more common it is among the favorites than across e621.
 * `globalCounts` is post_count per tag; `nSite` is the total post count. Tags without
 * a global count are skipped, since their lift can't be measured.
 */
export function computeWeights(
  profile: Profile,
  globalCounts: Record<string, number>,
  nSite: number,
  overrides: Overrides = NO_OVERRIDES,
): Map<string, number> {
  const weights = new Map<string, number>();
  const nFav = profile.favIds.length;
  if (nFav > 0 && nSite > 0) {
    for (const [tag, { n, cat }] of Object.entries(profile.tags)) {
      const count = globalCounts[tag];
      if (n < MIN_SUPPORT || !count) continue;
      const lift = Math.min(MAX_LIFT, Math.log(n / nFav / (count / nSite)));
      const w = Math.max(0, lift) * (n / (n + SHRINK)) * CAT_MULT[cat];
      if (w > 0) weights.set(tag, w);
    }
  }
  const max = Math.max(1, ...weights.values());
  for (const tag of overrides.pinned) weights.set(tag, max);
  for (const tag of overrides.muted) weights.delete(tag);
  return weights;
}

/** The `k` highest-weighted tags, strongest first. */
export function topTags(weights: Map<string, number>, k: number): string[] {
  return [...weights.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, k)
    .map(([tag]) => tag);
}

export type SearchKind = "pinned" | "signature";

export interface PlannedSearch {
  tag: string;
  kind: SearchKind;
}

/**
 * Which profile tags the candidate search uses, strongest first: pins, then
 * the highest-weight ("signature") tags up to `breadth`.
 *
 * Searching by cover (weight × favorites) as well kept the pool larger, but
 * with generic tags like `canine` and `sex` that the weighting exists to
 * ignore. Pool size isn't the goal, so weight alone decides.
 */
export function searchPlan(
  weights: Map<string, number>,
  overrides: Overrides,
  breadth: number,
): PlannedSearch[] {
  const pinned = overrides.pinned
    .filter((t) => weights.has(t))
    .slice(0, breadth)
    .map((tag): PlannedSearch => ({ tag, kind: "pinned" }));
  const taken = new Set(pinned.map((p) => p.tag));
  const signature = topTags(weights, weights.size)
    .filter((t) => !taken.has(t))
    .slice(0, breadth - pinned.length)
    .map((tag): PlannedSearch => ({ tag, kind: "signature" }));
  return [...pinned, ...signature];
}
