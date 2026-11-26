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
  goo-shade: "#9FB3CC"
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
  menu: "26px"
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
  menu:
    backgroundColor: "{colors.well}"
    rounded: "{rounded.menu}"
    padding: "4px"
  menu-row:
    textColor: "{colors.muted}"
    typography: "{typography.callout}"
    rounded: "{rounded.full}"
    padding: "0 8px 0 16px"
    height: "44px"
  menu-row-selected:
    backgroundColor: "{colors.raised-hi}"
    textColor: "{colors.text}"
    rounded: "{rounded.full}"
  tag-target:
    backgroundColor: "{colors.raised-hi}"
    textColor: "{colors.text}"
    typography: "{typography.callout}"
    rounded: "{rounded.full}"
    padding: "0 16px 0 12px"
    height: "44px"
  tag-target-danger:
    backgroundColor: "{colors.raised-hi}"
    textColor: "{colors.danger}"
    rounded: "{rounded.full}"
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
    padding: "8px 16px"
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
  state-panel:
    backgroundColor: "{colors.panel}"
    textColor: "{colors.text}"
    typography: "{typography.headline}"
    rounded: "{rounded.panel}"
    padding: "24px 16px"
  landing-card:
    backgroundColor: "{colors.panel}"
    textColor: "{colors.text}"
    typography: "{typography.section}"
    rounded: "{rounded.panel}"
    padding: "20px 16px 16px"
  button-quiet:
    textColor: "{colors.link}"
    typography: "{typography.callout}"
    rounded: "{rounded.full}"
    padding: "0 16px"
    height: "44px"
  banner:
    backgroundColor: "{colors.well}"
    textColor: "{colors.link}"
    typography: "{typography.footnote-rounded}"
    rounded: "{rounded.full}"
    padding: "0 16px 0 12px"
    height: "36px"
  error-message:
    backgroundColor: "{colors.well}"
    textColor: "{colors.muted}"
    typography: "{typography.post-id}"
    rounded: "{rounded.full}"
    padding: "0 12px"
    height: "28px"
  check-well:
    backgroundColor: "{colors.well}"
    rounded: "{rounded.full}"
    size: "28px"
  check-well-on:
    backgroundColor: "{colors.score}"
    textColor: "{colors.ground}"
    rounded: "{rounded.full}"
    size: "28px"
  button-disabled:
    backgroundColor: "{colors.panel}"
    textColor: "{colors.muted}"
    typography: "{typography.headline}"
    rounded: "{rounded.full}"
    padding: "0 24px"
    height: "44px"
  toast:
    backgroundColor: "{colors.raised-hi}"
    textColor: "{colors.text}"
    typography: "{typography.callout}"
    rounded: "22px"
    padding: "8px"
    height: "44px"
  toast-undo:
    backgroundColor: "{colors.well}"
    textColor: "{colors.text}"
    typography: "{typography.footnote-rounded}"
    rounded: "{rounded.full}"
    padding: "0 12px"
    height: "28px"
  goo-mascot:
    backgroundColor: "{colors.goo}"
    textColor: "{colors.ground}"
    size: "112px"
  count-pill:
    backgroundColor: "{colors.glass-over-art}"
    textColor: "{colors.text}"
    typography: "{typography.footnote-rounded}"
    rounded: "{rounded.full}"
    padding: "0 12px"
    height: "28px"
---

# Design System: e621 Slideshow

Source of truth: two owner-approved mocks. `docs/path-a/mocks/feed-v6.html` is the feed (its `.p6` custom properties and the classes ending in `6`; the page also carries a copy of v5.3 for comparison, which is not part of the system). `docs/path-a/mocks/screens-v6.html` is the rest of the app, built from the same parts: artist page, grid view, Artists, Search, Tune, Settings, Settings › Slideshow, the sign-in sheet, the player and its two sheets, the filter menus, the tag targets, the signed-out landing, the empty, error and offline states, Goo the mascot, and the first run after sign-in. v6 redrew the Following feed and the app's shared chrome: header, chips, post panel, artist card, burst row, caught-up, the ⋯ sheet, Play and the tab bar. It also replaced the materials, sizes, voice face and avatars that every screen uses.

Every surface has a drawing now; the one thing not designed is the goo on a computer. Sections headed *Proposed* were drawn overnight on 2026-11-26 and are not owner-approved yet; the list is in `docs/path-a/MORNING-DESIGN.md`. Build those from `docs/path-a/UX.md` out of the parts below and show the owner before they ship. Values marked **spec (not in mock)** come from `docs/path-a/UX.md`. The machine-readable extensions (ramps, shadows, motion, component snippets) are in `.impeccable/design.json`.

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
- "Bends" marks for artists (e621 has no artist pictures); the app mark is the hexagon with Play (it was the kaleidoscope until 2026-11-26).
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
- **Goo Shade** (#9FB3CC): the underside of Goo the mascot, a copy of its shape a few px lower. The tab bar's goo and the heart's drip have none.
- **Goo Ink** (#35527F, #0A1D3B for the current tab): the colour a tab's icon and label take where goo covers them. 7.9:1 on fresh goo, 6.3:1 on fully aged goo, so labels stay readable under any amount.

### Glass
- **Chrome glass**: `rgba(21,47,86,.88)` over a solid `#0B1F3E` base, `blur(24px) saturate(1.6)`, with a `0 1px 0 rgba(180,199,217,.12)` bottom edge. The compact header bar only. The tab bar is solid, not glass.
- **Over-art glass**: `rgba(2,15,35,.55)` (`.5` for the play disc), `blur(12px)`, 1 px `rgba(255,255,255,.16)` inset ring. The video play disc, length and mute; the player's buttons and count pill, the play disc on a grid tile.
- **Ground fade**: a 150 tall `transparent → rgba(2,15,35,.86) at 62% → ground` scrim behind the bottom stack, so Play and the tab bar never sit on a hard edge.

### Named Rules
**The One Gold Rule.** Gold fills one thing per screen: its main action. Everywhere else gold is a label, a dot, a ring or a glyph that says "new" or "you are here". A second gold fill on a screen is a bug. Where a screen asks you to sign in, Sign in is that one fill: on the landing, Play stays hidden until the card that holds Sign in has scrolled away.

**The Art Is the Light Rule.** Nothing on the interface is more saturated than the art. Navy is the neutral; meaning colours appear only as small icons, numbers and tag text. Goo is white like text, and it never touches a picture. That goes for Goo the mascot too: white, a pale blue underside, navy eyes, and pink only on its cheeks and tongue.

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
- **Control heights:** **44** regular (tools capsule, burst row, large buttons) · **36** compact pressable (fav pill, Follow, chips, small buttons, ⋯) · **28** sunk or on the picture (tags, video length, mute). 36 and 28 controls extend their touch area to 44 with an invisible `::before`. Rows in the ⋯ sheet are 52; rows in a menu are 44; rows of controls that sit straight on a sheet are 56, like list rows. Rows in a list group are at least 56 (60 for an artist row, 72 for the account row, 48 for a search suggestion).
- **Badges:** 16 (tab badge) · 20 ("+N" artists, rating) · 24 (Play count).
- **Avatars:** 24 burst row, the artist page's compact bar, an artist among search suggestions · 28 the pile in the header · 36 post header, artist card, artist row, sheets, player · 56 app mark at caught-up and in the Settings footer, the account row · 80 artist hero.
- **Icons:** 24 tab bar (stroke 2, 2.4 on the current tab) · 20 tools and sheet rows (2.2 / 2) · 18 heart, score, burst chevron · 16 next to 13 px text (Follow, chip chevron, mute). The ⋯ glyph is 22. Play glyphs are 26, filled.
- **Top:** 47 status area, then a 52 title row (large title left, tools capsule right), a 28 line under it (avatar pile, "**12 new** from 5 artists"), then the chip row (12 above, 16 below). After 64 px of scroll the top bar arrives (150 ms): a floating capsule with the title, the count in gold and the tool buttons. See "The top bar, the pointer, grid loading, one head, chip dropdowns".
- **Pushed screens** (artist, Search, Results, Tune, a Settings sub-page): the 52 row holds a 44 back button at the left and the tools capsule, if any, at the right. Tune and Settings sub-pages put the large title on its own line under that row; Search and Results put a field in the row instead.
- **Inside a sheet:** one 16 inset. Every left and right edge lands on it: the title, the ✕ well, fields, wells, menus, switches. A trailing chevron is pulled 5 to the right so its tip, not its box, touches the inset, as in every list row.
- **Bottom stack** (each above the safe-area inset): tab bar 22 from the bottom, 16 from each side → Play, **left** edge 16, 100 from the bottom (the bar passes 14 under its disc) → toasts above that. Scroll content gets 176 bottom padding so the last post's heart clears the stack. Search (keyboard up), sheets and the player have no tab bar and no Play.
- **Horizontal rows** (chips, tags, artist cards) scroll sideways with hidden scrollbars. A tag row fades at an edge only while tags are hidden past that edge (28 fade, driven by the scroll position), and never scrolls vertically. Artist card rows snap to the 16 edge.
- **Tall pictures:** anything taller than 1:2 is capped at 1:2 and shown whole, centred on Well.
- **Desktop:** see "On a computer (900 px and wider)" (proposed).

## Elevation & Depth

Depth is three materials lit from one direction (above). Fills are flat; the only shading is a 1 px light on top of things and a 1 px dark rim on top of holes.

### The three materials
- **Raised (you press it).** Top light `inset 0 1px 0 rgba(255,255,255,.09)` plus a solid lip underneath in a darker shade of the control's own fill: `0 3px 0 #0A1B38` under navy, `#A8871F` under gold, `#291A35` under the favourited pill. Pressing moves the control down by the lip and closes the lip to 0 in 100 ms. Gold uses a stronger top light (`rgba(255,255,255,.5)`), the favourited pill a pink one (`rgba(255,190,200,.22)`).
- **Panel (it holds things).** Top light as above plus a bottom shade `inset 0 -1px 0 rgba(0,0,0,.25)`. No lip, no outline.
- **Sunk (it sits in the panel).** Tags: `inset 0 1px 0 rgba(0,0,0,.35), 0 1px 0 rgba(255,255,255,.05)` (dark rim above, lit below). Pictures: `0 0 0 1px rgba(2,15,35,.6), 0 1.5px 0 rgba(255,255,255,.06)`. Everything else sunk uses the tag's rim: fields, the segmented track, the switch track, stat wells, and the round wells that hold a row's icon, a step number or a sheet's close ✕. **A glyph in a round well sits 0.5 px below the centre of its box**: the dark rim on top and the lit edge underneath make the hole read lower than the box.
- **Knobs** (the two things that slide inside a well): the switch knob has `0 2px 0 rgba(2,15,35,.4)` under it, the slider thumb `0 3px 0 rgba(2,15,35,.55)`. The segmented control's capsule is Raised Highlight with the top light and `0 1px 0 rgba(2,15,35,.5)`.

### Lip sizes
3 by default; **4** on Play and the player's Play / Pause; **2** on Follow pills and the stepper's − and +.

### Real shadows (four, each with a job)
- **Play:** `0 14px 28px rgba(0,0,0,.45)` under the lip (`0 8px 18px` when pressed). It floats over the feed. The first run's "Follow N artists" button stands in Play's place and wears the same shadow; the two are never on screen together.
- **New-posts pill:** `0 12px 24px rgba(0,0,0,.4)` under its lip. It floats over the feed.
- **Tag targets:** the same `0 12px 24px rgba(0,0,0,.4)`, no lip. They float over whatever the tag sits on.
- Goo the mascot stands on a flat ellipse of 28% black. It is not blurred, so it is not a fifth one.
- **Tab bar:** a copy of the tube's outline, 10 px lower, blurred 14 px at 50% black. Its light is a 1 px `rgba(255,255,255,.16)` stroke along the top outer edge and a `rgba(255,255,255,.06)` ring around the whole tube.

### Rings
- **Selected ring** (`inset 0 0 0 1.5px #E8C446`): selected filter chip, a focused field, a pinned tag's toggle, the tag target under the finger. The selected slideshow style wears it outside the preview: 2 px of Ground, then 1.5 gold.
- **Danger ring** (the same ring in Danger Rose): a muted tag's toggle; a field with an error; the Blacklist target under the finger.
- **Quiet outline** (`inset 0 0 0 1.5px rgba(180,199,217,.22)`): Following (pill and the artist page's wide button), "+N" tag. A held tag wears it at .32 so it reads against the targets.
- **Badge rings**: Play count `0 0 0 2px #E8C446`; new-post dot `0 0 0 2.5px` panel colour; tab badge `0 0 0 2px` bar colour; avatars in the header pile `0 0 0 2.5px` ground.
- **Sheet:** top light only, over a `rgba(2,15,35,.6)` dim.

### Named Rules
**The Lip Is a Promise Rule.** A lip means "press me, and something happens". It goes on Play, the fav pill, Follow, the burst row, the new-posts pill, gold or tonal buttons, the stepper's buttons and the player's Play / Pause. Never on panels, rows, fields, tags, chips, toggles, the segmented control, menus, the tools capsule, back buttons, tabs, tag targets (you drag onto them as often as you press them; they answer by growing), or anything over art. Goo the mascot's underside is its thickness, not a lip: it does not close when pressed. Goo is a toy, not a control: a tap squashes it and spurts goo, and nothing in the app depends on that. Chips answer a press by shrinking to 96%; tags by darkening.

**The One Light Rule.** Light comes from above on every surface: raised things are lit on top, sunk things are dark on top. Never a gradient fill, never a glow, never an outline around a panel.

## Shapes

- Everything you touch is a full capsule (`999px`): buttons, chips, tags, pills, tabs, badges, avatars. The rating badge is the one exception (6 radius, so it reads as a label, not a button).
- Containers nest: **24** for post panels, artist cards, list groups, the stat panel and the top corners of sheets; **16** for whatever sits 8 inside them (the picture, a collage, the row group in a sheet). 24 − 8 = 16, so the corners stay concentric. The same rule sizes a menu's track: its rows are 44 capsules (22 radius) sitting 4 inside, so the track is **26**. Whenever a rounded thing sits in the corner of another, the outer radius is the inner radius plus the gap.
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
Sunk capsule, 28 tall (44 touch area), system 13 at 500 in the tag's e621 category colour, shown with spaces. Press darkens the well (#071631). "+N": transparent with the quiet outline, muted footnote-rounded. Hold 450 ms for its targets (see Tag targets).

### Filter chip
Panel capsule with top light, 36 tall (44 touch area), label (Fredoka 500 · 15), 14 side padding, a 16 muted chevron only when it opens a menu. **Selected:** Raised Highlight fill, 1.5 gold ring, gold chevron. Press shrinks it to 96%. Toggle chips use `aria-pressed`. No lip. A chip with a chevron opens its menu as a sheet (see Menu) and, once set, shows the value instead of its name ("Top", "Videos", "≥ 50").

### Follow pill
Raised capsule, 36 tall, gold 16 plus and "Follow" (footnote-rounded), 2 lip. **Following:** transparent with the quiet outline, green check and "Following"; it does not travel when pressed. Toggling plays the **wiggle** (360 ms). Following an artist also makes their mark throw **one ring of six 5 px dots** in its own colours, centred on the mark, starting at its rim and travelling 30 px (480 ms), and spin once. This is the only dot burst in the app.

### Artist marks ("Bends") and the app mark
e621 has no artist pictures, so each artist gets a mark hashed from their name: two round-capped arcs (at 70% and 41% of the disc's radius, stroke 21% of it) around a centre dot. The three colours, the arcs' start angles and lengths, and the dot's size all come from the hash. Colours are picked from eight: #B4C7D9, #E9F2FA, #5B9BE0, #F3946B, #FF8A95, #EE7BEE, #5EC06A, #78DCA5. Never gold. The mark sits on a raised disc (Raised Navy, top light, 1 px dark ring) and spins one turn (600 ms, overshooting) when you favourite one of their posts or follow them.
**The app mark is the hexagon with Play** (owner, 2026-11-26: "Use the hexagon"; treatment owner-picked, "Inlay"; the measurements are mine). It is the app icon's shape drawn as a quiet thing inside the app: at "You're all caught up", at the foot of Settings and at the top of the sidebar. The kaleidoscope has left the app; no kaleidoscope is left anywhere. Source file: `docs/path-a/icons/app-mark.svg`. Sizes are a share of the mark's box (the 56 mark in brackets); it is drawn at 56 and 36.
- **Hexagon:** point up, 97% tall and 84% wide (54 by 47), corners rounded 9.7% (5). Face: a top-to-bottom gradient from Raised Highlight (#2B4D80) to Raised (#1F3C67). Top light: white at 22%, 2% thick (1), along the upper edges.
- **Play:** a triangle that points right, 34% wide and 39.5% tall (19 by 22), corners rounded 4% (2), moved 1.7% (1) to the right so it looks centred. Gold (#E8C446), set into the face: a darker band (#A8871F) 3% deep (1.7) along its upper edges and a light edge (white at 12%, 2%) under its lower edges.
- **No lip and no shadow** (the Lip Is a Promise Rule: the mark is not a button). **Gold is only the Play glyph** (the One Gold Rule: Play is still the screen's one gold fill). Never the icon's gold hexagon inside the app.
- In Settings the mark is a button for fun: pressed, it pops (92% to 100%, 360 ms, `cubic-bezier(.3,1.35,.5,1)`). *The pop is proposed, not owner-approved.*

### Buttons
- **Gold** (main action): gold fill with the strong top light, ink label, gold lip. 44 tall (headline, 24 padding) or 36 compact (callout, 18 padding).
- **Tonal**: Raised Navy, white label, navy lip. Same two sizes. Paired buttons share a row equally.
- **Disabled** (a button that cannot be pressed right now): Panel fill, Muted label, the panel's top light, no lip, and no icon. It says why in its own label ("Pick artists to follow"), never just greyed-out words. Only things you can press are raised.
- **Quiet** (the second, lesser way out of a state: "Search instead"): no fill, Link Blue callout, 44 tall, 16 padding. No lip; a 4% white wash while pressed. Only ever under a gold or tonal button.
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
- **Goo the mascot** adds one to three when tapped (see Goo).
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
Centred, shown once per visit, never over art: the 56 app mark between two 2 px rules that fade toward the screen edges, then "You're all caught up" (headline, white) and "Marked as seen on e621" (muted footnote). The mark pops once as it scrolls into view: 92% to 100%, 360 ms, `cubic-bezier(.3,1.35,.5,1)`; nothing with reduced motion. *Proposed, not owner-approved: the kaleidoscope turned one notch here, and a hexagon with Play cannot turn.*

**The end of a feed** is the same moment with other words: "That's everything" and, when posts were left out, a muted footnote that says why ("3 hidden by your blacklist · 2 need you signed in"). No typed flower.

### Sheet (⋯ menu)
Dim `rgba(2,15,35,.6)` behind. Panel sheet, 24 top corners, top light, padding 8 / 16 / 28, grabber. A context line (36 mark, name, mono post number), then one Well group (16 radius) of 52 rows: 20 link-blue icon, callout label, optional muted value at the right ("e621.net"), dividers `rgba(180,199,217,.1)` starting at 46. Rows: Play from this post, Share post, Open on e621, Blacklist this artist (Danger Rose). Spring up; drag to dismiss (spec).

### Scroll physics: Tuck
Cards respond to the two edges they pass. Coming in above the tab bar, a card's top grows from 95% to full size and rises its last 16 px. Leaving under the header, its end shrinks to 95% and dims to 55%. Card positions are measured once, not per frame; only transform and opacity change.

### Lists: group, row, icon well
The pattern for anything that is a list of things to open or set (Settings, the artist list, saved searches, Tune's tags).
- **Group:** one Panel, 24 radius, 16 from the screen edge, 16 below. A **group label** above it when it needs one (footnote-rounded, muted, 16 in from the panel's edge, 8 above the panel), with an optional link-blue action at its right ("Clear"), its text ending 16 in from the panel's edge.
- **Row:** at least 56 tall, padding 8 / 16, items 12 apart: an optional lead (icon well, artist mark), the title (callout) over an optional muted footnote line, then an optional muted value, then one of: a 16 muted chevron (it opens something), a control (switch, stepper, small segmented control, compact tonal button) or ⋯. Whatever ends the row (a control, a value, a button) has its right edge 16 from the panel's edge, the same as the text's left edge; a chevron is pulled 5 to the right and a ⋯ 10, so the ink, not the box, sits there. A row that opens something is a button and lightens by 4% when pressed. Rows are divided by a 1 px `rgba(180,199,217,.1)` line that starts where the text starts (60 with an icon well, 64 with a mark, 16 with neither).
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
- **Top bar** (once the hero has scrolled away, about 196 px): the floating capsule with bare back, 24 mark, name (headline, ellipsis), Follow pill.

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
A titled sheet (see Sheets with a title): "Sign in with e621". Three steps, 8 apart: the number in a 28 round well (footnote-rounded, Link Blue), then the step in body; a step that opens e621 is a link (callout, Link Blue, with the ↗ icon). Then Username and API key fields with their labels; the key is shown as dots in mono, with Paste inside the field. A muted footnote with a 16 green shield: "Your key stays on this device and is only ever sent to e621." A row "Remember on this device" (callout) with a switch. A full-width 44 gold "Sign in". Gold is this sheet's one fill; the screen behind is dimmed.

### Player
True black. The slide is shown whole, centred. A scrim fades in from the top (130 tall) and from the bottom (330 tall); on them, 16 from each side:
- **Top** (53 from the top): a 44 glass ✕ at the left; the count "12 / 300+" in a 28 glass pill at the right.
- **Bottom** (34 from the bottom, groups 16 apart): the artist (36 mark, name in headline, "3h ago · #4512290" in footnote at 74% white); a row of four 44 glass circles spread across the width (Favorite, Post info, Slideshow settings, Share); the transport, centred and 24 apart: Previous, a **62 gold Play / Pause with the 4 lip**, Next; and a 4 tall progress bar (white on 18% white) with the time left in footnote-rounded.
- Favouriting here fills the heart pink, pops it, spins the artist's mark and adds to the tab bar's goo.
- Controls auto-hide after 2.5 s while playing (spec, not in mock). Follow for an unfollowed artist goes after the name (spec, not in mock).

### Sheets with a title
Every sheet except the ⋯ menu starts the same way: the Panel sheet over the dim, the grabber, then a title row: the title in Section type at the left and a 36 round well with a link-blue ✕ at the right, its edge on the 16 inset, 8 above the content. Bottom padding is 28, or the safe-area inset when that is larger (34 in the mock). The sheet is already a Panel, so **rows of controls sit straight on it** with no group around them: list rows (56 tall, no side padding) divided by the usual 1 px line, which starts at the text (0, or 44 after an icon well). Wells and raised controls need the Panel under them to read; a Well group would swallow them.

### Menu (one choice from a list)
The filter menus Sort, Date and Score. Since 2026-11-26 the menu drops under its chip (see "Chip dropdown") and is no longer a titled sheet; there the track is the dropdown's own Panel in place of the Well. It is **a vertical segmented control**:
- **Track:** Well with the tag's rim, 26 radius, 4 padding.
- **Rows:** 44 tall capsules, callout with tabular figures, muted, 16 left padding. `role="radio"` in a `radiogroup`.
- **The chosen row** is white on a Raised Highlight capsule (top light, `0 1px 0 rgba(2,15,35,.5)` under it) that **slides** to it in 360 ms on the segmented control's curve. No gold, no check mark, no lip.
- **A divider** between groups is a 9 tall gap with a 1 px `rgba(180,199,217,.1)` line, 16 in from each side. Sort is New, Top, Hot, then Oldest, Most favorited, Random, Most comments, Largest.
- **Tapping a row applies it and closes the menu.** The chip then shows the value.
- **A row's own action** shows only while it is chosen, at its right end: Random carries "Reshuffle" (16 shuffle icon, footnote-rounded, Link Blue, 28 tall with a 44 touch area). Build it as a sibling button, not inside the row's button.
- **Custom…** is the last row of Date and Score. Choosing it keeps the menu open and adds controls under the rows (a 1 px line, then 12 padding), ending in a full-width 44 tonal "Apply". It is tonal, not gold, because Play is still on screen under a dropdown. Date's menu is 343 wide so the five-way control fits; Score's is 220.
  - *Date:* a five-way segmented control (On · After · Before · Between · Last), then 12 below it: one "Date" field; or "From" and "To" side by side, 8 apart; or, for Last, an 88 wide number field and a 44 segmented control (days · weeks · months). Date fields carry a muted 18 calendar icon and open the system date picker (spec, not in mock).
  - *Score:* one "At least" field with an 18 Score Green arrow in front and the numeric keyboard (spec, not in mock).

### Media menu (more than one)
Images, GIFs and Videos can each be on, so this is not a one-of list. A titled sheet with three rows straight on it: an icon well, the name in callout, a switch. v6 has no checkbox; on and off is always a switch.

### Player sheets
Both are the app's own Panel sheet over the dim, on top of the player: the same navy as everywhere, not glass. Glass stays for controls that sit on art. Opening one pauses the slideshow; closing resumes it.
- **Quick settings** (the sliders button). Title "Quick settings". The slideshow style previews from Settings, in a row that bleeds to the sheet's sides (its ring's 2 px gap is Panel colour here, not Ground). Then four rows straight on the sheet: Seconds per slide (stepper), Fit (a 168 wide small segmented control: Fit · Fill · 1:1), Mute videos (switch), Quality (value and chevron). Last, a centred 44 link "More in Settings ›" (callout, Link Blue, a muted 16 chevron). **From a link**, a 44 segmented control "This visit only · Save as default" sits under the title, 16 above the previews.
- **Post info** (the ⓘ button). No title: the artist is the heading. A row with the 36 mark, the name in headline followed by a muted 16 chevron (it opens their page), "#4512290 · 3h ago" in mono underneath, and the ✕ well at the right. 12 below, three stat wells 8 apart, straight on the sheet: score with a green arrow, favs with a pink heart, and the rating as a word in its colour ("Safe"). In For You only, 12 below: a muted footnote line with a 16 link-blue spark saying why ("For you because you fav **otter** and **cozy** a lot.", the tags in white). Then the tags by kind, in e621's order (Copyrights, Characters, Species, General, Meta, Lore; empty kinds are skipped): a label in muted footnote-rounded with its count at 70%, 16 above and 8 below, over tags that **wrap**, 8 apart with 12 between lines (the touch area here is 40 tall). Last, 12 below: the file in muted mono 12 / 16 ("1536 × 2048 · PNG · 2.1 MB") at the left and the link "Open on e621 ↗" at the right. A long tag list scrolls inside the sheet, which stops 56 below the top of the screen (spec, not in mock).
- **More than one artist** (spec, not in mock): the heading is the artist the feed credits; an "Artists" group comes first, in `tag-artist`, only when the post has more than one artist tag.

### Tag targets
What a tag offers. Hold a tag for 450 ms, or tap one in Post info: its well darkens (#071631) and takes the quiet outline, and capsules pop up 8 above it, 8 apart, centred on the tag but kept 8 inside their container.
- **A target:** 44 tall, Raised Highlight, top light, the floating shadow, an 18 link-blue icon and the word in callout, padding 12 left and 16 right. Blacklist is Danger Rose, icon and word. No lip.
- **Which ones:** Search and Blacklist. On the For You feed, Pin replaces Search. In Post info, opened from For You, all three show: Search, Pin, Blacklist. Never more than three; Mute lives in Tune. For an artist tag, the first target is "Open" and goes to their page (spec, not in mock).
- **Under the finger** a target grows to 106% (120 ms) and takes the gold ring, or the Danger ring on Blacklist. Drag onto one and lift, or lift and then tap one. A tap anywhere else closes them.

### Goo (the mascot)
A drop of the app's own goo with a face. It is drawn the way the tab bar's goo and the heart's drip are: plain white shapes under a blur-and-threshold filter, so the body, the spill it stands in and its waving arm are one liquid with soft joins. Drawn in a 120 box; every number below is in that box.
- **The filter:** Gaussian blur 2.4, then alpha × 22 − 9 (the heart's drip uses blur 2 and × 20 − 8). Shapes thinner than about 5 vanish under it, so nothing in Goo is.
- **Body:** a dewdrop 72 wide and 92 tall whose base sits at y = 100: round at the bottom, drawing up to a thin tip that leans right and ends at (64, 8). The tip is what is left of the neck it fell from. Path: `M60 100C38 100 24 90 24 74C24 56 42 43 52 27C55 21 58 14 64 8C67 12 66.5 18 66.5 24C69 35 96 52 96 74C96 90 82 100 60 100Z`.
- **Spill:** three ellipses the filter melts into the body: a skirt (centre 60, 99; 42 × 5.5 radii), one lobe on the right (91, 102.5; 11 × 4) and one drop that got away (109, 104.4; 3.4). It is thin and it runs out of the body with a curved join. A thick slab with a hard edge reads as snow.
- **Underside:** the same shapes in Goo Shade, drawn first and lower: the body and arm 4 lower, the spill 2.4 lower. Under that, a flat ellipse of 28% black (centre 60, 109.5; 46 × 4.5).
- **Face,** drawn on top and never filtered, in Ground navy: two eyes (4.2 × 5.6 ellipses, 14.5 either side of x = 59, at y = 72, each with a 1.5 white glint up and to the left), a `:3` mouth at y = 83 (two 6.5 wide scoops, 2.8 stroke, round ends) and two Heart Pink cheeks at 50% (5 × 3, 26 either side, level with the mouth).
- **Five moods,** which are the whole vocabulary:

| Mood | Says | What changes |
|---|---|---|
| Wave | Hello; please sign in | An arm: a 9.5 thick neck from (89, 78) curving up to a 7.4 round hand at (104, 57), inside the filter so it grows out of the body. A pink tongue under the mouth. Two Link Blue ticks by the hand. |
| Snooze | Nothing here yet; waiting | The body squashes to 108% wide and 86% tall about its base. Eyes shut (two 10 wide arcs). A smaller mouth. Two Link Blue "z" above its right side. |
| Look | Nothing found; needs more | Eyes move 3 right and 2 up; the mouth follows 2.5. A Link Blue "?" (Fredoka 600, 24) above its right side. |
| Oops | Something failed | Eyes squeeze shut (> <), a wavy mouth, one Link Blue sweat drop above its right side. |
| Busy | Working on it; a wait with a count | The plain face (open eyes, `:3`, no tongue) looks left and right: the whole face slides 3.5 either way. Three Link Blue dots rise from its right shoulder (at 86, 38; 8.5 apart, each 3 higher and 0.5 bigger than the last, from r 2.4) and take turns lighting up. |

- **Sizes:** 112 on the ground (an empty or needs-sign-in screen), 104 in the landing card, 96 in an error panel. Never under 72: the face stops reading.
- **Where:** the landing, needs sign-in, empty states, errors, and the first read of your favorites. One per screen. Never over art, never in the feed's chrome, never next to a post, never as an app icon stand-in.
- **Motion:** the wave turns the arm 16° about its shoulder and back, 900 ms ease-in-out, three times, starting 400 ms after it appears; the ticks fade in and out with it. The "z" drift 2 px right and 3 px up and back every 3.2 s. Busy: the face holds left, slides right, holds, and slides back every 3.2 s; each dot goes from 35% to full and 2 px up for a moment, 0.2 s after the one before, every 1.2 s. Nothing else moves by itself.
- **Tap it:** Goo is a toy. It squashes under the finger (107% wide, 90% tall about its base, in 100 ms, like a lip closing) and on release springs back through 94% × 109% and 103% × 97% in 420 ms. As it stretches, 120 ms after the tap, **one to three drops** (picked at random, 70 ms apart) leave its tip, rise 22 to 40 px and fall to the tab bar on a ballistic arc, stretched along their speed like the Goo tab's. Flight takes 70 + 17(√rise + √(rise + fall)) ms. They come down on the goo that is already on the bar, or 90% along a clean one. Each drop that lands is one more on the goo count, exactly like a drop from the Goo tab: no favourite is made. Taps less than 260 ms apart are ignored. Where no tab bar is on screen the drops land beside Goo and soak away in 200 ms. A drop in flight may cross a picture, as the drop from the heart does; it never rests on one.
- Goo is not focusable and has no label. It is a pointer-only toy and nothing in the app depends on it. With reduced motion there is no squash and no flight: the drops are added to the bar in place.

### States (landing, empty, error, offline)
One shape for every state that replaces content: **Goo, a headline, one sentence that says why, then the way out.** Centred, on the 16 inset.
- **The block:** Goo → 12 → headline (headline type, balanced) → 4 → the sentence (body, muted, at most 30 characters a line) → 16 → the action: one 44 button with 24 padding. A second, lesser way out is a quiet button 4 under it. Gold only for Sign in; every other action is tonal.
- **Empty states sit on the ground,** not in a card, starting 64 below the chips. They are the whole screen's answer. Play is hidden: there is nothing to play.
- **The landing** (Following, signed out) is the one card: a Panel (24 radius, 8 above and 24 below, padding 20 / 16 / 16) with Goo waving at 104, 12, "Follow the artists you love" in section type, 4, "See their new posts first, all in one feed." in muted body, 16, a full-width 44 gold "Sign in with e621". Under it a "Popular today" section header and a real feed whose posts carry Follow pills. The tab bar has no badge, and no goo until Goo is tapped. Play is hidden while the card is on screen and comes back with its usual motion once it has scrolled away (the mock uses 300 px of scroll).
- **Needs sign-in** (For You, Artists, Favorites): the block on the ground with Goo waving, gold "Sign in", quiet "Search instead".
- **An error sits in a panel** where the first post would be (24 radius, 16 from the sides, 24 padding above and below): Goo at 96 with the oops mood, the headline, a sentence that says whose fault it is, what e621 said in a well capsule the size of a tag (28 tall, mono 12, muted, 12 padding), 16, then a tonal "Try again" with an 18 refresh icon. **Asked to slow down** (429, or 503 with a wait) is the same panel with Goo snoozing, a sentence that counts down ("Trying again in 5 s."), and "Try now".
- **Offline** is not a state block. It is a banner under the header: a 36 tall Well capsule on the 16 inset, 12 above the content, padding 12 left and 16 right, an 18 muted wifi-off icon and Link Blue footnote-rounded text: "You're offline. Showing what's loaded." Sunk, because it tells you something and is not a button. When the connection returns it says "Back online" in white with the icon in Score Green for 2 s, then leaves.
- **Loading more failed** is one row at the end of the feed: muted body text on the left (16 in from the inset), a compact tonal "Try again" at the right, 24 below.

The words, as drawn:

| Where | Mood | Headline | Sentence | Way out |
|---|---|---|---|---|
| Landing | Wave | Follow the artists you love | See their new posts first, all in one feed. | Sign in with e621 (gold) |
| For You, signed out | Wave | For You learns from your favorites | Sign in and it picks posts from the tags and artists you favorite most. | Sign in (gold) · Search instead |
| Artists, signed out | Wave | Your artists live here | Sign in to follow artists and see who posted. † | Sign in (gold) · Search instead |
| Favorites, signed out | Wave | Your favorites live on e621 | Sign in to see them here. † | Sign in (gold) · Search instead |
| Search, no results | Look | No posts match | Two filters are on, and 3 posts are hidden by your blacklist. | Reset filters |
| Following, nothing yet | Snooze | No posts yet | None of the 42 artists you follow has posted since you joined. | Find more artists |
| For You, too few favorites | Look | For You needs a little more | A tag needs 3 favorites. Favorite a few more posts and it starts picking. | Search |
| First load failed | Oops | e621 didn't answer | Your feed is fine. The site is having a moment. | Try again |
| Asked to slow down | Snooze | e621 asked us to slow down | Trying again in 5 s. | Try now |

The sentence always names the cause in plain words and the numbers are real: how many filters, how many hidden, how many artists. † The headline is drawn; the sentence is proposed and the owner has not seen it. The same goes for "No posts match" with no filter on: the sentence drops the filter clause, and its action is not drawn (proposed: a tonal "Edit search" that puts the caret in the field).

### First run after sign-in
What Following shows the first time you sign in, before you follow anyone. Three screens in order; each is the Following tab, with the tab bar and no badge.

**1. The read.** The state block (see States) with Goo busy at 112, 64 below the header: "Finding artists you love", then what is happening now on two lines (the step, then its count and the time left in tabular figures: "Reading your favorites" / "640 of 1,284 · about 20 s"), then the checklist 16 below, then a quiet "Skip for now" 16 below that. No Play, no chips.
- **Checklist:** 248 wide, centred, left-aligned, rows 8 apart. Each row is a 28 well, 12, the step in body type, and a count at the right end in post-id mono once the step is done. Done: Score Green check (16, popping in like the heart) and Muted text. Running: a 14 spinner (2 px ring, 22% white with a white head, one turn in 0.8 s) and white text. To do: the step's number in Muted footnote-rounded and Muted text.
- **Steps, as drawn** (the wording is proposed; it follows the checklist For You already shows): "Read your favorites", "Count your artists", "See who still posts".
- **If it fails:** the error panel with Goo oops, "Couldn't read your favorites", "e621 didn't answer. Nothing was changed.", a tonal "Try again" and a quiet "Skip for now".

**2. Follow from favorites.** The list is the screen.
- **Header:** the large title with a quiet "Skip for now" at its right end (its words end on the 16 inset). 2 below, in Muted body: "You've favorited these artists a lot. Follow them?"
- **Group label,** 16 below: "Top 30" at the left; "Select all" and "None" at the right, Link Blue footnote-rounded, 28 tall.
- **Rows** in one Panel group, 60 tall: the artist's 36 mark, the name in headline, "you faved 48 · 312 posts" in Muted footnote, and a check well at the right end, 16 from the panel's edge. The whole row is the checkbox (`role="checkbox"`); it takes the row's wash while pressed (see "Under the pointer"). The top 10 start picked.
- **Check well:** a 28 round well, empty when the row is not picked. Picked: Score Green fill, a light top edge (`inset 0 1px 0 rgba(255,255,255,.35)`), and a Ground navy check (16, 3 stroke) that pops in. Green already means "on" (the switch) and "following" (the Following check). This is the app's only checkbox; do not use it where one switch would do.
- **The Follow button:** one gold 44 button on the 16 inset, full width, floating 112 from the bottom of the screen (16 above the tab bar's highest point) with Play's shadow. A heart and "Follow 10 artists"; the number follows the rows, and "artist" loses its s at one. It is the screen's one gold fill. With nothing picked it is the disabled button, "Pick artists to follow". Past e621's limit it is the disabled button, "e621 allows 500 follows (12 left)". Pressing it pops the heart, sends one bulk request, and the feed loads.
- The list scrolls under the button and the tab bar; leave 196 of room at its end so the last row clears both.

**3. After "Skip for now".** The list folds into one row above a real feed: a Panel group holding one list row, 8 below the header and 24 above "Popular today". A Heart Pink heart in the 32 icon well, "Follow from your favorites" in callout, "30 artists you favorite a lot" in Muted footnote, a chevron. It opens the list. It is a row you press, so it is raised chrome, not the sunk offline banner. Under it the landing's feed: the "Popular today" header, posts with Follow pills, and Play.

**No favorites at all:** the state block with Goo looking: "Find artists to follow", "You have no favorites yet, so there is nothing to suggest from.", a tonal "Search". The "Popular artists" list goes under it (see Artists, below).

### Toast
*Proposed 2026-11-26, not owner-approved. Drawn in `mocks/screens-v6.html`, "Artists, toasts and Popular artists".* The app's one way to say what just happened: a mark, the message, and at most one way back. **Owner-picked 2026-11-26:** the ring around Undo, and a toast that hugs its words ("Ring, hug"). The rest of this section is still proposed.
- **Body:** a floating capsule: Raised Highlight fill, the top light, the floating shadow (`0 12px 24px rgba(0,0,0,.4)`, the new-posts pill's and the tag targets'), no lip, because the toast itself is not a button. 44 tall with one line, 54 with two; radius 22 either way; 8 padding all round; 8 between its parts.
- **Mark,** 28 round, always there. About one artist: that artist's 28 mark. Otherwise a 28 well with a 16 icon in Link Blue. "Done" is the picked check well (Score Green, Ground navy check). A failure or a blacklist turns the icon Danger.
- **Message:** callout, white, one line, ellipsis. A second line, when there is one, is footnote in Link Blue (Muted is 3.8:1 on Raised Highlight, so it is not used here). 8 between the words and the toast's edge, 4 before Undo. A tag's name in a message is system 500 15/20 in its e621 colour.
- **Undo:** a sunk 28 capsule at the right end, footnote-rounded in white, 12 side padding, 8 from the toast's edge; its hit area reaches 44. A 1.5 Link Blue ring on its edge empties clockwise from the top left in the 6 s the toast stays (linear), and stops while the toast is hovered or holds focus.
- **Width and place:** it hugs its words, centred, and never passes the 16 insets. On a screen with Play it floats 168 from the bottom (12 above Play). With no Play it takes Play's place, 112 from the bottom (16 above the tab bar's highest point). One at a time: a new toast replaces the one showing.
- **Time:** 6 s with Undo or another action (`docs/path-a/UX.md`), 4 s without (proposed). The action slot holds "Undo" everywhere except the update toast, where it holds "Reload". `role="status"`.
- **Skipped artists:** two lines: "Following 8 artists", then "2 skipped: saffron hare, harbor seal". Past two names: "5 skipped: saffron hare, harbor seal and 3 more". With none skipped it is the one line, "Following 10 artists".
- **Copy, as drawn:** "Marked as seen on e621" (eye); "e621 allows 500 follows" (alert); "Couldn't follow dune jackal" / "e621 didn't answer. Nothing was changed." (alert, Danger); "Following dune jackal", "Unfollowed dune jackal", "Hidden from suggestions" (the artist's mark, Undo); "Blacklisted otter" (ban, Danger, Undo).

### Artists: Suggested, the sheet, the row menus, Popular artists
*Proposed 2026-11-26, not owner-approved. Same section of the mock.*
- **Suggested.** The 44 segmented control, then 16. When three or more artists stand out, the offer row leads: the row from "After Skip for now" ("Follow from your favorites" / "30 artists you favorite a lot"), 16 above the cards. Then one artist card per suggestion at full width, 16 apart, its line reading "You faved 23 of 140". On Suggested only, the card's header ends in a 36 ⋯ after Follow.
- **A suggestion's ⋯** opens the ⋯ sheet headed by the artist (36 mark, name in headline, the raw e621 name in mono): "Not interested" (eye-off), "Open on e621". Not interested hides the artist and shows the toast "Hidden from suggestions" with Undo.
- **Suggested, reading:** the read block from the first run (Goo busy, "Finding artists you love", the checklist) with no "Skip for now". **Too few favorites:** Goo looking, "Not enough favorites yet", "Suggestions come from the artists you favorite. Favorite a few more posts, or look for artists yourself.", a tonal "Search".
- **Follow from favorites, as a sheet** (from the offer row). A tall sheet whose top edge is 76 from the top of the screen: the grabber, the title row "Follow from favorites" with the close well (it replaces "Skip for now"), "You've favorited these artists a lot." in Muted body, then 12, the label row ("Top 30"; "Select all", "None", whose words end on the 16 inset), then the rows. Rows are sheet rows (no side padding of their own), 60 tall, divided from 48, with the same check well. The list scrolls inside the sheet and fades out over its last 24. The gold 44 button sits at the sheet's foot, 37 from the bottom of the screen, with its count and its two disabled states. No tab bar, no Play.
- **Following: a row's ⋯** opens the ⋯ sheet headed by the artist: "Share artist", "Open on e621" (with "e621.net" at the right), "Unfollow" (a minus; not Danger, which stays for Blacklist and failures; the toast "Unfollowed cedar lynx" offers Undo).
- **Sort** (the Recent chip): the Menu as a dropdown under the chip: Recent, A–Z, Most faved.
- **Filter your artists:** the field takes the gold ring and a clear well; the list narrows as you type; the foot line counts ("1 of 42"). With no match the list is one Muted footnote line: No artist you follow matches "zz".
- **Popular artists** (Following, signed in, no favorites). The state block with Goo looking at 96, 16 below the header ("Find artists to follow", its sentence, a tonal "Search"), then 24, the section header "Popular artists", and one Panel group of 60 rows: the 36 mark, the name in headline, "18.2k posts" in Muted footnote with tabular figures, and the feed's Follow pill, 16 from the panel's edge like everything that ends a row. Under it, in Muted footnote: "The artists with the most posts on e621". Following one swaps the pill for "Following" in place and shows the toast, 112 from the bottom.

### Links, the grid tile's menu, the artist page's edges
*Proposed 2026-11-26, not owner-approved. Drawn in `mocks/screens-v6.html`, "Links, the grid menu and the artist page's edges".*
- **"From a link" chip.** First in the chips row on Results opened from a link: a 16 link glyph in Link Blue, "From a link", the chevron. It is on, so it wears the gold ring like any filter that is on. It drops a panel under itself like every chip with an arrow (343 wide; before 2026-11-26 a titled sheet): "This link came with its own settings." in Muted body, then sheet rows of name (callout) and value (Muted footnote) for what the link set (Ratings, Media, Sort, Date, Score, Slideshow), then "For this visit only. Nothing of yours is changed." in Muted footnote (8 above, 16 below), then a tonal 44 "Use my settings" at full width. Pressing it drops the chip and applies your own filters.
- **Not signed in on this browser** (a link visit with no saved account). On Results: the sunk banner grown to two lines, 16 from each side under the chips: min 52 tall, radius 22, padding 8 / 8 / 8 / 12, an 18 info glyph, "Not signed in on this browser" in white footnote-rounded over "Your blacklist isn't applied" in Link Blue footnote, and a tonal 36 "Sign in" with a 2 lip at the right end. Over the player for its first 4 s: the same shape in the player's glass (`rgba(2,15,35,.55)`, 12 blur, the 1 px light ring), white text, the second line at 78% white, and "Sign in" as a 36 capsule of 16% white. Signing in pauses the show; it carries on after.
- **Holding a grid tile.** After 400 ms the tile's picture sinks to 96% (120 ms ease-out) and the ⋯ sheet rises, headed by the post's artist (36 mark, name in headline) and its number in mono. Rows: "Favorite" (heart), "Open artist", "Play from here", "Open on e621" ("e621.net" at the right). On a post you have favorited the first row reads "Unfavorite" and its heart is filled Heart Pink. No callout, no selection.
- **No such artist** (`/artist/<name>` that e621 does not know). Back in the header, then the empty state with Goo looking: No artist called "inkwel fox" / "e621 has no tag with this name. Check the spelling, or search for it." / a tonal "Search". No hero, no chips, no Play.
- **A tag that is not an artist.** The hero keeps its shape. In place of the mark: an 80 round well with a 36 tag glyph in Link Blue. The name in the large title in its e621 category colour; under it the raw name and the category in mono ("red_fox · species"); the three stat wells; the wide button reads "Follow tag".
- **At 500 follows.** The wide button is the disabled button reading "e621 allows 500 follows"; 8 below it, centred in Muted footnote: "Unfollow an artist in Artists to follow another."
- **Share and ⋯.** Share opens the system share sheet with the page's link. Where there is none, the link is copied and the toast "Link copied" (link glyph) shows. ⋯ opens the ⋯ sheet headed by the artist: "Copy link", "Open on e621". Results' ⋯ is the same sheet with "Copy share link".
- **Your favorites.** A pushed screen like Tune: Back and a tools capsule holding only Grid view in the top row, the large title "Your favorites" under it, then the chips Media, Sort, Score.

### Settings: Account, Content, For You, App
*Proposed 2026-11-26, not owner-approved. Drawn in `mocks/screens-v6.html`, "Settings: Account, Content, For You, App".* Each is a pushed screen like Slideshow: Back in the top row, the large title under it, the first group 16 below, groups 16 apart. A note under a group is Muted footnote, 8 below the group, indented 16 to line up with the rows' text.
- **Account.** A flat group with the account row (56 mark, name in headline, "Signed in to e621 · 42 follows"; not a button here). A group with "Your favorites" (Heart Pink heart in the well, "1,284 posts", chevron). A group with the switch "Sign-in links" / "Links can sign in as you", off by default; under it the warning, with a 16 alert glyph in Danger: "Anyone with such a link can use your e621 account until you make a new API key. Leave this off unless the link is for you." A group with "API key" / "Saved on this device" and the value "Change" (opens the sign-in sheet). Last, 8 further down, a tonal 44 "Sign out" at full width with a glyph; not Danger. **Signed out:** the state block with Goo waving at 96: "Not signed in" / "Sign in to follow artists, favorite posts and use your blacklist." / a gold "Sign in with e621".
- **Content.** Label "Ratings", then a group of three switch rows: Safe, Questionable, Explicit. The icon well holds the rating's letter in rounded 600 15/20: S in Score Green, Q in Rating Yellow, E in Danger. The last switch that is on cannot be turned off; the toast "Keep at least one rating on" says why. Label "Blacklist" with the line count at the right ("3 lines"). Then a row of a field ("Tags to hide") and a tonal 44 "Add" with a plus, 8 apart. Then a flat group, one row per line: the tags in system 500 15/20 in General blue, joined with a Muted " · ", a minus tag in Muted, and a 28 remove well at the right end. Under it: A post is hidden when it has every tag on a line. A minus means "but not with". Then a group: the switch "Use my e621 blacklist" / "Synced with your account", and "e621's default list" / "For new e621 accounts" with a tonal "Import".
- **For You.** A group with "Tune" / "Breadth, pinned and muted tags". Label "Hidden artists" with the count. A group of 60 rows: the mark, the name in headline, when it was hidden ("Hidden 2 days ago"), and a tonal "Show". Under it: "They do not show in suggestions. Their posts still show if you follow them or search." With none: the label and one line, None. "Not interested" on a suggestion puts an artist here.
- **App.** A group with "Install the app" / "Add it to your home screen" (opens the steps); under it: "Links you open will still go to Safari, not the installed app, and the two keep separate sign-ins." In the installed app the row is not a button: a Score Green check in the well, "Installed" / "You are using the installed app". A group with "e621 button" / "Adds a Slideshow button to e621" and "Keyboard shortcuts" / "On a computer". Label "About", a flat group: "Version" with its number, "What's new", "Source code" (an external-link glyph); under it: "Not run by e621. It reads e621 with your own account and key."
- **Keyboard shortcuts** is a titled sheet (a dialog on a computer): sheet rows with the action in callout and its keys at the right end in 28 key wells (Well fill, sunk, radius 8, mono 13/18, 4 apart): J K, L, Enter, G, /, Esc.

### Install, update and the app icon
*Proposed 2026-11-26, not owner-approved. Drawn in `mocks/screens-v6.html`, "Install, update and the app icon".* Nothing new was made for these: a titled sheet, the checklist's number wells, the toast, the app mark.
- **Install steps (iPhone and iPad).** "Install the app" in Settings › App opens a titled sheet, "Install the app". Under the title, body in Link Blue: "Slideshow on your home screen, full screen, without the browser's bars." 16 below, a numbered list, rows 12 apart: the first-run checklist's 28 number well, the step in body with its key words in 600, and at the right end the 20 glyph to look for, in Link Blue. 1 "Tap Share" (under it in Muted footnote: "In Safari it can be under •••"; the share glyph). 2 "Choose Add to Home Screen" (a plus in a rounded square). 3 "Tap Add". 16 below, Muted footnote: "The installed app keeps its own sign-in, so you sign in once more there." No button: the app cannot do these taps for you.
- **Where the browser can install by itself** (Android; Chrome and Edge on a computer): no sheet. The row is not a button; it ends in a tonal 36 "Install", which opens the browser's own dialog. The browser's own pop-up offer is held back, so this row is the only way in.
- **Inside another app's browser** (a link opened in a chat or social app on an iPhone): the same sheet with one paragraph, "This browser cannot install apps. Open the page in Safari, then come back to Settings.", and 16 below a tonal 44 "Copy link" at full width. Where nothing can install (Firefox on a computer) the row is left out. Safari on a Mac gets the steps sheet with two steps, "Open the File menu" and "Choose Add to Dock" (not drawn).
- **Nothing asks you to install.** Drawn as an option, and not to be built until the owner says yes: one row at the top of Settings, "Install the app" / "Full screen, on your home screen", ending in a 28 close well. It stays until you install or close it and never shows in a feed.
- **A new version.** When one has downloaded: the toast "New version ready", a refresh glyph in its mark, "Reload" in the action slot where Undo sits. It follows the toast's rules: 6 s with the ring. It shows once per version and only on a feed or list at rest: never over the player, a sheet, the keyboard or the first-run read; it waits for the next such moment. If it passes, Settings › App's row reads "Version" / "2.1 is ready" and ends in a tonal 36 "Reload" with a refresh glyph. A cold start runs the new version without asking. After a reload: the toast "Updated to 2.1", the green check, 4 s.
- **The app icon (owner, 2026-11-26: "some kinda in-theme icon where we have a similar hexagon but with an inset play icon"; colouring owner-picked, "Gold"; the measurements are mine).** The app's gold Play button as a hexagon, with Play sunk into it, on a navy square. It replaces the kaleidoscope. Inside the app the mark is the same hexagon drawn without a lip (see "Artist marks and the app mark"). It is not e621's logo: no letter, no number, no ears. Source files: `docs/path-a/icons/app-icon.svg`, `app-icon-tab.svg`, `app-icon-mono.svg`. All sizes below are a share of the icon's width (the 180 px iPhone icon in brackets).
  - **Ground:** a full square, a straight top-to-bottom gradient from Panel Navy (#152F56) to Ground (#020F23). No rounding and no clear pixels in the file; the phone cuts the shape.
  - **Hexagon:** point up, 62% tall point to point and 53.7% wide (112 by 97), corners rounded 6.2% (11). Face: Gold (#E8C446). Top light: white at 55%, 0.8% thick (1.5), along the upper edges. Lip: #A8871F, 3.75% (7) under the face. Shadow on the ground: black at 50%, blurred 3.5%, 9.25% below the face. The face and its lip together are centred, so the face sits 2.4% above the middle.
  - **Play:** a triangle that points right, 21.9% wide and 25.2% tall (39 by 45), corners rounded 2.6% (5), moved 1.1% (2) to the right so it looks centred. It is a well: Well Navy (#0A1D3B), a darker band (#030B1A) 2% deep along its upper edges, and a light edge (white at 45%, 0.8%) under its lower edges.
  - **Fits:** everything stays inside 80% of the half-width, Android's safe circle, so one drawing serves iPhone (180), Android (192 and 512, "any" and "maskable") and the launch screen.
  - **Tab icon (32 and 16):** the same square with a 22% corner radius; the hexagon is 80% tall, flat (no lip, no shadow, no lights); Play is flat Well Navy.
  - **One colour** (Android's themed icons): the hexagon in white, 70% tall, with Play cut out, on a clear ground.
  - Goo is never the icon.
- **Names and colours.** Name "e621 Slideshow"; short name "Slideshow", which fits under an iPhone icon without being cut. The launch background and the browser's bar colour are Ground.

### On a computer (900 px and wider)
*Proposed 2026-11-26, not owner-approved. Drawn in `mocks/screens-v6.html`, "On a computer (900 px and wider)", as 1280 by 800 windows.* The same screens with the tab bar stood on its side. Nothing new was made: the sidebar is the app's panel with the tab bar's sliding capsule; a popover and a dialog are the phone's sheet; Post info is that sheet standing beside the picture. Under 900 it is the phone layout.
- **Sidebar.** A floating panel (Panel Navy, the top light, 24 radius), 232 wide, 8 from the window's top, left and bottom, 12 padding. Top: the 36 app mark and "Slideshow" in rounded 600 20/25, 12 apart, in a 52 row. 8 below: the four tabs, rows 44 tall and 4 apart: a 22 icon, 12, then the name in rounded 500 15/20, Link Blue. The current tab is Gold (icon stroke 2.4) on the tab bar's raised capsule (Raised Highlight, the top light), which slides to the picked row with the tab bar's spring. Following's count is a 20 gold badge at the row's right end; it hides while Following is current. 12 below the tabs: Search, a 44 sunk field with an 18 glyph, "Search", and the "/" key in a key well at its right end; it opens the Search screen. At the bottom: the account, its 36 mark, the name in headline and "42 follows" in Muted footnote; it opens Settings at Account.
- **900 to 1099:** the panel is 68 wide and shows icons only: the mark, four 44 round tabs, a 44 round Search well, the account's mark. Names show as tooltips. Following's badge sits on its icon's corner (16, as on the tab bar).
- **Content** is everything right of the sidebar (from 248; from 84 beside the narrow panel), with 18 above the title. Feeds and list screens (Following, For You, Artists, Search, Settings, pushed screens) are a 600 column centred in it; the title, chips and panels all start on the column's edge. A grid's tiles use the full width with 24 at each side, while its head stays in the 600 column (see "One head" in the next section): as many columns as fit at 176 or wider, 8 between columns and 12 between rows as on the phone. The header's search button is left out, because Search is in the sidebar.
- **Play** is the same 56 gold disc with its count, at the content's bottom left: 24 from the sidebar, 24 from the bottom. On a feed that is beside the column, off the pictures. On a grid it floats over the tiles as on the phone, and the grid keeps 104 bottom padding. Toasts and the new-posts pill centre on the column; a toast floats 24 from the bottom.
- **Tall pictures** in the feed are never taller than the window less 160 (not drawn). A capped picture is shown whole, centred on Well: the phone's rule with a different cap.
- **Popover.** A sheet opened from something on screen (a chip, a ⋯, a grid tile, a held tag, the sort and date menus) is that sheet as a popover: the sheet's panel with 24 radius all round, 16 padding, the floating shadow, 300 wide; no grab handle, no ✕, no dim. It opens 8 below what opened it with left edges lined up (right edges when it would leave the window). Click away or Esc closes it.
- **Dialog.** A titled sheet with a job of its own (Quick settings, Keyboard shortcuts, sign-in, the install steps, Follow from favorites) is that sheet as a dialog: centred in the window, 420 wide, 24 radius, 16 padding, the floating shadow, its title row and ✕, over the sheet's dim, which covers the sidebar too. Esc closes it.
- **A grid tile's menu** opens on right-click or the keyboard's menu key, as a popover at the pointer. No button appears on a tile under the pointer: nothing sits on top of art.
- **Player.** The sidebar leaves and the window is black. ✕ is 16 from the top left; the count and a 44 glass full-screen button are 16 from the top right, 12 apart. At the bottom, 24 from the sides and 20 from the bottom: the progress bar, and 12 under it one row: the artist at the left, the transport in the middle (44 glass Previous and Next round a 56 gold Play), then Favorite, Post info, Slideshow settings and Share at the right, 12 apart. **Post info** is a panel, not a sheet: 360 wide, 8 from the window's top, right and bottom, 24 radius, 16 padding, the sheet's content as it is. While it is open the picture is centred in the space left of it (the window less 376); the shades and the controls end there too; the Post info button wears the gold ring. Its ✕ closes it.
- **Settings** is one page in the 600 column: each sub-page's groups under its name (rounded 600 20/25, 16 in from the column's edge), in the order Account, Content, Slideshow, For You, App. Group labels inside a section stay as on the phone. Sign out is a tonal 36 button on the account row.
- **Pointer.** Replaced by "Under the pointer" in the next section. Focus is the gold ring; the card reached with J or K wears it round its panel.
- **Not designed:** the goo and the secret tab on a computer. The sidebar is drawn clean.

### The top bar, the pointer, grid loading, one head, chip dropdowns
*Written 2026-11-26. Drawn in `mocks/screens-v6.html`: "The top bar after you scroll", "Under the pointer (hover)", "Grid loading", "The head stays one size", "A chip drops its panel under itself". Each part says whether the owner picked it.*

**Top bar (owner-picked 2026-11-26, "Capsule").** Once the title has scrolled away the bar is a floating capsule, the tab bar's sibling, the same on a phone and on a computer. It replaces the edge-to-edge glass band.
- **Shape:** 52 tall, 26 radius, Raised, the top light, the floating shadow (0 12 24, black 40%).
- **Phone:** 16 from the sides (the tab bar's width, 8 narrower than a post on each side), 4 under the 47 status area.
- **Computer:** 584 wide, centred on the 600 column, 8 from the top of the window (level with the sidebar). It does not move when the grid goes wide.
- **On a tab:** the title in headline 20 from the left end, 12, the count in Gold footnote-rounded, then the tool buttons bare (no capsule of their own), the last one 4 from the right end.
- **On an artist page:** bare Back 4 from the left end, the 24 mark, 8, the name in headline (ellipsis), the 36 Follow pill 8 from the right end.
- **Behind it** the page fades to Ground: solid for the first 40, 80% at 64, clear at 128 (on a computer: 86% at the top, clear at 84). The fade arrives and leaves with the capsule.
- **When:** unchanged. After 64 px of scroll on a tab; once the hero has gone (about 196 px) on an artist page.
- **Motion:** fades in and drops 8 over 150 ms, ease-out. With reduced motion it only fades.

**Under the pointer.** *Owner-approved 2026-11-26: the rise for buttons with a lip was picked first ("Lift"), then the rest of this pass was approved ("Approve both").* The shape of a row's wash was then picked again ("Inset"). Only where the device has a mouse or trackpad (`hover: hover` and `pointer: fine`), never after a tap. 100 ms, ease-out. Focus is still the gold ring. A disabled control does not react. This replaces the "Pointer" rule of "On a computer".

| Made of | Which | Under the pointer |
|---|---|---|
| A lip | Tonal and gold buttons, Play, Follow, the heart, the stepper, the player's Play | Rises 1 px and the lip grows by 1. No colour change. Play's shadow on the page grows by 1 too. |
| Raised, no lip | Chips that are off, the round Back, an artist's mark in a post header, a field's clear button | One step lighter: Panel to Raised, Raised to Raised Highlight. |
| An icon or words with no body | The tools capsule's buttons, a post's ⋯, bare Back, "Skip for now", links | White at 6% and the icon or words turn white. In the tools capsule the wash is 40 by 36, which leaves 4 to the capsule on every side. A ⋯ gets its 36 disc. A link only turns white. |
| A well | ✕, the remove well, tags, Undo, the Search field | White at 6% over the well; an icon turns white. A tag keeps its e621 colour. "+N" gets a brighter outline (Link Blue at 32%). |
| A row | List rows, sheet rows, the sidebar's tabs and account | **Owner-picked 2026-11-26, "Inset".** White at 5%, as a rounded shape that floats 4 inside the row on every side. **Its corner radius is the container's radius less the gap between the two** (owner: "make sure the corner radius matches the outer container as well"), so the curves run parallel: 20 in a panel (24 − 4), 12 in a well (16 − 4), 16 on a sheet or a dropdown, where the wash is 8 wider than the row's content on each side (24 − 8). The divider above the row and the one below it fade out with it. A press on a phone uses the same shapes. The sidebar's account row is 12 (24 − 12). A sidebar tab keeps the capsule shape; its icon and name turn white. |
| One of several | Menu rows, a segmented control's parts, the tab bar's tabs | The words turn white. No wash. |
| Glass | The player's round buttons | The rim goes from 16% to 32% white. |
| Pictures | Art in a post, grid tiles, artist cards | Nothing; the pointer becomes a hand. |

**Grid loading (owner-approved 2026-11-26, "Approve both").** A skeleton tile is the tile's shapes as wells with the skeleton shimmer: the square with the art's 16 radius, and two bars 10 tall where the score and the favorites go (22 to 34 wide, varying by tile), in the 18 number line. First load: the title, tools and chips are real at once, and twelve skeleton tiles fill the first screen on a phone (on a computer, three full rows). Loading more: one row of skeleton tiles after the last real row. Skeleton tiles take no press and carry no dot or play mark.

**One head (owner's rule 2026-11-26: "keep the area above the grid/scroll views consistently sized"; the drawing is owner-approved 2026-11-26, "Approve").** On a computer the head of a screen (the title row with Back and the tools, the title or the artist's hero with its stats and Follow, the line under the title, the chips) is always in the 600 column, in feed view and in grid view. Only the tiles use the full width (24 at each side). Nothing in the head moves when the view is switched. This replaces "a grid uses the full width" for the head.

**Chip dropdown (owner-picked 2026-11-26: "Dropdown", on a phone and on a computer; the measurements are mine).** A chip with ⌄ drops its panel under itself: 8 below the chip, left edges lined up (right edges when it would leave the window; on a phone kept inside the 16 inset). No title, no ✕, no Done, no dim: the chip is the title, a change applies at once, a tap or click outside or Esc closes it. While it is open the chip's arrow points up, and a chip that is off is Raised. This replaces the titled sheet for every chip, and the "Popover" rule of "On a computer" where a chip is the opener.
- **More than one can be on** (Media): the sheet's Panel with 24 radius, 4 above and below, 16 at the sides, the floating shadow, 260 wide; the switch rows inside.
- **One of a list** (Sort, Date, Score, the Artists sort): the Menu with its sliding capsule on Panel in place of the Well: 26 radius, 4 padding, 220 wide. Date with Custom open is 343 wide.
- **Custom…** keeps the menu open and adds its controls under the rows; "Apply" is tonal.
- **"From a link":** the same Panel dropdown, 343 wide, holding the line, the six rows, the note and the tonal "Use my settings".

### Not drawn yet
The goo and the secret tab on a computer. Search, Artists and the artist page on a computer have no drawing of their own; they follow "On a computer": the 600 column, and the full width for a grid. Build them from UX.md with the parts above, and show the owner before they ship.

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
| Top bar capsule | 150 ms ease-out, past 64 px of scroll | opacity, and an 8 px drop (none with reduced motion) | mock |
| Tuck | scroll-driven | card scale 95% ↔ 100%, 16 px rise, opacity 55% ↔ 100% | mock |
| Skeleton shimmer | 1.4 s ease-in-out, looping | a light band crossing each well shape | mock |
| Caught-up | once, on entering view | app mark pops: scale 92% to 100%, 360 ms `cubic-bezier(.3,1.35,.5,1)` | spec (proposed; not in mock) |
| Segmented capsule | 360 ms `cubic-bezier(.3,1.35,.5,1)`; label colour 200 ms | translateX to the chosen segment | mock |
| Menu capsule | 360 ms `cubic-bezier(.3,1.35,.5,1)`; label colour 200 ms | translateY to the chosen row | mock |
| Switch | knob 300 ms `cubic-bezier(.3,1.35,.5,1)`; track colour 200 ms | knob translateX 20 px | mock |
| Glass, back and toggle press | 100 ms ease-out | scale to .94 | mock |
| Hero follow dots | 520 ms | six 7 px dots from the 80 mark's rim | mock |
| Player heart | 320 ms `cubic-bezier(.2,.9,.3,1.4)` | the favourite pop, on the glass heart | mock |
| Field caret | 1.1 s, stepped | caret opacity | mock |
| Tag targets pop | 320 ms `cubic-bezier(.3,1.35,.5,1)`, each 40 ms after the last | from 60% scale and 10 px lower, fading in | mock |
| Tag target under the finger | 120 ms ease-out | scale to 1.06, ring | mock |
| Goo's wave | 900 ms ease-in-out, three times, 400 ms after it appears | the arm turns 16° about its shoulder; two ticks fade in and out | mock |
| Goo's squash | 100 ms ease-out down; 420 ms back | 107% × 90% about its base under the finger; back through 94% × 109% and 103% × 97% | mock |
| Goo's spurt | 120 ms after the tap; 1 to 3 drops 70 ms apart, each 70 + 17(√rise + √(rise + fall)) ms | drops rise 22 to 40 px from the tip, then fall to the tab bar, stretched along their speed | mock |
| Goo busy | 3.2 s looping glance; dots 1.2 s, 0.2 s apart | the face slides 3.5 left and right with a hold at each end; three dots light up in turn | mock |
| Checklist | spinner 0.8 s a turn; check 320 ms pop | the running step spins; a finished step's check pops in like the heart | mock |
| Check well | 150 ms ease-out fill; check 320 ms pop | the well turns Score Green and its check pops in | mock |
| Goo's snooze | 3.2 s ease-in-out, looping | the "z" drift 2 px right and 3 px up, to 60% | mock |
| Slow-down count | once a second | the number in the sentence | mock |
| New-posts pill | slides in under the header; posts insert with a slide-down, keeping the reading position | translateY, opacity | spec (not in mock) |
| Tab content | 120 ms fade | content opacity | spec (not in mock) |
| Push / Back | 150 ms cross-fade + 8 px rise; gesture back never animates | opacity, translateY | spec (not in mock) |
| Player open / close | 200 ms fade-up from the card / fade out | opacity, translateY | spec (not in mock) |
| Player controls | auto-hide after 2.5 s playing; stay while paused or focused; 250 ms double-tap guard | opacity | spec (not in mock) |
| Sheets | spring up; drag to dismiss with rubber-banding | translateY | spec (not in mock) |
| Pull to refresh | indicator follows at half the finger; 144 px travel arms; spinner holds at 48 px for at least 400 ms | translateY | spec (not in mock) |
| Toast in / out | in: 320 ms `cubic-bezier(.3,1.35,.5,1)`, rises 12 px and fades in; out: 200 ms ease-in, drops 8 px and fades. Stays 6 s with Undo, 4 s without; `role="status"` | opacity, translateY | mock (proposed) |
| Sidebar capsule | 500 ms · cubic-bezier(.3,1.35,.5,1), the tab bar's | translateY | mock (proposed) |
| Undo ring | empties clockwise in 6 s, linear; paused on hover or focus | stroke-dashoffset | mock (proposed) |

Grammar: two speeds. **Touch feedback** is 100 to 200 ms, ease-out, no overshoot (press, hide, fade). **Celebrations** (favourite, follow, tab change) overshoot once and are done within 720 ms. **Goo** is the one slow thing. Everything animates transform and opacity only, except the goo's shapes.
**Reduced motion:** no pop, wiggle, spin, hop, dots, drip, flying drops, Tuck or shimmer; the lip, the tab, segmented and menu capsules, the switch knob and Play move instantly; tag targets appear without the pop; a toast appears and leaves without moving and its Undo ring holds still; Goo holds still, and a tap adds its drops to the bar in place; the checklist's spinner stands still and checks appear without the pop; the caret does not blink; the tab bar's goo still shows and updates in place, because it is state, not motion. Per UX.md §7: feeds don't autoplay video; the player defaults to Classic with no transition.

## Build rulings (where the mock leaves a gap)

The two v6 mocks are approved; these rulings win over them when building.

1. **Caught-up title is white**, not gold. Gold stays: main action, "New", current tab.
2. **Lip:** 3 by default, 4 on Play and the player's Play / Pause, 2 on Follow pills and stepper buttons. Every raised control has one; "Wipe clean" (drawn flat in the feed mock, raised in the screens mock) is a compact tonal button and gets the 3 lip.
3. **The lip is always a darker shade of the current fill:** the favourited (plum) pill gets #291A35, not navy.
4. **One quiet outline:** `rgba(180,199,217,.22)` at 1.5 px for both "Following" and the "+N" tag (the mock draws the tag at .18).
5. **15 px Fredoka is always 15 / 20**, at 600 for counts and actions and 500 for chip labels.
6. **One-off sizes are named component constants**, not steps: Play 56, tab bar tube 64 with 54 tabs, bend 10, glass play disc 56, sheet row 52, artist card 296, collage 164, double-tap heart 88, account row 72, player Play 62, artist hero mark 80, style preview 76 × 100, switch 51 × 31, slider thumb 28 on a 12 track, menu track radius 26.
7. **Fredoka is self-hosted** (`next/font`), weights 500 and 600 only, never Google Fonts at runtime.
8. **`tag-artist` (#F2AC08) stays** for artist-category tags in tag lists and in Post info's "Artists" group (shown only when a post has more than one); posts don't show the artist tag.
9. **The goo count** is local to the device and survives reloads (the mock keeps it in `localStorage`); wiping it is a Settings action only. There is no clean button on the tab bar.
10. **Goo is one inline SVG component** with a `mood` prop and one shared filter in the page. Do not export it as bitmaps and do not redraw it by hand: the filter is what makes it goo. The numbers in a state's sentence are real counts, never placeholders.
11. **Nothing in the mock is real art.** Placeholder colour fields only, in the mock and in anything committed.

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
- **Don't** put a lip on panels, rows, fields, tags, chips, toggles, menus, tabs, tag targets or anything over art, and don't add blurred shadows beyond Play (and the Follow button that stands in its place), the new-posts pill, tag targets and the tab bar. Don't give an offline banner or a state's panel a lip either.
- **Don't** use Fredoka at 700, or for tags and reading text.
- **Don't** use a second accent colour, meaning colours as large fills, gold in an artist's mark, or a second gold fill on a screen (the artist page has no "Play all").
- **Don't** put muted text on Raised Highlight (3.7:1).
- **Don't** let goo touch a picture, hide a label, or be cleaned anywhere but Settings, and don't put Goo the mascot anywhere but the landing, needs sign-in, empty states, errors and the first read of your favorites.
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
