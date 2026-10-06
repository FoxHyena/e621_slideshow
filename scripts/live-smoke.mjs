// Live smoke test against the real e621 API (read-only, safe-rated content).
// Usage: pnpm dev --port 3621, then: node scripts/live-smoke.mjs <screenshot-dir>
import { chromium } from "@playwright/test";
const out = process.argv[2];
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
const errors = [];
page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
page.on("pageerror", (e) => errors.push("PAGEERROR " + e.message));
const apiCalls = [];
page.on("request", (r) => r.url().includes("e621.net/") && !r.url().includes("static1") && apiCalls.push(r.method() + " " + decodeURIComponent(r.url())));
await page.goto("http://localhost:3621/");
await page.getByTestId("settings-panel").waitFor();
await page.getByRole("button", { name: /Filters/ }).click();
// safe only for screenshots
await page.getByTestId("rating-q").uncheck();
await page.getByTestId("rating-e").uncheck();
const input = page.getByTestId("search-input");
await input.click();
await input.pressSequentially("wol", { delay: 50 });
await page.getByTestId("autocomplete").waitFor({ timeout: 8000 });
const opts = await page.getByTestId("autocomplete").locator("li").allInnerTexts();
console.log("autocomplete:", opts.slice(0, 5));
await page.screenshot({ path: `${out}/1-autocomplete.png` });
await input.press("Enter"); // pick first
console.log("input after pick:", await input.inputValue());
await page.getByTestId("query-preview").evaluate((e) => e.closest("details").open = true);
console.log("query:", await page.getByTestId("query-preview").innerText());
await page.screenshot({ path: `${out}/2-panel.png` });
await page.getByTestId("play-button").click();
const img = page.getByTestId("slide-image").or(page.getByTestId("slide-video"));
await img.first().waitFor({ timeout: 15000 });
const id1 = await img.first().getAttribute("data-post-id");
await page.waitForTimeout(1500);
await page.screenshot({ path: `${out}/3-playing.png` });
console.log("counter:", await page.getByTestId("counter").innerText(), "post", id1);
await page.keyboard.press("ArrowRight");
await page.waitForTimeout(1500);
const id2 = await page.locator("[data-post-id]").last().getAttribute("data-post-id");
console.log("after ArrowRight post", id2, "counter", await page.getByTestId("counter").innerText());
await page.keyboard.press("i");
await page.getByTestId("info-overlay").waitFor();
await page.screenshot({ path: `${out}/4-info.png` });
await page.keyboard.press("i");
// preload check
const loaded = await page.evaluate(() => performance.getEntriesByType("resource").filter((e) => e.name.includes("static1.e621.net")).map((e) => e.name.split("/").pop()));
console.log("static media requested:", loaded.length);
// video query
await page.keyboard.press("s");
await input.fill("type:webm");
await page.getByTestId("play-button").click();
await page.getByTestId("slide-video").first().waitFor({ timeout: 20000 });
await page.waitForTimeout(3000);
const v = await page.getByTestId("slide-video").first().evaluate((v) => ({ t: v.currentTime, paused: v.paused, dur: v.duration, rs: v.readyState }));
console.log("video:", v);
await page.getByTestId("progress").waitFor({ timeout: 10000 });
console.log("video slide timer running (progress bar shown)");
await page.screenshot({ path: `${out}/5-video.png` });
console.log("API calls:", apiCalls);
console.log("errors:", errors);
await browser.close();
