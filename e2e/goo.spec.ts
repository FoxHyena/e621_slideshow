import { expect, test, type Page } from "@playwright/test";
import { mockE621 } from "./mock";

/**
 * The v6 tab bar and its goo (DESIGN.md "Tab bar", "Tab bar goo"): favouriting drips and adds
 * goo, the secret Goo tab adds ten, Settings wipes it, and the count survives a reload.
 */

const SHOTS = process.env.E6_SHOTS;
if (process.env.E6_MOBILE) test.use({ viewport: { width: 375, height: 812 } });
const shot = async (page: Page, name: string) => {
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/${name}.png`, fullPage: false, animations: "disabled" });
};

const signIn = (page: Page) =>
  page.addInitScript(() => {
    if (sessionStorage.getItem("seeded")) return;
    sessionStorage.setItem("seeded", "1");
    localStorage.setItem("e6ss:v1:creds", JSON.stringify({ username: "tester", apiKey: "goodkey" }));
  });

const card = (page: Page, id: number) => page.locator(`[data-post-id="${id}"]`);
const count = (page: Page) => page.getByTestId("goo-count");
const bar = (page: Page) => page.getByRole("navigation", { name: "Tabs" });

test.use({ viewport: { width: 375, height: 812 } });

test("a favourite drips, its drop lands on the tab bar, and Settings counts it and wipes it clean", async ({ page }) => {
  await mockE621(page);
  await signIn(page);
  await page.goto("/search?tags=wolf");
  const fav = card(page, 1150).getByTestId("card-fav");
  await expect(fav).toHaveAttribute("aria-pressed", "false");
  await expect(bar(page)).not.toHaveAttribute("data-goo");
  await fav.click();
  await expect(fav).toHaveAttribute("aria-pressed", "true");
  // the goo under the heart, and the artist's mark turning
  await expect(fav.locator(".drip")).toHaveCount(1);
  await expect(card(page, 1150).locator(".mark svg")).toHaveAttribute("style", /rotate\(360deg\)/);
  // the drop reaches the bar, and the bar grows goo
  await expect(bar(page)).toHaveAttribute("data-goo", "", { timeout: 5000 });
  await shot(page, "goo-fav");

  // Un-favouriting leaves the goo where it is.
  await fav.click();
  await expect(fav).toHaveAttribute("aria-pressed", "false");

  await page.getByTestId("tab-settings").click();
  await expect(count(page)).toHaveText("1 favorite");
  await shot(page, "goo-settings");
  await page.getByTestId("goo-wipe").click();
  await expect(count(page)).toHaveText("0 favorites");
  await expect(page.getByTestId("goo-wipe")).toBeDisabled();
  // the blade sweeps it off (900 ms), then the bar is clean
  await expect(bar(page)).not.toHaveAttribute("data-goo", "", { timeout: 4000 });
});

test("the secret Goo tab, reached with the keyboard, adds ten; the count survives a reload", async ({ page }) => {
  await mockE621(page);
  await page.goto("/settings");
  await expect(count(page)).toHaveText("0 favorites");
  const goo = page.getByTestId("tab-goo");
  // focus brings it into view along the bend
  await goo.focus();
  await expect(bar(page)).toHaveAttribute("data-open", "");
  await page.keyboard.press("Enter");
  await expect(count(page)).toHaveText("10 favorites");
  await expect(bar(page)).toHaveAttribute("data-goo", "", { timeout: 5000 });
  await shot(page, "goo-secret");
  // focusing Following again scrolls the bar back
  await page.getByTestId("tab-following").focus();
  await expect(bar(page)).not.toHaveAttribute("data-open");

  await page.reload();
  await expect(count(page)).toHaveText("10 favorites");
  await expect(bar(page)).toHaveAttribute("data-goo", "");
});

test("dragging the bar left opens the secret tab, and the drag isn't a tap", async ({ page }) => {
  await mockE621(page);
  await page.goto("/settings");
  const nav = bar(page);
  const box = (await nav.boundingBox())!;
  const y = box.y + box.height / 2;
  await page.mouse.move(box.x + box.width * 0.6, y);
  await page.mouse.down();
  for (let i = 1; i <= 8; i++) await page.mouse.move(box.x + box.width * 0.6 - i * 12, y);
  await page.mouse.up();
  await expect(nav).toHaveAttribute("data-open", "");
  await expect(page).toHaveURL(/\/settings$/);
});

test("a drag that comes back to the tab it started on doesn't press it", async ({ page }) => {
  await mockE621(page);
  await page.goto("/settings");
  const tab = (await page.getByTestId("tab-artists").boundingBox())!;
  const x = tab.x + tab.width / 2;
  const y = tab.y + tab.height / 2;
  await page.mouse.move(x, y);
  await page.mouse.down();
  for (let i = 1; i <= 6; i++) await page.mouse.move(x - i * 10, y);
  for (let i = 5; i >= 0; i--) await page.mouse.move(x - i * 10, y);
  // the browser clicks the link it went down and up on; the bar swallows that click
  await page.mouse.up();
  await page.waitForTimeout(300);
  await expect(page).toHaveURL(/\/settings$/);
});

test("signed out, a heart asks you to sign in and adds no goo", async ({ page }) => {
  await mockE621(page);
  await page.goto("/search?tags=wolf");
  await card(page, 1150).getByTestId("card-fav").click();
  await expect(card(page, 1150).locator(".drip")).toHaveCount(0);
  await page.getByTestId("tab-settings").click();
  await expect(count(page)).toHaveText("0 favorites");
});

test("with reduced motion, nothing drips or flies, and the count still grows", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await mockE621(page);
  await signIn(page);
  await page.goto("/search?tags=wolf");
  const fav = card(page, 1150).getByTestId("card-fav");
  await fav.click();
  await expect(fav).toHaveAttribute("aria-pressed", "true");
  await expect(fav.locator(".drip")).toHaveCount(0);
  // a drop would leave 380 ms after the tap; give it the time before saying none did
  await page.waitForTimeout(700);
  await expect(page.locator(".goo-drop")).toHaveCount(0);
  // the goo is drawn at once
  await expect(bar(page)).toHaveAttribute("data-goo", "");
  await page.getByTestId("tab-settings").click();
  await expect(count(page)).toHaveText("1 favorite");
});

test("signing out wipes the goo off the bar and off the device", async ({ page }) => {
  await mockE621(page);
  await signIn(page);
  await page.goto("/search?tags=wolf");
  await card(page, 1150).getByTestId("card-fav").click();
  await expect(bar(page)).toHaveAttribute("data-goo", "", { timeout: 5000 });
  await page.getByTestId("tab-settings").click();
  await expect(count(page)).toHaveText("1 favorite");
  await page.getByTestId("settings-account").click();
  await page.getByTestId("sign-out").click();
  await page.getByTestId("tab-settings").click();
  await expect(count(page)).toHaveText("0 favorites");
  await expect(bar(page)).not.toHaveAttribute("data-goo", "", { timeout: 4000 });
  expect(await page.evaluate(() => localStorage.getItem("e6ss:v1:goo") ?? sessionStorage.getItem("e6ss:v1:goo"))).toBeNull();
});

const seedGoo = (page: Page, n: number) =>
  page.addInitScript((k) => {
    if (sessionStorage.getItem("goo-seeded")) return;
    sessionStorage.setItem("goo-seeded", "1");
    localStorage.setItem("e6ss:v1:goo", JSON.stringify(k));
  }, n);

for (const [n, side, jar] of [
  [5, 14, 7],
  [40, 37, 24],
  [150, 61, 43],
]) {
  test(`the pool at ${n} favorites: ${jar} up the Settings goo row on a phone, ${side} up the sidebar's foot on a computer`, async ({ page }) => {
    await mockE621(page);
    await signIn(page);
    await seedGoo(page, n);
    await page.goto("/settings");
    // a phone: the goo row is a jar; Wipe clean stays above the goo and still works
    const jarPool = page.getByTestId("pool-jar");
    await expect(jarPool).toHaveAttribute("data-level", String(jar));
    const row = await page.getByTestId("goo-row").boundingBox();
    const pb = (await jarPool.boundingBox())!;
    expect(Math.round(pb.y + pb.height)).toBe(Math.round(row!.y + row!.height));
    // the words show through in Goo Ink, cut to the goo
    // the goo really stands that high (the surface drawn, and the slab's top above the card's foot)
    await expect(jarPool).toHaveAttribute("data-drawn", String(jar));
    expect(await jarPool.evaluate((e) => Math.round(e.getBoundingClientRect().height - Number(e.querySelector("svg g path")!.getAttribute("d")!.split(/[ L]/)[1])))).toBe(jar);
    await expect(jarPool.locator(".pool-ink")).toContainText("Tab bar goo");
    expect(await jarPool.locator(".pool-ink").evaluate((e) => getComputedStyle(e).clipPath)).toMatch(/^url\(/);
    await shot(page, `goo-jar-${n}`);

    // a computer: the pool in the sidebar's foot, over the account row, taking no clicks
    await page.setViewportSize({ width: 1280, height: 800 });
    const sidePool = page.getByTestId("pool-side");
    await expect(sidePool).toHaveAttribute("data-level", String(side));
    const sb = (await page.getByTestId("sidebar").boundingBox())!;
    const sp = (await sidePool.boundingBox())!;
    expect([Math.round(sp.x), Math.round(sp.width), Math.round(sp.y + sp.height)]).toEqual([Math.round(sb.x), Math.round(sb.width), Math.round(sb.y + sb.height)]);
    await expect(sidePool).toHaveAttribute("data-drawn", String(side));
    await expect(sidePool.locator(".pool-ink")).toContainText("tester");
    await shot(page, `goo-side-${n}`);
    await page.getByTestId("side-account").click({ position: { x: 30, y: 30 } });
    await expect(page).toHaveURL(/\/settings/);
    // icons only (900 to 1099): no goo
    await page.setViewportSize({ width: 1000, height: 800 });
    await expect(sidePool).toHaveCount(0);
  });
}

test("no goo, no pool; wiping empties the jar", async ({ page }) => {
  await mockE621(page);
  await seedGoo(page, 12);
  await page.goto("/settings");
  await expect(page.getByTestId("pool-jar")).not.toHaveAttribute("data-level", "0");
  await page.getByTestId("goo-wipe").click();
  await expect(page.getByTestId("pool-jar")).toHaveAttribute("data-level", "0");
  await expect(page.getByTestId("pool-jar").locator(":scope > svg")).toBeHidden();
});

// How a pool moves (DESIGN.md "How a pool moves", owner-approved 2026-11-26)

/** The surface's height now, sampled a few times as it moves. */
const samples = async (page: Page, testId: string, ms: number) =>
  page.evaluate(
    ([id, ms]) =>
      new Promise<number[]>((done) => {
        const out: number[] = [];
        const t0 = performance.now();
        const at = () => {
          out.push(Number(document.querySelector<HTMLElement>(`[data-testid=${id}]`)?.dataset.drawn ?? NaN));
          if (performance.now() - t0 < ms) requestAnimationFrame(at);
          else done(out);
        };
        at();
      }),
    [testId, ms] as const,
  );

test("on a computer a heart's drop falls off the bottom of the window, then the sidebar's pool rises", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await mockE621(page);
  await signIn(page);
  await seedGoo(page, 40);
  await page.goto("/search?tags=wolf");
  const pool = page.getByTestId("pool-side");
  await expect(pool).toHaveAttribute("data-drawn", "37");
  // (the drop lives about a third of a second: note each one as it's added)
  await page.evaluate(() => {
    const w = window as unknown as { drops: number[] };
    w.drops = [];
    new MutationObserver((ms) => {
      for (const m of ms) for (const n of m.addedNodes) if (n instanceof HTMLElement && n.classList.contains("goo-drop")) w.drops.push(performance.now());
    }).observe(document.body, { childList: true });
  });
  const t0 = await page.evaluate(() => performance.now());
  await card(page, 1150).getByTestId("card-fav").click();
  // the pool waits for the drop
  await expect(pool).toHaveAttribute("data-level", "37");
  // 380 ms on, a drop falls (and leaves by the bottom), then the pool rises to 41's level
  await expect.poll(() => page.evaluate(() => (window as unknown as { drops: number[] }).drops.length)).toBe(1);
  expect(await page.evaluate(() => (window as unknown as { drops: number[] }).drops[0]) - t0).toBeGreaterThan(300);
  await expect(page.locator(".goo-drop")).toHaveCount(0);
  await expect(pool).toHaveAttribute("data-level", "38");
  await expect(pool).toHaveAttribute("data-drawn", "38");
});

test("Wipe clean drains the jar over the blade's 900 ms, and Settings opened again catches up", async ({ page }) => {
  await mockE621(page);
  await signIn(page);
  await seedGoo(page, 40);
  await page.goto("/search?tags=wolf");
  await page.getByTestId("tab-settings").click();
  const jar = page.getByTestId("pool-jar");
  await expect(jar).toHaveAttribute("data-drawn", "24");
  // three favorites while Settings is away (in the app, not a reload); opened again, the jar starts
  // at 24 and rises to 25
  await page.goBack();
  for (const id of [1150, 1149, 1148]) await card(page, id).getByTestId("card-fav").click();
  await page.getByTestId("tab-settings").click();
  await expect(count(page)).toHaveText("43 favorites");
  const rise = await samples(page, "pool-jar", 1300);
  expect(rise[0]).toBe(24);
  expect(rise.at(-1)).toBe(25);
  // the drain: down through the levels between, not at once
  await page.getByTestId("goo-wipe").click();
  const fall = await samples(page, "pool-jar", 1100);
  expect(fall.filter((h) => h > 3 && h < 25).length).toBeGreaterThan(5);
  expect(fall.at(-1)).toBe(0);
  await expect(jar.locator(":scope > svg")).toBeHidden();
});

test("with reduced motion the level changes at once: no drop, no catch-up, no drain", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await mockE621(page);
  await signIn(page);
  await seedGoo(page, 40);
  await page.goto("/search?tags=wolf");
  await page.getByTestId("tab-settings").click();
  const jar = page.getByTestId("pool-jar");
  await expect(jar).toHaveAttribute("data-drawn", "24");
  await page.goBack();
  for (const id of [1150, 1149, 1148]) await card(page, id).getByTestId("card-fav").click();
  await page.getByTestId("tab-settings").click();
  await expect(count(page)).toHaveText("43 favorites");
  expect((await samples(page, "pool-jar", 100))[0]).toBe(25);
  await page.getByTestId("goo-wipe").click();
  expect((await samples(page, "pool-jar", 50))[0]).toBe(0);
});

