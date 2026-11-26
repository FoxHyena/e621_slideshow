/**
 * Scroll offsets per history entry, and the scroll lock for the player and sheets
 * (ENGINEERING.md §1). Slice 1 keeps offsets in memory; post-anchored restore with a
 * 1-day localStorage copy lands with the feeds in slice 2, when screens scroll the document.
 */

const offsets = new Map<string, number>();
let locked: { y: number; prev: Partial<CSSStyleDeclaration> } | null = null;

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
  locked = { y, prev: { position: b.position, top: b.top, left: b.left, right: b.right } };
  b.position = "fixed";
  b.top = `-${y}px`;
  b.left = "0";
  b.right = "0";
}

export function unlockScroll(): void {
  if (!locked) return;
  const { y, prev } = locked;
  locked = null;
  Object.assign(document.body.style, prev);
  window.scrollTo(0, y);
}
