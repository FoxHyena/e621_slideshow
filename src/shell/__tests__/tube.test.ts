import { describe, expect, it } from "vitest";
import { BEND, edgeAt, gooColor, gooEdge, gooGeo, gooTarget, tabAngle, TUBE, tubeGeo } from "../tube";

describe("the tab bar tube", () => {
  it("is 343 × 64 on a phone, its middle 10 higher: a bend of radius about 978", () => {
    const g = tubeGeo(343);
    expect(g.H).toBe(TUBE + BEND);
    expect(g.R).toBeCloseTo(978, 0);
    // each of the four tabs gets about 83 along the centre line
    expect(g.tw).toBeGreaterThan(82);
    expect(g.tw).toBeLessThan(85);
  });

  it("lays the tabs symmetrically about the middle, the secret one a tab past the end", () => {
    const g = tubeGeo(343);
    expect(tabAngle(g, 0)).toBeCloseTo(-tabAngle(g, 3));
    expect(tabAngle(g, 1)).toBeCloseTo(-tabAngle(g, 2));
    expect(tabAngle(g, 4) - tabAngle(g, 3)).toBeCloseTo(g.tw / g.R);
  });

  it("draws a straight bar when there's no bend", () => {
    const g = tubeGeo(343, 0);
    expect(g.R).toBe(0);
    expect(g.H).toBe(TUBE);
    expect(tabAngle(g, 0)).toBeCloseTo(-1.5 * g.tw);
  });

  it("finds a point's place along the top edge and back", () => {
    const q = gooGeo(tubeGeo(343));
    for (const u of [0, q.L * 0.25, q.L * 0.5, q.L * 0.9, q.L]) {
      const e = gooEdge(q, u);
      expect(edgeAt(q, e.x)).toBeCloseTo(u, 3);
    }
    // the middle of the top edge is the bar's highest point
    expect(gooEdge(q, q.L / 2).y).toBeCloseTo(0, 5);
  });
});

describe("the goo on it", () => {
  const q = gooGeo(tubeGeo(343));

  it("is nothing at zero", () => {
    const t = gooTarget(0, q);
    expect(t.t).toBe(0);
    expect(t.drips).toEqual([]);
  });

  it("lands at 90% along and grows thicker, wider and yellower with each favourite", () => {
    let prev = gooTarget(1, q);
    expect(prev.hu).toBeCloseTo(q.L * 0.9);
    for (const n of [2, 5, 10, 30, 100, 400]) {
      const t = gooTarget(n, q);
      expect(t.t).toBeGreaterThan(prev.t);
      expect(t.uR - t.uL).toBeGreaterThanOrEqual(prev.uR - prev.uL);
      expect(t.tint).toBeGreaterThan(prev.tint);
      prev = t;
    }
    // the bead is 6 to 10 px thick, however much there is
    expect(gooTarget(1, q).t).toBeGreaterThanOrEqual(6);
    expect(gooTarget(100_000, q).t).toBeLessThanOrEqual(10);
  });

  it("keeps drips apart, on the bar, and never longer than the bar is deep", () => {
    const t = gooTarget(200, q);
    expect(t.drips.length).toBeGreaterThan(0);
    const us = t.drips.map((d) => d.u).sort((a, b) => a - b);
    for (let i = 1; i < us.length; i++) expect(us[i] - us[i - 1]).toBeGreaterThanOrEqual(20);
    for (const d of t.drips) {
      expect(d.len).toBeLessThanOrEqual(gooEdge(q, d.u).room);
      expect(d.d).toBeGreaterThanOrEqual(10);
      expect(d.d).toBeLessThanOrEqual(17);
    }
  });

  it("is a pure function of the count, so a reload draws the same goo", () => {
    expect(gooTarget(37, q)).toEqual(gooTarget(37, q));
  });

  it("is white when fresh and cream when old", () => {
    expect(gooColor(0)).toBe("#ffffff");
    expect(gooColor(1)).toBe("#f3e6a8");
    expect(gooColor(5)).toBe("#f3e6a8");
  });
});
