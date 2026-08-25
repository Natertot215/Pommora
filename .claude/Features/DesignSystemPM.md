## Design System

```
Design System
├── Token Atlas
│   ├── Primitives · Surfaces · Labels · States · Fills · Tints · Separators · Shadows · Spectrum · Ramp · Geometry
│   └── Typography
├── Materials
├── Labels & Chips
├── Elements
├── Components
│   ├── Controls
│   ├── Pickers
│   ├── Menu
│   └── Fields
├── Detail
├── Interaction
├── Animation
├── Symbols
├── Showcase
├── Known Issues
└── Pending
```

The Pommora design system — the code mirror of the Figma "Pommora - React" library, which is canonical for design values. It lives in `src/renderer/src/DesignSystem/`, and this document is its ledger: one section per folder, one row per thing, with *name · export · what it is*. Values live in the Token Atlas and in code; a subsystem with its own spec ([[InteractionPM]], [[PommoraDND]], [[SymbolsPM]]) keeps its depth there and is pointed at, never restated.

**Tooling.** Token files are vanilla-extract `*.css.ts`, so a mistyped token is a compile error; `Tokens/theme-vars.css.ts` republishes every token under a stable `--name` for plain CSS, and a token without a bridged var is TS-only. Inter (variable) is the app font. The layer is app-agnostic: only `Tokens/` and `Theming/` import from `@shared`, nothing imports the store or IPC, and the whole tree builds as the standalone showcase. `Theming/` (`applyAccent` · `applyPersonalization`) and `Util/` (`cx` · `clamp` · `pad` · `moveItem`) are runtime homes with no catalog of their own.

### Token Atlas

`Tokens/` — the value source. `color.css.ts` (`vars`), `size.css.ts` (`size`, `ICON_PX`, the geometry consts), `typography.css.ts` (`font`, `text`), `stack.ts` (`stack`), `tint.ts` (`tint`, `tintAt`, `mixAt`, `TINT_STEPS`), `ramp.ts` (`cellColor`, `cellTint`, `cellRing`, `checkboxTint`, `ANCHOR_CELLS`, the `RAMP_*` re-exports), `colorMap.ts` (`labelColorFor`), `card-tokens.css` (the card family's geometry), and the `theme-vars.css.ts` bridge. `index.ts` is the barrel.

#### Primitives

**SOURCE:** `Tokens/color.css.ts` · `Pommora/src/shared/theme.ts`

| Title             | Token                               | Value     |
| ----------------- | ----------------------------------- | --------- |
| System White      | `system.white` · `--system-white`   | `#E8E8E8` |
| System Grey       | `system.grey` · `--system-grey`     | `#71717A` |
| System Black      | `system.black` · `--system-black`   | `#010101` |
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
| Label Quaternary | `label.quaternary` · `--label-quaternary` | `system-white`@ 20% |

#### States

| Title    | Token                                 | Value              |
| -------- | ------------------------------------- | ------------------ |
| Hover    | `state.hover` · `--state-hover`       | `system-grey` @ 2.5% |
| Selected | `state.selected` · `--state-selected` | `system-grey` @ 5% |
| Muted    | `state.muted` · `--state-muted`       | `system-black` @ 10% |
| Drag     | `STATE_OPACITY.drag` · `--state-drag`         | `0.85`             |
| Ghost    | `STATE_OPACITY.ghost` · `--state-ghost`       | `0.65`             |
| Inactive | `STATE_OPACITY.inactive` · `--state-inactive` | `0.55`             |

Hover and selected paint behind content, muted over it; the three opacities are worn as `opacity:` by the element itself.

#### Fills

| Title           | Token                                   | Value             |
| --------------- | --------------------------------------- | ----------------- |
| Fill Primary    | `fill.primary` · `--fill-primary`       | `system-grey` @ 20% |
| Fill Secondary  | `fill.secondary` · `--fill-secondary`   | `system-grey` @ 15% |
| Fill Tertiary   | `fill.tertiary` · `--fill-tertiary`     | `system-grey` @ 10% |
| Fill Quaternary | `fill.quaternary` · `--fill-quaternary` | `system-grey` @ 6% |
| Fill Quinary    | `fill.quinary` · `--fill-quinary`       | `system-grey` @ 4% |

#### Tints

**SOURCE:** `Tokens/tint.ts` — `tintAt(base, step)` mixes a base toward transparent; `mixAt` toward anything.

| Title           | Token                                         | Value |
| --------------- | --------------------------------------------- | ----- |
| Tint Solid      | `TINT_STEPS.solid` · `--tint-solid`           | 100%  |
| Tint Primary    | `TINT_STEPS.primary` · `--tint-primary`       | 60%   |
| Tint Secondary  | `TINT_STEPS.secondary` · `--tint-secondary`   | 40%   |
| Tint Tertiary   | `TINT_STEPS.tertiary` · `--tint-tertiary`     | 20%   |
| Tint Quaternary | `TINT_STEPS.quaternary` · `--tint-quaternary` | 15%   |

#### Separators

| Title             | Token                                       | Value                                  |
| ----------------- | ------------------------------------------- | -------------------------------------- |
| Separator Border  | `separator.border` · `--separator-border`   | system-grey @ 25%                      |
| Separator Segment | `separator.segment` · `--separator-segment` | system-grey @ 20%                      |
| Heading Seam      | `--border-heading`                          | `1.75px solid var(--separator-border)` |
| Box Seam          | `--border-cell`                             | `1.5px solid var(--separator-border)`  |
| Section Seam      | `--border-segment`                          | `1px solid var(--separator-segment)`   |
| Banner Scrim      | `BANNER_SHADOW` · `--banner-shadow`         | `#0000008C`                            |

#### Shadows

| Title    | Token                                     | Value                   |
| -------- | ----------------------------------------- | ----------------------- |
| Standard | `shadowStandardVar` · `--shadow-standard` | `0 8px 25px #00000040`  |
| Lift     | `shadowLiftVar` · `--shadow-lift`         | `0 12px 30px #00000066` |

#### Spectrum

**SOURCE:** `Pommora/src/shared/theme.ts` — authored once, validated by main and renderer alike; the accent resolves from it (or the OS accent) at runtime.

| Title             | Token                                       | Value                                      |
| ----------------- | ------------------------------------------- | ------------------------------------------ |
| Red               | `SPECTRUM.red` · `--solid-red`              | `#FF453A`                                  |
| Orange            | `SPECTRUM.orange` · `--solid-orange`        | `#FF9F0A`                                  |
| Yellow            | `SPECTRUM.yellow` · `--solid-yellow`        | `#FFD60A`                                  |
| Green             | `SPECTRUM.green` · `--solid-green`          | `#32D74B`                                  |
| Light Blue        | `SPECTRUM.lightBlue` · `--solid-light-blue` | `#7EC8E3`                                  |
| Cyan              | `SPECTRUM.cyan` · `--solid-cyan`            | `#41959F`                                  |
| Blue              | `SPECTRUM.blue` · `--solid-blue`            | `#0A84FF`                                  |
| Purple            | `SPECTRUM.purple` · `--solid-purple`        | `#BF5AF2`                                  |
| Lavender          | `SPECTRUM.lavender` · `--solid-lavender`    | `#A78BCC`                                  |
| Grey              | `SPECTRUM.grey` · `--solid-grey`            | `#8E8E93`                                  |
| Default           | `GREY_DEFAULT`                              | `#48484A`                                  |
| Pink              | `PINK`                                      | `#DC519F`                                  |
| Default Accent    | `DEFAULT_ACCENT`                            | `cyan`                                     |
| Accent            | `--accent`                                  | `applyAccent`                              |
| Accent Fill       | `--accent-fill`                             | accent @ 15%                               |
| Accent Stroke     | `--accent-stroke` / `--accent-stroke-hot`   | accent @ 40% / accent @ 60%                |
| Link / Connection | `--link` / `--connection`                   | `var(--system-accent)` / → `var(--accent)` |
| Error             | `--error`                                   | `SPECTRUM.red`                             |
| Code              | `--code`                                    | `--solid-red` @ 85%                        |

#### Ramp

**SOURCE:** `Tokens/ramp.ts` — eight families × eight steps, dark to light, each spectrum solid seated on an exact cell.

| Title         | Token           | Value                                                  |
| ------------- | --------------- | ------------------------------------------------------ |
| Shading Step  | `RAMP_STEP`     | `15`                                                   |
| Darkness Step | `DARKNESS_STEP` | `15`                                                   |
| Grey Outlines | `GREY_OUTLINES` | `35` · `45` · `55` · `65` · `75` · `85` · `95` · `100` |

#### Geometry

**SOURCE:** `Tokens/size.css.ts`

| Title             | Token                                          | Value                                                             |
| ----------------- | ---------------------------------------------- | ----------------------------------------------------------------- |
| Icon Ladder       | `size.icon.*` · `--icon-*` · `ICON_PX`         | Eleven steps named for the type ramp — `largeTitle` `26px` → `subline` `10px` |
| Pill Radius       | `RADIUS_FULL` · `--radius-full`                | `999px`                                                           |
| Container Title   | `CONTAINER_TITLE_SIZE` · `--container-title-size` | `20px`                                                         |
| Disclosure Indent | `DISCLOSURE_INDENT` · `--disclosure-indent`    | `14px`                                                            |
| Fold Gutter       | `FOLD_GUTTER` · `--fold-gutter-base`           | `20px`                                                            |
| Drop Line         | `DROP_LINE_THICKNESS` · `DROP_DOT_SIZE` · `DROP_LINE_INSET` | `2px` · `7px` · `2px`                                |
| List Outline      | `LIST_OUTLINE_WIDTH` · `LIST_OUTLINE_GAP` · `--list-outline-*` | `2px` · `3px` · segment tone · pill radius        |
| Park / Close      | `PARK_CLEARANCE` · `CLOSE_CLEARANCE`           | `14px` · `30px`                                                   |
| Tile              | `TILE_MIN_PX` · `TILE_DEFAULT_PX` · `TILE_GAP_PX` | `64px` · `320px` · `4px`                                       |

#### Typography

**SOURCE:** `Tokens/typography.css.ts` — Inter, variable. `text.<style>.<variant>` composes size and line height from the style with weight from the variant: Standard `400` · Emphasized `500` · Semibold `600` · Bold `700`, tracking pinned to `0`. The sizes are the macOS AppKit scale drawn in Inter; **Control** and **Subline** are renamed for what they drive here.

| Style       | Token             | Size / Line     | Character                                            |
| ----------- | ----------------- | --------------- | ---------------------------------------------------- |
| Large Title | `text.largeTitle` | `26px` / `32px` | display step                                         |
| Title 1     | `text.title1`     | `22px` / `26px` | display step                                         |
| Title 2     | `text.title2`     | `17px` / `22px` | display step                                         |
| Title 3     | `text.title3`     | `15px` / `20px` | the smallest display step                            |
| Headline    | `text.headline`   | `13px` / `16px` | body-size heading — distinct by weight, not scale    |
| Body        | `text.body`       | `13px` / `16px` | the standard content size; carries the row primitive |
| Callout     | `text.callout`    | `12px` / `15px` | a step under body — headers and ancillary labels     |
| Control     | `text.control`    | `12px` / `15px` | chips and control chrome                             |
| Caption     | `text.caption`    | `11px` / `14px` | the secondary line under a title                     |
| Footnote    | `text.footnote`   | `10px` / `13px` | small detail                                         |
| Subline     | `text.subline`    | `10px` / `12px` | footnote's size on a tighter line box                |

Where each goes: menu, dropdown, and sidebar rows → Body; menu headings → Headline / Emphasized; row sub-label → Caption, trailing detail → Footnote / Emphasized; pane header → Callout / Emphasized; settings section headings → Title 3 / Emphasized; table column headers → Callout / Semibold; chips and sidebar section headers → Control / Semibold; on-control labels → Control / Emphasized; picker, segmented, and tab labels → Control; card titles → Body / Semibold; the Subfield → Subline / Emphasized. The [[MarkdownPM|Markdown editor]] scales from its own zoom root in `em` multiples, drawing weight from the shared ladder.

### Materials

`Materials/` — two glass engines behind one barrel. **Frost** is a CSS `backdrop-filter` recipe parameterized by `FrostParams`; **Liquid** is a real edge-refraction shader (`@samasante/liquid-glass`) worn by the in-use controls.

| Title         | Export                              | What it is                                                              |
| ------------- | ----------------------------------- | ----------------------------------------------------------------------- |
| GlassSurface  | `GlassSurface` · `frostMaterial`    | The app's fixed chrome tier — sidebar, inspector, side rail.            |
| Surface       | `Surface`                           | GlassSurface as the floating overlay over the main view.                |
| GlassPane     | `GlassPane` · `PANE_FROST`          | Anything floating over it — menus, pickers, the autocomplete.           |
| GlassWindow   | `GlassWindow` · `WINDOW_FROST`      | The pane tier carrying a body — preview, nav, settings, the crop modal. |
| Ghost         | `GHOST_FROST`                       | The edge-free frost the drag chip wears.                                |
| Frost engine  | `frostStyle` · `SOLID_FILL` · `OUTLINE_INSET` | The recipe itself, the window fill share, and the acted-on edge inset. |
| GlassControls | `GlassControls` · `CONTROL_OPTICS`  | Liquid glass on the button controls.                                    |
| GlassSegment  | `GlassSegment`                      | Liquid glass on the small on-control segments.                          |

| Visual | PANE_FROST | WINDOW_FROST         | GHOST_FROST |
| ---------------- | ---------- | -------------------- | ----------- |
| Blur             | `6`        | `6`                  | `6`         |
| Brightness       | `90`       | `90`                 | `100`       |
| Border Alpha     | `0.12`     | `0.12`               | `0`         |
| Top Specular     | `0.35`     | `0.35`               | `0`         |
| Inner Ring       | `0.08`     | `0.08`               | `0`         |
| Lower Rim / Depth / Rim Blur | `0.08` / `12` / `18` | `0.08` / `12` / `18` | `0` / `0` / `0` |
| Fill             | unset      | `--bg-window` @ 90%  | `--bg-window` @ 78% |
| Shadow           | standard   | standard             | lift        |

`--glass-outline` re-colors any tier's edge while it is being driven (a resize in flight, an active embed).

### Labels & Chips

`Labels/` — `Label.tsx`, `labels.css.ts` (the axes), `recipes.tsx`, `SegmentRun.tsx`.

| Title      | Export                       | What it is                                                              |
| ---------- | ---------------------------- | ----------------------------------------------------------------------- |
| Label      | `Label`                      | The axis-composed primitive every named label is a recipe over.         |
| Shapes     | `shape.pill/tag/chip/box`    | Rounded status default · squared value · icon-only · checkbox.          |
| Treatments | `fill` · `outline`           | Named only where a label differs from its tint.                         |
| Palette    | `labelColor.*`               | One tinted variant per ramp cell, plus `default` and `accent`.          |
| ContextChip | `ContextChip`               | A Context reference — neutral ground, color on border and text.         |
| FileChip   | `FileChip`                   | A file property's value — a tag with a tertiary outline, no fill.       |
| FileLabel  | `FileLabel`                  | A file or folder name inside a field, no chrome.                        |
| SegmentRun | `SegmentRun` · `SEGMENT_GAP` | A run of FileLabels divided by PathChevrons — a path, or values side by side. |

### Elements

`Elements/` — the atomic bits every surface composes; each is one folder with a style sheet and, where needed, a component.

| Title | Export | What it is |
| --------------- | -------------------------------- | ----------------------------------------------------- |
| DropOutline | `dropOutline` · `dropOutlineOpen` · `dropOutlineSpacer` · `railRow` | The fold chevron and the rail that descends from its center, on `--disclosure-rail-x`. |
| PathChevron | `PathChevron` | The `›` between path segments; `tone` and `size` knobs. |
| NavTrail | `NavTrail` · `TrailSegment` | An entity's location as a chevron-divided run of icon + title segments — inert, selectable, or a navigable path with a dimmed ghost tail; `emphasize` lifts the current stop. |
| Segment | `segment` | The between-values pill — `--segment-width` / `--segment-color` override it. |
| ProgressBar | `ProgressBar` | A determinate bar on the accent. |

### Components

`Components/` — grouped as the ledger reads. `dropdownAnchor.ts` (`dropdownAnchor`, `DROPDOWN_GAP`) and `useDismiss.ts` are the shared placement and outside-click helpers at the root.

#### Controls

`Controls/` — the atomic interactive pieces. `Button` is the recipe; the rest are the single-purpose controls beside it.

| Title       | Export                                | What it is                                                     |
| ----------- | ------------------------------------- | -------------------------------------------------------------- |
| Button      | `Button`                              | `type` × `size` × content (icon · icon + label · label), with `outline` as an inset ring and the `revealOnHover` / `ghostRest` modifiers; hover only, never a selected state. |
| Segmented   | `Segmented`                           | N Buttons of one type divided by `segment`; `glass` for the toolbar. |
| Checkbox    | `Checkbox`                            | The box, on the accent or a chosen cell.                       |
| DualSwitch  | `DualSwitch`                          | A boolean toggle with a sliding glass segment.                 |
| ColorSwatch | `ColorSwatch`                         | The switch shape holding a color, anchoring a ColorPicker.     |
| Slider      | `Slider`                              | Sliding number selection.                                      |

**Button Types** — one `--button-fill` / `--button-ink` / `--button-outline` triple per row; the hover is `state.hover` laid over the fill.

| Type        | Fill                          | Text                          |
| ----------- | ----------------------------- | ----------------------------- |
| Base        | none                          | inherits                      |
| Tinted      | accent @ `--tint-tertiary`    | accent                        |
| Solid       | accent @ `--tint-primary`     | `--label-primary`             |
| Filled      | `--fill-tertiary`             | `--label-primary`             |
| Destructive | `--error` @ `--tint-tertiary` | `--error` @ `--tint-primary`  |

**Button Sizes** — `size.control` in `Tokens/size.css.ts`; icon-only buttons take the ladder, labeled buttons take the bundle's label inset.

| Title | Token | Value |
| ---------- | ------------------- | ----------------------------------------------------------------------- |
| Inline | `size.control['button-inline']` | h `20px` · segment `18px` · padX `2px` · label padX `4px` · radius `6px` · icon `control` — the row affordances |
| Small | `size.control['button-small']` | h `24px` · segment `20px` · padX `4px` · label padX `12px` · radius `8px` · icon `body` |
| Medium | `size.control['button-medium']` | h `28px` · segment `24px` · padX `6px` · label padX `12px` · radius `10px` · icon `title3` |
| Large | `size.control['button-large']` | h `32px` · segment `28px` · padX `8px` · label padX `12px` · radius `12px` · icon `title3` |

#### Pickers

| Title          | Export                                     | What it is                                                   |
| -------------- | ------------------------------------------ | ------------------------------------------------------------ |
| PickerMenu     | `PickerMenu` · `PointMenu` · `PickerOption` | The rectangle every menu and picker mounts — anchoring, dismissal, focus, the scroll cap. |
| CalendarPicker | `CalendarPicker`                           | Date and time selection.                                     |
| ColorPicker    | `ColorPicker`                              | The 8×8 ramp grid; clicking the selected cell clears.        |
| IconPicker     | `IconPicker` · `IconFavorites`             | The searchable glyph grid with a reorderable favorites strip; the app binds favorites through `Settings/IconPicker`. |
| TextPicker     | `TextPicker`                               | A typed-value picker in the shared pane.                     |

#### Menu

| Title | Export | What it is |
| ------------ | ----------------------------------------------- | ----------------------------------------- |
| Menu | `Menu` · `MenuItem` · `MenuHeading` · `MenuSeparator` · `MenuCaption` | The row vocabulary. |
| Bars | `MenuTopRow` · `MenuPaneTopRow` · `MenuBottomRow` · `FooterLockButton` | The pinned header and footer tiers. |
| Scroll frame | `MenuScrollFrame` · `MENU_MAX_HEIGHT` | The one capped overflow region with its fade. |
| DisclosureRow | `DisclosureRow` · `useDisclosureSet` | A folding row on DropOutline. |
| MenuSurface | `MenuSurface` | The beaked pane the large toolbar dropdown hangs off a button. |
| MenuDropdown | `MenuDropdown` | The shell around a trigger — open state, dismiss, growth bound. |
| NotchedPane | `NotchedPane` | The beaked frost shell MenuSurface composes. |
| Growth | `growToContent` | The measured height a pane grows to. |

#### Fields

| Title | Export | What it is |
| ----------- | -------------------------------------------- | ---------------------------------------------- |
| InputField | `InputField` | The field box; `capped` scrolls its content under the fade. |
| Chrome | `field` · `input` · `hairlineField` · `base` · `search` | Boxed, raw caret, cell-tight, chromeless, and the search look. |
| Ring | `fieldRing()` · `focusRing()` · `errorRing()` · `ROW_RING` | One inset-shadow channel; presets set only its color. |
| Placeholder | `placeholder` | The ghost-text tone. |
| SearchField | `SearchField` · `SEARCH_PLACEHOLDER` | The controlled filter input the list surfaces share. |
| PathField | `PathField` | A folder path — a SegmentRun at rest, raw text under a click. |
| EditableInput | `EditableInput` | Enter commits, Escape abandons, blur settles. |
| RenamableLabel | `RenamableLabel` | The inline-rename swap. |
| useDraftEdit | `useDraftEdit` | Rest content until a click, then a width-pinned draft. |

### Detail

`Detail/` — the composite, feature-facing shells. App surfaces are listed by reference; their code stays in the app.

| Title | Location | What it is |
| ---------- | ------------------------------------- | ----------------------------------------------------- |
| PreviewPane | `Detail/PreviewPane` — `PreviewPane` | The floating window surface every in-app window mounts.[^1] |
| SidePane | `Detail/SidePane` — `SidePane` · `sidePaneWidth` | A pane carried on a window's edge by `--io`. |
| Tile chassis | `Detail/tile-chassis.css` | The resizable tile frame SurfacePM and embeds share. |
| Sidebar | app: `Sidebar/` | [[SidebarPM]] |
| Tabs · Toolbar | app: `Tabs/` · `Toolbar/` | [[NavigationPM]] |
| Table · Cards | app: `Detail/Views/` | [[TableViewPM]] · [[CardViewPM]] — future residents here. |

### Interaction

`Interactions/` — the content-agnostic pointer, scroll, and drag layer; fields and labels depend down into it, nothing reaches up. [[InteractionPM]] and [[PommoraDND]] hold the depth.

| Title        | Export                                                  | What it is                                             |
| ------------ | ------------------------------------------------------- | ------------------------------------------------------ |
| Drag engine  | `Zone` · `SortableZone` · `DragGroup` · `useDragItem` · `reorder` | The in-house DND.                           |
| Drop chrome  | `DropLine` · `DragGhost` · `dropChrome.css` · `ghost.css` | The insertion line, dot, and the glass drag chip.    |
| Disclose     | `beginDragDisclose` · `registerDiscloseTarget`          | Hover-open while dragging.                             |
| Snapshot     | `useDragSnapshot`                                       | The list held still for a drag's duration.             |
| Gesture      | `usePointerGesture` · `beginPointerGesture`             | Press, threshold, move, release.                       |
| Autoscroll   | `armAutoScroll` · `scrollGlide` · `AUTOSCROLL_KNOBS`    | Edge-proximity scrolling and the glide to a destination. |
| Keyboard     | `keyboardNext` · `onActivateClick` · `onActivateKey` · `announce` | Arrow stepping, Enter/Space activation, live-region announcements. |
| OverScroll   | `OverScroll`                                            | Overflow fades at the hidden edge, scrolls under the pointer. |
| HoverRemove  | `HoverRemove` · `hoverRemoveHost`                       | The hover-revealed ×, with the label-tail melt.        |
| Floating     | `useFloatingWindow` · `FloatingResizeCorners` · `floatingWindow.css` · `resize-strip.css` | Move and resize for any floating surface. |
| Reveal bar   | `useRevealNear` · `reveal-bar.css`                      | A control shown as the pointer nears an edge.          |
| Held         | `useHeld`                                               | A value that lingers through an exit.                  |

### Animation

`Animation/` — the one motion source: the ladder, the two curves, the drag feel, the Bloom keyframes, and the enter/exit primitives. [[InteractionPM]] describes the named motions.

| Title     | Export                                    | What it is                                                              |
| --------- | ----------------------------------------- | ----------------------------------------------------------------------- |
| Durations | `duration.fast/dropdown/base/slow` · `--duration-*` · `ms()` | `180ms` · `225ms` · `280ms` · `350ms`; `ms` reads one as a number. |
| Ease      | `easing.baseEase` · `--ease-base`         | `ease` — the everyday curve.                                            |
| Snap      | `easing.baseSnap` · `--ease-snap`         | `cubic-bezier(0.22, 1, 0.36, 1)` — the decelerate drag and tiles ride. |
| Feel      | `DEFAULT_FEEL` · `GLIDE_FEEL`             | Duration + snap as numbers for the drag engine — the `dropdown` and `slow` rungs. |
| Bloom     | `dropdownMenu` · `dropdownMenuClosing` · `dropdownOpen` · `dropdownClose` · `titleReveal` | The pane open/close keyframes at the `slow` and `dropdown` rungs. |
| Reveal    | `Reveal`                                  | The `0fr ↔ 1fr` body open/close on the `fast` rung.                     |
| Exit      | `useExitPresence`                         | Keeps a surface mounted through its close.                              |

### Symbols

`Symbols/` — `Icon` and the curated registry (`icons`, `IconName`, `entityIcon`), `AllSymbols.ts` (`searchIcons`), `fileTypes.ts` (`fileTypeIcon`), `customGlyphs.tsx`, and `masks.ts` (the grip, fold-chevron, and link glyphs as CSS masks).[^2]

### Showcase

`Showcase/` — the data-driven site (`npm run showcase`), one leaf per domain and a `lab/` sandbox, deployed at https://pommora-design-system.vercel.app.

### Known Issues

- **Voiding Liquid Glass can't be done in place** — its displacement filter is a generated SVG ID CSS can't interpolate, so the inspector "swallow" renders the pill as a fading glass layer behind a solid bare layer.
- **Scrollbars are hidden app-wide** — Chromium's default bar reads heavy and the auto-hiding overlay isn't reliable, so scrolling is trackpad and wheel only.

### Pending

- **Spacing and radius** — `--radius-full` is the scale's only member; the rest stay ad-hoc until lifted from Figma.
- **Light/dark theming** — the system is dark-only.
- **The inactive state token** — the empty-state tone between secondary and tertiary; interim consumers read tertiary.
- **Type** — no tracking scale, no `mono` token behind the editor's code stack, no Markdown element mapping, no multi-line clamp.

[^1]: [[PagePreviewPM]]
[^2]: [[SymbolsPM]]
