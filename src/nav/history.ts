/**
 * In-app navigation over the native History API (ENGINEERING.md §1, UX.md §3).
 *
 * Next 16 patches pushState/replaceState and merges its own keys into the state object,
 * so ours live under `state.e6` and survive. The shell reads the location from this
 * store, never from usePathname, and nothing here triggers a Next navigation.
 */
import { createStore, type Store } from "@/state/store";
import {
  activeTab,
  parentOf,
  parseRoute,
  routeUrl,
  screenKey,
  tab as tabRoute,
  tabRoot,
  type Route,
  type Tab,
} from "./routes";

export interface EntryState {
  /** stable id of this history entry, for keeping its screen and its opener */
  key: string;
  /** in-app entries below this one; 0 = nothing of ours to go back to */
  depth: number;
  /** the tab a pushed screen was opened from */
  from: Tab | null;
  /** a sheet open over the screen: same URL, its own entry, so Back closes it */
  sheet: string | null;
}

export interface Entry extends EntryState {
  route: Route;
}

export interface NavState {
  /** our mirror of the session history, oldest first; `index` is the current entry */
  stack: Entry[];
  index: number;
  /** what made the last change: drives the push/back motion (a gesture or browser Back is "pop") */
  cause: "init" | "push" | "replace" | "back" | "pop";
}

export interface Win {
  history: Pick<History, "state" | "pushState" | "replaceState" | "back"> & { scrollRestoration?: ScrollRestoration };
  location: Pick<Location, "pathname" | "search">;
  addEventListener(type: "popstate" | "pageshow", fn: () => void): void;
  removeEventListener(type: "popstate" | "pageshow", fn: () => void): void;
  setTimeout(fn: () => void, ms: number): unknown;
  clearTimeout(id: unknown): void;
}

/** How long Back waits for a popstate before re-syncing from the address bar. */
export const POP_TIMEOUT_MS = 400;

let keySeq = 0;
const newKey = () => `${Date.now().toString(36)}-${(++keySeq).toString(36)}`;

function readE6(state: unknown): EntryState | null {
  const e6 = (state as { e6?: unknown } | null)?.e6 as Partial<EntryState> | undefined;
  if (!e6 || typeof e6.key !== "string" || typeof e6.depth !== "number") return null;
  return {
    key: e6.key,
    depth: e6.depth,
    from: (e6.from as Tab | null) ?? null,
    sheet: typeof e6.sheet === "string" ? e6.sheet : null,
  };
}

/**
 * The current entry's state without Next's keys. Next's patched push/replaceState only
 * updates its router (canonicalUrl, usePathname) when the data has no `__NA`, and copies
 * its own keys back in either way, so state we write must never carry them.
 */
/** The same screen, whatever post the player is on. */
const sameScreenUrl = (a: Route, b: Route) => routeUrl({ screen: a.screen, play: null }) === routeUrl({ screen: b.screen, play: null });

export function ownState(state: unknown = history.state): Record<string, unknown> {
  const rest = { ...((state ?? {}) as Record<string, unknown>) };
  delete rest.__NA;
  delete rest._N;
  delete rest.__PRIVATE_NEXTJS_INTERNALS_TREE;
  return rest;
}

/** The player and sheets sit over a screen instead of replacing it. */
export const isOverlay = (e: Entry): boolean => e.route.play !== null || e.sheet !== null;

/**
 * The entry whose screen shows under stack[i]: itself, or for an overlay the nearest entry below
 * it for the same screen with no overlay. An overlay with nothing under it (a reload) shows its own.
 */
export function baseIndex(stack: readonly Entry[], i: number): number {
  if (!isOverlay(stack[i])) return i;
  const key = screenKey(stack[i].route.screen);
  for (let j = i - 1; j >= 0; j--) {
    if (screenKey(stack[j].route.screen) !== key) break;
    if (!isOverlay(stack[j])) return j;
  }
  return i;
}

export interface Nav {
  store: Store<NavState>;
  current(): Entry;
  /** true when the current entry has no e6 state, i.e. a fresh load: boot stamps and may rewrite history */
  fresh: boolean;
  push(route: Route, opts?: { from?: Tab | null }): void;
  /** Open a sheet over the current screen: a same-URL entry, so Back (or a swipe) closes it. */
  openSheet(name: string): void;
  replace(route: Route, opts?: { from?: Tab | null }): void;
  /** UX §3 helper: history.back() if there's an in-app entry below, else replace with the parent */
  back(opts?: { gesture?: boolean }): Promise<void>;
  /** tab bar tap; resolves to "top" when it was the current tab's root (caller scrolls to top) */
  goTab(t: Tab): Promise<"top" | "moved">;
  dispose(): void;
}

export function createNav(win: Win): Nav {
  const here = (): Route => parseRoute(win.location.pathname, win.location.search);
  const existing = readE6(win.history.state);
  const fresh = existing === null;
  const first: Entry = existing
    ? { ...existing, route: here() }
    : { key: newKey(), depth: 0, from: null, sheet: null, route: here() };
  // A fresh entry is stamped by boot (a layout effect): writing here would run during render.

  const store = createStore<NavState>({ stack: [first], index: 0, cause: "init" });
  const current = () => {
    const s = store.get();
    return s.stack[s.index];
  };

  function write(kind: "push" | "replace", e: Entry) {
    const prev = ownState(win.history.state);
    // Keep keys other code put on this entry (the legacy app's) when replacing; Next adds its own.
    const e6 = { key: e.key, depth: e.depth, from: e.from, ...(e.sheet ? { sheet: e.sheet } : {}) };
    const data = kind === "replace" ? { ...prev, e6 } : { e6 };
    const url = routeUrl(e.route);
    if (kind === "push") win.history.pushState(data, "", url);
    else win.history.replaceState(data, "", url);
  }

  let pending: { resolve: () => void; timer: unknown; gesture: boolean; from: string; rearmed: boolean } | null = null;
  /** No popstate yet: if the entry hasn't changed, a busy page may still be traversing, so wait once more. */
  const onPopTimeout = () => {
    if (pending && !pending.rearmed && readE6(win.history.state)?.key === pending.from) {
      pending.rearmed = true;
      pending.timer = win.setTimeout(onPopTimeout, POP_TIMEOUT_MS);
      return;
    }
    sync();
  };
  /**
   * Taps that came while a Back was on its way (a chip tapped again as its menu closes): they'd write
   * onto the entry the browser is leaving, so they wait for the Back to land, then run in order.
   */
  let later: (() => void)[] = [];
  let disposed = false;
  const settle = () => {
    if (!pending) return;
    win.clearTimeout(pending.timer);
    const p = pending;
    pending = null;
    p.resolve();
    const run = later;
    later = [];
    if (!disposed) for (const f of run) f();
  };

  /** Bring the store in line with the address bar and history.state (popstate, pageshow, timeout). */
  function sync() {
    const e6 = readE6(win.history.state);
    let route = here();
    const { stack, index } = store.get();
    const was = stack[index];
    const cause = pending && !pending.gesture ? "back" : "pop";
    if (e6) {
      const at = stack.findIndex((x) => x.key === e6.key);
      if (at >= 0) {
        // Closing a sheet the player moved on under: the entry beneath takes the post it moved to,
        // so Back doesn't land on the one it left.
        if (was?.sheet && at === index - 1 && sameScreenUrl(was.route, route) && routeUrl(was.route) !== routeUrl(route)) {
          route = was.route;
          write("replace", { ...stack[at], route });
        }
        const next = stack.slice();
        next[at] = { ...stack[at], route };
        store.set({ stack: next, index: at, cause });
      } else {
        // An entry from before a reload: rebuild what we can (it and nothing above it).
        store.set({ stack: [{ ...e6, route }], index: 0, cause });
      }
    } else {
      // An entry nobody stamped (another document's): treat it as a root and stamp it.
      const e: Entry = { key: newKey(), depth: 0, from: null, sheet: null, route };
      write("replace", e);
      store.set({ stack: [e], index: 0, cause });
    }
    settle();
  }
  /** Tab taps run one at a time, each after the last one's pops have landed. */
  let tabQueue: Promise<unknown> = Promise.resolve();
  const onPop = () => sync();
  win.addEventListener("popstate", onPop);
  win.addEventListener("pageshow", onPop);
  if (win.history.scrollRestoration !== undefined) win.history.scrollRestoration = "manual";

  function add(e: Entry) {
    write("push", e);
    const { stack, index } = store.get();
    store.set({ stack: [...stack.slice(0, index + 1), e], index: index + 1, cause: "push" });
  }

  const nav: Nav = {
    store,
    current,
    fresh,
    push(route, opts) {
      if (pending) return void later.push(() => nav.push(route, opts));
      const cur = current();
      // A double tap, or Search while on Search: one entry, not two.
      if (routeUrl(route) === routeUrl(cur.route) && !cur.sheet) return;
      const from = opts && opts.from !== undefined ? opts.from : (tabRoot(cur.route.screen) ?? cur.from);
      add({ key: newKey(), depth: cur.depth + 1, from, sheet: null, route });
    },
    openSheet(name) {
      if (pending) return void later.push(() => nav.openSheet(name));
      const cur = current();
      if (cur.sheet === name) return;
      add({ key: newKey(), depth: cur.depth + 1, from: cur.from, sheet: name, route: cur.route });
    },
    replace(route, opts) {
      if (pending) return void later.push(() => nav.replace(route, opts));
      const cur = current();
      // The player moving on under Post info (next, a blacklisted post): the sheet stays open.
      const sheet = cur.sheet && sameScreenUrl(route, cur.route) ? cur.sheet : null;
      const e: Entry = { ...cur, route, from: opts?.from !== undefined ? opts.from : cur.from, sheet };
      write("replace", e);
      // Entries above stay: replaceState leaves the browser's Forward entries in place.
      const { stack, index } = store.get();
      const next = stack.slice();
      next[index] = e;
      store.set({ stack: next, index, cause: "replace" });
    },
    back(opts) {
      if (pending) return Promise.resolve();
      const cur = current();
      if (cur.depth > 0) {
        return new Promise<void>((resolve) => {
          pending = {
            resolve,
            timer: win.setTimeout(onPopTimeout, POP_TIMEOUT_MS),
            gesture: opts?.gesture === true,
            from: cur.key,
            rearmed: false,
          };
          win.history.back();
        });
      }
      const parent = parentOf(cur.route, cur.from);
      if (parent) nav.replace(parent, { from: null });
      return Promise.resolve();
    },
    goTab(t) {
      const run = tabQueue.then(() => goTabNow(t));
      tabQueue = run.catch(() => {});
      return run;
    },
    dispose() {
      disposed = true;
      win.removeEventListener("popstate", onPop);
      win.removeEventListener("pageshow", onPop);
      settle();
    },
  };

  async function goTabNow(t: Tab): Promise<"top" | "moved"> {
    const start = current();
    const startTab = activeTab(start.route.screen, start.from);
    if (startTab === t && tabRoot(start.route.screen) === t && !isOverlay(start)) return "top";
    // Pop pushed screens one at a time, each awaited, so nothing races the next write.
    for (let guard = 0; guard < 50; guard++) {
      const c = current();
      if (tabRoot(c.route.screen) && !isOverlay(c)) break;
      const before = c.key;
      if (c.depth === 0) {
        nav.replace(parentOf(c.route, c.from) ?? tabRoute("following"), { from: null });
        break;
      }
      await nav.back();
      if (current().key === before) break; // the browser didn't move; don't spin
    }
    const c = current();
    const at = tabRoot(c.route.screen);
    if (at === t) return "moved";
    if (t === "following") {
      if (c.depth > 0) await nav.back();
      if (tabRoot(current().route.screen) !== "following") nav.replace(tabRoute("following"), { from: null });
    } else if (at === "following") {
      nav.push(tabRoute(t), { from: null });
    } else {
      nav.replace(tabRoute(t), { from: null });
    }
    return "moved";
  }
  return nav;
}

/** The sheet open on the current entry, read live: an apply that lands after Back must not go back again. */
export function openSheetName(): string | null {
  const s = getNav().store.get();
  return s.stack[s.index]?.sheet ?? null;
}

let instance: Nav | null = null;
/** The app's one navigator; created on first use in the browser. */
export function getNav(): Nav {
  if (!instance) instance = createNav(window);
  return instance;
}
