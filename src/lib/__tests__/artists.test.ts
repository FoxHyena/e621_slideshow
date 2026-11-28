import { skippedLine } from "../feed/format";
import { describe, expect, it } from "vitest";
import { affinity, groupByArtist, pageOf, rankCandidates, rankWithRecency, RECENCY_TOP, recency, rejoiners, tileQueries, tileQuery, toLookUp } from "../recommend/artists";
import { artistRecall } from "../recommend/artistBacktest";
import type { Profile } from "../recommend/profile";
import { makePost } from "./fixtures";

/** Artist suggestions (ENGINEERING.md §6): ordering, smoothing, exclusions, the batched lookup. */

const profile = (tags: Record<string, [number, string]>): Profile => ({
  username: "fox",
  tags: Object.fromEntries(Object.entries(tags).map(([k, [n, cat]]) => [k, { n, cat: cat as never }])),
  favIds: [],
  reported: 0,
  syncedAt: 0,
});

describe("artist suggestions", () => {
  it("smooths: 1 favorite of 2 posts doesn't beat 40 of 300", () => {
    expect(affinity(40, 300)).toBeGreaterThan(affinity(1, 2));
    expect(affinity(3, 10)).toBeGreaterThan(affinity(3, 1000));
  });

  it("ranks artist tags with 3+ favorites, minus followed, hidden and placeholders", () => {
    const p = profile({
      big_fan: [40, "artist"],
      casual: [5, "artist"],
      once: [2, "artist"],
      followed: [30, "artist"],
      unknown_artist: [50, "artist"],
      conditional_dnp: [50, "artist"],
      wolf: [80, "species"],
    });
    const counts = { big_fan: 300, casual: 2000, followed: 100, unknown_artist: 1e6 };
    const out = rankCandidates(p, counts, null, new Set(["followed"]));
    expect(out.map((c) => c.name)).toEqual(["big_fan", "casual"]);
    expect(out[0]).toMatchObject({ favs: 40, posts: 300 });
  });

  it("the learned weight lifts an artist For You has learned you like", () => {
    const p = profile({ a: [10, "artist"], b: [10, "artist"] });
    const counts = { a: 100, b: 100 };
    expect(rankCandidates(p, counts, new Map([["b", 3]]), new Set()).map((c) => c.name)).toEqual(["b", "a"]);
    expect(rankCandidates(p, counts, new Map([["b", -3]]), new Set()).map((c) => c.name)).toEqual(["a", "b"]);
  });

  it("recency: a year of silence counts a fifth; nothing found counts as silent", () => {
    expect(recency(0)).toBe(1);
    expect(recency(400)).toBe(0.2);
    const now = Date.parse("2026-11-26T00:00:00Z");
    const cands = rankCandidates(profile({ quiet: [20, "artist"], active: [12, "artist"] }), { quiet: 100, active: 100 }, null, new Set());
    expect(cands[0].name).toBe("quiet");
    const out = rankWithRecency(cands, new Map([["active", now - 2 * 86_400_000]]), now);
    expect(out.map((s) => s.name)).toEqual(["active", "quiet"]);
    expect(out[1].lastPostAt).toBeNull();
  });

  it("picks whom to look up from those you neither follow nor hid: following most of the top still leaves a full list", () => {
    // 50 artists, best first; you follow the top 30 and hid one more
    const p = profile(Object.fromEntries(Array.from({ length: 50 }, (_, i) => [`a${i}`, [60 - i, "artist"]])));
    const cands = rankCandidates(p, {}, null, new Set());
    const followed = new Set(Array.from({ length: 30 }, (_, i) => `a${i}`));
    const top = toLookUp(cands, followed, new Set(["a31"]));
    expect(top).toHaveLength(19);
    expect(top[0].name).toBe("a30");
    expect(top.map((c) => c.name)).not.toContain("a31");
    // the old way, the top 32 then cut, left 1
    expect(cands.slice(0, RECENCY_TOP).filter((c) => !followed.has(c.name) && c.name !== "a31")).toHaveLength(1);
    // with plenty to pick from, it stops at RECENCY_TOP: the request count stays the same
    const many = profile(Object.fromEntries(Array.from({ length: 100 }, (_, i) => [`b${i}`, [200 - i, "artist"]])));
    const all = rankCandidates(many, {}, null, new Set());
    const picked = toLookUp(all, new Set(all.slice(0, 30).map((c) => c.name)), new Set());
    expect(picked).toHaveLength(RECENCY_TOP);
    expect(tileQueries(picked.map((c) => c.name))).toHaveLength(RECENCY_TOP / 8);
    expect(picked[0].name).toBe("b30");
  });

  it("who the lookup left out rejoins when shown again or unfollowed, if the lookup would have picked them", () => {
    const p = profile(Object.fromEntries(Array.from({ length: 50 }, (_, i) => [`a${i}`, [60 - i, "artist"]])));
    const pool = rankCandidates(p, {}, null, new Set());
    // a3 and a45 were hidden and a7 followed at lookup time
    const picked = toLookUp(pool, new Set(["a7"]), new Set(["a3", "a45"]));
    expect(picked.at(-1)!.name).toBe("a33");
    const names = (skip: string[]) => rejoiners(pool, picked, (n) => skip.includes(n)).map((c) => c.name);
    // all three shown again / unfollowed: a3 and a7 would have been picked; a45 ranks below the last
    expect(names([])).toEqual(["a3", "a7"]);
    // a7 still followed, or already given their own look: only a3
    expect(names(["a7"])).toEqual(["a3"]);
    // fewer than RECENCY_TOP were picked: everyone you could be suggested was, so anyone rejoins
    const few = toLookUp(pool.slice(0, 10), new Set(), new Set(["a9"]));
    expect(rejoiners(pool.slice(0, 10), few, () => false).map((c) => c.name)).toEqual(["a9"]);
  });

  it("More's pages: the next ones after every page so far; a rejoiner goes on the page their rank falls in", () => {
    const p = profile(Object.fromEntries(Array.from({ length: 80 }, (_, i) => [`a${i}`, [90 - i, "artist"]])));
    const pool = rankCandidates(p, {}, null, new Set());
    // a5 followed at the first lookup, a40 at the second
    const first = toLookUp(pool, new Set(["a5", "a40"]), new Set());
    const second = toLookUp(pool, new Set(["a5", "a40"]), new Set(first.map((c) => c.name)));
    expect(second[0].name).toBe("a33");
    expect(second.at(-1)!.name).toBe("a65");
    const pages = [first, second];
    expect(pageOf(pool, pages, "a5")).toBe(0);
    expect(pageOf(pool, pages, "a40")).toBe(1);
    // ranked past every page (or not a candidate): the last page
    expect(pageOf(pool, pages, "a70")).toBe(1);
    expect(pageOf(pool, pages, "nobody")).toBe(1);
  });

  it("batches the lookup 8 artists a search, any of them, newest first", () => {
    const names = Array.from({ length: 20 }, (_, i) => `a${i}`);
    expect(tileQueries(names).map((b) => b.length)).toEqual([8, 8, 4]);
    expect(tileQuery(["a", "b"], "rating:s")).toBe("~a ~b order:id_desc rating:s");
  });

  it("groups a page by artist: newest post time from every post, tiles only from kept ones", () => {
    const posts = [
      makePost({ id: 5, created_at: "2026-11-20T00:00:00Z", tags: { artist: ["a"], general: ["gore"] } }),
      makePost({ id: 4, created_at: "2026-11-10T00:00:00Z", tags: { artist: ["a", "b"] } }),
      makePost({ id: 3, created_at: "2026-11-01T00:00:00Z", tags: { artist: ["a"] } }),
      makePost({ id: 2, created_at: "2026-10-01T00:00:00Z", tags: { artist: ["a"] } }),
      makePost({ id: 1, created_at: "2026-09-01T00:00:00Z", tags: { artist: ["a"] } }),
    ];
    const keep = (p: (typeof posts)[number]) => !(p.tags.general ?? []).includes("gore");
    const { lastPostAt, tiles } = groupByArtist(posts, ["a", "b", "c"], keep);
    expect(lastPostAt.get("a")).toBe(Date.parse("2026-11-20T00:00:00Z"));
    expect(tiles.get("a")!.map((p) => p.id)).toEqual([4, 3, 2]);
    expect(tiles.get("b")!.map((p) => p.id)).toEqual([4]);
    expect(tiles.get("c")).toEqual([]);
    expect(lastPostAt.has("c")).toBe(false);
  });

  it("backtest: hides a stable 20%, and the score's top 10 holds over a third of them", () => {
    // 40 artists: a few you love with modest output, prolific ones you dip into, a long tail
    const favs = [];
    let id = 1;
    const counts: Record<string, number> = {};
    for (let i = 0; i < 40; i++) {
      const name = `artist_${i}`;
      const posts = i < 8 ? 120 : i < 16 ? 3000 : 60;
      counts[name] = posts;
      const n = i < 8 ? 40 - i * 2 : i < 16 ? 30 : 3 + (i % 4);
      for (let k = 0; k < n; k++) favs.push(makePost({ id: id++, tags: { artist: [name] } }));
    }
    const a = artistRecall(favs, counts, { now: 0 });
    const b = artistRecall(favs, counts, { now: 0 });
    expect(a).toEqual(b);
    expect(a.hidden / favs.length).toBeGreaterThan(0.12);
    expect(a.hidden / favs.length).toBeLessThan(0.28);
    // the loved, modest ones are the top: well over a third of what was hidden is theirs
    expect(a.score / a.hidden).toBeGreaterThan(0.35);
    expect(a.baseline).toBeLessThanOrEqual(a.hidden);
  });
});

describe("skippedLine", () => {
  it("names up to two, then counts the rest", () => {
    expect(skippedLine(["saffron_hare"])).toBe("1 skipped: saffron hare");
    expect(skippedLine(["saffron_hare", "harbor_seal"])).toBe("2 skipped: saffron hare, harbor seal");
    expect(skippedLine(["saffron_hare", "harbor_seal", "a", "b", "c"])).toBe("5 skipped: saffron hare, harbor seal and 3 more");
  });
});
