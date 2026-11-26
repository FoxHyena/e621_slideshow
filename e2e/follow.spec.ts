import { expect, test, type Page } from "@playwright/test";
import { mockE621, type MockPostSpec } from "./mock";

/**
 * Follow everywhere (UX §5): Follow pills on For You, Results and Favorites cards and in the
 * player, the artist page's Follow button, e621's 500 limit, Undo, and rollback when e621 fails.
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

/** 1150 by fox (followed), 1149–1148 by otter (not followed), older by fox. */
function specs(): MockPostSpec[] {
  return Array.from({ length: 40 }, (_, i) => {
    const id = 1150 - i;
    return { id, artist: id === 1149 || id === 1148 ? "otter_artist" : "fox_artist" };
  });
}

async function setup(page: Page, opts: { signedIn?: boolean } = {}) {
  const mock = await mockE621(page, specs());
  mock.subscriptions = ["fox_artist"];
  mock.lastSeen = 1100;
  if (opts.signedIn !== false) await signIn(page);
  return mock;
}

const card = (page: Page, id: number) => page.locator(`[data-post-id="${id}"]`);
const pill = (page: Page, id: number) => card(page, id).getByTestId("follow-pill");
const toast = (page: Page) => page.locator("[data-sonner-toast]");

test("Results cards offer Follow only for artists you don't follow; a tap follows, Undo unfollows", async ({ page }) => {
  const mock = await setup(page);
  await page.goto("/search?tags=wolf");
  await expect(card(page, 1149)).toBeVisible();
  await expect(pill(page, 1149)).toHaveAccessibleName("Follow otter artist");
  // You follow fox: no pill on fox's cards.
  await expect(pill(page, 1150)).toHaveCount(0);
  await shot(page, "follow-pill");

  await pill(page, 1149).click();
  // At once, in place: a ✓ that can unfollow.
  await expect(pill(page, 1149)).toHaveAttribute("aria-pressed", "true");
  await expect(pill(page, 1149)).toHaveAccessibleName("Follow otter artist");
  await expect(toast(page)).toContainText("Following otter artist");
  await expect.poll(() => mock.followWrites).toEqual([{ method: "POST", names: ["otter_artist"] }]);
  // The artist's other cards drop their pill.
  await expect(pill(page, 1148)).toHaveCount(0);
  await shot(page, "follow-pill-followed");

  await page.getByRole("button", { name: "Undo" }).click();
  await expect(pill(page, 1149)).toHaveAttribute("aria-pressed", "false");
  await expect.poll(() => mock.followWrites.map((w) => w.method)).toEqual(["POST", "DELETE"]);
  await expect.poll(() => mock.subscriptions).toEqual(["fox_artist"]);
  await expect(pill(page, 1148)).toHaveAccessibleName("Follow otter artist");
});

test("optimistic follow rolls back when e621 fails, and says why", async ({ page }) => {
  const mock = await setup(page);
  mock.followFails = true;
  mock.followDelay = 400;
  await page.goto("/search?tags=wolf");
  await pill(page, 1149).click();
  await expect(pill(page, 1149)).toHaveAttribute("aria-pressed", "true");
  await expect(toast(page).filter({ hasText: "Couldn't follow otter artist: Mock follow failure" })).toBeVisible();
  await expect(pill(page, 1149)).toHaveAttribute("aria-pressed", "false");
  expect(mock.subscriptions).toEqual(["fox_artist"]);

  // And an unfollow from the artist page comes back the same way.
  await page.goto("/artist/fox_artist");
  const button = page.getByTestId("follow-button");
  await expect(button).toHaveText("Following");
  await button.click();
  await expect(button).toHaveText("Follow");
  await expect(toast(page).filter({ hasText: "Couldn't unfollow fox artist: Mock follow failure" })).toBeVisible();
  await expect(button).toHaveText("Following");
});

test("the artist page follows and unfollows at once, with Undo", async ({ page }) => {
  const mock = await setup(page);
  await page.goto("/artist/otter_artist");
  const button = page.getByTestId("follow-button");
  await expect(button).toHaveText("Follow");
  await button.click();
  await expect(button).toHaveText("Following");
  await expect.poll(() => mock.subscriptions).toEqual(["fox_artist", "otter_artist"]);
  await shot(page, "artist-following");
  await button.click();
  await expect(button).toHaveText("Follow");
  await expect(toast(page).filter({ hasText: "Unfollowed otter artist" })).toBeVisible();
  await expect.poll(() => mock.subscriptions).toEqual(["fox_artist"]);
  await toast(page).filter({ hasText: "Unfollowed otter artist" }).getByRole("button", { name: "Undo" }).click();
  await expect(button).toHaveText("Following");
  await expect.poll(() => mock.subscriptions).toEqual(["fox_artist", "otter_artist"]);
});

test("at e621's 500 follows, Follow is off with a note, and a card says so without asking e621", async ({ page }) => {
  const mock = await setup(page);
  mock.subscriptions = ["fox_artist", ...Array.from({ length: 499 }, (_, i) => `tag_${i}`)];
  await page.goto("/artist/otter_artist");
  await expect(page.getByTestId("follow-button")).toBeDisabled();
  await expect(page.getByTestId("follow-button")).toHaveText("e621 allows 500 follows");
  await expect(page.getByTestId("follow-limit")).toHaveText("Unfollow an artist in Artists to follow another.");
  // Unfollowing still works there.
  await page.goto("/search?tags=wolf");
  await pill(page, 1149).click();
  await expect(toast(page)).toContainText("e621 allows 500 follows");
  await expect(pill(page, 1149)).toHaveAttribute("aria-pressed", "false");
  expect(mock.followWrites).toEqual([]);
});

test("the player offers Follow for the artist on screen", async ({ page }) => {
  const mock = await setup(page);
  await page.goto("/search?tags=wolf");
  await card(page, 1149).getByTestId("card-media").click();
  const player = page.getByTestId("player");
  await expect(player).toHaveAttribute("data-post-id", "1149", { timeout: 10_000 });
  const p = player.getByTestId("follow-pill");
  await expect(p).toHaveAccessibleName("Follow otter artist");
  await shot(page, "player-follow");
  await p.click();
  await expect(p).toHaveAttribute("aria-pressed", "true");
  await expect.poll(() => mock.subscriptions).toEqual(["fox_artist", "otter_artist"]);
});

test("signed out, Follow opens sign-in", async ({ page }) => {
  const mock = await setup(page, { signedIn: false });
  await page.goto("/search?tags=wolf");
  await expect(pill(page, 1150)).toBeVisible();
  await pill(page, 1149).click();
  await expect(page).toHaveURL(/\/settings/);
  expect(mock.followWrites).toEqual([]);
  expect(mock.subscriptionReads).toBe(0);
});

test("Following shows the new-posts pill after you follow someone, and starts over on tap", async ({ page }) => {
  const mock = await setup(page);
  await page.goto("/following");
  await expect(card(page, 1150)).toBeVisible();
  await expect(card(page, 1149)).toHaveCount(0);
  // Into Results in the app (a tag's Search), not a reload.
  await card(page, 1150).locator('[data-tag="solo"]').click();
  await page.getByTestId("tag-action-search").click();
  await expect(page).toHaveURL(/\/search\?tags=solo/);
  await pill(page, 1149).click();
  await expect.poll(() => mock.subscriptions).toEqual(["fox_artist", "otter_artist"]);
  await page.goBack();
  await expect(page).toHaveURL(/\/following/);
  const newPill = page.getByTestId("new-posts-pill");
  await expect(newPill).toBeVisible();
  // Nothing was reordered in place.
  await expect(card(page, 1149)).toHaveCount(0);
  await newPill.click();
  await expect(card(page, 1149)).toBeVisible();
  await expect(newPill).toHaveCount(0);
});

test("a share link's borrowed sign-in never reads or writes follows: Follow opens sign-in", async ({ page }) => {
  const mock = await setup(page, { signedIn: false });
  await page.goto("/search?tags=wolf#u=tester&k=goodkey");
  await expect(pill(page, 1150)).toBeVisible();
  await pill(page, 1149).click();
  await expect(page).toHaveURL(/\/settings/);
  // The link's key was in use (the search went out signed in), yet follows never were.
  expect(mock.searches.some((x) => x.auth)).toBe(true);
  expect(mock.subscriptionReads).toBe(0);
  expect(mock.followWrites).toEqual([]);
});
