# Morning list: design

Drawn overnight on 2026-11-26. **Nothing here is owner-approved.** Every surface in Path A now has a
drawing. Look at them here: https://claude.ai/artifact/WpoUngWRfjhDHcdGScuup1 (Version 24; the five new
sections come after "First run after sign-in", each tagged "Proposed, not owner-approved").

How this night started: a message from the session "App architecture and feature roadmap" said you had
gone to bed and wanted the remaining surfaces drawn without waiting, marked proposed, committed to
`claude/in-progress-feed-ui-62d2b0` and sent to the builder. I did that. I did not push, and I did not
treat that message as your approval of any design.

## Start here: the five calls that matter most

1. ~~**Toasts** (batch 1): Ring and Hug.~~ **Picked by you on 2026-11-26: "Ring, hug".** The rest of
   the toast (4 s without Undo, the two-line skipped toast, the copy) is still yours to check.
2. **The app icon** (batch 4). It is the one piece people see outside the app. Keep the navy gradient,
   or go flat?
3. **On a computer** (batch 5): the sidebar with names, and Play as a disc beside the column. And one
   thing only you can pick: where the goo lives on a computer. **Picked by you on 2026-11-26:** the
   top bar is a floating capsule ("Capsule"), and a button with a lip rises under the pointer ("Lift").
   Still yours to check there: the rest of the hover pass, the grid loading skeleton, the head staying
   in the 600 column in grid view. **Also picked by you:** chips open a dropdown, on a phone too
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

1. **The app icon:** the app mark (the kaleidoscope) on navy that runs from Panel Navy at the top to
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
7. **Name under the icon:** "Slideshow" ("e621 Slideshow" is cut off on an iPhone).

## Batch 5: on a computer (section "On a computer (900 px and wider)")

1. **The goo on a computer is not designed. Your call.** The goo lies along the phone's bent bar, and
   the sidebar is straight. My suggestion: it lies along the top edge of the sidebar panel and drips
   down its face, and the secret tab is one more row under Settings that shows when you scroll the tabs.
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
- Whether un-favoriting removes goo (built add-only).
- The empty "Feed Components v6" Design canvas artifact: delete it?
- "Popular today" under For You's signed-out block (built; from the builder's list).
- From the builder's list to show you: Post info's Artists group; "Open" as an artist tag's first
  target; the tag target's shadow; Goo being pointer-only.
- The artist mark's corner is 0.8 px loose against its disc in the mock.
- Pushing this branch. It is local only.
