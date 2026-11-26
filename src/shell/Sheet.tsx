"use client";

/**
 * A bottom sheet (DESIGN.md "Sheet"): dim behind, Panel Navy, 24 top corners, grabber, a section
 * title and a close circle. It's a history entry (nav.openSheet), so Back, Esc, the close button,
 * a tap on the dim and a swipe down all close it the same way: by going back.
 */
import { X } from "lucide-react";
import { useEffect, useId, useRef, type ReactNode } from "react";
import { getNav } from "@/nav/history";

const FOCUSABLE = 'a[href],button:not([disabled]),input:not([disabled]),select,textarea,[tabindex]:not([tabindex="-1"])';

export function Sheet({
  title,
  children,
  footer,
  testId,
  full,
}: {
  title: string;
  children: ReactNode;
  /** pinned under the content (a Done button) */
  footer?: ReactNode;
  testId?: string;
  /** fills the screen (the search editor) */
  full?: boolean;
}) {
  const id = useId();
  const box = useRef<HTMLDivElement>(null);
  const close = () => void getNav().back();

  // Focus the first control; keep Tab inside; Esc closes (wherever focus is: after a tap on the dim
  // it may be outside the sheet).
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const first = el.querySelector<HTMLElement>("[data-autofocus]") ?? el.querySelector<HTMLElement>(FOCUSABLE);
    first?.focus({ preventScroll: true });
    const onEsc = (e: KeyboardEvent) => {
      if (e.key !== "Escape" || e.defaultPrevented) return;
      e.preventDefault();
      close();
    };
    window.addEventListener("keydown", onEsc);
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Tab") return;
      const all = [...el.querySelectorAll<HTMLElement>(FOCUSABLE)].filter((n) => n.getClientRects().length > 0);
      if (all.length === 0) return;
      const [a, z] = [all[0], all[all.length - 1]];
      if (e.shiftKey && document.activeElement === a) {
        e.preventDefault();
        z.focus();
      } else if (!e.shiftKey && document.activeElement === z) {
        e.preventDefault();
        a.focus();
      }
    };
    el.addEventListener("keydown", onKey);
    return () => {
      el.removeEventListener("keydown", onKey);
      window.removeEventListener("keydown", onEsc);
    };
  }, []);

  // Drag the grabber down to dismiss (rubber-bands upward).
  const drag = useRef<{ y: number; dy: number } | null>(null);
  const onDown = (e: React.PointerEvent) => {
    drag.current = { y: e.clientY, dy: 0 };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };
  const onMove = (e: React.PointerEvent) => {
    const d = drag.current;
    const el = box.current;
    if (!d || !el) return;
    const raw = e.clientY - d.y;
    d.dy = raw > 0 ? raw : -Math.sqrt(-raw) * 2;
    el.style.transition = "none";
    el.style.transform = `translateY(${d.dy}px)`;
  };
  const onUp = () => {
    const d = drag.current;
    const el = box.current;
    drag.current = null;
    if (!d || !el) return;
    el.style.transition = "";
    // Dismissed: stay down while Back lands, instead of springing up first.
    if (d.dy > 96) {
      el.style.transform = "translateY(100%)";
      close();
    } else el.style.transform = "";
  };

  return (
    <div className="sheet-layer" data-testid={testId}>
      <div className="sheet-dim" onClick={close} aria-hidden />
      <div
        ref={box}
        className="sheet"
        data-full={full || undefined}
        role="dialog"
        aria-modal="true"
        aria-labelledby={id}
      >
        <div className="sheet-grab" onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp}>
          <span aria-hidden />
        </div>
        <div className="sheet-head">
          <h2 id={id} className="sheet-title">
            {title}
          </h2>
          <button type="button" className="toolbar-circle" aria-label="Close" onClick={close}>
            <X aria-hidden />
          </button>
        </div>
        <div className="sheet-body">{children}</div>
        {footer && <div className="sheet-foot">{footer}</div>}
      </div>
    </div>
  );
}
