"use client";

/** Following's ⋯ menu and its "Mark all as seen" check: their own chunk, loaded when one opens. */
import { CheckCheck, RotateCw } from "lucide-react";
import { getNav } from "@/nav/history";
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
      <Sheet title="Following" testId="sheet-following-menu" pop>
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
      </Sheet>
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
