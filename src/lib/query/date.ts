export type DateMode = "preset" | "on" | "after" | "before" | "between" | "within";
export type DatePreset = "today" | "yesterday" | "week" | "month" | "year";
export type DateUnit = "days" | "weeks" | "months" | "years";

export interface DateFilter {
  enabled: boolean;
  mode: DateMode;
  preset: DatePreset;
  /** YYYY-MM-DD */
  date: string;
  /** YYYY-MM-DD, end of a `between` range (inclusive) */
  date2: string;
  amount: number;
  unit: DateUnit;
}

export const DEFAULT_DATE_FILTER: DateFilter = {
  enabled: false,
  mode: "preset",
  preset: "week",
  date: "",
  date2: "",
  amount: 30,
  unit: "days",
};

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/** Next calendar day, computed in UTC so local DST can't shift it. */
export function nextDay(iso: string): string {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10);
}

/**
 * Build the `date:` metatag for a filter, or null if disabled/incomplete.
 * e621 treats the end of `a..b` as exclusive at midnight, so `between`
 * extends the end by one day to make the picked end date inclusive.
 */
export function dateMetatag(f: DateFilter): string | null {
  if (!f.enabled) return null;
  switch (f.mode) {
    case "preset":
      return `date:${f.preset}`;
    case "on":
      return ISO_DATE.test(f.date) ? `date:${f.date}` : null;
    case "after":
      return ISO_DATE.test(f.date) ? `date:>=${f.date}` : null;
    case "before":
      return ISO_DATE.test(f.date) ? `date:<${f.date}` : null;
    case "between": {
      if (!ISO_DATE.test(f.date) || !ISO_DATE.test(f.date2)) return null;
      const [a, b] = f.date <= f.date2 ? [f.date, f.date2] : [f.date2, f.date];
      return `date:${a}..${nextDay(b)}`;
    }
    case "within": {
      const n = Math.floor(f.amount);
      if (!Number.isFinite(n) || n < 1) return null;
      return `date:>=${n}_${f.unit}_ago`;
    }
  }
}
