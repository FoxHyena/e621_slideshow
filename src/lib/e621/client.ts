import type { AutocompleteTag, CurrentUser, Post, SavedSearchRow, SubscribeResult, TagInfo, TagSubscription, UserProfile } from "./types";

export const E621_BASE = "https://e621.net";

export interface Credentials {
  username: string;
  apiKey: string;
}

export class E621Error extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
    this.name = "E621Error";
  }
}

/**
 * The request lane (ENGINEERING §3). e621 hard-limits at 2 req/s, so every API call waits its turn
 * here: one at a time, 550 ms apart. Waiting tasks go by priority, `user` (what's on screen, a tap)
 * before `page` (the next page ahead) before `bg` (marker checks, the favorites sync), and gain a
 * level every 3 s so nothing waits forever. A 429 or 503 pauses the whole lane for 5 s. A task whose
 * signal aborts while it waits leaves the line and rejects with an AbortError.
 */
export type Lane = "user" | "page" | "bg";
const RANK: Record<Lane, number> = { user: 0, page: 1, bg: 2 };
const MIN_GAP_MS = 550;
export const AGE_MS = 3000;
export const BACKOFF_MS = 5000;

interface Task {
  rank: number;
  at: number;
  seq: number;
  start: () => Promise<void>;
}
const waiting: Task[] = [];
let lastStart = 0;
let pausedUntil = 0;
let busy = false;
let seq = 0;
/** wakes the lane early from a wait (see skipBackOff) */
let wake: (() => void) | null = null;

const effectiveRank = (t: Task, now: number) => t.rank - Math.floor((now - t.at) / AGE_MS);
function next(now: number): Task {
  let best = waiting[0];
  for (const t of waiting) {
    const d = effectiveRank(t, now) - effectiveRank(best, now);
    if (d < 0 || (d === 0 && t.seq < best.seq)) best = t;
  }
  return best;
}

async function pump() {
  if (busy) return;
  busy = true;
  try {
    while (waiting.length) {
      const wait = Math.max(lastStart + MIN_GAP_MS, pausedUntil) - Date.now();
      // Wait first, then choose: a more urgent task may arrive meanwhile.
      if (wait > 0) {
        await new Promise<void>((r) => {
          wake = r;
          setTimeout(r, wait);
        });
        wake = null;
        continue;
      }
      const t = next(Date.now());
      waiting.splice(waiting.indexOf(t), 1);
      lastStart = Date.now();
      await t.start();
    }
  } finally {
    busy = false;
  }
}

/** The whole lane waits after e621 says it's busy. */
function backOff() {
  pausedUntil = Math.max(pausedUntil, Date.now() + BACKOFF_MS);
}

/**
 * Someone tapped Try now: lift e621's back-off once, so the next request leaves now rather than
 * when the pause ends. The minimum gap between requests still holds.
 */
export function skipBackOff() {
  pausedUntil = 0;
  wake?.();
}

const abortError = () => new DOMException("The request was cancelled", "AbortError");

/** No request holds the lane longer than this: a fetch that never answers would stop every screen. */
export const REQUEST_TIMEOUT_MS = 20_000;
function timed(signal?: AbortSignal): AbortSignal | undefined {
  if (typeof AbortSignal === "undefined" || !("timeout" in AbortSignal)) return signal;
  const t = AbortSignal.timeout(REQUEST_TIMEOUT_MS);
  if (!signal) return t;
  return "any" in AbortSignal ? AbortSignal.any([signal, t]) : signal;
}
/** A timed-out fetch reads as e621 being slow, not as a cancel. */
async function fetchTimed(url: URL, init: RequestInit): Promise<Response> {
  try {
    return await fetch(url, { ...init, signal: timed(init.signal ?? undefined) });
  } catch (e) {
    if (e instanceof DOMException && e.name === "TimeoutError") throw new E621Error("e621 took too long to answer", 0);
    throw e;
  }
}
export const isAbort = (e: unknown) => e instanceof DOMException && e.name === "AbortError";

function throttle<T>(fn: () => Promise<T>, lane: Lane = "user", signal?: AbortSignal): Promise<T> {
  if (signal?.aborted) return Promise.reject(abortError());
  return new Promise<T>((resolve, reject) => {
    const task: Task = {
      rank: RANK[lane],
      at: Date.now(),
      seq: seq++,
      start: async () => {
        signal?.removeEventListener("abort", drop);
        try {
          resolve(await fn());
        } catch (e) {
          reject(e);
        }
      },
    };
    function drop() {
      const i = waiting.indexOf(task);
      if (i < 0) return;
      waiting.splice(i, 1);
      reject(abortError());
    }
    signal?.addEventListener("abort", drop, { once: true });
    waiting.push(task);
    void pump();
  });
}

/** Tests: an empty lane with no pause. */
export function resetLane() {
  waiting.length = 0;
  lastStart = 0;
  pausedUntil = 0;
}

function clientParam(creds: Credentials | null): string {
  const who = creds?.username ? `by ${creds.username} on e621` : "anonymous";
  return `e621-slideshow/1.0 (${who})`;
}

async function errorMessage(res: Response): Promise<string> {
  try {
    const body = await res.json();
    const msg = body?.message ?? body?.reason ?? body?.error;
    if (typeof msg === "string" && msg) return msg;
  } catch {
    // fall through
  }
  if (res.status === 401) return "Invalid username or API key";
  if (res.status === 503 || res.status === 429) return "Rate limited by e621, slow down";
  return `e621 returned HTTP ${res.status}`;
}

interface RequestOpts {
  method?: "GET" | "POST" | "DELETE";
  params?: Record<string, string | number | undefined>;
  body?: URLSearchParams;
  creds: Credentials | null;
  signal?: AbortSignal;
  /** Skip the Authorization header. Some public endpoints reject the CORS preflight it triggers. */
  anonymous?: boolean;
  lane?: Lane;
}

async function request<T>(path: string, opts: RequestOpts): Promise<T> {
  const url = new URL(path, E621_BASE);
  for (const [k, v] of Object.entries(opts.params ?? {})) {
    if (v !== undefined && v !== "") url.searchParams.set(k, String(v));
  }
  url.searchParams.set("_client", clientParam(opts.creds));

  const headers: Record<string, string> = {};
  if (!opts.anonymous && opts.creds?.username && opts.creds.apiKey) {
    headers.Authorization = "Basic " + btoa(`${opts.creds.username}:${opts.creds.apiKey}`);
  }

  return throttle(
    async () => {
      const res = await fetchTimed(url, {
        method: opts.method ?? "GET",
        headers,
        body: opts.body,
        signal: opts.signal,
      });
      if (res.status === 429 || res.status === 503) backOff();
      if (!res.ok) throw new E621Error(await errorMessage(res), res.status);
      if (res.status === 204) return undefined as T;
      const text = await res.text();
      return (text ? JSON.parse(text) : undefined) as T;
    },
    opts.lane,
    opts.signal,
  );
}

/**
 * Posts and favorites come back as a bare array (e621's format since 2026-11-18).
 * `extended` keeps tags grouped by category, which tag colors, the blacklist's
 * category metatags, and recommendation weights all need.
 */
const POSTS_FORMAT = { mode: "extended" } as const;

/** A post list, or an error: an unexpected shape must not read as "no results". */
function postList(res: unknown): Post[] {
  if (Array.isArray(res)) return res as Post[];
  throw new E621Error("e621 sent posts in a format this app doesn't understand", 200);
}

export async function searchPosts(
  tags: string,
  page: string | number,
  limit: number,
  creds: Credentials | null,
  signal?: AbortSignal,
  lane: Lane = "user",
): Promise<Post[]> {
  const res = await request<unknown>("/posts.json", {
    params: { tags, page, limit, ...POSTS_FORMAT },
    creds,
    signal,
    lane,
  });
  return postList(res);
}

export async function autocompleteTags(
  prefix: string,
  creds: Credentials | null,
  signal?: AbortSignal,
): Promise<AutocompleteTag[]> {
  if (prefix.length < 3) return [];
  // e621 answers the CORS preflight that an Authorization header triggers with an error on
  // this endpoint, so signed-in users got no suggestions at all. The tags are public anyway.
  const res = await request<AutocompleteTag[] | Record<string, unknown>>(
    "/tags/autocomplete.json",
    { params: { "search[name_matches]": prefix, expiry: 7 }, creds, signal, anonymous: true },
  );
  return Array.isArray(res) ? res : [];
}

export function getCurrentUser(creds: Credentials): Promise<CurrentUser> {
  return request<CurrentUser>("/users/me.json", { creds });
}

export function getUser(id: number, creds: Credentials | null, lane: Lane = "user"): Promise<UserProfile> {
  return request<UserProfile>(`/users/${id}.json`, { creds, lane });
}

/** A user's favorites, most recently favorited first (unlike `fav:name`, which sorts by post id). */
export async function getFavorites(
  userId: number,
  page: number,
  limit: number,
  creds: Credentials | null,
  lane: Lane = "user",
): Promise<Post[]> {
  const res = await request<unknown>("/favorites.json", {
    params: { user_id: userId, page, limit, ...POSTS_FORMAT },
    creds,
    lane,
  });
  return postList(res);
}

/**
 * Post counts for exact tag names. Names e621 doesn't know are simply absent. `withEmpty`: e621 leaves
 * out tags with no posts unless asked (`search[hide_empty]`), which the artist page needs to tell "no
 * posts yet" from "no such tag".
 */
export async function getTags(names: string[], creds: Credentials | null, lane: Lane = "user", withEmpty = false): Promise<TagInfo[]> {
  if (names.length === 0) return [];
  const res = await request<TagInfo[] | Record<string, unknown>>("/tags.json", {
    params: { "search[name]": names.join(","), limit: 320, ...(withEmpty ? { "search[hide_empty]": "false" } : {}) },
    creds,
    lane,
  });
  return Array.isArray(res) ? res : [];
}

/** e621's artist tags with the most posts, most first (Popular artists). */
export async function popularArtists(limit: number, creds: Credentials | null, lane: Lane = "page"): Promise<TagInfo[]> {
  const res = await request<TagInfo[] | Record<string, unknown>>("/tags.json", {
    params: { "search[category]": 1, "search[order]": "count", limit },
    creds,
    lane,
  });
  return Array.isArray(res) ? res : [];
}

/** Id of the newest post, a close stand-in for the site's total post count. */
export async function newestPostId(creds: Credentials | null, lane: Lane = "user"): Promise<number> {
  const [post] = await searchPosts("", 1, 1, creds, undefined, lane);
  return post?.id ?? 0;
}

export async function addFavorite(postId: number, creds: Credentials): Promise<void> {
  await request("/favorites.json", {
    method: "POST",
    body: new URLSearchParams({ post_id: String(postId) }),
    creds,
  });
}

export async function removeFavorite(postId: number, creds: Credentials): Promise<void> {
  await request(`/favorites/${postId}.json`, { method: "DELETE", creds });
}

// ---- Following (ENGINEERING.md §3, §4; e621ng research notes) --------------------------------

/** The tags you follow on e621: the whole list (e621 allows 500), sorted by name. */
export async function getSubscriptions(creds: Credentials, signal?: AbortSignal, lane: Lane = "user"): Promise<TagSubscription[]> {
  const res = await request<unknown>("/tag_subscriptions.json", { creds, signal, lane });
  if (!Array.isArray(res)) throw new E621Error("e621 sent your follows in a format this app doesn't understand", 200);
  return res as TagSubscription[];
}

/**
 * Follow tags in one write. e621 follows aliases (an added row may carry the aliased name) and
 * skips unknown tags, ones you already follow, and anything past 500, saying why for each.
 */
export async function subscribe(names: string[], creds: Credentials): Promise<SubscribeResult> {
  const res = await request<Partial<SubscribeResult> | undefined>("/tag_subscriptions.json", {
    method: "POST",
    body: new URLSearchParams({ tag_names: names.join(" ") }),
    creds,
  });
  return { added: Array.isArray(res?.added) ? res.added : [], skipped: Array.isArray(res?.skipped) ? res.skipped : [] };
}

/** Unfollow one tag by its subscription id. */
export async function unsubscribe(subId: number, creds: Credentials): Promise<void> {
  await request(`/tag_subscriptions/${subId}.json`, { method: "DELETE", creds });
}

/**
 * Your saved searches, the followed-tags anchor first. Its `last_seen_post_id` is the "new since
 * last visit" marker; the anchor doesn't exist until you first follow a tag.
 */
export async function getSavedSearches(creds: Credentials, signal?: AbortSignal, lane: Lane = "user"): Promise<SavedSearchRow[]> {
  const res = await request<unknown>("/saved_searches.json", { creds, signal, lane });
  if (Array.isArray(res)) return res as SavedSearchRow[];
  throw new E621Error("e621 sent saved searches in a format this app doesn't understand", 200);
}

/** The followed-tags anchor, or null when you follow nothing yet. */
export async function getAnchor(creds: Credentials, signal?: AbortSignal, lane: Lane = "user"): Promise<SavedSearchRow | null> {
  return (await getSavedSearches(creds, signal, lane)).find((r) => r.is_subscription) ?? null;
}

/**
 * Move e621's "seen" marker for followed tags to its newest post. e621 answers with a redirect to
 * the posts page (its side effect is already done), so the redirect isn't followed: an
 * `opaqueredirect` (or any 2xx/3xx) counts as success. It can't be moved back.
 */
export async function visitAnchor(anchorId: number, creds: Credentials): Promise<void> {
  const url = new URL(`/saved_searches/${anchorId}/visit.json`, E621_BASE);
  url.searchParams.set("_client", clientParam(creds));
  await throttle(async () => {
    const res = await fetchTimed(url, {
      headers: { Authorization: "Basic " + btoa(`${creds.username}:${creds.apiKey}`) },
      redirect: "manual",
    });
    if (res.type === "opaqueredirect" || (res.status >= 200 && res.status < 400)) return;
    if (res.status === 429 || res.status === 503) backOff();
    throw new E621Error(await errorMessage(res), res.status);
  }, "bg");
}

/**
 * Whether a search finds anything: one post asked for. Following's "anything newer?" check passes
 * its own feed's query with `id:>N` in the tag box, so ratings and blacklist apply the same way.
 */
export async function anyPost(query: string, creds: Credentials | null): Promise<boolean> {
  const posts = await searchPosts(query, 1, 1, creds, undefined, "bg");
  return posts.length > 0;
}

export function postPageUrl(id: number): string {
  return `${E621_BASE}/posts/${id}`;
}

/** An artist's posts on e621. */
export function artistPageUrl(name: string): string {
  return `${E621_BASE}/posts?tags=${encodeURIComponent(name)}`;
}
