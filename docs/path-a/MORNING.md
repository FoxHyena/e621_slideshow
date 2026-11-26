# Morning list

Built overnight (2026-11-26). Most important first in each group. The local URL and try-it list go
at the top once Phase 7 hands over.

## Approve (design or copy I chose)

1. **Goo's drops count toward the goo.** Tapping Goo spurts 1–3 drops onto the tab bar's goo, and they
   count toward the "N favorites" line in Settings. Goo is pointer-only (no keyboard focus, no label).
   Easy to change: `src/components/Goo.tsx` `poke`.
2. **State copy I wrote** (DECISIONS 2026-11-26):
   - "You don't follow anyone yet" / "Tap Follow on an artist, and their new posts show up here first."
   - "No favorites yet" / "Tap the heart on a post and it shows up here."
   - "Nothing new for you" / "Nothing in this date window yet. A wider Date finds more."
   - "No posts by X" / "e621 has no posts under this name yet."
   - "Nothing popular right now" / "Popular fills up through the day. Check back soon."
   - Favorites signed out: "Your favorites live on e621" / "Sign in to see them here."
3. **"Popular today" under For You's signed-out block**, built like the Following landing. Play waits
   until the block scrolls away.
4. **"Edit search"** as the way out of "No posts match" when no filter is on.
5. **From R2b:** Post info's Artists group (only with 2+ artists), "Open" as an artist tag's first
   target, the tag targets' blurred shadow.

## Try in the app (steps)

(Filled in at Phase 7 with the local URL.)

## Decide (open questions, with my default)

1. **Does un-favoriting remove goo?** Default: no, goo only ever adds.
2. **The first-run step names** ("Read your favorites", "Count your artists", "See who still posts") were
   proposed by the design session, not confirmed by you. Default: use them.

## Needs you (things I held)

1. **Live `tag_subscriptions` POST check** with you signed in (a write to your e621 account). Tested
   against the mock only.
