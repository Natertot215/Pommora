## The Renderer Refactor

**Started:** 08-25-2026 · **Scope:** `Pommora/src/renderer/src` — where things live, what they are called, and which tokens they read · **Sources:** [[RendererAtlas]] holds the evidence, the eight filing rules, the target tree, and the token verdicts; [[DesignTermsV2]] holds the vocabulary and its rename tables; this document is the ledger — the whole scope in one outline, with a mark on every row already true on disk.

The renderer works and is filed by the order things were built. The refactor moves and renames without changing behavior, so that every folder answers "what is this" in one word, every surface wears one of five vocabulary terms, and every value read from two places is a token declared once. It runs in single-session rows; any row can be taken alone, and the typecheck catches every miss. The Codebase Cleanup — correctness, performance, the store and `main/index.ts` splits — follows it, so that its files stop moving before that work begins.

### The End Goal

The arc is finished when all of these hold at once:

- The eight rule greps in [[RendererAtlas]] §The Filing Rules return empty, and the target tree is the tree on disk.
- Every floating or sliding surface is named by [[DesignTermsV2]] — Window, Pane, Menu, Frame, Picker — and no `Dropdown`, `Preview`, `Leaf`, or `Panel` names one; the Menu recipe owns every row kind and no frame declares type, tone, or padding of its own.
- The token ledger in [[DesignSystemPM]] describes every var the renderer declares; the atlas's Open Decisions sections are empty because each block was ruled and executed.
- `Detail`, `SurfacePM`, and the root-level app modules no longer exist as folders under those names.

### Done

Each row is on disk and committed; the commit is named where one commit carries it.

- [x] The atlas written and the Design Coherence Report retired into it; the toolbar ViewDropdown's inert View Style toggle purged — `8dba1ee5`.
- [x] The design system reads its own tokens where it had restated them — `19d71280`.
- [x] The atlas regrouped by subject — Structure, Naming, Geometry, Tokens, Styling — with an open-decision block per section — `b9367907`.
- [x] Stray tokens cleared; the `--width-*` ladder and the `--fade-*` names minted — `715bd9a3`.
- [x] The border ladder: `--border-base` / `-light` / `-faint` as edge colors, composed with `--width-*` at the consumer — `ad385956`.
- [x] `Views/` at the renderer root, `TableView/` and `CardView/` holding only the view layer — `a9d8b0ef`.
- [x] `Cards/` — one card chassis (`CardRoot` → `CardBody` → `CardThumb` / `CardText` → `CardTitle` · `CardTrail`, `.card-grid`) worn by the Navigation gallery and CardView — `51e737df`.
- [x] `Tables/` — the tabular chrome (`.table` token scope, `Table.css`, `ColumnHeader`, `tableDnd`, the column mechanics) worn by TableView and the Trash — `cd1fcdff`.
- [x] `Properties/` as the value layer — resolution at the root, `Editing/` and `Editors/` beneath; the order reads `DesignSystem ← Properties ← Tables ← Views` with `Cards/` standing alone — `230290fc`.
- [x] `PathField` / `BrowseButton` and `EmptyValue` minted; `solidColor` → `Tokens/`, `ghostAnchor` → `Interactions/`; `DashIcon` retired for the `square-dashed` symbol — `5bbd8a98`.
- [x] The Settings window on the menu row primitive — rail tabs and settings rows are `MenuItem`; `MenuItem`'s sub-label wraps.
- [x] The toolbar's tone is the container's — `.app-toolbar` and the window chassis toolbar declare `--label-control`, Button inherits it, and the ten specificity pins built against the old `button` selector are gone.
- [x] `--label-zoom` retired; chips render at one size everywhere.
- [x] `Windows/` — `PageWindow`, `WebWindow`, `NavWindow`, the tab strip, the warm cache, the morph; the chassis is `DesignSystem/Components/WindowChassis` (`.window-*`), `SidePane` beside it; `Detail/DetailPane` → `Detail/ContentView`; `Tabs/NavView` → `Detail/NavView`; `NotchedPane` → `NotchedShell`.
- [x] Rulings taken and written into the atlas's Settled list: spacing and radius stay literal on the even grid, odd values reconciling per consumer; the toolbar tone rule; the `--tint-solid` keep; `subChip` stays.
- [x] The vocabulary applied — [[DesignTermsV2]]'s five words across the tree: `Frames/` from `Components/Detail` with every `*Pane` a `*Frame`; `DesignSystem/Menus/` in kebab parts with `FrameSlide`; `DesignSystem/Glass/` as `glass-base` / `-window` / `-surface` / `-control` / `-pane` with the tier names swapped to their meanings; `InspectorPane`, `ConnectionPane`, `AutocompletePane` on `glass-pane`; the toolbar's `*Menu`; `SettingsWindow`, `TrashFrame`; the `menu` motion token.

### In Flight

Ruled, with a plan on paper, and not yet executed.

- [ ] **The Menu recipe** — the row kinds named once in `Menus/menu-base.css` (item, heading, section title, sub-label, detail, control row, chip run, slider row, sub row); `menu-roster` renders sections → rows of a kind; `MenuDropdown` + `MenuSurface` fold into `Menu`; `MenuScrollFrame` → `MenuScroll`; `SortFrame` and `HiddenFrame` become rosters; `frames.css.ts`, `filterFrame.css.ts`, `groupFrame.css.ts`, `layoutFrame.css.ts` shrink to geometry; the three files that each decide a header's type become one line.
- [ ] **The side slot** — the main window's sidebar and inspector mount `SidePane`; PaneSlide becomes one motion in one file; `InspectorPane` and `WindowInspector` reconciled; the store's `closePreview` / `settingsOpen` names.
- [ ] **The zoom family** — three renames (`--card-scale` → `--cards-scale`, `--zoom` and its embed feeders → `--view-scale`, `--block-zoom` → `--block-scale`) and one merge (`--editor-scale` + `--mdpm-scale` → `--page-scale`) that rewires the font path so an embed's font is not scaled twice; `--preview-zoom` renamed out of the family as a crop.
- [ ] **Three strings still say "preview"** — the setting label "Open Connections In Preview", its hint, and one test title; UI copy waits on the wording.

### Pending

Grouped by the atlas section that carries the evidence. Each row is a session or folds into one with its neighbors.

#### Filing

- [ ] `Detail/` → `Interface/`, absorbing `Sidebar/` and `Toolbar/`; `DetailScaffold` → `InterfaceScaffold`.
- [ ] `Core/` for the root modules — `store`, `treeIndex`, `assetUrl`, `linkResolve`, `pageMenuActions`, `openWebLink`, `selection`, `Commands`, `destinationTree`, `nativeMenus`, `nativeCaret`, and `Tabs/warmCache`.
- [ ] `Connections/` — the hover card, its presenter and sizing, the link menu, with `linkResolve` and `openWebLink` from the root.
- [ ] `Navigation/` absorbs `Tabs/` (`TabBar`, `tabsModel`); `Embeds/ViewEmbedScope` → `Views/`; `Sidebar/sidebarDndModel` → `DesignSystem/Interactions/reorderModel`; `Settings/IconPicker` + `iconFavorites` → `Components/` as `NexusIconPicker`.
- [ ] `Showcase/` out of `DesignSystem/`.
- [ ] `SurfacePM/` → `Surface/`, absorbing `Blocks/`, `block` → `tile` in identifiers; `DesignSystem/Detail/tile-chassis.css` and `Detail/ActionBand.css.ts` move with it.
- [ ] The casing renames — `Materials/glass-*.tsx` → `Glass*.tsx`, the lowercase subfolders under `MarkdownPM/` and `SurfacePM/` and `Views/pipeline/`, stylesheets to lowerCamel beside their component, `Segment/` and `DropOutline/` folded into their one file.

#### Boundaries

- [ ] The design system's three upward reaches — `AssetImage`, `ImagePicker`, `PickerControl` — inverted through wrappers in `Components/`, then a Biome `noRestrictedImports` rule from `DesignSystem/**`.
- [ ] `PropertiesPane`'s per-column Style radios — keep the ruled `Properties → Views` / `Tables` edge and name it, or lift the section beside the other panes.

#### Tokens And Geometry

- [ ] `--glass-inset` and `--glass-radius` into `Tokens/` as `size.glass`, with fallbacks at the design-system reads — awaiting the ruling.
- [ ] `--subline-h` and `--labels-gap` absorbed into `Tokens/`; `--tab-min: 75px` so the floating tab strip is 5/6 of the main one.
- [ ] Odd spacing values (`3` / `5` / `9px`) reconciled to the nearer even step per consumer, as each is opened; `Slider.tsx:106`'s radius `9` with them.
- [ ] One checkbox recipe — `Labels/checkboxBox` as the source; `Controls/checkbox.css` and `Properties/Editing/checkboxLook` read its geometry.
- [ ] The token ledger in [[DesignSystemPM]] carries the zoom composition (page → block → view, the card knob beside), the tint short-circuit note, and the five vocabulary terms.

#### Styling

- [ ] The 28 plain `.css` sheets for ordinary React components migrate to `.css.ts` as each is next opened, never as a sweep.
- [ ] The inline-style rule (a `style` prop carries only a per-frame value or a custom-property assignment) as a lint; the fourteen static sites fixed.
- [ ] The cursor convention — `default` everywhere except links, settled in the primitives.

#### Behavior

- [ ] `Blocks/ViewEmbedBlock.tsx:88` → `cellRing(key)` — the one behavioral fix in the arc; a grey-celled view embed draws its ramp outline instead of a chroma-less tint.

### Open Rulings

The calls only Nathan can make, each of which deletes a block in the atlas or [[DesignTermsV2]] when taken.

- The zoom merge — whether `--page-scale` absorbs `--mdpm-scale`, given the font-path rewiring it costs.
- `--glass-inset` / `--glass-radius` as tokens.
- The design system's three reaches — invert now, or leave under the lint's allowlist.
- `Interface/` absorbing `Sidebar/` and `Toolbar/`.
- `Windows/` keeping `NavWindow`, or `Navigation/` taking it ungrouped.
- The `PropertiesPane` Style-radio edge.
- The wording for the three "preview" strings.

### Continuity

A session opens on this document, takes one row or a few that share files, and ends with `/closeout`. A finished row moves from Pending or In Flight into Done with its commit; a ruling taken moves out of Open Rulings and into the atlas's Settled list, and the block it answered is deleted there. Context's Current Focus states which row is active; Handoff carries the session's own detail. Nothing about the arc's scope lives outside these three documents, and the atlas keeps the evidence so a row is never re-derived.
