import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { NextConfig } from "next";

const { version } = JSON.parse(readFileSync(join(import.meta.dirname, "package.json"), "utf8")) as { version: string };

const nextConfig: NextConfig = {
  // A pnpm-workspace.yaml further up the tree would otherwise be picked as the root.
  turbopack: { root: import.meta.dirname },
  // The dev badge sits on top of the slideshow corner.
  devIndicators: false,
  // Settings shows it under the app mark; inlined at build time.
  env: { APP_VERSION: version },
};

export default nextConfig;
