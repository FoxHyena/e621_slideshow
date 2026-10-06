import type { SearchSettings } from "../settings";
import { parseBlacklist, ruleToQuery, type BlacklistRule } from "./blacklist";
import { dateMetatag } from "./date";

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
  /** blacklist rules excluded server-side */
  inQuery: BlacklistRule[];
  /** blacklist rules that only run client-side (didn't fit, or not expressible) */
  localOnly: BlacklistRule[];
  /** all rules, always applied client-side too */
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

function filterTokens(s: SearchSettings, userHasOrder: boolean): string[] {
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
  const filters = filterTokens(s, !!userOrder);
  const base = [...user, ...filters];
  let used = countTags(base);

  const rules = parseBlacklist(s.blacklist);
  const inQuery: BlacklistRule[] = [];
  const localOnly: BlacklistRule[] = [];
  const parts = [...base];
  for (const rule of rules) {
    const q = ruleToQuery(rule);
    if (q && used + q.cost <= tagLimit) {
      parts.push(q.query);
      used += q.cost;
      inQuery.push(rule);
    } else {
      localOnly.push(rule);
    }
  }

  const effectiveOrder = userOrder ? userOrder.replace(/^-/, "") : ORDER_TOKENS[s.order];
  const paging =
    !effectiveOrder || effectiveOrder === "order:id_desc" ? "cursor" : "numbered";

  return {
    query: parts.join(" "),
    tagCount: used,
    tagLimit,
    overLimit: countTags(base) > tagLimit,
    inQuery,
    localOnly,
    rules,
    paging,
  };
}
