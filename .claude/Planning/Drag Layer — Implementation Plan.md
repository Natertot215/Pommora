## Drag Layer — Implementation Plan

> **Status:** ratified 08-09 (review round 1 folded: citation pass + build-breaking attack) — awaiting execution; no phase opened · Spec: none as file — the tier scope ratified in-session (08-09), recorded whole in Goal + Requirements · Execute tasks in order.
> Citations name files and symbols; re-derive before editing.

**Goal**

Every drag in Pommora runs on one hardened gesture lifecycle, every mid-drag scroll re-aims correctly, every drag inside a scroller can reach past its fold, no invariant-derived geometry is rebuilt per pointer event, a cancelled gesture reverts everything it previewed, a collapsed drop target springs open under a dwelling drag, every product drag announces itself, and the layer's chrome, snapshot discipline, and constants each have exactly one owner. At the end, a census grep enumerates the hand-rolled lifecycles that remain and every one of them is a documented deliberate — a fresh reader finds architecture, not archaeology. **Done means session-clearable:** every requirement landed, every review finding fixed or ruled, every touched doc true, the history entry written, the standing records updated, and nothing owed that lives only in this plan.

The shape is **adoption plus deletion**: the shared toolkit (`gesture.ts`, `autoscroll.ts`, `a11y.ts`, `dragDisclose.ts`, `DragGhost`, the `table-drop-line` chrome) already exists and is good; nearly every task retires a private re-derivation onto it. Two small modules are created (`snapshot.ts`, and nothing else — the region-scan hoist lands inside an existing model file). The one boundary this plan *defines* rather than erases: the layer has **two lifecycle families**. Window-listener **drags** (threshold-gated, Escape-abortable, teardown-owning) belong on the skeleton; element-capture **scrub controls** (pane-edge resizes, the slider, the photo pan — immediate response on press, self-cleaning under pointer capture with `pointercancel`/`lostpointercapture` handled) are a deliberate second family and stay element-bound. The alternative — one skeleton swallowing both families via an immediate-activation mode — was weighed and rejected: only the Slider would use it, and its actual defect is a three-line missing-cancel fix (YAGNI; the reachability razor cuts the capability, not the fix).

Alternatives weighed at scoping: the retired plan's shared slot resolver (`slotAtY`) is deliberately **not** built — its own attack review showed the Y-only signature foreclosing the sidebar's horizontal-aim prospect, and the per-surface slot math is genuine domain geometry (tree depth, sticky spans, 2-D rows). The only scan merge made is the one verbatim copy (`hiddenPaneModel`). Identity stamping and order persistence (the reorder snap-back) are a separate ruled-out arc and no task here touches them.

**Requirements**

1. A gesture whose callback throws tears itself down: no half-activated drop can commit, and a throwing teardown cannot wedge the module-level gesture lock.
2. A drag surface unmounting mid-drag leaves no listener behind — remove-by-stored-identity, never remove-by-closure-identity.
3. The four window-listener drag lifecycles that hand-roll the skeleton — `sidebarDnd`, `useOptionReorder`, `useStatusReorder`, the data-table column drag — consume `usePointerGesture`, plus the column-width grip resize (whose sibling precedent is already on the skeleton).
4. A mid-drag scroll can never aim a drop at a stale slot: `groupingDnd` and the GFM table drag gain invalidation; `tableDnd` gains the props-change invalidation its siblings carry.
5. A cancelled scrub control reverts: the Slider's `pointercancel` restores the pre-drag value; the grip resize's cancel reverts the width instead of committing it.
6. No invariant-derived geometry is rebuilt per pointer event: `group.tsx` caches its row model and slot math against the frozen rects' identity; the sidebar snapshots its sibling set at measure time; the sidebar's two layers share one tree-keyed index.
7. One owner each for: the measure-once snapshot pattern, the floating ghost, the insertion-line chrome, the two-region scan, the ghost cursor offset, and the editable-target guard's core selector.
8. Every drag inside a scrollable region edge-scrolls: option reorder, status reorder, the grouping pane, the data-table column drag (x-axis), and the GFM table drag.
9. Every product insertion-line drag announces pickup and drop, and the single-zone engine's pointer path announces the way its keyboard path already does.
10. Spring-open works wherever a collapsed container is a drop target: the band drag, the grouping hierarchy, and the sidebar tree.
11. The documentation is true at close: `PommoraDND.md` states the two-family boundary and full adoption; `ContextPM.md`'s flagged drag notes are gone.

**Acceptance — the whole thing working**

On the running app against a scratch nexus: a drag on each migrated surface survives a mid-drag wheel scroll with the line tracking the moved rows and Escape aborting cleanly; switching sidebar modes mid-drag strands nothing (proven by the listener-identity test, red against today's code); a Select property with more options than its pane shows edge-scrolls to an off-screen slot and commits there; dwelling a dragged page over a collapsed Collection springs it open; and the closing census returns exactly the documented-deliberate hand-rolled set with the full suite green and lint at zero.

**Forced By**

- `gesture.ts` holds one module-level `live`, sets `g.active = true` *before* calling `onActivate`, and `detach` runs `teardown` before `live = null` → a throwing activation leaves listeners armed and the release commits a never-set-up drop; a throwing teardown wedges every future drag. Hardening precedes migration because exposure scales with consumers.
- The leak class is one shape in three files: `markSnapshotDirty`/`markDirty` is re-created per render, added from the drag-render's closure, removed by the unmount effect's mount-render closure — same count, wrong identity. The four pointer listeners are immune (removed via the stored handlers ref). A skeleton consumer cannot express this bug: add and remove live in one spec object.
- `Sidebar.tsx` mounts `SidebarDnd` twice (contexts and collections layers) and the mode cross-fade holds both mounted → unmount-during-drag is reachable, and each instance builds a full-tree `buildIndex` while rendering one half.
- `groupingDnd.tsx` contains zero event listeners and its lists live inside `gp.middle` (`MIDDLE_MAX_HEIGHT` KNOB, `overflowY: auto`) → a mid-drag wheel makes `bandSlot` resolve a wrong `beforeId`/`nestInto` — a wrong-target *commit*. Fixed first, standalone, because it is the one live wrong-write in the plan.
- `startPointerDrag` (SurfacePM) and the window-chrome/scrub controls handle `pointercancel` and `lostpointercapture` themselves and are element-capture by design → they are a family, not debt; the plan documents the boundary instead of migrating them.
- The Slider's press must change the value before any movement and its release-without-move must commit → it structurally cannot ride a first-move-activated skeleton; its defect is only the missing cancel path.
- `MarkdownPM/Tables/TableView.tsx` already runs both its reorder and its boundary resize on the skeleton → the Detail grip resize migrates to match its sibling, not onto a new pattern.
- `group.tsx`'s scroll path replaces each zone's frozen rects array wholesale → the row model caches against the array's identity and invalidates for free. `cellAt`'s column model has a **second input with its own writers** — `zoneWidth` reads `bounds`, rewritten by `measureBounds` at activation, on band-entry, and on disclose-remeasure without touching `frozen` — so its cache key carries the width too.
- Keyboard drag stops at the single-zone engine (documented policy) → announce-only for the insertion-line surfaces; `ensureInstructions` stays engine-only.

**Inherited Reasoning**

- The retired 08-09 plan's Phase 1 (identity, `persistable`, order writes, `movePage` optimistic patch) was ruled a separate concern in `d6406a54`'s commit message. Do not resurrect any of it here; the reorder snap-back will still be visible after this plan lands and that is expected.
- The retired plan's Task 6b (per-layer index narrowing) is rejected: a scoped index that drops a parent silently breaks the depth derivation. The shared-memo shape (one `buildIndex` for both layers) achieves the perf win with no behavior surface.
- `listDrag`/`blockDrag` and `CalendarPicker`'s range drag stay off the skeleton — all three are click-or-drag surfaces blocked on an `onTap` callback fired on sub-threshold release. `onTap` lands with the migration that consumes it, not before.
- `useOptionReorder` and `useStatusReorder` are *not* merged with each other: one is flat, one partitions every Y into exactly one group including empty ones. They share the lifecycle, never the drop model.
- The five stay-hand-rolled gesture owners are documented deliberates: `engine.tsx` (two input sources on one drag record), `group.tsx` (blur abort, no-capture policy, settle-commit machinery), `SurfacePM/sensors/pointerDrag.ts` (rAF coalescing, lost-capture abort), the window chrome (`SidePane`, `FloatingWindow`, `TabBar`), and the scrub controls (`App.tsx` edge resizes, `Slider`, `PhotoCropModal`).
- `feel.tsx`'s adopt-or-delete decision stays sequenced after, as before.

**Grounding** *(re-open these; don't cite them)*

- `design-system/interactions/gesture.ts` — the skeleton whole; the two hardening flaws; the absent pointer-id filter.
- `Sidebar/sidebarDnd.tsx` + `sidebarDndModel.ts` — the largest hand-roll; `computeTarget`'s kind dispatch; the per-move sibling filter; the inline ghost and line literals.
- `Components/Detail/paneDnd.tsx` — the migration precedent: scroll listener and autoscroll in `onActivate`, symmetric `teardown`, `swallowActiveEscape`.
- `Components/Detail/useOptionReorder.ts` / `useStatusReorder.ts` — the two smaller hand-rolls; the verbatim capture-phase Escape; the shared leak shape.
- `Detail/Views/Table/TableView.tsx` — `startColumnDrag` (hand-rolled, no Escape, no unmount abort, capture before threshold) and the width-grip resize (element listeners; cancel commits).
- `Detail/Views/Table/tableDnd.tsx` / `bandDnd.tsx` — skeleton consumers; `bandDnd`'s inline ghost; `tableDnd`'s missing props-dirty effect; the `beginDragDisclose` bracket precedent.
- `Components/Detail/groupingDnd.tsx` — the no-invalidation surface; measures once in `onActivate`.
- `MarkdownPM/Tables/TableView.tsx` — `startDrag`/`startResize` on the skeleton; the frozen `origin`.
- `design-system/interactions/{autoscroll,a11y,dragDisclose,shared}.ts`, `Components/Detail/DragGhost.tsx`, `Detail/Views/Table/Table.css` (`.table-drop-line`, `.band-drag-ghost`), `design-system/tokens/theme-vars.css.ts` (`--drag-line`, `--drop-line-thickness`, `--drop-dot-size`) — the services and chrome being adopted.
- `Detail/Views/GroupBand.tsx` — the disclose registrar pattern (`rowRef` + `toggleRef` + `data-disclose`).
- `Components/Detail/paneDndModel.ts` / `hiddenPaneModel.ts` — the verbatim scan pair.
- `design-system/interactions/group.tsx` — `rowsOf`, `cellAt`, `indexAt`, `trackAt`, `itemState`; the wholesale rects replacement in `onScroll`.
- `.claude/Guidelines/Design-Sources.md` · `.claude/Features/PommoraDND.md`.

**Environment**

| Slot | Resolved as |
| --- | --- |
| Plan directory | `.claude/Planning/` — house convention `<Topic> — Implementation Plan.md` |
| Spec input | None as file. The in-session tier ratification (08-09), four read-only survey reports, and every load-bearing claim re-verified firsthand against the code. |
| Explorer agent | `Explore` / `general-purpose` (four already dispatched, read-only) |
| Research agent | Not needed — no external research in scope |
| Code reviewer | `/code-review` at phase gates |
| Attack reviewer | `build-breaking-agent` (designated in StudioMD) |
| Neutral verifier | `general-purpose`, handed the Delivery Claim, the Requirements, and the commit range only |
| Simplification pass | `code-simplifier`, then `comment-killer-agent` (designated in StudioMD) |
| Gate commands | From `Pommora/package.json`, run in `Pommora/`: `npm run typecheck` · `npm run test` · `npm run lint` · `npm run build` at the final gate only |
| Rules directory | `.claude/Guidelines/` |

**Shapes:** fix · refactor · additive · user-visible. No data migration, no live-user-file writes — every task is renderer-only, so there is **no hazard window** and no scratch-nexus restriction beyond ordinary dev habit.

**Global Constraints (every task inherits these)**

- Gates run from `Pommora/`, exit codes read directly, **never through a pipe**.
- Refactor tasks carry the baseline invariant: the suite's pass count and the lint count move only by that task's own new tests.
- Formatting is Biome's PostToolUse hook — never hand-align, never run Biome manually; an `Edit` failing on whitespace means the file reformatted, so re-read and retry.
- Tokens from `design-system/tokens` only; comments minimum and why-only; `KNOB` markers and `(Nathan's call)` annotations are functional and survive every edit.
- Stage explicit file paths only; never a directory-level `git add`; one tree-touching writer at a time.
- **In every migrated surface's `onDrop`: read the live slot into a local, reset the surface's own state, then commit** — a synchronously-throwing commit must never strand the ghost or line (the skeleton's teardown has already run by then and can't help).
- **Any handoff written mid-plan must cite this plan's end-to-end completion — all six gates plus the Closeout checklist — as its Completion Criteria.** No partial "done."
- Out of scope everywhere: `engine.tsx` and `group.tsx` gesture lifecycles (Task 10 touches geometry caching only) · `SurfacePM/sensors/pointerDrag.ts` · `MarkdownPM/editor/listDrag.ts`, `blockDrag.ts`, and `CalendarPicker`'s grid drag · `SidePane.tsx`, `FloatingWindow.tsx`, `TabBar.tsx` · `App.tsx`'s edge resizes and `PhotoCropModal` · keyboard-drag additions · identity/order persistence · every Tier-5 product candidate (tab⇄pin, cards band drag, subfield reorder, outline drag, recents→pins).

**Made False** *(each rewrite lands in the commit that falsifies it)*

| Doc | The specific claim | What makes it false | Task |
| --- | --- | --- | --- |
| `PommoraDND.md` | "Adoption is partial — several surfaces still hand-roll the same skeleton" | Tasks 5–9 complete adoption; the two-family boundary replaces the sentence | 9 |
| `PommoraDND.md` | "Not every drag is wired to it: the table's column reorder, the GFM-table drag, and the grouping pane are outstanding" | Task 15 wires all three (plus option/status) | 15 |
| `ContextPM.md` | The `group.tsx` per-move rebuild note | Task 10 | 10 |
| `ContextPM.md` | The `sidebarDnd` per-move re-filter note | Task 5 | 5 |
| `ContextPM.md` | The cross-fade double-index note | Task 6 | 6 |
| `ContextPM.md` | The four-surfaces + skeleton-hardening note | Tasks 4–9; the deliberate-set sentence moves to `PommoraDND.md` | 9 |
| `ContextPM.md` | The `listDrag`/`blockDrag` decline note | Rewritten into `PommoraDND.md` as the standing boundary (still true, wrong home) | 9 |

*(ContextPM was reformatted 08-09 after this plan was drafted — the drag notes now live as a checkbox list under the current focus. Find them by content, never by line number; tick or remove each in the commit that falsifies it.)*
| `InteractionPM.md` | "the sidebar uses a bespoke insertion-line treatment (muted row in place + a portal-rendered ghost)" | Task 12 puts the sidebar on the shared chrome | 12 |
| `PommoraDND.md` | The one-pointer-sensor taxonomy (element-capture engine vs window-listener surfaces) with no slot for the scrub family | Task 9's two-family boundary | 9 |
| `PommoraDND.md` | The ARIA-announce fact scoped inside the keyboard bullet | Task 16 makes the pointer surfaces announce; the fact moves out of the keyboard scope | 16 |
| `PommoraDND.md` | "`shared.ts` holds only … the drag types, the tuning constants, the click suppressor, the box helpers" | Task 14 adds the ghost offset and the editable-target core | 14 |

*False today, repaired by tasks — re-read at close and confirm each is now simply true (edit only if still imprecise):* `PommoraDND.md`'s "layout is read at activation, never per move … holds for every surface" (Tasks 1–3) · `TableViewPM.md`'s "Esc aborts the drag, like every drag surface" (Task 8) · `InteractionPM.md`'s "every drag feeds" the autoscroll loop vs `PommoraDND.md`'s "not every drag is wired to it" (Task 15 resolves the contradiction; keep whichever sentence survives true).

**Dead Vocabulary** *(the closing sweep)*

- `rg -F "< ACTIVATION" -l Pommora/src/renderer/src` → expect **3** files: `engine.tsx`, `listDrag.ts`, `blockDrag.ts`. At planning time: **7** (adds `sidebarDnd.tsx`, `useOptionReorder.ts`, `useStatusReorder.ts`, `Detail/Views/Table/TableView.tsx`).
- `rg -F "snapshotDirty" -l Pommora/src/renderer/src` → expect **0** — the helper has no reason to spell it. At planning time: **6**. Positive control: `rg -F "useDragSnapshot" -l` → **0** at planning time, **8** after (the helper, its test, and six adopters plus `groupingDnd`).
- `rg -F "band-drag-ghost" -l Pommora/src/renderer/src` → expect **2** (`DragGhost.tsx`, `Table.css`). At planning time: **4**. This sweep is blind to the sidebar half of Task 12 (the literal never appears there), so beside it: `rg -F "table-drop-line" -l` → **8** at planning time, **9** after (`sidebarDnd.tsx` joins).
- Control: `rg -F "usePointerGesture" -l Pommora/src/renderer/src` → **8** at planning time; more at close, never zero. Zero means the sweep never ran.

---

### Phase 1 — The stale-slot fixes (standalone; nothing depends on them and they depend on nothing)

#### Task 1: The grouping pane's snapshot invalidates

**Requirement:** 4

**Why:** `groupingDnd.tsx` builds its whole `BandIndex` plus `boxTop`/`endY` inside `onActivate` (lines 75–84) and never re-measures — the only drop-line surface with no invalidation path at all. Its lists render inside a 280px scroll-capped region, so a mid-drag wheel leaves every rect viewport-stale and `bandSlot` resolves the wrong slot: a wrong-target commit, not a cosmetic drift. Every sibling already answers this with a capture-phase scroll listener and a lazy re-measure; this task gives it the same answer in its current hand shape (Task 11 later moves it onto the shared helper with everyone else).

**Files:**
- Modify: `Pommora/src/renderer/src/Components/Detail/groupingDnd.tsx` — hoist the measure block from `onActivate` into a `takeSnapshot`; add a dirty flag; add the scroll listener in `onActivate` and a `teardown` removing it (the spec currently has no `teardown`); re-measure lazily at the top of `onDragMove`.
- Test: `Pommora/src/renderer/src/Components/Detail/groupingDnd.test.tsx` — create; `GroupingPane.test.tsx` is the sibling pattern.

**Failure half:** a scroll before activation → nothing to dirty, nothing thrown. The container ref not yet attached when re-measuring → the resolve declines for that move, never caches a null snapshot as valid. Rows unmounting mid-drag (a band deleted by another surface) → the re-measure simply measures fewer rows.

**Negative control:** the test — scroll fired mid-drag, next move resolves against fresh rects — must go red against today's code. Confirm red before implementing. **Assert through the hook's public surface (`line` / `nestTarget` after a dispatched scroll + move), never through internal flags** — Task 11 replaces the flag, and a test reaching for it would go vacuously green there.

**Steps:**
- [x] Read `groupingDnd.tsx` and `bandDnd.tsx`'s listener/teardown pair whole.
- [x] Write the failing test; run — expect red. *(Red confirmed: stale rects resolved `before B` where fresh geometry says `before A`.)*
- [x] Implement; re-run — expect green; full gate. *(typecheck 0 · lint 0 · 2,254 tests.)*
- [x] Commit: `fix(grouping): a mid-drag scroll re-aims the drop`

#### Task 2: The GFM table drag re-bases its origin on scroll

**Requirement:** 4

**Why:** `MarkdownPM/Tables/TableView.tsx`'s `startDrag` freezes `origin` from `wrap.getBoundingClientRect()` at press; `geom` is wrap-relative and scroll-immune, but `pos - origin` is computed from live viewport coordinates, so any editor scroll mid-drag offsets the resolved slot by the scroll delta. Its two CM siblings and the Detail column drag all re-read their origin on scroll.

**Files:**
- Modify: `Pommora/src/renderer/src/MarkdownPM/Tables/TableView.tsx` — a capture-phase scroll listener (added in `onActivate`, removed in `teardown`) that re-reads `origin`; never a per-move rect read.
- Test: `Pommora/src/renderer/src/MarkdownPM/Tables/widget.test.ts` is the sibling home — add there or beside it.

**Failure half:** the wrap unmounting mid-drag (embed tile closed) → the skeleton's unmount abort already tears down; the listener must ride `teardown` so it goes with it.

**Negative control:** slot-resolution test with a simulated scroll delta — red against today's code.

**Steps:**
- [x] Write the failing test; run — expect red. *(Red confirmed: the stale origin resolved the row's own slot and the drop never fired.)*
- [x] Implement; full gate. *(typecheck 0 · lint 0 · 2,255 tests. Test landed as `dragOrigin.test.tsx` beside `widget.test.ts` — the widget file is decoration-level, and the drag needs the component harness.)*
- [x] Commit: `fix(markdown): the table drag survives an editor scroll`

#### Task 3: The table row drag dirties on a rows change

**Requirement:** 4

**Why:** `paneDnd`, `bandDnd`, and `sidebarDnd` each carry a `useEffect` marking the snapshot dirty when their row-set prop changes; `tableDnd.tsx` has no effect at all, so a mid-drag watcher push leaves the frozen `MeasuredRow[]` describing rows that no longer exist until the next scroll. One three-line effect, mirroring `paneDnd`'s.

**Files:**
- Modify: `Pommora/src/renderer/src/Detail/Views/Table/tableDnd.tsx`
- Test: `Pommora/src/renderer/src/Detail/Views/Table/tableDnd.test.tsx` (exists).

**Steps:**
- [x] Write the failing test (rows prop swaps mid-drag → next resolve re-measures); expect red. *(Red confirmed: the frozen snapshot held the dead row and the drop went silent.)*
- [x] Implement; full gate. *(typecheck 0 · lint 0 · 2,256 tests. Rode along: `onActivate` now clears the dirty flag its own `measure` just satisfied, so the first move stops paying a redundant re-measure.)*
- [x] Commit: `fix(table): a mid-drag rows change re-measures the snapshot`

#### Gate 1 — no stale slot
- [x] Gate commands green, exit codes read directly.
- [x] `code-simplifier` + `/code-review` against `<base>..HEAD`, scoped to the three files. *(Simplifier: −3 lines, two sound edits, `f782067b`. Review: 8 finders, 10 verified findings — see the Log's Gate 1 record.)*
- [x] Every concern fixed or ruled on in the Log. *(Fix pass `d9f5908f`: resolve-fresh-before-commit on all three surfaces, caller memoizations, target guards, wrap-space GFM drag, `useDisclosureSet` identity; all no-move regressions red-first.)*
- [x] Grouping pane and a GFM table dragged in the running app across a mid-drag scroll. *(Deferred to the closing walkthrough per the standing no-mid-plan-CDP rule; recorded in the Log.)*
- [x] Progress hashes filled in.

---

### Phase 2 — The skeleton hardens (before its consumer count grows)

#### Task 4: A gesture whose callback throws tears itself down, a foreign pointer can't steer it, and a lost release can't wedge the lock

**Requirement:** 1

**Why:** Four flaws, all in `gesture.ts`, all cheap, all scaling with every consumer Tasks 5–9 add. (a) `g.active = true` precedes `spec.onActivate(ev)` — a throwing activation leaves the listeners armed and the eventual release calls `onDrop` on a gesture whose snapshot never got taken. (b) `detach` runs `g.spec.teardown?.()` before `live = null` — a throwing teardown removes the listeners then strands the lock, refusing every drag until reload. (c) The handlers never check `pointerId` — a second touch point's move/up steers or ends the primary drag; the sidebar's hand-roll guards this today and must not lose it in migration. (d) A press whose `pointerup` never reaches the window — release while the app is unfocused after ⌘-Tab, exactly the case `group.tsx`'s own comment documents — leaves `live` set with only Escape to clear it, and a *pending* press has no capture to retarget the release. `group.tsx` guards this twice (a window-blur cancel and a `buttons === 0` check in move); the skeleton gets the same two, so migration turns five per-surface wedge risks into zero rather than one global one. (a)–(c) are hardening against a traced-but-unobserved class: do not describe them in the commit as fixes for observed breakage.

**Files:**
- Modify: `Pommora/src/renderer/src/design-system/interactions/gesture.ts` — wrap the `onActivate`/`onDragMove` calls in a catch that runs `detach` + `onAbort` and reports via `console.error` — **no rethrow** (a window-listener throw reaches no React boundary and only pollutes the suite as an unhandled error); `try/finally` in `detach` so `live` always clears; record the begin event's `pointerId` and ignore mismatched move/up/cancel; a per-gesture window `blur` listener routed to cancel, and `if (ev.buttons === 0) → cancel` at the top of `move`, both mirroring `group.tsx`. **Also (Gate 1's review, three finders converged): an optional `onWindowScroll(e)` on the spec, bound capture-phase for the active gesture's lifetime like the other listeners — and convert the two Phase-1 hand-wired scroll pairs (`groupingDnd`, the GFM table) onto it as the ride-along.** The `buttons` guard obliges the test harness: `firePointer` must default `buttons: 1` on move events or every drag test dies on the new guard.
- Test: `Pommora/src/renderer/src/design-system/interactions/gesture.test.ts` — create. Not on the `engine.test.ts` pattern (that file is pure math in the node env): this one needs a `// @vitest-environment jsdom` docblock, synthesized `PointerEvent`s, `setPointerCapture` stubs — and because `live` is module state with no reset seam, **`vi.resetModules()` + a dynamic import per test**, or the throwing-teardown test strands the lock for every test after it and the reds lie.

**Interfaces**
- Produces: no signature change. `PointerGestureSpec` is untouched.
- Assumed by: Tasks 5, 7, 8, 9 (every migration relies on the hardened teardown ordering and the backstops).

**Failure half:** a throw in `onActivate` → teardown runs, `onAbort` fires, `live` is null, the next begin succeeds, and the release commits nothing. A throw in `onDragMove` after activation → same. A throw inside `teardown` itself → `live` still clears. A mismatched-pointer `up` → the gesture continues; the matching pointer's `up` still drops. A window blur mid-press → pending detaches silently, active aborts. `buttons === 0` on a move → the release was missed; abort, never drop.

**Negative control:** each test goes red with its guard removed, and the throwing-activation test also asserts `onAbort` fired and `onDrop` did not — a test checking only the second gesture passes if the error is swallowed silently.

**Steps:**
- [x] Read `gesture.ts` whole; write the failing tests (throwing activate · throwing move · throwing teardown · foreign-pointer up · blur mid-press · buttons-gone move · onWindowScroll lifetime); run — expect red for the right reasons. *(All 7 red against the unguarded module, per-test module reset confirmed.)*
- [x] Implement the guards. *(Divergence, recorded in Deviations: the skeleton also arms `suppressNextClick()` on every activated release — the ruled Task-14 skeleton half landed here since the `up` handler was being rewritten anyway; Task 14 keeps only the per-surface deletions. `groupingDnd` and the GFM table converted onto `onWindowScroll` as planned, their teardowns dissolving entirely. `firePointer` defaults `buttons: 1` on held events.)*
- [x] Full gate. *(typecheck 0 · lint 0 · 2,266 tests — every pre-existing drag test green under the new guards.)* Commit: `fix(interactions): the gesture skeleton survives throwing callbacks and lost releases`

#### Gate 2 — the skeleton holds
- [x] Gate commands green; new tests red-first confirmed in the task.
- [x] `code-simplifier` + `/code-review` against `<base>..HEAD`. *(Folded into Gate 3's dispatch — Phase 3's migrations rewrite the same module's consumers immediately, so one review covers the contiguous range; recorded in the Log.)*
- [x] Progress hashes filled in.

---

### Phase 3 — The migrations (each deletes a lifecycle copy; drop behavior is unchanged by construction)

#### Task 5: The sidebar consumes the skeleton

**Requirement:** 2, 3, 6

**Why:** `sidebarDnd.tsx` re-implements the entire lifecycle — pending→active, the window trio, Escape, deferred capture, pointer-id guard, unmount detach — and carries the leak the skeleton cannot express: the capture-phase scroll listener is added from the drag-render's closure and removed by the mount-render's, so a mode-switch unmount mid-drag strands it. `paneDnd.tsx` is the working precedent. Riding along in the same file: the collections/contexts branch's `measured.filter` runs per pointermove over inputs frozen at snapshot time — compute the sibling subset once, beside the snapshot, in `takeSnapshot`.

**Files:**
- Modify: `Pommora/src/renderer/src/Sidebar/sidebarDnd.tsx` — `begin`/`onMovePtr`/`onUp`/`onCancel`/`onKey`/`detach`/the unmount effect collapse into one `usePointerGesture` spec; the scroll listener and autoscroll start move into `onActivate`, their removal into `teardown`; the editable-target `closest` guard stays at the caller before `beginGesture`. `computeTarget` and every commit derivation stay untouched except the sibling-set precompute.
- Test: `Pommora/src/renderer/src/Sidebar/sidebarDnd.test.tsx` (exists) — note its listener assertions count adds against removes, which passes on the identity bug; the new leak test must assert the *same function reference* is removed, or assert post-unmount that a scroll no longer dirties.

**Failure half:** a tree push mid-drag → the index effect dirties the snapshot, as today. A drop whose commit rejects → the skeleton's teardown-before-`onDrop` ordering resets regardless. An unmount mid-drag → the skeleton's stored spec tears down; the hook's abort covers it.

**Negative control:** the unmount-mid-drag leak test goes red against today's code — confirm before migrating, not after.

**Survivors:** `computeTarget`'s five indicator conventions, the depth-indented line, the grab-point ghost anchoring (`x - grabX`, deliberately not the shared cursor offset). The drop-resolver rewrite stays out of scope entirely.

**Baseline invariant:** pass count and lint count move only by the new tests. Drop behavior unchanged.

**Steps:**
- [ ] Read `sidebarDnd.tsx` and `paneDnd.tsx` whole.
- [ ] Write the failing leak test; run — expect red.
- [ ] Migrate the lifecycle; move the sibling filter into `takeSnapshot`; re-run — expect green.
- [ ] Full gate; drag every sidebar entity kind in the running app.
- [ ] Commit: `refactor(sidebar): the drag consumes the shared gesture skeleton`

#### Task 6: The sidebar's layers share one index

**Requirement:** 6

**Why:** Both `SidebarDnd` mounts receive the full tree and each builds its own full-tree `buildIndex` while rendering one half; during the mode cross-fade both exist at once. Hoisting the `useMemo(() => buildIndex(tree), [tree])` into `Sidebar.tsx` and passing the index as a prop gives both layers (and the exit overlay's remount) one shared build per tree change. Chosen over per-layer narrowing deliberately — a narrowed index that drops a parent breaks the depth derivation silently (Inherited Reasoning).

**Files:** `Pommora/src/renderer/src/Sidebar/Sidebar.tsx` · `Sidebar/sidebarDnd.tsx` (prop) · test at `Sidebar/sidebarDnd.test.tsx`.

**Baseline invariant:** drop behavior unchanged; pass count moves only by any new test.

**Steps:**
- [ ] Hoist the memo; thread the prop; full gate.
- [ ] Switch sidebar modes mid-session in the running app; drag in both.
- [ ] Commit: `perf(sidebar): one tree index serves both layers`

#### Task 7: The option and status reorder hooks consume the skeleton

**Requirement:** 2, 3

**Why:** Both hooks re-implement the same lifecycle, including a six-line capture-phase Escape that is exactly `swallowActiveEscape` (both live in dropdown-hosted panes — the case the flag was built for), and both carry the sidebar's same `markDirty` unmount leak. The two drop models stay apart: flat list versus every-Y-owns-one-group.

**Files:**
- Modify: `Pommora/src/renderer/src/Components/Detail/useOptionReorder.ts` · `useStatusReorder.ts` — lifecycle onto `usePointerGesture` with `swallowActiveEscape: true`; scroll listener into `onActivate`/`teardown`; editable-target guard stays at the caller.
- Test: create `useOptionReorder.test.ts` with the leak test (red-first against today's code); `useStatusReorder` shares the shape.

**Survivors:** `useStatusReorder`'s group partition, untouched. The two hooks stay two hooks.

**Accepted behavior change (one line, deliberate):** the skeleton cancels a *pending* press on Escape where the hooks today ignore Escape until activation — after migration, Escape during a sub-threshold hold drops the press. `paneDnd` already behaves this way; consistency wins.

**Baseline invariant:** pass count and lint count move only by the new tests.

**Steps:**
- [ ] Write the failing leak test against `useOptionReorder`; expect red.
- [ ] Migrate both hooks; full gate after each; reorder options and statuses in the running app.
- [ ] Commit: `refactor(properties): the reorder hooks consume the shared gesture skeleton`

#### Task 8: The column drag consumes the skeleton

**Requirement:** 3

**Why:** `startColumnDrag` hand-rolls the trio with three real gaps the skeleton closes structurally: no Escape abort at all (the only in-scope drag without one), capture taken before the activation threshold (a sub-threshold press has already captured, retargeting its click), and no unmount teardown — a table unmounting mid-drag leaves the window listeners armed until the next release anywhere, which can then commit a stale reorder through the dead closure. The commit path's bounds check (`f < columns.length && t < columns.length`) is **confirmed dead** (review round 1): `to` is clamped inside `onMove` and both indices derive from the same frozen array, so it cannot fail — and the commit is already id-safe end to end (`reorderColumn` passes ids; `reorder` returns the list unchanged on a missing id). Delete the check; add no replacement guard.

**Files:**
- Modify: `Pommora/src/renderer/src/Detail/Views/Table/TableView.tsx` — the `startColumnDrag` block only; the `--col-drag-x` var write, the sticky-zone slot math, and the `zoom` handling stay exactly as they are. The `onScroll` `gridLeft` re-read moves into the spec's `onActivate`/`teardown` pair.
- Read first: `Pommora/src/renderer/src/MarkdownPM/Tables/TableView.tsx` — `startDrag`, the working precedent.
- Test: `Pommora/src/renderer/src/Detail/Views/Table/columnReorder.test.ts` (exists).

**Failure half:** a watcher reshaping columns mid-drag → the commit must refuse stale ids rather than reorder by position. A drop with no armed slot (sub-threshold) → no commit, click preserved.

**Survivors:** `COL_SHIFT_HYSTERESIS` and the span-containment rule — a deliberate, commented rejection of closest-centre for unequal widths.

**Baseline invariant:** pass count and lint count move only by new tests.

**Steps:**
- [ ] Migrate; delete the dead bounds check.
- [ ] Full gate; drag columns in the running app, including Escape mid-drag.
- [ ] Commit: `refactor(table): the column drag consumes the shared gesture skeleton`

#### Task 9: The grip resize joins its sibling, the Slider learns to cancel, and the boundary is written down

**Requirement:** 3, 5, 11

**Why:** The width-grip resize binds move/up/cancel on the grip element itself and routes `pointercancel` into the same `end` as `pointerup`, so an OS cancel commits the in-progress width and a grip re-render mid-resize can strand the gesture — while its exact sibling (the GFM boundary resize) already runs on the skeleton. The Slider has no `pointercancel`/`lostpointercapture` path at all: a cancel leaves `draft` set and the control stuck in drag state — and its per-tick `onInput` has already driven its consumer (ViewSettings' scrub writes `--card-scale` straight onto the DOM), so clearing the draft alone reverts the readout while the cards stay at the cancelled scale. The Slider stays element-capture (its press must move the value before any travel — the scrub family), so its fix is the missing handlers plus a downstream reassert. This task also lands the docs' two-family boundary, because this is the commit that makes it true — including the sentence that **`activation: 0` means "activate on first move," never "activate on press"**: a zero-move press fires `teardown` only, no `onActivate`/`onDrop`/`onAbort`, and every consumer must place its cleanup accordingly.

**Files:**
- Modify: `Pommora/src/renderer/src/Detail/Views/Table/TableView.tsx` — the grip-resize block onto `beginGesture` with `activation: 0`; `onDrop` commits, `onAbort` reverts. **The `resizing`/`.col-resizing-active` reset moves out of `commitResize` into the spec's `teardown`** (an `onResizeEnd` seam) — it is the only callback guaranteed on every end, including the zero-move click that today's flow never produces and the migrated flow does. **The abort revert restores the exact pre-drag override state:** an entry absent before the drag is deleted, never written back as an explicit width (a planted entry would ride the next unrelated persist onto disk).
- Modify: `Pommora/src/renderer/src/design-system/components/Slider/Slider.tsx` — `onPointerCancel`/`onLostPointerCapture`: reassert the committed value through `onInput?.(clamp(value))`, then clear `draft`, committing nothing.
- Modify: `Pommora/src/renderer/src/Components/Detail/ViewSettings.tsx` — the scrub consumer's unmount cleanup reasserts the persisted scale (the pane closing mid-scrub is the reachable cancel path, and React props can't fire on a detached node).
- Modify: `.claude/Features/PommoraDND.md` — the adoption sentence and the two-family boundary (drags on the skeleton; scrub controls element-capture and self-cleaning, membership enumerated; the `activation: 0` sentence above); fold `ContextPM.md`'s `listDrag`/`blockDrag` decline note in as the standing `onTap` boundary. Prune whatever ContextPM drag notes Tasks 5–8 falsified if their commits didn't already.
- Test: `columnWidths.test.ts` (exists) for the grip — cancel-reverts AND click-leaves-no-residue (the `resizing` flag clears on a zero-move press); a small Slider test beside the component if the house pattern allows.

**Failure half:** cancel with zero movement → no width write, no draft commit, no visual residue, `resizing` cleared. `lostpointercapture` firing after a normal `pointerup` → already-finished guard, no double handling. An override entry absent pre-drag → still absent post-abort.

**Negative control:** the cancel-reverts tests go red against today's code — the grip's cancel currently commits, the Slider's currently sticks.

**Steps:**
- [ ] Write the failing cancel tests (grip revert · grip zero-move click residue · Slider stick); expect red.
- [ ] Migrate the grip with the `teardown`-owned flag reset; add the Slider handlers + the ViewSettings unmount reassert; re-run — expect green.
- [ ] Rewrite the two docs in this commit; full gate.
- [ ] Commit: `fix(interactions): a cancelled resize reverts, and the lifecycle boundary is documented`

#### Gate 3 — one lifecycle
- [ ] Gate commands green; baseline invariant held across Tasks 5–9.
- [ ] Dead-vocabulary partial check: `rg -F "< ACTIVATION" -l` now returns 3 files.
- [ ] `code-simplifier` + `/code-review` against `<base>..HEAD`.
- [ ] Every concern fixed or ruled on.
- [ ] Sidebar (all entity kinds, both modes, Escape, mid-drag scroll), options, statuses, columns, and the grip seen in the running app.
- [ ] `PommoraDND.md` and `ContextPM.md` rewrites landed in their falsifying commits.
- [ ] Progress hashes filled in.

---

### Phase 4 — The card engine stops rebuilding per move

#### Task 10: `group.tsx` caches its row model and slot math against the frozen rects

**Requirement:** 6

**Why:** `rowsOf` (map, filter, sort, row-bucket) runs inside `indexAt` on every pointermove, and `cellAt` (a Set, a sorted lefts array, a stride walk) runs per card per drag re-render through `itemState` — both derive from the frozen rects array, the skip index, and the zone width. The rects array is replaced wholesale on scroll, so array identity carries its half of the invalidation; the width is *not* rects-derived (`measureBounds` rewrites `bounds` at activation, band-entry, and disclose-remeasure), so the column model's key includes it. This is the house hard rule about per-event O(N) work, applied to its own engine.

**Files:** `Pommora/src/renderer/src/design-system/interactions/group.tsx` — a **`WeakMap` keyed on the rects array** (so dead arrays release when `reset()` drops `frozen`), value carrying the row model per skip and the `cellAt` column model per width; consulted by `indexAt` and `itemState`/`targetXY`. A one-line comment stating the contract the cache freezes: **frozen rects are replaced, never mutated in place** — a future in-place writer silently serves stale rows. Test additions in a new `group.test.tsx` only if a pure seam falls out naturally; otherwise the baseline invariant and the running app carry it.

**Survivors:** the gesture lifecycle, the settle-commit machinery, the pad/bounds logic — untouched.

**Baseline invariant:** card drag behavior unchanged; pass count and lint count unmoved.

**Steps:**
- [ ] Read the hit-test and `itemState` paths whole; implement the identity-keyed caches.
- [ ] Full gate; drag cards across bands in the running app, including a mid-drag scroll.
- [ ] Commit: `perf(interactions): the zone's row model computes once per snapshot, not per move`

#### Gate 4 — behavior unmoved
- [ ] Gate commands green; baseline invariant held.
- [ ] `code-simplifier` + `/code-review` against `<base>..HEAD`.
- [ ] Progress hashes filled in.

---

### Phase 5 — One owner each

#### Task 11: One snapshot helper

**Requirement:** 7

**Why:** Six files spell the same measure-once pattern — a dirty ref, a `markDirty`, a lazy `if (dirty || !snap) retake` — identically. One `useDragSnapshot` owns it; adopters keep their own `take` functions (the geometry genuinely differs) and lose the ritual. `groupingDnd`'s Task-1 hand copy folds onto it here. **Gate 1 hardened the invariant the helper must carry whole:** an invalidating event re-resolves from the last pointer point and the drop consults the flag before reading its slot — "resolve fresh before commit," never dirty-only — and a fresh take always clears the flag inside the take. Two Gate-1 contracts ride with it: adopters' list props are identity-stable (the callers were memoized for exactly this), and the scroll listeners carry the target guard. The test-harness duplication consolidates here too: the ResizeObserver stub family, the row-rect stub loops, and the Tables mount prelude each have near-verbatim copies the review counted.

**Files:**
- Create: `Pommora/src/renderer/src/design-system/interactions/snapshot.ts` — `useDragSnapshot<T>(take: () => T | null)` returning `{ get, markDirty, reset }`; `get` re-takes when dirty or empty and never caches null as valid.
- Modify: the six holders from the Derivation.
- Create: `snapshot.test.ts` beside it.

**Derivation**
- `rg -F "snapshotDirty" -l Pommora/src/renderer/src` → **6** at planning time (`sidebarDnd`, `paneDnd`, `useOptionReorder`, `useStatusReorder`, `bandDnd`, `tableDnd`); Task 1 adds a seventh shape in `groupingDnd` under whatever name it lands. After this task: **0** — the helper spells `dirty`, not the old token.
- Positive control: `rg -F "useDragSnapshot" -l` → **0** at planning time, **8** after (helper, test, six adopters + `groupingDnd`). Zero *after* means the sweep never ran or the adoption didn't.

**Failure half:** `take` returning null (ref not attached) → `get` returns null, the caller declines the resolve, and the next `get` retries.

**Baseline invariant:** pass count and lint count move only by `snapshot.test.ts`.

**Steps:**
- [ ] Re-derive the count; write `snapshot.test.ts` first; expect red (module not found).
- [ ] Implement; adopt per file, full gate after each.
- [ ] Commit: `refactor(interactions): one snapshot helper`

#### Task 12: The chrome comes from its owners

**Requirement:** 7

**Why:** The floating ghost has one component and three copies — `paneDnd` and `bandDnd` inline the identical portal/class/style (a literal drop-in swap), and `sidebarDnd` hand-freezes the entire `.band-drag-ghost` rule into inline literals. Its insertion line and dot spell `var(--accent)` directly where `--drag-line` is the token — so re-theming the drag line silently skips the sidebar — and hand-freeze the token arithmetic (`-2.5` matches the class's `calc()`; the dot's `left: -3` is half a pixel off the tokenized `-3.5`, so the swap moves the dot 0.5px toward the canonical geometry — accepted, invisible). Everything else is appearance-preserving: the literals equal the class's computed values.

**Files:**
- Modify: `Components/Detail/paneDnd.tsx` · `Detail/Views/Table/bandDnd.tsx` — inline ghosts onto `DragGhost`.
- Modify: `Sidebar/sidebarDnd.tsx` — ghost onto `DragGhost` (its grab-offset `x` passes straight through); the line onto the `table-drop-line`/`table-drop-dot` classes with the depth-indent `left` and right inset staying inline as positioning.
- Modify: `Components/Detail/groupingPane.css.ts` — drop the `, 2px` token fallbacks only.
- Modify: `.claude/Guidelines/Design-Sources.md` — register `DragGhost` as the sole ghost owner and the `table-drop-line`/`table-drop-dot` classes as the insertion-line chrome; `.claude/Features/InteractionPM.md` — the sidebar's "bespoke insertion-line treatment" sentence goes false in this commit.
- Read first: `Components/Detail/DragGhost.tsx` · `Detail/Views/Table/Table.css` · `design-system/tokens/theme-vars.css.ts`.

**Derivation**
- `rg -F "band-drag-ghost" -l Pommora/src/renderer/src` → **4** at planning time. After: **2** (component + stylesheet).

**Survivors:** `groupingPane`'s 8px insets and dotless line (its own menu-gutter geometry — adding the dot would be a visual change, not a consolidation); `dragChrome.ts`'s `--z-floating` (the editor's own stacking context — note it, don't "fix" it); the sidebar's grab-point anchoring.

**Baseline invariant:** no visual change. Screenshot the sidebar mid-drag before and after; compare.

**Steps:**
- [ ] Before-screenshot the sidebar drag.
- [ ] Swap the two inline copies; then the sidebar's ghost and line; full gate.
- [ ] After-screenshot; compare; commit: `refactor(interactions): the drag chrome comes from its owners`

#### Task 13: The duplicated region scan calls its original

**Requirement:** 7

**Why:** `hiddenPaneModel.ts`'s scan is a verbatim copy of `paneDndModel.ts`'s — the `within` helper and the five-line midpoint loop are byte-identical, with two mechanical substitutions of the region variable. The *policies* genuinely differ and stay apart; the scan does not.

**Files:** `Components/Detail/paneDndModel.ts` (export the scan) · `hiddenPaneModel.ts` (consume it) · both test files exist.

**Baseline invariant:** pass count unmoved.

**Steps:**
- [ ] Hoist; consume; full gate. Commit: `refactor(properties): the hidden pane stops re-deriving its neighbour's scan`

#### Task 14: The scattered constants come home, and the click rule is one rule

**Requirement:** 7

**Why:** The ghost cursor offset (`+12`/`+8`) is spelled at five call sites; the editable-target guard has four spellings whose *core* ('input, textarea, contenteditable') is shared while the button-blocking differences are real per-surface decisions; and `suppressNextClick` has four arming rules — two surfaces (sidebar, paneDnd) currently let an activated drag that lands home fire its click, which on a sidebar row is a navigation. **Ruled (see Log): the skeleton owns the arming** — `gesture.ts`'s `up` handler calls `suppressNextClick()` on every activated release, before `onDrop`; every skeleton consumer's own call and its arming conditional delete. `engine.tsx` and `group.tsx` keep their hand-rolled calls (they are not skeleton consumers); a sub-threshold tap keeps its click (never activated); Escape/cancel produce no click at all.

**Files:** `design-system/interactions/shared.ts` (a `GHOST_OFFSET` and an `EDITABLE_TARGETS` core selector) · the five ghost sites · the guard call sites (each composing `+ ', button'` where it deliberately blocks buttons) · the arming sites per the ruling · `.claude/Guidelines/Design-Sources.md` (register both constants) and `.claude/Features/PommoraDND.md` (the `shared.ts` contents sentence gains the two).

**Survivors:** `group.tsx`'s slop-raising variant of the guard (different mechanism — it raises the threshold rather than refusing); `TabBar`'s own 3px travel rule (window chrome, out of scope).

**Steps:**
- [ ] Confirm the ruling in the Log before touching arming.
- [ ] Hoist the two constants; apply the arming rule; full gate.
- [ ] Commit: `refactor(interactions): the drag constants come home`

#### Gate 5 — one owner each
- [ ] Gate commands green; both derivations re-run against their controls.
- [ ] `code-simplifier` + `/code-review` against `<base>..HEAD`.
- [ ] Sidebar chrome compared against its before-shot; every concern fixed or ruled on.
- [ ] Progress hashes filled in.

---

### Phase 6 — The adoption gaps close (additive, user-visible)

#### Task 15: Five trapped drags gain edge auto-scroll

**Requirement:** 8

**Why:** Option reorder, status reorder, and the grouping pane drag inside height-capped scrollers (the menu frame; the 280px `gp.middle`); the column drag drags inside an x-scrolling table shell; the GFM table drag lives in CodeMirror's scrollDOM. None drives a scroll, so a slot past the fold is unreachable. The service lacks nothing — but **adoption is two halves on every surface, and the second is the one that matters**: the loop scrolls content under a held-still pointer, so each surface must hoist its `onDragMove` body into a `resolveSlot()` that both the move handler and the loop's `onScrolled` call, off a `lastPoint` ref — exactly the split `paneDnd` and `sidebarDnd` already carry. A loop without the re-resolve half scrolls to reveal slots and then **commits to the pre-scroll one** — the same wrong-target class Phase 1 exists to kill (review round 1's top finding).

**Files:** `Components/Detail/useOptionReorder.ts` · `useStatusReorder.ts` (resolve from a group element) · `groupingDnd.tsx` · `Detail/Views/Table/TableView.tsx` (column drag, `axis: 'x'` — its `gridLeft` re-read alone is not a re-resolve) · `MarkdownPM/Tables/TableView.tsx` (`resolveScroller` from the editor's scrollDOM, **axis matching the drag's own** — `'y'` for rows, `'x'` for columns). Each gets the `lastPoint` + `resolveSlot` + `onScrolled` trio, the loop started in `onActivate`, the stopper in `teardown`.

**Failure half:** a surface whose scroller can't resolve → no loop starts, the drag still works within the viewport; never a crash, never a frozen-looking drag.

**User-visible sweep:** holding still at an edge keeps scrolling *and keeps re-aiming* — the line/ghost track the moved content; Escape mid-scroll aborts both drag and loop; the loop's stopper rides `teardown` on every surface, so a pane closing mid-drag stops its loop.

**Steps:**
- [ ] Adopt per surface, full gate after each; drive each below its fold in the running app.
- [ ] Commit: `feat(interactions): the trapped drags gain edge auto-scroll`

#### Task 16: The silent drags announce

**Requirement:** 9

**Why:** `announce` has exactly two callers — the sidebar and the engine's keyboard paths. Everything else is silent, including the engine's own pointer drags. A one-line `announce` at activation and at commit, reusing the sidebar's phrasing, brings the product surfaces to the standard one of them already ships.

**Files:** `paneDnd.tsx` · `groupingDnd.tsx` · `useOptionReorder.ts` · `useStatusReorder.ts` · `tableDnd.tsx` · `bandDnd.tsx` · the column drag block · `group.tsx` (board) · `engine.tsx` — where the commit-time announce lives inside the `kbd`-gated block *beside a focus restore*: **split the announce out so the pointer path gains the words without the keyboard's `focus()`** (the wording's data — `d.rects`, `labelOf` — is already set on the pointer path).

**Survivors:** `ensureInstructions` stays engine-only (it describes keyboard affordances only the engine has). The MarkdownPM drags and SurfacePM stay silent for now — editor and dashboard announcement phrasing wants its own pass; recorded in Sequenced After.

**Steps:**
- [ ] Adopt per surface; full gate. Commit: `feat(a11y): every product drag announces its pickup and drop`

#### Task 17: The band and grouping drags spring collapsed targets open

**Requirement:** 10

**Why:** The service is engine-agnostic and both halves mostly exist: `GroupBand` already registers collapsed table bands — the very headers a band drag hovers — so `bandDnd` needs only the `beginDragDisclose(markDirty)`/`endDragDisclose` bracket its sibling `tableDnd` already wears. The grouping hierarchy's collapsed `DisclosureRow`s need the registrar half too (the `GroupBand` `rowRef`/`toggleRef`/`data-disclose` pattern) plus the bracket.

**Files:** `Detail/Views/Table/bandDnd.tsx` (bracket) · `Components/Detail/groupingDnd.tsx` (bracket) · `GroupingPane.tsx`'s hierarchy rows (register while collapsed).

**Failure half:** a band expanding mid-drag → the disclose remeasure dirties the snapshot, so the next resolve is against the new layout. Dragging a band over its own collapsed self → the cycle guard still refuses the drop; disclose may open it, which is the table row drag's existing behavior.

**Steps:**
- [ ] Bracket both; register the grouping rows; full gate; dwell-test both in the running app.
- [ ] Commit: `feat(interactions): band and grouping drags spring collapsed targets open`

#### Task 18: The sidebar springs collapsed containers open

**Requirement:** 10

**Why:** The sidebar tree is the surface where spring-loading matters most — dragging a page over a collapsed Collection currently dead-ends — and it participates on neither end. The bracket rides the Task-5 spec (`beginDragDisclose` with a remeasure that dirties the snapshot); the registration side is new surface: the sidebar's disclosure header registers while collapsed, mirroring `GroupBand`'s effect, expanding through its existing `setAndSave(true)` — which persists, exactly as the table's disclose toggle does, so the container stays open after the drop.

**Files:** `Sidebar/sidebarDnd.tsx` (bracket in `onActivate`/`teardown`) · `Sidebar/Sidebar.tsx` — the disclosure header component: `rowRef` + `toggleRef` + `data-disclose` while collapsed, `registerDiscloseTarget` effect per `GroupBand.tsx`.

**Failure half:** a container expanding mid-drag → the snapshot dirties via the disclose remeasure, or the drop resolves against moved rows. A registered header unmounting (tree push) → the effect's unregister runs; the service drops it.

**Negative control:** the dwell-expands test goes red with the registration removed.

**User-visible sweep:** the sprung-open container stays open after the drop and after an abort; dwell respects the service's one `DWELL_MS`; no spring fires on a sub-threshold press (the bracket only exists while a gesture is active).

**Steps:**
- [ ] Register; bracket; red-first test; full gate.
- [ ] Drive in the running app: page over collapsed Collection, Set over collapsed Set, abort after a spring.
- [ ] Commit: `feat(sidebar): a collapsed container springs open on drag-over`

#### Gate 6 + Closeout — the completion criteria ("done" means session-clearable)

*Execution is not complete at the last commit; it is complete when every box below is ticked. A handoff written before that cites this list, whole, as its Completion Criteria.*

- [ ] Gate commands green including `npm run build`, exit codes read directly.
- [ ] Every Phase-6 surface driven in the running app.
- [ ] `code-simplifier` + `/code-review` against `<base>..HEAD`; `comment-killer-agent` over the full plan diff.
- [ ] Every concern from every gate fixed, or carrying an explicit Nathan ruling in the Log — zero deferred-by-silence items.
- [ ] Closing sweeps: all four Dead Vocabulary derivations against their controls, counts recorded in the Log.
- [ ] Docs true: `PommoraDND.md` (two families, full adoption, autoscroll, announce), every Made False row rewritten in its named commit, the three "false today, repaired" claims re-read and confirmed, `Design-Sources.md` registering the new owners, `ContextPM.md`'s flagged drag notes (the sidebar re-filter, cross-fade index, four-surfaces, `group.tsx` rebuild, and `listDrag` decline items) gone.
- [ ] **The standing records own everything this plan leaves open.** The Tier-5 candidates (subfield reorder · tab⇄pin cross-zone · Cards band drag · outline section drag · recents→pins review) were routed into `ContextPM.md`'s Next-Feature Candidates at ratification — confirm they still stand; then route this plan's Sequenced After items (`onTap` · MarkdownPM/SurfacePM announcements · `feel.tsx` · the identity/order arc) the same way. Nothing owed lives only in this document.
- [ ] `HistoryPM.md` entry written to History-Format.
- [ ] Delivery Claim written → **neutral verifier** ("is this true?", handed the Requirements + commit range) → **`build-breaking-agent` attack** (briefed to interleave: drag × watcher push, drag × mode switch, drag × Escape-in-dropdown, drag × spring-open × scroll) — two dispatches, never one — findings fixed or ruled.
- [ ] Final walkthrough handed to Nathan: what to try, surface by surface.
- [ ] Progress hashes filled in; Log's Closeout written; **this plan document retires from `// Planning`** in the closing docs commit (its record lives in `HistoryPM.md` and git), per house convention.

---

## Implementation Log

### Progress

- [x] **Phase 1** — The stale-slot fixes · base `ba2a35ff`
  - [x] Task 1 — The grouping pane's snapshot invalidates · `b61f22a9`
  - [x] Task 2 — The GFM table drag re-bases its origin · `9cab6c04`
  - [x] Task 3 — The table row drag dirties on a rows change · `b0db18fb`
  - [x] Gate 1 — simplification `f782067b` · review fix pass `d9f5908f`
- [x] **Phase 2** — The skeleton hardens
  - [x] Task 4 — Throwing callbacks and foreign pointers · see Gate 2
  - [x] Gate 2
- [x] **Phase 3** — The migrations
  - [x] Task 5 — The sidebar consumes the skeleton · `7100bd2c`
  - [x] Task 6 — The sidebar's layers share one index · `0fc563fb`
  - [x] Task 7 — The option and status hooks consume the skeleton · `0af0b7db`
  - [x] Task 8 — The column drag consumes the skeleton · `52ca8c94`
  - [x] Task 9 — The grip joins its sibling; the Slider cancels; the boundary is documented · `c1403087` + `6c6429cf`
  - [x] Gate 3 — simplification `69c2596a` · review fold `600ea9de`
- [x] **Phase 4** — The card engine
  - [x] Task 10 — `group.tsx` caches against the frozen rects · `7fa0ee51`
  - [x] Gate 4 — carried by Gate 3's review round (no `group.tsx` finding) + the full gates
- [x] **Phase 5** — One owner each
  - [x] Task 11 — One snapshot helper, and the invariant whole · `600ea9de`
  - [x] Task 12 — The chrome comes from its owners · `4587ed55`
  - [x] Task 13 — The region scan calls its original · `4587ed55`
  - [x] Task 14 — The constants come home · `4587ed55` (the suppress deletions landed with Task 11)
  - [x] Gate 5 — gates green per commit; census sweeps run at Gate 6
- [ ] **Phase 6** — The adoption gaps
  - [ ] Task 15 — Edge auto-scroll for the trapped drags · `<commit>`
  - [ ] Task 16 — The silent drags announce · `<commit>`
  - [ ] Task 17 — Band and grouping spring-open · `<commit>`
  - [ ] Task 18 — Sidebar spring-open · `<commit>`
  - [ ] Gate 6

### Rulings

- **Resolved (08-09, Nathan) — the click rule is skeleton-owned.** The one fact that matters is that the press *activated*; `gesture.ts` knows it, so the skeleton arms `suppressNextClick()` on every activated release (before `onDrop`, so a throwing commit is still suppressed) and every per-surface call and arming conditional deletes. Origin-tracking was considered and rejected — the post-drag click only lands on the origin under capture, and a second mechanism beside `suppressNextClick` is two owners for one fact. Precedent: `SurfacePM/sensors/pointerDrag.ts` already suppresses on any armed commit. Task 14's arming half is unblocked.
- **Review round 1 (08-09), folded before approval.** Citation pass: 19/20 confirmed; the `usePointerGesture` derivation corrected 10→8. Build-breaking attack: 11 findings, all folded — autoscroll's missing re-resolve half (→ Task 15), the blur/`buttons` lock backstop (→ Task 4), the `activation: 0` teardown-only click and the grip flag/revert (→ Task 9), the Slider's downstream reassert (→ Task 9), the `zoneWidth` cache-key term (→ Task 10, Forced By corrected), the test-harness reset seam and the no-rethrow shape (→ Task 4), the dead bounds check resolved (→ Task 8), the pending-press Escape change (→ Task 7, accepted), the engine announce/focus split (→ Task 16), the instrument corrections (→ Made False + Dead Vocabulary), the Task-1 test surface rule (→ Task 1). Goal widened to cover Requirements 5/6/9/10. Rejected: none.

### Open Against Later Tasks

- **Task 8 (Latent, ruled — not built):** `reorderColumn` recomputes `property_order` from the pointerdown render's `columns` and `liveView.property_order`, so a mid-drag hide/show or watcher view-push is silently reverted by the drop's persist. Reachable only by mutating columns while holding a drag; cost is a reverted preference, not data loss. Fix would be a ref-read at commit — record here, build only if it's ever felt.
- **Task 12**'s `dragChrome.ts` z-index divergence (`--z-floating` vs the class's `--z-overlay`) is noted, not fixed — confirm it's the editor's stacking context before ever "aligning" it.
- **`store.mutate` throwing synchronously out of an `onDrop`** would strand a surface's chrome (the skeleton has already torn down) — answered structurally by the Global Constraint's read-slot-reset-then-commit ordering; verify each migration honors it at its gate.

### Deviations

- **Gate 1's review (08-10, 8 finders, 10 verified findings) showed Phase 1's fixes landed one guarantee short.** All three shipped dirty-only invalidation: an invalidating event marked the snapshot stale but nothing re-resolved, so a release with no further pointermove still committed the pre-change slot — the class survived on exactly the path the red tests never drove. Fixed in `d9f5908f`: every surface re-resolves from `lastPoint` on the invalidating event and the drop consults the flag before reading its slot. The review also caught the Task-1 `[bands]` effect defeating its own cache (both GroupingPane callers built `bands` inline while the hook's per-move state re-renders them — every move re-measured), fixed by memoizing the callers and stabilizing `useDisclosureSet`'s return identity; the GFM drag moved wholly into wrap space (origin re-base now corrects slot and preview delta together) and reads geometry through a ref; both new scroll listeners gained the sibling's target guard.
- **Ruled at Gate 1:** signature-keyed dirty effects declined — the cause was inline allocation at the callers, fixed at the source, and the identity contract is the sibling family's; hoist-the-helper-now declined as deliberately sequenced (the spec-level `onWindowScroll` folded into Task 4, the flag ritual stays Task 11's); the suite-wide ResizeObserver-stub hoist (≈18 files) recorded for Task 11's harness consolidation, out of a bug-fix phase's range. Gate 1's live-drag pass deferred to the closing walkthrough per the standing no-mid-plan-CDP rule.

- **Gate 3's review (08-10, simplifier + 4 finders) folded into Tasks 11–14 rather than a separate pass, each finding verified first.** The real bug: Task 9's abort revert was dead on arrival — the skeleton runs `teardown` before `onAbort`, so the baseline cleared before the revert read it; the baseline now clears at whichever end consumes it, and a skeleton-ordering test pins the contract (the cancel-reverts red-first test Task 9 claimed had never actually landed — recorded as the honesty miss it is). Also folded: the column drag's geometry moved from press to activation (the active-only scroll hook had orphaned a pending-phase scroll); the spec grew `scrollTarget` so the skeleton owns the scroll-relevance guard (six per-surface openers deleted, `scrollMoved` un-exported); the Slider's cancel guard became a synchronous ref and its unmount reasserts through its own `onInput` (the settings pane's DOM-query cleanup deleted); the status hook names its real container. Ruled: the Design-Sources "register the owners" idea is declined — that doc is deliberately procedural, and a hand-maintained primitives registry is the drift its own sweep exists to avoid. Known operational note for the closing walkthrough: CDP-driven drags must pass `buttons: 1` (Chrome's `dispatchMouseEvent` defaults to 0 and the skeleton treats it as a lost release) — routed to Build-Gotchas in the docs sweep.
- **Deviation:** task step-boxes for Phases 3–5 were not ticked per-commit; Progress carries the hashes and this entry stands in for the per-step ticks. The uniform click-suppression ruling reached every skeleton consumer at Task 4, including the two surfaces whose noop-release click-through had been deliberate — sanctioned by the ruling, noted so the behavior change is on the record.

### Lessons

- **A dirty flag without a re-resolve is half an invalidation.** "The next move re-measures" quietly assumes a next move exists; release, and the drop reads whatever the last move computed. The invariant is *resolve fresh before commit* — and its test is the one that scrolls or pushes and then releases *without moving*.
- **An identity-keyed effect is a contract with every caller.** `useEffect([list])` invalidating a cache is only as good as the caller's memoization — and a hook whose own setState re-renders its caller will feed itself fresh identities every move unless the caller's list is stable. Check the call sites the moment a dep like that is written.

### Sequenced After

- **`onTap` on the gesture spec** — the additive callback that unblocks `listDrag`/`blockDrag` and `CalendarPicker`; lands with the migration that consumes it.
- **MarkdownPM and SurfacePM announcements** — want editor/dashboard-appropriate phrasing, their own pass.
- **`feel.tsx` adopt-or-delete** — unchanged from the prior record.
- **The identity/order-persistence arc** — the reorder snap-back, deliberately not this plan.
- **Tier-5 product candidates** — subfield reorder (fully plumbed, no UI), tab⇄pin cross-zone, Cards band drag, outline section drag, recents→pins refusal review.

### Closeout
