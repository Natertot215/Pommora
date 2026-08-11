## Cards Creation Adoption — Implementation Plan

> **Status:** written, pending review · Spec: `.claude/Planning/Cards Creation Adoption — Decision Log.md` · Execute tasks in order.
> Citations name files and symbols; re-derive before editing.

**Goal**

The Cards view gains the creation engine PM-096 proved on the table — the band "+", a single "New Page" menu item, and empty-field naming over a page already real on disk — plus its own hover ghost: a ghosted bordered card that displaces its neighbors on the cards' own move motion and creates on click. Alongside it, three shipped defects in the same subsystems die: the rename slot's dual-mount annihilation (already live on set-band renames), the stale manual-order class (a one-frame flash on the table, permanent on Cards), and the cross-location drop's discarded landing index.

The shape follows the ratified decision log: reuse over invention everywhere the engine is genuinely shared (the store creation loop, the stamping law, the menu builder, the rename field family), view-specific chrome where it isn't (the ghost's card body and FLIP displacement against the table's disclosure Reveal). The hover machinery extracts into one shared mechanism and the table refits onto it — a Cards copy with the table's original left inline is the failure mode this arc exists to avoid. Set-cards get no creation affordances: the hover mechanism is shared but the container creation contract isn't (no positional order, page-gated naming law, no rename affordance), so the set-ghost is a logged Prospect.

Not solving: the wider alias system (the locked next arc), flattened-mode's table half, group-band drag, and anything that would extend the container creation contract.

**Requirements**

1. The rename slot is owner-fenced; renaming a Set from a table band with the sidebar visible opens exactly one field (C-6).
2. The band "+" creates in its Set with the full stamping law, disclosing a collapsed band and gliding to the new card (B-1).
3. The card menu carries one "New Page" item creating flow-after with seed inheritance (B-2).
4. Every Cards create opens an empty naming field over a real card, glyph intact, on the fenced store engine (C-1–C-4).
5. Card rename unifies onto the inline field; the per-card TextPicker rename mount retires (C-5).
6. The ghost card: shared hover mechanism (table refitted onto it), Cards-specific chrome and FLIP displacement, click creates motionlessly into the ghost's slot (D-1–D-11, E-1–E-4).
7. The order bundle: creation refreshes the live manual order in its own act; Cards' reorder writes its local `viewOrders` copy; `bandAdd` gains the non-structural order tail (A-5, A-6).
8. Cross-location card drops honor their landing index (A-4).
9. The Set-Card drag flash falls to its verified cause (A-4).
10. Every doc and comment this makes false is rewritten in the commit that falsifies it (F-1–F-5).

**Acceptance — the whole thing working:** In a grouped, sorted Cards view where a card was manually dragged earlier, each of the three triggers — band "+", card-menu New Page, ghost click — births a stamped Untitled page whose card appears at its gesture slot immediately and stays there through the confirming reload, with an empty naming field focused over it and the glyph intact; and renaming a Set from a table band with its sidebar row visible opens exactly one field that commits. No single task satisfies this.

**Forced By**

- `renamingPath` is a bare global and both the sidebar and set bands mount fields for it (`Sidebar.tsx:318/:352/:455`, `GroupBand.tsx:58`) → any new consumer requires the fence first; C-1 is gated on C-6.
- Native-menu renames arrive surface-blind from main (`App.tsx:95`, `main/contextMenu.ts`) → the fence must resolve owners at mount, never accept caller declarations.
- `manualOverride` outranks every persisted order and absent rows rank last (`pipeline/sort.ts:170-183, :205-214`) → every create that writes an order must refresh the live override in the same act, or E-4's motionless handoff is false.
- Cards' reorder writes the wire but not the local `viewOrders` copy (`CardsView.tsx:391-405`) → the local write must land before the refresh reaches Cards, or a refresh unmasks the stale copy and loses the drag.
- The zone contract gives zone-item root transforms to the drag engine (`engine.tsx:544`) and `.page-card-body` stylesheet-transitions `transform` for hover-pop (`CardsView.css:117-119`) → FLIP transforms ride a dedicated wrapper between root and body.
- The drag engine freezes item rects synchronously at activation (`group.tsx:385/:403`) → the ghost must leave the grid before activation can happen: pointerdown outside the ghost stands it down; no `onDragStart` plumbing.
- Cards flattens groups with no per-row group map (`CardsView.tsx:603-612`) → the seed logic needs a row→band map built from `groups` before the port.
- `pageMetaMenuItems`' boolean emits the Above/Below pair (`shared/pageMenu.ts:19-34`) → the single card item needs a new option shape on the one builder, never a second writer.
- Locked Decision: no global singleton holding shared mutable client state → the ghost anchor is per-view-instance hook state; cross-instance overlap is transient by leave-close (D-11).

**Inherited Reasoning** (ruled out in the log; do not retry)

- Phantom-slot inside the drag engine — couples creation chrome into a drag lifecycle; rejected.
- `DragGroup onDragStart` for the stand-down — still leaves the ghost in the grid at rect-freeze; the pointerdown stand-down replaced it.
- Caller-declared rename ownership — unimplementable at the surface-blind call sites; owner-resolution replaced it.
- Fade-only ghost (no displacement) — dropped direction; fallback only if FLIP reads janky in Nathan's visual pass.
- View Transition API — outside the motion-token law.
- Above/Below pair on cards — grid ambiguity; single flow-after item.
- Set-card ghost in core — the creation contract isn't shared; Prospect.

**Grounding** (re-open these; don't cite them)

- `.claude/Planning/Cards Creation Adoption — Decision Log.md` — the ratified spec; every task's Why traces through it.
- `Pommora/src/renderer/src/Detail/Views/Table/TableView.tsx` — the engine's table-local closures, ghost machinery, `manualOverride` and its two resets, the create-naming front-end (`editing.fromCreate` → direct `mutate`).
- `Pommora/src/renderer/src/Detail/Views/Cards/CardsView.tsx` + `CardsView.css` + `CardValue.tsx` + `cardsBand.ts` — every Cards seam the log cites.
- `Pommora/src/renderer/src/store.ts` — the store rename engine and creation loop; `Pommora/src/renderer/src/Components/RenamableTitle.tsx` / `RenamableLabel.tsx` / `EditableInput.tsx`.
- `Pommora/src/renderer/src/design-system/interactions/engine.tsx` / `group.tsx` — displacement feel, zone contract, rect freezing.
- `Pommora/src/shared/pageMenu.ts`, `shared/cardMenu.ts`, `shared/mutate.ts`, `renderer/src/Detail/Views/creationOrder.ts`, `renderer/src/Detail/Views/pipeline/sort.ts`, `renderer/src/treeMove.ts`.
- `.claude/Guidelines/Lint-And-Accessibility.md`, `.claude/Guidelines/Build-Gotchas.md` — the lint floor and launch traps.

**Environment:** Plan directory `.claude/Planning` · spec is the decision log above · explorer: Explore agent · simplification: `code-simplifier` on the phase diff · attack reviewer: `build-breaking-agent` · neutral verifier: general-purpose agent · gates from `Pommora/`: `npm run typecheck` · `npm run lint` · `npm run test`, exit codes read directly, never piped · rules in `.claude/Guidelines` · CDP verification in the Test nexus, never NexusOS (PM-096 protocol).

**Shapes:** additive (new surfaces; failing tests first) · fix (three shipped defects; sibling sweeps + regression tests) · refactor (the hover-mechanism extraction; behavior-preserving, table re-verified) · user-visible (interaction sweep ran in the log; CDP passes at gates; Nathan's ghost visual pass and live feel are the deliberate pendings).

**Global Constraints (every task inherits these):**

- Gates from `Pommora/`: `npm run typecheck && npm run lint && npm run test` — read exit codes directly; a piped tail's zero is not a result.
- Biome's PostToolUse hook formats every write; an Edit failing on whitespace means re-read and retry. Never hand-align.
- `KNOB` and `(Nathan's call/spec)` markers are functional and survive every pass — brief the simplifier against stripping them; grep-verify after.
- Tokens come from `design-system/tokens`; the ghost's first-pass CSS marks every visual value `KNOB` for Nathan's pass. No new keyboard shortcuts.
- Explicit-path staging only; one tree-touching writer at a time; commit per task.
- The running app never displays build-status or meta text (`UI-Copy.md`).
- Out of scope everywhere: `createContainer`'s contract, set-card creation affordances, alias code, MarkdownPM.

**Made False** (each rewrite lands in the commit that falsifies it)

| Doc | The specific claim | What makes it false | Task |
| --- | --- | --- | --- |
| `CardViewPM.md:90` | "the Cards band's '+' stays a visual stub until the card chrome adopts it" | Task 7 arms it | 12 |
| `CardViewPM.md:94` | "Cross-band card drag" listed as unbuilt prospect | already ships; stale today | 12 |
| `TableViewPM.md` ghost paragraph | describes the machinery as the table's own | Task 9 extracts it shared | 12 |
| `ViewsPM.md` creation entry | creation is table-only | Tasks 6–8 | 12 |
| `ContextPM.md` (Important Information) | Cards "+" renders inert "until the card chrome adopts the creation engine" | Task 7 | 13 |
| `cardsBand.ts:3-5` comment | "create-page routing … deferred" | Task 7 | 7 |
| `CardsView.tsx` TextPicker mount comment | "Persistent mounts riding `open`…" (rename half) | Task 8 retires the mount | 8 |

**Dead Vocabulary**

- `renameOpen` in `CardsView.tsx` → expect 0 after Task 8. Legitimate hits: none.
- Control: `rg -F "TextPicker" Pommora/src/renderer/src` → 14 at planning time (the component survives; only the rename mount dies). Zero here means the sweep never ran.

---

### Phase 1 — The Rename Fence

#### Task 1: Owner-fence the rename slot; the set-band annihilation dies

**Requirement:** 1

**Why:** `renamingPath` is consumed by every surface that can host a field; two mounts for one path annihilate each other (dual focus-on-mount → loser's blur commits empty → guard cancels → slot clears for both). This is live today on set-band renames and blocks Cards from ever mounting a field (C-6). Owner-resolution at mount — never caller declaration — because native-menu renames arrive surface-blind from main. Chosen shape: a claim registry in the store; candidates register on mount with a rank (`detail` outranks `sidebar`), highest rank wins, stable first-claim tiebreak within a rank; only the winner mounts the input, others render plain text. The slot's existing shape (`renamingPath`/`renamingCreate`) stays — the claim sits beside it, so no consumer's selectors break.

**Files:**
- Modify: `Pommora/src/renderer/src/store.ts` — the rename block (`beginRename` `:1397`, `cancelRename` `:1398`, `submitRename` `:1418`): add the claim slot + `claimRename`/`releaseRename` actions.
- Modify: `Pommora/src/renderer/src/Components/RenamableTitle.tsx` — claim on becoming the target; mount the input only while owning.
- Test: `Pommora/src/renderer/src/Components/renamableTitle.test.tsx` (create if absent — check for an existing home first).

**Derivation**
- `rg -Fl "RenamableTitle" Pommora/src/renderer/src` → 4 files at planning time (`Components/RenamableTitle.tsx`, `Sidebar/Sidebar.tsx`, `Detail/Views/GroupBand.tsx`, +1); re-derive and open every consumer before editing — a field-mounter reading `renamingPath` directly (outside `RenamableTitle`) must be enumerated and either fenced or shown to be a non-field consumer (the sidebar's force-open selector is one: reads, never mounts).
- Control: `rg -F "renamingPath" Pommora/src/renderer/src` → 12 at planning time. Zero means the search never ran.

**Interfaces**
- Produces: `claimRename(path: string, host: RenameHost) => claimed: boolean` + `releaseRename(path, host)`, `RenameHost = 'detail' | 'sidebar'`; `RenamableTitle` gains a `host` prop.
- Assumed by: Task 8 (Cards mounts with `host: 'detail'`).

**Failure half:** a claim for a path that isn't `renamingPath` → refused, no state; the winner unmounting mid-rename (view switch) → release passes the claim to the surviving candidate on its next render rather than stranding the slot; no candidate at all (renamed entity visible nowhere) → slot stands until cancel/submit, same as today.

**Negative control:** the dual-mount test (sidebar row + band field on one path) asserts exactly one input mounts and typing commits; with the fence disabled (claim always true) the same test shows both mounting and zero surviving — assert that inversion once, then delete the disabled-path assertion.

**Steps:**
- [ ] Write the failing test: two `RenamableTitle`s on one path, distinct hosts — expect one input, focused; typing + blur commits the rename; the loser renders plain text.
- [ ] Run it — expect failure (both mount today).
- [ ] Implement the claim slot + fence; re-run — expect pass.
- [ ] Full gates — green.
- [ ] Commit: `fix(rename): the slot gains an owner fence — one field ever mounts`

#### Gate 1 — one field, ever
- [ ] Gates green, exit codes direct.
- [ ] Derivations re-run against controls; counts matched or the divergence rewrote the plan.
- [ ] Simplification + review against `<base>..HEAD`; reports cite files inside it; KNOB grep clean.
- [ ] CDP against the Test nexus: rename a Set from a table band with its sidebar row visible — one field opens, commits, no flicker. (The log's Live Check #2.)
- [ ] Progress hashes filled in.

---

### Phase 2 — Order Correctness

#### Task 2: Creation refreshes the live manual order; `bandAdd` gains its missing tail

**Requirement:** 7

**Why:** `manualOverride` outranks everything and no create refreshes it — the table flashes a frame of wrong placement (the `[source]` reset self-heals), Cards would hold it forever, and `bandAdd` under a sort never persists any order at all, so its page lands last regardless. E-4's motionless handoff is impossible until creation settles the live order in the act that writes it (A-5, F6).

**Files:**
- Modify: `Pommora/src/renderer/src/Detail/Views/Table/TableView.tsx` — `bandAdd` (add the non-structural `tieOrderWith` tail `newPageAdjacent` already has) and both create completions (refresh `manualOverride` in the same act: structural → the optimistic tree now carries the slot, so null it synchronously with the insert; non-structural → set it to the same `tieOrderWith` list `persistViewOrder` writes).
- Test: `Pommora/src/renderer/src/Detail/Views/creationOrder.test.ts` (or the sort pipeline's test home — locate first).

**Interfaces**
- Produces: no new exports — a behavioral contract: *every create that writes an order leaves `manualOverride` consistent with it in the same React act.* Task 7 ports it into Cards.

**Failure half:** no prior drag (`manualOverride` null) → refresh is a no-op, nothing regresses; a create with no order write (unsorted structural) → untouched; the confirming reload → agrees with the refreshed order (the `[source]` reset now clears an already-consistent value).

**Steps:**
- [ ] Write the failing test: seed a manual order, run the create's order logic, assert the resolved on-screen order places the new row at its slot in the *first* pass (no flash).
- [ ] Implement both refresh sites + the `bandAdd` tail; test green.
- [ ] Full gates — green.
- [ ] Commit: `fix(order): creation settles the live manual order in its own act`

#### Task 3: Cards' reorder writes its local copy

**Requirement:** 7

**Why:** `reorderInBandByIndex` writes the wire (`window.nexus.viewOrders.set`) but never `setViewOrders` — the exact hazard the table's `persistViewOrder` comment names. Masked today only because the live override outranks the stale copy; Task 2's contract reaching Cards (Task 7) would unmask it and lose the user's whole drag (F5). Lands before any Cards creation work.

**Files:**
- Modify: `Pommora/src/renderer/src/Detail/Views/Cards/CardsView.tsx` — `reorderInBandByIndex`: mirror the write into the local `viewOrders` state, matching `TableView.persistViewOrder`'s shape.

**Steps:**
- [ ] Add the local write; open `TableView.persistViewOrder` and match its discipline exactly.
- [ ] Full gates — green.
- [ ] Commit: `fix(cards): a reorder writes the local viewOrders copy it reads`

#### Task 4: Cross-location drops honor their landing index

**Requirement:** 8

**Why:** Cards' `canRelocate` branch issues `movePage` and discards `toIndex`, so a card dropped across locations lands wherever the reload puts it. The table's structural branch already solves this with `structuralOrderAfterDrop`; Cards adopts it for the destination container (A-4).

**Files:**
- Modify: `Pommora/src/renderer/src/Detail/Views/Cards/CardsView.tsx` — `onCardDrop`'s relocate branch.
- Reference: `Pommora/src/renderer/src/Detail/Views/Table/TableView.tsx` — `structuralOrderAfterDrop` and its call site.

**Failure half:** a drop into an empty destination → index 0, order array of one; the destination's hidden (filtered-out) members → the order array builds from full membership, never the filtered view (PM-096's law).

**Steps:**
- [ ] Write the failing test at the order-helper level: relocate with a landing index → the destination order names the moved id at that slot.
- [ ] Implement; test green; full gates green.
- [ ] Commit: `fix(cards): a cross-location drop keeps its landing index`

#### Task 5: The Set-Card drag flash — verify the cause, then kill it

**Requirement:** 9

**Why:** The Known Issue ("drop snaps back, then jumps on reload"). The log's verified read: set-cards ride the standalone zone whose `onReorder` discards nothing, so the cause is likelier the missing optimistic set order — sets append in `treeMove` and `reorderSets`'s write round-trips through a full reload with no optimistic patch. The diagnosis is a hypothesis; this task proves it before fixing (A-4).

**Files:**
- Read first: `Pommora/src/renderer/src/Detail/Views/Cards/CardsView.tsx` `reorderSets`; `Pommora/src/renderer/src/treeMove.ts` set handling; the `moveSet`/set-order mutation in `Pommora/src/shared/mutate.ts` and its main handler.
- Modify: whatever the verified cause names — expected: an optimistic set-order patch beside the write.

**Steps:**
- [ ] Trace the reorder round-trip; write the cause into the Log (Deviations if it contradicts the hypothesis; a Ruling request if the fix is design-shaped).
- [ ] Fix with a failing test first at whatever layer the cause lives.
- [ ] Full gates green; CDP: drag a set-card — no snap-back, no reload jump.
- [ ] Commit: `fix(cards): the set-card drop lands once`

#### Gate 2 — order is settled everywhere
- [ ] Gates green; derivations re-run; simplification + review against `<base>..HEAD`; KNOB grep clean.
- [ ] CDP matrix in the Test nexus: (drag → New Page Below → row lands adjacent, no flash) · (drag → band "+" under a sort → lands at group end and stays) · (cross-location card drop → lands at index) · (set-card drag → clean).
- [ ] Concerns fixed or ruled; Progress hashes filled.

---

### Phase 3 — Cards Creation Surfaces

#### Task 6: One "New Page" on the card menu

**Requirement:** 3

**Why:** The grid has no Above/Below; one item defaulting flow-after (B-2). The shared builder gains a single-vs-pair option shape — one writer; the table's grip/title menus and the sidebar keep the pair by passing the pair shape.

**Files:**
- Modify: `Pommora/src/shared/pageMenu.ts` — `pageMetaMenuItems` opts: `newPages?: 'pair' | 'single'` (the existing boolean callers convert to `'pair'`).
- Modify: `Pommora/src/shared/cardMenu.ts` — pass `'single'`; `Pommora/src/renderer/src/Detail/Views/Cards/CardsView.tsx` — route the action to the flow-after create (wired fully in Task 7).
- Test: `Pommora/src/shared/cellMenu.test.ts` siblings — extend the existing menu-model tests.

**Must agree:** the grip menu, title-cell menu, and sidebar menu still emit the exact pair (existing tests assert the labels); the card menu emits exactly one "New Page". One builder produces all four — assert the four shapes in one test file.

**Steps:**
- [ ] Failing tests: card model shows one "New Page"; pair surfaces unchanged.
- [ ] Implement the option shape; tests green; full gates green.
- [ ] Commit: `feat(cards): the card menu carries New Page`

#### Task 7: The creation engine lands in Cards — band "+", flow-after create, stamping

**Requirement:** 2, 3

**Why:** The engine is view-agnostic at the store/pipeline layer; what Cards lacks is the view-local wiring the table holds in closures (B-1, A-3). Ports: `patchSeedValues` (against Cards' own `setValueOverride`/`applyValueAtRoot` seam), `createPageIn` (with Task 2's manual-order contract), `bandAdd` (collapsed-band disclosure + glide), the flow-after create for the menu item, `SEEDABLE_SORT_TYPES` reuse, and the row→band map Cards doesn't have (built from `groups`, since Cards flattens and holds no `rowGroup`). The glide reuses `scrollGlide` against the card element.

**Files:**
- Modify: `Pommora/src/renderer/src/Detail/Views/Cards/CardsView.tsx` — the ported closures; `onAdd` passed at the `GroupBand` call site; the menu router arm.
- Modify: `Pommora/src/renderer/src/Detail/Views/Cards/cardsBand.ts` — the deferral comment dies with the routing (Made False).
- Reference: `Pommora/src/renderer/src/Detail/Views/Table/TableView.tsx` closures; `Pommora/src/renderer/src/Detail/Views/pipeline/creationSeeds.ts`.

**Interfaces**
- Produces: `createAfter(row)` (flow-after create) and `bandAdd(setKey)` inside CardsView — Task 10's ghost click consumes `createAfter`.

**Failure half:** band-add on a collapsed band → discloses first, then creates (the table's law); a filter excluding the newborn → creates on disk, card stays hidden, app healthy (the Obsidian behavior); an empty group → band-add still creates at slot 0; a menu create on a card whose group is non-stampable (date bucket) → no group seed, order still honored.

**Steps:**
- [ ] Build the row→band map from `groups`; port the closures against it.
- [ ] Failing test at the seed layer where one fits (group-stamp derivation for a cards-shaped map); engine-level creation tests already cover seeds+order — verify they run.
- [ ] Arm `onAdd`; wire the menu arm to `createAfter`.
- [ ] Full gates green.
- [ ] Commit: `feat(cards): creation lives in the view — the band + creates, and New Page lands flow-after`

#### Task 8: The empty naming field over a card — and one rename surface

**Requirement:** 4, 5

**Why:** Cards adopts the store rename engine deliberately (C-1) — the `RenamableTitle` family whose chrome matches a card label — with the carve-outs the card demands (C-3/C-4): pointerdown stopped against the whole-surface drag handle, exclusion from the title hit test, the editing flag through the memo as a prop, and the field replacing the whole title row (never inside `OverflowScroll`). Rename unifies onto the same field and the TextPicker rename mount retires (C-5) — cards were the odd surface out. Creates end `beginRename(path, true)`; the glyph stays (C-2).

**Files:**
- Modify: `Pommora/src/renderer/src/Detail/Views/Cards/CardsView.tsx` — `CardFace` title swap behind the target check; `PageCard` memo prop; the `title:rename` route → `beginRename`; delete the TextPicker rename mount + its comment (Made False); create completions call `beginRename(path, true)`.
- Modify (if needed): `Pommora/src/renderer/src/Components/RenamableTitle.tsx` — `host: 'detail'` from Task 1.
- Test: the Task 1 test home — a cards-shaped case: create target → one field, empty, focused; Esc → title reads Untitled; glyph node present throughout.

**Failure half:** Esc/click-off → Untitled stays (the engine's law, already tested at the mutate layer); a colliding first name → disambiguates via `fromCreate` (store computes it — verify `submitRename`'s gate passes `kind === 'page'` here, which it is); the card unmounting mid-rename (filter re-emit) → the fence's release path (Task 1 failure-half) — no stranded slot.

**Steps:**
- [ ] Failing component test: naming target renders one empty focused field in place of the title, glyph present.
- [ ] Implement the swap + carve-outs; test green.
- [ ] Reroute menu Rename; delete the TextPicker mount; `rg -F "renameOpen" Pommora/src/renderer/src/Detail/Views/Cards` → 0.
- [ ] Full gates green.
- [ ] Commit: `feat(cards): naming opens empty over the card — one rename surface`

#### Gate 3 — creation feels like the table's
- [ ] Gates green; derivations re-run; simplification + review against `<base>..HEAD`; KNOB grep clean.
- [ ] CDP in the Test nexus: band "+" (grouped, collapsed, filtered-derivable, filtered-excluded) · menu New Page under a sort (seeds + adjacency) · empty field: born-empty-focused, Esc→Untitled, collision→"Name 2", glyph never vanishes.
- [ ] Concerns fixed or ruled; Progress hashes filled.

---

### Phase 4 — The Ghost

#### Task 9: Extract the hover mechanism; the table refits onto it

**Requirement:** 6

**Why:** One shared mechanism, view-specific effects (D-1). The extraction carries the two fixes the review found: the suppress handle becomes hook API (Cards pops native menus inside memoized cards, so caller-side wrapping can't reach), and the anchor-loss path clears ghost *state*, not just its render (the stranded-`closing` skip-dwell edge, D-10). The pointerdown stand-down (D-8) lands here as mechanism law. Refactor shape: the table's behavior is the baseline — same dwell/grace semantics, same stand-downs, gates prove no drift.

**Files:**
- Create: `Pommora/src/renderer/src/Detail/Views/useGhostAnchor.ts` — the hook: per-view dwell/grace KNOBs, `closing`, suppress handle, pointerdown stand-down, anchor-loss state clear, the double-create guard's `take()`.
- Modify: `Pommora/src/renderer/src/Detail/Views/Table/TableView.tsx` — the inline machinery (:1548-1666 at planning time) moves out; `GhostRow` consumes the hook's state; `withGhostSuppressed` becomes the hook's handle.
- Test: `Pommora/src/renderer/src/Detail/Views/useGhostAnchor.test.ts` — timer semantics with fake timers: dwell arms, leave-grace closes, re-enter reverses, suppress stands down, pointerdown stands down synchronously, anchor-loss clears state (the D-10 regression: `closing` never strands).

**Interfaces**
- Produces: `useGhostAnchor({ dwellMs, graceMs, suppressed }) => { anchor, closing, onHover(id, entering), onGhostEnter/Leave, take(), suppress: { wrap<T>(fn): Promise<T>, hold(): () => void }, clearFor(id) }`.
- Assumed by: Task 10 (Cards), the refitted TableView.

**Negative control:** the D-10 regression test goes red against the pre-extraction semantics (stranded `closing` → re-hover opens with no dwell) — assert the old behavior fails under the new hook once, then keep only the green assertion.

**Steps:**
- [ ] Write the hook tests first (fake timers) — expect module-not-found.
- [ ] Implement the hook; tests green.
- [ ] Refit TableView; delete the inline machinery; full gates green.
- [ ] CDP: table ghost unchanged — dwell-appear, leave-collapse, reverse mid-exit, menu stand-down.
- [ ] Commit: `refactor(views): the hover ghost mechanism has one home`

#### Task 10: The ghost card — chrome, FLIP displacement, motionless handoff

**Requirement:** 6

**Why:** Cards' own effect on the shared mechanism (D-2–D-7, E-1–E-4): a real grid item at the flow-after slot (placement, row-height, track sizing free), a ghosted bordered card — heavier border than `--border-cell`, no content, the `.page-card-ph` page-icon glyph treatment — entering and leaving by FLIP over the group's affected cards and the bands below, on the drag shift's feel tokens, transforms riding a dedicated wrapper between drag-shell root and hover-pop body. Click runs `createAfter` through `take()`; the real card lands in the ghost's slot with no second displacement (Task 2's contract). Every visual value is a `KNOB` for Nathan's pass.

**Files:**
- Modify: `Pommora/src/renderer/src/Detail/Views/Cards/CardsView.tsx` — the displacement wrapper in the card render, `GhostCard`, hover wiring on cards (`onHover` from the hook), the FLIP measure/apply/release helper (local to Cards; reads the feel tokens the engine reads).
- Modify: `Pommora/src/renderer/src/Detail/Views/Cards/CardsView.css` — `.ghost-card` chrome (all values KNOB), the wrapper class (no stylesheet `transform` transition — the FLIP owns its inline transition).
- Reference: `Pommora/src/renderer/src/design-system/interactions/engine.tsx` feel-token source; `tokens/motion`.

**Failure half:** anchor is the group's last card → ghost wraps to the next row; bands below join the FLIP set (E-3) · the view scrolled mid-dwell → dwell timers survive scroll, FLIP measures fresh rects at open · a re-emit dropping the anchor mid-open → `clearFor` (Task 9) · compact (banner-none) views → glyph placement KNOB, no thumb assumptions.

**Steps:**
- [ ] Build `GhostCard` + wrapper + FLIP helper; wire the hook with Cards' KNOB pair (`GHOST_DWELL_MS` shared value, Cards-specific grace covering the gap crossing — D-7).
- [ ] Suppress wiring: route the card-level native pops (card menu, value cell menu, banner menu) through the hook's handle via `cardApi` or a CardsView context — no four-layer drilling.
- [ ] Full gates green.
- [ ] CDP: dwell → ghost appears flow-after with displacement; leave → collapses back; click → creates, field opens, **no second shove** (screenshot pair proves the slot); menus stand the ghost down; drag arming kills it.
- [ ] The stationary-pointer live check (log's Live Check #1): rest the pointer, watch for re-anchor thrash during collapse — record the observation in the Log.
- [ ] Commit: `feat(cards): the ghost card — dwell extends a bordered slot, and neighbors make room`

#### Gate 4 — the ghost is Cards' own
- [ ] Gates green; simplification + review against `<base>..HEAD`; KNOB grep clean (dwell/grace/border/dim/glyph all marked).
- [ ] CDP matrix above green; the two feel items recorded as Nathan's pendings: the ghost CSS visual pass (D-6) and the dwell-appear-click feel under a real mouse.
- [ ] Concerns fixed or ruled; Progress hashes filled.

---

### Phase 5 — Reconciliation & Closeout

#### Task 11: The docs true up

**Requirement:** 10

**Why:** Everything the arc made false, rewritten where it lives (F-3, F-4; F-2/F-5 already landed with their code tasks). Product register, no session references.

**Files:**
- Modify: `.claude/Features/CardViewPM.md` (creation section mirroring TableViewPM's; the two stale lines out; the ghost-card law in), `.claude/Features/TableViewPM.md` (ghost paragraph points at the shared mechanism), `.claude/Features/ViewsPM.md` (creation entry trues to both views), `.claude/Features/InteractionPM.md` (only if the displacement minted a named alias), `.claude/ContextPM.md` (the inert-"+" line resolves out; Known Issues: the Set-Card flash line dies with its fix).

**Steps:**
- [ ] Rewrite each per the Made False table; `node scripts/check-atlas.mjs` from `Pommora/` — green (SOURCE tables untouched unless a token moved).
- [ ] Commit: `docs(pommora): cards creation lands in the record`

#### Task 12: Closeout — claim, verify, attack, record

**Requirement:** all

**Steps:**
- [ ] Purge sweep: scratch files, instrumentation, dead branches; Dead Vocabulary sweep (`renameOpen` → 0) against its control (`TextPicker` → ~14).
- [ ] Write the Delivery Claim (requirements → landed tasks, acceptance observed, no new dependency, no duplicated mechanism, no high-frequency work added).
- [ ] Dispatch the neutral verifier — claim vs the decision log + full commit range. Fix and re-claim on any no.
- [ ] Then dispatch the build-breaking-agent against the shipped range. Findings fixed, not filed (DONE_WITH_CONCERNS means fix).
- [ ] HistoryPM: PM-097 over the closed range; ContextPM Recent Work + §Immediate Work advances to the display-alias arc (the locked next).
- [ ] Lessons routed to `.claude/Guidelines` where durable; the Log's Closeout written.
- [ ] Final report: What Changed · Along the Way · Immediate Work · Final LOC (code-only) · verification evidence — with Nathan's two pendings named (ghost visual pass, live feel).

#### Gate 5 — nothing left but Nathan's eyes
- [ ] Acceptance criterion re-run whole and observed.
- [ ] Every Made False row landed in its named commit; sweep + control clean.
- [ ] Neutral verify then attack both ran as separate dispatches; every finding fixed or carrying a ruling.
- [ ] The only pendings are Nathan's: the ghost CSS visual pass and the live feel confirmation.

---

## Implementation Log

### Progress
- [ ] **Phase 1** — The Rename Fence · base ``
  - [ ] Task 1 — Owner-fence the rename slot · ``
- [ ] **Phase 2** — Order Correctness
  - [ ] Task 2 — Creation refreshes the live order; bandAdd tail · ``
  - [ ] Task 3 — Cards' local viewOrders write · ``
  - [ ] Task 4 — Cross-location landing index · ``
  - [ ] Task 5 — Set-Card flash: verify then fix · ``
- [ ] **Phase 3** — Cards Creation Surfaces
  - [ ] Task 6 — One "New Page" on the card menu · ``
  - [ ] Task 7 — Band "+" + flow-after create + stamping · ``
  - [ ] Task 8 — The empty naming field; one rename surface · ``
- [ ] **Phase 4** — The Ghost
  - [ ] Task 9 — Extract the mechanism; table refits · ``
  - [ ] Task 10 — The ghost card + FLIP · ``
- [ ] **Phase 5** — Reconciliation & Closeout
  - [ ] Task 11 — Docs true up · ``
  - [ ] Task 12 — Closeout · ``

### Rulings
### Open Against Later Tasks
### Deviations
### Lessons
### Sequenced After
- The set-card ghost — blocked on the container creation contract (positional order, un-gated naming law, a set-card rename entry point); the hook's anchor-not-row shape keeps it slot-in.
- The display-alias arc — the locked next focus, opening on this plan's completion criteria.
- Cards group-band drag — the `dragHandle` seam exists; a reorder arc, not creation.

### Closeout
