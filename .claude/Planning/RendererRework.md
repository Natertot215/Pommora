## The Renderer Rework

> **Status:** shaped 08-28-2026 — the exploration is dispatched; nothing executes from this document until it has reported and the framework is ratified · **Scope:** `Pommora/src/renderer` whole — folders, names, tokens, stylesheets, recipes, boundaries, component APIs, and behavior where a perspective justifies it; the design system's pending items (an inactive label tone, the type gaps) ride it · **Replaces:** the Renderer Atlas, the Renderer Refactor ledger, and the abandoned Tiles plan, whose standing content is folded in below · **Beside it:** [[Codebase-Cleanup-Checklist]] (the process-side half — `persist()`, the view host, the `main/index.ts` split, the drag adapters).

The renderer works. It is filed by the order things were built, styled in two forms with a rule that thirty sheets fail, and tokenized unevenly — motion and color are on their ladders, geometry is hundreds of bare pixel values with a handful of named insets. Two organizational passes (08-25 to 08-28) moved `Links/`, `Interface/`, the store, and landed the Menu recipe. What remains was carried in two documents as a ledger of moves and an atlas of evidence; this document is the one list of what is still proposed, why, and what each waits on — and the method for exploring the system whole — as consultants, not inspectors — before any of it is scheduled.

### What This Document Holds

1. **The rules that survive** — the eight filing rules, the target tree, and the rulings a sweep must not re-derive.
2. **The checklist** — every proposed move, grouped by kind, each with its why and what it waits on.
3. **The open rulings** — the calls only Nathan can make.
4. **The exploration** — the perspectives, their briefs, and how findings and recommendations return.
5. **Pointers** — what lives elsewhere and where.

A row that lands leaves this document; History carries what happened. A ruling taken moves from §Open Rulings into §Settled and deletes the row it answered.

---

### 1. The Rules That Survive

#### The Filing Rules

Eight statements that decide where anything goes. Each is testable with a grep; each files the next module when the tree is out of date.

- **R1 — Reach decides the layer.** A module that imports `@renderer/store`, calls `window.nexus`, or imports `nativeMenus` is a *surface* or *glue* and lives in a feature folder. One that does none of those and knows no entity kind is a *piece* and may live in `DesignSystem/`. `DesignSystem/**` imports nothing from `@renderer/*` outside itself; its one sanctioned type-only reach is `Symbols/` reading `EntityIconKind` from `@shared`. *Test:* `grep -rl "@renderer/store\|window\.nexus\|@renderer/nativeMenus" DesignSystem/` returns nothing. *Today:* two files (`ImagePicker`, `PickerControl`).
- **R2 — Consumers decide the folder.** A module consumed from three or more top-level folders with no plurality in any one is shared: a piece to `DesignSystem/`, a model or glue to `Core/`, an app-bound wrapper to `Utilities/`. A module with every consumer in one other folder belongs in that folder. *Test:* a file with zero importers in its own folder has failed this rule. *Today:* `Settings/IconPicker`, `Embeds/ViewEmbedScope`, `Links/connectionMenu`.
- **R3 — A folder is named for what it holds, and no name appears twice.** A folder holding one file is a file, and a folder earns itself only when a domain has enough files to need one — flat until then, never a subfolder built ahead of the need. *Test:* `find . -type d | xargs -n1 basename | sort | uniq -d` returns nothing under `renderer/`. *Today:* `Tables` (root vs `MarkdownPM/`).
- **R4 — Properties is the value layer; Tables and Views import it downward.** `Properties/` holds the schema surface and the value vocabulary alike — resolution at its root, the formatters, cell, pickers, checkbox glyph, and column naming under `Editing/`, the per-type option editors under `Editors/`. `Tables/` is the tabular chrome and column mechanics; `Views/` the saved-view pipeline and renderers; `Cards/` the card chassis. *Test:* `grep -rl "@renderer/Views/\|@renderer/Tables/" Properties/` lists only `PropertyFrame.tsx` (the ruled Style-radio edge); `grep -rl "@renderer/Views/" Tables/ Cards/` returns nothing.
- **R5 — A value read from two folders is a token, declared once.** Tokens in `DesignSystem/Tokens/`; the frost specular constants in `Glass/`; a per-surface tuning value is a `KNOB` with one owner. Spacing stays a literal on the even grid; a value outside the grid is what needs justifying. A var, export, class, or prop with one writer and one reader is indirection — a value set once and read once is a literal with a `KNOB`; a new `--var` needs two surfaces overriding it. *Test:* `grep -rh "^\s*--[a-z-]*:" --exclude-dir=Tokens --exclude-dir=Glass .` lists only `KNOB`-commented and component-scoped declarations.
- **R6 — The style form follows the class-name contract.** Plain `.css` is for a sheet that paints class names it does not emit — CodeMirror decorations, imperative DOM, a cross-module contract like the resize strips. Everything else is `.css.ts`. A `style` prop carries only a value computed this frame or a custom-property assignment. *Test:* `grep -rn "style={{" | grep -E "[0-9]+[,}]|'#|display:"` lists the six static sites and nothing else.
- **R7 — The name says what it is.** PascalCase iff the primary export is a React component; lowerCamel otherwise, stylesheets included, beside the component they dress; folders Capitalized. A recipe family — `Glass/`, `Menus/` — names its parts `family-part` in kebab, because the files are parts of one thing. Floating surfaces use the five words: Window, Pane, Menu, Frame, Picker. `Dnd` is the identifier spelling of `PommoraDND`; `PM` appears in `MarkdownPM` and `SurfacePM`, both product names. *Test:* `find . -type d -name '[a-z]*'` returns only `testing/`. *Today:* thirteen.
- **R8 — The root holds entries and global sheets.** `index.html`, `main.tsx`, `App.tsx`, `styles.css`, `Carets.css`, `env.d.ts`, and nothing else; app-core modules live in `Core/`. *Test:* `ls renderer/*.ts*` lists two files. *Today:* twelve.

#### The Target Tree

Each folder answers "what is this" in one word. A row marked NEW, MOVED, or RENAMED is a move still to make; every other row is the tree as it stands.

```
// src/renderer                         | • The React renderer — it never touches Node
├── // Assets                           | • NEW — assetUrl + the crop-aware AssetImage, out of the design system
├── // Cards                            | • The card chassis the gallery and CardView wear
├── // Core                             | • NEW — the app-core modules the whole renderer reads
│   ├── store.ts                        | • The barrel over Store/'s seven slices
│   └── …                               | • Commands, destinationTree, nativeCaret, nativeMenus, pageMenuActions, selection, treeIndex
├── // DesignSystem                     | • The pieces; Showcase/ leaves as a site
│   ├── // Pickers                      | • The picker family — PickerMenu is the most-composed primitive in the system
│   ├── // Controls · // Fields · // SidePane
│   ├── // Interactions
│   │   └── reorderModel.ts             | • MOVED from Sidebar/sidebarDndModel — a generic reorder model
│   ├── // Glass                        | • The material — glass-base, -pane, -surface, -window, -control
│   ├── // Menus                        | • The menu recipe — menu-base, -row, -surface, -shell, -disclosure, -anchor, frame-slide, frame-growth; menu-index
│   ├── // Tokens                       | • Color, type, geometry, the bridge
│   └── …                               | • Animation, Elements, Labels, Symbols, Theming, Util
├── // Frames                           | • The frames a Menu or Window opens onto — filter, group, sort, hidden, layout, settings
├── // Interface                        | • The main window's chrome and its routed pane
│   ├── // Subfield                     | • The subfield; Banner and the title sheets sit flat in Interface/
│   ├── // InspectorPane                | • The inspector's side slot
│   ├── // Sidebar · // Toolbar         | • MOVED from the root — waits on the ruling
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
│   └── TabState.ts                     | • Per-tab warm state and the page-detail cache
├── // SurfacePM                        | • The tile layout engine; knows nothing of content
├── // Tiles                            | • NEW — the tile world both hosts consume; the shape is the exploration's to propose
│   ├── …                               | • MOVED from Blocks and Embeds — BlockSurface, the content kinds, tileWarm, webRetention, blockZoom
│   ├── actionBand.css.ts               | • MOVED from Interface — the tiles are its only consumer
│   └── tile-chassis.css                | • MOVED from Blocks — the shared tile frame
├── // Tables                           | • The tabular chrome TableView and the Trash wear
├── // Utilities                        | • RENAMED from Components — app-bound helpers and wrappers
│   ├── NexusIconPicker.tsx             | • MOVED from Settings/IconPicker — binds this nexus's favorites
│   ├── ImagePicker.tsx · PickerControl.tsx | • NEW wrappers — the two design-system reaches, inverted
│   └── …                               | • EntityIcon, RenamableTitle, useNexusIcon, iconFavorites
├── // Views                            | • Saved-view presentation; TableView/ and CardView/ hold only the view layer
│   ├── ViewEmbedScope.tsx              | • MOVED from Embeds — view infrastructure, fourteen consumers outside Embeds
│   └── …                               | • Pipeline, GroupBand, ViewRenderer
├── // Windows                          | • The floating family — PageWindow, WebWindow, NavWindow on window-base, the tab strip, windowMorph
├── // testing                          | • The shared test harnesses
└── index.html · App.tsx · main.tsx · styles.css · Carets.css · env.d.ts
```

The tree is drawn for today's ~500 files and will be wrong in detail at 1,400; the rules survive growth. `DesignSystem/Pickers/` stays because `PickerMenu` is the rectangle ~30 menus mount. `MarkdownPM/` moves nothing but subfolder casing.

#### Settled — Do Not Re-Flag

Rulings a sweep would otherwise re-derive. An audit agent may contradict one, but must say so by number and give the new reason; it is reported to Nathan, never folded and never dropped.

1. **Radius literals stay literal** at feature sites — a fourth value outside `6/8/10/12` is the reportable defect.
2. **Both ladders are settled** — `ICON_PX`/`size.icon` absorbs every icon size; `size.control`'s four bundles are the button ladder; 13px is a real step.
3. **Bridge completeness is deliberate** — unread members of a fully-bridged ramp are not orphans; the bridge is the primary token interface for every plain stylesheet.
4. **Three var families look dead and are not** — bridge-completeness vars, fallback-only tuning hooks, `Glass/`'s specular whites; `--safe-*` are forward declarations for the mobile shell.
5. **`.css` vs `.css.ts` tracks module type** — no blanket migration; the thirty exceptions fail the test rather than disproving it.
6. **The option editors stay two components** — merging inverts the hook adapter; the row wrapper is `OptionSlot`.
7. **`PickerMenu.closing` stays** — two live callers inside `CalendarPicker`.
8. **No middle layer** between the design system and the features — `Properties/`, `Tables/`, `Cards/` are feature code, not a third tier.
9. **Verified healthy:** Toolbar's dropdowns compose the menu shells · `RenamableTitle → RenamableLabel → EditableInput` · `fieldRing` (8 importers) · `OverScroll` (25) · no `backdrop-filter` outside `Glass/`.
10. **`FileLabel` and `FileChip` are two recipes on purpose** — treatment over one shape.
11. **`GlassWindow` / `GlassSurface` / `GlassControls` are semantic slots**, not duplication.
12. **Production-dead is not dead** — `Tables/codec.ts`'s `parseTable` is the reference `modelFromRegion` is pinned against.
13. **No `assertNever` helper** — the house idiom is an inline `const _exhaustive: never = x`.
14. **`EmbedTitle` and `PageHeader` stay apart.**
15. **`SegmentRun` lives in `Fields/`** — a run of values is a field's content.
16. **`Tables/` is a feature folder, not a design-system component.**
17. **Design decisions are not bundled as tasks** — bundling forces them by default, which is how the drift accumulated.
18. **`--ppane-*` and `table-tokens.css`'s `.table`-scoped block stay** — correctly scoped contracts; the one var that leaked (`--cell-padding-x`) moves.
19. **Showcase-only is a real consumer class** — it deploys from the same sources, so it cannot drift; which is why it must not live inside the tree it demonstrates.
20. **Accepted, not defects:** dark-only theming · hidden scrollbars app-wide · Liquid Glass cannot be voided in place · no tracking scale
21. **Spacing stays literal, on the even grid** — no `--space-*` ladder. An odd value (`3/5/9px`) reconciles per consumer to the nearer even step when that consumer is next opened; `22px` is a step. Radius follows the same rule.
22. **The toolbar's tone is the container's, not a `button` selector's** — `.app-toolbar` and `.ppane-toolbar` declare `color: var(--label-control)` and every glyph inherits it; the `&&` pins left in the tree armor against other rules and are judged on their own.
23. **`Links/` holds the link cluster; `Detail/` is `Interface/`; `SurfacePM/` keeps its name; `Blocks/` becomes root `Tiles/`** — executed or ruled 08-27/08-28.
24. **The menu row's box is declared once** (`rowBox`, first in `menu-base.css.ts`); a surface picks Standard or Compact on its pane, never per row.
25. **The renderer is `src/renderer`, flat** — `index.html` beside the entries; the Showcase keeps its stage photos under `Showcase/surfaces/`.

**Refuted, do not re-raise:** nexus/vault (zero identifiers), chip/label (chip is a recipe of Label — correct), pane/dropdown (`Toolbar/` runs a two-tier convention: a `*Menu` wraps a `*Frame`), select/option (layered correctly in `shared/properties.ts`), crumb/trail (split by layer). A `--space-*` ladder and a centralized radius scale were both refused with reasons.

---

### 2. The Checklist

Every proposed move, grouped by kind. **Status** is one of: **ruled** (Nathan said yes; it waits only on sequencing), **awaiting ruling** (the fork is in §3), or **audit decides** (the audit's evidence sizes or settles it). Rows that touch behavior say so.

#### Filing

- [ ] **`Core/` for the root modules** — `store`, `treeIndex`, `pageMenuActions`, `selection`, `Commands`, `destinationTree`, `nativeMenus`, `nativeCaret`. *Why:* R8 — the root holds only entries and global sheets. *Status:* ruled.
- [ ] **`Navigation/` absorbs `Tabs/`** (`TabBar`, `tabsModel`). *Why:* per-tab history is navigation; `Tabs/` sits beside the folder that owns its concept. *Status:* ruled.
- [ ] **`Embeds/ViewEmbedScope` → `Views/`; `Sidebar/sidebarDndModel` → `DesignSystem/Interactions/reorderModel`; `Settings/IconPicker` + `iconFavorites` → `Utilities/NexusIconPicker`.** *Why:* R2 — each has zero importers in its own folder. *Status:* ruled.
- [ ] **`Showcase/` out of `DesignSystem/`.** *Why:* Settled 21 — a deployed site, not a piece. *Status:* ruled.
- [ ] **The tile world** — `Blocks/` (SurfacePM's tile contents), the tile half of `Embeds/` (PageEmbed, WebpageEmbed, tileWarm, webRetention, `embeds.css`), `Blocks/tile-chassis.css`, and root `Components/` (three store-reading helpers under a name the design system also uses). *Why:* one folder should answer "where does a tile live?" and `Components/` fails R3. A plan (Tiles, 08-27) proposed root `Tiles/` + `Utilities/`, one `TileWriter` shell over one `TileSave`, and one `tile-base.css`; it was abandoned 08-28 for fresh perspectives. What it found and still stands: `PageEmbedBlock.tsx` is a 29-line pass-through; `MarkdownBlock` and `PageEmbed` are one click-to-edit shell over two data seams; `blocks.css` and `embeds.css` already share `:is(.blk-md, .pgembed)` selectors; `embedWidget` imports `blockZoom` statically, so a `Tiles/` barrel would close the `PageEmbed → MarkdownPM → embedWidget` cycle the lazy imports keep open. *Status:* audit decides — Architect and Reducer propose the shape.
- [ ] **`Interface/` absorbing `Sidebar/` and `Toolbar/`.** *Why:* the same window's chrome, read by the same InterfacePM; two top-level folders disappear. *Status:* awaiting ruling (§3.3).
- [ ] **The casing renames** — the lowercase subfolders under `MarkdownPM/` (`connections`, `decorations`, `detect`, `editor`, `input`, `parser`, `tokens`), `SurfacePM/` (`core`, `sensors`), `Views/pipeline/`, the Showcase's `lab/` and `leaves/`; stylesheets to lowerCamel beside their component (`Carets.css`, `Interface.css`, `Styles.css`, `Sidebar.css`, `Table.css`, `GroupBand.css`, `CardsView.css`, `TableView.css`, `surfacepm.css`); `Elements/Segment/` and `Elements/DropOutline/` folded into their one file. *Why:* R7. *Status:* ruled; mechanical.
- [ ] **`Windows/` keeps `NavWindow`, or `Navigation/` takes it ungrouped.** *Status:* awaiting ruling (§3.4).

#### Boundaries

- [ ] **The design system's two upward reaches** — `ImagePicker` reads the store; `PickerControl` imports `nativeMenus`. Invert through wrappers in `Utilities/` (the pattern `Settings/IconPicker` already uses). *Why:* R1 — a deployed-library component needing a nexus store to render. *Status:* awaiting ruling (§3.2).
- [ ] **The boundary as a lint** — Biome `noRestrictedImports` forbidding `@renderer/store`, `@renderer/nativeMenus`, `@renderer/assetUrl`, and `@renderer/<Feature>/**` from `DesignSystem/**`, with an allowlist of the two until they close. *Why:* its value is refusing the *next* inversion. *Status:* awaiting ruling (§3.2).
- [ ] **`PropertyFrame`'s per-column Style radios** — `Properties/PropertyFrame.tsx` reads `useActiveView` (Views) and `useStyleFor` (Tables): a view-settings section inside the Properties frame. Keep the ruled edge and name it, or lift the section beside the other panes. *Status:* awaiting ruling (§3.5).
- [ ] **The side slot** — `SidePane` is the sliding slot every Window mounts; the main window's sidebar and inspector do not, driving `--io` / `--io-l` from `styles.css` on their own rules, which is why PaneSlide has three homes (`styles.css`, `window-base.css`, `Sidebar.css`). The main window mounts `SidePane` for both slots; PaneSlide becomes one motion in one file; `InspectorPane` and `WindowInspector` (same frontmatter surface, different chrome) reconcile — one component or one name over two, measured by shared chrome; the store's `closePreview` / `settingsOpen` names follow the windows they open. *Why:* one motion, one owner. *Status:* ruled; **the one behavior change in the vocabulary.**

#### Tokens & Geometry

- [ ] **The zoom family** — seven scale vars with no composition rule. Three renames (`--card-scale` → `--cards-scale`, `--zoom` and its embed feeders → `--view-scale`, `--block-zoom` → `--block-scale`), `--preview-zoom` renamed out as a crop, and one merge (`--editor-scale` + `--mdpm-scale` → `--page-scale`) that rewires the font path so an embed's font is not scaled twice (`Styles.css` stops reading the page factor; the main page's font takes it through `MarkdownPM/index.tsx`). A `Tokens/scale.ts` stating which axes multiply and which are terminal. *Why:* a var per surface, growing; a single compounding `--zoom` is impossible (a custom property can't reference itself). *Status:* renames ruled; the merge awaiting ruling (§3.1).
- [ ] **`--tab-min: 75px`** so the floating tab strip is 5/6 of the main one (today 90 vs 70; the strip's other four values are already 5/6). *Status:* ruled.
- [ ] **Two clearance pairings that repeat** — `calc(clearance + --content-inset)` (`Interface.css` ×3, `MarkdownPM/Styles.css` ×5) and `calc(clearance + --surface-lane)` (`Interface.css` ×2, `navView.css`) — each could be a token the way `--content-start` is; different distances, so a decision each. *Status:* audit decides (count the readers).
- [ ] **`--main-bg` → `--bg-window`** — a pure alias with five reads. *Status:* ruled; one edit.
- [ ] **Odd spacing values** (`3/5/9px`) reconciled to the nearer even step per consumer as each is opened; `Slider.tsx:107`'s radius `9` with them. *Status:* ruled by Settled 23; never a sweep.
- [ ] **Sibling drift** — `Frames/groupFrame.css.ts:12`'s `subLabel` (`body.emphasized`) against `Menus/menu-base.css.ts:164`'s `subLabel` (`caption.standard`) — same export name, 13px against 11px. A shared class name is not a shared type decision. *Status:* audit decides which wins.
- [ ] **`subfield.css:36-37`** off `control` size and bold. *Status:* audit decides.
- [ ] **Two token verdicts** — `text.callout` redefined as the table/column-header step (one read; its ledger assignment "frame header" has no referent); `surface.primary/secondary/tertiary` moved beside Ramp as the opaque grey ladder (2·1·1 reads). *Status:* awaiting ruling (§3.6).
- [ ] **`ColorSwatch.tsx:48`** hand-rolls half of `cellPaint` inline. *Status:* ruled; one line.

#### Recipes

- [ ] **The Menu recipe, Part 2** — a leading glyph size per row variant (today every leading glyph is what its caller passes — `headline` 15 in the sidebar and Trash, `body` elsewhere; Compact wants `control`); `--list-inset` for nested lists, starting by unwinding `menu-row.tsx`'s inline `paddingLeft: 8 + indent * DISCLOSURE_INDENT` (it beats every class and var) and `sidebarDnd.tsx`'s mirror of the `8`; a footing row kind in the index (GroupFrame, LayoutFrame, PropertyFrame, FilterFrame still hand-build `footingSymbol` + `footingLabel` rows inside `MenuFooting`); the `action` kind's first production consumer (PropertyFrame's All Properties row with its disclosure beat). *Status:* ruled as the recipe's Sequenced After.
- [ ] **The recipe's five Open Calls** — rows carrying a switch or eye measure 31–32 (the control is taller than the 16px line): a 16px control, or rows sized by their tallest child · locked cards clip their trail (the cover's 65% share vs the text band): the cover yields, or the band takes a floor · a Trash row with `onClick` is a `role=button` tab stop beside its checkbox's: a `MenuItem` opt-out, or drop the pointer convenience · Settings' section titles render as the index's `div`, leaving the window's heading outline: a `level` on the heading kind, or accept · the footing row kind (above). *Status:* awaiting ruling (§3.7).
- [ ] **One checkbox recipe** — `Labels/checkboxBox` is the source and both `Controls/checkbox.css` and `Properties/Editing/checkboxLook` read it; what remains is naming where a checkbox's styling is defined so nobody asks again. *Status:* audit confirms; documentation.
- [ ] **The floating identity label** — embed tiles reveal crumbs or a webpage title on hover, the Web Window shows domain › title always, the Page Window a trail in its tab strip; one design-system element, or NavTrail absorbing the webpage case. *Status:* audit decides whether the three share enough chrome.
- [ ] **Menu rows with horizontal property values** — multi-value rows land their values tight against the label; a pane-width-relative max-width for the value side has been tried and reverted several times. *Status:* audit decides (a known issue carried from ContextPM).
- [ ] **`{ minWidth: 96, height: 24 }`** written byte-identically in `PropertyPicker.tsx:123` and `CardAddPicker.tsx:118` — one class. *Status:* ruled.

#### Styling

- [ ] **The thirty plain `.css` sheets for ordinary React components** migrate to `.css.ts` as each is next opened, never as a sweep; the three feature sheets loading globally from `main.tsx` (`Sidebar.css`, `Interface.css`, `content-banner.css`) go first. *Why:* R6; Settled 5. *Status:* ruled.
- [ ] **The inline-style rule as a lint** — a `style` prop carries only a per-frame value or a custom-property assignment; the six static sites fixed (`SurfaceLab.tsx` ×2, `PickerMenu.tsx`, `PropertyPicker.tsx`, `MarkdownPM/Tables/TableView.tsx`, `CardAddPicker.tsx`). *Status:* ruled.
- [ ] **The cursor convention** — `default` everywhere except links, settled in the primitives (`MenuItem`, `AccessoryButton`, the picker row); roughly twenty sites each way today. *Why:* a macOS desktop app wearing macOS materials; AppKit shows the arrow on buttons, rows, and menu items. *Status:* awaiting ruling (§3.8).

#### Naming

- [ ] **Three "preview" strings** — the setting label "Open Connections In Preview", its hint ("…opens the preview window…"), and one test title ("Open Preview floats it instead"). *Status:* awaiting wording (§3.9).
- [ ] **`PickerChoice` vs `PickerOption`** — 42 vs 46, two spellings for one list in the same layer. *Status:* audit decides the winner; mechanical after.
- [ ] **`band` ×3** — SurfacePM's layout run, the Views' group header, the toolbar's band form: three unrelated concepts on one word; `pipeline/group.ts` already exports `ResolvedGroup` for what `GroupBand` renders. *Status:* audit proposes.
- [ ] **`Properties/Editing/` vs `Properties/Editors/`** — two folders of property editors in two vocabularies, with `DatetimeValuePicker` / `DateTimeEditor` / `propertyFrame.datetime.test` split on the same word. *Status:* audit proposes.
- [ ] **`Navigation/EntityGlyph` and `Utilities/EntityIcon`** — two wrappers over one `Icon`; icon wins. *Status:* audit confirms the fold.
- [ ] **`ViewRenderer`** collides with `src/renderer` and the `@renderer` alias; View wins. *Status:* ruled; rename when `Views/` is next opened.
- [ ] **`block` → `tile`** in identifiers (361 vs 459, `block` inflated by MarkdownPM's paragraph model). *Status:* follows `Tiles/`.

#### Behavior

- [ ] **`Blocks/ViewEmbedBlock.tsx:78`** hand-rolls `tintAt(cellColor(key), 'primary')` where `cellRing(key)` exists — a view assigned a grey cell gets a chroma-less tint instead of its `GREY_OUTLINES` step. *Why:* a live behavioral bug; one identifier. *Status:* ruled; lands with whatever touches the file first.
- [ ] **Prose tiles and the layout document lose edits** — `MarkdownBlock`'s private 400ms debounce and `useBlockDoc`'s 300ms layout writer flush on unmount only, with none of the nexus-adopt or `beforeunload` flush pages get through `Interface/pageFlush.ts`; a prose-tile edit or a drag inside the window is lost on window close, and at nexus switch `BlockSurface` unmounts after the root flips, so the flush lands in the new nexus. The abandoned Tiles plan proposed generalizing `pageFlush` from path-keyed to any key (`scheduleWrite(key, body, write)`, a drop marker at tile removal, one 400ms debounce app-wide — Nathan's ruling 08-28). *Why:* a data-loss hole, whatever shape the tile folder takes. *Status:* ruled as a defect; the shape is the exploration's.
- [ ] **The pending DesignSystemPM items** — an inactive label tone (empty-state text between secondary and tertiary; interim consumers read tertiary); type gaps (no tracking scale, no Markdown element mapping, no multi-line clamp). *Status:* in scope (Nathan, 08-28); the exploration proposes each.

---

### 3. Open Rulings

The calls only Nathan can make; each deletes a row above when taken. **All ten are deferred (Nathan, 08-28) until the exploration reports** — the perspectives see every one as open and may argue any side; the consulting session takes them with the findings in hand. The orchestrator's own leans are recorded so the perspectives can argue against something: 1 defer to the Token Designer · 2 invert all three · 3 yes · 4 stays in `Windows/` · 5 lift the section · 6 take both · 7 a 16px control, the band takes a floor, the Trash row drops the pointer convenience, a heading `level`, the footing kind · 8 `default` except links · 9 "Window" · 10 everything in scope.

1. **The zoom merge** — does `--page-scale` absorb `--mdpm-scale`, given the font-path rewiring it costs?
2. **The design system's two reaches** — invert now through `Utilities/` wrappers, or leave under the lint's allowlist?
3. **`Interface/`'s scope** — does it absorb `Sidebar/` and `Toolbar/`?
4. **`NavWindow`** — stays in `Windows/`, or `Navigation/` takes it ungrouped?
5. **The `PropertyFrame` Style-radio edge** — name and keep, or lift the section?
6. **The two token verdicts** — `text.callout` as the table-header step; the `surface.*` trio beside Ramp?
7. **The Menu recipe's five Open Calls.**
8. **The cursor convention** — `default` except links?
9. **The three "preview" strings** — what word replaces it?
10. **Scope of the rework itself** — taken: everything is in scope, behavior included, the DesignSystemPM pending items with it.

---

### 4. The Exploration

The two documents this one replaces were produced by seven read-only lenses over one weekend, asking "is the tree filed correctly." They found "no dead code, no wrong architecture, one behavioral bug." This exploration asks a wider question of every layer — *is this the system we want, and what would it be instead* — and its agents are consultants, not inspectors: each one explores a perspective, forms an opinion, and returns findings **with** a recommendation, the alternatives it weighed, and what each costs. Nothing is filtered for politeness or for agreement with a standing ruling; a consultant who thinks a Settled row is wrong says so by number, with the new reason.

#### The Questions

What Nathan asked, and which perspectives answer them:

1. **Unused and under-used exports** — what nothing imports; what one file imports and could own. → Cartographer, Exports.
2. **Unneeded abstraction** — vars, classes, props, hooks, components with one writer and one reader; wrappers that only forward; layers that exist to be layers. → Exports, Architect.
3. **Tokens where a raw value would be better**, and raw values where a token exists — both directions, per family. → Token Designer.
4. **Shared-recipe opportunities** — surfaces built alike by hand that could wear one recipe. → Recipe.
5. **Split, merge, delete** — files or folders holding two things, two holding one, anything holding nothing. → Cartographer, Architect.
6. **Conflicting naming** — two spellings for one concept, one word for two, names that say what a thing was. → Lexicographer, Newcomer.
7. **Confusing relations** — boundary crossings, cycles the lazy imports paper over, folders consumed from everywhere but their own. → Boundary, Newcomer.
8. **What the CSS strategy should be** — two forms today with a rule thirty sheets fail; vanilla-extract's cost and reach; where plain CSS is honestly right; whether the bridge is the right token interface. → Stylist.
9. **What the component API shape should be** — how a piece takes its data, how a recipe is worn, how a surface names itself. → Architect, Recipe.
10. **What isn't needed at all** — the priority question, asked of everything the other nine touch. → Reducer, with every perspective feeding it.

#### The Perspectives

Each perspective is one agent with one question, a method, a guard list, and a return format. The Reducer runs as the priority lens — every other perspective is asked to hand it what it noticed could go. Agents read only. Every finding cites a file and line and is verified by the orchestrator at that line before it reaches Nathan; every recommendation carries its alternatives and their costs so the decision arrives shaped.

| Perspective | Question | Method | Returns |
| --- | --- | --- | --- |
| **Reducer** *(priority)* | What isn't needed? What could be reduced, removed, or eliminated outright — files, folders, layers, tokens, recipes, props, options, whole mechanisms? | Read every folder asking "what would be lost if this were gone" before asking what it does; for each mechanism, find the simpler thing it is standing in for; count what each abstraction buys against what it costs; treat a feature nobody has used as a candidate, not a fixture. | A ranked deletion list with the blast radius of each; the mechanisms that could collapse into a simpler one; the options and props that could go; a plain-prose estimate of how much smaller the renderer could be and where the bulk sits. |
| **Cartographer** | What is each file, who consumes it, and does its folder agree? | Build the import graph over `src/renderer`; per file: importers, importing folders, own-folder importers; R2/R3; every folder-crossing edge by direction; cycles. | The graph as JSON; R2/R3 failures; lateral edges; cycles; split/merge candidates with the shape each would take. |
| **Exports** | What does nothing read, and what does one thing read that could own it? | A `ts-prune`-class pass plus greps for what the typecheck can't see (CSS classes, vars, string keys, test-only exports); Settled 3, 4, 13 as guards. | Dead exports/classes/vars; test-only exports; one-reader exports ranked by how much indirection each buys. |
| **Architect** | What should the layering be, and what would a clean-slate renderer of this app look like? | Read the tree against R1–R8 and against the app's real seams (main-owned data, per-window store, the five surface words); name the layers the code implies versus the ones the rules state; test each folder's one-word answer. | A proposed layer model with the folders under each; where today's tree disagrees and what the move costs; the abstractions that exist to be layers; two alternatives to the proposal, with why they lose. |
| **Stylist** | What should the CSS strategy be? | Inventory every stylesheet by form, size, class-name contract, global vs scoped load, and who emits its class names; measure what vanilla-extract buys and costs here (typing, HMR, the bridge, the `&&` pins, the `globalStyle` escapes); find where plain CSS is honestly correct. | A recommended form rule with its exceptions named; the migration order and cost; whether the bridge stays the token interface; the specificity armor roster and what would let each pin go. |
| **Token Designer** | Is every value read for what its token is for, and is every token worth its name? | Per family (color, type, geometry, motion, stack, tint): every read classified correct / wrong token / literal-where-token / token-where-literal; per token: reader count and whether readers agree with the definition; the `KNOB` roster; the vars declared outside `Tokens/`. | Both-direction misreads with counts; tokens to retire, rename, mint, or demote to a `KNOB`; the zoom family's composition rule as a proposal; the geometry ladder question answered with evidence rather than the standing ruling. |
| **Recipe** | What is built alike by hand more than once, and what recipe would it wear? | Fingerprint every `.css.ts`/`.css` declaration block and every component's JSX shape; cluster near-identical members across files; for each cluster, diff the members. | Clusters with member sites and diffs; a named recipe each would wear, with the API it would need; the ones not worth a recipe and why. |
| **Lexicographer** | Do names say what things are? | The concept table (tile/block, View/Renderer, icon/glyph, zoom/scale, band ×3, Choice/Option, Editing/Editors, crumb/trail, warm/cache) with counts; PascalCase-iff-component; stylesheet-beside-component; folder casing; names that describe a former state. | Conflicts with counts and a winner each; R7 failures; the rename sweeps as ordered batches with their blast radius. |
| **Boundary** | What crosses a line the rules forbid, and what would a lint refuse? | R1 and R4 greps with control tokens; `DesignSystem/**` outbound edges; `Properties → Views/Tables`; `window.nexus` sites per folder; the store's readers per folder. | Every crossing with its reason (sanctioned / unsanctioned / unknown); the lint as a Biome config block; the inversions ranked by cost. |
| **Newcomer** | Where would an engineer new to this codebase get lost, and what would they misfile? | Read the tree cold — folder names, file names, the barrels, the docs' map — before reading any ruling; write down every "why is this here" and every wrong guess; then read the rulings and record which ones a newcomer couldn't have derived. | The confusion list with the rule or rename that would have prevented each; the rulings that need to be structural (a folder, a lint) rather than documentary. |
| **Archivist** | What was already ruled, and does the code still match? | Every Settled row against today's code; every Features doc claim about the renderer against the file it names. | Rulings the code has drifted from; rulings the code has outgrown; false doc claims. |
| **Skeptic** | What in the above is wrong, and what did nobody ask? | Runs last over every report: contradictions between perspectives; findings that re-derive a Settled row without a new reason; the questions no perspective asked; the recommendations whose cost was understated. | A contradictions list; a "what nobody asked" list; a severity re-ranking of the whole with the reasons. |

**Guards every perspective carries:** §Settled and §Refuted by number (contradict by citation, never silently); no edits, no comments, no "fixes" — findings and recommendations only; a count is not debt (find what chooses between the options before calling a spread a problem); a survey measuring two files against each other must count out what was already extracted beneath them; every grep names its control token; a recommendation without its alternatives and their cost is unfinished.

**Return format (all perspectives):** a numbered catalog, each entry `severity · surface · file:line · mechanism · verification · the rule or ruling it bears on · recommendation · alternatives and cost`; then "what held" (negative results, so nobody re-runs them); then "killed candidates" (what looked like a finding and wasn't, with why); then a closing opinion in plain prose — what this perspective would do if it owned the renderer for a week.

#### Sequencing

1. **Nathan shapes the exploration** — taken 08-28: all twelve perspectives run, the Reducer as the priority, everything in scope, the ten rulings deferred, the Tiles plan abandoned so the tile world is seen fresh.
2. **Dispatch** — the perspectives run read-only in parallel on one pinned commit; the Skeptic runs after them over their reports.
3. **Verification** — the orchestrator opens every cited line; an unverified finding is dropped with a note, never passed through; recommendations are checked for the alternatives they owe.
4. **The consulting session** — Nathan reads the verified catalog perspective by perspective; each recommendation becomes a checklist row (with its status), a Settled entry (with its reason), or a killed candidate — decided with him, in the order the Skeptic ranked them.
5. **The framework** — this document's §2 rewritten from the decisions into phases with gates, in the plan form the Menu recipe used; ratified; executed one phase per session with `/closeout`. The framework is the document Nathan reads, the orchestrator edits, and a session follows.

---

### 5. Pointers

- **[[Codebase-Cleanup-Checklist]]** — the process-side half: `persist()`, the view host, the `main/index.ts` split, the drag adapters' frame. Bundle 6 (the view host) waits until the value layer's folder stops moving.
- **[[MenuRecipe]]** — landed 08-28; its Open Calls and Sequenced After are rows above; the plan is history.
- **[[DesignSystemPM]]** — the vocabulary and the token ledger; every token this document proposes to add, rename, or retire lands there in the same commit.
- **[[ContextPM]]** — Current Focus names which row is active; Immediate Work holds the rows in flight; nothing about the arc's scope lives outside these two.

---

### 6. Working Rules

How this document is kept honest while it is executed. These bind every session touching the renderer, and they are not optional.

- **Delete on landing — no tombstones.** The moment a checklist row is done it is deleted here, and the target tree in §1 is rewritten to the tree on disk. Never leave a "landed" note, a "moved from" trail, or a struck line — a done thing simply reads as the current state, as if it were always so. The tree on disk and the tree on the page never disagree across a commit.
- **Report the line count.** Every change reports its code-only LOC delta in chat (comments, blanks, and tests excluded), the way `/closeout` does.
- **No ambiguity about state.** Nothing here may leave a reader unsure what is done versus pending, or what is a critique versus a proposal. An open thing reads as open; an orchestrator's opinion is marked as an opinion, never as a decision taken; a finished thing is gone, not annotated.
