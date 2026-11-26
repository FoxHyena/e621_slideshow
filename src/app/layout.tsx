import type { Metadata, Viewport } from "next";
import { Nunito } from "next/font/google";
import ClientShell from "@/shell/ClientShell";
import { LINK_FRAGMENT_SCRIPT } from "./link-fragment";
import "./globals.css";

// The rounded voice off Apple (DESIGN.md Typography); downloaded at build time and served
// from our own origin, so pages make no Google request.
const nunito = Nunito({ subsets: ["latin"], weight: ["700", "800"], variable: "--font-nunito", display: "swap" });

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
    <html lang="en" className={`h-full ${nunito.variable}`}>
      <head>
        <script dangerouslySetInnerHTML={{ __html: LINK_FRAGMENT_SCRIPT }} />
      </head>
      <body className="h-full overflow-hidden bg-black text-neutral-100 antialiased">
        <ClientShell />
        {children}
      </body>
    </html>
  );
}
