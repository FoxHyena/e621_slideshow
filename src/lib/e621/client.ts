import type { AutocompleteTag, CurrentUser, Post, SavedSearchRow, TagInfo, TagSubscription, UserProfile } from "./types";

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
 * e621 hard-limits at 2 req/s. Bursts are rare (page refills, debounced autocomplete), so a 550ms gap keeps us under it while typing stays responsive.
 * Every API call goes through this single-file queue.
 */
const MIN_GAP_MS = 550;
let lastStart = 0;
let chain: Promise<unknown> = Promise.resolve();

function throttle<T>(fn: () => Promise<T>): Promise<T> {
  const run = async () => {
    const wait = lastStart + MIN_GAP_MS - Date.now();
    if (wait > 0) await new Promise((r) => setTimeout(r, wait));
    lastStart = Date.now();
    return fn();
  };
  const next = chain.then(run, run);
  chain = next.catch(() => undefined);
  return next;
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

  return throttle(async () => {
    const res = await fetch(url, {
      method: opts.method ?? "GET",
      headers,
      body: opts.body,
      signal: opts.signal,
    });
    if (!res.ok) throw new E621Error(await errorMessage(res), res.status);
    if (res.status === 204) return undefined as T;
    const text = await res.text();
    return (text ? JSON.parse(text) : undefined) as T;
  });
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
): Promise<Post[]> {
  const res = await request<unknown>("/posts.json", {
    params: { tags, page, limit, ...POSTS_FORMAT },
    creds,
    signal,
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

export function getUser(id: number, creds: Credentials | null): Promise<UserProfile> {
  return request<UserProfile>(`/users/${id}.json`, { creds });
}

/** A user's favorites, most recently favorited first (unlike `fav:name`, which sorts by post id). */
export async function getFavorites(
  userId: number,
  page: number,
  limit: number,
  creds: Credentials | null,
): Promise<Post[]> {
  const res = await request<unknown>("/favorites.json", {
    params: { user_id: userId, page, limit, ...POSTS_FORMAT },
    creds,
  });
  return postList(res);
}

/** Post counts for exact tag names. Names e621 doesn't know are simply absent. */
export async function getTags(names: string[], creds: Credentials | null): Promise<TagInfo[]> {
  if (names.length === 0) return [];
  const res = await request<TagInfo[] | Record<string, unknown>>("/tags.json", {
    params: { "search[name]": names.join(","), limit: 320 },
    creds,
  });
  return Array.isArray(res) ? res : [];
}

/** Id of the newest post, a close stand-in for the site's total post count. */
export async function newestPostId(creds: Credentials | null): Promise<number> {
  const [post] = await searchPosts("", 1, 1, creds);
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
export async function getSubscriptions(creds: Credentials, signal?: AbortSignal): Promise<TagSubscription[]> {
  const res = await request<unknown>("/tag_subscriptions.json", { creds, signal });
  return Array.isArray(res) ? (res as TagSubscription[]) : [];
}

/**
 * Your saved searches, the followed-tags anchor first. Its `last_seen_post_id` is the "new since
 * last visit" marker; the anchor doesn't exist until you first follow a tag.
 */
export async function getSavedSearches(creds: Credentials, signal?: AbortSignal): Promise<SavedSearchRow[]> {
  const res = await request<unknown>("/saved_searches.json", { creds, signal });
  if (Array.isArray(res)) return res as SavedSearchRow[];
  throw new E621Error("e621 sent saved searches in a format this app doesn't understand", 200);
}

/** The followed-tags anchor, or null when you follow nothing yet. */
export async function getAnchor(creds: Credentials, signal?: AbortSignal): Promise<SavedSearchRow | null> {
  return (await getSavedSearches(creds, signal)).find((r) => r.is_subscription) ?? null;
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
    const res = await fetch(url, {
      headers: { Authorization: "Basic " + btoa(`${creds.username}:${creds.apiKey}`) },
      redirect: "manual",
    });
    if (res.type === "opaqueredirect" || (res.status >= 200 && res.status < 400)) return;
    throw new E621Error(await errorMessage(res), res.status);
  });
}

/**
 * Whether a search finds anything: one post asked for. Following's "anything newer?" check passes
 * its own feed's query with `id:>N` in the tag box, so ratings and blacklist apply the same way.
 */
export async function anyPost(query: string, creds: Credentials | null): Promise<boolean> {
  const posts = await searchPosts(query, 1, 1, creds);
  return posts.length > 0;
}

export function postPageUrl(id: number): string {
  return `${E621_BASE}/posts/${id}`;
}
