# Decisions (append-only)

Format: date — decision. Why. Rejected alternatives.

## 2026-11-25 — Inherited from the owner (GOAL.md §2)
- Following is the signed-in home tab; signed-out gets a landing that still allows search.
- Share e621's "new since last visit" marker if clean, else a local marker per account.
- Phone first; desktop is a sidebar version plus existing keyboard shortcuts.
- Extras in scope: artist profile pages, PWA, pull to refresh + new-posts pill, bulk-subscribe from favorites.

## 2026-11-25 — Phase 1 scope frozen (owner answers in QUESTIONS.md Q1–Q7)
- **Tabs:** Following · For You · Artists · Settings. Search is a header button on every tab opening a
  search screen (saved + recent + Favorites shortcut); results open as their own feed. Favorites is also
  reachable from For You. Rejected: 5th tab (tight on phones), Explore switch.
- **Player settings:** quick sheet in the player (style, speed, fit, mute) + full list in Settings.
- **Launch links** (`?tags=`) start the slideshow straight away; closing the player lands on a feed of
  that search, not the home tab. Share links (`?v=1…`) likewise.
- **New-post marker: share e621's.** Read `last_seen_post_id` of the `is_subscription` row from
  `GET /saved_searches.json`; advance with `GET /saved_searches/:id/visit.json` (fetch with
  `redirect: "manual"`; the 302 is the success signal, opaque cross-origin). It touches only that row,
  so the user's other tracked searches are safe. Known trade-offs: the marker jumps to the site's max
  post id at visit time (posts uploaded between load and visit lose "new"), `new_count` caps at 100, the
  anchor doesn't exist until the first subscription. Rejected: `mark_all_seen` (clears every tracked
  search), `/tag_subscriptions/visit` (HTML, and only safe without custom tracked searches). Not yet
  verified against live e621 (needs the owner's key): fallback is a local marker if visit.json misbehaves.
- **Extras in scope:** P1 scroll per tab, P2 caught-up divider, P3 heart burst, P4 group artist bursts,
  P5 feed chips (Images/Videos, Hide favorited, Sort New/Top/Hot, Date Today/Week/Month, Score > N; no
  rating chip), P6 new dots on Artists, P7 offline state, P8 share an artist. Plus a microinteraction
  pass trialled with the Emil animation skills (owner asked). Out: P9 snooze, P10 haptics, P11 badge.
- **Hosting:** stay on Vercel (not static export), so `/artist/[name]` works without
  `generateStaticParams`. One persistent client shell in the root layout keeps queues and scroll alive;
  don't rely on `cacheComponents` (keeps only 3 hidden routes). Details in ENGINEERING.md target (Phase 4).

## 2026-11-25 — UX sign-off round
- Seen marker moves automatically (owner, Q8): after scrolling a screen past the divider with no filters,
  dwell 1.5 s, toast "Marked as seen on e621". Manual ⋯ › Mark all as seen too.
- UX not yet signed off (Q9): spacing/hierarchy research first, all wireframe values tokenized, fix card
  header alignment and suggestion tiles. Research lives in `docs/path-a/research/`.

## 2026-11-25 — UX signed off (Phase 2 gate)
- Owner: UX okay; spacing/hierarchy work continues as visual design (Phase 3), informed by the three
  research files in `docs/path-a/research/`.
- Suggestions (Following card and Artists › Suggested) show one artist per section with 3 tiled recent
  posts, filtered by ratings + blacklist, fetched in one batched `~a ~b …` request. Rejected: a
  horizontal row of small avatar tiles (owner found it janky).

## 2026-11-25 — Visual direction (Phase 3)
- Owner picked **A, e621 colours refined** (navy + #fcb328 gold), with a condition: "it should not tint
  every picture. The idea behind this is seeing the art." So the ground around art is a neutral
  near-black; navy is kept for chrome surfaces (cards, chips, sheets, tab bar) that don't frame art,
  and gold for accents. Nothing is overlaid on art except what the medium needs (video play, mute).
  Rejected: B plush hang tag (my recommendation), C reference sheet. impeccable telemetry: kind canon.
- Owner: spacing fixes "a little better", but "overall our visual information architecture and sizes of
  things all feels kind of off and inconsistent". Response: a closed size system (5 type sizes, 2
  control heights, 1 row height, 2 icon sizes, 3 avatar sizes, 5 spacing steps, 3 radii) that every
  screen must use, shown on the next comparison page.
- Process fix: the first comparison shipped with chips, Play and Follow unstyled (a `.phone button`
  reset beat the component classes). Every mock now gets a Playwright screenshot before it's shown.

## 2026-11-25 — Direction A v3 (owner feedback on v2)
- Owner: v2 "too close to an Instagram clone": single full-width feed, post header + heart row, flat
  minimal dark look, icon tab bar all contributed. "Definitely want to stick with e621 theming (navy)."
- Owner chose: **navy post panels** (art inside, navy frames are fine), **tag category colours**, **post
  numbers and scores**, **navy panels and borders**. Not chosen: hexagon motif.
- v3 uses e621ng's Hexagon theme values (background #020F23, foreground #152F56, section #1F3C67, link
  #B4C7D9, active gold #E8C446, tag/rating/score colours). Six small-text colours fail 4.5:1 on panels in
  e621 itself; v3 keeps each hue and lightens it to pass. Verdana stack for type. Text tabs with a gold
  marker replace the icon tab bar. Play is a squared gold button bottom-right.
- Gold changes from the app's #FCB328 to e621's own active colour #E8C446.

## 2026-11-25 — Direction A v4 (owner references)
- Owner: bottom bar should float, "mimicking iOS standards and approach to clean ui". Shared AllTrails iOS
  screens as a reference for organised visual architecture, buttons and structure.
- Owner: "I don't want to rip it directly. It should be treated as a study for things like spacing,
  component design ... take those learnings into our own design as a designer would, not directly
  copying." Study recorded in research/alltrails-study.md (principles → ours, plus a Not taken list).
- v4: e621 Hexagon colours (v3) + iOS structure: large titles, round toolbar buttons, floating navy glass
  tab bar (icon + label, selected tab in its own capsule, gold), Play pill floating above it, posts with
  rounded art and three fixed lines under it (artist / e621 stats with favourite pill / coloured tags), no
  card boxes, nothing on top of art except video controls. System font (SF Pro) replaces Verdana; the
  owner didn't answer the font question, so this follows "iOS standards".

## 2026-11-25 — Duolingo study (owner)
- Owner: "study and pull on duolingo design for a more playful feel and do research about their design."
  Same rule as AllTrails: a study, not a copy. Observations from owner-shared screens are in
  research/duolingo-study.md. Published-source research is in research/duolingo-research.md (agent).
  v5 mocks will apply: tactile lips on pressables, rounded type (ui-rounded), coloured stat icons, meaning
  colours on navy, chunky progress, celebration moments off the art, our own mascot.

## 2026-11-25 — Visual direction signed off (v5.2)

- Owner on v5.1: "Yes, want artist name/info at top of card tho, with faving and other things below. Maybe
  play button is a circle with play logo inside on bottom right of screen instead of center".
- v5.2 applies both: the artist line (avatar, name, New · time, ⋯) heads each navy post panel, as UX.md's
  card sketch already showed; favourite, score, post number and tags sit under the picture. Play is a
  56 px gold circle at the bottom right above the tab bar, with a small count badge. UX.md bottom stack
  updated to match.
- Kept from review round 2 (owner didn't object): e621 tag category colours, "Media" / "Hide favorited"
  labels.
- Phase 3 gate: two design review rounds done (REVIEWS.md) + owner OK. Archived: mocks/direction-a-v5-2.html.

## 2026-11-25 — Post panel spacing (v5.3)

- Owner on v5.2: "I still think that the spacing here is a little jank". Causes: the header collapsed to 24 px
  (a `.line1` rule overrode its 44 px height), so the avatar sat 4 px under the border; the picture was inset 8
  while text was inset 16; top and bottom padding differed (4 vs 12).
- Fix (owner: "let's do it"): one 12 px inner edge for everything in the panel; 44 header flush to the top;
  12 picture → stats, 12 stats → tags (kept at 12, not 8, so the 44 hit areas don't overlap), 12 bottom.
  Rejected: full-bleed picture inside the panel (bigger art, but reads as a generic social card).

## 2026-11-25 — Engineering plan (Phase 4)

- **Navigation:** native `pushState`/`replaceState` inside one persistent client shell (route files return
  null). Why: no RSC round-trips, the shell never remounts, history entries carry our depth. Rejected:
  `router.push` per screen (remounts, no custom state); `cacheComponents` Activity (3 routes).
- **State:** plain `useSyncExternalStore` stores. Rejected: Zustand/Jotai (not needed for ~9 small stores).
- **Windowing:** hand-rolled from known post aspect ratios. Rejected for now: `@tanstack/virtual` (plan B if
  device measurement shows jank).
- **Feed images** keep their own aspect ratio; only images taller than 1:2 are capped at 1:2 and shown
  whole on the panel colour. Why: the art is the star; a 1:6 comic strip would otherwise fill five screens.
- **Signed-in data at rest:** per-user caches (subscriptions, marker anchor, first feed page, For You ranked
  ids, artist stats, favorites profile) persist to IDB/localStorage only with Remember on; this-tab-only
  sign-ins keep them in memory; sign-out purges them. They never contain the API key.
- **Service worker:** hand-rolled; never handles cross-origin requests, so it can't store the key or an
  authenticated response. e621 thumbnails are not SW-cached in v1 (opaque responses inflate quota);
  revisit with `crossorigin` previews if `static1.e621.net` sends CORS headers. Rejected: Serwist.
- **Dependencies:** add `sonner` (toasts with Undo, `role="status"`, pause on hover/focus). Nunito through
  `next/font/google` (self-served, build-time download). No Motion, Vaul, Serwist or state library.
- **CSP** limiting `connect-src` to self + e621 (slice 8).

## 2026-11-25 — Feed components v6 (materials, sizes, voice, tab bar, goo)

- Owner on v5.3's feed: "Currently it feels very cheap and like it has not a lot of design care or personality
  in it". v6 (mocks/feed-v6.html, artifact https://claude.ai/artifact/41mUVNmCov6mLaFabE5AY8) was iterated by
  showing switches and locking each pick. Owner: "Yes, write it" (into DESIGN.md).
- **Voice face: Fredoka** (owner pick over the rounded system face), 600 / 500 only. Self-hosted. Replaces
  Nunito in the plan's dependency list.
- **Surfaces: "Flat + top light"** (owner pick over gradients): three materials (raised with a lip, panel,
  sunk wells), no hairline outlines.
- **Sizes:** heights 44 / 36 / 28, gaps 4 / 8 / 12 / 16 / 24, one 8 edge inside a panel, radii 24 with 16
  nested, 16 between posts. Owner approved after a last pass.
- **Post:** post number moves to the header line; heart at the right end of the footer with the score left of
  it; names and tags shown with spaces; video length chip allowed on the picture (with play and mute).
- **Play: bottom left**, soft shadow (owner: "Play to the left", "Play shadow: soft").
- **Tab bar:** one tube bent 10 px with a capsule that slides along the curve (owner: "Love the slight bend").
  It scrolls along its curve to a **secret fifth "Goo" tab** that adds ten to the goo count.
- **Goo:** favouriting drips white goo under the heart and builds it up on the tab bar; thick and slow, runs
  over the tabs with navy show-through, yellows as it grows (owner: "It feels runnier instead of thicker",
  "the more it grows the more off-white with a tinge of yellow"). Wipe clean is in Settings only; a secret
  clean button was proposed and dropped (owner: "we'll leave it in settings").
- **Avatars: "Bends"** for artists (owner pick); the kaleidoscope stays as the app mark.
- **Scroll physics: "Tuck"** (owner pick).
- **Dot burst lives on Follow only**, centred on the artist's mark and subtle (owner: "need to make sure
  burst is properly centered on icon, and make it a little more subtle"). Double tap shows a big heart only.
- Not redrawn in v6: artist page, player, Settings groups, sign-in sheet. DESIGN.md carries them over from
  v5.3 in v6 tokens; check each by eye when built. Open: whether un-favouriting removes goo.
- Updated to match: DESIGN.md, .impeccable/design.json, the surface brief, docs/path-a/DESIGN.md, and the
  Play / avatar / double-tap lines in UX.md.

## 2026-11-25 — The other screens in v6 (mocks/screens-v6.html)

- Owner: "Yes, mock them" (artist page, grid view, Artists, Search, Tune, Settings, a Settings sub-page,
  sign-in sheet, player), then picked each open choice from a switch, and "Yes, write it" (into DESIGN.md).
  Artifact: https://claude.ai/artifact/WpoUngWRfjhDHcdGScuup1.
- **Artist stats: three wells** in one panel (owner pick over one line of text).
- **Grid tiles: score and favs under each tile** (owner pick over no numbers). Nothing sits on the picture
  except a video's play disc; the new dot hangs outside the corner.
- **Settings row icons: in round wells** (owner pick over bare icons). Sunk, not raised: the row is the
  button. Saved searches and "Your favorites" use the same wells.
- Owner asked for the welled items to be centred ("they look like they might be a little off"): stat wells
  got even padding, and a glyph in a round well sits 0.5 px below its box's centre (the rim shading makes
  the hole read lower). Owner: "Slideshow selection is a little cut off": the style row leaves room for the
  selected ring.
- Decided by the designer, shown to the owner in the mock's table, not objected to: no gold "Play all" on
  the artist page (one gold fill per screen; Play is the floating button); fields are sunk capsules (was 12
  radius); a search shown as text separates tags with a middle dot ("wolf · solo") while the field keeps
  e621 syntax; the goo row is a normal list row with a raised "Wipe clean"; the segmented control is a sunk
  track with a sliding capsule.
- Closed-system clean-up: the 32 gap, the 8 thumbnail radius and the 12 field radius are gone.
- Not drawn yet: landing, empty and error states (need the mascot), the player's sheets, filter menus,
  hold-a-tag targets, "Follow from favorites", desktop. Still open: whether un-favouriting removes goo.
- Updated to match: DESIGN.md (the "carried over" section is replaced by real specs), .impeccable/design.json
  (Field, List Row, Segmented Control, Switch, Stat Wells), the surface brief, docs/path-a/DESIGN.md, UX.md
  (artist page note, dot-separated searches).

## 2026-11-25 — Filter menus, player sheets and tag targets in v6 (mocks/screens-v6.html)

- Owner: "Yes, mock them" (the player's quick-settings and post-info sheets, the filter menus), picked
  "Sliding capsule" from a switch, and "Yes, write it" (into DESIGN.md).
  Artifact: https://claude.ai/artifact/WpoUngWRfjhDHcdGScuup1.
- **A one-of menu is a vertical segmented control** (owner pick over rows with a gold check): a sunk track
  of 44 rows; the chosen row rides a Raised Highlight capsule that slides to it. No check mark, no checkbox.
- Owner, on the Date menu: "should we consider aligning the border radius here? Should do another review
  pass?" The track is now 26 (its 22 capsule plus the 4 gap), and the rule is written down: outer radius =
  inner radius + gap. The review pass (two measuring scripts: nested corners, and left and right edges)
  also put every sheet's ✕ well on the 16 inset (it sat 6 outside; this moves the approved sign-in sheet's
  too) and gave the Reset chip's ✕ a normal gap.
- Owner, on the two approved parts the pass had left alone: "Maybe we fix those two things too".
  - **List rows:** whatever ends a row now stops 16 from the panel's edge, like the text's left edge (controls
    sat at 12, so a switch in a group's first row looked tucked into the corner but was not concentric). A
    chevron is pulled 5 and a ⋯ 10 so their ink sits on the same line; a group label's action ends there too.
  - **The artist mark in a post's corner: left as it is.** A 36 circle 8 inside a 24 corner is 0.8 px looser
    on the diagonal than at the sides. Making it exact means a 32 mark, or moving it 2 px off the picture's
    left edge; both cost more than they fix. The owner has been told and can ask for either.
- Decided by the designer, shown to the owner in the mock's table, not objected to: the Media menu is three
  switches (UX.md said checkboxes; v6 has none); sheets in the player are the app's navy Panel sheet, not
  glass; the tag menu in Post info is the hold-a-tag targets, never more than three (UX.md listed up to
  four; Mute stays in Tune); quick-settings rows sit straight on the sheet with no group around them.
- Decided by the designer and NOT yet shown to the owner (written as "spec, not in mock"): in Post info an
  "Artists" tag group appears only when a post has more than one artist tag; an artist tag's first target is
  "Open". Tag targets use the new-posts pill's shadow, so there are now four blurred shadows, not three.
- Not drawn yet: landing, empty and error states (need the mascot), the "From a link" chip, the hold menu on
  a grid tile, "Follow from favorites", desktop. Still open: whether un-favouriting removes goo.
- Updated to match: DESIGN.md (Sheets with a title, Menu, Media menu, Player sheets, Tag targets; `menu`
  radius; list-row padding 8 / 16), .impeccable/design.json (Menu, Tag Targets; List Row), the surface brief,
  docs/path-a/DESIGN.md, UX.md ("as drawn" notes), STATE.md.

## 2026-11-25 — Goo the mascot; landing, empty, error and offline states in v6 (mocks/screens-v6.html)

- Owner: "Yes, draw them" (the signed-out landing, empty and error states, which needed a mascot that did
  not exist). Artifact: https://claude.ai/artifact/WpoUngWRfjhDHcdGScuup1.
- **The mascot is Goo**, a drop of the tab bar's goo with a face. Owner, from three candidates (Goo, a pup,
  a flower): "Goo, but I'd like to take a couple rounds at refining it further". The pup and the flower are
  dropped.
- Round 1 (switches: shape Drop / Wisp / Blob; face Sweet / :3 / Big eyes; finish Flat / Shaded), owner:
  ":3" and "flat", then "I think I desire it to look maybe more
  goo-drop like? And the part that's under it looks more like snow than goo". Goo was rebuilt from plain
  shapes under the app's own blur-and-threshold filter, so body, spill and arm are one liquid; the spill
  became thin, with a lobe and a stray drop.
- Round 2 (switches: shape Dewdrop / Dollop / Pinch; base Splat / Small / None), owner: "Dewdrop, Small".
  Then "Yes, write it".
- Four moods are the whole vocabulary: wave (hello, sign in), snooze (nothing yet, waiting), look (nothing
  found), oops (something failed).
- Decided by the designer, shown to the owner in the mock's table, not objected to:
  - On the landing "Sign in with e621" is the one gold fill; Play hides until the card has scrolled away.
  - Empty states sit on the ground; errors sit in a panel where the first post would be.
  - The offline banner is a sunk capsule, not a button.
  - The end of a feed reuses the caught-up moment with the app's mark; no typed "✿".
  - The landing's one UX.md sentence is split into a headline and a sentence. With filters on, the empty
    state says "No posts match" and counts the filters, in place of "Filters are on".
- Decided by the designer and NOT yet shown to the owner as a decision:
  - Goo has a pale blue underside (#9FB3CC, "Goo Shade") that does not close when pressed.
    DESIGN.md calls it thickness, not a lip, and says so under "The Lip Is a Promise". It is in every
    drawing the owner approved, but the exception was never pointed out.
  - Goo never appears under 72, and only on the landing, needs sign-in, empty states and errors.
  - The sentences for Artists and Favorites signed out, and the action for "No posts match" with no filter
    on ("Edit search"), are proposed in DESIGN.md and marked there as not drawn.
  - While writing this up, the gap between e621's message and "Try again" in the error panel went from 20
    to 16, to sit on the spacing scale. The mock was rebuilt with it.
- Owner, after the write-up: "Tapping the goo should make him spurt between 1-3 drops on the bar". Drawn in the
  mock and written into DESIGN.md: Goo squashes under the finger, springs back, and 1 to 3 drops leave its tip
  for the tab bar. Decided by the designer around that ask, shown in the mock's table, not yet answered:
  - Each drop that lands is one more on the goo count, like a drop from the secret Goo tab (so Settings'
    "N favorites" counts them). They land on the goo already on the bar, or 90% along a clean one.
  - Signed out the bar is clean, so the landing's bar gets goo only from Goo.
  - Goo is pointer-only (not focusable, no label). With reduced motion the drops are added in place.
  - With no tab bar on screen the drops land beside Goo and soak away.
  - In the mock the goo engine is patched at build time (a bar can keep its own count); feed-v6.html is untouched.
- Not drawn: Popular today under For You's signed-out block (UX.md has it); the first run after sign-in
  (the "Finding artists you love" loader and "Follow from favorites"); the "From a link" chip; the hold
  menu on a grid tile; desktop. Still open: whether un-favouriting removes goo.
- Updated to match: DESIGN.md (Goo the mascot; States; Quiet button; the end of a feed; Goo Shade; One Gold
  and Lip rules; motion rows; build ruling 10), .impeccable/design.json (Goo, State, Error Panel, Landing
  Card, Offline Banner), the surface brief, docs/path-a/DESIGN.md, UX.md ("as drawn" notes), STATE.md.
