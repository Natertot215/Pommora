### Ghost Tiles — Initial Decisions

**DATE:** 10-05-2026
**STATUS:** Implemented

### Context

Tile boards (the Homepage and each Space) create a tile through a right-click on the board's background, which writes a Markdown Tile at once with no menu. Ghost Tiles replaces that with the hover-ghost creation every view renderer and the sidebar already use: an unlocked board shows a ghosted "New Tile" in the empty space under the pointer, and clicking it opens a creation menu at the click.

This document settles the feature's behavior and the approach a seven-lane investigation of the code named under *§Sources* arrived at; the implementation plan carries the tasks.

### Overview

An unlocked board offers a ghost tile in each wedge under a shorter tile, occupying the exact box the created tile would take, and under its last band a bottom ghost filling the room the pane shows, or, where that room is less than a tile's worth, an add strip for a new bottom row. Clicking either opens the Insert Menu — **New Page**, **Link Page**, **Link View** — drawn in-app or natively by the **Use Native Menus** preference and anchored at the click point. An empty board stands one ghost permanently. A board stacked into one column has no wedge and keeps its bottom zone. Right-click on the background does nothing.

#### Concepts

- **Ghost Tile:** A non-persisted, dimmed, tile-shaped box holding the `layout-dashboard` glyph over "New Tile", drawn at the placement a new tile would take. It is an overlay and never a leaf of the layout tree.
- **Wedge:** The empty space under a tile, down to its branch's floor: the bottom of the branch that holds it in the first enclosing column where that branch isn't the last child, or the band's bottom when no such column exists. A tile created there attaches flush beneath that tile and fills the gap.
- **Bottom Zone:** The clearance under a board's last band. With a tile's worth of room below the board in the pane it is a ghost's hover zone, and its ghost fills that room; with less it offers the **Add Strip** — the thin bordered "+" a Markdown table adds a row by — the moment the pointer enters, so a board scrolled to its end still gains a row. Either adds a full-width band.
- **Standing Ghost:** The ghost an empty board shows without a hover, in the box the first tile takes.
- **Hover Ghost:** The shared dwell-and-grace mechanism in `UIX/Interactions/ghostCreate.ts` behind every "New Page", "New Option", sidebar, and tile ghost; a dwell begins only on a real pointer move.
- **Insert Menu:** The menu a ghost tile's or the add strip's click opens; mirroring the tile-grip menu of today’s tiles.

---

### Decisions

#### A - Creation Entry

- **A-1:** [CONFIRMED] Ghost tiles are the way a tile is created on a tile board.
- **A-2:** [CONFIRMED] Right-click on the board background is removed outright; it opens nothing and creates nothing.
- **A-3:** [CONFIRMED] Two placements are offered — under a tile (a wedge), by its ghost, and a new bottom row, by the bottom zone's ghost or strip. Placing a tile beside another stays a drag.
- **A-4:** [CONFIRMED] Ghosts and the add strip appear only on a board that accepts new tiles; a locked board shows none, including a locked empty board.
- **A-5:** [CONFIRMED] A board drawn as one column under the stacking width keeps the bottom zone and the Standing Ghost and has no wedge, so a narrow surface — a side pane's — can still gain a tile at its bottom.
- **A-6:** [CONFIRMED] The ghost and the add strip are buttons, so an empty board takes its first tile from the keyboard and a menu opened that way hangs from the control; a hover ghost still appears only under the pointer, as every other hover ghost does. There is no touch path beyond what the kit gives the strip.

#### B - Ghost Appearance

- **B-1:** [CONFIRMED] The ghost shows the `layout-dashboard` glyph with "New Tile" beneath it, in the manner of the Cards ghost's "New Page".
- **B-2:** [CONFIRMED] It fades in and out on `ease-base` and wears a ghosted border.
- **B-3:** [CONFIRMED] While its menu is open the ghost holds, wearing a `--state-hover` wash; it fades when the menu is dismissed without a pick, and on a pick it stays until the tile lands in its place. The add strip holds lit the same way. The hold is the host's `inserting` state after the hook's `take()`, as the handle menu's `menuOpenId` is, and the Standing Ghost wears it the same way.
- **B-4:** [INFERRED] Under a plain hover the ghost lifts from the inactive dim to the ghost dim through `data-ghost-root` and `.ghost-worn`; the `--state-hover` wash belongs to the menu-open state alone.
- **B-5:** [INFERRED] Its border and radius come from the tile base, at the Cards ghost's border weight.

#### C - Placement Geometry

- **C-1:** [CONFIRMED] The ghost draws in the layout-conforming box the created tile would occupy.
- **C-2:** [CONFIRMED] A board with tiles adds its bottom row from the bottom zone — the whole room under the last band — which takes the shape the room allows: with at least 80px of tile below the board a dwell anywhere in that room raises a ghost filling it down to the pane's inset, taking the board's bottom clearance as its own, so an open board shows the tile it would gain; with less, the zone is the clearance and offers the add strip one gutter under the last band, full-width, so it is in view on a board scrolled to its end and reserves no space. The room is read with the board's own size sample, and the shape holds through the menu it opened.
- **C-3:** [CONFIRMED] The Standing Ghost is full-width and `NEW_TILE_H` tall, 250px — the height a tile with nothing to size it by takes, which the strip's band and the Space seed's tiles share. An empty board is one whose layout holds no bands, including a layout that failed to decode.
- **C-4:** [INFERRED] A wedge's ghost fills the wedge, and the created tile takes that fill height.
- **C-5:** [INFERRED] A gap shorter than `TILE_MIN_PX` offers no ghost, and neither does a gutter.
- **C-6:** [INFERRED] The ghost never enters `layout` or `draft`, so a gesture never measures geometry the ghost occupies; the `dropSlot` box is the precedent for a non-tile box at a `Placement`.
- **C-7:** [INFERRED] The ghost's target is `append` or `wedge`, with wedges derived from the layout tree by one function, `wedgeFills` in `Layout/rects.ts`, that the grid draws from and the host seats by: walking up from a leaf to the first column in which the leaf's branch is not the last child, the wedge's floor is that branch's bottom, or the band's bottom when no such column exists. The wedge's box spans the leaf's width, from one gutter below the leaf's bottom to that floor, and exists when it is at least `TILE_MIN_PX` tall. `onGridContextMenu` floors every wedge at the band's bottom and accepts gutters and the band seam as points, so it is not carried over.
- **C-8:** [INFERRED] The Standing Ghost is the one ghost element drawn at the first tile's box without a dwell, not a second component.
- **C-9:** [CONFIRMED] The add strip shows at once as the pointer enters the clearance under the last band and answers nothing to a resize. It works the same on a stacked board and under a locked tile. Its thickness is the kit's `--add-strip-size`, 18px, which the Markdown table's row and column strips share.
- **C-10:** [CONFIRMED] The board's bottom edge eases whenever its height changes outside a live drag or resize — a ghost showing or closing, a tile created or removed — as tiles ease their placement.

#### D - Hover Timing

- **D-1:** [CONFIRMED] A wedge's ghost and the bottom ghost appear after a 1s dwell, a starting knob; the add strip shows with no dwell.
- **D-2:** [CONFIRMED] A tile holding the caret does not suppress ghosts.
- **D-3:** [CONFIRMED] Ghost tiles leave scrolling untouched: neither a hover zone nor the ghost intercepts the wheel, and scrolling empty space under a still pointer raises no ghost — a ghost arms on a pointer move. Electron delivers `pointerenter` to an element scrolled under a still pointer, so the rule is held in the shared hover ghost and every consumer follows it.
- **D-4:** [INFERRED] One ghost shows per board at a time, and leaving its zone fades it after a short grace that lets the pointer cross onto the ghost itself.
- **D-5:** [INFERRED] A press clears or holds off the ghost through the hook's pointerdown capture; the hover zones are withdrawn while the grid is busy, which covers a live gesture and a settle; while the Insert Menu or its create is in flight the grid suppresses arming, and a native menu takes all input.

#### E - Insert Menu

- **E-1:** [CONFIRMED] Clicking a ghost opens a menu of New Page, Link Page ›, Link View ›, in that order; nothing is created until a row is picked.
- **E-2:** [CONFIRMED] The menu is drawn by the in-app presenter or the system menu according to Use Native Menus.
- **E-3:** [CONFIRMED] The menu anchors at the click point, not at a tile handle.
- **E-4:** [CONFIRMED] The first row is labeled "New Page" and creates a Markdown Tile.
- **E-5:** [INFERRED] The Markdown Tile's handle menu lists Link Page above Link View, matching the Insert Menu.
- **E-6:** [INFERRED] Link rows keep the `link` glyph; New Page wears the default page glyph.
- **E-7:** [INFERRED] The Link rows are the handle menu's own pick trees (`pickTreesOf`, `pickRows`, `TilePick`); a source with nothing to pick shows its row disabled, as the handle menu does.

#### F - Creation Outcome

- **F-1:** [CONFIRMED] A Markdown Tile created from the ghost takes the caret.
- **F-2:** [INFERRED] After a pick lands, the new tile's handle menu doesn't open.
- **F-3:** [INFERRED] A create is not undoable, as today.
- **F-4:** [INFERRED] The placement is resolved against the board as it stands when the create lands, not as it stood at the click: a wedge is re-derived under C-7 and takes its current fill, and when its tile is gone or no wedge of at least `TILE_MIN_PX` remains under it, the create lands as an append. A pick on a board locked since the menu opened creates nothing, in either menu; the handle menu's picks follow the same rule, and a duplicate whose source is gone lands as an append. No create leaves an entry without a leaf.
- **F-5:** [INFERRED] Link Page and Link View create their tile in one act — `tiles:create` given a `TilePick`, resolved through the pick table convert already uses — since create-then-convert writes an empty markdown file and removes it through the trash path on every linked create.

#### G - Mechanism Candidates

- **G-1:** [INFERRED] The ghost runs on `useGhostAnchor`; no second hover mechanism is written. The hook holds D-3 for every consumer by deferring an anchor's enter until the pointer's next move.
- **G-2:** [INFERRED] Wedge hover is driven by hit zones rendered from the grid's memoized placements, one per wedge, each feeding `useGhostAnchor` as a card or row does, so a pointer move costs no script. The bottom zone is one more hit zone over the clearance; its enter reads the room below the pane's content once and either feeds the hook under the `append` anchor or switches the strip's reveal host on.
- **G-3:** [INFERRED] The add strip's look is the kit class `add-strip`, hoisted from the Markdown table's own rule so the two are one control.
- **G-4:** [INFERRED] A point-anchored menu is one optional `MenuOptions` point carried through `popMenu` into `MenuPresenter` and the picker frame's existing `anchorX` / `anchorY` mode, with the native side sending the same point as its anchor; the ghost element is still passed as the trigger, for dismissal and window scoping.
- **G-5:** [INFERRED] `TileGrid` stays host-agnostic: it reports the picked target and the click through `onInsert`, and `TileHost` owns the menu and the write, handing the grid its open Insert Menu as `inserting`. `onGridContextMenu` leaves the grid.

#### H - Reconciliation

- **H-1:** [INFERRED] `SurfacePM` *§Surface Interaction* describes ghost creation in place of right-click, its host-lock sentence names the ghost, its *§Tile Types* sentence names the pick-entry arm, and its Pending entry for the Insert menu is removed.
- **H-2:** [INFERRED] `Core/Tiles/README.md` *§Interaction Invariants* states that a locked board withholds ghosts and a stacked board offers the bottom placement alone; its Module Map rows for `rects.ts`, `TileGrid.tsx`, and `tileHandleMenu.ts` name wedges, ghost tiles, and the Insert Menu.
- **H-3:** [INFERRED] `TilesV2-Spec` Prospects and `FrameworkPM` v0.9.0 drop the background Insert menu.
- **H-4:** [INFERRED] `ViewTypesPM`'s hover-ghost paragraph names tile boards among the surfaces the ghost serves.
- **H-5:** [INFERRED] The Tiles tests that stub or drive `onBackdrop` follow the prop; `tilesFile.test.ts`'s `createTile` refusal of `page` and `view` and `tiles.test.ts`'s pinned `menuRows` order follow F-5 and E-5, as does every test call of `createTile`.
- **H-6:** [INFERRED] The "a kind that needs a source is reached by convert" statement is restated in `tilesFile.ts`, `TilesV2-Spec` *§The Seams*, `SurfacePM` *§Tile Types*, and `TilePick`'s comment in `tiles.ts`.
- **H-7:** [INFERRED] `ConfigurationPM`'s Use Native Menus row names the Insert Menu among the menus the preference governs.
- **H-8:** [INFERRED] The grid's `biome-ignore` for its right-click affordance leaves with `onContextMenu`.

---

#### Constraints

- No O(N), allocating, or layout-reading work on pointer move (*§Hard Rules*).
- `UIX` reaches nothing outside itself; a change to the ghost hook stays kit-level and serves every consumer.
- Every tile write goes through the `tiles:*` channels declared once in `bridge.ts`, and answers with the landed document.
- A wedge's ghost never changes the board's height; only an empty board's Standing Ghost gives the board its height, and an empty board has no tile to press.
- Any popup born inside a tile board renders through a body-level portal.
- A hover zone sits beneath tile chrome: a tile's south resize edge hangs below its box and stays reachable.
- The Insert Menu's order is defined once, in `TILE_KINDS.markdown.menuRows`, which both menus read.

#### Rejected

- Right-click on the background opening the Insert Menu — removed outright.
- A real Page created by the first row — it creates a Markdown Tile.
- "New Tile" as the first row's label — "New Page" stands.
- Suppressing ghosts while a tile holds the caret.
- A smaller, centered Standing Ghost — it would grow on creation.
- A full-size ghost row below the last band, raised by a dwell over the open space or the bottom border — it drew below the fold on a board scrolled to its end, grew and shrank the board, and its border trigger competed with resize and was dead on a stacked board.

#### Prospects

- Choices drawn inside the ghost tile as buttons, replacing the menu.
- A ghost for placing a tile beside another.
- A keyboard path to tile creation.
- A touch path, once Mobile draws boards wider than the stacking width.
- An undoable create.

---

#### Sources

- `Core/Tiles/TileGrid.tsx: 475-501` [CONFIRMED] `onGridContextMenu` derives the append or wedge target and its fill height from `computeGeometry`, and refuses on `boardStatic`.
- `Core/Tiles/TileGrid.tsx: 54, 473, 545` [CONFIRMED] The `BackdropTarget` union; `dropSlot` is a non-tile box drawn at a `Placement`.
- `Core/Tiles/TileGrid.tsx: 74, 254, 512` [CONFIRMED] `placed` is memoized per layout; the grid's height is the layout's plus `BOTTOM_PAD_PX` (28px).
- `Core/Tiles/TileGrid.tsx: 284-298` [CONFIRMED] `gestureOrigin` measures the live view at the press.
- `Core/Tiles/tile-grid.css: 1-5` [CONFIRMED] The grid is `position: relative` with a 120px minimum height.
- `Core/Tiles/TileHost.tsx: 284-296` [CONFIRMED] `onBackdrop` creates a markdown tile, then `attachBelow` or `insertBand`.
- `Core/Tiles/TileHost.tsx: 79, 99-102` [CONFIRMED] `editingId` and its dismissal live in `TileHost`.
- `Core/Tiles/TileHost.tsx: 197-258` [CONFIRMED] The handle menu builds through `tileMenuItems` and pops through `popMenu` at the handle.
- `Core/Tiles/tileHandleMenu.ts: 40-59, 82-94` [CONFIRMED] `pickTreesOf` builds the page and view pick trees once per menu; Link rows are `pickRows` over them.
- `Core/Tiles/tiles.ts: 14, 90, 102-125` [CONFIRMED] `NEW_TILE_H`, `TilePick`, and `TILE_KINDS`, whose markdown `menuRows` order Link View before Link Page.
- `Core/Tiles/tilesFile.ts: 54-63, 149-186` [CONFIRMED] `createTile` makes only a kind whose bare seed is whole; `CONVERTS` resolves a pick into an entry patch; `convertTile` revises an existing tile.
- `Core/Tiles/tilesFile.ts: 66-106` [CONFIRMED] `reviseTile` removes a converted file-backed tile's file through the trash dependencies.
- `Core/Tiles/handlers.ts: 80-83` · `Core/Contract/bridge.ts: 181-184` [CONFIRMED] `tiles:create` takes a host and a type.
- `Core/Tiles/tileKinds.tsx: 25-75` [CONFIRMED] Each surface receives `beginEdit`.
- `UIX/Interactions/ghostCreate.ts: 1-170` [CONFIRMED] `useGhostAnchor`: an id-keyed dwell from one `dwellMs`, grace, a closing state, `take`, `clear`, and `suppressWrap`, which closes the ghost as a menu opens; blocked by `gestureLive()`.
- `UIX/Interactions/ghost-create.css: 1-15` [CONFIRMED] `data-ghost-root` and `.ghost-worn` carry the dim and its `duration-base` / `ease-base` transition.
- `Core/Views/Cards/CardsView.tsx: 122, 543-599` · `cards-view.css: 50-58` [CONFIRMED] `GhostCard`: glyph and "New Page", `ghost-worn`, a `--width-200` border, a fade-in keyframe, and a 200ms grace.
- `Core/Views/Host/useViewInteractions.tsx: 446-473` [CONFIRMED] Views stand a permanent ghost when the container holds no rows, and claim its create for the whole flight.
- `Core/Properties/Schema/GhostOptionChip.tsx: 1-85` · `Core/Interface/Sidebar/Sidebar.tsx: 164, 341-357` [CONFIRMED] The hook's two other consumers, each with its own dwell and grace.
- `Core/Actions/menuActions.ts: 6-24` [CONFIRMED] `popMenu` routes to the native menu or `presentMenu` by `devicePrefs.nativeMenus`, and to the native menu whenever it is given no trigger; both anchor from a trigger element's box.
- `Core/Actions/menuModel.ts: 65-69, 98` [CONFIRMED] `MenuAnchor` is `{ left, top, height }`.
- `Desktop/Actions/menu.ts: 7-15` [CONFIRMED] The native menu pops at `(anchor.left, anchor.top + anchor.height)`.
- `Core/Session/chromeSlice.ts: 28-32, 62-71` · `Core/Interface/Menus/MenuPresenter.tsx: 84-101` [CONFIRMED] `presentMenu` takes a trigger `HTMLElement`; the in-app menu is a `PickerMenu` on a `triggerRef`.
- `UIX/Pickers/PickerMenu.tsx: 182-194` [CONFIRMED] The picker frame anchors to a point through `anchorX` / `anchorY` / `anchorHeight`; `GlancePane.tsx: 415` and `caretPane.tsx: 72` are callers.
- `Core/Tiles/Layout/ops.ts: 53-86, 111-118` [CONFIRMED] `attachBelow` places the leaf in its target's own column, or wraps the target in one; a missing target returns the layout unchanged.
- `Core/Tiles/Layout/ops.ts: 20` · `Core/Tiles/Layout/codec.ts: 12-18` [CONFIRMED] A one-child container collapses into its child whatever its grandparent's kind, so a column can hold a column and a row a row.
- `Core/Tiles/tileDocStore.ts: 145, 254-263, 304` [INFERRED] An undecodable layout reads as the empty layout; `commitTileLayout`'s updater runs against the live tree; the lock is set through the store.
- `Desktop/Actions/menu.ts: 49-59` [CONFIRMED] The native menu settles only by a pick or its own dismissal.
- `Core/Tiles/Layout/stack.ts: 12-14` [CONFIRMED] A stacked board keeps reading order, so an append lands at its bottom.
- `UIX/Interactions/resizable.css: 15-21, 42-46` [CONFIRMED] A tile's south resize edge is 10px tall and hangs 5px below its box.
- `Core/Tiles/tilesFile.test.ts: 205-209` · `Core/Tiles/tiles.test.ts: 227-230` · `.claude/Features/ConfigurationPM.md: 32` [CONFIRMED] The `createTile` refusal test, the pinned `menuRows` order, and the Use Native Menus row naming "pickers and the tile handle".
- `UIX/Interactions/gesture.ts: 59` · `UIX/Pickers/PickerMenu.tsx: 118-123` [CONFIRMED] `gestureLive()` is true only for an active gesture, not a settle; a modal picker draws a dismissal shield.
- `UIX/Symbols/index.tsx: 168` [CONFIRMED] `layout-dashboard` is registered.
- `Core/Contexts/SpaceView.tsx` · `Core/Interface/Homepage/HomepageView.tsx` · `Core/Interface/Windows/WindowTabBody.tsx: 51` [CONFIRMED] The three mounts of `TileHost`: the Homepage and a Space inside `InterfaceScaffold`, a windowed Space inside `tile-host-frame`.
- `.claude/Features/SurfacePM.md: 36, 38, 50` [CONFIRMED] Right-click creation, the host lock withholding background-create, and the pending Insert menu.
- `Core/Tiles/README.md: 93-96` [CONFIRMED] A static board "withholds the backdrop's create menu".
- `.claude/Planning/TilesV2-Spec.md: Prospects` · `.claude/FrameworkPM.md: v0.9.0` [CONFIRMED] Both list the background Insert menu as outstanding.
- `.claude/Features/ViewTypesPM.md: 16` [CONFIRMED] The hover-ghost paragraph, which names rows and cards.
- `Core/Tiles/TileGrid.test.tsx: 56` [CONFIRMED] The `onBackdrop` prop stub.
