"use client";

/**
 * A pool of goo inside its box (`src/shell/pool.ts`): the sidebar's foot on a computer, the Settings
 * goo row's card on a phone. It lies over what's under it and takes no clicks; `ink` is that content
 * drawn again in Goo Ink, cut to the goo's own shape. The level jumps to a new count (how it should
 * rise isn't designed yet).
 */
import { useId, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { gooColor } from "@/shell/tube";
import { POOL_FILTER, poolLevel, poolMask, poolShapes, type PoolKind } from "@/shell/pool";

export function Pool({ kind, n, ink, className }: { kind: PoolKind; n: number; ink?: ReactNode; className?: string }) {
  const box = useRef<HTMLSpanElement>(null);
  const [size, setSize] = useState<[number, number] | null>(null);
  const id = `pool${useId().replace(/[^\w-]/g, "")}`;

  useLayoutEffect(() => {
    const el = box.current;
    if (!el) return;
    const measure = () => {
      const w = Math.round(el.clientWidth);
      const h = Math.round(el.clientHeight);
      setSize((s) => (s && s[0] === w && s[1] === h ? s : [w, h]));
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const [W, H] = size ?? [0, 0];
  const shapes = poolShapes(kind, n, W, H);
  const on = shapes.length > 0;
  const mask = on && ink ? poolMask(shapes, W, H) : "";
  return (
    <span ref={box} className={`pool ${className ?? ""}`} data-kind={kind} data-level={on ? Math.round(poolLevel(kind, n)) : 0} aria-hidden data-testid={`pool-${kind}`}>
      {on && (
        <svg viewBox={`0 0 ${W} ${H}`} width={W} height={H}>
          <filter id={id} x="-10%" y="-10%" width="120%" height="130%" colorInterpolationFilters="sRGB">
            <feGaussianBlur stdDeviation={POOL_FILTER.blur} />
            <feColorMatrix values={POOL_FILTER.matrix} />
          </filter>
          <g filter={`url(#${id})`} fill={gooColor(1 - Math.exp(-n / 70))}>
            {shapes.map((s, i) =>
              s.t === "rect" ? (
                <rect key={i} x={s.x} y={s.y} width={s.w} height={s.h} />
              ) : s.t === "circle" ? (
                <circle key={i} cx={s.cx} cy={s.cy} r={s.r} />
              ) : (
                <ellipse key={i} cx={s.cx} cy={s.cy} rx={s.rx} ry={s.ry} />
              ),
            )}
          </g>
        </svg>
      )}
      {on && ink && (
        <span className="pool-ink" style={{ mask, WebkitMask: mask }}>
          {ink}
        </span>
      )}
    </span>
  );
}
