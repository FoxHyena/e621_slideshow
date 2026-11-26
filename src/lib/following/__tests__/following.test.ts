import { describe, expect, it } from "vitest";
import { dividerIndex, feedRows, isNew, newCountLabel, type FeedRow } from "../feed";
import { scrolledPast, shouldMarkSeen, type MarkState } from "../marker";

/** Posts newest first: [id, artist] */
const posts = (...specs: [number, string?][]) =>
  specs.map(([id, artist]) => ({ id, tags: { artist: artist ? [artist] : [] } }) as never as { id: number; tags: { artist: string[] } });

const show = (rows: FeedRow[], list: { id: number }[]) =>
  rows.map((r) => (r.kind === "post" ? list[r.index].id : r.kind === "divider" ? "—" : `+${r.count} ${r.artist}`));

describe("isNew", () => {
  it("is above the threshold, and never without one", () => {
    expect(isNew({ id: 11 }, 10)).toBe(true);
    expect(isNew({ id: 10 }, 10)).toBe(false);
    expect(isNew({ id: 11 }, null)).toBe(false);
  });
});

describe("dividerIndex", () => {
  const list = posts([15], [14], [10], [9]);
  it("sits before the first post at or below the threshold", () => {
    expect(dividerIndex(list, 12, false)).toBe(2);
    expect(dividerIndex(list, 14, false)).toBe(1);
  });
  it("is absent when nothing is new, or without a threshold", () => {
    expect(dividerIndex(list, 20, false)).toBeNull();
    expect(dividerIndex(list, null, true)).toBeNull();
    expect(dividerIndex([], 5, true)).toBeNull();
  });
  it("waits while every post so far is new; goes last once there are no more", () => {
    expect(dividerIndex(list, 5, false)).toBeNull();
    expect(dividerIndex(list, 5, true)).toBe(4);
  });
});

describe("feedRows", () => {
  it("folds a run of 5+ new posts by one artist to 3 and +N", () => {
    const list = posts([20, "a"], [19, "a"], [18, "a"], [17, "a"], [16, "a"], [15, "a"], [14, "b"], [9, "a"]);
    const rows = feedRows(list, 10, dividerIndex(list, 10, false), new Set());
    expect(show(rows, list)).toEqual([20, 19, 18, "+3 a", 14, "—", 9]);
    expect(rows[3]).toEqual({ kind: "more", run: 20, artist: "a", count: 3 });
  });

  it("keeps runs of 4 whole, and an expanded run whole", () => {
    const four = posts([20, "a"], [19, "a"], [18, "a"], [17, "a"], [16, "b"]);
    expect(show(feedRows(four, 10, null, new Set()), four)).toEqual([20, 19, 18, 17, 16]);
    const five = posts([20, "a"], [19, "a"], [18, "a"], [17, "a"], [16, "a"]);
    expect(show(feedRows(five, 10, null, new Set([20])), five)).toEqual([20, 19, 18, 17, 16]);
    // Newer posts by the same artist joined its head (after a refresh): still open.
    const six = [{ ...five[0], id: 21 }, ...five];
    expect(show(feedRows(six, 10, null, new Set([20])), six)).toEqual([21, 20, 19, 18, 17, 16]);
  });

  it("never runs across the divider, and old posts never fold", () => {
    const list = posts([20, "a"], [19, "a"], [18, "a"], [9, "a"], [8, "a"], [7, "a"], [6, "a"], [5, "a"]);
    expect(show(feedRows(list, 10, dividerIndex(list, 10, false), new Set()), list)).toEqual([20, 19, 18, "—", 9, 8, 7, 6, 5]);
  });

  it("doesn't group posts without an artist", () => {
    const list = posts([20], [19], [18], [17], [16], [15]);
    expect(show(feedRows(list, 10, null, new Set()), list)).toEqual([20, 19, 18, 17, 16, 15]);
  });

  it("splits runs where the first artist changes", () => {
    const list = posts(...Array.from({ length: 5 }, (_, i): [number, string] => [30 - i, "a"]), ...Array.from({ length: 6 }, (_, i): [number, string] => [25 - i, "b"]));
    expect(show(feedRows(list, 10, null, new Set()), list)).toEqual([30, 29, 28, "+2 a", 25, 24, 23, "+3 b"]);
  });

  it("puts the divider last when every post is new and there are no more", () => {
    const list = posts([20, "a"], [19, "b"]);
    expect(show(feedRows(list, 10, dividerIndex(list, 10, true), new Set()), list)).toEqual([20, 19, "—"]);
  });

  it("is a plain list with no threshold", () => {
    const list = posts([20, "a"], [19, "a"], [18, "a"], [17, "a"], [16, "a"]);
    expect(show(feedRows(list, null, null, new Set()), list)).toEqual([20, 19, 18, 17, 16]);
  });
});

describe("newCountLabel", () => {
  it("counts, adds + while more may come, and says when there's nothing", () => {
    expect(newCountLabel(12, false)).toBe("12 new");
    expect(newCountLabel(40, true)).toBe("40+ new");
    expect(newCountLabel(0, false)).toBe("All caught up");
    expect(newCountLabel(0, true)).toBe("");
  });
});

describe("shouldMarkSeen", () => {
  const base: MarkState = { threshold: 10, rawMax: 20, seenPast: true, filtered: false, force: false, newer: null, done: false };
  it("checks for newer posts once you're past the divider with no filter on", () => {
    expect(shouldMarkSeen(base)).toBe("check");
    expect(shouldMarkSeen({ ...base, newer: false })).toBe("mark");
    expect(shouldMarkSeen({ ...base, newer: true })).toBe("newer");
  });
  it("waits before the divider, with a filter on, or once done", () => {
    expect(shouldMarkSeen({ ...base, seenPast: false })).toBe("wait");
    expect(shouldMarkSeen({ ...base, filtered: true })).toBe("wait");
    expect(shouldMarkSeen({ ...base, done: true })).toBe("wait");
  });
  it("has nothing to mark without a marker or anything above it", () => {
    expect(shouldMarkSeen({ ...base, threshold: null })).toBe("wait");
    expect(shouldMarkSeen({ ...base, rawMax: 10 })).toBe("wait");
  });
  it("Mark all as seen skips rules 1 and 2, not the newer check", () => {
    const forced = { ...base, seenPast: false, filtered: true, force: true };
    expect(shouldMarkSeen(forced)).toBe("check");
    expect(shouldMarkSeen({ ...forced, newer: true })).toBe("newer");
  });
  it("counts the divider reaching the top of the view as a screen past it", () => {
    const v = (top: number) => ({ top, height: 800 });
    expect(scrolledPast(500, v(499), 5000)).toBe(false);
    expect(scrolledPast(500, v(500), 5000)).toBe(true);
    expect(scrolledPast(null, v(9999), 99999)).toBe(false);
  });
  it("counts the bottom of the list with the divider on screen, where it can't reach the top", () => {
    // 1,000 px list, 800 px view: the most the view can scroll is 200.
    expect(scrolledPast(900, { top: 200, height: 800 }, 1000)).toBe(true);
    expect(scrolledPast(900, { top: 100, height: 800 }, 1000)).toBe(false);
    // The divider below the view (somehow) doesn't count.
    expect(scrolledPast(1000, { top: 200, height: 800 }, 1000)).toBe(false);
  });
});

describe("layoutRows", () => {
  it("stacks rows with fixed heights between cards, and points folded posts at their +N row", async () => {
    const { layoutRows, ROW, CARD, cardHeight } = await import("../../feed/layout");
    const sq = { files: { original: { width: 10, height: 10, url: "x" } } } as never;
    const list = Array.from({ length: 6 }, () => sq);
    const rows: FeedRow[] = [
      { kind: "post", index: 0 },
      { kind: "post", index: 1 },
      { kind: "post", index: 2 },
      { kind: "more", run: 1, artist: "a", count: 2 },
      { kind: "divider" },
      { kind: "post", index: 5 },
    ];
    const l = layoutRows(rows, list, 343);
    const card = cardHeight(sq, 343);
    expect(l.heights).toEqual([card, card, card, ROW.more, ROW.divider, card]);
    expect(l.tops[3]).toBe(3 * (card + CARD.gap));
    expect(l.rowOf).toEqual([0, 1, 2, 3, 3, 5]);
    expect(l.total).toBe(4 * card + ROW.more + ROW.divider + 5 * CARD.gap);
  });
});
