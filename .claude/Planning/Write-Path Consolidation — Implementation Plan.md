## Write-Path Consolidation — Implementation Plan

> **Status:** ratified — in execution · Spec: none — grounded in this session's five-lens survey and the verification below · Execute tasks in order.
> Citations name files and symbols; re-derive before editing.

**Goal**

At the end of this, **no call to `rmwJsonStrict` can reach disk without holding the lock for the file it rewrites** — the primitive takes it, so the caller cannot omit it. The lock stops being something a caller arranges and becomes something the primitive owns, so the question "did this site remember to serialize?" has no site left to ask it of.

The shape is a fold, not a new abstraction: `rmwJsonStrict` already is the JSON analogue of `rewritePageSerialized` — read fresh, merge, write atomically — and differs from it in exactly one respect, that it takes no lock and documents the omission as the caller's problem. Closing that asymmetry deletes the seven places where a caller assembled the missing half by hand. Two alternatives were weighed and set aside. A general `withFile(path, codec, fn)` handle covering pages, JSON and sidecars alike costs sixty to eighty new lines before a single call site moves, and flattens distinctions the code documents as deliberate — lenient versus strict reads, `writePageFile`'s missing-file tolerance against `setGovernedRootKeys`' fatality. A branded lock token that makes `writeSidecar` uncallable without a key adds roughly eighteen lines and threads an argument through nine sites; it buys type-level unrepresentability, which is real, but it is an addition and this work is scoped to removal.

Nathan ratified the direction after rejecting the justification it was first offered under. The original framing led on `.nexus/state.json` as a live data-loss bug; applying the reachability razor showed the named trigger — two sidebar drags in a row — cannot occur, because a drop is hundreds of milliseconds of physical motion and the write is single-digit milliseconds, and each drop dispatches exactly one op. **This work is justified by cohesion, not by a defect.** `state.json` becomes covered as a consequence of the fold, not as a guard aimed at it. No task here may be re-justified as a bug fix.

Bounded to `src/main`'s JSON write path. Not solving: page-write consolidation, folder renames and moves, the enumeration-freshness gap between a walk and its writes, or anything renderer-side.

**What this forecloses, accepted deliberately.** A self-locking primitive cannot be called from inside a lock on the same path — it hangs rather than rejecting — and its mutator is synchronous and pure. Together those exclude any JSON read-modify-write that needs an *async decision inside the lock span*. Five sites already have that shape and reach it through `withSidecarLock` + `readSidecar`/`writeSidecar`: `views.ts` (three), `containerConfig.ts`, `assignment.ts` (two), `deleteProperty.ts`, `folderEntity.ts`. None of them can migrate to the primitive afterwards. So the fold does not unify JSON writing — it establishes a law over one of two families and leaves the sidecar family, which has the most writers on the busiest file in the nexus, under caller-held locks with `writeSidecar` still callable bare. That is the price of a primitive that cannot be misused, and it is accepted rather than overlooked.

**Requirements**

1. Every JSON read-modify-write serializes on the file it rewrites, with the key derived from that file rather than passed in.
2. The seven callers that hand-assembled `serializeOnFile` + `rmwJsonStrict` lose their outer wrapper.
3. `patchConfig` retires; its four arms call the primitive directly.
4. `.nexus/state.json`'s two writers become covered without either of them being edited.
5. The property registry's private module-level chain retires in favour of the one per-file mechanism.
6. The app config's two read-then-overwrite pairs collapse to one owner in the `updateSettings` shape.
7. Behaviour is unchanged, evidenced by the baseline invariant below.

**Acceptance — the whole thing working:** From a clean tree at the final commit, every `rmwJsonStrict` caller in `src/main` is read and **none is preceded by a `serializeOnFile` on the same key**; `patchConfig` returns zero against a live control; and every gate is green with the test count at or above its pre-plan number. No single task satisfies this — Task 1 folds the lock, and the acceptance only holds once every wrapper is off and nothing deadlocked. This tests the Goal as narrowed, not the broader law: two unlocked sidecar read-modify-writes survive this plan by design and are named in Sequenced After.

**Forced By**

- `serializeOnFile` chains unconditionally on the literal key string ([fileLock.ts:17](../../Pommora/src/main/io/fileLock.ts#L17)) → it is **not reentrant**, so the fold and the removal of all seven wrappers must land in one commit. Splitting them deadlocks the tree at the intermediate commit.
- All seven outer wraps lock the **same key** the inner call passes — verified span by span, not inferred → there is no "only two need the paired edit" subset. All seven.
- Each outer wrap is a pass-through around the RMW plus pure computation (a `.catch`, a `parseRegistry` of the returned value, a throw) → removing them narrows no guarantee, because none of them spans a second disk touch.
- `settings.ts:25` passes a `seedOnAbsent` third argument; `reorder.ts:33`/`:51` pass one too → the fold must preserve the three-argument signature exactly.
- `contextsRegistry.ts:60` and `contextWrite.ts:188` **throw inside the mutator** to abort a write, relying on an outer `.catch` → the fold must not swallow or reorder those throws.
- The razor cut the bug framing → no task may add a guard. Every task removes or relocates; none defends.

**Inherited Reasoning**

- The sidecar and page halves of this law already landed ([PM-004]); `withSidecarLock` is the same idea for one file family and is the pattern this generalises. It stays — its value is forcing the key through `sidecarPath`, which the fold does not replace.
- `serializeSchemaOp` ([schemaChain.ts](../../Pommora/src/main/crud/schemaChain.ts)) is **not** a file lock and must not be folded into anything. It is a global op chain across many files, and its own header warns that a chained function awaiting another deadlocks.
- `updatePageProperty` deliberately takes no lock of its own; its callers need a wider span. Do not "fix" it — it is documented in place and would deadlock two call sites.
- `mintBundle`'s non-recursive `mkdir` **is** its mutex. It needs no key and gaining one would be ceremony.
- The reads at [mutate.ts:449](../../Pommora/src/main/mutate.ts#L449) and its siblings sit outside their lock on purpose: they feed a previous-asset pointer for an `rm`, not the write. A later tidying pass must not pull them in.

**Grounding** *(re-open these; don't cite them)*

- `Pommora/src/main/io/atomicWrite.ts` — `rmwJsonStrict` and the read-path/write-path reader split the fold must not disturb.
- `Pommora/src/main/io/fileLock.ts` — the chain, its non-reentrancy, and `rewritePageSerialized` as the shape being mirrored.
- The seven wrap sites, each read whole for its span: `contextsRegistry.ts`, `settings.ts`, `mutate.ts` (`patchConfig`), `crud/removeProperty.ts` ×2, `crud/contextWrite.ts` ×2.
- `Pommora/src/main/io/propertiesRegistry.ts` — `mutateRegistry`, its private chain, and the `unparsed` carry-through that must survive.
- `.claude/Guidelines/` — read before planning in this domain.

**Environment**

Plan directory `.claude/Planning` · Explorer `Explore` · Code reviewer `feature-dev:code-reviewer` · Attack reviewer `build-breaking-agent` (project-designated) · Neutral verifier `general-purpose` · Simplification `code-simplifier` (project-designated). No spec document exists; the grounding is this session's survey plus the verification recorded in Forced By.

**Shapes:** refactor (primary) · removal

**Global Constraints (every task inherits these)**

- Gates, run from `Pommora/`, exit codes read directly and never through a pipe: `npm run typecheck` · `npm run lint` (must print **no** `Found N warnings` line) · `npx vitest run` · `npm run build`.
- **Baseline invariant.** At plan start: **2,239 tests across 197 files**, typecheck clean on both projects, lint clean over 725 files, build green. No task may lower either count. A task that adds a test raises it and says so.
- **Lock-coverage invariant.** The set of (file, lock key) pairs may grow or stay identical. It may never shrink. Any task that removes a `serializeOnFile` must show the same key is still taken one layer down.
- Formatting is Biome's via a PostToolUse hook — never hand-align; an `Edit` failing on whitespace means re-read and retry.
- Comments state what the code cannot; they never restate a value the declaration holds.
- Out of scope everywhere: page-write consolidation, folder rename/move, `serializeSchemaOp`, the sweep family, anything in `src/renderer`.

**Made False** *(each rewrite lands in the commit that falsifies it)*

| Doc | The specific claim | What makes it false | Task |
| --- | --- | --- | --- |
| `io/atomicWrite.ts` | `rmwJsonStrict`'s docstring naming serialization "the caller's job" | The primitive takes the lock itself | 1 |
| `mutate.ts` | `patchConfig`'s docstring, including its `sidecarPath` warning | The helper is deleted | 1 |
| `io/propertiesRegistry.ts` | "One module-level chain serializes them (single main process; the session has one root, so a per-root map would be ceremony)" | The chain is replaced by the per-path map one directory over | 2 |
| `io/propertiesRegistry.ts` | `writeRegistry`'s "module-private, so every write rides `mutateRegistry`'s chain" | The chain is gone | 2 |
| `sidecarIO.ts` | `withSidecarLock`'s "The banner and icon patches share that key without coming through here — they hold a raw JSON writer and lock on `sidecarPath` themselves" | They stop holding it themselves; the primitive does | 1 |
| `crud/removeProperty.ts` | The two comments at the cache-and-unassign write and the cache clear, each explaining why `withSidecarLock` is taken there | Those calls no longer appear | 1 |
| `appConfig.ts` | — *(no claim; the new owner needs a docstring, not a repair)* | — | 3 |
| `.claude/Features/ArchitecturePM.md` | §Write serialization describes the law but not where the lock now lives | Gains one sentence; the law itself stays true | 3 |

**Dead Vocabulary** *(what the closing sweep searches for)*

- `patchConfig` → expect **0**. Legitimate hits: none.
- Control: `rmwJsonStrict` → expect **≥9**. Zero here means the sweep never ran.

**Hazard Window:** Task 1 opens it and Task 1 closes it. Between folding the lock into the primitive and removing the last of the seven wrappers, the tree deadlocks on any exercised path. The commit is atomic and **no intermediate commit may be made inside Task 1**.

The suite alone cannot prove the window shut. `setIcon` and `setHeadingIconHidden` have **zero** tests in `mutate.test.ts` (`setBanner` has fifteen), so two of `patchConfig`'s four arms are unexercised and a missed wrapper there would hang only in the running app. The proof is therefore structural and comes first: read every `rmwJsonStrict` caller and confirm none sits inside a `serializeOnFile` on the same key. Task 1 then adds coverage for the two bare arms, so the next change to this path has a suite that can fail.

---

### Phase 1 — The JSON read-modify-write owns its lock

#### Task 1: Fold the lock into `rmwJsonStrict` and strip all seven wrappers

**Requirements:** 1, 2, 3, 4

**Why:** `rmwJsonStrict` is `rewritePageSerialized` for JSON minus the lock, and that single omission is why seven callers each rebuild the missing half and two forgot. Moving the lock into the primitive makes the key derive from the file being written, so a second spelling stops being expressible and the omission stops being possible. Traces to the Goal: this *is* the fold; every other task cleans up around it.

**Files:**
- Modify: `src/main/io/atomicWrite.ts` — `rmwJsonStrict`, its body and docstring. Add the `serializeOnFile` import.
- Modify: `src/main/contextsRegistry.ts` — `mutateRegistryFile`, drop the outer wrap.
- Modify: `src/main/settings.ts` — `updateSettings`, drop the outer wrap.
- Modify: `src/main/mutate.ts` — delete `patchConfig`; its **four** call sites (`:461` and `:465` are the setBanner set and clear arms, `:494` setHeadingIconHidden, `:543` setIcon) call `rmwJsonStrict` directly.
- Modify: `src/main/crud/removeProperty.ts` — two sites, drop `withSidecarLock`, keep `sidecarPath` as the argument.
- Modify: `src/main/crud/contextWrite.ts` — two sites, drop the outer wrap.

**Derivation**
- `rg -n 'rmwJsonStrict\(' src/main | rg -v '\.test\.'` → **10** at planning time (1 declaration + 9 callers). Of the 9: seven wrapped, two bare (`crud/reorder.ts:33`, `:51`).
- Control: `rg -n 'withSidecarLock\(' src/main | rg -v '\.test\.'` → **10**. Zero here means the search never ran.
- Re-run both before editing. A divergence rewrites this task rather than being absorbed.

**Interfaces**
- Produces: `rmwJsonStrict(absPath: string, mutate: (cur: Record<string, unknown>) => Record<string, unknown>, seedOnAbsent?: () => Record<string, unknown>): Promise<Result<Record<string, unknown>>>` — **signature unchanged**, behaviour gains the lock.
- Assumed by: Task 2 (the registry chain collapses onto the same mechanism), Task 3 (`updateAppConfig` is written in this shape).

**Failure half:** absent file with no `seedOnAbsent` → `not-found`, unchanged. Absent with a seed → seeded, unchanged. Unreadable/corrupt → `operation-failed`, and **the file is not replaced by what a failed read pretended it held** — this is the split `readJsonStrict` exists for and the fold must preserve it. A mutator that throws → the throw propagates to the caller's `.catch`, unchanged and load-bearing at two sites.

**Survivors:** `withSidecarLock` stays — it forces the key through `sidecarPath`, which the fold does not do for its callers. `serializeSchemaOp` stays, being an op chain rather than a file lock. `rewritePageSerialized` stays as the text-file case.

**Steps:**
- [ ] Re-run both Derivation commands; confirm 10 and 10, or stop and rewrite this task.
- [ ] Read all seven wrap sites whole and confirm each outer key is the same string the inner call passes, and that no wrap spans a second disk touch. Any site that fails either check is a **stop**, not a judgement call.
- [ ] Wrap `rmwJsonStrict`'s body in `serializeOnFile(absPath, …)`; rewrite its docstring to state the primitive owns the lock and that it is therefore not callable from inside a lock on the same path.
- [ ] Remove all seven outer wrappers in the **same edit pass**, deleting `patchConfig` outright and pointing its four arms at `rmwJsonStrict(cfgPath, …)`.
- [ ] **Close the window structurally before trusting the suite:** re-read every `rmwJsonStrict` caller and confirm none sits inside a `serializeOnFile` on the same key. Two of `patchConfig`'s four arms have no test, so a missed wrapper there would hang only in the running app.
- [ ] Add coverage for the two bare arms — a `setIcon` and a `setHeadingIconHidden` case in `mutate.test.ts`, each on a container sidecar — so the next change to this path has a suite that can fail.
- [ ] Run `npx vitest run` — expect **2,241 passing** (2,239 + the two new arms). A hang is the window still open.
- [ ] Run the full gate. Expect green, lint with no warnings line, and `mutate.ts` no longer importing `serializeOnFile` if nothing else uses it.
- [ ] Confirm the free coverage: `crud/reorder.ts` is **unedited** and its two writers now serialize. Read the file to prove no edit was made.
- [ ] Commit: `refactor(io): the JSON read-modify-write takes its own lock`

#### Gate 1 — the fold, with nothing deadlocked and nothing edited that shouldn't be
- [ ] Gate commands green, exit codes read directly; test count **2,241** — the task adds two.
- [ ] The structural check ran and is recorded: no `rmwJsonStrict` caller sits inside a same-key lock.
- [ ] Derivations re-run against their controls; counts matched, or the divergence rewrote the plan.
- [ ] `git diff --stat` shows **no change** to `crud/reorder.ts` — its coverage was inherited, not authored.
- [ ] Simplification and `feature-dev:code-reviewer` dispatched against `<base>..HEAD` scoped to `Pommora/src/main`; the reports cite files inside it.
- [ ] Every concern fixed, or carrying an explicit user ruling recorded in the Log.
- [ ] The hazard window is closed — proved by a green suite, not by inspection.
- [ ] No user-visible surface shipped; no running-thing pass owed.
- [ ] Progress hashes filled in.

---

### Phase 2 — One serialization mechanism

#### Task 2: Retire the property registry's private chain

**Requirement:** 5

**Why:** `.nexus/properties.json` is guarded by a module-level `let chain` while its sibling `.nexus/contexts.json` guards the identical operation with `serializeOnFile`. Two registry files, one job, two mechanisms — and the comment defending the private one argues against a per-root map that the per-path map one directory over already provides. Collapsing it removes a whole parallel mechanism and makes the lock visible to anyone auditing keys, which is the property this plan exists to establish. Traces to the Goal: the Goal is one owner for "which key does this write serialize on," and a private chain is a second owner.

**Files:**
- Modify: `src/main/io/propertiesRegistry.ts` — `mutateRegistry`, the `chain` binding, and the two comments naming it.

**Derivation**
- `rg -n '\bmutateRegistry\b' src/main | rg -v '\.test\.'` → **11** at planning time (1 declaration + 10 callers).
- Control: `rg -n '\bserializeOnFile\b' src/main | rg -v '\.test\.'` → **24**. Zero here means the search never ran.

**Interfaces**
- Produces: `mutateRegistry<T>(root, fn)` — signature unchanged; the serialization moves from the module chain to `serializeOnFile(registryPath(root))`.
- Assumed by: ten call sites — four in `crud/registryProperty.ts`, six in `crud/optionOps.ts` — none of which change.

**Failure half:** the strict read still throws on corrupt, landing as the op's error envelope — the file is never replaced by a failed read's guess. Entries that don't parse as definitions still ride through by id, so a mutator cannot drop them; this is the `unparsed` carry-through and it must survive untouched.

**Must agree:** `mutateRegistry` and `mutateRegistryFile` (`contextsRegistry.ts`) now reach the same answer about how a registry file is guarded. One test crossing the two: two concurrent mutations of each registry both land, neither dropping the other's change.

**Steps:**
- [ ] Confirm no caller of `mutateRegistry` runs inside a `serializeOnFile` on `registryPath(root)`. Use `rg -n '\bmutateRegistry\b' src/main` — **not** `mutateRegistry\(`, which matches nothing, because every production caller passes an explicit type argument (`mutateRegistry<Result<…>>(`). Read all ten. A nested acquisition deadlocks.
- [ ] Replace the `chain` binding with `serializeOnFile(registryPath(root), …)`; delete the chain and rewrite the comment to name the shared mechanism.
- [ ] Add the crossing test: concurrent mutations of the property registry and of the contexts registry each survive the other.
- [ ] Run the full gate — expect green, test count **2,242**.
- [ ] Commit: `refactor(properties): the registry joins the one per-file lock`

#### Gate 2 — one mechanism, behaviour unmoved
- [ ] Gate commands green; test count ≥ 2,242.
- [ ] Simplification and review dispatched against `<base>..HEAD`; concerns fixed or ruled on.
- [ ] Progress hashes filled in.

---

### Phase 3 — The read-then-write pairs, and the record

#### Task 3: One owner for the app config, and the docs catch up

**Requirements:** 6, 7

**Why:** `pommora.json` is read whole and written whole at two sites — the adopt path and the menu's recents self-heal — with the merge spelled out at each. That is the shape `updateSettings` already owns for `settings.json`, so a second spelling of it is the duplication this plan is removing elsewhere. The doc work rides here because `ArchitecturePM`'s §Write serialization describes the law without saying where the lock now lives, and the falsifying commit is the only moment anyone knows what changed.

**Files:**
- Modify: `src/main/appConfig.ts` — add `updateAppConfig(userDataDir, mutate)` in the `updateSettings` shape.
- Modify: `src/main/index.ts` — the adopt path's read-then-write pair.
- Modify: `src/main/menu.ts` — the recents self-heal pair.
- Modify: `.claude/Features/ArchitecturePM.md` — §Write serialization gains a sentence naming the primitive as the owner.

**Failure half:** the config file absent on first launch → seeded, matching today's `readAppConfig` defaulting. A projection note worth carrying: `readAppConfig` projects to three fields, so a write drops any foreign key the file holds. The new owner merges onto the raw object rather than the projection, which removes the trap rather than documenting it.

**A recovery semantic changes here, and it is a trade rather than an oversight.** Today `readAppConfig` reads leniently, so a corrupt `pommora.json` reads as empty and the next write overwrites it with a good file — the config self-heals. On `rmwJsonStrict` an unreadable file is `operation-failed` and no write happens, so `lastNexusPath` and recents freeze with no UI to repair them. That is the correct rule for nexus data and the whole reason the strict reader exists, and the corrupting event is outside the application's control: the write is temp-file + rename, so no crash or power loss can half-write it. Accepted, not guarded. The read side stays lenient, so the asymmetry is deliberate.

**Steps:**
- [ ] Write `updateAppConfig`, merging onto the raw object so a foreign key survives.
- [ ] Convert both call sites; each drops its local read-and-spread.
- [ ] Amend `ArchitecturePM` §Write serialization with one sentence — the JSON primitive owns its key, so a caller cannot write without it.
- [ ] Run the full gate — expect green, test count **2,242** (Task 3 adds no test; see the Ruling).
- [ ] Commit: `refactor(config): one owner for the app config, and the record follows`

#### Gate 3 — closeout gate
- [ ] Gate commands green; test count ≥ 2,242.
- [ ] Closing sweep: `patchConfig` → 0, control `rmwJsonStrict` → ≥9.
- [ ] Simplification and review dispatched against `<base>..HEAD`; concerns fixed or ruled on.
- [ ] Delivery Claim written; neutral verifier dispatched against the claim and the requirements; then `build-breaking-agent` separately.
- [ ] Lessons routed to `.claude/Guidelines`; Context and History updated.

---

## Implementation Log

### Progress
- [ ] **Phase 1** — The JSON read-modify-write owns its lock · base `<commit>`
  - [ ] Task 1 — Fold the lock into `rmwJsonStrict` and strip all seven wrappers · `<commit>`
- [ ] **Phase 2** — One serialization mechanism
  - [ ] Task 2 — Retire the property registry's private chain · `<commit>`
- [ ] **Phase 3** — The read-then-write pairs, and the record
  - [ ] Task 3 — One owner for the app config, and the docs catch up · `<commit>`

### Rulings
- **08-08** (planning) — Task 3's foreign-key test is dropped; merging onto the raw object stays. Merging raw is the simpler implementation rather than a defense, but a *test* for a key with no current producer is the guard the Forced By line forbids. The type gate already forces the implementer to handle `recents` off a raw record.
- **08-08** (Nathan) — The plan is justified by cohesion, not by a defect. The `state.json` framing was withdrawn after the reachability razor showed its named trigger cannot occur. No task may be re-justified as a bug fix.
- **08-08** (Nathan) — The restore surface is parked, not dead; annotated in `shared/mutate.ts` and `provenance.ts`. The drift row is removed — he does not inspect `nexus.db` by hand.

### Open Against Later Tasks

### Deviations
- **Review round 1 (`build-breaking-agent`), all findings verified against code before folding.** Task 2's deadlock check was a grep that matched nothing — every production caller spells `mutateRegistry<…>(`, so the check would have passed by seeing one test file; the count was nine and is ten. `patchConfig` has four call sites, not three. The Goal asserted a universal the Acceptance could not test, with `adopt.ts:100` and `remint.ts:136` sitting unlocked in the gap; the Goal is narrowed and both are named in Sequenced After. Three falsified docstrings were missing from Made False. Task 3 silently changed `pommora.json`'s self-healing recovery; the trade is now stated. The foreign-key test was dropped as a guard the plan forbids.
- **The hazard window's proof was wrong and the review's Unknown proved worse than reported.** The plan named the test suite as evidence the window shut. `setIcon` and `setHeadingIconHidden` have zero tests — two of four `patchConfig` arms — so the suite could not have caught a missed wrapper there. The proof is now a structural read, and Task 1 adds the two missing arms.
- **Planning-time correction.** The survey that produced this plan reported that only the two `removeProperty` sites would deadlock under the fold. Reading all seven spans showed every one locks the same key the inner call passes, so all seven must be unwrapped in the same commit. Task 1 is written to that, and the hazard window exists because of it.

### Lessons

### Sequenced After
- **The sweep family.** `sweepGovernedRoots` has two callers where its header claims five; `optionOps`' `cascadePages`, `removeProperty`, and `restoreScrub` each hand-roll the same enumerate → lock → admit → decide → write loop it was built to own. A real consolidation that removes lines, and large enough to want its own plan.
- **The folder relocate pair.** `renameFolderEntity` and `moveFolderEntity` are near-identical bodies differing only in how the target is computed — the pair `crud/page.ts` already collapsed into `relocatePage`. Small; do it when that file is next open.
- **Two unlocked sidecar read-modify-writes survive this plan**, and the narrowed Goal is narrow precisely because of them. `adopt.ts:100` (`stampFolder`) reads a sidecar strictly and writes it through `writeSidecar` with no lock; `remint.ts:136` (`remintSidecar`) does the same and hand-builds its path instead of using `sidecarPath`, while its own sibling `remintPageFile` goes through `rewritePageSerialized`. Both run in the open pass, so neither is reachable concurrently today — they are listed as cohesion debt, not as defects, and they are the reason `ArchitecturePM` must not be amended to claim a universal law.
- **`identity.ts`'s three write branches** could route through `rmwJsonStrict` and inherit the lock. Roughly a wash on line count, so it waits for a reason beyond tidiness.
- **The branded lock token** that would make `writeSidecar` uncallable without a key. Adds ~18 lines and buys type-level unrepresentability of the defect class. Declined here because this work is scoped to removal; worth revisiting if a fourth bare sidecar writer ever appears.
- **Enumeration freshness.** The sweeps walk `listMarkdownFiles` outside any lock, then lock each file individually, so a page created between the walk and the writes is never visited. No per-file fixture closes this. Whether the contract should state the exclusion is an open question, not a task.

### Closeout
