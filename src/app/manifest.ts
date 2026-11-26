import type { MetadataRoute } from "next";

/** The installed app (DESIGN.md "Install, update and the app icon"; icons from scripts/make-icons.ts). */
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/following",
    name: "e621 Slideshow",
    short_name: "Slideshow",
    description: "Follow artists on e621 and play their new posts as a slideshow",
    start_url: "/following",
    scope: "/",
    display: "standalone",
    background_color: "#020F23",
    theme_color: "#020F23",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      // the same drawing: the mark and its glow stay inside the 80% safe circle
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
      { src: "/icons/mono-512.png", sizes: "512x512", type: "image/png", purpose: "monochrome" },
    ],
  };
}
