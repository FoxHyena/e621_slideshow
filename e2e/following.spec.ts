import { expect, test, type Page } from "@playwright/test";
import { mockE621, type MockPostSpec } from "./mock";

/**
 * Following (UX §5): the tags you follow, newest first. New is above e621's seen marker as read at
 * the start of the session; runs of 5+ new posts by one artist fold; "You're caught up" sits at the
 * marker; and the marker moves once you're a screen past it, with no filter on and nothing newer.
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

/**
 * 1150 by fox, 1149–1143 by otter (7 in a run: 3 shown, 4 folded), 1142–1141 by fox: 10 new above
 * the marker at 1140. Older posts by fox down to 1001.
 */
function specs(): MockPostSpec[] {
  return Array.from({ length: 150 }, (_, i) => {
    const id = 1150 - i;
    return { id, artist: id <= 1149 && id >= 1143 ? "otter_artist" : "fox_artist" };
  });
}

async function followingSignedIn(page: Page, opts: { lastSeen?: number } = {}) {
  const mock = await mockE621(page, specs());
  mock.subscriptions = ["fox_artist", "otter_artist"];
  mock.lastSeen = opts.lastSeen ?? 1140;
  await signIn(page);
  return mock;
}

const status = (page: Page) => page.getByTestId("following-status");
const ids = (page: Page) => page.getByTestId("post-card").evaluateAll((els) => els.map((e) => Number(e.getAttribute("data-post-id"))));

/** Scroll down until a windowed row is in the DOM, then bring it into view. */
async function reveal(page: Page, testId: string) {
  const el = page.getByTestId(testId).first();
  for (let i = 0; i < 40 && (await el.count()) === 0; i++) {
    await page.mouse.wheel(0, 600);
    await page.waitForTimeout(50);
  }
  await el.scrollIntoViewIfNeeded();
  return el;
}

/** Scroll the divider a screen past the top of the view. */
async function scrollPast(page: Page) {
  await reveal(page, "caught-up");
  await page.evaluate(() => window.scrollBy(0, window.innerHeight + 200));
}

test("signed out, Following says what it's for, and shows what's popular", async ({ page }) => {
  const mock = await mockE621(page);
  await page.goto("/following");
  await expect(page.getByTestId("following-signed-out")).toBeVisible();
  await expect(page.getByTestId("post-card").first()).toBeVisible();
  expect(mock.searches[0].tags).toContain("order:rank");
  await shot(page, "following-signed-out");
  await page.getByTestId("following-sign-in").click();
  await expect(page.getByTestId("sheet-sign-in")).toBeVisible();
});

test("following nobody and no favorites: the first run sends you to Search, over what's popular", async ({ page }) => {
  await mockE621(page);
  await signIn(page);
  await page.goto("/following");
  await expect(page.getByTestId("first-run-none")).toBeVisible();
  await expect(page.getByTestId("post-card").first()).toBeVisible();
});

test("new posts are marked New, a long run folds, and the divider sits at e621's marker", async ({ page }) => {
  const mock = await followingSignedIn(page);
  await page.goto("/following");
  await expect(status(page)).toHaveText("10 new since your last visit");
  expect(mock.searches[0].tags).toBe("search:subscriptions");
  expect(mock.searches[0].auth).not.toBeNull();
  await expect(page.getByTestId("play-count")).toHaveText("10");
  await shot(page, "following");
  // 1150, then otter's first three, then "+4".
  const more = await reveal(page, "burst-more");
  await expect(more).toHaveText("4 more from otter artist");
  await expect.poll(() => ids(page)).toEqual(expect.arrayContaining([1150, 1149, 1148, 1147, 1142]));
  expect(await ids(page)).not.toContain(1146);
  await expect(page.locator('[data-post-id="1150"] [data-testid=card-new]')).toBeVisible();

  await more.click();
  await expect(page.locator('[data-post-id="1146"]')).toBeVisible();
  await expect(more).toHaveCount(0);
  await expect(await reveal(page, "caught-up")).toContainText("You’re caught up");
  await expect(page.locator('[data-post-id="1140"] [data-testid=card-new]')).toHaveCount(0);
  // the app mark is the hexagon with Play, and it pops once as it comes into view
  const mark = page.getByTestId("caught-up").getByTestId("app-mark");
  await expect(mark).toHaveAttribute("data-pop", "");
  expect(await mark.evaluate((m) => [m.querySelectorAll("clipPath").length, getComputedStyle(m.querySelector("svg")!).borderRadius])).toEqual([2, "0px"]);
  await shot(page, "following-caught-up");
  // only the first time: scrolled far away (the row unmounts) and back, it stays still
  const at = await page.evaluate(() => window.scrollY);
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await expect(page.getByTestId("caught-up")).toHaveCount(0);
  await page.evaluate((y) => window.scrollTo(0, y), at);
  await expect(page.getByTestId("caught-up")).toBeVisible();
  await page.waitForTimeout(400);
  await expect(page.getByTestId("caught-up").getByTestId("app-mark")).not.toHaveAttribute("data-pop");
});

test("a grid tile of a post folded into \"+N more\" opens the run and lands on it", async ({ page }) => {
  await followingSignedIn(page);
  await page.goto("/following");
  await page.getByTestId("grid-toggle").click();
  const tile = page.locator('[data-testid=grid-tile][data-post-id="1145"]');
  await expect(tile).toBeVisible();
  await tile.click();
  const card = page.locator('[data-testid=post-card][data-post-id="1145"]');
  await expect(card).toBeInViewport();
  expect((await card.boundingBox())!.y).toBeLessThan(40);
});

test("a screen past the divider, at rest, marks seen on e621; the dots stay for the session", async ({ page }) => {
  const mock = await followingSignedIn(page);
  await page.goto("/following");
  await expect(status(page)).toHaveText("10 new since your last visit");
  await scrollPast(page);
  await expect.poll(() => mock.visits).toBe(1);
  await expect(page.getByText("Marked as seen on e621").first()).toBeVisible();
  // The check for anything newer came first, with the feed's own search.
  expect(mock.searches.some((s) => s.tags === "search:subscriptions id:>1150")).toBe(true);
  expect(mock.lastSeen).toBe(1150);
  await expect(status(page)).toHaveText("10 new since your last visit");
  // A later session starts from the new marker.
  await page.reload();
  await expect(status(page)).toHaveText("All caught up");
});

test("a reload before marking shows the same dots, even if e621's marker moved meanwhile", async ({ page }) => {
  const mock = await followingSignedIn(page);
  await page.goto("/following");
  await expect(status(page)).toHaveText("10 new since your last visit");
  mock.lastSeen = 1148;
  await page.reload();
  await expect(status(page)).toHaveText("10 new since your last visit");
});

test("with a filter on, scrolling past doesn't mark seen", async ({ page }) => {
  const mock = await followingSignedIn(page);
  await page.goto("/following");
  await page.getByTestId("chip-hide-faved").click();
  await expect.poll(() => mock.searches.some((s) => s.tags.includes("-fav:tester"))).toBe(true);
  await expect(status(page)).toHaveText("10 new since your last visit");
  await scrollPast(page);
  await page.waitForTimeout(2500);
  expect(mock.visits).toBe(0);
});

test("newer posts on e621 hold the mark and offer the new-posts pill", async ({ page }) => {
  const mock = await followingSignedIn(page);
  await page.goto("/following");
  await expect(status(page)).toHaveText("10 new since your last visit");
  mock.setPosts([{ id: 1151, artist: "fox_artist" }, ...specs()]);
  await scrollPast(page);
  await expect(page.getByTestId("new-posts-pill")).toBeVisible();
  expect(mock.visits).toBe(0);
  await page.getByTestId("new-posts-pill").click();
  await expect(status(page)).toHaveText("11 new since your last visit");
  await expect.poll(() => ids(page)).toContain(1151);
});

test("⋯ › Mark all as seen asks first, then marks with a filter on", async ({ page }) => {
  const mock = await followingSignedIn(page);
  await page.goto("/following");
  await page.getByTestId("chip-hide-faved").click();
  await expect(status(page)).toHaveText("10 new since your last visit");
  await page.getByTestId("following-more").click();
  await page.getByTestId("following-mark-all").click();
  await expect(page.getByTestId("sheet-mark-all")).toContainText("Mark 10 new posts as seen on e621? This can’t be undone.");
  await shot(page, "following-mark-all");
  await page.getByTestId("mark-all-confirm").click();
  await expect.poll(() => mock.visits).toBe(1);
  await expect(page.getByText("Marked as seen on e621").first()).toBeVisible();
});

test("when e621's marker doesn't move, the mark is kept on this device", async ({ page }) => {
  const mock = await followingSignedIn(page);
  mock.visitMoves = false;
  await page.goto("/following");
  await expect(status(page)).toHaveText("10 new since your last visit");
  await scrollPast(page);
  await expect(page.getByText("Marked as seen on this device. e621 didn't take it.")).toBeVisible();
  await page.reload();
  await expect(status(page)).toHaveText("All caught up");
});

test("playing past the last new post marks seen", async ({ page }) => {
  const mock = await followingSignedIn(page, { lastSeen: 1148 });
  await page.goto("/following");
  await expect(status(page)).toHaveText("2 new since your last visit");
  await page.getByTestId("play-fab").click();
  await expect(page.getByTestId("player")).toHaveAttribute("data-post-id", "1150");
  await page.keyboard.press("ArrowRight");
  await page.keyboard.press("ArrowRight");
  await expect(page.getByTestId("player")).toHaveAttribute("data-post-id", "1148");
  await expect.poll(() => mock.visits).toBe(1);
});

test("⋯ › Refresh starts the feed again from the top, not the place kept for it", async ({ page }) => {
  const mock = await followingSignedIn(page);
  await page.goto("/following");
  await expect(status(page)).toHaveText("10 new since your last visit");
  await page.mouse.wheel(0, 3000);
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(2000);
  await page.waitForTimeout(500); // the place is saved once scrolling rests
  const before = mock.searches.length;
  await page.getByTestId("following-more").click();
  await page.getByTestId("following-refresh").click();
  await expect.poll(() => mock.searches.length).toBeGreaterThan(before);
  await expect(page.locator('[data-post-id="1150"]')).toBeVisible();
  await page.waitForTimeout(500);
  expect(await page.evaluate(() => window.scrollY)).toBeLessThan(50);
});

test("a share link's borrowed sign-in never reads or moves the owner's marker", async ({ page }) => {
  const mock = await followingSignedIn(page);
  await page.addInitScript(() => localStorage.removeItem("e6ss:v1:creds"));
  const touched: string[] = [];
  page.on("request", (r) => {
    if (/\/(saved_searches|tag_subscriptions)/.test(r.url())) touched.push(r.url());
  });
  await page.goto("/#u=tester&k=goodkey");
  await expect(page.getByTestId("following-signed-out")).toBeVisible();
  await expect(page.getByTestId("post-card").first()).toBeVisible();
  await page.waitForTimeout(500);
  expect(touched).toEqual([]);
  expect(mock.visits).toBe(0);
});

test("opening an old post straight away isn't playing past the new ones", async ({ page }) => {
  const mock = await followingSignedIn(page, { lastSeen: 1148 });
  await page.goto("/following");
  await expect(status(page)).toHaveText("2 new since your last visit");
  // The first old post, opened without scrolling (scrolling past the divider would mark by rule 1).
  await page.locator('[data-post-id="1148"] [data-testid=card-media]').dispatchEvent("click");
  await expect(page.getByTestId("player")).toHaveAttribute("data-post-id", "1148");
  await page.keyboard.press("ArrowRight");
  await expect(page.getByTestId("player")).toHaveAttribute("data-post-id", "1147");
  await page.waitForTimeout(2000);
  expect(mock.visits).toBe(0);
});

const tab = (page: Page, name: string) => page.getByRole("navigation", { name: "Tabs" }).getByRole("link", { name, exact: true });

test("coming back to Following counts newer posts in the pill, and they go in only on a tap", async ({ page }) => {
  const mock = await followingSignedIn(page);
  await page.goto("/following");
  await expect(status(page)).toHaveText("10 new since your last visit");
  mock.setPosts([{ id: 1152, artist: "fox_artist" }, { id: 1151, artist: "fox_artist" }, ...specs()]);
  await tab(page, "For You").click();
  await tab(page, "Following").click();
  await expect(page.getByTestId("new-posts-pill")).toHaveText("2 new posts");
  expect(mock.searches.some((s) => s.tags === "search:subscriptions id:>1150" && s.limit === 30)).toBe(true);
  // Nothing went in on its own.
  expect((await ids(page))[0]).toBe(1150);
  await page.getByTestId("new-posts-pill").click();
  await expect.poll(async () => (await ids(page))[0]).toBe(1152);
  await expect(page.getByTestId("new-posts-pill")).toHaveCount(0);
});

test("with Remember, a reload is signed in and painted before e621 confirms the sign-in", async ({ page }) => {
  const mock = await followingSignedIn(page);
  await page.goto("/following");
  await expect(status(page)).toHaveText("10 new since your last visit");
  await expect(page.locator('[data-post-id="1150"]')).toBeVisible();
  mock.meDelay = 5000;
  await page.reload();
  await expect(page.locator('[data-post-id="1150"]')).toBeVisible({ timeout: 1500 });
  await expect(status(page)).toHaveText("10 new since your last visit");
});

test("a key e621 refuses on reload signs the saved account out", async ({ page }) => {
  await followingSignedIn(page);
  await page.goto("/following");
  await expect(status(page)).toHaveText("10 new since your last visit");
  await page.evaluate(() => localStorage.setItem("e6ss:v1:creds", JSON.stringify({ username: "tester", apiKey: "revoked" })));
  await page.reload();
  await expect(page.getByText(/e621 sign-in failed/)).toBeVisible();
  await expect(page.getByTestId("following-signed-out")).toBeVisible();
  expect(await page.evaluate(() => localStorage.getItem("e6ss:v1:account:tester"))).toBeNull();
});

test("a reload paints the first posts saved last time before e621 answers, then offers what's newer", async ({ page }) => {
  const mock = await followingSignedIn(page);
  await page.goto("/following");
  await expect(status(page)).toHaveText("10 new since your last visit");
  await expect(page.locator('[data-post-id="1150"]')).toBeVisible();
  const before = mock.searches.length;
  // e621 is slow to answer the feed's first page now, and one more post came in.
  mock.setPosts([{ id: 1151, artist: "fox_artist" }, ...specs()]);
  mock.searchDelay = (tags, p) => (tags === "search:subscriptions" && p === 1 ? 5000 : 0);
  await page.reload();
  await expect(page.locator('[data-post-id="1150"]')).toBeVisible({ timeout: 1500 });
  await expect(status(page)).toHaveText("10 new since your last visit");
  // Revalidated behind the pill, not shifted in.
  await expect(page.getByTestId("new-posts-pill")).toHaveText("1 new post");
  expect((await ids(page))[0]).toBe(1150);
  // No first page asked for: paging goes on below the saved posts.
  expect(mock.searches.slice(before).some((s) => s.tags === "search:subscriptions" && s.page === null)).toBe(false);
});

test.describe("pull to refresh", () => {
  test.use({ viewport: { width: 375, height: 812 }, hasTouch: true });

  /** One finger from (x, 200) down by `dy`, in steps, then let go. */
  async function pull(page: Page, dy: number, dx = 0) {
    await page.evaluate(
      async ([dy, dx]) => {
        const t = (y: number, x = 180) => new Touch({ identifier: 1, target: document.body, clientX: x, clientY: y });
        const fire = (type: string, touches: Touch[]) =>
          document.body.dispatchEvent(new TouchEvent(type, { touches, changedTouches: touches, bubbles: true, cancelable: true }));
        fire("touchstart", [t(200)]);
        for (let i = 1; i <= 10; i++) {
          fire("touchmove", [t(200 + (dy * i) / 10, 180 + (dx * i) / 10)]);
          await new Promise((r) => requestAnimationFrame(r));
        }
        fire("touchend", []);
      },
      [dy, dx],
    );
  }

  test("a pull past 144 px refreshes Following from the top; a short or sideways one does nothing", async ({ page }) => {
    const mock = await followingSignedIn(page);
    await page.goto("/following");
    await expect(status(page)).toHaveText("10 new since your last visit");
    mock.setPosts([{ id: 1151, artist: "fox_artist" }, ...specs()]);
    const firstPages = () => mock.searches.filter((s) => s.tags === "search:subscriptions").length;
    const n = firstPages();
    await pull(page, 100);
    await pull(page, 200, 300);
    await page.waitForTimeout(300);
    expect(firstPages()).toBe(n);
    await pull(page, 200);
    await expect(page.getByTestId("ptr")).toHaveAttribute("data-busy", "true");
    await expect.poll(firstPages).toBe(n + 1);
    await expect.poll(async () => (await ids(page))[0]).toBe(1151);
    await expect(page.getByTestId("ptr")).not.toHaveAttribute("data-busy", "true");
  });

  test("a pull that starts below the top of the page does nothing", async ({ page }) => {
    const mock = await followingSignedIn(page);
    await page.goto("/following");
    await expect(status(page)).toHaveText("10 new since your last visit");
    await page.evaluate(() => window.scrollTo(0, 300));
    const n = mock.searches.length;
    await pull(page, 250);
    await page.waitForTimeout(500);
    expect(mock.searches.length).toBe(n);
    await expect(page.getByTestId("ptr")).not.toHaveAttribute("data-busy", "true");
  });
});

test("the saved first posts keep a heart given since, so a reload shows it filled", async ({ page }) => {
  await followingSignedIn(page);
  await page.goto("/following");
  const heart = page.locator('[data-post-id="1150"] [data-testid=card-fav]');
  await heart.click();
  await expect(heart).toHaveAttribute("aria-pressed", "true");
  await page.waitForTimeout(300);
  await page.reload();
  await expect(page.locator('[data-post-id="1150"] [data-testid=card-fav]')).toHaveAttribute("aria-pressed", "true");
});
