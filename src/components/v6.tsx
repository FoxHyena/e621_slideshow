"use client";

/**
 * The small v6 parts screens share (DESIGN.md "Field", "Segmented control", "Switch, stepper,
 * slider, toggle"). Styles live in globals.css ("v6 parts"); these only wire the bits CSS can't.
 */
import { Minus, Plus, X } from "lucide-react";
import { forwardRef, useLayoutEffect, useRef, type CSSProperties, type InputHTMLAttributes, type ReactNode } from "react";

/** A segmented control: a sunk track and a capsule that slides to the chosen segment. */
export function Seg<T extends string>({
  options,
  value,
  onChange,
  label,
  big,
  hug,
  className,
  testId,
}: {
  options: readonly { value: T; label: ReactNode }[];
  value: T;
  onChange: (v: T) => void;
  label: string;
  big?: boolean;
  /**
   * Segments that hug their words (DESIGN.md "Segmented control", 2026-11-27): each is its word
   * plus `hug` px at both sides, the spare width shared equally; the capsule takes the chosen one's
   * place and width. Without it, segments are equal.
   */
  hug?: number;
  className?: string;
  testId?: string;
}) {
  const i = Math.max(0, options.findIndex((o) => o.value === value));
  const track = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const el = track.current;
    if (!hug || !el) return;
    const place = () => {
      const b = el.querySelectorAll<HTMLButtonElement>(":scope > button")[i];
      if (!b) return;
      // (from the layout's own fractions: offsetLeft rounds, and the capsule stood 1 off)
      const t = el.getBoundingClientRect();
      const r = b.getBoundingClientRect();
      el.style.setProperty("--thumb-x", `${r.left - t.left - el.clientLeft}px`);
      el.style.setProperty("--thumb-w", `${r.width}px`);
    };
    place();
    // the words' widths change once the font has loaded, and with the menu's width
    const ro = new ResizeObserver(place);
    ro.observe(el);
    return () => ro.disconnect();
  }, [hug, i]);
  return (
    <div
      ref={track}
      role="radiogroup"
      aria-label={label}
      className={`seg${className ? ` ${className}` : ""}`}
      data-big={big || undefined}
      data-hug={hug ? "" : undefined}
      style={{ "--i": i, "--n": options.length, ...(hug && { "--hug": `${hug}px` }) } as CSSProperties}
      data-testid={testId}
      onKeyDown={(e) => {
        const d = e.key === "ArrowRight" || e.key === "ArrowDown" ? 1 : e.key === "ArrowLeft" || e.key === "ArrowUp" ? -1 : 0;
        if (!d) return;
        e.preventDefault();
        const next = options[(i + d + options.length) % options.length];
        onChange(next.value);
        const btn = e.currentTarget.querySelectorAll<HTMLButtonElement>("button")[options.indexOf(next)];
        btn?.focus();
      }}
    >
      <span className="seg-thumb" aria-hidden />
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={o.value === value}
          tabIndex={o.value === value ? 0 : -1}
          onClick={() => onChange(o.value)}
          data-value={o.value}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

/** A stepper: −, the value, +. */
export function Stepper({
  value,
  label,
  onChange,
  min,
  max,
  step = 1,
  format = String,
  testId,
}: {
  value: number;
  label: string;
  onChange: (v: number) => void;
  min: number;
  max: number;
  step?: number;
  format?: (v: number) => string;
  testId?: string;
}) {
  return (
    <span className="stepper" data-testid={testId}>
      <button type="button" aria-label={`Less ${label}`} disabled={value <= min} onClick={() => onChange(Math.max(min, value - step))}>
        <Minus aria-hidden />
      </button>
      <output aria-live="polite" aria-label={label}>
        {format(value)}
      </output>
      <button type="button" aria-label={`More ${label}`} disabled={value >= max} onClick={() => onChange(Math.min(max, value + step))}>
        <Plus aria-hidden />
      </button>
    </span>
  );
}

/** A slider: the track fills in Link Blue up to the thumb. */
export const Slider = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement> & { value: number; min: number; max: number }>(
  function Slider({ value, min, max, className, style, ...rest }, ref) {
    const p = max > min ? (value - min) / (max - min) : 0;
    return (
      <input
        ref={ref}
        type="range"
        min={min}
        max={max}
        value={value}
        className={`slider${className ? ` ${className}` : ""}`}
        style={{ ...style, "--p": p } as CSSProperties}
        {...rest}
      />
    );
  },
);

/** A field: a sunk capsule with an optional leading icon and a clear button once it has text. */
export function Field({
  icon,
  value,
  onChange,
  after,
  className,
  ...rest
}: Omit<InputHTMLAttributes<HTMLInputElement>, "onChange" | "value"> & {
  icon?: ReactNode;
  value: string;
  onChange: (v: string) => void;
  /** shown at the right end while there's text, before the clear button */
  after?: ReactNode;
}) {
  const input = useRef<HTMLInputElement>(null);
  return (
    <div className={`field6${className ? ` ${className}` : ""}`} data-has={value ? "" : undefined}>
      {icon}
      <input ref={input} value={value} onChange={(e) => onChange(e.target.value)} {...rest} />
      {value && after}
      {value && (
        <button type="button" className="field-clear" aria-label={`Clear ${rest["aria-label"] ?? rest.placeholder ?? "text"}`.trim()}
          onClick={() => {
            onChange("");
            input.current?.focus();
          }}
        >
          <X aria-hidden strokeWidth={2.6} />
        </button>
      )}
    </div>
  );
}
