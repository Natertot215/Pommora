## Tiles — Decision Log

### Frame

- **Purpose:** Collapse the tile-shaped code split across `Blocks/` and `Embeds/` into one `Tiles` folder that both MarkdownPM and SurfacePM consume, give the tile/window identity label one design-system home, and rehome what isn't tile-shaped (the hover pane, the connection menu, the two `Components/` strays).
- **Core Value:** One folder answers "where does a tile live?"; one element answers "how does a surface name itself?"
- **Success Criteria:** `Blocks/`, `Embeds/`, root `Components/`, and `DesignSystem/Detail/` no longer exist; MarkdownPM and SurfacePM import tile content from `Tiles/` only; gates green; Features docs and the codebase map name the new paths.

### Sources

- `Pommora/src/renderer/Blocks/` — SurfacePM's tile contents (BlockSurface, MarkdownBlock, PageEmbedBlock, ViewEmbedBlock, BlockHandleMenu, blockZoom, useBlockDoc). MarkdownPM imports only `blockZoom` from here.
- `Pommora/src/renderer/Embeds/` — mixed: tile-shaped (PageEmbed, WebpageEmbed, ViewEmbedScope, tileWarm, webRetention, embeds.css) and not (ConnectionPane, PanePresenter, hoverPaneSize = the hover pane; connectionMenu = link context-menu resolution).
- `Pommora/src/renderer/Components/` — EntityIcon, useNexusIcon, RenamableTitle; all three read the store.
- `Pommora/src/renderer/Embeds/embeds.css:109-124` — the hover-revealed identity exists only under `.mdpm-embed-tile:hover`; `.wpembed-title` is declared a second time at `:162-169` with `z-index: 4` over the shared block's 2, deliberately (the title rides above the webview guest and its catcher); `PageEmbed` renders crumbs only with `chrome='page'` (SurfacePM tiles pass none — the handle menu carries the location).
- `Pommora/src/renderer/Windows/webWindow.css:21-45` + `WebWindow.tsx:129-135` — the Web Window's always-visible centered domain › title label.
- `Pommora/src/renderer/Windows/PageWindow.tsx:199` — the Page Window's identity is a NavTrail inside the tab strip.
- `Pommora/src/renderer/DesignSystem/Elements/NavTrail/NavTrail.tsx` — the trail element; hover-scrolls via OverScroll.
- `Pommora/src/renderer/DesignSystem/Detail/tile-chassis.css` — the shared chassis both tile hosts wear.
- `Pommora/src/renderer/DesignSystem/Components/{AssetImage,Pickers/ImagePicker}` — the design system already reads the store; a store-coupled move into it breaks no seam.
- [[SurfacePM]] :14 :34 :36 · [[MarkdownPM]] :75 · [[WebviewPM]] :24 · [[DesignSystemPM]] :27 :375-381 (the `Detail` tier) · `Guidelines/Cohesion-Rulings.md` :117 · the CLAUDE.md map — name `Blocks/` / `Embeds/` / `DesignSystem/Detail` paths. [[ArchitecturePM]] :124 describes the autosave registry as path-keyed, which TileSave makes false; [[InterfacePM]] is verify-only.
- `Pommora/src/renderer/Blocks/useBlockDoc.ts:11,64-83` — the layout document's own 300ms debounce, flushed on unmount only; `Store/NexusSlice.ts:60-68` awaits `flushAllPageSaves` before the root flips, so a layout flush that fires at the tree replacement writes into the new nexus.
- `Pommora/src/renderer/Interface/pageFlush.ts` — the path-keyed writer: write-through to the warm cache at schedule time (:16), requeue on a failed ack (:36), `beforeunload` flush (:50-53).

### Decisions

#### A — The Tiles Folder

- **A-1:** [confirmed] `SurfacePM/` stays as the engine under its name; `Blocks/` does not become a subfolder of it — it becomes root `Tiles/`. The [[RendererRework]] tree carries `Tiles/` as a root folder.
- **A-2:** [confirmed] `Tiles/` holds what both hosts consume: all of `Blocks/`, plus PageEmbed, WebpageEmbed, tileWarm, webRetention, and the tile half of `embeds.css`.
- **A-3:** [confirmed] The tile identity styles (`embeds.css:109-124`) extract to `Tiles/tile-title.css`. Both `.wpembed-title` declarations travel together — the `z-index: 4` override at `:162-169` depends on source order against the shared block, and a split across two files hands that order to the import graph.
- **A-4:** [confirmed] `tile-chassis.css` moves to `Tiles/` — the chassis both hosts wear.
- **A-5:** [confirmed] `ViewEmbedScope` → `Views/`. Its one provider is `ViewEmbedBlock`, but its 14 outside consumers are the view pipeline (frames, toolbar, views), and it is the "a view hosted on a foreign surface — saves adopt" scope a future View Window would provide too. Nathan's rule: stays in Views if a View Window would use it.
- **A-7:** [confirmed] The Menu Recipe ([[MenuRecipe]]) landed on `main` at `935bf031` (08-28-2026); the plan's first phase starts from it.
- **A-6:** [confirmed] Net code LOC must fall. Baseline counted 08-27-2026 after the `Links/` move (code only — no tests, comments, blanks): `Blocks/` 1793 · `Embeds/` 634 · `Components/` 119 = 2546 at the Menu Recipe's landing (`935bf031`); the measured set also receives `ActionBand.css.ts` 88, `tile-chassis.css` 17, and `pageFlush.ts` 29 from outside those folders, so the gate is **2680**. The comparison is `Tiles/` + `Utilities/` + `Views/ViewEmbedScope.tsx` against it. Moves are zero-sum; the reduction comes from D-1, D-3, D-4, and D-6 — roughly 40-60 lines.

#### B — The Identity Label

- **B-1:** [confirmed] No shared hover-title exists today: embed tiles reveal crumbs/title on hover; SurfacePM tiles show nothing; the Web Window shows domain › title always; the Page Window shows a NavTrail in its tab strip always.
- **B-2:** [confirmed] Unifying the floating identity label (tiles + windows) is parked — it goes to ContextPM's open questions, not this cycle. This cycle only relocates the tile rules to `Tiles/tile-title.css`.

#### C — Links

- **C-1:** [confirmed] `Links/` is the home of everything that happens to a link — the hover pane (ConnectionPane, PanePresenter, hoverPaneSize), the right-click menu (connectionMenu), and the click resolvers (root `linkResolve`, `openWebLink`). The name is unambiguous against `Embeds/`, where "Connections" was not. Executed 08-27-2026 as a behavior-zero move, ahead of the Tiles plan.
- **C-2:** [confirmed] `PanePresenter.ts` and `hoverPaneSize.ts` stay their own modules. The presenter is the leaf that keeps `pointerPath.ts → ConnectionPane → PageEmbed → MarkdownPM → connections.ts → pointerPath.ts` from closing (`Editor-Internals.md:27` records the crash); the size module's test resets module state per case.

#### D — Folds (where the LOC comes from)

- **D-1:** [confirmed] `PageEmbedBlock.tsx` (29 lines) is a pure pass-through to `PageEmbed`; `BlockSurface` renders `PageEmbed` directly.
- **D-2:** [confirmed] `MarkdownBlock` and `PageEmbed` are the same shell — click-to-edit over `MarkdownEditor` with `nativeEditorMenu`, `readOnly={!editing}`, a debounced save flushed on edit-exit/unmount — over two data seams. One `TileWriter` shell with the save seam as a prop. Its justification is cohesion and one flush story, not lines: `PageEmbed` diverges in nine places (three className conditions, the scale style, the banner click guard, the header slot, the `onBody` wrap, `zoom`/`warm`/`pageId`/`embedAncestors`), and a shell that takes them as props is line-neutral. If the fold grows the count, the shell is still right.
- **D-3:** [confirmed] **TileSave** — `Interface/pageFlush.ts` generalized from path-keyed to any key, the write function riding each schedule call (`scheduleWrite(key, body, write)`) rather than a registry — a page open in five surfaces shares one slot and closing one never silences another — so prose tiles ride the same debounce, nexus-adopt flush, and `beforeunload` flush pages do. Today `MarkdownBlock`'s private 400ms debounce has neither, so a prose-tile edit inside the window is lost on window close or nexus switch. Three invariants the generalization keeps: the warm-cache write-through stays at *schedule* time (a page key's concern; a tile key passes through it as a no-op); the failed-ack requeue is gated on a drop marker (`dropWrite(key)` at tile removal), so a removed tile's in-flight write cannot resurrect the file as an orphan while an ordinary unmount keeps today's retry — this is what `suppressFlush` becomes; a `Tiles/` barrel is never created, since `embedWidget` imports `blockZoom` statically and a barrel would close the `PageEmbed → MarkdownPM → embedWidget` cycle that the lazy imports keep open. The cycle's one behavior change.
- **D-6:** [confirmed] One debounce, 400ms, app-wide (Nathan, 08-28-2026). `useBlockDoc`'s layout writer (300ms, flush on unmount only) schedules through TileSave too, keyed by `blockHostKey`, the layout stringified for the string body. It is the same hole D-3 closes — a drag or resize inside the window is lost on window close, and at nexus switch `BlockSurface` unmounts after the root flips, so the flush lands in the new nexus. Shipping D-3 without it leaves prose surviving a switch while tile positions don't. `commitLayout` and `saveBlocks` stay immediate.
- **D-4:** [confirmed] `blocks.css` + `embeds.css` → one `tile-base.css`; they already share `:is(.blk-md, .pgembed)` selectors. Classes that cross the folder boundary and must keep their names: `.pgembed` (SurfacePM's `:has()` rules, `Links/connectionPane.css`), `.pgembed-grows` (PageWindow, NavWindow), `.tile-chassis` / `.tile-chassis-body` (SurfaceView, embedWidget, a test), `.is-editing-tile` (four-way), `.mdpm-embed-tile` (owned by MarkdownPM, selected here), `blk-zoom-*` (emitted by `blockZoom`, styled by `surfacepm.css`).
- **D-5:** [confirmed] No shared `TileBody`: `embedWidget.mountTile` is an imperative CodeMirror widget root and `SurfaceView`'s is a React tree; the shared wrapper is one `div`.

#### E — Utilities

- **E-1:** [confirmed] `Components/` → `Utilities/`; its three files stay together. The rename is the whole step this cycle — the atlas's wrapper rows (`NexusIconPicker`, the design-system inversions) land there later. Eleven import sites, rewritten by explicit path (`@renderer/Components/`, `'../Components/`) — `DesignSystem/Components/` shares the word and is reached by twenty relative imports and sixty-odd aliased ones.

### Core (must-have)
- `Tiles/` on disk holding the chassis, PageEmbed, WebpageEmbed, the plumbing, the dashboard-only content, and BlockSurface; `Blocks/` and `Embeds/` gone; `ViewEmbedScope` in `Views/`.
- One `TileWriter` shell over one `TileSave`; `PageEmbedBlock` gone; one `tile-base.css`; `tile-title.css` beside it.
- Gates green; net code LOC below the 2680 gate (the 2546 baseline plus the three inbound movers); SurfacePM.md, MarkdownPM.md, ArchitecturePM.md, InterfacePM.md, WebviewPM.md, the CLAUDE.md map, and RendererRework.md name the tree on disk.

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
