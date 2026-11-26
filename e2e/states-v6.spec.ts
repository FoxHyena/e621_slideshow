import { expect, test, type Page } from "@playwright/test";
import { defaultSpecs, mockE621 } from "./mock";

/**
 * Goo the mascot and the states (DESIGN.md "Goo (the mascot)", "States"): the landing, needs
 * sign-in, empty, error, slow down, offline, loading more failed and the end of a feed. Screenshots
 * for the visual check with E6_SHOTS=dir.
 */

const SHOTS = process.env.E6_SHOTS;
const shot = async (page: Page, name: string) => {
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/${name}.png`, fullPage: false, animations: "disabled" });
};

test.use({ viewport: { width: 375, height: 812 } });

const signIn = (page: Page) =>
  page.addInitScript(() => {
    if (sessionStorage.getItem("seeded")) return;
    sessionStorage.setItem("seeded", "1");
    localStorage.setItem("e6ss:v1:creds", JSON.stringify({ username: "tester", apiKey: "goodkey" }));
  });

/** e621 answers 429 to searches whose tags include `slow_down`; returns how many it has answered */
async function slowDown(page: Page) {
  const hits = { n: 0 };
  await page.route(/\/posts\.json/, (r) => {
    if (!decodeURIComponent(r.request().url()).includes("slow_down")) return r.fallback();
    hits.n++;
    return r.fulfill({ status: 429, headers: { "access-control-allow-origin": "*", "content-type": "application/json" }, body: "{}" });
  });
  return hits;
}

test("Landing: Goo waves in the one card, Sign in is the only gold, Play waits until the card scrolls away", async ({ page }) => {
  await mockE621(page);
  await page.goto("/following");
  const card = page.getByTestId("following-signed-out");
  await expect(card).toBeVisible();
  const goo = card.getByTestId("goo");
  await expect(goo).toHaveAttribute("data-mood", "wave");
  expect((await goo.boundingBox())!.width).toBe(104);
  // not focusable, no name: a pointer-only toy
  await expect(goo).toHaveAttribute("aria-hidden", "true");
  await expect(card.getByRole("heading", { name: "Follow the artists you love" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Popular today" })).toBeVisible();
  await expect(page.getByTestId("post-card").first()).toBeVisible();
  const play = page.getByTestId("play-fab");
  await expect(play).toHaveAttribute("data-gated", "true");
  expect(await play.evaluate((el) => (el as HTMLElement).inert)).toBe(true);
  await shot(page, "v6-landing");
  await page.mouse.wheel(0, 900);
  // the gate lifts mid-scroll while Play is stepped aside: still out of reach until it comes back
  await expect(play).not.toHaveAttribute("data-gated");
  if (await play.getAttribute("data-away")) expect(await play.evaluate((el) => (el as HTMLElement).inert)).toBe(true);
  await expect(play).not.toHaveAttribute("data-away");
  expect(await play.evaluate((el) => (el as HTMLElement).inert)).toBe(false);
  await expect(play).toBeVisible();
});

test("Tapping Goo spurts one to three drops onto the bar's goo count", async ({ page }) => {
  await mockE621(page);
  await page.goto("/following");
  const goo = page.getByTestId("following-signed-out").getByTestId("goo");
  await expect(goo).toBeVisible();
  await goo.click();
  await expect(goo).toHaveClass(/goo-pop/);
  await page.getByRole("link", { name: "Settings" }).click();
  await expect(page.getByTestId("goo-count")).toHaveText(/^[123] favorites?$/);
});

test("Needs sign-in: Favorites signed out waves, Sign in in gold, Search instead goes to Search", async ({ page }) => {
  await mockE621(page);
  await page.goto("/favorites");
  const block = page.getByTestId("needs-sign-in");
  await expect(block.getByRole("heading", { name: "Your favorites live on e621" })).toBeVisible();
  await expect(block.getByTestId("goo")).toHaveAttribute("data-mood", "wave");
  await expect(block.locator(".btn-gold")).toHaveText("Sign in");
  await shot(page, "v6-needs-sign-in");
  await block.getByRole("button", { name: "Search instead" }).click();
  await expect(page).toHaveURL(/\/search$/);
});

test("For You signed out: the block, then Popular today, with Play waiting below the gold Sign in", async ({ page }) => {
  await mockE621(page);
  await page.goto("/for-you");
  await expect(page.getByRole("heading", { name: "For You learns from your favorites" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Popular today" })).toBeVisible();
  await expect(page.getByTestId("play-fab")).toHaveAttribute("data-gated", "true");
});

test("No posts match: the sentence counts what's hidden; with nothing on, Edit search", async ({ page }) => {
  await mockE621(page, defaultSpecs(6).map((s) => ({ ...s, tags: ["badtag"] })));
  await page.addInitScript(() => localStorage.setItem("e6ss:v1:search", JSON.stringify({ tags: "", blacklist: "badtag" })));
  await page.goto("/search?tags=wolf");
  const empty = page.getByTestId("results-empty");
  await expect(empty.getByRole("heading", { name: "No posts match" })).toBeVisible();
  await expect(empty).toContainText("6 posts are hidden by your blacklist.");
  await expect(empty.getByTestId("goo")).toHaveAttribute("data-mood", "look");
  await expect(empty.getByRole("button", { name: "Edit search" })).toBeVisible();
  await shot(page, "v6-no-match");
});

test("No posts match with a filter on: it counts the filter and offers Reset filters", async ({ page }) => {
  await mockE621(page);
  await page.goto("/search?tags=nothing_matches");
  await expect(page.getByTestId("results-empty")).toContainText("Nothing on e621 matches this search.");
  await page.getByTestId("chip-sort").click();
  await page.getByTestId("sort-score").click();
  await expect(page.getByTestId("results-empty")).toContainText("One filter is on.");
  await page.getByRole("button", { name: "Reset filters" }).click();
  await expect(page.getByTestId("results-empty")).toContainText("Nothing on e621 matches this search.");
});

test("First load failed: an Oops panel with what e621 said, and Try again", async ({ page }) => {
  const mock = await mockE621(page);
  let fail = true;
  mock.searchFails = () => fail;
  await page.goto("/search?tags=wolf");
  const panel = page.getByTestId("feed-error");
  await expect(panel.getByRole("heading", { name: "e621 didn't answer" })).toBeVisible();
  await expect(panel.getByTestId("goo")).toHaveAttribute("data-mood", "oops");
  await expect(panel.locator(".state-said")).toHaveText("Mock search failure");
  await shot(page, "v6-error");
  fail = false;
  await panel.getByTestId("state-retry").click();
  await expect(page.getByTestId("post-card").first()).toBeVisible();
});

test("Asked to slow down: Goo snoozes and counts down; Try now asks again", async ({ page }) => {
  await mockE621(page);
  const hits = await slowDown(page);
  await page.goto("/search?tags=slow_down");
  const panel = page.getByTestId("state-slow");
  await expect(panel.getByRole("heading", { name: "e621 asked us to slow down" })).toBeVisible();
  await expect(panel.getByTestId("goo")).toHaveAttribute("data-mood", "snooze");
  await expect(panel).toContainText(/Trying again in [1-5] s\./);
  // the headline is announced; the ticking seconds are not
  await expect(panel.locator('[aria-live="off"]')).toContainText("Trying again in");
  await shot(page, "v6-slow-down");
  const asked = hits.n;
  await panel.getByTestId("state-retry").click();
  // now, not when the lane's 5 s back-off would have ended
  await expect.poll(() => hits.n, { timeout: 2000 }).toBeGreaterThan(asked);
});

test("Offline: a sunk banner under the header, then Back online for 2 s", async ({ page, context }) => {
  await mockE621(page);
  await page.goto("/search?tags=wolf");
  await expect(page.getByTestId("post-card").first()).toBeVisible();
  await context.setOffline(true);
  const banner = page.getByTestId("offline-banner");
  await expect(banner).toHaveText("You're offline. Showing what's loaded.");
  await shot(page, "v6-offline");
  await context.setOffline(false);
  await expect(banner).toHaveText("Back online");
  await expect(banner).toHaveCount(0, { timeout: 4000 });
});

test("The end of a feed says That's everything, with what was left out", async ({ page }) => {
  await mockE621(page, defaultSpecs(4).map((s, i) => (i === 0 ? { ...s, tags: ["badtag"] } : s)));
  await page.addInitScript(() => localStorage.setItem("e6ss:v1:search", JSON.stringify({ tags: "", blacklist: "badtag" })));
  await page.goto("/search?tags=wolf");
  const end = page.getByTestId("feed-end");
  await end.scrollIntoViewIfNeeded();
  await expect(end.locator("b")).toHaveText("That’s everything");
  await expect(end.locator("small")).toHaveText("1 hidden by your blacklist");
});

test("Loading more failed: one row at the end with Try again", async ({ page }) => {
  const mock = await mockE621(page);
  await page.goto("/search?tags=wolf");
  await expect(page.getByTestId("post-card").first()).toBeVisible();
  mock.searchFails = () => true;
  await page.mouse.wheel(0, 40000);
  const row = page.getByTestId("feed-more-failed");
  await expect(row).toContainText("Couldn’t load more posts", { timeout: 10_000 });
  mock.searchFails = () => false;
  await row.getByTestId("state-retry").click();
  await expect(row).toHaveCount(0);
});

test("Following signed in with nothing yet: Goo snoozes and counts the artists you follow", async ({ page }) => {
  const mock = await mockE621(page, []);
  mock.subscriptions = ["artist_a", "artist_b"];
  await signIn(page);
  await page.goto("/following");
  const empty = page.getByTestId("following-empty");
  await expect(empty.getByRole("heading", { name: "No posts yet" })).toBeVisible();
  await expect(empty).toContainText("None of the 2 artists you follow has posted since you joined.");
  await expect(empty.getByTestId("goo")).toHaveAttribute("data-mood", "snooze");
});

test("Following: posts the blacklist took are counted, not called nothing yet", async ({ page }) => {
  const mock = await mockE621(page, defaultSpecs(3).map((s) => ({ ...s, tags: ["artist_a", "badtag"] })));
  mock.subscriptions = ["artist_a"];
  await page.addInitScript(() => localStorage.setItem("e6ss:v1:search", JSON.stringify({ tags: "", blacklist: "badtag" })));
  await signIn(page);
  await page.goto("/following");
  const empty = page.getByTestId("following-empty");
  await expect(empty.getByRole("heading", { name: "No posts match" })).toBeVisible();
  await expect(empty).toContainText("3 posts are hidden by your blacklist.");
  // no filter is on, so there is nothing to reset
  await expect(empty.getByRole("button", { name: "Reset filters" })).toHaveCount(0);
});

test("Following signed in with one artist and nothing yet: the sentence says the artist", async ({ page }) => {
  const mock = await mockE621(page, []);
  mock.subscriptions = ["artist_a"];
  await signIn(page);
  await page.goto("/following");
  await expect(page.getByTestId("following-empty")).toContainText("The artist you follow hasn't posted since you joined.");
});

test("If the error panel's code can't load (offline before the idle prefetch), a plain panel still says it and offers Try again", async ({ page }) => {
  const mock = await mockE621(page);
  await page.route(/StatePanels/, (r) => r.abort());
  let fail = true;
  mock.searchFails = () => fail;
  await page.goto("/search?tags=wolf");
  await expect(page.getByRole("heading", { name: "e621 didn't answer" })).toBeVisible();
  await expect(page.getByText("Mock search failure")).toBeVisible();
  fail = false;
  await page.getByTestId("state-retry").click();
  await expect(page.getByTestId("post-card").first()).toBeVisible();
});
