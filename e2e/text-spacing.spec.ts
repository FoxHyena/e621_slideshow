import { expect, test, type Page } from "@playwright/test";

/** DESIGN.md "Hierarchy", Spacing (owner-picked "C", 2026-11-27): each face its own spacing, no leaks. */
import { mockE621 } from "./mock";

const audit = (page: Page, where: string) =>
  page.evaluate((where) => {
    const bad = new Map<string, string>();
    for (const el of document.querySelectorAll<HTMLElement>("body *")) {
      if (![...el.childNodes].some((n) => n.nodeType === 3 && n.textContent!.trim())) continue;
      if (!el.offsetParent && getComputedStyle(el).position !== "fixed") continue;
      const cs = getComputedStyle(el);
      const size = parseFloat(cs.fontSize);
      const fam = cs.fontFamily;
      const fredoka = /fredoka/i.test(fam.split(",")[0]);
      const mono = /mono|menlo/i.test(fam.split(",")[0]);
      const ws = cs.wordSpacing === "normal" ? 0 : parseFloat(cs.wordSpacing);
      const ls = cs.letterSpacing === "normal" ? 0 : parseFloat(cs.letterSpacing);
      const id = `${el.tagName.toLowerCase()}.${[...el.classList].join(".")} "${el.textContent!.trim().slice(0, 20)}"`;
      const r = (x: number) => Math.round(x * 100) / 100;
      if (fredoka && Math.abs(ws - 0.08 * size) > 0.05) bad.set(id, `fredoka ${size}px ws=${r(ws)}`);
      if (!fredoka && ws !== 0) bad.set(id, `${mono ? "mono" : "system"} ${size}px ws=${r(ws)} (leak)`);
      if (!fredoka && !mono && size === 13 && Math.abs(ls + 0.26) > 0.03) bad.set(id, `system 13px ls=${r(ls)}`);
      if (!fredoka && !mono && size !== 13 && ls < -0.05) bad.set(id, `system ${size}px ls=${r(ls)} (leak)`);
      if (fredoka && Math.abs(ls + 0.02 * size) < 0.03 && size < 20) bad.set(id, `fredoka ${size}px ls=${r(ls)} (leak)`);
    }
    return [...bad].map(([k, v]) => `${where}: ${v}  ${k}`);
  }, where);

for (const [w, h] of [
  [390, 844],
  [1280, 800],
] as const)
  test(`Fredoka has its word spacing, 13 px system text its letter spacing, and neither leaks (${w} wide)`, async ({ page }) => {
    await page.setViewportSize({ width: w, height: h });
    await mockE621(page, [{ id: 1149, description: "h2. Hi\nsome [b]bold[/b] words" }, { id: 1148 }, { id: 1147 }]);
    const out: string[] = [];
    const visit = async (url: string, name: string, after?: () => Promise<void>) => {
      await page.goto(url);
      await page.waitForTimeout(900);
      if (after) {
        await after();
        await page.waitForTimeout(600);
      }
      out.push(...(await audit(page, name)));
    };
    await visit("/following", "following");
    await visit("/search?tags=wolf", "results");
    await visit("/search?tags=wolf", "post-menu", () => page.getByTestId("card-menu").first().click());
    await visit("/search?tags=wolf", "date-menu", async () => {
      await page.getByTestId("chip-date").click();
      await page.getByText("Custom…").click();
    });
    await visit("/post/1149", "post-page");
    await visit("/search?tags=wolf&view=1149", "viewer-info", () => page.keyboard.press("i"));
    await visit("/settings/app", "settings-app");
    await visit("/settings", "settings");
    await visit("/artists", "artists");
    await visit("/for-you", "for-you");
    expect([...new Set(out)]).toEqual([]);
  });
