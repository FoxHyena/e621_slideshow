import { describe, expect, it } from "vitest";
import {
  cardHeight,
  CARD,
  columnWidth,
  gridRange,
  indexAt,
  layoutFeed,
  layoutGrid,
  mediaHeight,
  visibleRange,
} from "../layout";
import {
  dateLabel,
  decodeResults,
  DEFAULT_FILTERS,
  encodeResults,
  isDefaultFilters,
  mediaLabel,
  searchFor,
} from "../filters";
import { DEFAULT_DATE_FILTER } from "../../query/date";
import { buildQuery } from "../../query/build";

const post = (w: number, h: number) => ({ files: { original: { width: w, height: h, url: "x" } } }) as never;

describe("feed layout", () => {
  it("sizes the column to the phone edge and the desktop cap", () => {
    expect(columnWidth(375)).toBe(343);
    expect(columnWidth(1280)).toBe(600);
  });

  it("keeps each picture's own aspect, capping anything taller than 1:2", () => {
    expect(mediaHeight(post(1000, 500), 343)).toBe(Math.round(319 / 2));
    expect(mediaHeight(post(500, 1000), 343)).toBe(638);
    expect(mediaHeight(post(100, 1000), 343)).toBe(638); // a 1:10 strip shows at 1:2
    expect(mediaHeight(post(0, 0), 343)).toBe(319); // unknown size: square
  });

  it("adds the panel's fixed rows around the picture", () => {
    expect(cardHeight(post(1, 1), 343)).toBe(44 + 319 + 12 + 32 + 12 + 32 + 12);
  });

  it("stacks cards with the 24 gap and finds the ones in view", () => {
    const l = layoutFeed([post(1, 1), post(2, 1), post(1, 1)], 343);
    expect(l.tops[1]).toBe(l.heights[0] + CARD.gap);
    expect(l.total).toBe(l.tops[2] + l.heights[2]);
    expect(indexAt(l, 0)).toBe(0);
    expect(indexAt(l, l.tops[1] + 1)).toBe(1);
    expect(visibleRange(l, 0, 100, 0)).toEqual([0, 1]);
    expect(visibleRange(l, l.tops[2], 10, 0)).toEqual([2, 3]);
    expect(visibleRange(layoutFeed([], 343), 0, 800)).toEqual([0, 0]);
  });

  it("lays out square grid tiles and windows them by row", () => {
    const g = layoutGrid(30, 343);
    expect(g.cols).toBe(3);
    expect(g.rows).toBe(10);
    expect(g.tile).toBeCloseTo((343 - 8) / 3);
    expect(layoutGrid(30, 1100).cols).toBe(6);
    const [a, b] = gridRange(g, 0, g.tile + 4, 0);
    expect(a).toBe(0);
    expect(b).toBe(3);
  });
});

describe("results URLs", () => {
  it("round-trips tags and filters, writing only what isn't default", () => {
    const f = { ...DEFAULT_FILTERS, media: { image: false, gif: false, video: true }, order: "score" as const, minScore: 50, hideFaved: true };
    const q = encodeResults({ tags: "wolf  solo", filters: f, link: null });
    expect(q).toBe("tags=wolf+solo&m=v&order=score&min=50&hf=1");
    const back = decodeResults(q);
    expect(back).toEqual({ tags: "wolf solo", filters: f, link: null });
    expect(encodeResults({ tags: "fox", filters: DEFAULT_FILTERS, link: null })).toBe("tags=fox");
  });

  it("keeps a share link's ratings and playback, and marks a launch", () => {
    const share = decodeResults("v=1&tags=fox&r=s&int=3");
    expect(share.link).toMatchObject({ kind: "share", ratings: { s: true, q: false, e: false }, playback: { intervalSec: 3 } });
    expect(decodeResults(encodeResults(share))).toEqual(share);
    expect(decodeResults("l=1&tags=fox").link).toEqual({ kind: "launch" });
  });

  it("labels non-default chips", () => {
    expect(mediaLabel({ image: true, gif: true, video: true })).toBeNull();
    expect(mediaLabel({ image: false, gif: false, video: true })).toBe("Videos");
    expect(dateLabel({ ...DEFAULT_DATE_FILTER, enabled: true, mode: "preset", preset: "week" })).toBe("This week");
    expect(dateLabel({ ...DEFAULT_DATE_FILTER, enabled: true, mode: "within", amount: 1, unit: "days" })).toBe("Last 1 day");
    expect(isDefaultFilters(DEFAULT_FILTERS)).toBe(true);
    expect(isDefaultFilters({ ...DEFAULT_FILTERS, hideFaved: true })).toBe(false);
  });

  it("builds the e621 query from the feed's filters and the account's ratings", () => {
    const s = searchFor("wolf", { ...DEFAULT_FILTERS, order: "score", minScore: 10 }, { s: true, q: false, e: false }, "gore");
    const b = buildQuery(s);
    expect(b.query).toBe("wolf rating:s score:>=10 order:score");
    expect(b.rules.length).toBe(1);
  });
});
