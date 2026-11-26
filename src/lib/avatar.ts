/**
 * A small kaleidoscope avatar seeded from a string (an artist name, or a post id when there
 * is no artist): rings of glowing dots repeated around the centre with 3- to 12-fold symmetry,
 * often mirrored too, coloured with a cosine palette. The same seed always draws the same icon.
 *
 * Shapes live in a unit circle centred on 0,0 (an SVG viewBox of "-1 -1 2 2").
 * Every knob is in AvatarParams; the avatar playground artifact tunes them live.
 *
 * Colours stay on e621's own theme: each one is pulled toward the nearest of E621_COLORS
 * (the default Hexagon theme's tag, link and accent colours) and the background is the
 * theme's navy.
 */

/** Bright colours from e621's default Hexagon theme (e621ng _theme_hexagon.scss). */
export const E621_COLORS = {
  linkActive: "#e8c446",
  artist: "#f2ac08",
  artistAlt: "#fbd67f",
  code: "#ffe380",
  link: "#b4c7d9",
  linkHover: "#e9f2fa",
  generalAlt: "#2e76b4",
  activeTag: "#006ffa",
  section: "#17a2b8",
  species: "#ed5d1f",
  speciesAlt: "#f6b295",
  copyright: "#dd00dd",
  copyrightAlt: "#ff5eff",
  characterAlt: "#2bff2b",
  loreAlt: "#5fdb5f",
  formerStaff: "#78dca5",
  explicit: "#e45f5f",
} as const;

export type E621Color = keyof typeof E621_COLORS;

/** The theme's page background and its section blue: the ends of the background range. */
const NAVY_DARK = "#020f23";
const NAVY_LIGHT = "#1f3c67";

export interface AvatarShape {
  kind: "dot" | "ring";
  x: number;
  y: number;
  r: number;
  color: string;
  /** stroke width, rings only */
  width?: number;
  opacity: number;
}

export interface AvatarSpec {
  /** n-fold rotational symmetry */
  symmetry: number;
  /** also symmetric across the vertical axis */
  mirror: boolean;
  background: string;
  /** blur radius of the glow, in viewBox units */
  glow: number;
  shapes: AvatarShape[];
}

/** A [min, max] range a value is drawn from. */
type Range = [number, number];

export interface AvatarParams {
  /** how often each n-fold symmetry is picked, relative to the others */
  symmetryWeights: Record<number, number>;
  /** chance the pattern is also mirrored left to right */
  mirrorChance: number;
  /** how many rings of marks, inclusive */
  layers: Range;
  /** distance of the innermost ring from the centre */
  innerRadius: number;
  /** how far out the rings spread beyond innerRadius */
  spread: number;
  /** chance a ring has two marks per repeat instead of one (6-fold or less only) */
  doubleChance: number;
  /** chance a ring's marks are hollow circles instead of dots */
  hollowChance: number;
  /** dot radius, as a share of the room each mark has */
  dotSize: Range;
  /** hollow-circle radius, as a share of the room each mark has */
  hollowSize: Range;
  /** hollow-circle stroke width */
  hollowStroke: Range;
  /** the largest a mark may be */
  maxMark: number;
  /** higher packs marks smaller on tight rings */
  crowding: number;
  /** chance of a thin full circle through a ring */
  circleChance: number;
  circleWidth: number;
  circleOpacity: number;
  /** chance of a mark in the very centre */
  centerChance: number;
  /** cosine palette a + b·cos(2π(t + d)): a is the base brightness, b the colour swing */
  paletteBase: number;
  paletteSwing: number;
  /** how far the hue moves from one ring to the next */
  hueStep: number;
  /** how strongly each colour is pulled to the nearest e621 colour: 0 leaves the palette alone, 1 uses e621 colours only */
  themePull: number;
  /** which e621 colours colours may be pulled to */
  themeColors: E621Color[];
  /** background, from e621's page navy (0) to its section blue (1) */
  background: number;
  glow: number;
}

export const AVATAR_DEFAULTS: AvatarParams = {
  symmetryWeights: { 3: 1, 4: 3, 5: 1, 6: 2, 7: 1, 8: 2, 9: 1, 10: 2, 12: 2 },
  mirrorChance: 0.75,
  layers: [2, 4],
  innerRadius: 0.28,
  spread: 0.66,
  doubleChance: 0.35,
  hollowChance: 0.35,
  dotSize: [0.35, 0.4],
  hollowSize: [0.4, 1],
  hollowStroke: [0.035, 0.06],
  maxMark: 0.26,
  crowding: 3.1,
  circleChance: 0.4,
  circleWidth: 0.035,
  circleOpacity: 0.55,
  centerChance: 0.6,
  paletteBase: 0.54,
  paletteSwing: 0.34,
  hueStep: 0.33,
  themePull: 0.75,
  themeColors: Object.keys(E621_COLORS) as E621Color[],
  background: 0,
  glow: 0.125,
};

type Rgb = [number, number, number];

/** FNV-1a: a quick, well-spread 32-bit hash. */
export function hash(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** mulberry32: a tiny seeded PRNG returning [0, 1). */
export function rng(seed: number): () => number {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function rgb(hex: string): Rgb {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
}

const mix = (a: Rgb, b: Rgb, t: number) => a.map((v, i) => v + (b[i] - v) * t) as Rgb;

/** "Redmean" colour distance: plain RGB distance weighted the way eyes weigh red, green and blue. */
function distance(a: Rgb, b: Rgb): number {
  const r = (a[0] + b[0]) / 2;
  const [dr, dg, db] = [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
  return (2 + r) * dr * dr + 4 * dg * dg + (3 - r) * db * db;
}

function hex([r, g, b]: Rgb): string {
  const c = (v: number) => Math.round(Math.min(1, Math.max(0, v)) * 255).toString(16).padStart(2, "0");
  return `#${c(r)}${c(g)}${c(b)}`;
}

const round = (v: number) => Math.round(v * 1e4) / 1e4;
/** How far out a mark may reach, leaving a little room for the glow. */
const EDGE = 0.97;

/** Pick a key of `weights` with probability proportional to its weight. */
function weighted(weights: Record<number, number>, roll: number): number {
  const entries = Object.entries(weights).filter(([, w]) => w > 0);
  if (entries.length === 0) return 6;
  const total = entries.reduce((sum, [, w]) => sum + w, 0);
  let at = roll * total;
  for (const [n, w] of entries) {
    if ((at -= w) < 0) return Number(n);
  }
  return Number(entries[entries.length - 1][0]);
}

export function avatarFor(seed: string, params: AvatarParams = AVATAR_DEFAULTS): AvatarSpec {
  const p = params;
  const rand = rng(hash(seed));
  const lerp = ([lo, hi]: Range, t: number) => lo + t * (hi - lo);
  /** Inigo Quilez's cosine palette with c = 1. */
  const cosine = (t: number, d: Rgb) => d.map((ph) => p.paletteBase + p.paletteSwing * Math.cos(2 * Math.PI * (t + ph))) as Rgb;
  const swatches = p.themeColors.map((c) => rgb(E621_COLORS[c]));
  /** The palette colour, pulled toward the nearest e621 colour. */
  const palette = (t: number, d: Rgb): Rgb => {
    const c = cosine(t, d);
    if (swatches.length === 0 || p.themePull <= 0) return c;
    const near = swatches.reduce((best, s) => (distance(c, s) < distance(c, best) ? s : best));
    return mix(c, near, p.themePull);
  };

  const symmetry = weighted(p.symmetryWeights, rand());
  const mirror = rand() < p.mirrorChance;
  const d: Rgb = [rand(), rand(), rand()];
  const shift = rand();
  const wedge = (2 * Math.PI) / symmetry;
  const shapes: AvatarShape[] = [];

  /** Place one shape at angle `theta` (from the top) and every copy the symmetry implies. */
  const repeat = (theta: number, dist: number, shape: Omit<AvatarShape, "x" | "y">) => {
    const angles = [theta, ...(mirror ? [-theta] : [])];
    for (let k = 0; k < symmetry; k++) {
      for (const a of angles) {
        const t = a + k * wedge - Math.PI / 2;
        shapes.push({ ...shape, x: round(dist * Math.cos(t)), y: round(dist * Math.sin(t)) });
      }
    }
  };

  // A few rings of marks, inner to outer; the colour drifts with the radius like the shader's palette(length + i·.4).
  const [minLayers, maxLayers] = p.layers;
  const layers = minLayers + Math.floor(rand() * (maxLayers - minLayers + 1));
  for (let l = 0; l < layers; l++) {
    // Every ring takes the same rolls whatever the settings, so a slider nudges a pattern instead of reshuffling it.
    const [rPos, rHollow, rSize, rStroke, rDouble, rAngle1, rAngle2, rCircle] = Array.from({ length: 8 }, rand);
    const dist = Math.min(p.innerRadius + ((l + 0.1 + rPos * 0.6) * p.spread) / layers, EDGE - 0.05);
    const color = hex(palette(dist + l * p.hueStep + shift, d));
    const hollow = rHollow < p.hollowChance;
    // Smaller marks where the circle is tight, so neighbours don't merge into a blob.
    const room = Math.min(p.maxMark, (dist * wedge) / p.crowding);
    const width = lerp(p.hollowStroke, rStroke);
    // Never past the edge of the circle, however big the settings make it.
    const fit = (r: number) => Math.min(r, EDGE - dist - (hollow ? width / 2 : 0));
    const shape = hollow
      ? { kind: "ring" as const, r: fit(Math.max(lerp(p.hollowSize, rSize) * room, 0.07)), width, color, opacity: 1 }
      : { kind: "dot" as const, r: fit(Math.max(lerp(p.dotSize, rSize) * room, 0.055)), color, opacity: 1 };
    const perWedge = symmetry <= 6 && rDouble < p.doubleChance ? 2 : 1;
    const span = mirror ? wedge / 2 : wedge;
    [rAngle1, rAngle2].slice(0, perWedge).forEach((roll, i) => repeat(((i + 0.15 + roll * 0.7) / perWedge) * span, dist, shape));
    // Now and then a full circle through the ring, like the shader's glowing rings.
    if (rCircle < p.circleChance) {
      shapes.push({ kind: "ring", x: 0, y: 0, r: round(dist), width: p.circleWidth, color, opacity: p.circleOpacity });
    }
  }

  const [rCenter, rCenterKind, rCenterSize] = [rand(), rand(), rand()];
  if (rCenter < p.centerChance) {
    const color = hex(palette(shift + 0.15, d));
    shapes.push(
      rCenterKind < 0.5
        ? { kind: "dot", x: 0, y: 0, r: lerp([0.08, 0.15], rCenterSize), color, opacity: 1 }
        : { kind: "ring", x: 0, y: 0, r: lerp([0.1, 0.16], rCenterSize), width: 0.045, color, opacity: 1 },
    );
  }

  // e621's navy, so the marks glow the way its pages do.
  const bg = mix(rgb(NAVY_DARK), rgb(NAVY_LIGHT), p.background);
  return {
    symmetry,
    mirror,
    background: hex(bg),
    glow: p.glow,
    shapes: shapes.map((s) => ({ ...s, r: round(s.r), ...(s.width ? { width: round(s.width) } : {}) })),
  };
}
