## Live Tree & Content Index — Implementation Plan

> **Status:** written, pending review · Spec: this session's ratified decisions (recorded under Goal and Rulings) · Execute tasks in order.
> Citations name files and symbols; re-derive before editing. Line numbers appear only in Task 1.

**Goal**

Today the only way Pommora learns what is on disk is `readNexus` — a full recursive walk that re-enumerates every directory and stats every file, re-run after nearly every in-app mutation (`store.mutate` ends in `load()`), on every external-edit settle (the watcher discards the event path), and inside the property cascades. The rename cascade separately opens every markdown file in the nexus hunting link mentions, and the option/property cascades open every page under every collection.

At the end of this plan, none of that survives as a hot path. Main holds a **live in-memory `NexusTree`**: built by one walk at open, patched in place by mutations and by path-aware watcher events, and pushed to the renderer over the existing `nexus:changed` channel. `nexus.db` gains a **content index** — which files mention which titles, and which pages carry which property keys and values — seeded and reconciled by the open walk, maintained by writers and the watcher, and queried by the cascades so a rename or property sweep opens only the files it will actually change. The full walk survives on purpose, demoted to open and ⌘R as the self-healing verification pass.

**Why this shape:** three approaches were weighed — (1) main-owned live tree with the index riding sidecar, (2) the index as the read model with the tree derived from SQLite, (3) targeted patches with no index. Nathan ratified (1) with the index covering mentions **and** full property values: it reaches every goal with the smallest churn, keeps the renderer contract nearly untouched (`applyTree` + `stabilize` already reconcile arbitrary pushes), keeps files-canonical trivially true (the index is disposable — delete `nexus.db` and the next open rebuilds it), and reuses the pure patch transforms the renderer already owns rather than inventing a second mechanism.

**Deliberately not solving here:** full-text body search / ⌘K (the schema leaves room; the FTS table is a later session), backlinks UI, the property-cascade journal (next session — see Sequenced After), the mobile lazy reader, and any change to on-disk content formats.

**Requirements:**
1. In-app mutations trigger zero full walks; main patches its live tree and pushes.
2. External edits still surface live at per-path cost; events the patcher can't resolve fall back to a full refresh (self-healing, never silent drift).
3. A page rename rewrites only files the index says mention the old title.
4. Property cascades (option rename/remove/clear, property delete/rename sweeps) open only pages the index says hold the key.
5. `nexus.db` gains `mentions` and `page_values` tables — seeded/reconciled by every open walk, maintained by writers and watcher, disposable by construction.
6. Files stay canonical; open and ⌘R run the full verification walk; after any patched sequence a forced walk produces a tree `stabilize` reports identical.
7. Ride-alongs: `readNexus` becomes single-flight (retiring the `walkCache` generation race), `trash:list` and the open path stop double-walking, `allCollectionFolders` is deleted.
8. Every document made false is rewritten in the commit that falsifies it (see Made False).

**Acceptance — the whole thing working:** on a dev build over a seeded test nexus (~200 pages, 3 of which mention page P): renaming P opens exactly those 3 files plus P itself (observed via cascade logging) with no `readNexus` call (observed via a temporary walk log); creating, editing, and deleting a page externally each surface in the sidebar within the settle window, again with no walk logged; a mutation with no patch transform still lands correctly via the fallback refresh; deleting `nexus.db` and reopening rebuilds the index and all of the above still holds; ⌘R walks fully and `stabilize` returns the prior tree object, proving the patched tree never drifted.

**Forced By**
- The renderer never touches Node (hard rule) → the live tree, the watcher patcher, and the index all live in `src/main`; the renderer keeps consuming pushed trees.
- `treeMove.ts` imports only from `@shared/*` (verified) → the patch transforms can move to `src/shared` unchanged and serve both processes; writing a second patch engine in main would violate the two-definitions rule.
- `applyTree` + `stabilize` already reconcile any pushed tree, and unchanged subtrees keep identity → the renderer contract does not change; no new IPC channel is needed for phases 1–3.
- `cachedParse` stores one record per `(path, mtime, size)` and the walk is the verification pass → mention/value extraction must ride the same parse closure, or warm walks would re-read every body.
- `rmwJsonStrict` / sidecar sweeps already refuse or skip unparseable files → no settings-guard work belongs in this plan.
- `openDb` may return null (DB is optional by design) → every index query needs a scan fallback; the old sweep code survives as that fallback, not as debt.
- `beginWalk`/`endWalk` share one global generation counter → two overlapping walks wipe each other's cache entries; single-flighting `readNexus` retires the race without touching `walkCache` internals.
- Additive `CREATE TABLE IF NOT EXISTS` DDL is backward- and forward-compatible → no `SCHEMA_VERSION` bump, so nobody loses folds/tabs to the drop-on-mismatch policy.
- Watcher echo suppression (`writeEcho`) keeps app writes out of the watcher → mutation patching (Phase 3) and watcher patching (Phase 2) never double-apply.

**Inherited Reasoning**
- Verification-walk over event-application was the original ruling (HistoryPM, walk-cache arc); this plan doesn't reverse it — it keeps the walk as the verifier and adds tracked state between verifications. Container-surgical reconcile was "held, not rejected"; the watcher patcher is its arrival.
- The renderer's optimistic patches stay. They share the moved transforms with main, so there is one definition; whether renderer optimism can be retired once pushes prove fast is a named follow-on, not scope.
- The ContextPM settings-guard debt entry was found already shipped (`rmwJsonStrict` + tests) this session — verified, doc corrected. Lesson: verify "known issue" lists against code before building from them.
- A move cascade on page drag was ruled out previously ("no cascade on move at all") — nothing here reintroduces one. Moves patch paths in the tree and index rows; bodies are untouched.

**Grounding** *(re-open these; don't cite them)*
- `Pommora/src/main/readNexus.ts` — the walk: `readNexus`, `walkNexus`, `readPageRecord`, `readSet`, `readPageCollection`, `readSpace`; per-page parse rides `cachedParse`.
- `Pommora/src/main/walkCache.ts` — `(mtime, size)` parse gate; global `gen` counter; prune at `endWalk`.
- `Pommora/src/main/watcher.ts` — `onEvent` discards the path; `SETTLE_MS` debounce; `pushNav` is the existing precedent for a targeted, walk-free push.
- `Pommora/src/renderer/src/store.ts` — `load`, `applyTree`, `mutate` (the `invisible` list and the closing `load()`), `submitPropertyRename`.
- `Pommora/src/renderer/src/treeMove.ts` + `treeMove.test.ts` — the pure patch transforms and their tests.
- `Pommora/src/renderer/src/treeStabilize.ts`, `treeIndex.ts` — structural sharing; the per-tree derived-index WeakMap.
- `Pommora/src/main/crud/cascade.ts` (`renameCascade`), `crud/governedSweep.ts` (`sweepGovernedRoots`), `crud/optionOps.ts` (`cascadePages`), `crud/deleteProperty.ts`, `crud/assignment.ts` (`allCollectionFolders`), `main/blocks.ts` (`rewriteBlockConnections`).
- `Pommora/src/main/connections/scan.ts` (`mentionsTitle`, `codeMask`), `connections/rewrite.ts` (`rewriteConnections`) — what a mention *is*; the extractor must agree with these.
- `Pommora/src/main/db/driver.ts`, `db/schema.ts`, `db/open.ts` — the seam, the two-table DDL, drop-on-mismatch policy.
- `Pommora/src/main/index.ts` — `nexus:state` handler, `trash:list` handler, `adoptNexusInner`/launch-restore open path; `record.ts` `runOpenRecord`.
- `Pommora/src/shared/bridge.ts` — `nexus:state`, `nexus:changed`; no partial-tree channel exists.

**Environment:** Plan directory `.claude/Planning` (convention). Explorer: `Explore` agent. Attack reviewer: `build-breaking-agent`. Code reviewer: general-purpose scoped to correctness. Simplification: `code-simplifier`; comment pass: `comment-killer-agent`. Neutral verifier: general-purpose. Gates (from `Pommora/`): `npm run typecheck` · `npm run test` · `npm run lint` — exit codes read directly, never piped (pipefail lesson). Rules directory: `.claude/Guidelines`. No formal spec document exists; the ratified decisions above are the spec input.

**Shapes:** additive (live tree, index, patcher) · refactor (cascades and reads re-routed, behavior preserved) · removal (`allCollectionFolders`, the renderer's load-after-mutate) · fix (single-flight walk). Not a migration: no on-disk content format changes; the DDL is additive and the index disposable.

**Global Constraints (every task inherits these):**
- Gates: `npm run typecheck` && `npm run test` && `npm run lint` from `Pommora/`, each exit code read directly.
- Main owns the filesystem; renderer never touches Node; every IPC channel declared once in `src/shared/bridge.ts`; IPC returns the `Result` envelope, never throws.
- One tree-touching writer at a time. Stage explicit paths only (parallel-session discipline).
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
| `ContextPM.md` §Debt | "View format, grouping, and banner saves still trigger a full vault walk, as does `submitPropertyRename`" | mutation patching | 7 |
| `Features/SidebarPM.md`, `Features/PommoraDND.md` | "waits for the confirming re-walk" phrasing | the confirming push replaces the re-walk | 7 |
| `FrameworkPM.md` near-term queue | the re-walk/index queue entries | this plan executing | 12 |

**Dead Vocabulary**
- `allCollectionFolders` → expect 0. Legitimate hits: none.
- Control: `readNexus` → 7 main-process files at planning time (`grep -rln "readNexus(" src/main --include="*.ts"` excluding tests). Zero here means the sweep never ran; the count may shrink as callers convert but `readNexus.ts`, `record.ts`, `watcher.ts`, and `index.ts` keep it nonzero.

---

### Phase 1 — The Patch Seam and the Live Tree

#### Task 1: Move the patch transforms to shared

**Requirement:** 1 (prerequisite)

**Why:** Main is about to patch trees; the renderer already owns pure, tested transforms for exactly that (`treeMove.ts` imports only `@shared/*` — verified at `src/renderer/src/treeMove.ts:5-14`). One definition serving both processes is the DRY rule; a main-side copy would be the two-writers defect this codebase's hard rules name explicitly.

**Files:**
- Move: `src/renderer/src/treeMove.ts` → `src/shared/treePatch.ts`; `src/renderer/src/treeMove.test.ts` → `src/shared/treePatch.test.ts`.
- Modify: the importers — `src/renderer/src/store.ts`, `src/renderer/src/Detail/Views/Cards/CardsView.tsx` (enumerated by grep at planning time; the type gate re-enumerates on the move).

**Interfaces**
- Produces (unchanged signatures, new home): `relocateNodeInTree`, `insertCreatedInTree`, `patchContextGroupsInTree`, `updateNodeInTree`, `renameNodeInTree`, `removeNodeInTree`, `patchNodeInTree`, `reorderTopInTree`, `reorderChildrenInTree`, `reorderPagesInTree`, `byOrder`.
- Assumed by: Tasks 2, 5, 7 (main-side patching), and the renderer's existing optimism.

**Steps:**
- [ ] Move both files; update the two import sites to `@shared/treePatch`.
- [ ] Run the gates — expect green with no test-count change; the type gate flags any importer the grep missed.
- [ ] Commit: `refactor(shared): the tree patch transforms serve both processes`

#### Task 2: The live tree module

**Requirement:** 1, 2, 7

**Why:** Main currently re-derives the tree on demand and holds nothing. A single module owning "the tree as last verified or patched" is what mutations and the watcher patch against, what `nexus:state` serves, and what makes `readNexus` single-flight — one in-flight walk, concurrent callers await the same promise, which retires the `walkCache` generation race (two overlapping walks pruning each other's entries) by construction rather than by touching `walkCache`.

**Files:**
- Create: `src/main/liveTree.ts`, `src/main/liveTree.test.ts`.

**Interfaces**
- Produces: `getLiveTree(): NexusTree | null` · `refreshTree(root): Promise<NexusTree>` (single-flight: concurrent calls share one walk; a root switch invalidates and restarts) · `patchLiveTree(fn: (t: NexusTree) => NexusTree | null): NexusTree | null` (null from `fn` → caller falls back to `refreshTree`) · `dropLiveTree(): void` (session close/switch).
- Assumed by: Tasks 3, 5, 7 and the index reconciler (Task 8).

**Failure half:** patch on a null tree → null (caller refreshes); a refresh rejecting (transient FS state) → the held tree stays as last-known and the promise slot clears so the next caller retries; root switch mid-walk → the stale walk's result is discarded, matching `sessionRoot()` guards elsewhere.

**Steps:**
- [ ] Write failing tests: single-flight (two concurrent refreshes, one walk — count via an injected walker), patch-then-get identity, null-patch fallback signal, root-switch discard.
- [ ] Implement; re-run — expect pass.
- [ ] Full gates green. Commit: `feat(main): a live tree, walked once and patched thereafter`

#### Task 3: Reads serve the live tree

**Requirement:** 6, 7

**Why:** With the tree held, `nexus:state` should serve it rather than walk; ⌘R and open become the deliberate verification points. This also collapses the open path's double walk (`runOpenRecord` then the renderer's `load()`) to one, and retires `trash:list`'s gratuitous full walk — both were flagged, both are one-line consumers of `getLiveTree`.

**Files:**
- Modify: `src/main/index.ts` — the `nexus:state` handler (serve `getLiveTree() ?? await refreshTree(root)`; the reload-state/⌘R path calls `refreshTree` explicitly), the `trash:list` handler (live tree for `trashRows` titling), the open path (`adoptNexusInner` / launch restore: `runOpenRecord`'s walk seeds the live tree so the renderer's first `load()` is served from it).
- Modify: `src/main/record.ts` — `runOpenRecord` accepts/returns the walked tree so open walks once.

**Failure half:** `nexus:state` with no live tree and a failing walk → the existing error envelope path, unchanged; trash listing with a null tree → refresh first (trash is never hot).

**Steps:**
- [ ] Wire the three handlers; ⌘R must provably force a walk (test: refresh spy) while a second `nexus:state` call provably doesn't.
- [ ] Full gates green. Manual: launch the dev app, confirm one walk logged at open (temporary counter), sidebar intact, ⌘R walks again.
- [ ] Commit: `feat(main): reads serve the live tree; open and reload are the verification points`

#### Gate 1 — the tree lives in main
- [ ] Gates green, exit codes read directly.
- [ ] Open path walks exactly once (log evidence); `nexus:state` serves without walking; ⌘R forces the walk.
- [ ] Simplification + review dispatched against `<base>..HEAD`; concerns fixed or ruled.
- [ ] Progress hashes filled in.

---

### Phase 2 — The Watcher Spends Its Path

#### Task 4: Event classification

**Requirement:** 2

**Why:** The watcher already receives the changed path and throws it away. Classifying events lets the common cases (a page edited, created, or deleted externally) cost one file read instead of a walk, while everything unclassifiable falls back to `refreshTree` — the same self-healing shape `pushNav` already models for navigation. The classifier must never *admit* what the walk wouldn't: it reuses `readPageRecord` and the sidecar readers, so admission rules agree by construction.

**Files:**
- Create: `src/main/watchPatch.ts`, `src/main/watchPatch.test.ts` — `classifyEvent(root, event, path)` → a union: `page-upsert` · `page-remove` · `container-meta` · `space-meta` · `config-slice` (settings/state/homepage/registry/contexts-registry: targeted re-read patching only that tree field) · `full-refresh` (directory add/unlink, agenda-config changes, exclusion-list changes, anything whose parent chain isn't in the live tree).
- Modify: none yet (Task 5 consumes it).

**Interfaces**
- Produces: the classification union and `applyWatchEvents(root, events): Promise<'patched' | 'refresh'>` — batch-applies a settle window's events against the live tree, returning `refresh` if any event demands it.
- Assumed by: Task 5; the index maintainer (Task 9) rides the same classification.

**Must agree:** classification with the walk's own rules — a file `readPageRecord` returns null for (Unknown admission) must not enter the tree via the patcher, and a folder `shouldSkipDir` excludes must classify as ignored. One test drives the same fixture through `walkNexus` and `applyWatchEvents` and asserts identical trees.

**Failure half:** the per-path read failing mid-write → `refresh` (transient state; the walk path already models this); a path deleted between event and read → `page-remove`; an empty batch → no-op, no push.

**Steps:**
- [ ] Failing tests: each classification arm, the must-agree fixture, the failure halves.
- [ ] Implement; re-run — expect pass. Full gates green.
- [ ] Commit: `feat(main): watcher events classify to targeted patches`

#### Task 5: The watcher patches

**Requirement:** 2

**Why:** Swap the settle handler's unconditional walk for `applyWatchEvents`, falling back to `refreshTree` when classification says so. External edits keep surfacing live — same watcher, same settle window — at per-path cost. Docs describing the watcher's walk go false here and are rewritten in this commit.

**Files:**
- Modify: `src/main/watcher.ts` — accumulate paths during the settle window (the debounce timer stays; it collects instead of discarding); `push` applies the batch and pushes the resulting tree; `refresh` outcomes push the walked tree exactly as today.
- Modify: `Features/ArchitecturePM.md` §The File Watcher (Made False row).

**Failure half:** a burst mixing patchable and unpatchable events → one refresh, not N; an event arriving mid-walk → queued for the next settle (the single-flight walk absorbs the race).

**Steps:**
- [ ] Tests: batch accumulation, mixed-batch refresh, push-on-change-only.
- [ ] Full gates green. Manual pass (dev app + a terminal): externally create, edit, then delete a page — each surfaces within the settle with no walk logged; externally move a whole folder — the fallback walk fires and the tree is correct.
- [ ] Rewrite the ArchitecturePM watcher paragraph in this commit.
- [ ] Commit: `feat(watcher): the path is spent, not discarded`

#### Gate 2 — external edits at per-path cost
- [ ] Gates green; manual external-edit pass done and logged in the Log.
- [ ] Must-agree fixture test in place and green.
- [ ] Simplification + review against `<base>..HEAD`; concerns fixed or ruled.
- [ ] Progress hashes filled in.

---

### Phase 3 — Mutations Patch Instead of Reload

#### Task 6: Main patches after every successful mutation

**Requirement:** 1

**Why:** `handleMutate` writes disk and returns; today the renderer then re-walks the world. Main applying the matching transform to the live tree and pushing `nexus:changed` makes the push the confirmation. Ops with no transform (at execution, enumerate the `MutateRequest` arms against the moved transforms; property-registry and settings-backed arms patch via a targeted config-slice re-read, mirroring Task 4's `config-slice`) fall back to `refreshTree` — correctness never depends on patch coverage, and the fallback list is expected to shrink to zero over the phase.

**Files:**
- Modify: `src/main/index.ts` — the mutate IPC call site: on `ok`, apply patch or refresh, then push once if the tree changed. `mutate.ts` stays pure filesystem (no tree knowledge enters it).
- Create: `src/main/mutatePatch.ts`, `src/main/mutatePatch.test.ts` — `patchForMutation(tree, req, reply): NexusTree | null`, mapping request arms onto the shared transforms.

**Interfaces**
- Produces: `patchForMutation` (null → caller refreshes).
- Assumed by: Task 7 (the renderer stops reloading only because this push exists).

**Failure half:** a mutation reporting `ok` whose patch returns null → refresh, never a silent stale tree; a patch throwing → caught, refresh, and a logged warning (a patch bug must degrade to the old behavior, not to drift).

**Steps:**
- [ ] Tests per arm: patched tree matches a fresh walk of the mutated fixture (reuse the Task 4 must-agree harness).
- [ ] Full gates green.
- [ ] Commit: `feat(main): mutations confirm by patch and push`

#### Task 7: The renderer stops reloading

**Requirement:** 1, 8

**Why:** With main pushing confirmed trees, the renderer's load-after-mutate is a second, slower confirmation of the same fact. Removing it retires the hottest walk trigger in the app. Renderer optimism stays — it shares the same transforms, and `applyTree` already reconciles the push when it lands a beat later. The docs naming "the confirming re-walk" and the ContextPM backlog/debt entries go false here.

**Files:**
- Modify: `src/renderer/src/store.ts` — `mutate` drops its closing `load()` (the `invisible` distinction dissolves — no op reloads); `submitPropertyRename` drops its `load()`.
- Modify: `src/renderer/src/Settings/PropertiesPane.tsx` — `commit()` stops calling `load()` (the push carries registry changes via Task 6's config-slice patching); sweep the remaining renderer `load()` callers (14 sites at planning time, most legitimately open-path — re-derive: `grep -rn "get().load()\|await load()" src/renderer/src` and adjudicate each: open/reload keep it, mutation-confirmations drop it).
- Modify: `ContextPM.md` (both Made False rows), `Features/ArchitecturePM.md` §Read + State, `Features/SidebarPM.md`, `Features/PommoraDND.md` (re-walk phrasing).

**Derivation**
- `grep -rn "load()" src/renderer/src --include="*.ts*"` excluding tests → 14 at planning time. Legitimate survivors: open path (`openVia`, App mount, reload-state), TrashLeaf batching. Control: `grep -c "applyTree" src/renderer/src/store.ts` → ≥3; zero means the search never ran.

**Steps:**
- [ ] Drop the mutation-path `load()` calls; adjudicate the swept list; run full gates — green.
- [ ] Manual pass: rename, move, reorder, icon, banner, view save, option rename — each lands visually with zero walks logged; then ⌘R and confirm `stabilize` reports the walked tree identical (the drift detector).
- [ ] Rewrite the four docs in this commit.
- [ ] Commit: `feat(renderer): the push is the confirmation`

#### Gate 3 — zero walks on the mutation path
- [ ] Gates green; the manual mutation sweep and the ⌘R drift check both logged in the Log.
- [ ] Derivation re-run against its control; every surviving `load()` caller named with its reason.
- [ ] Temporary walk-count instrumentation removed (or ruled kept).
- [ ] Simplification + review against `<base>..HEAD`; concerns fixed or ruled.
- [ ] Any user-visible surface seen running (the mutation sweep covers it).
- [ ] Progress hashes filled in.

---

### Phase 4 — The Content Index

#### Task 8: The tables and the reconciler

**Requirement:** 5

**Why:** Two tables answer everything the cascades ask: `mentions(path, title)` (a page's outbound link targets, normalized the way `scan.ts` normalizes) and `page_values(path, key, value)` (every property key and its JSON-serialized value — the keys query is `DISTINCT` over it; Nathan ratified full values, which also feeds future cross-collection queries). DDL is additive `CREATE TABLE IF NOT EXISTS` — no `SCHEMA_VERSION` bump, nobody loses operational state. Extraction rides `readPageRecord`'s existing parse closure so warm walks stay parse-free; the open walk reconciles the whole index (upsert touched, prune unseen) exactly as `endWalk` prunes the parse cache — the index's staleness is bounded by the same verification pass that bounds the tree's.

**Files:**
- Modify: `src/main/db/schema.ts` — the two tables + indexes on `title` and `key`.
- Create: `src/main/db/contentIndex.ts`, `src/main/db/contentIndex.test.ts` — `upsertPageIndex(path, extract)`, `removePathIndex(path)`, `renamePathIndex(old, new)`, `reconcileIndex(seenPaths)`, `queryMentions(title): string[]`, `queryKeyHolders(key): string[]`.
- Modify: `src/main/readNexus.ts` — `readPageRecord`'s parse closure also extracts mention targets (reusing `codeMask` / the `scan.ts` patterns) and frontmatter property entries into the cached record; the walk feeds the reconciler.
- Modify: `src/main/connections/scan.ts` — export the shared extraction so scanner and extractor are one definition.

**Interfaces**
- Produces: the query/maintenance functions above; all no-op gracefully on a null `Db` (queries return null → callers scan).
- Assumed by: Tasks 9, 10, 11.

**Must agree:** the extractor and `mentionsTitle`/`rewriteConnections` on what a mention is — one test feeds bodies covering every link syntax (plain `[[T]]`, aliased, markdown-link, code-masked non-mentions) through extraction and through `mentionsTitle`, asserting agreement; a body `rewriteConnections` would rewrite must always be one the extractor indexed.

**Failure half:** null Db → every function no-ops and queries signal "no index" (never an empty array masquerading as "no mentions"); a page whose parse fails → its rows are removed, matching the walk's skip; reconcile with zero seen paths (empty nexus) → tables empty, no throw.

**Steps:**
- [ ] Failing tests: extraction agreement, upsert/prune reconcile, null-Db signaling, the rename move.
- [ ] Implement; full gates green.
- [ ] Rewrite ArchitecturePM's "none exists" Pending entry in this commit.
- [ ] Commit: `feat(db): the content index — mentions and property values, walk-reconciled`

#### Task 9: Writers and the watcher maintain the rows

**Requirement:** 5

**Why:** The index is only queryable if it's current between open walks. Every path that changes a page's body or frontmatter, and every watcher patch, updates rows in the same motion — the maintenance rides the seams that already exist rather than adding a parallel write path.

**Files:**
- Modify: at execution, derive the page-write seams (planning-time expectation: `io/pageFile.ts` writers, `io/atomicWrite.ts` `rewritePageSerialized` callers in the cascades, the delete/trash path in `provenance.ts`/`mutate.ts`, the create path). The Derivation pins the list.
- Modify: `src/main/watchPatch.ts` — `page-upsert`/`page-remove` arms call the index maintainers with the record they already read.

**Derivation**
- `grep -rn "rewritePageSerialized\|writePageFile\|atomicWriteFile" src/main --include="*.ts"` excluding tests → enumerate at execution and adjudicate each site (page-content writers index; sidecar/config writers don't). Control: `rewritePageSerialized` definition in `io/atomicWrite.ts` → ≥1.

**Failure half:** an index write failing after a successful file write → logged, never fatal (the open-walk reconcile heals it); a trash restore → rows reappear via the restore path's existing read.

**Steps:**
- [ ] Tests: a mutated fixture's rows match a from-scratch reconcile after each seam fires (rename, edit, delete, restore, external event).
- [ ] Full gates green. Commit: `feat(main): every page write keeps the index current`

#### Task 10: The rename cascade queries

**Requirement:** 3, 8

**Why:** `renameCascade` opens every markdown file to ask a question the index now answers. Querying first and keeping `mentionsTitle` as the per-file confirmation inside the rewrite means a stale row costs one wasted read, never a wrong rewrite — and a null Db falls back to the existing full scan, which stays as the fallback implementation rather than dying.

**Files:**
- Modify: `src/main/crud/cascade.ts` — `renameCascade` takes `queryMentions(oldTitle)` when available; `null` → the existing `listMarkdownFiles` scan. `src/main/blocks.ts` `rewriteBlockConnections` keeps its own corpus (block hosts live outside the page index — a stated survivor).
- Modify: `Features/ConnectionsPM.md` (Made False row).

**Survivors:** the full-scan path (the null-Db fallback); `mentionsTitle` inside the rewrite (the stale-row guard); `rewriteBlockConnections`'s own walk (block hosts are few and outside the page corpus — indexing them is not earned yet).

**Negative control:** a fixture where 3 of 40 pages mention the title — the cascade provably opened exactly those 3 (instrument via the rewrite callback), and with the query artificially returning all paths the same test's open-count assertion goes red.

**Steps:**
- [ ] Failing test per the negative control; implement; green. Full gates green.
- [ ] Rewrite the ConnectionsPM cascade paragraph in this commit.
- [ ] Commit: `feat(crud): a rename opens only the files that mention it`

#### Task 11: The property cascades query

**Requirement:** 4, 7, 8

**Why:** `sweepGovernedRoots`, `cascadePages`, and `deleteProperty` all enumerate whole corpora to find pages holding a key; `queryKeyHolders` answers directly. `allCollectionFolders` — a full `readNexus` run to list collection folders — is deleted outright: its three consumers take the live tree's collection list instead. The compiler enumerates the fallout.

**Files:**
- Modify: `src/main/crud/governedSweep.ts`, `crud/optionOps.ts`, `crud/deleteProperty.ts` — query-first, scan-fallback, per-file key confirmation kept (same belt as Task 10).
- Delete: `allCollectionFolders` in `src/main/crud/assignment.ts`; convert its consumers (`deleteProperty.ts`, `optionOps.ts`, `restoreProperty.ts`) to the live tree.
- Modify: `Features/PropertiesPM.md` (Made False row).

**Negative control:** a fixture where 2 of 30 pages hold the key — the sweep provably rewrote those 2 (the sweep's own `touched` output) and provably skipped a non-holder (open-count instrumentation); with targeting disabled the open-count assertion goes red.

**Failure half:** the `_space.json` sidecar half of the governed sweep keeps its own enumeration (spaces are few and outside the page corpus — a survivor, stated); a query mid-cascade returning null (Db died) → the scan fallback for that cascade run.

**Steps:**
- [ ] Failing tests per the negative control; implement; green. Full gates green (typecheck enumerates every `allCollectionFolders` consumer).
- [ ] Dead-vocabulary sweep: `allCollectionFolders` → 0 against the `readNexus` control.
- [ ] Rewrite the PropertiesPM cascade descriptions in this commit.
- [ ] Commit: `feat(crud): property sweeps open only the pages that hold the key`

#### Gate 4 — the cascades are targeted
- [ ] Gates green; both negative controls red-tested and green.
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
- [ ] Run the acceptance criterion end-to-end on the dev build; log the observations in the Log.
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
  - [ ] Task 1 — transforms to shared
  - [ ] Task 2 — the live tree module
  - [ ] Task 3 — reads serve the live tree
- [ ] **Phase 2** — The watcher spends its path
  - [ ] Task 4 — event classification
  - [ ] Task 5 — the watcher patches
- [ ] **Phase 3** — Mutations patch instead of reload
  - [ ] Task 6 — main patches after mutation
  - [ ] Task 7 — the renderer stops reloading
- [ ] **Phase 4** — The content index
  - [ ] Task 8 — tables and reconciler
  - [ ] Task 9 — writers maintain rows
  - [ ] Task 10 — rename cascade queries
  - [ ] Task 11 — property cascades query
- [ ] **Phase 5** — Closeout
  - [ ] Task 12 — reconcile the record

### Rulings
- Architecture: main-owned live tree + index sidecar over index-as-source-of-truth — Nathan, this session.
- Index scope: mentions + property keys + full values — Nathan, this session (revised from keys-only mid-session).
- The journal is next-session work, not scope here — Nathan, this session.

### Open Against Later Tasks
### Deviations
### Lessons
### Sequenced After
- The property-cascade journal (record the owed sweep before sweeping; heal at open) — the next session after this plan closes.
- FTS body text + ⌘K search, backlinks/Linked-From, ContextView membership — consumers of the index, each its own arc.
- Evaluating retirement of renderer-side optimism once main's push latency is measured.
- The `excluded_folders` Settings surface (compounds less now, still absent).

### Closeout
