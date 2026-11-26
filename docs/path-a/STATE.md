# State
Phase: 5 — Build (slices 1, 2a, 2b, 3a, 3b, 4, R1 done; R2 next)           Updated: 2026-11-25
Branch: claude/heuristic-mccarthy-c24143     PR: none
## Next step
Direction round (impeccable new-work, Operate mode). concept-seed ran: key 6916281b3fb103850ea7e30b56c74e86,
seed:03339dd96a2c6b22, assigned index 5 = "plush hang tag". Directions to show the owner side by side at
1:1 (375x812, Following first viewport) with contrast numbers: (1) e621 colors refined (navy + #fcb328,
owner-required baseline), (2) plush hang tag (assigned), (3) reference sheet (my pick). Then: owner picks
-> telemetry ping (concept-seed --from <key> --scope direction --mode operate --kind <...>) -> direction
contract in surface brief -> DESIGN.md -> 1:1 key-screen mocks -> 2 review rounds -> owner OK.
Comparison published: https://claude.ai/artifact/1jmXk6LFCtH12zrHZ7pYUG (copy: docs/path-a/mocks/directions.html). Owner picked A (neutral ground around art). v2 published to same URL: 3 screens + closed size system (copy: docs/path-a/mocks/direction-a-v2.html). Telemetry sent (kind canon). v2 rejected ("Instagram clone"); v3 = e621 Hexagon panels, published to same URL (copy: docs/path-a/mocks/direction-a-v3.html). v3 → owner asked for iOS floating bar + AllTrails study (not copy). v4 published (copy: mocks/direction-a-v4.html). Owner said "resume the goal" (studies, not copies) and asked for a Duolingo study (research/duolingo-study.md, duolingo-research.md). Design review round 1 on v4 logged in REVIEWS.md. v5 published (Version 5; copy: mocks/direction-a-v5.html): all round-1 fixes, Duolingo lessons (pressable lip, rounded type, stat trophies, chunky progress, caught-up mark), and 6 screens incl. player, Settings, sign-in. Review round 2 logged; v5.1 published (Version 6; copy: mocks/direction-a-v5-1.html). Owner signed off with two changes, applied in v5.2 (Version 7; copy: mocks/direction-a-v5-2.html). Direction contract: .impeccable/surfaces/src-app-page-tsx.md. DESIGN.md at repo root (+ .impeccable/design.json), with build rulings. v5.3 (Version 8) fixed post panel spacing; approved mock is now mocks/direction-a-v5-3.html. Phase 4: ENGINEERING.md target written, Plan review round 1 (20 findings, all accepted) logged in REVIEWS.md, decisions in DECISIONS.md. Slice 1 built (spike passed; nav + shell + tab bar/rail + focus + edge swipe + transitions + migrate + tokens + Nunito; legacy app as interim Following home); code-review (high, 6 fixed) + fresh reviewer (10 fixed, 2 deferred to slice 2) logged in REVIEWS.md; scope adjustments in DECISIONS.md. Slice 2a built (stores, document scroll + anchors, post card, windowed feed/grid, chips + sheets, Search/Results/Favorites, interim Artist, player as ?play=, links as 3 entries, sonner); code-review (8 fixed) + fresh reviewer (13 fixed, 2 deferred) in REVIEWS.md; decisions in DECISIONS.md. Slice 2b built (rec store, For You with saved ranked list + Update ranking pill + Refresh, Tune, lazy screen chunks); code-review (5 fixed) + fresh reviewer (10 fixed, 2 deferred); budgets measured once (REVIEWS slice 2b: JS 199.7 KB at the limit, scroll long tasks borderline). Slice 3a built (Following: threshold from e621's subscriptions saved search, New, caught-up divider, folded runs, Play count, marking seen with local fallback; legacy home moved to Settings › Account); code-review (6 fixed, 1 not a bug) + fresh reviewer (8 fixed, 3 no change); budgets JS 187.8 KB, 0 long tasks. Slice 3b built (request lane: priority user/page/bg with aging, shared 5 s back-off, abort, 20 s timeout; new-posts pill with count on return; Following instant paint from a saved first page; pull to refresh on Following and For You); code-review (4 fixed) + fresh reviewer (8 fixed, 2 no change); budgets JS 190.4 KB, scroll long tasks borderline (51 ms). Live marker check done (REVIEWS: all pass; visit.json opaqueredirect moves the marker). Gap fixed: with Remember, the confirmed account is kept and a reload paints before /users/me answers. Slice 4 built (follows store: optimistic follow/unfollow with per-tag ops, rollback and Undo, 500 limit, `subs:<user>` with Remember; Follow pills on For You/Results/Favorites cards and the player; Follow button on the interim artist page; Following's New posts pill after a follow); code-review (7 fixed) + fresh reviewer (7 fixed, 1 already fixed, 1 no change); budgets JS 193.2 KB, long tasks borderline (51 ms). Feed v6 design merged (claude/in-progress-feed-ui-62d2b0, 4f6ace6): approved, replaces v5.3; source of truth mocks/feed-v6.html (the classes ending in 6). Slice R split into R1 + R2 after the second design merge (11cfef5). Slice R1 built (v6 tokens and materials, Fredoka, post panel, tube tab bar with goo and the secret tab, Bends marks, Tuck, drip, Follow burst); code-review (7 fixed) + fresh reviewer (8 fixed, 2 no change); budgets JS 199.3 KB (0.7 KB headroom), 0 long tasks. Open for the owner: goo as a device count (DECISIONS "Slice R1 build"). NEXT: slice R2 (below), then slice 5. Pending: live `tag_subscriptions` POST check with the owner signed in (a write: ask first).
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

### R2 — the other screens (source: mocks/screens-v6.html, DESIGN.md Components) — next
- Shared parts first: list group / row (≥ 56 tall; sheet rows stay 52) / 32 round sunk icon well; field
  (sunk capsule; no 12 radius); segmented control (sunk track, sliding capsule); switch, stepper, slider,
  toggle. Glyphs in round wells sit 0.5 px below centre.
- Screens: artist page (stats as three wells in one panel; one wide Follow/Following button, no gold
  Play all, Play stays floating), grid view (tiles with score and favs under them, no 8 radius / 32 gap),
  Artists, Search + suggestions + Results header (a search shown as text joins tags with a muted " · ";
  the input keeps e621 syntax), Tune, Settings and Settings › Slideshow (the goo row joins the list
  style), the sign-in sheet, the player.
- Not drawn yet (build from UX.md + DESIGN.md parts, show the owner before they ship): signed-out
  landing, empty and error states (mascot), "Follow from favorites", the Reset and "From a link" chips,
  the grid tile hold menu (uses the ⋯ sheet), desktop.
- **Wait, build last**: the filter menus (Sort, Media, Date, Score), the player sheets (quick settings,
  post info) and the hold-a-tag targets are being mocked in the design session (2026-11-25, not approved
  yet). Don't build them from UX.md; the design session sends a commit once the owner approves.
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
- [ ] Phase 5: slices 1–9 (1, 2a, 2b, 3a, 3b, 4, R1 done; R2 (v6 screens) next)
- [ ] Phase 6: manual testing pass (phone + desktop)
- [ ] Phase 7: final review, README, push, draft PR, local URL handed over
## Blocked on
nothing
## Research notes (outside repo)
/Users/oreo/Library/Application Support/Claude/side-session-notes/local_5efac6e1-a06e-48e6-abe6-3849cfda0671/path-a-*.md
