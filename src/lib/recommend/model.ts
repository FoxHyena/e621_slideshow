import type { Post } from "../e621/types";
import { features, learnWeightsAsync } from "./learn";
import type { Profile } from "./profile";
import type { Progress } from "./sync";
import { notTaste, type Overrides } from "./weights";

/**
 * The learned ranking's inputs and output, kept in IndexedDB next to the
 * profile (they're too big for localStorage): each favorite's features, a
 * sample of other posts to compare against, and the fitted weights.
 */

/** Each favorite's features (tags + rating), by post id. Only favorites still in the profile. */
export interface FavFeatures {
  username: string;
  feats: Record<string, string[]>;
}

/**
 * What the favorites are told apart from: random posts from across e621, plus
 * popular recent ones (posts the user likely saw and passed on). `ids` lets the
 * user's own favorites be taken back out.
 */
export interface Negatives {
  at: number;
  ids: number[];
  feats: string[][];
}

export interface Learned {
  /** the favorites the weights were fit on (see favKey) */
  favKey: string;
  /** when the negatives they were fit against were sampled */
  negAt: number;
  weights: [string, number][];
}

/**
 * The sample: 5 pages of random posts and 5 of the best-scored posts from 30 to
 * 210 days ago. In the backtest (scripts/rec-backtest.ts, model mix10) this
 * mix beat 10 random pages: hidden favorites in the top 200 went from 25.9% to
 * 32.3% on 30 days (10 of 11 accounts better, none worse) and 59.2% to 65.4% on
 * 7 days. Popular posts alone did nearly as well on 7 days but split accounts
 * on 30. The 30-day gap keeps the posts Recommended is about to rank (and the
 * user hasn't got to yet) out of the "passed on" half.
 */
export const NEG_QUERIES = [
  { query: "order:random", pages: 5 },
  { query: "date:<30_days_ago date:>=210_days_ago order:score", pages: 5 },
] as const;
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
  search: (query: string, page: number, limit: number) => Promise<Post[]>,
  now: number,
  onProgress: Progress = () => {},
): Promise<Negatives> {
  // Samples from before `ids` was kept are random-only: resample.
  if (stored?.ids && stored.feats.length && now - stored.at <= NEG_TTL_MS) return stored;
  const total = NEG_QUERIES.reduce((n, q) => n + q.pages, 0);
  const ids: number[] = [];
  const feats: string[][] = [];
  const seen = new Set<number>();
  let done = 0;
  for (const { query, pages } of NEG_QUERIES) {
    for (let page = 1; page <= pages; page++) {
      onProgress({ phase: "sample", done, total });
      const batch = await search(query, page, NEG_PAGE_SIZE);
      done++;
      for (const p of batch) {
        if (seen.has(p.id)) continue;
        seen.add(p.id);
        ids.push(p.id);
        feats.push(features(p));
      }
      if (batch.length < NEG_PAGE_SIZE) {
        // A short page ends this query early: its unused pages won't be fetched.
        done += pages - page;
        break;
      }
    }
  }
  onProgress({ phase: "sample", done: total, total });
  return { at: now, ids, feats };
}

/**
 * Weights for the learned ranking: the stored ones if they were fit on these
 * favorites and this sample, else a new fit. The user's favorites are taken
 * out of the sample (many popular posts will be among them). Returns null if
 * cancelled.
 */
export async function fitLearned(
  stored: Learned | undefined,
  profile: Profile,
  favs: FavFeatures,
  negatives: Negatives,
  isCancelled: () => boolean = () => false,
  onProgress: Progress = () => {},
): Promise<Learned | null> {
  const key = favKey(profile);
  if (stored && stored.favKey === key && stored.negAt === negatives.at) return stored;
  const positives = profile.favIds.flatMap((id) => (favs.feats[id] ? [favs.feats[id]] : []));
  const mine = new Set(profile.favIds);
  const others = negatives.feats.filter((_, i) => !mine.has(negatives.ids[i]));
  const w = await learnWeightsAsync(positives, others, {}, isCancelled, (done, total) =>
    onProgress({ phase: "learn", done, total }),
  );
  return w && { favKey: key, negAt: negatives.at, weights: [...w] };
}

/**
 * Learned weights with the user's pins and mutes applied, as `computeWeights`
 * does for lift: a pinned tag weighs as much as the strongest one, a muted one
 * nothing (muted posts are filtered out anyway).
 */
export function withOverrides(learned: Learned, overrides: Overrides, isArtist: (tag: string) => boolean = () => false): Map<string, number> {
  const w = new Map(learned.weights);
  for (const tag of [...w.keys()]) if (notTaste(tag)) w.delete(tag);
  // "Filter artists": the favorites' artists weigh nothing (pins, below, still do)
  if (overrides.noArtists) for (const tag of [...w.keys()]) if (isArtist(tag)) w.delete(tag);
  const max = Math.max(0, ...w.values());
  for (const tag of overrides.pinned) w.set(tag, Math.max(max, w.get(tag) ?? 0));
  for (const tag of overrides.muted) w.delete(tag);
  return w;
}
