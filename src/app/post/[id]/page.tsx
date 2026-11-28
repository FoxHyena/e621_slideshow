import type { Metadata } from "next";
import { headers } from "next/headers";
import { previewMetadata, previewPost } from "@/lib/e621/preview";

/** The link's preview (DESIGN.md "A post on its own"): the server answers with the post's title and picture. */
export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const origin = siteOrigin(await headers());
  if (!origin || !/^\d{1,10}$/.test(id)) return {};
  const n = Number(id);
  return previewMetadata(n, await previewPost(n), origin);
}

/** This site's address as the visitor asked for it (behind Vercel's proxy: the forwarded host); null if it doesn't parse. */
function siteOrigin(h: Headers): string | null {
  const first = (v: string | null) => v?.split(",")[0].trim() || null;
  const host = first(h.get("x-forwarded-host")) ?? first(h.get("host"));
  const proto = first(h.get("x-forwarded-proto")) ?? (host?.startsWith("localhost") ? "http" : "https");
  try {
    return host ? new URL(`${proto}://${host}`).origin : null;
  } catch {
    return null;
  }
}

// The shell in the root layout renders every screen; this file only gives the URL a real response.
export default function Page() {
  return null;
}
