import { mediaKind, type Post } from "../e621/types";
import { blacklistedBy, type BlacklistRule, type MatchContext } from "../query/blacklist";
import { MAX_PAGE, type BuiltQuery } from "../query/build";
import type { SearchSettings } from "../settings";

export type PageFetcher = (tags: string, page: string | number, limit: number) => Promise<Post[]>;

export const PAGE_SIZE = 100;
/** Fetch the next page when this many or fewer posts remain ahead. */
export const REFILL_THRESHOLD = 10;
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
  /** ranked sources: how well a post matched the profile, and the tags that drove it */
  matchFor?(id: number): { score: number; reasons: string[] } | undefined;
  /** stop any background fetching */
  dispose?(): void;
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

  private seen = new Set<number>();
  private nextPage: string | number;
  private inflight: Promise<void> | null = null;
  private rules: BlacklistRule[];

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
      this.inflight = this.refill().finally(() => {
        this.inflight = null;
      });
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

  private accept(post: Post): boolean {
    return acceptPost(post, { seen: this.seen, media: this.media, rules: this.rules, ctx: this.ctx, stats: this.stats });
  }

  private async refill() {
    this.loading = true;
    this.onChange();
    try {
      for (let i = 0; i < MAX_PAGES_PER_REFILL && !this.exhausted; i++) {
        const page = this.nextPage;
        const raw = await this.fetcher(this.built.query, page, PAGE_SIZE);
        if (raw.length === 0) {
          this.exhausted = true;
          break;
        }
        if (this.built.paging === "cursor") {
          this.nextPage = `b${Math.min(...raw.map((p) => p.id))}`;
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
      this.error = e instanceof Error ? e.message : String(e);
    } finally {
      this.loading = false;
      this.onChange();
    }
  }
}
