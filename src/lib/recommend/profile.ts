import type { Post, TagCategoryName } from "../e621/types";

export interface TagStat {
  /** number of favorites carrying this tag */
  n: number;
  cat: TagCategoryName;
}

/**
 * Tag counts over a user's favorites. Plain JSON so it round-trips through localStorage.
 * `favIds` is newest-favorited first; `favIds[0]` is where an incremental sync stops.
 */
export interface Profile {
  username: string;
  tags: Record<string, TagStat>;
  favIds: number[];
  /**
   * The account's favorite_count at the last sync. Can differ from favIds.length
   * (deleted posts aren't listed), so sync compares deltas, not totals.
   */
  reported: number;
  /** ms epoch of the last sync */
  syncedAt: number;
}

export function emptyProfile(username: string): Profile {
  return { username, tags: {}, favIds: [], reported: 0, syncedAt: 0 };
}

/**
 * Fold newly seen favorites (newest first) into the profile. Posts already
 * counted are skipped, so an overlapping page can't double-count.
 */
export function addFavorites(profile: Profile, posts: Post[], now: number): Profile {
  const known = new Set(profile.favIds);
  const tags = { ...profile.tags };
  const fresh: number[] = [];
  for (const post of posts) {
    if (known.has(post.id)) continue;
    known.add(post.id);
    fresh.push(post.id);
    for (const [cat, names] of Object.entries(post.tags) as [TagCategoryName, string[] | undefined][]) {
      for (const name of names ?? []) {
        const prev = tags[name];
        tags[name] = { n: (prev?.n ?? 0) + 1, cat };
      }
    }
  }
  return { ...profile, tags, favIds: [...fresh, ...profile.favIds], syncedAt: now };
}
