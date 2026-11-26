/**
 * Artist suggestions (ENGINEERING.md §6): artists you favorite a lot and don't follow yet, for
 * Artists › Suggested and Follow from favorites. Pure, so it is tested without e621.
 *
 *   affinity = (favs + 1) / (postCount + 20)          a smoothed share of their work you favorited
 *   recency  = max(0.2, exp(-daysSinceLastPost / 45)) still posting?
 *   learned  = sigmoid(learned weight), 0.5 unknown    For You's learned taste for the artist tag
 *   score    = affinity × recency × (0.5 + learned)
 *
 * Two passes, so the list doesn't reorder while you read it: rank without recency, look up the top
 * ones' newest posts, rank once more with recency, then show.
 */
import type { Post } from "../e621/types";
import { NOT_ARTISTS } from "../feed/format";
import type { Profile } from "./profile";

/** Favorites an artist needs before they're suggested. */
export const MIN_FAVS = 3;
/** Artists whose newest posts are looked up (the second pass). */
export const RECENCY_TOP = 32;
/** Artists per batched tile search (`~a ~b … order:id_desc`). */
export const TILE_BATCH = 8;
/** Follow from favorites lists this many; the first PICKED start picked. */
export const LIST_TOP = 30;
export const PICKED = 10;

/** Artist tags that name no one (e621's placeholders), never suggested. */
export const NOBODY = new Set(["unknown_artist", "anonymous_artist", "unknown_artist_signature", "third-party_edit", "sketch_artist", "artist_request"]);

export interface ArtistCandidate {
  name: string;
  /** your favorites carrying the tag */
  favs: number;
  /** e621's post count for the tag (0 when not known yet) */
  posts: number;
  /** without recency */
  base: number;
}

export interface ArtistSuggestion extends ArtistCandidate {
  /** newest post seen (ms), or null when the lookup found none */
  lastPostAt: number | null;
  score: number;
}

export const affinity = (favs: number, posts: number) => (favs + 1) / (Math.max(posts, favs) + 20);
export const recency = (days: number) => Math.max(0.2, Math.exp(-Math.max(0, days) / 45));
const sigmoid = (w: number) => 1 / (1 + Math.exp(-w));

/**
 * The first pass: every artist tag in the profile with at least MIN_FAVS favorites, minus the
 * ones you follow or hid, best first.
 */
export function rankCandidates(
  profile: Profile,
  counts: Record<string, number>,
  learned: Map<string, number> | null,
  exclude: ReadonlySet<string>,
): ArtistCandidate[] {
  const out: ArtistCandidate[] = [];
  for (const [name, t] of Object.entries(profile.tags)) {
    if (t.cat !== "artist" || t.n < MIN_FAVS || NOT_ARTISTS.has(name) || NOBODY.has(name) || exclude.has(name)) continue;
    const posts = counts[name] ?? 0;
    const w = learned?.get(name);
    out.push({ name, favs: t.n, posts, base: affinity(t.n, posts) * (0.5 + (w === undefined ? 0.5 : sigmoid(w))) });
  }
  return out.sort((a, b) => b.base - a.base || b.favs - a.favs || a.name.localeCompare(b.name));
}

/** The second pass: recency from each artist's newest post, then the final order. */
export function rankWithRecency(cands: ArtistCandidate[], lastPostAt: ReadonlyMap<string, number>, now: number): ArtistSuggestion[] {
  return cands
    .map((c) => {
      const at = lastPostAt.get(c.name) ?? null;
      // nothing found in the lookup: as good as a long silence
      const days = at === null ? 365 : (now - at) / 86_400_000;
      return { ...c, lastPostAt: at, score: c.base * recency(days) };
    })
    .sort((a, b) => b.score - a.score || b.favs - a.favs || a.name.localeCompare(b.name));
}

/** One search per TILE_BATCH artists, any of them, newest first. */
export function tileQueries(names: string[], batch = TILE_BATCH): string[][] {
  const out: string[][] = [];
  for (let i = 0; i < names.length; i += batch) out.push(names.slice(i, i + batch));
  return out;
}

export const tileQuery = (names: string[], extra = "") => [...names.map((n) => `~${n}`), "order:id_desc", extra].filter(Boolean).join(" ");

/**
 * Group a batched page by artist: each artist's newest post time and up to `per` of their posts
 * (those `keep` lets through: ratings and the blacklist), newest first.
 */
export function groupByArtist(
  posts: Post[],
  names: string[],
  keep: (p: Post) => boolean = () => true,
  per = 3,
): { lastPostAt: Map<string, number>; tiles: Map<string, Post[]> } {
  const want = new Set(names);
  const lastPostAt = new Map<string, number>();
  const tiles = new Map<string, Post[]>(names.map((n) => [n, []]));
  for (const p of posts) {
    const at = Date.parse(p.created_at);
    for (const a of p.tags.artist ?? []) {
      if (!want.has(a)) continue;
      if (!Number.isNaN(at) && at > (lastPostAt.get(a) ?? -Infinity)) lastPostAt.set(a, at);
      const list = tiles.get(a)!;
      if (list.length < per && keep(p)) list.push(p);
    }
  }
  return { lastPostAt, tiles };
}
