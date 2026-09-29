## PommoraDND


Pommora's in-house drag-and-drop engine, owning the interaction layer the way MarkdownPM owns the editor. It has no drag dependency; it is scoped to a known reality — Chromium-only, React-only, a known set of surfaces — and adds what a general library leaves out: pointer capture, hysteresis, and a frame-accurate commit. Every draggable surface goes through it rather than reaching for a library of its own, which is what lets a drag feel the same wherever it starts.

### The Seam

**SOURCE:** `UIX/Interactions/gesture.ts` · `UIX/Interactions/engine.tsx` · `UIX/Interactions/drag.ts` · `Core/MarkdownPM/Gestures/editorGesture.ts`

One gesture runs at a time. A press becomes a drag only once it travels far enough to mean one, and from that moment the gesture owns the pointer until it ends; Escape, a release outside the window, or the window losing focus all abandon it cleanly, and a surface that disappears mid-drag takes its gesture with it. A release that never traveled far enough is a click instead, and only an actual release counts, so one affordance can honestly do both jobs — a list glyph in the editor ticks a checkbox when pressed and moves the item when dragged. Scrub controls — a pane's resize edge, a slider, panning a photo, dragging a window by its chrome — respond from the instant of the press with no threshold, since there is no click to protect.

`drag.ts` is the sort-engine seam over `engine.tsx`: one session at a time, serving two zone kinds.

- **`DragGroup`** — the engine: one closure holding the zone registry and the live session, with the chip or overlay rendered through one portal. The app mounts one group, zone ids are internal, and a zone mounted outside any group seats its own.
- **`SortableZone`** — a displace zone: a list, row, or grid whose neighbors slide aside to open the landing slot. A zone given a `className` renders its own container, so an empty band is still a drop target, and an empty zone that admits the lifted item carries `--drag-floor`, the lifted item's height in its own px, while a drag is in flight. A landing in the item's own zone reports `onMove(id, beforeId)`. The source's `carry` record of `carries(family, of)` entries says what the item can become elsewhere, and a zone whose `family` matches one of them receives it through `receive(item, beforeId)` while the source's `release` removes it; a zone's `renderOverlay` lifts its item as a portal overlay.
- **`LineZone`** — a line zone: a list where an insertion line marks the landing slot and nothing moves. Its spec snapshots the measured rows (`snap`), turns a point into a slot (`resolve`), places the line (`line`), and commits a slot (`commit`); rows register through `useLineRow` or `LineRow`, empty groups through `useLineGroup` or `LineGroup`, and `useLineSlot` reads the slot under the pointer. A line zone declares `carry` the same way.
- **`useDragItem(id, { open })`** — wires a displace item, returning the node ref, a static style, and the handle; the engine writes every transform.
- **`moveBefore` · `nextOrder`** (`UIX/Utilities/moveItem.ts`) — the before-id helpers a commit applies: `moveBefore` moves an item the list already holds and answers null on a no-move, and `nextOrder` places an id the list may not hold yet.

### Core Principles

- **One pointer sensor** handles mouse, trackpad, pen, and touch through Pointer Events over the one gesture skeleton, which listens on the window and captures the pointer once a drag activates, so a sub-threshold tap keeps its click.
- **Measure once.** Item rects are frozen as a zone is first entered, collision runs against the frozen snapshot, the items array is never mutated mid-drag, and the reorder commits exactly once, on drop. A displace zone shifts its snapshot by its reference element's movement on scroll and disclosure; a line zone measures its rows in the host's own px, re-originates the host on scroll, and re-measures when its rows or `watch` values change or a disclosure springs open.
- **Closest-center collision with hysteresis.** The over-slot is the nearest item center to the projected drag point, and switching slots must clear a small threshold, so a boundary never flickers.
- **One strategy-agnostic shift.** Displacement is a rects-reflow — each non-dragged item moves to the slot it will occupy — covering vertical lists, horizontal rows, and wrapping grids alike.
- **Decide, commit, then animate.** On drop the accept-or-reject decision is made first, and the commit lands at release in `flushSync`; the engine then reads the committed layout and glides every moved element from where it was, the overlay gliding onto the landed element. A displace drop into the item's own zone or its family glides, as does a displace item's return; a carry and a line drop land at once.

### Displacement

The first of the engine's two drop treatments: neighbors reflow to open the gap the item will land in. It serves lists, rows, grids, and the Cards view's card grids. A lift freezes a zone's geometry as it is first entered and shifts it by its reference element's movement on scroll and disclosure, never re-measuring under the drag's own transforms. The over slot is the candidate center nearest the lifted item's projected center, with hysteresis; a foreign zone's candidates are its items plus one trailing cell walked past the last item along the grid's own columns. That cell wraps to a new row once the last row is full, and in a grid a point past the last item, beside it on its row or anywhere below it, takes the trailing slot outright, so an item can land at a band's end, past the last card of a full row, or in an empty band. A zone's `resolveIndex` can refuse a slot, in which case the preview and the drop both fall back to the lifted slot.

One placement rule moves every item: the zone's order without the lifted item, the lifted item spliced in at the over slot when this is the zone under it, and each item's transform the distance from its frozen rect to that cell, divided by the rendered zoom `currentZoom` reads off that zone. The lifted item moves in place, with its transform following the pointer; a zone with `renderOverlay` lifts it as a fixed portal overlay under the cursor, which the Cards view uses so a card can leave a tile embed's scrolling body. `DropSlot`, rendered inside its zone, paints the box the item will land in — the size of the cell it lands in, and the lifted item's own past the last cell or in an empty zone — as the one `.drop-slot` rect, clipped to the zone's visible region.

The tile grid's placement preview is a third treatment beside these two: a two-dimensional layout editor (`Core/Tiles/TileGrid.tsx`) that moves and resizes tiles by edge relations over its own computed geometry, sharing only the gesture skeleton and the `.drop-slot` chrome.

### Insertion Line

The second treatment, for where the drop point has to be exact — the sidebar tree, the outline, a view's bands and Table rows, the Grouping and Sorting panes, the settings frames, option lists, the Properties panel, and the nav list. Nothing displaces: an Apple-style line marks the drop, the picked-up row dims in place, and a chip follows the pointer through a portal, holding the grab point and showing the item's icon and title. The session owns the whole lifecycle — tracking, autoscroll, spring-open, the line and chip chrome, announcements, keyboard, and cancel — and measures every registered row itself in the host's own px, divided by the rendered zoom `currentZoom` returns, so a surface measures nothing. Each surface passes only its slot model: what a snapshot holds, how a point becomes a slot (null declines — the item's own gap draws no line and commits nothing), where the line sits, and what a slot commits; the models stay pure and unit-tested. Flat and grouped lists share one lane primitive (`UIX/Interactions/reorderModel.ts`, mounted through `laneSpec`), and the sidebar keeps its own hierarchical model. A page row that leaves its surface travels on as a loose item, so a tab row can receive it, and while it's loose no line resolves and a release off every tab moves nothing. In the sidebar the commit lands optimistically wherever a pure tree transform can express it, and a Set row's middle nests the dragged row into it, which is the way into a Set with no rows of its own. In the view bands one band router (`routeBandDrop`) classifies each drop as a view patch or a folder move, and `mutateAhead` paints the move at release and rolls it back if the write is refused; a drop into a Set draws an indented line and lands first in the Set, and a renderer whose bands don't nest turns nesting off. The editor's block drag keeps its own lifecycle while wearing the same chrome.

### Autoscroll

One app-wide primitive drives every drag's edge-scroll (`UIX/Interactions/autoscroll.ts`), armed by the gesture from its `autoScroll: { from, axis }` field: a singleton frame loop started at activation, paused while a carried item is loose, and stopped with the gesture through the instance-scoped stopper it holds, so a bystander surface's teardown can't halt a live drag. The loop scrolls one fixed scroller resolved once at activation — `from` itself, or the nearest ancestor that scrolls in the needed axis — reads the last pointer point every frame so holding still at an edge keeps scrolling, and advances in pixels per second scaled by the frame delta, so the speed is identical at any refresh rate. Distance-based acceleration eases a run in from a floor toward a ceiling, and direction-intent withholds a direction until the pointer has left that edge band once, so grabbing an item already pinned at an edge doesn't rocket the container.

The tunables are the fields of the one `AUTOSCROLL` constant.

**SOURCE:** `UIX/Interactions/autoscroll.ts`

| Title | Field | Value |
| --- | --- | --- |
| Edge Band | `edge` | `48px` |
| Speed | `speed` | `840px` per second |
| Proximity Ramp | `ramp` | `2` |
| Accel Start / Max / Distance | `accelStart` / `accelMax` / `accelDist` | `0.5` / `1.5` / `600px` |

### Constraints & Accessibility

- **Constraints** — an `axis` lock per zone, released by a 24px cross-axis tug where the item can travel to another zone, and a `resolveIndex` veto on each zone that refuses a landing slot outside the dragged item's run. The gesture owns the press rule: a press in a text field never drags; a press on a control below the item — a button, the collapse chevron included, a link, a select, or a value chip marked `data-drag-slop` — needs 12px of travel to lift, as does a handle that is itself a button (ribbon items, view pills, icon favourites), so a tap-wobble activates the control instead; every other item body lifts at 5px.
- **Look** — a lifted line row dims in place, and hover reveals hide on its host and every enclosing reveal host while it's held; the gesture owns the grabbing cursor, and chips paint above menus.
- **Announcements** — an assertive ARIA live region announces every engine drag's pick-up, drop, return, cancel, and tab-bar open, pointer or keyboard, in the `announceDrag` vocabulary over the one `announce` primitive; each keyboard step names its place from `STEP_WORDS` — before, into, or after a named row in a line list, and a position in a displace zone. A drop that changes nothing, or whose write is refused, announces "{name} returned to its place." Tiles, editor tables, and the editor's block and list drags announce nothing, and Table columns announce without a name.
- **Keyboard** — a line list is one tab stop: the host hands focus to the last-focused or first row, Up and Down move between rows, Space lifts a row, and Enter opens a row that opens. A displace item is its own tab stop with the handle role `button`: Space lifts it, and Enter opens an item that opens, lifting one that doesn't, and a disabled zone keeps only its openable items in the tab order. While an item is held, arrow keys step within its own zone — through a line list's slots, or on a geometric next-slot getter covering list, row, and grid (a fixed zone holds the item in its slot) — Space, Enter, or Tab drops, and Escape, focus leaving the item, or a press outside it cancels; focus returns to the item on drop. A cross-zone move and a carry are pointer-only, and a focusable descendant's keys are its own.

---

#### Pending

- **The CalendarPicker's day drag** stays on its own lifecycle; it belongs to the scrub family rather than the drag one.
- **Mobile readiness** — the sensor and collision layers keep it viable (displace items and the Table row grip opt out of native panning while whole-row line handles keep it, `pointercancel` tears a gesture down, collision math never bakes in hit-target sizes); a touch pass adds a press-delay on whole-row handles alongside the travel-distance activation.
