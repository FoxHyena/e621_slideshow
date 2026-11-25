import { allTags, type Post } from "../e621/types";

/** A post's features: its tags plus `rating:e|q|s`. */
export function features(post: Post): string[] {
  return [...allTags(post), `rating:${post.rating}`];
}

export interface LearnOptions {
  /** Inverse regularization strength, as in scikit-learn (smaller = flatter weights). */
  C?: number;
  /** A feature must be on at least this many training posts to get a weight. */
  minSupport?: number;
  iterations?: number;
}

/**
 * Tag weights from L2-regularized logistic regression (after e621-stats'
 * tagmodel): favorites against a sample of other posts, each class weighted to count
 * equally. Unlike lift, which judges each tag alone, the fit shares credit
 * between tags that come together (an artist and their usual character) and
 * gives negative weights to tags the user's favorites avoid.
 *
 * Minimizes ½‖w‖² + C · Σ classWeight · logloss, by full-batch Adam. Returns
 * the feature weights (no intercept: it doesn't change the order).
 */
export function learnWeights(positives: string[][], negatives: string[][], options: LearnOptions = {}): Map<string, number> {
  const steps = fit(positives, negatives, options);
  for (;;) {
    const r = steps.next();
    if (r.done) return r.value;
  }
}

/** `learnWeights`, handing the thread back every few iterations so the page stays responsive. */
export async function learnWeightsAsync(
  positives: string[][],
  negatives: string[][],
  options: LearnOptions = {},
  isCancelled: () => boolean = () => false,
): Promise<Map<string, number> | null> {
  const steps = fit(positives, negatives, options);
  for (let i = 1; ; i++) {
    const r = steps.next();
    if (r.done) return r.value;
    if (i % 10 === 0) {
      await new Promise((resolve) => setTimeout(resolve, 0));
      if (isCancelled()) return null;
    }
  }
}

/** One yield per iteration; returns the weights. */
function* fit(
  positives: string[][],
  negatives: string[][],
  { C = 0.05, minSupport = 3, iterations = 300 }: LearnOptions,
): Generator<void, Map<string, number>> {
  const support = new Map<string, number>();
  for (const tags of [...positives, ...negatives]) {
    for (const t of new Set(tags)) support.set(t, (support.get(t) ?? 0) + 1);
  }
  const index = new Map<string, number>();
  for (const [t, n] of support) if (n >= minSupport) index.set(t, index.size);
  const rows = [...positives, ...negatives].map((tags) => [
    ...new Set(tags.flatMap((t) => (index.has(t) ? [index.get(t)!] : []))),
  ]);
  const nPos = positives.length;
  const n = rows.length;
  if (!nPos || nPos === n) return new Map();
  // "balanced": each class weighs n / 2 in total.
  const cw = [n / (2 * (n - nPos)), n / (2 * nPos)];
  const y = (i: number) => (i < nPos ? 1 : 0);

  const d = index.size;
  const w = new Float64Array(d + 1); // last: intercept
  const m = new Float64Array(d + 1);
  const v = new Float64Array(d + 1);
  const g = new Float64Array(d + 1);
  const [lr, b1, b2, eps] = [0.05, 0.9, 0.999, 1e-8];
  for (let it = 1; it <= iterations; it++) {
    for (let j = 0; j < d; j++) g[j] = w[j] / C; // the ½‖w‖² term, scaled by 1/C
    g[d] = 0;
    for (let i = 0; i < n; i++) {
      const row = rows[i];
      let z = w[d];
      for (const j of row) z += w[j];
      const p = 1 / (1 + Math.exp(-z));
      const err = cw[y(i)] * (p - y(i));
      for (const j of row) g[j] += err;
      g[d] += err;
    }
    for (let j = 0; j <= d; j++) {
      m[j] = b1 * m[j] + (1 - b1) * g[j];
      v[j] = b2 * v[j] + (1 - b2) * g[j] * g[j];
      const mh = m[j] / (1 - b1 ** it);
      const vh = v[j] / (1 - b2 ** it);
      w[j] -= (lr * mh) / (Math.sqrt(vh) + eps);
    }
    yield;
  }
  const out = new Map<string, number>();
  for (const [t, j] of index) if (w[j] !== 0) out.set(t, w[j]);
  return out;
}

/** A post's learned score: the sum of its features' weights. */
export function learnedScore(post: Post, weights: Map<string, number>): number {
  let s = 0;
  for (const t of features(post)) s += weights.get(t) ?? 0;
  return s;
}
