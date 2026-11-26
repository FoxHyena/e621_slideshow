/**
 * Scroll offsets per history entry, and the scroll lock for the player and sheets
 * (ENGINEERING.md §1). Slice 1 keeps offsets in memory; post-anchored restore with a
 * 1-day localStorage copy lands with the feeds in slice 2, when screens scroll the document.
 */

const offsets = new Map<string, number>();
let locked: { y: number; land: number; prev: Partial<CSSStyleDeclaration> } | null = null;

/** The document's scroll offset, or the offset it was locked at. Never 0 because of a lock. */
export function scrollY(): number {
  return locked ? locked.y : window.scrollY;
}

/** `el`: the screen's own scroller (slice 1); the document when omitted. */
export function saveOffset(key: string, el?: HTMLElement | null): void {
  offsets.set(key, el ? el.scrollTop : scrollY());
}

export function restoreOffset(key: string, el?: HTMLElement | null): void {
  const y = offsets.get(key) ?? 0;
  if (el) el.scrollTop = y;
  else if (!locked) window.scrollTo(0, y);
}

export function forgetOffset(key: string): void {
  offsets.delete(key);
}

export function isLocked(): boolean {
  return locked !== null;
}

/** Freeze the page where it is (body `position: fixed` at the current offset). */
export function lockScroll(): void {
  if (locked) return;
  const y = window.scrollY;
  const b = document.body.style;
  locked = { y, land: y, prev: { position: b.position, top: b.top, left: b.left, right: b.right } };
  b.position = "fixed";
  b.top = `-${y}px`;
  b.left = "0";
  b.right = "0";
}

export function unlockScroll(): void {
  if (!locked) return;
  const { land, prev } = locked;
  locked = null;
  Object.assign(document.body.style, prev);
  window.scrollTo(0, land);
}

/** While locked, change where the page lands when it unlocks (the player closing onto a post). */
export function setLockedY(y: number): void {
  if (locked) locked.land = Math.max(0, Math.round(y));
}

/** Where a screen's list would put a post in the middle of the view, by history entry. */
const revealers = new Map<string, (postId: number) => number | null>();

export function registerRevealer(key: string, fn: (postId: number) => number | null): () => void {
  revealers.set(key, fn);
  return () => {
    if (revealers.get(key) === fn) revealers.delete(key);
  };
}

/** The scroll offset that centres `postId` on the screen of entry `key`, if it's in its list. */
export function revealY(key: string, postId: number): number | null {
  return revealers.get(key)?.(postId) ?? null;
}
