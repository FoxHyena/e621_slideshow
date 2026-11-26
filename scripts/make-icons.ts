// The app icons (DESIGN.md "Install, update and the app icon"), drawn from the app mark itself:
// the kaleidoscope (APP_MARK_SEED, APP_MARK_PARAMS) on a straight Panel Navy → Ground gradient.
//
//   node_modules/.bin/jiti scripts/make-icons.ts
//
// Writes public/icons/: icon-512.png, icon-192.png, apple-icon-180.png (full squares, the mark reaching
// 68% with its glow inside Android's 80% safe circle, so the same files are "any" and "maskable"),
// favicon-32.png and favicon-16.png (22% corners, the mark at 84%, no glow) and mono-512.png (white,
// no glow, clear ground: Android's themed icons). Rendered in Playwright's Chromium.
import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { chromium } from "@playwright/test";
import { APP_MARK_PARAMS, APP_MARK_SEED, avatarFor, type AvatarShape } from "../src/lib/avatar";

const OUT = join(import.meta.dirname, "..", "public", "icons");
const spec = avatarFor(APP_MARK_SEED, APP_MARK_PARAMS);
const HALOS: [number, number][] = [
  [1.2, 0.04],
  [0.7, 0.07],
  [0.3, 0.12],
];
/** How far the mark reaches from its centre, in its own box. */
const EXT = Math.max(...spec.shapes.map((s) => Math.hypot(s.x, s.y) + s.r + (s.width ?? 0) / 2));

const dot = (s: AvatarShape, grow = 0, fade = 1, color = s.color) =>
  s.kind === "dot"
    ? `<circle cx="${s.x}" cy="${s.y}" r="${s.r + grow}" fill="${color}" opacity="${s.opacity * fade}"/>`
    : `<circle cx="${s.x}" cy="${s.y}" r="${s.r}" fill="none" stroke="${color}" stroke-width="${(s.width ?? 0) + 2 * grow}" opacity="${s.opacity * fade}"/>`;

function svg(o: { reach: number; glow: boolean; mono?: boolean; radius?: number }): string {
  const color = o.mono ? "#fff" : undefined;
  const shapes = (grow = 0, fade = 1) => spec.shapes.map((s) => dot(s, grow, fade, color ?? s.color)).join("");
  const halos = o.glow ? HALOS.map(([sp, f]) => shapes(spec.glow * sp, f)).join("") : "";
  const r = o.radius ?? 0;
  const ground = o.mono
    ? ""
    : `<defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#152F56"/><stop offset="1" stop-color="#020F23"/></linearGradient></defs><rect x="-1" y="-1" width="2" height="2" rx="${r * 2}" fill="url(#g)"/>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="-1 -1 2 2">${ground}<g transform="scale(${o.reach / EXT})">${halos}${shapes()}</g></svg>`;
}

const FILES: { name: string; size: number; svg: string }[] = [
  { name: "icon-512.png", size: 512, svg: svg({ reach: 0.68, glow: true }) },
  { name: "icon-192.png", size: 192, svg: svg({ reach: 0.68, glow: true }) },
  { name: "apple-icon-180.png", size: 180, svg: svg({ reach: 0.68, glow: true }) },
  { name: "favicon-32.png", size: 32, svg: svg({ reach: 0.84, glow: false, radius: 0.22 }) },
  { name: "favicon-16.png", size: 16, svg: svg({ reach: 0.84, glow: false, radius: 0.22 }) },
  { name: "mono-512.png", size: 512, svg: svg({ reach: 0.68, glow: false, mono: true }) },
];

mkdirSync(OUT, { recursive: true });
const browser = await chromium.launch();
const page = await browser.newPage({ deviceScaleFactor: 1 });
for (const f of FILES) {
  await page.setViewportSize({ width: f.size, height: f.size });
  await page.setContent(`<style>html,body{margin:0;background:transparent}svg{display:block;width:${f.size}px;height:${f.size}px}</style>${f.svg}`);
  await page.screenshot({ path: join(OUT, f.name), omitBackground: true, clip: { x: 0, y: 0, width: f.size, height: f.size } });
  console.log(f.name);
}
await browser.close();
