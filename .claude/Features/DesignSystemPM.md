## Design System

The Pommora design system — the code mirror of the Figma "Pommora - React" library. Tokens come in two tiers: raw **primitives**, and the meaningful **semantic** aliases built on them. Typography has its own spec: `TypographyPM.md`; motion lives in `InteractionPM.md`.

This document is the sanctioned exception to the "docs name; code holds exacts" rule: its tables state literal values so what exists is legible without opening the token files. Every table carries a **SOURCE** line naming the file it must agree with — a value changes in code first, and the table follows in the same commit. Before authoring any new style or mechanism, this atlas is the first read: what a surface needs usually already exists here, and a second implementation of a house primitive is a defect the moment it's written.

### Design Philosophy

Apple's design language, and **macOS Tahoe** in particular, is the north star — **near-identical by intent**: restraint, depth through material over ornament, quiet precision. We mirror that feel rather than reinvent it.

Where the web platform opens doors — richer motion, interaction, and layout — we treat them as **additive prospects**, adopted only when they deepen the Apple-grade minimalism, never when they clutter it. Simplicity is the constraint, not the compromise.

### Source of Truth

The Figma library is canonical for design *values*; this repo mirrors them as tokens, and a value changes in Figma first. Figma is also the visual reference for components.

### Tooling

- **vanilla-extract** — token files are `*.css.ts`; the theme primitives emit real CSS variables **and** a typed `vars` object, so a mistyped token is a compile error. The plugin is wired into the renderer Vite config.
- **Inter** (variable font) covers the four weights the type ramp uses and is set as the app font.
- **The bridge** — `tokens/theme-vars.css.ts` republishes the hashed vanilla-extract tokens under stable `--name` handles so plain `.css` files resolve the same source of truth. Each table below lists a token's bridged var beside it; a token without one is TS-only.

The design system lives in `src/renderer/src/design-system/`. Stacking is named rather than numbered: separate ladders for the shell frame's in-flow chrome, a component's lift over its own siblings, and the fixed or portalled top layer — so a new surface picks a rung instead of inventing a z-index, and a step only ranks against others in its own ladder (`tokens/stack.ts`).

### The Token Atlas

#### Primitives

The three raw system tones every derived grey, white, and black is an opacity of, plus the window substrate. Derivations use `greyA(pct)` / `whiteA(pct)` / `blackA(pct)` — `color-mix` of the primitive toward transparent.

**SOURCE:** `Pommora/src/renderer/src/design-system/tokens/color.css.ts` · `Pommora/src/shared/theme.ts`

| Title | token | value |
| --- | --- | --- |
| System White | `system.white` · `--system-white` | `#E8E8E8` |
| System Grey | `system.grey` · `--system-grey` | `#71717A` |
| System Black | `system.black` · `--system-black` | `#010101` |
| Window Background | `background.window` · `--bg-window` | `#1A1A1C` (from `@shared/theme` `WINDOW_BG`) |

#### Surfaces

The opaque content planes layered on the window substrate — addressed by role, not shade, and deliberately their own literals rather than derivations. Progressively lifted: primary is the base content layer, tertiary the highest.

**SOURCE:** `Pommora/src/renderer/src/design-system/tokens/color.css.ts`

| Title | token | value |
| --- | --- | --- |
| Surface Primary | `surface.primary` · `--surface-primary` | `#202022` |
| Surface Secondary | `surface.secondary` · `--surface-secondary` | `#2A2A2E` |
| Surface Tertiary | `surface.tertiary` · `--surface-tertiary` | `#3A3A3E` |
| Interaction Field | `inputFieldVar` · `--input-field` | → `fill.quaternary` (system-grey @ 6%) |

#### Labels

The text ladder — system-white at descending presence. Primary is the raw primitive passed through; the rest are opacity steps. Labels ride the near-white so the lightest label still reads over the heaviest fill. One slot is awaited: the inactive/empty-state tone (its interim consumers read tertiary, each marked `Awaiting proper inactive state token`).

**SOURCE:** `Pommora/src/renderer/src/design-system/tokens/color.css.ts`

| Title | token | value |
| --- | --- | --- |
| Label Primary | `label.primary` · `--label-primary` | system-white, no mix (`#E8E8E8`) |
| Label Control | `label.control` · `--label-control` | system-white @ 80% |
| Label Secondary | `label.secondary` · `--label-secondary` | system-white @ 65% |
| Label Tertiary | `label.tertiary` · `--label-tertiary` | system-white @ 35% |

#### States

The interaction states — two grey washes, one black veil, and two opacity dims. Hover and selected are fills painted behind content; muted is painted over it; ghost and disabled are consumed as `opacity:` on the element itself.

**SOURCE:** `Pommora/src/renderer/src/design-system/tokens/color.css.ts` · `tokens/theme-vars.css.ts`

| Title | token | value |
| --- | --- | --- |
| Hover | `state.hover` · `--state-hover` | system-grey @ 2.5% |
| Selected | `state.selected` · `--state-selected` | system-grey @ 5% |
| Muted | `state.muted` · `--state-muted` | system-black @ 10% (a veil, never a text color) |
| Ghost | `--state-ghost` | → `var(--tint-primary)` = 60%, an opacity — the reorder/drag-source fade |
| Disabled | `--state-disabled` | `0.4`, an opacity — the present-but-inert dim |

#### Fills

The five-step system-grey overlay ramp for cards, chips, and fields sitting on a surface — most to least present. Strokes sit above fills: a separator reads harder than the surface it divides.

**SOURCE:** `Pommora/src/renderer/src/design-system/tokens/color.css.ts`

| Title | token | value |
| --- | --- | --- |
| Fill Primary | `fill.primary` · `--fill-primary` | system-grey @ 20% |
| Fill Secondary | `fill.secondary` · `--fill-secondary` | system-grey @ 15% |
| Fill Tertiary | `fill.tertiary` · `--fill-tertiary` | system-grey @ 10% |
| Fill Quaternary | `fill.quaternary` · `--fill-quaternary` | system-grey @ 6% |
| Fill Quinary | `fill.quinary` · `--fill-quinary` | system-grey @ 4% |

#### Tints

The one opacity ladder any base color is mixed at — `tintAt(base, step)` is `color-mix` of the base toward transparent, short-circuiting to the raw base at 100. The chip recipe and the accent strokes both read these steps, so "how strong is a colored thing" has one vocabulary.

**SOURCE:** `Pommora/src/renderer/src/design-system/tokens/tint.ts`

| Title | token | value |
| --- | --- | --- |
| Tint Primary | `TINT_STEPS.primary` · `--tint-primary` | 60% |
| Tint Secondary | `TINT_STEPS.secondary` · `--tint-secondary` | 40% |
| Tint Tertiary | `TINT_STEPS.tertiary` · `--tint-tertiary` | 20% |
| Tint Quaternary | `TINT_STEPS.quaternary` · `--tint-quaternary` | 15% |
| Tint Solid | `TINT_STEPS.solid` · `--tint-solid` | 100% (passes the base through) |

#### Separators

Hairlines and the composed border shorthands built on them, plus the banner's legibility scrim. `separator.line` and `separator.border` currently share one value — `line` is the TS-side spelling, `border` the bridged one.

**SOURCE:** `Pommora/src/renderer/src/design-system/tokens/color.css.ts` · `tokens/theme-vars.css.ts`

| Title | token | value |
| --- | --- | --- |
| Separator Line | `separator.line` | system-grey @ 25% |
| Separator Border | `separator.border` · `--separator-border` | system-grey @ 25% |
| Separator Segment | `separator.segment` · `--separator-segment` | system-grey @ 20% |
| Heading Seam | `--border-heading` | `1.75px solid var(--separator-border)` |
| Box Seam | `--border-cell` | `1.5px solid var(--separator-border)` |
| Banner Scrim | `--banner-shadow` | `#0000008C` |

#### Shadows

The two drop shadows — resting glass and lifted/dragged chrome. Every frost surface ends its box-shadow stack in one of these; nothing hand-rolls its own drop shadow.

**SOURCE:** `Pommora/src/renderer/src/design-system/tokens/color.css.ts`

| Title | token | value |
| --- | --- | --- |
| Standard | `shadowStandardVar` · `--shadow-standard` | `0 8px 25px #00000040` |
| Lift | `shadowLiftVar` · `--shadow-lift` | `0 12px 30px #00000066` |

#### Spectrum

The ten selectable solids plus the neutral chip default — authored once in `@shared/theme` so main and renderer validate the same keys. The accent is a single user value resolved from this palette (or `system`, the OS accent, read at load); accented surfaces derive from `--accent` through the tint steps, so changing the accent recolors everything at once.

**SOURCE:** `Pommora/src/shared/theme.ts` · `tokens/theme-vars.css.ts`

| Title | token | value |
| --- | --- | --- |
| Red | `SPECTRUM.red` · `--solid-red` | `#FF453A` |
| Orange | `SPECTRUM.orange` · `--solid-orange` | `#FF9F0A` |
| Yellow | `SPECTRUM.yellow` · `--solid-yellow` | `#FFD60A` |
| Green | `SPECTRUM.green` · `--solid-green` | `#32D74B` |
| Cobalt | `SPECTRUM.lightBlue` · `--solid-light-blue` | `#7EC8E3` (displays as "Cobalt") |
| Cyan | `SPECTRUM.cyan` · `--solid-cyan` | `#41959F` |
| Blue | `SPECTRUM.blue` · `--solid-blue` | `#0A84FF` |
| Purple | `SPECTRUM.purple` · `--solid-purple` | `#BF5AF2` |
| Lavender | `SPECTRUM.lavender` · `--solid-lavender` | `#A78BCC` |
| Grey | `SPECTRUM.grey` · `--solid-grey` | `#8E8E93` |
| Chip Default | `GREY_DEFAULT` | `#48484A` (TS-only; not bridged) |
| Default Accent | `DEFAULT_ACCENT` | `'lavender'` |
| Accent | `--accent` | runtime — seeded lavender, rewritten by `applyAccent` |
| Accent Fill | `--accent-fill` | accent @ 15% |
| Accent Stroke | `--accent-stroke` / `--accent-stroke-hot` | accent @ 40% / accent @ 60% |
| Link / Connection | `--link` / `--connection` | → `var(--system-accent)` / → `var(--accent)` |
| Error | `--error` | → `SPECTRUM.red` |
| Code | `--code` | red @ 85% toward transparent |

#### Geometry

The glyph ladder, the per-size control bundles, and the bare layout constants JS math consumes as numbers. The disclosure step is one literal every hierarchy derives its per-level inset from — a new disclosing surface reads the token rather than minting its own step.

**SOURCE:** `Pommora/src/renderer/src/design-system/tokens/size.css.ts`

| Title | token | value |
| --- | --- | --- |
| Icon XS / SM / MD / LG / XL | `size.icon.*` · `--icon-xs`…`--icon-xl` | `12px` · `14px` · `16px` · `18px` · `20px` |
| Button Small | `size.control['button-small']` | h `24px` · segment `20px` · padX `4px` · radius `8px` · icon SM |
| Button Medium | `size.control['button-medium']` | h `28px` · segment `24px` · padX `5px` · radius `10px` · icon MD |
| Button Large | `size.control['button-large']` | h `32px` · segment `28px` · padX `8px` · radius `12px` · icon MD |
| Disclosure Indent | `DISCLOSURE_INDENT` · `--disclosure-indent` | `14` |
| Fold Gutter | `FOLD_GUTTER` · `--fold-gutter-base` | `20` |
| Drop-Line Inset | `DROP_LINE_INSET` · `--drop-line-inset` | `2` |
| Tile Minimum | `TILE_MIN_PX` | `64` |

The drag chrome's other two dimensions live beside the inset in the bridge: `--drop-line-thickness` (`2px`) and `--drop-dot-size` (`7px`), with `--drag-line` pointing at the accent. The list-outline rail (`--list-outline-*`: `2px` · segment tone · `999px` · `3px`) is the shared nested-run primitive MarkdownPM's outliner and the grouping hierarchy both consume.

#### Materials

Two distinct glass systems. **Frost** is a CSS `backdrop-filter` recipe — a dimmed blur with a glassy edge — parameterized by `FrostParams` and worn by panes, dropdowns, and the drag ghost; zero-valued edge pieces emit nothing, so an edge-free frost carries no phantom geometry. **Liquid** is Apple "Liquid Glass" — a real edge-refraction shader over the live app — worn by the in-use button controls and on-control segments, whose optics spread from the controls' so the two stay one source. Layout is always the consumer's.

**SOURCE:** `Pommora/src/renderer/src/design-system/materials/glass-pane.tsx` · `materials/glass-material.ts` · `materials/glass-controls.tsx`

| Title | token | PANE_FROST | GHOST_FROST |
| --- | --- | --- | --- |
| Blur | `.blur` | `6` | `6` |
| Brightness | `.brightness` | `90` | `100` |
| Border Alpha | `.borderAlpha` | `0.12` | `0` (no border emitted) |
| Top Specular | `.topSpecular` | `0.35` | `0` |
| Inner Ring | `.innerRing` | `0.08` | `0` |
| Lower Rim / Depth / Rim Blur | `.lowerRim` / `.depth` / `.rimBlur` | `0.08` / `12` / `18` | `0` / `0` / `0` |
| Fill | `.fill` | unset (transparent) | `0.78` of `--bg-window` |
| Shadow | `.shadow` | standard | lift |

The static `frostMaterial` (`glass-material.ts`) is the same recipe at brightness `95%` with the pane edge set. The liquid shader's tuning is `CONTROL_OPTICS` (`glass-controls.tsx`) — depth `0.3`, curvature `0.45`, dispersion `0.25`, frost `3.5`, specular `0.7`, sheen `0.3` at width `12`, map `256` — with `SEGMENT_OPTICS` spreading it at zero depth and brightness.

**Voiding Liquid Glass can't be done in place** — its `backdrop-filter` displacement is a dynamically-generated SVG filter id CSS can neither reconstruct nor interpolate. So the inspector "swallow" renders the pill as a **two-layer** control, a fading glass layer behind a solid bare-button layer, rather than fading one fused control.

**Scrollbars are hidden app-wide** — Electron's default Chromium bar reads heavy and the native auto-hiding overlay isn't reliably available, so scrolling is trackpad and wheel only.

### Component Chrome

The reusable pieces mirror the Figma library, consuming semantic tokens only — this doc governs the tokens and materials they consume, not the roster; a component's own behaviour lives in its spec. The recurring shapes are described rather than recited:

- **Switches and toggles** — the Switch wears the checkbox look at control scale with one disabled dim (`--state-disabled`); dual-option toggles are always switches or the toggleable double-chevron, never dropdown pickers.
- **Chevrons and twisties** — disclosure glyphs ride the fold-chevron mask tokens (`--fold-chevron-mask`, `--code-chevron-mask` — inline SVG masks bridged from theme-vars) at the tertiary label tone, stepping by the disclosure indent.
- **The drag grip** — the six-dot glyph is one masked asset (`--grip-glyph`) shared across module boundaries.
- **The ActionBand** (`Detail/ActionBand.css`) is the shared home for toolbar-row affordances any surface mounts — ViewSegments first, plus the hover-revealed settings button; a segment's collapsible title rides Segmented-Controls' `labelSlot`, written exactly once.
- **The dropdown shell** splits in two: `MenuSurface` is the pane (notched glass, open and retract beats, state-free); `MenuDropdown` is the shell around a trigger (open state, outside-dismiss, anchored surface, optional growth bound). Surface-specific geometry stays with the surface that means it.
- **The drop chrome** — the insertion line, dot, host, and `DragGhost` live in `design-system/interactions` (`dropChrome.css`, `DropLine.tsx`, `DragGhost.tsx`); full spec in `PommoraDND.md`.

### Icons

Icons are **Lucide**, resolved through one `Icon` component against the curated `design-system/symbols` registry. Full spec → `SymbolsPM.md`.

### Showcase

A data-driven design-system site (`npm run showcase`): each leaf iterates its own registry, so a new token group appears by adding one line. It includes a live accent picker and builds to a static site deployed at https://pommora-design-system.vercel.app.

### Where the Rest Lives

The atlas continues in the specs that own each family: the editor's token pockets in `MarkdownPM.md` §Design System, the type ramp in `TypographyPM.md`, motion and the caret/edge-fade/autoscroll mechanisms in `InteractionPM.md`, chips in `PropertiesPM.md`, the card families in `CardViewPM.md`, the table sheet in `TableViewPM.md`, and the preview window's `--ppane-*` contract described in `PagePreviewPM.md`. The stack ladders, shell insets, and per-surface knob bundles stay in code — tunables, not vocabulary.

### Pending

- **Spacing and radius** — no formalized scale; corners and spacing stay ad-hoc literals until they're lifted from Figma (the repeated `999px` pill radius is the first concrete candidate).
- **Light/dark theming** — a future seam; the system is dark-only.
- **Accent editing UI** — deferred; the control surface is the config file.
- **The inactive state token** — the empty-state text tone between secondary and tertiary; its interim consumers are comment-marked.
