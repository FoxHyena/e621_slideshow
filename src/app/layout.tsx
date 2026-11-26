import type { Metadata, Viewport } from "next";
import { Fredoka } from "next/font/google";
import ClientShell from "@/shell/ClientShell";
import { INSTALL_PROMPT_SCRIPT, LINK_FRAGMENT_SCRIPT } from "./link-fragment";
import "./globals.css";

// The rounded voice (DESIGN.md Typography): Fredoka 600 for titles and names, 500 for small labels.
// Downloaded at build time and served from our own origin, so pages make no Google request.
const fredoka = Fredoka({ subsets: ["latin"], weight: ["500", "600"], variable: "--font-fredoka", display: "swap" });

export const metadata: Metadata = {
  title: "e621 Slideshow",
  description: "Full-screen slideshow for e621 searches",
  robots: { index: false, follow: false },
  applicationName: "e621 Slideshow",
  icons: {
    icon: [
      { url: "/icons/favicon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/icons/favicon-16.png", sizes: "16x16", type: "image/png" },
    ],
    apple: [{ url: "/icons/apple-icon-180.png", sizes: "180x180" }],
  },
  // iPhone's Add to Home Screen: full screen, the short name under the icon.
  appleWebApp: { capable: true, title: "Slideshow", statusBarStyle: "black-translucent" },
};

export const viewport: Viewport = {
  // Ground (DESIGN.md "Names and colours"): the browser bar and the launch screen.
  themeColor: "#020F23",
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`h-full ${fredoka.variable}`}>
      <head>
        <script dangerouslySetInnerHTML={{ __html: LINK_FRAGMENT_SCRIPT + INSTALL_PROMPT_SCRIPT }} />
      </head>
      <body className="min-h-full bg-black text-neutral-100 antialiased">
        <ClientShell />
        {children}
      </body>
    </html>
  );
}
