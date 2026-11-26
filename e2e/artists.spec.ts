import { expect, test, type Page } from "@playwright/test";
import { mockE621, type MockPostSpec } from "./mock";

/**
 * The Artists tab (UX.md "Artists"): Following (when each last posted, who's new, filter, sort, ⋯
 * Unfollow) and Suggested (artist cards, Follow, Not interested, Follow from favorites as a sheet).
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

const SUGGEST = ["sugg_a", "sugg_b", "sugg_c", "sugg_d"];

/** fox has a post above the marker (1100); otter's are older; quiet_artist has none in the page. */
function posts(): MockPostSpec[] {
  return [
    { id: 1150, artist: "fox_artist" },
    { id: 1090, artist: "otter_artist" },
    { id: 1080, artist: "fox_artist" },
    ...SUGGEST.flatMap((a, i) => [0, 1, 2].map((k) => ({ id: 900 - i * 10 - k, artist: a }))),
  ];
}

function favorites(): MockPostSpec[] {
  const out: MockPostSpec[] = [];
  let id = 5000;
  for (let k = 0; k < 6; k++) out.push({ id: id++, artist: "fox_artist" });
  SUGGEST.forEach((a, i) => {
    for (let k = 0; k < 8 - i; k++) out.push({ id: id++, artist: a });
  });
  return out;
}

async function setup(page: Page, signedIn = true) {
  const mock = await mockE621(page, posts());
  mock.subscriptions = ["fox_artist", "otter_artist", "quiet_artist"];
  mock.lastSeen = 1100;
  mock.setFavorites(favorites());
  mock.tagCounts = Object.fromEntries([...SUGGEST, "fox_artist"].map((a) => [a, 140]));
  if (signedIn) await signIn(page);
  return mock;
}

const rows = (page: Page) => page.getByTestId("artist-row");

test("signed out: your artists live here, with Sign in", async ({ page }) => {
  await setup(page, false);
  await page.goto("/artists");
  await expect(page.getByTestId("needs-sign-in")).toContainText("Your artists live here");
  await expect(page.getByRole("button", { name: "Sign in" })).toBeVisible();
});

test("Following lists who you follow: newest poster first, a dot for new, filter, sort, Unfollow with Undo", async ({ page }) => {
  const mock = await setup(page);
  await page.goto("/artists");
  await expect(page.getByTestId("artists-seg")).toContainText("Following 3");
  await expect(rows(page)).toHaveCount(3);
  // one page of search:subscriptions for "posted …"
  expect(mock.searches.filter((s) => s.tags.startsWith("search:subscriptions order:id_desc") && s.limit === 320)).toHaveLength(1);
  await expect(rows(page).nth(0)).toHaveAttribute("data-artist", "fox_artist");
  await expect(rows(page).nth(0)).toContainText("you faved 6");
  await expect(rows(page).nth(2)).toHaveAttribute("data-artist", "quiet_artist");
  await expect(rows(page).nth(2)).toContainText("posted a while ago");
  await expect(page.getByTestId("artists-count")).toHaveText("3 of 500 follows");
  // fox posted above the marker: a dot
  await expect(rows(page).nth(0).locator(".mark")).toHaveAttribute("data-new", "true");
  await expect(rows(page).nth(1).locator(".mark")).not.toHaveAttribute("data-new", "true");
  await shot(page, "artists-following");

  await page.getByTestId("artists-filter").fill("ott");
  await expect(rows(page)).toHaveCount(1);
  await expect(rows(page).first()).toHaveAttribute("data-artist", "otter_artist");
  await page.getByTestId("artists-filter").fill("");

  await page.getByTestId("artists-sort").click();
  await page.getByTestId("sort-az").click();
  await expect(page.getByTestId("artists-sort")).toContainText("A–Z");
  await expect(rows(page).nth(0)).toHaveAttribute("data-artist", "fox_artist");
  await expect(rows(page).nth(1)).toHaveAttribute("data-artist", "otter_artist");

  // opening an artist clears their dot for the session
  await rows(page).nth(0).getByRole("button", { name: /fox artist/ }).first().click();
  await expect(page).toHaveURL(/\/artist\/fox_artist/);
  await page.goBack();
  await expect(rows(page).nth(0).locator(".mark")).not.toHaveAttribute("data-new", "true");

  await rows(page).nth(1).getByTestId("artist-more").click();
  await page.getByTestId("artist-unfollow").click();
  await expect(rows(page)).toHaveCount(2);
  await expect.poll(() => mock.followWrites.filter((w) => w.method === "DELETE").length).toBe(1);
  await page.locator("[data-sonner-toast]").getByRole("button", { name: "Undo" }).click();
  await expect(rows(page)).toHaveCount(3);
});

test("Suggested: artist cards with their newest posts; Follow keeps the card; Not interested hides it, with Undo", async ({ page }) => {
  const mock = await setup(page);
  mock.subscriptions = ["fox_artist"];
  await page.goto("/artists");
  await page.getByRole("radio", { name: "Suggested" }).click();
  const cards = page.getByTestId("sugg-card");
  await expect(cards).toHaveCount(4, { timeout: 15_000 });
  await expect(cards.first()).toHaveAttribute("data-artist", "sugg_a");
  await expect(cards.first()).toContainText("You faved 8 of 140");
  await expect(cards.first().locator(".sugg-tile img")).toHaveCount(3);
  await expect(page.getByTestId("follow-favs")).toContainText("4 artists you favorite a lot");
  await shot(page, "artists-suggested");

  await cards.first().getByTestId("follow-pill").click();
  await expect(cards.first().getByTestId("follow-pill")).toHaveAttribute("aria-pressed", "true");
  await expect(cards).toHaveCount(4);
  await expect.poll(() => mock.followWrites.length).toBe(1);

  await cards.nth(1).getByTestId("sugg-more").click();
  await page.getByTestId("artist-hide").click();
  await expect(cards).toHaveCount(3);
  await expect(page.locator('[data-testid="sugg-card"][data-artist="sugg_b"]')).toHaveCount(0);
  await page.locator("[data-sonner-toast]").filter({ hasText: "Won't suggest" }).getByRole("button", { name: "Undo" }).click();
  await expect(cards).toHaveCount(4);
});

test("Follow from favorites opens as a sheet and follows the picked ones in one request", async ({ page }) => {
  const mock = await setup(page);
  mock.subscriptions = ["fox_artist"];
  await page.goto("/artists");
  await page.getByRole("radio", { name: "Suggested" }).click();
  await page.getByTestId("follow-favs").click({ timeout: 15_000 });
  const sheet = page.getByTestId("sheet-follow-favorites");
  await expect(sheet.getByTestId("pick-row")).toHaveCount(4);
  await expect(sheet.getByTestId("first-run-follow")).toHaveText("Follow 4 artists");
  await shot(page, "artists-follow-favs");
  await sheet.getByTestId("first-run-follow").click();
  await expect(sheet).toHaveCount(0);
  await expect.poll(() => mock.followWrites.length).toBe(1);
  expect(mock.followWrites[0].names!.sort()).toEqual([...SUGGEST].sort());
  await page.getByRole("radio", { name: /Following/ }).click();
  await expect(rows(page)).toHaveCount(5);
});
