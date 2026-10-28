import type { SearchSettings } from "../settings";
import { parseBlacklist, type BlacklistRule } from "./blacklist";
import { DEFAULT_DATE_FILTER, dateMetatag, type DateFilter } from "./date";

export const DEFAULT_TAG_LIMIT = 40;
/** e621 refuses page numbers past this; cursor paging (`b<id>`) has no cap. */
export const MAX_PAGE = 750;

export interface BuiltQuery {
  /** final `tags` string sent to /posts.json */
  query: string;
  /** tokens counted against e621's tag limit */
  tagCount: number;
  tagLimit: number;
  /** user's own terms + filters already exceed the limit */
  overLimit: boolean;
  /** blacklist rules; applied client-side only, so they never cost a tag slot */
  rules: BlacklistRule[];
  /** `cursor` = page=b<id> (newest-first); `numbered` = page=1..750 */
  paging: "cursor" | "numbered";
}

/** Tokens e621 counts toward the tag limit: everything but bare parens. */
export function countTags(tokens: string[]): number {
  return tokens.filter((t) => !/^[-~]?\($/.test(t) && t !== ")").length;
}

export function tokenize(tags: string): string[] {
  return tags.trim().split(/\s+/).filter(Boolean);
}

const ORDER_TOKENS: Record<SearchSettings["order"], string | null> = {
  newest: null,
  oldest: "order:id",
  score: "order:score",
  favcount: "order:favcount",
  random: "order:random",
  hot: "order:hot",
  comment_count: "order:comment_count",
  mpixels: "order:mpixels",
};

function filterTokens(s: SearchSettings, userHasOrder: boolean, userHasScore: boolean): string[] {
  const out: string[] = [];

  const { s: safe, q, e } = s.ratings;
  const on = [safe && "s", q && "q", e && "e"].filter(Boolean) as string[];
  if (on.length === 1) out.push(`rating:${on[0]}`);
  else if (on.length === 2) {
    const off = (["s", "q", "e"] as const).find((r) => !s.ratings[r]);
    out.push(`-rating:${off}`);
  }

  // Flash posts aren't excluded here (it would cost one of the 40 tags); the
  // queue drops them client-side since browsers can't play .swf.
  if (!s.media.image) out.push("-type:jpg", "-type:png", "-type:webp");
  if (!s.media.gif) out.push("-type:gif");
  if (!s.media.video) out.push("-type:webm", "-type:mp4");

  if (s.minScore != null && !userHasScore) out.push(`score:>=${s.minScore}`);

  const date = dateMetatag(s.date);
  if (date) out.push(date);

  if (!userHasOrder) {
    const order = ORDER_TOKENS[s.order];
    if (order) out.push(order);
    if (s.order === "random") out.push(`randseed:${s.seed}`);
  }
  return out;
}

export function buildQuery(s: SearchSettings, tagLimit = DEFAULT_TAG_LIMIT): BuiltQuery {
  const user = tokenize(s.tags);
  const userOrder = user.find((t) => /^-?order:/.test(t));
  const userHasScore = user.some((t) => /^-?score:/.test(t));
  const filters = filterTokens(s, !!userOrder, userHasScore);
  const base = [...user, ...filters];
  const used = countTags(base);

  const effectiveOrder = userOrder ? userOrder.replace(/^-/, "") : ORDER_TOKENS[s.order];
  const paging =
    !effectiveOrder || effectiveOrder === "order:id_desc" ? "cursor" : "numbered";

  return {
    query: base.join(" "),
    tagCount: used,
    tagLimit,
    overLimit: used > tagLimit,
    rules: parseBlacklist(s.blacklist),
    paging,
  };
}

/** Recommended's window when the user hasn't set a usable date filter. */
export const REC_DEFAULT_WINDOW: DateFilter = {
  ...DEFAULT_DATE_FILTER,
  enabled: true,
  mode: "within",
  amount: 7,
  unit: "days",
};

/** Recommended always searches a window; an unset or incomplete filter means the last 7 days. */
export function recommendedWindow(date: DateFilter): DateFilter {
  return dateMetatag(date) ? date : REC_DEFAULT_WINDOW;
}

export interface RecommendedQuery extends BuiltQuery {
  /** profile tags actually OR'd in, after capping breadth to the tag budget */
  candidates: string[];
  /** breadth asked for more tags than e621's tag limit leaves room for */
  capped: boolean;
}

/**
 * Candidate query for Recommended: the top profile tags OR'd together inside
 * the window, best-scored first. One query, paged, instead of one per tag: the
 * searched tags are the highest-weight ones, which are rare enough that their
 * union usually fits in a page or two, so a 20-tag search costs 1–2 requests
 * instead of 20+. Each tag takes one of e621's tag slots, so breadth is capped
 * to what's left after the filters.
 */
export function buildRecommendedQuery(
  s: SearchSettings,
  ranked: string[],
  tagLimit = DEFAULT_TAG_LIMIT,
): RecommendedQuery {
  const base: SearchSettings = { ...s, date: recommendedWindow(s.date), order: "score", tags: "" };
  const filters = buildQuery(base, tagLimit).tagCount;
  const room = Math.max(0, tagLimit - filters);
  const wanted = ranked.slice(0, s.breadth);
  const candidates = wanted.slice(0, room);
  // A lone `~tag` isn't an OR; send it plain.
  const tags = candidates.length === 1 ? candidates[0] : candidates.map((t) => `~${t}`).join(" ");
  return { ...buildQuery({ ...base, tags }, tagLimit), candidates, capped: candidates.length < wanted.length };
}
