## Property-Cascade Journal — Implementation Plan

**Status:** reviewed — ratified for execution (one attack round folded; standing user grant covers plan → execute → review overnight).

### Goal

A crash mid-cascade must never leave the property registry and the pages disagreeing. Today a property rename commits `.nexus/properties.json` and then sweeps the new key across every holding page; a delete snapshots, strips values, unassigns, and removes the definition; the option ops rename or strip one value across the holders. None of them records that the sweep is owed, so a crash partway strands the un-swept pages permanently and silently. This plan gives the schema cascades what the Context rename already has: a tiny intent record under `.nexus`, written before the work and deleted after it, replayed at the next open to forward-complete whatever a crash interrupted. Where an interruption spans a session switch, the record survives it and the heal lands at that nexus's next open.

**Approach (ratified):** a **sibling record** beside the Context journal — its own file, never a shared list, because the two chains serialize independently (`serializeSchemaOp` vs the Contexts registry's file lock) and a shared list would invent a collision that doesn't exist. The journaled ops are **property rename, property delete, and the option cascades** (rename / remove / clear, Select and Status both) — all sharing one crash shape and one sweep mechanism. The record carries **intent, never a snapshot**: the replay re-runs the already-idempotent sweep against current disk, re-deriving its targets through `keyHolderFiles` (index query, corpus-scan fallback), so it stays most-recent-wins and self-healing where a remembered page list would go stale. The `.trash` bundle's value snapshot is a different mechanism — human undo, not crash consistency — and is untouched.

**The replay's one law (folded from review):** the replay acts only on a state the record exactly maps — identity-checked by `id`, never by name alone — and **clears on every other state**. Acting is the exception; clearing is the default. This is the Context replay's proven posture, and the review's two High findings were both places the draft inverted it.

**Deliberately not solving:** `removeProperty` (the per-Collection unassign+strip). Its crash residue is softer — the registry never disagrees with itself, the sidecar `property_cache` captured the values first, and re-assigning resurfaces them. It stays outside the journal; widening later is a fresh decision.

**Acknowledged cost:** a record whose sweep throws on the same unreadable file at every open retries at every open, indefinitely — logged, bounded (index-queried holders; a corpus scan only while cold), and never blocking the open. No give-up ceiling: machinery for a state only a persistent OS fault produces isn't worth its weight.

### Grounding

All verified against the working tree at `ab0f25ce`, not recalled:

- **The precedent:** `src/main/crud/contextJournal.ts` — `.nexus/context-rename.json`, one record max (whole-file overwrite), hand-rolled validator returning `null` on any malformed shape, `writeJson` (atomic + watcher write-echo) to write, `rm -f` to clear. Deliberately absent from `NEXUS_CONFIG_FILES`. Its replay (`replayPendingRename`, `contextCascade.ts`) is verification-first: every state the record no longer maps clears the record instead of acting.
- **Rename order:** `editProperty` (`registryProperty.ts`) commits the registry FIRST, then `renameSweep(root, from, to)` — sweep queried by the OLD key, collisions resolved `prefer-new` (the old pair is dropped, not merged). The rename decision is only known inside the `mutateRegistry` closure; `validateName` refuses a taken name in there, and `mutateRegistry` throws on a corrupt registry (`readJsonStrict`).
- **Delete order:** `deleteInner` (`deleteProperty.ts`): read def → `collectionFolders` → `keyHolderFiles` → `snapshot` (mints a fresh `.trash` bundle — NOT idempotent) → `sweepGovernedRoots` strip (`{ stamp: true }` — re-dates) → `unassignAndPurge` per folder (idempotent, module-private) → `removeFromRegistry` LAST (`not-found` on a second run). `restoreProperty` re-creates with the **recorded id**, funneling through `createProperty`.
- **Option orders:** `renameOption`/`renameStatusOption` — registry first (duplicate titles refused in the closure), then `cascadePages` with `replacePageValue`. `removeOption`/`removeStatusOption` — pages first (`stripCascade`), then an inline `mutateRegistry` closure. `clearOption`/`clearStatusOption` — pages only. All resolve `{ type, key }` from the def via `propertyKey`; Select options live in `select_options`, Status options inside `status_groups` — an option-values read must speak both. All page rewrites no-op (`null`) when the target is absent and stamp `modified_at` when they act; `renameFrontmatterKey` alone is key-only and never stamps.
- **The sweep seam:** `cascadePages(root, key, rewrite)` = `collectionFolders` → `keyHolderFiles` → per-file `rewritePageSerialized` + `indexWrittenPage`. It throws on an unreadable file — no skip list. `keyHolderFiles` = `queryKeyHolders(key) ?? nexusCorpus(root)`, scope-intersected; the index answers `null` until `markIndexReady`, and every caller tolerates the scan fallback. `queryKeyHolders` reads the **global** session handle: a root switch mid-op can hand an in-flight op the new root's rows (pre-existing race, see Task 1's clear guard).
- **The open sequence** (`index.ts`, `adoptNexusInner`): `openSession` → `prepareOpenedNexus` → `replayPendingRename` (Context journal, pre-everything) → `openSessionDb` → on root switch: `dropLiveTree` → walk → `seedContentIndex`. Launch-restore (`index.ts` ~1839) mirrors it. `seedContentIndex` runs only inside the root-switch branch.
- **The serializer:** `serializeSchemaOp` (`schemaChain.ts`) — one global promise chain; wrap ENTRY POINTS ONLY (a chained fn awaiting another chained fn deadlocks).
- **Watcher:** any unclassified `.nexus/*` event — unlink included — classifies `full-refresh`; `writeJson` → `atomicWriteFile` → `recordWrite` suppresses the write, but a bare `rm` records no echo, so a clear landing after the write's ~2s echo window costs a full re-walk. `recordWrite` is exported from `io/writeEcho.ts`. The Context journal's own `clearJournal` carries this same gap today.

### Forced By

- Registry-first rename order → the record must be written BEFORE the registry commit and must carry `from`/`to` explicitly: after the commit the old name is recoverable from nowhere. It must ALSO carry `id`: a name-keyed gate cannot tell "my rename landed" from "another property always owned that name," and acting on the latter merges two properties' values with no undo (review High #1).
- Non-idempotent `snapshot` → the delete replay re-runs only the sweep/unassign/registry tail, never the snapshot leg; the record is written AFTER the snapshot.
- Post-registry delete → the def is gone at replay time, so the record carries both `name` (derives the page key) and `id` (drives `unassignAndPurge` + `removeFromRegistry`). A later `createProperty` wearing that name or id (re-create, or restore — which funnels through it) invalidates the record and must consume it at its own head (review High #2).
- The Context replay's seam (pre-`openSessionDb`) would cost a property replay two cold walks → the property replay runs AFTER `seedContentIndex`, where the index and live tree are warm; nothing the property replay heals is read during open the way contexts are, and `keyHolderFiles` tolerates a cold index regardless.
- `serializeSchemaOp`'s wrap-entry-only rule → the replay is one wrapped entry point calling only unwrapped internals; the internals it reuses that are currently inline or module-private are named extractions in Task 4, not a footnote.
- `cascadePages` throws on an unreadable file → the replay wraps its work in try/catch: on throw the record survives and the next open retries; a replay failure must never block opening the nexus.
- The global session handle → a clear must not land for a root that is no longer the session's: `clearSchemaJournal` guards on `sessionRoot() === root` internally, so a mid-op nexus switch leaves the record for that nexus's next open instead of clearing over an unhealed state.

### Inherited Reasoning

- Two records, never a shared list — ratified; the chains serialize independently.
- Intent, never a snapshot — ratified against the "remembered snapshot" alternative: a page list or value map goes stale the moment disk moves without the app; the idempotent re-sweep cannot.
- A file under `.nexus`, not a db row — the db is optional exactly when things went wrong.
- The Context journal's `skipped[]` list is NOT mirrored: `cascadePages` throws rather than skips, so a surviving record already is the retry mechanism. Adding skip-tracking would mean changing the shared sweep for a state it cannot currently produce.
- Clears stay on explicit paths (op completed; op refused before touching pages) rather than in `finally` — a throw mid-sweep must leave the record, and the id-gated replay makes every record a throw strands harmless (tried-and-rejected in review folding: a `finally` clear would erase owed work).

### Blast Radius

**New:** `src/main/crud/propertyJournal.ts` (+ test), `src/main/crud/replaySchemaCascade.ts` (+ test).
**Edited:** `registryProperty.ts` (`editProperty`, `createProperty` head guard), `deleteProperty.ts` (`deleteInner`, named strip/unassign exports), `optionOps.ts` (six entry ops, option-values helper, named registry-finish extraction), `contextJournal.ts` (one line: echo before clear), `index.ts` (two replay call sites).
**Docs made true:** `PropertiesPM.md` (journal section), `ArchitecturePM.md` (open sequence, if it names the steps), `ContextPM.md` (journal items resolve; Current Focus), `HistoryPM.md` (PM-106), `FrameworkPM.md` (if the queue names the journal).
**Untouched on purpose:** `contextCascade.ts` (the sibling's replay stays as-is), `provenance.ts` (snapshot mechanism), `governedSweep.ts`, `removeProperty.ts`, `restoreProperty.ts` (its guard rides `createProperty`).

### Work Shapes

**Additive** (new behavior → failing test first: the half-cascaded state heals only with the replay wired). **Fix-adjacent** (the wiring edits live ops → each op's existing tests stay green; sibling sweep = the eight `serializeSchemaOp` entries in `optionOps.ts` plus `editProperty`/`deleteProperty`, enumerated by Task 3's derivation).

### Acceptance Criterion

Simulate a crash after a property rename's registry commit but before its sweep completes, with ≥2 holder pages unswept — the crash state built by running the same exported internals the op runs, stopped between steps, with the journal file present exactly as the live op leaves it (the wiring tests of Tasks 2–3 separately prove the live ops produce these states). On the next open-path replay, without user action: every page carries the new key, the journal file is gone, and the page bytes are identical to an uninterrupted rename's. The same holds for **all five recorded shapes** — delete (values stripped, def gone, exactly ONE `.trash` bundle), option-rename, option-remove, option-clear — with byte-identity read **modulo `modified_at`** for the stamping ops (their rewrites re-date by design; rename alone is stamp-free and compares raw). No single task's test satisfies this alone; the Phase 2 crash-window suite plus the negative control together do.

### Global Constraints

- Gates from `Pommora/`: `npm run typecheck` && `npm run test` && `npm run lint`, exit codes read directly, never piped. Green before every commit.
- One tree-touching writer at a time. Biome owns formatting (hook); `npm run format` repairs shell-driven writes.
- `KNOB` / `(Nathan's call)` markers survive. Comments carry only uninferable whys.
- Never a claim of a result not watched happening. Doc edits ride the falsifying commit. No docs left uncommitted on any final commit.
- The replay must never block or fail an open: every throw is caught, logged, and leaves the record for the next open.

---

### Phase 1 — The Record and Its Writers

**Task 1 — `propertyJournal.ts`: the record file.**
**Why:** one module owning the record's path, shape, write, read, clear — the exact division `contextJournal.ts` proved, so the sibling reads as a sibling. **Files:** new `src/main/crud/propertyJournal.ts`, new `src/main/crud/propertyJournal.test.ts`; `contextJournal.ts` (echo line). **Interfaces:**

```ts
export type SchemaJournal =
  | { op: 'rename'; id: string; from: string; to: string }
  | { op: 'delete'; id: string; name: string }
  | { op: 'option-rename'; id: string; from: string; to: string }
  | { op: 'option-strip'; id: string; value: string; drop: boolean }
export function writeSchemaJournal(root: string, j: SchemaJournal): Promise<void>
export function readSchemaJournal(root: string): Promise<SchemaJournal | null>
export function clearSchemaJournal(root: string): Promise<void>
```

Every shape carries `id` — the replay's law gates on identity, never name alone. `option-strip` with `drop: false` is clear (registry untouched), `drop: true` is remove (registry finish owed). Status and Select are NOT distinguished — the replay re-resolves the def by `id` and the rewrites are type-driven. Consumed by Tasks 2–5. **Steps:** (1) Path: `.nexus/property-cascade.json` exactly as `contextJournal.ts` derives its own; NOT added to `NEXUS_CONFIG_FILES`. (2) Write via `writeJson` (atomic + echo), whole-file overwrite, one record max. (3) Read with a hand-rolled validator mirroring `readJournal`'s: unknown `op`, missing/mistyped field, non-object → `null`. (4) Clear: `if (sessionRoot() !== root) return` (a mid-op nexus switch leaves the record for that root's next open — the clear guard from review Medium #5), then `recordWrite(path)` (the unlink is a `.nexus` event the watcher would otherwise classify `full-refresh` — review Medium #6), then `rm(path, { force: true })`. (5) The same one-line `recordWrite` lands in `contextJournal.ts`'s `clearJournal` — the sibling carries the identical gap today. (6) Tests: round-trip per op shape; malformed variants → `null`; clear on absent file resolves; clear under a mismatched session root leaves the file. Expected: suite green. **Must agree:** the validator admits exactly what the writer produces — the round-trip test per op variant is that agreement.

**Task 2 — journal the property rename and delete; the create-side consumer.**
**Why:** the two ratified core ops, each writing intent before its first irreversible step and settling after its last — plus the head guard that keeps a stale delete record from ever meeting a live same-name property. **Files:** `registryProperty.ts` (`editProperty`, `createProperty`), `deleteProperty.ts` (`deleteInner`), their tests. **Steps:** (1) `editProperty`: before `mutateRegistry`, pre-read the def; if `changes.name` normalizes to a different name, `writeSchemaJournal(root, { op: 'rename', id: propertyId, from, to })`. Clear after the sweep, and on the edit's explicit failure/non-rename return. A throw out of `mutateRegistry` (corrupt registry) deliberately leaves the record — the id-gated replay disposes of it (def still named `from` → clear). (2) `deleteInner`: `writeSchemaJournal(root, { op: 'delete', id, name: def.name })` AFTER `snapshot(...)`, before the sweep; clear after `removeFromRegistry` returns (its `not-found` counts as done). (3) `createProperty`: at its head, read the journal; a `delete` record whose `name` matches the new def's normalized name OR whose `id` matches the incoming id is consumed (`clearSchemaJournal`) — this single guard covers both re-create and restore, since `restoreProperty` funnels through here with the recorded id (review High #2). (4) Tests: spy ordering — journal present when the sweep runs, absent after settle; rename-validation failure clears; delete's journal written post-snapshot (exactly one bundle exists at write time); create-with-matching-name and restore-shaped create-with-matching-id each consume a planted delete record. Expected: existing op tests untouched and green. **Failure half:** a journal write failure fails the op before any page is touched (an awaited write at the head).

**Task 3 — journal the five option-op shapes.**
**Why:** same crash shape, same fix; confirmed in scope. **Files:** `optionOps.ts` (`renameOption`, `renameStatusOption`, `clearOption`, `clearStatusOption`, `removeOption`, `removeStatusOption` — six functions, five record shapes since clear/remove pair across types), tests. **Derivation:** `grep -n "serializeSchemaOp" src/main/crud/optionOps.ts` → 8 hits at planning time (includes `setOptions`/`setStatusGroups`, which cascade nothing and stay unjournaled); control token: `serializeSchemaOp` in `assignment.ts`. **Steps:** (1) Rename pair: `writeSchemaJournal({ op: 'option-rename', id, from: oldValue, to: newTitle })` before `mutateRegistry`; clear after the cascade and on the registry's explicit refusal. (2) Clear pair: `{ op: 'option-strip', id, value, drop: false }` after `resolveForCascade` succeeds, before `stripCascade`; clear after. (3) Remove pair: `{ op: 'option-strip', id, value, drop: true }` same placement; clear after the registry finish; extract the two inline registry-finish closures into one named, exported helper (`dropOptionFromDef` or equivalent) so Task 4's replay reuses the identical registry edit rather than restating it. (4) Add the option-values read the replay will share: a small exported helper answering "which option values does this def hold," speaking both `select_options` and `status_groups`. (5) Tests: one ordering spy per shape; `setOptions` provably unjournaled (asserts no journal write). Expected: green.

**Phase gate:** gates green; simplification + comment pass inline over the phase diff (the phase is small — a dispatched agent is not warranted; note the judgment in the log); commit; tick boxes in the same commit; record base + commit hashes below.

### Phase 2 — The Replay at Open

**Task 4 — `replaySchemaCascade.ts`: the law, applied per op.**
**Why:** the record is worthless without the open-time replay, and the review proved the verification layer is where this feature lives or dies: act only on the exactly-mapped state, clear on everything else. **Files:** new `src/main/crud/replaySchemaCascade.ts` + test; `deleteProperty.ts` (export `unassignAndPurge`; extract the inline strip rewrite into a named export the op and the replay both call); `optionOps.ts` (the Task 3 helpers are the reuse surface — no further extraction expected; a divergence rewrites this list before the commit). **Interfaces:** `export function replaySchemaCascade(root: string): Promise<void>` — the ONE entry, wrapped in `serializeSchemaOp` internally; everything it calls is unwrapped internals. Never throws: total try/catch, log-and-return, record left in place. **Steps / per-op law:**
  1. `readSchemaJournal` — `null` → return.
  2. `rename { id, from, to }`: `defs[id]?.name === to` → the commit landed → `renameSweep(root, from, to)` → clear. `defs[id]?.name === from` → never landed → clear untouched. Any other state (def absent, def renamed again, another def owning `to`) → clear untouched. Never gate by name alone (review High #1: a name-gated sweep merges two properties' values on a refused rename).
  3. `delete { id, name }`: `defs[id]` exists, or any def's name matches `name` → the delete was undone, superseded, or the name re-taken → clear untouched (belt to Task 2's create-side consumer, which handles the in-app doors; this arm catches anything external). Otherwise → re-run the tail: strip `wrapKey('property', name)` off every holder via the named strip export, `unassignAndPurge(folder, id)` over `collectionFolders`, `removeFromRegistry(root, id)` treating `not-found` as done → clear. Never re-snapshot.
  4. `option-rename { id, from, to }`: def by `id` present AND its option values hold `to` and NOT `from` → the commit landed → `cascadePages` with `replacePageValue(key, from, to, type)` → clear. **Every other state** — def absent, still holds `from`, holds both (the refused-duplicate residue), holds neither — → clear untouched (review Medium #3: the draft's acting-by-default arm merged two options on a refused rename).
  5. `option-strip { id, value, drop }`: def absent → clear. Present → strip `value` via `stripPageValue`; if `drop`, re-run the shared registry-finish helper (value already gone → no-op success) → clear.
- Tests, the crash-window suite (fixture: real temp nexus; each window built by running the same exported internals the live op runs, stopped between steps, journal present as the op leaves it — the Tasks 2–3 wiring tests are the proof the live ops produce these exact states): per op — (a) half-completed state + record → replay → **identical to an uninterrupted op, modulo `modified_at` on the stamping ops** (the must-agree test: replay and live op reach the same disk); (b) record present but commit never landed (rename: def still named `from`; option-rename: def holds both) → pages byte-untouched, record cleared; (c) replay twice ≡ once; (d) **warm index**: real session db, seeded, `markIndexReady` fired → the replay's holders come from the query (assert via a page the corpus holds but the index doesn't) — with the cold fallback as the variant, not the main case (review Low #8: the suite runs cold by default, so cold proves nothing); (e) delete replay mints NO new `.trash` bundle (count before = after); (f) delete record vs a re-created same-name def and vs a restored same-id def → cleared untouched, values intact (review High #2's two doors). **Negative control:** one test runs the half-completed state WITHOUT invoking the replay and asserts the divergence persists — red against the healed assertion — proving the replay, not the fixture, does the healing; the (a) tests are the guarded-operation-ran half.

**Task 5 — wire the replay into both open paths.**
**Why:** a replay nobody calls heals nothing. **Files:** `index.ts`. **Steps:** (1) `adoptNexusInner`: `await replaySchemaCascade(root)` immediately after `await seedContentIndex(root)` inside the root-switch branch — warm index, warm tree; a same-root re-adopt skips it, which is correct: a live session's record belongs to an op still in flight on the schema chain, and the replay riding `serializeSchemaOp` would queue behind it anyway. (2) Launch-restore: same call after its `seedContentIndex`. (3) Comment at each site carries the seam's why (post-seed for warmth; serialized against live ops by the chain). Expected: `npm run typecheck` green; the two sites are the only callers (`grep -n "replaySchemaCascade" src/main` → exactly 3 hits: definition + two calls).

**Phase gate:** gates green; the crash-window suite red-proofed once (sabotage the replay body → (a) tests fail → restore by inverse edit, never `git checkout`); dispatch `build-breaking-agent` against the two-phase diff (base recorded below) with this plan as brief; verify each finding personally; fold or rule with reasons in the log; commit.

### Phase 3 — Closeout

**Task 6 — docs made true + record.**
**Why:** the blast radius names five docs whose statements this work falsifies or completes; the Zero-Residue discipline from the parent arc holds. **Files:** `PropertiesPM.md` (journal section beside the cascade documentation — what the record is, when it exists, how it heals; encyclopedic voice, no literals beyond the filename), `ArchitecturePM.md` (open sequence, only if it enumerates the steps — verify, don't assume), `FrameworkPM.md` (queue line, if present), `ContextPM.md` (the two journal entries resolve: Immediate Work and the Boring Work entry delete; Current Focus restated), `HistoryPM.md` (PM-106 entry per History-Format). **Steps:** grep each doc for `journal`/`cascade`/`crash` before editing; every edit rides this commit; final `git status` clean. Then: dispatch `code-simplifier` over the full journal diff (all three phases); verify folds personally; gates; final commit. **Residue check:** `grep -rn "TODO\|XXX" src/main/crud/propertyJournal.ts src/main/crud/replaySchemaCascade.ts` → 0; control token `TODO` findable in the repo at large.

### Sequenced After

- Full-text search over the content index (FrameworkPM's named next piece) — untouched here.
- `removeProperty` journaling, if ever wanted — a fresh decision with the softer-residue reasoning above as its starting point.

### Review Record

One attack round (build-breaking-agent, against the plan at `e8c1735a`): 9 findings — 2 High, 4 Medium, 3 Low — all verified against the code and folded above. The two Highs and one Medium were a single defect in three op shapes (name-keyed or unconditional replay arms acting by default), answered by the replay's one law plus `id` on every record. The remaining folds: executable acceptance criterion (modulo `modified_at`; named fixture seam; all five shapes), the clear's session-root guard, the clear's write-echo (fixing the Context journal's identical gap in passing), Task 4's honest extraction list, and the warm-index test. One Low (the immortal-record retry) was ruled an acknowledged cost, not machinery. Two review unknowns dissolved under the folds: the echo-window question is mooted by echoing the clear, and the iCloud-`rm` question is absorbed by the verification law.

### Progress

- [x] Task 1 — record module (+ sibling echo line)
- [x] Task 2 — rename + delete writers, create-side consumer
- [x] Task 3 — option-op writers + shared helpers
- [x] Phase 1 gate
- [x] Task 4 — replay module
- [x] Task 5 — open wiring
- [x] Phase 2 gate (red-proof + attack review)
- [ ] Task 6 — docs + simplifier + final commit

### Log

**Phase 2** — base `f2b57dd6`. Gates: typecheck 0 · 2866 tests 0 · lint 0. Red-proof: inverting the rename arm's gate flipped exactly the four rename-path tests red (including the never-landed guard — a genuine control, not a tautology); restored by inverse edit. **Deviations, all from the gate's attack round (4 findings — 3 Medium, 1 Low — every one verified against the code before folding):** (1) The Grounding's "`cascadePages` throws on an unreadable file" was FALSE — the sweep layer skips. Folded as: `cascadePages` counts unreadable holders (the rewrite callback only runs on a landed read, so its silence is the signal), `sweepGovernedRoots.skipped` is finally consumed, and **skips hold the record** at every journaled settle; the replay treats its own skips the same way, so the record survives until every holder reads. (2) The single-slot record protected: a write never displaces a different held record (the new op runs unjournaled in that already-faulted state), and a clear lands only for the record its caller staged. (3) `clearOption`/`clearStatusOption` are UNJOURNALED — pages-only residue disagrees with nothing (the removeProperty razor), and a stale clear record was itself the destructive path; the record shape simplified to `option-remove { id, value }`, gated on the value still standing in the def (pages-first order makes that the exact owed state). (4) `createProperty` consumes a matching delete record only AFTER its commit lands. Also corrected from the round: the delete arm forward-completes on def-present-under-journaled-name (the registry commits last, so that IS the crash state — the plan's Task 4 §3 text was wrong, the code is right) and additionally acts on the freed-name state (delete finished, record held for skipped stragglers).

**Phase 1** — base `b453cfd9`. Gates: typecheck 0 · 2849 tests 0 · lint 0. Simplification ruling: inline pass only (the diff is ~120 lines across four files; every wiring re-read after Biome's reflow) — no agent warranted. **Deviation:** the option-rename pair's journal write is def-gated (`readRegistry` pre-check) rather than unconditional-before-`mutateRegistry` as Task 3 stated: the ops' contract is Result-never-throw, and an unconditional journal write on a nexus refusing the op for an unknown id was the wiring suite's own ENOENT counterexample. The gate loses nothing — a record for a nonexistent def is exactly what the replay's def-absent arm clears; `editProperty` (prior-gated) and the strip ops (post-`resolveForCascade`) already carried the same shape.
