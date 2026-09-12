#### CONTEXT

The View Engine arc (PM-136, "One View Mechanism") closed on `main` at `56a6107e9`. Table and Cards now render over one interaction layer, `Core/Views/Host/useViewInteractions.tsx`, and every row drop reaches that hook as three positional arguments, `(activeId, toZone, beforeId)`. The two drag engines were deliberately left alone: Table drags through `UIX/Interactions/tableDnd.tsx` → `insertionDrag.tsx` → `engine.tsx` (the single-zone engine, an insertion line), and Cards drags through `UIX/Interactions/group.tsx` (`DragGroup`, a cross-list displacement engine that serves exactly one screen). The arc made the views engine-agnostic so that folding the engines touches the design kit and one adapter in Cards, nothing else.

The audit's remaining ledger carries this as R-52 under topic 8, change 2: "Fold cross-zone support into the single-zone engine as a zone registry and retire the second. The fold is three axes — the registry, the collision model, and the overlay presentation — and cross-zone keyboard is its own step after it; the views consume one drop contract, so the fold touches only Cards' adapter. (L; −200 to −400 lines)." R-58 (the tile grid as a third drop treatment, the tab bar hand-rolling the harness) sits beside it and is a candidate to absorb in the same arc or explicitly exclude.

- **FILE:** `.claude/Features/PommoraDND.md` — the drag design: Displacement vs Insertion Line are two documented treatments, not an accident; §Constraints & Accessibility now states only what exists (an `axis` lock, a `resolveIndex` veto).
- **FILE:** `.claude/Planning/Codebase Audit — Report.md` — topic 8 and Appendix A rows R-52, R-58; Appendix B's method note.
- **FILE:** `.claude/Planning/View Engine — Implementation Plan.md` — the shape of a plan Nathan ratified: complete AFTER files drawn in a scratch worktree and gate-verified before presentation; Baseline counts with the commands beside them; Deviations written as they happen.
- **SOURCE:** `UIX/Interactions/engine.tsx` (442 lines) — the single-zone engine: `Zone`, `useZoneItem`, collision by rect, keyboard lift/move/drop, the `axis` lock, `settle` gate.
- **SOURCE:** `UIX/Interactions/group.tsx` (683 lines) — `DragGroup`, `useGroupedDragItem`, `useDropSlot`: cross-list displacement, `crossZone`, `resolveIndex`, `renderOverlay`, `zoom`, its own settle gate, no keyboard, no DOM test.
- **SOURCE:** `UIX/Interactions/drag.tsx` (52) — the façade: `SortableZone`, `reorder`, and re-exports of both engines.
- **SOURCE:** `UIX/Interactions/insertionDrag.tsx` (183), `UIX/Interactions/tableDnd.tsx` (136) — Table's row frame on the single-zone engine, reporting `onDrop(activeId, toGroup, beforeId)`.
- **SOURCE:** `Core/Views/Cards/CardsView.tsx:448–454` (`onCardDrop`, the one-expression index→`beforeId` adapter) and `:471–485` (the `DragGroup` mount: `onCommit`, `zoom`, `crossZone`, `resolveIndex`, `renderOverlay`).
- **SOURCE:** single-zone engine consumers, all live: `Core/Interface/Sidebar/Ribbon.tsx`, `Core/Interface/Windows/WindowTabStrip.tsx`, `Core/Navigation/NavGallery.tsx`, `Core/Navigation/TabBar.tsx`, `Core/Tiles/Surfaces/ViewTile.tsx`, `Core/Views/Table/useColumns.ts`, `UIX/Pickers/IconPicker.tsx`, and Cards' Set-card row (`SortableZone` inside `CardsView.tsx`).
- **SOURCE:** tests: `UIX/Interactions/engine.test.ts`, `tableDnd.test.tsx`, `drag.test.ts`, `reorderModel.test.ts`; `Core/Views/Cards/cardDrops.test.tsx` (drives `DragGroup` through the pointer harness), `Core/Views/manualOrderDrops.test.tsx`, `Core/Views/Table/bandCommits.test.tsx`; the harness is `Core/Testing/viewHarness.tsx` (`mountEachTest`, `renderView`, `settle`) with `UIX/Interactions/pointerHarness` (`firePointer`, `stubRect`).

### MANDATE

Plan the engine fold: one drag engine in the design kit that serves every drag surface, with cross-zone support as a zone registry, and `group.tsx` retired. Run `/writing-plans-v3` end to end — Search → Ask → Present → Design — and stop at Present for Nathan's approval; do not execute. The plan's AFTER blocks are complete files drawn in a scratch worktree against the real gates, not descriptions, and its Baseline states the counts the arc moves with the command beside each number. The mandate is net-negative on the ledger; if the honest draft isn't, the plan says so with the figure and names the cuts that would get there.

Cards must keep its displacement treatment (neighbors glide to open the slot) and Table its insertion line; PommoraDND documents both as design, so the fold is a registry and collision change under two presentations, not a visual convergence. Cross-zone keyboard support is a later step and stays out unless it falls out for free.

#### PRINCIPLES

- Simplification first: weigh what the fold deletes against what it adds before drawing a line; the engine that survives is the smaller one made capable, not a merged superset.
- Reuse before invention: `engine.tsx` already has the settle gate, the axis lock, keyboard, and a DOM test; `group.tsx`'s unique contributions are the zone registry, `resolveIndex`, `renderOverlay`, and `zoom`. Everything else is a second copy.
- Ask before designing: every open interaction decision goes to Nathan in one batched message with your read attached, before the plan is written.
- The views are not in scope. `useViewInteractions.tsx` and `tableDnd.tsx`'s contract do not change; Cards' `onCardDrop` adapter is the only Core edit the fold should need, and if the plan finds it needs more, that is a finding to surface, not a task to add.
- Agents: Fable or Opus for design and review; Sonnet at low effort for copying a drawn file into place. Two Opus reviewers per phase, one to simplify then one to break, in that order.

#### Task 1 — Search

1. Read `PommoraDND.md` in full, then `engine.tsx`, `group.tsx`, `drag.tsx`, `insertionDrag.tsx` top to bottom. Map the two collision models side by side: how each picks the over slot, what each does at a zone boundary, how each settles, what each renders during the lift.
2. Enumerate every consumer of both engines with what it passes (props, `axis`, `crossZone`, `resolveIndex`, `renderOverlay`, `zoom`, keyboard reliance) — a table, one row per surface.
3. Dispatch two to three read-only scouts (Opus): one on the collision and settle math, one on the overlay and zoom presentation, one on the consumers and the tests each would need. Each returns dependencies, reuse, simplification opportunities, and every document, comment, and test the fold makes false.
4. Decide R-58's fate in this arc: absorb the tile grid and the tab bar's hand-rolled harness, or exclude them with the reason.

### Task 2 — Ask

- [ ] One batched message to Nathan, ordered by how much of the plan depends on the answer: the registry's shape (zone ids as strings vs. registered elements), whether the overlay becomes a shared render prop or stays Cards-only, whether `zoom` moves into the engine or stays a prop, R-58's inclusion, and which hand checks he takes himself (every drag surface has a live check only he can do).
- [ ] Wait for the answers. Do not plan around a guess.

#### Task 3 — Present and Design

- [ ] Present the approach in one message: the engine that survives, the three axes as three phases (registry, collision, presentation), what retires, the estimated ledger figure with its basis.
- [ ] On approval, draw the plan: a scratch worktree on `main` with `node_modules` symlinked (link `@pommora/*` to the worktree's own packages or typecheck reads the main tree), every AFTER a complete file, gates green in the worktree before the plan is assembled. Record the worktree path and branch in the plan's Baseline so the executor can `git show` the files instead of retyping them.
- [ ] Baseline lines, each with its command: `wc -l` of `engine.tsx`, `group.tsx`, `drag.tsx`; `grep -rln "DragGroup\|useGroupedDragItem\|useDropSlot" Core UIX | wc -l`; the consumer count; `npm run test` files and tests; the ledger total from `python3 .claude/scripts/loc.py`.
- [ ] A Review Checkpoint after each phase with Nathan's hand checks listed per surface, and a `[Stop]` before `group.tsx` is deleted.
- [ ] Reconciliation: `PommoraDND.md` (§The Seam, §Displacement, §Insertion Line, §Constraints & Accessibility), the audit report (R-52, topic 8 change 2, R-58 if absorbed), `ViewTypesPM.md`'s Cards paragraph if the adapter's wording changes, `ContextPM.md`, `HistoryPM.md`.

#### GUIDELINES

- Never `git stash` in this repo; use a worktree. Commit in the worktree with `--no-verify`; the post-commit hook dirties `.claude/scripts`, which `git checkout -- .claude/scripts` clears.
- Present the plan's Summary, Implementation Process, the behavior changes Nathan is approving, the ledger figure, and his hand checks. Nothing else from the document.
- Report the total accumulated run time at the end of execution, not START and END.
- Nathan copy-pasting code from a plan saves nothing when the files sit on a branch; say so once if asked and move on.

#### INSIGHTS

- `group.tsx`'s `indexAt` never returns a negative index, and `onCommit` fires after the engine's own settle, so Cards' adapter needs no clamp; the fold's collision model must keep that property or the adapter grows.
- `useGhostAnchor` re-reads its options object every render, so a `suppressed` closure can read state directly; no ref mirrors. The same pattern likely applies to any engine callback the fold moves.
- Cards is `flat: true`, so `BandDnd`'s `nestable={!host.flat}` is false there; a reviewer confidently claimed otherwise last arc. Verify every "now enables X" claim against the registry before acting.
- The per-phase simplifier's estimates ran about thirty lines optimistic; the closeout pass found −17 more after three phase reviews. Budget the ledger claim accordingly.
- A same-slot drop writes nothing in either renderer now; a plan that reintroduces a no-op write for the displacement engine would be a regression against the current tree.
- `installViewEnvironment` no longer exists; suites mount through `mountEachTest((h, r) => { host = h; root = r })`. FilterFrame's body-clear `afterEach` must register before it (vitest runs `afterEach` LIFO).

#### RESPONSE

Direct and short between steps; the batched questions carry your read on each. The presentation leads with the one thing that decides approval (the engine that survives and the ledger figure), then the process, then the hand checks. No execution until Nathan says go.
