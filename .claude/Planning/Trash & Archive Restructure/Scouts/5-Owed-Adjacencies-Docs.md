#### Scout 5 — Owed Work, Adjacencies, Views & Documentation

**Base:** `active` at `776f3ea94`, read-only; cleaned against *Trash & Archive Restructure — Investigation* on 10-29-2026 under Decision B-1 through 37 and *Write Path — Implementation Plan · §Open Items*. The inventory, the views analysis, the property-side analysis, the behavior to preserve, and the test notes are this scout's own; every finding, and the documentation and issue audit, is stated once in the Investigation, and this report maps each to it. *Inferred* marks what wasn't read directly.

**What Moved Since `15fe7422a`:** `configReach.ts`, `delete.ts`, `spend.ts`, `discard.ts`, `trashedCopies.ts`, `bundle.ts`, `assignment.ts`, `deleteProperty.ts`, `unassignProperty.ts`, `restoreProperty.ts`, and `pageMetadata.ts` are byte-identical. `finishOwed.ts:1` was rewritten for the Context and Space entries' new turn and still omits the relink entries the settle's turn runs (`:93`); `finishOwed.ts:86` uses `inContextsTurn`. `owed.ts` renamed `Landing` to `NameLanding` (`:60`). `fileEvents.ts`' `Owed` is `:97`. `relocate` is `atomicWrite.ts:138`, `setAside` `:308-311`, `Machine.trashToSystem?`/`lock`/`remove` `machine.ts:59-67`, `shell.trashItem`'s install `main.ts:75`, `trashModeOf`'s use `main.ts:304`. `fileRewrites`' text arm reads `page.raw` (`cascade.ts:200-203`). The `TrashDeps` literal is in 35 test files and `trashToSystem` is stubbed in 32, the Write Path's tests adding one of each. I-064's solution cites Decision E-1 (`IssuesPM.md:927-939`).

### 1. Inventory

##### `Core/Nexus/owed.ts` (269 Lines): the On-Disk Journal `.nexus/.owed.json`

| Symbol | Job | Callers |
| --- | --- | --- |
| `Owed` (`:15`) | `rename`/`strip`/`kept` name lists | every entry type; shares its name with `fileEvents.ts:97` |
| `PropertyEntry` (`:16-20`) | Property renames and strips + `options` + `collections` | Properties ops, `finishProperty`, `emptyBundle` (`spend.ts:79`) |
| `ContextEntry` (`:21`) / `SpaceEntry` (`:22`) | Title renames and strips + `bundle` | `deleteNote`, `contextCascade.ts`, `finishContext`/`finishSpace` |
| `ContainerEntry` (`:23-31`) | `at`, `strip`, `edit`, `within`, `bundle`, `park` | writers `delete.ts:211-217`, `spend.ts:95-104`, `move.ts:79`; readers `finishContainer`, `spendBundle` (`bundle.ts:383-392`) |
| `Worked`, `workedOut` (`:32-41`) | Per-file values a restore couldn't write | `restoreScrub.ts:209-212`, `trashedCopies.ts:112`, `oweWorked` |
| `RelinkEntry` (`:42-49`) | Re-spell maps + scoped repair + `values` (`:48`) | `settle.ts`, `cascade.ts:325`, `restoreScrub.ts:226` |
| `readNotes` (`:72`), `distinct` (`:76`) | Reads the journal; dedupe-or-undefined | seven files; owed, delete, spend, bundle, assignment, unassign |
| `relinkNote` / `followRelinks` (`:91-126`) | Compose re-spells | `settle.ts:307`, `contextCascade.ts` |
| `editNote` (`:132-153`) | Locked read-modify-write of one entry | `finishOwed`, `spend.ts:79`, `bundle.ts:388` |
| `owedName` (`:186-201`) | Landing refusal on owed names | contextWrite, optionOps, registryProperty, `spend.ts:185` |
| `restoreNote` (`:204-211`) | H-4: a restore converts `strip` → `rename` and clears `bundle` | `spend.ts:210`, `restoreProperty.ts:47` |
| `oweWorked` (`:224-240`) | Writes restore leftovers into a relink entry | `spend.ts:289` only |
| `runNoted` (`:242-269`) | Note → list → sweep → settle; its `editNote` can throw (`:256`) | nine files, `delete.ts:147` among them |

##### `Core/Nexus/finishOwed.ts` (417 Lines): the Finishing Pass

| Symbol | Job | Callers |
| --- | --- | --- |
| `finishOwed` (`:73-96`) | Open and Try Again pass, by kind under each kind's lock (`inContextsTurn` at `:86`) | `Nexus/handlers.ts:108`, `mutate.ts` |
| `finishEntry` (`:99-106`), `finishArm` (`:108-130`) | One entry inside its caller's lock; the switch over kinds (the relink arm's `values` at `:126`) | `delete.ts:160`, `spend.ts:85,113` |
| `finishProperty` (`:149-210`) | Property arm; its gone-definition branch reaches the Trash (`:164-186`), with `held(key)` (`:162-166`) | `finishArm` |
| `leave` (`:259-268`) | Context or Space folder → bundle, or `discardFile` | `finishContext:318`, `finishSpace:347` |
| `finishContext` (`:270-327`), `finishSpace` (`:329-374`) | Context and Space arms; the Context arm drops order when `!bundle` (`:324-325`) | `finishArm` |
| `finishContainer` (`:376-417`) | Delete, empty, and Set-move arm; the Archive walk in `owedEdit` (`:386-400`); `deleteCascade` with the live `e.at` (`:402`); links → `bundle` record or `parkLinks` (`:403-409`) | `finishArm` |

##### `Core/Nexus/mutate.ts` Dispatch

- `delete` (`:135-138`): `deleteOp` in the settle's turn, `inContextsTurn` for a Space or Context (`:137`).
- `archive`: `archiveOp` in the settle's turn.
- `restore` (`:144-157`): resolves the store twice (`openBundle` `:148`, `bundleAddressOf` `:154`); a Trash restore always takes `inContextsTurn` (`:156`), a page's included.
- `emptyBundle` (`:159-163`): the settle's turn only; its property arm takes the schema lock itself (`spend.ts:85`).

##### Adjacent Machinery

| Symbol | Job | Callers |
| --- | --- | --- |
| `dropPageMetadata` (`pageMetadata.ts:119-134`) | Drops metadata for ids no live page holds, batched by shard | `delete.ts:138` (system only), `spend.ts:108`, `exclusionScan.ts:85` |
| `pageIdsOf` (`bundle.ts:411-414`) | Ids from files, where `archivedPageIds` takes them from the index | `delete.ts:108`, `spend.ts:92` |
| `archiveHistoryDays` (`personalization.ts:190`, bound `:262`) | Archive snapshot timeframe | `settings.ts:90` → `sweepFileHistory`, re-run on change (`Settings/handlers.ts:47`); trashed pages follow `historyDays` |
| `liftSetAside` (`folderEntity.ts:53-88`), `landingRefusal` (`folderEntity.ts:21-29`) | Lifts excluded and asset folders out of a departing container; refuses landing on a set-aside name | `delete.ts:91`, `archive.ts:45`; create, move, rename, `placement.ts:171` |
| `dropDeparture` (`reorder.ts:78-109`), `dropContextOrder` (`reorder.ts:53-60`) | Drops a departing id from its order (a Context keeps its panel id, comment `:77`); drops a gone Context's panel id and Space order | delete, archive, move; `finishOwed.ts:325`, `spend.ts:109` |
| `discardFile`, `trashFileFlat`, `TrashDeps`, `trashDeps` (`Trash/discard.ts`) | Trash Mode routing; the record-less stamped drop | delete, finishOwed `leave`, tiles, assets |
| `Machine.trashToSystem?`, `lock`, `remove` (`machine.ts:59-67`) | Host seam | `main.ts:75` installs `shell.trashItem`; `setAside` calls it directly (`atomicWrite.ts:309`); `spend.ts:72` calls `remove` |
| `relocate` (`atomicWrite.ts:138`) | Move under the source's lock | everywhere a bundle fills or empties |
| `owningCollection` (`treePatch.ts:110-119`) | Owner by path or the Archive's filed id; none for `.trash/…` | `refillStash`'s members (`assignment.ts:43`), `stashAndStrip` (`unassignProperty.ts:73`), the repair sweep (`repairSweep.ts:20`), the configuration pass's scope |

### 2. Decision D-3's Design

**What the Pass Reaches, the Deciding Fact, the Callers:** *Investigation · §What's True · Saved Views*.

**Option A, the Pass Reaches the Trash's Sidecars (Taken):** `archivedSets` (`configReach.ts:297-304`) becomes one walk of stored container sidecars over both stores; `setSidecarsUnder` (`:284-285`) admits the Collection sidecar as well as the Set's, taking the kind from the filename (`SIDECAR_FILENAME`, `nexusPaths.ts:59`); the Archive holds no Collection sidecars, so admitting both names changes nothing there. The loop at `:339-347` is unchanged, own-gone skip included. It needs M-16's admission, which also keeps Decision C-2's flat leftovers out. Scoped parity takes the trashed bundles originating within the scope by record (`originWithin`, `record.ts:168-169`), M-9's reader. Cost: one directory read per Trash folder per unscoped pass (chain, bundle, and artifact folders), the order the Archive already pays, unmeasured; a filter refusing a `.md.<suffix>` stamped segment cuts it to container bundles and chains (about +2, *Investigation · §Approaches Worth Weighing*, 7). The walk that finds trashed Collection sidecars is also the listing the gone-for-good assignment purge needs (`collectionFolders` reads the tree only). About +6 to +10 unscoped, +5 to +10 more for scoped parity (the Investigation counts +8 and +3 with M-9 carrying the reader).

**Option B, a Restore Reconciles a Returning Container's Views (Not Taken):** after a Trash restore lands a Collection or Set, collect the ids its sidecars' views name (property ids across `idList`, `idMap`, `rules`, `criteria`, `group`, `subGroup`, and `bandKeys`; option ids through `bandKey` and rule operands; container ids through `setIds` and Location operands), and clear the ones the world lacks through `propertyClear` (`:189`) or `goneContainers` (`:248-252`). About +30 to +45, needing a third per-role table beside `CLEAR` and `GONE` (`:145-173`) that every new `Role` keeps in step. Its semantics differ from live in two edges: a property deleted and restored while the Collection sat in the Trash keeps its columns, where a live Collection loses them, and an unassign isn't seen, since the property still exists. It leaves one Collection's views on two models and a resolve-on-restore model for views beside reach-in for pages.

### 3. The Property Side

**The Trashed Collection's Assignment:** two shapes were weighed. **(a)** Purged at the delete, recorded in the property's record, and re-assigned by its restore into the trashed Collection: about +15 to +25, removing the gone-for-good purge and the empty's property strip (about −22), and needing `restoreProperty` and `assignInner` to reach trashed Collections (`restoreProperty.ts:51,53-68` re-assigns from `tree.collections`; `assignment.ts:91-92` refuses a folder the tree can't place; `finishOwed.ts:196-199` drops a Collection the tree lacks). **(b)** Kept until the property is gone for good, as today: about −8, keeping the empty's property arm and a trashed-Collection listing, and matching Decision C-6's "it still holds configuration worth recovering, its schema". The Investigation takes (b); under both, the views follow Decision D-3.

**What Leaves Under (b):** `finishProperty`'s trashed-page listing (`finishOwed.ts:166-175,181-184`), `refillStash`'s splice (`assignment.ts:48-61`), and `originPagesIn` (`bundle.ts:416-426`), with `trashedHolders` and `refillTrashed` under L-10.

### 4. Findings, as the Investigation Holds Them

- **`ContainerEntry` as Three Operations, Three Keyings, `park`:** M-6.
- **`spendBundle` Editing Journal Entries:** P-5.
- **Both Stores Write Relink Entries:** *§What's True · Owed Work*.
- **Two `Owed` Types:** noted in *§What's True*; outside this surface.
- **The Two `leave`s, "Gone for Good" Twice, `TrashDeps` Re-Wrapping the Seam:** M-8, M-7, L-2 (the `setAside` precedent decides its shape).
- **B-2, B-3, B-5, B-7:** B-3 dissolves only once the stored-Space source lands.
- **`frozenWorld(linkWorld(...))` Four Times:** M-12.
- **The `Worked` Machinery Outliving Its Producers:** L-10 (Decision D-5).
- **The Property Purge Split by Store, One Collection on Two Models:** *§The Trash's Model · §The Rules*, 10, and *§Added*.
- **`owningCollection` Can't Place a Stored Trash Path:** M-9.
- **`pageIdsOf` Reading Files:** under reach-in the empty's ids are index rows, as `archivedPageIds`' are (about ±0, inferred).
- **Two Retentions for Two Hidden, Indexed Stores:** *§The Rules*, 12; changing it is feature-level.
- **`unassignProperty` Clearing Views Twice:** M-18.
- **Condition 2 in `finishContainer`:** *§The Rules*, 6.
- **The Watcher Row's Exemption Outside Sync's Code:** *§The Rules*, 5; `manifestAdmits` is read by `push.ts` and `reconcile.ts`, so changing it would bear on Sync, while `syncIgnoredUnder` lives in `Desktop/FileWatch`.
- **Documents and Issues:** *§What Becomes False*, `CorePM.md:148` among L-1's lines and `CorePM.md:74`, `ContextsPM.md:25`, and `CollectionsPM.md:49` among reach-in's.
- **Placements:** P-12 (`discard.ts`), P-2 (`trashedCopies.ts`), P-11 (the hand-moved finish's home).

### 5. Behavior to Preserve

| Behavior | Pinned By |
| --- | --- |
| A delete strips Link values naming the page (live and Archive), the record keeps them, and a restore re-adds them while Restore Links On Deletion is on | `trashRecovery.test.ts:442,531,874`; `deleteReach.test.ts:111,346` |
| Body links read phantom, then are repaired on restore | `spend.test.ts:1029-1350` |
| Emptying strips values taken up since and parks with a trashed namesake | `trashRecovery.test.ts:701,742,749,775` |
| A property gone for good leaves trashed Collections (and today trashed pages) | `spend.test.ts:2571-2660` |
| Write-ahead: a crash between note and list step finishes at open; a failed move deletes nothing | `deleteReach.test.ts:490-732,808,829`; `finishOwed.test.ts:223` |
| A Collection gone for good takes its Archive and the views naming its Sets | `deleteReach.test.ts:458,472`; `spend.test.ts:1951`; `trashRecovery.test.ts:1051` |
| An inner item pulled out releases its share of the owed strip | `trashRecovery.test.ts:986-1010`; `spend.test.ts:1805` |
| H-4: a restore converts the owed strip into renames | `owed.test.ts:159` |
| `owedName` refuses a landing on another item's owed title | `owed.test.ts:139`; `spend.test.ts:2533` |
| Archived and pulled Sets keep their views through an owed gone edit | `trashRecovery.test.ts:1012-1060` |
| The journal is neither watched nor synced | `owed.test.ts:133` |

### 6. Tests

- **`finishOwed.test.ts` Has No Container-Arm Case:** the arm is pinned in `deleteReach.test.ts` (4), `trashRecovery.test.ts` (7), and `spend.test.ts` (15).
- **Overlap:** `trashRecovery.test.ts:853` and `:874` both pin a restore with the setting off; `:874` sits outside the describe and rewrites the settings file its `beforeEach` already writes.
- **Journal-Shape Pins:** `trashRecovery.test.ts:899-900` (an `owed()` helper reading `.strip`), `:996,1003`, `:1021-1025` (`entry.edit`), and `spend.test.ts:1805`; they break under M-6 and P-5 without any behavior changing, and the behavioral assertion each needs is already in the same test.
- **Leave or Are Rewritten Under Reach-In:** `spend.test.ts:2571-2670` narrows to the trashed Collection's purge; `:2624-2659` (B-3's coverage today) moves to the delete; `:2660` inverts (Decision D-4); `restoreScrub.test.ts:194` expects `unrestored` (Decision D-5); `trashRecovery.test.ts:1012-1060` gains a trashed-sidecar case.
- **System Mode and `TrashDeps`:** the 25 lines L-1 lists, `spend.test.ts:299-360`, and `finishOwed.test.ts:762`; 35 literals and 32 stubs, the empty's two cases switching to an installed machine.
- **Good Pins to Keep:** `owed.test.ts:35-80` (compose rules) and `:175-280` (`runNoted` order).
- **Gaps:** B-3 under the stored-Space source; condition 2 in `finishContainer` beside `deleteReach.test.ts:315,346`; the configuration pass over a trashed Collection; the trashed Collection's assignment round trip (property delete, restore, then Collection restore).
