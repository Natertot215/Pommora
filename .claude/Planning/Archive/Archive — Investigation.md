### Archive — Investigation

**DATE:** 10-19-2026
**HEAD:** `213f95a3b`, verified against the working tree at that commit. The tree's only uncommitted changes are planning documents (the MetadataV3 folder's move into `Completed/`, this folder, and `.claude/Features/PropertiesPM.md`); the Path Links work the brief expected uncommitted is committed at `213f95a3b`, so no cited source file carries uncommitted edits.

This document reconciles five read-only scouts (A: cascade reach; B: index, discoverability, watcher, sync, and location; C: the Trash's machinery; D: views, the table, the shared browser, the entry, and the menus; E: windows, history, settings, confirmations, and notices) against the code and against *Archive — Decisions & Intention* as it stands on 10-19-2026, with Nathan's rulings from the planning session folded in: Sets are archivable; the Trash's look stays untouched; batch actions come by right-click and by an `ActionLabel` bar; and the Archive lives in a hidden folder at `.nexus/archive/<Collection ID>/`, the single named exception to the hidden-folder rule, which every cascade reaches into and the index, watcher, and sync admit, while the tree walk and every discovery surface leave it out. Two exclusion rulings follow it: a Set or Collection leaving the tree, archived or trashed, leaves every excluded folder inside it behind in its parent (a Collection's at the Nexus root), the entry following the folder, so excluded content never enters the Archive or the Trash and stays where it landed on restore; and an item archived before its Collection was excluded stays in the Archive, inert in the interface, and restores homeless as the Trash's does. Each load-bearing claim was opened at its citation; what didn't hold is corrected or dropped in *§Reconciliation Log*. The per-Collection location and its `.collection/` variant are costed as the fallback.

---

#### What's True

##### The Hidden-Folder Rule and Who Honors It

**The Predicates:** `hiddenName` matches a leading `.` or `_` (`Core/Paths/exclusion.ts:17-19`); `hiddenFolder` adds `node_modules` (`:22-24`). `outsideContent` answers `'hidden'` for any hidden segment on the path, then `'asset'`, then `'excluded'` (`:74-82`). `neverWatched` exempts `.nexus` at index 0 only, holds every folder on the way to `hiddenFolder`, and holds the leaf to the dot, `node_modules`, and store files (`:26-36`). `manifestAdmits` derives from `neverWatched`, adds a `.trash` arm, and drops thumbnails and the two journals (`:44-61`).

**The `.nexus` and `.trash` Precedents Are Watcher and Sync Exceptions Only:** `.nexus` is exempt from `neverWatched` and `.trash` from `manifestAdmits`, while both stay `'hidden'` to `outsideContent`, so neither is in the corpus, the index, or any cascade. The Archive would be the first corpus exception. `NON_CORPUS_TOP` (`Core/Paths/nexusPaths.ts:7-8`) has one reader, `nexusFolderRefusal` (`Core/Settings/codec.ts:42-53`), and its comment ("The walk, the index, and every mutation refuse these") describes what `hiddenFolder` does, not what the set does.

**Tree and Discovery Callers of `outsideContent`:** `readChildSets` (`Core/Nexus/readNexus.ts:158-170`), the root read (`readNexus.ts:327-328`), `stampTree` (`Core/Nexus/adopt.ts:165`), `stampAdopted` (`adopt.ts:183`), `adoptsAsCollection` (`Core/Nexus/folderKind.ts:96-105`), `landingRefusal` (`Core/Nexus/folderEntity.ts:20-28`, typed through `SET_ASIDE[why]`), and the exclusion re-walk (`Core/Nexus/fileEvents.ts:515`). Each treats any reason as outside.

**Reach Callers of `outsideContent`:** the corpus walker `corpusFilesUnder` (`Core/Files/walk.ts:73-83`, which feeds `nexusCorpus`, `folderCorpus`, and `corpusFiles` at `Core/Index/indexSeed.ts:74-87`), index maintenance through `relCorpusPath` (`indexSeed.ts:89-93`, under `indexWrittenPage`, `deindexPath`, and `moveIndexPaths` at `:126-191`), Clear Exclusion Cache (`Core/Settings/exclusionScan.ts:43-48`), and the asset migration's sidecar walk (`Core/Assets/assetMigrate.ts:160-161`).

**Direct `hiddenFolder` Callers:** the event classifier (`fileEvents.ts:252`, `:264`), the Trash's page lister `listMarkdownFiles` (`walk.ts:31-39`), `visibleFolders` (`walk.ts:46-50`, for root folders and Context folders), the restore scrub's Space-sidecar walk (`Core/Trash/restoreScrub.ts:129-130`), the name rules (`Core/Paths/names.ts:25-26`), and the asset-root checks (`Core/Assets/assetRoots.ts:49`, `Core/Settings/assetDirValidate.ts:34`).

**The Walker Descends by Hand:** `listPathsUnder` checks `admit` on each directory before entering it (`walk.ts:52-71`), so a walk from the root never enters `.nexus` while `outsideContent('.nexus')` answers `'hidden'`.

##### Where `.nexus/archive/` Stands Today

**Watched and Synced Already:** `neverWatched`'s `.nexus` exemption plus non-hidden `archive` and ULID segments put `.nexus/archive/<ID>/…` inside the watch (`Desktop/FileWatch/watcher.ts:55-65`) and inside `manifestAdmits`. An in-app move into it is a rename on the wire when both ends are admitted (`Core/Sync/Client/tap.ts:64-75`).

**Ignored by the Tree Already:** `classifyEvent`'s `.nexus` branch answers `'ignored'` for anything outside `contexts/` after its config and tile checks (`fileEvents.ts:227-249`, the fall-through at `:241`). A tile body there is matched by `tileHostAt` against tree boards only (`Core/Tiles/tileHosts.ts:56-62`). `applyMove` already distinguishes a `.nexus` landing (`fileEvents.ts:579-581`) and falls to an unlink plus an add for a move the tree can't make in place (`:585-589`), so an archived page leaves the tree and its arrival is ignored.

**Shut Out of the Index:** `relCorpusPath` answers null for any path with a hidden segment, so `indexEvent` (run for every event, `fileEvents.ts:273-297`, `:655`; `Core/Nexus/settle.ts:52`) indexes nothing under `.nexus`.

**Data on Disk:** NexusOS holds 6 `_pagecollection.json` and 48 `_pageset.json` outside `.trash`; Sapphire's `src` reads neither.

##### Cascade Reach Today

**Governed Reach:** property and option sweeps take `queryKeyHolders(key) ?? nexusCorpus(root)` intersected by prefix with Collection folders (`Core/Properties/keyHolders.ts:12-18`, `:21-39`; `corpusUnder`, `indexSeed.ts:78-82`), plus every Space sidecar through the plan's `sidecars` arm. The folder list comes from `collectionFolders` (`Core/Properties/assignment.ts:152-156`): tree Collections plus damaged ones, by path. Six sites call it (`optionOps.ts:197`; `registryProperty.ts:112`, `:126`; `deleteProperty.ts:82`, `:99`; `replaySchemaCascade.ts:56`); Remove passes one folder (`removeProperty.ts:36-38`).

**`collectionFolders` Has Two Roles:** besides scoping sweeps, its list is the set of Collection sidecars that the property-delete snapshot reads (`deleteProperty.ts:44-54`, marking the bundle `partial` when one won't read) and that `unassignAndPurge` patches (`deleteProperty.ts:139-143`), and replay hands it to `stripAndRemove` (`replaySchemaCascade.ts:56-62`). An archive folder appended to it would mark every property delete partial and have `patchSidecar` write a `_pagecollection.json` into the archive.

**Content Reach:** link re-spells and Context sweeps take `queryMentions`/`queryMembers` or `nexusCorpus`, unscoped (`Core/Nexus/cascade.ts:219-222`; `Core/Contexts/contextCascade.ts:72`). The heading arm is index-only by design (`cascade.ts:222`).

**The Delete Strip Differs:** `deleteCascade` keeps candidates the live tree holds by path or that sit under a withheld folder, and skips a page whose id `livePathOf` can't answer as a twin (`cascade.ts:100-120`). Every archived page would fail both tests.

**Configuration Reach:** `reachConfig` writes views in tree containers' and damaged containers' sidecars only (`Core/Nexus/configReach.ts:309-348`), so an archived Set's `_pageset.json` views are never reached.

**Counts:** every confirmation count comes from `property:holders` (`Core/Properties/handlers.ts:199-208`) into `sweepCount`, a dry run answering `touched.size` (`Core/Properties/governedSweep.ts:113-114`), from four producers (`optionOps.ts:332`, `:359`; `registryProperty.ts:168`; `deleteProperty.ts:83`).

**Owner by Path:** `owningCollection` answers the Collection a path starts in by its top segment (`Core/Nexus/treePatch.ts:84-91`) and backs `containerSchema` (`:99`); its callers include the repair sweep (`Core/Properties/repairSweep.ts:27`), the Context write (`Core/Contexts/contextWrite.ts:77`), the restore (`Core/Trash/spend.ts:191`), and the property panel (`Core/Properties/PropertyPanel.tsx:161`, `:265`). A `.nexus/archive/…` path answers nothing.

##### By-ID Reach and the Refill Gap

**Every Refill Reads the Tree:** `recordById(tree)` feeds `sweepRootsById` (`governedSweep.ts:150-175`) at three sites: the reassign refill (`assignment.ts:78-84`), the Trash restore's Context re-tag and Link refill (`spend.ts:250`, used at `:282-305` and `:326-336`), and the property restore (`Core/Trash/restoreProperty.ts:56-69`). The `id-live` refusal reads it too (`Core/Trash/resolve.ts:36-38`).

**The Gap Is Real:** a Link value stripped from an archived page names an id absent from `roots`, so the restore files it under `trashed` (`spend.ts:299-300`), and `refillTrashed` looks only in Trash bundles (`Core/Trash/holdings.ts:111-162`); finding nothing, the value is dropped without a word. The Context re-tag drops an absent id as "a root gone since" (`spend.ts:325-336`), the reassign refill keeps it cached and never refills it, and the property restore filters it out (`restoreProperty.ts:60-62`).

**What Can Answer Archived Ids:** `readIndexedStats(under)` returns path to `{mtimeMs, size, id}` for a prefix (`Core/Index/contentIndex.ts:92-94`; `Desktop/Store/stores.ts:180-187`; `IndexedStat`, `Core/Platform/stores.ts:30-35`). It answers null until the index is ready.

**The Live Lookups Have Other Readers:** `livePathOf` and `liveIdIndex` (`Core/Nexus/heldPages.ts:16-28`) feed the outside-move pairing (`settle.ts:87`, `:277`, `:287`), `loadValues` (`Core/Views/loadValues.ts:15`), file history (`Core/Pages/fileHistory.ts:89`, `:117`, `:136`, `:174`), and sync captures (`Core/Sync/Arrival/captures.ts:16`), so widening them in place would pair an archive move as an ordinary move.

##### Discovery

**Tree Exclusion Is Discovery Exclusion:** link resolution and connection suggestions resolve through `pageIndexOf(tree)` (`Core/Nexus/record.ts:78`; `Core/Session/pageConnections.ts:30-31`); nav search lists `nodesOf(tree)` (`Core/Nexus/treeIndex.ts:145-173`); Matrix nodes come from `tree.collections` (`Core/Matrix/matrixInput.ts:33-57`) and `buildGraph` drops any edge whose source or target isn't a node (`Core/Matrix/Engine/graph.ts:78-83`); views build rows from tree containers; selection and tabs reconcile through the tree (`Core/Session/reconcileSelection.ts:33-41`). No backlinks reader exists.

**Three Whole-Index Reads Ship Rows the Renderer Discards:** `readMatrixGraph` reads every page's relations when asked with no paths (`Core/Matrix/matrixGraph.ts:19-41`), `index:headings` returns every page's outline (`Core/Nexus/handlers.ts:167-169`, from `Core/Session/nexusSlice.ts:165-190`), and `loadValues` with no ids parses every corpus file under the container (`loadValues.ts:8-18`). The renderer keys the first two by tree-resolved ids and paths, so they cost but don't leak. Under `.nexus/archive/`, `folderCorpus(Collection)` never enters the archive, so the third adds no archive cost.

##### Moves, the Settle, and Sync

**An In-App Move:** `relocate` records both ends, raises an own move event, then reports the rename to sync (`Core/Files/atomicWrite.ts:62-75`). With both ends in the corpus, `moveIndexPaths` renames the rows (`indexSeed.ts:178-191`); with the destination outside, it de-indexes, which is what a hidden archive without the exception would do, and sync would push a delete (`tap.ts:64-67`).

**Restore as an Arrival:** `addressed` diffs `settledIndex` before and after an op and relinks moves and arrivals (`Core/Nexus/mutate.ts:89-113`); `settledIndex` is `pageIndexOf(heldTree)` (`settle.ts:242-246`), so an archived page is absent before its restore and arrives after it. `changesSettled` lists the ops whose pending saves flush first (`Core/Nexus/mutateRequest.ts:138-147`).

**Outside Moves Never Pair Into the Archive:** `payOutsideMoves` places ids by `livePathOf` (`settle.ts:270-292`), so a vanish into the archive waits in `owed.vanished` until a restore.

##### The Trash's Delete, Record, and Restore

**Delete:** `deleteOp` gates on `mutableTarget`, mints a bundle mirroring the physical chain, computes `under` from tree pages, gathers link targets, writes the record ahead, relocates, drops metadata only in system mode, strips, releases excluded entries, and runs `goneEdit` (`Core/Trash/delete.ts:28-116`). For an archived target, `under` is empty and `gatherParentRef` records `unaddressable`, since the archive folder isn't a container (`Core/Trash/gather.ts:24-29`).

**Record:** `contentRecord` holds `{entity, id?, parent, excluded?, links?, targets?, partial?}` with `parent` as root, container id, Context id, or unaddressable (`Core/Trash/record.ts:14-44`). The deletion time lives only in the bundle stamp (`Core/Trash/trashRows.ts:12-19`). Bundles carry their record, so a hand-move moves both (`.claude/Features/NexusRecordPM.md:8`).

**Placement:** `resolveRecord` is a pure function of record, base name, and tree (`resolve.ts:31-93`): a live id refuses first; a page or Set resolves its parent by id and answers `parent-gone` or `cannot-hold`; siblings span pages and Sets; collisions step aside through `freeName`. A parent excluded or trashed since is absent from the tree and answers `parent-gone` (`resolve.ts:76-80`), which the Trash frame turns into the destination picker (`spend.ts:107-128`; `Core/Actions/trashMenu.ts:21-33`).

**Empty:** `emptyBundle` lists the artifact's pages through `contentPages` → `listMarkdownFiles`, drops their metadata, strips links naming them by their `.trash`-mirrored keys, and parks recorded values (`spend.ts:66-103`; `holdings.ts:48-61`).

##### Excluded Entries

**Moves Follow, the Trash Records:** a Collection or Set move carries its excluded entries through `followExcludedFolders` (`Core/Settings/settings.ts:97-106`; `folderEntity.ts:30-32`). A Trash delete records them (`gather.ts:72`), releases them (`delete.ts:109`; `settings.ts:119-123`), and reseats them on restore (`settings.ts:125-127`).

**The Carrying Code:** `excludedWithin` (`settings.ts:86-88`), `editExcluded` (`:90-95`), `followExcludedFolders` (`:97-106`), `exclusionWriteRefusal` (`:108-117`), `releaseExcludedFolders` (`:118-123`), and `reseatExcludedFolders` (`:125-127`) exist only to carry entries inside a Collection or Set. Their callers are the folder rename (`Core/Nexus/rename.ts:20-23`), the Set move (`move.ts:50-53`), the container delete (`delete.ts:41-44`, `:109`), the Trash record (`record.ts:38-39`; `gather.ts:72`), the restore (`spend.ts:177`, `:218`), and `relocateFolder` (`folderEntity.ts:30-32`). `applyMove` walks and reseeds when a folder lands at or above an excluded entry (`fileEvents.ts:574-577`). F-007 (`.claude/IssuesPM.md:13`, `:147-160`, `:1348`) is the sync leak this carrying opens when a container holding excluded folders goes to the Trash.

**The Follow Runs After the Rename:** `relocate` renames under the lock, raises the own event, then runs `landed` (`atomicWrite.ts:62-75`), and `relocateFolder` passes `followExcludedFolders` as `landed` (`folderEntity.ts:30-32`). A crash between the rename and the follow leaves the folder at its new path unexcluded and its entry naming a path that no longer exists, so the next open indexes, watches, and syncs it.

**Entries Under `.nexus` Are Dropped Silently:** every write and read of the list passes `normalizeExclusions`, which drops any entry `nexusFolderRefusal` refuses (`codec.ts:61-85`; `editExcluded`, `settings.ts:90-95`), and `nexusFolderRefusal` refuses a first segment in `NON_CORPUS_TOP`. The Exclusions pane writes through `exclusions:set` → `sanitizeExclusions` → `normalizeExclusions` (`Core/Settings/handlers.ts:15-25`; `settings.ts:137-141`).

**Live Entries:** NexusOS's four entries (`Agenda`, `TaskNotes`, `slates`, `file-assets`) are all root folders; `~/Test` has none. No Trash record in either Nexus holds a non-empty `excluded` list, and records decode with Zod's default object, which strips an unknown key (`record.ts:33-44`), so a record still carrying `excluded: []` decodes after the field leaves.

**Clear Exclusion Cache Deletes Container Sidecars:** it walks each excluded folder, deletes its `_pagecollection.json` and `_pageset.json` files, strips page ids and `<Context>` keys, and drops metadata (`exclusionScan.ts:31-95`). An excluded Collection's id is gone afterward.

##### Order and Page Metadata

**Order:** the Trash never removes a deleted id from `page_order`; the slot survives until the folder's order is next written from live ids (`Core/Nexus/order.ts:10-27`; `Core/Views/creationOrder.ts:71-77`). A move calls `dropFromChildOrder` (`Core/Nexus/move.ts:37`, `:63`), and a Set move that leaves its Collection runs `goneEdit` through `reachConfig` (`move.ts:54-66`).

**Metadata:** only `dropPageMetadata` removes entries (`Core/Nexus/pageMetadata.ts:119-134`), from a system-trash delete, `emptyBundle`, and Clear Exclusion Cache. An archive that doesn't call it leaves Decision 9 satisfied for free.

##### Views, the Table, and the Trash Browser

**TableView Has No Read-Only Seam:** it is `ViewHostApi` throughout, with editing, picking, ghost rows, and view writes (`Core/Views/Table/TableView.tsx`, 734 lines).

**The Look Comes From the Shared Sheet:** full-length dividers and row hairlines are `UIX/Table/table.css`; TableView's shell (bleed, inset, grip gutter) is `Core/Views/Table/table-view.css` (94 lines).

**The Trash Frame:** `MenuItem` rows on the shared chrome (`Core/Settings/TrashFrame.tsx`, 327 lines); search through `rankMatches` (`:52-56`); the date column's style menu duplicates TableView's pick by hand (`:65-69`, `:153-159`); batches run through one `many` runner and report with `countPhrase` (`:36-50`, `:99-151`); the right-click rule acts on checked rows still in view (`:161-165`). Checked-set helpers are already shared (`UIX/Utilities/checkSet.ts`); the History window uses them with a different batch rule (`Core/Interface/Windows/PageHistoryWindow.tsx:81`, `:122`, `:139`). The two menus are 33 and 12 lines; File History's batch offers Delete All alone (`Core/Actions/fileHistoryMenu.ts:5-12`).

##### Navigation and Hosting

**Places:** `NavRef` and `SelectionState` are unions, `navKey` is `kind:id`, and `NAV_KINDS` validates stored refs (`Core/Navigation/navRef.ts:10-56`); Matrix is the precedent for a place that isn't a node. `searchEntriesOf` buckets `nodesOf` by kind through an exhaustive record (`treeIndex.ts:145-173`), so a new kind is a compile-time decision. `searchView` admits only containers (`Core/Session/viewSearchSlice.ts:24-31`), and `ViewMenu` renders only on a Collection or a depth-1 Set (`Core/Views/Settings/ViewMenu.tsx:15-28`).

**The Active View Is Synced Data:** a pseudo-view would write browsing state into the sidecar and skip Back and Forward.

**The Footing:** the views dropdown's footing holds `FootingCreate` and a disabled `// PLACEHOLDER` "More" button (`Core/Views/Settings/ViewFrame.tsx:103-120`); History's Restore is the filled inline button pattern (`PageHistoryWindow.tsx:207-219`).

##### Menus

**Page Delete Is One Row With One Runner:** `DELETE_ROW` (`Core/Actions/pageMenu.ts:40`) closes `PAGE_ACTION_ROWS` and `pageMetaMenuItems` as their last group (`:101-105`, `:116-134`), and `runPageAction`'s `title:delete` runs every host's (`Core/Interface/Menus/pageMenuActions.ts:66-68`).

**Set Delete Isn't Bottom-Most:** the container branch puts Delete in the `[Rename, Delete]` group above the lock, Copy Path, and Reveal group (`Core/Actions/entityMenu.ts:58-80`).

##### Windows

**The History Slot:** one nullable `historyTarget`, absent from the persisted window sets (`Core/Session/windowSlice.ts:30`, `:129-143`). On every tree change it reconciles through `reconcileWith` (`windowSlice.ts:279-281`), which keeps an id the tree doesn't hold only under a withheld folder (`reconcileSelection.ts:33-41`; `withheldIn`, `treePatch.ts:266-269`), so an archived target would close. `trailOf` answers `NO_TRAIL` for an id the tree doesn't hold (`treeIndex.ts:132-133`), so the title would read blank.

**The History Body Caches:** the current body reads through `fetchPageDetail` (`PageHistoryWindow.tsx:100-110`), which seeds the page-detail cache. `page:open` reads any path under the root with no tree check (`Core/Pages/handlers.ts:18-24`).

**The Leading Slot:** `WindowBase` renders the scan button only when `onScan` is passed, then `lead` (`UIX/Windows/WindowBase.tsx:242-254`), so a lock glyph needs no WindowBase change.

**Parked Hosts Translate:** `.is-parked` uses `translate: -200vw` (`Core/Interface/interface.css:40-46`) and the pane slide animates `transform` (`UIX/Animations/motion.ts:58-66`), each a containing block for a fixed descendant, which is why an `ActionLabel` drawn inside a host would mis-position.

##### File History

**Capture Is Tree-Keyed:** `writeBody` and `noteExternalEdit` key by `liveIdOf`, and restore and capture-from-disk by `livePathOf` (`fileHistory.ts:89`, `:117`, `:136`, `:174`), so an archived page gains no snapshots. Snapshots key on `page_id` (`Desktop/Store/versionsDb.ts:7-14`), so they survive the moves.

**The Sweep:** `sweepFileHistory` runs one `DELETE FROM snapshots WHERE ts < ?` and a capture sweep (`fileHistory.ts:194-203`; `versionsDb.ts:71-73`), at open before the tree read (`Core/Nexus/handlers.ts:85-86`) and on a `historyDays` write (`Core/Settings/handlers.ts:42-48`). `historyDays` steps 7/14/30/60/90 with 90 as default (`Core/Settings/personalization.ts:42`, `:189`).

##### Settings, Confirmations, and Notices

**Settings:** a key is one line in `SETTINGS` (`personalization.ts:186-200`). The Deletion section holds Confirm Before Deletion, Permanently Delete Files, and Restore Links On Deletion (`Core/Settings/frames.ts:582-604`); File History follows (`:605-625`); the Trash frame is the foot surface (`:903-909`).

**Confirmations:** `ALWAYS_ASKS` makes Collection, Set, Space, and Context deletes ask regardless of the switch (`Core/Interface/Confirm/confirmations.ts:27-38`). Undo spends live in `armed` keyed by bundle path (`:40-46`), and `notifyTrashed` wraps `notifyDeleted`, which fixes the verb "Deleted" (`Core/Interface/Notifications/notifications.ts:84-101`), around `notifyUndoable` (`:106-137`).

**The Notice Pauses Near the Pointer:** the dwell drains by rAF and slows while `trackNear` reports the pointer near (`Core/Interface/Notifications/NotificationLabel.tsx:33-74`), so a notice posted under the pointer holds.

---

#### What Leaves, Narrows, and Changes

| What | Where | Change | Rough Lines |
| --- | --- | --- | --- |
| `deleteCascade`'s tree filter and twin branch | `Core/Nexus/cascade.ts:100-120` | The strip runs on governed reach; the twin rule moves into the one twin rule governed reach applies (`keyedHolders`' first-claimant rule, `keyHolders.ts:61-64`) rather than being dropped | −18 / +4 |
| The five `query… ?? nexusCorpus(root)` fallbacks and six governed-scope compositions | `cascade.ts:87`, `:221`; `contextCascade.ts:72`; `keyHolders.ts:17`, `:28`; the six `collectionFolders` sites | Two named reaches, `contentReach` and `governedReach`, the second taking a scope that carries the archive prefix apart from the Collection sidecar list | −25 / +25 |
| `recordById(tree)` at the refill sites | `assignment.ts:81`; `spend.ts:250`; `restoreProperty.ts:57` | One reach-by-id projection (tree ∪ archive) in `heldPages.ts`, beside the live lookups | −3 / +12 |
| `sweepCount` | `governedSweep.ts:113-114` | Filters archived files out of the count | +2 |
| `outsideContent` | `exclusion.ts:76-82` | Admits paths strictly inside `.nexus/archive/` | +3 |
| `corpusFiles` | `walk.ts:41-43` | Walks the content root and the archive root | +2 |
| `owningCollection` | `treePatch.ts:84-91` | One arm resolving an archived path's Collection by its id segment | +3 |
| `reachConfig`'s container list | `configReach.ts:312-317` | Gains archived Set sidecars from the resolver | +4 |
| The excluded-folder lift | `Core/Nexus/folderEntity.ts`, beside `relocateFolder` (new) | One step, `leaveExcludedBehind`, called by the archive op and `deleteOp` in both Trash modes (*§Excluded Folders When a Container Leaves the Tree*) | +20 |
| `followExcludedFolders` | `settings.ts:97-106`; `folderEntity.ts:30-32` | Replaced inside `relocateFolder` by a crash-safe carry: destination entries written before the rename, source entries dropped after | +4 |
| The Trash's excluded bookkeeping | `record.ts:38-39`; `gather.ts:72`; `settings.ts:118-127`; `delete.ts:109`; `spend.ts:177`, `:216-219` | Deleted: a trashed container holds no excluded folder | −17 |
| F-007 | `.claude/IssuesPM.md:13`, `:147-160`, `:1348` | Closed: the bundle never holds excluded content | — |
| `emptyBundle` and the system-trash delete | `spend.ts:66-103`; `delete.ts:46-48`, `:100` | Dispose a Collection's archive by `record.id` | +12 |
| Orphaned archives | the open, after the seed | Moves an archive whose id names nothing into the Trash (*§Lifecycle*) | +20 |
| `loadValues`' full read | `loadValues.ts:8-18` | Reads the tree's pages under the container; `folderCorpus` keeps one caller | ±0, −1 export |
| Whole-index reads | `matrixGraph.ts:20`; `handlers.ts:167-169` | Trimmed host-side to tree paths | +3 |
| `resolveRecord`, `findContainerById`, `Refusal`, `withDestination`, `REFUSAL_TEXT` | `resolve.ts`; `spend.ts:51-56`, `:107-128` | Hoisted to a neutral placement owner shared by the Trash and the Archive | ±0 (moved) |
| Bundle store helpers | `bundle.ts:11-39`; `record.ts:82-113`; `holdings.ts:24-46`; `spend.ts:58-64` | Parameterized by store root and suffix, with a flat layout for the archive | +6 |
| `trashRowOf`/`TrashRow` | `trashRows.ts`; `Core/Trash/trashRow.ts`; `Core/Contract/bridge.ts` | One row shape for both stores under a neutral name | ±0 |
| `restoreArtifact` | `spend.ts:143-323` | Split by kind, since the unarchive shares only placement | 0 to −20 |
| `trashMenu.ts` + `fileHistoryMenu.ts` | 45 lines | One Restore/Delete builder serving the Trash, File History, and the Archive | −12 / +6 |
| The Trash's open-pick-store date wrapper | `TrashFrame.tsx:65-69`, `:153-159` | One date-column hook shared with ArchiveView | −10 / +14 |
| The batch runner and `countPhrase` | `TrashFrame.tsx:36-50`, `:99-151` | Hoisted below the visual layer | −50 / +45 |
| The checked-row batch rule | `TrashFrame.tsx:161-165`; `PageHistoryWindow.tsx:139` | One rule ("checked rows in view, or the clicked row alone") | −4 / +6 |
| The dead `// PLACEHOLDER` More button | `ViewFrame.tsx:108-116` | Replaced by the Archive button | −9 / +6 |
| `DELETE_ROW` and the container Delete literal | `pageMenu.ts:40`, `:104`, `:132`; `entityMenu.ts:66` | A removal pair `[ARCHIVE_ROW, DELETE_ROW]`, one `title:archive` case | +11 |
| `historyTarget`, `openHistory`/`closeHistory` | `windowSlice.ts:30`, `:142-143`, `:279-281` | One typed reader slot reconciled by kind | ±0 to +6 |
| `PageHistoryWindow.tsx` and its History-only class and sentinel | `PageHistoryWindow.tsx`; `page-window.css:30-36`; `markdown-pm.css:72` | One read-only reader window with History and Archive branches, renamed neutrally; uncached `page:open` in both | +40 to +55 |
| `spendBundle`/`armed`, `waived(kind)` | `confirmations.ts:35-46` | `spendUndo(key)`; `waived(key, kind?)` | +1 |
| `sweepSnapshots(cutoff)` and the open-time sweep's position | `versionsDb.ts:71-73`; `Core/Platform/stores.ts:82-90`; `handlers.ts:86` | One statement with an archived-ids cutoff, run after the seed | +10 |
| The Permanently Delete Files hint | `frames.ts:596` | Reworded to match `askEmptyTrash` and ConfigurationPM | 0 |
| `NON_CORPUS_TOP`'s comment, `destinationTree.ts:1`, `mutateRequest.ts:88` | Comments already false | Corrected | 0 |

**Net:** the consolidation rows net roughly −200 / +175. The new surface (the Archive domain's archive, unarchive, and delete-from-archive ops and handler, about 110; ArchiveView, about 130; the archive place kind, about 75; ActionLabel and its slot, about 70; the header's trailing node, about 8; settings keys and rows, about 6) brings the whole effort to roughly +390. The positive part is new required behavior; the consolidation keeps it from roughly +570.

---

#### What's Reusable

- **The Corpus, Index, and Watch Machinery:** once `outsideContent` admits the archive, `indexEvent`, `moveIndexPaths`, the seed, the watcher, and sync carry archived pages unchanged (*§Where `.nexus/archive/` Stands Today*).
- **The Record and Placement:** `contentRecord('page' | 'set')`, `gatherContentRecord` (the parent is right while the item is still in the tree), and `resolveRecord`'s container arm serve the archive unchanged; `withDestination` and `containerTargets` serve homeless rows.
- **The Bundle Shape:** `mintBundle`, `readRecord`, `writeRecord`, `bundleArtifact`, `listBundles`, `openBundle`, `deletedAtOf`, and `trashRowOf` serve a second store once parameterized.
- **The Undo:** `notifyUndoable`, the chord, and the dwell countdown; Archiving posts through them with no new mechanism.
- **The Settle's Relink:** `addressed`'s before-and-after diff re-spells for an unarchive's arrival, since `settledIndex` is tree-based.
- **The Read-Only Editor:** `readOnly`, the inert editor host, and the sentinel embed ancestor, all already in the History window.
- **The Entry Button and Footing:** `Button type="filled" size="button-inline" pressed` in `MenuFooting`'s `leading`, with no UIX change.
- **The Index's Path-to-Id Map:** `readIndexedStats(prefix)` answers archived ids for the by-id reach and the history sweep.
- **The Count Producer:** one `sweepCount` behind every confirmation.

---

#### Approaches Worth Weighing

##### The Single Exception

**Options:** (a) admit the bare `.nexus` directory plus `.nexus/archive/**` in `outsideContent`, and guard the three root-adoption sites (`readNexus.ts:327-328`, `adopt.ts:183`, `folderKind.ts:96-105`) so `.nexus` never adopts as a Collection; (b) keep `.nexus` and `.nexus/archive` themselves `'hidden'`, admit only paths strictly inside `.nexus/archive/`, and start the corpus walk at both roots.

**Trade-Offs:** (a) makes the walker enter `.nexus` through one predicate but re-opens the tree callers to `.nexus`, which they are closed to by the same predicate today, and would admit tile bodies (`.md` under `.nexus/interface/homepage`) unless the arm narrows again. (b) leaves every tree and adoption caller untouched, since none ever asks about a path inside `.nexus`, and costs one more starting directory in `corpusFiles`.

**Recommendation:** (b). The exception reads as one arm in `outsideContent` that admits a path whose first two segments are `.nexus/archive` and whose remaining segments pass the hidden rule, so a hidden folder inside the archive stays hidden. The watcher, `manifestAdmits`, `classifyEvent`, and `applyMove` need nothing. The enumerators that honor it:

| Enumerator | Where | Under (b) |
| --- | --- | --- |
| Index maintenance | `indexSeed.ts:89-93` | Admits through `outsideContent` |
| The corpus walk (seed, fallbacks, asset migration's page list) | `walk.ts:41-43`, `:73-83` | Walks the archive root as a second start |
| The asset migration's sidecar walk | `assetMigrate.ts:160-161` | Walks the archive root as a second start, so archived Sets' banners and icons are rewritten |
| The watcher | `watcher.ts:55-65` | Already admits |
| Sync push, reconcile, and tap | `exclusion.ts:44-61`; `push.ts:149-165`; `reconcile.ts:74-114`; `tap.ts:17`, `:42` | Already admit |
| The event classifier | `fileEvents.ts:227-249` | Already ignores for the tree |
| Governed reach | `keyHolders.ts:17`, `:28` | Admits the archive root as one prefix through the scope (*§The Reach Definition*) |
| Content reach | `cascade.ts:87`, `:221`; `contextCascade.ts:72` | Admits through the index or corpus |
| Configuration reach | `configReach.ts:312-348` | Gains archived Set sidecars |
| The exclusion list | `codec.ts:61-85` | Unaffected; excluded folders are lifted out before a Set moves in (*§Excluded Folders When a Container Leaves the Tree*) |
| Clear Exclusion Cache | `exclusionScan.ts:31-95` | Unaffected (excluded folders sit outside `.nexus`) |
| The Trash's lister and scrub | `walk.ts:31-39`; `restoreScrub.ts:122-133` | Unaffected (the archive never rides a bundle) |

##### The Location Resolver

**Shape:** one module, `Core/Archive/archivePaths.ts`, exporting `ARCHIVE_DIR_REL` (`.nexus/archive`, declared in `nexusPaths.ts` beside `METADATA_DIR_REL`), `archiveDirOf(collectionId)`, `archivedCollectionIdOf(rel)` (the third segment, or null), `inArchive(segs)` (the predicate `outsideContent` and `normalizeExclusions` call), `archiveDirs(root)` (one `listEntries` of the archive root), and `contentRoots(root)` (the root and the archive root, for the two walkers). `owningCollection` answers an archived path through `archivedCollectionIdOf`, so `containerSchema` and every schema reader follow.

**Consumers:** `exclusion.ts`, `codec.ts`, `walk.ts`, `assetMigrate.ts`, governed reach, `owningCollection`, `reachConfig`, the archive, unarchive, and delete-from-archive ops, ArchiveView's listing, the Trash's disposal arms, the history sweep, and `sweepCount`.

**What Stays Easy to Change:** the folder name, its depth, and whether it is keyed by id; each is a resolver change.

**What Can't Be Made Easy to Change:**
- **Lifecycle Coupling:** a per-Collection archive rides its Collection's rename, Trash delete, restore, empty, system delete, and exclusion for free; `.nexus/archive/<ID>` needs explicit code at the empty and the system delete, and an orphan rule. Switching location adds or deletes those paths.
- **The Exception's Shape:** `.nexus` takes a prefix arm plus a second walk root; per-Collection takes a name arm, a tree-side reason, a `neverWatched` exemption, and `listMarkdownFiles`. The two aren't one constant apart.
- **Ownership Semantics:** by id versus by path prefix. The resolver hides the lookup, but what follows a Collection's lifecycle differs: by path, the archive goes wherever the folder goes; by id, it stays put.
- **Data Already Written:** once archives exist on users' Nexuses and their peers, moving them is a migration with sync consequences.

##### The Origin Record

**Options:** (a) one `_archive.json` per Collection archive mapping each archived id to `{kind, parent, archivedAt, name}`, with items stored flat; (b) one bundle per archived item, `.nexus/archive/<ID>/<stamp>__<leaf>.archived/` holding the artifact and a `_record.json` from `contentRecord('page' | 'set')`, with the time in the stamp.

**Trade-Offs:** (a) keeps plain filenames, but two archived `Notes.md` from different Sets collide in the flat folder, so archiving renames through `freeName` and the restore undoes it; the sidecar isn't in `OWN_NAMES` (`Core/Sync/Arrival/mergePolicy.ts:13-21`), so it lands whole on sync and two devices archiving concurrently lose one record unless it joins the merged names; an entry drifts from its file after a hand-move; it is a second record format beside the Trash's. (b) reuses the record, bundle, listing, row, placement, and time source the Trash already has, holds a Set's folder artifact as easily as a page, never collides, writes once per item, and travels with its artifact. Its cost is depth: archived pages sit inside stamped folders, which the Trash already accepts.

**Recommendation:** (b), flat, one bundle level under the Collection's archive directory. The record adds the origin's path at archive time beside the parent id, as the delete's `targets` already do since Path Links, so the unarchive's relink can map the keys the page answered to (*§Inbound Links and Title Collisions*). Auto-delete would expire a Set bundle as one unit.

##### Lifecycle With the Collection's Trash

**Options:** (a) the archive stays at `.nexus/archive/<ID>` while its Collection is in the Trash and reconnects by id on restore; (b) the delete moves the archive into the Collection's bundle and the restore moves it back.

**What (a) Needs:** nothing at the delete or restore, since the archive stays in reach while its Collection is trashed (*§The Reach Definition*) and returns current; `emptyBundle` disposes `.nexus/archive/<record.id>` (list its pages for metadata and the strip, remove the directory) when the bundle holds a Collection, and the system-trash delete does the same, about +12 lines across the two.

**What (b) Needs:** a second relocate in the delete and the restore, `contentPages` listing the archive inside the bundle, the system-trash delete discarding it, and the restore scrub reconciling it, about +15 lines, and the archive spends its Collection's Trash stay out of reach.

**Recommendation:** (a).

**Orphans:** a Collection gone for good without its archive leaves an archive whose id names nothing: one deleted in Finder, one whose sidecar became unreadable (`Unreadable` carries no id, `Core/Nexus/tree.ts:109-112`), or one re-adopted under a new id after Clear Exclusion Cache deleted its sidecar (`exclusionScan.ts:31-95`). Options: leave orphans in place, indexed and swept but unreachable from any ArchiveView; or, at open after the seed, move each item of an archive whose id names no tree Collection, no Trash bundle's record, and no excluded folder's sidecar into the Trash as a homeless bundle, reusing the destination picker. **Recommendation:** the move to the Trash, about +20 lines, once per open. It can't tell an excluded Collection whose sidecar Clear Exclusion Cache deleted from a deleted one, so that archive lands in the Trash too, recoverably.

##### The Reach Definition

**Today:** five families (governed, content, tree, by-id, bundle), each defined separately (*§Cascade Reach Today*).

**Ruling:** every archive is in reach whatever its Collection's state; an archive whose Collection is trashed or excluded stays in the Archive, inert in the interface, and current.

**Recommendation:** two named reaches and one by-id map. `governedReach` scopes by Collection folder prefix plus the archive root as one more prefix for the whole-Nexus sweeps, and plus `archiveDirOf(sidecarId(folder))` for Remove, the one single-Collection scope (`removeProperty.ts:36-38`). That confirms Nathan's point that the mapping is one resolver call, with one correction: it sits at the scope step (`keyHolders.ts:17`, `:28`), not in `collectionFolders`, because that list doubles as the Collection sidecar list (*§Cascade Reach Today*). The whole-root prefix also covers damaged Collections, whose ids the tree can't name. `contentReach` stays unscoped. Each states its reason once: a property key means something only where a schema governs (NexusOS's bare `Status:` must never be rekeyed), while a link or `<Context>` key is Pommora syntax wherever it's written. The heading arm stays index-only, which is why the archive must be indexed and not merely enumerable. The schema and Context journals recompute reach through the same plans on replay (`replaySchemaCascade.ts:37-90`; `contextCascade.ts:290-352`), so replay gains the archive with no journal change.

##### By-ID Reach

**Options:** widen `livePathOf`/`liveIdIndex` in place, or add a reach-by-id projection beside them.

**Recommendation:** the projection, in `heldPages.ts`, built from `recordById(tree)` plus `readIndexedStats(ARCHIVE_DIR_REL)`, with `writablePathsOf`'s null-on-twin rule over the union, handed to `sweepRootsById` at the three refill sites. That closes the refill gap, the Context re-tag gap, and the property restore gap; `refillTrashed` then receives only ids found nowhere, its stated purpose. The live lookups stay tree-only for the outside-move pairing, `loadValues`, file history, and sync captures. **Concern:** the index answers null before it's ready; a restore in that window needs the corpus fallback the other reaches have (a walk of the archive root), or it refills nothing.

##### Counts

**Recommendation:** filter `sweepCount`'s touched keys through `inArchive` (+2), the only count producer. `bothKeyHolders`' clash refusal (`registryProperty.ts:124-130`, `:153-155`) isn't a count and must include archived pages, or a rename silently drops the old value on an archived page holding both keys.

##### Discovery Exclusion

**Finding:** tree exclusion already excludes from discovery. **Recommendation:** no new filter; trim `readMatrixGraph` and `index:headings` to tree paths host-side (+3), which also stops shipping Agenda, loose, and withheld rows today. Make `loadValues` read tree pages rather than `folderCorpus` on its own merit.

##### Inbound Links and Title Collisions

**Finding:** links naming an archived page aren't maintained while it is archived, since it is phantom to `respellings`. If its Set is renamed, a path link naming it stays on the old path. If another page holds the same title, a wikilink naming it resolves to that page while it is archived, which Decision 4 doesn't anticipate.

**Recommendation:** the unarchive runs through the settle's relink as an arrival and maps the record's origin path keys to the landed path, as a move re-spells, so inbound path links follow; title-only links that resolved elsewhere while it was away stay where they resolved. Whether those should re-aim by id is a question for Nathan.

##### Excluded Folders When a Container Leaves the Tree

**Ruling:** excluded folders inside Collections stay allowed. A Set or Collection leaving the tree, archived or trashed, leaves each excluded folder inside it behind in its parent, as if the container around it had been removed, and the folder stays there on restore. Archiving `Beta` from `Alpha/Beta/Omega` with `Omega` excluded leaves `Alpha/Omega`; restoring `Beta` gives `Alpha/Beta` beside it. A deeper entry (`Alpha/Beta/Gamma/Omega`) lands in `Alpha` too. A trashed Collection's excluded folders land at the Nexus root.

**The One Shared Step:** `leaveExcludedBehind(root, containerAbs)` in `Core/Nexus/folderEntity.ts`, beside `relocateFolder`, since it is a folder-entity move. It reads `excludedWithin` (`settings.ts:86-88`), keeps the outermost entries (a nested entry rides its outer one), names each landing with `freeName` against the parent's on-disk entries (excluded folders aren't in the tree, so tree siblings alone would miss them; the container's own name is among them, so its restore never meets a lifted namesake), and moves each through `relocateFolder`. Its callers are the archive op and `deleteOp` (Nexus Trash and system trash alike); nothing else moves a container out of the tree, since a Set move and a rename keep it in the tree and carry entries as today. `exclusionWriteRefusal` (`settings.ts:108-117`) gates it before anything moves, as `delete.ts:41-44` does now. A folder lifted to the Nexus root never adopts as a Collection, since its entry follows it and the root read and `stampAdopted` skip any excluded root folder through `outsideContent` (`readNexus.ts:327-328`; `adopt.ts:183`).

**Ordering and Crashes:** the lift runs before the container's own move, so excluded content never passes through the Archive or a bundle and sync never sees it there; a crash after some lifts leaves the container in place with those folders already beside it, still excluded, and the operation can run again.

**Is `followExcludedFolders` Fit?** Semantically yes: moving each lifted folder from `P/S/E` to `P/E′` rewrites its entry and every entry under it. Its timing isn't: it runs after the rename (*§Excluded Entries*), so every carry, the lift and today's Set renames and moves alike, has a crash window where the folder sits unexcluded. **Recommendation:** replace it, inside `relocateFolder`, with a carry that writes the destination entries before the rename and drops the source entries after, so the folder is excluded at whichever path a crash leaves it. One interplay to settle in planning: `applyMove` walks and reseeds when an entry already names the landing (`fileEvents.ts:574-577`), so a pre-written entry costs one walk per carry unless that check learns the carry's own entries.

**What Leaves:** the Trash record's `excluded` field (`record.ts:38-39`), its gather (`gather.ts:72`), `releaseExcludedFolders` and `reseatExcludedFolders` (`settings.ts:118-127`), the release at delete (`delete.ts:109`), and the restore's refusal over recorded entries and its reseat (`spend.ts:177`, `:216-219`), about −17 lines, with F-007, since no bundle holds excluded content. No live record holds a non-empty `excluded` list, so nothing needs carrying over.

**A Behavior Change:** a system-trash delete of a container holding an excluded folder now leaves that folder in place rather than sending it to the system trash, and emptying the Trash never deletes excluded content. Pommora stops destroying content it was told to leave alone, which reads as the rule's intent.

**Hidden Folders Inside an Archived Set:** the archive arm admits a path only when its segments past `.nexus/archive` pass the hidden rule, so a `.x` or `_x` folder inside an archived Set stays outside the index and every cascade, and `neverWatched` holds it to `hiddenFolder` on the way (`exclusion.ts:26-36`), so it stays unwatched and unsynced, exactly as inside a live Set. Bundle folders begin with a digit stamp (`bundle.ts:26-29`), so they never read as hidden.

**Restoring Into an Origin Excluded Since:** `resolveRecord` answers `parent-gone` (`resolve.ts:76-80`), and the row takes the destination picker, as the Trash's does.

##### Recording the Location in the Collection Sidecar

**Finding:** the path derives from the id, so a `_pagecollection.json` key naming the archive would be a second, drift-prone source of truth that sync merges as one more key. **Recommendation:** don't; it earns a place only if the location becomes user-configurable, which nobody asked for.

##### Delete From the Archive and Restore From the Trash

**Recommendation:** `deleteOp` accepts an archive bundle as a source beside `mutableTarget`, takes `parent` from the archive record (Decision 21), mints the `.trash` chain from the origin container's current path so crumbs read where it lived, builds the strip's `paths` from the archived pages mapped to their origin keys, gathers a Set's gone ids from its sidecars on disk for `goneEdit`, and removes the emptied archive bundle.

##### Order on Restore

**Finding:** the archive op must not call `dropFromChildOrder`; then the slot survives exactly as long as a Trash slot does. Recording the next sibling's id and splicing with `spliceBeside` makes it reliable (+6). **Recommendation:** best-effort, matching the Trash, unless Nathan wants position kept reliably.

##### The Shared Browser

**Options:** TableView in a read-only mode (no seam; rejected); a small ArchiveTable on the shared sheet sharing data, selection, menus, the date hook, and the batch runner below the visual layer; a UIX CheckTable both browsers draw (rejected while the Trash keeps its look).

**Recommendation:** the small ArchiveTable in `Core/Archive/ArchiveView.tsx`, wearing TableView's shell once `table-view.css`'s shell rules move to `UIX/Table/`, with the compact checkbox in the grip gutter. A Set row discloses its archived pages inline with `--row-indent`. The Title cell carries the origin trail, as the Trash's does, rather than a third column. Search reads the tab's `viewSearch` query through the same `matchQuery` path the Trash uses.

##### ArchiveView as a Place

**Recommendation:** a place kind `{ kind: 'archive'; id }` on the Matrix precedent, added to `SelectionState`, `NavRef`, and `NAV_KINDS`, with each exhaustive switch answering it and `searchEntriesOf` leaving it out; `searchView` and `ViewMenu` admit it. A flag on the Collection target would make every `kind === 'collection'` check treat ArchiveView as the Collection, and a pseudo-view would write browsing state into synced data.

##### The Entry Button and Header

**Recommendation:** the Archive button replaces the placeholder in the footing's `leading`, after `FootingCreate`; pressing it selects the archive place or the Collection, so the toggle is a Back/Forward step. `DetailTitleHeader` gains an optional trailing node after `.detail-title-clear`, threaded from `InterfaceScaffold`, so the clear button pads against the "Archive" label.

##### ActionLabel

**Recommendation:** its own component (Decision 25), sharing the label chrome and `paneSlide` entrance with `NotificationLabel` through a hoisted style, rendered by one App-level host beside the notice, since a fixed box inside a parked or sliding host mis-positions. The surface declares its bar through a small store-free channel; the host yields while a notice shows. The hover pause is fixed at its source: a notice posted with the pointer already within `NEAR_RADIUS` stays unarmed until the pointer leaves once (+4).

##### The Reader Window

**Options:** one window with a typed slot `reader: { kind: 'history' | 'archive'; page }`; a shared hook with two thin windows; PageWindow in a read-only mode (rejected).

**Recommendation:** one window, generalized from `PageHistoryWindow.tsx` and renamed `PageReaderWindow.tsx`. The archive branch omits `onScan`, passes the lock glyph as `lead`, reads its body with an uncached `page:open`, builds its title from the origin record, and closes when the item leaves the archive by the archive's change signal, shared with the Trash's `trashChanged`. The History branch reads uncached too, dropping `fetchPageDetail`. Properties stay out of core scope, since `PropertyPanel` has no read-only mode.

##### The History Timeframe

**Options:** one sweep with two cutoffs; a one-time trim at archive time; a class column in `versions.db`.

**Recommendation:** one sweep. `archiveHistoryDays` reuses `HISTORY_DAYS` with 90 as default, meaning archived pages keep `min(historyDays, archiveHistoryDays)`; its row sits under History Timeframe. The sweep reads archived ids from `readIndexedStats(ARCHIVE_DIR_REL)` and runs one statement; it moves after the seed, since the index answers null before it. With no index it runs the live cutoff alone. The trim-once option is wrong over time and across devices; the class column is device-local state that drifts.

##### Confirmations and the Undo

**Recommendation:** "Confirm Before Archiving" governs pages and Sets alike, since an archive is reversible and strips nothing; `waived` takes the setting key. The notice is `notifyUndoable("Archived “…”", unarchive)` with no segment, armed by the archive bundle path through `spendUndo`.

##### The Per-Collection Fallback and `.collection/`

**`<Collection>/.archive/`:** `outsideContent` gains an `'archived'` reason after the asset and excluded checks, so every tree caller keeps it out unchanged and the reach callers (`walk.ts:81`, `indexSeed.ts:92`, `exclusionScan.ts:46-47`, `assetMigrate.ts:161`) admit it through one derived predicate; `neverWatched`'s folder arm and `listMarkdownFiles` exempt `.archive` by name; `SET_ASIDE` gains an entry. Governed scope, ownership, rename, Trash delete, restore, empty, system delete, exclusion, and Clear Exclusion Cache all follow by path with no code. Its costs: a user's own `.archive` folder anywhere becomes reached, and archived pages enter `folderCorpus(Collection)` unless `loadValues` reads tree pages.

**`.collection/` Holding the Sidecar and the Archive:** `.collection` is itself a hidden folder, so the Collection's own sidecar would stop being watched, classified, and synced unless `.collection` becomes the exception, which then carries two roles (configuration and archived content). `sidecarPath` (`Core/Paths/paths.ts:15-17`, 15 call sites) absorbs most writers, but the direct readers of `SIDECAR_FILENAME` don't: `folderKind.ts:58-62`, `:99`; `readNexus.ts:186`; the Collection↔Set swap (`adopt.ts:120-127`); `fileEvents.ts:254-261`; `exclusionScan.ts:27`; `assetMigrate.ts:161`; `assetDirValidate.ts:31`; `migrateConfig.ts:47`; and `Core/Testing/configSurfaces.ts`. Sets' `_pageset.json` and the Agenda configs would become the odd ones out unless they follow, which multiplies the work. Every Nexus needs a migration (NexusOS: 6 Collection and 48 Set sidecars), Trash bundles hold the old shape, and peers on older builds see mixed shapes. **Recommendation:** if the per-Collection location returns, `.archive/` alone is its minimal form; `.collection/` is a separate effort with its own justification.

**Is Per-Collection Genuinely Easier?** On lifecycle, yes: the empty, the system delete, and orphans follow by path there and need code under `.nexus`. With excluded folders lifted out before a container leaves the tree, exclusion no longer separates them. `.nexus` is easier on the watcher and sync (free), on the tree (structural), and on stray folders (none).

---

#### What Contradicts the Decisions

- **The Legibility Locked Decision Against `.nexus/archive/<Collection ID>/`:** the Locked Decision requires the Nexus's layout to be "reasonably understandable through the filesystem structure itself." A ULID-named folder inside the app's configuration directory doesn't say which Collection it belongs to, and it doesn't travel when a user copies a Collection folder out in Finder. This is a real reason against the chosen location, stated here rather than designed around.
- **Orphaning Against `.nexus/archive/<Collection ID>/`:** a Collection deleted outside the app, whose sidecar becomes unreadable (`Unreadable` carries no id, `Core/Nexus/tree.ts:109-112`), or whose sidecar Clear Exclusion Cache deleted leaves an archive nothing names, which the per-Collection location can't produce.
- **Decision 2 for Sets:** "directly above Delete, in the same bottom-most divided section" holds for pages, but a Set's Delete sits in `[Rename, Delete]` above another group (`entityMenu.ts:58-80`).
- **Decision 4:** "Links pointing at an archived page should read unresolved" doesn't hold when another page holds the same title; the link resolves there while the page is archived.
- **Decision 7's Example:** counts read "N Items" and include Space sidecars today (`confirmations.ts:107-118`; `Core/Properties/properties.ts:263`); "Removed from 5 pages" is a copy change.
- **Decision 16:** "one definition of what a cascade reaches, shared by every cascade" narrows to two named reaches and one by-id map, since governed and content reach differ for a stated reason; configuration reach stays its own family because it rewrites configuration rather than pages.
- **Decision 18's Restructure Allowance:** the Trash's data layer gains a store parameter, the hoisted placement owner, and the Collection-archive disposal at empty, and trades its excluded-entry record for the shared lift; its model stays Reconcile-on-Restore.
- **The Overview's "ArchiveView shares one table-shaped browser with the Trash":** Decision 10 and the Trash-look ruling share data, selection, menus, and the date style below the visual layer, with two chromes.

---

#### Questions for Nathan

1. **Location:** the archive at `.nexus/archive/<Collection ID>/` can't be read by browsing (its folder names are ids), doesn't follow a Collection copied out in Finder, and can lose track of its Collection. Keeping the archive inside each Collection, as a hidden `.archive` folder, avoids all three. Do you keep `.nexus/archive/`? **Recommended:** keep it only if hiding the archive from the Collection's own folder matters more to you than those three; otherwise the per-Collection `.archive` folder is less code.
2. **Lost Archives:** when a Collection is deleted outside Pommora, or forgotten through Clear Exclusion Cache, what happens to its archived pages? **Recommended:** they move into the Trash, where you can restore them anywhere.
3. **Deleting a Folder That Holds an Excluded Folder:** deleting a Set or Collection will now leave any excluded folder inside it behind, even when deletions go straight to the system Trash. Is that what you want? **Recommended:** yes; Pommora shouldn't delete content you told it to leave alone.
4. **Same-Titled Pages:** while "Notes" is archived, a link to "Notes" can land on another page called "Notes." When the archived one comes back, should those links return to it? **Recommended:** leave them where they landed.
5. **Restore Position:** should a restored page return to its exact spot in the list, or is "usually the same spot" enough, as the Trash does? **Recommended:** the same as the Trash.
6. **Archiving a Set:** should "Confirm Before Archiving" govern Sets too, unlike deleting a Set, which always asks? **Recommended:** yes, since archiving is reversible and removes nothing.
7. **Depth-1 Sets:** should a top-level Set's views menu carry the Archive button, opening its Collection's archive? **Recommended:** Collections only.
8. **Where an Item Lived:** should ArchiveView show where each item lived under its title, as the Trash does? **Recommended:** yes.
9. **The Lock Glyph:** the toolbar lock means "read-only" here, and the unfinished Page Lock may mean the same later. Should they share one meaning? **Recommended:** yes.
10. **Archive History Range:** is 7 to 90 days enough for archived pages' history? **Recommended:** yes for now.

---

#### Tests That Change

- `Core/Paths/exclusion.test.ts`: the hidden-at-any-depth cases gain the archive arm.
- `Core/Files/walk.test.ts`, `Core/Index/indexSeed.test.ts`: the corpus gains the archive root; `relCorpusPath` admits it.
- `Core/Nexus/cascade.test.ts`, `Core/Trash/deleteReach.test.ts`: the tree filter and twin count give way to governed reach and the one twin rule.
- `Core/Properties/keyHolders.test.ts`: the scope helpers fold into governed reach.
- `Core/Properties/assignment.test.ts`, `Core/Trash/spend.test.ts`, `Core/Trash/restoreProperty.test.ts`: refills reach archived ids.
- `Core/Nexus/treePatch.test.ts`, `Core/Properties/repairSweep.test.ts`: `owningCollection`'s archive arm.
- `Core/Views/loadValues.test.ts`, `Core/Matrix/matrixGraph.test.ts`: tree-scoped reads.
- `Core/Trash/trashRows.test.ts`, `Core/Trash/deleteOrder.test.ts`: the parameterized store and the archive source.
- `Core/Actions/trashMenu.test.ts` + `fileHistoryMenu.test.ts`: collapse into one.
- `Core/Actions/pageMenu.test.ts`, `entityMenu.test.ts`, `cellMenu.test.ts`, `cardMenu.test.ts`: the last group gains Archive.
- `Core/Views/Settings/ViewFrame.test.tsx`: the footing.
- `Core/Navigation/navRef.test.ts`: the archive kind.
- `Core/Settings/TrashFrame.test.tsx`: the hoisted `filterRows`/`countPhrase` imports; the DOM tests stay.
- `Core/Interface/Notifications/NotificationLabel.test.tsx`: the arming rule.
- `Core/Session/windowSlice.test.ts`, `Core/Session/devicePrefsSeed.test.tsx`: the reader slot.
- `Core/Pages/fileHistory.test.ts`, `Desktop/Store/versionsDb.test.ts`: the two-cutoff sweep.
- `Core/Interface/Confirm/confirmations.test.ts`: `spendUndo` and `waived`.
- `Core/Nexus/mutate.test.ts:3241-3320`: the follow cases gain the crash-safe carry and the lift; the Collection-restore half of `:3300` goes with the reseat.
- `Core/Nexus/fileEvents.test.ts:307`: follows whatever planning settles for the pre-written entry.
- `Core/Trash/deleteOrder.test.ts`, `Core/Trash/spend.test.ts`, `Core/Trash/trashRecovery.test.ts`: records lose `excluded`; deletes leave excluded folders behind.
- `Core/Testing/storesContract.ts`: stays valid; the store has no path filter.

---

#### What Becomes False

- `.claude/Features/CorePM.md:69` (*§Folder Exclusion*): the hidden rule gains the archive as its one corpus exception; "Trashing one takes those entries into its Trash record, and restoring it puts them back" becomes the lift; and "Un-adopted folders… are indexed and cascade-reachable" is true for content reach only; *§The Device-Local Database*'s sweep line (`:118`) and the metadata lifetime row gain the archive.
- `.claude/Features/NexusRecordPM.md:4`, `:8`, `:16`: provenance lives in two stores, and placement moves to its neutral owner.
- `.claude/Features/ConfigurationPM.md:111-124`: Deletion becomes Trash & Archive; History Timeframe gains its archive sibling. `:259`: entries are carried on rename and move and left behind, with their folders, on archive and trash.
- `.claude/IssuesPM.md:13`, `:147-155`: F-007 closes.
- `.claude/Features/ViewTypesPM.md`: the footer, the one-seat `ViewHost` claim (ArchiveView mounts outside it), View Search's owner, and the table sheet's layering.
- `.claude/Features/InterfacePM.md:58`: the History window's name and role; the confirmation paragraph's "Deletion is the first act to use both."
- `.claude/Features/PommoraUIX.md:391`: `UIX/Table/` gains ArchiveView and the hoisted shell.
- `Core/Paths/nexusPaths.ts:7`: already false.
- `Core/Paths/exclusion.ts:76`: `outsideContent`'s doc gains the archive.
- `Core/Nexus/cascade.ts:72`, `:100`: the strip's reach.
- `Core/Nexus/heldPages.ts:1`: names the reach-by-id projection beside the held tree's.
- `Core/Trash/holdings.ts:143`: `refillTrashed` stops being the catch-all for unknown ids.
- `Core/Trash/bundle.ts:13`, `Core/Trash/trashRow.ts:11`: the store and suffix generalize.
- `Core/Interface/Confirm/confirmations.ts:28`, `:42`, `:48`: the switch and spend comments.
- `Core/Actions/destinationTree.ts:1`, `Core/Nexus/mutateRequest.ts:88`: already false or misleading.
- `Core/Views/Settings/ViewMenu.tsx:15`, `Core/Actions/trashMenu.ts:9`, `Core/Settings/TrashFrame.tsx:162`: the menu's render rule and the batch rule's home.

---

#### Reconciliation Log

##### Disagreements Resolved

- **Location and the Origin Record:** A and B recommended a visible kind-marked folder inside the Collection; C recommended Trash-style bundles in a per-Collection store. Nathan's ruling places the archive at `.nexus/archive/<Collection ID>/`. The record question stays open under the ruling, and C's per-item bundle wins on the evidence (*§The Origin Record*), inside the ruled location.
- **The Refill Gap:** A's claim holds and widens: besides the Link refill (`spend.ts:299-304`), the Context re-tag (`spend.ts:335`), the reassign refill (`assignment.ts:81`), and the property restore (`restoreProperty.ts:57`, which A didn't list) all read the tree alone. The reach-by-id projection closes all four.
- **Discovery Leaks:** B's three reads are verified and are costs, not leaks; the renderer resolves through the tree. Under `.nexus/archive/` the `loadValues` cost B named doesn't arise.
- **The History Slot:** E's two claims hold (`windowSlice.ts:279-281`; `treeIndex.ts:132-133`).
- **Excluded Entries:** C's follow model is impossible under `.nexus/archive/` as the codec stands; Nathan's ruling lifts excluded folders out of a container before it leaves the tree, which makes the question moot and retires the Trash's record of them.
- **The Hoisted Placement Owner:** C and D both place shared parts in a neutral home; Decision 23's `Core/Archive/` holds the archive's ops and view, and the shared placement and bundle store sit in a neutral Trash-and-Archive owner, named in planning.

##### Weighed and Set Aside by Ruling

- **A Visible Kind-Marked Folder (A's Approach 1, B's (e)):** zero hidden-rule exceptions and full legibility, but visible in Obsidian and Finder; set aside by the ruling that the archive is hidden.
- **Per-Collection Trash-Style Bundles (C's Approach A Location):** kept as the record shape, moved to `.nexus/archive/<ID>/`.
- **`<Collection>/.archive/` and `.collection/`:** costed as the fallback (*§The Per-Collection Fallback*).
- **An Index Flag or an Unindexed Archive (B's C):** rejected by B on the evidence; nothing reopens it.
- **Hide in Place (C's C):** contradicts Decision 1 and Legibility.
- **Excluded Subfolders of an Archived Set:** carrying the entry into the archive by narrowing `nexusFolderRefusal` (one line, but excluded content then lives inside the archive), refusing to archive such a Set, the Trash's record-and-reseat (which leaves the files indexed, swept, and synced inside the archive, F-007's family), moving them to the Nexus root, and confining exclusion to folders outside Collections were weighed; the ruling leaves them in the Set's parent.

##### Claims Narrowed, Widened, or Corrected

- **A, Removal 1:** "Duplicate IDs are left to the one twin rule `keyedHolders` already applies" is narrowed: `deleteCascade` doesn't route through `keyedHolders`, so the twin rule has to move into the governed strip, not disappear.
- **A, By-ID Sites:** the three cited lines (`assignment.ts:56`, `spend.ts:298`, `:332`) are corrected to `assignment.ts:81`, `spend.ts:250` (used at `:298` and `:332`), and `restoreProperty.ts:57`.
- **A and B, Governed Mapping:** "`collectionFolders` would have to map IDs to archive dirs" is corrected: the mapping is one resolver call per tree Collection, but it belongs at the scope step, since `collectionFolders` doubles as the Collection sidecar list (`deleteProperty.ts:44-54`, `:139-143`).
- **B, `loadValues` as the Archive's Lag Source:** narrowed to the per-Collection fallback.
- **C, "Following excluded entries is the right model":** corrected; `normalizeExclusions` drops entries under `.nexus` (`codec.ts:51`, `:70-73`).
- **C, `addressed` Dependency:** confirmed satisfied, since `settledIndex` is tree-based (`settle.ts:242-246`).
- **D, Checked-Row Duplication:** `toggled` and `retained` are already shared (`UIX/Utilities/checkSet.ts`); only the batch rule differs, so the estimate drops from −25/+20 to −4/+6.
- **D, The Two Menus:** File History's batch offers Delete All alone (`fileHistoryMenu.ts:5-12`), so the merge estimate drops from −45/+30 to −12/+6.
- **D, Set Delete Placement:** Set Delete sits in `[Rename, Delete]`, not the last group.
- **E, `withheld`:** it covers paths under an unreadable or sidecar-less folder (`treePatch.ts:266-269`), not "only an unreadable file."
- **E, Archived Ids for the Sweep:** `readIndexedStats(under)` already answers ids by prefix (`stores.ts:180-187`), so no new join is needed.

##### Claims Dropped

- **C and D, "Decision 17 holds pages only":** the decision log already reads pages and Sets.
- **D, "Open Item 3 (The Trash's Look)":** the log has no such item; Decision 18 settles it.
- **B, Approach (e)'s `_archive.json` as the Origin Home:** dropped with the location.

##### Unverified

- C's Indexed Trash sizing (about 365 source lines) was spot-checked by file length only.
- B's notes on NexusOS's `Ideas/II. Archive` and `Agenda/II. Archive`, `~/NexusOS/.gitignore`, and Obsidian's `showUnsupportedFiles`.
- D's line ranges inside `UIX/Table/table.css`, `trash-frame.css`, `button-base.css.ts`, `MenuRows.tsx`, and `content-title.css`.
- E's `LockGlyph` faces and its six consumers, and `Core/MarkdownPM/MarkdownEditor.tsx`'s read-only lines.
