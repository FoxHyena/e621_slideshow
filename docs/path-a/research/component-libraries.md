# Component libraries and design systems: what to copy

Research date: 2026-11-25. Stack: React 19.2, Next 16, Tailwind 4, lucide-react, client-only, phone-first, dark by default.

**Confidence legend.** [src] = read from the library's source or token files on GitHub today. [docs] = read from official docs today. [known] = widely documented platform default I did not re-fetch this session (UIKit and similar). [unverified] = from memory or third-party pages; confirm before relying on it.

Contents: 1 per-library findings, 2 comparison tables, 3 token recommendation, 4 per-component anatomy sources, 5 dependency advice and maintenance, 6 gaps.

---

## 1. Per-library findings

### Radix Themes (+ Primitives)
Sources: [button.css](https://github.com/radix-ui/themes/blob/main/packages/radix-ui-themes/src/components/_internal/base-button.css), [space.css](https://github.com/radix-ui/themes/blob/main/packages/radix-ui-themes/src/styles/tokens/space.css), [radius.css](https://github.com/radix-ui/themes/blob/main/packages/radix-ui-themes/src/styles/tokens/radius.css), [avatar.css](https://github.com/radix-ui/themes/blob/main/packages/radix-ui-themes/src/components/avatar.css), [segmented-control.css](https://github.com/radix-ui/themes/blob/main/packages/radix-ui-themes/src/components/segmented-control.css). All [src].

**Spacing** (every value is multiplied by `--scaling`, which is 0.9 to 1.1): space-1..9 = 4, 8, 12, 16, 24, 32, 40, 48, 64 px.

**Control size scale, 1..4.** The height is a space token, so one scale drives everything:

| Size | Height | Font / line | Padding-x | Gap | Radius token |
|---|---|---|---|---|---|
| 1 | 24 (space-5) | 12 / 16 | 8 | 4 | radius-1 (3px base) |
| 2 | 32 (space-6) | 14 / 20 | 12 | 8 | radius-2 (4) |
| 3 | 40 (space-7) | 16 / 24 | 16 | 12 | radius-3 (6) |
| 4 | 48 (space-8) | 18 / 26 | 24 | 12 | radius-4 (8) |

- **IconButton:** square, width = height = the button height (24/32/40/48). Ghost icon buttons get negative margin so the icon aligns optically with neighbouring text.
- **Segmented control:** height 24/32/40 for sizes 1-3. Radius is 4/4/6, scaled by the radius factor. The thumb is `radius - 1px`, so the inner radius stays concentric with the outer one.
- **Avatar:** sizes 1..9 = 24, 32, 40, 48, 64, 80, 96, 128, 160. The radius is `max(var(--radius-N), var(--radius-full))`, with N = 2, 2, 3, 3, 4, 5, 5, 6, 6. Initials font size is about size / 2.5.
- **Badge:** size 1 is 12/16 text with padding 2 x 6 (`space-1 * 0.5` by `space-1 * 1.5`). Size 2 is 12/16 with padding 4 x 8.
- **Type scale 1..9:** 12, 14, 16, 18, 20, 24, 28, 35, 60 px. Line heights are 16, 20, 24, 26, 28, 30, 36, 40, 60. Headings use tighter line heights: 16, 18, 22, 24, 26, 30, 36, 40, 60.
- **Radius scale 1..6:** 3, 4, 6, 8, 12, 16 px, each multiplied by `--radius-factor`.

**The pattern to copy: the radius factor.** `data-radius` sets one factor and the whole scale follows:

| `data-radius` | `--radius-factor` | `--radius-full` |
|---|---|---|
| none | 0 | 0 |
| small | 0.75 | 0 |
| medium | 1 | 0 |
| large | 1.5 | 0 |
| full | 1.5 | 9999px |

- Components use `max(var(--radius-N), var(--radius-full))`, so "full" turns every control into a pill without touching component code.
- `--radius-thumb` is a separate knob for sliders and switches.
- The control radius steps up with control size, so a small button is not as round as a large one.

**Colour.** 12-step scales per hue plus a gray, with an alpha twin. Steps 1-2 are backgrounds, 3-5 are component backgrounds (normal, hover, active), 6-8 are borders, 9-10 are solid fills, and 11-12 are text. Dark mode is a `.dark` class that swaps the whole scale. Light and dark are tuned separately, not inverted. The grays pair with an accent: gray is tinted (sage, olive, sand, slate, and so on) to match the accent.

**Primitives.** The unified `radix-ui` package (1.8.1, Oct 2026) is the headless layer: Popover, DropdownMenu, Dialog, Tabs, ToggleGroup, Avatar, Toast, ScrollArea, Tooltip. The accessibility behaviour is mature, but the pace is slow. A new Themes release (3.3.0) landed Jan 2026 and the last push was Apr 2026. Themes is a CSS-in-package approach (a 4.9 MB unpacked stylesheet and components). It fights Tailwind 4 more than it helps.

### shadcn/ui
Sources: [button.tsx](https://github.com/shadcn-ui/ui/blob/main/apps/v4/registry/new-york-v4/ui/button.tsx), [avatar.tsx](https://github.com/shadcn-ui/ui/blob/main/apps/v4/registry/new-york-v4/ui/avatar.tsx), [globals.css](https://github.com/shadcn-ui/ui/blob/main/apps/v4/app/globals.css). [src].

- **Buttons:** xs 24, sm 32, default 36, lg 40. Icon buttons: icon-xs 24, icon-sm 32, icon 36, icon-lg 40. Icon size is 16 (12 on xs). Padding-x is 8, 12, 16, 24 (the `has-[>svg]` rule trims the side that holds an icon). Radius is `rounded-md` throughout, which is a poor fit for touch. Focus ring is `ring-[3px] ring-ring/50`.
- **Avatar:** sm 24, default 32, lg 40, always `rounded-full`. Avatar groups use `ring-2 ring-background` to separate overlaps. A status badge sits at 8, 10 and 12 px.
- **Badge:** pill, `px-2 py-0.5 text-xs`, icon 12.
- **Radius:** one root `--radius: 0.625rem` (10px) and a derived scale `sm 0.6 / md 0.8 / lg 1 / xl 1.4 / 2xl 1.8 / 3xl 2.2 / 4xl 2.6` times the root. That is the same idea as the Radix factor, in a single variable.
- **Colour:** semantic tokens (background, foreground, card, popover, primary, muted, muted-foreground, border, ring and others) in OKLCH. Dark is `.dark`: background `oklch(0.145 0 0)`, card `oklch(0.205 0 0)`, muted `oklch(0.269 0 0)`, border at an alpha. Neutral zero-chroma gray; tint it for personality.
- **New this year:** the registry now ships three bases, `radix`, `base` (Base UI) and `aria` (React Aria). The Base UI variant of Drawer uses `@base-ui/react/drawer` with `showSwipeHandle` and `snapPoints`. The Radix variant still uses Vaul. A [drawer](https://github.com/shadcn-ui/ui/blob/main/apps/v4/registry/bases/base/ui/drawer.tsx) in shadcn's own registry has moved off Vaul. Its sonner wrapper maps `--normal-bg / --normal-text / --normal-border / --border-radius` onto popover tokens, a good template.
- **Drawer anatomy (Vaul variant):** grabber `h-2 w-[100px] rounded-full bg-muted`, `mt-4`; content `rounded-t-lg`, `max-h-[80vh]`, `p-4` footer with `gap-2`.

### React Aria / React Spectrum (Adobe)
Sources: [Sheet.tsx](https://github.com/adobe/react-spectrum/blob/main/packages/react-aria-components/src/Sheet.tsx), [Sheet docs](https://react-aria.adobe.com/Sheet), [Toast.tsx](https://github.com/adobe/react-spectrum/blob/main/packages/react-aria-components/src/Toast.tsx), [S2 spacing](https://github.com/adobe/react-spectrum/blob/main/packages/@react-spectrum/s2/style/spectrum-theme.ts). [src]/[docs].

- **Spacing (S2):** 2, 4, 8, 12, 16, 20?, 24, 32, 40, 48, 64, 80, 96 (named spacing-50 to spacing-1000). The gaps in the 16-24 range are partly cut off in my read, so treat them as indicative.
- **Sizes:** Button S/M/L/XL, ActionButton XS/S/M/L/XL, Avatar 16, 20, 24, 28, 32, 36, 40, 44 (and more). S2 uses an explicit size axis with `height / 2 - iconWidth / 2` style optical alignment maths.
- **New: a `Sheet` component** (react-aria-components 1.22, Oct 2026). It is a swipeable overlay for bottom/top/left/right/center, with `swipeDirection`, `snapPoints`, nested stacking and `data-position` / `data-entering` style hooks. Its mechanism is native scrolling: a scroll container with `scroll-snap` markers at the content extremes defines the entered and exited resting positions, and an IntersectionObserver tells the app whether it is at the full detent. At a partial detent a swipe on the content expands the sheet "like iOS". So there is no JS pointer tracking, and the compositor does the gesture, which is smoother on phones. It is new and the docs are young, so test it on iOS Safari. React Aria's [Modal](https://react-aria.adobe.com/Modal) has no sheet example.
- **Toast:** still exported as `UNSTABLE_Toast`, `UNSTABLE_ToastRegion`, `UNSTABLE_ToastQueue`. Accessible (live region, F6 focus into the region), but unstable and unstyled.
- **What to copy:** the accessibility model (press handling, `usePress` fixing iOS tap quirks, virtual-click detection, focus management for menus and popovers). RAC is the best choice when we need a correct accessible Menu, Popover, Select or Tabs. The bundle is large, but tree-shaking by sub-path works (`react-aria-components/Menu`).

### Base UI (MUI's headless)
Sources: [docs: Drawer](https://base-ui.com/react/components/drawer), [docs: Toast](https://base-ui.com/react/components/toast), npm. [docs]. v1.9.0, Oct 2026. `@base-ui/react`, last push today.

- **Component list** includes Drawer, Toast, Menu, Popover, Tabs, Toggle-group, Avatar, Select, Combobox, Dialog and AlertDialog. Nothing is styled; it is Tailwind-friendly by design (`data-*` attributes and CSS variables).
- **Drawer:** `swipeDirection` (default `down`), `snapPoints` (0-1 as viewport fraction, above 1 as px, strings like `'148px'` or `'30rem'`), `snapToSequentialPoints`, nested drawers with `--nested-drawers`, `--drawer-height`, `--drawer-snap-point-offset`, `--drawer-swipe-movement-y`, `--drawer-swipe-strength` (0.1-1), backdrop `--drawer-swipe-progress`. It also has `VirtualKeyboardProvider` (`--drawer-keyboard-inset`), an `Indent` background effect (the iOS "page shrinks behind the sheet" look), edge `SwipeArea`, and `data-base-ui-swipe-ignore` to opt content out. This is a functional superset of Vaul and is actively maintained.
- **Toast:** stacking by `--toast-index`, `--toast-offset-y`, `--toast-frontmost-height`, swipe to dismiss (default directions down and right), `actionProps` for an Undo button, default timeout 5000 ms, `0` disables.
- Large tarball on npm (10 MB unpacked), but tree-shakeable per component, and the shipped JS per component is small.

### Material 3
Sources: [material-web tokens v0_192](https://github.com/material-components/material-web/tree/main/tokens/versions/v0_192) [src]. Note material-web is in maintenance mode for new M3 Expressive work; the numbers below are the M3 baseline.

| Item | Value |
|---|---|
| Navigation bar | container 80 high; active indicator 64 x 32 pill; icon 24; label medium (12) |
| Button (filled/tonal/outlined) | 40 high, icon 18 |
| Icon button | icon 24 in a 40 state layer (48 hit target) |
| Chip (assist/filter) | 32 high, radius small (8), icon 18, side padding 16, icon-label gap 8 |
| List item (material-web) | one line 48, two line 68 min; leading icon 24, avatar 40, image 56, leading space 16, vertical space 12 |
| List item (M3 spec) | one line 56, two line 72, three line 88 [known] |
| Bottom sheet | extra-large top corners 28 (`corner-extra-large-top`); drag handle 32 x 4 |
| Snackbar | corner extra small (4) |
| Top app bar | small 64, medium 112, large 152 |
| Search bar | 56 |
| Shape scale | none 0, extra-small 4, small 8, medium 12, large 16, extra-large 28, full 9999 |
| Type scale (rem) | label small 0.6875, label/body small 0.75, body medium and label large 0.875, body large 1, title large 1.375, headline small 1.5, headline medium 1.75, headline large 2 |
| Min touch target | 48 |

Material's lesson: the visual size and the hit size are separate (24 icon, 40 container, 48 target). The chip margin formula in material-web is `max(0, (48 - height) / 2)`, which makes the hit area 48 even when the visual chip is 32.

### Apple HIG / UIKit
Sources: [Buttons](https://developer.apple.com/design/human-interface-guidelines/buttons), [Sheets](https://developer.apple.com/design/human-interface-guidelines/sheets), [Toolbars](https://developer.apple.com/design/human-interface-guidelines/toolbars), [Tab bars](https://developer.apple.com/design/human-interface-guidelines/tab-bars) (read from Apple's JSON feed) [docs].

- **Hit region:** at least 44 x 44 pt (60 x 60 in visionOS).
- **Button control sizes (iOS 26):** mini 28, small 32, regular 44, large 52, extra large 64 pt. (The page lists these; mapping of "small", "large" and "extra large" is partial in my read.)
- **Sheets:** detents are `medium` (about half height) and `large`; custom detents are allowed. A grabber lets people drag, or tap to cycle detents, and it works with VoiceOver. Prefer the medium detent for progressive disclosure.
- **Toolbars and nav bars:** a large title collapses to a standard title on scroll and returns at the top. Standard buttons, fields and headers have corner radii concentric with the bar's corners. Content scrolls under bars.
- **Tab bar:** the iPhone tab bar is 49 pt (83 with a home indicator) [known]. In iOS 26 it is a floating Liquid Glass capsule. The HIG page gives only "68 pt tall, 46 pt from the top" for visionOS.
- **List rows [known]:** plain row 44 pt minimum; subtitle rows about 60; row with a 40 pt avatar about 60-64; separator inset 16 or inset past the leading image. Not stated on the HIG pages.
- **Concentric rule:** inner radius = outer radius minus padding. Worth encoding in the token system.
- **Corner radius [known]:** large sheets about 38-40 pt on recent iPhones (device-concentric); cards 12-20.

### Ark UI / Park UI
Sources: npm, GitHub. @ark-ui/react 5.40.1 (last push today). [src].

- Headless, state-machine (Zag.js) components. It ships a `drawer`, `toast`, `segment-group`, `avatar`, `scroll-area`, `carousel`, `tabs`, `menu`, `popover` and more, framework-agnostic.
- **Park UI** is the styled layer, built on Panda CSS (last push Apr 2026). It is not Tailwind-native. Take its token structure as inspiration only. I did not find a Park UI measurement set that beats Radix's.
- Verdict: the broadest headless set, but Zag state machines and a different mental model add weight and no mobile-gesture advantage.

### Mantine (v9.8, React 19.2 required)
Sources: [default-theme.ts](https://github.com/mantinedev/mantine/blob/master/packages/@mantine/core/src/core/MantineProvider/default-theme.ts), [Button.module.css](https://github.com/mantinedev/mantine/blob/master/packages/@mantine/core/src/components/Button/Button.module.css), Avatar, ActionIcon, Chip, SegmentedControl modules. [src].

- **Size axis xs/sm/md/lg/xl.** Button height 30/36/42/50/60; compact 22/26/30/34/40. Padding-x 14/18/22/26/32. ActionIcon 18/22/28/34/44 (and an "input" variant that matches control heights 30/36/42/50/60). Avatar 16/26/38/56/84, placeholder font size = size / 2.5. SegmentedControl padding 2x6, 3x10, 4x14, 7x16, 10x20; the thumb radius is `radius - 4px`.
- **Chip:** the padding changes when checked (xs 16 to 8.2, sm 20 to 10, md 24 to 11.7) to make room for the check icon without the width jumping. A nice detail.
- **Radius:** xs 2, sm 4, md 8 (default), lg 16, xl 32. **Spacing:** xs 10, sm 12, md 16, lg 20, xl 32. **Font:** 12, 14, 16, 18, 20. Line heights 1.4 to 1.65. **Colour:** 10 steps per hue, primary shade 6 in light and 8 in dark. Ships CSS modules + CSS variables, and the library is heavy (10 MB unpacked).
- Verdict: great reference for the "one size axis drives height, padding, font, avatar and icon", not a dependency.

### Geist (Vercel)
Sources: [button.md](https://vercel.com/geist/button.md), [avatar.md](https://vercel.com/geist/avatar.md), [materials.md](https://vercel.com/geist/materials.md), [colors.md](https://vercel.com/geist/colors.md) [docs].

- **Sizes** tiny / small / medium (default) / large; shapes `square` and `circle` for icon-only buttons (`svgOnly` plus `aria-label`). Pixel heights are not on the doc pages; commonly reported as 24 / 32 / 40 / 48 [unverified].
- **Avatar sizes** shown in docs: 16, 24, 32, 48. AvatarGroup `overlap="auto"` scales the overlap with the size.
- **Materials (named elevation presets):** base and small radius 6, medium and large radius 12; floating: tooltip 6, menu 12, modal 12, fullscreen 16. So surface radius steps 6 then 12 then 16 by importance.
- **Colour:** 10 scales, 10 steps each (100-1000), each step has a job: 100 background, 200 hover, 300 active, 400 border, 500 border hover, 600 border active, 700 solid, 800 solid hover, 900 secondary text, 1000 text. Two background colours. `gray` for solid things and `gray-alpha` only where the background must show through (shadows, overlays). "Draw each border once."
- Verdict: copy the step-roles idea and the named materials.

### Vaul (drawer), focused
Source: [constants.ts](https://github.com/emilkowalski/vaul/blob/main/src/constants.ts), [index.tsx](https://github.com/emilkowalski/vaul/blob/main/src/index.tsx) [src].

- Easing `cubic-bezier(0.32, 0.72, 0, 1)`, duration 0.5 s. **Close threshold 0.25** (drag past 25% of the height to close). **Velocity threshold 0.4** px/ms (a fast flick closes it, with a 40% distance guard in the snap logic). With snap points, a velocity above 2 can skip points (disable with `snapToSequentialPoint`).
- Background scale effect: the page behind scales (about `(width - 16) / width` for nested drawers) and gets `border-radius: 8`; `WINDOW_TOP_OFFSET` 26 and `calc(env(safe-area-inset-top) + 14px)`.
- Dragging starts only when the content is scrolled to the top (`shouldDrag` checks scroll position), with a scroll lock timeout of 100 ms, and it handles text selection and `data-vaul-no-drag`.
- It also has `handleOnly`, `dismissible`, `fadeFromIndex`, `modal`, `repositionInputs` (keyboard) and `preventScrollRestoration`.
- **Maintenance: the README says the repo is unmaintained.** Latest release is 1.1.2 (Dec 2024), last push Oct 2025 (a commit titled "Explain maintenance"), 160+ open issues. Peer range covers React 19, and it works, but nobody is fixing iOS bugs.

### Sonner (toasts), focused
Source: [index.tsx](https://github.com/emilkowalski/sonner/blob/main/src/index.tsx), [styles.css](https://github.com/emilkowalski/sonner/blob/main/src/styles.css) [src]. v2.0.8, Aug 2026, last push Aug 2026.

- Visible toasts 3, lifetime 4000 ms, toast width 356, gap 14, viewport offset 24 desktop and 16 mobile, radius 8, swipe threshold 45 px (or velocity above 0.11), unmount delay 200 ms. Under 600 px the toast fills the width minus the mobile offset on both sides.
- **Stacking trick:** each toast knows `--toasts-before` (its index) and `--lift`. Collapsed, the ones behind shift by `index * gap` and scale by `1 - index * 0.05` (`--scale: toasts-before * 0.05 + 1`, applied negatively). Hover or focus expands the list to full height and pauses the timers. An invisible pseudo-element of height `gap + 1` bridges the gap so the pointer does not "leave" between toasts. Swipe uses a dampened rubber band.
- Action and Undo: `toast('Deleted', { action: { label: 'Undo', onClick } })`; promise toasts; custom JSX via `toast.custom`. Styles are CSS variables (`--normal-bg`, `--border-radius`, ...), so it themes with Tailwind tokens. About 174 KB unpacked, a few KB gzipped.

### cmdk
v1.1.1, repo moved to `dip/cmdk` (Mar 2025 release, last push Oct 2025). Slow but stable. Peer range includes React 19. Unstyled command palette. We do not need a palette on a phone-first feed, so it is out of scope unless search gets a command-style UI.

### Motion (framer-motion successor)
[docs: bundle size](https://motion.dev/docs/react-reduce-bundle-size), [docs: drag](https://motion.dev/docs/react-drag) [docs]. v14.14, Nov 2026, very active.

- Bundle (gzip): full `motion` component 43 kb; `m` + `LazyMotion` about 5 kb + `domAnimation` 24 kb, or `domMax` 38 kb (needed for drag and layout); `useAnimate` mini 3.3 kb (WAAPI only), hybrid 23 kb.
- Drag: `drag="y"`, `dragConstraints`, `dragElastic` (0-1), `dragMomentum`, `useDragControls` with `dragListener={false}` for handle-only drag, `onDragEnd(e, {offset, velocity})`. That is enough to build a sheet in about 40 lines: close when `offset.y > 0.25 * height` or `velocity.y > ~400-500 px/s`, else spring back (Vaul's own rule of thumb, converted).
- Cost: at least 40 kb gz for drag. That is heavy for a feature that Base UI or React Aria covers natively.

### Others
- **daisyUI 5.8** (active): everything derives from `--size-field` (0.25rem), so button height = `size-field * 10` = 40, xs 24, sm 32, lg 48, xl 56 [src: button.css]. Theme tokens: `--radius-selector 0.5rem`, `--radius-field 0.25rem`, `--radius-box 0.5rem`, `--border 1px`, `--depth` (0/1) and `--noise` toggles. Copy the single-knob idea (`--size-field`, `--radius-*`, `--depth`) because it fits Tailwind 4's `@theme`.
- **Origin UI**: now continued by another group (the original repo is gone); not a source of record. [unverified]
- **Catalyst (Tailwind Plus)**: paid, closed source, built on Headless UI. Not read. [unverified]
- **Untitled UI**: button sizes sm 36, md 40, lg 44, xl 48 [unverified], a commercial kit. Not read.
- **Headless UI**: not covered; its mobile story is weaker than Base UI's or React Aria's.

---

## 2. Comparison tables (px)

### Control heights

| Library | Tiny | Small | Default | Large | XL |
|---|---|---|---|---|---|
| Radix Themes | 24 | 32 | 40 | 48 | |
| shadcn | 24 (xs) | 32 | 36 | 40 | |
| Mantine | 30 | 36 | 42 | 50 | 60 (compact: 22/26/30/34/40) |
| Material 3 | | | 40 | | |
| Apple (iOS 26) | 28 (mini) | 32 | 44 (regular) | 52 | 64 |
| Geist | 24? | 32? | 40? | 48? | [unverified] |
| daisyUI | 24 | 32 | 40 | 48 | 56 |

### Icon-only buttons (visual box / hit target)

| Library | Sizes |
|---|---|
| Radix IconButton | 24, 32, 40, 48 (square, equals button height) |
| shadcn | 24, 32, 36, 40 (icon 12 or 16) |
| Mantine ActionIcon | 18, 22, 28, 34, 44 |
| Material 3 | icon 24 in a 40 container, 48 hit |
| Apple | 44 hit minimum |

### Chips, badges and segmented controls

| Library | Chip / badge | Segmented |
|---|---|---|
| Radix | Badge 20ish (12/16 text + 2-4 vertical) | 24 / 32 / 40 |
| shadcn | Badge about 22 (text-xs, py-0.5), pill | Tabs/ToggleGroup 36 |
| Mantine | Chip heights follow the control scale (22-40) | pad-y 2-10 plus 4 outer pad |
| Material 3 | **Chip 32**, radius 8, padding 16, icon 18 | outlined segmented 40 |
| Apple | capsule, 44 hit | 32-ish [known] |

### List rows

| Library | Row height |
|---|---|
| Material 3 | 56 one-line, 72 two-line, 88 three-line (spec); material-web 48 / 68; avatar 40, image 56, side padding 16 |
| Apple | 44 minimum; about 60-64 with a 40 avatar [known] |
| Radix / shadcn / Mantine | no list-row component (menu items: Radix 24-40, shadcn about 32) |

### Avatar sizes

| Library | Sizes |
|---|---|
| Radix | 24, 32, 40, 48, 64, 80, 96, 128, 160 |
| shadcn | 24, 32, 40 |
| Mantine | 16, 26, 38, 56, 84 |
| React Spectrum S2 | 16, 20, 24, 28, 32, 36, 40, 44 |
| Geist | 16, 24, 32, 48 |
| Material 3 | 40 (list leading) |

### Radius scales

| Library | Scale |
|---|---|
| Radix | 3, 4, 6, 8, 12, 16 x factor (0 / 0.75 / 1 / 1.5), plus `radius-full` |
| shadcn | 10px root; sm 6, md 8, lg 10, xl 14, 2xl 18, 3xl 22, 4xl 26 |
| Mantine | 2, 4, 8, 16, 32 |
| Material 3 | 0, 4, 8, 12, 16, 28, full |
| Geist materials | 6 / 12 / 16 |
| daisyUI | field 4, selector 8, box 8 |

### Spacing scales

| Library | Scale |
|---|---|
| Radix | 4, 8, 12, 16, 24, 32, 40, 48, 64 x scaling |
| Mantine | 10, 12, 16, 20, 32 |
| React Spectrum S2 | 2, 4, 8, 12, 16, ..., 24, 32, 40, 48, 64, 80, 96 |
| Material 3 | 4-dp grid; 16 side margins; 8 and 12 inside |
| Tailwind 4 | 0.25rem = 4 px base multiplier (`--spacing`) |

### Sheets and toasts (behaviour)

| | Library | Open and close | Snap points | Notes |
|---|---|---|---|---|
| Sheet | Vaul | JS pointer drag, 0.25 distance, 0.4 velocity | yes | **unmaintained** |
| Sheet | Base UI Drawer | pointer swipe, `--drawer-swipe-*` | yes (fractions, px, rem) | active, keyboard provider, indent effect |
| Sheet | React Aria Sheet | native scroll + scroll-snap | yes | new, compositor-driven |
| Sheet | Motion | `drag="y"` plus our own thresholds | our own | 40 kb gz |
| Toast | Sonner | 45 px or 0.11 velocity swipe, 4 s | n/a | stack with scale 0.05 per level |
| Toast | Base UI Toast | swipe, 5 s, `actionProps` | n/a | CSS-variable stack |
| Toast | React Aria | `UNSTABLE_` | n/a | accessibility first |

---

## 3. Recommended token system (a synthesis)

**Principles.** (1) One 4px base, with a step axis that drives height, padding, font, icon and radius together (Radix, Mantine, daisyUI). (2) Radius is one knob with a derived scale (Radix factor, shadcn root), and sheets and cards get larger steps than controls (Geist materials). (3) Visual size and hit size are separate, with the hit area at least 44 (Apple, Material). (4) Semantic colour roles on a stepped gray (Geist and Radix steps). (5) Sizes expressed as CSS variables inside Tailwind 4 `@theme`, so utilities and components share them.

**Spacing (px):** 2, 4, 8, 12, 16, 20, 24, 32, 40, 48, 64. Tailwind 4 `--spacing: 0.25rem` already provides the multiples, so only name the roles: page gutter 16, card inner padding 12, row gap 12, chip gap 8, section gap 24.

**Control heights (the phone ladder).** Taller than desktop libraries because fingers matter:

| Token | Height | Use |
|---|---|---|
| `--control-xs` | 28 | inline pills inside cards, follow pill (hit area extended to 44) |
| `--control-sm` | 32 | filter chips (Material 32; with a 44 touch margin) |
| `--control-md` | 40 | secondary buttons, segmented control, menu rows in popovers |
| `--control-lg` | 44 | primary buttons, icon buttons (Apple regular), list-row minimum |
| `--control-xl` | 52 | sheet CTAs (Apple large) |

**Icon buttons:** 36 visual with a 44 hit box for the feed card action row, 40 for the ⋯ in rows, 44 in headers and the tab bar. Icons 20 default, 24 in the tab bar and top bar, 16 inside chips and 14 inside small chips (Material uses 18 in chips and buttons; lucide's 1.75 stroke looks right at 20-24).

**Avatars:** 24 (inline mention, comment), 32 (feed card header), 40 (list row, matches Material's 40), 48 (suggestion tile), 64 (artist header), 96 (profile). Eight sizes are overkill; keep six. Use `radius-full`; on the suggestion tile consider squircle-ish `radius-xl` for personality.

**Radius (cute, slightly premium).** Root `--radius: 12px` (a bit rounder than shadcn's 10 or Radix's medium) with derived steps: `xs 6 · sm 8 · md 12 · lg 16 · xl 20 · 2xl 28 · full`. Mapping: chips and small buttons = full pill; buttons and inputs = md, or full for primary pills; menus and popovers = lg; feed card = xl; media inside a card = `card radius - padding` (concentric rule, from Apple); bottom sheet top corners = 2xl (28, same as Material's extra-large); toasts = lg to xl; avatars = full; skeletons inherit what they stand in for. A single `--radius-factor` multiplies the scale so we can try 0.75, 1 and 1.25 live (Radix pattern).

**Type scale (px, line height):** 12/16 caption and chip, 13/18 meta (time, counts), 14/20 body-small and row subtitle, 16/22 body and row title, 18/24 section title, 22/28 sheet title, 28/34 large title collapsed at 17/22 (Apple: bar 44), 34/40 large title expanded. Weights 400 / 500 / 600 only. Pick a tight letter-spacing (-0.01em) on 22 and up. Material's and Radix's 12/14/16/18/20/24 are the base; we add the large title steps because the app has a collapsing header.

**Colour (dark default).** Use OKLCH and a 12-step roles table per gray (Radix roles, Geist names): `step 1 app bg`, `2 raised bg`, `3 card / component bg`, `4 hover`, `5 active`, `6 subtle border`, `7 border`, `8 strong border`, `9 solid`, `10 solid hover`, `11 secondary text`, `12 primary text`. Tint the gray 2-4 degrees of chroma toward the accent (shadcn's neutral gray reads cold; a slightly warm or violet gray reads cute). One accent hue with a solid, a soft (alpha 12-16%) and a text step. A `gray-alpha` variant only for scrims, glass bars and shadows (Geist). Dark first: define the dark tokens on `:root`, and put light under `[data-theme=light]` or a media query. In dark mode, elevation comes from lighter surfaces plus a 1px border, not from shadows.

**Motion tokens:** spring-like ease `cubic-bezier(0.32, 0.72, 0, 1)` at 300-500 ms for sheets (Vaul and Apple-like), 150 ms ease-out for press and hover, 200 ms for toast enter and exit, with `prefers-reduced-motion` off switches (Sonner has this).

**Sheet constants (from Vaul and Apple):** close at 25% of height or 0.4 px/ms velocity; grabber 36 x 5 (Material 32 x 4, shadcn 100 x 8 is too big); top radius 28; max height `100dvh - 12px` minus the safe area; medium detent about 50%; backdrop 0.2-0.5 black with opacity bound to drag progress.

**Toast constants (from Sonner):** width `min(356px, 100% - 32px)`, 16 side offset on mobile, bottom offset = tab bar height + 12 (so toasts sit above the tab bar), gap 14, show 3, lifetime 4 s (Undo toasts: 6 s, pause on touch), swipe threshold 45 px.

---

## 4. Which library's anatomy to model each component on

| Component | Model on | Why / key details |
|---|---|---|
| Feed card header | Material list item (leading avatar, two-line text, trailing action) with Radix size-2 spacing | avatar 32-40, gap 12, name 14/20 600, time 13 muted, Follow as xs pill, ⋯ icon button 36 (44 hit) |
| Feed card body, actions | Apple HIG (44 minimum) | action icons 24 in 44 boxes, gap 4-8; counts beside icons |
| Tag chip strip | Material filter chip (32, 8 radius → we use pill) + Mantine's checked-padding trick | horizontal scroll, snap-less, 8 gap, fade edge mask |
| Filter chips with menus | Material filter chip with a dropdown arrow; menu via Base UI Menu or Radix DropdownMenu / sheet on phone | selected state changes padding to fit the check; hit area 44 via margins |
| List row (artist) | Material 3 list item three zones, Apple row | 64 high (avatar 40 + 12 vertical), subtitle 13 muted, trailing ⋯ 40 box; separators inset past the avatar |
| Suggestion tiles | Radix Card plus Avatar size 4 | 120-140 wide, avatar 48-64, name, Follow pill; snap scroll with `scroll-snap-type: x mandatory` |
| Segmented control | Radix SegmentedControl | 32-40 high, thumb radius = outer minus 2, animated thumb by `translateX`, `role=tablist` or radiogroup |
| Bottom tab bar | Material navigation bar for structure (indicator pill behind the icon, label below), Apple for height | 56-64 content + `env(safe-area-inset-bottom)`; icon 24; label 11-12; active = filled icon plus tinted indicator |
| Large-title header that collapses | Apple navigation bar | 44 collapsed bar; expanded title 34/40; use scroll position to interpolate (CSS scroll-driven animation or one rAF handler) |
| Bottom sheet | Base UI Drawer (anatomy: Backdrop, Viewport, Popup, Handle) with Vaul's thresholds | controlled `open` so we can push the history entry; grabber 36 x 5; detents medium and large |
| Toast with Undo | Sonner (stack, rubber band) plus Base UI `actionProps` idea | Undo is a text button; one action; toasts do not stack over the tab bar |
| Skeleton | Radix and shadcn Skeleton (a `Skeleton` is a `bg-muted animate-pulse rounded-md`) | match the radius of what loads; shimmer 1.4 s; reduced motion → static |
| Icon button | Radix IconButton and Material (visual and hit sizes split) | `size-9` with `before:absolute before:-inset-1` to get 44 |
| Avatar | Radix (fallback initials at size / 2.5) and shadcn group ring | `ring-2 ring-background` for stacks |
| Menus / popovers (desktop) | React Aria or Base UI Menu | keyboard, typeahead, collision handling |

---

## 5. Dependency advice and maintenance status (as of 2026-11-25)

| Library | Latest (npm) | Last push | State | React 19 | Verdict for us |
|---|---|---|---|---|---|
| **Vaul** | 1.1.2 (Dec 2024) | 2025-10-03 | **Unmaintained** (README says so); 160+ open issues | peer allows 19 | **Do not add.** Copy its constants and `shouldDrag` idea. shadcn's Base UI variant has moved off it. |
| **Sonner** | 2.0.8 (Aug 2026) | 2026-08-10 | Maintained, small releases | yes | **Add.** Best-in-class stack and swipe, tiny, themable with CSS variables. Needs the Toaster mounted above the tab bar (`offset` and `mobileOffset`). |
| **Base UI** (`@base-ui/react`) | 1.9.0 (Oct 2026) | today | Very active, stable 1.x | yes | **Add selectively** (Drawer, Menu, Popover, Tabs, Toggle-group), per-component imports. Good Tailwind fit (data attributes and CSS variables). Check the Drawer on real iOS first. |
| **React Aria Components** | 1.22.1 (Oct 2026) | today | Very active (Adobe) | peer lists 19 rc and up | **Best choice for accessible Menu / Popover / Select / ListBox.** `Sheet` is new and promising (scroll-snap) but young; `Toast` is still `UNSTABLE_`. Pick RAC or Base UI for menus, not both. |
| **Radix Primitives** (`radix-ui`) | 1.8.1 (Oct 2026) | 2026-10-14 | Maintained at a slow pace | yes | Fine and proven for Popover and DropdownMenu. No drawer. Choose it only if we want shadcn's radix base. |
| **Radix Themes** | 3.3.0 (Jan 2026) | 2026-04-11 | Slow | yes | **No.** Own CSS system conflicts with Tailwind 4. Copy the numbers only. |
| **shadcn/ui** | n/a (copy-in) | today | Very active | yes | Use as a **source of patterns**, not a dependency. Its CLI can copy `base` variants (Base UI) of drawer, sonner, avatar, skeleton. Its defaults are desktop-sized (36 high buttons, 6-8 radius). |
| **Motion** | 14.14 (Nov 2026) | today | Very active | yes | **Optional.** Use `LazyMotion` + `domMax` only if we need layout or drag animations beyond what the sheet library provides (about 43 kb gz). Prefer CSS springs via `linear()`, and scroll-snap or Base UI's built-in swipe. |
| **cmdk** | 1.1.1 | 2025-10-29 | Stable, slow | yes | Skip unless we add a search palette. |
| **Ark UI** | 5.40.1 | today | Very active | `>=18` | Skip; Zag state machines add weight with no gesture advantage. |
| **Park UI** | n/a | 2026-04-10 | Slow | n/a | Skip (Panda CSS). |
| **Mantine** | 9.8.2 | 2026-11-23 | Very active | requires 19.2+ | Skip (large, own CSS system). Copy its size-axis idea. |
| **daisyUI** | 5.8.2 | 2026-11-20 | Very active | n/a (CSS) | Skip as a dependency; copy `--size-field` and `--radius-*` knobs. |
| **Origin UI, Catalyst, Untitled UI** | n/a | n/a | not evaluated | n/a | Skip. |

**Recommendation.**
1. **Add `sonner`.** It is the clear win for toasts with Undo.
2. **Bottom sheet: use Base UI Drawer, or hand-build.** Hand-building means a `translateY` driven by pointer events, with the Vaul constants. Our requirements are unusual: each sheet pushes a history entry, the Back gesture closes only the sheet, scroll lock is manual, and there is a rubber band. A controlled component with `open` / `onOpenChange` fits all of that, and Base UI Drawer supports it. Do **not** add Vaul. If Base UI's Drawer misbehaves on iOS Safari (keyboard, overscroll, address bar), fall back to a 150-line hand-rolled sheet using Pointer Events and `touch-action: none` on the grabber, or try React Aria's scroll-snap Sheet.
3. **Menus and popovers:** one of Base UI Menu / Popover or React Aria's Menu / Popover (they give accessibility, collision and typeahead, which are expensive to hand-roll). Base UI is the better fit if we already take its Drawer, since it is one dependency.
4. **Everything else by hand** with Tailwind 4 tokens: buttons, chips, avatars, list rows, segmented control (an animated thumb is 30 lines), tab bar, skeletons, large-title header.
5. **Motion: not at the start.** Add it only if we want shared-element or layout transitions; if so, use `LazyMotion` and `domMax`, and keep it out of the sheet and the toast.

---

## 6. Gaps and caveats

- Material 3 spec pages (m3.material.io) are JS-rendered and could not be fetched; values come from material-web token files. The 56/72/88 list heights, which our brief quotes, are the spec values from memory and differ from material-web (48/68).
- Apple pages give hit target, button control sizes, sheet detents and the large-title behaviour. Row heights, tab bar 49/83 and sheet radius are UIKit defaults from memory.
- Geist button pixel heights, Untitled UI sizes, Catalyst and Origin UI were not confirmed.
- Base UI Drawer and React Aria Sheet were read in docs and source, but not run on a device. Verify on real iOS Safari (address bar resize, keyboard, rubber band, overscroll chaining) before committing.
- Bundle sizes are npm unpacked sizes except Motion (gzip, from its docs). Check the real gzip with the Next build analyzer before adopting.

## Source index
- Radix Themes: https://github.com/radix-ui/themes (src/styles/tokens, src/components)
- Radix Primitives: https://github.com/radix-ui/primitives
- shadcn/ui: https://github.com/shadcn-ui/ui (apps/v4/registry/{new-york-v4,bases/base,bases/radix})
- React Aria: https://react-aria.adobe.com/Sheet , https://react-aria.adobe.com/Modal , https://github.com/adobe/react-spectrum
- Base UI: https://base-ui.com/react/components/drawer , https://base-ui.com/react/components/toast
- Material web tokens: https://github.com/material-components/material-web/tree/main/tokens/versions/v0_192
- Apple HIG: https://developer.apple.com/design/human-interface-guidelines/{buttons,sheets,toolbars,tab-bars}
- Geist: https://vercel.com/geist/{button,avatar,materials,colors}.md
- Mantine: https://github.com/mantinedev/mantine (core/src/core/MantineProvider/default-theme.ts, components/*.module.css)
- Vaul: https://github.com/emilkowalski/vaul (src/constants.ts, src/index.tsx)
- Sonner: https://github.com/emilkowalski/sonner (src/index.tsx, src/styles.css)
- Motion: https://motion.dev/docs/react-reduce-bundle-size , https://motion.dev/docs/react-drag
- daisyUI: https://github.com/saadeghi/daisyui
