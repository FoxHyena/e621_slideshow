import { previewArtist, previewPost } from "@/lib/e621/preview";
import { drawCard, fredoka } from "@/lib/e621/previewCard";

/**
 * The drawn preview (DESIGN.md "The link's preview"): for a post e621 hides from signed-out visitors,
 * whose picture the server can't fetch. 1200 by 630, the panel's navy, the artist's mark, the name in
 * the display face, "#… · Explicit", the wordmark at the bottom right. No art.
 */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^\d{1,10}$/.test(id)) return new Response("Not found", { status: 404 });
  // the page's tags already point here: if e621 doesn't answer now, still draw (the number only), never a broken picture
  const [post, font] = await Promise.all([previewPost(Number(id)), fredoka()]);
  return drawCard({ id: Number(id), artist: post && previewArtist(post), rating: post?.rating ?? null, font });
}
