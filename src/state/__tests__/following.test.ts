import { beforeEach, describe, expect, it, vi } from "vitest";
import type { SavedSearchRow } from "@/lib/e621/types";

const { createFollowing, MARKER_TTL } = await import("../following");
const { storage } = await import("@/lib/storage");

let ls: Map<string, string>;
let ss: Map<string, string>;
const fake = (m: Map<string, string>) => ({
  getItem: (k: string) => m.get(k) ?? null,
  setItem: (k: string, v: string) => void m.set(k, v),
  removeItem: (k: string) => void m.delete(k),
});
beforeEach(() => {
  ls = new Map();
  ss = new Map();
  vi.stubGlobal("localStorage", fake(ls));
  vi.stubGlobal("sessionStorage", fake(ss));
  vi.spyOn(console, "warn").mockImplementation(() => {});
});

const KEY = { username: "fox", apiKey: "k" };
const anchor = (seen: number): SavedSearchRow => ({ id: 7, name: "subscriptions", query: "", is_tracked: true, is_subscription: true, last_seen_post_id: seen, tag_count: 3 });

function setup(opts: { seen?: number | null; newer?: boolean; moves?: boolean; remember?: boolean; t?: { now: number }; readBack?: boolean; offline?: boolean } = {}) {
  let marker = opts.seen === undefined ? 100 : opts.seen;
  let visited = false;
  const api = {
    getAnchor: vi.fn(async () => {
      if (visited && opts.readBack === false) throw new Error("e621 is busy");
      return marker === null ? null : anchor(marker);
    }),
    visitAnchor: vi.fn(async () => {
      visited = true;
      if (opts.moves !== false && marker !== null) marker = 500;
    }),
    anyPost: vi.fn(async () => {
      if (opts.offline) throw new Error("Failed to fetch");
      return opts.newer ?? false;
    }),
  };
  const notes: string[] = [];
  const t = opts.t ?? { now: 1_000_000 };
  const f = createFollowing((m) => notes.push(m), api, () => t.now);
  f.setAccount(KEY, "fox", opts.remember ?? true);
  return { f, api, notes, t };
}

describe("following marker", () => {
  it("takes the threshold from e621's marker, and keeps it for a reload within 12 h", async () => {
    const t = { now: 1_000_000 };
    const a = setup({ t });
    await a.f.load();
    expect(a.f.store.get()).toMatchObject({ status: "ready", threshold: 100 });
    // e621.net moved the marker meanwhile: this session's dots stay put.
    const b = setup({ seen: 300, t });
    await b.f.load();
    expect(b.f.store.get().threshold).toBe(100);
    t.now += MARKER_TTL;
    const c = setup({ seen: 300, t });
    await c.f.load();
    expect(c.f.store.get().threshold).toBe(300);
  });

  it("keeps the session's marker in this tab only without Remember", async () => {
    const { f } = setup({ remember: false });
    await f.load();
    expect([...ls.keys()].some((k) => k.includes("marker:"))).toBe(false);
    expect([...ss.keys()].some((k) => k.includes("marker:fox"))).toBe(true);
  });

  it("knows you follow nothing yet when there's no anchor", async () => {
    const { f } = setup({ seen: null });
    await f.load();
    expect(f.store.get()).toMatchObject({ status: "ready", anchor: null, threshold: null });
  });

  it("marks seen on e621 once nothing newer is found, and reads the marker back", async () => {
    const { f, api, notes } = setup();
    await f.load();
    const q = (n: number) => `search:subscriptions id:>${n}`;
    expect(await f.markSeen(150, q)).toBe("marked");
    expect(api.anyPost).toHaveBeenCalledWith("search:subscriptions id:>150", KEY);
    expect(api.visitAnchor).toHaveBeenCalledWith(7, KEY);
    expect(notes).toEqual(["Marked as seen on e621"]);
    expect(f.store.get()).toMatchObject({ marked: "e621", threshold: 100 });
    // Once a session.
    expect(await f.markSeen(150, q)).toBe("skipped");
    // The next session starts from e621's new marker (500 now).
    const next = setup({ seen: 500 });
    await next.f.load();
    expect(next.f.store.get().threshold).toBe(500);
  });

  it("doesn't mark when newer posts came in", async () => {
    const { f, api } = setup({ newer: true });
    await f.load();
    expect(await f.markSeen(150, String)).toBe("newer");
    expect(api.visitAnchor).not.toHaveBeenCalled();
    expect(f.store.get()).toMatchObject({ newer: true, marked: null, marking: false });
  });

  it("keeps a marker on this device when e621's doesn't move", async () => {
    const { f, notes } = setup({ moves: false });
    await f.load();
    expect(await f.markSeen(150, String)).toBe("local");
    expect(f.store.get().marked).toBe("local");
    expect(notes[0]).toMatch(/on this device/);
    const next = setup({ moves: false });
    await next.f.load();
    expect(next.f.store.get().threshold).toBe(150);
  });

  it("says when a mark you asked for found newer posts instead", async () => {
    const { f, notes } = setup({ newer: true });
    await f.load();
    expect(await f.markSeen(150, String)).toBe("newer");
    expect(notes).toEqual([]);
    f.clearNewer();
    expect(await f.markSeen(150, String, true)).toBe("newer");
    expect(notes[0]).toMatch(/nothing was marked/);
  });

  it("says it couldn't confirm when the visit went through but the read-back didn't", async () => {
    const { f, api, notes } = setup({ readBack: false });
    await f.load();
    expect(await f.markSeen(150, String)).toBe("local");
    expect(api.getAnchor).toHaveBeenCalledTimes(3); // load, then the read-back and its one retry
    expect(notes).toEqual(["Marked as seen. Couldn't confirm it with e621."]);
  });

  it("notes when a mark failed, and toasts only the first automatic failure", async () => {
    const t = { now: 1_000_000 };
    const { f, notes } = setup({ offline: true, t });
    await f.load();
    expect(await f.markSeen(150, String)).toBe("failed");
    expect(f.store.get()).toMatchObject({ failedAt: 1_000_000, marking: false, marked: null });
    t.now += 60_000;
    expect(await f.markSeen(150, String)).toBe("failed");
    expect(notes).toHaveLength(1);
    expect(await f.markSeen(150, String, true)).toBe("failed");
    expect(notes).toHaveLength(2);
  });

  it("forgets this device's markers on sign-out, in both stores", async () => {
    const { f } = setup({ moves: false });
    await f.load();
    await f.markSeen(150, String);
    storage.saveMarker("fox", { threshold: 1, at: 1, marked: false }, false);
    expect([...ls.keys(), ...ss.keys()].some((k) => /(marker|seen):fox/.test(k))).toBe(true);
    storage.purgeAccount("fox");
    expect([...ls.keys(), ...ss.keys()].some((k) => /(marker|seen):fox/.test(k))).toBe(false);
  });

  it("a reload in the same session is ready at once from the saved row, then re-reads it", async () => {
    const t = { now: 1_000_000 };
    const a = setup({ t });
    await a.f.load();
    const b = setup({ seen: 300, t });
    const p = b.f.load();
    // Ready before any answer from e621, with the session's threshold.
    expect(b.f.store.get()).toMatchObject({ status: "ready", threshold: 100 });
    await p;
    await vi.waitFor(() => expect(b.api.getAnchor).toHaveBeenCalledWith(KEY, undefined, "bg"));
    await vi.waitFor(() => expect(b.f.store.get().anchor?.last_seen_post_id).toBe(300));
    expect(b.f.store.get().threshold).toBe(100);
  });

  it("re-reading finds you follow nothing now, and forgets the saved first posts", async () => {
    const { f, api } = setup();
    await f.load();
    storage.saveFeedHead("fox", { key: "k", at: 1_000_000, posts: [] }, true);
    api.getAnchor.mockResolvedValueOnce(null);
    await f.reread();
    expect(f.store.get().anchor).toBeNull();
    expect([...ls.keys()].some((k) => k.includes("feedHead:fox"))).toBe(false);
  });

  it("a follow or unfollow makes the feed stale: saved first posts go, the row is read again", async () => {
    const { f, api } = setup();
    await f.load();
    storage.saveFeedHead("fox", { key: "k", at: 1_000_000, posts: [] }, true);
    f.followsChanged();
    expect(f.store.get().stale).toBe(true);
    expect([...ls.keys()].some((k) => k.includes("feedHead:fox"))).toBe(false);
    await vi.waitFor(() => expect(api.getAnchor).toHaveBeenCalledTimes(2));
    f.clearNewer();
    expect(f.store.get().stale).toBe(false);
  });

  it("a first follow brings the anchor: New starts at its marker", async () => {
    const { f, api } = setup({ seen: null });
    await f.load();
    expect(f.store.get()).toMatchObject({ anchor: null, threshold: null });
    api.getAnchor.mockResolvedValueOnce({ ...anchor(250), tag_count: 1 });
    f.followsChanged();
    // Nothing on show was of an old list: no pill.
    expect(f.store.get().stale).toBe(false);
    await vi.waitFor(() => expect(f.store.get().anchor?.tag_count).toBe(1));
    expect(f.store.get().threshold).toBe(250);
  });

  it("keeps saved first posts only with Remember, for their own feed and 10 minutes", () => {
    const post = { id: 5, files: { original: { url: "x" } } } as never;
    storage.saveFeedHead("fox", { key: "k", at: 0, posts: [post] }, false);
    expect([...ls.keys(), ...ss.keys()].some((k) => k.includes("feedHead"))).toBe(false);
    storage.saveFeedHead("fox", { key: "k", at: 0, posts: [post] }, true);
    expect(storage.loadFeedHead("fox", "k", 60_000)?.posts).toHaveLength(1);
    expect(storage.loadFeedHead("fox", "other", 60_000)).toBeNull();
    expect(storage.loadFeedHead("fox", "k", 10 * 60_000 + 1)).toBeNull();
    storage.purgeAccount("fox");
    expect(storage.loadFeedHead("fox", "k", 60_000)).toBeNull();
  });

  it("drops a late answer for an account that signed out", async () => {
    const { f } = setup();
    const p = f.load();
    f.setAccount(null, null, false);
    await p;
    expect(f.store.get()).toMatchObject({ user: null, status: "idle", threshold: null });
  });
});
