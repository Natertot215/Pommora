## Cards Creation Adoption — Implementation Plan

> **Status:** ratified — in execution (Nathan's go, 08-11-2026) · Spec: `.claude/Planning/Cards Creation Adoption — Decision Log.md` · Execute tasks in order.
> Rider: a sidebar row-hover-add sub-scope is being scoped in parallel; it joins as an addendum phase on its own review, shipping alongside.
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
11. *(Addendum, Nathan's instruction at execution start)* Dwelling on a sidebar page row extends a ghost "New Page" row beneath it; clicking creates below with the empty naming field opening in the sidebar (Phase 4b).

**Acceptance — the whole thing working:** In a grouped Cards view sorted on a **seedable criterion** (or unsorted) where a card was manually dragged earlier, each of the three triggers — band "+", card-menu New Page, ghost click — births a stamped Untitled page whose card appears at its gesture slot immediately and stays there through the confirming reload, with an empty naming field focused over it and the glyph intact; and renaming a Set from a table band with its sidebar row visible opens exactly one field that commits. Under a non-seedable criterion (Title, Modified, ID, text) the newborn lands where the comparator places "Untitled" — the ratified PM-096 behavior, not a defect. No single task satisfies this.

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
- The manual order is the **lowest-priority tiebreaker** — `pipeline/sort.ts` reaches it only after every resolved criterion ties, and `_title`/`_id`/`_modified_at`/text criteria aren't seedable → order writes can only place a newborn beside its anchor under seedable criteria or none; everywhere else the comparator's placement is the ratified behavior.
- Native Electron menus can be neither screenshotted nor operated by CDP (`Build-Gotchas.md`) → every gate item touching a native pop drives a DOM substitute or unit-tests the menu model, with the real picks on Nathan's live-confirmation list — PM-096's own resolution.
- `movePage` already carries `order?: string[]` ("Absent = legacy append") and the store's `moveSet` arm already patches order optimistically, while the `movePage` arm ignores it → the landing-index fix is passing and honoring an existing contract, not designing one.

**Inherited Reasoning** (ruled out in the log; do not retry)

- Phantom-slot inside the drag engine — couples creation chrome into a drag lifecycle; rejected.
- `DragGroup onDragStart` for the stand-down — still leaves the ghost in the grid at rect-freeze; the pointerdown stand-down replaced it.
- *Pure* caller-declared rename ownership — main's payload and the chrome-level creates carry no surface, so declaration alone can't fence; the design is hybrid — declared where the caller knows (the two context-menu sites), rank-resolved everywhere else.
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
| `CardViewPM.md:90` | "the Cards band's '+' stays a visual stub until the card chrome adopts it" | Task 7 arms it | 11 |
| `CardViewPM.md:94` | "Cross-band card drag" listed as unbuilt prospect | already ships; stale today | 11 |
| `TableViewPM.md` ghost paragraph | describes the machinery as the table's own | Task 9 extracts it shared | 11 |
| `ViewsPM.md` creation entry | creation is table-only | Tasks 6–8 | 11 |
| `ContextPM.md` (Important Information) | Cards "+" renders inert "until the card chrome adopts the creation engine" | Task 7 | 11 |
| `cardsBand.ts:3-5` comment | "create-page routing … deferred" | Task 7 | 7 |
| `CardsView.tsx` TextPicker mount comment | "Persistent mounts riding `open`…" (rename half) | Task 8 retires the mount | 8 |

**Dead Vocabulary**

- `renameOpen` in `CardsView.tsx` → expect 0 after Task 8. Legitimate hits: none.
- Control: `rg -F "TextPicker" Pommora/src/renderer/src` → 18 at planning time (the component survives; only the rename mount dies). Zero here means the sweep never ran.

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
- `rg -Fl "RenamableTitle" Pommora/src/renderer/src` → 3 files at planning time (`Components/RenamableTitle.tsx`, `Sidebar/Sidebar.tsx`, `Detail/Views/GroupBand.tsx`) — `RenamableTitle` is the sole field-mounter; the sidebar's two direct `renamingPath` reads (the settle-click capture and the force-open selector) read and never mount.
- Control: `rg -F "renamingPath" Pommora/src/renderer/src` → 14 at planning time. Zero means the search never ran.

**Interfaces**
- Produces: a **subscribed owner slot**, not a query — `renameOwner: RenameHost | null` in the store; `claimRename(path, host)` / `releaseRename(path, host)` register into a ranked claimant list that resolves the owner; `RenamableTitle` gains a `host` prop, subscribes, and mounts the input **iff `renameOwner === host`**. A boolean return cannot fence: effects run in tree order, so an earlier claimant's `true` can't be revoked by a later winner — losers must be *subscribed* to demotion. `RenameHost = 'detail' | 'sidebar'`.
- Assumed by: Task 8 (Cards mounts with `host: 'detail'`).

**Failure half:** a claim for a path that isn't `renamingPath` → refused, no state; the winner unmounting mid-rename → release **defers its verdict a microtask**, then — only if the path is still `renamingPath` and no claimant survives — calls `cancelRename()`. The deferral is load-bearing: an *immediate* cancel-on-release fires inside React StrictMode's simulated remount (the app's root is `<React.StrictMode>`, so every dev mount runs setup → cleanup → setup in one act) and kills every rename on first try — while a bare-`createRoot` unit test stays green over the dead feature. After the microtask, a genuinely surfaceless rename is abandoned, never teleported (a transfer would focus-steal into the sidebar with the title selected, and a create-origin session would reopen empty). Test both: the StrictMode double-mount survives; a real unmount cancels.
- **Origin hint:** the two context-menu callers are *not* surface-blind — `Sidebar.tsx` and `TableGroupBand.tsx` each know exactly which surface they are; only main's payload drops it. `ContextTarget` gains `host?: RenameHost`, the callers declare it, main echoes it through the `begin-rename` push, and the store prefers a declared host over rank — so a sidebar-origin rename opens in the *sidebar*, not the outranking table band. Rank remains the resolver for the genuinely blind callers (`createFromMenu`, `newPageAdjacent`, main's create push), where the field belongs wherever the row renders.

**Negative control:** the dual-mount test (sidebar row + band field on one path) asserts exactly one input mounts and typing commits; with the fence disabled (claim always true) the same test shows both mounting and zero surviving — assert that inversion once, then delete the disabled-path assertion.

**Steps:**
- [x] Write the failing test: two `RenamableTitle`s on one path, distinct hosts — expect one input, focused; typing + blur commits the rename; the loser renders plain text.
- [x] Run it — expect failure (both mount today). *(6 of 7 red; the create-origin case reproduced the live annihilation — zero inputs survived.)*
- [x] Implement the claim slot + fence; re-run — expect pass.
- [x] Full gates — green (208 files / 2,326 tests; the band-menu payload test updated for the new `host` field in the same commit).
- [x] Commit: `fix(rename): the slot gains an owner fence — one field ever mounts`

#### Gate 1 — one field, ever
- [x] Gates green, exit codes direct (2,333 tests at gate close).
- [x] Derivations re-run against controls; counts matched (3 files / 14).
- [x] Simplification (`d701a54c`) + review dispatched; the review's three findings all folded: main's create push now carries the host (`247412e0`), the release verdict judges the released claim's own path — red-first test reproduced the successor-kill race — and the context-group menu declares its surface.
- [ ] CDP against the Test nexus: enter the rename via `window.__pommora.getState().beginRename(setPath)` through `Runtime.evaluate` (the dev-only drive seam; the native menu itself isn't CDP-drivable) with the set's sidebar row visible — one field opens, commits, no flicker. Also probe the unknown: with a field open, right-click a *different* row — the first field must not survive the transition. (The log's Live Check #2.)
- [ ] Progress hashes filled in.

---

### Phase 2 — Order Correctness

#### Task 2: Creation settles the live order in its own act

**Requirement:** 7

**Why:** `manualOverride` outranks `viewOrders` and no create refreshes either live copy — the table flashes a frame of wrong placement (the `[source]` reset self-heals), Cards would hold it forever. E-4's motionless handoff is impossible until creation settles the live order in the act that writes it (A-5). `bandAdd` deliberately gets **no** order tail: the band-add ruling is "born at the pipeline's end of the group," and an id absent from the manual order already ranks last within its band — the ruling's exact placement, delivered by the ranking itself.

**Files:**
- Modify: `Pommora/src/renderer/src/Detail/Views/Table/TableView.tsx` — both create completions **splice, never clear**: `tieOrderWith` places the newborn into the live arrays (`manualOverride`, the local `viewOrders[view.id]`) in the same act. Clearing was the first design and it destroys order the user owns — in structural + location-grouped state the manual array is the *sole* comparator, so a clear reshuffles the whole view while the surviving wire copy brings the discarded order back on next open. The structural/non-structural split decides only which *canonical* channel the disk write targets.
- Test: `Pommora/src/renderer/src/Detail/Views/creationOrder.test.ts` (or the sort pipeline's test home — locate first).

**Interfaces**
- Produces: no new exports — a behavioral contract: *every create that writes an order leaves the live order state (`manualOverride`, local `viewOrders`) consistent with it in the same React act.* Task 7 carries it into the shared creation hook.

**Failure half:** no prior drag (`manualOverride` null, no `viewOrders` entry) → refresh is a no-op, nothing regresses; a create with no order write (unsorted structural, band-add) → untouched; the confirming reload → agrees with the refreshed state.

**Steps:**
- [ ] Write the failing test: seed a manual order and a stale `viewOrders` array, run the create's order logic, assert the resolved on-screen order places the new row at its slot in the *first* pass — both the override path and the fall-through path.
- [ ] Implement both refresh sites; test green.
- [ ] Full gates — green.
- [ ] Commit: `fix(order): creation settles the live order in its own act`

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

**Why:** The contract already exists and nobody drives it: `movePage` carries `order?: string[]` ("Absent = legacy append"), but Cards' `canRelocate` branch discards `toIndex` and calls it bare, the **table's own `relocateRow` does the identical thing** (the unswept sibling), and the store's `movePage` optimistic arm ignores `req.order` entirely — unlike the `moveSet` arm three lines below, which patches order via `reorderChildrenInTree`. A renderer-only fix would persist the right order while the card still visibly appends until the confirming walk (A-4).

**Files:**
- Modify: `Pommora/src/renderer/src/Detail/Views/Cards/CardsView.tsx` — `onCardDrop`'s relocate branch builds the destination's full-membership order with the drop at its index and passes it.
- Modify: `Pommora/src/renderer/src/treeMove.ts` — **`reorderPagesInTree(tree, parentPath, order)` is a new ~8-line helper**: no pages-side reorder exists (`reorderChildrenInTree` orders `sets`/collections only, and fed page ids it returns a *non-null, unreordered* tree — a silent no-op an executor would ship). Build it over the existing private `byOrder` + `updateNodeInTree`.
- Modify: `Pommora/src/renderer/src/store.ts` — the `movePage` optimistic arm composes `relocateNodeInTree` + `reorderPagesInTree` (the `moveSet` arm's shape, with the pages helper).
- Modify: `Pommora/src/renderer/src/Detail/Views/Table/TableView.tsx` — `relocateRow` passes its order the same way (the sibling sweep).

**Failure half:** a drop into an empty destination → order array of one; hidden (filtered-out) members of the destination → the array builds from full membership, never the filtered view — in Cards, before Task 7's hook exists, that source is `flattenContainer(source, effectiveValues).rows` filtered to the destination path (the shape `TableView`'s `allIds` uses), **never** the filtered `groups`; `order` absent (legacy caller) → main falls back to *title* order (not append — the contract comment's word, the handler's truth), unchanged.

**Steps:**
- [ ] Write the failing test at the store-arm level: `movePage` with `order` → the optimistic tree names the moved id at its slot.
- [ ] Implement all three sites; test green; full gates green.
- [ ] Commit: `fix(views): a cross-location drop keeps its landing index`

#### Task 5: The Set-Card drag flash — verify the cause, then kill it

**Requirement:** 9

**Why:** The Known Issue ("drop snaps back, then jumps on reload"). **No standing hypothesis** — the log's first guess (no optimistic set order) is refuted: the store's `moveSet` arm patches order optimistically via `reorderChildrenInTree`, with a comment naming the exact snap-back it exists to prevent. The cause is undiagnosed; this task diagnoses before fixing, and a design-shaped fix stops for a Ruling (A-4).

**Files:**
- Read first: `Pommora/src/renderer/src/store.ts` — the `moveSet` optimistic arm (does `reorderSets` actually reach it, and with what `order`?); then `Pommora/src/renderer/src/Detail/Views/Cards/CardsView.tsx` `reorderSets`; `Pommora/src/renderer/src/treeMove.ts` `reorderChildrenInTree`; the main handler.
- Modify: whatever the verified cause names.

**Steps:**
- [ ] Trace the reorder round-trip; write the cause into the Log (Deviations if it contradicts the hypothesis; a Ruling request if the fix is design-shaped).
- [ ] Fix with a failing test first at whatever layer the cause lives.
- [ ] Full gates green; CDP: drag a set-card — no snap-back, no reload jump.
- [ ] Commit: `fix(cards): the set-card drop lands once`

#### Gate 2 — order is settled everywhere
- [ ] Gates green; derivations re-run; simplification + review against `<base>..HEAD`; KNOB grep clean.
- [ ] CDP matrix in the Test nexus (native menus aren't CDP-drivable — DOM substitutes throughout): (drag → the table ghost's click, which runs the same Below path as the menu → row lands adjacent, no flash) · (drag → band "+" under a sort → lands at the group's end, first paint) · (cross-location card drop → lands at index) · (set-card drag → clean). The native picks themselves ride Nathan's live-confirmation list.
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

**Must agree:** the grip and title-cell menus still emit the exact pair (existing tests assert the labels); the card menu emits exactly one "New Page". One builder produces those three — assert the three shapes in one test file. The **sidebar's pair is a fourth, separate writer**: `main/contextMenu.ts` hand-builds the same two labels in the main process — a found duplicate the Hard Rules require reporting. Reported here; folding main onto the shared labels goes to Sequenced After (main can import from `shared/`), not this task.

**Steps:**
- [ ] Failing tests: card model shows one "New Page"; pair surfaces unchanged.
- [ ] Implement the option shape; tests green; full gates green.
- [ ] Commit: `feat(cards): the card menu carries New Page`

#### Task 7: The creation engine gets one home — and Cards consumes it

**Requirement:** 2, 3

**Why:** The engine is view-agnostic at the store/pipeline layer; what the table holds is ~110 lines of view-local wiring in closures (`patchSeedValues`, `createPageIn`, `containerPagesOf`, `bandAdd`, `newPageAdjacent`, glide). Copying them into CardsView would leave two hand-written definitions of the creation wiring — the exact two-writers defect the Hard Rules require reporting, and Task 12's "no duplicated mechanism" claim would be false the day it's written. So this task mirrors Task 9's shape: **extract the closures into a shared creation hook, refit the table onto it, and wire Cards as its second consumer** — band "+" (collapsed-band disclosure + glide), the flow-after create for the menu item, stamping and Task 2's order contract riding inside the hook once. Cards-specific inputs: its `setValueOverride`/`applyValueAtRoot` value seam, and the row→band map it doesn't have (built from `groups`, since Cards flattens and holds no `rowGroup`).

**Files:**
- Create: `Pommora/src/renderer/src/Detail/Views/useViewCreation.ts` — the hook: seeds (group + seedable sort criteria + filter implications), order writes with Task 2's live-state contract, create-then-name completion, glide targeting.
- Modify: `Pommora/src/renderer/src/Detail/Views/Table/TableView.tsx` — the closures move out; the table consumes the hook (refactor: behavior-preserving, the Phase 2 tests are the baseline).
- Modify: `Pommora/src/renderer/src/Detail/Views/Cards/CardsView.tsx` — consume the hook; `onAdd` passed at the `GroupBand` call site; the menu router arm; the row→band map.
- Modify: `Pommora/src/renderer/src/Detail/Views/Cards/cardsBand.ts` — the deferral comment dies with the routing (Made False).
- Reference: `Pommora/src/renderer/src/Detail/Views/pipeline/creationSeeds.ts`.

**Interfaces**
- Produces: `useViewCreation({ source, view, schema, effectiveValues, rowBand, structuralOrder, orderState, onCreated }) => { bandAdd(setKey), createAfter(row), createAdjacent(row, where) }` — exact parameter shape is the implementer's, but the hook owns seeds + order + naming completion, and both views call it. **Cards passes `structuralOrder: false`, always** — the table's predicate selects its page_order-vs-viewOrders drag channel, but Cards' live order is only ever `viewOrders` (it has no page_order writer), and the table-computed predicate reads *true* for an unsorted Cards view, which would route creates onto a channel Cards never reads and land every newborn last. Task 10's ghost click consumes `createAfter`.

**Failure half:** band-add on a collapsed band → discloses first, then creates (the table's law); a filter excluding the newborn → creates on disk, card stays hidden, app healthy (the Obsidian behavior); an empty group → band-add still creates at slot 0; a menu create on a card whose group is non-stampable (date bucket) → no group seed, order still honored.

**Steps:**
- [ ] Extract the hook; refit the table; full gates green with Phase 2's tests as the unchanged baseline. Honesty note: the group-value + sort-criteria seed assembly is inline and untested today — the extraction is its first test seam, and Gate 4's deferred `createAfter` check is its running-app net.
- [ ] Build Cards' row→band map from `groups`; wire Cards through the hook; arm `onAdd`; route the menu arm to `createAfter`.
- [ ] Failing test at the seed layer for the cards-shaped map; engine-level creation tests already cover seeds+order — verify they run.
- [ ] Full gates green.
- [ ] Commit: `feat(views): creation wiring has one home — and Cards' band + creates`

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
- [ ] CDP in the Test nexus: band "+" (grouped, collapsed, filtered-derivable, filtered-excluded) · empty field: born-empty-focused, Esc→Untitled, collision→"Name 2", glyph never vanishes. The card-menu create's seeds + adjacency can't be driven here (native menu, and no DOM substitute exists until the ghost lands) — that check moves to Gate 4, driven through the ghost's `createAfter` path; the menu model itself is Task 6's unit test.
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
- Produces: `useGhostAnchor({ dwellMs, graceMs, suppressed }) => { anchor, closing, onHover(id, entering), onGhostEnter/Leave, take(), closed(), suppress: { wrap<T>(fn): Promise<T>, hold(): () => void }, clearFor(id) }`. `closed()` is the exit-finished call — the table's `Reveal.onCollapsed` and Cards' FLIP-release both drive it; without it a closing ghost never unmounts. `suppressed` is **mirrored into a ref and re-read at the dwell timer's fire time** — a closure over the option value is stale, reintroducing the shipped mid-dwell bug the table's `editingRef` comment records fixing.
- Assumed by: Task 10 (Cards), the refitted TableView.

**Negative control:** the D-10 regression test goes red against the pre-extraction semantics (stranded `closing` → re-hover opens with no dwell) — assert the old behavior fails under the new hook once, then keep only the green assertion.

**Steps:**
- [ ] Write the hook tests first (fake timers; the house `createRoot` + `act` idiom, no testing-library) — dwell arms · leave-grace closes · re-enter reverses · **a suppressor arriving mid-dwell cancels the pending open** · pointerdown stands down · anchor-loss clears state · `closed()` unmounts. Expect module-not-found.
- [ ] Implement the hook; tests green.
- [ ] Refit TableView; delete the inline machinery; full gates green. Honesty note: no ghost tests predate this task — the hook tests plus the CDP pass *are* the baseline net, so drive the CDP items before calling the refit behavior-preserving.
- [ ] CDP: table ghost unchanged — dwell-appear, leave-collapse, reverse mid-exit; the native-menu stand-down is unit-tested at the hook level (CDP can't pop native menus) and rides Nathan's live list.
- [ ] Commit: `refactor(views): the hover ghost mechanism has one home`

#### Task 10: The ghost card — chrome, FLIP displacement, motionless handoff

**Requirement:** 6

**Why:** Cards' own effect on the shared mechanism (D-2–D-7, E-1–E-4): a real grid item at the flow-after slot (placement, row-height, track sizing free), a ghosted bordered card — heavier border than `--border-cell`, no content, the `.page-card-ph` page-icon glyph treatment — entering and leaving by FLIP over the group's affected cards and the bands below, on the drag shift's feel tokens, transforms riding a dedicated wrapper between drag-shell root and hover-pop body. Click runs `createAfter` through `take()`; the real card lands in the ghost's slot with no second displacement (Task 2's contract). Every visual value is a `KNOB` for Nathan's pass.

**Files:**
- Modify: `Pommora/src/renderer/src/Detail/Views/Cards/CardsView.tsx` — the displacement wrapper in the card render, `GhostCard`, hover wiring on cards (`onHover` from the hook), the FLIP measure/apply/release helper (local to Cards; reads the feel tokens the engine reads).
- Modify: `Pommora/src/renderer/src/Detail/Views/Cards/CardsView.css` — `.ghost-card` chrome (all values KNOB), the wrapper class (no stylesheet `transform` transition — the FLIP owns its inline transition).
- Reference: `Pommora/src/renderer/src/design-system/interactions/engine.tsx` feel-token source; `tokens/motion`.

**Failure half:** anchor is the group's last card → ghost wraps to the next row; bands below join the FLIP set (E-3) · the view scrolled mid-dwell → dwell timers survive scroll, FLIP measures fresh rects at open · a re-emit dropping the anchor mid-open → `clearFor` (Task 9) · compact (banner-none) views → glyph placement KNOB, no thumb assumptions · a non-seedable sort active → the newborn lands where the comparator puts it (ratified PM-096 behavior; the motionless-handoff screenshot is gated on a seedable sort or none).

**Steps:**
- [ ] Build `GhostCard` + wrapper + FLIP helper; wire the hook with Cards' KNOB pair (`GHOST_DWELL_MS` shared value, Cards-specific grace covering the gap crossing — D-7). **FLIP deltas are measured in client px and applied inside the zoomed subtree** — `.cards-view` carries a live CSS `zoom`, so divide by the `effectiveZoom` CardsView already computes for its drag overlay.
- [ ] Suppress wiring: route the card-level native pops (card menu, value cell menu, banner menu) through the hook's handle via `cardApi` or a CardsView context — no four-layer drilling.
- [ ] Full gates green.
- [ ] CDP: dwell → ghost appears flow-after with displacement; leave → collapses back; click → creates, field opens, **no second shove** (screenshot pair proves the slot, under a seedable sort or none); drag arming kills it. Native-menu stand-down is hook-tested; the pops themselves ride Nathan's live list.
- [ ] The stationary-pointer live check (log's Live Check #1): rest the pointer, watch for re-anchor thrash during collapse — record the observation in the Log. While there, check whether the drag engine's own displacement drifts under a non-1 view scale (`toBox` measures client px with no zoom compensation) — if it does, that's an inherited Known Issue to record, not this arc's fix.
- [ ] Commit: `feat(cards): the ghost card — dwell extends a bordered slot, and neighbors make room`

#### Gate 4 — the ghost is Cards' own
- [ ] Gates green; simplification + review against `<base>..HEAD`; KNOB grep clean (dwell/grace/border/dim/glyph all marked).
- [ ] CDP matrix above green, plus Gate 3's deferred check: `createAfter` under a seedable sort → seeds + adjacency proven at first paint.
- [ ] The pendings recorded as Nathan's: the ghost CSS visual pass (D-6), the dwell-appear-click feel under a real mouse, and every native-menu pick (card New Page, grip/title pair, set-band Rename).
- [ ] Concerns fixed or ruled; Progress hashes filled.

---

### Phase 4b (Addendum) — The Sidebar Ghost

*Folded from the parallel scoping run on Nathan's instruction ("ships alongside"). The sidebar is the smallest ghost consumer: same `Reveal` primitive, one-dimensional row flow, no FLIP, no zoom, and the create path — `store.newPageAdjacent` — is already the sidebar's own function with a positional optimistic insert (`insertCreatedInTree` honors the slot on first paint; Task 2's live-order problem does not exist here — the sidebar has no sort, filter, or manual order).*

#### Task 13: The sidebar ghost — a GhostLeaf on the shared mechanism

**Requirement:** 11

**Why:** Dwelling on a sidebar page row extends a ghost "New Page" row beneath it on the ghost's own `Reveal` (the sidebar has no per-row motion to conflict with; the table's GhostRow mounts its own Reveal the same way); clicking runs `newPageAdjacent(anchorPath, 'below', 'sidebar')` — the naming field opens in the sidebar via the fence's declared host. Sidebar-specific law: **pointerdown outside the ghost hard-clears synchronously (unmount, no exit animation)** — every sidebar row is a drag source and the drag engine snapshots every row rect *once* at activation with no invalidation hook for a collapsing ghost, so an animated exit corrupts the whole drag's geometry. Collections mode only (the other ribbon modes have no page rows), and a mode switch `clearFor`s the ghost — the cross-fade unmounts without a transition, which would strand a `closing` state.

**Files:**
- Modify: `Pommora/src/renderer/src/Sidebar/Sidebar.tsx` — `GhostLeaf` (~40 lines echoing `Leaf`: a `MenuItem className="row"` at the anchor's depth, `twistySpacer` lead, the default page glyph as `row-icon`, literal "New Page" at `--state-inactive`, its own `Reveal`, `onPointerEnter/Leave`, click; **not** wrapped in `DragRow` — no drag registration, no disclose hook); a ghost context provider whose value is identity-stable (handlers via refs, the anchor id in its own narrow subscription — a per-dwell provider-value rebuild would reconcile every mounted row, the exact "never on every X" violation); `PageRow` wiring + memoization.
- Modify: `Pommora/src/renderer/src/Sidebar/Sidebar.css` — the ghost row treatment, all values KNOB.
- Anchor resolution rides the existing `dndIndex` (`byId` carries path/depth/parent) — which is also the anchor-liveness check, free.
- KNOBs: the sidebar gets **its own dwell** (default meaningfully longer than the table's — the sidebar is a transit surface the pointer crosses constantly, not a surface being edited) and its own grace; both `KNOB` for Nathan.

**Failure half:** a tree re-emit dropping the anchor → the `dndIndex` miss clears the ghost (state, not just render); a mode switch mid-ghost → `clearFor`; the `'bottom'` set-placement wrinkle (pages render above the Sets block, so a last-page ghost sits above the folders) → accepted and recorded — Nathan adjusts if it reads wrong; no scroll-into-view when the ghost opens at the scroller's bottom edge → inherited from the force-open-on-rename path, noted, not fixed here.

**Steps:**
- [ ] Build `GhostLeaf` + provider + `PageRow` memoization; wire the shared hook with the sidebar KNOB pair and the hard-clear pointerdown law.
- [ ] Full gates green.
- [ ] Commit: `feat(sidebar): the ghost row reaches the sidebar — dwell extends New Page below`

#### Task 14: The sidebar's menus stand the ghost down

**Requirement:** 11

**Why:** The table's suppress works because its menu channels resolve on dismissal; the sidebar's `context-menu` channel resolves **at pop** (`showContextMenu` ends in a bare `.popup()`), so `suppress.wrap()` would release the instant the menu opens and the ghost could grow behind a native menu. Fix at the source: the popup gains Electron's dismissal `callback`, making the channel resolve on close — safe, since every existing caller is fire-and-forget `void`. Then the sidebar's menu sites route through the hook's suppress handle via the provider (the pop sites are module-level functions, so the handle arrives by context, never by wrapping call sites).

**Files:**
- Modify: `Pommora/src/main/contextMenu.ts` — `showContextMenu`'s popup resolves on dismissal.
- Modify: `Pommora/src/renderer/src/Sidebar/Sidebar.tsx` — the three menu sites (`showContextFor`, the Context-group body create, the mode-body create menus) hold suppression through the provider.

**Steps:**
- [ ] Add the dismissal callback; route the three sites; hook-level suppression test covers the semantics.
- [ ] Full gates green.
- [ ] Commit: `fix(sidebar): native menus hold the ghost down until they close`

#### Gate 4b — the sidebar ghost stands
- [ ] Gates green; simplifier + review against the phase range; KNOB grep clean.
- [ ] The consolidated CDP pass (see Rulings) covers: sidebar dwell → ghost below the anchor at its depth; click → create lands at slot with the empty field *in the sidebar*; pointerdown hard-clear; mode-switch clear.
- [ ] Nathan's live-feel items recorded: the transit-surface dwell feel (the honest kill-signal — if the sidebar "sprouts rows while reaching for a drag," the KNOB lengthens or the affordance dies), and the two-dwell coexistence with drag-disclose (500ms vs the ghost's).

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
- [ ] Purge sweep: scratch files, instrumentation, dead branches; Dead Vocabulary sweep (`renameOpen` → 0) against its control (`TextPicker` → 18).
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
- [x] **Phase 1** — The Rename Fence · base `1fb17f84` · gate closed at `247412e0` (CDP items ride the consolidated pass, per Rulings)
  - [x] Task 1 — Owner-fence the rename slot · `a32d886b` + simplifier `d701a54c` + host-through `60884995` + review folds `247412e0`
- [x] **Phase 2** — Order Correctness · base `e9507b47` · simplifier `084c7b25` · gate review folded at `873a1a6f` (relocates splice the live orders; a failed set move clears its override; sub-set landing limit recorded in Open Against Later Tasks)
  - [x] Task 2 — Creation settles the live order in its own act · `19698f48`
  - [x] Task 3 — Cards' local viewOrders write · `3816247f`
  - [x] Task 4 — Cross-location landing index · `3816247f`
  - [x] Task 5 — Set-Card flash: verify then fix (cause: reply-gap timing, not a missing patch) · `24e17cf5`
- [ ] **Phase 3** — Cards Creation Surfaces · base `247412e0`
  - [x] Task 6 — One "New Page" on the card menu · `0c0d8f5b`
  - [x] Task 7 — The creation hook: one home, Cards consumes · `3a7f7c56`
  - [x] Task 8 — The empty naming field; one rename surface · `a744563e`
- [x] **Phase 4** — The Ghost · base `50f7b26a` · simplifier `3d33f8b9` · gate review folded at `511fc0b3` (stable suppress context value; the create flag set after its guard; Cards band-adds settle the tiebreaker so the newborn ranks last-in-band — the read-side title fallback was ranking it mid-band)
  - [x] Task 9 — Extract the mechanism; table refits (10 hook tests) · `59bddcbb`
  - [x] Task 10 — The ghost card + FLIP · `baefb115`
- [x] **Phase 4b** — The Sidebar Ghost (Addendum) · rides Phase 4's gate
  - [x] Task 13 — GhostLeaf on the shared mechanism · `26a7b585`
  - [x] Task 14 — Sidebar menus stand the ghost down (main's popup resolves on dismissal) · `26a7b585`
- [ ] **Phase 5** — Reconciliation & Closeout
  - [ ] Task 11 — Docs true up · ``
  - [ ] Task 12 — Closeout · ``

### Rulings
- **CDP passes batch into one consolidated acceptance run at the end of Phase 4b** (one dev-instance launch covering every gate's named CDP items plus the acceptance criterion), applying Nathan's standing defer-UIX-verification-to-plan-end preference; per-phase gates still run gates/simplifier/review at their own points. The running instance from PM-096's close is left untouched until then.

### Open Against Later Tasks
- **Known limit (gate-2 review, wontfix):** a card dropped *before a sub-set's cards* in a flattened structural band appends to the direct-children segment instead — no `page_order` can seat a direct child between sub-set pages under the flatten law; the DnD preview promises a slot the model can't hold. Recorded, not fixed.
### Deviations
- **Task 5's verified cause — timing, not absence.** The optimistic set-order patch exists (the `moveSet` arm), but `store.mutate` awaits the IPC reply before patching, while the drop's zone transforms release synchronously — the row re-renders in the old order for the reply gap (the snap), then corrects (the jump). Fixed with the table's own pattern: a synchronous `setOrderOverride` in CardsView, cleared when a fresh `source` identity carries the canonical order (`24e17cf5`). The plan's first hypothesis (no optimistic patch) was already withdrawn at review; this is the second-layer truth.
- **Accepted drift (gate 3-4 review):** `createAdjacent`'s completion re-reads the config at IPC-reply time, so a sub-100ms view switch between the create click and the reply would write the splice into the switched-to view's tiebreaker — practically unreachable by mouse; the fresher read is strictly better everywhere else. Recorded, not fixed.
- **Format note:** `npx biome check` reports pre-existing indentation deviations on the nested JSX providers (Sidebar ×3, CardsView ×1) that the PostToolUse hook didn't reflow; `npm run lint` (the gate) is clean. Left for the standing never-run-Biome-manually rule — flag for Nathan if the files' next real edit doesn't absorb them.
- **Task 1 divergence — `newPageAdjacent` needed the fence's host** (found by the sidebar scoping run): the shipped New Page Above/Below began its rename host-blind, so a sidebar-origin create whose page is also visible in an open table view would open its field in the detail pane. The `new-page-adjacent` push now echoes `ContextTarget.host` through to `beginRename` (`60884995`). The plan hadn't named this consumer; the fence's Derivation only swept field-*mounters*, not `beginRename` *callers* — the lesson rides below.
### Lessons
- A fence over a shared slot must sweep the slot's *writers*, not only its readers: the Derivation enumerated field-mounters and missed the `beginRename` caller that decides where the field opens. Enumerate both ends of a slot when fencing it.

### Sequenced After
- The set-card ghost — blocked on the container creation contract (positional order, un-gated naming law, a set-card rename entry point); the hook's anchor-not-row shape keeps it slot-in.
- The display-alias arc — the locked next focus, opening on this plan's completion criteria.
- Cards group-band drag — the `dragHandle` seam exists; a reorder arc, not creation.
- Main's hand-built New Page pair (`main/contextMenu.ts`) folding onto the shared `pageMenu` labels — the found fourth writer Task 6 reports; `shared/` is importable from main.
- The drag engine's possible zoom drift (`toBox` measures client px, no compensation) — checked as an observation in Task 10; if inherited, it's a Known Issue entry, not this arc's fix.

### Closeout
