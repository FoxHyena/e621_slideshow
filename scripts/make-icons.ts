// The app icons (DESIGN.md "Install, update and the app icon", "The app icon"), rendered from the
// design session's source files in docs/path-a/icons (the gold hexagon with Play sunk into it).
//
//   node_modules/.bin/jiti scripts/make-icons.ts
//
// Writes public/icons/: icon-512.png, icon-192.png, apple-icon-180.png (the full square from
// app-icon.svg; everything sits inside Android's 80% safe circle, so the same files are "any" and
// "maskable"), favicon-32.png and favicon-16.png (app-icon-tab.svg: 22% corners, flat) and
// mono-512.png (app-icon-mono.svg: white on a clear ground, Android's themed icons). Rendered in
// Playwright's Chromium.
import { mkdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { chromium } from "@playwright/test";

const ROOT = join(import.meta.dirname, "..");
const OUT = join(ROOT, "public", "icons");
const src = (name: string) => readFileSync(join(ROOT, "docs", "path-a", "icons", name), "utf8");

const FILES: { name: string; size: number; svg: string }[] = [
  { name: "icon-512.png", size: 512, svg: src("app-icon.svg") },
  { name: "icon-192.png", size: 192, svg: src("app-icon.svg") },
  { name: "apple-icon-180.png", size: 180, svg: src("app-icon.svg") },
  { name: "favicon-32.png", size: 32, svg: src("app-icon-tab.svg") },
  { name: "favicon-16.png", size: 16, svg: src("app-icon-tab.svg") },
  { name: "mono-512.png", size: 512, svg: src("app-icon-mono.svg") },
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
