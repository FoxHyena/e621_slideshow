import { allTags, type Post } from "../e621/types";
import { acceptPost, type PostFilter, type QueueStats, type SearchProgress, type SlideQueue } from "../slideshow/queue";
import { rankAll, scorePost, type Ranked } from "./rank";

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
}

export type RecFetch = (query: string, page: number, limit: number) => Promise<Post[]>;

/**
 * A slideshow source that fetches every candidate page in the background, then
 * shows the whole set ranked by taste and quality (see `rankAll`), leaving out
 * posts already in the user's favorites. Nothing is shown until the search
 * ends: results arrive in e621-score order, so the best match for this profile
 * can be on the last page, and showing early would play worse posts first.
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
  ) {
    this.filter = { ...filter, seen: new Set(), stats: this.stats };
    void this.run();
  }

  get progress(): SearchProgress {
    return { done: this.requests, found: this.ranked.length };
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
      if (q.pages >= this.round && !this.done.has(q.tag)) return { ...q, page: this.round };
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
        if (batch.length < REC_PAGE_SIZE) this.done.add(next.tag);
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
        this.ranked = rankAll(this.ranked);
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
      const r = scorePost(post, this.weights);
      if (r.score <= 0) continue;
      this.ranked.push({ post, ...r });
      this.matches.set(post.id, r);
    }
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
