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

test("search mode shows only e621's score, and it fades with the controls", async ({ page }) => {
  await start(page, undefined, { playback: { intervalSec: 60 } });
  await play(page);
  await page.mouse.move(400, 300);
  const score = page.getByTestId("post-score");
  await expect(score).toHaveText("▲ 4");
  await expect(page.getByTestId("controls")).toHaveAttribute("data-visible", "true");
  await expect(page.getByTestId("controls")).toHaveAttribute("data-visible", "false", { timeout: 5000 });
});

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

test("blacklist stays out of the query and filters locally", async ({ page }) => {
  const specs = defaultSpecs(20);
  specs[0].tags = ["solo", "badtag"]; // 1020 → hidden by multi-tag rule
  specs[1].tags = ["wildcard_thing"]; // 1019 → hidden by wildcard rule
  specs[2].tags = ["single"]; // 1018 → hidden by single rule
  const mock = await start(page, specs, { search: { blacklist: "badtag solo\nwild*\nsingle\n# comment" } });
  await expect(page.getByTestId("blacklist-stats")).toHaveText("3 rules · filtered locally");
  await page.locator("summary", { hasText: "Query sent to e621" }).click();
  await expect(page.getByTestId("query-preview")).toHaveText("(everything)");
  await play(page);
  expect(await slideId(page)).toBe(1017);
  expect(mock.searches[0].tags).toBe("");
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

// ---- slide styles ---------------------------------------------------------

/** Where each style keeps the posts shown before the current one. */
const KEPT: Record<string, string> = { prints: "print", collage: "collage-tile", kenburns: "previous-layer", reflections: "previous-layer" };

for (const style of ["prints", "kenburns", "collage", "reflections"]) {
  test(`${style}: plays a video, advances, and keeps the previous post on screen`, async ({ page }) => {
    await start(page, [{ id: 3, ext: "webm", duration: 2 }, { id: 2 }, { id: 1 }], { playback: { style, intervalSec: 1 } });
    await play(page);
    await expect(page.getByTestId(`${style}-stage`)).toBeVisible();
    const video = page.getByTestId("slide-video");
    await expect.poll(() => video.evaluate((v: HTMLVideoElement) => v.currentTime)).toBeGreaterThan(0.2);
    await expect(slide(page)).toHaveAttribute("data-post-id", "2", { timeout: 5000 });
    const kept = page.getByTestId(KEPT[style]);
    await expect(kept.first()).toBeAttached();
    // The video's background copy is its poster, never a second player.
    await expect(page.locator("video")).toHaveCount(0);
    if (style === "prints" || style === "collage") await expect(kept.and(page.locator('[data-post-id="3"]'))).toBeAttached();
    if (style === "prints") await expect(page.locator('[data-testid=prints-scene][data-scene-id="3"]')).toHaveCSS("opacity", "0");
  });
}

test("prints: one colour print over a grey heap; each slide dips to black and arrives whole", async ({ page }) => {
  await start(page, undefined, { playback: { style: "prints", intervalSec: 60 } });
  await play(page);
  const scene = (id: number) => page.locator(`[data-testid=prints-scene][data-scene-id="${id}"]`);
  const ids = (sel: string) => page.locator(sel).evaluateAll((els) => els.map((e) => e.getAttribute("data-post-id")));

  // A full heap from the first slide (drawn from upcoming posts), one focus print on top.
  await expect(scene(1150).getByTestId("prints-bg")).toHaveCount(6);
  await expect(scene(1150).getByTestId("print")).toHaveCount(1);
  const heap = await ids("[data-scene-id='1150'] [data-testid=prints-bg]");
  expect(heap).not.toContain("1150");

  await page.keyboard.press("ArrowRight");
  await expect(slide(page)).toHaveAttribute("data-post-id", "1149");
  // The focus print never animates on its own: no scale, always opaque; the scene layer fades it in.
  const focus = scene(1149).getByTestId("print");
  const pose = await focus.evaluate((el) => {
    const m = new DOMMatrix(getComputedStyle(el).transform);
    return { scale: Math.hypot(m.a, m.b), opacity: getComputedStyle(el).opacity };
  });
  expect(pose.scale).toBeCloseTo(1, 5);
  expect(pose.opacity).toBe("1");
  expect(await scene(1149).evaluate((el) => getComputedStyle(el).transitionDelay)).toBe("0.7s");
  await expect.poll(() => scene(1150).evaluate((el) => getComputedStyle(el).opacity)).toBe("0");
  await expect.poll(() => scene(1149).evaluate((el) => getComputedStyle(el).opacity)).toBe("1");
  // The old scene keeps its own heap while it fades.
  expect(await ids("[data-scene-id='1150'] [data-testid=prints-bg]")).toEqual(heap);
  await expect(page.getByTestId("print")).toHaveCount(2);
});

test("collage: the fourth post replaces the oldest tile", async ({ page }) => {
  await start(page, undefined, { playback: { style: "collage", intervalSec: 60 } });
  await play(page);
  for (const id of [1149, 1148, 1147]) {
    await page.keyboard.press("ArrowRight");
    await expect(slide(page)).toHaveAttribute("data-post-id", String(id));
  }
  const ids = await page.getByTestId("collage-tile").evaluateAll((els) => els.map((e) => e.getAttribute("data-post-id")).sort());
  expect(ids).toEqual(["1148", "1149"]);
});

test("the style picker persists and hides the classic-only controls", async ({ page }) => {
  await start(page);
  await expect(page.getByRole("radiogroup", { name: "Fit" })).toBeVisible();
  await page.getByTestId("style-select").selectOption("prints");
  await expect(page.getByRole("radiogroup", { name: "Fit" })).toHaveCount(0);
  await expect(page.getByRole("radiogroup", { name: "Transition" })).toHaveCount(0);
  await page.reload();
  await expect(page.getByTestId("style-select")).toHaveValue("prints");
  await play(page);
  await expect(page.getByTestId("prints-stage")).toBeVisible();
});

const tiles = (page: Page) => page.getByTestId("gallery-tile");

test("preview shows results as a grid; picking a tile starts the show there", async ({ page }) => {
  const mock = await start(page);
  await page.getByTestId("preview-button").click();
  await expect(page.getByTestId("settings-panel")).toHaveAttribute("data-open", "false");
  await expect(tiles(page)).toHaveCount(100);
  await expect(page.getByTestId("gallery-count")).toHaveText("100+ posts");
  await expect(slide(page)).toHaveCount(0);
  await expect(tiles(page).first().getByTestId("tile-preview")).toHaveAttribute("src", /\/data\/mock\/1150\.png$/);
  await expect(tiles(page).first().getByTestId("tile-sample")).toHaveAttribute("src", /\/sample\/mock\/1150\.jpg$/);

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

// ---- Recommended ----------------------------------------------------------

/** 10 favorites tagged `pawpads` (rare on the site) and `solo` (common). */
async function startRecommended(page: Page) {
  const specs = defaultSpecs().map((s) => {
    if (s.id === 1100) return { ...s, tags: ["pawpads", "solo"] };
    if (s.id === 1050) return { ...s, tags: ["pawpads", "solo", "a", "b", "c"] };
    if (s.id === 1120) return { ...s, tags: ["pawpads"] }; // already a favorite, still recommended
    return s;
  });
  const mock = await mockE621(page, specs);
  mock.setFavorites([{ id: 1120, tags: ["pawpads"] }, ...Array.from({ length: 9 }, (_, i) => ({ id: 2000 + i, tags: ["pawpads", "solo"] }))]);
  mock.tagCounts = { pawpads: 5 };
  await seed(page, { creds: { username: "tester", apiKey: "goodkey" }, playback: { intervalSec: 60 } });
  await page.goto("/");
  await expect(page.getByTestId("signed-in")).toBeVisible();
  await page.getByRole("radio", { name: "Recommended" }).click();
  await expect(page.getByTestId("rec-status")).toContainText("10 favorites");
  return mock;
}

test("recommended ranks the window by favorite tags and explains why", async ({ page }) => {
  const mock = await startRecommended(page);
  const profile = page.getByTestId("rec-tags");
  await expect(profile).toContainText("pawpads");
  await expect(profile).not.toContainText("solo"); // as common on the site as in favorites
  await expect(page.getByTestId("search-input")).toBeHidden();

  await play(page);
  // the favorite plays too; all three match only pawpads, so the tie goes to the newer post
  expect(await slideId(page)).toBe(1120);
  await expect(page.getByTestId("counter")).toHaveText("1 / 3");
  const query = mock.searches.find((s) => s.tags.startsWith("pawpads"))!.tags;
  // candidates + window + score order; the synced account blacklist stays client-side
  expect(query).toBe("pawpads date:>=7_days_ago order:score");

  // moving the mouse shows the match score next to e621's own
  await page.mouse.move(400, 300);
  await expect(page.getByTestId("post-score")).toHaveText(/^Match \d+\.\d·▲ 4$/);

  await page.keyboard.press("i");
  await expect(page.getByTestId("rec-reasons")).toHaveText("Recommended because: pawpads");
  await page.keyboard.press("ArrowRight");
  await expect.poll(() => slideId(page)).toBe(1100);
  await page.keyboard.press("ArrowRight");
  await expect.poll(() => slideId(page)).toBe(1050); // extra unweighted tags neither help nor hurt
});

test("recommended keeps the profile across reloads and only reads new favorites", async ({ page }) => {
  const mock = await startRecommended(page);
  await expect(page.getByTestId("rec-tags")).toContainText("pawpads");
  const lookups = mock.tagLookups.length;
  mock.favoritePages.length = 0;
  await page.reload();
  await expect(page.getByTestId("rec-status")).toContainText("10 favorites");
  await expect.poll(() => mock.favoritePages).toEqual([1]);
  expect(mock.tagLookups).toHaveLength(lookups); // counts cached
});

test("muting the only profile tag leaves nothing to recommend", async ({ page }) => {
  await startRecommended(page);
  await page.getByRole("button", { name: "Mute pawpads" }).click();
  await expect(page.getByTestId("rec-muted")).toContainText("pawpads");
  await page.getByTestId("play-button").click();
  await expect(page.getByTestId("toast")).toContainText("Not enough favorites");
  await page.getByRole("button", { name: "Unmute pawpads" }).click();
  await play(page);
  expect(await slideId(page)).toBe(1120);
});

test("recommended asks signed-out users to sign in", async ({ page }) => {
  await start(page);
  await page.getByRole("radio", { name: "Recommended" }).click();
  await expect(page.getByTestId("rec-signin")).toBeVisible();
  await page.getByTestId("play-button").click();
  await expect(page.getByTestId("toast")).toContainText("Sign in");
});

test("recommended ORs the profile tags into one paged search and starts once it's all ranked", async ({ page }) => {
  // 700 pawpads posts + 20 toebeans posts → the OR query pages 320, 320, 80 (short = done)
  const specs = [
    ...Array.from({ length: 700 }, (_, i) => ({ id: 5000 - i, tags: ["pawpads"] })),
    ...Array.from({ length: 20 }, (_, i) => ({ id: 1000 - i, tags: ["toebeans"] })),
  ];
  const mock = await mockE621(page, specs);
  mock.setFavorites(Array.from({ length: 10 }, (_, i) => ({ id: 9000 + i, tags: ["pawpads", "toebeans"] })));
  mock.tagCounts = { pawpads: 5, toebeans: 5 };
  // the last page is slow, so the wait is observable
  mock.searchDelay = (tags, n) => (tags.startsWith("~") && n === 3 ? 3000 : 0);
  await seed(page, { creds: { username: "tester", apiKey: "goodkey" }, playback: { intervalSec: 60 } });
  await page.goto("/");
  await page.getByRole("radio", { name: "Recommended" }).click();
  await expect(page.getByTestId("rec-tags")).toContainText("toebeans");
  await expect(page.getByTestId("query-preview")).toContainText("~pawpads ~toebeans date:>=7_days_ago order:score");

  await page.getByTestId("play-button").click();
  const progress = page.getByTestId("search-progress");
  await expect(progress).toContainText("Searching · page 3");
  await expect(slide(page)).toHaveCount(0); // nothing plays until every page is in and ranked
  const rec = () => mock.searches.filter((s) => s.tags.startsWith("~"));
  await expect.poll(() => rec().map((s) => s.page)).toEqual(["1", "2", "3"]);
  expect(new Set(rec().map((s) => s.tags)).size).toBe(1); // one query, paged

  await expect(slide(page)).toBeVisible({ timeout: 10_000 });
  await expect(progress).toBeHidden();
  await expect(page.getByTestId("counter")).toHaveText("1 / 720"); // complete: no "+"
});

test("the profile list shows every weighted tag in a scrollable box", async ({ page }) => {
  const mock = await mockE621(page);
  const niche = Array.from({ length: 45 }, (_, i) => `niche_${String(i).padStart(2, "0")}`);
  mock.setFavorites(Array.from({ length: 5 }, (_, i) => ({ id: 9000 + i, tags: niche })));
  mock.tagCounts = Object.fromEntries(niche.map((t) => [t, 5]));
  await seed(page, { creds: { username: "tester", apiKey: "goodkey" } });
  await page.goto("/");
  await page.getByRole("radio", { name: "Recommended" }).click();
  const list = page.getByTestId("rec-tags");
  await expect(list.getByTestId("rec-tag")).toHaveCount(45);
  await expect(page.getByText("Your profile: 45 tags")).toBeVisible();
  const { scrollHeight, clientHeight } = await list.evaluate((el) => ({ scrollHeight: el.scrollHeight, clientHeight: el.clientHeight }));
  expect(scrollHeight).toBeGreaterThan(clientHeight);
  await list.getByRole("button", { name: "Pin niche_44" }).scrollIntoViewIfNeeded();
  await expect(list.getByRole("button", { name: "Pin niche_44" })).toBeInViewport();
});

test("the profile filter narrows the list and Esc clears it", async ({ page }) => {
  const mock = await mockE621(page);
  const tags = ["pink_pawpads", "black_pawpads", "toe_beans", "knot", "paw_print"];
  mock.setFavorites(Array.from({ length: 5 }, (_, i) => ({ id: 9000 + i, tags })));
  mock.tagCounts = Object.fromEntries(tags.map((t) => [t, 5]));
  await seed(page, { creds: { username: "tester", apiKey: "goodkey" } });
  await page.goto("/");
  await page.getByRole("radio", { name: "Recommended" }).click();
  const rows = page.getByTestId("rec-tags").getByTestId("rec-tag");
  await expect(rows).toHaveCount(5);

  const filter = page.getByTestId("rec-filter");
  await filter.fill("pink pawpads"); // spaces match underscores
  await expect(rows).toHaveCount(1);
  await filter.fill("PAW");
  await expect(rows).toHaveCount(3);
  await expect(page.getByText("3 of 5")).toBeVisible();
  await filter.fill("zzz");
  await expect(page.getByText("No profile tags match.")).toBeVisible();

  await filter.press("Escape");
  await expect(filter).toHaveValue("");
  await expect(rows).toHaveCount(5);
  await expect(page.getByTestId("settings-panel")).toHaveAttribute("data-open", "true");
});

test("the highest-weight tags are searched, the rest dimmed, and pinning promotes one", async ({ page }) => {
  const mock = await mockE621(page);
  // 8 favorites: a on 8, b on 7, c on 6, d on 5. Site counts make the weights d > c > b > a,
  // so a is on the most favorites but weighs least: it must not be searched just for being common.
  const favs = Array.from({ length: 8 }, (_, i) => ({
    id: 9000 + i,
    tags: ["tag_a", ...(i < 7 ? ["tag_b"] : []), ...(i < 6 ? ["tag_c"] : []), ...(i < 5 ? ["tag_d"] : [])],
  }));
  mock.setFavorites(favs);
  // site counts keep every ratio under the 50× lift cap, so the ratios (not just n) set the order
  mock.tagCounts = { tag_a: 200, tag_b: 100, tag_c: 40, tag_d: 20 };
  await seed(page, { creds: { username: "tester", apiKey: "goodkey" }, search: { source: "recommended", breadth: 2 } });
  await page.goto("/");
  const rows = page.getByTestId("rec-tags").getByTestId("rec-tag");
  await expect(rows).toHaveCount(4);
  const searchedRows = rows.and(page.locator("[data-searched=true]"));
  await expect(searchedRows).toHaveText([/tag d/, /tag c/]);
  await expect(page.getByTestId("rec-group-signature")).toBeVisible();
  await expect(rows.and(page.locator("[data-searched=false]"))).toHaveText([/tag b/, /tag a/]);
  await expect(page.getByTestId("rec-cutoff")).toBeVisible();
  // the list reads top to bottom by weight
  await expect(rows).toHaveText([/tag d/, /tag c/, /tag b/, /tag a/]);

  // the Breadth slider: one more search adds the next weight down
  const slider = page.getByTestId("rec-breadth");
  await slider.focus();
  await slider.press("ArrowRight");
  await expect(page.getByTestId("rec-breadth-value")).toHaveText("3 tags");
  await expect(searchedRows).toHaveText([/tag d/, /tag c/, /tag b/]);
  await slider.press("ArrowLeft");
  await expect(searchedRows).toHaveText([/tag d/, /tag c/]);

  await page.getByRole("button", { name: "Pin tag_a" }).click(); // still clickable while dimmed
  await expect(page.getByTestId("rec-group-pinned")).toBeVisible();
  await expect(searchedRows).toHaveText([/tag a/, /tag d/]);
});

/** Ranked 1120, 1100 (pawpads + rope) then 1050 (pawpads only). */
async function startMuteCase(page: Page) {
  const specs = defaultSpecs().map((s) =>
    s.id === 1120 || s.id === 1100 ? { ...s, tags: ["pawpads", "rope"] } : s.id === 1050 ? { ...s, tags: ["pawpads"] } : s,
  );
  const mock = await mockE621(page, specs);
  mock.setFavorites(Array.from({ length: 10 }, (_, i) => ({ id: 9000 + i, tags: ["pawpads", "rope"] })));
  mock.tagCounts = { pawpads: 5, rope: 5 };
  await seed(page, { creds: { username: "tester", apiKey: "goodkey" }, playback: { intervalSec: 60 } });
  await page.goto("/");
  await page.getByRole("radio", { name: "Recommended" }).click();
  await expect(page.getByTestId("rec-tags")).toContainText("rope");
}

test("a tag muted in the profile hides every post carrying it", async ({ page }) => {
  await startMuteCase(page);
  await page.getByRole("button", { name: "Mute rope" }).click();
  await play(page);
  expect(await slideId(page)).toBe(1050);
  await expect(page.getByTestId("counter")).toHaveText("1 / 1");
});

test("muting from the info overlay hides the upcoming posts with that tag right away", async ({ page }) => {
  await startMuteCase(page);
  await play(page);
  expect(await slideId(page)).toBe(1120);
  await expect(page.getByTestId("counter")).toHaveText("1 / 3");
  await page.keyboard.press("i");
  await page.getByTestId("info-overlay").getByRole("button", { name: "Mute rope" }).click();
  await expect(page.getByTestId("toast")).toHaveText("Muted rope: hid 1 upcoming");
  await expect(page.getByTestId("counter")).toHaveText("1 / 2");
  await page.keyboard.press("ArrowRight");
  await expect.poll(() => slideId(page)).toBe(1050); // 1100 had rope

  // pressing − again on a muted tag keeps it muted (it used to toggle it back on)
  await page.keyboard.press("ArrowLeft");
  await page.keyboard.press("i");
  await page.getByTestId("info-overlay").getByRole("button", { name: "Mute rope" }).click();
  await page.keyboard.press("s");
  await expect(page.getByTestId("rec-muted")).toContainText("rope");
});

test.describe("touch", () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true });

  /** A one-finger drag of (dx, dy) from the middle of the screen. */
  async function swipe(page: Page, dx: number, dy = 0) {
    const app = page.getByTestId("app");
    const x = 195;
    const y = 300;
    const base = { pointerType: "touch", pointerId: 7, isPrimary: true, bubbles: true };
    await app.dispatchEvent("pointerdown", { ...base, clientX: x, clientY: y });
    await app.dispatchEvent("pointerup", { ...base, clientX: x + dx, clientY: y + dy });
  }

  test("swiping left and right changes the slide", async ({ page }) => {
    await start(page, undefined, { playback: { intervalSec: 60 } });
    await play(page);
    expect(await slideId(page)).toBe(1150);
    await swipe(page, -120);
    await expect(slide(page)).toHaveAttribute("data-post-id", "1149");
    await swipe(page, 120);
    await expect(slide(page)).toHaveAttribute("data-post-id", "1150");
  });

  test("short or mostly vertical drags don't change the slide", async ({ page }) => {
    await start(page, undefined, { playback: { intervalSec: 60 } });
    await play(page);
    await swipe(page, -20);
    await swipe(page, -60, 120);
    await page.waitForTimeout(300);
    expect(await slideId(page)).toBe(1150);
  });

  test("1:1 fit leaves sideways drags for panning", async ({ page }) => {
    await start(page, undefined, { playback: { intervalSec: 60, fit: "original" } });
    await play(page);
    await swipe(page, -120);
    await page.waitForTimeout(300);
    expect(await slideId(page)).toBe(1150);
  });
});

// ---- Share links ----------------------------------------------------------

test("a share link plays straight away without touching saved settings", async ({ page }) => {
  const mock = await mockE621(page, defaultSpecs().map((s) => (s.id === 1150 ? { ...s, tags: ["badtag"] } : s)));
  const own = { tags: "my_search", blacklist: "badtag" };
  await seed(page, { search: own, playback: { intervalSec: 60 } });
  await page.goto("/?v=1&tags=wolf&style=kenburns&int=30&mute=0");

  await expect(page.getByTestId("settings-panel")).toHaveAttribute("data-open", "false");
  await expect(slide(page)).toBeVisible();
  expect(mock.searches[0].tags).toContain("wolf");
  expect(await slideId(page)).toBe(1149); // the visitor's own blacklist still applies
  await expect(page.getByTestId("toast")).toContainText("Videos start muted");
  expect(new URL(page.url()).search).toBe("");
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem("e6ss:v1:search")!))).toEqual(own);
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem("e6ss:v1:playback")!))).toEqual({ intervalSec: 60 });
});

test("the share button copies a link to what's playing", async ({ page, context }) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await start(page);
  await page.getByTestId("search-input").fill("wolf");
  await play(page);
  await page.mouse.move(400, 300);
  await page.getByTestId("share-button").click();
  await expect(page.getByTestId("toast")).toHaveText("Share link copied");
  const url = new URL(await page.evaluate(() => navigator.clipboard.readText()));
  expect(url.searchParams.get("v")).toBe("1");
  expect(url.searchParams.get("tags")).toBe("wolf");
  expect(url.searchParams.get("int")).toBe("1");
});

test("recommended has no share button", async ({ page }) => {
  await startRecommended(page);
  await play(page);
  await page.mouse.move(400, 300);
  await expect(page.getByTestId("gallery-button")).toBeVisible();
  await expect(page.getByTestId("share-button")).toHaveCount(0);
});
