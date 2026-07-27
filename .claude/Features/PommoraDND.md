## PommoraDND

Pommora's drag-and-drop is an **in-house engine, PommoraDND**, built to replace `@dnd-kit/*`. It owns the interaction layer the way `MarkdownPM` owns the editor layer — leaning on the external library first to learn the problem, then rebuilding a leaner equivalent scoped to our reality (Chromium-only via Electron, React-only, a known set of surfaces). It lives behind a **thin seam** so the engine is swappable without touching callers. This doc is the durable spec of the system.

### The Seam

Surfaces import only from the interaction layer's **two shared entry points** — never from a drag library directly. That boundary is what lets the internals be replaced without touching callers.

**`design-system/interactions/gesture.ts`** is the raw-pointer primitive under the insertion-line surfaces: `beginPointerGesture` owns the pending→active activation gate, the window listener set, pointer capture, Esc cancel (optionally swallowed so a parent pane doesn't also dismiss), teardown, and a per-gesture abort handle. Exactly one gesture can be live at a time — a begin while one is live is refused. Surfaces wire it through **`usePointerGesture()`**, which owns each consumer's side of the ritual — the live handle, the unmount abort, and the refusal rule (a refused begin never overwrites the live gesture's handle) — and returns whether the gesture started. Its consumers are the table's row drag, the band drag, the settings panes' two-region reorder (Properties, Hidden, View), and the grouping-list reorder. Adoption is partial: the sidebar tree, the option and status reorders, and the table's column drag each still hand-roll the same skeleton.

**`design-system/interactions/drag.tsx`** is the sort-engine seam:

- **`SortableZone`** — one sortable list. Standalone by default (list, grid, table, each tree level); pass `group` to make it a member of a `DragGroup` (cross-list).
- **`DragGroup`** — a set of zones that hand items between each other (the board), with a portal overlay.
- **`useDragItem(id)`** — wires a standalone item; spread the returned `handle` on the drag surface, `setNodeRef` on the element, `style` for the transform.
- **`useGroupedDragItem(id)`** — wires a `DragGroup` member item.
- **`reorder(items, activeId, overId)`** — the array commit helper a zone's `onReorder` applies.

`layout` (`'list' | 'grid' | 'table'`) is informational only — the engine is geometry-driven, so one displacement model serves all three.

### Core Principles

The engine's behavior is defined by a few load-bearing decisions, each chosen against how dnd-kit does it:

- **One pointer sensor.** A single Pointer-Events sensor handles mouse, trackpad, pen, and touch — there is no mouse/touch sensor split. The single-zone engine binds move/up/cancel to the dragged element under `setPointerCapture`; the board and the insertion-line surfaces bind the same trio on the window instead, deliberately — capture would retarget a no-move tap's click onto the handle, and a mid-drag remount silently drops element-hosted listeners.

- **Measure once, no array churn.** Item rects are measured at drag start (per zone, on first entry for cross-list) and frozen for the drag; collision runs against the frozen snapshot, the items array is never mutated mid-drag, and the reorder commits exactly once, on drop. This holds for every surface, engine-backed or bespoke: **layout is read at activation, never per move** — a scroll or a structural change invalidates the snapshot, and the next move re-measures once, coalescing an event burst into one read.

- **Closest-center collision with hysteresis.** The over-slot is the nearest item center to the projected drag point, with DOM order breaking ties. Switching slots must clear a small pixel threshold, so a slot boundary doesn't flicker between two positions.

- **One strategy-agnostic shift.** Displacement is a rects-reflow: each non-dragged item moves to the slot it will occupy after the reorder. The same math covers vertical lists, horizontal rows, and 2-D wrapping grids — there is no per-layout strategy registry.

- **Decide, then animate.** On drop the accept/reject decision is made *first*, then a single animation moves the item to its true resting slot (the gap if accepted, its origin if rejected). The commit fires when that animation actually ends (`transitionend`, with a fallback timer), not on a blind timer — so items never settle and then snap, and a rejected drop can't animate into the gap and bounce back.

### Displacement — Single-Zone and Cross-List

**Displacement** is one of the system's two permanent drop treatments: neighbors reflow to open the gap the item will land in. Two engines sit behind the seam for it, sharing types and the measure-once / decide-then-animate model:

- **Single-zone** (`engine.tsx`) — list, grid, table, and each tree level. The dragged item moves **in place** (transform follows the pointer); neighbors shift to open the gap. Used where the surface isn't clipped.

- **Cross-list** (`group.tsx`) — the board. A `DragGroup` owns the one active drag across its zones. The lifted card is hidden in its source column and rendered as a `position: fixed` **portal overlay** under the cursor (escaping any column clipping); every column shifts its items by one slot-pitch to show where the card would land. The move commits once via `onCommit(activeId, toZone, toIndex)`, and because columns are never mutated mid-drag there is no duplicate-card race to guard against.

### Insertion Line — Trees and Bands

The second treatment, and a permanent peer of the sort engines rather than a way-station on the road to them. Where the drop point has to be *exact* — a tree, a table's group headers — nothing displaces: an Apple-style **line** marks the drop, the picked-up row stays **muted in place**, and a ghost rides the cursor, rendered through a portal to escape the glass `backdrop-filter` containing block that would otherwise capture a `fixed` element.

**The sidebar tree.** **Every entity is draggable and reorders within its parent heading** — pages (within a folder; also reparent across folders), Sets (within a collection; also move across collections), top-level Collections, Context groups (reordering the registry itself), and Spaces within their group. It hit-tests a **frozen geometry snapshot** taken at drag activation — invalidated by any scroll or a mid-drag tree swap, then lazily re-measured once on the next move — and derives all structure (kinds, paths, depths, parent, each parent's ordered child ids + the top-level groups) from the tree through a pure, unit-tested model (`Sidebar/sidebarDndModel.ts`). A drop resolves to one **commit**, routed to its store/IPC action: `movePage` (page move + `page_order`), `moveSet` (a set move/reorder), `reorderTop` (`collection_order` in `.nexus/state.json`), or the registry pair `reorderContexts` / `reorderSpaces` (registry array order / `space_orders` in state.json). A commit lands **optimistically** wherever a pure tree transform can express it (`treeMove.ts`) — a reparent, a top-level reorder, a registry reorder — so the row appears in its new home the moment the write returns; a reorder within the same parent waits for the confirming re-walk. Either way the watcher's self-write suppression keeps the whole op to exactly one walk (→ [[Architecture]] § File-watcher).

**The table bands.** `Table/bandDnd.tsx` extends the same treatment to the table's group headers: the **glyph** is the drag surface (the chevron and hover "+" isolate on pointerdown), the line + portal ghost are the chrome, a Set band's WHOLE region — header past its top zone plus its data rows — reads as one continuous **nest-into** highlight (cycle-guarded; root append lives past the measured content bottom), and all slot/parent/order math lives in a pure, unit-tested model (`Table/bandDndModel.ts`). A drop hands the caller a *classified* commit — reorder vs reparent, routed by the slot's implied parent against the dragged band's current parent — so the view never re-derives it. Its snapshot extends the measurement discipline one step: **the band list is snapshot state too** — a mid-drag tree swap goes stale together with the geometry, so both invalidate and re-measure as one.

### Verification Harness

The **Interaction Lab** (`design-system/interactions/`, served via `npm run showcase` → `interactions.html`) exercises every surface — list, grid, table, recursive tree, cross-list board, plus the constraint options and an autoscroll surface — with a live "feel" control (duration + easing) shared across all of them. It is the design-system verification surface, **separate from the app**, but not ahead of it: the app consumes the seam directly on the tab strips, the sidebar ribbon, the nav gallery, the icon favorites, the view pills, and the cards board.

### Relationship to dnd-kit

`@dnd-kit/*` is gone from the tree — no dependency, no import. PommoraDND is **not** a 1:1 port: it deliberately drops generality we don't need (the framework-agnostic core, three input sensors, four collision strategies, the modifier pipeline, SSR guards, continuous re-measuring) and adds improvements dnd-kit lacks (pointer capture, hysteresis, no mid-drag array churn, a frame-accurate commit).

`shared.ts` holds only what every surface genuinely shares — the drag types, the tuning constants, the click suppressor, the box helpers. The two engines' drag-state and commit machinery stay separate: they model genuinely different interactions (in-place transform vs portal overlay), so only the primitives are hoisted.

### Constraints & Accessibility

Each is an inline option or an automatic behavior, exercised in the Lab:

- **Constraints & modifiers** — `axis` lock, `bounds` clamp (window / list-extent), a `modifiers` escape hatch, `swap` mode (exchange active+over, commit with `arraySwap`), and **async drop rejection** (`canReorder` may return a `Promise`; the item holds lifted in the `pending` state until the verdict resolves). The Constraints Lab surface toggles each.

- **Keyboard + screen-reader** (`keyboard.ts`, `a11y.ts`) — Space/Enter lifts, arrow keys move (a geometric next-slot getter that covers list, row, and grid), Space/Enter/Tab drops, Esc cancels; an assertive ARIA live region announces pick-up/move/drop/cancel with position, a hidden instructions element is wired via `aria-describedby`, and focus is restored to the item on drop. Items are focusable; the handle role is `button` by default, settable to `null` so table rows keep `<tr>` semantics.

Keyboard access stops at the single-zone engine. The cross-list board — and with it the cards grid — plus every insertion-line surface are pointer-only: Esc aborts a live drag, but nothing lifts from the keyboard.

#### II. Autoscroll

One app-wide primitive drives every drag's edge-scroll — `interactions/autoscroll.ts`, a **singleton rAF loop** each drag source feeds. A drag calls `startAutoScroll` at activation and stops via the **instance-scoped stopper** it returns (so a bystander surface's teardown can't halt a live drag); the loop scrolls **one fixed scroller resolved once at drag start** — handed in by the caller, or found by the **axis-aware `findScroller`** walk to the nearest ancestor that scrolls in the needed axis. Axis-awareness is load-bearing — a vertical table drag must skip the x-only table shell to reach the detail scroller — and an explicit scroller is what lets a drag fold the scroll delta into its own pointer math, or scroll a container the walk can't derive (the CM editor's `scrollDOM`).

The loop reads the last pointer point every frame — so holding still at an edge keeps scrolling, the whole reason a loop owns the scroll rather than the pointer-move — ramps by edge proximity, and advances the scroller in **pixels-per-second × frame-delta** with sub-pixel accumulation, so the speed is identical on 60 Hz and ProMotion. Two feel behaviors ride on top: **distance-based acceleration** eases a scroll run in from a floor and climbs it to a ceiling with the *distance it has covered* (a longer drag-scroll goes slightly faster; the run resets when the pointer leaves the edge band, and the floor is deliberately non-zero — at zero the loop would scroll nothing, accumulate no distance, and stall), and **direction-intent** withholds a direction until the pointer has left that edge band once, so grabbing an item already pinned at an edge doesn't rocket the container. The tunables — edge band, base speed, proximity-ramp exponent, and the acceleration floor / ceiling / distance — are tokens in `interactions/autoscroll.css`, read off the **drag element** once at drag start and cached; a surface overrides any of them by setting the var on itself or an ancestor.

The module **owns a termination backstop** (blur / visibilitychange / pointercancel) that stops the *loop only* — each surface still aborts its own gesture — so a focus-steal can't strand a running loop, and a single frame's delta is clamped so an rAF stall can't teleport the scroll.

Every drag that edge-scrolls feeds this one loop, and no surface re-implements it. Not every drag is wired to it: the MarkdownPM list drag, the table's column reorder, the GFM-table drag, and the grouping pane are outstanding.

### Mobile-Readiness (Prospective)

Pommora is desktop-first, and this is a spec a future touch pass must hold to — not a record of what ships. The sensor and collision layers already keep it viable: draggables opt out of native panning with `touch-action: none`, `pointercancel` tears a gesture down cleanly, the keyboard sensor stays separable, and collision math never bakes in hit-target sizes. The pass itself has to add what the pointer layer doesn't carry — a press-delay alongside the travel-distance activation, and a non-passive `touchmove` hedge.

### Known Minor Issue

Under aggressive drag-then-drop, one or two gap items can show a sub-perceptible snap at the commit (in-flight transition timing + sub-pixel rounding between the transform end-position and the natural post-reorder slot). Mitigated via the `transitionend` commit; the residual is only visible to someone deliberately trying to reproduce it, and is accepted as inconsequential.
