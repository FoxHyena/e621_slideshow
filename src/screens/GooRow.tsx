"use client";

/**
 * The goo row in Settings (DESIGN.md "Tab bar goo", "The pool on a phone", "The goo row in Settings
 * on a computer"): "Goo" (owner, 2026-11-26: "Goo, everywhere"), its count and Wipe clean.
 *
 * On a phone the row's card is a jar (owner-picked, "jar row"): the goo rises inside it, the words
 * show through in Goo Ink, and Wipe clean sits above the goo. On a computer it is a plain row, the
 * last group of the page (owner: "Approve"): the sidebar's pool is the jar there, and it drains when
 * Wipe clean is pressed.
 */
import { Droplets } from "lucide-react";
import { Pool } from "@/components/Pool";
import { getGoo, gooLabel } from "@/state/goo";
import { useStore } from "@/state/store";

export function GooRow({ jar }: { jar: boolean }) {
  const goo = getGoo();
  const n = useStore(goo.store, (s) => s.count);
  const row = (ink: boolean) => (
    <>
      <span className={ink ? "row-well pool-ring" : "row-well"} aria-hidden>
        <Droplets />
      </span>
      <span className="row-text">
        <b>Goo</b>
        <small data-testid={ink ? undefined : "goo-count"}>{gooLabel(n)}</small>
      </span>
    </>
  );
  return (
    <div className={jar ? "list-group goo-jar" : "list-group"} role="group" aria-label="Goo">
      <div className="list-row" data-testid="goo-row">
        {row(false)}
        <button type="button" className="btn-tonal" data-size="compact" onClick={() => goo.wipe()} disabled={n === 0} data-testid="goo-wipe">
          Wipe clean
        </button>
      </div>
      {jar && (
        <Pool
          kind="jar"
          className="jar-pool"
          ink={
            <span className="list-row">
              {row(true)}
              <span className="btn-tonal" data-size="compact" style={{ visibility: "hidden" }}>
                Wipe clean
              </span>
            </span>
          }
        />
      )}
    </div>
  );
}
