/**
 * First-load history setup (ENGINEERING.md §1 boot). Runs once, before the shell's first
 * render, and only on a fresh load: a Back/Forward into entries an earlier document made
 * already carries `state.e6`, so those just re-sync.
 */
import { DEFAULT_FILTERS, encodeResults, type ResultsParams } from "@/lib/feed/filters";
import { decodeLaunch, decodeShare } from "@/lib/share";
import type { Nav } from "./history";
import { parentOf, tab, type Route } from "./routes";

/** A share or launch link on `/`, as the Results it opens; null for a plain visit. */
export function linkResults(query: string): ResultsParams | null {
  const q = new URLSearchParams(query);
  const shared = decodeShare(q);
  if (shared) {
    const { tags, ratings, ...rest } = shared.search;
    return {
      tags,
      filters: { ...DEFAULT_FILTERS, ...rest },
      link: { kind: "share", ratings, playback: shared.playback },
    };
  }
  const launch = decodeLaunch(q);
  return launch ? { tags: launch, filters: DEFAULT_FILTERS, link: { kind: "launch" } } : null;
}

let booted = false;

export function boot(nav: Nav): void {
  if (booted) return;
  booted = true;
  if (!nav.fresh) {
    // A reload with a sheet open: sheets are passing things (and some can't rebuild, like a post's
    // menu for a post not loaded yet), so close it rather than lock the page under nothing.
    if (nav.current().sheet !== null) void nav.back();
    return;
  }
  const here = nav.current().route;
  // Stamp the first entry so a reload or Back into it knows it's ours.
  nav.replace(here);
  const s = here.screen;

  if (s.kind === "root") {
    // A share or launch link plays its search: Following, then its Results (the link's settings
    // ride in the URL for this visit), then the player from the first post. Back steps down them.
    nav.replace(tab("following"), { from: null });
    const link = linkResults(s.params);
    if (!link) return;
    const results = { kind: "results", params: encodeResults(link) } as const;
    nav.push({ screen: results, play: null });
    nav.push({ screen: results, play: "first" });
    return;
  }
  if (s.kind === "notFound") return;

  // A pasted deep URL gets its parents under it (UX §3: the player over its screen, a
  // Settings page over Settings, Tune over For You, everything over Following), so in-app
  // Back and the browser's own Back both walk up the same way and stay in the app.
  const chain: Route[] = [];
  for (let r: Route | null = here; r; r = parentOf(r, null)) chain.unshift(r);
  if (chain.length === 1) return;
  nav.replace(chain[0], { from: null });
  for (const r of chain.slice(1)) nav.push(r);
}

/** Tests only. */
export function resetBoot(): void {
  booted = false;
}
