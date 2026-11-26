"use client";

/**
 * The chips' menus (UX §5 "Filters (chips row)", DESIGN.md "Menu", "Media menu", "Chip dropdown"), each
 * dropped under its chip. Sort, Date and Score are menus: tapping a row applies it and closes the menu;
 * only Custom… needs Apply (tonal: Play keeps the screen's one gold). Media is three switches, since more
 * than one can be on: what changed applies as it closes (one reload). Loaded when a chip opens one.
 */
import { ArrowUp, CalendarDays, Clapperboard, Film, Image as ImageIcon, Shuffle } from "lucide-react";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Menu, MenuRow, MenuSep } from "@/components/Menu";
import { Seg } from "@/components/v6";
import { SCORE_STEPS, SORT_LABEL, SORT_MAIN, SORT_MORE, type Filters } from "@/lib/feed/filters";
import { dateMetatag, DEFAULT_DATE_FILTER, type DateFilter, type DateMode, type DatePreset, type DateUnit } from "@/lib/query/date";
import { getNav, openSheetName } from "@/nav/history";
import { Dropdown } from "@/shell/Dropdown";
import { SHEET_PREFIX, type ChipId } from "./Chips";

/** Focus a field as it appears (Custom… shows it after the sheet has opened). */
const focusOnMount = (el: HTMLInputElement | null) => void el?.focus({ preventScroll: true });

export interface FilterSheetProps {
  sheet: string | null;
  filters: Filters;
  /** closes the sheet and reloads the feed */
  apply: (f: Filters) => void;
  /** what an unset date means here (For You: its default ranking window) */
  dateAny?: string;
}

export default function FilterSheet({ sheet, filters, apply, dateAny }: FilterSheetProps) {
  if (!sheet?.startsWith(SHEET_PREFIX)) return null;
  switch (sheet.slice(SHEET_PREFIX.length) as ChipId) {
    case "media":
      return <MediaSheet filters={filters} apply={apply} />;
    case "sort":
      return <SortSheet filters={filters} apply={apply} />;
    case "date":
      return <DateSheet filters={filters} apply={apply} anyLabel={dateAny ?? "Any time"} />;
    case "score":
      return <ScoreSheet filters={filters} apply={apply} />;
    default:
      return null;
  }
}

function SortSheet({ filters, apply }: { filters: Filters; apply: (f: Filters) => void }) {
  const row = (o: (typeof SORT_MAIN)[number] | (typeof SORT_MORE)[number]) => (
    <MenuRow
      key={o}
      on={filters.order === o}
      onPick={() => apply({ ...filters, order: o })}
      testId={`sort-${o}`}
      action={
        o === "random" && (
          <button type="button" className="menu-act" onClick={() => apply({ ...filters, seed: filters.seed + 1 })} data-testid="sort-reshuffle">
            <Shuffle aria-hidden strokeWidth={2.4} />
            Reshuffle
          </button>
        )
      }
    >
      {SORT_LABEL[o]}
    </MenuRow>
  );
  return (
    <Dropdown anchor={SHEET_PREFIX + "sort"} label="Sort" width={220} menu testId="sheet-sort">
      <Menu label="Sort">
        {SORT_MAIN.map(row)}
        <MenuSep />
        {SORT_MORE.map(row)}
      </Menu>
    </Dropdown>
  );
}

const KINDS = [
  { key: "image", label: "Images", icon: ImageIcon },
  { key: "gif", label: "GIFs", icon: Clapperboard },
  { key: "video", label: "Videos", icon: Film },
] as const;

/** Three switches: more than one can be on, never none (the last one on can't be turned off). What
 * changed applies as the menu closes: one reload, however many switches moved. */
function MediaSheet({ filters, apply }: { filters: Filters; apply: (f: Filters) => void }) {
  const [m, setM] = useState(filters.media);
  const ons = Number(m.image) + Number(m.gif) + Number(m.video);
  const was = filters.media;
  const changed = m.image !== was.image || m.gif !== was.gif || m.video !== was.video;
  // Back (the browser's, a phone's) closes it too, and applies what changed, as a tap outside does
  const closed = useRef(false);
  const late = useRef({ changed, f: { ...filters, media: m }, apply });
  useLayoutEffect(() => {
    late.current = { changed, f: { ...filters, media: m }, apply };
  });
  useEffect(
    () => () => {
      const { changed, f, apply } = late.current;
      if (!changed || closed.current || openSheetName() === SHEET_PREFIX + "media") return;
      setTimeout(() => apply(f));
    },
    [],
  );
  return (
    <Dropdown
      anchor={SHEET_PREFIX + "media"}
      label="Media"
      width={260}
      testId="sheet-media"
      onClose={() => {
        closed.current = true;
        if (changed) apply({ ...filters, media: m });
        else void getNav().back();
      }}
    >
      <div className="sheet-rows" data-wells>
        {KINDS.map(({ key, label, icon: Icon }) => (
          <label key={key} className="list-row">
            <span className="row-well" aria-hidden>
              <Icon />
            </span>
            <span className="row-text">
              <b>{label}</b>
            </span>
            <input
              type="checkbox"
              role="switch"
              className="switch"
              checked={m[key]}
              disabled={m[key] && ons === 1}
              aria-describedby={m[key] && ons === 1 ? "media-last" : undefined}
              onChange={(e) => setM({ ...m, [key]: e.target.checked })}
              data-testid={`media-${key}`}
            />
          </label>
        ))}
      </div>
      <p id="media-last" className="sr-only">
        One kind stays on.
      </p>
    </Dropdown>
  );
}

const DATE_PRESETS: { id: DatePreset; label: string }[] = [
  { id: "today", label: "Today" },
  { id: "week", label: "This week" },
  { id: "month", label: "This month" },
];

type CustomMode = Exclude<DateMode, "preset">;
const CUSTOM_MODES: { value: CustomMode; label: string }[] = [
  { value: "on", label: "On" },
  { value: "after", label: "After" },
  { value: "before", label: "Before" },
  { value: "between", label: "Between" },
  { value: "within", label: "Last" },
];
const UNITS: { value: DateUnit; label: string }[] = [
  { value: "days", label: "days" },
  { value: "weeks", label: "weeks" },
  { value: "months", label: "months" },
  { value: "years", label: "years" },
];

function DateField({ label, value, onChange, testId }: { label: string; value: string; onChange: (v: string) => void; testId: string }) {
  return (
    <label className="field-label">
      <span>{label}</span>
      <span className="field6" data-has={value ? "" : undefined}>
        <CalendarDays aria-hidden />
        <input type="date" value={value} onChange={(e) => onChange(e.target.value)} data-testid={testId} />
      </span>
    </label>
  );
}

function DateSheet({ filters, apply, anyLabel }: { filters: Filters; apply: (f: Filters) => void; anyLabel: string }) {
  const d = filters.date;
  const preset = d.enabled && d.mode === "preset" ? d.preset : null;
  const [custom, setCustom] = useState<DateFilter | null>(d.enabled && d.mode !== "preset" ? d : null);
  const setDate = (date: DateFilter) => apply({ ...filters, date });
  const set = (patch: Partial<DateFilter>) => custom && setCustom({ ...custom, ...patch });
  return (
    <Dropdown anchor={SHEET_PREFIX + "date"} label="Date" width={custom ? 343 : 220} menu testId="sheet-date">
      <Menu label="Date">
        <MenuRow on={!d.enabled && !custom} onPick={() => setDate({ ...d, enabled: false })} testId="date-any">
          {anyLabel}
        </MenuRow>
        {DATE_PRESETS.map((p) => (
          <MenuRow
            key={p.id}
            on={preset === p.id && !custom}
            onPick={() => setDate({ ...DEFAULT_DATE_FILTER, enabled: true, mode: "preset", preset: p.id })}
            testId={`date-${p.id}`}
          >
            {p.label}
          </MenuRow>
        ))}
        <MenuRow
          on={custom !== null}
          onPick={() => setCustom(custom ?? { ...DEFAULT_DATE_FILTER, enabled: true, mode: "within", amount: 30, unit: "days" })}
          testId="date-custom"
        >
          Custom…
        </MenuRow>
      </Menu>
      {custom && (
        <div className="menu-custom">
          <Seg
            label="Kind of date"
            options={CUSTOM_MODES}
            value={custom.mode as CustomMode}
            onChange={(mode) => set({ mode })}
            testId="date-mode"
          />
          {custom.mode === "between" ? (
            <div className="field-pair">
              <DateField label="From" value={custom.date} onChange={(date) => set({ date })} testId="date-input" />
              <DateField label="To" value={custom.date2} onChange={(date2) => set({ date2 })} testId="date-input-2" />
            </div>
          ) : custom.mode === "within" ? (
            <div className="field-label">
              <span id="date-last">In the last</span>
              <div className="field-n">
                <span className="field6">
                  <input
                    type="number"
                    inputMode="numeric"
                    min={1}
                    aria-labelledby="date-last"
                    value={custom.amount}
                    onChange={(e) => set({ amount: Number(e.target.value) })}
                    data-testid="date-amount"
                  />
                </span>
                <Seg label="Unit" big options={UNITS} value={custom.unit} onChange={(unit) => set({ unit })} testId="date-unit" />
              </div>
            </div>
          ) : (
            <DateField label="Date" value={custom.date} onChange={(date) => set({ date })} testId="date-input" />
          )}
          <button type="button" className="btn-tonal sheet-wide" disabled={!dateMetatag(custom)} onClick={() => setDate(custom)} data-testid="date-done">
            Apply
          </button>
        </div>
      )}
    </Dropdown>
  );
}

function ScoreSheet({ filters, apply }: { filters: Filters; apply: (f: Filters) => void }) {
  const cur = filters.minScore;
  const preset = cur === null || (SCORE_STEPS as readonly number[]).includes(cur);
  const [custom, setCustom] = useState<string | null>(preset ? null : String(cur));
  const n = custom === null || custom.trim() === "" ? NaN : Number(custom);
  const ok = Number.isInteger(n);
  return (
    <Dropdown anchor={SHEET_PREFIX + "score"} label="Minimum score" width={220} menu testId="sheet-score">
      <Menu label="Minimum score">
        <MenuRow on={cur === null && custom === null} onPick={() => apply({ ...filters, minScore: null })} testId="score-any">
          Any
        </MenuRow>
        {SCORE_STEPS.map((s) => (
          <MenuRow key={s} on={cur === s && custom === null} onPick={() => apply({ ...filters, minScore: s })} testId={`score-${s}`}>
            ≥ {s}
          </MenuRow>
        ))}
        <MenuRow on={custom !== null} onPick={() => setCustom(custom ?? String(cur ?? 0))} testId="score-custom">
          Custom…
        </MenuRow>
      </Menu>
      {custom !== null && (
        <div className="menu-custom">
          <label className="field-label">
            <span>At least</span>
            <span className="field6" data-has={custom ? "" : undefined}>
              <ArrowUp aria-hidden className="field-icon-score" />
              <input type="number" inputMode="numeric" value={custom} onChange={(e) => setCustom(e.target.value)} ref={focusOnMount} data-autofocus data-testid="score-input" />
            </span>
          </label>
          <button type="button" className="btn-tonal sheet-wide" disabled={!ok} onClick={() => apply({ ...filters, minScore: n })} data-testid="score-done">
            Apply
          </button>
        </div>
      )}
    </Dropdown>
  );
}
