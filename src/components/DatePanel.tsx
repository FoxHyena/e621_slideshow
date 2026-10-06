"use client";

import { dateMetatag, type DateFilter, type DateMode, type DatePreset, type DateUnit } from "@/lib/query/date";

const MODES: { id: DateMode; label: string }[] = [
  { id: "preset", label: "Quick" },
  { id: "within", label: "Last…" },
  { id: "on", label: "On" },
  { id: "after", label: "After" },
  { id: "before", label: "Before" },
  { id: "between", label: "Between" },
];

const PRESETS: { id: DatePreset; label: string }[] = [
  { id: "today", label: "Today" },
  { id: "yesterday", label: "Yesterday" },
  { id: "week", label: "Past week" },
  { id: "month", label: "Past month" },
  { id: "year", label: "Past year" },
];

const UNITS: DateUnit[] = ["days", "weeks", "months", "years"];

const input =
  "rounded-md border border-line bg-black/40 px-2 py-1.5 text-sm text-neutral-100 focus:border-accent focus:outline-none [color-scheme:dark]";

export default function DatePanel({ value, onChange }: { value: DateFilter; onChange: (v: DateFilter) => void }) {
  const set = (patch: Partial<DateFilter>) => onChange({ ...value, ...patch });
  const tag = dateMetatag(value);

  return (
    <div className="space-y-3">
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={value.enabled}
          onChange={(e) => set({ enabled: e.target.checked })}
          className="size-4 accent-accent"
          data-testid="date-enabled"
        />
        Filter by upload date
      </label>

      {value.enabled && (
        <>
          <div className="flex flex-wrap gap-1" role="radiogroup" aria-label="Date mode">
            {MODES.map((m) => (
              <button
                key={m.id}
                type="button"
                role="radio"
                aria-checked={value.mode === m.id}
                onClick={() => set({ mode: m.id })}
                className={`rounded-md px-2.5 py-1 text-xs ${
                  value.mode === m.id ? "bg-accent font-semibold text-black" : "bg-white/5 text-neutral-300 hover:bg-white/10"
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>

          {value.mode === "preset" && (
            <div className="flex flex-wrap gap-1">
              {PRESETS.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  aria-pressed={value.preset === p.id}
                  onClick={() => set({ preset: p.id })}
                  className={`rounded-full border px-3 py-1 text-xs ${
                    value.preset === p.id ? "border-accent text-accent" : "border-line text-neutral-300 hover:border-neutral-400"
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          )}

          {value.mode === "within" && (
            <div className="flex items-center gap-2 text-sm">
              <span className="text-neutral-400">Last</span>
              <input
                type="number"
                min={1}
                value={value.amount}
                onChange={(e) => set({ amount: Number(e.target.value) })}
                className={`${input} w-20`}
                aria-label="Amount"
              />
              <select
                value={value.unit}
                onChange={(e) => set({ unit: e.target.value as DateUnit })}
                className={input}
                aria-label="Unit"
              >
                {UNITS.map((u) => (
                  <option key={u} value={u}>
                    {u}
                  </option>
                ))}
              </select>
            </div>
          )}

          {(value.mode === "on" || value.mode === "after" || value.mode === "before" || value.mode === "between") && (
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <input
                type="date"
                value={value.date}
                onChange={(e) => set({ date: e.target.value })}
                className={input}
                aria-label={value.mode === "between" ? "Start date" : "Date"}
                data-testid="date-input"
              />
              {value.mode === "between" && (
                <>
                  <span className="text-neutral-400">to</span>
                  <input
                    type="date"
                    value={value.date2}
                    onChange={(e) => set({ date2: e.target.value })}
                    className={input}
                    aria-label="End date"
                    data-testid="date-input-2"
                  />
                </>
              )}
            </div>
          )}

          <p className="text-xs text-neutral-400">
            {tag ? (
              <>
                Adds <code className="rounded bg-black/40 px-1 font-mono text-accent">{tag}</code>
              </>
            ) : (
              "Pick a date to apply this filter."
            )}
          </p>
        </>
      )}
    </div>
  );
}
