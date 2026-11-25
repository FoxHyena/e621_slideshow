import { describe, expect, it } from "vitest";
import { features, learnedScore, learnWeights } from "../recommend/learn";
import { makePost } from "./fixtures";

const times = (n: number, tags: string[]) => Array.from({ length: n }, () => tags);

describe("learnWeights", () => {
  it("weights tags the favorites have up and tags they avoid down", () => {
    const favs = [...times(20, ["wolf", "kink"]), ...times(5, ["wolf"])];
    const random = [...times(20, ["wolf"]), ...times(20, ["female"])];
    const w = learnWeights(favs, random);
    expect(w.get("kink")!).toBeGreaterThan(0);
    expect(w.get("female")!).toBeLessThan(0);
    expect(w.get("kink")!).toBeGreaterThan(w.get("wolf") ?? 0);
  });

  it("shares credit between tags that always come together", () => {
    // `character` only ever appears with `artist`: alone each would look as strong,
    // together they split it, so a post with both doesn't count it twice.
    const favs = [...times(15, ["artist", "character"]), ...times(15, ["kink"])];
    const random = times(60, ["other"]);
    const w = learnWeights(favs, random);
    const pair = w.get("artist")! + w.get("character")!;
    expect(w.get("artist")!).toBeCloseTo(w.get("character")!, 5);
    expect(pair).toBeLessThan(2 * w.get("kink")!);
  });

  it("ignores tags under the support floor and returns nothing without both classes", () => {
    const w = learnWeights([...times(10, ["kink"]), ["rare"]], times(10, ["other"]));
    expect(w.has("rare")).toBe(false);
    expect(learnWeights([], times(5, ["other"])).size).toBe(0);
  });
});

describe("learnedScore", () => {
  it("sums the weights of a post's tags and rating", () => {
    const post = makePost({ tagList: ["kink", "unknown"], rating: "e" });
    expect(features(post)).toEqual(["kink", "unknown", "rating:e"]);
    expect(learnedScore(post, new Map([["kink", 2], ["rating:e", 0.5]]))).toBe(2.5);
  });
});
