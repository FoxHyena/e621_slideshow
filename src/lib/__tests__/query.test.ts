import { describe, expect, it } from "vitest";
import { blacklistedBy, mergeBlacklists, parseBlacklist, removeBlacklistLines, ruleToQuery, syncAccountBlacklist, DEFAULT_BLACKLIST } from "../query/blacklist";
import { buildQuery, buildRecommendedQuery, countTags, REC_BLACKLIST_RESERVE } from "../query/build";
import { dateMetatag, DEFAULT_DATE_FILTER, nextDay } from "../query/date";
import { inRange, parseRange } from "../query/range";
import { DEFAULT_SEARCH, type SearchSettings } from "../settings";
import { makePost } from "./fixtures";

const search = (over: Partial<SearchSettings> = {}): SearchSettings => ({
  ...DEFAULT_SEARCH,
  blacklist: "",
  ...over,
});

describe("range", () => {
  it.each([
    ["5", 5, true],
    ["5", 6, false],
    [">=5", 5, true],
    [">5", 5, false],
    ["<5", 4, true],
    ["<=5", 6, false],
    ["2..4", 3, true],
    ["2..4", 5, false],
    ["10..", 11, true],
    ["..10", 11, false],
  ])("%s with %d -> %s", (raw, n, want) => {
    expect(inRange(n, parseRange(raw)!)).toBe(want);
  });

  it("rejects garbage", () => expect(parseRange("abc")).toBeNull());
});

describe("blacklist parsing + matching", () => {
  it("drops comments, blanks and duplicates", () => {
    const rules = parseBlacklist("gore # nope\n\n  GORE \n# full comment\nscat feces");
    expect(rules.map((r) => r.line)).toEqual(["gore", "scat feces"]);
  });

  it("requires all plain terms", () => {
    const [rule] = parseBlacklist("wolf fox");
    expect(blacklistedBy([rule], makePost({ tagList: ["wolf"] }))).toBeNull();
    expect(blacklistedBy([rule], makePost({ tagList: ["wolf", "fox"] }))).toBe(rule);
  });

  it("negated term exempts", () => {
    const rules = parseBlacklist("young -rating:s");
    expect(blacklistedBy(rules, makePost({ tagList: ["young"], rating: "s" }))).toBeNull();
    expect(blacklistedBy(rules, makePost({ tagList: ["young"], rating: "e" }))).not.toBeNull();
  });

  it("~ terms need at least one hit", () => {
    const rules = parseBlacklist("~cat ~dog solo");
    expect(blacklistedBy(rules, makePost({ tagList: ["solo"] }))).toBeNull();
    expect(blacklistedBy(rules, makePost({ tagList: ["solo", "dog"] }))).not.toBeNull();
  });

  it("supports metatags and wildcards", () => {
    expect(blacklistedBy(parseBlacklist("score:<0"), makePost({ score: { up: 0, down: 3, total: -3 } }))).not.toBeNull();
    expect(blacklistedBy(parseBlacklist("type:webm"), makePost({ file: { ...makePost().file, ext: "webm" } }))).not.toBeNull();
    expect(blacklistedBy(parseBlacklist("type:webm"), makePost())).toBeNull();
    expect(blacklistedBy(parseBlacklist("african_*"), makePost({ tagList: ["african_wild_dog"] }))).not.toBeNull();
    expect(blacklistedBy(parseBlacklist("rating:explicit"), makePost({ rating: "e" }))).not.toBeNull();
    expect(blacklistedBy(parseBlacklist("fav:me"), makePost({ is_favorited: true }))).not.toBeNull();
  });

  it("checks tags across all categories", () => {
    const post = makePost({ tags: { general: ["solo"], species: ["canine"] } });
    expect(blacklistedBy(parseBlacklist("canine"), post)).not.toBeNull();
  });

  it("merges without duplicates", () => {
    expect(mergeBlacklists("gore\nscat", "Gore\nfeces\n")).toBe("gore\nscat\nfeces");
  });

  it("removes lines present in another list, ignoring case and spacing", () => {
    expect(removeBlacklistLines("mine\nGore\nyoung  -rating:s\n\nother", "gore\nyoung -rating:s")).toBe("mine\nother");
  });

  it("account sync swaps defaults and stale account lines, keeps local ones", () => {
    const first = syncAccountBlacklist(`mine\n${DEFAULT_BLACKLIST}`, "", "acct_a\nacct_b");
    expect(first).toBe("mine\nacct_a\nacct_b");
    // acct_a was removed on e621; a local line was added meanwhile
    expect(syncAccountBlacklist(`${first}\nlocal2`, "acct_a\nacct_b", "acct_b\nacct_c")).toBe(
      "mine\nlocal2\nacct_b\nacct_c",
    );
  });

  it("translates rules to query terms", () => {
    const [single, multi, wild, onlyNeg] = parseBlacklist("gore\nyoung -rating:s\na_*\n-solo");
    expect(ruleToQuery(single)).toEqual({ query: "-gore", cost: 1 });
    expect(ruleToQuery(multi)).toEqual({ query: "-( young -rating:s )", cost: 2 });
    expect(ruleToQuery(wild)).toBeNull();
    expect(ruleToQuery(onlyNeg)).toBeNull();
  });
});

describe("date metatag", () => {
  const f = { ...DEFAULT_DATE_FILTER, enabled: true };
  it("is null when disabled", () => expect(dateMetatag(DEFAULT_DATE_FILTER)).toBeNull());
  it("presets", () => expect(dateMetatag({ ...f, mode: "preset", preset: "yesterday" })).toBe("date:yesterday"));
  it("on/after/before", () => {
    expect(dateMetatag({ ...f, mode: "on", date: "2024-03-01" })).toBe("date:2024-03-01");
    expect(dateMetatag({ ...f, mode: "after", date: "2024-03-01" })).toBe("date:>=2024-03-01");
    expect(dateMetatag({ ...f, mode: "before", date: "2024-03-01" })).toBe("date:<2024-03-01");
  });
  it("between is inclusive and order-independent", () => {
    expect(dateMetatag({ ...f, mode: "between", date: "2024-03-10", date2: "2024-03-01" })).toBe(
      "date:2024-03-01..2024-03-11",
    );
  });
  it("within N units", () => {
    expect(dateMetatag({ ...f, mode: "within", amount: 3, unit: "weeks" })).toBe("date:>=3_weeks_ago");
    expect(dateMetatag({ ...f, mode: "within", amount: 0, unit: "weeks" })).toBeNull();
  });
  it("incomplete input is null", () => expect(dateMetatag({ ...f, mode: "on", date: "" })).toBeNull());
  it("nextDay crosses month/year", () => {
    expect(nextDay("2024-02-29")).toBe("2024-03-01");
    expect(nextDay("2024-12-31")).toBe("2025-01-01");
  });
});

describe("buildQuery", () => {
  it("adds nothing by default", () => {
    const b = buildQuery(search({ tags: "wolf  solo" }));
    expect(b.query).toBe("wolf solo");
    expect(b.paging).toBe("cursor");
  });

  it("ratings: one on -> rating:x, two on -> -rating:y", () => {
    expect(buildQuery(search({ ratings: { s: true, q: false, e: false } })).query).toContain("rating:s");
    expect(buildQuery(search({ ratings: { s: true, q: true, e: false } })).query).toContain("-rating:e");
  });

  it("media toggles", () => {
    const q = buildQuery(search({ media: { image: true, gif: false, video: false } })).query;
    expect(q).toContain("-type:gif");
    expect(q).toContain("-type:webm -type:mp4");
  });

  it("random order adds seed and numbered paging", () => {
    const b = buildQuery(search({ order: "random", seed: 42 }));
    expect(b.query).toContain("order:random randseed:42");
    expect(b.paging).toBe("numbered");
  });

  it("user's own order: wins", () => {
    const b = buildQuery(search({ tags: "wolf order:score", order: "random" }));
    expect(b.query).not.toContain("order:random");
    expect(b.paging).toBe("numbered");
  });

  it("includes date tag", () => {
    const b = buildQuery(search({ date: { ...DEFAULT_DATE_FILTER, enabled: true, mode: "preset", preset: "month" } }));
    expect(b.query).toContain("date:month");
  });

  it("packs blacklist rules until the tag budget is spent", () => {
    const blacklist = Array.from({ length: 50 }, (_, i) => `tag${i}`).join("\n");
    const b = buildQuery(search({ tags: "wolf", blacklist }));
    expect(b.tagCount).toBe(40);
    expect(b.inQuery).toHaveLength(39); // wolf + 39 rules
    expect(b.localOnly).toHaveLength(11);
    expect(b.rules).toHaveLength(50);
  });

  it("group parens don't count as tags", () => {
    expect(countTags(["-(", "a", "b", ")", "-( a b )".split(" ")].flat())).toBe(4);
    const b = buildQuery(search({ blacklist: "young -rating:s" }));
    expect(b.query).toBe("-( young -rating:s )");
    expect(b.tagCount).toBe(2);
  });

  it("flags user terms over the limit", () => {
    const tags = Array.from({ length: 45 }, (_, i) => `t${i}`).join(" ");
    expect(buildQuery(search({ tags })).overLimit).toBe(true);
  });
});

describe("buildRecommendedQuery", () => {
  const top = Array.from({ length: 40 }, (_, i) => `tag${i}`);

  it("ORs the top tags inside a default 7-day window, ordered by score", () => {
    const q = buildRecommendedQuery(search({ breadth: 3, tags: "ignored order:random" }), top);
    expect(q.query).toBe("~tag0 ~tag1 ~tag2 date:>=7_days_ago order:score");
    expect(q.candidates).toEqual(["tag0", "tag1", "tag2"]);
    expect(q.capped).toBe(false);
    expect(q.paging).toBe("numbered");
  });

  it("keeps the user's own window and filters, then fits the blacklist", () => {
    const date = { ...DEFAULT_DATE_FILTER, enabled: true, mode: "preset" as const, preset: "month" as const };
    const q = buildRecommendedQuery(
      search({ breadth: 2, date, ratings: { s: false, q: false, e: true }, blacklist: "gore" }),
      top,
    );
    expect(q.query).toBe("~tag0 ~tag1 rating:e date:month order:score -gore");
  });

  it("caps breadth to the tag budget, keeping the blacklist reserve, and says so", () => {
    // filters: date + order + rating = 3 → room 20 − 3 − reserve
    const q = buildRecommendedQuery(search({ breadth: 30, ratings: { s: false, q: false, e: true } }), top, 20);
    expect(q.candidates).toHaveLength(20 - 3 - REC_BLACKLIST_RESERVE);
    expect(q.capped).toBe(true);
    expect(q.overLimit).toBe(false);
  });

  it("sends a single candidate without the OR prefix, and none when the profile is empty", () => {
    expect(buildRecommendedQuery(search({ breadth: 15 }), ["solo_tag"]).query).toMatch(/^solo_tag date:/);
    expect(buildRecommendedQuery(search({ breadth: 15 }), []).candidates).toEqual([]);
  });
});
