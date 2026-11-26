import { expect, test } from "@playwright/test";
import { defaultSpecs, mockE621 } from "./mock";

/**
 * The performance budgets (ENGINEERING.md §5), measured against the e621 mock. Skipped in the normal
 * run; for real numbers, against a production build:
 *
 *   pnpm build && pnpm start --port 3622
 *   E6_BUDGETS=1 E6_BASE=http://localhost:3622 pnpm e2e e2e/budgets.spec.ts --workers 1
 *
 * Each test prints its numbers; the asserts are the budgets themselves.
 */

test.skip(!process.env.E6_BUDGETS, "set E6_BUDGETS=1 to measure");
test.use({ viewport: { width: 375, height: 812 }, ...(process.env.E6_BASE ? { baseURL: process.env.E6_BASE } : {}) });

const scripts = () =>
  performance
    .getEntriesByType("resource")
    .filter((e) => (e as PerformanceResourceTiming).initiatorType === "script" || e.name.endsWith(".js"))
    .map((e) => ({ name: e.name.split("/").pop(), kb: (e as PerformanceResourceTiming).encodedBodySize / 1024 }));

test("JS transferred on a cold load of /following", async ({ page }) => {
  await mockE621(page);
  // The load itself: the other screens' code, fetched once the page is idle, is counted apart.
  await page.addInitScript(() => {
    window.requestIdleCallback = () => 0;
  });
  await page.goto("/following", { waitUntil: "networkidle" });
  const load = await page.evaluate(scripts);
  const kb = load.reduce((n, s) => n + s.kb, 0);
  console.log(`JS transferred, cold load of /following: ${kb.toFixed(1)} KB (encoded, ${load.length} files)`);
  // E6_BUDGET_FILES=1 lists them, biggest first, to see what grew
  if (process.env.E6_BUDGET_FILES) for (const s of [...load].sort((a, b) => b.kb - a.kb)) console.log(`  ${s.kb.toFixed(1).padStart(6)} KB  ${s.name}`);

  const page2 = await page.context().newPage();
  await mockE621(page2);
  await page2.goto("/following", { waitUntil: "networkidle" });
  const all = await page2.evaluate(scripts);
  console.log(`  plus idle prefetch of every screen: ${all.reduce((n, s) => n + s.kb, 0).toFixed(1)} KB in all`);
  expect(kb).toBeLessThanOrEqual(200);
});

test("first feed content, card count, layout shift and long tasks while scrolling", async ({ page }) => {
  await mockE621(page, defaultSpecs(300));
  await page.addInitScript(() => {
    const w = window as unknown as { __cls: number; __long: number[] };
    w.__cls = 0;
    w.__long = [];
    new PerformanceObserver((l) => {
      for (const e of l.getEntries() as (PerformanceEntry & { value: number; hadRecentInput: boolean })[]) if (!e.hadRecentInput) w.__cls += e.value;
    }).observe({ type: "layout-shift", buffered: true });
    new PerformanceObserver((l) => {
      for (const e of l.getEntries()) w.__long.push(e.duration);
    }).observe({ type: "longtask", buffered: true });
  });
  const t0 = Date.now();
  await page.goto("/search?tags=wolf");
  await expect(page.getByTestId("post-card").first()).toBeVisible();
  console.log(`First feed content: ${Date.now() - t0} ms (navigation start to first card, mock e621)`);

  const cdp = await page.context().newCDPSession(page);
  await cdp.send("Emulation.setCPUThrottlingRate", { rate: 4 });
  await page.evaluate(() => ((window as unknown as { __long: number[] }).__long.length = 0));
  let most = 0;
  for (let i = 0; i < 40; i++) {
    await page.mouse.wheel(0, 600);
    await page.waitForTimeout(60);
    most = Math.max(most, await page.getByTestId("post-card").count());
  }
  await cdp.send("Emulation.setCPUThrottlingRate", { rate: 1 });
  const { cls, long } = await page.evaluate(() => {
    const w = window as unknown as { __cls: number; __long: number[] };
    return { cls: w.__cls, long: w.__long };
  });
  console.log(`Cards in the DOM (most while scrolling): ${most}`);
  console.log(`Layout shift (CLS): ${cls.toFixed(4)}`);
  console.log(`Long tasks while scrolling at 4x CPU: ${long.length}${long.length ? ` (longest ${Math.max(...long).toFixed(0)} ms)` : ""}`);
  expect(most).toBeLessThanOrEqual(30);
  expect(cls).toBeLessThan(0.01);
});
