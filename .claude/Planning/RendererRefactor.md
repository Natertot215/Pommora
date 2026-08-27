## The Renderer Refactor

**Started:** 08-25-2026 · **Scope:** `Pommora/src/renderer/src` — where things live, what they are called, and which tokens they read · **Sources:** [[RendererAtlas]] holds the evidence, the eight filing rules, the target tree, and the token verdicts; [[DesignSystemPM]] holds the vocabulary; this document is the ledger — what remains, in order, and the rulings it waits on. A row that lands leaves this document; History carries what happened.

The renderer works and is filed by the order things were built. The refactor moves and renames without changing behavior, so that every folder answers "what is this" in one word, every surface wears one of five vocabulary terms, and every value read from two places is a token declared once. It runs in single-session rows; any row can be taken alone, and the typecheck catches every miss. The Codebase Cleanup — correctness, performance, the store and `main/index.ts` splits — follows it, so that its files stop moving before that work begins.

### The End Goal

The arc is finished when all of these hold at once:

- The eight rule greps in [[RendererAtlas]] §The Filing Rules return empty, and the target tree is the tree on disk.
- Every floating or sliding surface wears one of the five words — Window, Pane, Menu, Frame, Picker — and the Menu recipe owns every row kind, so no frame declares type, tone, or padding of its own.
- The token ledger in [[DesignSystemPM]] describes every var the renderer declares; the atlas's Open Decisions sections are empty because each block was ruled and executed.
- `Detail`, `SurfacePM`, and the root-level app modules no longer exist as folders under those names.

### In Flight

Ruled, with a plan on paper, and not yet executed.

- [ ] **The Menu recipe.** The recipe names every row kind once in `Menus/menu-base.css.ts` — item, heading, section title, top row, bottom row, sub-label, detail, control row (label + trailing control), chip run, slider row, sub row (indented continuation) — each with its type rung, tone, and geometry (the icon ↔ title gap `ROW_GAP` 8, the row inset `--row-inset` 6px, the row floor 24px, the surface inset `--surface-inset` 10px, the shell corner `BEAK_RADIUS` 12, the minimum width 225px). A frame picks kinds and declares no type, tone, or padding of its own. `menu-roster.tsx` renders a roster — sections → rows of a kind, each kind's control in the trailing slot — the shape the Settings window's `FRAMES` already has. `MenuDropdown` + `MenuSurface` fold into one `Menu`; the row column becomes `MenuList`; `MenuScrollFrame` → `MenuScroll`. `SortFrame` and `HiddenFrame` become rosters and lose their components; `Settings/SettingsRow.tsx` is a control row and goes. `frames.css.ts` (forty exports), `filterFrame.css.ts`, `groupFrame.css.ts`, and `layoutFrame.css.ts` shrink to geometry — the frame width, the type-tile grid, the swatch grid — and the three files that each decide a header's type (`menu-base.css.ts` top row at caption.emphasized and action row at footnote.emphasized, `groupFrame.css.ts` at footnote.emphasized, `frames.css.ts` at footnote.semibold) become one line. The design half of the vocabulary; the renames are on disk.
- [ ] **The side slot.** `SidePane` is the sliding slot — left or right, overlay or in-flow, remembered width, one driver var — and every Window mounts it; the main window's sidebar and inspector do not, driving `--io` / `--io-l` from `styles.css` on their own rules, which is why PaneSlide has three homes (`styles.css`, `window-base.css`, `Sidebar.css`). The main window mounts `SidePane` for both slots and PaneSlide becomes one motion in one file; `InspectorPane` and `WindowInspector` draw the same frontmatter surface with different chrome and are reconciled — one component or one name over two, measured by how much chrome they share; the store's `closePreview` / `settingsOpen` names follow the windows they open. The one behavior change in the vocabulary.
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

- [ ] `--labels-gap` absorbed into `Tokens/`; `--tab-min: 75px` so the floating tab strip is 5/6 of the main one.
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

The calls only Nathan can make, each of which deletes a block in the atlas when taken.

- The zoom merge — whether `--page-scale` absorbs `--mdpm-scale`, given the font-path rewiring it costs.
- The design system's three reaches — invert now, or leave under the lint's allowlist.
- `Interface/` absorbing `Sidebar/` and `Toolbar/`.
- `Windows/` keeping `NavWindow`, or `Navigation/` taking it ungrouped.
- The `PropertiesPane` Style-radio edge.
- The wording for the three "preview" strings.

### Continuity

A session opens on this document, takes one row or a few that share files, and ends with `/closeout`. A finished row is deleted here and recorded in History; a ruling taken moves out of Open Rulings and into the atlas's Settled list, and the block it answered is deleted there. Context's Current Focus states which row is active; Handoff carries the session's own detail. Nothing about the arc's scope lives outside these three documents, and the atlas keeps the evidence so a row is never re-derived.
