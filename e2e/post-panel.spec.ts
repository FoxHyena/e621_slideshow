import { expect, test } from "@playwright/test";
import { mockE621 } from "./mock";

/** DESIGN.md "Post panel (signature)" and "Shapes": the top corners are 26, a 36 disc sits 8 inside each. */
test.use({ viewport: { width: 390, height: 844 } });

test("a post's top corners are 26 and its mark and ⋯ sit 8 inside them; the bottom corners stay 24", async ({ page }) => {
  const mock = await mockE621(page, Array.from({ length: 6 }, (_, i) => ({ id: 900 - i, artist: "fox_artist" })));
  mock.subscriptions = ["fox_artist"];
  await page.addInitScript(() => localStorage.setItem("e6ss:v1:creds", JSON.stringify({ username: "tester", apiKey: "goodkey" })));
  await page.goto("/following");
  const menu = page.getByTestId("card-menu").first();
  await expect(menu).toBeVisible();
  const post = page.locator(".post:not(.post-skeleton)").first();
  const radii = await post.evaluate((n) => {
    const s = getComputedStyle(n);
    return [s.borderTopLeftRadius, s.borderTopRightRadius, s.borderBottomRightRadius, s.borderBottomLeftRadius];
  });
  expect(radii).toEqual(["26px", "26px", "24px", "24px"]);
  const [p, m, a] = [(await post.boundingBox())!, (await menu.boundingBox())!, (await post.locator(".post-avatar").first().boundingBox())!];
  expect(m.y - p.y).toBeCloseTo(8, 0);
  expect(p.x + p.width - (m.x + m.width)).toBeCloseTo(8, 0);
  expect(a.y - p.y).toBeCloseTo(8, 0);
  expect(a.x - p.x).toBeCloseTo(8, 0);
  if (process.env.SHOTS) await page.screenshot({ path: `${process.env.SHOTS}/post-top.png`, clip: { x: p.x - 4, y: p.y - 4, width: p.width + 8, height: 80 } });
});
