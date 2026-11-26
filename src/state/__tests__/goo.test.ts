import { describe, expect, it } from "vitest";
import { createGoo, GOO_MAX, gooLabel } from "../goo";

describe("the goo count", () => {
  it("starts from what was saved and saves every change", () => {
    const saved: number[] = [];
    const goo = createGoo(
      () => 7,
      (n) => saved.push(n),
    );
    expect(goo.store.get().count).toBe(7);
    goo.add();
    goo.add(10);
    expect(goo.store.get().count).toBe(18);
    expect(saved).toEqual([8, 18]);
  });

  it("only ever adds", () => {
    const goo = createGoo();
    goo.add(-3);
    goo.add(0);
    goo.add(Number.NaN);
    expect(goo.store.get().count).toBe(0);
  });

  it("wipes back to zero, and counts the wipe so the bar plays it once", () => {
    const saved: number[] = [];
    const goo = createGoo(
      () => 3,
      (n) => saved.push(n),
    );
    goo.wipe();
    expect(goo.store.get()).toEqual({ count: 0, wipes: 1 });
    expect(saved).toEqual([0]);
    goo.wipe();
    expect(goo.store.get().wipes).toBe(2);
  });

  it("counts a post's favourite once, however often it's favourited again", () => {
    const goo = createGoo();
    expect(goo.addFav(5)).toBe(true);
    expect(goo.addFav(5)).toBe(false);
    expect(goo.addFav(6)).toBe(true);
    expect(goo.store.get().count).toBe(2);
  });

  it("stops counting somewhere sane", () => {
    const goo = createGoo(() => GOO_MAX - 1);
    goo.add(10);
    expect(goo.store.get().count).toBe(GOO_MAX);
  });

  it("says how much in words", () => {
    expect(gooLabel(0)).toBe("0 favorites");
    expect(gooLabel(1)).toBe("1 favorite");
    expect(gooLabel(1234)).toBe("1,234 favorites");
  });
});
