import { expect, test, type Page } from "@playwright/test";
import { mockE621, type E621Mock } from "./mock";

/**
 * The shell's navigation over Next 16's patched History API (ENGINEERING.md §1 spike):
 * every URL serves the shell, in-app moves never fetch RSC, every entry keeps Next's
 * `__NA` flag (without it a popstate reloads the page), Back follows UX §3, a reload keeps
 * the place, and a sign-in fragment never stays in a URL.
 */

function watchRsc(page: Page) {
  const hits: string[] = [];
  page.on("request", (r) => {
    const h = r.headers();
    if (h["rsc"] === "1" || r.url().includes("_rsc=")) hits.push(r.url());
  });
  return hits;
}

const entry = (page: Page) =>
  page.evaluate(() => {
    const s = history.state as { __NA?: boolean; e6?: { depth: number; key: string } } | null;
    return { na: s?.__NA === true, e6: s?.e6 ?? null, url: location.pathname + location.search + location.hash };
  });

const heading = (page: Page, name: string) => page.getByRole("heading", { level: 1, name, exact: true });
const tab = (page: Page, name: string) => page.getByRole("navigation", { name: "Tabs" }).getByRole("link", { name, exact: true });

let mock: E621Mock;
test.beforeEach(async ({ page }) => {
  mock = await mockE621(page);
});

test("every route serves the shell and opens its screen", async ({ page }) => {
  const cases: [string, string | null][] = [
    ["/following", "Following"],
    ["/settings/account", null],
    ["/for-you", "For You"],
    ["/for-you/tune", "Tune For You"],
    ["/artists", "Artists"],
    ["/artist/some%20one", "some one"],
    ["/search", "Search"],
    ["/search?tags=wolf", "Search: wolf. Edit"],
    ["/favorites", "Your favorites"],
    ["/settings", "Settings"],
    ["/settings/content", "Content"],
    ["/nope/deeper", "Page not found"],
  ];
  for (const [url, h1] of cases) {
    await page.goto(url);
    if (h1) await expect(heading(page, h1)).toBeVisible();
    else await expect(page.getByTestId("settings-panel")).toHaveAttribute("data-open", "true");
    expect(new URL(page.url()).pathname + new URL(page.url()).search).toBe(url);
    const e = await entry(page);
    expect(e.na, url).toBe(true);
    expect(e.e6, url).not.toBeNull();
  }
});

test("tabs and pushed screens move without RSC requests, and Back/Forward retrace them", async ({ page }) => {
  await page.goto("/following");
  await expect(heading(page, "Following")).toBeVisible();
  const rsc = watchRsc(page);

  await tab(page, "Artists").click();
  await expect(heading(page, "Artists")).toBeVisible();
  await expect(tab(page, "Artists")).toHaveAttribute("aria-current", "page");
  await tab(page, "Settings").click();
  await expect(heading(page, "Settings")).toBeVisible();
  await page.getByRole("link", { name: "Content" }).click();
  await expect(heading(page, "Content")).toBeVisible();
  // A pushed Settings page keeps the Settings tab lit.
  await expect(tab(page, "Settings")).toHaveAttribute("aria-current", "page");
  for (const e of [await entry(page)]) {
    expect(e.na).toBe(true);
    expect(e.e6?.depth).toBe(2);
  }

  await page.goBack();
  await expect(heading(page, "Settings")).toBeVisible();
  expect(page.url()).toMatch(/\/settings$/);
  // Other tabs replace each other: one entry above Following.
  await page.goBack();
  await expect(heading(page, "Following")).toBeVisible();
  expect(page.url()).toMatch(/\/following$/);
  await page.goForward();
  await expect(heading(page, "Settings")).toBeVisible();
  await page.goForward();
  await expect(heading(page, "Content")).toBeVisible();

  // The in-app Back button goes through history too.
  await page.getByRole("button", { name: "Back" }).click();
  await expect(heading(page, "Settings")).toBeVisible();
  await tab(page, "Following").click();
  await expect(heading(page, "Following")).toBeVisible();
  expect(page.url()).toMatch(/\/following$/);

  expect(rsc).toEqual([]);
});

test("a pasted deep link gets the app under it, and a quick double Back lands home", async ({ page }) => {
  await page.goto("/artist/fox?play=3");
  await expect(heading(page, "fox")).toBeVisible();
  expect(await page.evaluate(() => history.length)).toBeGreaterThanOrEqual(3);
  const rsc = watchRsc(page);
  await page.evaluate(() => {
    history.back();
    history.back();
  });
  await expect(page).toHaveURL(/\/following$/);
  await expect(heading(page, "Following")).toBeVisible();
  await page.goForward();
  await expect(page).toHaveURL(/\/artist\/fox$/);
  await expect(heading(page, "fox")).toBeVisible();
  expect((await entry(page)).na).toBe(true);
  expect(rsc).toEqual([]);
});

test("Back on a pasted URL with nothing under it goes to its parent", async ({ page }) => {
  await page.goto("/nope");
  await expect(heading(page, "Page not found")).toBeVisible();
  await page.getByRole("button", { name: "Go to Following" }).click();
  await expect(page).toHaveURL(/\/following$/);
  await expect(heading(page, "Following")).toBeVisible();
});

test("a reload keeps the place and its depth", async ({ page }) => {
  await page.goto("/following");
  await tab(page, "Settings").click();
  await page.getByRole("link", { name: "Slideshow" }).click();
  await expect(heading(page, "Slideshow")).toBeVisible();
  await page.reload();
  await expect(heading(page, "Slideshow")).toBeVisible();
  expect((await entry(page)).e6?.depth).toBe(2);
  await page.getByRole("button", { name: "Back" }).click();
  await expect(heading(page, "Settings")).toBeVisible();
  await page.goBack();
  await expect(page).toHaveURL(/\/following$/);
});

test("focus moves to a pushed screen's heading and comes back to what opened it", async ({ page }) => {
  await page.goto("/settings");
  const row = page.getByRole("link", { name: "Content" });
  await row.focus();
  await page.keyboard.press("Enter");
  await expect(heading(page, "Content")).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(heading(page, "Settings")).toBeVisible();
  await expect(row).toBeFocused();
});

test("a share link's sign-in fragment is gone before the app starts, and is kept in memory", async ({ page }) => {
  // What the page looks like once the HTML is parsed: after the head script, before Next hydrates.
  await page.addInitScript(() => {
    document.addEventListener("DOMContentLoaded", () => {
      (window as unknown as { __seen: string }).__seen = location.href + JSON.stringify(history.state ?? null);
    });
  });
  await page.goto("/#u=tester&k=abcdef123456");
  await expect(heading(page, "Following")).toBeVisible();
  await expect(page).toHaveURL(/\/following$/);
  const seen = await page.evaluate(() => (window as unknown as { __seen: string }).__seen);
  expect(seen).not.toContain("abcdef123456");
  expect(seen).not.toContain("#");
  const leaked = await page.evaluate(
    () => location.href.includes("k=") || JSON.stringify(history.state).includes("abcdef123456"),
  );
  expect(leaked).toBe(false);
  expect(await page.evaluate(() => window.__e6link)).toContain("u=tester");
});

test("Esc goes back on every screen, even after the legacy home has mounted", async ({ page }) => {
  await page.goto("/settings/account");
  await expect(page.getByTestId("settings-panel")).toHaveAttribute("data-open", "true");
  await tab(page, "Settings").click();
  await page.getByRole("link", { name: "Content" }).click();
  await expect(heading(page, "Content")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(heading(page, "Settings")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page).toHaveURL(/\/following$/);
  await expect(heading(page, "Following")).toBeVisible();
  // The hidden legacy home ignored both presses (its Esc would have started a search). Following,
  // signed out, only asks for what's popular.
  expect(mock.searches.filter((s) => !s.tags.includes("order:rank"))).toHaveLength(0);
});

test("Back with nothing of ours underneath goes to the parent", async ({ page }) => {
  await page.goto("/nope");
  await expect(heading(page, "Page not found")).toBeVisible();
  expect((await entry(page)).e6?.depth).toBe(0);
  await page.keyboard.press("Escape");
  await expect(page).toHaveURL(/\/following$/);
  await expect(heading(page, "Following")).toBeVisible();
});

test("an old profile keeps its settings and is stamped with the schema version", async ({ page }) => {
  await page.addInitScript(() => {
    if (localStorage.getItem("e6ss:seeded")) return;
    localStorage.setItem("e6ss:seeded", "1");
    localStorage.setItem("e6ss:v1:search", JSON.stringify({ tags: "old_profile_tag" }));
  });
  await page.goto("/settings/account");
  await expect(page.getByTestId("search-input")).toHaveValue(/old_profile_tag/);
  expect(await page.evaluate(() => localStorage.getItem("e6ss:schema"))).toBe("1");
});

test("the tab bar steps aside while the show plays", async ({ page }) => {
  await page.goto("/settings/account");
  const bar = page.getByRole("navigation", { name: "Tabs" });
  await expect(bar).toBeVisible();
  await page.getByTestId("play-button").click();
  await expect(page.getByTestId("settings-panel")).toHaveAttribute("data-open", "false");
  await expect(bar).toHaveAttribute("data-hidden", "true");
});

test("a pasted Settings page goes back to Settings, then home", async ({ page }) => {
  await page.goto("/settings/content");
  await expect(heading(page, "Content")).toBeVisible();
  await page.getByRole("button", { name: "Back" }).click();
  await expect(heading(page, "Settings")).toBeVisible();
  await page.goBack();
  await expect(page).toHaveURL(/\/following$/);
});

test("the legacy show keeps its place across a tab round-trip", async ({ page }) => {
  await page.goto("/settings/account");
  await page.getByTestId("play-button").click();
  const slide = page.locator("[data-testid=slide-image],[data-testid=slide-video]");
  await expect(slide).toBeVisible();
  await page.keyboard.press("ArrowRight");
  const id = await slide.getAttribute("data-post-id");
  await page.mouse.move(600, 400);
  await page.getByTestId("settings-button").click();
  await tab(page, "Artists").click();
  await expect(heading(page, "Artists")).toBeVisible();
  await tab(page, "Settings").click();
  await page.getByRole("link", { name: "Account" }).click();
  await expect(page.getByTestId("play-button")).toHaveText(/Resume/);
  await page.getByTestId("play-button").click();
  await expect(slide).toHaveAttribute("data-post-id", id!);
});
