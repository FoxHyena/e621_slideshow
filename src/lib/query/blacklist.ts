import { allTags, type Post } from "../e621/types";
import { inRange, parseRange } from "./range";

/**
 * e621 blacklist semantics (wiki: e621:blacklist):
 * - one line = one rule; `#` starts a comment
 * - a post is hidden when it matches every plain term, none of the `-` terms,
 *   and at least one `~` term (if any)
 */
export interface BlacklistTerm {
  raw: string;
  negated: boolean;
  optional: boolean;
  /** term without its `-`/`~` prefix */
  value: string;
}

export interface BlacklistRule {
  line: string;
  terms: BlacklistTerm[];
}

export function parseBlacklist(text: string): BlacklistRule[] {
  const rules: BlacklistRule[] = [];
  const seen = new Set<string>();
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.replace(/#.*$/, "").trim().toLowerCase().split(/\s+/).join(" ");
    if (!line || seen.has(line)) continue;
    seen.add(line);
    const terms = line.split(" ").map((raw): BlacklistTerm => {
      if (raw.startsWith("-") && raw.length > 1)
        return { raw, negated: true, optional: false, value: raw.slice(1) };
      if (raw.startsWith("~") && raw.length > 1)
        return { raw, negated: false, optional: true, value: raw.slice(1) };
      return { raw, negated: false, optional: false, value: raw };
    });
    rules.push({ line, terms });
  }
  return rules;
}

/** Merge two blacklist texts line-by-line, keeping order and dropping duplicates. */
export function mergeBlacklists(current: string, incoming: string): string {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const raw of [...current.split(/\r?\n/), ...incoming.split(/\r?\n/)]) {
    const line = raw.trim();
    const key = line.toLowerCase().split(/\s+/).join(" ");
    if (!line || seen.has(key)) continue;
    seen.add(key);
    out.push(line);
  }
  return out.join("\n");
}

/** Drop every line of `text` that also appears in `remove` (same normalization as merge). */
export function removeBlacklistLines(text: string, remove: string): string {
  const norm = (l: string) => l.trim().toLowerCase().split(/\s+/).join(" ");
  const drop = new Set(remove.split(/\r?\n/).map(norm).filter(Boolean));
  return text
    .split(/\r?\n/)
    .filter((l) => l.trim() && !drop.has(norm(l)))
    .join("\n");
}

/**
 * Sync the local blacklist with the account's. e621's anonymous defaults and
 * whatever the account contributed last time are swapped for the account's
 * current list; lines the user added locally are kept.
 */
export function syncAccountBlacklist(current: string, previousAccount: string, account: string): string {
  const custom = removeBlacklistLines(removeBlacklistLines(current, DEFAULT_BLACKLIST), previousAccount);
  return mergeBlacklists(custom, account);
}

export interface MatchContext {
  username?: string;
}

const RATING_ALIASES: Record<string, string> = {
  s: "s",
  safe: "s",
  q: "q",
  questionable: "q",
  e: "e",
  explicit: "e",
};

function parseFileSize(s: string): number {
  const m = s.match(/^(\d+(?:\.\d+)?)(kb|mb|b)?$/i);
  if (!m) return NaN;
  const n = parseFloat(m[1]);
  const unit = (m[2] ?? "b").toLowerCase();
  return unit === "mb" ? n * 1024 * 1024 : unit === "kb" ? n * 1024 : n;
}

function wildcardToRegExp(pattern: string): RegExp {
  const escaped = pattern.replace(/[.+?^${}()|[\]\\]/g, "\\$&").replace(/\*/g, ".*");
  return new RegExp(`^${escaped}$`);
}

/** Does a single (unprefixed) term match the post? */
export function termMatches(
  value: string,
  post: Post,
  tagSet: Set<string>,
  ctx: MatchContext = {},
): boolean {
  const colon = value.indexOf(":");
  if (colon > 0) {
    const key = value.slice(0, colon);
    const arg = value.slice(colon + 1);
    const num = (n: number, parse?: (s: string) => number) => {
      const r = parseRange(arg, parse);
      return r ? inRange(n, r) : false;
    };
    switch (key) {
      case "rating":
        return RATING_ALIASES[arg] !== undefined && post.rating === RATING_ALIASES[arg];
      case "type":
        return post.file.ext === arg;
      case "id":
        return num(post.id);
      case "score":
        return num(post.score.total);
      case "favcount":
        return num(post.fav_count);
      case "width":
        return num(post.file.width);
      case "height":
        return num(post.file.height);
      case "filesize":
        return num(post.file.size, parseFileSize);
      case "tagcount":
        return num(tagSet.size);
      case "status":
        if (arg === "deleted") return !!post.flags?.deleted;
        if (arg === "pending") return !!post.flags?.pending;
        if (arg === "flagged") return !!post.flags?.flagged;
        return false;
      case "user":
      case "uploader":
      case "username":
        return (post.uploader_name ?? "").toLowerCase() === arg;
      case "userid":
        return String(post.uploader_id) === arg;
      case "pool":
        return (post.pools ?? []).map(String).includes(arg);
      case "fav":
        return arg === "me" || (ctx.username ?? "").toLowerCase() === arg ? post.is_favorited : false;
      default:
        // Unknown metatag: treat as a literal tag (e.g. tags containing colons).
        break;
    }
  }
  if (value.includes("*")) {
    const re = wildcardToRegExp(value);
    for (const t of tagSet) if (re.test(t)) return true;
    return false;
  }
  return tagSet.has(value);
}

export function ruleMatches(rule: BlacklistRule, post: Post, tagSet: Set<string>, ctx?: MatchContext): boolean {
  let anyOptional = false;
  let optionalHit = false;
  for (const term of rule.terms) {
    const hit = termMatches(term.value, post, tagSet, ctx);
    if (term.optional) {
      anyOptional = true;
      if (hit) optionalHit = true;
    } else if (term.negated) {
      if (hit) return false;
    } else if (!hit) {
      return false;
    }
  }
  return !anyOptional || optionalHit;
}

/** Returns the first rule that hides this post, or null. */
export function blacklistedBy(rules: BlacklistRule[], post: Post, ctx?: MatchContext): BlacklistRule | null {
  if (rules.length === 0) return null;
  const tagSet = new Set(allTags(post));
  for (const rule of rules) if (ruleMatches(rule, post, tagSet, ctx)) return rule;
  return null;
}

/**
 * Translate a rule into query tokens that exclude it server-side, or null if
 * it can't be expressed safely (wildcards: e621 allows only one per search;
 * `fav:` depends on who is logged in; a rule of only `-` terms would exclude
 * nearly everything).
 */
export function ruleToQuery(rule: BlacklistRule): { query: string; cost: number } | null {
  if (rule.terms.some((t) => t.value.includes("*") || t.value.startsWith("fav:"))) return null;
  if (rule.terms.every((t) => t.negated)) return null;
  if (rule.terms.length === 1) {
    const t = rule.terms[0];
    return { query: `-${t.value}`, cost: 1 };
  }
  return { query: `-( ${rule.terms.map((t) => t.raw).join(" ")} )`, cost: rule.terms.length };
}

/** e621's anonymous default blacklist. */
export const DEFAULT_BLACKLIST = [
  "gore",
  "snuff",
  "rape",
  "young -rating:s",
  "diaper -rating:s",
  "feces",
  "urine",
  "fart_fetish",
  "realistic_feral rating:e",
  "politics",
].join("\n");
