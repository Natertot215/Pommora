## Pommora UIX


The Pommora design system — the code counterpart of the Figma library, which leads on design values; synchronization is intended, not guaranteed. This document is its ledger: one section per folder, one row per thing, with *name · export · what it is*. The composite shells built from it — the tile frame, the sidebar, the toolbar, the tab strip — are recorded in [[SurfacePM]], [[InterfacePM]], and [[NavigationPM]]. Values live in §Theme and in code; a subsystem with its own spec ([[InteractionPM]], [[PommoraDND]], [[SymbolsPM]]) keeps its depth there and is pointed at, never restated.

- **Tooling:** Token files are vanilla-extract `*.css.ts`, so a mistyped token is a compile error; `UIX/Theme/theme-vars.css.ts` republishes every token under a stable `--name` for plain CSS, and a token without a bridged var is TS-only. Inter (variable) is the app font. The layer builds as the standalone showcase; `UIX/Utilities/` (`cx` · `clamp` · `pad` · `moveItem`) is a runtime home with no catalog of its own.

- **Conventions:** Pommora heavily *prefers* even-factored scaling for all geometrical applications(2px -> 4px... 12px -> 14px... 20px -> 22px...), while typography scaling is purposefully independent of such convention. 

- **Vocabulary:** Five words name the surfaces. A **Window** is a floating window; a **Pane** is a surface floating over another — the sidebar, the inspector, the side slots, the glance pane, the autocomplete; a **Menu** is a surface hung off a trigger; a **Frame** is one page inside a Menu's or Window's hierarchy — Filter, Group, Sort, Hidden, Layout, Properties, the Settings categories; a **Picker** chooses a value.

### Theme

`UIX/Theme/` — the value source; every token republishes as a `--kebab-name` CSS variable through `theme-vars.css.ts`. `color.css.ts` (`vars`), `theme-vars.css.ts` (`size`, `ICON_PX`, the geometry consts), `typography.css.ts` (`font`, `text`), `stack.ts` (`stack`), `colors.ts` (`tintAt`, `mixAt`, `TINT_STEPS`, `labelColorFor`, `resolveColor`, `WINDOW_BG`), and `ramp.ts` (`cellColor`, `cellPaint`, `cellRing`, `solidColorCss`, `applyAccent`, `ANCHOR_CELLS`, the `RAMP_*` re-exports). The text-insertion vocabulary every editable surface shares lives here as well: `caret.css` and `text-selection.css` hold the caret and selection colors, and `nativeCaret.ts` reads the platform's own blink rate so a drawn caret matches the system one. `index.ts` is the barrel.

#### Primitives

**SOURCE:** `UIX/Theme/color.css.ts` · `UIX/Theme/colors.ts`

| Title             | Token                               | Value     |
| ----------------- | ----------------------------------- | --------- |
| System White      | `system.white`                       | `#E8E8E8` |
| System Grey       | `system.grey`                        | `#71717A` |
| System Black      | `system.black`                       | `#010101` |
| Window Background | `background.window` · `--bg-window` | `#1A1A1C` |

#### Surfaces

| Title             | Token                                       | Value     |
| ----------------- | ------------------------------------------- | --------- |
| Surface Primary   | `surface.primary` · `--surface-primary`     | `#202022` |
| Surface Secondary | `surface.secondary` · `--surface-secondary` | `#2A2A2E` |
| Surface Tertiary  | `surface.tertiary` · `--surface-tertiary`   | `#3A3A3E` |

#### Labels

| Title            | Token                                     | Value               |
| ---------------- | ----------------------------------------- | ------------------- |
| Label Primary    | `label.primary` · `--label-primary`       | `system-white` @ 100% |
| Label Control    | `label.control` · `--label-control`       | `system-white` @ 80% |
| Label Secondary  | `label.secondary` · `--label-secondary`   | `system-white` @ 65% |
| Label Tertiary   | `label.tertiary` · `--label-tertiary`     | `system-white` @ 35% |

#### States

| Title    | Token                                 | Value              |
| -------- | ------------------------------------- | ------------------ |
| Hover    | `state.hover` · `--state-hover`       | `system-grey` @ 2.5% |
| Selected | `state.selected` · `--state-selected` | `system-grey` @ 5% |
| Muted    | `state.muted` · `--state-muted`       | `system-black` @ 10% |
| Ghost    | `STATE_OPACITY.ghost` · `--state-ghost`       | `0.65`             |
| Inactive | `STATE_OPACITY.inactive` · `--state-inactive` | `0.55`             |

#### Fills

| Title           | Token                                   | Value               |
| --------------- | --------------------------------------- | ------------------- |
| Fill Primary    | `fill.primary` · `--fill-primary`       | `system-grey` @ 20% |
| Fill Secondary  | `fill.secondary` · `--fill-secondary`   | `system-grey` @ 15% |
| Fill Tertiary   | `fill.tertiary` · `--fill-tertiary`     | `system-grey` @ 10% |
| Fill Quaternary | `fill.quaternary` · `--fill-quaternary` | `system-grey` @ 6%  |
| Fill Quinary    | `fill.quinary` · `--fill-quinary`       | `system-grey` @ 4%  |

#### Tints

**SOURCE:** `UIX/Theme/colors.ts`

`tintAt(base, step)` mixes a base toward transparent; `mixAt` toward anything. A consumer names a step rather than its percentage, and the mix reaches CSS carrying the step's var, so the ladder stays live: retuning a step here re-tints every surface that names it. 

| Title           | Token                                         | Value |
| --------------- | --------------------------------------------- | ----- |
| Tint Solid      | `TINT_STEPS.solid` · `--tint-solid`           | 100%  |
| Tint Primary    | `TINT_STEPS.primary` · `--tint-primary`       | 60%   |
| Tint Secondary  | `TINT_STEPS.secondary` · `--tint-secondary`   | 40%   |
| Tint Tertiary   | `TINT_STEPS.tertiary` · `--tint-tertiary`     | 20%   |
| Tint Quaternary | `TINT_STEPS.quaternary` · `--tint-quaternary` | 15%   |

#### Borders


| Title        | Token                             | Value               |
| ------------ | --------------------------------- | ------------------- |
| Border Base  | `border.base` · `--border-base`   | `system-grey` @ 25% |
| Border Light | `border.light` · `--border-light` | `system-grey` @ 20% |
| Border Faint | `border.faint` · `--border-faint` | `system-grey` @ 15  |
| Width 100    | `--width-100`                     | `1px`               |
| Width 125    | `--width-125`                     | `1.25px`            |
| Width 150    | `--width-150`                     | `1.5px`             |
| Width 175    | `--width-175`                     | `1.75px`            |
| Width 200    | `--width-200`                     | `2px`               |

#### Shadows

| Title  | Token                                 | Value                   |
| ------ | ------------------------------------- | ----------------------- |
| Base   | `shadowStandardVar` · `--shadow-base` | `0 8px 25px #00000040`  |
| Strong | `shadowLiftVar` · `--shadow-strong`   | `0 12px 30px #00000065` |

#### Fades

The over-scroll edge-dissolve widths a scrollable surface names on `--over-scroll-fade`; the OverScroll primitive reads that to fade a row out as it leaves the viewport. A floating window sets its own dynamically, to its toolbar's height, so content dissolves exactly under the toolbar.

| Title       | Token           | Value  | Role                                          |
| ----------- | --------------- | ------ | --------------------------------------------- |
| Fade Light  | `--fade-light`  | `12px` | a small control (the text picker)             |
| Fade Base   | `--fade-base`   | `16px` | the common case — lists, tabs, pickers, cards |
| Fade Strong | `--fade-strong` | `20px` | cell overflow (the chip run)                  |
| Fade Heavy  | `--fade-heavy`  | `24px` | a detail surface (the sidebar)                |

#### Spectrum

**SOURCE:** `UIX/Theme/colors.ts`

Authored once, validated by main and renderer alike; the accent resolves from it (or the OS accent) at runtime. `DEFAULT_ACCENT` sits in `UIX/Theme/colors.ts`.

| Title             | Token                                       | Value                                      |
| ----------------- | ------------------------------------------- | ------------------------------------------ |
| Red               | `SPECTRUM.red`                              | `#FF453A`                                  |
| Orange            | `SPECTRUM.orange` · `--solid-orange`        | `#FF9F0A`                                  |
| Yellow            | `SPECTRUM.yellow` · `--solid-yellow`        | `#FFD60A`                                  |
| Green             | `SPECTRUM.green` · `--solid-green`          | `#32D74B`                                  |
| Light Blue        | `SPECTRUM.lightBlue` · `--solid-light-blue` | `#7EC8E3`                                  |
| Cyan              | `SPECTRUM.cyan` · `--solid-cyan`            | `#41959F`                                  |
| Blue              | `SPECTRUM.blue`                             | `#0A84FF`                                  |
| Purple            | `SPECTRUM.purple` · `--solid-purple`        | `#7852EE`                                  |
| Lavender          | `SPECTRUM.lavender`    | `#A78BCC`                                  |
| Pink              | `SPECTRUM.pink`                             | `#EF7697`                                  |
| Grey              | `SPECTRUM.grey`            | `#8E8E93`                                  |
| Default           | `GREY_DEFAULT`                              | `#48484A`                                  |
| Default Accent    | `DEFAULT_ACCENT`                            | `cyan`                                     |
| Accent            | `--accent`                                  | `applyAccent`                              |
| Accent Fill       | `--accent-fill`                             | accent @ 15%                               |
| Accent Stroke     | `--accent-stroke` / `--accent-stroke-hot`   | accent @ 40% / accent @ 60%                |
| Drop Slot         | `--drop-slot-fill`                          | accent @ 20%                               |
| Link / Connection | `--link` / `--connection`                   | `var(--system-accent)` / → `var(--accent)` |
| Error             | `--error`                                   | `SPECTRUM.red`                             |
| Code              | `--code`                                    | `--solid-red` @ 85%                        |

#### Ramp

**SOURCE:** `UIX/Theme/ramp.ts`

Eight families × eight steps, dark to light, each spectrum solid seated on an exact cell. The three constants below are the file's own, not exports; the ramp is read through `cellColor` / `cellPaint` / `cellRing`.

| Title         | Token           | Value                                                  |
| ------------- | --------------- | ------------------------------------------------------ |
| Shading Step  | `RAMP_STEP`     | `15`                                                   |
| Darkness Step | `DARKNESS_STEP` | `15`                                                   |
| Grey Outlines | `GREY_OUTLINES` | `35` · `45` · `55` · `65` · `75` · `85` · `95` · `100` |

#### Geometry

**SOURCE:** `UIX/Theme/theme-vars.css.ts` · `Core/Interface/styles.css` · `UIX/Menus/menu-base.css.ts`

| Title             | Token                                                                                              | Value                                                                                                                                                                                                                                                                                                     |
| ----------------- | -------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Icon Ladder       | `size.icon.*` · `ICON_PX` · `--icon-body`                                                          | Ten steps named as the type ramp is — `titleLarge` `26px` · `titleMedium` `22px` · `titleSmall` `17px` · `headline` `15px` · `body` `13px` · `callout` `12px` · `control` `12px` · `caption` `11px` · `footnote` `10px` · `subline` `10px`; only the body step is also a CSS var, for the editor's glyphs |
| Pill Radius       | `--radius-full`                                                                                    | `999px`                                                                                                                                                                                                                                                                                                   |
| Disclosure Indent | `DISCLOSURE_INDENT` · `--disclosure-indent`                                                        | `14px`                                                                                                                                                                                                                                                                                                    |
| Content Inset     | `--content-inset`                                                                                  | `24px` — the gutter page text keeps off a pane (`styles.css`)                                                                                                                                                                                                                                             |
| Content Edge      | `--content-edge`                                                                                   | `12px` — the band a banner title and the Subfield sit in, off the pane (`styles.css`)                                                                                                                                                                                                                     |
| Surface Lane      | `--surface-lane`                                                                                   | `8px` — the tighter lane a dashboard's tiles run in (`styles.css`)                                                                                                                                                                                                                                        |
| Pane Clearance    | `--sidebar-clearance` · `--inspector-clearance`                                                    | `--app-inset` + the pane's width, `0px` when the pane is away; a consumer pads `calc(clearance + gap)` with one of the three gaps above (`styles.css`)                                                                                                                                                    |
| Shell Bands       | `--toolbar-h` · `--subfield-h`                                                                     | `38px` · `24px` — the toolbar strip and the Subfield bar; the window footer reads the latter (`styles.css`)                                                                                                                                                                                               |
| App Inset         | `--app-inset` · `--app-radius`                                                                     | `6px` · `12px` — a floating glass pane's gap from the window edge, and its corner (`styles.css`)                                                                                                                                                                                                          |
| Surface Inset     | `--surface-inset`                                                                                  | `10px` — glass edge → content, inside a menu, side pane, the inspector, or a window toolbar (`styles.css`)                                                                                                                                                                                                |
| Row Tokens        | `--row-pad-standard` · `--row-pad-compact`                                                         | `6px` · `4px` — a row's padding in its two densities, taken on both axes; a row's height is never declared, it is the ramp's line plus the pair (`UIX/Menus/menu-base.css.ts`)                                                                                                                            |
| Row Vars          | `--row-pad-y` · `--row-pad-x` · `--row-pad-lead` · `--row-pad-trail` · `--row-size` · `--row-line` | What a surface sets to size every row inside it — `menuCompact` on a pane sets the Compact pair and the control ramp; a NavList column sets `--row-pad-lead: var(--content-inset)`; a row with a trailing cluster sets `--row-pad-trail: 0`                                                               |
| Content Start     | `--content-start` · `--content-start-right`                                                        | `calc(clearance + --content-edge)` on each side — where a page's chrome starts: the banner title, the Subfield, NavView's head and rows (`styles.css`)                                                                                                                                                    |
| Rail Inset        | `--rail-inset-base` · `--rail-inset`                                                               | `20px` — the grip / fold-chevron lane the editor, tables, and tiles share                                                                                                                                                                                                                                 |
| Drop Line         | `--drop-line-thickness` · `--drop-dot-size` · `DROP_LINE_INSET`                                    | `2px` · `7px` · `2px`                                                                                                                                                                                                                                                                                     |
| List Outline      | `--list-outline-width` · `--list-outline-gap` · `--list-outline-radius`                            | `2px` · `3px` · segment tone · pill radius                                                                                                                                                                                                                                                                |
| Park              | `--park-clearance`                                                                                 | `14px`                                                                                                                                                                                                                                                                                                    |
| Tile              | `TILE_MIN_PX` · `TILE_DEFAULT_PX` · `TILE_GAP_PX`                                                  | `64px` · `320px` · `4px`                                                                                                                                                                                                                                                                                  |

#### Typography

**SOURCE:** `UIX/Theme/typography.css.ts`

Inter, variable. `text.<style>.<variant>` composes size and line height from the style with weight from the variant: Standard `400` · Emphasized `500` · Semibold `600` · Bold `700`, tracking pinned to `0`. The body-and-down sizes follow the macOS AppKit scale drawn in Inter; the container-title family (`titleLarge`/`Medium`/`Small`) is Pommora's own.

| Style        | Token              | Size / Line     | Character                                            |
| ------------ | ------------------ | --------------- | ---------------------------------------------------- |
| Title Large  | `text.titleLarge`  | `28px` / `32px` | Container title — over an editor banner              |
| Title Medium | `text.titleMedium` | `24px` / `28px` | Container title — the bare page header               |
| Title Small  | `text.titleSmall`  | `20px` / `24px` | Container title — over a Banner cover                |
| Headline     | `text.headline`    | `15px` / `20px` | The smallest heading step; the one 15px style        |
| Body         | `text.body`        | `13px` / `16px` | The standard content size; carries the row primitive |
| Callout      | `text.callout`     | `12px` / `15px` | A step under body — headers and ancillary labels     |
| Control      | `text.control`     | `12px` / `15px` | Labels and control chrome                            |
| Caption      | `text.caption`     | `11px` / `14px` | The secondary line under a title                     |
| Footnote     | `text.footnote`    | `10px` / `13px` | Small details or accessories                         |
| Subline      | `text.subline`     | `10px` / `12px` | Footnote’ssize on a tighter line box                 |

Where each goes: menu and sidebar rows → Body (Standard) or Control (Compact, every row inside a picker pane); menu headings and settings section headings → Footnote / Emphasized · tertiary (uppercase in Settings); the "All Properties" action row → Footnote / Emphasized · secondary; the TopRow → Caption / Emphasized; row sub-label → Caption, trailing detail → Footnote / Emphasized, a control's value → Control (both at Footnote inside a footing); frame header → Callout / Emphasized; table column headers → Callout / Semibold; chips → Control / Semibold; on-control labels → Control / Emphasized; picker, segmented, and tab labels → Control; card titles → Body / Semibold; the Subfield → Subline / Emphasized; a NavTrail → Caption · secondary wherever it appears, except inside the Subfield and a path field, which keep their own register.

### Animations

`UIX/Animations/` — the one motion source: the ladder, the two curves, the drag feel, the Bloom keyframes, the enter/exit primitives, and the pane slide. [[InteractionPM]] describes the named motions.

| Title     | Export                                                                        | What it is                                                                                                   |
| --------- | ----------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| Durations | `duration.fast/menu/base/slow` · `--duration-*` · `ms()`                      | `180ms` · `225ms` · `280ms` · `350ms`; `ms` reads one as a number.                                           |
| Ease      | `easing.baseEase` · `--ease-base`                                             | `ease` — the everyday curve.                                                                                 |
| Snap      | `easing.baseSnap` · `--ease-snap`                                             | `cubic-bezier(0.22, 1, 0.36, 1)` — the decelerate drag and tiles ride.                                       |
| Feel      | `DEFAULT_FEEL` · `GLIDE_FEEL`                                                 | Duration + snap as numbers for the drag engine — the `menu` and `slow` rungs.                                |
| Bloom     | `menuBloom` · `menuBloomClosing` · `bloomOpen` · `bloomClose` · `titleReveal` | The menu open/close keyframes at the `slow` and `menu` rungs.                                                |
| Window    | `windowIn` · `windowOut`                                                      | The floating window's scale-fade open and withdraw on the `fast` rung — the confirmation modal takes it too. |
| Reveal    | `Reveal`                                                                      | The `0fr ↔ 1fr` body open/close on the `fast` rung.                                                          |
| PaneSlide | `paneSlide`                                                                   | A docked pane's in-out motion — the `--io` overlay park or the in-flow reflow, by side and mode.             |
| Exit      | `useExitPresence`                                                             | Keeps a surface mounted through its close; the held forms also keep the value it was showing.                |

### Buttons

`UIX/Buttons/` — the one button recipe. `Button` is `type` × `size` × content (icon · icon + label · label), with `outline` as an inset ring and the `revealOnHover` / `ghostRest` modifiers; hover on every button, and `pressed` for a toggle whose menu is open.

**Button Types** — one `--button-fill` / `--button-ink` / `--button-outline` triple per row; the hover is `state.hover` laid over the fill.

| Type        | Fill                          | Text                         |
| ----------- | ----------------------------- | ---------------------------- |
| Base        | none                          | inherits                     |
| Tinted      | accent @ `--tint-tertiary`    | accent                       |
| Solid       | accent @ `--tint-primary`     | `--label-primary`            |
| Filled      | `--fill-tertiary`             | `--label-primary`            |
| Destructive | `--error` @ `--tint-tertiary` | `--error` @ `--tint-primary` |

**Button Sizes** — the `SIZE` scale in `UIX/Buttons/button-base.css.ts`, worn as the `size` class's `--btn-*` bundle; icon-only buttons take the ladder, labeled buttons take the bundle's label inset.

| Title | Key | Value |
| ---------- | ------------------- | ----------------------------------------------------------------------- |
| Inline | `button-inline` | h `20px` · segment `18px` · padX `2px` · label padX `4px` · radius `4px` · icon `control` — the row affordances |
| Small | `button-small` | h `24px` · segment `20px` · padX `4px` · label padX `12px` · radius `6px` · icon `body` |
| Medium | `button-medium` | h `28px` · segment `24px` · padX `6px` · label padX `10px` · radius `10px` · icon `headline` |
| Large | `button-large` | h `32px` · segment `28px` · padX `8px` · label padX `12px` · radius `12px` · icon `headline` |

### Cards

`UIX/Cards/` — `Card.tsx` · `cards.css`. The card chassis every card surface wears — the Navigation gallery and CardView. `CardRoot` (drag shell; `is-locked` gives the cover `--thumb-share` of the height and the title the rest, the default reflows below a `--card-thumb-h` band; `is-active` wears the accent stroke) → `CardBody` (frame, hover-pop) → `CardThumb` (`is-capture` marks a captured preview, zoomed by `--card-preview-zoom`; `CardPlaceholder` when there is none) / `CardText` → `CardTitle` (body-semibold; scroll, wrap, or static) · `CardTrail`. `.card-grid` is the shared grid — auto-fit, or `is-fill` to hold empty tracks.

### Controls

`UIX/Controls/` — the single-purpose interactive pieces: the two switches, the Slider, and `checkbox.css` the Checkbox's chrome.

| Title       | Export        | What it is                                                                                                                                            |
| ----------- | ------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| Segmented   | `Segmented`   | N Buttons of one type divided by `segment`; `glass` for the toolbar.                                                                                  |
| Checkbox    | `Checkbox`    | The app's one checkbox — `size` (standard/compact), a `filled` wash, a `color` override, and a `readOnly` glyph form; on the accent or a chosen cell. |
| DualSwitch  | `DualSwitch`  | A boolean toggle with a sliding glass segment.                                                                                                        |
| ColorSwatch | `ColorSwatch` | The switch shape holding a color, anchoring a ColorPicker.                                                                                            |
| Slider      | `Slider`      | Sliding number selection.                                                                                                                             |

### Elements

`UIX/Elements/` — the atomic bits every surface composes; each is a style sheet and, where needed, a component beside it.

| Title       | Export                                                         | What it is                                                                                                                                                                                                                               |
| ----------- | -------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| NavTrail    | `NavTrail` · `NavTrailProps` · `TrailSegment` · `pathSegments` | An entity's location as a chevron-divided run of icon + title segments — inert, selectable, or a navigable path with a dimmed ghost tail; `variant` reads it as a dim location or a bright `option`, and `selected` pops the final stop. |
| Segment     | `segment`                                                      | The between-values pill — `--segment-width` / `--segment-color` override it.                                                                                                                                                             |
| ProgressBar | `ProgressBar`                                                  | A determinate bar on the accent.                                                                                                                                                                                                         |
| EyeToggle   | `EyeToggle` · `EYE_ICON`                                       | The visibility eye — the current state's glyph at rest, the toggle previewed on hover.                                                                                                                                                   |
| EmptyValue  | `EmptyValue`                                                   | The one "nothing here yet" mark for value slots.                                                                                                                                                                                         |

The elements that draw and frame a stored image — `AssetImage`, `ImagePicker`, and the `imageAspect.ts` aspect cache — are `Core/Assets/`, since each reaches the store for what it draws.

### Fields

`UIX/Fields/` — the input surfaces and the runs that sit inside them; `SegmentRun.tsx` lives here because a run of values is a field's content, not a label's.

| Title          | Export                                                                                                                                                                            | What it is                                                                                                                                                                                                    |
| -------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| InputField     | `InputField` · `FieldEdit`                                                                                                                                                        | The field box — `boxed` or `bordered` chrome.                                                                                                                                                                 |
| PathField      | `PathField` · `BrowseButton`                                                                                                                                                      | A folder path in a bordered field — the path as a trail, typed in place or chosen through the trailing browse; `BrowseButton` is that trailing action alone, for a field showing a file rather than a folder. |
| SegmentRun     | `SegmentRun` · `SegmentEntry` · `SEGMENT_INDEX_ATTR`                                                                                                                              | Values standing side by side inside a field; segment-divided.                                                                                                                                                 |
| Chrome         | `field` · `input` · `borderedField` · `base` · `search` · `draftInput` · `editable` · `contentRow` · `leading` · `trailing` · `autoSizeInput` · `autoSizeMirror` · `autoSizeWrap` | Boxed, raw caret, bordered, chromeless, the search look, the draft and editable states, the content row with its leading and trailing slots, and the auto-sizing input trio.                                  |
| Ring           | `fieldRing()` · `focusRing()` · `errorRing()` · `ROW_RING`                                                                                                                        | One inset-shadow channel; presets set its color.                                                                                                                                                              |
| Placeholder    | `placeholder`                                                                                                                                                                     | The ghost-text tone.                                                                                                                                                                                          |
| SearchField    | `SearchField` · `SEARCH_PLACEHOLDER`                                                                                                                                              | The controlled filter input the list surfaces share.                                                                                                                                                          |
| EditableInput  | `EditableInput`                                                                                                                                                                   | Enter commits, Escape abandons, blur settles.                                                                                                                                                                 |
| RenamableLabel | `RenamableLabel`                                                                                                                                                                  | The inline-rename swap.                                                                                                                                                                                       |

### Glass

`UIX/Glass/` — the material: one recipe in four tiers, brightest and clearest first, behind one barrel. **Frost** is a CSS `backdrop-filter` recipe parameterized by `FrostParams` in `glass-base.tsx`; `glass-pane.tsx`, `glass-surface.tsx`, and `glass-window.tsx` are its three tiers; `glass-control.tsx` is **Liquid**, a real edge-refraction shader (`@samasante/liquid-glass`) worn by the in-use controls.

| Title         | Export                                        | What it is                                                                                                                                                    |
| ------------- | --------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| GlassPane     | `GlassPane` · `paneMaterial`                  | The clear chrome-pane tier — the sidebar, the inspector, and the side slots.                                                                                  |
| Surface       | `Surface`                                     | GlassPane as the app root, the floating overlay over the main view.                                                                                           |
| GlassSurface  | `GlassSurface` · `SURFACE_FROST`              | A Menu floating over a pane, a step dimmer — menus, pickers; `solid` when it opens over another surface, and opt-in `notch` for the beaked dropdown geometry. |
| GlassWindow   | `GlassWindow` · `WINDOW_FROST`                | The surface carrying the 90% `--bg-window` body — every floating window and the image picker.                                                                 |
| Ghost         | `GHOST_FROST`                                 | The edge-free frost the drag chip wears.                                                                                                                      |
| Frost engine  | `frostStyle` · `SOLID_FILL` · `OUTLINE_INSET` | The recipe itself, the window fill share, and the acted-on edge inset.                                                                                        |
| Beak geometry | `notchGeometry` · `BEAK_RADIUS`               | The opt-in notched outline `GlassSurface`'s `notch` clips and strokes.                                                                                        |
| GlassControls | `GlassControls` · `CONTROL_OPTICS`            | Liquid glass on the button controls.                                                                                                                          |
| GlassSegment  | `GlassSegment`                                | Liquid glass on the small on-control segments.                                                                                                                |

| Visual | SURFACE_FROST | WINDOW_FROST         | GHOST_FROST |
| ---------------- | ---------- | -------------------- | ----------- |
| Blur             | `6`        | `6`                  | `6`         |
| Saturate         | `100`      | `100`                | `100`       |
| Brightness       | `90`       | `90`                 | `100`       |
| Border Alpha     | `0.12`     | `0.12`               | `0`         |
| Top Specular     | `0.35`     | `0.35`               | `0`         |
| Inner Ring       | `0.08`     | `0.08`               | `0`         |
| Lower Rim / Depth / Rim Blur | `0.08` / `12` / `18` | `0.08` / `12` / `18` | `0` / `0` / `0` |
| Fill             | unset      | `--bg-window` @ 90%  | `--bg-window` @ 78% |
| Shadow           | standard   | standard             | lift        |

`--glass-outline` re-colors any tier's edge while it is being driven (a resize in flight, an active embed).

### Interactions

`UIX/Interactions/` — the content-agnostic pointer, scroll, and drag layer; fields and labels depend down into it, nothing reaches up.

| Title        | Export                                                  | What it is                                             |
| ------------ | ------------------------------------------------------- | ------------------------------------------------------ |
| Drag engine  | `SortableZone` · `DragGroup` · `GroupZone` · `useDragItem` · `useGroupedDragItem` · `reorder` · `arraySwap` | The in-house DND. |
| Zone engine  | `Zone` · `useZoneItem` · `reflow`                       | The layout engine beneath the sortable zone (`engine.tsx`). |
| Drop chrome  | `DropLine` · `DragGhost` · `.drop-slot` · `drop-chrome.css` · `ghost-create.css` | The insertion line, dot, the landing slot, and the glass drag chip. |
| Disclose     | `beginDragDisclose` · `registerDiscloseTarget`          | Hover-open while dragging.                             |
| Snapshot     | `useDragSnapshot`                                       | The list held still for a drag's duration.             |
| Gesture      | `usePointerGesture` · `beginPointerGesture`             | Press, threshold, move, release.                       |
| Autoscroll   | `armAutoScroll` · `scrollGlide` · `AUTOSCROLL_KNOBS`    | Edge-proximity scrolling and the glide to a destination. |
| Keyboard     | `keyboardNext` · `onActivateClick` · `onActivateKey` · `announce` | Arrow stepping, Enter/Space activation, live-region announcements. |
| OverScroll   | `OverScroll`                                            | Overflow fades at the hidden edge, scrolls under the pointer. |
| HoverRemove  | `HoverRemove` · `hoverRemoveHost`                       | The hover-revealed ×, with the label-tail melt.        |
| Resize frame | `useResizeFrame` · `onScreen` · `resize-frame.css`     | Drag-to-size and drag-to-move for any box: the handles, the strips, and the outline tint. |
| Reveal bar   | `useRevealNear` · `reveal-bar.css`                      | A control shown as the pointer nears an edge.          |

### Labels

`UIX/Labels/` — `Label.tsx`, `label-base.css.ts` (the axes), `recipes.tsx` and `label-recipes.css.ts`.

| Title      | Export                       | What it is                                                              |
| ---------- | ---------------------------- | ----------------------------------------------------------------------- |
| Label      | `Label`                      | The axis-composed primitive every named label is a recipe over.         |
| Shapes     | `shape.pill/tag` · `optionShapeFor` | Rounded status default · squared value, resolved per type. Compact is either rendered icon-only. |
| Tint       | `tinted`                     | Fill, outline and text mixed off `--label-base` — a surface wanting a color chip sets that one var. |
| Treatments | `fill` · `outline`           | Named only where a label differs from its tint.                         |
| Palette    | `labelColor.*`               | One variant per ramp cell naming its base, plus `default` and `accent`. |
| NeutralChip | `NeutralChip`               | A neutral-ground tag chip — color on border and text.                   |
| FileChip   | `FileChip`                   | A file property's value — a tag with a tertiary outline, no fill.       |
| FileLabel  | `FileLabel`                  | A file or folder name inside a field, no chrome.                        |

### Menus

`UIX/Menus/` — the menu recipe: the shell a trigger hangs, the rows inside it, the frame chassis, and the slide between frames. `menu-base.tsx` is the trigger shell, `menu-surface.tsx` a thin pass-through onto `GlassSurface`'s `notch` opt-in for the beaked surface, `menu-row.tsx` the rows, `menu-disclosure.tsx` the folding row over `listed-outline.css.ts`'s chevron-and-rail styles, `menuAnchor.ts` the placement, `frameGrowth.ts` and `frame-slide.tsx` the frame chassis; each carries its `.css.ts` beside it, and `menu-base.css.ts` holds the row vocabulary's styles.

| Title          | Export                                                                                                                                                                                                                         | What it is                                                                                                                                                                                                                                               |
| -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Menu           | `Menu` · `MenuItem` · `MenuSeparator` · `MenuCaption` · `MenuTopRow` · `MenuFooting`                                                                                                                                           | The row kinds, in the order a menu stacks: TopRow, heading, item, action row, separator, caption, footing. `MenuItem` carries `leading` · title · `subLabel` · `value` · `detail` · `trailing` · `overlay`, and `inert` for a box that is not clickable. |
| Row classes    | `rowBox` · `rowShell` · `item` · `menuCompact` · `heading` · `headingCaps` · `actionRow` · `topRow` · `footing` · `overlay` · `value` · `detail` · `rowDragging` · `AccessoryButton` · `FooterLockButton` · `FooterIconButton` | The box every row wears (first in the stylesheet, so a variant's own properties win), the hover/focus shell, and the kinds as classes; `menuCompact` on a pane switches every row inside it; `overlay` seats a pin or checkbox in the lead inset.        |
| Index          | `MenuIndex` · `MenuRowView` · `MenuRow` · `MenuSection` · `Trailing`                                                                                                                                                           | A menu as data — sections of rows, each row's trailing control named once (chevron · value · switch · button · slider · picker · color · field)                                                                                                          |
| Scroll frame   | `MenuScrollFrame` · `MENU_MAX_HEIGHT`                                                                                                                                                                                          | The one capped overflow region with its fade.                                                                                                                                                                                                            |
| Listed outline | `dropOutline` · `dropOutlineOpen` · `dropOutlineSpacer` · `railRow`                                                                                                                                                            | The fold chevron and the rail that descends from its center, on `--disclosure-rail-x` (`listed-outline.css.ts`).                                                                                                                                         |
| DisclosureRow  | `DisclosureRow` · `useDisclosureSet` · `DropOutlineKind`                                                                                                                                                                       | A folding row on the listed outline.                                                                                                                                                                                                                     |
| MenuSurface    | `MenuSurface`                                                                                                                                                                                                                  | The beaked surface the large toolbar menu hangs off a button.                                                                                                                                                                                            |
| MenuDropdown   | `MenuDropdown`                                                                                                                                                                                                                 | The shell around a trigger — open state, dismiss, growth bound.                                                                                                                                                                                          |
| Anchor         | `menuAnchor` · `MenuPlacement` · `MENU_GAP`                                                                                                                                                                                    | Where a menu sits against its trigger.                                                                                                                                                                                                                   |
| Growth         | `growToContent`                                                                                                                                                                                                                | The measured height a menu grows to.                                                                                                                                                                                                                     |
| FrameSlide     | `FrameSlide`                                                                                                                                                                                                                   | The two-slot push and back between a menu's frames.                                                                                                                                                                                                      |

### Pickers

| Title | Export | What it is |
| ------------- | -------------------- | ------------------------------------------------------------------- |
| PickerMenu | `PickerMenu` · `PickerRow` | The rectangle every menu, dropdown panel, and picker mounts — anchoring to an element or a bare point, the collision flip decided once per open, dismissal, focus, the scroll cap. |
| CalendarPicker | `CalendarPicker` | Date and time selection. |
| ColorPicker | `ColorPicker` | The 8×8 ramp grid; clicking the selected cell clears. |
| IconPicker | `IconPicker` · `IconFavorites` | The searchable glyph grid with a reorderable favorites strip; the app binds favorites through `UIX/Pickers/IconPicker`. |
| TextPicker | `TextPicker` | A typed-value picker in the shared pane. |
| PickerControl | `PickerControl` · `labelOf` · `PickerOption` | The double-chevron picker: two options toggle in place; three or more open the list through the menu door the app supplies on `MenuDoorContext`; right-clicks write values into the field. |

### Symbols

`UIX/Symbols/` — `Icon` and the curated registry (`icons`, `IconName`, `entityIcon`), `allSymbols.ts` (`searchIcons`), `fileTypes.ts` (`fileTypeIcon`), `customGlyphs.tsx`, `masks.ts` (the grip, fold-chevron, and link glyphs as CSS masks), and the name helpers `asIconName` · `asRenderableIcon` · `iconNameOr` with the `DEFAULT_NEXUS_ICON` / `DEFAULT_ENTITY_ICONS` defaults.

### Table

`UIX/Table/` — `table.css` · `table-tokens.css`. The tabular chrome every table surface uses (TableView, the Trash): the column-header band with `.col-header` segment bars (`.table-segment` puts the bar on any element), row and column hairlines, the column drag and resize strips, `no-borders`, and the cell content types.

### Utilities

`UIX/Utilities/` — `cx` · `clamp` · `pad` · `moveItem` · `capMap` · `checkSet`, with no catalog beyond this line. The two writers that put runtime values on the root live with what they compute: `applyAccent` in `UIX/Theme/ramp.ts` and `applyPersonalization` in `Core/Settings/applyPersonalization.ts`.

### Windows

`UIX/Windows/` — the floating window surface every in-app window mounts; its own dimensions — toolbar height, side-pane widths, footer height, the trailing-control slide — are custom properties in `window-base.css` a host may retune. `WindowActions.tsx` is the trailing control cluster, `window-panel.tsx` the side-panel slot, and `windowBounds.ts` the geometry.

#### Known Issues

- **Voiding Liquid Glass can't be done in place** — its displacement filter is a generated SVG ID CSS can't interpolate, so the inspector "swallow" renders the pill as a fading glass layer behind a solid bare layer.
- **Scrollbars are hidden app-wide** — Chromium's default bar reads heavy and the auto-hiding overlay isn't reliable, so scrolling is trackpad and wheel only.

#### Pending

- **Spacing and radius** — spacing stays literal on the even grid by ruling; radius has `--radius-full` and `--app-radius`, and the button ladder's `4/6/10/12` in `UIX/Buttons/button-base.css.ts`; a feature site picks from that set.
- **Light/dark theming** — the system is dark-only.
- **An inactive label tone** — the empty-state text color between secondary and tertiary; interim consumers read tertiary. (The `--state-inactive` opacity above is a different thing.)
- **Type** — no tracking scale, no Markdown element mapping, no multi-line clamp.
