import type { Post } from "../e621/types";
import type { ProgressFn } from "../progress";
import { MAX_PAGE } from "../query/build";
import { addFavorites, emptyProfile, type Profile } from "./profile";
import { CAT_MULT, MIN_SUPPORT, notTaste } from "./weights";

/** The network calls sync needs, injected so tests never touch e621. */
export interface RecApi {
  favoriteCount(): Promise<number>;
  /** newest-favorited first */
  favorites(page: number, limit: number): Promise<Post[]>;
  tagCounts(names: string[]): Promise<{ name: string; post_count: number }[]>;
  newestPostId(): Promise<number>;
}

export const FAV_PAGE = 320;
/** Names per /tags.json request; keeps the URL a few KB. */
export const TAG_BATCH = 200;
export const TAG_TTL_MS = 7 * 24 * 3600_000;
export const SITE_TTL_MS = 24 * 3600_000;

export type Progress = ProgressFn;

async function fetchFavorites(
  api: RecApi,
  stopAt: number | undefined,
  onProgress: Progress,
  /** favorites expected to be read, when known */
  expected: number | undefined,
): Promise<{ posts: Post[]; foundStop: boolean }> {
  const posts: Post[] = [];
  const report = () =>
    onProgress({ phase: "favorites", done: posts.length, total: expected && Math.max(expected, posts.length) });
  report();
  for (let page = 1; page <= MAX_PAGE; page++) {
    const batch = await api.favorites(page, FAV_PAGE);
    const stop = stopAt === undefined ? -1 : batch.findIndex((p) => p.id === stopAt);
    posts.push(...(stop >= 0 ? batch.slice(0, stop) : batch));
    if (stop >= 0) return { posts, foundStop: true };
    if (batch.length < FAV_PAGE) break;
    report();
  }
  return { posts, foundStop: false };
}

/**
 * Bring a stored profile up to date. Normally one or two requests: favorites
 * newer than the last one we saw. A full rebuild happens when there is no
 * profile, the last-seen favorite is gone, or the account's favorite count
 * moved by something other than the new favorites (i.e. something was
 * unfavorited, which an incremental read can't see).
 */
export async function syncProfile(
  stored: Profile | null,
  username: string,
  api: RecApi,
  now: number,
  onProgress: Progress = () => {},
  /** every favorite read, for callers that keep more of each post than the profile does */
  onPosts: (posts: Post[]) => void = () => {},
): Promise<Profile> {
  const read = async (stopAt: number | undefined, expected: number | undefined) => {
    const r = await fetchFavorites(api, stopAt, onProgress, expected);
    onPosts(r.posts);
    return r;
  };
  const count = await api.favoriteCount();
  const usable = stored?.username === username && stored.favIds.length > 0 ? stored : null;

  if (usable) {
    const added = count - usable.reported;
    const { posts, foundStop } = await read(usable.favIds[0], added > 0 ? added : undefined);
    if (foundStop && count - usable.reported === posts.length) {
      return { ...addFavorites(usable, posts, now), reported: count };
    }
    if (!foundStop) {
      // Read everything without finding the anchor: that already is a full rebuild.
      return { ...addFavorites(emptyProfile(username), posts, now), reported: count };
    }
  }

  const { posts } = await read(undefined, count);
  return { ...addFavorites(emptyProfile(username), posts, now), reported: count };
}

/** Global post counts per tag, plus the site's size. Plain JSON for localStorage. */
export interface TagCache {
  counts: Record<string, { c: number; at: number }>;
  site: { n: number; at: number } | null;
}

export const EMPTY_TAG_CACHE: TagCache = { counts: {}, site: null };

/** Tags whose global count matters: enough support, and a category that carries weight. */
export function tagsToLookUp(profile: Profile): string[] {
  return Object.entries(profile.tags)
    .filter(([name, t]) => t.n >= MIN_SUPPORT && CAT_MULT[t.cat] > 0 && !notTaste(name))
    .map(([name]) => name);
}

/**
 * Fill in missing or stale counts. Tags e621 doesn't return (renamed, aliased)
 * are cached as 0 so they aren't asked for again until the TTL runs out.
 */
export async function refreshTagCache(
  cache: TagCache,
  tags: string[],
  api: RecApi,
  now: number,
  onProgress: Progress = () => {},
): Promise<TagCache> {
  const counts = { ...cache.counts };
  const stale = tags.filter((t) => !counts[t] || now - counts[t].at > TAG_TTL_MS);
  for (let i = 0; i < stale.length; i += TAG_BATCH) {
    onProgress({ phase: "tags", done: i, total: stale.length });
    const names = stale.slice(i, i + TAG_BATCH);
    for (const name of names) counts[name] = { c: 0, at: now };
    for (const t of await api.tagCounts(names)) counts[t.name] = { c: t.post_count, at: now };
  }
  // No weighted tags means no weights to compute, so the site size isn't needed yet.
  const fresh = cache.site && now - cache.site.at <= SITE_TTL_MS;
  const site = fresh || tags.length === 0 ? cache.site : { n: await api.newestPostId(), at: now };
  return { counts, site };
}

export function countsOf(cache: TagCache): Record<string, number> {
  return Object.fromEntries(Object.entries(cache.counts).map(([k, v]) => [k, v.c]));
}
