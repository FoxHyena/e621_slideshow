import type { AutocompleteTag, CurrentUser, Post } from "./types";

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
}

async function request<T>(path: string, opts: RequestOpts): Promise<T> {
  const url = new URL(path, E621_BASE);
  for (const [k, v] of Object.entries(opts.params ?? {})) {
    if (v !== undefined && v !== "") url.searchParams.set(k, String(v));
  }
  url.searchParams.set("_client", clientParam(opts.creds));

  const headers: Record<string, string> = {};
  if (opts.creds?.username && opts.creds.apiKey) {
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

export async function searchPosts(
  tags: string,
  page: string | number,
  limit: number,
  creds: Credentials | null,
  signal?: AbortSignal,
): Promise<Post[]> {
  const res = await request<{ posts: Post[] }>("/posts.json", {
    params: { tags, page, limit },
    creds,
    signal,
  });
  return res.posts ?? [];
}

export async function autocompleteTags(
  prefix: string,
  creds: Credentials | null,
  signal?: AbortSignal,
): Promise<AutocompleteTag[]> {
  if (prefix.length < 3) return [];
  const res = await request<AutocompleteTag[] | Record<string, unknown>>(
    "/tags/autocomplete.json",
    { params: { "search[name_matches]": prefix, expiry: 7 }, creds, signal },
  );
  return Array.isArray(res) ? res : [];
}

export function getCurrentUser(creds: Credentials): Promise<CurrentUser> {
  return request<CurrentUser>("/users/me.json", { creds });
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

export function postPageUrl(id: number): string {
  return `${E621_BASE}/posts/${id}`;
}
