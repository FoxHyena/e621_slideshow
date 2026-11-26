import { expect, test, type Page } from "@playwright/test";
import { mockE621 } from "./mock";

/**
 * A visit from a share link (DESIGN.md "From a link" chip, "Not signed in on this browser"): the link's
 * settings apply for this visit only, the on chip says what they were, and a browser with no account
 * is told its blacklist isn't applied.
 */

const SHOTS = process.env.E6_SHOTS;
const shot = async (page: Page, name: string) => {
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/${name}.png`, fullPage: false, animations: "disabled" });
};

const signIn = (page: Page) =>
  page.addInitScript(() => {
    if (sessionStorage.getItem("seeded")) return;
    sessionStorage.setItem("seeded", "1");
    localStorage.setItem("e6ss:v1:creds", JSON.stringify({ username: "tester", apiKey: "goodkey" }));
  });

const LINK = "/search?v=1&tags=wolf&r=s&m=i&order=score&int=7&fit=cover";

test("the From a link chip says what the link set; Use my settings drops it", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await mockE621(page);
  await page.goto(LINK);
  const chip = page.getByTestId("chip-link");
  await expect(chip).toBeVisible();
  await expect(chip).toHaveAttribute("data-on");
  await expect(chip).toHaveAttribute("aria-haspopup", "dialog");
  await shot(page, "link-results");
  await chip.click();
  const sheet = page.getByTestId("sheet-link");
  await expect(sheet).toContainText("This link came with its own settings.");
  await expect(sheet).toContainText("For this visit only. Nothing of yours is changed.");
  const row = (name: string) => sheet.locator(".link-row", { hasText: name });
  await expect(row("Ratings")).toContainText("Safe");
  await expect(row("Media")).toContainText("Images");
  await expect(row("Sort")).toContainText("Top");
  await expect(row("Slideshow")).toContainText("Fill, 7 s a slide");
  await shot(page, "link-sheet");
  await sheet.getByTestId("use-my-settings").click();
  await expect(sheet).toHaveCount(0);
  await expect(chip).toHaveCount(0);
  await expect(page).toHaveURL(/\/search\?tags=wolf$/);
  await expect(page.getByTestId("nobody-banner")).toHaveCount(0);
});

test("a link visit with no account: the banner on Results, and over the show's first 4 s", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await mockE621(page);
  await page.goto(LINK);
  const banner = page.getByTestId("nobody-banner");
  await expect(banner).toContainText("Not signed in on this browser");
  await expect(banner).toContainText("Your blacklist isn't applied");
  // under the chips
  const chips = (await page.getByTestId("chips").boundingBox())!;
  expect((await banner.boundingBox())!.y).toBeGreaterThan(chips.y + chips.height - 1);

  await page.getByTestId("play-fab").click();
  const glass = page.getByTestId("player").getByTestId("nobody-banner");
  await expect(glass).toBeVisible();
  await expect(glass).toHaveAttribute("data-glass");
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/link-player-banner.png` }); // (its fade-out is an animation)
  // Sign in from it: the sign-in sheet opens over the show, which pauses (any sheet does)
  await glass.getByTestId("nobody-sign-in").click();
  await expect(page.getByTestId("sheet-sign-in")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByTestId("sheet-sign-in")).toHaveCount(0);
  // gone after its 4 s
  await expect(glass).toHaveCount(0, { timeout: 6000 });
});

test("a launch link: every rating, no slideshow row", async ({ page }) => {
  await mockE621(page);
  await page.goto("/search?l=1&tags=wolf");
  const chips = page.getByTestId("chips");
  // first in the row
  await expect(chips.locator(".chip").first()).toHaveAttribute("data-testid", "chip-link");
  await page.getByTestId("chip-link").click();
  const sheet = page.getByTestId("sheet-link");
  await expect(sheet.locator(".link-row", { hasText: "Ratings" })).toContainText("All");
  await expect(sheet.locator(".link-row", { hasText: "Slideshow" })).toHaveCount(0);
});

test("signed in, a link visit has the chip but no banner", async ({ page }) => {
  await mockE621(page);
  await signIn(page);
  await page.goto(LINK);
  await expect(page.getByTestId("chip-link")).toBeVisible();
  await expect(page.getByTestId("post-card").first()).toBeVisible();
  await expect(page.getByTestId("nobody-banner")).toHaveCount(0);
});

test("a search of your own has neither", async ({ page }) => {
  await mockE621(page);
  await page.goto("/search?tags=wolf");
  await expect(page.getByTestId("post-card").first()).toBeVisible();
  await expect(page.getByTestId("chip-link")).toHaveCount(0);
  await expect(page.getByTestId("nobody-banner")).toHaveCount(0);
});
