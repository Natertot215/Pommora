### Trash & Archive Restructure — Investigation

**DATE:** 10-29-2026
**HEAD:** `776f3ea94` on `active`, verified against the working tree.

This document reconciles six read-only scouts (delete and the record; restore, empty, and the hand-moved page; reach, the index, paths, and the change-time identity; the interface; owed work, adjacencies, and documentation; the landing and every write beside it) against *Trash & Archive Restructure — Decisions & Intention* through Decision E-4. Every load-bearing claim, and every claim two scouts disagree on, was re-read in the code at HEAD. Findings several scouts made are stated once, with the scouts credited by number. *§The Landing* states the first phase's design, *§The Trash's Model* the design reach-in carries, and *§The Plan's Shape* the proposed phases. The cleaned scout reports sit in `Scouts/` beside this document and hold each scout's inventory, behavior to preserve, and test notes.

---

#### What's True

##### The Stores and Their Layout

**Two Stores, One Module:** `BundleStore` is `{ kind: 'trash' } | ArchiveStore` (`Core/Bundles/layout.ts:10`), and `layoutOf` answers `.trash` with the `.deleted` suffix or `.nexus/archive/<Collection ID>` with `.archived` (`layout.ts:12-19`). `ArchiveStore`, `archiveDirRel`, `archiveSegs`, `archivedCollectionIdOf`, and `isArchived` live in `Core/Paths/nexusPaths.ts:9-19`; `archiveStoreOf`, the guard that a sidecar id can name a folder, lives in `Core/Paths/names.ts:20-21`, with seven production callers (`archive.ts:41,143`, `refile.ts:42`, `bundle.ts:143`, `Bundles/handlers.ts:16`, `placement.ts:204`, `treePatch.ts:124`).

**The Bundle:** `mintBundle` makes `<stamp>__[n__]<basename><suffix>` under the mirrored chain with an atomic `mkdir` loop (`Core/Bundles/bundle.ts:64-79`), so a page's bundle is `<stamp>__Beta.md.deleted` and a Set's `<stamp>__Daily.deleted`. `stampedSegment` identifies the bundle by suffix and stamp together (`layout.ts:36-37`); `bundleAddressOf` derives the store from the path (`layout.ts:40-56`). `originPathOf` is a pure path function: the path under the store root with the bundle segment removed (`layout.ts:59-64`), with 14 production call sites, 11 of which can carry an Archive store.

**The Archive's Chain:** an archived item's chain is its full path when it left, Collection folder included, under its Collection's ID folder (`.nexus/archive/<ID>/Notes/Daily/<stamp>__Beta.md.archived/Beta.md`). The ID folder tracks the current owner while the chain stays as filed, so a cross-Collection carry yields `.nexus/archive/<OTHER>/Notes/Daily/Sub/…` (`Core/Archive/refile.test.ts:124`).

**Flat Trash:** `trashFileFlat` renames a file to `.trash/<chain>/<stamp>__[n__]<name>` with no record and no suffix (`Core/Trash/discard.ts:10-20`). Its one caller is `discardFile` (`discard.ts:36-47`), reached from tiles (`Core/Tiles/tilesFile.ts:156`), the asset sweep (`Core/Assets/assetMigrate.ts:228`), and, in system Trash Mode only, the delete (`delete.ts:133,135`) and the Context and Space finish (`finishOwed.ts:266`). `listBundles` lists only suffixed, stamped folders with a readable record (`bundle.ts:153-176`), so flat entries never appear in the Trash, which Decision C-2 keeps.

##### Delete and the Record

**The Record:** `recordFile` is a discriminated union over page, collection, set, space, property, and context (`Core/Bundles/record.ts:65-98`). The content arms carry `id`, `icon`, `parent`, `place`, `trail`, `archive`, `links`, `targets`, and `partial` (`record.ts:47-62`); `parent` is `root`, `container`, `context`, or `unaddressable` (`record.ts:17-22`), so a page that left a Collection or Set is exactly one whose parent is a container, and `collectionOf` reads its Collection as `trail[0] ?? parent` (`record.ts:165`). A page record's `id` is optional (`record.ts:50`). A Context's `at` decodes `index.optional()` (`record.ts:93`) though `buildContextRecord` always writes it (`Core/Trash/gather.ts:137`).

**Writerless `partial` on Content:** no code sets `partial` on a page, Set, or Collection record. `gatherContentRecord` never writes it (`record.ts:187-221`); `innerRecord` copies it from a container record that can't carry it (`bundle.ts:271`); the Space, Context, and property builders are its only writers (`gather.ts:99,139`, `Core/Properties/deleteProperty.ts:72`). (Scout 1)

**The Delete:** `deleteOp` (`Core/Trash/delete.ts:76-229`, 154 lines) resolves its target (`fromArchive` for an Archive address, `delete.ts:41-61`), reads the tree, lifts set-asides for a container (`:91`), mints the bundle (`:96-99`), gathers `targets` (`:111`), then runs one of three kind arms (Space `:163-186`, Context `:187-204`, content `:205-220`), each building its record, writing it through the `write` closure (`:112-118`), and calling `deleted` (`:141-161`), which runs `runNoted` with the note, the list step and move (`leave`, `:131-139`), and the finish arm as its sweep. A refused note or list step runs `unminted` (`:120-124`); the outer `catch` rolls the lift back and rethrows, leaving the bundle (`:225-228`). The record lands before the move. The Space and Context deletes record what their strips take ahead of the move (`members`, `membership`, from `findHolders` with `'values'`, `delete.ts:178,196`); the content delete records its stripped Link values afterward, when `finishContainer` appends the strip's `links` to the bundle's record (`finishOwed.ts:403-409` through `patchRecord`, which discards `rmwJsonStrict`'s `Result`, `record.ts:141`). (Scout 1)

**What the Delete Lands:** the strip lands through `rewriteHeld` in held 64-file groups (`Core/Files/atomicWrite.ts:47-125`), while the record (`writeRecord` → `writeJson`) and its later `links` patch are lone landings. Each touched file is parsed by the sweep's `rewritten` (`governedSweep.ts:57`) and again by `deleteCascade`'s post-sweep loop (`cascade.ts:141-148`), with `named(raw)` run three times per file (`cascade.ts:124,133,146`). (Scout 1)

**Second Reads of What the Tree Holds:** `gatherSpaceRecord` re-reads the Space's sidecar for id and icon (`gather.ts:78`) and the registry strictly (`delete.ts:164`) to find the parent Context by folder title (`gather.ts:80-84`), while `spaceAt(before, rel)` (`delete.ts:165`) already holds `id`, `icon`, and `contextId`, built from the same sidecar (`Core/Contexts/spaceSidecar.ts:59-82`). `gatherContentRecord` reads `id` and `icon` from disk through `identityOf` (`record.ts:178-185,193`), while `deleteOp` already holds the tree node and keys its note by it (`delete.ts:210`); `mutableTarget` admits only tree-held items (`liveTree.ts:79-87`), and a tree page always carries its ID (`readNexus.ts:120-131`). Two exported `identityOf`s mean unrelated things (`Bundles/record.ts:178`, `Contexts/contextIdentity.ts:33`). The Space guard at `delete.ts:166` re-queries the cached tree `mutableTarget` just checked, so it can't fire; the Context guard at `delete.ts:192` reads the registry file, a source other than the tree, so it can. A content delete calls `nexusPages` twice (`gather.ts:42`, `cascade.ts:107`), and a Space or Context delete twice (`gather.ts:42`, `keyHolders.ts:106`). (Scout 1)

**Three Sibling-Position Mechanisms:** `place { above, below }` for pages, Sets, Collections, and Spaces (`record.ts:43`); a numeric registry index `at` for a Context (`record.ts:93`, computed at `delete.ts:190`, restored through `withContextAt`, `spend.ts:189`, `Core/Contexts/contextsRegistry.ts:52-57`); and a Context's panel id and Space order left in `state.json` while bundled, since `dropDeparture`'s Context arm returns without writing (`Core/Nexus/reorder.ts:77-109`), dropped only at an empty (`spend.ts:109`) or a system-mode finish (`finishOwed.ts:324-325`), both through `dropContextOrder` (`reorder.ts:53-60`). (Scout 1)

**Two Orders of Contexts:** the registry's array order is the sidebar's: `readNexus` builds `tree.contexts` from `registry.contexts` in order (`Core/Nexus/readNexus.ts:248`), and a sidebar drag rewrites the registry (`Core/Interface/Sidebar/sidebarDndModel.ts:323`, `Core/Contexts/reorderContexts.ts:6-14`). `state.json`'s `order.contexts` is the order Context fields take in the Property Panel (`Core/Properties/PropertyPanel.tsx:174,216-223`), written by `reorderPanelContexts` (`reorder.ts:40-41`; `mutate.ts:261-262`). Both order one set for two surfaces, each set on its own, so making them one order is feature-level. `resolveRowOrder` lists unlisted ids after the listed ones (`UIX/Utilities/moveItem.ts:55-67`). `order.spaces[<Context ID>]` is the Context's own Space order (`reorder.ts:43-51`).

**The Property Delete:** `deleteInner` mints and writes the property bundle in `snapshot` (`deleteProperty.ts:63-73`) before its note, and removes it on a refused `runNoted` (`:109-111`); a throw from `writeRecord` leaves the minted folder. Its purge writes each Collection sidecar alone (`unassignAndPurge` → `patchSidecar`, `deleteProperty.ts:139,148-158`) and purges live and archived views only (`deleteProperty.ts:139-140`). (Scouts 1, 5)

##### Restore and Empty

**Two Restores:** `restoreArchived` (`Core/Archive/archive.ts:89-136`, 48 lines) places the record, moves the artifact, writes the order, spends the bundle, runs `returningCascade`, carries archived records (`refileLanded`), and replies with an `archive` Undo. `restoreTrashed` (`Core/Trash/spend.ts:120-303`, 184 lines) adds the property arm (`:126-135`), the frozen world from `targets` (`:154-156`), the destination-schema scrub (`:157-170`), parking (`:171`), the owed-name landing refusal (`:173-185`), the Context's registry entry with rollback (`:186-207`), `restoreNote` (`:209-212`), the `repair` map (`:221-229`), membership re-apply (`:239-264`), the Link refill into live and trashed holders (`:265-288`), owed leftovers (`:289`), and the spend (`:295`). The prelude is written twice (`spend.ts:139-153,173`, `archive.ts:97-116`), and the missing-artifact refusal twice (`archive.ts:95-96`, `spend.ts:136-137`). The Archive spends before its cascade (`archive.ts:115`); the Trash spends after (`spend.ts:295`). `restoreArchived`'s `store.kind !== 'archive'` test (`archive.ts:95`) can't fail, since `mutate.ts:150` dispatches on the same opened store. (Scouts 2, 3)

**A Third Path:** the Undo of a delete from the Archive is a Trash restore with destination `{ kind: 'archive' }`, keyed on `into` at three places in `restoreTrashed` (`spend.ts:195-198,272,297`) and on `placeRecord`'s archive arm (`Core/Bundles/placement.ts:247-264`). It files as `archiveOp`'s `filingOf` does (`archive.ts:68-86`), but names the artifact by the bundle's basename rather than `back.name`, strips `archive`, `links`, `targets`, and `partial` from the record (`spend.ts:197`), and runs neither `refileLanded` (`spend.ts:297`) nor `refileFiled` (`archive.ts:53-54`). (Scouts 1, 2)

**The Link Refill:** a live holder's refill runs one held rewrite per Link definition (`spend.ts:274-285`), so a holder stripped under two Link properties is read, parsed, and landed twice; `refillTrashed` already lands every property in one sweep (`trashedCopies.ts:92-109`). A live holder's miss is named in `unrestored` (`spend.ts:284`), as are the property restore's (`restoreProperty.ts:86-89`) and the re-apply's (`spend.ts:316`); only `refillTrashed` owes its misses. (Scout 2)

**The `Worked` Mechanism:** what a restore couldn't write is carried as `Worked` (`Core/Nexus/owed.ts:32-41`) into a relink entry's `values` (`owed.ts:48,88,100-101,111`) by `oweWorked` (`owed.ts:224-240`) and landed by `landWorked` in `relinkReach` (`Core/Nexus/cascade.ts:288-295,306-308`; `finishOwed.ts:126`). Its only producers are the scrub (`restoreScrub.ts:209-212`) and `refillTrashed` (`trashedCopies.ts:112`), and its one consumer is `spend.ts:232,289`. `withUnswept` (`cascade.ts:80-91`) exists for the scrub's `unread` alone, and `renameFrontmatterKey` (`Core/Files/pageFile.ts:219-229`) has one production caller, the scrub (`restoreScrub.ts:105`). (Scouts 2, 5)

**The Kept Record on a Partial Re-Tag:** `if (!unspent.length) await spendBundle(...)` (`spend.ts:294-295`) keeps `_record.json` in a bundle whose artifact has already moved out. Nothing reads that state: `listBundles` skips an artifact-less non-property bundle (`bundle.ts:165-166`), and `restoreTrashed` and `emptyBundle` refuse it (`spend.ts:136-137,88-89`). `spend.test.ts:797-826` pins the kept file. (Scout 2)

**The Restore Lock:** every Trash restore runs under `inContextsTurn` (`Core/Nexus/mutate.ts:156`; `settle.ts:268-269`), a page's included, and the store is resolved twice, by `openBundle` (`mutate.ts:148`) and `bundleAddressOf` (`mutate.ts:154`). The Contexts lock serves a write that "resolves a Space by title or path to write a tag" (`Core/Nexus/settle.ts:250`), and the scrub does exactly that for any returning page, Set, or Collection, rewriting `<Title>` keys and Space words against `tree.contexts` (`Core/Trash/restoreScrub.ts:141-215`). Context and Space bundles sit under `.trash/.nexus/contexts/`, since `chainDir` mirrors the source path (`bundle.ts:51-61`). (Scouts 2, 5)

**A Restore's Move Re-Reads Its Page:** a Trash end has no corpus path, so `moveIndexPaths` takes its `!oldRel` branch (`Core/Index/indexSeed.ts:232-238`) and indexes without the read, and `applyMove` splits the move into an unlink and an add (`Core/Nexus/fileEvents.ts:602-612`), so `applyPage` reads the page again (`fileEvents.ts:398-402`); a move between two corpus ends renames the row (`indexSeed.ts:240-247`) and still re-reads the landed page (`:248`). The Archive's restore pays the same today. (Scouts 2, 3)

**The Property Restore:** `restoreInner` (`Core/Trash/restoreProperty.ts:38-94`) filters `record.values` to holders `byId` places as a page or Space (`:72-83`), dropping gone Links into `dropped`, then refills through `refillValues` (`:84`), whose `refillOf` re-checks `gonePageEntry` on values the filter already passed (`Core/Nexus/governedSweep.ts:124-133`). It re-assigns through `byId` from `tree.collections` (`restoreProperty.ts:51,53-68`), and `assignInner` refuses a folder the live tree can't place (`Core/Properties/assignment.ts:91-92`). (Scouts 2, 5)

**The Empty:** `emptyBundle` (`spend.ts:60-114`) notes a property's key and runs its finish under the schema lock (`:76-87`), so the property's strip reaches the Trash once its bundle goes; otherwise it notes a container entry with `park: true` (`:94-105`), disposes the artifact and then a Collection's Archive (`:106-107`), drops metadata and Context order (`:108-109`), spends the bundle (`:110`), parks the record's links (`:111-112`), and finishes (`:113`). Its `dispose` (`:70-75`) is `discardFile`'s system arm plus a `permanentDelete` branch, and reads `deps.trashToSystem`, where `setAside` reaches the same seam directly (`atomicWrite.ts:309`). `pageIdsOf` reads every file for ids (`bundle.ts:411-414`, from `spend.ts:92`). (Scouts 2, 5)

##### Reach, the Index, and the Link World

**How the Archive Is Reach-In:** `.nexus/archive` is a corpus root (`Core/Files/walk.ts:43`), admitted by one exemption in `outsideContent`, which holds an Archive path to the hidden rule only below `.nexus/archive` (`Core/Paths/exclusion.ts:63-68`, the Archive reading at `:65`), and watched through the `.nexus` exemption in `neverWatched` (`exclusion.ts:18-27`). The tree leaves both stores out with no store code: the root walk prunes dotted folders (`readNexus.ts:327`), and `classifyEvent` ignores every `.nexus/` path but `contexts` (`fileEvents.ts:231-254`) and every path below a hidden folder (`fileEvents.ts:256`). The index half runs before the tree half (`fileEvents.ts:685-688`), so an archived page edited outside re-indexes on its event. Index readers hide the Archive by hand at six display or reach sites (`matrixGraph.ts:26`, `Core/Nexus/handlers.ts:169`, `cascade.ts:156,276`, `governedSweep.ts:88`, `registryProperty.ts:179`), through `outsideArchive` (`governedSweep.ts:79-81`) or `isArchived`; "is this path in the Archive" is asked three more ways (`delete.ts:42`, `mutate.ts:150`, `mutate.ts:154`). (Scout 3)

**How the Trash Is Out:** `.trash` is hidden to the watcher (`neverWatched`, applied by `syncIgnoredUnder`, `Desktop/FileWatch/watcher.ts:55-66`) and to the index (`outsideContent` reads it `'hidden'`), while Sync's `manifestAdmits` admits `.trash` by judging what's below it (`exclusion.ts:42`). `neverWatched` also feeds `manifestAdmits`, `Core/Assets/adoptFile.ts:24`, and `Core/Assets/assetMap.ts:14`. The Sync tap's drop of watched `.trash` events (`Core/Sync/Client/tap.ts:50`) is unreachable today, since the watcher is the only feeder of `emitWatch` (`watcher.ts:112`) and never raises a `.trash` event. (Scouts 3, 5)

**The Discriminating Constraint:** `nexusPages` answers two things (`Core/Nexus/heldPages.ts:73-85`), across nine production calls. `byId` is the addressing map: tree entities plus archived pages at the store path a writer opens, with `null` where two files claim one id (`claim`, `heldPages.ts:18-20`). `archived` is the resolution half: archived pages at their origin paths. Nothing resolves a title through `byId`. Resolution goes through `linkWorld` (tree plus `archived`, `heldPages.ts:88-92`) and `deleteCascade`'s `after` (tree outside the deleted item plus `archived`, `cascade.ts:108`). `byId` is consulted for writes only: `addressable` (`heldPages.ts:61-64`), which asks only that `byId` holds the id and doesn't mark it null, gates the strip (`cascade.ts:133`), `findHolders`' capture (`Core/Index/keyHolders.ts:124-126`), and `sweepRootsById` (`governedSweep.ts:96-121`), and `heldElsewhere` reads it for the id-live refusal, exempting any path inside the restoring bundle (`placement.ts:38-40,51`). (Scouts 1, 3)

**Holder Sources:** `pagesInReach` (`keyHolders.ts:44-59`) filters pages by `collectionFolders` (`governedSweep.ts:43-47`) plus `archiveReach` (`Core/Nexus/treePatch.ts:122-126`); Spaces come only from the tree through `spaceFiles` (`keyHolders.ts:69-75`), used at `keyHolders.ts:97` and `cascade.ts:128,263`. The index holds pages only (`indexSeed.ts:166`). `owningCollection` reads an Archive path's ID segment or a path's top segment (`treePatch.ts:110-119`), so a `.trash/…` path has no owner, and every consumer of it reads a trashed page as unowned: `refillStash`'s members (`assignment.ts:43`), `stashAndStrip`'s `{ collection }` reach (`Core/Properties/unassignProperty.ts:73`), the repair-on-open sweep's schema (`Core/Properties/repairSweep.ts:20`, through `containerSchema`), and the configuration pass's scoped reach. (Scouts 3, 5)

**The Trash's Partial Reach Today:** three paths rewrite trashed copies: `finishProperty`'s gone-definition arm (`finishOwed.ts:164-186`), `refillTrashed` (`trashedCopies.ts:83-118`, from `spend.ts:287`), and `refillStash`'s splice of `trashedHolders` into its `RootsById` (`assignment.ts:48-61`). Three more read the Trash without rewriting copies: `parkLinks` (`trashedCopies.ts:36-45`), `collectionsElsewhere` (`bundle.ts:186-188`), and `finishContainer`'s `park` arm (`finishOwed.ts:408`). They list value holders by three rules, and judge "governed" two ways: `finishProperty` strips every trashed page, governed or not (`finishOwed.ts:171-184`, through `contentPages`), while `trashedHolders(from)` filters by the record's trail (`trashedCopies.ts:56-57`). (Scouts 3, 5)

**One Composition Written Four Times:** `frozenWorld(linkWorld(tree, archived))` after its own `nexusPages` appears at `restoreProperty.ts:69-70`, `assignment.ts:39,62`, and `spend.ts:140,155-156` with a variant at `:272`; three of the four pass no `targets`. `frozenWorld` lives in `Core/Trash/trashedCopies.ts:23-33`, and its interface `Frozen` in `Core/Nexus/governedRoot.ts:59-63`, whose comment misdescribes the live strip's use of the same shape (`cascade.ts:113-114`). (Scouts 2, 3, 5)

**`heldPages.ts` Holds Two Concerns:** a live-tree id ↔ path service for writers (`heldPages.ts:23-52`) and the stored projection (`:54-103`), which its header admits (`:1-2`). (Scouts 3, 5)

##### The Archive's Filing and Carry

**One Carry, Three Triggers:** `refileArchived` (`Core/Archive/refile.ts:50-63`) re-trails and, across Collections, moves each record archived from within a Set; `refileLanded` (`:75-86`, the restores), `refileFiled` (`:89-96`, `archiveOp`'s Undo filing only), and `refileMoved` (`:102-122`, the settle) each compute `from`, `to`, and `above` their own way. Three formulas answer a record's current trail: `settleArchives` uses `trailAbove` while the parent is live (`refile.ts:132`), `refileArchived` uses `held ?? retrailed(origin, [...above, setId])` (`refile.ts:60`), and `archiveFiling` uses the deepest live container on the record's chain, then `retrailed` (`placement.ts:198-203,216-225`), which subsumes the other two (worked by reading; no test isolates it). `refileMoved` carries Archive records only. (Scouts 2, 3)

**The Open Pass:** `settleArchives` lists and decodes every record of every live Archive and walks the tree for each, every open (`refile.ts:124-153`, run before the seed, `Core/Nexus/handlers.ts:98,104`), to catch Sets moved while the app was closed; an Archive whose Collection answers nowhere moves into the Trash (`refile.ts:145-151`). (Scout 3)

**Ownership by Folder:** `archiveOwned` and `collectionsElsewhere` (`bundle.ts:179-203`) are enumerated over every ID folder twice by hand, in `settleArchives` (`refile.ts:126-145`) and `finishContainer`'s `owedEdit` (`finishOwed.ts:386-400`), with `placement.ts:206` a third caller. `archivedSetIds` and `archivedSets` run the same Set-sidecar walk, one answering ids and one directories (`Core/Nexus/configReach.ts:288-304`). `archivedWithin` (`bundle.ts:142-150`) answers records within a Set from an Archive id alone. (Scouts 3, 5)

**What the ID Folder Buys:** a synchronous owner from a path (`owningCollection`), a one-folder ArchiveView listing (`Bundles/handlers.ts:20-33`), a one-folder discard when a Collection leaves for good (`spend.ts:107`), and origin paths from paths alone (`heldPages.ts:81`). What exists only because of it: `refile`'s cross-folder move (`refile.ts:45`), `moveIntoStore` (`bundle.ts:120-133`), `from` threaded through the carry, `archiveFiling`'s choice and re-root (`placement.ts:198-214`), `archiveOwned` with `collectionsElsewhere`, the orphan sweep, `finishContainer`'s per-folder scan, and `collectionArchive` with its two Trash arms (`archive.ts:139-154`, called only from `delete.ts:102` in system mode and `spend.ts:90`). (Scout 3)

##### Saved Views

**What the Configuration Pass Reaches:** views name things by id (`property_id`, `bandKey(propertyId, optionId)`, Set ids in `group_order`, Location operands, `configReach.ts:121-173`), so renames never stale a view and deletion is the only drift. The pass reaches live containers and damaged folders (`configReach.ts:329-338`), the Archive's Set sidecars (`:339-347`, the own-gone skip at `:342-343`), and the tile docs of the Homepage and live Spaces (`tileHostsOf`, `Core/Tiles/tileHosts.ts:44-56`), each through a serial strict edit (`editJsonStrict`, `atomicWrite.ts:335-350`, its only caller `configReach.ts:321`). Nothing under `.trash` is reached. It has five unscoped callers (`deleteProperty.ts:140`, `optionOps.ts:258`, `finishOwed.ts:322,371,412`) and three scoped ones (`unassignProperty.ts:53`, `move.ts:81`, `finishOwed.ts:412` with `within`). (Scout 5)

**One Collection, Two Models:** a trashed Collection's own Archive stays at `.nexus/archive/<ID>` (`delete.ts:100-103` takes it only in system mode), and `collectionsElsewhere` keeps `archiveOwned` true for it, so every unscoped pass keeps its archived Sets' views current while its own sidecar and nested Sets freeze. A property delete purges live Collections' assignment and stash at the delete (`deleteProperty.ts:98,139`), and trashed Collections' only once the property is gone for good (`finishOwed.ts:176-179`), never their views. `unassignProperty` clears the Collection's views twice, inline in its list step (`unassignProperty.ts:47-51`) and through the scoped pass (`:53`), which re-reads the sidecar and writes nothing. (Scout 5)

##### Owed Work

**The Journal:** `ContainerEntry` (`owed.ts:23-31`) serves three operations told apart by field presence: a delete (`strip`, `edit`, optional `bundle`), an empty (`strip`, `edit`, `park: true`), and a Set move (`edit`, `within`, no `strip`; `Core/Nexus/move.ts:78-83`), and `finishContainer` re-derives which from `e.within` twice (`finishOwed.ts:385,387`). Entries are keyed three ways: the item's id for a live delete or Set move (`delete.ts:210`, `move.ts:79`), the Archive path for a delete from the Archive (`delete.ts:210`'s fallback), and the bundle path for an empty (`spend.ts:94`). `spendBundle` reverse-looks-up a container entry by `e.bundle` and rewrites its strip (`bundle.ts:382-392`), so `Core/Bundles` edits journal entries `owed.ts` otherwise owns. `finishOwed.test.ts` has no container-arm case. (Scout 5)

**Both Stores Write Relink Entries:** the Archive has no arm in `finishOwed`, but its departing re-spell and both restores' repairs write relink entries through `noteRelink` (`settle.ts:307,343`; `restoreScrub.ts:226`; `cascade.ts:325`).

**`park`:** a finish's stripped links go to `bundle`'s record, else to `parkLinks` when `park` is set (`finishOwed.ts:403-409`). A system-mode content delete carries neither (`delete.ts:211-217`), while an empty parks them (`spend.ts:103`). (Scout 5)

**Two `Owed` Types:** `owed.ts:15` (journal name lists) and `fileEvents.ts:97` (the walk and stamp debt), both imported into `finishOwed.ts`. (Scout 5)

##### The Interface

**One Browser, Two Skins:** both skins use `useBundleBrowser` (`Core/Bundles/browser.ts:264`) and `BundleTable` (`Core/Bundles/BundleTable.tsx:33,83`); store differences funnel through `rulesOf` (`browser.ts:236-259`). Each skin writes its own `footing()` (`Core/Settings/TrashFrame.tsx:26-42`, `Core/Archive/ArchiveView.tsx:61-77`) and hand-places a heading over the grid `BundleTable` dictates: the Trash's names its own glyph and rebuilds the kit's `col-header` in `trash-frame.css:30-61`, and the Archive's wears TableView's classes (`ArchiveView.tsx:89-108`, `archive-view.css:1-8`). The headings differ by design in glyph, labels, and alignment. `SettingsWindow`'s `DRAG_SURFACES` names the Trash frame's classes (`Core/Settings/SettingsWindow.tsx:44-45`). The Trash can't declare an action bar, since `useDeclareActions` gates on `useHostShown()` (`Core/Interface/Notifications/notifications.ts:41-48`), false outside a `ContentHostContext` (`Core/Interface/contentHost.ts:15-18`). (Scout 4)

**Three Undo Shapes:** a delete's or archive's Undo is a restore by `MutateOutcome.bundled` with a renderer-chosen destination (`Core/Interface/Confirm/confirmations.ts:54-70,113-124,143-146`); an Archive restore's is a reply-carried `undo` (`archive.ts:125-133`) the browser's `rearchive` re-sends after its own id lookup over `nodesByIdOf` (`browser.ts:144-168`); a delete from the Archive's destination is `ARCHIVE_UNDO`, decided in the renderer (`browser.ts:108,256`), though the host persists the address in the record's `archive` field for it (`delete.ts:59`, read only at `placement.ts:247-250`). A Trash restore offers no Undo. `MutateOutcome.undo` is already the codebase's Undo shape elsewhere (`Core/Nexus/mutateRequest.ts:35-36`, used by `contextWrite.ts:120,128` and `setProperty.ts:29`, consumed by `assignValue.ts:121`), and following an item by id has a shared helper, `livePagePath` (`Core/Nexus/record.ts:63-66`), which serves the reader and `assignValue`. (Scouts 1, 2, 4)

**Dead and Ghost Interface Code:** `confirmDelete`'s `undoTo` has no production caller, and its `undoTo?: never` arm exists for it (`confirmations.ts:88-92`); `browser.deleteOne` hand-rolls the same flow (`browser.ts:401-407`). `archivedKind` coerces every row to page or Set because `requestOf`'s type doesn't express that only the Archive sends `delete` (`browser.ts:59-60,113-120`). `ArchiveView`'s `?? owner.id` (`ArchiveView.tsx:30`) fires only with no tree, and would then send a Set's id as an Archive id. `BundleRows` is the repo's only `lineList` with dummy `commit`, `label`, and `watch` (`BundleTable.tsx:106`). `UIX/Table/table.css:11`'s comment names Core surfaces. (Scout 4)

**Two Notice Owners:** a non-quiet `mutate` posts `unrestoredLine` and, for every op but `delete` and `deleteProperty`, `warnCascade` (`Core/Session/nexusSlice.ts:268-279`); bundle callers then post their own notice, and `post` keeps one notice at a time (`notifications.ts:56-59`). `confirmArchive` doesn't carry the cascade (*§Bugs Found*, B-4). `quiet` has one caller (`browser.ts:436`), and a quiet refusal answers `null` (`nexusSlice.ts:259-260`), so a batch loses the host's message. The Undo's own restore (`confirmations.ts:64`) is non-quiet, so its notices come from the slice. `storesChanged` comes from the slice (`nexusSlice.ts:281`) and the batch (`browser.ts:447`) alone, and no push carries store contents (`Core/Contract/bridge.ts:197`). (Scout 4)

##### System Trash Mode, Leaving Under Decision C-5

**No Setter:** `trashMode` is read from `pommora.json` (`Desktop/Config/appConfig.ts:14,20,43`) and handed to `HostContext.trashMode` (`Desktop/main.ts:304`, `Core/Contract/handlers.ts:63`); no code writes it, and no settings row exists. `'system'` is reachable only by hand-editing the file. (Scouts 4, 5)

**What It Reaches:** every branch, type, key, field, line of copy, and doc passage is inventoried in L-1. `TrashDeps` is referenced on 25 lines across seven production files, plus `trashDeps` in three handler files (`discard.ts:27`; `Nexus/handlers.ts:108,199`, `Tiles/handlers.ts:88,122`, `Assets/handlers.ts:52`); 35 test files declare the literal `trashMode: 'nexus'`, 32 stub `trashToSystem`, and system mode is set at 25 test lines across 13 files. (Scout 5)

---

#### Bugs Found

Each was confirmed by reading the code; none was run. "Uncovered" means no test exercises the failing path.

##### B-1 • A Delete That Throws Before Its Move Leaves an Empty Bundle

- **Cause:** `deleteOp` mints at `delete.ts:99`, then gathers `targets` (`:111`), finds holders (`:178,196`), and writes the record (`:114`) before the move. A throw there, or from the note's own `editNote` inside `runNoted` (`owed.ts:256`), reaches the outer `catch` (`:225-228`), which rolls the lift back and never removes the bundle; only `unminted` does, and only for refusals. The Space and Context guards (`:166`, `:192`) return their refusal after the mint without `unminted`. The property delete's `snapshot` mints and writes with no cleanup (`deleteProperty.ts:63-73`).
- **Evidence:** the empty folder is permanent and invisible: `listBundles` finds no record (`bundle.ts:160-163`), nothing empties it, and Sync's manifest admits it (`exclusion.ts:42`). `fileInto` gets this right (`bundle.ts:109-115`).
- **Coverage:** `archive.test.ts:227-242` drives a thrown record write on a Set delete and asserts only the lift's rollback. Uncovered for the bundle.
- **Fix:** M-1. Independent of the Trash's model. (Scout 1)

##### B-2 • A Property Restore Drops Values for Holders in the Trash

- **Cause:** `restoreProperty.ts:73-76` keeps a value only when `byId` places its holder as a page or Space; a trashed holder reads `undefined`, so the value is filtered out, neither refilled nor named unrestored (`:86-89` names only survivors), and `spendBundle` discards the record (`spend.ts:133`).
- **Sequence:** page A holds property P; P is deleted (A stripped, A's value in P's record); A is deleted; P is restored, and A's value is lost for good.
- **Coverage:** uncovered; `restoreProperty.test.ts:492` pins a hard-removed holder, a different case.
- **Fix:** dissolves under reach-in, where trashed pages sit in `byId` and `refillValues` reaches them. (Scouts 2, 3)

##### B-3 • A Property Gone for Good Stays on Trashed Spaces

- **Cause:** `finishProperty`'s gone-definition arm lists trashed holders with `contentPages` (`finishOwed.ts:176-183`), which answers `[]` for a Space or Context (`bundle.ts:395-408`), and adds only trashed Collection sidecars as folders. A trashed Space's `_space.json`, or a trashed Context's Space sidecars, keep the value; `trashedHolders` would have found them (`trashedCopies.ts:70-76`).
- **Coverage:** uncovered; `spend.test.ts:2624-2659` covers trashed pages and Collections only.
- **Fix:** dissolves under reach-in once the stored-Space source lands (*§The Trash's Model · §Added*), since trashed Spaces are then holders of the property delete's own strip; until then it stands. (Scout 5)

##### B-4 • An Archive Whose Re-Spell Misses Loses Its Warning and Try Again

- **Cause:** the slice posts `warnCascade` for an archive's `cascade` (`nexusSlice.ts:270-279`), and `confirmArchive` then posts `Archived “T”` through `notifyUndoable` without it (`confirmations.ts:143-146`); `post` keeps one notice (`notifications.ts:56-59`), so the warning and its Try Again are replaced. `departingCascade` returns `linksNotUpdated` when the index can't settle (`settle.ts:361-380`).
- **Coverage:** uncovered.
- **Fix:** M-14. Independent of the model. (Scout 4)

##### B-5 • A Failed Empty Can Return a Collection's Archive as Trash Rows

- **Cause:** `emptyBundle` disposes the Collection's artifact, then its Archive (`spend.ts:106-107`). If the Archive's disposal throws, the bundle holds its record alone, so `listBundles` stops listing it (`bundle.ts:165-166`), `collectionsElsewhere` stops counting the Collection as trashed (`bundle.ts:186-188`), and the next open's `settleArchives` reads the Archive as orphaned and moves its bundles into the Trash (`refile.ts:145-148`).
- **Coverage:** uncovered; `trashRecovery.test.ts:1051` pins the views only.
- **Fix:** M-7's order, the Archive disposed before the artifact. Independent of the model. (Scouts 4, 5)

##### B-6 • A Set Restored From the Trash Carries From a Stale Archive

- **Cause:** `restoreTrashed` passes `collectionOf(originOf(stored))` as the Archive to carry out of (`spend.ts:296-297`), while the Archive's restore passes the store holding the bundle now (`archive.ts:121`). A Trash record's trail is never re-trailed, since `refileMoved` carries Archive records only (`refile.ts:102-123`). If a trashed Set's former parent moves to another Collection, the Set's archived descendants are carried there by trail; restoring the Set into a third Collection then searches the old Archive, finds nothing, and leaves them misfiled.
- **Coverage:** uncovered; the next open's `settleArchives` repairs it (`refile.ts:129-141`).
- **Fix:** M-10, `from` from where the records sit now. Independent of the model. (Scouts 2, 3)

##### B-7 • A Stash Refill Keeps a Dead Entry for a Trashed Copy

- **Cause:** `refillStash` computes `gone` over live members only (`assignment.ts:63-72`). A trashed copy's stashed Link naming a gone page is refused by `refillOf` (`governedSweep.ts:124-133`), isn't in `gone`, stays in `owed` (`assignment.ts:75-77`), and is retried on every re-assign.
- **Coverage:** uncovered.
- **Fix:** M-12's one partition, over members the stored-origin reader (M-9) answers; under reach-in trashed copies are members like any other. (Scouts 3, 5)

##### B-8 • Edge Cases That Follow From Outside Writes or Hand Edits

- **A Stray File Under an Archive:** `outsideContent` admits any visible `.md` under `.nexus/archive` (`exclusion.ts:65`), so `.nexus/archive/<ID>/loose.md` is indexed, claimed in `byId` (`heldPages.ts:80`), and given the origin `loose.md`, since `originPathOf` removes nothing when no segment is stamped (`layout.ts:59-63`). Fixed by M-16's admission. Uncovered. (Scout 3)
- **Two Exclusion Readings:** `listInner` judges an inner item by its origin path (`bundle.ts:334`), the index by its store path (`exclusion.ts:65-67`), so an archived page whose origin lies under a folder excluded since is hidden from the browser and still indexed. Fixed by M-16. (Scout 3)
- **A Trash Mode Flip Mid-Finish:** `leave` routes by the current mode (`finishOwed.ts:259-268`), so a system-mode Context or Space delete cut short and finished after the mode reads `nexus` drops a record-less flat folder into `.trash`. Reachable only by hand-editing `pommora.json`; it leaves with L-1. (Scout 5)

##### B-9 • A Page Restored After a Rename Comes Back Holding the Old Names

- **Cause:** the scrub moves a returning key or word only to a current one whose label some format spells the same way (`matchOf`, `restoreScrub.ts:46-58`). A property, option, Space, or Context renamed while the page sat in the Trash leaves no spelling to match, so the old key, word, title, and `<Title>` key return as foreign data.
- **Evidence:** the reach-in measurement's spot check, in every cell at `15fe7422a` and again at `9b9c0d630` (*§The Trash's Model · §The Measurement*).
- **Coverage:** pinned as intended for a renamed property (`restoreScrub.test.ts:516`). A Link value the delete stripped from another page comes back under the new name, since the record files it by the property's id (`trashRecovery.test.ts:516`); only what the trashed copy itself holds stays old.
- **Fix:** reach-in: the cascade renames the trashed copy as it renames a live one. (Measurement)

##### B-10 • A Crash Mid-Strip Loses a Content Delete's Link Values

- **Cause:** a content delete's record lands ahead of the move without `links` (`delete.ts:114`); the strip then lands in 64-file groups, and only afterward does `finishContainer` append the stripped values (`finishOwed.ts:403-407`). A crash after any group lands and before the patch leaves values stripped and recorded nowhere: Try Again re-runs `deleteCascade`, finds nothing left to strip, and appends nothing, so Decision B-2's refill is lost for those holders. `patchRecord` also discards `rmwJsonStrict`'s `Result` (`record.ts:141`), so an unreadable record drops the links silently. Space and Context deletes record their strips' values ahead and don't meet this.
- **Coverage:** uncovered (inferred, not run).
- **Fix:** M-17, the content delete recording its `links` up front. Independent of the model; under reach-in this record is also the only refill source for trashed linkers. (Scout 1)

##### B-11 • A Page Dragged Out of an Archive by Hand Reads as Archived

- **Cause:** `.nexus/archive` is watched, so a page dragged out of an Archive pairs in `payOutsideMoves` as a move whose `from` is its Archive store path (`indexSeed.ts:161`, `settle.ts:396-403`); the lane's world before then holds an archived page at its store path, while every other reader resolves archived pages at their origin (`heldPages.ts:81`), and its emptied bundle stays as record-only litter `listBundles` skips (`bundle.ts:165-166`).
- **Coverage:** uncovered.
- **Fix:** Decision E-3's recognition (*§The Trash's Model · §Recognition by ID*). (Scout 2)

---

#### Removal & Consolidation Ledger

Ordered removal-first: residue, then merges, then the landing, then relocations. Deltas are production lines, rough, and exclude tests and docs unless stated; *§The Net* states where items overlap. **Depends** names what an item waits on: *reach-in* (lands with the Trash's move onto it, Decision D-1), *the landing* (Decisions G-1, G-3, and G-4), or *none*.

##### Residue to Remove

- **L-1 · System Trash Mode (Decision C-5):** a delete always mints a bundle in the Nexus's own Trash. What leaves:
  - **Type and Setting:** `Core/Trash/trashMode.ts` (`TrashMode`, `DEFAULT_TRASH_MODE`); `AppConfig.trashMode`, `trashModeOf`, and its decode (`Desktop/Config/appConfig.ts:6,14,20,43`); `main.ts:47,304`; `HostContext.trashMode` (`Core/Contract/handlers.ts:8,63`).
  - **Branches:** `TrashDeps.trashMode` and `discardFile`'s system arm (`discard.ts:8,23,29,41-45`); the delete's no-bundle path, its Collection-takes-its-Archive arm, its metadata drop, and its system discards (`delete.ts:96-108,133,135,138`, with `collectionArchive`'s import at `:3` and `pageIdsOf`'s use); the `bundle ? … : …` conditionals the system path forces (`delete.ts:73,113,121,164,172,193,207,216,222`); `finishOwed`'s `leave` discard branch (`finishOwed.ts:266`) and its system order drop (`:324-325`); every Context and Space delete's entry carries `bundle` (`owed.ts:21-22`), so the finish's no-bundle branch has no writer.
  - **Contract and Copy:** `delete:facts`'s `trashMode` half (`Core/Trash/handlers.ts:4,11,14`; `bridge.ts:10,203`, whose comment at `:202` names the system trash); `DELETE_FACTS_FALLBACK.trashMode` (`confirmations.ts:4,13`); `askTrashing`'s system wording, "It will be moved to the system trash." (`confirmations.ts:75,79-82`); `confirmDelete`'s clause "A system-trash delete mints no bundle, so it offers no Undo" (`confirmations.ts:88`); `MutateOutcome.bundled` becomes always present for a held-item delete until M-13 replaces it.
  - **Docs:** `CorePM.md:56,148,171`, `DesktopPM.md:38`, `ConfigurationPM.md:266`, `NexusRecordPM.md:12,16`, `InterfacePM.md:80`, `SurfacePM.md:26`, and `.claude/CLAUDE.md:94` ("Deletion, Trash Mode, and restore").
  - **Tests:** the 25 system-mode lines across 13 files (`archive.test.ts:927`, `assetMigrate.test.ts:224`, `writePathRace.test.ts:83`, `confirmations.test.ts:200`, `finishOwed.test.ts:768`, `mutate.test.ts:721,746,1417,3701`, `settle.test.ts:854`, `setSpaceProperty.test.ts:26`, `tilesFile.test.ts:358`, `deleteOrder.test.ts:222`, `deleteReach.test.ts:331,445,613,677`, `spend.test.ts:343,354,384,1888`, `appConfig.test.ts:59-60,87-92`); the cases that pin system behavior go, and the ones that only borrowed the mode switch to the Nexus's Trash.
  - **What Stays, and Why:** `trashFileFlat` and the flat `discardFile`, because tile texts (`tilesFile.ts:156`) and the asset sweep (`assetMigrate.ts:228`) still discard through them (Decision C-2); `trashToSystem`, because an empty without Permanently Delete hands the item to the operating system's trash (`spend.ts:70-75`), and `setAside`'s own call (`atomicWrite.ts:308-311`); `delete:facts` narrowed to `permanentDelete`, because the empty's question reads that setting at the moment of asking (`bridge.ts:202`); `chainDir`'s escape test, because asset files outside the Nexus still go flat.
  - **Delta:** about −70 (inferred). **Depends:** none. (Scouts 1, 4, 5)
- **L-2 · `TrashDeps` (Follows L-1):** with the mode gone, `discardFile` is the flat arm alone and `leave` has no discard, so `TrashDeps` threads only `mutate` → `emptyBundle` to reach one reader, `dispose`. `dispose` reads `machine().trashToSystem` with the same refusal, as `setAside` already does (`atomicWrite.ts:309`), so the seam is spelled one way: `TrashDeps` and `trashDeps` (`discard.ts:22-33`) leave with the `deps` parameter in `mutate.ts:71,77,80,87,162,325`, `finishOwed.ts:73,99,113,263,274,334`, `tilesFile.ts:124,150,168,201`, `assetMigrate.ts:158,222,228`, `Testing/settledMutate.ts:16,19`, and the three handler files; the 35 test literals and 32 stubs go, and the empty's two cases install a machine. **Delta:** about −30. **Depends:** L-1. (Scouts 1, 5)
- **L-3 · Context Position Through `place` (Decision C-4):**
  - **Record:** the Context arm's `at: index.optional()` becomes `place` (`record.ts:90-97`), optional as every other kind's is.
  - **Gather:** `ContextEvidence.at` and `buildContextRecord`'s `at` (`gather.ts:103-141`) become `placeOf(tree.contexts ids, entry.id)`, `tree.contexts` being registry order (`readNexus.ts:248`); this folds into M-4. `deleteOp` keeps the registry index locally for its own rollback on a failed move (`delete.ts:190,201`), an in-op undo rather than a stored position.
  - **Departure:** `dropDeparture`'s Context arm (`reorder.ts:106-107`) drops the Context's id from `state.json`'s `order.contexts` as the Space arm drops a Space's (`reorder.ts:97-104`).
  - **Re-Entry:** the restore's registry write (`spend.ts:186-192`) splices the entry beside the neighbor `place` names, `slotOf` choosing the anchor (`placement.ts:152-159`), before the folder moves, since a Context's identity lives in its registry entry; `withContextAt`'s index parameter gives way to that splice, and `placeRecord` keeps its Context early return (`placement.ts:277`).
  - **Two Orders:** Decision C-4 has a Context's record name its neighbors in both the registry order and the panel order through the one `place` rule, so a restored Context returns to its spot in each.
  - **Its Own Space Order:** two shapes, *§Approaches Worth Weighing*, 4.
  - **Tests and Docs:** `spend.test.ts:299-350` are rewritten or go; `NexusRecordPM.md:10,14,16`'s Context position and Space order sentences change.
  - **Delta:** about −10 (inferred), one mechanism fewer. **Depends:** none. (Scout 1)
- **L-4 · Compatibility-Only Decodes (Decision C-3):**
  - **A Context Record's Optional `at`** (`record.ts:93`), optional only for records written before `43c127c2b`; `spend.test.ts:314-322` pins its decode. It leaves entirely under L-3.
  - **Content `partial`** (`record.ts:61`), read by `rows.ts:93,147`, `recordedPartly` (`record.ts:102-109`), copied by `innerRecord` (`bundle.ts:256,271`), and destructured at `spend.ts:197`. The assertions pinning its absence (`deleteOrder.test.ts:168,174,215`; `deleteReach.test.ts:800-806`) go with it.
  - **The Retired `.provenance.json` Format:** no production code reads it; `spend.test.ts:685-699` pins only that such entries stay invisible, and goes.
  - **A Record That Stops Decoding:** none. Every record arm is a `z.object` (`record.ts:47-97`; zod `^4.4.3`), which strips an unknown key, so a Context record carrying `at` and a content record carrying `partial` or `targets` decode and stay listed; an older Context record restores at the end of the sidebar order (`withContextAt`'s default, `contextsRegistry.ts:55`). A record drops out only if a field becomes required or an arm strict, so `place` stays optional on the Context arm and `id` stays optional on the page arm (`record.ts:50`): an ID-less page record can't be recognized under Decision E-1 or addressed under reach-in, and Decision C-8 gives such bundles no handling.
  - **Adjacent State:** a `pommora.json` `trashMode` key survives as an unmodeled field (`updateAppConfig` overlays the raw object, `appConfig.ts:49-50`) that nothing reads; a journal entry a system-mode delete left unfinished gets no handling (Decision C-8).
  - **Delta:** about −6, about −40 in tests. **Depends:** none. (Scouts 1, 2)
- **L-5 · The Kept Record on a Partial Re-Tag:** always spend; `unspent`'s gate, the comment at `spend.ts:294`, and the "record stays" assertions in `spend.test.ts:797-826` go, with `NexusRecordPM.md:14`'s "the record is removed once every page still present has its tag back". **Delta:** about −3. **Depends:** none. (Scout 2)
- **L-6 · `confirmDelete.undoTo`:** the field, its `never` arm, its comment clause, `:108`'s argument, and `confirmations.test.ts:275-283`. **Delta:** about −4. **Depends:** none. (Scout 4)
- **L-7 · Ghost Guards:** `delete.ts:166`; `gatherSpaceRecord`'s null and `unaddressable` arms (`gather.ts:79,96`) once M-4 builds the record from the tree; `restoreArchived`'s store test (`archive.ts:95`); `ArchiveView`'s `?? owner.id`; `archivedKind` (`browser.ts:59-60`) once `requestOf`'s `delete` arm is typed for the Archive's kinds. **Delta:** about −8. **Depends:** none. (Scouts 1, 2, 4)
- **L-8 · Test-Only Exports:** `slotOf` (`placement.ts:152`, which L-3 then uses in production) and `returningNames` (`settle.ts:311`) stop being exported for tests alone. **Delta:** ±0. **Depends:** none. (Scout 2)
- **L-9 · The Record's `archive` Field:** persisted forever for a toast-lived Undo (`record.ts:56-57`, written only at `delete.ts:59`, read only at `placement.ts:247-250`); it leaves when the delete-from-Archive reply carries its own Undo (M-13). **Delta:** about −5. **Depends:** M-13. (Scouts 1, 4)
- **L-10 · Frozen-Model Machinery:** what reach-in removes, with the scrub removed whole:
  - **`targets` End to End:** `pageRelationsOf` and `gatherLinkTargets` with ten imports (`gather.ts:24-58`, −45); `delete.ts:34,56,111,116`, where `fromArchive.under` loses its only reader and the `write` closure collapses to `writeRecord` (−8); `record.ts:39-40,60,76,95` (−5); `bundle.ts:270` (−1); `spend.ts:154-156`'s frozen world and `:221-229`'s `repair`; `returningCascade`'s `repair` parameter (`settle.ts:333,343`, −2). I-069 dissolves with it.
  - **The Scrub:** `matchOf`, `currentKeys`, `scrubReturning`, and their imports (`restoreScrub.ts:1-127,140-215`, about −205), with the scrub's ID minting for an ID-less returning page (`restoreScrub.ts:206-208`), since the walk stamps such a page once it lands; `renameFrontmatterKey` (`pageFile.ts:219-229`, −11), its tests moving to `sweepParse(...).rekey`; the restore's scrub, schema read, and parking (`spend.ts:157-171`); `withUnswept` (`cascade.ts:80-91`, −13).
  - **The Trashed Refill:** `frozenWorld`, `trashedHolders`' page arm, `refillTrashed`, and their imports (`trashedCopies.ts:3-17,22-33,47-118`, about −92, the Space and Context arms re-homed as the stored-Space source); the trashed split, `worked`, and the owed join (`spend.ts:230-235,273-295`, with `spend.ts`'s dead imports about −47 in all); `refillStash`'s splice (`assignment.ts:48-61`, −12).
  - **`Worked` (Decision D-5):** `Worked`, `workedOut`, `RelinkEntry.values`, `oweWorked`, `landWorked`, and `relinkReach`'s values sweep lose their last writers (`owed.ts:32-41,48,88,100-101,111,224-240`; `cascade.ts:288-295,306-308`; `finishOwed.ts:126`), about −43.
  - **The Property Side:** `finishProperty`'s Trash arm shrinks to its trashed-Collection sidecar listing (`finishOwed.ts:166-175,181-184`, about −8), since trashed pages lose a deleted property's values at the delete (Decision D-4).
  - **The Empty:** `originPagesIn` and its `id` overload (`bundle.ts:416-426`, −11).
  - **What Dissolves:** B-2, B-7, and B-9 by construction, and B-3 with the stored-Space source.
  - **Delta:** about −500 (inferred). **Depends:** reach-in. (Scouts 1, 2, 3, 5)

##### Merges

- **M-1 · One Mint-and-Record Primitive:** every `mintBundle` caller writes a record right after it (`delete.ts:99`→`:114`, `deleteProperty.ts:63`→`:64`, `fileInto` `bundle.ts:103`→`:110`, `Testing/fixtures.ts:52`), so `mintBundle` takes the record and removes the bundle when the write throws, with no new function; `fileInto` keeps a `try` around `relocate` alone; `deleteOp` gathers every record before it mints, so the guards refuse before anything exists, and `unminted` and the outer catch fold into one cleanup that also covers a throw from `editNote`. Fixes B-1. **Owner After:** `Core/Bundles/bundle.ts`. **Delta:** about −10. **Depends:** none. Delete calling `fileInto` whole stays blocked by the note's ordering: a Context or Space finish moves a stuck folder into the bundle the note names (`finishOwed.ts:259-268,318,347`). (Scout 1)
- **M-2 · `deleteOp`'s Arms as Plans Feeding One Tail:** each kind yields `{ id, record, note, unlist?, relist? }`, and one tail runs `deleted`, the cleanup, and the reply; with L-1 every arm has a bundle, so the tail carries no `bundle ?` branches. **Delta:** about −20 beyond L-1. **Depends:** L-1, M-1. (Scout 1)
- **M-3 · One Restore With Record-Driven Arms:** every Trash-only step selects itself from the record (`links`, `entity`, `membership`, `members`, `registry`), and Archive records carry none of those, so one restore covers both stores in thirteen steps (*Scouts/2-Restore-Spend.md · §The One Restore's Steps*): the property arm; one missing-artifact refusal; `nexusPages` and `placeRecord`; the Context and Space owed-name refusal; the Context's registry write-ahead; the move, `fileInto` for an `into` destination; `restoreNote` and `writeOrder`; the spend, before the cascade in the Archive's order; `returningCascade` without `repair`; the re-apply; one Link refill sweep applying each Link definition's `refillOf`, over the link world read after landing, which removes the `into` world switch (`spend.ts:272`); `refileLanded` with `from` from M-10; and the reply. The only store branch left is the reply's Undo. The lock is chosen by origin: the dispatch keeps its synchronous `bundleAddressOf` read (`mutate.ts:154`) and takes the Contexts turn only for a bundle whose chain lies under `.nexus/contexts`, reading no record first. A restore's move hands its read on through `moveIndexPaths` and `applyMove` (Write Path's open item, about +3), which serves both stores. The two restores (184 and 48 lines) become about 140. **Owner After:** a placement (P-14). **Delta:** about −45 beyond L-10 (inferred). **Depends:** reach-in. (Scout 2)
- **M-4 · Records From the Tree:** `gatherSpaceRecord` takes `id`, `icon`, and `contextId` from the `SpaceNode` and the group from `contextWorldOf`, dropping `readRegistryStrict` at `delete.ts:164`, the sidecar re-read, and the title lookup; `gatherContextEvidence`, `buildContextRecord`, and `ContextEvidence` fold into one function that also writes L-3's `place`; `gatherContentRecord` takes the tree node, so `identityOf` keeps one caller (`innerRecord`, `bundle.ts:263`), inlines into it, and stops sharing a name with `contextIdentity.ts`'s export (`archive.ts:85` benefits the same way). `spaceIdsIn`'s disk scan (`gather.ts:115`) stays until it's confirmed that an unusable Space sidecar reaches `tree.unreadable` (unverified). **Delta:** about −24. **Depends:** none. (Scout 1)
- **M-5 · One Record-Links Helper Pair:** `appendLinks` (`trashedCopies.ts:18-21`), its inline twin with a cast (`finishOwed.ts:404-407`), and `spendBundle`'s inverse filter (`bundle.ts:374-381`) become an append and a remove beside `patchRecord` in `record.ts`. **Delta:** about −8. **Depends:** none. (Scouts 2, 3, 5)
- **M-6 · One Container Note, `park` Retired, the Set Move Its Own Kind:** the delete's (`delete.ts:211-217`) and the empty's (`spend.ts:95-104`) container notes share one builder. With L-1, an entry with a `strip` and no `bundle` is always an empty, so the finish parks whenever it has no bundle (`finishOwed.ts:403-409`). The Set move becomes its own entry kind `{ at, edit, within }`, so `finishContainer` loses both `within` tests (`finishOwed.ts:385,387`). **Owner After:** `Core/Nexus/owed.ts`. **Delta:** about −15. **Depends:** L-1. (Scouts 1, 5)
- **M-7 · The Empty's Gone-for-Good Step:** with L-1, `emptyBundle` is the sequence's one home: `collectionArchive`, `pageIdsOf` over pages plus Archive files, the strip over `distinct(pages, archive.origins)`, `goneContainers(archive.sets)`, disposal, `dropPageMetadata`, and L-3's remaining order drop, with the Archive disposed before the artifact (B-5). **Owner After:** `Core/Trash/`. **Delta:** ±0. **Depends:** L-1. (Scouts 1, 2, 5)
- **M-8 · The Two `leave`s:** with L-1, `deleteOp`'s `leave` (`delete.ts:131-139`) and the finish's (`finishOwed.ts:259-268`) are both "relocate the folder into its bundle", the finish's adding `oweWalk`; one step serves both. **Delta:** about −6. **Depends:** L-1. (Scouts 1, 2, 5)
- **M-9 · One Stored-Origin Reader:** `archivedWithin` (`bundle.ts:142-150`) takes a `BundleStore` and answers a store's bundles by the Collection their record left (`collectionOf(originOf(record))`), with `within` narrowing to one Set as today. It is the one source of a stored item's owner, which `owningCollection` can't answer for a `.trash` path, and serves the governed reach (Decision D-4) and the `{ collection }` reach in `pagesInReach`, `refillStash`'s members, the scoped configuration pass, `finishProperty`'s trashed-Collection purge, and the repair sweep's schema for a trashed page. **Delta:** about +15 (+3 to +5 for the reader, +3 to +15 in `pagesInReach`; inferred). **Depends:** reach-in. (Scouts 3, 5)
- **M-10 · One Current-Trail Resolver, One Carry:** `archiveFiling`'s deepest-live-ancestor rule lifted into `record.ts` as `currentTrail` replaces the three trail formulas; `refileLanded`, `refileFiled`, and `refileArchived` merge into one carry taking `to` from the record; `refileMoved` keeps its delta walk. Fixes B-6. **Owner After:** `refile.ts` for the carry, `record.ts` for the resolver. **Delta:** about −40 (inferred). **Depends:** none. (Scouts 2, 3)
- **M-11 · One Owned-Archives Iterator and One Archived-Set Walk:** `settleArchives`, `owedEdit`, and `placement.ts:206` share one iterator; `archivedSetIds` and `archivedSets` share one walk and one scope read. **Delta:** about −15. **Depends:** none. (Scouts 3, 5)
- **M-12 · One Gone-Link Partition and One Link World:** with `targets` gone, `frozenWorld` only wraps `index.holders(t).length > 0` while `cascade.ts:114` builds `Frozen` by hand, so `Frozen` reduces to the link world itself; `restoreProperty.ts:72-83` and `assignment.ts:63-72` share one partition with `refillOf` as the single checker. Fixes B-7 with M-9. **Delta:** about −10 beyond L-10. **Depends:** reach-in. (Scouts 2, 3, 5)
- **M-13 · One Undo Shape:** every reversible bundle reply carries `undo`, as `MutateOutcome.undo` already does elsewhere, and the host composes it for a delete, an archive, and a restore, setting the Archive destination where `fromArchive` ran. `ARCHIVE_UNDO`, `Undone`, `undoneOf`, `rearchive`, `rulesOf.restoreUndo` and `.deleteUndo`, `many`'s `bundled` and `undone` collection (`browser.ts:420-421,429-430,444-445`), `offerUndo`'s and `offerDeleted`'s destination parameters, and `MutateOutcome.bundled` go; L-6 and L-9 follow. Which side finds the item to undo is *§Approaches Worth Weighing*, 3. `BundleRow.stored` keeps one reader (`ArchiveView.tsx:32`) and its doc (`rows.ts:41`) narrows. **Delta:** about −30 net (inferred). **Depends:** none. (Scouts 1, 4)
- **M-14 · One Notice Owner for Bundle Ops:** bundle-op callers own the whole notice through one builder, single-row actions run as a batch of one (`restoreOne` and `deleteOne`, `browser.ts:383-407`, leave), and the Undo's own restore runs under the same owner, so the slice posts nothing for a bundle op; a single row's refusal keeps the host's message. Fixes B-4. **Owner After:** a placement (P-15). **Delta:** about −30. **Depends:** none. (Scout 4)
- **M-15 · `BundleTable` Owns the Footing and the Date Column:** `useDateColumn` and `widestDate` move from the hook into the table, keyed `` `${kind}ColumnStyle` `` (dropping `DateKey` and `rulesOf.dateKey`), a relocation; the two `footing()` switches become one footing taking each store's copy; `DRAG_SURFACES` follows whatever class the shared parts wear. The headings and their CSS stay per skin, since they differ by design (Decision C-7). **Delta:** about −20 to −30 (inferred). **Depends:** none. (Scout 4)
- **M-16 · One Store-of-Path Rule:** `storedAt(rel)` answers `{ store, bundle, inner, origin }` for a path inside a stamped bundle, and null otherwise, pure and path-only from the stamp parse and store suffixes (`layout.ts:12-37`). It replaces `archiveSegs`, `archivedCollectionIdOf`, `isArchived` (`nexusPaths.ts:13-19`, −7), `outsideArchive` (`governedSweep.ts:79-81`, −3), `bundleAddressOf`'s store derivation and `stampedSegment`'s separate role (`layout.ts:35-37,44-48`, −5), `nexusPages`' Archive parse (`heldPages.ts:78-81`, −2), and the three spellings of "in the Archive" (−1); it feeds `outsideContent`, the six display and reach hides, and the walk's roots. It fixes both halves of B-8 and states Decision C-2 as a rule: nothing outside a bundle is content. Its name collides with `storedAtOf` (`layout.ts:25`) and the rows' `storedAt` field (`rows.ts:91,99,168`), so one is renamed. **Delta:** about ±0 (−17, +20 with *§The Trash's Model*'s admission). **Depends:** none; it precedes reach-in. (Scout 3)
- **M-17 · One Delete Order, Values Recorded Ahead:** the content delete records the Link values its strip will take before the move, as the Space and Context deletes record `members` and `membership`, so every delete writes its record once with what it takes. The finish's append for a delete leaves, with `deleteCascade`'s post-sweep loop and `DeleteCascade.links` for the delete (Write Path's OP-4); the empty's parking still reads the strip's links (`finishOwed.ts:408`). A value written between the gather and the strip is stripped unrecorded, the window all three deletes then share, and each holder is read at the gather and again at the strip, as a Space delete's are. Fixes B-10. **Owner After:** the gatherer beside `gatherSpaceRecord` in `Core/Trash/gather.ts`, or beside the strip that shares its `gone` rule in `Core/Nexus/cascade.ts` (P-16). **Delta:** about ±0 (inferred). **Depends:** none. (Scout 1)
- **M-18 · One View Clear on Unassign:** `unassignProperty`'s scoped pass (`unassignProperty.ts:53`) re-reads the sidecar its list step already cleared (`:47-51`) and writes nothing; the list step keeps the clear for its stated atomicity (`:46`). **Delta:** about −3. **Depends:** none. (Scout 5)

##### The Landing's Items (Decisions G-1, G-3, and G-4)

*§The Landing* states each item's design and evidence.

- **LD-1 · `land` Answers a Post-Rename Stat:** the temp's `fstat` moves into `stage`, and the commit answers `fileStat(await stat(path))` after the rename (`Desktop/Platform/nodeMachine.ts:79,84`), so the host and the disk double (`Core/Testing/machines.ts:164`) agree for the first time; the memory machine gains a change-time counter set on every `land` and `rename` (`machines.ts:74-100,121-126`). **Delta:** about +4. **Depends:** none. (Scouts 3, 6)
- **LD-2 · The Change-Time Identity:** `FileStat` gains `ctimeMs` (`Core/Platform/machine.ts:2-7`), `fileStat` maps it (`:31-42`), and `sameFile` compares it in place of birth (`:22-29`), its APFS-birth caveat and T-N40's skip-off-macOS leaving; `describes` (`indexSeed.ts:110-112`) converges into `sameFile`, one identity of a file instead of two; `IndexedStat` (`Core/Platform/stores.ts:30-35`), the rows (`indexSeed.ts:182,295`), the SQLite store (`Desktop/Store/ddl.ts:41-45`, `stores.ts:46-52,69-71,82`), and `memoryStores.ts` carry it; `INDEX_GENERATION` 19 → 20 (`ddl.ts:3`). `birthtimeMs` stays for `adopt.ts:79` and `remintLedger.ts:77`. **Delta:** about +10. **Depends:** LD-1. (Scouts 3, 6)
- **LD-3 · One Flush per Group:** temps open with write-through, and one flush per device makes the group durable before any rename. **Delta:** about +6. **Depends:** none. (Scout 6)
- **LD-4 · Vouched Rows Passed Over:** the clash check and option edits pass over the rows the index vouches for (Decision G-1), re-applying the Write Path plan's Task 2-1 and 2-2 AFTERs (`unlessVouched` +15, `HolderQuery.every` +8, the option edit's `passOver` +12), with a fresh stat per passed-over page; the clash check's stored-row hide moves ahead of its read (`registryProperty.ts:173-182`), so trashed holders of the old key aren't read only to be discarded. **Delta:** about +35. **Depends:** LD-1, LD-2. (Scout 3)
- **LD-5 · The Echo by Stat:** an own write's echo record carries the stat its landing answered, and the drain compares `sameFile(record.stat, stat)`; `Echo.hash`, `recordWrite`'s content parameter, `writtenHash`, `forgetWrite`'s hash argument, and a byte read and two hashes per own write leave. **Delta:** about −5 (inferred). **Depends:** LD-1, LD-2. (Scout 6)
- **LD-6 · The Thread-Pool Line (Gated):** `Desktop/main.ts:3,68-69`, its comment and import, the Write Path's Deviation D-4, and the open item on its placement leave if Task 1-8's procedure, run after LD-3, shows no gain; `CHUNK` stays 64 with its docstring rewritten (`atomicWrite.ts:50-51`). **Delta:** about −4. **Depends:** LD-3. (Scout 6)
- **LD-7 · `copyPageMetadata` by Shard:** it reads by shard and writes once per pair (`Core/Nexus/pageMetadata.ts:136-155`), where `dropPageMetadata` batches by shard (`:119-134`); one write per shard. **Delta:** about −2. **Depends:** none. (Scout 6)
- **LD-8 · Remint's Page Writes as One Held Rewrite:** a remint lands each target alone and in series (`Core/Nexus/remint.ts:45-56,78-84`); `rewriteHeld` serves them as one group where the targets are independent of one another, which the plan confirms before carrying it. **Delta:** about ±0. **Depends:** LD-3. (Scout 6)
- **LD-9 · The Configuration Pass on `rewriteHeld`:** conditional, *§Approaches Worth Weighing*, 2; `editJsonStrict` and `StrictEdit` (`atomicWrite.ts:335-350`) leave with their only caller. **Delta:** about −10. **Depends:** LD-3. (Scout 6)

A new Space's five landings (`Core/Contexts/contextWrite.ts:180-181`) stay as they are: about 20 ms per gesture, and grouping them needs a public grouped writer nothing else wants.

##### Relocations (Each Placement Goes to Nathan)

- **P-1 · `repairLanded` and `artifactFiles`** from `Core/Trash/restoreScrub.ts` beside `returningCascade`, ending `Core/Nexus`'s import from `Core/Trash` for a step both stores run (`settle.ts:46,343`); with the scrub gone, `restoreScrub.ts` leaves. (Scout 2)
- **P-2 · `trashedCopies.ts`'s Remainder:** after L-10 and M-5 it holds `parkLinks` alone, which joins the record helper pair beside `patchRecord` in `Core/Bundles/record.ts`, or stays under a name that says what it does. (Scouts 2, 5)
- **P-3 · `collectionArchive`:** with L-1 its only caller is the empty (`spend.ts:90`), so it moves into the empty's gone-for-good step (M-7) out of `Core/Archive/archive.ts`. (Scouts 1, 2, 3)
- **P-4 · The Store Notion in One Home:** `ArchiveStore`, `archiveStoreOf`, and `archiveDirRel` (`nexusPaths.ts:9-11`, `names.ts:20`) beside `BundleStore`, settled with P-10; `placement.ts:242` narrows to `ArchiveStore`. (Scout 3)
- **P-5 · The Journal's Strip Release:** `spendBundle`'s container-entry edit (`bundle.ts:382-392`) moves into `owed.ts` beside `restoreNote`. (Scout 5)
- **P-6 · The Trash Frame and Its Channel:** `TrashFrame.tsx` and `trash-frame.css` beside `ArchiveView`; `Trash/handlers.ts`, one channel answering one fact after L-1, folds into `Bundles/handlers.ts` under a name that says what it answers. The confirmations read `permanentDelete` live through it while `waived` reads `confirmDeletion` from the renderer's cache (`confirmations.ts:41-43`), two readings of one freshness concern the plan states as one rule. Touches I-040. (Scout 4)
- **P-7 · `heldPages.ts` Split:** reach-in grows the stored projection (one stored-pages read taking a store, the stored-Space source), so the live id service and the projection become two files. (Scouts 3, 5)
- **P-8 · `archivePlace.ts`'s Name:** it holds a title and an icon; the separate file is justified (`Nexus/treeIndex.ts` imports the icon without React), its name isn't. (Scouts 3, 4)
- **P-9 · Test Homes and One Bundle Fixture:** delete-record tests in the restore suite (`spend.test.ts:124-701`), a delete test in the archive suite (`archive.test.ts:227`), `trashFileFlat`'s tests in `Files/atomicWrite.test.ts`, the container arm's tests outside `finishOwed.test.ts`, and the browser's shared behavior pinned through the Trash skin (`TrashFrame.test.tsx:225-498`). A shared on-disk bundle fixture and browser harness in `Core/Testing/` would serve the three skin harnesses and the hand-rolled bundle finders (`spend.test.ts:57-79`, `trashRecovery.test.ts:39-70`, `restoreProperty.test.ts:80`, `archive.test.ts:71,799`). (Scouts 1, 2, 4, 5)
- **P-10 · `storedAt`'s Home:** `outsideContent` (`Core/Paths/exclusion.ts`) must call it, while `Bundles/layout.ts` imports `exclusion.ts` (`layout.ts:2`), so a home in `layout.ts` makes a cycle. Either the stamp parse, the suffixes, `stampedSegment`, and `originPathOf` move into `Core/Paths/` (beside `nexusPaths.ts` or in a new file), or `hiddenName` moves out of `exclusion.ts` so `layout.ts` can import it without the cycle. (Scout 3)
- **P-11 · The Shared Arrival Tail:** the spend, the share, the arrival, the refill, the carry, and the Space arm, run by M-3 and by recognition (*§The Trash's Model · §Recognition by ID*): every module that would host a restore imports `settle.ts`, so the tail lives where `settle.ts` imports it without a cycle; beside `returningCascade` in `settle.ts` is one candidate, `Core/Trash/` or `Core/Bundles/` others. (Scouts 2, 5)
- **P-12 · `Core/Trash/discard.ts` After L-1 and L-2:** it holds `trashFileFlat` and the flat `discardFile`, one calling the other (`discard.ts:10-20,36-47`); whether they fold into one function, and whether the file stays in `Core/Trash/`, since the flat discard isn't a bundle. (Scout 5)
- **P-13 · The Stored-Space Source:** beside `nexusPages` in the stored projection (P-7), or beside `spaceFiles` in `keyHolders.ts`. (Scout 3)
- **P-14 · The One Restore (M-3):** `Core/Bundles/` is the likely home; `Core/Trash/spend.ts` then holds `emptyBundle` alone, which ends the two meanings of "spend" one import apart (`spend.ts:22`, `spendBundle` at `bundle.ts:370`) if the file takes the empty's name. (Scout 2)
- **P-15 · M-14's Notice Builder:** `confirmations.ts`, `notifications.ts`, or `browser.ts`. (Scout 4)
- **P-16 · M-17's Gatherer:** `Core/Trash/gather.ts` or `Core/Nexus/cascade.ts`. (Scout 1)

##### What Stays

`liftSetAside` (excluded folders stay live under any model); `archiveStoreOf`'s name guard (sidecar ids are unvalidated, `refile.test.ts:132`); `chainDir`'s escape test; the orphan sweep; `archiveOwned`'s unreadable-sidecar arm; `refile`'s `if (!into) return`; the Archive's layout (Decision C-1); the stamped wrapper (*§The Store Shape*); the flat discard (Decision C-2); the Link record and Restore Links On Deletion (Decisions B-2 and B-3); `parkLinks`' purpose, a value naming a page still in the Trash; the empty-versus-move asymmetry in the browser; `unrestored` and `landedAs`; a Trash restore offering no Undo, which is user-facing; both `storesChanged` emitters, so a batch emits once; `assetMigrate.ts`, which runs when the user changes the image folder; `CHUNK` at 64; the SQLite stores at their default durability, since `sync_base` shares the index's file (Decision B-1); Sync's sweep identity (`Core/Sync/Client/push.ts:202`), named so it isn't read as an oversight; `RACY_WINDOW` (`walkCache.ts:3-4`); the commit sequence `unmoved` (`indexSeed.ts:130-133`); the first adoption's folder stamps and Agenda stamps as single landings; a new Space's five landings.

##### The Net

| Phase (*§The Plan's Shape*) | Items | Production Delta |
|---|---|---|
| 1 · The Landing | LD-1 – LD-9 | about +35 (+30 to +50) |
| 2 · Residue | L-1 – L-8, M-4 | about −155 |
| 3 · Delete, Journal, and Carry | M-1, M-2, M-5 – M-8, M-10, M-11, M-17, M-18, B-1, B-5, B-6, B-10 | about −115 |
| 4 · Reach-In | M-16, L-10, M-9, M-12, *§The Trash's Model · §Added* but recognition | about −450 (−500 removed, about +55 added with M-9) |
| 5 · One Restore, Recognition, and the Interface | M-3, recognition (Decisions E-1, E-3, and E-4), M-13, L-9, M-14, M-15, P-6 | about −95 |
| 6 · Tests and Docs | P-9, *§What Becomes False* | ±0 |

The items sum to about −775; M-2 overlaps L-1, M-3 and M-12 overlap L-10 in `spend.ts` and `trashedCopies.ts`, and recognition shares M-3's tail, so the honest net for the whole restructure is **about −700 production lines (−600 to −800, inferred)**, the scrub's and the one restore's sizes being the largest uncertainty. Tests fall by roughly a thousand lines net (most of `restoreScrub.test.ts`'s 828, `spend.test.ts:1028-1410` and `:2571-2670`, `trashedCopies.test.ts`, the system-mode cases, the 35 `TrashDeps` literals and 32 stubs, and the residue pins, against new cases for each bug and each rule; inferred).

What leaves beyond lines (Decision A-7):
- **Mechanisms:** resolve-on-restore's scrub and `targets`' frozen identity; the trashed refill and its owed `Worked` work; System Trash Mode; the `TrashDeps` seam; a Context's registry index; the record's `archive` field and the renderer-chosen Undo destination; three trail formulas; the stash splice and three Trash value-holder listings; the content-hash echo; the flush per file; two stat identities; two watch policies; two restores; two notice owners; `park`; and, gated, the thread-pool line.
- **Files:** `trashMode.ts`, `restoreScrub.ts` (its remainder moving, P-1), `trashedCopies.test.ts`, most of `restoreScrub.test.ts`, and, by placement, `Trash/handlers.ts` (P-6) and `trashedCopies.ts` (P-2).
- **Types:** `TrashMode`, `TrashDeps`, `Worked`, `linkTargets`, `Frozen` as its own interface, `DateKey`, `Undone`, `Echo.hash`, `ContextEvidence`, and `StrictEdit` if LD-9 lands.
- **Branches:** the nine `bundle ?` conditionals, the system arms, `finishContainer`'s two `within` tests, the restore's `into` world switch, the store-chosen lock, and two missing-artifact refusals.
- **Docs:** the system-trash passages, the reconcile passage, and the link strip stated seven times, worded two ways.

---

#### The Landing

The first phase lands Decisions G-1, G-3, and G-4 together, since each needs another: the change time is told apart only by a stat taken after the rename, and one flush per group with write-through is what makes that one landing durable. (Scouts 3, 6)

##### The Group Flush

**Today:** `stage` (`nodeMachine.ts:50-89`) opens each temp `'wx'` (`:60`), writes, dates (`:69`), and flushes it with its own `handle.sync()` (`:70`); the commit checks `expect` against a fresh stat (`:76-78`), takes the temp's `handle.stat()` (`:79`), chmods (`:81`), closes (`:82`), renames (`:83`), and answers that pre-rename stat (`:84`). `land` (`:95-103`) stages the whole group, then commits: one concurrent full flush per file. The only production `sync()` is `nodeMachine.ts:70`.

**The Design:** temps open `O_WRONLY | O_CREAT | O_EXCL | THROUGH`, where `THROUGH` is `constants.O_DSYNC`, or libuv's `0x04000000` on Windows, where Node names no write-through flag and libuv maps that value to `FILE_FLAG_WRITE_THROUGH` (`include/uv/win.h:691`, `src/win/fs.c`); the reason sits beside the constant (Decision G-4). `stage` takes the temp's stat (its mode and its device) and hands back a flush and a commit. `land` runs one flush per distinct device the group's temps sit on, after every temp is written and dated and before any commit; each commit awaits its device's flush, checks `expect`, chmods, renames, and answers a post-rename stat. A group with no cross-volume links takes exactly one flush. About +6 lines, with per-file syscalls level.

**Why It Holds Decision F-3:** F_FULLFSYNC flushes all buffered data on the device, and data written through before it is persisted (`fcntl(2)`); `O_DSYNC` is the only way from Node to push data to the drive without a full drain, since libuv's `fdatasync` runs the same full flush on Apple (documented). An `O_DSYNC` write counting as flushed in F_FULLFSYNC's sense, data and length included, is inferred; power loss can't be tested.

**Edges:** a failed flush discards and rejects every temp on that device, which `landOwn` forgets (`atomicWrite.ts:23-25`), `rewriteHeld` answers `failed`, and a sweep counts skipped with its note owed, as a per-file failure does today. `futimes` isn't covered by `O_DSYNC`, so after a power loss a temp could land with the right bytes and an unkept modification time, which is cosmetic and outside Decision F-3. A group of one costs today's one flush plus about 9 µs. Linux isn't a build target; there `O_DSYNC` makes each write durable itself.

**Measured (Standalone, 2,000 Files in Groups of 64):**

| Shape | Pool | Per File | Longest Other Read |
|---|---|---|---|
| Flush per file | 4 | 2,184-2,215 µs | 137-143 ms |
| Flush per file | 16 | 1,351-1,354 µs | 62-64 ms |
| One flush per group | 4 | 173-178 µs | 3.8-4.4 ms |
| One flush per group | 16 | 236-237 µs | 5.5-6.0 ms |

With one flush per group, sixteen pool threads are slower than four, so the thread-pool line's reason ("each flush holds a pool thread") stops holding, and LD-6 removes it once Task 1-8's procedure (Medium-0 property rename, `settleMs / calls.land`, three runs with the line and three without) confirms no gain. Files per flush against lock hold: 16 → about 415 µs a file, 64 → about 170, 256 → about 103, no flush → 75; 256 would save about 0.4 s per 7,027 files for four times the lock hold, so `CHUNK` stays 64.

##### Every Write

| Writer | Files per Call | Shape After |
|---|---|---|
| `rewriteHeld` (`atomicWrite.ts:47-125`): sweeps (`governedSweep.ts:70`), `stampMissing` pages (`adopt.ts:158`), tile relink (`tilesFile.ts:312`) | up to 64 | The group flush's target |
| `rewritePageSerialized` (`atomicWrite.ts:402-406`): `stampPage`, remint, asset migration | 1 | A group of one; remint's loop is LD-8 |
| Single `atomicWriteFile` and `writeJson`: page save and create, tiles, identity, registry seed, sidecar create, bundle record, assets, thumbnails, `governedRoot.ts:202` | 1 | One file per gesture |
| `rmwLocked`, `updateNexusFile`, `updateNexusConfig` (`atomicWrite.ts:229-333`): owed notes, `state.json`, settings, metadata shards, `appConfig.ts:53`, `secrets.ts:33` | 1 | Write-ahead notes keep their own flush |
| `copyPageMetadata` (`pageMetadata.ts:136-155`) | 1 per pair | LD-7 |
| `reachConfig` through `editJsonStrict` (`configReach.ts:319-359`) | 1 per file, serial | LD-9, conditional |
| `stampMissing`'s folder stamps (`adopt.ts:109-123,143-151`) | 1 per folder | Stays: `rmwJsonStrict` seeds an absent sidecar, which `rewriteHeld` can't |
| A new Space's tiles (`contextWrite.ts:180-181`) | 5 serial | Stays |
| Sync's `landWrite` → `landBytes` (`Core/Sync/Arrival/land.ts:84-103`) | 1 | Inherits the change with no Sync edit (Decision B-1) |
| `relocate`, `removeOwn`, `setAside`, Trash moves | — | Metadata operations; no flush |

##### The Change-Time Identity

**Why:** the index tells whether a row is still its file by modification time and size, and the app's held rewrites keep a page's modification time by design, so a same-length rewrite leaves a different file under the same pair (*Write Path — Implementation Plan · §Deviations*, Deviation D-2). Reach-in widens what the index's membership decides, and with the change time, which no program can set, LD-4's savings return.

**Probed (APFS, Node):** a file rename moves its change time and keeps its modification time; a parent folder's rename leaves its children's change times alone; `futimes`, `fchmod`, and the rename each move it; the landing's pre-rename handle stat differs from the stat after; an `fstat` of a handle still open after the rename equals the path stat after it. Windows (`st_ctim` filled from NTFS `ChangeTime`, documented in libuv) and exFAT are unverified.

**Why the Post-Rename Stat Comes First:** the stat `land` answers feeds the index row (`landOwn` → the own event's `stat` → `indexWrittenPages`, `indexSeed.ts:171,182`) and the walk cache (`rememberParse`, `fileEvents.ts:409` → `sameFile`, `walkCache.ts:43`). With the change time in the identity and today's pre-rename answer, every own write would miss both at its next check in production while the suite stays green, since `diskMachine` answers post-rename (`machines.ts:170`). No caller chains one landing's answer into the next `expect`: every `expect` is a fresh stat under the file's lock (`Core/Nexus/page.ts:58,63`; `tilesFile.ts:249,252`; `atomicWrite.ts:84,109`). A file removed between the rename and the stat is a race only: the landing rejects and the unlink reconciles. `machineContract.ts` pins "the stat `land` answers equals a stat of the file after it lands" and "a rename moves ctime".

**Moves:** a Set or Collection delete is one folder `relocate`; `moveIndexPaths` renames rows by prefix (`indexSeed.ts:243-247`) and children's change times stay, so nothing goes stale. A page move or rename moves the page's change time, and `moveIndexPaths:248`'s re-read refreshes the row, which becomes load-bearing.

**The Reseed:** `INDEX_GENERATION` 19 → 20 drops only `INDEX_TABLES` (`ddl.ts:68,82-88`), never `sync_base`, so every Nexus reseeds cold once and Sync's base is untouched. Extended-attribute changes (Finder tags, quarantine) move the change time too, which costs a re-read, not correctness.

**The Kept-Time Guards:** `fileEvents.ts:395-396`, `atomicWrite.ts:27`, and `atomicWrite.ts:134` forget a parse because a write "can keep the time, size, and birth"; the change time removes their cause only on volumes where it's real (*§Approaches Worth Weighing*, 5).

##### The Echo by Stat

**Today:** `recordWrite(path, data)` runs before the landing (`atomicWrite.ts:18`), hashing the bytes (`writeEcho.ts:23-33`) and firing Sync's write tap; `isRecentWrite` answers false for a hashed record (`writeEcho.ts:84-86`), so every own write enters the watcher's batch, and `dropOwnEchoes` reads it back and hashes it (`writeEcho.ts:103-114`). A Medium property rename makes 6,959 such reads and hashes.

**The Design:** the record is still made before the landing, so Sync's tap timing is unchanged; `landOwn` attaches the answered stat after `land` returns, and the drain compares it against a fresh stat. Only a stat after the rename tells a kept-time, same-length landing apart, which the probe measured. The index and the watcher then share one own-write identity. An outside write restoring the app's exact bytes reaches the watcher at once. On FAT and exFAT, with no real change time, an outside write keeping time and size would read as an echo (inferred). The gain is modest in wall time (about 50 µs of overlapped I/O a file) and mostly One Way.

##### The Index's Durability

Only `journal_mode = WAL` is set (`Desktop/Store/driver.ts:36`); under Electron 42.4 the defaults are `synchronous=2` (FULL) and no full flush (measured). Each commit runs a plain WAL `fsync()`, about 0.18-0.20 ms for 64 rows (measured), about 7 ms across a 7,027-page rename. The index tables are regenerative, but `local_state` and `sync_base` share the file (`ddl.ts:12-17,46-55`), so NORMAL would touch Sync's base. It stays as it is.

##### The Watcher

Once flushes stop dominating, the watcher is about 2.0 s of a 6.0 s Medium rename (6.0 → 4.0 s with it off): relisting is 968 ms of main-thread time, the rest `awaitWriteFinish` polling, the echo read-back, and batch handling. Its swap (I-081, `IssuesPM.md:843-869`) is its own plan: its risks are bundle-free (dropped or coalesced native events, the folder add and unlink expansion `fileEvents.ts` relies on, a known-paths set, an `awaitWriteFinish` stand-in, `PREFIX_WINDOW_MS`, I-038), and the stat echo fits either watcher. chokidar already passes a fresh `fs.Stats` as its second argument, which `watcher.ts:110` ignores.

---

#### The Trash's Model

The Archive is reach-in: its pages are indexed, every cascade rewrites them, and a restore is a move. Decision D-1 moves the Trash onto the same model, on the measurement's result (Decision A-1); this section is the design that move carries.

##### What Reach-In Means Here

A reach-in Trash isn't a copy of the Archive's. Archived pages are both addressable and resolvable; trashed pages are addressable and not resolvable. They join `byId`, so strips, refills, and re-tags write them and `findHolders` captures them by id; they stay out of `archived`, `linkWorld`, and `deleteCascade`'s `after`, so a Link naming a trashed page reads gone, the delete still strips it (Decision B-2), and parking keeps its purpose. Trashed pages sit in the index; trashed Spaces, which the index doesn't hold, come from a stored-Space source. Under Decision C-2 only bundle contents are read: the walk, the index, and every reach admit a path only inside a stamped bundle. Without trashed pages in `byId`, the strip would count every trashed linker held out (`cascade.ts:133-136`) and its entry would stay owed for good; with them in `archived`, a delete's strip would find the deleted page still answering its key and strip nothing. (Scouts 1, 3)

##### The Rules

1. **The Claim Rule:** a trashed row sets an id only where `byId` holds none, and never nulls one; trashed pages stay out of `archived`. `heldElsewhere` (`placement.ts:38-40`) then answers every case with no Trash-specific reading: a trashed page's own row sits inside its bundle, so its restore isn't refused; a live page sharing its id holds `byId` (its entry pinned at `spend.test.ts:1974`), so the restore is refused id-live; an archived page sharing it was claimed first (`heldPages.ts:77-83`), so the trashed claim fills nothing; of two trashed copies of one id (Decision D-2), the first claimed restores and the second is refused id-live. About +3. (Scouts 3, 4)
2. **The Pass-Over:** `addressable` asks only that an id is unique (`heldPages.ts:61-64`), so a trashed copy sharing a live page's id would pass it, be stripped, and have its value recorded under the live page's id, and the restore's refill would land it on the live page (`governedSweep.ts:104-107`). The strip (`cascade.ts:133`) and the holder capture (`keyHolders.ts:124-126`) therefore address a file only when `byId.get(id)?.path` is that file, and pass over one `byId` addresses elsewhere, counted held out as a twin is today (`deleteReach.test.ts:133`). About +3. (Scouts 1, 3)
3. **The Governed Rule (Decision D-4):** a cascade reaches a trashed page only when its record names a Collection it left, `collectionOf(originOf(record))`, a record whose parent is a container (`record.ts:17-22,160-165`). The record decides, not the path, so a Collection renamed after the delete keeps its trashed pages in reach, and a page that left a plain folder keeps its bare keys, as a live one does. M-9's reader answers it for the governed reach and the `{ collection }` reach alike, one rule where `finishProperty` and `trashedHolders` read two today. (Scouts 3, 5)
4. **Admission:** `contentRoots` gains `.trash` (`walk.ts:43`); `outsideContent` keeps each store root `'hidden'`, which the tree's root walk relies on (`readNexus.ts:327`), and below it judges chain folders by `hiddenFolder`, admits a page only inside a stamped bundle with its inner segments visible, and judges exclusion and the asset root against the origin, so `listInner` and the index read one rule. The bundle folder itself stays admitted, or the empty's de-index would leave stale rows (`deindexPath` → `relCorpusPath`, `indexSeed.ts:78-82,215-217`). Admission is path-only: the Archive is admitted by path today, the per-event path has no budget for a record read, and a record check in the walk alone would recreate B-8's two readings; a stamped bundle whose record won't decode has its pages reached while the Trash lists nothing for it, which Decisions C-3 and C-8 accept. No generation bump is needed for admission, since the seed's prune and adds absorb it (`indexSeed.ts:301-303`). Flat leaves, record-less folders, and retired provenance entries never enter the walk, the index, or a reach (Decision C-2). (Scout 3)
5. **The Watched Trash:** the Trash is watched, as the Archive is, so both indexed stores follow one policy. An unwatched Trash would leave a row indexed after a hand removal until the next open, and every sweep listing holders from the index would read the missing file `unread` (`atomicWrite.ts:89-91`), count it skipped, and owe it, with Decision E-1 needing a stat per arrival to tell a move from a copy; watching removes both compensators. The exemption goes in the watcher's ignore rule rather than `neverWatched`, which also feeds `manifestAdmits`, `adoptFile`, and `assetMap`: `syncIgnoredUnder` (`watcher.ts:55-64`) judges a `.trash` path by what's below it, exactly as `manifestAdmits` already does (`exclusion.ts:42`), so the watcher and Sync's manifest read the Trash one way (about +2). `tap.ts:50` then becomes load-bearing: it drops watched `.trash` events, so Sync keeps learning the Trash through the write tap alone and its behavior is unchanged, and its reason is stated where a reader meets it. The tree patch needs nothing: `classifyEvent` already ignores every path below a hidden folder (`fileEvents.ts:256`) and the `.trash` folder itself (`:268`), as it ignores the Archive under `.nexus` (`:231-254`), so the tree stays store-blind by construction while the index half admits through `outsideContent`'s store reading. The cost is a trashed holder paying the watcher's per-file share, as a live holder does, which is reach-in's accepted premise. (Scouts 2, 3, 5)
6. **The Own-Bundle Exclusion:** `finishContainer` calls `deleteCascade(root, join(root, e.at), e.strip)` with the live `e.at` (`finishOwed.ts:402`), and `deleteCascade` excludes by that path (`cascade.ts:99-100,129`), but by then the artifact has moved and its rows have been renamed under `.trash` (`moveIndexPaths`, `indexSeed.ts:240-247`). `deleteCascade` takes the entry's bundle and also drops every path whose `storedAt(rel).bundle` is it, or a Set's internal links would be stripped and recorded as its own `links`; the live path still covers the held tree's stale listing (`cascade.ts:106`). An empty's entry already sets `at` inside the bundle (`spend.ts:97`). The same gap opens in `unlinkMembers`' `skipUnder` (`Core/Contexts/contextCascade.ts:106-107`) once the stored-Space source feeds `findHolders`, since a deleted Context's own Spaces would be found under `.trash` (reachable where a Space holds its own Context's key; inferred). The configuration pass already skips a Set the edit names gone (`configReach.ts:342-343`). About +5. (Scouts 1, 3, 5)
7. **Display Stays Blind:** `CascadeReport.pages`, `sweepCount`, the matrix, headings, link suggestions, and the clash refusal show nothing from either store, each of the six hides reading `storedAt(rel) === null`; `refusedLine` already names stored titles for the Archive (`Core/Nexus/entities.ts:78-79`), and does for the Trash alike. The matrix's and the open's headings' unbounded reads (`Core/Session/matrixSlice.ts:147,182`, `nexusSlice.ts:207`) read stored rows only to discard them, once per load; pushes are path-narrowed (`matrixSlice.ts:106-125`). (Scout 3)
8. **The Restore Lock by Origin:** with the scrub gone, nothing in a page's, Set's, or Collection's restore rewrites a `<Title>` key or Space word against `tree.contexts`, so those restores leave the Contexts lock; Context and Space restores keep it, chosen from the bundle's chain (M-3). A page restore's refill writes Space sidecars by id, as the page delete's strip already does without the lock (`mutate.ts:136-138`). (Scout 2)
9. **Bytes on Restore:** the scrub leaves whole: a restore moves the item's bytes as the Archive's restore and a live move do (`Core/Nexus/move.ts:27-41`), and a restore into a different destination no longer re-encodes values against that destination's schema. Bundles minted before this plan return as they were frozen (Decision C-8). (Scout 2)
10. **A Trashed Collection Keeps a Deleted Property's Assignment:** a property delete clears the property's values from trashed pages and records them (Decision D-4), but leaves a trashed Collection's assignment and stash until the property is gone for good, as today, so a property restore needs no Trash lookup and the trashed Collection still holds the configuration Decision C-6 keeps. The empty's property arm (`spend.ts:76-87`) stays as the gone-for-good trigger, and `finishProperty`'s Trash arm shrinks to that purge, its trashed-Collection listing coming from M-9's reader. The views follow Decision D-3. (Scout 5)
11. **A Failed Refill Is Named (Decision D-5):** a restore's refill that can't write a trashed holder names it in `unrestored` ("Beta didn't get its value back.", `notifications.ts:106-107`), as a live holder's miss is named, and `Worked` leaves with its last writers (L-10). (Scout 2)
12. **Other Walkers of the Content Roots:** the asset migration's `sidecarsUnder` and `corpusFiles` walk `contentRoots` (`assetMigrate.ts:117,135`), so adding the Trash extends it into trashed content; Clear Exclusion Cache walks each excluded folder instead (`Core/Settings/exclusionScan.ts:30-50`) and is unaffected. File-history retention stays the Archive's alone: `sweepFileHistory` passes the Archive's stored-pages read (`Core/Pages/fileHistory.ts:200`), and trashed pages keep following `historyDays`, a split whose change would be feature-level. (Scouts 3, 5)
13. **Leftover Bundles:** an empty bundle (B-1) or a record-only bundle (L-5, Decision E-2) holds no artifact, so it adds nothing to the index; neither needs a rule.

##### Leaves

L-10 in full (about −500), with M-16's path readers (−17). Beside them, under reach-in: the clash check's read of stored holders only to discard them (LD-4 moves the hide ahead of the read); one of the content delete's two `nexusPages` calls (`gather.ts:42`), and one of a Space or Context delete's two; the trashed refill's per-restore walk of every trashed container page; `parkLinks`' walk of every bundle, which becomes an index read; and I-033's cause. (Scouts 1, 2, 3, 4, 5)

##### Stays

`links`, `place`, `members`, `membership`, and `partial` on Space, Context, and property records; write-ahead (record, note, list, move, strip); `outside()` (`delete.ts:126-129`); `fromArchive` without `under`; placement and step-aside; the Context's registry entry with rollback; `owedName`; `restoreNote`; membership `reapply`, now through `byId`; the Link refill with `own`; `rekey`; `recordedPartly` for Space, Context, and property records; `refileLanded`; `returningCascade` with `repairLanded` and `artifactFiles`; `parkLinks`, over the indexed Trash; `emptyBundle`'s content arm, its `noteOwn` unlink de-indexing (`spend.ts:74`); `Desktop/Store` and `contentIndex.ts`, a live → Trash move becoming a row rename once both ends are admitted (`indexSeed.ts:240-248`); `linkWorld` as tree plus Archive; `findHolders`' reading and addressing; `archiveReach` for the Archive's half of a reach; Sync's code (Decision B-1). (Scouts 1, 2, 3, 5)

##### Added

- **Admission:** M-16's `storedAt`, `outsideContent`'s store reading, and `contentRoots` gaining `.trash` (about +20, counted under M-16).
- **The Claim Rule and the Pass-Over:** about +6 (*§The Rules*, 1-2).
- **One Stored-Pages Read:** `archivedPageIds` takes a store (`heldPages.ts:94-103`), and `nexusPages` reads the Trash's prefix into `byId` under the claim rule; the prototype's separate `trashedPageIds` is never written. About ±0. (Scout 3)
- **The Stored-Space Source:** the index holds pages only, and the tree never enters `.trash`, so trashed Spaces and a trashed Context's Spaces come from a bounded walk of `.trash/.nexus/contexts` reading each sidecar, re-homed from `trashedHolders`' Space and Context arms (`trashedCopies.ts:70-76`). It feeds `byId` as `{ kind: 'space', path }` roots, which `sweepRootsById` already reaches (`governedSweep.ts:104-106`), and `spaceFiles` (`keyHolders.ts:69-75`), so one change serves all three holder sites (`keyHolders.ts:97`, `cascade.ts:128,263`). About +12. (Scouts 3, 5)
- **The Governed and Scoped Reach:** M-9 (about +15).
- **The Own-Bundle Exclusions:** about +5 (*§The Rules*, 6).
- **The Watched Trash:** about +2 (*§The Rules*, 5).
- **Decision D-3's Views:** the configuration pass reaches trashed Collection and Set sidecars as it reaches archived Sets': `archivedSets` (`configReach.ts:297-304`) becomes one walk of stored container sidecars over both stores, `setSidecarsUnder` (`:284-285`) admitting the Collection sidecar as well as the Set's by filename (`SIDECAR_FILENAME`, `nexusPaths.ts:59`); the loop at `:339-347` is unchanged, own-gone skip included, so a just-trashed Collection's own views keep its Set ids exactly as an archived Set's do. It needs M-16's admission, since `sidecarsUnder`'s directory filter is `outsideContent` (`walk.ts:97-100`). Scoped edits (an unassign, a Set move) reach the trashed containers that left within the scope, through M-9's reader, as the Archive's scoped reach takes the owning Collection's ID folder, so a trashed Set doesn't return carrying a column its Collection dropped. A trashed Space's tile docs stay current the same way, the pass taking their hosts from the stored-Space source beside `tileHostsOf`'s live boards (`tileHosts.ts:44-56`). This ends one Collection running two models, shares its walk with the trashed-Collection purge, and reuses the edit tables rather than adding a reader beside `CLEAR` and `GONE`. About +8 unscoped, +3 scoped, +3 for tile docs. (Scout 5)
- **`keptLinksUnder` Over the Bundle's Pages:** it takes the bundle's pages instead of listing the artifact (`bundle.ts:276-290`), one way to find an item's share, including for an item whose file left by hand. About +2. (Scout 2)
- **Recognition (Decisions E-1, E-3, and E-4):** about +45, landing with M-3's tail (*§Recognition by ID*).
- **Subtotal:** about +100 beyond M-16, M-9 included; *§The Net*.

##### Recognition by ID

**Pages and Sets (Decision E-1):** a pass in `payOutsideMoves` (`settle.ts:390-424`), ahead of `relink`, reads the pending ids (`owed.vanished` with prior paths, `owed.landed`) and, for each id the tree now holds (`livePathOf`), the stored path it left: the vanished entry's `from.path` when it lies inside a bundle. With the Trash watched, the unlink proves the move: a copy leaves the bundle's page in place and raises no unlink, so it's a live page sharing a trashed copy's id, a plain arrival. For each recognized id the pass takes it out of `left` and `arriving`, so `relink` never builds a world holding a trashed page at its store path, and hands the bundle's departed pages to the shared arrival tail (P-11): the spend (the whole bundle when its artifact is gone, `bundleArtifact`, `bundle.ts:81-84`; otherwise the inner share through `spendBundle`'s inner arm, which releases the departed pages from an owed container strip, a Set's bundle keeping its row under Decision C-6), the share (`keptLinksUnder`), the arrival (`returningCascade` with the lane's `before`, `settle.ts:414-417`), the Link refill under Restore Links On Deletion, and the carry (`refileLanded` when a whole Set's bundle left). Misses log through `paid` (`settle.ts:383-387`). With the app closed, the open's seed prunes the missing trashed row into `vanished` (`indexSeed.ts:302-303`) and lands the id at its new path, and the lane pairs them the same way. About +20. (Scout 2)

**The Archive (Decision E-3):** recognition reads bundle paths in either store, so a page or Set dragged out of an Archive finishes as the Archive's restore: the spend and the arrival, with nothing to refill. It closes B-11. About +3. (Scout 2)

**Spaces (Decision E-4):** a Space sidecar arriving under a registered Context folder already walks: `classifyEvent` returns `space` for it (`fileEvents.ts:254`), and `applySpace` returns null for an outside arrival the tree doesn't hold (`fileEvents.ts:462-485`), so the walk adopts it. The page lane never sees it, though: `owed.vanished` and `owed.landed` are page-index pairs (`fileEvents.ts:318-322`), the index holds no Spaces, and the Space's unlink under `.trash` classifies as ignored. Recognition therefore reads the settle's tree delta for a Space node whose id the previous tree lacked, beside `refileMoved`'s walk of the same delta (`settle.ts:192`), and matches it to a Space record in the Trash whose artifact is gone and whose parent Context is the one it landed under (one `listBundles` read of the Trash per Space arrival). The finish is the Space restore's own steps: re-apply `members` (`spend.ts:248-258`, through `reapply`), `restoreNote`, then the spend. Re-applying members writes Context tags, which needs the Contexts lock (`settle.ts:250`), and the lock is taken outside the settle's turn (`inContextsTurn`, `settle.ts:268-269`), so the finish runs as its own turn after the settle rather than inside `payOutsideMoves`. About +20 to +30. A Context moved back by hand stays out: a Context exists only through its registry entry (`readContextGroups` maps `registry.contexts`, `readNexus.ts:246-262`), and `applySpace` returns `'ok'` for a Space under a folder no entry names (`fileEvents.ts:467`), so the folder stays invisible and Restore stays its way back. (Scouts 2, 5)

**The Rebuild Gap (Decision E-2):** a cold seed answers `NO_REREAD` (`indexSeed.ts:305`), so after an index rebuild, including LD-2's one-time reseed, a page moved out while the app was closed pairs with nothing: it returns live and current, since reach-in kept it current, without the Link values its delete stripped, and its emptied bundle stays as record-only litter `listBundles` skips. No pass at each open covers it.

**No Renderer Signal:** a recognized restore clears its bundle while an open Trash frame keeps the row until its next listing, and a delete's Undo armed against it is refused by the host (`bundle.ts:233`), as a Finder drag-out's record-only bundle behaves today; nothing pushes store contents (`bridge.ts:197`), and none is added. (Scout 4)

##### Costs Per Operation and Per Open

| Operation | Today | Under Reach-In |
|---|---|---|
| Content delete | `nexusPages` twice (`gather.ts:42`, `cascade.ts:107`), each an index range scan, or a walk and read of every archived file before the index is ready (`heldPages.ts:94-103`) | Once, plus O(trashed pages) rows; the strip also writes trashed linkers |
| Space or Context delete | `nexusPages` twice (`gather.ts:42`, `keyHolders.ts:106`) and a strict registry read | Once; the registry read leaves with M-4 regardless |
| Trash restore | `parkLinks`' walk of every bundle and every container's pages; `trashedHolders`' read and parse of every trashed container page when a stripped holder is trashed; `currentKeys`' maps over the registry, every option, and every Space; the Contexts lock for every entity | An index read inside the one `nexusPages` call; no scrub; no Contexts lock for pages, Sets, or Collections |
| Property restore | `parkLinks`' walk | An index read |
| Empty one bundle holding links | `parkLinks` twice (`spend.ts:112`, then `finishOwed.ts:408`) | Index reads |
| Empty N bundles | One request per row (`browser.ts:428-438`), each walking the Trash (I-033) | One request per row, each an index read |
| Re-assign with unplaced stash ids | `trashedHolders`' walk (`assignment.ts:51`) | `byId` |
| A property gone for good | `listBundles` and `contentPages` of every bundle (`finishOwed.ts:167-183`) | M-9's listing for trashed Collections' assignments; trashed pages were stripped at the delete |
| Every rename, strip, option, or property cascade | No Trash writes | Writes to trashed holders, proportional to holders rather than Trash size, each paying the watcher's share; a governed or scoped cascade also lists the Trash's records through M-9 (unmeasured: the prototype reached all of `.trash`) |
| A holder query reaching Spaces | The tree's Spaces | Plus the stored-Space source: a bounded walk of `.trash/.nexus/contexts` and a sidecar read per trashed Space |
| Matrix load and the open's headings load | Every archived row read and discarded | Every archived and trashed row read and discarded, once per load |
| Configuration pass | The Archive's Set sidecars walked (`configReach.ts:339`) | Plus one directory read per Trash folder on each unscoped pass |
| Each open | The seed stats every archived page (`indexSeed.ts:259-310`); `settleArchives` reads every live Archive's records (`refile.ts:127-143`) | Plus a stat per trashed page, a directory read per Trash folder, and the watcher's listing of the Trash |
| Trash browser | `listBundles` | Unchanged |

The heading cascade is keyed by the index (`cascade.ts:242`) and doesn't grow with stored size.

##### The Measurement

*Trash & Archive Restructure — Reach-In Measurement* holds the first run, made on the write path as it stood at `15fe7422a`; its harness sits in `.claude/Benchmarks/Reach-In/`.

- **Cost:** with an empty Trash the two models are within noise. At a Trash of 10% of the live pages the reach-in prototype ran the whole operation sequence about 10% slower, and at 50% about 41-60% slower, because every cascade rewrites trashed holders at the same per-file cost as live ones. Today's only Trash-scaling cost is a page restore's walk of every trashed page, about 0.38 ms per trashed page.
- **Correctness:** today's restore doesn't return a current page. A page that sat in the Trash through a property rename, an option rename, a Space rename, and a Context rename came back holding all four old names in every cell (B-9). The prototype's restored page read current in every cell, its deletes still stripped the Link values naming what they trashed, and trashed pages never entered `linkWorld`.
- **The Re-Run (10-29-2026, at `9b9c0d630`, After the Write Path Plan):** Medium-10 and Medium-50 at three runs per build and Large-50 at two (`results/<cell>.jsonl`). Every run passed; the whole operation sequence's median, opens aside:

  | Cell | Baseline | Reach-In | Change |
  |---|---|---|---|
  | Medium-10 | 50.9 s | 55.8 s | +10% |
  | Medium-50 | 51.4 s | 73.6 s | +43% |
  | Large-50 | 137.6 s | 195.9 s | +42% |

  The cost tracks the trashed holders a cascade reaches, linearly: at Medium-10 a property rename is 14.7 s against 16.3 s (+11%), at Medium-50 14.8 s against 22.3 s (+51%), and at Large-50 42.1 s against 62.3 s (+48%). A cold open indexes the trashed pages too (+8% at Medium-10, +51% at Medium-50, +47% at Large-50); a warm open costs +1-10%. A page restore is 10-38% faster and a Set's 14-23% faster, the scrub gone; emptying one bundle stays under a seventh of a second. Reach-in rewrites trashed pages exactly as live ones and returns a current page; live links to the restored page agree between builds.
- **Where a Property Rename's Time Goes (10-29-2026, at `31702baa5`, Medium-0, Three Runs per Pass):** the baseline's rename of a property 7,027 pages hold settled in 18.7 s, every file flushed once. The flushes were in flight for 12.5 s of it (67%), about 60 ms each with some 34 at once. With each flush answering at once the rename took 6.0 s (−68%); with the watcher also off, 4.0 s (−79%), the main thread's parse, compose, and index work. Per file the rename made two text reads (the clash check's and the rewrite's), a stat, a landing, and the watcher's byte read. In a standalone test of 2,000 files landed in groups of 64, a flush per file took 2.3 s, write-through temps with one flush per group 0.46 s, and no flush 0.28 s.
- **Decision G-2's Bar:** the plan measures a property rename at its start and end, live and trashed holders alike. Once one flush per group lands, a holder costs about 0.85 ms with the watcher (6.0 s over 7,027 files) and about 0.57 ms without it (inferred), and a trashed holder, watched, costs what a live one does; LD-5 removes the echo read-back from both.
- **Tests the Prototype Broke:** `archive.test.ts:1135` ("a trashed page's link to an archived page follows it to where it lands on restore") flips to `[[Alpha]]`, the new live namesake, as a live linker in the same sequence ends, or goes as covered by `:1149`; the old expectation came from `targets`' frozen identity. `spend.test.ts:2660` ("a live property holding the key keeps it") inverts under Decision D-4, and `finishProperty`'s `held(key)` filter (`finishOwed.ts:162-166`) it pinned stays for a delete's owed strip a later property's key would meet, re-expressed against that case. `restoreScrub.test.ts:194` ("a trashed copy the restore's refill couldn't write owes its value") expects `unrestored` under Decision D-5. (Scout 2)

---

#### The Store Shape

##### Two Stores, One Owner

Two stores stay, with `Core/Bundles` their one owner. Merging them would make a delete from the Archive an in-place suffix flip, removing `fromArchive`'s origin computation, the record's `archive` field, `placeRecord`'s archive arm, and the restore's `into` branches. It doesn't win: the Trash holds kinds no Collection partition can (Contexts, Spaces, Collections, and artifact-less property records, `record.ts:79-97`), so a merged store needs a second area and two layouts inside one store; deleting from the Archive is recoverable while deleting from the Trash is final; the Archive lists per Collection or top Set and the Trash in one frame; and `.trash` at the root is a legible convention Sync names explicitly (`exclusion.ts:42`). M-13 removes the `archive` field and the renderer-side destination without merging. (Scout 3)

##### The Collection-ID Folder and the Collection's Own Folder (Decision C-1)

The Archive keeps its layout. The ID folder buys the synchronous owner from a path, the one-folder listing and discard, and origin paths from paths alone (*§What's True · What the ID Folder Buys*); a flat Archive with owners in records would trade those for record reads on hot paths and a migration, removing the carry's moves and gaining nothing net. The Collection's own folder beneath the ID folder is what makes `originPathOf` pure and an archived page's origin the path links written before it left still name (`heldPages.ts:81`, `cascade.ts:108`). One stale sentence is true to fix: `bundle.ts:50` says a store "reads as a shadow of the nexus, so a stored item shows where it lived", which a carried bundle, filed under a Collection it never lived in, contradicts (`refile.test.ts:124`). (Scout 3)

##### The Stamped Bundle Folder

The wrapper stays, in both stores. It is the record's home beside the artifact (`record.ts:14-15`), the archived or deleted time (`layout.ts:25-30`), the uniqueness of two same-named items from one place (`bundle.ts:74-78`), the address detector (`layout.ts:36-56`), the write-ahead evidence (`bundle.ts:109-116`), and Undo's exact-name reuse (`bundle.ts:72-73`). The Trash can't drop it, since a property bundle is a record alone (`bundle.ts:165`), and dropping it in the Archive alone would fork `layout.ts` and `bundle.ts` by store. Under Decision C-2 it is also the boundary of what the Trash's reach reads. (Scout 3)

---

#### Approaches Worth Weighing

##### 1. The Stored-Origin Reader's Freshness

M-9 answers each stored bundle's Collection from its record. It can list the Trash's records once per governed or scoped cascade (one record read per bundle, unmeasured, since the prototype reached all of `.trash` without a listing), or keep a map from bundle to Collection refreshed on Trash events, which the app raises for every bundle it writes and the watched Trash raises for the rest. The listing adds nothing to keep right; the map adds a cache whose staleness is a correctness question. The listing lands first and Decision G-2's measurement decides whether the map earns itself.

##### 2. The Configuration Pass on `rewriteHeld`

`reachConfig`'s serial strict edits (LD-9) move onto `rewriteHeld` only if it can answer two differences without a branch for this one caller: `rewriteHeld` reads an absent file and an unreadable one both as `unread` (`atomicWrite.ts:61,90`), counted skipped, where the pass leaves an unparseable file alone and owes nothing for it (`configReach.ts:318-326`); and `editJsonStrict` refreshes `lastRead` (`atomicWrite.ts:347`), which `readAppFileKnown` relies on to rebuild a damaged `_tiles.json` (`Core/Tiles/tileDoc.ts:21`). Otherwise the strict edit stays, its reason stated where it's defined.

##### 3. Who Finds the Item to Undo

M-13 needs one owner for following an Undo's item by id. The host can resolve a bundle Undo's target by the id `back.record` carries, at send time; or the renderer re-targets through a sibling of `livePagePath` (`Core/Nexus/record.ts:63-66`) that covers Sets, the way `assignValue`'s `atPageNow` (`assignValue.ts:95-98`) and the reader already follow pages. The second keeps one follow-by-id helper where the first adds a host-side one beside it; its placement goes to Nathan. (Scout 4)

##### 4. A Trashed Context's Own Space Order

In `state.json`'s `order.spaces[<ID>]` while bundled, dropped at the empty, as today; or in the record, leaving `state.json` at the delete and written back at the restore, as a container's child order travels in its sidecar. The record keeps the bundle self-contained and retires `dropContextOrder` (`reorder.ts:53-60`) with its two callers; `state.json` keeps one less record field and one less restore write. (Scout 1)

##### 5. The Kept-Time Guards

`fileEvents.ts:395-396`, `atomicWrite.ts:27`, and `atomicWrite.ts:134` forget a parse because a write can keep a file's time, size, and birth; the change time removes that cause where it's real (APFS, probed; NTFS, documented). exFAT is unverified and may answer no real change time, where the guards are the only protection. Retire them, or keep them with that reason stated beside each. (Scout 3)

##### 6. The Archive's Open Pass

Keep `settleArchives`' every-record sweep, or drive it from the Baseline ledger's previous container paths so only Sets that moved while the app was closed are carried; the baseline isn't a `NexusTree`, so the diff needs a small parent comparison over its rows. Worth measuring with Decision G-2's instrumentation. (Scout 3)

##### 7. The Configuration Pass's Page-Bundle Prune

Decision D-3's walk reads one directory per Trash folder on each unscoped pass, most of them page bundles, which can't hold a sidecar. A directory filter refusing a `.md.<suffix>` stamped segment (about +2) cuts the walk to container bundles and chains in both stores; it's adopted if Decision G-2's measurement shows the walk's cost. (Scout 5)

##### 8. Stored Rows in the Index's Unbounded Reads

The matrix load and the open's headings load filter stored rows in Core after reading them. If the open's cost shows, the store prefixes become excluded ranges in SQL through `UNDER` (`Desktop/Store/stores.ts:17`), which pushes a store concept into the `ContentIndexStore` contract; otherwise the Core filter stays. (Scout 3)

---

#### What Becomes False

##### Code Comments

- **Already False:** `bundle.ts:50` (stores as a shadow, *§The Store Shape*); `bundle.ts:221`'s refusal "Only a trash or archive record can be spent.", which `listInner` also returns where nothing is spent; `configReach.ts:247` (`goneContainers` "read from the tree, or from an archived Set's sidecars", while it only wraps ids); `governedRoot.ts:59` (`Frozen` "a frozen copy", used live at `cascade.ts:113-114`); `heldPages.ts:1` ("for every refill", which the Trash's bypass); `restoreScrub.ts:1`; `spend.ts:294`; `finishOwed.ts:1` (omits that the settle's turn also runs relink entries, `finishOwed.ts:93`); `UIX/Table/table.css:11` (names Core surfaces).
- **By L-1:** `discard.ts:35`, `trashMode.ts:1`, `finishOwed.ts:258` ("or where Trash Mode sends it"), `finishOwed.ts:324` ("with no bundle to restore it from"), `delete.ts:105` ("With no bundle to keep them"), `confirmations.ts:88`, `bridge.ts:202`.
- **By L-3:** `reorder.ts:77` ("A Context keeps its panel id while bundled"); `reorder.ts:53`.
- **By L-4:** `bundle.ts:256` ("and its partial mark").
- **By M-3:** `mutate.ts:143` (the lock's reason moves to the origin); `archive.ts:88`.
- **By the Landing:** `nodeMachine.ts:49,94` (flushes overlapping); `atomicWrite.ts:50` (`CHUNK`'s "each flush holds one of the host's I/O threads"); `main.ts:68`; `machine.ts:22` (the APFS-birth caveat).
- **By Reach-In:** `exclusion.ts:62` and `walk.ts:42` ("the one hidden folder read as content"); `archive.ts:1`; `heldPages.ts:1-2`; `record.ts:39` (`linkTargets`); `trashedCopies.ts:1`; `governedSweep.ts:79` (`outsideArchive`'s "nothing displays an archived path") and `:92` ("so a trashed copy joins the live tree's records", which becomes the rule); `cascade.ts:93` (`deleteCascade`'s "archived ones among them" gains the Trash); `finishOwed.ts:166`; `assignment.ts:25,48,63` (the parking half stays true); `spend.ts:77` (the empty's property arm now purges trashed Collections' assignments alone); `placement.ts:38` ("only an archived page's own file sits inside its bundle"); `delete.ts:40` ("index rows sit at their Archive paths").
- **By Decision D-3:** `configReach.ts:287` (`archivedSetIds`' "archived folder") and `:342`, which names archived Sets only. (Scouts 1, 2, 3, 5, 6)

##### Tests

- **Residue Pins That Go:** `deleteOrder.test.ts:168,174,215` and `deleteReach.test.ts:800-806` (content `partial`); `spend.test.ts:314-322` (pre-`at` decode); `spend.test.ts:685-699` (provenance); `spend.test.ts:797-826`'s record assertions (L-5); `confirmations.test.ts:275-283` (`undoTo`); the system-mode cases (L-1); `spend.test.ts:299-350` and `finishOwed.test.ts:762` (L-3, L-1).
- **Implementation Pins That Break Without Behavior Changing:** `deleteOrder.test.ts:43-95` (four `vi.mock`s of named collaborators; write-ahead needs a seam at `relocate` alone); `bundle.test.ts:345-372` (record and note patches; `trashRecovery.test.ts:929-952` pins the behavior); `trashRecovery.test.ts:899-900,996,1003,1021-1025` and `spend.test.ts:1805` (journal shape); `browser.test.ts:58-79` (`widestDate`'s sample) and `:300-375` (`rearchive`, replaced under M-13); `TrashFrame.test.tsx:196-199,226` (M-15's class names); `layout.test.ts:10`; `nodeMachine.test.ts:74-78` (three `synced` become one per device) and T-N40.
- **Duplicated Cases:** `deleteOrder.test.ts:149` and `:159`; `trashRecovery.test.ts:399` with `spend.test.ts:1706,1724`; `trashRecovery.test.ts:242`, `spend.test.ts:703`, and `placement.test.ts:82`; `trashRecovery.test.ts:853` and `:874`; `refile.test.ts:132` and `:151`; `archive.test.ts:352,368,388,400`; and the three skin harnesses' shared cases (*Scouts/4-Interface.md · §Tests*).
- **Under Reach-In:** most of `restoreScrub.test.ts` (828 lines), `spend.test.ts:1029-1411` (link-follow through `targets`), `spend.test.ts:1005` (the trashed refill mirroring the live one), and `trashedCopies.test.ts` leave or become cascade-reaches-the-Trash cases beside `archive.test.ts:139-153`; `spend.test.ts:2571-2670` (the empty's property strip of trashed pages) narrows to the trashed Collection's purge; `trashRecovery.test.ts:1012-1060` gains a trashed-sidecar case; the parking cases (`trashRecovery.test.ts:462-678`) assert outcomes and survive; the three the prototype broke are routed in *§The Trash's Model · §The Measurement*.
- **Gaps to Fill:** B-1 through B-11 each want a case; the six display hides have none; the claim rule's four cases, the pass-over, the own-bundle exclusion beside `deleteReach.test.ts:315,346`, the configuration pass over a trashed Collection, the trashed Collection's assignment round trip, and each recognition case, Spaces included.

##### Feature Docs

- **Already False:** `NexusRecordPM.md:28` (the Known Issue: the folder now moves before any sweep, and a cut-short move finishes in `leave`); `NexusRecordPM.md:34` (Pending: moves and renames run under relink entries noted after the move, `cascade.ts:325`, and cascades land in groups rather than "today run per-file"), which wants rewriting; `NexusRecordPM.md:10` ("every record carries the page each outbound link … named", untrue of property and Archive records); `NexusRecordPM.md:16` (omits the panel id); `CorePM.md:14,36` (bundles named `<stamp>__<Page>.archived`/`.deleted`, where a page's is `<stamp>__<Page>.md.…`, with a `<stamp>__<n>__` collision form); `ConfigurationPM.md:115` and `frames.ts:643` (I-079).
- **By L-1:** the doc lines L-1 lists; `PommoraPRD.md:103`'s "recoverable in-Nexus trash" becomes the whole truth.
- **By L-3 and L-5:** `NexusRecordPM.md:10,14,16`'s Context position and Space order sentences, and `:14`'s "the record is removed once every page still present has its tag back".
- **By the Landing:** `CorePM.md:105` ("every temp is flushed before any is renamed"); `CorePM.md:100` becomes literally true.
- **By Reach-In:** `NexusRecordPM.md:10`'s `targets` sentence and `:14`'s reconcile passage ("An artifact returning from the Trash is reconciled …", the repair, and "into its copy in the Trash when it sits there"); `PommoraPRD.md:101` and `CorePM.md:98` ("a Trash restore alone rewrites a key a property's label spells"); `CorePM.md:74` ("`.nexus/archive` is a hidden folder the content index and every cascade reach into", "a property sweep reaches only Collections and the Archive"); `ConnectionsPM.md:30` ("every page the tree holds and every page the Archive holds", and the returning page's own-link repair); `ContextsPM.md:25` ("reconciled … on a Trash restore"); `CollectionsPM.md:49`, which states reach-in for the Archive alone.
- **One Owner for the Link Strip:** the strip on delete is stated seven times (`NexusRecordPM.md:12,14`, `CorePM.md:92`, `ConnectionsPM.md:30`, `CollectionsPM.md:49`, `InterfacePM.md:80`, `ConfigurationPM.md:118`), worded two ways ("unless a page outside it still holds that title" against "where its name resolves to nothing afterwards"); the code's rule is the second (`cascade.ts:108-111`), and `ConnectionsPM.md` is its natural single owner. (Scouts 5, 6)

##### Issues

- **I-033 (`IssuesPM.md:777`):** its cause, `parkLinks`' walk through `originPagesIn` once per empty, dissolves under reach-in; what remains per row is one request through `flushAllSaves` and the settle's turn, which I-033 never measured, so no batch channel is added and the issue closes with reach-in. Its footnote's `browser.ts:402-443` is `:410-451`. (Scouts 4, 5)
- **I-039 (`:703`):** its "`nexusPages` `byId` … answers null" gains the claim rule's third answer when it lands.
- **I-064 (`:927`):** its description ("repairs … against the targets the delete recorded") becomes false; it closes when recognition lands (Decision E-1).
- **I-065 (`:941`):** closes as intended (Decision B-4); parking over the indexed Trash applies the same resolver.
- **I-069 (`:955`):** dissolves when `targets` leaves.
- **I-076 (`:823`):** still true; a Context or Space restore from the Trash keeps refusing `OWED`.
- **I-077 (`:913`):** closes as intended (Decision C-6); its reason goes at `spendBundle`'s inner arm (`bundle.ts:369-393`).
- **I-079 and I-080:** true and independent.
- **I-081:** the watcher's swap stays its own plan; the watched Trash adds trashed holders' writes to what it costs.
- **I-040:** P-6 touches it.

---

#### Order Constraints

1. **The Landing First:** LD-1 lands before or with LD-2, since a pre-rename answer would make every own write miss the index and the walk cache under the change time; LD-2 precedes LD-4 and LD-5; LD-6's measurement runs after LD-3. The change-time identity precedes reach-in, which widens what the index's membership decides.
2. **Decision C-5 First Among the Folds:** L-1 lands before M-2, M-6, M-7, and M-8, so each is written once without system branches; L-2 follows L-1.
3. **Decisions C-3 and C-4 Together:** L-3 and L-4 touch the same Context field and record schema, and land with M-4, which rewrites the same gather function.
4. **The Mint Primitive Before the Arms:** M-1 before M-2, since the tail assumes gather-before-mint.
5. **Values Recorded Ahead Before the Reach:** M-17 before reach-in, so trashed linkers' values are recorded one way from the first commit that strips them.
6. **The Store-of-Path Rule Before Any Reach:** M-16 before reach-in, P-4, and P-10.
7. **Reach and Removal in One Phase:** the Trash's admission, `byId` claims, the claim rule, the pass-over, the watched Trash, and the own-bundle exclusion land in the same phase as L-10's removals, the reach first; removal-first would otherwise leave trashed copies neither reached nor repaired between commits. That's the one inversion, and it carries this reason.
8. **M-12 With the Model:** `Frozen`'s shape changes as `targets` leaves.
9. **M-3 After the Model, Recognition With M-3:** the one restore's size and arms depend on reach-in, and recognition runs its tail (P-11).
10. **Behavior Pins Before Refactors:** where a refactor breaks an implementation pin, the behavior assertion is in place first.
11. **Placements Before Moving Commits:** every P-item is approved by Nathan before the commit that writes it.
12. **Docs With Each:** each item's *§What Becomes False* lines change in the commit that makes them false.
13. **Decision G-2's Measurement at Both Ends:** a property rename, live and trashed holders alike, before Phase 1 and after Phase 5.

---

#### Corrections

Corrections to the scouts' reports, each verified against the code at `776f3ea94`.

- **Two Trashed Copies Sharing an ID (Scout 2):** "both refuse as id-live" holds under today's nulling `claim` (`heldPages.ts:18-20`). Under the claim rule a trashed row never nulls, so the first claimed copy addresses and restores, and the second is refused id-live (`placement.ts:38-40`) and passed over by the strip; Scout 3 holds.
- **The Empty's Property Arm (Scout 2):** it doesn't leave. A trashed Collection keeps a deleted property's assignment until the property is gone for good, so the arm stays as that purge's trigger; only its strip of trashed pages has nothing left to do. The `restoreProperty` Collection lookup (+3) doesn't arise.
- **The Unwatched Arrival Case (Scout 2):** the Trash is watched, so recognition proves a move by the unlink and the stat-per-arrival case doesn't arise.
- **A Trashed Holder's Cost (Scout 3):** "about 0.57 ms … since `.trash` pays no echo read or rescan" assumes an unwatched Trash; watched, a trashed holder pays a live one's share, about 0.85 ms before LD-5 removes the echo read-back.
- **Clear Exclusion Cache (Scout 5):** it walks each excluded folder (`exclusionScan.ts:30-50`), not `contentRoots`; only the asset migration follows the content roots into the Trash. Scout 3 holds.
- **I-081 (Scout 5):** "trashed holders' writes are unwatched, so they add no rescans" no longer holds; watched, they add the watcher's share.
- **The Asset Migration (Scout 6):** `assetMigrate.ts` runs when the user changes the image folder, so it's a feature, not one-time compatibility code; it stays.
- **Still Unverified:** whether an unusable Space sidecar reaches `tree.unreadable` (M-4); whether the delete-from-Archive Undo of a Set misses a carry `refileFiled` would have made; whether an `O_DSYNC` write counts as flushed for F_FULLFSYNC across a power loss; whether Node passes `0x04000000` through to libuv on Windows (Decision G-4 ships it unverified); the change time on NTFS rename-over and exFAT; whether a Space holds its own Context's key, which decides whether `unlinkMembers`' gap fires; whether a remint's targets are independent of one another (LD-8).

---

#### The Plan's Shape

Six phases hold the restructure, removal first after the landing Decision G-3 places first. Phase 4 is the heaviest, since reach and its removals land together under the one inversion.

##### Phase 1 · The Landing

- **Goal:** one durable landing per group, whose answered stat identifies the file it landed.
- **Carries:** Decision G-2's opening measurement; LD-1, LD-2, LD-3 with Decision G-4's flag, LD-5, LD-4, then LD-6's gated measurement and removal; LD-7, LD-8, and LD-9 where their conditions hold (*§Approaches Worth Weighing*, 2 and 5).
- **Delta:** about +35 (+30 to +50).
- **Depended On By:** Phase 4 (the change-time identity before reach-in).
- **Placements:** none; removing the thread-pool line also removes the Write Path plan's one pending placement.

##### Phase 2 · Residue

- **Goal:** System Trash Mode, the `TrashDeps` seam, a Context's registry index, compatibility-only decodes, and dead and ghost code leave.
- **Carries:** L-1, L-2, L-3, L-4, L-5, L-6, L-7, L-8, M-4; *§Approaches Worth Weighing*, 4.
- **Delta:** about −155.
- **Depended On By:** Phase 3 (L-1 before M-2, M-6, M-7, M-8).
- **Placements:** P-12 (`discard.ts`: one function or two; `Core/Trash/` or elsewhere).

##### Phase 3 · Delete, Journal, and Carry

- **Goal:** every delete writes one record, once, with what it takes, through one mint, one tail, one note, and one `leave`; the empty has one gone-for-good step, and the Archive one carry.
- **Carries:** M-1, M-2, M-17, M-5, M-6, M-7, M-8, M-10, M-11, M-18, P-3, P-5; closes B-1, B-5, B-6, B-10.
- **Delta:** about −115.
- **Depended On By:** Phase 4 (M-17 before the reach; the own-bundle exclusion lands in M-6's `finishContainer`).
- **Placements:** P-16 (M-17's gatherer: `gather.ts` or `cascade.ts`); P-3 and P-5 as listed.

##### Phase 4 · Reach-In

- **Goal:** the Trash joins the index and every cascade, watched, as the Archive is, and the frozen model leaves.
- **Carries:** M-16 and the admission; the claim rule and the pass-over; the stored-Space source; M-9 and the governed rule; the own-bundle exclusions; the watched Trash; Decision D-3's views, scoped reach, and tile docs; L-10; M-12; *§Approaches Worth Weighing*, 1, 7, and 8; closes B-2, B-3, B-7, B-8, B-9.
- **Delta:** about −450.
- **Depended On By:** Phase 5.
- **Placements:** P-10 (`storedAt`: the stamp parse into `Core/Paths/`, or `hiddenName` out of `exclusion.ts`); P-4 with it; P-7 (`heldPages.ts` split into the live id service and the stored projection); P-13 (the stored-Space source: the stored projection or `keyHolders.ts`).

##### Phase 5 · One Restore, Recognition, and the Interface

- **Goal:** one restore serves both stores and the items moved back by hand, and bundle ops have one Undo shape and one notice owner.
- **Carries:** M-3 with the restore's read handed on; recognition for pages and Sets (Decision E-1), the Archive (Decision E-3), and Spaces (Decision E-4); M-13 with L-9 and *§Approaches Worth Weighing*, 3; M-14; M-15; P-1, P-2, P-6, P-8; closes B-4, B-11, I-064, and I-079.
- **Delta:** about −95.
- **Depended On By:** Phase 6.
- **Placements:** P-14 (the one restore: `Core/Bundles/`, with `spend.ts` holding the empty under its own name); P-11 (the shared arrival tail: `settle.ts` beside `returningCascade`, `Core/Trash/`, or `Core/Bundles/`); P-1 (`repairLanded` beside `returningCascade`); P-2 (`parkLinks` beside `patchRecord`, or `trashedCopies.ts` renamed); P-6 (the Trash frame beside `ArchiveView`; its channel into `Bundles/handlers.ts`); P-8 (`archivePlace.ts`'s name); P-15 (the notice builder: `confirmations.ts`, `notifications.ts`, or `browser.ts`); the renderer's Set-covering follow-by-id helper in `Core/Nexus/record.ts`, if Approach 3 lands there.

##### Phase 6 · Tests, Docs, and the Closing Measurement

- **Goal:** tests sit where the behavior lives over one bundle fixture, each doc statement has one owner, and the restructure is measured and reviewed.
- **Carries:** P-9; the duplicated cases; the link strip's single owner in `ConnectionsPM.md`; Decision G-2's closing measurement; the two-wave and neutral review.
- **Delta:** ±0 production; tests about −1,000 across all phases (inferred).
- **Depended On By:** none.
- **Placements:** P-9 (the shared bundle fixture and browser harness in `Core/Testing/`).
