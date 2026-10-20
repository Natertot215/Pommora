### Archive — Investigation

**DATE:** 10-19-2026
**HEAD:** `213f95a3b`. The working tree now sits at `b439e56a1`, one commit ahead, whose source changes cover number-cell formatting (`Core/Properties/formatValue.ts`, `Core/Properties/Pickers/PropertyValueInput.tsx`, `UIX/Fields/EditableInput.tsx`, `UIX/Pickers/FieldPicker.tsx`, `Core/Views/Cards/cards-view.css`) and `UIX/Table/table.css:245-252`, so every citation below reads the same at both commits.

This document records what Pommora's code does today wherever the Archive touches it, what the Archive lets the codebase remove or consolidate, and the approaches a plan weighs for each part. *Archive — Decisions & Intention* (the decision log) governs intent: where an approach here meets a decision, the decision is named beside it, and anything the log leaves open is marked as the planner's to settle. *Archive — Scout Findings* holds the five scouts' evidence this document was reconciled from (A: cascade reach; B: index, discovery, watcher, sync, and location; C: the Trash's machinery; D: views, the table, the menus, and batch actions; E: windows, history, settings, confirmations, and notices). Every load-bearing claim was opened at its citation; what the scouts claimed and didn't hold is listed in *§Reconciliation Log*.

The terms follow the log's *§Concepts*: the **tree** is the app's in-memory picture of the Nexus, a **cascade** is one pass rewriting every file a change affects, and **reach** is the set of files a cascade opens. Sections under *§What's True* describe the code as it stands; sections under *§Approaches* describe what the design will do.

---

#### What's True

##### The Hidden-Folder Rule and Who Honors It

Pommora treats any folder whose name starts with `.` or `_` as invisible: the tree doesn't show it, the index doesn't read it, and no cascade rewrites what's inside. One small family of predicates in `Core/Paths/exclusion.ts` decides this, and every part of the app that lists files asks one of them.

**The Predicates:** `hiddenName` matches a leading `.` or `_` (`Core/Paths/exclusion.ts:17-19`), and `hiddenFolder` adds `node_modules` (`:22-24`). `outsideContent` answers `'hidden'` for any hidden segment on the path, then `'asset'`, then `'excluded'` (`:74-82`). `neverWatched`, the watcher's filter, exempts `.nexus` at the first segment only, holds every folder on the way to `hiddenFolder`, and holds the leaf to the dot, `node_modules`, and store files (`:26-36`). `manifestAdmits`, sync's filter, derives from `neverWatched`, adds a `.trash` arm, and drops thumbnails and the two journals (`:44-61`).

**`.nexus` and `.trash` Are Watcher and Sync Exceptions Only:** `.nexus` is exempt from `neverWatched` and `.trash` from `manifestAdmits`, while both stay `'hidden'` to `outsideContent`, so neither is in the corpus, the index, or any cascade. The Archive is the first folder the corpus admits past the rule (B-1). `NON_CORPUS_TOP` (`Core/Paths/nexusPaths.ts:7-8`) has one reader, `nexusFolderRefusal` (`Core/Settings/codec.ts:42-53`), and its comment ("The walk, the index, and every mutation refuse these") describes what `hiddenFolder` does rather than what the set does; K-5 rewrites it.

**Tree and Discovery Callers of `outsideContent`:** `readChildSets` (`Core/Nexus/readNexus.ts:158-170`), the root read (`readNexus.ts:327-328`), `stampTree` (`Core/Nexus/adopt.ts:165`), `stampAdopted` (`adopt.ts:183`), `adoptsAsCollection` (`Core/Nexus/folderKind.ts:96-105`), `landingRefusal` (`Core/Nexus/folderEntity.ts:20-28`, typed through `SET_ASIDE[why]`), and the exclusion re-walk (`Core/Nexus/fileEvents.ts:515`). Each treats any reason as outside.

**Reach Callers of `outsideContent`:** the corpus walker `corpusFilesUnder` (`Core/Files/walk.ts:73-83`, which feeds `nexusCorpus`, `folderCorpus`, and `corpusFiles` at `Core/Index/indexSeed.ts:74-87`), index maintenance through `relCorpusPath` (`indexSeed.ts:89-93`, under `indexWrittenPage`, `deindexPath`, and `moveIndexPaths` at `:126-191`), Clear Exclusion Cache (`Core/Settings/exclusionScan.ts:43-48`), and the asset migration's sidecar walk (`Core/Assets/assetMigrate.ts:160-161`).

**Direct `hiddenFolder` Callers:** the event classifier (`fileEvents.ts:252`, `:264`), the Trash's page lister `listMarkdownFiles` (`walk.ts:31-39`), `visibleFolders` (`walk.ts:45-50`, for root folders and Context folders), the restore scrub's Space-sidecar walk (`Core/Trash/restoreScrub.ts:129-130`), the name rules (`Core/Paths/names.ts:25-26`), and the asset-root checks (`Core/Assets/assetRoots.ts:49`, `Core/Settings/assetDirValidate.ts:34`).

**The Walker Descends by Hand:** `listPathsUnder` checks `admit` on each directory before entering it (`walk.ts:52-71`), so a walk from the root never enters `.nexus`, since `outsideContent('.nexus')` answers `'hidden'`.

##### Where `.nexus/archive/` Stands Today

Before any change, a folder at `.nexus/archive/<Collection ID>/` is already half of what B-1 asks for: the watcher sees it and sync carries it, while the tree and the index ignore it. Only the index and the cascades need to learn about it.

**Watched and Synced Already:** `neverWatched`'s `.nexus` exemption, plus `archive` and the id segment not being hidden, puts `.nexus/archive/<ID>/…` inside the watch (`Desktop/FileWatch/watcher.ts:55-65`) and inside `manifestAdmits`. An in-app move into it is a rename on the wire when both ends are admitted (`Core/Sync/Client/tap.ts:64-75`), which is how B-1's example has other devices hold the same Archive.

**Ignored by the Tree Already:** `classifyEvent`'s `.nexus` branch answers `'ignored'` for anything outside `contexts/` after its configuration and tile checks (`fileEvents.ts:227-249`, the fall-through at `:241`). A Markdown file there is matched by `tileHostAt` against tree boards only (`Core/Tiles/tileHosts.ts:56-62`). `applyMove` already distinguishes a `.nexus` landing (`fileEvents.ts:579-581`) and falls to an unlink plus an add for a move the tree can't make in place (`:585-589`), so an archived page leaves the tree and its arrival is ignored.

**Shut Out of the Index:** `relCorpusPath` answers null for any path with a hidden segment, so `indexEvent` (run for every event, `fileEvents.ts:273-297`, `:655`; `Core/Nexus/settle.ts:52`) indexes nothing under `.nexus`.

**Data on Disk:** NexusOS holds 6 `_pagecollection.json` and 48 `_pageset.json` outside `.trash`; Sapphire's `src` reads neither.

##### Cascade Reach Today

Cascades don't share one idea of which files they may touch. Property sweeps look only inside Collections, link and Context sweeps look across the whole Nexus, the delete's link strip looks only at what the tree holds, refills look up pages by id in the tree, and configuration edits look at tree containers. C-3 collapses these into two named reaches and one by-id map; this section is the starting point.

**Governed Reach:** property and option sweeps take `queryKeyHolders(key) ?? nexusCorpus(root)` intersected by prefix with Collection folders (`Core/Properties/keyHolders.ts:12-18`, `:21-39`; `corpusUnder`, `indexSeed.ts:78-82`), plus every Space sidecar through the plan's `sidecars` arm. The folder list comes from `collectionFolders` (`Core/Properties/assignment.ts:152-156`): tree Collections plus damaged ones, by path. Six sites compose it (`optionOps.ts:197`; `registryProperty.ts:112`, `:126`; `deleteProperty.ts:82`, `:99`; `replaySchemaCascade.ts:56`); Remove passes one folder (`removeProperty.ts:36-38`).

**`collectionFolders` Has Two Roles:** besides scoping sweeps, its list is the set of Collection sidecars that the property-delete snapshot reads (`deleteProperty.ts:44-54`, marking the bundle `partial` when one won't read) and that `unassignAndPurge` patches (`deleteProperty.ts:139-143`), and replay hands it to `stripAndRemove` (`replaySchemaCascade.ts:56-62`). An archive folder appended to that list would mark every property delete partial and have `patchSidecar` write a `_pagecollection.json` into the Archive.

**Content Reach:** link re-spells and Context sweeps take `queryMentions`/`queryMembers` or `nexusCorpus`, unscoped (`Core/Nexus/cascade.ts:219-222`; `Core/Contexts/contextCascade.ts:72`). The heading arm is index-only by design (`cascade.ts:222`).

**The Delete Strip Differs:** `deleteCascade` keeps candidates the live tree holds by path or that sit under a withheld folder, and skips a page whose id `livePathOf` can't answer as a twin (`cascade.ts:101-119`). Every archived page would fail both tests.

**Configuration Reach:** `reachConfig` writes views in tree containers' and damaged containers' sidecars only (`Core/Nexus/configReach.ts:309-348`), so an archived Set's `_pageset.json` views are never reached.

**Counts:** every confirmation count comes from `property:holders` (`Core/Properties/handlers.ts:199-208`) into `sweepCount`, a dry run answering `touched.size` (`Core/Properties/governedSweep.ts:113-114`), from four producers (`optionOps.ts:332`, `:359`; `registryProperty.ts:168`; `deleteProperty.ts:83`).

**Owner by Path:** `owningCollection` answers the Collection a path starts in by its top segment (`Core/Nexus/treePatch.ts:84-91`) and backs `containerSchema` (`:99`); its callers include the repair sweep (`Core/Properties/repairSweep.ts:27`), the Context write (`Core/Contexts/contextWrite.ts:77`), the restore (`Core/Trash/spend.ts:191`), and the property panel (`Core/Properties/PropertyPanel.tsx:161`, `:265`). A `.nexus/archive/…` path answers nothing.

##### By-ID Reach and the Refill Gap

When a deleted page comes back from the Trash, Pommora puts back the Link values the delete stripped from other pages. It finds those pages by id in the tree, so a page that isn't in the tree, such as an archived one, silently never gets its value back.

**Every Refill Reads the Tree:** `recordById(tree)` feeds `sweepRootsById` (`governedSweep.ts:150-175`) at three sites: the reassign refill (`assignment.ts:78-84`), the Trash restore's Context re-tag and Link refill (`spend.ts:250`, used at `:272`, `:282`, and `:298-300`), and the property restore (`Core/Trash/restoreProperty.ts:56-69`). The `id-live` refusal reads it too (`Core/Trash/resolve.ts:36-38`).

**The Gap:** a Link value stripped from an archived page names an id absent from `roots`, so the restore files it under `trashed` (`spend.ts:299-300`), and `refillTrashed` looks only in Trash bundles (`Core/Trash/holdings.ts:111-162`); finding nothing, the value is dropped without a word. The Context re-tag drops an absent id as "a root gone since" (`spend.ts:325-336`), the reassign refill keeps it cached and never refills it, and the property restore filters it out (`restoreProperty.ts:60-62`).

**What Can Answer Archived Ids:** `readIndexedStats(under)` returns path to `{mtimeMs, size, id}` for a prefix (`Core/Index/contentIndex.ts:92-94`; `Desktop/Store/stores.ts:180-187`; `IndexedStat`, `Core/Platform/stores.ts:30-35`). It answers null until the index is ready.

**The Live Lookups Have Other Readers:** `livePathOf` and `liveIdIndex` (`Core/Nexus/heldPages.ts:16-28`) feed the outside-move pairing (`settle.ts:87`, `:277`, `:287`), `loadValues` (`Core/Views/loadValues.ts:15`), file history (`Core/Pages/fileHistory.ts:89`, `:117`, `:136`, `:174`), and sync captures (`Core/Sync/Arrival/captures.ts:16`), so widening them in place would pair an archive move as an ordinary move.

##### Discovery

Everything a user can find, from search to link suggestions to the Matrix, reads from the tree. Taking an item out of the tree therefore hides it from all of them at once, which is what D-2 relies on.

**Tree Exclusion Is Discovery Exclusion:** link resolution and connection suggestions resolve through `pageIndexOf(tree)` (`Core/Nexus/record.ts:78`; `Core/Session/pageConnections.ts:30-31`); nav search lists `nodesOf(tree)` (`Core/Nexus/treeIndex.ts:145-173`); Matrix nodes come from `tree.collections` (`Core/Matrix/matrixInput.ts:33-57`), and `buildGraph` drops any edge whose source or target isn't a node (`Core/Matrix/Engine/graph.ts:78-83`); views build rows from tree containers; selection and tabs reconcile through the tree (`Core/Session/reconcileSelection.ts:33-41`). No backlinks reader exists.

**Three Whole-Index Reads Ship Rows the Renderer Discards:** `readMatrixGraph` reads every page's relations when asked with no paths (`Core/Matrix/matrixGraph.ts:19-43`), `index:headings` returns every page's outline (`Core/Nexus/handlers.ts:166-168`, from `Core/Session/nexusSlice.ts:165-190`), and `loadValues` with no ids parses every corpus file under the container (`loadValues.ts:8-18`). The renderer keys the first two by tree-resolved ids and paths, so they cost time without leaking anything. `folderCorpus(Collection)` never enters `.nexus/archive/`, so the third adds no archive cost. K-2 trims all three to what the tree holds.

##### Moves, the Settle, and Sync

Pommora moves a file in one step and then tells the index, the tree, and sync what happened. After certain operations, the **settle** compares which pages existed before and after and re-spells links for anything that moved or arrived.

**An In-App Move:** `relocate` renames under the source's lock, raises an own move event, runs its `landed` step, then reports the rename to sync (`Core/Files/atomicWrite.ts:62-75`). With both ends in the corpus, `moveIndexPaths` renames the rows (`indexSeed.ts:178-191`); with the destination outside, it de-indexes, and sync pushes a delete (`tap.ts:64-67`).

**Restore as an Arrival:** `addressed` diffs `settledIndex` before and after an op and relinks moves and arrivals (`Core/Nexus/mutate.ts:89-113`); `settledIndex` is `pageIndexOf(heldTree)` (`settle.ts:242-246`), so an archived page is absent before its restore and arrives after it. `changesSettled` lists the ops whose pending saves flush first (`Core/Nexus/mutateRequest.ts:138-147`).

**Outside Moves Never Pair Into the Archive:** `payOutsideMoves` places ids by `livePathOf` (`settle.ts:270-292`), so a vanish into the Archive waits in `owed.vanished` until a restore.

##### The Trash's Delete, Record, and Restore

Deleting a page or Set today moves it into a **bundle**, a stamped folder under `.trash/` that holds the item beside a `_record.json` saying where it came from. Restoring reads that record, finds the parent by id in the current tree, and moves the item back, bringing it up to date as it lands (Reconcile-on-Restore).

**Delete:** `deleteOp` gates on `mutableTarget`, mints a bundle mirroring the physical chain, computes `under` from tree pages, gathers link targets, writes the record ahead, relocates, drops metadata only in system mode, strips, releases excluded entries, and runs `goneEdit` (`Core/Trash/delete.ts:28-116`). For an archived target, `under` is empty and `gatherParentRef` records `unaddressable`, since the archive folder isn't a container (`Core/Trash/gather.ts:24-29`).

**Record:** `contentRecord` holds `{entity, id?, parent, excluded?, links?, targets?, partial?}`, with `parent` as root, container id, Context id, or unaddressable (`Core/Trash/record.ts:14-44`). Since Path Links, `targets` records each link target's path beside its id. The deletion time lives only in the bundle stamp (`Core/Trash/trashRows.ts:12-19`). Bundles carry their record, so a hand-move moves both (`.claude/Features/NexusRecordPM.md:8`).

**Placement:** `resolveRecord` is a pure function of record, base name, and tree (`resolve.ts:31-93`): a live id refuses first; a page or Set resolves its parent by id and answers `parent-gone` or `cannot-hold`; siblings span pages and Sets; a collision steps aside through `freeName` over the tree's sibling titles (`Core/Paths/names.ts:56-64`). A parent excluded or trashed since is absent from the tree and answers `parent-gone` (`resolve.ts:76-80`), which the Trash frame turns into the destination picker (`spend.ts:107-128`; `Core/Actions/trashMenu.ts:21-33`).

**Landing Refusals:** after placement, a Set or Collection restore refuses a landing whose name Settings excludes or reserves for assets (`landingRefusal`, `Core/Nexus/folderEntity.ts:20-28`, `spend.ts:174-179`), and any restore refuses when something the tree doesn't know already sits at the target (`spend.ts:180-182`). `createDisambiguated` (`names.ts:66-79`) is the existing rule that asks the disk and steps aside on `exists`; the restore doesn't use it today.

**Empty:** `emptyBundle` lists the artifact's pages through `contentPages` → `listMarkdownFiles`, drops their metadata, strips links naming them by their `.trash`-mirrored keys, and parks recorded values (`spend.ts:66-103`; `holdings.ts:48-61`).

##### Excluded Entries

A user can list folders in Settings › Exclusions so Pommora ignores them. When a Collection or Set holding such a folder is renamed or moved, the exclusion entry is rewritten to follow it; when one is sent to the Trash, the entry is removed and written into the Trash record instead, then put back on restore.

**Moves Follow, the Trash Records:** a Collection or Set move carries its excluded entries through `followExcludedFolders` (`Core/Settings/settings.ts:97-106`; `folderEntity.ts:30-32`). A Trash delete records them (`gather.ts:72`), releases them (`delete.ts:109`; `settings.ts:118-123`), and reseats them on restore (`settings.ts:125-127`).

**The Carrying Code:** `excludedWithin` (`settings.ts:86-88`), `editExcluded` (`:90-95`), `followExcludedFolders` (`:97-106`), `exclusionWriteRefusal` (`:108-116`), `releaseExcludedFolders` (`:118-123`), and `reseatExcludedFolders` (`:125-127`) exist only to carry entries inside a Collection or Set. Their callers are the folder rename (`Core/Nexus/rename.ts:20-23`), the Set move (`move.ts:50-53`), the container delete (`delete.ts:41-44`, `:109`), the Trash record (`record.ts:38-39`; `gather.ts:72`), the restore (`spend.ts:177`, `:218`), and `relocateFolder` (`folderEntity.ts:30-32`). `applyMove` walks and reseeds when a folder lands at or above an excluded entry (`fileEvents.ts:574-577`). F-007 (`.claude/IssuesPM.md:13`, `:148-160`) is the sync leak this carrying opens when a container holding excluded folders goes to the Trash.

**The Follow Runs After the Rename:** `relocate` renames under the lock, raises the own event, then runs `landed` (`atomicWrite.ts:62-75`), and `relocateFolder` passes `followExcludedFolders` as `landed` (`folderEntity.ts:30-32`). A crash between the rename and the follow leaves the folder at its new path unexcluded and its entry naming a path that no longer exists, so the next open indexes, watches, and syncs it. K-1 closes this window.

**Entries Under `.nexus` Are Dropped Silently:** every write and read of the list passes `normalizeExclusions`, which drops any entry `nexusFolderRefusal` refuses (`codec.ts:61-85`; `editExcluded`, `settings.ts:90-95`), and `nexusFolderRefusal` refuses a first segment in `NON_CORPUS_TOP`. The Exclusions pane writes through `exclusions:set` → `sanitizeExclusions` → `normalizeExclusions` (`Core/Settings/handlers.ts:15-25`; `settings.ts:137-141`). An excluded entry therefore can't follow its folder into `.nexus/archive/`, and the Archive itself can't be excluded.

**Live Entries:** NexusOS's four entries (`Agenda`, `TaskNotes`, `slates`, `file-assets`) are all root folders; `~/Test` has none. No Trash record in either Nexus holds a non-empty `excluded` list, and records decode with Zod's default object, which strips an unknown key (`record.ts:33-44`), so a record still carrying `excluded: []` decodes after the field leaves.

**Clear Exclusion Cache Deletes Container Sidecars:** it walks each excluded folder, deletes its `_pagecollection.json` and `_pageset.json` files, strips page ids and `<Context>` keys, and drops metadata (`exclusionScan.ts:31-95`). An excluded Collection's id is gone afterward.

##### Order and Page Metadata

A folder's order lives in its sidecar as `page_order` and `set_order`, lists of ids. Views with a custom order keep their own `manual_order`. A page's icon, aliases, and title-icon override live apart from it under `.nexus/metadata`.

**Folder Order:** `resolveOrder` places ids found in the list in list order, skips ids it can't find, and appends the rest by title (`Core/Nexus/order.ts:10-27`). The Trash never removes a deleted id from `page_order`, so a restored page takes its old slot back only until the folder's order is next written from live ids: a reorder builds from `dest.pages` (`Core/Views/Host/useViewInteractions.tsx:171-184`), and a create from `pageIdsIn` (`Core/Views/creationOrder.ts:71-77`). A move calls `dropFromChildOrder` on the source (`Core/Nexus/move.ts:37`, `:63`), and a Set move that leaves its Collection runs `goneEdit` through `reachConfig` (`move.ts:54-66`). The comment "Stale ids in a source container self-drop on the next read" (`mutateRequest.ts:88`) describes the in-memory skip; nothing writes the drop, and K-5 rewrites it.

**How Order Is Written:** `movePage` and `moveSet` requests carry an optional destination `order` (`mutateRequest.ts:89-90`) that the op writes through `setChildOrder` (`move.ts:33`, `:38`, `:49`, `:64`; `Core/Nexus/reorder.ts:72-79`), and creates do the same (`Core/Nexus/create.ts:50`, `:76`). The renderer composes that order with `placeAt` → `spliceBeside` over `nextOrder` (`creationOrder.ts:12-28`, `:57-69`). A view's `manual_order` keeps ids it doesn't currently show through `tieOrderWith`'s merge (`creationOrder.ts:30-51`), so a custom-order slot survives an item's absence.

**Metadata:** only `dropPageMetadata` removes entries (`Core/Nexus/pageMetadata.ts:119-134`), called from a system-trash delete, `emptyBundle`, and Clear Exclusion Cache. An archive op that doesn't call it satisfies B-3 with no code.

##### Views, the Table, and the Trash Browser

ArchiveView must look like a normal table view (G-1), while the Trash browser in Settings keeps its own look (A-3). The two can share data, selection, menus, and batch logic underneath.

**TableView Has No Read-Only Seam:** it is `ViewHostApi` throughout, with editing, picking, ghost rows, and view writes (`Core/Views/Table/TableView.tsx`, 734 lines).

**The Look Comes From the Shared Sheet:** full-length dividers and row hairlines come from `UIX/Table/table.css`; TableView's shell (bleed, inset, grip gutter) is `Core/Views/Table/table-view.css` (94 lines).

**The Trash Frame:** `MenuItem` rows on the shared chrome (`Core/Settings/TrashFrame.tsx`, 327 lines); search through `rankMatches` (`:52-56`); the date column's style menu repeats TableView's pick by hand (`:65-69`, `:153-159`); batches run through one `many` runner and report with `countPhrase` (`:36-50`, `:99-151`); the right-click rule acts on checked rows still in view (`:161-165`). Checked-set helpers are already shared (`UIX/Utilities/checkSet.ts`); the History window uses them with a different batch rule (`Core/Interface/Windows/PageHistoryWindow.tsx:81`, `:122`, `:139`). The two menu builders are 33 and 12 lines, and File History's batch offers Delete All alone (`Core/Actions/fileHistoryMenu.ts:5-12`).

##### Navigation and Hosting

Every place the content pane can show, such as a Collection, a Set, a page, or the Matrix, is a typed reference that Back, Forward, tabs, and relaunch remember. ArchiveView becomes one more such place (G-5).

**Places:** `NavRef` and `SelectionState` are unions, `navKey` is `kind:id`, and `NAV_KINDS` validates stored refs (`Core/Navigation/navRef.ts:10-56`); the Matrix is the precedent for a place that isn't a tree node. `searchEntriesOf` buckets `nodesOf` by kind through an exhaustive record (`treeIndex.ts:145-173`), so a new kind is a compile-time decision. `searchView` admits only containers (`Core/Session/viewSearchSlice.ts:24-31`), and `ViewMenu` renders only on a Collection or a depth-1 Set (`Core/Views/Settings/ViewMenu.tsx:15-28`), which is exactly where G-4 puts the Archive button.

**The Active View Is Synced Data:** it's the sidecar's `active_view` (`Core/Views/Settings/ViewFrame.tsx:65-68`), so a pseudo-view would write browsing state into a synced file and skip Back and Forward (the log's *Rejected · The Archive as a Saved View*).

**The Footing:** the views dropdown's footing holds `FootingCreate` and a disabled `// PLACEHOLDER` "More" button (`ViewFrame.tsx:103-120`); History's Restore is the filled inline button pattern (`PageHistoryWindow.tsx:207-219`).

##### Menus

Every right-click menu that can delete a page builds its Delete row from one shared definition and runs it through one function, so an Archive row can be added in one place. Collections and Sets build theirs separately, from one branch they share.

**Page Delete Is One Row With One Runner:** `DELETE_ROW` (`Core/Actions/pageMenu.ts:40`) closes `PAGE_ACTION_ROWS` and `pageMetaMenuItems` as their last group (`:101-105`, `:116-134`), and `runPageAction`'s `title:delete` case runs it for every host (`Core/Interface/Menus/pageMenuActions.ts:66-68`).

**Container Delete Isn't Bottom-Most:** the container branch, shared by Collections and Sets, puts Delete in a `[Rename, Delete]` group above the lock, Copy Path, and Reveal group (`Core/Actions/entityMenu.ts:60-80`). Spaces and Contexts have their own Delete (`:95`), which I-1 leaves alone.

##### Windows

Floating windows hold their content in session slots. The File History window has one slot that names the page it shows, isn't remembered across relaunch, and closes when its page leaves the tree.

**The History Slot:** one nullable `historyTarget`, absent from the persisted window sets (`Core/Session/windowSlice.ts:30`, `:129-143`). On every tree change it reconciles through `reconcileWith` (`windowSlice.ts:279-281`), which keeps an id the tree doesn't hold only under a withheld folder (`reconcileSelection.ts:33-41`; `withheldIn`, `treePatch.ts:266-269`), so an archived target would close. `trailOf` answers `NO_TRAIL` for an id the tree doesn't hold (`treeIndex.ts:132-133`), so the title would read blank.

**The History Body Caches:** the current body reads through `fetchPageDetail` (`PageHistoryWindow.tsx:100-110`), which seeds the page-detail cache. `page:open` reads any path under the root with no tree check (`Core/Pages/handlers.ts:18-24`).

**The Leading Slot:** `WindowBase` renders the open-fullscreen button only when `onScan` is passed, then `lead` (`UIX/Windows/WindowBase.tsx:242-254`), so H-1's lock glyph needs no `WindowBase` change.

**Parked Hosts Translate:** `.is-parked` uses `translate: -200vw` (`Core/Interface/interface.css:40-46`) and the pane slide animates `transform` (`UIX/Animations/motion.ts:58-66`), each a containing block for a fixed descendant, so an ActionLabel drawn inside a host would mis-position.

##### File History

Pommora takes snapshots only of pages in the tree and keeps them in a device-local store keyed by page id. One cutoff, History Timeframe, decides which snapshots a sweep deletes.

**Capture Is Tree-Keyed:** `writeBody` and `noteExternalEdit` key by `liveIdOf`, and restore and capture-from-disk by `livePathOf` (`fileHistory.ts:89`, `:117`, `:136`, `:174`), so an archived page gains no snapshots. Snapshots key on `page_id` (`Desktop/Store/versionsDb.ts:7-14`), so they survive the moves.

**The Sweep:** `sweepFileHistory` computes one cutoff from `keepMs` and runs `sweepSnapshots` and `sweepCaptures` with it (`fileHistory.ts:194-203`; `versionsDb.ts:71-73`), at open before the tree read (`Core/Nexus/handlers.ts:85-86`) and on a `historyDays` write in the `personalization:set` handler (`Core/Settings/handlers.ts:42-48`). `historyDays` steps 7/14/30/60/90 with 90 as default (`Core/Settings/personalization.ts:42`, `:189`).

**The Stepped Picker:** a `zoom` settings row renders through `steppedPickerProps` (`Core/Settings/SettingsWindow.tsx:255-266`; `UIX/Pickers/PickerControl.tsx:36-68`), whose options are `{value, label, icon?}` with no dimmed or disabled state (`PickerControl.tsx:10-14`), and whose typed entry clamps to the range's own minimum and maximum (`:62-65`).

##### Settings, Confirmations, and Notices

A setting is one line in a shared list, from which its default, range, and handler derive. A delete asks first under one switch, and a delete that goes to the Trash posts a notice whose Undo restores it.

**Settings:** a key is one line in `SETTINGS` (`personalization.ts:136-225`). The Deletion section holds Confirm Before Deletion, Permanently Delete Files, and Restore Links On Deletion (`Core/Settings/frames.ts:582-604`); File History follows (`:605-625`); the Trash frame is the foot surface (`:903-909`). The Permanently Delete Files hint (`frames.ts:595`) reads as if the setting governed every deletion, while `askEmptyTrash` (`Core/Interface/Confirm/confirmations.ts:162-173`) and ConfigurationPM (`.claude/Features/ConfigurationPM.md:116`) apply it to emptying the Trash; K-5 rewrites it.

**Confirmations:** `ALWAYS_ASKS` makes Collection, Set, Space, and Context deletes ask regardless of the switch (`confirmations.ts:28-38`). Undo spends live in `armed`, keyed by bundle path (`:40-46`), and `notifyTrashed` wraps `notifyDeleted`, which fixes the verb "Deleted" (`Core/Interface/Notifications/notifications.ts:84-101`), around `notifyUndoable` (`:106-137`).

**The Notice Stalls Near the Pointer:** the dwell drains by animation frame and slows to a stop while `trackNear` reports the pointer near (`Core/Interface/Notifications/NotificationLabel.tsx:33-74`), so a notice posted under the pointer holds until the pointer leaves. K-3 fixes this at the source.

---

#### What Leaves, Narrows, and Changes

Each row names code that exists today and what the Archive work does to it. Rough lines are source lines, excluding tests and docs.

| What | Where | Change | Decision | Rough Lines |
| --- | --- | --- | --- | --- |
| `deleteCascade`'s tree filter and twin branch | `Core/Nexus/cascade.ts:101-119` | The strip runs on governed reach; the twin rule becomes the one governed reach applies (`keyedHolders`' first-claimant rule, `keyHolders.ts:61-64`) | C-2, C-3 | −18 / +4 |
| The five `query… ?? nexusCorpus(root)` fallbacks and six governed-scope compositions | `cascade.ts:87`, `:221`; `contextCascade.ts:72`; `keyHolders.ts:17`, `:28`; the six `collectionFolders` sites | Two named reaches, `contentReach` and `governedReach`, the second taking a scope that carries the archive prefix apart from the Collection sidecar list | C-3 | −25 / +25 |
| `recordById(tree)` at the refill sites | `assignment.ts:81`; `spend.ts:250`; `restoreProperty.ts:57` | One by-id map (tree and Archive) in `heldPages.ts`, beside the live lookups | C-3 | −3 / +12 |
| `sweepCount` | `governedSweep.ts:113-114` | Leaves archived files out of the count | C-4 | +2 |
| `outsideContent` | `exclusion.ts:77-82` | Admits paths strictly inside `.nexus/archive/` | B-1 | +3 |
| `corpusFiles` | `walk.ts:41-43` | Walks the content root and the archive root | B-1 | +2 |
| `owningCollection` | `treePatch.ts:84-91` | One arm resolving an archived path's Collection by its id segment | B-2 | +3 |
| `reachConfig`'s container list | `configReach.ts:312-317` | Gains archived Set sidecars from the resolver | C-1 | +4 |
| The excluded-folder lift | `Core/Nexus/folderEntity.ts`, beside `relocateFolder` (new) | One step, called by the archive op and `deleteOp` in both Trash modes | F-2, F-3 | +20 |
| `followExcludedFolders` | `settings.ts:97-106`; `folderEntity.ts:30-32` | Replaced inside `relocateFolder` by a crash-safe carry: destination entries written before the rename, source entries dropped after | K-1 | +4 |
| The Trash's excluded bookkeeping | `record.ts:38-39`; `gather.ts:72`; `settings.ts:118-127`; `delete.ts:109`; `spend.ts:177`, `:216-219` | Deleted: a trashed container holds no excluded folder | F-3 | −17 |
| F-007 | `.claude/IssuesPM.md:13`, `:148-160` | Closed: the bundle never holds excluded content | F-3 | — |
| `emptyBundle` and the system-trash delete | `spend.ts:66-103`; `delete.ts:46-48`, `:100` | Dispose a Collection's Archive by `record.id` | F-4 | +12 |
| Orphaned Archives | the open, after the seed | Moves each item of an Archive whose id names nothing into the Trash | F-5 | +20 |
| `loadValues`' full read | `loadValues.ts:8-18` | Reads the tree's pages under the container; `folderCorpus` keeps one caller | K-2 | ±0, −1 export |
| Whole-index reads | `matrixGraph.ts:20`; `handlers.ts:166-168` | Trimmed host-side to tree paths | K-2 | +3 |
| `resolveRecord`, `findContainerById`, `Refusal`, `withDestination`, `REFUSAL_TEXT` | `resolve.ts`; `spend.ts:51-56`, `:107-128` | Hoisted to the neutral placement owner shared by the Trash and the Archive | A-4, E-1 | ±0 (moved) |
| Restore position, both stores | the records; the shared placement owner | Each record keeps the item's place in its origin's order, and the landing restores it; the fold it rides is the planner's (*§Restore Placement, Order, and Name Conflicts*) | E-2 | +10 |
| The restore's `exists` refusal and landing refusal | `spend.ts:174-182` | The landing steps aside through the one naming rule, asking the disk as well as the tree | E-4 | −3 / +6 |
| Bundle store helpers | `bundle.ts:11-39`; `record.ts:82-113`; `holdings.ts:24-46`; `spend.ts:58-64` | Parameterized by store root and suffix, with a flat layout for the Archive | Open Item 1 | +6 |
| `trashRowOf`/`TrashRow` | `trashRows.ts`; `Core/Trash/trashRow.ts`; `Core/Contract/bridge.ts` | One row shape for both stores under a neutral name | A-4, G-2 | ±0 |
| `restoreArtifact` | `spend.ts:143-323` | Split by kind, since the unarchive shares only placement | A-3 | 0 to −20 |
| `trashMenu.ts` + `fileHistoryMenu.ts` | 45 lines | One Restore and Delete builder serving the Trash, File History, and the Archive | K-4 | −12 / +6 |
| The Trash's open-pick-store date wrapper | `TrashFrame.tsx:65-69`, `:153-159` | One date-column hook shared with ArchiveView | G-1 | −10 / +14 |
| The batch runner and `countPhrase` | `TrashFrame.tsx:36-50`, `:99-151` | Hoisted below the visual layer | G-1, G-6 | −50 / +45 |
| The checked-row batch rule | `TrashFrame.tsx:161-165`; `PageHistoryWindow.tsx:139` | One rule: checked rows in view, or the clicked row alone | G-6 | −4 / +6 |
| The dead `// PLACEHOLDER` More button | `ViewFrame.tsx:108-116` | Replaced by the Archive button | G-4 | −9 / +6 |
| `DELETE_ROW` and the container Delete literal | `pageMenu.ts:40`, `:104`, `:132`; `pageMenuActions.ts:66`; `entityMenu.ts:64-67` | A closing pair `[ARCHIVE_ROW, DELETE_ROW]` with one `title:archive` case for pages; the container branch's Delete moves into its own bottom section, joined by Archive for Sets and alone for Collections | I-1 | +11 |
| The place kind's id | `navRef.ts`; ArchiveView's listing | The archive place names a Collection or a top-level Set, and a Set's ArchiveView lists its Collection's store narrowed by origin | G-4 | +8 |
| `historyTarget`, `openHistory`/`closeHistory` | `windowSlice.ts:30`, `:142-143`, `:279-281` | One typed reader slot reconciled by kind | H-1 | ±0 to +6 |
| `PageHistoryWindow.tsx` and its History-only class and sentinel | `PageHistoryWindow.tsx`; `page-window.css:30-36`; `markdown-pm.css:72` | One read-only reader window with History and Archive branches, renamed neutrally, the lock glyph in both, and an uncached `page:open` in both | H-1 | +40 to +55 |
| `spendBundle`/`armed`, `waived(kind)` | `confirmations.ts:36-46` | `spendUndo(key)`; `waived(key, kind?)` | I-2, I-3 | +1 |
| `sweepSnapshots(cutoff)` and the open-time sweep's position | `versionsDb.ts:71-73`; `Core/Platform/stores.ts:82-90`; `Core/Nexus/handlers.ts:86` | One statement with the archive cutoff applied to archived ids, run after the seed | J-1 | +10 |
| The `historyDays` write | `Core/Settings/handlers.ts:46` | Also switches the archive timeframe down when it would exceed the new value | J-1 | +3 |
| `PickerOption` | `UIX/Pickers/PickerControl.tsx:10-14` | Gains the dimmed state J-1's longer steps show | J-1 | +6 |
| The notice's arming | `NotificationLabel.tsx:61-74` | A notice posted with the pointer already near stays unarmed until the pointer leaves once | K-3 | +4 |
| The Permanently Delete Files hint | `frames.ts:595` | Reworded to match `askEmptyTrash` and ConfigurationPM | K-5 | 0 |
| `NON_CORPUS_TOP`'s comment, `destinationTree.ts:1`, `mutateRequest.ts:88` | Comments already false | Rewritten to read true | K-5 | 0 |

**Net:** the rows above come to roughly −160 / +310, about +150, taking the ranged rows at their midpoints. The new surface adds about +400: the Archive domain's archive, unarchive, and delete-from-archive ops and handler (about 110), ArchiveView (about 130), the archive place kind (about 75), ActionLabel and its slot (about 70), the header's trailing node (about 8), and the settings keys and rows (about 6). The whole effort comes to roughly +550. The positive part is new required behavior: the Archive itself, its view, its place, and the exact-position and step-aside restores both stores gain. The sharing is what keeps it from growing further, since a second browser runner, date wrapper, menu builder, and reader window beside the Trash's and History's would add roughly another 150.

---

#### What's Reusable

- **The Corpus, Index, and Watch Machinery:** once `outsideContent` admits the Archive, `indexEvent`, `moveIndexPaths`, the seed, the watcher, and sync carry archived pages unchanged (*§Where `.nexus/archive/` Stands Today*).
- **The Record and Placement:** `contentRecord('page' | 'set')`, `gatherContentRecord` (the parent is right while the item is still in the tree), and `resolveRecord`'s container arm serve the Archive unchanged; `withDestination` and `containerTargets` serve rows whose origin is gone.
- **The Bundle Shape:** `mintBundle`, `readRecord`, `writeRecord`, `bundleArtifact`, `listBundles`, `openBundle`, `deletedAtOf`, and `trashRowOf` serve a second store once parameterized.
- **The Order the Move Already Carries:** `movePage`/`moveSet`'s `order` and `setChildOrder` write a destination order in the same op, and `spliceBeside` composes one around an anchor (*§Order and Page Metadata*).
- **The Disk-Asking Name Rule:** `createDisambiguated` steps aside on `exists` with `freeName`'s base rule (`names.ts:66-79`).
- **The Undo:** `notifyUndoable`, the chord, and the dwell countdown; archiving posts through them with no new mechanism.
- **The Settle's Relink:** `addressed`'s before-and-after diff re-spells for an unarchive's arrival, since `settledIndex` is tree-based.
- **The Read-Only Editor:** `readOnly`, the inert editor host, and the sentinel embed ancestor, all already in the History window.
- **The Entry Button and Footing:** `Button type="filled" size="button-inline" pressed` in `MenuFooting`'s `leading`, with no UIX change.
- **The Index's Path-to-Id Map:** `readIndexedStats(prefix)` answers archived ids for the by-id map and the history sweep.
- **The Count Producer:** one `sweepCount` behind every confirmation.

---

#### Approaches

Each section opens with what the design will do in plain terms, names the decisions that settle it, and marks what the plan still decides.

##### The Single Exception

**Settled By:** B-1. The Archive is the one folder the hidden-folder rule admits for cascades, the index, the watcher, and sync, while the tree and discovery still leave it out. B-1's example: a Collection `Alpha`, whose id is `01J…`, holds a Set `Beta` with a page `Notes.md` and a hidden folder `_raw/`; archiving `Beta` moves all three into `.nexus/archive/01J…/`, after which the sidebar, views, search, and link suggestions no longer show `Beta` or `Notes`, a property rename sweeping `Alpha` still rewrites `Notes.md`, sync carries the move as a move, and `_raw/` stays ignored.

**Options for How:** (a) admit the bare `.nexus` directory plus `.nexus/archive/**` in `outsideContent`, and guard the three root-adoption sites (`readNexus.ts:327-328`, `adopt.ts:183`, `folderKind.ts:96-105`) so `.nexus` never adopts as a Collection; (b) keep `.nexus` and `.nexus/archive` themselves `'hidden'`, admit only paths strictly inside `.nexus/archive/`, and start the corpus walk at both roots.

**Trade-Offs:** (a) lets the walker enter `.nexus` through one predicate but opens the tree callers to `.nexus`, which the same predicate closes today, and would admit `.md` files under `.nexus/interface/homepage` unless the arm narrows again. (b) leaves every tree and adoption caller untouched, since none ever asks about a path inside `.nexus`, and costs one more starting directory in `corpusFiles`.

**Recommendation:** (b), as the planner's call within B-1. The exception reads as one arm in `outsideContent` that admits a path whose first two segments are `.nexus/archive` and whose remaining segments pass the hidden rule, so a hidden folder inside the Archive stays hidden (B-1's `_raw/`). The watcher, `manifestAdmits`, `classifyEvent`, and `applyMove` need nothing. The enumerators that honor it:

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
| Clear Exclusion Cache | `exclusionScan.ts:31-95` | Unaffected, since excluded folders sit outside `.nexus` |
| The Trash's lister and scrub | `walk.ts:31-39`; `restoreScrub.ts:122-133` | Unaffected, since the Archive never rides a bundle |

**Hidden Folders Inside an Archived Set:** the arm admits a path only when its segments past `.nexus/archive` pass the hidden rule, so a `.x` or `_x` folder inside an archived Set stays outside the index and every cascade, and `neverWatched` holds it to `hiddenFolder` on the way (`exclusion.ts:26-36`), so it stays unwatched and unsynced, as inside a live Set. Bundle folders begin with a digit stamp (`bundle.ts:26-29`), so they never read as hidden.

##### The Location Resolver

**Settled By:** B-2. Every part of the app that needs the Archive asks one module where it is, so its location can change in one place.

**Shape:** one module, `Core/Archive/archivePaths.ts`, exporting `ARCHIVE_DIR_REL` (`.nexus/archive`, declared in `nexusPaths.ts` beside `METADATA_DIR_REL`), `archiveDirOf(collectionId)`, `archivedCollectionIdOf(rel)` (the third segment, or null), `inArchive(segs)` (the predicate `outsideContent` and `normalizeExclusions` call), `archiveDirs(root)` (one `listEntries` of the archive root), and `contentRoots(root)` (the root and the archive root, for the two walkers). `owningCollection` answers an archived path through `archivedCollectionIdOf`, so `containerSchema` and every schema reader follow.

**Consumers:** `exclusion.ts`, `codec.ts`, `walk.ts`, `assetMigrate.ts`, governed reach, `owningCollection`, `reachConfig`, the archive, unarchive, and delete-from-archive ops, ArchiveView's listing, the Trash's disposal arms, the orphan check, the history sweep, and `sweepCount`.

**What Follows From Filing by Id:** B-2's example: renaming `Alpha` to `Projects` changes nothing under `.nexus/archive/01J…/`, and `Projects`' ArchiveView still lists `Beta`; sending `Alpha` to the Trash leaves the folder where it is, and restoring `Alpha` reconnects it by the same id. The location isn't recorded in `_pagecollection.json`, since it derives from the id and a stored copy would be a second source of truth (B-2).

**What Stays Easy to Change:** the folder name, its depth, and how it's keyed are each a resolver change. Data already written is the exception: once Archives exist on users' Nexuses and their peers, moving them is a migration with sync consequences.

##### The Origin Record

**Settled By:** the record's contents are fixed by Open Item 1: the item's kind, its origin's id (E-1), its archived time (B-4), its exact place in its origin's order (E-2), and its origin path at archive time, so path links re-spell to where it lands (D-1). **Planner's Call:** the shape and storage.

**Options:** (a) one `_archive.json` per Collection Archive mapping each archived id to its record, with items stored flat; (b) one bundle per archived item, `.nexus/archive/<ID>/<stamp>__<leaf>.archived/`, holding the artifact and a `_record.json` from `contentRecord('page' | 'set')`.

**Trade-Offs:** (a) keeps plain filenames, but two archived `Notes.md` from different Sets collide in the flat folder, so archiving renames through `freeName` and the restore undoes it; the sidecar isn't in `OWN_NAMES` (`Core/Sync/Arrival/mergePolicy.ts:13-21`), so it lands whole on sync and two devices archiving concurrently lose one record unless it joins the merged names; an entry drifts from its file after a hand-move; and it's a second record format beside the Trash's. (b) reuses the record, bundle, listing, row, placement, and time source the Trash already has, holds a Set's folder artifact as easily as a page, never collides, writes once per item, and travels with its artifact. Its cost is depth: archived pages sit inside stamped folders, which the Trash already accepts.

**Recommendation:** (b), flat, one bundle level under the Collection's Archive directory. The record adds the origin path beside the parent id, as the delete's `targets` already record paths beside ids, and the place in its origin's order (*§Restore Placement, Order, and Name Conflicts*). Whether the archived time is the bundle stamp, as the Trash's is, or a record field is the planner's call. A Set bundle carries one archived time for everything inside it, so a later auto-delete expires a Set as one unit (the log's *§Prospects · Auto-Delete*).

##### Lifecycle With the Collection's Trash and Orphans

**Settled By:** F-4 and F-5. A Collection's Archive stays where it is while the Collection sits in the Trash and reconnects by id when it comes back; emptying or system-deleting the Collection empties its Archive too; and an Archive whose Collection exists nowhere has its items moved into the Trash at the next open.

**What F-4 Needs:** nothing at the delete or restore, since the Archive stays in reach while its Collection is trashed (*§The Reach Definition*) and returns current. `emptyBundle` disposes `.nexus/archive/<record.id>` when the bundle holds a Collection (list its pages for metadata and the strip, then remove the directory), and the system-trash delete does the same, about +12 lines across the two.

**What F-5 Needs:** at open, after the seed, each item of an Archive whose id names no tree Collection, no Trash bundle's record, and no excluded folder's sidecar moves into the Trash as a bundle whose origin is gone, reusing the destination picker, about +20 lines, once per open. An Archive can lose its Collection when the Collection is deleted in Finder, when its sidecar becomes unreadable (`Unreadable` carries no id, `Core/Nexus/tree.ts:109-112`), or when Clear Exclusion Cache deletes an excluded Collection's sidecar (`exclusionScan.ts:31-95`). The check can't tell that last case from a deleted Collection, so such an Archive lands in the Trash too, recoverably.

##### The Reach Definition

**Settled By:** C-1, C-2, and C-3. Every cascade that rewrites live pages also rewrites archived ones, and the five separately defined reaches become two named ones plus a by-id map, each including the Archive.

**Shape:** `governedReach` scopes by Collection folder prefix, plus the archive root as one more prefix for the whole-Nexus sweeps, plus `archiveDirOf(sidecarId(folder))` for Remove, the one single-Collection scope (`removeProperty.ts:36-38`). The mapping sits at the scope step (`keyHolders.ts:17`, `:28`) rather than in `collectionFolders`, because that list doubles as the Collection sidecar list (*§Cascade Reach Today*). The whole-root prefix also covers damaged Collections, whose ids the tree can't name. `contentReach` stays unscoped. Each states its reason once: a property key means something only where a schema governs (NexusOS's bare `Status:` is never rekeyed), while a link or `<Context>` key is Pommora syntax wherever it's written. The heading arm stays index-only, which is why the Archive must be indexed and not merely enumerable. The schema and Context journals recompute reach through the same plans on replay (`replaySchemaCascade.ts:37-90`; `contextCascade.ts:290-352`), so replay gains the Archive with no journal change. The delete's Link strip runs on governed reach, so it reaches archived pages (C-2) and, as today, leaves loose root pages and Agenda pages unstripped.

**Configuration Reach:** C-3 keeps it its own. Under C-1's "a restore returns a page that's already current", `reachConfig`'s container list gains archived Set sidecars, so their saved views stay current; the plan confirms this reading.

##### By-ID Reach

**Settled By:** C-3's by-id map. **Planner's Call:** its shape.

**Options:** widen `livePathOf`/`liveIdIndex` in place, or add a by-id projection beside them.

**Recommendation:** the projection, in `heldPages.ts`, built from `recordById(tree)` plus `readIndexedStats(ARCHIVE_DIR_REL)`, with `writablePathsOf`'s null-on-twin rule over the union, handed to `sweepRootsById` at the three refill sites. That closes the Link refill, the Context re-tag, the reassign refill, and the property restore gaps; `refillTrashed` then receives only ids found nowhere, its stated purpose. The live lookups stay tree-only for the outside-move pairing, `loadValues`, file history, and sync captures. **Concern:** the index answers null before it's ready, so a restore in that window needs the corpus fallback the other reaches have (a walk of the archive root), or it refills nothing.

##### Counts

**Settled By:** C-4. Confirmations count only live items, while the operation they confirm also sweeps archived ones, and the copy keeps reading "Items" with Space sidecars counted.

**Shape:** filter `sweepCount`'s touched keys through `inArchive` (+2), the only count producer. `bothKeyHolders`' clash refusal (`registryProperty.ts:124-130`, `:153-155`) isn't a count and includes archived pages, or a rename silently drops the old value on an archived page holding both keys.

##### Discovery Exclusion

**Settled By:** D-2 and K-2. Leaving the tree already hides an archived item from every discovery surface, so no new filter is added. K-2 trims `readMatrixGraph` and `index:headings` to tree paths host-side (+3), which also stops shipping Agenda, loose, and withheld rows today, and has `loadValues` read tree pages rather than `folderCorpus`.

##### Inbound Links and Title Collisions

**Settled By:** D-1. While a page is archived, links naming it read unresolved and Link values naming it stay in place; on restore they resolve again.

**What the Code Does Today:** links naming an archived page aren't maintained while it's archived, since it's absent from `respellings`. If its Set is renamed, a path link naming it stays on the old path. If another page holds the same title, a link naming it by title alone resolves to that page while it's archived, since resolution reads only the tree.

**Shape:** the unarchive runs through the settle's relink as an arrival and maps the record's origin path keys to the landed path, as a move re-spells, so path links follow it home. Title-only links that resolved to a namesake while it was away stay with the namesake (D-1).

##### Excluded Folders When a Container Leaves the Tree

**Settled By:** F-2, F-3, and K-1. A Set or Collection leaving the tree, archived or trashed, leaves every excluded folder inside it behind in its parent. F-2's example: `Alpha` holds a Set `Beta`, and inside `Beta` sits `Omega`, listed in Settings › Exclusions. Archiving `Beta` first moves `Omega` up into `Alpha`, where `Beta` was, and rewrites its exclusion entry to `Alpha/Omega`, so it stays excluded; then `Beta` and everything Pommora manages in it move into the Archive. Restoring `Beta` brings it back as `Alpha/Beta` without `Omega`, which stays at `Alpha/Omega`. A deeper entry (`Alpha/Beta/Gamma/Omega`) lands in `Alpha` too, and a trashed Collection's excluded folders land at the Nexus root (F-3).

**The One Shared Step:** `leaveExcludedBehind(root, containerAbs)` in `Core/Nexus/folderEntity.ts`, beside `relocateFolder`, since it's a folder-entity move. It reads `excludedWithin` (`settings.ts:86-88`), keeps the outermost entries (a nested entry rides its outer one), names each landing with `freeName` against the parent's on-disk entries (excluded folders aren't in the tree, so tree siblings alone would miss them; the container's own name is among them, so its restore never meets a lifted namesake), and moves each through `relocateFolder`. Its callers are the archive op and `deleteOp`, in Nexus Trash and system trash alike (F-3); nothing else moves a container out of the tree, since a Set move and a rename keep it in the tree and carry entries as today. `exclusionWriteRefusal` (`settings.ts:108-116`) gates it before anything moves, as `delete.ts:41-44` does now. A folder lifted to the Nexus root never adopts as a Collection, since its entry follows it and the root read and `stampAdopted` skip any excluded root folder through `outsideContent` (`readNexus.ts:327-328`; `adopt.ts:183`).

**Ordering and Crashes:** the lift runs before the container's own move, so excluded content never passes through the Archive or a bundle and sync never sees it there; a crash after some lifts leaves the container in place with those folders already beside it, still excluded, and the operation can run again.

**The Crash-Safe Carry (K-1):** `followExcludedFolders` is semantically right for the lift, since moving each lifted folder from `P/S/E` to `P/E′` rewrites its entry and every entry under it, but it runs after the rename (*§Excluded Entries*). K-1 replaces it inside `relocateFolder` with a carry that writes the destination entries before the rename and drops the source entries after, so the folder is excluded at whichever path a crash leaves it, for the lift and for every Set rename and move. **Planner's Call:** `applyMove` walks and reseeds when an entry already names the landing (`fileEvents.ts:574-577`), so a pre-written entry costs one walk per carry unless that check learns the carry's own entries.

**What Leaves:** the Trash record's `excluded` field (`record.ts:38-39`), its gather (`gather.ts:72`), `releaseExcludedFolders` and `reseatExcludedFolders` (`settings.ts:118-127`), the release at delete (`delete.ts:109`), and the restore's refusal over recorded entries and its reseat (`spend.ts:177`, `:216-219`), about −17 lines, with F-007, since no bundle holds excluded content. No live record holds a non-empty `excluded` list, so nothing needs carrying over.

**The Behavior Change:** a system-trash delete of a container holding an excluded folder leaves that folder in place rather than sending it to the system trash, and emptying the Trash never deletes excluded content (F-3).

**Restoring Into an Origin Excluded Since:** `resolveRecord` answers `parent-gone` (`resolve.ts:76-80`), and the row takes the destination picker, as the Trash's does (F-1).

##### Restore Placement, Order, and Name Conflicts

**Settled By:** E-1, E-2, E-4, and E-5. A restored item goes back to the Collection or Set it came from, found by id after renames and moves, into its exact place in that list, and steps aside to `Name (2)` when its name is taken, checking the disk as well as the tree. The Trash's restore gains the same exact place and the same step-aside.

**Placement (E-1, E-5):** the hoisted `resolveRecord` resolves the origin by id against the current tree. An origin that's been trashed and restored resolves again by id; an origin still in the Trash, excluded, or gone answers `parent-gone`, and the row asks for a destination. **Planner's Call:** an origin Set that has itself been archived is absent from the tree, so `resolveRecord` answers `parent-gone` for it as well; whether that stands or the restore lands elsewhere is unsettled by the log.

**Exact Position (E-2):** today the Trash keeps a deleted id in `page_order` and recovers the slot only until the folder's order is next written (*§Order and Page Metadata*), and an archive built on `movePageOp`/`moveSetOp` would lose it at once through `dropFromChildOrder` (`move.ts:37`, `:63`). E-2 asks for the exact place in both stores, reached through the highest-level fold of what already orders pages rather than a mechanism beside it. **Candidate:** each record keeps the item's place, such as its next sibling's id, and the landing composes the destination's order with `spliceBeside` (`creationOrder.ts:12-28`) and writes it through the `order` the move already carries (`move.ts:38`, `:64`), which the Trash's record gains alongside the Archive's under A-3. **Planner's Call:** which fold E-2 names, whether the place is a neighbor id or an index, and whether views' `manual_order`, which already keeps an absent id (`creationOrder.ts:30-51`), needs anything.

**Name Conflicts (E-4):** `resolveRecord` steps aside through `freeName` over tree siblings, while the landing refuses an excluded or asset name (`folderEntity.ts:20-28`) and refuses a squatter the tree doesn't know (`spend.ts:180-182`). E-4 has both stores step aside instead, asking the disk through the same base rule `createDisambiguated` applies (`names.ts:66-79`), with the notice naming the title taken. A "Resolve Restoration Conflicts" setting is deferred as IssuesPM F-080, folded in only if it proves natural.

##### Delete From the Archive and Restore From the Trash

**Settled By:** E-3. An item deleted from the Archive goes to the Trash, and restoring it from the Trash returns it to where it was archived from.

**Shape:** `deleteOp` accepts an archive bundle as a source beside `mutableTarget`, takes `parent` from the archive record, mints the `.trash` chain from the origin container's current path so the Trash's crumbs read where it lived, builds the strip's `paths` from the archived pages mapped to their origin keys, gathers a Set's gone ids from its sidecars on disk for `goneEdit`, and removes the emptied archive bundle.

##### The Shared Browser

**Settled By:** G-1, G-2, and K-4. ArchiveView looks like a standard table view with full-length dividers, a Title column that shows where each item lived beneath its title, and an Archived column; it shares data, selection, menus, the date style, and the batch runner with the Trash browser below the visual layer, while the Trash keeps its look.

**Shape:** a small table in `Core/Archive/ArchiveView.tsx` on the shared sheet, wearing TableView's shell once `table-view.css`'s shell rules move to `UIX/Table/`, with the compact checkbox in the grip gutter. The Title cell carries the origin trail, as the Trash's rows do. Search reads the tab's `viewSearch` query through the same `matchQuery` path the Trash uses. One Restore and Delete menu builder serves the Trash, File History, and the Archive (K-4). **Planner's Call:** how a Set row presents its archived pages (Scout D proposes disclosing them inline with `--row-indent`), whether the date column's style shares the Trash's personalization key or gets its own, and whether ArchiveView shows the Collection's banner and what the toolbar's views and sliders buttons show while it's open.

##### ArchiveView as a Place

**Settled By:** G-4 and G-5. ArchiveView is a place in the content pane like any other: Back and Forward reach it, and a tab showing it reopens after relaunch. A Collection's ArchiveView lists everything archived from anywhere in it, and a top-level Set's lists what was archived from within that Set.

**Shape:** a place kind `{ kind: 'archive'; id }` on the Matrix precedent, whose id names a Collection or a top-level Set, added to `SelectionState`, `NavRef`, and `NAV_KINDS`, with each exhaustive switch answering it and `searchEntriesOf` leaving it out; `searchView` and `ViewMenu` admit it. The store stays one per Collection, and a Set's ArchiveView is that store narrowed by origin. **Planner's Call:** the narrowing has to count items archived from the Set's sub-Sets, so it reads origin ancestry, which the record's origin path (Open Item 1) answers even when the origin is gone. A flag on the Collection target would make every `kind === 'collection'` check treat ArchiveView as the Collection, and a pseudo-view writes browsing state into synced data (the log's *Rejected · The Archive as a Saved View*).

##### The Entry Button and Header

**Settled By:** G-3 and G-4. The Archive button sits in the views dropdown's footing to the right of the New View `+`, highlighted while ArchiveView shows, toggling between the view and ArchiveView; the header shows the Collection's or Set's title with "Archive" as a trailing label in `label-tertiary`.

**Shape:** the button replaces the placeholder in the footing's `leading`, after `FootingCreate`; pressing it selects the archive place or its Collection or Set, so the toggle is a Back and Forward step. `DetailTitleHeader` gains an optional trailing node after `.detail-title-clear`, threaded from `InterfaceScaffold`, so the clear button pads against the label.

##### ActionLabel

**Settled By:** G-6, G-7, and K-3. Checked rows offer Restore and Delete by right-click and through ActionLabel, a bar in the window's top-right label position reading `[Restore | N Pages  (trash icon)]`; it's its own component, and either press posts the Undo notice.

**Shape:** ActionLabel shares the label chrome and `paneSlide` entrance with `NotificationLabel` through a hoisted style and reuses the existing hover and reveal primitives, rendered by one App-level host beside the notice, since a fixed box inside a parked or sliding host mis-positions. The surface declares its bar through a small store-free channel, and the host yields while a notice shows. K-3 fixes the stall at its source: a notice posted with the pointer already within `NEAR_RADIUS` stays unarmed until the pointer leaves once (+4). **Planner's Call:** the count's copy for Set rows and mixed batches, where `countPhrase` already reads "1 set, 3 pages" (Open Item 2).

##### The Reader Window

**Settled By:** H-1. An archived page opens in one read-only window, built from the File History window, that shows a single page, keeps no cache, and isn't remembered across relaunch, with a lock glyph meaning read-only in the toolbar's leading slot; the File History window, as the same window, shows the lock too.

**Shape:** one window, generalized from `PageHistoryWindow.tsx` and renamed `PageReaderWindow.tsx`, with a typed slot `reader: { kind: 'history' | 'archive'; page }`. The archive branch omits `onScan`, passes the lock glyph as `lead`, reads its body with an uncached `page:open`, builds its title from the origin record, and closes when the item leaves the Archive by the Archive's change signal, shared with the Trash's `trashChanged`. The History branch reads uncached too, dropping `fetchPageDetail`. Properties stay out of core scope (the log's *§Prospects · Read-Only Properties in the Reader Window*). **Planner's Call:** whether the archive branch offers Restore in the toolbar, whether the two branches share one remembered size, and whether a cascade rewriting an open archived page re-reads it.

##### The History Timeframe

**Settled By:** J-1. A Nexus-level archive history timeframe offers History Timeframe's own steps and starts at its value; steps longer than the active History Timeframe show dimmed, and shortening History Timeframe below it switches the archive timeframe down to match, while lengthening History Timeframe afterwards leaves it where it was (INFERRED).

**What the Ruling Implies:** a write-side rule. The `personalization:set` handler that writes `historyDays` and triggers the sweep (`Core/Settings/handlers.ts:46`) also writes `archiveHistoryDays` down whenever it would exceed the new value, so the stored archive value never exceeds the live one and the sweep applies `archiveHistoryDays` to archived ids as stored. A read-side `min(historyDays, archiveHistoryDays)` would state the same bound a second time, and J-1's switch makes it unnecessary.

**Shape:** one sweep. `archiveHistoryDays` reuses `HISTORY_DAYS`' steps, and its row sits under History Timeframe. The sweep reads archived ids from `readIndexedStats(ARCHIVE_DIR_REL)` and runs one statement with both cutoffs; it moves after the seed, since the index answers null before it, and with no index it runs the live cutoff alone. A one-time trim at archive time is wrong over time and across devices, and a class column in `versions.db` is device-local state that drifts. **Planner's Call:** "starts at its value" needs either a default that coincides with History Timeframe's (both 90 today) or an unset state that reads History Timeframe's value, and the second follows History Timeframe upward, which the INFERRED reading doesn't; the dimmed steps need a dimmed state `PickerOption` doesn't have, and the typed entry clamps only to the range (*§File History · The Stepped Picker*).

##### Menus, Confirmations, and the Undo

**Settled By:** I-1, I-2, and I-3. Every menu that can delete a page or Set ends in one divided section holding Archive above Delete; a Collection's Delete moves into the same bottom section alone. Settings' Deletion section becomes "Trash & Archive" and gains Confirm Before Archiving, which governs pages and Sets alike. Archiving always posts the Undo notice.

**Shape:** the page menus gain Archive once, through the shared closing group and one `title:archive` case in `runPageAction`; the container branch's Delete moves out of `[Rename, Delete]` into its own last section. `waived` takes the setting key, so delete and archive read one predicate. The notice is `notifyUndoable("Archived “…”", unarchive)` with no segment, armed by the archive bundle path through `spendUndo`. The dialog's and notices' words are set at the plan's review (Open Item 2).

---

#### Rulings

The questions this investigation put to Nathan, each answered by a decision.

1. **Location:** the Archive stays at `.nexus/archive/<Collection ID>/`; `.nexus` isn't meant to be legible, and the orphan handling it needs is small (B-2, F-5).
2. **Lost Archives:** an Orphaned Archive's items move into the Trash at the next open, with no setting (F-5).
3. **Deleting a Folder That Holds an Excluded Folder:** excluded folders are left behind, even on a delete straight to the system trash (F-3).
4. **Same-Titled Pages:** title-only links that landed on a namesake stay with it (D-1).
5. **Restore Position:** a restored item returns to its exact place, and the Trash inherits it (E-2).
6. **Archiving a Set:** Confirm Before Archiving governs Sets too (I-2).
7. **Depth-1 Sets:** a top-level Set's views dropdown carries the Archive button, opening an ArchiveView of what was archived from within it (G-4).
8. **Where an Item Lived:** each row shows it beneath the title (G-2).
9. **The Lock Glyph:** it means read-only, shared with File History and the planned Page Lock (H-1).
10. **Archive History Range:** History Timeframe's steps, starting at its value, longer steps dimmed, switched down when History Timeframe is shortened below it (J-1).

---

#### Tests That Change

- `Core/Paths/exclusion.test.ts`: the hidden-at-any-depth cases gain the archive arm.
- `Core/Files/walk.test.ts`, `Core/Index/indexSeed.test.ts`: the corpus gains the archive root; `relCorpusPath` admits it.
- `Core/Nexus/cascade.test.ts`, `Core/Trash/deleteReach.test.ts`: the tree filter and twin count give way to governed reach and the one twin rule.
- `Core/Properties/keyHolders.test.ts`: the scope helpers fold into governed reach.
- `Core/Properties/assignment.test.ts`, `Core/Trash/spend.test.ts`, `Core/Trash/restoreProperty.test.ts`: refills reach archived ids.
- `Core/Trash/spend.test.ts`: restores land in their recorded place and step aside past a squatter or an excluded folder.
- `Core/Nexus/treePatch.test.ts`, `Core/Properties/repairSweep.test.ts`: `owningCollection`'s archive arm.
- `Core/Views/loadValues.test.ts`, `Core/Matrix/matrixGraph.test.ts`: tree-scoped reads.
- `Core/Trash/trashRows.test.ts`, `Core/Trash/deleteOrder.test.ts`: the parameterized store and the archive source.
- `Core/Actions/trashMenu.test.ts` + `fileHistoryMenu.test.ts`: collapse into one.
- `Core/Actions/pageMenu.test.ts`, `entityMenu.test.ts`, `cellMenu.test.ts`, `cardMenu.test.ts`: the last group gains Archive; the container branch's Delete moves to its own last section.
- `Core/Views/Settings/ViewFrame.test.tsx`: the footing.
- `Core/Navigation/navRef.test.ts`: the archive kind.
- `Core/Settings/TrashFrame.test.tsx`: the hoisted `filterRows`/`countPhrase` imports; the DOM tests stay.
- `Core/Interface/Notifications/NotificationLabel.test.tsx`: the arming rule.
- `Core/Session/windowSlice.test.ts`, `Core/Session/devicePrefsSeed.test.tsx`: the reader slot.
- `Core/Pages/fileHistory.test.ts`, `Desktop/Store/versionsDb.test.ts`: the archive cutoff in the sweep.
- `Core/Settings/handlers.test.ts`: the `historyDays` write switches the archive timeframe down.
- `Core/Interface/Confirm/confirmations.test.ts`: `spendUndo` and `waived`.
- `Core/Nexus/mutate.test.ts:3241-3320`: the follow cases gain the crash-safe carry and the lift; the Collection-restore half of `:3300` goes with the reseat.
- `Core/Nexus/fileEvents.test.ts:307`: follows whatever planning settles for the pre-written entry.
- `Core/Trash/deleteOrder.test.ts`, `Core/Trash/spend.test.ts`, `Core/Trash/trashRecovery.test.ts`: records lose `excluded`; deletes leave excluded folders behind.
- `Core/Testing/storesContract.ts`: stays valid; the store has no path filter.

---

#### What Becomes False

- `.claude/Features/CorePM.md:69` (*§Folder Exclusion*): the hidden rule gains the Archive as its one corpus exception; "Trashing one takes those entries into its Trash record, and restoring it puts them back" becomes the lift; and "Un-adopted folders… are indexed and cascade-reachable" is true for content reach only. *§The Device-Local Database*'s sweep line (`:118`) and the metadata lifetime row gain the Archive.
- `.claude/Features/NexusRecordPM.md:4`, `:8`, `:16`: provenance lives in two stores, records keep the item's place, and placement moves to its neutral owner.
- `.claude/Features/ConfigurationPM.md:111-124`: Deletion becomes Trash & Archive with Confirm Before Archiving; History Timeframe gains its archive sibling. `:259`: entries are carried on rename and move and left behind, with their folders, on archive and trash.
- `.claude/IssuesPM.md:13`, `:148-160`: F-007 closes.
- `.claude/Features/ViewTypesPM.md`: the footer, the one-seat `ViewHost` claim (ArchiveView mounts outside it), View Search's owner, and the table sheet's layering.
- `.claude/Features/InterfacePM.md:58`: the History window's name and role; the confirmation paragraph's "Deletion is the first act to use both."
- `.claude/Features/PommoraUIX.md:391`: `UIX/Table/` gains ArchiveView and the hoisted shell.
- `Core/Paths/nexusPaths.ts:7`, `Core/Actions/destinationTree.ts:1`, `Core/Nexus/mutateRequest.ts:88`, `Core/Settings/frames.ts:595`: already false (K-5).
- `Core/Paths/exclusion.ts:76`: `outsideContent`'s doc gains the Archive.
- `Core/Nexus/cascade.ts:72`, `:101`: the strip's reach.
- `Core/Nexus/heldPages.ts:1`: names the by-id projection beside the held tree's.
- `Core/Nexus/folderEntity.ts:30`: the carry's timing.
- `Core/Trash/holdings.ts:143`: `refillTrashed` stops being the catch-all for unknown ids.
- `Core/Trash/bundle.ts:13`, `Core/Trash/trashRow.ts:11`: the store and suffix generalize.
- `Core/Interface/Confirm/confirmations.ts:28`, `:42`, `:48`: the switch and spend comments.
- `Core/Views/Settings/ViewMenu.tsx:15`, `Core/Actions/trashMenu.ts:9`, `Core/Settings/TrashFrame.tsx:162`: the menu's render rule and the batch rule's home.

---

#### Reconciliation Log

##### Disagreements Resolved

- **Location and the Origin Record:** A and B recommended a visible kind-marked folder inside the Collection; C recommended Trash-style bundles in a per-Collection store. B-2 places the Archive at `.nexus/archive/<Collection ID>/`. The record's shape stays open under Open Item 1, where C's per-item bundle is recommended on the evidence (*§The Origin Record*).
- **The Refill Gap:** A's claim holds and widens: besides the Link refill (`spend.ts:299-304`), the Context re-tag (`spend.ts:335`), the reassign refill (`assignment.ts:81`), and the property restore (`restoreProperty.ts:57`, which A didn't list) all read the tree alone. C-3's by-id map closes all four.
- **Discovery Leaks:** B's three reads are verified and are costs, not leaks, since the renderer resolves through the tree; K-2 trims them. Under `.nexus/archive/` the `loadValues` cost B named doesn't arise.
- **The History Slot:** E's two claims hold (`windowSlice.ts:279-281`; `treeIndex.ts:132-133`).
- **Excluded Entries:** C's follow model can't work under `.nexus/archive/`, since `normalizeExclusions` drops entries there; F-2 lifts excluded folders out of a container before it leaves the tree, which retires the Trash's record of them (F-3).
- **The Hoisted Placement Owner:** C and D both place shared parts in a neutral home; A-4's `Core/Archive/` holds the Archive's ops and view, and the shared placement and bundle store sit in a neutral Trash-and-Archive owner, named in planning.

##### Weighed and Set Aside

- **A Visible Kind-Marked Folder (A's Approach 1, B's (e)):** zero hidden-rule exceptions and full legibility, but visible in Obsidian and Finder; set aside by B-1 (the log's *Rejected · A Visible Archive Folder*).
- **`<Collection>/_archive/`:** hidden from the app while visible in Finder and Obsidian (the log's *Rejected · `_archive`*).
- **`<Collection>/.archive/` and `.collection/`:** a per-Collection Archive would follow its Collection by path and can't be orphaned, but a stray user `.archive` folder anywhere would become reached, `folderCorpus(Collection)` would read archived pages, and `.collection/` would move every container sidecar with a migration; set aside by B-2 and F-5 (the log's *Rejected · A Per-Collection `.archive/`, and the `.collection/` Folder With It*).
- **Per-Collection Trash-Style Bundles (C's Approach A Location):** the record shape is kept, inside `.nexus/archive/<ID>/` (Open Item 1).
- **Moving a Collection's Archive Into Its Trash Bundle:** a second relocate at delete and restore, and the Archive out of reach while trashed; set aside by F-4.
- **Leaving Orphaned Archives in Place:** indexed and swept but reachable from no ArchiveView; set aside by F-5.
- **An Index Flag or an Unindexed Archive (B's C):** rejected by B on the evidence; nothing reopens it.
- **Hide in Place (C's C):** a flag on items left in the tree; set aside by D-2 (the log's *Rejected · Archived Pages Kept in the Tree Under a Hidden Flag*).
- **Excluded Subfolders of an Archived Set:** carrying the entry into the Archive by narrowing `nexusFolderRefusal`, refusing to archive such a Set, the Trash's record-and-reseat, moving them to the Nexus root, and confining exclusion to folders outside Collections; set aside by F-2.
- **Best-Effort Restore Position:** relying on the surviving `page_order` slot, as the Trash does today; set aside by E-2.
- **Refusing a Restore Over a Squatter:** today's `exists` refusal; set aside by E-4, as is a restore-time prompt (the log's *Rejected · A Restore-Time Prompt for Name Conflicts*).
- **Re-Aiming Title-Only Links by Id on Restore:** set aside by D-1.
- **The Archive Button on Collections Only:** set aside by G-4.
- **Archiving a Set Always Asks:** mirroring `ALWAYS_ASKS`; set aside by I-2.
- **An Archive Timeframe Read as `min(historyDays, archiveHistoryDays)` With a Default of 90:** set aside by J-1's switch.
- **A Second Reader Window or a Mode of `PageWindow`:** set aside by H-1.

##### Claims Narrowed, Widened, or Corrected

- **A, Removal 1:** "Duplicate IDs are left to the one twin rule `keyedHolders` already applies" is narrowed: `deleteCascade` doesn't route through `keyedHolders`, so the twin rule has to move into the governed strip rather than disappear.
- **A, By-ID Sites:** the cited lines (`assignment.ts:56`, `spend.ts:298`, `:332`) are `assignment.ts:81`, `spend.ts:250` (used at `:298` and `:332`), and `restoreProperty.ts:57`.
- **A and B, Governed Mapping:** "`collectionFolders` would have to map IDs to archive dirs" is narrowed: the mapping is one resolver call, but it belongs at the scope step, since `collectionFolders` doubles as the Collection sidecar list (`deleteProperty.ts:44-54`, `:139-143`).
- **B, `loadValues` as the Archive's Lag Source:** narrowed to a per-Collection location, which B-2 sets aside.
- **C, "Following excluded entries is the right model":** `normalizeExclusions` drops entries under `.nexus` (`codec.ts:51`, `:70-73`).
- **C, `addressed` Dependency:** satisfied, since `settledIndex` is tree-based (`settle.ts:242-246`).
- **D, Checked-Row Duplication:** `toggled` and `retained` are already shared (`UIX/Utilities/checkSet.ts`); only the batch rule differs, so the estimate drops from −25 / +20 to −4 / +6.
- **D, The Two Menus:** File History's batch offers Delete All alone (`fileHistoryMenu.ts:5-12`), so the merge estimate drops from −45 / +30 to −12 / +6.
- **D, Set Delete Placement:** Set Delete sits in `[Rename, Delete]`, not the last group.
- **E, `withheld`:** it covers paths under an unreadable or sidecar-less folder (`treePatch.ts:266-269`), not only an unreadable file.
- **E, Archived Ids for the Sweep:** `readIndexedStats(under)` already answers ids by prefix (`stores.ts:180-187`), so no new join is needed.

##### Claims Dropped

- **C and D, "The archive holds pages only":** the decision log reads pages and Sets (A-2).
- **D, "The Trash's look is an open item":** A-3 settles it.
- **B, Approach (e)'s `_archive.json` as the Origin Home:** dropped with the location.

##### Unverified

- C's Indexed Trash sizing (about 365 source lines) was spot-checked by file length only.
- B's notes on NexusOS's `Ideas/II. Archive` and `Agenda/II. Archive`, `~/NexusOS/.gitignore`, and Obsidian's `showUnsupportedFiles`.
- D's line ranges inside `UIX/Table/table.css`, `trash-frame.css`, `button-base.css.ts`, `MenuRows.tsx`, and `content-title.css`.
- E's `LockGlyph` faces and its six consumers, and `Core/MarkdownPM/MarkdownEditor.tsx`'s read-only lines.
