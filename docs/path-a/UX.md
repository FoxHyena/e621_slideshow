# UX plan

Status: draft v1 (2026-11-25), before review round 1.
Phone first (375×812 reference). Desktop is the same screens with a sidebar.

## 1. Principles

1. **The art is the star.** Chrome is small, translucent, and gets out of the way while scrolling.
2. **Every place has a URL.** Back and the phone's edge swipe always do the expected thing. Reload lands
   where you were. No history hacks.
3. **Nothing jumps.** New posts never shift what you're reading; they wait behind a pill.
4. **Never lose your place.** Each tab, artist page and search keeps its scroll and loaded posts while
   you go elsewhere. Closing the player puts the feed on the post you stopped at.
5. **One tap to the good stuff.** Following opens on new posts. Play is one tap from any feed.
6. **Cute, not cluttered.** Delight lives in small moments (heart burst, follow wiggle, a mascot in
   empty states), never in extra UI.

## 2. Information architecture

```
Tabs (bottom bar on phone, left sidebar on desktop)
├── Following   /following        home when signed in
├── For You     /for-you          Recommended, ranked from your favorites
├── Artists     /artists          who you follow + suggestions
└── Settings    /settings

Pushed screens (open over any tab, Back returns)
├── Search      /search                 search screen: input, recent, saved, Favorites shortcut
├── Results     /search?tags=…&…        a feed of one search
├── Favorites   /favorites              your favorites as a feed
├── Artist      /artist/<name>          profile + their feed
└── Tune        /for-you/tune           For You's profile: breadth, pins, mutes, rebuild

Overlays (URL state on top of the screen they open from)
├── Player      ?play=<postId>          full-screen slideshow of that screen's feed
├── Info        ?play=<id>&info=1       post info sheet inside the player
└── Sheets      sign-in, player quick settings, follow-from-favorites (no URL; Back closes them)
```

- `/` redirects to `/following` (signed in or out; Following's signed-out state is the landing).
- **Search button** sits in the header of every tab screen (magnifier, top right). `/` opens it on desktop.
- **Grid / feed toggle** in the header of every feed screen. The choice is remembered per screen type.

### Legacy URLs (must keep working)

| URL | Opens |
|---|---|
| `/?v=1&tags=…&style=…` (share link) | Results feed for that search, player open on its first post, link's playback for this visit |
| `/?v=1…#u=…&k=…` (share with sign-in) | Same, signed in for this tab only; fragment stripped at once |
| `/?tags=wolf+solo` (userscript launch) | Results feed for `wolf solo`, player open (owner decision Q4) |
| `/` | Home (`/following`) |

Closing the player from a link lands on the Results feed, not home. Back from that Results feed goes
to `/following` (we replace the entry, so Back doesn't reopen the player).

## 3. Navigation model

- **Tab tap:** goes to that tab's root, keeping its scroll. Tapping the tab you're on scrolls to the top
  (a second tap at the top refreshes, like most social apps).
- **Pushed screens** push a history entry. Back (button, edge swipe, Esc, browser back) pops it.
- **Tab switches push too**, so Back after switching tabs returns to the previous tab with its scroll.
  (Native apps keep a stack per tab; one browser history can't, and push is the least surprising.)
- **Player** pushes `?play=<id>` on top of the current screen. Closing (X, swipe down, Back, Esc)
  pops it. The screen underneath stays mounted, and scrolls to the post the player was on.
- **Sheets** (sign-in, quick settings, follow-from-favorites) push a history state without a URL change so
  Back closes them. Everything else closes them too: tap the scrim, drag down, Esc.
- Screens stay alive when hidden: at most the 4 tabs + the last 6 pushed screens keep their posts and
  scroll in memory; older pushed screens rebuild from their URL (fetching again) when revisited.

## 4. Screens

Every feed screen shares one layout: **header** (large title that shrinks on scroll; actions on the
right), optional **chips row**, the **feed or grid**, and a **footer** state (loading more / end /
error). States are listed for each screen; "feed states" below are shared.

### Shared feed states

| State | What you see |
|---|---|
| First load | 3 skeleton cards with the reserved shape, shimmer. For You uses its progress loader instead (it ranks everything before showing). |
| Loading more | Small inline spinner at the bottom, 1500 px ahead of the end so it rarely shows |
| End | "That's everything" with a small doodle; counts of posts hidden by blacklist / sign-in |
| Empty | Mascot + one sentence + one action (per screen below) |
| Error | Card: e621's message, Retry. Rate limited: "e621 asked us to slow down, retrying in 5 s" auto-retry |
| Offline | Thin banner under the header: "You're offline. Showing what's already loaded." Retry when back |
| Signed out (where sign-in is needed) | Mascot, why, **Sign in** (opens the sign-in sheet), and **Search instead** |

### Feed card (all feeds)

```
┌───────────────────────────────────────┐
│ (av) artist_name · 3h      [+ Follow] E│  avatar + name → artist page; Follow pill only if not followed
│┌─────────────────────────────────────┐│
││                                     ││  media, aspect ratio reserved; double-tap = favorite + heart burst
││                                     ││  videos: only the card in the middle of the screen plays, muted
│└─────────────────────────────────────┘│
│ ♥ 1.2k   ▲ 340          ▶ Play   ↗    │  heart, score, Play from here, open on e621
│ [species] [character] [general …] →   │  tag strip, swipe sideways; hold a tag for actions
└───────────────────────────────────────┘
```

- The rating letter is a small corner badge, not a chip row item.
- The **[+ Follow]** pill shows in For You, Results, Favorites (not Following, not the artist's own page).
  Tapping it follows with a wiggle and turns into "Following ✓" for 2 s, then hides.
- **Hold a tag** (450 ms) → two targets: **Search** (Results: narrows the search; other feeds: opens
  `/search?tags=<tag>`; For You: **Pin**) and **Blacklist** (hides matching posts in place, with Undo).

### Chips row

One horizontally scrolling row under the header. Chips are per screen and remembered per screen type.

| Chip | Following | For You | Results | Favorites | Artist |
|---|---|---|---|---|---|
| Media: **All / Images / Videos** (segmented, one chip) | ✓ | ✓ | ✓ | ✓ | ✓ |
| **Hide favorited** (toggle) | ✓ | — (already left out) | ✓ | — | ✓ |
| **Sort: New / Top / Hot** (one chip, tap cycles; long-press lists) | — (always newest) | — (ranked) | ✓ | ✓ | ✓ |
| **Date: Any / Today / Week / Month** | — | ✓ (sets the ranking window) | ✓ | — | ✓ |
| **Score ≥ 50** (toggle; tap-and-hold to change the number) | — | ✓ | ✓ | ✓ | ✓ |

- Active chips are filled; inactive outline. At most 5 chips, so the row fits on most phones without
  scrolling. A chip change reloads that feed from the top (it's a different query).
- Ratings are not a chip (owner: most people want explicit). They're a global setting under
  Settings › Content, applied to every feed.

### Following `/following` (home)

Header: **Following** · search · grid toggle. Subtitle under the title: "12 new since yesterday".

**Normal:**

```
  Following                     🔍 ▦
  12 new since yesterday
  [All|Img|Vid] [Hide favorited]
  ┌ card (new) ┐
  ┌ card (new) ┐
  ┌ +9 more from artist_x  ▾ ┐     burst group (see below)
  ┌ card (new) ┐
  ──── ✓ You're caught up ────     divider at e621's marker
  ┌ Artists you might like  → ┐   carousel of 8 suggestions with Follow buttons
  ┌ card ┐                         older posts continue
```

- **Feed:** `search:subscriptions` + chips + global ratings, newest first, cursor paging.
- **New posts:** those with id above e621's `last_seen_post_id`. A small dot marks each new card.
- **Caught-up divider:** between the last new post and the first seen one. When it scrolls past the top
  of the screen (you've seen everything new), we advance e621's marker. Next visit's "new" starts there.
- **Bursts:** within the new posts, if one artist has more than 4 in a row (or 6 within 10 posts), show
  the first 3, then a row "+N more from <artist> ▾". Tap expands in place (no jump: content grows below).
- **Artist suggestions carousel** right after the divider (or after the 10th post when there is nothing
  new): avatar, name, "you faved 23", **Follow**. Swipe sideways. "See all" → Artists › Suggested. A
  "Not interested" in each card's ⋯ hides that artist from suggestions for good (local).
- **Pull to refresh** at the top: fetches posts newer than the top one and inserts them above with a soft
  slide. While scrolled down, the app checks for new posts on return to the tab and every 5 minutes while
  visible; if any, a pill **↑ 6 new posts** floats under the header. Tap → smooth-scroll to top, posts
  are inserted there. Nothing is inserted while you're reading.

**States:**

| State | Content |
|---|---|
| Signed out (the landing) | Mascot waving. "Follow the artists you love and see their new posts first." **Sign in with e621** · **Search e621**. Small "What's an API key?" link. |
| Signed in, reading favorites for the first time | Progress loader with checklist: "Finding artists you love" (favorites → tag counts). Cancel = "Skip, I'll pick myself" → Artists › Suggested |
| Signed in, follows no one | **Follow from favorites** card (below) as the whole screen |
| Follows no one, has no favorites | "Find artists to follow": search box (artists only) + "Popular artists" list from e621's artist post counts |
| Following people, nothing posted yet | "No posts yet from the N artists you follow." + suggestions carousel |
| Everything seen, no older posts | Divider + carousel + "That's everything" |

**Follow from favorites** (first run, and from Artists › Suggested):

```
  You've favorited these artists a lot.
  Follow them?
  [✓] (av) artist_a     you faved 48 · 312 posts
  [✓] (av) artist_b     you faved 31 · 90 posts
  [ ] (av) artist_c     you faved 9 · 1.2k posts
  …  (top 30, scroll)
  [ Follow 10 artists ]            primary, count updates
  Skip for now
```

- The top 10 by affinity are pre-checked; the rest unchecked. One bulk POST.
- Result: confetti-lite (the button's heart pops), then the feed loads. If e621 skipped some, a toast
  lists them ("2 skipped: name changed or no longer exists").
- Disabled past 500 total, with "e621 allows 500 follows".

### For You `/for-you`

Header: **For You** · Favorites (heart icon → `/favorites`) · Tune (sliders → `/for-you/tune`) · search · grid.

- The existing Recommended engine, unchanged: ranks the window, then shows. First run shows the progress
  loader with its checklist; later runs show the loader in place of skeletons.
- Chips: Media, Date (the ranking window; default Week), Score.
- **Pull to refresh** re-runs the search (the loader appears, the current list stays until the new one
  is ready, then crossfades). No new-posts pill: the list is a ranking, not a timeline.
- Card extras: a tiny "because: tag_a, tag_b" line under the media (from match reasons), tap → Tune.
- States: signed out (mascot + sign in + "For You learns from your favorites"); too few favorites
  ("Favorite a few more posts: a tag needs 3"); everything muted; error.

### Tune `/for-you/tune`

The current RecommendedPanel moved to its own screen: sync status + Rebuild, Breadth slider, filter box,
tag list with Pin / Mute, Muted list. "Apply" isn't needed: leaving the screen re-ranks if anything changed
(For You shows the loader).

### Artists `/artists`

Header: **Artists** · search. Segmented control: **Following (42)** · **Suggested**.

**Following list:**

```
  [🔍 filter artists     ]  Sort: Recent ▾
  (av)• artist_a       posted 2h ago · you faved 48      ›
  (av)  artist_b       posted 3d ago · you faved 12      ›
```

- The • dot means posts newer than e621's marker (from Following pages already loaded; no extra calls).
- Sort: Recent activity (default) / A–Z / Most faved.
- Row tap → artist page. Swipe left (or ⋯ on desktop) → Unfollow, with Undo toast.
- "Recent activity" for artists not seen in loaded Following pages shows "–" until their page is opened.
- Footer: "42 of 500".
- Pull to refresh: re-reads the subscription list.

**Suggested:**

- Ranked artists you don't follow: "you faved 23 of their 140 posts · posted 4d ago". **Follow** button per row.
- Top: **Follow from favorites** banner (opens the sheet) when there are 3+ strong suggestions.
- ⋯ → Not interested.
- States: reading favorites (loader); too few favorites (explain + search).

**Signed out:** mascot + sign in + "Search for an artist" (search screen with an "Artists" filter).

### Artist page `/artist/<name>`

```
  ‹                                  ⤴ ↗      back · share · open on e621
            (  big avatar  )
            Artist Name
     1.2k posts · you faved 48 · posted 2h ago
        [   Follow   ]  or  [ Following ✓ ]
  [All|Img|Vid] [Hide favorited] [New▾] [Any date] [Score]
  ▶ Play all                              ▦
  ┌ card ┐ …
```

- Name shown with underscores as spaces; the raw tag in small mono under it.
- Header collapses to a compact bar (avatar + name + Follow) as you scroll.
- **Follow** → button morphs to "Following ✓" with a wiggle; tapping "Following" asks "Unfollow?" in a
  small popover (one more tap), no modal.
- **Share** uses the system share sheet with `https://<site>/artist/<name>`; falls back to copy link.
- Stats: posts = tag post count; "you faved" = favorites profile count (hidden if 0 or signed out);
  "posted …" = newest post's date from the first feed page.
- States: unknown tag ("No artist called X on e621" + search); not an artist tag (still works: it's a
  tag feed, title shows the tag, Follow says "Follow tag"); 500 limit reached (Follow disabled with note).

### Search `/search`

```
  ‹  [ wolf solo_          ✕ ]   Search     input autofocused, e621 autocomplete
  Recent:  [wolf solo] [fox -feral] [pool:123]
  Saved
    ★ Cozy foxes        fox cozy rating:s     ›
  Your favorites        ›
  Search cheatsheet ↗
```

- Submitting pushes `/search?tags=…` (Results). The Search screen stays below it in history, so Back
  returns here with the text still in the box.
- Autocomplete as today. Artist-category suggestions show a small avatar and "artist".
- Tag-limit counter ("12 / 40 tags") appears under the input once over 30.

### Results `/search?tags=…`

Header: the query as a tappable pill (→ Search screen to edit) · ★ Save · ▶ Play · grid toggle.
Chips: Media, Hide favorited, Sort, Date, Score. Save asks for a name in a small popover.
States: no results ("No posts match. N hidden by your blacklist."), over the tag limit (inline warning on
the Search screen; can't submit).

### Favorites `/favorites`

Header: **Your favorites** · ▶ Play · grid. Chips: Media, Sort, Score. Signed out → sign in.

### Player (overlay `?play=<postId>`)

Opened by: **Play** in a header (from the first post), **▶ Play** on a card (from that post), a grid tile,
a share/launch link. It plays the screen's own feed, so it keeps loading more as it goes.

```
  ✕                         ♥  ⓘ  ⚙  🔗  ⛶     close · fav · info · quick settings · share · fullscreen (desktop)
              (slide)
  ‹   ❚❚   ›    12 / 300+
  ────────────── progress bar
```

- Controls auto-hide after 2.5 s; tap toggles them on phone.
- Gestures: swipe left/right = next/previous; **swipe down = close**; double-tap = favorite + burst.
- All 5 styles, timer, preload, stall skip, video duration rules unchanged.
- **Quick settings sheet (⚙):** Style (5 thumbnails), Seconds per slide (stepper), Fit (classic),
  Mute, Quality. "More in Settings" link. Changes apply live and are saved.
- **Info (ⓘ):** bottom sheet on phone, side panel on desktop. Tags by category; tap a tag → small menu:
  Search this tag, Blacklist, Pin/Mute (For You), Open artist (artist tags).
- **Share (🔗):** copies a share link of the screen's search + playback (not for For You or Following,
  which depend on the account).
- Closing returns to the screen with the feed scrolled to the post that was showing.
- Keyboard (desktop) unchanged: ← → space F I L G T C O S Esc. G / T close the player into that screen's
  grid / feed view. S opens Settings.

### Settings `/settings`

Sections as a grouped list (iOS-style), each opening inline or as a sub-page on phone:

1. **Account:** signed in as X (avatar from kaleidoscope), share-sign-in toggle with warning, Sign out.
   Signed out: the sign-in form (username, API key, remember, "Get an API key ↗").
2. **Content:** Ratings (Safe / Questionable / Explicit), Blacklist (editor, sync, import).
3. **Slideshow:** the full playback list (style, seconds, preload, fit, transition, quality, video max,
   mute, loop).
4. **For You:** link to Tune.
5. **App:** Install app (instructions per platform; "Installed ✓" when standalone), e621 button
   (userscript), Keyboard shortcuts (desktop only), About / version.

### Sign-in sheet

Opened from any "Sign in" button. Username, API key (password field), "Remember on this device"
(default on), **Sign in**, "Get an API key ↗" (opens e621's API key page). Errors inline. After sign-in,
the sheet closes and the screen that asked reloads its state (Following → onboarding if no follows).

## 5. Gestures

| Gesture | Where | Does |
|---|---|---|
| Edge swipe from left | Any pushed screen | Back (native browser gesture; works because of real URLs) |
| Pull down at top | Following, For You, Artists, artist page, Results, Favorites | Refresh |
| Double-tap media | Feed cards, player | Favorite (never un-favorites) + heart burst |
| Hold a tag, drag | Tag strips | Search / Pin / Blacklist targets |
| Swipe left / right | Player | Next / previous slide |
| Swipe down | Player, sheets | Close |
| Swipe left on a row | Artists › Following | Unfollow (with Undo) |
| Tap active tab | Tab bar | Scroll to top; again at top = refresh |

## 6. Transitions

- **Tab switch:** instant swap with a 120 ms fade of the content; tab icon does a small bounce.
- **Push (artist, search, results):** slides in from the right 280 ms; Back slides out. When the browser
  already animated the back gesture (Safari edge swipe; `hasUAVisualTransition`), we skip ours.
- **Player open:** the tapped card's image grows into the full-screen slide (View Transition where
  supported, else a 200 ms fade-up). Close reverses into the card the player stopped on.
- **Sheets:** spring up from the bottom; drag to dismiss with rubber-banding.
- **New posts:** inserted above with a gentle slide-down only when you're at the top.
- All motion respects `prefers-reduced-motion` (fades only).

## 7. Desktop (≥ 900 px)

- Left sidebar: logo, the 4 tabs, Search button, signed-in account at the bottom.
- Feed column 600 px centered; grid uses the full width. Artist page header sits above the feed column.
- Player covers the whole window. Info is a right-side panel.
- Keyboard: J/K move between cards, L favorites, Enter plays from the card, G toggles grid, `/` search,
  Esc goes back. Player keys as listed above.

## 8. Accessibility

- Every icon button has a label; tabs are a `nav` with `aria-current`.
- Focus moves to the new screen's heading on push; back restores focus to what opened it.
- Pull to refresh has a button equivalent (tap active tab twice, or a refresh item on desktop).
- Text scales with the browser; chips wrap to two lines rather than truncate at large text sizes.
