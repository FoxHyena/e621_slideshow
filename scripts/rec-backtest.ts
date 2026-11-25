// Live backtest of Recommended against real favorites (read-only).
//
// For each account: hide its favorites uploaded in the last DAYS days, build the taste
// profile from the rest, run the app's candidate search for that window, and check how many
// hidden favorites the search finds (the ceiling) and where they land in each ranking.
// Compares search plans (which tags get OR'd) and rankings side by side.
//
// Usage: fill in .env.backtest (gitignored), then
//   node_modules/.bin/jiti scripts/rec-backtest.ts [days=30] [breadth=15]
// Env (wins over the file):
//   E621_USER, E621_API_KEY   one account; the key is optional when its favorites are public
//   BACKTEST_USERS            comma-separated public accounts instead (run without a key)
//   BACKTEST_BLACKLIST        extra blacklist lines for the run (newline-separated)
//   BACKTEST_PLANS            comma-separated subset of the plans below (signature always runs)
//   BACKTEST_CACHE            folder for cached favorites and tag counts (default: the OS temp folder)
//
// Plans, so search strategies are compared at the same request cost:
//   signature      today's plan: the highest-weight tags
//   popular-same   no tags, just the window by score, for as many pages as signature used
//   cover-same     covering plan (cover.ts) with signature's page count as its budget
//   popular-max    no tags, the full page budget
//   cover-max      covering plan with the full page budget (only when named in BACKTEST_PLANS)
//   mix-N          signature's search plus the window's N most popular pages, ranked together
//   popular-same+N no tags, for as many pages as mix-N costs
//
// Caveat: people can only favorite what they saw, and popular posts are seen more, so the
// rankings lean toward rewarding popularity.
import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  getCurrentUser,
  getFavorites,
  getTags,
  newestPostId,
  searchPosts,
  E621_BASE,
  type Credentials,
} from "../src/lib/e621/client";
import { allTags, type Post } from "../src/lib/e621/types";
import { buildRecommendedQuery, DEFAULT_TAG_LIMIT } from "../src/lib/query/build";
import { coverTags } from "../src/lib/recommend/cover";
import { addFavorites, emptyProfile } from "../src/lib/recommend/profile";
import { byRank, rankAll, scorePost, type Ranked } from "../src/lib/recommend/rank";
import { REC_PAGE_BUDGET, REC_PAGE_SIZE } from "../src/lib/recommend/stream";
import { countsOf, EMPTY_TAG_CACHE, FAV_PAGE, refreshTagCache, tagsToLookUp, type RecApi, type TagCache } from "../src/lib/recommend/sync";
import { computeWeights, searchPlan, NO_OVERRIDES } from "../src/lib/recommend/weights";
import { DEFAULT_SEARCH } from "../src/lib/settings";
import { acceptPost } from "../src/lib/slideshow/queue";

if (existsSync(".env.backtest")) process.loadEnvFile(".env.backtest");
const DAY = 24 * 3600_000;
const days = Number(process.argv[2] ?? 30);
const breadth = Number(process.argv[3] ?? 15);
const many = (process.env.BACKTEST_USERS ?? "").split(",").map((s) => s.trim()).filter(Boolean);
const single = process.env.E621_USER;
const users = many.length ? many : single ? [single] : [];
if (!users.length) {
  console.error("Set E621_USER (in .env.backtest) or BACKTEST_USERS.");
  process.exit(1);
}
const apiKey = many.length ? "" : (process.env.E621_API_KEY ?? "");
const creds: Credentials | null = apiKey && single ? { username: single, apiKey } : null;
const extraBlacklist = process.env.BACKTEST_BLACKLIST ?? "";
const PLANS = [
  "signature",
  "popular-same",
  "cover-same",
  "mix-3",
  "popular-same+3",
  "mix-5",
  "popular-same+5",
  "mix-10",
  "popular-same+10",
  "popular-max",
  "cover-max",
] as const;
type Plan = (typeof PLANS)[number];
const DEFAULT_PLANS = PLANS.filter((p) => p !== "cover-max"); // cover-max: 25 uncacheable pages per account
const plans = ["signature", ...((process.env.BACKTEST_PLANS?.split(",") ?? DEFAULT_PLANS) as Plan[]).filter((p) => p !== "signature")] as Plan[];
const cacheDir = process.env.BACKTEST_CACHE ?? join(tmpdir(), "e621-rec-backtest");
mkdirSync(cacheDir, { recursive: true });
const tagCacheFile = join(cacheDir, "tags.json");
let tagCache: TagCache = existsSync(tagCacheFile) ? JSON.parse(readFileSync(tagCacheFile, "utf8")) : EMPTY_TAG_CACHE;

// Browsers send their own User-Agent; e621 blocks Node's default one, so name the project.
const nodeFetch = globalThis.fetch;
globalThis.fetch = (input, init) => {
  const headers = new Headers(init?.headers);
  headers.set("User-Agent", `e621-slideshow/1.0 (rec backtest${creds ? `, by ${creds.username} on e621` : ""})`);
  return nodeFetch(input, { ...init, headers });
};
const log = (msg: string) => process.stderr.write(msg + "\n");

async function findUser(name: string): Promise<{ id: number; blacklist: string; tagLimit: number }> {
  if (creds) {
    const u = await getCurrentUser(creds);
    if (u.id === null) throw new Error("e621 didn't accept that username and API key");
    return { id: u.id, blacklist: u.blacklisted_tags ?? "", tagLimit: u.tag_query_limit ?? DEFAULT_TAG_LIMIT };
  }
  const url = new URL("/users.json", E621_BASE);
  url.searchParams.set("search[name_matches]", name);
  const found = (await (await fetch(url)).json()) as { id: number; name: string }[];
  const u = found.find((x) => x.name.toLowerCase() === name.toLowerCase());
  if (!u) throw new Error(`No e621 user named ${name}`);
  return { id: u.id, blacklist: "", tagLimit: DEFAULT_TAG_LIMIT };
}

/** All favorites, newest first; cached for a day so reruns don't re-read them. */
async function allFavorites(name: string, userId: number): Promise<Post[]> {
  const file = join(cacheDir, `favs-${userId}.json`);
  if (existsSync(file) && Date.now() - statSync(file).mtimeMs < DAY) return JSON.parse(readFileSync(file, "utf8"));
  const out: Post[] = [];
  for (let page = 1; ; page++) {
    const batch = await getFavorites(userId, page, FAV_PAGE, creds);
    out.push(...batch);
    if (batch.length < FAV_PAGE) break;
    log(`${name}: favorites… ${out.length}`);
  }
  writeFileSync(file, JSON.stringify(out));
  return out;
}

/**
 * A query's pages until a short page or `max`. Pages are kept in memory for the run, so
 * the tagless "popular" search, the same for every account, is fetched once.
 */
const pageMemo = new Map<string, Post[]>();
async function fetchQuery(query: string, max: number): Promise<{ posts: Post[]; pages: number }> {
  const posts: Post[] = [];
  let pages = 0;
  for (let page = 1; page <= max; page++) {
    const key = `${page} ${query}`;
    let batch = pageMemo.get(key);
    if (!batch) {
      batch = await searchPosts(query, page, REC_PAGE_SIZE, creds);
      pageMemo.set(key, batch);
    }
    pages++;
    posts.push(...batch);
    if (batch.length < REC_PAGE_SIZE) break;
  }
  return { posts, pages };
}

/** Share of all posts uploaded inside the window, from post ids at its two ends. */
async function windowShare(): Promise<number> {
  const newest = await newestPostId(creds);
  const [before] = await searchPosts(`date:<${days}_days_ago`, 1, 1, creds);
  return newest > 0 && before ? (newest - before.id) / newest : 0;
}

interface Scores {
  top20: number;
  top100: number;
  top200: number;
}
interface Row {
  user: string;
  plan: Plan;
  hidden: number;
  candidates: number;
  pages: number;
  found: number;
  old: Scores;
  new: Scores;
}

function scores(order: Ranked[], hidden: Set<number>): Scores {
  const ranks = order.flatMap((r, i) => (hidden.has(r.post.id) ? [i + 1] : []));
  const at = (k: number) => ranks.filter((r) => r <= k).length;
  return { top20: at(20), top100: at(100), top200: at(200) };
}

async function runUser(name: string, share: number): Promise<Row[]> {
  const user = await findUser(name);
  const favs = await allFavorites(name, user.id);
  const cutoff = Date.now() - days * DAY;
  const hiddenPosts = favs.filter((p) => Date.parse(p.created_at) >= cutoff);
  const train = favs.filter((p) => Date.parse(p.created_at) < cutoff);
  const hidden = new Set(hiddenPosts.map((p) => p.id));
  log(`${name}: ${favs.length} favorites, ${hiddenPosts.length} hidden`);
  if (hiddenPosts.length < 5) {
    log(`${name}: fewer than 5 hidden favorites, skipped`);
    return [];
  }

  const profile = { ...addFavorites(emptyProfile(name), train, Date.now()), reported: train.length };
  const api: RecApi = {
    favoriteCount: async () => train.length,
    favorites: async () => [],
    tagCounts: (names) => getTags(names, creds),
    newestPostId: () => newestPostId(creds),
  };
  tagCache = await refreshTagCache(tagCache, tagsToLookUp(profile), api, Date.now());
  writeFileSync(tagCacheFile, JSON.stringify(tagCache));
  const counts = countsOf(tagCache);
  const weights = computeWeights(profile, counts, tagCache.site?.n ?? 0);
  const favTags = train.map(allTags);
  const settings = {
    ...DEFAULT_SEARCH,
    source: "recommended" as const,
    breadth,
    blacklist: [user.blacklist, extraBlacklist].join("\n"),
    date: { ...DEFAULT_SEARCH.date, enabled: true, mode: "within" as const, amount: days, unit: "days" as const },
  };
  // How many tags fit next to the window and order terms.
  const room = buildRecommendedQuery(settings, [], user.tagLimit).tagLimit - buildRecommendedQuery(settings, [], user.tagLimit).tagCount;
  const k = Math.min(breadth, room);
  const cover = (pages: number) =>
    coverTags(weights, favTags, [], k, { posts: (t) => (counts[t] ?? 0) * share, budget: pages * REC_PAGE_SIZE });
  const query = (tags: string[]) => buildRecommendedQuery(settings, tags, user.tagLimit);
  const signature = query(searchPlan(weights, NO_OVERRIDES, breadth).map((p) => p.tag));
  const popular = query([]);
  const sig = await fetchQuery(signature.query, REC_PAGE_BUDGET);
  const same = sig.pages;
  const specs: Record<Plan, () => { query: string; pages: number }[]> = {
    signature: () => [{ query: signature.query, pages: REC_PAGE_BUDGET }],
    "popular-same": () => [{ query: popular.query, pages: same }],
    "cover-same": () => [{ query: query(cover(same)).query, pages: same }],
    "mix-3": () => [{ query: signature.query, pages: REC_PAGE_BUDGET }, { query: popular.query, pages: 3 }],
    "popular-same+3": () => [{ query: popular.query, pages: same + 3 }],
    "mix-5": () => [{ query: signature.query, pages: REC_PAGE_BUDGET }, { query: popular.query, pages: 5 }],
    "popular-same+5": () => [{ query: popular.query, pages: same + 5 }],
    "mix-10": () => [{ query: signature.query, pages: REC_PAGE_BUDGET }, { query: popular.query, pages: 10 }],
    "popular-same+10": () => [{ query: popular.query, pages: same + 10 }],
    "popular-max": () => [{ query: popular.query, pages: REC_PAGE_BUDGET }],
    "cover-max": () => [{ query: query(cover(REC_PAGE_BUDGET)).query, pages: REC_PAGE_BUDGET }],
  };

  const rows: Row[] = [];
  for (const plan of plans) {
    // The candidate search as RecommendedQueue runs it, minus the favorites filter
    // (the hidden favorites are what we're looking for). Several queries share one
    // `seen` set, so a post found by both counts once.
    const filter = { seen: new Set<number>(), media: settings.media, rules: signature.rules, ctx: { username: name }, stats: { hidden: 0, blacklisted: 0 } };
    const ranked: Ranked[] = [];
    let pages = 0;
    for (const q of specs[plan]()) {
      const got = await fetchQuery(q.query, q.pages);
      pages += got.pages;
      for (const post of got.posts) {
        if (!acceptPost(post, filter)) continue;
        const r = scorePost(post, weights);
        if (r.score <= 0) continue;
        // Take the account's own favorite out of the count, so it doesn't help.
        const own = hidden.has(post.id) ? 1 : 0;
        ranked.push({ post: { ...post, stats: { ...post.stats, fav_count: post.stats.fav_count - own } }, ...r });
      }
    }
    const row: Row = {
      user: name,
      plan,
      hidden: hiddenPosts.length,
      candidates: ranked.length,
      pages,
      found: ranked.filter((r) => hidden.has(r.post.id)).length,
      old: scores([...ranked].sort(byRank), hidden),
      new: scores(rankAll(ranked), hidden),
    };
    log(`  ${plan}: ${row.candidates} candidates in ${pages} pages, found ${row.found}`);
    rows.push(row);
  }
  return rows;
}

const share = await windowShare();
log(`window: last ${days} days ≈ ${(share * 100).toFixed(2)}% of all posts; breadth ${breadth}; plans ${plans.join(", ")}`);
const rows: Row[] = [];
for (const name of users) {
  try {
    rows.push(...(await runUser(name, share)));
  } catch (e) {
    log(`${name}: failed: ${e instanceof Error ? e.message : String(e)}`);
  }
}

const pct = (a: number, b: number) => (b ? `${((a / b) * 100).toFixed(1)}%` : "-");
console.log(`\nLast ${days} days, breadth ${breadth}. Per account: hidden favorites found by the search, and in the top 100 / 200 of each ranking.`);
console.table(
  rows.map((r) => ({
    account: r.user,
    plan: r.plan,
    hidden: r.hidden,
    candidates: r.candidates,
    pages: r.pages,
    found: r.found,
    "old top100": r.old.top100,
    "new top100": r.new.top100,
    "old top200": r.old.top200,
    "new top200": r.new.top200,
  })),
);
console.log("Totals over all accounts (share of all hidden favorites):");
console.table(
  plans.map((plan) => {
    const rs = rows.filter((r) => r.plan === plan);
    const sum = (f: (r: Row) => number) => rs.reduce((s, r) => s + f(r), 0);
    const hidden = sum((r) => r.hidden);
    return {
      plan,
      accounts: rs.length,
      "avg candidates": Math.round(sum((r) => r.candidates) / Math.max(1, rs.length)),
      "avg pages": (sum((r) => r.pages) / Math.max(1, rs.length)).toFixed(1),
      found: pct(sum((r) => r.found), hidden),
      "old top20": pct(sum((r) => r.old.top20), hidden),
      "new top20": pct(sum((r) => r.new.top20), hidden),
      "old top100": pct(sum((r) => r.old.top100), hidden),
      "new top100": pct(sum((r) => r.new.top100), hidden),
      "old top200": pct(sum((r) => r.old.top200), hidden),
      "new top200": pct(sum((r) => r.new.top200), hidden),
    };
  }),
);
