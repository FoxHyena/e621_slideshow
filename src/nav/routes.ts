/**
 * URLs ⇄ routes (UX.md §2). Pure: no window access, so every rule here is unit-tested.
 */

/** The sign-in sheet's name (nav.openSheet): the shell shows it over any screen. */
export const SIGN_IN_SHEET = "sign-in";

export type Tab = "following" | "for-you" | "artists" | "settings";
export const TABS: Tab[] = ["following", "for-you", "artists", "settings"];

export const SETTINGS_SECTIONS = ["account", "content", "slideshow", "for-you", "app"] as const;
/**
 * `classic`: the old settings-panel app, kept at `/settings/classic` (no row leads there) while its
 * e2e flows are ported; the Settings list is SETTINGS_SECTIONS.
 */
export type SettingsSection = (typeof SETTINGS_SECTIONS)[number] | "classic";
const ALL_SECTIONS: readonly string[] = [...SETTINGS_SECTIONS, "classic"];

export type Screen =
  | { kind: "tab"; tab: Exclude<Tab, "settings"> }
  | { kind: "settings"; section: SettingsSection | null }
  | { kind: "tune" }
  | { kind: "search" }
  | { kind: "results"; params: string }
  | { kind: "favorites"; params: string }
  /** `params`: the chips (the same filter params as Favorites), left out when none is set */
  | { kind: "artist"; name: string; params?: string }
  /** `/post/<number>`: one post on its own page (DESIGN.md "A post on its own") */
  | { kind: "post"; id: number }
  | { kind: "root"; params: string }
  | { kind: "notFound"; path: string };

export interface Route {
  screen: Screen;
  /** `?play=<postId>` (or `first` from a link), the player over the screen */
  play: string | null;
  /** `?view=<postId>`, the picture viewer over the screen (DESIGN.md "A post on its own") */
  view?: string | null;
}

/** Split a path + search into a route. `params` keep their order, minus `play`. */
export function parseRoute(pathname: string, search: string): Route {
  const q = new URLSearchParams(search);
  const play = q.get("play");
  const view = q.get("view");
  q.delete("play");
  q.delete("view");
  const rest = q.toString();
  const path = pathname.replace(/\/+$/, "") || "/";
  const parts = path.split("/").filter(Boolean);
  const screen = parseScreen(path, parts, rest);
  // the player wins if a URL somehow names both
  return !play && view && /^\d+$/.test(view) ? { screen, play: null, view } : { screen, play: play || null };
}

function parseScreen(path: string, parts: string[], params: string): Screen {
  switch (parts[0]) {
    case undefined:
      return { kind: "root", params };
    case "following":
    case "artists":
      return parts.length === 1 ? { kind: "tab", tab: parts[0] } : notFound(path);
    case "for-you":
      if (parts.length === 1) return { kind: "tab", tab: "for-you" };
      return parts.length === 2 && parts[1] === "tune" ? { kind: "tune" } : notFound(path);
    case "settings": {
      if (parts.length === 1) return { kind: "settings", section: null };
      const section = parts[1] as SettingsSection;
      return parts.length === 2 && ALL_SECTIONS.includes(section) ? { kind: "settings", section } : notFound(path);
    }
    case "search":
      if (parts.length !== 1) return notFound(path);
      return new URLSearchParams(params).get("tags") !== null ? { kind: "results", params } : { kind: "search" };
    case "favorites":
      return parts.length === 1 ? { kind: "favorites", params } : notFound(path);
    case "artist": {
      if (parts.length !== 2) return notFound(path);
      let name: string;
      try {
        name = decodeURIComponent(parts[1]);
      } catch {
        return notFound(path);
      }
      if (!name) return notFound(path);
      return params ? { kind: "artist", name, params } : { kind: "artist", name };
    }
    case "post":
      return parts.length === 2 && /^[1-9]\d{0,9}$/.test(parts[1]) ? { kind: "post", id: Number(parts[1]) } : notFound(path);
    default:
      return notFound(path);
  }
}

const notFound = (path: string): Screen => ({ kind: "notFound", path });

export function screenPath(s: Screen): string {
  switch (s.kind) {
    case "tab":
      return `/${s.tab}`;
    case "settings":
      return s.section ? `/settings/${s.section}` : "/settings";
    case "tune":
      return "/for-you/tune";
    case "search":
      return "/search";
    case "results":
      return `/search?${s.params}`;
    case "favorites":
      return s.params ? `/favorites?${s.params}` : "/favorites";
    case "artist":
      return `/artist/${encodeURIComponent(s.name)}${s.params ? `?${s.params}` : ""}`;
    case "post":
      return `/post/${s.id}`;
    case "root":
      return s.params ? `/?${s.params}` : "/";
    case "notFound":
      return s.path;
  }
}

export function routeUrl(r: Route): string {
  const base = screenPath(r.screen);
  const [k, v] = r.play ? ["play", r.play] : r.view ? ["view", r.view] : [null, null];
  if (!k || !v) return base;
  return `${base}${base.includes("?") ? "&" : "?"}${k}=${encodeURIComponent(v)}`;
}

/** The tab a screen belongs to when it is that tab's root, else null (a pushed screen). */
export function tabRoot(s: Screen): Tab | null {
  if (s.kind === "tab") return s.tab;
  if (s.kind === "settings" && s.section === null) return "settings";
  return null;
}

/** Which tab button lights up: the root's own tab, or the tab a pushed screen was opened from. */
export function activeTab(s: Screen, openedFrom: Tab | null): Tab {
  return tabRoot(s) ?? (s.kind === "settings" ? "settings" : s.kind === "tune" ? "for-you" : (openedFrom ?? "following"));
}

/**
 * Where Back goes when there's no in-app entry below (a pasted URL, a reload): UX §3.
 * Returns null at a tab root (nothing above it in the app).
 */
export function parentOf(r: Route, openedFrom: Tab | null): Route | null {
  if (r.play || r.view) return { screen: r.screen, play: null };
  const s = r.screen;
  switch (s.kind) {
    case "tab":
      return s.tab === "following" ? null : tab("following");
    case "settings":
      return s.section ? { screen: { kind: "settings", section: null }, play: null } : tab("following");
    case "tune":
      return tab("for-you");
    case "search":
    case "results":
    case "favorites":
    case "artist":
    case "post":
    case "notFound":
    case "root":
      return tab(openedFrom ?? "following");
  }
}

export function tab(t: Tab): Route {
  return { screen: t === "settings" ? { kind: "settings", section: null } : { kind: "tab", tab: t }, play: null };
}

/** A key that names "the same screen" for keeping it mounted (ignores `play`). */
export function screenKey(s: Screen): string {
  return screenPath(s);
}
