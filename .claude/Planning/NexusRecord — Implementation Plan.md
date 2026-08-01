## NexusRecord — Implementation Plan

> **Status:** ratified — in execution · Spec: [[NexusRecord — Decision Log]] · Execute tasks in order.
> Citations name files and symbols; re-derive before editing.

**Goal**

Pommora gains the ability to answer *where was this* — in two independent halves. **Provenance:** every delete writes one paired JSON beside the trashed artifact recording what departed and where it belonged (by id, never by name), and a restore resolves that pair against the *current* tree, so a page trashed from a folder that has since been renamed goes home to the renamed folder. **Baseline:** every open compares what the walk sees against what the last session's walk saw, records the drift silently, and uses the prior baseline to adjudicate duplicated ids — the copy re-mints, the original keeps everything keyed to it.

This shape was settled over four adversarial review rounds. The pair lives *beside* the artifact rather than inside it (one mechanism for every kind including sidecar-less Contexts; no lock against the autosave; no strip pass on restore) and rather than in a central document (`.nexus/` is watched, a per-gesture rewrite buys re-walks, and central entries with no consumer never get spent). The baseline lives in `nexus.db` because it is derived and per-machine. Restore joins on the resolver's **final** titles, never recorded ones, because title uniqueness holds only at a moment. Nathan ratified: ids-never-names on any stored location · compare silent · duplicates re-mint with the baseline as adjudicator · Context records carry `{id, title}` Spaces · the feature absorbs its adjacent residue now.

Deliberately not solved here: content versioning, un-adopted entities, sync conflict, system-trash-mode restore, block tiles, agenda kinds, any browse surface (Prospects all).

**Requirements** (the spec's Core, numbered)

1. The pair: shape, parent union, per-kind payloads, artifact-less variant, written best-effort by the delete arm from four gather points.
2. The resolver: a placement with final names, or a typed refusal.
3. A minimal restore path that spends pairs.
4. The baseline projection, the open path's one explicit walk, the union-diff with three-state existence, the last-non-empty drift row.
5. The duplicate-id re-mint at open — content and container — baseline-adjudicated, evidence-preserving, refusing when it cannot adjudicate.
6. Consolidation: the Delete snapshot absorbed (F-2) · residue removed (F-3) · one reconciliation loop (F-4) · one tuple owner (F-5) · the sweep never strips a passenger (G-1a) · the sweep widened honestly (G-2).

**Acceptance — the whole thing working** (no single task satisfies it): On a fixture nexus, in one sequence: a page is trashed, its parent Set renamed, and the restore op places it in the renamed Set · a Space tagged on three pages is deleted and restored through the op, and the surviving pages carry its tag again · a page and a whole Collection are file-copied, and after two opens each copy holds a fresh id while every original keeps its id, folds and order slot · the drift row names what changed between the opens. All gates green, entirely headless — no surface exists to check.

**Forced By**

- The delete arm's real order is sweep → registry erase → move (`mutate.ts`), and frontmatter stores Space titles while G-3 requires `{id, title}`, with title→id resolution closing at the registry erase → the four gather points are fixed: the scoped id read before the sweep, the registry entry before the erase, membership during the sweep, the pair name after the move.
- `trashWithTimestamp` returns the final de-collided destination → the pair name derives from the return value, nowhere else.
- `.nexus/` is watched; `nexus.db` is ignored (`watcher.ts` `ignoredUnder`) → the baseline is a db row, never a `.nexus/` file.
- `prepareOpenedNexus` holds no tree → the open path gains its own explicit walk; it cannot piggyback.
- The walk assigns `adopted-` ids to un-adopted entities → the projection filters them or every excluded folder reports as churn.
- An emptied value deletes its key project-wide → the diff runs over the union of keys with absence first-class.
- `contextValues` on nodes hold Space ids → a Space re-mint must re-run the attach pass, not hand-patch one node.
- `blockDoc` rows key `space:<id>` and hold authored layout → a container re-mint re-keys rows or silently empties a board.
- Registry order is array position → a restored Context appends; no stored position.
- Zero `property_cache` blocks exist on either live nexus (verified) → no migration machinery anywhere.

**Inherited Reasoning** (tried and ruled out — do not retry)

Central `.nexus/record.json` · provenance written into the artifact's frontmatter · per-mutation baseline hooks · git as the mechanism · title as a join key · a stored registry position · an append-only ledger · absorbing the Remove cache's storage or the rename journal (each a different mechanism; see spec F-6). The spec's Considered & Rejected carries the reasons; every one was execution-tested.

**Grounding** (re-open these; don't cite them)

- [[NexusRecord — Decision Log]] — the settled spec; every task's Why traces to its decision ids.
- `src/main/mutate.ts` — the delete arm, `removeViaMode`, `createDisambiguated`.
- `src/main/io/atomicWrite.ts` — `trashWithTimestamp`, `atomicWriteFile`, `writeJson`, strict/lenient readers.
- `src/main/crud/contextCascade.ts` — `sweepContextRoots` + wrappers; the four `cascade.ok` branches.
- `src/main/crud/removeProperty.ts` — `restoreCachedValues`, the loop F-4 extracts.
- `src/main/crud/deleteProperty.ts` — the snapshot F-2 absorbs.
- `src/main/index.ts` — `adoptNexusInner`, launch-restore, `prepareOpenedNexus`, `openSessionDb` order.
- `src/main/readNexus.ts` — the walk, the attach pass, `readPageRecord`.
- `src/main/db/localState.ts` — the `Scope` union (9 members), `writeKey`/`readScope`.
- `src/renderer/src/treeIndex.ts` — `NodeRecord`, the shape F-5 aligns.
- `src/shared/identity.ts` · `src/main/ids.ts` — `KIND_ID_KEY`, `isUlidShaped`, `newId`, `adoptedId`.
- `Guidelines/Build-Gotchas.md` before any GUI run.

**Environment:** Plan dir `.claude/Planning/` · spec above · explorer: Explore (none designated) · attack: `build-breaking-agent` (designated) · code review: general-purpose scoped to correctness (none designated — deliberate fallback) · verifier: general-purpose · simplification: `code-simplifier` + comment pass `comment-killer-agent` (designated) · gates below · rules `Guidelines/` · reviews as standard agents, never Workflow.

**Shapes:** additive (module, ops, baseline — failing test first) · fix (G-1a, with sibling sweep) · removal (F-3 residue, compiler-enumerated) · live-data (never run against a real nexus; fixtures + `TEST_NEXUS_PATH` only). No user-visible surface ships — every trigger is sequenced after.

**Global Constraints (every task inherits):**
- Gates from `Pommora/`, exit codes read directly, never piped: `env -u ELECTRON_RUN_AS_NODE npm run typecheck` · `npx biome lint src` (0 warnings) · `npx vitest run` · `env -u ELECTRON_RUN_AS_NODE npm run build`. Baseline 174 files / 1904 tests — additive only.
- Biome formats on write; never run it, never hand-align. Comments why-only, no value restatement, no plan references. `KNOB`/`(Nathan's call)` markers survive.
- Explicit-path staging; commit per task; docs ride the commit that falsifies them.
- No keybindings without Nathan's per-shortcut sign-off. No second app instance against a live nexus.
- Out of scope everywhere: the Remove cache's storage · the rename journal · order arrays · block-tile pairs · agenda kinds · any browse surface.

**Made False**

| Doc | Claim | What falsifies it | Task |
| --- | --- | --- | --- |
| `Features/Architecture.md` | "Nothing browses or restores the trash; the path record it needs is on disk." | the pair + the restore op (nothing *browses* stays true — no surface) | 12 |
| `Features/Architecture.md` | trash layout shows only mirrored chain + stamped leaf | pair files beside artifacts | 8 |
| `Features/Contexts.md` | Space/Context delete described without capture or restore | pair payloads + restore | 12 |
| `Features/Properties.md` | Delete snapshot described as path-keyed file nothing reads | artifact-less pair variant | 9 |

**Dead Vocabulary**
- `removed_at` → expect 0. Legitimate hits: none (source + tests all convert).
- Control: `property_cache` → 15 at planning time. Zero here means the sweep never ran.

---

### Phase 1 — One tuple, one baseline, one silent diff

#### Task 1: The shared record shape

**Requirement:** 4, 6(F-5)

**Why:** The `{id, kind, title, path}` tuple exists today as `treeIndex.NodeRecord` (renderer) and is about to exist again in main — the exact two-spellings failure the `.MD` bug taught. One owner in `src/shared/` before either half is built. Kind is `NodeKind | 'context'` (spec C-6): Contexts are trashable and id-bearing but carry no node kind.

**Files:**
- Create: `src/shared/record.ts` — `RecordKind`, `EntityRecord { id, kind, title, path, state }`, `ExistState = 'present' | 'unreadable'`, `BaselineDiff` types. Pure, no fs, no React.
- Modify: `src/renderer/src/treeIndex.ts` — `NodeRecord` derives the fields the two genuinely share — `{id, title, path}` — from `EntityRecord`. Its `kind` stays local: the unions are disjoint in both directions (`NodeRecord` adds `homepage`, `RecordKind` adds `context`), so claiming one owner for `kind` would be false; what F-5 buys is the tuple, stated honestly.
- Test: `src/shared/record.test.ts`

**Interfaces**
- Produces: the types above; `diffBaselines(prev, next): BaselineDiff` (pure, union-of-keys, absence first-class, scalar fields only).
- Assumed by: Tasks 2, 3, 4 (projection, open wiring, re-mint), Task 11 (resolver reads `EntityRecord`).

**Failure half:** empty maps both sides → empty diff, not a report · one side null is NOT handled here (T3 owns absent-baseline) · an id present both sides with `state: 'unreadable'` on one → an `unreadable` transition, never a delete.

**Steps:**
- [x] Failing tests: union-diff catches an added key, a removed key, an unreadable transition, and reports nothing on identical maps.
- [x] Implement; gates green.
- [x] Align `NodeRecord`; typecheck proves the derivation compiles.
- [x] Commit: `feat(record): one owner for the per-entity tuple and its union diff`

#### Task 2: The baseline projection and its rows

**Requirement:** 4

**Why:** The baseline is a projection of the tree main already holds at open — never a second walk. It filters `adopted-` ids (spec A-3: an address, not an identity) and includes Contexts from the tree's `contexts` array. Rows live in `nexus.db` under a new `record` scope: baseline, drift (last non-empty), ambiguous ids.

**Files:**
- Create: `src/main/record.ts` — `projectBaseline(tree): Record<string, EntityRecord>`, `readBaseline` / `writeBaseline` / `readDrift` / `writeDrift` via `localState`.
- Modify: `src/main/db/localState.ts` — `Scope` union gains `'record'` (9 → 10 members; no schema bump, the table is generic).
- Test: `src/main/record.test.ts`

**Derivation**
- `grep -F "adopted-" Pommora/src/main/ids.ts` → the prefix constant; the filter tests against `adoptedId()`'s real output, not a hand-typed string.

**Interfaces**
- Produces: the functions above. Baseline entries carry `state` per C-5a: a container whose sidecar was unreadable projects `unreadable`, not its synthetic id.
- Assumed by: Task 3 (calls all four), Task 4 (reads baseline for adjudication).

**Failure half:** null db handle → all reads null, all writes no-op (locked media = C-2a's absent case) · a tree with zero entities → empty baseline written, not skipped · duplicate id in the tree → the projection flags it ambiguous, and **the write step keeps the PRIOR baseline's entry for that id** rather than either current path (spec A-5: the prior-session path is the only non-re-derivable fact, and it is exactly what a deferred adjudication needs — `projectBaseline` alone cannot preserve it, so the carry-forward lives where prior and next meet, in T3's write).

**Negative control:** the `adopted-` filter — and its subject must be the harmful shape, not the benign one: project a fixture whose Collection sidecar is **corrupt** (present but unparseable), assert the entry projects `unreadable` rather than being dropped as un-adopted; then a genuinely un-adopted folder, assert absent; disable the filter, assert red. `stampAdopted` runs before every walk in production, so the filter's main real-world input is the corrupt case.

**Steps:**
- [x] Failing tests first (projection, both filter controls, null-handle no-op).
- [x] Implement; gates green.
- [x] Commit: `feat(record): the baseline projection and its device-local rows`

#### Task 2a: The walk names what it cannot read

**Requirement:** 4 (C-5a's producer)

**Why:** Three-state existence has no producer today — `readNexus` destroys the distinction before returning: an unreadable container sidecar falls to `adoptedId` (byte-identical to un-adopted, which the projection drops), and an Unknown or unreadable page vanishes with no marker. Without this task the diff reports a hand-edit typo as a deletion and an iCloud-evicted sidecar as delete-then-create — the phantom pair overwriting the last-non-empty drift row it exists to protect. Adoption already treats the unreadable sidecar as a *waiting* state ("the folder waits for a later open"); the record must read it the same way.

**Files:**
- Modify: `src/main/readNexus.ts` — the tree gains an `unreadable` list: container reads distinguish not-found (raw/un-adopted) from present-but-unparseable via the strict reader; a page whose admission is Unknown, an unreadable page, and a null-parsing Space sidecar each record their path.
- Modify: `src/shared/types.ts` — the tree field.
- Test: extend the walk tests; the diff test in T2 consumes the list — a disappeared id whose prior path is on it reports `unreadable`, never deleted.

**Interfaces**
- Produces: `NexusTree.unreadable: { path: string }[]`.
- Assumed by: Task 2's projection (state per C-5a) and the diff.

**Failure half:** a path both walked and listed (racing edit) → the listing wins, conservative · empty list → absent from the tree per no-empties · the list never enters the renderer's concerns (it rides the tree type but no surface reads it).

**Must agree:** the walk's admission refusals and the unreadable list must cover the same files — the fixture from `admission.test.ts`'s Unknown matrix crosses both.

**Steps:**
- [x] Failing test: corrupt sidecar + Unknown page + corrupt Space sidecar each land on the list.
- [x] Implement — recording at the **call sites**, never inside a parse closure: `cachedParse` caches non-null results, so a closure side effect would silently empty the list on every warm walk.
- [x] Gates green (the walk's existing consumers ignore the new field — additive).
- [x] Commit: `feat(walk): present-but-unreadable is its own answer`

#### Task 3: The open path owns one walk

**Requirement:** 4

**Why:** Spec C-2: latching to "whichever walk runs first" loses to the watcher on launch-restore — a sync daemon's changes would become the baseline instead of the drift. `adoptNexusInner` and launch-restore walk once, explicitly, after `openSessionDb`; prior baseline read → diff (ambiguous ids excluded) → drift written only if non-empty (C-7) → new baseline written, **with each ambiguous id's prior entry carried forward in place of the projected one**. Absent prior baseline: latch, report nothing (C-2a). The renderer's own `nexus:state` walk is untouched — it runs after the open path completes, so it sees post-re-mint disk, and the warm parse cache makes it stat-only. This satisfies C-2's hand-off *intent* (the baseline latches pre-watcher; the first render shows re-minted ids) without rewiring the state IPC; T13 aligns the spec's wording to this reading.

**Files:**
- Modify: `src/main/index.ts` — the record block rides `adoptNexus`/`adoptNexusInner` behind an **opt-out parameter that only `nexus:rename` sets**, plus the launch-restore block. Every genuine open funnels through `adoptNexusInner` (picker, folder drop, Open Recent), so excluding it wholesale would wire the feature to launch-restore alone and it would never run on an ordinary open; but `nexus:rename` reuses the same function as a mid-session re-point, and a latch riding that would diff the live session against the launch baseline — every in-session change reporting as drift and overwriting the real closed-window record. The opt-out is one parameter; the re-point is its only setter. (The baseline itself survives a re-point untouched: `nexus.db` lives under the nexus root and travels, and recorded paths are nexus-relative.)
- Test: extend `src/main/record.test.ts` with an open-sequence fixture test.

One cost sentence: this moves the first cold walk ahead of `createWindow` — the renderer's own walk becomes warm-cache stat-only, so total parse work is unchanged; only its timing shifts earlier.

**Interfaces**
- Consumes: Task 2's four functions; `readNexus`.
- Assumed by: Task 4 — the re-mint runs between this walk and the baseline write (order is load-bearing, spec C-2).

**Failure half:** walk throws (unreadable root) → open proceeds, no baseline written this session, prior baseline retained · empty diff → drift row untouched (last non-empty preserved) · first-ever open → baseline latches, no drift · an ambiguous id with **no prior entry** (created and copied inside one closed window — or already duplicated when the feature first ships) → **one current path is recorded, unmarked, walk-order-first**, so the *next* open adjudicates against a stable reference and the other claimant re-mints then. Omission was considered and rejected: it re-freezes forever (no prior entry next open either), which is the hoarding A-5 forbids — and with two identical copies "wrong twin keeps the id" is barely a cost, while "neither ever re-mints" leaves them sharing chrome rows indefinitely · an ambiguous id whose **recorded path no longer exists** → the writer **drops the entry** (A-5's unadjudicable verb, executed where the write happens, not merely classified by the adjudicator).

**Steps:**
- [x] Fixture test: two opens with a rename between → drift names it; third uneventful open → drift unchanged.
- [x] Wire the funnel + launch-restore; gates green; build green.
- [x] Rewrite `nexus:rename`'s reuse comment in the same commit — it justifies the reuse by "no adoption-only side effects to skip," which the opt-out makes false; restate as always-true per the house rule.
- [x] Commit: `feat(record): the open path walks once and the baseline latches`

#### Gate 1 — the baseline exists and lies about nothing
- [x] Gates green, exit codes direct.
- [x] Simplification + correctness review against `<base>..HEAD`; concerns fixed or ruled.
- [x] Ambiguous-id preservation and the `adopted-` filter both negative-controlled.
- [x] Progress hashes filled; lessons written forward.

---

### Phase 2 — The re-mint

#### Task 4: Detection and adjudication

**Requirement:** 5

**Why:** Spec A-5. The walk sees every file once; ids seen at 2+ paths are the duplicate set. The **prior** baseline names the legitimate path — what sits there is the original, everything else re-mints. No baseline, or no claimant at the recorded path → refuse; recorded path gone entirely → drop to unadjudicable. Ambiguous ids leave the diff (their baseline path is stale by construction).

**Files:**
- Create: `src/main/remint.ts` — `adjudicate(dupes, priorBaseline): { remint: {id, path, kind}[], defer: string[] }` (pure) + the pass runner.
- Test: `src/main/remint.test.ts`

**Interfaces**
- Consumes: Task 2's `readBaseline`; the walk's tree.
- Produces: the pass, called from Task 3's open hook **before** the baseline write.
- Assumed by: Task 5 (executes the writes).

**Failure half:** three claimants of one id → one original, N−1 re-mints · original at recorded path but unreadable → defer, never guess · id ambiguous in the *prior* baseline too → defer (the evidence was already ambiguous).

**Negative control:** the refusal — fixture with duplicates and no baseline: assert zero writes; then hand it a baseline and assert the copy (only) re-mints.

**Steps:**
- [x] Failing tests: the adjudication matrix above.
- [x] Implement pure half; the runner wires in T5 alongside the writes it executes (wiring a write-less runner would be dead code for one commit).
- [x] Commit: `feat(remint): duplicated ids adjudicate against the prior baseline`

#### Task 5: The re-mint writes

**Requirement:** 5

**Why:** Executing a re-mint means: page → rewrite the kind key under the file lock (`serializeOnFile` + `mergeFrontmatter`); container → `writeSidecar` with the new id; then **copy — never move — the device-local state** onto the fresh id. Three shapes, because the rows are not uniform: `activeView`, `folds`, `headingCols` are per-key rows and copy verbatim · `blockDoc`'s value is **not opaque** — its view-embed tiles carry `views[].config.id`, a live per-machine key two boards must never share (the codebase says so twice, and `duplicateBlockTile` already calls `remintConfigIds` for exactly this) — so the copy walks `blocks` where `type === 'view'` and passes **each tile's `views` array** through `remintConfigIds`, which takes one tile's views, not a whole doc — handed the doc's `blocks` it is a type-clean silent no-op · `previews` is a **singleton row** with a nested `origins` map, so it is a read-modify-write through `readPreviewsState`/`writePreviewsState`, never `writeKey` (a keyed write there lands a junk row nothing reads). And the container re-mint's sidecar rewrite also re-mints the copy's `views[].id` in the same write — a file-copied Collection duplicates those too, and they key `viewOrder` per machine. The old-id rows belong to the **original**, which keeps that id; moving them would hand the original's authored board to the copy and leave the original blank — the exact inversion of the Goal's "the original keeps everything keyed to it." Duplicating them keeps the original untouched by construction and keeps the copy's ridden-along tile files referenced. Thumbnails: none for the fresh id, regenerated on use. Order arrays untouched (`resolveOrder` re-enters by title). Asset pointers untouched (stored rel paths travel). Then the open-path tree: patch the node ids so the baseline projection records the re-minted state. Nothing more — the handed tree's only consumer is the projection, whose fields are scalars; `contextValues` never enter it, and the renderer walks fresh after the re-mint completes (T3), so the spec's attach-pass clause is satisfied with no consumer left to need it.

**Files:**
- Modify: `src/main/remint.ts` — the write half.
- Modify: `src/main/blocks.ts` — export `remintConfigIds` (module-private today; a local re-spelling would be the two-spellings failure T1 exists to prevent).
- Test: extend `src/main/remint.test.ts`; an admission-level fixture proving the re-minted file re-reads as `member` with the new id.

**Derivation**
- `grep -Fn "space:" Pommora/src/shared/blocks.ts` → the blockDoc key builder; re-key against it, never a hand-built string.

**Failure half:** frontmatter write refused (locked file) → that re-mint skips, defer stands, nothing partial · row copy fails after the disk write → the copy runs with default chrome (empty board, no folds) and the original is untouched — **disk writes first, row copies second**, logged and harmless · re-mint of an id with zero device-local rows → nothing to copy, no error.

**Must agree:** the re-minted page must read as `member` through `admitContentFile` and appear in the next projection under the new id — one test crosses the re-mint, the admission predicate, and the projection.

**Steps:**
- [x] Failing tests: page re-mint, container re-mint (including fresh `views[].id` on the copy's sidecar), the three row-copy shapes — asserting the ORIGINAL's rows are byte-identical after AND that no id at `blocks[].views[].config.id` is shared between the two boards (the assertion must read that exact path, or the no-op passes it) — and the must-agree crossing.
- [x] Implement; gates green.
- [x] Commit: `feat(remint): the copy takes a fresh id and duplicate chrome; the original never moves`

#### Gate 2 — duplicates resolve, originals never move
- [x] Gates green; simplification + review on the range; concerns fixed or ruled.
- [x] The negative controls hold in both directions.
- [x] Re-assess: does the T3 hook order (walk → re-mint → baseline → renderer) hold as built? Rewrite T6+ if any interface drifted.

---

### Phase 3 — The sweep and the pair

#### Task 6: The sweep never strips a passenger

**Requirement:** 6(G-1a) · **Shape: fix** — sibling sweep mandatory.

**Why:** The unlink sweeps enumerate every `_space.json` under `contextsDir`, including those inside the Context being deleted — stripping keys that are still true inside the subtree the same operation ships to trash (execution-verified). Restore would return a Context with its internal Space-to-Space links destroyed. Fix at source: roots under the delete target are skipped by path prefix.

**Files:**
- Modify: `src/main/crud/contextCascade.ts` — `unlinkContextKey` gains the target-prefix skip (threaded from the delete arm). `unlinkSpaceValue` does not need it: a deleted Space's subtree holds tile files the markdown sweep never reaches (`.nexus` is skipped top-level) and no other swept root.
- Modify: `src/main/mutate.ts` — the delete arm passes the resolved target.
- Test: `src/main/admission.test.ts` sibling or new — a Space inside the deleted Context keeps its key; an outside page still loses it (the control that proves the sweep ran).

**Negative control:** disable the skip → the inside-Space's key is stripped → test red.

**Sibling sweep:** `cascadeTitle` shares `sweepContextRoots` — the rename path must NOT gain the skip (a rename's subtree stays live and must be swept). The skip rides the unlink wrappers, never the shared sweep core. One test pins the rename path still reaching an in-Context Space.

**Steps:**
- [x] Failing test first; fix; both controls green; gates green.
- [x] Commit: `fix(contexts): a delete's sweep never strips the subtree it is trashing`

#### Task 7: The sweep tells the truth about what it did

**Requirement:** 6(G-2), 1

**Why:** Membership capture needs the values and the identity at the moment of removal; the sweep computes both and returns neither. Spec G-2 prices it honestly: the callback gains the file path, the return gains captured entries, and a **third list** for admission-refused roots (a dual-key page keeps its context key and today appears nowhere). Additive for all three consumers.

**Files:**
- Modify: `src/main/crud/contextCascade.ts` — `sweepContextRoots` signature; `unlinkContextKey` / `unlinkSpaceValue` return `{ touched, skipped, refused, captured }`.
- Test: extend the cascade tests — captured entries carry id + values per root; the refused list catches a dual-key page.

**Derivation**
- `grep -rF "sweepContextRoots" Pommora/src --include='*.ts'` (non-test) → 4 at planning time (1 definition + 3 consumers). Control: `grep -rF "property_cache" Pommora/src --include='*.ts'` → 15.

**Interfaces**
- Produces: `SweepCapture { id, kind: 'page' | 'space', values }[]` per swept root, discriminated by which id key the root carries.
- Assumed by: Task 8 (the pair's membership payload), Task 12 (restore re-applies).

**Failure half:** a refused root → listed, never captured, never touched · a root with the key but no id → touched, captured with no id entry (unrestorable, honest) · zero captures → empty list, not absent.

**Steps:**
- [x] Failing tests; widen; all three consumers compile (the type gate enumerates them); gates green.
- [x] Commit: `feat(contexts): the unlink sweeps return what they removed`

#### Task 8: The pair

**Requirement:** 1

**Why:** Spec B-1..B-7. One JSON beside the trashed artifact, named from `trashWithTimestamp`'s returned leaf. Parent as the discriminated union (B-4); per-kind payloads (B-5); all-or-nothing per pair; best-effort — a pair failure never fails the delete. `trashTileFile` writes no pair (A-4).

  **Four gather points, not three** — frontmatter stores Space *titles*, the sweep can only capture titles, and G-3's ratified `{id, title}` needs title→id resolution whose window **closes at the registry erase**. Point 0 is scoped to what each arm needs, never the whole world: a **Space** delete reads `readRegistryStrict` alone (its parent Context's title→id; its own id is in its own sidecar) · a **Context** delete enumerates **its own folder** — `readdir` + `readJsonStrict` per `_space.json`, title = folder name — which is exactly the `{id, title}` set G-3 ratified. Not `loadContextWorld`: that fails the entire load on any unreadable Space sidecar anywhere in the nexus, so one evicted placeholder in an unrelated Context would suppress every Space and Context pair. Scoped, B-1's all-or-nothing means "this delete's own evidence is unreadable," never "some unrelated Context is sick." So: (0) the scoped id read · (1) registry entry before the erase · (2) membership during the sweep, resolved against 0 · (3) pair name after the move.

**Files:**
- Create: `src/main/provenance.ts` — pair shape (zod, loose), `gatherProvenance(kind, abs, root, capture)`, `writePair(dest, pair)`, `readPair(dest)`.
- Modify: `src/main/mutate.ts` — the delete arm: gather before erase/move, write after; `removeViaMode` threads the destination back; system-trash arm writes nothing (B-6).
- Test: `src/main/provenance.test.ts` — the pair matrix per kind on fixture nexuses.

**Interfaces**
- Produces: the pair file format (documented in the module header as the on-disk contract) and `readPair`.
- Assumed by: Tasks 9, 11, 12.

**Failure half:** parent sidecar unreadable at gather → parent `unaddressable`, pair still written (parent is not a required payload) · required payload gather fails (Context registry entry unreadable) → **no pair at all** (spec B-1) · pair write throws → delete reply still ok · trash move itself fails → no pair attempted, the existing error path is untouched.

**Negative control:** the all-or-nothing rule — break the registry read in a fixture, delete a Context, assert no pair exists; restore the read, assert the pair carries the entry.

**Must agree:** `writePair` → `readPair` round-trips byte-stable per kind, and the recorded parent id matches the id the walk assigns that folder in the same fixture. The gather↔resolver crossing lives in **Task 11's** steps — the resolver does not exist yet, and a crossing named here would have no task to write it.

**Steps:**
- [x] Failing tests per kind: page, Set (parent id), root Collection (parent root), Space (membership), Context (registry entry + membership map), dual-mode (system trash → no pair).
- [x] Implement; gates green.
- [x] Commit: `feat(provenance): every nexus-trash delete writes its pair`

#### Task 9: Absorb the snapshot; remove the residue

**Requirement:** 6(F-2, F-3) · **Shape: removal** — inventory below is the bucketing.

**Why:** The Delete snapshot is the pair's artifact-less variant (nothing is trashed; the orphan prune exempts it). The residue is dead regardless: `removed_at` written and never read; four `cascade.ok` branches whose precondition every caller resolves; the stale `crud delete*` comment.

**Files:**
- Modify: `src/main/crud/deleteProperty.ts` — the raw `writeFile` snapshot becomes a `provenance.ts` variant write (atomic, de-collided).
- Modify: `src/main/crud/removeProperty.ts` — `removed_at` leaves the cache block.
- Modify: `src/main/crud/contextCascade.ts` — the four unreachable branches leave; `cascadeTitle`'s Result simplifies if nothing consumes failure.
- Modify: `src/main/mutate.ts` — the stale comment.
- Tests: existing suites updated in the same commits.

**Derivation**
- `grep -rF "removed_at" Pommora/src --include='*.ts'` → 4 at planning time (1 source + 3 test). Expect 0 after.
- `grep -cF "cascade.ok" Pommora/src/main/crud/contextCascade.ts` → 4 at planning time. Expect 0 after.
- Control: `grep -rF "property_cache" Pommora/src --include='*.ts'` → 15; unchanged after.

**Survivors:** the Remove cache's storage, reconciliation branches, and cache-before-strip ordering — all deliberate stays (spec D-1, F-6). `propertyMenu.ts`'s user-facing promise ("a recovery snapshot lands in .trash") stays true.

**Steps:**
- [ ] Convert the snapshot write; its test asserts atomicity + de-collision now.
- [ ] Remove residue; let the type gate enumerate fallout; gates green.
- [ ] Commit: `refactor(crud): the snapshot joins the pair; the residue leaves`

#### Gate 3 — every delete leaves a truthful record
- [ ] Gates green; simplification + review on the range; concerns fixed or ruled.
- [ ] Derivations re-run: `removed_at` 0, `cascade.ok` 0, control 15.
- [ ] The G-1a fix's both controls re-confirmed post-widening.

---

### Phase 4 — The resolver spends the pairs

#### Task 10: One reconciliation loop

**Requirement:** 6(F-4)

**Why:** Tag re-application is the Remove cache's spend-per-landed-write shape. Extract the loop from `restoreCachedValues`, point both at it. The cache's storage and type-revalidation branches stay in place — only the iteration/spend skeleton moves.

**Files:**
- Create: `src/main/crud/reconcile.ts` — the loop: entries → attempt write → spend on landed, keep on refused, skip on gone.
- Modify: `src/main/crud/removeProperty.ts` — `restoreCachedValues` consumes it; behavior identical (its tests pass unmodified — the refactor invariant).
- Test: `reconcile.test.ts` + the untouched existing suite as the baseline invariant.

**Interfaces**
- Produces: `reconcile(entries, apply): { spent, kept }`.
- Assumed by: Task 12.

**Steps:**
- [ ] Extract; existing removeProperty tests pass **unmodified**; gates green.
- [ ] Commit: `refactor(crud): one spend-per-landed-write loop`

#### Task 11: The resolver

**Requirement:** 2

**Why:** Spec E-1..E-5. Pure decision: pair + current tree → `{ place: { dir, finalName, finalTitle? } } | { refuse: reason }`. Reasons: parent gone · parent cannot hold this kind · parent unaddressable · trashed outside the nexus · id already live. Collisions disambiguate for every kind, Contexts included — the resolver returns final names; choosing is deciding (E-2/E-3). A child of a still-trashed parent refuses (E-4).

**Files:**
- Create: resolver in `src/main/provenance.ts` (the pair's one reader — same module, spec: the halves share a module and nothing else).
- Test: the resolver matrix in `provenance.test.ts`.

**Failure half:** parent id resolves to a folder that is now the *wrong kind* → refuse (cannot hold) · recorded parent AND a live id collision together → the id refusal wins (nothing may write) · malformed pair JSON → refuse as unreadable, never throw.

**Must agree:** the resolver's "parent gone" and the walk's admission must agree on what exists — the shared fixture crosses both (a resolver that consults a stale tree would place into a folder the walk refuses).

**Steps:**
- [ ] Failing matrix tests; implement; gates green.
- [ ] The gather↔resolve crossing: every pair T8's fixtures produced resolves or refuses typed — never throws, never mis-shapes.
- [ ] Commit: `feat(provenance): the resolver decides; a placement or a typed refusal`

#### Task 12: Restore

**Requirement:** 3 · **Scope ruling (Nathan): actions only — no user interface.** The op, the listing, and the IPC arm ship end-to-end tested; every surface that would call them is sequenced after.

**Why:** The mover: a `restore` mutate op takes a trash-relative pair reference, calls the resolver, executes the placement — move the artifact (drop the stamp, apply final name), delete the pair, and per kind: re-insert the Context registry entry (append, final title), re-apply membership through Task 10's loop — joined by the recorded Space **ids** against the restored Space folders — a Space's title IS its folder name; `_space.json` carries the id — so the as-restored folder names are what gets written (E-3: recorded titles are labels; the resolver's final titles are what restore writes). Branches on nothing (E-2).

**Files:**
- Modify: `src/shared/mutate.ts` — the `restore` op; `src/main/mutate.ts` — the arm.
- Modify: `src/main/provenance.ts` — `listPairs(root)` for the trigger (prunes orphans as encountered, exempting the artifact-less variant — B-7).
- Test: end-to-end fixture tests — the acceptance criterion's first two sequences live here.

**Interfaces**
- Consumes: T8 pairs, T10 loop, T11 resolver.
- Assumed by: the trigger surface (final step) and the docs task.

**Failure half:** artifact gone but pair present → orphan; listing prunes it · restore into a parent that vanished between list and click → the resolver re-runs inside the op; refusal surfaces as the op's error · membership re-apply partially lands → loop semantics: spent entries spent, kept entries reported, never a rollback of the placed artifact.

**Steps:**
- [ ] Failing end-to-end tests (renamed-parent restore; Space round-trip with tags).
- [ ] Implement op + arm + `listPairs`; gates green.
- [ ] Commit: `feat(trash): restore — the pair spends, headless`

#### Task 13: The record tells the docs

**Requirement:** closes the Made False ledger.

**Why:** Docs ride the commit that falsifies them; these four outlived their commits only because the plan batches doc-truth at the surface's landing.

**Files:** the four Made False entries + `History.md` (one entry, durable voice) + `Handoff.md` session block.

**Steps:**
- [ ] Rewrite each claim; closing sweep: `removed_at` → 0 against control `property_cache` → 15.
- [ ] Align the spec's C-2/A-5 hand-off wording to the as-built reading (T3/T5's Whys carry the reasoning).
- [ ] Commit: `docs(record): the trash carries its provenance and the docs say so`

#### Gate 4 — the acceptance criterion, whole
- [ ] The acceptance sequence runs green as tests — headless; no trigger exists.
- [ ] Simplification + review on the phase range; comment-killer pass on the full plan diff; concerns fixed or ruled.
- [ ] Closeout per the skill: Delivery Claim → neutral verifier (against the SPEC) → attack pass → Nathan's live check.

---

## Implementation Log

### Progress
- [x] **Phase 1** — one tuple, one baseline, one silent diff · base `680d996f`
  - [x] Task 1 — the shared record shape · `55b5fbc2`
  - [x] Task 2 — the baseline projection and its rows · `17646d8d`
  - [x] Task 2a — the walk names what it cannot read · `3f301f62`
  - [x] Task 3 — the open path owns one walk · `352bf1a7`
- [x] **Phase 2** — the re-mint · base `5bc40a2c`
  - [x] Task 4 — detection and adjudication · `9c97b376`
  - [x] Task 5 — the re-mint writes · `0c34dd2a`
- [ ] **Phase 3** — the sweep and the pair · base `f136d56b`
  - [x] Task 6 — the sweep never strips a passenger
  - [x] Task 7 — the sweep tells the truth
  - [x] Task 8 — the pair
  - [ ] Task 9 — absorb the snapshot; remove the residue
- [ ] **Phase 4** — the resolver spends the pairs
  - [ ] Task 10 — one reconciliation loop
  - [ ] Task 11 — the resolver
  - [ ] Task 12 — restore
  - [ ] Task 13 — the record tells the docs

### Rulings
- **Ratified by Nathan** after three review rounds (the cap); execution authorized. The record-one-unmarked judgment call was presented and stands.
- Restore's **interface** is out of scope; its actions — resolver, op, listing — ship (Nathan, pre-ratification).
- Plan review round 1: 8 findings — 3 High (row-copy direction · three-state producer · the fourth gather point), 3 Medium, 2 Low; 7 folded above, 1 moot post-scope-cut (the trigger/live-data contradiction named a step that no longer exists). The spec itself survived the round untouched; the T3/T5 hand-off deviation was verified correct against the real open sequence.
- Plan review round 3 (final; scoped to round 2's folds): 4 findings — 2 Medium (the ambiguous-no-prior omission re-froze forever, contradicting A-5's never-hoards — now one path recorded unmarked so the next open adjudicates, and the writer executes the drop verb; `remintConfigIds` is module-private and takes one tile's views, so the reuse names the export and the exact walk, with the test assertion pinned to `blocks[].views[].config.id`), 2 Low (the three-vs-four gather-point count swept upstream into Requirements and Forced By; `nexus:rename`'s reuse comment rewritten in T3's commit). Three of five round-2 folds held under direct attack. Round cap reached; these four folds are post-round — three were prescribed by the reviewer against symbols it verified, the fourth (record-one-unmarked) is a judgment call flagged to Nathan at presentation.
- Plan review round 2 (scoped to round 1's folds): 5 findings — 1 High (the T3 wiring citation excluded the one funnel every ordinary open passes through; now an opt-out parameter only `nexus:rename` sets), 2 Medium (`blockDoc` values re-mint their view config ids through the existing `remintConfigIds`, and the copy's sidecar re-mints `views[].id`; gather point 0 scoped per arm instead of `loadContextWorld`, whose nexus-wide strictness would let one unrelated corrupt sidecar suppress every pair), 2 Low (`previews` is a singleton RMW, not a keyed row; an ambiguous id with no prior entry is omitted, its first unambiguous appearance reading as one addition). All folded; four of round 1's six folds survived scrutiny intact.

### Open Against Later Tasks
- **Needs Nathan's ruling (Gate 1, review finding — code shipped with the proxy):** `latchBaseline` is pure, so A-5's drop condition "the recorded path no longer exists at all" is implemented as "no walked claimant sits at the recorded path and it is not on the unreadable list." Wider than the spec's literal condition in one edge: a duplicated id whose recorded home left the walk for a *non-destructive* reason (its subtree added to `excluded_folders` while closed, or the id key hand-stripped) drops its evidence, and the next open records the surviving copy walk-order-first. The reviewer judged the proxy defensible; ruling wanted on whether the exclusion edge deserves a stat-based check instead.

### Deviations
- **Gate 2 (no-baseline refusal negative-controlled red-then-green):** simplifier landed 3 small collapses (one delete in `applyRemints`' tail, a hoisted fixture constant, an unused import — the range's only lint warning). Correctness review: 1 Medium + 2 Low, all verified. Folded: the **must-agree crossing test** — a third open after the re-mint proves the fresh id re-enters through a genuine disk walk and admission, not just the in-memory fix-up (the T5 checkbox had claimed it without the test existing). Recorded, not fixed: the in-lock id re-checks and partial-re-mint arm have no red-capable fixtures (race guards, traced correct by both reviewer and author); a container copy's copied `activeView` row dangles against the copy's re-minted view ids and falls back to the first view at render (plan-prescribed verbatim copy; renderer tolerance verified at `pickView`). Hook order re-assessed as built: walk → adjudicate/write → fix-up → latch → drift → baseline, renderer walks after — holds; T6+ interfaces unaffected.
- **T5:** the "patch the node ids" step lands as `applyRemints(projection, reminted)` — a projection fix-up, not a tree mutation. The walked tree's page nodes are the parse cache's own objects (`cachedParse` hands them out), so an in-place id patch would edit cache state; the projection is this pass's only consumer and remapping it is equivalent and side-effect-free. A duplicated **context** id (only reachable by hand-editing the registry — no file-copy mechanism reproduces a registry entry) defers instead of rewriting `contexts.json` blind. The re-minted page re-reads inside the file lock and skips if the contested id is no longer the one on disk.
- **T4:** two departures from the written task, both spec-grounded. (1) `adjudicate` takes the walk's unreadable list as a third parameter — the "original at recorded path but unreadable → defer, never guess" arm is undecidable without it, and the plan's two-argument signature predates T2a's producer. (2) The "id ambiguous in the prior baseline too → defer" arm is NOT implemented: an ambiguous mark is A-5's *preserved evidence*, kept exactly so a later session can spend it — a blanket defer would freeze adjudication for as long as the duplication persists, the same hoarding round 3 removed from the no-prior case. Ambiguous-marked entries adjudicate identically to unmarked ones; the deferring states are exactly no-baseline · no-entry · unreadable-recorded-path · no-claimant-at-recorded-path. Test pins the spend. **Flagged for Nathan's post-hoc ruling.**
- **Gate 1 (round run, both negative controls red-then-green):** simplifier landed 3 clarity edits (shared `readContainerMeta` in the walk, symmetric diff arms, one prior-normalization in the latch). Correctness review: 1 Medium + 4 Low, all verified at the cited symbols. Folded: **same-root guard** — re-adopting the already-open nexus (Open Recent head, picker re-pick) now stands down from the latch, closing a one-click drift-clobber the rename opt-out alone missed; **whole-pass guard** — a row-write failure (disk full) can no longer fail a genuine open, the record is best-effort end to end; **in-flux diff exclusion** — ids the current walk saw at 2+ paths leave both diff sides (a dropped duplicate is not a removal, a record-one is not an addition), the same stale-by-construction rationale A-5 gives for ambiguous-marked entries; **the corrupt-sidecar crossing test** — healthy open → corrupt the sidecar on disk → second open reads an unreadable transition, never a removal. `latchOpenTree` inlined into `runOpenRecord` (its stated test seam went unused; T4 inserts inside the one function). One item to Open Against Later Tasks for a ruling.
- **T3:** the open pass split as `runOpenRecord(root)` (walk + guard) → `latchOpenTree(tree)` (rows), both in `record.ts` — index.ts holds one awaited call per open path and no record logic. T4's re-mint slots inside `runOpenRecord` between the walk and the latch, exactly where the order is load-bearing.
- **T2a:** a fourth producer joined the three planned ones — a **present-but-unusable contexts registry** (`.nexus/contexts.json` corrupt or shape-invalid) blanks the whole Contexts layer in one stroke, which the baseline would read as mass deletion of every group and Space. The walk now records the registry's own path on the list; T3's latch carries prior `context`/`space` entries as unreadable when that path is listed. Absent registry (real raw mode) stays silent.
- **T2:** the writer's merge shipped as `latchBaseline(projection, unreadablePaths, prior)` in `record.ts` rather than as inline logic in T3's wiring — every carry/drop/ambiguous rule is pure and tested where the projection lives; T3 wires `projectBaseline → latch → diff → rows` and stays thin. `projectBaseline` returns `{ entries, duplicates }` (T4 consumes `duplicates` directly). The unreadable list rides as a parameter, not read off the tree, so T2 ships before T2a adds the field.
### Lessons
### Sequenced After
- Every surface: the restore trigger, the trash browser, any compare view — each invokes actions this build ships.
- Crash-safe cascades on the pair + settle shape.
- The rename cascade's refused list has no consumer (pre-existing; noted by the verification round).

### Closeout
