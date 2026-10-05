## Tiles

Tiles names the board, the surfaces a tile holds, and the page and web embeds that share those
surfaces across the app. The layout engine under `Layout/` is one part of it: a mosaic of
draggable, resizable tiles rendered from a pure layout tree. The grid is host-agnostic — it knows
nothing about what a tile contains (markdown, a page, a view) or where the tree persists; the host
binding (`TileHost.tsx`) supplies both, and the surfaces a tile can hold live under `Surfaces/`.

#### The Model (`Layout/model.ts`)

A page is a vertical stack of **bands**. Inside a band, a **row** divides width by zero-sum
ratios, a **column** stacks children, and every **tile** owns its height in pixels. The two
axes deliberately obey different physics:

- **Width is relative** — a row's ratios always sum to 1, so resizing one tile is a splitter
  negotiation with its neighbor and the row always fills the surface.
- **Height is absolute** — stretching a tile never deforms a neighbor; columns flow
  independently and a shorter column simply ends. Ragged row ends are legal; trapped holes
  are impossible by construction, so no compaction pass exists.

#### Stacking

Under 480px of the grid's own measured width the board is drawn as one column:
`Layout/stack.ts` re-serializes the tree into one band per tile in reading order — left to right
inside a row, bands top to bottom — keeping each tile's height. The derivation is for render
alone, so the invariants above are untouched: the tree the grid was handed is the tree it hands
back. The threshold carries a hysteresis margin so a width animation crosses it once, and it is
sampled between gestures, so the board holds its layout under a held pointer. It is the grid's
own behavior, so every host gets it.

#### Module Map

| File | Role |
| --- | --- |
| `Layout/model.ts` | Tree types, height derivation, and lookup |
| `Layout/ops.ts` | Pure tree operations — split, move, remove, band ops, the four resize ops, and `repairLayout` |
| `Layout/rects.ts` | Tree → per-tile placements as shares of the board width, resolved to pixel rects, dividers, and band seams at a measured width |
| `Layout/edges.ts` | A tile edge → the shared boundary it actually moves |
| `Layout/hitTest.ts` | Drag pointer → drop target (band seam or tile edge, with hysteresis) |
| `Layout/snap.ts` | Alignment magnetism — boundaries lock to other tiles' edges |
| `Layout/codec.ts` | The stored and write-gate layout schemas; decoding repairs what a hand edit left |
| `Layout/stack.ts` | The narrow-width derivation — rows flattened to one column, and its threshold |
| `tiles.ts` | The entry union, the kinds table (`TILE_KINDS`), and the host schema and key |
| `tileHosts.ts` | The hosts table (`TILE_HOSTS`) — a host's folder and every board; host-run |
| `tilesFile.ts` | Entry lifecycle, tile body IO, and the rename rewrite; host-run |
| `tileDoc.ts` | The document's read-modify-write; host-run |
| `handlers.ts` | The `tiles:*` channels; host-run |
| `TileGrid.tsx` | The React grid — gestures on the app's pointer engine, preview, settle, placement tint, the stacked board |
| `tileDocStore.ts` | The host-keyed tile document, shared by every mount, plus the markdown tile's `BodyIO` and removal marks; the tile's text itself is held in `Core/Session/pageDetailCache.ts` under the tile id |
| `useTileDoc.ts` | The document's React reader — its snapshot and lock, and the gesture hold |
| `TileHost.tsx` | The host binding — the menus, create, remove, convert, duplicate |
| `tileKinds.tsx` | The surface table (`TILE_SURFACES`) and `TileBody` |
| `tileHandleMenu.ts` | The handle menu's model and pick trees |
| `tileZoom.ts` | The Scale steps and their menu rows |
| `BoardLock.tsx` | The board lock control — the host settings surfaces and a windowed Space's footer bar all mount this one |
| `Surfaces/` | What a tile can hold — markdown, a page, a view — and the web tile MarkdownPM's embed mounts |

#### Resize Semantics

Resizing lives on each tile's own edges and corners — window-style, never bars in the gaps.
Each edge resolves to a different op:

- **South** stretches the tile itself; nothing else moves, the page flows.
- **North** negotiates with the stacked tile directly above (pair clamp); nested-split
  neighbors decline and the edge falls back to nothing.
- **East/west** move the nearest ancestor row divider (ratio splitter, min-width clamp).
- Every boundary magnetizes to other tiles' edges within the `snapPx` radius.

#### Interaction Invariants

These are load-bearing; the comments at each site say why. Summarized:

- **Every gesture is snapshot → preview → commit/abort.** Deltas recompute from the frozen
  drag-origin layout — never accumulated against the preview. Hit-testing runs against the
  origin geometry so a shifting preview can't retarget the gesture.
- **Tiles render in stable id order, never tree order.** Reordering keyed DOM nodes mid-drag
  would remount every reflowing tile mid-transition. Position is absolute, so DOM order costs
  nothing.
- **Decide-then-animate.** Releasing settles the tile into its decided slot as a transition;
  the layout commits on `transitionend` with the engine's fallback timer, outside any React
  state updater.
- **Both drags run on `Interactions/gesture.ts`**, the app's one pointer engine: Escape while
  active, `pointercancel`, blur, and a lost release all abort, never zombie. The grid keeps its
  own tree geometry because a tile edge is a boundary negotiated with its neighbors, not a
  box; the `useResizable` hook sizes boxes.
- **PommoraDND is the interaction vocabulary**: the shared `ACTIVATION` threshold,
  `suppressNextClick`, `HYSTERESIS` edge-hold, `findScroller` + the shared auto-scroll loop
  (`startAutoScroll`), and the shared `Feel` for reflow/settle.
- **The grid's own handlers are identity-stable**, reading all live values through a per-render
  ref, so the memoized `TileShell` never re-renders for a callback identity change. `renderTile`
  changes with the board's data, and each surface redraws only when its own entry, its edit
  state, its page, or the connections change.
- **A static board answers no geometry gesture.** A host lock and the stacking width are one
  state; the grid refuses the press before the pointer engine sees it and withholds the
  backdrop's create menu, so no gesture path carries a stacked branch. Content editing, the
  handle menu, and view tiles run either way.

#### Persistence Seam

`TileGrid` is fully controlled: `layout` in, `onLayoutChange` out — the tree it draws may be a
narrow-width derivation, while the tree it hands back is the one it was given. The codec
decodes the stored tree. Unknown keys on an entry or the document are kept by the loose entry
schemas, `mergeEntry`, `patchEntries`, the document writer, and the store's `kept`; the tile
document itself belongs to `tileDocStore.ts`.
