#### Delete & Restore Traces

**Re-grounded:** 09-30-2026 at `d7d00240d`

Every artifact delete and restore goes through the same three steps: `mutate` (`Core/Nexus/handlers.ts:166-183`) → `handleMutate` (`mutate.ts:50-62`) → `dispatch` (`mutate.ts:64-194`). The tree then confirms through `confirmMutation` (`handlers.ts:180`), or through `confirmRescope` when the reply carries `rescope` (`handlers.ts:179`).

**A property delete takes a different route.** It enters through `property:delete` (`Core/Properties/handlers.ts:165`) → `registryChannel` (`:73-82`) → `deleteProperty` (`deleteProperty.ts:73-78`), and confirms through `confirmRegistryWrite` (`confirm.ts:48-52`).

A Collection traces like a Set, with `parent: root`.

| Op | Functions In Order | Reads | Writes | Lock | Tree Confirm | Index |
| --- | --- | --- | --- | --- | --- | --- |
| **Page Delete** | `deleteOp` (`delete.ts:24-108`) → `mutableTarget` (`liveTree.ts:68-77`) → `pathExists` → `goneEdit` (null for page, `configReach.ts:285-288`) → `mintBundle` (`bundle.ts:27-35`) → `gatherContentRecord` (`gather.ts:33-49`; `gatherParentRef` calls `ensureFolderId` when the parent lacks a persisted id, `gather.ts:25-29`) → `writeRecord` marked `partial` (`delete.ts:82`) → `settleBundle` (`bundle.ts:37-43`) → `deleteCascade` strips Link values naming the page from pages and Spaces outside it (`delete.ts:92`) → the record rewritten with its `links`, `partial` only if the strip warned (`:93-98`) → `deindexPath` | Tree (target); disk (parent sidecar id, page text for `ID`); index relations for the linkers | `.trash` chain + bundle dir, `_record.json` ×2, possibly the parent's sidecar stamp, the rename, linker pages and Spaces | None at dispatch; `lock(abs)` around the settle only (`delete.ts:88-91`); per-file in the strip | `removeNodeInTree` transform (`mutatePatch.ts:66-67`); full walk if the parent's id is adopted (`:152-158`) | `removePathIndex` via `deindexPath` (`indexSeed.ts:153-158`) |
| **Page Restore** | `restoreOp` (`spend.ts:160-167`) → `openBundle` (`:82-88`) → `bundleArtifact` (`record.ts:103-106`) → `withDestination` if asked (`spend.ts:133-154`) → `resolveRecord` (`resolve.ts:30-92`) → inline path guard (`spend.ts:198-207`) → `pathExists` (`:215-216`) → `frozenWorld` (`:219-224`) → `owningCollection` (`:225-230`) → `scrubReturning` (`restoreScrub.ts:53-104`) → `parkLinks` (`spend.ts:239`) → `recordWrite`×2 + mkdir + rename (`:249-261`) → `moveIndexPaths` (`:262`) → `noteValueWrite` per landed page (`:263`) → the link arm, `refillValues` + `refillTrashed`, while Restore Links On Deletion is on (`:291-312`) → bundle removed (`:314-317`) | Disk (record, bundle listing, target, every bundle when parking); tree (placement, live ids via `projectBaseline`, governed world, titles) | Scrub rewrites the artifact inside `.trash`; parked rows in other bundles' records; rename; linker pages or their trashed copies; bundle removal | Contexts-folder lock for every restore kind (`mutate.ts:89-90`); per-file in scrub and refill; **none on the rename** | `patchPage(landed)` (`mutatePatch.ts:144-148`) | `.trash` source is outside the corpus, so the target is indexed fresh (`indexSeed.ts:167-171`) |
| **Set Delete** | Page path plus `exclusionWriteRefusal(excludedWithin)` (`delete.ts:35-38`), `excluded` in the record (`gather.ts:47`), titles from `folderCorpus` before the move (`delete.ts:83-86`), `releaseExcludedFolders` after the settle (`:99-100`), `reachConfig` (`:102`) | + `settings.json` scope | + `settings.json`, views/View Tiles/Matrix filter rewrites | Same as page | `removeNodeInTree`; no `rescope` even when exclusions were released | `removePathPrefixIndex` |
| **Set Restore** | Page path plus `landingRefusal` + `exclusionWriteRefusal` (`spend.ts:208-213`), `reseatExcludedFolders` (`:322-326`) | + scope | + `settings.json` | Same as page restore | **Full walk** (`mutatePatch.ts:148`), or `confirmRescope` = walk + `seedContentIndex` + watcher re-arm (`confirm.ts:58-64`) | `folderCorpus` → `indexWrittenPage` per page |
| **Space Delete** | `readRegistryStrict` → `gatherSpaceRecord(…, null)` → partial record → `unlinkSpaceValue` (`contextCascade.ts:151-168`) → `unlinkMembers` (`:171-190`) → `sweepGovernedRoots` (`governedSweep.ts:59-116`) → `gatherSpaceRecord(…, swept)` → full record → settle → `deindexPath` (no-op, since `.nexus` is outside content) → `reachConfig` | Tree; registry, Space sidecar (disk); index `queryMembers` with `nexusCorpus` fallback (`contextCascade.ts:91`); every Space sidecar | Record ×2; every tagged page and sidecar; the move | Contexts folder (`mutate.ts:84-86`); per-file in the sweep (`governedSweep.ts:66-67`); settle | **Full walk** (`mutatePatch.ts:119`) | Sweep re-indexes each rewritten page (`governedSweep.ts:89`) |
| **Space Restore** | `resolveRecord` (Context by id, `freeName` over Space titles, `resolve.ts:47-60`) → scrub → move → `reapply` (`spend.ts:280-290`) → `sweepRootsById` (`governedSweep.ts:119-143`) → bundle removed only if every surviving root took its tag back | Tree; `projectBaseline` for root paths; every Space sidecar | Members' `<Context>` key | Contexts folder | **Full walk** | Sweep re-index |
| **Context Delete** | `readRegistryStrict` (`delete.ts:33`) → `gatherContextEvidence` (`gather.ts:86-100`) → partial record → `mutateRegistryFile` drops by id (`delete.ts:66-68`) → `unlinkContextKey(skipUnder = folder)` (`contextCascade.ts:133-149`), re-inserting the entry at `at` on failure (`delete.ts:73-77`) → `dropSpaceOrder` in system mode only (`:78`) → full record → settle → `reachConfig` | Tree; registry; Space sidecars inside; index | Registry; every member; record ×2; move | Contexts folder; `contexts.json` RMW lock (`atomicWrite.ts:103-109`) | **Full walk** | Sweep re-index |
| **Context Restore** | `resolveRecord` (`freeName` over Context titles, `resolve.ts:39-45`) → scrub with the in-transit key → `mutateRegistryFile(withContextAt(entry, at))` **before** the move (`spend.ts:242-248`) → move, rolling the entry back on failure (`:249-261`) → `rekeyPassengers` if retitled (`:268-269`) → `restoredSpaceTitles` → `reapply` (`:270-279`) | Tree; restored Space sidecars | Registry; members; inner sidecars | Contexts folder | **Full walk** | Sweep re-index |
| **Property Delete** | `deleteProperty` under `serializeSchemaOp` → `keyedHolders` (index or corpus, `keyHolders.ts:42`) → `snapshot` (every Collection and Space sidecar, `deleteProperty.ts:27-69`) → `writePropertyBundle` (`record.ts:79-86`) → journal → `stripAndRemove` (`deleteProperty.ts:99-129`) → `removeFromRegistry` | Registry; tree (`collectionFolders`); index; sidecars | Record-only bundle, journal, pages, sidecars, registry | Schema chain; per-file | Registry re-read + `repointRegistryInTree` + flushed sidecar patches (`mutatePatch.ts:204-205, 221`); **no walk** | Sweep re-index |
| **Property Restore** | `restoreArtifact` property arm (`spend.ts:176-185`) → `restoreProperty` under `serializeSchemaOp` (`restoreProperty.ts:37-42`) → `createProperty` (appends to `order`, `registryProperty.ts:58`) → `foldersById` (every Collection sidecar) → `assignInner` → `patchCacheBlock` → `refillValues` over `frozenWorld`, dropping a Link value that names a page gone (`restoreProperty.ts:69-82`) → `parkLinks` (`spend.ts:180`) → bundle removed | Registry; disk sidecars; tree via `projectBaseline`; every bundle when parking | Registry, sidecars, pages, parked rows | Contexts folder + schema chain | **Full walk** (no `landed`, `mutatePatch.ts:146-148`) | Sweep re-index |

Sync hears about every one of these only through `recordWrite`. Neither delete (`bundle.ts:37-43`) nor restore (`spend.ts:249-253`) calls `reportRename`.

#### Restore vs Create/Move

| Concern | Restore | Twin | Relation |
| --- | --- | --- | --- |
| **Name Stepping** | `freeName` over tree siblings (`resolve.ts:40-43, 53-56, 69-72, 86, 89`) | `createDisambiguated` probing disk through each attempt (`create.ts:58-60, 85-90, 100`; `rename.ts:37`; `assetWrite.ts:22`); `freeName` inside the registry RMW (`contextWrite.ts:231-236`) | **Parallel:** two strategies that step an already-suffixed name differently (`names.ts:53-61` gives `Ideas (3)`, `:63-72` gives `Ideas (2) (2)`) |
| **Occupied Target** | Refuses (`spend.ts:215-216`) | Create steps aside on `exists` (`page.ts:47`, `folderEntity.ts:49-50`); move refuses (`page.ts:98-99`, `folderEntity.ts:79-80`) | **Parallel** to create, the same as move |
| **Path Safety** | Inline escape/trash/dirname/basename guard (`spend.ts:198-207`); no `nameError` | `mutableTarget` → `resolveUnderRoot` (`liveTree.ts:68-77`); `nameError` on create and rename (`folderEntity.ts:46-47`, `page.ts:33-34`) | **Parallel.** The guard is unreachable: a Context's final name comes from a registry title the record's decode already holds to `holdsName` (`contexts.ts:14`), every other final name is a directory entry's basename stepped by `freeName`, and `dir` comes from the live tree. `spend.test.ts:1106-1126` pins the escape attempt, and the restore is refused at `openBundle` |
| **Destination Admission** | `landingRefusal` + `exclusionWriteRefusal` (`spend.ts:208-213`) | Same pair (`move.ts:53-56`, `rename.ts:22-25`, `create.ts:88`) | **Reuse** |
| **Parent Lookup** | `findContainerById`, a by-id `findContainerWhere` (`resolve.ts:26-27`); `withDestination` (`spend.ts:133-154`) | `findContainerWhere` (`treePatch.ts:214-217`); `mutableTarget` by path (`move.ts:20-22`) | **Reuse** since `ed0fcaf0a`, which removed `containerChain` and closed F-189; Trash's crumbs read `containerTrailWhere` (`trashRows.ts:41`) |
| **The Move** | `recordWrite`×2 + mkdir + rename, no lock, no `reportRename` (`spend.ts:249-261`) | `relocatePage` takes the source lock and reports the rename (`page.ts:53-61`); `renameFolderEntity` and `moveFolderEntity` take no lock and leave the report to `landedFolder` (`folderEntity.ts:68-70, 81-83, 33-38`); delete's `settleBundle` (`bundle.ts:37-43`) is a third copy, locked by its caller (`delete.ts:88`); the Context and Space renames spell out a fourth, reporting (`contextCascade.ts:229-232, 245-249, 283-287`) | **Duplicate**, and the missing `reportRename` costs a full re-upload (see below) |
| **Excluded Entries** | `reseatExcludedFolders` (`spend.ts:325`) | `followExcludedFolders` via `landedFolder` (`folderEntity.ts:35`); delete's `releaseExcludedFolders` | **Reuse** of one core, `editExcluded` (`settings.ts:101-110`) |
| **Index / Value Notes** | `moveIndexPaths`, then `noteValueWrite` for every landed page (`spend.ts:262-263`) | `move.ts:40-41, 68-69`, `create.ts:66-67` | **Reuse** |
| **Sidecar Writing** | None; the id travels inside the moved folder | `createFolderEntity` mints id + sidecar (`folderEntity.ts:51-54`) | **Unique** |
| **Order Insertion** | None; delete leaves the id in `set_order`/`page_order`/`order.*` (`delete.ts` writes no order except system-mode `dropSpaceOrder`, `:78`) | `setChildOrder`/`setSpaceOrder` with `fillSlot` (`create.ts:65, 92, 102`) | **Unique:** order lists tolerate dead ids |
| **Context Registry Entry** | `mutateRegistryFile(withContextAt(entry, at))` (`spend.ts:243-246`) | `createContextGroup` (`contextWrite.ts:223-240`); delete rollback (`delete.ts:75`) | **Reuse** |
| **Retitled Context Key** | `rekeyPassengers` (`spend.ts:50-71`) | `rewriteRoot`'s Context branch + `withOrderEntry` (`contextCascade.ts:43-60, 128`) | **Duplicate** |
| **Space Name ↔ Id** | `restoredSpaceTitles` (`spend.ts:73-80`) | `gatherContextEvidence` loop (`gather.ts:93-98`); `trashedHolders`' Context arm (`holdings.ts:112-116`) | **Duplicate**, three copies of one Space-sidecar id read |
| **Tag Re-Application** | `reapply`: raw array union via `sweepRootsById` (`spend.ts:330-343`) | `setPageContext` → `setGovernedRootKeys` + adoptions (`contextWrite.ts:109-132`); `setSpaceContext` far halves (`:172-205`) | **Parallel:** restore bypasses the governed writer and adoptions |
| **Governed World** | `liveWorld` from the tree (`restoreScrub.ts:26-36`) | `loadContextWorld`/`loadGovernedWorld` from disk (`contextWrite.ts:60, 150`) | **Parallel** (F-201 cites it) |
| **Owning Collection** | `owningCollection` (`spend.ts:225-230`) | The same lookup (`treePatch.ts:220-227`) | **Reuse** since `ed0fcaf0a`, which replaced Trash's inline scan and `collectionFolderOf`'s |
| **Property Rebuild** | `createProperty`, `assignInner`, `patchCacheBlock`, `refillValues` (`restoreProperty.ts:53-82`); `foldersById` (`:21-28`) | `registryProperty.ts:42-71`; sidecar-id reads in `gather.ts:14-17` | **Reuse**; `foldersById` parallel, and its stated reason is the tree's placeholder id for an unstamped folder |
| **Link Values** | `scrubReturning` drops a Link naming a page gone and `parkLinks` hands it to the bundle holding that page (`restoreScrub.ts:53-104`, `holdings.ts:77-87`); the link arm refills what the delete stripped (`spend.ts:291-312`) | Delete's `deleteCascade` (`delete.ts:92`), rename's `renameCascade` (`rename.ts:47`), emptying's strip and park (`spend.ts:121-127`) | **Unique** to the Trash/Link arc (`7be2744e6`…`5003a1c7f`) |

**The Unrecorded Cost:** Delete and restore record two writes instead of reporting a rename. So `pushDirty` ships a Collection delete as one `delete` per file under the vanished path (`push.ts:192-200`), plus one fresh `write` per file under `.trash/…` (`push.ts:162-168, 208-216`). Each blob is sealed to its path, so every page's ciphertext re-uploads, and a restore does it all again in reverse. `pushRename` already handles a folder source through `readBasesUnder(from)` (`push.ts:233-236`), and the tap admits `.trash` paths as renames (`exclusion.ts:54`, `tap.ts:65-76`). Reusing `relocatePage`/`landedFolder` would have sent both as renames. Decision Log K-3 adds this to the audit as a new finding.

#### The Record

There are four record shapes, and three of them are the same projection of the tree, built three separate times.

- **`EntityRecord`** `{id, kind, title, path}` (`Nexus/record.ts:6-11`) is built from the tree by `buildBaseline` (`remintLedger.ts:30-66`, first claimant wins), cached per tree (`:20-28`), and latched into `nexus.db`.
- **`NodeRecord`** extends `TrailNode` (a `Pick` of `EntityRecord` plus kind and icon) with `key`, `ownIcon`, and `parents` (`treeIndex.ts:19`). It's built by its own walk (`:57-143`, last one wins by id) and is window-only.
- **`valuesChanged`'s page indices** (`valuesChanged.ts:43-83`, null on a duplicate) are a third host-side projection; all three are F-188's subject. `titlesOf` (`:87-99`), from the Trash/Link arc, is a further per-tree projection keyed by title.
- **The bundle's `RecordFile`** (`Trash/record.ts:13-72`) is the only shape that isn't a tree projection. Its content arm matches the law's record exactly: an optional `id` plus a typed `parent` (root, container id, Context id, or `unaddressable`). Title and path are recovered from the artifact's name and the bundle's folder chain (`trashRows.ts:20-27, 69`).

The bundle holds three things a flat record plus parent id doesn't:

1. **Reverse edges the cascade stripped from other files:** a Space's `members`, a Context's per-root `membership`, a property's `values`, `assignments`, and `caches`, a container's `excluded` entries, and a content record's `links`, the Link values its delete stripped from pages and Spaces outside it (`record.ts:36-37`). Other bundles append to `links` after the fact when a restore parks a value naming their page (`appendLinks`, `record.ts:89-94`). Everything the restore's `reapply`, `rekeyPassengers`, `restoreProperty`, and link arm do exists to put these back.
2. **A Context's `at`:** registry position is display order, and the delete removes the entry from that list. `state.json` order lists keep dead ids instead, so Spaces, Sets, and pages need no position. A property record carries no position either, so a restored property lands at the end of `order` (`registryProperty.ts:58`).
3. **The `partial` evidence flag.**

It doesn't hold the views, View Tiles, and Matrix filter references that `reachConfig` drops (`delete.ts:102`), so a restore can't bring those back.

The reverse edges come from the file format more than from scaffolding. Governed keys are stored on disk by name (`<Title>:` for Contexts, bare `Property:` for properties, CorePM §Mutations), which is a Locked Decision under Legibility. A delete that left them dangling is rejected (Decision Log A-2): a new Context or property created under the deleted title would silently adopt every stale key.

#### Sync Re-Entry

1. **Landing:** `landWrite` → `bytesToLand` (merge for Pommora JSON) → `landBytes` (`land.ts:83-104`). `landBytes` writes the bytes, sets the writer's mtime, and calls `forgetParse` (`atomicWrite.ts:29-39`). It never calls `recordWrite`, and neither do `landDelete` or `landRename` (`land.ts:106-144`).
2. **Echo:** chokidar fires, and `onEvent` calls `emitWatch` first (`watcher.ts:91`), so Sync's watch tap schedules the path again. The resulting `pushDirty` does nothing because the hash matches (`push.ts:210`); a merged JSON pushes its merged bytes. `isRecentWrite` is false for a landing (`watcher.ts:97`), so the event joins the batch with no `written` hash and survives `dropOwnEchoes` (`writeEcho.ts:61-72`).
   - **Bypass is normal but not guaranteed:** a landing is swallowed if the app recorded a bytes-less write on the exact path within 2 s, or on an ancestor folder within 800 ms (`writeEcho.ts:42-55`). A delete, restore, or move records exactly that.
3. **Settle:** `settle` → `confirmBy(applyWatchEvents)` (`watcher.ts:153-165`) → `classifyEvent` (`watchPatch.ts:128-185`). A page in a known container gets a targeted patch. Any non-hidden `addDir`/`unlinkDir`, anything under `.nexus/contexts/`, the identity file, and `properties.json` fall back to a full walk (`:156-168`). A new Set arriving by sync therefore costs a walk (F-199).
4. **No Change Values:** `landWrite`, `landDelete`, and `landRename` return `void`, and `applyPull` returns an outcome enum (`pull.ts:88-96`). Sync knows each change's kind, path, and `from`, then throws them away. The host re-derives everything from chokidar events, disk reads, and tree lookups, so a synced rename arrives as `unlink` + `add`.
   - Landings into `.trash` reach nothing, because chokidar ignores dot folders (`exclusion.ts:26-34` via `watchSettle.ts:37-47`). A peer's Trash frame stays stale until it's reopened.
5. **Merge Shape:** `mergeKeys` (`jsonMerge.ts:15-46`) is a three-way merge over plain-object maps.
   - The depth budget is named per top key and applied uniformly below it (`:12-13, 41`). An array or scalar that changed on both sides goes whole to the newer side (`:36, 43`).
   - The registry, sidecars, and tile documents merge at depth `{}` (`mergePolicy.ts:24-39`).
   - If config lists were stored as maps keyed by id, `mergeKeys` would already merge them item by item, needing only depth entries. F-006's alternative teaches it id-keyed arrays instead (the ledger sizes that fix at Net +40).
   - Neither approach fixes F-006's worst case at its root. A Context's identity on disk is its title in three places (registry entry, folder name, members' `<Title>:` keys), and Sync carries each as an independent file change.
   - The property-registry writer is a second consumer of `mergeKeys` (`propertiesRegistry.ts:92`).
6. **Taps:** there are three hooks, all installed together (`tap.ts:54-62`):
   - `setWriteTap` receives `wrote`/`renamed` (`writeEcho.ts:16-32`).
   - `setWatchTap` receives every chokidar event before the echo filter (`watchSettle.ts:26-34`; `watcher.ts:91` vs `:97`).
   - `setRepairSeed` rebuilds corrupt repairable files from the last synced bytes (`atomicWrite.ts:136-142, 186-189`).

   Every app write reaches Sync twice, once through `recordWrite` and once through its chokidar echo. The 2.5 s per-path debounce merges the two (`tap.ts:30-40`).

#### Baseline

`runOpenLedger` (`remintLedger.ts:117-143`) runs in this order:

1. Walks once (`readNexus`, `:119`) and projects the result (`:123`).
2. Adjudicates duplicate ids against the prior baseline (`remint.ts:23-37`) and re-mints the losers.
3. Picks the eldest claimant where there's no prior (`remintLedger.ts:95-115`).
4. Latches the baseline (`:68-93, 127`).

**The baseline is that same walk's result, latched, and the walk also seeds the session's live tree** (`:129`). A second walk runs only when something was re-minted (`:130-138`). The open still reads the disk more than once: `stampAdopted` traverses every page first (`handlers.ts:44-48`, `adopt.ts:166-190`), and `seedContentIndex` stat-walks the corpus (`handlers.ts:90`). That's F-197's territory.

**Diff consumers:** there are none.

- The latched baseline is read only by the next open, inside `runOpenLedger` (`remintLedger.ts:120`), feeding `adjudicate`, `recordEldest`, and `latchBaseline`.
- Nothing computes a diff, and a grep for `drift` finds only a comment (`handlers.ts:103`).
- `projectBaseline(tree)` is reused elsewhere as a live id → record map (`resolve.ts:35`, `spend.ts:264`, `restoreProperty.ts:70`, `assignment.ts:83`). That's the law's record map, already present in miniature.

**Re-Mint:**

- **Page:** `rewritePageSerialized` stamps a fresh `ID`, preserving the modification time (`remint.ts:76-82`). Nothing is re-indexed (F-209).
- **Container or Space sidecar:** gets a fresh id, freshly minted view ids with `manual_order` dropped, and `active_view` remapped (`:84-119`). A Space's tile board is copied first (`:91-97`).
- **Context:** never re-minted (`:68`), so a duplicated Context id stays deferred forever. Decision Log I-1 fixes it in phase 1.
- **Metadata:** shard entries are copied (`copyPageMetadata`, `:57-60`).
- **Device rows:** `folds`, `headingCols`, `citations`, `embedHeights`, and `embedZooms` are copied to the fresh id (`:121-132`). The old rows stay.

#### Inventory & Collapse

The survival column keeps today's cascade: a delete strips references to the entity from other files, and a restore puts them back. Tolerating dangling references instead is rejected (Decision Log A-2).

| File | LOC | Job | Twin | Under the Law | Law + Current Policy | Safety Property |
| --- | --- | --- | --- | --- | --- | --- |
| `Trash/delete.ts` | 108 | Per-kind delete, Link strip | Unique | Survives as the delete orchestrator; de-index moves to `apply(remove)` | 92 | Write-ahead record before the sweep and move (`delete.ts:40-87` before `:88-91`); the Link strip runs after the move (`:92`) |
| `Trash/bundle.ts` | 83 | Mint, settle, flat trash, deps | `settleBundle` duplicate of `relocatePage`/`moveFolderEntity` | Settle collapses into the shared move primitive; the rest survives | 78 | — |
| `Trash/record.ts` | 106 | Record schema, read/write, link append, artifact probe | Content arm parallel to `EntityRecord` | Content arm collapses into entity record + parent id; reverse-edge payloads survive | 92 | A bundle with no artifact is a never-finished delete (`record.ts:103-106`) |
| `Trash/gather.ts` | 121 | Disk reads of parent/entity ids; Space/Context payloads | Parallel to `projectBaseline` id lookups | Parent and id reads collapse into map lookups; Space/Context builders survive | 70 | — |
| `Trash/resolve.ts` | 92 | Placement or refusal | None since `ed0fcaf0a` | Resolver survives over the map | 85 | Live id outranks (`resolve.ts:35-37`) |
| `Trash/spend.ts` | 343 | Empty, restore, reapply, link arm | Move and guard duplicates; `rekeyPassengers` duplicate of `rewriteRoot`; `restoredSpaceTitles` duplicate of `gatherContextEvidence` | Move/rekey collapse into the shared primitive and `rewriteRoot`; the guard goes; empty, reapply, link arm survive | 290 | Empty and restore refusals (`spend.ts:111-112, 187-188`); artifact-first empty (`:96-129`) |
| `Trash/holdings.ts` | 141 | Bundle listing, parking, trashed refill | Context arm of `trashedHolders` duplicate of the Space-sidecar id read | Survives; the Context arm reads the shared id read | 136 | Listing skip (`holdings.ts:34`) |
| `Trash/restoreProperty.ts` | 87 | Rebuild property | `foldersById` parallel to sidecar-id reads | Survives; `foldersById` collapses into map lookups | 78 | Live id (`:48-49`) |
| `Trash/restoreScrub.ts` | 104 | Reconcile returning content, drop gone Links | `liveWorld` parallel to `loadContextWorld` | Survives; world built from the map | 92 | — |
| `Trash/trashRows.ts` | 83 | Row projection | Unique | Survives; crumbs read ancestry | 80 | — |
| `Trash/trashRow.ts` | 30 | Types | Unique | Survives | 30 | — |
| `Trash/handlers.ts` | 24 | Channels | Unique | Survives | 24 | — |
| `Nexus/create.ts` | 104 | Create ops | Stepping parallel to `freeName` | Survives as writers that emit `upsert` | 100 | — |
| `Nexus/move.ts` | 72 | Move ops | Unique | Survives as writers that emit `move` | 68 | — |
| `Nexus/rename.ts` | 48 | Rename op | Unique | Survives | 48 | — |
| `Nexus/folderEntity.ts` | 85 | Folder primitives | Unique (the twin restore should be using) | Survives; its moves call the shared primitive | 80 | — |
| `Nexus/record.ts` | 11 | `EntityRecord` | Parallel to `NodeRecord` | Survives as the flat record type (grows) | 25 | — |
| `Nexus/remintLedger.ts` | 151 | Open walk, projection, latch | `buildBaseline` duplicate of the treeIndex walk (F-188) | Projection collapses into the record map; latch, eldest, and run survive | 105 | Prior evidence decides the original |
| `Sync/Client/session.ts` | 248 | Lifecycle, poll loop | Unique | Survives | 248 | — |
| `Sync/Client/tap.ts` | 90 | Two feeds + repair seed + debounce | Write feed parallel to watch feed | App feed moves to the change-list subscription; watch feed survives for foreign edits | 78 | Repair seed (`tap.ts:59-62`) |
| `Sync/Client/pull.ts` | 101 | Landing loop | Unique | Survives | 101 | — |
| `Sync/Client/push.ts` | 309 | Collect, store, rename, stale | Unique | Survives | 309 | — |
| `Sync/Client/reconcile.ts` | 124 | Resync | Unique | Survives | 124 | — |
| `Sync/Client/base.ts` | 70 | Base rows | Unique | Survives | 70 | — |
| `Sync/Client/status.ts` | 11 | Status | Unique | Survives | 11 | — |
| `Sync/Arrival/land.ts` | 144 | Write, delete, rename landing | Unique | Survives; gains ~15 to hand change values to `apply` | 160 | mtime preserved (`land.ts:96`, `atomicWrite.ts:34-37`) |
| `Sync/Arrival/mergePolicy.ts` | 40 | Merge set + depths | Unique | Survives | 40 | — |
| `Sync/Arrival/captures.ts` | 18 | Loser capture | Unique | Survives | 18 | — |
| `Files/jsonMerge.ts` | 46 | Three-way key merge | Unique | Survives unchanged if config lists become id-keyed maps | 46 | — |
| `Files/writeEcho.ts` | 72 | Echo record + write tap | Unique | Echo filter survives; tap moves to the change stream | 64 | — |
| `Files/atomicWrite.ts` | 319 | Disk primitives | Unique | Survives; gains the move primitive | 331 | Repair seed (`:136-142, 186-189`) |
| `Nexus/watchSettle.ts` | 85 | Watch tap, ignore filter, batch derivations | — | Derivations collapse into reads of the change list | 60 | — |
| **In-Slice Total** | **3,470** | | | | **3,233 (−237, −6.8%)** | |
| `Nexus/remint.ts` *(not in SOURCES)* | 150 | Adjudicate, fresh ids, row copies | Unique | Survives; gains the Context arm | 160 | — |
| `Sync/Client/call.ts`, `keyring.ts`, `Sync/handlers.ts` *(out of slice)* | 142 + 112 + 385 | Transport, keys, membership | — | Not estimated | — | — |

**Where the Law Bites:** this slice's small collapse means the law is aimed at a different layer, not that the law fails.

- Its real targets are `mutatePatch.ts` (237), `watchPatch.ts` (491), `treePatch.ts` (576), `treeIndex.ts` (361), and `liveTree.ts` (114). None of them are in these SOURCES.
- In this slice, its concrete gains are three: record lookups replacing disk re-reads in `gather.ts`, one shared move primitive, and landings that emit change values.

#### Divergences

1. **The diff and the drift row don't exist.** `NexusRecordPM.md:20` says "the diff runs over the union of ids… the drift row keeps the last non-empty diff." Nothing computes a diff, and the latched baseline is read only by the next open's re-mint (`remintLedger.ts:120-127`, `remint.ts:23-37`).
2. **The tuple has no readability field.** `NexusRecordPM.md:20` says the baseline is "id, kind, title, path, and whether it was readable." `EntityRecord` has no such field (`record.ts:6-11`). Unreadability is carried by keeping prior rows (`remintLedger.ts:83-91`).
3. **The code map is wrong.** `NexusRecordPM.md:4` names "`bundle.ts` for the bundle and restore, `record.ts` for the baseline's tuple and diff." Restore lives in `spend.ts`/`resolve.ts`, and `record.ts` is an 11-line type. The latch lives in `remintLedger.ts`.
4. **Sync doesn't move a bundle as one unit.** `NexusRecordPM.md:8` says a sync race "moves the two as one unit." Sync ships `_record.json` and each artifact file as independent per-path changes, in slices of 200 (`tap.ts:46-58`, `push.ts:37, 68-73`). A peer can end up holding a record whose artifact hasn't landed yet; the listing skips it until it does (`holdings.ts:34`).
5. **"One rule" is actually two.** `CorePM.md:87` says names step aside "through one rule in `names.ts`." But `freeName` and `createDisambiguated` step an already-suffixed name differently (`names.ts:53-61` vs `:63-72`).
6. **Some confirms walk the whole Nexus.** `CorePM.md:83` says a confirm is "a pure transform… or a one-file re-read." Space and Context deletes, and every restore except a page's, confirm by a full walk (`mutatePatch.ts:119, 144-148`).
7. **The row-copy list doesn't match (low confidence).** `NexusRecordPM.md:22` lists the copied rows as "folds, heading columns, preview sets…". The code copies `citations`, `embedHeights`, and `embedZooms` (`remint.ts:121`), and "preview sets" doesn't clearly name any of them.

#### Plan Inputs

This slice feeds phase 1: the Trash rider (F-2, F-3, and restore's other duplicates) and the four standalone defects (I-1). F-4, a restore or a Space or Context delete confirming by its change list, waits on phase 2.

##### The Shared Move Primitive (F-2)

Seven sites move an entity by hand at HEAD, with three different lock and report policies:

| Mover | Lock | Echo | Rename Report | Runs Before The Report |
| --- | --- | --- | --- | --- |
| `relocatePage` (`page.ts:53-61`, private), behind `renamePage` (`:63-74`) and `movePage` (`:93-102`) | Source path | `recordWrite` both ends | After the lock | Nothing |
| `renameFolderEntity` (`folderEntity.ts:58-72`), `moveFolderEntity` (`:74-85`) | None | Both ends | `landedFolder` (`:33-38`), from `rename.ts:28` and `move.ts:68` | `moveIndexPaths`, then `followExcludedFolders` |
| `settleBundle` (`bundle.ts:37-43`) | The caller's `lock(abs)` (`delete.ts:88-91`) | Both ends | None | — |
| Restore (`spend.ts:249-261`) | None | Both ends, plus `mkdir(dirname(target))` | None | — |
| `renameContextOp`, its rollback, `renameSpaceOp` (`contextCascade.ts:229-232, 245-249, 283-287`) | The Contexts-folder lock from `dispatch` (`mutate.ts:66-68`) | Both ends | Inline | Nothing |

Echo-and-rename sites that report nothing and stay outside the rider: `trashFileFlat` (`bundle.ts:45-55`, tiles and image sweeps), the Context journal replays (`contextCascade.ts:323, 357`, no echo), and adoption's Agenda re-home and sidecar migration (`adopt.ts:49-52, 124-127`).

The Decision Log's F-2 names `moveFolderEntity` as taking the lock; at HEAD only `relocatePage` does.

**Signature:**

```ts
export async function relocate<T = undefined>(
  from: string,
  to: string,
  landed?: () => Promise<T>,
): Promise<T | undefined>
```

It takes `machine().lock(from)` around `recordWrite(from)`, `recordWrite(to)`, and `machine().rename(from, to)`; runs `landed` after the lock releases; then calls `reportRename(from, to)` and returns what `landed` answered. `landed` carries `landedFolder`'s ordering: index rows and excluded entries follow the folder before Sync hears the rename (`folderEntity.ts:32-37`). A home beside `targetTaken` and `pathExists` in `Core/Files/atomicWrite.ts` serves Trash, Nexus, and Contexts alike.

**Callers After:**

- `renamePage` and `movePage` call `relocate(absFile, target)`; `relocatePage` is deleted.
- `renameFolderEntity` and `moveFolderEntity` gain `landed?: (to: string) => Promise<T>` and pass it through; `landedFolder` drops its `reportRename` (`folderEntity.ts:36`), and `rename.ts:26-28` and `move.ts:64-68` hand it in as `landed`.
- `settleBundle` stays as a one-line wrapper over `relocate`, because `deleteOrder.test.ts:73-76` mocks it to pin the write-ahead order. `delete.ts:88-91` keeps its own lock only around `discardFile`, the system-Trash branch.
- Restore's `spend.ts:249-261` becomes `relocate(artifactAbs, targetAbs, landed)` inside the existing try, whose Context rollback stays. Its `landed` is `moveIndexPaths` plus, for a Collection or Set, `reseatExcludedFolders`, mirroring `landedFolder`'s order and returning `rescope`, which moves those two up from `:262` and `:325`.
- The three `contextCascade.ts` sites collapse to one call each.
- `mkdir(dirname(targetAbs))` (`spend.ts:252`) goes. Every `dir` the resolver answers is a live container, the Contexts folder, a Context folder, or the root; a parent removed outside the app since the last walk then fails the rename, which the restore already turns into a refusal with its entry rolled back.

**What the Trash/Link Arc Added That the Primitive Leaves Alone:**

- **Delete (`delete.ts:81-98`):** the record is written `partial` before the move, the page titles are read from the live folder before it moves (`folderCorpus`, `:83-86`), and `deleteCascade` strips Link values only after the move lands (`:92`), so a failed move strips nothing. `relocate` has to throw out of the delete on a failed rename, as `settleBundle` does today.
- **Restore (`spend.ts:217-239`):** `frozenWorld`, `scrubReturning`, and `parkLinks` run against the artifact while it still sits in `.trash`, before the move; after it, `noteValueWrite` covers every landed page (`:263`, from `aa06e6b30`) and the link arm reads `landed` and `was` (`:291-312`).
- **`holdings.ts`:** `listBundles`, `trashedTitles`, and `trashedHolders` read the bundle layout (one artifact beside `_record.json`, `record.ts:103-106`), and `parkLinks` and `refillTrashed` write into other bundles under those files' own locks. The primitive's source lock on an artifact is a different key, and the bundle layout doesn't change.
- **Emptying (`spend.ts:96-129`)** removes rather than moves and stays as it is.

##### F-3: One Name Rule

- **`freeName`** (`names.ts:53-61`) steps from a known taken set, and counts on from the bare base when that base is held. Its callers are `resolve.ts:40, 53, 69, 86, 89`, `contextWrite.ts:232`, `registryProperty.ts`, `optionModel.ts`, `viewsFile.ts`, and `ViewTile.tsx`, and none of them change.
- **`createDisambiguated`** (`names.ts:63-72`) probes the disk through each `attempt` and always steps the raw name, up to 50 times. Its callers are `create.ts:58` (page), `:85` (Collection or Set), and `:100` (Space); `rename.ts:37` (a create's first rename); and `assetWrite.ts:22` (asset adoption, through `adoptFile.ts` and `assetMigrate.ts`).

**The Fold:** one private generator holds the arithmetic both walk.

```ts
function* nameSteps(name: string, bareHeld: boolean): Generator<string>
export function freeName(name: string, taken: Iterable<string>): string
export async function createDisambiguated<T>(
  name: string,
  attempt: (name: string) => Promise<Result<T>>,
  held: (name: string) => Promise<boolean>,
): Promise<Result<T>>
```

`freeName` keeps its signature. `createDisambiguated` asks `held(bare)` only when `attempt(name)` answered `exists` and `name` ends in a counter, then walks the same steps. Each caller's `held` is the probe its attempt already makes: the `.md` path for a page, the folder path for a Collection, Set, or Space, `targetTaken` for the rename, and `resolveAssetName(map, file) !== null || pathExists(abs)` for an asset. The behavior change reaches only a name that already ends in a counter with its bare base taken; asset adoption (`Screenshot (2).png`) is where it's met most.

##### Restore's Other Duplicates

| Duplicate | HEAD | Phase 1 (Rider) | Later |
| --- | --- | --- | --- |
| **Path Guard** | Inline, `spend.ts:198-207` | Deleted with its comment. It's unreachable: the decode holds a Context title to `holdsName` (`contexts.ts:14`), every other final name is a directory entry's basename stepped by `freeName`, and `dir` comes from the tree. `spend.test.ts:1106-1126` keeps pinning the refusal | — |
| **Parent Lookup** | `findContainerById` (`resolve.ts:26-27`) over `findContainerWhere`; `owningCollection` (`spend.ts:225-230`) | Nothing left: `ed0fcaf0a` closed it | — |
| **`rekeyPassengers`** | `spend.ts:50-71` | Deleted; `contextCascade.ts` exports the Context branch of `rewriteRoot` (`:43-60`) wrapped in `withOrderEntry` (`:128`) as one `Rewrite`, which `cascadeTitle` and the restore both run. The restore's version drops non-string values and an emptied key, and `rewriteRoot` keeps both | — |
| **`restoredSpaceTitles`** | `spend.ts:73-80`, beside `gather.ts:93-98` and `holdings.ts:112-116` | One read of a Context folder's Space ids in `spaceSidecar.ts`, beside `spaceSidecarsIn`, answering name → id and whether a present sidecar was unusable; the three callers read it | Survives G-3's lookup, which can't see a Context in `.trash` or one that has just landed |
| **Stale Doc Line** | `holdings.ts:75`, left above `parkLinks` when `3e0907013` removed `restoreWorld` | Deleted | — |
| **`liveWorld`** | `restoreScrub.ts:26-36` | — | Phase 4, as F-201 (K-2) |
| **`foldersById`** | `restoreProperty.ts:21-28`, reading disk because the tree answers a placeholder id for an unstamped folder | — | Phase 3: E-6 retires placeholder ids, so the record map answers by id |
| **`gatherParentRef`'s stamp** | `gather.ts:19-31` stamps an id-less parent through `ensureFolderId` before reading it | — | Phase 3, for the same reason |
| **Confirm By Walk (F-4)** | `mutatePatch.ts:119` (Space and Context delete), `:144-148` (restore: page patch or walk); the reply's `landed` (`spend.ts:156, 320`) and the per-page `noteValueWrite` (`:263`) exist to feed them | — | Phase 2: restore and delete emit their change lists. A Set, Collection, or Context restore needs the landed subtree read, which phase 2 can take from today's container patch read and phase 3 hands to the one reader |

##### Section I: The Four Defects

1. **Native Menus Miss a `commands` Change:** `refreshMenu` (`Desktop/main.ts:172-177`) runs at launch (`:401`) and after an open (`:324`). The app has no writer for `commands`, so a change arrives only as an outside edit of `settings.json`: the watcher patches it into the tree (`watchPatch.ts:418-440`) and pushes the tree (`Desktop/FileWatch/watcher.ts:170`), and the native and editor menus keep what `refreshMenu` installed. The smallest fix remembers the installed `commands` and re-runs `refreshMenu` when a pushed tree's differ, at `watcher.ts:170` and at the host's push (`main.ts:263`), about 8 lines. Phase 1's settings move takes `commands` off the tree's root, and phase 2 retires the whole-tree push, so a fix keyed on `nexus:changed` is rewritten twice. **Owner:** phase 1's settings-home task, keyed on the settings record's `commands` leaf changing and answered by `refreshMenu` in Desktop.
2. **`matrix.json` Has Two Writers:** `writeMatrixFile` (`Core/Matrix/matrixFile.ts:16-24`) runs a repairable read-modify-write that parses and merges through `mergeKeys`. `reachConfig` (`Core/Nexus/configReach.ts:378-383`) runs `editJsonStrict` on the raw `filter.rules`, skipping a corrupt file and counting it in `reach.skipped`. Both lock the same path, so they serialize; what differs is the repair policy and the shape each edits. The smallest fix is one exported `editMatrixFile(root, mutate)` over `updateNexusConfig` in `matrixFile.ts`: `writeMatrixFile` calls it, and `reachConfig` calls it with its rules edit, counting a failed result as skipped. A corrupt `matrix.json` is then rebuilt from its last read (`REPAIRABLE.matrix`, `atomicWrite.ts:227`) rather than skipped, which matches the Matrix's own writes. No later phase rewrites either file's matrix path; `matrix.json` isn't among the files settings' home takes. **Owner:** phase 1.
3. **A Duplicated Context ID Is Never Re-Minted:** `writeFreshId` returns false for a Context (`Core/Nexus/remint.ts:68`). The smallest fix is a Context arm that rewrites the matching registry entry through `mutateRegistryFile`, matching both the old id and `contextDirRel(c.title) === target.path`, and answers whether an entry changed. It also copies the Space order held under the old id (`order.spaces`, `reorder.ts:35-43`) to the fresh id, so the copy's Spaces keep their order. Two entries that share both id and title share one path, so `adjudicate` can't tell them apart (`remint.ts:32-34`), and that case stays deferred. J-4's timing (live or at the next open) doesn't touch this arm, and phase 3's record map rewrites the projection in `remintLedger.ts` rather than `writeFreshId`. **Owner:** phase 1.
4. **Two Opens Can Interleave:** `whileAdopting` (`Core/Nexus/session.ts:15-23`) counts depth without ordering, so two `adoptNexus` calls (`Core/Nexus/handlers.ts:104-113`, from `nexus:choose` `:126`, `nexus:openPath` `:137`, and `nexus:rename` `:151`, with Desktop's `openNexusPath` and `waitUntilReadable` reaching `nexus:openPath`) run their `openNexusSequence` bodies at once. The smallest fix chains each adoption behind the previous one inside `whileAdopting`, keeping the counter so writes answer `BUSY` while any open is queued or running, in about 4 lines. The launch restore calls `openNexusSequence` directly (`Desktop/main.ts:384`) before the window exists (`:400`), so no ask races it. **Owner:** phase 1; no later phase touches `session.ts`.

##### Files

| File | Deleted | Survives | Added | Non-Test Importers of What Changes |
| --- | --- | --- | --- | --- |
| `Core/Files/atomicWrite.ts` | — | All | `relocate` | New importers: `page.ts`, `folderEntity.ts`, `bundle.ts`, `spend.ts`, `contextCascade.ts` |
| `Core/Nexus/page.ts` | `relocatePage` (`:53-61`) | `renamePage`, `movePage` (bodies call `relocate`), the rest | — | `renamePage`: `rename.ts`; `movePage`: `move.ts` |
| `Core/Nexus/folderEntity.ts` | `reportRename` line in `landedFolder` (`:36`); the echo-and-rename lines in `renameFolderEntity` (`:68-70`) and `moveFolderEntity` (`:81-83`) | All exports | `landed` parameter on both movers | `rename.ts`, `move.ts` |
| `Core/Trash/bundle.ts` | `settleBundle`'s body (`:38-41`) | `settleBundle` as a wrapper, the rest | — | `delete.ts` |
| `Core/Trash/delete.ts` | The lock around `settleBundle` (`:88-91` narrows to `discardFile`) | All | — | `mutate.ts` |
| `Core/Trash/spend.ts` | `rekeyPassengers` (`:50-71`), `restoredSpaceTitles` (`:73-80`), the path guard (`:198-207`), the echo, mkdir, and rename (`:249-253`) | `emptyBundle`, `restoreOp`, `withDestination`, `reapply`, the link arm | — | `mutate.ts` |
| `Core/Trash/gather.ts` | The Space-sidecar loop in `gatherContextEvidence` (`:93-98`) | All exports | — | `delete.ts` |
| `Core/Trash/holdings.ts` | The Context arm's sidecar loop (`:113-116`); the stale doc line (`:75`) | All exports | — | `spend.ts`, `assignment.ts`, `Trash/handlers.ts`, `trashRows.ts` (unchanged exports) |
| `Core/Contexts/spaceSidecar.ts` | — | All | The Space-id read | `gather.ts`, `spend.ts`, `holdings.ts` |
| `Core/Contexts/contextCascade.ts` | The echo-and-rename lines at `:229-232, 245-249, 283-287` | All | The exported Context rekey `Rewrite` | `Nexus/handlers.ts`, `mutate.ts`, `delete.ts`, `gather.ts`, and `spend.ts` new |
| `Core/Paths/names.ts` | `createDisambiguated`'s own loop (`:67-71`) | `freeName`, `createDisambiguated` (new `held`), the rest | `nameSteps` (private) | `createDisambiguated`: `create.ts`, `rename.ts`, `assetWrite.ts` |
| `Core/Nexus/create.ts`, `rename.ts`, `Core/Assets/assetWrite.ts` | — | All | A `held` probe per call | `mutate.ts`; `adoptFile.ts`, `assetMigrate.ts` |
| `Core/Matrix/matrixFile.ts` | `writeMatrixFile`'s direct `updateNexusConfig` call | Both exports | `editMatrixFile` | `Matrix/handlers.ts`; `configReach.ts` new |
| `Core/Nexus/configReach.ts` | The raw `written(...matrix...)` call (`:378-383`) | All | — | `move.ts`, `delete.ts`, `deleteProperty.ts`, `Properties/handlers.ts`, `optionOps.ts`, `propertyJournal.ts`, `removeProperty.ts`, `replaySchemaCascade.ts` (`reachConfig`'s signature is unchanged) |
| `Core/Nexus/remint.ts` | The Context early return (`:68`) | All | The Context arm | `remintLedger.ts` |
| `Core/Nexus/session.ts` | — | All | The adoption chain (private) | `whileAdopting`: `Nexus/handlers.ts` |
| `Desktop/main.ts` | — | All | A remembered-commands check, if the fix lands before the settings move | — |

##### Tests

Line counts at HEAD. `trashRecovery.test.ts` grew from 290 lines at the pin to 714 through the Trash/Link arc (`031952078` through `3e0907013`, and `23890f78b`); `deleteReach.test.ts` grew from 262 to 388, `deleteOrder.test.ts` from 269 to 327, and `restoreProperty.test.ts` from 335 to 378.

| Change | Test Files |
| --- | --- |
| `relocate`, `settleBundle` | `Files/atomicWrite.test.ts` (374, `settleBundle` at `:305-320`), `Trash/deleteOrder.test.ts` (327, mocks `settleBundle`) |
| `renamePage`, `movePage` | `Nexus/page.test.ts` (296), `Files/writePathRace.test.ts` (114, pins the source-path lock) |
| Folder movers, `landedFolder` | `Nexus/folderEntity.test.ts` (88), `Nexus/mutate.test.ts` (2,439) |
| Delete and restore through `mutate` | `Trash/spend.test.ts` (1,713), `Trash/trashRecovery.test.ts` (714), `Trash/restoreScrub.test.ts` (457), `Trash/deleteReach.test.ts` (388), `Trash/restoreProperty.test.ts` (378), `Trash/deleteOrder.test.ts` (327), `Trash/trashRows.test.ts` (231) |
| `holdings.ts` | The Trash files above, plus `Index/indexMaintenance.test.ts` (304), `Properties/journalWiring.test.ts` (353), `Properties/replaySchemaCascade.test.ts` (510) |
| Context rekey, Context and Space renames | `Contexts/contextCascade.test.ts` (666), `Nexus/mutate.test.ts` (2,439) |
| The Space-id read | `Contexts/spaceSidecar.test.ts` (126) |
| `createDisambiguated` | `Paths/names.test.ts` (134, `createDisambiguated` at `:121-134`), `Assets/assetWrite.test.ts` (38), `Assets/assetMigrate.test.ts` (361), `Nexus/mutate.test.ts` (2,439) |
| `matrix.json` | `Matrix/matrixFile.test.ts` (96), `Nexus/configReach.test.ts` (561), `Trash/deleteOrder.test.ts` (327) |
| Context re-mint | `Nexus/remint.test.ts` (442), `Nexus/remintLedger.test.ts` (392) |
| Open serialization | `Nexus/session.test.ts` (43), `Contract/sessionGate.test.ts` (49, drives `whileAdopting`) |
| Menu commands | `Desktop/FileWatch/watcher.test.ts` (452) if the fix keys on the watcher's push; `Desktop/Actions/menu.test.ts` (154) and `editorMenu.test.ts` (148) cover the installers |

##### Names

Candidates, none introduced yet:

- **`relocate`** (`Core/Files/atomicWrite.ts`): the one move, with its `landed` step.
- **`landed`**: the parameter on `relocate`, `renameFolderEntity`, and `moveFolderEntity`.
- **`nameSteps`** (private, `names.ts`), and the new `held` parameter on `createDisambiguated`.
- **The Context rekey `Rewrite`** exported from `contextCascade.ts`, for example `rekeyContext`.
- **The Space-id read** in `spaceSidecar.ts`, for example `spaceIdsIn`.
- **`editMatrixFile`** in `matrixFile.ts`.
- **The Context re-mint arm** in `remint.ts`, for example `remintContextEntry`.
- **The settings-home hook** that tells Desktop `commands` changed, named with the settings move.

Retired: `relocatePage`, `rekeyPassengers`, and `restoredSpaceTitles`.

##### Own Plan

No. The rider is about a dozen edits across the files above, the four defects are small and independent, and F-4 is one arm of phase 2's applier work.

##### Lines

Estimates, excluding comments and tests:

| Phase | Removed | Added | Net |
| --- | --- | --- | --- |
| **1: Rider** (move primitive, guard, rekey, Space-id read, name rule, stale line) | ~90 | ~50 | ~−40 |
| **1: Defects** (matrix, Context re-mint, open chain; `commands` rides the settings move) | ~5 | ~35 | ~+30 |
| **2: F-4** (restore and delete change lists; `landed` and the per-page notes retire) | ~12 | ~30 | ~+18 |
| **3:** `foldersById`, `gatherParentRef`'s stamp | ~13 | ~3 | ~−10 |
| **4:** `liveWorld` | ~11 | ~2 | ~−9 |

#### Out-of-Slice

- The watch tap's `.trash` guard (`tap.ts:51`) looks unreachable, since chokidar never watches `.trash`. This is inferred from the ignore chain, not verified.
- `deleteOp` releases excluded entries without returning `rescope` (`delete.ts:99-107`), so the armed watcher scope (`watcher.ts:77-86`) stays stale until a refresh-class settle re-arms it (`:189-193`).
- The tap admits a path under `.trash` against the exclusion list with the Trash's own chain and bundle folder in front (`exclusion.ts:54`), so an entry like `Library/Private` never matches its trashed copy. A trashed Set's excluded folders appear to reach Sync through the delete's `recordWrite` of the bundle; this is inferred from the admission rule and `pushDirty`'s folder collection, not verified.
- The comment at `remintLedger.ts:128` contradicts the unconditional `seedLiveTree` at `:129` (F-210 is on record).
- Three per-tree id projections apply three different duplicate-id policies (F-188).
- Property restore confirms by a full walk, while property delete confirms by a registry re-read (`mutatePatch.ts:146-148` vs `confirm.ts:48-52`).
- The config-reach removals a delete makes are never recorded (`delete.ts:102`).

#### Confidence

- **Basis:** the traces and inventory were read at `a96a2f317` and re-read at `d7d00240d`; nothing was run.
- **High confidence, verified line by line:** the traces, the tap behavior, the missing `reportRename`, the absent diff, the seven hand-rolled moves, the unreachable path guard, and the four defect sites.
- **LOC:** counted with `wc -l`, so blank and comment lines are included.
- **Survival figures and phase line estimates:** my judgment, roughly ±15% per file.
- **Inferences:** the `tap.ts:51` reachability claim, the trashed excluded folders reaching Sync, the "preview sets" mapping, and whether device rows keyed by a Context id need copying on its re-mint.
