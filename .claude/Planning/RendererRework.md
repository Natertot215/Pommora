## The Renderer Rework

> **Status:** in directed cleanup, 08-30-2026 — the exploration reported; its verified findings are the §2 checklist, and cleanup rows land directly as they're taken. The value editing and visual tuning are mostly done; what's left is the remaining folder moves and the collapse/split rows, then the framework (§4) rewriting §2 into ratified phases. · **Scope:** `Pommora/src/renderer` whole — folders, names, tokens, stylesheets, recipes, boundaries, component APIs, and behavior where a finding justifies it; the design system's pending items (an inactive label tone, the type gaps) ride it. **Beside it:** [[Codebase-Cleanup-Checklist]] (the process-side half — `persist()`, the view host, the `main/index.ts` split, the drag adapters).

The renderer works. It is filed by the order things were built, styled in two forms with a rule that thirty sheets fail, and tokenized unevenly — motion and color are on their ladders, geometry is hundreds of bare pixel values with a handful of named insets. Two organizational passes (08-25 to 08-28) moved `Links/`, `Interface/`, the store, and landed the Menu recipe. What remains was carried in two documents as a ledger of moves and an atlas of evidence; this document is the one list of what is still proposed, why, and what each waits on — and the method for exploring the system whole — as consultants, not inspectors — before any of it is scheduled.

### What This Document Holds

1. **The rules that survive** — the eight filing rules, the target tree, and the rulings a sweep must not re-derive.
2. **The checklist** — every proposed move, grouped by kind, each with its why and what it waits on.
3. **The open rulings** — the calls only Nathan can make.
4. **The framework** — the exploration in one line, and the phased plan its findings become next.
5. **Pointers** — what lives elsewhere and where.

A row that lands leaves this document; History carries what happened. A ruling taken moves from §Open Rulings into §Settled and deletes the row it answered.

---

### 1. The Rules That Survive

#### The Filing Rules

Eight statements that decide where anything goes. Each is testable with a grep; each files the next module when the tree is out of date.

- **R1 — DesignSystem holds reusable pieces; feature folders hold surfaces.** A *piece* is a reusable primitive — a control, field, material, menu, or selector — and lives in `DesignSystem/`, **even when it reads app state to do its job**: `ImagePicker` reads the session's asset map and `PickerControl` reaches `nativeMenus`, and neither is evicted for it — a selector that can't see what it selects isn't a selector. A *surface* is feature-specific — it renders a particular view, entity, or route — and lives in a feature folder. The former "`DesignSystem/**` imports nothing from `@renderer/*`" mandate is dropped (Nathan, 08-28): it flagged violations that break nothing. The real constraint is that the Showcase still builds from these sources, which it does. `Symbols/` reads `EntityIconKind` from `@shared`. *Test:* `npm run build:showcase` passes.
- **R2 — Consumers decide the folder.** A module consumed from three or more top-level folders with no plurality in any one is shared: a piece to `DesignSystem/`, a model or glue to `Core/`, an app-bound wrapper to `Utilities/`. A module with every consumer in one other folder belongs in that folder. *Test:* a file with zero importers in its own folder has failed this rule. *Today:* `Settings/IconPicker`, `Links/connectionMenu`.
- **R3 — A folder is named for what it holds, and no name appears twice.** A folder holding one file is a file, and a folder earns itself only when a domain has enough files to need one — flat until then, never a subfolder built ahead of the need. *Test:* `find . -type d | xargs -n1 basename | sort | uniq -d` returns nothing under `renderer/`. *Today:* `Tables` (root vs `MarkdownPM/`).
- **R4 — Properties is the value layer; Tables and Views import it downward.** `Properties/` holds the schema surface and the value vocabulary alike — resolution at its root, the formatters, cell, pickers, checkbox glyph, and column naming under `Assignment/`, the per-type option editors under `Editors/`. `Tables/` is the tabular chrome and column mechanics; `Views/` the saved-view pipeline and renderers; `Cards/` the card chassis. *Test:* `grep -rl "@renderer/Views/\|@renderer/Tables/" Properties/` returns nothing; `grep -rl "@renderer/Views/" Tables/ Cards/` returns nothing.
- **R5 — The style form follows the class-name contract.** Plain `.css` is for a sheet that paints class names it does not emit — CodeMirror decorations, imperative DOM, a cross-module contract like the resize strips. Everything else is `.css.ts`. A `style` prop carries only a value computed this frame or a custom-property assignment. *Test:* `grep -rn "style={{" | grep -E "[0-9]+[,}]|'#|display:"` lists the six static sites and nothing else.
- **R6 — The name says what it is.** PascalCase iff the primary export is a React component; kebab-case otherwise — stylesheets and operation files alike, beside the component they dress; folders PascalCase or Train-Case. A recipe family — `Glass/`, `Menus/` — names its parts `family-part` in kebab, because the files are parts of one thing. Floating surfaces use the five words: Window, Pane, Menu, Frame, Picker. `Dnd` is the identifier spelling of `PommoraDND`; `PM` appears in `MarkdownPM` and `SurfacePM`, both product names. *Test:* `find . -type d -name '[a-z]*'` returns nothing under `renderer/`. The stylesheets and lowerCamel operation files still awaiting kebab-case are §2's casing row.
- **R7 — The root holds entries and global sheets.** `index.html`, `main.tsx`, `App.tsx`, `styles.css`, `Carets.css`, `env.d.ts`, and nothing else; app-core modules live in `Core/`. *Test:* `ls renderer/*.ts*` lists two files. *Today:* twelve.

#### The Target Tree

Each folder answers "what is this" in one word. A row marked NEW, MOVED, or RENAMED is a move still to make; every other row is the tree as it stands.

```
// src/renderer                         | • The React renderer — it never touches Node
├── // Assets                           | • NEW — assetUrl + the crop-aware AssetImage, out of the design system
├── // Cards                            | • The card chassis the gallery and CardView wear
├── // Actions                          | • The verbs — selection, pageMenuActions, nativeMenus, Commands, RenamableTitle, destinationTree
├── // DesignSystem                     | • The pieces of the design system
│   ├── // Pickers                      | • The picker family — picker-base is the most-composed primitive in the system
│   ├── // Buttons · // Controls · // Fields · // SidePane
│   ├── // Interactions
│   │   └── reorderModel.ts             | • MOVED from Sidebar/sidebarDndModel — a generic reorder model
│   ├── // Glass                        | • The material — glass-base, -pane, -surface, -window, -control
│   ├── // Menus                        | • The menu recipe — menu-base, -row, -surface, -disclosure, -anchor, frame-slide, frame-growth; menu-index
│   ├── // Tokens                       | • Color, type, geometry, the bridge; accent + personalization
│   └── …                               | • Animation, Elements, Labels, Symbols, Util
├── // Frames                           | • The frames a Menu or Window opens onto — filter, group, sort, hidden, layout, property, settings
├── // Interface                        | • The main window's chrome and its routed pane
│   ├── // Subfield                     | • The subfield; Banner and the title sheets sit flat in Interface/
│   ├── // InspectorPane                | • The inspector's side slot
│   ├── // Sidebar                      | • MOVED from the root — waits on the ruling
│   ├── NavView.tsx                     | • The fifth routed view, beside its four siblings
│   └── …                               | • ContainerView, ContentView, InterfaceScaffold, HomepageView, PageView, SpaceView, Scope
├── // Links                            | • Everything that happens to a link — the hover pane, the link menu, resolution
├── // MarkdownPM                       | • The editor; subfolders capitalize; otherwise untouched
├── // Navigation                       | • The nav layer — NavWindow is a Window
│   └── …
├── // Properties                       | • The value layer — resolution at the root, Assignment/ and Editors/ beneath
├── // Settings                         | • The Settings window alone
├── // Showcase                         | • A deployed site, not a piece
├── // Store                            | • The session's seven slices
│   └── TabState.ts                     | • Per-tab warm state and the page-detail cache
├── // SurfacePM                        | • The tile engine and every tile it renders — TileSurface, the content kinds, TileCache, WebRetention, TileZoom; block-tile-base.css is the chassis
├── // Tables                           | • The tabular chrome TableView and the Trash wear
├── // Tabs                             | • The tab strip and per-tab history — stays root
├── // Toolbar                          | • The main window's toolbar — stays root
├── // Utilities                        | • App-bound components — EntityIcon (folds the old EntityGlyph), useNexusIcon
├── // Views                            | • Saved-view presentation; TableView/ and CardView/ hold only the view layer
│   └── …                               | • Pipeline, GroupBand, ViewHost + useViewHost
├── // Windows                          | • The floating family — PageWindow, WebWindow, NavWindow on window-base, the tab strip, windowMorph
├── // testing                          | • The shared test harnesses
└── index.html · App.tsx · main.tsx · styles.css · Carets.css · env.d.ts
```

The tree is drawn for today's ~500 files and will be wrong in detail at 1,400; the rules survive growth. `DesignSystem/Pickers/` stays because `picker-base` is the rectangle ~30 menus mount. `MarkdownPM/` moves nothing but subfolder casing.

#### Settled — Do Not Re-Flag

Rulings a sweep would otherwise re-derive. An audit agent may contradict one, but must say so by number and give the new reason; it is reported to Nathan, never folded and never dropped.

1. **Radius literals stay literal** at feature sites — a fourth value outside `6/8/10/12` is the reportable defect.
2. **Both ladders are settled** — `ICON_PX`/`size.icon` absorbs every icon size; the four button bundles are the button ladder (Settled 26); 13px is a real step.
3. **Bridge completeness is deliberate** — unread members of a fully-bridged ramp are not orphans; the bridge is the primary token interface for every plain stylesheet.
4. **Vanilla-extract stays; `.css` vs `.css.ts` tracks module type** — the form question is closed, no reversal to plain CSS; no blanket migration either, and the thirty plain-CSS exceptions fail the test rather than disproving it.
5. **`PickerMenu.closing` stays** — two live callers inside `CalendarPicker`.
6. **No middle layer** between the design system and the features — `Properties/`, `Tables/`, `Cards/` are feature code, not a third tier.
7. **Verified healthy:** Toolbar's dropdowns compose the menu shells · `RenamableTitle → RenamableLabel → EditableInput` · `fieldRing` (8 importers) · `OverScroll` (25) · no `backdrop-filter` outside `Glass/`.
8. **`FileLabel` and `FileChip` are two recipes on purpose** — treatment over one shape.
9. **Production-dead is not dead** — `Tables/codec.ts`'s `parseTable` is the reference `modelFromRegion` is pinned against.
10. **No `assertNever` helper** — the house idiom is an inline `const _exhaustive: never = x`.
11. **`EmbedTitle` and `PageHeader` stay apart.**
12. **`SegmentRun` lives in `Fields/`** — a run of values is a field's content.
13. **Accepted, not defects:** dark-only theming · hidden scrollbars app-wide · Liquid Glass cannot be voided in place · no tracking scale
14. **The toolbar's tone is the container's, not a `button` selector's** — `.app-toolbar` and `.ppane-toolbar` declare `color: var(--label-control)` and every glyph inherits it; the `&&` pins left in the tree armor against other rules and are judged on their own.
15. **The menu row's box is declared once** (`rowBox`, first in `menu-base.css.ts`); a surface picks Standard or Compact on its pane, never per row.
16. **The UI layer is "tile"; the block-doc data model stays "block."** Components, hooks, and CSS classes carry tile vocabulary (`PageTile`, `MarkdownTile`, `.page-tile`); the persisted model keeps block names (`@shared/blocks`, `MarkdownBlockEntry`, `BlockHostRef`, `loneWebpageEmbed`). A sweep proposing to rename the data model to "tile" is re-deriving a settled boundary.

**Refuted, do not re-raise:** nexus/vault (zero identifiers), chip/label (chip is a recipe of Label — correct), pane/dropdown (`Toolbar/` runs a two-tier convention: a `*Menu` wraps a `*Frame`), select/option (layered correctly in `shared/properties.ts`), crumb/trail (split by layer). A `--space-*` ladder and a centralized radius scale were both refused with reasons.

---

### 2. The Checklist

Every proposed move, grouped by kind. **Status** is one of: **ruled** (Nathan said yes; it waits only on sequencing), **awaiting ruling** (the fork is in §3), or **audit decides** (the audit's evidence sizes or settles it). Rows that touch behavior say so.

#### Filing

- [ ] **`Sidebar/sidebarDndModel` → `DesignSystem/Interactions/reorderModel`; `Settings/IconPicker` + `iconFavorites` → `Utilities/NexusIconPicker`.** *Why:* R2 — each has zero importers in its own folder. *Status:* ruled.
- [ ] **`Interface/` absorbing `Sidebar/`.** *Why:* the same window's chrome, read by the same InterfacePM; one top-level folder disappears. *Status:* awaiting ruling (§3.2).
- [ ] **The file-kebab renames** — stylesheets and lowerCamel operation files to kebab-case beside their component (`Carets.css`, `Interface.css`, `Styles.css`, `Sidebar.css`, `Table.css`, `GroupBand.css`, `CardsView.css`, `TableView.css`; `tabsModel`, `treeIndex`, `reorderModel`, and their siblings); `Elements/Segment/` folded into its one file. *Why:* R6/R7. *Status:* ruled; mechanical.

#### Boundaries

- [ ] **The side slot** — `SidePane` is the sliding slot every Window mounts; the main window's sidebar and inspector do not. The overlay park and the in-flow reflow are one motion, `Animation/PaneSlide.css.ts`, consumed by the inspector and the windows; the `--io` / `--io-l` driver stays a home per host (`styles.css`, `window-base.css`) so the toolbar swallow and the content gutter read the same interpolation, and the `Sidebar` keeps its own static slide. What's left: the main window mounts `SidePane` for both slots; `InspectorPane` and `WindowInspector` (same frontmatter surface, different chrome) reconcile — one component or one name over two, measured by shared chrome; the `Sidebar`'s slide folds onto `PaneSlide`; the store's `closePreview` / `settingsOpen` names follow the windows they open. *Why:* one motion, one owner. *Status:* ruled; the motion unified, the SidePane-mount and reconcile parked; **the one behavior change in the vocabulary.**

#### Tokens & Geometry

- [ ] **Two clearance pairings that repeat** — `calc(clearance + --content-inset)` (`Interface.css` ×3, `MarkdownPM/Styles.css` ×5) and `calc(clearance + --surface-lane)` (`Interface.css` ×2, `navView.css`) — each could be a token the way `--content-start` is; different distances, so a decision each. *Status:* audit decides (count the readers).
- [ ] **Sibling drift** — `Frames/groupFrame.css.ts:12`'s `subLabel` (`body.emphasized`) against `Menus/menu-base.css.ts:164`'s `subLabel` (`caption.standard`) — same export name, 13px against 11px. A shared class name is not a shared type decision. *Status:* audit decides which wins.

#### Recipes

- [ ] **The Menu recipe, Part 2** — a leading glyph size per row variant (today every leading glyph is what its caller passes — `headline` 15 in the sidebar and Trash, `body` elsewhere; Compact wants `control`); `--list-inset` for nested lists, starting by unwinding `menu-row.tsx`'s inline `paddingLeft: 8 + indent * DISCLOSURE_INDENT` (it beats every class and var) and `sidebarDnd.tsx`'s mirror of the `8`; a footing row kind in the index (GroupFrame, LayoutFrame, PropertyFrame, FilterFrame still hand-build `footingSymbol` + `footingLabel` rows inside `MenuFooting`); the `action` kind's first production consumer (PropertyFrame's All Properties row with its disclosure beat). *Status:* ruled as the recipe's Sequenced After.
- [ ] **The recipe's five Open Calls** — rows carrying a switch or eye measure 31–32 (the control is taller than the 16px line): a 16px control, or rows sized by their tallest child · locked cards clip their trail (the cover's 65% share vs the text band): the cover yields, or the band takes a floor · a Trash row with `onClick` is a `role=button` tab stop beside its checkbox's: a `MenuItem` opt-out, or drop the pointer convenience · Settings' section titles render as the index's `div`, leaving the window's heading outline: a `level` on the heading kind, or accept · the footing row kind (above). *Status:* awaiting ruling (§3.6).
- [ ] **The floating identity label** — embed tiles reveal crumbs or a webpage title on hover, the Web Window shows domain › title always, the Page Window a trail in its tab strip; one design-system element, or NavTrail absorbing the webpage case. *Status:* audit decides whether the three share enough chrome.
- [ ] **Menu rows with horizontal property values** — multi-value rows land their values tight against the label; a pane-width-relative max-width for the value side has been tried and reverted several times. *Status:* audit decides (a known issue carried from ContextPM).
- [ ] **`{ minWidth: 96, height: 24 }`** written byte-identically in `PropertyPicker.tsx:123` and `CardAddPicker.tsx:118` — one class. *Status:* ruled.

#### Styling

- [ ] **The thirty plain `.css` sheets for ordinary React components** migrate to `.css.ts` as each is next opened, never as a sweep; the three feature sheets loading globally from `main.tsx` (`Sidebar.css`, `Interface.css`, `content-banner.css`) go first. *Why:* R6; Settled 5. *Status:* ruled.
- [ ] **The inline-style rule as a lint** — a `style` prop carries only a per-frame value or a custom-property assignment; the six static sites fixed (`SurfaceLab.tsx` ×2, `PickerMenu.tsx`, `PropertyPicker.tsx`, `MarkdownPM/Tables/TableView.tsx`, `CardAddPicker.tsx`). *Status:* ruled.
- [ ] **The cursor convention** — `default` everywhere except links, settled in the primitives (`MenuItem`, `AccessoryButton`, the picker row); roughly twenty sites each way today. *Why:* a macOS desktop app wearing macOS materials; AppKit shows the arrow on buttons, rows, and menu items. *Status:* awaiting ruling (§3.7).

#### Naming

- [ ] **Three "preview" strings** — the setting label "Open Connections In Preview", its hint ("…opens the preview window…"), and one test title ("Open Preview floats it instead"). *Status:* awaiting wording (§3.8).
- [ ] **`PickerChoice` vs `PickerOption`** — 42 vs 46, two spellings for one list in the same layer. *Status:* audit decides the winner; mechanical after.
- [ ] **`band` ×3** — SurfacePM's layout run, the Views' group header, the toolbar's band form: three unrelated concepts on one word; `pipeline/group.ts` already exports `ResolvedGroup` for what `GroupBand` renders. *Status:* audit proposes.

---

### 3. Open Rulings

The calls only Nathan can make; each deletes a row above when taken, and is taken with the exploration's findings in hand as the framework's phases are written. The orchestrator's own leans, to argue against: 1 defer to the Token Designer · 2 yes · 3 stays in `Windows/` · 5 take both · 6 a 16px control, the band takes a floor, the Trash row drops the pointer convenience, a heading `level`, the footing kind · 7 `default` except links · 8 "Window" · 9 everything in scope.

2. **`Interface/`'s scope** — does it absorb `Sidebar/`?
5. **The two token verdicts** — `text.callout` as the table-header step; the `surface.*` trio beside Ramp?
7. **The cursor convention** — `default` except links?
8. **The three "preview" strings** — what word replaces it?
9. **Scope of the rework itself** — taken: everything is in scope, behavior included, the DesignSystemPM pending items with it.

---

### 4. The Framework

The exploration ran — twelve read-only perspectives over the renderer whole (the Reducer as the priority lens), each returning findings with a recommendation, the alternatives it weighed, and each one's cost. Its verified findings are the §2 checklist and the §1 Settled entries; killed candidates and negative results stayed out.

What's left of the method is the **framework**: §2 rewritten from the decisions into ordered phases with gates, in the plan form the Menu recipe used — ratified, then executed one phase per session with `/closeout`. The framework is the document Nathan reads, the orchestrator edits, and a session follows. The §3 rulings are taken with the findings in hand as each phase is written.

---

### 5. Pointers

- **[[Codebase-Cleanup-Checklist]]** — the process-side half: `persist()`, the `main/index.ts` split, the drag adapters' frame; the view host landed 08-31-2026.
- **[[MenuRecipe]]** — landed 08-28; its Open Calls and Sequenced After are rows above; the plan is history.
- **[[DesignSystemPM]]** — the vocabulary and the token ledger; every token this document proposes to add, rename, or retire lands there in the same commit.
- **[[ContextPM]]** — Current Focus names which row is active; Immediate Work holds the rows in flight; nothing about the arc's scope lives outside these two.

---

### 6. Working Rules

How this document is kept honest during execution. These bind every session touching the renderer, and they are not optional.

- **Delete on landing — no tombstones.** The moment a checklist row is done it is deleted here, and the target tree in §1 is rewritten to the tree on disk. Never leave a "landed" note, a "moved from" trail, or a struck line — a done thing simply reads as the current state, as if it were always so. The tree on disk and the tree on the page never disagree across a commit.
- **Report the line count.** Every change reports its code-only LOC delta in chat (comments, blanks, and tests excluded), the way `/closeout` does.
- **No ambiguity about state.** Nothing here may leave a reader unsure what is done versus pending, or what is a critique versus a proposal. An open thing reads as open; an orchestrator's opinion is marked as an opinion, never as a decision taken; a finished thing is gone, not annotated.
