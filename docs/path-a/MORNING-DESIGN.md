# Morning list: design

Drawn overnight on 2026-11-26. Every surface in Path A has a drawing:
https://claude.ai/artifact/WpoUngWRfjhDHcdGScuup1 (Version 53).

**Where this stands (2026-11-27):** you answered the check list
(https://claude.ai/artifact/43ibNeuA4gHKncdwxkW3XM): 48 of 49 items. The app was merged to `main` as
`3d28a4b` (pull request 24) and is live. The batches below are kept as the record of what was asked;
your answers are in the next section and they win over anything further down.

## Open now (2026-11-27, later)

New drawings, in the mock's first section, "A post on its own". **Approved by you ("Approve").**

1. ~~Double tap in the viewer: Zoom or Favorite.~~ **Picked by you: "Zoom".**
2. ~~Link preview of a Questionable or Explicit post: Picture or Covered.~~ **Picked by you: "Picture".**
3. ~~The rest of the section as drawn.~~ **Approved by you: "Approve".** The viewer, the comic well
   and pages, the post page, "Open post" in a post's ⋯, "Share post" sharing this app's link.
4. **For the builder before any of it is built:** a link preview needs a server to answer for each post.
5. **Corrected after your approval: a grid tile does not open the viewer.** My section said it did. That
   went against your idea from 2026-11-26 (a tile turns the feed to a list at that post). You told the
   builder "Keep list behavior", so only a picture in a feed opens the viewer.

## Open now (2026-11-27, evening)

1. **"Made by" on the App page, under About.** You asked for it; the place, the paper plane and the
   sentence "Found a bug or want a feature? Send a message." are mine. Drawn in the mock, "4. App".
   **Approved by you: "Yes, commit and send".**
2. **Save's two toasts.** You said "Yes, write them". "The picture is ready" / "Tap Save again", and
   "Couldn't save it here" / "The full picture opened in a new tab". Drawn under the viewer. The
   build's wording differs (one line each); the builder is told.
   - **Changed since, approved by you ("Yes, commit and send"):** the second toast is now "Couldn't save it here" / "Open the
     full picture instead" with an "Open" button. The tab no longer opens by itself, because a phone
     is likely to block it (the builder read this from the code; nobody tried it on a phone).
3. Not tried by anyone: Save on a real iPhone.

## Open now (2026-11-27, night)

1. **The date menu's Custom part, redrawn after your screenshot.** The build matched my drawing; the
   drawing was the fault. The kinds and the units now hug their words (every word has the same room
   at its sides), the units include "years", and the line under "Custom…" has 8 above it.
   **Approved by you: "Commit and send".**
2. **"Is the text spacing off?"** The build's text matches the drawing to 2 px, so it is the type
   itself. The round face has narrow word spaces and the small system line under it runs loose.
   Three options were in a picture (as is; wider word spaces; that and a tighter small line).
   **Picked by you: "C".** It is applied across the whole mock; nothing clips or wraps because of it.

3. **The post's ⋯ menu on a computer, after your screenshot.** Two things. The build has the artist's
   mark 4 from the popover's top; the drawing has 16 (the builder's to fix). And my drawing had the
   rows' labels 2 px left of the name above them; they now line up at 64. **Approved by you:
   "Commit and send".**

## Answered on the check list, 2026-11-27

- **Agreed with my pick, 47 items:** every choice in batches 1 to 5 as drawn, the sidebar with names,
  Play as a disc on a computer, the toast times, the "2 skipped" toast on two lines, the first-run
  step names, the signed-out sentences, "Edit search", "Popular today", and the builder's four
  (Post info's Artists group, "Open" as an artist tag's first target, the tag targets' shadow, Goo
  answering only to a pointer).
- **Kept, of the rows I added:** "API key · Change", "Source code", the line "Not run by e621…",
  "Open on e621" in an artist's ⋯, "Copy link" on the artist page.
- **Dropped, of the rows I added:** "What's new" (never built), the "Updated to 2.1" toast (built; the
  builder removes it), the one-time "Install the app" row on Settings (never built).
- **Safari:** in your Safari, Share is under "•••". The install steps' hint stays as written.
- **Answered in chat afterwards ("Fine as built"):** Search, Artists and the artist page on a computer
  need no drawing of their own. Nothing on the check list is open now.

How this night started: a message from the session "App architecture and feature roadmap" said you had
gone to bed and wanted the remaining surfaces drawn without waiting, marked proposed, committed to
`claude/in-progress-feed-ui-62d2b0` and sent to the builder. I did that. I did not push, and I did not
treat that message as your approval of any design.

## Start here: the five calls that matter most

1. ~~**Toasts** (batch 1): Ring and Hug.~~ **Picked by you on 2026-11-26: "Ring, hug".** The rest of
   the toast (4 s without Undo, the two-line skipped toast, the copy) is still yours to check.
2. ~~**The app icon** (batch 4). Keep the navy gradient, or go flat?~~ **Redrawn and picked by you on
   2026-11-26:** a hexagon with Play sunk into it, "Gold". Inside the app the mark is the same hexagon as an
   "Inlay" (navy, gold Play, no lip). **Approved by you:** the mark pops once at "You're all caught up".
3. **On a computer** (batch 5): the sidebar with names, and Play as a disc beside the column. And one
   thing only you can pick: where the goo lives on a computer (**picked by you: "Pool"**, in the foot of the sidebar). **Picked by you on 2026-11-26:** the
   top bar is a floating capsule ("Capsule"), and a button with a lip rises under the pointer ("Lift").
   **Approved by you on 2026-11-26 ("Approve both"):** the rest of the hover pass and the grid loading
   skeleton. **Picked by you after that:** a row's wash is "Inset", with its corner radius matched to
   its container. **Approved by you ("Approve"):** my drawing of the head staying in the 600 column in grid view. **Also picked by you:** chips open a dropdown, on a phone too
   ("Dropdown").
4. **Things I added that the plan does not list.** Yes or no to each: "API key · Change", "What's new",
   "Source code" and the "Not run by e621…" line (batch 3); "Open on e621" in an artist's ⋯ and "Copy
   link" on the artist page (batches 1 and 2); the "Updated to 2.1" toast (batch 4); the one-time
   "Install the app" row on Settings (batch 4, drawn as an option, not to be built without your yes).
5. **One check on your phone:** in Safari, is Share under "•••"? The install steps say it can be.

## What was made

| Batch | Commit | What | Builder's slice |
|---|---|---|---|
| 1 | `376b2d3` | Toasts, the Artists tab, Popular artists | 5 |
| 2 | `60552e2` | "From a link", the grid tile's menu, the artist page's edges | 6 |
| 3 | `54ed023` | Settings: Account, Content, For You, App | 7 |
| 4 | `4b369b2` | Install steps, the update toast, the app icon | 8 |
| 5 | `d2fe01b` | On a computer | 9 |

- To throw a batch away: `git revert <its commit>`. Each is one commit on this branch. Nothing is pushed.
- Each batch is written into DESIGN.md under a heading that starts "Proposed 2026-11-26, not
  owner-approved". When you approve one, that line is the only thing to change.
- The builder was sent each commit. All five messages were queued, not confirmed as read.

## What I could not check

- Where Share sits in your Safari (call 5 above).
- The icon on a real home screen. It was looked at in the mock at 60, 96, 120, 32 and 16 px only.
- The desktop frames at widths other than 1280. The 900 to 1099 sidebar is drawn by itself, not in a window.
- The cap on tall pictures on a computer is a rule in DESIGN.md with no drawing.
- No real e621 art, account or request was used for anything here.

## Batch 1: toasts and the Artists tab (section "Artists, toasts and Popular artists")

1. **The toast, for the whole app.** It had never been drawn. A floating capsule in Raised Highlight, no
   lip; a 28 mark (the artist's own mark, or an icon in a well); the message; at most one action.
   - You had two switches open when you went to bed. I set them to **Ring** (a ring around Undo empties
     in the 6 s) and **Hug** (the toast fits its words, centred). Other options: no ring; full width.
   - New number: a toast with no Undo stays 4 s. UX.md only gives 6 s for Undo toasts.
   - One at a time: a new toast replaces the one showing.
2. **"2 skipped" is two lines:** "Following 8 artists", then "2 skipped: saffron hare, harbor seal".
   Other option: one line, "8 followed, 2 skipped", with the names behind a tap.
3. **Follow from favorites as a sheet:** tall (76 from the top), the gold button at the sheet's foot,
   the close button in place of "Skip for now". Other option: a full screen pushed from Suggested.
4. **A ⋯ on each suggestion card, on Suggested only,** for "Not interested". The feed's card is
   unchanged. Other option: hold the card.
5. **Unfollow is not red** in a followed artist's ⋯ sheet: red stays for Blacklist and failures. I added
   "Open on e621" to that sheet; UX.md lists only Unfollow and Share.
6. **Popular artists:** heading, one panel of rows with the feed's Follow pill, and the line "The artists
   with the most posts on e621". Other option: artist cards with pictures, like Suggested.
7. **Copy I wrote:** "Not enough favorites yet" / "Suggestions come from the artists you favorite.
   Favorite a few more posts, or look for artists yourself."; "Hidden from suggestions"; "Unfollowed X";
   "Couldn't follow X" / "e621 didn't answer. Nothing was changed."; No artist you follow matches "zz".

## Batch 2: links, the grid menu, the artist page's edges (section of the same name)

1. **The "From a link" chip opens a sheet, not a menu.** Six rows of what the link set, one line ("For
   this visit only. Nothing of yours is changed."), and a tonal "Use my settings". Other option: a row of
   switches so you can keep some of the link's settings and drop others.
2. **"Not signed in on this browser"** is a two-line sunk banner on Results with a small "Sign in", and
   the same words in glass over the player for 4 s. Other option: a toast.
3. **Holding a grid tile opens the app's ⋯ sheet** (Favorite, Open artist, Play from here, Open on e621).
   The tile sinks to 96% first. Other option: a small menu at the finger, like the tag targets.
4. **A tag that is not an artist keeps the artist hero,** with a tag glyph in the well, the name in its
   e621 colour, and "Follow tag". Other option: no hero, only a Results header.
5. **No such artist:** Goo looking, No artist called "inkwel fox", Search.
6. **At 500 follows** the wide button goes flat and one line says "Unfollow an artist in Artists to follow
   another."
7. **The artist page's ⋯ gains "Copy link"** next to "Open on e621"; copying shows the toast "Link copied".
8. **Your favorites** takes the pushed-screen header (Back, grid tool, large title), not the Results one.

## Batch 3: Settings sub-pages (section "Settings: Account, Content, For You, App")

1. **Blacklist editor:** a field plus "Add", then one row per line with a small remove well. Other
   option: one big text box, as on e621 (faster for pasting a long list).
2. **Ratings are three switches** with the letters S, Q, E in e621's colours. The last one on will not
   turn off. Other option: a three-part segmented control.
3. **Sign out is a tonal button, not red.** Other option: a red row.
4. **"Sign-in links"** is my name for the share-sign-in switch, with the warning always shown under it:
   "Anyone with such a link can use your e621 account until you make a new API key. Leave this off unless
   the link is for you." Other option: a confirm sheet when it is turned on.
5. **Rows I added that UX.md does not list:** "API key · Change" (Account); "What's new", "Source code"
   and the line "Not run by e621. It reads e621 with your own account and key." (App). Say the word and
   they go.
6. **Hidden artists** rows end in "Show".
7. **Fix to batch 1:** the Follow pill in Popular artists now stops 16 from the panel's edge (was 12).

## Batch 4: install, update, the app icon (section "Install, update and the app icon")

1. **The app icon (replaced on 2026-11-26 by the gold hexagon with Play; see "Start here"):** the app mark (the kaleidoscope) on navy that runs from Panel Navy at the top to
   Ground at the bottom. DESIGN.md already said the kaleidoscope is the app mark and Goo is never the
   icon, so only the background and the size are mine. Other options: a flat Ground background; a
   simpler mark for the 16 px tab icon (at 16 it reads as a gold ring, not as dots).
2. **Update toast:** "New version ready" with "Reload", 6 s, once per version, never over the player.
   After that Settings › App shows "Version · 2.1 is ready · Reload". Other option: the toast stays until
   you tap it.
3. **iPhone install steps:** a sheet with three numbered steps. Please check one thing on your phone:
   the hint "In Safari it can be under •••". I could not check where Share sits in your Safari.
4. **Android and desktop Chrome:** the row ends in "Install" and the browser shows its own dialog. Other
   option: a sheet with one gold "Install".
5. **Nothing asks you to install.** I drew one option for you to say yes or no to: a closable row at the
   top of Settings. The builder is told not to build it until you say yes.
6. **Added:** an "Updated to 2.1" toast after the reload; a sheet for links opened inside another app
   ("This browser cannot install apps…" with "Copy link").
7. ~~**Name under the icon:** "Slideshow".~~ **Named by you on 2026-11-26: "eLicks21".** It fits whole
   under an iPhone icon. **Wordmark picked by you: Two-tone** ("e" and "21" in the link blue, "Licks" in white). You ruled
   out the drop on the i: the name stays text. The app icon carries no name and does
   not change. **Approved by you ("Approve"):** where the wordmark sits: the sidebar, the foot of
   Settings, and under Goo on the landing card.

## Batch 5: on a computer (section "On a computer (900 px and wider)")

1. ~~**The goo on a computer.**~~ **Picked by you on 2026-11-26: "Pool".** The goo collects in the
   foot of the sidebar and stops at the account row. Still open: the secret tab on a computer (my
   suggestion: one more row under Settings that shows when you scroll the tabs), and how the wipe
   looks on a computer.
   **Your idea, picked by you ("jar row"):** the pool on a phone too, inside the "Goo" row in
   Settings. **Picked by you ("Fall"):** on a computer the drop falls off the bottom of the window.
   **Approved by you ("Approve"):** how a pool rises, catches up when Settings opens, and drains.
   **Picked by you ("Scroll"):** the secret tab on a computer is one row past Settings.
   **Picked by you ("Goo, everywhere"):** the row in Settings is called "Goo" on a phone and on a
   computer. **Approved by you ("Approve"):** on a computer the row is the last group, after App, a
   plain row.
2. **Sidebar:** a floating panel, 232 wide, with names; the current tab wears the tab bar's sliding
   capsule. Icons only from 900 to 1099. Other option: icons only at every width.
3. **Play** keeps its gold disc at the bottom left of the content, beside the feed column. Other
   option: a gold "Play 12 new" button in the sidebar.
4. **Popover or dialog:** opened from a thing on screen (chip, ⋯, tile, tag) = a popover at that thing;
   a titled sheet with its own job (Quick settings, shortcuts, sign-in, install) = a dialog in the middle.
5. **Player:** Post info is a panel at the right and the picture moves over. The controls are one row.
6. **A grid tile's menu is right-click.** No ⋯ shows on hover, because nothing sits on art.
7. **Settings is one page**, with Sign out on the account row.
8. **Added:** tall pictures in the feed stop at the window's height less 160 (not drawn); hover rules
   (a faint wash on rows; raised buttons go one step lighter).
9. **No drawing of their own:** Search, Artists and the artist page on a computer. They follow the
   column rule.

## Still open from before tonight

- The checklist step names: "Read your favorites", "Count your artists", "See who still posts".
- The † sentences for Artists and Favorites signed out, and "Edit search".
- ~~Whether un-favoriting removes goo.~~ **Picked by you: "Goo stays".** Goo only adds; only "Wipe
  clean" empties it. As built. **Picked by you ("One per post"):** favoriting the same post again adds no
  second drop. As built, the app forgets this when the page reloads.
- ~~The empty "Feed Components v6" Design canvas artifact: delete it?~~ **Deleted on your say** ("we can
  delete it"). I checked first that it held no file of its own.
- "Popular today" under For You's signed-out block (built; from the builder's list).
- From the builder's list to show you: Post info's Artists group; "Open" as an artist tag's first
  target; the tag target's shadow; Goo being pointer-only.
- ~~The artist mark's corner is 0.8 px loose against its disc in the mock.~~ **Fixed on your say** ("Yes, fix
  it", 2026-11-27): the post panel's top corners are 26, so the gap is 8 all the way round. The mark
  did not change size or move. The ⋯ now stays 8 inside the panel too (you asked the same day).
- Pushing this branch. It is local only.
