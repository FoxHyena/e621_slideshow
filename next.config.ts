import { execSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { NextConfig } from "next";

const { version } = JSON.parse(readFileSync(join(import.meta.dirname, "package.json"), "utf8")) as { version: string };
const isDev = process.env.NODE_ENV === "development";

/** One id per deploy, the same in every build worker: the commit (Vercel's, else git's), else the version. */
function buildId(): string {
  if (process.env.VERCEL_GIT_COMMIT_SHA) return process.env.VERCEL_GIT_COMMIT_SHA.slice(0, 12);
  try {
    const sha = execSync("git rev-parse --short=12 HEAD", { cwd: import.meta.dirname, stdio: ["ignore", "pipe", "ignore"] }).toString().trim();
    // uncommitted work: the diff itself names the build, so two local builds of different edits differ
    const diff = execSync("git diff HEAD", { cwd: import.meta.dirname, stdio: ["ignore", "pipe", "ignore"], maxBuffer: 64 << 20 }).toString();
    return diff ? `${sha}-${createHash("sha1").update(diff).digest("hex").slice(0, 8)}` : sha;
  } catch {
    return version;
  }
}

/**
 * The CSP (ENGINEERING.md §9): the page may talk to itself and e621 and nothing else, so an injected
 * script can't send the API key anywhere but e621. Scripts keep 'unsafe-inline' for Next's inline
 * bootstrap and the link-fragment script (nonces would make every page dynamic; DECISIONS slice 8).
 */
const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  `connect-src 'self' https://e621.net${isDev ? " ws: wss:" : ""}`,
  "img-src 'self' data: blob: https://static1.e621.net",
  "media-src 'self' blob: https://static1.e621.net",
  "font-src 'self'",
  "worker-src 'self'",
  "manifest-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
].join("; ");

const nextConfig: NextConfig = {
  // A pnpm-workspace.yaml further up the tree would otherwise be picked as the root.
  turbopack: { root: import.meta.dirname },
  // The dev badge sits on top of the slideshow corner.
  devIndicators: false,
  env: {
    // Settings shows it under the app mark; inlined at build time.
    APP_VERSION: version,
    // The service worker's cache names and the update check carry it: one per deploy.
    NEXT_PUBLIC_BUILD_ID: buildId(),
  },
  async headers() {
    return [
      { source: "/(.*)", headers: [{ key: "Content-Security-Policy", value: csp }] },
      {
        // Always asked fresh, so a deploy reaches installed apps on their next check.
        source: "/sw.js",
        headers: [
          { key: "Cache-Control", value: "no-cache" },
          { key: "Content-Type", value: "application/javascript; charset=utf-8" },
          { key: "Service-Worker-Allowed", value: "/" },
        ],
      },
    ];
  },
};

export default nextConfig;
