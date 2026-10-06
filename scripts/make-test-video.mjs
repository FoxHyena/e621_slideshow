// Generates e2e/fixtures/clip.webm (2s, tiny) with MediaRecorder, since ffmpeg isn't assumed.
import { chromium } from "@playwright/test";
import { writeFileSync } from "node:fs";
const browser = await chromium.launch();
const page = await browser.newPage();
const b64 = await page.evaluate(async () => {
  const c = document.createElement("canvas");
  c.width = 64; c.height = 48;
  const ctx = c.getContext("2d");
  const rec = new MediaRecorder(c.captureStream(15), { mimeType: "video/webm;codecs=vp8" });
  const chunks = [];
  rec.ondataavailable = (e) => chunks.push(e.data);
  const done = new Promise((r) => (rec.onstop = r));
  rec.start();
  const t0 = performance.now();
  while (performance.now() - t0 < 2000) {
    ctx.fillStyle = `hsl(${(performance.now() - t0) / 6} 80% 50%)`;
    ctx.fillRect(0, 0, 64, 48);
    await new Promise((r) => setTimeout(r, 60));
  }
  rec.stop();
  await done;
  const buf = await new Blob(chunks).arrayBuffer();
  return btoa(String.fromCharCode(...new Uint8Array(buf)));
});
writeFileSync(new URL("../e2e/fixtures/clip.webm", import.meta.url), Buffer.from(b64, "base64"));
await browser.close();
