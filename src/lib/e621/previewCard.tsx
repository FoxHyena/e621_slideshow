import { ImageResponse } from "next/og";
import { arcPath, bendsFor, BENDS_GEOMETRY as G } from "../bends";
import { RATING_NAME } from "./preview";
import type { Rating } from "./types";

/** The drawn preview card (DESIGN.md "The link's preview"); `src/app/post/[id]/card/route.tsx` serves it. */

/** The artist's Bends on the raised disc, as an svg picture (the card's renderer takes svg as an image). */
export function markSvg(seed: string): string {
  const b = bendsFor(seed);
  return [
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="-1 -1 2 2">`,
    `<circle r="1" fill="#1F3C67"/>`,
    `<path d="${arcPath(G.outer, b.a[0], b.w[0])}" fill="none" stroke="${b.colors[0]}" stroke-width="${G.stroke}" stroke-linecap="round"/>`,
    `<path d="${arcPath(G.inner, b.a[1], b.w[1])}" fill="none" stroke="${b.colors[1]}" stroke-width="${G.stroke}" stroke-linecap="round"/>`,
    `<circle r="${Math.round(b.dot * 1e4) / 1e4}" fill="${b.colors[2]}"/>`,
    `</svg>`,
  ].join("");
}

/** `artist` and `rating` null: e621 didn't answer, so the card has the number only. */
export function drawCard({ id, artist, rating, font }: { id: number; artist: string | null; rating: Rating | null; font: ArrayBuffer | null }) {
  const name = artist ? artist.replaceAll("_", " ") : "unknown artist";
  const mark = `data:image/svg+xml;base64,${Buffer.from(markSvg(artist ?? `post:${id}`)).toString("base64")}`;
  // no face at all when Fredoka couldn't be had: an undefined font-family stops the renderer
  const face = font ? { fontFamily: "Fredoka" } : {};
  return new ImageResponse(
    <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", background: "#152F56", color: "#FFFFFF", padding: 80, ...face }}>
      <div style={{ display: "flex", alignItems: "center", flex: 1 }}>
        {/* eslint-disable-next-line @next/next/no-img-element -- the card's renderer, not a page */}
        <img src={mark} width={200} height={200} alt="" style={{ borderRadius: 999, boxShadow: "0 0 0 2px rgba(2,15,35,0.35)" }} />
        <div style={{ display: "flex", flexDirection: "column", marginLeft: 48, minWidth: 0, flex: 1 }}>
          <div style={{ fontSize: 76, fontWeight: 600, lineHeight: 1.1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{name}</div>
          <div style={{ fontSize: 40, fontWeight: 600, color: "#A0ADC1", marginTop: 16 }}>{rating ? `#${id} · ${RATING_NAME[rating]}` : `#${id}`}</div>
        </div>
      </div>
      <div style={{ display: "flex", justifyContent: "flex-end", fontSize: 44, fontWeight: 600, letterSpacing: "-0.005em" }}>
        <span style={{ color: "#B4C7D9" }}>e</span>
        <span>Licks</span>
        <span style={{ color: "#B4C7D9" }}>21</span>
      </div>
    </div>,
    {
      width: 1200,
      height: 630,
      fonts: font ? [{ name: "Fredoka", data: font, weight: 600, style: "normal" }] : undefined,
      // a card drawn short (no Fredoka, or e621 didn't answer) is kept 5 minutes, not a day
      headers: { "Cache-Control": font && rating ? "public, max-age=3600, s-maxage=86400" : "public, max-age=300, s-maxage=300" },
    },
  );
}

/** Fredoka 600 for the card, from Google Fonts once per server (no visitor's data in the ask), else the default face. */
let fontAsk: Promise<ArrayBuffer | null> | null = null;
export function fredoka(): Promise<ArrayBuffer | null> {
  fontAsk ??= (async () => {
    try {
      // without a browser's User-Agent Google answers with a TrueType file, which the renderer reads
      const css = await (await fetch("https://fonts.googleapis.com/css2?family=Fredoka:wght@600", { signal: AbortSignal.timeout(3000) })).text();
      const src = css.match(/src:\s*url\(([^)]+)\)\s*format\('(?:truetype|opentype)'\)/)?.[1];
      if (!src) return null;
      const res = await fetch(src, { signal: AbortSignal.timeout(3000) });
      return res.ok ? await res.arrayBuffer() : null;
    } catch {
      return null;
    }
  })().then((f) => {
    if (!f) fontAsk = null; // try again next time
    return f;
  });
  return fontAsk;
}
