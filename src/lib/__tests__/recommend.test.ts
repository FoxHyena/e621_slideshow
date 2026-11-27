import { describe, expect, it } from "vitest";
import { addFavorites, emptyProfile, type Profile } from "../recommend/profile";
import { cohortQuality, percentiles, rankAll, scorePost, type Ranked } from "../recommend/rank";
import { FAV_PAGE, TAG_BATCH, refreshTagCache, syncProfile, tagsToLookUp, type RecApi, type TagCache } from "../recommend/sync";
import { CAT_MULT, computeWeights, isName, NO_OVERRIDES, searchPlan, SHARE_HALF, SITE_HALF, topTags } from "../recommend/weights";
import { makePost } from "./fixtures";

const NOW = 1_700_000_000_000;
const N_SITE = 1_000_000;

/** 100 favorites: all `anthro`, 20 `niche_kink`, 2 `one_off`, all `hi_res` (meta). */
function profile(): Profile {
  const favs = Array.from({ length: 100 }, (_, i) =>
    makePost({
      id: 5000 + i,
      tags: {
        general: ["anthro", ...(i < 20 ? ["niche_kink"] : []), ...(i < 2 ? ["one_off"] : [])],
        meta: ["hi_res"],
        ...(i < 10 ? { artist: ["fave_artist"] } : {}),
      },
    }),
  );
  return addFavorites(emptyProfile("pup"), favs, NOW);
}

const GLOBAL = {
  anthro: 700_000, // 70% of the site
  niche_kink: 2_000, // 0.2%
  one_off: 50,
  hi_res: 10_000,
  fave_artist: 500,
};

describe("addFavorites", () => {
  it("counts tags per favorite with their category, skipping posts already counted", () => {
    const p = profile();
    expect(p.favIds).toHaveLength(100);
    expect(p.tags.anthro).toEqual({ n: 100, cat: "general" });
    expect(p.tags.fave_artist).toEqual({ n: 10, cat: "artist" });
    const again = addFavorites(p, [makePost({ id: 5000, tagList: ["anthro"] })], NOW + 1);
    expect(again.tags.anthro.n).toBe(100);
  });

  it("puts new favorites in front so favIds[0] is the newest", () => {
    const p = addFavorites(profile(), [makePost({ id: 9, tagList: ["x"] })], NOW + 1);
    expect(p.favIds[0]).toBe(9);
    expect(p.syncedAt).toBe(NOW + 1);
  });
});

describe("computeWeights", () => {
  const w = computeWeights(profile(), GLOBAL, N_SITE);

  it("ignores a tag that is about as common on the site as in favorites", () => {
    // 100% vs 70%: lift ln(1.43) is small next to the niche tag's
    expect(w.get("anthro")!).toBeLessThan(w.get("niche_kink")! / 5);
  });

  it("boosts a tag that is far more common in favorites than on the site", () => {
    expect(w.get("niche_kink")).toBeGreaterThan(2);
  });

  it("requires minimum support and drops meta tags", () => {
    expect(w.has("one_off")).toBe(false);
    expect(w.has("hi_res")).toBe(false);
  });

  it("with Filter artists, gives artist tags no weight unless pinned", () => {
    expect(w.get("fave_artist")).toBeGreaterThan(0);
    const off = computeWeights(profile(), GLOBAL, N_SITE, { pinned: [], muted: [], noArtists: true });
    expect(off.has("fave_artist")).toBe(false);
    expect(off.get("niche_kink")).toBe(w.get("niche_kink"));
    const pinned = computeWeights(profile(), GLOBAL, N_SITE, { pinned: ["fave_artist"], muted: [], noArtists: true });
    expect(pinned.has("fave_artist")).toBe(true);
  });

  it("gives e621's do-not-post marks and no-one placeholders no weight", () => {
    const favs = Array.from({ length: 10 }, (_, i) =>
      makePost({ id: 7000 + i, tags: { general: ["niche_kink"], artist: ["avoid_posting", "conditional_dnp", "unknown_artist", "fave_artist"] } }),
    );
    const p = addFavorites(emptyProfile("pup"), favs, NOW);
    const counts = { niche_kink: 2_000, avoid_posting: 900, conditional_dnp: 900, unknown_artist: 900, fave_artist: 500 };
    expect([...computeWeights(p, counts, N_SITE).keys()].sort()).toEqual(["fave_artist", "niche_kink"]);
    expect(tagsToLookUp(p).sort()).toEqual(["fave_artist", "niche_kink"]);
  });

  it("skips tags with no global count", () => {
    expect(computeWeights(profile(), {}, N_SITE).size).toBe(0);
  });

  it("caps lift, so a rare tag on a few favorites can't outweigh a strong one on many", () => {
    // fave_artist: 10% of favorites, 0.05% of the site (200×, capped at 50×)
    // niche_kink: 20% of favorites, 0.2% of the site (100×, also capped)
    const capped = computeWeights(profile(), GLOBAL, N_SITE);
    expect(capped.get("niche_kink")!).toBeGreaterThan(capped.get("fave_artist")!);
    // with the same lift, the rest decides: n / (n + SHRINK), the share of favorites, the share of the site
    const share = (s: number) => s / (s + SHARE_HALF);
    const site = (c: number) => 1 / (1 + c / SITE_HALF);
    expect(capped.get("niche_kink")! / capped.get("fave_artist")!).toBeCloseTo(
      ((20 / 25) * share(0.2) * site(0.002)) / ((10 / 15) * share(0.1) * site(0.0005)),
      5,
    );
  });

  it("damps by share of the favorites, so a heavy favoriter's rare names don't outweigh what's in the pictures", () => {
    // 5,000 favorites: an artist on 50 (1%, at the lift cap) and a kink on 1,000 (20%, 25× the site)
    const p = emptyProfile("heavy");
    p.favIds = Array.from({ length: 5000 }, (_, i) => i + 1);
    p.tags = { big_artist: { n: 50, cat: "artist" }, big_kink: { n: 1000, cat: "general" } };
    const counts = { big_artist: 100, big_kink: 8_000 };
    const now = computeWeights(p, counts, N_SITE);
    expect(now.get("big_kink")!).toBeGreaterThan(now.get("big_artist")!);
    // counting favorites alone (the old damping), the artist won
    const old = computeWeights(p, counts, N_SITE, NO_OVERRIDES, 0, 0);
    expect(old.get("big_artist")!).toBeGreaterThan(old.get("big_kink")!);
  });

  it("damps tags common on e621, so a broad tag doesn't tie a specific kink", () => {
    // 10,000 favorites: a broad tag on 31% (3.6% of the site, 9×) and a kink on 4.8% (0.24%, 20×)
    const p = emptyProfile("pup");
    p.favIds = Array.from({ length: 10_000 }, (_, i) => i + 1);
    p.tags = { broad: { n: 3140, cat: "general" }, kink: { n: 480, cat: "general" } };
    const counts = { broad: 36_000, kink: 2_400 };
    const now = computeWeights(p, counts, N_SITE);
    expect(now.get("broad")!).toBeLessThan(now.get("kink")! / 3);
    // by the share of favorites alone, the two were about even
    const shareOnly = computeWeights(p, counts, N_SITE, NO_OVERRIDES, SHARE_HALF, 0);
    expect(shareOnly.get("broad")! / shareOnly.get("kink")!).toBeGreaterThan(0.9);
  });

  it("gives artists no bonus over other tags", () => {
    expect(CAT_MULT.artist).toBe(CAT_MULT.general);
  });

  it("weighs a character half as much as a content tag on as many favorites", () => {
    const p = profile();
    p.tags.fave_character = { n: 20, cat: "character" };
    const half = computeWeights(p, { ...GLOBAL, fave_character: 2_000 }, N_SITE);
    expect(CAT_MULT.character).toBe(CAT_MULT.general / 2);
    expect(half.get("fave_character")!).toBeCloseTo(half.get("niche_kink")! / 2, 5);
  });

  it("pins to the top weight and mutes to zero", () => {
    const o = computeWeights(profile(), GLOBAL, N_SITE, { pinned: ["anthro"], muted: ["niche_kink"] });
    expect(o.has("niche_kink")).toBe(false);
    expect(topTags(o, 1)).toEqual(["anthro"]);
  });
});

describe("scorePost", () => {
  const weights = new Map([
    ["niche_kink", 4],
    ["fave_artist", 3],
    ["wolf", 1],
  ]);

  it("counts only the strongest matches, so a pile of mild ones can't beat a strong one", () => {
    const mild = new Map([...weights, ...Array.from({ length: 10 }, (_, i) => [`generic${i}`, 1.4] as const)]);
    const strong = makePost({ tagList: ["niche_kink", "fave_artist", "wolf"] }); // 4 + 3 + 1 = 8
    const pile = makePost({ tagList: Array.from({ length: 10 }, (_, i) => `generic${i}`) }); // only 5 × 1.4 = 7 count
    expect(scorePost(strong, mild).score).toBe(8);
    expect(scorePost(pile, mild).score).toBeCloseTo(7);
    // summing all ten (14) would have beaten the strong post
    expect(scorePost(pile, mild).score).toBeLessThan(scorePost(strong, mild).score);
  });

  it("ignores how many other tags a post has", () => {
    const focused = makePost({ tagList: ["niche_kink", "wolf", "a", "b"] });
    const sprawl = makePost({ tagList: ["niche_kink", "wolf", ...Array.from({ length: 80 }, (_, i) => `t${i}`)] });
    expect(scorePost(sprawl, weights).score).toBe(scorePost(focused, weights).score);
  });

  it("explains with the top 3 contributors", () => {
    const post = makePost({ tagList: ["wolf", "niche_kink", "fave_artist", "x"] });
    expect(scorePost(post, weights).reasons).toEqual(["niche_kink", "fave_artist", "wolf"]);
  });
});

describe("syncProfile", () => {
  /** Fake account: `ids` newest-favorited first; reports `count` (defaults to ids.length). */
  function fakeApi(ids: number[], count = ids.length) {
    const calls: number[] = [];
    const api: RecApi = {
      favoriteCount: async () => count,
      favorites: async (page, limit) => {
        calls.push(page);
        return ids.slice((page - 1) * limit, page * limit).map((id) => makePost({ id, tagList: ["t"] }));
      },
      tagCounts: async () => [],
      newestPostId: async () => 1,
    };
    return { api, calls };
  }
  const range = (from: number, n: number) => Array.from({ length: n }, (_, i) => from - i);

  it("builds from scratch across pages", async () => {
    const { api, calls } = fakeApi(range(1000, FAV_PAGE + 5));
    const p = await syncProfile(null, "pup", api, NOW);
    expect(p.favIds).toHaveLength(FAV_PAGE + 5);
    expect(p.tags.t.n).toBe(FAV_PAGE + 5);
    expect(calls).toEqual([1, 2]);
  });

  it("reads only favorites newer than the last one seen", async () => {
    const stored = await syncProfile(null, "pup", fakeApi(range(1000, 10)).api, NOW);
    const { api, calls } = fakeApi([2001, 2000, ...range(1000, 10)]);
    const read: number[] = [];
    const p = await syncProfile(stored, "pup", api, NOW + 1, undefined, (posts) => read.push(...posts.map((x) => x.id)));
    expect(calls).toEqual([1]);
    expect(read).toEqual([2001, 2000]); // only the new favorites were read
    expect(p.favIds.slice(0, 3)).toEqual([2001, 2000, 1000]);
    expect(p.tags.t.n).toBe(12);
  });

  it("rebuilds when something was unfavorited", async () => {
    const stored = await syncProfile(null, "pup", fakeApi(range(1000, 10)).api, NOW);
    // 995 removed, one new: count unchanged though one new favorite appeared
    const ids = [2000, ...range(1000, 10).filter((id) => id !== 995)];
    const { api, calls } = fakeApi(ids);
    const p = await syncProfile(stored, "pup", api, NOW + 1);
    expect(calls).toEqual([1, 1]);
    expect(p.favIds).not.toContain(995);
    expect(p.tags.t.n).toBe(10);
  });

  it("tolerates favorites the API never lists (deleted posts)", async () => {
    const stored = await syncProfile(null, "pup", fakeApi(range(1000, 10), 12).api, NOW);
    const { api, calls } = fakeApi([2000, ...range(1000, 10)], 13);
    await syncProfile(stored, "pup", api, NOW + 1);
    expect(calls).toEqual([1]);
  });

  it("ignores a profile that belongs to another account", async () => {
    const stored = await syncProfile(null, "other", fakeApi(range(1000, 10)).api, NOW);
    const p = await syncProfile(stored, "pup", fakeApi(range(50, 3)).api, NOW);
    expect(p.username).toBe("pup");
    expect(p.favIds).toEqual([50, 49, 48]);
  });
});

describe("refreshTagCache", () => {
  it("looks up only missing or stale tags, batched, and caches unknown ones as 0", async () => {
    const asked: string[][] = [];
    const api = {
      tagCounts: async (names: string[]) => {
        asked.push(names);
        return names.filter((n) => n !== "gone").map((name) => ({ name, post_count: 7 }));
      },
      newestPostId: async () => 999,
    } as unknown as RecApi;
    const tags = ["fresh", "gone", ...Array.from({ length: TAG_BATCH }, (_, i) => `x${i}`)];
    const cache: TagCache = { counts: { fresh: { c: 3, at: NOW } }, site: null };
    const out = await refreshTagCache(cache, tags, api, NOW + 1);
    expect(asked).toHaveLength(2);
    expect(asked.flat()).not.toContain("fresh");
    expect(out.counts.gone.c).toBe(0);
    expect(out.counts.x0.c).toBe(7);
    expect(out.site).toEqual({ n: 999, at: NOW + 1 });

    asked.length = 0;
    await refreshTagCache(out, tags, api, NOW + 2);
    expect(asked).toHaveLength(0);
  });

  it("only looks up tags with support in a weighted category", () => {
    const p = profile();
    expect(tagsToLookUp(p).sort()).toEqual(["anthro", "fave_artist", "niche_kink"]);
  });
});

describe("searchPlan", () => {
  // weight order: rare_artist, niche_kink, fave_artist, anthro (anthro is on the most favorites)
  const w = new Map([
    ["rare_artist", 9],
    ["niche_kink", 3],
    ["fave_artist", 3 - 1e-9],
    ["anthro", 1],
  ]);
  const plan = (breadth: number, o = NO_OVERRIDES) => searchPlan(w, o, breadth).map((s) => `${s.kind}:${s.tag}`);

  it("searches the highest-weight tags, not the most common ones", () => {
    expect(plan(2)).toEqual(["signature:rare_artist", "signature:niche_kink"]);
    expect(plan(3)).not.toContain("signature:anthro");
    expect(plan(10)).toHaveLength(4);
  });

  it("puts pins first and counts them against breadth", () => {
    expect(plan(2, { pinned: ["anthro"], muted: [] })).toEqual(["pinned:anthro", "signature:rare_artist"]);
  });
  it("keeps names (artists and characters together) to a third of the searched tags while other tags are left, in weight order", () => {
    // a heavy favoriter: ten names at the lift cap above every other tag, characters among the artists
    const names = ["artist_0", "char_0", "artist_1", "char_1", "artist_2", "artist_3", "char_2", "artist_4", "artist_5", "char_3"];
    const heavy = new Map<string, number>([
      ...names.map((t, i) => [t, 3.9 - i * 0.01] as [string, number]),
      ["kink_a", 3.0],
      ["kink_b", 2.9],
      ["species_c", 2.5],
      ["kink_d", 2.0],
    ]);
    const name = (t: string) => isName(t.startsWith("artist_") ? "artist" : t.startsWith("char_") ? "character" : "general");
    const tags = searchPlan(heavy, NO_OVERRIDES, 6, name).map((s) => s.tag);
    expect(tags).toEqual(["artist_0", "char_0", "kink_a", "kink_b", "species_c", "kink_d"]);
    // other tags run out: names fill the rest
    expect(searchPlan(heavy, NO_OVERRIDES, 9, name).map((s) => s.tag)).toEqual([
      "artist_0",
      "char_0",
      "artist_1",
      "char_1",
      "artist_2",
      "kink_a",
      "kink_b",
      "species_c",
      "kink_d",
    ]);
    // a pinned name doesn't use the share
    expect(searchPlan(heavy, { pinned: ["char_3"], muted: [] }, 4, name).map((s) => s.tag)).toEqual(["char_3", "artist_0", "kink_a", "kink_b"]);
    // species, copyrights and the rest aren't names
    expect([isName("species"), isName("copyright"), isName(undefined)]).toEqual([false, false, false]);
  });
});

describe("percentiles", () => {
  it("spreads values from 0 to 1 and gives ties the midpoint", () => {
    expect(percentiles([10, 30, 20])).toEqual([0, 1, 0.5]);
    expect(percentiles([5, 5, 9])).toEqual([0.25, 0.25, 1]);
    expect(percentiles([7])).toEqual([0.5]);
  });
});

/** `n` posts uploaded an hour apart, oldest first, with the given favorite counts. */
function hourly(favs: number[]) {
  const t0 = Date.parse("2024-01-01T00:00:00Z");
  return favs.map((fav_count, i) =>
    makePost({ created_at: new Date(t0 + i * 3600_000).toISOString(), stats: { fav_count } }),
  );
}

describe("cohortQuality", () => {
  it("compares a post's favorites with posts of the same age, not with older ones", () => {
    // 100 posts: favorites grow with age, so the newest posts have the fewest.
    const favs = Array.from({ length: 100 }, (_, i) => 1000 - i * 10);
    favs[95] = 500; // new, but far ahead of its neighbors (40–90 favorites)
    favs[5] = 600; // old, but far behind its neighbors (~950)
    const q = cohortQuality(hourly(favs));
    expect(q[95]).toBe(1);
    expect(q[5]).toBe(0);
  });

  it("keeps every cohort the same size at the ends of the window", () => {
    const q = cohortQuality(hourly(Array.from({ length: 40 }, (_, i) => i)));
    // k = 5: an 11-post cohort, slid inward at both ends
    expect(q[0]).toBe(0);
    expect(q[39]).toBe(1);
    expect(q[20]).toBe(0.5);
  });

  it("is neutral for a single post", () => {
    expect(cohortQuality(hourly([3]))).toEqual([0.5]);
  });
});

describe("rankAll", () => {
  const r = (score: number, fav_count: number): Ranked => ({
    post: makePost({ stats: { fav_count } }),
    score,
    reasons: [],
  });

  it("lets a well-liked post with a good match beat the best match nobody liked", () => {
    const top = r(9, 0); // best taste, worst quality
    const solid = r(5, 100); // second-best taste, best quality
    const weak = r(1, 50);
    expect(rankAll([top, solid, weak])).toEqual([solid, top, weak]);
  });

  it("falls back to taste when quality is equal", () => {
    const a = r(1, 5);
    const b = r(9, 5);
    const c = r(5, 5);
    expect(rankAll([a, b, c])).toEqual([b, c, a]);
  });
});
