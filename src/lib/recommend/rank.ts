import { allTags, type Post } from "../e621/types";

export interface Ranked {
  post: Post;
  score: number;
  /** strongest contributing tags, for "Recommended because" */
  reasons: string[];
}

const REASONS = 3;
/** Only a post's strongest matches count toward its score. */
export const TOP_MATCHES = 5;

/**
 * Sum of a post's TOP_MATCHES strongest tag weights.
 *
 * Summing every match let mild, near-universal preferences decide the ranking:
 * against all of e621 an explicit-heavy favorites list makes `sex`, `cum`,
 * `penetration` and friends worth ~1.4 each, and a post matching ten of them
 * outscored one by a 6.0 artist. In a live check those tags were 61% of the
 * top 50's score; with the top 5 only, 0%. It also makes tag count irrelevant,
 * so a post with 80 tags gets no credit for matching more of them by chance.
 */
export function scorePost(post: Post, weights: Map<string, number>): Omit<Ranked, "post"> {
  const hits = allTags(post)
    .map((tag) => [tag, weights.get(tag) ?? 0] as const)
    .filter(([, w]) => w > 0)
    .sort((a, b) => b[1] - a[1])
    .slice(0, TOP_MATCHES);
  return {
    score: hits.reduce((sum, [, w]) => sum + w, 0),
    reasons: hits.slice(0, REASONS).map(([tag]) => tag),
  };
}

/** Best first. Ties go to the higher e621 score, then the newer post. */
export function byRank(a: Ranked, b: Ranked): number {
  return b.score - a.score || b.post.stats.score.total - a.post.stats.score.total || b.post.id - a.post.id;
}
