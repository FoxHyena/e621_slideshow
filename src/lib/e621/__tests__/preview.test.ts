import { afterEach, describe, expect, it, vi } from "vitest";
import { makePost } from "../../__tests__/fixtures";
import { PREVIEW_UA, previewMetadata, previewPost } from "../preview";
import { drawCard } from "../previewCard";

const ORIGIN = "https://example.test";

describe("a post link's preview (DESIGN.md 'The link's preview')", () => {
  it("names the artist, says the numbers, and shows the sample whatever the rating", () => {
    const post = makePost({
      id: 77,
      rating: "e",
      tags: { artist: ["conditional_dnp", "some_artist"] },
      stats: { score: { up: 1300, down: 0, total: 1234 }, fav_count: 56 },
    });
    const m = previewMetadata(77, post, ORIGIN);
    expect(m.openGraph).toMatchObject({
      siteName: "eLicks21",
      title: "some artist on eLicks21",
      description: "Post #77 on e621 · 1.2K score · 56 favorites",
      url: "/post/77",
      images: [{ url: "https://static1.e621.net/data/sample/77.jpg", width: 850, height: 680 }],
    });
    expect(m.twitter).toMatchObject({ card: "summary_large_image", title: "some artist on eLicks21" });
    expect(String(m.metadataBase)).toBe(`${ORIGIN}/`);
    // the tab's own title stays the app's
    expect(m.title).toBeUndefined();
  });

  it("a post e621 hides from signed-out visitors gets the drawn card", () => {
    const post = makePost({ id: 78, rating: "e", original: { url: null }, sample: { jpg: null }, tags: { artist: ["some_artist"] } });
    expect(previewMetadata(78, post, ORIGIN).openGraph).toMatchObject({ images: [{ url: "/post/78/card", width: 1200, height: 630 }] });
  });

  it("a picture a chat app won't take (too narrow, or a big original with no sample) gives way to the thumbnail, then the card", () => {
    const narrow = makePost({ id: 85, sample: { width: 200, height: 150 } });
    expect(previewMetadata(85, narrow, ORIGIN).openGraph).toMatchObject({ images: [{ url: "/post/85/card" }] });
    const big = makePost({ id: 86, meta: { has_sample: false, size: 9_000_000 } });
    big.files.preview = { width: 300, height: 240, jpg: "https://static1.e621.net/data/preview/86.jpg", webp: null };
    expect(previewMetadata(86, big, ORIGIN).openGraph).toMatchObject({ images: [{ url: "https://static1.e621.net/data/preview/86.jpg", width: 300 }] });
  });

  it("no artist: the post's number; a post that can't be found keeps the site's preview", () => {
    const post = makePost({ id: 79, tags: { artist: ["unknown_artist"] } });
    expect(previewMetadata(79, post, ORIGIN).openGraph).toMatchObject({ title: "Post #79 on eLicks21" });
    expect(previewMetadata(80, null, ORIGIN)).toEqual({ metadataBase: new URL(ORIGIN) });
  });
});

describe("asking e621 for the preview", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("asks signed out, naming the app, and a deleted post or a failure is none", async () => {
    const asks: [string, RequestInit][] = [];
    const answer = vi.fn<() => Promise<Response>>();
    vi.stubGlobal("fetch", (url: string, init: RequestInit) => {
      asks.push([url, init]);
      return answer();
    });
    answer.mockResolvedValueOnce(Response.json([makePost({ id: 81 })]));
    expect((await previewPost(81))?.id).toBe(81);
    expect(asks[0][0]).toBe("https://e621.net/posts.json?tags=id:81&limit=1&mode=extended");
    expect(asks[0][1].headers).toEqual({ "User-Agent": PREVIEW_UA });

    // asked again soon: kept, not asked twice
    expect((await previewPost(81))?.id).toBe(81);
    expect(asks).toHaveLength(1);

    answer.mockResolvedValueOnce(Response.json([makePost({ id: 82, flags: { deleted: true } })]));
    expect(await previewPost(82)).toBeNull();
    answer.mockResolvedValueOnce(new Response("", { status: 503 }));
    expect(await previewPost(83)).toBeNull();
    answer.mockRejectedValueOnce(new DOMException("timed out", "TimeoutError"));
    expect(await previewPost(84)).toBeNull();
    // Cloudflare's challenge page comes back 200 as HTML: none, and not kept
    answer.mockResolvedValueOnce(new Response("<html>challenge</html>", { headers: { "content-type": "text/html" } }));
    expect(await previewPost(87)).toBeNull();
    answer.mockResolvedValueOnce(Response.json([makePost({ id: 87 })]));
    expect((await previewPost(87))?.id).toBe(87);
  });
});

describe("the drawn card", () => {
  it("is a 1200 by 630 picture; drawn short (no font, or e621 silent) it is kept 5 minutes, not a day", async () => {
    expect(drawCard({ id: 78, artist: "some_artist", rating: "e", font: new ArrayBuffer(0) }).headers.get("cache-control")).toContain("s-maxage=86400");
    expect(drawCard({ id: 78, artist: null, rating: null, font: new ArrayBuffer(0) }).headers.get("cache-control")).toBe("public, max-age=300, s-maxage=300");
    const res = drawCard({ id: 78, artist: "some_artist", rating: "e", font: null });
    expect(res.headers.get("cache-control")).toBe("public, max-age=300, s-maxage=300");
    const png = new Uint8Array(await res.arrayBuffer());
    const view = new DataView(png.buffer);
    expect([...png.slice(1, 4)].map((c) => String.fromCharCode(c)).join("")).toBe("PNG");
    expect([view.getUint32(16), view.getUint32(20)]).toEqual([1200, 630]);
  });
});
