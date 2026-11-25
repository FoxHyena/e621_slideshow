"use client";

import { useEffect, useRef, useState } from "react";
import { Ban, Pin, Plus } from "lucide-react";
import { TAG_CATEGORY_COLORS, type TagCategoryName } from "@/lib/e621/types";

export type TagAction = "search" | "blacklist";

/** Hold a tag this long to pick it up. */
const HOLD_MS = 450;
/** Moving further than this before the hold lands is a scroll, not a hold. */
const SLOP_PX = 10;
/** Extra reach around each target, so a drag doesn't have to be exact. */
const HIT_PAD_PX = 18;
/** The targets need about this much room above the tag (pill + circles + labels). */
const ROOM_ABOVE_PX = 170;
/** Keep the pair of targets (about 180px wide with labels) this far from the screen edges. */
const EDGE_PX = 104;

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
  const targets = useRef<Record<TagAction, HTMLElement | null>>({ search: null, blacklist: null });
  /** a hold just ended: the click the browser sends after it must not reopen the targets */
  const swallowClick = useRef(false);
  const stop = useRef<() => void>(() => {});
  const act = useRef(onAction);
  useEffect(() => {
    act.current = onAction;
  });
  useEffect(() => () => stop.current(), []);

  const targetAt = (x: number, y: number): TagAction | null => {
    for (const a of ["search", "blacklist"] as const) {
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

const TARGETS: Record<TagAction, { idle: string; hot: string }> = {
  search: { idle: "bg-panel-2 text-accent ring-accent/40", hot: "bg-accent text-black ring-accent" },
  blacklist: { idle: "bg-panel-2 text-red-400 ring-red-400/40", hot: "bg-red-500 text-white ring-red-400" },
};

/** The two targets over a held tag. */
export function TagActionsOverlay({ hold, recommended, onAction }: { hold: TagHold; recommended: boolean; onAction: (tag: string, action: TagAction) => void }) {
  const { held } = hold;
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
  if (!held) return null;

  const above = held.top > ROOM_ABOVE_PX;
  const left = Math.min(Math.max(held.cx, EDGE_PX), window.innerWidth - EDGE_PX);
  const labels: Record<TagAction, string> = { search: recommended ? "Pin" : "Search", blacklist: "Blacklist" };
  const icons: Record<TagAction, typeof Plus> = { search: recommended ? Pin : Plus, blacklist: Ban };
  const pick = (a: TagAction) => {
    hold.close();
    onAction(held.tag, a);
  };

  return (
    <>
      {/* Dims the feed so the targets read clearly; while dragging it lets the pointer through. */}
      <div
        className={`tag-actions-dim fixed inset-0 z-40 bg-black/45 ${held.dragging ? "pointer-events-none" : ""}`}
        onPointerDown={hold.close}
        data-testid="tag-actions-backdrop"
      />
      <div
        className={`tag-actions pointer-events-none fixed z-50 flex flex-col items-center gap-2 ${above ? "origin-bottom" : "origin-top"}`}
        style={{ left, top: above ? held.top - 12 : held.bottom + 12, translate: above ? "-50% -100%" : "-50% 0" }}
        role="dialog"
        aria-label={`Actions for ${held.tag}`}
        data-testid="tag-actions"
      >
        <span
          className={`max-w-[70vw] truncate rounded-full bg-panel-2 px-3 py-1 text-xs font-semibold shadow-lg ring-1 ring-line ${above ? "" : "order-last"}`}
          style={{ color: TAG_CATEGORY_COLORS[held.category] }}
        >
          {held.tag.replaceAll("_", " ")}
        </span>
        <div className="flex gap-8">
          {(["search", "blacklist"] as const).map((a) => {
            const hot = held.hover === a;
            const Icon = icons[a];
            return (
              <button
                key={a}
                type="button"
                ref={(el) => {
                  hold.targets.current[a] = el;
                }}
                className="pointer-events-auto flex flex-col items-center gap-1 focus-visible:outline-none"
                onClick={() => pick(a)}
                data-testid={`tag-action-${a}`}
                data-hot={hot}
              >
                <span
                  className={`flex size-13 items-center justify-center rounded-full shadow-xl ring-2 transition-[transform,background-color,color] duration-150 ${
                    hot ? `scale-115 ${TARGETS[a].hot}` : TARGETS[a].idle
                  }`}
                >
                  <Icon className="size-6" aria-hidden />
                </span>
                <span className="rounded bg-black/70 px-1.5 text-[11px] font-semibold text-neutral-200">{labels[a]}</span>
              </button>
            );
          })}
        </div>
      </div>
    </>
  );
}
