import { describe, expect, it } from "vitest";
import {
  covers,
  favKey,
  fitLearned,
  mergeFeatures,
  NEG_PAGE_SIZE,
  NEG_QUERIES,
  NEG_TTL_MS,
  refreshNegatives,
  withOverrides,
  type Learned,
  type Negatives,
} from "../recommend/model";
import { addFavorites, emptyProfile } from "../recommend/profile";
import { makePost } from "./fixtures";

const NOW = 1_700_000_000_000;
const profileOf = (posts: ReturnType<typeof makePost>[]) => addFavorites(emptyProfile("pup"), posts, NOW);

describe("favorite features", () => {
  const a = makePost({ id: 1, tagList: ["a"] });
  const b = makePost({ id: 2, tagList: ["b"], rating: "e" });

  it("merges new favorites with stored ones and drops unfavorited posts", () => {
    const stored = mergeFeatures(undefined, profileOf([a, b]), [a, b]);
    expect(stored.feats).toEqual({ 1: ["a", "rating:s"], 2: ["b", "rating:e"] });
    const c = makePost({ id: 3, tagList: ["c"] });
    const now = profileOf([c, a]); // 2 was unfavorited
    const merged = mergeFeatures(stored, now, [c]);
    expect(Object.keys(merged.feats).sort()).toEqual(["1", "3"]);
    expect(covers(merged, now)).toBe(true);
  });

  it("knows when stored features miss favorites, or belong to someone else", () => {
    const p = profileOf([a, b]);
    expect(covers(undefined, p)).toBe(false);
    expect(covers(mergeFeatures(undefined, profileOf([a]), [a]), p)).toBe(false);
    expect(covers({ ...mergeFeatures(undefined, p, [a, b]), username: "other" }, p)).toBe(false);
  });
});

describe("refreshNegatives", () => {
  /** Full pages for every query, except page 2 of the random one: short, with a repeat. */
  function fakeSearch() {
    const calls: string[] = [];
    const search = async (query: string, page: number) => {
      calls.push(`${query.split(" ").at(-1)} ${page}`);
      const base = (query === "order:random" ? 1 : 2) * 100_000 + page * 1000;
      const posts = Array.from({ length: NEG_PAGE_SIZE }, (_, i) => makePost({ id: base + i }));
      return query === "order:random" && page === 2 ? [posts[0], ...posts.slice(0, 10)] : posts;
    };
    return { calls, search };
  }

  it("samples random and popular pages, deduped, and reuses a fresh sample", async () => {
    const { calls, search } = fakeSearch();
    const neg = await refreshNegatives(undefined, search, NOW);
    const popular = NEG_QUERIES[1];
    expect(calls).toEqual([
      "order:random 1",
      "order:random 2",
      ...Array.from({ length: popular.pages }, (_, i) => `order:score ${i + 1}`),
    ]);
    expect(neg.feats).toHaveLength(NEG_PAGE_SIZE + 10 + popular.pages * NEG_PAGE_SIZE);
    expect(neg.ids).toHaveLength(neg.feats.length);
    expect(await refreshNegatives(neg, search, NOW + NEG_TTL_MS)).toBe(neg);
    calls.length = 0;
    const stale = await refreshNegatives(neg, search, NOW + NEG_TTL_MS + 1);
    expect(calls).toHaveLength(2 + popular.pages);
    expect(stale.at).toBe(NOW + NEG_TTL_MS + 1);
  });

  it("resamples a stored sample without post ids", async () => {
    const { calls, search } = fakeSearch();
    const old = { at: NOW, feats: [["wolf"]] } as unknown as Negatives;
    await refreshNegatives(old, search, NOW);
    expect(calls.length).toBeGreaterThan(0);
  });
});

describe("fitLearned", () => {
  const favs = Array.from({ length: 10 }, (_, i) => makePost({ id: i + 1, tagList: ["kink", "wolf"] }));
  const profile = profileOf(favs);
  const feats = mergeFeatures(undefined, profile, favs);
  const neg: Negatives = {
    at: NOW,
    ids: Array.from({ length: 20 }, (_, i) => 100 + i),
    feats: Array.from({ length: 20 }, () => ["wolf", "rating:s"]),
  };

  it("fits weights for these favorites, and reuses them until favorites or sample change", async () => {
    const l = (await fitLearned(undefined, profile, feats, neg))!;
    expect(l.favKey).toBe(favKey(profile));
    expect(new Map(l.weights).get("kink")!).toBeGreaterThan(0);
    expect(await fitLearned(l, profile, feats, neg)).toBe(l);
    expect(await fitLearned(l, profile, feats, { ...neg, at: NOW + 1 })).not.toBe(l);
  });

  it("leaves the user's own favorites out of the sample", async () => {
    // Every sampled post is a favorite: nothing left to compare against, so no weights.
    const own: Negatives = { at: NOW, ids: favs.map((p) => p.id), feats: Object.values(feats.feats) };
    expect((await fitLearned(undefined, profile, feats, own))!.weights).toEqual([]);
  });

  it("stops when cancelled", async () => {
    expect(await fitLearned(undefined, profile, feats, neg, () => true)).toBeNull();
  });
});

describe("withOverrides", () => {
  it("lifts pins to the strongest weight and drops mutes", () => {
    const l: Learned = { favKey: "k", negAt: 0, weights: [["a", 2], ["b", -1], ["c", 0.5]] };
    const w = withOverrides(l, { pinned: ["b"], muted: ["c"] });
    expect(w.get("b")).toBe(2);
    expect(w.has("c")).toBe(false);
  });

  it("with Filter artists, drops the favorites' artists unless pinned", () => {
    const l: Learned = { favKey: "k", negAt: 0, weights: [["a", 2], ["artist_one", 3], ["artist_two", 1]] };
    const isArtist = (t: string) => t.startsWith("artist_");
    const w = withOverrides(l, { pinned: ["artist_two"], muted: [], noArtists: true }, isArtist);
    expect([...w.keys()].sort()).toEqual(["a", "artist_two"]);
    expect(w.get("artist_two")).toBe(2);
    // off (or an older save without the field): artists stay
    expect(withOverrides(l, { pinned: [], muted: [] }, isArtist).has("artist_one")).toBe(true);
  });

  it("drops e621's do-not-post marks, which the fit may have learned", () => {
    const l: Learned = { favKey: "k", negAt: 0, weights: [["a", 1], ["avoid_posting", 4], ["unknown_artist", 2]] };
    expect([...withOverrides(l, { pinned: [], muted: [] }).keys()]).toEqual(["a"]);
  });
});
