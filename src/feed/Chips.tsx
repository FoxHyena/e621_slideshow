"use client";

/**
 * The chips row and its menus (UX §5 "Filters (chips row)"). A chip that isn't at its default is
 * filled and shows its value. Menus are sheets (history entries); choosing closes the sheet and
 * reloads the feed from the top.
 */
import { ChevronDown, X } from "lucide-react";
import { Component, lazy, Suspense, type ReactNode } from "react";
import { toast } from "sonner";
import { dateLabel, DEFAULT_FILTERS, isDefaultFilters, mediaLabel, scoreLabel, sortLabel, type Filters } from "@/lib/feed/filters";
import { getNav } from "@/nav/history";
import type { FilterSheetProps } from "./FilterSheets";

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
  dateAny,
}: {
  filters: Filters;
  chips: ChipId[];
  /** what an unset date means here (For You: its default ranking window) */
  dateAny?: string;
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
          <X aria-hidden strokeWidth={2.8} />
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
            return <Chip key={id} label={dateAny ?? "Date"} value={dateLabel(filters.date)} menu onClick={() => open(id)} testId="chip-date" />;
          case "score":
            return <Chip key={id} label="Score" value={scoreLabel(filters.minScore)} menu onClick={() => open(id)} testId="chip-score" />;
        }
      })}
    </div>
  );
}

const load = () => import("./FilterSheets");
let LazyFilterSheet = lazy(load);

/**
 * If the menus' code can't load (offline before it was fetched, or a deploy replaced it), close the
 * sheet and say so, instead of taking the screen down; the next tap tries the download again.
 */
class LoadFailed extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch() {
    LazyFilterSheet = lazy(load);
    toast("Couldn't load the filters. Check your connection and try again.");
    void getNav().back();
  }
  render() {
    return this.state.failed ? null : this.props.children;
  }
}

/** The open chip's menu, if `sheet` names one (its code loads when one opens). */
export function FilterSheet(props: FilterSheetProps) {
  if (!props.sheet?.startsWith(SHEET_PREFIX)) return null;
  return (
    <LoadFailed key={props.sheet}>
      <Suspense fallback={null}>
        <LazyFilterSheet {...props} />
      </Suspense>
    </LoadFailed>
  );
}
