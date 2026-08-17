## Live Tree & Content Index — Implementation Plan

> **Status:** revised after attack round 1, pending round 2 · Spec: this session's ratified decisions (recorded under Goal and Rulings) · Execute tasks in order.
> Citations name files and symbols; re-derive before editing. Line numbers appear only in Task 1.

**Goal**

Today the only way Pommora learns what is on disk is `readNexus` — a full recursive walk that re-enumerates every directory and stats every file, re-run after nearly every in-app mutation (`store.mutate` ends in `load()`), on every external-edit settle (the watcher discards the event path), and inside the property cascades. The rename cascade separately opens every markdown file in the nexus hunting link mentions, and the option/property cascades open every page under every collection.

At the end of this plan, none of that survives as a hot path. Main holds a **live in-memory `NexusTree`**: built by one walk at open, patched in place by mutations and by path-aware watcher events, and pushed to the renderer over the existing `nexus:changed` channel. `nexus.db` gains a **content index** — which files mention which titles, and which pages carry which property keys and values — seeded and reconciled at open, maintained by writers and the watcher, and queried by the cascades so a rename or property sweep opens only the files it will actually change. The full walk survives on purpose, demoted to open and ⌘R as the self-healing verification pass.

**Why this shape:** three approaches were weighed — (1) main-owned live tree with the index riding sidecar, (2) the index as the read model with the tree derived from SQLite, (3) targeted patches with no index. Nathan ratified (1) with the index covering mentions **and** full property values: it reaches every goal with the smallest churn, keeps the renderer contract nearly untouched (`applyTree` + `stabilize` already reconcile arbitrary pushes), keeps files-canonical trivially true (the index is disposable — delete `nexus.db` and the next open rebuilds it), and reuses the pure patch transforms the renderer already owns rather than inventing a second mechanism.

**The governing caution (attack round 1's root finding):** every mechanism this plan reuses was permitted a specific sloppiness *because a full reload always ran afterward* — the optimism transforms are provisional by written contract, the open walk observes pre-remint disk, the renderer's `invisible` list encodes which ops the tree cannot see, non-mutate write channels use `load()` as their sole confirmation, and the cascade corpus is deliberately broader than the tree's. This plan deletes the reload, so each of those guarantees is relocated explicitly by a named task below; any future task added to this plan must ask what the reload was silently guaranteeing at its site.

**Deliberately not solving here:** full-text body search / ⌘K (the schema leaves room; the FTS table is a later session), backlinks UI, the property-cascade journal (next session — see Sequenced After), the mobile lazy reader, and any change to on-disk content formats.

**Requirements:**
1. In-app mutations trigger zero full walks; main patches its live tree — or provably concludes no tree change — and pushes when the tree changed. This covers the non-mutate write channels (`schema:*`, `views:*`, settings) equally.
2. External edits still surface live at per-path cost; events the patcher can't resolve fall back to a full refresh (self-healing, never silent drift).
3. A page rename rewrites only files the index says mention the old title — over the cascade's full corpus, which is broader than the tree's.
4. Property cascades (option rename/remove/clear, property delete/rename sweeps — including `deleteProperty`'s snapshot pass) open only pages the index says hold the key. The Context cascade keeps its scan (its governed keys are outside the index).
5. `nexus.db` gains `mentions` and `page_values` tables — created on existing databases too, seeded/reconciled at open, maintained by writers and watcher, disposable by construction.
6. Files stay canonical; open and ⌘R run the full verification walk; after any patched sequence a forced walk produces a tree that deep-equals the live one, with transform-built nodes carrying the walk's full key shape so `stabilize` can prove it by identity.
7. Every `readNexus` caller routes through the single-flight seam (retiring the `walkCache` generation race); `trash:list` and the open path stop double-walking; `allCollectionFolders` is deleted.
8. Every document made false is rewritten in the commit that falsifies it (see Made False).

**Acceptance — the whole thing working:** on a dev build over a seeded test nexus (~200 pages, 3 of which mention page P, one un-adopted folder holding a note that links P): renaming P opens exactly those 4 files plus P itself (observed via cascade logging) with no `readNexus` call (observed via a temporary walk log); a table cell edit walks nothing and pushes nothing; creating, editing, and deleting a page externally each surface within the settle window with no walk logged; a mutation with no patch transform still lands via the fallback refresh; a **pre-existing** `nexus.db` gains the index tables on open with folds/tabs intact, and deleting `nexus.db` rebuilds everything; ⌘R walks fully and `stabilize` returns the prior tree object, proving the patched tree never drifted.

**Forced By**
- The renderer never touches Node (hard rule) → the live tree, the watcher patcher, and the index all live in `src/main`; the renderer keeps consuming pushed trees.
- `treeMove.ts` imports only from `@shared/*` (verified) → the transforms can move to `src/shared` unchanged — but two arms are provisional by written contract (space/context rename leave child paths stale, healed today by the reload) → Task 1 upgrades them before main consumes them.
- Transform-built nodes carry fewer keys than walk-built literals (verified: 6 vs 12 on `SetNode`; `stabilize` compares key counts) → created nodes need the walk's shape, or the drift detector can't work → the shared node factory in Task 1.
- `applyTree` + `stabilize` already reconcile any pushed tree, and unchanged subtrees keep identity → the renderer contract does not change; no new IPC channel is needed.
- `cachedParse` returns the *same* node objects across walks and the walk mutates them in place (`contextValues`) → any "did the tree change?" check must be top-level object identity, never per-node comparison.
- `openNexusDb` early-returns on a version match *before* `applySchema` runs (verified `db/open.ts`) → additive DDL alone never reaches an existing database; the opener must apply schema on that path too (idempotent by `IF NOT EXISTS`), still with no `SCHEMA_VERSION` bump, so nobody loses folds/tabs.
- The cascade corpus is `listMarkdownFiles(root, {skipTopLevel: ['.nexus', '.trash']})` — a raw recursive readdir honoring no exclusions — and `sweepAdmitsBody` admits unkeyed files (verified) → the walk's corpus is a strict subset; the index must seed from the cascade's enumeration and admission, or renames silently stop rewriting links in un-adopted folders (NexusOS has such folders by design).
- `setProperty` and `emptyBundle` cannot change the tree (values aren't in `NexusTree`; `.trash` is unwalked) — knowledge currently encoded in the renderer's `invisible` list → `patchForMutation` needs a `'no-change'` arm carrying it, or the hottest write in the app (a cell edit) buys a full walk.
- `schema:*`, `views:*`, and settings writes are their own IPC channels whose disk writes are echo-suppressed and whose *sole* confirmation is the renderer `load()` (verified; `viewMint.ts` documents it) → Task 6 must push after these handlers too, or Phase 3 ships invisible property renames and view saves.
- `runOpenRecord` walks *before* `runRemintPass` rewrites duplicate ids (verified `record.ts`), and the watcher starts after with `ignoreInitial` → seeding the live tree from that walk pins pre-remint ids for the session; a remint that wrote anything forces a re-walk seed.
- `readNexus` throws on a missing root or unreadable identity, and today every renderer read hits that path → a held live tree must be dropped when a forced refresh rejects, and ⌘R's rejection must reach the error envelope, or a vanished nexus keeps rendering.
- `openDb` may return null (DB optional by design) → every index query needs a scan fallback; the old sweep code survives as that fallback, not as debt.
- Echo suppression (`writeEcho`) keeps app writes out of the watcher → mutation patching and watcher patching never double-apply; a late echo re-applying a patch is idempotent (attack round 1 verified).

**Inherited Reasoning**
- Verification-walk over event-application was the original ruling (HistoryPM, walk-cache arc); this plan doesn't reverse it — it keeps the walk as the verifier and adds tracked state between verifications. Container-surgical reconcile was "held, not rejected"; the watcher patcher is its arrival.
- The renderer's optimistic patches stay. They share the moved transforms with main, so there is one definition; whether renderer optimism can be retired once pushes prove fast is a named follow-on, not scope.
- The ContextPM settings-guard debt entry was found already shipped (`rmwJsonStrict` + tests) this session — verified, doc corrected. Lesson: verify "known issue" lists against code before building from them.
- A move cascade on page drag was ruled out previously ("no cascade on move at all") — nothing here reintroduces one. Moves patch paths in the tree and index rows; bodies are untouched.
- Attack round 1 rejected nothing the user ratified; all 14 findings folded. The killed-candidates list (double-application via late echoes; WeakMap memo loss; push-after-optimism flicker) records what was checked and found sound — don't re-litigate those.

**Grounding** *(re-open these; don't cite them)*
- `Pommora/src/main/readNexus.ts` — the walk: `readNexus`, `walkNexus`, `readPageRecord`, `readSet`, `readPageCollection`, `readSpace`; per-page parse rides `cachedParse`; node literals are the key-shape source; `resolveAssignedSchema` embeds registry defs into every `CollectionNode.properties`.
- `Pommora/src/main/walkCache.ts` — `(mtime, size)` parse gate; global `gen` counter; prune at `endWalk`; cached nodes are shared objects.
- `Pommora/src/main/watcher.ts` — `onEvent` discards the path; `SETTLE_MS` debounce; `pushNav` is the existing precedent for a targeted, walk-free push.
- `Pommora/src/renderer/src/store.ts` — `load`, `applyTree`, `mutate` (the `invisible` list and the closing `load()`), `submitPropertyRename` (the `schema.rename` channel + `load()` confirm).
- `Pommora/src/renderer/src/treeMove.ts` + `treeMove.test.ts` — the transforms; the provisional-arm comments naming the reload as healer; `reparentPaths`.
- `Pommora/src/renderer/src/treeStabilize.ts`, `treeIndex.ts` — key-count comparison; the per-tree derived-index WeakMap.
- `Pommora/src/main/record.ts` + `remint.ts` — the walk→remint→latch order; `runRemintPass` writes fresh ids the walked tree never sees.
- `Pommora/src/main/crud/cascade.ts` (`renameCascade`), `crud/util.ts` (`sweepAdmitsBody`), `io/walk.ts` (`listMarkdownFiles` — the cascade corpus), `crud/governedSweep.ts` (`sweepGovernedRoots` and its two callers — `contextCascade.ts` sweeps Context keys), `crud/optionOps.ts`, `crud/deleteProperty.ts` (`snapshot` reads every page first), `crud/assignment.ts` (`allCollectionFolders`), `main/blocks.ts` (`rewriteBlockConnections`).
- `Pommora/src/main/connections/scan.ts` (`mentionsTitle`, `codeMask`), `connections/rewrite.ts` — what a mention *is*; the extractor must agree with these.
- `Pommora/src/main/db/driver.ts`, `db/schema.ts`, `db/open.ts` (`openNexusDb`'s early return), `db/localState.ts`.
- `Pommora/src/main/index.ts` — `nexus:state` and `trash:list` handlers, the mutate call site, the `schema:*`/`views:*` handlers, `adoptNexusInner`/launch-restore.
- `Pommora/src/shared/bridge.ts` — the full channel inventory: `nexus:state`, `nexus:changed`, and the `schema:*`/`views:*` families.

**Environment:** Plan directory `.claude/Planning` (convention). Explorer: `Explore` agent. Attack reviewer: `build-breaking-agent`. Code reviewer: general-purpose scoped to correctness. Simplification: `code-simplifier`; comment pass: `comment-killer-agent`. Neutral verifier: general-purpose. Gates (from `Pommora/`): `npm run typecheck` · `npm run test` · `npm run lint` — exit codes read directly, never piped (pipefail lesson). Rules directory: `.claude/Guidelines`. No formal spec document exists; the ratified decisions above are the spec input.

**Shapes:** additive (live tree, index, patcher) · refactor (cascades and reads re-routed, behavior preserved) · removal (`allCollectionFolders`, the renderer's load-after-mutate) · fix (single-flight walk). Not a migration: no on-disk content format changes; the DDL is additive, applied idempotently to existing databases, and the index disposable.

**Global Constraints (every task inherits these):**
- Gates: `npm run typecheck` && `npm run test` && `npm run lint` from `Pommora/`, each exit code read directly.
- Main owns the filesystem; renderer never touches Node; every IPC channel declared once in `src/shared/bridge.ts`; IPC returns the `Result` envelope, never throws.
- One tree-touching writer at a time. Stage explicit paths only (parallel-session discipline).
- Tree change detection is top-level object identity (`getLiveTree() !== next`) everywhere — never per-node comparison; cached nodes mutate in place.
- Biome owns formatting via the PostToolUse hook — an Edit failing on whitespace means re-read and retry; never hand-align.
- Comments carry only uninferable whys; `KNOB` and `(Nathan's call)` markers survive every pass.
- No new dependencies. No keyboard shortcuts. No timeline language in docs.
- Out of scope everywhere: FTS/⌘K, backlinks UI, the cascade journal, mobile docs (`.claude/Mobile` describes decisions at their time and stays), on-disk format changes, MarkdownPM internals.

**Made False** *(each rewrite lands in the commit that falsifies it)*

| Doc | The specific claim | What makes it false | Task |
| --- | --- | --- | --- |
| `Features/ArchitecturePM.md` §File Watcher | "Surviving events debounce to a settle, then main re-derives the tree with a verification walk" | the path-aware patcher | 5 |
| `Features/ArchitecturePM.md` §Read + State | "every write is followed by one refetch" | mutations patch and push | 7 |
| `Features/ArchitecturePM.md` §Pending | "none exists" (the content index) | the index ships | 8 |
| `Features/ConnectionsPM.md` rename cascade | the cascade "opens and parses every markdown file" | mention-query targeting | 10 |
| `Features/PropertiesPM.md` cascade descriptions | sweeps described as whole-corpus | key-query targeting | 11 |
| `ContextPM.md` §Pending "The re-walk" | "Every change the tree can see re-reads the nexus from disk" | phases 1–3 landing | 7 |
| `ContextPM.md` §Debt | "View format, grouping, and banner saves still trigger a full vault walk, as does `submitPropertyRename`" | push-after-write on those channels | 7 |
| `Features/SidebarPM.md`, `Features/PommoraDND.md` | "waits for the confirming re-walk" phrasing | the confirming push replaces the re-walk | 7 |
| `Detail/Views/viewMint.ts` comment | "the explicit `load()` is the sole confirm" | the view-save push | 7 |
| `FrameworkPM.md` near-term queue | the re-walk/index queue entries | this plan executing | 12 |

**Dead Vocabulary**
- `allCollectionFolders` → expect 0. Legitimate hits: none.
- Control: `readNexus` → 7 main-process files at planning time (`grep -rln "readNexus(" src/main --include="*.ts"` excluding tests). Zero here means the sweep never ran; `readNexus.ts` and `liveTree.ts` keep it nonzero after conversion.

---

### Phase 1 — The Patch Seam and the Live Tree

#### Task 1: Move the patch transforms to shared — and make them canon-grade

**Requirement:** 1, 6 (prerequisite)

**Why:** Main is about to patch trees; the renderer already owns pure, tested transforms for exactly that (`treeMove.ts` imports only `@shared/*` — verified at `src/renderer/src/treeMove.ts:5-14`). One definition serving both processes is the DRY rule. But the transforms were written as *provisional* — their own comments name the confirming reload as the healer for stale child paths (`treeMove.ts:190-191`: space/context renames update titles only), and their created nodes carry fewer keys than walk literals (6 vs 12 on `SetNode`), which breaks `stabilize`'s key-count comparison and with it Requirement 6's drift detector. Both sloppinesses were safe under the reload; canon-producers can't keep them.

**Files:**
- Move: `src/renderer/src/treeMove.ts` → `src/shared/treePatch.ts`; `src/renderer/src/treeMove.test.ts` → `src/shared/treePatch.test.ts`.
- Modify (in the moved file): the `renameSpace`/`renameContext` arms of `patchContextGroupsInTree` reparent descendant paths via the existing `reparentPaths`; the create/insert paths build nodes through a node factory emitting the walk's full key shape.
- Create (in `src/shared/treePatch.ts` or a sibling): the node factories — one per node kind, stating the walk's literal shape once; `readNexus.ts` adopts them in the same commit so the shape has one owner.
- Modify: the importers — `src/renderer/src/store.ts`, `src/renderer/src/Detail/Views/Cards/CardsView.tsx` (enumerated by grep at planning time; the type gate re-enumerates on the move).

**Derivation**
- `grep -n "reload\|re-walk\|confirming" src/shared/treePatch.ts` after the move → every hit is a provisional-arm comment; each named arm is upgraded or the comment rewritten to state the arm is complete. Control: `grep -c "export function" src/shared/treePatch.ts` → 11.

**Interfaces**
- Produces (unchanged signatures, new home): `relocateNodeInTree`, `insertCreatedInTree`, `patchContextGroupsInTree`, `updateNodeInTree`, `renameNodeInTree`, `removeNodeInTree`, `patchNodeInTree`, `reorderTopInTree`, `reorderChildrenInTree`, `reorderPagesInTree`, `byOrder`; plus the node factories.
- Assumed by: Tasks 2, 5, 6, 7 (main-side patching), the renderer's existing optimism, and `readNexus.ts` (factories).

**Must agree:** a transform-built node and a walk-built node of the same entity are `stabilize`-identical — one test builds a fixture both ways (walk the fixture; apply the equivalent create transform) and asserts `stabilize` returns reference equality per subtree.

**Steps:**
- [ ] Move both files; update the two import sites to `@shared/treePatch`.
- [ ] Write the failing shape-parity and reparenting tests; upgrade the arms and add the factories; adopt the factories in `readNexus.ts`.
- [ ] Run the gates — expect green; the type gate flags any importer the grep missed.
- [ ] Commit: `refactor(shared): the tree patch transforms serve both processes as canon`

#### Task 2: The live tree module

**Requirement:** 1, 2, 7

**Why:** Main currently re-derives the tree on demand and holds nothing. A single module owning "the tree as last verified or patched" is what mutations and the watcher patch against, what `nexus:state` serves, and what makes the walk single-flight — one in-flight walk, concurrent callers await the same promise, which retires the `walkCache` generation race once Task 3 routes every remaining caller through it. A walk that was in flight when a mutation landed observed pre-mutation disk, so its result must be discarded, not installed — the stale-walk guard extends the same discard shape as the root switch.

**Files:**
- Create: `src/main/liveTree.ts`, `src/main/liveTree.test.ts`.

**Interfaces**
- Produces: `getLiveTree(): NexusTree | null` · `refreshTree(root): Promise<NexusTree>` (single-flight; a root switch or a mutation landing mid-walk discards the result and re-walks) · `patchLiveTree(fn: (t: NexusTree) => NexusTree | null): NexusTree | null` (null from `fn` → caller falls back to `refreshTree`; bumps the mutation epoch) · `dropLiveTree(): void` (session close/switch, and on a refresh rejection caused by a missing root).
- Assumed by: Tasks 3, 5, 6, 7 and the index reconciler (Task 8).

**Failure half:** patch on a null tree → null (caller refreshes); a refresh rejecting (transient FS state) → the held tree stays as last-known and the promise slot clears so the next caller retries — but a rejection identifying a missing root drops the held tree so reads report the error instead of a ghost nexus; a stale walk (epoch moved) → discarded, one re-walk; root switch mid-walk → discarded, matching `sessionRoot()` guards elsewhere.

**Steps:**
- [ ] Write failing tests: single-flight (two concurrent refreshes, one walk — count via an injected walker), patch-then-get identity, null-patch fallback signal, the stale-walk epoch discard (patch mid-walk → walk result discarded → second walk installs), root-switch discard, missing-root drop.
- [ ] Implement; re-run — expect pass.
- [ ] Full gates green. Commit: `feat(main): a live tree, walked once and patched thereafter`

#### Task 3: Reads serve the live tree

**Requirement:** 6, 7

**Why:** With the tree held, `nexus:state` should serve it rather than walk; ⌘R and open become the deliberate verification points. The open path today walks in `runOpenRecord` and again for the renderer — but the record walk observes disk *before* `runRemintPass` rewrites duplicate ids, so it can only seed the live tree when the remint wrote nothing; a remint that wrote forces a fresh walk, or two entities share an id all session (colliding every id-keyed store from selection to folds). `trash:list`'s gratuitous walk and the two remaining out-of-seam callers (`provenance.ts` restore, `restoreProperty.ts`) convert to `refreshTree`/`getLiveTree` here, completing the single-flight claim.

**Files:**
- Modify: `src/main/index.ts` — the `nexus:state` handler (serve `getLiveTree() ?? await refreshTree(root)`; a refresh rejection returns the existing error envelope — the missing-root case reaches the renderer again by Task 2's drop); the reload-state/⌘R path calls `refreshTree` explicitly and propagates rejection to the error envelope; the `trash:list` handler takes the live tree for `trashRows` titling; the open path seeds via `runOpenRecord`.
- Modify: `src/main/record.ts` — `runOpenRecord` returns the walked tree *and* whether the remint pass wrote; the open path seeds the live tree from that walk only when nothing was reminted, else calls `refreshTree`.
- Modify: `src/main/provenance.ts` (`restoreArtifact`) and `src/main/crud/restoreProperty.ts` — their `readNexus` calls become `refreshTree`.

**Failure half:** `nexus:state` with no live tree and a failing walk → the existing error envelope, unchanged; trash listing with a null tree → refresh first (trash is never hot); a remint-forced second walk failing → the pre-remint tree still serves (stale ids for the session beat no tree), logged.

**Steps:**
- [ ] Wire the handlers; tests: ⌘R provably forces a walk (refresh spy) while a second `nexus:state` call provably doesn't; a reminted open provably re-walks (fixture with a duplicated id); a missing-root refresh surfaces `status: 'error'`.
- [ ] Full gates green. Manual: launch the dev app, confirm one walk logged at open on a clean nexus, sidebar intact, ⌘R walks again.
- [ ] Commit: `feat(main): reads serve the live tree; open and reload are the verification points`

#### Gate 1 — the tree lives in main
- [ ] Gates green, exit codes read directly.
- [ ] Clean-open path walks exactly once (log evidence); `nexus:state` serves without walking; ⌘R forces the walk and propagates failure.
- [ ] `grep -rn "readNexus(" src/main --include="*.ts"` excluding tests → only `readNexus.ts`, `liveTree.ts`, and `record.ts` (the seam and its seeder) remain.
- [ ] Simplification + review dispatched against `<base>..HEAD`; concerns fixed or ruled.
- [ ] Progress hashes filled in.

---

### Phase 2 — The Watcher Spends Its Path

#### Task 4: Event classification

**Requirement:** 2

**Why:** The watcher already receives the changed path and throws it away. Classifying events lets the common cases (a page edited, created, or deleted externally) cost one file read instead of a walk, while everything unclassifiable falls back to `refreshTree` — the same self-healing shape `pushNav` already models. The classifier must never *admit* what the walk wouldn't: it reuses `readPageRecord` and the sidecar readers, so admission agrees by construction. Genuine leaf fields patch; structural walk *inputs* don't — the registry resolves into every `CollectionNode.properties`, the contexts registry and `state.json` orderings shape the tree rather than sit in it — so external edits to those refresh.

**Files:**
- Create: `src/main/watchPatch.ts`, `src/main/watchPatch.test.ts` — `classifyEvent(root, event, path)` → a union: `page-upsert` · `page-remove` · `container-meta` · `space-meta` · `settings-leaf` · `homepage-leaf` · `full-refresh` (directory add/unlink, agenda-config changes, `properties.json`, `contexts.json`, `state.json`, `excluded_folders` changes, anything whose parent chain isn't in the live tree).
- Modify: none yet (Task 5 consumes it).

**Interfaces**
- Produces: the classification union and `applyWatchEvents(root, events): Promise<'patched' | 'refresh'>` — batch-applies a settle window's events against the live tree, returning `refresh` if any event demands it.
- Assumed by: Task 5; the index maintainer (Task 9) rides the same classification.

**Must agree:** classification with the walk's own rules — a file `readPageRecord` returns null for (Unknown admission) must not enter the tree via the patcher, and a folder `shouldSkipDir` excludes must classify as ignored. One test drives the same fixture through `walkNexus` and `applyWatchEvents` and asserts identical trees.

**Failure half:** the per-path read failing mid-write → `refresh` (transient state; the walk path already models this); a path deleted between event and read → `page-remove`; an empty batch → no-op, no push.

**Steps:**
- [ ] Failing tests: each classification arm (including the three structural-input refreshes), the must-agree fixture, the failure halves.
- [ ] Implement; re-run — expect pass. Full gates green.
- [ ] Commit: `feat(main): watcher events classify to targeted patches`

#### Task 5: The watcher patches

**Requirement:** 2

**Why:** Swap the settle handler's unconditional walk for `applyWatchEvents`, falling back to `refreshTree` when classification says so. External edits keep surfacing live — same watcher, same settle window — at per-path cost. Docs describing the watcher's walk go false here and are rewritten in this commit.

**Files:**
- Modify: `src/main/watcher.ts` — accumulate paths during the settle window (the debounce timer stays; it collects instead of discarding); `push` applies the batch and pushes the resulting tree; `refresh` outcomes push the walked tree exactly as today. Push-on-change is top-level identity per the Global Constraint.
- Modify: `Features/ArchitecturePM.md` §The File Watcher (Made False row).

**Failure half:** a burst mixing patchable and unpatchable events → one refresh, not N; an event arriving mid-walk → queued for the next settle (the single-flight walk plus the epoch discard absorb the race).

**Steps:**
- [ ] Tests: batch accumulation, mixed-batch refresh, push-on-change-only (asserted on top-level identity).
- [ ] Full gates green. Manual pass (dev app + a terminal): externally create, edit, then delete a page — each surfaces within the settle with no walk logged; externally move a whole folder — the fallback walk fires and the tree is correct.
- [ ] Rewrite the ArchitecturePM watcher paragraph in this commit.
- [ ] Commit: `feat(watcher): the path is spent, not discarded`

#### Gate 2 — external edits at per-path cost
- [ ] Gates green; manual external-edit pass done and logged in the Log.
- [ ] Must-agree fixture test in place and green.
- [ ] Simplification + review against `<base>..HEAD`; concerns fixed or ruled.
- [ ] Progress hashes filled in.

---

### Phase 3 — Writes Patch Instead of Reload

#### Task 6: Main confirms every write channel by patch and push

**Requirement:** 1

**Why:** `handleMutate` writes disk and returns; today the renderer then re-walks the world — and the non-mutate write channels (`schema:*`, `views:*`, settings) rely on that same renderer reload as their *sole* confirmation, since their writes are echo-suppressed at the watcher. Main applying the matching change to the live tree and pushing `nexus:changed` makes the push the confirmation for **all** of them. Three outcomes, not two: `patch` (a transform applies), `'no-change'` (the write is invisible to the tree — `setProperty`, `emptyBundle`; this arm *relocates* the renderer's `invisible`-list knowledge rather than deleting it), and `refresh` (no transform yet — the list is enumerated at execution against the `MutateRequest` arms and expected to shrink; `setContext` patches via `contextValues`, it is not no-change). Registry ops patch by def-id substitution — the renamed def replaces its id-match in `tree.registry` *and* in every `CollectionNode.properties`, which embed resolved defs (leaf-patching `tree.registry` alone would split one fact into two). View saves patch the container node's `views` via `patchNodeInTree`.

**Files:**
- Modify: `src/main/index.ts` — the mutate call site and the `schema:*`/`views:*`/settings write handlers: on `ok`, patch / no-change / refresh, then push once if the tree object changed. `mutate.ts` stays pure filesystem.
- Create: `src/main/mutatePatch.ts`, `src/main/mutatePatch.test.ts` — `patchForMutation(tree, req, reply): NexusTree | 'no-change' | null` plus the registry-substitution and view-save patchers for the non-mutate channels.

**Interfaces**
- Produces: `patchForMutation` and the channel patchers (null → caller refreshes).
- Assumed by: Task 7 (the renderer stops reloading only because these pushes exist).

**Failure half:** an op reporting `ok` whose patch returns null → refresh, never a silent stale tree; a patch throwing → caught, refresh, logged (a patch bug must degrade to the old behavior, not to drift); a `'no-change'` op → provably no push (a cell edit costs zero IPC).

**Negative control:** the no-change arm — a `setProperty` fixture asserts zero walks *and* zero pushes; with the arm removed (op routed to refresh) the same test's walk-count assertion goes red.

**Steps:**
- [ ] Tests per arm: patched tree matches a fresh walk of the mutated fixture (reuse the Task 4 must-agree harness); registry rename shows the new name inside a collection's embedded defs; view save shows in the container node; the negative control both halves.
- [ ] Full gates green.
- [ ] Commit: `feat(main): every write channel confirms by patch and push`

#### Task 7: The renderer stops reloading

**Requirement:** 1, 8

**Why:** With main pushing confirmed trees for every write channel, the renderer's load-after-write is a second, slower confirmation of the same fact. Removing it retires the hottest walk trigger in the app. Renderer optimism stays — it shares the same transforms, and `applyTree` already reconciles the push when it lands a beat later. The docs naming "the confirming re-walk" and the ContextPM backlog/debt entries go false here.

**Files:**
- Modify: `src/renderer/src/store.ts` — `mutate` drops its closing `load()` and the `invisible` distinction (relocated to main in Task 6); `submitPropertyRename` drops its `load()`.
- Modify: the swept write-confirm `load()` callers per the Derivation — planning-time expectation: `PropertiesPane.tsx` `commit()`, the `useSaveView` consumers (`ViewPane`, `ViewDropdown`, `ViewSettings`, `viewMint.ts`), `SettingsPane`, the banner confirm in `CardsView.tsx`. Survivors, named: the open path (`openVia`, App mount `void load()`, reload-state `void load()`) and `TrashLeaf`'s batching.
- Modify: `ContextPM.md` (both Made False rows), `Features/ArchitecturePM.md` §Read + State, `Features/SidebarPM.md`, `Features/PommoraDND.md` (re-walk phrasing), the `viewMint.ts` "sole confirm" comment.

**Derivation**
- `grep -rn "\bload()" src/renderer/src --include="*.ts*" | grep -v "\.test\."` → 34 raw lines at planning time, most non-tree noise (`previews.load()`, `tabs.load()`, `devicePrefs.load()`); the tree-`load()` subset (including `void load()` forms) is ~17 and each site gets adjudicated keep/drop in the Log. Control: `grep -c "applyTree" src/renderer/src/store.ts` → ≥3; zero means the search never ran.

**Steps:**
- [ ] Re-run the derivation; adjudicate every site in the Log; drop the write-confirm calls; run full gates — green.
- [ ] Manual pass: rename, move, reorder, icon, banner, view save, property rename, option rename, a table cell edit — each lands visually with zero walks logged (the cell edit with zero pushes); then ⌘R and confirm `stabilize` reports the walked tree identical (the drift detector).
- [ ] Rewrite the five docs in this commit.
- [ ] Commit: `feat(renderer): the push is the confirmation`

#### Gate 3 — zero walks on the write path
- [ ] Gates green; the manual write sweep and the ⌘R drift check both logged in the Log.
- [ ] Derivation re-run against its control; every surviving `load()` caller named with its reason.
- [ ] Temporary walk-count instrumentation removed (or ruled kept).
- [ ] Simplification + review against `<base>..HEAD`; concerns fixed or ruled.
- [ ] Any user-visible surface seen running (the write sweep covers it).
- [ ] Progress hashes filled in.

---

### Phase 4 — The Content Index

#### Task 8: The tables, the opener, and the reconciler

**Requirement:** 5

**Why:** Two tables answer everything the targeted cascades ask: `mentions(path, title)` (a page's outbound link targets, normalized the way `scan.ts` normalizes) and `page_values(path, key, value)` (every property key and its JSON-serialized value — the keys query is `DISTINCT` over it; Nathan ratified full values). DDL is additive `CREATE TABLE IF NOT EXISTS` with no `SCHEMA_VERSION` bump — **and `openNexusDb` must run `applySchema` on the existing-database path too**, because today it early-returns on a version match and the new tables would never reach any nexus that has ever been opened (attack round 1's top finding; idempotent by `IF NOT EXISTS`). The index's corpus is the **cascade's** corpus, not the walk's: seeding and reconciling enumerate `listMarkdownFiles(root, {skipTopLevel: ['.nexus', '.trash']})` and admit by `sweepAdmitsBody` — the sets the rename cascade actually rewrites — so links in un-adopted folders keep working; the per-file parse still rides `cachedParse`, so tree-member pages cost nothing extra and the delta (un-adopted files) is a bounded read at open. Reconcile prunes paths the enumeration no longer yields.

**Files:**
- Modify: `src/main/db/schema.ts` — the two tables + indexes on `title` and `key`.
- Modify: `src/main/db/open.ts` — `applySchema(existing)` before the version-match return.
- Create: `src/main/db/contentIndex.ts`, `src/main/db/contentIndex.test.ts` — `upsertPageIndex(path, extract)`, `removePathIndex(path)`, `renamePathIndex(old, new)`, `reconcileIndex(seenPaths)`, `queryMentions(title): string[] | null`, `queryKeyHolders(key): string[] | null` (null = no index; never an empty array masquerading as "no mentions").
- Create: `src/main/indexSeed.ts` — the open-time seed/reconcile pass over the cascade corpus, invoked from the open path beside `runOpenRecord`.
- Modify: `src/main/connections/scan.ts` — export the shared extraction so scanner and extractor are one definition.

**Interfaces**
- Produces: the query/maintenance functions above; all no-op gracefully on a null `Db`.
- Assumed by: Tasks 9, 10, 11.

**Must agree:** two agreements, each with a crossing test. *Mention semantics:* one test feeds bodies covering every link syntax (plain `[[T]]`, aliased, markdown-link, code-masked non-mentions) through extraction and through `mentionsTitle`, asserting agreement. *Corpus:* a fixture holding an un-adopted folder with a linking note — every path `listMarkdownFiles` yields and `sweepAdmitsBody` admits is a path the seeded index knows.

**Failure half:** null Db → every function no-ops and queries return null (callers scan); a page whose parse fails → its rows are removed, matching the sweep's skip; reconcile with zero seen paths (empty nexus) → tables empty, no throw; a pre-existing v1 database → gains the tables with `local_state` intact (the upgrade-in-place negative control: open a fixture v1 db, assert tables exist *and* a pre-seeded fold row survives; with the opener change reverted the query test goes red on `no such table`).

**Steps:**
- [ ] Failing tests: both must-agree crossings, upsert/prune reconcile, null-Db signaling, the rename move, the upgrade-in-place control (both halves).
- [ ] Implement; full gates green.
- [ ] Rewrite ArchitecturePM's "none exists" Pending entry in this commit.
- [ ] Commit: `feat(db): the content index — mentions and property values, open-reconciled`

#### Task 9: Writers and the watcher maintain the rows

**Requirement:** 5

**Why:** The index is only queryable if it's current between opens. Every path that changes a page's body or frontmatter, and every watcher patch, updates rows in the same motion — the maintenance rides the seams that already exist rather than adding a parallel write path.

**Files:**
- Modify: at execution, derive the page-write seams (planning-time expectation: `io/pageFile.ts` writers, `rewritePageSerialized` callers in the cascades, the delete/trash path in `provenance.ts`/`mutate.ts`, the create path). The Derivation pins the list.
- Modify: `src/main/watchPatch.ts` — `page-upsert`/`page-remove` arms call the index maintainers with the record they already read; `full-refresh` outcomes trigger the reconcile pass (the corpus may have moved).

**Derivation**
- `grep -rn "rewritePageSerialized\|writePageFile\|atomicWriteFile" src/main --include="*.ts"` excluding tests → enumerate at execution and adjudicate each site (page-content writers index; sidecar/config writers don't). Control: `rewritePageSerialized` definition in `io/atomicWrite.ts` → ≥1.

**Failure half:** an index write failing after a successful file write → logged, never fatal (the open-time reconcile heals it); a trash restore → rows reappear via the restore path's existing read.

**Steps:**
- [ ] Tests: a mutated fixture's rows match a from-scratch reconcile after each seam fires (rename, edit, delete, restore, external event).
- [ ] Full gates green. Commit: `feat(main): every page write keeps the index current`

#### Task 10: The rename cascade queries

**Requirement:** 3, 8

**Why:** `renameCascade` opens every markdown file to ask a question the index now answers over the same corpus. Querying first and keeping `mentionsTitle` as the per-file confirmation inside the rewrite means a stale row costs one wasted read, never a wrong rewrite — and a null query falls back to the existing full scan, which stays as the fallback implementation rather than dying.

**Files:**
- Modify: `src/main/crud/cascade.ts` — `renameCascade` takes `queryMentions(oldTitle)` when non-null; null → the existing `listMarkdownFiles` scan. `src/main/blocks.ts` `rewriteBlockConnections` keeps its own corpus (block hosts live outside the page index — a stated survivor).
- Modify: `Features/ConnectionsPM.md` (Made False row).

**Survivors:** the full-scan path (the null-index fallback); `mentionsTitle` inside the rewrite (the stale-row guard); `rewriteBlockConnections`'s own walk (block hosts are few and outside the page corpus — indexing them is not earned yet).

**Negative control:** a fixture where 3 of 40 pages mention the title, one of them in an un-adopted folder — the cascade provably opened exactly those 3 (instrument via the rewrite callback), and with the query artificially returning all paths the same test's open-count assertion goes red.

**Steps:**
- [ ] Failing test per the negative control; implement; green. Full gates green.
- [ ] Rewrite the ConnectionsPM cascade paragraph in this commit.
- [ ] Commit: `feat(crud): a rename opens only the files that mention it`

#### Task 11: The property cascades query

**Requirement:** 4, 7, 8

**Why:** `cascadePages`, the governed sweeps behind property rename/delete, and `deleteProperty`'s **snapshot pass** (which reads every page before the sweep even starts) all enumerate whole corpora to find pages holding a key; `queryKeyHolders` answers directly. The query lives at the **call sites** (`deleteProperty.ts`, `optionOps.ts`), never inside `sweepGovernedRoots` — its other caller is the Context cascade, whose `(Title)`-wrapped governed keys the index doesn't hold; a query pushed into the shared function would return a legitimate-looking empty set for those and silently rewrite nothing. `allCollectionFolders` — a full `readNexus` run to list collection folders — is deleted outright: its three consumers take the live tree's collection list. The compiler enumerates the fallout.

**Files:**
- Modify: `src/main/crud/optionOps.ts`, `crud/deleteProperty.ts` (both `snapshot` and the sweep invocation) — query-first at the call site, scan-fallback on null, per-file key confirmation kept (same belt as Task 10).
- Delete: `allCollectionFolders` in `src/main/crud/assignment.ts`; convert its consumers (`deleteProperty.ts`, `optionOps.ts`, `restoreProperty.ts`) to the live tree.
- Modify: `Features/PropertiesPM.md` (Made False row).

**Survivors:** `sweepGovernedRoots` itself, untargeted (shared plumbing; its enumeration remains the fallback and the Context cascade's path); `contextCascade.ts`'s scan (its keys are outside the index — stated, not an omission); the `_space.json` sidecar half of the governed sweep (spaces are few and outside the page corpus).

**Negative control:** a fixture where 2 of 30 pages hold the key — the delete provably read those 2 in snapshot and rewrote those 2 in the sweep (the sweep's `touched` output plus open-count instrumentation), and with targeting disabled the open-count assertion goes red. A Context unlink on the same fixture still rewrites its tagged pages (proving the Context path kept its scan).

**Steps:**
- [ ] Failing tests per the negative control (all three halves); implement; green. Full gates green (typecheck enumerates every `allCollectionFolders` consumer).
- [ ] Dead-vocabulary sweep: `allCollectionFolders` → 0 against the `readNexus` control.
- [ ] Rewrite the PropertiesPM cascade descriptions in this commit.
- [ ] Commit: `feat(crud): property sweeps open only the pages that hold the key`

#### Gate 4 — the cascades are targeted
- [ ] Gates green; all negative controls red-tested and green.
- [ ] Dead vocabulary at 0 against a live control.
- [ ] Simplification + review against `<base>..HEAD`; concerns fixed or ruled.
- [ ] Progress hashes filled in.

---

### Phase 5 — Closeout

#### Task 12: Reconcile the record

**Requirement:** 8

**Why:** The remaining Made False rows (FrameworkPM's queue entries), the HistoryPM entry for the arc (History-Format), and the acceptance criterion's end-to-end pass all land here — the record closes in the same motion the work does.

**Files:**
- Modify: `FrameworkPM.md`, `HistoryPM.md`, `ContextPM.md` (Pending Focuses reflects what shipped and what Sequenced After holds).

**Steps:**
- [ ] Run the acceptance criterion end-to-end on the dev build (including the pre-existing-db upgrade case); log the observations in the Log.
- [ ] Dispatch `comment-killer-agent` + `code-simplifier` over the full range; fold verified findings.
- [ ] Write the Delivery Claim; dispatch the neutral verifier (claim vs. the ratified requirements); on a clean yes, dispatch `build-breaking-agent` against the shipped range.
- [ ] Closing sweeps: Dead Vocabulary against control; every Made False row's rewrite verified landed in its named commit.
- [ ] Doc rewrites + History entry committed; lessons routed to `.claude/Guidelines`.

#### Gate 5 — closed
- [ ] Acceptance criterion observed and logged.
- [ ] Neutral verification clean; attack round's findings fixed or ruled.
- [ ] Line-count delta reported (code only, comments/tests excluded).
- [ ] Progress hashes filled in; Closeout written.

---

## Implementation Log

### Progress
- [ ] **Phase 1** — The patch seam and the live tree · base `<commit>`
  - [ ] Task 1 — transforms to shared, canon-grade
  - [ ] Task 2 — the live tree module
  - [ ] Task 3 — reads serve the live tree
- [ ] **Phase 2** — The watcher spends its path
  - [ ] Task 4 — event classification
  - [ ] Task 5 — the watcher patches
- [ ] **Phase 3** — Writes patch instead of reload
  - [ ] Task 6 — every write channel confirms by push
  - [ ] Task 7 — the renderer stops reloading
- [ ] **Phase 4** — The content index
  - [ ] Task 8 — tables, opener, reconciler
  - [ ] Task 9 — writers maintain rows
  - [ ] Task 10 — rename cascade queries
  - [ ] Task 11 — property cascades query
- [ ] **Phase 5** — Closeout
  - [ ] Task 12 — reconcile the record

### Rulings
- Architecture: main-owned live tree + index sidecar over index-as-source-of-truth — Nathan, this session.
- Index scope: mentions + property keys + full values — Nathan, this session (revised from keys-only mid-session).
- The journal is next-session work, not scope here — Nathan, this session.
- Attack round 1 (build-breaking-agent): 14 findings (5 High, 4 Medium, 5 Low), 2 unknowns — every finding verified against the code and folded into this revision; none rejected. The killed-candidates list is recorded under Inherited Reasoning.

### Open Against Later Tasks
### Deviations
### Lessons
### Sequenced After
- The property-cascade journal (record the owed sweep before sweeping; heal at open) — the next session after this plan closes.
- FTS body text + ⌘K search, backlinks/Linked-From, ContextView membership — consumers of the index, each its own arc.
- Evaluating retirement of renderer-side optimism once main's push latency is measured.
- The `excluded_folders` Settings surface (compounds less now, still absent).

### Closeout
