import type { Post } from "../e621/types";
import { MAX_PAGE } from "../query/build";
import { addFavorites, emptyProfile, type Profile } from "./profile";
import { CAT_MULT, MIN_SUPPORT } from "./weights";

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

export type Progress = (msg: string) => void;

async function fetchFavorites(
  api: RecApi,
  stopAt: number | undefined,
  onProgress: Progress,
): Promise<{ posts: Post[]; foundStop: boolean }> {
  const posts: Post[] = [];
  for (let page = 1; page <= MAX_PAGE; page++) {
    const batch = await api.favorites(page, FAV_PAGE);
    const stop = stopAt === undefined ? -1 : batch.findIndex((p) => p.id === stopAt);
    posts.push(...(stop >= 0 ? batch.slice(0, stop) : batch));
    if (stop >= 0) return { posts, foundStop: true };
    if (batch.length < FAV_PAGE) break;
    onProgress(`Reading favorites… ${posts.length}`);
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
): Promise<Profile> {
  const count = await api.favoriteCount();
  const usable = stored?.username === username && stored.favIds.length > 0 ? stored : null;

  if (usable) {
    const { posts, foundStop } = await fetchFavorites(api, usable.favIds[0], onProgress);
    if (foundStop && count - usable.reported === posts.length) {
      return { ...addFavorites(usable, posts, now), reported: count };
    }
    if (!foundStop) {
      // Read everything without finding the anchor: that already is a full rebuild.
      return { ...addFavorites(emptyProfile(username), posts, now), reported: count };
    }
  }

  onProgress("Reading favorites…");
  const { posts } = await fetchFavorites(api, undefined, onProgress);
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
    .filter(([, t]) => t.n >= MIN_SUPPORT && CAT_MULT[t.cat] > 0)
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
    if (stale.length > TAG_BATCH) onProgress(`Looking up tags… ${i}/${stale.length}`);
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
