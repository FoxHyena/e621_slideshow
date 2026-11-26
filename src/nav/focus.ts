/**
 * Focus on navigation (UX §9.2): a push moves focus to the new screen's heading; Back
 * returns it to whatever opened the screen, or to the heading if that's gone.
 */
import type { Nav } from "./history";

const openers = new Map<string, Element>();

/** Remember the focused element for every entry we push, before the old screen hides. */
export function trackOpeners(nav: Nav): () => void {
  return nav.store.subscribe(() => {
    const next = nav.store.get();
    if (next.cause === "push") {
      const el = document.activeElement;
      if (el && el !== document.body) openers.set(next.stack[next.index].key, el);
    }
    for (const k of openers.keys()) if (!next.stack.some((e) => e.key === k)) openers.delete(k);
  });
}

function heading(screen: HTMLElement | null): HTMLElement | null {
  return screen?.querySelector<HTMLElement>("h1[tabindex='-1']") ?? null;
}

/** After a push: focus the new screen's heading. */
export function focusScreen(screen: HTMLElement | null): void {
  // The screen put focus somewhere itself (Search's field, autofocused to raise the keyboard).
  if (screen?.contains(document.activeElement)) return;
  const h = heading(screen);
  if (h || !screen) return h?.focus({ preventScroll: true });
  // A screen whose code is still loading (lazy): focus its heading when it lands, unless the
  // user has moved focus meanwhile.
  const before = document.activeElement;
  const mo = new MutationObserver(() => {
    const h = heading(screen);
    if (!h) return;
    stop();
    if (document.activeElement === before || document.activeElement === document.body) h.focus({ preventScroll: true });
  });
  const t = setTimeout(() => stop(), 5000);
  const stop = () => {
    mo.disconnect();
    clearTimeout(t);
  };
  mo.observe(screen, { childList: true, subtree: true });
}

/** After a Back from `leftKey`: restore its opener, else the heading of the screen now shown. */
export function restoreFocus(leftKey: string, screen: HTMLElement | null): void {
  // Kept (not deleted): Forward then Back again restores the same opener.
  const el = openers.get(leftKey);
  if (el instanceof HTMLElement && el.isConnected && screen?.contains(el)) el.focus({ preventScroll: true });
  else focusScreen(screen);
}
