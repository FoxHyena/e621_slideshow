import { expect, test, type Page } from "@playwright/test";
import { mockE621, type MockPostSpec } from "./mock";

/**
 * The artist page (UX.md "Artist page", DESIGN.md "Artist page" and its edges): a pasted
 * `/artist/x` signed in and out, the hero and its stats, the wide Follow, the compact bar, the
 * chips kept in the URL, Share and ⋯, a name e621 doesn't know, and a tag that isn't an artist.
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

/** 30 posts by fox (newest 1150), a few by otter. */
function posts(): MockPostSpec[] {
  return Array.from({ length: 34 }, (_, i) => ({ id: 1150 - i, artist: i >= 30 ? "otter_artist" : "fox_artist" }));
}

async function setup(page: Page, signedIn = true) {
  const mock = await mockE621(page, posts());
  mock.subscriptions = ["otter_artist"];
  mock.tagCounts = { fox_artist: 1234, red_fox: 182_000 };
  if (signedIn) await signIn(page);
  return mock;
}

const hero = (page: Page) => page.getByTestId("artist-hero");
const follow = (page: Page) => page.getByTestId("follow-button");
const stat = (page: Page, key: string) => page.locator(`.hero-stat[data-stat="${key}"]`);

test("a pasted /artist/x signed out: the hero, its stats, the posts; Follow asks you to sign in", async ({ page }) => {
  const mock = await setup(page, false);
  await page.goto("/artist/fox_artist");
  await expect(hero(page).getByRole("heading", { level: 1 })).toHaveText("fox artist");
  await expect(page.getByTestId("artist-handle")).toHaveText("fox_artist");
  await expect(stat(page, "posts")).toContainText("1.2K");
  await expect(stat(page, "posts")).toContainText("posts");
  await expect(stat(page, "last")).toContainText("last post");
  await expect(stat(page, "faved")).toHaveCount(0);
  await expect(page.locator("[data-post-id]").first()).toBeVisible();
  await expect(page.getByTestId("play-fab")).toBeVisible();
  await shot(page, "artist-page-signed-out");
  await follow(page).click();
  await expect(page.getByTestId("sheet-sign-in")).toBeVisible();
  expect(mock.followWrites).toEqual([]);
});

test("signed in: Follow wide, the compact bar once the hero has gone, Unfollow from it with Undo", async ({ page }) => {
  const mock = await setup(page);
  await page.goto("/artist/fox_artist");
  await expect(follow(page)).toHaveText("Follow");
  await expect(page.getByTestId("artist-compact")).not.toHaveAttribute("data-show");
  await shot(page, "artist-page");
  await follow(page).click();
  await expect(follow(page)).toHaveText("Following");
  await expect.poll(() => mock.followWrites).toEqual([{ method: "POST", names: ["fox_artist"] }]);

  await page.mouse.wheel(0, 900);
  const bar = page.getByTestId("artist-compact");
  await expect(bar).toHaveAttribute("data-show", "true");
  await expect(bar).toContainText("fox artist");
  const pill = bar.getByTestId("follow-pill");
  await expect(pill).toHaveAttribute("aria-pressed", "true");
  await shot(page, "artist-page-compact");
  await pill.click();
  await expect(pill).toHaveAttribute("aria-pressed", "false");
  await expect(page.locator("[data-sonner-toast]").filter({ hasText: "Unfollowed fox artist" })).toBeVisible();
  await page.mouse.wheel(0, -2000);
  await expect(bar).not.toHaveAttribute("data-show");
  await expect(follow(page)).toHaveText("Follow");
});

test("a hand-typed name finds e621's tag: case and spaces fold to the tag name", async ({ page }) => {
  const mock = await setup(page);
  await page.goto("/artist/Fox%20Artist");
  await expect(page.getByTestId("artist-handle")).toHaveText("fox_artist");
  await expect(stat(page, "posts")).toContainText("1.2K");
  await follow(page).click();
  await expect.poll(() => mock.followWrites).toEqual([{ method: "POST", names: ["fox_artist"] }]);
});

test("the chips live in the URL, so a reload or a pasted link keeps them", async ({ page }) => {
  await setup(page);
  await page.goto("/artist/fox_artist");
  await expect(stat(page, "posts")).toContainText("1.2K");
  await page.getByTestId("chip-hide-faved").click();
  await expect(page).toHaveURL(/\/artist\/fox_artist\?.+/);
  // the remount after a chip change starts from what e621 already said: no blank wells
  await expect(stat(page, "posts")).toContainText("1.2K", { timeout: 200 });
  await page.reload();
  await expect(page.getByTestId("chip-hide-faved")).toHaveAttribute("aria-pressed", "true");
  await expect(hero(page).getByRole("heading", { level: 1 })).toHaveText("fox artist");
});

test("Share copies the page's link where there's no share sheet; ⋯ has Copy link and Open on e621", async ({ page, context }) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.addInitScript(() => Object.defineProperty(navigator, "share", { value: undefined }));
  await setup(page);
  await page.goto("/artist/fox_artist");
  await page.getByTestId("artist-share").click();
  await expect(page.locator("[data-sonner-toast]")).toContainText("Link copied");
  expect(await page.evaluate(() => navigator.clipboard.readText())).toMatch(/\/artist\/fox_artist$/);

  await page.getByTestId("artist-menu").click();
  const sheet = page.getByTestId("sheet-artist-menu");
  await expect(sheet.locator(".well-row")).toHaveText(["Copy link", "Open on e621e621.net"]);
  await expect(sheet.getByTestId("artist-e621")).toHaveAttribute("href", "https://e621.net/posts?tags=fox_artist");
  await shot(page, "artist-page-menu");
});

test("a name e621 doesn't know: the empty state with Search, no hero, no Play", async ({ page }) => {
  const mock = await setup(page);
  mock.missingTags = ["inkwel_fox"];
  await page.goto("/artist/inkwel_fox");
  const state = page.getByTestId("artist-missing");
  await expect(state).toContainText("No artist called “inkwel fox”");
  await expect(state).toContainText("e621 has no tag with this name.");
  await expect(hero(page)).toHaveCount(0);
  await expect(page.getByTestId("play-fab")).toHaveCount(0);
  await shot(page, "artist-page-missing");
  await state.getByRole("button", { name: "Search" }).click();
  await expect(page).toHaveURL(/\/search$/);
});

test("a tag that isn't an artist keeps the hero: a tag in the mark's place, its category, Follow tag", async ({ page }) => {
  const mock = await setup(page);
  mock.tagCategories = { red_fox: 5 };
  await page.goto("/artist/red_fox");
  await expect(page.getByTestId("artist-tag-mark")).toBeVisible();
  await expect(page.getByTestId("artist-handle")).toHaveText("red_fox · species");
  await expect(stat(page, "posts")).toContainText("182K");
  await expect(follow(page)).toHaveText("Follow tag");
  await shot(page, "artist-page-tag");
});
