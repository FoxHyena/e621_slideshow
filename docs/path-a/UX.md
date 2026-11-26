# UX plan

Status: **v2** (2026-11-25), revised after UX review round 1 (see REVIEWS.md).
Phone first (375×812 reference). Desktop is the same screens with a sidebar.

## 1. Principles

1. **The art is the star.** Chrome is small and gets out of the way while scrolling.
2. **Every place has a URL.** Back always does the expected thing; reload lands where you were.
3. **Nothing jumps.** New posts never shift what you're reading. They wait behind a pill and go in only
   when you ask (pull to refresh or tap the pill).
4. **Never lose your place.** Tabs, artist pages and searches keep their posts and position while you go
   elsewhere. Closing the player puts the feed on the post you stopped at.
5. **One tap to the good stuff.** Following opens on new posts. Play is one tap from any feed.
6. **Cute, not cluttered.** Delight lives in small moments (heart burst, follow wiggle, a mascot in
   empty states), never in extra UI.
7. **Honest UI.** Actions update instantly, and visibly roll back with a reason if e621 says no.

## 2. Information architecture

```
Tabs (bottom bar on phone, left sidebar on desktop)
├── Following   /following            home; signed out it's the landing
├── For You     /for-you              Recommended, ranked from your favorites
├── Artists     /artists              Following list · Suggested
└── Settings    /settings             grouped list
    └── /settings/account · /settings/content · /settings/slideshow · /settings/app

Pushed screens (open over any tab; Back returns)
├── Search      /search                       input, recent, saved, Your favorites
├── Results     /search?tags=…&<chips>        a feed of one search
├── Favorites   /favorites                    your favorites as a feed
├── Artist      /artist/<name>                profile + their feed
└── Tune        /for-you/tune                 For You's profile: breadth, pins, mutes, rebuild

Overlay (URL state on the screen it opens from)
└── Player      …?play=<postId>               full-screen slideshow of that screen's feed

Sheets (no URL, no history: close with ✕, scrim tap, drag down, Esc)
└── sign-in · player quick settings · post info · follow-from-favorites · chip menus · ⋯ menus
```

- `/` redirects to `/following`.
- **Search button** in every tab header (magnifier). `/` key opens it on desktop.
- **Grid/feed toggle** in every feed screen's header.
- `/artist/*`, `/search*` work signed out (anonymous e621 results, with the visitor's blacklist).

### Legacy URLs (must keep working)

| URL | Opens |
|---|---|
| `/?v=1&tags=…&style=…` (share link) | Results for that search, player open on its first post, the link's playback for this visit only |
| `/?v=1…#u=…&k=…` (share with sign-in) | Same, signed in for this tab only; fragment stripped at once |
| `/?tags=wolf+solo` (userscript launch) | Results for `wolf solo`, player open (owner decision Q4) |
| `/` | `/following` |

Link history is rewritten to `[/following, /search?tags=…, …?play=<id>]`, so closing the player lands on
Results and Back from Results goes home, never back to the link URL.

## 3. Navigation model

**Rule: tabs replace, pushes push, refinements replace.**

- History always looks like `[/following] [<other tab root>] [pushed screen] [pushed screen] [?play]`.
- **Tab tap (different tab):** pops any pushed screens, then shows that tab's root. Switching between
  non-home tabs replaces the entry; leaving Following adds one entry, so **Back at any tab root goes to
  Following, and Back at Following leaves the app.**
- **Tab tap (current tab):** at a pushed screen → pops to the tab root. At the root → scrolls to top.
- **Pushed screens** (Search, Results, Favorites, Artist, Tune, settings sub-pages) push an entry.
  Every pushed screen has an in-app **‹ Back** button top-left (installed iOS apps have no browser Back).
- **Refinements replace:** editing a Results query from its pill, changing a chip, narrowing by
  hold-a-tag → replace the Results entry. Opening a different place (an artist, a tag search from
  Following) pushes.
- **Player** pushes `?play=<id>` on the current screen. Moving between slides **replaces** `?play=`.
  Closing (✕, swipe down, Back, Esc) pops it.
- **Sheets never touch history.** A Back gesture while a sheet is open closes the sheet and goes back
  (the page behind changes); this is accepted rather than fighting Safari's snapshot animation.
- **Memory:** every screen visited keeps its post list and scroll anchor (post id + offset). Only the 4
  tabs and the last 6 pushed screens stay in memory; anchors also go to sessionStorage, so a reload or a
  revisit rebuilds the screen from its URL and scrolls back to the anchor.
- **Installed (standalone) mode:** a left-edge swipe on pushed screens triggers Back (our own gesture,
  since iOS gives standalone apps none). Later slice; the ‹ Back button covers it until then.

## 4. Scroll and refresh mechanics

- Screens scroll the **document** (so Safari's toolbars still collapse); `html { overscroll-behavior-y: none }`
  turns off Safari/Chrome's own pull-to-refresh and bounce at the top. Verify on device in slice 1;
  fallback: an inner scroll container per screen.
- **Pull to refresh:** at scroll top, dragging down past **72 px** (with 0.5 resistance) shows the
  spinner pinned under the header; release past the threshold refreshes, before it cancels with a spring
  back. While refreshing, the spinner stays at 48 px until done (min 400 ms so it never flickers).
- **New posts:** the app checks for newer posts when the screen becomes visible again (tab return, app
  foreground). If any, a pill **↑ 6 new posts** floats under the header, at top or not. Posts are only
  inserted on pill tap or pull to refresh:
  - Pill tap → smooth-scroll to top, then insert with a gentle slide-down.
  - Pull to refresh at top → insert directly.
  - Inserting keeps whatever card is under the header in place (explicit anchoring: measure, insert,
    `scrollBy` the difference), because Safari has no `overflow-anchor`.
- **Chrome on scroll:** the large title collapses into a 44 px bar; the chips row hides on scroll down
  and returns on scroll up; the floating Play pill hides on scroll down and returns on scroll up.

## 5. Screens

Every feed screen shares one layout: **header** (title, actions on the right), **chips row**, the
**feed or grid**, a **floating ▶ Play pill** (bottom center above the tab bar), and a **footer** state.

### Shared feed states

| State | What you see |
|---|---|
| First load | 3 skeleton cards with reserved shapes, soft shimmer. For You uses its progress loader. |
| Loading more | Starts 1,500 px before the end; a small spinner shows only if you catch up with it |
| End | "That's everything ✿" with counts hidden by blacklist / needing sign-in |
| Empty | Mascot + one sentence + one action (per screen) |
| Error | Card: e621's message + Retry. Rate limited (429/503): "e621 asked us to slow down" and auto-retry in 5 s |
| Offline | Banner under the header: "You're offline. Showing what's loaded." Turns into "Back online" (2 s) and retries |
| Needs sign-in | Mascot, why, **Sign in**, **Search instead** |

### Feed card (all feeds)

```
┌───────────────────────────────────────┐
│ (av) artist_name +2 · 3h  [+ Follow] ⋯│  avatar+name → artist; "+2" → artist picker; ⋯ menu
│┌─────────────────────────────────────┐│
││                                   E ││  media, aspect reserved; rating letter as a corner badge
││                                     ││
│└─────────────────────────────────────┘│
│ ♥ 1.2k    ▲ 340                       │  heart (button), score (text, not a button)
│ ▕ [species] [character] [general …] → │  tag strip: 16 px non-scrolling start gutter
└───────────────────────────────────────┘
```

- **Artists on a card:** non-artist tags (`conditional_dnp`, `sound_warning`, …) are stripped. The first
  artist shows; more than one shows "+N", which opens a small picker. Unknown artist: "unknown artist",
  not tappable. Names ellipsize; tap targets are ≥ 44 px.
- **[+ Follow]** shows on For You, Results and Favorites cards for artists you don't follow. Tap →
  wiggle, turns into a small ✓ that stays (no reflow), toast "Following artist_x · Undo". At 500 follows:
  toast "e621 allows 500 follows". On failure: rolls back, toast with the reason.
- **Media taps:**
  - Images: single tap does nothing; **double tap favorites** (never unfavorites) with a heart burst.
  - Videos: single tap plays/pauses (after a 250 ms double-tap guard); double tap favorites. A small mute
    button sits bottom-right on video cards. Only the card nearest the middle plays; one live `<video>`
    at a time, the rest are posters with a ▶ glyph. If autoplay is blocked (Low Power Mode), the poster
    and glyph stay until tapped.
- **♥ button** toggles (filled = favorited), optimistic, rolls back with a toast on failure.
- **⋯ menu:** Play from this post · Share post · Open on e621 ↗ · Blacklist this artist.
- **Hold a tag** (450 ms): two targets appear — **Search** (Results: narrows; elsewhere: opens
  `/search?tags=<tag>`; For You: **Pin**) and **Blacklist** (hides matching posts in place, toast with
  Undo). Drag onto one and let go, or lift and tap one; tap anywhere else cancels. A plain tap on a tag
  opens the same targets. Tags have no text selection or callout.

### Chips row

Each feed screen instance has its own filters (an artist's "Videos" doesn't leak to other artists).
Following and For You are single screens, so theirs persist across visits.

| Chip | Kind | Following | For You | Results | Favorites | Artist |
|---|---|---|---|---|---|---|
| **Media**: All / Images / Videos | menu | ✓ | ✓ | ✓ | ✓ | ✓ |
| **Hide favorited** | toggle | ✓ | — | ✓ | — | ✓ |
| **Sort**: New / Top / Hot (+ the other e621 orders under "More") | menu | — | — | ✓ | ✓ | ✓ |
| **Date**: Any / Today / This week / This month / Custom… | menu | — | ✓ (ranking window) | ✓ | — | ✓ |
| **Score**: Any / ≥ 10 / ≥ 50 / ≥ 100 / ≥ 500 | menu | — | ✓ | ✓ | ✓ | ✓ |

- A chip with a non-default value is filled and shows the value ("Videos", "Top", "This week", "≥ 50").
- **Reset** chip appears at the end when anything is non-default.
- Menus are small popovers anchored to the chip; "Custom…" opens the existing date panel in a sheet.
- A chip change reloads that feed from the top (replace history). On For You it debounces 600 ms.
- Ratings aren't a chip (owner: most people want explicit): Settings › Content › Ratings applies to all
  feeds. Results opened from an old share link use the link's ratings.

### Following `/following` (home)

Header: **Following** · search · grid · ⋯ (Refresh, Mark all as seen). Subtitle: "12 new" / "All caught up".

```
  Following                   🔍 ▦ ⋯
  12 new
  [Media ▾] [Hide favorited]
  ┌ card • ┐                          • = new
  ┌ card • ┐
  ┌ card • (artist_x) ┐
  ┌ card • (artist_x) ┐
  ┌ card • (artist_x) ┐
  ┌ +9 more from artist_x  ▾ ┐       burst
  ──── ✓ You're caught up ────       divider at e621's marker
  ┌ Artists you might like   See all ┐   one card, 8 suggestions in a row
  ┌ card ┐                            older posts continue
                (▶ Play)              floating pill
```

- **Feed:** `search:subscriptions` + chips + global ratings, newest first, cursor paging.
- **New** = id above e621's `last_seen_post_id` as read when the screen first loaded this session. That
  set doesn't change during the session (so dots don't vanish as the marker moves).
- **Marker advance:** once the caught-up divider has been above the header for **1.5 s** while the page
  is idle (not flinging), the app moves e621's marker (`visit`). ⋯ › Mark all as seen does it at once.
  Without any new posts, nothing is advanced.
- **Bursts (exact):** walk the new posts in order; a run is consecutive posts that share their first
  artist. A run of **5 or more** shows its first 3, then a row "+N more from <artist> ▾". Runs never
  cross the divider and only apply to new posts. Expanding is in place (content grows below; nothing
  above moves) and lasts for the session. Collapsed posts still play in the player.
- **Suggestions card:** once per session, right after the divider (or after the 10th post when nothing is
  new). Horizontal row of 8: avatar, name, "you faved 23", **Follow**. "See all" → Artists › Suggested.
  ⋯ on a suggestion → Not interested (undo in Settings › For You › Hidden artists).
- **Pull to refresh** and the **new posts pill** as in §4.

| State | Content |
|---|---|
| Signed out (landing) | Card: mascot waving, "Follow the artists you love and see their new posts first.", **Sign in with e621**. Below it, a real feed: **Popular today** (`order:rank`), so the app is useful before signing in. |
| First read of favorites | Progress loader with checklist: "Finding artists you love". Link: "Skip, I'll pick myself" → Artists › Suggested |
| Follows no one | **Follow from favorites** sheet content shown inline as the screen |
| Follows no one, no favorites | "Find artists to follow": Search (artists filter) + "Popular artists" (e621 artists by post count) |
| Follows people, no posts yet | "No posts yet from the N artists you follow." + suggestions card |

**Follow from favorites** (first run inline; also a sheet from Artists › Suggested):

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

- Top 10 by affinity pre-checked. One bulk request. The button's heart pops; the feed loads.
- e621 skips (renamed, gone, already followed) → toast "2 skipped: …".
- Can't exceed 500 total: the button says "e621 allows 500 follows (N left)" and disables.

### For You `/for-you`

Header: **For You** · Tune (sliders) · search · grid · ⋯ (Refresh). Subtitle: "Ranked 3 min ago".

- The existing Recommended engine, unchanged: ranks the window, then shows. The progress loader shows on
  first run and whenever it re-ranks with nothing to show yet.
- The ranked id list is kept in sessionStorage, so reload and Back restore the same order.
- Chips: Media, Date (ranking window, default This week), Score.
- **Pull to refresh:** re-ranks only if the ranking is older than 10 min; otherwise a toast "Already fresh,
  ranked 3 min ago" (⋯ › Refresh forces it). While re-ranking, the old list stays; when done, a pill
  "New ranking ready" swaps it in (tap) — nothing replaced under your thumb.
- States: signed out (mascot, "For You learns from your favorites", Sign in, plus Popular today);
  too few favorites ("A tag needs 3 favorites. Favorite a few more posts."); everything muted; error.

### Tune `/for-you/tune`

The current Recommended panel as its own screen: sync status + Rebuild, Breadth slider, filter box, tag
list with Pin / Mute, Muted list. Leaving with changes shows an **Apply changes** pill on For You (tap to
re-rank); nothing re-ranks on its own.

### Artists `/artists`

Header: **Artists** · search. Segmented: **Following (42)** · **Suggested**.

**Following:**

```
  [🔍 filter artists      ]   Sort: Recent ▾
  (av)• artist_a     posted 2h ago · you faved 48     ⋯
  (av)  artist_b     posted 3d ago · you faved 12     ⋯
                     42 of 500
```

- Opening the tab fetches one page of `search:subscriptions` (320 posts) if Following hasn't loaded one
  in the last 10 min. From it: **•** = has posts newer than the marker; "posted …" = newest post seen.
- Artists not in that page show "posted a while ago" and sort A–Z after the dated ones.
- Sort: Recent (default) / A–Z / Most faved.
- Row tap → artist page. ⋯ → Unfollow (toast with Undo), Share artist.
- Pull to refresh re-reads the subscription list and the page above.

**Suggested:** ranked artists you don't follow — "you faved 23 of their 140 posts · posted 4d ago" —
with **Follow** per row. A **Follow from favorites** banner at the top when there are 3+ strong ones.
⋯ → Not interested. States: reading favorites (loader); too few favorites (explain + Search).

**Signed out:** mascot + Sign in + "Search for an artist".

### Artist page `/artist/<name>`

```
  ‹ Back                               ⤴      share
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
- **Follow** → wiggle + "Following ✓". Tapping **Following ✓** unfollows at once with a toast + Undo
  (same as the Artists row; no popover).
- **Share** → system share sheet with `https://<site>/artist/<name>`, fallback copy link. ⋯ in the header:
  Open on e621.
- Stats: posts = tag post count; "you faved" = favorites profile (hidden when 0 or signed out); "posted"
  = newest post in the first page.
- States: unknown tag ("No artist called X on e621" + Search); a non-artist tag (works as a tag feed,
  "Follow tag"); 500 follows reached (Follow disabled + note); signed out (Follow → sign-in sheet).

### Search `/search`

```
  ‹  [ wolf solo_         ✕ ]          input autofocused, e621 autocomplete
  Recent:  [wolf solo] [fox -feral] [pool:123]      Clear
  Saved
    ★ Cozy foxes      fox cozy        ⋯
  ♥ Your favorites                    ›
  Search cheatsheet ↗
```

- Submit → Results (push). Opened from a Results pill ("edit mode"), submit **replaces** that Results.
- Autocomplete as today; artist suggestions show a small avatar and "artist".
- Tag counter ("32 / 40 tags") once over 30; over the limit, Search is disabled with the reason.

### Results `/search?tags=…`

Header: ‹ · the query as a pill (→ Search in edit mode) · ★ Save · grid · ⋯ (Copy share link).
Chips: Media, Hide favorited, Sort, Date, Score. ★ asks for a name in a small popover.
States: no results ("No posts match. 3 hidden by your blacklist."), error, signed-out-hidden counts.

### Favorites `/favorites`

Header: ‹ **Your favorites** · grid. Chips: Media, Sort, Score. Reached from Search and
Settings › Account. Signed out → needs sign-in.

### Player (overlay `?play=<postId>`)

Opened by the floating **▶ Play** pill (from the top, or "Play from here" once scrolled: the card in
the middle), a card's ⋯ › Play from this post, a grid tile, or a link. It plays the screen's own post
list and appends to it as it goes (the feed grows too).

```
  ✕                                           ⛶ (desktop)
              (slide)
  ♥     ⓘ     ⚙     ⤴                         action rail, thumb zone
  ‹    ❚❚    ›          12 / 300+
  ───────────── progress bar ─────────────   above safe-area inset
```

- Controls auto-hide after 2.5 s; single tap toggles them (250 ms double-tap guard).
- Gestures: swipe left/right = next/previous (swipes starting within 24 px of a screen edge are left to
  the OS); **swipe down = close**; double tap = favorite + burst (also on videos; never seeks).
- All 5 styles, timer, preload, stall skip and video rules unchanged.
- **Offline:** pauses with a "Paused: offline" chip instead of stall-skipping; resumes when back.
- **⚙ Quick settings sheet:** Style (5 thumbnails), Seconds per slide, Fit (Classic), Mute, Quality,
  "More in Settings". Opening pauses; closing resumes. Saved as defaults, except on a link visit: then a
  "This visit only / Save as default" switch (default: this visit only).
- **ⓘ Info sheet:** bottom sheet (phone) / right panel (desktop). Tags by category; tap a tag → menu:
  Search this tag · Blacklist · Pin/Mute (For You) · Open artist (artist tags). Recommended reasons here.
- **⤴ Share:** Results/Favorites/Artist: copies a share link (search + playback); Following/For You:
  shares the post's e621 link instead (those feeds depend on the account).
- **Close** scrolls the feed so the last post shown is centered, then fades the player out.
- **Reload on `?play=`:** rebuilds the screen's feed and jumps to the id; if it isn't there, fetches that
  post alone, plays from it, toast "Couldn't restore your place".
- Desktop keys unchanged: ← → space F I L C O Esc; G / T close the player into the screen's grid / feed;
  S opens Settings.

### Settings `/settings`

Grouped list; each group is a sub-page on phone (`/settings/<section>`), all on one page on desktop.

1. **Account:** signed in as X (kaleidoscope avatar), ♥ Your favorites, share-sign-in toggle with
   warning, Sign out. Signed out: Sign in.
2. **Content:** Ratings (S/Q/E), Blacklist (editor, account sync, import defaults).
3. **Slideshow:** full playback list (style, seconds, preload, fit, transition, quality, max video, mute, loop).
4. **For You:** Tune ›, Hidden artists (undo "Not interested").
5. **App:** Install app (per-platform steps; "Installed ✓" in standalone), e621 button (userscript),
   Keyboard shortcuts (desktop), About.

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

- The username draft survives the trip (sessionStorage); the key is never stored until sign-in succeeds
  (and then only if Remember is on, as today).
- Errors inline ("e621 didn't accept that username and key"). On success the sheet closes and the screen
  that asked continues (Following → follow-from-favorites when you follow no one).

## 6. Gestures

| Gesture | Where | Does |
|---|---|---|
| Edge swipe from left | Pushed screens (browser); standalone later slice | Back |
| Pull down at top | Following, For You, Artists, Artist, Results, Favorites | Refresh (§4) |
| Double tap media | Cards, player | Favorite (never unfavorites) + heart burst |
| Single tap video | Cards | Play / pause |
| Hold a tag (450 ms) | Tag strips | Targets: Search/Pin, Blacklist (drag or tap) |
| Swipe sideways | Tag strip, chips row, suggestions card | Scroll that row (contained; 16 px start gutter) |
| Swipe left / right | Player | Next / previous |
| Swipe down | Player, sheets | Close |
| Tap current tab | Tab bar | Pop to root, then scroll to top |

## 7. Motion

- **Tab switch:** content swaps with a 120 ms fade; the tab icon does a small bounce.
- **Push / Back (v1):** 150 ms cross-fade + 8 px rise. Gesture-driven back (`hasUAVisualTransition`)
  never animates. A slide for the in-app Back button may come in the polish slice.
- **Player:** opens with a 200 ms fade-up from the card; closes with a fade after the feed is scrolled.
- **Sheets:** spring up; drag to dismiss with rubber-banding.
- **Micro:** heart burst, follow wiggle, tab bounce, chip press squish, pill slide-in, new-post slide-down.
  More microinteractions to trial with the Emil animation skills in the polish slice (owner request).
- `prefers-reduced-motion`: fades only; no burst particles, wiggle or bounce.

## 8. Desktop (≥ 900 px)

- Left sidebar: logo, 4 tabs, Search, account at the bottom.
- Feed column 600 px centered; grid uses the full width. Info is a right panel in the player.
- Keyboard: J/K card to card, L favorite, Enter play from the card, G grid toggle, `/` search, Esc back.
  Player keys as above.

## 9. Accessibility (testable)

1. Every icon button has an accessible name; the tab bar is a `nav` with `aria-current="page"`.
2. On push, focus moves to the new screen's heading; on Back, focus returns to what opened it.
3. Every gesture has a button: favorite (♥), refresh (⋯ › Refresh), close player (✕), tag actions (tap a
   tag opens the targets as buttons), unfollow (⋯), next/previous (‹ ›).
4. Text and icons on chrome over art meet 4.5:1 (chrome uses a solid or 80%+ dark backing, not text on art).
5. With `prefers-reduced-motion`, no particles, wiggle, bounce or slides.
6. Toasts with Undo stay 6 s, pause on hover/focus, and are announced via `role="status"`.
7. Player controls stay visible while a screen reader or keyboard focus is inside them.
8. At 200% text size, chips wrap within their row height and nothing overlaps; labels may truncate with
   the full text available to assistive tech.
