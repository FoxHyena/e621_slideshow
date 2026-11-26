import { expect, test, type Page } from "@playwright/test";
import path from "node:path";
import { mockE621, mockPost, type E621Mock } from "../../e2e/mock";

const OUT = path.join(__dirname, "../../docs/screenshots");
const shot = (page: Page, name: string) => page.screenshot({ path: path.join(OUT, `${name}.png`) });

// ---- placeholder art --------------------------------------------------------

/** Width × height per post, cycling, so the layout styles get mixed aspect ratios. */
const SIZES: [number, number][] = [
  [1600, 900],
  [900, 1200],
  [1200, 1200],
  [1400, 1050],
  [1000, 1500],
  [1800, 1000],
];

/** Safe-rated placeholder characters: drawn here, never real e621 posts. */
const SPECIES = [
  { tag: "fox", fur: "#e8792b", light: "#fff3e6", ear: "#3a2418", cat: false },
  { tag: "wolf", fur: "#8a8f9c", light: "#e6e7ea", ear: "#4a4e58", cat: false },
  { tag: "husky", fur: "#4b5563", light: "#f4f4f5", ear: "#f9c6c9", cat: false },
  { tag: "domestic_cat", fur: "#c58b4e", light: "#f6e3c8", ear: "#f3a6b0", cat: true },
] as const;

const TAG_SETS = [
  ["anthro", "solo", "smile", "fluffy_tail", "mountain", "sunset"],
  ["anthro", "solo", "night", "moon", "looking_at_viewer"],
  ["anthro", "solo", "smile", "lake", "fluffy"],
  ["anthro", "solo", "sunset", "desert", "happy"],
  ["anthro", "solo", "snow", "winter", "scarf"],
  ["anthro", "solo", "beach", "ocean", "smile"],
];

const hash = (n: number) => {
  let x = n * 2654435761;
  x ^= x >>> 16;
  return (x >>> 0) / 2 ** 32;
};

const speciesOf = (id: number) => SPECIES[Math.floor(hash(id + 11) * SPECIES.length)];

/** A cartoon head-and-shoulders portrait in a 100-unit box, eyes level at y=52. */
function character(id: number): string {
  const sp = speciesOf(id);
  const ears = sp.cat
    ? `<polygon points="22,44 24,14 46,32" fill="${sp.fur}"/><polygon points="78,44 76,14 54,32" fill="${sp.fur}"/>
<polygon points="27,38 28,22 40,32" fill="${sp.ear}"/><polygon points="73,38 72,22 60,32" fill="${sp.ear}"/>`
    : `<polygon points="22,44 26,2 47,32" fill="${sp.fur}"/><polygon points="78,44 74,2 53,32" fill="${sp.fur}"/>
<polygon points="28,36 29,14 41,31" fill="${sp.ear}"/><polygon points="72,36 71,14 59,31" fill="${sp.ear}"/>`;
  const whiskers = sp.cat
    ? `<path d="M36 68 L16 64 M36 71 L16 73 M64 68 L84 64 M64 71 L84 73" stroke="#2b2118" stroke-width="0.8" fill="none"/>`
    : "";
  const blush = hash(id + 5) > 0.5 ? `<ellipse cx="30" cy="63" rx="5" ry="3" fill="#ff8fa3" opacity="0.45"/><ellipse cx="70" cy="63" rx="5" ry="3" fill="#ff8fa3" opacity="0.45"/>` : "";
  return `<ellipse cx="50" cy="118" rx="30" ry="34" fill="${sp.fur}"/>
<ellipse cx="50" cy="112" rx="15" ry="22" fill="${sp.light}"/>
${ears}
<polygon points="22,58 8,70 26,72" fill="${sp.fur}"/><polygon points="78,58 92,70 74,72" fill="${sp.fur}"/>
<ellipse cx="50" cy="56" rx="30" ry="26" fill="${sp.fur}"/>
<ellipse cx="50" cy="70" rx="15" ry="11" fill="${sp.light}"/>
<circle cx="38" cy="52" r="4.5" fill="#1d1a24"/><circle cx="62" cy="52" r="4.5" fill="#1d1a24"/>
<circle cx="39.6" cy="50.4" r="1.5" fill="#fff"/><circle cx="63.6" cy="50.4" r="1.5" fill="#fff"/>
<ellipse cx="50" cy="63" rx="5" ry="3.5" fill="#1d1a24"/>
<path d="M50 66 q-4 6 -9 3 M50 66 q4 6 9 3" stroke="#1d1a24" stroke-width="1.6" fill="none" stroke-linecap="round"/>
${blush}${whiskers}`;
}

/** Sky gradient, sun or moon, rolling hills, and a character in front, all blurred. */
function art(id: number): string {
  const [w, h] = SIZES[id % SIZES.length];
  const hue = Math.floor(hash(id) * 360);
  const night = id % 6 === 1;
  const sky1 = night ? `hsl(${hue},45%,12%)` : `hsl(${hue},65%,66%)`;
  const sky2 = night ? `hsl(${(hue + 40) % 360},40%,30%)` : `hsl(${(hue + 35) % 360},80%,84%)`;
  const sun = night ? "hsl(50,30%,92%)" : `hsl(${(hue + 20) % 360},95%,92%)`;
  // Blurred like a censored preview: the README shows the app, not the art.
  const blur = Math.min(w, h) * 0.025;
  // Everything is drawn this far past the edges, so the blur has colour to pull in, not transparency.
  const pad = Math.round(blur * 3);
  const ridge = (layer: number) => {
    const base = h * (0.6 + layer * 0.12);
    const pts = [`${-pad},${h + pad}`];
    const steps = 6 + layer * 2;
    for (let i = 0; i <= steps; i++) {
      const y = base - hash(id * 13 + layer * 101 + i) * h * (0.16 - layer * 0.04);
      pts.push(`${Math.round(-pad + (i / steps) * (w + 2 * pad))},${Math.round(y)}`);
    }
    pts.push(`${w + pad},${h + pad}`);
    const light = night ? 10 + layer * 5 : 52 - layer * 10;
    return `<polygon points="${pts.join(" ")}" fill="hsl(${(hue + 150 + layer * 15) % 360},30%,${light}%)" stroke-linejoin="round"/>`;
  };
  const scale = (Math.min(w, h) * 0.62) / 100;
  const cx = w * (0.38 + hash(id + 9) * 0.24);
  const sunX = cx < w / 2 ? w * 0.8 : w * 0.2;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
<defs><linearGradient id="s" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${sky1}"/><stop offset="1" stop-color="${sky2}"/></linearGradient>
<filter id="b" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="${blur.toFixed(1)}"/></filter></defs>
<g filter="url(#b)">
<rect x="${-pad}" y="${-pad}" width="${w + 2 * pad}" height="${h + 2 * pad}" fill="url(#s)"/>
<circle cx="${Math.round(sunX)}" cy="${Math.round(h * 0.22)}" r="${Math.round(Math.min(w, h) * 0.08)}" fill="${sun}"/>
${ridge(0)}${ridge(1)}
<g transform="translate(${Math.round(cx - 50 * scale)},${Math.round(h - 128 * scale)}) scale(${scale.toFixed(3)})">${character(id)}</g>
</g>
</svg>`;
}

/** Newest first; 5064 is 16:9, so the first slide fills the screen. */
const IDS = Array.from({ length: 60 }, (_, i) => 5064 - i);

function decorate(posts: ReturnType<typeof mockPost>[]) {
  for (const p of posts) {
    const [w, h] = SIZES[p.id % SIZES.length];
    for (const f of [p.files.original, p.files.preview, p.files.sample]) {
      f.width = w;
      f.height = h;
    }
    const total = Math.round(20 + hash(p.id + 3) * 480);
    p.stats.score = { up: total + 5, down: 5, total };
    p.stats.fav_count = Math.round(total * 1.4);
    const sp = speciesOf(p.id);
    p.tags = {
      general: TAG_SETS[p.id % TAG_SETS.length],
      artist: [["pawprint_studio", "fluffbutt_doodles", "tailwag_art"][p.id % 3]],
      species: sp.tag === "domestic_cat" ? ["felid", "feline", "domestic_cat"] : ["canid", "canine", sp.tag],
    };
  }
}

async function setup(page: Page, seed: Record<string, unknown> = {}): Promise<E621Mock> {
  const mock = await mockE621(page, IDS.map((id) => ({ id })));
  decorate(mock.posts);
  // Registered after mockE621's media route, so it wins.
  await page.route("https://static1.e621.net/**", (route) => {
    const id = Number(route.request().url().match(/\/(\d+)\.\w+$/)?.[1] ?? 1);
    return route.fulfill({ body: art(id), contentType: "image/svg+xml" });
  });
  await page.addInitScript((s) => {
    if (localStorage.getItem("e6ss:seeded")) return;
    localStorage.setItem("e6ss:seeded", "1");
    localStorage.setItem("e6ss:v1:playback", JSON.stringify({ intervalSec: 600, ...(s.playback as object) }));
    if (s.search) localStorage.setItem("e6ss:v1:search", JSON.stringify(s.search));
    if (s.creds) localStorage.setItem("e6ss:v1:creds", JSON.stringify(s.creds));
    localStorage.setItem("e6ss:v1:sections", JSON.stringify(s.sections ?? {}));
  }, seed);
  return mock;
}

const WOLFIE = { username: "wolfie", apiKey: "goodkey" };

/** Signed in as wolfie, following the three placeholder artists. */
async function signedIn(page: Page, seed: Record<string, unknown> = {}) {
  const mock = await setup(page, { creds: WOLFIE, ...seed });
  mock.subscriptions = ["pawprint_studio", "fluffbutt_doodles", "tailwag_art"];
  mock.lastSeen = 5058;
  return mock;
}

const phone = (page: Page) => page.setViewportSize({ width: 390, height: 844 });
const settle = (page: Page, ms = 1200) => page.waitForTimeout(ms);

// ---- shots --------------------------------------------------------------------

test("following on a phone", async ({ page }) => {
  await phone(page);
  await signedIn(page);
  await page.goto("/following");
  await expect(page.getByTestId("post-card").first()).toBeVisible();
  await settle(page);
  await shot(page, "phone-following");
});

test("artist page on a phone", async ({ page }) => {
  await phone(page);
  await signedIn(page);
  await page.goto("/artist/pawprint_studio");
  await expect(page.getByTestId("artist-stats")).toBeVisible();
  await settle(page, 1500);
  await shot(page, "phone-artist");
});

test("player on a phone", async ({ page }) => {
  await phone(page);
  await signedIn(page, { playback: { intervalSec: 600 } });
  await page.goto("/following");
  await page.getByTestId("play-fab").click();
  await expect(page.getByTestId("player")).toBeVisible();
  await settle(page, 1500);
  await shot(page, "phone-player");
});

test("grid on a computer", async ({ page }) => {
  await signedIn(page);
  await page.goto("/following");
  await page.getByTestId("grid-toggle").click();
  await expect(page.getByTestId("grid-tile").first()).toBeVisible();
  await settle(page, 1500);
  await shot(page, "desktop-grid");
});

test("following on a computer", async ({ page }) => {
  await signedIn(page);
  await page.goto("/following");
  await expect(page.getByTestId("post-card").first()).toBeVisible();
  await settle(page);
  await shot(page, "desktop-following");
});

test("player with Post info on a computer", async ({ page }) => {
  await signedIn(page);
  await page.goto("/following");
  await page.getByTestId("play-fab").click();
  await expect(page.getByTestId("player")).toBeVisible();
  await page.getByTestId("info-button").click();
  await expect(page.getByTestId("sheet-info")).toBeVisible();
  await settle(page, 1200);
  await shot(page, "desktop-player-info");
});

for (const style of ["prints", "kenburns", "collage", "reflections"] as const) {
  test(`style ${style}`, async ({ page }) => {
    await signedIn(page, { playback: { style, intervalSec: 600 } });
    await page.goto("/following");
    await page.getByTestId("play-fab").click();
    await expect(page.getByTestId("player")).toBeVisible();
    if (style === "collage") {
      // The collage keeps the last three posts.
      await page.keyboard.press("ArrowRight");
      await page.waitForTimeout(800);
      await page.keyboard.press("ArrowRight");
    }
    await settle(page, 1500);
    // the controls fade when the pointer rests
    await page.mouse.move(640, 420);
    await expect(page.getByTestId("controls")).toHaveAttribute("data-visible", "false", { timeout: 6000 });
    await shot(page, `style-${style}`);
  });
}
