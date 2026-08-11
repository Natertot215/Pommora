## Design System
```
Design System
├── Design Philosophy
├── Tooling
├── The Token Atlas
│   ├── Primitives
│   ├── Surfaces
│   ├── Labels
│   ├── States
│   ├── Fills
│   ├── Tints
│   ├── Separators
│   ├── Shadows
│   ├── Spectrum
│   ├── Geometry
│   └── Materials
├── Component Chrome
├── Showcase
├── Where the Rest Lives
├── Known Issues
└── Pending
```

The Pommora design system — the code mirror of the Figma "Pommora - React" library, which is canonical for design values and the visual reference for components. Tokens come in two tiers: raw **primitives**, and the meaningful **semantic** aliases built on them.

This document is the sanctioned exception to the "docs name; code holds exacts" rule: its tables state literal values so what exists is legible without opening the token files. Every table carries a **SOURCE** line naming the file it must agree with — a value changes in code first, and the table follows in the same commit. Before authoring any new style or mechanism, this atlas is the first read; what a surface needs usually already exists here.

### Design Philosophy

Apple's design language, and **macOS Tahoe** in particular, is the north star — near-identical by intent: restraint, depth through material over ornament, quiet precision. Where the web platform opens doors — richer motion, interaction, and layout — they're treated as additive prospects, adopted only when they deepen the Apple-grade minimalism. Simplicity is the constraint, not the compromise.

### Tooling

- **vanilla-extract** — token files are `*.css.ts`; the theme primitives emit real CSS variables and a typed `vars` object, making a mistyped token a compile error. The plugin is wired into the renderer Vite config.
- **Inter** (variable font) covers the four weights the type ramp uses and is set as the app font.
- **The bridge** — `tokens/theme-vars.css.ts` republishes the hashed vanilla-extract tokens under stable `--name` handles so plain `.css` files resolve the same source. Each table below lists a token's bridged var beside it; a token without one is TS-only.

The design system lives in `src/renderer/src/design-system/`.

### The Token Atlas

#### Primitives

The three raw system tones every derived grey, white, and black is an opacity of, plus the window substrate. Derivations use `greyA(pct)` / `whiteA(pct)` / `blackA(pct)` — `color-mix` of the primitive toward transparent.

**SOURCE:** `Pommora/src/renderer/src/design-system/tokens/color.css.ts` · `Pommora/src/shared/theme.ts`

| Title             | Token                               | Value     |
| ----------------- | ----------------------------------- | --------- |
| System White      | `system.white` · `--system-white`   | `#E8E8E8` |
| System Grey       | `system.grey` · `--system-grey`     | `#71717A` |
| System Black      | `system.black` · `--system-black`   | `#010101` |
| Window Background | `background.window` · `--bg-window` | `#1A1A1C` |

#### Surfaces

The opaque content planes layered on the window substrate — addressed by role, and their own literals rather than derivations. Progressively lifted: primary is the base content layer, tertiary the highest.

**SOURCE:** `Pommora/src/renderer/src/design-system/tokens/color.css.ts`

| Title             | Token                                       | Value             |
| ----------------- | ------------------------------------------- | ----------------- |
| Surface Primary   | `surface.primary` · `--surface-primary`     | `#202022`         |
| Surface Secondary | `surface.secondary` · `--surface-secondary` | `#2A2A2E`         |
| Surface Tertiary  | `surface.tertiary` · `--surface-tertiary`   | `#3A3A3E`         |
| Interaction Field | `inputFieldVar` · `--input-field`           | `fill.quaternary` |

#### Labels

The text ladder — system-white at descending presence. Primary is the raw primitive passed through; the rest are opacity steps. Labels ride the near-white so the lightest label still reads over the heaviest fill.

**SOURCE:** `Pommora/src/renderer/src/design-system/tokens/color.css.ts`

| Title | Token | Value |
| --- | --- | --- |
| Label Primary | `label.primary` · `--label-primary` | system-white @ 100% |
| Label Control | `label.control` · `--label-control` | system-white @ 80% |
| Label Secondary | `label.secondary` · `--label-secondary` | system-white @ 65% |
| Label Tertiary | `label.tertiary` · `--label-tertiary` | system-white @ 35% |

#### States

The interaction states — two grey washes, one black veil, and four opacity dims. Hover and selected are fills painted behind content; muted is painted over it; drag, ghost, inactive, and disabled are consumed as `opacity:` on the element itself. Those four hold their own bare numbers rather than tint-ladder steps, since they are never mixed into a colour, and they read as one ramp: the more a stand-in carries the original's presence, the less the original fades — inactive is the empty-state text dim, worn over the standard label.

**SOURCE:** `Pommora/src/renderer/src/design-system/tokens/color.css.ts` · `tokens/theme-vars.css.ts`

| Title    | Token                                 | Value              |
| -------- | ------------------------------------- | ------------------ |
| Hover    | `state.hover` · `--state-hover`       | system-grey @ 2.5% |
| Selected | `state.selected` · `--state-selected` | system-grey @ 5%   |
| Muted    | `state.muted` · `--state-muted`       | system-black @ 10% |
| Drag     | `--state-drag`                        | base @ 85%         |
| Ghost    | `--state-ghost`                       | base @ 65%         |
| Inactive | `--state-inactive`                    | base @ 55%         |
| Disabled | `--state-disabled`                    | base @ 50%         |

#### Fills

The five-step system-grey overlay ramp for cards, chips, and fields sitting on a surface — most to least present. Strokes sit above fills: a separator reads harder than the surface it divides.

**SOURCE:** `Pommora/src/renderer/src/design-system/tokens/color.css.ts`

| Title           | Token                                   | Value             |
| --------------- | --------------------------------------- | ----------------- |
| Fill Primary    | `fill.primary` · `--fill-primary`       | system-grey @ 20% |
| Fill Secondary  | `fill.secondary` · `--fill-secondary`   | system-grey @ 15% |
| Fill Tertiary   | `fill.tertiary` · `--fill-tertiary`     | system-grey @ 10% |
| Fill Quaternary | `fill.quaternary` · `--fill-quaternary` | system-grey @ 6%  |
| Fill Quinary    | `fill.quinary` · `--fill-quinary`       | system-grey @ 4%  |

#### Tints

The one opacity ladder any base color is mixed at — `tintAt(base, step)` is `color-mix` of the base toward transparent, short-circuiting to the raw base at 100. The chip recipe and the accent strokes both read these steps.

**SOURCE:** `Pommora/src/renderer/src/design-system/tokens/tint.ts`

| Title           | Token                                         | Value |
| --------------- | --------------------------------------------- | ----- |
| Tint Solid      | `TINT_STEPS.solid` · `--tint-solid`           | 100%  |
| Tint Primary    | `TINT_STEPS.primary` · `--tint-primary`       | 60%   |
| Tint Secondary  | `TINT_STEPS.secondary` · `--tint-secondary`   | 40%   |
| Tint Tertiary   | `TINT_STEPS.tertiary` · `--tint-tertiary`     | 20%   |
| Tint Quaternary | `TINT_STEPS.quaternary` · `--tint-quaternary` | 15%   |

#### Separators

Hairlines and the composed border shorthands built on them, plus the banner's legibility scrim.

**SOURCE:** `Pommora/src/renderer/src/design-system/tokens/color.css.ts` · `tokens/theme-vars.css.ts`

| Title | Token | Value |
| --- | --- | --- |
| Separator Border | `separator.border` · `--separator-border` | system-grey @ 25% |
| Separator Segment | `separator.segment` · `--separator-segment` | system-grey @ 20% |
| Heading Seam | `--border-heading` | `1.75px solid var(--separator-border)` |
| Box Seam | `--border-cell` | `1.5px solid var(--separator-border)` |
| Banner Scrim | `--banner-shadow` | `#0000008C` |

#### Shadows

The two drop shadows — resting glass and lifted or dragged chrome. Every frost surface ends its box-shadow stack in one of these.

**SOURCE:** `Pommora/src/renderer/src/design-system/tokens/color.css.ts`

| Title | Token | Value |
| --- | --- | --- |
| Standard | `shadowStandardVar` · `--shadow-standard` | `0 8px 25px #00000040` |
| Lift | `shadowLiftVar` · `--shadow-lift` | `0 12px 30px #00000066` |

#### Spectrum

The ten selectable solids plus the neutral chip default — authored once in `@shared/theme`, validated by main and renderer alike. The accent is a single user value resolved from this palette (or `system`, the OS accent, read at load); accented surfaces derive from `--accent` through the tint steps, so changing the accent recolors everything at once.

**SOURCE:** `Pommora/src/shared/theme.ts` · `tokens/theme-vars.css.ts`

| Title | Token | Value |
| --- | --- | --- |
| Red | `SPECTRUM.red` · `--solid-red` | `#FF453A` |
| Orange | `SPECTRUM.orange` · `--solid-orange` | `#FF9F0A` |
| Yellow | `SPECTRUM.yellow` · `--solid-yellow` | `#FFD60A` |
| Green | `SPECTRUM.green` · `--solid-green` | `#32D74B` |
| Cobalt | `SPECTRUM.lightBlue` · `--solid-light-blue` | `#7EC8E3`  |
| Cyan | `SPECTRUM.cyan` · `--solid-cyan` | `#41959F` |
| Blue | `SPECTRUM.blue` · `--solid-blue` | `#0A84FF` |
| Purple | `SPECTRUM.purple` · `--solid-purple` | `#BF5AF2` |
| Lavender | `SPECTRUM.lavender` · `--solid-lavender` | `#A78BCC` |
| Grey | `SPECTRUM.grey` · `--solid-grey` | `#8E8E93` |
| Default | `GREY_DEFAULT` | `#48484A` |
| Default Accent | `DEFAULT_ACCENT` | `lavender` |
| Accent | `--accent` | `applyAccent` |
| Accent Fill | `--accent-fill` | accent @ 15% |
| Accent Stroke | `--accent-stroke` / `--accent-stroke-hot` | accent @ 40% / accent @ 60% |
| Link / Connection | `--link` / `--connection` | `var(--system-accent)` / → `var(--accent)` |
| Error | `--error` |  `SPECTRUM.red` |
| Code | `--code` | red @ 85% |

#### Geometry

The glyph ladder, the per-size control bundles, and the bare layout constants JS math consumes as numbers. The disclosure step is the one literal every hierarchy derives its per-level inset from.

**SOURCE:** `Pommora/src/renderer/src/design-system/tokens/size.css.ts` · `tokens/theme-vars.css.ts`

| Title | Token | Value |
| --- | --- | --- |
| Icon XS / SM / MD / LG / XL | `size.icon.*` · `--icon-xs`…`--icon-xl` | `12px` · `14px` · `16px` · `18px` · `20px` |
| Button Small | `size.control['button-small']` | h `24px` · segment `20px` · padX `4px` · radius `8px` · icon SM |
| Button Medium | `size.control['button-medium']` | h `28px` · segment `24px` · padX `5px` · radius `10px` · icon MD |
| Button Large | `size.control['button-large']` | h `32px` · segment `28px` · padX `8px` · radius `12px` · icon MD |
| Disclosure Indent | `DISCLOSURE_INDENT` · `--disclosure-indent` | `14px` |
| Fold Gutter | `FOLD_GUTTER` · `--fold-gutter-base` | `20px` |
| Drop-Line Inset | `DROP_LINE_INSET` · `--drop-line-inset` | `2px` |
| Tile Minimum | `TILE_MIN_PX` | `64px` |
| Pill Radius | `--radius-full` | `999px` — larger than any box that wears it, so both ends resolve to semicircles |

The drag chrome's other two dimensions live beside the inset in the bridge: `--drop-line-thickness` (`2px`) and `--drop-dot-size` (`7px`), with `--drag-line` pointing at the accent. The list-outline rail (`--list-outline-*`: `2px` · segment tone · `999px` · `3px`) is the shared nested-run rail consumed by MarkdownPM's outliner and the grouping hierarchy.

Stacking is named rather than numbered — separate ladders for the shell frame's in-flow chrome, a component's lift over its own siblings, and the fixed or portalled top layer, so a new surface picks a rung instead of inventing a z-index, and a step only ranks against others in its own ladder (`tokens/stack.ts`).

#### Materials

Two distinct glass systems. **Frost** is a CSS `backdrop-filter` recipe — a dimmed blur with a glassy edge — parameterized by `FrostParams` and worn by panes, dropdowns, and the drag ghost; zero-valued edge pieces emit nothing. **Liquid** is Apple "Liquid Glass" — a real edge-refraction shader over the live app — worn by the in-use button controls and on-control segments. Layout is always the consumer's.

**SOURCE:** `Pommora/src/renderer/src/design-system/materials/glass-pane.tsx` · `materials/glass-material.ts` · `materials/glass-controls.tsx`

| Title | Token | PANE_FROST | GHOST_FROST |
| --- | --- | --- | --- |
| Blur | `.blur` | `6` | `6` |
| Brightness | `.brightness` | `90` | `100` |
| Border Alpha | `.borderAlpha` | `0.12` | `0`  |
| Top Specular | `.topSpecular` | `0.35` | `0` |
| Inner Ring | `.innerRing` | `0.08` | `0` |
| Lower Rim / Depth / Rim Blur | `.lowerRim` / `.depth` / `.rimBlur` | `0.08` / `12` / `18` | `0` / `0` / `0` |
| Fill | `.fill` | unset (transparent) | `--bg-window` @ 78% |
| Shadow | `.shadow` | standard | lift |


### Component Chrome

The reusable pieces mirror the Figma library and consume semantic tokens only; a component's own behavior lives in its spec.

- **Switches and toggles** — the Switch wears the checkbox look at control scale with one disabled dim (`--state-disabled`); dual-option toggles are always switches or the toggleable double-chevron, never dropdown pickers.
- **Chevrons and twisties** — disclosure glyphs ride the fold-chevron mask tokens (`--fold-chevron-mask`, `--code-chevron-mask` — inline SVG masks bridged from theme-vars) at the tertiary label tone, stepping by the disclosure indent.
- **The drag grip** — the six-dot glyph is one masked asset (`--grip-glyph`).
- **The ActionBand** (`Detail/ActionBand.css`) is the shared home for toolbar-row affordances any surface mounts — ViewSegments first, plus the hover-revealed settings button; a segment's collapsible title rides Segmented-Controls' `labelSlot`.
- **The dropdown shell** splits in two — `MenuSurface` is the pane (notched glass, open and retract beats, state-free); `MenuDropdown` is the shell around a trigger (open state, outside-dismiss, anchored surface, optional growth bound). Surface-specific geometry stays with the surface that means it.
- **The drop chrome** — the insertion line, dot, host, and `DragGhost` live in `design-system/interactions` (`dropChrome.css`, `DropLine.tsx`, `DragGhost.tsx`).
- **The capped label** — ellipsis at rest, scroll-on-hover with a mask fade at the leading edge — is the app-wide overflow treatment for constrained text, defined with the type tokens.
### Showcase

A data-driven design-system site (`npm run showcase`) with a live accent picker, built statically and deployed at https://pommora-design-system.vercel.app.

### Where the Rest Lives

The atlas continues in the specs that own each family: the editor's token pockets in [[MarkdownPM]] §Design System, the type ramp in [[TypographyPM]], motion and the caret, edge-fade, and autoscroll tables in [[InteractionPM]], chips in [[PropertiesPM]], the card families in [[CardViewPM]], the table sheet in [[TableViewPM]], and the preview window's `--ppane-*` contract described in [[PagePreviewPM]]. Icons resolve through one `Icon` component against the curated `design-system/symbols` registry (→ [[SymbolsPM]]). The stack ladders, shell insets, and per-surface knob bundles stay in code — tunables, not vocabulary.

### Known Issues

- **Voiding Liquid Glass can't be done in place** — its `backdrop-filter` displacement is a dynamically-generated SVG filter id CSS can neither reconstruct nor interpolate, so the inspector "swallow" renders the pill as a two-layer control: a fading glass layer behind a solid bare-button layer.
- **Scrollbars are hidden app-wide** — Chromium's default bar reads heavy and the native auto-hiding overlay isn't reliably available, so scrolling is trackpad and wheel only.

### Pending

- **Spacing and radius** — `--radius-full` is the scale's first member, minted from the pill radius nine surfaces had been spelling by hand. The rest of the corners and the spacing steps stay ad-hoc literals until they're lifted from Figma.
- **Light/dark theming** — a future seam; the system is dark-only.
- **Accent editing UI** — deferred; the control surface is the config file.
- **The inactive state token** — the empty-state text tone between secondary and tertiary; its interim consumers read tertiary, each marked `Awaiting proper inactive state token`.
