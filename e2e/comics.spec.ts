import { expect, test, type Page } from "@playwright/test";
import { defaultSpecs, mockE621, type E621Mock, type MockPostSpec } from "./mock";

/**
 * DESIGN.md "A post on its own", "A comic": an e621 pool of the series kind, its pages in the pool's
 * order. A card says "3 / 5"; the viewer turns pages with a drag (or the arrow keys and two glass
 * buttons on a computer) and opens the Pages sheet; the post page has the comic's group; "Open as a
 * feed" is the comic in page order.
 */

const SHOTS = process.env.E6_SHOTS;
const shot = async (page: Page, name: string) => {
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/${name}.png`, fullPage: false, animations: "disabled" });
};
/** the pool's pages, out of id order on purpose: page order is the pool's */
const PAGES = [2003, 2001, 2005, 2002, 2004];
const viewer = (page: Page) => page.getByTestId("viewer");

let mock: E621Mock;
test.beforeEach(async ({ page }) => {
  // page 4 has a tag a test puts on the blacklist
  const comic: MockPostSpec[] = PAGES.map((id) => ({ id, pools: [77], artist: "mossy_otter", tags: id === 2002 ? ["solo", "badtag"] : undefined }));
  // a collection isn't a comic: no well
  const collected: MockPostSpec = { id: 2010, pools: [88] };
  mock = await mockE621(page, [collected, ...comic.sort((a, b) => b.id - a.id), ...defaultSpecs()]);
  mock.pools = [
    { id: 77, name: "Riverbank_Tales", post_ids: PAGES },
    { id: 88, name: "Favourite_wolves", category: "collection", post_ids: [2010, 1150] },
  ];
});

/** A sideways drag across the viewer's picture, as a finger would (a mouse turns pages too). */
async function drag(page: Page, dx: number) {
  const box = (await page.getByTestId("viewer-stage").boundingBox())!;
  const y = box.y + box.height / 2;
  const x = box.x + box.width / 2;
  await page.mouse.move(x, y);
  await page.mouse.down();
  for (let i = 1; i <= 8; i++) await page.mouse.move(x + (dx * i) / 8, y);
  await page.mouse.up();
}

test.describe("on a phone", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("a card that is a comic's page says so; the well opens the viewer on that page", async ({ page }) => {
    await page.goto("/search?tags=wolf");
    const card = page.locator('[data-testid=post-card][data-post-id="2005"]');
    const well = card.getByTestId("card-comic");
    await expect(well).toHaveText("3 / 5");
    await expect(well).toHaveAccessibleName("Riverbank Tales, page 3 of 5");
    // the well stands 8 after Copy link, at the footer's left
    const copy = (await card.getByTestId("card-copy").boundingBox())!;
    const w = (await well.boundingBox())!;
    expect(Math.round(w.x - (copy.x + copy.width))).toBe(8);
    // every card's pools asked of e621 together
    expect(mock.poolLookups.length).toBe(1);
    expect(mock.poolLookups[0].sort()).toEqual([77, 88]);
    // a collection's post has no well
    await expect(page.locator('[data-testid=post-card][data-post-id="2010"]').getByTestId("card-comic")).toHaveCount(0);
    await well.scrollIntoViewIfNeeded();
    await shot(page, "comic-card");

    await well.click();
    await expect(page).toHaveURL(/view=2005/);
    await expect(viewer(page).getByTestId("viewer-count")).toHaveText("3 / 5");
    const bar = viewer(page).getByTestId("viewer-comic");
    await expect(bar).toContainText("Riverbank Tales");
    await expect(bar).toContainText("Page 3 of 5");
    // the bar sits above the artist's row
    const b = (await bar.boundingBox())!;
    const who = (await viewer(page).getByTestId("viewer-artist").boundingBox())!;
    expect(b.y + b.height).toBeLessThanOrEqual(who.y);
    expect(b.height).toBe(44);
    // a phone drags: no glass buttons at the sides
    await expect(viewer(page).getByTestId("viewer-next")).toBeHidden();
    await shot(page, "comic-viewer");
  });

  test("a sideways drag turns the page; the first and last pages hold", async ({ page }) => {
    await page.goto("/search?tags=wolf&view=2005");
    await expect(viewer(page).getByTestId("viewer-count")).toHaveText("3 / 5");
    // turns wait for the pages (a blacklisted one is turned past)
    await expect(viewer(page)).toHaveAttribute("data-pages", "");
    await drag(page, -200);
    await expect(viewer(page)).toHaveAttribute("data-post-id", "2002");
    await expect(viewer(page).getByTestId("viewer-count")).toHaveText("4 / 5");
    await expect(page).toHaveURL(/view=2002/);
    await drag(page, -200);
    await expect(viewer(page)).toHaveAttribute("data-post-id", "2004");
    // the last page: a drag on holds back and lands where it was
    await drag(page, -200);
    await page.waitForTimeout(500);
    await expect(viewer(page)).toHaveAttribute("data-post-id", "2004");
    await drag(page, 200);
    await expect(viewer(page)).toHaveAttribute("data-post-id", "2002");
    // a short drag doesn't turn
    await drag(page, -30);
    await page.waitForTimeout(500);
    await expect(viewer(page)).toHaveAttribute("data-post-id", "2002");
    // turning replaced the page: one Back closes the viewer
    await page.goBack();
    await expect(viewer(page)).toHaveCount(0);
    await expect(page).toHaveURL(/\/search\?tags=wolf$/);
  });

  test("the comic bar opens the Pages sheet; a thumb turns to it, Open as a feed shows the comic in page order", async ({ page }) => {
    await page.goto("/search?tags=wolf&view=2005");
    await viewer(page).getByTestId("viewer-comic").click();
    const sheet = page.getByTestId("sheet-pages");
    await expect(sheet.getByRole("heading", { name: "Riverbank Tales" })).toBeVisible();
    await expect(sheet).toContainText("A comic by mossy otter · 5 pages");
    const thumbs = sheet.getByTestId("pages-thumb");
    await expect(thumbs).toHaveCount(5);
    await expect(thumbs.nth(2)).toHaveAttribute("aria-current", "page");
    await expect(thumbs.nth(0)).toHaveText("1");
    await expect(thumbs.nth(0).locator("img")).toHaveAttribute("src", /\/2003\./);
    await shot(page, "comic-pages");
    await thumbs.nth(0).click();
    await expect(sheet).toHaveCount(0);
    await expect(viewer(page)).toHaveAttribute("data-post-id", "2003");
    await expect(viewer(page).getByTestId("viewer-count")).toHaveText("1 / 5");

    await viewer(page).getByTestId("viewer-comic").click();
    await page.getByTestId("pages-feed").click();
    await expect(page).toHaveURL(/\/search\?tags=pool%3A77$/);
    await expect(viewer(page)).toHaveCount(0);
    // (the search it came from is still there, hidden)
    const ids = page.locator("[data-testid=post-card]").filter({ visible: true });
    await expect(ids).toHaveCount(5);
    expect(await ids.evaluateAll((els) => els.map((e) => Number(e.getAttribute("data-post-id"))))).toEqual(PAGES);
    // the pill names the comic; "pool:77" isn't kept in Recent searches
    await expect(page.getByTestId("query-pill").filter({ visible: true })).toHaveText("Riverbank Tales");
    const history = await page.evaluate(() => localStorage.getItem("e6ss:v1:history") ?? "");
    expect(history).not.toContain("pool:");
  });

  test("the post page has the comic: its name and page, and a strip of every page", async ({ page }) => {
    await page.goto("/post/2005");
    const group = page.getByTestId("post-comic");
    await expect(group.getByTestId("post-comic-open")).toContainText("Riverbank Tales");
    await expect(group.getByTestId("post-comic-open")).toContainText("Page 3 of 5");
    const thumbs = group.getByTestId("comic-thumb");
    await expect(thumbs).toHaveCount(5);
    await expect(thumbs.nth(2)).toHaveAttribute("aria-current", "page");
    // right after the post, before the tags panel
    const g = (await group.boundingBox())!;
    const card = (await page.getByTestId("post-card").boundingBox())!;
    expect(g.y).toBeGreaterThan(card.y + card.height);
    expect(g.width).toBe(358);
    expect((await thumbs.nth(0).boundingBox())!.width).toBe(56);
    await group.scrollIntoViewIfNeeded();
    // the thumbs come in on screen, not behind the page's other asks
    await expect(thumbs.nth(2).locator("img")).toBeVisible({ timeout: 2000 });
    await shot(page, "comic-post-page");
    await thumbs.nth(0).click();
    await expect(page).toHaveURL(/\/post\/2003$/);
    // (the page it came from is still there, hidden)
    const shown = page.getByTestId("post-comic").filter({ visible: true });
    await expect(shown.getByTestId("comic-thumb").nth(0)).toHaveAttribute("aria-current", "page");
    await shown.getByTestId("post-comic-open").click();
    await expect(page).toHaveURL(/\/search\?tags=pool%3A77$/);
  });
});

test("on a computer: two glass buttons and the arrow keys turn the page", async ({ page }) => {
  await page.goto("/search?tags=wolf&view=2005");
  const next = viewer(page).getByTestId("viewer-next");
  const prev = viewer(page).getByTestId("viewer-prev");
  await expect(next).toBeVisible();
  await next.click();
  await expect(viewer(page)).toHaveAttribute("data-post-id", "2002");
  await page.keyboard.press("ArrowRight");
  await expect(viewer(page)).toHaveAttribute("data-post-id", "2004");
  await expect(viewer(page).getByTestId("viewer-next")).toBeDisabled();
  for (const id of ["2002", "2005", "2001"]) {
    await page.keyboard.press("ArrowLeft");
    await expect(viewer(page)).toHaveAttribute("data-post-id", id);
  }
  await prev.click();
  await expect(viewer(page)).toHaveAttribute("data-post-id", "2003");
  await expect(viewer(page).getByTestId("viewer-prev")).toBeDisabled();
  // the turned-to page slides all the way in (it once stayed off to the side)
  await expect(viewer(page).getByTestId("viewer-pic")).toHaveCSS("transform", "matrix(1, 0, 0, 1, 0, 0)");
  await shot(page, "comic-viewer-desktop");
});

test("a page turn doesn't open the viewer again: no fade over the feed", async ({ page }) => {
  // every time the viewer's open (a fade and a rise) starts
  await page.addInitScript(() => {
    const w = window as Window & { opens?: number };
    w.opens = 0;
    document.addEventListener("animationstart", (e) => e.animationName === "player-in" && w.opens!++, true);
  });
  const opens = () => page.evaluate(() => (window as Window & { opens?: number }).opens);
  await page.goto("/search?tags=wolf&view=2005");
  await expect(viewer(page)).toHaveAttribute("data-pages", "");
  await expect.poll(opens).toBe(1);
  for (const key of ["ArrowRight", "ArrowLeft"]) {
    const was = await viewer(page).getAttribute("data-post-id");
    await page.keyboard.press(key);
    await expect(viewer(page)).not.toHaveAttribute("data-post-id", was!);
  }
  // the turned-to pages didn't play it again (it once flashed the feed through, then rose in)
  await page.waitForTimeout(300);
  expect(await opens()).toBe(1);
});

test("buttons hidden with a tap stay hidden from page to page", async ({ page }) => {
  await page.goto("/search?tags=wolf&view=2005");
  await expect(viewer(page)).toHaveAttribute("data-pages", "");
  await page.getByTestId("viewer-stage").click();
  await expect(viewer(page).getByTestId("controls")).toHaveAttribute("data-visible", "false");
  await page.keyboard.press("ArrowRight");
  await expect(viewer(page)).toHaveAttribute("data-post-id", "2002");
  await expect(viewer(page).getByTestId("controls")).toHaveAttribute("data-visible", "false");
});

test("a page on your blacklist is turned past, and its picture isn't fetched ahead", async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("e6ss:v1:search", JSON.stringify({ blacklist: "badtag" })));
  const asked: string[] = [];
  page.on("request", (r) => r.url().includes("/data/sample/mock/") && asked.push(r.url()));
  await page.goto("/search?tags=wolf&view=2005");
  await expect(viewer(page).getByTestId("viewer-count")).toHaveText("3 / 5");
  // page 4 (2002) is blacklisted: on from page 3 is page 5
  await expect(viewer(page).getByTestId("viewer-next")).toBeEnabled();
  await page.keyboard.press("ArrowRight");
  await expect(viewer(page)).toHaveAttribute("data-post-id", "2004");
  await expect(viewer(page).getByTestId("viewer-count")).toHaveText("5 / 5");
  await page.keyboard.press("ArrowLeft");
  await expect(viewer(page)).toHaveAttribute("data-post-id", "2005");
  expect(asked.some((u) => u.includes("/2002."))).toBe(false);
});

test("closing the viewer while a page turns leaves the feed where it was", async ({ page }) => {
  await page.goto("/search?tags=wolf");
  await page.goto("/search?tags=wolf&view=2005");
  await expect(viewer(page)).toHaveAttribute("data-pages", "");
  await page.keyboard.press("ArrowRight");
  await page.keyboard.press("Escape");
  await expect(viewer(page)).toBeHidden();
  // the turn's end (320 ms on) doesn't turn the feed underneath into a viewer
  await page.waitForTimeout(600);
  await expect(page).toHaveURL(/\/search\?tags=wolf$/);
  await expect(viewer(page)).toBeHidden();
});
