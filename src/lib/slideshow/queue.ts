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

/**
 * Buffer of displayable posts for one query. Pages are fetched on demand,
 * deduplicated, and filtered (blacklist, missing file URL, disabled media).
 * Mutable; the owner re-renders via `onChange`.
 */
export class PostQueue {
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
    if (this.seen.has(post.id)) return false;
    this.seen.add(post.id);
    if (!post.file.url) {
      this.stats.hidden++;
      return false;
    }
    const kind = mediaKind(post);
    if (kind === "other") return false;
    if (!this.media[kind]) return false;
    if (blacklistedBy(this.rules, post, this.ctx)) {
      this.stats.blacklisted++;
      return false;
    }
    return true;
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
