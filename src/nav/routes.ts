/**
 * URLs ⇄ routes (UX.md §2). Pure: no window access, so every rule here is unit-tested.
 */

export type Tab = "following" | "for-you" | "artists" | "settings";
export const TABS: Tab[] = ["following", "for-you", "artists", "settings"];

export const SETTINGS_SECTIONS = ["account", "content", "slideshow", "for-you", "app"] as const;
export type SettingsSection = (typeof SETTINGS_SECTIONS)[number];

export type Screen =
  | { kind: "tab"; tab: Exclude<Tab, "settings"> }
  | { kind: "settings"; section: SettingsSection | null }
  | { kind: "tune" }
  | { kind: "search" }
  | { kind: "results"; params: string }
  | { kind: "favorites"; params: string }
  | { kind: "artist"; name: string }
  | { kind: "root"; params: string }
  | { kind: "notFound"; path: string };

export interface Route {
  screen: Screen;
  /** `?play=<postId>` (or `first` from a link), the player over the screen */
  play: string | null;
}

/** Split a path + search into a route. `params` keep their order, minus `play`. */
export function parseRoute(pathname: string, search: string): Route {
  const q = new URLSearchParams(search);
  const play = q.get("play");
  q.delete("play");
  const rest = q.toString();
  const path = pathname.replace(/\/+$/, "") || "/";
  const parts = path.split("/").filter(Boolean);
  const screen = parseScreen(path, parts, rest);
  return { screen, play: play || null };
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
      return parts.length === 2 && SETTINGS_SECTIONS.includes(section) ? { kind: "settings", section } : notFound(path);
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
      return name ? { kind: "artist", name } : notFound(path);
    }
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
      return `/artist/${encodeURIComponent(s.name)}`;
    case "root":
      return s.params ? `/?${s.params}` : "/";
    case "notFound":
      return s.path;
  }
}

export function routeUrl(r: Route): string {
  const base = screenPath(r.screen);
  if (!r.play) return base;
  return `${base}${base.includes("?") ? "&" : "?"}play=${encodeURIComponent(r.play)}`;
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
  if (r.play) return { screen: r.screen, play: null };
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
