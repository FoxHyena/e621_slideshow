"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Ban, Pin, Search, UserRound } from "lucide-react";
import { TAG_CATEGORY_COLORS, type TagCategoryName } from "@/lib/e621/types";

/** What a held tag offers (DESIGN.md "Tag targets"): never more than three at once. */
export type TagAction = "open" | "search" | "pin" | "blacklist";
const ACTIONS: TagAction[] = ["open", "search", "pin", "blacklist"];

/** Hold a tag this long to pick it up. */
const HOLD_MS = 450;
/** Moving further than this before the hold lands is a scroll, not a hold. */
const SLOP_PX = 10;
/** Extra reach around each target, so a drag doesn't have to be exact. */
const HIT_PAD_PX = 18;
/** Targets sit this far from the tag, from each other, and inside the screen's edges. */
const GAP_PX = 8;
const TARGET_H = 44;

interface Held {
  tag: string;
  category: TagCategoryName;
  /** the tag's box on screen when it was picked up */
  cx: number;
  top: number;
  bottom: number;
  /** finger/button still down: a drag in progress */
  dragging: boolean;
  hover: TagAction | null;
}

export interface TagHold {
  held: Held | null;
  close: () => void;
  onPointerDown: (e: React.PointerEvent<HTMLElement>, tag: string, category: TagCategoryName) => void;
  onClick: (e: React.MouseEvent<HTMLElement>, tag: string, category: TagCategoryName) => void;
  targets: React.RefObject<Record<TagAction, HTMLElement | null>>;
}

function anchor(el: HTMLElement, tag: string, category: TagCategoryName, dragging: boolean): Held {
  const r = el.getBoundingClientRect();
  return { tag, category, cx: r.left + r.width / 2, top: r.top, bottom: r.bottom, dragging, hover: null };
}

/**
 * Hold a tag, then drag it onto one of two targets that pop up over it and let go.
 * Letting go without dragging (or a plain tap) leaves the targets open to tap.
 */
export function useTagHold(onAction: (tag: string, action: TagAction) => void): TagHold {
  const [held, setHeld] = useState<Held | null>(null);
  const targets = useRef<Record<TagAction, HTMLElement | null>>({ open: null, search: null, pin: null, blacklist: null });
  /** a hold just ended: the click the browser sends after it must not reopen the targets */
  const swallowClick = useRef(false);
  const stop = useRef<() => void>(() => {});
  const act = useRef(onAction);
  useEffect(() => {
    act.current = onAction;
  });
  useEffect(() => () => stop.current(), []);

  const targetAt = (x: number, y: number): TagAction | null => {
    for (const a of ACTIONS) {
      const r = targets.current[a]?.getBoundingClientRect();
      if (r && x >= r.left - HIT_PAD_PX && x <= r.right + HIT_PAD_PX && y >= r.top - HIT_PAD_PX && y <= r.bottom + HIT_PAD_PX)
        return a;
    }
    return null;
  };

  const onPointerDown = (e: React.PointerEvent<HTMLElement>, tag: string, category: TagCategoryName) => {
    if (e.button !== 0) return;
    stop.current();
    // A hold let go off the tag gets no click, so the flag must not outlive it.
    swallowClick.current = false;
    const el = e.currentTarget;
    const id = e.pointerId;
    const start = { x: e.clientX, y: e.clientY };
    let armed = false;
    let moved = false;
    const far = (ev: PointerEvent) => Math.hypot(ev.clientX - start.x, ev.clientY - start.y) > SLOP_PX;

    const timer = setTimeout(() => {
      armed = true;
      navigator.vibrate?.(12);
      setHeld(anchor(el, tag, category, true));
    }, HOLD_MS);

    const move = (ev: PointerEvent) => {
      if (ev.pointerId !== id) return;
      if (!armed) {
        if (far(ev)) done();
        return;
      }
      if (far(ev)) moved = true;
      const hover = targetAt(ev.clientX, ev.clientY);
      setHeld((h) => (h && h.hover !== hover ? { ...h, hover } : h));
    };
    const up = (ev: PointerEvent) => {
      if (ev.pointerId !== id) return;
      done();
      if (!armed) return;
      swallowClick.current = true;
      const hit = targetAt(ev.clientX, ev.clientY);
      if (hit) {
        setHeld(null);
        act.current(tag, hit);
      } else if (!moved) setHeld((h) => h && { ...h, dragging: false, hover: null });
      else setHeld(null);
    };
    const cancel = (ev: PointerEvent) => {
      if (ev.pointerId !== id) return;
      done();
      if (armed) setHeld(null);
    };
    // Once the tag is picked up, the finger drags it instead of scrolling the page.
    const touchMove = (ev: TouchEvent) => {
      if (armed && ev.cancelable) ev.preventDefault();
    };
    function done() {
      clearTimeout(timer);
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", cancel);
      window.removeEventListener("touchmove", touchMove);
      stop.current = () => {};
    }
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", cancel);
    window.addEventListener("touchmove", touchMove, { passive: false });
    stop.current = done;
  };

  const onClick = (e: React.MouseEvent<HTMLElement>, tag: string, category: TagCategoryName) => {
    if (swallowClick.current) {
      swallowClick.current = false;
      return;
    }
    setHeld(anchor(e.currentTarget, tag, category, false));
  };

  return { held, close: () => setHeld(null), onPointerDown, onClick, targets };
}

/** A post's tags as one sideways-scrolling row of chips. */
export function TagStrip({ tags, hold }: { tags: (readonly [TagCategoryName, string])[]; hold: TagHold }) {
  if (tags.length === 0) return null;
  return (
    <div className="tag-strip flex gap-1.5 overflow-x-auto px-3 pb-3 pt-1" data-testid="feed-tags">
      {tags.map(([c, t]) => {
        const picked = hold.held?.tag === t;
        return (
          <button
            key={`${c}:${t}`}
            type="button"
            className={`tag-chip shrink-0 whitespace-nowrap rounded-full px-2.5 py-1 text-xs transition-[transform,background-color] duration-150 ${
              picked ? "scale-105 bg-white/15" : "bg-white/5 hover:bg-white/10"
            }`}
            style={{ color: TAG_CATEGORY_COLORS[c] }}
            onPointerDown={(e) => hold.onPointerDown(e, t, c)}
            onClick={(e) => hold.onClick(e, t, c)}
            onContextMenu={(e) => e.preventDefault()}
            aria-haspopup="dialog"
            data-testid="feed-tag"
            data-tag={t}
          >
            {t.replaceAll("_", " ")}
          </button>
        );
      })}
    </div>
  );
}

const LABEL: Record<TagAction, string> = { open: "Open", search: "Search", pin: "Pin", blacklist: "Blacklist" };
const ICON: Record<TagAction, typeof Ban> = { open: UserRound, search: Search, pin: Pin, blacklist: Ban };

/**
 * The targets over a held tag: raised capsules 8 above it (below when there's no room), centred on
 * it and kept 8 inside the screen. `targets` picks them for the tag's kind; without it (the legacy
 * app), Search and Blacklist, with Search labelled Pin on a recommended feed.
 */
export function TagActionsOverlay({
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

/** Which targets a tag gets: an artist's opens their page first; For You pins instead of searching. */
export const tagTargets =
  (pin: boolean, search = !pin) =>
  (category: TagCategoryName): TagAction[] => {
    const mid: TagAction[] = [...(search ? ["search" as const] : []), ...(pin ? ["pin" as const] : [])];
    return category === "artist" ? ["open", mid[0] ?? "search", "blacklist"] : [...mid, "blacklist"];
  };
