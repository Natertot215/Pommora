## Design System

```
Design System
├── Token Atlas
│   ├── Primitives
│   ├── Surfaces
│   ├── Labels
│   ├── States
│   ├── Fills
│   ├── Tints
│   ├── Separators
│   ├── Shadows
│   ├── Spectrum
│   ├── Ramp
│   ├── Geometry
│   └── Typography
├── Glass
├── Labels & Chips
├── Elements
├── Components
│   ├── Controls
│   ├── Pickers
│   ├── Fields
│   └── Windows
├── Menus
├── Detail
├── Interaction
├── Animation
├── Symbols
├── Showcase
├── Known Issues
└── Pending
```

The Pommora design system — the code mirror of the Figma "Pommora - React" library, which is canonical for design values. It lives in `src/renderer/src/DesignSystem/`, and this document is its ledger: one section per folder, one row per thing, with *name · export · what it is*. Values live in the Token Atlas and in code; a subsystem with its own spec ([[InteractionPM]], [[PommoraDND]], [[SymbolsPM]]) keeps its depth there and is pointed at, never restated.

- **Tooling:** Token files are vanilla-extract `*.css.ts`, so a mistyped token is a compile error; `Tokens/theme-vars.css.ts` republishes every token under a stable `--name` for plain CSS, and a token without a bridged var is TS-only. Inter (variable) is the app font. The layer builds as the standalone showcase; a handful of components (`ImagePicker`, `AssetImage`) reach the store for the assets they draw. `Theming/` (`applyAccent` · `applyPersonalization`) and `Util/` (`cx` · `clamp` · `pad` · `moveItem`) are runtime homes with no catalog of their own.

- **Conventions:** Pommora heavily *prefers* even-factored scaling for all geometrical applications(2px -> 4px... 12px -> 14px... 20px -> 22px...), while typography scaling is purposefully independent of such convention. 

- **Vocabulary:** Five words name the surfaces. A **Window** is a floating window; a **Pane** is a surface floating over another — the sidebar, the inspector, the side slots, the hover pane, the autocomplete; a **Menu** is a surface hung off a trigger; a **Frame** is one page inside a Menu's or Window's hierarchy — Filter, Group, Sort, Hidden, Layout, Properties, the Settings categories; a **Picker** chooses a value.

### Token Atlas

`Tokens/` — the value source. `color.css.ts` (`vars`), `size.css.ts` (`size`, `ICON_PX`, the geometry consts), `typography.css.ts` (`font`, `text`), `stack.ts` (`stack`), `tint.ts` (`tintAt`, `mixAt`, `TINT_STEPS`), `ramp.ts` (`cellColor`, `cellPaint`, `cellRing`, `ANCHOR_CELLS`, the `RAMP_*` re-exports), `colorMap.ts` (`labelColorFor`), and the `theme-vars.css.ts` bridge. `index.ts` is the barrel.

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

| Title           | Token                                   | Value               |
| --------------- | --------------------------------------- | ------------------- |
| Fill Primary    | `fill.primary` · `--fill-primary`       | `system-grey` @ 20% |
| Fill Secondary  | `fill.secondary` · `--fill-secondary`   | `system-grey` @ 15% |
| Fill Tertiary   | `fill.tertiary` · `--fill-tertiary`     | `system-grey` @ 10% |
| Fill Quaternary | `fill.quaternary` · `--fill-quaternary` | `system-grey` @ 6%  |
| Fill Quinary    | `fill.quinary` · `--fill-quinary`       | `system-grey` @ 4%  |

#### Tints

**SOURCE:** `Tokens/tint.ts` — `tintAt(base, step)` mixes a base toward transparent; `mixAt` toward anything. A consumer names a step rather than its percentage, and the mix reaches CSS carrying the step's var, so the ladder stays live: retuning a step here re-tints every surface that names it. 

| Title           | Token                                         | Value |
| --------------- | --------------------------------------------- | ----- |
| Tint Solid      | `TINT_STEPS.solid` · `--tint-solid`           | 100%  |
| Tint Primary    | `TINT_STEPS.primary` · `--tint-primary`       | 60%   |
| Tint Secondary  | `TINT_STEPS.secondary` · `--tint-secondary`   | 40%   |
| Tint Tertiary   | `TINT_STEPS.tertiary` · `--tint-tertiary`     | 20%   |
| Tint Quaternary | `TINT_STEPS.quaternary` · `--tint-quaternary` | 15%   |

#### Borders

An edge composes a width and a color — `var(--width-XXX) solid var(--border-YYY)`. Colors by intensity, then the literal width ladder.

| Title        | Token                               | Value               |
| ------------ | ----------------------------------- | ------------------- |
| Border Base  | `border.base` · `--border-base`     | `system-grey` @ 25% |
| Border Light | `border.light` · `--border-light`   | `system-grey` @ 20% |
| Border Faint | `border.faint` · `--border-faint`   | `system-grey` @ 15  |
| Width 100    | `--width-100`                       | `1px`               |
| Width 125    | `--width-125`                       | `1.25px`            |
| Width 150    | `--width-150`                       | `1.5px`             |
| Width 175    | `--width-175`                       | `1.75px`            |
| Width 200    | `--width-200`                       | `2px`               |
| Banner Scrim | `BANNER_SHADOW` · `--banner-shadow` | `#0000008C`         |

#### Shadows

| Title    | Token                                     | Value                   |
| -------- | ----------------------------------------- | ----------------------- |
| Base | `shadowStandardVar` · `--shadow-base` | `0 8px 25px #00000040` |
| Strong | `shadowLiftVar` · `--shadow-strong` | `0 12px 30px #00000065` |

#### Fades

The over-scroll edge-dissolve widths a scrollable surface names on `--over-scroll-fade`; the OverScroll primitive reads that to fade a row out as it leaves the viewport. A floating window sets its own dynamically, to its toolbar's height, so content dissolves exactly under the toolbar.

| Title       | Token           | Value  | Role                              |
| ----------- | --------------- | ------ | --------------------------------- |
| Fade Light  | `--fade-light`  | `12px` | a small control (the text picker) |
| Fade Base   | `--fade-base`   | `16px` | the common case — lists, tabs, pickers, cards |
| Fade Strong | `--fade-strong` | `20px` | cell overflow (the chip run)      |
| Fade Heavy  | `--fade-heavy`  | `24px` | a detail surface (the sidebar)    |

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
| Disclosure Indent | `DISCLOSURE_INDENT` · `--disclosure-indent`    | `14px`                                                            |
| Inset Content     | `--inset-content`                              | `24px` — the content column's inset from the shell edges          |
| Inset Detail      | `INSET_DETAIL` · `--inset-detail`              | `20px` — the grip / fold-chevron lane the editor, tables, and tiles share |
| Drop Line         | `DROP_LINE_THICKNESS` · `DROP_DOT_SIZE` · `DROP_LINE_INSET` | `2px` · `7px` · `2px`                                |
| List Outline      | `LIST_OUTLINE_WIDTH` · `LIST_OUTLINE_GAP` · `--list-outline-*` | `2px` · `3px` · segment tone · pill radius        |
| Park / Close      | `PARK_CLEARANCE` · `CLOSE_CLEARANCE`           | `14px` · `30px`                                                   |
| Tile              | `TILE_MIN_PX` · `TILE_DEFAULT_PX` · `TILE_GAP_PX` | `64px` · `320px` · `4px`                                       |

#### Typography

**SOURCE:** `Tokens/typography.css.ts` — Inter, variable. `text.<style>.<variant>` composes size and line height from the style with weight from the variant: Standard `400` · Emphasized `500` · Semibold `600` · Bold `700`, tracking pinned to `0`. The body-and-down sizes follow the macOS AppKit scale drawn in Inter; the container-title family (`titleLarge`/`Medium`/`Small`) is Pommora's own. **Control** and **Subline** are renamed for what they drive here.

| Style       | Token             | Size / Line     | Character                                            |
| ----------- | ----------------- | --------------- | ---------------------------------------------------- |
| Title Large  | `text.titleLarge`  | `28px` / `32px` | container title — over an editor banner              |
| Title Medium | `text.titleMedium` | `24px` / `28px` | container title — the bare page header               |
| Title Small  | `text.titleSmall`  | `20px` / `24px` | container title — over a Banner cover                |
| Headline    | `text.headline`   | `15px` / `20px` | the smallest heading step; the one 15px style        |
| Body        | `text.body`       | `13px` / `16px` | the standard content size; carries the row primitive |
| Callout     | `text.callout`    | `12px` / `15px` | a step under body — headers and ancillary labels     |
| Control     | `text.control`    | `12px` / `15px` | chips and control chrome                             |
| Caption     | `text.caption`    | `11px` / `14px` | the secondary line under a title                     |
| Footnote    | `text.footnote`   | `10px` / `13px` | small detail                                         |
| Subline     | `text.subline`    | `10px` / `12px` | footnote's size on a tighter line box                |

Where each goes: menu and sidebar rows → Body; menu headings → Headline / Emphasized; row sub-label → Caption, trailing detail → Footnote / Emphasized; frame header → Callout / Emphasized; settings section headings → Headline / Emphasized; table column headers → Callout / Semibold; chips and sidebar section headers → Control / Semibold; on-control labels → Control / Emphasized; picker, segmented, and tab labels → Control; card titles → Body / Semibold; the Subfield → Subline / Emphasized. The [[MarkdownPM|Markdown editor]] scales from its own zoom root in `em` multiples, drawing weight from the shared ladder.

### Glass

`Glass/` — the material: one recipe in four tiers, brightest and clearest first, behind one barrel. **Frost** is a CSS `backdrop-filter` recipe parameterized by `FrostParams` in `glass-base.tsx`; `glass-pane.tsx`, `glass-surface.tsx`, and `glass-window.tsx` are its three tiers; `glass-control.tsx` is **Liquid**, a real edge-refraction shader (`@samasante/liquid-glass`) worn by the in-use controls.

| Title         | Export                                        | What it is                                                              |
| ------------- | --------------------------------------------- | ----------------------------------------------------------------------- |
| GlassPane     | `GlassPane` · `paneMaterial`                  | The clear chrome-pane tier — the sidebar, the inspector, the side slots, and the anchored surfaces (the hover pane, the autocomplete). |
| Surface       | `Surface`                                     | GlassPane as the app root, the floating overlay over the main view.     |
| GlassSurface  | `GlassSurface` · `SURFACE_FROST`              | A Menu floating over a pane, a step dimmer — menus, pickers; `solid` when it opens over another surface. |
| GlassWindow   | `GlassWindow` · `WINDOW_FROST`                | That surface carrying the 90% `--bg-window` body — every floating window and the image picker. |
| Ghost         | `GHOST_FROST`                                 | The edge-free frost the drag chip wears.                                |
| Frost engine  | `frostStyle` · `SOLID_FILL` · `OUTLINE_INSET` | The recipe itself, the window fill share, and the acted-on edge inset.  |
| GlassControls | `GlassControls` · `CONTROL_OPTICS`            | Liquid glass on the button controls.                                    |
| GlassSegment  | `GlassSegment`                                | Liquid glass on the small on-control segments.                          |

| Tier | Wearer |
| ------------ | ------------------------------------------------------------------------------------------ |
| GlassPane    | `InspectorPane`, `SidePane`, and `PickerMenu` with `glass="pane"` — `ConnectionPane`, `AutocompletePane` |
| GlassSurface | `PickerMenu` by default, and `NotchedShell` beneath `MenuSurface`                          |
| GlassWindow  | `WindowChassis` and `ImagePicker`                                                          |

| Visual | SURFACE_FROST | WINDOW_FROST         | GHOST_FROST |
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

`Labels/` — `Label.tsx`, `labels.css.ts` (the axes), `recipes.tsx`.

| Title      | Export                       | What it is                                                              |
| ---------- | ---------------------------- | ----------------------------------------------------------------------- |
| Label      | `Label`                      | The axis-composed primitive every named label is a recipe over.         |
| Shapes     | `shape.pill/tag` · `optionShapeFor` | Rounded status default · squared value, resolved per type. Compact is either rendered icon-only. |
| Checkbox | `checkboxBox`              | The task checkbox's `17px` square — base + `boxGeometry`, outside the shape roster. |
| Tint       | `tinted`                     | Fill, outline and text mixed off `--label-base` — a surface wanting a color chip sets that one var. |
| Treatments | `fill` · `outline`           | Named only where a label differs from its tint.                         |
| Palette    | `labelColor.*`               | One variant per ramp cell naming its base, plus `default` and `accent`. |
| SpaceChip  | `SpaceChip`                  | A Space reference — neutral ground, color on border and text.           |
| FileChip   | `FileChip`                   | A file property's value — a tag with a tertiary outline, no fill.       |
| FileLabel  | `FileLabel`                  | A file or folder name inside a field, no chrome.                        |

### Elements

`Elements/` — the atomic bits every surface composes; each is one folder with a style sheet and, where needed, a component.

| Title | Export | What it is |
| --------------- | -------------------------------- | ----------------------------------------------------- |
| DropOutline | `dropOutline` · `dropOutlineOpen` · `dropOutlineSpacer` · `railRow` | The fold chevron and the rail that descends from its center, on `--disclosure-rail-x`. |
| PathChevron | `PathChevron` | The `›` between path segments; `tone` and `size` knobs. |
| NavTrail | `NavTrail` · `NavTrailProps` · `TrailSegment` | An entity's location as a chevron-divided run of icon + title segments — inert, selectable, or a navigable path with a dimmed ghost tail; `emphasize` lifts the current stop. |
| Segment | `segment` | The between-values pill — `--segment-width` / `--segment-color` override it. |
| ProgressBar | `ProgressBar` | A determinate bar on the accent. |
| PickerControl | `PickerControl` · `labelOf` · `PickerChoice` · `pickerValue` | The double-chevron picker: two options toggle in place; three or more pop a PickerMenu; right-clicks write values into the field. |
| EyeToggle | `EyeToggle` · `EYE_ICON` | The visibility eye — the current state's glyph at rest, the toggle previewed on hover. |
| EmptyValue | `EmptyValue` | The one "nothing here yet" mark a value slot shows — a property row, a card value, a date field — a tertiary `—`; the host sets the type size. |

### Components

`Components/` — grouped as the ledger reads. `useDismiss.ts` is the shared outside-click helper at the root, beside `AssetImage`, the one element that draws a stored image, through its crop when one exists.

#### Controls

`Controls/` — the atomic interactive pieces. `Button` is the recipe; the rest are the single-purpose controls beside it.

| Title | Export | What it is |
| --------- | ------------ | ------------------------------------------------------------------------------- |
| Button | `Button` | `type` × `size` × content (icon · icon + label · label), with `outline` as an inset ring and the `revealOnHover` / `ghostRest` modifiers; hover on every button, and `pressed` for a toggle whose menu is open. |
| Segmented | `Segmented` | N Buttons of one type divided by `segment`; `glass` for the toolbar. |
| Checkbox | `Checkbox` | The box, on the accent or a chosen cell. |
| DualSwitch | `DualSwitch` | A boolean toggle with a sliding glass segment. |
| ColorSwatch | `ColorSwatch` | The switch shape holding a color, anchoring a ColorPicker. |
| Slider | `Slider` | Sliding number selection. |

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

| Title          | Export                                      | What it is                                                                                                           |
| -------------- | ------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| PickerMenu     | `PickerMenu` · `PointMenu` · `PickerOption` | The rectangle every menu and picker mounts — anchoring to an element or a bare point, the collision flip decided once per open, dismissal, focus, the scroll cap. The wikilink autocomplete and the hover pane ride it too, on pane glass. |
| CalendarPicker | `CalendarPicker`                            | Date and time selection.                                                                                             |
| ColorPicker    | `ColorPicker`                               | The 8×8 ramp grid; clicking the selected cell clears.                                                                |
| IconPicker     | `IconPicker` · `IconFavorites`              | The searchable glyph grid with a reorderable favorites strip; the app binds favorites through `Settings/IconPicker`. |
| ImagePicker    | `ImagePicker`                               | Frames a stored image — a focal point and a zoom — as a circle or a rect cut to its seat. |
| TextPicker     | `TextPicker`                                | A typed-value picker in the shared pane.                                                                             |

#### Fields

`Fields/` — the input surfaces and the runs that sit inside them; `SegmentRun.tsx` lives here because a run of values is a field's content, not a label's.

| Title          | Export                                                                                                       | What it is                                                                                                    |
| -------------- | ------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------- |
| InputField     | `InputField` · `FieldEdit`                                                                                   | The field box — `boxed` or `bordered` chrome.                                                                 |
| PathField      | `PathField` · `BrowseButton`                                                                                 | A folder path in a bordered field — the path as a trail, typed in place or chosen through the trailing browse; `BrowseButton` is that trailing action alone, for a field showing a file rather than a folder. |
| SegmentRun     | `SegmentRun` · `SegmentEntry` · `SEGMENT_INDEX_ATTR`                                                         | Values standing side by side inside a field; segment-divided.                                                 |
| Chrome         | `field` · `input` · `borderedField` · `base` · `search` · `autoSizeInput` · `autoSizeMirror` · `autoSizeWrap` | Boxed, raw caret, bordered, chromeless, the search look, and the auto-sizing input trio. |
| Ring           | `fieldRing()` · `focusRing()` · `errorRing()` · `ROW_RING`                                                   | One inset-shadow channel; presets set its color.                                                            |
| Placeholder    | `placeholder`                                                                                                | The ghost-text tone.                                                                                          |
| SearchField    | `SearchField` · `SEARCH_PLACEHOLDER`                                                                         | The controlled filter input the list surfaces share.                                                          |
| EditableInput  | `EditableInput`                                                                                              | Enter commits, Escape abandons, blur settles.                                                                 |
| RenamableLabel | `RenamableLabel`                                                                                             | The inline-rename swap.                                                                                       |

#### Windows

| Title | Export | What it is |
| ------------- | ------------------------------------- | ----------------------------------------------------- |
| WindowChassis | `WindowChassis` | The floating window surface every in-app window mounts; its own dimensions — toolbar height, side-pane widths, footer height, the trailing-control slide — are custom properties in `windowChassis.css` a host may retune.[^1] |
| SidePane | `SidePane` · `sidePaneWidth` | A pane carried on a window's edge by `--io`. |

### Menus

`Menus/` — the menu recipe: the shell a trigger hangs, the rows inside it, the frame chassis, and the slide between frames. `menu-base.tsx` is the trigger shell, `menu-surface.tsx` and `menu-shell.tsx` the beaked surface, `menu-row.tsx` the rows, `menu-disclosure.tsx` the folding row, `menu-anchor.ts` the placement, `frame-growth.ts` and `frame-slide.tsx` the frame chassis.

| Title | Export | What it is |
| ------------ | ----------------------------------------------- | ----------------------------------------- |
| Menu | `Menu` · `MenuItem` · `MenuHeading` · `MenuSeparator` · `MenuCaption` · `itemEmphasized` · `titleInput` | The row vocabulary, the emphasized row, and the flush inline-rename input. |
| Bars | `MenuTopRow` · `MenuFrameTopRow` · `MenuBottomRow` · `FooterLockButton` · `FooterMoreButton` · `AccessoryButton` | The pinned header and footer tiers and their buttons. |
| Scroll frame | `MenuScrollFrame` · `MENU_MAX_HEIGHT` | The one capped overflow region with its fade. |
| DisclosureRow | `DisclosureRow` · `useDisclosureSet` | A folding row on DropOutline. |
| MenuSurface | `MenuSurface` | The beaked surface the large toolbar menu hangs off a button. |
| MenuDropdown | `MenuDropdown` | The shell around a trigger — open state, dismiss, growth bound. |
| NotchedShell | `NotchedShell` | The beaked frost shell MenuSurface composes. |
| Anchor | `menuAnchor` · `MenuPlacement` · `DROPDOWN_GAP` | Where a menu sits against its trigger. |
| Growth | `growToContent` | The measured height a menu grows to. |
| FrameSlide | `FrameSlide` | The two-slot push and back between a menu's frames. |

### Detail

`Detail/` — the composite, feature-facing shells. App surfaces are listed by reference; their code stays in the app.

| Title             | Location                                                                                 | What it is                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| ----------------- | ---------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Tile chassis      | `Detail/tile-chassis.css`                                                                | The resizable tile frame SurfacePM and embeds share.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| Sidebar · Toolbar | app: `Sidebar/` · `Toolbar/`                                                             | [[InterfacePM]]                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| Tabs              | app: `Tabs/`                                                                             | [[NavigationPM]]                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| Cards             | app: `Cards/` — `Card.tsx` · `cards.css`                                                 | The card chassis every card surface wears — the Navigation gallery and CardView. `CardRoot` (drag shell; `is-locked` holds the 125/90 aspect with the cover at `--thumb-share`, the default reflows below a `--card-thumb-h` band; `is-active` wears the accent stroke) → `CardBody` (frame, hover-pop) → `CardThumb` (`is-capture` marks a captured preview, zoomed by `--preview-zoom`) / `CardText` → `CardTitle` (body-semibold; scroll, wrap, or static) · `CardTrail`. `.card-grid` is the shared grid — auto-fit, or `is-fill` to hold empty tracks. A `.card-pin` inside the thumb is the opt-in pin. Its tokens sit on `:root`; [[ViewTypesPM]] carries the sheet. |
| Tables            | app: `Tables/` — `Table.css` · `table-tokens.css` · `ColumnHeader` · `Cell` · `tableDnd` | The tabular chrome every table surface wears (TableView, the Trash): the column-header band with `.col-header` segment bars (`.table-segment` puts the bar on any element), row and column hairlines, the column drag and resize strips, `no-borders`, and the cell content types. A host wears `.table`, lays its own grid on `--cols`, rebinds the heading fill and divider in its scope, and states `is-clear` for a bare heading. [[ViewTypesPM]] carries the sheet.                                                                                                                                                                                                    |

### Interaction

`Interactions/` — the content-agnostic pointer, scroll, and drag layer; fields and labels depend down into it, nothing reaches up. [[InteractionPM]] and [[PommoraDND]] hold the depth.

| Title        | Export                                                  | What it is                                             |
| ------------ | ------------------------------------------------------- | ------------------------------------------------------ |
| Drag engine  | `SortableZone` · `DragGroup` · `GroupZone` · `useDragItem` · `useGroupedDragItem` · `reorder` · `arraySwap` | The in-house DND. |
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
| Durations | `duration.fast/menu/base/slow` · `--duration-*` · `ms()` | `180ms` · `225ms` · `280ms` · `350ms`; `ms` reads one as a number. |
| Ease      | `easing.baseEase` · `--ease-base`         | `ease` — the everyday curve.                                            |
| Snap      | `easing.baseSnap` · `--ease-snap`         | `cubic-bezier(0.22, 1, 0.36, 1)` — the decelerate drag and tiles ride. |
| Feel      | `DEFAULT_FEEL` · `GLIDE_FEEL`             | Duration + snap as numbers for the drag engine — the `menu` and `slow` rungs. |
| Bloom     | `menuBloom` · `menuBloomClosing` · `bloomOpen` · `bloomClose` · `titleReveal` | The menu open/close keyframes at the `slow` and `menu` rungs. |
| Reveal    | `Reveal`                                  | The `0fr ↔ 1fr` body open/close on the `fast` rung.                     |
| Exit      | `useExitPresence`                         | Keeps a surface mounted through its close.                              |

### Symbols

`Symbols/` — `Icon` and the curated registry (`icons`, `IconName`, `entityIcon`), `AllSymbols.ts` (`searchIcons`), `fileTypes.ts` (`fileTypeIcon`), `customGlyphs.tsx`, and `masks.ts` (the grip, fold-chevron, code-chevron, and link glyphs as CSS masks).[^2]

### Showcase

`Showcase/` — the data-driven component-library site, deployed at https://pommora-design-system.vercel.app from the same sources the app builds from, so it can't drift. `npm run showcase` serves it and `npm run build:showcase` builds it; `Showcase/leaves/registry.tsx` registers one leaf per domain across four sections, plus the `lab/` sandbox and the SurfacePM stress harness.

---

#### Known Issues

- **Voiding Liquid Glass can't be done in place** — its displacement filter is a generated SVG ID CSS can't interpolate, so the inspector "swallow" renders the pill as a fading glass layer behind a solid bare layer.
- **Scrollbars are hidden app-wide** — Chromium's default bar reads heavy and the auto-hiding overlay isn't reliable, so scrolling is trackpad and wheel only.

#### Pending

- **Spacing and radius** — `--radius-full` is the scale's only member; the rest stay ad-hoc until lifted from Figma.
- **Light/dark theming** — the system is dark-only.
- **An inactive label tone** — the empty-state text color between secondary and tertiary; interim consumers read tertiary. (The `--state-inactive` opacity above is a different thing.)
- **Type** — no tracking scale, no Markdown element mapping, no multi-line clamp.

[^1]: [[InterfacePM]] §Floating Windows
[^2]: [[SymbolsPM]]
