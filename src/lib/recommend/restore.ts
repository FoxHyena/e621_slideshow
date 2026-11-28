import type { Post } from "../e621/types";
import { blacklistedBy, type BlacklistRule } from "../query/blacklist";
import { acceptPost, type PostFilter, type QueueStats, type SlideQueue } from "../slideshow/queue";

/** Ids per request: e621's page size, so one `id:a,b,…` search returns the whole batch. */
export const ID_BATCH = 100;
/** Keep this many posts loaded past the one asked for. */
const AHEAD = 20;

export type IdFetch = (query: string, page: number, limit: number) => Promise<Post[]>;

/**
 * A ranked list played back from its saved ids (For You after a reload or a return within 30
 * minutes): fetched a batch at a time with `id:a,b,…` and kept in the saved order. Posts deleted
 * since, or hidden by a blacklist line added since, drop out; nothing is re-ranked.
 */
export class IdListQueue implements SlideQueue {
  posts: Post[] = [];
  exhausted: boolean;
  loading = false;
  error: string | null = null;
  stats: QueueStats = { hidden: 0, blacklisted: 0 };

  private next = 0;
  private filter: PostFilter;
  private inflight: Promise<void> | null = null;

  constructor(
    /** the ids, or how to get them on the first load (a comic's pages: src/feed/comics.tsx) */
    private ids: readonly number[] | (() => Promise<readonly number[]>),
    private fetch: IdFetch,
    filter: Omit<PostFilter, "seen" | "stats">,
    private onChange: () => void = () => {},
    /** when the list was ranked */
    readonly savedAt: number | null = null,
    readonly query = "For You",
  ) {
    this.filter = { ...filter, seen: new Set(), stats: this.stats };
    this.exhausted = typeof ids !== "function" && ids.length === 0;
  }

  ensure(index: number): Promise<void> {
    if (this.exhausted || this.error) return Promise.resolve();
    if (this.posts.length - 1 - index > AHEAD) return Promise.resolve();
    this.inflight ??= this.load().finally(() => {
      this.inflight = null;
    });
    return this.inflight;
  }

  remove(id: number) {
    const before = this.posts.length;
    this.posts = this.posts.filter((p) => p.id !== id);
    if (this.posts.length !== before) this.onChange();
  }

  patch(id: number, patch: Partial<Post>) {
    this.posts = this.posts.map((p) => (p.id === id ? { ...p, ...patch } : p));
    this.onChange();
  }

  retry() {
    this.error = null;
    this.onChange();
  }

  setRules(rules: BlacklistRule[]) {
    this.filter.rules = rules;
    const kept = this.posts.filter((p) => !blacklistedBy(rules, p, this.filter.ctx));
    this.stats.blacklisted += this.posts.length - kept.length;
    this.posts = kept;
    this.onChange();
  }

  private async load() {
    this.loading = true;
    this.onChange();
    try {
      // (asked again by Try again when this failed)
      if (typeof this.ids === "function") this.ids = await this.ids();
      const ids = this.ids;
      // A batch can come back with nothing showable (all deleted or blacklisted): keep going.
      const add: Post[] = [];
      while (add.length === 0 && this.next < ids.length) {
        const batch = ids.slice(this.next, this.next + ID_BATCH);
        const got = await this.fetch(`id:${batch.join(",")}`, 1, ID_BATCH);
        this.next += batch.length;
        const byId = new Map(got.map((p) => [p.id, p]));
        for (const id of batch) {
          const p = byId.get(id);
          if (p && acceptPost(p, this.filter)) add.push(p);
        }
      }
      this.posts = [...this.posts, ...add];
      if (this.next >= ids.length) this.exhausted = true;
    } catch (e) {
      this.error = e instanceof Error ? e.message : String(e);
    } finally {
      this.loading = false;
      this.onChange();
    }
  }
}
