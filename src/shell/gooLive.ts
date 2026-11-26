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
  /** Goo the mascot's one to three drops, thrown from its tip at `x, y` (viewport) onto the goo
   * already on the bar; `scale` is screen px per unit of Goo's 120 box */
  toss(x: number, y: number, n: number, scale: number): void;
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

/**
 * The sidebar's pool on a computer, when it's showing: there's no tab bar there, so a drop from a
 * heart falls off the bottom of the window and the pool takes it in (owner-picked, "Fall").
 */
export interface GooPool {
  /** a drop that lets go at `x, y` (viewport); false when nothing falls (reduced motion) */
  dropFrom(x: number, y: number): boolean;
  /** the secret row's ten drops, thrown from its `icon` down into the pool */
  spurt(icon: Element | null): void;
}

let pool: GooPool | null = null;
export function livePool(): GooPool | null {
  return pool;
}
export function setLivePool(p: GooPool | null, was?: GooPool) {
  if (p || pool === was) pool = p;
}

