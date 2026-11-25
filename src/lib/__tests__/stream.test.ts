import { describe, expect, it } from "vitest";
import type { Post } from "../e621/types";
import { parseBlacklist } from "../query/blacklist";
import { DEFAULT_SEARCH } from "../settings";
import { RecommendedQueue, REC_PAGE_SIZE, type RecFetch, type TagQuery } from "../recommend/stream";
import { makePost } from "./fixtures";

/** A fetcher whose requests the test settles by hand. */
function controlled() {
  const calls: { query: string; page: number; resolve: (p: Post[]) => void; reject: (e: Error) => void }[] = [];
  const fetch: RecFetch = (query, page) => new Promise((resolve, reject) => calls.push({ query, page, resolve, reject }));
  return { calls, fetch };
}
const flush = () => new Promise((r) => setTimeout(r, 0));
/** A full page (so the search isn't treated as finished), padded with unscored filler. */
const full = (...posts: Post[]) => [
  ...posts,
  ...Array.from({ length: REC_PAGE_SIZE - posts.length }, () => makePost({ tagList: ["filler"] })),
];
const tq = (tag: string, pages = 1): TagQuery => ({ tag, query: `${tag} q`, pages });
const weights = new Map([
  ["a", 1],
  ["b", 1],
  ["good", 5],
  ["best", 9],
]);
const filter = { media: DEFAULT_SEARCH.media, rules: [], ctx: {} };
const none = new Set<string>();
const ids = (q: RecommendedQueue) => q.posts.map((p) => p.id);
const label = (c: { query: string; page: number }) => `${c.query.split(" ")[0]}${c.page}`;

describe("RecommendedQueue", () => {
  it("shows nothing until the search ends, then everything ranked best first", async () => {
    const api = controlled();
    const q = new RecommendedQueue([tq("or", 5)], api.fetch, weights, filter, none);
    let ready = false;
    void q.ensure().then(() => (ready = true));
    const plain = makePost({ tagList: ["a"] });
    const good = makePost({ tagList: ["good"] });
    const best = makePost({ tagList: ["best"] }); // results come in e621-score order; the best match is last
    await flush();
    api.calls[0].resolve(full(plain));
    await flush();
    api.calls[1].resolve(full(good));
    await flush();
    expect(q.posts).toEqual([]);
    expect(ready).toBe(false);
    api.calls[2].resolve([best]); // short page: the end
    await flush();
    expect(ready).toBe(true);
    expect(q.exhausted).toBe(true);
    expect(ids(q)).toEqual([best.id, good.id, plain.id]);
  });

  it("fetches several queries round by round, each until a short page or its budget", async () => {
    const api = controlled();
    new RecommendedQueue([tq("a", 3), tq("b", 2), tq("c", 1)], api.fetch, weights, filter, none);
    await flush();
    api.calls[0].resolve([makePost({ tagList: ["a"] })]); // a is out of results
    for (let i = 1; i < 3; i++) {
      await flush();
      api.calls[i].resolve(full());
    }
    await flush();
    expect(api.calls.map(label)).toEqual(["a1", "b1", "c1", "b2"]);
  });

  it("dedupes, keeps favorites, drops blacklisted and unmatched posts, and explains each", async () => {
    const api = controlled();
    const shared = makePost({ tagList: ["a", "b"] });
    const fav = makePost({ tagList: ["good"], stats: { is_favorited: true } });
    const bad = makePost({ tagList: ["good", "gross"] });
    const rules = parseBlacklist("gross");
    const q = new RecommendedQueue([tq("a"), tq("b")], api.fetch, weights, { ...filter, rules }, none);
    await flush();
    api.calls[0].resolve([shared, fav, bad, makePost({ tagList: ["zzz"] })]);
    await flush();
    api.calls[1].resolve([shared]);
    await q.ensure();
    expect(ids(q)).toEqual([fav.id, shared.id]);
    expect(q.stats.blacklisted).toBe(1);
    expect(q.matchFor(shared.id)).toEqual({ score: 2, reasons: ["a", "b"] });
  });

  it("leaves out posts carrying a muted tag, however well they score", async () => {
    const api = controlled();
    const kept = makePost({ tagList: ["a"] });
    const muted = makePost({ tagList: ["best", "gross_kink"] });
    const q = new RecommendedQueue([tq("or")], api.fetch, weights, filter, new Set(["gross_kink"]));
    await flush();
    api.calls[0].resolve([kept, muted]);
    await q.ensure();
    expect(ids(q)).toEqual([kept.id]);
  });

  it("on an error shows what it found, and retry resumes at the failed page", async () => {
    const api = controlled();
    const q = new RecommendedQueue([tq("or", 3)], api.fetch, weights, filter, none);
    const first = makePost({ tagList: ["a"] });
    await flush();
    api.calls[0].resolve(full(first));
    await flush();
    api.calls[1].reject(new Error("Rate limited by e621"));
    await q.ensure();
    expect(q.error).toBe("Rate limited by e621");
    expect(ids(q)).toEqual([first.id]);

    q.retry();
    const done = q.ensure();
    await flush();
    expect(api.calls.map(label)).toEqual(["or1", "or2", "or2"]);
    const late = makePost({ tagList: ["best"] });
    api.calls[2].resolve([late]);
    await done;
    expect(ids(q)).toEqual([late.id, first.id]);
  });

  it("reports pages fetched and posts found while it runs", async () => {
    const api = controlled();
    const q = new RecommendedQueue([tq("or", 5)], api.fetch, weights, filter, none);
    expect(q.progress).toEqual({ done: 0, found: 0 });
    await flush();
    api.calls[0].resolve(full(makePost({ tagList: ["a"] }), makePost({ tagList: ["zzz"] }))); // zzz: no weight
    await flush();
    expect(q.progress).toEqual({ done: 1, found: 1 });
    expect(q.loading).toBe(true);
    api.calls[1].resolve([makePost({ tagList: ["good"] })]);
    await flush();
    expect(q.progress).toEqual({ done: 2, found: 2 });
    expect(q.loading).toBe(false);
  });

  it("stops fetching once disposed", async () => {
    const api = controlled();
    const q = new RecommendedQueue([tq("a"), tq("b")], api.fetch, weights, filter, none);
    await flush();
    q.dispose();
    api.calls[0].resolve(full());
    await flush();
    expect(api.calls).toHaveLength(1);
    await q.ensure(); // resolves rather than hanging
  });
});
