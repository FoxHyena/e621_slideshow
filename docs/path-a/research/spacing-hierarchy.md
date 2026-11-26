# Spacing, alignment and hierarchy: principles, audit, tokens

Scope: phone-first e621 client (Following / For You / Artists / Settings). All numbers below are **real pt/px at a 375-wide viewport** unless marked "wf" (wireframe px, scaled 260/375 = 0.693; multiply wf by **1.44** to get real).

## 0. Source confidence (read first)

Several first-party pages (m3.material.io, developer.apple.com HIG) returned only their titles to the fetch tool, so I could not quote them directly. Where I cite Apple/Material numbers they come from well-known long-standing guidance plus the search snippets noted. Items marked **[verify]** should be checked against the live page before they go in a spec. Social-app measurements (Instagram, Threads, Bluesky, Tumblr, Cara) are approximate from memory of those UIs, not from a published spec; treat them as "ballpark" and do not cite them as facts.

---

## 1. Principles (with sources)

### 1.1 Grid and spacing scale
- Use a base unit of 8, with 4 as the half-step for icons, small text and tight gaps. Odd bases (5, 6, 7) multiply variables and cause half-pixel blur when centering. ([Elliot Dahl, Space, grids and layouts](https://www.designsystems.com/space-grids-and-layouts/); [spec.fm 8-pt grid](https://spec.fm/specifics/8-pt-grid))
- Text lives on a 4 pt baseline grid (line-heights are multiples of 4), UI boxes on 8. Material is a 4 dp system, so 4-steps are compatible. ([spec.fm](https://spec.fm/specifics/8-pt-grid))
- Fewer choices is the point: the scale removes "is it 10 or 12?" decisions. Refactoring UI says the same: define the system (spacing, sizes, weights, colors) up front, limit choices, start with too much space and remove it. ([Refactoring UI notes](https://rjseymour66.github.io/webdev/refactoring-ui/), secondary source)
- Nathan Curtis's "Space in Design Systems" (inset / stack / inline / squish vocabulary, one scale reused for all) is the canonical reference; the Medium page returned HTTP 403, so cited from knowledge **[verify]**: <https://medium.com/eightshapes-llc/space-in-design-systems-188bcbae0d62>.
- Element-first vs content-first: buttons, inputs, chips get fixed heights from the scale; list/table content gets fixed padding and lets height follow content. ([Dahl](https://www.designsystems.com/space-grids-and-layouts/))

### 1.2 Keylines and consistent insets
- Every element in a column shares the same left and right edges (one screen margin, and for lists a second "text keyline" after the leading avatar). Material 1 formalised this: 16 dp screen margin, 72 dp text keyline beside a 40 dp avatar. ([Material 1 metrics and keylines](https://m1.material.io/layout/metrics-keylines.html), via search snippet) Apple: use system layout margins, align to shared edges, build on multiples of 8 ([HIG Layout](https://developer.apple.com/design/human-interface-guidelines/layout), paraphrased **[verify]**).
- Rauno / Vercel: "Align every element intentionally to a grid, baseline, edge, or optical center." ([Vercel Web Interface Guidelines](https://vercel.com/design/guidelines))
- Practical corollary: **nesting adds inset.** A card inside a padded screen puts its content at margin + card padding, a different keyline from the title above it. Fix by making content, not containers, align to the keyline (full-bleed media, or negative-margin containers).

### 1.3 Optical alignment
- Geometry is not perception. Round shapes (circles) look smaller and further in than squares of the same box; icons with a lot of empty space inside their frame look inset; text has side bearings and its line box is taller than its cap height. Adjust about 1 px where perception matters more than geometry. ([Vercel guidelines](https://vercel.com/design/guidelines)); best fix is in the asset: ink touches the live-area edge ([Jakub, Optical alignment](https://jakub.kr/components/optical-alignment)); fix the one odd asset, not every button's padding ([Pixso](https://pixso.net/articles/alignment-icon/)).
- Chrome notes you cannot flush-align a capital's top to a container without "magic number" negative margins because of leading. ([Chrome: precise text alignment](https://developer.chrome.com/docs/modern-web-guidance/guides/visual-design/precise-text-alignment.md.txt))
- Match icon stroke weight to adjacent text weight. ([Vercel](https://vercel.com/design/guidelines))

### 1.4 Hit area vs visual size
- Apple: controls at least **44x44 pt** ([Apple design tips](https://developer.apple.com/design/tips)). Material: **48x48 dp** (platform guideline). Vercel guidelines: visual targets under 24 px need a 24 px hit area; on mobile the floor is 44. ([Vercel](https://vercel.com/design/guidelines))
- Keep the hit area big without shoving visuals inward: the standard pattern is full-size hit box plus **negative margin on the edge icon button** so the glyph, not the box, meets the content edge. Radix Themes ghost buttons and Volvo's IconButton `bleed` do exactly this. ([Radix Icon Button](https://radix-ui.com/themes/docs/components/icon-button); [Volvo Cars IconButton](https://designsystem.volvocars.com/web/components/icon-button/))
- No dead zones between adjacent interactive items: use padding, not gaps. ([Rauno, Web Interface Guidelines](https://interfaces.rauno.me/))

### 1.5 List row anatomy
- Material 1/2 (still the clearest numbers): single-line 48, one-line with avatar 56, two-line with avatar 72; avatar 40, 16 from edge, text at 72, trailing icon 16 from right edge. ([Material 1 lists](https://m1.material.io/components/lists.html); [metrics](https://m1.material.io/layout/metrics-keylines.html))
- Separators inset to the text keyline (iOS `separatorInset` left = after the avatar), so they group text, not the avatar. (UIKit practice **[verify]**)
- Row = leading visual, title/subtitle stack, optional trailing accessory; only one trailing accessory type per list, same column. Row tap target is the whole row.

### 1.6 Social feed card anatomy (ballpark, not official)
| App | Header | Avatar | Media |
|---|---|---|---|
| Instagram | ~56 tall, name only, ⋯ trailing | ~32-36 | full-bleed |
| Threads / Bluesky | avatar left column, text right | 36-42 | inset in text column, rounded |
| Tumblr | header in padded card | ~32-40 | full-bleed in card |
| Cara | header over artwork | ~32-40 | inset/rounded |
Pattern: art-first apps either bleed the artwork edge to edge (Instagram, Tumblr) or inset it with a single radius. Header text/avatar always sit on the screen margin (16), not margin plus extra card padding.

### 1.7 Proximity, grouping, internal <= external
- Items near each other read as related; proximity can beat color or shape; whitespace creates groups; check it still holds at every width. ([NN/g, Proximity](https://www.nngroup.com/articles/gestalt-proximity/))
- Rule: space **inside** a group <= space **between** groups, with a visible step (at least 1.5x). Rauno: use larger padding, not gaps, between interactive list items. ([Rauno](https://interfaces.rauno.me/))

### 1.8 Hierarchy and type
- Hierarchy comes from size, weight and color together, not just spacing: to de-emphasize, lighten colour or shrink, do not rely on lighter weight; 400/500 for body, 600/700 for emphasis; two or three sizes per component. ([Refactoring UI summaries](https://rjseymour66.github.io/webdev/refactoring-ui/), secondary; the book is the primary source, <https://www.refactoringui.com>)
- Limit the scale: this prototype uses about a dozen near-identical sizes (see audit). Target 6 text styles.
- Density: dense is fine for lists the user scans (Artists), generous for the primary content (art); change density by tokens (row height), not by ad hoc padding.

### 1.9 Radii
- Concentric rule: **inner radius = outer radius - gap (padding)**, clamped at 0. Child radius never larger than parent. ([Cloud Four, math behind nesting rounded corners](https://cloudfour.com/thinks/the-math-behind-nesting-rounded-corners/); [Vercel](https://vercel.com/design/guidelines); SwiftUI exposes `concentricCornerRadii`, [Apple docs](https://developer.apple.com/documentation/swiftui/geometryproxy/concentriccornerradii))
- Assumes uniform padding; unequal padding makes the inner curve elliptical. Simplest fix: put media flush to the container edge so it shares the container's radius or has none.

---

## 2. Audit of `wireframes.html`

Conversion: real = wf x 1.44. The frame is authored in scaled px, so **every value lands off-grid at real size** (padding 6 -> 8.7, 10 -> 14.4, 12 -> 17.3, gap 5 -> 7.2, font 8.5 -> 12.3). That alone makes a clean 4/8 system impossible to see. Fix: author the frame at real 375 px and scale it down with `zoom` or `transform: scale(.693)`.

### 2.1 Why the card header avatar and ⋯ feel off

Measured from screen edge (real pt):

| Element | Left or right offset | Source |
|---|---|---|
| Screen title "Following" | 17.3 | `.hdr` padding 12 |
| Header icon circles (right) | 17.3 | same |
| Chips, seg control, input | 17.3 | 12 |
| **Card avatar (left)** | **23.1** | `.body` 10 + `.card` 6 = 16 wf |
| **Card ⋯ (right)** | **23.1 + glyph bearing, ink ~24.5** | same 16 wf, plus the ⋯ is a text character with side bearings |
| Card outer edge | 14.4 | `.body` 10 |
| Suggestion content | 26 | 10 + 8 |
| Check rows | 14.4 | `.body` 10, `.check` no inline padding |

Diagnosis:
1. **Double inset breaks the keyline** (1.2). Avatar sits 23 pt in vs the title's 17 pt; the card's own surface edge (14 pt) is a third line. Eye reads 14 / 17 / 23 as three misaligned columns. This is the "too far right".
2. **Uneven padding around the avatar.** Left 23.1, top 8.7 (card pad), bottom 7.2 (`gap:5`), right to the next item 7.2. Left is ~3x top/bottom, so the avatar looks pushed in and floating. The 16 wf (23 pt) avatar is also smaller than the 29 pt header icon circles, which flips the expected weight (avatar should be the larger, more important item).
3. **Trailing ⋯ is a glyph in a text line, not an icon button.** No fixed box, so its ink position depends on font side bearings (about 1.5 pt of ink inset), it lands 23-24 pt from the edge while header icons end at 17 pt, and its vertical middle-dot sits on the x-height, not the avatar's centre line. No 44 pt hit area, so the optical-edge-vs-hit-area rule (1.4) is unmet.
4. **Mixed trailing items.** The unread `.dot` (5 wf) sits between name and ⋯ with its own `gap:5`, so the right side reads as dot + glyph with inconsistent spacing. Name and time are one string ("artist_name · 2h") with no hierarchy (same size, same colour).
5. **Row has no height.** Header row is ~16 wf (23 pt) tall, set only by the avatar; with `align-items:center` and 9 wf text, nothing establishes a 44-56 pt row.
6. **Radius mismatch:** card r=12, padding 6, so concentric inner = 6, but `.art` uses 8 (wf), and the header avatar circle is a third shape.

### 2.2 Why "Artists you might like" tiles look janky

1. **Three nested surfaces** (phone, `.sugg` r12/p8, tile r10/p6, and a button inside): surface-in-surface-in-surface; radius 10 inside r12 with pad 8 is not concentric (should be 4). Tiles are the same dark family as the container so they barely separate (low contrast fill-on-fill).
2. **Tiny avatar in a big tile**: 16 wf = 23 pt in a 92 pt wide tile (25% of the width). Tile is mostly empty; avatar is the least weighty item in the stack.
3. **Text too small and hierarchy is flat**: name 7.5 wf = 10.8 pt (below a ~11-12 pt floor), button 8.5 wf = 12.3 pt; avatar, name, button are the same visual weight. No secondary line (why suggested).
4. **Button does not match the tile**: tile content width 75 pt, button hugs content (~61 pt) and is centred, so it floats with uneven side margins; height ~27 pt, below the 32 pt visual / 44 pt hit rules. Gaps (3 wf = 4.3 pt) are off-scale and the avatar/name/button spacing is cramped (4 pt) while tile padding is 8.7 pt: internal gaps are tighter than tile padding in the wrong places (proximity says name belongs with avatar, button is a separate action, so button needs more separation).
5. **Carousel mechanics:** 3 tiles = 204 wf of 224 available, so the row ends with a dead 29 pt gap instead of either fitting exactly or peeking the next tile; nothing signals horizontal scroll. Row starts at 18 wf (26 pt) instead of the 16 pt margin.
6. **Section header** ("Artists you might like") uses `.who .n`, the same 9 wf/600 style as an artist name in a post, so it does not read as a section title; "See all" is a 9 wf text with no hit area.

### 2.3 Other problems found

Keylines (rule 1.2)
- At least 5 left edges: 14.4 (card, `.check`), 17.3 (hdr, chips, seg, input, `.arow`), 23.1 (card content), 26 (suggestions), 28.8 (`.center` inside body).
- `.body` padding 10 vs `.hdr`/`.chips` 12: two different margins on the same screen. `.arow` happens to land on 12 only by 10 + 2 (accident).
- Right edge: `.ic` circles end at 17.3, card ⋯ at 23, `.seg` margin 12, `.btn.big` margin 0 30 on artist page.

Spacing scale
- Values used (wf): 1, 2, 3, 4, 5, 6, 7, 8, 10, 12, 14, 18, 22, 30. Real: 1.4, 2.9, 4.3, 5.8, 7.2, 8.7, 10, 11.5, 14.4, 17.3, 20, 26. None sit on 4/8 except by accident.
- Mixed gaps: `.card` internal 5, `.body` between cards 8, `.chips` 5, `.hdr` 6, `.tags` 3, `.meta` 8, `.ctl` 14. Internal gap (5) vs external (8) ratio is only 1.6 and the card padding (6) is smaller than the gap between cards (8): groups are barely distinguished, as everything is "about 6".
- `.hdr` bottom 6 and `.chips` bottom 6 vs `.body` top 0: feed starts tight under chips (8.7 pt); second header row "12 new" is a whole extra row for one label.

Hit areas
- Header icon circles 20 wf = 29 pt (< 44); player `.ic` 26 wf = 37 pt; chips ~19 wf tall = 27 pt; tags ~13 wf = 19 pt; buttons 18.75 wf = 27 pt; ♥ / ▲ meta are text glyphs without targets; tab-bar items fine (full cell).
- Wireframe is lo-fi, but sizes teach the build; wrong sizes will be copied.

Hierarchy and type
- Font sizes in use (wf -> real): 7.5->10.8, 8->11.5, 8.5->12.3, 9->13, 9.5->13.7, 10->14.4, 11->15.8, 12->17.3, 13->18.7, 14->20, 17->24.5, 26->37.5. Twelve sizes, many 0.5 wf apart (under 1 pt real difference).
- Weak hierarchy in post header: name and time share size/weight/colour; the card has no clear "artist name" vs "meta" vs "tags" levels (9 / 8.5 / 7.5 wf = 13 / 12.3 / 10.8 pt: nearly the same).
- Screen title 17 wf (24.5 pt, 800) vs content at 13 pt is the one real contrast; section labels (`.lbl` 8 wf = 11.5 pt uppercase) too small.
- Meta line (♥ 1.2k) at 12.3 pt muted is also the primary engagement affordance; should read as buttons.

Radii (wf): 3 (checkbox), 4 (tags, tab icon), 6 (player slide), 8 (art, history chips), 10 (burst, tile, input), 12 (card, sugg), 34 (phone), 99 (pill). Eight values, no nesting rule: `.art` 8 inside card 12/pad 6; tile 10 inside sugg 12/pad 8; burst 10 inside nothing. Tags (r4) vs chips (pill) have unclear shape language.

Rows and bars
- `.arow`: avatar 23 pt in a 50 pt row (avatar should fill the row's leading slot at ~44); separator spans full width starting at the avatar edge, not inset to the text; dot (5 wf) and ⋯ glyph are two trailing accessories with different alignment and no box; row content at 17.3 but separator/inset edges differ.
- `.check` rows: no inline padding (14.4 edge), avatar 23 pt, checkbox 11 wf = 16 pt (tiny), row height ~ 18 wf = 26 pt: below 44.
- Tab bar: 40 wf = 58 pt, no safe-area bottom; icon placeholder 12 wf = 17 pt square r4, labels 10.8 pt. Acceptable as a wireframe but unlike spec below.
- `.status` 22 wf = 32 pt vs real 47-59 pt; Dynamic Island not represented; header positions will drift.
- Header bar: title 24.5 pt with icons 29 pt, gap 8.7, row ~52 pt: OK; second row for "12 new" and chips together = 3 rows before content.
- Chips overflow hidden with no fade or peek (artist page: 4 chips clipped).
- `.pill` Play floats at bottom 50 wf = 72 pt above tabs with `translateX`; fine, but not on any 8 step.
- Contrast: muted text `#8e869d` on `#221d2c`: roughly 5:1 (OK), but small sizes plus muted plus 7.5 wf is the failure, not the colour.

---

## 3. Token proposal (real 375 pt)

### 3.1 Spacing (4/8)
| Token | Value | Use |
|---|---|---|
| `--s-1` | 4 | icon-to-label, tag gaps, tight stack |
| `--s-2` | 8 | chip gaps, avatar-to-name (small), inside-group stack |
| `--s-3` | 12 | avatar-to-text gap, card inner padding, sheet row gaps |
| `--s-4` | 16 | **screen inset**, list leading padding, card padding |
| `--s-5` | 24 | between groups/sections, between posts (visual) |
| `--s-6` | 32 | between major regions, empty-state padding |
| `--s-7` | 48 | large breaks, hero/empty states |
Half-step 2 allowed only for optical nudges (focus ring offset, dot ring). Anything not in the table is a bug.

Rule: **internal <= external x 0.5.** Within a post/row <= 12; between posts/sections >= 24.

### 3.2 Insets and keylines
| Token | Value | Meaning |
|---|---|---|
| `--inset` | 16 (+ `env(safe-area-inset-left/right)`) | left/right margin for every full-width element: titles, chips (first chip), rows, post header, tags, buttons |
| `--keyline-text` | 72 | list text start = inset 16 + avatar 44 + gap 12 |
| `--keyline-feed-text` | 64 | feed header text start = 16 + avatar 36 + gap 12 |
| `--inset-bleed` | 0 | media, tab bar, hairlines; scrollers bleed but use `padding-inline: 16; scroll-padding-inline: 16` |
Rule: no container may add its own horizontal padding on top of `--inset` for content that should sit on the keyline. Cards that need a surface use padding 0 on media and `--inset` for text only.

### 3.3 Component sizes
| Token | Value |
|---|---|
| `--bar-h` (top app bar content row, below safe-area) | 52 |
| `--bar-h-large` (large-title screens) | 56 row, title 28/34 |
| `--tabbar-h` (content) | 56 + `env(safe-area-inset-bottom)` (Apple default is 49 **[verify]**; 56 chosen for the 8 grid and labelled 24 pt icons) |
| `--row-h` (list row min) | 64 (one-line 56) |
| `--row-h-sheet` | 56 |
| `--chip-h` | 32 (chip row container 44) |
| `--tag-h` | 28 |
| `--btn-lg` / `--btn-md` / `--btn-sm` | 48 / 40 / 32 (pill) |
| `--iconbtn-hit` | 44 |
| `--iconbtn-glyph` | 24 (20 in dense bars) |
| `--hit-min` | 44 |

### 3.4 Avatars and icons
| Token | Value | Use |
|---|---|---|
| `--av-24` | 24 | inline mentions |
| `--av-36` | 36 | feed post header |
| `--av-44` | 44 | list rows, checkbox rows |
| `--av-56` | 56 | suggestion tile (if used) |
| `--av-80` | 80 | artist page |
| `--ic-16` / `--ic-20` / `--ic-24` / `--ic-28` | 16 / 20 / 24 / 28 | chevrons in chips / dense bars / default / player |

Icons: 2 pt stroke at 24 (1.5 at 20), ink fills the 20x20 live area inside the 24 box (2 pt padding all round). Stroke weight about equals adjacent text weight.

### 3.5 Radii and nesting
| Token | Value | Use |
|---|---|---|
| `--r-xs` | 4 | checkbox, badges |
| `--r-sm` | 8 | tags, small thumbnails |
| `--r-md` | 12 | cards, inputs, list tiles, burst row |
| `--r-lg` | 24 | bottom sheet top corners |
| `--r-full` | 9999 | chips, buttons, avatars, pills |
Nesting: `inner = max(outer - padding, --r-xs)` via `calc()`. Prefer **flush** children (padding 0 on media) so the child shares or clips to the parent radius and no calc is needed. Child radius never exceeds parent. Max two nested rounded surfaces.

### 3.6 Type scale (Nunito for display, Inter for the rest; 4 pt line-heights)
| Style | Size/line | Weight | Use |
|---|---|---|---|
| `title` | 28/34 | 800 (Nunito) | large screen titles |
| `heading` | 20/26 | 700 (Nunito) | section headers, sheet titles |
| `headline` | 17/22 | 600 | bar title, row headline in sheets |
| `body` | 15/20 | 400 (name: 600) | artist names, row titles, content |
| `caption` | 13/18 | 400 | time, counts, subtitles, tags |
| `label` | 13/16 | 600 | chips, small buttons, "See all" |
| `micro` | 11/14 | 500 | tab labels, badges; **absolute floor 11** |
Hierarchy recipe: primary = `body` 600 in `--fg`; secondary = `caption` 400 in `--muted`; never vary both size and weight by 1 step; 400 and 600 only for text, 800/700 only in Nunito display roles. 7 styles, nothing else.

### 3.7 Hit-area rules
1. Every tappable thing has a 44 x 44 pt hit box (`--hit-min`); visual may be 24-32.
2. Extend hit boxes with padding or `::before { inset: -Npx }`, not by enlarging visuals.
3. Hit boxes may abut but never overlap; between destructive and neutral actions keep >= 8 between visuals.
4. **Edge icon buttons use negative margin so the glyph ink meets the inset line:** `margin-inline-end: calc(-1 * (44 - 24)/2 - 2px)` = -12 (hit 44, glyph box 24, ink inset 2). Same for leading icon buttons on the left (back chevron).
5. Whole list rows are tappable; nested actions (Follow, ⋯) stop propagation and keep own 44 box.
6. Text links ("See all") get padding to 44 high, with negative margin to stay on the keyline.
7. Circles (avatars) align geometrically to the inset; if next to square thumbnails or text, nudge circles 1 pt outward (optical).

---

## 4. Anatomy specs (tokens, real pt)

### 4.1 Feed post header row
```
x:  0 ──16──[avatar 36]──12──[name/time stack ......]──8min──[Follow 32?]──[⋯ 44 hit]
                                                           glyph ink right edge at x = 375-16
```
- Row: `min-height: 56`, `padding: 10 16` (avatar 36 + 2x10 = 56), `align-items: center`, `gap: 12`.
- Avatar `--av-36`, left edge = **16** (same as title and chips). Unread: 10 pt accent dot with 2 pt `--bg` ring on avatar's bottom-right; not in the row.
- Text stack: name `body` 600 (15/20), time `caption` 13/18 muted. Stack height 38, centred on avatar. Name truncates; time never wraps. Stack starts at **64** (`--keyline-feed-text`).
- Trailing: ⋯ icon button, hit 44 x 44, glyph 24; margin-inline-end -12 so dots' ink ends at **375-16**. Hit box ends at 375-4 (inside safe area).
- Follow pill (only where not followed, e.g. For You / search): `--btn-sm` 32 high, `label` 13/16, padding 0 14, hit boxed to 44 high via `::before`; sits 8 pt left of ⋯ glyph box. In the Following feed omit it.
- Row vertical centre line shared by avatar, text stack and ⋯ glyph.

### 4.2 Feed post (card)
Decision: **full-bleed media, no card surface** (art-first, as Instagram/Tumblr do; ballpark sources in 1.6).
- Why: art needs the full 375 width (22% more pixels than an inset 12+12 layout); header/actions/tags all sit on the one 16 keyline; no nested radius (media radius 0); removes the card background layer and double inset that caused the avatar problem; on a dark UI the surface-in-surface look disappears.
- Structure (top to bottom): header 56 → media (full-bleed, `aspect-ratio` from post, `max-height: 75dvh`, `--surface-2` placeholder, radius 0) → action row (44, ♥ and ▲ as icon+count buttons, first glyph at x=16 via -10 negative margin, count `caption`, icon-to-count gap 4, button-to-button hit boxes abut) → tags row (scroll, `padding-inline 16`, tag = `caption`, h 28, padding 6 10, `--r-sm`, gap 8, bottom 12) → post gap.
- Spacing: media→actions 0 (actions row has own 44 height), actions→tags 4, tags→end 12, between posts a 12 `--bg-canvas` band + hairline = 24 visual gap vs max internal 12 (internal <= external x 0.5).
- If a surface is later wanted: card margin 12, radius 12, media flush (padding 0) with `overflow:hidden` so it clips to 12, text parts `padding: 0 16`; do not pad media.

### 4.3 List row (Artists)
- Container: `min-height: 64`, `padding: 10 16`, `gap: 12`, `align-items: center`. Whole row = tap target.
- Leading avatar `--av-44` at x=16 (same inset as titles).
- Text: name `body` 600 (15/20), sub `caption` 13/18 muted ("posted 2h ago · you faved 48"); two lines = 38 inside 44 avatar height. Text starts at **72**.
- Unread: 10 pt accent dot on avatar corner (same as post header), not a trailing item.
- Trailing: ⋯ icon button (hit 44, glyph 24, ink on 375-16), the **only** trailing accessory in this list.
- Separator: 1 px `--line`, from x=72 to the right edge; none after last row.
- Filter field above: `margin: 0 16`, height 44, `--r-md`, 16 gap to first row.

### 4.4 Suggestions: use a compact list, not tiles
Research basis: tiles hide scroll affordance, force sub-12 pt text, and a button inside a tile is cramped (2.2). A short vertical list reuses the Artists row (same keyline, same avatar, same Follow pill, room for the "why" line). Carousels still fine when peeking is right; spec below if you keep tiles.

**Primary: "Artists you might like" block**
- Section header row: `heading` 20/26 at x=16, "See all" `label` accent, trailing, with 44 hit and negative margin to end at 375-16. Header margin-top 24 (`--s-5`), margin-bottom 8.
- 3 rows using 4.3 row spec (min 64), trailing = `--btn-sm` Follow pill (32 h, padding 0 16) instead of ⋯, hit boxed to 44, right edge at 375-16. Sub line = reason ("faved 12 times" or "similar to artist_x").
- No container surface (rows live on canvas); separators inset to 72; block ends with 24 gap.

**Alternate: tile carousel**
- Tile: 132 wide, `padding: 12`, `--r-md` (12), surface one step lighter than canvas with 1 px `--line`, `gap: 8` between avatar-name-reason-button group items except button (gap 12).
- Stack: avatar `--av-56` centered, name `body` 600 centered 1 line truncate, reason `caption` muted 1 line, button full tile inner width (108) x 32, `label`, pill.
- Tile height 12 + 56 + 8 + 20 + 4 + 18 + 12 + 32 + 12 = 174; round to 176.
- Row: bleeds to screen edges, `padding-inline: 16`, `scroll-padding-inline: 16`, `scroll-snap-type: x proximity`, gap 8. Visible: 16 + 132 + 8 + 132 + 8 = 296, so the third tile peeks 79 pt: obvious scroll. No container surface behind the tiles.

### 4.5 Chip row
- Container: height 44, `padding: 6 16`, `gap: 8`, horizontal scroll bleeding to both screen edges, `scroll-padding-inline: 16`, 16 pt trailing fade mask so clipping looks intentional.
- Chip: height 32, padding 0 12, `label` 13/16 600, `--r-full`, 1 px border `--line` (off) or accent fill with `--accent-ink` (on), icon/chevron `--ic-16` with gap 4. Hit 44 via the row's 6 padding.
- Chip row sits 0 under the bar and 8 above the first post (content below bleeds anyway).

### 4.6 Tab bar
- `height: 56 + env(safe-area-inset-bottom)`, hairline top 1 px `--line`, blur bg ~96% opaque.
- 4 equal cells (each ~94 x 56, whole cell = hit area). Content stack: icon 24 (ink 20), gap 2, label `micro` 11/14; top padding 8.
- Active: accent colour, label 600; inactive `--muted`. Icon ink centred; icons on a 4 grid, optical centre adjusted not via padding.
- Floating "Play" pill sits `bottom: calc(56 + safe + 16)`, height 40 (`--btn-md`), `label`, centred.

### 4.7 Header bar
- Top: safe-area-inset-top, then `--bar-h` 52: `padding: 0 16`, `align-items: center`, `gap: 0` (hit boxes abut).
- Title: `headline` 17/22 600 (compact) or `title` 28/34 800 (large, own 56 row below bar). Subtitle ("12 new") goes inline under the large title as `caption`, accent colour, not a separate empty row: left aligned at x=16.
- Trailing icon buttons: hit 44, glyph 24, no fill (or 36 tonal circle at most), negative margin so the last glyph's ink ends on 375-16; spacing between glyphs = 20 (two abutting 44 boxes). Leading back button: same on left (ink on x=16).
- Header + chip row + first post header = 52 + 44 + 56: keep the stack to these three rows.

### 4.8 Bottom sheet
- Container: `border-radius: 24 24 0 0` (`--r-lg`), surface one step above canvas, `padding-bottom: calc(16 + env(safe-area-inset-bottom))`.
- Grabber: 36 x 4, `--r-full`, centered, 8 from top, 8 above title row; hit region 44 high for drag.
- Title row (optional): `padding: 0 16`, min-height 56, `heading` 20/26 or `headline` 17/22, trailing close icon button 44 with ink on 375-16.
- Action rows: min-height 56, `padding: 0 16`, `gap: 16`, leading icon `--ic-24` at x=16, label `body` 15/20 (destructive in danger colour), text starts at 56; no separators (or inset to 56).
- Option groups (Settings-like): rows may use 4.3 pattern with trailing check.
- Primary button at bottom: `--btn-lg` 48 high, full width minus 32, 16 above bottom safe space.
- Scrim: `rgba(0,0,0,.4)`; max height 90dvh; content scrolls under a sticky title row.

---

## 5. Implementation notes
- Author wireframe frames at 375 x 812 px with CSS vars and scale the **frame**: `.phone { width:375px; zoom:.693 }` (or `transform: scale(.693); transform-origin: top left` plus wrapper size). This makes every `px` in the CSS a real pt.
- Tokens (CSS):
```css
:root{
  --s-1:4px; --s-2:8px; --s-3:12px; --s-4:16px; --s-5:24px; --s-6:32px; --s-7:48px;
  --inset:max(16px, env(safe-area-inset-left)); --hit:44px;
  --r-xs:4px; --r-sm:8px; --r-md:12px; --r-lg:24px; --r-full:9999px;
  --av-36:36px; --av-44:44px; --av-56:56px;
}
.iconbtn{ width:var(--hit); height:var(--hit); display:grid; place-items:center }
.iconbtn.edge-end{ margin-inline-end:-12px }   /* hit 44, glyph 24, ink inset 2 */
.iconbtn.edge-start{ margin-inline-start:-12px }
.inner-radius{ border-radius:max(var(--r-xs), calc(var(--outer-r) - var(--pad))) }
```

---

## 6. Per-screen audit checklist
1. **Keylines:** do title, chips, rows, post headers, tags, buttons all start at x=16 and end at 375-16? Any element at a different edge needs a reason.
2. **Optical edges:** does every trailing/leading icon's *ink*, not its hit box, land on the inset? Are glyphs real icon buttons, not text characters?
3. **Scale:** is every padding/gap/margin one of 4, 8, 12, 16, 24, 32, 48? No 5, 6, 10, 14, 18.
4. **Proximity:** inside-group space <= half the between-group space? Does each group read as a unit if you squint?
5. **Hit areas:** every tappable has >= 44 x 44; no overlaps; visuals not inflated to compensate.
6. **Row/bar heights:** header bar 52, chip row 44, list row >= 64, tab bar 56 + safe area, sheet rows 56.
7. **Type:** only the 7 styles; nothing under 11; primary vs secondary differ by colour + size/weight, not weight alone.
8. **Hierarchy:** one clear primary per region (art > artist name > metadata > tags); if two things look equal, change one.
9. **Avatars:** correct size token (36 feed, 44 row, 56 tile, 80 profile); circles optically aligned to neighbours.
10. **Radii:** only 4/8/12/24/full; child radius = outer - padding or flush; no more than two nested rounded surfaces.
11. **Surfaces:** no surface-in-surface-in-surface; borders or one fill step only.
12. **Scrollers:** bleed to screen edges, first item on keyline, trailing item peeks or fades.
13. **Safe areas:** top/bottom/side insets applied; fixed bars add `env(safe-area-inset-*)`.
14. **Worst-case data:** long names, huge counts, empty states, missing avatars: rows keep height and alignment.
15. **Wireframe fidelity:** frame authored at 375 px real size (no scaled px); all numbers copyable into code.

---

## Sources
- Apple HIG Layout: https://developer.apple.com/design/human-interface-guidelines/layout (title only fetched **[verify]**)
- Apple design tips (44 pt): https://developer.apple.com/design/tips
- Apple tab bars: https://developer.apple.com/design/human-interface-guidelines/tab-bars
- SwiftUI concentric radii: https://developer.apple.com/documentation/swiftui/geometryproxy/concentriccornerradii
- Material 1 metrics and keylines: https://m1.material.io/layout/metrics-keylines.html
- Material 1 lists: https://m1.material.io/components/lists.html
- Material 3 (spec pages): https://m3.material.io/components/lists/specs (not fetchable here **[verify]**)
- spec.fm 8-pt grid: https://spec.fm/specifics/8-pt-grid
- Elliot Dahl, Space, grids and layouts: https://www.designsystems.com/space-grids-and-layouts/
- Nathan Curtis, Space in Design Systems: https://medium.com/eightshapes-llc/space-in-design-systems-188bcbae0d62 (403, **[verify]**)
- Rauno Freiberg, Web Interface Guidelines: https://interfaces.rauno.me/
- Vercel Web Interface Guidelines: https://vercel.com/design/guidelines
- Refactoring UI: https://www.refactoringui.com and notes https://rjseymour66.github.io/webdev/refactoring-ui/
- NN/g, Proximity: https://www.nngroup.com/articles/gestalt-proximity/
- Cloud Four, nesting radii: https://cloudfour.com/thinks/the-math-behind-nesting-rounded-corners/
- Radix Icon Button (negative margin): https://radix-ui.com/themes/docs/components/icon-button
- Volvo Cars IconButton (bleed): https://designsystem.volvocars.com/web/components/icon-button/
- Jakub, Optical alignment: https://jakub.kr/components/optical-alignment
- Chrome, precise text alignment: https://developer.chrome.com/docs/modern-web-guidance/guides/visual-design/precise-text-alignment.md.txt
