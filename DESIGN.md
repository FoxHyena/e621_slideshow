---
name: e621 Slideshow
description: A calm e621 reading room where the art is the only bright thing, built from things you want to press.
colors:
  ground: "#020F23"
  well: "#0A1D3B"
  panel: "#152F56"
  bar: "#1A3660"
  raised: "#1F3C67"
  raised-hi: "#2B4D80"
  outline: "rgba(180,199,217,.22)"
  text: "#FFFFFF"
  link: "#B4C7D9"
  muted: "#A0ADC1"
  gold: "#E8C446"
  on-gold: "#020F23"
  lip-gold: "#A8871F"
  lip-navy: "#0A1B38"
  fav-on: "#553659"
  lip-fav: "#291A35"
  glass: "rgba(21,47,86,.88)"
  glass-base: "#0B1F3E"
  glass-over-art: "rgba(2,15,35,.55)"
  player-ground: "#000000"
  tag-artist: "#F2AC08"
  tag-character: "#00C900"
  tag-species: "#F3946B"
  tag-general: "#B4C7D9"
  tag-meta: "#FFFFFF"
  tag-copyright: "#EE7BEE"
  tag-lore: "#5FDB5F"
  score: "#5EC06A"
  heart: "#FF8A95"
  danger: "#ED9393"
  rating-questionable: "#E4D24F"
  goo: "#FFFFFF"
  goo-aged: "#F3E6A8"
  goo-ink: "#35527F"
  goo-ink-active: "#0A1D3B"
typography:
  large-title:
    fontFamily: "Fredoka, ui-rounded, 'SF Pro Rounded', system-ui, sans-serif"
    fontSize: "34px"
    fontWeight: 600
    lineHeight: "41px"
    letterSpacing: "-0.005em"
  section:
    fontFamily: "Fredoka, ui-rounded, 'SF Pro Rounded', system-ui, sans-serif"
    fontSize: "20px"
    fontWeight: 600
    lineHeight: "25px"
    letterSpacing: "-0.005em"
  headline:
    fontFamily: "Fredoka, ui-rounded, 'SF Pro Rounded', system-ui, sans-serif"
    fontSize: "17px"
    fontWeight: 600
    lineHeight: "22px"
  callout:
    fontFamily: "Fredoka, ui-rounded, 'SF Pro Rounded', system-ui, sans-serif"
    fontSize: "15px"
    fontWeight: 600
    lineHeight: "20px"
  label:
    fontFamily: "Fredoka, ui-rounded, 'SF Pro Rounded', system-ui, sans-serif"
    fontSize: "15px"
    fontWeight: 500
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
  tag:
    fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Text', system-ui, 'Segoe UI', Roboto, sans-serif"
    fontSize: "13px"
    fontWeight: 500
    lineHeight: "18px"
  footnote-rounded:
    fontFamily: "Fredoka, ui-rounded, 'SF Pro Rounded', system-ui, sans-serif"
    fontSize: "13px"
    fontWeight: 500
    lineHeight: "18px"
    fontFeature: "tnum"
  tab:
    fontFamily: "Fredoka, ui-rounded, 'SF Pro Rounded', system-ui, sans-serif"
    fontSize: "11px"
    fontWeight: 500
    lineHeight: "13px"
  handle:
    fontFamily: "ui-monospace, 'SF Mono', Menlo, monospace"
    fontSize: "13px"
    fontWeight: 400
    lineHeight: "18px"
  post-id:
    fontFamily: "ui-monospace, 'SF Mono', Menlo, monospace"
    fontSize: "12px"
    fontWeight: 400
    lineHeight: "16px"
  tag-list:
    fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Text', system-ui, 'Segoe UI', Roboto, sans-serif"
    fontSize: "15px"
    fontWeight: 500
    lineHeight: "20px"
rounded:
  badge: "6px"
  art: "16px"
  panel: "24px"
  sheet: "24px"
  full: "999px"
spacing:
  s1: "4px"
  s2: "8px"
  s3: "12px"
  s4: "16px"
  s5: "24px"
  edge: "8px"
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
    typography: "{typography.callout}"
    rounded: "{rounded.full}"
    padding: "0 18px"
    height: "36px"
  button-tonal:
    backgroundColor: "{colors.raised}"
    textColor: "{colors.text}"
    typography: "{typography.headline}"
    rounded: "{rounded.full}"
    padding: "0 24px"
    height: "44px"
  button-tonal-compact:
    backgroundColor: "{colors.raised}"
    textColor: "{colors.text}"
    typography: "{typography.callout}"
    rounded: "{rounded.full}"
    padding: "0 18px"
    height: "36px"
  tools-capsule:
    backgroundColor: "{colors.panel}"
    textColor: "{colors.link}"
    rounded: "{rounded.full}"
    padding: "0 4px"
    height: "44px"
  tools-button:
    textColor: "{colors.link}"
    rounded: "{rounded.full}"
    width: "40px"
    height: "44px"
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
    typography: "{typography.footnote-rounded}"
    rounded: "{rounded.full}"
    padding: "0 6px"
    height: "24px"
  player-play:
    backgroundColor: "{colors.gold}"
    textColor: "{colors.on-gold}"
    rounded: "{rounded.full}"
    size: "62px"
  post-panel:
    backgroundColor: "{colors.panel}"
    rounded: "{rounded.panel}"
    padding: "8px"
  post-media:
    backgroundColor: "{colors.well}"
    rounded: "{rounded.art}"
  video-play-disc:
    backgroundColor: "rgba(2,15,35,.5)"
    textColor: "{colors.text}"
    rounded: "{rounded.full}"
    size: "56px"
  video-length:
    backgroundColor: "{colors.glass-over-art}"
    textColor: "{colors.text}"
    typography: "{typography.footnote-rounded}"
    rounded: "{rounded.full}"
    padding: "0 10px"
    height: "28px"
  video-mute:
    backgroundColor: "{colors.glass-over-art}"
    textColor: "{colors.text}"
    rounded: "{rounded.full}"
    size: "28px"
  also-pill:
    backgroundColor: "{colors.well}"
    textColor: "{colors.link}"
    typography: "{typography.tab}"
    rounded: "{rounded.full}"
    padding: "0 7px"
    height: "20px"
  rating-badge:
    backgroundColor: "{colors.well}"
    textColor: "{colors.rating-questionable}"
    typography: "{typography.tab}"
    rounded: "{rounded.badge}"
    padding: "0 6px"
    height: "20px"
  fav-pill:
    backgroundColor: "{colors.raised}"
    textColor: "{colors.text}"
    typography: "{typography.callout}"
    rounded: "{rounded.full}"
    padding: "0 14px 0 11px"
    height: "36px"
  fav-pill-on:
    backgroundColor: "{colors.fav-on}"
    textColor: "{colors.text}"
  tag:
    backgroundColor: "{colors.well}"
    textColor: "{colors.tag-general}"
    typography: "{typography.tag}"
    rounded: "{rounded.full}"
    padding: "0 10px"
    height: "28px"
  tag-more:
    textColor: "{colors.muted}"
    typography: "{typography.footnote-rounded}"
    rounded: "{rounded.full}"
    padding: "0 10px"
    height: "28px"
  filter-chip:
    backgroundColor: "{colors.panel}"
    textColor: "{colors.text}"
    typography: "{typography.label}"
    rounded: "{rounded.full}"
    padding: "0 14px"
    height: "36px"
  filter-chip-selected:
    backgroundColor: "{colors.raised-hi}"
    textColor: "{colors.text}"
  follow-pill:
    backgroundColor: "{colors.raised}"
    textColor: "{colors.text}"
    typography: "{typography.footnote-rounded}"
    rounded: "{rounded.full}"
    padding: "0 14px 0 10px"
    height: "36px"
  follow-pill-following:
    textColor: "{colors.text}"
    padding: "0 10px 0 8px"
  burst-row:
    backgroundColor: "{colors.raised}"
    textColor: "{colors.text}"
    typography: "{typography.callout}"
    rounded: "{rounded.full}"
    padding: "0 14px 0 10px"
    height: "44px"
  new-posts-pill:
    backgroundColor: "{colors.raised-hi}"
    textColor: "{colors.text}"
    typography: "{typography.callout}"
    rounded: "{rounded.full}"
    padding: "0 16px 0 12px"
    height: "36px"
  artist-card:
    backgroundColor: "{colors.panel}"
    rounded: "{rounded.panel}"
    padding: "8px"
    width: "296px"
  tab-bar:
    backgroundColor: "{colors.bar}"
    textColor: "{colors.link}"
    typography: "{typography.tab}"
    rounded: "{rounded.full}"
    width: "343px"
    height: "64px"
  tab-active:
    backgroundColor: "{colors.raised-hi}"
    textColor: "{colors.gold}"
    rounded: "{rounded.full}"
    height: "54px"
  tab-badge:
    backgroundColor: "{colors.gold}"
    textColor: "{colors.on-gold}"
    typography: "{typography.tab}"
    rounded: "{rounded.full}"
    padding: "0 5px"
    height: "16px"
  sheet:
    backgroundColor: "{colors.panel}"
    rounded: "{rounded.sheet}"
    padding: "8px 16px 28px"
  sheet-rows:
    backgroundColor: "{colors.well}"
    rounded: "{rounded.art}"
  sheet-row:
    textColor: "{colors.text}"
    typography: "{typography.callout}"
    padding: "0 14px"
    height: "52px"
  back-button:
    backgroundColor: "{colors.panel}"
    textColor: "{colors.link}"
    rounded: "{rounded.full}"
    size: "44px"
  stat-panel:
    backgroundColor: "{colors.panel}"
    rounded: "{rounded.panel}"
    padding: "8px"
  stat-well:
    backgroundColor: "{colors.well}"
    textColor: "{colors.text}"
    typography: "{typography.headline}"
    rounded: "{rounded.art}"
    padding: "8px 4px"
  hero-follow:
    backgroundColor: "{colors.raised}"
    textColor: "{colors.text}"
    typography: "{typography.headline}"
    rounded: "{rounded.full}"
    height: "44px"
  grid-tile:
    rounded: "{rounded.art}"
  segmented:
    backgroundColor: "{colors.well}"
    textColor: "{colors.muted}"
    typography: "{typography.footnote-rounded}"
    rounded: "{rounded.full}"
    padding: "3px"
    height: "36px"
  segmented-selected:
    backgroundColor: "{colors.raised-hi}"
    textColor: "{colors.text}"
    rounded: "{rounded.full}"
  field:
    backgroundColor: "{colors.well}"
    textColor: "{colors.text}"
    typography: "{typography.body}"
    rounded: "{rounded.full}"
    padding: "0 16px 0 14px"
    height: "44px"
  list-group:
    backgroundColor: "{colors.panel}"
    rounded: "{rounded.panel}"
  list-row:
    textColor: "{colors.text}"
    typography: "{typography.callout}"
    padding: "8px 12px 8px 16px"
    height: "56px"
  row-icon-well:
    backgroundColor: "{colors.well}"
    textColor: "{colors.link}"
    rounded: "{rounded.full}"
    size: "32px"
  step-number:
    backgroundColor: "{colors.well}"
    textColor: "{colors.link}"
    typography: "{typography.footnote-rounded}"
    rounded: "{rounded.full}"
    size: "28px"
  sheet-close:
    backgroundColor: "{colors.well}"
    textColor: "{colors.link}"
    rounded: "{rounded.full}"
    size: "36px"
  stepper-button:
    backgroundColor: "{colors.raised}"
    textColor: "{colors.text}"
    rounded: "{rounded.full}"
    size: "36px"
  toggle-on:
    backgroundColor: "{colors.raised-hi}"
    textColor: "{colors.text}"
    rounded: "{rounded.full}"
    size: "36px"
  style-preview:
    backgroundColor: "{colors.player-ground}"
    rounded: "{rounded.art}"
    width: "76px"
    height: "100px"
  switch:
    backgroundColor: "{colors.well}"
    rounded: "{rounded.full}"
    width: "51px"
    height: "31px"
  switch-on:
    backgroundColor: "{colors.score}"
    rounded: "{rounded.full}"
    width: "51px"
    height: "31px"
  count-pill:
    backgroundColor: "{colors.glass-over-art}"
    textColor: "{colors.text}"
    typography: "{typography.footnote-rounded}"
    rounded: "{rounded.full}"
    padding: "0 12px"
    height: "28px"
---

# Design System: e621 Slideshow

Source of truth: two owner-approved mocks. `docs/path-a/mocks/feed-v6.html` is the feed (its `.p6` custom properties and the classes ending in `6`; the page also carries a copy of v5.3 for comparison, which is not part of the system). `docs/path-a/mocks/screens-v6.html` is the rest of the app, built from the same parts: artist page, grid view, Artists, Search, Tune, Settings, Settings › Slideshow, the sign-in sheet and the player. v6 redrew the Following feed and the app's shared chrome: header, chips, post panel, artist card, burst row, caught-up, the ⋯ sheet, Play and the tab bar. It also replaced the materials, sizes, voice face and avatars that every screen uses.

Still not drawn in v6: the signed-out landing, empty and error states (they need a mascot that does not exist yet), the sheets inside the player, filter menus, hold-a-tag targets, "Follow from favorites" and desktop. Build those from `docs/path-a/UX.md` out of the parts below and show the owner before they ship. Values marked **spec (not in mock)** come from `docs/path-a/UX.md`. The machine-readable extensions (ramps, shadows, motion, component snippets) are in `.impeccable/design.json`.

## Overview

**Creative North Star: "The e621 Reading Room"**

A calm, dark room built from e621's own Hexagon navies, where the art is the only bright thing. Each post sits in a navy e621 panel, like e621's post boxes: who made it on top, the picture, then tags, score and favourite underneath. Structure is iOS (large title, bottom sheets, a floating tab bar).

The room is made of three materials, all lit from above. Things you press are **raised**: a light on top and a solid darker edge underneath that closes when pressed. Posts sit in **panels**. The picture and the tags are **sunk** into the panel. There are no outlines doing the work of depth.

The personality is physical and a little cheeky, and it stays off the art: a rounded voice face (Fredoka), a tab bar that is one bent tube with a capsule that slides along the bend, artist marks that spin when you follow or favourite, and white goo that drips under the heart and slowly builds up on the tab bar as you favourite.

Density is phone-first and one-handed: a 16 edge, a closed size system (three control heights, five gaps, two nested radii), and the main action in thumb reach at the bottom left. Dark by default; there is no light theme.

The art is never tinted, framed by gradients or covered. The only things that may sit on a picture are the video play glyph, the video length and the mute button; the player adds its own controls, which auto-hide.

**Key Characteristics:**
- e621 navies as the neutral; one gold, used sparingly.
- Three materials (raised, panel, sunk), flat fills with a 1 px top light. No gradients, no hairline outlines.
- Fredoka for voice, the system face for reading.
- A solid same-hue lip on pressables, closing in 100 ms.
- Colour carries meaning: gold = act / new / here, green = score, pink = favourite, e621 tag category colours on tags.
- "Bends" marks for artists (e621 has no artist pictures); the kaleidoscope is the app mark.
- Goo: white, slow, earned by favouriting, wiped from Settings.

## Colors

e621 Hexagon navies as the ground, e621's active gold as the single accent, and e621's own meaning colours, with every small-text colour at 4.5:1 or better on the surface it sits on.

### Primary
- **Hexagon Gold** (#E8C446): e621's active colour. Fill only for the one main action on a screen (Play, Play all, Review, Sign in, the player's Play/Pause). As text or stroke: the "New" label, the new-post dot, the current tab, the Following tab badge, the count in the compact bar, the arrow on the new-posts pill, a selected filter chip's ring and chevron, and the plus on Follow. 7.9:1 on panel, 7.1:1 on the tab bar, 5.0:1 on the current-tab capsule.
- **Ink on Gold** (#020F23): label and glyph colour on gold. 11.3:1.
- **Gold Lip** (#A8871F): the pressable edge under gold controls.

### Neutral (dark to light)
- **Hexagon Ground** (#020F23): screen background; also the Play count badge.
- **Well** (#0A1D3B): sunk things. Tags, the "+N more artists" pill, the rating badge, the row group inside a sheet, skeleton shapes, the letterbox around a capped picture, input fields.
- **Post Panel Navy** (#152F56): post panels, artist cards, sheets, the tools capsule, filter chips, settings groups.
- **Bar Navy** (#1A3660): the tab bar tube only. One step lighter than a panel so it reads over posts.
- **Raised Navy** (#1F3C67): things you press: fav pill, Follow, tonal buttons, the burst row, the disc behind an artist mark.
- **Raised Highlight** (#2B4D80): selected and "you are here": selected filter chip, the current-tab capsule, the new-posts pill.
- **Outline** (rgba(180,199,217,.22)): a 1.5 px inset ring for quiet, un-raised states only: "Following" and the "+N" tag. Never used to draw a panel.
- **White** (#FFFFFF): names, titles, counts, body text. 13.4:1 on panel, 11.0:1 on raised, 10.2:1 on the favourited pill.
- **Link Blue** (#B4C7D9): e621's link colour. Tool glyphs, tab labels and icons at rest, "See all", sheet row icons, general tags. 7.7:1 on panel, 7.0:1 on the tab bar, 9.7:1 on well.
- **Muted** (#A0ADC1): all secondary text (times, post numbers, subtitles, row values). 5.9:1 on panel, 7.4:1 on well, 4.9:1 on raised. Do not put muted text on Raised Highlight (3.7:1).
- **Lip Navy** (#0A1B38): the pressable edge under navy controls.
- **Player Black** (#000000): the player's ground, and the ground of a slideshow style preview.

### Meaning colours
- **Score Green** (#5EC06A): score arrow, the "Following" check, the Safe rating letter, switch on. 5.9:1 on panel.
- **Favourite Pink** (#FF8A95): the heart, and the big heart on a double tap. 4.9:1 on raised.
- **Favourited Plum** (#553659, lip #291A35): the fav pill's fill when on. A solid colour, not a tint, so the white count stays at 10.2:1; the filled pink heart on it is 4.5:1.
- **Danger Rose** (#ED9393): destructive rows (Blacklist this artist, Sign out). 7.3:1 on well, 5.8:1 on panel.
- **Rating Yellow** (#E4D24F): the "Q" on the rating badge. 10.9:1 on well. Shown only when a post's rating differs from the user's default.
- **Tag category colours**, e621's, as tag text on Well: character #00C900 (7.5:1), species #F3946B (7.4:1), general #B4C7D9 (9.7:1), meta #FFFFFF (16.8:1), copyright #EE7BEE (7.0:1), lore #5FDB5F (9.4:1), artist #F2AC08 (8.5:1; artist-category tags in tag lists only, posts don't show the artist tag). Contributor and invalid are not mocked; lift them the same way when they land.

### Goo
- **Goo White** (#FFFFFF) ageing to **Goo Cream** (#F3E6A8): fresh goo is white; the more there is, the more it yellows (tint = 1 − e^(−n/70), n = favourites since the last wipe).
- **Goo Ink** (#35527F, #0A1D3B for the current tab): the colour a tab's icon and label take where goo covers them. 7.9:1 on fresh goo, 6.3:1 on fully aged goo, so labels stay readable under any amount.

### Glass
- **Chrome glass**: `rgba(21,47,86,.88)` over a solid `#0B1F3E` base, `blur(24px) saturate(1.6)`, with a `0 1px 0 rgba(180,199,217,.12)` bottom edge. The compact header bar only. The tab bar is solid, not glass.
- **Over-art glass**: `rgba(2,15,35,.55)` (`.5` for the play disc), `blur(12px)`, 1 px `rgba(255,255,255,.16)` inset ring. The video play disc, length and mute; the player's buttons and count pill, the play disc on a grid tile.
- **Ground fade**: a 150 tall `transparent → rgba(2,15,35,.86) at 62% → ground` scrim behind the bottom stack, so Play and the tab bar never sit on a hard edge.

### Named Rules
**The One Gold Rule.** Gold fills one thing per screen: its main action. Everywhere else gold is a label, a dot, a ring or a glyph that says "new" or "you are here". A second gold fill on a screen is a bug.

**The Art Is the Light Rule.** Nothing on the interface is more saturated than the art. Navy is the neutral; meaning colours appear only as small icons, numbers and tag text. Goo is white like text, and it never touches a picture.

## Typography

**Voice font:** **Fredoka** (variable, 500 and 600 only), falling back to `ui-rounded` / SF Pro Rounded. Fredoka runs heavy: 600 is the top weight (titles, names, counts), 500 for small labels. Never 700. Self-hosted in the build (`next/font`), never fetched from Google Fonts at runtime; the mock does fetch it, the app must not.
**Reading font:** the system text face (`-apple-system`, SF Pro Text, Segoe UI, Roboto).
**Mono:** `ui-monospace` (SF Mono, Menlo): the post number in the ⋯ sheet, the artist handle on the artist page and the API key in its field.

**Character:** Fredoka does the friendliness (titles, names, numbers, buttons, chips, tabs); the plain system face keeps reading text and tags quiet and native.

### Hierarchy
| Role | Face | Weight · size / line | Used for |
|---|---|---|---|
| Large title | Fredoka | 600 · 34 / 41, −0.005em | Screen name; artist name on the artist page |
| Section | Fredoka | 600 · 20 / 25, −0.005em | Section headers ("Artists you might like"), sheet titles |
| Headline | Fredoka | 600 · 17 / 22 (17 / 20 in a post header or an artist row) | Artist names, caught-up line, compact bar title, 44 button labels, the number in a stat well, the account name |
| Callout | Fredoka | 600 · 15 / 20 | Fav count, score, burst row, new-posts pill, "See all", sheet rows, list row titles, stepper value, the bold "12 new" |
| Label | Fredoka | 500 · 15 / 20 | Filter chips, the 44 segmented control |
| Body | system | 400 · 15 / 20 | Subtitles ("from 5 artists"), inputs, steps |
| Footnote | system | 400 · 13 / 18 (13 / 16 in a post header) | Time and post number under a name, row subtitles and values, stat labels, caught-up subtitle |
| Tag | system | 500 · 13 / 18 | Tag text |
| Footnote rounded | Fredoka | 500 · 13 / 18, tabular | "New", Follow, "+N" tag, video length, Play count, compact bar count, group and field labels, the 36 segmented control, grid tile numbers, step numbers, the player's count and time |
| Tab | Fredoka | 500 · 11 / 13 | Tab labels and badges, the "+N" artists pill, the rating letter |
| Post id | mono | 400 · 12 / 16 | `#4512345` in the ⋯ sheet |
| Handle | mono | 400 · 13 / 18 | `inkwell_fox` under the name on the artist page; the API key in its field |
| Tag (list) | system | 500 · 15 / 20 | A tag's name as a row title, in its category colour: Tune's tag list, search suggestions |

Numbers (fav counts, scores, badges, post numbers, lengths) use tabular figures. Names and tags are shown with spaces, not underscores ("inkwell fox", "red fox"); the raw e621 name appears only as the handle. A name truncates with an ellipsis on one line; nothing wraps in a post header.

### Named Rules
**The Two Voices Rule.** Fredoka for what the app says (names, numbers, actions); system for what you read. Nothing in between, and no sizes outside the table.

## Layout

- **Phone frame:** 375 wide reference; one 16 screen edge (`inset`). Panels start at 16 and end at 359.
- **Inside a panel:** one 8 edge (`edge`) between everything: panel to header, header to picture, picture to tags, tags to footer, footer to panel.
- **Gaps:** 4 · 8 · 12 · 16 · 24. 4 between an icon and its label; 8 between tags and between chips; 12 between items in a row (avatar and name, score and heart, artist cards); 16 between posts; 24 under a section.
- **Control heights:** **44** regular (tools capsule, burst row, large buttons) · **36** compact pressable (fav pill, Follow, chips, small buttons, ⋯) · **28** sunk or on the picture (tags, video length, mute). 36 and 28 controls extend their touch area to 44 with an invisible `::before`. Rows in a sheet are 52. Rows in a list group are at least 56 (60 for an artist row, 72 for the account row, 48 for a search suggestion).
- **Badges:** 16 (tab badge) · 20 ("+N" artists, rating) · 24 (Play count).
- **Avatars:** 24 burst row, the artist page's compact bar, an artist among search suggestions · 28 the pile in the header · 36 post header, artist card, artist row, sheet, player · 56 app mark at caught-up and in the Settings footer, the account row · 80 artist hero.
- **Icons:** 24 tab bar (stroke 2, 2.4 on the current tab) · 20 tools and sheet rows (2.2 / 2) · 18 heart, score, burst chevron · 16 next to 13 px text (Follow, chip chevron, mute). The ⋯ glyph is 22. Play glyphs are 26, filled.
- **Top:** 47 status area, then a 52 title row (large title left, tools capsule right), a 28 line under it (avatar pile, "**12 new** from 5 artists"), then the chip row (12 above, 16 below). After 64 px of scroll the compact bar fades in (150 ms): status area plus a 48 row with the title, the count in gold and the tool buttons.
- **Pushed screens** (artist, Search, Results, Tune, a Settings sub-page): the 52 row holds a 44 back button at the left and the tools capsule, if any, at the right. Tune and Settings sub-pages put the large title on its own line under that row; Search and Results put a field in the row instead.
- **Bottom stack** (each above the safe-area inset): tab bar 22 from the bottom, 16 from each side → Play, **left** edge 16, 100 from the bottom (the bar passes 14 under its disc) → toasts above that. Scroll content gets 176 bottom padding so the last post's heart clears the stack. Search (keyboard up), sheets and the player have no tab bar and no Play.
- **Horizontal rows** (chips, tags, artist cards) scroll sideways with hidden scrollbars. A tag row fades at an edge only while tags are hidden past that edge (28 fade, driven by the scroll position), and never scrolls vertically. Artist card rows snap to the 16 edge.
- **Tall pictures:** anything taller than 1:2 is capped at 1:2 and shown whole, centred on Well.
- **Desktop (spec, not in mock):** feed column 600 centred; grid uses full width; Info becomes a right panel in the player (UX.md §8).

## Elevation & Depth

Depth is three materials lit from one direction (above). Fills are flat; the only shading is a 1 px light on top of things and a 1 px dark rim on top of holes.

### The three materials
- **Raised (you press it).** Top light `inset 0 1px 0 rgba(255,255,255,.09)` plus a solid lip underneath in a darker shade of the control's own fill: `0 3px 0 #0A1B38` under navy, `#A8871F` under gold, `#291A35` under the favourited pill. Pressing moves the control down by the lip and closes the lip to 0 in 100 ms. Gold uses a stronger top light (`rgba(255,255,255,.5)`), the favourited pill a pink one (`rgba(255,190,200,.22)`).
- **Panel (it holds things).** Top light as above plus a bottom shade `inset 0 -1px 0 rgba(0,0,0,.25)`. No lip, no outline.
- **Sunk (it sits in the panel).** Tags: `inset 0 1px 0 rgba(0,0,0,.35), 0 1px 0 rgba(255,255,255,.05)` (dark rim above, lit below). Pictures: `0 0 0 1px rgba(2,15,35,.6), 0 1.5px 0 rgba(255,255,255,.06)`. Everything else sunk uses the tag's rim: fields, the segmented track, the switch track, stat wells, and the round wells that hold a row's icon, a step number or a sheet's close ✕. **A glyph in a round well sits 0.5 px below the centre of its box**: the dark rim on top and the lit edge underneath make the hole read lower than the box.
- **Knobs** (the two things that slide inside a well): the switch knob has `0 2px 0 rgba(2,15,35,.4)` under it, the slider thumb `0 3px 0 rgba(2,15,35,.55)`. The segmented control's capsule is Raised Highlight with the top light and `0 1px 0 rgba(2,15,35,.5)`.

### Lip sizes
3 by default; **4** on Play and the player's Play / Pause; **2** on Follow pills and the stepper's − and +.

### Real shadows (three, each with a job)
- **Play:** `0 14px 28px rgba(0,0,0,.45)` under the lip (`0 8px 18px` when pressed). It floats over the feed.
- **New-posts pill:** `0 12px 24px rgba(0,0,0,.4)` under its lip. It floats over the feed.
- **Tab bar:** a copy of the tube's outline, 10 px lower, blurred 14 px at 50% black. Its light is a 1 px `rgba(255,255,255,.16)` stroke along the top outer edge and a `rgba(255,255,255,.06)` ring around the whole tube.

### Rings
- **Selected ring** (`inset 0 0 0 1.5px #E8C446`): selected filter chip, a focused field, a pinned tag's toggle. The selected slideshow style wears it outside the preview: 2 px of Ground, then 1.5 gold.
- **Danger ring** (the same ring in Danger Rose): a muted tag's toggle; a field with an error.
- **Quiet outline** (`inset 0 0 0 1.5px rgba(180,199,217,.22)`): Following (pill and the artist page's wide button), "+N" tag.
- **Badge rings**: Play count `0 0 0 2px #E8C446`; new-post dot `0 0 0 2.5px` panel colour; tab badge `0 0 0 2px` bar colour; avatars in the header pile `0 0 0 2.5px` ground.
- **Sheet:** top light only, over a `rgba(2,15,35,.6)` dim.

### Named Rules
**The Lip Is a Promise Rule.** A lip means "press me, and something happens". It goes on Play, the fav pill, Follow, the burst row, the new-posts pill, gold or tonal buttons, the stepper's buttons and the player's Play / Pause. Never on panels, rows, fields, tags, chips, toggles, the segmented control, the tools capsule, back buttons, tabs, or anything over art. Chips answer a press by shrinking to 96%; tags by darkening.

**The One Light Rule.** Light comes from above on every surface: raised things are lit on top, sunk things are dark on top. Never a gradient fill, never a glow, never an outline around a panel.

## Shapes

- Everything you touch is a full capsule (`999px`): buttons, chips, tags, pills, tabs, badges, avatars. The rating badge is the one exception (6 radius, so it reads as a label, not a button).
- Containers nest: **24** for post panels, artist cards, list groups, the stat panel and the top corners of sheets; **16** for whatever sits 8 inside them (the picture, a collage, the row group in a sheet). 24 − 8 = 16, so the corners stay concentric.
- Fields are capsules too. Grid tiles, slideshow style previews and stat wells are 16. Sheet grabber 36 × 5, 30% white.
- Artist collage: one tall picture left (2fr) and two stacked right (1fr), 3 gap, 164 tall, with a 1 px dark rim.
- The tab bar is a 64 thick tube whose centre line is an arc: 343 wide, the middle 10 higher than the ends (radius ≈ 978).

## Components

### Post panel (signature)
The e621 post box, rebuilt. Panel material, 24 radius, 8 padding, 16 from the screen edge and 16 below.
1. **Header** (36 tall, 8 above the picture; items 12 apart): 36 artist mark (a button: "More from inkwell fox"; a 10 gold dot at its top right when the post is new), then the name (headline 17 / 20, white, ellipsis) over a muted footnote line "**New** · 2h ago · #4512345" ("New" in gold footnote-rounded), then ⋯ (36, muted, pulled 6 into the edge so its dots sit 2 short of the picture's edge).
2. **Picture** at its own aspect ratio, 16 radius, sunk, nothing on top. **Video** adds a centred 56 glass play disc, the length ("0:14", 28 tall) 8 from the bottom left and a 28 mute button 8 from the bottom right.
3. **Tag row** (8 above and below): one sideways row of 28 tags, 8 apart, then an outlined "+N" tag.
4. **Footer** (right-aligned, items 12 apart): rating badge (only when it differs from the user's default), score (green ↑ and the number), then the fav pill at the right end, under the thumb.

States (all in the mock): new; favourited; video; For You, not followed (Follow sits before ⋯; a "+1" well pill after the name when the post has more artists); rating differs; unknown artist (muted "unknown artist", mark hashed from the post number, not a button); can't be shown (the picture becomes a 4:3 well with a lock, "Sign in to see this post" and a compact Sign in button); loading (skeleton: well shapes with a 1.4 s shimmer); very tall picture (capped at 1:2).

### Fav pill and the heart's goo
Raised capsule, 36 tall, 18 pink heart and the count (callout), 3 lip. **On:** Favourited Plum fill with its own lip and pink top light, filled heart. Accessible name "Favorite, 1.2k", `aria-pressed`.
Favouriting plays three things at once: the heart **pops** (320 ms), white goo **drips** from the pill's bottom edge (a bead along the edge and three blobs on necks; the middle one lets go; 720 ms), and the artist's mark spins once. 380 ms in, the drop that let go falls to the tab bar and joins the goo there.
**Double tap** a picture favourites it (never un-favourites) and shows one 88 pink heart over the picture for 640 ms. No dots.

### Tag
Sunk capsule, 28 tall (44 touch area), system 13 at 500 in the tag's e621 category colour, shown with spaces. Press darkens the well (#071631). "+N": transparent with the quiet outline, muted footnote-rounded. Hold 450 ms for Search / Blacklist (spec, not in mock).

### Filter chip
Panel capsule with top light, 36 tall (44 touch area), label (Fredoka 500 · 15), 14 side padding, a 16 muted chevron only when it opens a menu. **Selected:** Raised Highlight fill, 1.5 gold ring, gold chevron. Press shrinks it to 96%. Toggle chips use `aria-pressed`. No lip.

### Follow pill
Raised capsule, 36 tall, gold 16 plus and "Follow" (footnote-rounded), 2 lip. **Following:** transparent with the quiet outline, green check and "Following"; it does not travel when pressed. Toggling plays the **wiggle** (360 ms). Following an artist also makes their mark throw **one ring of six 5 px dots** in its own colours, centred on the mark, starting at its rim and travelling 30 px (480 ms), and spin once. This is the only dot burst in the app.

### Artist marks ("Bends") and the app mark
e621 has no artist pictures, so each artist gets a mark hashed from their name: two round-capped arcs (at 70% and 41% of the disc's radius, stroke 21% of it) around a centre dot. The three colours, the arcs' start angles and lengths, and the dot's size all come from the hash. Colours are picked from eight: #B4C7D9, #E9F2FA, #5B9BE0, #F3946B, #FF8A95, #EE7BEE, #5EC06A, #78DCA5. Never gold. The mark sits on a raised disc (Raised Navy, top light, 1 px dark ring) and spins one turn (600 ms, overshooting) when you favourite one of their posts or follow them.
The **app mark** is the kaleidoscope (the generator in `src/lib/avatar.ts`, fixed at 8-fold, mirrored, in gold, two pale yellows and two link blues). It is the only kaleidoscope left in the app.

### Buttons
- **Gold** (main action): gold fill with the strong top light, ink label, gold lip. 44 tall (headline, 24 padding) or 36 compact (callout, 18 padding).
- **Tonal**: Raised Navy, white label, navy lip. Same two sizes. Paired buttons share a row equally.
- **Burst row** ("6 more from mossy otter ⌄"): full-width tonal capsule, 44 tall, 24 mark, callout label, link-blue chevron at the right end. A run of 5 or more posts from one artist folds after three.
- **Tools capsule**: one 44 tall Panel capsule with top light holding the screen's tools (Search, Grid view, More) as 40 wide buttons with link-blue glyphs. No lip. In the compact bar the same buttons sit without the capsule.
- **New-posts pill**: 36 tall, Raised Highlight, gold ↑ and "6 new posts" (callout), lip plus its floating shadow. Slides in under the header; posts go in only when you tap it.
- **Over art** (player): 44 over-art glass circles, white glyphs; they shrink to 94% when pressed.
- **Back**: 44 Panel circle with top light, 22 link-blue ‹. No lip; shrinks to 94%. In a compact bar it loses the circle.
- Focus: 2 px gold outline, 2 px offset, on every control.

### Play button (floating)
56 gold circle, 26 filled ▶, **4** lip, the strong top light, and the soft shadow. **Bottom left**: 16 from the left edge, 100 from the bottom. Count badge: 24 tall capsule at the top right (−6, −6), Ground fill, white footnote-rounded, 2 px gold ring. Label "Play 12 new posts" ("Play from here" without a count). Hides while scrolling down (200 ms fade and a 24 drop) and returns on scroll up or after 1 s idle.

### Tab bar
One solid Bar Navy tube, 64 thick, 343 wide, bent so its middle is 10 higher than its ends, 22 from the bottom of the screen. Four tabs (Following, For You, Artists, Settings), each a 54 tall capsule-shaped target about 83 long, laid along the bend and turned to stay tangent to it: 24 icon over an 11 label in Link Blue.
- **Current:** a Raised Highlight capsule with top light behind the tab; gold icon (stroke 2.4) and label. On a tab change the capsule **slides along the curve** to the new tab (500 ms, overshooting) and the new icon **hops** (420 ms).
- **Badge:** Following carries a gold count badge (16 tall) only while you are on another tab; it scales away when you arrive.
- **It scrolls along its own curve.** The tabs ride a rail that turns about the bend's centre. Dragging the bar left (or a sideways wheel, or keyboard focus) reveals a **secret fifth tab**, "Goo" (drops icon, white), one tab-length past Settings. A drag needs 6 px to start, rubber-bands past either end, and settles with a spring; it opens if the finger's projected stop is past half a tab. The rail is clipped to the tube, 5 px in, so tabs slide out of sight at the ends.
- **The Goo tab** adds ten to the goo count without favouriting anything: its icon squeezes three times and ten drops arc out of it onto the bar in three spurts.

### Tab bar goo
Every favourite adds goo to the tab bar. It is the same liquid as the drip under the heart: white shapes under a blur-and-threshold filter, so the bead, necks and drops read as one body.
- **Where:** it lands at 90% along the bar's top edge (above Settings) and spreads from there.
- **How it grows** (n = favourites since the last wipe): the bead along the top edge thickens, 6 + 4(1 − e^(−n/30)) px; it reaches 8 + 7·n^0.75 px along the edge; drips 10 to 17 wide creep down 0.35 to 1.1 px per favourite and run over the tabs. It is thick and slow, never runny.
- **Colour:** white, yellowing toward Goo Cream as it grows.
- **Over tabs:** wherever goo covers an icon or label, a Goo Ink copy shows through, so every tab stays readable.
- **Wipe clean** lives in Settings only: a list row "Tab bar goo" (drops icon in a round well, the count "23 favorites" underneath) with a compact tonal "Wipe clean" button at its right end. A blade sweeps the bar (900 ms), flings the goo off the right end, and the bar gleams (520 ms). The count restarts at zero.
- The count is kept on the device. The mock only ever adds; whether un-favouriting removes goo is not decided.

### Section header and artist card
**Section header:** section type on the left, "See all ›" (callout, Link Blue, 44 tall) on the right; 12 below.
**Artist card** (For You's "Artists you might like"): Panel, 24 radius, 8 padding, 296 wide in a snapping row (12 apart, 24 below). Collage (16 radius), then 8 below a post-style header: 36 mark, name, a muted footnote line ("You faved 23 of 140"), and Follow at the right.

### Caught-up moment
Centred, shown once per visit, never over art: the 56 app mark between two 2 px rules that fade toward the screen edges, then "You're all caught up" (headline, white) and "Marked as seen on e621" (muted footnote). The mark turns one notch as it scrolls into view.

### Sheet (⋯ menu)
Dim `rgba(2,15,35,.6)` behind. Panel sheet, 24 top corners, top light, padding 8 / 16 / 28, grabber. A context line (36 mark, name, mono post number), then one Well group (16 radius) of 52 rows: 20 link-blue icon, callout label, optional muted value at the right ("e621.net"), dividers `rgba(180,199,217,.1)` starting at 46. Rows: Play from this post, Share post, Open on e621, Blacklist this artist (Danger Rose). Spring up; drag to dismiss (spec).

### Scroll physics: Tuck
Cards respond to the two edges they pass. Coming in above the tab bar, a card's top grows from 95% to full size and rises its last 16 px. Leaving under the header, its end shrinks to 95% and dims to 55%. Card positions are measured once, not per frame; only transform and opacity change.

### Lists: group, row, icon well
The pattern for anything that is a list of things to open or set (Settings, the artist list, saved searches, Tune's tags).
- **Group:** one Panel, 24 radius, 16 from the screen edge, 16 below. A **group label** above it when it needs one (footnote-rounded, muted, 16 in from the panel's edge, 8 above the panel), with an optional link-blue action at its right ("Clear").
- **Row:** at least 56 tall, padding 8 / 12 / 8 / 16, items 12 apart: an optional lead (icon well, artist mark), the title (callout) over an optional muted footnote line, then an optional muted value, then one of: a 16 muted chevron (it opens something), a control (switch, stepper, small segmented control, compact tonal button) or ⋯. A row that opens something is a button and lightens by 4% when pressed. Rows are divided by a 1 px `rgba(180,199,217,.1)` line that starts where the text starts (60 with an icon well, 64 with a mark, 16 with neither).
- **Icon well:** 32 round well, 20 link-blue icon (pink for favorites). It is sunk, not raised, because it is not a button: the row is.
- **Artist row:** 60 tall, 36 mark (gold dot when they have new posts), name (headline 17 / 20) over "posted 2h ago · you faved 48", then ⋯.
- **Account row:** 72 tall, 56 mark, name in headline, "Signed in to e621 · 42 follows", chevron. Sign out is its own group in Danger Rose (spec, not in mock).

### Field
A well you type in: 44 tall capsule, Well fill with the tag's rim, 14 left and 16 right padding, system body. Placeholder and a leading 18 icon are muted; the value is white. **Focus:** the 1.5 gold ring and a 2 × 20 gold caret. **Error:** the ring in Danger Rose plus a message (spec, not in mock). A clear ✕ is a 24 Raised circle at the right end. A button that belongs to the field (Paste) sits inside it at the right: compact tonal, 32 tall. A **field label** (footnote-rounded, muted) sits 4 above, 14 in. A field used as a button (the search shown in the Results header, "Filter your artists") looks the same and opens the real one.

### Segmented control
A sunk capsule track (36 tall, 3 padding) with equal segments in muted footnote-rounded. The selected segment is white on a Raised Highlight capsule that **slides** to it (360 ms, overshooting), the same idea as the tab bar's capsule. No lip. The top-level one ("Following 42 · Suggested" on Artists) is 44 tall with Label type, and may carry a muted count after the word.

### Switch, stepper, slider, toggle
- **Switch:** 51 × 31 well, 27 link-blue knob. On: Score Green track, white knob, 20 to the right (300 ms, overshooting). `role="switch"`.
- **Stepper:** two 36 Raised circles (−, +) with a 2 lip around a callout value at least 44 wide ("6 s").
- **Slider:** 12 tall well track filled in Link Blue up to a 28 white thumb; 44 tall touch area. Its ends are named in muted footnote underneath ("Close to my favorites" … "Surprise me"), and the current step is named at the top right of its card ("Balanced").
- **Toggle** (Tune's Pin and Mute): 36 circle, muted 18 icon, no fill. On: Raised Highlight with the gold ring and a white icon; Mute on uses the Danger ring and icon instead, and its row's text dims to 50%.

### Artist page
1. **Title row:** back at the left; tools capsule at the right (Share, Grid view, More).
2. **Hero**, centred: 80 mark, the name in large title (12 below the mark; it may wrap to two balanced lines), the raw e621 name as the mono handle in Link Blue.
3. **Stats** (16 below): one Panel (24 radius, 8 padding) holding three equal wells (16 radius, 8 apart, 8 / 4 padding). Each well: a 16 white icon and the number in headline, over a muted footnote label. "1.2k posts", "48 you faved", "2h last post". A stat with nothing to show ("you faved" at 0 or signed out) is left out, and the others share the width.
4. **Follow** (16 below): one full-width 44 button. Not followed: Raised Navy with the 3 lip, 18 gold plus, "Follow". Following: the quiet outline, green check, "Following"; it does not travel. Toggling wiggles it; following also spins the big mark and throws its ring of dots, scaled up (six 7 px dots, 520 ms).
5. **Chips**, then the artist's posts as a feed or a grid.
- **There is no "Play all" button here.** Play is the floating gold button, in the same place as on every feed, so the screen still has one gold fill.
- **Compact bar** (once the hero has scrolled away, about 196 px): bare back, 24 mark, name (headline, ellipsis), Follow pill.

### Grid view
Three columns, 8 between columns and 12 between rows, 16 from the screen edge. A tile is a button: the picture cropped square, 16 radius, with the picture's sunk rim, straight on the ground (no panel). Under it, 4 below: the score at the left (14 green ↑ and the number) and the favourites at the right (14 pink heart, filled if you favourited it, and the count), both footnote-rounded. A video tile carries a 28 glass play disc in its centre. A new post carries the 10 gold dot outside its top right corner, ringed in Ground, so nothing sits on the picture. The caught-up moment spans the full width as its own row. A tile shrinks to 97% when pressed.

### Artists
Large title "Artists" with a one-button tools capsule (Search). Then the 44 segmented control ("Following 42 · Suggested"), 8 above and 12 below. Then a row: the "Filter your artists" field and a sort chip ("Recent ⌄"), 8 apart, 16 below. Then one group of artist rows, and a centred muted footnote "42 of 500 follows". **Suggested** is a list of the feed's artist cards at full width, one per artist.

### Search
- **Top row:** back, then the field, focused, placeholder "Search tags". The keyboard is up, so there is no tab bar and no Play.
- **Recent:** a group label with "Clear", then a sideways row of chips, one per search.
- **Saved:** a group of rows: a star in an icon well, the name, the search and its filters underneath ("fox · cozy · Videos · Top"), ⋯.
- **Your favorites:** its own one-row group, pink heart in the well, "1,284 posts", chevron. Under it, 32 from the screen edge: "Search cheatsheet ↗", a 44 tall link (callout, Link Blue).
- **How a search is written:** anywhere a search is shown as text (chips, saved rows, the Results header), its tags are separated by a muted middle dot ("wolf · solo"), because tags are shown with spaces. The field you type in keeps e621's own syntax (`red_fox solo`).
- **While typing:** the field shows a clear ✕, and a flat group of 48 rows lists suggestions: the tag in Tag (list) type and its category colour, its post count as the muted value. An artist suggestion is a 24 mark and the name in callout, with "artist" as the value.
- **Results header:** back, the search as a field-shaped button (callout, dot-separated) that opens Search to edit it, and a tools capsule (Save ★, Grid view, More). The chip row starts with a "✕ Reset" chip whenever a filter is on.

### Tune
Back, large title "Tune", a muted body line ("For You learns from your favorites."). Then: a one-row group with the sync state ("1,284 favorites read" over "Synced 3 min ago") and a compact tonal "Rebuild" with a refresh icon; a Panel card with the Breadth slider; the "Filter tags" field; and "Your tags", a group label with "Pin · Mute" at its right, over a flat group of rows: the tag in Tag (list) type and its category colour, "48 favorites" underneath, then the Pin and Mute toggles.

### Settings
- **Root:** large title; the account row in its own group; one group of rows with icon wells (Content, Slideshow, For You, App), each with a muted line saying what is inside and, where one value sums it up, that value ("6 s"); the "Tab bar goo" row in its own group; then the 56 app mark, "e621 Slideshow" (headline) and the version (muted footnote), centred. Tapping the mark turns it one notch.
- **A sub-page** (drawn: Slideshow): back, large title, then groups with group labels ("Videos", "Playback"). Rows are flat (no icon well) and end in a control or a value with a chevron ("Transition  Fade ›").
- **Slideshow styles:** a sideways row of previews, 8 apart: 76 × 100, 16 radius, Player Black, each a tiny picture of what the style does (Classic, Ken Burns, Collage, Prints, Reflections), its name underneath in footnote-rounded, muted. The selected one wears the gold ring outside the preview and a white name. The row leaves 4 above itself so the ring is never clipped.

### Sign-in sheet
The Panel sheet over the dim, with the grabber. Title "Sign in with e621" (section) and a 36 round well with ✕ at the right. Three steps, 8 apart: the number in a 28 round well (footnote-rounded, Link Blue), then the step in body; a step that opens e621 is a link (callout, Link Blue, with the ↗ icon). Then Username and API key fields with their labels; the key is shown as dots in mono, with Paste inside the field. A muted footnote with a 16 green shield: "Your key stays on this device and is only ever sent to e621." A row "Remember on this device" (callout) with a switch. A full-width 44 gold "Sign in". Gold is this sheet's one fill; the screen behind is dimmed.

### Player
True black. The slide is shown whole, centred. A scrim fades in from the top (130 tall) and from the bottom (330 tall); on them, 16 from each side:
- **Top** (53 from the top): a 44 glass ✕ at the left; the count "12 / 300+" in a 28 glass pill at the right.
- **Bottom** (34 from the bottom, groups 16 apart): the artist (36 mark, name in headline, "3h ago · #4512290" in footnote at 74% white); a row of four 44 glass circles spread across the width (Favorite, Post info, Slideshow settings, Share); the transport, centred and 24 apart: Previous, a **62 gold Play / Pause with the 4 lip**, Next; and a 4 tall progress bar (white on 18% white) with the time left in footnote-rounded.
- Favouriting here fills the heart pink, pops it, spins the artist's mark and adds to the tab bar's goo.
- Controls auto-hide after 2.5 s while playing (spec, not in mock). Follow for an unfollowed artist goes after the name (spec, not in mock).

### Not drawn yet
The signed-out landing; empty and error states and their mascot; the player's quick-settings and info sheets; filter menus; the hold-a-tag targets; "Follow from favorites"; desktop. Build them from UX.md with the parts above, and show the owner before they ship.

### Motion
| Motion | Duration · curve | What animates | Source |
|---|---|---|---|
| Lip press | 100 ms ease-out | `translateY(lip)` and the lip closing to 0 | mock |
| Chip press | 100 ms ease-out | scale to .96 | mock |
| Favourite pop | 320 ms `cubic-bezier(.2,.9,.3,1.4)` | heart scale .7 → 1.3 → 1 | mock |
| Heart goo drip | 720 ms; sag `cubic-bezier(.25,1.6,.45,1)`, pull back `cubic-bezier(.5,0,.2,1)` | bead, three necks and blobs under the pill; the drop leaves for the tab bar at 380 ms | mock |
| Double-tap heart | 640 ms | one 88 heart over the picture | mock |
| Mark spin | 600 ms `cubic-bezier(.3,1.5,.5,1)` | one turn, on favourite and on follow | mock |
| Follow wiggle | 360 ms ease-out | rotate −3° → 2° → 0 | mock |
| Follow dots | 480 ms | six 5 px dots, from the mark's rim, 30 px out | mock |
| Tab capsule | 500 ms `cubic-bezier(.3,1.35,.5,1)` | rotation about the bend's centre | mock |
| Tab icon hop | 420 ms `cubic-bezier(.3,1.5,.5,1)` | up 5 px, scale 1.12; label colour 200 ms | mock |
| Tab bar scroll | spring (stiffness 210, damping 21); rubber band past the ends | rail rotation | mock |
| Goo spurt (secret tab) | 400 ms squeeze; ten drops in spurts of 4, 3, 3, 133 ms apart, each 240 ms plus 1.4 ms per px travelled | drops on ballistic arcs, stretched along their speed | mock |
| Goo wipe | 900 ms blade, then a 520 ms gleam | blade rotation, flung drops, gleam | mock |
| Play hide / return | 200 ms ease-out; returns after 1 s idle | opacity and `translateY(24px)` | mock |
| Compact bar | 150 ms ease-out, past 64 px of scroll | opacity | mock |
| Tuck | scroll-driven | card scale 95% ↔ 100%, 16 px rise, opacity 55% ↔ 100% | mock |
| Skeleton shimmer | 1.4 s ease-in-out, looping | a light band crossing each well shape | mock |
| Caught-up | once, on entering view | app mark turns one notch (45°) | mock |
| Segmented capsule | 360 ms `cubic-bezier(.3,1.35,.5,1)`; label colour 200 ms | translateX to the chosen segment | mock |
| Switch | knob 300 ms `cubic-bezier(.3,1.35,.5,1)`; track colour 200 ms | knob translateX 20 px | mock |
| Glass, back and toggle press | 100 ms ease-out | scale to .94 | mock |
| Hero follow dots | 520 ms | six 7 px dots from the 80 mark's rim | mock |
| Player heart | 320 ms `cubic-bezier(.2,.9,.3,1.4)` | the favourite pop, on the glass heart | mock |
| Field caret | 1.1 s, stepped | caret opacity | mock |
| New-posts pill | slides in under the header; posts insert with a slide-down, keeping the reading position | translateY, opacity | spec (not in mock) |
| Tab content | 120 ms fade | content opacity | spec (not in mock) |
| Push / Back | 150 ms cross-fade + 8 px rise; gesture back never animates | opacity, translateY | spec (not in mock) |
| Player open / close | 200 ms fade-up from the card / fade out | opacity, translateY | spec (not in mock) |
| Player controls | auto-hide after 2.5 s playing; stay while paused or focused; 250 ms double-tap guard | opacity | spec (not in mock) |
| Sheets | spring up; drag to dismiss with rubber-banding | translateY | spec (not in mock) |
| Pull to refresh | indicator follows at half the finger; 144 px travel arms; spinner holds at 48 px for at least 400 ms | translateY | spec (not in mock) |
| Toasts | stay 6 s, pause on hover or focus, `role="status"` | opacity, translateY | spec (not in mock) |

Grammar: two speeds. **Touch feedback** is 100 to 200 ms, ease-out, no overshoot (press, hide, fade). **Celebrations** (favourite, follow, tab change) overshoot once and are done within 720 ms. **Goo** is the one slow thing. Everything animates transform and opacity only, except the goo's shapes.
**Reduced motion:** no pop, wiggle, spin, hop, dots, drip, flying drops, Tuck or shimmer; the lip, the tab and segmented capsules, the switch knob and Play move instantly; the caret does not blink; the tab bar's goo still shows and updates in place, because it is state, not motion. Per UX.md §7: feeds don't autoplay video; the player defaults to Classic with no transition.

## Build rulings (where the mock leaves a gap)

The two v6 mocks are approved; these rulings win over them when building.

1. **Caught-up title is white**, not gold. Gold stays: main action, "New", current tab.
2. **Lip:** 3 by default, 4 on Play and the player's Play / Pause, 2 on Follow pills and stepper buttons. Every raised control has one; "Wipe clean" (drawn flat in the feed mock, raised in the screens mock) is a compact tonal button and gets the 3 lip.
3. **The lip is always a darker shade of the current fill:** the favourited (plum) pill gets #291A35, not navy.
4. **One quiet outline:** `rgba(180,199,217,.22)` at 1.5 px for both "Following" and the "+N" tag (the mock draws the tag at .18).
5. **15 px Fredoka is always 15 / 20**, at 600 for counts and actions and 500 for chip labels.
6. **One-off sizes are named component constants**, not steps: Play 56, tab bar tube 64 with 54 tabs, bend 10, glass play disc 56, sheet row 52, artist card 296, collage 164, double-tap heart 88, account row 72, player Play 62, artist hero mark 80, style preview 76 × 100, switch 51 × 31, slider thumb 28 on a 12 track.
7. **Fredoka is self-hosted** (`next/font`), weights 500 and 600 only, never Google Fonts at runtime.
8. **`tag-artist` (#F2AC08) stays** for artist-category tags in tag lists and the player's info sheet; posts don't show the artist tag.
9. **The goo count** is local to the device and survives reloads (the mock keeps it in `localStorage`); wiping it is a Settings action only. There is no clean button on the tab bar.
10. **Nothing in the mock is real art.** Placeholder colour fields only, in the mock and in anything committed.

## Do's and Don'ts

### Do:
- **Do** keep every value on the closed size system: gaps 4/8/12/16/24, an 8 edge inside panels and a 16 edge on the screen, heights 44/36/28, badges 16/20/24, radii 24 with 16 nested inside.
- **Do** make everything pressable a raised thing with a lip, and everything that only sits there a panel or a well.
- **Do** fill gold once per screen, for the main action; use gold otherwise only for "New", the current tab, a selected chip's ring and the Follow plus.
- **Do** put the artist on top of a post and the heart at the right end of its footer, with the score beside it.
- **Do** give 36 and 28 controls a 44 touch area, and every number tabular figures.
- **Do** keep any new small-text colour at 4.5:1 on the surface it sits on, keeping its e621 hue.

### Don't:
- **Don't** put anything on top of the art except the video play glyph, length and mute (and the player's own auto-hiding controls). The double-tap heart is the one thing that may flash over a picture.
- **Don't** tint or frame art with colour washes; navy panels may surround it, never cover it.
- **Don't** draw depth with outlines, gradients or glows. One light, from above.
- **Don't** put a lip on panels, rows, fields, tags, chips, toggles, tabs or anything over art, and don't add blurred shadows beyond Play, the new-posts pill and the tab bar.
- **Don't** use Fredoka at 700, or for tags and reading text.
- **Don't** use a second accent colour, meaning colours as large fills, gold in an artist's mark, or a second gold fill on a screen (the artist page has no "Play all").
- **Don't** put muted text on Raised Highlight (3.7:1).
- **Don't** let goo touch a picture, hide a label, or be cleaned anywhere but Settings.
- **Don't** throw dots anywhere but Follow.
- **Don't** borrow Duolingo's owl, green, streaks, gems or guilt nudges, or AllTrails' green, logo or buttons on photos.

## References (studied, not copied)

| Reference | What we took | Not taken |
|---|---|---|
| e621ng Hexagon theme | Ground, panel, raised, link blue, active gold #E8C446, tag category and score colours; navy post boxes; post numbers and scores always visible | Verdana; hexagon motif; unlifted low-contrast text colours |
| AllTrails iOS (`docs/path-a/research/alltrails-study.md`) | One 16 edge; tighter internal than external spacing; a few type sizes with big jumps; one muted colour; chevron = opens a menu; a floating tab bar with a capsule for the current tab; one primary action per screen | Their green, logo, light look; buttons on photos; photo carousels with dots; exact proportions and copy |
| Duolingo (`docs/path-a/research/duolingo-study.md`, `duolingo-research.md`) | Solid same-hue lip on pressables; rounded face for voice; saturated colour only for meaning; celebration moments that never sit on content | The owl and characters, their green, Feather / DIN Round, streaks, gems, guilt nudges, white backgrounds, caps-tracked labels |
| iOS (platform) | Large titles, grouped settings, bottom sheets, switch, status-area spacing | |

## Tailwind 4 `@theme` mapping (suggested)

The app's `src/app/globals.css` `@theme` currently holds the old palette (`--color-accent: #fcb328`, `--color-panel: #0f1a2b`, …); replace it with these names when the build starts.

| Token | `@theme` variable | Example utility |
|---|---|---|
| Colours | `--color-ground`, `--color-well`, `--color-panel`, `--color-bar`, `--color-raised`, `--color-raised-hi`, `--color-outline`, `--color-fg` (white; avoids `text-text`), `--color-link`, `--color-muted`, `--color-gold`, `--color-on-gold`, `--color-lip-gold`, `--color-lip-navy`, `--color-fav-on`, `--color-lip-fav`, `--color-glass`, `--color-glass-base`, `--color-glass-art`, `--color-score`, `--color-heart`, `--color-danger`, `--color-rating-q`, `--color-goo`, `--color-goo-aged`, `--color-goo-ink`, `--color-tag-artist`, `--color-tag-character`, `--color-tag-species`, `--color-tag-general`, `--color-tag-meta`, `--color-tag-copyright`, `--color-tag-lore` | `bg-panel`, `bg-well`, `text-muted`, `text-tag-species` |
| Fonts | `--font-rounded` (Fredoka from `next/font`, then `ui-rounded`), `--font-sans` (system text stack), `--font-mono` | `font-rounded` |
| Type | `--text-large-title: 34px` with `--text-large-title--line-height: 41px`, `--text-large-title--font-weight: 600`, `--text-large-title--letter-spacing: -0.005em`; likewise `--text-section` (20/25/600), `--text-headline` (17/22/600), `--text-callout` (15/20/600), `--text-label` (15/20/500), `--text-body` (15/20), `--text-footnote` (13/18), `--text-tag-list` (15/20/500), `--text-tab` (11/13/500) | `text-headline font-rounded` |
| Spacing | keep the default `--spacing: 0.25rem` (4 px), so gaps are `1 2 3 4 6`; add `--spacing-edge: 8px`, `--spacing-inset: 16px` | `p-edge`, `px-inset`, `gap-3`, `mb-4` |
| Sizes | `--spacing-control: 44px`, `--spacing-control-compact: 36px`, `--spacing-control-well: 28px`, `--spacing-row: 52px`, `--spacing-list-row: 56px`, `--spacing-fab: 56px`, `--spacing-bar: 64px`, `--spacing-avatar-s: 24px`, `--spacing-avatar-pile: 28px`, `--spacing-avatar: 36px`, `--spacing-avatar-l: 56px`, `--spacing-avatar-xl: 80px` | `h-control-compact`, `size-fab` |
| Radius | `--radius-badge: 6px`, `--radius-art: 16px`, `--radius-panel: 24px`, `--radius-sheet: 24px` (capsules use `rounded-full`) | `rounded-panel`, `rounded-art` |
| Shadows | `--inset-shadow-lit: inset 0 1px 0 rgba(255,255,255,.09)`, `--inset-shadow-lit-gold: inset 0 1px 0 rgba(255,255,255,.5)`, `--inset-shadow-lit-fav: inset 0 1px 0 rgba(255,190,200,.22)`, `--inset-shadow-lit-b: inset 0 -1px 0 rgba(0,0,0,.25)`, `--shadow-lip: 0 var(--lip, 3px) 0 var(--lip-c, var(--color-lip-navy))`, `--shadow-sunk: inset 0 1px 0 rgba(0,0,0,.35), 0 1px 0 rgba(255,255,255,.05)`, `--shadow-sunk-art: 0 0 0 1px rgba(2,15,35,.6), 0 1.5px 0 rgba(255,255,255,.06)`, `--shadow-float: 0 14px 28px rgba(0,0,0,.45)` | `inset-shadow-lit shadow-lip` |
| Blur | `--blur-glass: 24px`, `--blur-glass-art: 12px` | `backdrop-blur-glass backdrop-saturate-160` |
| Motion | `--ease-pop: cubic-bezier(.2,.9,.3,1.4)`, `--ease-spring: cubic-bezier(.3,1.5,.5,1)`, `--ease-slide: cubic-bezier(.3,1.35,.5,1)`, `--animate-pop: pop 320ms var(--ease-pop)`, `--animate-wiggle: wiggle 360ms ease-out`, `--animate-hop: hop 420ms var(--ease-spring)` (keyframes inside `@theme`); durations use `duration-100/150/200/500` | `active:translate-y-[3px] transition duration-100 ease-out` |
