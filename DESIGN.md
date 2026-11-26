---
name: e621 Slideshow
description: A calm e621 reading room where the art is the only bright thing.
colors:
  ground: "#020F23"
  panel: "#152F56"
  raised: "#1F3C67"
  raised-hi: "#2A4B7C"
  hairline: "rgba(180,199,217,.14)"
  text: "#FFFFFF"
  link: "#B4C7D9"
  muted: "#A0ADC1"
  gold: "#E8C446"
  on-gold: "#020F23"
  lip-gold: "#A8871F"
  lip-navy: "#0B1F3E"
  glass: "rgba(21,47,86,.88)"
  glass-base: "#0B1F3E"
  glass-over-art: "rgba(2,15,35,.55)"
  player-ground: "#000000"
  tag-artist: "#F2AC08"
  tag-character: "#00C900"
  tag-species: "#F3946B"
  tag-general: "#B4C7D9"
  tag-meta: "#FFFFFF"
  score: "#5EC06A"
  heart: "#FF8A95"
  danger: "#ED9393"
typography:
  large-title:
    fontFamily: "ui-rounded, 'SF Pro Rounded', Nunito, system-ui, sans-serif"
    fontSize: "34px"
    fontWeight: 800
    lineHeight: "41px"
    letterSpacing: "-0.01em"
  section:
    fontFamily: "ui-rounded, 'SF Pro Rounded', Nunito, system-ui, sans-serif"
    fontSize: "20px"
    fontWeight: 800
    lineHeight: "25px"
  headline:
    fontFamily: "ui-rounded, 'SF Pro Rounded', Nunito, system-ui, sans-serif"
    fontSize: "17px"
    fontWeight: 700
    lineHeight: "22px"
  callout:
    fontFamily: "ui-rounded, 'SF Pro Rounded', Nunito, system-ui, sans-serif"
    fontSize: "15px"
    fontWeight: 700
    lineHeight: "20px"
  body:
    fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Text', system-ui, 'Segoe UI', Roboto, sans-serif"
    fontSize: "15px"
    fontWeight: 400
    lineHeight: "20px"
  footnote:
    fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Text', system-ui, 'Segoe UI', Roboto, sans-serif"
    fontSize: "13px"
    fontWeight: 400
    lineHeight: "18px"
  footnote-rounded:
    fontFamily: "ui-rounded, 'SF Pro Rounded', Nunito, system-ui, sans-serif"
    fontSize: "13px"
    fontWeight: 700
    lineHeight: "18px"
    fontFeature: "tnum"
  tab:
    fontFamily: "ui-rounded, 'SF Pro Rounded', Nunito, system-ui, sans-serif"
    fontSize: "11px"
    fontWeight: 700
    lineHeight: "13px"
  handle:
    fontFamily: "ui-monospace, 'SF Mono', Menlo, monospace"
    fontSize: "13px"
    fontWeight: 400
    lineHeight: "18px"
rounded:
  thumb: "8px"
  field: "12px"
  panel: "16px"
  sheet: "24px"
  full: "999px"
spacing:
  s1: "4px"
  s2: "8px"
  s3: "12px"
  s4: "16px"
  s5: "24px"
  s6: "32px"
  inset: "16px"
components:
  button-gold:
    backgroundColor: "{colors.gold}"
    textColor: "{colors.on-gold}"
    typography: "{typography.headline}"
    rounded: "{rounded.full}"
    padding: "0 24px"
    height: "44px"
  button-gold-compact:
    backgroundColor: "{colors.gold}"
    textColor: "{colors.on-gold}"
    typography: "{typography.footnote-rounded}"
    rounded: "{rounded.full}"
    padding: "0 16px"
    height: "32px"
  button-tonal:
    backgroundColor: "{colors.raised}"
    textColor: "{colors.text}"
    typography: "{typography.headline}"
    rounded: "{rounded.full}"
    padding: "0 24px"
    height: "44px"
  toolbar-button:
    backgroundColor: "{colors.panel}"
    textColor: "{colors.link}"
    rounded: "{rounded.full}"
    size: "44px"
  toolbar-button-over-art:
    backgroundColor: "{colors.glass-over-art}"
    textColor: "{colors.text}"
    rounded: "{rounded.full}"
    size: "44px"
  play-fab:
    backgroundColor: "{colors.gold}"
    textColor: "{colors.on-gold}"
    rounded: "{rounded.full}"
    size: "56px"
  play-fab-badge:
    backgroundColor: "{colors.ground}"
    textColor: "{colors.text}"
    typography: "{typography.tab}"
    rounded: "{rounded.full}"
    padding: "0 6px"
    height: "20px"
  player-play:
    backgroundColor: "{colors.gold}"
    textColor: "{colors.on-gold}"
    rounded: "{rounded.full}"
    size: "62px"
  post-panel:
    backgroundColor: "{colors.panel}"
    rounded: "{rounded.panel}"
    padding: "8px 8px 12px"
  post-media:
    rounded: "{rounded.thumb}"
  fav-pill:
    backgroundColor: "{colors.raised}"
    textColor: "{colors.text}"
    typography: "{typography.footnote-rounded}"
    rounded: "{rounded.full}"
    padding: "0 12px 0 8px"
    height: "32px"
  fav-pill-on:
    backgroundColor: "rgba(255,138,149,.16)"
    textColor: "{colors.text}"
  tag:
    backgroundColor: "{colors.raised}"
    textColor: "{colors.tag-general}"
    typography: "{typography.footnote}"
    rounded: "{rounded.full}"
    padding: "0 12px"
    height: "32px"
  tag-more:
    textColor: "{colors.muted}"
    typography: "{typography.footnote-rounded}"
    rounded: "{rounded.full}"
    padding: "0 12px"
    height: "32px"
  filter-chip:
    backgroundColor: "{colors.panel}"
    textColor: "{colors.text}"
    typography: "{typography.footnote-rounded}"
    rounded: "{rounded.full}"
    padding: "0 12px"
    height: "32px"
  filter-chip-selected:
    backgroundColor: "{colors.raised-hi}"
    textColor: "{colors.text}"
  follow-pill:
    backgroundColor: "{colors.raised}"
    textColor: "{colors.text}"
    typography: "{typography.footnote-rounded}"
    rounded: "{rounded.full}"
    padding: "0 12px"
    height: "32px"
  follow-pill-following:
    textColor: "{colors.text}"
  segmented:
    backgroundColor: "{colors.panel}"
    textColor: "{colors.muted}"
    typography: "{typography.footnote-rounded}"
    rounded: "{rounded.full}"
    padding: "2px"
    height: "32px"
  segmented-selected:
    backgroundColor: "{colors.raised-hi}"
    textColor: "{colors.text}"
  tab-bar:
    backgroundColor: "{colors.glass}"
    textColor: "{colors.link}"
    typography: "{typography.tab}"
    rounded: "{rounded.full}"
    padding: "4px"
    height: "62px"
  tab-active:
    backgroundColor: "rgba(255,255,255,.10)"
    textColor: "{colors.gold}"
  tab-badge:
    backgroundColor: "{colors.gold}"
    textColor: "{colors.on-gold}"
    typography: "{typography.tab}"
    rounded: "{rounded.full}"
    padding: "0 5px"
    height: "16px"
  count-pill:
    backgroundColor: "{colors.glass-over-art}"
    textColor: "{colors.text}"
    typography: "{typography.footnote-rounded}"
    rounded: "{rounded.full}"
    padding: "0 12px"
    height: "32px"
  settings-group:
    backgroundColor: "{colors.panel}"
    rounded: "{rounded.panel}"
  settings-row:
    textColor: "{colors.text}"
    padding: "0 12px 0 16px"
    height: "52px"
  settings-tile:
    backgroundColor: "{colors.raised}"
    textColor: "{colors.link}"
    rounded: "{rounded.thumb}"
    size: "32px"
  sheet:
    backgroundColor: "{colors.panel}"
    rounded: "{rounded.sheet}"
    padding: "8px 16px 34px"
  input:
    backgroundColor: "{colors.ground}"
    textColor: "{colors.text}"
    typography: "{typography.body}"
    rounded: "{rounded.field}"
    padding: "0 12px"
    height: "44px"
  switch-on:
    backgroundColor: "{colors.score}"
    rounded: "{rounded.full}"
    width: "51px"
    height: "31px"
---

# Design System: e621 Slideshow

Source of truth: the owner-signed-off mock `docs/path-a/mocks/direction-a-v5-3.html` (its `.phone` custom properties and classes). The app is rebuilt to match it in later phases. Values marked **spec (not in mock)** come from `docs/path-a/UX.md` because a static mock cannot show them. The machine-readable extensions (ramps, shadows, motion, component snippets) are in `.impeccable/design.json`.

## Overview

**Creative North Star: "The e621 Reading Room"**

A calm, dark room built from e621's own Hexagon navies, where the art is the only bright thing. Each post sits in a navy e621 panel, like e621's post boxes: the artist line on top, the picture, then favourite, score and tags underneath. Structure is iOS (large titles, round 44 toolbar buttons, a floating glass capsule tab bar, grouped settings, bottom sheets). The playful touch is small and physical: pressable things have a solid darker edge that sinks when tapped, titles and numbers speak in a rounded face, and a short celebration marks "You're caught up".

Density is phone-first and one-handed: a 16 edge, a closed size system (6 spacing steps, 4 control heights, 4 avatar sizes, 3 icon sizes, 4 radii), and the main action in thumb reach at the bottom right. Dark by default for dark rooms; there is no light theme.

The art is never tinted, framed by gradients or covered. The only things that may sit on top of a picture are the video play glyph and the mute button; the player adds its own controls, which auto-hide.

**Key Characteristics:**
- e621 navies as the neutral; one gold, used sparingly.
- Navy panels around art, never overlays on it.
- Rounded face for voice, system face for reading.
- A 2 to 3 px same-hue lip on pressables, sinking in 100 ms.
- Colour carries meaning: gold = act / new / here, green = score, pink = favourite, e621 tag category colours on tags.
- Kaleidoscope avatars (e621 has no artist pictures) and a kaleidoscope app mark.

## Colors

e621 Hexagon navies as the ground, e621's active gold as the single accent, and e621's own meaning colours, with every small-text colour lifted to at least 4.5:1 on the surface it sits on.

### Primary
- **Hexagon Gold** (#E8C446): e621's active colour. Fill only for the one main action on a screen (Play, Play all, Review, Sign in, the player's Play/Pause). As text or stroke: the "New" label, the new-post dot, the current tab, the Following tab badge, a selected filter chip's ring and icon, and the plus glyph on Follow. 7.9:1 on panel, 6.0:1 on the active tab capsule.
- **Ink on Gold** (#020F23): label and glyph colour on gold. 11.3:1.
- **Gold Lip** (#A8871F): the pressable edge under gold controls.

### Neutral
- **Hexagon Ground** (#020F23): screen background behind everything; also the input field fill and the Play button's count badge.
- **Post Panel Navy** (#152F56): post panels, settings groups, sheets, toolbar circles, filter chips, segmented track.
- **Raised Navy** (#1F3C67): things on a panel: tags, fav pill, Follow, tonal buttons, settings tiles, sign-in step numbers.
- **Raised Highlight** (#2A4B7C): selected states only: selected filter chip, selected segment.
- **Hairline** (rgba(180,199,217,.14)): 1 px inset outlines on panels and chips, row dividers, the compact bar's bottom edge.
- **White** (#FFFFFF): names, titles, body text. 13.4:1 on panel, 11.1:1 on raised.
- **Link Blue** (#B4C7D9): e621's link colour. Toolbar glyphs, tab labels and icons at rest, "See all", links, the artist handle, settings tile icons. 7.7:1 on panel, 7.9:1 on the tab-bar glass.
- **Muted** (#A0ADC1): all secondary text (times, subtitles, post id, row values, field labels, unselected segment). 5.9:1 on panel, 4.9:1 on raised. Do not put muted text on Raised Highlight (3.9:1).
- **Lip Navy** (#0B1F3E): the pressable edge under navy controls; also the glass base.
- **Player Black** (#000000): the player's ground, so the art sits on true black.

### Meaning colours
- **Score Green** (#5EC06A): score arrow and number, "Following" check, switch on, the key-privacy shield. 5.9:1 on panel, 4.9:1 on raised.
- **Favourite Pink** (#FF8A95): the heart icon, the faved pill's tint, the player's active heart. 4.9:1 on raised; the heart icon on the faved pill's pink tint is 3.9:1 (passes the 3:1 non-text rule; the number beside it is white, 8.7:1).
- **Danger Rose** (#ED9393): Sign out and other destructive rows. 5.9:1 on panel.
- **Tag category colours**, e621's, each lifted to pass on Raised Navy: character #00C900 (4.9:1), species #F3946B (4.9:1), general #B4C7D9 (6.4:1), meta #FFFFFF (11.1:1), artist #F2AC08 (5.6:1; reserved for artist-category tags in the Info sheet, unused in the mocked screens). Other e621 categories (copyright, lore, contributor, invalid) are not mocked yet; lift them the same way when they land.

### Glass
- **Chrome glass**: `rgba(21,47,86,.88)` over a solid `#0B1F3E` base, `blur(24px) saturate(1.6)`. Tab bar and the artist page's compact bar. The 88% fill keeps tab labels readable over bright art (composite ≈ #142D53).
- **Over-art glass**: `rgba(2,15,35,.55)`, `blur(16px)`, 1 px `rgba(255,255,255,.16)` inset ring. Player buttons and the player's count pill only, where the controls sit over black and scrims.

### Named Rules
**The One Gold Rule.** Gold fills one thing per screen: its main action. Everywhere else gold is a label, a dot, a ring or a glyph that says "new" or "you are here". A second gold fill on a screen is a bug.

**The Art Is the Light Rule.** Nothing on the interface is brighter or more saturated than the art. Navy is the neutral; meaning colours appear only as small icons, numbers and tag text.

## Typography

**Voice font:** `ui-rounded` (SF Pro Rounded on Apple), with **Nunito** (700, 800) as the off-Apple fallback. In the build, Nunito is self-hosted (for example via `next/font/local` or `next/font/google`, which serves it from our own origin); the mock loads it from Google Fonts, which the app must not.
**Reading font:** the system text face (`-apple-system`, SF Pro Text, Segoe UI, Roboto).
**Mono:** `ui-monospace` (SF Mono, Menlo), for the artist handle only.

**Character:** the rounded face does the friendliness (titles, names, numbers, buttons, chips); the plain system face keeps reading text quiet and native.

### Hierarchy
| Role | Face | Weight · size / line | Used for |
|---|---|---|---|
| Large title | rounded | 800 · 34 / 41, -0.01em | Screen name; artist name on the artist page |
| Section | rounded | 800 · 20 / 25 | Section headers, sheet titles, landing headline |
| Headline | rounded | 700 · 17 / 22 | Artist names, button labels, stat numbers, caught-up line |
| Callout | rounded | 700 · 15 / 20 | Settings row labels, "See all", Sign out, the bold "12 new" in a subtitle |
| Body | system | 400 · 15 / 20 | Subtitles, sign-in steps, inputs, switch rows |
| Footnote | system | 400 · 13 / 18 | Times, post id, row subtitles and values, tags |
| Footnote rounded | rounded | 700 · 13 / 18, tabular | Fav count, score, chips, Follow, segments, field and group labels, count pill |
| Tab | rounded | 700 · 11 / 13 | Tab bar labels and badges only |
| Handle | mono | 400 · 13 / 18 | `inkwell_fox` under the artist name, in Link Blue |

Numbers (fav counts, scores, badges, "12 / 300+") use tabular figures. Names truncate with an ellipsis on one line; nothing wraps in a post's artist line.

### Named Rules
**The Two Voices Rule.** Rounded for what the app says (names, numbers, actions); system for what you read. Nothing in between, and no sizes outside the table.

## Layout

- **Phone frame:** 375 wide reference; one 16 edge (`inset`). Everything starts at 16 and ends at 359.
- **Spacing steps:** 4 · 8 · 12 · 16 · 24 · 32. Internal gaps are smaller than external ones: 4 between text lines, 8 picture inset, 12 picture to stats, 12 stats to tags, 24 between posts and above section headers, 32 below a horizontal card row and after a burst.
- **Controls:** 44 regular · 32 compact (always with a 44 hit area via a `::before` extension) · 52 settings row (72 for the account row) · 56 Play button · 62 tab bar and player Play.
- **Avatars:** 24 name lines and the compact bar · 36 default · 44 account row · 80 artist hero. App mark: 48 caught-up, 88 landing.
- **Icons:** 24 tab bar · 20 in round buttons and settings tiles · 16 next to text (stroke 1.75; 2.2 at 16 and on the active tab). The player's Play/Pause glyph is 28.
- **Bottom stack** (each above the safe-area inset): tab bar at 22 from the bottom → Play button, right edge 16, 12 above the bar → toasts above that. Scroll content gets 156 bottom padding so the last post's fav row clears the stack.
- **Top:** 47 status area, then a 44 toolbar row (round buttons right-aligned, gap 8), then the large title.
- **Horizontal rows** (chips, tags, artist cards) scroll sideways with hidden scrollbars and an edge fade (`mask-image`, 24 at the trailing edge; tags also fade 16 at the leading edge). Artist card rows snap to the 16 edge.
- **Desktop (spec, not in mock):** feed column 600 centred; grid uses full width; Info becomes a right panel in the player (UX.md §8).

## Elevation & Depth

Depth is tonal, not shadowed: ground → panel → raised → raised-hi, each one step lighter navy, outlined with a 1 px inset hairline. Real shadows exist in only three places, each with a job.

### Shadow vocabulary
- **Hairline** (`box-shadow: inset 0 0 0 1px rgba(180,199,217,.14)`): panels, chips, toolbar circles, inputs, segmented track.
- **Lip** (`box-shadow: 0 3px 0 var(--lip-c)`; `0 2px 0` compact): the pressable edge, in a darker shade of the control's own hue (`#A8871F` under gold, `#0B1F3E` under navy). Not a drop shadow: zero blur, same hue, only on things you press.
- **Floating bar** (`inset 0 0 0 1px rgba(255,255,255,.12), inset 0 1px 0 rgba(255,255,255,.10), 0 10px 30px rgba(0,0,0,.45)`): the tab bar only.
- **Sheet top** (`inset 0 1px 0 rgba(255,255,255,.08)`) plus a `rgba(0,0,0,.55)` dim behind it.
- **Selected ring** (`inset 0 0 0 1.5px #E8C446`): selected filter chip.
- **Badge ring** (`0 0 0 2px #E8C446` on the Play count; `0 0 0 2px rgba(2,15,35,.6)` on the new-post dot).

### Named Rules
**The Lip Is a Promise Rule.** A lip means "press me". It goes on gold and tonal buttons, Follow, the fav pill and both Play buttons. Never on panels, tags, chips, toolbar circles, or anything that sits over art.

## Shapes

- Everything you touch is a full capsule (`999px`): buttons, chips, tags, pills, the tab bar, segments, toolbar circles, badges, avatars.
- Containers: 16 for post panels, settings groups, collages and banners; 8 for the picture inside a panel, thumbnails and settings tiles; 12 for input fields; 24 for the top corners of sheets (grabber 36 × 5, 30% white).
- Artist collage: one tall picture left (2fr) and two stacked right (1fr), 4 gap, 168 tall in a row, 200 in a list.

## Components

### Post panel (signature)
The e621 post box, rebuilt. Panel Navy, 16 radius, hairline, padding 0 / 12 / 12 (one 12 inner edge: avatar, picture, fav pill and first tag all start 12 in), 24 below.
1. **Artist line** (44 tall, flush to the panel top and the picture; the 24 avatar centres with 10 above and below; ⋯ hit area runs to the panel edge): 24 kaleidoscope avatar, name (headline, white, ellipsis), footnote muted "**New** · 2h ago" with "New" in gold 600, ⋯ (44 hit, muted) at the end.
2. **Picture** at its own aspect ratio, 8 radius, nothing on top. Video adds a 56 dark play disc (`rgba(0,0,0,.45)`) centred and a 32 mute button (44 hit) 12 from the bottom right.
3. **Stats line** (32 tall, 12 below the picture): fav pill, score (green ↑ + number), `#id` right-aligned in muted footnote.
4. **Tag row** (12 below; bleeds to the panel edges and fades in over 12): one sideways-scrolling row of tags, then a "+N" tag.
States: new (gold "New"), faved (fav pill on), video. Rating is shown only when it differs from the user's default (spec).

### Fav pill
Raised Navy capsule, 32 tall (44 hit), pink 16 heart + rounded tabular count, 2 px navy lip. **On:** pink tint `rgba(255,138,149,.16)`, pink ring `rgba(255,138,149,.45)`, filled heart, and the **pop** (300 ms). Accessible name "Favorite, 1.2k", `aria-pressed`.

### Tag
Raised Navy capsule, 32 tall with 44 hit, footnote text in the tag's e621 category colour. "+N" tag: transparent, hairline, muted rounded. Hold 450 ms for Search / Blacklist targets (spec, not in mock).

### Filter chip
Panel Navy capsule, 32 tall (44 hit), hairline, footnote-rounded white label, 16 muted chevron only when it opens a menu. **Selected:** Raised Highlight fill, 1.5 px gold ring, gold chevron. Toggle chips use `aria-pressed`. No lip.

### Follow pill
Raised Navy capsule, 32 tall, gold 16 plus + "Follow", 2 px navy lip. **Following:** transparent with hairline, green check + "Following". Toggling plays the **wiggle**. On the artist page hero it is a full tonal button instead ("✓ Following").

### Buttons
- **Gold** (main action): gold fill, ink label (headline), 44 tall, 24 side padding, 3 px gold lip; icons filled. Compact (32, footnote-rounded at 15, 16 padding) keeps a 2 px lip, as on the Review banner.
- **Tonal**: Raised Navy, white label, 3 px navy lip; icons in green when they mean "done" (✓ Following). Paired buttons share a row equally (`flex: 1`, 8 gap).
- **Burst row** ("6 more from mossy_otter ▾"): a full-width tonal button, label left, link-blue chevron right.
- **Toolbar circle**: 44 Panel Navy circle, hairline, 20 link-blue glyph, no lip. Over art (player): over-art glass, white glyph.
- Focus: 2 px gold outline, 2 px offset (from the mock's page chrome; apply to every control in the build).

### Play button (floating)
56 gold circle, 24 filled ▶ nudged 3 right, 3 px gold lip, bottom right (16 from the edge, 12 above the tab bar). Count badge: 20 tall capsule top-right (−4, −4), Ground fill, white tab type, 2 px gold ring. Label "Play 12 new posts". Hides while scrolling down (200 ms fade + 24 drop) and returns on scroll up or after 1 s idle.

### Tab bar
Floating chrome-glass capsule, 62 tall, 16 from each side, 22 from the bottom, 4 padding, four equal tabs (Following, For You, Artists, Settings): 24 icon over an 11 label in Link Blue. **Current:** its own capsule (`rgba(255,255,255,.10)`), gold icon (stroke 2.2) and label. Following carries a gold count badge (16 tall) only when you are on another tab.

### Segmented control
32 tall Panel Navy track with hairline and 2 inset, two equal segments in footnote-rounded muted; selected segment is a Raised Highlight capsule with white text. Each segment has a 44 hit area and tab semantics.

### Artist card (with collage)
280 wide in a snapping row (full width in a list, 200 collage). Collage (16 radius), then 12 below: 24 avatar + name + ⋯ (Not interested), a muted footnote subtitle ("You faved 23 of 140 · posted 4d ago"), and a Follow pill 8 below.

### Artist hero and compact bar
**Hero:** toolbar (back, share, ⋯), 80 avatar, large-title name 12 below, mono handle in Link Blue, a three-column stat row 24 below (coloured 16 icon + headline number over a muted footnote label: posts in link blue, you faved in pink, last post in green), then Play all (gold) + Following (tonal), chips, and a 3-column thumbnail grid (8 gap, 8 radius, gold 12 new dot with an assistive "New" label, score and fav under each).
**Compact bar (scrolled):** chrome glass across the top with a hairline bottom edge: back circle (transparent), 24 avatar, headline name, Follow pill.

### Player chrome
True black ground; the picture fills the middle. Top scrim (120, 55% black) and bottom scrim (260, to 70% black). Top: over-art close circle and a count pill "12 / 300+". Above the controls: 24 avatar, name, time. Action rail of four over-art circles (favourite turns pink and filled when on, info, slideshow settings, share). Transport: previous · 62 gold Play/Pause with lip · next, 32 apart. Progress: 4 tall white bar on 18% white, time left on this slide. Controls auto-hide after 2.5 s while playing (spec, not in mock).

### Settings group and row
Group label (footnote-rounded muted, indented to the row text), then a Panel Navy group (16 radius, hairline). Rows 52 tall: 32 Raised Navy tile (8 radius, 20 link-blue icon), callout label over a muted footnote subtitle, optional muted value, muted chevron. Dividers are hairlines starting at 60. Account row is 72 with a 44 avatar. Sign out is its own group, centred, Danger Rose.

### Sheet
Dim `rgba(0,0,0,.55)` behind; Panel Navy sheet, 24 top corners, grabber, section-type title with a close circle. Sign-in content: numbered steps (28 Raised Navy circles), fields, a muted key-privacy note with a green shield, a switch row, and a full-width gold Sign in.

### Inputs and switch
**Input:** 44 tall, Ground fill, hairline, 12 radius, body text; field label in footnote-rounded muted 4 above. Inline action (Paste) is a tonal button beside it. Focus, error and disabled states are not in the mock; build them as a gold 1.5 px ring (focus) and Danger Rose ring plus message (error). **Switch:** iOS size 51 × 31, green when on, white 27 knob.

### Caught-up moment and the kaleidoscope
Centred: 48 kaleidoscope mark, "You're caught up" (headline), "Marked as seen on e621" (muted footnote). Shown once per visit, never over art. **Kaleidoscope avatar:** a repeating conic gradient of four of the artist's colours (22.5° steps) from a per-artist angle, with a 19% centre disc. **App mark:** the same construction in navy, gold and white.

### Motion
| Motion | Duration · curve | What animates | Source |
|---|---|---|---|
| Lip press | 100 ms ease-out | `translateY(lip)` and the lip closing to 0 | mock |
| Favourite pop | 300 ms `cubic-bezier(.2,.9,.3,1.4)` | heart scale .8 → 1.25 → 1 | mock |
| Follow wiggle | 360 ms ease-out | rotate −3° → 2° → 0 | mock |
| Play button hide / return | 200 ms ease-out; returns after 1 s idle | opacity and `translateY(24px)` | mock |
| Tab switch | 120 ms fade; small icon bounce | content opacity | spec (not in mock) |
| Push / Back | 150 ms cross-fade + 8 px rise; gesture back never animates | opacity, translateY | spec (not in mock) |
| Player open / close | 200 ms fade-up from the card / fade out | opacity, translateY | spec (not in mock) |
| Player controls | auto-hide after 2.5 s playing; stay while paused or focused; 250 ms double-tap guard | opacity | spec (not in mock) |
| Sheets | spring up; drag to dismiss with rubber-banding | translateY | spec (not in mock) |
| New-posts pill | slides in under the header; posts insert with a slide-down, keeping the reading position | translateY, opacity | spec (not in mock) |
| Pull to refresh | indicator follows at half the finger; 144 px travel arms; spinner holds at 48 px for at least 400 ms | translateY | spec (not in mock) |
| Heart burst | on double tap (cards, player), 200 ms tap guard | particles, scale | spec (not in mock) |
| Toasts | stay 6 s, pause on hover or focus, `role="status"` | opacity, translateY | spec (not in mock) |

Grammar: 100 to 200 ms, ease-out, compositor-only properties (transform, opacity). The heart pop is the one overshoot.
**Reduced motion:** the mock removes the pop, the wiggle and the lip transition (the press still moves, instantly). Per UX.md §7: fades only, no particles, wiggle, bounce or slides; feeds don't autoplay video; the player defaults to Classic with no transition.

## Build rulings (where the mock disagrees with itself)

The v5.3 mock is the approved composition; these rulings win over it when building.

1. **Caught-up title is white**, not gold. The gold lives in the app mark beside it. Gold stays: main action, "New", current tab.
2. **Lip by height:** 44+ controls get 3 px (Paste included); 32 compact controls get 2 px.
3. **The fav pill is a pressable** and gets the 2 px lip.
4. **The lip is always a darker shade of the current fill:** a faved (pink) pill gets a dark-pink lip, not navy.
5. **One-off sizes become named component constants**, not spacing steps: input radius 12, step circle 28, player play icon 28, app mark 48 (caught-up) / 88 (landing), account row 72. 2 px gaps are allowed only inside the stat clusters.
6. **15 px rounded text is always 15 / 20.**
7. **`--t-artist` (#F2AC08) stays** for artist-category tags in tag lists and the player info sheet; posts don't show the artist tag.
8. **Nunito is self-hosted** (next/font/local or @font-face from /public), never Google Fonts at runtime.
9. **Motion exceptions to "100–200 ms, no bounce":** the heart pop (300 ms), the follow wiggle (360 ms) and the tab icon bounce (≤ 200 ms). These are the only named exceptions. All three are off under reduced motion.

## Do's and Don'ts

### Do:
- **Do** keep every value on the closed size system: spacing 4/8/12/16/24/32, controls 44/32/52/56/62, avatars 24/36/44/80, icons 24/20/16, radii 8/12/16/24/capsule.
- **Do** fill gold once per screen, for the main action; use gold otherwise only for "New", the current tab, a selected chip's ring and the Follow plus.
- **Do** put posts in navy panels with the artist line on top, one 12 inner edge for picture and text, and stats and tags below.
- **Do** give compact controls a 44 hit area and every number tabular figures.
- **Do** lift any new small-text colour to 4.5:1 on the surface it sits on, keeping its e621 hue.
- **Do** self-host Nunito in the build.

### Don't:
- **Don't** put anything on top of the art except the video play glyph and mute (and the player's own auto-hiding controls). No Instagram-style hearts, names or gradients over pictures.
- **Don't** tint or frame art with colour washes; navy panels may surround it, never cover it.
- **Don't** put a lip on panels, tags, chips, toolbar circles or anything over art, and never use blurred drop shadows on controls.
- **Don't** use a second accent colour, or meaning colours as fills.
- **Don't** use muted text on Raised Highlight (3.9:1).
- **Don't** borrow Duolingo's owl, green, streaks, gems or guilt nudges, or AllTrails' green, logo or buttons on photos.

## References (studied, not copied)

| Reference | What we took | Not taken |
|---|---|---|
| e621ng Hexagon theme | Ground, panel, raised, link blue, active gold #E8C446, tag category and score colours (small text lifted to AA); navy post boxes | Verdana; hexagon motif; unlifted low-contrast text colours |
| AllTrails iOS (`docs/path-a/research/alltrails-study.md`) | One 16 edge; tighter internal than external spacing; a few type sizes with big jumps; one muted colour; chevron = opens a menu; floating glass tab bar with a capsule for the current tab; one primary action per screen; round 44 toolbar buttons; plain stat row | Their green, logo, light look; buttons on photos; photo carousels with dots; exact proportions and copy |
| Duolingo (`docs/path-a/research/duolingo-study.md`, `duolingo-research.md`) | Solid same-hue lip on pressables; rounded face for voice; stats as coloured icon + number; saturated colour only for meaning; celebration moments that never sit on content | The owl and characters, their green, Feather / DIN Round, streaks, gems, guilt nudges, white backgrounds, caps-tracked labels |
| iOS (platform) | Large titles, grouped settings, bottom sheets, switch, status-area spacing | |

## Tailwind 4 `@theme` mapping (suggested)

The app's `src/app/globals.css` `@theme` currently holds the old palette (`--color-accent: #fcb328`, `--color-panel: #0f1a2b`, …); replace it with these names when the build starts.

| Token | `@theme` variable | Example utility |
|---|---|---|
| Colours | `--color-ground`, `--color-panel`, `--color-raised`, `--color-raised-hi`, `--color-hairline`, `--color-fg` (white; avoids `text-text`), `--color-link`, `--color-muted`, `--color-gold`, `--color-on-gold`, `--color-lip-gold`, `--color-lip-navy`, `--color-glass`, `--color-glass-base`, `--color-glass-art`, `--color-score`, `--color-heart`, `--color-danger`, `--color-tag-artist`, `--color-tag-character`, `--color-tag-species`, `--color-tag-general`, `--color-tag-meta` | `bg-panel`, `text-muted`, `text-tag-species` |
| Fonts | `--font-rounded`, `--font-sans` (system text stack), `--font-mono` | `font-rounded` |
| Type | `--text-large-title: 34px` with `--text-large-title--line-height: 41px`, `--text-large-title--font-weight: 800`, `--text-large-title--letter-spacing: -0.01em`; likewise `--text-section` (20/25/800), `--text-headline` (17/22/700), `--text-callout` (15/20/700), `--text-body` (15/20), `--text-footnote` (13/18), `--text-tab` (11/13/700) | `text-headline font-rounded` |
| Spacing | keep the default `--spacing: 0.25rem` (4 px), so steps are `1 2 3 4 6 8`; add `--spacing-inset: 16px` | `px-inset`, `gap-2`, `mb-6` |
| Sizes | `--spacing-control: 44px`, `--spacing-control-compact: 32px`, `--spacing-row: 52px`, `--spacing-fab: 56px`, `--spacing-bar: 62px`, `--spacing-avatar-s: 24px`, `--spacing-avatar: 36px`, `--spacing-avatar-row: 44px`, `--spacing-avatar-hero: 80px` | `h-control`, `size-fab` |
| Radius | `--radius-thumb: 8px`, `--radius-field: 12px`, `--radius-panel: 16px`, `--radius-sheet: 24px` (capsules use `rounded-full`) | `rounded-panel` |
| Shadows | `--shadow-lip: 0 3px 0 var(--lip-c, var(--color-lip-navy))`, `--shadow-lip-s: 0 2px 0 var(--lip-c, var(--color-lip-navy))`, `--shadow-bar` (tab bar recipe), `--inset-shadow-hairline: inset 0 0 0 1px var(--color-hairline)` | `shadow-lip`, `inset-shadow-hairline` |
| Blur | `--blur-glass: 24px`, `--blur-glass-art: 16px` | `backdrop-blur-glass backdrop-saturate-160` |
| Motion | `--ease-pop: cubic-bezier(.2,.9,.3,1.4)`, `--animate-pop: pop 300ms var(--ease-pop)`, `--animate-wiggle: wiggle 360ms ease-out` (keyframes inside `@theme`); durations use `duration-100/120/150/200` | `active:translate-y-[3px] transition duration-100 ease-out` |
