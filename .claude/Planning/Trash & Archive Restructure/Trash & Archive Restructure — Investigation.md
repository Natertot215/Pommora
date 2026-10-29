### Trash & Archive Restructure — Investigation

**DATE:** 10-28-2026
**HEAD:** `15fe7422a` on `active`, verified against the working tree, which is clean outside `.claude/Planning/Trash & Archive Restructure/`.

This document reconciles six read-only scouts (delete and the record; restore and empty; reach and the index; the Archive's filing and the store shape; the interface; owed work, adjacencies, and documentation) against *Trash & Archive Restructure — Decisions & Intention* as it stands on 10-28-2026, with its rulings through Decision 14: the Archive keeps its layout (10), files the Trash takes without a bundle stay invisible (11), compatibility-only decodes leave (12), every kind remembers its place one way, a Context's included (13), and system Trash Mode leaves (14). Every bug, every dead or unreachable claim, every duplication, and every call-site count was re-read in the code; a scout's citations were checked mechanically against file lengths, and none points past its file. Findings several scouts made are stated once, with the scouts credited by number. Where a finding depends on the Trash's model, it says so; findings that only the rejected Archive layout or system Trash Mode would have needed are gone. *§The Trash's Model* holds the measurement and the code side of the move onto reach-in that Decision 24 makes. The cleaned scout reports sit in `Scouts/` beside this document.

---

#### What's True

##### The Stores and Their Layout

**Two Stores, One Module:** `BundleStore` is `{ kind: 'trash' } | ArchiveStore` (`Core/Bundles/layout.ts:10`), and `layoutOf` answers `.trash` with the `.deleted` suffix or `.nexus/archive/<Collection ID>` with `.archived` (`layout.ts:12-19`). `ArchiveStore`, `archiveDirRel`, `archiveSegs`, `archivedCollectionIdOf`, and `isArchived` live in `Core/Paths/nexusPaths.ts:9-19`; `archiveStoreOf`, the guard that a sidecar id can name a folder, lives in `Core/Paths/names.ts:20-21`, with seven production callers (`archive.ts:41,143`, `refile.ts:42`, `bundle.ts:143`, `Bundles/handlers.ts:16`, `placement.ts:204`, `treePatch.ts:124`).

**The Bundle:** `mintBundle` makes `<stamp>__[n__]<basename><suffix>` under the mirrored chain with an atomic `mkdir` loop (`Core/Bundles/bundle.ts:64-79`), so a page's bundle is `<stamp>__Beta.md.deleted` and a Set's `<stamp>__Daily.deleted`. `stampedSegment` identifies the bundle by suffix and stamp together (`layout.ts:36-37`); `bundleAddressOf` derives the store from the path, building `{ kind: 'archive', id }` literally (`layout.ts:40-56`). `originPathOf` is a pure path function: the path under the store root with the bundle segment removed (`layout.ts:59-64`). It has 14 production call sites; 11 can carry an Archive store, and three are Trash-only (`bundle.ts:423`, `spend.ts:99`, `spend.ts:196`).

**The Archive's Chain:** an archived item's chain is its full path when it left, Collection folder included, under its Collection's ID folder (`.nexus/archive/<ID>/Notes/Daily/<stamp>__Beta.md.archived/Beta.md`). The ID folder tracks the current owner while the chain stays as filed, so a cross-Collection carry yields `.nexus/archive/<OTHER>/Notes/Daily/Sub/…` (`Core/Archive/refile.test.ts:124`).

**Flat Trash:** `trashFileFlat` renames a file to `.trash/<chain>/<stamp>__[n__]<name>` with no record and no suffix, checking `pathExists` before each `rename` (`Core/Trash/discard.ts:10-20`). Its one caller is `discardFile` (`discard.ts:36-47`), reached from tiles (`Core/Tiles/tilesFile.ts:156`), the legacy asset sweep (`Core/Assets/assetMigrate.ts:228`), and, in system Trash Mode only, the delete (`delete.ts:133,135`) and the Context/Space finish (`finishOwed.ts:266`). `listBundles` lists only suffixed, stamped folders with a readable record (`bundle.ts:153-176`), so flat entries never appear in the Trash and Empty Trash never reaches them, which Decision 11 keeps: no listing shows them and no reach reads them.

##### Delete and the Record

**The Record:** `recordFile` is a discriminated union over page, collection, set, space, property, and context (`Core/Bundles/record.ts:65-98`). The content arms carry `id`, `icon`, `parent`, `place`, `trail`, `archive`, `links`, `targets`, and `partial` (`record.ts:47-62`); `trail` is "kept current in the Archive by its carry" and only there (`record.ts:54`). A Context's `at` decodes `index.optional()` (`record.ts:93`) though `buildContextRecord` always writes it (`Core/Trash/gather.ts:137`).

**Writerless `partial` on Content:** no code sets `partial` on a page, Set, or Collection record. `gatherContentRecord` never writes it (`record.ts:187-221`); `innerRecord` copies it from a container record that can't carry it (`bundle.ts:271`); the Space, Context, and property builders are its only writers (`gather.ts:99,139`, `Core/Properties/deleteProperty.ts:72`). (Scout 1)

**The Delete:** `deleteOp` (`Core/Trash/delete.ts:76-229`, 154 lines) resolves its target (`fromArchive` for an Archive address, `delete.ts:41-61`), reads the tree, lifts set-asides for a container (`:91`), mints the bundle (`:96-99`), gathers `targets` (`:111`), then runs one of three kind arms (Space `:163-186`, Context `:187-204`, content `:205-220`), each building its record, writing it through the `write` closure (`:112-118`), and calling `deleted` (`:141-161`), which runs `runNoted` with the note, the list step and move (`leave`, `:131-139`), and the finish arm as its sweep. A refused note or list step runs `unminted` (`:120-124`), which removes the bundle and rolls the lift back. The outer `catch` rolls the lift back and rethrows, leaving the bundle (`:225-228`). The record lands before the move; for a Space or Context it lands before the strip too.

**Second Reads of What the Tree Holds:** `gatherSpaceRecord` re-reads the Space's sidecar for id and icon (`gather.ts:78`) and the registry strictly (`delete.ts:164`) to find the parent Context by folder title (`gather.ts:80-84`), while `spaceAt(before, rel)` (`delete.ts:165`) already holds `id`, `icon`, and `contextId`, built from the same sidecar (`Core/Contexts/spaceSidecar.ts:59-82`). The Space guard at `delete.ts:166` re-queries the same cached tree `mutableTarget` just checked (`Core/Nexus/liveTree.ts:74-75,80-87`) inside the settle's turn, so it can't fire. The Context guard at `delete.ts:192` reads the registry file, a source other than the tree `mutableTarget` checked, so it can fire on a registry rewritten between the two reads. (Scout 1)

**Three Sibling-Position Mechanisms:** `place { above, below }` for pages, Sets, Collections, and Spaces (`record.ts:43`); a numeric registry index `at` for a Context (`record.ts:93`, computed at `delete.ts:190`, restored through `withContextAt`, `spend.ts:189`, `Core/Contexts/contextsRegistry.ts:52-57`); and a Context's panel id and Space order left in `state.json` while bundled, since `dropDeparture`'s Context arm returns without writing (`Core/Nexus/reorder.ts:77-109`), dropped only at an empty (`spend.ts:109`) or a system-mode finish (`finishOwed.ts:324-325`), both through `dropContextOrder` (`reorder.ts:54-60`). Commit `43c127c2b` made the kept order deliberate. (Scout 1)

**Two Orders of Contexts:** the registry's array order is the sidebar's: `readNexus` builds `tree.contexts` from `registry.contexts` in order (`Core/Nexus/readNexus.ts:248`), and a sidebar drag sends `reorderContexts`, which rewrites the registry (`Core/Interface/Sidebar/sidebarDndModel.ts:323`, `Core/Contexts/reorderContexts.ts:6-14`). The "panel id" is something else: `state.json`'s `order.contexts` is the order Context fields take in the Property Panel (`Core/Properties/PropertyPanel.tsx:174,216-223`), written by `reorderPanelContexts` (`setPanelContextOrder`, `reorder.ts:40-41`; `mutate.ts:261-262`). Both order one set, the Contexts, for two surfaces, and each is set on its own, so making them one order is feature-level. `resolveRowOrder` lists unlisted ids after the listed ones in registry order (`UIX/Utilities/moveItem.ts:55-67`). `state.json`'s `order.spaces[<Context ID>]` is the Context's own Space order (`reorder.ts:43-51`).

**The Property Delete:** `deleteInner` mints and writes the property bundle in `snapshot` (`deleteProperty.ts:63-73`) before its note, and removes it on a refused `runNoted` (`:107-110`); a throw from `writeRecord` leaves the minted folder.

##### Restore and Empty

**Two Restores:** `restoreArchived` (`Core/Archive/archive.ts:89-136`, 48 lines) places the record, moves the artifact, writes the order, spends the bundle, runs `returningCascade`, carries archived records (`refileLanded`), and replies with an `archive` Undo. `restoreTrashed` (`Core/Trash/spend.ts:120-303`, 184 lines) adds the property arm (`:126-135`), the frozen world from `targets` (`:154-156`), the destination-schema scrub (`:157-170`), parking (`:171`), the owed-name landing refusal (`:175-185`), the Context's registry entry with rollback (`:186-207`), `restoreNote` (`:209-212`), the `repair` map (`:221-229`), membership re-apply (`:239-264`), the Link refill into live and trashed holders (`:265-288`), owed leftovers (`:289`), and the spend (`:295`). The Archive spends before its cascade (`archive.ts:115`); the Trash spends after (`spend.ts:295`). `restoreArchived`'s `store.kind !== 'archive'` test (`archive.ts:95`) can't fail, since `mutate.ts:147` dispatches on the same opened store; its entity and artifact tests still can. (Scouts 2, 4)

**A Third Path:** the Undo of a delete from the Archive is a Trash restore with destination `{ kind: 'archive' }`, keyed on `into` at three places in `restoreTrashed` (`spend.ts:195-198,272,297`) and on `placeRecord`'s archive arm (`Core/Bundles/placement.ts:247-264`). It runs `archiveFiling` → `fileInto` as `archiveOp`'s `filingOf` does (`archive.ts:68-86`), but names the artifact by the bundle's basename rather than `back.name`, strips `archive`, `links`, `targets`, and `partial` from the record (`spend.ts:197`), and runs neither `refileLanded` (`spend.ts:297`) nor `refileFiled` (`archive.ts:53-54`). (Scouts 1, 2)

**The Kept Record on a Partial Re-Tag:** `if (!unspent.length) await spendBundle(...)` (`spend.ts:294-295`) keeps `_record.json` in a bundle whose artifact has already moved out. Nothing reads that state: `listBundles` skips an artifact-less non-property bundle (`bundle.ts:165-166`), `restoreTrashed` refuses it (`spend.ts:136-137`), and `emptyBundle` refuses it (`spend.ts:88-89`). The Link refill's misses are named the same way and do spend (`spend.ts:284`). `spend.test.ts:796-825` pins the kept file. (Scout 2)

**The Restore Lock:** every Trash restore runs under `underContexts` (`Core/Nexus/mutate.ts:151-153`), a page's included, and the store is resolved twice, once for the lock (`mutate.ts:152`) and once inside `openBundle` (`bundle.ts:220`). The Contexts lock serves a write that "resolves a Space by title or path to write a tag" (`Core/Nexus/settle.ts:249`), and the scrub does exactly that for any returning page, Set, or Collection: it rewrites `<Title>` keys and Space words against `tree.contexts` (`Core/Trash/restoreScrub.ts:141-215`). The lock therefore earns itself for every scrubbed entity while the scrub exists; the Archive's exemption (`mutate.ts:140`) holds because archived copies are already reached by Context cascades.

**The Property Restore:** `restoreInner` (`Core/Trash/restoreProperty.ts:38-94`) filters `record.values` to holders `byId` places as a page or Space (`:72-83`), dropping gone Links into `dropped`, then refills through `refillValues` (`:84`), whose `refillOf` re-checks `gonePageEntry` on values the filter already passed (`Core/Nexus/governedSweep.ts:147-156`). The caller parks `dropped` (`spend.ts:131`). `restoreProperty` itself only wraps `restoreInner` in `serializeSchemaOp` (`restoreProperty.ts:31-36`). (Scouts 2, 3)

**The Empty:** `emptyBundle` (`spend.ts:60-114`) notes a container entry with `park: true` (`:94-105`), disposes the artifact and then a Collection's Archive (`:106-107`), drops metadata and Context order (`:108-109`), spends the bundle (`:110`), parks the record's links (`:111-112`), and finishes (`:113`). Its `dispose` (`:70-75`) is `discardFile`'s system arm plus a `permanentDelete` branch.

##### Reach, the Index, and the Link World

**How the Archive Is Reach-In:** `.nexus/archive` is a corpus root (`Core/Files/walk.ts:43`), admitted by one exemption in `outsideContent`, which holds an Archive path to the hidden rule only below `.nexus/archive` (`Core/Paths/exclusion.ts:69-74`). The watcher exempts `.nexus` at segment 0 (`exclusion.ts:20-29`). The tree leaves the Archive out with no Archive code (the root walk prunes `.nexus`); index readers each hide it by hand: `matrixGraph.ts:26`, `Core/Nexus/handlers.ts:171`, `cascade.ts:156,276`, `governedSweep.ts:111`, `registryProperty.ts:184` (four `outsideArchive` uses and four `isArchived` uses in production). (Scout 3)

**How the Trash Is Out:** `.trash` is hidden to the watcher (`exclusion.ts:20-29`, applied by `Desktop/FileWatch/watcher.ts:55-66`) and to the index (`outsideContent` reads it `'hidden'`), while sync's `manifestAdmits` admits `.trash` by judging what's below it (`exclusion.ts:48`). The sync tap's drop of watched `.trash` events (`Core/Sync/Client/tap.ts:50`) is unreachable today: the watcher is the only feeder of `emitWatch` (`watcher.ts:112`, `Core/Files/writeEcho.ts:67-69`), and it never raises a `.trash` event. (Scouts 3, 6)

**The Discriminating Constraint:** `nexusPages` answers two things (`Core/Nexus/heldPages.ts:73-85`). `byId` is the addressing map: tree entities plus archived pages at the store path a writer opens, with `null` where two files claim one id (`heldPages.ts:16-20`). `archived` is the resolution half: archived pages at their origin paths. Nothing resolves a title through `byId`. Resolution goes through `linkWorld` (tree plus `archived`, `heldPages.ts:88-92`) and `deleteCascade`'s `after` (tree outside the deleted item plus `archived`, `cascade.ts:107-111`). `byId` is consulted for writes only: `addressable` (`heldPages.ts:61-64`) gates the strip (`cascade.ts:133`), `findHolders`' capture (`Core/Index/keyHolders.ts:105-126`), and `sweepRootsById` (`governedSweep.ts:119-144`), and `heldElsewhere` reads it for the id-live refusal (`placement.ts:38-40,51`). A reach-in Trash therefore needs trashed pages in `byId`, or the strip counts every trashed linker `heldOut` (`cascade.ts:133-136`) and its entry stays owed for good, and out of `archived`, `linkWorld`, and `after`, or a delete's strip finds the deleted page still answering its key and strips nothing. The two halves already exist; the Trash joins one and not the other. (Scouts 1, 3, 6; Scout 4's §5 is corrected in *§Corrections*.)

**The Trash's Partial Reach Today:** three paths rewrite trashed copies: `finishProperty`'s gone-definition arm (`finishOwed.ts:164-186`), `refillTrashed` (`trashedCopies.ts:83-118`, from `spend.ts:287`), and `refillStash`'s splice of `trashedHolders` into its `RootsById` (`Core/Properties/assignment.ts:48-61`). Three more read the Trash without rewriting copies: `parkLinks` appends to records (`trashedCopies.ts:36-45`), `collectionsElsewhere` reads every Trash record (`bundle.ts:186-188`), and `finishContainer`'s `park` arm calls `parkLinks` (`finishOwed.ts:408`). Each walks the Trash by `listBundles`; three list its value holders by three rules: `finishProperty` (pages and Collection sidecars, `finishOwed.ts:167-183`), `trashedHolders` (pages, Space sidecars, a Context's Space sidecars, `trashedCopies.ts:48-80`), and `originPagesIn` (pages at their origin, the bundle path stored in `ConnPage.id`, `bundle.ts:416-426`). (Scouts 3, 6)

**One Composition Written Four Times:** `frozenWorld(linkWorld(tree, archived))` after its own `nexusPages` appears at `restoreProperty.ts:69-70`, `assignment.ts:39,62`, and `spend.ts:140,155-156` with a variant at `:272`. `frozenWorld` lives in `Core/Trash/trashedCopies.ts:23-33`; three of its four callers pass no `targets`, and its interface `Frozen` lives in `Core/Nexus/governedRoot.ts:60-63`, whose comment ("the pages a frozen copy may still name") misdescribes the live strip's use of the same shape (`cascade.ts:113-114`). (Scouts 2, 3, 6)

**`heldPages.ts` Holds Two Concerns:** a live-tree id ↔ path service for writers (`heldPages.ts:23-52`) and the stored projection (`:54-103`), which its header admits (`:1-2`). (Scouts 3, 6)

##### The Archive's Filing and Carry

**One Carry, Three Triggers:** `refileArchived` (`Core/Archive/refile.ts:50-63`) re-trails and, across Collections, moves each record archived from within a Set; `refileLanded` (`:75-86`, the restores), `refileFiled` (`:89-96`, `archiveOp`'s Undo filing only), and `refileMoved` (`:102-122`, the settle) each compute `from`, `to`, and `above` their own way. Three formulas answer a record's current trail: `settleArchives` uses `trailAbove` while the parent is live (`refile.ts:132`), `refileArchived` uses `held ?? retrailed(origin, [...above, setId])` (`refile.ts:60`), and `archiveFiling` uses the deepest live container on the record's chain, then `retrailed` (`placement.ts:198-203,216-225`). With the parent live, the third gives `trailAbove`; with the parent gone, it gives the moved Set's chain or a deeper live one, so it subsumes the other two (worked by reading; no test isolates it). (Scout 4)

**The Open Pass:** `settleArchives` lists and decodes every record of every live Archive and walks the tree for each, every open (`refile.ts:125-143`), to catch Sets moved while the app was closed; an Archive whose Collection answers nowhere moves into the Trash (`refile.ts:145-151`). (Scout 4)

**Ownership by Folder:** `archiveOwned` and `collectionsElsewhere` (`bundle.ts:179-203`) are enumerated over every ID folder twice by hand, in `settleArchives` (`refile.ts:126-145`) and `finishContainer`'s `owedEdit` (`finishOwed.ts:390-397`), with `placement.ts:206` a third caller. `archivedSetIds` and `archivedSets` run the same Set-sidecar walk, one answering ids and one directories, reading the scope two ways (`Core/Nexus/configReach.ts:288-304`). (Scouts 3, 6)

**What the ID Folder Buys:** a synchronous owner from a path (`owningCollection`, `Core/Nexus/treePatch.ts:110-119`), a one-folder ArchiveView listing (`Bundles/handlers.ts:20-33`), a one-folder discard when a Collection leaves for good (`spend.ts:107`, `delete.ts:135`), and origin paths from paths alone (`heldPages.ts:81`). What exists only because of it: `refile`'s cross-folder move (`refile.ts:45`), `moveIntoStore` (`bundle.ts:120-133`), `from` threaded through the carry, `archiveFiling`'s choice and re-root (`placement.ts:198-214`), `archiveOwned` with `collectionsElsewhere`, the orphan sweep, `finishContainer`'s per-folder scan, and `collectionArchive` with its two Trash arms (`archive.ts:139-154`, called only from `delete.ts:102` in system mode and `spend.ts:90`). (Scout 4)

##### Owed Work

**The Journal:** `ContainerEntry` (`Core/Nexus/owed.ts:23-31`) serves three operations told apart by field presence: a delete (`strip`, `edit`, optional `bundle`), an empty (`strip`, `edit`, `park: true`), and a Set move (`edit`, `within`, no `strip`; `Core/Nexus/move.ts:78-83`), and `finishContainer` re-derives which from `e.within` twice (`finishOwed.ts:385,387`). Entries are keyed three ways: the item's id for a live delete or Set move (`delete.ts:210`, `move.ts:79`), the Archive path for a delete from the Archive (`delete.ts:210`'s fallback), and the bundle path for an empty (`spend.ts:94`). `spendBundle` reverse-looks-up a container entry by `e.bundle` and rewrites its strip (`bundle.ts:382-392`), so `Core/Bundles` edits journal entries `owed.ts` otherwise owns. (Scout 6)

**Both Stores Write Relink Entries:** the Archive has no arm in `finishOwed`, but its departing re-spell and both restores' repairs and re-spells write relink entries through `noteRelink` (`settle.ts:301-302,338`; `restoreScrub.ts:226`; `cascade.ts:325-337`).

**`park`:** a finish's stripped links go to `bundle`'s record, else to `parkLinks` when `park` is set (`finishOwed.ts:403-409`). A system-mode content delete carries neither (`delete.ts:211-217`), so its finish drops values a trashed namesake could have kept, while an empty parks them (`spend.ts:103`). No test pins the system-mode side. (Scout 6)

**Two `Owed` Types:** `owed.ts:15` (journal name lists) and `Core/Nexus/fileEvents.ts:93` (the walk and stamp debt), both imported into `finishOwed.ts:19`. (Scout 6)

##### The Interface

**One Browser, Two Skins:** both skins use `useBundleBrowser` (`Core/Bundles/browser.ts:264`) and `BundleTable` (`Core/Bundles/BundleTable.tsx:33,83`); store differences funnel through `rulesOf` (`browser.ts:236-259`). The Trash frame lives in `Core/Settings/TrashFrame.tsx` and `ArchiveView` in `Core/Archive/ArchiveView.tsx`; each writes its own `footing()` (`TrashFrame.tsx:26-42`, `ArchiveView.tsx:61-77`), and each hand-places a heading over the grid `BundleTable` dictates, the Trash rebuilding the kit's `col-header` in `trash-frame.css` and naming its own date glyph (`TrashFrame.tsx:51-68`). `SettingsWindow`'s `DRAG_SURFACES` names the Trash frame's class names (`Core/Settings/SettingsWindow.tsx:44-45`). The Trash can't declare an action bar, since `useDeclareActions` gates on `useHostShown()`, false outside a `ContentHostContext` (`Core/Interface/contentHost.ts:15-18`). (Scout 5)

**Three Undo Shapes:** a delete's or archive's Undo is a restore by `MutateOutcome.bundled` with a renderer-chosen destination (`Core/Interface/Confirm/confirmations.ts:54-70,113-124,144`); an Archive restore's is a reply-carried `undo` request the browser re-sends by id (`archive.ts:125-134`, `browser.ts:145-168`); a delete from the Archive's destination is `ARCHIVE_UNDO`, decided in the renderer (`browser.ts:108,256`), though the host already knows (`fromArchive`) and persists the address in the record's `archive` field for it (`delete.ts:59`, read only at `placement.ts:247-250`). A Trash restore offers no Undo. (Scouts 1, 2, 5)

**Dead and Ghost Interface Code:** `confirmDelete`'s `undoTo` has no production caller (`pageMenuActions.ts:70`, `entityMenuActions.ts:117`, and `PropertyFrame.tsx:246` pass none), and its `undoTo?: never` arm exists for it (`confirmations.ts:88-92`); `browser.deleteOne` hand-rolls the same flow (`browser.ts:401-407`). `archivedKind` coerces every row to page or Set because `requestOf`'s type doesn't express that only the Archive sends `delete` (`browser.ts:60,113-120`). `ArchiveView`'s `?? owner.id` (`ArchiveView.tsx:30`) fires only with no tree, and would then send a Set's id as an Archive id. `BundleRows` is the repo's only `lineList` with dummy `commit`, `label`, and `watch` (`BundleTable.tsx:106`). `UIX/Table/table.css:12`'s comment names Core surfaces. (Scout 5)

**Two Notice Owners:** a non-quiet `mutate` posts `unrestoredLine` and, for every op but `delete` and `deleteProperty`, `warnCascade` (`Core/Session/nexusSlice.ts:267-278`); bundle callers then post their own notice, and `post` keeps one notice at a time (`Core/Interface/Notifications/notifications.ts:56-59`). Restore and delete notices carry the reply's lines (`browser.ts:391-399`, `confirmations.ts:113-124`); `confirmArchive` doesn't (*§Bugs Found*, B-4). `quiet` has one caller (`browser.ts:436`). (Scout 5)

##### System Trash Mode, Leaving Under Decision 14

**No Setter:** `trashMode` is read from `pommora.json` (`Desktop/Config/appConfig.ts:14,20,43`) and handed to `HostContext.trashMode` (`Desktop/main.ts:301`, `Core/Contract/handlers.ts:63`); no code writes it (`updateAppConfig`'s callers write `recents`, `device`, and `lastNexusPath`: `Desktop/Actions/appMenu.ts:43`, `Desktop/Config/device.ts:29,36,72,111`, `Desktop/main.ts:316`), and no settings row exists. `'system'` is reachable only by hand-editing the file. (Scouts 5, 6)

**What It Reaches:** every branch, type, key, field, line of copy, and doc passage is inventoried in L-1. `TrashDeps` is referenced 30 times across 10 production files (`assetMigrate.ts`, `Assets/handlers.ts`, `finishOwed.ts`, `Nexus/handlers.ts`, `mutate.ts`, `Testing/settledMutate.ts`, `Tiles/handlers.ts`, `tilesFile.ts`, `discard.ts`, `spend.ts`), declared as a literal in 34 test files (`trashMode: 'nexus'`), with system mode set at 25 test lines across 13 files and `trashToSystem` stubbed in 31 files.

---

#### Bugs Found

Each was confirmed by reading the code; none was run. "Uncovered" means no test exercises the failing path.

##### B-1 • A Delete That Throws Before Its Move Leaves an Empty Bundle

- **Cause:** `deleteOp` mints at `delete.ts:99`, then gathers `targets` (`:111`), finds holders (`:178,196`), and writes the record (`:114`) before the move. A throw there reaches the outer `catch` (`:225-228`), which rolls the lift back and never removes the bundle; only `unminted` does, and only for refusals. The Space and Context guards (`:166`, `:192`) return their refusal after the mint without `unminted`, leaking it the same way. The property delete's `snapshot` mints and writes with no cleanup (`deleteProperty.ts:63-73`).
- **Evidence:** the empty folder is permanent and invisible: `listBundles` finds no record and walks into it (`bundle.ts:160-163`), nothing empties it, and sync's manifest admits it (`exclusion.ts:48`). `fileInto` gets this right (`bundle.ts:109-115`).
- **Coverage:** `archive.test.ts:227-242` drives a thrown record write on a Set delete and asserts only the lift's rollback. Uncovered for the bundle.
- **Fix:** one mint-and-record primitive that removes the bundle on throw, used by `fileInto`'s fresh branch, `deleteOp`, and `snapshot`, with `deleteOp` gathering every record before it mints, so the guards fail before anything exists. Independent of every ruling. (Scout 1)

##### B-2 • A Property Restore Drops Values for Holders in the Trash

- **Cause:** `restoreProperty.ts:74-76` keeps a value only when `byId` places its holder as a page or Space; a trashed holder reads `undefined`, so the test is true and the value is filtered out, neither refilled nor named unrestored (`:86-89` names only survivors), and `spendBundle` discards the record (`spend.ts:133`).
- **Sequence:** page A holds property P; P is deleted (A stripped, A's value in P's record); A is deleted; P is restored, and A's value is lost for good, so A's later restore can't bring it back. A content restore does the opposite through `refillTrashed` (`spend.ts:281-287`).
- **Coverage:** uncovered. `restoreProperty.test.ts:492` pins that a hard-removed holder is skipped, which is a different case: that holder can't return.
- **Fix:** under reach-in, trashed copies sit in `byId` and `refillValues` reaches them; under resolve-on-restore, the property restore routes trashed holders through the same trashed refill content restores use. (Scout 3)

##### B-3 • A Property Gone for Good Stays on Trashed Spaces

- **Cause:** `finishProperty`'s gone-definition arm lists trashed holders with `contentPages` (`finishOwed.ts:181-183`), which answers `[]` for a Space or Context (`bundle.ts:405-406`), and adds only trashed Collection sidecars as folders (`:176-179`). A trashed Space's `_space.json`, or a trashed Context's Space sidecars, keep the value; `trashedHolders` would have found them (`trashedCopies.ts:70-76`).
- **Coverage:** uncovered; `spend.test.ts:2623-2690` covers trashed pages and Collections only.
- **Fix:** one Trash value-holder listing that includes Space sidecars; under reach-in, trashed holders are ordinary holders of the property delete's own strip and the arm leaves. (Scout 6)

##### B-4 • An Archive Whose Re-Spell Misses Loses Its Warning and Try Again

- **Cause:** the slice posts `warnCascade` for an archive's `cascade` (`nexusSlice.ts:270-278`), and `confirmArchive` then posts `Archived “T”` through `notifyUndoable` without the cascade (`confirmations.ts:143-146`); `post` keeps one notice (`notifications.ts:56-59`), so the warning and its Try Again are replaced. `departingCascade` returns `linksNotUpdated` when the index can't settle, and a relink entry's misses otherwise (`settle.ts:356-375`).
- **Coverage:** uncovered.
- **Fix:** the archive's notice carries the cascade's links, warning, and Try Again as `offerDeleted` does, or one notice owner for bundle ops (*§Removal & Consolidation Ledger*, M-14). Independent of every ruling. (Scout 5)

##### B-5 • A Failed Empty Can Return a Collection's Archive as Trash Rows

- **Cause:** `emptyBundle` disposes the Collection's artifact, then its Archive (`spend.ts:106-107`). If the Archive's disposal throws, the bundle is left holding its record alone, so `listBundles` stops listing it (`bundle.ts:165-166`), `collectionsElsewhere` stops counting the Collection as trashed (`bundle.ts:186-188`), and the next open's `settleArchives` reads the Archive as orphaned and moves its bundles into the Trash (`refile.ts:145-148`). Metadata isn't dropped and the bundle isn't spent (`spend.ts:108-110`).
- **Coverage:** uncovered; `trashRecovery.test.ts:1050` pins the views only.
- **Fix:** dispose the Archive before the artifact, so a failure leaves the Collection's row standing for a second empty, inside one gone-for-good step (*§Removal & Consolidation Ledger*, M-7). Independent of the Trash's model. (Scout 6)

##### B-6 • A Set Restored From the Trash Carries From a Stale Archive

- **Cause:** `restoreTrashed` passes `collectionOf(originOf(stored))` as the Archive to carry out of (`spend.ts:296-297`), and a Trash record's trail is never re-trailed (`record.ts:54`). If a trashed Set's former parent moves to another Collection, `refileMoved` carries the Set's archived descendants into that Collection's Archive by trail (`refile.ts:102-116`); restoring the Set into a third Collection then searches the old Archive, finds nothing, and leaves them misfiled.
- **Coverage:** uncovered; the next open's `settleArchives` repairs it (`refile.ts:129-141`).
- **Fix:** derive `from` from where the records sit now, which `currentTrail` (M-10) makes a tree question; under reach-in, the Trash's records are re-trailed by the same carry. (Scout 4)

##### B-7 • A Stash Refill Keeps a Dead Entry for a Trashed Copy

- **Cause:** `refillStash` computes `gone` over live members only (`assignment.ts:63-72`). A trashed copy's stashed Link naming a gone page is refused by `refillOf` (`governedSweep.ts:150-155`), isn't in `gone`, stays in `owed` (`assignment.ts:75-77`), and is retried on every re-assign.
- **Coverage:** uncovered.
- **Fix:** one gone-Link partition over every root the refill reaches; under reach-in, trashed copies are members like any other. (Scout 3)

##### B-9 • A Page Restored After a Rename Comes Back Holding the Old Names

- **Cause:** the scrub moves a returning key or word only to a current one whose label some format spells the same way (`matchOf`, `restoreScrub.ts:46-58`). A property, option, Space, or Context renamed while the page sat in the Trash leaves no spelling to match, so the old key, word, title, and `<Title>` key return as foreign data.
- **Evidence:** the reach-in measurement's spot check, in every cell at `15fe7422a` and again at `9b9c0d630` (*§The Trash's Model · §The Measurement*).
- **Coverage:** pinned as intended for a renamed property: `restoreScrub.test.ts:524` ("leaves a key whose property was renamed while it sat in the Trash as written"). A Link value the delete stripped from another page does come back under the new name, since the record files it by the property's id (`trashRecovery.test.ts:516`); only what the trashed copy itself holds stays old.
- **Fix:** under reach-in, the cascade renames the trashed copy as it renames a live one; under resolve-on-restore, the scrub would need the registry's rename history, which nothing keeps. (Measurement)

##### B-8 • Edge Cases That Follow From Outside Writes or Hand Edits

- **A Stray File Under an Archive:** `outsideContent` admits any visible `.md` under `.nexus/archive` (`exclusion.ts:71`), so `.nexus/archive/<ID>/loose.md` is indexed, claimed in `byId` (`heldPages.ts:80`), and given the origin `loose.md`, since `originPathOf` removes nothing when no segment is stamped (`layout.ts:62-63`). Fixed by an admission that requires a path inside a stamped bundle (M-16's `storedAt`). Uncovered. (Scout 3)
- **Two Exclusion Readings:** `listInner` judges an inner item by its origin path (`bundle.ts:334`), the index by its store path (`exclusion.ts:71`), so an archived page whose origin lies under a folder excluded since is hidden from the browser and still indexed. Same fix. (Scout 3, inferred)
- **A Trash Mode Flip Mid-Finish:** `leave` routes by the current mode (`finishOwed.ts:259-268`), so a system-mode Context or Space delete cut short and finished after the mode reads `nexus` drops a record-less flat folder into `.trash`. Reachable only by hand-editing `pommora.json`; it leaves with Trash Mode (Decision 14), and a folder it already left stays invisible (Decision 11). (Scout 6)

---

#### Removal & Consolidation Ledger

Ordered removal-first: residue, then merges, then relocations. Deltas are production lines, rough, and exclude tests and docs unless stated; overlaps between items aren't netted. **Depends** names what an item waits on: *reach-in* (lands with the Trash's move onto it, Decision 24) or *none*. Decisions 10, 11, 13, and 14 are settled, so nothing waits on them.

##### Residue to Remove

- **L-1 · System Trash Mode (Decision 14):** a delete always mints a bundle in the Nexus's own Trash. What leaves:
  - **Type and Setting:** `Core/Trash/trashMode.ts` (`TrashMode`, `DEFAULT_TRASH_MODE`); `AppConfig.trashMode`, `trashModeOf`, and the decode at `appConfig.ts:43` (`Desktop/Config/appConfig.ts:6,14,20,43`); `main.ts:47,301`; `HostContext.trashMode` (`Core/Contract/handlers.ts:8,63`).
  - **Branches:** `TrashDeps.trashMode` and `discardFile`'s system arm (`discard.ts:8,23,29,41-45`); the delete's no-bundle path, its Collection-takes-its-Archive arm, its metadata drop, and its system discards (`delete.ts:96-108,133,135,138`, with `collectionArchive`'s import at `:3` and `pageIdsOf`'s use); the `bundle ? … : …` conditionals the system path forces (`delete.ts:73,113,121,164,172,193,207,216,222`); `finishOwed`'s `leave` discard branch (`finishOwed.ts:266`) and its system order drop (`:324-325`); every Context and Space delete's entry carries `bundle` (`owed.ts:21-22`), so the finish's no-bundle branch has no writer.
  - **Contract and Copy:** `delete:facts`'s `trashMode` half (`Core/Trash/handlers.ts:4,11,14`; `bridge.ts:10,203`, whose comment at `:202` names the system trash); `DELETE_FACTS_FALLBACK.trashMode` (`confirmations.ts:4,13`); `askTrashing`'s system wording, "It will be moved to the system trash." (`confirmations.ts:75,79-82`), leaving the `.trash` sentence; `confirmDelete`'s comment clause "A system-trash delete mints no bundle, so it offers no Undo" (`confirmations.ts:88`); `MutateOutcome.bundled` becomes always present for a held-item delete (`mutateRequest.ts:21`).
  - **Docs:** `CorePM.md:56,171` ("trash mode"), `DesktopPM.md:38`, `ConfigurationPM.md:266` ("`.trash` or the system trash"), `NexusRecordPM.md:12` ("System-trash mode records nothing…") and `:16` ("whichever Trash Mode is set", "as a system-trash delete of one does", "A system-trash delete mints no bundle, so it offers no Undo"), `InterfacePM.md:80` ("a delete sent to the system trash offers none"), `SurfacePM.md:26` ("wherever Trash Mode sends deletions"), and `.claude/CLAUDE.md:94` ("Deletion, Trash Mode, and restore").
  - **Tests:** the 25 system-mode lines across 13 files (`archive.test.ts:927`, `assetMigrate.test.ts:224`, `writePathRace.test.ts:83`, `confirmations.test.ts:200`, `finishOwed.test.ts:768`, `mutate.test.ts:721,746,1417,3708`, `settle.test.ts:838`, `setSpaceProperty.test.ts:26`, `tilesFile.test.ts:357`, `deleteOrder.test.ts:222`, `deleteReach.test.ts:331,445,613,677`, `spend.test.ts:342,353,383,1887`, `appConfig.test.ts:59-60,87-92`); the cases that pin system behavior go, and the ones that only borrowed the mode for convenience switch to the Nexus's Trash.
  - **What Stays, and Why:** `trashFileFlat` and `discardFile`'s flat arm, because tile texts (`tilesFile.ts:156`) and the legacy asset sweep (`assetMigrate.ts:228`) still discard through them (Decision 11 keeps those files invisible); `trashToSystem`, because an empty without Permanently Delete hands the item to the operating system's trash (`spend.ts:70-75`), and `setAside`'s own call (`atomicWrite.ts:226-229`); `delete:facts` narrowed to `permanentDelete`, because the empty's question must read that setting at the moment of asking (`bridge.ts:202`); `chainDir`'s escape test, because asset files outside the Nexus still go flat.
  - **Delta:** about −70 production (inferred), the system-mode tests with it. (Scouts 1, 5, 6)
- **L-2 · `TrashDeps` (Follows L-1):** with the mode gone, `TrashDeps` carries only `trashToSystem`, a re-wrap of the Platform seam `machine().trashToSystem` (`discard.ts:27-33`, installed at `Desktop/main.ts:72`) kept so tests can inject it. Its 30 production references across 10 files thread `deps` through `MutateContext` (`mutate.ts:71,77`), the finish, tiles, assets, and the settle to reach one reader, the empty's `dispose`. Two shapes: `dispose` reads `machine().trashToSystem` with the same refusal, `deps` leaves every signature, and tests install a machine; or `TrashDeps` stays as `{ trashToSystem }`. The first removes the parameter and the 34 test literals; the second keeps a seam that duplicates one. **Delta:** about −30 production for the first (inferred). **Depends:** none. (Scouts 1, 6)
- **L-3 · Context Position Through `place` (Decision 13):** what it touches:
  - **Record:** the Context arm's `at: index.optional()` becomes `place` (`record.ts:90-97`), optional as every other kind's is.
  - **Gather:** `ContextEvidence.at` and `buildContextRecord`'s `at` (`gather.ts:103-141`) become `placeOf(tree.contexts ids, entry.id)`, `tree.contexts` being registry order (`readNexus.ts:248`); this folds into M-4. `deleteOp` still needs the registry index locally for its own rollback, `withContextAt(entry, at)` on a failed move (`delete.ts:190,201`), which is an in-op undo rather than a stored position.
  - **Departure:** `dropDeparture`'s Context arm (`reorder.ts:106-107`) drops the Context's id from `state.json`'s `order.contexts`, the Property Panel's Context order, as the Space arm drops a Space's (`reorder.ts:97-104`).
  - **Re-Entry:** the restore's registry write (`spend.ts:186-192`) splices the entry into `registry.contexts` beside the neighbor `place` names, `slotOf` choosing the anchor and slot among the listed ids (`placement.ts:152-159`) as it does for every other kind, before the folder moves; `withContextAt`'s index parameter gives way to that splice. A Context differs from the other kinds only in when its position lands, ahead of the move, since its identity lives in the registry entry (`spend.ts:172`); `placeRecord` keeps its Context early return (`placement.ts:277`), since `writeOrder` runs after the move (`spend.ts:213`).
  - **Its Own Space Order:** "returns with it" has two shapes. It can stay in `state.json`'s `order.spaces[<ID>]` while bundled and leave at the empty, as today; or it can travel in the record (the Space ids in order), leave `state.json` at the delete, and be written back at the restore, as a container's child order travels in its sidecar. The second leaves `state.json` holding nothing for an item outside the tree and retires `dropContextOrder` (`reorder.ts:54-60`) with its two callers (`spend.ts:109`, `finishOwed.ts:325`); the first keeps `dropContextOrder` as the empty's Space-order drop alone. *(§Approaches Worth Weighing, 9)*
  - **Two Orders:** the registry order (the sidebar's) and the panel order (the Property Panel's) are two separately set orders of one set (*§What's True · Two Orders of Contexts*); merging them is feature-level and stays out. Decision 13 has a Context's record name its neighbors in both through the one `place` rule, so a restored Context returns to its spot in each; without the panel's, it would land after every listed id in the Property Panel's Context order (`resolveRowOrder`, `moveItem.ts:55-67`).
  - **Tests:** `spend.test.ts:298-349` (the kept order, the pre-`at` record, the empty's and the system delete's drops) are rewritten or go; `finishOwed.test.ts:762` goes with L-1.
  - **Docs:** `NexusRecordPM.md:10` ("its place in the registry"), `:14` ("its Space order, kept in `state.json` while it sits in the Trash, applies again"), `:16` ("taking a Context's kept Space order with it").
  - **Delta:** about −10 (inferred), one mechanism fewer. (Scout 1)
- **L-4 · Compatibility-Only Decodes (Decision 12):** every one the scouts found, and what each removal does to existing records:
  - **A Context Record's Optional `at`** (`record.ts:93`), optional only for records written before `43c127c2b` (09-27-2026); `spend.test.ts:313-321` pins its decode. It leaves entirely under L-3.
  - **Content `partial`** (`record.ts:61`), read by `rows.ts:93,147`, `recordedPartly` (`record.ts:102-109`), and copied by `innerRecord` (`bundle.ts:256,271`), and destructured at `spend.ts:197`. Its writer left in `e15c74b8a`, so only a page, Set, or Collection record an earlier build wrote partial can still carry it. The assertions pinning its absence (`deleteOrder.test.ts:168,174,215`; `deleteReach.test.ts:800-806`) go with it.
  - **The Retired `.provenance.json` Format:** no production code reads it (no `provenance` outside `Core/Matrix/README.md`); `spend.test.ts:684-698` pins only that such entries stay invisible, and goes.
  - **I-069's Bare-Id `targets`:** no decode path exists; the deferral stands, and nothing is added. Under reach-in, `targets` leaves the schema and those records decode again (next item).
  - **A Record That Stops Decoding:** none of these removals makes a record that decodes today stop decoding. Every record arm is a `z.object` (`record.ts:47-97`; zod `^4.4.3`, `Core/package.json:40`), which strips an unknown key rather than refusing it, so a Context record still carrying `at` and a content record still carrying `partial` decode and stay listed. What changes for them: every Context record in a Trash today carries `at` and no `place`, so each restores at the end of the sidebar order (`withContextAt`'s default, `contextsRegistry.ts:55`); a content record carrying `partial: true` loses its row's partial mark and its restore's partial warning. Shapes that don't decode today stay out: I-069's range (`d5462735f`..`6231cb841`) under resolve-on-restore, and the retired provenance entries. A record drops out only if the plan makes a field required or an arm strict; `place` therefore stays optional on the Context arm, as on every other.
  - **Adjacent State the Same Rule Covers:** an existing `pommora.json` `trashMode` key survives as an unmodeled field, since `updateAppConfig` overlays the raw object (`appConfig.ts:49-50`), and nothing reads it; a journal entry a system-mode delete left unfinished (a Context or Space entry with no `bundle`, a container entry with neither `bundle` nor `park`) meets a `leave` with no discard branch, and the plan states how it finishes rather than keeping the branch.
  - **Delta:** about −6 production, about −40 tests. (Scouts 1, 2)
- **L-5 · The Kept Record on a Partial Re-Tag:** always spend; `unspent`'s gate, the comment at `spend.ts:294`, and the "record stays" assertions in `spend.test.ts:796-825` go; `NexusRecordPM.md:14`'s "the record is removed once every page still present has its tag back" changes. **Delta:** about −3. **Depends:** none. (Scout 2)
- **L-6 · `confirmDelete.undoTo`:** the field, its `never` arm, its comment clause, and `confirmations.test.ts:275-283`. **Delta:** about −4. **Depends:** none; it also falls out of M-13. (Scout 5)
- **L-7 · Ghost Guards:** `delete.ts:166`; `gatherSpaceRecord`'s null and `unaddressable` arms (`gather.ts:79,96`) once M-4 builds the record from the tree; `restoreArchived`'s store test (`archive.ts:95`; its entity and artifact tests stay); `ArchiveView`'s `?? owner.id`. **Delta:** about −6. **Depends:** none. (Scouts 1, 2, 5)
- **L-8 · Test-Only Exports:** `slotOf` (`placement.ts:152`, which L-3's re-entry then uses in production) and `returningNames` (`settle.ts:306`) stop being exported for tests alone, tested through `placeRecord` and `returningCascade`. **Delta:** ±0. **Depends:** none. (Scout 2)
- **L-9 · The Record's `archive` Field:** persisted forever for a toast-lived Undo (`record.ts:56-57`, written only at `delete.ts:59`, read only at `placement.ts:247-250`); it leaves when the delete-from-Archive reply carries its own Undo (M-13). Existing Trash records carrying it still decode (L-4's rule). **Delta:** about −5. **Depends:** none. (Scouts 1, 5)
- **L-10 · Frozen-Model Machinery:** `targets` end to end (`record.ts:39-40,60,76,95`; `gather.ts:24-58`; `delete.ts:111,116`; `bundle.ts:270`; `spend.ts:154-156,221-229`; `returningCascade`'s `repair`, `settle.ts:328,338`; `frozenWorld`'s second parameter); `refillTrashed` and `trashedHolders` (`trashedCopies.ts:47-118`, 72 lines); `restoreTrashed`'s trashed split (`spend.ts:273,281-283,287`) and `refillStash`'s splice (`assignment.ts:48-61`); `finishProperty`'s Trash arm (`finishOwed.ts:164-186`); `originPagesIn` and its `id` overload (`bundle.ts:416-426`); the scrub's Link drop and parking (`spend.ts:171`); and, by *§Approaches Worth Weighing* 2, most or all of `scrubReturning`, `currentKeys`, and `matchOf` (`restoreScrub.ts:43-215`, 173 lines). I-069 dissolves with `targets`, and B-2, B-3, and B-7 dissolve by construction. **Delta:** about −200 with the scrub's destination reconcile kept, about −330 without it, before *§The Trash's Model*'s additions. **Depends:** reach-in. (Scouts 1, 2, 3, 6)

##### Merges

- **M-1 · One Mint-and-Record Primitive:** mint, write the record, remove the bundle on throw; `fileInto`'s fresh branch, `deleteOp`, and `snapshot` use it; `deleteOp` gathers before it mints, and its `write` closure goes. Fixes B-1. **Owner After:** `Core/Bundles/bundle.ts`. **Delta:** about −15. **Depends:** none. Delete calling `fileInto` whole is blocked by the note's ordering: a Context or Space finish moves a stuck folder into the bundle the note names (`finishOwed.ts:259-268,318,347`), so the shared piece is mint-plus-record, not mint-plus-move. (Scout 1)
- **M-2 · `deleteOp`'s Arms as Plans Feeding One Tail:** each kind yields `{ id, record, note, unlist?, relist? }`, and one tail runs `deleted`, `unminted`, and the reply; with L-1 every arm has a bundle, so the tail carries no `bundle ?` branches. **Delta:** about −30, overlapping M-1 and L-1. **Depends:** none. (Scout 1)
- **M-3 · One Restore With Record-Driven Arms:** every Trash-only step selects itself from the record (`links`, `targets`, `entity`, `membership`), and Archive records carry none of those, so one restore covers both stores; the only store branches left are the reply's Undo and, while the scrub exists, the lock. It removes the twice-written prelude (`spend.ts:139-153,173` vs `archive.ts:97-116`), the double store resolution (`mutate.ts:147,152`), and the spend-order divergence (the Archive's, spend before the cascade, reads safer). **Owner After:** a placement for Nathan; `Core/Bundles/` is the likely home, with `Core/Trash/spend.ts` left holding `emptyBundle`, which ends the two meanings of "spend" one import apart (`spend.ts:22`, `spendBundle` at `bundle.ts:370`). **Delta:** about −50 under resolve-on-restore; under reach-in it is where L-10's removals land. **Depends:** sized by reach-in. (Scout 2)
- **M-4 · Space and Context Records From the Tree:** `gatherSpaceRecord` takes `id`, `icon`, and `contextId` from the `SpaceNode` and the group from `contextWorldOf`, dropping `readRegistryStrict` at `delete.ts:164`, the sidecar re-read, and the title lookup; `gatherContextEvidence`, `buildContextRecord`, and `ContextEvidence` fold into one function that also writes L-3's `place`. `spaceIdsIn`'s disk scan (`gather.ts:115`) stays until it's confirmed that an unusable Space sidecar reaches `tree.unreadable`, which `unresolved` depends on (unverified). **Delta:** about −20. **Depends:** none. (Scout 1)
- **M-5 · One Record-Links Helper Pair:** `appendLinks` (`trashedCopies.ts:18-21`), its inline twin with a cast (`finishOwed.ts:404-407`), and `spendBundle`'s inverse filter (`bundle.ts:374-381`) become an append and a remove beside `patchRecord` in `record.ts`. **Delta:** about −8. **Depends:** none. (Scouts 2, 3, 6)
- **M-6 · One Container Note, `park` Retired, the Set Move Its Own Kind:** the delete's (`delete.ts:211-217`) and the empty's (`spend.ts:95-104`) container notes share one builder. With L-1, every content delete's entry carries `bundle`, so an entry with a `strip` and no `bundle` is always an empty, and `park` says nothing the missing `bundle` doesn't; the finish parks whenever it has no bundle (`finishOwed.ts:403-409`). The Set move becomes its own entry kind `{ at, edit, within }`, so `finishContainer` loses both `within` tests (`finishOwed.ts:385,387`). **Owner After:** `Core/Nexus/owed.ts`. **Delta:** about −15. **Depends:** none. (Scouts 1, 6)
- **M-7 · The Empty's Gone-for-Good Step:** with L-1, the system delete's copy of the sequence leaves, and `emptyBundle` is its one home: `collectionArchive`, `pageIdsOf` over pages plus Archive files, the strip over `distinct(pages, archive.origins)`, `goneContainers(archive.sets)`, disposal, `dropPageMetadata`, and L-3's remaining order drop. Ordering it Archive first fixes B-5. **Owner After:** `Core/Trash/`. **Delta:** removal counted under L-1; ±0 here. **Depends:** none. (Scouts 1, 2, 6)
- **M-8 · The Two `leave`s:** with L-1, `deleteOp`'s `leave` (`delete.ts:131-139`) and the finish's (`finishOwed.ts:259-268`) are both "relocate the folder into its bundle", the finish's adding `oweWalk`; one step serves both. `discardFile` becomes the flat discard alone, and `dispose` the empty's disposer alone, so they no longer overlap. **Delta:** about −6. **Depends:** none. (Scouts 1, 2, 6)
- **M-9 · One Trash Value-Holder Listing:** one listing of every page, Collection sidecar, and Space sidecar the Trash holds replaces `finishProperty`'s, `trashedHolders`', and `originPagesIn`'s walks, and fixes B-3. **Delta:** about −20. **Depends:** resolve-on-restore only; under reach-in the index is that listing and the three leave (L-10). (Scouts 3, 6)
- **M-10 · One Current-Trail Resolver, One Carry:** `archiveFiling`'s deepest-live-ancestor rule lifted into `record.ts` as `currentTrail` replaces the three trail formulas; `refileLanded`, `refileFiled`, and `refileArchived` merge into one carry taking `to` from the record; `refileMoved` keeps its delta walk. Fixes B-6's cause. **Owner After:** `refile.ts` for the carry, `record.ts` for the resolver. **Delta:** about −40 (inferred). **Depends:** none. (Scout 4)
- **M-11 · One Owned-Archives Iterator and One Archived-Set Walk:** `settleArchives`, `owedEdit`, and `placement.ts:206` share one iterator; `archivedSetIds` and `archivedSets` share one walk and one scope read. **Delta:** about −15. **Depends:** none. (Scouts 3, 4, 6)
- **M-12 · One Gone-Link Partition and One Link World:** `restoreProperty.ts:72-83` and `assignment.ts:63-72` share one partition with `refillOf` as the single checker; `frozenWorld(linkWorld(tree, archived))` becomes one function beside `linkWorld`; `Frozen` reduces to the link world itself. Fixes B-7. **Delta:** about −15. **Depends:** none. (Scouts 2, 3, 6)
- **M-13 · One Undo Shape:** every reversible bundle reply carries `undo`, the host setting the Archive destination where `fromArchive` ran and resolving an Archive restore's re-archive by the record's id at send time. `ARCHIVE_UNDO`, `Undone`, `undoneOf`, `rearchive`, `rulesOf.restoreUndo` and `.deleteUndo`, `offerDeleted`'s and `offerUndo`'s destination parameters, and `MutateOutcome.bundled` go; L-6 and L-9 follow. `MutateOutcome.undo`'s own doc already describes this design (`Core/Nexus/mutateRequest.ts:26`). **Delta:** about −30 net (inferred). **Depends:** none. (Scouts 1, 5)
- **M-14 · One Notice Owner for Bundle Ops:** bundle-op callers own the whole notice through one builder, and single-row actions run as a batch of one; a single row's refusal keeps the host's message, which `mutate`'s `null` hides today (`nexusSlice.ts:259-265`). Fixes B-4. **Delta:** about −30. **Depends:** none. The one-line alternative fixes B-4 and keeps two owners. (Scout 5)
- **M-15 · `BundleTable` Owns the Heading, the Footing, and the Date Column:** `useDateColumn` and `widestDate` move from the hook into the table, keyed `` `${kind}ColumnStyle` `` (dropping `DateKey` and `rulesOf.dateKey`); both skins' headings, `footing()`s, `archive-view.css`, `trash-frame.css:30-61`, and the class names in `DRAG_SURFACES` go. **Delta:** about −60 (inferred). **Depends:** none; each skin keeps its look (Decision 17), so only code that draws the same thing in both moves. (Scout 5)
- **M-16 · One Store-of-Path Rule:** `storedAt(rel)`, answering store, bundle, and origin for a path inside a stamped bundle, replaces `archiveSegs`, `archivedCollectionIdOf`, `isArchived`, `outsideArchive`, and `bundleAddressOf`'s store derivation, and feeds `outsideContent`, the walk's roots, and the display filters. Fixes B-8's stray file and two exclusion readings, and states Decision 11 as a rule: nothing outside a bundle is content. **Delta:** about −15 alone; it is also the seam a reach-in Trash needs. **Depends:** none. (Scout 3)

##### Relocations (Each Placement Goes to Nathan)

- **P-1 · `repairLanded` and `artifactFiles`** from `Core/Trash/restoreScrub.ts` beside `returningCascade`, ending `Core/Nexus`'s import from `Core/Trash` for a step both stores run (`settle.ts:46,338`). (Scout 2)
- **P-2 · `frozenWorld` (or its replacement)** beside `linkWorld` in `heldPages.ts` (M-12); `trashedCopies.ts` then holds parking alone, or leaves under reach-in. (Scouts 2, 3)
- **P-3 · `collectionArchive`:** with L-1 its only caller is the empty (`spend.ts:90`), so it moves into the empty's gone-for-good step (M-7) out of `Core/Archive/archive.ts`. (Scouts 1, 2, 4)
- **P-4 · The Store Notion in One Home:** `ArchiveStore`, `archiveStoreOf`, and `archiveDirRel` beside `BundleStore`, `Paths` keeping only what the walker needs without `Bundles`; `placement.ts:242` narrows to `ArchiveStore`. M-16 decides the split. (Scouts 3, 4)
- **P-5 · The Journal's Strip Release:** `spendBundle`'s container-entry edit (`bundle.ts:382-392`) moves into `owed.ts` beside `restoreNote`. (Scout 6)
- **P-6 · The Trash Frame and Its Channel:** `TrashFrame.tsx` and `trash-frame.css` beside `ArchiveView`; `Trash/handlers.ts`, one channel answering one fact after L-1, folds into `Bundles/handlers.ts`, and its name can say what it answers. The confirmations read `permanentDelete` live through it while `waived` reads `confirmDeletion` from the renderer's cache (`confirmations.ts:41-43`), two readings of one freshness concern the plan states as one rule. Touches I-040. (Scout 5)
- **P-7 · `heldPages.ts` Split** into the live id service and the stored projection, only if a reach-in Trash grows the projection. (Scouts 3, 6)
- **P-8 · `archivePlace.ts`'s Name:** it holds a title and an icon; the separate file is justified (`Nexus/treeIndex.ts` imports the icon without React), its name isn't. (Scout 4)
- **P-9 · Test Homes:** delete-record tests in the restore suite (`spend.test.ts:123-700`), a delete test in the archive suite (`archive.test.ts:227`), `trashFileFlat`'s tests in `Files/atomicWrite.test.ts:326-361`, the container arm's tests outside `finishOwed.test.ts`, and the browser's shared behavior pinned through the Trash skin (`TrashFrame.test.tsx:225-498`). A shared on-disk bundle fixture in `Core/Testing/` would serve the three skin harnesses and the hand-rolled bundle finders (`spend.test.ts:57-79`, `trashRecovery.test.ts:39-70`, `restoreProperty.test.ts:80`, `archive.test.ts:71,799`). (Scouts 1, 2, 5, 6)

##### What Stays

`liftSetAside` (excluded folders stay live under any model); `archiveStoreOf`'s name guard (sidecar ids are unvalidated, `refile.test.ts:132`); `chainDir`'s escape test; the orphan sweep; `archiveOwned`'s unreadable-sidecar arm; `refile`'s `if (!into) return`; the Archive's layout (Decision 10); the stamped wrapper (*§The Store Shape*); the flat discard (Decision 11); the Link record and Restore Links On Deletion (Decisions 2 and 3); the empty-versus-move asymmetry in the browser; `unrestored` and `landedAs`.

---

#### The Trash's Model

The Archive is reach-in: its pages are indexed, every cascade rewrites them, and a restore is a move. The Trash is resolve-on-restore except for three paths that already rewrite trashed copies (*§What's True · The Trash's Partial Reach Today*). Decision 24 moves the Trash onto reach-in on the measurement's result (Decision 4); this section is the code side that move carries.

##### What Reach-In Means Here

A reach-in Trash isn't a copy of the Archive's. Archived pages are both addressable and resolvable; trashed pages must be addressable and not resolvable. They join `byId`, so strips, refills, and re-tags write them and `findHolders` captures them by id; they stay out of `archived`, `linkWorld`, and `deleteCascade`'s `after`, so a Link naming a trashed page reads gone, the delete still strips it (Decision 2), and parking keeps its purpose. Both halves exist today (*§What's True · The Discriminating Constraint*). Under Decision 11, only bundle contents are ever read: the walk, the index, and every reach admit a path only inside a stamped bundle.

##### The Code-Side Ledger

| Area | Leaves | Stays | Must Be Added |
|---|---|---|---|
| **Delete & Record** | `targets` and its gatherers (`gather.ts:24-58`, `delete.ts:111,116`, `bundle.ts:270`, `record.ts:39-40,60,76,95`); one of the content delete's two `nexusPages` calls (`gather.ts:42`) | `links`, `place`, membership, `partial` for Space, Context, and property; write-ahead; `outside()` (`delete.ts:126-129`) | The strip reaches trashed linkers and records their values in the new bundle's `links` by page id |
| **Restore** | The scrub's key, option, `<Title>`, and Space-word moves, unless kept for a destination's schema (*§Approaches Worth Weighing*, 2); `frozenWorld`'s `targets`; `repair`; `refillTrashed`, `trashedHolders`, and the trashed split (`spend.ts:273-287`); the scrub's parking, `worked`, and `unread` (`spend.ts:171,232-235,289,291`); the Contexts lock for pages, Sets, and Collections (`mutate.ts:151-153`) | Placement and step-aside; the registry entry with rollback; `owedName`; `restoreNote`; membership `reapply` (now through `byId`); the Link refill with `own`; `rekey`; `recordedPartly`; `refileLanded` | Nothing beyond the reach itself |
| **Empty** | `originPagesIn`'s walk (`bundle.ts:416-426`) | `parkLinks`' purpose, a value naming a page still in the Trash (`spend.ts:112`, `finishOwed.ts:408`, `assignment.ts:74`, `spend.ts:131`); the gone-for-good step | `parkLinks` resolving over an indexed Trash world: real page ids at origin paths, the bundle from `storedAt` |
| **Property** | `finishProperty`'s Trash arm (`finishOwed.ts:164-186`); `refillStash`'s splice (`assignment.ts:48-61`) | The property record | Trashed Collection sidecars join `collectionFolders` for the assignment purge (`governedSweep.ts:45-49`); the delete records trashed holders' values by id |
| **Paths & Index** | `archiveSegs`, `archivedCollectionIdOf`, `isArchived`, `outsideArchive` (into M-16) | `Desktop/Store` and `contentIndex.ts` unchanged: a live → Trash move becomes a path rename once both ends are admitted (`indexSeed.ts:177-179`), and the empty's `noteOwn` unlink de-indexes (`spend.ts:74`); `linkWorld` as tree plus Archive | `storedAt`; `contentRoots` gaining `.trash` (`walk.ts:43`) with a directory rule admitting chain folders and the bundle folder itself; `nexusPages` reading the Trash prefix into `byId` under a claim rule (condition 3), with a `trashed` page list beside `archived` |
| **Holders & Reach** | — | `findHolders`' reading and addressing | Trashed Spaces and Contexts as `{ kind: 'space', path }` roots in `byId`, and a stored-Space source for `findHolders`, `deleteCascade`, and `renameCascade` (`keyHolders.ts:69-75,94-102`; `cascade.ts:128,263`), a bounded walk of `.trash/.nexus/contexts`; the Trash in `pagesInReach`'s `governed` reach (`keyHolders.ts:52-58`); a `{ collection }` reach for the Trash from each bundle's record, since its chains spell folder names (`unassignProperty.ts:71-73` is the one caller) |
| **Display** | Hand-placed Archive hiding (into M-16) | Store-blind display: tree, link suggestions (`pageConnections.ts:30`), matrix, headings, `pages:changed`, counts, clash refusal | Every display filter reading `storedAt(path) === null` |
| **Watcher & Sync** | — | Sync code unchanged (Decision 1): the tap already drops watched `.trash` events (`tap.ts:50`), and sync keeps learning the Trash through the write tap | Optionally, a watcher exemption for `.trash` in `syncIgnoredUnder` rather than `neverWatched`, which also feeds `manifestAdmits`, `adoptFile.ts:24`, and `assetMap.ts:14`; without it, outside changes to the Trash re-index at the next seed. With it, `tap.ts:50` becomes load-bearing and needs its reason where a reader meets it |
| **Views** | — | A trashed Collection's views, preserved and kept current (Decision 28) | Either the config pass reaches trashed Sets' and Collections' sidecars as it reaches archived Sets' (`configReach.ts:297-304,339-347`), an O(Trash folders) walk per pass, or a restore reconciles a returning container's views; today `finishProperty` purges trashed Collections' assignments but never their views (`deleteProperty.ts:139-140`) |

##### Correctness Conditions

1. **The Sweep Set Apart From the Link World:** every trashed page and Space is addressable through `byId`, and none appears in `archived`, `linkWorld`, or `after`; a test deletes a page, trashes a linker, and asserts the strip reaches the trashed linker and records its value.
2. **The Delete Strip Skips Its Own Bundle:** `finishContainer` calls `deleteCascade(root, join(root, e.at), e.strip)` with the live `e.at` (`finishOwed.ts:402`), and `deleteCascade` excludes by that live path (`cascade.ts:100,129`), but by then the artifact has moved and its index rows renamed under `.trash` (`delete.ts:131-139`, `indexSeed.ts:177-179`). The exclusion must also drop every path whose `storedAt(rel).bundle` is `e.bundle`, or a Set's internal links are stripped and recorded as its own `links` (`deleteReach.test.ts:315,346` pin the live form). The same holds for every sweep that runs after a move: the configuration pass already skips a Set the edit names gone (`configReach.ts:342-343`).
3. **Ids Shared Between a Live Page and a Trashed Copy, or Between Two Trashed Copies:** `claim` nulls any id two files carry (`heldPages.ts:18-20`), and `heldElsewhere` reads a null as live (`placement.ts:38-40`). A live page sharing an id with a trashed copy (pinned at `spend.test.ts:1973`) must stay addressable, so a trashed claim never contests the tree's or the Archive's, and the id-live refusal reads only the tree and the Archive, or a trashed page's own row would refuse its restore. Two trashed copies of one id are unreachable in practice and get no rule of their own (Decision 27).
4. **Bundles Minted Before Any Change:** a trashed copy minted under resolve-on-restore missed every cascade since its delete; its `targets` stop being read once they leave, and those bundles get no handling of their own (Decisions 12, 29). Records in I-069's range decode again once `targets` leaves the schema, since `z.object` strips the unknown key.
5. **Flat-Trashed Tile Texts and Leftovers (Decision 11):** admission requires a stamped segment wearing `.deleted` with a path below it (`stampedSegment`, `layout.ts:36-37`), so `<stamp>__<name>.md` flat leaves, record-less folders, and retired provenance entries never enter the walk, the index, or a reach. Whether admission also requires a decodable record is open: without it, a stamped bundle whose `_record.json` won't decode has its pages indexed and swept while the Trash lists nothing for it; with it, the seed pays one read per bundle (`listPathsUnder`'s `siblings` carries a folder's siblings, not its children, `walk.ts:62-67`).
6. **Leftover Bundles:** an empty bundle (B-1) or a record-only bundle (L-5) holds no artifact, so it adds nothing to the index; neither needs a rule.
7. **Display Stays Blind:** `CascadeReport.pages`, `sweepCount`, the matrix, headings, link suggestions, and the clash refusal show nothing from the Trash.
8. **The Restore Lock:** pages, Sets, and Collections leave the Contexts lock only once nothing in their restore rewrites a `<Title>` key or Space word against `tree.contexts`.
9. **Bytes on Restore:** the scrub's reconcile re-encodes values against the destination's schema (for example, a Collection's `Tags` read back as the definition writes them); removing it changes what a restore writes, consistent with the Archive's restore and live moves, which don't reconcile.
10. **Other Walkers of the Content Roots:** Clear Exclusion Cache and the legacy asset migration walk `contentRoots` (`assetMigrate.ts:117,135`), so adding the Trash extends both into trashed content; file-history retention stays the Archive's alone (`fileHistory.ts:195-210`).

##### Costs Per Operation and Per Open

| Operation | Today | Under Reach-In |
|---|---|---|
| Content delete | `nexusPages` twice (`gather.ts:42`, `cascade.ts:107`); each an index range scan, or a walk and read of every archived file before the index is ready (`heldPages.ts:94-103`) | Once, plus O(trashed pages) rows; the strip also writes trashed linkers |
| Space or Context delete | `nexusPages` three times, a strict registry read | Twice, plus O(trashed pages) rows; the registry read leaves with M-4 regardless |
| Trash restore | `parkLinks`' walk of every bundle and every container's pages (`trashedCopies.ts:38`, `bundle.ts:417-426`); `trashedHolders`' read and parse of every trashed container page when a stripped holder is trashed (`trashedCopies.ts:65-67`); `currentKeys`' maps over the registry, every option, and every Space (`restoreScrub.ts:60-73`); the Contexts lock and its owed walk | An index read inside the one `nexusPages` call; no scrub; no lock for pages, Sets, or Collections |
| Property restore | `parkLinks`' walk | An index read |
| Empty one bundle holding links | `parkLinks` twice (`spend.ts:112`, then `finishOwed.ts:408`) | Index reads |
| Empty N bundles | One request per row (`browser.ts:430-437`), so O(N · Trash) walks (I-033) | O(N) index reads |
| Re-assign with unplaced stash ids | `trashedHolders`' walk (`assignment.ts:51`) | `byId` |
| A property gone for good | `listBundles` and `contentPages` of every bundle (`finishOwed.ts:167-183`) | Nothing; its holders were stripped at the delete |
| Every rename, strip, option, or property cascade | No Trash writes | Writes to trashed holders, proportional to holders rather than Trash size |
| Matrix and headings fetch | Every archived row read and discarded (`matrixGraph.ts:20-26`, `handlers.ts:170-171`) | Every archived and trashed row read and discarded, unless the store prefixes become excluded ranges in the query (`Desktop/Store/stores.ts:17`) |
| Configuration pass | The Archive's Set sidecars walked (`configReach.ts:339`) | Plus O(Trash folders) if trashed views are kept current |
| Each open | The seed stats every archived page (`indexSeed.ts:216-227`); `settleArchives` reads every live Archive's records (`refile.ts:127-143`) | Plus a stat per trashed page and a directory read per Trash folder |
| Trash browser | `listBundles` | Unchanged |

`parkLinks` and `refillTrashed` return early with no links (`trashedCopies.ts:37,89`), so today's walks hit only operations that carry links. The heading cascade is keyed by the index (`cascade.ts:242`) and doesn't grow with stored size; the matrix push is the one on-every-X reader that grows linearly with stored rows, today with the Archive and under reach-in with both stores.

##### The Measurement

*Trash & Archive Restructure — Reach-In Measurement* holds the first run, made on today's write path at `15fe7422a`; its harness sits in `.claude/Benchmarks/Reach-In/`.

- **Cost:** no crossover. With an empty Trash the two models are within noise. At a Trash of 10% of the live pages the reach-in prototype runs the whole operation sequence about 10% slower, and at 50% about 41-60% slower (Small, Medium, Large), because every cascade rewrites trashed holders at the same per-file cost as live ones. A Set's restore is about 41% faster without the scrub. Today's only Trash-scaling cost is a page restore's walk of every trashed page, about 0.38 ms per trashed page.
- **Correctness:** today's restore doesn't return a current page. A page that sat in the Trash through a property rename, an option rename, a Space rename, and a Context rename came back holding all four old names in every cell, since `matchOf` re-spells only format and casing variants of current names (`restoreScrub.ts:46-58`), and a rename leaves no spelling to match. The prototype's restored page read current in every cell, its deletes still stripped the Link values naming what they trashed, and trashed pages never entered `linkWorld`.
- **Tests the prototype broke worth routing:** `archive.test.ts`'s "a trashed page's link to an archived page follows it to where it lands on restore", which `targets` carries today and nothing in the prototype replaced, and `spend.test.ts`'s "a live property holding the key keeps it", where a later property reusing a deleted property's key no longer inherits trashed copies' values.
- **The multiplier:** reach-in's extra cost is the per-file write cost times the trashed holders a cascade reaches, which the Write Path plan cut from about 7 ms to about 2 ms a file.
- **The re-run (10-29-2026, at `9b9c0d630`, after the Write Path plan):** the cells the decision rests on, Medium-10 and Medium-50 at three runs per build and Large-50 at two (`results/<cell>.jsonl`; the first run's files carry `-15fe7422a`). Every run passed; the whole operation sequence's median, opens aside:

  | Cell | Baseline | Reach-In | Change |
  |---|---|---|---|
  | Medium-10 | 50.9 s | 55.8 s | +10% |
  | Medium-50 | 51.4 s | 73.6 s | +43% |
  | Large-50 | 137.6 s | 195.9 s | +42% |

  The cost tracks the trashed holders a cascade reaches, linearly: at Medium-10 a property rename is 14.7 s against 16.3 s (+11%), at Medium-50 14.8 s against 22.3 s (+51%), and at Large-50 42.1 s against 62.3 s (+48%), each trashed holder costing what a live one does. A cold open indexes the trashed pages too (+8% at Medium-10, +51% at Medium-50, +47% at Large-50); a warm open costs +1-10%. A page restore is 10-38% faster and a Set's 14-23% faster, the scrub gone; emptying one bundle stays under a seventh of a second. With the Write Path plan, reach-in's heaviest Medium cell (a property rename over a Trash half the size of the live Nexus, 22.3 s) runs well under the first run's baseline for the same rename on an empty Trash (48.4 s).
- **Correctness, re-run:** unchanged in every cell. The baseline's trashed pages keep every old name, the deleted property's values, and links to the page a delete removed (54, 244, and 631 by cell), and its restored page returns holding the old names; reach-in rewrites trashed pages exactly as live ones (the new-name counts match the old ones) and returns a current page. Live links to the restored page agree between builds.
- **Where a property rename's time goes (10-29-2026, at `31702baa5`, Medium-0, three runs per pass):** the baseline's rename of a property 7,027 pages hold settled in 18.7 s with Pommora's own development instance running beside it (the matrix's 14.7 s ran on an idle machine), every file flushed once. The flushes, timed on `FileHandle.prototype.sync`, were in flight for 12.5 s of it (67%), about 60 ms each with some 34 at once, so the drive took a full cache flush every 1.8 ms. With each flush answering at once the rename took 6.0 s (−68%); with the watcher also off, 4.0 s (−79%), the main thread's parse, compose, and index work. The watcher alone saved nothing while the flushes ran, since its listings and its read-back of every own write (`dropOwnEchoes`'s `readBytes`) overlap the flush wait. Per file the rename made two text reads (the clash check's and the rewrite's), a stat, a landing, and the watcher's byte read; a trashed holder skips the watcher's but costs the same 2.1 ms, since the flush sets the pace. In a standalone test of 2,000 files landed in groups of 64, a flush per file took 2.3 s, temps opened `O_DSYNC` (each write returning once its data reached the drive, about 9 µs more than a plain write) with one flush per group 0.46 s, and no flush 0.28 s.
- **A third prototype gap:** with trashed pages in `byId`, a restore's refill sends a trashed holder through `refillValues` rather than `refillTrashed`, so a refill whose write fails reports the holder unrestored where the baseline owes it with Try Again (`trashRecovery.test.ts`'s "a trashed copy the restore's refill couldn't write owes its value"); the same at `15fe7422a`.

---

#### The Store Shape

##### Two Stores, One Owner

Two stores stay, with `Core/Bundles` their one owner. Merging them would make a delete from the Archive an in-place suffix flip, removing `fromArchive`'s origin computation, the record's `archive` field, `placeRecord`'s archive arm, and the restore's `into` branches. It doesn't win: the Trash holds kinds no Collection partition can (Contexts, Spaces, Collections, and artifact-less property records, `record.ts:79-97`), so a merged store needs a second area and two layouts inside one store; deleting from the Archive is recoverable while deleting from the Trash is final; the Archive lists per Collection or top Set and the Trash in one frame; and `.trash` at the root is a legible convention sync names explicitly (`exclusion.ts:48`). M-13 removes the `archive` field and the renderer-side destination without merging. (Scout 4)

##### The Collection-ID Folder and the Collection's Own Folder (Decision 10)

The Archive keeps its layout. The ID folder buys the synchronous owner from a path, the one-folder listing and discard, and origin paths from paths alone (*§What's True · What the ID Folder Buys*); a flat Archive with owners in records would trade those for record reads on hot paths and a migration, removing the carry's moves and gaining nothing net. The Collection's own folder beneath the ID folder is what makes `originPathOf` pure and an archived page's origin the path links written before it left still name (`heldPages.ts:81`, `cascade.ts:107-111`); dropping it would have added a name lookup at the 11 Archive-capable `originPathOf` sites, made origins follow a Collection rename, forced a carry to re-spell chains, cost `frozenCrumbs` its Collection crumb (`rows.ts:47-53`), and needed a migration, while removing nothing, since every cost Scout 4 lists comes from the ID level. Those findings leave the ledger. One stale sentence remains true to fix: `bundle.ts:50` says a store "reads as a shadow of the nexus, so a stored item shows where it lived", which a carried bundle, filed under a Collection it never lived in, contradicts (`refile.test.ts:124`). (Scout 4)

##### The Stamped Bundle Folder

The wrapper stays, in both stores. It is the record's home beside the artifact (`record.ts:14-15`), the archived or deleted time (`layout.ts:25-30`), the uniqueness of two same-named items from one place (`bundle.ts:74-78`), the address detector (`layout.ts:36-56`), the write-ahead evidence (`bundle.ts:109-116`), and Undo's exact-name reuse (`bundle.ts:72-73`). The Trash can't drop it, since a property bundle is a record alone (`listBundles`, `bundle.ts:165`), and dropping it in the Archive alone would fork `layout.ts` and `bundle.ts` by store. Under Decision 11 it is also the boundary of what a reach-in Trash reads. (Scout 4)

---

#### Approaches Worth Weighing

##### 1. The Trash's Model

- **Resolve-on-Restore, Consolidated:** M-9, M-12, M-3, and B-2's routing make the compensators one listing, one partition, and one restore. Smaller, but the scrub, `targets`, parking walks, and B-3's class of half-reach stay as permanent drift repair, with O(Trash) walks per operation.
- **Reach-In:** *§The Trash's Model* in full; removes L-10 and the walks, adds the reach, the claim rule, and the own-bundle exclusion, and moves cost into cascades and the open.
- **Partial Reach:** trashed copies join `byId` from `listBundles` once per `nexusPages` call, fixing B-2 and the owed-versus-named divergence without the index. It puts an O(Trash) walk in every `nexusPages` call, and is the wrong trade if reach-in lands. (Scout 3)

##### 2. The Scrub Under Reach-In

- **Keep the Destination Reconcile Only:** a restore into a different destination meets a schema the copy never lived under, which has independent justification; the Archive's restore to a destination doesn't reconcile (`archive.ts:89-110`), so keeping it in one restore is a divergence the plan states or closes.
- **Remove It Whole:** the restore becomes the Archive's move; bundles minted before the change come back as they were frozen, and values return as the file spelled them.

##### 3. The Twin Rule

Trashed claims rank below the tree's and the Archive's, with the id-live refusal reading the tree and the Archive alone, and two trashed copies of one id get no rule (Decision 27); or placement looks past holders inside other Trash bundles while `claim` stays as it is. The first keeps one rule in one place.

##### 4. One Restore or Two Sharing a Spine

One restore with record-driven arms (M-3), or two functions over a shared `restoreSpine` with callbacks. Every difference is already record-selected, so the helper adds indirection without removing a branch. (Scout 2)

##### 5. Gather Before Mint, or Mint First With Cleanup

M-1's primitive cleans up either way; gathering first also makes the guards refuse before anything exists, and keeps write-ahead, since the record still precedes the note. (Scout 1)

##### 6. The Undo's Shape

One reply-carried `undo` for every bundle op (M-13), or drop only the dead `undoTo` and keep two shapes. (Scout 5)

##### 7. The Notice's Owner

One builder for bundle-op notices (M-14), or `confirmArchive` carrying `done.cascade` (+3 lines), which fixes B-4 and keeps two owners. (Scout 5)

##### 8. The Archive's Open Pass

Keep `settleArchives`' every-record sweep, or drive it from the Baseline ledger's previous container paths so only Sets that moved while the app was closed are carried; the baseline isn't a `NexusTree`, so the diff needs a small parent comparison over its rows. Worth measuring with the prototype's matrix. (Scout 4)

##### 9. A Trashed Context's Own Space Order

In `state.json` while bundled, as today, or in the record, written back at the restore (L-3). The record keeps the bundle self-contained and retires `dropContextOrder`; `state.json` keeps one less record field and one less restore write.

##### 10. `TrashDeps` After Decision 14

Remove `deps` from the Trash's signatures, the empty reading the Platform seam directly, or keep `TrashDeps` as `{ trashToSystem }` (L-2).

---

#### What Becomes False

##### Code Comments

- **Already False:** `bundle.ts:50` (stores as a shadow, *§The Store Shape*); `bundle.ts:221`'s refusal "Only a trash or archive record can be spent.", which `listInner` also returns where nothing is spent; `configReach.ts:247` (`goneContainers` "read from the tree, or from an archived Set's sidecars", while it only wraps ids); `governedRoot.ts:60` (`Frozen` "a frozen copy", used live at `cascade.ts:113-114`); `heldPages.ts:1` ("for every refill", which the Trash's bypass); `restoreScrub.ts:1` ("its own links are repaired once it has", which `repairLanded` does for both stores); `spend.ts:294`; `finishOwed.ts:1` (the settle's turn also runs relink entries, `finishOwed.ts:93`); `UIX/Table/table.css:12` (names Core surfaces).
- **By L-1:** `discard.ts:35` and `trashMode.ts:1`; `finishOwed.ts:258` ("or where Trash Mode sends it"); `confirmations.ts:88`; `bridge.ts:202`.
- **By L-3:** `reorder.ts:77` ("A Context keeps its panel id while bundled"); `reorder.ts:53` (`dropContextOrder`'s "gone for good" now covers less, or leaves).
- **By L-4 and L-1:** `bundle.ts:256` ("and its partial mark").
- **By M-3:** `mutate.ts:140` (the lock's reason moves to the entity); `archive.ts:88`.
- **By Reach-In:** `exclusion.ts:68` and `walk.ts:42` ("the one hidden folder read as content"); `archive.ts:1` (the Archive as the store every cascade reaches); `heldPages.ts:2` (the resolution split restated); `record.ts:39` (`linkTargets`); `trashedCopies.ts:1`; `governedSweep.ts:102,115` ("a trashed copy joins the live tree's records", which becomes the rule); `cascade.ts:93` (`deleteCascade`'s "archived ones among them" gains the Trash).

##### Tests

- **Residue Pins That Go:** `deleteOrder.test.ts:168,174,215` and `deleteReach.test.ts:800-806` (content `partial`); `spend.test.ts:313-321` (pre-`at` decode); `spend.test.ts:684-698` (provenance); `spend.test.ts:796-825`'s record assertions (L-5); `confirmations.test.ts:275-283` (`undoTo`); the system-mode cases (L-1); `spend.test.ts:298-349` (L-3).
- **Implementation Pins That Break Without Behavior Changing:** `deleteOrder.test.ts:43-95` (four `vi.mock`s of named collaborators; write-ahead needs a seam at `relocate` alone); `bundle.test.ts:345-372` (record and note patches; `trashRecovery.test.ts:928-951` pins the behavior); `trashRecovery.test.ts:899-900,985,993,1021-1024` and `spend.test.ts:1804` (journal shape); `browser.test.ts:58-79` (`widestDate`'s sample) and `:300-375` (`rearchive`, host-side under M-13); `TrashFrame.test.tsx:196-199,226` (M-15's class names); `layout.test.ts:10`.
- **Duplicated Cases:** `deleteOrder.test.ts:149` and `:159`; `trashRecovery.test.ts:398` with `spend.test.ts:1705,1723`; `trashRecovery.test.ts:241`, `spend.test.ts:702`, and `placement.test.ts:82`; `trashRecovery.test.ts:852` and `:873`; `refile.test.ts:132` and `:151`; `archive.test.ts:352,368,388,400`; and the three skin harnesses' shared cases (`browser.test.ts`, `TrashFrame.test.tsx`, `ArchiveView.test.tsx`; Scout 5 §8 lists them).
- **Under Reach-In:** most of `restoreScrub.test.ts` (828 lines), `spend.test.ts:1028-1410` (link-follow through `targets`), `spend.test.ts:1004` (the trashed refill mirroring the live one), and `trashedCopies.test.ts` leave or become cascade-reaches-the-Trash cases beside `archive.test.ts:139-153`; the parking cases (`trashRecovery.test.ts:461-677`) assert outcomes and survive.
- **Gaps to Fill Whatever Lands:** B-1 through B-7 each want a case; the Archive and Trash display filters have none.

##### Feature Docs

- **Already False:** `NexusRecordPM.md:28` (the Known Issue: the folder now moves before any sweep, `delete.ts:95,140-161`, and a cut-short move finishes in `leave`); `NexusRecordPM.md:34` (Pending: moves and renames now run under relink entries, though noted after the move rather than written ahead, `cascade.ts:323-337`), which wants rewriting; `NexusRecordPM.md:10` ("every record carries the page each outbound link … named", untrue of property and Archive records); `NexusRecordPM.md:16` ("taking a Context's kept Space order with it" omits the panel id); `CorePM.md:14,36` (bundles named `<stamp>__<Page>.archived`/`.deleted`, where a page's is `<stamp>__<Page>.md.…`, with a `<stamp>__<n>__` collision form); `ConfigurationPM.md:115` and `frames.ts:642` (I-079).
- **By L-1:** the doc lines L-1 lists, and `PommoraPRD.md:103`'s "recoverable in-Nexus trash" becomes the whole truth.
- **By L-3:** `NexusRecordPM.md:10,14,16`'s Context position and Space order sentences.
- **By L-5:** `NexusRecordPM.md:14`'s "the record is removed once every page still present has its tag back".
- **By Reach-In:** `NexusRecordPM.md:14`'s reconcile passage ("An artifact returning from the Trash is reconciled …", the repair, and the trashed-copy refill) and `:10`'s `targets` sentence; `PommoraPRD.md:101` ("on every write but a Trash restore, which rewrites a key a property's label spells"); `CorePM.md:98` (its near-verbatim twin); `ConnectionsPM.md:30` and `CollectionsPM.md:49` where they describe frozen copies. The link strip on delete is stated seven times (`NexusRecordPM.md:12,14`, `CorePM.md:92`, `ConnectionsPM.md:30`, `CollectionsPM.md:49`, `InterfacePM.md:80`, `ConfigurationPM.md:118`), worded two ways ("unless a page outside it still holds that title" against "where its name resolves to nothing afterwards"); the code's rule is the second (`cascade.ts:108-111`), and `ConnectionsPM.md` is the natural single owner. (Scout 6)

##### Issues

- **I-033:** true; under reach-in the scrub-time walk dissolves and the empty's parking becomes index reads, so the batching fix shrinks to sending one request.
- **I-064:** true; under reach-in a Finder drag-out needs no own-link repair, so the question narrows to the refill.
- **I-065:** closes as intended (Decision 16).
- **I-069:** true; it dissolves under reach-in (L-4); under resolve-on-restore it closes as deferred, with Decision 12 confirming no decode is added.
- **I-077:** closes as intended (Decision 15); the reason belongs where a reader meets the behavior.
- **I-079 and I-080:** true and independent.
- **I-040:** P-6 touches it.

---

#### Order Constraints

1. **The Measurement Before the Model:** nothing in L-10 or *§The Trash's Model* lands before Decision 4's measurement; everything marked *none* can.
2. **Decision 14 First:** L-1 lands before M-2, M-6, M-7, and M-8, so each is written once without system branches; L-2 follows L-1.
3. **Decisions 12 and 13 Together:** L-3 and L-4 touch the same Context field and the same record schema, and land with M-4, which rewrites the same gather function.
4. **The Mint Primitive Before the Arms:** M-1 before M-2, since the tail assumes gather-before-mint.
5. **The Store-of-Path Rule Before Any Reach:** M-16 before reach-in work and before P-4.
6. **Reach and Removal in One Phase:** under reach-in, the Trash's admission, `byId` claims, the claim rule, and the own-bundle exclusion land in the same phase as L-10's removals, the reach first; removal-first would otherwise leave trashed copies neither reached nor repaired between commits. That's the one inversion, and it carries this reason.
7. **M-12 Before or With the Model:** the shape of `Frozen` changes under both models.
8. **M-3 After the Model:** its size and its arms depend on it; M-9 only under resolve-on-restore.
9. **Behavior Pins Before Refactors:** where a refactor breaks an implementation pin (`deleteOrder.test.ts:43-95`, `bundle.test.ts:345-372`, the journal-shape pins), the behavior assertion is in place first.
10. **Placements Before Moving Commits:** every P-item and M-3's new home is approved by Nathan before the commit that moves it.
11. **Docs With Each:** each item's *§What Becomes False* lines change in the commit that makes them false.

---

#### Corrections

- **Trashed Pages and `byId` (Scout 4 §5):** "`nexusPages` must not add trashed pages to `byId`" holds for `archived` only; `byId` resolves nothing, and a reach-in Trash needs trashed pages in it, or the strip holds every trashed linker out and its entry stays owed (`cascade.ts:133-136`, `keyHolders.ts:122-126`). The real hazard in `byId` is the twin rule (*§The Trash's Model*, condition 3).
- **Decision 10's Analysis (Scout 4, *§Nathan's Ruling*):** Decision 10 now keeps the layout; the drop's findings, its migration, and its test list leave the ledger.
- **The Stamped Wrapper "Still Open With Nathan" (Scout 4):** it isn't an open item in the Decisions; *§The Store Shape* settles it as kept, which is Decision 6's to make.
- **The "Panel Id" (Scouts 1, 6):** it is the Property Panel's Context field order in `state.json`, not the sidebar's; the sidebar's order is the registry's (`readNexus.ts:248`, `reorderContexts.ts:6-14`).
- **`originPathOf`'s Call Sites (Scout 4, and Decisions Open Item 1 as it stood):** 14, of which 11 can carry an Archive store.
- **`archiveStoreOf`'s Callers (Scout 3):** seven production call sites, not 14.
- **`outsideArchive` and `isArchived` (Scout 2 §5):** four production uses each, not seven and four.
- **`frozenWorld`'s Callers (Scout 2 §3.4):** four call sites, three passing no `targets`.
- **`mutate.ts:88` (Scout 6):** the comment isn't truncated; it continues on the same line.
- **"The Archive Never Writes to the Owed-Work Journal" (Scout 6):** it writes relink entries through its re-spell and both restores' repairs (`settle.ts:301-302,338`); it has no arm in `finishOwed`.
- **The Restore Lock "Only Context and Space Restores Need" (Scouts 2, 6):** true only once the scrub's `<Title>` and Space-word rewrite leaves; today it earns the lock for every scrubbed entity (`settle.ts:249`).
- **"Reaches Into the Trash" (Scout 3 grounding, Scout 6 grounding):** three paths rewrite trashed copies (the property finish, `refillTrashed`, the stash refill); `parkLinks`, `collectionsElsewhere`, and the `park` arm read it without rewriting copies.
- **`NexusRecordPM.md:34` "Largely Done" (Scout 6):** relink entries are noted after their move (`cascade.ts:323-337`), so moves and renames are journaled, not written ahead; the line wants rewriting rather than removal.
- **`TrashDeps` Fixtures (Scout 1):** 34 test files declare the literal, not about 35 or 33; `trashToSystem` is stubbed in 31 (Scout 6 holds).
- **System Trash Mode as a Question (Scout 5 §9, Scout 6 §10):** settled by Decision 14; the mode-flip edge and the system side of `park` leave with it.
- **Flat Trash as a Question (Scout 1 §9):** settled by Decision 11.
- **Inferred, Now Confirmed by Reading:** B-1's leak, B-2 through B-7, B-8's stray file, and `tap.ts:50`'s unreachability (the watcher is the tap's only feeder, `watcher.ts:112`).
- **Still Unverified:** whether an unusable Space sidecar reaches `tree.unreadable` (M-4); whether the delete-from-Archive Undo of a Set misses a carry `refileFiled` would have made (Scout 2 §2.2); whether `43c127c2b` fell inside a plan (moot under Decision 12).
