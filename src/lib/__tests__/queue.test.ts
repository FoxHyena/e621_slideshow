import { describe, expect, it, vi } from "vitest";
import { parseBlacklist } from "../query/blacklist";
import { buildQuery } from "../query/build";
import { DEFAULT_SEARCH, type SearchSettings } from "../settings";
import { PAGE_SIZE, PostQueue, type PageFetcher } from "../slideshow/queue";
import { makePost } from "./fixtures";

const search = (over: Partial<SearchSettings> = {}): SearchSettings => ({
  ...DEFAULT_SEARCH,
  blacklist: "",
  ...over,
});

/** Fake e621: `total` posts with descending ids, honoring b<id> cursors and page numbers. */
function fakeApi(total: number, decorate: (id: number) => Parameters<typeof makePost>[0] = () => ({})) {
  const all = Array.from({ length: total }, (_, i) => makePost({ id: total - i, ...decorate(total - i) }));
  const calls: (string | number)[] = [];
  const fetcher: PageFetcher = async (_tags, page, limit) => {
    calls.push(page);
    if (typeof page === "string" && page.startsWith("b")) {
      const before = Number(page.slice(1));
      return all.filter((p) => p.id < before).slice(0, limit);
    }
    const n = typeof page === "number" ? page : 1;
    return all.slice((n - 1) * limit, n * limit);
  };
  return { fetcher: vi.fn(fetcher), calls };
}

describe("PostQueue", () => {
  it("starts from a saved first page and pages on below it", async () => {
    const api = fakeApi(250);
    const s = search();
    const q = new PostQueue(buildQuery(s), s.media, api.fetcher);
    const head = Array.from({ length: 24 }, (_, i) => makePost({ id: 250 - i }));
    expect(q.seed(head)).toBe(true);
    expect(q.seeded).toBe(true);
    expect(q.posts.map((p) => p.id).slice(0, 2)).toEqual([250, 249]);
    expect(q.rawMax).toBe(250);
    await q.ensure(q.posts.length - 1);
    expect(api.calls[0]).toBe("b227");
    expect(new Set(q.posts.map((p) => p.id)).size).toBe(q.posts.length);
    // Only before anything loaded.
    expect(q.seed(head)).toBe(false);
    // e621 sent a newer post the filters hid: "newer" starts above it.
    const r = new PostQueue(buildQuery(s), s.media, api.fetcher);
    r.seed(head, 251);
    expect(r.rawMax).toBe(251);
  });

  it("counts the posts it would show above the newest loaded", async () => {
    const all = Array.from({ length: 5 }, (_, i) => makePost({ id: 105 - i, tagList: i === 0 ? ["hidden_tag"] : [] }));
    const fetcher = vi.fn<PageFetcher>(async (tags) => (tags.includes("id:>100") ? all : [makePost({ id: 100 })]));
    const s = search();
    const q = new PostQueue({ ...buildQuery(s), rules: parseBlacklist("hidden_tag") }, s.media, fetcher);
    await q.ensure(0);
    expect(await q.countNewer(5)).toEqual({ count: 4, more: true });
    expect(fetcher).toHaveBeenLastCalledWith(expect.stringContaining("id:>100"), 1, 5, expect.objectContaining({ lane: "user" }));
    // Counting adds nothing.
    expect(q.posts.map((p) => p.id)).toEqual([100]);
  });

  it("treats a cancelled request as no error, and asks again on the next ensure", async () => {
    let calls = 0;
    const fetcher: PageFetcher = async (_t, _p, _l, opts) => {
      calls++;
      if (calls === 1) {
        await new Promise((_, reject) => opts?.signal?.addEventListener("abort", () => reject(new DOMException("x", "AbortError"))));
      }
      return [makePost({ id: 1 })];
    };
    const s = search();
    const q = new PostQueue(buildQuery(s), s.media, fetcher);
    const first = q.ensure(0);
    q.cancel();
    await first;
    expect(q.error).toBeNull();
    expect(q.posts).toHaveLength(0);
    await q.ensure(0);
    expect(q.posts).toHaveLength(1);
  });

  it("setRules drops loaded posts the new blacklist hides and filters later pages", async () => {
    const api = fakeApi(250, (id) => ({ tagList: id % 2 ? ["odd"] : ["even"] }));
    const s = search();
    const q = new PostQueue(buildQuery(s), s.media, api.fetcher);
    await q.ensure(0);
    expect(q.posts).toHaveLength(PAGE_SIZE);
    q.setRules(parseBlacklist("odd"));
    expect(q.posts).toHaveLength(PAGE_SIZE / 2);
    expect(q.stats.blacklisted).toBe(PAGE_SIZE / 2);
    await q.ensure(q.posts.length - 1);
    expect(q.posts.every((p) => p.id % 2 === 0)).toBe(true);
    expect(q.posts.length).toBeGreaterThan(PAGE_SIZE / 2);
  });

  it("loads the first page and refills near the end via cursor", async () => {
    const api = fakeApi(250);
    const s = search();
    const q = new PostQueue(buildQuery(s), s.media, api.fetcher);
    await q.ensure(0);
    expect(q.posts).toHaveLength(PAGE_SIZE);
    expect(api.calls).toEqual([""]);

    await q.ensure(50); // far from the end: no fetch
    expect(api.calls).toHaveLength(1);

    await q.ensure(PAGE_SIZE - 5);
    expect(api.calls[1]).toBe("b151");
    expect(q.posts).toHaveLength(200);

    await q.ensure(195);
    expect(q.posts).toHaveLength(250);
    expect(q.exhausted).toBe(true);
    expect(new Set(q.posts.map((p) => p.id)).size).toBe(250);
  });

  it("uses numbered pages for non-id orders", async () => {
    const api = fakeApi(150);
    const s = search({ order: "score" });
    const q = new PostQueue(buildQuery(s), s.media, api.fetcher);
    await q.ensure(0);
    await q.ensure(95);
    expect(api.calls).toEqual([1, 2]);
  });

  it("skips posts without a file url and counts them", async () => {
    const api = fakeApi(10, (id) => (id % 2 ? { original: { url: null } } : {}));
    const s = search();
    const q = new PostQueue(buildQuery(s), s.media, api.fetcher);
    await q.ensure(0);
    expect(q.posts).toHaveLength(5);
    expect(q.stats.hidden).toBe(5);
  });

  it("applies the blacklist locally", async () => {
    const api = fakeApi(10, (id) => ({ tagList: id <= 3 ? ["gore"] : ["wolf"] }));
    const s = search({ blacklist: "gore" });
    const q = new PostQueue(buildQuery(s), s.media, api.fetcher);
    await q.ensure(0);
    expect(q.posts.map((p) => p.id)).toEqual([10, 9, 8, 7, 6, 5, 4]);
    expect(q.stats.blacklisted).toBe(3);
  });

  it("filters disabled media kinds", async () => {
    const api = fakeApi(4, (id) => ({ meta: { ext: id % 2 ? "webm" : "png" } }));
    const s = search({ media: { image: true, gif: true, video: false } });
    const q = new PostQueue(buildQuery(s), s.media, api.fetcher);
    await q.ensure(0);
    expect(q.posts.every((p) => p.files.meta.ext === "png")).toBe(true);
  });

  it("drops Flash posts, which browsers can't play", async () => {
    const api = fakeApi(4, (id) => ({ meta: { ext: id === 4 ? "swf" : "png" } }));
    const s = search();
    const q = new PostQueue(buildQuery(s), s.media, api.fetcher);
    await q.ensure(0);
    expect(q.posts.map((p) => p.id)).toEqual([3, 2, 1]);
  });

  it("keeps fetching when a whole page is filtered out", async () => {
    const api = fakeApi(300, (id) => ({ tagList: id > 150 ? ["gore"] : ["wolf"] }));
    const s = search({ blacklist: "gore" });
    const q = new PostQueue(buildQuery(s), s.media, api.fetcher);
    await q.ensure(0);
    expect(api.calls).toEqual(["", "b201"]);
    expect(q.posts[0].id).toBe(150);
  });

  it("dedupes concurrent ensure calls", async () => {
    const api = fakeApi(50);
    const s = search();
    const q = new PostQueue(buildQuery(s), s.media, api.fetcher);
    await Promise.all([q.ensure(0), q.ensure(0), q.ensure(1)]);
    expect(api.fetcher).toHaveBeenCalledTimes(1);
  });

  it("surfaces fetch errors and stops until retried", async () => {
    const s = search();
    const fetcher = vi.fn<PageFetcher>().mockRejectedValueOnce(new Error("You cannot search for more than 40 tags at a time"));
    const q = new PostQueue(buildQuery(s), s.media, fetcher);
    await q.ensure(0);
    expect(q.error).toMatch(/40 tags/);
    await q.ensure(0);
    expect(fetcher).toHaveBeenCalledTimes(1);
  });
});
