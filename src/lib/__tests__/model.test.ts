import { describe, expect, it } from "vitest";
import {
  covers,
  favKey,
  fitLearned,
  mergeFeatures,
  NEG_PAGE_SIZE,
  NEG_TTL_MS,
  refreshNegatives,
  withOverrides,
  type Learned,
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
  it("samples random pages, deduped, and reuses a fresh sample", async () => {
    const pages: number[] = [];
    const random = async (page: number) => {
      pages.push(page);
      const posts = Array.from({ length: NEG_PAGE_SIZE }, (_, i) => makePost({ id: page * 1000 + i }));
      return page === 2 ? [posts[0], ...posts.slice(0, 10)] : posts; // short page with a repeat: the end
    };
    const neg = await refreshNegatives(undefined, random, NOW);
    expect(pages).toEqual([1, 2]);
    expect(neg.feats).toHaveLength(NEG_PAGE_SIZE + 10);
    expect(await refreshNegatives(neg, random, NOW + NEG_TTL_MS)).toBe(neg);
    pages.length = 0;
    const stale = await refreshNegatives(neg, random, NOW + NEG_TTL_MS + 1);
    expect(pages).toEqual([1, 2]);
    expect(stale.at).toBe(NOW + NEG_TTL_MS + 1);
  });
});

describe("fitLearned", () => {
  const favs = Array.from({ length: 10 }, (_, i) => makePost({ id: i + 1, tagList: ["kink", "wolf"] }));
  const profile = profileOf(favs);
  const feats = mergeFeatures(undefined, profile, favs);
  const neg = { at: NOW, feats: Array.from({ length: 20 }, () => ["wolf", "rating:s"]) };

  it("fits weights for these favorites, and reuses them until favorites or sample change", async () => {
    const l = (await fitLearned(undefined, profile, feats, neg))!;
    expect(l.favKey).toBe(favKey(profile));
    expect(new Map(l.weights).get("kink")!).toBeGreaterThan(0);
    expect(await fitLearned(l, profile, feats, neg)).toBe(l);
    expect(await fitLearned(l, profile, feats, { ...neg, at: NOW + 1 })).not.toBe(l);
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
});
