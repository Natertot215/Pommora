## Renderer Atlas

**Date:** 08-26-2026, re-grounded 08-28 · **Scope:** `Pommora/src/renderer/src` — 494 non-test source files, 675 in all, 65,900 non-test lines · **Base:** `cd36b8e6`, re-counted at `473d9bb8`

The renderer as it is, the renderer as it should be, and the calls between. It is grouped by subject — **Structure**, **Naming**, **Geometry & Variables**, **Tokens**, **Styling** — so each finding sits in one place and every open conflict is a single block you delete once it is ruled. Seven read-only lenses produced the first reading; every claim that places a file or sets a verdict was opened at its cited line, and the 08-28 re-grounding re-ran every count against the tree after the store split, the token inset ladder, the vocabulary pass, the `Links/` and `Interface/` moves, and the first half of the Menu recipe.

### Summary

**The renderer works.** It is filed mostly by what things are now, and its design system is read far more correctly than it is used. The lenses found no dead code, no wrong architecture, and one behavioral bug. What remains is filing residue and geometry drift, each with a mechanical fix.

**Structure.** The value layer, the card and table chrome, the floating windows, the link cluster, and the main pane are filed by what they are. What is left: twelve app-core modules at the root with no folder; `Components/` holding three shared helpers under a name the design system also uses; `Blocks/` and `Embeds/` splitting one tile world; `Tabs/` beside `Navigation/`; the Showcase inside the tree it demonstrates; and the design system reaching upward into the app in exactly three files. The target tree (§Structure) places every file under eight testable rules, and the instrument is `git mv`.

**Geometry.** Motion is perfect — 165 reads, zero off the ladder. Color is near-perfect — 20 raw values, all accounted for. Geometry is where the discipline stops: hundreds of bare pixel values on the even grid the code already agreed on, with the inset and clearance families now named (`--app-inset`, `--surface-inset`, `--content-inset`, `--content-edge`, `--subfield-h`) and the rest still literal by ruling (Settled §25).

**What this document decides.** The eight rules and the tree are the atlas's own calls, drawn from evidence and the rulings already taken. The open decisions in each section and the taste-marked token verdicts are recommendations awaiting a stamp; the structural ones gate the tree's non-mechanical moves, everything else can start today. Nothing here changes behavior except one line in `ViewEmbedBlock.tsx`.

**The lenses.** Seven read-only passes keyed on the file path so their tables join: **Cartographer** (what each file is and who consumes it, from a resolved import graph), **Boundary** (every import crossing a domain line), **Stylist** (what each file styles with), **Semantic** (whether a token read is for what the token is for), **Recipe** (whether a token's readers say it should be something else), **Lexicographer** (names against convention), **Archivist** (what was already ruled, verified against the code).

---

### Structure

#### The Shape Now

Twenty-one top-level folders hold 494 non-test files and 65,900 lines. The three biggest are `MarkdownPM/`, `DesignSystem/`, and `Properties/`. Three numbers frame the rest: **zero** dead files (every file but `env.d.ts`, `main.tsx`, and `testing/setup.ts` is reached); **four** files still have no importer inside their own folder; **three** files inside the design system import the app.

**The design system reaches upward in exactly three files, and two read the store.** `DesignSystem/Components/AssetImage/AssetImage.tsx:7` imports `@renderer/store`; `DesignSystem/Components/Pickers/ImagePicker/ImagePicker.tsx:15` does the same and holds the only `window.nexus` calls in the design system; `DesignSystem/Elements/PickerControl/PickerControl.tsx:7` imports `@renderer/nativeMenus`, itself store and IPC. The Showcase deploys from these same sources, so two components in the deployed library need a nexus store to render. The fix pattern already exists: `Settings/IconPicker.tsx` is a ten-line wrapper that binds this nexus's favorites and hands them to the design-system `IconPicker` as a prop. A fourth reach is a type only — `DesignSystem/Symbols/index.tsx` imports `EntityIconKind` from `@shared/types` — and is the one to name as deliberate rather than close.

**`Components/` holds three shared helpers** — `EntityIcon.tsx` (6 consumers, 5 folders), `RenamableTitle.tsx` (3 consumers, 3 folders), `useNexusIcon.ts` (2) — under a name `DesignSystem/Components/` also carries. Its outbound edges are two, both into the design system. The ruling is `Utilities/` ([[Tiles — Decision Log]] E-1), and `Settings/IconPicker.tsx` with `iconFavorites.ts` joins it as `NexusIconPicker` — fourteen importers across nine folders with no plurality, and an export name that shadows the design-system `IconPicker` it wraps.

**The renderer root is an unnamed core folder.** Ten modules beside the two entries and two global sheets, every one consumed across folders: `store.ts` (a 49-line barrel over `Store/`'s seven slices, 114 importers), `treeIndex.ts`, `assetUrl.ts`, `pageMenuActions.ts`, `selection.ts`, `Commands.ts`, `destinationTree.ts`, `nativeMenus.ts`, `nativeCaret.ts`. The codemap documents two of them. `Tabs/warmCache.ts` (11 importers, none in `Tabs/`) belongs with them.

**The store is seven slices and a barrel.** `Store/` holds `CacheSlice`, `ChromeSlice`, `ConfigSlice`, `NavigationSlice`, `NexusSlice`, `PreviewSlice`, `RenameSlice`, and `SessionState` — 1,927 lines; `store.ts` composes them and re-exports the selectors. A slice imports no feature module; the cycle the old composition root held is gone.

**The value layer is `Properties/`, and the order is `DesignSystem ← Properties ← Tables ← Views`, with `Cards/` standing alone.** `Properties/Editing/` holds the shared property-value vocabulary — `formatValue`, `PropertyPicker`, `OptionChip`, `PropertyEditor`, `DatetimeValuePicker`, `Cell`, `checkboxLook`, `columnLabel`, `usePropertyRows` — and `Properties/` root the resolution modules (`value`, `contextIdentity`, `contextOptions`, `resolveContext`). `Tables/` imports it downward for the cell renderers; `Views/` imports both. One upward edge remains by ruling: `Properties/PropertyFrame.tsx:19,21` reads `useActiveView` (Views) and `useStyleFor` (Tables) for its per-column Style radios, which read and write the active view's `column_styles` — a view-settings section inside the Properties frame. `usePropertyRows.ts`'s two consumers, `Properties/PageProperties.tsx` and `Windows/WindowInspector.tsx`, still share roughly 470 identical lines of row chrome.

**Four files have no importer inside their own folder.** `Settings/IconPicker.tsx` (14 consumers), `Embeds/ViewEmbedScope.tsx` (14 — view infrastructure filed as an embed detail), `Tabs/warmCache.ts` (11 — a cache, not a tab), `Links/connectionMenu.ts` (10 — every link surface's menu). Each has a row in [[RendererRefactor]] or [[Tiles — Decision Log]].

**The lateral graph.** The feature-to-feature edges left after the moves: `Views → Properties` 53 (the value layer, by design), `MarkdownPM → Embeds` 4 (the tile seam, folding into `Tiles/`), `Properties → Components` 1. The heavy edges are all downward into the design system — `Properties` 115, `Frames` 109, `Views` 54, `Windows` 42 — which is the shape the rules want. `MarkdownPM/` and `SurfacePM/` (zero outbound) are the boundaries that hold.

**IPC is narrow at the preload and wide at the call sites.** `window.nexus` is called at 215 sites (201 outside tests) across seventeen folders and three root files against 136 channels in `shared/bridge.ts` (121 asks, 5 tells, 10 pushes), with no renderer-side client module, so the `Result` envelope is unwrapped by hand two hundred times. A Cleanup-lane finding, beside the `main/index.ts` split that carves the same context from the other side.

#### The Filing Rules

Eight statements that decide where anything goes. Each is testable with a grep, each is what the tree was drawn from, and each files the next module when the tree is out of date.

- **R1 — Reach decides the layer.** A module that imports `@renderer/store`, calls `window.nexus`, or imports `nativeMenus` is a *surface* or *glue* and lives in a feature folder. One that does none of those and knows no entity kind is a *piece* and may live in `DesignSystem/`. `DesignSystem/**` imports nothing from `@renderer/*` outside itself; its one sanctioned type-only reach is `Symbols/` reading `EntityIconKind` from `@shared`. *Test:* `grep -rl "@renderer/store\|window\.nexus\|@renderer/nativeMenus" DesignSystem/` returns nothing. *Today:* three files.
- **R2 — Consumers decide the folder.** A module consumed from three or more top-level folders with no plurality in any one is shared: a piece to `DesignSystem/`, a model or glue to `Core/`, an app-bound wrapper to `Utilities/`. A module with every consumer in one other folder belongs in that folder. *Test:* a file with zero importers in its own folder has failed this rule. *Today:* four files.
- **R3 — A folder is named for what it holds, and no name appears twice.** A folder holding one file is a file. *Test:* `find . -type d | xargs -n1 basename | sort | uniq -d` returns nothing under `renderer/src`. *Today:* `Components` (root vs `DesignSystem/`) and `Tables` (root vs `MarkdownPM/`).
- **R4 — Properties is the value layer; Tables and Views import it downward.** `Properties/` holds the schema surface and the value vocabulary alike — resolution at its root, the formatters, cell, pickers, checkbox glyph, and column naming under `Editing/`, the per-type option editors under `Editors/`. `Tables/` is the tabular chrome and column mechanics; `Views/` the saved-view pipeline and renderers; `Cards/` the card chassis. *Test:* `grep -rl "@renderer/Views/\|@renderer/Tables/" Properties/` lists only `PropertyFrame.tsx` (the ruled Style-radio edge); `grep -rl "@renderer/Views/" Tables/ Cards/` returns nothing.
- **R5 — A value read from two folders is a token, declared once.** Tokens in `DesignSystem/Tokens/`; the frost specular constants in `Glass/`; a per-surface tuning value is a `KNOB` with one owner and a fallback at every read. Spacing stays a literal on the even grid (Settled §25); a value outside the grid is what needs justifying. *Test:* `grep -rh "^\s*--[a-z-]*:" --exclude-dir=Tokens --exclude-dir=Glass .` lists only `KNOB`-commented and component-scoped declarations.
- **R6 — The style form follows the class-name contract.** Plain `.css` is for a sheet that paints class names it does not emit — CodeMirror decorations, imperative DOM, a cross-module contract like the resize strips. Everything else is `.css.ts`. A `style` prop carries only a value computed this frame or a custom-property assignment. *Test:* `grep -rn "style={{" | grep -E "[0-9]+[,}]|'#|display:"` lists the fourteen static sites and nothing else.
- **R7 — The name says what it is.** PascalCase iff the primary export is a React component; lowerCamel otherwise, stylesheets included, beside the component they dress; folders Capitalized. A recipe family — `Glass/`, `Menus/` — names its parts `family-part` in kebab, by ruling, because the files are parts of one thing rather than components in their own right. Floating surfaces use the five words: Window, Pane, Menu, Frame, Picker. `Dnd` is the identifier spelling of `PommoraDND`; `PM` appears in two folder names, `MarkdownPM` and `SurfacePM`, both product names by ruling (Settled §29). *Test:* `find . -type d -name '[a-z]*'` returns only `testing/`. *Today:* thirteen.
- **R8 — The root holds entries and global sheets.** `main.tsx`, `App.tsx`, `styles.css`, `Carets.css`, `env.d.ts`, and nothing else; app-core modules live in `Core/`. *Test:* `ls renderer/src/*.ts*` lists two files. *Today:* twelve.

One more rule is recorded for the Cleanup lane because it changes behavior rather than location: `window.nexus` reaches the renderer through one client module. The tree assumes nothing about it and is correct without it.

#### The Target Tree

Each folder answers "what is this" in one word. A row marked NEW, MOVED, or RENAMED is a move still to make; every other row is the tree as it stands; files are shown only where they carry a finding.

```
// src/renderer/src                     | • The React renderer — it never touches Node
├── // Cards                            | • The card chassis the gallery and CardView wear
├── // Core                             | • NEW — the app-core modules the whole renderer reads
│   ├── store.ts                        | • The barrel over Store/'s seven slices
│   ├── warmCache.ts                    | • MOVED from Tabs — a cache, not a tab
│   └── …                               | • Commands, assetUrl, destinationTree, nativeCaret, nativeMenus, pageMenuActions, selection, treeIndex
├── // DesignSystem                     | • The pieces; Detail/ leaves with Tiles, Showcase/ leaves as a site
│   ├── // Components
│   │   ├── // Pickers                  | • Stays; PickerMenu is the most-composed primitive in the system
│   │   └── // SidePane                 | • The sliding side slot
│   ├── // Interactions
│   │   └── reorderModel.ts             | • MOVED from Sidebar/sidebarDndModel — a generic reorder model
│   ├── // Glass                        | • The material — glass-base, -pane, -surface, -window, -control
│   ├── // Menus                        | • The menu recipe — menu-base, -row, -surface, -shell, -disclosure, -anchor, frame-slide, frame-growth; menu-index
│   ├── // Tokens                       | • Color, type, geometry, the bridge
│   └── …                               | • Animation, Elements, Labels, Symbols, Theming, Util
├── // Embeds                           | • The embed framework's consumers — page, webpage, retention; folds into Tiles/
├── // Frames                           | • The frames a Menu or Window opens onto — filter, group, sort, hidden, layout, settings
├── // Interface                        | • The main window's chrome and its routed pane
│   ├── // Banner · // Subfield
│   ├── // InspectorPane                | • The inspector's side slot
│   ├── // Sidebar · // Toolbar         | • MOVED from the root — waits on the ruling below
│   ├── NavView.tsx                     | • The fifth routed view, beside its four siblings
│   └── …                               | • ContainerView, ContentView, InterfaceScaffold, HomepageView, PageView, SpaceView, Scope
├── // Links                            | • Everything that happens to a link — the hover pane, the link menu, resolution
├── // MarkdownPM                       | • The editor; subfolders capitalize; otherwise untouched
├── // Navigation                       | • The nav layer — absorbs Tabs; NavWindow is a Window
│   ├── TabBar.tsx · tabsModel.ts       | • MOVED from Tabs — per-tab history is navigation
│   └── …
├── // Properties                       | • The value layer — resolution at the root, Editing/ and Editors/ beneath
├── // Settings                         | • The Settings window alone
├── // Showcase                         | • MOVED out of DesignSystem — a deployed site, not a piece
├── // Store                            | • The session's seven slices
├── // SurfacePM                        | • The tile layout engine; knows nothing of content
├── // Tiles                            | • NEW — the tile world both hosts consume; the spec is the Tiles decision log
│   ├── …                               | • MOVED from Blocks and Embeds — BlockSurface, the content kinds, tileWarm, webRetention, blockZoom
│   ├── actionBand.css.ts               | • MOVED from Interface — the tiles are its only consumer
│   └── tile-chassis.css                | • MOVED from DesignSystem/Detail
├── // Tables                           | • The tabular chrome TableView and the Trash wear
├── // Utilities                        | • RENAMED from Components — app-bound helpers and wrappers
│   ├── NexusIconPicker.tsx             | • MOVED from Settings/IconPicker — binds this nexus's favorites
│   ├── AssetImage.tsx · ImagePicker.tsx · PickerControl.tsx | • NEW wrappers — the three design-system reaches, inverted
│   └── …                               | • EntityIcon, RenamableTitle, useNexusIcon, iconFavorites
├── // Views                            | • Saved-view presentation; TableView/ and CardView/ hold only the view layer
│   ├── ViewEmbedScope.tsx              | • MOVED from Embeds — view infrastructure, fourteen consumers outside Embeds
│   └── …                               | • Pipeline, GroupBand, ViewRenderer
├── // Windows                          | • The floating family — PageWindow, WebWindow, NavWindow on window-base, the tab strip, windowMorph
├── // testing                          | • The shared test harnesses
└── App.tsx · main.tsx · styles.css · Carets.css · env.d.ts
```

**What moves and what holds.** The remaining moves are `Tiles/` (its own plan), `Core/`, `Utilities/`, `Tabs/` into `Navigation/`, the Showcase out, and the casing renames — mechanical and `git mv`-able. `MarkdownPM/` moves nothing but subfolder casing. `DesignSystem/Pickers/` stays: `PickerMenu` is the rectangle ~30 menus mount, and moving it would strand them on a feature-folder import.

**What the tree does not do.** It does not unwrap IPC or touch a line of behavior — those are edits, carried below as decisions. A session can execute any move in isolation; the typecheck catches every miss. The rules, not the tree, survive growth: a tree drawn for 494 files will be wrong in detail at 1,400, but the eight rules still file every new module. Three seats are built for that growth — `Core/` for the models every future feature reads, `Windows/` for the fourth and fifth floating windows, `Properties/Editing/` for every value renderer a new view type needs — and a new feature folder appears only when a domain has three or more surfaces of its own; `Links/` was the first to pass that test.

#### Open Decisions — Structure

The forks the rules do not resolve; the recommendation is a design call, the ruling is Nathan's.

- **The design system's three upward reaches.** `AssetImage` and `ImagePicker` read the store to draw data they are given no other way; `PickerControl` reaches for a menu the app can hand it. *Recommendation:* invert all three through the wrapper pattern `Settings/IconPicker` already uses — the design-system piece takes `src`/`crop` (or one `resolveAsset`), `onPasteImage`/`onPickFile`, and `onRowMenu` as props; three thin wrappers in `Utilities/` bind them once. Then the sanctioned reaches are exactly one, `Symbols/` reading a type, written into DesignSystemPM §Tooling in the same edit.
- **Make the boundary a lint rule.** *Recommendation:* now, with an allowlist of the three files until the reaches close. Biome `noRestrictedImports` forbidding `@renderer/store`, `@renderer/nativeMenus`, `@renderer/assetUrl`, and `@renderer/<Feature>/**` from `DesignSystem/**`. Its value is refusing the *next* inversion.
- **`Interface/`'s scope.** `Detail/` is `Interface/`; the atlas extends it to `Toolbar/` and `Sidebar/`, the same window's chrome read by the same InterfacePM. *Recommendation:* take the extension — two more top-level folders disappear and `Interface/` becomes the one place the main window's shape is decided. If refused, they stay at the root under R3.
- **`block` → `tile` in identifiers.** The engine's own model file already says tile; the rename frees `block` for MarkdownPM. It follows the `Tiles/` move, which [[Tiles — Decision Log]] specifies.

---

### Naming

**One casing rule already governs the tree.** A file is PascalCase iff its primary export is a React component; everything else is lowerCamel. The exceptions: the lowercase subfolders under `MarkdownPM/` (`connections/`, `decorations/`, `detect/`, `editor/`, `input/`, `parser/`, `tokens/`), `SurfacePM/` (`core/`, `sensors/`), `Views/pipeline/`, and the Showcase's `lab/` and `leaves/`; and sixteen plain stylesheets off lowerCamel-beside-its-component — ten PascalCase (`Carets.css`, `Banner.css`, `DetailTitleHeader.css`, `Interface.css`, `Styles.css`, `Sidebar.css`, `Table.css`, `GroupBand.css`, `CardsView.css`, `TableView.css`), five kebab contract sheets (`tile-chassis.css`, `resize-strip.css`, `reveal-bar.css`, `table-tokens.css`, `window-base.css` — kebab by the R6 contract rule and R7's recipe rule, so these are filed, not defects), and `surfacepm.css`, the abbreviation destroyed. Two `Elements/` folders — `Segment/` and `DropOutline/` — contain only a stylesheet, so consumers reach past the empty shell into the file.

**`DND` has four casings:** `PommoraDND` (docs), `Dnd` (every identifier, twelve of sixteen filenames), `dnd` (43 CSS classes), `DnD` (4). `Dnd` wins by two orders of magnitude and survives PascalCase composition.

**Three names collide.** `Components/` and `DesignSystem/Components/` share a name until `Utilities/` lands; `Tables/` and `MarkdownPM/Tables/` share one — the app's tabular chrome and the editor's table widget — and stay, since the editor's is internal to a product-named folder. `Settings/IconPicker.tsx` exports an `IconPicker` that shadows the design system's, imported aliased as `Picker` — fourteen call sites import the Settings one; `NexusIconPicker` ends it. `Properties/Editing/` and `Properties/Editors/` are two folders of property editors in two vocabularies, with a `DatetimeValuePicker` / `DateTimeEditor` / `propertyFrame.datetime.test` split on the same word.

**The floating-surface vocabulary is five words** — Window, Pane, Menu, Frame, Picker — carried in [[DesignSystemPM]] and applied across the renderer. What the tree still owes it is the Menu recipe's row kinds and the main window mounting `SidePane`, both rows in [[RendererRefactor]].

#### The Concept Table

Seventeen concepts checked for two spellings. **Confirmed, worth settling:**

| Conflict                         | Count         | Winner / note                                                                                                                                                                                     |
| -------------------------------- | ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| tile vs block                    | 361 vs 459    | tile — `block` inflated by MarkdownPM's unrelated paragraph model; the rename follows `Tiles/`                                                                                                     |
| View vs Renderer                 | —             | View — `ViewRenderer` (five sites) collides with `src/renderer` and the `@renderer` alias                                                                                                          |
| icon vs glyph                    | —             | icon — `Navigation/EntityGlyph` and `Components/EntityIcon` are two wrappers over one `Icon`                                                                                                        |
| zoom vs scale                    | —             | zoom in identifiers; the var family's naming is the Geometry ruling below                                                                                                                          |
| Space vs board                   | —             | Space — `board` has two UI-string hits, zero identifiers (`noun="board"` at `Toolbar/SpaceMenu.tsx:88`, `Frames/SettingsScaffold.tsx:49`)                                                          |
| band ×3                          | —             | three unrelated concepts on one word — SurfacePM's layout run, the Views' group header, the toolbar's band form; `pipeline/group.ts` already exports `ResolvedGroup` for what `GroupBand` renders |
| `PickerChoice` vs `PickerOption` | 43 vs 47      | two spellings for one list in the same layer                                                                                                                                                      |
| warm vs cache                    | —             | warm                                                                                                                                                                                              |

**Settled since the first reading:** Pane vs Panel (the strays are renamed); `SurfacePM` keeps its suffix (Settled §29); `Materials/` is `Glass/` with its parts in kebab by the recipe rule.

**Refuted, do not re-raise:** nexus/vault (zero identifiers; three Obsidian-interop comments), chip/label (DesignSystemPM defines chip as a recipe of Label — correct), pane/dropdown (`Toolbar/` runs a real two-tier convention: a `*Menu` wraps a `*Frame` in `MenuDropdown`), select/option (`shared/properties.ts` layers them correctly), crumb/trail (split by layer, reads fine).

---

### Geometry & Variables

**631 bare pixel values across 86 files** (excluding `0px`, every `1px`, and the Showcase), on the even grid: `6px` ×102, `4px` ×92, `8px` ×68, `12px` ×50, `2px` ×43, `16px` ×33, `10px` ×27, `14px` ×25, `24px` ×17, `28px` ×14, `20px` ×12, `18px` ×12; `4`, `6`, `8` alone are 262 of the 631. The odd values — `5px` ×9, `3px` ×7 — are the ones Settled §25 reconciles per consumer. The design system's own component layer carries its share: `calendarPicker.css.ts` 37, `Tokens/size.css.ts` 29, behind `MarkdownPM/Styles.css` at 46.

**Radius restates six ways for four numbers.** `6/8/10/12` live in `size.control['button-*'].radius` (`size.css.ts:36-66`) and are restated at `group.tsx:722`, `ImagePicker.tsx:31` (`RECT_RADIUS`, a KNOB), `styles.css:4` (`--app-radius`), `pickerMenu.css.ts:64` (`PANE_RADIUS`), and `menu-shell.css.ts:6` (`BEAK_RADIUS`). `Slider.tsx:106`'s `9` is the one off the set. The standing ruling that radius literals stay literal is about *feature* sites picking from the set; it does not cover the set being declared six times.

**350 custom properties are declared, 230 outside `Tokens/`.** Four are orphans, all deliberate — `--safe-top/right/bottom/left` (`styles.css:9-12`, forward declarations for the mobile shell). The shell's dimensions are now declared once at the root — `--app-inset` 6px, `--app-radius` 12px, `--surface-inset` 10px, `--toolbar-h` 38px, `--subfield-h` 24px, `--content-edge` 12px (`styles.css:3-8`), `--content-inset` 24px (`:83`) — and the clearances compose from them (`--sidebar-clearance`, `--inspector-clearance`, `styles.css:84-93`, 26 reads across `Interface/` and `MarkdownPM/Styles.css`). `--sidebar-width` and `--inspector-width` are set by `App.tsx:225-226` through its style prop. None of these live in `Tokens/`; they are the app's shell geometry and the ledger in [[DesignSystemPM]] §Geometry carries them.

**The zoom family has no composition rule.** Seven scale vars multiply each other with nothing stating which compose and which are terminal — `--zoom`, `--block-zoom`, `--mdpm-scale`, `--editor-scale`, `--card-scale`, `--glyph-scale`, plus `--preview-zoom` — a var per surface, growing. The 08-26 naming proposal below is unexecuted.

#### Open Decisions — Geometry

- **The two tab strips.** `Tabs/tabBar.css:8` sets `--tab-min: 90px`, `Windows/windowTabStrip.css:60` sets `70px`; the other four of the window strip's values are already 5/6 of the main strip's. *Recommendation:* `--tab-min: 75px` and one comment saying the floating window wears the tab strip at 5/6.
- **The convergent value.** `--labels-gap` (4px in three homes: `table-tokens.css:16`, `pageProperties.css.ts:48`, `pageWindow.css:95`; one read, `Table.css:257`). *Recommendation:* absorb into `Tokens/`.
- **The zoom family.** Seven vars, and the evidence says they are three axes, one knob, one derivation, and one stray, not redundancies. *Axes:* `--editor-scale` (the nexus-wide Editor Scale, `personalization.ts`; `Styles.css` defaults it, scales the body font and the title by it) → `--mdpm-scale` (the editor's structural factor, `Styles.css` = editor-scale by default; `PageEmbed.tsx` and `PageWindow.tsx` set it to the embed's scale and reset `--editor-scale` to 1 because the embed already hands the editor a scaled font through its `zoom` prop — a host *replaces* rather than compounds); `--block-zoom` (a dashboard tile's Scale, `surfacepm.css:38-56`, seven discrete steps; compounds INTO the others by design — `--glyph-scale = mdpm × block` in `Styles.css`, and `zoom: --zoom × --block-zoom` in `TableView.css` / `CardsView.css`); `--zoom` (a view's own density — `table-tokens.css` at 1, the embed seam writes it in `viewEmbed.css.ts` from `--view-embed-zoom` / `--embed-zoom` and divides it back out so the heading insets hold in real px). *Knob:* `--card-scale` (`CardsView.tsx` — the grid floor and thumb height, never type, by ruling). *Derived:* `--glyph-scale` (all reads in `Styles.css`; the one `zoom:` property in the editor). *Stray:* `--preview-zoom` (`cards.css`) is a `transform: scale` crop, not a scale axis. A single compounding `--zoom` is not available to custom properties — `--zoom: calc(var(--zoom) * k)` on a descendant is a cycle and invalidates — so "one var" would mean the `zoom` *property* at every level, which the editor rejects on purpose (`surfacepm.css`: chrome, gutter, and padding stay fixed under a tile's Scale; only glyphs and text move) and the card ruling rejects. *Proposed naming (Nathan, 08-26):* `--cards-scale` (cards) · `--view-scale` (view embeds — today's `--zoom`) · `--page-scale` (the editor — today's `--editor-scale` + `--mdpm-scale`) · `--block-scale` (tiles — today's `--block-zoom`). Three are renames. The fourth merges two vars whose split is load-bearing: an embed sets structure to its own scale and the font factor to 1; under one `--page-scale` the font line in `Styles.css` would scale the already-scaled embed font a second time unless it stops reading the page factor and the main page's font takes it another way (`MarkdownPM/index.tsx`).

---

### Tokens

The consumer side is fact — every read opened at its line. The verdicts are the one set of rows that are recommendations, each with a column saying whether it follows from counts alone or involves a design call.

#### Where Reads Go Wrong

**The sweeps that came back clean, so nobody re-runs them:** zero `fill.*`/`surface.*`/`border.*` reads used as text color; zero `state.*` used as a border or text; zero hand-rolled `rgba()`; zero hand-rolled `999px` beside `--radius-full`; zero motion values off the four-rung ladder; zero hand-rolled `z-index` against `stack.top` — the bare `z-index: 0..4` literals are the in-context sibling ordering `stack.ts` licenses.

**One type read paints nothing it names.** `navView.css:28` reads `--text-headline-size` over the `text.body.standard` class `NavView.tsx:48` puts on the same element, so the class's size is dead. The pane-header step, once three siblings at three weights, is now one declaration — `menu-base.css.ts:81`'s `heading` at `footnote.emphasized`, beside the top-row and footing labels at the same rung — and `text.callout.emphasized` has zero reads because nothing needs it.

**Sibling drift — a file diverging from one it shares a chassis with.** `Settings/TrashFrame.tsx:264` (caption.semibold) against `Tables/ColumnHeader.tsx:71` (callout.semibold) while the Trash wears the class `table-head`; `Frames/groupFrame.css.ts:13`'s `subLabel` (body.emphasized) against `Menus/menu-base.css.ts:160`'s `subLabel` (caption.standard) — same export name, same color, 13px against 11px. A shared class name is not a shared type decision, and nothing in the build catches it.

**The one live bug.** `Blocks/ViewEmbedBlock.tsx:78` hand-rolls `tintAt(cellColor(key), 'primary')` where `cellRing(key)` exists at `ramp.ts:142` as `cellPaint(key).outline ?? tintAt(cellColor(key), 'primary')`. The hand-roll reproduces the fallback and drops the first branch, so a view assigned a **grey** cell gets a chroma-less tint of a grey instead of its `GREY_OUTLINES` step. Behavioral, not stylistic; the fix is one identifier, `cellRing(key)`, and it lands with `Tiles/` (Task 4 of [[Tiles]]).

#### The Hand-Rolled Sets

Literals whose value *is* a token, and values built from ingredients where a recipe exists — each a one-line fix.

| Site | Hand-roll | The token or recipe |
| --- | --- | --- |
| `ViewEmbedBlock.tsx:78` | `tintAt(cellColor(key), 'primary')` | `cellRing(key)` — the live bug |
| `ColorSwatch.tsx:48` | half of `cellPaint` inline | `cellPaint(key)` |

#### One Rule Per Family

Each is written to be lintable, with its carve-out stated.

1. **`label.*` paints ink — text and glyphs.** Never a border, rule, bar, or box fill. *Carve-out:* `background-color: var(--label-*)` is legal iff the same rule sets `mask` or `-webkit-mask`; and a deliberately bright edge over variable ground (the image crop ring, the switch track, MarkdownPM's rules) is a ruled exception, not a violation.
2. **`--border-*` paints every hairline, seam, divider, and rail.** An edge composes `var(--width-XXX) solid var(--border-YYY)`; a filled box (drawn for a radius or partial length) reads `--border-*` for color and a `--width-*` for thickness. The color ladder is `base`/`light`/`faint`; the widths `100 · 125 · 150 · 175 · 200`.
3. **`fill.*` paints an area over a surface; `state.*` an area behind content.** Neither paints an edge or ink. *Carve-out:* `outline: Npx solid var(--state-selected)` beside `background: var(--state-selected)` is a fill bleeding past its box (`GroupBand.css`).
4. **An accent tone is read by name, never mixed.** Wash → `--accent-fill`; live outline → `--accent-stroke`; being driven → `--accent-stroke-hot`; focus → `fieldRing()`.
5. **A ramp cell's paint comes from `cellPaint` / `cellRing` / `cellColor`, never `tintAt(cellColor(…))`.** The grey row's outline branch exists because the naive composition is wrong there. Two violations, one a live bug.
6. **A type decision is a `text.<style>.<variant>` class and nothing else.** No px `font-size`, no `font:` shorthand, no `--*-title-size` var holding a literal; a surface that scales reads `calc(var(--text-*-size) * var(--scale))`. *Corollary:* a file sharing a chassis with another shares its type step — the Trash takes the column header's, `groupFrame` takes the menu's.
7. **The shared type and icon steps are one ladder with two units.** A size not on it is a defect in the ladder, not a licence. The container-title family (`titleSmall`/`titleMedium`/`titleLarge`, bridged as `--text-title-*-size`) is the type ramp's alone — no glyph ladder consumes it, so it carries no icon twin.
8. **`--state-drag` / `--state-ghost` / `--state-inactive` are worn as `opacity` by the element.** Ghost is *being carried*; inactive is *here but not live*.

#### The Verdicts

The tokens carry an open verdict — the custom properties the bridge emits, every TS token export, and the app-declared vars that behave like tokens. Nearly every row is `keep`; the failures that remain cluster where the design system publishes a composed value and withholds its ingredients.

**Redefine — the readers outvoted the definition.**

| Token | Reads | New definition | Taste |
| --- | --- | --- | --- |
| `text.callout` | 1 | The table and column-header step (Semibold). The ledger's second assignment — "frame header → Callout / Emphasized" — has no referent in the product; the frame header is `footnote.emphasized` (`menu-base.css.ts:81`). | call |
| `surface.primary` · `secondary` · `tertiary` | 2 · 1 · 1 | The opaque grey ladder the ramp's grey row sits on, moved beside Ramp in the ledger. Pommora layers with frost over `--bg-window`, not flat fills; the trio stops looking abandoned. | call |

**Mint — a value the code agreed on with no token.**

| Mint | Value | What it absorbs | Taste |
| --- | --- | --- | --- |
| `Tokens/scale.ts` | a rule, not a var | The zoom family's composition — which axes multiply, which are terminal. | call |

**Merge:** `--main-bg` → `--bg-window` (pure alias, `styles.css:2`; five reads — three in `styles.css`, two in `surfacepm.css:69,113`).

**Repoint — right token, wrong consumers.** `PropertyFrame.tsx:139`'s `<Reveal duration={duration.base}>` override back to `fast`; the sibling-drift pair; `subfield.css:43-44` off control-size and bold; and `ViewEmbedBlock.tsx:78` → `cellRing(key)`, the live bug.

**Where Recipe overrules an earlier lens.** The radius scale: refused — every literal already matches `size.control['button-*'].radius`, owned but not centralized, and the writers of `12px` are `--app-radius`, not a scale. A third `stack.local` rung: declined — a private ladder inside one component is the rule working. A `--space-*` ladder: refused by Settled §25.

#### Open Decisions — Tokens

- **The checkbox glyph.** `Labels/checkboxBox` is the recipe (`labels.css.ts:22-50`, a 16px square on `boxGeometry`), and `Controls/checkbox.css` now reads it, restating only its `.pm-checkbox-small` variant on purpose. What is left to check is whether `Properties/Editing/checkboxLook.tsx` restates the geometry or reads it.
- **`--tint-solid`.** Zero reads, but the bridge emits the whole ladder by construction and `mixAt` short-circuits at 100 (`tint.ts:23`) — on a numeric amount only, so the named `'solid'` step would not short-circuit if it were ever read. *Recommendation:* keep, and add four words to DesignSystemPM's Tints table noting the short-circuit.

---

### Styling

**The form split.** Outside the Showcase, 43 plain `.css` sheets and 48 `.css.ts`. The stated rule — plain `.css` is for surfaces whose class names CodeMirror or imperative DOM emits — is true of six files (`MarkdownPM/Styles.css`, `Tables/widget.css`, `Carets.css`, `dropChrome.css`, `tile-chassis.css`, `embeds.css`). Seven more follow the contract rule R6 states — a sheet that paints class names it does not emit (`resize-strip.css`, `reveal-bar.css`, `overScroll.css`, `previewPane.css`, `Tables/table-tokens.css`, `Tables/Table.css`, `Cards/cards.css`). That leaves **thirty plain sheets for ordinary React components**, several large and knob-dense: `Sidebar.css`, `CardsView.css`, `tabBar.css`.

**Three feature sheets load globally from `main.tsx:16-18`** — `Sidebar.css`, `Interface.css`, `Banner.css` — with no global justification; the contract sheets beside them (`cards.css`, `table-tokens.css`, `Table.css`) are global on purpose, painting class names two folders wear. The design-system sheets on `main.tsx:5-13` are correctly global.

**Motion is perfect** — every transition reads `var(--duration-*)` or `duration.*`; the four raw times are a caret blink cadence (`Carets.css:9`) and three `0s` delays. **Color is near-perfect** — 21 raw values, all explicable: nine in `Tokens/color.css.ts`, the frost recipe's eight specular whites in `glass-base.tsx`, the melt gradient's two black stops in `hoverRemove.css.ts:48-50`, and one documented outlier, the beak's `stroke="#FFFFFF"` at `menu-shell.tsx:113`.

**Inline styles are 83 sites in 53 files, and most are right.** Measured geometry, custom-property injection, and genuinely dynamic values could not be a stylesheet. The static offenders are fourteen, nine inside the design system, and two byte-identical: `CardAddPicker.tsx:119` and `PropertyPicker.tsx:123` both write `{ minWidth: 96, height: 24 }`.

#### Open Decisions — Styling

- **The thirty plain sheets.** *Recommendation:* migrate to `.css.ts` when each is next opened, never as a sweep — the rule that `.css` vs `.css.ts` tracks module type holds; these thirty fail the test. The three feature sheets loading from `main.tsx:16-18` go first.
- **Inline style props.** *Recommendation:* the rule in R6, as a lint. Fourteen fixes, and the byte-identical `{ minWidth: 96, height: 24 }` pair becomes one class.
- **The cursor convention.** Roughly twenty sites each way; design-system components consistently on `default`. *Recommendation:* `default` everywhere except links — this is a macOS desktop app wearing macOS materials, and AppKit shows the arrow on buttons, menu items, and rows. Settle it in the primitives (`MenuItem`, `AccessoryButton`, the picker row).

---

### Settled — Do Not Re-Flag

Rulings a sweep would otherwise re-derive wrongly, carried as current truth. Reopen any with a reason, not a fresh reading.

1. **Radius literals stay literal** at feature sites — a fourth value outside `6/8/10/12` is the reportable defect, not the three that exist.
2. **Both ladders are settled** — `ICON_PX`/`size.icon` absorbs every icon size; `size.control`'s four bundles are the button ladder.
3. **Bridge completeness is deliberate** — unread members of a fully-bridged ramp are not orphans.
4. **The bridge is the primary token interface** — every plain stylesheet depends on it; trimming on its understated comment would break the app.
5. **Three var families look dead and are not** — bridge-completeness vars, fallback-only tuning hooks, and `Glass/`'s specular whites.
6. **`.css` vs `.css.ts` tracks module type** — no blanket migration; the thirty exceptions fail the test rather than disproving it.
7. **The option editors stay two components** — merging inverts the hook adapter; the row wrapper is closed as `OptionSlot`.
8. **`PickerMenu.closing` stays** — two live callers inside `CalendarPicker`.
9. **No middle layer** between the design system and the features — `Properties/`, `Tables/`, and `Cards/` are feature code, not a third tier.
10. **Verified healthy, do not re-litigate:** Toolbar's dropdowns compose the menu shells · `RenamableTitle → RenamableLabel → EditableInput` · `fieldRing` (8 importers) · `OverScroll` (25) · no `backdrop-filter` outside `Materials/`.
11. **`FileLabel` and `FileChip` are two recipes on purpose** — treatment over one shape.
12. **`GlassWindow` / `GlassSurface` / `GlassControls` are semantic slots**, not duplication.
13. **The 1px pane divider has one production consumer** — the other seven are the Interaction Lab.
14. **The autocomplete row does not adopt the shared menu-row primitive** — its metrics are a design decision.
15. **Production-dead is not dead** — `Tables/codec.ts`'s `parseTable` is the reference `modelFromRegion` is pinned against; the reachability razor cuts guards, never structure.
16. **No `assertNever` helper** — the house idiom is an inline `const _exhaustive: never = x`.
17. **`EmbedTitle` and `PageHeader` stay apart** — a block-level `contentEditable` with its own semantics; a floating preview draws a page that is not the active one.
18. **`SegmentRun` lives in `Fields/`** — a run of values is a field's content.
19. **`Tables/` is a feature folder, not a design-system component** — the chrome a table surface wears, with the value renderers beneath it in `Properties/`.
20. **Design decisions are not bundled as tasks** — bundling forces them by default, which is how the drift accumulated. The Cleanup checklist stays behavioral.
21. **Nothing in the design layer is an architectural error** — the instrument is `git mv` and a lint rule; net ≈ 0.
22. **The `--safe-*` vars stay** — documented forward declarations for the mobile shell. `--ppane-*` and `table-tokens.css`'s `.table`-scoped block stay — correctly scoped contracts; only the vars that leak (`--cell-padding-x`, `--labels-gap`) move.
23. **Showcase-only is a real consumer class** — it deploys from the same sources the app builds from, so it cannot drift; which is why it must not live inside the tree it demonstrates.
24. **Accepted, not defects:** dark-only theming · hidden scrollbars app-wide · Liquid Glass cannot be voided in place · no tracking scale · no inactive label tone yet.
25. **Spacing stays literal, on the even grid** — no `--space-*` ladder. An odd value (`3/5/9px`, 24 + 20 + 8 sites) reconciles per consumer to the nearer even step when that consumer is next opened; `22px` is a step. Radius follows the same rule: an even literal is owned; `Slider.tsx:106`'s `9` is the one to reconcile.
26. **The toolbar's tone is the container's, not a `button` selector's.** `.app-toolbar` and `.ppane-toolbar` declare `color: var(--label-control)` and every glyph inherits it through Button's `currentColor` ink; a dropdown surface restates its own ground (`menuSurface.css.ts`). The ten pins that existed only to outrank the old `.app-toolbar button` rule are gone; the thirteen `&&` pins left in the tree (`labels.css.ts`, `colorSwatch.css.ts`, `menu-base.css.ts`'s `rowDisabled` and `lockIcon`, `pickerControl.css.ts`, `handleMenu.css.ts`, `numberEditor.css.ts`, `groupFrame.css.ts:39`, `frames.css.ts:174`) armor against other rules and are judged on their own.
27. **`Links/` holds the link cluster** — the hover pane, its presenter and size, the link menu, `linkResolve`, `openWebLink`; named against `Embeds/`, where "Connections" also read as the pane's content kind. Executed 08-27-2026.
28. **`Detail/` is `Interface/`** — the folder and `InterfaceScaffold`; whether `Sidebar/` and `Toolbar/` fold in is the open ruling, not the rename. Executed 08-27-2026.
29. **`SurfacePM/` keeps its name**; `Blocks/` becomes root `Tiles/` shared by both hosts rather than `Surface/Blocks/` — its content has no plurality consumer, which is the atlas's own R2 test for a shared folder.

**Process notes that outlive their documents.** A survey measuring two files against each other without accounting for what was already extracted beneath them overstates the duplication — the ~470-line twin figure is honest only because `usePropertyRows`, `PropertyEditor`, and `PropertyPicker` were counted out. A ruling bounds what it decided, not everything near it. Re-derive citations against the current code before editing; the tree moves. Restate rather than amend — a fixed item is deleted, a changed fact rewritten as currently true.

**Where the surfaces live.** The property surface is `Properties/`; `EyeToggle` and `PickerControl` are `DesignSystem/Elements/`; `NavGallery` is `Navigation/`; `ImagePicker` is `DesignSystem/Components/Pickers/`; `SpaceSettings` is folded into `Toolbar/SpaceMenu`. `Detail/` is `Interface/`; the link cluster is `Links/`; the store is `Store/`; the moves the tree still marks are in [[RendererRefactor]] and [[Tiles]].
