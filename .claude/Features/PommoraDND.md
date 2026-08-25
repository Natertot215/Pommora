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

Pommora's in-house drag-and-drop engine, owning the interaction layer the way MarkdownPM owns the editor. It has no drag dependency; it is scoped to a known reality — Chromium-only, React-only, a known set of surfaces — and adds what a general library leaves out: pointer capture, hysteresis, and a frame-accurate commit. Every draggable surface goes through it rather than reaching for a library of its own, which is what lets a drag feel the same wherever it starts.

### The Seam

**SOURCE:** `Pommora/src/renderer/src/DesignSystem/Interactions/gesture.ts` · `DesignSystem/Interactions/drag.tsx` · `Pommora/src/renderer/src/MarkdownPM/editor/EditorGesture.ts`

One gesture runs at a time. A press becomes a drag only once it travels far enough to mean one, and from that moment the gesture owns the pointer until it ends; Escape, a release outside the window, or the window losing focus all abandon it cleanly, and a surface that disappears mid-drag takes its gesture with it. A release that never traveled far enough is a click instead, and only an actual release counts, so one affordance can honestly do both jobs — a list glyph in the editor ticks a checkbox when pressed and moves the item when dragged. Scrub controls — a pane's resize edge, a slider, panning a photo, dragging a window by its chrome — respond from the instant of the press with no threshold, since there is no click to protect.

`drag.tsx` is the sort-engine seam:

- **`SortableZone`** — one sortable list: standalone by default (list, grid, table, each tree level), or a member of a `DragGroup` when passed `group`.
- **`DragGroup`** — a set of zones that hand items between each other, with a portal overlay.
- **`useDragItem(id)`** / **`useGroupedDragItem(id)`** — wire an item, returning the handle, the node ref, and the transform style.
- **`reorder(items, activeId, overId)`** — the array commit helper a zone's `onReorder` applies.

### Core Principles

- **One pointer sensor** handles mouse, trackpad, pen, and touch through Pointer Events; the single-zone engine binds to the dragged element under pointer capture, while the group and insertion-line surfaces bind on the window.
- **Measure once.** Item rects are frozen at drag start, collision runs against the frozen snapshot, the items array is never mutated mid-drag, and the reorder commits exactly once, on drop; a scroll or structural change invalidates the snapshot and the next move re-measures once.
- **Closest-center collision with hysteresis.** The over-slot is the nearest item center to the projected drag point, and switching slots must clear a small threshold, so a boundary never flickers.
- **One strategy-agnostic shift.** Displacement is a rects-reflow — each non-dragged item moves to the slot it will occupy — covering vertical lists, horizontal rows, and wrapping grids alike.
- **Decide, then animate.** On drop the accept-or-reject decision is made first, then one animation moves the item to its true resting slot, and the commit fires when that animation ends, never on a blind timer.

### Displacement

The first of the engine's two drop treatments: neighbors reflow to open the gap the item will land in. Two engines sit behind the seam for it, sharing types and the measure-once, decide-then-animate model. The **single-zone** engine (`engine.tsx`) serves lists, grids, tables, and each tree level, where the dragged item moves in place with its transform following the pointer. The **cross-list** engine (`group.tsx`) serves the Cards view: a `DragGroup` owns the one active drag across its zones, the lifted card renders as a fixed portal overlay under the cursor to escape column clipping, and every column shifts by one slot-pitch to show where the card would land.

### Insertion Line

The second treatment, for where the drop point has to be exact — the sidebar tree, a view's group bands, the editor's blocks. Nothing displaces: an Apple-style line marks the drop, the picked-up row stays muted in place, and a ghost follows the cursor through a portal. Each surface hit-tests a frozen geometry snapshot taken at activation — invalidated by any scroll or a mid-drag tree swap, then re-measured once on the next move — and derives its structure through a pure, unit-tested model that hands the caller one classified commit, a reorder or a reparent. In the sidebar that commit lands optimistically wherever a pure tree transform can express it;[^1] in the view bands it resolves through one shared patch held until the write returns, with a Set band's whole region reading as one nest-into target and a flat surface turning nesting off.[^2] The editor's block drag keeps its own lifecycle while wearing the same chrome.[^3]

### Autoscroll

One app-wide primitive drives every drag's edge-scroll (`Interactions/autoscroll.ts`): a singleton frame loop each drag source feeds, started at activation and stopped through the instance-scoped stopper it returns, so a bystander surface's teardown can't halt a live drag. The loop scrolls one fixed scroller resolved once at drag start — handed in by the caller, or found by an axis-aware walk to the nearest ancestor that scrolls in the needed axis — reads the last pointer point every frame so holding still at an edge keeps scrolling, and advances in pixels per second scaled by the frame delta, so the speed is identical at any refresh rate. Distance-based acceleration eases a run in from a floor toward a ceiling, and direction-intent withholds a direction until the pointer has left that edge band once, so grabbing an item already pinned at an edge doesn't rocket the container.

The tunables are custom properties declared at `:root`, overridable on any ancestor, and read once at drag start.

**SOURCE:** `Pommora/src/renderer/src/DesignSystem/Interactions/autoscroll.ts`

| Title | Token | Value |
| --- | --- | --- |
| Edge Band | `--autoscroll-edge` | `48px` |
| Speed | `--autoscroll-speed` | `840px` per second |
| Proximity Ramp | `--autoscroll-ramp` | `2` |
| Accel Start / Max / Distance | `--autoscroll-accel-start` / `-max` / `-distance` | `0.5` / `1.5` / `600px` |

### Constraints & Accessibility

- **Constraints and modifiers** — an `axis` lock, a `bounds` clamp, a `modifiers` escape hatch, `swap` mode (exchange active and over), and async drop rejection, where the item holds lifted in a `pending` state until the verdict resolves.
- **Announcements** — an assertive ARIA live region announces every product drag's pick-up and drop, pointer or keyboard, through the one `announce` primitive.
- **Keyboard** — Space or Enter lifts, arrow keys move on a geometric next-slot getter covering list, row, and grid, Space, Enter, or Tab drops, and Esc cancels; focus returns to the item on drop. Items are focusable, and the handle role is `button` by default, settable to `null` so table rows keep `<tr>` semantics.

---

#### Known Issues

- **A sub-perceptible snap at the commit** can show on a gap item under aggressive drag-then-drop, from in-flight transition timing and sub-pixel rounding. The `transitionend` commit mitigates it; the residual is accepted.
- **Keyboard access stops at the single-zone engine.** The cross-list engine and every insertion-line surface are pointer-only.

#### Pending

- **The CalendarPicker's range drag** stays on its own lifecycle; it belongs to the scrub family rather than the drag one.
- **Mobile readiness** — the sensor and collision layers keep it viable (draggables opt out of native panning, `pointercancel` tears a gesture down, collision math never bakes in hit-target sizes); a touch pass adds a press-delay alongside the travel-distance activation.

[^1]: [[InterfacePM]] §The Sidebar
[^2]: [[ViewTypesPM]] §Group Bands
[^3]: [[MarkdownPM]] §Block Structure
