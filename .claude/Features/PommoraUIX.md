## Pommora UIX


The Pommora design system — the code counterpart of the Figma library, which leads on design values; synchronization is intended, not guaranteed. This document is its ledger: one section per folder, one row per thing, with *name · export · what it is*. The composite shells built from it — the tile frame, the sidebar, the toolbar, the tab strip — are recorded in [[SurfacePM]], [[InterfacePM]], and [[NavigationPM]]. Values live in §Theme and in code; a subsystem with its own spec ([[InteractionPM]], [[PommoraDND]], [[SymbolsPM]]) keeps its depth there and is pointed at, never restated.

- **Tooling:** Token files are vanilla-extract `*.css.ts`, so a mistyped token is a compile error; `UIX/Theme/theme-vars.css.ts` republishes every token under a stable `--name` for plain CSS, and a token without a bridged var is TS-only. Inter (variable) is the app font. The layer builds as the standalone showcase page in `Dashboard/`; `UIX/Utilities/` is a runtime home with no catalog of its own.

- **Conventions:** Pommora heavily *prefers* even-factored scaling for all geometrical applications(2px -> 4px... 12px -> 14px... 20px -> 22px...), while typography scaling is purposefully independent of such convention. 

- **Vocabulary:** Five words name the surfaces. A **Window** is a floating window; a **Pane** is a surface floating over another — the sidebar, the SidePane, the side slots, the glance pane, the autocomplete; a **Menu** is a surface hung off a trigger; a **Frame** is one page inside a Menu's or Window's hierarchy — Filter, Group, Sort, Hidden, Layout, Properties, the Settings categories; a **Picker** chooses a value.

### Theme

`UIX/Theme/` — the value source; every token republishes as a `--kebab-name` CSS variable through `theme-vars.css.ts`. `color.css.ts` (`vars`), `theme-vars.css.ts` (`size`, `ICON_PX`, the geometry consts), `typography.css.ts` (`font`, `text`), `stack.ts` (`stack`), `colors.ts` (`tintAt`, `mixAt`, `TINT_STEPS`, `RAMP_FAMILIES`, `RAMP_STEPS`, `ColorName`, `WINDOW_BG`), and `ramp.ts` (`cellColor`, `colorNameFor`, `resolveColor`, `cellPaint`, `cellRing`, `solidColorCss`, `applyAccent`, `ANCHOR_CELLS`). The text-insertion vocabulary every editable surface shares lives here as well: `caret.css` holds the drawn caret's and selection's look, and `nativeCaret.ts` paints both over the native text fields. `index.ts` is the barrel.

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
| Ghost    | `STATE_OPACITY.ghost` · `--state-ghost` · `revealDim` | `0.65`             |
| Inactive | `STATE_OPACITY.inactive` · `--state-inactive` | `0.50`             |

#### Fills

| Title           | Token                                   | Value               |
| --------------- | --------------------------------------- | ------------------- |
| Fill Primary    | `fill.primary` · `--fill-primary`       | `system-grey` @ 20% |
| Fill Secondary  | `fill.secondary`                        | `system-grey` @ 15% |
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
| Base   | `shadowBaseVar` · `--shadow-base`     | `0 8px 25px #00000040`  |
| Strong | `shadowStrongVar` · `--shadow-strong` | `0 12px 30px #00000065` |

#### Fades

The scroll-fade edge-dissolve widths a scrollable surface names on `--scroll-fade`; the `scroll-fade` class reads that to fade a row out as it leaves the viewport. A floating window's body takes the larger of its toolbar's height and the fade's own default, so content dissolves across the toolbar where one exists and along a plain edge where it doesn't.

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
| Accent            | `--accent`                                  | `var(--system-accent)` · the Accent Color setting |
| Accent Fill       | `--accent-fill`                             | accent @ 15%                               |
| Accent Stroke     | `--accent-stroke` / `--accent-stroke-hot`   | accent @ 40% / accent @ 60%                |
| Drop Slot         | `--drop-slot-fill`                          | accent @ 20%                               |
| Link / Connection / Highlight | `--link` / `--connection` / `--highlight`   | `var(--system-accent)` / → `var(--accent)` / → `var(--accent)` |
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

**SOURCE:** `UIX/Theme/theme-vars.css.ts` · `UIX/Utilities/tileMetrics.ts` · `Core/Interface/styles.css` · `UIX/Menus/menu-row.css.ts` · `UIX/Interactions/reveal-bar.css`

| Title             | Token                                                                                              | Value                                                                                                                                                                                                                                                                 |
| ----------------- | -------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Icon Ladder       | `size.icon.*` · `ICON_PX` · `--icon-body`                                                          | Eight steps named as the type ramp is — `titleLarge` `26px` · `titleMedium` `22px` · `titleSmall` `17px` · `headline` `15px` · `body` `13px` · `control` `12px` · `caption` `11px` · `footnote` `10px`; only the body step is also a CSS var, for the editor's glyphs |
| Pill Radius       | `--radius-full`                                                                                    | `999px`                                                                                                                                                                                                                                                               |
| Disclosure Indent | `DISCLOSURE_INDENT` · `--disclosure-indent`                                                        | `14px`                                                                                                                                                                                                                                                                |
| Content Inset     | `--content-inset`                                                                                  | `24px` — the gutter page text keeps off a pane (`styles.css`)                                                                                                                                                                                                         |
| Content Edge      | `--content-edge`                                                                                   | `12px` — the inset a banner title and the Subfield sit in, off the pane (`styles.css`)                                                                                                                                                                                 |
| Surface Lane      | `--surface-lane`                                                                                   | `8px` — the tighter lane a dashboard's tiles run in (`styles.css`)                                                                                                                                                                                                    |
| Pane Clearance    | `--sidebar-clearance` · `--side-pane-clearance`                                                    | `--app-inset` + the pane's width, `0px` when the pane is away or inside a floating window; `.interface-inset` pads both sides by the clearance plus `--interface-inset`, one of the three gaps above (`styles.css` · `interface.css`)                                 |
| Pane Slide        | `--pane-slide`                                                                                     | `--duration-base`, and `0s` while a pane is resized — the duration of every transition that follows a pane's edge (`styles.css`)                                                                                                                                      |
| Shell Bars        | `--toolbar-h` · `--reveal-bar-h`                                                                   | `38px` · `24px` — the toolbar strip (`styles.css`) and the reveal bar the Subfield and the window footer share (`reveal-bar.css`)                                                                                                                                    |
| App Inset         | `--app-inset` · `--app-radius`                                                                     | `6px` · `12px` — a floating glass pane's gap from the window edge, and its corner (`theme-vars.css.ts`)                                                                                                                                                              |
| Surface Inset     | `--surface-inset`                                                                                  | `10px` — glass edge → content, inside a menu, a window's side panel, the SidePane, or a window toolbar (`theme-vars.css.ts`)                                                                                                                                         |
| Row Tokens        | `--row-pad-standard` · `--row-pad-compact`                                                         | `6px` · `4px` — a row's padding in its two densities, taken on both axes; a row's height is never declared, it is the ramp's line plus the pair (`UIX/Menus/menu-row.css.ts`)                                                                                         |
| Row Vars          | `--row-pad-y` · `--row-pad-x` · `--row-pad-lead` · `--row-pad-trail` · `--row-size` · `--row-line` | What a surface sets to size every row inside it — `menuCompact` on a pane sets the Compact pair and the control ramp; a NavList column sets `--row-pad-lead: var(--content-inset)`; a row with a trailing cluster sets `--row-pad-trail: 0`                           |
| Content Start     | `--content-start` · `--content-start-right`                                                        | `calc(clearance + --content-edge)` on each side — where a page's chrome starts: the banner title and NavView's head and rows (`styles.css`)                                                                                                                           |
| Inset Start       | `--inset-start` · `--inset-start-right`                                                            | `calc(clearance + --content-inset)` on each side — where a page's text starts: the page header, its divider, and a searchable banner title (`styles.css`)                                                                                                             |
| Rail Inset        | `--rail-inset-base` · `--rail-inset`                                                               | `20px` — the grip / fold-chevron lane the editor, tables, and tiles share                                                                                                                                                                                             |
| Drop Line         | `--drop-line-thickness` · `--drop-dot-size` · `DROP_LINE_INSET`                                    | `2px` · `7px` · `2px`                                                                                                                                                                                                                                                 |
| List Outline      | `--list-outline-width` · `--list-outline-gap` · `--list-outline-radius`                            | `2px` · `3px` · segment tone · pill radius                                                                                                                                                                                                                            |
| Park              | `--park-clearance`                                                                                 | `14px`                                                                                                                                                                                                                                                                |
| Tile              | `TILE_MIN_PX` · `TILE_DEFAULT_PX` · `TILE_GAP_PX`                                                  | `64px` · `320px` · `4px`                                                                                                                                                                                                                                              |

#### Typography

**SOURCE:** `UIX/Theme/typography.css.ts`

Inter, variable. `text.<style>.<variant>` composes size and line height from the style with weight from the variant: Standard `400` · Emphasized `500` · Semibold `600`, tracking pinned to `0`. The body-and-down sizes follow the macOS AppKit scale drawn in Inter; the container-title family (`titleLarge`/`Medium`/`Small`) is Pommora's own.

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

| Title     | Export                                                                        | What it is                                                                                                                                               |
| --------- | ----------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Durations | `duration.fast/menu/base/slow` · `--duration-*` · `ms()`                      | `180ms` · `225ms` · `280ms` · `350ms`; `ms` reads one as a number.                                                                                       |
| Ease      | `easing.baseEase` · `--ease-base`                                             | `ease` — the everyday curve.                                                                                                                             |
| Snap      | `easing.baseSnap` · `--ease-snap`                                             | `cubic-bezier(0.22, 1, 0.36, 1)` — the decelerate drag and tiles ride.                                                                                   |
| Feel      | `DEFAULT_FEEL` · `GLIDE_FEEL`                                                 | Duration + snap as numbers for the drag engine — the `menu` and `slow` rungs.                                                                            |
| Bloom     | `menuBloom` · `menuBloomClosing` · `bloomOpen` · `bloomClose` · `titleReveal` | The menu open/close keyframes at the `slow` and `menu` rungs.                                                                                            |
| Window    | `windowIn` · `windowOut`                                                      | The floating window's scale-fade open and withdraw on the `fast` rung — the confirmation modal takes it too.                                             |
| Reveal    | `Reveal`                                                                      | The `0fr ↔ 1fr` body open/close on the `fast` rung.                                                                                                      |
| PaneSlide | `paneSlide`                                                                   | A docked pane's in-out motion — the `--io` overlay park or the in-flow reflow, by side and mode.                                                         |
| Exit      | `useExitPresence` · `useSettleFallback`                                       | Keeps a surface mounted through its close, and settles an end-event wait whose transition never runs; the held forms also keep the value it was showing. |

### Buttons

`UIX/Buttons/` — the one button recipe. `Button` is `type` × `size` × content (icon · icon + label · label), with `outline` as an inset ring and `reveal` making it a hover-reveal target; hover on every button, and `pressed` for a toggle whose menu is open.

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
| Segmented   | `Segmented`   | N Buttons of one type divided by `segment`; `glass` for the toolbar, and `trailingDivider` to close the run on one more divider.                                                                                  |
| Checkbox    | `Checkbox`    | The app's one checkbox — `size` (standard/compact), a `filled` wash, a `color` override, and a `readOnly` glyph form; on the Nexus's checkbox color or a chosen cell. |
| DualSwitch  | `DualSwitch`  | A boolean toggle with a sliding glass knob, with the checkbox's `color` and `readOnly`.                                                                                                        |
| ColorSwatch | `ColorSwatch` | The switch shape holding a color, anchoring a ColorPicker.                                                                                            |
| Slider      | `Slider`      | Sliding number selection.                                                                                                                             |

### Elements

`UIX/Elements/` — the atomic bits every surface composes; each is a style sheet and, where needed, a component beside it.

| Title       | Export                                                         | What it is                                                                                                                                                                                                                               |
| ----------- | -------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| NavTrail    | `NavTrail` · `NavTrailProps` · `TrailSegment` · `pathSegments` | An entity's location as a chevron-divided run of icon + title segments — inert, selectable, or a navigable path with a dimmed ghost tail; `variant` reads it as a dim location or a bright `option`, and `selected` pops the final stop. |
| Segment     | `segment` · `Segments`                                         | The between-values divider — `--segment-width` overrides it; `Segments` draws it between a run of parts that wraps as one line of text.                                                                                                  |
| ProgressBar | `ProgressBar` · `paintProgress`                                | A determinate bar on the accent; `paintProgress` drives one every frame without a render.                                                                                                                                                                                                       |
| EyeToggle   | `EyeToggle`                                                    | The visibility eye — the current state's glyph at rest, the toggle previewed on hover.                                                                                                                                                   |
| RenderBoundary | `RenderBoundary` | A region's guard against a drawing error: a throw inside draws nothing there, retried when `resetKey` changes, and the rest of the window keeps drawing. |
| EmptyValue  | `EmptyValue`                                                   | The one "nothing here yet" mark for value slots.                                                                                                                                                                                         |
| View Strip  | `viewStrip` · `viewPill` · `VIEW_PILL_H` · `VIEW_PILL_ICON`    | The View Tile's view switcher: the row and the pills in it, a view's own color landing on `--view-pill-stroke`.                                                                                                                          |

The elements that draw and frame a stored image — `AssetImage`, `ImagePicker`, and the `imageAspect.ts` aspect cache — are `Core/Assets/`, since each reaches the store for what it draws.

### Fields

`UIX/Fields/` — the input surfaces and the runs that sit inside them; `FieldRun.tsx` lives here because a run of values is a field's content, not a label's.

| Title          | Export                                                                                                                                                                            | What it is                                                                                                                                                                                                    |
| -------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| InputField     | `InputField` · `FieldEdit`                                                                                                                                                        | The field box — `boxed` or `bordered` chrome.                                                                                                                                                                 |
| PathField      | `PathField` · `BrowseButton`                                                                                                                                                      | A folder path in a bordered field — the path as a trail, typed in place or chosen through the trailing browse; `BrowseButton` is that trailing action alone, for a field showing a file rather than a folder. |
| FieldRun       | `FieldRun` · `RunEntry`                                                                                                                                      | Values standing side by side inside a field; segment-divided.                                                                                                                                                 |
| Chrome         | `field` · `input` · `borderedField` · `base` · `search` · `draftInput` · `editable` · `contentRow` · `leading` · `trailing` · `autoSizeInput` · `autoSizeMirror` · `autoSizeWrap` | Boxed, raw caret, bordered, chromeless, the search look, the draft and editable states, the content row with its leading and trailing slots, and the auto-sizing input trio.                                  |
| Ring           | `fieldRing()` · `focusRing()` · `errorRing()` · `ROW_RING`                                                                                                                        | One inset-shadow channel; presets set its color.                                                                                                                                                              |
| Placeholder    | `placeholder`                                                                                                                                                                     | The ghost-text tone.                                                                                                                                                                                          |
| SearchField    | `SearchField`                                                                                                                                                                     | The controlled filter input the list surfaces share, carrying the one "Search…" placeholder; Escape leaves the field with its query kept.                                                                     |
| EditableInput  | `EditableInput`                                                                                                                                                                   | Enter and blur commit; Escape, or the field closing mid-edit, keeps the existing text; `invalid` dims text that won't commit.                                                                                  |
| RenamableLabel | `RenamableLabel`                                                                                                                                                                  | The inline-rename swap.                                                                                                                                                                                       |

### Glass

`UIX/Glass/` — the material: one recipe in four tiers, brightest and clearest first, behind one barrel. **Frost** is a CSS `backdrop-filter` recipe parameterized by `FrostParams` in `glassBase.ts`; `GlassPane.tsx`, `GlassSurface.tsx`, and `GlassWindow.tsx` are its three tiers; `GlassControl.tsx` is **Liquid**, a real edge-refraction shader (`@samasante/liquid-glass`) worn by the in-use controls.

| Title         | Export                                        | What it is                                                                                                                                                    |
| ------------- | --------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| GlassPane     | `GlassPane` · `paneMaterial`                  | The clear chrome-pane tier — the sidebar, the SidePane, and the side slots.                                                                                  |
| GlassSurface  | `GlassSurface` · `SURFACE_FROST`              | A Menu floating over a pane, a step dimmer — menus, pickers; `solid` when it opens over another surface, and opt-in `notch` for the beaked dropdown geometry. |
| GlassWindow   | `GlassWindow` · `WINDOW_FROST`                | The surface carrying the 90% `--bg-window` body — every floating window and the image picker.                                                                 |
| Ghost         | `GHOST_FROST`                                 | The edge-free frost the drag chip wears.                                                                                                                      |
| Frost engine  | `frostStyle` · `GLASS_EDGE`                   | The recipe itself, and the resting frost's edge color, which the Matrix node ring also wears.                                                                 |
| Beak geometry | `notchGeometry` · `BEAK_RADIUS`               | The opt-in notched outline `GlassSurface`'s `notch` clips and strokes.                                                                                        |
| GlassControl  | `GlassControl` · `CONTROL_OPTICS`             | Liquid glass on the button controls, and with `knob` on the switch and slider knob.                                                                           |

| Visual | SURFACE_FROST | WINDOW_FROST         | GHOST_FROST |
| ---------------- | ---------- | -------------------- | ----------- |
| Blur             | `6`        | `6`                  | `6`         |
| Brightness       | `90`       | `90`                 | `100`       |
| Border Alpha     | `0.12`     | `0.12`               | `0`         |
| Top Specular     | `0.35`     | `0.35`               | `0`         |
| Inner Ring       | `0.08`     | `0.08`               | `0`         |
| Lower Rim / Depth / Rim Blur | `0.08` / `12` / `18` | `0.08` / `12` / `18` | `0` / `0` / `0` |
| Fill             | unset      | `--bg-window` @ 90%  | `--bg-window` @ 75% |
| Shadow           | standard   | standard             | lift        |

`--glass-outline` re-colors any tier's edge while it is being driven (a resize in flight, an active embed).

### Interactions

`UIX/Interactions/` — the content-agnostic pointer, scroll, and drag layer; fields and labels depend down into it, nothing reaches up.

| Title        | Export                                                  | What it is                                             |
| ------------ | ------------------------------------------------------- | ------------------------------------------------------ |
| Drag engine  | `DragGroup` · `SortableZone` · `useDragItem` · `reorder` | The in-house DND: one engine (`engine.tsx`) behind the `drag.ts` façade. |
| Drop chrome  | `DropLine` · `DragGhost` · `.drop-slot` · `drop-chrome.css` · `ghost-create.css` | The insertion line, dot, the landing slot, and the glass drag chip. |
| Disclose     | `beginDragDisclose` · `useDiscloseTarget`               | Hover-open while dragging.                             |
| Gesture      | `usePointerGesture` · `beginPointerGesture`             | Press, threshold, move, release.                       |
| Autoscroll   | `armAutoScroll` · `scrollGlide` · `AUTOSCROLL_KNOBS`    | Edge-proximity scrolling and the glide to a destination. |
| Keyboard     | `keyboardNext` · `onActivateClick` · `onActivateKey` · `announce` | Arrow stepping, Enter/Space activation, live-region announcements. |
| OverScroll   | `OverScroll`                                            | Overflow fades at the hidden edge, scrolls under the pointer. |
| HoverRemove  | `HoverRemove` · `hoverRemoveHost`                       | The hover-revealed ×, with the label-tail melt.        |
| Resizable    | `useResizable` · `onScreen` · `resizable.css`          | Drag-to-size and drag-to-move for any box: the handles, the strips, and the outline tint. |
| Hover Reveal | `revealTarget` · `revealDim` · `useHoverReveal` · `withinReach` · `useRevealNear` | A control shown on its host's hover or focus, after a dwell, or as the pointer comes within reach; `data-reveal-host` scopes each reveal to its nearest host. |
| Reveal bar   | `reveal-bar.css`                                        | The edge-docked toggles and their bars: a host marks its bars `.reveal-bar`, its toggles `.reveal-toggle`, its trailing toggle `data-reveal-trail`, and its leading toggle `data-reveal-lead`. |

### Labels

`UIX/Labels/` — `Label.tsx`, `label-base.css.ts` (the axes), `recipes.tsx` and `label-recipes.css.ts`.

| Title      | Export                       | What it is                                                              |
| ---------- | ---------------------------- | ----------------------------------------------------------------------- |
| Label      | `Label`                      | The axis-composed primitive every named label is a recipe over.         |
| Shapes     | `shape.pill/tag` · `optionShapeFor` | Rounded status default · squared value, resolved per type. Compact is either rendered icon-only. |
| Tint       | `tinted`                     | Fill, outline and text mixed off `--label-base` — a surface wanting a color chip sets that one var. |
| Treatments | `fill` · `outline`           | Named only where a label differs from its tint.                         |
| Palette    | `labelColor.*`               | One variant per ramp cell naming its base, plus `default`.              |
| NeutralChip | `NeutralChip`               | A neutral-ground tag chip — color on border and text.                   |
| FileChip   | `FileChip`                   | A file property's value — a tag with a tertiary outline, no fill.       |
| PlainLabel | `PlainLabel`                 | A name inside a field, no chrome.                                       |

### Menus

`UIX/Menus/` — the menu recipe: the shell a trigger hangs, the rows inside it, the frame chassis, and the slide between frames. `MenuDropdown.tsx` is the trigger shell, `MenuSurface.tsx` a thin pass-through onto `GlassSurface`'s `notch` opt-in for the beaked surface, `MenuRows.tsx` the rows, `DisclosureRow.tsx` the folding row over `listed-outline.css.ts`'s chevron-and-rail styles, `menuAnchor.ts` the placement, `frameGrowth.ts` and `FrameSlide.tsx` the frame chassis; and `menu-row.css.ts` holds the row vocabulary's styles.

| Title          | Export                                                                                                                                                                                                                         | What it is                                                                                                                                                                                                                                               |
| -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Menu           | `Menu` · `MenuItem` · `MenuSeparator` · `MenuCaption` · `MenuTopRow` · `MenuFooting`                                                                                                                                           | The row kinds, in the order a menu stacks: TopRow, heading, item, action row, separator, caption, footing. `MenuItem` carries `leading` · title · `subLabel` · `detail` · `trailing` · `overlay`, `inert` for a box that is not clickable, `checked` for a pick-list row's check mark, and `centered` for a list of chips. |
| Row classes    | `rowBox` · `rowShell` · `item` · `menuCompact` · `heading` · `headingCaps` · `actionRow` · `topRow` · `footing` · `overlay` · `detail` · `rowDragging` · `AccessoryButton` · `FooterLockButton` · `FooterIconButton` | The box every row wears (first in the stylesheet, so a variant's own properties win), the hover/focus shell, and the kinds as classes; `menuCompact` on a pane switches every row inside it; `overlay` seats a pin or checkbox in the lead inset.        |
| Index          | `MenuIndex` · `MenuRowView` · `MenuRow` · `MenuSection` · `Trailing` · `pickerRow` · `steppedRow`                                                                                                                                                           | A menu as data — sections of rows, each row's trailing control named once (chevron · switch · button · slider · picker · color · field); `pickerRow` and `steppedRow` build the two the frames reach for most, taking the row's look as one argument                                                                                                          |
| Match          | `emphasizeMatch` · `matchText` | A searched row's label with its typed match emphasized. |
| Scroll frame   | `MenuScrollFrame` · `MENU_MAX_HEIGHT`                                                                                                                                                                                          | The one capped overflow region with its fade.                                                                                                                                                                                                            |
| Listed outline | `dropOutline` · `dropOutlineOpen` · `dropOutlineSpacer` · `railRow`                                                                                                                                                            | The fold chevron and the rail that descends from its center, on `--disclosure-rail-x` (`listed-outline.css.ts`).                                                                                                                                         |
| DisclosureRow  | `DisclosureRow` · `useDisclosureSet` · `DropOutline`                                                                                                                                                                           | A folding row on the listed outline.                                                                                                                                                                                                                     |
| MenuSurface    | `MenuSurface`                                                                                                                                                                                                                  | The beaked surface the large toolbar menu hangs off a button.                                                                                                                                                                                            |
| MenuDropdown   | `MenuDropdown`                                                                                                                                                                                                                 | The shell around a trigger — open state, dismiss, growth bound.                                                                                                                                                                                          |
| Anchor         | `menuAnchor` · `MenuPlacement` · `MENU_GAP`                                                                                                                                                                                    | Where a menu sits against its trigger.                                                                                                                                                                                                                   |
| Growth         | `growToContent`                                                                                                                                                                                                                | The measured height a menu grows to.                                                                                                                                                                                                                     |
| FrameSlide     | `FrameSlide`                                                                                                                                                                                                                   | The two-slot push and back between a menu's frames.                                                                                                                                                                                                      |

### Pickers

| Title | Export | What it is |
| ------------- | -------------------- | ------------------------------------------------------------------- |
| PickerMenu | `PickerMenu` | The rectangle every menu, dropdown panel, and picker mounts — anchoring to an element or a bare point, the collision flip decided once per open, dismissal, focus, and an opt-in resize from its free edges (`usePaneResize`).                   |
| CalendarPicker | `CalendarPicker` | Date and time selection. |
| ColorPicker | `ColorPicker` | The 8×8 ramp grid; clicking the selected cell clears. |
| IconPicker | `IconPicker` · `IconFavorites` | The searchable glyph grid with a reorderable icon-favorites strip; the app binds icon favorites through `UIX/Pickers/IconPicker`. |
| TextPicker | `TextPicker` | A typed-value picker in the shared pane. |
| PickerControl | `PickerControl` · `setMenuDoor` · `steppedPickerProps` · `PickerOption` · `NumberUnit` · `unitLabel` · `numberFrom` | The double-chevron picker: two options toggle in place; three or more open the list through the menu door the app registers with `setMenuDoor`; right-clicks write values into the field, and with no options a left press does too. `numberFrom` reads typed text as a number. `steppedPickerProps` builds a stepped number picker in any unit. |

### Symbols

`UIX/Symbols/` — `Icon` and the curated registry (`icons`, `IconName`), `allSymbols.ts` (`searchIcons`), `fileTypes.ts` (`fileTypeIcon`), `customGlyphs.tsx`, `masks.ts` (the grip, fold-chevron, and link glyphs as CSS masks), `symbols.css.ts`, `LockGlyph` (the lock's two faces in one cell, cross-fading between them), and the name helpers `asRenderableIcon` · `iconNameOr`.

### Table

`UIX/Table/` — `table.css` · `table-tokens.css`. The tabular chrome every table surface uses (TableView, the Trash): the column-header band with `.col-header` segment bars (`.table-divider` puts the bar on any element), row and column hairlines, the column drag and resize strips, `no-borders`, and the cell content types.

### Utilities

`UIX/Utilities/` — `cx` · `clamp` (with the `NumberRange` and `steppedRange` vocabulary for bounded numbers) · `pad` · `moveItem` · `capMap` · `checkSet` · `tileMetrics`, with no catalog beyond this line. The two writers that put runtime values on the root live with what they compute: `applyAccent` in `UIX/Theme/ramp.ts` and `applyPersonalization` in `Core/Settings/applyPersonalization.ts`.

### Windows

`UIX/Windows/` — the floating window surface every in-app window mounts; its own dimensions — toolbar height, side-pane widths, footer height, the trailing-control slide — are custom properties in `window-base.css` a host may retune. `WindowActions.tsx` is the trailing control cluster, `WindowPanel.tsx` the side-panel slot, and `windowBounds.ts` the geometry.

#### Known Issues

- **Voiding Liquid Glass can't be done in place** — its displacement filter is a generated SVG ID CSS can't interpolate, so the SidePane "swallow" renders the pill as a fading glass layer behind a solid bare layer.
- **Scrollbars are hidden app-wide** — Chromium's default bar reads heavy and the auto-hiding overlay isn't reliable, so scrolling is trackpad and wheel only.

#### Pending

- **Spacing and radius** — both stay literal by ruling: spacing on the even grid, and radius apart from `--radius-full`, `--app-radius`, and the button ladder's `4/6/10/12` in `UIX/Buttons/button-base.css.ts`.
- **Light/dark theming** — the system is dark-only.
- **An inactive label tone** — the empty-state text color between secondary and tertiary; interim consumers read tertiary. (The `--state-inactive` opacity above is a different thing.)
- **Type** — no tracking scale, no Markdown element mapping, no multi-line clamp.
