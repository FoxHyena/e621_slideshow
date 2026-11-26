import { describe, expect, it } from "vitest";
import { createNav, type Win } from "../history";
import { activeTab, parentOf, parseRoute, routeUrl, tab } from "../routes";

describe("routes", () => {
  const p = (url: string) => {
    const u = new URL(url, "https://x.test");
    return parseRoute(u.pathname, u.search);
  };

  it("parses every screen in UX §2", () => {
    expect(p("/following").screen).toEqual({ kind: "tab", tab: "following" });
    expect(p("/for-you").screen).toEqual({ kind: "tab", tab: "for-you" });
    expect(p("/for-you/tune").screen).toEqual({ kind: "tune" });
    expect(p("/artists").screen).toEqual({ kind: "tab", tab: "artists" });
    expect(p("/settings").screen).toEqual({ kind: "settings", section: null });
    expect(p("/settings/content").screen).toEqual({ kind: "settings", section: "content" });
    expect(p("/search").screen).toEqual({ kind: "search" });
    expect(p("/search?tags=wolf+solo&o=top").screen).toEqual({ kind: "results", params: "tags=wolf+solo&o=top" });
    expect(p("/favorites").screen).toEqual({ kind: "favorites" });
    expect(p("/artist/some%20one").screen).toEqual({ kind: "artist", name: "some one" });
    expect(p("/").screen).toEqual({ kind: "root", params: "" });
    expect(p("/?v=1&tags=fox").screen).toEqual({ kind: "root", params: "v=1&tags=fox" });
  });

  it("treats unknown paths as not found", () => {
    for (const u of ["/nope", "/settings/nope", "/artist", "/artist/a/b", "/for-you/x", "/artist/%E0%A4%A"]) {
      expect(p(u).screen.kind).toBe("notFound");
    }
  });

  it("pulls play out of the params and puts it back", () => {
    const r = p("/search?tags=wolf&play=123");
    expect(r.play).toBe("123");
    expect(r.screen).toEqual({ kind: "results", params: "tags=wolf" });
    expect(routeUrl(r)).toBe("/search?tags=wolf&play=123");
    expect(routeUrl(p("/following?play=9"))).toBe("/following?play=9");
  });

  it("round-trips artist names with odd characters", () => {
    const name = "a/b c?d#e";
    const url = routeUrl({ screen: { kind: "artist", name }, play: null });
    expect(p(url).screen).toEqual({ kind: "artist", name });
  });

  it("knows each screen's parent (UX §3)", () => {
    expect(parentOf(p("/following"), null)).toBeNull();
    expect(parentOf(p("/artists"), null)).toEqual(tab("following"));
    expect(parentOf(p("/for-you/tune"), null)).toEqual(tab("for-you"));
    expect(parentOf(p("/settings/app"), null)).toEqual(tab("settings"));
    expect(parentOf(p("/artist/x"), "artists")).toEqual(tab("artists"));
    expect(parentOf(p("/artist/x"), null)).toEqual(tab("following"));
    expect(parentOf(p("/artist/x?play=4"), null)).toEqual(p("/artist/x"));
  });

  it("lights the tab a pushed screen was opened from", () => {
    expect(activeTab(p("/artist/x").screen, "artists")).toBe("artists");
    expect(activeTab(p("/settings/app").screen, null)).toBe("settings");
    expect(activeTab(p("/for-you/tune").screen, null)).toBe("for-you");
    expect(activeTab(p("/search").screen, null)).toBe("following");
  });
});

/** A browser history with real stack semantics; popstate fires on the next tick, as in browsers. */
function fakeWin(start = "/following", state: unknown = null) {
  const entries: { url: string; state: unknown }[] = [{ url: start, state }];
  let i = 0;
  const listeners = new Map<string, Set<() => void>>();
  const loc = () => new URL(entries[i].url, "https://x.test");
  const fire = (t: string) => listeners.get(t)?.forEach((f) => f());
  const win: Win & { entries: typeof entries; at: () => number; go: (n: number) => void } = {
    entries,
    at: () => i,
    history: {
      get state() {
        return entries[i].state;
      },
      pushState(s, _t, url) {
        entries.splice(i + 1);
        entries.push({ url: String(url), state: s });
        i++;
      },
      replaceState(s, _t, url) {
        entries[i] = { url: String(url ?? entries[i].url), state: s };
      },
      back() {
        win.go(-1);
      },
    },
    go(n) {
      const to = Math.max(0, Math.min(entries.length - 1, i + n));
      if (to === i) return;
      i = to;
      setTimeout(() => fire("popstate"), 0);
    },
    location: {
      get pathname() {
        return loc().pathname;
      },
      get search() {
        return loc().search;
      },
    },
    addEventListener(t, f) {
      if (!listeners.has(t)) listeners.set(t, new Set());
      listeners.get(t)!.add(f);
    },
    removeEventListener(t, f) {
      listeners.get(t)?.delete(f);
    },
    setTimeout: (f, ms) => setTimeout(f, ms),
    clearTimeout: (id) => clearTimeout(id as ReturnType<typeof setTimeout>),
  };
  return win;
}

const path = (w: ReturnType<typeof fakeWin>) => w.entries[w.at()].url;

describe("nav", () => {
  it("reports a fresh load; boot stamps it, so the next document sees it as ours", async () => {
    const { boot, resetBoot } = await import("../boot");
    resetBoot();
    const w = fakeWin("/following", { __NA: true, tree: 1 });
    const nav = createNav(w);
    expect(nav.fresh).toBe(true);
    expect(w.history.state).toEqual({ __NA: true, tree: 1 }); // nothing written during render
    boot(nav);
    // Next's keys are left out (its patched replaceState adds them back and then updates its router).
    expect(w.history.state).toEqual({ tree: 1, e6: expect.objectContaining({ depth: 0 }) });
    expect(createNav(w).fresh).toBe(false);
  });

  it("doesn't push the screen it is already on", () => {
    const w = fakeWin();
    const nav = createNav(w);
    nav.push({ screen: { kind: "search" }, play: null });
    nav.push({ screen: { kind: "search" }, play: null });
    expect(w.entries.length).toBe(2);
  });

  it("waits once more when the timeout finds the entry unchanged (a busy page still traversing)", async () => {
    const w = fakeWin();
    const nav = createNav(w);
    nav.push({ screen: { kind: "search" }, play: null });
    nav.push({ screen: { kind: "artist", name: "a" }, play: null });
    const realBack = w.history.back;
    w.history.back = () => setTimeout(() => realBack(), 600); // popstate lands after the first timeout
    await nav.back();
    expect(path(w)).toBe("/search");
    expect(nav.current().route.screen).toEqual({ kind: "search" });
  });

  it("push goes deeper and back pops through history", async () => {
    const w = fakeWin();
    const nav = createNav(w);
    nav.push({ screen: { kind: "artist", name: "fox" }, play: null });
    expect(path(w)).toBe("/artist/fox");
    expect(nav.current()).toMatchObject({ depth: 1, from: "following" });
    await nav.back();
    expect(path(w)).toBe("/following");
    expect(nav.current().route.screen).toEqual({ kind: "tab", tab: "following" });
  });

  it("back on a pasted URL replaces it with its parent instead of leaving", async () => {
    const w = fakeWin("/artist/fox");
    const nav = createNav(w);
    await nav.back();
    expect(w.entries.length).toBe(1);
    expect(path(w)).toBe("/following");
  });

  it("ignores a second back while one is in flight", async () => {
    const w = fakeWin();
    const nav = createNav(w);
    nav.push({ screen: { kind: "search" }, play: null });
    nav.push({ screen: { kind: "artist", name: "fox" }, play: null });
    const a = nav.back();
    const b = nav.back();
    await Promise.all([a, b]);
    expect(path(w)).toBe("/search");
  });

  it("recovers when no popstate arrives", async () => {
    const w = fakeWin();
    const nav = createNav(w);
    nav.push({ screen: { kind: "search" }, play: null });
    // A browser that moves without telling us (skipped entry, bfcache quirk).
    w.history.back = () => {};
    await nav.back();
    // The timeout re-synced from the address bar, so the next back isn't locked out.
    expect(nav.current().route.screen).toEqual({ kind: "search" });
  });

  it("tab taps: leaving Following adds one entry, other tabs replace it", async () => {
    const w = fakeWin();
    const nav = createNav(w);
    await nav.goTab("artists");
    expect(w.entries.map((e) => e.url)).toEqual(["/following", "/artists"]);
    await nav.goTab("settings");
    expect(w.entries.map((e) => e.url)).toEqual(["/following", "/settings"]);
    await nav.goTab("following");
    expect(path(w)).toBe("/following");
    expect(w.at()).toBe(0);
  });

  it("tab tap pops pushed screens first, and the current root's tab asks for scroll-to-top", async () => {
    const w = fakeWin();
    const nav = createNav(w);
    await nav.goTab("artists");
    nav.push({ screen: { kind: "artist", name: "a" }, play: null });
    nav.push({ screen: { kind: "artist", name: "b" }, play: null });
    expect(await nav.goTab("artists")).toBe("moved");
    expect(path(w)).toBe("/artists");
    expect(await nav.goTab("artists")).toBe("top");
  });

  it("runs tab taps one at a time, so a double tap can't race its own pops", async () => {
    const w = fakeWin();
    const nav = createNav(w);
    await nav.goTab("artists");
    nav.push({ screen: { kind: "artist", name: "a" }, play: null });
    nav.push({ screen: { kind: "artist", name: "b" }, play: null });
    const [a, b] = await Promise.all([nav.goTab("settings"), nav.goTab("settings")]);
    expect([a, b]).toEqual(["moved", "top"]);
    expect(w.entries.slice(0, w.at() + 1).map((e) => e.url)).toEqual(["/following", "/settings"]);
    expect(nav.current().route.screen).toEqual({ kind: "settings", section: null });
  });

  it("ignores a push while a Back is landing", async () => {
    const w = fakeWin();
    const nav = createNav(w);
    nav.push({ screen: { kind: "search" }, play: null });
    const back = nav.back();
    nav.push({ screen: { kind: "favorites" }, play: null });
    await back;
    expect(path(w)).toBe("/following");
    expect(nav.store.get().index).toBe(0);
  });

  it("keeps keys other code put on the entry when replacing", () => {
    const w = fakeWin("/following", { __NA: true, artistFeed: 3 });
    const nav = createNav(w);
    nav.replace(tab("following"));
    expect(w.history.state).toMatchObject({ artistFeed: 3, e6: expect.anything() });
  });

  it("re-syncs to an entry it knows on popstate, and rebuilds for one from an older document", async () => {
    const w = fakeWin();
    const nav = createNav(w);
    nav.replace(nav.current().route); // boot's stamp
    nav.push({ screen: { kind: "search" }, play: null });
    w.go(-1);
    await new Promise((r) => setTimeout(r, 5));
    expect(nav.store.get().index).toBe(0);
    w.go(1);
    await new Promise((r) => setTimeout(r, 5));
    expect(nav.store.get().index).toBe(1);
    // A reload: a new navigator over the same history keeps depth from state.e6.
    const after = createNav(w);
    expect(after.current()).toMatchObject({ depth: 1, route: { screen: { kind: "search" } } });
  });
});

describe("boot", () => {
  const urls = (w: ReturnType<typeof fakeWin>) => w.entries.map((e) => e.url);

  it("sends / to /following, keeping a legacy link's params", async () => {
    const { boot, resetBoot } = await import("../boot");
    resetBoot();
    const w = fakeWin("/?tags=wolf");
    boot(createNav(w));
    expect(urls(w)).toEqual(["/following?tags=wolf"]);
  });

  it("puts /following under a pasted deep URL, and the screen under its player", async () => {
    const { boot, resetBoot } = await import("../boot");
    resetBoot();
    const w = fakeWin("/artist/fox?play=12");
    const nav = createNav(w);
    boot(nav);
    expect(urls(w)).toEqual(["/following", "/artist/fox", "/artist/fox?play=12"]);
    await nav.back();
    expect(path(w)).toBe("/artist/fox");
    await nav.back();
    expect(path(w)).toBe("/following");
  });

  it("walks a pasted page's parents: a Settings page over Settings, Tune over For You", async () => {
    const { boot, resetBoot } = await import("../boot");
    resetBoot();
    let w = fakeWin("/settings/content");
    boot(createNav(w));
    expect(urls(w)).toEqual(["/following", "/settings", "/settings/content"]);
    resetBoot();
    w = fakeWin("/for-you/tune");
    boot(createNav(w));
    expect(urls(w)).toEqual(["/following", "/for-you", "/for-you/tune"]);
  });

  it("drops root params that aren't a share or launch link", async () => {
    const { boot, resetBoot } = await import("../boot");
    resetBoot();
    const w = fakeWin("/?utm=x");
    boot(createNav(w));
    expect(urls(w)).toEqual(["/following"]);
  });

  it("leaves Back/Forward into an earlier document's entries alone", async () => {
    const { boot, resetBoot } = await import("../boot");
    resetBoot();
    const w = fakeWin("/artists", { e6: { key: "k", depth: 1, from: null } });
    boot(createNav(w));
    expect(urls(w)).toEqual(["/artists"]);
  });

  it("leaves an unknown URL in place (Back from it goes home)", async () => {
    const { boot, resetBoot } = await import("../boot");
    resetBoot();
    const w = fakeWin("/nope");
    const nav = createNav(w);
    boot(nav);
    expect(urls(w)).toEqual(["/nope"]);
    await nav.back();
    expect(urls(w)).toEqual(["/following"]);
  });
});
