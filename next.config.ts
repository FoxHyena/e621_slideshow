import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // A pnpm-workspace.yaml further up the tree would otherwise be picked as the root.
  turbopack: { root: import.meta.dirname },
  // The dev badge sits on top of the slideshow corner.
  devIndicators: false,
};

export default nextConfig;
