import { expect, test, type Page } from "@playwright/test";
import { mockE621 } from "./mock";

/** The toast (DESIGN.md "Toast", proposed): a mark always, the words, at most one way back, one at a time. */

const SHOTS = process.env.E6_SHOTS;
test.use({ viewport: { width: 375, height: 812 } });
const shot = async (page: Page, name: string) => {
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/${name}.png`, fullPage: false, animations: "disabled" });
};
const toast = (page: Page) => page.locator("[data-sonner-toast]");

test("a follow's toast wears the artist's mark and Undo with its ring; Undo unfollows", async ({ page }) => {
  const mock = await mockE621(page, [{ id: 1150, artist: "fox_artist" }]);
  await page.addInitScript(() => localStorage.setItem("e6ss:v1:creds", JSON.stringify({ username: "tester", apiKey: "goodkey" })));
  await page.goto("/artist/fox_artist");
  await page.getByTestId("follow-button").click();
  await expect(toast(page)).toContainText("Following fox artist");
  await expect(toast(page).locator(".toast6-mark [data-testid=avatar]")).toHaveAttribute("data-seed", "fox_artist");
  const undo = toast(page).getByRole("button", { name: "Undo" });
  await expect(undo).toBeVisible();
  await shot(page, "toast-follow");
  await undo.click();
  await expect.poll(() => mock.followWrites.map((w) => w.method)).toEqual(["POST", "DELETE"]);
});

test("a plain toast still has its mark; a new toast replaces the one showing", async ({ page }) => {
  await mockE621(page);
  await page.goto("/settings/content");
  await page.getByTestId("rating-e").uncheck();
  await page.getByTestId("rating-q").uncheck();
  await page.getByTestId("rating-s").click();
  await expect(toast(page)).toHaveText("Keep at least one rating on");
  const mark = await toast(page).evaluate((el) => getComputedStyle(el, "::before").width);
  expect(mark).toBe("28px");
  await shot(page, "toast-plain");
  // no Play on this screen: the toast sits just above the bar, not where Play would be
  const box = (await toast(page).boundingBox())!;
  expect(812 - (box.y + box.height)).toBeLessThan(130);
  await page.getByTestId("blacklist-import").click();
  await expect(toast(page).filter({ hasText: "default list" })).toBeVisible();
  await expect(page.locator("[data-sonner-toast][data-visible=true]")).toHaveCount(1);
  // the one it replaced is gone for the keyboard too
  const hidden = page.locator("[data-sonner-toast][data-visible=false]");
  if (await hidden.count()) await expect(hidden.first()).toHaveCSS("visibility", "hidden");
});
