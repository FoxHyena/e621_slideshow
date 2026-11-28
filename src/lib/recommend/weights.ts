import type { Post, TagCategoryName } from "../e621/types";
import { NOBODY, NOT_ARTISTS } from "../feed/format";
import type { Profile } from "./profile";

/** A tag must be on at least this many favorites to count. One odd favorite is not a taste. */
export const MIN_SUPPORT = 3;
/** Shrinkage: weight scales by n / (n + SHRINK), so small counts are damped. */
export const SHRINK = 5;
/**
 * Share of the favorites at which a tag's weight is halved: weight also scales by s / (s + SHARE_HALF),
 * s = n / favorites. The count damping above is absolute, so with thousands of favorites every tag on
 * 50 of them got full weight, and rare names (an artist or character on 1% of the favorites) hit the
 * lift cap and took every search slot. By share, a tag on 10% of the favorites keeps 83% of its weight
 * and one on 1% keeps 33%, at any profile size. A small profile hardly changes: 3 favorites of 100 is
 * already 3%.
 */
export const SHARE_HALF = 0.02;
/**
 * Share of all e621 posts at which a tag's weight is halved: weight also scales by
 * 1 / (1 + c / SITE_HALF), c = the tag's share of the site. Lift is a log, so it squashes how
 * specific a tag is: male_penetrating_male (3.6% of e621, 9× in one profile) scored 2.2 and a
 * muzzle (0.24%, 20×) 3.0, and with the share damping the broad tag tied the kink. Broad tags
 * also make poor searches: they fill the window with posts anyone might like. The weighting
 * exists to find what is unusually common in someone's favorites and not on e621 at large
 * (owner), so a tag on 1% of the site keeps half its weight and one on 3.6% keeps 22%.
 */
export const SITE_HALF = 0.01;
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
 * Characters count half (owner: "characters weighted less"): as rare as
 * artists, they hit the lift cap after a few dozen favorites and topped every
 * list, though a character says less about a picture than what is in it.
 */
export const CAT_MULT: Record<TagCategoryName, number> = {
  artist: 1,
  character: 0.5,
  species: 1,
  general: 1,
  copyright: 0.5,
  lore: 0.5,
  contributor: 0.5,
  meta: 0,
  invalid: 0,
};

/**
 * Artist-category tags that say nothing about taste: e621's do-not-post and content-warning marks
 * (`avoid_posting` was a heavy favoriter's strongest tag) and its placeholders for no one.
 */
export const notTaste = (tag: string) => NOT_ARTISTS.has(tag) || NOBODY.has(tag);

/**
 * At most this share of the searched tags are names, artists and characters together (pins
 * aside), when there are other tags to search. Names are rare on e621, so lift tops out for any
 * artist or character favorited a few dozen times, and for someone with many favorites every
 * searched slot went to one. The rest still count when ranking.
 */
export const NAME_SHARE = 1 / 3;

/** Whether a tag category names someone: an artist or a character. */
export const isName = (cat: TagCategoryName | undefined) => cat === "artist" || cat === "character";

export interface Overrides {
  pinned: string[];
  muted: string[];
  /**
   * Tune's "Filter artists": For You's taste ignores artist tags (a pinned one still counts),
   * so it ranks by what is in a picture, not who drew it. Off when missing (older saves).
   */
  noArtists?: boolean;
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
  /** SHARE_HALF; 0 turns the share damping off (the backtest compares) */
  shareHalf = SHARE_HALF,
  /** SITE_HALF; 0 turns the site-breadth damping off (the backtest compares) */
  siteHalf = SITE_HALF,
): Map<string, number> {
  const weights = new Map<string, number>();
  const nFav = profile.favIds.length;
  if (nFav > 0 && nSite > 0) {
    for (const [tag, { n, cat }] of Object.entries(profile.tags)) {
      const count = globalCounts[tag];
      if (n < MIN_SUPPORT || !count || notTaste(tag) || (overrides.noArtists && cat === "artist")) continue;
      const share = n / nFav;
      const site = count / nSite;
      const lift = Math.min(MAX_LIFT, Math.log(share / site));
      const breadth = siteHalf ? 1 / (1 + site / siteHalf) : 1;
      const w = Math.max(0, lift) * (n / (n + SHRINK)) * (share / (share + shareHalf)) * breadth * CAT_MULT[cat];
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
 * the highest-weight ("signature") tags up to `breadth`, with no more than
 * NAME_SHARE of them names (`isName`: artists, characters) while other tags are left.
 *
 * Searching by cover (weight × favorites) as well kept the pool larger, but
 * with generic tags like `canine` and `sex` that the weighting exists to
 * ignore. Pool size isn't the goal, so weight alone decides.
 */
export function searchPlan(
  weights: Map<string, number>,
  overrides: Overrides,
  breadth: number,
  isName: (tag: string) => boolean = () => false,
): PlannedSearch[] {
  const pinned = overrides.pinned
    .filter((t) => weights.has(t))
    .slice(0, breadth)
    .map((tag): PlannedSearch => ({ tag, kind: "pinned" }));
  const taken = new Set(pinned.map((p) => p.tag));
  const slots = Math.max(0, breadth - pinned.length);
  const ranked = topTags(weights, weights.size).filter((t) => !taken.has(t));
  // names up to their share; past it they wait, and fill in only if other tags run out
  let namesLeft = Math.ceil(slots * NAME_SHARE);
  const picked = new Set<string>();
  for (const t of ranked) {
    if (picked.size >= slots) break;
    if (!isName(t)) picked.add(t);
    else if (namesLeft > 0) {
      picked.add(t);
      namesLeft--;
    }
  }
  for (const t of ranked) {
    if (picked.size >= slots) break;
    picked.add(t);
  }
  const signature = ranked.filter((t) => picked.has(t)).map((tag): PlannedSearch => ({ tag, kind: "signature" }));
  return [...pinned, ...signature];
}

/**
 * Why For You picked a post: its tags with the strongest positive weights, strongest first (Post
 * info's "For you because you fav otter and cozy a lot", and the marked tags on a For You card).
 */
export function pickedFor(post: Pick<Post, "tags">, weights: ReadonlyMap<string, number>, n = 2): string[] {
  return Object.values(post.tags)
    .flat()
    .filter((t): t is string => !!t && (weights.get(t) ?? 0) > 0)
    .sort((a, b) => (weights.get(b) ?? 0) - (weights.get(a) ?? 0))
    .slice(0, n);
}
