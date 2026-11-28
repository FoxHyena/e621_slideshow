import { expect, test } from "@playwright/test";
import { mockE621 } from "./mock";

/** DESIGN.md "Sheet (⋯ menu)" and "Menu" / "Segmented control", as fixed 2026-11-27 from the owner's screenshots. */

for (const w of [390, 1280])
  test(`the ⋯ sheet: labels level with the name at 64, dividers from 48; as a popover the line starts 16 down (${w} wide)`, async ({ page }) => {
    await page.setViewportSize({ width: w, height: 844 });
    await mockE621(page);
    await page.goto("/search?tags=wolf");
    await page.getByTestId("card-menu").first().click();
    const sheet = page.getByTestId("sheet-post");
    await expect(sheet.locator(".well-row").first()).toBeVisible();
    await page.waitForTimeout(400);
    const m = await sheet.evaluate((root) => {
      const s = root.querySelector(".sheet")!.getBoundingClientRect();
      const box = (q: string) => root.querySelector(q)!.getBoundingClientRect();
      const mark = box(".sheet-ctx .post-avatar");
      const name = box(".sheet-ctx .row-text > b");
      const num = box(".sheet-ctx .row-text > small");
      const label = box(".well-row > span");
      return {
        name: Math.round(name.left - s.left),
        label: Math.round(label.left - s.left),
        lines: [Math.round(name.top - mark.top), Math.round(num.top - mark.top), Math.round(num.bottom - mark.top)],
        divider: getComputedStyle(root.querySelectorAll(".well-row")[1], "::before").left,
        markTop: Math.round(mark.top - s.top),
      };
    });
    expect(m.name).toBe(64);
    expect(m.label).toBe(64);
    expect(m.lines).toEqual([0, 20, 36]);
    expect(m.divider).toBe("48px");
    if (w >= 900) expect(m.markTop).toBe(16);
  });

test("the date menu's Custom part: 8, a line 16 in, 12; segments hug their words; the capsule takes the chosen one's place", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await mockE621(page);
  await page.goto("/search?tags=wolf");
  await page.getByTestId("chip-date").click();
  await page.getByTestId("date-custom").click();
  await page.getByTestId("date-mode").locator('[data-value="within"]').click();
  await page.waitForTimeout(500);
  const m = await page.evaluate(() => {
    const rows = [...document.querySelectorAll("[data-testid=sheet-date] .menu-row, [data-testid=sheet-date] [role=menuitemradio]")];
    const last = rows[rows.length - 1].getBoundingClientRect();
    const mc = document.querySelector(".menu-custom")!;
    const menu = mc.parentElement!.getBoundingClientRect();
    const line = getComputedStyle(mc, "::before");
    const lineTop = mc.getBoundingClientRect().top + parseFloat(line.marginTop);
    const seg = (id: string) =>
      [...document.querySelectorAll(`[data-testid=${id}] > button`)].map((b) => {
        const r = b.getBoundingClientRect();
        const range = document.createRange();
        range.selectNodeContents(b);
        const t = range.getBoundingClientRect();
        return Math.min(t.left - r.left, r.right - t.right);
      });
    const thumb = (id: string) => {
      const t = document.querySelector(`[data-testid=${id}] .seg-thumb`)!.getBoundingClientRect();
      const b = document.querySelector(`[data-testid=${id}] > button[aria-checked=true]`)!.getBoundingClientRect();
      return [Math.round(t.left - b.left), Math.round(t.width - b.width)];
    };
    return {
      above: Math.round(lineTop - last.bottom),
      below: Math.round(document.querySelector("[data-testid=date-mode]")!.getBoundingClientRect().top - (lineTop + 1)),
      inset: Math.round(parseFloat(getComputedStyle(mc).paddingLeft) + parseFloat(line.marginLeft)),
      menuW: Math.round(menu.width),
      modes: Math.min(...seg("date-mode")),
      units: Math.min(...seg("date-unit")),
      thumbs: [thumb("date-mode"), thumb("date-unit")],
      num: Math.round(document.querySelector("[data-testid=date-amount]")!.closest(".field6")!.getBoundingClientRect().width),
    };
  });
  expect([m.above, m.below, m.inset]).toEqual([8, 12, 16]);
  expect(m.modes).toBeGreaterThanOrEqual(14);
  expect(m.units).toBeGreaterThanOrEqual(8);
  expect(m.thumbs).toEqual([
    [0, 0],
    [0, 0],
  ]);
  expect(m.num).toBe(72);
});
