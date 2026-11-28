import { expect, test, type Locator, type Page } from "@playwright/test";
import { defaultSpecs, mockE621 } from "./mock";

/**
 * The v6 screens (DESIGN.md "Lists", "Search", "Tune", "Settings", "Grid view"): the geometry the
 * spec pins down, measured in the page, plus screenshots for the visual check (E6_SHOTS=dir).
 */

const SHOTS = process.env.E6_SHOTS;
const shot = async (page: Page, name: string, fullPage = true) => {
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/${name}.png`, fullPage, animations: "disabled" });
};

test.use({ viewport: { width: 375, height: 812 } });

const signIn = (page: Page) =>
  page.addInitScript(() => {
    if (sessionStorage.getItem("seeded")) return;
    sessionStorage.setItem("seeded", "1");
    localStorage.setItem("e6ss:v1:creds", JSON.stringify({ username: "tester", apiKey: "goodkey" }));
  });

const box = async (l: Locator) => (await l.boundingBox())!;

test("Settings: rows in groups, icon wells, row ends 16 in from the panel's edge", async ({ page }) => {
  await mockE621(page);
  await signIn(page);
  await page.goto("/settings");
  await expect(page.getByRole("heading", { level: 1, name: "Settings" })).toBeVisible();
  await expect(page.getByTestId("settings-account")).toContainText("tester");
  const group = page.getByRole("list", { name: "Settings" });
  const rows = group.locator(".list-row");
  await expect(rows).toHaveCount(4);
  const g = await box(group);
  for (let i = 0; i < 4; i++) {
    const r = await box(rows.nth(i));
    expect(r.height).toBeGreaterThanOrEqual(56);
    // the well's left edge is 16 in; the chevron's ink ends 16 from the right edge (its box 5 past)
    const well = await box(rows.nth(i).locator(".row-well"));
    expect(Math.round(well.x - g.x)).toBe(16);
    expect(well.width).toBe(32);
    const chev = await box(rows.nth(i).locator(".row-chev"));
    expect(Math.round(g.x + g.width - (chev.x + chev.width))).toBe(11);
  }
  await expect(rows.nth(1)).toContainText("6 s");
  // 8 between the title row and the account group (mock)
  const title = await box(page.locator(".title-row"));
  const account = await box(page.getByRole("list", { name: "Account" }));
  expect(Math.round(account.y - (title.y + title.height))).toBe(8);
  await expect(page.locator(".app-foot")).toContainText(/Version \d+\.\d+\.\d+/);
  // the goo row: Wipe clean ends 16 in
  const goo = page.getByTestId("goo-row");
  const wipe = await box(page.getByTestId("goo-wipe"));
  const gb = await box(goo);
  expect(Math.round(gb.x + gb.width - (wipe.x + wipe.width))).toBe(16);
  expect(wipe.height).toBe(36);
  await shot(page, "v6-settings");
});

test("Search: back and the field share the top row; recent and saved show tags with a dot", async ({ page }) => {
  await mockE621(page);
  await page.addInitScript(() => {
    localStorage.setItem("e6ss:v1:history", JSON.stringify([{ tags: "red_fox solo", at: 1 }]));
    localStorage.setItem(
      "e6ss:v1:saved",
      JSON.stringify([{ id: "a", name: "fox solo", tags: "fox solo", ratings: { s: true, q: true, e: false }, date: { enabled: false }, order: "score" }]),
    );
  });
  await page.goto("/search");
  const field = page.getByTestId("search-tags");
  await expect(field).toBeFocused();
  const back = await box(page.getByRole("button", { name: "Back" }));
  const f = await box(page.locator(".field6").first());
  expect(Math.abs(back.y + back.height / 2 - (f.y + f.height / 2))).toBeLessThan(1);
  expect(f.height).toBe(44);
  await expect(page.getByTestId("recent-search")).toHaveText("red fox · solo");
  // named after its tags: the name shows them, the line only what's extra
  await expect(page.getByTestId("saved-search").locator("b")).toHaveText("fox · solo");
  await expect(page.getByTestId("saved-search").locator("small")).toHaveText("Top");
  // Search appears once there's something to search
  await expect(page.getByTestId("search-submit")).toHaveCount(0);
  await field.fill("wolf");
  await expect(page.getByTestId("search-submit")).toBeVisible();
  await shot(page, "v6-search");
  await page.getByTestId("search-submit").click();
  await expect(page).toHaveURL(/\/search\?tags=wolf$/);
  // Results: the search as a field-shaped button between back and the tools capsule
  const pill = page.getByTestId("query-pill");
  await expect(pill).toHaveText("wolf");
  await expect(page.locator(".head-row .tools .toolbar-circle")).toHaveCount(3);
  await expect(page.getByTestId("post-card").first()).toBeVisible();
  await shot(page, "v6-results");
});

test("Search suggestions: a flat group of 48 rows; an artist is a 24 mark and the name, 'artist' as the value", async ({ page }) => {
  await mockE621(page);
  await page.goto("/search");
  const field = page.getByTestId("search-tags");
  await field.pressSequentially("wol", { delay: 30 });
  const list = page.getByTestId("autocomplete");
  const rows = list.getByRole("option");
  await expect(rows).toHaveCount(3);
  const f = await box(page.locator(".field6").first());
  const l = await box(list);
  expect([l.x, l.width]).toEqual([f.x, f.width]);
  for (let i = 0; i < 3; i++) {
    const r = await box(rows.nth(i));
    expect(r.height).toBe(48);
    expect(r.width).toBe(l.width);
  }
  const artist = rows.nth(1);
  expect((await box(artist.locator(".suggest-mark"))).width).toBe(24);
  await expect(artist.locator(".row-value")).toHaveText("artist");
  await expect(rows.first().locator(".suggest-mark")).toHaveCount(0);
  await shot(page, "v6-search-suggest");
});

test("Search opened from Following keeps focus in its field once its code is loaded", async ({ page }) => {
  await mockE621(page);
  await page.goto("/following");
  // the idle prefetch has the Search screen's code ready, so its heading exists at once
  await page.waitForFunction(() => performance.getEntriesByType("resource").length > 0);
  await page.goto("/search");
  await page.getByRole("button", { name: "Back" }).click();
  await page.getByRole("button", { name: "Search", exact: true }).first().click();
  await expect(page.getByTestId("search-tags")).toBeFocused();
});

test("Grid: 8 between columns, 12 between rows, score and favs under each tile", async ({ page }) => {
  await mockE621(page);
  await page.goto("/search?tags=wolf");
  await expect(page.getByTestId("post-card").first()).toBeVisible();
  await page.getByTestId("grid-toggle").click();
  const tiles = page.getByTestId("grid-tile");
  await expect(tiles.nth(3)).toBeVisible();
  const [a, b, d] = [await box(tiles.nth(0).locator(".tile-art")), await box(tiles.nth(1).locator(".tile-art")), await box(tiles.nth(3).locator(".tile-art"))];
  expect(Math.round(b.x - (a.x + a.width))).toBe(8);
  expect(Math.round(a.width)).toBe(Math.round(a.height));
  const nums = await box(tiles.nth(0).locator(".tile-nums"));
  expect(Math.round(nums.y - (a.y + a.height))).toBe(4);
  expect(Math.round(d.y - (nums.y + nums.height))).toBe(12);
  await expect(tiles.nth(0).locator(".tile-up")).not.toBeEmpty();
  await shot(page, "v6-grid");
});

test("Tune: the sync row, the Breadth slider, and Pin and Mute toggles", async ({ page }) => {
  const mock = await mockE621(page);
  mock.setFavorites(Array.from({ length: 10 }, (_, i) => ({ id: 2000 + i, tags: ["pawpads", "toebeans", "solo"] })));
  mock.tagCounts = { pawpads: 5, toebeans: 5 };
  await signIn(page);
  await page.goto("/for-you/tune");
  await expect(page.getByRole("heading", { level: 1, name: "Tune" })).toBeVisible();
  await expect(page.getByTestId("rec-status")).toContainText("favorites read", { timeout: 10000 });
  const rebuild = await box(page.getByTestId("rec-rebuild"));
  expect(rebuild.height).toBe(36);
  const slider = page.getByTestId("rec-breadth");
  await expect(slider).toHaveAttribute("style", /--p:/);
  const pin = page.getByTestId("rec-tag").first().getByRole("button", { name: /^Pin / });
  await pin.click();
  await expect(page.getByTestId("rec-tag").first().getByRole("button", { name: /^Unpin / })).toHaveAttribute("aria-pressed", "true");
  await shot(page, "v6-tune");
});

test("Dropdowns: Sort drops 8 under its chip inside the 16 inset, a menu whose capsule sits under the choice", async ({ page }) => {
  await mockE621(page);
  await page.goto("/search?tags=wolf&order=score");
  await expect(page.getByTestId("post-card").first()).toBeVisible();
  await page.getByTestId("chip-sort").click();
  const sheet = page.getByTestId("sheet-sort");
  await expect(sheet).toBeVisible();
  await expect(page.getByTestId("chip-sort")).toHaveAttribute("aria-expanded", "true");
  const drop = sheet.locator(".drop");
  await drop.evaluate((el) => Promise.all(el.getAnimations().map((a) => a.finished)));
  const panel = await box(drop);
  const chip = await box(page.getByTestId("chip-sort"));
  expect(Math.round(panel.y)).toBe(Math.round(chip.y + chip.height + 8));
  expect(panel.x).toBeGreaterThanOrEqual(16);
  expect(Math.round(panel.x + panel.width)).toBeLessThanOrEqual(Math.round((await viewW(page)) - 16));
  // no title, no ✕: the chip is the title
  await expect(sheet.getByTestId("sheet-close")).toHaveCount(0);
  // the capsule sits under Top, the chosen row; no check marks
  const top = await box(page.getByTestId("sort-score"));
  const thumb = await box(sheet.locator(".menu-thumb"));
  expect(Math.round(thumb.y)).toBe(Math.round(top.y));
  expect(Math.round(top.height)).toBe(44);
  await expect(page.getByTestId("sort-reshuffle")).toHaveCount(0);
  await shot(page, "v6-sort", false);
  // Random carries Reshuffle while it's chosen
  await page.getByTestId("sort-random").click();
  await expect(sheet).toBeHidden();
  await expect(page).toHaveURL(/order=random/);
  await page.getByTestId("chip-sort").click();
  await page.getByTestId("sort-reshuffle").click();
  await expect(page).toHaveURL(/seed=/);
});

test("Sheets: Date's Custom… opens its kinds and fields, and Apply waits for a date", async ({ page }) => {
  await mockE621(page);
  await page.goto("/search?tags=wolf");
  await expect(page.getByTestId("post-card").first()).toBeVisible();
  await page.getByTestId("chip-date").click();
  await page.getByTestId("date-custom").click();
  await expect(page.getByTestId("sheet-date")).toBeVisible();
  await page.getByTestId("date-mode").getByRole("radio", { name: "Between" }).click();
  await expect(page.getByTestId("date-done")).toBeDisabled();
  await page.getByTestId("date-input").fill("2024-03-01");
  await page.getByTestId("date-input-2").fill("2024-03-10");
  await shot(page, "v6-date", false);
  await page.getByTestId("date-done").click();
  await expect(page.getByTestId("sheet-date")).toBeHidden();
  await expect(page.getByTestId("chip-date")).toHaveAttribute("data-on");
});

test("Sheets: Media is three switches; the ⋯ menu names the post and lists its rows in a well", async ({ page }) => {
  await mockE621(page);
  await page.goto("/search?tags=wolf");
  await expect(page.getByTestId("post-card").first()).toBeVisible();
  await page.getByTestId("card-menu").first().click();
  const sheet = page.getByTestId("sheet-post");
  await expect(sheet.getByRole("dialog")).toHaveAccessibleName(/^Post \d+/);
  // Open post, Play from this post, Share post, Open on e621, Blacklist this artist
  await expect(sheet.locator(".well-row")).toHaveCount(5);
  await expect(sheet.locator(".sheet-ctx small")).toHaveText(/^#\d+$/);
  await shot(page, "v6-post-menu", false);
  await page.goBack();
  await page.getByTestId("chip-media").click();
  await expect(page.getByRole("switch")).toHaveCount(3);
  await shot(page, "v6-media", false);
  await page.getByTestId("media-image").uncheck();
  await page.getByTestId("media-gif").uncheck();
  // the last one on can't be turned off; a tap outside applies what changed
  await expect(page.getByTestId("media-video")).toBeDisabled();
  await page.getByTestId("drop-outside").click({ position: { x: 5, y: 700 } });
  await expect(page.getByTestId("sheet-media")).toBeHidden();
  await expect(page.getByTestId("chip-media")).toHaveText("Videos");
  // Esc applies too
  await page.getByTestId("chip-media").click();
  await page.getByTestId("media-image").check();
  await page.keyboard.press("Escape");
  await expect(page.getByTestId("sheet-media")).toBeHidden();
  await expect(page.getByTestId("chip-media")).not.toHaveText("Videos");
  // and so does Back
  await page.getByTestId("chip-media").click();
  await page.getByTestId("media-image").uncheck();
  await page.goBack();
  await expect(page.getByTestId("sheet-media")).toBeHidden();
  await expect(page.getByTestId("chip-media")).toHaveText("Videos");
  await expect(page).toHaveURL(/\/search\?/);
});

/** the layout viewport's width (less the desktop scrollbar's stable gutter) */
const viewW = (page: Page) => page.evaluate(() => document.body.getBoundingClientRect().width);
const right = async (l: Locator) => {
  const b = await box(l);
  return b.x + b.width;
};

/** waits for every running animation in the sheet (its slide up) to finish */
const settled = (l: Locator) => l.evaluate((el) => Promise.all(el.getAnimations({ subtree: true }).map((a) => a.finished.catch(() => null))));

test("Player: count at the right edge, a 62 Play, time left; ⓘ has stats, tags by kind, and targets over a tag", async ({ page }) => {
  await mockE621(page);
  await page.goto("/search?tags=wolf");
  await page.getByTestId("play-fab").click();
  await expect(page.getByTestId("pause-button")).toHaveAccessibleName("Pause");
  const count = await box(page.getByTestId("counter"));
  expect(Math.round((await right(page.getByTestId("player"))) - (count.x + count.width))).toBe(16);
  expect(Math.round(count.height)).toBe(28);
  const play = await box(page.getByTestId("pause-button"));
  expect([Math.round(play.width), Math.round(play.height)]).toEqual([62, 62]);
  await expect(page.getByTestId("time-left")).toHaveText(/^\d+ s$/);
  await shot(page, "v6-player", false);

  await page.getByTestId("info-button").click();
  const sheet = page.getByTestId("sheet-info");
  await expect(page.getByRole("dialog", { name: /^Post 1150 by mock artist$/ })).toBeVisible();
  await settled(sheet);
  await expect(sheet.locator(".stat-well")).toHaveCount(3);
  await expect(sheet.locator("[data-rating]")).toHaveText(/^(Safe|Questionable|Explicit)$/);
  // one artist: no Artists group (the name is in the head); the rest in e621's order
  await expect(sheet.getByRole("region", { name: "Artists" })).toHaveCount(0);
  expect(await sheet.locator(".info-kind").evaluateAll((els) => els.map((e) => e.getAttribute("aria-label")))).toEqual(["Species", "General"]);
  await expect(sheet.getByTestId("info-why")).toHaveCount(0);
  await expect(sheet.locator(".info-foot")).toContainText("×");

  const tag = sheet.locator('[data-testid=info-tag][data-tag="solo"]');
  await tag.click();
  await expect(tag).toHaveAttribute("data-picked", "true");
  const targets = page.getByTestId("tag-actions");
  await expect(targets.locator(".tag-target")).toHaveCount(2);
  await expect(targets.locator(".tag-target").first()).toHaveAttribute("data-testid", "tag-action-search");
  const t = await box(targets);
  const g = await box(tag);
  expect(Math.round(g.y - (t.y + t.height))).toBe(8);
  expect(t.x).toBeGreaterThanOrEqual(8);
  await shot(page, "v6-post-info", false);
  // Search closes the sheet and the player and opens the tag's results
  await page.getByTestId("tag-action-search").click();
  await expect(page).toHaveURL(/\/search\?tags=solo/);
  await expect(page.getByTestId("player")).toHaveCount(0);
});

test("Quick settings: stepper, fit for Classic only, mute, and Quality as a menu over it", async ({ page }) => {
  await mockE621(page);
  await page.goto("/search?tags=wolf");
  await page.getByTestId("play-fab").click();
  await page.getByTestId("quick-settings-button").click();
  const sheet = page.getByTestId("sheet-quick-settings");
  await expect(sheet).toBeVisible();
  await settled(sheet);
  const x = await box(sheet.getByTestId("sheet-close"));
  expect(Math.round((await right(sheet)) - (x.x + x.width))).toBe(16);
  await expect(page.getByTestId("quick-target")).toHaveCount(0);
  const saved = () => page.evaluate(() => JSON.parse(localStorage.getItem("e6ss:v1:playback") ?? "{}"));

  await expect(page.getByTestId("quick-seconds").locator("output")).toHaveText("6 s");
  await page.getByRole("button", { name: "More seconds per slide" }).click();
  await expect(page.getByTestId("quick-seconds").locator("output")).toHaveText("7 s");
  expect((await saved()).intervalSec).toBe(7);
  await expect(page.getByTestId("quick-fit")).toBeVisible();
  await shot(page, "v6-quick-settings", false);

  const mute = page.getByTestId("quick-mute");
  const was = await mute.isChecked();
  await mute.click({ force: true });
  expect((await saved()).videoMuted).toBe(!was);

  await page.getByTestId("quick-quality").click();
  await expect(page.getByTestId("sheet-quality")).toBeVisible();
  await page.getByTestId("quality-original").click();
  await expect(page.getByTestId("sheet-quality")).toBeHidden();
  await expect(sheet).toBeVisible();
  await expect(page.getByTestId("quick-quality")).toContainText("Original");
  expect((await saved()).quality).toBe("original");

  await page.getByTestId("quick-style").getByRole("radio", { name: "Ken Burns" }).click();
  await expect(page.getByTestId("quick-fit")).toHaveCount(0);
});

test("Quick settings on a share link change this visit only, unless you save them as your default", async ({ page }) => {
  await mockE621(page);
  await page.goto("/?v=1&tags=wolf&style=kenburns&int=30&mute=0");
  await expect(page.getByTestId("player")).toBeVisible();
  await page.getByTestId("quick-settings-button").click();
  const target = page.getByTestId("quick-target");
  await expect(target.getByRole("radio", { name: "This visit only" })).toHaveAttribute("aria-checked", "true");
  const out = page.getByTestId("quick-seconds").locator("output");
  await expect(out).toHaveText("30 s");
  const more = page.getByRole("button", { name: "More seconds per slide" });
  await more.click();
  await expect(out).toHaveText("31 s");
  expect(await page.evaluate(() => localStorage.getItem("e6ss:v1:playback"))).toBeNull();
  await target.getByRole("radio", { name: "Save as default" }).click();
  await more.click();
  await expect(out).toHaveText("32 s");
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem("e6ss:v1:playback")!).intervalSec)).toBe(32);
});

test("Tag targets on a card sit 8 above the tag, inside the screen", async ({ page }) => {
  await mockE621(page);
  await page.goto("/search?tags=wolf");
  const tag = page.locator('[data-post-id="1150"] [data-testid=card-tag][data-tag="solo"]');
  await tag.click();
  await expect(tag).toHaveAttribute("data-picked", "true");
  const targets = page.getByTestId("tag-actions");
  // (their code comes with the first hold, or at idle)
  await expect(targets).toBeVisible();
  expect(await targets.locator(".tag-target").evaluateAll((els) => els.map((e) => e.getAttribute("data-testid")))).toEqual([
    "tag-action-search",
    "tag-action-blacklist",
  ]);
  const t = await box(targets);
  const g = await box(tag);
  expect(Math.round(g.y - (t.y + t.height))).toBe(8);
  expect(t.x).toBeGreaterThanOrEqual(8);
  expect(t.x + t.width).toBeLessThanOrEqual((await viewW(page)) - 8);
  expect(Math.round(t.height)).toBe(44);
  await shot(page, "v6-tag-targets", false);
  // a tap elsewhere closes them
  await page.mouse.click(200, 120);
  await expect(targets).toHaveCount(0);
});

test("Post info with two artists lists them, and an artist's tag opens their page first", async ({ page }) => {
  const mock = await mockE621(page, defaultSpecs().map((s) => (s.id === 1150 ? { ...s, artists: ["mock_artist", "other_artist"] } : s)));
  await page.goto("/search?tags=wolf");
  await page.getByTestId("play-fab").click();
  await page.getByTestId("info-button").click();
  const sheet = page.getByTestId("sheet-info");
  await settled(sheet);
  const group = sheet.getByRole("region", { name: "Artists" });
  await expect(group.getByTestId("info-tag")).toHaveCount(2);
  await group.locator('[data-tag="other_artist"]').click();
  expect(await page.getByTestId("tag-actions").locator(".tag-target").evaluateAll((els) => els.map((e) => e.getAttribute("data-testid")))).toEqual([
    "tag-action-open",
    "tag-action-search",
    "tag-action-blacklist",
  ]);
  await page.getByTestId("tag-action-open").click();
  await expect(page).toHaveURL(/\/artist\/other_artist$/);
  await expect.poll(() => mock.searches.at(-1)!.tags.split(" ")).toContain("other_artist");
});

test("Review fixes: Tab stays in a menu sheet; Custom… focuses its field; style picker takes arrows", async ({ page }) => {
  await mockE621(page);
  await page.goto("/search?tags=wolf");
  await page.getByTestId("chip-sort").click();
  const sort = page.getByTestId("sheet-sort");
  await settled(sort);
  // the chosen row is the only tab stop, so Tab stays on it
  await expect(sort.getByRole("radio", { checked: true })).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(sort.getByRole("radio", { checked: true })).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(sort).toBeHidden();

  await page.getByTestId("chip-score").click();
  await page.getByTestId("score-custom").click();
  await expect(page.getByTestId("score-input")).toBeFocused();
  await page.keyboard.press("Escape");

  await page.getByTestId("play-fab").click();
  await page.getByTestId("quick-settings-button").click();
  const style = page.getByTestId("quick-style");
  await style.getByRole("radio", { checked: true }).focus();
  await expect(style.getByRole("radio", { name: "Classic" })).toHaveAttribute("aria-checked", "true");
  await page.keyboard.press("ArrowRight");
  await expect(style.getByRole("radio", { name: "Ken Burns" })).toHaveAttribute("aria-checked", "true");
  await expect(style.getByRole("radio", { name: "Ken Burns" })).toBeFocused();
  expect(await style.getByRole("radio").evaluateAll((els) => els.filter((e) => (e as HTMLElement).tabIndex === 0).length)).toBe(1);
});

test("Review fixes: Post info counts real artists, and signed-out For You offers no Pin", async ({ page }) => {
  await mockE621(page, defaultSpecs().map((s) => ({ ...s, artists: ["mock_artist", "conditional_dnp"] })));
  await page.goto("/for-you");
  await expect(page.getByTestId("for-you-signed-out")).toBeVisible();
  // Play waits until the sign-in block has scrolled away, then comes back when you rest
  await page.mouse.wheel(0, 900);
  const play = page.getByTestId("play-fab");
  await expect(play).not.toHaveAttribute("data-gated");
  await expect(play).not.toHaveAttribute("data-away");
  await play.click();
  await page.getByTestId("info-button").click();
  const sheet = page.getByTestId("sheet-info");
  await settled(sheet);
  await expect(sheet.getByRole("region", { name: "Artists" })).toHaveCount(0);
  await sheet.locator('[data-testid=info-tag][data-tag="solo"]').click();
  expect(await page.getByTestId("tag-actions").locator(".tag-target").evaluateAll((els) => els.map((e) => e.getAttribute("data-testid")))).toEqual([
    "tag-action-search",
    "tag-action-blacklist",
  ]);
});

test("Review fixes: if the filter menus can't load, the sheet closes and says so", async ({ page }) => {
  await mockE621(page);
  await page.route(/FilterSheets/, (r) => r.abort());
  await page.goto("/search?tags=wolf");
  await page.getByTestId("chip-sort").click();
  await expect(page.getByText("Couldn't load the filters")).toBeVisible();
  await expect(page).toHaveURL(/\/search\?tags=wolf$/);
  await expect(page.getByTestId("post-card").first()).toBeVisible();
});

test("Top bar: after 64 px of scroll the title row floats as a capsule, 16 from the sides and 4 from the top", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.addInitScript(() => {
    if (sessionStorage.getItem("seeded")) return;
    sessionStorage.setItem("seeded", "1");
    localStorage.setItem("e6ss:v1:creds", JSON.stringify({ username: "tester", apiKey: "goodkey" }));
  });
  const mock = await mockE621(page, Array.from({ length: 40 }, (_, i) => ({ id: 1150 - i, artist: "fox_artist" })));
  mock.subscriptions = ["fox_artist"];
  mock.lastSeen = 1140;
  await page.goto("/following");
  await expect(page.getByTestId("post-card").first()).toBeVisible();
  const bar = page.getByTestId("top-bar");
  await expect(bar).not.toHaveAttribute("data-at");
  await page.evaluate(() => window.scrollTo(0, 400));
  await expect(bar).toHaveAttribute("data-at", "in");
  await settled(bar);
  const cap = await box(bar.locator(".topcap"));
  expect(Math.round(cap.x)).toBe(16);
  expect(Math.round(cap.width)).toBe(375 - 32);
  expect(Math.round(cap.height)).toBe(52);
  expect(Math.round(cap.y)).toBe(4);
  await expect(bar.locator(".topcap-count")).toHaveText(/\d+ new/);
  // the same buttons, not a copy
  await expect(page.getByTestId("grid-toggle")).toHaveCount(1);
  await page.evaluate(() => window.scrollTo(0, 0));
  await expect(bar).not.toHaveAttribute("data-at");
});

for (const [w, h] of [
  [375, 812],
  [1280, 800],
]) {
  test(`Top bar at ${w}: scrolling back up, the title is in the page at once on every tab`, async ({ page }) => {
    await page.setViewportSize({ width: w, height: h });
    await page.addInitScript(() => {
      if (sessionStorage.getItem("seeded")) return;
      sessionStorage.setItem("seeded", "1");
      localStorage.setItem("e6ss:v1:creds", JSON.stringify({ username: "tester", apiKey: "goodkey" }));
    });
    const mock = await mockE621(page, Array.from({ length: 40 }, (_, i) => ({ id: 1150 - i, artist: i % 2 ? "fox_artist" : "otter_artist" })));
    mock.subscriptions = ["fox_artist", "otter_artist"];
    mock.lastSeen = 1140;
    for (const path of ["/following", "/for-you", "/artists", "/settings"]) {
      await page.goto(path);
      const bar = page.locator("section[data-screen]:visible [data-testid=top-bar]");
      await expect(bar.locator("h1")).toBeVisible();
      // make the page long enough to scroll past the line, whatever has loaded
      await page.evaluate(() => {
        document.body.style.paddingBottom = "2000px";
        window.scrollTo(0, 300);
      });
      await expect(bar).toHaveAttribute("data-at", "in");
      const back = await page.evaluate(async () => {
        window.scrollTo(0, 0);
        await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
        // the shown screen's row (hidden screens keep their own, not drawn)
        const row = [...document.querySelectorAll<HTMLElement>("[data-testid=top-bar]")].find((e) => e.querySelector("h1")!.getClientRects().length > 0)!;
        const h1 = row.querySelector("h1")!.getBoundingClientRect();
        return { at: row.getAttribute("data-at"), top: Math.round(h1.top), height: Math.round(h1.height), pos: getComputedStyle(row).position };
      });
      expect(back.at, path).toBeNull();
      expect(back.height, path).toBeGreaterThan(30);
      expect(back.top, path).toBeGreaterThanOrEqual(0);
      // in the page's flow, not still the fixed capsule
      expect(back.pos, path).not.toBe("fixed");
      // the leaving copy fades, then goes
      await expect(page.getByTestId("top-bar-leaving")).toHaveCount(0);
    }
  });
}

test("A post's +N tag shows the rest of its tags in the same row, and the card keeps its height", async ({ page }) => {
  const tags = Array.from({ length: 20 }, (_, i) => `tag_${i}`);
  await mockE621(page, [{ id: 1150, tags }, { id: 1149 }]);
  await page.goto("/search?tags=wolf");
  const card = page.getByTestId("post-card").first();
  await expect(card).toBeVisible();
  const more = card.getByTestId("card-tags-more");
  await expect(more).toHaveText(/^\+\d+$/);
  const before = await card.getByTestId("card-tag").count();
  const height = (await box(card)).height;
  await more.click();
  await expect(more).toHaveCount(0);
  await expect.poll(() => card.getByTestId("card-tag").count()).toBeGreaterThan(before);
  await expect(card.getByTestId("card-tag").nth(12)).toBeFocused();
  expect((await box(card)).height).toBe(height);
});

/**
 * Rows (designer, 2026-11-27; owner: "right icon seems too far right and line shouldn't extend all
 * the way through"): what ends a row has its ink 16 from the panel's edge, each glyph pulled by its own
 * empty margin (› 5, ⌄ 3, the external-link glyph 1); a divider stops where the content stops, 16
 * before the panel's edge (in the ⋯ menu's well, 14).
 */
test("Rows: a row's end glyph's ink stands 16 from the panel's edge; dividers stop short of it", async ({ page }) => {
  await mockE621(page);
  // the ink's right end, from the glyph's drawn paths (stroke included), against its panel's right edge
  const inkGap = (row: Locator, glyph: string) =>
    row.evaluate((el, sel) => {
      const svg = el.querySelector<SVGSVGElement>(sel)!;
      const panel = el.closest("ul, .list-group, .well-group")!.getBoundingClientRect();
      const r = svg.getBoundingClientRect();
      const k = r.width / svg.viewBox.baseVal.width;
      let right = -Infinity;
      for (const p of svg.querySelectorAll<SVGGraphicsElement>("path, line, polyline, rect, circle")) {
        const b = p.getBBox();
        right = Math.max(right, b.x + b.width);
      }
      const stroke = Number(getComputedStyle(svg).strokeWidth.replace("px", "")) || 2;
      return panel.right - (r.left + (right + stroke / 2) * k);
    }, glyph);
  const dividerGap = (row: Locator) =>
    row.evaluate((el) => {
      const panel = el.closest("ul, .list-group, .well-group")!.getBoundingClientRect();
      const line = getComputedStyle(el, "::before");
      return line.content === "none" ? null : panel.right - (el.getBoundingClientRect().right - parseFloat(line.right));
    });

  await page.goto("/settings/app");
  const made = page.getByTestId("made-by");
  await expect(made).toBeVisible();
  expect(Math.abs((await inkGap(made, ".row-ext")) - 16)).toBeLessThan(1);
  const source = page.locator(".list-row", { hasText: "Source code" });
  expect(Math.abs((await inkGap(source, ".row-ext")) - 16)).toBeLessThan(1);
  // Source code follows Version: its line stops 16 before the edge
  expect(await dividerGap(source)).toBe(16);

  await page.goto("/settings/slideshow");
  const row = page.getByTestId("slideshow-quality");
  await expect(row).toBeVisible();
  expect(Math.abs((await inkGap(row, ".row-drop")) - 16)).toBeLessThan(1);
  expect(await dividerGap(page.getByTestId("slideshow-videoMaxSec"))).toBe(16);

  await page.goto("/settings");
  const first = page.getByRole("list", { name: "Settings" }).locator(".list-row");
  expect(Math.abs((await inkGap(first.nth(1), ".row-chev")) - 16)).toBeLessThan(1);
  expect(await dividerGap(first.nth(1))).toBe(16);

  await page.goto("/search?tags=wolf");
  await page.getByTestId("card-menu").first().click();
  const wells = page.getByTestId("sheet-post").locator(".well-row");
  await expect(wells).toHaveCount(5);
  expect(await dividerGap(wells.nth(1))).toBe(14);
});
