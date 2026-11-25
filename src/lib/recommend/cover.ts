/**
 * How much a favorite still counts once a picked tag already finds it. 0 would
 * ignore it entirely; a little weight left lets a tag that also re-finds
 * covered favorites still beat one that finds nothing at all.
 */
export const COVER_DECAY = 0.2;

export interface CoverCost {
  /** expected posts the tag adds to the candidate search (its share of the window) */
  posts: (tag: string) => number;
  /** posts the whole search can take in (the page budget) */
  budget: number;
}

/**
 * Search tags picked by sequential covering (after e621-stats' `branch_cover`):
 * each pick is the tag that newly finds the most favorites, then the favorites
 * it finds count only COVER_DECAY from there on. So an artist's own character,
 * which finds the same posts as the artist, stops looking valuable once the
 * artist is picked, and the slot goes to a tag that reaches a different part of
 * the favorites.
 *
 * Without `cost`, a tag's value is weight × favorites newly found. With it,
 * favorites newly found ÷ (expected posts + budget / breadth): a broad tag that
 * would fill the page budget with generic posts pays for them, while tags far
 * below their share of the budget are judged on the favorites they find.
 *
 * `favorites` is each favorite's tag list; only weighted tags are considered.
 * Pinned tags come first and cover their favorites like any pick.
 */
export function coverTags(
  weights: Map<string, number>,
  favorites: string[][],
  pinned: string[],
  breadth: number,
  cost?: CoverCost,
): string[] {
  const postings = new Map<string, number[]>();
  favorites.forEach((tags, f) => {
    for (const t of new Set(tags)) {
      if (!weights.has(t)) continue;
      const list = postings.get(t);
      if (list) list.push(f);
      else postings.set(t, [f]);
    }
  });
  const left = new Array<number>(favorites.length).fill(1);
  const take = (tag: string) => {
    for (const f of postings.get(tag) ?? []) left[f] *= COVER_DECAY;
  };
  const slot = cost ? cost.budget / Math.max(1, breadth) : 0;
  const value = (tag: string, found: number) =>
    cost ? found / (cost.posts(tag) + slot) : found * weights.get(tag)!;

  const picked = pinned.filter((t) => weights.has(t)).slice(0, breadth);
  picked.forEach(take);
  const taken = new Set(picked);
  while (picked.length < breadth) {
    let best: string | null = null;
    let bestValue = 0;
    for (const [tag, favs] of postings) {
      if (taken.has(tag)) continue;
      let found = 0;
      for (const f of favs) found += left[f];
      const v = value(tag, found);
      if (v > bestValue || (v === bestValue && best !== null && tag < best)) {
        best = tag;
        bestValue = v;
      }
    }
    if (best === null) break;
    picked.push(best);
    taken.add(best);
    take(best);
  }
  return picked;
}
