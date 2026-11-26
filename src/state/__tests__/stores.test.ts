import { beforeEach, describe, expect, it, vi } from "vitest";
import { makePost } from "@/lib/__tests__/fixtures";
import { E621Error } from "@/lib/e621/client";
import { DEFAULT_FILTERS } from "@/lib/feed/filters";

const getCurrentUser = vi.fn();
vi.mock("@/lib/e621/client", async (orig) => ({
  ...(await orig<typeof import("@/lib/e621/client")>()),
  getCurrentUser: (...a: unknown[]) => getCurrentUser(...a),
}));

const { createPrefs, blacklistOf } = await import("../prefs");
const { createSession } = await import("../session");
const { createFavs, favCountOf, favedOf } = await import("../favs");
const { createRegistry, feedKey, IDLE_MS, MAX_FEEDS } = await import("../feeds");

let ls: Map<string, string>;
beforeEach(() => {
  ls = new Map();
  vi.stubGlobal("localStorage", {
    getItem: (k: string) => ls.get(k) ?? null,
    setItem: (k: string, v: string) => void ls.set(k, v),
    removeItem: (k: string) => void ls.delete(k),
  });
  getCurrentUser.mockReset();
});

const KEY = { username: "fox", apiKey: "k123" };
const user = (blacklist = "gore") => ({ id: 1, name: "fox", blacklisted_tags: blacklist });
const saved = (k: string) => JSON.parse(ls.get(`e6ss:v1:${k}`) ?? "null");

describe("session", () => {
  it("verifies a remembered key and syncs the account blacklist into saved prefs", async () => {
    ls.set("e6ss:v1:creds", JSON.stringify(KEY));
    getCurrentUser.mockResolvedValue(user("gore\nscat"));
    const prefs = createPrefs();
    const s = createSession(null, prefs);
    expect(s.store.get()).toMatchObject({ creds: KEY, remember: true, link: false });
    await s.verify();
    expect(s.store.get().user?.name).toBe("fox");
    expect(saved("search").blacklist).toBe("gore\nscat");
    expect(saved("accountBlacklist")).toBe("gore\nscat");
  });

  it("uses a link's key for this tab only: nothing saved, the saved key untouched", async () => {
    ls.set("e6ss:v1:creds", JSON.stringify({ username: "me", apiKey: "mine" }));
    getCurrentUser.mockResolvedValue(user("sharer_rule"));
    const prefs = createPrefs();
    const s = createSession("#u=fox&k=k123", prefs);
    expect(s.store.get()).toMatchObject({ creds: KEY, link: true, remember: false });
    await s.verify();
    expect(blacklistOf(prefs.store.get())).toBe("sharer_rule");
    expect(saved("search")).toBeNull();
    s.signOut();
    expect(saved("creds")).toEqual({ username: "me", apiKey: "mine" });
    expect(prefs.store.get().visitBlacklist).toBeNull();
  });

  it("ignores a verify that a sign-out overtook", async () => {
    ls.set("e6ss:v1:creds", JSON.stringify(KEY));
    let resolve!: (u: unknown) => void;
    getCurrentUser.mockReturnValue(new Promise((r) => (resolve = r)));
    const s = createSession(null, createPrefs());
    const v = s.verify();
    s.signOut();
    resolve(user());
    await v;
    expect(s.store.get().user).toBeNull();
  });

  it("signs in, saving the key only with Remember, and refuses an anonymous answer", async () => {
    const s = createSession(null, createPrefs());
    getCurrentUser.mockResolvedValue({ id: null, name: "Anonymous" });
    await expect(s.signIn(KEY, true)).rejects.toThrow(/didn't accept/);
    getCurrentUser.mockResolvedValue(user());
    await s.signIn(KEY, false);
    expect(saved("creds")).toBeNull();
    await s.signIn(KEY, true);
    expect(saved("creds")).toEqual(KEY);
    s.setShareSignIn(true);
    s.signOut();
    expect(saved("creds")).toBeNull();
    expect(s.store.get().shareSignIn).toBe(false);
  });
});

describe("prefs", () => {
  it("keeps recent searches unique and newest first", () => {
    const p = createPrefs();
    p.addHistory("wolf");
    p.addHistory("fox");
    p.addHistory("wolf ");
    expect(p.store.get().history.map((h) => h.tags)).toEqual(["wolf", "fox"]);
    p.clearHistory();
    expect(saved("history")).toEqual([]);
  });

  it("keeps a link visit's blacklist unsaved; a blacklist edit goes to your own list too", () => {
    const p = createPrefs();
    p.syncAccount("sharer", true);
    expect(blacklistOf(p.store.get())).toBe("sharer");
    p.setSearch({ ...p.store.get().search, tags: "x" });
    expect(saved("search").blacklist ?? "").toBe("");
    expect(blacklistOf(p.store.get())).toBe("sharer");
    p.editBlacklist((b) => (b ? `${b}\nmine` : "mine"));
    expect(saved("search").blacklist).toBe("mine");
    expect(blacklistOf(p.store.get())).toBe("sharer\nmine");
    // Editing the saved list itself adopts it and ends the visit's.
    p.setSearch({ ...p.store.get().search, blacklist: "mine\nother" });
    expect(p.store.get().visitBlacklist).toBeNull();
  });

  it("keeps For You's media, date and score across visits, and nothing else", () => {
    const p = createPrefs();
    p.setForYou({ ...DEFAULT_FILTERS, order: "score", hideFaved: true, minScore: 50, media: { image: false, gif: false, video: true } });
    expect(saved("forYou")).toEqual({ media: { image: false, gif: false, video: true }, date: DEFAULT_FILTERS.date, minScore: 50 });
    const again = createPrefs().store.get().forYou;
    expect(again).toEqual({ ...DEFAULT_FILTERS, minScore: 50, media: { image: false, gif: false, video: true } });
  });

  it("reads a malformed For You setting as the default", () => {
    ls.set("e6ss:v1:forYou", JSON.stringify({ media: { image: false, gif: 0, video: "yes" }, minScore: 1.5 }));
    expect(createPrefs().store.get().forYou).toEqual(DEFAULT_FILTERS);
  });
});

describe("favs", () => {
  const post = makePost({ id: 7, stats: { fav_count: 10, is_favorited: false } });

  it("shows a toggle at once, folds it into the count, and sends the last intent", async () => {
    const add = vi.fn().mockResolvedValue(undefined);
    const remove = vi.fn().mockResolvedValue(undefined);
    const errors: string[] = [];
    const f = createFavs(() => KEY, (m) => errors.push(m), { add, remove });
    f.toggle(post);
    expect(favedOf(f.store.get(), post)).toBe(true);
    expect(favCountOf(f.store.get(), post)).toBe(11);
    f.toggle(post);
    f.toggle(post);
    await vi.waitFor(() => expect(f.store.get().changed).toBe(1));
    // The first op sent "on"; the later two settled on "on" again, so nothing more went out.
    expect(add).toHaveBeenCalledTimes(1);
    expect(remove).not.toHaveBeenCalled();
    expect(errors).toEqual([]);
    // A refetched post that already counts the fav isn't counted twice.
    expect(favCountOf(f.store.get(), { ...post, stats: { ...post.stats, fav_count: 11, is_favorited: true } })).toBe(11);
  });

  it("treats 'already favorited' as done, and rolls back a real failure", async () => {
    const errors: string[] = [];
    const add = vi.fn().mockRejectedValueOnce(new E621Error("already", 422)).mockRejectedValueOnce(new E621Error("down", 500));
    const f = createFavs(() => KEY, (m) => errors.push(m), { add, remove: vi.fn() });
    f.toggle(post);
    await vi.waitFor(() => expect(f.store.get().changed).toBe(1));
    expect(favedOf(f.store.get(), post)).toBe(true);
    const other = makePost({ id: 8 });
    f.toggle(other);
    await vi.waitFor(() => expect(errors).toHaveLength(1));
    expect(favedOf(f.store.get(), other)).toBe(false);
    expect(errors[0]).toMatch(/Favorite failed: down/);
  });

  it("asks to sign in when signed out", async () => {
    const errors: string[] = [];
    const f = createFavs(() => null, (m) => errors.push(m), { add: vi.fn(), remove: vi.fn() });
    f.toggle(post);
    await vi.waitFor(() => expect(errors).toEqual(["Sign in to favorite"]));
    expect(favedOf(f.store.get(), post)).toBe(false);
  });

  it("forgets every toggle on reset, even one still in flight", async () => {
    let finish = () => {};
    const add = vi.fn(() => new Promise<void>((r) => (finish = r)));
    const f = createFavs(() => KEY, () => {}, { add, remove: vi.fn() });
    f.toggle(post);
    await vi.waitFor(() => expect(add).toHaveBeenCalledTimes(1));
    f.reset();
    expect(favedOf(f.store.get(), post)).toBe(false);
    finish();
    await new Promise((r) => setTimeout(r, 0));
    expect(f.store.get().changed).toBe(0);
    expect(favedOf(f.store.get(), post)).toBe(false);
  });
});

describe("feed registry", () => {
  const env = { ratings: { s: true, q: true, e: true }, creds: null, user: null };
  const spec = (tags: string) => ({ kind: "search" as const, tags, filters: DEFAULT_FILTERS });

  it("shares a feed by what it searches", () => {
    const r = createRegistry(() => vi.fn().mockResolvedValue([]));
    expect(r.get(spec("wolf"), env)).toBe(r.get(spec(" wolf"), env));
    expect(r.get(spec("wolf"), env)).not.toBe(r.get(spec("wolf"), { ...env, ratings: { s: true, q: false, e: false } }));
    expect(feedKey({ ...spec(""), kind: "favorites" }, { ...env, user: { name: "fox" } })).toContain("fav:fox");
    expect(feedKey({ ...spec("a"), filters: { ...DEFAULT_FILTERS, hideFaved: true } }, { ...env, user: { name: "fox" } })).toContain(
      "-fav:fox",
    );
  });

  it("hides newly blacklisted posts in place, and starts over when a rule goes", async () => {
    const posts = [makePost({ id: 1, tagList: ["wolf"] }), makePost({ id: 2, tagList: ["wolf", "gore"] })];
    const r = createRegistry(() => vi.fn().mockResolvedValue(posts));
    const f = r.get(spec("wolf"), env);
    await f.queue.ensure(0);
    expect(f.queue.posts.map((p) => p.id)).toEqual([1, 2]);
    r.setBlacklist("gore");
    expect(f.queue.posts.map((p) => p.id)).toEqual([1]);
    expect(r.get(spec("wolf"), env)).toBe(f);
    r.setBlacklist("");
    expect(r.generation.get()).toBe(1);
    expect(r.get(spec("wolf"), env)).not.toBe(f);
  });

  it("keeps at most 8 feeds, never one on screen, and drops idle ones after 5 minutes", () => {
    let t = 0;
    const r = createRegistry(() => vi.fn().mockResolvedValue([]), () => t);
    const held = r.get(spec("held"), env);
    const release = r.retain(held);
    for (let i = 0; i < MAX_FEEDS + 3; i++) {
      t++;
      r.get(spec(`t${i}`), env);
    }
    expect(r.size()).toBe(MAX_FEEDS);
    expect(r.peek(held.key)).toBe(held);
    release();
    t += IDLE_MS + 1;
    r.get(spec("fresh"), env);
    expect(r.size()).toBe(1);
  });

  it("never evicts a kept feed; its owner drops it", () => {
    let t = 0;
    const r = createRegistry(() => vi.fn().mockResolvedValue([]), () => t);
    const queue = {
      posts: [],
      exhausted: true,
      loading: false,
      error: null,
      stats: { hidden: 0, blacklisted: 0 },
      query: "",
      ensure: async () => {},
      remove() {},
      patch() {},
      retry() {},
      setRules() {},
    };
    const kept = r.custom("ranked", () => queue, { keep: true });
    for (let i = 0; i < MAX_FEEDS + 3; i++) {
      t += IDLE_MS + 1;
      r.get(spec(`t${i}`), env);
    }
    expect(r.peek("ranked")).toBe(kept);
    r.drop("ranked");
    expect(r.peek("ranked")).toBeUndefined();
  });
});
