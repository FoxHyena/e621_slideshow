import { expect, test, type Page } from "@playwright/test";
import { mockE621 } from "./mock";

/**
 * The installed-app side (ENGINEERING.md §7, DESIGN.md "Install, update and the app icon"): the
 * manifest and icons, the CSP, Settings › App's install row per browser, and (against a production
 * build only, where the worker registers) the service worker: it caches this origin's files and
 * never an e621 answer, an offline reload still opens the app, and a deploy reaches an app that
 * stays open.
 *
 *   pnpm build && pnpm start --port 3622
 *   E6_PWA=1 E6_BASE=http://localhost:3622 pnpm e2e e2e/pwa.spec.ts --workers 1
 */

const SHOTS = process.env.E6_SHOTS;
const shot = async (page: Page, name: string) => {
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/${name}.png`, fullPage: false, animations: "disabled" });
};
const IPHONE = "Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.1 Mobile/15E148 Safari/604.1";

test.describe("manifest, icons, CSP", () => {
  test("the manifest names the app and lists icons that exist; the page links them", async ({ page, request }) => {
    const res = await request.get("/manifest.webmanifest");
    expect(res.ok()).toBe(true);
    const m = await res.json();
    expect(m).toMatchObject({
      id: "/following",
      name: "eLicks21",
      short_name: "eLicks21",
      start_url: "/following",
      display: "standalone",
      background_color: "#020F23",
    });
    expect(m.icons.map((i: { purpose: string }) => i.purpose)).toEqual(["any", "any", "maskable", "monochrome"]);
    for (const i of m.icons) expect((await request.get(i.src)).headers()["content-type"]).toBe("image/png");
    await mockE621(page);
    await page.goto("/following");
    await expect(page.locator('link[rel="manifest"]')).toHaveAttribute("href", "/manifest.webmanifest");
    await expect(page.locator('link[rel="apple-touch-icon"]')).toHaveAttribute("href", "/icons/apple-icon-180.png");
    await expect(page.locator('meta[name="theme-color"]')).toHaveAttribute("content", "#020F23");
  });

  test("the CSP lets the page talk to itself and e621 only; sw.js is always asked fresh", async ({ request }) => {
    const csp = (await request.get("/following")).headers()["content-security-policy"];
    expect(csp).toContain("connect-src 'self' https://e621.net");
    expect(csp).toContain("frame-ancestors 'none'");
    expect(csp).toContain("img-src 'self' data: blob: https://static1.e621.net");
    const sw = await request.get("/sw.js");
    expect(sw.headers()["cache-control"]).toBe("no-cache");
  });
});

test.describe("Settings › App's install row", () => {
  test("Chrome on a computer before it offers: no row", async ({ page }) => {
    await mockE621(page);
    await page.goto("/settings/app");
    await expect(page.getByTestId("userscript-install")).toBeVisible();
    await expect(page.getByTestId("install-row")).toHaveCount(0);
  });

  test.describe("on an iPhone", () => {
    test.use({ userAgent: IPHONE, viewport: { width: 375, height: 812 }, hasTouch: true });
    test("Safari: the row opens the three steps", async ({ page }) => {
      await mockE621(page);
      await page.goto("/settings/app");
      await page.getByTestId("install-row").click();
      const sheet = page.getByTestId("sheet-install");
      await expect(sheet).toContainText("Tap Share");
      await expect(sheet).toContainText("Choose Add to Home Screen");
      await expect(sheet).toContainText("Tap Add");
      await expect(sheet).toContainText("keeps its own sign-in");
      await shot(page, "install-sheet");
    });
  });

  test.describe("inside another app's browser", () => {
    test.use({ userAgent: `${IPHONE.replace(" Safari/604.1", "")} Instagram 350.0.0.0`, viewport: { width: 375, height: 812 } });
    test("the sheet says to open Safari, with Copy link", async ({ page, context }) => {
      await context.grantPermissions(["clipboard-read", "clipboard-write"]);
      await mockE621(page);
      await page.goto("/settings/app");
      await page.getByTestId("install-row").click();
      await expect(page.getByTestId("sheet-install")).toContainText("This browser cannot install apps");
      await page.getByTestId("install-copy").click();
      await expect(page.locator("[data-sonner-toast]")).toContainText("Link copied");
    });
  });
});

test.describe("the service worker (production build)", () => {
  test.skip(!process.env.E6_PWA, "set E6_PWA=1 and E6_BASE to a production build");
  test.use({ serviceWorkers: "allow", ...(process.env.E6_BASE ? { baseURL: process.env.E6_BASE } : {}) });

  test("caches this origin's files only, never an e621 answer; offline, the app still opens", async ({ page, context }) => {
    const csp: string[] = [];
    page.on("console", (m) => {
      if (/Content Security Policy/i.test(m.text())) csp.push(m.text());
    });
    await mockE621(page);
    await page.goto("/following");
    await page.evaluate(() => navigator.serviceWorker.ready);
    await expect.poll(() => page.evaluate(() => !!navigator.serviceWorker.controller)).toBe(true);
    // let the worker take the loaded chunks, and browse a feed that reads e621
    await page.goto("/search?tags=wolf");
    await expect(page.locator("[data-post-id]").first()).toBeVisible();
    const cached = await page.evaluate(async () => {
      const out: string[] = [];
      for (const name of await caches.keys()) for (const r of await (await caches.open(name)).keys()) out.push(r.url);
      return out;
    });
    expect(cached.length).toBeGreaterThan(1);
    for (const u of cached) expect(new URL(u).origin).toBe(new URL(page.url()).origin);
    expect(cached.some((u) => u.includes("/_next/static/"))).toBe(true);

    // Offline: another route than the cached one opens, from the worker, and becomes that screen.
    await context.setOffline(true);
    await page.goto("/settings/app");
    expect(new URL(page.url()).pathname).toBe("/settings/app");
    await expect(page.getByTestId("settings-page-app")).toBeVisible();
    await page.reload();
    await expect(page.getByTestId("settings-page-app")).toBeVisible();
    await context.setOffline(false);
    // The production app boots under its CSP (no unsafe-eval) without a violation.
    expect(csp).toEqual([]);
  });

  /** The worker in charge of this page, as its build (it is registered as /sw.js?v=<build>). */
  const controllerBuild = (page: Page) => page.evaluate(() => new URL(navigator.serviceWorker.controller?.scriptURL ?? "http://x/").searchParams.get("v"));

  test("a deploy reaches an open app: back at the front, the toast shows, and Reload runs the new build", async ({ page, context }) => {
    await mockE621(page);
    await page.goto("/following");
    await expect.poll(() => controllerBuild(page)).not.toBeNull();
    const first = await controllerBuild(page);
    // the site now serves another build (the same files, under its own name)
    const next = "e2e-next-build";
    await context.route("**/version.json", (r) => r.fulfill({ json: { build: next } }));
    // the app comes back to the front, never having been quit
    await page.evaluate(() => {
      (window as Window & { __stayed?: boolean }).__stayed = true;
      document.dispatchEvent(new Event("visibilitychange"));
    });
    const toast = page.locator("[data-sonner-toast]", { hasText: "New version ready" });
    await expect(toast).toBeVisible();
    await shot(page, "update-toast");
    // the page reloads, and the new version is in charge; the old one's caches are gone
    await Promise.all([page.waitForEvent("load"), toast.getByRole("button", { name: "Reload" }).click()]);
    expect(await page.evaluate(() => (window as Window & { __stayed?: boolean }).__stayed ?? false)).toBe(false);
    await expect.poll(() => controllerBuild(page)).toBe(next);
    const names = await page.evaluate(() => caches.keys());
    expect(names).toContain(`e6ss-static-${next}`);
    expect(names.some((n) => n.endsWith(`-${first}`))).toBe(false);
    // asking again finds nothing new: nothing downloads, no second toast
    await page.evaluate(() => document.dispatchEvent(new Event("visibilitychange")));
    await page.waitForTimeout(1500);
    expect(
      await page.evaluate(async () => {
        const reg = await navigator.serviceWorker.getRegistration();
        return !!(reg?.installing || reg?.waiting);
      }),
    ).toBe(false);
    await expect(toast).toHaveCount(0);
  });

  test("a cold start on a newer build than the worker runs it without asking", async ({ page }) => {
    await mockE621(page);
    await page.goto("/following");
    await expect.poll(() => controllerBuild(page)).not.toBeNull();
    const build = await controllerBuild(page);
    // an older version is put in charge (as if this build were deployed after the app last ran)
    await page.evaluate(async () => {
      const reg = await navigator.serviceWorker.register("/sw.js?v=e2e-older", { updateViaCache: "none" });
      const w = reg.installing ?? reg.waiting;
      if (w && w.state !== "installed") await new Promise<void>((ok) => w.addEventListener("statechange", () => w.state === "installed" && ok()));
      reg.waiting?.postMessage({ type: "skip-waiting" });
    });
    await expect.poll(() => controllerBuild(page)).toBe("e2e-older");
    // the next launch fetches this build's shell: it takes over quietly, no toast, no second reload
    await page.reload();
    await expect.poll(() => controllerBuild(page)).toBe(build);
    await page.waitForTimeout(1000);
    await expect(page.locator("[data-sonner-toast]", { hasText: "New version ready" })).toHaveCount(0);
  });

  test("a page on an older build than the worker in charge never puts its version back", async ({ page, context }) => {
    await mockE621(page);
    await page.goto("/following");
    await expect.poll(() => controllerBuild(page)).not.toBeNull();
    // a newer version is in charge, and the site serves it (this page came from an older shell)
    const newer = "e2e-newer";
    await context.route("**/version.json", (r) => r.fulfill({ json: { build: newer } }));
    await page.evaluate(async (v) => {
      const reg = await navigator.serviceWorker.register(`/sw.js?v=${v}`, { updateViaCache: "none" });
      const w = reg.installing ?? reg.waiting;
      if (w && w.state !== "installed") await new Promise<void>((ok) => w.addEventListener("statechange", () => w.state === "installed" && ok()));
      reg.waiting?.postMessage({ type: "skip-waiting" });
    }, newer);
    await expect.poll(() => controllerBuild(page)).toBe(newer);
    await page.reload();
    await page.waitForTimeout(3000);
    expect(await controllerBuild(page)).toBe(newer);
    expect(
      await page.evaluate(async () => {
        const reg = await navigator.serviceWorker.getRegistration();
        return !!(reg?.installing || reg?.waiting);
      }),
    ).toBe(false);
    await expect(page.locator("[data-sonner-toast]", { hasText: "New version ready" })).toHaveCount(0);
  });
});
