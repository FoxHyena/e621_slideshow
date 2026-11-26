import { describe, expect, it, vi } from "vitest";
import { parseBlacklist } from "../query/blacklist";
import { ID_BATCH, IdListQueue } from "../recommend/restore";
import { DEFAULT_SEARCH } from "../settings";
import { makePost } from "./fixtures";

const filter = (blacklist = "") => ({ media: DEFAULT_SEARCH.media, rules: parseBlacklist(blacklist), ctx: {} });

describe("IdListQueue", () => {
  it("plays saved ids in their saved order, a batch at a time, skipping ones that are gone", async () => {
    const ids = Array.from({ length: ID_BATCH + 5 }, (_, i) => (i * 7919) % 1000 + 1);
    const deleted = new Set([ids[3]]);
    const fetch = vi.fn(async (q: string) => {
      const asked = q.replace(/^id:/, "").split(",").map(Number);
      // e621 answers newest first, whatever order the ids were asked in.
      return asked.filter((id) => !deleted.has(id)).sort((a, b) => b - a).map((id) => makePost({ id }));
    });
    const q = new IdListQueue(ids, fetch, filter());
    await q.ensure(0);
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(q.posts.map((p) => p.id)).toEqual(ids.slice(0, ID_BATCH).filter((id) => !deleted.has(id)));
    expect(q.exhausted).toBe(false);
    await q.ensure(q.posts.length - 1);
    expect(q.exhausted).toBe(true);
    expect(q.posts).toHaveLength(ids.length - 1);
  });

  it("keeps going past a batch with nothing showable, and hides newly blacklisted posts", async () => {
    const ids = Array.from({ length: ID_BATCH * 2 }, (_, i) => i + 1);
    const fetch = vi.fn(async (q: string) =>
      q.replace(/^id:/, "").split(",").map(Number).map((id) => makePost({ id, tags: { general: [id <= ID_BATCH ? "gore" : "solo"] } })),
    );
    const q = new IdListQueue(ids, fetch, filter("gore"));
    await q.ensure(0);
    expect(fetch).toHaveBeenCalledTimes(2);
    expect(q.posts[0].id).toBe(ID_BATCH + 1);
    expect(q.stats.blacklisted).toBe(ID_BATCH);
    q.setRules(parseBlacklist("gore\nsolo"));
    expect(q.posts).toHaveLength(0);
  });
});
