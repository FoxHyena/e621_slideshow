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

/** Best taste match first. Ties go to the higher e621 score, then the newer post. */
export function byRank(a: Ranked, b: Ranked): number {
  return b.score - a.score || b.post.stats.score.total - a.post.stats.score.total || b.post.id - a.post.id;
}

/**
 * Each value's percentile in `values`, 0 (lowest) to 1 (highest). Equal values
 * share the midpoint of their ranks; a lone value sits at 0.5.
 */
export function percentiles(values: number[]): number[] {
  if (values.length < 2) return values.map(() => 0.5);
  const order = values.map((v, i) => [v, i] as const).sort((a, b) => a[0] - b[0]);
  const out = new Array<number>(values.length);
  for (let lo = 0; lo < order.length; ) {
    let hi = lo;
    while (hi + 1 < order.length && order[hi + 1][0] === order[lo][0]) hi++;
    const p = (lo + hi) / 2 / (order.length - 1);
    for (let k = lo; k <= hi; k++) out[order[k][1]] = p;
    lo = hi + 1;
  }
  return out;
}

/** Largest number of posts on each side of a post, by upload time, that make up its quality cohort. */
export const COHORT = 50;

/**
 * How well each post is doing for its age: its favorite count as a percentile
 * (0–1) among the posts uploaded closest in time to it. Within a 7-day window
 * a day-old post can't have the favorites of a week-old one, so raw counts
 * would mostly reward age. Cohorts are 2·k+1 posts with k = n/20 (5 to
 * COHORT), so a small candidate set still compares posts of similar age.
 */
export function cohortQuality(posts: Post[]): number[] {
  const n = posts.length;
  if (n < 2) return posts.map(() => 0.5);
  const byTime = posts
    .map((p, i) => ({ t: Date.parse(p.created_at), favs: p.stats.fav_count, i }))
    .sort((a, b) => a.t - b.t || a.i - b.i);
  const k = Math.min(COHORT, Math.max(5, Math.round(n / 20)));
  const width = Math.min(n, 2 * k + 1);
  const out = new Array<number>(n);
  byTime.forEach((p, j) => {
    // Slide the window inward at the ends so every cohort is the same size.
    const lo = Math.max(0, Math.min(j - k, n - width));
    let below = 0;
    let equal = 0;
    for (let m = lo; m < lo + width; m++) {
      if (m === j) continue;
      const f = byTime[m].favs;
      if (f < p.favs) below++;
      else if (f === p.favs) equal++;
    }
    out[p.i] = (below + equal / 2) / (width - 1);
  });
  return out;
}

/**
 * Weight of quality against taste in the final order. Taste and quality are
 * separate reasons to like a post: in e621-stats' head-to-head test (a user
 * ranking 150 of their own favorites), how a post's favorites ranked among
 * posts of the same age and how well its tags matched were uncorrelated, and
 * their rank sum predicted the user's ranking better than either alone
 * (Spearman +0.33 vs +0.25 / +0.26). An equal blend is what that test used.
 */
export const QUALITY_WEIGHT = 1;

/**
 * Final order: taste percentile + QUALITY_WEIGHT × quality percentile, best
 * first. Ties fall back to `byRank`. Percentiles keep the two on one scale, so
 * a few huge taste scores or favorite counts can't decide everything.
 */
export function rankAll(ranked: Ranked[], qualityWeight = QUALITY_WEIGHT): Ranked[] {
  const taste = percentiles(ranked.map((r) => r.score));
  const quality = cohortQuality(ranked.map((r) => r.post));
  return ranked
    .map((r, i) => ({ r, v: taste[i] + qualityWeight * quality[i] }))
    .sort((a, b) => b.v - a.v || byRank(a.r, b.r))
    .map(({ r }) => r);
}
