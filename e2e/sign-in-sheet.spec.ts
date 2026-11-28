import { expect, test, type Page } from "@playwright/test";
import { mockE621 } from "./mock";

/** DESIGN.md "Sign-in sheet", as screens-v6 draws it: steps 8 apart, labels 14 in and 4 above their
 * fields, 12 after a field, the note 16 under the key, a 44 switch row flush with the fields, 16 to Sign in. */

const box = async (page: Page, sel: string, i = 0) => (await page.locator(sel).nth(i).boundingBox())!;

for (const [name, viewport] of [
  ["a computer", { width: 1280, height: 800 }],
  ["a phone", { width: 390, height: 844 }],
] as const) {
  test(`the sign-in sheet's spacing on ${name}`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await mockE621(page);
    await page.goto("/following");
    await page.getByRole("button", { name: "Sign in with e621" }).first().click();
    await expect(page.getByTestId("sign-in-username")).toBeVisible();
    await page.waitForTimeout(400); // the sheet's rise

    const steps = await Promise.all([0, 1, 2].map((i) => box(page, ".signin-steps li", i)));
    expect(steps.map((s) => s.height)).toEqual([28, 28, 28]);
    expect(steps[1].y - (steps[0].y + steps[0].height)).toBe(8);
    expect(steps[2].y - (steps[1].y + steps[1].height)).toBe(8);

    const [l0, l1] = [await box(page, ".signin-label", 0), await box(page, ".signin-label", 1)];
    const [f0, f1] = [await box(page, ".signin .field6", 0), await box(page, ".signin .field6", 1)];
    expect(l0.y - (steps[2].y + steps[2].height)).toBe(16);
    expect(l0.x - f0.x).toBe(14);
    expect(f0.y - (l0.y + l0.height)).toBe(4);
    expect(l1.y - (f0.y + f0.height)).toBe(12);

    const note = await box(page, ".signin-note");
    expect(note.y - (f1.y + f1.height)).toBe(16);
    expect(note.x).toBe(f1.x);

    const row = await box(page, ".signin-remember");
    const sw = await box(page, ".signin-remember .switch");
    expect(row.height).toBe(44);
    expect(row.y - (note.y + note.height)).toBe(12);
    expect(row.x).toBe(f1.x);
    expect(Math.round(sw.x + sw.width)).toBe(Math.round(f1.x + f1.width));

    const go = await box(page, ".signin-go");
    expect(go.y - (row.y + row.height)).toBe(16);
    const paste = await box(page, ".signin-paste");
    expect(Math.round(f1.x + f1.width - (paste.x + paste.width))).toBe(6);
    if (process.env.E6_SHOTS) await page.screenshot({ path: `${process.env.E6_SHOTS}/sign-in-${viewport.width}.png` });
  });
}
