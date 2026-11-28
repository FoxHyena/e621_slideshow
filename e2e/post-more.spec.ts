import { expect, test, type Page } from "@playwright/test";
import { defaultSpecs, mockE621 } from "./mock";

/**
 * DESIGN.md, the design commit 3507b7d ("On a post", owner: "Commit and send"): the post's bar, Post
 * info's description, Copy link, For You's marked tags, and a screen's ⋯ menu as a dropdown.
 */

const LONG = Array.from({ length: 9 }, (_, i) => `Line ${i + 1} of a long description that goes on.`).join("\n\n");
const POSTS = [
  { id: 1149, description: LONG, tags: ["river"] },
  { id: 1148, description: "Short and sweet.", tags: ["river"] },
];

const signIn = (page: Page) =>
  page.addInitScript(() => {
    if (sessionStorage.getItem("seeded")) return;
    sessionStorage.setItem("seeded", "1");
    localStorage.setItem("e6ss:v1:creds", JSON.stringify({ username: "tester", apiKey: "goodkey" }));
  });

/** For You's profile: 10 favorites tagged `pawpads` and `toebeans`; post 1050 has both. */
async function forYou(page: Page) {
  const specs = defaultSpecs().map((s) => (s.id === 1050 ? { ...s, tags: ["solo", "toebeans", "pawpads"] } : s));
  const mock = await mockE621(page, specs);
  mock.setFavorites(Array.from({ length: 10 }, (_, i) => ({ id: 2000 + i, tags: ["pawpads", "toebeans", "solo"] })));
  mock.tagCounts = { pawpads: 5, toebeans: 5 };
  await signIn(page);
  await page.goto("/for-you");
  await expect(page.getByTestId("post-card").first()).toBeVisible({ timeout: 15_000 });
  return mock;
}

test.describe("on a phone", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("the bar: the name's target is 28 tall from the panel's top and at least 44 wide; the rest opens the post, but not on its own page", async ({
    page,
  }) => {
    await mockE621(page, POSTS);
    await page.goto("/search?tags=wolf");
    const card = page.locator('[data-testid=post-card][data-post-id="1149"]');
    await expect(card).toBeVisible();
    const m = await card.evaluate((c) => {
      const name = c.querySelector(".post-artist")!;
      const t = getComputedStyle(name, "::before");
      const panel = c.getBoundingClientRect();
      const n = name.getBoundingClientRect();
      return { h: parseFloat(t.height), w: parseFloat(t.width), top: Math.round(n.top + parseFloat(t.top) - panel.top), textW: n.width };
    });
    expect(m.h).toBe(28);
    expect(m.w).toBeGreaterThanOrEqual(Math.max(44, m.textW + 12) - 0.5);
    expect(Math.abs(m.top)).toBe(0);
    // the time and number line opens the post
    await card.locator(".post-when").click({ force: true }); // through the bar's own button, which lies over it
    await expect(page).toHaveURL(/\/post\/1149$/);
    // on its own page the bar's post part does nothing (no button); the name still opens the artist
    await expect(page.getByTestId("post-page").getByTestId("card-open")).toHaveCount(0);
    await expect(page.getByTestId("post-page").getByTestId("card-artist")).toBeVisible();
  });

  test("Post info's description stops at 4 lines; Show all opens the rest and goes away; a short one has none", async ({ page }) => {
    await mockE621(page, POSTS);
    await page.goto("/search?tags=wolf&view=1149");
    await expect(page.getByTestId("viewer")).toHaveAttribute("data-post-id", "1149");
    await page.keyboard.press("i");
    const sheet = page.getByTestId("sheet-info");
    const desc = sheet.getByTestId("info-desc");
    await expect(desc).toBeVisible();
    // 4 lines (here 4 one-line paragraphs, 8 apart): the 5th is cut off
    const shown = () =>
      desc.evaluate((d) => {
        const b = d.getBoundingClientRect();
        return [...d.querySelectorAll("p")].filter((p) => p.getBoundingClientRect().bottom <= b.bottom + 0.5).length;
      });
    expect(await shown()).toBe(4);
    const more = sheet.getByTestId("info-desc-more");
    await expect(more).toHaveText("Show all");
    const gap = await more.evaluate((b) => Math.round(b.getBoundingClientRect().top - b.previousElementSibling!.getBoundingClientRect().bottom));
    expect(gap).toBe(4);
    expect((await more.boundingBox())!.height).toBe(28);
    await more.click();
    await expect(more).toHaveCount(0);
    expect(await shown()).toBe(9);

    await page.goto("/search?tags=wolf&view=1148");
    await expect(page.getByTestId("viewer")).toHaveAttribute("data-post-id", "1148");
    await page.keyboard.press("i");
    await expect(page.getByTestId("sheet-info").getByTestId("info-desc")).toHaveText("Short and sweet.");
    await expect(page.getByTestId("sheet-info").getByTestId("info-desc-more")).toHaveCount(0);
  });

  test('Copy link: a 36 by 28 well at the footer\'s left copies /post/<id>, a green check for 1.4 s and "Link copied"', async ({ page, context }) => {
    await context.grantPermissions(["clipboard-read", "clipboard-write"]);
    await mockE621(page, POSTS);
    await page.goto("/search?tags=wolf");
    const card = page.locator('[data-testid=post-card][data-post-id="1149"]');
    const copy = card.getByTestId("card-copy");
    await expect(copy).toHaveAccessibleName("Copy link");
    const box = (await copy.boundingBox())!;
    const foot = (await card.locator(".post-foot").boundingBox())!;
    expect([box.width, box.height]).toEqual([36, 28]);
    expect(Math.round(box.x - foot.x)).toBe(0);
    await copy.click();
    await expect(page.getByText("Link copied")).toBeVisible();
    await expect(copy).toHaveAttribute("data-done", "true");
    expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(`${new URL(page.url()).origin}/post/1149`);
    await expect(copy).not.toHaveAttribute("data-done", "true", { timeout: 2500 });
  });

  test("Copy link that can't copy says so", async ({ page }) => {
    await page.addInitScript(() => {
      Object.defineProperty(navigator, "clipboard", { value: { writeText: () => Promise.reject(new Error("blocked")) } });
    });
    await mockE621(page, POSTS);
    await page.goto("/search?tags=wolf");
    await page.locator('[data-testid=post-card][data-post-id="1149"]').getByTestId("card-copy").click();
    await expect(page.getByText("Couldn't copy the link")).toBeVisible();
  });

  test("For You marks the tags it picked a post for: first in the row, a spark 8 in and 4 before the word; no other feed does", async ({ page }) => {
    await forYou(page);
    const card = page.locator('[data-testid=post-card][data-post-id="1050"]');
    await expect(card).toBeVisible();
    const tags = card.getByTestId("card-tag");
    const marked = card.locator("[data-testid=card-tag][data-marked]");
    await expect(marked).toHaveCount(2);
    expect(await tags.evaluateAll((els) => els.slice(0, 2).map((e) => e.getAttribute("data-tag")))).toEqual(
      await marked.evaluateAll((els) => els.map((e) => e.getAttribute("data-tag"))),
    );
    expect((await marked.evaluateAll((els) => els.map((e) => e.getAttribute("data-tag")))).sort()).toEqual(["pawpads", "toebeans"]);
    await expect(marked.first()).toHaveAccessibleName(/, For You picked this$/);
    const g = await marked.first().evaluate((t) => {
      const s = t.querySelector(".post-tag-spark")!.getBoundingClientRect();
      const r = document.createRange();
      r.selectNodeContents(t.lastChild!);
      return { left: Math.round(s.left - t.getBoundingClientRect().left), gap: Math.round(r.getBoundingClientRect().left - s.right), w: s.width };
    });
    expect(g).toEqual({ left: 8, gap: 4, w: 12 });

    await page.goto("/search?tags=wolf");
    await expect(page.getByTestId("post-card").first()).toBeVisible();
    await expect(page.locator("[data-testid=card-tag][data-marked]")).toHaveCount(0);
  });
});

for (const w of [390, 1280])
  test(`a screen's ⋯ menu is a 260 dropdown hung 8 under the tools capsule, right edges lined up, rows 56 (${w} wide)`, async ({ page }) => {
    await page.setViewportSize({ width: w, height: 844 });
    await forYou(page);
    const more = page.getByTestId("for-you-more");
    const cap = (await page.locator(".tools").filter({ has: more }).boundingBox())!;
    await more.click();
    const menu = page.getByTestId("sheet-for-you-menu");
    const drop = menu.locator(".drop");
    await expect(drop).toBeVisible();
    await page.waitForTimeout(300);
    const box = (await drop.boundingBox())!;
    expect(box.width).toBe(260);
    expect(Math.round(box.y - (cap.y + cap.height))).toBe(8);
    expect(Math.round(box.x + box.width - (cap.x + cap.width))).toBe(0);
    await expect(menu.getByRole("heading")).toHaveCount(0);
    expect((await menu.getByTestId("for-you-refresh").boundingBox())!.height).toBe(56);
    await page.keyboard.press("Escape");
    await expect(menu).toHaveCount(0);
  });

test("on a computer a post's ⋯ popover lines up right edges with the ⋯", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 844 });
  await mockE621(page, POSTS);
  await page.goto("/search?tags=wolf");
  const dots = page.locator('[data-testid=post-card][data-post-id="1149"]').getByTestId("card-menu");
  const at = (await dots.boundingBox())!;
  await dots.click();
  const pop = page.getByTestId("sheet-post").locator(".sheet");
  await expect(pop).toBeVisible();
  await page.waitForTimeout(300);
  const box = (await pop.boundingBox())!;
  expect(Math.round(box.x + box.width - (at.x + at.width))).toBe(0);
});

test("on a computer, under the pointer the bar's post part turns its time and number line white", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 844 });
  await mockE621(page, POSTS);
  await page.goto("/search?tags=wolf");
  const card = page.locator('[data-testid=post-card][data-post-id="1149"]');
  const when = card.locator(".post-when");
  const before = await when.evaluate((e) => getComputedStyle(e).color);
  await when.hover({ force: true }); // the bar's own button lies over the line
  await expect.poll(() => when.evaluate((e) => getComputedStyle(e).color)).toBe("rgb(255, 255, 255)");
  expect(before).not.toBe("rgb(255, 255, 255)");
});
