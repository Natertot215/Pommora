## Property-Cascade Journal — Implementation Plan

**Status:** written — pending review.

### Goal

A crash mid-cascade must never leave the property registry and the pages disagreeing. Today a property rename commits `.nexus/properties.json` and then sweeps the new key across every holding page; a delete snapshots, strips values, unassigns, and removes the definition; the option ops rename or strip one value across the holders. None of them records that the sweep is owed, so a crash partway strands the un-swept pages permanently and silently. This plan gives the schema cascades what the Context rename already has: a tiny intent record under `.nexus`, written before the work and deleted after it, replayed at the next open to forward-complete whatever a crash interrupted.

**Approach (ratified):** a **sibling record** beside the Context journal — its own file, never a shared list, because the two chains serialize independently (`serializeSchemaOp` vs the Contexts registry's file lock) and a shared list would invent a collision that doesn't exist. The journaled ops are **property rename, property delete, and the option cascades** (rename / remove / clear, Select and Status both) — all sharing one crash shape and one sweep mechanism. The record carries **intent, never a snapshot**: the replay re-runs the already-idempotent sweep against current disk, re-deriving its targets through `keyHolderFiles` (index query, corpus-scan fallback), so it stays most-recent-wins and self-healing where a remembered page list would go stale. The `.trash` bundle's value snapshot is a different mechanism — human undo, not crash consistency — and is untouched.

**Deliberately not solving:** `removeProperty` (the per-Collection unassign+strip). Its crash residue is softer — the registry never disagrees with itself, the sidecar `property_cache` captured the values first, and re-assigning resurfaces them. It stays outside the journal; widening later is a fresh decision.

### Grounding

All verified against the working tree at `ab0f25ce`, not recalled:

- **The precedent:** `src/main/crud/contextJournal.ts` — `.nexus/context-rename.json`, one record max (whole-file overwrite), hand-rolled validator returning `null` on any malformed shape, `writeJson` (atomic + watcher write-echo) to write, `rm -f` to clear. Deliberately absent from `NEXUS_CONFIG_FILES`. Its replay (`replayPendingRename`, `contextCascade.ts`) is verification-first: every state the record no longer maps clears the record instead of acting.
- **Rename order:** `editProperty` (`registryProperty.ts`) commits the registry FIRST, then `renameSweep(root, from, to)` — sweep queried by the OLD key, collisions resolved `prefer-new`. The rename decision is only known inside the `mutateRegistry` closure.
- **Delete order:** `deleteInner` (`deleteProperty.ts`): read def → `collectionFolders` → `keyHolderFiles` → `snapshot` (mints a fresh `.trash` bundle — NOT idempotent) → `sweepGovernedRoots` strip → `unassignAndPurge` per folder (idempotent) → `removeFromRegistry` LAST (`not-found` on a second run).
- **Option orders:** `renameOption`/`renameStatusOption` — registry first, then `cascadePages` with `replacePageValue`. `removeOption`/`removeStatusOption` — pages first (`stripCascade`), then registry. `clearOption`/`clearStatusOption` — pages only. All resolve `{ type, key }` from the def via `propertyKey`; all page rewrites no-op (`null`) when the target value/key is absent, and skip non-admitted bodies via `sweepAdmits`.
- **The sweep seam:** `cascadePages(root, key, rewrite)` = `collectionFolders` → `keyHolderFiles` → per-file `rewritePageSerialized` + `indexWrittenPage`. It throws on an unreadable file — no skip list. `keyHolderFiles` = `queryKeyHolders(key) ?? nexusCorpus(root)`, scope-intersected; the index answers `null` until `markIndexReady`, and every caller tolerates the scan fallback.
- **The open sequence** (`index.ts`, `adoptNexusInner`): `openSession` → `prepareOpenedNexus` → `replayPendingRename` (Context journal, pre-everything) → `openSessionDb` → on root switch: `dropLiveTree` → walk → `seedContentIndex`. Launch-restore (`index.ts` ~1839) mirrors it. `seedContentIndex` runs only inside the root-switch branch.
- **The serializer:** `serializeSchemaOp` (`schemaChain.ts`) — one global promise chain; wrap ENTRY POINTS ONLY (a chained fn awaiting another chained fn deadlocks).
- **Watcher:** any unclassified `.nexus/*` write classifies `full-refresh`; `writeJson` → `atomicWriteFile` records a write-echo that suppresses it. The journal must use that path (the Context journal already does).

### Forced By

- Registry-first rename order → the record must be written BEFORE the registry commit and must carry `from`/`to` explicitly: after the commit the old name is recoverable from nowhere.
- Non-idempotent `snapshot` → the delete replay re-runs only the sweep/unassign/registry tail, never the snapshot leg; the record is written AFTER the snapshot.
- Post-registry delete → the def is gone at replay time, so the record carries both `name` (derives the page key) and `id` (drives `unassignAndPurge` + `removeFromRegistry`).
- The Context replay's seam (pre-`openSessionDb`) would cost a property replay two cold walks → the property replay runs AFTER `seedContentIndex`, where the index and live tree are warm; nothing the property replay heals is read during open the way contexts are, and `keyHolderFiles` tolerates a cold index regardless.
- `serializeSchemaOp`'s wrap-entry-only rule → the replay is one wrapped entry point calling only unwrapped internals; the ops' inner bodies it reuses must be reachable without their `serializeSchemaOp` wrapper.
- `cascadePages` throws on an unreadable file → the replay wraps its work in try/catch: on throw the record survives and the next open retries; a replay failure must never block opening the nexus.

### Inherited Reasoning

- Two records, never a shared list — ratified; the chains serialize independently.
- Intent, never a snapshot — ratified against the "remembered snapshot" alternative: a page list or value map goes stale the moment disk moves without the app; the idempotent re-sweep cannot.
- A file under `.nexus`, not a db row — the db is optional exactly when things went wrong.
- The Context journal's `skipped[]` list is NOT mirrored: `cascadePages` throws rather than skips, so a surviving record already is the retry mechanism. Adding skip-tracking would mean changing the shared sweep for a state it cannot currently produce.

### Blast Radius

**New:** `src/main/crud/propertyJournal.ts` (+ test), `src/main/crud/replaySchemaCascade.ts` (+ test).
**Edited:** `registryProperty.ts` (editProperty), `deleteProperty.ts` (deleteInner), `optionOps.ts` (five entry ops), `index.ts` (two replay call sites).
**Docs made true:** `PropertiesPM.md` (journal section), `ArchitecturePM.md` (open sequence, if it names the steps), `ContextPM.md` (journal items resolve; Current Focus), `HistoryPM.md` (PM-106), `FrameworkPM.md` (if the queue names the journal).
**Untouched on purpose:** `contextJournal.ts` / `contextCascade.ts` (the sibling stays as-is), `provenance.ts` (snapshot mechanism), `governedSweep.ts`, `removeProperty.ts`.

### Work Shapes

**Additive** (new behavior → failing test first: the half-cascaded state heals only with the replay wired). **Fix-adjacent** (the wiring edits live ops → each op's existing tests stay green; sibling sweep = all eight entry points enumerated below, a set read from `optionOps.ts`/`registryProperty.ts`/`deleteProperty.ts`, verifiable by the `serializeSchemaOp` grep in Task 3's derivation).

### Acceptance Criterion

Kill the process (simulated: run the op's inner body up to a chosen point, as the crash-window tests do) after a property rename's registry commit but before its sweep completes, with ≥2 holder pages unswept. On the next `adoptNexusInner`-equivalent open path, without any user action: every page carries the new key, the journal file is gone, and the resulting page bytes are identical to those of an uninterrupted rename. The same holds for delete (values stripped, def gone, exactly ONE `.trash` bundle) and option-remove (value stripped everywhere, option gone from the def). No single task's test satisfies this alone; the Phase 2 crash-window suite plus the negative control together do.

### Global Constraints

- Gates from `Pommora/`: `npm run typecheck` && `npm run test` && `npm run lint`, exit codes read directly, never piped. Green before every commit.
- One tree-touching writer at a time. Biome owns formatting (hook); `npm run format` repairs shell-driven writes.
- `KNOB` / `(Nathan's call)` markers survive. Comments carry only uninferable whys.
- Never a claim of a result not watched happening. Doc edits ride the falsifying commit. No docs left uncommitted on any final commit.
- The replay must never block or fail an open: every throw is caught, logged, and leaves the record for the next open.

---

### Phase 1 — The Record and Its Writers

**Task 1 — `propertyJournal.ts`: the record file.**
**Why:** one module owning the record's path, shape, write, read, clear — the exact division `contextJournal.ts` proved, so the sibling reads as a sibling. **Files:** new `src/main/crud/propertyJournal.ts`, new `src/main/crud/propertyJournal.test.ts`. **Interfaces:**

```ts
export type SchemaJournal =
  | { op: 'rename'; from: string; to: string }
  | { op: 'delete'; id: string; name: string }
  | { op: 'option-rename'; id: string; from: string; to: string }
  | { op: 'option-strip'; id: string; value: string; drop: boolean }
export function writeSchemaJournal(root: string, j: SchemaJournal): Promise<void>
export function readSchemaJournal(root: string): Promise<SchemaJournal | null>
export function clearSchemaJournal(root: string): Promise<void>
```

`option-strip` with `drop: false` is clear (registry untouched), `drop: true` is remove (registry finish owed). Status and Select are NOT distinguished in the record — the replay re-resolves the def by `id` and the rewrites are type-driven. Consumed by Tasks 2–5. **Steps:** (1) Path: `.nexus/property-cascade.json` via `nexusConfig`-adjacent join exactly as `contextJournal.ts` does; NOT added to `NEXUS_CONFIG_FILES`. (2) Write via `writeJson` (atomic + echo), whole-file overwrite, one record max. (3) Read with a hand-rolled validator mirroring `readJournal`'s: unknown `op`, missing/mistyped field, non-object → `null`. (4) Clear via `rm(path, { force: true })`. (5) Tests: round-trip per op shape; malformed variants → `null`; clear on absent file resolves. Expected: suite green. **Must agree:** the validator admits exactly what the writer produces — the round-trip test per op variant is that agreement.

**Task 2 — journal the property rename and delete.**
**Why:** the two ratified core ops; each writes intent before its first irreversible step and settles after its last. **Files:** `registryProperty.ts` (`editProperty`), `deleteProperty.ts` (`deleteInner`), their tests. **Steps:** (1) `editProperty`: before `mutateRegistry`, pre-read the def; if `changes.name` normalizes to a different name, `writeSchemaJournal(root, { op: 'rename', from, to })`. After the sweep (or when the edit returns non-rename/failure), `clearSchemaJournal`. The pre-read is advisory only — `mutateRegistry` remains the validator; a journal written for an edit that then fails validation is cleared on the failure path (harmless either way: the replay clears a record whose rename never committed). (2) `deleteInner`: `writeSchemaJournal(root, { op: 'delete', id, name: def.name })` AFTER `snapshot(...)`, before the sweep; `clearSchemaJournal` after `removeFromRegistry` succeeds (and on its `not-found`). (3) Tests: spy ordering — journal present when the sweep runs, absent after settle; rename-validation failure clears; delete's journal written post-snapshot (exactly one bundle exists at write time). Expected: existing op tests untouched and green. **Failure half:** a write failure of the journal itself fails the op before any page is touched (it's just an awaited write at the head) — stated in a test only for rename (the delete path's snapshot precedes it by design).

**Task 3 — journal the five option ops.**
**Why:** same crash shape, same fix; confirmed in scope. **Files:** `optionOps.ts` (`renameOption`, `renameStatusOption`, `clearOption`, `clearStatusOption`, `removeOption`, `removeStatusOption` — six functions, five distinct shapes since clear/remove pair across types), tests. **Derivation:** `grep -n "serializeSchemaOp" src/main/crud/optionOps.ts` → 8 hits at planning time (includes `setOptions`/`setStatusGroups`, which cascade nothing and stay unjournaled); control token: `serializeSchemaOp` in `assignment.ts`. **Steps:** (1) Rename pair: `writeSchemaJournal({ op: 'option-rename', id, from: oldValue, to: newTitle })` before `mutateRegistry`; clear after the cascade (and on registry failure). (2) Clear pair: `{ op: 'option-strip', id, value, drop: false }` after `resolveForCascade` succeeds, before `stripCascade`; clear after. (3) Remove pair: `{ op: 'option-strip', id, value, drop: true }` same placement; clear after the registry finish. (4) Tests: one ordering spy per shape; `setOptions` provably unjournaled (its test asserts no journal write — the negative control's admitted-subject half lives in the shapes above). Expected: green.

**Phase gate:** gates green; simplification + comment pass inline over the phase diff (the phase is small — a dispatched agent is not warranted; note the judgment in the log); commit; tick boxes in the same commit; record base + commit hashes below.

### Phase 2 — The Replay at Open

**Task 4 — `replaySchemaCascade.ts`: verification-first forward-completion.**
**Why:** the record is worthless without the open-time replay; verification-first (the Context replay's proven posture) is what makes every stale record safe to hold. **Files:** new `src/main/crud/replaySchemaCascade.ts` + test; small exports where the replay reuses op internals (`renameSweep` is already exported; the option rewrites resolve through `propertyKey` + `replacePageValue`/`stripPageValue`, already importable; `unassignAndPurge` and the delete sweep body may need export from `deleteProperty.ts` — a divergence there rewrites this task's imports, not its semantics). **Interfaces:** `export function replaySchemaCascade(root: string): Promise<void>` — the ONE entry, wrapped in `serializeSchemaOp` internally; everything it calls is unwrapped internals (the chain's wrap-entry-only law). Never throws: total try/catch, log-and-return, record left in place. **Steps / per-op semantics:**
  1. `readSchemaJournal` — `null` → return.
  2. `rename { from, to }`: read registry. A def named `to` exists → `renameSweep(root, from, to)` → clear. A def still named `from` → the commit never landed; the op never took effect → clear untouched. Neither → clear.
  3. `delete { id, name }`: unconditionally re-run the tail: sweep the key `wrapKey('property', name)` off every holder (same strip rewrite as `deleteInner`, via `keyHolderFiles` scope), `unassignAndPurge(folder, id)` over `collectionFolders`, `removeFromRegistry(root, id)` treating `not-found` as done → clear. Never re-snapshot.
  4. `option-rename { id, from, to }`: def by `id` absent → clear. Def's option set (per type) still holds `from` and not `to` → the registry commit never landed → clear untouched. Otherwise → `cascadePages` with `replacePageValue(key, from, to, type)` → clear.
  5. `option-strip { id, value, drop }`: def absent → clear. Present → `stripCascade`-equivalent (`stripPageValue`); if `drop`, re-run the registry filter (value already gone → no-op success) → clear.
- Tests, the crash-window suite (fixture: real temp nexus, journal written by hand to simulate each window): per op — (a) half-completed state + record → replay → **byte-identical to an uninterrupted op** (the must-agree test: replay and live op reach the same disk); (b) record present but commit never landed (rename + option-rename) → pages byte-untouched, record cleared; (c) replay twice ≡ once; (d) cold index (no session db) → corpus fallback completes; (e) delete replay mints NO new `.trash` bundle (count before = after). **Negative control:** one test runs the half-completed state WITHOUT invoking the replay and asserts the divergence persists — red against the healed assertion — proving the replay, not the fixture, does the healing; the (a) tests are the guarded-operation-ran half.

**Task 5 — wire the replay into both open paths.**
**Why:** a replay nobody calls heals nothing. **Files:** `index.ts`. **Steps:** (1) `adoptNexusInner`: `await replaySchemaCascade(root)` immediately after `await seedContentIndex(root)` inside the root-switch branch — warm index, warm tree; a same-root re-adopt skips it, which is correct: a live session's record belongs to an op still in flight on the schema chain, and the replay riding `serializeSchemaOp` would queue behind it anyway. (2) Launch-restore: same call after its `seedContentIndex`. (3) Comment at each site carries the seam's why (post-seed for warmth; serialized against live ops by the chain). Expected: `npm run typecheck` green; the two sites are the only callers (`grep -n "replaySchemaCascade" src/main` → exactly 3 hits: definition + two calls).

**Phase gate:** gates green; the crash-window suite red-proofed once (sabotage the replay body → (a) tests fail → restore by inverse edit, never `git checkout`); dispatch `build-breaking-agent` against the two-phase diff (base recorded below) with this plan as brief; verify each finding personally; fold or rule with reasons in the log; commit.

### Phase 3 — Closeout

**Task 6 — docs made true + record.**
**Why:** the blast radius names four docs whose statements this work falsifies or completes; the Zero-Residue discipline from the parent arc holds. **Files:** `PropertiesPM.md` (journal section beside the cascade documentation — what the record is, when it exists, how it heals; encyclopedic voice, no literals beyond the filename), `ArchitecturePM.md` (open sequence, only if it enumerates the steps — verify, don't assume), `FrameworkPM.md` (queue line, if present), `ContextPM.md` (the two journal entries resolve: Immediate Work and the Boring Work entry delete; Current Focus restated), `HistoryPM.md` (PM-106 entry per History-Format). **Steps:** grep each doc for `journal`/`cascade`/`crash` before editing; every edit rides this commit; final `git status` clean. Then: dispatch `code-simplifier` over the full journal diff (all three phases); verify folds personally; gates; final commit. **Residue check:** `grep -rn "TODO\|XXX" src/main/crud/propertyJournal.ts src/main/crud/replaySchemaCascade.ts` → 0; control token `TODO` findable in the repo at large.

### Sequenced After

- Full-text search over the content index (FrameworkPM's named next piece) — untouched here.
- `removeProperty` journaling, if ever wanted — a fresh decision with the softer-residue reasoning above as its starting point.

### Progress

- [ ] Task 1 — record module
- [ ] Task 2 — rename + delete writers
- [ ] Task 3 — option-op writers
- [ ] Phase 1 gate
- [ ] Task 4 — replay module
- [ ] Task 5 — open wiring
- [ ] Phase 2 gate (red-proof + attack review)
- [ ] Task 6 — docs + simplifier + final commit

### Log

*(base commits, deviations, rulings — filled at execution)*
