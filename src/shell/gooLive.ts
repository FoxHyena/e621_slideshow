/**
 * The goo bar on screen now, if any. Kept apart from `gooBar.ts` so the feed can drop goo onto
 * the bar without pulling the bar's drawing code into the first load (it loads with the bar).
 */
export interface GooBar {
  /** draw the count with no animation */
  sync(n: number): void;
  /** the count changed: aim at the new shape; `landedAt` is where a drop came down */
  set(n: number, landedAt?: number): void;
  wipe(): void;
  /** a drop that fell from `x, y` (viewport) to the bar */
  dropFrom(x: number, y: number): boolean;
  /** the secret tab's ten drops, thrown from the tab at angle `a` (radians about the bend) */
  spurt(a: number, icon: Element | null): void;
  /** drops still in the air */
  falling(): number;
  destroy(): void;
}

let live: GooBar | null = null;

/** The bar on screen now, if any (the drip under a heart drops onto it). */
export function liveGoo(): GooBar | null {
  return live;
}

export function setLiveGoo(bar: GooBar | null, was?: GooBar) {
  if (bar || live === was) live = bar;
}
