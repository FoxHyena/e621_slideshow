"use client";

/** The targets over a held tag: their own chunk, loaded when a tag is first held (and at idle). */
import { useEffect, useLayoutEffect, useRef } from "react";
import { Ban, Pin, Search, UserRound } from "lucide-react";
import type { TagCategoryName } from "@/lib/e621/types";
import { GAP_PX, TARGET_H, type TagAction, type TagHold } from "./TagActions";

const LABEL: Record<TagAction, string> = { open: "Open", search: "Search", pin: "Pin", blacklist: "Blacklist" };
const ICON: Record<TagAction, typeof Ban> = { open: UserRound, search: Search, pin: Pin, blacklist: Ban };

/**
 * The targets over a held tag: raised capsules 8 above it (below when there's no room), centred on
 * it and kept 8 inside the screen. `targets` picks them for the tag's kind; without it (the legacy
 * app), Search and Blacklist, with Search labelled Pin on a recommended feed.
 */
export default function TagActionsOverlay({
  hold,
  recommended,
  onAction,
  targets,
}: {
  hold: TagHold;
  recommended: boolean;
  onAction: (tag: string, action: TagAction) => void;
  targets?: (category: TagCategoryName) => TagAction[];
}) {
  const { held } = hold;
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!held || held.dragging) return;
    // Capture, so Esc closes the targets before it reaches the app (which would close the feed).
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      e.preventDefault();
      e.stopImmediatePropagation();
      hold.close();
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [held, hold]);
  // Centre on the tag, then keep the row inside the screen.
  useLayoutEffect(() => {
    const el = box.current;
    if (!el || !held) return;
    const w = el.offsetWidth;
    el.style.left = `${Math.min(Math.max(held.cx - w / 2, GAP_PX), window.innerWidth - GAP_PX - w)}px`;
  }, [held]);
  if (!held) return null;

  const list = targets ? targets(held.category) : (["search", "blacklist"] as TagAction[]);
  const legacyPin = !targets && recommended;
  const above = held.top - GAP_PX - TARGET_H >= GAP_PX;
  const pick = (a: TagAction) => {
    hold.close();
    onAction(held.tag, a);
  };

  return (
    <>
      {/* A tap anywhere else closes them; while dragging, the pointer goes through. */}
      <div className="tag-catch" data-drag={held.dragging || undefined} onPointerDown={hold.close} data-testid="tag-actions-backdrop" />
      <div
        ref={box}
        className="tag-targets"
        style={{ left: held.cx, top: above ? held.top - GAP_PX - TARGET_H : held.bottom + GAP_PX }}
        role="dialog"
        aria-label={`Actions for ${held.tag.replaceAll("_", " ")}`}
        data-testid="tag-actions"
      >
        {list.map((a) => {
          const Icon = legacyPin && a === "search" ? Pin : ICON[a];
          return (
            <button
              key={a}
              type="button"
              ref={(el) => {
                hold.targets.current[a] = el;
              }}
              className="tag-target"
              data-danger={a === "blacklist" || undefined}
              onClick={() => pick(a)}
              data-testid={`tag-action-${a}`}
              data-hot={held.hover === a}
            >
              <Icon aria-hidden strokeWidth={2.2} />
              {legacyPin && a === "search" ? "Pin" : LABEL[a]}
            </button>
          );
        })}
      </div>
    </>
  );
}

