#### Scout 6 — Owed Work, Adjacencies & Documentation

**Base:** `active` at `15fe7422a`, read-only; cleaned against *Trash & Archive Restructure — Investigation* on 10-28-2026 under Decisions 10 through 14. The inventory, the behavior to preserve, and the test notes are this scout's own; every finding, and the documentation and issue audit, is stated once in the Investigation, and this report maps each to it. Corrected claims are marked **Corrected**.

**Grounding Check:** finishOwed has no Archive arm; what touches the Archive is a walk inside the container arm (`Core/Nexus/finishOwed.ts:390-399`) and the Archive-delete entries `deleteOp` writes keyed by path (`Core/Trash/delete.ts:210`). **Corrected:** the Archive does write the journal, as relink entries from its departing re-spell and both restores' repairs (`settle.ts:301-302,338`). `finishProperty`'s gone-for-good arm hand-rolls its own Trash listing (`finishOwed.ts:164-186`) rather than using `trashedHolders`.
### 1. Inventory

##### `Core/Nexus/owed.ts` (269 lines) — the on-disk journal `.nexus/.owed.json`

| Symbol | Job | Callers |
| --- | --- | --- |
| `Owed` (`:15`) | `rename`/`strip`/`kept` name lists | Every entry type; **collides by name** with `fileEvents.ts:93` `interface Owed` |
| `PropertyEntry` (`:16-20`) | Property renames/strips + `options` + `collections` | Properties ops, `finishProperty`, `emptyBundle` (`spend.ts:79`) |
| `ContextEntry` (`:21`) / `SpaceEntry` (`:22`) | Title renames/strips + `bundle` | `deleteNote` (`delete.ts:63-74`), `contextCascade.ts`, `finishContext`/`finishSpace` |
| `ContainerEntry` (`:24-31`) | `at`, `strip`, `edit`, `within`, `bundle`, `park` | Writers: `delete.ts:211-217` (delete), `spend.ts:95-104` (empty), `move.ts:79` (Set move). Readers: `finishContainer`, `spendBundle` (`bundle.ts:383-392`) |
| `Worked`, `workedOut` (`:33-40`) | Per-file values a restore couldn't write | `restoreScrub.ts`, `trashedCopies.ts:112`, `oweWorked` |
| `RelinkEntry` (`:42-49`) | Re-spell maps + scoped repair | `settle.ts`, `cascade.ts:325`, `restoreScrub.ts:226` |
| `readNotes` (`:72`) | Reads the journal | 7 files |
| `distinct` (`:76`) | Dedupe-or-undefined | owed, delete, spend, bundle, assignment, unassign |
| `relinkNote`/`followRelinks` (`:91-126`) | Compose re-spells | `settle.ts:301-302`, `contextCascade.ts` |
| `owesRename` (`:129`) | H-1 test | `runNoted`, `finishOwed` |
| `editNote` (`:132-153`) | Locked RMW of one entry | `finishOwed`, `spend.ts:79`, **`Bundles/bundle.ts:388`** |
| `propertyNote`, `owedRename`, `owedDelete`, `owedSwept`, `withOption` (`:155-183`) | Compose rules | Properties ops; `owedDelete` also `delete.ts:72` |
| `owedName` (`:186-201`) | Landing refusal on owed names | contextWrite, optionOps, registryProperty, `spend.ts:185` |
| `restoreNote` (`:204-211`) | H-4: restore converts `strip` → `rename`, clears `bundle` | `spend.ts:210` (Context/Space), `restoreProperty.ts:47` |
| `OWED`, `owedReport` (`:63`, `:214-222`) | Refusal + report marking | finishOwed, spend, Properties ops |
| `oweWorked` (`:225-239`) | Writes restore leftovers into a relink entry | `spend.ts:289` only |
| `runNoted` (`:242-269`) | Note → list → sweep → settle | 9 files incl. `delete.ts:147` |

##### `Core/Nexus/finishOwed.ts` (417 lines) — the finishing pass

| Symbol | Job | Callers |
| --- | --- | --- |
| `finishOwed` (`:73-96`) | Open + Try Again pass, by kind under each kind's lock | `handlers.ts:108`, `mutate.ts:322` |
| `finishEntry` (`:99-106`) | One entry inside its caller's lock | `delete.ts:160`, `spend.ts:85,113` |
| `finishArm` (`:108-130`) | Switch over entry kind | `finishEntry` |
| `stuck`, `add`, `sweepEach` (`:59-147`) | Reach accounting | Arms |
| `finishProperty` (`:149-210`) | Property arm; **`!def` branch reaches the Trash** (`:164-186`) | `finishArm` |
| `finishOptions` (`:212-256`) | Option parts | `finishProperty` |
| `leave` (`:259-268`) | Context/Space folder → bundle, or `discardFile` | `finishContext:318`, `finishSpace:347` |
| `finishContext` (`:270-327`) | Context arm; drops order when `!bundle` (`:325`) | `finishArm` |
| `finishSpace` (`:329-374`) | Space arm | `finishArm` |
| `finishContainer` (`:376-417`) | Delete / empty / Set-move arm; Archive walk in `owedEdit` (`:386-400`); links → `bundle` record or `parkLinks` (`:403-409`) | `finishArm` |

##### `Core/Nexus/mutate.ts` dispatch (my four ops)

- `delete` (`:132-135`): `deleteOp` in the settle's turn, Contexts lock added for Space/Context.
- `archive` (`:137-138`): `archiveOp` in the settle's turn.
- `restore` (`:141-154`): resolves, picks the lock by `bundleAddressOf` store, then `openBundle` again inside; a **Trash** restore always takes the Contexts lock, even for a page (`:153`).
- `emptyBundle` (`:156-161`): settle's turn only; its property arm takes the schema lock itself (`spend.ts:85`).

##### Adjacent Machinery

| Symbol | Job | Callers |
| --- | --- | --- |
| `dropPageMetadata` (`pageMetadata.ts:119-134`) | Drops metadata for ids no live page holds | `delete.ts:138` (system mode only, via `pageIds` empty otherwise), `spend.ts:108`, `exclusionScan.ts:85` |
| `pageIdsOf` (`bundle.ts:411-414`) | Ids from files | `delete.ts:108`, `spend.ts:92` — same expression both places |
| `archiveHistoryDays` (`personalization.ts:190`, bound `:262`) | Archive snapshot timeframe | `settings.ts:90` → `sweepFileHistory` (`fileHistory.ts:195-210`), re-run on change (`Settings/handlers.ts:47`). Trashed pages follow `historyDays`; emptied pages' snapshots age out rather than drop |
| `liftSetAside` (`folderEntity.ts:53-88`) | Lifts excluded/asset folders out of a departing container, with rollback | `delete.ts:91` (live containers), `archive.ts:45` (Sets) |
| `landingRefusal` (`folderEntity.ts:21-29`) | Refuses landing on a set-aside name | create, move, rename, `placement.ts:171` |
| `dropDeparture` (`reorder.ts:78-109`) | Drops a departing id from its order; Context keeps its panel id | `delete.ts:137`, `archive.ts:51`, `move.ts:38,72` |
| `dropContextOrder` (`reorder.ts:54-60`) | Drops a gone Context's panel id (the Property Panel's Context order) + Space order; reshaped by Decision 13 (L-3) | `finishOwed.ts:325` (system mode), `spend.ts:109` (empty) |
| `discardFile`, `trashFileFlat`, `TrashDeps`, `trashDeps` (`Trash/discard.ts`) | Trash Mode routing; record-less stamped drop into `.trash` | delete, finishOwed `leave`, tiles, assets |
| `Machine.trashToSystem?`, `lock`, `remove` (`Platform/machine.ts:28-36`) | Host seam | `Desktop/main.ts:72` installs `shell.trashItem`; `setAside` (`atomicWrite.ts:226-229`) calls it directly; `spend.ts:72` calls `remove` |
| `relocate` (`atomicWrite.ts:62-75`) | Move under the source's lock | everywhere a bundle fills or empties |
| `tap.ts:50` | Drops *watched* events under `.trash` | Sync client (noted only) |

---

### 2. Findings, as the Investigation Holds Them

- **Two `leave`s (§2.1):** confirmed; under Decision 14 both are "relocate into the bundle" (M-8).
- **Two "Gone for Good" Sequences (§2.2):** confirmed; under Decision 14 the delete's copy leaves (L-1, M-7).
- **Three Ways to the System Trash (§2.3):** confirmed; under Decision 14 `discardFile` loses its system arm, the empty's `dispose` and `setAside` remain (L-1), and `TrashDeps`' re-wrap is L-2.
- **Three Trash Listings (§2.4):** confirmed, with the trashed-Space consequence; B-3 and M-9.
- **Two Links-Into-a-Record Writers (§2.5):** confirmed; M-5.
- **Two Archive-Ownership Walks (§2.6):** confirmed; M-11.
- **Restore-Undoes-the-Delete Three Ways (§2.7):** confirmed; P-5.
- **`frozenWorld(linkWorld(...))` Thrice (§2.8):** confirmed (four call sites); M-12.
- **Two `Owed` Types (§2.9):** confirmed; outside this surface, noted in *§What's True · Owed Work*.
- **`ContainerEntry` as Three Operations, `park` (§3.1, §3.2):** confirmed; M-6. Under Decision 14 a content delete always has a bundle, so `park` says nothing the missing bundle doesn't.
- **Journal Edits Outside the Journal (§3.3):** confirmed; P-5.
- **`TrashDeps.trashToSystem` (§3.4):** confirmed (31 test files stub it); L-2.
- **`heldPages.ts`'s Two Concerns, the Lock by Store (§3.5, §3.6):** confirmed; P-7. **Corrected:** the lock earns itself today for every scrubbed entity (*§Corrections*).
- **`mutate.ts:88` Truncated (§1, §4):** **Corrected:** the comment isn't truncated; it continues on the same line. Removed.
- **`tap.ts:50` (§4):** confirmed unreachable; the watcher is the tap's only feeder (`watcher.ts:112`).
- **The Unreachable Branch and the Mode Flip (§4):** confirmed; both leave with Decision 14, and a flat folder already left stays invisible under Decision 11.
- **The Record-Less Second Trash Layout (§4):** settled by Decision 11.
- **`oweWorked`, `owesRename`, the Pass-Order Comment (§4):** confirmed; *§What Becomes False*.
- **`emptyBundle`'s Partial Failure (§4, §10.3):** confirmed by reading; B-5.
- **Reach-In Implications (§5):** confirmed and carried into *§The Trash's Model*, the sweep-set and resolution-world split among it.
- **Proposals (§6):** 1 → M-9; 2 → M-7; 3 → M-8; 4 → M-6; 5 → P-5; 6 → M-11; 7 stays outside this surface; 8 → L-2; 9 → *§Corrections* and M-3.
- **Documentation & Issues (§8):** carried into *§What Becomes False*. **Corrected:** `NexusRecordPM.md:34` wants rewriting rather than removal, since relink entries are noted after their move (`cascade.ts:323-337`); `PommoraPRD.md:103` becomes accurate under Decision 14.
- **Questions (§10):** 1 (three keyings) stays a plan concern under M-6; 2 → B-3; 3 → B-5; 4 → Decision 14; 5 and 6 hold as stated.
### 7. Behavior to Preserve

| Behavior | Pinned by |
| --- | --- |
| A delete strips Link values naming the page (live + Archive), the record keeps them, and a restore re-adds them while Restore Links On Deletion is on | `trashRecovery.test.ts:441,530,873`; `deleteReach.test.ts:111,346` |
| Body links phantom, then repaired on restore | `spend.test.ts:1028-1349` |
| Emptying strips values taken up since and parks with a trashed namesake | `trashRecovery.test.ts:700,741,748,774` |
| A property gone for good leaves trashed Collections and pages | `spend.test.ts:2570-2659` |
| Write-ahead: a crash between note and list step finishes at open; a failed move deletes nothing | `deleteReach.test.ts:490-732,808,829`; `finishOwed.test.ts:223` |
| System-trash mode: no bundle, metadata dropped, Context order dropped (**Leaves** under Decision 14) | `spend.test.ts:341,351,1876`; `finishOwed.test.ts:762` |
| A Collection gone for good takes its Archive and the views naming its Sets | `deleteReach.test.ts:458,472`; `spend.test.ts:1950`; `trashRecovery.test.ts:1050` |
| An inner item pulled out releases its share of the owed strip | `trashRecovery.test.ts:985-1009`; `spend.test.ts:1804` |
| H-4: a restore converts the owed strip into renames | `owed.test.ts:159` |
| `owedName` refuses a landing on another item's owed title | `owed.test.ts:139`; `spend.test.ts:2532` |
| Archived Sets keep their views through an owed gone edit | `trashRecovery.test.ts:1011-1048` |
| The journal is neither watched nor synced | `owed.test.ts:133` |
| A Context in the Trash keeps its order (changes under Decision 13: its `place` returns it; the panel id leaves) | `spend.test.ts:298,323` |

---

### 9. Tests

- **`finishOwed.test.ts` has no container-arm case** (no `kind: 'container'` in the file). The arm is pinned across `deleteReach.test.ts:732-900`, `trashRecovery.test.ts:885-1072`, and `spend.test.ts:1772-1973`. A reader looking for the arm's tests in the arm's suite finds none.
- **Overlap:** `trashRecovery.test.ts:852` and `:873` both pin "setting off → a page restore leaves the value removed". `:873` sits outside the describe and rewrites the settings file the describe's `beforeEach` already writes.
- **Tests pinning journal shape rather than behavior:** `trashRecovery.test.ts:899-900` (an `owed()` helper reading `.strip` from `.owed.json`), `:985,993`, and `:1021-1024` (`entry.edit.ids`); `spend.test.ts:1804` ("leaves its owed note keyed by its own address"). These break under consolidation #4 or #5 without any behavior changing. The behavioral assertion each needs is already in the same test (the Try Again outcome).
- **Fixture bloat:** the `TrashDeps` literal appears in about 31 suites. On-disk Nexus seeding is hand-rolled per suite (`trashRecovery.test.ts:73-135`, `finishOwed.test.ts:59-81`); `Core/Testing/testTree.ts` builds in-memory trees only, so there's no shared on-disk builder to reuse *(inferred: whether one is worth adding is a separate call)*.
- **Good pins to keep:** `owed.test.ts:35-80` (compose rules) and `owed.test.ts:175-280` (`runNoted` order) are behavior-level and survive every proposal here.

---
