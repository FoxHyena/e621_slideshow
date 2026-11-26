/**
 * Tuck (DESIGN.md "Scroll physics: Tuck"): cards respond to the two edges they pass. Coming in
 * above the tab bar, a card's top grows from 95% and rises its last 16 px; leaving under the top
 * edge, its end shrinks to 95% and dims to 55%. A function of position only, so it runs the same
 * both ways and stops the moment the scroll does. Ported from the approved mock (`tuck`).
 *
 * Positions come from the feed's layout (known before anything loads), so scrolling never
 * measures a card; only transform and opacity change.
 */

/** Where the top edge is (cards leave under it) and how far above the bottom the bar's top is. */
export const TUCK_TOP = 48;
export const TUCK_BOTTOM = 86;

const ease = (q: number) => 1 - (1 - q) * (1 - q);
const clamp01 = (n: number) => Math.min(1, Math.max(0, n));

export interface Tucked {
  transform: string;
  opacity: string;
  origin: string;
}

/** A card whose top is `t` px from the top of a `H` tall view and is `h` tall. */
export function tuckOf(t: number, h: number, H: number): Tucked {
  const b = t + h;
  const botE = H - TUCK_BOTTOM;
  const pe = ease(clamp01((botE + 40 - t) / 160));
  const px = ease(clamp01((b - TUCK_TOP + 20) / 150));
  return {
    origin: px < 1 ? "50% 100%" : "50% 0",
    transform: pe < 1 || px < 1 ? `translateY(${(16 * (1 - pe)).toFixed(2)}px) scale(${(1 - 0.05 * (1 - pe) - 0.05 * (1 - px)).toFixed(4)})` : "",
    opacity: px < 1 ? (0.55 + 0.45 * px).toFixed(3) : "",
  };
}

/**
 * Tuck every rendered row of a list. `top` is the list's top in the view (from the feed's own
 * scroll measure); each row carries its layout top and height in `data-top` / `data-h`.
 */
export function applyTuck(list: HTMLElement | null, top: number, H: number) {
  if (!list) return;
  for (const slot of list.children) {
    const el = slot.firstElementChild as HTMLElement | null;
    const st = (slot as HTMLElement).dataset;
    if (!el || st.top === undefined) continue;
    const t = top + Number(st.top);
    const h = Number(st.h);
    if (t + h < -60 || t > H + 60) continue;
    const k = tuckOf(t, h, H);
    el.style.transformOrigin = k.origin;
    el.style.transform = k.transform;
    el.style.opacity = k.opacity;
  }
}
