import { expect, test, type Page } from "@playwright/test";
import { mockE621, type MockPostSpec } from "./mock";

/**
 * Switching a scrolled feed to the grid, or the grid back to the feed, keeps the post you were
 * looking at in view. On a tab the switch rides the floating title capsule, so it's there mid-scroll.
 */

const signIn = (page: Page) =>
  page.addInitScript(() => {
    if (sessionStorage.getItem("seeded")) return;
    sessionStorage.setItem("seeded", "1");
    localStorage.setItem("e6ss:v1:creds", JSON.stringify({ username: "tester", apiKey: "goodkey" }));
  });

/**
 * The id of the card nearest the middle of the view, or the middle tile of the grid row nearest it
 * (the middle can fall in the gap between two).
 */
const middle = (page: Page, testId: "post-card" | "grid-tile") =>
  page.getByTestId(testId).evaluateAll((els) => {
    const y = innerHeight / 2;
    const off = (e: Element) => {
      const r = e.getBoundingClientRect();
      return r.top > y ? r.top - y : r.bottom < y ? y - r.bottom : 0;
    };
    const near = Math.min(...els.map(off));
    const row = els.filter((e) => off(e) === near).sort((a, b) => a.getBoundingClientRect().left - b.getBoundingClientRect().left);
    const hit = row[Math.floor(row.length / 2)];
    return hit ? Number(hit.getAttribute("data-post-id")) : null;
  });

/** How far the middle of an element is from the middle of the view. */
const fromMiddle = async (page: Page, sel: string) => {
  const b = (await page.locator(sel).boundingBox())!;
  return Math.abs(b.y + b.height / 2 - (await page.evaluate(() => innerHeight / 2)));
};

/** Wheel down until the page has scrolled at least `px`, then wait for it to rest. */
async function scrollDown(page: Page, px: number) {
  await expect(async () => {
    await page.mouse.wheel(0, 1500);
    expect(await page.evaluate(() => scrollY)).toBeGreaterThan(px);
  }).toPass();
  await expect(page.getByTestId("top-bar")).toHaveAttribute("data-at", "in");
  await page.waitForTimeout(400);
}

async function roundTrip(page: Page) {
  await expect(page.getByTestId("post-card").first()).toBeVisible();
  await scrollDown(page, 6000);
  const id = await middle(page, "post-card");
  expect(id).not.toBeNull();

  // the feed turns into the grid with that post's tile in view
  await page.getByTestId("grid-toggle").click();
  await expect(page.getByTestId("feed-grid")).toBeVisible();
  const tileSel = `[data-testid=grid-tile][data-post-id="${id}"]`;
  await expect(page.locator(tileSel)).toBeInViewport();
  // centred, not just somewhere on screen (the grid of 150 is many screens tall)
  const cell = (await page.locator(tileSel).boundingBox())!.height;
  expect(await fromMiddle(page, tileSel)).toBeLessThan(cell / 2);

  // further down the grid, and back: the tile in the middle opens the feed at its card
  await page.mouse.wheel(0, 1200);
  await page.waitForTimeout(400);
  const tile = await middle(page, "grid-tile");
  expect(tile).not.toBeNull();
  await page.getByTestId("grid-toggle").click();
  await expect(page.getByTestId("feed")).toBeVisible();
  await expect(page.locator(`[data-testid=post-card][data-post-id="${tile}"]`)).toBeInViewport();
}

test("For You: feed to grid and back keeps the post you were looking at", async ({ page }) => {
  await mockE621(page);
  await page.goto("/for-you");
  await roundTrip(page);
});

test("For You on a phone: feed to grid and back keeps the post you were looking at", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await mockE621(page);
  await page.goto("/for-you");
  await roundTrip(page);
});

test("For You at the top: the grid starts at the top too", async ({ page }) => {
  await mockE621(page);
  await page.goto("/for-you");
  await expect(page.getByTestId("post-card").first()).toBeVisible();
  await page.getByTestId("grid-toggle").click();
  await expect(page.getByTestId("grid-tile").first()).toBeInViewport();
  expect(await page.evaluate(() => scrollY)).toBe(0);
});

test("Following: feed to grid and back keeps the post you were looking at", async ({ page }) => {
  const specs: MockPostSpec[] = Array.from({ length: 150 }, (_, i) => ({ id: 1150 - i, artist: i % 2 ? "fox_artist" : "otter_artist" }));
  const mock = await mockE621(page, specs);
  mock.subscriptions = ["fox_artist", "otter_artist"];
  mock.lastSeen = 1150;
  await signIn(page);
  await page.goto("/following");
  await roundTrip(page);
});
