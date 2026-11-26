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
6. **Slice 5 now follows the design session's proposed Artists mock** (DESIGN.md "Artists: Suggested, the
   sheet, the row menus, Popular artists", itself not owner-approved): the row ⋯ menus (Share artist, Open
   on e621, Unfollow not in red; Not interested, Open on e621), "Hidden from suggestions" with Undo,
   "Not enough favorites yet", the filter's "1 of 3" count, the skipped toast ("2 skipped: a, b and 3
   more", no reasons), and Popular artists under "Find artists to follow".
7. **Built without a mock (slice 5):**
   - Popular artists: after you follow one, the list stays up so you can follow more, and a tonal "Show my
     feed" appears under it. The mock shows only the toast. If e621's tag list doesn't answer, Popular
     today shows instead.
   - Following › Artists with no one followed: "You don't follow anyone yet" / "Suggested has artists you
     favorite a lot."
   - Suggested when you already follow everyone it would suggest: "No one new to suggest" / "You follow
     every artist you favorite a lot. Favorite more and check back."
8. **Copy I wrote (slice 5):** "No artist turns up often enough in your favorites to suggest yet." (first run,
   favorites but no artist with 3+); "Couldn't read who you follow" (Artists error); the read's sub line
   "640 of 1,284 · about 2 s" (estimated from 320 favorites a page, about a second each); post counts read
   "18.2K" (the app's existing number format) where the mock says "18.2k".

9. **The artist page (slice 6)** follows DESIGN.md "Artist page" (approved) and the proposed "artist page's
   edges" (No artist called "x", a tag that isn't an artist with "Follow tag", the 500 note, Share's "Link
   copied", ⋯ with Copy link and Open on e621). Built without a mock:
   - The chips are Results' five (Media, Hide favorited, Sort, Date, Score); the mock's row shows "New"
     where UX.md has Sort. They live in the URL (`/artist/x?…`), so a reload or a pasted link keeps them.
   - With filters on and nothing left: "No posts match" with Reset filters, as on Results.
   - The compact bar on a tag that isn't an artist shows a small tag well where the mark would be.
   - The posts well holds its place (blank) while e621's count loads, so the wells don't jump.

10. **Settings' pages and the sign-in sheet (slice 7)** follow the proposed batch 3 and the approved
   sign-in sheet. My calls:
   - Remember starts on, as drawn (off when you change the key of a session kept without it).
   - Content's "Your e621 blacklist" is a **Sync** button, not the mock's switch: your e621 list is
     already merged at every sign-in, so a switch would have nothing to turn off.
   - "Your favorites" shows a count only once your favorites have been read; otherwise "On e621".
   - Slideshow: "Reset to defaults" at the bottom; Fit and Transition only for Classic, as in Quick
     settings. App: the shortcut list and the userscript note are my words.
   - **Built without a mock:** Settings › App › "Classic slideshow" opens the old one-page app (now at
     `/settings/classic`) until its flows are ported.

11. **The installed app (slice 8)** follows the proposed batch 4. My calls:
   - **The app mark changed** to what DESIGN.md describes (8-fold, gold, cream and link blue). Settings and
     the caught-up divider showed two different random marks before. The app icon is the same drawing.
   - Settings › App's update row reads "You have 0.1.0; a new version is ready" with Reload (the mock's
     "2.1 is ready" needs a version number the old page can't know).
   - The browser bar colour is now Ground (#020F23), as designed, not black.
   - Built without a mock: the install sheet's text when the browser starts offering Install while it is
     open ("Close this and use Install in Settings › App").

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

6. **"you faved" on the artist page shows only once your favorites have been read** (by For You or Artists ›
   Suggested). A cold visit to `/artist/x` doesn't read your favorites just for that number. Default: keep
   it that way (reading can take a minute on a big account).
7. **Delete the classic one-page app** once its 66 e2e flows are ported to the new screens. Default:
   keep it behind Settings › App › Classic slideshow until then.
8. **"What's new"** in Settings › App isn't built (no changelog yet). Default: leave it out.
## Needs you (things I held)

1. **Live `tag_subscriptions` POST check** with you signed in (a write to your e621 account). Tested
   against the mock only. This now covers Follow from favorites too (one POST with every picked name).
2. **The live artist-score backtest** needs your account's favorites (read-only, no writes). Put your
   username and API key in `.env.backtest` (gitignored), then run
   `node_modules/.bin/jiti scripts/rec-backtest.ts --artists`. It prints recall@10 of hidden favorites'
   artists for the score against the raw favorite count. The synthetic run in the unit tests is the only
   one so far (score 49 of 115, raw count 50 of 115: even, as expected, since the score trades volume for
   share).
3. **Install on your iPhone** (Phase 6 can't): the Share button's place in your Safari (the "under •••"
   hint), the icon on your home screen, and that the installed app asks you to sign in once.
