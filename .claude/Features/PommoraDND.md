## PommoraDND


Pommora's in-house drag-and-drop engine, owning the interaction layer the way MarkdownPM owns the editor. It has no drag dependency; it is scoped to a known reality — Chromium-only, React-only, a known set of surfaces — and adds what a general library leaves out: pointer capture, hysteresis, and a frame-accurate commit. Every draggable surface goes through it rather than reaching for a library of its own, which is what lets a drag feel the same wherever it starts.

### The Seam

**SOURCE:** `UIX/Interactions/gesture.ts` · `UIX/Interactions/drag.tsx` · `Core/MarkdownPM/Gestures/editorGesture.ts`

One gesture runs at a time. A press becomes a drag only once it travels far enough to mean one, and from that moment the gesture owns the pointer until it ends; Escape, a release outside the window, or the window losing focus all abandon it cleanly, and a surface that disappears mid-drag takes its gesture with it. A release that never traveled far enough is a click instead, and only an actual release counts, so one affordance can honestly do both jobs — a list glyph in the editor ticks a checkbox when pressed and moves the item when dragged. Scrub controls — a pane's resize edge, a slider, panning a photo, dragging a window by its chrome — respond from the instant of the press with no threshold, since there is no click to protect.

`drag.tsx` is the sort-engine seam:

- **`SortableZone`** — one sortable list: standalone by default (a list, a row, a grid), or a member of the `DragGroup` above it. A zone given an `id` is addressable from the group's other zones and renders its own container, so an empty band is still a drop target. That container carries `--drag-floor`, the lifted item's height in its own px, while a drag is in flight.
- **`DragGroup`** — the engine and its zone registry: a set of zones that hand items between each other, reporting each landing as `(activeId, toZone, toIndex)`, with an optional portal overlay for the lifted item.
- **`useDragItem(id)`** — wires an item, returning the handle, the node ref, and the transform style.
- **`useDropSlot()`** — the box the lifted item would land in, for whoever paints it.
- **`reorder(items, activeId, overId)`** — the array commit helper a zone's `onReorder` applies.

### Core Principles

- **One pointer sensor** handles mouse, trackpad, pen, and touch through Pointer Events over the one gesture skeleton, which listens on the window and captures the pointer once a drag activates, so a sub-threshold tap keeps its click.
- **Measure once.** Item rects are frozen at drag start, collision runs against the frozen snapshot, the items array is never mutated mid-drag, and the reorder commits exactly once, on drop; a scroll or structural change invalidates the snapshot and the next move re-measures once.
- **Closest-center collision with hysteresis.** The over-slot is the nearest item center to the projected drag point, and switching slots must clear a small threshold, so a boundary never flickers.
- **One strategy-agnostic shift.** Displacement is a rects-reflow — each non-dragged item moves to the slot it will occupy — covering vertical lists, horizontal rows, and wrapping grids alike.
- **Decide, then animate.** On drop the accept-or-reject decision is made first, then one animation moves the item to its true resting slot, and the commit fires when that animation ends, never on a blind timer.

### Displacement

The first of the engine's two drop treatments: neighbors reflow to open the gap the item will land in. One engine (`engine.tsx`) serves lists, rows, grids, and the Cards view's bands. A lift freezes a zone's geometry as it is first entered and shifts it by its reference element's movement on scroll and disclosure, re-reading it once the drag-time floors have laid out and never re-measuring under the drag's own transforms. The over slot is the candidate center nearest the lifted item's projected center, with hysteresis; a foreign zone's candidates are its items plus one trailing cell walked past the last item along the grid's own columns. That cell wraps to a new row once the last row is full, so the trailing candidate measures at the nearer of it and the point just past the last item on its own row, and an item can land at a band's end, past the last card of a full row, or in an empty band. A `DragGroup`'s `resolveIndex` can refuse a slot, in which case the preview and the drop both fall back to the lifted slot. One placement rule moves every item: the zone's order without the lifted item, the lifted item spliced in at the over slot when this is the zone under it, and each item's transform the distance from its frozen rect to that cell, divided by the surface's own CSS zoom, which the engine reads off the lifted element. The lifted item moves in place with its transform following the pointer; a `DragGroup` given `renderOverlay` renders it instead as a fixed portal overlay under the cursor, which the Cards view uses so a card can leave a tile embed's scrolling body. The engine names the box the item will land in through `useDropSlot` — the size of the cell it lands in, and the lifted item's own past the last cell or in an empty zone — and the card chassis paints it as `CardDropSlot` in the one `.drop-slot` rect.

The tile grid's placement preview is a third treatment beside these two: a two-dimensional layout editor (`Core/Tiles/TileGrid.tsx`) that moves and resizes tiles by edge relations over its own computed geometry, sharing only the gesture skeleton and the `.drop-slot` chrome.

### Insertion Line

The second treatment, for where the drop point has to be exact — the sidebar tree, a view's group bands, the editor's blocks. Nothing displaces: an Apple-style line marks the drop, the picked-up row stays muted in place, and a ghost follows the cursor through a portal. One frame owns the lifecycle (`UIX/Interactions/insertionDrag.tsx`): point tracking, the frozen geometry snapshot and its invalidations — any scroll, a mid-drag list change, a sprung-open disclosure — autoscroll, the line and ghost chrome, and the announcements, over the pointer-gesture skeleton. The band and row surfaces divide their geometry by the rendered zoom the one `currentZoom` reader returns, the same reader the engine's lift uses, so their lines land in a zoomed host's own px. Each surface passes only its drop model: how to measure, how a point becomes a slot (null declines — a noop drop draws no line and commits nothing), what a slot commits, and its wording; the models stay pure and unit-tested, handing the caller one classified commit, a reorder or a reparent. In the sidebar that commit lands optimistically wherever a pure tree transform can express it; in the view bands it resolves through one shared patch held until the write returns, with a Set band's whole region reading as one nest-into target and a flat surface turning nesting off. The editor's block drag keeps its own lifecycle while wearing the same chrome.

### Autoscroll

One app-wide primitive drives every drag's edge-scroll (`UIX/Interactions/autoscroll.ts`): a singleton frame loop each drag source feeds, started at activation and stopped through the instance-scoped stopper it returns, so a bystander surface's teardown can't halt a live drag. The loop scrolls one fixed scroller resolved once at drag start — handed in by the caller, or found by an axis-aware walk to the nearest ancestor that scrolls in the needed axis — reads the last pointer point every frame so holding still at an edge keeps scrolling, and advances in pixels per second scaled by the frame delta, so the speed is identical at any refresh rate. Distance-based acceleration eases a run in from a floor toward a ceiling, and direction-intent withholds a direction until the pointer has left that edge band once, so grabbing an item already pinned at an edge doesn't rocket the container.

The tunables are custom properties declared at `:root`, overridable on any ancestor, and read once at drag start.

**SOURCE:** `UIX/Interactions/autoscroll.ts`

| Title | Token | Value |
| --- | --- | --- |
| Edge Band | `--autoscroll-edge` | `48px` |
| Speed | `--autoscroll-speed` | `840px` per second |
| Proximity Ramp | `--autoscroll-ramp` | `2` |
| Accel Start / Max / Distance | `--autoscroll-accel-start` / `-max` / `-distance` | `0.5` / `1.5` / `600px` |

### Constraints & Accessibility

- **Constraints** — an `axis` lock per zone, a `resolveIndex` veto on the group that refuses a landing slot outside the dragged item's run, and a press that begins on an interactive descendant (a button, a field, a value chip marked `data-drag-slop`) needs 12px of travel to lift, so a tap-wobble opens the control instead.
- **Announcements** — an assertive ARIA live region announces every product drag's pick-up and drop, pointer or keyboard, through the one `announce` primitive.
- **Keyboard** — Space or Enter on the item lifts, arrow keys move within the item's own zone on a geometric next-slot getter covering list, row, and grid, Space, Enter, or Tab drops, and Esc cancels; focus returns to the item on drop. Items are focusable and the handle role is `button`; a focusable descendant's keys are its own.

---

#### Known Issues

- **A sub-perceptible snap at the commit** can show on a gap item under aggressive drag-then-drop, from in-flight transition timing and sub-pixel rounding. The `transitionend` commit mitigates it; the residual is accepted.
- **Keyboard access stops at the zone.** A cross-zone move and every insertion-line surface are pointer-only.

#### Pending

- **The CalendarPicker's range drag** stays on its own lifecycle; it belongs to the scrub family rather than the drag one.
- **Mobile readiness** — the sensor and collision layers keep it viable (draggables opt out of native panning, `pointercancel` tears a gesture down, collision math never bakes in hit-target sizes); a touch pass adds a press-delay alongside the travel-distance activation.
