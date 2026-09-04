## Tiles — Decision Log

### Frame

- **Purpose:** Establish drag-to-size and the tile grid as one core Pommora system, alongside Views, Pages, Properties, and Connections, so that in-app windows, floating panes, and picker menus size through one box primitive while Space and Homepage grids, MarkdownPM embeds, and a tabbed inspector share one tile mechanism.
- **Core Value:** A new tile host or a new tile kind is one declaration, not a tour of switch sites, and every surface that sizes by drag reads as the same gesture. The arc builds the substrate — storage, interaction, persistence, the tile recipe — so the inspector and its kinds can be built later without plumbing anything first.
- **Success Criteria:** An inspector tab could mount a tile grid through the same host binding a Space uses, from a document stored in the Nexus; a backlinks or properties tile would be one kind entry plus its body; `SurfacePM/` is gone and nothing outside MarkdownPM says "block"; one pointer engine drives every resize and move.

### Sources

- [[SurfacePM]] — the block-surface feature doc; the model, tile types, chassis, interaction, storage rules, and its Pending and Prospects lists.
- [[InteractionPM]] — the interaction primitives; the Resize Frame paragraph added 09-04-2026.
- [[InterfacePM]] — the shell, the inspector ("reserved; its design pass is pending"), WindowBase, the Page Window.
- [[FrameworkPM]] — v0.8 names the Claude-chat inspector ("the panel ships; its body is empty"); v0.9 names SurfacePM completion.
- `Pommora/src/renderer/SurfacePM/README.md` — the provenance and invariants; spells `core/` and `sensors/` lowercase and says the codec repairs, both stale.
- `Pommora/src/renderer/SurfacePM/Core/{model,ops,rects,edges,snap,hitTest,codec}.ts` — the pure split tree: bands of rows and columns with pixel-height tile leaves, zero-sum width ratios, absolute heights, edge resolution, snapping.
- `Pommora/src/renderer/SurfacePM/SurfaceView.tsx` — the controlled grid: geometry, the handle and edge gestures on `Sensors/pointerDrag.ts`, phases, the chassis shell.
- `Pommora/src/renderer/SurfacePM/TileSurface.tsx` — the host binding: `useTileDoc`, the entry union, the two menu paths, create, remove, convert, duplicate.
- `Pommora/src/renderer/SurfacePM/{MarkdownTile,PageTile,ViewTile,WebTile}.tsx` — the bodies; `PageTile` is the embed framework five hosts render through.
- `Pommora/src/renderer/SurfacePM/{block-tile-base,tile-surface,block-title}.css` — the chassis and the grid chrome.
- `Pommora/src/shared/blocks.ts` — the on-disk and IPC contract; its header still says the document lives in a sidecar.
- `Pommora/src/main/blocks.ts` — the document is one `local_state` row under scope `blockDoc`, keyed by host; markdown bodies are `<id>.md` in the host's folder.
- `Pommora/src/main/Database/localState.ts` — the scope union the row family lives in.
- `Pommora/src/renderer/MarkdownPM/Editor/embedWidget.tsx` — the embed tile: a lone-line CM6 widget on the chassis, a south-only handle on `usePointerGesture`, heights and zooms persisted per host page.
- `Pommora/src/renderer/Interactions/ResizeFrame.tsx` + `resize-frame.css` — the box primitive landed 09-04-2026: rect in, clamped rect out, `equilateral`, `outlined`, `move`.
- `Pommora/src/renderer/Interactions/gesture.ts` — the pointer engine; a module singleton, capture deferred to activation.
- `Pommora/src/renderer/DesignSystem/Pickers/picker-base.tsx` — PickerMenu placement: direction flips once per open, `bounds` is horizontal only, no height clamp.
- `Pommora/src/renderer/Interface/InspectorPane/InspectorPane.tsx` — a GlassPane with one empty `.inspector-body`.
- `Pommora/src/renderer/Windows/{window-base,window-panel}.tsx` — the window chassis and its overlay and inflow side panels.
- `Pommora/src/renderer/Interface/{HomepageView,SpaceView}.tsx` — the two hosts; each mounts `TileSurface` with a host ref and persists nothing itself.
- `Pommora/src/renderer/SurfacePM/ViewTileScope.tsx` — the view-config write gate, imported by twelve files outside SurfacePM.

### What Exists

Drag-to-size is two geometry problems on three pointer paths.

| Problem | Owner | Consumers | Engine |
| --- | --- | --- | --- |
| One box: clamp a rect, optionally carry its origin | `Interactions/ResizeFrame` | WindowBase corners and move, GlancePane edges, sidebar and inspector strips, window side panels | `gesture.ts` |
| One box, height only | `embedWidget.tsx` `EmbedResizeHandle` | MarkdownPM embed tiles | `gesture.ts` |
| One tree: negotiate a boundary between tiles | `SurfacePM/SurfaceView` + `Core/ops` | Space and Homepage grids | `Sensors/pointerDrag.ts` |
| One axis with a per-type clamp | `Tables/ColumnHeader` + `columnWidths.ts`; `MarkdownPM/Tables/MarkdownTable` | table columns | `gesture.ts` |

Still hand-rolling pointer capture outside the engine: `Tabs/TabBar.tsx` (native window drag), `Controls/Slider`, `CalendarPicker`'s range edges, and `Interactions/engine.tsx` (the DnD engine's own capture).

Anchor-in-place is PickerMenu's placement (flip once per open, horizontal-only `bounds`, no height clamp), the glance's `watchAnchor`, `paneSlide` on the `--io` progress for the sidebar, inspector, and window panels, and `onScreen` for a window.

The tile stack today, bottom to top:

1. **Core** — the pure tree. Host-agnostic, tested, unchanged since PM-044.
2. **SurfaceView** — layout in, layout out; geometry, gestures, the chassis shell with handle and eight edges. Host-agnostic; it mounts with plain state and no IPC.
3. **TileSurface** — binds a host ref to a document row, decodes entries through a closed three-member union, renders bodies through a switch, owns two parallel menu implementations over one model, and drives create, remove, convert, and duplicate over nine `blocks:*` channels.
4. **Bodies** — MarkdownTile, PageTile, ViewTile; WebTile exists but is not a surface tile kind, only an embed.
5. **Hosts** — HomepageView and SpaceView, each one line.

MarkdownPM's embed tile is not on this stack. It is a CM6 widget on the same chassis rendering the same bodies with the same minimum, zoom ramp, and warm cache, persisted by a different row family. The document is its layout.

### Decisions

#### A — The Hierarchy

- **A-1:** [assumed] The system is five layers, each with one job: the pointer engine (`gesture.ts`); a geometry owner, of which there are exactly two, one box (`ResizeFrame`) and one tree (`Tiles/Core` + the grid); the chassis (the visual contract every tile and handle keys onto); the host binding (document, kinds, persistence); the bodies. A consumer enters at the layer matching its problem: windows, the glance, strips, and the embed tile are one box; a Space, the Homepage, and an inspector panel are one tree.
- **A-2:** [assumed] The box and the tree stay two owners. A tile edge is a boundary between neighbors, resolved by `Core/edges` into a divider, a stack pair, a band pair, or a stretch; forcing that through a rect clamp would be scaffolding. They share the engine, the handle classes, the phase vocabulary (`move` | `drop` | `abort`), and the outline tint.
- **A-3:** [assumed] The embed tile's handle moves onto `ResizeFrame` (`rect: { h }`, `equilateral`, edges `['s']`). It is one box. Its persistence stays MarkdownPM's.
- **A-4:** [assumed] `Sensors/pointerDrag.ts` folds into `gesture.ts`. The grid's handle and edge gestures already share the engine's vocabulary (`ACTIVATION`, `suppressNextClick`); the engine already aborts on Escape, cancel, blur, and a buttonless move. The one open point is the rAF coalescing the sensor adds; Chromium aligns `pointermove` to the frame already, and the fold is confirmed by counting `onDragMove` calls per frame over CDP before it lands, since each move clones the layout and recomputes geometry.
- **A-5:** [confirmed] Slider and CalendarPicker fold onto the engine now (dispatched 09-04-2026, ahead of the arc). TabBar's native-window drag stays; the DnD engine's own capture is its own arc.

#### B — Naming and Filing

- **B-1:** [assumed] `SurfacePM/` becomes `Tiles/`, a plain-noun sibling of `Views/`, `Windows/`, `Tables/`, `Cards/`. "Surface" is already the glass material (`GlassSurface`, the `Surface` component) and Nathan's word for any UI surface; the module name overloads it.
- **B-2:** [assumed] Not `Canvas/`. The README's own words: the grid-cell model "was rejected in favor of a split tree," and free placement is a Prospect. A canvas implies free placement; this is a mosaic.
- **B-3:** [assumed] "Block" leaves the tile system entirely and stays MarkdownPM's word for its CM6 blocks (`blockModel`, `blockHandles`, `blockDrag`). The rename scope, from the sweep: `shared/blocks.ts` → `shared/tiles.ts` (`BlockHostRef` → `TileHostRef`, `BlockEntry` → `TileEntry`, `BlockDoc` → `TileDoc`, `BlockStyle` → `TileStyle`, `knownBlock` → `knownTile`); `main/blocks.ts` → `main/tiles.ts`; `blocks:*` → `tiles:*` and `window.nexus.blocks` → `window.nexus.tiles`; `.blk-surface` → `.tile-host` (also read by `Interface/Interface.css:63-71`); `block-tile-base.css` → `tile-chassis.css`; `block-title.css` → `tile-title.css`; `--block-zoom` → `--tile-zoom` (declared in `MarkdownPM/Styles.css:1`, read by the Table and Cards views and `view-tile.css.ts`); `blk-zoom-*` → `tile-zoom-*`; the locals in `TileSurface`, `useTileDoc`, `tile-surface.css`. The on-disk entry `type: 'markdown'` and the `<id>.md` files do not change.
- **B-4:** [confirmed] "Block" is MarkdownPM's word, storage and channels included: `blocks:*` → `tiles:*`, and the `'blockDoc'` scope goes with the document's move to files (C-7); whatever stays in `local_state` is re-keyed once.
- **B-5:** [assumed] Files inside `Tiles/`: `Core/` unchanged; `SurfaceView.tsx` → `TileGrid.tsx` with `tile-grid.css`; `TileSurface.tsx` → `TileHost.tsx`; the bodies under `Tiles/Surfaces/` (Nathan: "Surfaces/ for the kinds" — a tile's content is a surface; read as the bodies folder, to confirm); `block-tile-base.css` → `tile-base.css`. `useTileDoc`, `tileCache`, `tileZoom`, `webRetention`, `pageTileWrite` keep their names.
- **B-6:** [assumed] One vocabulary rule, from Nathan's own usage: a **pane** is a glass region of the shell or a window (inspector, sidebar, window side pane); a **tab** is one configured tile host inside the inspector; a **panel** is a menu surface — properties, backlinks — whether it stands alone or sits on a tile (`PagePanel` already reads this way). "Surface" stays the glass material and a tile's content.
- **B-7:** [assumed] The rename's outward blast radius, from the sweep: `ViewTileScope` has twelve importers across `Frames/`, `Views/`, and `Toolbar/`; `block-tile-base.css` is imported by `embedWidget.tsx` and `PageHistoryWindow.tsx`; `tileZoom` by `gripMenu.ts`; `--block-zoom` by two view stylesheets and `TableView.tsx`. All mechanical.

#### C — The Host Binding

- **C-1:** [confirmed] The host ref enumerates its CURRENT consumers only — the detail hosts (Homepage, Space) and MarkdownPM's embeds as the two scopes tiles live in today — and adding a member is one union entry plus one `hostDir` arm and nothing else. The inspector's shapes, Obsidian-like (a reserved tab per Collection holding its own configuration, one Pages tab every page shares with selection-aware tiles, and capped user-made tabs), are recorded here as what the seam must admit without pre-plumbing them.
- **C-2:** [assumed] The closed entry union becomes the tile recipe: one `Record<type, TileKind>` in `Tiles/recipe.tsx` where a kind declares its zod member, its surface, its menu rows, and whether it has a backing file. `TileHost`'s render switch, `tileMenuModel`'s three branches, and `TileHandleMenu`'s five kind checks read the table. This is one file and a lookup, not a plugin system; a later panel kind (properties, backlinks) or a list kind is one entry plus its surface.
- **C-3:** [assumed] Main-side lifecycle per kind (remove trashes a file, duplicate copies one, the rename cascade walks markdown bodies) stays in `main/tiles.ts` keyed by `type`; a kind with no backing file has no arm there.
- **C-4:** [assumed] A host is a folder, and a markdown tile's body is a `.md` in it — the existing rule, extended: a Collection tab's bodies live in the Collection's folder beside its sidecar; the Pages tab and each custom tab get a folder under `.nexus/inspector/`. The Homepage already works this way (`.nexus/homepage/`).
- **C-7:** [confirmed] The document leaves `nexus.db` for files, and Space and Homepage layouts go cross-device with it (mobile and sync are near-term). No new config file: a host's document returns to the host's own sidecar (`_space.json`, `homepage.json`, a Collection's `_pagecollection.json`), the lost-update objection that once moved it out now answered by `rmwJsonStrict` and the path-built lock keys; the existing `local_state` rows migrate into the sidecars once on open.
- **C-9:** [confirmed] The nexus-wide configuration (the Pages tab, the custom tabs) lives in `state.json` under one key; no new config file.
- **C-10:** [assumed] Per-tab warmth (folds, scrolls, editor state) stays per-machine and in memory, through `tileCache.ts`'s warm seam keyed by the tab's host chain, capped by the same `capSet` the active-tab cache uses and sized by the existing Active Tab Cache setting (`personalization.tabCache`, 5–20, default 5) — no second cache, no second setting, nothing persisted.
- **C-8:** [confirmed] The cap: custom tabs up to 6 (`MAX_INSPECTOR_TABS` in `shared/tiles.ts`), raised later if wanted; warmth is bounded by C-10 regardless of tab count. The guard lives at the create channel; a foreign file over the cap reads inert rather than failing.
- **C-5:** [assumed] The two menu implementations (`TileHandleMenu` in-app, `popNativeMenu` native) stay two presenters over the one `tileMenuModel`; the kind table feeds the model, not the presenters.
- **C-6:** [assumed] `WebTile` becomes a surface tile kind (`type: 'webpage'`) through the same table. Deferred to Prospects unless the inspector wants it in Core.

#### D — The Inspector

- **D-1:** [confirmed] The shape, not built in this arc: `InspectorPane` hosts a tab strip and one `TileHost` per tab (the `WindowTabStrip` precedent); the Collection tab shows for a selected Collection or its pages alongside the Pages tab; custom tabs always. Selection-aware kinds read the store's selection themselves; the host binding does not thread it.
- **D-2:** [assumed] The grid inside a 240–420px pane is a vertical stack: bands of full-width tiles with absolute heights, north edges negotiating through the band pair. The model already handles it; the ratio row is available but rarely useful at that width.
- **D-3:** [confirmed] Machine-independent, cross-device: the document is Nexus content (C-7), never `local_state`.
- **D-4:** [confirmed] Custom tabs are user-created and capped (C-8); Collection and Pages tabs are reserved.
- **D-5:** [confirmed] A "list" is a view, or a **panel** tile: a menu surface (`menu-base`) standing on a tile — a properties panel, a backlinks panel. The recipe takes it as a kind whose surface is a menu; no panel kind ships in this arc.
- **D-6:** [assumed] A backlinks kind reads the content index's `mentions` table (`main/Database/contentIndex.ts`), the seam Linked-From was already gated on.
- **D-7:** [assumed] The Page Window's inspector (`PagePanel`, properties only) and the shell inspector stay distinct until a properties tile kind exists; then the Page Window's could become a one-tile panel. Prospect.

#### E — Reconciliation

- **E-1:** [assumed] Stale now, fixed by the arc: `shared/blocks.ts` header says the document lives in a sidecar (it is a `local_state` row); the README spells `core/` and `sensors/` lowercase and says the codec repairs when it parses; the `has-live-editor` class on `.blk-surface` has no consumer.
- **E-2:** [assumed] Docs that go false on rename: [[SurfacePM]] wholesale (becomes the Tiles doc), the SurfacePM row in [[DesignSystemPM]]'s roster, [[InteractionPM]]'s Resize Frame paragraph, [[InterfacePM]]'s inspector line, `ContextPM`'s "band names three unrelated things" ride-along.
- **E-3:** [assumed] `TILE_DEFAULT_PX` is read only by the embed widget while surfaces mint at `NEW_TILE_H`; the zoom ramp's seven CSS classes are hand-written while the factors come from `SCALE_STEPS`. Both are one-definition fixes the arc takes in passing.

### Approaches Weighed

**1. Tiles as a core module (recommended).** Rename, open the two unions (host ref, tile kind), fold the two remaining box resizes and the second pointer engine, and mount the inspector on the result. It keeps the split tree the README argued for and the layering that already lets the grid mount alone with plain state. The honest cost: it is the existing architecture with its two closed seams opened and its names fixed, chosen because the seams are the only things wrong with it.

**2. The inspector as docked windows.** Make each inspector panel a `WindowBase` that docks to the right edge, so "window" and "inspector panel" are one thing sized by one primitive and docking is a clamp. It collapses two chassis into one and gives panels move, undock, and a footer for free. The cost: the shell's inspector is a `paneSlide` on `--io` with a content clearance the whole interface reads; a docked window would have to drive that clearance, and windows deliberately redeclare `--io` so the shell's cannot leak in. The direction is sound and is logged as a Prospect once panels exist.

**3. The shell as a WindowBase shape.** Sidebar and inspector become the shell's left and right panels, unifying `paneSlide`, the strips, `--io`, and the width persistence under one owner. It is the deepest collapse on offer and touches every consumer of `--sidebar-clearance` and `--inspector-clearance`. Not this arc; a Prospect.

**4. Free placement ("Canvas").** Re-express tiles as `ResizeFrame` rects with collision. It is the model the README rejected; it loses the row-fills-surface invariant a narrow panel depends on and reintroduces compaction. Rejected.

### Core (must-have)

The substrate only — Nathan: "the goal here isn't to BUILD this feature, but to make sure it's possible and doesn't need the components to be plumbed beforehand."

- One pointer engine for every resize and move: the sensor folds into `gesture.ts`, the embed handle onto `ResizeFrame`.
- `Tiles/` with `Core/`, `TileGrid`, `TileHost`, `Surfaces/`, `tile-base.css`; every "block" gone outside MarkdownPM, channels and storage included; docs and tests renamed with it.
- The tile recipe replacing the switch sites in the host, the menu model, the menu presenters, and main's lifecycle; the three existing kinds re-declared through it.
- `TileHostRef` enumerating its current consumers with a one-entry seam for the next; the host-folder rule for markdown bodies.
- The document in the host's sidecar (C-7), the nexus-wide configuration key in an existing `.nexus/` file (C-9), the cap constant and the warm-seam reuse declared (C-8, C-10); the existing Space and Homepage rows migrated once.

#### Prospects (allowed later, not now)

- The inspector itself: the tab strip, the reserved and custom tabs, the tab create and remove flow — on the substrate, no plumbing first.
- Panel kinds: properties (letting the Page Window's inspector become a one-tile tab), backlinks over the content index's `mentions`, a list.
- Webpage as a surface kind — the surface exists; don't-foreclose: nothing, the recipe takes it.
- Panels as docked windows (approach 2); the shell as a WindowBase shape (approach 3).
- The remaining hand-rolled captures (Slider, CalendarPicker) onto the engine.
- Tile conversions both ways, the background Insert menu, embed banners — the existing [[SurfacePM]] Pending list, unchanged.

#### Out of Scope

- PickerMenu placement — no plumbing needed; a centered picker resizes by mounting the frame's handles as its children.
- MarkdownPM embeds becoming tree-driven — the document is their layout; they share the chassis, bodies, minimum, zoom, warm cache, and now the box primitive, and that is the whole intersection.
- The DnD engine's own capture — a separate system with its own arc.

#### Considered & Rejected

- Free placement (approach 4) — the README's rejection stands; a narrow panel needs rows that fill.
- `Canvas/` as the directory name — implies free placement.
- A generic "resizable" prop on PickerMenu — the host mounts the frame directly; a prop would be a passer.
- Routing tile edges through `ResizeFrame` — a boundary is not a box; the tree ops are the geometry.

#### Lessons

- Two geometry problems, one gesture vocabulary: fold engines and handles, never owners → routes to Guidelines once the arc lands.
