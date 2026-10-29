# Scout 3 — Reach & the Index

**Repo:** `~/The Studio/Projects/Project Pommora` at `15fe7422a` (branch `active`), read-only; cleaned against *Trash & Archive Restructure — Investigation* on 10-28-2026 under Decisions 10 through 14. The grounding, the inventory, the behavior to preserve, and the test notes are this scout's own; every finding is stated once in the Investigation, and this report maps each to it. Corrected claims are marked **Corrected**.
#### Grounding Check

- **Confirmed:** `.trash` is unwatched (`neverWatched` treats any dotted first segment other than `.nexus` as hidden, `Core/Paths/exclusion.ts:20-29`, used by `Desktop/FileWatch/watcher.ts:55-65`) and unindexed (`outsideContent` reads it as `'hidden'`, `exclusion.ts:69-74`, which gates `indexWrittenPage`/`deindexPath`/`moveIndexPaths` through `relCorpusPath`, `Core/Index/indexSeed.ts:77-81`).
- **Confirmed:** `.nexus/archive` is a content root (`Core/Files/walk.ts:43`), indexed, and watched (the `.nexus` exemption at `exclusion.ts:24` lets every Archive segment through).
- **Refined:** the tree leaves the Archive out with no Archive-specific code. The root walk prunes `.nexus` as hidden (`Core/Nexus/readNexus.ts:321-322`), and `classifyEvent` sends every `.nexus/` path except `contexts` to `'ignored'` (`Core/Nexus/fileEvents.ts:241`). The index half still runs for those events, since `applyEvents` indexes every event *before* it classifies (`fileEvents.ts:655`), so an archived page edited from outside re-indexes on its event.
- **More reach-ins than the grounding lists** (**Corrected:** three paths rewrite trashed copies; the others below read the Trash without rewriting copies): besides `finishOwed`'s property arm, `refillTrashed`/`trashedHolders`, and `refillStash`, three other paths reach into the Trash. `collectionsElsewhere` reads every Trash record (`Core/Bundles/bundle.ts:186-188`), and `parkLinks` lists every trashed page (`Core/Trash/trashedCopies.ts:38`, via `originPagesIn`, `bundle.ts:417-426`). `finishContainer`'s `park` arm runs on system-trash deletes and empties (`Core/Nexus/finishOwed.ts:408`, `Core/Trash/spend.ts:103`).
- **One reach is missing, and it's inconsistent:** a property's restore doesn't reach trashed copies at all (§4, R-1).

---

## 1. Inventory

#### Paths & Admission

| Symbol | Where | Job | Callers |
|---|---|---|---|
| `NEXUS_DIR`, `TRASH_DIR`, `ARCHIVE_DIR_REL` | `Core/Paths/nexusPaths.ts:3-7` | The dotted roots | Widespread; Trash/Archive-specific callers below |
| `ArchiveStore` | `nexusPaths.ts:9` | `{kind:'archive', id}` | `Bundles/layout.ts:10` (unioned into `BundleStore`), `Archive/archive.ts:73`, `Bundles/placement.ts:193`, `Paths/names.ts:20` |
| `archiveDirRel` | `nexusPaths.ts:11` | One Collection's Archive dir | `layout.ts:17`, `archive.ts:145`, `refile.ts:150`, `finishOwed.ts:397`, `treePatch.ts:125` |
| `archiveSegs` | `nexusPaths.ts:13-14` | Segments below `.nexus/archive`, or null | `nexusPaths.ts:17`, `exclusion.ts:71` |
| `archivedCollectionIdOf` | `nexusPaths.ts:16-17` | The Collection id an Archive path is filed under | `layout.ts:45`, `heldPages.ts:78`, `treePatch.ts:116`, `nexusPaths.ts:19` |
| `isArchived` | `nexusPaths.ts:19` | Whether a rel path lies in the Archive | `matrixGraph.ts:26`, `Nexus/handlers.ts:171`, `governedSweep.ts:104`, `Trash/delete.ts:42` |
| `archiveStoreOf` | `Core/Paths/names.ts:20-21` | A Collection id → `ArchiveStore` when it can name a folder | 7 non-test call sites (`archive.ts:41,143`, `refile.ts:42`, `bundle.ts:143`, `Bundles/handlers.ts:16`, `placement.ts:204`, `treePatch.ts:124`; **Corrected** from 14) |
| `hiddenName` / `hiddenFolder` | `exclusion.ts:10-17` | Leading `.`/`_`, plus `node_modules` | Walks, bundle listing, `classifyEvent` |
| `neverWatched` | `exclusion.ts:20-29` | The watcher's ignore rule: `.nexus` is exempt, everything else dotted is hidden | `watcher.ts:63-64`, `manifestAdmits`, `Assets/adoptFile.ts:24`, `Assets/assetMap.ts:14` |
| `manifestAdmits` | `exclusion.ts:37-53` | Sync's admission rule; **admits `.trash`** by judging what's below it (`:48`) | `Sync/Client/push.ts:149`, `reconcile.ts:74,79,114`, `tap.ts:17,42` |
| `outsideContent` | `exclusion.ts:69-74` | What keeps a rel out of content: hidden (judged below `.nexus/archive` for an Archive path), asset, or excluded | Corpus walk (`walk.ts:87,99`), index (`indexSeed.ts:80`), tree (`readNexus.ts:155,322`, `folderKind.ts:100`, `adopt.ts:163,181`, `folderEntity.ts:27`), `listInner` (`bundle.ts:334`), `fileEvents.ts:513`, `exclusionScan.ts:46-47` |
| `syncIgnoredUnder` | `watcher.ts:55-66` | Chokidar's ignore filter, built on `neverWatched` | `watcher.ts:101` |
| Sync tap `.trash` drop | `Core/Sync/Client/tap.ts:50` | Drops *watched* events under `.trash` | `installTap` |

#### Walks

| Symbol | Where | Job | Callers |
|---|---|---|---|
| `contentRoots` | `walk.ts:43` | `[root, root/.nexus/archive]` | `corpusFiles`, `sidecarsUnder` |
| `corpusFiles` | `walk.ts:45-49` | Every content page under both roots | `nexusCorpus` (`indexSeed.ts:73-75`), `Assets/assetMigrate.ts:135` |
| `corpusFilesUnder` | `walk.ts:79-89` | Content pages under one dir, by `outsideContent` | `corpusFiles`, `heldPages.ts:100` (Archive fallback), `indexSeed.ts:173` (folder moved into content) |
| `listMarkdownFiles` | `walk.ts:33-40` | Pages under a bundle's artifact, by `hiddenFolder` only | `contentPages` (`bundle.ts:404`), `collectionArchive` (`archive.ts:147`), `keptLinksUnder` (`bundle.ts:284`) |
| `listPathsUnder` | `walk.ts:59-77` | The hand-descended walker under all of the above | `walk.ts:34,84,98`, `restoreScrub.ts:134` |
| `sidecarsUnder` | `walk.ts:91-104` | Sidecars under both roots, or under one dir | `configReach.ts:285`, `assetMigrate.ts:117` |
| `nexusCorpus` | `indexSeed.ts:73-75` | `corpusFiles` with the read scope | Seed (`:215`), `pagesInReach` fallback (`keyHolders.ts:50`), `renameCascade` fallback (`cascade.ts:241`) |

#### The Index

| Symbol | Where | Job | Callers / Notes |
|---|---|---|---|
| `contentIndexStore` impl | `Desktop/Store/stores.ts:58-183` | SQLite rows by path; **knows nothing of either store** (no Archive or Trash term in `Desktop/Store/`) | Through `Core/Index/contentIndex.ts` |
| `queryMentions` | `contentIndex.ts:66-68` | Paths whose relations name keys | `deleteCascade` (`cascade.ts:127`), `renameCascade` (`cascade.ts:241-242`) |
| `queryMembers`/`queryKeyHolders` | `contentIndex.ts:74-83` | Paths holding a key (or a Space under it) | `findHolders` (`keyHolders.ts:82`) |
| `readHeadings` | `contentIndex.ts:70-72` | Outlines | `index:headings` (`Nexus/handlers.ts:170-171`, filters Archive), `reindex` (`indexSeed.ts:135`) |
| `readPageRelations` | `contentIndex.ts:85-87` | Rows + values | `matrixGraph.ts:20` (filters Archive), `keyHolders.ts:120`, `gather.ts:26`, `optionOps.ts:146` (tree-scoped, so no stored pages) |
| `readIndexedStats(under)` | `contentIndex.ts:93-95` | Stat + ID per path under a prefix | `archivedPageIds` (`heldPages.ts:98`), `deindexPath` (`indexSeed.ts:158`), seed (`:193`) |
| `seedContentIndex` | `indexSeed.ts:192-249` | Stats the whole corpus every open, re-reads what moved, prunes what vanished | Open |
| `indexWrittenPage`/`deindexPath`/`moveIndexPaths` | `indexSeed.ts:109-180` | Per-event maintenance; a move across the content boundary becomes index or de-index (`:163-176`) | `indexEvent` (`fileEvents.ts:273-298`) |

#### The Stored Projection (`Core/Nexus/heldPages.ts`)

| Symbol | Line | Job | Callers |
|---|---|---|---|
| `entitiesById`, `writablePathsOf`, `liveIdIndex`, `liveIdOf`, `livePathOf`, `idHeld` | `:23-52` | Live-tree id ↔ path for writers (a separate responsibility in the same file) | Writers, `settle.ts:113,123`, `fileHistory.ts:200` |
| `NexusPages` | `:55-58` | `byId` (tree + Archive, null on a twin) and `archived` (Archive pages at their origin paths) | — |
| `addressable` | `:61-64` | `byId` addresses exactly one file | `cascade.ts:133`, `keyHolders.ts:125`, `governedSweep.ts:135` |
| `shownTitle` | `:67-71` | Title for an unrestored name | `spend.ts:299`, `restoreProperty.ts:86` |
| `nexusPages` | `:73-85` | Builds `NexusPages` from `archivedPageIds` | `archive.ts:98`, `Bundles/handlers.ts:27,37`, `keyHolders.ts:106`, `cascade.ts:107`, `assignment.ts:39`, `gather.ts:42`, `restoreProperty.ts:69`, `spend.ts:140` |
| `linkWorld` | `:88-92` | `PageIndex` of tree pages + archived at their origins (+ extras) | `assignment.ts:62`, `restoreProperty.ts:70`, `spend.ts:155,272` |
| `archivedPageIds` | `:94-103` | Archive stats from the index; walks and reads every archived file before it's ready | `nexusPages`, `fileHistory.ts:200` |

#### Reach Scoping & Exclusion from Display

| Symbol | Where | Job | Callers |
|---|---|---|---|
| `archiveReach` | `Core/Nexus/treePatch.ts:122-126` | Archive dir(s) a reach covers | `pagesInReach` (`keyHolders.ts:53`), `archivedSets` (`configReach.ts:298`) |
| `owningCollection` | `treePatch.ts:110-119` | Owner by path, or by the Archive's filed id | Schema lookups, `refillStash`, `archiveOp` |
| `pagesInReach` | `keyHolders.ts:44-59` | Pages in Collections + Archive (`governed`/`{collection}`) or anywhere | `findHolders`, `deleteCascade` |
| `findHolders` | `keyHolders.ts:79-136` | Index pages + tree Spaces holding keys; with `read`, values by id through `nexusPages` | Property/option/Context cascades, deletes |
| `outsideArchive` | `Core/Nexus/governedSweep.ts:103-104` | One-line wrapper of `isArchived` | `cascade.ts:156,276`, `governedSweep.ts:111`, `registryProperty.ts:184` |
| `collectionFolders` | `governedSweep.ts:45-49` | Live + damaged Collection folders | `finishOwed.ts:177`, `deleteProperty`, `keyHolders` |
| `archivedSetIds` / `archivedSets` | `Core/Nexus/configReach.ts:288-304` | Set ids/dirs in an Archive; the config pass reaches archived Set sidecars | `delete.ts:51`, `archive.ts:152`, `finishOwed.ts:397`, `reachConfig:339` |
| `readMatrixGraph` | `Core/Matrix/matrixGraph.ts:19-43` | Graph rows; drops archived (`:26`) | Matrix |
| `index:headings` | `Core/Nexus/handlers.ts:169-172` | Drops archived | Renderer |
| `sweepFileHistory` | `Core/Pages/fileHistory.ts:195-210` | Archive-specific retention via `archivedPageIds` | Open, settings |
| Link suggestions | `Core/Session/pageConnections.ts:30` | `pageIndexOf(tree)`: shows no stored page, with no store code | Editor |

#### The Trash's Partial Reach

| Symbol | Where | Job | Callers |
|---|---|---|---|
| `appendLinks` | `trashedCopies.ts:18-21` | Appends `StrippedLink`s to a bundle record | `parkLinks` |
| `frozenWorld` | `trashedCopies.ts:23-33` | `Frozen` from a `PageIndex` + recorded `targets` | `spend.ts:156,272`, `restoreProperty.ts:70`, `assignment.ts:62` |
| `parkLinks` | `trashedCopies.ts:36-45` | Files dropped Link values on the bundle of the trashed page they name | `spend.ts:112,131,171`, `finishOwed.ts:408`, `assignment.ts:74` |
| `trashedHolders` | `trashedCopies.ts:48-80` | id → trashed file (page, Set/Collection page, Space sidecar, Context's Space sidecars) | `refillTrashed`, `assignment.ts:51` |
| `refillTrashed` | `trashedCopies.ts:83-118` | Refills Link values into trashed copies, owing what it can't write | `spend.ts:287` |
| `Frozen` | `Core/Nexus/governedRoot.ts:61-63` | `{ holds(title) }` | `gonePageEntry`, `refillOf`, `scrubReturning`, `trashedCopies` |
| `gonePageEntry` | `governedRoot.ts:65-70` | The Link entry naming a page `frozen` doesn't hold | `cascade.ts:114` (**live** strip), `governedSweep.ts:151`, `restoreScrub.ts:159`, `restoreProperty.ts:78`, `assignment.ts:67` |
| `reconcileGovernedRoot` | `governedRoot.ts:126-150` | Live-write reconcile of every governed key | `writtenRoot`, `repairSweep.ts:23`, `restoreScrub.ts:173,186` |
| `refillOf`/`refillValues`/`sweepRootsById` | `governedSweep.ts:119-168` | Id-addressed refills over `RootsById` | `spend.ts:280,313`, `restoreProperty.ts:83`, `assignment.ts:73`, `refillTrashed` (`refillOf`) |
| `finishProperty` gone-def arm | `finishOwed.ts:164-186` | Strips a permanently deleted property from trashed Collections' sidecars and trashed pages, unless a property bundle still holds it | `finishArm` |
| `finishContainer` | `finishOwed.ts:376-417` | Gone-container view edit (walks every owned Archive), strip, bundle patch or `park` | `finishArm` |
| `refillStash` | `Core/Properties/assignment.ts:26-83` | Stash → live/archived pages, plus trashed copies from that Collection | `assignInner`, `finishProperty:203` |

---

## 2. Findings, as the Investigation Holds Them

- **D-1 · The Record-Links Twin:** confirmed; M-5.
- **D-2 · Three Ways to Refill a Stored Copy:** confirmed, with the owed-versus-named divergence; M-12 and, under reach-in, L-10.
- **D-3 · Two Stored-Page Worlds and the `id` Overload:** confirmed; L-10 (reach-in) or M-9 (resolve-on-restore).
- **D-4, D-5 · Listers Under Two Rules and Two Exclusion Readings:** confirmed by reading; B-8 and M-16.
- **D-6, D-7 · Partial Root Lists and the Store Notion in Three Files:** confirmed; M-16 and P-4.
- **D-8 · Hand-Placed Archive Hiding:** confirmed; four `outsideArchive` uses and four `isArchived` uses in production; M-16.
- **D-9, D-10 · Archive-by-Collection Enumeration Twice, `archivedSetIds` vs `archivedSets`:** confirmed; M-11.
- **S-1 · Two Reach Mechanisms:** confirmed; *§What's True · How the Archive Is Reach-In* and M-16.
- **S-2, S-3 · `trashedCopies.ts` as Compensation, `Frozen`'s Name:** confirmed; M-12, P-2, L-10.
- **S-4 · `heldPages.ts`'s Two Concerns:** confirmed; P-7.
- **S-5, S-6:** confirmed; M-16, P-4.
- **R-1 · A Property Restore Loses Trashed Holders' Values:** confirmed by reading; B-2. Uncovered.
- **R-2 · A Dead Stash Entry:** confirmed by reading; B-7. Uncovered.
- **R-3 · `tap.ts:50` Unreachable:** confirmed; the watcher is the tap's only feeder (`watcher.ts:112`).
- **R-4 · A Stray File Under an Archive:** confirmed by reading; B-8.
- **R-5 · Half-Reach Into Trashed Collection Sidecars:** confirmed; *§The Trash's Model*'s Views row.
- **R-6, R-7, R-8:** confirmed; L-10, *§What Becomes False*, and the cost table.
- **Reach-In Implications (§5):** carried into *§The Trash's Model* in full: the shared rule (M-16), the file-by-file table (its code-side ledger), the delete strip's own-bundle gap (condition 2), the cost model, and the behavior that must hold. Decision 11 settles §5.1's directory admission: only bundle contents are read, so flat leaves and record-less folders stay out.
- **Proposals (§6):** C-1 → M-16; C-2 → L-10 (its partial form → *§Approaches Worth Weighing*, 1); C-3 → L-10; C-4 → M-5; C-5 → M-12, P-2; C-6 → M-11; C-7 → L-10; C-8 → P-7.
- **Questions (§9):** Q-1 → condition 3; Q-2 → condition 4 and *§Approaches Worth Weighing*, 2 (Decision 12 rules out keeping a path only for old bundles); Q-3 → the Views row; Q-4 → condition 5; the sync and asset-walk risks → conditions 10 and the Watcher row.
## 7. Behavior to Preserve (With the Tests That Pin It)

- **Delete strips Link values naming the deleted page from other pages and Spaces, archived pages included; ID-less or twin linkers keep theirs:** `deleteReach.test.ts:111-155,346`; `keyHolders.test.ts:311,326`.
- **Restore re-adds stripped values, including into stored copies, under Restore Links On Deletion; a key returns where it stood:** `spend.test.ts:951,1004`; `trashRecovery.test.ts:826,834`; and with the setting off, `trashRecovery.test.ts:852`.
- **Parking: a value naming a trashed page returns with that page; bare-title ambiguity names neither:** `trashRecovery.test.ts:461-677,748,801,861`.
- **Archived pages are cascade-reachable and resolve as link targets:** `keyHolders.test.ts:85,183,204,209,283,291`; `restoreProperty.test.ts:614,624`.
- **Archived pages stay out of display:** matrix (`matrixGraph.ts:26`), headings (`handlers.ts:171`), `pages:changed` (`cascade.ts:42`), counts (`governedSweep.ts:102`). *These hide-the-Archive filters have no direct test cases in my domain beyond `keyHolders.test.ts`; inferred from a grep of test names.*
- **The twin rule:** `heldPages.test.ts:134`. **Index-less fallback:** `heldPages.test.ts:146,153`; `keyHolders.test.ts:176`.
- **Excluded folders are never reached:** `keyHolders.test.ts:438`. **Sweeps keep mtimes:** `keyHolders.test.ts:455`.
- **The Archive restores by a plain move:** `archive.test.ts` (Archive scout's ground).
- **A trashed Collection switches a deleted-then-restored property back on:** `restoreProperty.test.ts:410`.
- **A Set's own delete leaves its trashed sidecar byte-identical:** `deleteReach.test.ts:315`.
- **Sync carries `.trash` through the write tap only** (`tap.ts:47-55`, `manifestAdmits` at `exclusion.ts:48`).
- **File history keeps archived pages' snapshots on the Archive's retention** (`fileHistory.ts:197-206`).

---

## 8. Tests

- **`trashedCopies.test.ts`** (26 lines) tests `frozenWorld` alone. It's an implementation-level unit and moves with C-5.
- **`spend.test.ts:1004`** ("a Link value refilled into a trashed copy is reconciled as a live refill is") pins that the Trash path mirrors the live one. Under C-2 there is one path, so this becomes a duplicate of the live refill cases.
- **Parking tests** (`trashRecovery.test.ts:461-677`) are phrased around "parks," but each asserts the user-visible restore outcome, so they survive the mechanism change. Keep the outcomes and drop the vocabulary if the mechanism changes.
- **Archive reach cases in `keyHolders.test.ts`** (`:85,183,204,209,283,291,326`) are per-store. Under reach-in they'd want to cover both stores without doubling, by running one table over each store.
- **Behavior with no coverage:** R-1 (property restore with a trashed holder), R-2 (stash refill into a trashed copy holding a gone Link), and R-4 (a stray file under a store root).
- **No test pins the hide-the-Archive filters** in the matrix and headings readers (*inferred* from the absence of hits; not exhaustive outside my domain).
- **`deleteReach.test.ts`** (925 lines) is mostly configuration-pass behavior (`:158-490`), not reach. It belongs to the configReach scout for fixture review.

---
