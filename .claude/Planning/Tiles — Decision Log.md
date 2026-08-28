## Tiles — Decision Log

### Frame

- **Purpose:** Collapse the tile-shaped code split across `Blocks/` and `Embeds/` into one `Tiles` folder that both MarkdownPM and SurfacePM consume, give the tile/window identity label one design-system home, and rehome what isn't tile-shaped (the hover pane, the connection menu, the two `Components/` strays).
- **Core Value:** One folder answers "where does a tile live?"; one element answers "how does a surface name itself?"
- **Success Criteria:** `Blocks/`, `Embeds/`, and `Components/` no longer exist; MarkdownPM and SurfacePM import tile content from `Tiles/` only; gates green; Features docs and the codebase map name the new paths.

### Sources

- `Pommora/src/renderer/src/Blocks/` — SurfacePM's tile contents (BlockSurface, MarkdownBlock, PageEmbedBlock, ViewEmbedBlock, BlockHandleMenu, blockZoom, useBlockDoc). MarkdownPM imports only `blockZoom` from here.
- `Pommora/src/renderer/src/Embeds/` — mixed: tile-shaped (PageEmbed, WebpageEmbed, ViewEmbedScope, tileWarm, webRetention, embeds.css) and not (ConnectionPane, PanePresenter, hoverPaneSize = the hover pane; connectionMenu = link context-menu resolution).
- `Pommora/src/renderer/src/Components/` — EntityIcon, useNexusIcon, RenamableTitle; all three read the store.
- `Pommora/src/renderer/src/Embeds/embeds.css:204-220` — the hover-revealed identity exists only under `.mdpm-embed-tile:hover`; `PageEmbed` renders crumbs only with `chrome='page'` (SurfacePM tiles pass none — the handle menu carries the location).
- `Pommora/src/renderer/src/Windows/webWindow.css:21-45` + `WebWindow.tsx:129-135` — the Web Window's always-visible centered domain › title label.
- `Pommora/src/renderer/src/Windows/PageWindow.tsx:199` — the Page Window's identity is a NavTrail inside the tab strip.
- `Pommora/src/renderer/src/DesignSystem/Elements/NavTrail/NavTrail.tsx` — the trail element; hover-scrolls via OverScroll.
- `Pommora/src/renderer/src/DesignSystem/Detail/tile-chassis.css` — the shared chassis both tile hosts wear.
- `Pommora/src/renderer/src/DesignSystem/Components/{AssetImage,Pickers/ImagePicker}` — the design system already reads the store; a store-coupled move into it breaks no seam.
- [[SurfacePM]], [[MarkdownPM]] §Embeds, [[InterfacePM]] §Hover Pane, [[ArchitecturePM]] — all name `Blocks/` / `Embeds/` paths; the project CLAUDE.md codebase map too.

### Decisions

#### A — The Tiles Folder

- **A-1:** [confirmed] `SurfacePM/` stays as the engine under its name; `Blocks/` does not become a subfolder of it — it becomes root `Tiles/`. This replaces the [[RendererRefactor]] row "`SurfacePM/` → `Surface/`, absorbing `Blocks/`".
- **A-2:** [confirmed] `Tiles/` holds what both hosts consume: all of `Blocks/`, plus PageEmbed, WebpageEmbed, tileWarm, webRetention, and the tile half of `embeds.css`.
- **A-3:** [confirmed] The tile identity styles (`.pgembed-crumbs` / `.wpembed-title`, `embeds.css:204-220`) extract to `Tiles/tile-title.css`.
- **A-4:** [confirmed] `tile-chassis.css` moves to `Tiles/` — the chassis both hosts wear.
- **A-5:** [confirmed] `ViewEmbedScope` → `Views/`. Its one provider is `ViewEmbedBlock`, but its 14 outside consumers are the view pipeline (frames, toolbar, views), and it is the "a view hosted on a foreign surface — saves adopt" scope a future View Window would provide too. Nathan's rule: stays in Views if a View Window would use it.
- **A-6:** [confirmed] Net code LOC must fall. Baseline (code only, no tests/comments/blanks): `Blocks/` 1816 · `Embeds/` 1203 · `Components/` 119 = 3138. Moves are zero-sum; the reduction comes from folds (D).

#### B — The Identity Label

- **B-1:** [confirmed] No shared hover-title exists today: embed tiles reveal crumbs/title on hover; SurfacePM tiles show nothing; the Web Window shows domain › title always; the Page Window shows a NavTrail in its tab strip always.
- **B-2:** [confirmed] Unifying the floating identity label (tiles + windows) is parked — it goes to ContextPM's open questions, not this cycle. This cycle only relocates the tile rules to `Tiles/tile-title.css`.

#### C — Links

- **C-1:** [confirmed] `Links/` is the home of everything that happens to a link — the hover pane (ConnectionPane, PanePresenter, hoverPaneSize), the right-click menu (connectionMenu), and the click resolvers (root `linkResolve`, `openWebLink`). The name is unambiguous against `Embeds/`, where "Connections" was not. Executed 08-27-2026 as a behavior-zero move, ahead of the Tiles plan.
- **C-2:** [confirmed] `PanePresenter` and `hoverPaneSize` fold into `ConnectionPane.tsx` in the Tiles plan, not the move — `hoverPaneSize.test.ts` resets module state through a dynamic import and needs its own module.

#### D — Folds (where the LOC comes from)

- **D-1:** [confirmed] `PageEmbedBlock.tsx` (29 lines) is a pure pass-through to `PageEmbed`; `BlockSurface` renders `PageEmbed` directly.
- **D-2:** [confirmed] `MarkdownBlock` and `PageEmbed` are the same shell — click-to-edit over `MarkdownEditor` with `nativeEditorMenu`, `readOnly={!editing}`, a debounced save flushed on edit-exit/unmount — over two data seams. One `TileEditor` shell with the save seam as a prop.
- **D-3:** [confirmed] **TileWriter** — `Detail/pageFlush.ts` generalized from path-keyed to key-keyed (`key → write fn`), so prose tiles ride the same debounce, nexus-adopt flush, and `beforeunload` flush pages do. Today `MarkdownBlock`'s private 400ms debounce has neither, so a prose-tile edit inside the window is lost on window close or nexus switch. `suppressFlush` becomes dropping the key on removal. The cycle's one behavior change.
- **D-4:** [confirmed] `blocks.css` + the tile half of `embeds.css` → one `tiles.css`; they already share `:is(.blk-md, .pgembed)` selectors.
- **D-5:** [confirmed] No shared `TileBody`: `embedWidget.mountTile` is an imperative CodeMirror widget root and `SurfaceView`'s is a React tree; the shared wrapper is one `div`.

#### E — Utilities

- **E-1:** [confirmed] `Components/` → `Utilities/`; its three files stay together. The rename is the whole step this cycle — the atlas's wrapper rows (`NexusIconPicker`, the design-system inversions) land there later.

### Core (must-have)
- `Tiles/` on disk holding the chassis, PageEmbed, WebpageEmbed, the plumbing, the dashboard-only content, and BlockSurface; `Blocks/` and `Embeds/` gone; `ViewEmbedScope` in `Views/`.
- One `TileEditor` shell over one `TileWriter`; `PageEmbedBlock` gone; one `tiles.css`; `tile-title.css` beside it.
- Gates green; net code LOC below the 3138 baseline; SurfacePM.md, MarkdownPM.md, ArchitecturePM.md, InterfacePM.md, WebviewPM.md, the CLAUDE.md map, RendererRefactor.md, and RendererAtlas.md name the tree on disk.

#### Prospects (allowed later, not now)

- The floating identity label as one element (tiles and windows) — parked in ContextPM's open calls; `tile-title.css` keeps the tile rules in one file so the element has one place to pull from.
- `block` → `tile` in identifiers (the atlas row) — a rename sweep on its own, once the folder holds still.

#### Out of Scope (won't do — distinct from Prospects)

- Any change to what a tile looks like or how it behaves beyond the writer's flush guarantees.
- The webpage tile inside SurfacePM — the dashboard's entry kinds stay markdown, page, view.

#### Considered & Rejected

- `Surface/Blocks/` (the atlas row) — Blocks' content is consumed by both hosts and Windows with no plurality; a subfolder of one host misfiles it.
- `TilesPM` — the suffix marks a product-named engine; this folder is content.
- Dissolving `Components/` into the design system — its three files read the store, the reach the atlas is closing; renamed `Utilities/` instead.
- `Connections/` for the hover pane — the pane serves webpages too; `Links/` names both.

#### Lessons
