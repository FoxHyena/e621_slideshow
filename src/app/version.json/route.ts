/**
 * Which build this deploy serves (DESIGN.md "Install, update and the app icon"): an open app asks
 * when it comes back to the front, and every half hour, so a deploy reaches it without a relaunch
 * (`src/shell/pwa.ts`). Written once per build; the app asks with `cache: "no-store"`, and the service
 * worker leaves it alone (not a build file, not a page).
 */
export const dynamic = "force-static";

export function GET(): Response {
  return Response.json({ build: process.env.NEXT_PUBLIC_BUILD_ID ?? "dev" });
}
