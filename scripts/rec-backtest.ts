// Live backtest of Recommended against real favorites (read-only).
//
// For each account: hide its favorites uploaded in the last DAYS days, build the taste
// profile from the rest, run the app's candidate search for that window, and check how many
// hidden favorites the search finds (the ceiling) and where they land in each ranking.
// Compares search plans (which tags get OR'd) and rankings side by side.
//
// Usage: fill in .env.backtest (gitignored), then
//   node_modules/.bin/jiti scripts/rec-backtest.ts [days=30] [breadth=15]
//   node_modules/.bin/jiti scripts/rec-backtest.ts --artists
//     The artist score instead (ENGINEERING.md §6): hide 20% of each account's favorites, rank
//     artists from the rest, report recall@10 of the hidden favorites' artists against the raw
//     favorite count. Reads favorites and tag counts only.
// Env (wins over the file):
//   E621_USER, E621_API_KEY   one account; the key is optional when its favorites are public
//   BACKTEST_USERS            comma-separated public accounts instead (run without a key)
//   BACKTEST_BLACKLIST        extra blacklist lines for the run (newline-separated)
//   BACKTEST_PLANS            comma-separated subset of the plans below (signature always runs)
//   BACKTEST_CACHE            folder for cached favorites and tag counts (default: the OS temp folder)
//   BACKTEST_MODELS           comma-separated learned models, by their negatives (default: all four below)
//   BACKTEST_QUALITY          comma-separated quality weights for the learned rankings (default: 0.5,0.75,1)
//
// Learned models (learn.ts, C = 0.05), by what the favorites are told apart from:
//   random10, random25   that many pages of random posts uploaded before the window
//   popular10            the 10 best-scored pages of the 180 days before the window: posts the user
//                        likely saw and passed on
//   mix10                5 pages of each (what the app samples; see NEG_QUERIES in model.ts)
//
// Rankings, all over the same candidates:
//   taste          lift weights, top-5 sum (the app before quality)
//   app            lift taste + cohort quality (rankAll; the app without a learned model)
//   MODEL qQ       the model's learned score + Q × cohort quality
//
// Plans, so search strategies are compared at the same request cost:
//   signature      today's plan: the highest-weight tags
//   popular-same   no tags, just the window by score, for as many pages as signature used
//   cover-same     covering plan (cover.ts) with signature's page count as its budget
//   popular-max    no tags, the full page budget
//   cover-max      covering plan with the full page budget (only when named in BACKTEST_PLANS)
//   mix-N          signature's search plus the window's N most popular pages, ranked together
//   popular-same+N no tags, for as many pages as mix-N costs
//   mix-3-lr       mix-3 with search tags picked by the first model's weights, and posts kept when
//                  either lift or that model scores them above 0
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
import { features, learnedScore, learnWeights } from "../src/lib/recommend/learn";
import { artistRecall } from "../src/lib/recommend/artistBacktest";
import { addFavorites, emptyProfile } from "../src/lib/recommend/profile";
import { byRank, rankAll, scorePost, type Ranked } from "../src/lib/recommend/rank";
import { REC_PAGE_BUDGET, REC_PAGE_SIZE } from "../src/lib/recommend/stream";
import { countsOf, EMPTY_TAG_CACHE, FAV_PAGE, refreshTagCache, tagsToLookUp, type RecApi, type TagCache } from "../src/lib/recommend/sync";
import { CAT_MULT, computeWeights, searchPlan, NO_OVERRIDES } from "../src/lib/recommend/weights";
import { DEFAULT_SEARCH } from "../src/lib/settings";
import { acceptPost } from "../src/lib/slideshow/queue";

if (existsSync(".env.backtest")) process.loadEnvFile(".env.backtest");
const DAY = 24 * 3600_000;
const artistsMode = process.argv.includes("--artists");
const argv = process.argv.slice(2).filter((a) => !a.startsWith("--"));
const days = Number(argv[0] ?? 30);
const breadth = Number(argv[1] ?? 15);
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
  "mix-3-lr",
] as const;
type Plan = (typeof PLANS)[number];
const DEFAULT_PLANS = PLANS.filter((p) => p !== "cover-max"); // cover-max: 25 uncacheable pages per account
const plans = ["signature", ...((process.env.BACKTEST_PLANS?.split(",") ?? DEFAULT_PLANS) as Plan[]).filter((p) => p !== "signature")] as Plan[];
const MODELS = ["random10", "random25", "popular10", "mix10"] as const;
type Model = (typeof MODELS)[number];
const models = (process.env.BACKTEST_MODELS?.split(",") ?? MODELS) as Model[];
for (const m of models) if (!MODELS.includes(m)) throw new Error(`Unknown model ${m}`);
const qualities = (process.env.BACKTEST_QUALITY ?? "0.5,0.75,1").split(",").map(Number);
const cacheDir = process.env.BACKTEST_CACHE ?? join(tmpdir(), "e621-rec-backtest");
mkdirSync(cacheDir, { recursive: true });
const tagCacheFile = join(cacheDir, "tags.json");
let tagCache: TagCache = existsSync(tagCacheFile) ? JSON.parse(readFileSync(tagCacheFile, "utf8")) : EMPTY_TAG_CACHE;

// Browsers send their own User-Agent; e621 blocks Node's default one, so name the project.
const nodeFetch = globalThis.fetch;
globalThis.fetch = (input, init) => {
  const headers = new Headers(init?.headers);
  headers.set("User-Agent", `eLicks21/1.0 (rec backtest${creds ? `, by ${creds.username} on e621` : ""})`);
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
  ranks: Record<string, Scores>;
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
  // Negatives for the learner, all uploaded before the window, minus the training favorites.
  const trainIds = new Set(train.map((p) => p.id));
  const random = (pages: number) => fetchQuery(`date:<${days}_days_ago order:random`, pages);
  const popularBefore = (pages: number) => fetchQuery(`date:<${days}_days_ago date:>=${days + 180}_days_ago order:score`, pages);
  const negativesFor: Record<Model, () => Promise<Post[]>> = {
    random10: async () => (await random(10)).posts,
    random25: async () => (await random(25)).posts,
    popular10: async () => (await popularBefore(10)).posts,
    mix10: async () => [...(await random(5)).posts, ...(await popularBefore(5)).posts],
  };
  const positives = train.map(features);
  const learned: [Model, Map<string, number>][] = [];
  for (const m of models) {
    const seen = new Set<number>();
    const negs = (await negativesFor[m]()).filter((p) => !trainIds.has(p.id) && !seen.has(p.id) && seen.add(p.id));
    const t = Date.now();
    const w = learnWeights(positives, negs.map(features));
    log(`  ${m}: ${w.size} weights from ${train.length} favorites and ${negs.length} negatives in ${Date.now() - t} ms`);
    learned.push([m, w]);
  }
  const main = learned[0]?.[1];
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
  // The first model's strongest tags that lift could also search (no meta, no rating).
  const lrTags = main
    ? [...main.entries()]
        .filter(([t, w]) => w > 0 && profile.tags[t] && CAT_MULT[profile.tags[t].cat] > 0)
        .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
        .slice(0, breadth)
        .map(([t]) => t)
    : [];
  const lrSignature = query(lrTags);
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
    "mix-3-lr": () => [{ query: lrSignature.query, pages: REC_PAGE_BUDGET }, { query: popular.query, pages: 3 }],
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
        const lrMatch = plan === "mix-3-lr" && !!main && learnedScore(post, main) > 0;
        if (r.score <= 0 && !lrMatch) continue;
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
      ranks: {
        taste: scores([...ranked].sort(byRank), hidden),
        app: scores(rankAll(ranked), hidden),
      },
    };
    for (const [m, w] of learned) {
      const relearned = ranked.map((r) => ({ ...r, score: learnedScore(r.post, w) }));
      for (const q of qualities) row.ranks[`${m} q${q}`] = scores(rankAll(relearned, q), hidden);
    }
    log(`  ${plan}: ${row.candidates} candidates in ${pages} pages, found ${row.found}`);
    rows.push(row);
  }
  return rows;
}

if (artistsMode) {
  const out: Record<string, string | number>[] = [];
  let hidden = 0;
  let score = 0;
  let baseline = 0;
  for (const name of users) {
    try {
      const user = await findUser(name);
      const favs = await allFavorites(name, user.id);
      const profile = addFavorites(emptyProfile(name), favs, Date.now());
      const api: RecApi = {
        favoriteCount: async () => favs.length,
        favorites: async () => [],
        tagCounts: (names) => getTags(names, creds),
        newestPostId: () => newestPostId(creds),
      };
      tagCache = await refreshTagCache(tagCache, tagsToLookUp(profile), api, Date.now());
      writeFileSync(tagCacheFile, JSON.stringify(tagCache));
      const r = artistRecall(favs, countsOf(tagCache));
      hidden += r.hidden;
      score += r.score;
      baseline += r.baseline;
      out.push({ account: name, favorites: favs.length, candidates: r.candidates, hidden: r.hidden, "score@10": r.score, "raw count@10": r.baseline });
    } catch (e) {
      log(`${name}: failed: ${e instanceof Error ? e.message : String(e)}`);
    }
  }
  const p = (a: number) => (hidden ? `${((a / hidden) * 100).toFixed(1)}%` : "-");
  console.log("\nArtist score: hidden favorites (20%) by an artist in the top 10.");
  console.table(out);
  console.log(`score ${p(score)} · raw favorite count ${p(baseline)} · ${hidden} hidden favorites`);
  process.exit(0);
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
const rankings = [...new Set(rows.flatMap((r) => Object.keys(r.ranks)))];
console.log(`\nLast ${days} days, breadth ${breadth}. Per account: hidden favorites found by the search, and in the top 200 of each ranking.`);
console.table(
  rows.map((r) => ({
    account: r.user,
    plan: r.plan,
    hidden: r.hidden,
    candidates: r.candidates,
    pages: r.pages,
    found: r.found,
    ...Object.fromEntries(rankings.map((k) => [k, r.ranks[k]?.top200 ?? "-"])),
  })),
);
for (const plan of plans) {
  const rs = rows.filter((r) => r.plan === plan);
  const hidden = rs.reduce((s, r) => s + r.hidden, 0);
  const found = rs.reduce((s, r) => s + r.found, 0);
  const pages = rs.reduce((s, r) => s + r.pages, 0) / Math.max(1, rs.length);
  console.log(`\n${plan}: ${rs.length} accounts, ${hidden} hidden favorites, ${pct(found, hidden)} found, ${pages.toFixed(1)} pages on average`);
  console.table(
    rankings.map((k) => {
      const sum = (f: (s: Scores) => number) => rs.reduce((t, r) => t + (r.ranks[k] ? f(r.ranks[k]) : 0), 0);
      return {
        ranking: k,
        top20: pct(sum((s) => s.top20), hidden),
        top100: pct(sum((s) => s.top100), hidden),
        top200: pct(sum((s) => s.top200), hidden),
        "accounts better / worse (top200 vs app)": `${rs.filter((r) => r.ranks[k] && r.ranks[k].top200 > r.ranks.app.top200).length} / ${rs.filter((r) => r.ranks[k] && r.ranks[k].top200 < r.ranks.app.top200).length}`,
      };
    }),
  );
}
