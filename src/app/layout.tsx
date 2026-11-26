import type { Metadata, Viewport } from "next";
import { Fredoka } from "next/font/google";
import ClientShell from "@/shell/ClientShell";
import { LINK_FRAGMENT_SCRIPT } from "./link-fragment";
import "./globals.css";

// The rounded voice (DESIGN.md Typography): Fredoka 600 for titles and names, 500 for small labels.
// Downloaded at build time and served from our own origin, so pages make no Google request.
const fredoka = Fredoka({ subsets: ["latin"], weight: ["500", "600"], variable: "--font-fredoka", display: "swap" });

export const metadata: Metadata = {
  title: "e621 Slideshow",
  description: "Full-screen slideshow for e621 searches",
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  themeColor: "#000000",
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`h-full ${fredoka.variable}`}>
      <head>
        <script dangerouslySetInnerHTML={{ __html: LINK_FRAGMENT_SCRIPT }} />
      </head>
      <body className="min-h-full bg-black text-neutral-100 antialiased">
        <ClientShell />
        {children}
      </body>
    </html>
  );
}
