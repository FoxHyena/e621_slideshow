# Morning list

Built overnight (2026-11-26). Most important first in each group.

## Start here (10 minutes)

- **Open:** http://localhost:3640 (production build, already running).
- **On your phone** (same Wi-Fi): http://192.168.1.21:3640
- **Draft PR:** https://github.com/FoxHyena/e621_slideshow/pull/24 (not merged).
- **If the server is gone:** `pnpm build && pnpm start --port 3640 -H 0.0.0.0` (about 1 minute).

1. Settings › Sign in with your username and API key (Remember on). Following shows what's new.
2. Tap Play (bottom left). Swipe or ←/→, tap ⓘ for Post info, Esc or ✕ to leave.
3. Artists › Suggested: who you favorite a lot. Open one for the artist page. (Follow writes to
   e621: that's the held check, Needs you 1.)
4. Make the window wider than 900 px: sidebar, the 600 column, Post info beside the picture.
5. Go through "Approve" below and strike what you'd change.

## Approve (design or copy I chose)

**You approved 1–15 on 2026-11-26** (1 yes, 2 looks good, 3–5 yes, 6–8 nice, 9 ok, the rest look good).
New since then, from your notes:

- **A grid tile opens the feed at that post** (12 from the top), not the slideshow. Hold or right-click
  a tile for "Play from here". Back doesn't return to the grid (the grid isn't a place in history); the
  grid button does.
- **Follow from favorites: rows now get the Inset wash** you picked (8 wider than the row, 16 corners),
  so it no longer looks cut at the avatar. The empty check well still lifts under the pointer.
- Fixed in passing: a tile tapped in the first 0.6 s after the page loaded did nothing.
- On Following, a tile for a post folded into "+N more" opens that run first, then lands on the post.
- **← in the slideshow no longer looks like a reload.** It faded out the wrong picture (the one before
  the post you went back to) over a black fade-in. Now the post you left fades out, as going forward.
  In Reflections, ← slides the other way.

Built from your picks on the design session's sheet (2026-11-26):

- **Chips drop their menu under themselves** (Sort, Media, Date, Score, From a link, the Artists sort), on a
  phone and a computer. No title, no ✕, no Done, no dim. Media applies when you tap outside or press Esc.
  The chip's arrow points up while it's open. Custom's Apply is tonal.
- **One head on a computer:** in grid view the title row, the artist hero and the chips stay in the 600
  column; only the tiles go wide. Nothing above the tiles moves when you switch views.
- **Lift:** under a mouse, buttons with a lip (tonal, gold, Play, Follow, the heart, the stepper) rise 1
  and their lip grows by 1. No colour change any more.
- **The top bar is a floating capsule** after 64 px of scroll on Following, For You, Artists and Settings
  (title, the new count in gold on Following, the tools), and on the artist page (Back, mark, name,
  Follow). Same on a phone (16 from the sides) and a computer (584 wide over the column).
- **← in Vintage Prints** (your note): it sat on the post you left. Fixed, and the same in Collage. ←
  now dips to black and fades up the earlier post, like →.
- **"+N" on a post's tags** (your screenshot) now opens the rest of the tags in the same row; scroll it
  sideways. The card keeps its height, so the feed doesn't jump.
- **Toast "Ring, hug"** was already in: the ring around Undo, and the toast is as wide as its words.
- **The tools capsule's hover** is 40 by 36, 4 inside the capsule (approved with the hover pass).

Built from the hover pass, Inset rows and grid loading you approved:

- **Under a mouse:** chips that are off, round Back and the field's ✕ go one step lighter; the post ⋯,
  bare Back and "Skip for now" get a 6% wash and turn white; wells (sheet ✕, Undo, tags, the Search
  field) wash too; menu rows, segmented parts and tabs only turn white; the player's glass rim brightens.
  Pictures don't change.
- **Rows: Inset.** The wash floats 4 inside the row with the container's corners less the gap (20 in a
  panel, 12 in a well, 16 on a sheet or dropdown, 8 wider there). The lines next to it fade. Same for a
  press on a phone. Try Settings with a mouse.
- **Grid loading:** skeleton tiles on the first load (12 on a phone, 3 rows on a computer) and one row
  under the last tiles while more load, instead of the spinner.
- **The app icon is the gold hexagon with Play** (install the app again, or look at the browser tab).
  **Inside the app the mark is the navy hexagon with gold Play** (sidebar, "You're all caught up",
  the foot of Settings). The kaleidoscope is gone.
- **The hexagon pops** the first time "You're all caught up" scrolls into view, and when you tap it in
  Settings (you approved it).
- **Your note: the title vanished for a moment when scrolling back up** (Settings, and the same on
  Following, For You and Artists). Fixed on all four: the title is back in the page at once; only the
  capsule's shape fades.
- **Search suggestions** were already the flat 48 rows. An artist suggestion now shows its 24 mark and
  the name in white, "artist" at the right.
- **The goo pools (you picked Pool and jar row).** On a computer the goo collects in the sidebar's
  foot; on a phone it rises in Settings' "Tab bar goo" card. Words under it show in Goo Ink. My
  choice: no pool at all with 0 favorites, on a computer too. Not built yet (not designed): the drop
  flying in, the level rising smoothly, the pool draining on Wipe clean.

Approved:

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

12. **Toasts (slice 9a)** follow the proposed batch 1 "Toast". My calls:
   - On screens without Play the toast sits just above the tab bar, not at Play's height.
   - Failures ("Couldn't …", a post that didn't load) wear the red mark; a toast with no icon of its own
     wears an info mark.
   - The Undo ring pauses while the pointer is over the toast (sonner's timer does too), not on focus.
   - Popular artists shows a skeleton (4 rows) while e621's tag list loads, instead of a spinner.

13. **On a computer (slice 9b)** follows the proposed batch 5. My calls:
   - Every sheet opens as a 420 dialog in the middle, including the ones the design wants as popovers at
     the chip, ⋯, tile or tag that opened them (Decide 9).
   - The sidebar's account row opens Settings; signed out it reads "Not signed in" / "Sign in".
   - Following's count badge shows on the sidebar only (the phone's tab bar has none yet).
   - Built without a mock: Search, Artists and the artist page on a computer (the 600 column, as the design
     says), and the 68 sidebar's tooltips (the browser's own).
   - A grid tile's menu (batch 2, "Holding a grid tile"): hold 400 ms on a phone, right-click on a computer.
     Its rows are the design's (Favorite, Open artist, Play from here, Open on e621), in the ⋯ sheet.
   - "/" opens Search from anywhere but a text field; on Search it goes to the field.
   - In the player on a computer, toasts sit 120 from the bottom, above the controls.
   - Post info on a computer is a panel beside the picture, not a dialog: Tab reaches the player's buttons
     while it is open. The show still pauses while it is open, as on a phone.

14. **A visit from a link (slice 9c)** follows the proposed batch 2. My calls:
   - The sheet's Slideshow row reads like "Fill, 7 s a slide, loops" (fit only for the classic style).
   - Unset values read "All", "Newest", "Any time", "Any".
   - "Use my settings" also ends the link's ratings and slideshow settings, not only its filters.
   - The player's banner fades out over its last 300 ms (none with reduced motion). The show starts
     right away under it, and Sign in pauses it like any sheet.

15. **Final review fixes (Phase 7).** My calls:
   - A saved key e621 refuses is dropped from this device; the sign-in sheet keeps the username.
   - Post info stays open when the show moves to the next post (it shows the new one).
   - For You's read of your favorites and the feed scroll places are kept only with Remember.

## Try in the app (steps)

1. Open a link visit: http://localhost:3640/search?l=1&tags=wolf in a private window. The "From a
   link" chip opens what the link set; the banner says you're not signed in.
2. Turn Remember off, sign in, reload: you're asked again. Sign out: nothing of the account stays.
3. For You › Tune: pin a tag, mute one; the ranking updates.
4. Tap Goo on the signed-out Following page; drops land on the tab bar.
5. Settings › App › Install (Chrome) or Share › Add to Home Screen (Safari).

## Decide (open questions, with my default)

0. **The first-load JS budget is nearly full** (198.8 of 200 KB: the grid skeleton added, the
   kaleidoscope's code left with the new app mark; Following's ⋯ menu and the tag targets already moved
   out for the top bar and "+N"). Default: the next feature that adds to
   the first load moves something out of it (the sign-in check, or Following's signed-in feed, into a
   lazy chunk).

1. **Does un-favoriting remove goo?** Default: no, goo only ever adds.
2. **The first-run step names** ("Read your favorites", "Count your artists", "See who still posts") were
   proposed by the design session, not confirmed by you. Default: use them.
3. **The Following suggestion card** (UX.md: a card in the Following feed offering artists) isn't built.
   Default: leave it out, since the first run and Artists › Suggested cover the same need.
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
9. **Popovers on a computer** (a chip's or ⋯'s sheet shown at the thing you clicked, no dim). Default: not
   built; every sheet is a centred dialog. Building them means each opener passes its position.
10. **The goo on a computer** isn't designed (the design session's suggestion: along the sidebar's top edge,
   dripping down its face; the secret tab as a row under Settings). Default: no goo on a computer.

11. **Known gap: a hidden For You keeps ranking after you sign out**, with the old account's key, until
   you open For You again. Default: fix after this PR (drop For You's feeds on sign-out from the session,
   not from the screen).
12. **Known gap: a second tap while a sheet is closing is dropped** (e.g. tapping a chip twice fast).
   Default: fix after this PR (queue it, as tab taps already are).

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
