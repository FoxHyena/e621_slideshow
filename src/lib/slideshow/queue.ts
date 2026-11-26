import { isAbort, type Lane } from "../e621/client";
import { mediaKind, type Post } from "../e621/types";
import { blacklistedBy, type BlacklistRule, type MatchContext } from "../query/blacklist";
import { MAX_PAGE, type BuiltQuery } from "../query/build";
import type { SearchSettings } from "../settings";

export type PageFetcher = (tags: string, page: string | number, limit: number, opts?: { signal?: AbortSignal; lane?: Lane }) => Promise<Post[]>;

export const PAGE_SIZE = 100;
/** Fetch the next page when this many or fewer posts remain ahead. */
export const REFILL_THRESHOLD = 10;
/** The new-posts pill counts up to this many ("30+ new posts"). */
export const NEWER_MAX = 30;
/** Max pages to pull in one refill when the blacklist eats whole pages. */
const MAX_PAGES_PER_REFILL = 5;

export interface QueueStats {
  /** posts with no file URL (anonymous users can't see some posts) */
  hidden: number;
  blacklisted: number;
}

export interface SearchProgress {
  /** pages fetched so far; how many remain isn't known until a short page arrives */
  done: number;
  /** distinct posts that matched the profile so far */
  found: number;
  /** most pages the search can take: it usually ends sooner, on a short page */
  max: number;
  /** when the search started, and when the last page arrived (ms), for the time estimate */
  startedAt: number;
  at: number;
}

/** What the app drives a slideshow source through. */
export interface SlideQueue {
  readonly posts: Post[];
  readonly exhausted: boolean;
  readonly loading: boolean;
  readonly error: string | null;
  readonly stats: QueueStats;
  readonly query: string;
  ensure(index: number): Promise<void>;
  remove(id: number): void;
  patch(id: number, patch: Partial<Post>): void;
  retry(): void;
  /** Swap the blacklist mid-show: drops loaded posts it now hides and filters later pages. */
  setRules(rules: BlacklistRule[]): void;
  /** ranked sources: how well a post matched the profile, and the tags that drove it */
  matchFor?(id: number): { score: number; reasons: string[] } | undefined;
  /** stop any background fetching */
  dispose?(): void;
  /** drop the requests waiting for this queue (it was evicted); a later `ensure` fetches again */
  cancel?(): void;
  /** the highest id e621 sent, before any filtering (cursor-paged search queues) */
  readonly rawMax?: number;
  /** started from a saved first page rather than e621 (cursor-paged search queues) */
  readonly seeded?: boolean;
  seed?(posts: Post[], rawMax?: number): boolean;
  countNewer?(limit?: number): Promise<{ count: number; more: boolean }>;
  /** background search progress, for sources that fetch ahead on their own */
  readonly progress?: SearchProgress;
}

export interface PostFilter {
  seen: Set<number>;
  media: SearchSettings["media"];
  rules: BlacklistRule[];
  ctx: MatchContext;
  stats: QueueStats;
}

/** Whether a fetched post can be shown; counts hidden and blacklisted posts in `f.stats`. */
export function acceptPost(post: Post, f: PostFilter): boolean {
  if (f.seen.has(post.id)) return false;
  f.seen.add(post.id);
  if (!post.files.original.url) {
    f.stats.hidden++;
    return false;
  }
  const kind = mediaKind(post);
  if (kind === "other") return false;
  if (!f.media[kind]) return false;
  if (blacklistedBy(f.rules, post, f.ctx)) {
    f.stats.blacklisted++;
    return false;
  }
  return true;
}

/**
 * Buffer of displayable posts for one query. Pages are fetched on demand,
 * deduplicated, and filtered (blacklist, missing file URL, disabled media).
 * Mutable; the owner re-renders via `onChange`.
 */
export class PostQueue implements SlideQueue {
  posts: Post[] = [];
  exhausted = false;
  loading = false;
  error: string | null = null;
  stats: QueueStats = { hidden: 0, blacklisted: 0 };
  /**
   * The highest and lowest ids e621 sent, before the blacklist and media filters dropped any
   * (Following: what "everything loaded" means for marking seen; 0 before the first page).
   */
  rawMax = 0;
  rawMin = 0;
  seeded = false;

  private seen = new Set<number>();
  private nextPage: string | number;
  private inflight: Promise<void> | null = null;
  private rules: BlacklistRule[];
  private abort = new AbortController();

  constructor(
    private built: BuiltQuery,
    private media: SearchSettings["media"],
    private fetcher: PageFetcher,
    private ctx: MatchContext = {},
    private onChange: () => void = () => {},
  ) {
    this.rules = built.rules;
    this.nextPage = built.paging === "cursor" ? "" : 1;
  }

  get query(): string {
    return this.built.query;
  }

  /** Make sure posts beyond `index` are loaded (or the results are exhausted). */
  ensure(index: number): Promise<void> {
    if (this.exhausted || this.error) return Promise.resolve();
    if (this.posts.length - 1 - index > REFILL_THRESHOLD) return Promise.resolve();
    if (!this.inflight) {
      const p: Promise<void> = this.refill().finally(() => {
        if (this.inflight === p) this.inflight = null;
      });
      this.inflight = p;
    }
    return this.inflight;
  }

  /** Drop a post (e.g. its media failed to load) without affecting paging. */
  remove(id: number) {
    const i = this.posts.findIndex((p) => p.id === id);
    if (i >= 0) {
      this.posts.splice(i, 1);
      this.onChange();
    }
  }

  /** Update a post in place (e.g. favorite toggled). */
  patch(id: number, patch: Partial<Post>) {
    const i = this.posts.findIndex((p) => p.id === id);
    if (i >= 0) {
      this.posts[i] = { ...this.posts[i], ...patch };
      this.onChange();
    }
  }

  retry() {
    this.error = null;
    this.onChange();
  }

  /** Drop what's waiting; a refill under way is forgotten, so an `ensure` right after starts afresh. */
  cancel() {
    this.abort.abort();
    this.abort = new AbortController();
    this.inflight = null;
    if (this.loading) {
      this.loading = false;
      this.onChange();
    }
  }

  /**
   * Start from a saved first page (Following's instant paint): its posts show at once and paging
   * goes on below the last one. Only before anything loaded; the posts pass today's filters again.
   */
  seed(raw: Post[], rawMax = 0): boolean {
    if (this.built.paging !== "cursor" || this.posts.length > 0 || this.inflight || raw.length === 0) return false;
    const ids = raw.map((p) => p.id);
    // What e621 sent may top what was kept (a blacklisted newest post): "newer" starts above it.
    this.rawMax = Math.max(rawMax, ...ids);
    this.rawMin = Math.min(...ids);
    this.nextPage = `b${this.rawMin}`;
    this.seeded = true;
    this.posts.push(...raw.filter((p) => this.accept(p)));
    this.onChange();
    return true;
  }

  /**
   * How many posts the feed would show above the newest one loaded: up to `limit`, and whether
   * there are more. Nothing is added (the new-posts pill does that). It's asked for the screen on
   * show, so it waits as `user`: behind a hidden For You's ranking it would wait for aging.
   */
  async countNewer(limit = NEWER_MAX): Promise<{ count: number; more: boolean }> {
    if (this.built.paging !== "cursor" || this.rawMax === 0) return { count: 0, more: false };
    const raw = await this.fetcher(`${this.built.query} id:>${this.rawMax}`.trim(), 1, limit, { lane: "user", signal: this.abort.signal });
    const f: PostFilter = { seen: new Set(this.seen), media: this.media, rules: this.rules, ctx: this.ctx, stats: { hidden: 0, blacklisted: 0 } };
    return { count: raw.filter((p) => acceptPost(p, f)).length, more: raw.length >= limit };
  }

  dispose() {
    this.cancel();
  }

  setRules(rules: BlacklistRule[]) {
    this.rules = rules;
    const kept = this.posts.filter((p) => !blacklistedBy(rules, p, this.ctx));
    this.stats.blacklisted += this.posts.length - kept.length;
    this.posts = kept;
    this.onChange();
  }

  private accept(post: Post): boolean {
    return acceptPost(post, { seen: this.seen, media: this.media, rules: this.rules, ctx: this.ctx, stats: this.stats });
  }

  private async refill() {
    // A cancelled refill must not touch the queue after a newer one started.
    const signal = this.abort.signal;
    this.loading = true;
    this.onChange();
    try {
      for (let i = 0; i < MAX_PAGES_PER_REFILL && !this.exhausted; i++) {
        const page = this.nextPage;
        // The first page is what's on screen; later ones are read ahead.
        const lane: Lane = this.posts.length === 0 ? "user" : "page";
        const raw = await this.fetcher(this.built.query, page, PAGE_SIZE, { signal, lane });
        if (signal.aborted) return;
        if (raw.length === 0) {
          this.exhausted = true;
          break;
        }
        const ids = raw.map((p) => p.id);
        this.rawMax = Math.max(this.rawMax, ...ids);
        this.rawMin = Math.min(this.rawMin || Infinity, ...ids);
        if (this.built.paging === "cursor") {
          this.nextPage = `b${Math.min(...ids)}`;
        } else {
          const n = (this.nextPage as number) + 1;
          this.nextPage = n;
          if (n > MAX_PAGE) this.exhausted = true;
        }
        if (raw.length < PAGE_SIZE) this.exhausted = true;
        const fresh = raw.filter((p) => this.accept(p));
        this.posts.push(...fresh);
        if (fresh.length > 0) break;
      }
    } catch (e) {
      // Cancelled (the feed was evicted): not an error; the next `ensure` asks again.
      if (!isAbort(e) && !signal.aborted) this.error = e instanceof Error ? e.message : String(e);
    } finally {
      if (!signal.aborted) {
        this.loading = false;
        this.onChange();
      }
    }
  }
}
