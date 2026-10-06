/** e621 range syntax: `x`, `a..b`, `x..`, `..x`, `>=x`, `>x`, `<=x`, `<x`. */
export interface NumRange {
  min?: number;
  max?: number;
  minExclusive?: boolean;
  maxExclusive?: boolean;
}

export function parseRange(raw: string, parseValue: (s: string) => number = Number): NumRange | null {
  const v = (s: string) => {
    const n = parseValue(s);
    return Number.isFinite(n) ? n : null;
  };
  let m: RegExpMatchArray | null;
  if ((m = raw.match(/^(>=|<=|>|<)(.+)$/))) {
    const n = v(m[2]);
    if (n === null) return null;
    if (m[1] === ">=") return { min: n };
    if (m[1] === ">") return { min: n, minExclusive: true };
    if (m[1] === "<=") return { max: n };
    return { max: n, maxExclusive: true };
  }
  if (raw.includes("..")) {
    const [a, b] = raw.split("..");
    const r: NumRange = {};
    if (a) {
      const n = v(a);
      if (n === null) return null;
      r.min = n;
    }
    if (b) {
      const n = v(b);
      if (n === null) return null;
      r.max = n;
    }
    return r;
  }
  const n = v(raw);
  return n === null ? null : { min: n, max: n };
}

export function inRange(n: number, r: NumRange): boolean {
  if (r.min !== undefined && (r.minExclusive ? n <= r.min : n < r.min)) return false;
  if (r.max !== undefined && (r.maxExclusive ? n >= r.max : n > r.max)) return false;
  return true;
}
