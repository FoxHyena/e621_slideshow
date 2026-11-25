import { describe, expect, it } from "vitest";
import { coverTags } from "../recommend/cover";

describe("coverTags", () => {
  // 10 favorites by `artist`, all carrying their character too; 6 others with `kink`.
  const favorites = [
    ...Array.from({ length: 10 }, () => ["artist", "character", "wolf"]),
    ...Array.from({ length: 6 }, () => ["kink", "wolf"]),
  ];
  const weights = new Map([
    ["artist", 5],
    ["character", 4.9],
    ["kink", 3],
    ["wolf", 0.5],
  ]);

  it("skips a tag that finds the same favorites as one already picked", () => {
    // by weight alone the plan would be artist, character
    expect(coverTags(weights, favorites, [], 2)).toEqual(["artist", "kink"]);
  });

  it("puts pins first and lets them cover their favorites", () => {
    expect(coverTags(weights, favorites, ["kink"], 2)).toEqual(["kink", "artist"]);
  });

  it("with a cost, passes over a broad tag that would flood the search", () => {
    // wolf is on every favorite, but would bring 5,000 of the 8,000-post budget
    const posts = (t: string) => ({ wolf: 5000, artist: 40, character: 60, kink: 200 })[t] ?? 0;
    const plan = coverTags(weights, favorites, [], 2, { posts, budget: 8000 });
    expect(plan).toEqual(["artist", "kink"]);
  });

  it("ignores tags without a weight and stops when none are left", () => {
    expect(coverTags(new Map([["kink", 1]]), favorites, ["unweighted"], 5)).toEqual(["kink"]);
  });
});
