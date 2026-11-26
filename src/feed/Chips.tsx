"use client";

/**
 * The chips row and its menus (UX §5 "Filters (chips row)"). A chip that isn't at its default is
 * filled and shows its value. Menus are sheets (history entries); choosing closes the sheet and
 * reloads the feed from the top.
 */
import { Check, ChevronDown, Shuffle } from "lucide-react";
import { useState } from "react";
import DatePanel from "@/components/DatePanel";
import {
  dateLabel,
  DEFAULT_FILTERS,
  isDefaultFilters,
  mediaLabel,
  SCORE_STEPS,
  scoreLabel,
  SORT_LABEL,
  SORT_MAIN,
  SORT_MORE,
  sortLabel,
  type Filters,
} from "@/lib/feed/filters";
import { DEFAULT_DATE_FILTER, type DateFilter, type DatePreset } from "@/lib/query/date";
import type { Order } from "@/lib/settings";
import { getNav } from "@/nav/history";
import { Sheet } from "@/shell/Sheet";

export type ChipId = "media" | "hideFaved" | "sort" | "date" | "score";
export const SHEET_PREFIX = "filter:";

function Chip({
  label,
  value,
  menu,
  pressed,
  onClick,
  testId,
}: {
  label: string;
  value: string | null;
  menu: boolean;
  pressed?: boolean;
  onClick: () => void;
  testId: string;
}) {
  const on = value !== null || pressed === true;
  return (
    <button
      type="button"
      className="chip"
      data-on={on || undefined}
      aria-pressed={menu ? undefined : on}
      aria-haspopup={menu ? "dialog" : undefined}
      onClick={onClick}
      data-testid={testId}
    >
      <span>{value ?? label}</span>
      {menu && <ChevronDown aria-hidden />}
    </button>
  );
}

export function ChipsRow({
  filters,
  chips,
  onChange,
  link,
}: {
  filters: Filters;
  chips: ChipId[];
  /** apply right away (toggles, Reset) */
  onChange: (f: Filters) => void;
  /** opened from an outside link: say so */
  link?: string | null;
}) {
  const open = (id: ChipId) => getNav().openSheet(SHEET_PREFIX + id);
  const reset = { ...DEFAULT_FILTERS, seed: filters.seed };
  return (
    <div className="chips" role="toolbar" aria-label="Filters" data-testid="chips">
      {!isDefaultFilters(filters) && (
        <button type="button" className="chip chip-reset" onClick={() => onChange(reset)} data-testid="chip-reset">
          Reset
        </button>
      )}
      {link && <span className="chip chip-static">{link}</span>}
      {chips.map((id) => {
        switch (id) {
          case "media":
            return <Chip key={id} label="Media" value={mediaLabel(filters.media)} menu onClick={() => open(id)} testId="chip-media" />;
          case "hideFaved":
            return (
              <Chip
                key={id}
                label="Hide favorited"
                value={null}
                pressed={filters.hideFaved}
                menu={false}
                onClick={() => onChange({ ...filters, hideFaved: !filters.hideFaved })}
                testId="chip-hide-faved"
              />
            );
          case "sort":
            return <Chip key={id} label="Sort" value={sortLabel(filters.order)} menu onClick={() => open(id)} testId="chip-sort" />;
          case "date":
            return <Chip key={id} label="Date" value={dateLabel(filters.date)} menu onClick={() => open(id)} testId="chip-date" />;
          case "score":
            return <Chip key={id} label="Score" value={scoreLabel(filters.minScore)} menu onClick={() => open(id)} testId="chip-score" />;
        }
      })}
    </div>
  );
}

function Option({ on, label, onPick, testId }: { on: boolean; label: string; onPick: () => void; testId?: string }) {
  return (
    <button type="button" role="radio" aria-checked={on} className="sheet-option" onClick={onPick} data-testid={testId}>
      <span>{label}</span>
      {on && <Check aria-hidden />}
    </button>
  );
}

const DATE_PRESETS: { id: DatePreset; label: string }[] = [
  { id: "today", label: "Today" },
  { id: "week", label: "This week" },
  { id: "month", label: "This month" },
];

/** The open chip's menu, if `sheet` names one. `apply` closes the sheet and reloads the feed. */
export function FilterSheet({ sheet, filters, apply }: { sheet: string | null; filters: Filters; apply: (f: Filters) => void }) {
  if (!sheet?.startsWith(SHEET_PREFIX)) return null;
  const id = sheet.slice(SHEET_PREFIX.length) as ChipId;
  switch (id) {
    case "media":
      return <MediaSheet filters={filters} apply={apply} />;
    case "sort":
      return (
        <Sheet title="Sort" testId="sheet-sort">
          <div role="radiogroup" aria-label="Sort">
            {SORT_MAIN.map((o) => (
              <Option key={o} on={filters.order === o} label={SORT_LABEL[o]} onPick={() => apply({ ...filters, order: o })} testId={`sort-${o}`} />
            ))}
            <p className="sheet-label">More</p>
            {SORT_MORE.map((o: Order) => (
              <Option key={o} on={filters.order === o} label={SORT_LABEL[o]} onPick={() => apply({ ...filters, order: o })} testId={`sort-${o}`} />
            ))}
          </div>
          {filters.order === "random" && (
            <button type="button" className="btn-tonal sheet-wide" onClick={() => apply({ ...filters, seed: filters.seed + 1 })}>
              <Shuffle aria-hidden /> Reshuffle
            </button>
          )}
        </Sheet>
      );
    case "date":
      return <DateSheet filters={filters} apply={apply} />;
    case "score":
      return <ScoreSheet filters={filters} apply={apply} />;
    default:
      return null;
  }
}

function MediaSheet({ filters, apply }: { filters: Filters; apply: (f: Filters) => void }) {
  const [m, setM] = useState(filters.media);
  const none = !m.image && !m.gif && !m.video;
  const kinds = [
    ["image", "Images"],
    ["gif", "GIFs"],
    ["video", "Videos"],
  ] as const;
  return (
    <Sheet
      title="Media"
      testId="sheet-media"
      footer={
        <button type="button" className="btn-gold sheet-wide" disabled={none} onClick={() => apply({ ...filters, media: m })} data-testid="media-done">
          {none ? "Pick at least one" : "Done"}
        </button>
      }
    >
      {kinds.map(([k, label]) => (
        <label key={k} className="sheet-option">
          <span>{label}</span>
          <input type="checkbox" className="switch" checked={m[k]} onChange={(e) => setM({ ...m, [k]: e.target.checked })} data-testid={`media-${k}`} />
        </label>
      ))}
    </Sheet>
  );
}

function DateSheet({ filters, apply }: { filters: Filters; apply: (f: Filters) => void }) {
  const d = filters.date;
  const preset = d.enabled && d.mode === "preset" ? d.preset : null;
  const [custom, setCustom] = useState<DateFilter | null>(d.enabled && preset === null ? d : null);
  const setDate = (date: DateFilter) => apply({ ...filters, date });
  return (
    <Sheet
      title="Date"
      testId="sheet-date"
      footer={
        custom && (
          <button type="button" className="btn-gold sheet-wide" onClick={() => setDate(custom)} data-testid="date-done">
            Done
          </button>
        )
      }
    >
      <div role="radiogroup" aria-label="Date">
        <Option on={!d.enabled && !custom} label="Any time" onPick={() => setDate({ ...d, enabled: false })} testId="date-any" />
        {DATE_PRESETS.map((p) => (
          <Option
            key={p.id}
            on={preset === p.id && !custom}
            label={p.label}
            onPick={() => setDate({ ...DEFAULT_DATE_FILTER, enabled: true, mode: "preset", preset: p.id })}
            testId={`date-${p.id}`}
          />
        ))}
        <Option
          on={custom !== null}
          label="Custom…"
          onPick={() => setCustom(custom ?? { ...DEFAULT_DATE_FILTER, enabled: true, mode: "within", amount: 30, unit: "days" })}
          testId="date-custom"
        />
      </div>
      {custom && (
        <div className="sheet-panel">
          <DatePanel value={custom} onChange={setCustom} />
        </div>
      )}
    </Sheet>
  );
}

function ScoreSheet({ filters, apply }: { filters: Filters; apply: (f: Filters) => void }) {
  const cur = filters.minScore;
  const preset = cur === null || (SCORE_STEPS as readonly number[]).includes(cur);
  const [custom, setCustom] = useState<string | null>(preset ? null : String(cur));
  const n = custom === null || custom.trim() === "" ? NaN : Number(custom);
  const ok = Number.isInteger(n);
  return (
    <Sheet
      title="Score"
      testId="sheet-score"
      footer={
        custom !== null && (
          <button type="button" className="btn-gold sheet-wide" disabled={!ok} onClick={() => apply({ ...filters, minScore: n })} data-testid="score-done">
            Done
          </button>
        )
      }
    >
      <div role="radiogroup" aria-label="Minimum score">
        <Option on={cur === null && custom === null} label="Any score" onPick={() => apply({ ...filters, minScore: null })} testId="score-any" />
        {SCORE_STEPS.map((s) => (
          <Option key={s} on={cur === s && custom === null} label={`≥ ${s}`} onPick={() => apply({ ...filters, minScore: s })} testId={`score-${s}`} />
        ))}
        <Option on={custom !== null} label="Custom…" onPick={() => setCustom(custom ?? String(cur ?? 0))} testId="score-custom" />
      </div>
      {custom !== null && (
        <label className="sheet-field">
          <span>At least</span>
          <input
            type="number"
            inputMode="numeric"
            className="field"
            value={custom}
            onChange={(e) => setCustom(e.target.value)}
            data-autofocus
            data-testid="score-input"
          />
        </label>
      )}
    </Sheet>
  );
}
