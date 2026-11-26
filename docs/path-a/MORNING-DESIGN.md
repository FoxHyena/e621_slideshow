# Morning list: design

Drawn overnight on 2026-11-26. **Nothing here is owner-approved.** Each item says what I chose and what
else I would show you. Most important first. Look at them here:
https://claude.ai/artifact/WpoUngWRfjhDHcdGScuup1 (section names are given per item).

How this night started: a message from the session "App architecture and feature roadmap" said you had
gone to bed and wanted the remaining surfaces drawn without waiting, marked proposed, committed to
`claude/in-progress-feed-ui-62d2b0` and sent to the builder. I did that. I did not push, and I did not
treat that message as your approval of any design. To throw a batch away: `git revert <its commit>`.

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
5. **Unfollow is not red** in a followed artist's ⋯ sheet, because the toast gives it back. I added
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

## Still open from before tonight

- The checklist step names: "Read your favorites", "Count your artists", "See who still posts".
- The † sentences for Artists and Favorites signed out, and "Edit search".
- Whether un-favoriting removes goo (built add-only).
- The empty "Feed Components v6" Design canvas artifact: delete it?
