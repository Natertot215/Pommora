### Archive — Planning Findings

**DATE:** 10-19-2026
**HEAD:** `879074d7b`. The scouts verified at `d880179b6`, `4a910cc7a`, or `c22cfe847`. The three commits since `c22cfe847` (`f1e39d98f`, `ced3662b3`, `879074d7b`) touch only `Core/MarkdownPM/Engine/intents.ts`, `Core/MarkdownPM/Tables/cellStatic.tsx`, and `Core/MarkdownPM/markdown-pm.css`; the cited lines in that stylesheet are re-read below. Every citation is `path:line` at HEAD.

This document reconciles the five planning scouts' reports (*Archive — Planning Scout Reports*) against the code, removes their duplication, and settles every Planner's Call across the five lanes. *Archive — Decisions & Intention* governs intent; this document governs where the scouts disagree with each other or with *Archive — Investigation*. The lanes are: **1** reach, index admission, the by-id map, counts, and discovery; **2** the Trash's data layer, the neutral owner, the origin record, placement, and orphans; **3** the lift, the crash-safe carry, and F-6's observation point; **4** ArchiveView, the archive place, the shared browser, the entry, the menus, and scale; **5** ActionLabel, the transform, the reader window, the archive history timeframe, settings, confirmations, and the Undo.

Two settlements reshape what the scouts wrote, and every section below follows them. The Archive's bundles mirror their origin chain, as `.trash` does, rather than sitting flat (*§Disagreements Resolved › The Archive's Layout*). The bundle vocabulary uses "origin" and "stored" in place of Scout 2's "held", which already means in-tree (*§Disagreements Resolved › Vocabulary*).

#### Nathan's Rulings (10-19-2026)

The answers to *§Questions for Nathan*, each recorded in *Archive — Decisions & Intention* where it changes a decision: **1** count every holder; **2** C-4 stays, the zero-count wording set at the copy review; **3** yes, the row asks for a destination; **4** overruled: an Archive whose Collection's sidecar is unreadable at open is kept, not swept, and only an id naming nothing anywhere is orphaned (F-5), with any retry threshold the plan's call; **5** yes; **6** keep today's re-read and record incremental exclusion-scope changes as an *IssuesPM* entry (K-1); **7** no added copy; **8** keep the whole header; **9** the title with the archive glyph; **10** one row; **11** as stated, and the reader window's title isn't renamable; **12** the empty pane, with an empty ArchiveView reading “This Collection's archive is empty.”; **13** as stated; **14** yes; **15** one search rule; **16** `filled`; **17** yes, one hold of 1500 ms; **18** Title Case; **19** no way back; **20** accept; **21** name the title; **22** accept. *§Cautionary Items* 5 is superseded by ruling 4. The approved copy, including the confirmation's detail *“Ideas” will be moved to this Collection’s archive, where it can be restored.* and single quotes around a setting named inside another setting's hint, is the decision log's *§Copy*.

---

#### Verified at HEAD

Corrections to *Archive — Investigation* (verified at `213f95a3b`), each opened at its citation. A lane number in parentheses names the scout that found it.

##### Index, Reach, and the By-ID Map

- **`readIndexedStats` Answers Before the Seed:** it reads through `queried`, which gates only on a store being present (`Core/Index/contentIndex.ts:50-58`, `:92-94`), never through `queryPaths`' readiness gate (`:60-63`); `markIndexReady` runs at the seed's end (`Core/Index/indexSeed.ts:253`). Before the seed it answers the previous session's rows, and null only when no store opened. The Investigation's `:68` and its Concern at `:336` are false. The J-1 sweep still moves after the seed, for stale archive membership rather than a null answer (1, 5).
- **Four Twin Rules Exist, Not Three:** `recordById` keeps the first record in tree order (`Core/Nexus/record.ts:48-56`); `writablePathsOf` lets none win (`Core/Nexus/heldPages.ts:8-13`); `keyedHolders` keeps the first claimant in path order (`Core/Properties/keyHolders.ts:51`, `:61-66`); `deleteCascade` lets none win but exempts withheld files (`Core/Nexus/cascade.ts:107-121`). Only `writablePathsOf` and `deleteCascade` are pinned (`Core/Nexus/heldPages.test.ts:54`, `Core/Trash/deleteReach.test.ts:125`) (1).
- **Every Frozen World Reads the Tree Alone:** `frozenWorld` answers `holds` from the index it's handed (`Core/Properties/propertyValue.ts:187-197`), and every caller hands it the tree: `Core/Properties/assignment.ts:87`, `Core/Trash/spend.ts:186` (the tree plus the returning pages), `spend.ts:290`, and `Core/Trash/restoreProperty.ts:58`, with the restore scrub reading it at `Core/Trash/restoreScrub.ts:154` and `:169`. A Link value naming an archived page reads as gone at each site, is parked, finds no Trash holder, and is dropped, which D-1 forbids. The Investigation's by-id map alone doesn't close this (1).
- **`recordById` Has Exactly Four Readers:** the three refills (`assignment.ts:81`, `spend.ts:250`, `restoreProperty.ts:57`) and `id-live` (`Core/Trash/resolve.ts:36`), so one map serving all four lets it leave.
- **The Delete Strip's Lines:** the tree filter is `cascade.ts:101-106` and the twin branch `:107-121`, with `withheldIn` imported at `:19` and the live lookups at `:32`.
- **`collectionFolders`' Sidecar Role:** the snapshot (`Core/Properties/deleteProperty.ts:44-54`), `unassignAndPurge` (`:144-153`, called at `:135`), and replay (`Core/Properties/replaySchemaCascade.ts:56-62`).
- **Enumerators the Investigation's Table Missed:** the asset migration's `sidecarsUnder` starts only at the root (`Core/Assets/assetMigrate.ts:158-165`), and `normalizeSavedViews` walks `.trash` sidecars and the tile documents only (`Core/Nexus/migrateConfig.ts:45-53`) (1).
- **Archived Paths Reach the Renderer's Asks:** `pages:changed` names every file a cascade wrote (`Core/Nexus/settle.ts:171`), and the renderer re-asks the headings and the Matrix for those paths (`Core/Session/useBridgeSubscriptions.ts:84-87`), so K-2's trims carry weight once the Archive is indexed (1).
- **`hiddenFolder` Has One More Caller:** `Core/Settings/exclusionScan.ts:42` (1).
- **`nexusFolderRefusal` Also Guards the Asset Directory:** `Core/Settings/codec.ts:55-58`. `NON_CORPUS_TOP`'s one reader is `codec.ts:51` (1).

##### The Settle and Moves

- **The Arrival Relink Re-Spells Collisions Only:** `addressed` relinks through `respellings(before, after, moved, [...moved, ...arrivals])` (`Core/Nexus/mutate.ts:103-107`; `Core/Connections/rewrite.ts:21-46`). An archived page is absent from `before`, so path links naming its origin never follow it home. The Investigation's *§What's Reusable* line "re-spells for an unarchive's arrival" is false; the Trash restore's two-map relink (`spend.ts:229-247`) is the mechanism that does it (1, 2).
- **`applyMove` Sees the App's Own Moves Only:** `relocate` is the only raiser of a `move` event (`Core/Files/atomicWrite.ts:72`). The watcher raises `add`, `change`, `unlink`, `addDir`, and `unlinkDir` (`Desktop/FileWatch/watcher.ts:126-130`), and a Finder move arrives through the `'gone'` and `'folder'` arms (`Core/Nexus/fileEvents.ts:607-613`) (3).
- **Every Exclusion Carry Already Walks:** `applySettings` patches the held scope at once and answers `'walk'` whenever the scope changed (`fileEvents.ts:502-509`; `oweRescope`, `:512-517`), after which the settle restarts the watcher (`settle.ts:177`, `:181-185`) and sync reconciles. `Core/Nexus/fileEvents.test.ts:298` and `Core/Nexus/mutate.test.ts:3252` pin it. The Investigation framed the pre-written entry as introducing a walk; the walk is already there on every carry (3).
- **`moveSetOp`'s `left` Is Any Container Left:** it's non-null for a move within one Collection as well (`Core/Nexus/move.ts:54-57`); a crossing is `diverge === 0` (3).
- **The Trash Restore Moves Through Plain `relocate`:** `spend.ts:213-220`, not `relocateFolder`, and its arrival lands through `applyFolder` (`fileEvents.ts:585-589`) (3).
- **The Restore Runs Outside `addressed`:** `mutate.ts:134-135`, under `underContexts` and `inSettleTurn`.

##### The Trash and Excluded Entries

- **Clear Exclusion Cache:** `exclusionScan.ts:31-88` (the file is 88 lines), sitting in Files & Links › Exclusions (`Core/Settings/frames.ts:567-580`) rather than Maintenance (2).
- **`goneEdit`:** `Core/Nexus/configReach.ts:276-298`, its container arm `:288-297` (2).
- **`mutateRequest.ts:88`'s First Sentence Is Also False:** "Absent order = legacy append", while the page menu's Move To sends `movePage` with no order (`Core/Interface/Menus/pageMenuActions.ts:43`) (2).
- **`mutableTarget` Gates 19 Call Sites in 12 Files:** `Core/Nexus/liveTree.ts:79-87`; Scout 2 counted 18.
- **The Two-Map Comment Isn't Stale:** `spend.ts:229` came with Path Links Phase 8 (`d5462735f`) (2).
- **The Carrying Code at HEAD:** `excludedWithin` `Core/Settings/settings.ts:86-88`, `editExcluded` `:90-95`, `followExcludedFolders` `:97-106`, `exclusionWriteRefusal` `:108-116`, `releaseExcludedFolders` `:118-123`, `reseatExcludedFolders` `:125-127` (each range opens on its doc line). `sanitizeExclusions` is `settings.ts:137-141`, which `Core/Settings/handlers.ts:19-24` only calls (3).
- **F-3's Test Reach Narrows:** `Core/Trash/deleteOrder.test.ts` and `Core/Trash/trashRecovery.test.ts` assert nothing about excluded entries; every follow, release, and reseat test sits in `Core/Nexus/mutate.test.ts:3241-3448` (3).
- **A Latent Bug Leaves With the Reseat:** a restored container's reseat runs as `landed`, after its move event (`spend.ts:214-220`), so the arrival is read under the old scope: its excluded subfolders read as Sets, are owed stamps, and are indexed before the reseat lands (3; traced, not run).

##### Views, Navigation, and Menus

- **Five Exhaustive Sites the Investigation Missed:** `DEFAULT_ITEMS` (`Core/Interface/Subfield/subfieldItems.tsx:13-21`), `liveTarget` (`Core/Navigation/tabsModel.ts:29-33`), `NodeRecord.kind` (`Core/Nexus/treeIndex.ts:23`), `hasSpine` and `crumbDepthFor` (`Core/Interface/Subfield/crumbs.ts:9-16`, `:31-40`), and the sidebar's kind compares (`Core/Interface/Sidebar/Sidebar.tsx:109`, `:210`) (4).
- **The Footing:** `Core/Views/Settings/ViewFrame.tsx:106-118`, its `// PLACEHOLDER` More button `:108-117`. `ViewFrame.test.tsx` asserts nothing about it (4).
- **History's Batch Rule:** `Core/Interface/Windows/PageHistoryWindow.tsx:140` (4).
- **`trashChanged` Has a Second Emitter:** `Core/Properties/Schema/PropertyFrame.tsx:297`, beside `Core/Session/nexusSlice.ts:248-249` (4).
- **`styleBranch` Hides a Lone Row:** `Core/Actions/columnMenu.ts:96-100`; the Trash calls `styleMenuItems` directly (`Core/Settings/TrashFrame.tsx:154`) (4).
- **TableView's Shell Reads `--content-inset`:** defined only in Core (`Core/Interface/styles.css:57`) (4).
- **`treeIndex.ts` Is Renderer-Side:** it imports `iconNameOr` from `UIX/Symbols/index.tsx` (`Core/Nexus/treeIndex.ts:10`; `UIX/Symbols/index.tsx:212`), and the engine graph fails any `.tsx` the host reaches (`Core/Contract/engineGraph.test.ts:7-9`). Nothing in it, `ancestryOf` (`treeIndex.ts:142-143`) and `findSet` (`:206-209`) included, can serve host code.
- **The Engine Graph Follows Type Imports:** `importSpecifiers` collects every import declaration, `import type` included (`Core/Testing/engineGraph.ts:13-40`), so a host-imported type must live in a file that imports no React.

##### Windows, History, and Settings

- **The File History Restore Wears `filled`:** `PageHistoryWindow.tsx:207-219`, which is `--fill-secondary` under `--label-primary` (`UIX/Buttons/button-base.css.ts:184-190`): a neutral fill rather than an accent tint. `.claude/Features/PommoraUIX.md:229` lists Filled as `--fill-tertiary`, which is drift (5).
- **`countPhrase` Answers Lowercase Kinds:** "1 page", "2 pages" (`TrashFrame.tsx:36-50`), while its mixed branch answers `itemCount`'s "2 Items" (`Core/Properties/properties.ts:263`) (5).
- **Settings' Clear → Cleared Has No Fade:** `useTimedLabel` swaps the text after 1500 ms with no animation (`Core/Settings/useTimedLabel.ts:3-14`), and it has two callers, `Core/Settings/ClearActionRow.tsx:14` and `Core/Settings/NexusRows.tsx:59` (Sync Now → Synced) (5).
- **The Code Block's Transform at HEAD:** `COPIED_MS` is `Core/MarkdownPM/decorations.ts:208` and the press `:281-292`; the glyph cross-fade is `Core/MarkdownPM/markdown-pm.css:1034-1041`, the tally pill `:1051-1077` with its hand-rolled overlay `:1062-1077`, the glyph slot's continuous reveal `:1025-1027` and `:1081-1084`, `--reveal-fade` at `--duration-slow` `:981`, and the History placeholder selector `:76`. The Investigation's `:1008-1049` and Scout 5's `:72`, `:958`, `:1011-1017`, `:1028-1054`, `:1039-1054` predate `f1e39d98f`.
- **`fetchPageDetail` Never Answers From Its Cache:** `Core/Session/pageDetailCache.ts:102-118`, so dropping it removes only the cache seeding; an archived body kept in that cache would go stale, since `values:changed` drops cached details by tree path (`useBridgeSubscriptions.ts:55-57`) (5).
- **`reconcileWith` Re-Keys a Vanished Id by Path:** `Core/Session/reconcileSelection.ts:37-38`, pinned by `Core/Session/windowSlice.test.ts:36`; the archive reader must not ride it (5).
- **The Containing-Block Citation:** the view-swap slide is `slideIn` (`UIX/Animations/motion.ts:57-68`), and `paneSlide` is `UIX/Animations/paneSlide.ts:5-16` (5).
- **Settings Ranges:** File History `frames.ts:605-631`, the Trash frame `:902-908`, the Permanently Delete Files hint `:595` (5).
- **`notifications.ts` Already Hosts React Hooks:** `useNotification` (`Core/Interface/Notifications/notifications.ts:25`), and `Core/Interface/contentHost.ts` is a React-only leaf, so the bar's channel and declare hook fit there without a cycle.

##### Not Re-Verified Here

These are carried from the scouts without being reopened: the sync internals behind Scout 1's Call 10 (`Core/Sync/Client/reconcile.ts:75`, `Core/Sync/Arrival/land.ts:124-147`); the rename-record mechanics behind `mutate.test.ts:3362`'s `inside` assertion (Scout 3); Scout 4's per-site line numbers beyond those listed above; `Core/Session/devicePrefsSeed.test.tsx:227`, `:242` (Scout 5); the `.claude/IssuesPM.md` footnote lines `:1363`, `:1394`, `:1436`; and the live Trash record counts (Scout 3). Live Collection ids in `~/NexusOS` and `~/Test` were read and are all ULID-shaped.

---

#### Planner's Calls, Settled

One entry per call across the five lanes. Each names the lane, the recommendation, and what's set aside; costs are source lines.

##### Lane 1: Reach, Index Admission, the By-ID Map, Counts, and Discovery

- **1.1 The Single Exception (B-1):**
  - **Recommendation:** shape (b), refined. `outsideContent`'s hidden check becomes `(archiveSegs(segs) ?? segs).some(hiddenFolder)` (`Core/Paths/exclusion.ts:79`), so `.nexus/archive` itself and every path below it whose own segments pass the hidden rule are admitted, while `.nexus` stays hidden. `corpusFiles` walks the archive root second (`Core/Files/walk.ts:41-43`). `sidecarsUnder` hoists to `walk.ts` and walks both roots, and `normalizeSavedViews` walks the archive root beside `.trash` (Take Along). A hidden folder inside an archived Set stays hidden at every reach.
  - **Set Aside:** shape (a), which opens every tree caller to `.nexus` and admits `.nexus/interface/homepage` tile bodies; "strictly inside", which leaves archived rows standing after a hand removal of `.nexus/archive` until the next seed prunes them.
  - **Cost:** `exclusion.ts` ±0, `walk.ts` +3, the walker hoist +1, `migrateConfig.ts` +1.
- **1.2 The Location Resolver (B-2):**
  - **Recommendation:** one block in `Core/Paths/nexusPaths.ts`, beside `METADATA_DIR_REL` (`:21`), `thumbsRel` (`:88-90`), and `contextDirRel` (`:101`): `ARCHIVE_DIR_REL`, `archiveDirRel(id)`, `archiveSegs(segs)`, and `archivedCollectionIdOf(rel)`. `owningCollection` answers an archived path by its id segment (`Core/Nexus/treePatch.ts:83-91`), so `containerSchema` and every schema reader follow. Listing what's on disk stays with whoever enumerates.
  - **Set Aside:** `Core/Archive/archivePaths.ts`, which would make `Core/Paths` import upward from a feature domain; exported `archiveDirs(root)` and `contentRoots(root)`, which have no second consumer.
  - **Cost:** +6, and `treePatch.ts` +2.
- **1.3 Governed Reach (C-3):**
  - **Recommendation:** one `governedReach(root, candidates, only?)` in `keyHolders.ts`. Its whole-Nexus scope is every Collection folder plus the archive root, which also covers the Archives of damaged, trashed, and excluded Collections; its one-Collection scope (Remove alone) is the folder plus `archiveDirRel(id)`. `keyHolderFiles` and `corpusUnder` fold in; `collectionFolders` moves beside it unchanged for its sidecar role; `deletePlan` loses its `folders` parameter; `bothKeyHolders` drops its redundant call. The delete's Link strip runs on governed reach in place of its tree filter, reaching archived holders (C-2).
  - **Behavior Changes:** a root folder withheld for a reason other than `'unparsed'` stops being stripped, matching every property sweep (a mid-session window, since missing sidecars stamp at open); with no held tree the strip reaches Collections through `liveTreeOf`.
  - **Set Aside:** the mapping inside `collectionFolders` (it would mark every property delete partial and write a `_pagecollection.json` into the Archive); a per-Collection mapping through tree ids; passing `folders` to every caller.
  - **Cost:** about −18.
- **1.4 One Twin Rule (C-3):**
  - **Recommendation:** none wins. An id two files claim can't be addressed by id: no strip filing values by id touches either claimant and no refill writes either. The authority is the one map of *1.5*, where null marks a twin; `keyedHolders` and `deleteCascade` ask `byId.get(id) === null`, and every refill reads the same map. Renames and option rewrites file nothing by id and keep rewriting both claimants.
  - **Behavior Changes:** Remove and the property delete hold both claimants out where the first was stripped; a refill whose id became shared writes neither and falls to each site's existing absent path; two withheld files sharing an id are both stripped, matching `deleteCascade`'s withheld exemption (`cascade.ts:115`). Today's divergence, where Remove strips the first claimant in path order and the reassign refills the first in tree order, closes.
  - **Set Aside:** first wins in the map's order (it needs one order shared by the index and the tree and contradicts `deleteReach.test.ts:125`'s stated reason); a local claimant count beside the map (+3, a second mechanism for one rule).
  - **Cost:** +1 / −3.
- **1.5 The By-ID Map and the Refill World (C-3, D-1):**
  - **Recommendation:** one host-side projection, `nexusPages(root, tree)`, in `Core/Nexus/heldPages.ts`, answering `byId` (the tree's pages and Spaces and the Archive's pages, null on a twin) and `pages` (the tree's pages and the Archive's at their origin paths). Archived entries come from `readIndexedStats(ARCHIVE_DIR_REL)`; their origin paths come from the index paths by the chain layout's algebra (*2.1*), with no record read. `byId` replaces `recordById(tree)` at the three refills and in `resolveRecord`'s `id-live` check, excepting the restoring file's own path, so `recordById` leaves (`record.ts:48-56`). `pages` replaces `pageIndexOf(tree)` at every `frozenWorld`. The reassign's member filter becomes `owningCollection(tree, r.path)` through *1.2*'s arm. With no content-index store, the archive half falls back to a scan of the archive root (`readIndexedStats(ARCHIVE_DIR_REL) ?? scan`), mirroring the other reaches' `?? nexusCorpus`.
  - **What Stays Tree-Only:** the delete's `after` (`cascade.ts:81-83`), since D-1's namesake ruling makes a title-only link that found a namesake the namesake's; discovery (`pageIndexOf(tree)`); and the live lookups `livePathOf`, `liveIdIndex`, `liveIdOf`, and `idHeld` (`heldPages.ts:16-33`), whose widening would pair an archive move as an ordinary move.
  - **Set Aside:** widening the live lookups in place; the Investigation's by-id map without the world, which leaves D-1 broken at every frozen world; a union `after`; an index flag or a separate archive table.
  - **Cost:** +15 / −4, the fallback +3, `id-live` +4 / −9.
- **1.6 Configuration Reach (C-1):**
  - **Recommendation:** confirmed. `reachConfig`'s container list (`configReach.ts:312-317`, `:342-354`) gains archived Set sidecars listed by the hoisted walker, walking `ARCHIVE_DIR_REL` for whole-Nexus edits and `archiveDirRel(id)` for scoped ones, and each sidecar's id joins `sources` so a View Tile sourced from an archived Set takes the scoped edits.
  - **Set Aside:** deriving Set folders from archived page paths, which misses an empty archived Set; leaving archived Sets unreached and reconciling their views on restore, which is Reconcile-on-Restore.
  - **Cost:** +7.
- **1.7 Counts (C-4):**
  - **Recommendation:** confirmed, filtering the files before the dry run: `sweepCount` passes `files.filter((f) => archivedCollectionIdOf(relative(root, f)) === null)` (`Core/Properties/governedSweep.ts:113-114`), so a count never reads an archived file. The rename clash in `bothKeyHolders` (`Core/Properties/registryProperty.ts:124-130`) keeps archived holders, or a rename silently drops the old value on an archived page holding both keys. Its printed count and the zero-count prompts go to *§Questions for Nathan* 1 and 2.
  - **Cost:** +1.
- **1.8 K-2's Trims:**
  - **Recommendation:** all three trimmed host-side against the held tree. `readMatrixGraph` (`Core/Matrix/matrixGraph.ts:19-43`) takes `root` from its handler (`Core/Matrix/handlers.ts:20-23`) and skips rows `liveIdIndex(root)` doesn't hold; `index:headings` (`Core/Nexus/handlers.ts:167-169`) filters to the same keys; `loadValues`' no-id branch reads `pagePathsIn(containerAt(tree, rel))` (`treePatch.ts:101-105`). `folderCorpus` is inlined into its one caller, `moveIndexPaths` (`indexSeed.ts:183`), and its export leaves.
  - **Set Aside:** passing tree paths into the Matrix read, which always sets `ids` and sends every tree path through `json_each`.
  - **Cost:** +6 / −4.
- **1.9 D-1 and the Settle:** settled with Lane 2's Call 10 as *2.10*.
- **1.10 Sync and the Watcher:** confirmed; nothing changes. Hidden folders inside an archived Set stay unwatched and unsynced through `neverWatched`'s folder rule (`exclusion.ts:26-36`). Cost 0.

##### Lane 2: The Trash's Data Layer and What the Archive Shares With It

- **2.1 The Origin Record and the Archive's Layout (Open Item 1):**
  - **Recommendation:** one bundle per archived item, mirroring its origin chain under its Collection's Archive as a Trash bundle mirrors it under `.trash`: `.nexus/archive/<Collection ID>/<origin chain>/<stamp>__<leaf>.archived/<artifact>` beside `_record.json`. Chain segments are container names, which the hidden rule never matches, so *1.1*'s arm admits every chain and still holds out a hidden folder inside an archived Set, such as B-1's `_raw/`, which sits below the bundle segment. The record is the Trash's `contentRecord('page' | 'set')`, gaining three optional fields and losing one:
    - **`place`:** `{ above?, below? }`, the ids of the next and previous siblings in the origin's resolved order when it left. Both stores write it (E-2).
    - **`trail`:** the ids of the containers above the parent, Collection first, written by both stores; it's what F-6 and a Set's ArchiveView read once the origin has left the tree, and a Trash record's origin Collection is `trail[0] ?? parent.id`. Holding only the ancestors above `parent` keeps the parent id stored once.
    - **`archive`:** in a Trash record only, the Archive bundle a delete from the Archive took the item out of (E-3).
    - **`excluded`:** leaves (F-3).
  - **What Derives Rather Than Stores:** the origin path at archive time comes from the bundle's location by today's `deletedPathOf` algebra over the store's root (`Core/Trash/bundle.ts:22-24`), as the archived time comes from the stamp (`Core/Trash/trashRows.ts:12-19`). B-2's reason for not recording the location applies to both: a stored copy would be a second source with nothing to choose between them.
  - **Set Aside:** a flat layout with `origin.path` stored in the record (Scout 2; *§Disagreements Resolved › The Archive's Layout*); a manifest per Collection; a single anchor; an index; keeping the slot as a tombstone in `page_order`; a parent-inclusive trail.
  - **Cost:** schema +5, `gatherContentRecord`'s place and trail +8, `excluded` −2 (counted under *3.5*).
- **2.2 The Neutral Owner (A-4):**
  - **Recommendation:** a new domain, `Core/Bundles/`, which both `Core/Trash/` and `Core/Archive/` import and which imports neither. The store identity is a union resolved by switch: `BundleStore = { kind: 'trash' } | { kind: 'archive'; id: string }`, and `layoutOf(store)` answers `{ dir, suffix }` (`.trash` with `.deleted`; `archiveDirRel(id)` with `.archived`). One chain layout serves both stores, so `mintBundle`, `originPathOf`, and `frozenCrumbs` each take the store's root and branch on nothing else. `openBundle` becomes `storeOf(rel)` plus the read, answering which store a path belongs to. An Archive row's crumbs read as a Trash row's do: live from `parent` by id while the tree holds it (`liveCrumbs`, `trashRows.ts:31-45`), and from the frozen chain only once it's gone, with the store's root stripped, so the first frozen crumb is the Collection's folder name at archive time. The two suffixes stay: NexusOS already holds `.deleted` bundles, and the suffix tells the stores apart in Finder. The files are in *§File Placement*.
  - **Set Aside:** `Core/Nexus/placement.ts` plus a `Core/Holding/` domain (two homes for one format, and "holding" collides with "held"); leaving the format in `Core/Trash/` (A-4); a per-store schema; one shared suffix (a migration or a false name on disk); the names "Held", "Record", and "Provenance".
  - **Cost:** the parameterization about +6, moves ±0.
- **2.3 E-2 Exact Placement:**
  - **Recommendation:** the fold is `spliceBeside`, which create placement and custom order already use, and which moves with `Slot` from `Core/Views/creationOrder.ts:10-28` to `Core/Nexus/order.ts` beside `resolveOrder` so the host reaches it without a Views import. `resolveRecord`'s container arm composes the destination order from the live sibling ids through `slotOf(place, ids)`: above `place.above` if it's live, else below `place.below`, else `'first'` when it had no previous sibling, else `'last'`. The landing writes it through `setChildOrder` after the relocate, as `move.ts:38` and `create.ts:50` do. The archive op and the Trash delete both drop the id from the source order at departure (`dropFromChildOrder`), as a move does (`mutate.test.ts:792`). A picked destination drops `place` and lands `'last'`. `manual_order` needs nothing, since `mergedRanking` keeps an absent id (`creationOrder.ts:30-41`). Legacy Trash bundles carry no `place` and land `'last'`, the Context precedent (`Core/Trash/spend.test.ts:215-238`).
  - **Set Aside:** keeping the slot in `page_order` and changing every writer to merge (garbage ids in synced sidecars forever, and no help for a picked destination); an index; a single anchor; New Page Placement on a picked destination.
  - **Cost:** +10.
- **2.4 E-4 Step-Aside:**
  - **Recommendation:** one landing name rule, `freeOnDisk(root, entity, dir, name)`, in `Core/Bundles/placement.ts`. It wraps `createDisambiguated` (`Core/Paths/names.ts:66-79`) with a predicate asking the disk: for a container, `landingRefusal` read as a predicate, and for any kind, `pathExists` on its leaf. It runs after `resolveRecord`'s tree-side `freeName` and before anything is written, replacing the landing and `exists` refusals (`spend.ts:174-182`). Contexts and Spaces ride it before the registry write. `landingRefusal` stays a refusal for the create (`create.ts:71`) and the Set move (`move.ts:51`), where a user-chosen name is refused rather than changed. `MutateOutcome` gains `landedAs?: string` whenever the final title differs from the artifact's own, covering the tree step taken silently today. F-080 stays deferred, with `freeOnDisk` as its one seam.
  - **Set Aside:** feeding `freeName` one disk listing (a page landing mustn't count a same-named folder, and an excluded entry with no folder on disk must still count); keeping the refusals (E-4).
  - **Cost:** +4.
- **2.5 The `restoreArtifact` Split (A-3):**
  - **Recommendation:** split by phase rather than kind. Four phases leave `restoreArtifact` (`spend.ts:143-323`): placement (`placeRecord`: `withDestination`, `resolveRecord`, `REFUSAL_TEXT`), the disk name (`freeOnDisk`), the pages coming back (`originPagesOf`), and the returning relink (*2.10*). The reconcile, the Context registry write and rollback, the `targets` repair, and the kind tails stay as one chain. The Archive's restore, `restoreArchived` in `Core/Archive/archive.ts`, reuses placement, the disk name, the pages coming back, the relocate (plain `relocate`, since an archived Set holds nothing set aside), the order write, the bundle removal, and the returning relink, and runs no reconcile, repair, or refill.
  - **Set Aside:** a split by kind, which duplicates the reconcile and relink every kind runs; calling `restoreArtifact` from the Archive, which reconciles a page Reach-In already keeps current.
  - **Cost:** ±0 for the split; `restoreArchived` about +25 (uncosted in Lane 2's table; see *§Line Totals*).
- **2.6 E-3, the Undo, and the Op Set:**
  - **Recommendation:** three ops serve the Archive. `archive` is new. `restore` serves both stores, routed by `storeOf(req.bundlePath)`: an archive bundle runs `inSettleTurn(() => restoreArchived(…))` with no `underContexts`, and a Trash bundle runs as today. `delete` accepts an archive bundle as a source built beside the live one inside `deleteOp`, leaving `mutableTarget` (19 call sites) untouched; the archived source mints its Trash chain from the archive-time origin path, takes its strip keys from the archived pages' origin paths, gathers a Set's gone ids from its sidecars on disk through `goneContainers(ids)` (hoisted from `goneEdit`'s container arm, `configReach.ts:288-297`), refuses a kind that doesn't match the record with `NOT_HELD`, and removes the emptied archive bundle. One `moveIntoStore(root, from, to, extra)` in the owner mints, writes the record ahead, relocates, and removes the source bundle; the delete from the Archive and F-5 both call it, and it spreads `extra` onto the raw source record rather than its decode (`record.ts:46`, as `appendLinks` does at `:95-101`).
  - **The Undo:** the Trash record keeps `archive`; the Undo of a delete from the Archive sends `restore { bundlePath, destination: { kind: 'archive' } }`, which lands at `record.archive` through `storeOf` and `resolveUnderRoot` (as `bundlePath` does at `spend.ts:138`), re-mints the exact bundle name so the stamp returns, and writes the Archive record. The Trash browser's Restore sends a plain `restore`, which returns to the origin. `armed` and `spendBundle` (`Core/Interface/Confirm/confirmations.ts:40-46`) are keyed by any string, so `spendBundle` becomes `spendUndo(key)` over the same map.
  - **One Outcome Field:** `MutateOutcome.trashed` (`Core/Nexus/mutateRequest.ts:16`) becomes `bundled: { bundlePath }`, the bundle any removal minted, read by `confirmDelete` and `confirmArchive` alike.
  - **`changesSettled`:** gains `archive` alone (`mutateRequest.ts:138-147`); both restores are `restore` and the delete from the Archive is `delete`, already listed.
  - **Set Aside:** an `unarchive` op (two op names for the user's one verb, Restore, where the routing is the check `openBundle` already makes); restoring to the origin and re-archiving (the archived time resets and the Undo fails when the origin is gone); the Undo closure carrying the archive path; widening `mutableTarget`.
  - **Cost:** about +48.
- **2.7 F-4 Disposal:**
  - **Recommendation:** when the bundle or target is a Collection, `emptyBundle` and `deleteOp`'s system-trash branch dispose `archiveDirRel(record.id)` the way the Collection's artifact goes, wherever Trash Mode sends it, folding the Archive's pages (`originPagesIn(root, { kind: 'archive', id })`, generalized from `trashedPages`) into the one strip and the one metadata drop. `deleteCascade` takes the roots that left in place of one `abs`, so the strip never selects the disposed Archive's files from index rows still standing (Scout 2 left this to Lane 1).
  - **Set Aside:** a separate `disposeArchive` with its own strip and drop; moving the Archive into the Collection's bundle (*§Rejected*).
  - **Cost:** +11.
- **2.8 F-5 Orphans, Sharing F-6's Open Pass:**
  - **Recommendation:** one pass, `settleArchives(root, tree)` in `Core/Archive/refile.ts`, inside the seed's `try` after `seedLiveTree` and `runOpenLedger` and before `seedContentIndex` (`Core/Nexus/handlers.ts:99-104`), inside `root !== priorRoot` (`:85`), with its own `.catch` logging, as `prepareOpenedNexus`'s steps have (`:44-52`). It lists `.nexus/archive` once. An id naming no tree Collection, no root-level excluded folder's `_pagecollection.json` (`sidecarId`, `Core/Files/sidecar.ts:7-10`), and no Trash Collection record is orphaned: each of its bundles moves into `.trash` through `moveIntoStore`, its chain mirrored from the bundle's own and its record kept whole with no `archive` field, and the directory is removed once no file remains beneath it. Every other Archive's records are checked for misfiling and re-filed (*3.4*). The checks run cheapest first: tree ids in memory, then the excluded sidecars (NexusOS has four root entries), then the Trash walk only for an id still unmatched. No strip and no configuration pass run, since this is safekeeping and D-1 keeps inbound values in place.
  - **Set Aside:** two separate open passes; leaving orphans in place; an on-demand trigger (*2.9*).
  - **Cost:** about +24.
- **2.9 Clear Nexus Cache (Prospect):**
  - **Recommendation:** leave it. Folding F-5's sweep into Clear Exclusion Cache costs about +6 more than the two apart (the handler, the gate at `frames.ts:146-147`, the confirmation's copy and signature, `ClearReport`, the row's move), and nothing shows the on-demand trigger is needed. If immediacy is wanted later, one line in `exclusions:clear` (`Core/Settings/handlers.ts:37-40`) can run the pass.
- **2.10 The Archive's Restore and the Settle (D-1; Lane 1's Call 9):**
  - **Recommendation:** neither restore rides `addressed`. The Trash restore's two-map relink (`spend.ts:229-247`) hoists beside `relink` (`Core/Nexus/settle.ts:249-260`) as `returningNames(live, after, back)`, answering `{ names, own }`: `own` re-spells the returning pages' own keys against themselves and joins `names` only where the live world reads the key phantom, so a title-only link that found a namesake stays with it. The Trash feeds `own` to its refill; the Archive passes `back` at the origin paths and ignores `own`. The two-map comment moves with it.
  - **Set Aside:** routing the unarchive through `addressed`, which would need the op in its request union (`mutate.ts:89-91`), a label from the reply rather than `titleFromPath(req.path)` (`:99-100`), and `back` handed out of the op, all inside a wrapper whose own relink is the wrong map; moving `restore` under `addressed`, which breaks the Trash's repair position (`spend.ts:237-248`) and its `underContexts` lock; inlining a second copy.
  - **Cost:** +8 / −9 (Scout 2's figure for the same hoist Scout 1 costed at +12 / −10).
- **2.11 E-5, an Origin Set Itself Archived:** it stands as `parent-gone`, since `findContainerById` reads the tree alone (`Core/Trash/resolve.ts:27-28`), and the row offers the destination picker, as for an origin in the Trash or excluded. A batch restore newest first returns a Set archived after its item before the item looks for it. Cost 0. *§Questions for Nathan* 3 asks it plainly.
- **2.12 B-3:** confirmed with no code. `dropPageMetadata` has three callers (`Core/Trash/delete.ts:101`, `spend.ts:88`, `exclusionScan.ts:85`), none an archive op; F-5 always mints and drops nothing; F-4 drops for the disposed Archive's pages.

##### Lane 3: The Lift, the Carry, and F-6's Observation Point

- **3.1 The Lift (F-2, F-3):**
  - **Recommendation:** one function, `liftSetAside(root, containerAbs)`, in `Core/Nexus/folderEntity.ts` beside `relocateFolder`, named for the `SET_ASIDE` pair it moves (`folderEntity.ts:12-17`). It reads `readWatchScope` once, takes each excluded entry's and the asset directory's remainder under the container through `entryWithin` (`exclusion.ts:98-99`), keeps the outermost through `remainderUnder` (`:93-96`), skips a remainder naming nothing on disk (`pathExists`), names each landing with `freeName` over `listEntries(parent)` (which folds case and counts the container itself, so its restore never meets a lifted namesake) using the folder's own spelling (`heldName`, `atomicWrite.ts:340-345`), and moves each through `relocateFolder`, so its entry is written ahead. Its callers are the archive op and `deleteOp` in both Trash modes, where it replaces the gate at `delete.ts:41-44` ahead of the mint, the system-mode gather, and the move.
  - **Why the Entry Goes First Here:** with today's order the lifted folder's move event lands before its entry follows, so the arrival classifies as a plain folder, reads as a Set, is stamped, and has its pages indexed (`fileEvents.ts:585-589`, `:224-226`, `:347-349`; `adopt.ts:133-146`; `indexSeed.ts:182-185`).
  - **Set Aside:** today's follow order; naming by tree siblings, which never sees excluded folders; moving without `freeName`, which risks a rename onto an existing folder; one batched settings write for all lifts.
  - **Cost:** about +22.
- **3.2 K-1, the Crash-Safe Carry:**
  - **Recommendation:** one `carrySetAside(root, from, to)` in `Core/Settings/settings.ts` replaces `followExcludedFolders`, `editExcluded`, `exclusionWriteRefusal`, and `excludedWithin`. It writes the landing's excluded entries beside the source's, and moves `asset_directory`, in one `updateNexusConfig` before the rename, whose `Result` is the refusal before anything moves; it returns the step that drops the source entries, which `relocateFolder` runs as `relocate`'s `landed` so sync rescopes once. `relocateFolder` returns a `Result` and its two wrappers pass it on, so the refusal arms at `Core/Nexus/rename.ts:20-23` and `move.ts:50-53` leave. `applyMove`'s corpus check (`fileEvents.ts:574-577`) learns the counterpart rule: the corpus moves only when an entry under the landing has no excluded counterpart under the source, which keeps the in-place patch and a current tree inside `moveSetOp`. Case-only renames keep the landed spelling and lose no entry. Today's walk on a scope change stays (*§Contradictions*, *§Questions for Nathan* 6).
  - **Set Aside:** the follow after the rename (not crash-safe, and wrong for the lift); a module-level "carrying" flag `applyMove` consults; pre-writing while leaving `applyMove` alone; one write with no drop; a separate probe write.
  - **Cost:** about −16.
- **3.3 The Asset Directory:** it rides the same carry (two lines in `carrySetAside`) and joins the lift's candidates; `assets:setDir` stays its only user-facing writer (`Core/Assets/handlers.ts:42-60`), and `migrateAssets` doesn't apply. Cost counted in *3.1* and *3.2*.
- **3.4 F-6's Observation Point and the Trail:**
  - **Recommendation:** one carry, `refileArchived(root, setId, fromCollectionId)` in `Core/Archive/refile.ts`, with three triggers, since no point at HEAD observes all three landings:
    - **The Settle's Comparison:** the comparison of the tree last handed to the window with the tree now held (`settle.ts:166-170`), reading only the container entries `deltaOf` drops and sets (`Core/Nexus/treeDelta.ts:40-58`) and pairing them by id. It sees the in-app move and the Finder move and costs what changed.
    - **The Restore:** a Set restored into another Collection passes the Collection its record names (`trail[0] ?? parent.id`), since it arrives from outside the tree.
    - **The Open Pass:** *2.8*'s pass re-files a misfiled record, covering a Finder move made while Pommora was closed, since a session's first tree has no handed baseline (`settle.ts:168`).
  - **The Reading:** a record's origin is inside the Set when its origin parent is in the tree and its current trail runs through the Set, or when the tree no longer holds it and its stored `trail` names the Set. The crossing test compares Collection ids, so a Collection rename never reads as a crossing.
  - **The Trail Stays Current:** the settle trigger fires on every Set move it sees, crossing or not, and rewrites the stored `trail` above the moved Set for each record whose origin lies within it; on a crossing it also moves those bundles into the destination's Archive. This settles Scout 2's cautionary: a sub-Set moved within its Collection and later archived or trashed would otherwise leave earlier items narrowing under its old top-level Set.
  - **Set Aside:** `addressed` with the restore moved under it (never sees a Finder move, and merges two relink strategies); `applyMove` and `relocateFolder`'s `landed` (own moves only, and the restore uses plain `relocate`); `payOutsideMoves` (Finder only, pages only, so a Set whose pages are all archived pairs nothing); a ledger fed from the event arms (three sites for what the comparison sees at one); deriving the Collection at read time (F-6 rules it out); having the narrowing read an archived parent's own record before the stored trail (no writes, but it misses an origin moved within its Collection and then trashed).
  - **Cost:** about +33: the carry +14, the observer +12, the restore +1, the open pass's re-file arm +4, the trail rewrite +2.
- **3.5 F-3's Removal Inventory:**
  - **Recommendation:** the record's `excluded` and its doc and import (`Core/Trash/record.ts:38-39`, `:3`), its gather (`Core/Trash/gather.ts:72`, `:2`), `releaseExcludedFolders` and `reseatExcludedFolders` (`settings.ts:118-127`), the release at delete (`delete.ts:109`, `:26`), the restore's refusal over recorded entries (`spend.ts:177`), and the reseat (`spend.ts:217-219`, where `relocate` takes no `landed`) all leave, and F-007 closes. No live record holds a non-empty `excluded`, and Zod's default object strips the key from any record still carrying `excluded: []` (`record.ts:33-44`).
  - **Behavior Changes:** a system-trash delete leaves excluded folders in place with their entries; emptying the Trash never deletes excluded content; the system-mode metadata drop stops reaching pages inside excluded folders.
- **3.6 What Remains of the Exclusion Block:** `writeAssetDirectory`, `writeExcludedFolders`, `carrySetAside`, and `sanitizeExclusions`: four exports where there are nine.

##### Lane 4: ArchiveView, the Archive Place, the Shared Browser, the Entry, the Menus, and Scale

- **4.1 ArchiveView's Table (G-1, G-2):**
  - **Recommendation:** `Core/Archive/ArchiveView.tsx` draws TableView's own DOM on the shared sheet by class (`.table`, `.table-head`, `.col-header`, `.data-row`, `.data-cell`, `.row-lead`, `.cell-title`; `UIX/Table/table.css`) and imports `Core/Views/Table/table-view.css` for the shell, so the full-length dividers, hairlines, header segment bars, banner bleed (`Core/Interface/Header/content-banner.css:94`), and header padding (`Core/Interface/interface.css:56-59`) come free. The Title cell carries the compact `Checkbox` in a `.row-check` gutter span, then `EntityIcon` and the title, then the origin trail as a `NavTrail` (G-2); the Archived cell centers as TableView centers a date column. `.row-check` joins the gutter selectors (`table-view.css:49-57`), and `ARCHIVE_COLS` reads TableView's default widths through a one-line export (`Core/Views/Host/useColumns.ts:32-46`). The Trash keeps its look (A-3).
  - **Set Aside:** hoisting the shell to `UIX/Table/`, which would make UIX read Core's `--content-inset`; hoisting the gutter alone; a `CheckTable` in UIX with one consumer.
  - **Cost:** the view about +95, `Core/Archive/archive-view.css` about +18, `table-view.css` +4, `useColumns.ts` +1.
- **4.2 Shared Beneath the Visual Layer:**
  - **Recommendation:** five pieces, each with one home.
    - **The Row:** `TrashRow`, `TrashCrumb`, and `deletedAt` become `BundleRow`, `BundleCrumb`, and `storedAt`, gaining an optional `icon` (a page's from `.nexus/metadata`, kept by B-3; a Set's from its sidecar), which the Trash ignores.
    - **The Checked-Row Rule:** `checkedIn` and `actedOn` beside `toggled` and `retained` in `UIX/Utilities/checkSet.ts`, read by the Trash (`TrashFrame.tsx:163`), History (`PageHistoryWindow.tsx:140`, unchanged in behavior), the Archive, and ActionLabel's declarer.
    - **The Date Column:** `useDateColumn(key)`, the Trash's resolve, pick, and format (`TrashFrame.tsx:65-69`, `:153-159`, `:254-263`), calling `styleMenuItems` directly. The Archive's key is a sibling, `archiveColumnStyle`, beside `trashColumnStyle` (`Core/Settings/personalization.ts:197`).
    - **The Browser:** `useBundleBrowser(store, { query, shown })`, TrashFrame's controller (`:74-151`, `:161-199`) folded into one hook: rows, the checked set, refresh, the change subscription, the single-row path, the batch runner and its reports, the menu, and a store table picking the delete confirmation and a homeless row's destinations.
    - **The Narrowing and the Count:** `countPhrase` and the narrowing move with the hook.
    The renderer pieces (`useBundleBrowser`, `useDateColumn`, `countPhrase`, the narrowing) share one renderer-only file, `Core/Bundles/browser.ts`.
  - **Set Aside:** sharing only the pure helpers, which leaves two copies of the refresh, the runner glue, and the menu dispatch; the pieces in `Core/Settings/`, which makes ArchiveView import the Settings domain; one shared date key under a neutral name, which renames a synced key.
  - **Cost:** TrashFrame about −160 / +6, the browser file about +142 (moved and generalized), `checkSet.ts` +6, History −1 / +1, `personalization.ts` +1, the row +2.
- **4.3 The Place Kind (G-4, G-5):**
  - **Recommendation:** `ArchiveTarget = { kind: 'archive'; id: string }`, where `id` names a Collection or a top-level Set: a non-node, id-bearing place on the Matrix precedent. It joins `SelectionState`, `NavRef`, and `NAV_KINDS` (`Core/Navigation/navRef.ts:10-14`, `:34`, `:47-51`); `liveTarget` passes it through (`tabsModel.ts:29-33`), so relaunch and pins ride it; `reconcileWith` keeps it while its owner is a Collection or a top-level Set; `select`, `HostView`, `SUBFIELD`, `DEFAULT_ITEMS`, `scopePane` (joining `none`'s spacer), and `subfieldCrumbs` answer it; `searchView` and `ViewMenu` admit it; `resolveIndexOf` gains one core per Collection and top-level Set keyed `archive:<id>`; `NodeRecord.kind` excludes it, so nav search leaves it out by construction. `ARCHIVE_ICON` and `archiveOwnerOf(tree, id)` sit in `Core/Archive/archivePlace.ts` on `matrixKind.ts`'s precedent, and the `archive` glyph joins the curated roster (`UIX/Symbols/index.tsx:107`). The depth rule `ViewMenu.tsx:23` states inline hoists as `isTopSet(path)` into `Core/Nexus/treePatch.ts`, host-safe, rather than beside `findSet` in the renderer-side `treeIndex.ts`.
  - **Set Aside:** a flag on the Collection target (every `kind === 'collection'` check would read ArchiveView as the Collection); a pseudo-view (*§Rejected*); archive records in `nodesOf`, which would overwrite the owner's record in `nodesByIdOf` (`treeIndex.ts:176-184`).
  - **Cost:** about +48.
- **4.4 The Banner and Header (G-3):**
  - **Recommendation:** ArchiveView mounts `InterfaceScaffold` with `containerOwner(owner)` and a `trailing` node threaded through `EntityBanner` to `DetailTitleHeader`, rendered after `.detail-title-clear`, whose `margin-left: auto` (`Core/Interface/Header/content-title.css:91-95`) is what lets the clear button pad against the label. The label is "Archive" in `label-tertiary` at the title's size. The owner's full header stays (*§Questions for Nathan* 8).
  - **Set Aside:** no banner image (+3 and a flag); a read-only title (+4).
  - **Cost:** +11.
- **4.5 The Entry Button (G-4):**
  - **Recommendation:** the placeholder leaves `trailing` (`ViewFrame.tsx:108-117`), and `leading` holds `FootingCreate` followed by `<Button type="filled" size="button-inline" label="Archive" pressed={inArchive} onClick={toggle} />`. `ViewMenu` also renders on the archive place, resolving the same owner, so its `key` holds across the toggle. The toggle calls `select(…, { newTab: false })`, so each press is a Back/Forward step without spawning tabs under New Tab. `switchTo` (`ViewFrame.tsx:65-68`) also returns to the view while in the Archive.
  - **Set Aside:** leaving the placeholder; placing the button in `trailing`.
  - **Cost:** −10 / +10.
- **4.6 Listing Rows and the Change Signal:**
  - **Recommendation:** `'bundles:list': { args: [store: BundleStore]; reply: Result<BundleRow[]> }` replaces `'trash:list'` (`Core/Contract/bridge.ts:258-259`; `Core/Trash/handlers.ts:12-14`), served from `Core/Bundles/handlers.ts`. The archive arm takes the place id: a Collection id lists its whole Archive, and a Set id lists its Collection's Archive narrowed by the *3.4* reading. Crumbs and `homeResolves` stay host-side on `containerTrailWhere` (*§Disagreements Resolved › Stale Trails*). `trashChanged` (`nexusSlice.ts:70-71`) becomes `storesChanged`, emitted through one predicate `changesStores(req)` beside `changesSettled`, covering `delete`, `restore`, `emptyBundle`, `archive`, `moveSet`, and a `rename` whose kind is a Collection or Set, in place of the inline triple (`nexusSlice.ts:248-249`); `PropertyFrame.tsx:297` emits it too. A browser re-lists while shown and on each showing; ArchiveView passes `!useContentHost()?.parked` and TrashFrame passes `true`.
  - **Set Aside:** two channels; a twin `archiveChanged`; resolving trails renderer-side.
  - **Cost:** the handler +6 and the Set narrowing about +8 (both uncosted by the scouts), `changesStores` +8 / −2.
- **4.7 Scale:**
  - **Recommendation:** `useVirtualRows({ count, rowHeight, listEl, scrollEl })` in `UIX/Interactions/virtualRows.ts`, the only importer of `@tanstack/react-virtual` (`UIX/package.json:24`), which IconPicker adopts (`UIX/Pickers/IconPicker.tsx:80-97`). It measures the list's offset as the rect difference to the scroll root plus its `scrollTop`, since ArchiveView's scroll root is the scaffold's `.detail-scroll` inside an absolutely positioned host. Rows are one fixed height, `.archive-rows` is `position: relative`, rows translate by `start`, and `.row-lead` comes from index 0.
  - **Set Aside:** rendering every row (ViewSearch narrows per keystroke, which is O(N) on a high-frequency trigger); paging; a Core-local TanStack import.
  - **Cost:** +24 / −14.
- **4.8 Set Rows:** an archived Set is one row with its icon, title, trail, and time; Restore and Delete act on the whole Set, and its pages aren't browsable until it returns. A page archived out of that Set beforehand is its own row. Cost 0 (*§Questions for Nathan* 10).
- **4.9 Menus (I-1, K-4):**
  - **Recommendation:** `pageMenu.ts` gains `'title:archive'`, `ARCHIVE_ROW`, and `REMOVAL_ROWS = [ARCHIVE_ROW, DELETE_ROW]`, replacing `[DELETE_ROW]` at `Core/Actions/pageMenu.ts:104` and `:132`; `runPageAction` gains one `title:archive` case (`pageMenuActions.ts`, after `:68`). The container branch (`Core/Actions/entityMenu.ts:60-80`) becomes `[open], [create], [Rename], [lock?, Copy Path, Reveal], set ? REMOVAL_ROWS : [DELETE_ROW]`. As a Take Along, the Space and Context Delete (`:95`) becomes `DELETE_ROW`, the bare `'delete'` leaves `EntityMenuAction` (`:33`), and `runEntityAction`'s `case 'delete'` becomes `case 'title:delete'` beside a new `case 'title:archive'` (`Core/Actions/entityMenuActions.ts:133`), so one Archive row and one Delete row are defined once. One `Core/Actions/restoreMenu.ts` replaces `trashMenu.ts` and `fileHistoryMenu.ts`, with `restoresBatch?: false` for File History and `restoreAll`/`deleteAll` folded into `restore`/`delete` with batch labels.
  - **Set Aside:** keeping the container `'delete'` literal beside a new `'archive'` (a third spelling pair); two restore builders (K-4).
  - **Cost:** pages +6, containers and Spaces about ±0, the builder −45 / +20.
- **4.10 Opening a Row:** a page row's title opens the reader window through `openReader({ kind: 'archive', page, trail })` (*5.4*); a Set row's title opens nothing; the rest of a row toggles its check, as a Trash row does (`TrashFrame.tsx:318`); the right-click menu stays Restore and Delete. Cost inside ArchiveView (*§Questions for Nathan* 11).
- **4.11 Search:**
  - **Recommendation:** ArchiveView reads the tab's `viewSearch` query as `useViewHost` does (`Core/Views/Host/useViewHost.ts:54-56`) and narrows in place through `matchQuery` and `matchScore`, keeping archived order, which is ViewSearch's rule (`Core/Views/Pipeline/search.ts:4-14`). The shared narrowing is that one rule, which the Trash adopts in place of `rankMatches` (`TrashFrame.tsx:52-56`). The Archive's `match` key starts below its Collection, so typing the Collection's own name doesn't match every row.
  - **Set Aside:** a `rank` flag keeping the Trash ranked (two rules for one field type).
  - **Cost:** +2 (*§Questions for Nathan* 15).

##### Lane 5: ActionLabel, the Reader Window, the Archive History Timeframe, Settings, Confirmations, and the Undo

- **5.1 G-7, ActionLabel's Shape:**
  - **Recommendation:** option (c). `NotificationLabel` becomes **ActionLabel**, the frame's one top-right label: a posted notice when there is one, otherwise the bar the shown surface declared, otherwise nothing. The transform is that one standing chrome cross-fading from the bar face to the notice face: pressing Restore runs the batch and posts `notifyUndoable("Restored 3 Pages", undo)`, which drains on `DWELL_MS` with Undo like every notice, and the bar returns if rows are still checked. The slot stays App-level (`Core/Interface/App.tsx:198`), clear of every containing-block hazard. The bar's channel and `useDeclareActions` live in `notifications.ts` beside the notice's channel, declaring only while the content host is shown (the `usePublishCount` rule, `Core/Interface/Subfield/publish.ts:7-15`), with the declarer memoizing the bar. The bar face is the notice's own `s.row` and `s.message` with `Segments` drawing `[Restore | 3 Pages]` and a destructive trash button; the face is held through the chrome's exit with `useHeld`. ActionLabel adds no hover or reveal code. The folder stays `Notifications/`, since its bulk is the notice API with 38 importers.
  - **Set Aside:** (a) its own component with hoisted chrome (two components owning one position, so the "transform" degrades to one box sliding out as another slides in, about +70); (b) folded into `NotificationLabel` as a mode (the same code under a name describing half of what it shows).
  - **Cost:** about +38.
- **5.2 One Transform (G-6):**
  - **Recommendation:** a face swap plus, for the acknowledgements alone, one hold. `glyphSwap` and `glyphSwapFace` (`UIX/Symbols/symbols.css.ts:5-11`) move to `UIX/Animations/swap.css.ts`, gaining `pointer-events: none` on the hidden face, with a React wrapper `UIX/Animations/Swap.tsx` whose hidden face is `aria-hidden` and `inert`. `DONE_MS`, one knob in `UIX/Animations/motion.ts`, replaces `COPIED_MS` (`decorations.ts:208`) and `ACTIVE_MS` (`useTimedLabel.ts:3`); `DWELL_MS` stays the notice's countdown. `LockGlyph` draws through `Swap` (`UIX/Symbols/index.tsx:263-286`); `useTimedLabel` moves to `UIX/Animations/useTimedLabel.tsx` and returns a `Swap` label, so `ClearActionRow.tsx` and `NexusRows.tsx` change nothing (`Button`'s `label` is a `ReactNode`, `UIX/Buttons/Button.tsx:25`); the code block's tally pill takes the swap classes and its hand-rolled overlay leaves (`markdown-pm.css:1062-1077`). The glyph slot keeps its continuous `--reveal` stack and the bare name keeps its instant swap, with both reasons stated at `markdown-pm.css:1051`.
  - **Set Aside:** a hook alone (the code block's widget is plain DOM, `decorations.ts:260-299`); a host `is-done` class (moves the duplication rather than removing it); converting the name and glyph slot too.
  - **Cost:** about ±0 (+31 / −31), leaving one face swap where three hand-rolled stacks stood.
- **5.3 K-3, a Notice Posted Under the Pointer:**
  - **Recommendation:** the notice stays unarmed until a `far` or `out` report arrives after it posts; `armed` resets with each post, as `nearRef` does (`NotificationLabel.tsx:29`), and a press reports `held`, which leaves `nearRef` alone. Since `trackNear` reports only on moves (`UIX/Interactions/hoverReveal.ts:204-212`), the rule is "unarmed until the pointer has been seen outside the band once".
  - **Set Aside:** a window-wide pointer tracker, a standing high-frequency listener for one edge.
  - **Cost:** +2 (*§Questions for Nathan* 20).
- **5.4 H-1, the Reader Window:**
  - **Recommendation:** one window, `Core/Interface/Windows/PageReaderWindow.tsx` (renamed from `PageHistoryWindow.tsx`), over one typed slot in `Core/Session/windowSlice.ts`: `Reader = { kind: 'history'; page: PageTarget } | { kind: 'archive'; page: PageTarget; trail: TrailSegment[] }`, with `reader`, `openReader`, and `closeReader` replacing `historyTarget`, `openHistory`, and `closeHistory` (`windowSlice.ts:30-32`, `:142-143`). One shell (presence, `WindowBase` with geometry, the lock as `lead`, the inert editor host, the read-only editor with the sentinel ancestor, the scrollbar, the title trail) carries two thin branches: History as today, and Archive with no snapshot panel, its body read by an uncached `page:open`, its title from the slot's trail (built by ArchiveView through the browser's crumb mapping), and closing itself when a `storesChanged` re-ask refuses. The History branch reads uncached too. The reconcile becomes a `switch` on kind in which the archive arm does nothing on a tree change. Both branches share one remembered size under the window id `'page-reader'`; H-1's "unremembered" reads as never reopened after relaunch, as the History window already isn't (`windowSlice.ts:129-136`). The lock is `lead={<Icon name="locked" … />}`, titled "Read Only", in both branches. No toolbar Restore, and no re-read when a cascade rewrites an open archived page.
  - **Renames:** `HISTORY_ANCESTOR` → `READER_ANCESTOR` (`PageHistoryWindow.tsx:36`), `.page-history-page` → `.page-reader-page` (`Core/Interface/Windows/page-window.css:31`, `:34`; `markdown-pm.css:76`), `'page-history'` → `'page-reader'` (`PageHistoryWindow.tsx:63`); `.page-history-row` and `'page-history-list'` stay, since they name the History panel alone.
  - **Set Aside:** a shared hook with two windows (a second slot, mount, and opener, and two windows open against "single-state", about +70 to +90); a mode of `PageWindow` (*§Rejected*); closing on tree entry (misses a delete from the Archive, so it needs the signal anyway).
  - **Cost:** about +38.
- **5.5 J-1, the Archive History Timeframe:**
  - **Recommendation:** `archiveHistoryDays: setting(numberCheck(HISTORY_DAYS, true), undefined, HISTORY_DAYS)`, optional with no fallback. One helper states the follow rule, `settingWithin(p, key, within)`, read by the host's `readFileHistoryConfig` (`settings.ts:64-73`) and by `useRowValue` when a row names a bound (`Core/Settings/SettingsWindow.tsx:226-244`). The row sits under History Timeframe with `within: 'historyDays'` (`ZoomSpec`, `frames.ts:85-87`), and `ZoomRow` caps its range at the bound's value (`SettingsWindow.tsx:255-266`). `PickerOption` gains `disabled`, which `MenuDoor`'s rows and the rows map carry (`UIX/Pickers/PickerControl.tsx:10-20`, `:103-108`); `steppedPickerProps` dims steps above `range.max`, and the capped `max` clamps the typed entry (`:64`) with no new code. The switch-down sits inside `writePersonalization`'s updater (`settings.ts:130-135`), so one locked write keeps the two values from disagreeing on disk. The sweep moves after `seedContentIndex` (`Core/Nexus/handlers.ts:86` to after `:103`), reads archived ids from `readIndexedStats(ARCHIVE_DIR_REL)` excluding any `idHeld` twin, and runs one statement with both cutoffs (`Desktop/Store/versionsDb.ts:71-73`; port `Core/Platform/stores.ts:89`); the trigger also fires on `archiveHistoryDays` (`Core/Settings/handlers.ts:46`). Captures stay on the live cutoff.
  - **Set Aside:** a read-side `min` alone (a pick of 30, shortened to 14, then lengthened to 60, pops back to 30); the switch-down as a second write; a `within` on the `SETTINGS` entry; a trim at archive time or a class column in `versions.db`.
  - **Cost:** about +27.
- **5.6 I-2 and I-3, Settings, Confirmation, and the Undo:**
  - **Recommendation:** the Deletion section (`frames.ts:583`) is retitled "Trash & Archive" and gains "Confirm Before Archiving" (`confirmArchiving: flag(true)`) under Confirm Before Deletion; the Trash frame stays the Trash's. `waived(key, kind?)` serves both switches, and `confirmArchive` calls it with no kind, so `ALWAYS_ASKS` never reaches an archive. `confirmArchive` is its own export beside `confirmDelete` in `confirmations.ts`, sharing `ask`, `waived`, and `armed`: it asks unless waived, sends `{ op: 'archive', path, kind }`, and arms `notifyUndoable("Archived “…”")` by `bundled.bundlePath`, whose Undo spends itself and sends `{ op: 'restore', bundlePath }`. I-3 holds by construction. The Permanently Delete Files hint (`frames.ts:595`) is rewritten (K-5).
  - **Set Aside:** one `confirmDelete` body parameterized four ways; archiving a Set always asking (I-2); `notifyDeleted` taking a verb.
  - **Cost:** about +24.
- **5.7 Open Item 2, Copy:** Scout 5's *§Copy* stands as the proposal set for the plan's copy review (the archive question and notice, ActionLabel's bar and transformed lines, the step-aside lines, the delete-from-Archive question, the refusal, the settings hints, and the reader's labels), joined by `REFUSAL_TEXT['parent-gone']` (`spend.ts:52`), which reads false for an archived origin.

##### Across Lanes: Vocabulary

- **The Bundle Owner's Names:** `deletedPathOf` → `originPathOf`, `trashedPagesOf` → `originPagesOf`, `trashedPages` → `originPagesIn(root, store)`, and `deletedAtOf` → `storedAtOf`, matching the row's `storedAt` and the decision log's *Origin Record*. Scout 2's `heldPathOf`, `heldPagesOf`, and `heldPagesIn` are set aside: "held" means in-tree throughout (`heldTreeOf`, `Core/Nexus/heldPages.ts`, `HeldKind`, `idHeld`), the reason Scout 2 and Scout 4 both gave for refusing it as the owner's name.

---

#### Disagreements Resolved

- **The Resolver's Home:**
  - **Reports:** the brief framed Scout 2 as siding with the Investigation's `Core/Archive/archivePaths.ts`; Scout 2 in fact corrects the Investigation and puts the pure resolver in `Core/Paths/nexusPaths.ts` (its *§Corrected* and Call 2), as Scout 1 does. They differ only in shape: Scout 1 exports `archiveSegs(segs)`, Scout 2 an `inArchive`-free block plus an I/O `archiveDirs` in `Core/Archive/`, and Scout 2 also proposes `archiveDirRel` refusing a multi-segment id.
  - **Evidence:** `Core/Paths/exclusion.ts:1-9` already imports `nexusPaths.ts`, a leaf; `exclusion.ts:79` needs the segments below the Archive, which `archiveSegs` answers.
  - **Settled:** *1.2*. `archiveDirs` isn't exported; the open pass lists the directory inline. Path safety gates at the two places an id becomes a path from outside the host's own listing: the archive op gates the sidecar id on `isUlidShaped` (`Core/Nexus/identityMark.ts:16-18`, the tile handlers' precedent at `Core/Tiles/handlers.ts:26`, `:35`), and the `bundles:list` handler gates the renderer-supplied id the same way; `record.archive` passes `storeOf` and `resolveUnderRoot`.
- **`readIndexedStats` Before the Seed:**
  - **Reports:** Scouts 1 and 5 against the Investigation.
  - **Evidence:** `contentIndex.ts:50-58`, `:60-63`, `:92-94`; `indexSeed.ts:253`.
  - **Settled:** it answers before the seed; the by-id map needs no "index not ready" fallback, only the no-store one (*1.5*). Writes answer BUSY while an adoption runs (`Core/Contract/handlers.ts:99-111`; `Core/Nexus/session.ts:15-23`), and the launch's open completes before the window and watcher start (`Desktop/main.ts:389`, `:405`, `:408`) (Scout 1).
- **Whether the Unarchive Rides `addressed`:**
  - **Reports:** Scout 1 hoists the two-map relink beside `relink`; Scout 2 proposes `returningNames` in `settle.ts`; the brief and the Investigation assumed `addressed`.
  - **Evidence:** `mutate.ts:103-107` with `rewrite.ts:21-46` re-spells an arrival's collisions only; `spend.ts:229-247` is the two-map relink and its comment says why one map won't do.
  - **Settled:** the two proposals are one hoist; *2.10* takes Scout 2's shape and figure.
- **The Neutral Owner's Name and the Row's Host-Safety:**
  - **Reports:** Scout 2 names the domain `Core/Bundles/`; Scout 4 names the row `BundleRow`, the store union `BundleStore`, and the channel `bundles:list`, and warns the row must stay host-safe.
  - **Evidence:** `Core/Contract/bridge.ts:8` type-imports the row, and the engine graph follows type imports (`Core/Testing/engineGraph.ts:13-40`) and fails on any `.tsx` the host reaches (`engineGraph.test.ts:7-9`). Today the renderer imports the row from a type-only leaf (`Core/Trash/trashRow.ts`), the builders sit in `trashRows.ts`, and the bridge already type-imports host modules that hold code (`ClearReport` from `Core/Settings/exclusionScan.ts`, `MatrixGraphReply` from `Core/Matrix/matrixGraph.ts`).
  - **Settled:** the names agree. `BundleRow` and `BundleCrumb` sit with their builders in `Core/Bundles/rows.ts` (host code, no React), `BundleStore` with `layoutOf` in `Core/Bundles/bundle.ts`, and every React piece in `Core/Bundles/browser.ts`, which nothing host-side imports. Scout 2's two hook files and Scout 4's one browser file resolve to the one file, on `publish.ts`'s precedent for a non-`use` file holding hooks.
- **The Twin Rule:**
  - **Reports:** Scout 1 (none wins through one map) against the Investigation (three rules, the map adopting `writablePathsOf`'s).
  - **Evidence:** the four rules at `record.ts:48-56`, `heldPages.ts:8-13`, `keyHolders.ts:51`, `:61-66`, and `cascade.ts:107-121`.
  - **Settled:** *1.4*.
- **`frozenWorld`'s Tree-Only Reads:**
  - **Reports:** Scout 1's gap, which the Investigation's map didn't reach.
  - **Evidence:** `propertyValue.ts:187-197`; the five call sites under *§Verified at HEAD*.
  - **Settled:** the projection's `pages` half (*1.5*). Under the chain layout the residue Scout 1 left open, unrecorded path keys naming an archived page's origin chain, closes from the index alone (*The Archive's Layout*, below).
- **The Archive's Layout:**
  - **Reports:** the Investigation and Scout 2 recommend bundles flat under `.nexus/archive/<ID>/` with `origin.path` in the record; Scout 1 notes that a chain-mirrored layout makes the origin path algebra and places every archived page at its origin from the index. Neither the Investigation's options (a manifest or a flat bundle) nor Scout 2's alternatives (manifest, single anchor, index, tombstone, ancestry) weighed the chain.
  - **Evidence:** the Trash already derives an origin path from location (`deletedPathOf`, `Core/Trash/bundle.ts:22-24`) and mirrors the chain on mint (`trashChainDir`, `:14-20`); `listBundles` already recurses through non-bundle folders (`Core/Trash/holdings.ts:24-46`); `mkdir` is recursive (`Desktop/Platform/nodeMachine.ts:69-70`), so a chain or an E-3 re-mint creates its parents. Under the flat layout, Scout 2's own design needs a layout flag in `layoutOf` with branches in `frozenCrumbs` and the origin-path reader (its line "`frozenCrumbs` and `heldPathOf` both switch on the layout"), a stored `origin.path` read by F-5's chain mint, the frozen crumbs, and the delete from the Archive, and one record read per archive bundle at every reassign, Trash restore, and property restore for *1.5*'s `pages`, which a batch Trash restore multiplies by its size.
  - **Settled:** chain-mirrored (*2.1*). One layout, two roots, two suffixes: the layout flag and both branches leave, `originPagesOf` is today's `trashedPagesOf` with a store root, the record holds `trail` alone, and the refill sites read no record. The chain under an F-6 carry doesn't change, since it spells the archive-time path, and `record.archive` in a Trash record names a bundle path either way. The costs are deeper paths, the Collection's archive-time folder name appearing under its id (hidden, and correct for path keys written then), and empty chain folders left behind after restores and carries, as `.trash` leaves them today. This reverses an Investigation recommendation, not a decision, so it isn't a Contradiction.
- **The F-6 Observation Point:**
  - **Reports:** Scout 3 (one carry, three triggers) against F-6 INFERRED's single observation point; Scout 2's record supports it.
  - **Evidence:** only `relocate` raises `move` (`atomicWrite.ts:72`); the restore runs outside `addressed` (`mutate.ts:134-135`) through plain `relocate` (`spend.ts:213-220`); `deltaOf(undefined, tree)` records no departures for a session's first tree (`settle.ts:168`; `treeDelta.ts:41-57`); `payOutsideMoves` pairs page ids only (`settle.ts:270-304`).
  - **Settled:** *3.4*, disclosed under *§Contradictions*.
- **K-1's "The Carry Causes No Walk":**
  - **Reports:** Scout 3 against K-1's sentence and the Investigation's framing.
  - **Evidence:** `fileEvents.ts:502-509`, `:512-517`; `settle.ts:177`, `:181-185`; `fileEvents.test.ts:298`; `mutate.test.ts:3252`; `.claude/Features/DesktopPM.md:22`.
  - **Settled:** the counterpart rule meets K-1's named clause (the pre-written entry trips no walk-and-reseed of its own); the settings event's existing walk stays (*3.2*), disclosed under *§Contradictions* and put to Nathan as Question 6.
- **`applyMove` Seeing Own Moves Only:**
  - **Reports:** Scout 3 against the brief's "own and outside moves alike".
  - **Evidence:** `atomicWrite.ts:72`; `watcher.ts:126-130`; `fileEvents.ts:593`, `:607-613`; the one other `move` raiser is a test (`fileEvents.test.ts:314`).
  - **Settled:** own moves only, which is why `applyMove` can't be F-6's observation point.
- **`countPhrase`'s Casing:**
  - **Reports:** Scout 4 takes Title Case along; Scout 5 confirms the lowercase and puts it to Nathan.
  - **Evidence:** `TrashFrame.tsx:36-50`; `properties.ts:263`; `Core/Settings/TrashFrame.test.tsx:66`.
  - **Settled:** Title Case as a Take Along, matching `itemCount` and G-6's stated intent, with Question 18 confirming the Trash's report copy changes.
- **The History Restore's Look:**
  - **Reports:** G-6 says "the tint"; Scout 5 finds `filled`.
  - **Evidence:** `PageHistoryWindow.tsx:207-219`; `button-base.css.ts:184-190`.
  - **Settled:** verified fact. ActionLabel's Restore wears `filled`, an exact match; Question 16 asks only whether "tint" meant the accent `tinted` instead.
- **The G-7 Shape:**
  - **Reports:** Scout 5 recommends (c); the Investigation leaned toward one surface; Scout 4 assumed a host that yields.
  - **Evidence:** `NotificationLabel` is imported only by `App.tsx:21`; the transformed label is exactly what `notifyUndoable` posts (`notifications.ts:106-137`); two fixed boxes at one position can only slide past each other.
  - **Settled:** (c), *5.1*.
- **The `trashChanged` Successor:**
  - **Reports:** Scout 4's `storesChanged` through `changesStores(req)`; Scout 5's reader closes on "the Archive's change signal, shared with the Trash's".
  - **Evidence:** `nexusSlice.ts:70-71`, `:248-249`; `PropertyFrame.tsx:297`; a delete from the Archive changes both stores (E-3).
  - **Settled:** one `storesChanged` (*4.6*), which the reader also subscribes to.
- **Stale Trails (Scout 4's Question for Lane 2):**
  - **Reports:** Scout 4 offers re-listing on a container rename or move, or resolving trails renderer-side; Scout 2 didn't answer it.
  - **Evidence:** `ancestryOf` is renderer-side (`treeIndex.ts:10`, `:142-143`), so it can't serve the host's row builder; `homeResolves` runs `resolveRecord`, whose `id-live` check now reads the host-only by-id map (*1.5*); the per-row `containerTrailWhere` walk (`Core/Nexus/treePatch.ts:73-76`) runs per listing, which fires on user ops rather than tree pushes.
  - **Settled:** crumbs stay host-side, and `changesStores(req)`'s rename and `moveSet` arms re-list. An outside rename reaches an open ArchiveView at its next op or showing, as the Trash behaves today.
- **The Op Set:**
  - **Reports:** Scouts 1 and 5 name an `unarchive` op; Scout 2 routes one `restore` by store.
  - **Evidence:** `openBundle`'s store check already runs on every restore (`spend.ts:58-64`), and every browser path already keys by `bundlePath` (`TrashFrame.tsx:98-100`, `:117`; `confirmations.ts:40-46`).
  - **Settled:** `archive`, `restore` (routed), and `delete` (with the archive source), *2.6*; `confirmArchive`'s Undo sends `restore`, and `changesSettled` gains `archive` alone.
- **The Reader Slot's Shape:**
  - **Reports:** Scout 4's `openReader({ kind: 'archived', bundlePath })` is an example; Scout 5 owns the slot.
  - **Settled:** Scout 5's `{ kind: 'archive'; page; trail }` (*5.4*), so `Core/Session` takes no import from the bundle owner and both branches title the same way.
- **The Trail After In-Collection Moves:**
  - **Reports:** Scout 2's cautionary offers a write-time rewrite by the F-6 carry or a read-time look at an archived parent's own record, leaving the pick to the reconciler.
  - **Settled:** the write-time rewrite (*3.4*), which keeps F-6's "nothing derives at read time" and covers an origin trashed after its move, at one read of the Archive's records per observed Set move.
- **The Archive's Restore Move:**
  - **Reports:** Scout 2's sketch comments that "the lift's carry rides `relocateFolder` for a Set"; Scout 3 finds a restore carries nothing.
  - **Settled:** plain `relocate`; an archived Set holds nothing set aside (F-2), and a landing on a set-aside name steps aside through `freeOnDisk`.
- **The Delete From the Archive's Trash Chain:**
  - **Reports:** the Investigation mints it from the origin container's current path; Scout 2 from the archive-time origin path.
  - **Evidence:** path links naming an archived page keep their archive-time spelling, since `respellings` re-spells only pages the index of the tree holds.
  - **Settled:** the archive-time origin path, which the chain layout reads from the bundle's own location.
- **The Disposal Strip's Second Prefix:**
  - **Reports:** Scout 2 left to Lane 1 whether F-4 passes the Archive as a second excluded prefix or disposes before the strip.
  - **Evidence:** `deleteCascade` excludes one `abs` (`cascade.ts:80-81`); archived files are indexed, unlike trashed ones.
  - **Settled:** `deleteCascade` takes the roots that left (*2.7*).
- **`isTopSet`'s Home:**
  - **Reports:** Scout 4 places it beside `findSet` in `treeIndex.ts`.
  - **Settled:** `Core/Nexus/treePatch.ts`, host-safe, since `treeIndex.ts` reaches a renderer file.

---

#### Removal & Consolidation

Rough source lines, tests and docs excluded. A lane number names the call that costs it; moved lines appear on both sides where a scout counted them so.

| What | Where at HEAD | Change | Lane | Lines |
| --- | --- | --- | --- | --- |
| `keyHolderFiles`, `corpusUnder` | `Core/Properties/keyHolders.ts:12-18`; `Core/Index/indexSeed.ts:78-82` | Fold into `governedReach(root, candidates, only?)` | 1.3 | +11 / −12 |
| `collectionFolders` and its scope calls | `Core/Properties/assignment.ts:152-156`; `registryProperty.ts:126`; `deleteProperty.ts:82` | Moves beside governed reach; the scope callers stop calling it | 1.3 | −3 |
| `deletePlan`'s `folders` | `deleteProperty.ts:117-126`; `replaySchemaCascade.ts:60-61` | Dropped | 1.3 | −1 |
| `deleteCascade`'s tree filter and twin branch | `Core/Nexus/cascade.ts:101-121`, imports `:19`, `:32` | Governed reach plus the map's twin check; takes the roots that left | 1.3, 2.7 | +6 / −14 |
| `keyedHolders`' first-claimant `seen` | `keyHolders.ts:51`, `:62-66` | None wins through the map | 1.4 | +1 / −3 |
| `recordById(tree)` and `frozenWorld(pageIndexOf(tree))` at the refills | `assignment.ts:80-87`; `Core/Trash/spend.ts:185-186`, `:250`, `:290`; `restoreProperty.ts:56-58` | One projection, `nexusPages(root, tree)` | 1.5 | +15 / −4 |
| `recordById` and `id-live` | `Core/Nexus/record.ts:48-56`; `Core/Trash/resolve.ts:36-38` | `id-live` reads the map; `recordById` leaves | 1.5 | +4 / −9 |
| The by-id projection's no-store fallback | `heldPages.ts` | `?? scan` of the archive root | 1.5 | +3 |
| `outsideContent`'s hidden check | `Core/Paths/exclusion.ts:79` | `(archiveSegs(segs) ?? segs).some(hiddenFolder)` | 1.1 | ±0 |
| The resolver | `Core/Paths/nexusPaths.ts` | `ARCHIVE_DIR_REL`, `archiveDirRel`, `archiveSegs`, `archivedCollectionIdOf` | 1.2 | +6 |
| `NON_CORPUS_TOP` (K-5) | `nexusPaths.ts:7-8`; `Core/Settings/codec.ts:4`, `:51` | Inlined into its one reader, `nexusFolderRefusal`; the false comment leaves with the export | 1 | −2 |
| `corpusFiles` | `Core/Files/walk.ts:41-43` | Walks the archive root second | 1.1 | +3 |
| `sidecarsUnder` | `Core/Assets/assetMigrate.ts:158-165` | Hoisted to `walk.ts`, started at a given folder; shared with `reachConfig` | 1.1 | +1 |
| `normalizeSavedViews` (Take Along) | `Core/Nexus/migrateConfig.ts:45-53` | Walks the archive root beside `.trash` | 1.1 | +1 |
| `owningCollection` | `Core/Nexus/treePatch.ts:83-91` | The archive arm | 1.2 | +2 |
| `containersOf` | `Core/Nexus/configReach.ts:312-317`, `:342-354` | Archived Set sidecars and their ids | 1.6 | +7 |
| `sweepCount` | `Core/Properties/governedSweep.ts:113-114` | Archived files filtered before the dry run | 1.7 | +1 |
| `readMatrixGraph`, `index:headings` | `Core/Matrix/matrixGraph.ts:19-29`; `Core/Matrix/handlers.ts:22`; `Core/Nexus/handlers.ts:167-169` | Post-filtered to the held tree | 1.8 | +4 |
| `loadValues`, `folderCorpus` | `Core/Views/loadValues.ts:8-18`; `indexSeed.ts:84-87`, `:183` | Tree pages; `folderCorpus` inlined into its one caller | 1.8 | +2 / −4 |
| The two-map relink | `spend.ts:229-247` | `returningNames` in `Core/Nexus/settle.ts`, shared by both restores | 2.10 | +8 / −9 |
| The landing and `exists` refusals | `spend.ts:174-182` | `freeOnDisk`'s step-aside, one rule for both stores | 2.4 | +10 / −9 |
| `landedAs` | `Core/Nexus/mutateRequest.ts:12-20`; both restores | The title a restore took | 2.4 | +3 |
| `trashChainDir`, `mintBundle`, `BUNDLE_SUFFIX` | `Core/Trash/bundle.ts:11-39` | Store-parameterized in `Core/Bundles/bundle.ts` by `layoutOf` | 2.2 | −24 / +25 |
| `deletedPathOf` | `bundle.ts:22-24` | `originPathOf`, over the store's root | 2.2 | −3 / +3 |
| `deletedAtOf` | `trashRows.ts:12-19` | `storedAtOf`, the one time source | 2.2 | ±0 |
| `frozenCrumbs` | `trashRows.ts:21-29` | Strips the store's root as well as the Contexts prefix | 2.2 | −9 / +9 |
| `openBundle`'s Trash-only gate | `spend.ts:58-64` | `storeOf` plus the read | 2.2 | −7 / +10 |
| `listBundles`' fixed root | `Core/Trash/holdings.ts:24-46` | A store parameter | 2.2 | −23 / +23 |
| `trashedPages`, `trashedPagesOf` | `holdings.ts:69-96` | `originPagesIn(root, store)`, `originPagesOf`, shared by parking, F-4, and both restores | 2.2 | ±0 |
| `TrashRow`, `TrashCrumb`, `deletedAt` | `Core/Trash/trashRow.ts:5-28`; `Core/Contract/bridge.ts:8`, `:259` | `BundleRow`, `BundleCrumb`, `storedAt`, plus `icon?` | 4.2 | ±0 / +2 |
| `trashRow.ts`'s Trash Mode and `bundle.ts`'s Trash Mode half | `trashRow.ts:30-33`; `bundle.ts:41-80` | One file, `Core/Trash/trashMode.ts` | 2.2 | −1 file, ±0 |
| `writePropertyBundle` | `Core/Trash/record.ts:86-93` | Moves to its one caller, `Core/Properties/deleteProperty.ts` | 2.2 | ±0 |
| `appendLinks` | `record.ts:95-101` | Moves beside `parkLinks`, its one caller | 2.2 | ±0 |
| `gatherParentRef`, `gatherContentRecord` | `Core/Trash/gather.ts:24-29`, `:61-74` | Move to `Core/Bundles/record.ts`; gain `place` and `trail` | 2.1 | −20 / +28 |
| The record's new fields | `record.ts:33-44` | `place`, `trail`, `archive` | 2.1 | +5 |
| `resolveRecord`'s container arm | `resolve.ts:76-91` | Composes the order through `slotOf` and `spliceBeside` | 2.3 | +6 |
| `spliceBeside`, `Slot` | `Core/Views/creationOrder.ts:10-28` | Move to `Core/Nexus/order.ts` | 2.3 | ±0 |
| The departure drop | the archive op; `Core/Trash/delete.ts` after `:99` | `dropFromChildOrder`, as moves do | 2.3 | +2 |
| `withDestination` | `spend.ts:105-128` | Moves to the owner; drops `place`; gains the `archive` destination | 2.3, 2.6 | +4 |
| `restoreDestination` | `mutateRequest.ts:36` | Gains `{ kind: 'archive' }` | 2.6 | +2 |
| `MutateOutcome.trashed` | `mutateRequest.ts:16` | `bundled`, one field for both stores | 2.6 | ±0 |
| `goneEdit`'s container arm | `configReach.ts:288-297` | `goneContainers(ids)`, shared with the archived Set's delete | 2.6 | +5 |
| `restoreArtifact` | `spend.ts:143-323` | Split by phase; the reconcile and kind tails stay | 2.5 | ±0 |
| The delete from the Archive | `delete.ts` (the source) and `moveIntoStore` | One source built two ways; one cross-store move | 2.6 | +30 |
| The archive-destination Undo and the routing | `restoreArtifact`'s placement; `Core/Nexus/mutate.ts:134-135` | Re-mints by `record.archive`; `restore` routes by store | 2.6 | +11 |
| F-4 disposal | `spend.ts:83-101`; `delete.ts:46-48`, `:100-101` | One strip and one drop over the Collection's and its Archive's pages | 2.7 | +10 |
| F-5 and F-6's open pass | `Core/Archive/refile.ts` (new); `Core/Nexus/handlers.ts:99-104` | One pass per open, before the index seed | 2.8 | +24 |
| `followExcludedFolders`, `editExcluded` | `Core/Settings/settings.ts:90-106` | `carrySetAside`, written before the move and dropped after, for entries and `asset_directory` | 3.2 | −16 / +20 |
| `exclusionWriteRefusal` and its arms | `settings.ts:108-116`; `Core/Nexus/rename.ts:20-23`; `Core/Nexus/move.ts:50-53`; `delete.ts:41-44` | The carry's write is the refusal | 3.2 | −15 |
| `excludedWithin` | `settings.ts:86-88` | The lift reads the scope directly | 3.2 | −3 |
| `releaseExcludedFolders`, `reseatExcludedFolders` | `settings.ts:118-127` | Removed (F-3) | 3.5 | −9 |
| The record's `excluded` and its gather | `record.ts:3`, `:38-39`; `gather.ts:2`, `:72` | Removed (F-3) | 3.5 | −4 |
| The release at delete | `delete.ts:26`, `:109` | Removed (F-3) | 3.5 | −1 |
| The restore's refusal and reseat | `spend.ts:174-179`, `:214-220` | Removed; `relocate` takes no `landed` (F-3) | 3.5 | −4 |
| `relocateFolder` | `Core/Nexus/folderEntity.ts:30-32` | Runs the carry, returns a `Result`; its two wrappers pass it on | 3.2 | +6 |
| The lift | `folderEntity.ts` | `liftSetAside`, called by the archive op and `deleteOp` | 3.1 | +22 |
| `applyMove`'s corpus check | `Core/Nexus/fileEvents.ts:574-577` | The counterpart rule | 3.2 | ±1 |
| F-6's carry, observer, and restore trigger | `Core/Archive/refile.ts`; `settle.ts:166-170`; the restore | One carry, three triggers, the trail kept current | 3.4 | +29 |
| F-007 | `.claude/IssuesPM.md:13`, `:148-160`, `:1363` | Closed | 3.5 | docs |
| The Trash browser's controller | `Core/Settings/TrashFrame.tsx:36-56`, `:64-199`, `:254-263` | `useBundleBrowser`, `useDateColumn`, `countPhrase`, and the narrowing in `Core/Bundles/browser.ts` | 4.2 | −160 / +148 |
| The batch rule, twice | `TrashFrame.tsx:163`; `PageHistoryWindow.tsx:140` | `checkedIn`, `actedOn` in `UIX/Utilities/checkSet.ts` | 4.2 | −2 / +6 |
| Two restore menu builders | `Core/Actions/trashMenu.ts` (33), `Core/Actions/fileHistoryMenu.ts` (12) | One `Core/Actions/restoreMenu.ts` | 4.9 | −45 / +20 |
| `'trash:list'` | `bridge.ts:258-259`; `Core/Trash/handlers.ts:12-14` | `bundles:list(store)` in `Core/Bundles/handlers.ts` | 4.6 | +6 |
| `trashChanged` and its inline triple | `Core/Session/nexusSlice.ts:70-71`, `:248-249`; `PropertyFrame.tsx:297` | `storesChanged` through `changesStores(req)` | 4.6 | −2 / +8 |
| The `// PLACEHOLDER` More button | `Core/Views/Settings/ViewFrame.tsx:108-117` | Removed; the Archive button joins `leading` | 4.5 | −10 / +10 |
| `DELETE_ROW` alone in the closing groups | `Core/Actions/pageMenu.ts:104`, `:132` | `REMOVAL_ROWS` | 4.9 | +3 |
| Container and Space Delete literals, the bare `'delete'` | `Core/Actions/entityMenu.ts:33`, `:64-67`, `:95`; `entityMenuActions.ts:133` | `DELETE_ROW`, `REMOVAL_ROWS`, `'title:delete'`, `'title:archive'` | 4.9 | −5 / +5 |
| IconPicker's inline virtualizer | `UIX/Pickers/IconPicker.tsx:80-97` | `useVirtualRows`, the one TanStack seam | 4.7 | −14 / +24 |
| ViewMenu's inline depth rule | `ViewMenu.tsx:23` | `isTopSet(path)` in `treePatch.ts` | 4.3 | ±0 / +2 |
| `countPhrase`'s lowercase kinds (Take Along) | `TrashFrame.tsx:36-50` | Title Case, matching `itemCount` and G-6 | 4.2 | ±0 |
| `table-view.css`'s owner line | `Core/Views/Table/table-view.css:1` | Names both wearers | 4.1 | ±0 |
| `NotificationLabel` and its style and test | `Core/Interface/Notifications/` | Renamed ActionLabel; draws a notice or the shown surface's bar | 5.1 | +38 |
| `glyphSwap`, `glyphSwapFace` | `UIX/Symbols/symbols.css.ts:5-11` | Moved to `UIX/Animations/swap.css.ts` as the one face swap, with `Swap.tsx` | 5.2 | −7 / +27 |
| `LockGlyph`'s hand-stacked faces | `UIX/Symbols/index.tsx:263-286` | Drawn through `Swap` | 5.2 | −10 |
| `COPIED_MS`, `ACTIVE_MS` | `decorations.ts:208`; `useTimedLabel.ts:3` | One `DONE_MS` in `UIX/Animations/motion.ts` | 5.2 | −2 / +1 |
| `useTimedLabel` | `Core/Settings/useTimedLabel.ts` | Moved to `UIX/Animations/useTimedLabel.tsx`, returning a `Swap` label | 5.2 | +1 |
| The tally pill's overlay | `markdown-pm.css:1062-1077`; `decorations.ts:285-290` | The pill's faces take the swap classes; `copy()` toggles `data-face` | 5.2 | −12 / +2 |
| The notice's arming (K-3) | `NotificationLabel.tsx:60-74` | Unarmed until the pointer is seen outside the band | 5.3 | +2 |
| `historyTarget`, `openHistory`, `closeHistory` | `Core/Session/windowSlice.ts:30-32`, `:142-143`, `:279-281` | One typed `reader` slot reconciled by a `switch` | 5.4 | +8 |
| `PageHistoryWindow.tsx` | `Core/Interface/Windows/` | `PageReaderWindow.tsx`: a shared shell, two branches, the lock in both | 5.4 | +31 / −1 |
| `fetchPageDetail` for the Current Version | `PageHistoryWindow.tsx:18`, `:106` | A direct `page:open` in both branches | 5.4 | ±0 |
| `sweepSnapshots(cutoff)` and the open-time sweep | `Desktop/Store/versionsDb.ts:71-73`; `Core/Platform/stores.ts:89`; `Core/Pages/fileHistory.ts:194-203`; `Core/Nexus/handlers.ts:86` | One statement with both cutoffs, run after the seed | 5.5 | +5 |
| `writePersonalization` | `settings.ts:130-135` | Lowers a picked archive timeframe in the same write | 5.5 | +4 |
| `PickerOption`, `MenuDoor`'s rows, `steppedPickerProps` | `UIX/Pickers/PickerControl.tsx:10-20`, `:52-58`, `:103-108` | A disabled option; steps above `range.max` dimmed | 5.5 | +3 |
| `ZoomSpec`, `useRowValue`, `ZoomRow` and the keys | `Core/Settings/frames.ts:85-87`; `SettingsWindow.tsx:226-266`; `personalization.ts` | A row bounded by and following another stepped key | 5.5 | +15 |
| `waived(kind?)`, `spendBundle` | `confirmations.ts:36-46`; `TrashFrame.tsx:15`, `:100`, `:121` | `waived(key, kind?)`; `spendUndo(key)` | 5.6 | +1 |
| `confirmArchive` and its setting | `confirmations.ts`; `frames.ts:583-604`; `personalization.ts` | Its own export; "Trash & Archive" with Confirm Before Archiving | 5.6 | +23 |
| The Permanently Delete Files hint (K-5) | `frames.ts:595` | Rewritten to what the setting does | 5.6 | ±0 |
| The Confirm Before Deletion hint (Take Along) | `frames.ts:589` | Names Contexts and Spaces, which `ALWAYS_ASKS` already asks for (`confirmations.ts:29-34`) | 5.6 | ±0 |
| `confirmDelete`'s "system Trash" (Take Along) | `confirmations.ts:78` | "system trash", as `askEmptyTrash` and the hints write it | 5.6 | ±0 |
| Filled's fill in the UIX doc (Take Along) | `.claude/Features/PommoraUIX.md:229` | `--fill-secondary` | 5 | docs |
| `mutateRequest.ts:88`, `Core/Actions/destinationTree.ts:1` (K-5) | comments | Rewritten to read true | 2, 4 | 0 |

---

#### File Placement

Every file the work adds, moves, renames, splits, or removes.

| File | Change | Home and Why |
| --- | --- | --- |
| `Core/Bundles/bundle.ts` | New, from `Core/Trash/bundle.ts:11-39`, `holdings.ts:18-96`, `record.ts:110-113`, `spend.ts:58-64` | The bundle format both stores share: `BundleStore`, `layoutOf`, `storeOf`, `fileStamp`, `stampedLeaf`, `mintBundle`, `bundleArtifact`, `ListedBundle`, `listBundles`, `openBundle`, `originPathOf`, `storedAtOf`, `contentPages`, `pageIdsOf`, `originPagesIn`, `originPagesOf`, `moveIntoStore`. One owner beside both stores (A-4). |
| `Core/Bundles/record.ts` | New, from `Core/Trash/record.ts:11-84`, `:103-108` and `gather.ts:24-29`, `:61-74` | The record union, `RecordFile`, `ParentRef`, `readRecord`, `writeRecord`, `gatherParentRef`, `gatherContentRecord` with `place` and `trail`; both stores build a live item's record. |
| `Core/Bundles/placement.ts` | New, from `Core/Trash/resolve.ts` (whole) and `spend.ts:51-56`, `:105-128` | `resolveRecord`, `findContainerById`, `Refusal`, `ArtifactRecord`, `REFUSAL_TEXT`, `withDestination`, `placeRecord`, `slotOf`, `freeOnDisk`: where any bundle lands. |
| `Core/Bundles/rows.ts` | New, from `Core/Trash/trashRows.ts` (whole) and `trashRow.ts:5-28` | `BundleRow`, `BundleCrumb`, the row builders, `liveCrumbs`, `frozenCrumbs`, `homeResolvesFor`; host code with no React, so the bridge's type import stays engine-safe. |
| `Core/Bundles/browser.ts` | New, from `TrashFrame.tsx:36-56`, `:64-199`, `:254-263` | Renderer-only: `useBundleBrowser`, `useDateColumn`, `countPhrase`, the narrowing; one home for what both browsers present, never imported host-side. |
| `Core/Bundles/handlers.ts` | New, from `Core/Trash/handlers.ts:12-14` | `bundles:list(store)`, beside the format it lists. |
| `Core/Trash/bundle.ts` | Removed (split) | Its bundle half goes to `Core/Bundles/bundle.ts`, its Trash Mode half to `trashMode.ts`. |
| `Core/Trash/trashMode.ts` | New, from `Core/Trash/bundle.ts:41-80` and `trashRow.ts:30-33` | `TrashMode`, `DEFAULT_TRASH_MODE`, `trashDeps`, `discardFile`: where a deletion goes, the Trash's alone. |
| `Core/Trash/trashRow.ts`, `Core/Trash/trashRows.ts`, `Core/Trash/resolve.ts` | Removed | Moved whole into the owner. |
| `Core/Trash/record.ts` | Removed | Its format moves to the owner; `writePropertyBundle` to `deleteProperty.ts`, `appendLinks` to `holdings.ts`. |
| `Core/Trash/gather.ts`, `holdings.ts`, `spend.ts`, `delete.ts`, `handlers.ts` | Narrowed | What stays is the Trash's own model: link targets and Space and Context records; parking and refill; emptying, the reconcile, the kind tails, `reapply`; the delete with its two sources; `delete:facts`. |
| `Core/Archive/archive.ts` | New | `archiveOp` (the ULID gate, the lift, `gatherContentRecord`, the mint into the Archive, the relocate, the departure drop, the `bundled` reply) and `restoreArchived`: the Archive's own ops (A-4). |
| `Core/Archive/refile.ts` | New | `refileArchived` (F-6's carry and trail rewrite) and `settleArchives` (the open pass: F-5's orphans and F-6's re-file); every move of an archived record between stores or Archives that the Archive starts. |
| `Core/Archive/ArchiveView.tsx` | New | The table place (G-1 to G-3), its rows, search, count, bar declaration, and opener. |
| `Core/Archive/archive-view.css` | New | The title-over-trail stack, the virtual list's positioning, and the trailing label. |
| `Core/Archive/archivePlace.ts` | New | `ARCHIVE_ICON` and `archiveOwnerOf`, on `Core/Matrix/matrixKind.ts`'s precedent for a place that isn't a node. |
| `Core/Paths/nexusPaths.ts` | Edited | The resolver block, beside every other `.nexus` location; `NON_CORPUS_TOP` leaves. |
| `Core/Nexus/order.ts` | Edited | Gains `spliceBeside` and `Slot` from `Core/Views/creationOrder.ts:10-28`, the one home for reading and splicing an id list; `creationOrder.ts` re-imports them. |
| `Core/Nexus/settle.ts` | Edited | Gains `returningNames` beside `relink`, and the F-6 observer at the tree comparison. |
| `Core/Nexus/treePatch.ts` | Edited | Gains `isTopSet` and `owningCollection`'s archive arm; host-safe, unlike `treeIndex.ts`. |
| `Core/Nexus/heldPages.ts` | Edited | Gains `nexusPages`, the by-id projection beside the held tree's lookups. |
| `Core/Nexus/folderEntity.ts` | Edited | Gains `liftSetAside`; `relocateFolder` runs the carry. |
| `Core/Properties/keyHolders.ts` | Edited | `governedReach` replaces `keyHolderFiles`; gains `collectionFolders` from `assignment.ts:152-156`. |
| `Core/Files/walk.ts` | Edited | Gains `sidecarsUnder` from `assetMigrate.ts:158-165`; `corpusFiles` walks two roots. |
| `Core/Actions/restoreMenu.ts` | New, replacing `Core/Actions/trashMenu.ts` and `Core/Actions/fileHistoryMenu.ts` (both removed) | One Restore and Delete builder (K-4). |
| `Core/Interface/Notifications/ActionLabel.tsx`, `action-label.css.ts`, `ActionLabel.test.tsx` | Renamed from `NotificationLabel.tsx`, `notification-label.css.ts`, `NotificationLabel.test.tsx` | The frame's one top-right label, the log's own term (G-7); `App.tsx:21`, `:198` follow. `notifications.ts` keeps its name and gains the bar's channel; the folder keeps its name for its 38 importers. |
| `Core/Interface/Windows/PageReaderWindow.tsx` | Renamed from `PageHistoryWindow.tsx` | The one read-only reader (H-1); `App.tsx:16`, `:191` follow. |
| `UIX/Animations/Swap.tsx`, `UIX/Animations/swap.css.ts` | New; the CSS moves from `UIX/Symbols/symbols.css.ts:5-11` | The one face swap, a motion primitive beside `Reveal`, used by Symbols, Settings, the label, and the code block. |
| `UIX/Animations/useTimedLabel.tsx` | Moved from `Core/Settings/useTimedLabel.ts` | The acknowledgement hold over `DONE_MS`, beside the swap it returns. |
| `UIX/Interactions/virtualRows.ts` | New | The one seam over `@tanstack/react-virtual`, under the Dependencies rule. |
| `Core/Actions/restoreMenu.test.ts` | New, merging `trashMenu.test.ts` and `fileHistoryMenu.test.ts` | Follows its builder. |

---

#### Reusable

- **The Corpus, Index, and Watch:** `relCorpusPath`, `indexWrittenPage`, `deindexPath`, and `moveIndexPaths` (`indexSeed.ts:89-190`), the watcher, `manifestAdmits`, and `feedRename` carry archived pages unchanged once the arm admits them; `readIndexedStats(ARCHIVE_DIR_REL)` is the Archive's half of the by-id map and the history sweep's id source.
- **Twins, Owners, and Container Pages:** `writablePathsOf`'s null-on-twin rule (`heldPages.ts:8-13`), `owningCollection` (`treePatch.ts:83-91`), and `pagePathsIn` and `containerAt` (`treePatch.ts:101-105`).
- **The Frozen World:** `frozenWorld` and `gonePageEntry` (`propertyValue.ts:187-208`) take any index.
- **The Restore's Relink:** `respellings` (`rewrite.ts:21-46`) and the Trash restore's two-map composition (`spend.ts:229-247`).
- **The Bundle Format:** `trashChainDir`, `deletedPathOf`, `mintBundle`, `listBundles`, `bundleArtifact`, `trashRowOf`, `frozenCrumbs`, and the stamp parse serve the Archive once given a store root and suffix; `contentRecord`, `gatherContentRecord`, and `resolveRecord`'s container arm serve it beyond `place` and `trail`; `withDestination` and `containerTargets` serve a homeless row.
- **Order:** `setChildOrder`, `dropFromChildOrder` (`Core/Nexus/reorder.ts:66-79`), `spliceBeside`, and `nextOrder` (`UIX/Utilities/moveItem.ts:29-38`); the Context record's place and restore-at-end are the precedent (`spend.test.ts:187-238`).
- **Naming:** `createDisambiguated` (`names.ts:66-79`), `freeName` (`:56-64`), `listEntries` (`walk.ts:13-19`), and `heldName` (`atomicWrite.ts:340-345`).
- **The Write-Ahead Delete:** `deleteOp`'s record-ahead, relocate, strip, and final-record order (`delete.ts:45-108`).
- **Excluded Paths:** `entryWithin`, `remainderUnder`, and `excludedMatcher` (`exclusion.ts:93-119`); `updateNexusConfig`'s `Result` (`atomicWrite.ts:265-271`); `writeExcludedFolders`, `normalizeExclusions`, and `readWatchScope`; `relocate`'s `landed`, which runs before sync hears of the rename (`atomicWrite.ts:61-75`).
- **Crossing Detection:** `deltaOf`'s path-keyed difference (`treeDelta.ts:13-58`) and Collection ids through `owningCollection`.
- **The Sheet and Shell:** `UIX/Table/table.css`'s classes, `table-view.css:3-75`, and the Core rules keyed on them; `InterfaceScaffold`, `EntityBanner`, `DetailTitleHeader`, and `containerOwner` (`treeIndex.ts:255-264`); `EntityIcon`, `NavTrail`, `Checkbox size="compact"`, `data-reveal-host="on"`, and `usePublishCount`.
- **The Footing:** `MenuFooting`, `FootingCreate`, and `Button type="filled" size="button-inline" pressed`.
- **Navigation:** `navKey`, `tabKey`, `openTab`, `pruneHistory`, `recordRecent`, and `resolveIndexOf`.
- **The Date Column and Search:** `styleMenuItems`, `parseStyleAction`, `resolveStyle`, `storedPick`, `holdsStyle`, `dateDefaults`, `useNexusForms`, `formatDate`; `matchQuery`, `matchKey`, and `matchScore` (`Core/Paths/caseFold.ts:46-68`).
- **Batches:** `notifyReport`, `unrestoredLine`, `flushAllSaves`, `changesSettled`, `destinationRows`, and `containerTargets`.
- **The Notice and Undo:** `notifyUndoable` with the chord and dwell (`notifications.ts:106-137`), the store-free `channel` (`UIX/Utilities/subscribable.ts:27-39`), `useContentHost()?.parked`, `paneSlide`, `useHeld`, `Segments`, `trackNear`, and `withinBox`.
- **The Read-Only Window:** `useHeldPresence`, `useWindowGeometry`, `WindowBase`'s `lead` slot (`UIX/Windows/WindowBase.tsx:243-254`), `useConnections('inert')`, `useEditorHost({ inert: true })`, `MarkdownEditor readOnly`, the sentinel ancestor, and `dialer().ask('page:open', path)`.
- **Settings:** `setting`, `numberCheck`, `settingOf`, `steppedPickerProps`, and `ActionItem.disabled`, which both menu renderers honor (`Core/Actions/menuModel.ts:6`; `Desktop/Actions/menu.ts:24`; `Core/Interface/Menus/MenuPresenter.tsx:44`).
- **The Settle Turn:** `inSettleTurn` wraps the archive op and the Archive's restore (`mutate.ts:129-135`).

---

#### What Becomes False

##### Tests

- **`Core/Paths/exclusion.test.ts`:** outsideContent › "refuses hidden and package folders at any depth, and hidden names" (`:19`) gains the arm: an archived page admitted, `…/Beta/_raw/X.md` hidden, `.nexus` still hidden.
- **`Core/Files/walk.test.ts`:** corpusFiles › "never reads inside `.trash`, `.nexus`, or an excluded folder" (`:69`) stops being true by name, its read spy gaining `.nexus/archive`; "yields the cascade corpus minus exclusions, as nexus-relative POSIX paths" (`:46`) gains an archived page.
- **`Core/Index/indexSeed.test.ts`:** new cases for `relCorpusPath` admitting archived paths, `moveIndexPaths` into and out of the Archive, and the seed walking it.
- **`Core/Properties/keyHolders.test.ts`:** the keyHolderFiles describe (`:62-152`), including "answers the queried holders intersected with the scope folders" (`:63`) and "with no index it answers the corpus intersected the same way" (`:146`), becomes `governedReach`; keyedHolders › "files no value for a page holding another casing of the key" (`:155`) takes the map.
- **`Core/Nexus/cascade.test.ts`:** the strip gains archived holders and keeps a value an archived page answers; "never reaches a loose file outside every Collection" (`:586`) stays.
- **`Core/Trash/deleteReach.test.ts`:** "leaves an ID-less linker the tree doesn’t hold unstamped and byte-identical" (`:113`) and "leaves two linkers sharing one ID as they were, since a restore couldn’t tell them apart" (`:125`) stay; the tree-held source assumption gains the archive source.
- **`Core/Nexus/heldPages.test.ts`:** "an id two files claim answers no path to a writer" (`:54`) stays; the projection gains its own cases.
- **`Core/Properties/governedSweep.test.ts`:** `describe('sweepCount')` (`:118`) gains the archive filter.
- **`Core/Properties/assignment.test.ts`, `Core/Trash/restoreProperty.test.ts`:** refills reach archived ids, and the frozen world holds archived targets.
- **`Core/Trash/spend.test.ts`:**
  - "an occupant the tree cannot see refuses the restore — never a clobber" (`:1506`) and "a Set restored onto a folder Settings excludes refuses, the bundle intact" (`:1527`) become step-aside cases.
  - "only a trash bundle restores — an in-nexus path refuses" (`:1542`) keeps refusing through `storeOf`, while an archive bundle now routes.
  - The `emptyBundle` refusals at `:1770` and `:1791` keep refusing through `storeOf`.
  - The `resolveRecord` describe (`:734-916`) moves its imports to `Core/Bundles/placement.ts` and gains the composed order; "disambiguates a taken title, matching the create convention" (`:784`) stays.
  - "restore — into a chosen destination" (`:1854-2148`) gains the `archive` destination and `place` dropped on a picked destination.
  - The record cases (`:104-185`) gain `place` and `trail` assertions; `:1287` and `:1373` still pin the hoisted relink.
- **`Core/Trash/trashRows.test.ts`:** "trashRows — a bundle as the browser reads it" (`:64`) becomes the owner's rows; "a missing parent falls back to the frozen chain and says its home is gone" (`:121`) gains an archive store's chain; "reads the deletion time out of the bundle stamp, newest first" (`:167`) becomes `storedAt`; `describe('deletedPathOf')` (`:234`) becomes `originPathOf`.
- **`Core/Trash/deleteOrder.test.ts`:** "the record is written before the destruction it describes" (`:154-220`) gains the archive source.
- **`Core/Trash/trashRecovery.test.ts`:** "a page deleted and restored comes back where it was, and leaves the list" (`:122`) pins the exact slot; `TrashRow` and `deletedAt` (`:13`, `:34`) rename.
- **`Core/Nexus/treePatch.test.ts`, `Core/Properties/repairSweep.test.ts`:** `owningCollection`'s arm, and an archived re-read reconciled against its Collection.
- **`Core/Matrix/matrixGraph.test.ts`:** readMatrixGraph (`:58-155`) gains `root` and a held tree in every case, plus "drops rows the tree doesn't hold".
- **`Core/Views/loadValues.test.ts`:** "maps page id → frontmatter across the container and its nested Sets" (`:22`) and every no-id case need a held tree.
- **`Core/Nexus/configReach.test.ts`, `Core/Nexus/migrateConfig.test.ts`, `Core/Assets/assetMigrate.test.ts`:** each gains archived Set sidecars, and the migration archived pages.
- **`Core/Nexus/mutate.test.ts`:**
  - "rewrites an entry under a renamed Collection and rescopes the session" (`:3252`) stays while the walk stays (Question 6).
  - "refuses a landing that carries excluded entries while settings.json can’t be written" (`:3276`) stays, the carry's write now refusing.
  - "refuses a Set moved, or a Collection restored, with excluded entries while settings.json can’t be written" (`:3300`) keeps its Set half and inverts its Collection-restore half, becoming "refuses a Set moved with excluded entries while settings.json can’t be written".
  - "takes a trashed Collection’s entries with it and lands them wherever it is restored" (`:3334`) becomes the lift to the root, its entry following and the restore landing without it.
  - "reports a Collection delete and its restore to Sync as one rename each, the restore after its entries hold again" (`:3362`) becomes three renames under settings that already exclude the lifted folder, its `wrote.filter(inside)` narrowed.
  - "carries an entry with a moved Set" (`:3412`) stays and gains an asset-directory sibling; `:3425` and `:3437` stay.
  - New cases: the write order, a case-only rename, the lift (landing, collisions, nesting, the asset directory, system mode, missing folders), and the departure drop beside "movePage drops the page's id from the source folder's page_order" (`:792`).
- **`Core/Nexus/fileEvents.test.ts`:** "a folder landing over an excluded entry beneath it owes the walk and the reseed, and no new watch" (`:307`) and "an exclusion change in settings lands the scope at once and owes the walk and the rescope" (`:298`) stay; a sibling covers a landing whose entries were carried ahead.
- **`Core/Settings/settings.test.ts`:** gains `carrySetAside` cases and the `historyDays` write lowering a picked archive timeframe.
- **`Core/Settings/TrashFrame.test.tsx`:** the `filterRows` (`:33-64`) and `countPhrase` (`:66-85`) describes move with the hoist, `countPhrase`'s expectations flipping to Title Case; the `'trash:list'` mocks (`:93`, `:138`, `:276`) become `bundles:list` with `{ kind: 'trash' }`; the DOM cases stay.
- **Menu Tests:**
  - `Core/Actions/pageMenu.test.ts` › "groups its rows, with Reveal joining History only where it is asked for" (`:15`) and "hold Rename, the send and locate rows as one group without Move To, and Delete" (`:87`) gain Archive before Delete.
  - `Core/Actions/entityMenu.test.ts` › "a page draws the whole page menu, Reveal included" (`:20`) gains `'title:archive'`; "a sidebar collection opens, creates, renames, deletes, locks, copies its path, and reveals in four groups" (`:41`) moves Delete to its own last group and reads five groups; "a band set neither opens nor locks, and a context without creators starts at Rename" (`:62`) takes the Set's new shape.
  - `Core/Actions/cellMenu.test.ts` › "title: Preview + stateful Open row + Rename + Edit Icon + New Page pair + the send block + separator-gated Delete" (`:8`) and `Core/Actions/cardMenu.test.ts` › "lists the page-meta actions with one New Page — the grid has no above" (`:5`) gain Archive, the separator moving to it.
  - `Core/Actions/trashMenu.test.ts` and `Core/Actions/fileHistoryMenu.test.ts` collapse into `restoreMenu.test.ts`.
- **`Core/Nexus/treeIndex.test.ts`:** resolveIndexOf › "holds display cores for the homepage, the Matrix, spaces, collections, sets, and pages — never groups" (`:68`) gains the archive place.
- **`Core/Interface/Subfield/subfieldItems.test.ts`:** the registry case gains the archive kind's `['count']`.
- **`Core/Navigation/navRef.test.ts`, `Core/Navigation/tabsModel.test.ts`, `Core/Views/Settings/ViewFrame.test.tsx`:** new cases only.
- **`Core/Interface/Notifications/NotificationLabel.test.tsx`:** renamed `ActionLabel.test.tsx`; "stalls within its band and drains once the pointer leaves it" (`:76`) and "holds where it stands through a press" (`:85`) both open inside the band, which no longer arms, so each moves outside first; new cases for a notice posted under the pointer and a declared bar that shows, yields, returns, and withdraws when parked.
- **`Core/Session/windowSlice.test.ts`:** "keeps the history window while the tree holds its page, and closes it once the page is gone" (`:22`) and "re-keys a window tab and the history target to the page now at their path" (`:36`) move to the `reader` slot; a new case keeps an archive reader through a tree change.
- **`Core/Session/devicePrefsSeed.test.tsx`:** `openHistory` and `historyTarget` (`:227`, `:242`) become `openReader` and `reader`.
- **`Core/Settings/NexusRows.test.tsx`:** `button(label)` matches `textContent` (`:69-70`), which reads both faces once the label is a `Swap`, so the finder matches the shown face.
- **`Core/Testing/storesContract.ts`:** "sweeps snapshots older than a cutoff" (`:356`) takes the new signature and an archived-id case; `Core/Testing/memoryStores.ts:232-237` follows.
- **`Core/Pages/fileHistory.test.ts`:** `describe('sweepFileHistory')` (`:365`) gains an archived page swept at the shorter cutoff and a live twin kept.
- **`Core/Settings/handlers.test.ts`:** the archive key triggers the sweep.
- **`Core/Interface/Confirm/confirmations.test.ts`:** "gives up its Undo and the chord once the Trash spends its bundle" (`:184`) calls `spendUndo`; new cases for `confirmArchive`.
- **`Core/MarkdownPM/codeDiff.test.tsx`:** "reads Copied when clicked, unless a tally takes the word" (`:58`) holds while the host keeps `.is-copied`; a tally case asserts `data-face`.
- **`UIX/Pickers/PickerControl.typeable.test.tsx`:** "a left press opens the list through the door, marked on the current value" (`:82`) gains `disabled` on the door rows; a new case covers a step above the cap.
- **`UIX/Pickers/IconPicker.test.tsx`:** stands.

##### Comments

- `Core/Paths/nexusPaths.ts:7`: leaves with `NON_CORPUS_TOP` (K-5).
- `Core/Paths/exclusion.ts:76`: `outsideContent`'s doc gains the Archive.
- `Core/Files/walk.ts:31`: "held to the same hidden-name rule as the content walk", which the content walk no longer is.
- `Core/Properties/keyHolders.ts:1`: becomes governed reach's reason; `:47`'s "whose ID another already took" becomes none wins.
- `Core/Nexus/cascade.ts:72`: "from the pages and Spaces the tree holds"; `:101`: leaves with its filter.
- `Core/Nexus/heldPages.ts:1`: names the projection beside the held tree's lookups.
- `Core/Nexus/treePatch.ts:83`: "since Collections sit only at the Nexus root" gains the Archive a path is filed in.
- `Core/Trash/holdings.ts:1`: loses the listing; `:143`: `refillTrashed` stops being the catch-all for ids found nowhere.
- `Core/Nexus/migrateConfig.ts:45`: "only the Trash and the tile documents are walked here".
- `Core/Matrix/matrixGraph.ts:18`: gains the tree trim.
- `Core/Properties/governedSweep.ts:150`: "found where `roots` places it" names the map.
- `Core/Trash/spend.ts:180`: the squatter refusal's comment leaves; `:229`: moves with `returningNames`.
- `Core/Nexus/settle.ts:248`: "The one re-spell" names its returning sibling.
- `Core/Nexus/mutateRequest.ts:88`: both sentences (K-5).
- `Core/Trash/bundle.ts:13`, `:22`: move with their functions, generalized to the store's root.
- `Core/Trash/trashRow.ts:11`: "the renderer never sees a `.deleted` suffix" names either suffix.
- `Core/Trash/trashRows.ts:21`: "`.trash` mirrors the nexus faithfully" names either store's root.
- `Core/Trash/resolve.ts:1`, `:30`: "every name and title choice is made here" becomes the tree's choice, with the landing stepping further aside past the disk.
- `Core/Trash/record.ts:38`: leaves with `excluded`.
- `Core/Interface/Confirm/confirmations.ts:28`: `ALWAYS_ASKS` governs deletes alone; `:42`: the spend names any undone act.
- `Core/Nexus/folderEntity.ts:30`: the carry's timing and the asset directory.
- `Core/Nexus/fileEvents.ts:574`: "with no settings write to report it" becomes the counterpart rule.
- `Core/Settings/settings.ts:86`, `:97`, `:108`, `:118`, `:125`: leave with their functions.
- `Core/Contract/bridge.ts:258`: "`.trash` is outside the watcher" (the Archive is inside it, and one channel serves both).
- `Core/Session/nexusSlice.ts:70`: "so an open Trash list reads again" names both browsers.
- `Core/Actions/trashMenu.ts:9`: leaves with its file, the rule moving to `actedOn`.
- `Core/Settings/TrashFrame.tsx:162`: moves to `actedOn`.
- `Core/Views/Settings/ViewMenu.tsx:15`: "Renders only on a Collection / depth-1 Set" gains the archive place.
- `Core/Views/Table/table-view.css:1`: names both wearers.
- `UIX/Table/table.css:18`: "TableView's .col-header and the Trash's head both inherit it" gains ArchiveView's.
- `Core/Actions/destinationTree.ts:1`: "the trash's Restore ▸" names both stores (K-5).
- `Core/Interface/Notifications/NotificationLabel.tsx:60`: gains K-3's arming.
- `Core/Interface/Notifications/notifications.ts:1`: names the bar's channel beside the notice.
- `Core/Interface/Windows/PageHistoryWindow.tsx:35`: "embeds inside a snapshot" becomes "embeds inside the reader".
- `Core/Interface/Windows/page-window.css:30`: "A snapshot is a record" becomes the read-only page.
- `Core/MarkdownPM/markdown-pm.css:1051`: names the shared swap for the pill and the reasons the name and glyph slot keep their own.
- **Stay True:** `Core/Nexus/liveTree.ts:79` (the delete's seam sits in `deleteOp`), `Core/Files/atomicWrite.ts:61`, `Core/Sync/Client/session.ts:135`, `Core/Nexus/folderEntity.ts:19`, and `Core/Settings/TrashFrame.tsx:58`.

##### Docs

- **`.claude/Features/CorePM.md`:** `:29` (the tree diagram gains `.nexus/archive/<id>/`); `:69` (*§Folder Exclusion*: the Archive as the one hidden folder read as content, "Un-adopted folders … are indexed and cascade-reachable" true for content reach only, "Renaming or moving one carries every excluded entry" gaining the asset directory, and "Trashing one takes those entries into its Trash record" becoming the lift); `:73` (the asset directory follows a rename or move and is left behind on archive and trash); `:87` (the delete's archive source); `:114`, `:120` (`PageHistoryWindow.tsx` and its name); `:118`, `:158` (the sweep after the seed with two cutoffs); `:143` (the metadata lifetime row gains an emptied Collection's Archive). `:108` stays true.
- **`.claude/Features/NexusRecordPM.md`:** `:4` (provenance in every bundle of either store, at `Core/Bundles/`); `:8` (Archive bundles mirror their chain under their Collection's Archive, and records name their place and trail); `:10` (the payload gains `place`, `trail`, and `archive`, and loses `excluded`); `:14` (a landing steps aside past the disk and returns to its place); `:16` stays the Trash frame's.
- **`.claude/Features/ConfigurationPM.md`:** `:109` (the asset directory's following, optional); `:111-117` (Deletion becomes Trash & Archive with Confirm Before Archiving, `:115`'s description matching the rewritten hint); `:124` (History Timeframe gains its archive sibling); `:126` (Cleared now a cross-fade); `:217-221` (an Archive Date Column row joins); `:259` (entries carried on rename and move, left behind with their folders on archive and trash, the asset directory alike, and a restore carrying nothing).
- **`.claude/Features/DesktopPM.md:22`:** becomes false only if Question 6 goes incremental.
- **`.claude/IssuesPM.md`:** F-007 (`:13`, `:148-160`, `:1363`) closes; F-080 (`:1054`, `[^80]` `:1436`): the refusal text goes, "Decision 33" becomes E-4, and the citation moves to `Core/Bundles/placement.ts`; F-038 (`:896`, `[^38]` `:1394`): citations follow `originPagesIn`, and the shared runner is where its one-request batch lands.
- **`.claude/Features/ViewTypesPM.md`:** `:61` (the footer gains the Archive button); `:75` (ArchiveView's title carries the search too); `:95` (TableView and ArchiveView share the layer); `:175` (gains the seam the renderers would ride). `:71` and `:97` stay true.
- **`.claude/Features/PommoraUIX.md`:** `:54` (`checkSet` gains the batch rule); `:203-217` (the Animations table gains `Swap` and `DONE_MS`); `:229` (Filled's fill); `:317-319` (*§Interactions* gains `useVirtualRows`); `:387` (`LockGlyph` names `Swap`); `:391` (`UIX/Table/`'s wearers gain ArchiveView).
- **`.claude/Features/InterfacePM.md`:** `:8` and `:12` (ArchiveView's title search and the ViewMenu on the archive place); `:48` (the reader window in **All**'s scrollbar list); `:58` (the reader window's name and role, the window count holding at seven); `:80` (`ActionLabel.tsx`, the declared bar, archiving beside deletion, ArchiveView's spend, K-3's arming).
- **`.claude/Features/NavigationPM.md:30`:** iconography gains the archive tab's glyph and title.
- **`.claude/CLAUDE.md` (project):** *§Codebase Structure* gains `// Archive` and `// Bundles`, and `// Trash` reads as deletion, Trash Mode, and the restore reconcile.
- ***Archive — Investigation*:** `:68` and `:336` (the index before the seed); `:251` (the settle's relink "re-spells for an unarchive's arrival"); `:294` (the resolver's home and exports); `:306-310` (the flat layout).
- ***Archive — Decisions & Intention*:** *§Prospects › The Mark Model*'s migration line (`:225`) spells the bundles flat, `.nexus/archive/<ID>/<stamp>__Name.archived/`, which the chain layout makes `.nexus/archive/<ID>/<chain>/<stamp>__Name.archived/`. The *§Contradictions* items below touch K-1 (`:139`) and F-6 (`:98`).

---

#### Cautionary Items

1. **Records That Hold No Index Store:** a session with no content-index store answers null to every query (`Desktop/main.ts:311-312`; `Desktop/Store/sessionDb.ts:24-28`), so every reach falls back to `nexusCorpus`, which walks the Archive; an index-only projection would strip archived values at delete and lose them at refill. **Cause:** the store's absence. **Shape:** the projection's `?? scan` fallback (*1.5*).
2. **`id-live` Across Devices:** a concurrent offline archive and delete of one page on two devices can leave it in one device's Trash and another's Archive, since each `landRename` finds its source already moved (`land.ts:124-147`); a Trash restore would then land a twin no remint adjudicates (`Core/Nexus/remintLedger.ts:21-60`). **Cause:** sync's per-device landings. **Shape:** `id-live` reads the union map, excepting the restoring file's own path (*1.5*). Sync past the landing wasn't traced.
3. **Malformed Ids Become Path Segments:** `readOwnSidecar` takes any string as an id (`Core/Nexus/readNexus.ts:98-114`), and the renderer supplies the archive store's id to `bundles:list`. **Cause:** `archiveDirRel(id)` joins the id into a path. **Shape:** the archive op and the list handler gate on `isUlidShaped`; `record.archive` passes `storeOf` and `resolveUnderRoot`, as `bundlePath` does (`spend.ts:138`; pinned by `spend.test.ts:1573`).
4. **Twin Ids and Metadata:** `dropPageMetadata` spares only tree-held ids (`Core/Nexus/pageMetadata.ts:120`), so an archived page sharing an id with a page emptied from the Trash would lose its entry. **Cause:** a duplicated id across the two stores, which nothing in-app produces. **Shape:** no guard; noted beside the twin rule.
5. **An Unreadable Collection Orphans Its Archive on That Device:** `Unreadable` carries no id (`Core/Nexus/tree.ts:109-112`), so a sidecar unreadable at one device's open (mid-sync, say) sends its Archive to `.trash`, and sync carries that move to every device. **Cause:** F-5 as ratified. **Shape:** recoverable, each item restoring home once its Collection reads (Question 4).
6. **An Interrupted First Sync:** an Archive's bundles can arrive before their Collection's sidecar, and the next open sweeps them. **Cause:** sync order. **Shape:** no guard; restore home by `parent` works once the Collection arrives.
7. **Litter in an Orphaned Archive:** `listBundles` skips bundles whose record won't parse or that hold no artifact (`holdings.ts:30-36`), and the chain layout leaves empty chain folders. **Cause:** an orphaned `<id>/` holding only these would re-trigger the Trash walk at every open. **Shape:** the pass removes the directory once no file remains beneath it, leaving unparsed bundles in place as evidence.
8. **The Open Pass's Own Catch:** a failure inside the seed's `try` (`Core/Nexus/handlers.ts:89-103`) would read as a failed walk after the tree seeded. **Shape:** its own `.catch` and log line.
9. **The Open Pass Reads Every Archive Record:** F-6's re-file arm reads every record in every live Collection's Archive at each open. **Cause:** a Finder move made while Pommora was closed reaches no session, and a first tree has no baseline. **Shape:** accepted; it runs once at open, after the tree seeds and off the reply path, beside F-5's check, which reads only the directory listing.
10. **The Trail Rewrite Reads an Archive per Set Move:** the settle observer reads the source Collection's Archive records on every Set move it sees, crossing or not, and writes the records whose origin lies within the Set. **Cause:** keeping stored trails current (*3.4*). **Shape:** accepted; Set moves are user operations, never a high-frequency trigger.
11. **An Archive Record's `trail[0]` Repeats Its Store:** inside an Archive the Collection id is both the folder the record sits in and `trail[0]`. **Cause:** one record shape for both stores, where a Trash record needs the Collection. **Shape:** the location wins, as F-6 reads it, and the carry rewrites the trail as it moves a bundle.
12. **The Delete Source's Kind Check:** `req.kind` drives `contentPages`, `goneEdit`, and `isContainer`, while an archive bundle's record names its own entity. **Shape:** a mismatch answers `NOT_HELD` (+1).
13. **The Undo's Re-Mint Finds Its Path Taken or Its Archive Gone:** `mkdir` answers `'exists'` when something holds the path (`nodeMachine.ts:69-70`), and an artifact landing beside another entry turns the bundle invisible (`record.ts:110-113`); a chord Undo can fire long after F-4 disposed the Archive (the stack holds 100, `Core/Session/undo.ts:5`). **Shape:** on `'exists'`, mint fresh in the same Archive (the original stamp is lost, disclosed in the copy); a revived Archive for a gone Collection is orphaned at the next open and F-5 keeps it recoverable.
14. **Cross-Kind Step-Aside:** `freeOnDisk` checks the disk leaf per kind, so a page could step aside onto a title a tree Set holds. **Cause:** an off-tree squatter and a tree Set with the stepped name at once. **Shape:** no guard; it's a ghost.
15. **A Malformed `place`:** a hand-edited `place` that won't parse hides the bundle, as any malformed field does (`spend.test.ts:717`). **Shape:** no guard, consistent with the format.
16. **The Lift Skips Entries Naming Nothing, Before Reading Their Spelling:** entries outlive their folders (`Core/Settings/codec.ts:61-82` checks spelling only), `relocate` throws on a missing source (`atomicWrite.ts:70`), and `heldName` reads its parent uncaught (`atomicWrite.ts:340-345`). **Shape:** `pathExists` first, which catches (`:332-338`).
17. **Case-Only Renames:** `normalizeExclusions` dedupes on the folded path keeping the first spelling (`codec.ts:60`, `:75-79`), and `entryWithin` folds case, so `from` and `to` fold together. **Shape:** the landed entry goes first, and the drop spares entries still within `to`.
18. **The Drop Step Stays Inside `landed`:** `reportRename` follows `landed` (`atomicWrite.ts:73-74`); a drop after it makes sync rescope twice (`Core/Sync/Client/session.ts:136-140`). **Kind:** an ordering requirement rather than a guard.
19. **ArchiveView's Not-Found Frame:** a lookup can miss between `set({ tree })` and `reconcileNavigation` (`nexusSlice.ts:98-100`). **Shape:** the placeholder ContentView's Collection and Set arms already render (`Core/Interface/ContentView.tsx:65-84`).
20. **The Archive Place Never Enters `nodesOf`:** an archive record shares its owner's id and would overwrite it in `nodesByIdOf` (`treeIndex.ts:176-184`), which `Sidebar.tsx:296` and `MatrixLabel.tsx:28` read.
21. **The Toggle Passes `{ newTab: false }`:** `select`'s default reads `tabOpenBehavior` (`Core/Session/navigationSlice.ts:557-558`), which under New Tab would spawn a tab per press.
22. **The Place's Depth Rule:** an archive place whose Set moved deeper has no toggle back, since `ViewMenu` renders only on a top-level Set; a tab left on it closes as one on a deleted entity does.
23. **Re-List Only While Shown:** parked hosts stay mounted (`ContentView.tsx:92-136`), and each listing reads every record and walks the tree per row (`holdings.ts:24-46`; `trashRows.ts:41-44`). **Shape:** the `shown` argument; a parked ArchiveView doesn't re-list per signal.
24. **Outside Arrivals:** a sync or Finder change in `.nexus/archive/` reaches an open ArchiveView or reader only at the next op or showing, as the Trash behaves today.
25. **The Warm Scroll Restore Runs Before Rows Arrive:** `InterfaceScaffold.tsx:22-36` sets `scrollTop` on mount, while rows arrive by IPC, so a cold-rebuilt ArchiveView returns at the top. **Shape:** no guard; the cost of an async-listed place.
26. **The Virtual List's Offset:** `offsetTop` would measure against the absolutely positioned parked host (`interface.css:40-46`) rather than the scroll root. **Shape:** the rect difference plus `scrollTop`, which IconPicker reads too.
27. **The Date Hook Calls `styleMenuItems` Directly:** `styleBranch` hides a lone row (`columnMenu.ts:96-100`).
28. **The Row Type and Store Union Stay Host-Safe:** the bridge type-imports them and the engine graph follows type imports. **Shape:** neither file imports React; every hook lives in `browser.ts`.
29. **The Swap's Hidden Face:** two faces share one grid cell, so without `inert`, `aria-hidden`, and `pointer-events: none` the invisible bar's buttons would take clicks and focus and a button's name would read both words.
30. **The Declare Hook Clears on Park and Unmount:** a bar declared by a parked ArchiveView (`ContentView.tsx:181`) would otherwise stand over another tab's view.
31. **The Face Is Held Through the Chrome's Exit:** without `useHeld(face, open)` a closing label would cross-fade to an empty or stale face.
32. **The Archive Reader Closes When Its File Is Gone:** a restore or delete while the reader shows that item would otherwise leave it describing a page no longer archived.
33. **The Sweep Skips Archived Ids the Tree Also Holds:** a Finder duplicate carries its original's `ID`, so archiving one twin would otherwise sweep the live twin's history at the archive cutoff. **Shape:** `idHeld` inline in the sweep's id list.
34. **K-3's Arming:** the press that posts a notice leaves the pointer inside `NEAR_RADIUS`, which the arming rule is built around.

---

#### Contradictions

Each is disclosed for Nathan; none stops planning under *Intent Over Wording*.

- **K-1, "The Carry Causes No Walk" (`Archive — Decisions & Intention.md:139`):**
  - **What Holds:** the named clause, that a pre-written entry naming the landing mustn't trip `applyMove`'s walk-and-reseed (`fileEvents.ts:574-577`), is met by the counterpart rule (*3.2*).
  - **What Doesn't:** the sentence itself. At HEAD every carry walks, restarts the watcher, and has sync reconcile, through the settings event's own handling (`fileEvents.ts:502-509`; `settle.ts:177`, `:181-185`), by design, documented (`.claude/Features/DesktopPM.md:22`), and tested (`fileEvents.test.ts:298`; `mutate.test.ts:3252`). Honoring it literally means making scope changes incremental in `applySettings`, the watcher's captured filter (`watcher.ts:98-107`), and sync's `rescope`, reaching every exclusion edit (Question 6).
- **F-6 INFERRED, "One Carry, Placed Where Every Such Landing Is Observed Rather Than in Each Path" (`:98`):** no point at HEAD observes the restore's departure, since its Set arrives from outside the tree, or a Finder move made while Pommora is closed (*§Disagreements Resolved › The F-6 Observation Point*). The closest faithful shape is one carry with three triggers (*3.4*). This is a technical constraint rather than a preference.
- **G-6 INFERRED, the Count's Casing (`:111`):** "as the Trash's batches do ('3 Pages', '2 Sets', '5 Items')", while the Trash writes "3 pages" and "2 sets" (`TrashFrame.tsx:36-50`). Making it true changes the Trash's report copy (Question 18).
- **G-6, "The Same Animation" (`:110`, INFERRED at `:112`):** Settings' Clear → Cleared has no animation (`useTimedLabel.ts:5-14`), and the code block's bare name swaps instantly (`decorations.ts:286`); only the glyph and the pill cross-fade, so one shared transform changes Settings' feel (Question 17).
- **G-6, "The Tint the File History Window's Restore Button Wears" (`:109`):** that button wears the neutral `filled`, not a tint (Question 16).
- **C-4, Counts Name Only Items Outside the Archive (`:62`):** the rename refusal's "N Items hold both…" (`Core/Properties/properties.ts:272-273`) is a count, and C-4 would leave archived holders out of it, while the refusal exists because of them (Question 1).

---

#### Questions for Nathan

Deduplicated across the five reports, each with a recommendation.

1. **The Rename Refusal's Count (Lane 1):** renaming a property is refused when pages hold both the old and the new key, and the refusal says how many: "3 Items hold both 'Status' and 'State'". Archived pages must count toward the refusal or the rename silently erases a value on one, and some may sit in the Archive of a trashed or excluded Collection that no ArchiveView shows. **Recommendation:** count every holder, so the refusal never reads "0 Items" when only archived pages block it; whether the copy adds "including archived pages" goes to the copy review.
2. **Confirmations When Only Archived Pages Are Affected (Lane 1):** under C-4 an option clear or format change that only archived pages hold counts 0 and runs without asking, and a property delete or option removal asks with "stripped from 0 Items". **Recommendation:** keep C-4 as ratified; the archived pages update either way, and the "0 Items" wording goes to the copy review.
3. **An Item Whose Set Has Itself Been Archived (Lane 2):** should restoring it ask where to put it, as it does when its Set is in the Trash? **Recommendation:** yes; it finds its Set again if the Set is restored first, and a batch restored newest first handles that order.
4. **A Collection That Can't Be Read at Open (Lane 2):** most often while it's still syncing. F-5 moves its Archive into the Trash, and that move syncs to every device. **Recommendation:** keep F-5 as ratified, since nothing is lost and each item restores home once the Collection reads; the alternative skips the move on any open where some Collection can't be read, leaving a permanently broken one's Archive in limbo.
5. **Exact Place for Collections and Spaces Restored From the Trash (Lane 2):** pages and Sets now return to their exact place; Collections and Spaces regain theirs only until their order is next written. **Recommendation:** yes, through the same neighbour rule, so every restore that lands in an order uses one rule (about +10).
6. **The Re-Read When an Excluded Folder Moves (Lane 3):** renaming, moving, archiving, or trashing a Collection or Set that holds an excluded folder or the asset folder updates the exclusion list, and any change to it makes Pommora re-read the Nexus, restart its watcher, and have sync re-check every file: a few seconds of background work on a large Nexus, only for those operations. K-1 says the carry causes no re-read. **Recommendation:** keep today's re-read in this work and record incremental exclusion changes as their own Issue, since the change reaches every exclusion edit well beyond the Archive.
7. **A Folder Left Behind (Lane 3):** archiving or trashing a Set that holds an excluded folder moves that folder up into the Set's parent, sometimes as `Omega (2)`. Should the notice mention it? **Recommendation:** no added copy, since Pommora shows excluded folders nowhere and the folder stays where Finder shows it.
8. **The Archive's Header (Lane 4):** ArchiveView shows its Collection's full header, banner image, rename, and icon editing, with "Archive" trailing in tertiary. **Recommendation:** keep it all, since it's the Collection's other face.
9. **The Archive Tab's Name (Lane 4):** the Collection's title with the archive glyph, or "Archive" with the Collection as its location. **Recommendation:** the Collection's title with the glyph, so two Archives' tabs tell apart.
10. **Archived Sets (Lane 4):** a Set is one row; Restore and Delete act on the whole Set, and its pages stay closed until it returns. **Recommendation:** one row; inline disclosure would split one bundle.
11. **Clicking a Row (Lane 4):** a page's title opens the read-only window, and clicking elsewhere on any row checks it, as in the Trash. **Recommendation:** as stated.
12. **The Sliders Button in the Archive (Lane 4):** an empty pane, as on a new tab, or disabled. **Recommendation:** the empty pane, the app's existing answer.
13. **The Archive Button on a Pinned Tab (Lane 4):** pressing it opens the Archive in a new tab, since pinned tabs never change in place, and pressing again returns to the pinned tab. **Recommendation:** as stated.
14. **Picking a View While in the Archive (Lane 4):** choosing any view leaves the Archive for that view. **Recommendation:** yes.
15. **One Search Rule for Both Browsers (Lane 4):** typing in the Archive narrows in place, keeping newest-first order as every view's search does, and the Trash's search would switch to the same rule from best match first. **Recommendation:** one rule, in place.
16. **Restore's Look in ActionLabel (Lane 5):** the File History Restore is the neutral filled button, not an accent tint. **Recommendation:** filled, an exact match; tinted is the accent alternative if "tint" meant color.
17. **The Settings Buttons' Cross-Fade and Hold (Lane 5):** Clear → Cleared and Sync Now → Synced would cross-fade where they jump today, each sized to its wider word so nothing reflows, with one hold for Copied, Cleared, and Synced where the code block holds 1000 ms and Settings 1500 ms. **Recommendation:** yes, at 1500 ms, since the fades eat into both ends.
18. **Title Case Counts in the Trash (Lanes 4, 5):** making G-6's "3 Pages" true changes the Trash's report from "Restored 3 pages." to "Restored 3 Pages.". **Recommendation:** take it along; it's copy rather than the Trash's look, and the same function already answers "2 Items".
19. **A Way Back to Following (Lane 5):** once an archive history step is picked, J-1 never lets it follow History Timeframe again; the Trash precedent clears a pick equal to the inherited value. **Recommendation:** store every pick as J-1 reads, with no way back.
20. **K-3's Reach (Lane 5):** the rule that can be built drains a notice under any pointer first seen inside the band after the post, including one resting there from earlier, not only the press that posted it. **Recommendation:** accept; the alternative is a standing pointer tracker.
21. **A Batch of One (Lane 5):** "Restored 1 Page" or "Restored “Ideas”". **Recommendation:** name the title, as every single-item notice does.
22. **The Bar Over Windows (Lane 5):** the bar stands above floating windows and Settings, as notices do, so the reader window opened from ArchiveView sits under it. **Recommendation:** accept.

---

#### Line Totals

Source lines, tests and docs excluded, as `<net> (+<added> / -<removed>)`. Moved lines count on both sides where a scout counted them so (Lane 2's owner moves, Lane 4's controller hoist), which inflates both columns without changing the net.

| Lane | As Reported | Reconciled | What Changed |
| --- | --- | --- | --- |
| 1 | +19 (+70 / −51), cautionaries apart | +14 (+66 / −52) | The relink hoist (+12 / −10) counts once, under Lane 2; the no-store fallback (+3), `id-live` through the map (+4 / −9), `deleteCascade` taking the roots that left (+1), and `NON_CORPUS_TOP` inlined (−2) join |
| 2 | about +110 (+222 / −113) | about +110 (+215 / −105) | The resolver (+5) counts once, under Lane 1; the F-3 removals (−8) count once, under Lane 3; the chain layout drops the layout flag, both layout branches, and `origin.path` (about −4) and adds the empty-directory removal (+2) |
| 3 | +29 (+81 / −52) | +28 (+80 / −52) | The record field (+1) counts once, under Lane 2; the trail rewrite (+2) joins; the shared open pass saves its second loop (−2) |
| 4 | about +168 (+406 / −238) | about +168 (+406 / −238) | None; the listing handler and Set narrowing are carried below as uncosted |
| 5 | about +127 (+159 / −32) | about +127 (+159 / −32) | None |
| **Subtotal** | | **about +447 (+926 / −479)** | |

**Uncosted by Any Scout:**

| Piece | Home | Estimate |
| --- | --- | --- |
| The `archive` op: the request, the ULID gate, the lift call, the gather, the mint, the relocate, the departure drop, the `bundled` reply, its refusal for targets outside a Collection | `Core/Archive/archive.ts`; `mutateRequest.ts` | about +25 |
| `restoreArchived` (Scout 2's sketch, absent from its table) | `Core/Archive/archive.ts` | about +25 |
| The `bundles:list` handler (Scout 4: "Lane 2's arm") | `Core/Bundles/handlers.ts` | about +6 |
| The archive arm's Set narrowing by origin | `Core/Bundles/rows.ts` | about +8 |
| ArchiveView's bar declaration | `Core/Archive/ArchiveView.tsx` | about +3 |
| **Together** | | **about +67** |

**Overall:** about **+514 net**, against the Investigation's roughly +580, which is also net of moves. The gross, +993 / −479, includes about 230 moved lines on each side (Lane 2's owner moves and Lane 4's controller hoist), so about +760 / −250 is written or deleted outright. The work comes in about 65 lines under the Investigation's figure while doing more: the frozen-world fix D-1 needs (+15), F-6 at its real cost (+33 against +12), and configuration reach at its real cost (+7 against +4) are all inside it. What pays for them is consolidation the Investigation didn't count: governed reach (about −18), the crash-safe carry replacing six exclusion functions (about −16 where +8 was estimated), one restore menu (−25), one face swap (±0 where three stacks stood), the shared browser controller (about −12 on the Trash's side while handing the Archive its whole controller), and the chain layout's single rule. The positive remainder is the Archive's required surface: its ops, ArchiveView and its place, the reader's archive branch, ActionLabel's bar, the second history cutoff, the archive confirmation, and the exact-place and step-aside restores both stores gain.
