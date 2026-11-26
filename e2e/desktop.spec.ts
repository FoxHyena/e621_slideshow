import { expect, test, type Page } from "@playwright/test";
import { mockE621, type MockPostSpec } from "./mock";

/**
 * On a computer (DESIGN.md "On a computer (900 px and wider)", proposed): the sidebar, the 600 column,
 * the grid at full width, Play beside the column, dialogs, Settings on one page, the player's Post
 * info panel. Under 900 it is the phone layout.
 */

const SHOTS = process.env.E6_SHOTS;
test.use({ viewport: { width: 1280, height: 800 } });
const shot = async (page: Page, name: string) => {
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/${name}.png`, fullPage: false, animations: "disabled" });
};

const signIn = (page: Page) =>
  page.addInitScript(() => {
    if (sessionStorage.getItem("seeded")) return;
    sessionStorage.setItem("seeded", "1");
    localStorage.setItem("e6ss:v1:creds", JSON.stringify({ username: "tester", apiKey: "goodkey" }));
  });

function specs(): MockPostSpec[] {
  return Array.from({ length: 60 }, (_, i) => ({ id: 1150 - i, artist: i % 3 ? "fox_artist" : "otter_artist" }));
}

async function following(page: Page) {
  const mock = await mockE621(page, specs());
  mock.subscriptions = ["fox_artist", "otter_artist"];
  mock.lastSeen = 1140;
  await signIn(page);
  return mock;
}

const side = (page: Page) => page.getByTestId("sidebar");

test("the sidebar: brand, tabs with names, the capsule on the current one, Search with /, the account", async ({ page }) => {
  await following(page);
  await page.goto("/following");
  await expect(page.getByTestId("post-card").first()).toBeVisible();
  await expect(side(page)).toBeVisible();
  const box = (await side(page).boundingBox())!;
  expect(box.x).toBe(8);
  expect(box.width).toBe(232);
  await expect(side(page).getByRole("img", { name: "eLicks21" })).toHaveText("eLicks21");
  expect(await side(page).locator(".side-name").evaluate((e) => getComputedStyle(e).fontSize)).toBe("20px");
  await expect(side(page).getByTestId("tab-following")).toHaveAttribute("aria-current", "page");
  await expect(side(page).getByTestId("tab-following")).toContainText("Following");
  await expect(side(page).getByTestId("side-account")).toContainText("tester");
  await expect(side(page).getByTestId("side-account")).toContainText("2 follows", { timeout: 15000 });
  // the feed is a 600 column centred right of the sidebar
  const card = (await page.getByTestId("post-card").first().boundingBox())!;
  expect(card.width).toBeLessThanOrEqual(600);
  // (measured against the content box: the page keeps a scrollbar gutter)
  const content = (await page.locator("section[data-screen=following]").boundingBox())!;
  expect(content.x).toBe(248);
  expect(Math.abs(card.x + card.width / 2 - (content.x + content.width / 2))).toBeLessThan(2);
  // Play sits beside the column, off the pictures
  const play = (await page.getByTestId("play-fab").boundingBox())!;
  expect(play.x + play.width).toBeLessThan(card.x);
  await shot(page, "desktop-following");

  await page.keyboard.press("/");
  await expect(page).toHaveURL(/\/search$/);
  await page.goBack();
  await side(page).getByTestId("tab-artists").click();
  await expect(side(page).getByTestId("tab-artists")).toHaveAttribute("aria-current", "page");
  await side(page).getByTestId("side-account").click();
  await expect(page).toHaveURL(/\/settings/);
});

test("900 to 1099: the sidebar is icons only, names as tooltips", async ({ page }) => {
  await following(page);
  await page.setViewportSize({ width: 1000, height: 800 });
  await page.goto("/following");
  await expect(side(page)).toBeVisible();
  expect((await side(page).boundingBox())!.width).toBe(68);
  await expect(side(page).getByTestId("tab-for-you")).toHaveAttribute("title", "For You");
  await shot(page, "desktop-narrow");
});

test("under 900 it is the phone layout", async ({ page }) => {
  await following(page);
  await page.setViewportSize({ width: 899, height: 800 });
  await page.goto("/following");
  await expect(page.getByTestId("post-card").first()).toBeVisible();
  await expect(side(page)).toHaveCount(0);
  await expect(page.locator(".tube")).toBeVisible();
});

test("a grid uses the full width; a titled sheet is a 420 dialog", async ({ page }) => {
  await following(page);
  await page.goto("/following");
  await page.getByTestId("grid-toggle").click();
  const tiles = page.getByTestId("grid-tile");
  await expect(tiles.first()).toBeVisible();
  const first = (await tiles.first().boundingBox())!;
  expect(first.x).toBeGreaterThanOrEqual(248 + 24 - 1);
  expect(first.width).toBeGreaterThanOrEqual(176);
  await shot(page, "desktop-grid");
  // a tile's menu is right-click: Favorite, Open artist, Play from here, Open on e621
  await tiles.first().click({ button: "right" });
  const menu = page.getByTestId("sheet-post");
  await expect(menu).toBeVisible();
  await expect(menu).toContainText("Play from here");
  await expect(menu).toContainText("Open artist");
  // a titled sheet is a 420 dialog in the middle
  const dialog = (await menu.getByRole("dialog").boundingBox())!;
  expect(dialog.width).toBe(420);
  await shot(page, "desktop-tile-menu");
  await page.getByTestId("tile-fav").click();
  await expect(menu).toHaveCount(0);
  await expect(tiles.first()).toHaveAccessibleName(/favorited/);
});

test("grid loading on a computer: three full rows of skeleton tiles across the wide grid", async ({ page }) => {
  const mock = await following(page);
  mock.searchDelay = () => 2500;
  await page.goto("/following");
  await page.getByTestId("grid-toggle").click();
  const sk = page.getByTestId("feed-loading");
  await expect(sk.locator(".sk-tile").first()).toBeVisible();
  const cols = await sk.evaluate((e) => getComputedStyle(e).gridTemplateColumns.split(" ").length);
  expect(cols).toBeGreaterThan(3);
  await expect(sk.locator(".sk-tile")).toHaveCount(cols * 3);
});

test("one head: the toolbar, hero and chips stay in the 600 column when the grid goes wide", async ({ page }) => {
  await mockE621(page, specs());
  await page.goto("/artist/fox_artist");
  await expect(page.getByTestId("post-card").first()).toBeVisible();
  const head = async () => {
    const at = async (sel: string) => (await page.locator(sel).first().boundingBox())!;
    const [row, chips, hero] = [await at(".head-row"), await at(".chips .chip"), await at(".artist-hero")];
    return [row.x, row.width, chips.x, hero.x, hero.width].map(Math.round);
  };
  const feed = await head();
  await page.getByTestId("grid-toggle").click();
  await expect(page.getByTestId("grid-tile").first()).toBeVisible();
  expect(await head()).toEqual(feed);
  expect(feed[1]).toBe(600);
});

test("Lift: a button with a lip rises 1 under the pointer and its lip grows by 1, same colour", async ({ page }) => {
  await mockE621(page, specs());
  await page.goto("/artist/fox_artist");
  await expect(page.getByTestId("post-card").first()).toBeVisible();
  for (const sel of [".follow-button", ".play-fab", ".fav-pill"]) {
    const el = page.locator(sel).first();
    const look = () => el.evaluate((e) => [getComputedStyle(e).transform, getComputedStyle(e).boxShadow.match(/(\d+)px 0px 0px(?!.*inset)/)?.[1], getComputedStyle(e).backgroundColor]);
    await page.mouse.move(600, 790);
    await expect.poll(look).toEqual([expect.anything(), expect.any(String), expect.any(String)]);
    const [, lip, bg] = await look();
    await el.hover();
    await expect.poll(look).toEqual(["matrix(1, 0, 0, 1, 0, -1)", String(Number(lip) + 1), bg]);
  }
});

test("under the pointer: a bare icon gets a wash and turns white, a tag's well washes", async ({ page }) => {
  await mockE621(page, specs());
  await page.goto("/artist/fox_artist");
  await expect(page.getByTestId("post-card").first()).toBeVisible();
  const style = (sel: string, props: string[]) =>
    page.locator(sel).first().evaluate((e, ps) => ps.map((p) => getComputedStyle(e).getPropertyValue(p)), props);
  await page.mouse.move(600, 790);
  const menu = await style(".post-menu", ["background-color", "color"]);
  await page.locator(".post-menu").first().hover();
  await expect.poll(() => style(".post-menu", ["background-color", "color"])).toEqual(["rgba(255, 255, 255, 0.06)", "rgb(255, 255, 255)"]);
  expect(menu[0]).not.toBe("rgba(255, 255, 255, 0.06)");
  await page.mouse.move(600, 790);
  const tag = await style(".post-tag:not(.post-tag-more)", ["background-color"]);
  await page.locator(".post-tag:not(.post-tag-more)").first().hover();
  await expect.poll(async () => (await style(".post-tag:not(.post-tag-more)", ["background-color"]))[0]).not.toBe(tag[0]);
  // a press still sinks it to the dark well
  await page.mouse.down();
  await expect.poll(async () => (await style(".post-tag:not(.post-tag-more)", ["background-color"]))[0]).toBe("rgb(7, 22, 49)");
  await page.mouse.up();
  await shot(page, "desktop-hover-tag");
  // a row in a well: the wash's corners are the well's 16 less 4
  await page.keyboard.press("Escape");
  await page.locator(".post-menu").first().click();
  const row = page.locator(".well-row").first();
  await row.hover();
  await expect.poll(() => row.evaluate((e) => [getComputedStyle(e, "::after").opacity, getComputedStyle(e, "::after").borderTopLeftRadius])).toEqual(["1", "12px"]);
});

test("under the pointer a row gets the Inset wash, 4 inside it with the panel's corners, and its dividers fade", async ({ page }) => {
  await following(page);
  await page.goto("/settings");
  const rows = page.locator(".list-group > label.list-row:not(:has(input:disabled)):has(+ label.list-row)");
  await expect(rows.first()).toBeVisible();
  const row = rows.first();
  const wash = () =>
    row.evaluate((e) => {
      const a = getComputedStyle(e, "::after");
      const next = e.nextElementSibling!;
      return [a.opacity, a.top, a.left, a.borderTopLeftRadius, getComputedStyle(e, "::before").opacity, getComputedStyle(next, "::before").opacity];
    });
  await page.mouse.move(1270, 790);
  await expect.poll(async () => (await wash())[0]).toBe("0");
  await row.hover();
  await expect.poll(wash).toEqual(["1", "4px", "4px", "20px", "0", "0"]);
  await shot(page, "desktop-row-wash");
});

test("on a phone, holding a tile opens the same menu; a tap still opens the post", async ({ page }) => {
  await following(page);
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto("/following");
  await page.getByTestId("grid-toggle").click();
  const tile = page.getByTestId("grid-tile").first();
  await expect(tile).toBeVisible();
  const b = (await tile.boundingBox())!;
  // a tap turns the grid back into the feed, at that post
  await tile.click();
  await expect(page.getByTestId("feed")).toBeVisible();
  await expect(page.getByTestId("player")).toHaveCount(0);
  await page.getByTestId("grid-toggle").click();
  // a hold: pointer down, 400 ms, up
  await tile.dispatchEvent("pointerdown", { pointerType: "touch", clientX: b.x + 20, clientY: b.y + 20, isPrimary: true });
  await page.waitForTimeout(500);
  await tile.dispatchEvent("pointerup", { pointerType: "touch", clientX: b.x + 20, clientY: b.y + 20, isPrimary: true });
  await expect(page.getByTestId("sheet-post")).toContainText("Favorite");
});

test("Settings is one page: every section in the column, Sign out on the account row", async ({ page }) => {
  await following(page);
  await page.goto("/settings");
  for (const name of ["Account", "Content", "Slideshow", "For You", "App"]) {
    await expect(page.getByRole("heading", { name, exact: true })).toBeVisible();
  }
  await expect(page.getByTestId("sign-out")).toBeVisible();
  // every app mark (the sidebar's, any in hidden screens) paints its own gradient
  await expect(page.locator(".side .mark-app")).toBeVisible();
  const ids = await page.locator(".mark-app linearGradient").evaluateAll((g) => g.map((e) => e.id));
  expect(new Set(ids).size).toBe(ids.length);
  await shot(page, "desktop-settings");
  // a toast centres on the column, 24 from the bottom
  await page.getByTestId("rating-e").uncheck();
  await page.getByTestId("rating-q").uncheck();
  await page.getByTestId("rating-s").click();
  const t = page.locator("[data-sonner-toast][data-visible=true]");
  await expect(t).toHaveText("Keep at least one rating on");
  // (after it has slid in)
  await expect.poll(async () => Math.round(800 - ((await t.boundingBox())!.y + (await t.boundingBox())!.height))).toBe(24);
  const tb = (await t.boundingBox())!;
  const content = (await page.locator("section[data-screen=settings]").boundingBox())!;
  expect(Math.abs(tb.x + tb.width / 2 - (content.x + content.width / 2))).toBeLessThan(2);
});

test("/ on Search goes to its field, not to a second Search", async ({ page }) => {
  await following(page);
  await page.goto("/following");
  await expect(side(page)).toBeVisible();
  await page.keyboard.press("/");
  await expect(page).toHaveURL(/\/search$/);
  const depth = await page.evaluate(() => (history.state as { e6?: { depth: number } }).e6?.depth);
  await page.locator("body").click({ position: { x: 700, y: 700 } });
  await page.keyboard.press("/");
  expect(await page.evaluate(() => (history.state as { e6?: { depth: number } }).e6?.depth)).toBe(depth);
  await expect(page.locator("[role=search] :is(input, textarea)").first()).toBeFocused();
});

test("the player: Post info is a panel at the right and the picture moves over", async ({ page }) => {
  await following(page);
  await page.goto("/following");
  await page.getByTestId("play-fab").click();
  await expect(page.getByTestId("player")).toBeVisible();
  await expect(side(page)).toBeHidden();
  await page.getByTestId("info-button").click();
  const panel = page.getByTestId("sheet-info");
  await expect(panel).toBeVisible();
  const p = (await panel.boundingBox())!;
  expect(p.width).toBe(360);
  const player = (await page.getByTestId("player").boundingBox())!;
  expect(player.x + player.width - (p.x + p.width)).toBe(8);
  // beside the picture, not over it: not modal, and the player's own buttons stay reachable
  await expect(panel.getByRole("dialog")).not.toHaveAttribute("aria-modal", "true");
  await shot(page, "desktop-player-info");
});
