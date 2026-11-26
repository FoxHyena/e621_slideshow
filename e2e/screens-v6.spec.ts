import { expect, test, type Locator, type Page } from "@playwright/test";
import { mockE621 } from "./mock";

/**
 * The v6 screens (DESIGN.md "Lists", "Search", "Tune", "Settings", "Grid view"): the geometry the
 * spec pins down, measured in the page, plus screenshots for the visual check (E6_SHOTS=dir).
 */

const SHOTS = process.env.E6_SHOTS;
const shot = async (page: Page, name: string) => {
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/${name}.png`, fullPage: true, animations: "disabled" });
};

test.use({ viewport: { width: 375, height: 812 } });

const signIn = (page: Page) =>
  page.addInitScript(() => {
    if (sessionStorage.getItem("seeded")) return;
    sessionStorage.setItem("seeded", "1");
    localStorage.setItem("e6ss:v1:creds", JSON.stringify({ username: "tester", apiKey: "goodkey" }));
  });

const box = async (l: Locator) => (await l.boundingBox())!;

test("Settings: rows in groups, icon wells, row ends 16 in from the panel's edge", async ({ page }) => {
  await mockE621(page);
  await signIn(page);
  await page.goto("/settings");
  await expect(page.getByRole("heading", { level: 1, name: "Settings" })).toBeVisible();
  await expect(page.getByTestId("settings-account")).toContainText("tester");
  const group = page.getByRole("list", { name: "Settings" });
  const rows = group.locator(".list-row");
  await expect(rows).toHaveCount(4);
  const g = await box(group);
  for (let i = 0; i < 4; i++) {
    const r = await box(rows.nth(i));
    expect(r.height).toBeGreaterThanOrEqual(56);
    // the well's left edge is 16 in; the chevron's ink ends 16 from the right edge (its box 5 past)
    const well = await box(rows.nth(i).locator(".row-well"));
    expect(Math.round(well.x - g.x)).toBe(16);
    expect(well.width).toBe(32);
    const chev = await box(rows.nth(i).locator(".row-chev"));
    expect(Math.round(g.x + g.width - (chev.x + chev.width))).toBe(11);
  }
  await expect(rows.nth(1)).toContainText("6 s");
  // 8 between the title row and the account group (mock)
  const title = await box(page.locator(".title-row"));
  const account = await box(page.getByRole("list", { name: "Account" }));
  expect(Math.round(account.y - (title.y + title.height))).toBe(8);
  await expect(page.locator(".app-foot")).toContainText(/Version \d+\.\d+\.\d+/);
  // the goo row: Wipe clean ends 16 in
  const goo = page.getByTestId("goo-row");
  const wipe = await box(page.getByTestId("goo-wipe"));
  const gb = await box(goo);
  expect(Math.round(gb.x + gb.width - (wipe.x + wipe.width))).toBe(16);
  expect(wipe.height).toBe(36);
  await shot(page, "v6-settings");
});

test("Search: back and the field share the top row; recent and saved show tags with a dot", async ({ page }) => {
  await mockE621(page);
  await page.addInitScript(() => {
    localStorage.setItem("e6ss:v1:history", JSON.stringify([{ tags: "red_fox solo", at: 1 }]));
    localStorage.setItem(
      "e6ss:v1:saved",
      JSON.stringify([{ id: "a", name: "fox solo", tags: "fox solo", ratings: { s: true, q: true, e: false }, date: { enabled: false }, order: "score" }]),
    );
  });
  await page.goto("/search");
  const field = page.getByTestId("search-tags");
  await expect(field).toBeFocused();
  const back = await box(page.getByRole("button", { name: "Back" }));
  const f = await box(page.locator(".field6").first());
  expect(Math.abs(back.y + back.height / 2 - (f.y + f.height / 2))).toBeLessThan(1);
  expect(f.height).toBe(44);
  await expect(page.getByTestId("recent-search")).toHaveText("red fox · solo");
  // named after its tags: the name shows them, the line only what's extra
  await expect(page.getByTestId("saved-search").locator("b")).toHaveText("fox · solo");
  await expect(page.getByTestId("saved-search").locator("small")).toHaveText("Top");
  // Search appears once there's something to search
  await expect(page.getByTestId("search-submit")).toHaveCount(0);
  await field.fill("wolf");
  await expect(page.getByTestId("search-submit")).toBeVisible();
  await shot(page, "v6-search");
  await page.getByTestId("search-submit").click();
  await expect(page).toHaveURL(/\/search\?tags=wolf$/);
  // Results: the search as a field-shaped button between back and the tools capsule
  const pill = page.getByTestId("query-pill");
  await expect(pill).toHaveText("wolf");
  await expect(page.locator(".head-row .tools .toolbar-circle")).toHaveCount(3);
  await expect(page.getByTestId("post-card").first()).toBeVisible();
  await shot(page, "v6-results");
});

test("Search opened from Following keeps focus in its field once its code is loaded", async ({ page }) => {
  await mockE621(page);
  await page.goto("/following");
  // the idle prefetch has the Search screen's code ready, so its heading exists at once
  await page.waitForFunction(() => performance.getEntriesByType("resource").length > 0);
  await page.goto("/search");
  await page.getByRole("button", { name: "Back" }).click();
  await page.getByRole("button", { name: "Search", exact: true }).first().click();
  await expect(page.getByTestId("search-tags")).toBeFocused();
});

test("Grid: 8 between columns, 12 between rows, score and favs under each tile", async ({ page }) => {
  await mockE621(page);
  await page.goto("/search?tags=wolf");
  await expect(page.getByTestId("post-card").first()).toBeVisible();
  await page.getByTestId("grid-toggle").click();
  const tiles = page.getByTestId("grid-tile");
  await expect(tiles.nth(3)).toBeVisible();
  const [a, b, d] = [await box(tiles.nth(0).locator(".tile-art")), await box(tiles.nth(1).locator(".tile-art")), await box(tiles.nth(3).locator(".tile-art"))];
  expect(Math.round(b.x - (a.x + a.width))).toBe(8);
  expect(Math.round(a.width)).toBe(Math.round(a.height));
  const nums = await box(tiles.nth(0).locator(".tile-nums"));
  expect(Math.round(nums.y - (a.y + a.height))).toBe(4);
  expect(Math.round(d.y - (nums.y + nums.height))).toBe(12);
  await expect(tiles.nth(0).locator(".tile-up")).not.toBeEmpty();
  await shot(page, "v6-grid");
});

test("Tune: the sync row, the Breadth slider, and Pin and Mute toggles", async ({ page }) => {
  const mock = await mockE621(page);
  mock.setFavorites(Array.from({ length: 10 }, (_, i) => ({ id: 2000 + i, tags: ["pawpads", "toebeans", "solo"] })));
  mock.tagCounts = { pawpads: 5, toebeans: 5 };
  await signIn(page);
  await page.goto("/for-you/tune");
  await expect(page.getByRole("heading", { level: 1, name: "Tune" })).toBeVisible();
  await expect(page.getByTestId("rec-status")).toContainText("favorites read", { timeout: 10000 });
  const rebuild = await box(page.getByTestId("rec-rebuild"));
  expect(rebuild.height).toBe(36);
  const slider = page.getByTestId("rec-breadth");
  await expect(slider).toHaveAttribute("style", /--p:/);
  const pin = page.getByTestId("rec-tag").first().getByRole("button", { name: /^Pin / });
  await pin.click();
  await expect(page.getByTestId("rec-tag").first().getByRole("button", { name: /^Unpin / })).toHaveAttribute("aria-pressed", "true");
  await shot(page, "v6-tune");
});
