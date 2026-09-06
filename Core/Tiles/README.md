## Tiles

The tile layout engine: a mosaic of draggable, resizable tiles rendered from a pure layout
tree. The grid is host-agnostic — it knows nothing about what a tile contains (markdown, a
page, a view) or where the tree persists; the host binding (`TileHost.tsx`) supplies both,
and the surfaces a tile can hold live under `Surfaces/`.

#### Provenance

Built after a full teardown of **react-grid-layout**. RGL was studied for its patterns —
collision semantics, resize-handle geometry, controlled-layout data flow — and then retired:
**no RGL code was copied**. Its
grid-cell model (units + compaction + tetris holes) was rejected in favor of a split tree,
and its synthetic drag core was replaced by PommoraDND's capture discipline.

#### The Model (`Core/model.ts`)

A page is a vertical stack of **bands**. Inside a band, a **row** divides width by zero-sum
ratios, a **column** stacks children, and every **tile** owns its height in pixels. The two
axes deliberately obey different physics:

- **Width is relative** — a row's ratios always sum to 1, so resizing one tile is a splitter
  negotiation with its neighbor and the row always fills the surface.
- **Height is absolute** — stretching a tile never deforms a neighbor; columns flow
  independently and a shorter column simply ends. Ragged row ends are legal; trapped holes
  are impossible by construction, so no compaction pass exists.

#### Module Map

| File | Role |
| --- | --- |
| `Core/model.ts` | Tree types, height derivation, lookup, validation |
| `Core/ops.ts` | Pure tree operations — split, move, remove, band ops, the three resize ops |
| `Core/rects.ts` | Tree → per-tile pixel rects, divider hit zones, band seam centerlines |
| `Core/edges.ts` | A tile edge → the shared boundary it actually moves |
| `Core/hitTest.ts` | Drag pointer → drop target (band seam or tile edge, with hysteresis) |
| `Core/snap.ts` | Alignment magnetism — boundaries lock to other tiles' edges |
| `Core/codec.ts` | Persistence codec — a parse; the ops keep every mutation normalized |
| `TileGrid.tsx` | The React grid — gestures on the app's pointer engine, preview, settle, placement tint |
| `TileHost.tsx` | The host binding — the document, the entry union, the menus, create, remove, convert, duplicate |
| `Surfaces/` | What a tile can hold — markdown, a page, a view — and the web tile MarkdownPM's embed mounts |
| `TileLab.tsx` | Dev harness (demo + stress layouts) |

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
  box; the `ResizeFrame` primitive sizes boxes.
- **PommoraDND is the interaction vocabulary**: the shared `ACTIVATION` threshold,
  `suppressNextClick`, `HYSTERESIS` edge-hold, `findScroller` + the shared auto-scroll loop
  (`startAutoScroll`), and the shared `Feel` for reflow/settle.
- **Handlers are identity-stable**, reading all live values through a per-render ref, so the
  memoized `TileShell` never re-renders for a callback identity change. The `renderTile`
  prop carries the same contract: identity-stable, no mutable per-tile closures.

#### Persistence Seam

`TileGrid` is fully controlled: `layout` in, `onLayoutChange` out. The codec round-trips
the tree; entry payloads, unknown-key preservation, and the surrounding tile document belong
to the host binding above, not here.
