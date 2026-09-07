## A07 — Renderer Foundation Placement

**Scope:** `src/renderer/PommoraUIX/` (94 non-test files), `Animation/` (10), `Assets/` (4), `Interactions/` (29), `Utilities/` (5), `Testing/` (5), and the ten renderer root files. 157 files, ≈12,400 non-test lines (tests in scope add 3,971 and are excluded from every count below).

**Method:** every import in `src/` was resolved by a script that handles both `@renderer/*`/`@shared/*` aliases and relative paths (including `.css` → `.css.ts` and `index` resolution), so importer counts are real edges, not grep hits. Test files and `Testing/` are counted separately as "test-only". Host-bound markers were grepped (`window.nexus`, `nexus-asset://`, `-webkit-app-region`/`WebkitAppRegion`, `EyeDropper`, `<webview>`), then confirmed by reading each file. Every classification below is from reading the file; comments were ignored as evidence.

**Vocabulary used in the "Home" column** (the taxonomy is argued in §8): `Kit/*` is the host-neutral UI library (Tokens, Motion, Gestures, Symbols, Glass, Buttons, Labels, Controls, Elements, Fields, Menus, Pickers, Caret, util); `Store` is state + tree projections; `Shell` is the app frame and chrome; `Assets` is the store-aware media/iconography domain; `Host` is the desktop seam; `Core` is `src/shared`.

**Class codes:** L pure logic · C React component · H React hook · S vanilla-extract `.css.ts` · P plain `.css` · T token definition · X test-support · **HOST** touches the bridge, the asset scheme, Electron-only CSS, or a Chromium-only API. Importer counts are non-test; folders list who imports, most first.

### 1. File Table

#### PommoraUIX/Tokens (770 lines)

| File | Class | Imp | Importer folders | Domain | Home |
| --- | --- | --- | --- | --- | --- |
| `index.ts` | T barrel | 29 | Showcase 7, Windows 5, Interface 3, Buttons 2, Pickers 2, Settings 2, Views 2, Frames, Properties, Sidebar, Tabs, Tiles, root | token surface | Kit/Tokens |
| `color.css.ts` | T | 31 | Elements 4, Pickers 4, Frames 4, Properties 4, Tokens 3, Glass 2, Labels 2, Menus 2, Tiles 2, Controls, Fields, Interface, Settings | palette, shadows, state opacities | Kit/Tokens |
| `size.css.ts` | T | 14 | Elements 2, Tokens 2, Sidebar 2, Menus, Symbols, Frames, Interactions, MarkdownPM, Tables, Tiles, Utilities | icon scale + a grab-bag of geometry consts | Kit/Tokens; `TILE_MIN_PX`/`TILE_DEFAULT_PX`/`TILE_GAP_PX` (lines 30–38) are Tiles knobs and belong with Tiles |
| `typography.css.ts` | T | 22 | Properties 3, Elements 2, Pickers 2, Tokens 2, Interface 2, Views 2, Cards, Fields, Labels, Menus, Frames, Interactions, MarkdownPM, Settings, Tiles | type ramp | Kit/Tokens |
| `stack.ts` | T | 11 | Pickers 2, Tokens 2, Interactions 2, Cards, Frames, Interface, Toolbar, Windows | z ladders | Kit/Tokens (its `shell.*` ladder names Shell parts; acceptable as a token) |
| `tint.ts` | L/T | 14 | Tokens 4, Controls 2, Pickers 2, Fields, Labels, Menus, Frames, Properties, Toolbar | color-mix ladder | Kit/Tokens |
| `ramp.ts` | L/T | 10 | Tokens 4, Controls, Labels, Pickers, Showcase, Tiles, Toolbar | 8×8 chip ramp | Kit/Tokens |
| `colorMap.ts` | L | 15 | Properties 6, Tokens 3, Toolbar 2, Frames, Settings, Tiles, Views | stored color string → cell key (absorbs legacy on-disk names) | Kit/Tokens (borderline Core: it interprets an on-disk grammar) |
| `solidColor.ts` | L | 9 | Properties 5, Views 2, Controls, Settings | palette key → CSS | Kit/Tokens |
| `accent.ts` | L (DOM write) | 2 | Store/nexusSlice, Showcase | `--accent`/`--system-accent` appliers; `readCssAccentColor` is the non-Electron fallback | Kit/Tokens |
| `personalization.ts` | L (DOM write) | 2 | Store/configSlice, Store/nexusSlice | the app's Personalization settings → root vars/classes (`hideChevrons`, `outlinerLines`, `pickerSelection`, `tabMinWidth`…) | **misfiled** → Store (beside configSlice, its only callers) |
| `theme-vars.css.ts` | T bridge | 1 | Tokens/index | republishes tokens as `--*` for plain CSS; imports `Animation/motion` (line 21) and `Symbols/masks` | Kit/Tokens; the Animation import inverts layering (see §4) |

#### PommoraUIX/Util (45 lines)

| File | Class | Imp | Importer folders | Domain | Home |
| --- | --- | --- | --- | --- | --- |
| `cx.ts` | L | 75 | everywhere | className join | Kit/util |
| `capMap.ts` | L | 3 | MarkdownPM/docCache, Store/tabState, Tiles/webRetention | bounded insertion-ordered Map | **not UI** → Core (`shared/`) |
| `checkSet.ts` | L | 2 | Settings/TrashFrame, Windows/PageHistoryWindow | set toggle/retain | **not UI** → Core |
| `moveItem.ts` | L | 6 | Interactions 2, Navigation, Tabs, Views, Windows | immutable reorder | **not UI** → Core |
| `pad.ts` | L | 3 | Pickers/CalendarPicker, Properties/formatValue, Views/Pipeline/group | zero-pad | **not UI** → Core (a data-pipeline file importing from the design system is the wrong direction; `@shared/clamp` is the existing precedent) |

#### PommoraUIX/Buttons (359)

| File | Class | Imp | Importer folders | Domain | Home |
| --- | --- | --- | --- | --- | --- |
| `index.ts` | barrel | 33 | Windows 7, Frames 4, Properties 3, Toolbar 3, Menus 2, Pickers 2, Interface 2, Settings 2, Showcase 2, root, Elements, Fields, Tabs, Tiles, Views | | Kit/Buttons |
| `Button.tsx` | C | 1 | index | Button + Segmented | Kit/Buttons |
| `button-base.css.ts` | S | 3 | Buttons, Elements/eye-toggle, Tiles/ViewTile | size/type variants | Kit/Buttons |

#### PommoraUIX/Labels (334)

| File | Class | Imp | Importer folders | Domain | Home |
| --- | --- | --- | --- | --- | --- |
| `index.ts` | barrel | 16 | Properties 7, Showcase 4, Controls, Pickers, Tokens, Frames, Views | | Kit/Labels |
| `Label.tsx` | C | 2 | index, recipes | composed chip (imports `Interactions/HoverRemove`, `OverScroll`) | Kit/Labels |
| `label-base.css.ts` | S | 4 | Labels 3, Interface | shape/tint/fill/outline axes; generates 64 cell variants | Kit/Labels |
| `label-recipes.css.ts` | S | 1 | recipes | FileChip styles | Kit/Labels |
| `recipes.tsx` | C | 2 | Fields/SegmentRun, index | `SpaceChip`, `FileChip`, `FileLabel`, `optionShapeFor` | Kit/Labels (`SpaceChip` is Pommora vocabulary on a neutral chip; rename-grade, not move-grade) |

#### PommoraUIX/Controls (503)

| File | Class | Imp | Importer folders | Domain | Home |
| --- | --- | --- | --- | --- | --- |
| `Checkbox.tsx` | C | 4 | Properties, Settings, Showcase, Windows | the checkbox | Kit/Controls |
| `checkbox.css` | P | 1 | Checkbox | shared with the CM6 task widget by class name | Kit/Controls |
| `Slider.tsx` | C | 3 | Menus/menu-index, Pickers/ImagePicker, Frames/LayoutFrame | slider on `usePointerGesture` | Kit/Controls |
| `slider.css.ts` | S | 2 | Slider, Pickers/image-picker.css | | Kit/Controls |
| `DualSwitch.tsx` | C | 6 | Showcase 2, Menus, Pickers, Frames, Properties | switch | Kit/Controls |
| `dual-switch.css.ts` | S | 2 | DualSwitch, color-swatch.css | | Kit/Controls |
| `ColorSwatch.tsx` | C | 1 | Menus/menu-index | swatch + ColorPicker pair | Kit/Controls |
| `color-swatch.css.ts` | S | 1 | ColorSwatch | | Kit/Controls |

#### PommoraUIX/Elements (479)

| File | Class | Imp | Importer folders | Domain | Home |
| --- | --- | --- | --- | --- | --- |
| `EmptyValue.tsx` + `.css.ts` | C, S | 4 | Pickers, Properties, Views, Windows | "—" glyph | Kit/Elements |
| `EyeToggle.tsx`, `index.ts`, `eye-toggle.css.ts` | C, S | 2 (index); css 3 | Frames 2 (+Frames/frames.css) | visibility eye | Kit/Elements; `eye-toggle.css.ts:4` composes `Menus/menu-base.css` `accessoryButton` — Elements reaching up into Menus; that class is a Button variant and should live in Buttons |
| `NavTrail.tsx`, `index.ts`, `nav-trail.css.ts` | C, S | 15 (index) | Interface 2, Navigation 2, Windows 2, Cards, Fields, Frames, MarkdownPM, Settings, Showcase, Tiles, Views, root/treeIndex | breadcrumb trail | Kit/Elements |
| `PickerControl.tsx`, `index.ts`, `picker-control.css.ts` | C, S, **HOST by import** | 11 (index) | Frames 6, Properties 3, Menus, Settings | fixed-option picker trigger; imports `@renderer/Actions/nativeMenus` (→ `useSession` + `window.nexus.rowMenu`) and `Pickers/picker-base` | **misfiled twice**: it is a Picker (opens a `PickerMenu`) → Kit/Pickers; and the native-menu branch is a kit → app → bridge dependency that should arrive as a prop or be lifted to the caller |
| `ProgressBar.tsx` + `.css.ts` | C, S | 3 | Controls/Slider, Interface/NotificationLabel, Properties/Cell | progress track | Kit/Elements |
| `segment.css.ts` | S | 5 | Buttons, Fields, Menus, Pickers, Tabs | hairline divider | Kit/Elements |

#### PommoraUIX/Fields (681)

| File | Class | Imp | Importer folders | Domain | Home |
| --- | --- | --- | --- | --- | --- |
| `index.ts` | barrel | 26 | Properties 5, Pickers 3, Frames 3, Interface 3, Settings 3, Toolbar 2, Views 2, Actions, Elements, Showcase, Tiles, Windows | | Kit/Fields |
| `EditableInput.tsx` | C | 2 | RenamableLabel, index | commit/cancel input | Kit/Fields |
| `InputField.tsx` | C | 2 | PathField, index | boxed field w/ press-to-edit | Kit/Fields |
| `RenamableLabel.tsx` | C | 2 | InputField, index | rename swap | Kit/Fields |
| `PathField.tsx` | C | 1 | index | path field + `BrowseButton` (browse is a callback; host-neutral) | Kit/Fields |
| `SearchField.tsx` | C | 1 | index | search input | Kit/Fields |
| `SegmentRun.tsx` | C | 4 | Properties 2, Fields, Frames | divided FileLabel run | Kit/Fields |
| `fieldRing.ts` | L (style helper) | 10 | Pickers 3, Fields 2, Frames 2, Menus, Properties, Showcase | `--field-ring` channel; imports `Animation/motion` | Kit/Fields |
| `fields.css.ts` | S | 14 | Fields 5, Pickers 3, Properties 2, Elements, Menus, Frames, Showcase | field chrome; `fieldSizing: 'content'` (line 83) is Chromium-only | Kit/Fields |
| `segment-run.css.ts` | S | 2 | SegmentRun, Frames/FilterFrame | | Kit/Fields |

#### PommoraUIX/Glass (448)

| File | Class | Imp | Importer folders | Domain | Home |
| --- | --- | --- | --- | --- | --- |
| `index.ts` | barrel | 12 | Windows 3, Controls 2, Pickers 2, Showcase 2, Buttons, Menus, Interface | | Kit/Glass |
| `glass-base.tsx` | L (style + geometry) | 6 | Glass 4, Menus/menu-surface.css, Interactions/DragGhost | frost recipe, beak path | Kit/Glass |
| `glass-control.tsx` | C | 1 | index | `@samasante/liquid-glass` wrappers | Kit/Glass |
| `glass-pane.tsx` | C | 2 | root/App, index | `GlassPane`; `Surface` (line 23) is "the app's root glass" with a `surface-glass` class used only by App | Kit/Glass; `Surface` is a Shell one-liner |
| `glass-surface.tsx` | C | 1 | index | notched menu glass | Kit/Glass |
| `glass-window.tsx` | C | 1 | index | window glass | Kit/Glass |

#### PommoraUIX/Menus (1,298)

| File | Class | Imp | Importer folders | Domain | Home |
| --- | --- | --- | --- | --- | --- |
| `index.ts` | barrel | 44 | Frames 14, Properties 9, Settings 5, Toolbar 5, Showcase 3, Tiles 2, Views 2, MarkdownPM, Navigation, Sidebar, Windows | | Kit/Menus |
| `menu-row.tsx` | C | 5 | Menus 3, Pickers 2 | MenuItem/Separator/Footing/AccessoryButton/ScrollFrame | Kit/Menus |
| `menu-base.css.ts` | S, **HOST line** | 29 | Frames 7, Menus 4, Pickers 4, Properties 4, Tiles 3, Elements 2, Toolbar 2, Navigation, Settings, Windows | row/heading/footing styles; `titleInput` sets `WebkitAppRegion: 'no-drag'` (line 166) | Kit/Menus; line 166 → Host CSS |
| `menu-base.tsx` | C | 1 | index | `MenuDropdown` (trigger + pane + dismissal) | Kit/Menus |
| `menu-surface.tsx` + `.css.ts` | C, S | 2 / 2 | index, menu-base; Tiles/ViewTile | beaked menu glass | Kit/Menus |
| `menu-index.tsx` | C | 1 | index | declarative `MenuIndex`/`MenuRow` | Kit/Menus |
| `menu-disclosure.tsx` | C/H | 1 | index | `DisclosureRow`, `useDisclosureSet` | Kit/Menus |
| `menu-anchor.ts` | L (style helper) | 4 | Pickers 2, Frames, Toolbar | CSS-anchored placement | Kit/Menus |
| `listed-outline.css.ts` | S | 4 | Menus, Frames, Sidebar, Views | disclosure chevron + rail | Kit/Menus |
| `frame-slide.tsx` + `.css.ts` | C, S | 8 | Frames 4, MarkdownPM, Tiles, Toolbar, Views | two-slot push/back | Kit/Menus |
| `frame-growth.ts` | L (style helper) | 2 | Frames/filter-frame.css, Properties/page-properties.css | Frame width rule | Kit/Menus |

#### PommoraUIX/Pickers (2,348)

| File | Class | Imp | Importer folders | Domain | Home |
| --- | --- | --- | --- | --- | --- |
| `picker-base.tsx` | C | 23 | Properties 5, Pickers 4, Views 3, Frames 2, Tiles 2, Elements, Menus, Interface, MarkdownPM, Settings, Showcase, Windows | portalled `PickerMenu`, `PickerRow`; uses `Interactions/dismissalStack`, `useHeld`, `Animation/useExitPresence` | Kit/Pickers |
| `picker-base.css.ts` | S | 6 | Tiles 2, Pickers, Frames, MarkdownPM, Toolbar | | Kit/Pickers |
| `CalendarPicker.tsx` + `.css.ts` | C, S | 3 | Frames/FilterFrame, Properties/DatetimeValuePicker, Showcase | date/range/time picker; formatting arrives as a prop | Kit/Pickers |
| `ColorPicker.tsx` + `.css.ts` | C, S | 5 | Toolbar 2, Controls, Properties, Tiles | 8×8 grid | Kit/Pickers |
| `TextPicker.tsx`, `index.ts`, `.css.ts` | C, S | 3 (index) | Views 2, Properties | text-entry pane | Kit/Pickers |
| `IconPicker.tsx` + `.css.ts` | C, S | 2 | Settings/IconPicker, Settings/iconFavorites (type) | virtualized Lucide grid; favorites arrive as props | Kit/Pickers (already store-free; the binding in Settings is the misfile — see Utilities) |
| `ImagePicker/ImagePicker.tsx` | C, **HOST** | 8 | Interface 2, Frames, MarkdownPM, Showcase, Sidebar, Tiles, Views | crop editor: `useSession` (assetMap, tree.crops) lines 56–57; `window.nexus.pasteImage` 130, `pickFile` 193; `EyeDropper` 198 (Chromium-only, presence-guarded); `@shared/cropGeometry`, `Assets/*` | **misfiled** → Assets (feature UI over the Nexus asset map, not a library primitive) |
| `ImagePicker/image-picker.css.ts` | S | 1 | ImagePicker | | follows ImagePicker |

#### PommoraUIX/Symbols (457)

| File | Class | Imp | Importer folders | Domain | Home |
| --- | --- | --- | --- | --- | --- |
| `index.tsx` | C + registry | 76 | Frames 14, Showcase 11, Properties 8, Pickers 4, Interface 4, Views 4, Elements 3, Menus 3, Sidebar 3, Tiles 3, Toolbar 3, Windows 3, root 2, MarkdownPM 2, Settings 2, … | `icons` roster, `Icon`, `asIconName`, `iconNameOr`, `asRenderableIcon` — and `DEFAULT_NEXUS_ICON`, `DEFAULT_ENTITY_ICONS`, `entityIcon` (lines 192–208) keyed on `EntityIconKind` from `@shared/types` | Kit/Symbols; lines 192–208 are Nexus iconography policy → Assets (beside `EntityIcon`) |
| `allSymbols.ts` | L | 2 | Pickers/IconPicker, index | full Lucide set, kebab ids, search | Kit/Symbols |
| `customGlyphs.tsx` | C | 2 | fileTypes, index | hand-drawn + Tabler adapters | Kit/Symbols |
| `fileTypes.ts` | L | 2 | Labels/recipes, index | extension → glyph | Kit/Symbols |
| `masks.ts` | T | 1 | Tokens/theme-vars | CSS-mask glyphs | Kit/Symbols |

#### Animation (284)

| File | Class | Imp | Importer folders | Domain | Home |
| --- | --- | --- | --- | --- | --- |
| `index.ts` | barrel | 21 | Windows 6, Frames 3, Interface 3, Menus 2, Properties 2, root, MarkdownPM, Settings, Tabs, Tiles | | Kit/Motion |
| `motion.ts` | T | 11 | Animation 5, Controls, Fields, Pickers, Tokens, Interactions, Windows | `duration`/`easing`/`ms` | **Kit/Tokens** (it is a token file living outside Tokens) |
| `feel.tsx` | T | 6 | Interactions 2, Animation, Showcase, Tiles, Views | drag feel (duration+easing pairs) | **Kit/Tokens** (motion) |
| `animations.css.ts` | S (keyframes) | 5 | Animation, Buttons, Menus, Pickers, Tiles | Bloom, window in/out, titleReveal | Kit/Motion |
| `Reveal.tsx` | C | 9 | Menus 2, Views 2, Animation, Pickers, Frames, Properties, Sidebar | grid-rows unfold | Kit/Motion |
| `useExitPresence.ts` | H | 12 | Windows 5, Menus 2, Animation, Pickers, Settings, Toolbar, Utilities | mount-through-exit; also `useHeldPresence` (lines 32–40) | Kit/Motion |
| `useEntrance.ts` | H | 1 | index | which rows are new | Kit/Motion |
| `paneSlide.ts` + `pane-slide.css.ts` | L, S | 1 / 1 | index (consumed by App only) | `--io`/`--io-l` slide, whose `@property` registration lives in `styles.css:59–69` | **Shell** (the mechanism is the shell's; nothing else drives `--io`) |
| `toolbar-slide.css` | P | 2 | Toolbar/Toolbar, Windows/window-base | `.app-toolbar, .window { --toolbar-slide }` | **Shell** (feature selectors on two Shell hosts) |

#### Assets (211)

| File | Class | Imp | Importer folders | Domain | Home |
| --- | --- | --- | --- | --- | --- |
| `assetUrl.ts` | L, **HOST line** | 7 | Properties 2, Assets, Pickers, Navigation, Views, root/store | `assetUrl()` mints `nexus-asset://nexus/…` (line 11); `resolveAssetValue`/`resolveFileValue`/`resolveAssetUrl` are pure resolution over `AssetMap` via `@shared/connections` + `@shared/nexusPaths` | split: resolvers → Core; the scheme → Host (the Decision Log's D-3 already wants per-host injection) |
| `AssetImage.tsx` | C (connected) | 9 | Interface 2, Pickers, Frames, MarkdownPM, Sidebar, Tiles, Utilities, Views | draws a stored image with crop; `useSession` | Assets |
| `asset-image.css.ts` | S | 1 | AssetImage | | Assets |
| `imageAspect.ts` | L + H | 2 | AssetImage, Pickers/ImagePicker | natural-aspect cache (`new Image()`) | Assets (kit-grade, but its only callers are here) |

#### Interactions (3,593)

| File | Class | Imp | Importer folders | Domain | Home |
| --- | --- | --- | --- | --- | --- |
| `gesture.ts` | H + L | 11 | Pickers 2, Interactions 2, MarkdownPM 2, Tables 2, Controls, Tiles, Views | singleton pointer skeleton | Kit/Gestures |
| `engine.tsx` | C + H | 1 | drag | `Zone` slot-reflow sortable (own pointer listeners, lines 345–368) | Kit/Gestures |
| `group.tsx` | C + H | 1 | drag | `DragGroup` cross-list (own window listeners, lines 568–612) | Kit/Gestures |
| `drag.tsx` | C facade | 14 | Showcase 5, Cards, Pickers, Navigation, Sidebar, Tables, Tabs, Tiles, Views, Windows | `SortableZone`, `useDragItem`, `reorder`, `arraySwap` | Kit/Gestures |
| `insertionDrag.tsx` | H | 7 | Frames 2, Properties, Sidebar, Tables, Toolbar, Views | line-insertion drag on `gesture` | Kit/Gestures |
| `snapshot.ts` | H | 1 | insertionDrag | frozen-geometry discipline | Kit/Gestures |
| `shared.ts` | L/T | 10 | Interactions 6, Tiles 2, Tables, Tabs | `Box`, `ACTIVATION`, `toBox`, `suppressNextClick` | Kit/Gestures |
| `keyboard.ts` | L | 1 | engine | arrow-key target | Kit/Gestures (could inline into engine) |
| `a11y.ts` | L (DOM) | 4 | Interactions 3, Views | live-region announcer for DnD | Kit/Gestures |
| `autoscroll.ts` + `autoscroll.css.ts` | L, S | 10 / 1 | Interactions 4, MarkdownPM 3, Views 2, Tiles; main.tsx | edge auto-scroll + `scrollGlide`; imports `Animation/motion` | Kit/Gestures |
| `dragDisclose.ts` | L | 5 | Interactions 2, Frames, Sidebar, Views | dwell-to-expand during drag | Kit/Gestures |
| `DragGhost.tsx`, `DropLine.tsx`, `drop-chrome.css` | C, C, P | 1 / 3 / 2 | insertionDrag; Properties 2 | drag chrome | Kit/Gestures |
| `ResizeFrame.tsx` + `resize-frame.css` | H, P (**HOST line**) | 5 | Windows 2, root/App, Interface, MarkdownPM | drag-to-size/move; css line 7 `-webkit-app-region: no-drag` | Kit/Gestures; line 7 → Host CSS |
| `ghostCreate.ts` + `ghost-create.css` | H, P | 7 / 1 | Views 3, Properties 2, Interface, Sidebar; main.tsx | hover-dwell create ghost | Kit/Gestures (content-agnostic, four domains) |
| `dismissalStack.ts` | L + H | 6 | Pickers 2, Menus, Tiles, Toolbar, Windows | outside-press/Escape stack for surfaces | **Kit/Menus** (it is a surface mechanism, not a pointer engine) |
| `OverScroll.tsx` + `over-scroll.css` | C + L (document wiring), P | 19 / 2 | Windows 3, Properties 2, Tiles 2, Cards, Elements, Fields, Labels, Menus, Pickers, Frames, Interactions, Interface, Settings, Showcase, Tabs; main.tsx | truncation fade + hover scroll; reads `--duration-base` at runtime with a 240ms fallback (line 87) | **Kit/Elements** (a text affordance every label uses) |
| `HoverRemove.tsx` + `hover-remove.css.ts` | C, S | 4 / 1 | Labels/Label, MarkdownPM, Tabs, Windows | hover × with label melt | **Kit/Labels** (its primary consumer and its `--melt-ground` contract) |
| `activate.ts` | L | 8 | Fields, Menus, Frames, Interface, Navigation, Showcase, Tabs, Views | Enter/Space → click | Kit/util |
| `useHeld.ts` | H | 4 | Pickers, Interface, Tiles, Windows | hold last value while live | **Kit/Motion** (twin of `useHeldPresence`, see §4) |
| `useKeepInView.ts` | H | 1 | MarkdownPM/AutocompletePane | `scrollIntoView` callback | **MarkdownPM** (one importer) or Kit/util |
| `revealBar.ts` + `reveal-bar.css` | H, P (**HOST line**) | 2 / 1 | Interface/ContentView, Windows/window-base; main.tsx | footer reveal zones; css names `.window-footer-toggle`, `.subfield-toggle`, `.footnotes-toggle` and `revealBar.ts:43` queries `.footnotes-toggle`; css line 29 `-webkit-app-region: no-drag` | **Shell/Windows** (feature selectors of Windows, Interface, and MarkdownPM) |

#### Utilities (171)

| File | Class | Imp | Importer folders | Domain | Home |
| --- | --- | --- | --- | --- | --- |
| `EntityIcon.tsx` + `entity-icon.css` | C (connected) | 10 | Frames 2, Navigation 2, Views 2, MarkdownPM, Properties, Tabs, Windows | entity glyph from `personalization.defaultIcons` + Nexus photo | **Assets** (iconography) |
| `useNexusIcon.ts` | H, **HOST** | 2 | Frames/SettingsScaffold, Sidebar/NexusPhoto | Nexus profile icon/photo flow; `window.nexus.iconMenu` (17), `pickFile` (23); `useSession.mutate` | **Assets** (iconography) with the two bridge calls behind the Host seam |
| `iteration-window.tsx` + `.css` | C (connected) | 1 | root/App | dev scratch `WindowBase`, store `iterationOpen` | **Windows** (DEV-gated); it is a window, not a utility |

#### Testing (200)

| File | Class | Imp (test-only) | Importer folders | Domain | Home |
| --- | --- | --- | --- | --- | --- |
| `setup.ts` | X | vitest `setupFiles` | — | jsdom shims (elementFromPoint, Range rects, ResizeObserver, scrollIntoView) | Testing |
| `pointerHarness.ts` | X | 15 tests | Interactions, Controls, Tiles, Views… | synthetic pointer events, rect stubs | Testing |
| `editorHarness.ts` | X, **HOST stub** | 23 tests | MarkdownPM, Tiles… | mounts `MarkdownEditor`; `stubEditorBridge` writes `window.nexus` (line 40) — the test host | Testing |
| `pageValues.ts` | X | 5 tests | | frontmatter → PageValues | Testing (Core-shaped; fine here) |
| `propsAtRoot.ts` | X | 9 tests | | property id → name | Testing |

#### Renderer root (1,386)

| File | Class | Imp | Importer folders | Domain | Home |
| --- | --- | --- | --- | --- | --- |
| `main.tsx` | entry, **HOST** | 0 | — | `createRoot`, `initNativeCaret`, DEV `__pommora` seam, and a manifest of 13 global stylesheets from six folders plus the Tokens side-effect import (lines 5–19) | Host entry (Desktop's renderer `main`); the CSS manifest should dissolve into owning folders |
| `App.tsx` | C, **HOST** | 1 | main | shell layout + 14 `window.nexus.on*`/`assetMap` call sites (lines 83–173) + three chords | Shell; lines 83–173 → a `useBridgeSubscriptions` hook in Host |
| `store.ts` | L (Zustand root) | 95 (+34 tests) | Interface 14, MarkdownPM 12, Frames 9, Properties 8, Windows 8, Views 7, Actions 6, Settings 5, Tiles 5, Toolbar 5, Navigation 4, Sidebar 3, Utilities 3, root 2, Assets, Pickers, Tables, Tabs | composes 7 `Store/*` slices; also `useEmbedScale`, `useAssetUrl` (Assets hook), `wireViewAdopted` (Views wiring) | **Store/index.ts** |
| `treeIndex.ts` | L | 22 (+4) | Interface 4, Actions 3, Store 3, Windows 3, Navigation 2, Tiles 2, Frames, MarkdownPM, Properties, Tabs, Views | one walk per tree → lazy projections; imports `MarkdownPM/Connections` `buildPageIndex`, `Navigation/*`, `Actions/selection`, `Symbols` `entityIcon`, `NavTrail` types | **Store** |
| `nativeCaret.ts` | L (document listeners) | 1 | main | drawn caret + selection pills over native fields; pure DOM | Kit/Caret |
| `Carets.css` | P | main | — | caret identity shared with `MarkdownPM/Editor/caret.ts` | Kit/Caret |
| `text-selection.css` | P | main | — | drawn selection | Kit/Caret |
| `styles.css` | P, **HOST lines** | main | — | resets (16–47), `.hover-pop`, `@property --io/--io-l` (59–69), `.shell`/`.titlebar`/`.content-pane`/`.state` (77–163); `-webkit-app-region` at 114, 128, 160 | split: resets → Kit/Tokens global; `.shell` family → Shell; app-region + `.titlebar`/`.sidebar-titlebar` → Host CSS |
| `env.d.ts`, `index.html` | build | — | — | Vite shims / entry document | package root (host entry) |

### 2. Design System vs Feature UI

**Genuinely reusable (would exist in a component library, render from props alone):** Buttons, Labels, Controls, Elements minus `PickerControl`'s native branch, Fields, Glass, Menus, Symbols' registry + `Icon`, Tokens minus `personalization.ts`, `picker-base`, `CalendarPicker`, `ColorPicker`, `TextPicker`, `IconPicker`. Every one of these is imported from three or more unrelated feature folders and none reads the store. `IconPicker` deserves a specific note: by code it is already correct — favorites arrive as `{ ids, onChange, onMenu }` props; only the binding wrapper lives in the wrong place.

**Feature UI filed as design system:**

- `Pickers/ImagePicker/ImagePicker.tsx` — reads `useSession` for `assetMap` and `tree.crops` (56–57), calls `window.nexus.pasteImage` (130) and `pickFile` (193), uses `cropFor` from `Assets/AssetImage` and `@shared/cropGeometry`. This is the Nexus asset crop editor. Owner: Assets.
- `Tokens/personalization.ts` — a table from `Personalization` keys (`hideChevrons`, `outlinerLines`, `codeblockLineCount`, `plainUnresolvedLinks`, `nativeHighlight`, `muteCheckedItems`, `pickerSelection`, `tabMinWidth`, `tabMaxWidth`, `checkboxColor`, …) to root vars and classes. Its two importers are both Store slices. Owner: Store (or Settings; Store wins because it is the writer).
- `Elements/PickerControl` — a Picker filed under Elements, and the only kit file that imports from `Actions/` (`useNativeMenus`, `popRowMenu` → `useSession` + `window.nexus.rowMenu`). Owner: Kit/Pickers, with the native path injected (a `native?: (items) => Promise<string | null>` prop, or the caller wraps it).
- `Symbols/index.tsx:192–208` — `DEFAULT_NEXUS_ICON`, `DEFAULT_ENTITY_ICONS`, `entityIcon` encode Pommora's entity kinds (collection/set/space/page/context) into the icon registry. Owner: the iconography domain (Assets), beside `EntityIcon`.
- `Tokens/size.css.ts:28–38` — `TILE_MIN_PX`, `TILE_DEFAULT_PX`, `TILE_GAP_PX` are Tiles knobs, bridged by `theme-vars` as `--tile-default-height`/`--tile-gap`. Owner: Tiles (with its own global-var bridge).
- `Glass/glass-pane.tsx:23` `Surface` — a one-line App-only wrapper adding `surface-glass`. Owner: Shell.
- `Util/` — four of five files (`capMap`, `checkSet`, `moveItem`, `pad`) are pure data helpers imported by Store, MarkdownPM, Views/Pipeline, Properties/formatValue, Settings, Windows. None touches the DOM. Owner: Core (`shared/`), following `@shared/clamp`. Only `cx` is a UI utility.

**Kit-internal layering leaks worth fixing during the move** (not misfiles, but they show the sub-folders aren't ordered): `Elements/eye-toggle.css.ts:4` composes `Menus/menu-base.css` `accessoryButton`; `Elements/picker-control.css.ts:4` composes `Menus` `footingBar`; `Tokens/theme-vars.css.ts:21` imports `Animation/motion`; `Labels/Label.tsx:3–4` imports `Interactions/HoverRemove` and `OverScroll`. After the merge into one `Kit/` these become intra-package edges, but the token file reaching into Animation and an Element composing a Menu class should still be inverted.

### 3. Interactions: One Engine Plus Helpers?

**The engine family (17 files, ≈2,700 lines):** `gesture.ts` (singleton pointer skeleton), `engine.tsx` (`Zone`, slot-reflow), `group.tsx` (`DragGroup`, cross-list), `drag.tsx` (facade), `insertionDrag.tsx` (line-insertion), `snapshot.ts`, `shared.ts`, `keyboard.ts`, `a11y.ts`, `autoscroll.ts` + `.css.ts`, `dragDisclose.ts`, `DragGhost`, `DropLine`, `drop-chrome.css`, `ResizeFrame` + `.css`, and `ghostCreate` + `.css` as the one hover-state machine. These cohere: two drag models (reflow vs insertion line) plus resize, all on shared activation/hysteresis/auto-scroll/announce.

**It is one folder but not one skeleton.** `gesture.ts` is the pointer skeleton for `insertionDrag`, `ResizeFrame`, `Slider`, `CalendarPicker`, `ImagePicker`, and two Tables/MarkdownPM callers. `engine.tsx:345–368` and `group.tsx:568–612` each hand-roll their own `begin`/`onMove`/`detach` with their own activation test, buttons-released guard, and click suppression — three writers of the same gesture. Placement can't fix that, but the merged `Kit/Gestures` folder is where the two engines should be rebased onto `gesture.ts`.

**Helpers that belong elsewhere:**

| File | Why it isn't engine | Home |
| --- | --- | --- |
| `dismissalStack.ts` | outside-press/Escape stack for surfaces; importers are Pickers, Menus, Tiles, Toolbar, Windows | Kit/Menus |
| `OverScroll.tsx` + `over-scroll.css` | text truncation fade; 19 importers, mostly labels/rows | Kit/Elements |
| `HoverRemove.tsx` + `hover-remove.css.ts` | chip × affordance; `Label.tsx` is the primary consumer and the `--melt-ground` contract is Labels' | Kit/Labels |
| `activate.ts` | keyboard-to-click helper | Kit/util |
| `useHeld.ts` | presence hook, twin of `useHeldPresence` | Kit/Motion |
| `useKeepInView.ts` | one importer | MarkdownPM/AutocompletePane |
| `revealBar.ts` + `reveal-bar.css` | selectors name `.window-footer-toggle`, `.subfield-toggle`, `.footnotes-toggle`; `revealBar.ts:43` hard-codes `.footnotes-toggle` | Shell (Windows/Interface) |
| `keyboard.ts` | engine-only | stays, or inline into engine |
| `a11y.ts` | DnD announcer, used by both engines + insertion + Views | stays |

**Global CSS registration is inverted:** `autoscroll.css.ts`, `ghost-create.css`, `over-scroll.css`, `reveal-bar.css` are imported by `main.tsx:7–11`, not by their owners. `OverScroll.tsx` and `DropLine.tsx`/`drag.tsx` do import their own CSS; the other three should too (`Tokens/index.ts` importing `theme-vars.css` is the in-repo precedent), so a second host entry doesn't have to know the kit's stylesheet list.

### 4. Motion Across Animation / Interactions / Tokens

Yes — one concern, four reading paths:

1. **Token values** live in `Animation/motion.ts` (`duration`, `easing`) and `Animation/feel.tsx` (drag feel). They are imported directly by `Tokens/theme-vars.css.ts:21` (Tokens depending on Animation), `Fields/fieldRing.ts:2`, `Controls/dual-switch.css.ts:4`, `Pickers/calendar-picker.css.ts:3`, `Menus/frame-slide.css.ts:2`, `Interactions/autoscroll.ts:1`, and `Interactions/engine.tsx:14`/`group.tsx:14` (feel).
2. **Bridged vars** `--duration-*`/`--ease-*` published by `theme-vars.css.ts:128–133`, read by every plain `.css` (`resize-frame.css`, `reveal-bar.css`, `ghost-create.css`, `styles.css`, …).
3. **Keyframes and named motions** in `Animation/animations.css.ts` (Bloom, window in/out, titleReveal) plus `Reveal.tsx`, `useExitPresence`, `useEntrance`.
4. **Runtime reads** — `Interactions/OverScroll.tsx:86–87` reads `--duration-base` via `getComputedStyle` and falls back to **240ms**, while `motion.ts:4` says `base: '280ms'`; `autoscroll.ts:237` restates the snap curve as `easeOutQuint` in JS. The split already produced one drift.

Two Animation files aren't kit at all: `paneSlide.ts`/`pane-slide.css.ts` (App is the only consumer; the `--io` property it animates is registered in `styles.css:59–69` and driven by `.shell` classes) and `toolbar-slide.css` (`.app-toolbar, .window` selectors — two Shell hosts). Both are Shell motion.

**Placement fix:** `motion.ts` + `feel.tsx` → `Kit/Tokens/motion.ts` (they are tokens; `theme-vars` then imports within its own folder). `animations.css.ts`, `Reveal`, `useExitPresence`/`useHeldPresence`, `useHeld`, `useEntrance` → `Kit/Motion`. `paneSlide`, `toolbar-slide.css` → Shell. `Interactions/` keeps only gestures. The `useHeld`/`useHeldPresence` pair (`Interactions/useHeld.ts:7`, `Animation/useExitPresence.ts:32–40`) are two writers of "hold the last value through exit" and should become one once co-located.

### 5. Utilities/ and Testing/

**Utilities/ doesn't earn its existence.** It holds three unrelated things: a connected icon component (`EntityIcon`, 10 importers across seven domains), the Nexus profile icon/photo flow (`useNexusIcon`, bridge-bound), and a dev scratch window (`iteration-window`, a `WindowBase` instance toggled by store state). Adding `Settings/IconPicker` + `iconFavorites` there, as the Context doc's debt row proposes, would make it a four-item junk drawer with the admission rule "doesn't fit anywhere else" — the rule the restructure exists to abolish.

The better reading: `EntityIcon`, `useNexusIcon`, `Settings/IconPicker` + `iconFavorites` (15 importers: Frames, Interface, Properties, Sidebar, Tiles, Toolbar, Views — not one of them Settings), `Assets/AssetImage`, `Pickers/ImagePicker`, `store.useAssetUrl`, `Symbols` `entityIcon` policy, and `assetUrl`'s resolvers are all **the store-aware media and iconography domain**: what an entity or the Nexus looks like, and how a stored image reference becomes pixels. One folder — keep the name `Assets/` — holds them (≈800 lines). Admission rule: renders or edits a Nexus image/icon; may read `useSession`; sits on the kit, never inside it. `iteration-window` → `Windows/`, DEV-gated.

**Testing/ earns its existence.** `setup.ts` is the vitest `setupFiles` entry; `pointerHarness` (15 test importers) and `editorHarness` (23) are the two jsdom harnesses; `pageValues` and `propsAtRoot` are fixture shapers. Nothing here is imported by production code. `editorHarness.stubEditorBridge` (line 40) writes `window.nexus` — it is, in effect, the test host, which is exactly how a host-injected bridge should look. Keep as the UIX package's test-support folder.

### 6. The Root Files

- **`main.tsx`** — legitimate entry, and host-specific by nature (the Decision Log's D-4 already anticipates a separate `MobileApp` entry). Two things don't belong in it: the thirteen-stylesheet manifest (lines 5–19: Cards, Sidebar, Interface ×2, Tables ×2, Interactions ×4, root ×3) — each owner should import its own — and `initNativeCaret()`, which is a kit behavior the entry happens to switch on. Reduced, it is `createRoot(<App/>)` plus the DEV seam.
- **`App.tsx`** — two files fused: the shell composition (layout, chords, pane frames, window mounts) and the bridge subscription block (lines 83–173, thirteen `window.nexus.on*` listeners plus `assetMap()`). The first is `Shell/App.tsx`; the second is a `useBridgeSubscriptions()` in Host. The chord at line 184 (`cmd+shift+t` → iteration window) is dev tooling hard-wired into the shell.
- **`store.ts` + `Store/`** — one thing in two places, unambiguously: `store.ts` composes seven slices that live in `Store/`, re-exports their selectors, and is imported 95 times as `@renderer/store` while the slices are imported from `Store/`. It also carries two strays: `useAssetUrl` (Assets domain) and `wireViewAdopted` (Views wiring into the store). Move to `Store/index.ts` (one alias line changes the 95 importers), `useAssetUrl` → Assets, `store.test.tsx` → `Store/`.
- **`treeIndex.ts`** — a state projection (one walk per tree, lazy WeakMap-cached indices) with 22 importers, three of them Store slices. It belongs in `Store/`. Two of its imports are the interesting ones: `MarkdownPM/Connections` (`buildPageIndex`) makes the store depend on the editor folder for title resolution — that index is Core-shaped and its home is beside `@shared/connections`; and `Symbols` `entityIcon` resolution baked into the walk (lines 91, 100, 109, 121, 134, 151) is why the Symbols file carries entity policy.
- **`nativeCaret.ts` + `Carets.css` + `text-selection.css`** — one feature (the drawn caret and selection over native fields) as three root files, sharing class names and keyframes with `MarkdownPM/Editor/caret.ts`. Pure DOM, host-neutral. Home: `Kit/Caret/`, with `initNativeCaret` called by whichever host mounts.
- **`styles.css`** — three files in one: global resets and `.hover-pop`/`.title-shadow` utilities (Kit global), the shell frame (`.shell`, `--io`, `.content-pane`, `.state*` → Shell), and Electron drag regions (`.titlebar`, `.sidebar-titlebar`, `.open-btn` at lines 106–132, 160 → Host).
- **`env.d.ts`, `index.html`** — bundler artifacts; they stay at the package/host entry root.

### 7. Host-Bound Files (a Capacitor host can't reuse without change)

**Bridge calls (`window.nexus`) inside my scope:**

- `App.tsx:84, 88, 92, 98, 106, 110, 117, 123, 127, 130, 134–135, 139, 143` — fourteen subscriptions/calls.
- `PommoraUIX/Pickers/ImagePicker/ImagePicker.tsx:130` (`pasteImage`), `:193` (`pickFile`).
- `Utilities/useNexusIcon.ts:17` (`iconMenu`), `:23` (`pickFile`).
- `PommoraUIX/Elements/PickerControl.tsx:6, 53, 65` via `Actions/nativeMenus.ts:20` (`window.nexus.rowMenu`) and `useSession` `devicePrefs.nativeMenus`.
- `Settings/iconFavorites.ts:15` (`iconFavoriteMenu`) — outside scope, but the proposed Utilities move drags it in.
- `Store/*` — 38 call sites across `cacheSlice` (5), `chromeSlice` (2), `configSlice` (3), `navigationSlice` (6), `nexusSlice` (18), `renameSlice` (2), `tabState` (1), `windowSlice` (1) (e.g. `nexusSlice.ts:84, 88, 160–183`, `navigationSlice.ts:227, 290, 517, 648, 668, 694`). The store is bridge-bound by design; it is reusable only if the bridge itself is host-injected (the Decision Log's D-1), which makes `window.nexus` the seam rather than a defect.
- `Testing/editorHarness.ts:40` writes the stub bridge — test host, fine.

**Asset scheme:** `Assets/assetUrl.ts:11` — `` `nexus-asset://nexus/${…}` ``; every `resolveAssetUrl` caller (Properties ×2, Pickers, Navigation, Views, store) inherits it.

**Electron drag regions (`-webkit-app-region`)** — ignored by WKWebView, so harmless at runtime, but Electron semantics living in kit CSS: `PommoraUIX/Menus/menu-base.css.ts:166` (`WebkitAppRegion: 'no-drag'`), `Interactions/resize-frame.css:7`, `Interactions/reveal-bar.css:29`, `styles.css:114, 128, 160`.

**Chromium-only APIs and CSS (engine-bound, not Electron-bound):**

- `ImagePicker.tsx:198–199` — `window.EyeDropper`, presence-guarded; the pipette button silently does nothing on WebKit.
- `PommoraUIX/Fields/fields.css.ts:83` and `Pickers/text-picker.css.ts:84` — `fieldSizing: 'content'`; WebKit ignores it, so the press-to-edit caret and the rename field stop shrink-wrapping (`nativeCaret.ts:69–71` also assumes it).
- `Interactions/over-scroll.css:68, 75` — `animation-timeline: scroll(self …)`; recent WebKit only, so the truncation fade needs verifying on the target iOS version.
- `scrollbar-width: none` (`menu-base.css.ts:264`, `icon-picker.css.ts:40, 55`, `text-picker.css.ts:38`, `over-scroll.css:86`, `iteration-window.css:9`) — WebKit 18.2+; older targets show scrollbars.

**Comment-only mentions of Electron** (`Tokens/accent.ts:30`, `Tokens/color.css.ts:35`, `group.tsx:391`) are not bindings; `accent.ts` already carries the non-Electron fallback (`readCssAccentColor`).

### 8. Folder Verdicts and the Collapsed Taxonomy

| Folder | Verdict | Admission rule after the move |
| --- | --- | --- |
| `PommoraUIX/` | **rename → `Kit/`**, absorbing `Interactions/` and `Animation/`; eject `ImagePicker`, `personalization.ts`, four `Util/` files, the entity-icon policy, the Tiles size knobs, `Surface` | renders or styles from props and tokens alone; no `@renderer/store`, no `window.nexus`, no `@shared/*` beyond value modules (`theme`, `clamp`); compiles in the Showcase build |
| `PommoraUIX/Tokens` | keep as `Kit/Tokens`, gaining `motion.ts` + `feel.tsx`, losing `personalization.ts` | a value or a bridge of values; exports no component |
| `PommoraUIX/Util` | **dissolve**: `cx` → `Kit/util`, the rest → Core | — |
| `PommoraUIX/Elements` | keep, minus `PickerControl` (→ Pickers), plus `OverScroll` | a leaf visual with no open/close state |
| `PommoraUIX/Pickers` | keep, plus `PickerControl`, minus `ImagePicker` | opens a `PickerMenu` to choose a value |
| `PommoraUIX/Menus` | keep, plus `dismissalStack` | a surface hung off a trigger, or the mechanics of one |
| `PommoraUIX/Labels` | keep, plus `HoverRemove` | a chip or its affordance |
| `Animation/` | **dissolve → `Kit/Tokens` (motion, feel) + `Kit/Motion` (keyframes, Reveal, presence hooks) + Shell (paneSlide, toolbar-slide)** | Motion: a named keyframe set or a mount/unmount hook with no domain knowledge |
| `Interactions/` | **rename → `Kit/Gestures`**, losing dismissal, OverScroll, HoverRemove, activate, useHeld, useKeepInView, revealBar | a pointer or hover state machine, or the chrome a drag paints |
| `Assets/` | **keep the name, widen the role**: the store-aware media + iconography domain (AssetImage, ImagePicker, EntityIcon, useNexusIcon, the IconPicker binding + favorites, useAssetUrl, the resolvers) | renders or edits a Nexus image or icon; may read the store |
| `Utilities/` | **dissolve** into Assets (two files) and Windows (iteration window) | — |
| `Testing/` | keep | imported only by tests or vitest config |
| root files | `store.ts` + `treeIndex.ts` → `Store/`; caret trio → `Kit/Caret`; `App.tsx` → `Shell/`; `styles.css` split three ways; `main.tsx`, `env.d.ts`, `index.html` stay as the host entry | the root holds entry artifacts only |

**The collapse of 25 folders into ten** (estimates are today's non-test line counts, re-filed; splits inside `Frames/` and `Interface/` are read from file names and are another lens's to confirm):

| # | Folder | Composed of | ≈ lines | Admission rule |
| --- | --- | --- | --- | --- |
| 1 | `Kit/` | PommoraUIX + Interactions + Animation as above, + the caret trio, − the ejections | 11,300 | host-neutral, store-free, props + tokens only |
| 2 | `Store/` | `Store/` + `store.ts` + `treeIndex.ts` + `Tokens/personalization.ts` + `Actions/selection`, `commands` | 2,700 | Zustand slices, tree projections, the settings→DOM applier; the one layer that speaks to the bridge |
| 3 | `Shell/` | `App.tsx`, the `.shell` half of `styles.css`, Toolbar, Sidebar, Tabs, Windows (+ iteration window), Navigation, Interface's chrome (ContentView, InspectorPane, Glance, NotificationLabel), paneSlide, toolbar-slide, revealBar | 9,700 | frames content or moves the frame; owns no page or view semantics |
| 4 | `Editor/` | MarkdownPM + Tiles + Interface's page surfaces (PageView, Banner, Subfield, pageFlush) | 19,600 | a CodeMirror surface, an embed inside one, or the page that hosts one |
| 5 | `Views/` | Views + Cards + Tables + the view Frames (Filter, Group, Sort, Hidden, Layout, View) | 11,600 | a Collection view type or a frame that configures one |
| 6 | `Properties/` | Properties + PropertyFrame | 4,700 | a property's editor, cell, or schema frame |
| 7 | `Settings/` | Settings + SettingsFrame/Scaffold, − the IconPicker binding | 2,400 | a Settings category frame |
| 8 | `Assets/` | as in §5 | 800 | Nexus image/icon rendering and editing |
| 9 | `Host/` | `assetUrl`'s scheme, `App.tsx:83–173` as a hook, `Actions/nativeMenus`, `openWebLink`, the `-webkit-app-region`/`.titlebar` CSS, `main.tsx` | 200 | touches `window.nexus`, a URL scheme, or Electron-only DOM/CSS; the only folder a second host replaces |
| 10 | `Testing/` | as is | 200 | test-only |

`Showcase/` (3,200) leaves the renderer entirely: it already has its own Vite config and HTML at the package root, imports nothing from Store or the bridge, and "only has to compile" — a sibling workspace, not a renderer folder. `Actions/` (399) dissolves into Store and Host. Totals land at ≈63,200 against today's 66,700 with Showcase; the gap is rounding on the two file-name splits.

### 9. Files Owned by a Different Scope

- **→ Core (`src/shared`):** `PommoraUIX/Util/capMap.ts`, `checkSet.ts`, `moveItem.ts`, `pad.ts`; the resolvers in `Assets/assetUrl.ts` (`resolveAssetValue`, `resolveFileValue`, `AssetValue`/`FileValue` types — lines 13–50); `MarkdownPM/Connections` `buildPageIndex` as consumed by `treeIndex.ts:22–27` (title resolution is not an editor concern); arguably `Tokens/colorMap.ts` (it interprets the on-disk color grammar).
- **→ Host (Desktop):** `Assets/assetUrl.ts:10–11`; `App.tsx:83–173`; `styles.css:106–132, 160`; `Interactions/resize-frame.css:7`; `Interactions/reveal-bar.css:29`; `PommoraUIX/Menus/menu-base.css.ts:166`; `Actions/nativeMenus.ts` (pulled in by `PickerControl`); the two bridge calls in `Utilities/useNexusIcon.ts:17, 23` and `Settings/iconFavorites.ts:15` (menu channels the Decision Log's D-1 says the phone answers `null`).
- **→ Store:** `Tokens/personalization.ts`; `store.ts`; `treeIndex.ts`; `store.useEmbedScale` stays; `store.wireViewAdopted` → Views or `nexusSlice`.
- **→ Shell:** `Animation/paneSlide.ts` + `pane-slide.css.ts`; `Animation/toolbar-slide.css`; `Interactions/revealBar.ts` + `reveal-bar.css`; `Glass/glass-pane.tsx` `Surface`; `styles.css:59–105, 134–157`.
- **→ Assets:** `Pickers/ImagePicker/*`; `Utilities/EntityIcon.tsx` + css; `Utilities/useNexusIcon.ts`; `Settings/IconPicker.tsx` + `iconFavorites.ts`; `Symbols/index.tsx:192–208`; `store.useAssetUrl`.
- **→ Tiles:** `Tokens/size.css.ts:28–38` and their `theme-vars` bridge lines 70–71.
- **→ Windows:** `Utilities/iteration-window.*`.
- **→ MarkdownPM:** `Interactions/useKeepInView.ts`.

### Summary

The scoped foundation is mostly sound: 87 of the 94 PommoraUIX files stay in the kit as store-free primitives (every barrel and component among them is imported from three or more unrelated feature folders), and Interactions holds a coherent gesture family. The filing failures are specific. `ImagePicker` and `Tokens/personalization.ts` are feature code inside the kit; `PickerControl` is a Picker under Elements that imports `Actions/nativeMenus`, the only kit → app → bridge edge. `Util/` is four Core helpers plus `cx`. Motion is one concern read four ways (`Animation/motion.ts` values, `theme-vars` bridge, `animations.css.ts` keyframes, and `OverScroll`'s runtime read with a 240ms fallback against a 280ms token), and two Animation files are Shell mechanics. Interactions carries seven non-gesture helpers, and its own two engines don't use its `gesture.ts` skeleton. `Utilities/` is a junk drawer whose contents, with `AssetImage`, `ImagePicker`, and the Settings IconPicker binding, form one store-aware media/iconography domain under `Assets/`. `store.ts` + `Store/` and `treeIndex.ts` are one Store. Host binding is narrow and enumerable: fourteen bridge call sites in `App.tsx`, four bridge calls in pickers, one asset scheme line, six drag-region lines, and three Chromium-only features (`EyeDropper`, `field-sizing`, scroll-driven timelines). Proposed shape: ten folders, `Kit/` ≈11,300 lines, `Host/` ≈200, Showcase out of the renderer.
