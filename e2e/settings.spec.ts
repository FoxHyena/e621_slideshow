import { expect, test, type Page } from "@playwright/test";
import { mockE621 } from "./mock";

/**
 * Settings' sub-pages and the sign-in sheet (UX.md "Settings", "Sign-in sheet"; DESIGN.md "Settings:
 * Account, Content, For You, App"). Every group, and the sheet's flow from a Follow and from Settings.
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

const sheet = (page: Page) => page.getByTestId("sheet-sign-in");
const toast = (page: Page) => page.locator("[data-sonner-toast]");

test("sign-in sheet: a wrong key says so inline; the right one signs in, keeps nothing without Remember, and closes", async ({ page }) => {
  await mockE621(page);
  await page.goto("/settings/account");
  await expect(page.getByTestId("account-signed-out")).toContainText("Not signed in");
  await page.getByTestId("account-sign-in").click();
  await expect(sheet(page)).toBeVisible();
  await expect(sheet(page).getByTestId("sign-in-key-page")).toHaveAttribute("href", "https://e621.net/users/home");
  await expect(sheet(page).getByTestId("sign-in-submit")).toBeDisabled();
  await page.getByTestId("sign-in-username").fill("tester");
  await page.getByTestId("sign-in-key").fill("wrongkey");
  await shot(page, "sign-in-sheet");
  await page.getByTestId("sign-in-submit").click();
  await expect(page.getByTestId("sign-in-error")).toBeVisible();
  // nothing is kept until e621 accepts the key
  expect(await page.evaluate(() => localStorage.getItem("e6ss:v1:creds"))).toBeNull();

  await page.getByTestId("sign-in-key").fill("goodkey");
  await page.getByTestId("sign-in-remember").uncheck();
  await page.getByTestId("sign-in-submit").click();
  await expect(sheet(page)).toHaveCount(0);
  await expect(page.getByTestId("account-name")).toHaveText("tester");
  expect(await page.evaluate(() => localStorage.getItem("e6ss:v1:creds"))).toBeNull();
  await expect(page).toHaveURL(/\/settings\/account$/);
});

test("the username draft survives a trip away; the key never does", async ({ page }) => {
  await mockE621(page);
  await page.goto("/settings/account");
  await page.getByTestId("account-sign-in").click();
  await page.getByTestId("sign-in-username").fill("wolfie");
  await page.getByTestId("sign-in-key").fill("half_typed");
  await page.reload();
  await page.getByTestId("account-sign-in").click();
  await expect(page.getByTestId("sign-in-username")).toHaveValue("wolfie");
  await expect(page.getByTestId("sign-in-key")).toHaveValue("");
});

test("signed out, Follow opens the sheet over the page, and the artist is followed once you're in", async ({ page }) => {
  const mock = await mockE621(page, [{ id: 1150, artist: "fox_artist" }]);
  await page.goto("/artist/fox_artist");
  await page.getByTestId("follow-button").click();
  await expect(sheet(page)).toBeVisible();
  await expect(page).toHaveURL(/\/artist\/fox_artist$/);
  await page.getByTestId("sign-in-username").fill("tester");
  await page.getByTestId("sign-in-key").fill("goodkey");
  await page.getByTestId("sign-in-submit").click();
  await expect(sheet(page)).toHaveCount(0);
  await expect.poll(() => mock.followWrites).toEqual([{ method: "POST", names: ["fox_artist"] }]);
  await expect(page.getByTestId("follow-button")).toHaveText("Following");
});

test("a Follow you backed out of (closed the sheet) doesn't happen when you sign in later", async ({ page }) => {
  const mock = await mockE621(page, [{ id: 1150, artist: "fox_artist" }]);
  await page.goto("/artist/fox_artist");
  await page.getByTestId("follow-button").click();
  await expect(sheet(page)).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(sheet(page)).toHaveCount(0);
  // (in the app, not a reload: a reload forgets the tap anyway)
  // (on a computer Settings is one page, Account first)
  await page.getByTestId("tab-settings").click();
  await page.getByTestId("account-sign-in").click();
  await page.getByTestId("sign-in-username").fill("tester");
  await page.getByTestId("sign-in-key").fill("goodkey");
  await page.getByTestId("sign-in-submit").click();
  await expect(page.getByTestId("account-name")).toHaveText("tester");
  await expect(page.getByTestId("settings-page-account")).toContainText("0 follows");
  // a backed-out Follow would go out right after the list is read: give it the time it would take
  await page.waitForTimeout(1000);
  expect(mock.followWrites).toEqual([]);
  await expect(page.getByTestId("settings-page-account")).toContainText("0 follows");
});

test("Account: who you are, Your favorites, Sign-in links with its warning, API key, Sign out", async ({ page }) => {
  const mock = await mockE621(page);
  mock.subscriptions = ["a", "b"];
  await signIn(page);
  await page.goto("/settings/account");
  await expect(page.getByTestId("account-name")).toHaveText("tester");
  await expect(page.getByTestId("settings-page-account")).toContainText("Signed in to e621 · 2 follows");
  await expect(page.getByTestId("share-sign-in-warning")).toContainText("Anyone with such a link can use your e621 account");
  await expect(page.getByTestId("share-sign-in")).not.toBeChecked();
  await page.getByTestId("share-sign-in").check();
  expect(await page.evaluate(() => localStorage.getItem("e6ss:v1:shareSignIn"))).toBe("true");
  await shot(page, "settings-account");
  await page.getByTestId("account-key").click();
  await expect(sheet(page)).toBeVisible();
  await expect(page.getByTestId("sign-in-username")).toHaveValue("tester");
  await page.keyboard.press("Escape");
  await expect(sheet(page)).toHaveCount(0);
  await page.getByTestId("account-favorites").click();
  await expect(page.getByRole("heading", { name: "Your favorites" })).toBeVisible();
  await page.goBack();
  await page.getByTestId("sign-out").click();
  await expect(page.getByTestId("account-signed-out")).toBeVisible();
  expect(await page.evaluate(() => localStorage.getItem("e6ss:v1:creds"))).toBeNull();
});

test("Content: ratings keep one on; blacklist lines add, remove and import e621's defaults", async ({ page }) => {
  await mockE621(page);
  await page.goto("/settings/content");
  await page.getByTestId("rating-e").uncheck();
  await page.getByTestId("rating-q").uncheck();
  await expect(page.getByTestId("rating-s")).toBeChecked();
  await page.getByTestId("rating-s").click();
  await expect(page.getByTestId("rating-s")).toBeChecked();
  await expect(toast(page)).toContainText("Keep at least one rating on");

  await expect(page.getByTestId("blacklist-count")).toHaveText("0 lines");
  await page.getByTestId("blacklist-field").fill("Gore  -cute");
  await page.getByTestId("blacklist-add").click();
  await expect(page.getByTestId("blacklist-line")).toHaveCount(1);
  await expect(page.getByTestId("blacklist-line").first()).toContainText("gore · -cute");
  await expect(page.getByTestId("blacklist-count")).toHaveText("1 line");
  await page.getByTestId("blacklist-import").click();
  await expect(toast(page).filter({ hasText: "from e621's default list" })).toBeVisible();
  const n = await page.getByTestId("blacklist-line").count();
  expect(n).toBeGreaterThan(1);
  await shot(page, "settings-content");
  // (the last: what's left mustn't be exactly e621's defaults, which a load clears as an untouched old list)
  await page.getByTestId("blacklist-remove").last().click();
  await expect(page.getByTestId("blacklist-line")).toHaveCount(n - 1);
  // kept across a reload
  await page.reload();
  await expect(page.getByTestId("blacklist-line")).toHaveCount(n - 1);
  await expect(page.getByTestId("rating-e")).not.toBeChecked();
});

test("Slideshow: style, seconds, fit, choices in a sheet, mute, loop; all kept", async ({ page }) => {
  await mockE621(page);
  await page.goto("/settings/slideshow");
  await page.getByTestId("slideshow-style").getByRole("radio", { name: "Ken Burns" }).click();
  await expect(page.getByTestId("slideshow-fit")).toHaveCount(0);
  await page.getByTestId("slideshow-style").getByRole("radio", { name: "Classic" }).click();
  await page.getByTestId("slideshow-seconds").getByRole("button", { name: "More seconds per slide" }).click();
  await expect(page.getByTestId("slideshow-seconds")).toContainText("7 s");
  await page.getByTestId("slideshow-videoMaxSec").click();
  await page.getByTestId("choose-0").click();
  await expect(page.getByTestId("slideshow-videoMaxSec")).toContainText("Whole video");
  await page.getByTestId("slideshow-loop").check();
  await shot(page, "settings-slideshow");
  await page.reload();
  await expect(page.getByTestId("slideshow-seconds")).toContainText("7 s");
  await expect(page.getByTestId("slideshow-videoMaxSec")).toContainText("Whole video");
  await expect(page.getByTestId("slideshow-loop")).toBeChecked();
});

test("For You: Tune, and hidden artists with Show", async ({ page }) => {
  await mockE621(page);
  await signIn(page);
  await page.addInitScript(() => localStorage.setItem("e6ss:v1:hiddenArtists:tester", JSON.stringify(["dune_jackal"])));
  await page.goto("/settings/for-you");
  await expect(page.getByTestId("hidden-artist")).toHaveCount(1);
  await expect(page.getByTestId("hidden-artist")).toContainText("dune jackal");
  await page.getByTestId("hidden-show").click();
  await expect(page.getByTestId("hidden-none")).toHaveText("None");
  await page.getByTestId("for-you-tune").click();
  await expect(page.getByRole("heading", { name: "Tune" })).toBeVisible();
});

test("App: the e621 button, keyboard shortcuts, About", async ({ page }) => {
  await mockE621(page);
  await page.goto("/settings/app");
  await expect(page.getByTestId("userscript-install")).toHaveAttribute("href", "/e621-slideshow.user.js");
  await expect(page.getByTestId("app-version")).not.toBeEmpty();
  await page.getByTestId("app-keys").click();
  await expect(page.getByTestId("sheet-keys")).toContainText("Open on e621");
  await shot(page, "settings-keys");
});

test("the app mark at the foot of Settings is the hexagon with Play, and pops when pressed", async ({ page }) => {
  // (the foot is the phone's Settings home; a computer shows Settings as one page)
  await page.setViewportSize({ width: 375, height: 812 });
  await mockE621(page);
  await page.goto("/settings");
  const foot = page.locator(".app-foot .mark-app");
  await expect(foot).toBeVisible();
  expect(await foot.evaluate((m) => m.querySelectorAll("clipPath").length)).toBe(2);
  await expect(foot).not.toHaveAttribute("data-pop");
  // the app's name (owner, 2026-11-26: "eLicks21"), in the foot and the page's title
  await expect(page.locator(".app-foot b")).toHaveText("eLicks21");
  await expect(page).toHaveTitle("eLicks21");
  await page.getByRole("button", { name: "eLicks21" }).click();
  await expect(foot).toHaveAttribute("data-pop", "");
});

test("signed out on a phone, the e621 row has Sign in on it, which brings up the sheet (no page in between)", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await mockE621(page);
  await page.goto("/settings");
  const row = page.getByTestId("settings-account");
  await expect(row).toContainText("Sign in to e621");
  await page.getByTestId("settings-sign-in").click();
  await expect(sheet(page)).toBeVisible();
  await expect(page).toHaveURL(/\/settings$/);
  await page.keyboard.press("Escape");
  await expect(sheet(page)).toHaveCount(0);
  await shot(page, "settings-signed-out");
});
