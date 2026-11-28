import { allTags, type Post } from "../e621/types";
import { blacklistedBy, type BlacklistRule } from "../query/blacklist";
import { buildRecommendedQuery } from "../query/build";
import type { SearchSettings } from "../settings";
import { acceptPost, type PostFilter, type QueueStats, type SearchProgress, type SlideQueue } from "../slideshow/queue";
import { learnedScore } from "./learn";
import { searchPlan, type Overrides } from "./weights";
import { QUALITY_WEIGHT, rankAll, scorePost, type Ranked } from "./rank";

/** Most pages of candidates to fetch (8,000 posts). The search usually ends sooner, on a short page. */
export const REC_PAGE_BUDGET = 25;
export const REC_PAGE_SIZE = 320;
/**
 * Pages of the window's best-scored posts, whatever their tags, fetched next to
 * the tag search and ranked with it. In a live backtest over 11 accounts (hide
 * each one's last 30 days of favorites, rank the window), the tag search alone
 * put 15.8% of those favorites in the top 200; adding 3 popular pages, 21.8%.
 * 5 or 10 pages found more but ranked no better (22.0%, 21.8%), so 3 keeps the
 * wait short. With the default 7-day window (9 accounts with enough recent
 * favorites): 15.5% → 48.1%, and 5 pages did slightly worse (46.6%).
 * See scripts/rec-backtest.ts.
 */
export const REC_POPULAR_PAGES = 3;
export interface TagQuery {
  tag: string;
  query: string;
  pages: number;
  /**
   * Queries to go on with, in order, when this one runs out before its page budget. They share
   * the budget (`searchTiers`: the next tags by weight once the first ones are used up).
   */
  more?: string[];
}

export type RecFetch = (query: string, page: number, limit: number) => Promise<Post[]>;

/**
 * How many rounds of `breadth` tags the candidate search may go through. Specific tags run out
 * fast: a friend's 15 searched tags found every post of a 30-day window in 4 of the 25 pages the
 * search may use. When a round's tags run out, the search goes on with the next `breadth` tags
 * by weight, until the page budget is spent or the rounds are.
 */
export const SEARCH_TIERS = 3;

/**
 * The searched tags in rounds: the plan (`searchPlan`), then each next `breadth` tags of a wider
 * plan, so each round keeps names to their share. Empty rounds are dropped.
 */
export function searchTiers(
  weights: Map<string, number>,
  overrides: Overrides,
  breadth: number,
  isName: (tag: string) => boolean = () => false,
  tiers = SEARCH_TIERS,
): string[][] {
  const out: string[][] = [];
  const taken = new Set<string>();
  for (let k = 1; k <= tiers; k++) {
    const next = searchPlan(weights, overrides, breadth * k, isName)
      .map((p) => p.tag)
      .filter((t) => !taken.has(t))
      .slice(0, breadth);
    if (!next.length) break;
    next.forEach((t) => taken.add(t));
    out.push(next);
  }
  return out;
}

/**
 * The candidate search For You runs: the tag rounds (`searchTiers`) as one query sharing the page
 * budget, and the window's popular posts beside it.
 */
export function recQueries(s: SearchSettings, tiers: string[][], tagLimit: number): TagQuery[] {
  // no tags yet: the window alone, as before there were rounds
  const [first, ...rest] = (tiers.length ? tiers : [[]]).map((t) => buildRecommendedQuery(s, t, tagLimit));
  return [
    { tag: "candidates", query: first.query, pages: REC_PAGE_BUDGET, more: rest.map((r) => r.query) },
    { tag: "popular", query: first.popular, pages: REC_POPULAR_PAGES },
  ];
}

/**
 * A slideshow source that fetches every candidate page in the background, then
 * shows the whole set ranked by taste (learned weights when given) and quality
 * (see `rankAll`), leaving out posts already in the user's favorites. Nothing
 * is shown until the search ends: results arrive in e621-score order, so the
 * best match for this profile can be on the last page, and showing early would
 * play worse posts first.
 *
 * Takes a list of queries, fetched round by round, each until a short page or
 * its page budget; the app passes the OR query of profile tags and the
 * window's popular posts.
 */
export class RecommendedQueue implements SlideQueue {
  posts: Post[] = [];
  exhausted = false;
  loading = false;
  error: string | null = null;
  stats: QueueStats = { hidden: 0, blacklisted: 0 };

  private ranked: Ranked[] = [];
  private matches = new Map<number, { score: number; reasons: string[] }>();
  private filter: PostFilter;
  /** tags whose results ran out before their budget */
  private done = new Set<string>();
  private round = 1;
  private pos = 0;
  private requests = 0;
  /** pages fetched per query tag */
  private fetched = new Map<string, number>();
  /** per query tag on to its `more`: which one, and the round its page 1 was fetched in */
  private tier = new Map<string, { i: number; from: number }>();
  private startedAt = Date.now();
  private at = this.startedAt;
  private running = false;
  private disposed = false;
  private waiters: { ready: () => boolean; resolve: () => void }[] = [];

  constructor(
    private queries: TagQuery[],
    private fetch: RecFetch,
    private weights: Map<string, number>,
    filter: Omit<PostFilter, "seen" | "stats">,
    /** muted profile tags: posts carrying any of them are left out, like a blacklist */
    private muted: ReadonlySet<string>,
    private onChange: () => void = () => {},
    /**
     * Learned tag weights (learn.ts) to rank by in place of `weights`. `weights`
     * still decides which posts match at all and the "Recommended because" tags.
     */
    private learned: Map<string, number> | null = null,
    /**
     * Tune's "Filter artists": when set, a post is scored without its artist tags, except
     * these (pinned ones). The learned weights still hold artists the favorites never had.
     */
    private keepArtists: ReadonlySet<string> | null = null,
    /** Tune's Taste ↔ Popular (rankAll's quality weight) */
    private qualityWeight = QUALITY_WEIGHT,
  ) {
    this.filter = { ...filter, seen: new Set(), stats: this.stats };
    void this.run();
  }

  get progress(): SearchProgress {
    const left = this.queries.reduce(
      (n, q) => n + (this.done.has(q.tag) ? 0 : Math.max(0, q.pages - (this.fetched.get(q.tag) ?? 0))),
      0,
    );
    return { done: this.requests, found: this.ranked.length, max: this.requests + left, startedAt: this.startedAt, at: this.at };
  }

  get query(): string {
    return this.queries[0]?.query ?? "";
  }

  /** Resolves once the search has ended (or failed), when every post is in place. */
  ensure(): Promise<void> {
    void this.run();
    const ready = () => this.exhausted || !!this.error || this.disposed;
    if (ready()) return Promise.resolve();
    return new Promise((resolve) => this.waiters.push({ ready, resolve }));
  }

  matchFor(id: number): { score: number; reasons: string[] } | undefined {
    return this.matches.get(id);
  }

  remove(id: number) {
    const before = this.ranked.length;
    this.ranked = this.ranked.filter((r) => r.post.id !== id);
    if (this.ranked.length !== before) this.changed();
  }

  patch(id: number, patch: Partial<Post>) {
    this.ranked = this.ranked.map((r) => (r.post.id === id ? { ...r, post: { ...r.post, ...patch } } : r));
    this.changed();
  }

  retry() {
    this.error = null;
    this.changed();
  }

  setRules(rules: BlacklistRule[]) {
    this.filter.rules = rules;
    const kept = this.ranked.filter((r) => !blacklistedBy(rules, r.post, this.filter.ctx));
    this.stats.blacklisted += this.ranked.length - kept.length;
    this.ranked = kept;
    this.changed();
  }

  dispose() {
    this.disposed = true;
    this.wake();
  }

  /** The next page to fetch, skipping tags that are out of budget or results. */
  private peek(): (TagQuery & { page: number }) | null {
    const rounds = Math.max(0, ...this.queries.map((q) => q.pages));
    while (this.round <= rounds) {
      if (this.pos >= this.queries.length) {
        this.round++;
        this.pos = 0;
        continue;
      }
      const q = this.queries[this.pos];
      if (q.pages >= this.round && !this.done.has(q.tag)) {
        // each query fetches one page a round, so the budget is the round; a `more` query starts at its page 1
        const t = this.tier.get(q.tag);
        return t ? { ...q, query: q.more![t.i], page: this.round - t.from + 1 } : { ...q, page: this.round };
      }
      this.pos++;
    }
    return null;
  }

  private async run() {
    if (this.running || this.disposed || this.error || this.exhausted) return;
    this.running = true;
    this.loading = true;
    this.onChange();
    try {
      for (let next = this.peek(); next; next = this.peek()) {
        const batch = await this.fetch(next.query, next.page, REC_PAGE_SIZE);
        if (this.disposed) return;
        // Advance only after success, so a retry repeats the failed page and nothing else.
        this.pos++;
        this.requests++;
        this.fetched.set(next.tag, (this.fetched.get(next.tag) ?? 0) + 1);
        this.at = Date.now();
        if (batch.length < REC_PAGE_SIZE) {
          const i = (this.tier.get(next.tag)?.i ?? -1) + 1;
          if (next.more && i < next.more.length) this.tier.set(next.tag, { i, from: this.round + 1 });
          else this.done.add(next.tag);
        }
        this.add(batch);
        this.onChange(); // progress only; posts stay hidden until the end
      }
      this.exhausted = true;
    } catch (e) {
      if (!this.disposed) this.error = e instanceof Error ? e.message : String(e);
    } finally {
      this.running = false;
      this.loading = false;
      if (!this.disposed) {
        this.rank();
        this.changed();
      }
    }
  }

  private add(batch: Post[]) {
    for (const post of batch) {
      if (!acceptPost(post, this.filter)) continue;
      // Already a favorite: seen, and it's part of the profile that ranks everything else.
      if (post.stats.is_favorited) continue;
      if (this.muted.size && allTags(post).some((t) => this.muted.has(t))) continue;
      const r = scorePost(this.taste(post), this.weights);
      if (r.score <= 0) continue;
      this.ranked.push({ post, ...r });
      this.matches.set(post.id, r);
    }
  }

  /**
   * Tune's Taste ↔ Popular moved: re-sort the found posts by the new weight, with no new searches.
   * True when the published order changed; a search still running ranks with it when it ends.
   */
  /** Taste ↔ Popular's weight its order uses (or will, once the search ends). */
  get weight(): number {
    return this.qualityWeight;
  }

  reweigh(w: number): boolean {
    if (w === this.qualityWeight) return false;
    this.qualityWeight = w;
    if (this.disposed || !(this.exhausted || this.error)) return false;
    this.rank();
    this.changed();
    return true;
  }

  private rank() {
    const learned = this.learned;
    this.ranked = rankAll(this.ranked, this.qualityWeight, learned ? (r) => learnedScore(this.taste(r.post), learned) : undefined);
  }

  /** What a post's taste is scored on: all of it, or (Filter artists) all but who drew it. */
  private taste(post: Post): Post {
    const keep = this.keepArtists;
    if (!keep || !post.tags.artist?.length) return post;
    return { ...post, tags: { ...post.tags, artist: post.tags.artist.filter((t) => keep.has(t)) } };
  }

  /** Publish posts, but only once the search is over (or failed, so what was found still plays). */
  private changed() {
    this.posts = this.exhausted || this.error ? this.ranked.map((r) => r.post) : [];
    this.wake();
    this.onChange();
  }

  private wake() {
    const still: typeof this.waiters = [];
    for (const w of this.waiters) {
      if (this.disposed || w.ready()) w.resolve();
      else still.push(w);
    }
    this.waiters = still;
  }
}
