import { expect, test, type Page } from "@playwright/test";
import { mockE621, type E621Mock } from "./mock";

/** DESIGN.md "A post on its own": a picture opens on its own, to zoom and save, without the slideshow. */

const SHOTS = process.env.E6_SHOTS;
const shot = async (page: Page, name: string) => {
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/${name}.png`, fullPage: false, animations: "disabled" });
};
const signIn = (page: Page) =>
  page.addInitScript(() => localStorage.setItem("e6ss:v1:creds", JSON.stringify({ username: "tester", apiKey: "goodkey" })));
const viewer = (page: Page) => page.getByTestId("viewer");
const controls = (page: Page) => viewer(page).getByTestId("controls");
/** the picture's scale, from its transform */
const scale = (page: Page) =>
  page.getByTestId("viewer-pic").evaluate((el) => new DOMMatrix(getComputedStyle(el).transform).a);

let mock: E621Mock;
test.beforeEach(async ({ page }) => {
  mock = await mockE621(page);
});

test.describe("on a phone", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("a tap on a picture opens the viewer, not the player; Back closes it on the same post", async ({ page }) => {
    await page.goto("/search?tags=wolf");
    await page.locator('[data-post-id="1149"] [data-testid=card-media]').click();
    await expect(page).toHaveURL(/view=1149/);
    await expect(viewer(page)).toHaveAttribute("data-post-id", "1149");
    await expect(page.getByTestId("player")).toHaveCount(0);
    await expect(page.getByTestId("pause-button")).toHaveCount(0);
    await expect(controls(page)).toHaveAttribute("data-visible", "true");
    for (const name of [/^Favorite/, "Post info", "Share", "Save"]) await expect(viewer(page).getByRole("button", { name })).toBeVisible();
    await expect(viewer(page).getByTestId("viewer-artist")).toContainText("mock artist");
    await expect(page.getByTestId("viewer-pic").locator("img").first()).toHaveJSProperty("complete", true);
    await shot(page, "viewer");
    await page.goBack();
    await expect(viewer(page)).toHaveCount(0);
    await expect(page).toHaveURL(/\/search\?tags=wolf$/);
    await expect(page.locator('[data-post-id="1149"]')).toBeInViewport();
  });

  test("one tap hides and shows the buttons; a double tap zooms at the point and back, and never favorites", async ({ page }) => {
    await signIn(page);
    await page.goto("/search?tags=wolf&view=1149");
    const stage = page.getByTestId("viewer-stage");
    await expect(page.getByTestId("viewer-pic").locator("img").first()).toHaveJSProperty("complete", true);
    await stage.click({ position: { x: 195, y: 300 } });
    await expect(controls(page)).toHaveAttribute("data-visible", "false");
    await stage.click({ position: { x: 195, y: 300 } });
    await expect(controls(page)).toHaveAttribute("data-visible", "true");

    await stage.dblclick({ position: { x: 195, y: 300 } });
    await expect(viewer(page)).toHaveAttribute("data-zoomed", "true");
    await expect.poll(() => scale(page)).toBeCloseTo(2.5, 1);
    // the buttons leave while zoomed
    await expect(controls(page)).toHaveAttribute("data-visible", "false");
    await shot(page, "viewer-zoomed");
    await stage.dblclick({ position: { x: 195, y: 300 } });
    await expect(viewer(page)).not.toHaveAttribute("data-zoomed");
    await expect.poll(() => scale(page)).toBeCloseTo(1, 2);
    await page.waitForTimeout(400);
    expect(mock.favorites).toEqual([]);
  });

  test("the heart favorites; ✕ closes", async ({ page }) => {
    await signIn(page);
    await page.goto("/search?tags=wolf");
    await page.locator('[data-post-id="1149"] [data-testid=card-media]').click();
    const heart = viewer(page).getByTestId("favorite-button");
    await heart.click();
    await expect(heart).toHaveAttribute("aria-pressed", "true");
    await expect.poll(() => mock.favorites).toEqual([{ method: "POST", postId: 1149 }]);
    await viewer(page).getByTestId("viewer-close").click();
    await expect(viewer(page)).toHaveCount(0);
    await expect(page).toHaveURL(/\/search\?tags=wolf$/);
  });

  test("a reload on ?view= finds the post; a wrong number says so", async ({ page }) => {
    await page.goto("/search?tags=nothing_here&view=1147");
    await expect(viewer(page)).toHaveAttribute("data-post-id", "1147");
    await page.goto("/search?tags=wolf&view=424242");
    await expect(viewer(page)).toContainText("No post #424242 on e621");
  });

});

test("a video hands itself to the player, paused, in the viewer's place", async ({ page }) => {
  await page.unrouteAll({ behavior: "wait" });
  await mockE621(page, [{ id: 1150, ext: "webm", duration: 3 }, { id: 1149 }]);
  await page.goto("/search?tags=wolf&view=1150");
  await expect(page).toHaveURL(/play=1150/);
  await expect(page.getByTestId("player")).toHaveAttribute("data-post-id", "1150");
  await expect(page.getByTestId("pause-button")).toHaveAccessibleName("Play");
  await expect(viewer(page)).toHaveCount(0);
});

test.describe("on a computer", () => {
  test.use({ viewport: { width: 1280, height: 800 } });

  test("Esc closes; the wheel zooms; Post info stands beside the picture", async ({ page }) => {
    await page.goto("/search?tags=wolf");
    await page.locator('[data-post-id="1149"] [data-testid=card-media]').click();
    await expect(viewer(page)).toBeVisible();
    await expect(page.getByTestId("viewer-pic").locator("img").first()).toHaveJSProperty("complete", true);
    await page.mouse.move(640, 400);
    await page.mouse.wheel(0, -300);
    await expect.poll(() => scale(page)).toBeGreaterThan(1.5);
    await page.keyboard.press("0");
    await expect.poll(() => scale(page)).toBeCloseTo(1, 2);

    await viewer(page).getByTestId("info-button").click();
    await expect(viewer(page)).toHaveAttribute("data-info", "true");
    // the picture ends 16 short of the 360 panel (the stage slides over 240 ms)
    await expect.poll(async () => {
      const stage = (await page.getByTestId("viewer-stage").boundingBox())!;
      return Math.round(1280 - (stage.x + stage.width));
    }).toBe(376);
    await shot(page, "viewer-desktop-info");
    await page.keyboard.press("Escape");
    await expect(viewer(page)).not.toHaveAttribute("data-info");
    await page.keyboard.press("Escape");
    await expect(viewer(page)).toHaveCount(0);
  });
});
