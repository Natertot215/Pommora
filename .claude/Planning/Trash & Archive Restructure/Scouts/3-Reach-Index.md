### Scout 3 — Reach, the Index, Paths, Filing, and the Change-Time Identity

**HEAD:** `776f3ea94` on `active`, read-only; cleaned against *Trash & Archive Restructure — Investigation* on 10-29-2026 under Decision B-1 through 37. This report also holds the Archive's filing, layout, and store shape. The inventory, the probe, the behavior to preserve, and the test notes are this scout's own; every finding is stated once in the Investigation, and this report maps each to it. The APFS behavior was probed with a throwaway Node script outside the repo, since removed.

**What Moved Since `15fe7422a`:** `Desktop/Store/*`, `Core/Index/contentIndex.ts`, `Core/Index/keyHolders.ts`, `Core/Nexus/heldPages.ts`, `Core/Files/walk.ts`, `Core/Matrix/*`, `Core/Bundles/layout.ts`, `Core/Paths/nexusPaths.ts`, `Core/Nexus/treePatch.ts`, `Core/Nexus/configReach.ts`, `Core/Archive/refile.ts`, and `Core/Trash/trashedCopies.ts` are unchanged. `exclusion.ts` lost `TEMP_SUFFIX` and `manifestAdmits`' `siblings` parameter (the Write Path's Deviation D-3), moving its lines; `indexSeed.ts` was rewritten (batched commits, a per-path commit sequence, reads handed to the tree patch); every sweep runs on `rewriteHeld`; `Core/Platform/machine.ts` gained `Landing`, `land`, `sameFile`, `fileStat`, and `statOrNull` (`:14-85`). R-1's `unlessVouched` and R-2's `HolderQuery.every` were withdrawn by the Write Path's Deviation D-2 and don't exist at HEAD.

#### 1. Inventory

##### Paths and Admission

| Symbol | Where | Job | Callers |
|---|---|---|---|
| `NEXUS_DIR`, `TRASH_DIR`, `ARCHIVE_DIR_REL` | `Core/Paths/nexusPaths.ts:3-7` | The dotted roots | Widespread |
| `ArchiveStore` | `nexusPaths.ts:9` | `{ kind: 'archive', id }` | `layout.ts:10`, `archive.ts:73`, `placement.ts:193`, `names.ts:20` |
| `archiveDirRel` | `nexusPaths.ts:11` | One Collection's Archive dir | `layout.ts:17`, `archive.ts:145`, `refile.ts:150`, `finishOwed.ts:397`, `treePatch.ts:125` |
| `archiveSegs` | `nexusPaths.ts:13-14` | Segments below `.nexus/archive`, or null | `nexusPaths.ts:17`, `exclusion.ts:65` |
| `archivedCollectionIdOf` | `nexusPaths.ts:16-17` | The Collection id an Archive path is filed under | `layout.ts:45`, `heldPages.ts:78`, `treePatch.ts:116`, `nexusPaths.ts:19` |
| `isArchived` | `nexusPaths.ts:19` | Whether a rel path lies in the Archive | `matrixGraph.ts:26`, `Nexus/handlers.ts:169`, `governedSweep.ts:81`, `delete.ts:42` |
| `archiveStoreOf` | `Core/Paths/names.ts:20-21` | A Collection id → `ArchiveStore` when it can name a folder | seven production call sites |
| `hiddenName` / `hiddenFolder` | `exclusion.ts:8-15` | Leading `.` or `_`, plus `node_modules` | Walks, bundle listing, `classifyEvent` |
| `neverWatched` | `exclusion.ts:18-27` | The watcher's ignore rule: `.nexus` exempt, everything else dotted hidden | `watcher.ts:63-64`, `manifestAdmits`, `adoptFile.ts:24`, `assetMap.ts:14` |
| `manifestAdmits` | `exclusion.ts:35-47` | Sync's admission rule; admits `.trash` by judging what's below it (`:42`) | `Sync/Client/push.ts`, `reconcile.ts`, `tap.ts` |
| `outsideContent` | `exclusion.ts:63-68` | What keeps a rel out of content: hidden (judged below `.nexus/archive` for an Archive path, `:65`), asset, or excluded | Corpus walk, index (`relCorpusPath`, `indexSeed.ts:78-82`), tree, `listInner` (`bundle.ts:334`), `fileEvents.ts`, `exclusionScan.ts:46-47` |
| `syncIgnoredUnder` | `Desktop/FileWatch/watcher.ts:55-66` | chokidar's ignore filter, built on `neverWatched` | `watcher.ts:101` |
| Sync tap `.trash` drop | `Core/Sync/Client/tap.ts:50` | Drops watched events under `.trash` | `installTap` |

##### Walks

| Symbol | Where | Job | Callers |
|---|---|---|---|
| `contentRoots` | `walk.ts:43` | `[root, root/.nexus/archive]` | `corpusFiles`, `sidecarsUnder` |
| `corpusFiles` / `corpusFilesUnder` | `walk.ts:45-49,79-89` | Content pages under both roots, or one dir, by `outsideContent` | `nexusCorpus`, `assetMigrate.ts:135`, `heldPages.ts:100`, `indexSeed.ts` |
| `listMarkdownFiles` | `walk.ts:33-40` | Pages under a bundle's artifact, by `hiddenFolder` only | `contentPages`, `collectionArchive`, `keptLinksUnder` |
| `listPathsUnder` | `walk.ts:62-70` | The hand-descended walker; passes a folder's `siblings`, not its children | `walk.ts`, `restoreScrub.ts:134`, `exclusionScan.ts:43-44` |
| `sidecarsUnder` | `walk.ts:91-104` | Sidecars under both roots or one dir; its directory filter is `outsideContent` (`:97-100`) | `configReach.ts:285`, `assetMigrate.ts:117` |
| `nexusCorpus` | `indexSeed.ts:73-75` | `corpusFiles` with the read scope | the seed, `pagesInReach`'s fallback (`keyHolders.ts:50`), `renameCascade`'s fallback (`cascade.ts:241`) |

##### The Index

| Symbol | Where | Job | Notes |
|---|---|---|---|
| `contentIndexStore` | `Desktop/Store/stores.ts:58-183` | SQLite rows by path; knows nothing of either store | through `Core/Index/contentIndex.ts` |
| `queryMentions` / `queryMembers` / `queryKeyHolders` | `contentIndex.ts:66-83` | Paths whose relations name keys; paths holding a key | `deleteCascade`, `renameCascade`, `findHolders` |
| `readHeadings` / `readPageRelations` / `readIndexedStats(under)` | `contentIndex.ts:70-95` | Outlines; rows + values; stat + ID per path under a prefix | `index:headings` (`handlers.ts:167-170`), `matrixGraph.ts:20`, `keyHolders.ts:120`, `gather.ts:26`, `optionOps.ts:146` (tree-scoped), `archivedPageIds` |
| Seed | `indexSeed.ts:259-310` | Stats the corpus every open, re-reads what changed, prunes what vanished (`:301-303`); a cold seed answers `NO_REREAD` (`:305`) | batches of `INDEX_BATCH` = 200 (`:40`) |
| `describes` | `indexSeed.ts:110-112` | The seed's skip: modification time and size, without birth | used at `:288` |
| `commit` / `unmoved` | `indexSeed.ts:114-133` | Per-path commit sequence for the in-flight check (Deviation D-2) | no stat takes part |
| `indexWrittenPages` / `deindexPath` / `moveIndexPaths` | `indexSeed.ts:139-189,215-223,225-249` | Per-event maintenance; a move into a non-corpus target de-indexes (`:228-231`), a move with no old corpus path indexes without the read (`:232-238`), a corpus-to-corpus move renames rows by prefix (`:240-247`) and re-reads the moved page (`:248`) | through `indexEvent` (`fileEvents.ts:292`) |

##### The Stored Projection (`Core/Nexus/heldPages.ts`)

| Symbol | Line | Job | Callers |
|---|---|---|---|
| `claim` | `:18-20` | Sets an id, or nulls one two files claim | `entitiesById`, `nexusPages` |
| `entitiesById`, `writablePathsOf`, `liveIdIndex`, `liveIdOf`, `livePathOf`, `idHeld` | `:23-52` | Live-tree id ↔ path for writers | writers, `settle.ts`, `fileHistory.ts:200` |
| `NexusPages`, `addressable`, `shownTitle` | `:55-71` | `byId` and `archived`; whether `byId` addresses one file (unique, non-null) | `cascade.ts:133`, `keyHolders.ts:125`, `governedSweep.ts`, `spend.ts:299`, `restoreProperty.ts:86` |
| `nexusPages` | `:73-85` | Builds `NexusPages`, nine production calls | `archive.ts:98`, `Bundles/handlers.ts:27,37`, `keyHolders.ts:106`, `cascade.ts:107`, `assignment.ts:39`, `gather.ts:42`, `restoreProperty.ts:69`, `spend.ts:140` |
| `linkWorld` | `:88-92` | Tree pages + archived at their origins (+ extras) | `assignment.ts:62`, `restoreProperty.ts:70`, `spend.ts:155,272` |
| `archivedPageIds` | `:94-103` | Archive stats from the index; walks and reads every archived file before it's ready | `nexusPages`, `fileHistory.ts:200` |

##### Reach Scoping and Display

| Symbol | Where | Job | Callers |
|---|---|---|---|
| `archiveReach` | `treePatch.ts:122-126` | Archive dirs a reach covers | `pagesInReach` (`keyHolders.ts:53`), `archivedSets` (`configReach.ts:298`) |
| `owningCollection` | `treePatch.ts:110-119` | Owner by path, or by the Archive's filed id; none for `.trash/…` | schema lookups, `refillStash`, `archiveOp`, `containerSchema` |
| `pagesInReach` / `spaceFiles` / `findHolders` | `keyHolders.ts:44-59,69-75,79-136` | Pages in Collections + Archive; Spaces from the tree; with `read`, values by id through `nexusPages` | property, option, and Context cascades; deletes |
| `outsideArchive` / `collectionFolders` / `sweepCount` | `governedSweep.ts:79-81,43-47,87-90` | One-line `isArchived` wrapper; live + damaged Collection folders; the count hide | `cascade.ts:156,276`, `governedSweep.ts:88`, `registryProperty.ts:179` |
| `readMatrixGraph` / `index:headings` | `matrixGraph.ts:19-43`; `Nexus/handlers.ts:167-170` | Drop archived rows (`:26`, `:169`) | matrix, renderer |
| Link suggestions | `Core/Session/pageConnections.ts:30` | `pageIndexOf(tree)`: no stored page, no store code | editor |
| `sweepFileHistory` | `Core/Pages/fileHistory.ts:195-210` | Archive retention via `archivedPageIds` | open, settings |

##### The Archive's Filing (`Core/Archive/refile.ts`, 153 Lines)

| Symbol | Job | Callers |
|---|---|---|
| `refile` (`:34`) | Writes `trail` to a record; on a Collection change moves the bundle into `to`'s ID folder through `moveIntoStore` | `refileArchived` `:61`, `settleArchives` `:134` |
| `refileArchived` (`:50`) | For each record within a Set in `from`'s Archive, computes the new trail (`held ?? retrailed(...)`) and refiles it | the three triggers |
| `carried` (`:66`) | Swallows and logs a carry's failure, leaving the fix to the next open | the three triggers |
| `refileLanded` (`:75`) / `refileFiled` (`:89`) / `refileMoved` (`:102`) | Restore, Undo, and settle triggers; `refileMoved` walks the push delta (`settle.ts:192`) and carries Archive records only | `archive.ts:121`, `spend.ts:297`; `archive.ts:54`; `settle.ts` |
| `settleArchives` (`:125`) | Open pass: re-files every record in every live Archive; moves an orphaned ID folder's bundles into `.trash` | `Nexus/handlers.ts:98` |

##### The Layout (`Core/Bundles/layout.ts`, 64 Lines) and Filing Half of `bundle.ts`

| Symbol | Job | Callers |
|---|---|---|
| `BundleStore` (`:10`), `layoutOf` (`:12`) | `{ trash } \| { archive, id }`; store → `{ dir, suffix }` | Bundles, `bridge.ts:199`, `placement.ts:212-213`, `rows.ts:49` |
| `fileStamp` / `storedAtOf` / `stampedLeaf` (`:21`/`:25`/`:32`) | Stamp mint, parse, and leaf spelling | mintBundle, discard, rows (`rows.ts:91,99,168`) |
| `stampedSegment` (`:36`), `bundleAddressOf` (`:40`), `originPathOf` (`:59`) | The bundle segment; path → bundle, store, inner item; store path → origin (pure; 14 production call sites, 11 Archive-capable) | bundle, placement, mutate, heldPages, archive, delete, spend |
| `moveIntoStore` (`bundle.ts:120`) | Moves a bundle between stores or ID folders | `refile.ts:45,148`; every caller exists because of the ID level |
| `listBundles` (`bundle.ts:153`), `archivedWithin` (`:142`) | A store's suffixed folders with a readable record; records within a Set in an Archive | refile, handlers, finishOwed, trashedCopies, `collectionsElsewhere`, `move.ts:62` |
| `collectionsElsewhere` / `archiveOwned` (`bundle.ts:179`/`:193`) | Collections in unheld root folders or the Trash; whether an Archive's Collection still answers | `refile.ts:145`, `placement.ts:206`, `finishOwed.ts:395` |
| `archiveFiling` (`placement.ts:188`) | The Archive an Undo files into, re-rooted (`:211-214`) and re-trailed (`:216-225`) | `archive.ts:78`, `placement.ts:250` |

#### 2. The Change-Time Identity, Site by Site

| Site | What It Does | Under `ctimeMs` |
|---|---|---|
| `FileStat` (`machine.ts:2-7`) | size, mtime, birth, isDirectory | +1 field |
| `fileStat` (`machine.ts:31-42`) | host stat → `FileStat`, shared by `nodeMachine` and `diskMachine` | +2 |
| `sameFile` (`machine.ts:22-29`) | (mtime, size, birth): `land`'s `expect` (`nodeMachine.ts:77`; `Core/Testing/machines.ts:97,159`) and the walk cache (`walkCache.ts:43`) | birth swaps for ctime; its APFS-birth caveat goes |
| `IndexedStat` (`Core/Platform/stores.ts:30-35`), rows (`indexSeed.ts:182,295`) | `{ mtimeMs, size, id? }` | gain ctime |
| `describes` (`indexSeed.ts:110-112`) | the seed's skip, without birth | becomes `sameFile`'s identity (−3) |
| SQLite store (`ddl.ts:41-45`; `stores.ts:46-52,69-71,82`) | `indexed_files(mtime_ms, size)` | +1 column, about +3 |
| `memoryStores.ts:82-85,105` | test store | +2 |
| `unmoved` (`indexSeed.ts:130-133`) | commit sequence | stays |
| `RACY_WINDOW` (`walkCache.ts:3-4,43`) | mtime granularity on coarse volumes | stays; ctime granularity there unverifiable |
| Sync's sweep (`Core/Sync/Client/push.ts:202`) | `(floor(mtime), size)` | stays under Decision B-1 |

**Machines:** three, installed through `installMachine` (`Desktop/main.ts:75`, `Desktop/vitest.setup.ts:5`, `Core/vitest.setup.ts:7`). `nodeMachine`'s commit answers `handle.stat()` taken before `chmod` (`nodeMachine.ts:79-81`) and before the rename (`:83-84`); `diskMachine` already answers `stat(path)` after the rename (`machines.ts:170`); `memoryMachine` has no ctime and needs a clock bumped on `land` (`machines.ts:100`) and `rename` (`:123-128`), plus the field in `entryStat` and the directory stat (`:81-86,108`), about +4.

**Probe (APFS, Node):** a file rename moves its ctime and keeps its mtime; a parent folder's rename leaves its children's ctime alone; the landing's pre-rename handle stat differs from the stat after; an `fstat` of a handle still open after the rename equals the path stat after it; `chmod` moves ctime. Windows (NTFS `ChangeTime`) and exFAT are unverifiable here. Two options for the post-rename answer: an `fstat` of the still-open handle (race-free; Windows rename-with-open-handle unverified), or a path stat after the rename (one syscall, with a window where another writer's stat could be answered); the Investigation's LD-1 takes the path stat, a file removed in that window rejecting as a race.

**Guards Whose Cause the Change Time Removes:** `fileEvents.ts:395-396` (the watched edit's `forgetParse`, "can keep the time, size, and birth", −2); `atomicWrite.ts:27` (kept-time `forgetParse`, −1); `atomicWrite.ts:134` (`landBytes`' `forgetParse`, −1); `Core/Testing/hostFs.ts:52` (`raceLandings`' "`outside` differs in length", test only), each on volumes where the change time is real.

**R-1 and R-2 Returning:** re-applying the Write Path plan's Task 2-1 and 2-2 AFTERs (`Write Path — Implementation Plan.md:3137-3230`) is sound only once `describes` compares ctime, every recorded stat is post-rename, a page move re-records its row (`indexSeed.ts:248`), and `unlessVouched` takes a fresh stat per passed-over page. The clash check reads every holder of either key, stored ones included, and discards stored ones after (`registryProperty.ts:174-179`); with R-1 the read narrows to pages holding both keys plus the unvouched, and the store hide moves ahead of the read.

#### 3. Findings, as the Investigation Holds Them

- **Two Reach Mechanisms, Hand-Placed Hiding, Three Spellings of "In the Archive," the Store Notion in Three Files, Two Exclusion Readings, the Stray File:** M-16, P-4, P-10, B-8.
- **The Claim Rule and Its Four Cases:** *§The Trash's Model · §The Rules*, 1; condition-free, since `heldElsewhere` already exempts the restoring bundle.
- **The Trashed Twin:** the pass-over, *§The Rules*, 2.
- **Admission, Path-Only:** *§The Rules*, 4; a record's presence would be free in the walk (a bundle's children arrive with `_record.json` among their `siblings`) but impossible on the per-event path.
- **Two Stores, Two Watch Policies:** *§The Rules*, 5.
- **The Stored-Space Source, One Stored-Pages Read, Two Reach Rules for Two Stores:** *§The Trash's Model · §Added*, M-9.
- **Two Governed Rules for Trashed Pages:** *§The Rules*, 3.
- **Stored Data Read Only to Be Discarded:** LD-4 for the clash check; *§The Rules*, 7, and *§Approaches Worth Weighing*, 8, for the matrix and headings loads.
- **`storedAt` Against `storedAtOf` and `rows.storedAt`:** M-16's rename.
- **Two Identities of One File, the Double That Doesn't Match the Host:** LD-1, LD-2.
- **`settleArchives` Under Reach-In:** its orphan-to-Trash move becomes an index rename rather than a de-index, needing nothing new; *§Approaches Worth Weighing*, 6.
- **Three Trail Formulas, One Carry With Three Triggers:** M-10; B-6 is model-independent, since `refileMoved` carries Archive records only.
- **Archive-by-Collection Enumeration Twice, `archivedSetIds` Against `archivedSets`:** M-11.
- **The Store Shape (Two Stores, the ID Folder, the Collection's Own Folder, the Stamped Wrapper):** *§The Store Shape*.
- **`refusedLine` Naming Stored Titles:** *§The Rules*, 7.

#### 4. Behavior to Preserve

- **A delete strips Link values naming the deleted page from other pages and Spaces, archived pages included; ID-less or twin linkers keep theirs:** `deleteReach.test.ts:111-155,346`; `keyHolders.test.ts:311,326`.
- **A restore re-adds stripped values, including into stored copies, under Restore Links On Deletion:** `spend.test.ts:952,1005`; `trashRecovery.test.ts:827,835`; with the setting off, `trashRecovery.test.ts:853`.
- **Parking: a value naming a trashed page returns with that page; bare-title ambiguity names neither:** `trashRecovery.test.ts:462-678,749,802,862`.
- **Archived pages are cascade-reachable and resolve as link targets:** `keyHolders.test.ts:85,183,204,209,283,291`; `restoreProperty.test.ts:614,624`; `archive.test.ts:139,153,1101-1149`.
- **Archived pages stay out of display:** matrix, headings, `pages:changed`, counts; no direct test beyond `keyHolders.test.ts` (inferred).
- **The twin rule and the index-less fallback:** `heldPages.test.ts:134,146,153`; `keyHolders.test.ts:176`.
- **Excluded folders are never reached; sweeps keep modification times:** `keyHolders.test.ts:438,455`.
- **A trashed Collection switches a deleted-then-restored property back on:** `restoreProperty.test.ts:410`.
- **Sync carries `.trash` through the write tap only:** `tap.ts:47-55`, `manifestAdmits` at `exclusion.ts:42`.
- **File history keeps archived pages' snapshots on the Archive's retention:** `fileHistory.ts:197-206`.
- **A page or Set archives under its Collection's ID with its record:** `archive.test.ts:121`.
- **What was archived from within a Set follows it to another Collection's Archive, records whole, trails current:** `refile.test.ts:111,294,319,336`; a rename moves nothing (`:355`); a within-Collection move rewrites trails only (`:279`).
- **Archived Sets carried with a Set keep their own saved views; a moved-out Set takes archived sub-Sets from the views it left:** `refile.test.ts:189,217,248`.
- **A restore or Undo carries archived records into the landing Collection's Archive:** `refile.test.ts:367,382,409`; `archive.test.ts:325-415`.
- **An Undo files into the Archive the origin sits in now, on its current trail, and refuses or records afresh when that Archive is gone for good:** `archive.test.ts:656,678,1043,1195`.
- **An orphaned Archive moves into the Trash with records byte-identical; one is kept while its Collection is excluded, hidden, trashed, or behind an unreadable root sidecar; an unparseable bundle stays as evidence:** `refile.test.ts:443,460,475,483,490,500`.
- **A bad Collection id never names a folder or reaches outside the Archive:** `refile.test.ts:132,151`; `archive.test.ts:269`.

#### 5. Tests

- **`trashedCopies.test.ts`** (26 lines) tests `frozenWorld` alone and leaves with it.
- **`spend.test.ts:1005`** pins that the Trash's refill mirrors the live one; under reach-in there is one path, so it duplicates the live refill cases.
- **Parking tests** (`trashRecovery.test.ts:462-678`) are phrased around "parks" but each asserts the restore's outcome, so they survive.
- **Archive reach cases in `keyHolders.test.ts`** (`:85,183,204,209,283,291,326`) are per-store; under reach-in one table runs over each store.
- **Near-Duplicates:** `refile.test.ts:132` and `:151`; `:189` and `:217`; `archive.test.ts:352/368/388/400` (four Undo-carry variations, one table-driven case); `archive.test.ts:971` against `:1016/1028`; `refile.test.ts:366-440` overlapping `archive.test.ts:325-415`.
- **Pinning Implementation:** `layout.test.ts:10` asserts `layoutOf`'s literal return; `refile.test.ts:124,307,512` and `archive.test.ts:124` assert exact chain spellings, which stay, since the layout is the legibility contract (Decision C-1).
- **Fixture Bloat:** `archive.test.ts` (52 `mkdir`/`writeFile` calls), `refile.test.ts` (35), and `bundle.test.ts` (30) each hand-build a similar disk tree; `Core/Testing/testTree.ts` builds in memory only (P-9).
- **Gaps:** B-6's stale `from`; B-8's stray file; a path-spelled link naming an archived page across a Collection rename; the hide filters in the matrix and headings readers; the claim rule's four cases; the pass-over.
