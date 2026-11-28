"use client";

/**
 * What a popover hangs from (DESIGN.md "On a computer", "Popover"): the control the last click,
 * key press or right-click came from, and where the pointer was. Every sheet opens from an onClick
 * (or a tile's contextmenu), so the event that opened it passed through here first. Read when the
 * sheet mounts; a sheet that mounts with nothing fresh here (a reload onto an open sheet) is a
 * dialog in the middle instead.
 */

export interface Opener {
  el: Element | null;
  /** the box a popover lines up with when it was pressed (in case it has gone since): see popEdge */
  rect: DOMRect;
  /** a ⋯: line up right edges */
  end: boolean;
  /** the pointer, for a right-click; null for a click or a key */
  point: { x: number; y: number } | null;
  at: number;
}

const FRESH_MS = 1500;
const CONTROL = "button,a[href],[role=button],[role=menuitem],[tabindex]";

let last: Opener | null = null;
let started = false;

function note(e: MouseEvent) {
  const t = e.target instanceof Element ? e.target : null;
  const el = t?.closest(CONTROL) ?? t;
  if (!el) return;
  // a right-click by the menu key has no pointer of its own (0, 0): hang it from the element
  const point = e.type === "contextmenu" && (e.clientX !== 0 || e.clientY !== 0) ? { x: e.clientX, y: e.clientY } : null;
  const edge = popEdge(el);
  last = { el, rect: (edge.box ?? el).getBoundingClientRect(), end: edge.end, point, at: performance.now() };
}

/** Starts listening (capture, so it runs before the opener's own handler). */
export function watchPresses(): void {
  if (started || typeof window === "undefined") return;
  started = true;
  window.addEventListener("click", note, true);
  window.addEventListener("contextmenu", note, true);
  // a key opens nothing at a place of its own: a sheet a shortcut opens is a dialog (Enter and Space on
  // a button still come through as its click, after this)
  window.addEventListener(
    "keydown",
    () => {
      last = null;
    },
    true,
  );
}

/** The opener of a sheet mounting now, if one was pressed just before. */
export function takeOpener(): Opener | null {
  return last && performance.now() - last.at < FRESH_MS ? last : null;
}

const GAP = 8;
const INSET = 8;

/**
 * What a popover lines up with. A ⋯ (`data-pop-end`) ends its bar, so its popover lines up right
 * edges: with the tools capsule when the ⋯ is in one, else with the ⋯ itself (DESIGN.md "On a
 * computer", Popover, 2026-11-27).
 */
export function popEdge(el: Element | null): { box: Element | null; end: boolean } {
  const end = el?.closest("[data-pop-end]") ?? null;
  return end ? { box: end.closest(".tools") ?? end, end: true } : { box: el, end: false };
}

/**
 * Where a popover of `w` by `h` goes: 8 below the opener with left edges lined up (right edges when
 * it would leave the window, or always for a ⋯), or above it when there's no room below and more
 * above. At a pointer: its top left corner at the pointer, moved in to stay inside the window.
 */
export function placePopover(o: Opener, w: number, h: number, vw: number, vh: number): { left: number; top: number; maxHeight: number } {
  if (o.point) {
    const left = Math.min(Math.max(INSET, o.point.x), vw - INSET - w);
    const top = Math.min(Math.max(INSET, o.point.y), Math.max(INSET, vh - INSET - h));
    return { left, top, maxHeight: vh - top - INSET };
  }
  // read again if it is still there (the page may have moved); else as it was when pressed
  const box = o.el?.isConnected ? popEdge(o.el).box : null;
  const r = box ? box.getBoundingClientRect() : o.rect;
  let left = o.end ? r.right - w : r.left;
  if (left + w > vw - INSET) left = r.right - w;
  left = Math.min(Math.max(INSET, left), vw - INSET - w);
  const below = vh - INSET - (r.bottom + GAP);
  const above = r.top - GAP - INSET;
  if (h > below && above > below) {
    const top = Math.max(INSET, r.top - GAP - h);
    return { left, top, maxHeight: r.top - GAP - top };
  }
  const top = r.bottom + GAP;
  return { left, top, maxHeight: below };
}
