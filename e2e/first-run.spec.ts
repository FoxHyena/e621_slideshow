import { expect, test, type Page } from "@playwright/test";
import { mockE621, type MockPostSpec } from "./mock";

/**
 * Following's first run after sign-in (DESIGN.md "First run after sign-in", UX.md Following §5):
 * the read, the pick list (top ten picked), one request for the lot, Skip for now and its row, a
 * read that fails, and no favorites at all.
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

/** 12 artists you favorite 3+ times (artist_01 most), one you favorited once. */
const ARTISTS = Array.from({ length: 12 }, (_, i) => `artist_${String(i + 1).padStart(2, "0")}`);
function favorites(): MockPostSpec[] {
  const out: MockPostSpec[] = [];
  let id = 5000;
  ARTISTS.forEach((a, i) => {
    for (let k = 0; k < 15 - i; k++) out.push({ id: id++, artist: a });
  });
  out.push({ id: id++, artist: "one_off" });
  return out;
}

async function setup(page: Page, favs: MockPostSpec[] = favorites()) {
  // each artist's newest posts, for the recency pass and the tiles
  const mock = await mockE621(
    page,
    ARTISTS.flatMap((a, i) => [{ id: 1200 - i * 2, artist: a }, { id: 1199 - i * 2, artist: a }]),
  );
  mock.setFavorites(favs);
  mock.tagCounts = Object.fromEntries(ARTISTS.map((a) => [a, 200]));
  await signIn(page);
  return mock;
}

const rows = (page: Page) => page.getByTestId("pick-row");
const cta = (page: Page) => page.getByTestId("first-run-follow");

test("following no one: reads favorites, offers the artists you favorite a lot, follows them in one request", async ({ page }) => {
  const mock = await setup(page);
  mock.favoritesDelay = 400;
  mock.unknownTags = ["artist_03"];
  await page.goto("/following");
  await expect(page.getByTestId("first-run-read")).toBeVisible();
  await expect(page.getByTestId("first-run-read")).toContainText("Finding artists you love");
  await shot(page, "first-run-read");

  await expect(page.getByTestId("first-run-pick")).toBeVisible({ timeout: 15_000 });
  await expect(page.getByText("You’ve favorited these artists a lot. Follow them?")).toBeVisible();
  await expect(rows(page)).toHaveCount(12);
  await expect(rows(page).first()).toContainText("artist 01");
  await expect(rows(page).first()).toContainText("you faved 15 · 200 posts");
  await expect(page.getByText("one off")).toHaveCount(0);
  await expect(page.locator('[data-testid="pick-row"][aria-checked="true"]')).toHaveCount(10);
  await expect(cta(page)).toHaveText("Follow 10 artists");
  // the title row trades its tools for Skip for now
  await expect(page.getByTestId("first-run-skip")).toBeVisible();
  await shot(page, "first-run-pick");

  await rows(page).first().click();
  await expect(rows(page).first()).toHaveAttribute("aria-checked", "false");
  await expect(cta(page)).toHaveText("Follow 9 artists");
  await page.getByTestId("pick-none").click();
  await expect(cta(page)).toHaveText("Pick artists to follow");
  await expect(cta(page)).toBeDisabled();
  await page.getByTestId("pick-all").click();
  await expect(cta(page)).toHaveText("Follow 12 artists");

  await cta(page).click();
  // one request for the lot; the one e621 doesn't know is said in a toast
  await expect.poll(() => mock.followWrites.length).toBe(1);
  expect(mock.followWrites[0].names!.sort()).toEqual([...ARTISTS].sort());
  await expect(page.locator("[data-sonner-toast]")).toContainText("1 skipped: artist 03");
  // Following now has someone: the feed takes over
  await expect(page.getByTestId("first-run-pick")).toHaveCount(0);
  await expect(page.locator("[data-post-id]").first()).toBeVisible();
  expect(mock.followWrites).toHaveLength(1);
});

test("Skip for now folds the list into a row over Popular today, kept across a reload", async ({ page }) => {
  await setup(page);
  await page.goto("/following");
  await expect(page.getByTestId("first-run-pick")).toBeVisible({ timeout: 15_000 });
  await page.getByTestId("first-run-skip").click();
  const resume = page.getByTestId("first-run-resume");
  await expect(resume).toContainText("Follow from your favorites");
  await expect(resume).toContainText("12 artists you favorite a lot");
  await expect(page.getByRole("heading", { name: "Popular today" })).toBeVisible();
  await shot(page, "first-run-skipped");

  await page.reload();
  await expect(page.getByTestId("first-run-resume")).toBeVisible();
  await page.getByTestId("first-run-resume").click();
  await expect(page.getByTestId("first-run-pick")).toBeVisible();
});

test("while e621 lists popular artists, their place holds four skeleton rows", async ({ page }) => {
  const mock = await setup(page, []);
  mock.popularArtists = [{ name: "big_artist", post_count: 18_200 }];
  let release!: () => void;
  const held = new Promise<void>((r) => (release = r));
  // (registered after the mock, so it answers first: hold the answer, then let the mock give it)
  await page.route(/\/tags\.json\?.*search%5Border%5D=count|\/tags\.json\?.*search\[order\]=count/, async (route) => {
    await held;
    await route.fallback();
  });
  await page.goto("/following");
  const wait = page.getByTestId("popular-artists-wait");
  await expect(wait).toBeVisible({ timeout: 15_000 });
  await expect(wait).toHaveAttribute("aria-busy", "true");
  await expect(wait.locator(".sk-dot")).toHaveCount(4);
  release();
  await expect(page.getByTestId("popular-row")).toHaveCount(1);
  await expect(wait).toHaveCount(0);
});

test("no favorites: Search, and Popular artists to follow in place", async ({ page }) => {
  const mock = await setup(page, []);
  mock.popularArtists = [
    { name: "big_artist", post_count: 18_200 },
    { name: "conditional_dnp", post_count: 90_000 },
    { name: "mid_artist", post_count: 9_400 },
  ];
  await page.goto("/following");
  const none = page.getByTestId("first-run-none");
  await expect(none).toContainText("Find artists to follow", { timeout: 15_000 });
  await expect(none).toContainText("You have no favorites yet");
  const popular = page.getByTestId("popular-row");
  await expect(popular).toHaveCount(2);
  await expect(popular.first()).toContainText("big artist");
  await expect(popular.first()).toContainText("18.2K posts");
  await expect(page.getByText("The artists with the most posts on e621")).toBeVisible();
  await shot(page, "first-run-popular");

  // following one keeps the list (to follow more), then Show my feed
  await popular.first().getByTestId("follow-pill").click();
  await expect(popular.first().getByTestId("follow-pill")).toHaveAttribute("aria-pressed", "true");
  await expect.poll(() => mock.followWrites.length).toBe(1);
  await expect(page.locator("[data-sonner-toast]")).toContainText("Following big artist");
  await expect(popular).toHaveCount(2);
  await page.getByTestId("popular-done").click();
  await expect(page.getByTestId("popular-artists")).toHaveCount(0);

  await page.goto("/following");
  await expect(page.getByTestId("first-run-none")).toHaveCount(0);
});

test("no favorites and Popular artists unreachable: Search, then Popular today", async ({ page }) => {
  await setup(page, []);
  await page.route("https://e621.net/tags.json**", (route) =>
    new URL(route.request().url()).searchParams.get("search[order]") === "count"
      ? route.fulfill({ status: 500, headers: { "access-control-allow-origin": "*" }, contentType: "application/json", body: "{}" })
      : route.fallback(),
  );
  await page.goto("/following");
  const none = page.getByTestId("first-run-none");
  await expect(none).toContainText("Find artists to follow", { timeout: 15_000 });
  await expect(page.getByRole("heading", { name: "Popular today" })).toBeVisible();
  await none.getByRole("button", { name: "Search" }).click();
  await expect(page).toHaveURL(/\/search/);
});

test("a read that fails says nothing was changed, and Try again reads again", async ({ page }) => {
  const mock = await setup(page);
  let fail = true;
  await page.route("https://e621.net/favorites.json**", async (route) => {
    if (fail && route.request().method() === "GET")
      return route.fulfill({ status: 500, headers: { "access-control-allow-origin": "*" }, contentType: "application/json", body: '{"success":false,"reason":"Mock failure"}' });
    return route.fallback();
  });
  await page.goto("/following");
  const err = page.getByTestId("first-run-error");
  await expect(err).toContainText("Couldn't read your favorites", { timeout: 15_000 });
  await expect(err).toContainText("Nothing was changed.");
  await shot(page, "first-run-error");
  fail = false;
  await err.getByTestId("state-retry").click();
  await expect(page.getByTestId("first-run-pick")).toBeVisible({ timeout: 15_000 });
  expect(mock.followWrites).toHaveLength(0);
});
