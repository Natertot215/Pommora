## Renderer Atlas

**Date:** 08-26-2026 · **Scope:** `Pommora/src/renderer/src` — 453 non-test source files, 659 files in all · **Base:** `cd36b8e6`

The renderer as it is, the renderer as it should be, and the calls between. It is grouped by subject — **Structure**, **Naming**, **Geometry & Variables**, **Tokens**, **Styling** — so each finding sits in one place and every open conflict is a single block you delete once it is ruled. Seven read-only lenses over 453 files produced it; every claim that places a file or sets a verdict was opened at its cited line before it entered here.

### Summary

**The renderer works.** It is filed by the order things were built, and its design system is read far more correctly than it is used. The lenses found no dead code, no wrong architecture, and one behavioral bug. What they found instead is three kinds of drift, each with a mechanical fix and each already half-done by the code itself.

**Structure.** Most top-level folders say where a thing was first mounted, not what it is. Three folders are named `Detail` for three unrelated things; `Components/` is twenty-two view-settings panes and three shared files; twelve app-core modules sit at the root with no folder; thirty files have no importer in their own folder. The design system reaches upward into the app in exactly three files. The target tree (§Structure) places every file under eight testable rules, and the instrument is `git mv`. Four of its moves are executed: `Views/` sits at the root, the card chassis is `Cards/`, the tabular chrome is `Tables/`, and the property value layer is `Properties/` — the dependency order is `DesignSystem ← Properties ← Tables ← Views`, with `Cards` standing alone.

**Geometry.** Motion is perfect — 165 reads, zero off the ladder. Color is near-perfect — 20 raw values, all accounted for. Geometry is where the discipline stops: 681 bare pixel values on a `2·4·6·8·10·12·14·16·20·24·28` grid the code already agreed on and never named; 224 custom properties declared outside `Tokens/`, two of them read by the design system with no fallback.

**Tokens.** The consumer side is 96% right, and the one misuse — a surface reaching for a label tone where it needs an edge — now has a home: the `--border-*` color ladder (`base`/`light`/`faint`) and the literal `--width-*` ladder, composed at the consumer. What stays under-declared is the spacing grid and the line-height family the bridge never published.

**What this document decides.** The eight rules and the tree are the atlas's own calls, drawn from evidence and the rulings already taken (`Detail` → `Interface`, and the four executed moves above). The open decisions in each section and the taste-marked token verdicts are recommendations awaiting a stamp; the structural ones gate the tree's non-mechanical moves, everything else can start today. Nothing here changes behavior except one line in `ViewEmbedBlock.tsx`.

**The lenses.** Seven read-only passes keyed on the file path so their tables join: **Cartographer** (what each file is and who consumes it, from a resolved import graph), **Boundary** (every import crossing a domain line), **Stylist** (what each file styles with), **Semantic** (whether a token read is for what the token is for), **Recipe** (whether a token's readers say it should be something else), **Lexicographer** (names against convention), **Archivist** (what was already ruled, verified against the code).

---

### Structure

#### The Shape Now

Sixteen top-level folders hold 453 files and 64,412 lines. By kind: 160 models (pure logic, no React), 88 stylesheets, 86 pieces (render UI, read no store), 63 surfaces (render UI and read the store or IPC), 54 glue, 2 entries. The three biggest folders are `MarkdownPM/` (69 files, 14,104 lines), `Detail/` (87, 12,401), and `DesignSystem/` (139, 12,264). Three numbers frame the rest: **zero** dead files (every file but `env.d.ts`, `main.tsx`, and `testing/setup.ts` is reached); **thirty** files have no importer inside their own folder, the sharpest single wrong-folder signal; **three** files inside the design system import the app.

**The design system reaches upward in exactly three files, and two read the store.** `DesignSystem/Components/AssetImage/AssetImage.tsx:6-7` imports `@renderer/assetUrl` and `@renderer/store`; `DesignSystem/Components/Pickers/ImagePicker/ImagePicker.tsx:14-15` does the same and adds the only two `window.nexus` calls in the design system at `:137` and `:200`; `DesignSystem/Elements/PickerControl/PickerControl.tsx:7` imports `@renderer/nativeMenus`, itself store and IPC. The Showcase deploys from these same sources, so two components in the deployed library need a nexus store to render. The fix pattern already exists: `Settings/IconPicker.tsx` is a ten-line wrapper that binds this nexus's favorites and hands them to the design-system `IconPicker` as a prop. A fourth reach is a type only — `DesignSystem/Symbols/index.tsx:81` imports `EntityIconKind` from `@shared/types` — and is the one to name as deliberate rather than close.

**`Components/` is `Detail/`'s satellite, not a components folder.** Twenty-two of its twenty-five files sit under `Components/Detail/` and make twenty-six import edges into `Detail/`. `Components/Detail/settingsPane.css.ts` has 21 consumers, 10 of them the property editors under `Properties/`, which makes a stylesheet named after a pane the single largest lateral edge in the graph. The three genuinely app-shared files — `EntityIcon.tsx` (6 consumers, 4 folders), `RenamableTitle.tsx` (4, 3), `useNexusIcon.ts` — are the ones the folder's name describes.

**The renderer root is an unnamed core folder.** Twelve modules beside the two entries and two global sheets, every one consumed across folders: `store.ts` (1,906 lines, 114 consumers, all sixteen folders), `treeIndex.ts` (21, 17 cross-folder), `assetUrl.ts`, `linkResolve.ts`, `pageMenuActions.ts`, `openWebLink.ts`, `selection.ts`, `Commands.ts`, `destinationTree.ts`, `nativeMenus.ts`, `nativeCaret.ts`. The codemap documents two of them.

**The store is the composition root, not a leaf.** `store.ts:29-101` imports twelve feature modules and 114 files import it back, so every one of those folders is in a cycle with the store. This is a Cleanup-lane fact (the store split is Bundle 5), recorded because the target tree cannot make those folders independent while it holds, and the tree is honest about which edges the store keeps.

**The value layer is `Properties/`.** `Properties/Editing/` holds the shared property-value vocabulary — `formatValue`, `PropertyPicker`, `OptionChip`, `PropertyEditor`, `DatetimeValuePicker`, `Cell`, `checkboxLook`, `columnLabel`, `usePropertyRows` — and `Properties/` root the resolution modules (`value`, `contextIdentity`, `contextOptions`, `resolveContext`). `Tables/` imports it downward for the cell renderers; `Views/` imports both. One upward edge remains by ruling: `Properties/PropertiesPane.tsx` reads `useActiveView` (Views) and `useStyleFor` (Tables) for its per-column Style radios, which read and write the active view's `column_styles` — a view-settings section inside the Properties pane. `usePropertyRows.ts`'s two consumers, `Properties/PagePropertiesPane.tsx` and `PagePreview/PreviewInspector.tsx`, still share roughly 470 identical lines of row chrome.

**Thirty files have no importer inside their own folder.** The worst: `Settings/IconPicker.tsx` (14 consumers, none in `Settings/`), `Embeds/ViewEmbedScope.tsx` (15, 14 outside — view infrastructure filed as an embed detail), `Tabs/warmCache.ts` (13, 12 outside — a cache, not a tab), `Embeds/connectionMenu.ts` (10, all outside), `Sidebar/sidebarDndModel.ts` (15, 11 outside — a generic reorder model), `Navigation/navRecents.ts` (15, 10 outside), `Tabs/tabsModel.ts` (12, 10 outside).

**The lateral graph.** The feature-to-feature edges that show which folders are really one domain: `Properties → Components` 12 (entirely `settingsPane.css.ts`), `Components → Detail` 9, `Components → Embeds` 8 (entirely `ViewEmbedScope`), `Components → Properties` 7, `MarkdownPM → Embeds` 7, `Components → Sidebar` 6 (entirely `sidebarDndModel`). `MarkdownPM/` (134 files, four outbound lateral edges) and `SurfacePM/` (zero outbound) are the boundaries that hold.

**IPC is narrow at the preload and wide at the call sites.** `window.nexus` is called at 200 sites across fourteen folders against 85 channels, with no renderer-side client module, so the `Result` envelope is unwrapped by hand two hundred times. A Cleanup-lane finding, beside the `main/index.ts` split that carves the same context from the other side.

#### The Filing Rules

Eight statements that decide where anything goes. Each is testable with a grep, each is what the tree was drawn from, and each files the next module when the tree is out of date.

- **R1 — Reach decides the layer.** A module that imports `@renderer/store`, calls `window.nexus`, or imports `nativeMenus` is a *surface* or *glue* and lives in a feature folder. One that does none of those and knows no entity kind is a *piece* and may live in `DesignSystem/`. `DesignSystem/**` imports nothing from `@renderer/*` outside itself; its one sanctioned type-only reach is `Symbols/` reading `EntityIconKind` from `@shared`. *Test:* `grep -rl "@renderer/store\|window\.nexus\|@renderer/nativeMenus" DesignSystem/` returns nothing.
- **R2 — Consumers decide the folder.** A module consumed from three or more top-level folders with no plurality in any one is shared: a piece to `DesignSystem/`, a model or glue to `Core/`, an app-bound wrapper to `Components/`. A module with every consumer in one other folder belongs in that folder. *Test:* a file with zero importers in its own folder has failed this rule.
- **R3 — A folder is named for what it holds, and no name appears twice.** `Detail` may not mean the main pane, the settings panes, and the window chassis. A folder holding one file is a file. *Test:* `find . -type d | xargs -n1 basename | sort | uniq -d` returns nothing under `renderer/src`.
- **R4 — Properties is the value layer; Tables and Views import it downward.** `Properties/` holds the schema surface and the value vocabulary alike — resolution at its root, the formatters, cell, pickers, checkbox glyph, and column naming under `Editing/`, the per-type option editors under `Editors/`. `Tables/` is the tabular chrome and column mechanics; `Views/` the saved-view pipeline and renderers; `Cards/` the card chassis. *Test:* `grep -rl "@renderer/Views/\|@renderer/Tables/" Properties/` lists only `PropertiesPane.tsx` (the ruled Style-radio edge); `grep -rl "@renderer/Views/" Tables/ Cards/` returns nothing.
- **R5 — A value read from two folders is a token, declared once.** Tokens in `DesignSystem/Tokens/`; the frost specular constants in `Materials/`; a per-surface tuning value is a `KNOB` with one owner and a fallback at every read. Spacing reads a named step (`--space-*`, once minted); a literal outside the step set is what needs justifying. *Test:* after the moves, `grep -rh "^\s*--[a-z-]*:" --exclude-dir=Tokens --exclude-dir=Materials .` lists only `KNOB`-commented and component-scoped declarations.
- **R6 — The style form follows the class-name contract.** Plain `.css` is for a sheet that paints class names it does not emit — CodeMirror decorations, imperative DOM, a cross-module contract like the resize strips. Everything else is `.css.ts`. A `style` prop carries only a value computed this frame or a custom-property assignment. *Test:* `grep -rn "style={{" | grep -E "[0-9]+[,}]|'#|display:"` lists the fourteen static sites and nothing else.
- **R7 — The name says what it is.** PascalCase iff the primary export is a React component; lowerCamel otherwise, stylesheets included, beside the component they dress; folders Capitalized. Floating surfaces use the design system's six words: Surface, Pane, Window, Dropdown, Menu, Picker. `Dnd` is the identifier spelling of `PommoraDND`; `PM` appears in one folder name, `MarkdownPM`, because it is a product name. *Test:* `find . -type d -name '[a-z]*'` returns only `testing/`.
- **R8 — The root holds entries and global sheets.** `main.tsx`, `App.tsx`, `styles.css`, `Carets.css`, `env.d.ts`, and nothing else; app-core modules live in `Core/`. *Test:* `ls renderer/src/*.ts*` lists two files.

Two more rules are recorded for the Cleanup lane because they change behavior rather than location: `window.nexus` reaches the renderer through one client module, and the store does not import feature modules (Cleanup Bundles 7 and 5). The tree assumes neither and is correct without them.

#### The Target Tree

Each folder answers "what is this" in one word. New folders are marked; DONE marks a move already executed; files are shown only where they carry a finding.

```
// src/renderer/src                     | • The React renderer — it never touches Node
├── // Components                       | • App-bound wrappers over design-system pieces, and the view-settings panes
│   ├── // Detail                       | • The Settings dropdown's panes — filter, group, sort, hide, view settings; stays by ruling
│   ├── AssetImage.tsx                  | • NEW wrapper — binds the asset map and crops
│   ├── IconPicker.tsx                  | • MOVED from Settings — binds this nexus's favorites
│   ├── ImagePicker.tsx                 | • NEW wrapper — binds paste, pick, and the asset map
│   ├── PickerControl.tsx               | • NEW wrapper — binds the native row menu
│   └── …                               | • EntityIcon, RenamableTitle, useNexusIcon, iconFavorites
├── // Cards                            | • DONE — the card chassis the gallery and CardView wear
├── // Connections                      | • NEW — the hover card and the link menu, with link resolution
│   ├── linkResolve.ts · openWebLink.ts | • MOVED from the root
│   └── …                               | • ConnectionHoverCard, HoverCardPresenter, connectionMenu, hoverCardSize
├── // Core                             | • NEW — the app-core modules the whole renderer reads
│   ├── store.ts                        | • 1,906 lines; the split is Cleanup Bundle 5
│   ├── warmCache.ts                    | • MOVED from Tabs — a cache, not a tab
│   └── …                               | • Commands, assetUrl, destinationTree, nativeCaret, nativeMenus, pageMenuActions, selection, treeIndex
├── // DesignSystem                     | • The pieces; Detail/ and Showcase/ are gone
│   ├── // Components
│   │   ├── // Pickers                  | • Stays; PickerMenu is the most-composed primitive in the system
│   │   └── // WindowChassis            | • RENAMED from Detail/PreviewPane — the shell every window mounts
│   ├── // Interactions
│   │   ├── ghostAnchor.ts              | • DONE — the hover-ghost hook, from Views
│   │   └── reorderModel.ts             | • MOVED from Sidebar/sidebarDndModel — a generic reorder model
│   ├── // Materials                    | • Gains --glass-radius and the specular constants; glass-*.tsx become Glass*.tsx
│   ├── // Tokens                       | • solidColor.ts DONE; gains the spacing steps, the shell geometry, --subline-h
│   └── …                               | • Animation, Elements, Labels, Symbols, Theming, Util
├── // Embeds                           | • The embed framework's consumers — page, webpage, retention
├── // Interface                        | • RENAMED from Detail — the main window's chrome and its routed pane
│   ├── // Banner · // Subfield
│   ├── // InspectorPane                | • RENAMED from InspectorPanel
│   ├── // Sidebar · // Toolbar         | • MOVED from the root
│   ├── NavView.tsx                     | • MOVED from Tabs — the fifth routed view, beside its four siblings
│   └── …                               | • ContainerView, DetailPane, DetailScaffold, HomepageView, PageView, SpaceView, scope
├── // MarkdownPM                       | • The editor; subfolders capitalize; otherwise untouched
├── // Navigation                       | • The nav layer — absorbs Tabs; NavWindow is a Window
│   ├── TabBar.tsx · tabsModel.ts       | • MOVED from Tabs — per-tab history is navigation
│   └── …
├── // Properties                       | • DONE — the value layer: resolution at the root, Editing/ and Editors/ beneath
├── // Settings                         | • The Settings window alone
│   └── // SidePane                     | • MOVED from DesignSystem/Detail — its one consumer is here
├── // Showcase                         | • MOVED out of DesignSystem — a deployed site, not a piece
├── // Surface                          | • RENAMED from SurfacePM; absorbs Blocks — the tile world in one folder
│   ├── // Blocks                       | • Tile content; block becomes tile in identifiers
│   ├── actionBand.css.ts               | • MOVED from Detail — Blocks is its only consumer
│   └── tileChassis.css                 | • MOVED from DesignSystem/Detail
├── // Tables                           | • DONE — the tabular chrome; TableView and the Trash wear it; tableDnd, ColumnHeader, column mechanics
├── // Views                            | • DONE — saved-view presentation at the root; TableView/ and CardView/ hold only the view layer
│   ├── ViewEmbedScope.tsx              | • MOVED from Embeds — view infrastructure, fourteen consumers outside Embeds
│   └── …                               | • Pipeline, GroupBand, ViewRenderer
├── // Windows                          | • NEW — the floating family, one chassis, one morph
│   ├── // BrowserWindow                | • Split out of PagePreview
│   ├── // NavWindow · // PagePreview
│   └── windowMorph.ts                  | • The FLIP between windows
├── // testing                          | • The shared test harnesses; gains Navigation's fixture tree
└── App.tsx · main.tsx · styles.css · Carets.css · env.d.ts
```

**What moves and what holds.** The remaining moves are mostly renames (casing, the `glass-*` six, lowercase subfolders, stylesheets to lowerCamel) — mechanical and `git mv`-able in one commit — and the folders whose names do not describe them (R3) or whose consumers live elsewhere (R2). `MarkdownPM/` moves nothing but subfolder casing. `Components/Detail/` stays by ruling — its correct name is `Components/ViewSettings/`, and the rename waits for the folder to be opened for real work. `DesignSystem/Pickers/` stays: `PickerMenu` is the rectangle ~30 menus mount, and moving it would strand them on a feature-folder import.

**What the tree does not do.** It does not split the store, unwrap IPC, or touch a line of behavior — those are edits, carried below as decisions. A session can execute any move in isolation; the typecheck catches every miss. The rules, not the tree, survive growth: a tree drawn for 453 files will be wrong in detail at 1,400, but the eight rules still file every new module. Three seats are built for that growth — `Core/` for the models every future feature reads, `Windows/` for the fourth and fifth floating windows, `Properties/Editing/` for every value renderer a new view type needs — and a new feature folder appears only when a domain has three or more surfaces of its own, the test `Connections/` is the first to pass.

#### Open Decisions — Structure

The eight that gate the tree's non-mechanical moves. Each is a fork the rules do not resolve; the recommendation is a design call, the ruling is Nathan's.

- **The design system's three upward reaches.** `AssetImage` and `ImagePicker` read the store to draw data they are given no other way; `PickerControl` reaches for a menu the app can hand it. *Recommendation:* invert all three through the wrapper pattern `Settings/IconPicker` already uses — the design-system piece takes `src`/`crop` (or one `resolveAsset`), `onPasteImage`/`onPickFile`, and `onRowMenu` as props; three thin wrappers in `Components/` bind them once. Then the sanctioned reaches are exactly one, `Symbols/` reading a type, written into DesignSystemPM §Tooling in the same edit.
- **Make the boundary a lint rule.** *Recommendation:* now, with an allowlist of the three files until the reaches close. Biome `noRestrictedImports` forbidding `@renderer/store`, `@renderer/nativeMenus`, `@renderer/assetUrl`, and `@renderer/<Feature>/**` from `DesignSystem/**`. Its value is refusing the *next* inversion.
- **The floating family's name.** `NavWindow`, `PagePreview`, and the browser window share the chassis and the morph, and `BrowserWindow.tsx` is already its own file. *Recommendation:* `Windows/`, not `PreviewPanes/` — these are Windows by the design system's own vocabulary, and `NavWindow` previews nothing.
- **The chassis's name.** `PreviewPane` is mounted by four windows and the Settings window and previews nothing. *Recommendation:* `DesignSystem/Components/WindowChassis/`. It will feel wrong for a week; the week after, `previewPane.css` holding the Settings window's dimensions stops looking like an accident.
- **`Components/`'s strays and the `IconPicker` wrapper.** The 08-25 ruling keeps `Components/` for the genuinely shared strays. *Recommendation:* `Settings/IconPicker.tsx` and `iconFavorites.ts` join them — fourteen importers across eight folders with no plurality — and the file is renamed `NexusIconPicker.tsx` so it stops shadowing the design-system export it wraps.
- **`Detail` → `Interface`'s scope.** Ruled for `Detail/`; the atlas extends it to `Toolbar/` and `Sidebar/`, the same window's chrome read by the same InterfacePM. *Recommendation:* take the extension — two more top-level folders disappear and `Interface/` becomes the one place the main window's shape is decided. If refused, they stay at the root under R3.
- **`SurfacePM` → `Surface`, and `block` → `tile`.** `MarkdownPM` keeps its suffix as a product name; `SurfacePM` is a leftover that already lost its abbreviation in `surfacepm.css`. *Recommendation:* rename the folder, absorb `Blocks/` as `Surface/Blocks/`, and rename `block` → `tile` in identifiers — the engine's own model file already says tile, and it frees `block` for MarkdownPM.
- **`Connections/`.** The hover card, its presenter and sizing, and the link menu are the ConnectionsPM domain with no renderer folder; today they sit in `Embeds/` with every consumer elsewhere. *Recommendation:* mint it, and move `linkResolve.ts` and `openWebLink.ts` in from the root — the one new feature folder the atlas creates on the three-surfaces test.

---

### Naming

**One casing rule already governs 95% of the tree.** A file is PascalCase iff its primary export is a React component; everything else is lowerCamel. The exceptions are 29 files and two dialects: `DesignSystem/Materials/glass-*.tsx` (six kebab files in a folder whose seventh, `Surface.tsx`, is PascalCase); and the lowercase subfolders under `MarkdownPM/` and `SurfacePM/` (`editor/`, `parser/`, `tokens/`, `core/`, `sensors/`, …) plus `Views/pipeline/`. Stylesheets break the lowerCamel-beside-its-component rule 21 times — six PascalCase, eight kebab, one all-lowercase (`surfacepm.css`, the abbreviation destroyed), nine orphans whose named component does not exist. Two `Elements/` folders — `Segment/` and `DropOutline/` — contain only a stylesheet, so consumers reach past the empty shell into the file.

**`PM` is a documentation convention that leaked into two folder names.** All eighteen feature docs are `*PM.md`; only `MarkdownPM/` and `SurfacePM/` exist as folders, and `PommoraDND` — an engine by the same test — lives at `DesignSystem/Interactions/` without one. `MarkdownPM` is a product name; `SurfacePM` is a leftover. **`DND` has four casings:** `PommoraDND` (docs), `Dnd` (every identifier, twelve of sixteen filenames), `dnd` (43 CSS classes), `DnD` (4). `Dnd` wins by two orders of magnitude and survives PascalCase composition.

**Six folder names mislead.** Three `Detail` folders for three unrelated things. `NavWindow/` holds one component next to `Navigation/`, which holds everything it displays. `Tabs/NavView.tsx` is a routed detail view filed away from its four siblings. `Blocks/` and `SurfacePM/` name one unit `block` and `tile`. `Properties/Editing/` and `Properties/Editors/` are two folders of property editors in two vocabularies, with a `DatetimeValuePicker`/`DateTimeEditor` split on the same word. `Components/` and `DesignSystem/Components/` share a name, and `Settings/IconPicker.tsx` exports an `IconPicker` that shadows the design system's, imported aliased as `Picker` — ten call sites import the Settings one, almost certainly believing otherwise.

**The floating-surface vocabulary already exists and nobody wrote it down.** DesignSystemPM:205-206 defines Surface, Pane, Window, Dropdown, Menu, Picker. The app is 90% compliant. The four violations: `InspectorPanel` (a Pane), `AutocompletePanel` (a Menu), `Toolbar/NavPane` rendered bare at `Toolbar.tsx:114` while both siblings go through a Dropdown shell, and — the important one — the chassis every window mounts is named `PreviewPane` (four windows, one previews nothing, and its stylesheet holds the Settings window's dimensions).

#### The Concept Table

Seventeen concepts checked for two spellings. **Confirmed, worth settling:**

| Conflict | Count | Winner / note |
| --- | --- | --- |
| tile vs block | 179 vs 198 | tile — `block` inflated by MarkdownPM's unrelated paragraph model |
| Pane vs Panel | 397 vs 2 real | Pane — `InspectorPanel`, `AutocompletePanel` are the strays |
| View vs Renderer | 1,101 vs 7 | View — `ViewRenderer` collides with `src/renderer` and the `@renderer` alias |
| icon vs glyph | 877 vs 92 | icon — `EntityGlyph`/`EntityIcon` are two wrappers over one `Icon` |
| zoom vs scale | 85 vs 61 | zoom |
| Space vs board | — | Space — `board` has four UI-string hits, zero identifiers (`noun="board"` at `SpaceDropdown.tsx:89`, `SettingsScaffold.tsx:51`) |
| band ×3 | — | three unrelated concepts on one word — SurfacePM's layout run, the Views' group header, the toolbar's band form; `pipeline/group.ts` already exports `ResolvedGroup` for what `GroupBand` renders |
| `PickerChoice` vs `PickerOption` | 43 vs 42 | two spellings for one list in the same layer |
| warm vs cache | — | warm |

**Refuted, do not re-raise:** nexus/vault (zero identifiers; three Obsidian-interop comments), chip/label (DesignSystemPM defines chip as a recipe of Label — correct), pane/dropdown (`Toolbar/` runs a real two-tier convention: `ViewDropdown` wraps `ViewPane` in `MenuDropdown`), select/option (`shared/properties.ts` layers them correctly), crumb/trail (split by layer, reads fine).

---

### Geometry & Variables

**681 bare pixel values across 168 files** (excluding `0px` and every `1px`), on an unnamed scale: `6px` ×101, `8px` ×72, `4px` ×68, `12px` ×44, `2px` ×43, `16px` ×40, `10px` ×33, `14px` ×27, `3px` ×24, `5px` ×20, `28px` ×18, `24px` ×17, `20px` ×17. That is a 4px grid with a 2px foot — `2·4·6·8·10·12·14·16·20·24·28` — already agreed on by the code and never named; `4`, `6`, `8` alone are 241 of the 681. The design system's own component layer is no more disciplined: `calendarPicker.css.ts` carries 38, second only to `MarkdownPM/Styles.css` (54). DesignSystemPM's Pending section says spacing and radius stay ad-hoc pending a Figma lift; 681 is what ad-hoc costs.

**Radius restates six ways for four numbers.** `6/8/10/12` live in `size.control['button-*'].radius` (`size.css.ts:24-68`) and are hand-restated at `group.tsx:723`, `Slider.tsx:106`, `ImagePicker.tsx:31`, `styles.css:10`, `pickerMenu.css.ts:96`, `notchedPane.css.ts:4`. The standing ruling that radius literals stay literal is about *feature* sites picking from the set; it does not cover the set being declared six times.

**356 custom properties are declared, 224 outside `Tokens/`.** Four are orphans, all deliberate — `--safe-top/right/bottom/left` (`styles.css:13-16`, forward declarations for the mobile shell). Nine are declared by the app and read from inside the design system; seven carry fallbacks and are override hooks by design. **Two are hard upward dependencies with no fallback:** `--glass-inset` (`styles.css:9`, read at `previewPane.css:17`) and `--glass-radius` (`styles.css:10`, read at `previewPane.css:10` and `sidePane.css:10`) — mount either shell in the Showcase without `styles.css` and it loses its inset and corner radius, the one place the layering rule is broken in CSS. Three more families behave like tokens and are declared in app files by accident of history: the shell's three dimensions (`--toolbar-h`, `--sidebar-width`, `--inspector-width`), the layout grid (`--content-inset*`, `--surface-inset*`, 36 reads across five features), and `--subline-h` (24px in two homes, with `previewWindow.css:7` a comment explaining the duplication).

**The zoom family has no composition rule.** Seven scale vars multiply each other with nothing stating which compose and which are terminal — `--zoom`, `--block-zoom`, `--label-zoom`, `--mdpm-scale`, `--editor-scale`, `--card-scale`, `--glyph-scale`, plus `--preview-zoom` — a var per surface, growing.

#### Open Decisions — Geometry

- **The spacing scale.** 681 literals on a grid the code already agreed on. *Recommendation:* mint `size.space` and `--space-*` from the code — `2·4·6·8·10·12·14·16·20·24·28` — and reconcile with Figma after, not before. The residue of `3/5/9/22px` becomes a visible, arguable list of sixty-odd exceptions instead of an invisible 681. `18px` (13 sites) is left off deliberately.
- **The radius set.** *Recommendation:* no ladder — every radius literal already matches a value `size.control['button-*'].radius` publishes, so the literals are owned but not centralized, which is not the minting condition. Two things change: `--glass-radius` becomes a token (below), which collapses four of the six writers of `12px`; and `Slider.tsx:106`'s `borderRadius: 9` gets a reason or a repoint.
- **`--glass-inset` and `--glass-radius`.** *Recommendation:* mint both into `Tokens/` as `size.glass`. The deciding fact is not what kind of value each is but that the design system reads both with no fallback — the one place the layering law is broken in CSS — and a token the design system can read is the fix. `--glass-radius` also silently equals the large button radius and `RECT_RADIUS` at `ImagePicker.tsx:31`: three writers, one number. Give the design-system reads a fallback either way.
- **The two tab strips.** Four of the preview strip's five values are already 5/6 of the main strip's; only `--tab-min` (70 vs 90) breaks it. *Recommendation:* set `--tab-min: 75px` and add one comment saying the floating window wears the tab strip at 5/6.
- **The convergent values.** `--subline-h` (24px in two homes, one a comment explaining the duplication) and `--labels-gap` (4px in three). *Recommendation:* absorb both into `Tokens/`; `--subline-h` first, because `previewPane.css:21` already reads it with a hardcoded fallback inside the design system.
- **The zoom family.** Seven scale vars with no stated composition rule. *Recommendation:* one `Tokens/scale.ts` naming the axes — window, editor, embed, card, glyph — and how they compose, with every `--*-zoom`/`--*-scale` var reading from it. Without it there will be a var per surface at 3× the code.

---

### Tokens

The consumer side is fact — every read opened at its line. The verdicts are the one set of rows that are recommendations, each with a column saying whether it follows from counts alone or involves a design call.

#### Where Reads Go Wrong

**The sweeps that came back clean, so nobody re-runs them:** zero `fill.*`/`surface.*`/`border.*` reads used as text color; zero `state.*` used as a border or text; zero hand-rolled `rgba()`; zero hand-rolled `999px` beside `--radius-full`; zero motion values off the four-rung ladder across 165 reads; zero hand-rolled `z-index` against `stack.top` — the 38 bare `z-index: 0..4` literals are the in-context sibling ordering `stack.ts` licenses.

**Two type reads paint nothing they name.** `navView.css:28`'s 16px overrides a `text.body.standard` class `NavView.tsx:48` put on the same element, so that token read paints nothing. And `text.callout.emphasized`, the ledger's rung for pane headers, has zero reads against three sibling panes at three different weights (`menu.css.ts:160` caption.emphasized, `settingsPane.css.ts:262` footnote.semibold, `groupingPane.css.ts:54` footnote.emphasized).

**Sibling drift — a file diverging from one it shares a chassis with.** `TrashLeaf.tsx` (caption.semibold) against `Tables/ColumnHeader.tsx` (callout.semibold) while TrashLeaf wears the class `table-head`; `groupingPane.css.ts:16`'s `subLabel` (body.emphasized) against `menu.css.ts:131`'s `subLabel` (caption.standard) — same export name, same color, 13px against 11px. A shared class name is not a shared type decision, and nothing in the build catches it.

**The one live bug.** `Blocks/ViewEmbedBlock.tsx:88` hand-rolls `tintAt(cellColor(key), 'primary')` where `cellRing(key)` exists at `ramp.ts:143` as `cellPaint(key).outline ?? tintAt(cellColor(key), 'primary')`. The hand-roll reproduces the fallback and drops the first branch, so a view assigned a **grey** cell gets a chroma-less tint of a grey instead of its `GREY_OUTLINES` step. Behavioral, not stylistic; the fix is one identifier, `cellRing(key)`, and it waits for no ruling.

#### The Hand-Rolled Sets

Literals whose value *is* a token, and values built from ingredients where a recipe exists — each a one-line fix.

| Site | Hand-roll | The token or recipe |
| --- | --- | --- |
| `ViewEmbedBlock.tsx:88` | `tintAt(cellColor(key), 'primary')` | `cellRing(key)` — the live bug |
| `ColorSwatch.tsx:48` | half of `cellPaint` inline | `cellPaint(key)` |

#### One Rule Per Family

Each is written to be lintable, with its carve-out stated.

1. **`label.*` paints ink — text and glyphs.** Never a border, rule, bar, or box fill. *Carve-out:* `background-color: var(--label-*)` is legal iff the same rule sets `mask` or `-webkit-mask`; and a deliberately bright edge over variable ground (the image crop ring, the switch track, MarkdownPM's rules) is a ruled exception, not a violation.
2. **`--border-*` paints every hairline, seam, divider, and rail.** An edge composes `var(--width-XXX) solid var(--border-YYY)`; a filled box (drawn for a radius or partial length) reads `--border-*` for color and a `--width-*` for thickness. The color ladder is `base`/`light`/`faint`; the widths `100 · 125 · 150 · 175 · 200`.
3. **`fill.*` paints an area over a surface; `state.*` an area behind content.** Neither paints an edge or ink. *Carve-out:* `outline: Npx solid var(--state-selected)` beside `background: var(--state-selected)` is a fill bleeding past its box (`GroupBand.css:65-67`).
4. **An accent tone is read by name, never mixed.** Wash → `--accent-fill`; live outline → `--accent-stroke`; being driven → `--accent-stroke-hot`; focus → `fieldRing()`.
5. **A ramp cell's paint comes from `cellPaint` / `cellRing` / `cellColor`, never `tintAt(cellColor(…))`.** The grey row's outline branch exists because the naive composition is wrong there. Two violations, one a live bug.
6. **A type decision is a `text.<style>.<variant>` class and nothing else.** No px `font-size`, no `font:` shorthand, no `--*-title-size` var holding a literal; a surface that scales reads `calc(var(--text-*-size) * var(--scale))`. *Corollary:* a file sharing a chassis with another shares its type step — TrashLeaf takes the column header's, groupingPane takes menu's.
7. **The shared type and icon steps are one ladder with two units.** A size not on it is a defect in the ladder, not a licence. The container-title family (`titleSmall`/`titleMedium`/`titleLarge`, bridged as `--text-title-*-size`) is the type ramp's alone — no glyph ladder consumes it, so it carries no icon twin.
8. **`--state-drag` / `--state-ghost` / `--state-inactive` are worn as `opacity` by the element.** Ghost is *being carried*; inactive is *here but not live*. One violation, a copy of a correct file with one token swapped.

#### The Verdicts

185 tokens carry an open verdict — the custom properties the bridge emits, every TS token export, and the app-declared vars that behave like tokens. **166 keep · 4 repoint · 9 mint · 5 redefine · 1 merge.** Four in five rows are `keep`; the failures that remain cluster where the design system publishes a composed value and withholds its ingredients. Several of the mints are an ingredient that already exists and is not published.

**Redefine — the readers outvoted the definition (5).**

| Token | Reads | New definition | Taste |
| --- | --- | --- | --- |
| `text.callout` | 1 | The table and column-header step (Semibold). The ledger's second assignment — "pane header → Callout / Emphasized" — has no referent in the product and is struck. | call |
| `text.footnote` | 12 | Small detail *and* the in-pane section heading (Emphasized). `settingsPane.css.ts:262` repoints from semibold to emphasized so the siblings match. | call |
| `surface.primary` · `secondary` · `tertiary` | 2 · 1 · 1 | The opaque grey ladder the ramp's grey row sits on, moved beside Ramp in the ledger. Pommora layers with frost over `--bg-window`, not flat fills; the trio stops looking abandoned. | call |

**Mint — a value the code agreed on with no token (9).**

| Mint | Value | What it absorbs | Taste |
| --- | --- | --- | --- |
| `size.space.*` · `--space-*` | the `2…28` grid | ~480 of the 681 literals; the residue (3, 5, 9, 18, 22) becomes a visible list of ~60. | call |
| `--glass-inset` · `--glass-radius` | 5px · 12px | 37 reads, two inside the design system with no fallback — the one real layering violation. | evidence |
| `--subline-h` · `--toolbar-h` | 24px · 38px | The shell's bands, beside the `--button-*-height` trio the bridge already publishes. | call |
| `--sidebar-width` · `--inspector-width` | seeded defaults | Read by `styles.css:108`/`:124` in a `calc` with no declared default. | call |
| `Tokens/scale.ts` | a rule, not a var | The zoom family's composition — which axes multiply, which are terminal. | call |

**Merge (1):** `--main-bg` → `--bg-window` (pure alias, all reads in `styles.css`).

**Repoint — right token, wrong consumers (4).** `PropertiesPane.tsx:143`'s `<Reveal>` override back to `fast`; the sibling-drift pair; `subfield.css:43-44` off control-size and bold; and `ViewEmbedBlock.tsx:88` → `cellRing(key)`, the live bug.

**Where Recipe overrules an earlier lens.** The pane-header finding: `menu.css.ts:160`'s own comment says it is a nav row, not a header, so the vote on in-pane section headings is 3–0 *for* footnote. The radius scale: refused — every literal already matches `size.control['button-*'].radius`, owned but not centralized, and the four writers of `12px` are a `--glass-radius` mint, not a scale. A third `stack.local` rung: declined — a private ladder inside one component is the rule working.

**What to take first, by consumers fixed per edit.**

| # | Edit | Lines | Fixes |
| --- | --- | --- | --- |
| 1 | `ViewEmbedBlock.tsx:88` → `cellRing(key)` | 1 | The only behavioral defect |
| 2 | Mint the spacing scale | ~11 | ~480 literals; needs the sign-off above |
| 3 | Mint `--glass-inset` / `--glass-radius` | 2 | 37 reads; closes the layering violation |

#### Open Decisions — Tokens

- **Three checkboxes.** `Labels/checkboxBox` (the 17px task square, in place), `Controls/checkbox.css` (the control's chrome), `Properties/Editing/checkboxLook.tsx` (the cell glyph). *Recommendation:* `checkboxBox` is the recipe; the other two read its geometry rather than restating it.
- **`--tint-solid`.** Zero reads, but the bridge emits the whole ladder by construction and `mixAt` short-circuits at 100 (`tint.ts:23`). *Recommendation:* keep, and add four words to DesignSystemPM's Tints table noting the short-circuit.

---

### Styling

**The form split.** 185 files carry styling: 41 plain `.css`, 47 vanilla-extract `.css.ts`, 37 with both a stylesheet and `style={{}}`, 60 authoring CSS values in TS. The stated rule — plain `.css` is for surfaces whose class names CodeMirror or imperative DOM emits — is true of six files (`MarkdownPM/Styles.css`, `Tables/widget.css`, `Carets.css`, `dropChrome.css`, `tile-chassis.css`, `embeds.css`). Six more follow a better rule nobody stated — **a class-name contract crossing module boundaries**, where the sheet paints names it does not emit (`resize-strip.css`, `reveal-bar.css`, `overScroll.css`, `previewPane.css`, `Tables/table-tokens.css`, `Tables/Table.css`, `Cards/cards.css`). That leaves **28 plain sheets for ordinary React components**, several large and knob-dense: `Sidebar.css` (24 px literals, 6 vars), `CardsView.css`, `tabBar.css` (14 vars).

**Three feature sheets load globally from `main.tsx`** — `Sidebar.css`, `Detail.css`, `Banner.css` — with no global justification; the contract sheets beside them (`cards.css`, `table-tokens.css`, `Table.css`) are global on purpose, painting class names two folders wear. The design-system sheets on `main.tsx:6-13` are correctly global.

**Motion is perfect** — every transition reads `var(--duration-*)` or `duration.*`; the four raw times are a caret blink cadence and three `0s` delays. **Color is near-perfect** — 20 raw values, all explicable (the token sources, the frost recipe's four specular whites, the melt gradient's black stops, and one documented outlier at `NotchedPane.tsx:112`).

**Inline styles are 83 sites in 50 files, and most are right.** Measured geometry, custom-property injection, and genuinely dynamic values could not be a stylesheet. The static offenders are fourteen, nine inside the design system, and two byte-identical: `CardAddPicker.tsx:130` and `PropertyPicker.tsx:123` both write `{ minWidth: 96, height: 24 }`.

**One toolbar selector has recruited seventeen doubled selectors** at `toolbar.css:98` and is still recruiting.

#### Open Decisions — Styling

- **The toolbar selector, in order.** *Recommendation:* delete the colliding `color` declaration at `toolbar.css:98` first — the buttons inside the toolbar are Buttons and Button owns `--button-ink` — then walk the seventeen doubles down one at a time with the app open. Do not unwind the armor before removing what it armors against; eleven of the doubles say so in their own comments.
- **The 28 plain sheets.** *Recommendation:* migrate to `.css.ts` when each is next opened, never as a sweep — the rule that `.css` vs `.css.ts` tracks module type holds; these 28 fail the test. The five feature sheets loading from `main.tsx:16-20` go first.
- **Inline style props.** *Recommendation:* the rule in R6, as a lint. Fourteen fixes, and the byte-identical `{ minWidth: 96, height: 24 }` pair becomes one class.
- **The cursor convention.** Roughly twenty sites each way; design-system components consistently on `default`. *Recommendation:* `default` everywhere except links — this is a macOS desktop app wearing macOS materials, and AppKit shows the arrow on buttons, menu items, and rows. Settle it in the primitives (`MenuItem`, `AccessoryButton`, the picker row).

---

### Settled — Do Not Re-Flag

Rulings a sweep would otherwise re-derive wrongly, carried as current truth. Reopen any with a reason, not a fresh reading.

1. **Radius literals stay literal** at feature sites — a fourth value outside `6/8/10/12` is the reportable defect, not the three that exist.
2. **Both ladders are settled** — `ICON_PX`/`size.icon` absorbs every icon size; `size.control`'s four bundles are the button ladder.
3. **Bridge completeness is deliberate** — unread members of a fully-bridged ramp are not orphans.
4. **The bridge is the primary token interface** — all 44 plain stylesheets depend on it; trimming on its understated comment would break the app.
5. **Three var families look dead and are not** — bridge-completeness vars, fallback-only tuning hooks, and `Materials/`'s specular whites.
6. **`.css` vs `.css.ts` tracks module type** — no blanket migration; the 28 exceptions fail the test rather than disproving it.
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

**Process notes that outlive their documents.** A survey measuring two files against each other without accounting for what was already extracted beneath them overstates the duplication — the ~470-line twin figure is honest only because `usePropertyRows`, `PropertyEditor`, and `PropertyPicker` were counted out. A ruling bounds what it decided, not everything near it. Re-derive citations against the current code before editing; the tree moves. Restate rather than amend — a fixed item is deleted, a changed fact rewritten as currently true.

**Where the surfaces live.** The property surface is `Properties/`; `EyeToggle` and `PickerControl` are `DesignSystem/Elements/`; `NavGallery` is `Navigation/`; `ImagePicker` is `DesignSystem/Components/Pickers/`; `SpaceSettings` is folded into `Toolbar/SpaceDropdown`. `Components/Detail` stays by ruling. `Views` → root, `Cards/`, `Tables/`, and the `Properties/` value layer are executed; `Detail` → `Interface` is ruled and awaits execution; the rest of the tree is unexecuted.
