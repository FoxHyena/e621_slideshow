"use client";

/** Following's ⋯ menu (a dropdown, DESIGN.md "A screen's ⋯ menu") and its "Mark all as seen" check: their own chunk, loaded when one opens. */
import { CheckCheck, RotateCw } from "lucide-react";
import { getNav } from "@/nav/history";
import { Dropdown } from "@/shell/Dropdown";
import { Sheet, SheetAction } from "@/shell/Sheet";

export default function FollowingSheets({
  sheet,
  count,
  canMark,
  onRefresh,
  onMark,
}: {
  sheet: string;
  /** the new count, as the line under the title says it ("12" or "12+") */
  count: { n: number; more: boolean };
  canMark: boolean;
  onRefresh: () => void;
  onMark: () => void;
}) {
  if (sheet === "menu")
    return (
      <Dropdown anchor="menu" label="Following" width={260} testId="sheet-following-menu">
        <div className="sheet-rows" data-wells>
          <SheetAction
            icon={RotateCw}
            label="Refresh"
            onClick={async () => {
              await getNav().back();
              onRefresh();
            }}
            data-testid="following-refresh"
          />
          <SheetAction
            icon={CheckCheck}
            label="Mark all as seen"
            disabled={!canMark}
            onClick={async () => {
              await getNav().back();
              getNav().openSheet("mark-all");
            }}
            data-testid="following-mark-all"
          />
        </div>
      </Dropdown>
    );
  const { n, more } = count;
  return (
    <Sheet
      title="Mark all as seen"
      testId="sheet-mark-all"
      footer={
        <div className="sheet-actions">
          <button type="button" className="btn-tonal" onClick={() => void getNav().back()}>
            Cancel
          </button>
          <button
            type="button"
            className="btn-gold"
            onClick={async () => {
              await getNav().back();
              onMark();
            }}
            data-testid="mark-all-confirm"
          >
            Mark as seen
          </button>
        </div>
      }
    >
      <p className="sheet-note">
        Mark {more ? `${n}+` : n} new {n === 1 && !more ? "post" : "posts"} as seen on e621? This can&rsquo;t be undone.
      </p>
    </Sheet>
  );
}
