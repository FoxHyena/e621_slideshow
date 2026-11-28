import { expect, test, type Page } from "@playwright/test";
import { defaultSpecs, mockE621, type E621Mock } from "./mock";

/**
 * For You and Tune (UX §5): the favorites profile ranks the window, the ranked list is kept for a
 * reload, and a changed profile or ⋯ › Refresh offers Update ranking instead of re-ranking under you.
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

const RANK_QUERY = /^~(pawpads|toebeans) ~(pawpads|toebeans) date:>=7_days_ago order:score$/;
const ranked = (m: E621Mock) => m.searches.filter((s) => RANK_QUERY.test(s.tags)).length;
/** The first ranking waits for a first-ever read of the favorites and the learned fit. */
const firstRanked = (page: Page) => expect(page.getByTestId("post-card").first()).toBeVisible({ timeout: 15_000 });
const cardIds = (page: Page) => page.getByTestId("post-card").evaluateAll((els) => els.map((e) => Number(e.getAttribute("data-post-id"))));

/**
 * 10 favorites tagged `pawpads` and `toebeans` (both rare on the site). Post 1050 has both and ranks
 * above the newer 1100 (pawpads only), so a restored list in that order isn't e621's newest-first.
 */
async function withFavorites(page: Page) {
  const specs = defaultSpecs().map((s) => {
    if (s.id === 1100) return { ...s, tags: ["pawpads", "solo"] };
    if (s.id === 1050) return { ...s, tags: ["pawpads", "toebeans", "solo"] };
    return s;
  });
  const mock = await mockE621(page, specs);
  mock.setFavorites(Array.from({ length: 10 }, (_, i) => ({ id: 2000 + i, tags: ["pawpads", "toebeans", "solo"] })));
  mock.tagCounts = { pawpads: 5, toebeans: 5 };
  await signIn(page);
  return mock;
}

test("signed out, For You says what it is and shows what's popular", async ({ page }) => {
  const mock = await mockE621(page);
  await page.goto("/for-you");
  await expect(page.getByTestId("for-you-signed-out")).toBeVisible();
  await expect(page.getByTestId("post-card").first()).toBeVisible();
  expect(mock.searches[0].tags).toContain("order:rank");
  await expect(page.getByTestId("open-tune")).toHaveCount(0);
});

test("For You ranks your favorites' tags, then plays the list over itself", async ({ page }) => {
  const mock = await withFavorites(page);
  mock.searchDelay = (tags) => (RANK_QUERY.test(tags) ? 600 : 0);
  await page.goto("/for-you");
  await expect(page.getByTestId("search-progress")).toBeVisible();
  await shot(page, "for-you-ranking");
  await firstRanked(page);
  expect(await cardIds(page)).toEqual([1050, 1100]);
  expect(mock.searches.some((s) => RANK_QUERY.test(s.tags))).toBe(true);
  await expect(page.getByTestId("for-you-status")).toHaveText("Ranked just now");
  await shot(page, "for-you");

  await page.getByTestId("play-fab").click();
  await expect(page).toHaveURL(/\/for-you\?play=1050$/);
  await expect(page.getByTestId("player")).toBeVisible();
  await page.goBack();
  await expect(page).toHaveURL(/\/for-you$/);
  await expect(page.getByTestId("player")).toHaveCount(0);
  expect(ranked(mock)).toBe(1);
});

test("a reload shows the saved ranking by id, without ranking again", async ({ page }) => {
  const mock = await withFavorites(page);
  await page.goto("/for-you");
  await firstRanked(page);
  expect(ranked(mock)).toBe(1);
  const pages = mock.favoritePages.length;
  await page.reload();
  await expect(page.getByTestId("post-card").first()).toBeVisible();
  expect(await cardIds(page)).toEqual([1050, 1100]);
  expect(mock.searches.some((s) => s.tags === "id:1050,1100")).toBe(true);
  expect(ranked(mock)).toBe(1);
  await expect(page.getByTestId("for-you-status")).toHaveText("Ranked just now");
  // The page load's sync found nothing new: still no pill once it's done.
  await expect.poll(() => mock.favoritePages.length).toBeGreaterThan(pages);
  await page.waitForTimeout(500);
  await expect(page.getByTestId("update-ranking")).toHaveCount(0);
});

test("a chip change made just before leaving still applies", async ({ page }) => {
  const mock = await withFavorites(page);
  await page.goto("/for-you");
  await firstRanked(page);
  await page.getByTestId("chip-score").click();
  await page.getByTestId("score-50").click();
  // Leave inside the 600 ms pause.
  await page.getByTestId("tab-artists").click();
  await expect(page).toHaveURL(/\/artists$/);
  await page.getByTestId("tab-for-you").click();
  await expect(page.getByTestId("chip-score")).toHaveText("≥ 50");
  await expect.poll(() => mock.searches.some((s) => s.tags.startsWith("~") && s.tags.includes("score:>=50"))).toBe(true);
});

test("a chip change re-ranks after a pause, for the new filters", async ({ page }) => {
  const mock = await withFavorites(page);
  await page.goto("/for-you");
  await firstRanked(page);
  await expect(page.getByTestId("chip-date")).toHaveText("Last 7 days");
  await page.getByTestId("chip-score").click();
  await page.getByTestId("score-50").click();
  await expect(page.getByTestId("chip-score")).toHaveText("≥ 50");
  await expect.poll(() => mock.searches.some((s) => s.tags.startsWith("~") && s.tags.includes("score:>=50"))).toBe(true);
  // A Back leaves For You: the filter change didn't add history.
  await expect(page).toHaveURL(/\/for-you$/);
});

test("Tune changes offer Update ranking; nothing re-ranks on its own", async ({ page }) => {
  const mock = await withFavorites(page);
  await page.goto("/for-you");
  await firstRanked(page);
  await page.getByTestId("open-tune").click();
  await expect(page).toHaveURL(/\/for-you\/tune$/);
  await expect(page.getByTestId("rec-status")).toContainText("10 favorites");
  await expect(page.getByTestId("rec-tags")).toContainText("pawpads");
  await shot(page, "tune");
  await page.getByRole("button", { name: "Pin pawpads" }).click();
  await expect(page.getByRole("button", { name: "Unpin pawpads" })).toHaveAttribute("aria-pressed", "true");
  await page.goBack();
  await expect(page).toHaveURL(/\/for-you$/);
  await expect(page.getByTestId("update-ranking")).toBeVisible();
  expect(ranked(mock)).toBe(1);
  await page.getByTestId("update-ranking").click();
  await expect.poll(() => ranked(mock)).toBe(2);
  await expect(page.getByTestId("post-card").first()).toBeVisible();
  await expect(page.getByTestId("update-ranking")).toHaveCount(0);
});

test("muting every profile tag says so, and Tune is a tap away", async ({ page }) => {
  await withFavorites(page);
  await page.goto("/for-you/tune");
  await page.getByRole("button", { name: "Mute pawpads" }).click();
  await page.getByRole("button", { name: "Mute toebeans" }).click();
  await expect(page.getByTestId("rec-muted")).toContainText("pawpads");
  await expect(page.getByTestId("rec-muted")).toContainText("toebeans");
  await page.getByRole("button", { name: "Back" }).click();
  await expect(page).toHaveURL(/\/for-you$/);
  await expect(page.getByTestId("for-you-all-muted")).toBeVisible();
});

test("a ranking stopped mid-way (every tag muted) starts over when tags come back", async ({ page }) => {
  const mock = await withFavorites(page);
  mock.searchDelay = (tags) => (RANK_QUERY.test(tags) ? 1500 : 0);
  await page.goto("/for-you");
  await expect(page.getByTestId("search-progress")).toBeVisible({ timeout: 15_000 });
  await page.getByTestId("open-tune").click();
  for (const t of ["pawpads", "toebeans"]) await page.getByRole("button", { name: `Mute ${t}` }).click();
  for (const t of ["pawpads", "toebeans"]) await page.getByRole("button", { name: `Unmute ${t}` }).click();
  mock.searchDelay = () => 0;
  await page.getByRole("button", { name: "Back" }).click();
  await expect(page).toHaveURL(/\/for-you$/);
  await firstRanked(page);
  expect(await cardIds(page)).toEqual([1050, 1100]);
});

test("⋯ Refresh ranks again in the background and keeps the list until you swap it in", async ({ page }) => {
  const mock = await withFavorites(page);
  await page.goto("/for-you");
  await firstRanked(page);
  mock.searchDelay = (tags) => (RANK_QUERY.test(tags) ? 800 : 0);
  await page.getByTestId("for-you-more").click();
  await page.getByTestId("for-you-refresh").click();
  await expect(page.getByTestId("for-you-status")).toHaveText("Ranking again…");
  await expect(page.getByTestId("post-card").first()).toBeVisible();
  await expect(page.getByTestId("update-ranking")).toBeVisible();
  expect(ranked(mock)).toBe(2);
  await page.getByTestId("update-ranking").click();
  await expect(page.getByTestId("update-ranking")).toHaveCount(0);
  await expect(page.getByTestId("for-you-status")).toHaveText("Ranked just now");
  expect(ranked(mock)).toBe(2);
});

test("a failed Refresh says so and keeps the list", async ({ page }) => {
  const mock = await withFavorites(page);
  await page.goto("/for-you");
  await firstRanked(page);
  mock.searchFails = (tags) => RANK_QUERY.test(tags);
  await page.getByTestId("for-you-more").click();
  await page.getByTestId("for-you-refresh").click();
  await expect(page.getByTestId("for-you-status")).toContainText("Couldn't rank again");
  expect(await cardIds(page)).toEqual([1050, 1100]);
  await expect(page.getByTestId("update-ranking")).toHaveCount(0);
});

test("too few favorites for a profile says what's needed", async ({ page }) => {
  const mock = await mockE621(page);
  mock.setFavorites([{ id: 2000, tags: ["solo"] }]);
  await signIn(page);
  await page.goto("/for-you");
  await expect(page.getByTestId("for-you-too-few")).toContainText("A tag needs 3 favorites");
});

test.describe("pull to refresh", () => {
  test.use({ viewport: { width: 375, height: 812 }, hasTouch: true });

  test("a pull on a ranking under 10 minutes old says it's fresh, and doesn't rank again", async ({ page }) => {
    const mock = await withFavorites(page);
    await page.goto("/for-you");
    await firstRanked(page);
    await expect(page.getByTestId("for-you-status")).toHaveText("Ranked just now");
    await page.evaluate(async () => {
      const t = (y: number) => new Touch({ identifier: 1, target: document.body, clientX: 180, clientY: y });
      const fire = (type: string, touches: Touch[]) =>
        document.body.dispatchEvent(new TouchEvent(type, { touches, changedTouches: touches, bubbles: true }));
      fire("touchstart", [t(200)]);
      for (let i = 1; i <= 10; i++) {
        fire("touchmove", [t(200 + 20 * i)]);
        await new Promise((r) => requestAnimationFrame(r));
      }
      fire("touchend", []);
    });
    await expect(page.getByText("Already fresh, ranked 1 min ago")).toBeVisible();
    await page.waitForTimeout(500);
    expect(ranked(mock)).toBe(1);
  });
});

test("signing out while For You is still ranking (hidden behind Settings) stops it asking with the old key", async ({ page }) => {
  const mock = await withFavorites(page);
  // every page of the ranking (its candidates, then what's popular) is slow, so it's mid-way at sign-out
  const rankPage = (tags: string) => tags.includes("date:>=7_days_ago");
  mock.searchDelay = (tags) => (rankPage(tags) ? 1500 : 0);
  await page.goto("/for-you");
  await expect(page.getByTestId("search-progress")).toBeVisible({ timeout: 15_000 });
  await expect.poll(() => mock.searches.filter((s) => rankPage(s.tags)).length, { timeout: 15_000 }).toBeGreaterThan(0);
  await page.getByTestId("tab-settings").click();
  await page.getByTestId("sign-out").click();
  await expect(page.getByTestId("sign-out")).toHaveCount(0);
  const asked = mock.searches.filter((s) => s.auth && rankPage(s.tags)).length;
  // a ranking left running asks for its next page as soon as the slow one answers
  await page.waitForTimeout(4000);
  expect(mock.searches.filter((s) => s.auth && rankPage(s.tags)).length).toBe(asked);
});

test("Tune's Filter artists takes artist tags out of your taste and the search; it's kept, and offers Update ranking", async ({ page }) => {
  const mock = await withFavorites(page);
  // the favorites' artist is rare on e621, so it weighs in like any distinctive tag
  mock.tagCounts = { ...mock.tagCounts, mock_artist: 5 };
  const rankSearches = () => mock.searches.filter((s) => / order:score$/.test(s.tags) && s.tags.startsWith("~")).map((s) => s.tags);
  await page.goto("/for-you");
  await firstRanked(page);
  expect(rankSearches().at(-1)).toContain("~mock_artist");

  await page.getByTestId("open-tune").click();
  // Breadth's ends are how many tags, not a promise (owner)
  await expect(page.locator('[aria-labelledby="tune-breadth"] .slider-ends')).toHaveText("230");
  await expect(page.getByTestId("tune")).not.toContainText("Surprise me");
  const sw = page.getByTestId("rec-no-artists");
  await expect(sw).not.toBeChecked();
  await expect(page.getByRole("switch", { name: /Filter artists/ })).toBeVisible();
  await expect(page.getByTestId("rec-tags")).toContainText("mock artist");
  await sw.check();
  await expect(page.getByTestId("rec-tags")).not.toContainText("mock artist");
  await expect(page.getByTestId("rec-tags")).toContainText("pawpads");
  await shot(page, "tune-no-artists");
  // kept for this account
  await page.reload();
  await expect(page.getByTestId("rec-no-artists")).toBeChecked();

  await page.goBack();
  await expect(page).toHaveURL(/\/for-you$/);
  await page.getByTestId("update-ranking").click();
  await expect.poll(() => rankSearches().length).toBeGreaterThan(1);
  expect(rankSearches().at(-1)).not.toContain("mock_artist");
  await expect(page.getByTestId("post-card").first()).toBeVisible();
});

/**
 * Tune's "Search further" (owner, 2026-11-27: the wider search made the feed "a little less tuned"):
 * off by default, For You searches its top tags only; on, it goes on with the next tags when those run out.
 */
test("Search further: off by default, only the top tags are searched; on, the next ones follow", async ({ page }) => {
  const TAGS = ["pawpads", "toebeans", "fluffy_tail", "whiskers"];
  const mock = await mockE621(
    page,
    defaultSpecs().map((s) => (s.id === 1100 ? { ...s, tags: ["pawpads", "solo"] } : s.id === 1050 ? { ...s, tags: [...TAGS, "solo"] } : s)),
  );
  mock.setFavorites(Array.from({ length: 10 }, (_, i) => ({ id: 2000 + i, tags: TAGS })));
  mock.tagCounts = { pawpads: 5, toebeans: 6, fluffy_tail: 7, whiskers: 8 };
  await signIn(page);
  await page.addInitScript(() => {
    if (sessionStorage.getItem("breadth")) return;
    sessionStorage.setItem("breadth", "1");
    localStorage.setItem("e6ss:v1:search", JSON.stringify({ breadth: 2 }));
  });
  // the tag searches (the popular pages have no ~ tags)
  const tagQueries = () => [...new Set(mock.searches.filter((s) => s.tags.startsWith("~") && / order:score$/.test(s.tags)).map((s) => s.tags))];

  await page.goto("/for-you/tune");
  const sw = page.getByTestId("rec-more-tags");
  await expect(sw).not.toBeChecked();
  const searchedTags = page.locator("[data-testid=rec-tag][data-searched=true]");
  await expect(searchedTags).toHaveCount(2);
  await page.goto("/for-you");
  await firstRanked(page);
  expect(tagQueries()).toHaveLength(1);

  await page.goto("/for-you/tune");
  await page.getByTestId("rec-more-tags").check({ force: true });
  await page.reload();
  await expect(page.getByTestId("rec-more-tags")).toBeChecked();
  // Tune lists the next round's tags as searched too
  await expect(searchedTags).toHaveCount(4);
  mock.searches.length = 0;
  await page.goto("/for-you");
  await expect(page.getByTestId("post-card").first()).toBeVisible({ timeout: 15_000 });
  // a changed search offers Update ranking (the saved list stays) rather than re-ranking under you
  expect(tagQueries()).toHaveLength(0);
  await page.getByTestId("update-ranking").click();
  // round 1, then the next two tags by weight once round 1 runs out
  await expect.poll(() => tagQueries().length, { timeout: 15_000 }).toBe(2);
  const [first, second] = tagQueries();
  expect(first).toMatch(/~pawpads/);
  expect(first).toMatch(/~toebeans/);
  expect(second).toMatch(/~fluffy_tail/);
  expect(second).toMatch(/~whiskers/);
});

/**
 * Tune's Taste or popular (a friend's ask, via the owner: "tag vs favcount weight"): a finished
 * ranking re-sorts with no new searches; a restored one (ids only) offers Update ranking instead.
 */
test("Taste or popular re-sorts the ranked list without searching again; a restored list offers Update ranking", async ({ page }) => {
  // 1050 matches both profile tags but has 1 favorite; 1100 matches one and has 500
  const mock = await mockE621(
    page,
    defaultSpecs().map((s) => (s.id === 1050 ? { ...s, tags: ["pawpads", "toebeans"], favs: 1 } : s.id === 1100 ? { ...s, tags: ["pawpads"], favs: 500 } : s)),
  );
  mock.setFavorites(Array.from({ length: 10 }, (_, i) => ({ id: 2000 + i, tags: ["pawpads", "toebeans"] })));
  mock.tagCounts = { pawpads: 5, toebeans: 5 };
  await signIn(page);
  await page.goto("/for-you");
  await firstRanked(page);
  const searches = mock.searches.length;
  const top2 = async () => (await cardIds(page)).filter((id) => id === 1050 || id === 1100);
  const setTaste = async (key: "Home" | "End", label: string) => {
    await page.getByTestId("open-tune").click();
    const slider = page.getByTestId("rec-taste");
    await expect(page.getByTestId("rec-taste-value")).toBeVisible();
    await slider.focus();
    await slider.press(key);
    await expect(page.getByTestId("rec-taste-value")).toHaveText(label);
    await page.goBack();
    await expect(page.getByTestId("post-card").first()).toBeVisible();
  };

  await setTaste("Home", "Taste only");
  await expect.poll(top2).toEqual([1050, 1100]);
  // down the list, so starting at the top again shows
  await page.evaluate(() => window.scrollTo(0, 600));
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(0);
  await setTaste("End", "More popular · 2");
  await expect.poll(top2).toEqual([1100, 1050]);
  expect(mock.searches.length).toBe(searches);
  await expect(page.getByTestId("update-ranking")).toHaveCount(0);
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0);

  // a reload restores it in that order, ordered by the same weight: nothing stale
  await page.reload();
  await expect(page.getByTestId("post-card").first()).toBeVisible();
  await expect.poll(top2).toEqual([1100, 1050]);
  await expect(page.getByTestId("update-ranking")).toHaveCount(0);
  // a restored list holds ids only: another weight offers Update ranking
  await setTaste("Home", "Taste only");
  await expect(page.getByTestId("update-ranking")).toBeVisible();
  // Update ranking ranks afresh with it: taste first, and the pill goes
  await page.getByTestId("update-ranking").click();
  await expect(page.getByTestId("update-ranking")).toHaveCount(0);
  await expect.poll(top2).toEqual([1050, 1100]);
  expect(mock.searches.length).toBeGreaterThan(searches);
});
