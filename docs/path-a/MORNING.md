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
6. **Built without a mock (slice 5):**
   - Follow from favorites as a sheet from Artists › Suggested: the first run's pick list in a titled
     sheet, the gold button as its footer; following closes it.
   - The toast after a bulk follow: "Following 10 artists", and under it "2 skipped: name (why), …"
     when e621 skipped some.
   - Suggested's "Not interested" (in the card's ⋯): the card goes, toast "Won't suggest X" with Undo.
   - The Artists row ⋯ sheet: Open artist, Share (a link to the artist page here), Unfollow.
   - Following › Artists with no one followed: "You don't follow anyone yet" / "Suggested has artists you
     favorite a lot."
7. **Copy I wrote (slice 5):** "No artist turns up often enough in your favorites to suggest yet." (first run,
   favorites but no artist with 3+); "No one new to suggest. Favorite more and check back." (Suggested
   empty); "Couldn't read who you follow" (Artists error); the read's sub line "640 of 1,284 · about 2 s"
   (estimated from 320 favorites a page, about a second each); Suggested cards say "You faved 8 of 140"
   (DESIGN.md's card line; UX.md's longer "of their 140 posts · posted 4d ago" didn't fit next to Follow on
   a phone).

## Try in the app (steps)

(Filled in at Phase 7 with the local URL.)

## Decide (open questions, with my default)

1. **Does un-favoriting remove goo?** Default: no, goo only ever adds.
2. **The first-run step names** ("Read your favorites", "Count your artists", "See who still posts") were
   proposed by the design session, not confirmed by you. Default: use them.
3. **The Following suggestion card** (UX.md: a card in the Following feed offering artists) isn't built.
   Default: leave it to slice 9 polish, since the first run and Artists › Suggested cover the same need.
4. **Artists › Following lists every tag you follow**, not only artist tags (e621 follows are any tag, and
   telling them apart costs a lookup). Default: list them all.
5. **Hidden suggestions ("Not interested") are kept on this device** like Tune's pins and mutes (not purged
   on sign-out, not tied to Remember). Default: keep it that way; they hold no account data.

## Needs you (things I held)

1. **Live `tag_subscriptions` POST check** with you signed in (a write to your e621 account). Tested
   against the mock only. This now covers Follow from favorites too (one POST with every picked name).
2. **The live artist-score backtest** needs your account's favorites (read-only, no writes). Put your
   username and API key in `.env.backtest` (gitignored), then run
   `node_modules/.bin/jiti scripts/rec-backtest.ts --artists`. It prints recall@10 of hidden favorites'
   artists for the score against the raw favorite count. The synthetic run in the unit tests is the only
   one so far (score 49 of 115, raw count 50 of 115: even, as expected, since the score trades volume for
   share).
