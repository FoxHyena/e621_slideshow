import { expect, test, type Page } from "@playwright/test";
import { mockE621, type E621Mock } from "./mock";

/**
 * The feed screens (UX §5): Search → Results with chips, the windowed feed and the grid,
 * Favorites, and favorites that show the same everywhere.
 */

const SHOTS = process.env.E6_SHOTS;
const shot = async (page: Page, name: string) => {
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/${name}.png`, fullPage: false, animations: "disabled" });
};

const signIn = (page: Page) =>
  page.addInitScript(() => localStorage.setItem("e6ss:v1:creds", JSON.stringify({ username: "tester", apiKey: "goodkey" })));

let mock: E621Mock;
test.beforeEach(async ({ page }) => {
  mock = await mockE621(page);
});

test("Search opens Results, and cards window as the page scrolls", async ({ page }) => {
  await page.goto("/search");
  await page.getByTestId("search-tags").fill("wolf");
  await page.getByTestId("search-submit").click();
  await expect(page).toHaveURL(/\/search\?tags=wolf$/);
  await expect(page.getByTestId("post-card").first()).toBeVisible();
  await shot(page, "results");
  expect(mock.searches[0].tags).toContain("wolf");
  // Only cards near the view are in the DOM.
  const n = await page.getByTestId("post-card").count();
  expect(n).toBeGreaterThan(2);
  expect(n).toBeLessThan(40);
  await page.mouse.wheel(0, 20000);
  await expect.poll(() => page.getByTestId("post-card").first().getAttribute("data-index")).not.toBe("0");
  // Recent searches remember it.
  await page.goBack();
  await expect(page.getByTestId("recent-search")).toHaveText("wolf");
});

test("a chip changes the filters in the URL, and Back closes its sheet first", async ({ page }) => {
  await page.goto("/search?tags=wolf");
  await expect(page.getByTestId("post-card").first()).toBeVisible();
  await page.getByTestId("chip-sort").click();
  await expect(page.getByTestId("sheet-sort")).toBeVisible();
  await shot(page, "sort-sheet");
  await page.goBack();
  await expect(page.getByTestId("sheet-sort")).toBeHidden();
  await expect(page).toHaveURL(/\/search\?tags=wolf$/);

  await page.getByTestId("chip-sort").click();
  await page.getByTestId("sort-score").click();
  await expect(page).toHaveURL(/order=score/);
  await expect(page.getByTestId("chip-sort")).toHaveText("Top");
  await expect.poll(() => mock.searches.some((s) => s.tags.includes("order:score"))).toBe(true);
  // A filter change replaced the entry: one Back leaves Results.
  await page.getByTestId("chip-reset").click();
  await expect(page).toHaveURL(/\/search\?tags=wolf$/);
  await page.goBack();
  await expect(page).toHaveURL(/\/following$/);
});

test("the grid shows the same posts as tiles", async ({ page }) => {
  await page.goto("/search?tags=wolf");
  await page.getByTestId("grid-toggle").click();
  await expect(page.getByTestId("grid-tile").first()).toBeVisible();
  await shot(page, "grid");
  expect(await page.getByTestId("grid-tile").count()).toBeGreaterThan(9);
});

test("a tile opens the feed at that post, not the player", async ({ page }) => {
  await page.goto("/search?tags=wolf");
  await page.getByTestId("grid-toggle").click();
  const tile = page.getByTestId("grid-tile").nth(7);
  await expect(tile).toBeVisible();
  const id = await tile.getAttribute("data-post-id");
  await tile.click();
  await expect(page.getByTestId("feed")).toBeVisible();
  await expect(page.getByTestId("player")).toHaveCount(0);
  await expect(page.getByTestId("grid-toggle")).toHaveAttribute("aria-label", "Show as grid");
  // the tapped post's card starts at the top of the view
  const card = page.locator(`[data-testid="post-card"][data-post-id="${id}"]`);
  await expect(card).toBeInViewport();
  const top = (await card.boundingBox())!.y;
  expect(top).toBeGreaterThanOrEqual(0);
  expect(top).toBeLessThan(40);
});

test("Back keeps the cards you were looking at: the same pictures, not new ones decoding again", async ({ page }) => {
  await page.goto("/search?tags=wolf");
  const card = page.locator('[data-testid=post-card][data-post-id="1140"]');
  await expect(page.getByTestId("post-card").first()).toBeVisible();
  // scroll until the card is on screen
  await expect(async () => {
    await page.mouse.wheel(0, 1200);
    await expect(card).toBeInViewport({ timeout: 300 });
  }).toPass();
  await card.getByTestId("card-image").evaluate((img) => ((img as HTMLImageElement & { kept?: boolean }).kept = true));
  await card.getByTestId("card-artist").click();
  await expect(page).toHaveURL(/\/artist\//);
  await page.goBack();
  await expect(card).toBeInViewport();
  expect(await card.getByTestId("card-image").evaluate((img) => (img as HTMLImageElement & { kept?: boolean }).kept === true)).toBe(true);
});

test("favoriting shows at once on the card and reaches e621", async ({ page }) => {
  await signIn(page);
  await page.goto("/search?tags=wolf");
  const fav = page.getByTestId("card-fav").first();
  await expect(fav).toHaveAttribute("aria-pressed", "false");
  await fav.click();
  await expect(fav).toHaveAttribute("aria-pressed", "true");
  await expect(fav).toHaveAccessibleName("Favorite, 4");
  await expect.poll(() => mock.favorites).toEqual([{ method: "POST", postId: 1150 }]);
});

test("Favorites asks to sign in when signed out, and lists them when signed in", async ({ page }) => {
  await page.goto("/favorites");
  await expect(page.getByTestId("needs-sign-in")).toBeVisible();
  await signIn(page);
  await page.reload();
  await expect(page.getByTestId("post-card").first()).toBeVisible();
  expect(mock.searches.at(-1)?.tags).toContain("fav:tester");
  await shot(page, "favorites");
});

test("holding a tag can blacklist it, hiding matching posts in place, with Undo", async ({ page }) => {
  mock.setPosts([
    { id: 3, tags: ["solo"] },
    { id: 2, tags: ["duo"] },
    { id: 1, tags: ["solo"] },
  ]);
  await page.goto("/search?tags=wolf");
  await expect(page.getByTestId("post-card")).toHaveCount(3);
  await page.locator('[data-post-id="2"] [data-tag="duo"]').click();
  await page.getByTestId("tag-action-blacklist").click();
  await expect(page.getByTestId("post-card")).toHaveCount(2);
  await page.getByRole("button", { name: "Undo" }).click();
  await expect(page.getByTestId("post-card")).toHaveCount(3);
});

test("narrowing the search from a tag deep in the list starts the new results at the top", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto("/search?tags=wolf");
  await expect(page.getByTestId("post-card").first()).toBeVisible();
  await page.evaluate(() => window.scrollTo(0, 3000));
  await page.waitForTimeout(300);
  const card = page.locator("[data-testid=post-card]:has([data-tag=solo])").filter({ visible: true }).last();
  await card.locator("[data-tag=solo]").click();
  await page.getByTestId("tag-action-search").click();
  await expect(page).toHaveURL(/tags=wolf\+solo/);
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0);
});

test("a reload comes back to the same post", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto("/search?tags=wolf");
  await expect(page.getByTestId("post-card").first()).toBeVisible();
  await page.evaluate(() => window.scrollTo(0, 3000));
  await page.waitForTimeout(300);
  const top = () =>
    page.evaluate(() => {
      const cards = [...document.querySelectorAll<HTMLElement>("[data-testid=post-card]")];
      return cards.find((c) => c.getBoundingClientRect().bottom > 0)?.dataset.postId;
    });
  const before = await top();
  await page.reload();
  await expect.poll(top).toBe(before);
});

test("a card's artist opens their posts, and Back returns to the same card", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto("/search?tags=wolf");
  await page.locator('[data-post-id="1148"] [data-testid=card-artist]').click();
  await expect(page).toHaveURL(/\/artist\/mock_artist$/);
  await expect(page.getByRole("heading", { level: 1, name: "mock artist" })).toBeVisible();
  await expect(page.locator("[data-screen=artist] [data-testid=post-card]").first()).toBeVisible();
  expect(mock.searches.at(-1)!.tags.split(" ")).toContain("mock_artist");
  await page.goBack();
  await expect(page).toHaveURL(/\/search\?tags=wolf$/);
  await expect(page.locator('[data-post-id="1148"]')).toBeInViewport();
});

test.describe("player", () => {
  const slide = (page: Page) => page.locator("[data-testid=player] :is([data-testid=slide-image],[data-testid=slide-video])").first();

  test("⋯ › Play from this post opens the player; closing lands the feed on the last post shown", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto("/search?tags=wolf");
    await page.locator('[data-post-id="1149"] [data-testid=card-menu]').click();
    await page.getByTestId("sheet-post").getByRole("button", { name: "Play from this post" }).click();
    await expect(page).toHaveURL(/play=1149/);
    const player = page.getByTestId("player");
    await expect(player).toHaveAttribute("data-post-id", "1149");
    await page.getByTestId("pause-button").click();
    await expect(page.getByTestId("pause-button")).toHaveAccessibleName("Play");
    await expect(slide(page)).toBeVisible();
    await shot(page, "player");
    // Next replaces the entry: one Back closes the player.
    for (let i = 0; i < 4; i++) await page.getByTestId("next-button").click();
    await expect(player).toHaveAttribute("data-post-id", "1145");
    await expect(page).toHaveURL(/play=1145/);
    await page.goBack();
    await expect(player).toBeHidden();
    await expect(page).toHaveURL(/\/search\?tags=wolf$/);
    const centre = await page.evaluate(() => {
      const el = document.querySelector<HTMLElement>('[data-testid=post-card][data-post-id="1145"]');
      const r = el?.getBoundingClientRect();
      return r ? Math.abs(r.top + r.height / 2 - innerHeight / 2) : null;
    });
    expect(centre).not.toBeNull();
    expect(centre!).toBeLessThan(40);
  });

  test("← fades out the post you left, not an older one", async ({ page }) => {
    await page.goto("/search?tags=wolf&play=1150");
    const player = page.getByTestId("player");
    await expect(player).toHaveAttribute("data-post-id", "1150");
    await page.getByTestId("next-button").click();
    await page.getByTestId("next-button").click();
    await expect(player).toHaveAttribute("data-post-id", "1148");
    const leftSrc = await slide(page).getAttribute("src");
    await page.getByRole("button", { name: "Previous" }).click();
    await expect(player).toHaveAttribute("data-post-id", "1149");
    // the layer fading out is 1148 (the one on screen a moment ago), never 1150
    await expect(page.getByTestId("previous-layer").locator("img")).toHaveAttribute("src", leftSrc!);
  });

  test("← in Vintage Prints and Collage brings the earlier post back up", async ({ page }) => {
    for (const [style, sel] of [["prints", "[data-testid=prints-scene]"], ["collage", "[data-testid=collage-stage] > div"]] as const) {
      await page.goto("/search?tags=wolf");
      await page.evaluate((style) => localStorage.setItem("e6ss:v1:playback", JSON.stringify({ style, intervalSec: 60 })), style);
      await page.goto("/search?tags=wolf&play=1150");
      const player = page.getByTestId("player");
      await expect(player).toHaveAttribute("data-post-id", "1150");
      await page.getByTestId("next-button").click();
      await expect(player).toHaveAttribute("data-post-id", "1149");
      await page.getByRole("button", { name: "Previous" }).click();
      await expect(player).toHaveAttribute("data-post-id", "1150");
      // the layer showing 1150 comes up (before, it waited forever for a load that had already happened)
      const shown = () =>
        page.evaluate(
          (sel) => [...document.querySelectorAll<HTMLElement>(sel)].some((e) => e.querySelector('[data-post-id="1150"]') && getComputedStyle(e).opacity === "1"),
          sel,
        );
      await expect.poll(shown, { timeout: 3000 }).toBe(true);
    }
  });

  test("▶ plays from the top, a reload keeps the post, and Esc closes", async ({ page }) => {
    await page.goto("/search?tags=wolf");
    await page.getByTestId("play-fab").click();
    await expect(page).toHaveURL(/play=1150/);
    await expect(page.getByTestId("pause-button")).toHaveAccessibleName("Pause");
    await page.getByTestId("next-button").click();
    await expect(page).toHaveURL(/play=1149/);
    await page.reload();
    await expect(page.getByTestId("player")).toHaveAttribute("data-post-id", "1149");
    await page.keyboard.press("Escape");
    await expect(page.getByTestId("player")).toBeHidden();
    await expect(page).toHaveURL(/\/search\?tags=wolf$/);
  });

  test("quick settings pause the show and save the style; Back closes only the sheet", async ({ page }) => {
    await page.goto("/search?tags=wolf");
    await page.getByTestId("play-fab").click();
    await page.getByTestId("quick-settings-button").click();
    await expect(page.getByTestId("sheet-quick-settings")).toBeVisible();
    await shot(page, "quick-settings");
    await page.getByTestId("quick-style").getByRole("radio", { name: "Ken Burns" }).click();
    expect(await page.evaluate(() => JSON.parse(localStorage.getItem("e6ss:v1:playback")!).style)).toBe("kenburns");
    await page.goBack();
    await expect(page.getByTestId("sheet-quick-settings")).toBeHidden();
    await expect(page.getByTestId("player")).toBeVisible();
  });
});
