#### Scout 1 • Delete & Record

Read-only pass at `776f3ea94` on `active`, cleaned against *Trash & Archive Restructure — Investigation* on 10-29-2026 under Decision B-1 through 37. Domain: `Core/Trash/delete.ts`, `Core/Trash/gather.ts`, `Core/Bundles/record.ts`, the mint and write-ahead half of `Core/Bundles/bundle.ts`, `deleteCascade`, and what a delete reaches (the finish's container and Space and Context arms, the property delete). The inventory, the behavior to preserve, and the test notes are this scout's own; every finding is stated once in the Investigation, and this report maps each to it.

**What Moved Since `15fe7422a`:** `delete.ts`, `gather.ts`, `bundle.ts`, `deleteProperty.ts`, `discard.ts`, `reorder.ts`, `configReach.ts`, `keyHolders.ts`, `heldPages.ts`, `placement.ts`, `spend.ts`, `deleteOrder.test.ts`, and `deleteReach.test.ts` are byte-identical; `record.ts` changed one comment line (`:14`); `cascade.ts:94-165` is byte-identical, its changes sitting below `deleteCascade`; `finishOwed.ts` changed its header and one import. A Space or Context delete now runs through `inContextsTurn` (`mutate.ts:135-138`; `settle.ts:268-269`), behavior unchanged. `spend.test.ts` shifted +1 past `:115`. `trashFileFlat`'s tests moved with `atomicWrite.test.ts`'s rewrite and still sit in that suite.

#### 1. Inventory

##### `Core/Trash/delete.ts` (229)

| Symbol | Job | Callers |
|---|---|---|
| `fromArchive` (:41) | Resolves a delete naming an Archive bundle or an inner item of one: opens it, lists its pages at index paths (`under`) and origin paths (`keys`), its Set ids for the view edit, and the record carried on with `archive` added | `deleteOp` :80 |
| `deleteNote` (:63) | Builds a Context's or Space's owed note (`owedDelete` strip + `bundle`) | `deleteOp` :183, :199 |
| `deleteOp` (:76) | The whole delete: resolve, lift set-asides, mint bundle, gather record + `targets`, note, unlist, move, drop order and metadata, finish arm; five inner closures (`write`, `unminted`, `outside`, `leave`, `deleted`) and three kind arms | `mutate.ts:135-138`; renderer through `browser.ts:247-253` |

##### `Core/Trash/gather.ts` (141)

| Symbol | Job | Callers |
|---|---|---|
| `pageRelationsOf` (:25) | Page → page relation rows for `paths`: index, else re-extracted from files | `gatherLinkTargets` :53 |
| `gatherLinkTargets` (:35) | `targets`: each outbound link key under `rel` → `{ id, path }` of the page it resolves to | `deleteOp` :111 |
| `rootsOf` (:61) / `partly` (:70) | Holders → member refs; whether any holder lacked id or values | `gatherSpaceRecord`, `buildContextRecord` |
| `gatherSpaceRecord` (:72) | Space record: sidecar id and icon, parent Context by registry title, `place`, members, `partial` | `deleteOp` :174 |
| `ContextEvidence` (:103) / `gatherContextEvidence` (:110) | Registry entry copy, index, Space ids read from disk, `unresolved` | `deleteOp` :193 |
| `buildContextRecord` (:120) | Context record from evidence + holders | `deleteOp` :196 |

##### `Core/Trash/discard.ts` (47), `trashMode.ts` (4), `handlers.ts` (21)

| Symbol | Job | Callers |
|---|---|---|
| `trashFileFlat` (:10) | Renames a file to `.trash/<chain>/<stamp>__<n>__<name>`, no bundle, no record, no suffix | `discardFile` :41 |
| `TrashDeps` (:22) / `trashDeps` (:27) | Trash Mode + system-trash function from the host context | three handler files; the literal in 35 test files |
| `discardFile` (:36) | Nexus mode → `trashFileFlat`; system mode → `trashToSystem`; then `noteOwn` unlink | `delete.ts:133,135` (system only), `finishOwed.ts:266` (system only), `tilesFile.ts:156`, `assetMigrate.ts:228` |
| `TrashMode` / `DEFAULT_TRASH_MODE` | Renderer-safe leaf type + default | `bridge.ts`, `Contract/handlers.ts`, `confirmations.ts`, `appConfig.ts` |
| `trashHandlers['delete:facts']` (handlers.ts:9) | Trash Mode + Permanently Delete Files for confirmations | `Contract/serve.ts:24` |

##### `Core/Archive/archive.ts` (Departure Half), `archivePlace.ts`

| Symbol | Job | Callers |
|---|---|---|
| `archiveOp` (:33) | Archive a page or Set: store from owning Collection, `filingOf`, lift, `fileInto`, `dropDeparture`, carry on Undo, departing re-spell when filed under another path | `mutate.ts` archive arm |
| `filingOf` (:68) | Undo filing (`back`) through `archiveFiling`, else fresh `gatherContentRecord` | `archiveOp` :44 |
| `collectionArchive` (:139) | A Collection's Archive folder, files, origin paths, and Set ids | `delete.ts:102`, `spend.ts:90` |
| `ARCHIVE_TITLE` / `ARCHIVE_ICON` | Display constants | renderer crumbs, ViewFrame, treeIndex |

##### `Core/Bundles/record.ts` (221)

| Symbol | Job | Callers |
|---|---|---|
| `RECORD_FILENAME` (:15) | `_record.json` | internal |
| `parentRef`, `memberRoot`, `spaceRef`, `strippedLink`, `linkTargets`, `place`, `contentRecord`, `recordFile`, `ArtifactRecord`, `RawRecord` | The schema | the field table below |
| `recordedPartly` (:102) | Restore warning for a `partial` record | `restoreProperty.ts:85`, `spend.ts:292` |
| `writeRecord` / `readRawRecord` / `decodeRecord` / `readRecord` / `patchRecord` (:117-142) | I/O; `patchRecord` discards `rmwJsonStrict`'s `Result` (:141) | delete, deleteProperty, bundle, refile, `finishOwed.ts:405`, `trashedCopies.ts:19`, `archive.ts:75` |
| `placeOf` (:144) | `{ above, below }` sibling ids | `gatherContentRecord`, `gatherSpaceRecord` |
| `trailAbove` (:152) | Container ids above a container | record, `bundle.ts:148`, `refile.ts:56,132` |
| `originOf` / `collectionOf` / `originWithin` / `retrailed` (:160-175) | Origin math on `parent` + `trail` | archive, refile, placement, spend, trashedCopies, bundle |
| `identityOf` (:178) | Page stamped id, or container sidecar id and icon, read from disk | `gatherContentRecord`, `innerRecord` |
| `gatherContentRecord` (:187) | Page, Set, or Collection record: id, icon, parent, place, trail | `delete.ts:207`, `archive.ts:85` |

##### `Core/Bundles/bundle.ts` (Minting and Filing Half)

| Symbol | Job | Callers |
|---|---|---|
| `chainDir` (:51) | `mkdir` of the mirrored chain in a store | `mintBundle`, `trashFileFlat` |
| `mintBundle` (:64) | Atomic `mkdir` of `<stamp>__[n__]<leaf><suffix>`, optionally asking a name back | `delete.ts:99`, `deleteProperty.ts:63`, `fileInto` :103, `Testing/fixtures.ts:52`; each writes a record right after |
| `fileInto` (:87) | File an artifact back at an address or into a fresh bundle: mint → write record → move, bundle removed on throw | `archive.ts:47`, `spend.ts:198`, `moveIntoStore` :131 |
| `moveIntoStore` (:120) | Bundle → another store with raw record + extra | `refile.ts:45,148` |
| `contentPages` (:395) / `pageIdsOf` (:411) | Markdown files of an artifact; their stamped ids | delete, archive, spend, finishOwed, restoreScrub, trashedCopies |

##### What Leaves With the Item

| Symbol | Job | Callers |
|---|---|---|
| `liftSetAside` (`folderEntity.ts:53`) | Excluded folders and the asset dir inside a leaving container stay live, lifted to the parent; returns `rollback` | `delete.ts:91`, `archive.ts:45` |
| `dropDeparture` (`reorder.ts:78`) | Drops the item's id from the order it sat in (a Context: nothing) | `delete.ts:137`, `archive.ts:51`, `move.ts:38,72` |
| `dropPageMetadata` (`pageMetadata.ts:119`) | Drops metadata shard entries for ids no live file holds | `delete.ts:138` (system only), `spend.ts:108`, `exclusionScan.ts:85` |
| `goneContainers` / `goneEdit` / `archivedSetIds` (`configReach.ts:248,254,288`) | The gone edit and the archived Set ids it covers | delete, move, spend, archive, finishOwed |
| `deleteProperty.ts` `snapshot` (:38) | Property record + mint + write | `deleteInner` :101 |
| `propertyHolders` / `deleteKeys` / `deleteInner` / `deletePlan` / `stripProperty` / `unassignAndPurge` (:77-158) | The property delete under the schema lock, its strip, and its per-sidecar purge | `Properties/handlers.ts:18`, `mutate.ts`, `finishOwed.ts:180,185` |
| `unlinkMembers` (`Core/Contexts/contextCascade.ts:100-110`) | A Context's or Space's finish strip, excluding only the live folder (`skipUnder`, :106-107) | `finishContext`, `finishSpace` |

##### Record Fields: Writer → Reader

| Field | Written By | Read By | Verdict |
|---|---|---|---|
| `id` (content) | `gatherContentRecord` :211, `innerRecord` :266 | placement id-live, rows `stored`, refile, trashedHolders, collectionsElsewhere | Earns its place; the recognition key under Decision E-1; stays optional (L-4) |
| `icon` (container, Space) | `gatherContentRecord`, `gatherSpaceRecord` :95, `innerRecord` | `rows.ts:133` only | Copy of the artifact's own sidecar icon |
| `parent` | all artifact builders | placement, rows, `originOf`, `spend.ts:178` | Decides "came from a Collection" (Decision D-4) |
| `place` | `gatherContentRecord` :218, `gatherSpaceRecord` :97 | `placement.ts:280` (`slotOf`) | Contexts use `at` until L-3 |
| `trail` | `gatherContentRecord` :219, `innerRecord`, refile carry | `originOf`, `trailWithin`, refile, archiveFiling | — |
| `archive` | `fromArchive` :59 only | `placement.ts:248-250` only; stripped at `spend.ts:197` | Leaves with M-13 (L-9) |
| `links` | `finishOwed.ts:405`, `parkLinks` :19; spent at `bundle.ts:378` | spend restore :267, `keptLinksUnder`, `emptyBundle` :111 | Recorded ahead under M-17 |
| `targets` | `deleteOp` :116, `innerRecord` :270 | `spend.ts:154` only | Leaves under reach-in (L-10) |
| `partial` (content) | nobody | `rows.ts:147`, `recordedPartly`, stripped at `spend.ts:197`, copied at `bundle.ts:271` | Compatibility-only (L-4) |
| `partial` (Space, Context, property) | `gather.ts:99,139`, `deleteProperty.ts:72` | rows, `recordedPartly` | — |
| `members` (Space) | `gather.ts:98` | `spend.ts:258` | Re-applied by Decision E-4's finish too |
| `registry`, `at`, `membership` (Context) | `buildContextRecord` | `spend.ts:189,245` | `at` leaves for `place` (L-3) |

#### 2. Findings, as the Investigation Holds Them

- **Two Departures and Three Mint Sites:** M-1, with every `mintBundle` caller writing a record right after it, so the primitive is `mintBundle` taking the record; the note-ordering constraint still blocks the delete calling `fileInto` whole.
- **Container Notes, `park`, the Two `leave`s:** M-6, M-8.
- **Sibling Position Three Ways, Two Orders of Contexts:** L-3; *§What's True · Two Orders of Contexts*.
- **Records Re-Reading Disk:** M-4, the content arm's `identityOf` and its name shared with `contextIdentity.ts` included.
- **Undo Carried Two Ways:** M-13 and L-9.
- **Writerless Content `partial`, `at: index.optional()`:** L-4 and L-3.
- **The Empty-Bundle Leak:** B-1, which also follows a throw from the note's own `editNote` inside `runNoted` (`owed.ts:256`).
- **The Record Landing Twice Around the Strip:** B-10 and M-17.
- **OP-4's Post-Sweep Parse:** M-17 removes the loop for the delete.
- **Guards After the Mint:** L-7 (the Space guard); the Context guard can fire.
- **`nexusPages` Calls:** a Space or Context delete calls it twice (`gather.ts:42`, `keyHolders.ts:106`), not three times; once under reach-in. The Space and Context finishes call `findHolders` without `read` (`contextCascade.ts:106`).
- **`fromArchive`'s Two Path Lists:** under reach-in only `keys` has a reader, so `under` leaves (L-10).
- **The Twin Guard Under Reach-In:** `addressable` passes a trashed twin of a live id; *§The Trash's Model · §The Rules*, 2 (the pass-over).
- **The Own-Bundle Exclusion:** *§The Rules*, 6, with `unlinkMembers`' `skipUnder` the same gap once the stored-Space source lands.
- **Per-File Landings Beside the Grouped Strip:** the property purge's per-sidecar `patchSidecar` and the configuration pass's strict edits; LD-9 and *§Approaches Worth Weighing*, 2.
- **`links` Already by ID:** `deleteCascade` files each value under `rootId(file, raw)` as `{ page: id, … }` (`cascade.ts:145-147`), so reach-in adds no recording code; the delete's own addition is the exclusion.

#### 3. Behavior to Preserve

| Behavior | Pinned By |
|---|---|
| The record lands before the artifact moves; for a Space or Context, before the strip as well | `deleteOrder.test.ts:149-216` |
| The strip and the configuration pass run after the move | `deleteOrder.test.ts:230-257` |
| A move that throws deletes nothing and leaves no bundle; a refused note or list step removes the bundle and rolls back the lift | `deleteOrder.test.ts:289-303`, `deleteReach.test.ts:566-636`, `archive.test.ts:184-242,283` |
| A move that throws after `moved` rethrows; a Context entry that can't go back stays owed and Try Again moves its folder | `deleteReach.test.ts:578,608,652` |
| A crash between note and strip or move finishes at the next open | `deleteReach.test.ts:808-895` |
| A Collection delete leaves its Archive owned, and emptying it takes the Archive | `deleteReach.test.ts:458-488`; `spend.test.ts:1895+` |
| A Space or Context delete holds the Contexts lock; an Archive restore doesn't | `mutate.ts:135-138,154-156`, `archive.test.ts:735` |
| `bundled.bundlePath` drives Undo; a delete from the Archive is undone into the Archive under the same name, its Link values back | `archive.test.ts:938-1094` |
| Archive Undo through `back`; step-aside naming; a fresh stamp when the name is taken | `archive.test.ts:245,473-656,1067-1082` |
| A page waits out a save in flight before trashing | `deleteOrder.test.ts:305` |
| `place` restores between siblings | `spend.test.ts:213-298` |
| Records stay stable under Finder litter and colliding stamps | `spend.test.ts:568-685` |
| Excluded folders lift out and come back on rollback | `archive.test.ts:166-242` |
| Two linkers sharing one ID are left untouched | `deleteReach.test.ts:133` |
| A Set's own delete leaves its trashed sidecar byte-identical; the strip's live-path exclusion | `deleteReach.test.ts:315,346` |

#### 4. Tests

- **Duplicated:** `deleteOrder.test.ts:149` and `:159` run the same page delete and inspect the same `atSettle`; they merge into one case. `spend.test.ts:125-261` and `deleteOrder.test.ts:148-216` both assert page, Space, and Context record shape (content against timing).
- **Pinning Residue:** content `partial`'s absence (`deleteOrder.test.ts:168,174,215`; `deleteReach.test.ts:800`), the pre-`at` decode (`spend.test.ts:314`), and the retired `.provenance.json` format (`spend.test.ts:685`).
- **Pinning Implementation:** `deleteOrder.test.ts:43-95` observes ordering through four `vi.mock`s of named collaborators (`relocate`, `deleteCascade`, `unlinkSpaceValue`/`unlinkContextKey`, `reachConfig`), so renaming or merging any of them breaks the harness without breaking the behavior; a seam at `relocate` alone would pin write-ahead. `spend.test.ts:391` round-trips `writeRecord`/`readRecord`.
- **Misfiled:** delete-record tests in the restore suite (`spend.test.ts:124-701`, about 30 cases); a delete test inside the archive describe (`archive.test.ts:227`); `trashFileFlat`'s tests in `Files/atomicWrite.test.ts`.
- **Gaps:** B-1's bundle; B-10's crash window; the own-bundle exclusion beside `deleteReach.test.ts:315,346`; the pass-over beside `:133`.
