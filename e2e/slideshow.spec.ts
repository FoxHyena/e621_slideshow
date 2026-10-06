import { expect, test, type Page } from "@playwright/test";
import { defaultSpecs, mockE621, type MockPostSpec } from "./mock";

interface Seed {
  playback?: Record<string, unknown>;
  search?: Record<string, unknown>;
  creds?: { username: string; apiKey: string };
  /** expanded settings sections; defaults to all open so tests can reach every control */
  sections?: Record<string, boolean>;
}

const ALL_OPEN = { filters: true, saved: true, date: true, blacklist: true, playback: true, account: true, keyboard: true };

/** Seed localStorage once per test (not on reloads, so persistence is testable). */
async function seed(page: Page, s: Seed = {}) {
  await page.addInitScript((s) => {
    if (localStorage.getItem("e6ss:seeded")) return;
    localStorage.setItem("e6ss:seeded", "1");
    localStorage.setItem("e6ss:v1:playback", JSON.stringify({ intervalSec: 1, ...s.playback }));
    if (s.search) localStorage.setItem("e6ss:v1:search", JSON.stringify(s.search));
    if (s.creds) localStorage.setItem("e6ss:v1:creds", JSON.stringify(s.creds));
    localStorage.setItem("e6ss:v1:sections", JSON.stringify(s.sections));
  }, { ...s, sections: s.sections ?? ALL_OPEN });
}

const slide = (page: Page) => page.locator("[data-testid=slide-image],[data-testid=slide-video]");
const slideId = async (page: Page) => Number(await slide(page).getAttribute("data-post-id"));

async function start(page: Page, specs?: MockPostSpec[], s: Seed = {}) {
  const mock = await mockE621(page, specs);
  await seed(page, s);
  await page.goto("/");
  await expect(page.getByTestId("settings-panel")).toHaveAttribute("data-open", "true");
  return mock;
}

async function play(page: Page) {
  await page.getByTestId("play-button").click();
  await expect(page.getByTestId("settings-panel")).toHaveAttribute("data-open", "false");
  await expect(slide(page)).toBeVisible();
}

test("play starts the show and auto-advances on the timer", async ({ page }) => {
  const mock = await start(page);
  await page.getByTestId("search-input").fill("wolf");
  await play(page);
  expect(await slideId(page)).toBe(1150);
  expect(mock.searches[0].tags).toContain("wolf");
  expect(mock.searches[0].page).toBeNull();
  await expect(slide(page)).toHaveAttribute("data-post-id", "1149", { timeout: 4000 });
  await expect(page.getByTestId("counter")).toHaveText("2 / 100+");
});

test("cursor paging fetches the next page near the end", async ({ page }) => {
  const mock = await start(page, defaultSpecs(150), { playback: { intervalSec: 60 } });
  await play(page);
  for (let i = 0; i < 91; i++) await page.keyboard.press("ArrowRight");
  await expect(page.getByTestId("counter")).toHaveText("92 / 150");
  expect(mock.searches.map((s) => s.page)).toEqual([null, "b1051"]);
});

test("arrow keys navigate and space pauses", async ({ page }) => {
  await start(page, undefined, { playback: { intervalSec: 2 } });
  await play(page);
  await page.keyboard.press("Space");
  await page.keyboard.press("ArrowRight");
  await expect(slide(page)).toHaveAttribute("data-post-id", "1149");
  await page.keyboard.press("ArrowRight");
  await expect(slide(page)).toHaveAttribute("data-post-id", "1148");
  await page.keyboard.press("ArrowLeft");
  await expect(slide(page)).toHaveAttribute("data-post-id", "1149");
  await page.waitForTimeout(3000);
  await expect(slide(page)).toHaveAttribute("data-post-id", "1149"); // paused
  await page.keyboard.press("Space");
  await expect(slide(page)).toHaveAttribute("data-post-id", "1148", { timeout: 4000 });
});

test("opening settings keeps the position; changing the query restarts", async ({ page }) => {
  const mock = await start(page, undefined, { playback: { intervalSec: 60 } });
  await play(page);
  await page.keyboard.press("ArrowRight");
  await page.keyboard.press("ArrowRight");
  await expect(slide(page)).toHaveAttribute("data-post-id", "1148");

  // Open via the gear icon, change only playback settings, close.
  await page.mouse.move(600, 400);
  await page.getByTestId("settings-button").click();
  await expect(page.getByTestId("settings-panel")).toHaveAttribute("data-open", "true");
  await expect(page.getByTestId("play-button")).toHaveText(/Resume/);
  await page.getByTestId("interval-input").fill("30");
  await page.keyboard.press("Escape");
  await expect(page.getByTestId("settings-panel")).toHaveAttribute("data-open", "false");
  await expect(slide(page)).toHaveAttribute("data-post-id", "1148");
  expect(mock.searches).toHaveLength(1);

  // Now change the query.
  await page.keyboard.press("s");
  await page.getByTestId("search-input").fill("fox");
  await expect(page.getByTestId("play-button")).toHaveText(/Play new search/);
  await page.getByTestId("play-button").click();
  await expect(page.getByTestId("counter")).toHaveText("1 / 100+");
  expect(mock.searches.at(-1)!.tags).toBe("fox");
});

test("preloads the next N posts", async ({ page }) => {
  const mock = await start(page, undefined, { playback: { intervalSec: 60, preloadCount: 4 } });
  await play(page);
  await expect
    .poll(() => mock.media.filter((u) => /\/(1149|1148|1147|1146)\.png$/.test(u)).length)
    .toBe(4);
  expect(mock.media.some((u) => u.endsWith("/1145.png"))).toBe(false);
  // after moving forward, the window slides
  await page.keyboard.press("ArrowRight");
  await expect.poll(() => mock.media.some((u) => u.endsWith("/1145.png"))).toBe(true);
});

test("tag autocomplete suggests and completes the token under the cursor", async ({ page }) => {
  const mock = await start(page);
  const input = page.getByTestId("search-input");
  await input.click();
  await input.pressSequentially("solo -wol", { delay: 30 });
  const list = page.getByTestId("autocomplete");
  await expect(list.getByRole("option")).toHaveCount(3);
  await expect(list).toContainText("wol_species");
  await expect(list).toContainText("123k");
  await expect(list).toContainText("wolboy → canine");
  expect(mock.autocompleteQueries).toContain("wol");
  await page.keyboard.press("ArrowDown");
  await page.keyboard.press("Enter");
  await expect(input).toHaveValue("solo -wol_artist ");
  await expect(list).toBeHidden();

  // also works in the blacklist textarea
  const bl = page.getByTestId("blacklist-input");
  await bl.click();
  await bl.press("ControlOrMeta+a");
  await bl.press("Backspace");
  await expect(bl).toHaveValue("");
  await bl.pressSequentially("fox", { delay: 30 });
  await expect(bl).toHaveValue("fox");
  await expect(page.getByTestId("autocomplete")).toBeVisible();
  await page.keyboard.press("Tab");
  await expect(bl).toHaveValue("fox_species ");
});

test("blacklist builds the query and filters locally", async ({ page }) => {
  const specs = defaultSpecs(20);
  specs[0].tags = ["solo", "badtag"]; // 1020 → hidden by multi-tag rule
  specs[1].tags = ["wildcard_thing"]; // 1019 → hidden by local-only wildcard rule
  specs[2].tags = ["single"]; // 1018 → hidden by single rule (server + local)
  const mock = await start(page, specs, { search: { blacklist: "badtag solo\nwild*\nsingle\n# comment" } });
  await expect(page.getByTestId("blacklist-stats")).toHaveText("2 in query · 1 filtered locally");
  await page.locator("summary", { hasText: "Query sent to e621" }).click();
  await expect(page.getByTestId("query-preview")).toHaveText("-( badtag solo ) -single");
  await play(page);
  expect(await slideId(page)).toBe(1017);
  expect(mock.searches[0].tags).toBe("-( badtag solo ) -single");
});

test("signed out, import adds e621 defaults; signing in syncs the account blacklist", async ({ page }) => {
  await start(page, undefined, { search: { blacklist: "my_rule" } });
  await page.getByTestId("import-blacklist").click();
  await expect(page.getByTestId("blacklist-input")).toHaveValue(/^my_rule\ngore\nsnuff\nrape/);
  await expect(page.getByText(/Added 10 rules/)).toBeVisible();

  await page.getByLabel("e621 username").fill("tester");
  await page.getByLabel("API key").fill("goodkey");
  await page.getByRole("button", { name: /Verify/ }).click();
  await expect(page.getByTestId("signed-in")).toBeVisible();
  // synced automatically: defaults gone, own line kept, account rules in
  await expect(page.getByTestId("blacklist-input")).toHaveValue("my_rule\naccount_rule\nsecond_rule other");
  await expect(page.getByTestId("blacklist-synced")).toContainText("tester");
  await expect(page.getByTestId("import-blacklist")).toHaveText("Re-sync from account");
  await page.getByTestId("import-blacklist").click();
  await expect(page.getByText("Synced 2 rules from your account.")).toBeVisible();
  await expect(page.getByTestId("blacklist-input")).toHaveValue("my_rule\naccount_rule\nsecond_rule other");
});

test("new users start with an empty blacklist; an untouched old default list is cleared", async ({ page }) => {
  const defaults = "gore\nsnuff\nrape\nyoung -rating:s\ndiaper -rating:s\nfeces\nurine\nfart_fetish\nrealistic_feral rating:e\npolitics";
  const mock = await start(page, undefined, { search: { blacklist: defaults } });
  await expect(page.getByTestId("blacklist-input")).toHaveValue("");
  await play(page);
  expect(mock.searches[0].tags).toBe("");
  // an edited list is left alone
  await page.evaluate(() => localStorage.setItem("e6ss:v1:search", JSON.stringify({ blacklist: "gore\nmy_rule" })));
  await page.reload();
  await expect(page.getByTestId("blacklist-input")).toHaveValue("gore\nmy_rule");
});

test("a remembered key syncs the account blacklist on load", async ({ page }) => {
  await start(page, undefined, { creds: { username: "tester", apiKey: "goodkey" } });
  await expect(page.getByTestId("signed-in")).toBeVisible();
  await expect(page.getByTestId("blacklist-input")).toHaveValue("account_rule\nsecond_rule other");
});

test("date panel adds the date metatag", async ({ page }) => {
  const mock = await start(page);
  await page.getByTestId("date-enabled").check();
  await page.getByRole("button", { name: "Past month" }).click();
  await page.locator("summary", { hasText: "Query sent to e621" }).click();
  await expect(page.getByTestId("query-preview")).toContainText("date:month");
  await page.getByRole("radio", { name: "Between" }).click();
  await page.getByTestId("date-input").fill("2024-03-10");
  await page.getByTestId("date-input-2").fill("2024-03-01");
  await expect(page.getByTestId("query-preview")).toContainText("date:2024-03-01..2024-03-11");
  await page.getByRole("radio", { name: "Last…" }).click();
  await page.getByLabel("Amount").fill("2");
  await page.getByLabel("Unit").selectOption("weeks");
  await expect(page.getByTestId("query-preview")).toContainText("date:>=2_weeks_ago");
  await play(page);
  expect(mock.searches[0].tags).toContain("date:>=2_weeks_ago");
});

test("sign in, then the heart favorites and unfavorites", async ({ page }) => {
  const specs = defaultSpecs(10);
  specs[1].is_favorited = true; // 1009
  const mock = await start(page, specs, { playback: { intervalSec: 60 } });

  // wrong key shows e621's message
  await page.getByLabel("e621 username").fill("tester");
  await page.getByLabel("API key").fill("badkey");
  await page.getByRole("button", { name: /Verify/ }).click();
  await expect(page.getByTestId("settings-panel").getByRole("alert")).toHaveText("Invalid API key");

  await page.getByLabel("API key").fill("goodkey");
  await page.getByRole("button", { name: /Verify/ }).click();
  await expect(page.getByTestId("signed-in")).toContainText("tester");
  await play(page);
  expect(mock.searches[0].auth).toBe("Basic " + Buffer.from("tester:goodkey").toString("base64"));

  const heart = page.getByTestId("favorite-button");
  await page.mouse.move(500, 300);
  await expect(heart).toHaveAttribute("aria-pressed", "false");
  await heart.click();
  await expect(heart).toHaveAttribute("aria-pressed", "true");
  await expect.poll(() => mock.favorites).toEqual([{ method: "POST", postId: 1010 }]);
  await expect(heart.locator("svg")).toHaveClass(/fill-red-500/);

  await page.keyboard.press("l");
  await expect(heart).toHaveAttribute("aria-pressed", "false");
  await expect.poll(() => mock.favorites.at(-1)).toEqual({ method: "DELETE", postId: 1010 });

  // already-favorited post shows a filled heart
  await page.keyboard.press("ArrowRight");
  await expect(heart).toHaveAttribute("aria-pressed", "true");
});

test("a failed favorite reverts and shows e621's error", async ({ page }) => {
  await start(page, [{ id: 999 }], { creds: { username: "tester", apiKey: "goodkey" }, playback: { intervalSec: 60 } });
  await expect(page.getByTestId("signed-in")).toBeVisible();
  await play(page);
  await page.mouse.move(500, 300);
  await page.getByTestId("favorite-button").click();
  await expect(page.getByTestId("toast")).toContainText("You have already favorited this post");
  await expect(page.getByTestId("favorite-button")).toHaveAttribute("aria-pressed", "false");
});

test("no heart when signed out; hidden posts prompt sign-in", async ({ page }) => {
  const specs = defaultSpecs(10).map((s, i) => ({ ...s, hidden: i < 3 }));
  await start(page, specs, { playback: { intervalSec: 60 } });
  await play(page);
  await page.mouse.move(500, 300);
  await expect(page.getByTestId("info-button")).toBeVisible();
  await expect(page.getByTestId("favorite-button")).toHaveCount(0);
  await expect(page.getByText("3 hidden · sign in to see")).toBeVisible();
  expect(await slideId(page)).toBe(1007);
});

test("controls and cursor hide after idle and come back on mouse move", async ({ page }) => {
  await start(page, undefined, { playback: { intervalSec: 60 } });
  await play(page);
  await page.mouse.move(400, 300);
  await expect(page.getByTestId("controls")).toHaveAttribute("data-visible", "true");
  await expect(page.getByTestId("controls")).toHaveAttribute("data-visible", "false", { timeout: 4000 });
  await expect(page.getByTestId("app")).toHaveClass(/cursor-none/);
  await page.mouse.move(420, 320);
  await expect(page.getByTestId("controls")).toHaveAttribute("data-visible", "true");
});

test("videos play and advance after their duration", async ({ page }) => {
  await start(page, [{ id: 3, ext: "webm", duration: 2 }, { id: 2 }, { id: 1 }], { playback: { intervalSec: 1 } });
  await play(page);
  const video = page.getByTestId("slide-video");
  await expect(video).toBeVisible();
  await expect.poll(() => video.evaluate((v: HTMLVideoElement) => v.currentTime)).toBeGreaterThan(0.2);
  expect(await video.evaluate((v: HTMLVideoElement) => v.muted)).toBe(true);
  // ~2s video beats the 1s interval: still on it after 1.2s, then moves on
  await page.waitForTimeout(1200);
  await expect(slide(page)).toHaveAttribute("data-post-id", "3");
  await expect(slide(page)).toHaveAttribute("data-post-id", "2", { timeout: 4000 });
});

test("info overlay shows tags and can add one to the search", async ({ page }) => {
  const mock = await start(page, undefined, { playback: { intervalSec: 60 } });
  await play(page);
  await page.keyboard.press("i");
  const info = page.getByTestId("info-overlay");
  await expect(info).toContainText("Post #1150");
  await expect(info).toContainText("mock_artist".replace(/_/g, " "));
  await info.getByRole("button", { name: "Add mock_artist to search" }).click();
  await expect(info).toBeHidden();
  await expect.poll(() => mock.searches.at(-1)!.tags).toBe("mock_artist");
  await page.keyboard.press("i");
  await page.getByTestId("info-overlay").getByRole("button", { name: "Exclude solo from search" }).click();
  await expect.poll(() => mock.searches.at(-1)!.tags).toBe("mock_artist -solo");
});

test("saved searches and history persist across reloads", async ({ page }) => {
  await start(page, undefined, { playback: { intervalSec: 60 } });
  await page.getByTestId("search-input").fill("wolf solo");
  await page.getByLabel("Saved search name").fill("Lone wolves");
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await play(page);
  await page.reload();
  await page.getByTestId("search-input").fill("something else");
  await expect(page.getByTestId("saved-list")).toContainText("Lone wolves");
  await expect(page.getByTestId("history-list")).toContainText("wolf solo");
  await page.getByTestId("saved-list").getByText("Lone wolves").click();
  await expect(page.getByTestId("search-input")).toHaveValue("wolf solo");
});

test("empty results and API errors are shown", async ({ page }) => {
  await start(page);
  await page.getByTestId("search-input").fill("nothing_matches");
  await page.getByTestId("play-button").click();
  await expect(page.getByTestId("no-results")).toBeVisible();
  await page.keyboard.press("s");
  await page.getByTestId("search-input").fill("server_error");
  await page.getByTestId("play-button").click();
  await expect(page.getByText("e621: Mock search failure")).toBeVisible();
});

test("random order sends a seed and reshuffle changes it", async ({ page }) => {
  const mock = await start(page);
  await page.getByTestId("order-select").selectOption("random");
  await play(page);
  const first = mock.searches[0];
  expect(first.tags).toMatch(/order:random randseed:\d+/);
  expect(first.page).toBe("1");
  await page.keyboard.press("s");
  await page.getByRole("button", { name: /Reshuffle/ }).click();
  await page.getByTestId("play-button").click();
  await expect.poll(() => mock.searches.length).toBe(2);
  expect(mock.searches[1].tags).not.toBe(first.tags);
});

test("settings sections other than Search are collapsible and remember their state", async ({ page }) => {
  await start(page, undefined, { sections: {} });
  await expect(page.getByTestId("search-input")).toBeVisible();
  for (const id of ["saved", "blacklist", "playback", "account", "keyboard"]) {
    await expect(page.getByTestId(`section-${id}`)).toHaveAttribute("data-open", "false");
  }
  await expect(page.getByTestId("section-date")).toHaveCount(0);
  // filters and upload date live inside Search, collapsed, with summaries
  const search = page.getByTestId("section-search");
  const filters = search.getByTestId("subsection-filters");
  const date = search.getByTestId("subsection-date");
  await expect(filters).toHaveAttribute("data-open", "false");
  await expect(date).toHaveAttribute("data-open", "false");
  await expect(filters).toContainText("S·Q·E · all media");
  await expect(date).toContainText("off");
  await expect(page.getByTestId("rating-s")).toHaveCount(0);
  await filters.getByRole("button", { name: /Filters/ }).click();
  await page.getByTestId("rating-e").uncheck();
  await page.getByTestId("media-video").uncheck();
  await expect(filters).toContainText("S·Q · images·gifs");
  const cheatsheet = page.getByTestId("section-search").getByTestId("cheatsheet-link");
  await expect(cheatsheet).toHaveAttribute("href", "https://e621.net/help/cheatsheet");
  await expect(cheatsheet).toHaveAttribute("target", "_blank");
  // Search itself never collapses
  await expect(page.getByTestId("section-search")).not.toHaveAttribute("data-open", /.*/);
  // collapsed headers still summarize what's active
  await expect(page.getByTestId("section-blacklist")).toContainText("0 rules");
  await expect(page.getByTestId("blacklist-input")).toHaveCount(0);

  const header = page.getByRole("button", { name: /Blacklist/ });
  await header.click();
  await expect(header).toHaveAttribute("aria-expanded", "true");
  await expect(page.getByTestId("blacklist-input")).toBeVisible();

  await page.reload();
  await expect(page.getByTestId("blacklist-input")).toBeVisible();
  await expect(page.getByTestId("subsection-date")).toHaveAttribute("data-open", "false");
  await expect(page.getByTestId("subsection-filters")).toHaveAttribute("data-open", "true");
  await page.getByRole("button", { name: /Blacklist/ }).click();
  await expect(page.getByTestId("blacklist-input")).toHaveCount(0);
});

test("the previous image fades out to black instead of staying underneath", async ({ page }) => {
  await start(page, undefined, { playback: { intervalSec: 60, transition: "fade" } });
  await play(page);
  await page.keyboard.press("ArrowRight");
  await expect(slide(page)).toHaveAttribute("data-post-id", "1149");
  const prev = page.getByTestId("previous-layer");
  await expect(prev).toHaveCount(1);
  await expect.poll(() => prev.evaluate((el) => getComputedStyle(el).opacity)).toBe("0");
  const bg = await slide(page).evaluate((el) => getComputedStyle(el.closest(".bg-black")!).backgroundColor);
  expect(bg).toBe("rgb(0, 0, 0)");
});

const tiles = (page: Page) => page.getByTestId("gallery-tile");

test("preview shows results as a grid; picking a tile starts the show there", async ({ page }) => {
  const mock = await start(page);
  await page.getByTestId("preview-button").click();
  await expect(page.getByTestId("settings-panel")).toHaveAttribute("data-open", "false");
  await expect(tiles(page)).toHaveCount(100);
  await expect(page.getByTestId("gallery-count")).toHaveText("100+ posts");
  await expect(slide(page)).toHaveCount(0);
  await expect(tiles(page).first().locator("img")).toHaveAttribute("src", /\/sample\/mock\/1150\.jpg$/);

  await tiles(page).nth(2).click();
  await expect(page.getByTestId("gallery")).toHaveCount(0);
  expect(await slideId(page)).toBe(1148);
  await expect(page.getByTestId("counter")).toHaveText(/^3 \//);
  expect(mock.searches).toHaveLength(1);
});

test("scrolling the gallery loads the next page", async ({ page }) => {
  const mock = await start(page, defaultSpecs(150));
  await page.getByTestId("preview-button").click();
  await expect(tiles(page)).toHaveCount(100);
  expect(mock.searches).toHaveLength(1);
  await tiles(page).last().scrollIntoViewIfNeeded();
  await expect(tiles(page)).toHaveCount(150);
  await expect(page.getByTestId("gallery-count")).toHaveText("150 posts");
  expect(mock.searches.map((s) => s.page)).toEqual([null, "b1051"]);
});

test("the gallery leaves out blacklisted posts and badges videos", async ({ page }) => {
  const specs = defaultSpecs(5);
  specs[0].tags = ["wild_thing"];
  specs[1] = { ...specs[1], ext: "webm", duration: 75 };
  await start(page, specs, { search: { blacklist: "wild*" } });
  await page.getByTestId("preview-button").click();
  await expect(tiles(page)).toHaveCount(4);
  await expect(page.locator("[data-testid=gallery-tile][data-post-id='1005']")).toHaveCount(0);
  await expect(page.locator("[data-testid=gallery-tile][data-post-id='1004']")).toContainText("VIDEO 1:15");
  await expect(page.getByTestId("gallery")).toContainText("1 blacklisted");
});

test("G opens the gallery mid-show on the current post and freezes the timer", async ({ page }) => {
  await start(page, undefined, { playback: { intervalSec: 1 } });
  await play(page);
  await page.keyboard.press("ArrowRight");
  await page.keyboard.press("ArrowRight");
  expect(await slideId(page)).toBe(1148);
  await page.keyboard.press("g");
  await expect(page.locator("[data-testid=gallery-tile][aria-current]")).toHaveAttribute("data-post-id", "1148");
  await page.waitForTimeout(1500);
  await page.keyboard.press("Escape");
  await expect(page.getByTestId("gallery")).toHaveCount(0);
  expect(await slideId(page)).toBe(1148);

  await page.getByTestId("gallery-button").click();
  await page.getByTestId("gallery-play").click();
  expect(await slideId(page)).toBe(1148);
});
