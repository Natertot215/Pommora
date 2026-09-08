## Handoff — Pommora

> **User Prompt:** Execute `.claude/Planning/State Placement — Implementation Plan.md` from the repo root — eight tasks, five phases, one writer on the tree, per-phase gate of implement → simplify → comment pass → gates → code review → attack review → commit. Then, through the run: "stop stopping"; "coordinate and continue" with the parallel session rather than blocking on it; remove any code that exists only to satisfy a test-validation criterion; a live-DOM test for the writes-to-disk that Nathan cannot see himself; prune stale doc claims by deletion rather than amendment; reconcile the Corpus Walk deferrals precisely; commit all documentation and push to origin.

#### Current Focus

**Dates:** 09-07-2026 → 09-08
**Model:** Opus 4.8

**State placement is complete and closed out.** Five values moved to the home their content belongs to. `active_view` and `manual_order` became container-sidecar fields, so a chosen view and a hand-dragged order travel with the Nexus; pane widths, sidebar folds, and floating-window size became nested keys on the `devicePrefs` singleton in `nexus.db`, per machine and per Nexus. `localStorage` holds nothing of Pommora's, verified live in the running renderer at zero keys. Deleted: `useViewOrders.ts`, `disclosureState.ts`, the `activeViews` slice, both `viewOrders` channels and their handlers, two `local_state` scopes, and the two one-shot importers.

**What the reviews were worth.** Three passes ran; their real finds were all *removals*. Gate 1's code review killed a wrong-Nexus guard added mid-phase that protected a state the product cannot reach — and which had itself introduced the throw that then needed a never-throw wrap. Both Gate 1 reviews independently found the one real breach: a set nested deep enough to be minted no view of its own shows a placeholder row, and clicking it wrote `view_default` into the scope the import read, so a sentinel would have landed in a file the Locked Decisions require a human to read. The crossing test that proves the walk and watch paths agree was comparing a hand-written nine-key projection, which a tenth field would have passed straight through; it compares whole nodes now, proven by injecting a one-sided divergence.

**What went wrong.** The `viewOrder` import was built in Task 4 and deleted in Task 8 with no launch in between, so it never ran against the real Nexus and three hand-ordered views were stranded in a scope nothing reads — 8 and 10 ids in `Ideas`, 192 in `Studio`. Two homepage-tile orders (19 and 31) were separately unreachable by the container-keyed import. All five were recovered by hand from rows still present and now sit on disk as `manual_order`. The Hazard Window was written to prevent exactly this and did not: it guards a home being *emptied* early and says nothing about the importer being *removed* before it has run.

#### Completion Criteria

- [x] Every numbered requirement traces to a landed task; the acceptance criterion observed on the real Nexus, not a fixture.
- [x] One mapper reads a container sidecar's meta; the crossing test compares whole nodes and goes red on a one-sided field.
- [x] No file lock taken twice on one key; every lock take on the `realpath`-canonicalized path.
- [x] One rail for machine-local preferences — no second scope, channel, or handler added.
- [x] No sentinel id and no stale page-id array reached a sidecar; `deleteView` clears `active_view` in the same locked write.
- [x] Dead Vocabulary sweep at zero against its controls; `localStorage` verified at 0 keys in the live renderer.
- [x] Gates green at every phase and at close: typecheck 0, lint 0 with no warnings, 356 files / 4283 tests.
- [ ] **Nothing a person set was lost — recovered, not prevented.** Five orders were rescued by hand after the import that should have carried them was deleted before it ran.
- [ ] Nathan's live pass: the recovered orders holding, and a window reopening at its remembered size.

#### Next Session

- **Clear the `viewOrder` residue** once the recovered orders are seen to hold: `delete from local_state where scope='viewOrder'` on the real Nexus. Six rows, inert, kept only as a safety net.
- The audit's Topic 1 is down to two items, both needing Nathan rather than code: **R-06**, the heading-column toggle keyed by table ordinal so inserting a table above moves it; and **R-05**, whether File History stays per-device when it is the sole record of an overwritten external edit.
- **Topic 11's cheapest item came unblocked.** The engine/renderer split means `valuesChanged`'s indices can never fold into the tree index — so carrying the touched page ids out of the watch patch's own result is now independent of the tree-index model ruling, and is the one item there that needs no decision from Nathan. `Corpus Walk Deferrals — Scope.md` is reconciled to that.
- The inspector arc on `.claude/Planning/TilesV2-Spec.md`.

#### Feedback

- "Stop stopping" / "coordinate and continue" — a blocked task is a prompt to find the unblocked half, not to ask. Task 3's additive work ran on its six clean files while three were held by another session.
- "Remove any and all code made because of test-validation criteria that are no longer actually necessary." Cost a guard, an unreachable branch, an optional prop, and a whole verify-box case across the run.
- "Emphasize not taking false positives. The code is likely sound, but reduction is the main leverage."
- "Writing to real data is not a concern if you undo it when you're done — it never is."
- "Don't attempt to amend things that can be removed, whereas silence on the subject reflects the current state."

#### Session Pointers

- The plan is deleted; its record lives in this Handoff, `HistoryPM.md` PM-132, and the commits `e88c2cc96^..9f64776e0`.
- Two arcs interleave on `main` — State Placement and Engine Boundary — so a whole-repo diff over the range credits this arc with the other's work. Net measured per-commit against each commit's own parent with `loc.py`'s counter: **−41** source lines.
- Pre-run snapshot of the retiring homes (`nexus.db`, both scopes as JSON, Electron's Local Storage) is what made the `viewOrder` recovery possible. It was nearly skipped as defensive padding.

#### Working Notes

- **A migration is retired only after a run has been watched consuming the rows it reads.** A user confirming that some *other* import's values arrived is not that evidence — two importers reading two scopes need two observations. Now in `Development-Environment.md`.
- **`--only` is necessary and not sufficient on a shared index.** The post-commit hook's `git commit --amend` carries no pathspec, so it re-commits the whole index after yours and rewrites the hash. The printed hash is dead; `git show --stat HEAD` is the only truth. `--only` also passes over untracked files in silence — a 290-line test landed in no commit for that reason.
- **`rg -F` with an alternation searches for a literal pipe**, returns nothing, and reads exactly like a clean tree. Pair every expected-zero count with a control that must stay non-zero.
- A lock taken on an unresolved path keys differently from `realpath` and serializes against nothing while the test passes. That vacuous pass happened once here before the symlinked test root caught it.
- An `activeView` hit in `treePatch.ts` survives the sweep legitimately — it is the live tree-node field the sidecar maps onto, not the retired scope name. A sweep expectation of zero was wrong, and deleting to satisfy it would have broken the optimistic tree patch.
