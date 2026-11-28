/**
 * Where a settings row's value menu goes (DESIGN.md "Menu", "A row's value", designer 2026-11-27): 8
 * under the row, its right edge on the row's content edge (inside the row's padding); 8 above the row
 * instead when it doesn't fit below and there's real room above (a row at the window's foot, Quick
 * settings' last row on a phone). Kept out of Dropdown so the feed's first load doesn't carry it.
 */
import type { Place } from "./Dropdown";

const INSET = 16;
const GAP = 8;

export function underRow(el: HTMLElement | null, box: HTMLDivElement | null, w: number, vw: number): Place {
  const vh = window.innerHeight;
  if (!el) return { top: 96, left: INSET, maxHeight: vh - 96 - INSET };
  const r = el.getBoundingClientRect();
  const right = r.right - parseFloat(getComputedStyle(el).paddingRight);
  const left = Math.min(Math.max(INSET, right - w), vw - INSET - w);
  // measured at its own width, so the first pass and the next frame agree
  if (box) box.style.width = `${w}px`;
  const h = box?.scrollHeight ?? 0;
  const below = vh - INSET - (r.bottom + GAP);
  const above = r.top - GAP - INSET;
  if (h > below && above > below && above >= Math.min(h, 160)) {
    const top = Math.max(INSET, r.top - GAP - h);
    return { top, left, maxHeight: r.top - GAP - top, up: true };
  }
  const top = r.bottom + GAP;
  return { top, left, maxHeight: Math.max(160, vh - top - INSET) };
}
