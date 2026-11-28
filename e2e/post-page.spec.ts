import { expect, test, type Page } from "@playwright/test";
import { mockE621, type E621Mock } from "./mock";

/** DESIGN.md "A post on its own": the post page, `/post/<number>`, reached from a link or a post's ⋯. */

const SHOTS = process.env.E6_SHOTS;
const shot = async (page: Page, name: string) => {
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/${name}.png`, fullPage: false, animations: "disabled" });
};
const postPage = (page: Page) => page.getByTestId("post-page");

let mock: E621Mock;
const POSTS = [
  { id: 1149, description: 'h2. Reed\n[b]Page three.[/b] Reed reaches the river. "More":https://example.com/more', sources: ["not a link", "https://www.example.com/art/1"], tags: ["river", "cozy"] },
  { id: 1148 },
  { id: 1147 },
  { id: 1146, hidden: true },
  { id: 1145 },
];

test.describe("on a phone", () => {
  test.use({ viewport: { width: 390, height: 844 } });
  test.beforeEach(async ({ page }) => {
    mock = await mockE621(page, POSTS);
  });

  test("a link opens the post signed out: the panel without tags, the tags by kind, the links, more from the artist", async ({ page }) => {
    await page.goto("/post/1149");
    const card = postPage(page).getByTestId("post-card");
    await expect(card).toHaveAttribute("data-post-id", "1149");
    await expect(card.getByTestId("card-tags")).toHaveCount(0);
    await expect(page.getByTestId("play-fab")).toHaveCount(0);
    const info = page.getByTestId("post-info");
    // the description keeps its DText formatting: a header, bold, a link (a friend's report, 2026-11-27)
    const desc = page.getByTestId("post-desc");
    await expect(desc.locator(".dtext-h")).toHaveText("Reed");
    await expect(desc).not.toContainText("h2.");
    await expect(desc.locator("strong")).toHaveText("Page three.");
    await expect(desc.getByRole("link", { name: "More" })).toHaveAttribute("href", "https://example.com/more");
    await expect(info.getByRole("region", { name: "Artists" })).toContainText("mock artist");
    await expect(info.getByRole("region", { name: "General" })).toContainText("river");
    await expect(info).toContainText("64 × 48 · PNG");
    await expect(page.getByTestId("post-source")).toHaveAttribute("href", "https://www.example.com/art/1");
    await expect(page.getByTestId("post-source")).toContainText("example.com");
    await expect(page.getByTestId("post-e621")).toHaveAttribute("href", "https://e621.net/posts/1149");
    const tiles = page.getByTestId("post-more-tile");
    await expect(tiles.first()).toBeVisible();
    expect(await tiles.evaluateAll((ts) => ts.map((t) => t.getAttribute("data-post-id")))).not.toContain("1149");
    expect(mock.searches.some((s) => s.tags.includes("id:1149"))).toBe(true);
    await shot(page, "post-page");

    // a tile opens that post's page; Back comes back
    await tiles.first().click();
    await expect(page).toHaveURL(/\/post\/1148$/);
    await page.goBack();
    await expect(page).toHaveURL(/\/post\/1149$/);
    // See all opens the artist
    await page.getByTestId("post-see-all").click();
    await expect(page).toHaveURL(/\/artist\/mock_artist$/);
  });

  test("the picture opens the viewer over the page", async ({ page }) => {
    await page.goto("/post/1149");
    await postPage(page).getByTestId("card-media").click();
    await expect(page).toHaveURL(/\/post\/1149\?view=1149$/);
    await expect(page.getByTestId("viewer")).toHaveAttribute("data-post-id", "1149");
    await page.goBack();
    await expect(page.getByTestId("viewer")).toHaveCount(0);
  });

  test("a wrong number: Goo looking, and Search", async ({ page }) => {
    await page.goto("/post/424242");
    await expect(page.getByTestId("post-missing")).toContainText("No post #424242 on e621");
    await expect(page.getByTestId("post-missing")).toContainText("It was deleted, or the link is wrong.");
    await page.getByTestId("post-missing").getByRole("button", { name: "Search" }).click();
    await expect(page).toHaveURL(/\/search$/);
  });

  test("a post e621 hides from signed-out visitors shows the gate with Sign in", async ({ page }) => {
    await page.goto("/post/1146");
    const gate = page.getByTestId("post-gate");
    await expect(gate).toContainText("Sign in to see this post");
    await expect(gate).toContainText("e621 hides it from signed-out visitors.");
    await gate.getByRole("button", { name: "Sign in" }).click();
    await expect(page.getByTestId("sheet-sign-in")).toBeVisible();
  });

  test("a post on your blacklist says which line, and Show it shows it once", async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem("e6ss:v1:search", JSON.stringify({ blacklist: "cozy river" })));
    await page.goto("/post/1149");
    const gate = page.getByTestId("post-gate");
    await expect(gate).toContainText("On your blacklist");
    await expect(gate).toContainText("It matches “cozy river” in your blacklist.");
    await expect(postPage(page).getByTestId("post-card")).toHaveCount(0);
    await shot(page, "post-page-blacklisted");
    await gate.getByRole("button", { name: "Show it" }).click();
    await expect(postPage(page).getByTestId("post-card")).toBeVisible();
  });

  test("a post's ⋯ starts with Open post; Share post shares the post page", async ({ page }) => {
    await page.addInitScript(() => {
      const w = window as unknown as { shared: string[] };
      w.shared = [];
      Object.assign(navigator, { share: async (d: ShareData) => void w.shared.push(d.url ?? "") });
    });
    await page.goto("/search?tags=wolf");
    await page.locator('[data-post-id="1149"] [data-testid=card-menu]').click();
    const sheet = page.getByTestId("sheet-post");
    await expect(sheet.locator(".well-row").first()).toHaveText("Open post");
    await sheet.getByRole("button", { name: "Share post" }).click();
    await expect
      .poll(() => page.evaluate(() => (window as unknown as { shared: string[] }).shared))
      .toEqual([new URL("/post/1149", page.url()).href]);
    await sheet.getByTestId("open-post").click();
    await expect(page).toHaveURL(/\/post\/1149$/);
    await expect(postPage(page).getByTestId("post-card")).toBeVisible();
    // the page's own ⋯ has no Open post and no Play
    await page.getByTestId("post-more").click();
    await expect(page.getByTestId("sheet-post")).toBeVisible();
    await expect(page.getByTestId("sheet-post").getByText("Open post")).toHaveCount(0);
    await expect(page.getByTestId("sheet-post").getByText(/^Play/)).toHaveCount(0);
    await page.keyboard.press("Escape");
    await page.goBack();
    await expect(page).toHaveURL(/\/search\?tags=wolf$/);
  });
});

test.describe("a card's bar, and Post info (owner, 2026-11-27)", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("the bar opens the post's page; the artist's name and mark open the artist", async ({ page }) => {
    await mockE621(page, POSTS);
    await page.goto("/search?tags=wolf");
    const card = page.locator('[data-testid=post-card][data-post-id="1149"]');
    const bar = card.getByTestId("card-open");
    const box = (await bar.boundingBox())!;
    await bar.click({ position: { x: box.width - 24, y: box.height / 2 } });
    await expect(page).toHaveURL(/\/post\/1149$/);
    // on the post's own page the bar does nothing: it has no button (DESIGN.md "Post panel", Header)
    await expect(postPage(page).getByTestId("post-card")).toBeVisible();
    await expect(postPage(page).getByTestId("card-open")).toHaveCount(0);
    await page.goBack();
    await expect(page).toHaveURL(/\/search\?tags=wolf$/);
    await card.getByTestId("card-artist").click();
    await expect(page).toHaveURL(/\/artist\/mock_artist$/);
    await page.goBack();
    await card.locator(".post-artist-mark").click();
    await expect(page).toHaveURL(/\/artist\/mock_artist$/);
  });

  test("I opens Post info with the post's description", async ({ page }) => {
    await mockE621(page, POSTS);
    await page.goto("/search?tags=wolf&view=1149");
    await expect(page.getByTestId("viewer")).toHaveAttribute("data-post-id", "1149");
    await page.keyboard.press("i");
    const desc = page.getByTestId("sheet-info").getByTestId("info-desc");
    await expect(desc.locator(".dtext-h")).toHaveText("Reed");
    await expect(desc.getByRole("link", { name: "More" })).toHaveAttribute("href", "https://example.com/more");
  });
});

test.describe("what the viewer can't show goes to the post's page (a review, 2026-11-27)", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("a link to a hidden post in the viewer lands on its page's Sign in gate, not a loader", async ({ page }) => {
    await mockE621(page, POSTS);
    await page.goto("/search?tags=wolf&view=1146");
    await expect(page).toHaveURL(/\/post\/1146$/);
    await expect(page.getByTestId("post-gate")).toContainText("Sign in to see this post");
    await expect(page.getByTestId("viewer")).toHaveCount(0);
  });

  test("a video with no feed behind it plays on its page, not in a player that never loads", async ({ page }) => {
    await mockE621(page, [...POSTS, { id: 1144, ext: "webm" }]);
    await page.goto("/post/1149?view=1144");
    await expect(page).toHaveURL(/\/post\/1144$/);
    await expect(page.locator('[data-testid=post-card][data-post-id="1144"]')).toBeVisible();
    await expect(page.getByTestId("player")).toHaveCount(0);
  });

  test("a blacklisted post goes to its page's gate; after Show it, its picture opens in the viewer", async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem("e6ss:v1:search", JSON.stringify({ blacklist: "cozy river" })));
    await mockE621(page, POSTS);
    await page.goto("/search?tags=wolf&view=1149");
    await expect(page).toHaveURL(/\/post\/1149$/);
    await page.getByTestId("post-show-it").click();
    await postPage(page).getByTestId("card-media").click();
    await expect(page).toHaveURL(/\/post\/1149\?view=1149$/);
    await expect(page.getByTestId("viewer")).toHaveAttribute("data-post-id", "1149");
  });

  test("the viewer from a post's page asks e621 nothing more, and takes the focus", async ({ page }) => {
    const mock = await mockE621(page, POSTS);
    await page.goto("/post/1149");
    await expect(postPage(page).getByTestId("post-card")).toBeVisible();
    await page.waitForTimeout(300);
    // one ask for the post, however often the page's effect runs
    expect(mock.searches.filter((s) => s.tags === "id:1149")).toHaveLength(1);
    const asked = 1;
    await postPage(page).getByTestId("card-media").click();
    await expect(page.getByTestId("viewer")).toHaveAttribute("data-post-id", "1149");
    await expect(page.getByTestId("viewer-pic")).toBeVisible();
    await page.waitForTimeout(300);
    expect(mock.searches.filter((s) => s.tags === "id:1149")).toHaveLength(asked);
    await expect.poll(() => page.evaluate(() => document.activeElement?.getAttribute("data-testid"))).toBe("viewer");
  });

  test("More from leaves out your blacklist and the ratings you have off", async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem("e6ss:v1:search", JSON.stringify({ blacklist: "gore", ratings: { s: true, q: true, e: false } })));
    const mock = await mockE621(page, [POSTS[0], { id: 1148, tags: ["gore"] }, { id: 1147 }, { id: 1145 }]);
    await page.goto("/post/1149");
    const tiles = page.getByTestId("post-more-tile");
    await expect(tiles.first()).toBeVisible();
    expect(await tiles.evaluateAll((ts) => ts.map((t) => t.getAttribute("data-post-id")))).toEqual(["1147", "1145"]);
    expect(mock.searches.some((s) => s.tags.startsWith("mock_artist -id:1149") && s.tags.includes("-rating:e"))).toBe(true);
  });

  test("Try again shows the loader while it asks", async ({ page }) => {
    const mock = await mockE621(page, POSTS);
    mock.searchFails = (t) => t === "id:1149";
    await page.goto("/post/1149");
    await expect(page.getByTestId("post-error")).toBeVisible();
    mock.searchFails = () => false;
    mock.searchDelay = (t) => (t === "id:1149" ? 800 : 0);
    await page.getByTestId("post-error").getByRole("button", { name: "Try again" }).click();
    await expect(page.getByTestId("post-error")).toHaveCount(0);
    await expect(page.getByText("Finding post #1149")).toBeVisible();
    await expect(postPage(page).getByTestId("post-card")).toBeVisible();
  });
});

test("on a wide computer the rest stands in a 344 column 24 right of the post", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  mock = await mockE621(page, POSTS);
  await page.goto("/post/1149");
  const card = (await postPage(page).getByTestId("post-card").boundingBox())!;
  const info = (await page.getByTestId("post-info").boundingBox())!;
  expect(Math.round(card.width)).toBe(600);
  expect(Math.round(info.width)).toBe(344);
  expect(Math.round(info.x - (card.x + card.width))).toBe(24);
  expect(Math.round(info.y)).toBe(Math.round(card.y));
  await shot(page, "post-page-desktop");
});
