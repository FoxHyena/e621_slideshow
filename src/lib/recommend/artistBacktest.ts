/**
 * The artist score's backtest (ENGINEERING.md §6): hide a share of someone's favorites, rank
 * artists from the rest, and count how many hidden favorites are by an artist in the top k. The
 * raw favorite count is the baseline. Used by `scripts/rec-backtest.ts --artists` (live, read-only)
 * and by a synthetic run in the unit tests. Not part of the app bundle.
 */
import type { Post } from "../e621/types";
import { MIN_FAVS, rankCandidates } from "./artists";
import { addFavorites, emptyProfile } from "./profile";

export interface ArtistRecall {
  /** hidden favorites that have an artist tag */
  hidden: number;
  /** of those, by an artist in the score's top k */
  score: number;
  /** of those, by an artist in the top k by raw favorite count */
  baseline: number;
  /** artists with MIN_FAVS+ kept favorites (the candidates) */
  candidates: number;
}

/** A stable 0–99 from a post id, so a run hides the same favorites every time. */
const bucket = (id: number, seed: number) => {
  let h = (id ^ (seed * 0x9e3779b1)) >>> 0;
  h = Math.imul(h ^ (h >>> 16), 0x45d9f3b) >>> 0;
  h = Math.imul(h ^ (h >>> 16), 0x45d9f3b) >>> 0;
  return ((h ^ (h >>> 16)) >>> 0) % 100;
};

export function artistRecall(
  favs: Post[],
  counts: Record<string, number>,
  { hide = 20, k = 10, seed = 1, now = Date.now() }: { hide?: number; k?: number; seed?: number; now?: number } = {},
): ArtistRecall {
  const hidden = favs.filter((p) => bucket(p.id, seed) < hide);
  const kept = favs.filter((p) => bucket(p.id, seed) >= hide);
  const profile = addFavorites(emptyProfile("backtest"), kept, now);
  const ranked = rankCandidates(profile, counts, null, new Set());
  const top = new Set(ranked.slice(0, k).map((c) => c.name));
  const base = new Set(
    [...ranked]
      .sort((a, b) => b.favs - a.favs || a.name.localeCompare(b.name))
      .slice(0, k)
      .map((c) => c.name),
  );
  const known = new Set(ranked.map((c) => c.name));
  let n = 0;
  let score = 0;
  let baseline = 0;
  for (const p of hidden) {
    const by = p.tags.artist ?? [];
    if (!by.length) continue;
    n++;
    if (by.some((a) => top.has(a))) score++;
    if (by.some((a) => base.has(a))) baseline++;
  }
  return { hidden: n, score, baseline, candidates: known.size };
}

export { MIN_FAVS };
