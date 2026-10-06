import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "e621 Slideshow",
  description: "Full-screen slideshow for e621 searches",
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  themeColor: "#000000",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full">
      <body className="h-full overflow-hidden bg-black text-neutral-100 antialiased">{children}</body>
    </html>
  );
}
