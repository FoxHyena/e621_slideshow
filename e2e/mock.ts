import type { Page, Route } from "@playwright/test";
import { readFileSync } from "node:fs";
import path from "node:path";

const IMG = readFileSync(path.join(__dirname, "fixtures/img.png"));
const CLIP = readFileSync(path.join(__dirname, "fixtures/clip.webm"));

const CORS = {
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS, HEAD",
  "access-control-allow-headers": "authorization, content-type",
};

export interface MockPostSpec {
  id: number;
  tags?: string[];
  ext?: string;
  rating?: "s" | "q" | "e";
  is_favorited?: boolean;
  hidden?: boolean;
  duration?: number;
  /** the artist tag (default `mock_artist`) */
  artist?: string;
  /** more than one artist tag (overrides `artist`) */
  artists?: string[];
}

export function mockPost(spec: MockPostSpec) {
  const ext = spec.ext ?? "png";
  const url = spec.hidden ? null : `https://static1.e621.net/data/mock/${spec.id}.${ext}`;
  const sample = spec.hidden ? null : `https://static1.e621.net/data/sample/mock/${spec.id}.jpg`;
  // e621's posts format since 2026-11-18, `mode=extended` (tags grouped by category)
  return {
    id: spec.id,
    created_at: "2024-05-01T12:00:00.000-04:00",
    files: {
      meta: { md5: `md5${spec.id}`, ext, size: 1000, duration: spec.duration ?? null, has_sample: true },
      original: { width: 64, height: 48, url },
      preview: { width: 64, height: 48, jpg: url, webp: null },
      sample: { width: 64, height: 48, jpg: sample, webp: null },
    },
    stats: {
      score: { up: 5, down: 1, total: 4 },
      fav_count: 3,
      is_favorited: spec.is_favorited ?? false,
    },
    tags: { general: spec.tags ?? ["solo"], artist: spec.artists ?? [spec.artist ?? "mock_artist"], species: ["wolf"] },
    rating: spec.rating ?? "s",
    uploader_id: 1,
    uploader_name: "uploader",
    pools: [],
    sources: [],
    flags: { deleted: false, pending: false, flagged: false },
  };
}

export interface E621Mock {
  /** every /posts.json request: tags + page */
  searches: { tags: string; page: string | null; auth: string | null; limit: number }[];
  favorites: { method: string; postId: number }[];
  autocompleteQueries: string[];
  /** media URLs the browser actually requested */
  media: string[];
  posts: ReturnType<typeof mockPost>[];
  setPosts(specs: MockPostSpec[]): void;
  /** the signed-in user's favorites, newest-favorited first (GET /favorites.json) */
  favPosts: ReturnType<typeof mockPost>[];
  setFavorites(specs: MockPostSpec[]): void;
  /** global post_count per tag for /tags.json; unknown tags get 100,000 */
  tagCounts: Record<string, number>;
  /** names asked for in each /tags.json request */
  tagLookups: string[][];
  /** e621's biggest artist tags (/tags.json by category and count), most posts first */
  popularArtists: { name: string; post_count: number }[];
  /** page numbers of each GET /favorites.json request */
  favoritePages: number[];
  /** when set, plain tags in /posts.json queries must match (off by default: older tests search freely) */
  filterPositive: boolean;
  /** artificial latency for a /posts.json request, in ms */
  searchDelay: (tags: string, page: number) => number;
  /** ms each GET /favorites.json waits before answering */
  favoritesDelay: number;
  /** ms /users/me.json (the sign-in check) waits before answering */
  meDelay: number;
  /** /posts.json searches that fail with e621's 422 */
  searchFails: (tags: string) => boolean;
  /**
   * The tags the signed-in user follows (`search:subscriptions`), or null before they ever followed
   * one (no anchor saved search, like e621).
   */
  subscriptions: string[] | null;
  /** the anchor's `last_seen_post_id` */
  lastSeen: number;
  /** GET /saved_searches/:id/visit.json calls */
  visits: number;
  /** whether a visit moves the marker (false: e621 answers but nothing moves) */
  visitMoves: boolean;
  /** every follow write: POST (names asked for) or DELETE (subscription id) */
  followWrites: { method: string; names?: string[]; id?: number }[];
  /** follow writes fail with a 500 (the "failing mock") */
  followFails: boolean;
  /** ms each follow write waits before answering */
  followDelay: number;
  /** e621's follow limit (500) */
  followLimit: number;
  /** tags e621 doesn't know: a follow skips them with "does not exist" */
  unknownTags: string[];
  /** GET /tag_subscriptions.json calls */
  subscriptionReads: number;
}

/** Default dataset: 150 safe PNG posts, ids 1150 down to 1001. */
export function defaultSpecs(n = 150): MockPostSpec[] {
  return Array.from({ length: n }, (_, i) => ({ id: 1000 + n - i }));
}

export async function mockE621(page: Page, specs: MockPostSpec[] = defaultSpecs()): Promise<E621Mock> {
  const state: E621Mock = {
    searches: [],
    favorites: [],
    autocompleteQueries: [],
    media: [],
    posts: specs.map(mockPost),
    setPosts(s) {
      state.posts = s.map(mockPost);
    },
    favPosts: [],
    setFavorites(s) {
      state.favPosts = s.map(mockPost);
    },
    tagCounts: {},
    tagLookups: [],
    popularArtists: [],
    favoritePages: [],
    filterPositive: false,
    searchDelay: () => 0,
    favoritesDelay: 0,
    meDelay: 0,
    searchFails: () => false,
    subscriptions: null,
    lastSeen: 0,
    visits: 0,
    visitMoves: true,
    followWrites: [],
    followFails: false,
    followDelay: 0,
    followLimit: 500,
    unknownTags: [],
    subscriptionReads: 0,
  };
  /** stable subscription ids per tag, like e621's rows */
  const subIds = new Map<string, number>();
  const subId = (name: string) => {
    if (!subIds.has(name)) subIds.set(name, 100 + subIds.size);
    return subIds.get(name)!;
  };
  const subRow = (name: string) => ({ id: subId(name), tag_id: 1000 + subId(name), tag_name: name, category: 1, created_at: "2024-05-01T12:00:00.000-04:00" });
  const ANCHOR_ID = 7;
  const tagsOf = (p: ReturnType<typeof mockPost>) => Object.values(p.tags).flat();

  const json = (route: Route, body: unknown, status = 200) =>
    route.fulfill({ status, headers: { ...CORS, "content-type": "application/json" }, body: JSON.stringify(body) });

  await page.route("https://e621.net/**", async (route) => {
    const req = route.request();
    if (req.method() === "OPTIONS") return route.fulfill({ status: 204, headers: CORS });
    const url = new URL(req.url());
    const auth = req.headers()["authorization"] ?? null;

    // Like e621: a bare array of posts, with tags grouped by category only in `mode=extended`.
    const postList = (list: ReturnType<typeof mockPost>[]) =>
      json(
        route,
        url.searchParams.get("mode") === "extended" ? list : list.map((p) => ({ ...p, tags: Object.values(p.tags).flat() })),
      );

    if (url.pathname === "/posts.json") {
      const tags = url.searchParams.get("tags") ?? "";
      const pageParam = url.searchParams.get("page");
      const limit = Number(url.searchParams.get("limit") ?? 75);
      state.searches.push({ tags, page: pageParam, auth, limit });
      if (tags.includes("nothing_matches")) return postList([]);
      if (tags.includes("server_error") || state.searchFails(tags)) return json(route, { success: false, message: "Mock search failure" }, 422);
      let list = state.posts;
      // `search:subscriptions`: posts with any followed tag (nothing without the anchor, like e621)
      if (tags.split(" ").includes("search:subscriptions")) {
        const subs = auth ? state.subscriptions : null;
        list = subs ? list.filter((p) => tagsOf(p).some((t) => subs.includes(t))) : [];
      }
      const above = tags.match(/(?:^| )id:>(\d+)/);
      if (above) list = list.filter((p) => p.id > Number(above[1]));
      // `id:1,2,3`: those posts (newest first, like e621)
      const ids = tags.match(/(?:^| )id:([\d,]+)/);
      if (ids) {
        const want = new Set(ids[1].split(",").map(Number));
        list = list.filter((p) => want.has(p.id));
      }
      // honour simple negations so blacklist-in-query behaves like e621
      const negs = tags.split(" ").filter((t) => /^-[a-z_]+$/.test(t)).map((t) => t.slice(1));
      list = list.filter((p) => !negs.some((n) => Object.values(p.tags).flat().includes(n)));
      // `~a ~b`: keep posts with any of them, like e621's OR
      const ors = tags.split(" ").filter((t) => t.startsWith("~")).map((t) => t.slice(1));
      if (ors.length) list = list.filter((p) => ors.some((o) => Object.values(p.tags).flat().includes(o)));
      if (state.filterPositive) {
        // plain tags outside `-( … )` groups (those are blacklist rules)
        const required = tags.replace(/-?\([^)]*\)/g, "").split(" ").filter((t) => /^[a-z_]+$/.test(t));
        list = list.filter((p) => required.every((r) => Object.values(p.tags).flat().includes(r)));
      }
      const delay = state.searchDelay(tags, Number(pageParam ?? 1));
      if (delay) await new Promise((r) => setTimeout(r, delay));
      if (pageParam?.startsWith("b")) {
        const before = Number(pageParam.slice(1));
        list = list.filter((p) => p.id < before);
        return postList(list.slice(0, limit));
      }
      const n = Number(pageParam ?? 1);
      return postList(list.slice((n - 1) * limit, n * limit));
    }

    if (url.pathname === "/tags/autocomplete.json") {
      // Like e621: a request carrying an Authorization header fails CORS here.
      if (auth) return route.abort("accessdenied");
      const q = url.searchParams.get("search[name_matches]") ?? "";
      state.autocompleteQueries.push(q);
      return json(route, [
        { id: 1, name: `${q}_species`, post_count: 123456, category: 5, antecedent_name: null },
        { id: 2, name: `${q}_artist`, post_count: 789, category: 1, antecedent_name: null },
        { id: 3, name: "canine", post_count: 2_000_000, category: 5, antecedent_name: `${q}boy` },
      ]);
    }

    if (url.pathname === "/users/me.json") {
      if (state.meDelay) await new Promise((r) => setTimeout(r, state.meDelay));
      if (!auth) return json(route, { id: null, name: "Anonymous", blacklisted_tags: "gore" });
      const [user, key] = Buffer.from(auth.replace("Basic ", ""), "base64").toString().split(":");
      if (key !== "goodkey") return json(route, { success: false, message: "Invalid API key" }, 401);
      return json(route, { id: 42, name: user, blacklisted_tags: "account_rule\nsecond_rule other", tag_query_limit: 40 });
    }

    if (url.pathname === "/tag_subscriptions.json" && req.method() === "GET") {
      if (!auth) return json(route, { success: false, reason: "Access denied" }, 403);
      state.subscriptionReads++;
      return json(route, [...(state.subscriptions ?? [])].sort().map(subRow));
    }

    // Like e621ng's TagSubscription.subscribe!: skips unknown tags, ones already followed and
    // anything past the limit, each with a reason; the first follow makes the anchor.
    if (url.pathname === "/tag_subscriptions.json" && req.method() === "POST") {
      if (!auth) return json(route, { success: false, reason: "Access denied" }, 403);
      const names = (new URLSearchParams(req.postData() ?? "").get("tag_names") ?? "").split(/\s+/).filter(Boolean);
      state.followWrites.push({ method: "POST", names });
      if (state.followDelay) await new Promise((r) => setTimeout(r, state.followDelay));
      if (state.followFails) return json(route, { success: false, reason: "Mock follow failure" }, 500);
      const subs = state.subscriptions ?? [];
      const added: string[] = [];
      const skipped: { name: string; reason: string }[] = [];
      for (const name of names) {
        if (state.unknownTags.includes(name)) skipped.push({ name, reason: "does not exist" });
        else if (subs.includes(name) || added.includes(name)) skipped.push({ name, reason: "already subscribed" });
        else if (subs.length + added.length >= state.followLimit) skipped.push({ name, reason: `over the limit of ${state.followLimit}` });
        else added.push(name);
      }
      if (added.length) state.subscriptions = [...subs, ...added];
      return json(route, { added: added.map(subRow), skipped });
    }

    const unsub = url.pathname.match(/^\/tag_subscriptions\/(\d+)\.json$/);
    if (unsub && req.method() === "DELETE") {
      if (!auth) return json(route, { success: false, reason: "Access denied" }, 403);
      const id = Number(unsub[1]);
      state.followWrites.push({ method: "DELETE", id });
      if (state.followDelay) await new Promise((r) => setTimeout(r, state.followDelay));
      if (state.followFails) return json(route, { success: false, reason: "Mock follow failure" }, 500);
      const name = (state.subscriptions ?? []).find((n) => subId(n) === id);
      if (!name) return json(route, { success: false, reason: "not found" }, 404);
      state.subscriptions = state.subscriptions!.filter((n) => n !== name);
      return route.fulfill({ status: 204, headers: CORS });
    }

    if (url.pathname === "/saved_searches.json") {
      if (!auth) return json(route, { success: false, reason: "Access denied" }, 403);
      const subs = state.subscriptions;
      return json(
        route,
        subs === null
          ? []
          : [
              {
                id: ANCHOR_ID,
                name: "subscriptions",
                query: "",
                is_tracked: true,
                is_subscription: true,
                last_seen_post_id: state.lastSeen,
                tag_count: subs.length,
                new_count: Math.min(100, state.posts.filter((p) => p.id > state.lastSeen && tagsOf(p).some((t) => subs.includes(t))).length),
                created_at: "2024-05-01T12:00:00.000-04:00",
                updated_at: "2024-05-01T12:00:00.000-04:00",
              },
            ],
      );
    }

    if (url.pathname === `/saved_searches/${ANCHOR_ID}/visit.json`) {
      if (!auth) return json(route, { success: false, reason: "Access denied" }, 403);
      state.visits++;
      if (state.visitMoves) state.lastSeen = Math.max(0, ...state.posts.map((p) => p.id));
      // Like e621: a redirect to the posts page, whatever the format.
      return route.fulfill({ status: 302, headers: { ...CORS, location: "https://e621.net/posts?tags=search%3Asubscriptions" } });
    }

    if (url.pathname === "/users/42.json") {
      return json(route, { id: 42, name: "tester", favorite_count: state.favPosts.length });
    }

    if (url.pathname === "/favorites.json" && req.method() === "GET") {
      const n = Number(url.searchParams.get("page") ?? 1);
      const limit = Number(url.searchParams.get("limit") ?? 75);
      state.favoritePages.push(n);
      if (state.favoritesDelay) await new Promise((r) => setTimeout(r, state.favoritesDelay));
      return postList(state.favPosts.slice((n - 1) * limit, n * limit));
    }

    if (url.pathname === "/tags.json" && url.searchParams.get("search[order]") === "count") {
      const limit = Number(url.searchParams.get("limit") ?? 75);
      return json(route, state.popularArtists.slice(0, limit).map((t, i) => ({ id: 9000 + i, ...t, category: 1 })));
    }

    if (url.pathname === "/tags.json") {
      const names = (url.searchParams.get("search[name]") ?? "").split(",").filter(Boolean);
      state.tagLookups.push(names);
      return json(
        route,
        names.map((name, i) => ({ id: i + 1, name, post_count: state.tagCounts[name] ?? 100_000, category: 0 })),
      );
    }

    if (url.pathname === "/favorites.json" && req.method() === "POST") {
      const postId = Number(new URLSearchParams(req.postData() ?? "").get("post_id"));
      state.favorites.push({ method: "POST", postId });
      if (postId === 999) return json(route, { success: false, message: "You have already favorited this post" }, 422);
      return json(route, { post: state.posts.find((p) => p.id === postId) });
    }
    const fav = url.pathname.match(/^\/favorites\/(\d+)\.json$/);
    if (fav && req.method() === "DELETE") {
      state.favorites.push({ method: "DELETE", postId: Number(fav[1]) });
      return route.fulfill({ status: 204, headers: CORS });
    }

    return json(route, { success: false, reason: "not mocked" }, 404);
  });

  await page.route("https://static1.e621.net/**", async (route) => {
    const url = route.request().url();
    state.media.push(url);
    if (url.endsWith(".webm")) return route.fulfill({ body: CLIP, contentType: "video/webm" });
    return route.fulfill({ body: IMG, contentType: url.endsWith(".jpg") ? "image/jpeg" : "image/png" });
  });

  return state;
}
