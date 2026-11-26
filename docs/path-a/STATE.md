# State
Phase: 5 — Build (slices 1, 2a, 2b, 3a, 3b, 4, R1, R2a, R2b, R3, 5, 6, 7, 8, 9a, 9b done; slice 9c next)       Updated: 2026-11-26
Branch: claude/heuristic-mccarthy-c24143     PR: none
## Next step
Direction round (impeccable new-work, Operate mode). concept-seed ran: key 6916281b3fb103850ea7e30b56c74e86,
seed:03339dd96a2c6b22, assigned index 5 = "plush hang tag". Directions to show the owner side by side at
1:1 (375x812, Following first viewport) with contrast numbers: (1) e621 colors refined (navy + #fcb328,
owner-required baseline), (2) plush hang tag (assigned), (3) reference sheet (my pick). Then: owner picks
-> telemetry ping (concept-seed --from <key> --scope direction --mode operate --kind <...>) -> direction
contract in surface brief -> DESIGN.md -> 1:1 key-screen mocks -> 2 review rounds -> owner OK.
Comparison published: https://claude.ai/artifact/1jmXk6LFCtH12zrHZ7pYUG (copy: docs/path-a/mocks/directions.html). Owner picked A (neutral ground around art). v2 published to same URL: 3 screens + closed size system (copy: docs/path-a/mocks/direction-a-v2.html). Telemetry sent (kind canon). v2 rejected ("Instagram clone"); v3 = e621 Hexagon panels, published to same URL (copy: docs/path-a/mocks/direction-a-v3.html). v3 → owner asked for iOS floating bar + AllTrails study (not copy). v4 published (copy: mocks/direction-a-v4.html). Owner said "resume the goal" (studies, not copies) and asked for a Duolingo study (research/duolingo-study.md, duolingo-research.md). Design review round 1 on v4 logged in REVIEWS.md. v5 published (Version 5; copy: mocks/direction-a-v5.html): all round-1 fixes, Duolingo lessons (pressable lip, rounded type, stat trophies, chunky progress, caught-up mark), and 6 screens incl. player, Settings, sign-in. Review round 2 logged; v5.1 published (Version 6; copy: mocks/direction-a-v5-1.html). Owner signed off with two changes, applied in v5.2 (Version 7; copy: mocks/direction-a-v5-2.html). Direction contract: .impeccable/surfaces/src-app-page-tsx.md. DESIGN.md at repo root (+ .impeccable/design.json), with build rulings. v5.3 (Version 8) fixed post panel spacing; approved mock is now mocks/direction-a-v5-3.html. Phase 4: ENGINEERING.md target written, Plan review round 1 (20 findings, all accepted) logged in REVIEWS.md, decisions in DECISIONS.md. Slice 1 built (spike passed; nav + shell + tab bar/rail + focus + edge swipe + transitions + migrate + tokens + Nunito; legacy app as interim Following home); code-review (high, 6 fixed) + fresh reviewer (10 fixed, 2 deferred to slice 2) logged in REVIEWS.md; scope adjustments in DECISIONS.md. Slice 2a built (stores, document scroll + anchors, post card, windowed feed/grid, chips + sheets, Search/Results/Favorites, interim Artist, player as ?play=, links as 3 entries, sonner); code-review (8 fixed) + fresh reviewer (13 fixed, 2 deferred) in REVIEWS.md; decisions in DECISIONS.md. Slice 2b built (rec store, For You with saved ranked list + Update ranking pill + Refresh, Tune, lazy screen chunks); code-review (5 fixed) + fresh reviewer (10 fixed, 2 deferred); budgets measured once (REVIEWS slice 2b: JS 199.7 KB at the limit, scroll long tasks borderline). Slice 3a built (Following: threshold from e621's subscriptions saved search, New, caught-up divider, folded runs, Play count, marking seen with local fallback; legacy home moved to Settings › Account); code-review (6 fixed, 1 not a bug) + fresh reviewer (8 fixed, 3 no change); budgets JS 187.8 KB, 0 long tasks. Slice 3b built (request lane: priority user/page/bg with aging, shared 5 s back-off, abort, 20 s timeout; new-posts pill with count on return; Following instant paint from a saved first page; pull to refresh on Following and For You); code-review (4 fixed) + fresh reviewer (8 fixed, 2 no change); budgets JS 190.4 KB, scroll long tasks borderline (51 ms). Live marker check done (REVIEWS: all pass; visit.json opaqueredirect moves the marker). Gap fixed: with Remember, the confirmed account is kept and a reload paints before /users/me answers. Slice 4 built (follows store: optimistic follow/unfollow with per-tag ops, rollback and Undo, 500 limit, `subs:<user>` with Remember; Follow pills on For You/Results/Favorites cards and the player; Follow button on the interim artist page; Following's New posts pill after a follow); code-review (7 fixed) + fresh reviewer (7 fixed, 1 already fixed, 1 no change); budgets JS 193.2 KB, long tasks borderline (51 ms). Feed v6 design merged (claude/in-progress-feed-ui-62d2b0, 4f6ace6): approved, replaces v5.3; source of truth mocks/feed-v6.html (the classes ending in 6). Slice R split into R1 + R2 after the second design merge (11cfef5). Slice R1 built (v6 tokens and materials, Fredoka, post panel, tube tab bar with goo and the secret tab, Bends marks, Tuck, drip, Follow burst); code-review (7 fixed) + fresh reviewer (8 fixed, 2 no change); budgets JS 199.3 KB (0.7 KB headroom), 0 long tasks. Owner follow-up: goo is now kept like signed-in data and cleared on sign-out. R2 split into R2a + R2b (DECISIONS). Slice R2a built (v6 parts in src/components/v6.tsx + globals.css "v6 parts"; Settings home, Search, Results header, Tune, grid); reviews and budgets in REVIEWS. Slice R2b built (player chrome, Quick settings with per-visit link playback, Quality menu, Post info, Menu, Media switches, titled sheets, ⋯ sheet, tag targets; filter menus a lazy chunk); code-review (4 fixed, 1 skipped) + fresh reviewer (3 fixed, 4 no change); budgets JS 198.6 KB, 0 long tasks. To show the owner: Post info's Artists group, Open as an artist tag's first target, the target shadow. Goo and states design merged (c859e00 as 8571bef). Slice R3 built (Goo component and tap-to-goo; landing card with Play gated; needs sign-in; empty, no-match, error, slow down, offline, load-more-failed and end-of-feed states); code-review (5 fixed) + fresh reviewer (7 fixed, 1 no change); budgets JS 194.5 KB (Results, Favorites and the artist page left the first load), 0 long tasks. Next design to build: first run after sign-in (058771e on claude/in-progress-feed-ui-62d2b0, approved; merge before slice 5). To show the owner from R3: proposed state copy (DECISIONS 2026-11-26), Popular today under For You's signed-out block, Goo's drops counting toward the goo and favorites line, Goo pointer-only, Edit search on No posts match with no filter on, Artists/Favorites signed-out sentences. Slice 5 built (artist score + backtest mode, Artists tab: Following list with dots/filter/sort/⋯, Suggested cards, Follow from favorites as a sheet; first run after sign-in as a lazy chunk; followMany one POST); code-review (5 fixed) + fresh reviewer (8 fixed, 3 no change); budgets JS 197.1 KB, 0 long tasks. Overnight: the owner is away; everything to approve, try, decide or do is in docs/path-a/MORNING.md. Design batches 1–5 (376b2d3…8bc5792, proposed, not owner-approved) merged (be02bf7). Slice 5 aligned with batch 1 (row menus, copy, skipped toast, Popular artists from /tags.json by count; MORNING Approve 6–8). Slice 6 built (artist page: hero, stat wells, wide Follow with the big burst, compact bar, chips in the URL, Share and ⋯, no such artist, non-artist tag, 500 note; its own chunk); code-review (1 fixed, 2 skipped) + fresh reviewer (6 fixed, 3 no change); budgets JS 196.1 KB, 0 long tasks. Slice 7 built (Settings pages Account, Content, Slideshow, For You, App from batch 3; the sign-in sheet over any screen; the old one-page app moved to /settings/classic behind Settings › App › Classic slideshow); code-review (6 fixed) + fresh reviewer (6 fixed, 1 no change); budgets JS 197.2 KB. Slice 8 built (manifest, icons from the app mark via scripts/make-icons.ts, public/sw.js, update toast and Settings › App update row, CSP, install row and sheet; the app mark now follows DESIGN.md); code-review (3 fixed) + fresh reviewer (10 fixed); budgets JS 197.2 KB, 0 long tasks; worker test: `E6_PWA=1 E6_BASE=<prod> pnpm e2e e2e/pwa.spec.ts`. Slice 9a built (toast restyle from batch 1, Popular artists skeleton, dead placeholders gone; Following suggestion card not built, MORNING Decide 3); code-review (3 fixed) + fresh reviewer (8 fixed, 2 no change); budgets JS 198.4 KB (1.6 KB headroom). Slice 9b built (the layout on a computer from batch 5: sidebar in its own chunk, 600 column, full-width grid, dialogs, Settings on one page, Post info side panel, tile menu on right-click / hold, "/" for Search, hover; no goo or secret tab on a computer: not designed); code-review (5 fixed) + fresh reviewer (10 fixed, 1 skipped, 1 no change); budgets JS 198.6 KB, 0 long tasks. NEXT: slice 9c (batch 2 leftovers: the "From a link" chip sheet, the not-signed-in banner on a share link), then Phase 6, Phase 7. Pending: live `tag_subscriptions` POST check with the owner signed in (a write: ask first).
Research done: research/spacing-hierarchy.md, indie-inspiration.md, component-libraries.md
(deps: add sonner; Base UI Drawer or hand-rolled sheet; no Vaul; Motion optional).
PRODUCT.md written (repo root).
## Slice R — v6 restyle (added 2026-11-25, owner via the design session; before slice 5)
Restyles what slices 1–4 built to DESIGN.md v6. Re-scoped 2026-11-25 after the second design merge
(4f9b983, mocks/screens-v6.html): the other screens are now drawn, so "token swaps only" became a real
restyle, split into two slices. Each keeps the slice rules: tests, code-review (high) + fresh reviewer,
docs, budgets, commit.

### R1 — feed chrome (source: mocks/feed-v6.html) — done
- Tokens in globals.css: three materials (raised with a lip, panel, sunk wells), no hairline outlines;
  heights 44/36/28; radii 24 with 16 nested; Fredoka 500/600 via next/font (Nunito dropped).
- Post panel: 8 edge, "New · 2h ago · #id" header line, tags above the footer, score then heart at the
  right end; header with the tools capsule; chips; new-posts pill; Follow pill to v6 ("✓ Following").
- Play at the bottom left, 4 lip, soft shadow, steps aside on scroll down.
- Tab bar: one solid tube bent 10 px, sliding capsule, secret fifth "Goo" tab (drag, wheel or focus);
  goo that builds with favourites (only ever adds); Wipe clean in Settings only.
- Fav pill goo drip; Bends artist marks (kaleidoscope only as the app mark); Tuck; dot burst on Follow only.
- Not done in R1 (see R2 or later): the compact header bar, the Following tab badge, the rating badge
  (no user default rating exists yet to differ from).

### R2 — the other screens (source: mocks/screens-v6.html, DESIGN.md Components)
R2a done: shared parts, Settings home, Search + suggestions + Results header, Tune, grid. R2b done: the
player, its sheets, Menu, Media menu, titled sheets, the ⋯ sheet, tag targets. Artists, the artist hero and
stats, Settings sub-pages and the sign-in sheet move to slices 5–7 (built with the R2a parts).
- Shared parts first: list group / row (≥ 56 tall; sheet rows stay 52) / 32 round sunk icon well; field
  (sunk capsule; no 12 radius); segmented control (sunk track, sliding capsule); switch, stepper, slider,
  toggle. Glyphs in round wells sit 0.5 px below centre.
- Screens: artist page (stats as three wells in one panel; one wide Follow/Following button, no gold
  Play all, Play stays floating), grid view (tiles with score and favs under them, no 8 radius / 32 gap),
  Artists, Search + suggestions + Results header (a search shown as text joins tags with a muted " · ";
  the input keeps e621 syntax), Tune, Settings and Settings › Slideshow (the goo row joins the list
  style), the sign-in sheet, the player.
- Drawn later (eb86dd6, merged 2026-11-25; build from DESIGN.md + the mock's first section, not UX.md
  alone): titled sheets (title left, 36 round close well with its edge on the 16 inset; moves the sign-in
  sheet's close well too), Menu (a 26-radius sunk track with 44 rows and one raised capsule that slides to
  the choice in 360 ms cubic-bezier(.3,1.35,.5,1); no check marks), the Media menu (switches), the player's
  Quick settings and Post info sheets (rows with no side padding of their own), and the tag targets (up to
  three raised 44 targets 8 above a held tag: Search, Pin from For You, Blacklist with the danger ring;
  Mute stays in Tune). List rows are padded 8 / 16 and whatever ends a row stops 16 from the panel's
  edge (a chevron pulled 5, a ⋯ 10). Rule: outer radius = inner radius + gap.
- Spec only, show the owner when built: Post info's "Artists" group (only with more than one artist tag),
  "Open" as an artist tag's first target, the tag targets' blurred shadow.
- States (landing, empty, error, offline, Goo) drawn and built in slice R3.
- Not drawn yet (build from UX.md + DESIGN.md parts, show the owner before they ship): the first run after
  sign-in, "Follow from favorites", the "From a link" chip, the grid tile hold menu (uses the ⋯ sheet),
  desktop.
- Open (owner): whether un-favouriting removes goo (built add-only).

## Checklist
- [x] GOAL.md copied and committed (a08df93)
- [x] Phase 1: ENGINEERING.md current state
- [x] Phase 1: peripheral feature brainstorm
- [x] Phase 1: owner questions answered, scope frozen (DECISIONS 2026-11-25) — GATE MET
- [x] Phase 2: UX.md v3.2, 3 review rounds, owner signed off — GATE MET
- [x] Phase 3: DESIGN.md (root) + mocks v5.2 + 2 review rounds + owner OK — GATE MET
- [x] Phase 4: ENGINEERING.md target + Plan review — GATE MET
- [x] Design update: feed components v6 (mocks/feed-v6.html) → DESIGN.md, sidecar, surface brief (DECISIONS 2026-11-25)
- [x] Design update: the other screens in v6 (mocks/screens-v6.html) → DESIGN.md, sidecar, surface brief (DECISIONS 2026-11-25)
- [x] Design update: filter menus, player sheets, tag targets in v6 (mocks/screens-v6.html) → DESIGN.md, sidecar, surface brief (DECISIONS 2026-11-25)
- [x] Design update: Goo the mascot; landing, empty, error and offline states in v6 (mocks/screens-v6.html) → DESIGN.md, sidecar, surface brief (DECISIONS 2026-11-25)
- [x] Design update: first run after sign-in (the read, Follow from favorites, the skipped state) in v6 (mocks/screens-v6.html) → DESIGN.md, sidecar, surface brief (DECISIONS 2026-11-26)
- [ ] Design, proposed overnight 2026-11-26, waiting for the owner (MORNING-DESIGN.md): batch 1 = toasts, Artists › Suggested, Follow from favorites as a sheet, Artists row menus, Popular artists; batch 2 = "From a link" chip and sheet, the signed-out-here banner, the grid tile hold menu, artist page edges (no such artist, a tag, 500 follows, share and ⋯), Your favorites header; batch 3 = Settings › Account, Content, For You, App, the keyboard shortcuts sheet; batch 4 = install steps, the update toast, the app icon; batch 5 = the layout on a computer (sidebar, column, grid, player with Post info, Settings on one page, popovers and dialogs)
- [ ] Phase 5: slices 1–9 (1, 2a, 2b, 3a, 3b, 4, R1, R2a, R2b, R3, 5, 6, 7, 8, 9a, 9b done; slice 9c next)
- [ ] Phase 6: manual testing pass (phone + desktop)
- [ ] Phase 7: final review, README, push, draft PR, local URL handed over
## Blocked on
nothing
## Research notes (outside repo)
/Users/oreo/Library/Application Support/Claude/side-session-notes/local_5efac6e1-a06e-48e6-abe6-3849cfda0671/path-a-*.md
