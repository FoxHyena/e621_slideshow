# State
Phase: 5 — Build (slices 1, 2a, 2b, 3a, 3b done; slice 4 next)           Updated: 2026-11-25
Branch: claude/heuristic-mccarthy-c24143     PR: none
## Next step
Direction round (impeccable new-work, Operate mode). concept-seed ran: key 6916281b3fb103850ea7e30b56c74e86,
seed:03339dd96a2c6b22, assigned index 5 = "plush hang tag". Directions to show the owner side by side at
1:1 (375x812, Following first viewport) with contrast numbers: (1) e621 colors refined (navy + #fcb328,
owner-required baseline), (2) plush hang tag (assigned), (3) reference sheet (my pick). Then: owner picks
-> telemetry ping (concept-seed --from <key> --scope direction --mode operate --kind <...>) -> direction
contract in surface brief -> DESIGN.md -> 1:1 key-screen mocks -> 2 review rounds -> owner OK.
Comparison published: https://claude.ai/artifact/1jmXk6LFCtH12zrHZ7pYUG (copy: docs/path-a/mocks/directions.html). Owner picked A (neutral ground around art). v2 published to same URL: 3 screens + closed size system (copy: docs/path-a/mocks/direction-a-v2.html). Telemetry sent (kind canon). v2 rejected ("Instagram clone"); v3 = e621 Hexagon panels, published to same URL (copy: docs/path-a/mocks/direction-a-v3.html). v3 → owner asked for iOS floating bar + AllTrails study (not copy). v4 published (copy: mocks/direction-a-v4.html). Owner said "resume the goal" (studies, not copies) and asked for a Duolingo study (research/duolingo-study.md, duolingo-research.md). Design review round 1 on v4 logged in REVIEWS.md. v5 published (Version 5; copy: mocks/direction-a-v5.html): all round-1 fixes, Duolingo lessons (pressable lip, rounded type, stat trophies, chunky progress, caught-up mark), and 6 screens incl. player, Settings, sign-in. Review round 2 logged; v5.1 published (Version 6; copy: mocks/direction-a-v5-1.html). Owner signed off with two changes, applied in v5.2 (Version 7; copy: mocks/direction-a-v5-2.html). Direction contract: .impeccable/surfaces/src-app-page-tsx.md. DESIGN.md at repo root (+ .impeccable/design.json), with build rulings. v5.3 (Version 8) fixed post panel spacing; approved mock is now mocks/direction-a-v5-3.html. Phase 4: ENGINEERING.md target written, Plan review round 1 (20 findings, all accepted) logged in REVIEWS.md, decisions in DECISIONS.md. Slice 1 built (spike passed; nav + shell + tab bar/rail + focus + edge swipe + transitions + migrate + tokens + Nunito; legacy app as interim Following home); code-review (high, 6 fixed) + fresh reviewer (10 fixed, 2 deferred to slice 2) logged in REVIEWS.md; scope adjustments in DECISIONS.md. Slice 2a built (stores, document scroll + anchors, post card, windowed feed/grid, chips + sheets, Search/Results/Favorites, interim Artist, player as ?play=, links as 3 entries, sonner); code-review (8 fixed) + fresh reviewer (13 fixed, 2 deferred) in REVIEWS.md; decisions in DECISIONS.md. Slice 2b built (rec store, For You with saved ranked list + Update ranking pill + Refresh, Tune, lazy screen chunks); code-review (5 fixed) + fresh reviewer (10 fixed, 2 deferred); budgets measured once (REVIEWS slice 2b: JS 199.7 KB at the limit, scroll long tasks borderline). Slice 3a built (Following: threshold from e621's subscriptions saved search, New, caught-up divider, folded runs, Play count, marking seen with local fallback; legacy home moved to Settings › Account); code-review (6 fixed, 1 not a bug) + fresh reviewer (8 fixed, 3 no change); budgets JS 187.8 KB, 0 long tasks. Slice 3b built (request lane: priority user/page/bg with aging, shared 5 s back-off, abort, 20 s timeout; new-posts pill with count on return; Following instant paint from a saved first page; pull to refresh on Following and For You); code-review (4 fixed) + fresh reviewer (8 fixed, 2 no change); budgets JS 190.4 KB, scroll long tasks borderline (51 ms). NEXT: slice 4 per ENGINEERING.md slice table. Pending: a live check of the e621 marker with the owner signed in in the browser pane (never type the key).
Research done: research/spacing-hierarchy.md, indie-inspiration.md, component-libraries.md
(deps: add sonner; Base UI Drawer or hand-rolled sheet; no Vaul; Motion optional).
PRODUCT.md written (repo root).
## Checklist
- [x] GOAL.md copied and committed (a08df93)
- [x] Phase 1: ENGINEERING.md current state
- [x] Phase 1: peripheral feature brainstorm
- [x] Phase 1: owner questions answered, scope frozen (DECISIONS 2026-11-25) — GATE MET
- [x] Phase 2: UX.md v3.2, 3 review rounds, owner signed off — GATE MET
- [x] Phase 3: DESIGN.md (root) + mocks v5.2 + 2 review rounds + owner OK — GATE MET
- [x] Phase 4: ENGINEERING.md target + Plan review — GATE MET
- [ ] Phase 5: slices 1–9 (1, 2a, 2b, 3a, 3b done)
- [ ] Phase 6: manual testing pass (phone + desktop)
- [ ] Phase 7: final review, README, push, draft PR, local URL handed over
## Blocked on
nothing
## Research notes (outside repo)
/Users/oreo/Library/Application Support/Claude/side-session-notes/local_5efac6e1-a06e-48e6-abe6-3849cfda0671/path-a-*.md
