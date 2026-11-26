"use client";

/**
 * The chips row and its menus (UX §5 "Filters (chips row)"). A chip that isn't at its default is
 * filled and shows its value. Menus are sheets (history entries); choosing closes the sheet and
 * reloads the feed from the top.
 */
import { ChevronDown, Link2, X } from "lucide-react";
import { Component, lazy, Suspense, type ReactNode } from "react";
import { toast } from "sonner";
import { dateLabel, DEFAULT_FILTERS, isDefaultFilters, mediaLabel, scoreLabel, sortLabel, type Filters } from "@/lib/feed/filters";
import { getNav } from "@/nav/history";
import { useScreen } from "@/shell/context";
import type { FilterSheetProps } from "./FilterSheets";

export type ChipId = "media" | "hideFaved" | "sort" | "date" | "score";
export const SHEET_PREFIX = "filter:";
/** the "From a link" chip's menu (its sheet name and `data-menu`) */
export const LINK_MENU = "from-link";

function Chip({
  label,
  value,
  menu,
  pressed,
  onClick,
  testId,
  name,
  open,
}: {
  label: string;
  value: string | null;
  menu: boolean;
  pressed?: boolean;
  onClick: () => void;
  testId: string;
  /** the menu's name (`data-menu`), which its dropdown hangs under */
  name?: string;
  open?: boolean;
}) {
  const on = value !== null || pressed === true;
  return (
    <button
      type="button"
      className="chip"
      data-on={on || undefined}
      aria-pressed={menu ? undefined : on}
      aria-haspopup={menu ? "dialog" : undefined}
      aria-expanded={menu ? !!open : undefined}
      data-menu={name}
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
  onLink,
  dateAny,
}: {
  filters: Filters;
  chips: ChipId[];
  /** what an unset date means here (For You: its default ranking window) */
  dateAny?: string;
  /** apply right away (toggles, Reset) */
  onChange: (f: Filters) => void;
  /** opened from an outside link: the on chip that opens what the link set */
  onLink?: (() => void) | null;
}) {
  const open = (id: ChipId) => getNav().openSheet(SHEET_PREFIX + id);
  // the open menu's chip points its arrow up (DESIGN.md "Chip dropdown")
  const { sheet } = useScreen();
  const menu = (id: ChipId) => ({ name: SHEET_PREFIX + id, open: sheet === SHEET_PREFIX + id });
  const reset = { ...DEFAULT_FILTERS, seed: filters.seed };
  return (
    <div className="chips" role="toolbar" aria-label="Filters" data-testid="chips">
      {onLink && (
        <button
          type="button"
          className="chip chip-link"
          data-on
          aria-haspopup="dialog"
          aria-expanded={sheet === LINK_MENU}
          data-menu={LINK_MENU}
          onClick={onLink}
          data-testid="chip-link"
        >
          <Link2 aria-hidden className="chip-link-icon" />
          <span>From a link</span>
          <ChevronDown aria-hidden />
        </button>
      )}
      {!isDefaultFilters(filters) && (
        <button type="button" className="chip chip-reset" onClick={() => onChange(reset)} data-testid="chip-reset">
          <X aria-hidden strokeWidth={2.8} />
          Reset
        </button>
      )}
      {chips.map((id) => {
        switch (id) {
          case "media":
            return <Chip key={id} label="Media" value={mediaLabel(filters.media)} menu {...menu(id)} onClick={() => open(id)} testId="chip-media" />;
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
            return <Chip key={id} label="Sort" value={sortLabel(filters.order)} menu {...menu(id)} onClick={() => open(id)} testId="chip-sort" />;
          case "date":
            return <Chip key={id} label={dateAny ?? "Date"} value={dateLabel(filters.date)} menu {...menu(id)} onClick={() => open(id)} testId="chip-date" />;
          case "score":
            return <Chip key={id} label="Score" value={scoreLabel(filters.minScore)} menu {...menu(id)} onClick={() => open(id)} testId="chip-score" />;
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
    toast.error("Couldn't load the filters. Check your connection and try again.");
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
