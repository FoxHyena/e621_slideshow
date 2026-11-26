/**
 * First-load history setup (ENGINEERING.md §1 boot). Runs once, before the shell's first
 * render, and only on a fresh load: a Back/Forward into entries an earlier document made
 * already carries `state.e6`, so those just re-sync.
 */
import { decodeLaunch, decodeShare } from "@/lib/share";
import type { Nav } from "./history";
import { parentOf, tab, type Route } from "./routes";

let booted = false;

export function boot(nav: Nav): void {
  if (booted) return;
  booted = true;
  if (!nav.fresh) return;
  const here = nav.current().route;
  // Stamp the first entry so a reload or Back into it knows it's ours.
  nav.replace(here);
  const s = here.screen;

  if (s.kind === "root") {
    // Slice 1: the legacy home still decodes share and launch links from the query, so a
    // link's params ride along onto /following and the legacy app strips them once read.
    const q = new URLSearchParams(s.params);
    const link = decodeShare(q) !== null || decodeLaunch(q) !== null;
    nav.replace(tab("following"), { from: null, legacyParams: link ? s.params : undefined });
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
