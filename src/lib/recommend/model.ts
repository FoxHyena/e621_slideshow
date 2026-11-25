import type { Post } from "../e621/types";
import { features, learnWeightsAsync } from "./learn";
import type { Profile } from "./profile";
import type { Progress } from "./sync";
import type { Overrides } from "./weights";

/**
 * The learned ranking's inputs and output, kept in IndexedDB next to the
 * profile (they're too big for localStorage): each favorite's features, a
 * sample of random posts to compare against, and the fitted weights.
 */

/** Each favorite's features (tags + rating), by post id. Only favorites still in the profile. */
export interface FavFeatures {
  username: string;
  feats: Record<string, string[]>;
}

/** Random posts from across e621: what the favorites are told apart from. */
export interface Negatives {
  at: number;
  feats: string[][];
}

export interface Learned {
  /** the favorites the weights were fit on (see favKey) */
  favKey: string;
  /** when the negatives they were fit against were sampled */
  negAt: number;
  weights: [string, number][];
}

/** Pages of `order:random` posts sampled as negatives (3,200 posts, as in the backtest). */
export const NEG_PAGES = 10;
export const NEG_PAGE_SIZE = 320;
/** The site's mix changes slowly; resample monthly. */
export const NEG_TTL_MS = 30 * 24 * 3600_000;

/** Identifies a profile's favorites: count and newest. */
export function favKey(profile: Profile): string {
  return `${profile.username}:${profile.favIds.length}:${profile.favIds[0] ?? ""}`;
}

/** Whether `stored` has features for every favorite in `profile`. */
export function covers(stored: FavFeatures | undefined, profile: Profile): boolean {
  return !!stored && stored.username === profile.username && profile.favIds.every((id) => stored.feats[id]);
}

/** Stored features plus freshly read favorites, trimmed to the profile's favorites. */
export function mergeFeatures(stored: FavFeatures | undefined, profile: Profile, posts: Post[]): FavFeatures {
  const known = stored?.username === profile.username ? stored.feats : {};
  const fresh: Record<string, string[]> = {};
  for (const p of posts) fresh[p.id] = features(p);
  const feats: Record<string, string[]> = {};
  for (const id of profile.favIds) {
    const f = fresh[id] ?? known[id];
    if (f) feats[id] = f;
  }
  return { username: profile.username, feats };
}

/** The stored sample while it's fresh, else a new one. */
export async function refreshNegatives(
  stored: Negatives | undefined,
  randomPosts: (page: number, limit: number) => Promise<Post[]>,
  now: number,
  onProgress: Progress = () => {},
): Promise<Negatives> {
  if (stored && stored.feats.length && now - stored.at <= NEG_TTL_MS) return stored;
  const seen = new Set<number>();
  const feats: string[][] = [];
  for (let page = 1; page <= NEG_PAGES; page++) {
    onProgress(`Sampling e621 to compare against… ${page}/${NEG_PAGES}`);
    const batch = await randomPosts(page, NEG_PAGE_SIZE);
    for (const p of batch) {
      if (seen.has(p.id)) continue;
      seen.add(p.id);
      feats.push(features(p));
    }
    if (batch.length < NEG_PAGE_SIZE) break;
  }
  return { at: now, feats };
}

/**
 * Weights for the learned ranking: the stored ones if they were fit on these
 * favorites and this sample, else a new fit. Favorites that also turn up in
 * the random sample aren't removed: a few among thousands don't move the fit.
 * Returns null if cancelled.
 */
export async function fitLearned(
  stored: Learned | undefined,
  profile: Profile,
  favs: FavFeatures,
  negatives: Negatives,
  isCancelled: () => boolean = () => false,
): Promise<Learned | null> {
  const key = favKey(profile);
  if (stored && stored.favKey === key && stored.negAt === negatives.at) return stored;
  const positives = profile.favIds.flatMap((id) => (favs.feats[id] ? [favs.feats[id]] : []));
  const w = await learnWeightsAsync(positives, negatives.feats, {}, isCancelled);
  return w && { favKey: key, negAt: negatives.at, weights: [...w] };
}

/**
 * Learned weights with the user's pins and mutes applied, as `computeWeights`
 * does for lift: a pinned tag weighs as much as the strongest one, a muted one
 * nothing (muted posts are filtered out anyway).
 */
export function withOverrides(learned: Learned, overrides: Overrides): Map<string, number> {
  const w = new Map(learned.weights);
  const max = Math.max(0, ...w.values());
  for (const tag of overrides.pinned) w.set(tag, Math.max(max, w.get(tag) ?? 0));
  for (const tag of overrides.muted) w.delete(tag);
  return w;
}
