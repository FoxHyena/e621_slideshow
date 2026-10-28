import { describe, expect, it } from "vitest";
import { DEFAULT_DATE_FILTER } from "../query/date";
import { DEFAULT_PLAYBACK, DEFAULT_SEARCH, type PlaybackSettings, type SearchSettings } from "../settings";
import { decodeShare, encodeShare } from "../share";

const decode = (qs: string) => decodeShare(new URLSearchParams(qs));

describe("share links", () => {
  it("defaults encode to just the version", () => {
    expect(encodeShare(DEFAULT_SEARCH, DEFAULT_PLAYBACK)).toBe("v=1");
  });

  it("round-trips non-default settings", () => {
    const search: SearchSettings = {
      ...DEFAULT_SEARCH,
      tags: "wolf solo -fox",
      ratings: { s: true, q: false, e: true },
      media: { image: true, gif: false, video: false },
      order: "random",
      seed: 4242,
      minScore: 0,
      date: { ...DEFAULT_DATE_FILTER, enabled: true, mode: "between", date: "2024-01-01", date2: "2024-02-01" },
    };
    const playback: PlaybackSettings = {
      ...DEFAULT_PLAYBACK,
      style: "kenburns",
      intervalSec: 12,
      fit: "cover",
      transition: "none",
      quality: "sample",
      videoMuted: false,
      videoMaxSec: 0,
      loop: false,
    };
    const got = decode(encodeShare(search, playback))!;
    const { tags, ratings, media, order, seed, date, minScore } = search;
    expect(got.search).toEqual({ tags, ratings, media, order, seed, date, minScore });
    expect(got.playback).toEqual({ ...playback, preloadCount: undefined });
  });

  it("round-trips the within and preset date modes", () => {
    for (const date of [
      { ...DEFAULT_DATE_FILTER, enabled: true, mode: "within" as const, amount: 3, unit: "weeks" as const },
      { ...DEFAULT_DATE_FILTER, enabled: true, mode: "preset" as const, preset: "month" as const },
    ]) {
      expect(decode(encodeShare({ ...DEFAULT_SEARCH, date }, DEFAULT_PLAYBACK))!.search.date).toEqual(date);
    }
  });

  it("leaves out the blacklist, Recommended settings and preload", () => {
    const qs = encodeShare(
      { ...DEFAULT_SEARCH, tags: "wolf", blacklist: "gore", source: "recommended", breadth: 3 },
      { ...DEFAULT_PLAYBACK, preloadCount: 9 },
    );
    expect(qs).toBe("v=1&tags=wolf");
  });

  it("drops values it doesn't accept", () => {
    const got = decode("v=1&order=evil&int=-5&style=x&r=zz&m=&d=on&d1=notadate&min=abc&mute=yes")!;
    expect(got.search.order).toBe(DEFAULT_SEARCH.order);
    expect(got.playback.intervalSec).toBe(DEFAULT_PLAYBACK.intervalSec);
    expect(got.playback.style).toBe("classic");
    expect(got.search.ratings).toEqual(DEFAULT_SEARCH.ratings);
    expect(got.search.media).toEqual({ image: false, gif: false, video: false });
    expect(got.search.date.date).toBe("");
    expect(got.search.minScore).toBeNull();
    expect(got.playback.videoMuted).toBe(DEFAULT_PLAYBACK.videoMuted);
  });

  it("ignores URLs that aren't share links", () => {
    expect(decode("tags=wolf")).toBeNull();
    expect(decode("v=2&tags=wolf")).toBeNull();
  });
});
