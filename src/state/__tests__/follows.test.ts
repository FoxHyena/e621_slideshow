import { beforeEach, describe, expect, it, vi } from "vitest";
import { E621Error } from "@/lib/e621/client";
import type { TagSubscription } from "@/lib/e621/types";

const { createFollows, FOLLOW_LIMIT, LIMIT_MESSAGE, SUBS_TTL, PENDING_MS, isFollowed, atLimit } = await import("../follows");
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
});

const KEY = { username: "fox", apiKey: "k" };
const row = (tag_name: string, id: number): TagSubscription => ({ id, tag_id: id + 1000, tag_name, category: 1, created_at: "" });

/** A fake e621: a follow list with stable ids, and switches for failures. */
function setup(opts: { list?: string[]; fail?: boolean; t?: { now: number }; remember?: boolean } = {}) {
  const ids = new Map<string, number>();
  const idOf = (n: string) => ids.get(n) ?? (ids.set(n, 100 + ids.size), ids.get(n)!);
  let subs = [...(opts.list ?? [])];
  const said: { message: string; undo?: () => void; error?: boolean }[] = [];
  const signIn = vi.fn();
  const api = {
    list: vi.fn<(c?: unknown, signal?: unknown, lane?: string) => Promise<TagSubscription[]>>(async () => subs.map((n) => row(n, idOf(n)))),
    subscribe: vi.fn(async (names: string[]) => {
      if (opts.fail) throw new E621Error("Mock follow failure", 500);
      const added = names.filter((n) => !subs.includes(n));
      subs = [...subs, ...added];
      return { added: added.map((n) => row(n, idOf(n))), skipped: names.filter((n) => !added.includes(n)).map((name) => ({ name, reason: "already subscribed" })) };
    }),
    unsubscribe: vi.fn(async (id: number) => {
      if (opts.fail) throw new E621Error("Mock follow failure", 500);
      const n = subs.find((x) => idOf(x) === id);
      if (!n) throw new E621Error("not found", 404);
      subs = subs.filter((x) => x !== n);
    }),
  };
  const t = opts.t ?? { now: 1_000_000 };
  const f = createFollows({ say: (message, o) => said.push({ message, ...o }), signIn }, api as never, () => t.now);
  f.setAccount(KEY, "fox", opts.remember ?? true);
  return { f, api, said, signIn, t, subs: () => subs, setSubs: (s: string[]) => (subs = s) };
}

const settle = () => new Promise((r) => setTimeout(r, 0));

describe("follows", () => {
  it("reads the list once, keeps it 10 min, then refreshes behind what's shown", async () => {
    const { f, api, t } = setup({ list: ["artist_a"] });
    expect(f.store.get().status).toBe("idle");
    await f.ensure();
    expect(f.store.get().status).toBe("ready");
    expect(isFollowed(f.store.get(), "artist_a")).toBe(true);
    await f.ensure();
    expect(api.list).toHaveBeenCalledTimes(1);
    t.now += SUBS_TTL + 1;
    const p = f.ensure();
    // Still shown while it refreshes, and on the background lane.
    expect(f.store.get().status).toBe("ready");
    await p;
    expect(api.list).toHaveBeenCalledTimes(2);
    expect(api.list.mock.calls[1][2]).toBe("bg");
  });

  it("after a failed first read, cards wait a minute before asking again; Try again doesn't", async () => {
    const { f, api, t } = setup({ list: ["artist_a"] });
    api.list.mockRejectedValueOnce(new Error("Failed to fetch"));
    await f.ensure();
    expect(f.store.get().status).toBe("error");
    await f.ensure();
    expect(api.list).toHaveBeenCalledTimes(1);
    await f.ensure("user", true);
    expect(f.store.get().status).toBe("ready");
    // A refresh behind the shown list fails quietly and waits its 10 min again.
    t.now += SUBS_TTL + 1;
    api.list.mockRejectedValueOnce(new Error("Failed to fetch"));
    await f.ensure();
    expect(f.store.get().status).toBe("ready");
    await f.ensure();
    expect(api.list).toHaveBeenCalledTimes(3);
  });

    it("follows optimistically, with an Undo that unfollows", async () => {
    const { f, api, said, subs } = setup();
    await f.ensure();
    f.setFollowed("Artist_B", true);
    // Shown at once, before e621 answers.
    expect(isFollowed(f.store.get(), "artist_b")).toBe(true);
    expect(said[0]).toMatchObject({ message: "Following artist b" });
    await vi.waitFor(() => expect(f.store.get().changed).toBe(1));
    expect(api.subscribe).toHaveBeenCalledWith(["artist_b"], KEY);
    expect(subs()).toEqual(["artist_b"]);
    said[0].undo!();
    expect(isFollowed(f.store.get(), "artist_b")).toBe(false);
    await vi.waitFor(() => expect(f.store.get().changed).toBe(2));
    expect(api.unsubscribe).toHaveBeenCalledWith(100, KEY);
    expect(subs()).toEqual([]);
    expect(said[1]).toMatchObject({ message: "Unfollowed artist b" });
  });

  it("rolls back and says why when e621 fails (the failing mock)", async () => {
    const { f, said } = setup({ fail: true, list: ["artist_a"] });
    await f.ensure();
    f.setFollowed("artist_b", true);
    f.setFollowed("artist_a", false);
    expect(isFollowed(f.store.get(), "artist_b")).toBe(true);
    expect(isFollowed(f.store.get(), "artist_a")).toBe(false);
    await vi.waitFor(() => expect(said.filter((s) => s.error)).toHaveLength(2));
    expect(isFollowed(f.store.get(), "artist_b")).toBe(false);
    expect(isFollowed(f.store.get(), "artist_a")).toBe(true);
    expect(f.store.get().changed).toBe(0);
    expect(said.filter((s) => s.error).map((s) => s.message)).toEqual([
      "Couldn't follow artist b: Mock follow failure",
      "Couldn't unfollow artist a: Mock follow failure",
    ]);
  });

  it("runs taps on one tag in order: an Undo waits for its follow, quick taps settle on the last", async () => {
    const { f, api, subs } = setup();
    await f.ensure();
    let release!: () => void;
    api.subscribe.mockImplementationOnce(async (names: string[]) => {
      await new Promise<void>((r) => (release = r));
      return { added: names.map((n) => row(n, 100)), skipped: [] };
    });
    f.setFollowed("artist_b", true);
    await settle();
    f.setFollowed("artist_b", false); // Undo while the follow is on its way
    f.setFollowed("artist_b", true); // and again
    f.setFollowed("artist_b", false);
    expect(api.unsubscribe).not.toHaveBeenCalled();
    release();
    await vi.waitFor(() => expect(api.unsubscribe).toHaveBeenCalledTimes(1));
    await vi.waitFor(() => expect(f.store.get().changed).toBe(2));
    expect(api.subscribe).toHaveBeenCalledTimes(1);
    expect(isFollowed(f.store.get(), "artist_b")).toBe(false);
    expect(subs()).toEqual([]);
  });

  it("drops a list read that a write overtook, and shows taps over any list", async () => {
    const { f, api, t } = setup({ list: ["artist_a"] });
    await f.ensure();
    t.now += SUBS_TTL + 1;
    let answer!: (rows: TagSubscription[]) => void;
    api.list.mockImplementationOnce(() => new Promise((r) => (answer = r)));
    const reading = f.ensure();
    f.setFollowed("artist_b", true);
    await vi.waitFor(() => expect(f.store.get().changed).toBe(1));
    // The read started before the follow: its list (without artist_b) is out of date.
    answer([row("artist_a", 100)]);
    await reading;
    expect(isFollowed(f.store.get(), "artist_b")).toBe(true);
    // Read again once the writes settled.
    await vi.waitFor(() => expect(api.list).toHaveBeenCalledTimes(3));
    expect(isFollowed(f.store.get(), "artist_b")).toBe(true);
  });

  it("an unfollow without a known id looks it up first; one already gone counts as done", async () => {
    const { f, api, setSubs } = setup({ list: [] });
    await f.ensure();
    // e621 says "already subscribed" (followed elsewhere): no id comes back.
    setSubs(["artist_c"]);
    f.setFollowed("artist_c", true);
    await vi.waitFor(() => expect(f.store.get().changed).toBe(1));
    f.setFollowed("artist_c", false);
    await vi.waitFor(() => expect(f.store.get().changed).toBe(2));
    expect(api.list).toHaveBeenCalledTimes(2);
    expect(api.unsubscribe).toHaveBeenCalledWith(100, KEY);
    // Gone on e621 already (404): fine.
    setSubs(["artist_d"]);
    f.setFollowed("artist_d", true);
    await vi.waitFor(() => expect(f.store.get().changed).toBe(3));
    setSubs([]);
    f.setFollowed("artist_d", false);
    await vi.waitFor(() => expect(f.store.get().changed).toBe(4));
    expect(isFollowed(f.store.get(), "artist_d")).toBe(false);
  });

  it("stops at e621's 500 without asking, and says so when e621 skips one", async () => {
    const list = Array.from({ length: FOLLOW_LIMIT }, (_, i) => `t${i}`);
    const { f, api, said } = setup({ list });
    await f.ensure();
    expect(atLimit(f.store.get())).toBe(true);
    f.setFollowed("one_more", true);
    expect(api.subscribe).not.toHaveBeenCalled();
    expect(said).toEqual([{ message: LIMIT_MESSAGE, id: "follow:one_more", error: true }]);
    // Below the limit here, but e621 counts differently: its skip reason rolls back.
    f.setFollowed("t0", false);
    await vi.waitFor(() => expect(f.store.get().changed).toBe(1));
    api.subscribe.mockResolvedValueOnce({ added: [], skipped: [{ name: "x", reason: "over the limit of 500" }] });
    f.setFollowed("x", true);
    await vi.waitFor(() => expect(said.at(-1)).toMatchObject({ message: LIMIT_MESSAGE, error: true }));
    expect(isFollowed(f.store.get(), "x")).toBe(false);
    api.subscribe.mockResolvedValueOnce({ added: [], skipped: [{ name: "nope", reason: "does not exist" }] });
    f.setFollowed("nope", true);
    await vi.waitFor(() => expect(said.at(-1)?.message).toBe("Couldn't follow nope: e621 has no tag by that name"));
  });

  it("refuses a name with whitespace (e621 would follow each word)", async () => {
    const { f, api, said } = setup();
    await f.ensure();
    f.setFollowed("foo bar", true);
    await settle();
    expect(api.subscribe).not.toHaveBeenCalled();
    expect(said).toEqual([]);
  });

  it("a write before any list read isn't saved as the list; a write drops Following's saved first posts", async () => {
    const { f, api } = setup({ list: ["artist_a"] });
    api.list.mockRejectedValueOnce(new Error("Failed to fetch"));
    await f.ensure();
    storage.saveFeedHead("fox", { key: "k", at: 1_000_000, posts: [] }, true);
    f.setFollowed("artist_b", true);
    await vi.waitFor(() => expect(f.store.get().changed).toBe(1));
    expect(storage.loadSubs("fox")).toBeNull();
    expect([...ls.keys()].some((k) => k.includes("feedHead:fox"))).toBe(false);
  });

  it("keeps a follow whose id isn't known across a reload", async () => {
    const { f, setSubs } = setup({ list: [] });
    await f.ensure();
    setSubs(["artist_c"]);
    f.setFollowed("artist_c", true);
    await vi.waitFor(() => expect(f.store.get().changed).toBe(1));
    expect(storage.loadSubs("fox")?.tags).toEqual([["artist_c", null]]);
  });

  it("a sign-in still being checked isn't signed out", () => {
    const { f, signIn } = setup();
    f.setAccount(null, null, true, true);
    expect(f.store.get().checking).toBe(true);
    f.setAccount(KEY, "fox", true, false);
    expect(f.store.get()).toMatchObject({ checking: false, user: "fox" });
    expect(signIn).not.toHaveBeenCalled();
  });

  it("a run queued for the old account does nothing after a switch, and an old Undo is dead", async () => {
    const { f, api, said } = setup();
    await f.ensure();
    let release!: () => void;
    api.subscribe.mockImplementationOnce(async (names: string[]) => {
      await new Promise<void>((r) => (release = r));
      return { added: names.map((n) => row(n, 100)), skipped: [] };
    });
    f.setFollowed("artist_b", true);
    await settle();
    f.setFollowed("artist_b", false); // queued behind the slow follow
    f.setAccount({ username: "wolf", apiKey: "w" }, "wolf", true);
    await f.ensure();
    f.setFollowed("artist_b", true); // wolf's own tap
    await vi.waitFor(() => expect(api.subscribe).toHaveBeenCalledTimes(2));
    release();
    await settle();
    await settle();
    // fox's queued unfollow never ran under wolf's key.
    expect(api.unsubscribe).not.toHaveBeenCalled();
    said[0].undo!();
    expect(isFollowed(f.store.get(), "artist_b")).toBe(true);
  });

  it("a failed follow already undone says nothing (the later tap speaks)", async () => {
    const { f, api, said } = setup();
    await f.ensure();
    let fail!: () => void;
    api.subscribe.mockImplementationOnce(() => new Promise((_, rej) => (fail = () => rej(new E621Error("down", 500)))));
    f.setFollowed("artist_b", true);
    await settle();
    f.setFollowed("artist_b", false);
    fail();
    await settle();
    await settle();
    expect(said.map((s) => s.message)).toEqual(["Following artist b", "Unfollowed artist b"]);
    expect(isFollowed(f.store.get(), "artist_b")).toBe(false);
    expect(api.unsubscribe).not.toHaveBeenCalled();
  });

  it("a sign-in without Remember doesn't read what an earlier remembered one kept", async () => {
    const a = setup({ list: ["artist_a"] });
    await a.f.ensure();
    const b = setup({ remember: false });
    expect(b.f.store.get().status).toBe("idle");
    expect(isFollowed(b.f.store.get(), "artist_a")).toBe(false);
  });

  it("a Follow tapped signed out says so when the list can't be read after sign-in", async () => {
    const { f, api, said } = setup();
    f.setAccount(null, null, false);
    f.setFollowed("artist_b", true);
    api.list.mockRejectedValueOnce(new Error("Failed to fetch"));
    f.setAccount(KEY, "fox", false);
    await vi.waitFor(() => expect(said).toHaveLength(1));
    expect(said[0]).toMatchObject({ message: "Couldn't follow artist b: tap Follow again", error: true });
    expect(api.subscribe).not.toHaveBeenCalled();
  });

  it("an alias comes back under its new name and still counts", async () => {
    const { f, api } = setup();
    await f.ensure();
    api.subscribe.mockResolvedValueOnce({ added: [row("new_name", 300)], skipped: [] });
    f.setFollowed("old_name", true);
    await vi.waitFor(() => expect(f.store.get().changed).toBe(1));
    expect(isFollowed(f.store.get(), "old_name")).toBe(true);
    // The list e621 sends next has the new name: still followed.
    expect(isFollowed(f.store.get(), "new_name")).toBe(true);
    f.setFollowed("old_name", false);
    await vi.waitFor(() => expect(api.unsubscribe).toHaveBeenCalledWith(300, KEY));
    await vi.waitFor(() => expect(f.store.get().changed).toBe(2));
    expect(isFollowed(f.store.get(), "new_name")).toBe(false);
  });

  it("keeps the list with Remember only, paints from it, and forgets it on another account", async () => {
    const a = setup({ list: ["artist_a"] });
    await a.f.ensure();
    expect(storage.loadSubs("fox")?.tags).toEqual([["artist_a", 100]]);
    const b = setup({ list: [] });
    // Painted from disk at once, refreshed after 10 min.
    expect(b.f.store.get().status).toBe("ready");
    expect(isFollowed(b.f.store.get(), "artist_a")).toBe(true);
    b.f.setAccount({ username: "wolf", apiKey: "w" }, "wolf", true);
    expect(b.f.store.get().followed.size).toBe(0);
    expect(b.f.store.get().status).toBe("idle");
    storage.purgeAccount("fox");
    expect(storage.loadSubs("fox")).toBeNull();
    const c = setup({ list: ["artist_a"], remember: false });
    await c.f.ensure();
    expect(storage.loadSubs("fox")).toBeNull();
    expect(ls.size + ss.size).toBe(0);
  });

  it("signed out, Follow opens sign-in and goes through once signed in (not much later)", async () => {
    const { f, api, signIn, t } = setup();
    f.setAccount(null, null, false);
    f.setFollowed("artist_b", true);
    expect(signIn).toHaveBeenCalled();
    expect(api.subscribe).not.toHaveBeenCalled();
    f.setAccount(KEY, "fox", true);
    await vi.waitFor(() => expect(api.subscribe).toHaveBeenCalledWith(["artist_b"], KEY));
    // Too late: a tap from long ago isn't carried out.
    f.setAccount(null, null, false);
    f.setFollowed("artist_c", true);
    t.now += PENDING_MS + 1;
    f.setAccount(KEY, "fox", true);
    await settle();
    await settle();
    expect(api.subscribe).toHaveBeenCalledTimes(1);
  });

  it("a write for the old account changes nothing after a switch", async () => {
    const { f, api } = setup();
    await f.ensure();
    let release!: () => void;
    api.subscribe.mockImplementationOnce(async (names: string[]) => {
      await new Promise<void>((r) => (release = r));
      return { added: names.map((n) => row(n, 100)), skipped: [] };
    });
    f.setFollowed("artist_b", true);
    await settle();
    f.setAccount({ username: "wolf", apiKey: "w" }, "wolf", true);
    release();
    await settle();
    expect(isFollowed(f.store.get(), "artist_b")).toBe(false);
    expect(f.store.get().changed).toBe(0);
  });
});
