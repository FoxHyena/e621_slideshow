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
    await expect(jarPool.locator(".pool-ink")).toContainText("Tab bar goo");
    expect(await jarPool.locator(".pool-ink").evaluate((e) => getComputedStyle(e).maskImage)).toContain("data:image/svg+xml");
    await shot(page, `goo-jar-${n}`);

    // a computer: the pool in the sidebar's foot, over the account row, taking no clicks
    await page.setViewportSize({ width: 1280, height: 800 });
    const sidePool = page.getByTestId("pool-side");
    await expect(sidePool).toHaveAttribute("data-level", String(side));
    const sb = (await page.getByTestId("sidebar").boundingBox())!;
    const sp = (await sidePool.boundingBox())!;
    expect([Math.round(sp.x), Math.round(sp.width), Math.round(sp.y + sp.height)]).toEqual([Math.round(sb.x), Math.round(sb.width), Math.round(sb.y + sb.height)]);
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
  await expect(page.getByTestId("pool-jar").locator("svg")).toHaveCount(0);
});
