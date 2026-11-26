/**
 * The feed registry (ENGINEERING.md §3). A feed is one e621 search as a screen shows it: its
 * key is everything that changes which posts e621 sends. Screens share a feed by key, so Results
 * and the player over it page the same queue.
 *
 * The blacklist isn't part of the key: a change hides matching posts in place in every live feed
 * (UX §5 "Hold a tag"). Taking a rule away can't bring hidden posts back, so it starts the feeds over.
 *
 * At most 8 feeds stay alive and 3,000 posts in all. A feed nobody is showing is dropped after
 * 5 minutes, or sooner when over either limit (least recently used first).
 */
import { searchPosts, type Credentials } from "@/lib/e621/client";
import { searchFor, type Filters } from "@/lib/feed/filters";
import { parseBlacklist, type BlacklistRule } from "@/lib/query/blacklist";
import { buildQuery, DEFAULT_TAG_LIMIT, favoritesTags } from "@/lib/query/build";
import type { SearchSettings } from "@/lib/settings";
import { PostQueue, type PageFetcher, type SlideQueue } from "@/lib/slideshow/queue";
import { blacklistOf, getPrefs } from "./prefs";
import { createStore, type Store } from "./store";

export const MAX_FEEDS = 8;
export const POST_BUDGET = 3000;
export const IDLE_MS = 5 * 60_000;
const MAX_BINDINGS = 64;

export type FeedKind = "search" | "favorites";

export interface FeedSpec {
  kind: FeedKind;
  /** the tag box (favorites: extra tags on top of `fav:<you>`) */
  tags: string;
  filters: Filters;
}

export interface FeedEnv {
  ratings: SearchSettings["ratings"];
  creds: Credentials | null;
  user: { name: string; tag_query_limit?: number } | null;
}

export interface Feed {
  key: string;
  /** what it searches; null for a feed with its own queue (For You's ranking) */
  spec: FeedSpec | null;
  queue: SlideQueue;
  /** bumps on every queue change */
  version: Store<number>;
  refs: number;
  lastUsed: number;
  /** never evicted; its owner drops it when done with it (For You's rankings, costly to redo) */
  keep: boolean;
}

/** The search a feed runs, with Favorites' `fav:` and Hide-favorited's `-fav:` filled in. */
export function feedSearch(spec: FeedSpec, env: FeedEnv, blacklist = ""): SearchSettings {
  const name = env.user?.name;
  const parts = [spec.kind === "favorites" && name ? favoritesTags(name) : "", spec.tags];
  if (spec.filters.hideFaved && name && spec.kind !== "favorites") parts.push(`-fav:${name}`);
  return searchFor(parts.filter(Boolean).join(" "), spec.filters, env.ratings, blacklist);
}

const tagLimit = (env: FeedEnv) => env.user?.tag_query_limit ?? DEFAULT_TAG_LIMIT;

/** The e621 query a feed runs (blacklist lines stay out: they're matched on our side). */
export function feedQuery(spec: FeedSpec, env: FeedEnv): string {
  return buildQuery(feedSearch(spec, env), tagLimit(env)).query;
}

export function feedKey(spec: FeedSpec, env: FeedEnv): string {
  const b = buildQuery(feedSearch(spec, env), tagLimit(env));
  return JSON.stringify([spec.kind, b.query, spec.filters.media, env.user?.name ?? null, env.creds?.username ?? null]);
}

type Fetcher = (creds: Credentials | null) => PageFetcher;

export interface Registry {
  /** The live feed for this spec, made on first ask. Doesn't fetch. */
  get(spec: FeedSpec, env: FeedEnv): Feed;
  /**
   * A feed with its own queue, by a key the caller builds (it must name everything that changes the
   * posts). `make` gets the change callback and the blacklist rules in force.
   */
  custom(key: string, make: (onChange: () => void, rules: BlacklistRule[]) => SlideQueue, opts?: { keep?: boolean }): Feed;
  /** A screen is showing the feed; the returned function lets it go. */
  retain(feed: Feed): () => void;
  /** Drop a feed so the next `get` starts it over. */
  drop(key: string): void;
  peek(key: string): Feed | undefined;
  size(): number;
  /** Apply a new blacklist to every live feed. */
  setBlacklist(text: string): void;
  /** bumps when feeds were dropped, so screens ask again */
  generation: Store<number>;
  /** Which feed a history entry shows, so the player over it can page the same queue. */
  bind(entryKey: string, feed: Feed): void;
  bound(entryKey: string): Feed | undefined;
}

export function createRegistry(
  fetcher: Fetcher = (creds) => (tags, page, limit, opts) => searchPosts(tags, page, limit, creds, opts?.signal, opts?.lane),
  now: () => number = Date.now,
  blacklist = "",
): Registry {
  const feeds = new Map<string, Feed>();
  /**
   * The feed each history entry shows. Holds the feed itself, not its key: a hidden screen keeps
   * paging a feed the registry evicted, and its player must find that same one.
   */
  const bindings = new Map<string, Feed>();
  const generation = createStore(0);
  let rules = parseBlacklist(blacklist);

  // Dropping only forgets the feed: a hidden screen (and its player) may still hold and page it.
  // Its waiting requests go, though; paging it again asks afresh.
  const drop = (f: Feed) => {
    if (feeds.get(f.key) !== f) return;
    feeds.delete(f.key);
    f.queue.cancel?.();
  };
  const add = (key: string, spec: FeedSpec | null, make: (onChange: () => void) => SlideQueue, keep = false): Feed => {
    let f = feeds.get(key);
    if (!f) {
      const version = createStore(0);
      f = { key, spec, queue: make(() => version.set((v) => v + 1)), version, refs: 0, lastUsed: now(), keep };
      feeds.set(key, f);
      evict(f);
    }
    f.lastUsed = now();
    return f;
  };
  const evict = (keep: Feed) => {
    const t = now();
    const idle = [...feeds.values()].filter((f) => f !== keep && f.refs === 0 && !f.keep).sort((a, b) => a.lastUsed - b.lastUsed);
    for (const f of idle) if (t - f.lastUsed > IDLE_MS) drop(f);
    const total = () => [...feeds.values()].reduce((n, f) => n + f.queue.posts.length, 0);
    for (const f of idle) {
      if (!feeds.has(f.key)) continue;
      if (feeds.size <= MAX_FEEDS && total() <= POST_BUDGET) break;
      drop(f);
    }
  };

  return {
    generation,
    get(spec, env) {
      const key = feedKey(spec, env);
      return add(key, spec, (onChange) => {
        const built = { ...buildQuery(feedSearch(spec, env), tagLimit(env)), rules };
        return new PostQueue(built, spec.filters.media, fetcher(env.creds), { username: env.user?.name }, onChange);
      });
    },
    custom(key, make, opts) {
      return add(key, null, (onChange) => make(onChange, rules), opts?.keep);
    },
    retain(f) {
      f.refs++;
      f.lastUsed = now();
      let held = true;
      return () => {
        if (!held) return;
        held = false;
        f.refs--;
        f.lastUsed = now();
      };
    },
    drop(key) {
      // An evicted feed (a hidden tab's) is gone already: screens still holding it move on all the same.
      const f = feeds.get(key);
      if (f) drop(f);
      generation.set((g) => g + 1);
    },
    peek: (key) => feeds.get(key),
    size: () => feeds.size,
    setBlacklist(text) {
      const next = parseBlacklist(text);
      const lines = (r: typeof rules) => new Set(r.map((x) => x.line));
      const had = lines(rules);
      const has = lines(next);
      rules = next;
      if ([...had].some((l) => !has.has(l))) {
        feeds.clear();
        generation.set((g) => g + 1);
        return;
      }
      if (had.size === has.size) return;
      for (const f of feeds.values()) f.queue.setRules(next);
    },
    bind(entryKey, f) {
      if (bindings.get(entryKey) === f) return;
      bindings.delete(entryKey);
      bindings.set(entryKey, f);
      // Entries long gone from history: keep the newest few dozen.
      for (const k of bindings.keys()) {
        if (bindings.size <= MAX_BINDINGS) break;
        bindings.delete(k);
      }
    },
    bound: (entryKey) => bindings.get(entryKey),
  };
}

let instance: Registry | null = null;
export function getFeeds(): Registry {
  if (!instance) {
    const prefs = getPrefs();
    const reg = createRegistry(undefined, undefined, blacklistOf(prefs.store.get()));
    let last = blacklistOf(prefs.store.get());
    prefs.store.subscribe(() => {
      const b = blacklistOf(prefs.store.get());
      if (b === last) return;
      last = b;
      reg.setBlacklist(b);
    });
    instance = reg;
  }
  return instance;
}
