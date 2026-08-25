## PommoraDND

```
PommoraDND
├── The Seam
├── Core Principles
├── Displacement
├── Insertion Line
├── Autoscroll
├── Constraints & Accessibility
├── Known Issues
└── Pending
```

Pommora's in-house drag-and-drop engine, owning the interaction layer the way MarkdownPM owns the editor layer. It replaces `@dnd-kit/*` outright — no dependency, no import — dropping the generality Pommora doesn't need (the framework-agnostic core, the sensor and collision-strategy registries, the modifier pipeline, SSR guards, continuous re-measuring) and adding pointer capture, hysteresis, and a frame-accurate commit. It lives behind a thin seam, scoped to a known reality: Chromium-only, React-only, a known set of surfaces.

### The Seam

**SOURCE:** `Pommora/src/renderer/src/DesignSystem/Interactions/gesture.ts` · `interactions/drag.tsx` · `Pommora/src/renderer/src/MarkdownPM/editor/EditorGesture.ts`

Every draggable surface in Pommora goes through this layer rather than reaching for a drag library itself, which is what lets a drag feel the same wherever it starts.

One gesture runs at a time. A press becomes a drag only once it travels far enough to mean one, and from that moment the gesture owns the pointer until it ends. It can always be called off — pressing Escape, releasing outside the window, or the window losing focus all abandon it cleanly, and a surface that disappears mid-drag takes its own gesture with it rather than leaving one running against nothing.

**A press can carry two meanings.** A release that never traveled far enough to be a drag is treated as a click instead, and only an actual release counts: a gesture that was called off never fires the click. This is what lets one affordance do both jobs honestly — a list glyph in the editor ticks a checkbox when pressed and moves the item when dragged, and a heading's grip folds its section the same way.

Two kinds of pointer work live here. **Drags** move something from one place to another, and carry the full lifecycle above. **Scrub controls** — a pane's resize edge, a slider, panning a photo, dragging a window by its chrome — respond from the instant of the press, with no threshold to cross, since there is no click meaning to protect.

**`DesignSystem/Interactions/drag.tsx`** is the sort-engine seam:

- **`SortableZone`** — one sortable list. Standalone by default (list, grid, table, each tree level); pass `group` to make it a member of a `DragGroup` (cross-list).
- **`DragGroup`** — a set of zones that hand items between each other (the board), with a portal overlay.
- **`useDragItem(id)`** — wires a standalone item, returning the handle, the node ref, and the transform style.
- **`useGroupedDragItem(id)`** — wires a `DragGroup` member item.
- **`reorder(items, activeId, overId)`** — the array commit helper a zone's `onReorder` applies.

### Core Principles

- **One pointer sensor.** A single Pointer-Events sensor handles mouse, trackpad, pen, and touch. The single-zone engine binds move/up/cancel to the dragged element under `setPointerCapture`; the board and the insertion-line surfaces bind the same trio on the window instead — capture would retarget a no-move tap's click onto the handle, and a mid-drag remount silently drops element-hosted listeners.
- **Measure once, no array churn.** Item rects are measured at drag start and frozen for the drag; collision runs against the frozen snapshot, the items array is never mutated mid-drag, and the reorder commits exactly once, on drop. This holds for every surface, engine-backed or bespoke — a scroll or a structural change invalidates the snapshot, and the next move re-measures once, coalescing an event burst into one read.
- **Closest-center collision with hysteresis.** The over-slot is the nearest item center to the projected drag point, with DOM order breaking ties. Switching slots must clear a small pixel threshold, so a slot boundary doesn't flicker between two positions.
- **One strategy-agnostic shift.** Displacement is a rects-reflow: each non-dragged item moves to the slot it will occupy after the reorder. The same math covers vertical lists, horizontal rows, and 2-D wrapping grids.
- **Decide, then animate.** On drop the accept/reject decision is made first, then a single animation moves the item to its true resting slot — the gap if accepted, its origin if rejected. The commit fires when that animation actually ends, never on a blind timer.

### Displacement

**Displacement** is one of the system's two permanent drop treatments: neighbors reflow to open the gap the item will land in. Two engines sit behind the seam for it, sharing types and the measure-once / decide-then-animate model:

- **Single-zone** (`engine.tsx`) — list, grid, table, and each tree level. The dragged item moves in place, its transform following the pointer, and neighbors shift to open the gap. Used where the surface isn't clipped.
- **Cross-list** (`group.tsx`) — the board. A `DragGroup` owns the one active drag across its zones. The lifted card is hidden in its source column and rendered as a fixed portal overlay under the cursor, escaping any column clipping; every column shifts its items by one slot-pitch to show where the card would land.

### Insertion Line

The second permanent treatment. Where the drop point has to be exact — a tree, a table's group headers — nothing displaces: an Apple-style **line** marks the drop, the picked-up row stays muted in place, and a ghost rides the cursor, rendered through a portal to escape the glass `backdrop-filter` containing block that would otherwise capture a `fixed` element.

**The sidebar tree.** Every entity is draggable and reorders within its parent heading, and pages and Sets also reparent across their containers. It hit-tests a frozen geometry snapshot taken at drag activation — invalidated by any scroll or a mid-drag tree swap, then lazily re-measured once on the next move — and derives all structure from the tree through a pure, unit-tested model. A drop resolves to one commit, routed to its store or IPC action. That commit lands optimistically wherever a pure tree transform can express it — a reparent, a top-level reorder, a registry reorder — while a reorder within the same parent waits for main's confirming push.

**The view bands.** The same treatment extends to a view's group headers, table and cards alike: the glyph is the drag surface, the line and portal ghost are the chrome, a Set band's whole region — header past its top zone plus its data rows — reads as one continuous nest-into highlight, cycle-guarded, and all slot, parent, and order math lives in a pure, unit-tested model. A drop hands the caller a classified commit — reorder or reparent — and the two orders every view writes resolve through one shared patch, held optimistically until the write returns. A surface rendering one flat level turns nesting off, and every drop there resolves to a reorder rather than promising a depth it can't draw. The band list is snapshot state alongside the geometry; a mid-drag tree swap invalidates both, and they re-measure as one.

### Autoscroll

One app-wide primitive drives every drag's edge-scroll: a singleton rAF loop each drag source feeds. A drag starts it at activation and stops it through the instance-scoped stopper it returns, so a bystander surface's teardown can't halt a live drag. The loop scrolls one fixed scroller resolved once at drag start — handed in by the caller, or found by an axis-aware walk to the nearest ancestor that scrolls in the needed axis (a vertical table drag skips the x-only table shell to reach the detail scroller). An explicit scroller lets a drag fold the scroll delta into its own pointer math, or scroll a container the walk can't derive.

The loop reads the last pointer point every frame, so holding still at an edge keeps scrolling; it ramps by edge proximity and advances the scroller in pixels-per-second scaled by the frame delta, with sub-pixel accumulation, so the speed is identical at any refresh rate. Two feel behaviors ride on top: **distance-based acceleration** eases a scroll run in from a non-zero floor and climbs toward a ceiling with the distance it has covered, resetting when the pointer leaves the edge band, and **direction-intent** withholds a direction until the pointer has left that edge band once, so grabbing an item already pinned at an edge doesn't rocket the container. The tunables are tokens read off the drag element once at drag start and cached; a surface overrides any of them by setting the var on itself or an ancestor.[^1]

### Constraints & Accessibility

- **Constraints and modifiers** — `axis` lock, `bounds` clamp, a `modifiers` escape hatch, `swap` mode (exchange active and over), and async drop rejection, where the item holds lifted in the `pending` state until the verdict resolves.
- **Screen-reader announcements are drag-wide** — an assertive ARIA live region announces every product drag's pick-up and drop, pointer or keyboard, engine or insertion-line, through the one `announce` primitive.
- **Keyboard** — Space/Enter lifts, arrow keys move on a geometric next-slot getter covering list, row, and grid, Space/Enter/Tab drops, Esc cancels; focus is restored to the item on drop, and the keyboard path adds position detail to its announcements. Items are focusable; the handle role is `button` by default, settable to `null` so table rows keep `<tr>` semantics.

### Known Issues

- **A sub-perceptible snap at the commit** can show on a gap item under aggressive drag-then-drop, from in-flight transition timing and sub-pixel rounding between the transform end-position and the natural post-reorder slot. The `transitionend` commit mitigates it; the residual is accepted as inconsequential.
- **Keyboard access stops at the single-zone engine.** The cross-list board and every insertion-line surface are pointer-only — Esc aborts a live drag, but nothing lifts from the keyboard.

### Pending

- **The CalendarPicker's range drag** stays on its own lifecycle. It belongs to the scrub family rather than the drag one — a press on a selected endpoint re-places it live with no activation threshold at all — so `onTap` is not what it is waiting on.
- **Mobile readiness** — a spec a future touch pass holds to. The sensor and collision layers keep it viable: draggables opt out of native panning with `touch-action: none`, `pointercancel` tears a gesture down cleanly, the keyboard sensor stays separable, and collision math never bakes in hit-target sizes. The pass adds a press-delay alongside the travel-distance activation and a non-passive `touchmove` hedge.

[^1]: [[InteractionPM]] §Autoscroll Tuning
