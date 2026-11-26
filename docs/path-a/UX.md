# UX plan

Status: **v3.1** (2026-11-25), revised after UX review rounds 1–3 (see REVIEWS.md).
Phone first (375×812 reference). Desktop is the same screens with a sidebar.

## 1. Principles

1. **The art is the star.** Chrome is small and gets out of the way while scrolling.
2. **Every place has a URL.** Back always does the expected thing; reload lands where you were.
3. **Nothing jumps.** New posts never shift what you're reading. They wait behind a pill and go in only
   when you ask (pull to refresh or tap the pill).
4. **Never lose your place.** Tabs, artist pages and searches keep their posts and position while you go
   elsewhere. Closing the player puts the feed on the post you stopped at.
5. **One tap to the good stuff.** Following opens on new posts. Any image is one tap from full screen.
6. **Cute, not cluttered.** Delight lives in small moments (heart burst, follow wiggle, a mascot in
   empty states), never in extra UI.
7. **Honest UI.** Actions update instantly, and visibly roll back with a reason if e621 says no. Nothing
   that can't be undone happens without a clear tap.

## 2. Information architecture

```
Tabs (bottom bar on phone, left sidebar on desktop)
├── Following   /following            home; signed out it's the landing
├── For You     /for-you              Recommended, ranked from your favorites
├── Artists     /artists              Following list · Suggested
└── Settings    /settings
    └── /settings/account · /settings/content · /settings/slideshow · /settings/for-you · /settings/app

Pushed screens (open over any tab; Back returns)
├── Search      /search                       input, recent, saved, Your favorites
├── Results     /search?tags=…&<filters>      a feed of one search
├── Favorites   /favorites                    your favorites as a feed
├── Artist      /artist/<name>                profile + their feed
└── Tune        /for-you/tune                 For You's profile: breadth, pins, mutes, rebuild

Overlay (URL state on the screen it opens from)
└── Player      …?play=<postId>               full-screen slideshow of that screen's feed

Sheets (bottom sheets on phone, popovers on desktop; each adds a history entry, see §3)
└── sign-in · player quick settings · post info · follow-from-favorites · filter menus · ⋯ menus
```

- `/` redirects to `/following`.
- **Search button** in every tab header. `/` key opens it on desktop.
- **Grid/feed toggle** in every feed screen's header.
- `/artist/*` and `/search*` work signed out (anonymous e621 results, with this browser's blacklist).
- **Avatars** everywhere (cards, rows, suggestions, artist page, account) are the existing generated
  kaleidoscope avatars, seeded by name. e621 has no artist pictures, and we never use post art as an
  avatar, so no explicit art leaks into lists or share previews.

### Links from outside (must keep working)

| URL | Opens | Filters |
|---|---|---|
| `/?v=1&tags=…&style=…` (share link) | Results for that search, player playing from its first post | The link's ratings, media, sort, date, score and playback, for this visit only |
| `/?v=1…#u=…&k=…` (share with sign-in) | Same, signed in for this tab only; fragment stripped at once | Same, plus the sharer's account blacklist, unsaved |
| `/?tags=wolf+solo` (userscript launch) | Results for `wolf solo`, player playing (owner decision Q4) | All ratings and media, newest first (matches e621), your playback; this visit only |
| `/artist/<name>`, `/search?…`, `/following` | That screen | Normal |
| `/` | `/following` | |

- A Results screen opened from a link shows a **"From a link"** chip first in its chips row: it lists what
  the link set, with "Use my settings" to switch to your own.
- **Not signed in here:** on iOS, links always open in Safari, never in the installed app, and the two
  keep separate storage. A link visit with no saved account and no blacklist shows a notice **over the
  player** for its first 4 s ("Not signed in on this browser: your blacklist isn't applied · Sign in"),
  then the same strip on Results. Signing in from it pauses the show, and it resumes after. Settings ›
  App explains why.
- History after a link: `/following` is inserted under Results, so closing the player shows Results and
  Back from Results goes home. The same happens when you land directly on **any** pushed screen (a pasted
  `/artist/x`), so the browser's Back and ‹ Back agree. If Safari skips the inserted entry, the Back
  helper (§3) covers it.

## 3. Navigation model

**Rule: tabs replace, pushes push, refinements replace, and Back never leaves the app by surprise.**

- History normally looks like `[/following] [<other tab root>] [pushed …] [?play] [sheet]`.
- **Every Back/close action goes through one helper.** Each entry we create carries
  `history.state.depth`. If there is an in-app entry below, the helper does `history.back()`; if not
  (a pasted URL, a shared artist link, a reload), it **replaces** the current entry with the parent:
  Artist / Results / Favorites / Search → the tab you came from or `/following`; Tune → `/for-you`;
  `?play` → the same screen without it; settings sub-page → `/settings`. So ‹ Back and ✕ always work.
  An entry without `depth` (a reload after leaving for the API-key page, an old entry) counts as a root:
  the helper never calls `history.back()` from it. The helper ignores a second call while one is in
  flight, so one gesture can't pop two layers.
- **Tab tap (different tab):** pops pushed screens (through the helper, awaited, never a raw
  `history.go(-n)` racing the next push), then shows that tab's root. Leaving Following adds one entry;
  switching between other tabs replaces it. Back at a tab root → Following; Back at Following leaves.
- **Tab tap (current tab):** on a pushed screen → pops to the tab root; at the root → scrolls to top.
- **Pushed screens** push. Each has ‹ Back top-left. The tab bar stays visible on pushed screens (so a
  tab tap is always a thumb-reachable way out), except on Search (keyboard) and in the player.
- **Refinements replace:** editing a Results query from its pill, changing a filter, narrowing by
  hold-a-tag → replace the Results entry. Going somewhere new (an artist, a tag search from Following) pushes.
- **Player** pushes `?play=<id>`. Moving between slides replaces `?play=`. ✕, swipe down, Back, Esc pop it.
- **Sheets** push a same-URL entry; Back (gesture, button, Esc) closes just the sheet. Closing by ✕, scrim
  or drag calls the helper so the entry is consumed. Two layers never close at once.
- **Edge swipe in the installed app:** iOS gives standalone apps no back gesture, so pushed screens,
  the player and sheets handle a swipe from the left 20 px themselves (Back). In the player it only
  closes the player. At Following's root it does nothing (there's nothing to leave to). Ships with the
  routing slice.
- **Scroll lock:** while the player or a sheet is open, the document underneath is locked
  (`position: fixed` at its offset, restored on close), so pulls and swipes can't reach it.
- **Memory and restore:** every screen keeps its post list and scroll anchor (post id + offset). The 4
  tabs and the screens in the current history stack stay in memory (cards outside ±2 screens unmounted);
  a screen you've backed out of is dropped and rebuilt from its URL and saved anchor if you return. Anchors
  (1 day) and For You's ranked id list (30 min) are saved to localStorage, because iOS wipes
  sessionStorage when it kills a backgrounded app. On restore, a missing anchor post falls back to the
  nearest older post in the list.

## 4. Scroll, refresh and layering

- Screens scroll the **document** (Safari's toolbars still collapse); `html { overscroll-behavior-y: none }`
  turns off the browser's own pull-to-refresh. Verify on device in slice 1; fallback: one inner scroll
  container per screen.
- **Pull to refresh:** only for a touch that starts at scroll top and moves vertically first (axis lock
  after 10 px; sideways drags go to whatever row they started on). The indicator follows at half the
  finger's travel; **144 px of finger travel (72 px on screen) arms it**. Releasing armed refreshes;
  releasing before springs back and does nothing. While refreshing, the spinner holds at 48 px for at least
  400 ms. The `touchmove` listener is attached only while such a touch is live, so normal scrolling stays passive.
- **New posts:** checked when the screen becomes visible again (tab return, app foreground). If any, a
  pill **↑ 6 new posts** floats under the header. Only one top pill shows at a time (new posts beats
  "Update ranking"). Posts go in only on pill tap (smooth-scroll to top,
  then insert with a slide-down) or pull to refresh. Inserting keeps the card under the header in place
  (measure, insert, `scrollBy` the difference), since Safari has no `overflow-anchor`.
- **Chrome on scroll:** the large title collapses to a 44 px bar; the chips row and the Play pill hide on
  scroll down and return on scroll up.
- **Bottom stack** (bottom to top, each above `env(safe-area-inset-bottom)`): tab bar → Play pill
  (centered, 12 px above the bar) → toasts (above the pill). The pill is 36 px tall and hides while
  scrolling down; "Play from this post" is always in each card's ⋯ menu, so a hidden pill never blocks
  anything. Feeds get bottom padding so the last card's ♥ row clears the pill. The offline banner and new-posts pill sit
  under the header at the top. The PTR spinner sits under the header. On Search, with the keyboard up,
  the tab bar is hidden and anything bottom-pinned follows `visualViewport`.

## 5. Screens

Every feed screen shares one layout: **header** (title, actions on the right), **chips row**, the
**feed or grid**, a **floating ▶ Play pill**, and a **footer** state.

### Shared feed states

| State | What you see |
|---|---|
| First load | 3 skeleton cards with reserved shapes, soft shimmer. For You uses its progress loader. |
| Loading more | Starts 1,500 px before the end; a small spinner shows only if you catch up with it |
| End | "That's everything ✿" with counts hidden by blacklist / needing sign-in |
| Empty | Mascot + one sentence + one action. With any filter on: "Filters are on" + **Reset filters** |
| Error | Card: e621's message + Retry. Rate limited (429/503): "e621 asked us to slow down", auto-retry in 5 s |
| Offline | Banner under the header: "You're offline. Showing what's loaded." → "Back online" (2 s), retries |
| Needs sign-in | Mascot, why, **Sign in**, **Search instead** |

### Feed card (all feeds)

```
┌───────────────────────────────────────┐
│ (av) artist_name +2 · 3h  [+ Follow] ⋯│  avatar+name → artist; "+2" → artist picker; ⋯ menu
│┌─────────────────────────────────────┐│
││                                   E ││  media, aspect reserved; rating letter as a corner badge
││                                     ││
│└─────────────────────────────────────┘│
│ ♥ 1.2k    ▲ 340                       │  heart (button), score (text)
│ ▕ [species] [character] [general …] → │  tag strip, 16 px non-scrolling start gutter
└───────────────────────────────────────┘
```

- **Artists on a card:** non-artist tags (`conditional_dnp`, `sound_warning`, …) stripped. The first
  artist shows; more than one adds "+N", which opens a picker. No artist: "unknown artist", not tappable.
  Names ellipsize; every tap target is ≥ 44 px, ≥ 8 px apart.
- **[+ Follow]** on For You, Results and Favorites cards for artists you don't follow. Tap → wiggle,
  becomes a small **✓** in place (no reflow), toast "Following artist_x · Undo". Tapping ✓ unfollows
  with the same toast. At 500: toast "e621 allows 500 follows". On failure: rolls back, toast with the reason.
- **Media taps** (media has `touch-action: manipulation`, no selection, no callout):
  - **Single tap** (after a 200 ms double-tap guard, media only): images open the player **paused** on
    that post (a full-screen viewer that can start the slideshow); videos play/pause in place.
  - **Double tap** favorites (never unfavorites) with a heart burst.
  - Videos: one live `<video>` at a time (the card nearest the middle, muted, `playsinline`); others are
    posters with a ▶ glyph. A mute button sits bottom-right. If autoplay is blocked (Low Power Mode) the
    poster and glyph stay until tapped. With reduced motion, feeds don't autoplay.
- **♥ button** toggles, optimistic, rolls back with a toast on failure.
- **Signed out:** ♥, double tap and [+ Follow] open the sign-in sheet; after sign-in the action you
  tapped is carried out.
- **⋯ menu:** Play from this post · Share post · Open on e621 ↗ · Blacklist this artist.
- **Hold a tag** (450 ms; moving more than 10 px first cancels, so the strip still scrolls): two targets
  pop up **above the finger** — **Search** (Results: narrows; elsewhere: opens `/search?tags=<tag>`;
  For You: **Pin**) and **Blacklist** (adds the tag to this browser's blacklist, hides matching posts in
  place, toast with Undo; your e621 account blacklist isn't changed). Drag onto one and let go, or lift
  and tap one; anywhere else cancels. A plain tap on a tag opens the same targets. Once held, the strip
  stops scrolling until release. No text selection or callout on tags.

### Grid view (any feed)

- Square tiles, preview then sample. New posts get the • dot; Following's caught-up divider is a
  full-width row; no bursts, no suggestions card.
- Tap a tile → player paused on it. Long-press a tile → menu: Favorite, Open artist, Play from here,
  Open on e621. Tiles have no callout or selection (same rules as card media).

### Filters (chips row)

The first chip is **Reset** (only while something is non-default), then the chips. Each feed screen
instance has its own filters; Following and For You keep theirs across visits.

| Chip | Choices | Following | For You | Results | Favorites | Artist |
|---|---|---|---|---|---|---|
| **Media** | Images · GIFs · Videos (checkboxes, as today) | ✓ | ✓ | ✓ | ✓ | ✓ |
| **Hide favorited** | toggle | ✓ | — | ✓ | — | ✓ |
| **Sort** | New · Top · Hot · More: Oldest, Most favorited, Random (+ Reshuffle), Most comments, Largest | — | — | ✓ | ✓ | ✓ |
| **Date** | Any · Today · This week · This month · Custom… (the existing panel: On, After, Before, Between, Last N) | — | ✓ ranking window | ✓ | — | ✓ |
| **Score** | Any · ≥ 10 · ≥ 50 · ≥ 100 · ≥ 500 · Custom… (number) | — | ✓ | ✓ | ✓ | ✓ |

- Tapping a chip opens its menu (bottom sheet on phone, popover on desktop); Hide favorited toggles.
  A non-default chip is filled and shows its value ("Videos", "Top", "This week", "≥ 50").
- A filter change reloads that feed from the top (replace history). On For You it debounces 600 ms.
- **Hide favorited** hides posts that were already favorited when the page loaded; a post you favorite
  while reading stays (dimmed heart) until the next refresh, so nothing vanishes under you.
- **Ratings** aren't a chip (owner: most people want explicit). Settings › Content › Ratings applies to
  every feed; links follow the table in §2.
- **What happened to today's Search settings:** tags → Search screen; source Search/Favs/Recommended →
  Results / Favorites / For You; order, media, date, min score → chips; ratings → Settings › Content;
  blacklist → Settings › Content; saved searches and recent → Search screen. Nothing is dropped.

### Following `/following` (home)

Header: **Following** · search · grid · ⋯ (Refresh, Mark all as seen). Subtitle: "12 new" / "40+ new" /
"All caught up".

```
  Following                   🔍 ▦ ⋯
  12 new
  [Media ▾] [Hide favorited]
  ┌ card • ┐                          • = new
  ┌ card • ┐
  ┌ card • (artist_x) ×3 ┐
  ┌ +9 more from artist_x  ▾ ┐       burst
  ──── ✓ You're caught up ────       divider at e621's marker
  ┌ Artists you might like   See all ┐   one card, 8 suggestions in a row
  ┌ card ┐                            older posts continue
                (▶ Play)
```

- **Feed:** `search:subscriptions` + filters + global ratings, newest first, cursor paging.
- **New** = id above e621's `last_seen_post_id` as read on the first load this session ("the threshold").
  The threshold doesn't change during the session, so dots and the divider stay put. The subtitle counts
  new posts loaded so far, "40+" while more pages of new posts remain.
- **Marking seen (moves e621's marker, shared with e621.net):** e621 can only move the marker to its
  newest post, and can't move it back. So the app moves it only when all of these hold:
  1. you've scrolled at least one screen past the divider and stayed 1.5 s while idle (or the player has
     played past the last new post);
  2. no filter is on (with Media or Hide favorited on, some new posts were never shown);
  3. a quick check (`search:subscriptions id:>newest_loaded`, 1 post) finds nothing newer than what's
     loaded; if it finds some, the new-posts pill shows instead.
  The rules apply the same way when it happens from the player. Collapsed bursts count as seen (the
  "+9 more" row was shown). It's never silent: a small toast says "Marked as seen on e621". ⋯ › **Mark
  all as seen** asks first ("Mark 12 new posts as seen on e621? This can't be undone.") and skips rule 2.
  **Open question for the owner (Q8):** auto-mark as above, or only by ⋯ › Mark all as seen.
- **Bursts (exact):** among new posts, a run is consecutive posts that share their first artist. Runs of
  **5+** show their first 3, then "+N more from <artist> ▾". Runs never cross the divider. Expanding is in
  place and lasts the session. Collapsed posts still play in the player.
- **Suggestions card:** once per session, right after the divider (or after the 10th post when nothing is
  new): 8 artists in a row with avatar, name, "you faved 23", **Follow**. "See all" → Artists › Suggested.
  ⋯ on one → Not interested (undo in Settings › For You › Hidden artists).
- Pull to refresh and the new-posts pill as in §4.

| State | Content |
|---|---|
| Signed out (landing) | Card: mascot waving, "Follow the artists you love and see their new posts first.", **Sign in with e621**. Below it a real feed, **Popular today** (`order:rank`), so the app is useful before signing in. |
| First read of favorites | Progress loader with checklist: "Finding artists you love". "Skip for now" → the banner state below. The read is shared with For You and Artists › Suggested (one read, cached). |
| Follows no one | The **Follow from favorites** list inline as the screen. "Skip for now" (the only skip) folds it into a banner "Follow artists from your favorites ›" above **Popular today**. |
| Follows no one, no favorites | "Find artists to follow": Search + "Popular artists" (e621 artists by post count) |
| Follows people, no posts yet | "No posts yet from the N artists you follow." + suggestions card |

**Follow from favorites** (inline on first run; a sheet from Artists › Suggested):

```
  You've favorited these artists a lot.
  Follow them?
  [✓] (av) artist_a     you faved 48 · 312 posts
  [✓] (av) artist_b     you faved 31 · 90 posts
  [ ] (av) artist_c     you faved 9 · 1.2k posts
  …  top 30, scrolls
  [ Follow 10 artists ]   Select all · None
  Skip for now
```

- Top 10 by affinity pre-checked. One bulk request. The button's heart pops, then the feed loads.
- e621 skips (renamed, gone, already followed) → toast "2 skipped: …".
- Past 500 total, the button says "e621 allows 500 follows (N left)" and disables.

### For You `/for-you`

Header: **For You** · Tune (sliders) · search · grid · ⋯ (Refresh). Subtitle: "Ranked 3 min ago".

- The existing Recommended engine: ranks the window, then shows. Progress loader on first run and
  whenever it re-ranks with nothing to show.
- The ranked id list is saved (localStorage, 30 min), so reload and Back restore the same order.
- Filters: Media, Date (the ranking window, default This week), Score.
- **Pull to refresh** re-ranks only if the ranking is older than 10 min; otherwise toast "Already fresh,
  ranked 3 min ago" (⋯ › Refresh forces it). While re-ranking the old list stays; an **Update ranking**
  pill swaps it in on tap.
- The player plays the ranked list; at the end it loops or stops per Settings › Slideshow › Loop.
- States: signed out (mascot, "For You learns from your favorites", Sign in, plus Popular today); too
  few favorites ("A tag needs 3 favorites. Favorite a few more posts."); everything muted; error.

### Tune `/for-you/tune`

Today's Recommended panel as a screen: sync status + Rebuild, Breadth slider, filter box, tag list with
Pin / Mute, Muted list. Leaving with changes shows an **Update ranking** pill on For You (the same pill
as a finished background re-rank); nothing re-ranks on its own.

### Artists `/artists`

Header: **Artists** · search. Segmented: **Following (42)** · **Suggested**.

**Following:**

```
  [ Filter your artists      ]   Sort: Recent ▾
  (av)• artist_a     posted 2h ago · you faved 48     ⋯
  (av)  artist_b     posted 3d ago · you faved 12     ⋯
                     42 of 500
```

- Opening the tab uses Following's first page if it loaded in the last 10 min, else fetches one page of
  `search:subscriptions` (320 posts). From it: "posted …" = newest post seen; **•** = has a post above
  this session's threshold (same threshold as Following). Opening an artist's page clears their dot for
  the session.
- Artists not in that page show "posted a while ago" and sort A–Z after the dated ones.
- Sort: Recent (default) / A–Z / Most faved. Row tap → artist page. ⋯ → Unfollow (toast + Undo), Share.
- Pull to refresh re-reads the subscription list and that page.

**Suggested:** ranked artists you don't follow: "you faved 23 of their 140 posts · posted 4d ago", with
**Follow** per row. A **Follow from favorites** banner on top when there are 3+ strong ones. ⋯ → Not
interested. States: reading favorites (loader); too few favorites (explain + Search).

**Signed out:** mascot + Sign in + Search.

### Artist page `/artist/<name>`

```
  ‹ Back                             ⤴ ⋯     share · Open on e621
            (  big avatar  )
            Artist Name
            artist_name                    raw tag, small mono
     1.2k posts · you faved 48 · posted 2h ago
     [   Follow   ]    or   [ Following ✓ ]
  [Media ▾] [Hide favorited] [Sort ▾] [Date ▾] [Score ▾]
  ┌ card ┐ …
                (▶ Play)
```

- Header collapses to a compact bar (‹, avatar, name, Follow) on scroll.
- **Follow** → wiggle + "Following ✓". Tapping **Following ✓** unfollows at once, toast + Undo.
- **Share** → system share sheet with `https://<site>/artist/<name>`; fallback copies the link.
- Stats: posts = tag post count; "you faved" from the favorites profile (hidden when 0 or signed out);
  "posted" = newest post in the first page.
- States: unknown tag ("No artist called X on e621" + Search); a non-artist tag (works as a tag feed,
  "Follow tag"); 500 follows reached (Follow disabled + note); signed out (Follow → sign-in sheet).

### Search `/search`

```
  ‹  [ wolf solo_         ✕ ]          keyboard up on open
  Recent:  [wolf solo] [fox -feral] [pool:123]      Clear
  Saved
    ★ Cozy foxes      fox cozy · Videos · Top      ⋯
  ♥ Your favorites                    ›
  Search cheatsheet ↗
```

- The header search button renders Search and focuses its input **inside the tap handler**, so iOS
  raises the keyboard. If that fails, the first tap on the input does.
- Submit → Results (push). From a Results pill (edit mode), submit replaces that Results.
- Autocomplete as today; artist suggestions show a small avatar and "artist".
- Tag counter ("32 / 40 tags") once over 30; over the limit, Search is disabled with the reason.
- **Saved searches** store tags + filters + ratings (today: tags, ratings, date, order). Recent stores tags.

### Results `/search?tags=…`

Header: ‹ · the query as a pill (→ Search in edit mode) · ★ Save · grid · ⋯ (Copy share link).
Chips: Media, Hide favorited, Sort, Date, Score (+ "From a link" when opened from one).
States: no results ("No posts match. 3 hidden by your blacklist."), error, signed-out-hidden counts.

### Favorites `/favorites`

Header: ‹ **Your favorites** · grid. Chips: Media, Sort, Score. Reached from Search and Settings ›
Account. Signed out → needs sign-in.

### Player (overlay `?play=<postId>`)

Opens **playing** from the ▶ Play pill (from the top, or "Play from here" once scrolled: the card in the
middle) or a card's ⋯ › Play from this post; opens **paused** from a tap on an image or a grid tile (a
full-screen viewer; ▶ starts the show). Links open playing. It plays the screen's own post list and
appends to it as it goes (the feed grows too).

```
  ✕                                           ⛶ (desktop)
              (slide)
  ♥     ⓘ     ⚙     ⤴                         action rail, thumb zone
  ‹    ❚❚    ›          12 / 300+
  ───────────── progress bar ─────────────   above the safe-area inset
```

- Controls auto-hide after 2.5 s while playing (stay while paused or while focus is inside them);
  single tap toggles them (250 ms double-tap guard).
- **Gestures:** swipe left/right = next/previous; swipe down = close; double tap = favorite + burst
  (never seeks). Swipes starting within 24 px of the left edge are left to Back (closes the player only);
  other edges are left to the OS.
  The first 10 px of a drag lock its axis.
- **Zoom:** pinch (or Classic fit "1:1") zooms; while zoomed, drags pan the image and swipe navigation
  and swipe-down are off; double tap or pinch back to fit resets.
- All 5 styles, timer, preload, stall skip and video rules unchanged. End of list: loop or stop per the
  Loop setting.
- **Offline:** pauses with a "Paused: offline" chip instead of stall-skipping; resumes when back.
- **⚙ Quick settings sheet:** Style (5 thumbnails), Seconds per slide, Fit (Classic), Mute, Quality,
  "More in Settings" (closes the player, feed anchored, and opens `/settings/slideshow`; Back returns to
  the feed). Opening the sheet pauses; closing resumes. Saved as defaults, except on a link visit, where a
  "This visit only / Save as default" switch shows (default: this visit only).
- **ⓘ Info sheet:** tags by category; tap a tag → menu: Search this tag · Blacklist · Pin/Mute (For You)
  · Open artist (artist tags). Recommended reasons here.
- **⤴ Share:** Results/Favorites/Artist copy a share link (search + filters + playback);
  Following/For You share the post's e621 link (those feeds depend on the account).
- **Close** scrolls the feed so the last post shown is centered (or the nearest older one if it's gone),
  then fades the player out.
- **Reload on `?play=`:** rebuilds the screen's feed and jumps to the id; if it isn't there, fetches that
  post alone, shows it, toast "Couldn't restore your place".
- Desktop keys unchanged: ← → space F I L C O Esc; G / T close the player into the screen's grid / feed;
  S opens Settings.

### Settings `/settings`

A grouped list; on phone each group is a sub-page, on desktop all on one page.

1. **Account** (`/settings/account`): signed in as X (avatar), ♥ Your favorites, share-sign-in toggle
   with warning, Sign out. Signed out: Sign in.
2. **Content** (`/settings/content`): Ratings (S/Q/E), Blacklist (editor, account sync, import defaults).
3. **Slideshow** (`/settings/slideshow`): style, seconds, preload, fit, transition, quality, max video,
   mute, loop.
4. **For You** (`/settings/for-you`): Tune ›, Hidden artists.
5. **App** (`/settings/app`): Install app (per-platform steps; "Installed ✓" in standalone; note that
   links open in Safari, not the app, and that the two keep separate sign-ins), e621 button
   (userscript), Keyboard shortcuts (desktop), About.

### Sign-in sheet

```
  Sign in with e621
  1  Open your e621 account's API key page ↗
  2  Create a key (any name), copy it
  3  Come back and paste it here
  Username [ wolfie        ]
  API key  [ •••••••• ] [Paste]
  [✓] Remember on this device
  [ Sign in ]
```

- The username draft survives the trip (sessionStorage is fine for this: losing it costs one retype).
  The key is never stored until sign-in succeeds, and then only with Remember on (as today).
- Errors inline. On success the sheet closes and the action that asked is carried out (a favorite, a
  follow, or Following's follow-from-favorites when you follow no one).

## 6. Gestures

| Gesture | Where | Does |
|---|---|---|
| Swipe from the left 20 px | Pushed screens, player, sheets | Back (browser gesture; our own in the installed app) |
| Pull down at top | Following, For You, Artists, Artist, Results, Favorites | Refresh (§4) |
| Single tap image | Cards, grid tiles | Player, paused on it |
| Single tap video | Cards | Play / pause |
| Double tap media | Cards, player | Favorite (never unfavorites) + heart burst |
| Hold a tag (450 ms) | Tag strips | Targets: Search/Pin, Blacklist (drag or tap) |
| Long-press tile | Grid | Tile menu |
| Swipe sideways | Tag strip, chips row, suggestions card | Scroll that row (contained; 16 px start gutter) |
| Swipe left / right | Player (not zoomed) | Next / previous |
| Swipe down | Player (not zoomed), sheets | Close |
| Pinch | Player | Zoom |
| Tap current tab | Tab bar | Pop to root, then scroll to top |

## 7. Motion

- **Tab switch:** content swaps with a 120 ms fade; the tab icon does a small bounce.
- **Push / Back (v1):** 150 ms cross-fade + 8 px rise. Gesture-driven back (`hasUAVisualTransition`)
  never animates. A slide for the in-app Back button may come in the polish slice.
- **Player:** opens with a 200 ms fade-up from the card; closes with a fade after the feed is scrolled.
- **Sheets:** spring up; drag to dismiss with rubber-banding.
- **Micro:** heart burst, follow wiggle, tab bounce, chip press squish, pill slide-in, new-post
  slide-down. More to trial with the Emil animation skills in the polish slice (owner request).
- **Reduced motion:** fades only; no particles, wiggle, bounce or slides; feeds don't autoplay video; the
  player defaults to Classic with no transition (Ken Burns, Prints drift and Reflections slides are off
  unless chosen again).

## 8. Desktop (≥ 900 px)

- Left sidebar: logo, 4 tabs, Search, account at the bottom.
- Feed column 600 px centered; grid uses the full width. Info is a right panel in the player. Sheets
  are popovers or centered dialogs.
- Keyboard: J/K card to card, L favorite, Enter plays from the card, G grid toggle, `/` search, Esc back.
  Player keys as above.

## 9. Accessibility (testable)

1. Every icon button has an accessible name; the tab bar is a `nav` with `aria-current="page"`.
2. On push, focus moves to the new screen's heading; on Back, focus returns to what opened it.
3. Every gesture has a button: favorite (♥), refresh (⋯ › Refresh), close player (✕), tag actions (tap
   a tag), unfollow (⋯), next/previous (‹ ›), zoom (desktop: Fit menu).
4. Chrome text and icons over art meet 4.5:1 (solid or 80%+ dark backing behind them).
5. Reduced motion as in §7.
6. Toasts with Undo stay 6 s, pause on hover/focus, and are announced via `role="status"`.
7. Player controls stay visible while paused and while focus is inside them.
8. At 200% text, chips keep their row height and truncate labels (full text available to assistive tech).
