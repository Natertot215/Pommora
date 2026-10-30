## Trash & Archive Restructure — Implementation Plan

**DATE:** 10-29-2026
**STATUS:** Ratified 10-30-2026
**SOURCE:** *Trash & Archive Restructure — Decisions & Intention* (ratified 10-29-2026, Decisions A-1–G-4 and its *§Rejected*), *Trash & Archive Restructure — Investigation* and its `Scouts/`, *Trash & Archive Restructure — Reach-In Measurement*, and the planning session's placements (10-29-2026), which *§Constraints · Placements* records.

**BASELINE**

| Head | Tests | Start | End |
|------|-------|-------|-----|
| `de297a9ee` | 9,023 passed · 2 skipped | 10-30-2026 10:49 AM | |

**Net Ledger** (Actionable column of `view-delta --exclude .claude`, per phase, cumulative from the BASELINE head; estimates from each phase's tasks; Task 1-2's and Task 6-11's measurements go beneath it):

| Phase | Estimate | Measured |
|---|---|---|
| 1 · The Landing | about +46 | +68 (+198 / −130); +45 outside `Core/Testing` |
| 2 · Residue | about −136 | −157 (+215 / −372); −152 outside `Core/Testing` |
| 3 · Delete, Journal, and Carry | about −46 | |
| 4 · Reach-In | about −360 | |
| 5 · One Restore, Recognition, and the Interface | about +80 | |
| 6 · Tests, Docs, and the Closing Measurement | ±0 | |
| **Total** | **about −415** | |

**Task 1-2 (Thread-Pool Line):** the Medium-0 property rename's median was 0.843 ms a file with the line (5,922 ms over 7,027 files) and 0.838 ms without it (5,888 ms), so the line left (AFTER A).

### Context

Pommora keeps every departed item as a bundle: a stamped folder holding the item beside a `_record.json` saying where it belonged and what it carried. The Trash keeps deleted pages, Sets, Collections, Spaces, Contexts, and properties in `.trash`; each Collection's Archive keeps archived pages and Sets in `.nexus/archive/<Collection ID>`. The two stores run two models. The Archive is reach-in: its pages are indexed and every cascade rewrites them as it rewrites live pages, so its restore is a move. The Trash is resolve-on-restore: a trashed copy is frozen, and its restore re-spells keys and option words, repairs its links against a frozen snapshot of their targets, and refills what its delete stripped. The scrub can't follow a rename, so a page restored after one returns holding the old names (*Investigation*, B-9), and three paths reach into trashed copies regardless. Around the two models sit a second delete mode that bypasses the Trash, two restores, two Undo shapes, two notice owners, six hand-written Archive hides, and compatibility-only decodes.

Every cascade lands its writes through `Machine.land` (`Core/Platform/machine.ts`, implemented by `Desktop/Platform/nodeMachine.ts`), which the Write Path plan built. A property rename across 7,027 pages of a 10,000-page Nexus takes 14.7 s on an idle machine, and two-thirds of it is the drive emptying its whole cache once per file (*Investigation · §The Trash's Model · §The Measurement*); the index tells a changed file by its modified time and size, which a cascade's rewrite keeps.

### Overview

Six phases move the Trash onto the Archive's model and fold everything the two models duplicated into one design, removal first. Phase 1 lands each group of files with one flush and identifies every file by its change time, so a property rename falls to roughly 6–7 s and the index can trust what it holds. Phase 2 removes System Trash Mode, the `TrashDeps` seam, compatibility-only decodes, and dead code. Phase 3 gives every delete one mint, one record written ahead of its strip, one note, and one tail, and the Archive one carry. Phase 4 admits the Trash into the index and every cascade, watched as the Archive is, with one store-of-path rule, and removes the frozen model whole. Phase 5 makes one restore serve both stores and every item moved out of a store by hand, with one Undo shape and one notice owner. Phase 6 puts tests where their behavior lives, measures the property rename again, and removes the measurement harness.

User-facing behavior stays as it is, except that a restored page returns current, items moved out of a store by hand finish as restores, and trashed pages follow live pages' rules (Decisions D-4, D-5, E-1–E-4). The plan ends about 415 production lines and about 850 test lines lighter, recognition's roughly 110 added lines and the landing's 46 included, and what leaves beyond lines is listed under *Investigation · §The Net*: the scrub and `targets`' frozen identity, the trashed refill and its owed work, System Trash Mode, the `TrashDeps` seam, the content-hash echo, the flush per file, two stat identities, two watch policies, two restores, and two notice owners.

#### Concepts

**ADDED**

| Concept | Location | Phase |
|---|---|---|
| `TEMP_FLAGS` • Constant | `Desktop/Platform/nodeMachine.ts` | 1 |
| `FileStat.ctimeMs` • Field | `Core/Platform/machine.ts` | 1 |
| `Identity` • Type | `Core/Platform/machine.ts` | 1 |
| `IndexedStat.ctimeMs` • Field | `Core/Platform/stores.ts` | 1 |
| `indexed_files.ctime_ms` • Column | `Desktop/Store/ddl.ts` | 1 |
| `MemoryFile` • Type (module-private) | `Core/Testing/machines.ts` | 1 |
| `recordLanding` • Function | `Core/Files/writeEcho.ts` | 1 |
| `Echo`'s move-or-landing union (`kind`, `stat`) • Type | `Core/Files/writeEcho.ts` | 1 |
| `unlessVouched` • Function | `Core/Index/indexSeed.ts` | 1 |
| `HolderQuery.every` • Field | `Core/Index/keyHolders.ts` | 1 |
| "metadata: `<month>` refused its copies:" • String | `Core/Nexus/pageMetadata.ts` | 1 |
| `editShards` (private, both month writes) • Function | `Core/Nexus/pageMetadata.ts` | 1 |
| `gatherContextRecord` (in place of the three Context gather pieces) | `Core/Trash/gather.ts` | 2 |
| The Context record's `place`, `panel`, and `spaceOrder` | `Core/Bundles/record.ts` | 2 |
| `placeAmong` (in place of `slotOf` and its caller's splice) | `Core/Bundles/placement.ts` | 2 |
| `dropDeparture`'s Context arm (in place of `dropContextOrder`) | `Core/Nexus/reorder.ts` | 2 |
| `placeRecord`'s Context order write | `Core/Bundles/placement.ts` | 2 |
| `ArchiveView`'s `archiveId` prop | `Core/Archive/ArchiveView.tsx` | 2 |
| `mintBundle`'s `record` parameter | `Core/Bundles/bundle.ts` | 3 |
| `DeletePlan`, `planOf` (private) | `Core/Trash/delete.ts` | 3 |
| `Departing` | `Core/Nexus/reorder.ts` | 3 |
| `leave` (exported, one for the delete and both finish arms) | `Core/Nexus/finishOwed.ts` | 3 |
| `linkStrip` | `Core/Nexus/cascade.ts` | 3 |
| `readHolders` (`findHolders`' read half) | `Core/Index/keyHolders.ts` | 3 |
| `gatherLinks` | `Core/Trash/gather.ts` | 3 |
| `ContentRecord`, `ContainerRecord`, `InnerRecord`, and `PropertyRecord` (the arm types, named once), `appendLinks` (from `trashedCopies.ts`), `removeLinks`, `patchLinks` and `sameLink` (private) | `Core/Bundles/record.ts` | 3 |
| `currentOrigin` | `Core/Bundles/record.ts` | 3 |
| `MoveEntry` and the `move` kind, `containerNote`, `releaseStrip` (from `spendBundle`) | `Core/Nexus/owed.ts` | 3 |
| `finishMove` | `Core/Nexus/finishOwed.ts` | 3 |
| `collectionArchive` (moved, now private) | `Core/Trash/spend.ts` | 3 |
| `ownedArchives` | `Core/Bundles/bundle.ts` | 3 |
| `Core/Paths/bundleLayout.ts` (moved from `Core/Bundles/layout.ts`) | Placements | 4 |
| `storeOf`, `Stored` | `Core/Paths/bundleLayout.ts` | 4 |
| `hiddenName`, `hiddenFolder` (moved from `Core/Paths/exclusion.ts`) | `Core/Paths/nexusPaths.ts` | 4 |
| `stashBlock`, `StashBlock` (moved from `Core/Properties/propertyStash.ts`) | `Core/Properties/properties.ts` | 4 |
| `storedSpaces`, `storedPageIds` (renamed from `archivedPageIds`), `rootFile`; `NexusPages.stored` | `Core/Nexus/heldPages.ts` | 4 |
| `trashedOwners`, `trashReach` | `Core/Bundles/bundle.ts` | 4 |
| `owningCollection`'s and `containerSchema`'s `trashed` parameter; `listBundles`' `chain` parameter | `treePatch.ts`; `bundle.ts` | 4 |
| `storedContainers` (from `archivedSets`), `containerSidecarsUnder` (from `setSidecarsUnder`) | `Core/Nexus/configReach.ts` | 4 |
| `partitionGone`, `goneLink` (private) | `Core/Nexus/governedSweep.ts` | 4 |
| The watcher's Trash arm | `Desktop/FileWatch/watcher.ts` | 4 |
| `Core/Bundles/restore.ts`: `restoreBundle`, `restored` (private) | Placements | 5 |
| `Core/Nexus/arrival.ts` (from `Core/Trash/restoreScrub.ts`): `arrive`, `recognize`, `arrivedSpaces`, `recognizeSpaces`; `retag`, `refill` (private) | Placements | 5 |
| `Core/Trash/empty.ts` (renamed from `spend.ts`) | Placements | 5 |
| `Core/Archive/archiveLabel.ts` (renamed from `archivePlace.ts`) | Placements | 5 |
| `Core/Trash/TrashFrame.tsx`, `Core/Trash/trash-frame.css` (moved from `Core/Settings/`) | Placements | 5 |
| `'bundles:permanentDelete'` (in place of `delete:facts`) | `Core/Bundles/handlers.ts`, `Core/Contract/bridge.ts` | 5 |
| `restoreDestination`'s archive arm's `at` | `Core/Nexus/mutateRequest.ts` | 5 |
| `livePath` (in place of `livePagePath`) | `Core/Nexus/record.ts` | 5 |
| `runBundled`; `atItemNow` and `Acted` (private) | `Core/Interface/Confirm/confirmations.ts` | 5 |
| `notifyBundled`, `Bundled`, `Titled` (in place of `Asked`); "N Pages couldn’t be undone." | `Core/Interface/Notifications/notifications.ts` | 5 |
| `BundleFooting`; `useDateColumn`, `widestDate`, `WIDEST_AT`, `DAY_MS` (moved); `DateColumn` | `Core/Bundles/BundleTable.tsx` | 5 |
| `Listing`'s export | `Core/Bundles/browser.ts` | 5 |
| `respell` (moved from `settle.ts`) | `Core/Nexus/cascade.ts` | 5 |
| `parkLinks` (moved from `trashedCopies.ts`) | `Core/Bundles/record.ts` | 5 |
| `openBundle`'s and `innerRecord`'s `left`; `readBundleAt`'s and `keptLinksUnder`'s `movedOut`; `listBundles`' `recordOnly` | `Core/Bundles/bundle.ts` | 5 |
| `arrive`'s `filed`; `Departed` | `Core/Nexus/arrival.ts` | 5 |
| `moveIndexPaths`' `reads`; `applyMove`'s `given` | `Core/Index/indexSeed.ts`, `Core/Nexus/fileEvents.ts` | 5 |
| `sweepRootsById`'s per-key `above` | `Core/Nexus/governedSweep.ts` | 5 |
| `settle`'s `spaces` | `Core/Nexus/settle.ts` | 5 |
| `bundleOf` (test support) | `Core/Testing/settledMutate.ts` | 5 |
| `Core/Testing/bundles.ts`: `bundleNexusEachTest`, `bundleDirs` (from `spend.test.ts`), `onlyBundle`, `stateOrder`, `PAGE_A`–`PAGE_C`, `BrowserChannels` (module-private), `stubBrowserEachTest`, `rowOf`, `boxOf`, `press`; `bundleRow` and `seedPropertyBundle` (from `fixtures.ts`) | Placements | 6 |
| `Core/Trash/gather.test.ts`, `Core/Trash/empty.test.ts`, `Core/Trash/discard.test.ts` | Tests (created) | 6 |
| `Core/Bundles/restore.test.ts`, `Core/Nexus/arrival.test.ts`, `Core/Paths/bundleLayout.test.ts`, `Core/Trash/TrashFrame.test.tsx` | Tests (moved) | 6 |
| "That path is in neither the Trash nor an Archive." | `Core/Bundles/bundle.ts` | 6 |

**REMOVED**

| Concept | Location | Phase |
|---|---|---|
| The flush per file • Mechanism | `Desktop/Platform/nodeMachine.ts` | 1 |
| `sameFile`'s birth comparison • Comparison | `Core/Platform/machine.ts` | 1 |
| `describes` • Function | `Core/Index/indexSeed.ts` | 1 |
| `Echo.hash`, `recordWrite`'s content parameter • Field, parameter | `Core/Files/writeEcho.ts` | 1 |
| `forgetWrite`, `writtenHash` • Functions | `Core/Files/writeEcho.ts` | 1 |
| `Changed.written` • Field | `Core/Files/writeEcho.ts` | 1 |
| "metadata: the copy to `<id>` refused:" • String | `Core/Nexus/pageMetadata.ts` | 1 |
| `UV_THREADPOOL_SIZE` line, `availableParallelism` import (AFTER A) • Statement, import | `Desktop/main.ts` | 1 |
| "The Thread-Pool Line's Placement" (AFTER A) • Open Item | `.claude/Planning/Write Path/Write Path — Implementation Plan.md` | 1 |
| `Core/Trash/trashMode.ts` (`TrashMode`, `DEFAULT_TRASH_MODE`) | `Core/Trash/` | 2 |
| `TrashDeps`, `trashDeps` | `Core/Trash/discard.ts` | 2 |
| `trashFileFlat` (folded into `discardFile`) | `Core/Trash/discard.ts` | 2 |
| `discardFile`'s system arm and `deps` parameter | `Core/Trash/discard.ts` | 2 |
| `AppConfig.trashMode`, `trashModeOf`, and its decode | `Desktop/Config/appConfig.ts` | 2 |
| `HostContext.trashMode` and its install | `Core/Contract/handlers.ts`, `Desktop/main.ts` | 2 |
| `delete:facts`'s `trashMode` half | `Core/Trash/handlers.ts`, `Core/Contract/bridge.ts` | 2 |
| `DELETE_FACTS_FALLBACK.trashMode`; the copy "It will be moved to the system trash." | `Core/Interface/Confirm/confirmations.ts` | 2 |
| `MutateContext.deps`; `deps` on `handleMutate`, `finishOwed`, `finishEntry`, `finishArm`, `finishContext`, `finishSpace`, `leave`, `emptyBundle`, `migrateAssets`, `sweepLegacyRoot`, `reviseTile`, `discardTileFile`, `removeTile`, `convertTile`, `settledMutate` | `Core/Nexus`, `Core/Trash`, `Core/Assets`, `Core/Tiles`, `Core/Testing` | 2 |
| `onTile`'s `ctx` | `Core/Tiles/handlers.ts` | 2 |
| `deleteOp`'s no-bundle path, Collection-takes-its-Archive arm, metadata drop, and system discards | `Core/Trash/delete.ts` | 2 |
| `finishContext`'s no-bundle order drop; `leave`'s discard branch | `Core/Nexus/finishOwed.ts` | 2 |
| Content `partial` | `Core/Bundles/record.ts`, `Core/Bundles/bundle.ts` | 2 |
| The Context record's `at` | `Core/Bundles/record.ts` | 2 |
| `ContextEvidence`, `gatherContextEvidence`, `buildContextRecord` | `Core/Trash/gather.ts` | 2 |
| `identityOf` (inlined into `innerRecord`) | `Core/Bundles/record.ts` | 2 |
| `gatherSpaceRecord`'s null and `unaddressable` arms and its registry parameter | `Core/Trash/gather.ts` | 2 |
| `dropContextOrder` | `Core/Nexus/reorder.ts` | 2 |
| `slotOf` (folded into `placeAmong`) | `Core/Bundles/placement.ts` | 2 |
| The kept record's `unspent` gate | `Core/Trash/spend.ts` | 2 |
| `confirmDelete`'s `undoTo` | `Core/Interface/Confirm/confirmations.ts` | 2 |
| `ArchiveView`'s `?? owner.id` fallback and its store read | `Core/Archive/ArchiveView.tsx` | 2 |
| `returningNames`' export | `Core/Nexus/settle.ts` | 2 |
| `deleteOp`'s `write`, `unminted`, `leave`, `deleted`, `moved`, and `stripped`; `deleteNote`'s `root` and `bundle` | `Core/Trash/delete.ts` | 3 |
| `dropDeparture`'s `tree`, `kind`, and `rel` parameters and its lookups | `Core/Nexus/reorder.ts` | 3 |
| `DeleteCascade`, `NO_STRIP`, `deleteCascade`'s post-sweep read of what it took | `Core/Nexus/cascade.ts` | 3 |
| The finish's append of a delete's links | `Core/Nexus/finishOwed.ts` | 3 |
| `appendLinks` (moved), `spendBundle`'s inline link filter and journal edit | `Core/Trash/trashedCopies.ts`, `Core/Bundles/bundle.ts` | 3 |
| `ContainerEntry.park`, `ContainerEntry.within` | `Core/Nexus/owed.ts` | 3 |
| `collectionArchive` | `Core/Archive/archive.ts` | 3 |
| `refileFiled`; `refileArchived`'s `to` and `above`; `refileLanded`'s `dir` (its `chain` in place) | `Core/Archive/refile.ts` | 3 |
| `archiveFiling`'s own deepest-live computation | `Core/Bundles/placement.ts` | 3 |
| The hand-written `elsewhere` memos in `settleArchives` and `owedEdit` | `Core/Archive/refile.ts`, `Core/Nexus/finishOwed.ts` | 3 |
| `Core/Bundles/layout.ts` (moved), `stampedSegment` | Bundles | 4 |
| `archiveSegs`, `archivedCollectionIdOf`, `isArchived`; `ArchiveStore` and `archiveDirRel` moved out | `Core/Paths/nexusPaths.ts` | 4 |
| `archiveStoreOf` (moved out) | `Core/Paths/names.ts` | 4 |
| `hiddenName`, `hiddenFolder` (moved out) | `Core/Paths/exclusion.ts` | 4 |
| `stashBlock`, `StashBlock` (moved out) | `Core/Properties/propertyStash.ts` | 4 |
| `outsideArchive` | `Core/Nexus/governedSweep.ts` | 4 |
| `archivedPageIds` (renamed) | `Core/Nexus/heldPages.ts` | 4 |
| `archivedSets`, `setSidecarsUnder` | `Core/Nexus/configReach.ts` | 4 |
| `pageRelationsOf`, `gatherLinkTargets` | `Core/Trash/gather.ts` | 4 |
| `linkTargets`, the `targets` field on three record arms | `Core/Bundles/record.ts` | 4 |
| `matchOf`, `currentKeys`, `scrubReturning`, `Match` | `Core/Trash/restoreScrub.ts` | 4 |
| `frozenWorld`, `trashedHolders`, `refillTrashed` | `Core/Trash/trashedCopies.ts` | 4 |
| `originPagesIn` | `Core/Bundles/bundle.ts` | 4 |
| `withUnswept`, `landWorked` | `Core/Nexus/cascade.ts` | 4 |
| `renameFrontmatterKey` | `Core/Files/pageFile.ts` | 4 |
| `Worked`, `workedOut`, `oweWorked`, `RelinkEntry.values` | `Core/Nexus/owed.ts` | 4 |
| `Frozen` | `Core/Nexus/governedRoot.ts` | 4 |
| `returningCascade`'s `repair` parameter; `deleteCascade`'s `abs`; `unlinkMembers`' `skipUnder` | `settle.ts`; `cascade.ts`; `contextCascade.ts` | 4 |
| `originPathOf`'s, `originPagesOf`'s, and `keptLinksUnder`'s `store`; `moveIntoStore`'s address guard | `Core/Paths/bundleLayout.ts`; `Core/Bundles/bundle.ts` | 4 |
| `Core/Trash/trashedCopies.test.ts` | Tests | 4 |
| `restoreTrashed`, `Restored`, `restored`, `reapply` (moved) | `Core/Trash/spend.ts` | 5 |
| `restoreArchived` | `Core/Archive/archive.ts` | 5 |
| `Core/Trash/restoreScrub.ts`, `Core/Trash/trashedCopies.ts`, `Core/Trash/handlers.ts` (`trashHandlers`), `Core/Trash/spend.ts`, `Core/Archive/archivePlace.ts`, `Core/Settings/TrashFrame.tsx`, `Core/Settings/trash-frame.css` | Placements | 5 |
| `MutateOutcome.bundled` | `Core/Nexus/mutateRequest.ts` | 5 |
| The record's `archive` field; `appendLinks`' export | `Core/Bundles/record.ts` | 5 |
| `ARCHIVE_UNDO`, `Undone`, `undoneOf`, `rearchive`, `DateKey`, `rulesOf`'s `restoreUndo`, `deleteUndo`, and `dateKey`, `steppedTo` (moved), `restoreOne`, `deleteOne`, `many`, `restoreBatch`, `deleteBatch`, the hook's `date` | `Core/Bundles/browser.ts` | 5 |
| `offerDeleted`, `DELETE_FACTS_FALLBACK`, `offerUndo`'s destination, `Asked` (into `Titled`) | `Core/Interface/Confirm/confirmations.ts` | 5 |
| `notifyDeleted`'s cascade and retry parameters | `Core/Interface/Notifications/notifications.ts` | 5 |
| The slice's `unrestoredLine` post | `Core/Session/nexusSlice.ts` | 5 |
| `returningNames`, `returningCascade`, `respell` (moved) | `Core/Nexus/settle.ts` | 5 |
| `linkWorld`'s `more` | `Core/Nexus/heldPages.ts` | 5 |
| Both skins' `footing()` | `TrashFrame.tsx`, `ArchiveView.tsx` | 5 |
| `delete:facts` | `Core/Contract/bridge.ts` | 5 |
| The copy "That deletion never finished; there is nothing to restore." | `Core/Trash/spend.ts` | 5 |
| `Core/Trash/spend.test.ts`, `Core/Trash/restoreScrub.test.ts`, `Core/Bundles/layout.test.ts`, `Core/Settings/TrashFrame.test.tsx` (moved) | Tests | 6 |
| `onlyBundle`, `bundleDirs`, the seed; `onlyBundlePath`; two `stateOrder`s | `spend.test.ts`; `restoreProperty.test.ts`; `spend.test.ts`, `trashRecovery.test.ts` | 6 |
| The three skin harnesses' channel stubs and their `rowOf`, `boxOf`, `press`, `indentOf`; `BundleTable.test.tsx`'s `rowOf` and `boxOf` | `TrashFrame.test.tsx`, `ArchiveView.test.tsx`, `browser.test.ts`, `BundleTable.test.tsx` | 6 |
| `bundleRow`, `seedPropertyBundle` (moved) | `Core/Testing/fixtures.ts` | 6 |
| Nineteen duplicated cases; `describe('a Trash row')` | Tasks 6-1 and 6-7 | 6 |
| "Only a trash or archive record can be spent." | `Core/Bundles/bundle.ts` | 6 |
| `.claude/Benchmarks/Reach-In/` | Harness | 6 |
| `NexusRecordPM.md`'s Known Issue "A process dying between the sweep and the settle" | Feature docs | 6 |

#### Constraints

- **Mandate (Nathan's, verbatim from *Trash & Archive Restructure — Decisions & Intention · §Constraints*):**
  - **Approach:**
    - Any approaches being considered here must first assess what’s true *now* that would be able to be removed, deleted, changed, consolidated, or replaced. We’re not going to design based on what’s currently there and simply adjust course, we’re ensuring totality-first application, removal-first scoping, and residue-eliminating frameworks that provide a clean slate rather than building changes on top of what’s ultimately going to be replaced.
    - We’re approaching this through consolidation-first properties, ensuring the codebase ends up more understandable, less complex, more efficient in what it does, less conflicting in defining that, and an overall cleaner foundation to work within.
    - We shouldn’t adding anything new unless there’s evidence that it’s required. We’d approach this through the perspective of ending up with cumulatively “less stuff” in the codebase overall — less ways to do similar things, less complexity, fewer paths to go through, less tech debt waiting to surface, less things to maintain, and less headaches when approaching future work entirely — while the line-count *may* end up positive. Net-negative lines are the north star, but any net-positive gain *must* have its rationale for that outcome be genuinely backed through this framework and our <principles>.
    - Anything within our surface area should be left reading as always-intentional, without any odd-ones-out designs, and be reflective across the broader codebases' resulting shape — not just maintaining remnants or adherence to what’s true *now* that’s ultimately going to change. The approach should reflect the outcome and shouldn’t be bound to constraints that were only relevant before.
    - Ensure we're looking *outward* for cross-file opportunities and shared design, avoiding hand-rolling or duplicating what's already there or can be adjusted accordingly. Pommora is an established codebase and we’re not starting from scratch.
    - The complex data-level mechanics of the codebase are what least reflect *Nathan’s* intentions and are primarily reflective of what’s determined appropriate via past session agents. Treat it with care and respect, but don’t assume it’s beyond changing within reason, where simply presenting the approach to Nathan may be all that’s required to genuinely change the codebase for the betterment of everything within it and future iterations.
  - **Principles:**
    - **Less to Carry:** No more functions, helpers, wrappers, types, layers, and call sites than necessary, and no logic stated twice. New code earns its place by removing more than it adds, fixing incorrect behavior, or delivering required behavior in its minimal form.
    - **Less to Understand:** A reader finds what exists, where it lives, what owns it, and what calls it with less searching and tracing than before, whether a developer reading code or Nathan reading file names and headers. A blind-eye review of the surface areas impacted by this implementation should find less confusion, less conflict about intent, and an unambiguously more approachable, maintainable ecosystem to iterate on.
    - **Clearer Boundaries:** Each responsibility has one owner, and the next change of a kind has one obvious place to go, with no choice between layers, helpers, or modules — nothing that exists somewhere where it shouldn't; nothing implemented where something else already does it or adjusting it accordingly would be the more appropriate approach; nothing that increases the risk of misassumption when working here in the future.
    - **Reads as Designed:** Nothing temporary, transitional, kept for compatibility, unreachable, needlessly indirect, or left over from the work remains. Nothing designed around codebase shapes that will ultimately be changed for the better.
    - **One Way:** Each thing has one implementation, one pattern, and one source of truth. No part contradicts another. Exceptions carry their reason where a reader meets them, in code or feature documentation.
    - **Real Purpose:** Anything added to the codebase should have its purpose clearly stated with the perspective of its value enhancing what's already there — complexity, duplications, divergences, multiple ways to do the same thing — and anything "new" added should be assessed using that. Line-count increases shouldn't translate into maintenance cost or complexity.
    - Anything introduced should have independent justification behind its existence that isn't simply self-induced requirements.
    - Anything changed or implemented should be reflected across the board — nothing that's done this way here, while something else works differently elsewhere, unless that's *genuinely* correct.
    - Zero data-level spaghetti, complexity, or additional 'stuff' should be added without reason. Rewiring things to become more understandable, more efficient, more appropriate, and more effective is preferred when the alternative is just adding more to something that's inherently unfit to suit the long-term mandate of what's actually being offered.
- **Adherence:** how the plan holds to each principle, so a reviewer can test the plan against it:
  - **Less to Carry:** the scrub, `targets`, the trashed refill and `Worked`, System Trash Mode, `TrashDeps`, the content-hash echo, and the per-file flush leave whole; every addition (the store-of-path rule, the claim rule, the stored-Space source, recognition) replaces something named beside it.
  - **Less to Understand:** "where a departed item lives, and how it comes back" has one answer for both stores: one model, one restore in `Core/Bundles/restore.ts`, one arrival in `Core/Nexus/arrival.ts`, one store-of-path rule in `Core/Paths/bundleLayout.ts`.
  - **Clearer Boundaries:** `Core/Bundles` owns what both stores share, `Core/Trash` and `Core/Archive` only what's theirs, and the path layout sits in `Core/Paths` below both; every new or moved file is one Nathan approved (*§Placements*).
  - **Reads as Designed:** compatibility-only decodes, ghost guards, test-only exports, the kept record, and the half-reach paths leave; no transitional form lands between commits except Phase 4's one stated inversion.
  - **One Way:** one landing flush per drive, one file identity (`sameFile` with the change time), one watch policy, one claim rule, one restore, one Undo shape, one notice owner, one gone-for-good step, one carry, one trail resolver.
  - **Real Purpose:** each added line is justified in its task against what it removes or the decided behavior it delivers; a phase that lands above its estimate reports what the increase buys.
  - **Reflected Everywhere:** trashed pages follow live pages' rules (Decision D-4), both stores are watched and recognized when moved by hand (Decisions E-1, E-3), and the restore's refill names a trashed page's miss as a live page's (Decision D-5).
- **Briefs:** every agent brief on this plan — executors, checkpoint reviewers, the final waves, and every compaction continuation — carries the Mandate above in full and has its agent read *§Constraints* whole from this file before anything else. The neutral gate's brief carries the Mandate alone.
- **Rulings (Not Re-Raised):** the decisions are the "what" and the rough "how", not a contract (Nathan, 10-29-2026): what each entry in *Trash & Archive Restructure — Decisions & Intention* and its *§Rejected* intends isn't re-raised, while a decision's "how" that isn't the core of the feature changes where another way produces the cleaner outcome, with the reason stated in the task that departs and the departure listed under *§Deviations*. Also not re-raised: the design calls *Investigation · §The Landing* and *§The Trash's Model · §The Rules* record (the watched Trash, the claim rule and its pass-over, the governed rule by the record's Collection ID, links recorded ahead of the strip, the post-rename stat ahead of the change time, a trashed Collection keeping a deleted property's assignment until the property is gone for good, Decision D-3's views through the configuration pass, the scrub removed whole); and these: the watcher swap (I-081) is its own plan; I-033 gets no batch channel; `assetMigrate.ts` stays, since it runs when the user changes the image folder.
- **Placements (Nathan, 10-29-2026):** every new, moved, renamed, or deleted file is one of these, and no other file is created:
  - **Moved:** `Core/Bundles/layout.ts` → `Core/Paths/bundleLayout.ts`, gaining the store-of-path rule, `ArchiveStore` and `archiveDirRel` (from `nexusPaths.ts`), and `archiveStoreOf` (from `names.ts`); `Core/Settings/TrashFrame.tsx` and `trash-frame.css` → `Core/Trash/`.
  - **New:** `Core/Bundles/restore.ts` (the one restore); `Core/Nexus/arrival.ts` (`returningCascade`, `repairLanded`, `artifactFiles`, and the shared arrival tail recognition runs); `Core/Testing/bundles.ts` (the shared bundle fixture and browser harness).
  - **Renamed:** `Core/Trash/spend.ts` → `Core/Trash/empty.ts`; `Core/Archive/archivePlace.ts` → `Core/Archive/archiveLabel.ts`.
  - **Deleted:** `Core/Trash/restoreScrub.ts`, `Core/Trash/trashedCopies.ts`, `Core/Trash/trashMode.ts`, `Core/Trash/handlers.ts` (its channel into `Core/Bundles/handlers.ts`).
  - **Between Existing Files:** `parkLinks` into `Core/Bundles/record.ts`; `collectionArchive` into `empty.ts`; the journal's strip release into `Core/Nexus/owed.ts`; the links-ahead gatherer into `Core/Trash/gather.ts`; the one notice builder into `Core/Interface/Notifications/notifications.ts`; the flat discard's two functions into one in `Core/Trash/discard.ts`; the stored-Space source into `Core/Nexus/heldPages.ts`, which stays one file.
- **Placements Taken in Planning (Nathan, 10-30-2026):** a test file follows its module, so Task 6-3 moves `Core/Trash/spend.test.ts` → `Core/Bundles/restore.test.ts`, `Core/Trash/restoreScrub.test.ts` → `Core/Nexus/arrival.test.ts`, `Core/Bundles/layout.test.ts` → `Core/Paths/bundleLayout.test.ts`, and `Core/Settings/TrashFrame.test.tsx` → `Core/Trash/TrashFrame.test.tsx`, and Tasks 6-4 to 6-6 create `Core/Trash/gather.test.ts`, `empty.test.ts`, and `discard.test.ts` beside their modules; between existing files, `hiddenName` and `hiddenFolder` move into `Core/Paths/nexusPaths.ts` (Task 4-1), which keeps `exclusion.ts` and `bundleLayout.ts` from importing each other; `stashBlock` and `StashBlock` into `Core/Properties/properties.ts` (Task 4-2), so `record.ts` reads the schema from outside the import loop Phase 4 widens; and `respell` into `Core/Nexus/cascade.ts` (Task 5-4), which keeps `arrival.ts` from importing `settle.ts`, which imports it.
- **Plan Rules:** removal comes first in every phase, Phase 4's reach landing with L-10's removals being the one inversion (*Investigation · §Order Constraints*, 7). Tasks are written to their result, so no executor reads an opening to do more than they say. A test that changes asserts the behavior the decisions name rather than being bent to pass. AFTER blocks leave fewer comments than they find, and add one only where the code would otherwise be misread. Any cautionary code has its reason asked of Nathan before it's written. Consolidation that's unambiguously right needs no separate sign-off, and dead or dormant code inside the surface leaves. Every *§Reconciliation* line lands in the commit of the task it names, read with that task's CHANGE, so each doc, comment, and issue turns true in the commit that makes it false.
- **Net-Less, for the Whole System (Nathan, 10-29-2026):** the Approach, the Principles, and net-less weigh every decision for the whole system, not the task in isolation; anything a task makes bigger is justified by them where a reader meets it. The codebase's comment count doesn't grow. Documentation changes are minimal, small re-wordings where a claim turns false, and net-less where possible: no new sections, since little here is user-facing.
- **Obvious Folds (Nathan, 10-29-2026):** a fold inside the surface that Nathan would answer "fix it here" to, and that carries no architectural risk or domino effect, is included without asking; anything larger is recorded under *§Deviations* for him.
- **Not Feature-Level:** what a user sees is unchanged apart from speed and the decided behaviors under *§Overview*; the Trash's and the Archive's tables keep their looks (Decision C-7). Anything else that would change what a user sees is recorded under *§Deviations* for Nathan and taken at its simplest reading that changes nothing visible.
- **Sync:** nothing under `Core/Sync/` or `Sync/` changes (Decision B-1). Sync's landing, `landBytes`, is Core code and inherits the group flush unchanged; `Core/Sync/Client/tap.ts:50`'s drop of watched `.trash` events becomes reachable once the Trash is watched, and stays as it is.
- **Gates:** `npm run typecheck`, `npm run test`, and `npm run lint`, from the repo root; each prints its own failures, and lint runs clean. Biome formats every TS and JSON write, so an edit failing on whitespace means it reformatted: re-read and retry. "Run the gates" in a task means those three. `npm run build`, confirming `✓ built in`, runs from a clean state at the final head.
- **Commits:** each task commits once its VERIFY passes, through `git commit --only -m "…" -- <paths>` after `git add` for new files (*Development-Environment · §Gates & Commits*). Messages are past tense, one to three sentences, and end with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`. The post-commit hook pushes `active`. A Bash command carrying `git` can't contain a personal name anywhere, paths included.
- **Tests:** each new behavior gets a test that fails without its change, run once against the code with the change reverted and watched red; a rewritten case counts as that test. A test pinning behavior a decision removes is rewritten to the decided behavior or leaves with the code it pinned, as its task names. Tests stay in the suites they're in until Phase 6 moves them where their behavior lives.
- **The Number:** every phase's VERIFY runs `python3 ~/"The Studio/.claude/scripts/view-delta/view-delta.py" <BASELINE>..HEAD --exclude .claude` and records the **Actionable** column in the Net Ledger beside the phase's estimate, additions and removals apart. A phase that lands above its estimate is reported in chat before the next phase opens, with what the increase buys.
- **The Measurement (Decision G-2):** the property rename's before is on record: the re-run's medians at `9b9c0d630` (*Investigation · §The Trash's Model · §The Measurement*), whose property-rename path the BASELINE head carries unchanged, with the baseline build for today's Trash and the reach-in prototype for a reach-in one. After Phase 5, the harness in `.claude/Benchmarks/Reach-In/` (`RERUN.md`) measures HEAD alone at Medium-0 and Medium-50, three runs each, since the code itself is now reach-in, and the Net Ledger records both against the recorded medians. Phase 1's thread-pool measurement is its own task. The harness and its fixtures leave in Phase 6 (Decision A-1).
- **Live Drives:** Nathan takes no hand checks (10-29-2026). Every live check runs as an agent's CDP drive (*Development-Environment*) on a scratch copy of `~/Test`, from a worktree build with its own userData and debug port; the app is never launched from the main checkout, where Nathan's instance runs.
- **Execution:** the plan runs end to end through `c/plan-execution`, headlessly once Nathan ratifies it, and no step waits on Nathan; a message from him during the run is input to fold in, not a stop. An ambiguity is taken at its simplest reading and recorded under *§Deviations*; anything that needs Nathan's word is recorded there for the final report. Each task goes to an `execution-agent` (`opus-medium`) informed of *§Context* and *§Overview*, which applies the task's AFTER as written and reports insights, concerns, and suggestions rather than diverging; the orchestrator checks its result against the task's AFTER and VERIFY. Every phase ends with its review checkpoint: two read-only agents, one under `code-simplification` and one under `adversarial-review`, each weighing the phase against these constraints and its place in the plan, reading outward rather than in isolation. Compaction checkpoints follow Phases 3 and 6 (Nathan, 10-30-2026), each a stop with `c/pre-compaction`'s two blocks for him.
- **Cold Machine:** when the run ends, no process, worktree, benchmark Nexus, scratch userData, test fixture, or temporary script it created remains; *§Final Verification · The Cold-Machine Check* proves it with commands, and the final report states the result. A Pommora instance launched from the main checkout before the run isn't the run's, and it's left alone.
- **Neutral Gate:** the post-implementation neutral reviewer (`fable-high`) gets only the BASELINE head, HEAD, the Mandate, and this intention: *"Pommora kept departed items in two stores built on two models. The Archive kept its pages in the index and inside every cascade, so its restore was a move; the Trash froze each copy and repaired it on return through a scrub that couldn't follow a rename, while three paths reached into trashed copies anyway, a second delete mode bypassed the Trash, each restore, notice, and Undo was written twice, and every write waited for the drive one file at a time. This work moves the Trash onto the Archive's model so trashed pages stay current and one restore serves both stores and every item moved out of a store by hand, removes the frozen-copy machinery and the second delete mode, and lands each group of files with one flush, identified by the file's change time. User-facing behavior is unchanged except where trashed pages now follow live pages' rules."*
- **Out of Scope Everywhere:** the watcher swap (I-081); Sync's code; a Context moved back by hand (Decision E-4); verifying the write-through flag and the change time on Windows and exFAT (*§Open Items*); merging the two stores or changing the Archive's layout (Decision C-1); merging a Context's two orders, which is feature-level; a keyboard path to a bundle row's menu (I-080), which is interaction-level and independent of either model.

#### Process Overview

- [x] **Phase 1** — The Landing
  - [x] Task 1-1 · One flush per drive, and the stat after the rename
  - [x] Task 1-2 · The thread-pool line, measured and removed
  - [x] Task 1-3 · The change time identifies a file
  - [x] Task 1-4 · The echo by stat
  - [x] Task 1-5 · The clash check and the option edit pass over vouched rows
  - [x] Task 1-6 · A metadata copy writes each month once
  - [x] Review Checkpoint
- [x] **Phase 2** — Residue
  - [x] Task 2-1 · System Trash Mode and the `TrashDeps` seam leave
  - [x] Task 2-2 · The content record's `partial` leaves
  - [x] Task 2-3 · Records from the tree, and a Context's place
  - [x] Task 2-4 · The rest of the residue
  - [x] Review Checkpoint
- [ ] **Phase 3** — Delete, Journal, and Carry
  - [x] Task 3-1 · One mint, one tail, one `leave`
  - [x] Task 3-2 · A content delete records its links ahead of the strip
  - [ ] Task 3-3 · One container note, and the Set move's own kind
  - [ ] Task 3-4 · The empty is the one gone-for-good step
  - [ ] Task 3-5 · One trail resolver and one carry
  - [ ] Task 3-6 · One owned-Archives iterator
  - [ ] Review Checkpoint
  - [ ] Compaction Checkpoint
- [ ] `[Stop: c/pre-compaction's two blocks for Nathan; after the compaction, reread §Constraints and c/plan-execution from the files before the next task opens]`
- [ ] **Phase 4** — Reach-In
  - [ ] Task 4-1 · The store-of-path rule
  - [ ] Task 4-2 · Trashed Spaces become holders
  - [ ] Task 4-3 · The Trash is admitted and watched
  - [ ] Task 4-4 · A cascade reaches the Trash by the record's Collection
  - [ ] Task 4-5 · The returning side of the frozen model leaves
  - [ ] Task 4-6 · The holders' side of the frozen model leaves
  - [ ] Review Checkpoint
- [ ] **Phase 5** — One Restore, Recognition, and the Interface
  - [ ] Task 5-1 · Following an id covers a Set
  - [ ] Task 5-2 · Every reversible reply carries its own Undo, through one notice
  - [ ] Task 5-3 · The table owns its date column and footing
  - [ ] Task 5-4 · The arrival's one home
  - [ ] Task 5-5 · One restore for both stores
  - [ ] Task 5-6 · Pages and Sets moved out by hand
  - [ ] Task 5-7 · Spaces moved back by hand
  - [ ] Review Checkpoint
- [ ] **Phase 6** — Tests, Docs, and the Closing Measurement
  - [ ] Task 6-1 · The duplicated cases
  - [ ] Task 6-2 · The on-disk bundle fixture
  - [ ] Task 6-3 · The suites follow their modules
  - [ ] Task 6-4 · The delete records' and the listing's cases
  - [ ] Task 6-5 · The empty's cases
  - [ ] Task 6-6 · `discardFile`'s cases and the Archive's delete case
  - [ ] Task 6-7 · The browser harness and the skins' duplicates
  - [ ] Task 6-8 · The Trash skin's shared cases to their owners
  - [ ] Task 6-9 · The docs and comments no earlier phase takes
  - [ ] Task 6-10 · `.claude/CLAUDE.md`'s structure lines
  - [ ] Task 6-11 · The closing measurement
  - [ ] Task 6-12 · The harness's removal
  - [ ] Review Checkpoint
  - [ ] Compaction Checkpoint
- [ ] `[Stop: c/pre-compaction's two blocks for Nathan; after the compaction, reread §Constraints and c/plan-execution from the files before the next task opens]`
- [ ] *§Final Verification* over `<BASELINE>..HEAD`
- [ ] `[Stop: the final report, per §Final Verification]`

---

### Phase 1 — The Landing

**GOAL:** Each group of files lands with one flush per drive, and the stat a landing answers is the file as it stands after its rename, change time included, so the index, the walk cache, and the watcher's echo tell a file by one identity that a rewrite keeping its time and size can't hide behind (Decisions G-1, G-3, and G-4). With that identity, a rename's clash check and an option edit pass over the rows the index vouches for, and the flush per file, the content-hash echo, and the birth-based identity leave. It's its own phase because nothing in it depends on the Trash's model, while Phase 4's reach-in widens what the index's membership decides and needs the change time first.

**THE TREE:** HEAD; every `-` line reads HEAD's code.

**NOT TAKEN:**
- **LD-8 · The Remint as One Held Rewrite:** `runRemintPass` (`Core/Nexus/remint.ts:46-64`) keeps landing each target alone and in series. A Finder-duplicated folder of N pages pays N flushes at its next open, a rare path that doesn't earn the +12 lines a held rewrite would take.
- **LD-9 · The Strict Edit:** `editJsonStrict` and `StrictEdit` stay, with `reachConfig` their one caller (`configReach.ts:321`). `rewriteHeld` reads an absent file and an unreadable one alike as `unread` (`atomicWrite.ts:84,89-90`), where the pass counts only an unreadable one as a skip (`configReach.ts:318-326`), and `tileHostsOf` lists every Space whether or not it holds a board (`Core/Tiles/tileHosts.ts:22-35`), so every board-less Space would read as a skip and owe a Try Again. The strict edit also makes its result the file's last read (`atomicWrite.ts:347`), which a damaged `_tiles.json` is rebuilt from (`Core/Tiles/tileDoc.ts:21,25-39`). Telling the two apart would put a branch for this one caller in `rewriteHeld`, and the pass's own comment (`configReach.ts:318`) already states the skip rule where a reader meets the edit.

#### Task 1-1

**TASK:** Every temp a landing writes goes through to its drive as it's written, so one flush of each drive the group's temps sit on makes the group durable before any of its files is renamed, which keeps Decision F-3's guarantee (LD-3, with Decision G-4's flag); and each commit answers a stat of the file taken after its rename (LD-1). The temp's stat moves from the commit into `stage`, where it also names the drive. **Cautionary (Nathan, 10-30-2026):** a rename keeps a file's modification time and size, so the commit answers the post-rename stat only while those are still the temp's, and the temp's own otherwise, so an outside writer (Obsidian on NexusOS, a sync arrival) landing between the rename and the stat is heard and re-read rather than vouched for as the app's own write by the echo record, the index row, and the walk cache. **Departures:** each commit waits on its own drive's flush rather than every flush answering before any commit (*Investigation · §The Group Flush*), since Decision F-3's guarantee is each file's, and waiting on every drive would hold one drive's renames behind another's flush for nothing; `CHUNK`'s docstring changes here, where it turns false, rather than with LD-6. `land`'s comment leaves, since `stage`'s states the order, so the flag's comment leaves the count level.

**NOW:** `stage` (`Desktop/Platform/nodeMachine.ts:50-89`) opens each temp `'wx'` (`:60`), writes it, dates it (`:69`), and flushes it with its own `handle.sync()` (`:70`), the only production flush. Its commit checks `expect` against a fresh stat (`:76-78`), takes the temp's `handle.stat()` (`:79`), restores the file's mode (`:81`), closes (`:82`), renames (`:83`), and answers that pre-rename stat (`:84`); `land` (`:95-103`) stages the whole group, then commits it, one full drive flush per file. T-N19 (`Desktop/Platform/nodeMachine.test.ts:74-81`) pins three `synced` for three files, and `CHUNK`'s docstring (`Core/Files/atomicWrite.ts:50`) and `CorePM.md:105` describe a flush per file. The disk double already answers a stat taken after its rename (`Core/Testing/machines.ts:170`). A rename keeps a file's modification time, size, and birth, so the post-rename answer changes nothing `sameFile` reads until Task 1-3 gives it the change time, where T-N4 starts pinning it.

**CHANGE**

- [x] Write the four `nodeMachine landing` cases below and watch each fail: the T-N19 rewrite, "flushes a group once, before renaming any of its files" (one `synced`; it fails with three); "opens each temp to write through to its drive" (it fails while the temp opens `'wx'`); "a failed flush rejects every file it would have made durable and leaves no temp" (it fails without the commit's `await flushed`); "answers its own stat when an outside write lands between the rename and the stat" (the mocked `rename` writes the file from outside once it lands; it fails while the commit answers the post-rename stat unchecked).
- [x] Apply the AFTER, `TEMP_FLAGS` wrapped as Biome formats it.
- [x] In `.claude/Features/CorePM.md:105`, "each file in a group is written to a dotted temp beside it, and every temp is flushed before any is renamed into place" becomes "each file in a group is written through to the drive in a dotted temp beside it, and each drive the group's temps sit on is flushed once before any of them is renamed into place".

**AFTER**

```Desktop/Platform/nodeMachine.ts diff
@@ imports @@
 import { createHash, randomBytes } from 'node:crypto'
~import { constants, realpathSync, type Stats } from 'node:fs'
 import { lstat, mkdir, open, readdir, readFile, realpath, rename, rm, stat } from 'node:fs/promises'
@@ outlastHolder @@
     }
   }
 }
 
+// Each temp writes through to its drive, so one flush of the drive's cache makes a whole group durable. Node names no write-through flag on Windows, where libuv maps its own value to FILE_FLAG_WRITE_THROUGH; that mapping ships unverified there.
+const TEMP_FLAGS =
+  constants.O_WRONLY | constants.O_CREAT | constants.O_EXCL | (isWindows ? 0x04000000 : constants.O_DSYNC)
+
-// Beside its file, or a symlink's target, which it lands at (a link to nothing is landed over), so the rename stays on one volume; dotted, so the walk, the watcher, and sync never admit it, which is also why a temp a crash or a folder moved mid-flush strands is left where it lies; and fixed-length, so a file named to the length limit still has room for it. Answers the file's commit, which lands it once its group has flushed.
+// Beside its file, or a symlink's target, which it lands at (a link to nothing is landed over), so the rename stays on one volume; dotted, so the walk, the watcher, and sync never admit it, which is also why a temp a crash or a folder moved mid-flush strands is left where it lies; and fixed-length, so a file named to the length limit still has room for it. Answers the drive the temp sits on, the flush that empties that drive's cache, and the file's commit, which lands it once that flush answers and answers the stat the file then holds while its time and size are still the temp's, which a rename keeps, and the temp's own otherwise, so an outside write landing between the rename and the stat is heard.
 async function stage({
   path: named,
   data,
   mtimeMs,
   expect,
-}: Landing): Promise<() => Promise<FileStat>> {
+}: Landing): Promise<{
+  dev: number
+  flush: () => Promise<void>
+  commit: (flushed: Promise<void>) => Promise<FileStat>
+}> {
   const path = (await absentToNull(lstat(named)))?.isSymbolicLink()
     ? posixPath(await realpath(named).catch(() => named))
     : named
   const temp = join(dirname(path), `.landing-${randomBytes(6).toString('hex')}`)
~  const handle = await open(temp, TEMP_FLAGS)
   const discard = async (e: unknown): Promise<never> => {
     await handle.close()
     await rm(temp, { force: true })
     throw e
   }
+  let own: Stats
   try {
     await handle.writeFile(data)
     // A volume that refuses the time leaves the file dated now; its bytes still land.
     if (mtimeMs !== undefined) await handle.utimes(mtimeMs / 1000, mtimeMs / 1000).catch(() => {})
~    own = await handle.stat()
   } catch (e) {
     return discard(e)
   }
-  return async () => {
-    try {
-      const held = await absentToNull(stat(path))
-      if (expect !== undefined && !sameFile(expect, held && fileStat(held)))
-        throw new Error(`${basename(path)} changed while its write waited.`)
-      const own = await handle.stat()
-      // The temp was created through the umask, so the file keeps the permissions it had; a volume that refuses them leaves the temp's, and its bytes still land.
-      if (held && held.mode !== own.mode) await handle.chmod(held.mode).catch(() => {})
-      await handle.close()
-      await outlastHolder(path, () => rename(temp, path))
-      return fileStat(own)
-    } catch (e) {
-      return discard(e)
-    }
-  }
+  return {
+    dev: own.dev,
+    flush: () => handle.sync(),
+    commit: async (flushed) => {
+      try {
+        await flushed
+        const held = await absentToNull(stat(path))
+        if (expect !== undefined && !sameFile(expect, held && fileStat(held)))
+          throw new Error(`${basename(path)} changed while its write waited.`)
+        // The temp was created through the umask, so the file keeps the permissions it had; a volume that refuses them leaves the temp's, and its bytes still land.
+        if (held && held.mode !== own.mode) await handle.chmod(held.mode).catch(() => {})
+        await handle.close()
+        await outlastHolder(path, () => rename(temp, path))
+        const now = fileStat(await stat(path))
+        return now.mtimeMs === own.mtimeMs && now.size === own.size ? now : fileStat(own)
+      } catch (e) {
+        return discard(e)
+      }
+    },
+  }
 }
@@ nodeMachine.land @@
   readBytes: (p) => absentToNull(readFile(p)),
-  // Every temp is written and flushed before any rename, so the group's flushes overlap rather than wait in turn.
   async land(files) {
     const staged = await Promise.allSettled(files.map(stage))
+    const flushes = new Map<number, Promise<void>>()
+    for (const s of staged)
+      if (s.status === 'fulfilled' && !flushes.has(s.value.dev))
+        flushes.set(s.value.dev, s.value.flush())
     return Promise.allSettled(
       staged.map(async (s) => {
         if (s.status === 'rejected') throw s.reason
~        return s.value.commit(flushes.get(s.value.dev)!)
       }),
     )
   },
```

```Core/Files/atomicWrite.ts diff
@@ CHUNK @@
-/** The files a held rewrite holds, reads, and lands together, so their reads and their flushes overlap: each flush holds one of the host's I/O threads until the drive answers, so the app's other reads and writes wait tens of milliseconds behind a chunk. */
+/** The files a held rewrite holds, reads, and lands together, so their reads overlap and one flush of the drive makes them all durable: 64 lands a file in about 170 µs against about 415 at 16, and 256 would save about 70 µs more a file for four times as long a hold of the chunk's locks. */
 const CHUNK = 64
```

```Desktop/Platform/nodeMachine.test.ts diff
@@ imports @@
+import { constants } from 'node:fs'
 import {
   chmod,
@@ imports @@
   symlink,
+  utimes,
   writeFile,
 } from 'node:fs/promises'
@@ imports @@
-import { noModeBits, tempRoot } from '@pommora/core/Testing/hostFs'
+import { noModeBits, tempRoot, windows } from '@pommora/core/Testing/hostFs'
@@ hoisted @@
 const synced = vi.hoisted(() => ({ hook: async (): Promise<void> => {} }))
+const afterRename = vi.hoisted(() => ({ hook: async (_to: string): Promise<void> => {} }))
@@ vi.mock('node:fs/promises') @@
     open: async (...args: Parameters<typeof real.open>) => {
+      log.push(`open ${args[1]}`)
       const handle = await real.open(...args)
@@ vi.mock('node:fs/promises') @@
     rename: async (from: string, to: string) => {
       log.push(`rename ${from}`)
-      return real.rename(from, to)
+      await real.rename(from, to)
+      await afterRename.hook(to)
     },
@@ describe 'nodeMachine landing' · beforeEach @@
     synced.hook = async () => {}
+    afterRename.hook = async () => {}
   })
@@ describe 'nodeMachine landing' @@
-  it('flushes every file of a group before renaming any', async () => {
+  it('flushes a group once, before renaming any of its files', async () => {
     const landed = await host.land(['a.md', 'b.md', 'c.md'].map((n) => ({ path: at(n), data: n })))
     expect(landed.every((l) => l.status === 'fulfilled')).toBe(true)
~    expect(log.filter((l) => l === 'synced')).toHaveLength(1)
     expect(log.lastIndexOf('synced')).toBeLessThan(log.findIndex((l) => l.startsWith('rename ')))
     for (const temp of renamed())
       expect(log.indexOf(`close ${temp}`)).toBeLessThan(log.indexOf(`rename ${temp}`))
   })
 
+  it.skipIf(windows)('opens each temp to write through to its drive', async () => {
+    await host.land(['a.md', 'b.md'].map((n) => ({ path: at(n), data: n })))
+    const flags = log.filter((l) => l.startsWith('open ')).map((l) => Number(l.slice(5)))
+    expect(flags).toHaveLength(2)
+    for (const f of flags) expect(f & constants.O_DSYNC).toBe(constants.O_DSYNC)
+  })
+
+  it('a failed flush rejects every file it would have made durable and leaves no temp', async () => {
+    await writeFile(at('a.md'), 'old')
+    synced.hook = async () => {
+      throw new Error('flush failed')
+    }
+    const landed = await host.land([
+      { path: at('a.md'), data: 'new' },
+      { path: at('b.md'), data: 'b' },
+    ])
+    expect(landed.map((l) => l.status)).toEqual(['rejected', 'rejected'])
+    expect(await readFile(at('a.md'), 'utf8')).toBe('old')
+    expect(await readdir(root)).toEqual(['a.md'])
+  })
+
+  it.each([
+    ['of the same length', 'mind', false],
+    ['dated to its own time', 'theirs, longer', true],
+  ])('answers its own stat when an outside write %s lands between the rename and the stat', async (_, data, dated) => {
+    afterRename.hook = async (to) => {
+      await writeFile(to, data)
+      if (dated) await utimes(to, 1_700_000_000_000 / 1000, 1_700_000_000_000 / 1000)
+    }
+    const [landed] = await host.land([{ path: at('a.md'), data: 'mine', mtimeMs: 1_700_000_000_000 }])
+    expect(landed.status === 'fulfilled' && landed.value).toMatchObject({
+      size: 4,
+      mtimeMs: 1_700_000_000_000,
+    })
+  })
+
   it('a file rewritten while its group flushes is left as its writer left it', async () => {
```

**VERIFY**

- [x] The four cases are green, and T-N35 ("a file rewritten while its group flushes is left as its writer left it") and the `describeMachine('nodeMachine')` contract still pass.
- [x] `git grep -n "handle.sync()" -- Core Desktop` prints `nodeMachine.ts`'s `flush` alone.
- [x] Run the gates.
- [x] Check for unnecessary code or mistakes.

#### Task 1-2

**TASK:** With one flush serving a group, the thread-pool line's reason ("each flush holds a pool thread until the drive answers") stops holding, and the standalone measure found sixteen threads slower than four (236 µs a file against 175, *Investigation · §The Group Flush*). The Medium-0 property rename decides it (LD-6): below the bar the line, its import, and its comment leave (AFTER A); at or above it, the line stays with its measured reason (AFTER B). **Departure:** it runs right after Task 1-1 rather than after LD-5 and LD-4 (*Investigation · §The Plan's Shape*), so the line's comment holds its false reason for Task 1-1's commit alone; LD-4 and LD-5 only take reads off the pool, so a line that gains nothing here gains nothing after them.

**NOW:** `Desktop/main.ts:68-69` sets `UV_THREADPOOL_SIZE` to twice the machine's cores, between libuv's four and sixteen (the Write Path's Deviation D-4), and `availableParallelism` (`:3`) has no other use. The Write Path plan's Open Item "The Thread-Pool Line's Placement" (`.claude/Planning/Write Path/Write Path — Implementation Plan.md:4010`) stands on the line. The harness (`.claude/Benchmarks/Reach-In/`, `RERUN.md`) builds a baseline-only worktree with `BUILDS=baseline ./setup.sh <commit>`, applying `instrumentation.patch`, whose `land` wrapper counts files (`calls.land`); `PCTS=0 ./fills.sh Medium` builds Medium-0 under the working folder (`REACH_IN_WORK`, by default `${TMPDIR}/pommora-reach-in`); any `profile.mjs` mode it doesn't name, such as `timing`, is a plain timed run that writes `profiles/timing.json` and copies it back beside the harness (`profile.mjs:98-105`); `./teardown.sh` removes the worktree and the working folder.

**PROCEDURE**

1. From `.claude/Benchmarks/Reach-In/` in the main checkout, with Task 1-1 committed: `BUILDS=baseline ./setup.sh HEAD`. Where `git apply` refuses `instrumentation.patch`'s `nodeMachine.ts` hunks, re-fit them onto Task 1-1's `stage` (the counter block after `stage`'s closing brace, the wrapping loop after the object), save the patch in place, and run the setup again.
2. `PCTS=0 ./fills.sh Medium`.
3. `RUNS=3 node profile.mjs timing renameProperty`, then take each run's `settleMs / calls.land` from `profiles/timing.json` and their median: the cost of a file with the line.
4. In the harness worktree alone (`${TMPDIR}/pommora-reach-in/baseline`), delete `Desktop/main.ts`'s `UV_THREADPOOL_SIZE` line, run `npm run build` there, and repeat step 3: the cost without it.
5. Where the median without the line is at least 0.5 ms a file above the median with it, apply AFTER B with both medians written into its comment; otherwise apply AFTER A. Run the gates, commit with both medians in the message (a re-fitted `instrumentation.patch` among its paths, since Phase 5's measurement needs it at this shape), and record both on a line beneath the Net Ledger.
6. `./teardown.sh`, then delete `profiles/timing.json` beside the harness.

**AFTER A** (the line leaves)

```Desktop/main.ts diff
@@ imports @@
 import { readFile, writeFile } from 'node:fs/promises'
~import { tmpdir } from 'node:os'
@@ after the imports @@
 } from './Web/webGuests'
 
-// A held rewrite flushes a chunk's files at once, and each flush holds a pool thread until the drive answers, so the default four threads would queue every other read and write behind a chunk for about 110 ms. The threads wait on the drive rather than compute, so the pool takes twice the machine's cores, kept between libuv's four and sixteen; libuv sizes it at its first task, which nothing imported above starts.
-process.env.UV_THREADPOOL_SIZE ??= String(Math.min(16, Math.max(4, 2 * availableParallelism())))
-
 // FIRST, ahead of anything that could read a path: the name resolves userData, and Electron caches
```

```.claude/Planning/Write Path/Write Path — Implementation Plan.md diff
@@ Open Items @@
 - **A Restore's Move From Outside the Tree:** …
-- **The Thread-Pool Line's Placement:** `Desktop/main.ts` sets `UV_THREADPOOL_SIZE` after the bundle's hoisted imports, and Task 1-8's measure shows it takes effect; nothing pins that a later import won't start the pool first, and the structural fix is a first side-effect-only import, a new file whose placement is Nathan's.
 - **A Timing Case:** …
```

**AFTER B** (the line stays; `<with>` and `<without>` are the two medians)

```Desktop/main.ts diff
@@ after the imports @@
-// A held rewrite flushes a chunk's files at once, and each flush holds a pool thread until the drive answers, so the default four threads would queue every other read and write behind a chunk for about 110 ms. The threads wait on the drive rather than compute, so the pool takes twice the machine's cores, kept between libuv's four and sixteen; libuv sizes it at its first task, which nothing imported above starts.
+// Each write-through temp holds a pool thread until the drive takes it, and a Medium property rename measured <with> ms a file with the pool at twice the machine's cores, kept between libuv's four and sixteen, against <without> at libuv's four; libuv sizes it at its first task, which nothing imported above starts.
 process.env.UV_THREADPOOL_SIZE ??= String(Math.min(16, Math.max(4, 2 * availableParallelism())))
```

**VERIFY**

- [x] Both medians are in the commit message and beneath the Net Ledger, and the line exists exactly when the difference is at least 0.5 ms a file.
- [x] Under AFTER A, `git grep -n "UV_THREADPOOL_SIZE\|availableParallelism" -- Core Desktop` prints nothing.
- [x] `git worktree list` shows what it showed before step 1, and `ls "${TMPDIR}/pommora-reach-in" 2>/dev/null`, `ls -d ~/Benchmark-* 2>/dev/null`, and `git status --short .claude/Benchmarks` print nothing.
- [x] Run the gates.
- [x] Check for unnecessary code or mistakes.

#### Task 1-3

**TASK:** `FileStat` gains the change time, and `sameFile` compares it in place of birth, so a rewrite that keeps a file's modification time and size still reads as another file; the seed's skip, `describes`, converges into `sameFile`, one identity of a file instead of two, and the index rows carry the change time, which reseeds every Nexus once (LD-2, Decision G-1). The memory machine gains a change-time counter set on every landing and rename. **The Kept-Time Guards Stay (*§Approaches* 5):** `fileEvents.ts:395-396`, `atomicWrite.ts:27`, and `atomicWrite.ts:134` forget a parse a kept-time write would leave looking current; the change time removes that cause on APFS (probed) and NTFS (documented), but exFAT's directory entry records only creation, modification, and access times, so on an exFAT Nexus the forgets are the only protection. `sameFile`'s docstring states the limit once, and each guard's comment names it. **Fold:** the memory machine's entry shape, written three times, becomes one `MemoryFile` type; `sameFile`'s `Identity` is exported and `IndexedStat` extends it, so a file's identity fields are declared once and the memory index stores and answers them without spelling them out. **Departure:** the rows take the landing's `FileStat` whole as their `IndexedStat` (`stat: st`) rather than a copied literal, since the stores pick their own columns and the literal would be a third spelling of the identity.

**NOW:**
- **The Seam:** `FileStat` (`Core/Platform/machine.ts:2-7`) holds size, modification time, birth, and kind; `sameFile` (`:22-29`) compares time, size, and birth under an APFS caveat; `fileStat` (`:31-42`) maps a host stat. `birthtimeMs` also feeds `adopt.ts:79` and `remintLedger.ts:77`, which keep it.
- **The Index:** `describes` (`Core/Index/indexSeed.ts:110-112`) is the seed's skip (`:288`) by time and size alone; the rows record `{ mtimeMs, size }` (`:182,295`); `IndexedStat` (`Core/Platform/stores.ts:30-35`); `indexed_files(path, mtime_ms, size)` (`Desktop/Store/ddl.ts:41-45`) at `INDEX_GENERATION = 19` (`:3`), whose bump drops only `INDEX_TABLES` (`:68,82-88`), never `sync_base`; `SELECT_STATS`, `StatRow`, `statOf`, and `insFile` (`Desktop/Store/stores.ts:46-52,69-71,82`); `memoryStores.ts:82-86,105`.
- **The Doubles:** the memory machine keeps no change time (`Core/Testing/machines.ts:70-128`), its entry shape written three times (`:71,76,81`); `machine.test.ts:25-27,54` builds and compares entries by that shape.
- **The Pins:** T-N40 (`Core/Files/walkCache.test.ts:44-62`) rests on APFS moving a file's birth back and skips off macOS; T-N11 (`Core/Index/indexMaintenance.test.ts:277-278`) matches the row's time and size alone; `raceLandings` (`Core/Testing/hostFs.ts:51`) promises an outside write of another length.

**CHANGE**

- [x] Write the contract case "a rename moves the change time and keeps the modification time" (`Core/Testing/machineContract.ts`, run on all three machines) and the T-N40 rewrite, and watch each fail. Both rest on the change time moving between two calls microseconds apart, which ships unverified on Windows (*§Open Items · Windows and exFAT*), so each skips there through `it.skipIf(windows)`, as the suites' other platform guards spell it; Biome wraps T-N40's title.
- [x] Apply the AFTER.
- [x] Add `ctimeMs` to every `IndexedStat` literal the suites build: `Core/Index/contentIndex.test.ts:24,98,105`; `Core/Matrix/matrixGraph.test.ts:36,43,50,83,110,127,142,154`; `Core/Pages/fileHistory.test.ts:397`; `Core/Testing/storesContract.ts:64,155,160,238`; `Desktop/Store/open.test.ts:268`; `Desktop/Store/stores.test.ts:68,78,122`; and `open.test.ts`'s two raw `INSERT INTO indexed_files` fixtures (the stale-generation and generation-6 rebuild cases) take the `ctime_ms` column. In `Core/Platform/machine.test.ts`, the three seeded entries (`:25-27`) take `ctimeMs: 500`, and the sweep case (`:54`) reads `expect(fs.files.get(page)).toMatchObject({ text: 'swept\n', mtimeMs: 500 })`.
- [x] Extend T-N11: `const { mtimeMs, size, ctimeMs } = await stat(files[i])` and `toMatchObject({ mtimeMs, size, ctimeMs })`, which fails without the row's change time.
- [x] Make Task 1-1's commit answer the temp's `fileStat(own)` alone, watch T-N4 ("a landing keeps the time it is given and answers the stat the file then holds") go red on `nodeMachine`, and restore it: T-N4 is LD-1's pin from here.
- [x] Docs: in `.claude/Features/CorePM.md:113`, "reading only files whose mtime or size moved since they were last indexed" becomes "reading only files whose modification time, size, or change time moved since they were last indexed"; in `CorePM.md:160`, "the mtime and size it was read at" becomes "the modification time, size, and change time it was read at" and "re-indexes any file whose mtime or size moved" becomes "re-indexes any file whose modification time, size, or change time moved"; in `.claude/Features/DesktopPM.md:22`, "whose modification time, size, and birth time are unchanged" becomes "whose modification time, size, and change time are unchanged".

**AFTER**

```Core/Platform/machine.ts diff
@@ FileStat @@
 export interface FileStat {
   size: number
   mtimeMs: number
+  ctimeMs: number
   birthtimeMs: number | null
   isDirectory: boolean
 }
@@ sameFile @@
-/** Whether `now` is still the file `was` describes: the same time, size, and birth, a `was` of null describing no file. Birth tells a file replaced whole apart only where the new file keeps a birth of its own, since on APFS a time set earlier than a file's birth moves its birth back to it. */
-export const sameFile = (was: FileStat | null, now: FileStat | null): boolean =>
+export type Identity = Pick<FileStat, 'mtimeMs' | 'size' | 'ctimeMs'>
+
+/** Whether `now` is still the file `was` describes: the same modification time, size, and change time, which no program can set, so a rewrite that keeps a file's time and size still reads as another file; a `was` of null describes no file. A volume whose change time is coarse or absent, as HFS+'s one-second times and exFAT's missing one are, can't always tell such a rewrite apart, so a write that keeps a file's time also forgets the walk cache's parse of it. */
+export const sameFile = (was: Identity | null, now: Identity | null): boolean =>
   was === null
     ? now === null
     : now !== null &&
       now.mtimeMs === was.mtimeMs &&
       now.size === was.size &&
~      now.ctimeMs === was.ctimeMs
@@ fileStat @@
 export const fileStat = (s: {
   size: number
   mtimeMs: number
+  ctimeMs: number
   birthtimeMs: number
   isDirectory(): boolean
 }): FileStat => ({
   size: s.size,
   mtimeMs: s.mtimeMs,
+  ctimeMs: s.ctimeMs,
   birthtimeMs: s.birthtimeMs,
   isDirectory: s.isDirectory(),
 })
```

```Core/Testing/machines.ts diff
@@ MemoryFs @@
+type MemoryFile = { text: string; mtimeMs: number; ctimeMs: number }
+
 export interface MemoryFs {
~  files: Map<string, MemoryFile>
   dirs: Set<string>
 }
@@ memoryMachine @@
~  const files = new Map<string, MemoryFile>()
   const dirs = new Set<string>()
   let clock = 1000
   const encoder = new TextEncoder()
   const decoder = new TextDecoder()
~  const entryStat = (e: MemoryFile): FileStat => ({
     size: e.text.length,
     mtimeMs: e.mtimeMs,
+    ctimeMs: e.ctimeMs,
     birthtimeMs: null,
     isDirectory: false,
   })
@@ land @@
           const text = typeof data === 'string' ? data : decoder.decode(data)
~          const e = { text, mtimeMs: mtimeMs ?? ++clock, ctimeMs: ++clock }
@@ stat @@
~      return dirs.has(p) ? { size: 0, mtimeMs: 0, ctimeMs: 0, birthtimeMs: null, isDirectory: true } : null
@@ rename @@
       files.delete(from)
~      files.set(to, { ...e, ctimeMs: ++clock })
```

```Core/Testing/machineContract.ts diff
@@ imports @@
 import type { Machine } from '../Platform/machine'
+import { windows } from './hostFs'
@@ it 'renames a file' @@
     expect(await machine.readText(at('x.txt'))).toBeNull()
   })
 
+  it.skipIf(windows)('a rename moves the change time and keeps the modification time', async () => {
+    await machine.land([{ path: at('x.txt'), data: 'v', mtimeMs: 2_000_000_000_000 }])
+    const was = await machine.stat(at('x.txt'))
+    await machine.rename(at('x.txt'), at('y.txt'))
+    const moved = await machine.stat(at('y.txt'))
+    expect(moved?.mtimeMs).toBe(2_000_000_000_000)
+    expect(moved?.ctimeMs).not.toBe(was?.ctimeMs)
+  })
+
   it('removes a file', async () => {
```

```Core/Index/indexSeed.ts diff
@@ imports @@
~import { type FileStat, sameFile, statOrNull } from '../Platform/machine'
@@ describes @@
-/** Whether the index's recorded `held` describes the file `st` was taken of, the same time and size: the seed's skip. The index keeps no birth time, so unlike `sameFile` it passes a replacement at the same time and size. */
-const describes = (held: IndexedStat | undefined, st: FileStat): boolean =>
-  !!held && held.mtimeMs === st.mtimeMs && held.size === st.size
-
 // The index's commits, counted, and each path's last one, per store, so a switch's store starts with none.
@@ indexWrittenPages @@
     const entry = extractPageIndex(content, page)
~    const row = { path: rel, entry, stat: st }
@@ seedContentIndex @@
-      if (describes(prior, st)) continue
+      if (sameFile(prior ?? null, st)) continue
       const content = await readTextOrNull(abs)
       if (content === null) continue
       if (contentIndexStore() !== db0) return NO_REREAD
-      queued.push({
-        path: rel,
-        entry: extractPageIndex(content),
-        stat: { mtimeMs: st.mtimeMs, size: st.size },
-      })
+      queued.push({ path: rel, entry: extractPageIndex(content), stat: st })
```

```Core/Platform/stores.ts diff
@@ imports @@
+import type { Identity } from './machine'
+
 export interface KeyValueStore {
@@ IndexedStat @@
-export interface IndexedStat {
-  mtimeMs: number
-  size: number
+export interface IndexedStat extends Identity {
   /** The ID the page's frontmatter carries, when one is written: what pairs its rows' removal with where the tree holds it next. */
```

```Desktop/Store/ddl.ts diff
@@ INDEX_GENERATION @@
~export const INDEX_GENERATION = 20
@@ DDL @@
   CREATE TABLE IF NOT EXISTS indexed_files (
     path TEXT PRIMARY KEY,
     mtime_ms REAL NOT NULL,
-    size INTEGER NOT NULL
+    size INTEGER NOT NULL,
+    ctime_ms REAL NOT NULL
   );
```

```Desktop/Store/stores.ts diff
@@ SELECT_STATS @@
~const SELECT_STATS = `SELECT f.path, f.mtime_ms, f.size, f.ctime_ms, json_extract(v.value, '$') AS id FROM indexed_files f LEFT JOIN page_values v ON v.path = f.path AND v.key = ? AND json_type(v.value) = 'text' AND v.value <> '""'`
~type StatRow = { path: string; mtime_ms: number; size: number; ctime_ms: number; id: string | null }
 const statOf = (r: StatRow): IndexedStat => ({
   mtimeMs: r.mtime_ms,
   size: r.size,
+  ctimeMs: r.ctime_ms,
   ...(r.id === null ? {} : { id: r.id }),
 })
@@ upsertPageIndexes @@
     const insFile = db.prepare(
~      'INSERT OR REPLACE INTO indexed_files (path, mtime_ms, size, ctime_ms) VALUES (?, ?, ?, ?)',
     )
@@ upsertPageIndexes @@
~        insFile.run(path, stat.mtimeMs, stat.size, stat.ctimeMs)
```

```Core/Testing/memoryStores.ts diff
@@ imports @@
 import { asString } from '../Nexus/coerce'
+import type { Identity } from '../Platform/machine'
@@ MemoryIndex @@
~  stats: Map<string, Identity>
@@ statOf @@
~  const statOf = (path: string, identity: Identity): IndexedStat => {
     const row = index.values.get(k(path, ID_KEY))
     const id = row && asString(JSON.parse(row.value))
~    return id === undefined ? identity : { ...identity, id }
   }
@@ upsertPageIndexes @@
~        index.stats.set(path, { mtimeMs: stat.mtimeMs, size: stat.size, ctimeMs: stat.ctimeMs })
```

```Core/Nexus/fileEvents.ts diff
@@ applyPage @@
-  // An outside edit can keep the time, size, and birth the walk cache's hit test reads, so its parse leaves the cache.
+  // An outside edit can keep the identity the walk cache's hit test reads (`sameFile`), so its parse leaves the cache.
   if (ev.origin === 'watched') forgetParse(abs)
```

```Core/Files/atomicWrite.ts diff
@@ landOwn @@
-/** Lands the app's own writes as one group: each echo is recorded before its name points at the new bytes and forgotten where its landing rejects, a file kept at its time drops the walk cache's parse that time would otherwise vouch for, and the files that landed are noted as one batch carrying the stat each now holds. …
+/** Lands the app's own writes as one group: each echo is recorded before its name points at the new bytes and forgotten where its landing rejects, a file kept at its time drops the walk cache's parse, which its identity (`sameFile`) would still vouch for, and the files that landed are noted as one batch carrying the stat each now holds. …
@@ landBytes @@
-// Sync's landing records no echo, notes no event, and checks no stat its read saw: an arrival replaces what the file holds by Sync's own rules, which capture what it would lose, so the watcher reports it like any outside write and the tree and index take it from that event.
+// Sync's landing records no echo, notes no event, and checks no stat its read saw: an arrival replaces what the file holds by Sync's own rules, which capture what it would lose, so the watcher reports it like any outside write and the tree and index take it from that event. Its kept time drops the walk cache's parse, as an own kept-time landing does.
```

```Core/Testing/hostFs.ts diff
@@ raceLandings @@
-/** Overwrites each file `picks` chooses with `outside` just before its landing, as another program writing between the app's read and its landing; `outside` differs in length from what the file holds. */
+/** Overwrites each file `picks` chooses with `outside` just before its landing, as another program writing between the app's read and its landing. */
```

```Core/Files/walkCache.test.ts diff
@@ imports @@
-import { tempRoot } from '../Testing/hostFs'
+import { tempRoot, windows } from '../Testing/hostFs'
@@ T-N40 @@
-  it.skipIf(process.platform !== 'darwin')(
-    're-parses a file replaced whole by a twin of the same time and size, the original born before that time',
-    async () => {
-      …
-    },
-  )
+  it.skipIf(windows)('re-parses a file rewritten in place or replaced whole at the time and size it was cached at', async () => {
+    const file = join(root, 'a.md')
+    const twin = join(root, 'b.md')
+    const at = Math.floor(Date.now() / 1000) - 10
+    writeFileSync(file, 'one')
+    utimesSync(file, at, at)
+    let parses = 0
+    const parse = async (): Promise<string> => `parsed-${++parses}`
+    expect(await walk(file, parse)).toBe('parsed-1')
+    writeFileSync(file, 'two')
+    utimesSync(file, at, at)
+    expect(await walk(file, parse)).toBe('parsed-2')
+    writeFileSync(twin, 'six')
+    utimesSync(twin, at, at)
+    renameSync(twin, file)
+    expect(await walk(file, parse)).toBe('parsed-3')
+  })
```

**VERIFY**

- [x] The contract case is green on `memoryMachine`, `diskMachine`, and `nodeMachine`; T-N40 is green and went red with `sameFile` comparing birth, T-N11 is green and went red without the row's change time; T-N4 went red with a pre-rename answer.
- [x] `git grep -nP "describes\(|birthtimeMs === " -- Core Desktop` prints nothing, and `git grep -n "skipIf(process.platform !== 'darwin')" -- Core/Files/walkCache.test.ts` prints nothing.
- [x] Run the gates.
- [x] Check for unnecessary code or mistakes.

#### Task 1-4

**TASK:** The echo record a landing makes before it lands takes the stat the landing answered, and the watcher's drain drops an event while a fresh stat of its file is still that one by `sameFile`, so the index and the watcher share one own-write identity, and the content hash, the byte read and two hashes per own write, and `writtenHash` leave (LD-5). The record is still made before the landing, so Sync's write tap fires exactly when it does today; and a landing still in flight is no echo, where today a drain that finds the landing's bytes already in place drops its event, so an outside write the landing loses to is heard, and an own event drained mid-landing re-reads bytes the own tap applies anyway. The drain looks the record up as it runs rather than at the event's arrival: it drops an event only while the file still holds a stat an own landing answered, whose bytes the own tap has applied, so applying the event would read back what the tree and index already hold. On a volume whose change time is coarse or absent (HFS+'s one-second times, FAT, exFAT), an outside write keeping a landing's time and size reads as its echo, which the record's comment states. **Departure:** `forgetWrite` leaves whole rather than losing only its hash argument (*Investigation · §Removal & Consolidation Ledger*, LD-5): a landing that rejects keeps an in-flight record, which is no echo, so nothing needs forgetting; the drain's mismatch retires a record by its identity in place of the hash.

**NOW:** `landOwn` records each file with its bytes before the landing (`Core/Files/atomicWrite.ts:18`), and `recordWrite` hashes them into the record (`Core/Files/writeEcho.ts:23-33`) and fires Sync's write tap (`:32`); a hashed record is no early stop (`isRecentWrite`, `:84-86`), so every own write's event enters the watcher's batch carrying `writtenHash` (`Desktop/FileWatch/watcher.ts:119`), and `dropOwnEchoes` reads the file back and hashes it (`writeEcho.ts:103-114`), 6,959 reads and hashes in a Medium property rename. A rejected landing forgets its record by hash (`atomicWrite.ts:23-25`, `forgetWrite`, `writeEcho.ts:35-38`). `Changed.written` carries the arrival's hash (`writeEcho.ts:46-47`). The hashed cases are `writeEcho.test.ts:72-152`, T-N36 (`atomicWrite.test.ts:55-69`), and `watcher.test.ts:539,596,604`.

**CHANGE**

- [x] Rewrite `Core/Files/writeEcho.test.ts`' "an echo recorded with its bytes" as "a landing's echo", each case landing through a helper that records the write, writes the file, and records the landing with `machine().stat`, its events carrying no `written`: "is dropped while the file still holds the stat its landing answered, and kept once it doesn't" (own, theirs, and gone, as today); "is still told apart however late its events arrive"; "stops being an echo once an event finds the file changed, so an outside write restoring the app's bytes still reaches the watcher"; "keeps a newer landing's record when an older event finds the file it left". Add "is heard when an outside write keeps the landing's time and size" (landed at a whole second, rewritten in place at the same length and dated back; it fails without `sameFile`'s change time; it rests on the change time moving between two calls microseconds apart, so it skips on Windows through `it.skipIf(windows)`, `windows` imported from `../Testing/hostFs`, *§Open Items · Windows and exFAT*), "drops a landing's echo without reading the file" (`machine().readBytes` and `readText` spied, no call; it fails without this task), and "is still dropped while the next landing of its file is in flight" (landed, then `recordWrite(p, true)`, and `dropOwnEchoes([watched(p)])` equals `[]`; it fails while an in-flight record drops its predecessor's stat).
- [x] Rewrite T-N36 as "a rejected landing leaves no echo, so an outside write of the same bytes is heard": after the rejection, `isRecentWrite(p)` is false and `dropOwnEchoes` keeps an event carrying no `written`; it fails while an in-flight record reads as a move's.
- [x] In `Desktop/FileWatch/watcher.test.ts:539,596,604`, each `recordWrite(path, bytes)` becomes, once the file holds its bytes, `recordLanding(path, (await machine().stat(path))!)`.
- [x] Watch the added cases and T-N36 fail, then apply the AFTER.
- [x] In `.claude/Features/DesktopPM.md:22`, "a write is recognized by the bytes it left, while the file still holds them" becomes "a write is recognized by the stat its landing answered, while the file still holds it".

**AFTER**

```Core/Files/writeEcho.ts diff
@@ header @@
-// The app's writes and the watcher's events pass through here: the echo window tells the app's writes from outside ones, …
+// The app's writes and the watcher's events pass through here: the echo records tell the app's writes from outside ones, …
 
~import { type FileStat, sameFile, statOrNull } from '../Platform/machine'
 
-// A write recorded with its bytes is an echo while the file still holds them, however late its event arrives, until an event finds other bytes there, so an outside write reaches the watcher even when it restores the app's bytes; a move or rename, recorded without bytes, is an echo for the whole window.
-type Echo = { at: number; hash?: string }
+// A landing is an echo while its file still holds the stat it answered (`sameFile`), however late its event arrives, until an event finds the file changed, so an outside write reaches the watcher even when it restores the app's bytes. While the file's next landing is in flight, its record keeps the stat the last one answered. A move or rename is an echo for the whole window.
+type Echo = { kind: 'move'; at: number } | { kind: 'landing'; stat?: FileStat }
@@ PREFIX_WINDOW_MS @@
 const PREFIX_WINDOW_MS = 800
+let sweepAbove = 256
@@ recordWrite @@
 // Recorded before the bytes land, so no echo of the landing arrives ahead of its record; `noteOwn` follows the landing, so its event reports the file as it now stands.
-export function recordWrite(absPath: string, content?: string | Uint8Array): void {
-  recent.set(absPath, {
-    at: Date.now(),
-    hash: content === undefined ? undefined : machine().sha256Hex(content),
-  })
+export function recordWrite(absPath: string, landing = false): void {
+  const last = recent.get(absPath)
+  const stat = last?.kind === 'landing' ? last.stat : undefined
+  recent.set(absPath, landing ? { kind: 'landing', stat } : { kind: 'move', at: Date.now() })
~  if (recent.size > sweepAbove) {
     const cutoff = Date.now() - WINDOW_MS
~    for (const [p, r] of recent) if (r.kind === 'move' && r.at < cutoff) recent.delete(p)
+    sweepAbove = Math.max(256, 2 * recent.size)
   }
   tap?.wrote(absPath)
 }
 
-/** Forgets the write recorded at `absPath` while it still holds `hash`, so a later write of those bytes reads as another writer's. */
-export function forgetWrite(absPath: string, hash: string): void {
-  if (recent.get(absPath)?.hash === hash) recent.delete(absPath)
-}
+/** Gives the landing recorded at `absPath` the stat it answered, so its echo is told by that stat. */
+export function recordLanding(absPath: string, stat: FileStat): void {
+  recent.set(absPath, { kind: 'landing', stat })
+}
@@ Changed @@
 export type Changed = { event: ChangeEvent; absPath: string } & (
-  | { origin: 'watched'; written?: string; text?: never; bodyOnly?: never; stat?: never }
-  | { origin: 'own'; text?: string; bodyOnly?: boolean; stat?: FileStat; written?: never }
+  | { origin: 'watched'; text?: never; bodyOnly?: never; stat?: never }
+  | { origin: 'own'; text?: string; bodyOnly?: boolean; stat?: FileStat }
 )
@@ held @@
 const held = (absPath: string): Echo | undefined => {
   const r = recent.get(absPath)
~  if (r?.kind !== 'move' || Date.now() - r.at <= WINDOW_MS) return r
@@ isRecentWrite @@
-/** An echo known without reading the file: a bytes-less record, or a descendant of a folder just moved. */
+/** An echo known without a stat: a move's or rename's record, or a descendant of a folder just moved. */
 export function isRecentWrite(absPath: string): boolean {
   const r = held(absPath)
~  if (r !== undefined) return r.kind === 'move'
@@ isRecentWrite's ancestor walk @@
~    if (tp?.kind === 'move' && Date.now() - tp.at <= PREFIX_WINDOW_MS) return true
@@ writtenHash @@
-/** The hash of the bytes the app just wrote at a path, taken as its event arrives. */
-export const writtenHash = (absPath: string): string | undefined => held(absPath)?.hash
-
@@ dropOwnEchoes @@
-/** Drops the events whose file still holds exactly the bytes their arrival named, however late the settle runs. */
+/** Drops the events whose file still holds exactly the stat its landing answered, however late the settle runs; an event that finds the file changed retires that landing's record. */
 export async function dropOwnEchoes(events: Changed[]): Promise<Changed[]> {
   const kept = await Promise.all(
     events.map(async (e) => {
-      if (e.written === undefined) return true
-      const bytes = await machine().readBytes(e.absPath)
-      if (bytes !== null && machine().sha256Hex(bytes) === e.written) return false
-      forgetWrite(e.absPath, e.written)
+      const r = held(e.absPath)
+      if (r?.kind !== 'landing' || !r.stat) return true
+      if (sameFile(r.stat, await statOrNull(e.absPath))) return false
+      if (recent.get(e.absPath) === r) recent.delete(e.absPath)
       return true
     }),
   )
```

```Core/Files/atomicWrite.ts diff
@@ imports @@
~import { type FileEvent, noteOwn, recordLanding, recordWrite, reportRename } from './writeEcho'
@@ landOwn @@
-/** Lands the app's own writes as one group: each echo is recorded before its name points at the new bytes and forgotten where its landing rejects, …
+/** Lands the app's own writes as one group: each echo is recorded before its name points at the new bytes and takes the stat its landing answered, …
 async function landOwn(
   files: readonly Landing[],
   bodyOnly?: boolean,
 ): Promise<PromiseSettledResult<FileStat>[]> {
~  for (const { path } of files) recordWrite(path, true)
   const landed = await machine().land(files)
   const events: FileEvent[] = []
   files.forEach(({ path, data, mtimeMs }, i) => {
     const at = landed[i]
-    if (at.status === 'rejected') {
-      forgetWrite(path, machine().sha256Hex(data))
-      return
-    }
+    if (at.status === 'rejected') return
+    recordLanding(path, at.value)
     if (mtimeMs !== undefined) forgetParse(path)
```

```Desktop/FileWatch/watcher.ts diff
@@ imports @@
   emitWatch,
   isRecentWrite,
-  writtenHash,
 } from '@pommora/core/Files/writeEcho'
@@ startWatcher @@
-      // The app's own writes echo back after they have already applied as they landed: a bytes-less echo stops here, and one recorded with its bytes is dropped at the settle while the file still holds them. …
+      // The app's own writes echo back after they have already applied as they landed: a move's or rename's echo stops here, and a landing's is dropped at the settle while the file still holds the stat it landed with. …
@@ startWatcher @@
~      batch.push({ event, absPath: path, origin: 'watched' })
```

**VERIFY**

- [x] The rewritten and added `writeEcho.test.ts` cases, T-N36, and the three watcher cases are green, and the added cases and T-N36 went red against HEAD's echo.
- [x] `git grep -nP "writtenHash|forgetWrite|sha256Hex\(data\)|\.written\b" -- Core/Files Desktop/FileWatch` prints nothing.
- [x] `git diff HEAD~1 -- Core/Files/writeEcho.ts` shows `tap?.wrote(absPath)` unmoved inside `recordWrite`, and `Core/Sync/Client/tap.test.ts` passes unchanged.
- [x] Run the gates.
- [x] Check for unnecessary code or mistakes.

#### Task 1-5

**TASK:** A rename's clash check and an option edit pass over the rows the index vouches for, re-applying the Write Path plan's Tasks 2-1 and 2-2 as they fit HEAD (LD-4, Decision G-1): a page the index lists is passed over only while its row's modification time, size, and change time are still its file's, through `unlessVouched`, which takes a fresh stat per page it would pass over. The clash check's hide of archived pages moves ahead of its read, into `HolderQuery.every`, so archived holders of either key are no longer read only to be discarded; `outsideArchive` stays the filter, which Phase 4 replaces with the store-of-path rule. **Fold:** `findHolders`' two `//` lines become its one docstring, which also states `every`, so the task's added docstring (`unlessVouched`) leaves the comment count level; the Write Path AFTER's comment in `valueEditPlan` isn't carried, since `unlessVouched`'s docstring states the rule.

**NOW:** The clash check (`Core/Properties/registryProperty.ts:172-181`) asks `findHolders` for every holder of either key with `'values'`, reads each holder's file (`Core/Index/keyHolders.ts:107-133`), archived pages included, and then drops archived ones (`registryProperty.ts:179`). An option edit's plan (`Core/Properties/optionOps.ts:223-230`) sweeps every holder of its key. The Write Path's narrowing (`Write Path — Implementation Plan.md:3137-3285`) was withdrawn by its Deviation D-2, since a row vouched for by time and size alone can describe another file; T-N15 and T-N16 survive at HEAD as the safety cases (`registryProperty.test.ts:503-544`, `optionOps.test.ts:1726-1752`), and nothing pins a pass-over. `CorePM.md:113` states that no row decides what a cascade passes over. With Task 1-3, a row vouches for its file only while the file keeps its change time.

**CHANGE**

- [x] T-N15 (`registryProperty.test.ts`, "a rename's clash check with the index warm") keeps its two cases and gains three: "refuses a page whose file took the new key at the time and size the index read it at" (a page holding `Priority: hi` and `Urgenzy: no`, dated to a whole second before the seed, rewritten in place to `Urgency: no` and dated back; it fails without `unlessVouched`'s change time); "reads no page the index vouches for holding the old key alone" (`findHolders(root, { keys: ['Priority', 'Urgency'], reach: 'governed', every: true }, 'values')` with `machine().readText` spied, no read of either page; it fails without `every`'s pass-over); and "an archived page holding both keys refuses nothing and isn't read" (a page holding both keys written under `.nexus/archive/<Collection ID>/Col/` before the seed: the same `findHolders` call names it in no `files` and reads it with no `readText` from its own loop (a read by `nexusPages` isn't this case's), and the rename succeeds; it fails with the hide after the read).
- [x] T-N16 (`optionOps.test.ts`, "an option rename with the index warm") keeps its case and gains two: "rewrites a page whose file took the word at the time and size the index read it at" (options `Urgent` and `Normal`, the page holding `Normal` at a whole second, rewritten in place to `Urgent` and dated back, then `Urgent` renamed to `Critical`; it fails without the change time); and "reads no page whose indexed value the edit leaves alone" (the page holding `Normal`, `machine().readText` spied through the rename, no read of it; it fails without the pass-over).
- [x] The two cases a rewrite in place drives ("refuses a page whose file took the new key…" and "rewrites a page whose file took the word…") rest on the change time moving between two calls microseconds apart, so each skips on Windows through `it.skipIf(windows)`, as the suites' other platform guards spell it, `windows` joining each suite's `../Testing/hostFs` import (*§Open Items · Windows and exFAT*); the pass-over and archive cases read a change time that holds still, and run everywhere.
- [x] Watch the five fail, then apply the AFTER.
- [x] In `.claude/Features/CorePM.md:113`, "A cascade reaches every page the index lists as holding its key and reads each from its file, so no row decides what a cascade passes over." becomes "A cascade reaches every page the index lists as holding its key and reads each from its file, a rename's clash check and an option edit passing over a page whose row still describes its file."

**AFTER**

```Core/Index/indexSeed.ts diff
@@ unmoved @@
   const db = contentIndexStore()
   return !db || (lastCommits.get(db)?.get(path) ?? 0) <= since
 }
+
+/** The files among `files` a cascade still reads: each `passOver` doesn't name as one the index answers for, handed its root-relative path, and each whose row no longer describes its file. That row describing the file is the one condition on which the index may pass over a page it lists, since an outside edit the index hasn't taken yet may still sit in the watcher's debounce. */
+export async function unlessVouched(
+  root: string,
+  files: readonly string[],
+  passOver: (rel: string, file: string) => boolean,
+): Promise<string[]> {
+  const kept = await Promise.all(
+    files.map(async (file) => {
+      const rel = relative(root, file)
+      return !passOver(rel, file) || !sameFile(readIndexedStat(rel), await statOrNull(file))
+    }),
+  )
+  return files.filter((_, i) => kept[i])
+}
```

```Core/Index/keyHolders.ts diff
@@ imports @@
 import { queryMembers, readPageRelations } from './contentIndex'
~import { nexusCorpus, unlessVouched } from './indexSeed'
@@ imports @@
~import { collectionFolders, outsideArchive, rootId } from '../Nexus/governedSweep'
@@ HolderQuery @@
   moved?: FolderMove
+  every?: true
 }
@@ findHolders @@
-// The pages and Spaces holding any of `keys`: … and `moved` points a Space under a folder the op moved ahead of the tree.
-// With `read`, each file is read once: … which a strip passes over since no restore could put its value back.
+/** The pages and Spaces holding any of `keys`: … and `moved` points a Space under a folder the op moved ahead of the tree. `every` passes over a page the index lists without every key while its row still describes its file, as a rename's clash check counts them, and reads no archived page. With `read`, each file is read once: … which a strip passes over since no restore could put its value back. */
 export async function findHolders(root: string, q: HolderQuery, read?: 'values'): Promise<Holders> {
@@ findHolders @@
   const rels = q.keys.map((key) => queryMembers(key, title))
-  const pages = await pagesInReach(
-    root,
-    tree,
-    rels.includes(null) ? null : [...new Set(rels.flatMap((r) => r ?? []))],
-    q.reach,
-  )
+  const listed = rels.map((r) => r && new Set(r))
+  const named = rels.includes(null) ? null : [...new Set(rels.flatMap((r) => r ?? []))]
+  const reached = await pagesInReach(root, tree, named, q.reach)
+  const pages = q.every
+    ? await unlessVouched(
+        root,
+        reached.filter((file) => outsideArchive(root, file)),
+        (rel) => !!named && !listed.every((l) => l?.has(rel)),
+      )
+    : reached
   const holds = (s: SpaceNode): boolean =>
@@ findHolders @@
   const files = [...pages, ...spaces]
   if (!read) return { files, held: [] }
-  const listed = rels.map((r) => r && new Set(r))
   const { byId } = await nexusPages(root, tree)
```

```Core/Properties/registryProperty.ts diff
@@ imports @@
 import {
-  outsideArchive,
   rekeySweep,
@@ rekeyPlan @@
     const { held } = await findHolders(
       root,
~      { keys: [prior.key, moved.key], reach: 'governed', every: true },
       'values',
     )
~    const clashes = held.filter((h) => h.keys.length === 2)
```

```Core/Properties/optionOps.ts diff
@@ imports @@
 import { readPageRelations } from '../Index/contentIndex'
+import { unlessVouched } from '../Index/indexSeed'
 import { findHolders } from '../Index/keyHolders'
@@ imports @@
~import { isMarkdownFile, join, relative } from '../Paths/posix'
@@ valueEditPlan @@
   keys: ValueEdit,
 ): Promise<{ files: string[]; plan: SweepPlan }> {
+  const raw = valueEditRewrite(def, keys)
   const { files } = await findHolders(root, { keys: [def.key], reach: 'governed' })
-  return { files, plan: { raw: valueEditRewrite(def, keys) } }
+  const rows = readPageRelations(
+    files.map((file) => relative(root, file)),
+    def.key,
+  )?.pages
+  const passOver = (rel: string, file: string): boolean => {
+    const row = rows?.[rel]
+    return !!row && raw(row.values, file) === null
+  }
+  return { files: await unlessVouched(root, files, passOver), plan: { raw } }
 }
```

**VERIFY**

- [x] T-N15 and T-N16 are green, all their cases, and the five added cases went red without the change; "refuses a rename onto a key a file holds beside the old one, and writes no note" (`registryProperty.test.ts:418`) still passes.
- [x] `git grep -n "outsideArchive" -- Core/Properties` prints nothing.
- [x] Run the gates.
- [x] Check for unnecessary code or mistakes.

#### Task 1-6

**TASK:** `copyPageMetadata` writes each month file it lands copies in once, as `dropPageMetadata` writes each month it drops from (LD-7). **Fold:** the two month-by-month writes become one private `editShards`, which hands each month's ids and a copy of its pages to the caller's edit, writes nothing when the edit answers null, and logs a month it couldn't write; the copy's sources are read by month as they are now. **Departure:** a copy carries its source entry whole into the target's month rather than merging it as a patch through `updatePageMetadata`, since a remint's fresh ID holds no entry to merge onto and a copy that keeps every field is the one the existing cases already ask for.

**NOW:** `copyPageMetadata` (`Core/Nexus/pageMetadata.ts:136-155`) reads its sources by month (`:140-148`) and then writes once per pair through `updatePageMetadata` (`:149-154`), the same month file rewritten for each pair; `dropPageMetadata` (`:119-134`) writes each month once. Its only caller is the remint pass (`Core/Nexus/remint.ts:59`), whose targets take freshly minted IDs. Its cases are `pageMetadata.test.ts:215-235`.

**CHANGE**

- [x] Write "copyPageMetadata writes each month it copies into once" (`pageMetadata.test.ts`: an August entry copied to `SEP_A` and `SEP_B`, with `machine().land` spied, one landing of `09-2026.json` holding both) and watch it fail.
- [x] Apply the AFTER.

**AFTER**

```Core/Nexus/pageMetadata.ts diff
@@ byShard @@
   return out
 }
+
+async function editShards(
+  root: string,
+  ids: readonly string[],
+  refused: string,
+  edit: (pages: Record<string, unknown>, ids: string[]) => Record<string, unknown> | null,
+): Promise<void> {
+  for (const [shard, held] of byShard(ids)) {
+    const written = await updateNexusFile(
+      metadataShardPath(root, shard),
+      (cur) => {
+        const pages = edit({ ...rawPages(cur) }, held)
+        return pages && { ...cur, pages }
+      },
+      false,
+    ).catch(fault)
+    if (!written.ok) console.error(`metadata: ${shard} ${refused}:`, written.error.message)
+  }
+}
@@ dropPageMetadata @@
-export async function dropPageMetadata(root: string, ids: readonly string[]): Promise<void> {
-  for (const [shard, gone] of byShard(ids.filter((id) => !idHeld(root, id)))) {
-    const written = await updateNexusFile(
-      metadataShardPath(root, shard),
-      (cur) => {
-        const pages = { ...rawPages(cur) }
-        if (!gone.some((id) => id in pages)) return null
-        for (const id of gone) delete pages[id]
-        return { ...cur, pages }
-      },
-      false,
-    ).catch(fault)
-    if (!written.ok)
-      console.error(`metadata: ${shard} kept dropped entries:`, written.error.message)
-  }
-}
+export function dropPageMetadata(root: string, ids: readonly string[]): Promise<void> {
+  const unheld = ids.filter((id) => !idHeld(root, id))
+  return editShards(root, unheld, 'kept dropped entries', (pages, gone) => {
+    if (!gone.some((id) => id in pages)) return null
+    for (const id of gone) delete pages[id]
+    return pages
+  })
+}
@@ copyPageMetadata @@
 export async function copyPageMetadata(
   root: string,
   pairs: readonly (readonly [string, string])[],
 ): Promise<void> {
   const sources = new Map<string, Record<string, unknown>>()
   for (const [shard, froms] of byShard(pairs.map(([from]) => from))) {
     const read = await readJsonStrict(metadataShardPath(root, shard))
     if (!read.ok) continue
     for (const from of froms) {
       const entry = rawPages(read.value)[from]
       if (isPlainObject(entry)) sources.set(from, entry)
     }
   }
+  const copies = new Map<string, Record<string, unknown>>()
   for (const [from, to] of pairs) {
     const entry = sources.get(from)
-    if (!entry) continue
-    const copied = await updatePageMetadata(root, to, entry as PageMetaPatch).catch(fault)
-    if (!copied.ok) console.error(`metadata: the copy to ${to} refused:`, copied.error.message)
+    if (entry) copies.set(to, entry)
   }
+  await editShards(root, [...copies.keys()], 'refused its copies', (pages, tos) => {
+    for (const to of tos) pages[to] = copies.get(to)
+    return pages
+  })
 }
```

`PageMetaPatch` stays imported for `updatePageMetadata`, which keeps its own one-entry write, since its edit stabilizes against the entry it patches.

**VERIFY**

- [x] The added case is green, and "copyPageMetadata carries fields this build does not model", "copyPageMetadata lands an August entry under a September ID in its own month", `dropPageMetadata`'s cases (`pageMetadata.test.ts:173,202`), and `remint.test.ts`' "a reminted copy carries its metadata entry under the fresh ID's month" still pass.
- [x] Run the gates.
- [x] Check for unnecessary code or mistakes.

#### Review Checkpoint

- [x] Two read-only agents, one under `code-simplification` and one under `adversarial-review`, read Phase 1's range outward against Core, Desktop, and UIX: the landing's durability (every temp written through, each drive flushed once before any of its temps is renamed, a failed flush discarding every temp on its drive, the handle closed before the rename on Windows); the post-rename stat, answered only while its time and size are still the temp's, feeding the index row, the walk cache, and the echo record; the reseed touching no `sync_base` row; the pass-over vouching only through `sameFile` with the change time; the in-flight landing reading as no echo; Sync's write tap firing where it did; and anything that reads as an odd one out beside the code around it.
- [x] One CDP drive on a scratch copy of `~/Test` from a worktree build with its own userData and debug port (*Development-Environment*): a property rename across Collection A lands and the window shows the values under the new key; one of those pages, rewritten from outside at the same length with its time set back, reaches the window; a reopen shows the same tree.
- [x] Run the gates and `npm run build` from a clean state, and record Phase 1's Actionable in its Net Ledger row beside that row's estimate, with Task 1-2's medians on the line beneath.

---

### Phase 2 — Residue

**GOAL:** System Trash Mode leaves with every branch only it reaches, and the `TrashDeps` seam that carried it leaves with it, so a delete always mints a bundle in the Nexus's own Trash and the system trash is reached one way, through the machine. A Context remembers its place the way every other kind does, by its neighbors, in both of its orders, and its own Space order travels in its record; the records are built from the tree rather than re-read from disk; and the compatibility-only decodes, the kept record, and the dead and ghost code leave. It's a separate phase because Phase 3's mint, tail, container note, and `leave` (M-1, M-2, M-6, M-8) are each written once only after every system branch is gone (*Investigation · §Order Constraints*, 2).

**THE TREE:** HEAD plus Phase 1; every `-` line reads the code as Phase 1 leaves it, and line citations are HEAD's.

#### Task 2-1

**TASK:** System Trash Mode leaves (L-1, Decision C-5), and with it the `TrashDeps` seam (L-2): `emptyBundle`'s `dispose` reads `machine().trashToSystem` with the same refusal, `deps` leaves every signature, and the flat discard's two functions become one in `Core/Trash/discard.ts` (*§Placements*). L-1 and L-2 land as one commit, since L-1 leaves every `deps` parameter but `dispose`'s unread, and splitting them would land those dead parameters between commits; L-2 still follows L-1 in substance (*§Order Constraints*, 2). B-8's Trash Mode flip leaves with it. **Fold:** `onTile`'s `ctx` (`Core/Tiles/handlers.ts:41,48,54`) existed only to reach `trashDeps`, so it leaves with it. **Comments:** the AFTER removes four and adds one (`discardFile`'s, replacing the one it removes).

**NOW:**
- **The Mode:** `TrashMode` and `DEFAULT_TRASH_MODE` (`Core/Trash/trashMode.ts:1-4`); `AppConfig.trashMode`, `trashModeOf`, and its decode (`Desktop/Config/appConfig.ts:6,14,20,43`); `trashModeOf`'s import and `HostContext.trashMode`'s install (`Desktop/main.ts:47,304`); `HostContext.trashMode` (`Core/Contract/handlers.ts:8,63`). No code writes the key and no settings row exists, so `'system'` is reachable only by hand-editing `pommora.json`.
- **The Branches:** `discardFile`'s system arm (`Core/Trash/discard.ts:36-47`) beside `trashFileFlat` (`:10-20`), whose only caller it is; `deleteOp`'s null bundle, its Collection-takes-its-Archive arm, its metadata drop, its system discards, and the `bundle ? … : …` conditionals they force (`Core/Trash/delete.ts:73,96-108,111-118,121,132-138,164,172,193,195,206-208,216,222`); `finishOwed`'s `leave` discard (`Core/Nexus/finishOwed.ts:258-268`) and its system order drop (`:324-325`), which B-8's flip reaches.
- **The Seam:** `TrashDeps` and `trashDeps` (`discard.ts:22-33`) thread from `Core/Nexus/handlers.ts:108,199`, `Core/Tiles/handlers.ts:87-88,121-122` (through `onTile`'s `ctx`, `:41,48,54`, which exists for them alone), and `Core/Assets/handlers.ts:52`, through `mutate.ts:53,69-87,162,325`, `finishOwed.ts:73,79,99,103,113,119,121,263,274,318,334,347`, `delete.ts:77,160`, `spend.ts:39,63,73,85,113`, `tilesFile.ts:32,124,141,150,157,168-169,201,205`, `assetMigrate.ts:20,158,218,222,228`, and `Core/Testing/settledMutate.ts:8,16,19`, to one reader: `dispose`'s `deps.trashToSystem` (`spend.ts:73`). `setAside` already reaches the same seam directly (`Core/Files/atomicWrite.ts:308-311`).
- **The Contract and Copy:** `delete:facts` answers `trashMode` beside `permanentDelete` (`Core/Trash/handlers.ts:4,9-20`; `Core/Contract/bridge.ts:10,203`); `askTrashing` asks it for its system wording (`Core/Interface/Confirm/confirmations.ts:4,12-15,75-82`); `confirmDelete`'s comment names the system trash (`:88`); `MutateOutcome.bundled`'s comment says it's absent when the system trash took the item (`Core/Nexus/mutateRequest.ts:20`); `assetMigrate.ts:217`'s comment names the system trash refusing a discard. `bridge.ts:202`'s comment stays true: it is the empty's reason for asking at the moment of asking.
- **Phase 1:** Task 1-2 decides `Desktop/main.ts`'s thread-pool line (`:3,68-69`), and Task 1-4 rewrites T-N36 in `Core/Files/atomicWrite.test.ts`; this task's lines are elsewhere in both. Task 1-4 turns `recordWrite`'s content parameter into `landing`, which `discard.ts`'s calls never pass, so each stays a move's echo.

**CHANGE**

- [x] Write `spend.test.ts`'s *"emptying with Permanently Delete off, on a host with no system trash, refuses and leaves the item in its bundle"* and watch it fail with `dispose`'s system call replaced by a no-op.
- [x] Delete `Core/Trash/trashMode.ts`.
- [x] Apply the AFTER.
- [x] Remove the cases that pin system behavior, by name:
  - `Core/Archive/archive.test.ts:919-936`, *"under the system Trash Mode, it leaves for the system trash with its metadata"*;
  - `Core/Assets/assetMigrate.test.ts:220-232`, *"sends swept leftovers to the system trash in System mode"*;
  - `Core/Interface/Confirm/confirmations.test.ts:198-212`, *"a delete under the system Trash Mode says it moves to the system trash"*, the Nexus wording staying pinned at `:377`;
  - `Core/Interface/Confirm/confirmations.test.ts`, *"offers no Undo for a system-trash delete, which leaves no bundle, and still counts its linkers"*, the linker count staying pinned by the case above it;
  - `Core/Nexus/finishOwed.test.ts:762-776`, *"a System Trash Context delete cut short before its list step takes its order with it once its folder leaves"*;
  - `Core/Nexus/mutate.test.ts:716-726`, *"system mode delegates to the injected OS-trash fn (not the .trash)"*;
  - `Core/Nexus/mutate.test.ts:3693-3707`, *"lifts under the system Trash Mode too, so the system trash never takes an excluded folder"*, the Nexus lift staying pinned by the cases above it;
  - `Core/Tiles/tilesFile.test.ts:354-366`, *"a removed tile file goes to the system trash in System mode"*;
  - `Core/Trash/deleteOrder.test.ts:218-227`, *"system-trash mode records nothing and mints no bundle"*;
  - `Core/Trash/deleteReach.test.ts:329-344`, *"runs the pass for a system-trash delete, which mints no bundle"*;
  - `Core/Trash/deleteReach.test.ts:443-488`, the describe *"to the system trash"* and its two cases, a Collection gone for good taking its Archive and its Sets' views staying pinned on the Nexus path by `spend.test.ts:1919` and `trashRecovery.test.ts:1051`;
  - `Core/Trash/deleteReach.test.ts:672-679`, the second half of the case ending at `:680` (the finish's system discard of `ctx_last`), its first half staying;
  - `Core/Trash/spend.test.ts:342-349`, *"a system-trash Context delete drops its panel id and its Space order at once"*;
  - `Core/Trash/spend.test.ts:352-364`, *"system trash mode writes no bundle — the artifact leaves the nexus entirely"*;
  - `Core/Trash/spend.test.ts:378-389`, *"system trash mode refuses the same Context delete"*, the Nexus refusal staying pinned at `:366`;
  - `Core/Trash/spend.test.ts:1877-1893`, *"a Set deleted to the system trash drops its pages' entries with the delete"*, the empty's drop staying pinned at `:1747`;
  - `Desktop/Config/appConfig.test.ts:58-68`, *"round-trips a valid trashMode through write then read"* and *"ignores an invalid trashMode (consumer defaults to nexus)"*.
- [x] Switch the cases that only borrowed the mode:
  - `Core/Files/writePathRace.test.ts:83`: `const ctx = { root }`;
  - `Core/Nexus/mutate.test.ts:731-749`: the second delete runs as the first does, and the title drops *", in either Trash Mode"*;
  - `Core/Nexus/mutate.test.ts:1415-1421`, *"a replaced photo reaches no trash"*: installs `{ ...diskMachine(), trashToSystem }` around its two mutations and restores `diskMachine()` after, its assertion unchanged;
  - `Core/Nexus/settle.test.ts:854` and `Core/Properties/setSpaceProperty.test.ts:26-27`: the literal goes and `ctx` becomes `(): MutateContext => ({ root })`;
  - `Core/Trash/deleteReach.test.ts:608-620` becomes *"a Context delete whose move fails keeps its order"*: `vi.spyOn(atomicWrite, 'relocate').mockRejectedValueOnce(new Error('busy'))` in place of the system deps, `handleMutate(root, { op: 'delete', path: AREAS, kind: 'context' })`, its assertions unchanged;
  - `Desktop/Config/appConfig.test.ts:84-95` becomes *"keeps an unmodelled key when the device is written"*, seeding `{ windowBounds: { w: 1 } }` alone and dropping the two `trashMode` lines.
- [x] Remove `trashMode: async () => 'nexus'` from every `HostContext` stub: `Core/Contract/writeGate.test.ts:34`, `Core/Nexus/admission.test.ts:75`, `Core/Nexus/adopt.test.ts:48`, `Core/Nexus/handlers.test.ts:82`, `Core/Properties/handlers.test.ts:49`, `Core/Nexus/mutate.test.ts:1538,1582,1633,1740,3308`.
- [x] Narrow the `delete:facts` stubs: drop the `'delete:facts'` key where its suite now asks it nothing (`Core/Archive/ArchiveView.test.tsx:145-148`; `confirmations.test.ts:222` and `:472`), and answer `{ permanentDelete: false }` where `askEmptyTrash` still asks it (`confirmations.test.ts:340`; `Core/Settings/TrashFrame.test.tsx:157-160`).
- [x] Remove every `TrashDeps` literal and its import (35 files, 32 of them stubbing `trashToSystem`), and drop the argument at each call site: `settledMutate(root, req, X)` → `settledMutate(root, req)`; `handleMutate(root, req, X)` → `handleMutate(root, req)`; `finishOwed(root, X)` → `finishOwed(root)`; `migrateAssets(root, X)`, `removeTile(…, X)`, `convertTile(…, X)` lose their last argument; `{ root, deps: X }` → `{ root }`; `discardFile(dir, p, { … })` → `discardFile(dir, p)` (`Core/Files/atomicWrite.test.ts:521`). Typecheck finds every one.
- [x] Helpers typed to forward the literal lose the parameter as well as the argument: `spend.test.ts:280`'s `deleteProjects(deps)` becomes `deleteProjects()`, and `setSpaceProperty.test.ts:137`'s `settled` leaves.
- [x] Suites that empty a bundle with Permanently Delete off install the machine their literal stubbed, in a `beforeEach`, and `afterEach(() => installMachine(diskMachine()))`: `Core/Trash/spend.test.ts` (`trashToSystem: async () => {}`), `Core/Trash/trashRecovery.test.ts` (`trashToSystem: async (p) => void handed.push(p)`), and `Core/Archive/archive.test.ts` (`trashToSystem: async () => {}`).
- [x] `Core/Files/atomicWrite.test.ts:390-430`'s describe *"trashFileFlat"* becomes *"discardFile"*: `discardFile` keeps HEAD's `void`, since only these cases read the destination `trashFileFlat` answered, so each case calls `discardFile(dir, p)` and lists `.trash` for what it left, its assertions otherwise unchanged (the AFTER's test hunk).
- [x] Apply the doc lines under the AFTER.

**AFTER**

```Core/Trash/discard.ts diff
@@ imports @@
 import { basename, join } from '../Paths/posix'
 import { machine } from '../Platform/machine'
 import { pathExists } from '../Files/atomicWrite'
 import { noteOwn, recordWrite } from '../Files/writeEcho'
-import type { HostContext } from '../Contract/handlers'
 import { chainDir } from '../Bundles/bundle'
 import { fileStamp, stampedLeaf } from '../Bundles/layout'
-import type { TrashMode } from './trashMode'
 
-export async function trashFileFlat(nexusRoot: string, absPath: string): Promise<string> {
+/** A file the Trash can't list, a tile's text or an image sweep's leftover, moves into `.trash` under the chain it left from, stamped, with no record. */
+export async function discardFile(nexusRoot: string, absPath: string): Promise<void> {
   recordWrite(absPath)
   const dir = await chainDir(nexusRoot, { kind: 'trash' }, absPath)
   const stamp = fileStamp()
   const base = basename(absPath)
   let dest = join(dir, stampedLeaf(stamp, 0, base))
   for (let n = 1; await pathExists(dest); n++) dest = join(dir, stampedLeaf(stamp, n, base))
   recordWrite(dest)
   await machine().rename(absPath, dest)
-  return dest
+  await noteOwn({ event: 'unlink', absPath, origin: 'own' })
 }
-
-export interface TrashDeps {
-  trashMode: TrashMode
-  trashToSystem: (absPath: string) => Promise<void>
-}
-
-export async function trashDeps(ctx: HostContext): Promise<TrashDeps> {
-  return {
-    trashMode: await ctx.trashMode(),
-    trashToSystem: (p) =>
-      machine().trashToSystem?.(p) ?? Promise.reject(new Error('This host has no system trash.')),
-  }
-}
-
-/** A file the Trash can't list — a tile's text, an image sweep's leftover — still goes where Trash Mode sends deletions. */
-export async function discardFile(
-  nexusRoot: string,
-  absPath: string,
-  deps: TrashDeps,
-): Promise<void> {
-  if (deps.trashMode === 'nexus') await trashFileFlat(nexusRoot, absPath)
-  else {
-    recordWrite(absPath)
-    await deps.trashToSystem(absPath)
-  }
-  await noteOwn({ event: 'unlink', absPath, origin: 'own' })
-}
```

```Core/Files/atomicWrite.test.ts diff
@@ imports @@
-import { discardFile, trashFileFlat } from '../Trash/discard'
+import { discardFile } from '../Trash/discard'
@@ describe 'trashFileFlat' @@
-describe('trashFileFlat', () => {
+describe('discardFile', () => {
+  const trashed = async (...chain: string[]): Promise<string[]> => {
+    const at = join(dir, '.trash', ...chain)
+    return (await readdir(at)).map((leaf) => join(at, leaf))
+  }
+
   it('moves a file into .trash under a stamped leaf and removes the original', async () => {
     const p = join(dir, 'doomed.md')
     await atomicWriteFile(p, 'bye')
-    const dest = await trashFileFlat(dir, p)
-    expect(dest).toContain('.trash')
+    await discardFile(dir, p)
+    const [dest] = await trashed()
+    expect(basename(dest).endsWith('__doomed.md')).toBe(true)
     expect(await readFile(dest, 'utf8')).toBe('bye')
     await expect(stat(p)).rejects.toThrow()
   })
@@ it 'records both ends of the move' @@
-    const dest = await trashFileFlat(dir, p)
+    await discardFile(dir, p)
     setWriteTap(null)
-    expect(seen).toEqual([p, dest])
+    expect(seen).toEqual([p, ...(await trashed())])
   })
@@ it 'mirrors the folder chain the file was deleted from' @@
-    const dest = await trashFileFlat(dir, p)
-    expect(dest.startsWith(join(dir, '.trash', 'Notes', 'Daily'))).toBe(true)
+    await discardFile(dir, p)
+    const [dest] = await trashed('Notes', 'Daily')
     expect(basename(dest).endsWith('__Beta.md')).toBe(true)
@@ it 'de-collides two trashes of the same name from the same folder' @@
-    const first = await trashFileFlat(dir, p)
+    await discardFile(dir, p)
     await atomicWriteFile(p, 'two')
-    const second = await trashFileFlat(dir, p)
-    expect(second).not.toBe(first)
-    expect(await readFile(first, 'utf8')).toBe('one')
-    expect(await readFile(second, 'utf8')).toBe('two')
+    await discardFile(dir, p)
+    const kept = await Promise.all((await trashed()).map((f) => readFile(f, 'utf8')))
+    expect(kept.sort()).toEqual(['one', 'two'])
   })
```

```Core/Trash/handlers.ts diff
@@ imports @@
 import { sessionRoot } from '../Nexus/session'
-import type { TrashMode } from './trashMode'
 import { SETTING_DEFAULTS } from '../Settings/personalization'
@@ trashHandlers @@
 export const trashHandlers = {
-  'delete:facts': async (
-    ctx,
-  ): Promise<Result<{ trashMode: TrashMode; permanentDelete: boolean }>> => {
+  'delete:facts': async (): Promise<Result<{ permanentDelete: boolean }>> => {
     const root = sessionRoot()
     return ok({
-      trashMode: await ctx.trashMode(),
       permanentDelete:
```

```Core/Contract/bridge.ts diff
@@ imports @@
 import type { BundleRow } from '../Bundles/rows'
-import type { TrashMode } from '../Trash/trashMode'
 import type { ClearReport } from '../Settings/exclusionScan'
@@ Asks @@
   // Read at the moment of asking, never from the renderer's cache, so the confirmation can't promise the system trash while main erases outright.
-  'delete:facts': { args: []; reply: Result<{ trashMode: TrashMode; permanentDelete: boolean }> }
+  'delete:facts': { args: []; reply: Result<{ permanentDelete: boolean }> }
```

```Core/Contract/handlers.ts diff
@@ imports @@
 import type { ThumbRect } from '../Interface/chrome'
-import type { TrashMode } from '../Trash/trashMode'
 import type { SyncDevice } from '../Sync/Contract/wire'
@@ HostContext @@
   webGuests: { setZoom(guestId: number, factor: number): void; pauseMedia(guestId: number): void }
-  trashMode(): Promise<TrashMode>
   fetchTitle(url: string): Promise<string | null>
```

```Desktop/Config/appConfig.ts diff
@@ imports @@
 import { readJsonObject, rmwJsonStrict } from '@pommora/core/Files/atomicWrite'
-import { DEFAULT_TRASH_MODE, type TrashMode } from '@pommora/core/Trash/trashMode'
 import { TRASH_DIR } from '@pommora/core/Paths/nexusPaths'
@@ AppConfig @@
   recents?: string[]
-  trashMode?: TrashMode
   device?: SyncDevice
 }
 
 const FILE = 'pommora.json'
 
-export const trashModeOf = (config: AppConfig): TrashMode => config.trashMode ?? DEFAULT_TRASH_MODE
-
 export function appConfigPath(userDataDir: string): string {
@@ readAppConfig @@
       : undefined,
-    trashMode: obj.trashMode === 'system' || obj.trashMode === 'nexus' ? obj.trashMode : undefined,
     device: readDevice(obj.device),
```

```Desktop/main.ts diff
@@ imports @@
 import {
   addRecent,
   readAppConfig,
   resolveRestorePath,
-  trashModeOf,
   updateAppConfig,
 } from './Config/appConfig'
@@ host context @@
     webGuests: { setZoom: setGuestTileZoom, pauseMedia: pauseGuestMedia },
-    trashMode: async () => trashModeOf(await readAppConfig(userData())),
     fetchTitle: fetchPageTitle,
```

```Core/Interface/Confirm/confirmations.ts diff
@@ imports @@
 import { valueOr } from '../../Contract/result'
-import { DEFAULT_TRASH_MODE } from '../../Trash/trashMode'
 import { useSession } from '../../Session/store'
@@ DELETE_FACTS_FALLBACK @@
-const DELETE_FACTS_FALLBACK = {
-  trashMode: DEFAULT_TRASH_MODE,
-  permanentDelete: SETTING_DEFAULTS.permanentDelete,
-}
+const DELETE_FACTS_FALLBACK = { permanentDelete: SETTING_DEFAULTS.permanentDelete }
@@ askTrashing @@
 export const askTrashing = async (targets: readonly Asked[]): Promise<boolean> => {
   if (targets.every(({ kind }) => waived('confirmDeletion', kind))) return true
-  const { trashMode } = valueOr(await dialer().ask('delete:facts'), DELETE_FACTS_FALLBACK)
   const it = targets.length > 1 ? 'They' : 'It'
   return ask({
     message: deleteQuestion(targets),
-    detail:
-      trashMode === 'system'
-        ? `${it} will be moved to the system trash.`
-        : `${it} will be moved to the nexus’s .trash folder (recoverable).`,
+    detail: `${it} will be moved to the nexus’s .trash folder (recoverable).`,
     action: 'Delete',
@@ confirmDelete @@
-/** A held item asks the Trash's question and a property its own, counting what holds it. A system-trash delete mints no bundle, so it offers no Undo; `undoTo` returns a held item where the delete took it from rather than to its origin, and a property, which a restore lands only in the registry, takes none. */
+/** A held item asks the Trash's question and a property its own, counting what holds it. `undoTo` returns a held item where the delete took it from rather than to its origin, and a property, which a restore lands only in the registry, takes none. */
```

```Core/Nexus/mutateRequest.ts diff
@@ MutateOutcome @@
-  /** Where a removal filed what it took, in the Trash or an Archive; absent when the system trash took it. */
+  /** Where a removal filed what it took, in the Trash or an Archive. */
   bundled?: { bundlePath: string }
```

```Core/Trash/delete.ts diff
@@ imports @@
 import { resolveUnderRoot } from '../Paths/pathSafety'
-import { collectionArchive } from '../Archive/archive'
 import { containerAt, pageAt, spaceAt } from '../Nexus/treePatch'
 import { liveTreeOf, mutableTarget, NOT_HELD } from '../Nexus/liveTree'
 import { pagesOf } from '../Nexus/record'
-import { dropPageMetadata } from '../Nexus/pageMetadata'
 import { isContainer } from '../Nexus/entities'
@@ imports @@
 import type { MutateReply, MutateRequest } from '../Nexus/mutateRequest'
-import { machine } from '../Platform/machine'
-import { discardFile } from './discard'
-import { contentPages, mintBundle, openBundle, pageIdsOf, spendBundle } from '../Bundles/bundle'
+import { contentPages, mintBundle, openBundle, spendBundle } from '../Bundles/bundle'
 import { originPathOf } from '../Bundles/layout'
@@ deleteNote @@
     title: string,
-    bundle: string | null,
+    bundle: string,
   ) =>
   (e: Entry | undefined): Entry => ({
     ...kind,
     strip: owedDelete(e ?? {}, title).strip,
-    ...(bundle ? { bundle: relative(root, bundle) } : {}),
+    bundle: relative(root, bundle),
   })
@@ deleteOp @@
 export async function deleteOp(
-  { root, deps }: MutateContext,
+  { root }: MutateContext,
   req: Extract<MutateRequest, { op: 'delete' }>,
 ): Promise<MutateReply> {
@@ deleteOp @@
     // Write-ahead: the record lands before anything moves, a Space's or Context's built from what its holders held up front, then its note; every strip runs after the artifact moves, so a failed move strips nothing, and a strip that misses a file leaves the note for Try Again.
-    const bundle =
-      deps.trashMode === 'system'
-        ? null
-        : await mintBundle(root, { kind: 'trash' }, from?.origin ?? abs)
-    const archive =
-      !bundle && req.kind === 'collection'
-        ? await collectionArchive(root, containerAt(before, req.path)?.id)
-        : null
-    const edit = from ? from.edit : goneEdit(before, req.kind, req.path, archive?.sets)
-    // With no bundle to keep them, the pages' metadata entries leave with the delete, by the ids their files carry before the move.
-    const pageIds = bundle
-      ? []
-      : await pageIdsOf([...(await contentPages(req.kind, abs)), ...(archive?.files ?? [])])
+    const bundle = await mintBundle(root, { kind: 'trash' }, from?.origin ?? abs)
+    const edit = from ? from.edit : goneEdit(before, req.kind, req.path)
     const under =
       from?.under ?? pagesOf(before).flatMap((p) => (isAtOrUnder(p.path, rel) ? p.path : []))
-    const targets = bundle ? await gatherLinkTargets(root, before, rel, under) : {}
+    const targets = await gatherLinkTargets(root, before, rel, under)
     const write = async (record: RecordFile | null): Promise<void> => {
-      if (bundle && record)
-        await writeRecord(bundle, {
-          ...record,
-          ...(Object.keys(targets).length ? { targets } : {}),
-        })
+      if (record)
+        await writeRecord(bundle, { ...record, ...(Object.keys(targets).length ? { targets } : {}) })
     }
     // A refused note or list step leaves nothing deleted, so its bundle goes and a lifted set-aside comes back.
     const unminted = async <R extends { ok: false }>(r: R): Promise<R> => {
-      if (bundle) await removeOwn(bundle)
+      await removeOwn(bundle)
       await lifted?.value.rollback()
       return r
     }
@@ deleteOp @@
     // The artifact moves, then what leaves with it.
     const leave = async (): Promise<void> => {
-      if (bundle) await relocate(abs, join(bundle, basename(abs)))
-      else await machine().lock(abs, () => discardFile(root, abs, deps))
+      await relocate(abs, join(bundle, basename(abs)))
       moved = true
-      if (archive) await machine().lock(archive.abs, () => discardFile(root, archive.abs, deps))
       if (from) await spendBundle(root, from.opened)
       else await dropDeparture(root, before, req.kind, req.path)
-      await dropPageMetadata(root, pageIds)
     }
@@ deleteOp @@
-        sweep: async (left) => (left ? finishEntry(root, id, deps) : { skipped: 1, hosts: [] }),
+        sweep: async (left) => (left ? finishEntry(root, id) : { skipped: 1, hosts: [] }),
       })
     let stripped: CascadeReport | null = null
     if (req.kind === 'space') {
-      const registry = bundle ? await readRegistryStrict(root) : null
+      const registry = await readRegistryStrict(root)
       const space = spaceAt(before, rel)
       if (!space) return fail('not-found', 'Unknown Space.')
@@ deleteOp @@
-      if (bundle)
-        await write(
-          await gatherSpaceRecord(
-            before,
-            abs,
-            registry,
-            outside(await findHolders(root, query, 'values')),
-          ),
-        )
+      await write(
+        await gatherSpaceRecord(before, abs, registry, outside(await findHolders(root, query, 'values'))),
+      )
       const ran = await deleted(
@@ deleteOp @@
       if (!entry) return fail('not-found', 'Unknown Context.')
-      const evidence = bundle ? await gatherContextEvidence(abs, entry, at) : null
+      const evidence = await gatherContextEvidence(abs, entry, at)
       const query = { keys: [contextKey(title)], reach: 'anywhere' as const }
-      if (evidence)
-        await write(buildContextRecord(evidence, outside(await findHolders(root, query, 'values'))))
+      await write(buildContextRecord(evidence, outside(await findHolders(root, query, 'values'))))
       const ran = await deleted(
@@ deleteOp @@
     } else {
-      await write(
-        bundle ? (from?.record ?? (await gatherContentRecord(root, before, req.kind, abs))) : null,
-      )
+      await write(from?.record ?? (await gatherContentRecord(root, before, req.kind, abs)))
       // Keyed by the live item's id, or by its path for an archived one; noted before the move, so a delete cut short finishes its strip and views at the next open.
       const id = (req.kind === 'page' ? pageAt(before, rel) : containerAt(before, rel))?.id ?? rel
       const ran = await deleted(id, () => ({
         kind: 'container',
         at: rel,
-        strip: distinct(from?.keys ?? under, archive?.origins),
+        strip: distinct(from?.keys ?? under),
         ...(edit ? { edit } : {}),
-        ...(bundle ? { bundle: relative(root, bundle) } : {}),
+        bundle: relative(root, bundle),
       }))
@@ deleteOp @@
     return ok({
-      ...(bundle ? { bundled: { bundlePath: relative(root, bundle) } } : {}),
+      bundled: { bundlePath: relative(root, bundle) },
       ...(stripped ? { cascade: stripped } : {}),
     })
```

```Core/Nexus/finishOwed.ts diff
@@ imports @@
 import { memberKey } from '../Files/rootValues'
-import { discardFile, type TrashDeps } from '../Trash/discard'
 import { type CascadeReport, deleteCascade, relinkReach, type StrippedLink } from './cascade'
@@ imports @@
 import { oweWalk } from './fileEvents'
-import { machine } from '../Platform/machine'
 import { heldName, relocate, targetTaken } from '../Files/atomicWrite'
@@ imports @@
 import { inContextsTurn, inSettleTurn } from './settle'
-import { dropContextOrder } from './reorder'
 import { liveTreeOf, refreshTree } from './liveTree'
@@ finishOwed @@
-export async function finishOwed(root: string, deps: TrashDeps): Promise<CascadeReport> {
+export async function finishOwed(root: string): Promise<CascadeReport> {
@@ finishOwed @@
-        add(total, await finishEntry(root, id, deps))
+        add(total, await finishEntry(root, id))
@@ finishEntry @@
-export async function finishEntry(root: string, id: string, deps: TrashDeps): Promise<ConfigReach> {
+export async function finishEntry(root: string, id: string): Promise<ConfigReach> {
   const notes = await readNotes(root)
   const e = notes[id]
   if (!e) return NO_REACH
-  const done = await finishArm(root, id, e, notes, deps)
+  const done = await finishArm(root, id, e, notes)
@@ finishArm @@
-function finishArm(
-  root: string,
-  id: string,
-  e: Entry,
-  notes: Notes,
-  deps: TrashDeps,
-): Promise<Finished<Entry>> {
+function finishArm(root: string, id: string, e: Entry, notes: Notes): Promise<Finished<Entry>> {
   switch (e.kind) {
     case 'property':
       return finishProperty(root, id, e)
     case 'context':
-      return finishContext(root, id, e, deps)
+      return finishContext(root, id, e)
     case 'space':
-      return finishSpace(root, id, e, notes, deps)
+      return finishSpace(root, id, e, notes)
@@ leave @@
-/** A deleted Context's or Space's folder, where its delete's list step left it, into its bundle or where Trash Mode sends it. */
-const leave = async (
-  root: string,
-  abs: string,
-  bundle: string | undefined,
-  deps: TrashDeps,
-): Promise<void> => {
-  if (bundle) await relocate(abs, join(root, bundle, basename(abs)))
-  else await machine().lock(abs, () => discardFile(root, abs, deps))
+/** A deleted Context's or Space's folder, where its delete's list step left it, into the bundle its delete noted. */
+const leave = async (root: string, abs: string, bundle: string): Promise<void> => {
+  await relocate(abs, join(root, bundle, basename(abs)))
   oweWalk(root)
 }
 
-async function finishContext(
-  root: string,
-  id: string,
-  e: ContextEntry,
-  deps: TrashDeps,
-): Promise<Finished<ContextEntry>> {
+async function finishContext(root: string, id: string, e: ContextEntry): Promise<Finished<ContextEntry>> {
@@ finishContext @@
       const dir = join(contextsDir(root), old)
-      if ((await heldName(dir)) === old) await leave(root, dir, e.bundle, deps)
+      if ((await heldName(dir)) === old) await leave(root, dir, e.bundle!)
       return unlinkContextKey(root, old, id, dir)
@@ finishContext @@
     () => reachConfig(root, { kind: 'property', propertyId: id }),
   )
-  // A Context gone for good, with no bundle to restore it from, takes its order with it.
-  if (!e.bundle && title === undefined) await dropContextOrder(root, id)
   return { left: { ...e, rename, strip }, reach }
 }
 
 async function finishSpace(
   root: string,
   id: string,
   e: SpaceEntry,
   notes: Notes,
-  deps: TrashDeps,
 ): Promise<Finished<SpaceEntry>> {
@@ finishSpace @@
   if (deleted && (await heldName(join(root, space.path))) === space.title)
-    await leave(root, join(root, space.path), e.bundle, deps)
+    await leave(root, join(root, space.path), e.bundle!)
```

`ContextEntry.bundle` and `SpaceEntry.bundle` stay optional (`Core/Nexus/owed.ts:21-22`): a rename's entry carries none, and `finishSpace:342` writes one without it. Every strip a finish meets comes from a delete, which now always notes its bundle, so `bundle` is present exactly when `strip` is, and the two strip-path callers' `!`s assert that pairing.

```Core/Trash/spend.ts diff
@@ imports @@
 import { frozenWorld, parkLinks, refillTrashed } from './trashedCopies'
-import type { TrashDeps } from './discard'
 import { NO_DESTINATION, placeRecord } from '../Bundles/placement'
@@ emptyBundle @@
-export async function emptyBundle(
-  root: string,
-  bundleAbs: string,
-  deps: TrashDeps,
-): Promise<MutateReply> {
+export async function emptyBundle(root: string, bundleAbs: string): Promise<MutateReply> {
   const opened = await openBundle(root, bundleAbs)
@@ emptyBundle @@
   const dispose = async (abs: string): Promise<void> => {
     recordWrite(abs)
     if (permanent) await machine().remove(abs)
-    else await deps.trashToSystem(abs)
+    else
+      await (machine().trashToSystem?.(abs) ??
+        Promise.reject(new Error('This host has no system trash.')))
     await noteOwn({ event: 'unlink', absPath: abs, origin: 'own' })
   }
@@ emptyBundle @@
-    const reach = await serializeSchemaOp(root, () => finishEntry(root, record.id, deps))
+    const reach = await serializeSchemaOp(root, () => finishEntry(root, record.id))
@@ emptyBundle @@
-  return ok({ cascade: owedReport(root, await finishEntry(root, id, deps)) })
+  return ok({ cascade: owedReport(root, await finishEntry(root, id)) })
```

```Core/Nexus/mutate.ts diff
@@ imports @@
 import { setActiveView } from '../Views/viewsFile'
-import type { TrashDeps } from '../Trash/discard'
 import { createContainerOp, createPageOp, createSpaceOp, landedAs } from './create'
@@ MutateContext @@
 export interface MutateContext {
   root: string
-  deps: TrashDeps
 }
 
-export async function handleMutate(
-  root: string,
-  req: MutateRequest,
-  deps: TrashDeps,
-): Promise<MutateReply> {
+export async function handleMutate(root: string, req: MutateRequest): Promise<MutateReply> {
   try {
-    return await dispatch({ root, deps }, req)
+    return await dispatch({ root }, req)
   } catch (e) {
@@ dispatch @@
 async function dispatch(ctx: MutateContext, req: MutateRequest): Promise<MutateReply> {
-  const { root, deps } = ctx
+  const { root } = ctx
@@ dispatch @@
       return resolved.ok
-        ? inSettleTurn(root, () => emptyBundle(root, resolved.value, deps))
+        ? inSettleTurn(root, () => emptyBundle(root, resolved.value))
         : resolved
@@ dispatch @@
     case 'finishOwed':
-      return ok({ cascade: await finishOwed(root, deps) })
+      return ok({ cascade: await finishOwed(root) })
```

`MutateContext` keeps its one field rather than every op taking a bare `root`: fifteen op modules destructure it (`archive.ts:34`, `create.ts:27,58,85`, `move.ts:28,44`, `rename.ts:11`, and the rest), and it stays the dispatch's one context shape.

```Core/Nexus/handlers.ts diff
@@ imports @@
-import { trashDeps } from '../Trash/discard'
@@ open @@
-    await finishOwed(root, await trashDeps(ctx))
+    await finishOwed(root)
@@ mutate @@
-    const reply = await handleMutate(root, req, await trashDeps(ctx))
+    const reply = await handleMutate(root, req)
```

```Core/Testing/settledMutate.ts diff
@@ imports @@
 import { stabilize } from '../Nexus/treeStabilize'
-import type { TrashDeps } from '../Trash/discard'
@@ settledMutate @@
-export async function settledMutate(
-  root: string,
-  req: MutateRequest,
-  deps: TrashDeps,
-): Promise<MutateReply> {
+export async function settledMutate(root: string, req: MutateRequest): Promise<MutateReply> {
   await liveTreeOf(root)
-  const reply = await handleMutate(root, req, deps)
+  const reply = await handleMutate(root, req)
```

```Core/Tiles/tilesFile.ts diff
@@ imports @@
-import { discardFile, type TrashDeps } from '../Trash/discard'
+import { discardFile } from '../Trash/discard'
@@ reviseTile @@
   patch: Json | null,
-  deps: TrashDeps,
 ): Promise<Result<Landed<{ removed: RemovedTile }>>> {
@@ reviseTile @@
-  const body = await discardTileFile(root, dir, tileId, deps)
+  const body = await discardTileFile(root, dir, tileId)
@@ discardTileFile @@
-function discardTileFile(
-  root: string,
-  dir: string,
-  tileId: string,
-  deps: TrashDeps,
-): Promise<string | null> {
+function discardTileFile(root: string, dir: string, tileId: string): Promise<string | null> {
@@ discardTileFile @@
     if (body !== null)
-      await discardFile(root, file, deps).catch((e) =>
+      await discardFile(root, file).catch((e) =>
         console.error('tiles: a removed tile’s file stayed:', e),
       )
@@ removeTile @@
 export const removeTile = (
   root: string,
   dir: string,
   tileId: string,
-  deps: TrashDeps,
-): Promise<Result<Landed<{ removed: RemovedTile }>>> => reviseTile(root, dir, tileId, null, deps)
+): Promise<Result<Landed<{ removed: RemovedTile }>>> => reviseTile(root, dir, tileId, null)
@@ convertTile @@
   pick: unknown,
-  deps: TrashDeps,
 ): Promise<Result<Landed>> {
   const patch = await pickEntry(root, pick)
   if (!patch.ok) return patch
-  const revised = await reviseTile(root, dir, tileId, patch.value, deps)
+  const revised = await reviseTile(root, dir, tileId, patch.value)
```

```Core/Tiles/handlers.ts diff
@@ imports @@
-import { type Handlers, type HostContext, withRoot, withWriteRoot } from '../Contract/handlers'
+import { type Handlers, withRoot, withWriteRoot } from '../Contract/handlers'
@@ imports @@
-import { trashDeps } from '../Trash/discard'
@@ onTile @@
 const onTile =
   <T>(
-    fn: (
-      tile: TileCtx & { ctx: HostContext },
-      tileId: string,
-      ...args: unknown[]
-    ) => Promise<Result<T>>,
+    fn: (tile: TileCtx, tileId: string, ...args: unknown[]) => Promise<Result<T>>,
   ) =>
   async (
     root: string,
-    ctx: HostContext,
+    _ctx: unknown,
     host: unknown,
     tileId: unknown,
     ...args: unknown[]
   ): Promise<Result<T>> => {
     const tile = await tileHostAnd(root, host, tileId)
-    return tile.ok ? fn({ ...tile.value, ctx }, tileId as string, ...args) : tile
+    return tile.ok ? fn(tile.value, tileId as string, ...args) : tile
   }
@@ tiles:removeTile @@
   'tiles:removeTile': withWriteRoot(
-    onTile(async ({ root, dir, ctx }, tileId) =>
-      removeTile(root, dir, tileId, await trashDeps(ctx)),
-    ),
+    onTile(({ root, dir }, tileId) => removeTile(root, dir, tileId)),
   ),
@@ tiles:convert @@
   'tiles:convert': withWriteRoot(
-    onTile(async ({ root, dir, ctx }, tileId, pick) =>
-      convertTile(root, dir, tileId, pick, await trashDeps(ctx)),
-    ),
+    onTile(({ root, dir }, tileId, pick) => convertTile(root, dir, tileId, pick)),
   ),
```

```Core/Assets/assetMigrate.ts diff
@@ imports @@
-import { discardFile, type TrashDeps } from '../Trash/discard'
+import { discardFile } from '../Trash/discard'
@@ migrateAssets @@
-export async function migrateAssets(root: string, deps: TrashDeps): Promise<AssetMigration | null> {
+export async function migrateAssets(root: string): Promise<AssetMigration | null> {
@@ migrateAssets @@
-  // Last, so a discard the system trash refuses leaves the move itself whole.
-  if (!result.skipped.length) result.trashed = await sweepLegacyRoot(root, deps)
+  // Last, so a discard that fails leaves the move itself whole.
+  if (!result.skipped.length) result.trashed = await sweepLegacyRoot(root)
   return result
 }
 
-async function sweepLegacyRoot(root: string, deps: TrashDeps): Promise<number> {
+async function sweepLegacyRoot(root: string): Promise<number> {
@@ sweepLegacyRoot @@
-  for (const abs of files) await discardFile(root, abs, deps)
+  for (const abs of files) await discardFile(root, abs)
```

```Core/Assets/handlers.ts diff
@@ imports @@
 import { migrateAssets } from './assetMigrate'
-import { trashDeps } from '../Trash/discard'
@@ assets:setDir @@
-  'assets:setDir': withWriteRoot(async (root, ctx, dir: unknown) => {
+  'assets:setDir': withWriteRoot(async (root, _ctx, dir: unknown) => {
@@ assets:setDir @@
-      const migrated = await migrateAssets(root, await trashDeps(ctx))
+      const migrated = await migrateAssets(root)
```

```Core/Trash/spend.test.ts diff
@@ describe 'empty' @@
+  it('emptying with Permanently Delete off, on a host with no system trash, refuses and leaves the item in its bundle', async () => {
+    await settledMutate(root, { op: 'delete', path: 'Notes/Daily/Alpha.md', kind: 'page' })
+    const [listed] = await listBundles(root, { kind: 'trash' })
+    installMachine(diskMachine())
+    const r = await settledMutate(root, { op: 'emptyBundle', bundlePath: listed.bundlePath })
+    expect(!r.ok && r.error.message).toBe('This host has no system trash.')
+    expect(await pathExists(join(root, listed.bundlePath, 'Alpha.md'))).toBe(true)
+  })
```

The case sits in the suite's describe for emptying a page's bundle, after the suite's `beforeEach` installs its own machine.

```.claude/Features/CorePM.md diff
@@ :56 @@
~├── pommora.json                             | • Last-opened Nexus, recent Nexuses, the device's public key, fingerprint, and name
@@ :148 @@
~| A page's icon, aliases, title-icon override, and lock         | `metadata/MM-YYYY.json`, by the month the page was created                   | Clearing the field; emptying the page, or a Collection whose Archive holds it, from the Trash; an entry left with nothing set is deleted |
@@ :171 @@
~| The last Nexus opened and the recent Nexus list | Where to reopen | Opening another Nexus; the list rolls off at ten |
```

```.claude/Features/DesktopPM.md diff
@@ :38 @@
~`Desktop/Config/appConfig.ts` reads and writes `pommora.json` in the app's own support folder — the last Nexus opened, the recent list, and the device. It belongs to the app rather than to any Nexus, so it holds no matter which one is open.
```

```.claude/Features/ConfigurationPM.md diff
@@ :266 @@
-… the roll-off list of recently opened Nexuses behind Open Recent, the delete target — the in-Nexus `.trash` or the system trash — and the device, …
+… the roll-off list of recently opened Nexuses behind Open Recent, and the device, …
```

```.claude/Features/NexusRecordPM.md diff
@@ :12 @@
-… A required payload that can't be gathered writes no record at all, degrading that entity to hand-restore. System-trash mode records nothing, since the artifact leaves the Nexus entirely; a property delete records in either mode.
+… A required payload that can't be gathered writes no record at all, degrading that entity to hand-restore.
@@ :16 @@
-… and one per deleted property under its definition's label, whichever Trash Mode is set. …
+… and one per deleted property under its definition's label. …
-… a Collection given up takes its Archive with it, as a system-trash delete of one does; …
+… a Collection given up takes its Archive with it; …
-… and leaves Undo to the undo chord. A system-trash delete mints no bundle, so it offers no Undo.
+… and leaves Undo to the undo chord.
```

```.claude/Features/InterfacePM.md diff
@@ :80 @@
-… a view's Undo saves back the configuration the surface still holds, and a delete sent to the system trash offers none. …
+… and a view's Undo saves back the configuration the surface still holds. …
```

```.claude/Features/SurfacePM.md diff
@@ :26 @@
-… Removing one sends its file wherever Trash Mode sends deletions. …
+… Removing one moves its file into the Nexus's `.trash`, where no listing shows it. …
```

**VERIFY**

- [x] *"emptying with Permanently Delete off, on a host with no system trash, refuses and leaves the item in its bundle"* is green, and red with `dispose`'s system call replaced by a no-op.
- [x] *"a Context delete whose move fails keeps its order"* (`deleteReach.test.ts:608`) is green in the Nexus's Trash.
- [x] `git grep -nP "TrashMode|trashMode|DEFAULT_TRASH_MODE|TrashDeps|trashDeps|trashFileFlat|trashModeOf" -- Core Desktop` prints nothing.
- [x] `git grep -nP "system[- ]trash (mode|delete)|Trash Mode" -- Core Desktop .claude/Features .claude/CLAUDE.md` prints nothing.
- [x] `test ! -e Core/Trash/trashMode.ts` succeeds.
- [x] Run the gates.
- [x] Check for unnecessary code or mistakes.

#### Task 2-2

**TASK:** The content record's `partial` leaves (L-4, Decision C-3): no code writes it on a page, Set, or Collection, so its decode, its copy into an inner record, and its readers' content arms are compatibility-only. The test pinning the retired `.provenance.json` format's invisibility leaves with it.

**NOW:** `contentRecord`'s `partial` (`Core/Bundles/record.ts:61`) has no writer: `gatherContentRecord` never sets it (`record.ts:187-221`), and `innerRecord` copies it from a container record that can't carry it (`Core/Bundles/bundle.ts:256,271`). Its readers are `rows.ts:147` and `recordedPartly` (`record.ts:102-109`), each reading the union, and `restoreTrashed` destructures it away at `Core/Trash/spend.ts:197`. The Space, Context, and property arms keep theirs (`record.ts:77,88,96`), written at `Core/Trash/gather.ts:99,139` and `Core/Properties/deleteProperty.ts:72`. Pins of its absence: `deleteOrder.test.ts:167,173,215` and `deleteReach.test.ts:800-806`; `spend.test.ts:685-699` pins only that the retired format stays invisible, which no production code reads. A record carrying the key still decodes, since every arm is a stripping `z.object` (*Investigation*, L-4).

**CHANGE**

- [x] Apply the AFTER.
- [x] Remove `expect(atSettle).not.toHaveProperty('partial')` and `expect(after).not.toHaveProperty('partial')` (`Core/Trash/deleteOrder.test.ts:167,173`) and `expect(atSettle).not.toHaveProperty('partial')` (`:215`); the Space and Context cases' `not.toMatchObject({ partial: true })` (`:184,200`) stay.
- [x] Remove `Core/Trash/deleteReach.test.ts:800-806`, *"a clean delete's record carries no partial"*, and the content records' `not.toHaveProperty('partial')` assertions at `:142` and `:374`, which nothing can make fail once content records carry no mark.
- [x] `Core/Trash/spend.test.ts`'s *"a partly recorded page's restore says so"* becomes *"a partly recorded Space's restore says so"*, deleting and restoring `.nexus/contexts/Projects/Pommora` in place of `Notes/Daily/Alpha.md`; it's red with `recordedPartly`'s `'partial' in record` guard removed.
- [x] Remove `Core/Trash/spend.test.ts:685-699`, *"old-format trash entries are invisible"*.
- [x] Remove `Core/Bundles/bundle.test.ts:200-205`, *"marks an inner item of a partly recorded bundle partial, and one of a whole record not"*, and `Core/Bundles/rows.test.ts:463-468`, *"a row inside a partly recorded bundle carries the mark"*, which pin the copy into an inner record; and the absence assertions at `rows.test.ts:406` and `Core/Archive/archive.test.ts:1120`, whose case drops *", and its record stays whole"* from its title.
- [x] `rows.test.ts:190-216` becomes *"a partly recorded entry's row carries the mark, a property's and a Space's alike"*: its page element becomes `{ bundlePath: '.trash/.nexus/contexts/Areas/s__Work.deleted', artifactName: 'Work', record: { entity: 'space' as const, id: 'sp_work', parent: { kind: 'context' as const, id: 'ctx_areas' }, members: [], ...(partial ? { partial: true as const } : {}) } }`, so the artifact row's reading of the mark stays pinned.

**AFTER**

```Core/Bundles/record.ts diff
@@ contentRecord @@
     links: z.array(strippedLink).optional(),
     targets: linkTargets,
-    partial: z.literal(true).optional(),
   })
@@ recordedPartly @@
 export const recordedPartly = (record: RecordFile, title: string): CascadeReport | undefined =>
-  record.partial
+  'partial' in record && record.partial
     ? {
```

```Core/Bundles/rows.ts diff
@@ artifactRow @@
     homeResolves: !('refuse' in home) || home.refuse === 'id-live',
-    ...(record.partial ? { partial: true as const } : {}),
+    ...('partial' in record && record.partial ? { partial: true as const } : {}),
   })
```

```Core/Bundles/bundle.ts diff
@@ innerRecord @@
-/** What an inner item carries as its own record: its identity, the trail above it as its parent and trail, unaddressable without one, the bundle's targets, and its partial mark, since what the bundle recorded partly it recorded partly for each item it holds; no place, since the siblings it left are gone with it. */
+/** What an inner item carries as its own record: its identity, the trail above it as its parent and trail, unaddressable without one, and the bundle's targets; no place, since the siblings it left are gone with it. */
@@ innerRecord @@
     ...(held.targets ? { targets: held.targets } : {}),
-    ...(held.partial ? { partial: true as const } : {}),
   }
```

```Core/Trash/spend.ts diff
@@ restoreTrashed @@
-      const { archive, links, targets, partial, ...filed } = record
+      const { archive, links, targets, ...filed } = record
```

**VERIFY**

- [x] `git grep -nP "held\.partial|partial, \.\.\.filed" -- Core` prints nothing.
- [x] `git grep -n "provenance" -- Core` prints nothing.
- [x] The rewritten `rows.test.ts` case is green, and red with `rows.ts`'s `'partial' in record` arm removed; the Space and Context cases at `deleteOrder.test.ts:176,188`, `BundleTable.test.tsx:133`, and `finishOwed.test.ts:561` still pass.
- [x] Run the gates.
- [x] Check for unnecessary code or mistakes.

#### Task 2-3

**TASK:** Records are built from the tree (M-4), and a Context remembers its place the way every other kind does (L-3, Decision C-4): its record names its neighbors through `place` in the registry's order and through `panel` in the Property Panel's, and carries its own Space order as `spaceOrder`, so its delete takes all three out of `state.json` and its restore puts them back. The registry index `at` leaves whole, with its compatibility-only optional decode (L-4, Decision C-3), and the ghost guards the tree-built records make unreachable leave with them (L-7). L-3, L-4, and M-4 land together because they rewrite the same gather functions and record arm (*§Order Constraints*, 3). **Fold:** `slotOf` and the splice its one caller made of its answer (`placement.ts:280-281`) become one `placeAmong`, which the registry and panel writes then reuse, settling L-8's `slotOf` half with a production export. **Comments:** the AFTER adds two (`panel`'s field and `placeAmong`) and removes two (`identityOf`'s and `dropContextOrder`'s).

**Departure:** the Ledger's L-3 has `withContextAt`'s index parameter give way to the splice; it stays, since the create's append and the delete's in-op rollback of its own list step both want an exact index, and the restore passes it the index `placeAmong` answers, so one insertion function serves all three instead of a second, place-taking one beside it.

**Approach 4 · A Trashed Context's Own Space Order, Decided: The Record.** Decision C-4 has every kind remember its place one way and leave every order it sits in at its delete, and it reads a Context's Space order as its content, which returns with it as a container's child order does inside its sidecar. Keeping `order.spaces[<ID>]` in `state.json` while the Context is bundled would leave the one piece of a bundled item that lives outside its bundle, and would keep `dropContextOrder` (`Core/Nexus/reorder.ts:53-60`) alive for the empty alone (`Core/Trash/spend.ts:109`), Task 2-1 having removed its other caller. In the record, the delete drops the panel id and the Space order together in `dropDeparture`'s Context arm, the empty touches no order at all (which also leaves M-7's gone-for-good step one step shorter), and `dropContextOrder` leaves. The cost is one optional record field and one write at the restore. The record keeps the order as `state.json` held it, an absent one recorded as absent, so a Context whose Spaces were never reordered returns with none written. A Context delete cut short and finished by `finishContext`'s `leave` moves its folder without dropping its departure, so its ids stay in `state.json` as a cut-short Space delete's already do; Phase 3's one `leave` (M-8) drops the departure on both paths.

**NOW:**
- **Second Reads:** `gatherSpaceRecord` re-reads the Space's sidecar for its id and icon (`Core/Trash/gather.ts:78`) and the registry strictly (`Core/Trash/delete.ts:164` after Task 2-1) to find its Context by folder title (`gather.ts:80-84`), while `spaceAt(before, rel)` (`delete.ts:165`) holds `id`, `icon`, and `contextId` from the same sidecar. Its null and `unaddressable` arms (`gather.ts:79,96`) answer a sidecar with no id, which a tree Space can't be, and the guard at `delete.ts:166` re-queries the tree `mutableTarget` just checked (L-7). `gatherContentRecord` reads `id` and `icon` from disk through `identityOf` (`Core/Bundles/record.ts:178-185,193`), while `deleteOp` and `archiveOp` hold the tree node; `identityOf`'s other caller is `innerRecord` (`Core/Bundles/bundle.ts:263`), and its name collides with `Core/Contexts/contextIdentity.ts:33`'s export.
- **The Context's Position:** `ContextEvidence`, `gatherContextEvidence`, and `buildContextRecord` (`gather.ts:103-141`) carry the registry index `at`, decoded `index.optional()` (`record.ts:93`) though always written; the restore splices by it (`spend.ts:186-192`, through `withContextAt`, `Core/Contexts/contextsRegistry.ts:52-57`). `dropDeparture`'s Context arm writes nothing (`reorder.ts:77,106-107`), so the panel id and the Space order sit in `state.json` while the Context is bundled, and the empty drops them (`spend.ts:109`). `placeRecord` returns no order write for a Context (`Core/Bundles/placement.ts:277-278`). `slotOf` (`placement.ts:152-159`) is exported for `placement.test.ts:271-290` alone, and its one caller splices its answer at once (`placement.ts:280-281`). `withContextAt` keeps its index for the create's append (`contextWrite.ts:150`) and the delete's rollback of its own list step (`delete.ts:201`), an in-op undo rather than a stored position.
- **Two Orders:** `tree.contexts` is the registry's order (`Core/Nexus/readNexus.ts:248-271`), and `tree.config.order.contexts` and `.spaces` are `state.json`'s as written (`readNexus.ts:65-71`).

**CHANGE**

- [x] Write `spend.test.ts`'s *"a Context returns beside the neighbor its record names, wherever that neighbor has moved"* and watch it fail.
- [x] Rewrite `spend.test.ts:299-312` as *"a Context's delete takes its panel id and Space order into its record, and its restore returns it to its place in both orders"* and watch it fail.
- [x] Apply the AFTER.
- [x] Remove `spend.test.ts:314-322`, *"a record from before the place was kept restores its Context at the end"*.
- [x] Rewrite `spend.test.ts:324-340` as *"emptying a Context's bundle leaves the orders as its delete left them"*: the same `stateOrder()` expectation, `{ spaces: { ctx_areas: ['sp-home'] }, contexts: ['ctx_areas'] }`, now read after the empty.
- [x] Rewrite `Core/Nexus/reorder.test.ts:77-90`'s two `dropContextOrder` cases through `dropDeparture(root, makeTree(), 'context', '.nexus/contexts/Realms')` (`Core/Testing/testTree.ts`'s Context `g1`): *"a departing Context takes its panel id and its Space order, leaving the rest"* seeds `setSpaceOrder(root, 'g1', ['y'])`, `setSpaceOrder(root, 'other', ['x'])`, and `setPanelContextOrder(root, ['g1', 'other'])` and expects `{ spaces: { other: ['x'] }, contexts: ['other'] }`; *"a departing Context with no order writes nothing"* expects no `state.json`.
- [x] Rewrite `Core/Bundles/placement.test.ts:271-290`'s describe *"slotOf"* as *"placeAmong"*, its four cases unchanged in name: `placeAmong(['a', 'b'], 'x', { above: 'b', below: 'a' })` and `placeAmong(['a', 'b'], 'x', { above: 'gone', below: 'a' })` are `['a', 'x', 'b']`; `placeAmong(['a', 'b'], 'x', { above: 'gone' })` is `['x', 'a', 'b']`; `placeAmong(['a'], 'x', { above: 'gone', below: 'lost' })` and `placeAmong(['a'], 'x', undefined)` are `['a', 'x']`.
- [x] Apply the doc lines under the AFTER.

**AFTER**

```Core/Trash/gather.ts diff
@@ imports @@
-import { basename, dirname, isAtOrUnder, isMarkdownFile, join } from '../Paths/posix'
-import type { ContextDef, ContextsRegistry } from '../Contexts/contexts'
-import type { Result } from '../Contract/result'
+import { isAtOrUnder, isMarkdownFile, join } from '../Paths/posix'
+import type { ContextDef } from '../Contexts/contexts'
 import type { Holders } from '../Index/keyHolders'
@@ imports @@
-import { spaceIdsIn } from '../Contexts/spaceSidecar'
-import { sidecarIdentity } from '../Files/sidecar'
+import { contextDirRel } from '../Paths/nexusPaths'
 import { exactTitle } from '../Paths/caseFold'
@@ imports @@
-import type { NexusTree } from '../Nexus/tree'
+import type { NexusTree, SpaceNode } from '../Nexus/tree'
+import { asStringArray } from '../Nexus/coerce'
 import type { Relation } from '../Platform/stores'
@@ gatherSpaceRecord @@
-export async function gatherSpaceRecord(
-  tree: NexusTree,
-  abs: string,
-  registry: Result<ContextsRegistry> | null,
-  held: Holders,
-): Promise<RecordFile | null> {
-  const { id, icon } = await sidecarIdentity(abs, 'space')
-  if (!id) return null
-  const contextTitle = basename(dirname(abs))
-  const def = registry?.ok
-    ? registry.value.contexts.find((c) => c.title === contextTitle)
-    : undefined
-  const group = def && contextWorldOf(tree.contexts).groupById.get(def.id)
-  const place =
-    group &&
-    placeOf(
-      group.spaces.map((s) => s.id),
-      id,
-    )
-  const members = rootsOf(held).map(([member]) => member)
+export function gatherSpaceRecord(tree: NexusTree, space: SpaceNode, held: Holders): RecordFile {
+  const group = contextWorldOf(tree.contexts).groupById.get(space.contextId)!
+  const place = placeOf(
+    group.spaces.map((s) => s.id),
+    space.id,
+  )
   return {
     entity: 'space',
-    id,
-    ...(icon ? { icon } : {}),
-    parent: def ? { kind: 'context', id: def.id } : { kind: 'unaddressable' },
+    id: space.id,
+    ...(space.icon ? { icon: space.icon } : {}),
+    parent: { kind: 'context', id: space.contextId },
     ...(place ? { place } : {}),
-    members,
+    members: rootsOf(held).map(([member]) => member),
     ...(partly(held) ? { partial: true as const } : {}),
   }
 }
 
-interface ContextEvidence {
-  entry: ContextDef
-  at: number
-  spaceIds: Map<string, string>
-  unresolved: boolean
-}
-
-export async function gatherContextEvidence(
-  abs: string,
-  entry: ContextDef,
-  at: number,
-): Promise<ContextEvidence> {
-  const { ids, unread: unresolved } = await spaceIdsIn(abs)
-  const spaceIds = new Map([...ids].map(([name, id]) => [exactTitle(name), id]))
-  return { entry: { ...entry }, at, spaceIds, unresolved }
-}
-
-export function buildContextRecord(evidence: ContextEvidence, held: Holders): RecordFile {
-  const key = contextKey(evidence.entry.title)
+export function gatherContextRecord(tree: NexusTree, entry: ContextDef, held: Holders): RecordFile {
+  const group = contextWorldOf(tree.contexts).groupById.get(entry.id)!
+  const spaceIds = new Map(group.spaces.map((s) => [exactTitle(s.title), s.id]))
+  const under = `${contextDirRel(entry.title)}/`
+  const unread = tree.unreadable?.some((u) => u.kind === 'space' && u.path.startsWith(under))
+  const key = contextKey(entry.title)
   const membership = rootsOf(held).map(([member, values]) => ({
     root: member,
     spaces: [
       ...new Map(
         scalarMembers(values[key]).map((title) => {
-          const id = evidence.spaceIds.get(exactTitle(title))
+          const id = spaceIds.get(exactTitle(title))
           return [id ?? title, id ? { id, title } : { title }]
         }),
       ).values(),
     ],
   }))
-  const partial = evidence.unresolved || partly(held)
+  const place = placeOf(
+    tree.contexts.map((g) => g.def.id),
+    entry.id,
+  )
+  const panel = placeOf(tree.config.order.contexts ?? [], entry.id)
+  const spaceOrder = asStringArray(tree.config.order.spaces[entry.id])
   return {
     entity: 'context',
-    registry: evidence.entry,
-    at: evidence.at,
+    registry: entry,
+    ...(place ? { place } : {}),
+    ...(panel ? { panel } : {}),
+    ...(spaceOrder?.length ? { spaceOrder } : {}),
     membership,
-    ...(partial ? { partial: true as const } : {}),
+    ...(unread || partly(held) ? { partial: true as const } : {}),
   }
 }
```

```Core/Bundles/record.ts diff
@@ imports @@
-import { dirname, join, relative } from '../Paths/posix'
+import { join, relDirname } from '../Paths/posix'
 import { z } from 'zod'
@@ imports @@
 import { readJsonObject, rmwJsonStrict, writeJson } from '../Files/atomicWrite'
-import { index } from '../Files/decoders'
-import { stampedIdOf } from '../Files/pageFile'
-import { sidecarIdentity } from '../Files/sidecar'
 import { contextEntry } from '../Contexts/contexts'
-import type { ContainerKind } from '../Nexus/entities'
-import type { NexusTree } from '../Nexus/tree'
+import type { CollectionNode, NexusTree, PageNode, SetNode } from '../Nexus/tree'
 import { containerAt, containerTrailById } from '../Nexus/treePatch'
@@ recordFile @@
   z.object({
     entity: z.literal('context'),
     registry: contextEntry,
-    at: index.optional(),
+    place,
+    /** Its place in the Property Panel's Context order, which moves apart from the registry's. */
+    panel: place,
+    spaceOrder: z.array(z.string()).optional(),
     membership: z.array(z.object({ root: memberRoot, spaces: z.array(spaceRef) })),
@@ identityOf @@
-/** A page's stamped id, or a container's sidecar id and icon. */
-export async function identityOf(
-  kind: 'page' | ContainerKind,
-  abs: string,
-): Promise<{ id?: string; icon?: string }> {
-  return kind === 'page'
-    ? { id: (await stampedIdOf(abs)) ?? undefined }
-    : sidecarIdentity(abs, kind)
-}
-
-export async function gatherContentRecord(
-  root: string,
-  tree: NexusTree,
-  kind: 'page' | ContainerKind,
-  abs: string,
-): Promise<RecordFile> {
-  const { id, icon } = await identityOf(kind, abs)
-  const atRoot = dirname(abs) === root
-  const container = atRoot ? null : containerAt(tree, relative(root, dirname(abs)))
+export function gatherContentRecord(
+  tree: NexusTree,
+  node: PageNode | CollectionNode | SetNode,
+): RecordFile {
+  const atRoot = node.kind === 'collection'
+  const container = atRoot ? null : containerAt(tree, relDirname(node.path))
   const siblings: readonly { id: string }[] | undefined = atRoot
     ? tree.collections
-    : kind === 'page'
+    : node.kind === 'page'
       ? container?.pages
       : container?.sets
-  const placed =
-    id && siblings
-      ? placeOf(
-          siblings.map((n) => n.id),
-          id,
-        )
-      : undefined
+  const placed =
+    siblings &&
+    placeOf(
+      siblings.map((n) => n.id),
+      node.id,
+    )
   const trail = container ? trailAbove(tree, container.id) : null
   return {
-    entity: kind,
-    ...(id ? { id } : {}),
-    ...(icon ? { icon } : {}),
+    entity: node.kind,
+    id: node.id,
+    ...(node.kind !== 'page' && node.icon ? { icon: node.icon } : {}),
     parent: atRoot
```

```Core/Bundles/bundle.ts diff
@@ imports @@
-import { sidecarId } from '../Files/sidecar'
+import { sidecarId, sidecarIdentity } from '../Files/sidecar'
@@ imports @@
-  identityOf,
@@ innerRecord @@
   const entity = isMarkdownFile(item) ? 'page' : 'set'
-  const { id, icon } = await identityOf(entity, item)
+  const { id, icon } =
+    entity === 'page'
+      ? { id: (await stampedIdOf(item)) ?? undefined, icon: undefined }
+      : await sidecarIdentity(item, 'set')
   return {
```

```Core/Archive/archive.ts diff
@@ imports @@
-import { owningCollection } from '../Nexus/treePatch'
+import { containerAt, owningCollection, pageAt } from '../Nexus/treePatch'
@@ filingOf @@
-  { kind, back }: Extract<MutateRequest, { op: 'archive' }>,
+  { kind, path, back }: Extract<MutateRequest, { op: 'archive' }>,
@@ filingOf @@
-  return { to: store, origin: abs, record: await gatherContentRecord(root, tree, kind, abs) }
+  const node = kind === 'page' ? pageAt(tree, path) : containerAt(tree, path)
+  return { to: store, origin: abs, record: gatherContentRecord(tree, node!) }
 }
```

`archiveOp` admits the path through `mutableTarget` against the same held tree (`archive.ts:37-40`), and `deleteOp` likewise, so each node lookup answers.

```Core/Trash/delete.ts diff
@@ imports @@
-import {
-  buildContextRecord,
-  gatherContextEvidence,
-  gatherLinkTargets,
-  gatherSpaceRecord,
-} from './gather'
+import { gatherContextRecord, gatherLinkTargets, gatherSpaceRecord } from './gather'
@@ deleteOp @@
-    const write = async (record: RecordFile | null): Promise<void> => {
-      if (record)
-        await writeRecord(bundle, { ...record, ...(Object.keys(targets).length ? { targets } : {}) })
-    }
+    const write = (record: RecordFile): Promise<void> =>
+      writeRecord(bundle, { ...record, ...(Object.keys(targets).length ? { targets } : {}) })
@@ deleteOp @@
     if (req.kind === 'space') {
-      const registry = await readRegistryStrict(root)
-      const space = spaceAt(before, rel)
-      if (!space) return fail('not-found', 'Unknown Space.')
+      const space = spaceAt(before, rel)!
       const query = {
@@ deleteOp @@
-      await write(
-        await gatherSpaceRecord(before, abs, registry, outside(await findHolders(root, query, 'values'))),
-      )
+      await write(gatherSpaceRecord(before, space, outside(await findHolders(root, query, 'values'))))
@@ deleteOp @@
-      const evidence = await gatherContextEvidence(abs, entry, at)
       const query = { keys: [contextKey(title)], reach: 'anywhere' as const }
-      await write(buildContextRecord(evidence, outside(await findHolders(root, query, 'values'))))
+      await write(
+        gatherContextRecord(before, entry, outside(await findHolders(root, query, 'values'))),
+      )
@@ deleteOp @@
     } else {
-      await write(from?.record ?? (await gatherContentRecord(root, before, req.kind, abs)))
+      const node = req.kind === 'page' ? pageAt(before, rel) : containerAt(before, rel)
+      await write(from?.record ?? gatherContentRecord(before, node!))
       // Keyed by the live item's id, or by its path for an archived one; noted before the move, so a delete cut short finishes its strip and views at the next open.
-      const id = (req.kind === 'page' ? pageAt(before, rel) : containerAt(before, rel))?.id ?? rel
+      const id = node?.id ?? rel
```

The Context arm keeps `at` for its own rollback (`delete.ts:190,201`) and its registry guard (`:192`), which reads a source other than the tree and can fire.

```Core/Nexus/reorder.ts diff
@@ imports @@
-import { containerAt, pageAt, spaceAt } from './treePatch'
+import { containerAt, contextAt, pageAt, spaceAt } from './treePatch'
@@ dropContextOrder @@
-/** A Context gone for good takes its panel id and its Space order with it. */
-export const dropContextOrder = (nexusRoot: string, contextId: string): StateOrderWrite =>
-  writeStateOrder(nexusRoot, (order) => {
-    const panel = withoutId(order, 'contexts', contextId)
-    const { [contextId]: dropped, ...spaces } = spacesOf(order)
-    if (dropped === undefined) return panel
-    return { ...(panel ?? order), spaces }
-  })
-
@@ dropDeparture @@
-/** A departing item leaves the order it sat in, its id read from `tree`, the tree from before it left. A Context keeps its panel id while bundled, as its restore returns to it. */
+/** A departing item leaves the order it sat in, its id read from `tree`, the tree from before it left; a Context takes its own Space order with it, which its record keeps. */
 export async function dropDeparture(
@@ dropDeparture @@
-    case 'context':
-      return
+    case 'context': {
+      const id = contextAt(tree, rel)?.def.id
+      if (id)
+        await writeStateOrder(root, (order) => {
+          const panel = withoutId(order, 'contexts', id)
+          const { [id]: dropped, ...spaces } = spacesOf(order)
+          return dropped === undefined ? panel : { ...(panel ?? order), spaces }
+        })
+      return
+    }
   }
 }
```

```Core/Bundles/placement.ts diff
@@ imports @@
-import { type Slot, spliceBeside } from '../Nexus/order'
-import { setChildOrder, setCollectionOrder, setSpaceOrder } from '../Nexus/reorder'
+import { spliceBeside } from '../Nexus/order'
+import {
+  setChildOrder,
+  setCollectionOrder,
+  setPanelContextOrder,
+  setSpaceOrder,
+} from '../Nexus/reorder'
@@ slotOf @@
-export function slotOf(
-  place: Place | undefined,
-  liveIds: readonly string[],
-): { anchor: string | null; where: Slot } {
-  if (place?.above && liveIds.includes(place.above)) return { anchor: place.above, where: 'above' }
-  if (place?.below && liveIds.includes(place.below)) return { anchor: place.below, where: 'below' }
-  return { anchor: null, where: place && !place.below ? 'first' : 'last' }
-}
+/** `ids` with `id` back between the neighbors `place` names: beside whichever still stands, else first or last as it sat. */
+export function placeAmong(ids: string[], id: string, place: Place | undefined): string[] {
+  if (place?.above && ids.includes(place.above)) return spliceBeside(ids, place.above, id, 'above')
+  if (place?.below && ids.includes(place.below)) return spliceBeside(ids, place.below, id, 'below')
+  return spliceBeside(ids, null, id, place && !place.below ? 'first' : 'last')
+}
@@ placeRecord @@
   const { order } = resolution
-  if (record.entity === 'context' || !record.id || !order)
-    return ok({ record, placement, landedAs })
-  const ids = order.siblings.map((n) => n.id)
-  const { anchor, where } = slotOf(record.place, ids)
-  const next = spliceBeside(ids, anchor, record.id, where)
-  return ok({ record, placement, landedAs, writeOrder: () => order.write(root, next) })
+  if (record.entity === 'context') {
+    const { id } = record.registry
+    const { panel, spaceOrder } = record
+    return ok({
+      record,
+      placement,
+      landedAs,
+      writeOrder: async () => {
+        if (panel)
+          await setPanelContextOrder(root, placeAmong(tree.config.order.contexts ?? [], id, panel))
+        if (spaceOrder) await setSpaceOrder(root, id, spaceOrder)
+      },
+    })
+  }
+  if (!record.id || !order) return ok({ record, placement, landedAs })
+  const next = placeAmong(
+    order.siblings.map((n) => n.id),
+    record.id,
+    record.place,
+  )
+  return ok({ record, placement, landedAs, writeOrder: () => order.write(root, next) })
 }
```

A Context's registry entry still lands ahead of its folder, since its identity lives there (`spend.ts:172`); its panel place and Space order follow the move through `writeOrder`, as every other kind's order does.

```Core/Trash/spend.ts diff
@@ imports @@
-import { dropContextOrder } from '../Nexus/reorder'
@@ imports @@
-import { NO_DESTINATION, placeRecord } from '../Bundles/placement'
+import { NO_DESTINATION, placeAmong, placeRecord } from '../Bundles/placement'
@@ emptyBundle @@
   await dropPageMetadata(root, pageIds)
-  if (record.entity === 'context') await dropContextOrder(root, record.registry.id)
   await spendBundle(root, opened.value)
@@ restoreTrashed @@
   if (record.entity === 'context') {
-    const committed = await mutateRegistryFile(
-      root,
-      withContextAt({ ...record.registry, title }, record.at),
-    )
+    const { id } = record.registry
+    const committed = await mutateRegistryFile(root, (cur) =>
+      withContextAt(
+        { ...record.registry, title },
+        placeAmong(
+          cur.contexts.map((c) => c.id),
+          id,
+          record.place,
+        ).indexOf(id),
+      )(cur),
+    )
     if (!committed.ok) return committed
   }
```

```Core/Trash/spend.test.ts diff
@@ describe 'a Context’s place' @@
-    it('a Context in the Trash keeps its order, and its restore returns to its sidebar place', async () => {
-      const r = await deleteProjects(nexusDeps)
-      expect(r.ok).toBe(true)
-      expect(await stateOrder()).toEqual(seeded)
-      const listed = r.ok ? r.value.bundled : undefined
-      expect(
-        (await settledMutate(root, { op: 'restore', bundlePath: listed!.bundlePath }, nexusDeps))
-          .ok,
-      ).toBe(true)
+    it('a Context’s delete takes its panel id and Space order into its record, and its restore returns it to its place in both orders', async () => {
+      const r = await deleteProjects()
+      if (!r.ok || !r.value.bundled) throw new Error('the delete did not trash')
+      const { bundlePath } = r.value.bundled
+      expect(await stateOrder()).toEqual({
+        spaces: { ctx_areas: ['sp-home'] },
+        contexts: ['ctx_areas'],
+      })
+      expect(await readRecord(join(root, bundlePath))).toMatchObject({
+        place: { above: 'ctx_zeta', below: 'ctx_areas' },
+        panel: { above: 'ctx_areas' },
+        spaceOrder: ['sp-sap', 'sp-pom'],
+      })
+      expect((await settledMutate(root, { op: 'restore', bundlePath })).ok).toBe(true)
       expect(await registryIds()).toEqual(['ctx_areas', 'ctx_projects', 'ctx_zeta'])
       const tree = await readNexus(root)
       expect(tree.contexts[1].spaces.map((sp) => sp.id)).toEqual(['sp-sap', 'sp-pom'])
       expect(tree.config.order.contexts).toEqual(['ctx_projects', 'ctx_areas'])
+      expect(await stateOrder()).toEqual(seeded)
     })
+
+    it('a Context returns beside the neighbor its record names, wherever that neighbor has moved', async () => {
+      const r = await deleteProjects()
+      if (!r.ok || !r.value.bundled) throw new Error('the delete did not trash')
+      await writeFile(
+        contextsRegistryFile(root),
+        JSON.stringify({
+          contexts: [
+            { id: 'ctx_zeta', title: 'Zeta' },
+            { id: 'ctx_areas', title: 'Areas' },
+          ],
+        }),
+      )
+      await refreshTree(root)
+      expect(
+        (await settledMutate(root, { op: 'restore', bundlePath: r.value.bundled.bundlePath })).ok,
+      ).toBe(true)
+      expect(await registryIds()).toEqual(['ctx_projects', 'ctx_zeta', 'ctx_areas'])
+    })
```

The second case discriminates the neighbor from the index: by `at`, the Context would land second, `['ctx_zeta', 'ctx_projects', 'ctx_areas']`. The restore's splice reads the registry inside its own write, so the hand-written registry is what it splices into.

```.claude/Features/NexusRecordPM.md diff
@@ :10 @@
-… A Context carries its registry entry and its place in the registry, plus the membership map its stripped key held, per swept root; …
+… A Context carries its registry entry and its own Space order, plus the membership map its stripped key held, per swept root; …
-… every record but a Context's or a property's carries the siblings it sat between in its origin's order (`place`); …
+… every record but a property's carries the siblings it sat between in its origin's order (`place`), a Context's in the registry's order and again in the Property Panel's (`panel`); …
@@ :14 @@
-… A Context re-enters the registry at the place it left before its folder moves, so a refused move rolls the entry back, and its Space order, kept in `state.json` while it sits in the Trash, applies again; …
+… A Context re-enters the registry between the neighbors it left before its folder moves, so a refused move rolls the entry back, and once it lands returns to its place in the Property Panel's order with its own Space order; …
@@ :16 @@
-… and removes the spent bundle, taking a Context's kept Space order with it; …
+… and removes the spent bundle; …
```

**VERIFY**

- [x] *"a Context returns beside the neighbor its record names, wherever that neighbor has moved"* and *"a Context's delete takes its panel id and Space order into its record, and its restore returns it to its place in both orders"* are green, and red against the code before this task.
- [x] *"a Context delete whose move fails keeps its order"* (`deleteReach.test.ts:608`) stays green: the delete's order drop runs only after its folder has moved.
- [x] The rewritten `reorder.test.ts` and `placement.test.ts` cases are green.
- [x] M-4 changes no behavior beyond a Space's icon, which the tree reads from `$icon` where the old sidecar read looked for `icon` (so `rows.test.ts`' Space fixture writes `$icon`), and the record-shape pins still pass unchanged: `spend.test.ts:164-208` (a Space's and a Context's records), `spend.test.ts:209-268` (`place` between neighbors, a Space's included), `deleteOrder.test.ts:148-216`, and `archive.test.ts:945-951`.
- [x] `git grep -nP "\bslotOf\b|dropContextOrder|identityOf\(entity|identityOf\(kind|ContextEvidence|gatherContextEvidence|buildContextRecord|record\.at\b" -- Core ':!Core/Interface/Sidebar'` prints nothing (the sidebar's drag model keeps a test-local `slotOf` of its own).
- [x] Run the gates.
- [x] Check for unnecessary code or mistakes.

#### Task 2-4

**TASK:** The rest of the residue leaves: a Trash restore always spends its bundle (L-5); `confirmDelete`'s caller-less `undoTo` goes (L-6); `ArchiveView` takes its Archive's id from the tree that proved its owner instead of falling back to a Set's id (L-7); and `returningNames` stops being exported for its unit tests (L-8), its three rules pinned through restores. L-6 lands here rather than with M-13, since the field has no caller and nothing in it waits on the Undo's reshape; `offerDeleted`'s own destination stays for `Core/Bundles/browser.ts:406`, which M-13 replaces.

**NOW:**
- **L-5:** `if (!unspent.length) await spendBundle(root, bundle)` (`Core/Trash/spend.ts:294-295`) keeps `_record.json` in a bundle whose artifact has moved out, a state nothing reads: `listBundles` skips an artifact-less bundle (`Core/Bundles/bundle.ts:165-166`), and the restore and the empty refuse one (`spend.ts:136-137,88-89`). `spend.test.ts:797-808,810-826` pin the kept file.
- **L-6:** `confirmDelete`'s `undoTo` and its `undoTo?: never` arm (`Core/Interface/Confirm/confirmations.ts:88-93`, after Task 2-1's comment edit) have no production caller (`entityMenuActions.ts:117`, `pageMenuActions.ts:70`, `PropertyFrame.tsx:246` pass none); `:108` forwards it; `confirmations.test.ts:275-283` pins it.
- **L-7:** `ArchiveView`'s `useSession((s) => owningCollection(s.tree, owner)?.id) ?? owner.id` (`Core/Archive/ArchiveView.tsx:30`) falls back only with no tree, and would then send a Set's id as an Archive id; its one caller, `Core/Interface/ContentView.tsx:92-95`, has just found the owner in the tree it holds.
- **L-8:** `returningNames` (`Core/Nexus/settle.ts:311-322`) has one production caller, `returningCascade` in the same file (`:342`), and is exported for `settle.test.ts:1298-1322` alone. Of that describe's three rules, two are already pinned through restores: an arrival re-spelling the live page it took a key from (`settle.test.ts:1383`, *"a restore's re-spell owes what it missed"*; `spend.test.ts:1277`), and a key the live world still resolves staying out of the cascade (`spend.test.ts:1247`, its `Third.md` untouched; `archive.test.ts:770`). A key only the returning page answered following it has no such case.

**CHANGE**

- [x] Rewrite `spend.test.ts:797-808` as *"a tag that can't go back is named, and the bundle is spent"* and `:810-826` as *"a tag neither of two pages claiming one id takes back is named, and the bundle is spent"*, each asserting `expect(await pathExists(join(root, listed.bundlePath))).toBe(false)` in place of the kept record, and watch both fail.
- [x] Write `settle.test.ts`'s *"a restore re-spells a key only its returning page answered"* in the describe *"a re-spell on the notes"*, before the export changes, and watch it fail with `returningCascade`'s `names` built from `respellings(live, after, [], ids)` alone.
- [x] Apply the AFTER.
- [x] Remove `confirmations.test.ts:275-283`, *"an Undo given a destination restores its bundle there"*.
- [x] Remove `settle.test.ts:1298-1322`, the describe *"returningNames"*, with `returningNames` from its import at `:31` and the `buildPageIndex, connPage` import at `:40`, which only it used.
- [x] `Core/Archive/ArchiveView.test.tsx:77` renders `<ArchiveView owner={owner} archiveId={collection.id} />`.
- [x] Apply the doc line under the AFTER.

**AFTER**

```Core/Trash/spend.ts diff
@@ restoreTrashed @@
-  // The record outlives a partial re-tag, so what didn't come back stays written down.
-  if (!unspent.length) await spendBundle(root, bundle)
+  await spendBundle(root, bundle)
   const left = originOf(stored)
```

```Core/Interface/Confirm/confirmations.ts diff
@@ confirmDelete @@
-/** A held item asks the Trash's question and a property its own, counting what holds it. `undoTo` returns a held item where the delete took it from rather than to its origin, and a property, which a restore lands only in the registry, takes none. */
+/** A held item asks the Trash's question and a property its own, counting what holds it. */
 export const confirmDelete = async (
-  target: { title: string } & (
-    | { path: string; kind: HeldKind; undoTo?: RestoreDestination }
-    | { propertyId: string; undoTo?: never }
-  ),
+  target: { title: string } & ({ path: string; kind: HeldKind } | { propertyId: string }),
 ): Promise<boolean> => {
@@ confirmDelete @@
   if (!done) return false
-  offerDeleted(target.title, done, target.undoTo)
+  offerDeleted(target.title, done)
   return true
```

```Core/Interface/ContentView.tsx diff
@@ imports @@
-import { topContainerOf } from '../Nexus/treePatch'
+import { owningCollection, topContainerOf } from '../Nexus/treePatch'
@@ case 'archive' @@
       const owner = topContainerOf(tree, target.id)
-      return owner ? <ArchiveView owner={owner} /> : <div className="detail interface-inset" />
+      return owner ? (
+        <ArchiveView owner={owner} archiveId={owningCollection(tree, owner)!.id} />
+      ) : (
+        <div className="detail interface-inset" />
+      )
```

```Core/Archive/ArchiveView.tsx diff
@@ imports @@
 import { containerOwner } from '../Nexus/treeIndex'
-import { owningCollection } from '../Nexus/treePatch'
 import { propertyTypeIconName } from '../Properties/typeDisplay'
@@ ArchiveView @@
-export function ArchiveView({ owner }: { owner: CollectionNode | SetNode }): React.JSX.Element {
+export function ArchiveView({
+  owner,
+  archiveId,
+}: {
+  owner: CollectionNode | SetNode
+  archiveId: string
+}): React.JSX.Element {
@@ ArchiveView @@
   const openReader = useSession((s) => s.openReader)
-  const archiveId = useSession((s) => owningCollection(s.tree, owner)?.id) ?? owner.id
   const open = (row: BundleRow): void => {
```

`owningCollection` answers a Collection with itself and a top-level Set by the Collection its path starts in (`Core/Nexus/treePatch.ts:110-119`), both held by the tree `topContainerOf` just found the owner in.

```Core/Nexus/settle.ts diff
@@ returningNames @@
-export function returningNames(
+function returningNames(
   live: PageIndex,
```

```Core/Nexus/settle.test.ts diff
@@ describe 'a re-spell on the notes' @@
+  it('a restore re-spells a key only its returning page answered', async () => {
+    await mkdir(abs('Notes', 'Deep'))
+    await writeFile(abs('Notes', 'Deep', '_pageset.json'), JSON.stringify({ id: 'set_deep' }))
+    await writeFile(abs('Notes', 'Deep', 'X.md'), `---\nID: ${ULID_D}\n---\n\nx\n`)
+    await writeFile(linker(), `---\nID: ${ULID_C}\n---\n\nSee [[Deep/X]].\n`)
+    await refreshTree(root)
+    const bundle = bundleOf(
+      await settledMutate(root, { op: 'delete', path: 'Notes/Deep/X.md', kind: 'page' }),
+    )
+    const moved = await settledMutate(root, {
+      op: 'rename',
+      path: 'Notes/Deep',
+      kind: 'set',
+      newName: 'Moved',
+    })
+    if (!moved.ok) throw new Error(moved.error.message)
+    expect(await readFile(linker(), 'utf8')).toContain('See [[Deep/X]].')
+    expect((await settledMutate(root, { op: 'restore', bundlePath: bundle })).ok).toBe(true)
+    expect(await pathExists(abs('Notes', 'Moved', 'X.md'))).toBe(true)
+    expect(await readFile(linker(), 'utf8')).not.toContain('[[Deep/X]]')
+  })
```

The Set's rename leaves the linker's key alone, since no page the index holds answered it; the restore lands `X` under the Set's new name, where only the returning page answers `Deep/X`, so the arrival carries the key to it.

```.claude/Features/NexusRecordPM.md diff
@@ :14 @@
-… membership re-applies by id against the as-restored folder names, and the record is removed once every page still present has its tag back, while the restore names any that didn't. …
+… membership re-applies by id against the as-restored folder names, and the restore names any page still present that didn't take its tag back. …
```

**VERIFY**

- [x] The two rewritten L-5 cases are green, and red with the `unspent` gate restored.
- [x] *"a restore re-spells a key only its returning page answered"* is green, and red with `returningCascade`'s `own`-into-`names` join removed.
- [x] `ArchiveView.test.tsx`'s Set-owner case (`:341`, listing `{ kind: 'archive', id: 'c1' }` within `s1`) passes.
- [x] `git grep -nP "undoTo\?|export function returningNames|\?\? owner\.id|outlives a partial re-tag" -- Core` prints only `offerDeleted`'s own `undoTo?` parameter (`confirmations.ts`), which Task 5-2 removes.
- [x] Run the gates.
- [x] Check for unnecessary code or mistakes.

#### Review Checkpoint

- [x] No branch, type, key, line of copy, or doc passage names a second delete mode, and `git grep -nP "TrashDeps|trashDeps|trashMode|TrashMode" -- Core Desktop .claude/Features` prints nothing.
- [x] Every delete mints a bundle in the Nexus's own Trash, and the system trash is reached only through `machine().trashToSystem`, by the empty and by `setAside`.
- [x] Every kind names its siblings through `place`, a Context in both of its orders, and no departed item's id sits in `state.json` once its delete's folder has moved.
- [x] The records a delete and an archive write are built from the tree, with no second read of a sidecar, the registry, or a page's id.
- [x] *Reconciliation (Phase 2)* is walked; the Net Ledger's Phase 2 row is filled from `view-delta`, additions and removals apart, and any drift past that row's estimate is reported in chat with what it buys.
- [x] Two read-only reviewers, one under `code-simplification` and one under `adversarial-review`, weigh the phase against *§Constraints* and Phase 3's starting point, reading outward; what holds is folded before Phase 3 opens.

---

### Phase 3 — Delete, Journal, and Carry

**GOAL:** Every delete gathers what it takes before anything exists, mints its bundle with its record in one step, and runs one tail: its note, its list step, one `leave` that moves the artifact and drops its departure, and its finish. A content delete's record holds the Link values its strip will take before the artifact moves, read from each holder as a Space's or Context's capture reads it, so a crash mid-strip loses nothing. The journal holds one container note and gives the Set move its own kind, the empty gives a Collection's Archive up before its artifact through the same write-ahead order the delete runs, and the Archive keeps every record current through one resolver and one carry. It's a phase of its own because it lands after Phase 2 removed every system branch (*Investigation · §Order Constraints*, 2), the mint lands before the tail (*§Order Constraints*, 4), and the links recorded ahead land before Phase 4's reach (*§Order Constraints*, 5).

**THE TREE:** HEAD plus Phases 1 and 2; every `-` line reads the code as Phase 2 leaves it, and line citations are HEAD's.

**M-18, Dropped:** its premise is false. `unassignInner`'s scoped pass (`Core/Properties/unassignProperty.ts:53`) runs `reachConfig` under the Collection's folder, which reaches every container `within` it, nested Sets included (`Core/Nexus/configReach.ts:329-338`), the Collection's own Archive's Set sidecars (`:339-347`, through `archivedSets`), and the tile docs sourcing any of them (`:347-359`); only the Collection's own sidecar is re-read and left as the list step wrote it. `unassignProperty.test.ts:349`, *"clears its own views in the one sidecar write, then its Set and the tile sourcing it"*, pins exactly that, and Decision D-3's scoped Trash reach (Phase 4, Task 4-4's `storedContainers`) rides the same pass. Nothing changes.

#### Task 3-1

**TASK:** One mint, one tail, one `leave` (M-1, M-2, M-8; closes B-1). `mintBundle` takes the record and takes its bundle back when the write throws; `deleteOp` gathers each kind's plan before it mints, so the Context guard refuses with nothing to take back, and one cleanup covers a refusal and a throw alike, a throw from the note's own `editNote` included. One `leave` moves the artifact into its bundle and drops its departure for the delete and for both finish arms, so a delete cut short and finished later leaves no id in `state.json`. **Departure (from M-8's "one step"):** the finish's `oweWalk` stays at the two finish arms, since a delete running it would owe a whole-Nexus walk on every delete. **Departure (from M-2's plan shape):** a plan carries `departing` beside `{ id, record, note, unlist, relist }`, the order entry its `leave` drops, since a Context's finish holds its id and no node (its registry entry is gone once its list step lands), which also makes `dropDeparture` read what each caller already holds instead of looking it up by path. **Comments:** the AFTER removes ten and adds eleven, `Departing`'s and `DeletePlan`'s docs the two new ones; the codebase stays below the BASELINE's count, Phases 1 and 2 having removed seven.

**NOW:**
- **Mint, Then Record:** every `mintBundle` caller writes a record right after it (`Core/Bundles/bundle.ts:64-79`): `deleteOp` (`Core/Trash/delete.ts:99`, its write at `:112-118`), `snapshot` (`Core/Properties/deleteProperty.ts:63-73`), `fileInto` (`bundle.ts:103-115`, which removes the bundle on a throw), and `seedPropertyBundle` (`Core/Testing/fixtures.ts:52-53`).
- **B-1:** `deleteOp` mints first (`delete.ts:99`), gathers `targets` and each arm's holders, then writes the record; a throw anywhere before the move, the note's own `editNote` (`Core/Nexus/owed.ts:256`) included, reaches the outer `catch` (`delete.ts:225-228`), which rolls the lift back and leaves the bundle. Only `unminted` (`:120-124`) removes it, for a refusal. The Context guard (`:192`) reads the registry, a source other than the tree, and returns after the mint without `unminted`. `archive.test.ts:227-242` drives a thrown record write and asserts only the lift.
- **The Arms:** three inline arms (`delete.ts:163-220`) each build a record, write it, and call `deleted` (`:141-161`), which wraps `runNoted` around `leave` (`:131-139`); `stripped` is always set by the arm that ran (`:162,186,204,219`). After Phase 2, `deleteNote` takes the bundle (`:63-74`), and the Space guard is gone.
- **Two `leave`s:** `deleteOp`'s relocates and drops the departure through `dropDeparture(root, before, kind, path)` (`Core/Nexus/reorder.ts:78-109`, by tree lookup), or spends the Archive bundle; the finish's (`Core/Nexus/finishOwed.ts:259-268` after Phase 2) relocates and owes a walk, dropping no departure. Phase 2 hands it on: a Context delete cut short and finished by `finishContext` leaves its panel id and Space order in `state.json`, and a Space's leaves its id in its Context's Space order. `dropDeparture`'s Context arm (Phase 2) looks the id up by title in `tree.contexts`, which the Context's list step has already emptied by the time its finish moves the folder.
- **`dropDeparture`'s Other Callers:** `archiveOp` (`Core/Archive/archive.ts:51`) and both moves (`Core/Nexus/move.ts:38,72`) hand it the tree and the path of a node each already holds.

**CHANGE**

- [ ] Write these and watch each fail:
  - **`bundle.test.ts`, in *"mintBundle"*, "a record that can't be written takes its bundle back":** `vi.spyOn(record, 'writeRecord').mockRejectedValueOnce(new Error('the write failed'))`, then `mintBundle(root, TRASH, p, {})` rejects and `readdir(join(root, '.trash', 'Notes', 'Daily'))` is `[]`. It fails at HEAD, where `mintBundle` writes no record.
  - **`archive.test.ts:227`, rewritten as "a Set delete whose record write throws leaves no bundle and puts the lifted folder back":** its assertions stay, and it adds `expect(await readdir(at('.trash', 'Notes'))).toEqual([])`. It fails today on the bundle the catch leaves.
  - **`deleteReach.test.ts`, in the Context describe beside `:652`, "a Context delete the registry no longer lists refuses with nothing minted":** after `refreshTree`, `putJson(contextsRegistryFile(root), { contexts: [] })`, then `del(AREAS, 'context')` refuses with *"Unknown Context."*, `pathExists(join(root, '.trash'))` is false, and `AREAS` still stands. It fails today on the minted bundle.
  - **`deleteReach.test.ts`, beside `:756`, "a page delete whose note throws leaves no bundle and deletes nothing":** `vi.spyOn(atomicWrite, 'updateNexusFile').mockRejectedValueOnce(new Error('the disk is gone'))`, then the delete of `Notes/Target.md` fails, the page stands, and `readdir(join(root, '.trash', 'Notes'))` is `[]`. It fails today on the bundle the outer catch leaves.
  - **`deleteReach.test.ts:652`, *"a crash between the note and the list step finishes the delete"*, retitled "…finishes the delete, its folder leaving every order it sat in":** before `finishOwed`, `setPanelContextOrder(root, ['ctx_areas', 'ctx_other'])` and `setSpaceOrder(root, 'ctx_areas', ['sp_work'])`; after it, the `state.json` order is `{ contexts: ['ctx_other'] }`. It fails today, the finish's `leave` dropping nothing.
  - **`deleteReach.test.ts`, beside it, "a Space delete cut short before its move leaves its Context's Space order once its finish moves it":** mint a bundle for `WORK` with `{}`, `setSpaceOrder(root, 'ctx_areas', ['sp_work', 'sp_home'])`, note `{ sp_work: { kind: 'space', contextId: 'ctx_areas', strip: ['Work'], bundle } }`, and `finishOwed(root)`; the folder sits in the bundle and the Space order is `['sp_home']`.
- [ ] Apply the AFTER.
- [ ] Every test call of `mintBundle` passes the record it wrote right after, and that `writeRecord` leaves: `bundle.test.ts:76-78`, `handlers.test.ts:55-57,87-93,147-149`, `archive.test.ts:722-727`, `spend.test.ts:1573-1579`. The calls that wrote none pass `{}`: `bundle.test.ts:39,51,52,63,72`, `atomicWrite.test.ts:367,376`, and `deleteReach.test.ts:660,813`.
- [ ] Phase 2's two `reorder.test.ts` Context cases call `dropDeparture(root, { kind: 'context', id: 'g1' })`, their expectations unchanged.
- [ ] Write `finishOwed.test.ts`' *"a Context delete whose order drop failed after its folder moved drops it at the finish"* (the delete's `dropDeparture` rejecting once; the finish leaves `state.json` holding neither the Context's panel id nor its Space order) and watch it fail without the finish arms' `else` drop.

**AFTER**

```Core/Bundles/bundle.ts diff
@@ mintBundle @@
-/** `leaf` asks for one bundle name back, tried only when the source could have been minted under it: one name ending in the source's own; a fresh stamp answers anything else, and a leaf something holds. */
+/** A bundle for `absSource` in `store` holding `record`, which takes its bundle back when it can't be written, so no bundle stands without one; `leaf` asks for one bundle name back, tried only when the source could have been minted under it: one name ending in the source's own; a fresh stamp answers anything else, and a leaf something holds. */
 export async function mintBundle(
   root: string,
   store: BundleStore,
   absSource: string,
+  record: RecordFile | RawRecord,
   leaf?: string,
 ): Promise<string> {
   const dir = await chainDir(root, store, absSource)
   const base = `${basename(absSource)}${layoutOf(store).suffix}`
   const own = leaf !== undefined && holdsName(leaf) && leaf.endsWith(`__${base}`)
-  if (own && (await machine().mkdir(join(dir, leaf))) === 'created') return join(dir, leaf)
   const stamp = fileStamp()
-  for (let n = 0; ; n++) {
-    const bundle = join(dir, stampedLeaf(stamp, n, base))
-    if ((await machine().mkdir(bundle)) === 'created') return bundle
-  }
+  let bundle = join(dir, own ? leaf : stampedLeaf(stamp, 0, base))
+  for (let n = own ? 0 : 1; (await machine().mkdir(bundle)) !== 'created'; n++)
+    bundle = join(dir, stampedLeaf(stamp, n, base))
+  try {
+    await writeRecord(bundle, record)
+  } catch (e) {
+    await removeOwn(bundle)
+    throw e
+  }
+  return bundle
 }
@@ fileInto @@
   const bundle = await mintBundle(
     root,
     to,
     origin,
+    record,
     held && !held.item ? basename(held.bundle) : undefined,
   )
   try {
-    await writeRecord(bundle, record)
     await relocate(artifact, join(bundle, basename(origin)))
   } catch (e) {
```

`fileInto`'s doc ("its record written ahead") stays true. The naming loop stays inside `mintBundle` rather than splitting into a helper of its own: the source's own leaf is tried first and the stamps after it in one loop, as `discardFile`'s naming loop runs, so one function and one docstring hold the mint.

```Core/Properties/deleteProperty.ts diff
@@ imports @@
 import { mintBundle } from '../Bundles/bundle'
-import { writeRecord } from '../Bundles/record'
@@ snapshot @@
-  const bundle = await mintBundle(root, { kind: 'trash' }, join(root, `property-${propertyId}`))
-  await writeRecord(bundle, {
+  return mintBundle(root, { kind: 'trash' }, join(root, `property-${propertyId}`), {
     entity: 'property',
@@
     ...(partial ? { partial: true as const } : {}),
   })
-  return bundle
 }
```

```Core/Testing/fixtures.ts diff
@@ imports @@
-import { type RecordFile, writeRecord } from '../Bundles/record'
+import type { RecordFile } from '../Bundles/record'
@@ seedPropertyBundle @@
-export async function seedPropertyBundle(
+export const seedPropertyBundle = (
   root: string,
   record: Extract<RecordFile, { entity: 'property' }>,
-): Promise<string> {
-  const bundle = await mintBundle(root, { kind: 'trash' }, join(root, `property-${record.id}`))
-  await writeRecord(bundle, record)
-  return bundle
-}
+): Promise<string> => mintBundle(root, { kind: 'trash' }, join(root, `property-${record.id}`), record)
```

```Core/Nexus/reorder.ts diff
@@ imports @@
-import { CONTAINER_KINDS, type HeldKind } from './entities'
-import type { NexusTree } from './tree'
-import { containerAt, contextAt, pageAt, spaceAt } from './treePatch'
+import { CONTAINER_KINDS } from './entities'
+import type { CollectionNode, PageNode, SetNode, SpaceNode } from './tree'
@@ dropDeparture @@
-/** A departing item leaves the order it sat in, its id read from `tree`, the tree from before it left; a Context takes its own Space order with it, which its record keeps. */
-export async function dropDeparture(
-  root: string,
-  tree: NexusTree,
-  kind: HeldKind,
-  rel: string,
-): Promise<void> {
-  switch (kind) {
-    case 'page':
-    case 'set': {
-      const id = (kind === 'page' ? pageAt(tree, rel) : containerAt(tree, rel))?.id
-      const key = kind === 'page' ? 'page_order' : 'set_order'
-      if (id) await dropFromChildOrder(dirname(join(root, rel)), key, id)
-      return
-    }
-    case 'collection': {
-      const id = containerAt(tree, rel)?.id
-      if (id) await writeStateOrder(root, (order) => withoutId(order, 'collections', id))
-      return
-    }
-    case 'space': {
-      const space = spaceAt(tree, rel)
-      if (space)
-        await writeStateOrder(root, (order) => {
-          const spaces = withoutId(spacesOf(order), space.contextId, space.id)
-          return spaces && { ...order, spaces }
-        })
-      return
-    }
-    case 'context': {
-      const id = contextAt(tree, rel)?.def.id
-      if (id)
-        await writeStateOrder(root, (order) => {
-          const panel = withoutId(order, 'contexts', id)
-          const { [id]: dropped, ...spaces } = spacesOf(order)
-          return dropped === undefined ? panel : { ...(panel ?? order), spaces }
-        })
-      return
-    }
-  }
-}
+/** What leaves an order: a node of the tree it left, or a Context by its id, since its finish may move its folder after its registry entry is gone. */
+export type Departing = PageNode | SetNode | CollectionNode | SpaceNode | { kind: 'context'; id: string }
+
+/** A departing item leaves the order it sat in; a Context takes its own Space order with it, which its record keeps. */
+export async function dropDeparture(root: string, item: Departing): Promise<void> {
+  switch (item.kind) {
+    case 'page':
+    case 'set':
+      await dropFromChildOrder(
+        dirname(join(root, item.path)),
+        item.kind === 'page' ? 'page_order' : 'set_order',
+        item.id,
+      )
+      return
+    case 'collection':
+      await writeStateOrder(root, (order) => withoutId(order, 'collections', item.id))
+      return
+    case 'space':
+      await writeStateOrder(root, (order) => {
+        const spaces = withoutId(spacesOf(order), item.contextId, item.id)
+        return spaces && { ...order, spaces }
+      })
+      return
+    case 'context':
+      await writeStateOrder(root, (order) => {
+        const panel = withoutId(order, 'contexts', item.id)
+        const { [item.id]: dropped, ...spaces } = spacesOf(order)
+        return dropped === undefined ? panel : { ...(panel ?? order), spaces }
+      })
+      return
+  }
+}
```

```Core/Nexus/finishOwed.ts diff
@@ imports @@
 import { inContextsTurn, inSettleTurn } from './settle'
+import { type Departing, dropDeparture } from './reorder'
 import { liveTreeOf, refreshTree } from './liveTree'
@@ leave @@
-/** A deleted Context's or Space's folder, where its delete's list step left it, into the bundle its delete noted. */
-const leave = async (root: string, abs: string, bundle: string): Promise<void> => {
-  await relocate(abs, join(root, bundle, basename(abs)))
-  oweWalk(root)
-}
+/** A deleted item into the bundle its delete noted, `bundle` root-relative, then out of the order it sat in. */
+export async function leave(
+  root: string,
+  abs: string,
+  bundle: string,
+  departing?: Departing,
+): Promise<void> {
+  await relocate(abs, join(root, bundle, basename(abs)))
+  if (departing) await dropDeparture(root, departing)
+}
@@ finishContext @@
       const dir = join(contextsDir(root), old)
-      if ((await heldName(dir)) === old) await leave(root, dir, e.bundle!)
+      if ((await heldName(dir)) === old) {
+        await leave(root, dir, e.bundle!, { kind: 'context', id })
+        oweWalk(root)
+      } else await dropDeparture(root, { kind: 'context', id })
       return unlinkContextKey(root, old, id, dir)
@@ finishSpace @@
-  if (deleted && (await heldName(join(root, space.path))) === space.title)
-    await leave(root, join(root, space.path), e.bundle!)
+  if (deleted && (await heldName(join(root, space.path))) === space.title) {
+    await leave(root, join(root, space.path), e.bundle!, space)
+    oweWalk(root)
+  } else if (deleted) await dropDeparture(root, space)
```

A finish whose folder has already left drops the departure all the same, since a delete whose order drop failed or was cut short after its move leaves no folder for `leave` to find, and `dropDeparture` writes nothing where the id is already gone.

`ContextEntry.bundle` and `SpaceEntry.bundle` stay optional: a rename's entry carries none (`finishSpace:342`, `contextCascade.ts`), so `bundle` is present exactly when `strip` is, and the two `!`s at the strip path assert that pairing.

```Core/Trash/delete.ts diff
@@ imports @@
 import { archivedSetIds, goneContainers, goneEdit } from '../Nexus/configReach'
 import { isArchived } from '../Paths/nexusPaths'
-import { pathExists, relocate, removeOwn } from '../Files/atomicWrite'
+import { pathExists, removeOwn } from '../Files/atomicWrite'
 import { findHolders, type Holders } from '../Index/keyHolders'
 import { contextKey } from '../Contexts/contexts'
-import { finishEntry } from '../Nexus/finishOwed'
+import { finishEntry, leave } from '../Nexus/finishOwed'
 import { distinct, type Entry, owedDelete, runNoted } from '../Nexus/owed'
@@
 import type { MutateContext } from '../Nexus/mutate'
-import { dropDeparture } from '../Nexus/reorder'
-import type { CascadeReport } from '../Nexus/cascade'
+import type { Departing } from '../Nexus/reorder'
 import type { MutateReply, MutateRequest } from '../Nexus/mutateRequest'
@@
-import { gatherContentRecord, type RecordFile, writeRecord } from '../Bundles/record'
+import { gatherContentRecord, type RecordFile } from '../Bundles/record'
@@ deleteNote @@
-/** A Context's or Space's delete note: every title it still owed and the current one leave, with the bundle a finish moves the folder into. */
-const deleteNote =
-  (
-    root: string,
-    kind: { kind: 'context' } | { kind: 'space'; contextId: string },
-    title: string,
-    bundle: string,
-  ) =>
-  (e: Entry | undefined): Entry => ({
-    ...kind,
-    strip: owedDelete(e ?? {}, title).strip,
-    bundle: relative(root, bundle),
-  })
+/** A Context's or Space's delete note: every title it still owed and the current one leave. */
+const deleteNote =
+  (kind: { kind: 'context' } | { kind: 'space'; contextId: string }, title: string) =>
+  (e: Entry | undefined): Entry => ({ ...kind, strip: owedDelete(e ?? {}, title).strip })
+
+/** What one kind's delete takes, gathered before anything is minted: the id its note is keyed by, its record, its note, the order entry its `leave` drops, and a Context's list step with the step that puts its entry back. */
+interface DeletePlan {
+  id: string
+  record: RecordFile
+  note: (e: Entry | undefined) => Entry
+  departing?: Departing
+  unlist?: () => Promise<Result<unknown>>
+  relist?: () => Promise<Result<unknown>>
+}
+
+async function planOf(
+  root: string,
+  req: Extract<MutateRequest, { op: 'delete' }>,
+  abs: string,
+  before: NexusTree,
+  from: { record: RecordFile; keys: string[]; edit: ConfigEdit | null } | undefined,
+  under: string[],
+): Promise<Result<DeletePlan>> {
+  const rel = relative(root, abs)
+  // What sits under the deleted folder leaves and comes back with it, so its files are neither members to restore nor holders to strip.
+  const outside = (h: Holders): Holders => ({
+    ...h,
+    held: h.held.filter((x) => !isAtOrUnder(x.file, abs)),
+  })
+  switch (req.kind) {
+    case 'space': {
+      const space = spaceAt(before, rel)!
+      const query = {
+        keys: [contextKey(basename(dirname(abs)))],
+        reach: 'anywhere' as const,
+        title: space.title,
+      }
+      const held = outside(await findHolders(root, query, 'values'))
+      return ok({
+        id: space.id,
+        record: gatherSpaceRecord(before, space, held),
+        note: deleteNote({ kind: 'space', contextId: space.contextId }, space.title),
+        departing: space,
+      })
+    }
+    case 'context': {
+      const registry = await readRegistryStrict(root)
+      if (!registry.ok) return registry
+      const title = basename(abs)
+      const at = registry.value.contexts.findIndex((c) => c.title === title)
+      const entry = registry.value.contexts[at]
+      if (!entry) return fail('not-found', 'Unknown Context.')
+      const query = { keys: [contextKey(title)], reach: 'anywhere' as const }
+      const held = outside(await findHolders(root, query, 'values'))
+      return ok({
+        id: entry.id,
+        record: gatherContextRecord(before, entry, held),
+        note: deleteNote({ kind: 'context' }, title),
+        departing: { kind: 'context', id: entry.id },
+        unlist: () => unlistContext(root, entry.id),
+        relist: () => mutateRegistryFile(root, withContextAt(entry, at)),
+      })
+    }
+    default: {
+      const node = req.kind === 'page' ? pageAt(before, rel) : containerAt(before, rel)
+      const edit = from ? from.edit : goneEdit(before, req.kind, req.path)
+      return ok({
+        // Keyed by the live item's id, or by its path for an archived one; noted before the move, so a delete cut short finishes its strip and views at the next open.
+        id: node?.id ?? rel,
+        record: from?.record ?? gatherContentRecord(before, node!),
+        note: () => ({
+          kind: 'container',
+          at: rel,
+          strip: distinct(from?.keys ?? under),
+          ...(edit ? { edit } : {}),
+        }),
+        departing: node ?? undefined,
+      })
+    }
+  }
+}
@@ deleteOp @@
 export async function deleteOp(
   { root }: MutateContext,
   req: Extract<MutateRequest, { op: 'delete' }>,
 ): Promise<MutateReply> {
   const archived = await fromArchive(root, req)
   if (archived && !archived.ok) return archived
   const from = archived?.value
   const resolved = from ? ok(from.abs) : await mutableTarget(root, req.path, [req.kind])
   if (!resolved.ok) return resolved
   const abs = resolved.value
   const rel = relative(root, abs)
   if (!(await pathExists(abs))) return fail('not-found', 'Nothing to delete.')
   const before = await liveTreeOf(root)
-  const contexts = req.kind === 'context' ? await readRegistryStrict(root) : null
-  if (contexts && !contexts.ok) return contexts
+  const under =
+    from?.under ?? pagesOf(before).flatMap((p) => (isAtOrUnder(p.path, rel) ? p.path : []))
+  const planned = await planOf(root, req, abs, before, from, under)
+  if (!planned.ok) return planned
+  const plan = planned.value
+  const targets = await gatherLinkTargets(root, before, rel, under)
   const lifted = !from && isContainer(req) ? await liftSetAside(root, abs) : null
   if (lifted && !lifted.ok) return lifted
-  let moved = false
+  let bundle: string | undefined
+  // Nothing is deleted while the artifact stands where it was, so a delete refused or thrown by then takes its bundle back and puts a lifted set-aside back.
+  const unmoved = async (): Promise<void> => {
+    if (!(await pathExists(abs))) return
+    if (bundle) await removeOwn(bundle)
+    await lifted?.value.rollback()
+  }
   try {
-    // Write-ahead: the record lands before anything moves, a Space's or Context's built from what its holders held up front, then its note; every strip runs after the artifact moves, so a failed move strips nothing, and a strip that misses a file leaves the note for Try Again.
-    const bundle = await mintBundle(root, { kind: 'trash' }, from?.origin ?? abs)
-    const edit = from ? from.edit : goneEdit(before, req.kind, req.path)
-    const under =
-      from?.under ?? pagesOf(before).flatMap((p) => (isAtOrUnder(p.path, rel) ? p.path : []))
-    const targets = await gatherLinkTargets(root, before, rel, under)
-    const write = (record: RecordFile): Promise<void> =>
-      writeRecord(bundle, { ...record, ...(Object.keys(targets).length ? { targets } : {}) })
-    // A refused note or list step leaves nothing deleted, so its bundle goes and a lifted set-aside comes back.
-    const unminted = async <R extends { ok: false }>(r: R): Promise<R> => {
-      await removeOwn(bundle)
-      await lifted?.value.rollback()
-      return r
-    }
-    // What sits under the deleted folder leaves and comes back with it, so its files are neither members to restore nor holders to strip.
-    const outside = (h: Holders): Holders => ({
-      ...h,
-      held: h.held.filter((x) => !isAtOrUnder(x.file, abs)),
-    })
-    // The artifact moves, then what leaves with it.
-    const leave = async (): Promise<void> => {
-      await relocate(abs, join(bundle, basename(abs)))
-      moved = true
-      if (from) await spendBundle(root, from.opened)
-      else await dropDeparture(root, before, req.kind, req.path)
-    }
-    // A delete in the one order: its note, its list step and the move, then the finish's own arm. A move that throws puts the list step back and refuses with nothing deleted; a Context entry that can't go back stays owed, and Try Again moves its folder.
-    const deleted = (
-      id: string,
-      note: (e: Entry | undefined) => Entry,
-      unlist = async (): Promise<Result<unknown>> => ok(null),
-      relist = unlist,
-    ) =>
-      runNoted(root, id, {
-        note,
-        list: async () => {
-          const unlisted = await unlist()
-          if (!unlisted.ok) return unlisted
-          return leave().then(
-            () => ok(true),
-            async (e) => {
-              if (moved) throw e
-              return (await relist()).ok ? fault(e) : ok(false)
-            },
-          )
-        },
-        sweep: async (left) => (left ? finishEntry(root, id) : { skipped: 1, hosts: [] }),
-      })
-    let stripped: CascadeReport | null = null
-    if (req.kind === 'space') {
-      const space = spaceAt(before, rel)!
-      const query = {
-        keys: [contextKey(basename(dirname(abs)))],
-        reach: 'anywhere' as const,
-        title: space.title,
-      }
-      await write(gatherSpaceRecord(before, space, outside(await findHolders(root, query, 'values'))))
-      const ran = await deleted(
-        space.id,
-        deleteNote(root, { kind: 'space', contextId: space.contextId }, space.title, bundle),
-      )
-      if (!ran.ok) return unminted(ran)
-      stripped = ran.value.cascade
-    } else if (req.kind === 'context') {
-      const registry = contexts!.value
-      const title = basename(abs)
-      const at = registry.contexts.findIndex((c) => c.title === title)
-      const entry = registry.contexts[at]
-      if (!entry) return fail('not-found', 'Unknown Context.')
-      const query = { keys: [contextKey(title)], reach: 'anywhere' as const }
-      await write(
-        gatherContextRecord(before, entry, outside(await findHolders(root, query, 'values'))),
-      )
-      const ran = await deleted(
-        entry.id,
-        deleteNote(root, { kind: 'context' }, title, bundle),
-        () => unlistContext(root, entry.id),
-        () => mutateRegistryFile(root, withContextAt(entry, at)),
-      )
-      if (!ran.ok) return unminted(ran)
-      stripped = ran.value.cascade
-    } else {
-      const node = req.kind === 'page' ? pageAt(before, rel) : containerAt(before, rel)
-      await write(from?.record ?? gatherContentRecord(before, node!))
-      // Keyed by the live item's id, or by its path for an archived one; noted before the move, so a delete cut short finishes its strip and views at the next open.
-      const id = node?.id ?? rel
-      const ran = await deleted(id, () => ({
-        kind: 'container',
-        at: rel,
-        strip: distinct(from?.keys ?? under),
-        ...(edit ? { edit } : {}),
-        bundle: relative(root, bundle),
-      }))
-      if (!ran.ok) return unminted(ran)
-      stripped = ran.value.cascade
-    }
-    return ok({
-      bundled: { bundlePath: relative(root, bundle) },
-      ...(stripped ? { cascade: stripped } : {}),
-    })
+    // Write-ahead: the record lands with its bundle, holding what every strip will take, then the note, then the list step and the move; every strip runs after the artifact moves, so a failed move strips nothing, and a strip that misses a file leaves the note for Try Again.
+    bundle = await mintBundle(root, { kind: 'trash' }, from?.origin ?? abs, {
+      ...plan.record,
+      ...(Object.keys(targets).length ? { targets } : {}),
+    })
+    const into = relative(root, bundle)
+    const ran = await runNoted(root, plan.id, {
+      note: (e) => ({ ...plan.note(e), bundle: into }),
+      // A move that throws puts the list step back and refuses with nothing deleted; a Context entry that can't go back stays owed, and Try Again moves its folder.
+      list: async () => {
+        const unlisted = (await plan.unlist?.()) ?? ok(null)
+        if (!unlisted.ok) return unlisted
+        try {
+          await leave(root, abs, into, plan.departing)
+        } catch (e) {
+          if (!(await pathExists(abs))) throw e
+          return ((await plan.relist?.()) ?? ok(null)).ok ? fault(e) : ok(false)
+        }
+        if (from) await spendBundle(root, from.opened)
+        return ok(true)
+      },
+      sweep: async (left) => (left ? finishEntry(root, plan.id) : { skipped: 1, hosts: [] }),
+    })
+    if (!ran.ok) await unmoved()
+    return ran.ok ? ok({ bundled: { bundlePath: into }, cascade: ran.value.cascade }) : ran
   } catch (e) {
-    if (!moved) await lifted?.value.rollback()
+    await unmoved()
     throw e
   }
 }
```

`NexusTree` joins the imports (`import type { NexusTree } from '../Nexus/tree'`), and `type ConfigEdit` joins the `../Nexus/configReach` import: `planOf` takes the three fields of `fromArchive`'s answer it reads, which `deleteOp` hands it whole, and `fromArchive` stays as it is. `departing` takes `node ?? undefined`, since `pageAt` and `containerAt` answer null for a path they don't hold (`Core/Nexus/treePatch.ts:162,168`), an archived item's. The Context's registry read moves into its own arm, ahead of the lift, which only a container takes. Whether the artifact still stands where it was decides the cleanup, as `moved` did: `relocate` is the only step that moves it, and a throw after it (the departure, the Archive bundle's spend) leaves the bundle holding the artifact.

```Core/Archive/archive.ts diff
@@ imports @@
-import type { NexusTree } from '../Nexus/tree'
+import type { CollectionNode, NexusTree, PageNode, SetNode } from '../Nexus/tree'
@@ archiveOp @@
   const store = archiveStoreOf(owningCollection(tree, req.path)?.id)
   if (!store)
     return fail('invalid-path', 'Only pages and Sets inside a Collection can be archived.')
-  const { to, origin, record, at } = await filingOf(root, tree, req, abs, store)
+  const node = (req.kind === 'page' ? pageAt(tree, req.path) : containerAt(tree, req.path))!
+  const { to, origin, record, at } = await filingOf(root, tree, req.back, node, abs, store)
@@
-  await dropDeparture(root, tree, req.kind, req.path)
+  await dropDeparture(root, node)
@@ filingOf @@
 async function filingOf(
   root: string,
   tree: NexusTree,
-  { kind, path, back }: Extract<MutateRequest, { op: 'archive' }>,
+  back: Extract<MutateRequest, { op: 'archive' }>['back'],
+  node: PageNode | CollectionNode | SetNode,
   abs: string,
   store: ArchiveStore,
 ): Promise<{ to: ArchiveStore; origin: string; record: RecordFile; at?: string }> {
@@
-  const node = kind === 'page' ? pageAt(tree, path) : containerAt(tree, path)
-  return { to: store, origin: abs, record: gatherContentRecord(tree, node!) }
+  return { to: store, origin: abs, record: gatherContentRecord(tree, node) }
 }
```

```Core/Nexus/move.ts diff
@@ movePageOp @@
   const r = await movePage(at.value.src, at.value.dst)
   if (!r.ok) return r
-  await dropDeparture(root, tree, 'page', req.path)
+  const page = pageAt(tree, req.path)
+  if (page) await dropDeparture(root, page)
@@ moveSetOp @@
-  const setId = containerAt(held, req.path)?.id
+  const set = containerAt(held, req.path)
+  const setId = set?.id
@@ move @@
-    await dropDeparture(root, held, 'set', req.path)
+    if (set) await dropDeparture(root, set)
```

(`pageAt` joins `move.ts`'s `./treePatch` import beside `containerAt` and `owningCollection`.)

**VERIFY**

- [ ] The six new and rewritten cases are green, and each was watched red against the code before this task.
- [ ] The write-ahead pins stay green: `deleteOrder.test.ts:148-257` (the record before the move and the strip, the strip and the pass after it), `deleteReach.test.ts:566-652` (a refused note or list step, a move that throws, a Context entry that can't go back), and `archive.test.ts:166-242,283` (the lift and its rollback, `fileInto`'s ghost bundle).
- [ ] `git grep -nP "unminted|let moved|const write =|dropDeparture\(root, (tree|held|before)," -- Core/Trash Core/Archive Core/Nexus/finishOwed.ts Core/Nexus/move.ts ':!*.test.ts'` prints nothing, `writeRecord(bundle` sits in `mintBundle` alone among production files, and `git grep -nP "mintBundle\([^)]*\)$" -- Core ':!*.test.ts'` shows every production call passing a record.
- [ ] Run the gates.
- [ ] Check for unnecessary code or mistakes.

#### Task 3-2

**TASK:** A content delete records the Link values its strip will take before the artifact moves (M-17; closes B-10), as a Space's or Context's delete records its holders' values, read through the same holder reader with the same index fallback. The strip's rule becomes one `linkStrip` in `Core/Nexus/cascade.ts` that the gatherer in `Core/Trash/gather.ts` (*§Placements*) and `deleteCascade` share; `deleteCascade` strips and reports and no longer reads what it took, so the finish's append for a delete leaves, with the post-sweep parse and `DeleteCascade.links` (Write Path's OP-4). The record's link edits become one pair beside `patchRecord` (M-5), and the record's arm types are named once there beside `ContentRecord`, where `bundle.ts` and `restoreProperty.ts` each declared their own and `fixtures.ts` spelled one inline. **Fold:** the empty gathers through the same `gatherLinks` and parks before its strip rather than after it, closing the empty's own crash window (a strip landed, its park not yet), so no strip anywhere reads what it took; `appendLinks` adds a link once, since a finish run again re-gathers what its strip missed. **Departure, Disclosed:** the Ledger's M-17 kept "the empty's parking reads the strip's links"; with the gatherer serving both, that read leaves too. **Comments:** the AFTER removes five and adds ten, the docs of `linkStrip`, `readHolders`, `gatherLinks`, and `appendLinks` and the park comment the new ones; the codebase stays at or below the BASELINE's count.

**NOW:**
- **B-10:** a content delete's record lands without `links` (`Core/Trash/delete.ts:114` at HEAD); `finishContainer` appends the strip's values afterward through `patchRecord` with a cast (`Core/Nexus/finishOwed.ts:403-407`). A crash after a strip group lands and before the patch loses the values, and Try Again finds nothing left to strip. `patchRecord` discards `rmwJsonStrict`'s `Result` (`Core/Bundles/record.ts:141`).
- **The Strip:** `deleteCascade` (`Core/Nexus/cascade.ts:93-166`) computes `gone` from `after`, the tree outside the deleted item plus every archived page (`:107-112`), sweeps, and re-parses each touched file to read what it took (`:140-148`). An archived item's own pages sit in `archived` at their origin paths until its artifact leaves the Archive, so a strip run ahead of a delete from the Archive would find them still answering their keys.
- **The Space and Context Captures:** `findHolders(…, 'values')` (`Core/Index/keyHolders.ts:79-136`) reads each file once, answers an unreadable page by the index's last read of it (`:113-121`), and leaves out a holder no id addresses.
- **The Record's Links, Three Ways:** `appendLinks` (`Core/Trash/trashedCopies.ts:18-21`), the finish's inline twin with a cast (`finishOwed.ts:404-407`), and `spendBundle`'s inverse filter (`Core/Bundles/bundle.ts:373-381`). `keptLinksUnder`'s doc reasons from a finish's later append (`bundle.ts:275`).
- **The Empty's Park:** the finish parks the strip's links after the strip, for an entry with `park` set (`finishOwed.ts:408`).

**CHANGE**

- [ ] Write these and watch each fail:
  - **`deleteOrder.test.ts:159`, rewritten from "a content delete records whole, and the links its strip takes join the record" to "a content delete records the Link values its strip takes before the artifact moves" (B-10):** `expect(atSettle).toMatchObject({ entity: 'page', links: [{ page: PAGE_B, property: 'prop_related', value: '[[Alpha]]' }] })` and `expect(await anyRecord()).toEqual(atSettle)`, the finish writing nothing more.
  - **`deleteOrder.test.ts:203`, *"a delete from the Archive records, with the bundle it left, before the artifact moves"*,** gains `links: [{ page: PAGE_B, property: 'prop_related', value: '[[Alpha]]' }]` in its `atSettle` match. It fails without `linkStrip`'s filter on archived rows, the archived Alpha still answering its key.
  - **`deleteReach.test.ts:756`, *"a page delete that misses a linker owes it with Try Again"*,** opens with `installStores(memoryStores().stores)` and `seedContentIndex(root)`, as `:625` does, and asserts the linker's value in the bundle's `links` right after the delete, before `finishOwed`; after it, the linker is stripped and `links.filter((l) => l.page === linkerId)` has length 1.
  - **`trashRecovery.test.ts`, beside `:749`, "an emptying parks a value its strip takes before the strip lands":** the setup of `:749`, with `vi.spyOn(cascade, 'deleteCascade')` reading the Plain namesake's record at the call; that record already holds Beta's `[[Alpha]]`. It fails today, the park following the strip.
  - **`bundle.test.ts`, in *"spendBundle"*, "appendLinks adds each link once":** a record holding `P_LINK`, then `appendLinks(inBundle(), [P_LINK, Q_LINK])` leaves `[P_LINK, Q_LINK]`.
- [ ] Apply the AFTER.
- [ ] `cascade.test.ts`'s describe *"deleteCascade"* (`:480-948`): each case reading `r.links` reads `await gatherLinks(root, <its abs>, <its paths>)` taken before its `deleteCascade` call instead, and each `toEqual({ reach: …, links: … })` compares the reach alone (`:641,700`).
- [ ] `bundle.test.ts:345` is retitled "strips exactly the inner item’s carried values from the bundle’s record, keeping every other value it holds", its body unchanged.
- [ ] Apply the doc line under the AFTER.

**AFTER**

```Core/Nexus/cascade.ts diff
@@ imports @@
-import { splitEnvelope, mergeFrontmatter, sweepParse } from '../Files/pageFile'
+import { splitEnvelope, mergeFrontmatter } from '../Files/pageFile'
@@
-import { gonePageEntry, governedRoot } from './governedRoot'
+import { gonePageEntry } from './governedRoot'
@@
-import { type ConfigReach, reachReport } from './configReach'
+import { type ConfigReach, NO_REACH, reachReport } from './configReach'
@@ DeleteCascade @@
 export type StrippedLink = z.infer<typeof strippedLink>
-
-interface DeleteCascade {
-  reach: ConfigReach
-  links: StrippedLink[]
-}
-
-const NO_STRIP: DeleteCascade = { reach: { skipped: 0, hosts: [] }, links: [] }
@@ deleteCascade @@
-/** A delete strips every Link property value naming a page it took, by any key that now resolves to nothing, from the governed pages outside it, archived ones among them, and from every Space; a key a page the tree holds outside it still answers is left to that page, and bodies keep their links and read unresolved. A linker with no ID, or one of two files claiming one, keeps its value, since no restore could put it back. Nothing at or under `abs` is swept, since it left with the delete. */
-export async function deleteCascade(
-  root: string,
-  abs: string,
-  paths: readonly string[],
-): Promise<DeleteCascade> {
+/** What a delete's strip takes: every Link property value naming a page it took, by any key that now resolves to nothing, in the governed pages outside it, archived ones among them, and in every Space; a key a page the tree holds outside it still answers is left to that page, and bodies keep their links and read unresolved. `files` are its holders, `named` what one root holds of it under the Link `keys`, and `byId` what addresses each holder; null when nothing names a page it took. Nothing at or under `abs` is reached, since it left with the delete. */
+export async function linkStrip(root: string, abs: string, paths: readonly string[]) {
   const deleted = relative(root, abs)
   const inside = (rel: string): boolean => isAtOrUnder(rel, deleted)
   const tree = heldTreeOf(root)
-  if (!tree) return NO_STRIP
+  if (!tree) return null
   const defs = byKey(linkDefsOf(tree.config.registry))
-  if (!defs.size) return NO_STRIP
-  try {
-    // The held tree may still list the deleted pages, since its patch can fall to a walk, so they're left out by path.
-    const { byId, archived } = await nexusPages(root, tree)
-    const after = buildPageIndex([...pagesOf(tree).filter((p) => !inside(p.path)), ...archived])
-    const gone = new Set(
-      paths.flatMap(pathKeys).filter((k) => after.resolve(k).status === 'phantom'),
-    )
-    if (!gone.size) return NO_STRIP
-    const goneEntry = (value: unknown): string | null =>
-      gonePageEntry(value, { holds: (t) => !gone.has(pageKey(t)) })
-    const named = (raw: Record<string, unknown>) =>
-      Object.entries(raw).flatMap(([key, held]) => {
-        const def = defs.get(key)
-        const value = def && goneEntry(held)
-        return def && value ? [{ key, def, value }] : []
-      })
-    const strip: Rewrite = (raw) =>
-      stripKeys(
-        raw,
-        named(raw).map(({ key }) => key),
-      )
-    const files = [
-      ...(await pagesInReach(root, tree, queryMentions([...gone]), 'governed')),
-      ...spaceFiles(root, tree, (s) => !!s.values && strip(s.values, '') !== null),
-    ].filter((file) => !inside(relative(root, file)))
-    let heldOut = 0
-    const swept = await sweepGovernedRoots(files, {
-      raw: (raw, file) => {
-        if (named(raw).length && !addressable(byId, rootId(file, raw))) {
-          heldOut++
-          return null
-        }
-        return strip(raw, file)
-      },
-    })
-    const links: StrippedLink[] = []
-    for (const [file, { before }] of swept.touched) {
-      const page = isMarkdownFile(file) ? sweepParse(before) : null
-      const raw = page?.raw ?? governedRoot(file, before)
-      const id = rootId(file, raw)
-      if (!id) continue
-      for (const { def, key, value } of named(raw))
-        links.push({ page: id, property: def.id, value, above: page?.above(key) })
-    }
-    const unswept = swept.skipped.length + heldOut
-    return {
-      reach: {
-        skipped: unswept,
-        refused: swept.refused,
-        hosts: [],
-        pages: [...swept.touched.keys()]
-          .filter((file) => outsideArchive(root, file))
-          .map((file) => relative(root, file)),
-      },
-      links,
-    }
+  if (!defs.size) return null
+  // The held tree may still list the deleted pages, since its patch can fall to a walk, and the index an archived one's rows until its artifact leaves the Archive, so each is left out by where it's held.
+  const { byId, archived } = await nexusPages(root, tree)
+  const after = buildPageIndex(
+    [...pagesOf(tree), ...archived].filter((p) => !inside(byId.get(p.id)?.path ?? p.path)),
+  )
+  const gone = new Set(paths.flatMap(pathKeys).filter((k) => after.resolve(k).status === 'phantom'))
+  if (!gone.size) return null
+  const goneEntry = (value: unknown): string | null =>
+    gonePageEntry(value, { holds: (t) => !gone.has(pageKey(t)) })
+  const named = (raw: Record<string, unknown>) =>
+    Object.entries(raw).flatMap(([key, held]) => {
+      const def = defs.get(key)
+      const value = def && goneEntry(held)
+      return def && value ? [{ key, def, value }] : []
+    })
+  const files = [
+    ...(await pagesInReach(root, tree, queryMentions([...gone]), 'governed')),
+    ...spaceFiles(root, tree, (s) => !!s.values && named(s.values).length > 0),
+  ].filter((file) => !inside(relative(root, file)))
+  return { files, keys: [...defs.keys()], byId, named }
+}
+
+/** A delete's strip of what `linkStrip` takes; a linker with no ID, or one of two files claiming one, keeps its value, since no restore could put it back. */
+export async function deleteCascade(
+  root: string,
+  abs: string,
+  paths: readonly string[],
+): Promise<ConfigReach> {
+  try {
+    const strip = await linkStrip(root, abs, paths)
+    if (!strip) return NO_REACH
+    let heldOut = 0
+    const swept = await sweepGovernedRoots(strip.files, {
+      raw: (raw, file) => {
+        const named = strip.named(raw)
+        if (named.length && !addressable(strip.byId, rootId(file, raw))) {
+          heldOut++
+          return null
+        }
+        return stripKeys(
+          raw,
+          named.map(({ key }) => key),
+        )
+      },
+    })
+    return {
+      skipped: swept.skipped.length + heldOut,
+      refused: swept.refused,
+      hosts: [],
+      pages: [...swept.touched.keys()]
+        .filter((file) => outsideArchive(root, file))
+        .map((file) => relative(root, file)),
+    }
   } catch (e) {
     // A strip that stopped counts as one missed file, so its entry stays owed.
     console.error('links weren’t removed:', errText(e))
-    return { reach: { skipped: 1, hosts: [] }, links: [] }
+    return { skipped: 1, hosts: [] }
   }
 }
```

`Rewrite` stays in `cascade.ts`'s `./governedSweep` import, which `renameCascade` reads. `deleteCascade`'s exclusion of the deleted item's own archived rows is new behavior only for the gather, which runs before the artifact leaves; once it has, the index holds no such row.

```Core/Index/keyHolders.ts diff
@@ imports @@
-import { addressable, nexusPages } from '../Nexus/heldPages'
+import { addressable, type NexusPages, nexusPages } from '../Nexus/heldPages'
@@ findHolders @@
~/** The pages and Spaces holding any of `keys`: … and an archived page, which no clash counts, isn't read. */
 export async function findHolders(root: string, q: HolderQuery, read?: 'values'): Promise<Holders> {
@@
   const files = [...pages, ...spaces]
   if (!read) return { files, held: [] }
-  const { byId } = await nexusPages(root, tree)
+  return readHolders(root, files, q.keys, (await nexusPages(root, tree)).byId, listed)
+}
+
+/** Each of `files` read once: `held` lists each one holding any of `keys`, or that couldn't be read, with the keys `listed`, the index's members of each key in turn, last read it holding, and `files` leaves out a holder no id addresses, which a strip passes over since no restore could put its value back. */
+export async function readHolders(
+  root: string,
+  files: readonly string[],
+  keys: readonly string[],
+  byId: NexusPages['byId'],
+  listed: readonly (ReadonlySet<string> | null)[] = [],
+): Promise<Holders> {
   const held: Held[] = []
   const heldOut = new Set<string>()
   for (const file of files) {
@@
-    const keys = q.keys.filter((k, i) => (raw ? Object.hasOwn(raw, k) : !!listed[i]?.has(rel)))
-    if (raw && !keys.length) continue
+    const holding = keys.filter((k, i) => (raw ? Object.hasOwn(raw, k) : !!listed[i]?.has(rel)))
+    if (raw && !holding.length) continue
     const id = raw ? rootId(file, raw) : undefined
     const addressed = addressable(byId, id) ? id : null
     if (raw && addressed === null) heldOut.add(file)
     held.push({
       file,
       id: addressed,
-      keys,
-      values: raw && Object.fromEntries(keys.map((k) => [k, raw[k]])),
-      above: Object.fromEntries(keys.map((k) => [k, page?.above(k)])),
+      keys: holding,
+      values: raw && Object.fromEntries(holding.map((k) => [k, raw[k]])),
+      above: Object.fromEntries(holding.map((k) => [k, page?.above(k)])),
     })
   }
   return { files: files.filter((file) => !heldOut.has(file)), held }
 }
```

`findHolders`' docstring (Task 1-5's) loses its last sentence, "With `read`, each file is read once: …", which `readHolders`' carries; `listed` is the Sets Task 1-5 builds ahead of the pass-over.

```Core/Trash/gather.ts diff
@@ imports @@
-import type { Holders } from '../Index/keyHolders'
+import { type Holders, readHolders } from '../Index/keyHolders'
+import { linkStrip, type StrippedLink } from '../Nexus/cascade'
@@ gatherLinkTargets @@
   return Object.fromEntries(out)
 }
+
+/** The Link values a delete's strip will take, read from each holder as a Space's or Context's capture reads it, so they're written down before anything is stripped. */
+export async function gatherLinks(
+  root: string,
+  abs: string,
+  paths: readonly string[],
+): Promise<StrippedLink[]> {
+  const strip = await linkStrip(root, abs, paths)
+  if (!strip) return []
+  const { held } = await readHolders(root, strip.files, strip.keys, strip.byId)
+  return held.flatMap(({ id, values, above }) =>
+    id && values
+      ? strip.named(values).map(({ key, def, value }) => ({
+          page: id,
+          property: def.id,
+          value,
+          above: above[key],
+        }))
+      : [],
+  )
+}
```

```Core/Bundles/record.ts diff
@@ imports @@
-import type { CascadeReport } from '../Nexus/cascade'
+import type { CascadeReport, StrippedLink } from '../Nexus/cascade'
+import { isPlainObject } from '../Contract/validators'
@@ RecordFile @@
 export type RecordFile = z.infer<typeof recordFile>
+export type ContentRecord = Extract<RecordFile, { entity: 'page' | 'collection' | 'set' }>
+export type ContainerRecord = Extract<RecordFile, { entity: 'collection' | 'set' }>
+export type InnerRecord = Extract<RecordFile, { entity: 'page' | 'set' }>
+export type PropertyRecord = Extract<RecordFile, { entity: 'property' }>
@@ patchRecord @@
   await rmwJsonStrict(join(bundleDir, RECORD_FILENAME), (raw) => ({ ...raw, ...patch(raw) }))
 }
+
+const sameLink = (a: StrippedLink, b: unknown): boolean =>
+  isPlainObject(b) && a.page === b.page && a.property === b.property && a.value === b.value
+
+const patchLinks = (bundleDir: string, edit: (held: unknown[]) => unknown[]): Promise<void> =>
+  patchRecord(bundleDir, (raw) => {
+    const links = edit(Array.isArray(raw.links) ? raw.links : [])
+    return { links: links.length ? links : undefined }
+  })
+
+/** Each of `links` the record doesn't already hold joins its `links`, so a finish run again over what its strip missed parks nothing twice. */
+export const appendLinks = (bundleDir: string, links: readonly StrippedLink[]): Promise<void> =>
+  patchLinks(bundleDir, (held) => [
+    ...held,
+    ...links.filter((l) => !held.some((h) => sameLink(l, h))),
+  ])
+
+export const removeLinks = (bundleDir: string, links: readonly StrippedLink[]): Promise<void> =>
+  patchLinks(bundleDir, (held) => held.filter((h) => !links.some((l) => sameLink(l, h))))
@@ gatherContentRecord @@
 export function gatherContentRecord(
   tree: NexusTree,
   node: PageNode | CollectionNode | SetNode,
-): RecordFile {
+): ContentRecord {
```

```Core/Trash/trashedCopies.ts diff
@@ imports @@
-import { collectionOf, originOf, patchRecord } from '../Bundles/record'
+import { appendLinks, collectionOf, originOf } from '../Bundles/record'
@@ appendLinks @@
-const appendLinks = (bundleDir: string, links: StrippedLink[]): Promise<void> =>
-  patchRecord(bundleDir, (raw) => ({
-    links: [...(Array.isArray(raw.links) ? raw.links : []), ...links],
-  }))
 /** A world a value is read against: … */
```

```Core/Bundles/bundle.ts diff
@@ imports @@
-import { isPlainObject } from '../Contract/validators'
@@ imports @@
 import {
+  type ContainerRecord,
+  type InnerRecord,
   originOf,
@@ imports @@
   type RawRecord,
-  patchRecord,
   type RecordFile,
   readRawRecord,
   readRecord,
+  removeLinks,
   trailAbove,
   writeRecord,
 } from './record'
@@ ContainerRecord, InnerRecord @@
-type ContainerRecord = Extract<RecordFile, { entity: 'collection' | 'set' }>
-
 const isContainerRecord = (record: RecordFile): record is ContainerRecord =>
   isContainerKind(record.entity)
 
-type InnerRecord = Extract<RecordFile, { entity: 'page' | 'set' }>
-
 /** An address read once: …
@@ keptLinksUnder @@
-/** The Link values the bundle keeps whose page, resolved over the bundle's own pages where they lived, lies at or under `item`, read from the record as it stands at the op, so a value its delete's finish appends later stays with the bundle; a title two of its pages share stays with the bundle. */
+/** The Link values the bundle keeps whose page, resolved over the bundle's own pages where they lived, lies at or under `item`; a title two of its pages share stays with the bundle. */
@@ spendBundle @@
   if (!inner) return void (await removeOwn(abs))
   const gone = 'links' in record ? (record.links ?? []) : []
-  const same = (l: unknown): boolean =>
-    isPlainObject(l) &&
-    gone.some((g) => g.page === l.page && g.property === l.property && g.value === l.value)
-  if (gone.length)
-    await patchRecord(abs, (raw) => {
-      const links = (Array.isArray(raw.links) ? raw.links : []).filter((l) => !same(l))
-      return { links: links.length ? links : undefined }
-    })
+  if (gone.length) await removeLinks(abs, gone)
   const bundle = relative(root, abs)
```

(`spendBundle`'s filter was `isPlainObject`'s one reader in `bundle.ts`.)

```Core/Trash/restoreProperty.ts diff
@@ imports @@
-import { type RecordFile, recordedPartly } from '../Bundles/record'
+import { type PropertyRecord, recordedPartly } from '../Bundles/record'
@@ PropertyRecord @@
-type PropertyRecord = Extract<RecordFile, { entity: 'property' }>
-
 /** A property restore's answer, …
```

```Core/Testing/fixtures.ts diff
@@ imports @@
-import type { RecordFile } from '../Bundles/record'
+import type { PropertyRecord } from '../Bundles/record'
@@ seedPropertyBundle @@
-export const seedPropertyBundle = (
-  root: string,
-  record: Extract<RecordFile, { entity: 'property' }>,
-): Promise<string> => mintBundle(root, { kind: 'trash' }, join(root, `property-${record.id}`), record)
+export const seedPropertyBundle = (root: string, record: PropertyRecord): Promise<string> =>
+  mintBundle(root, { kind: 'trash' }, join(root, `property-${record.id}`), record)
```

(The record's arms are named once, beside `ContentRecord`: `bundle.ts`' two private arm types, `restoreProperty.ts`' own, and the fixture's inline spelling read them from `record.ts`.)

```Core/Trash/delete.ts diff
@@ imports @@
-import { gatherContextRecord, gatherLinkTargets, gatherSpaceRecord } from './gather'
-import { gatherContentRecord, type RecordFile } from '../Bundles/record'
+import { gatherContextRecord, gatherLinks, gatherLinkTargets, gatherSpaceRecord } from './gather'
+import { type ContentRecord, gatherContentRecord, type RecordFile } from '../Bundles/record'
@@ planOf @@
~  from: { record: ContentRecord; keys: string[]; edit: ConfigEdit | null } | undefined,
@@ planOf @@
     default: {
       const node = req.kind === 'page' ? pageAt(before, rel) : containerAt(before, rel)
+      const strip = from?.keys ?? under
       const edit = from ? from.edit : goneEdit(before, req.kind, req.path)
+      const record = from?.record ?? gatherContentRecord(before, node!)
+      const links = await gatherLinks(root, abs, strip)
       return ok({
         // Keyed by the live item's id, or by its path for an archived one; noted before the move, so a delete cut short finishes its strip and views at the next open.
         id: node?.id ?? rel,
-        record: from?.record ?? gatherContentRecord(before, node!),
+        record: links.length ? { ...record, links } : record,
         note: () => ({
           kind: 'container',
           at: rel,
-          strip: distinct(from?.keys ?? under),
+          strip: distinct(strip),
           ...(edit ? { edit } : {}),
         }),
```

```Core/Nexus/finishOwed.ts diff
@@ imports @@
-import { type CascadeReport, deleteCascade, relinkReach, type StrippedLink } from './cascade'
-import { patchRecord } from '../Bundles/record'
+import { type CascadeReport, deleteCascade, relinkReach } from './cascade'
 import { parkLinks } from '../Trash/trashedCopies'
+import { gatherLinks } from '../Trash/gather'
@@ finishContainer @@
   const edit = await owedEdit()
-  const gone = e.strip && !back ? await deleteCascade(root, join(root, e.at), e.strip) : null
-  if (gone?.links.length) {
-    if (e.bundle)
-      await patchRecord(join(root, e.bundle), (raw) => ({
-        links: [...((raw.links as StrippedLink[] | undefined) ?? []), ...gone.links],
-      }))
-    else if (e.park) await parkLinks(root, gone.links)
-  }
-  const stripped = !!gone && add(reach, gone.reach)
+  const strip = back ? undefined : e.strip
+  // An emptying's links park, before its strip takes them, with a trashed page that still answers them; a delete's are in its record already.
+  if (strip && e.park) await parkLinks(root, await gatherLinks(root, join(root, e.at), strip))
+  const stripped = !!strip && add(reach, await deleteCascade(root, join(root, e.at), strip))
   const viewed =
```

```Core/Nexus/owed.ts diff
@@ ContainerEntry @@
-/** A page, Collection, or Set delete, a Trash emptying, or a Set move: `strip` holds the gone pages' paths, whose links leave the files outside `at`, and `edit` the views it still owes, reached under `within`; the links a finish strips go into `bundle`'s record, or are parked where `park` says the Trash entry is gone. */
+/** A page, Collection, or Set delete, a Trash emptying, or a Set move: `strip` holds the gone pages' paths, whose links leave the files outside `at`, and `edit` the views it still owes, reached under `within`; a delete's `bundle` holds its record, and the links an emptying's strip takes are parked where `park` says the Trash entry is gone. */
```

```.claude/Features/NexusRecordPM.md diff
@@ :12 @@
-… in one sweep over the files the index relates to those titles and the Spaces the tree shows naming them; a file it can't write, …
+… in one sweep over the files the index relates to those titles and the Spaces the tree shows naming them, its record holding each value the sweep takes from before the artifact moves, read as a Space's or Context's capture reads its holders; a file it can't write, …
```

**VERIFY**

- [ ] The five new and rewritten cases are green, each watched red against the code before this task.
- [ ] The parking cases hold: `trashRecovery.test.ts:462-791` (a link parks with the one trashed page its title names, a namesake's record handed on, a new namesake keeping its value), and the strip's cases in `cascade.test.ts:480-948` under their reworded reads.
- [ ] `deleteOrder.test.ts`'s `deleteCascade` wrapper (`:59-66`) sees the strip alone: the content delete's gather calls `linkStrip`, and the Space and Context cases' `atSweep` still equals `atSettle`.
- [ ] `git grep -nP "DeleteCascade|NO_STRIP|gone\.links|raw\.links as" -- Core` prints nothing, and `git grep -n "patchRecord" -- Core ':!*.test.ts'` prints only `record.ts` and `refile.ts`.
- [ ] Run the gates.
- [ ] Check for unnecessary code or mistakes.

#### Task 3-3

**TASK:** The journal's container note is one builder for the delete and the empty, `park` leaves (an entry with a strip and no `bundle` is always an emptying), and the Set move becomes its own `move` kind, so `finishContainer` reads one meaning and loses both `within` tests (M-6). The journal's strip release moves out of `spendBundle` into `Core/Nexus/owed.ts` beside `restoreNote` (P-5), so only `owed.ts` edits a journal entry. **Real Purpose:** the `move` kind adds about eight lines (its type, its arm, its finish); it buys an entry union whose kinds name their operations, where `ContainerEntry` served three told apart by field presence (*Investigation · §What's True · The Journal*). **Comments:** the AFTER removes four and adds four.

**NOW:**
- **One Type, Three Operations:** `ContainerEntry` (`Core/Nexus/owed.ts:23-31`) serves a delete (`strip`, `edit`, `bundle`), an empty (`strip`, `edit`, `park: true`; `Core/Trash/spend.ts:95-104`), and a Set move (`edit`, `within`; `Core/Nexus/move.ts:79`); `finishContainer` re-derives which from `e.within` (`Core/Nexus/finishOwed.ts:385,387,412`). The delete's note (Task 3-1's `planOf`) and the empty's spell the same shape twice.
- **The Strip Release:** `spendBundle` reverse-looks-up a container entry by `e.bundle` and rewrites its strip (`Core/Bundles/bundle.ts:382-392`), the one edit of a journal entry outside `owed.ts` and the finish.
- **Pins:** `move.test.ts:60` and `deleteReach.test.ts:879` (`setMoveNoted`) write or read the move's entry as `kind: 'container'`; `bundle.test.ts:333-372` pin the release through `spendBundle`.

**CHANGE**

- [ ] Apply the AFTER.
- [ ] `move.test.ts:60` expects `{ kind: 'move', at: 'Notes/Deep', within: 'Notes' }`, and `deleteReach.test.ts:879`'s `setMoveNoted` seeds `kind: 'move'`; no behavior changes, and both suites' Set-move cases (`move.test.ts:40-68`, `deleteReach.test.ts:886-910`) stay green.

**AFTER**

```Core/Nexus/owed.ts diff
@@ imports @@
-import { basename, join } from '../Paths/posix'
+import { basename, isAtOrUnder, join } from '../Paths/posix'
@@ ContainerEntry @@
-/** A page, Collection, or Set delete, a Trash emptying, or a Set move: `strip` holds the gone pages' paths, whose links leave the files outside `at`, and `edit` the views it still owes, reached under `within`; a delete's `bundle` holds its record, and the links an emptying's strip takes are parked where `park` says the Trash entry is gone. */
-export type ContainerEntry = Owed & {
-  kind: 'container'
-  at: string
-  edit?: ConfigEdit
-  within?: string
-  bundle?: string
-  park?: true
-}
+/** A page, Collection, or Set delete, or a Trash emptying: `strip` holds the gone pages' paths, whose links leave the files outside `at`, and `edit` the views it still owes; a delete's `bundle` holds its record, and an emptying's links park with a trashed page that still answers them. */
+export type ContainerEntry = Owed & { kind: 'container'; at: string; edit?: ConfigEdit; bundle?: string }
+/** A Set move: the views of the Collection `within` it left, owed until reached. */
+export type MoveEntry = { kind: 'move'; at: string; edit?: ConfigEdit; within: string }
@@ Entry @@
-export type Entry = PropertyEntry | ContextEntry | SpaceEntry | ContainerEntry | RelinkEntry
+export type Entry =
+  | PropertyEntry
+  | ContextEntry
+  | SpaceEntry
+  | ContainerEntry
+  | MoveEntry
+  | RelinkEntry
@@ owesAnything @@
-  (e.kind === 'container' && !!e.edit) ||
+  ((e.kind === 'container' || e.kind === 'move') && !!e.edit) ||
@@ restoreNote @@
     (e) => e && { ...e, rename: distinct(e.rename, e.strip), strip: undefined, bundle: undefined },
   )
 }
+
+export const containerNote = (
+  at: string,
+  strip: readonly string[],
+  edit: ConfigEdit | null,
+): ContainerEntry => ({ kind: 'container', at, strip: distinct(strip), ...(edit ? { edit } : {}) })
+
+/** An inner item taken out of the bundle at `bundle` takes its pages, at the paths they left under `from`, off the strip that bundle's delete still owes. */
+export async function releaseStrip(root: string, bundle: string, from: string): Promise<void> {
+  const owing = Object.entries(await readNotes(root)).find(
+    ([, e]) => e.kind === 'container' && e.bundle === bundle,
+  )
+  if (!owing) return
+  await editNote(root, owing[0], (e) =>
+    e?.kind === 'container'
+      ? { ...e, strip: distinct(e.strip?.filter((path) => !isAtOrUnder(path, from))) }
+      : e,
+  )
+}
```

`restoreNote`'s spread over a `move` entry never runs: a restore keys it by a Context's or Space's id.

```Core/Bundles/bundle.ts diff
@@ imports @@
-import { distinct, editNote, readNotes } from '../Nexus/owed'
+import { releaseStrip } from '../Nexus/owed'
@@ spendBundle @@
   if (gone.length) await removeLinks(abs, gone)
-  const bundle = relative(root, abs)
-  const owing = Object.entries(await readNotes(root)).find(
-    ([, e]) => e.kind === 'container' && e.bundle === bundle,
-  )
-  if (!owing) return
-  const from = originPathOf(root, store, artifact)
-  await editNote(root, owing[0], (e) =>
-    e?.kind === 'container'
-      ? { ...e, strip: distinct(e.strip?.filter((path) => !isAtOrUnder(path, from))) }
-      : e,
-  )
+  await releaseStrip(root, relative(root, abs), originPathOf(root, store, artifact))
 }
```

```Core/Nexus/finishOwed.ts diff
@@ imports @@
   type ContainerEntry,
   type ContextEntry,
   editNote,
   type Entry,
+  type MoveEntry,
   type Notes,
@@ finishOwed @@
   await inSettleTurn(root, async () => {
     await each('container')
+    await each('move')
     await each('relink')
   })
@@ finishArm @@
     case 'container':
       return finishContainer(root, id, e)
+    case 'move':
+      return finishMove(root, id, e)
     case 'relink':
@@ finishContainer @@
   const reach: ConfigReach = { skipped: 0, hosts: [] }
-  // A deleted page, Collection, or Set live again holds its links and views, so its delete owes them nothing, and its `gone` view edit keeps only the Sets neither the tree nor an Archive its Collection still owns holds; a moved Set is live by design, so it's back only while it stands where it left, its move never made or made undone.
+  // A deleted page, Collection, or Set live again holds its links and views, so its delete owes them nothing, and its `gone` view edit keeps only the Sets neither the tree nor an Archive its Collection still owns holds.
   const tree = await liveTreeOf(root)
-  const live = findContainerById(tree, id)
-  const back = e.within ? live?.path === e.at : pagesByIdOf(tree).has(id) || !!live
+  const back = pagesByIdOf(tree).has(id) || !!findContainerById(tree, id)
   const owedEdit = async (): Promise<ContainerEntry['edit']> => {
-    if (e.edit?.kind !== 'gone' || e.within) return back ? undefined : e.edit
+    if (e.edit?.kind !== 'gone') return back ? undefined : e.edit
@@
   const strip = back ? undefined : e.strip
   // An emptying's links park, before its strip takes them, with a trashed page that still answers them; a delete's are in its record already.
-  if (strip && e.park) await parkLinks(root, await gatherLinks(root, join(root, e.at), strip))
+  if (strip && !e.bundle) await parkLinks(root, await gatherLinks(root, join(root, e.at), strip))
   const stripped = !!strip && add(reach, await deleteCascade(root, join(root, e.at), strip))
-  const viewed =
-    !!edit && add(reach, await reachConfig(root, edit, e.within && join(root, e.within)))
+  const viewed = !!edit && add(reach, await reachConfig(root, edit))
   return {
     left: { ...e, strip: stripped ? e.strip : undefined, edit: viewed ? e.edit : undefined },
     reach,
   }
 }
+
+/** A moved Set is live by design, so it owes nothing while it stands where it left, its move never made or made undone. */
+async function finishMove(root: string, id: string, e: MoveEntry): Promise<Finished<MoveEntry>> {
+  const back = findContainerById(await liveTreeOf(root), id)?.path === e.at
+  const reach = back || !e.edit ? NO_REACH : await reachConfig(root, e.edit, join(root, e.within))
+  return { left: retries(reach) ? e : { ...e, edit: undefined }, reach }
+}
```

```Core/Nexus/move.ts diff
@@ moveSetOp @@
-    note: () => ({ kind: 'container', at: req.path, edit, within: left }),
+    note: () => ({ kind: 'move', at: req.path, edit, within: left }),
```

```Core/Trash/delete.ts diff
@@ imports @@
-import { distinct, type Entry, owedDelete, runNoted } from '../Nexus/owed'
+import { containerNote, type Entry, owedDelete, runNoted } from '../Nexus/owed'
@@ planOf @@
-        note: () => ({
-          kind: 'container',
-          at: rel,
-          strip: distinct(strip),
-          ...(edit ? { edit } : {}),
-        }),
+        note: () => containerNote(rel, strip, edit),
```

```Core/Trash/spend.ts diff
@@ imports @@
 import {
+  containerNote,
   distinct,
@@ emptyBundle @@
-  const noted = await editNote(root, id, () => ({
-    kind: 'container',
-    at: relative(root, artifactAbs),
-    strip: distinct(
-      pages.map((file) => originPathOf(root, store, file)),
-      archive?.origins,
-    ),
-    ...(archive?.sets.length ? { edit: goneContainers(archive.sets) } : {}),
-    park: true,
-  }))
+  const noted = await editNote(root, id, () =>
+    containerNote(
+      relative(root, artifactAbs),
+      [...pages.map((file) => originPathOf(root, store, file)), ...(archive?.origins ?? [])],
+      archive?.sets.length ? goneContainers(archive.sets) : null,
+    ),
+  )
```

**VERIFY**

- [ ] `move.test.ts:40-68`, `deleteReach.test.ts:886-910`, `bundle.test.ts:333-372`, `trashRecovery.test.ts:986-1060` (an inner item's share of the owed strip; the Set-move and the owed `gone` edits), and the emptying cases (`trashRecovery.test.ts:701-791`) are green.
- [ ] `git grep -nP "\bpark\??:|e\.park|e\.within|kind: 'container', at: req" -- Core` prints nothing, and `git grep -n "editNote" -- Core/Bundles` prints nothing.
- [ ] Run the gates.
- [ ] Check for unnecessary code or mistakes.

#### Task 3-4

**TASK:** The empty is the gone-for-good step's one home (M-7): `collectionArchive` moves into it out of `Core/Archive/archive.ts` (P-3, *§Placements*), and a Collection's Archive is given up before its artifact, so a failed disposal leaves the Collection listed and owning its Archive (closes B-5). **Fold:** the empty runs through `runNoted` as the delete does, so a first disposal that fails takes its note back, nothing having gone for good; with the Archive first, an owed note left behind would otherwise strip the links and views of a Collection still whole in the Trash at its Try Again. The record's links also park before its bundle is spent, where today a process dying between the spend and the park loses them. **Comments:** the AFTER removes two and adds one.

**NOW:**
- **The Order:** `emptyBundle` disposes the artifact, then a Collection's Archive (`Core/Trash/spend.ts:106-107`). If the Archive's disposal throws, the bundle holds its record alone, `listBundles` stops listing it (`Core/Bundles/bundle.ts:165-166`), `collectionsElsewhere` stops counting the Collection (`bundle.ts:186-188`), and the next open's `settleArchives` reads the Archive as orphaned and moves its bundles into the Trash (`Core/Archive/refile.ts:145-148`).
- **The Note:** `emptyBundle` writes its note (`spend.ts:94-105`) and disposes with no way back; a disposal that throws leaves the note owed, so Try Again strips the links naming the bundle's pages and the views naming its Archive's Sets while the bundle still holds them. `trashRecovery.test.ts:1051` pins that Try Again; `spend.test.ts:2059` asserts the bundle stays and nothing about the note.
- **`collectionArchive`:** its only caller after Phase 2 is the empty (`spend.ts:90`; `Core/Archive/archive.ts:138-154`).

**CHANGE**

- [ ] Rewrite `trashRecovery.test.ts:1051` from *"a Collection emptied for good whose Archive refuses to go still takes the views naming that Archive's Sets at its Try Again"* to "a Collection whose Archive refuses to go stays whole in the Trash, owning its Archive, and nothing is taken" (B-5): after the refused empty, `listBundles(root, { kind: 'trash' })` lists the Journal bundle, `readNotes(root)` is `{}`, `finish()` leaves the sidecar's views as written, and `settleArchives(root, await readNexus(root))` leaves `listBundles(root, { kind: 'archive', id: 'col-journal' })` at length 1. Watch it fail.
- [ ] `spend.test.ts:2059`, *"a system-trash handoff that rejects leaves the bundle whole"*, becomes "…leaves the bundle whole and owes nothing", adding `expect(await readNotes(root)).toEqual({})`. Watch it fail.
- [ ] Write `trashRecovery.test.ts`' "an emptying that can't spend its bundle has already handed its record's links on" beside `:701`: its setup, with `vi.spyOn(bundle, 'spendBundle').mockRejectedValueOnce(new Error('the disk is gone'))` (`import * as bundle from '../Bundles/bundle'` where the suite has none), then the empty of the first namesake and the other's record holding its links. Watch it fail with the park after the spend.
- [ ] Apply the AFTER.

**AFTER**

```Core/Trash/spend.ts diff
@@ imports @@
-import { readJsonObject, relocate } from '../Files/atomicWrite'
+import { pathExists, readJsonObject, relocate } from '../Files/atomicWrite'
+import { listMarkdownFiles } from '../Files/walk'
+import { archiveStoreOf } from '../Paths/names'
+import { archiveDirRel } from '../Paths/nexusPaths'
@@
-import { goneContainers } from '../Nexus/configReach'
-import { collectionArchive } from '../Archive/archive'
+import { archivedSetIds, goneContainers } from '../Nexus/configReach'
@@
   restoreNote,
+  runNoted,
   type Worked,
 } from '../Nexus/owed'
@@ emptyBundle @@
-// Artifact first: a failed bundle removal then leaves a record with no artifact, litter the listing skips, where the reverse order would orphan a live artifact.
+// Nothing is gone for good until the first disposal lands, so one that fails takes the note back and leaves the bundle whole; a Collection's Archive goes first, so the Collection stays listed while it can still lose anything, and the bundle goes last, so a failed removal leaves a record with no artifact, litter the listing skips.
 export async function emptyBundle(root: string, bundleAbs: string): Promise<MutateReply> {
@@
   const id = relative(root, bundleAbs)
-  const noted = await editNote(root, id, () =>
-    containerNote(
-      relative(root, artifactAbs),
-      [...pages.map((file) => originPathOf(root, store, file)), ...(archive?.origins ?? [])],
-      archive?.sets.length ? goneContainers(archive.sets) : null,
-    ),
-  )
-  if (!noted.ok) return noted
-  await dispose(artifactAbs)
-  if (archive) await dispose(archive.abs)
-  await dropPageMetadata(root, pageIds)
-  await spendBundle(root, opened.value)
-  const recorded = 'links' in record ? (record.links ?? []) : []
-  await parkLinks(root, recorded)
-  return ok({ cascade: owedReport(root, await finishEntry(root, id)) })
+  const ran = await runNoted(root, id, {
+    note: () =>
+      containerNote(
+        relative(root, artifactAbs),
+        [...pages.map((file) => originPathOf(root, store, file)), ...(archive?.origins ?? [])],
+        archive?.sets.length ? goneContainers(archive.sets) : null,
+      ),
+    list: async () => {
+      try {
+        await dispose(archive?.abs ?? artifactAbs)
+      } catch (e) {
+        return fault(e)
+      }
+      if (archive) await dispose(artifactAbs)
+      await dropPageMetadata(root, pageIds)
+      await parkLinks(root, 'links' in record ? (record.links ?? []) : [])
+      await spendBundle(root, opened.value)
+      return ok(null)
+    },
+    sweep: () => finishEntry(root, id),
+  })
+  return ran.ok ? ok({ cascade: ran.value.cascade }) : ran
 }
+
+/** A Collection's Archive, its pages at the paths they lived, and its Sets, which leave with the Collection once it leaves for good; null when it has none. */
+async function collectionArchive(
+  root: string,
+  id: string | undefined,
+): Promise<{ abs: string; files: string[]; origins: string[]; sets: string[] } | null> {
+  const store = archiveStoreOf(id)
+  if (!store) return null
+  const abs = join(root, archiveDirRel(store.id))
+  if (!(await pathExists(abs))) return null
+  const files = await listMarkdownFiles(abs)
+  return {
+    abs,
+    files,
+    origins: files.map((f) => originPathOf(root, store, f)),
+    sets: await archivedSetIds(root, abs),
+  }
+}
```

The comment inside the noted block (*"Permanent now, a Collection's Archive with it: … Noted first, keyed by what it empties, so what the strip misses is owed and parked as a finish strips it."*) stays, reading "parked before a finish strips it" for its last clause. `owedReport` stays imported for the property arm. The record's links park before its bundle is spent, so a process dying between the two loses none of them; by then the artifact is gone, and `parkLinks` reads only bundles still holding one (`listBundles`, `bundle.ts:165-166`, under `originPagesIn`), so the bundle being spent can't take its own links back.

```Core/Archive/archive.ts diff
@@ imports @@
-import { pathExists, relocate } from '../Files/atomicWrite'
-import { listMarkdownFiles } from '../Files/walk'
-import { type ArchiveStore, archiveDirRel } from '../Paths/nexusPaths'
+import { relocate } from '../Files/atomicWrite'
+import type { ArchiveStore } from '../Paths/nexusPaths'
@@
-import { archivedSetIds } from '../Nexus/configReach'
@@ collectionArchive @@
-/** A Collection's Archive, its pages at the paths they lived, and its Sets, which leave with the Collection once it leaves for good; null when it has none. */
-export async function collectionArchive(…) { … }   (lines 138-154, moved whole into spend.ts)
```

**VERIFY**

- [ ] The two rewritten cases and the new one are green, each watched red against the code before this task.
- [ ] The empty's cases stay green: `spend.test.ts:1705-2077` (a Collection emptied for good empties its Archive and takes its Sets' views, `permanentDelete` both ways), `trashRecovery.test.ts:701-791` (parking on empty), and Phase 2's *"emptying with Permanently Delete off, on a host with no system trash, refuses and leaves the item in its bundle"*, which now also owes nothing.
- [ ] `git grep -n "collectionArchive" -- Core` prints only `Core/Trash/spend.ts`.
- [ ] Run the gates.
- [ ] Check for unnecessary code or mistakes.

#### Task 3-5

**TASK:** One current-trail resolver and one carry (M-10; closes B-6). `archiveFiling`'s deepest-live-container rule lifts into `Core/Bundles/record.ts` as `currentOrigin`, the one answer to "where does a record stand now", which the open pass, the Undo's filing, and the Trash restore's carry source read. `refileLanded` and `refileFiled` become one trigger taking the Set's record and the chain it carries along, a Set's landing in either place (a restore reads its chain from the tree, as `refileLanded`'s `trailAbove` did; an Undo passes the chain of the record it was filed with, as `refileFiled`'s `above` was, since the held tree may still list the Set where it stood until the settle), and `refileArchived` carries each record within the Set onto the trail the Set's chain gives it, taking its Archive from that trail. **Departure, Disclosed:** the Ledger's M-10 has `currentTrail` replace all three formulas; the carry keeps its own, the Set's chain retrailed below it, since an Undo files a Set back that the tree no longer holds, and the deepest-live rule would read each record's own chain, which its restore re-trailed to where the Set landed (`archive.test.ts:352-400` pin that case). **Behavior, Decided:** the open pass now re-files a record whose own parent is gone by the deepest container on its chain the tree holds, as the live carry already does, where it left such a record misfiled. **Comments:** the AFTER removes six and adds four.

**NOW:**
- **Three Formulas:** `settleArchives` re-files a record only while its parent is live, by `trailAbove` (`Core/Archive/refile.ts:131-141`); `refileArchived` takes `held ?? retrailed(origin, [...above, setId])` (`refile.ts:50-63`); `archiveFiling` takes the deepest live container on the record's chain, then `retrailed` (`Core/Bundles/placement.ts:197-225`).
- **Three Triggers:** `refileLanded` (`refile.ts:75-86`, the restores, its `to` from `owningCollection(tree, dir)`), `refileFiled` (`:89-96`, the Undo's filing, its `above` and `to` passed in from `archive.ts:52-54`), and `refileMoved` (`:102-122`, the settle).
- **B-6:** `restoreTrashed` passes `collectionOf(originOf(stored))` as the Archive to carry out of (`Core/Trash/spend.ts:296-297`); a Trash record's trail is never re-trailed, so once the trashed Set's former parent moves to another Collection, carrying its archived descendants there, a restore into a third searches the old Archive and finds nothing. The Archive's restore passes the store holding the bundle now (`Core/Archive/archive.ts:121`).

**CHANGE**

- [ ] Write these and watch each fail:
  - **`refile.test.ts`, in *"the restore"*, "a Set restored from the Trash after its parent moved to another Collection carries what was archived from within it from where it sits now" (B-6):** archive `Notes/Daily/Sub/Note.md`, delete `Notes/Daily/Sub`, `moveSet` `Notes/Daily` into `Other` (carrying the record into `IN_OTHER`), then restore the Sub bundle with destination `{ kind: 'container', id: NOTES }`. `filed(IN_NOTES)` is `[{ bundlePath: `.nexus/archive/${NOTES}/Notes/Daily/Sub/${leafOf(bundlePath)}`, id: PAGE_N, trail: [NOTES] }]` and `filed(IN_OTHER)` is `[]`.
  - **`refile.test.ts`, in *"the open pass"*, "a record whose parent is gone is re-filed by the deepest container its chain still holds":** archive `Notes/Daily/Sub/Note.md`, `rm` `Notes/Daily/Sub`, `rename` `Notes/Daily` to `Other/Daily`, and `settleArchives(root, await reread())`; `filed(IN_OTHER)` is `[{ bundlePath: `.nexus/archive/${OTHER}/Notes/Daily/Sub/${leafOf(bundlePath)}`, id: PAGE_N, trail: [OTHER, DAILY] }]`.
- [ ] Apply the AFTER.

**AFTER**

```Core/Bundles/record.ts diff
@@ retrailed @@
 export function retrailed(origin: Origin, held: readonly string[]): string[] {
   const chain = [...origin.trail, origin.parent]
   return [...held, ...chain.slice(chain.indexOf(held[held.length - 1]) + 1)].slice(0, -1)
 }
+
+/** `origin` on the trail it stands on now: down to the deepest container on its chain the tree holds, then the ids its record stored below that one; null when the tree holds none of them. */
+export function currentOrigin(tree: NexusTree, origin: Origin): Origin | null {
+  const held = [...origin.trail, origin.parent]
+    .reverse()
+    .map((id) => containerTrailById(tree, id))
+    .find((trail) => trail !== null)
+  return held
+    ? {
+        parent: origin.parent,
+        trail: retrailed(
+          origin,
+          held.map((n) => n.id),
+        ),
+      }
+    : null
+}
```

```Core/Bundles/placement.ts diff
@@ imports @@
-import { containerTrailById, findContainerById } from '../Nexus/treePatch'
+import { findContainerById } from '../Nexus/treePatch'
@@
-import { type ArtifactRecord, originOf, type Place, retrailed } from './record'
+import { type ArtifactRecord, collectionOf, currentOrigin, originOf, type Place } from './record'
@@ archiveFiling @@
   const origin = originOf(record)
-  const live = origin
-    ? [...origin.trail, origin.parent]
-        .reverse()
-        .map((id) => containerTrailById(tree, id))
-        .find((held) => held !== null)
-    : undefined
-  const into = archiveStoreOf(live?.[0].id) ?? named.store
+  const now = origin && currentOrigin(tree, origin)
+  const into = archiveStoreOf(now ? collectionOf(now) : undefined) ?? named.store
@@
-    record:
-      origin && live
-        ? {
-            ...record,
-            trail: retrailed(
-              origin,
-              live.map((n) => n.id),
-            ),
-          }
-        : record,
+    record: now ? { ...record, trail: now.trail } : record,
   })
```

(`archiveFiling` was `containerTrailById`'s one reader in `placement.ts`; `findContainerById` stays for `:146-150`.)

```Core/Archive/refile.ts diff
@@ header @@
-// The open pass, `settleArchives`, re-files each record a Set moved while Pommora was closed left misfiled, and moves an Archive whose Collection exists nowhere into the Trash, recoverable.
+// The open pass, `settleArchives`, re-files each record a container moved while Pommora was closed left misfiled, and moves an Archive whose Collection exists nowhere into the Trash, recoverable.
@@ imports @@
 import {
   collectionOf,
+  currentOrigin,
   originOf,
   patchRecord,
   type RecordFile,
   retrailed,
-  trailAbove,
 } from '../Bundles/record'
@@ refileArchived @@
-/** Each record archived from within the Set `setId` takes the trail the Set gives it now, `above` it, and `to`'s Archive when the Set now sits in another Collection. An origin the tree holds is placed by its current trail, and one it no longer holds by the ids its record stored below the Set. */
-async function refileArchived(
-  root: string,
-  setId: string,
-  from: string,
-  to: string,
-  tree: NexusTree,
-  above = trailAbove(tree, setId),
-): Promise<void> {
-  if (!above) return
-  for (const { bundlePath, origin, held } of await archivedWithin(root, setId, from, tree)) {
-    const trail = held ?? retrailed(origin, [...above, setId])
-    await refile(root, bundlePath, origin.trail, trail, from, to)
-  }
-}
+/** Each record archived from within the Set `setId`, out of `from`'s Archive where it sits, follows the Set to `chain`, its ids Collection first down to the Set: onto the trail that gives it, the ids its record stored below the Set kept, and into the Archive of the Collection the chain starts in. */
+async function refileArchived(
+  root: string,
+  setId: string,
+  chain: string[],
+  from: string,
+  tree: NexusTree,
+): Promise<void> {
+  for (const { bundlePath, origin } of await archivedWithin(root, setId, from, tree))
+    await refile(root, bundlePath, origin.trail, retrailed(origin, chain), from, chain[0])
+}
@@ refileLanded, refileFiled @@
-/** The restores' trigger: a Set landed in `dir` carries what was archived from within it out of `from`, the Archive of the Collection it left. */
-export const refileLanded = (
-  root: string,
-  record: RecordFile,
-  from: string | null,
-  dir: string,
-): Promise<void> =>
-  carried(async () => {
-    if (record.entity !== 'set' || record.parent.kind !== 'container' || !record.id || !from) return
-    const tree = await liveTreeOf(root)
-    const to = owningCollection(tree, dir)?.id
-    if (to) await refileArchived(root, record.id, from, to, tree)
-  })
-
-/** The Undo's trigger: the Set `setId` filed back on `above`, the trail it was filed on, carries what was archived from within it out of `from`, the Archive of the Collection it stood in, into `to`'s Archive, that Archive the same one or another. */
-export const refileFiled = (
-  root: string,
-  setId: string,
-  above: string[],
-  from: string,
-  to: string,
-): Promise<void> =>
-  carried(async () => refileArchived(root, setId, from, to, await liveTreeOf(root), above))
+/** A Set that landed, in the tree by a restore or back in the Archive by an Undo, carries what was archived from within it out of `from`, the Archive those records sit in, along `chain`: an Undo's from the record it was filed with, since the tree may still hold the Set at its old place until the settle, and a restore's read from the tree. */
+export const refileLanded = (
+  root: string,
+  record: RecordFile,
+  from: string | null,
+  chain?: string[],
+): Promise<void> =>
+  carried(async () => {
+    if (record.entity !== 'set' || !record.id || !from) return
+    const tree = await liveTreeOf(root)
+    const along = chain ?? containerTrailById(tree, record.id)?.map((n) => n.id)
+    if (along) await refileArchived(root, record.id, along, from, tree)
+  })
@@ refileMoved @@
     if (!was || node.kind !== 'set') return
-    if (was.at(-2)?.id === containerTrailById(next, node.id)?.at(-2)?.id) return
+    const now = containerTrailById(next, node.id)
+    if (was.at(-2)?.id === now?.at(-2)?.id) return
     const from = owningCollection(prev, was[was.length - 1])
-    const to = owningCollection(next, node)
-    if (from && to) await refileArchived(root, node.id, from.id, to.id, next)
+    if (from && now) await refileArchived(root, node.id, now.map((n) => n.id), from.id, next)
   }
@@ settleArchives @@
-/** The open pass, once per open before the index seed: an Archive filed under a live Collection re-files each record whose origin the tree holds, which a Set moved while Pommora was closed leaves misfiled; …
+/** The open pass, once per open before the index seed: an Archive filed under a live Collection re-files each record by the deepest container on its chain the tree holds, which a container moved while Pommora was closed leaves misfiled; …
@@
       for (const { bundlePath, record } of await listBundles(root, { kind: 'archive', id })) {
         const origin = originOf(record)
-        const trail = origin && trailAbove(tree, origin.parent)
-        if (origin && trail)
-          await refile(
-            root,
-            bundlePath,
-            origin.trail,
-            trail,
-            id,
-            collectionOf({ parent: origin.parent, trail }),
-          )
+        const now = origin && currentOrigin(tree, origin)
+        if (origin && now) await refile(root, bundlePath, origin.trail, now.trail, id, collectionOf(now))
       }
```

(Only the quoted clause of `settleArchives`' doc changes; its orphan half stays.)

```Core/Archive/archive.ts diff
@@ imports @@
-import { refileFiled, refileLanded } from './refile'
+import { refileLanded } from './refile'
@@ archiveOp @@
   await dropDeparture(root, node)
   const left = at === undefined ? null : originOf(record)
-  if (record.entity === 'set' && record.id && left)
-    await refileFiled(root, record.id, [...left.trail, left.parent], store.id, to.id)
+  if (left && record.id)
+    await refileLanded(root, record, store.id, [...left.trail, left.parent, record.id])
@@ restoreArchived @@
-  await refileLanded(root, record, store.id, dir)
+  await refileLanded(root, record, store.id)
```

```Core/Trash/spend.ts diff
@@ imports @@
-import { collectionOf, originOf, recordedPartly } from '../Bundles/record'
+import { collectionOf, currentOrigin, originOf, recordedPartly } from '../Bundles/record'
@@ restoreTrashed @@
   const left = originOf(stored)
-  if (!into) await refileLanded(root, record, left && collectionOf(left), dir)
+  // What was archived from within the Set sits in the Archive of the Collection the Set's chain stands in now, since a Trash record keeps the trail it left on.
+  const now = left && currentOrigin(tree, left)
+  if (!into) await refileLanded(root, record, now ? collectionOf(now) : null)
```

**VERIFY**

- [ ] The two new cases are green, each watched red against the code before this task.
- [ ] The carry's pins stay green: `refile.test.ts:110-441` (the comparison, the restores, a carry that throws), `refile.test.ts:442-540` (the open pass, `:522`'s record left byte-identical, since its re-trailed trail is the one it stored), `archive.test.ts:325-416` (a landed Set's carry and each Undo's carry on the trail it was archived on), and `archive.test.ts:656-698` (an Undo filing into the Archive its origin sits in now).
- [ ] `git grep -nP "refileFiled|trailAbove\(tree, origin\.parent\)|\blive\?\.\[0\]" -- Core` prints nothing.
- [ ] Run the gates.
- [ ] Check for unnecessary code or mistakes.

#### Task 3-6

**TASK:** One owned-Archives iterator (M-11). `ownedArchives` answers each Archive by its Collection's id with whether that Collection still answers for it, reading the Collections outside the tree at most once; the open pass and the finish's owed `gone` edit both walk it, where each listed the Archive's root and memoized that read by hand. `archiveFiling`'s one question for one id (`Core/Bundles/placement.ts:206`) keeps `archiveOwned` itself, since an Archive it files into needn't have a folder yet. **M-11's Walk Half Holds at HEAD:** `archivedSetIds` and `archivedSets` already share one walk, `setSidecarsUnder` (`Core/Nexus/configReach.ts:284-304`); their scopes come from the settings file and the tree, and `archivedSetIds`' callers in `delete.ts` and `spend.ts` hold no tree, so nothing changes there. **Comments:** the AFTER adds one.

**NOW:** `settleArchives` (`Core/Archive/refile.ts:125-152`) and `finishContainer`'s `owedEdit` (`Core/Nexus/finishOwed.ts:390-397`) each list `.nexus/archive`, skip non-folders, and ask `archiveOwned` (`Core/Bundles/bundle.ts:192-203`) with a hand-written `elsewhere ??= collectionsElsewhere(root, tree)` memo.

**CHANGE**

- [ ] Apply the AFTER.
- [ ] No behavior changes; the open pass's cases (`refile.test.ts:442-540`) and the owed `gone` edits (`trashRecovery.test.ts:1012-1060`, `spend.test.ts:1951`) stay green.

**AFTER**

```Core/Bundles/bundle.ts diff
@@ imports @@
-import { NEXUS_DIR, TRASH_DIR } from '../Paths/nexusPaths'
+import { ARCHIVE_DIR_REL, NEXUS_DIR, TRASH_DIR } from '../Paths/nexusPaths'
@@ archiveOwned @@
     (await elsewhere()).has(id)
   )
 }
+
+/** Each Archive by its Collection's id, and whether that Collection still answers for it, the Collections outside the tree read once at most. */
+export async function ownedArchives(
+  root: string,
+  tree: NexusTree,
+): Promise<{ id: string; owned: boolean }[]> {
+  let elsewhere: Promise<Set<string>> | undefined
+  const answers: { id: string; owned: boolean }[] = []
+  for (const { name: id, kind } of await listEntries(join(root, ARCHIVE_DIR_REL)))
+    if (kind === 'dir')
+      answers.push({
+        id,
+        owned: await archiveOwned(tree, id, () => (elsewhere ??= collectionsElsewhere(root, tree))),
+      })
+  return answers
+}
```

```Core/Archive/refile.ts diff
@@ imports @@
 import {
-  archiveOwned,
   archivedWithin,
-  collectionsElsewhere,
   listBundles,
   moveIntoStore,
+  ownedArchives,
 } from '../Bundles/bundle'
@@
-import { ARCHIVE_DIR_REL, archiveDirRel } from '../Paths/nexusPaths'
-import { listEntries, listFilesRecursive } from '../Files/walk'
+import { archiveDirRel } from '../Paths/nexusPaths'
+import { listFilesRecursive } from '../Files/walk'
@@ settleArchives @@
 export async function settleArchives(root: string, tree: NexusTree): Promise<void> {
-  let elsewhere: Promise<Set<string>> | undefined
-  for (const { name: id, kind } of await listEntries(join(root, ARCHIVE_DIR_REL))) {
-    if (kind !== 'dir') continue
+  for (const { id, owned } of await ownedArchives(root, tree)) {
     if (tree.collections.some((c) => c.id === id)) {
@@
       continue
     }
-    if (await archiveOwned(tree, id, () => (elsewhere ??= collectionsElsewhere(root, tree))))
-      continue
+    if (owned) continue
     for (const { bundlePath } of await listBundles(root, { kind: 'archive', id }))
```

```Core/Nexus/finishOwed.ts diff
@@ imports @@
-import { ARCHIVE_DIR_REL, archiveDirRel, contextDirRel } from '../Paths/nexusPaths'
+import { archiveDirRel, contextDirRel } from '../Paths/nexusPaths'
@@
-import { archiveOwned, collectionsElsewhere, contentPages, listBundles } from '../Bundles/bundle'
-import { listEntries } from '../Files/walk'
+import { contentPages, listBundles, ownedArchives } from '../Bundles/bundle'
@@ owedEdit @@
     const unheld = e.edit.ids.filter((x) => !findContainerById(tree, x))
     if (!unheld.length) return undefined
-    let elsewhere: Promise<Set<string>> | undefined
     const archived: string[] = []
-    for (const { name, kind } of await listEntries(join(root, ARCHIVE_DIR_REL)))
-      if (
-        kind === 'dir' &&
-        (await archiveOwned(tree, name, () => (elsewhere ??= collectionsElsewhere(root, tree))))
-      )
-        archived.push(...(await archivedSetIds(root, join(root, archiveDirRel(name)))))
+    for (const { id: owner, owned } of await ownedArchives(root, tree))
+      if (owned) archived.push(...(await archivedSetIds(root, join(root, archiveDirRel(owner)))))
     const ids = unheld.filter((x) => !archived.includes(x))
```

**VERIFY**

- [ ] `git grep -n "elsewhere ??=" -- Core` prints only `Core/Bundles/bundle.ts`, and `git grep -n "ARCHIVE_DIR_REL" -- Core/Archive Core/Nexus/finishOwed.ts` prints nothing.
- [ ] Run the gates.
- [ ] Check for unnecessary code or mistakes.

#### Review Checkpoint

- [ ] **One Mint, One Tail, One Leave:** every production `mintBundle` call passes its record, no bundle stands without one after a throw, `deleteOp` mints after every guard, and the delete and both finish arms move through one `leave` that drops the departure.
- [ ] **Recorded Ahead:** a page, Set, or Collection delete's record holds its strip's Link values at the move (`atSettle`), a delete from the Archive's included, and no strip reads what it took; the empty parks before its strip.
- [ ] **One Journal Owner:** only `Core/Nexus/owed.ts` and the finish edit a journal entry, the container note is built once, and `ContainerEntry` serves a delete and an emptying alone.
- [ ] **The Gone-for-Good Step:** a Collection whose Archive won't go stays listed, owns its Archive, and owes nothing.
- [ ] **One Resolver, One Carry:** `currentOrigin` answers where a record stands for the open pass, the Undo's filing, and the Trash restore's carry source, and `refileArchived` is the one carry its three triggers share.
- [ ] **A Live Drive** on a scratch copy of `~/Test`, from a worktree build (*Development-Environment*):
  1. Give a page in Collection B a Link value naming a page in Collection A, delete the A page, and read its bundle's `_record.json` on disk: it holds the value.
  2. Restore it: the value is back.
  3. Archive a Set holding a page, delete the Collection, and empty it from the Trash: its Archive folder is gone and nothing from it lists in the Trash.
- [ ] **The Number:** `view-delta`'s Actionable column for the phase is recorded in its Net Ledger row beside that row's estimate, additions and removals apart, and the gap is reported in chat with what it buys before Phase 4 opens.
- [ ] Two read-only reviewers, one under `code-simplification` and one under `adversarial-review`, weigh the phase against *§Constraints* and Phase 4's starting point, reading outward; what holds is folded before Phase 4 opens, and the compaction checkpoint follows.

---

### Phase 4 — Reach-In

**GOAL:** The Trash joins the index and every cascade, watched as the Archive is, through one store-of-path rule in `Core/Paths/bundleLayout.ts`, so a trashed page or Space is rewritten wherever a live one is and its restore is a move plus the refill of the Link values its delete stripped (Decision D-1). The frozen model leaves whole: `targets`, the scrub, the trashed refill, `Worked`, `withUnswept`, `renameFrontmatterKey`, and `Frozen`. It's a phase of its own because the reach and the removals have to land together, reach first (*Investigation · §Order Constraints*, 6 and 7): no commit leaves a trashed copy that's neither reached nor repaired.

**THE TREE:** HEAD plus Phases 1–3; every `-` line reads the code as Phase 3 leaves it, and line citations are HEAD's. Phase 2 removed `TrashDeps`, so every test below calls `settledMutate(root, req)` and `handleMutate(root, req)` without deps. A hunk in a file an earlier phase also restructures is limited to the lines this phase touches, and a `▸` note above it names that phase.

**FLIPS:** each task's VERIFY lists the existing cases its change makes fail and says what each becomes. If a case flips that the list doesn't name, the executor reports it and doesn't fix it.

**APPROACHES DECIDED (*Investigation · §Approaches Worth Weighing*):**
- **1 · The Stored-Origin Reader's Freshness: listing.** `trashedOwners` lists the Trash's records once per governed or scoped reach, and `pagesInReach` lists them only when a trashed file is among the candidates. A cascade with no trashed holder therefore pays nothing, and one with trashed holders pays one record read per bundle, about 50–100 µs each. At Medium-50 that's well under a second against a 22.3 s rename. The map's staleness would be a correctness question for a cost the listing doesn't show. Decision G-2's closing rename measurement, after Phase 5, includes the listing, because a property rename is a governed reach.
- **7 · The Configuration Pass's Page-Bundle Prune: not adopted.** The unscoped pass runs on deletes and on property and option deletes, never on a rename or an edit, so G-2's measurement can't show it. Its cost is one directory read per page bundle, and every open's corpus walk already pays that read for every bundle, as the Archive's unpruned walk does today. The prune would have to be a walk of its own beside `sidecarsUnder`, because the corpus walk has to enter page bundles. It would be +2 lines and a second admission rule for no measured gain.
- **8 · Stored Rows in the Index's Unbounded Reads: the Core filter stays.** The matrix and headings loads read stored rows and drop them with one `storeOf` test per row, once per load. The measured warm open costs +1–10% (*§The Measurement*), and most of that is the seed's stats, not the filter. Moving the store prefixes into SQL through `UNDER` would put a store concept into the `ContentIndexStore` contract.

#### Task 4-1

**TASK:** The store-of-path rule lands. `Core/Bundles/layout.ts` moves to `Core/Paths/bundleLayout.ts` and takes in `ArchiveStore`, `archiveDirRel`, and `archiveStoreOf`. `storeOf(rel)` answers where a path inside either store sits, and replaces `archivedCollectionIdOf`, `isArchived`, `outsideArchive`, `stampedSegment`, `bundleAddressOf`'s store derivation, `nexusPages`' Archive parse, and the six display hides. `originPathOf` reads its answer, so it takes no store: every caller passes a path inside the store it named, which the path already says, and `originPagesOf` and `keptLinksUnder`, which carried a store only to hand it on, drop theirs. `hiddenName` and `hiddenFolder` move from `Core/Paths/exclusion.ts` into `Core/Paths/nexusPaths.ts`, which imports only `urlPath`, so `bundleLayout.ts` and `names.ts` read them without a loop through `exclusion.ts`, which reads `storeOf` from Task 4-3. Behavior doesn't change, and the existing suite proves it.

**NOW:**
- `layoutOf`, the stamp, `stampedSegment`, `bundleAddressOf`, and `originPathOf` live in `Core/Bundles/layout.ts:10-64`.
- `ArchiveStore`, `archiveDirRel`, `archiveSegs`, `archivedCollectionIdOf`, and `isArchived` live in `Core/Paths/nexusPaths.ts:9-19`, and `archiveStoreOf` lives in `Core/Paths/names.ts:19-21`.
- "Is this path stored" is asked through `isArchived` (`matrixGraph.ts:26`, `Nexus/handlers.ts:169`, `delete.ts:42`), through `outsideArchive` (`governedSweep.ts:79-81`, read at `:88`, `cascade.ts:156,276`, and `findHolders`' `every` filter in `keyHolders.ts`, where Task 1-5 moved the clash check's hide ahead of the read), through `archivedCollectionIdOf` (`heldPages.ts:78`, `treePatch.ts:116`, and `layout.ts:45`), and through `originPathOf`'s own segment search (`layout.ts:59-64`).
- `hiddenName` and `hiddenFolder` live in `Core/Paths/exclusion.ts:8-15`, beside `neverWatched` and `outsideContent`, their two readers there; `nexusPaths.ts` imports only `urlPath` (`:1`).
- `storeOf` collides with nothing: `git grep -nw storeOf` prints nothing. The rows' `storedAt` field and `storedAtOf` keep their names.
- `originPathOf`'s fourteen production calls and `originPagesOf`'s three each pass a file inside the store they name: the archive op's landing (`archive.ts:56,60`) and the Archive restore's artifact (`:111`); `moveIntoStore`'s artifact, under the store its bundle's address answers (`bundle.ts:127-130`); `keptLinksUnder`'s bundle pages (`:285`), `listInner`'s entries (`:334`), `spendBundle`'s artifact (`:387`), and `originPagesIn`'s and `originPagesOf`'s stored pages (`:423,436`); `archiveFiling`'s address (`placement.ts:208`); `fromArchive`'s artifact and pages (`delete.ts:55,57`); and the empty's pages, `restoreTrashed`'s artifact (`spend.ts:99,153,196`), and the Archive files of `collectionArchive`, which Phase 3 moved there from `archive.ts:151`. `moveIntoStore` reads its bundle's store only to hand it on, and `spendBundle` destructures `store` only for it.

**CHANGE**

- [ ] `git mv Core/Bundles/layout.ts Core/Paths/bundleLayout.ts`, then apply the AFTER.
- [ ] Re-point every importer of `Bundles/layout` to `Paths/bundleLayout`: `archive.ts`, `bundle.ts`, `browser.ts`, `Bundles/handlers.ts`, `placement.ts`, `rows.ts`, `heldPages.ts`, `mutate.ts`, `delete.ts`, `discard.ts`, `spend.ts`, `Core/Contract/bridge.ts`, and `Desktop/Store/driver.ts`, plus the tests `archive.test.ts`, `refile.test.ts`, `layout.test.ts`, and `rows.test.ts`.
- [ ] Take `ArchiveStore` and `archiveDirRel` from `Paths/bundleLayout` instead of `nexusPaths` (`archive.ts:8`, which imports `ArchiveStore` alone after Phase 3, `refile.ts:30`, `placement.ts:3`, `finishOwed.ts:23`, `spend.ts`, and `treePatch.ts:16`), and take `archiveStoreOf` from it instead of `names` (`archive.ts:4`, `refile.ts:8`, `bundle.ts:13`, `Bundles/handlers.ts:6`, `placement.ts:5`, `spend.ts`, and `treePatch.ts:25`).
- [ ] Take `hiddenName` and `hiddenFolder` from `nexusPaths` instead of `exclusion`, joining each file's `nexusPaths` import where it has one: `walk.ts:1-2` (`{ ARCHIVE_DIR_REL, hiddenFolder, hiddenName, SIDECARS }`), `bundle.ts:12,14` (`{ ARCHIVE_DIR_REL, hiddenName, NEXUS_DIR, TRASH_DIR }`, Phase 3 having added `ARCHIVE_DIR_REL`), `names.ts:4` (shown below), `fileEvents.ts:12`, `assetRoots.ts:5`, `assetDirValidate.ts:5`, `exclusionScan.ts:13`, and `restoreScrub.ts:39-40` (`{ hiddenFolder, SPACE_SIDECAR }`).
- [ ] Drop `originPathOf`'s `store` argument at every call, and `originPagesOf`'s and `keptLinksUnder`'s parameter with it (the `archive.ts`, `bundle.ts`, `placement.ts`, `delete.ts`, and `spend.ts` hunks below); `layout.test.ts`'s five `originPathOf` calls (`:74,76,81,86,92`) drop their `TRASH` or `ARCHIVE` argument, their expectations unchanged.
- [ ] Remove `archivedCollectionIdOf`'s case from `exclusion.test.ts` (`:181-189`) and its import (`:6`).
- [ ] In `ConnectionsPM.md:30`, "the pages and Spaces outside the Archive it reached" becomes "the pages and Spaces outside both stores it reached".
- [ ] Write `bundleLayout.test.ts`'s cases in `Core/Bundles/layout.test.ts`, which stays put until Phase 6 (Placements). Add a `describe('storeOf')` with:
  - **"answers a Trash page's bundle, inner segments, and origin":** `.trash/Notes/<stamp>__A.md.deleted/A.md` answers `{ store: { kind: 'trash' }, bundle: '.trash/Notes/<stamp>__A.md.deleted', inner: ['A.md'], origin: 'Notes/A.md' }`.
  - **"answers an Archive path's Collection, its origin under the Collection's own folder":** `.nexus/archive/C1/Notes/<stamp>__S.archived/S/P.md` answers `{ store: { kind: 'archive', id: 'C1' }, bundle: '.nexus/archive/C1/Notes/<stamp>__S.archived', inner: ['S', 'P.md'], origin: 'Notes/S/P.md' }`.
  - **"answers a chain folder and a leftover beside the bundles with no bundle":** `.trash/Notes` and `.trash/Notes/<stamp>__x.md` (a flat leftover) each answer `bundle: null`.
  - **"answers null outside both stores and at their roots":** `.trash`, `.nexus/archive`, `.nexus/contexts/A`, and `Notes/A.md` each answer null.

  Watch them fail before the AFTER: `storeOf` doesn't exist yet, so they fail at import.

**AFTER**

```Core/Paths/bundleLayout.ts diff
@@ imports @@
-import { basename, join, relative } from '../Paths/posix'
-import { hiddenName } from '../Paths/exclusion'
-import {
-  type ArchiveStore,
-  archiveDirRel,
-  archivedCollectionIdOf,
-  TRASH_DIR,
-} from '../Paths/nexusPaths'
+import { basename, join, relative } from './posix'
+import { holdsName } from './names'
+import { ARCHIVE_DIR_REL, hiddenName, TRASH_DIR } from './nexusPaths'
+
+export type ArchiveStore = { kind: 'archive'; id: string }
 
 export type BundleStore = { kind: 'trash' } | ArchiveStore
+
+export const archiveDirRel = (collectionId: string): string => `${ARCHIVE_DIR_REL}/${collectionId}`
+
+/** The Archive a Collection id names: the id becomes one folder under the Archive's root, and a sidecar can carry any string as its id. */
+export const archiveStoreOf = (id: string | undefined): ArchiveStore | null =>
+  id !== undefined && holdsName(id) ? { kind: 'archive', id } : null
 
@@ stampedSegment @@
-/** The bundle is the folder wearing its mint's stamp, so a chain or artifact folder that only wears the suffix is never taken for it. */
-const stampedSegment = (segs: readonly string[], suffix: string): number =>
-  segs.findIndex((seg) => seg.endsWith(suffix) && storedAtOf(seg) !== null)
+export interface Stored {
+  store: BundleStore
+  bundle: string | null
+  inner: string[]
+  origin: string
+}
+
+/** Where a path inside a store sits, from the path alone, so the walk, the index, every reach, and every display read one rule: its store; the bundle holding it, the folder wearing its mint's stamp so a chain or artifact folder that only wears the suffix is never taken for it (root-relative, null for a chain folder or anything left beside the bundles); its segments below the bundle; and where it lived, that one folder taken out. Null outside both stores, their roots included. */
+export function storeOf(rel: string): Stored | null {
+  const segs = rel.split('/')
+  const store: BundleStore | null =
+    segs[0] === TRASH_DIR && segs.length > 1
+      ? { kind: 'trash' }
+      : `${segs[0]}/${segs[1]}` === ARCHIVE_DIR_REL && segs.length > 2
+        ? { kind: 'archive', id: segs[2] }
+        : null
+  if (!store) return null
+  const { dir, suffix } = layoutOf(store)
+  const depth = dir.split('/').length
+  const below = segs.slice(depth)
+  const at = below.findIndex((seg) => seg.endsWith(suffix) && storedAtOf(seg) !== null)
+  return {
+    store,
+    bundle: at === -1 ? null : segs.slice(0, depth + at + 1).join('/'),
+    inner: at === -1 ? [] : below.slice(at + 1),
+    origin: below.filter((_, i) => i !== at).join('/'),
+  }
+}
 
@@ bundleAddressOf @@
   abs: string,
 ): { bundle: string; store: BundleStore; item?: string } | null {
-  const rel = relative(root, abs)
-  const id = archivedCollectionIdOf(rel)
-  const store: BundleStore = id === null ? { kind: 'trash' } : { kind: 'archive', id }
-  const { dir, suffix } = layoutOf(store)
-  if (!rel.startsWith(`${dir}/`)) return null
-  const segs = rel.split('/')
-  const at = stampedSegment(segs, suffix)
-  if (at === -1) return null
-  const bundle = join(root, ...segs.slice(0, at + 1))
-  if (segs.length === at + 1) return { bundle, store }
-  const inner = segs.slice(at + 1)
-  return inner.length > 1 && !inner.some(hiddenName) ? { bundle, store, item: abs } : null
+  const at = storeOf(relative(root, abs))
+  if (!at?.bundle) return null
+  const bundle = join(root, at.bundle)
+  if (!at.inner.length) return { bundle, store: at.store }
+  return at.inner.length > 1 && !at.inner.some(hiddenName)
+    ? { bundle, store: at.store, item: abs }
+    : null
 }
 
 /** Where a stored file lived: its path under the store's root with the bundle's own folder taken out. */
-export function originPathOf(root: string, store: BundleStore, file: string): string {
-  const { dir, suffix } = layoutOf(store)
-  const segs = relative(join(root, dir), file).split('/')
-  const bundle = stampedSegment(segs, suffix)
-  return segs.filter((_, i) => i !== bundle).join('/')
-}
+export const originPathOf = (root: string, file: string): string =>
+  storeOf(relative(root, file))!.origin
```

▸ Phases 2 and 3 also edit `archive.ts`, `bundle.ts`, `spend.ts`, and `delete.ts`; these hunks drop the store argument alone, at the lines Phase 3 leaves.

```Core/Archive/archive.ts diff
@@ archiveOp @@
   const cascade =
-    originPathOf(root, to, filed.landed) !== relative(root, abs)
+    originPathOf(root, filed.landed) !== relative(root, abs)
       ? await departingCascade(
           root,
           tree,
-          await originPagesOf(root, to, await contentPages(req.kind, filed.landed)),
+          await originPagesOf(root, await contentPages(req.kind, filed.landed)),
@@ restoreArchived @@
-  const back = await originPagesOf(root, store, await contentPages(record.entity, artifact))
+  const back = await originPagesOf(root, await contentPages(record.entity, artifact))
```

```Core/Bundles/bundle.ts diff
@@ moveIntoStore @@
-  const from = bundleAddressOf(root, fromBundle)?.store
   const artifact = await bundleArtifact(fromBundle)
   const raw = await readRawRecord(fromBundle)
-  if (!from || !artifact || !raw) return
-  const origin = join(root, originPathOf(root, from, artifact))
+  if (!artifact || !raw) return
+  const origin = join(root, originPathOf(root, artifact))
@@ keptLinksUnder @@
-async function keptLinksUnder(
-  root: string,
-  store: BundleStore,
-  held: ContainerRecord,
-  artifact: string,
-  item: string,
-) {
+async function keptLinksUnder(root: string, held: ContainerRecord, artifact: string, item: string) {
   if (!held.links?.length) return []
   const files = await listMarkdownFiles(artifact)
-  const index = buildPageIndex(files.map((f) => connPage(f, originPathOf(root, store, f))))
+  const index = buildPageIndex(files.map((f) => connPage(f, originPathOf(root, f))))
@@ openBundle @@
-  const links = await keptLinksUnder(root, store, held, inner.artifact, item)
+  const links = await keptLinksUnder(root, held, inner.artifact, item)
@@ listInner @@
-      !outsideContent(originPathOf(root, store, join(folder, e.name)), scope),
+      !outsideContent(originPathOf(root, join(folder, e.name)), scope),
@@ spendBundle @@
-  const { abs, store, record, artifact, inner } = opened
+  const { abs, record, artifact, inner } = opened
@@
-  await releaseStrip(root, relative(root, abs), originPathOf(root, store, artifact))
+  await releaseStrip(root, relative(root, abs), originPathOf(root, artifact))
@@ originPagesIn @@
-      out.push(connPage(bundle, originPathOf(root, store, file)))
+      out.push(connPage(bundle, originPathOf(root, file)))
@@ originPagesOf @@
-export async function originPagesOf(
-  root: string,
-  store: BundleStore,
-  files: readonly string[],
-): Promise<ConnPage[]> {
+export async function originPagesOf(root: string, files: readonly string[]): Promise<ConnPage[]> {
   const out: ConnPage[] = []
   for (const file of files)
-    out.push(connPage((await stampedIdOf(file)) ?? file, originPathOf(root, store, file)))
+    out.push(connPage((await stampedIdOf(file)) ?? file, originPathOf(root, file)))
```

`moveIntoStore`'s address check leaves with its store: every caller hands it a bundle `listBundles` listed, and the artifact and record reads still answer nothing for anything else.

```Core/Bundles/placement.ts diff
@@ archiveFiling @@
-  const left = originPathOf(root, named.store, named.item ?? named.bundle)
+  const left = originPathOf(root, named.item ?? named.bundle)
```

```Core/Trash/spend.ts diff
@@ emptyBundle @@
-        [...pages.map((file) => originPathOf(root, store, file)), ...(archive?.origins ?? [])],
+        [...pages.map((file) => originPathOf(root, file)), ...(archive?.origins ?? [])],
@@ restoreTrashed @@
-  const back = await originPagesOf(root, store, await contentPages(record.entity, artifactAbs))
+  const back = await originPagesOf(root, await contentPages(record.entity, artifactAbs))
@@
-      const origin = join(root, originPathOf(root, store, artifactAbs))
+      const origin = join(root, originPathOf(root, artifactAbs))
@@ collectionArchive @@
-    origins: files.map((f) => originPathOf(root, store, f)),
+    origins: files.map((f) => originPathOf(root, f)),
```

```Core/Paths/nexusPaths.ts diff
@@ ARCHIVE_DIR_REL @@
 export const ARCHIVE_DIR_REL = `${NEXUS_DIR}/archive`
 
-export type ArchiveStore = { kind: 'archive'; id: string }
-
-export const archiveDirRel = (collectionId: string): string => `${ARCHIVE_DIR_REL}/${collectionId}`
+export function hiddenName(name: string): boolean {
+  return name.startsWith('.') || name.startsWith('_')
+}
+
+/** A folder the app never enters: hidden behind a leading dot or underscore, or a package cache. */
+export function hiddenFolder(name: string): boolean {
+  return hiddenName(name) || name === 'node_modules'
+}
 
 export const archiveSegs = (segs: string[]): string[] | null =>
   `${segs[0]}/${segs[1]}` === ARCHIVE_DIR_REL ? segs.slice(2) : null
 
-export const archivedCollectionIdOf = (rel: string): string | null =>
-  archiveSegs(rel.split('/'))?.[0] ?? null
-
-export const isArchived = (rel: string): boolean => archivedCollectionIdOf(rel) !== null
-
```

`archiveSegs` keeps its one caller, `outsideContent`, until Task 4-3 takes the store reading.

```Core/Paths/exclusion.ts diff
@@ imports @@
-import { archiveSegs, ASSETS_DIRNAME, NEXUS_DIR, THUMBNAILS_SEGMENT, TRASH_DIR } from './nexusPaths'
+import {
+  archiveSegs,
+  ASSETS_DIRNAME,
+  hiddenFolder,
+  NEXUS_DIR,
+  THUMBNAILS_SEGMENT,
+  TRASH_DIR,
+} from './nexusPaths'
@@ hiddenName, hiddenFolder @@
-export function hiddenName(name: string): boolean {
-  return name.startsWith('.') || name.startsWith('_')
-}
-
-/** A folder the app never enters: hidden behind a leading dot or underscore, or a package cache. */
-export function hiddenFolder(name: string): boolean {
-  return hiddenName(name) || name === 'node_modules'
-}
-
```

```Core/Paths/names.ts diff
@@ imports @@
-import { hiddenFolder, hiddenName } from './exclusion'
 import { isMarkdownFile } from './posix'
-import { type ArchiveStore, CROPS_REL } from './nexusPaths'
+import { CROPS_REL, hiddenFolder, hiddenName } from './nexusPaths'
@@ archiveStoreOf @@
-/** The Archive a Collection id names: the id becomes one folder under the Archive's root, and a sidecar can carry any string as its id. */
-export const archiveStoreOf = (id: string | undefined): ArchiveStore | null =>
-  id !== undefined && holdsName(id) ? { kind: 'archive', id } : null
-
```

```Core/Nexus/governedSweep.ts diff
@@ imports @@
-import { isArchived } from '../Paths/nexusPaths'
+import { storeOf } from '../Paths/bundleLayout'
@@ outsideArchive @@
-/** A file outside the Archive: the only kind a confirmation, a what-changed count, a rename's clash refusal, or a cascade's `pages` names, since nothing displays an archived path. */
-export const outsideArchive = (root: string, file: string): boolean =>
-  !isArchived(relative(root, file))
-
@@ sweepCount @@
 export async function sweepCount(root: string, files: string[], plan: SweepPlan): Promise<number> {
-  const shown = files.filter((file) => outsideArchive(root, file))
+  const shown = files.filter((file) => !storeOf(relative(root, file)))
   return (await sweepGovernedRoots(shown, plan, true)).touched.size
 }
```

```Core/Nexus/cascade.ts diff
@@ imports @@
 import {
   type Rewrite,
   type RewriteText,
-  outsideArchive,
   rootId,
   sweepGovernedRoots,
 } from './governedSweep'
+import { storeOf } from '../Paths/bundleLayout'
@@ CascadeReport @@
-  /** The Nexus paths written outside the Archive, which feed the `pages:changed` push; nothing displays an archived path. */
+  /** The Nexus paths written outside both stores, which feed the `pages:changed` push; nothing displays a stored path. */
   pages: string[]
@@ deleteCascade @@
       hosts: [],
-      pages: [...swept.touched.keys()]
-        .filter((file) => outsideArchive(root, file))
-        .map((file) => relative(root, file)),
+      pages: [...swept.touched.keys()].map((file) => relative(root, file)).filter((rel) => !storeOf(rel)),
     }
@@ renameCascade @@
       pages: [...swept.touched.keys()]
-        .filter((file) => isMarkdownFile(file) && outsideArchive(root, file))
-        .map((file) => relative(root, file)),
+        .map((file) => relative(root, file))
+        .filter((rel) => isMarkdownFile(rel) && !storeOf(rel)),
       hosts: tiles.hosts,
```

```Core/Index/keyHolders.ts diff
@@ imports @@
~import { collectionFolders, rootId } from '../Nexus/governedSweep'
+import { storeOf } from '../Paths/bundleLayout'
@@ findHolders @@
-/** The pages and Spaces holding any of `keys`: … and an archived page, which no clash counts, isn't read. */
+/** The pages and Spaces holding any of `keys`: … and a stored page, which no clash counts, isn't read. */
@@ findHolders @@
     ? await unlessVouched(
         root,
-        reached.filter((file) => outsideArchive(root, file)),
+        reached.filter((file) => !storeOf(relative(root, file))),
         (rel) => !!named && !listed.every((l) => l?.has(rel)),
       )
```

(Only the docstring's "an archived page" becomes "a stored page".)

```Core/Matrix/matrixGraph.ts diff
@@ imports @@
-import { isArchived } from '../Paths/nexusPaths'
+import { storeOf } from '../Paths/bundleLayout'
@@ readMatrixGraph @@
-// … An archived page answers nothing, so it draws no node and no edge.
+// … A stored page answers nothing, so it draws no node and no edge.
@@
-    if (typeof id !== 'string' || isArchived(path)) continue
+    if (typeof id !== 'string' || storeOf(path)) continue
```

(Only the comment's last sentence changes: "An archived page" becomes "A stored page".)

```Core/Nexus/handlers.ts diff
@@ imports @@
-import { isArchived } from '../Paths/nexusPaths'
+import { storeOf } from '../Paths/bundleLayout'
@@ 'index:headings' @@
-    return ok(Object.fromEntries(headings.filter(([path]) => !isArchived(path))))
+    return ok(Object.fromEntries(headings.filter(([path]) => !storeOf(path))))
```

```Core/Nexus/heldPages.ts diff
@@ imports @@
-import { ARCHIVE_DIR_REL, archivedCollectionIdOf } from '../Paths/nexusPaths'
+import { ARCHIVE_DIR_REL } from '../Paths/nexusPaths'
-import { originPathOf } from '../Bundles/layout'
+import { storeOf } from '../Paths/bundleLayout'
@@ nexusPages @@
   for (const [path, { id }] of rows) {
-    const owner = archivedCollectionIdOf(path)
-    if (!id || owner === null) continue
+    const at = storeOf(path)
+    if (!id || !at) continue
     claim(byId, { id, kind: 'page', title: titleFromPath(path), path })
-    const left = originPathOf(root, { kind: 'archive', id: owner }, join(root, path))
-    archived.push(connPage(id, left))
+    archived.push(connPage(id, at.origin))
   }
```

```Core/Nexus/treePatch.ts diff
@@ imports @@
-  archiveDirRel,
-  archivedCollectionIdOf,
@@
-import { archiveStoreOf } from '../Paths/names'
+import { archiveDirRel, archiveStoreOf, storeOf } from '../Paths/bundleLayout'
@@ owningCollection @@
   const path = typeof of === 'string' ? of : of.path
-  const filed = archivedCollectionIdOf(path)
+  const at = storeOf(path)
+  const filed = at?.store.kind === 'archive' ? at.store.id : undefined
   const top = path.split('/', 1)[0]
-  return tree?.collections.find((c) => (filed === null ? c.path === top : c.id === filed))
+  return tree?.collections.find((c) => (at ? c.id === filed : c.path === top))
 }
```

▸ Phases 2 and 3 also rewrite `deleteOp` and `fromArchive`. This hunk touches the store test and the origin reads alone.

```Core/Trash/delete.ts diff
@@ imports @@
-import { isArchived } from '../Paths/nexusPaths'
-import { originPathOf } from '../Bundles/layout'
+import { originPathOf, storeOf } from '../Paths/bundleLayout'
@@ fromArchive @@
-  if (!isArchived(req.path)) return null
+  if (storeOf(req.path)?.store.kind !== 'archive') return null
@@
-    origin: join(root, originPathOf(root, store, abs)),
+    origin: join(root, originPathOf(root, abs)),
     under: pages.map((file) => relative(root, file)),
-    keys: pages.map((file) => originPathOf(root, store, file)),
+    keys: pages.map((file) => originPathOf(root, file)),
```

**VERIFY**

- [ ] The four new `storeOf` cases are green.
- [ ] `git grep -nwE "archivedCollectionIdOf|isArchived|outsideArchive|stampedSegment" -- Core Desktop` prints nothing, and neither does `git grep -n "Bundles/layout" -- Core Desktop`; `git grep -nE "originPa(thOf|gesOf)\(root, (store|to|from|named\.store)," -- Core` prints nothing.
- [ ] `git grep -nw archiveSegs -- Core ':!*.test.ts'` prints only `nexusPaths.ts` and `exclusion.ts`.
- [ ] `git grep -nE "function hidden(Name|Folder)" -- Core` prints only `nexusPaths.ts`; the typecheck proves no importer still reads them from `exclusion`.
- [ ] **Flips:** none; `layout.test.ts`'s `originPathOf` cases change their calls alone, as CHANGE names.
- [ ] Run the gates.
- [ ] Check for unnecessary code or mistakes.

#### Task 4-2

**TASK:** Trashed Spaces become holders. A stored-Space source in `heldPages.ts` reads the Spaces the Trash holds, a trashed Context's included, from their own sidecars. It feeds `byId` under the claim rule and, through the `stored` list `nexusPages` hands back with `byId`, feeds `spaceFiles`, so every holder query, Space strip, and by-id write reaches them, listing the Trash once each. The pass-over keeps a trashed copy that shares a live root's id out of the strip, silently, since the live twin holds what the strip takes and nothing is left to owe, and the Context and Space finishes leave the bundle their folder moved into. This closes B-3. The stash schema moves into the property model first: the stored-Space source's import of `bundle.ts` pulls `bundle.ts` and `record.ts` into the import cycle around `liveTree.ts`, where `record.ts`'s schema would read `stashBlock` from a `propertyStash.ts` still evaluating.

**NOW:**
- `stashBlock` and `StashBlock` live in `propertyStash.ts:11-17`, beside the stash's functions. That file reaches `liveTree.ts` twice, through `heldTreeOf` (`:7`) and through `settings.ts` (`:8`), which `liveTree.ts`'s cycle already holds. `recordFile`'s property arm reads `stashBlock` at the top level (`record.ts:4`, read in `stashes`); `deleteProperty.ts:4`, `assignment.test.ts:2`, and `unassignProperty.test.ts:29` import the type. `properties.ts`, the property model, imports `zod`, `decoders`, `linkValue`, `ids`, and `keyFormat` (`:3-8`), and its imports' closure reaches nothing in the cycle.
- `spaceFiles` lists the tree's Spaces alone (`keyHolders.ts:69-75`), which its three holder sites read (`keyHolders.ts:97`, `cascade.ts:128,263`). Two of them already read `nexusPages`: `linkStrip` always (Phase 3's, from `cascade.ts:107`), `findHolders` with `read` (`keyHolders.ts:106`); `renameCascade` reads none.
- `deleteCascade` counts every holder `addressable` refuses as held out and owed (`cascade.ts:133-136`, Phase 3's `heldOut`), which is right for a root carrying no ID or one of two claiming it, the cases no restore could put a value back on.
- `contextCascade.test.ts` calls `unlinkContextKey` and `unlinkSpaceValue` with a folder string as the last argument twelve times (`:123,127,247,652,662,672,679,694,709,729,742,818`); `deleteOrder.test.ts:49,53` spread their arguments through.
- Trashed Spaces are read only by `trashedHolders`' Space and Context arms (`trashedCopies.ts:70-76`), from `refillTrashed` and `refillStash`'s splice.
- `addressable` asks only that an id is held and not null (`heldPages.ts:61-64`). It's read by the strip (`cascade.ts:133`), by the holder capture (`keyHolders.ts:125`), and by `sweepRootsById` (`governedSweep.ts:112`), which builds its file list from the root by hand (`:104-108`).
- `unlinkMembers` skips only the live folder (`contextCascade.ts:100-110`), called with `dir` and `under(old)` from `finishOwed.ts:319,369` after `leave` moved the folder into `e.bundle`.
- B-3: a property gone for good stays on trashed Spaces (`finishOwed.ts:176-183` lists pages and Collections alone).
- The path rule in `addressable` is safe for `findHolders`' `moved`: the only caller passing `moved` is `titleHolders` (`contextCascade.ts:48-58`), which reads `.files` without `'values'`, so no capture compares a moved sidecar against the tree's old path. `posix.join` drops an empty segment (`posix.ts:23-28`), so `listBundles`' default `chain` walks the store root.

**CHANGE**

- [ ] Move `stashBlock` and `StashBlock` from `propertyStash.ts` into `properties.ts`, ahead of the stored-Space source's import of `bundle.ts`, and re-point `record.ts`, `deleteProperty.ts`, `assignment.test.ts`, and `unassignProperty.test.ts` (the first six hunks below). `propertyStash.ts` keeps `stashedBlock`, `patchStashBlock`, and `sweepStashes`, and imports the schema it reads.
- [ ] Write these and watch each fail:
  - **`restoreProperty.test.ts`, "a property deleted while a Space sat in the Trash leaves the trashed Space and returns to it with its restore" (B-3, B-2 for Spaces):** a Space holding `Priority: hi` is trashed. Deleting the property leaves the trashed sidecar without `Priority`, and the property's record holds `{ [spaceId]: 'hi' }`. Restoring the property, then the Space, returns `Priority: hi`. It fails today because the trashed sidecar keeps the key.
  - **`deleteReach.test.ts`, "a Context delete leaves its own Spaces' tags of each other in its bundle":** Space `Areas/Home` holds `<Areas>: [Work]` beside `Areas/Work`. Deleting `Areas` leaves the bundle's `Home/_space.json` byte-identical, and restoring it returns the tag. It fails without `unlinkMembers`' bundle in `left`.
  - **`deleteReach.test.ts`, beside `:133`, "a trashed Space sharing a live Space's id is passed over by the strip silently, neither skipped nor owed":** copy a live Space's sidecar into a hand-made Space bundle (`mintBundle` plus a Space record), both holding `Related: "[[Target]]"`. Deleting `Target` strips the live sidecar and leaves the trashed copy byte-identical; the reply carries no warning, the bundle's `links` hold the live Space's value alone, and after `finishOwed` the notes are empty. It fails without the pass-over, because the copy is stripped under the live id, and with the twin counted, because the reply warns `unsweptLine(1)` and Try Again stays owed.
  - **`heldPages.test.ts`, "nexusPages — the Trash's Spaces":**
    - "holds a trashed Space at its bundle path, and a trashed Context's Spaces under it."
    - "a live Space sharing a trashed Space's id keeps its entry, and the trashed one fills no null."
- [ ] Apply the AFTER.
- [ ] `contextCascade.test.ts`'s twelve unlink calls wrap their folder in a list, their expectations unchanged: `pomDir()` → `[pomDir()]`, `classesDir()` → `[classesDir()]`, `projectsDir()` → `[projectsDir()]`, and `:672`'s `join(contextsDir(root), 'Classes', '2024')` → `[join(contextsDir(root), 'Classes', '2024')]`.
- [ ] In `NexusRecordPM.md:12`, "the Spaces the tree shows naming them" (in Task 3-2's sentence) becomes "the Spaces the tree and the Trash hold naming them".

**AFTER**

The stash schema moves into the property model, the one module a Collection sidecar's `property_stash` and a property record's `stashes` both read it from, and `record.ts`'s top-level read lands on a module outside the cycle wherever the cycle is entered:

```Core/Properties/properties.ts diff
@@ CountedChange @@
 export type CountedChange = z.infer<typeof countedChange>
 
+/** One property's stashed values by page id, when they were removed, and, per page, the key its line stood above; a malformed `above` reads as none. */
+export const stashBlock = z.object({
+  removed_at: z.string(),
+  values: z.record(z.string(), z.unknown()),
+  above: z.record(z.string(), z.string()).optional().catch(undefined),
+})
+export type StashBlock = z.infer<typeof stashBlock>
+
 // A display-setting write decodes against the definition's own fields, so it can patch nothing else: a key absent from the patch is left, and a present-but-invalid one goes back to its default.
```

```Core/Properties/propertyStash.ts diff
@@ imports @@
-import { z } from 'zod'
 import { isPlainObject } from '../Contract/validators'
@@
 import type { CollectionNode } from '../Nexus/tree'
+import { stashBlock, type StashBlock } from './properties'
@@ stashBlock @@
-/** One property's stashed values by page id, when they were removed, and, per page, the key its line stood above; a malformed `above` reads as none. */
-export const stashBlock = z.object({
-  removed_at: z.string(),
-  values: z.record(z.string(), z.unknown()),
-  above: z.record(z.string(), z.string()).optional().catch(undefined),
-})
-export type StashBlock = z.infer<typeof stashBlock>
-
 export function stashedBlock(
```

```Core/Bundles/record.ts diff
@@ imports @@
 import { isPlainObject } from '../Contract/validators'
-import { stashBlock } from '../Properties/propertyStash'
+import { stashBlock } from '../Properties/properties'
```

```Core/Properties/deleteProperty.ts diff
@@ imports @@
 import { assignedIds } from '../Nexus/containerFields'
~import { stashedBlock, patchStashBlock } from './propertyStash'
+import type { StashBlock } from './properties'
```

```Core/Properties/assignment.test.ts diff
@@ imports @@
-import type { StashBlock } from './propertyStash'
@@
~import type { PropertyDefinition, StashBlock } from './properties'
```

```Core/Properties/unassignProperty.test.ts diff
@@ imports @@
~import type { PropertyDefinition, StashBlock } from './properties'
-import type { StashBlock } from './propertyStash'
```

```Core/Nexus/heldPages.ts diff
@@ imports @@
-import { ARCHIVE_DIR_REL } from '../Paths/nexusPaths'
+import { ARCHIVE_DIR_REL, CONTEXTS_DIR_REL } from '../Paths/nexusPaths'
~import { dirname, join, relative, titleFromPath } from '../Paths/posix'
+import { sidecarPath } from '../Paths/paths'
+import { readJsonObject } from '../Files/atomicWrite'
+import { spaceNodeFrom, spaceSidecarsIn } from '../Contexts/spaceSidecar'
+import { listBundles } from '../Bundles/bundle'
+import type { SpaceNode } from './tree'
@@ NexusPages @@
 export interface NexusPages {
   byId: ReadonlyMap<string, EntityRecord | null>
   archived: readonly ConnPage[]
+  stored: readonly SpaceNode[]
 }
@@ addressable @@
-/** Whether `byId` addresses the one file carrying `id`: not where the file carries no ID, nor where two files claim it, so no strip files a value under it and no refill writes it. */
-export const addressable = (
-  byId: ReadonlyMap<string, unknown>,
-  id: string | undefined,
-): id is string => id !== undefined && byId.get(id) !== null
+export const rootFile = (root: string, at: Pick<EntityRecord, 'kind' | 'path'>): string =>
+  at.kind === 'space' ? sidecarPath(join(root, at.path), 'space') : join(root, at.path)
+
+/** Whether `byId` addresses `file` by the `id` it carries: not where the file carries no ID, where two files claim it, or where the one root `byId` holds for it is another file, a trashed copy of a live root's among them; an id `byId` doesn't hold yet, as a page the tree hasn't patched in, stays addressable. So no strip files a value under the wrong root and no refill writes it. */
+export const addressable = (
+  root: string,
+  byId: ReadonlyMap<string, Pick<EntityRecord, 'kind' | 'path'> | null>,
+  id: string | undefined,
+  file: string,
+): id is string => {
+  const at = id === undefined ? null : byId.get(id)
+  return at !== null && (at === undefined || rootFile(root, at) === file)
+}
@@ nexusPages @@
     archived.push(connPage(id, at.origin))
   }
-  return { byId, archived }
+  const stored = await storedSpaces(root)
+  for (const { id, kind, title, path } of stored)
+    if (!byId.has(id)) byId.set(id, { id, kind, title, path })
+  return { byId, archived, stored }
 }
@@ linkWorld @@
+export async function storedSpaces(root: string): Promise<SpaceNode[]> {
+  const spaces: SpaceNode[] = []
+  const trashed = await listBundles(root, { kind: 'trash' }, CONTEXTS_DIR_REL)
+  for (const { bundlePath, record, artifactName } of trashed) {
+    if (!artifactName) continue
+    const artifact = join(root, bundlePath, artifactName)
+    const held =
+      record.entity === 'context'
+        ? (await spaceSidecarsIn(artifact)).map((s) => ({ ...s, contextId: record.registry.id }))
+        : record.entity === 'space' && record.parent.kind === 'context'
+          ? [{ name: artifactName, file: sidecarPath(artifact, 'space'), contextId: record.parent.id }]
+          : []
+    for (const { name, file, contextId } of held) {
+      const sc = await readJsonObject(file)
+      const at = { title: name, path: relative(root, dirname(file)), contextId }
+      const space = sc && spaceNodeFrom(sc, at)
+      if (space) spaces.push(space)
+    }
+  }
+  return spaces
+}
```

`NexusPages`' doc gains, after "an archived one at the path a writer opens", the clause "and every Space the Trash holds, a trashed Context's among them, read from its own sidecar, since the index holds pages alone; a trashed one fills only an id nothing else claims, and `stored` lists them, so a reach reads the Trash's Spaces once". Task 4-3 gives the doc its full text. The AFTER adds no comment: `storedSpaces` and `rootFile` read by their names beside that doc.

**Departure, Disclosed:** *§The Rules*, 2 reads strictly ("address a file only when `byId.get(id)?.path` is that file"). `addressable` keeps an id `byId` doesn't hold yet addressable, as a page the tree hasn't patched in is today, and passes over only a root `byId` holds elsewhere. The strict reading would newly hold out every page whose tree patch lags its index row. The pass-over's purpose is met by the lenient reading. The trashed refill's Space and Context arms (`trashedHolders`, `trashedCopies.ts:70-76`) go dead here, since trashed Spaces now sit in `byId`. Task 4-6 removes the function whole.

▸ Phase 3 also edits `listBundles`' callers, and M-11 its Archive walks. This hunk adds the chain parameter alone.

```Core/Bundles/bundle.ts diff
@@ listBundles @@
-export async function listBundles(root: string, store: BundleStore): Promise<ListedBundle[]> {
+export async function listBundles(
+  root: string,
+  store: BundleStore,
+  chain = '',
+): Promise<ListedBundle[]> {
   const { dir, suffix } = layoutOf(store)
@@
-  await walk(join(root, dir))
+  await walk(join(root, dir, chain))
   return out
```

```Core/Index/keyHolders.ts diff
@@ imports @@
-import { addressable, type NexusPages, nexusPages } from '../Nexus/heldPages'
+import { addressable, type NexusPages, nexusPages, storedSpaces } from '../Nexus/heldPages'
@@ spaceFiles @@
-/** The sidecar of each Space the tree holds that `holds` answers for, at the folder `moved` sent it to when the tree still lists the one it left. */
+/** The sidecar of each Space the tree or `stored` holds that `holds` answers for, a tree Space at the folder `moved` sent it to when the tree still lists the one it left. */
 export const spaceFiles = (
   root: string,
   tree: NexusTree,
+  stored: readonly SpaceNode[],
   holds: (space: SpaceNode) => boolean,
   moved?: FolderMove,
 ): string[] =>
-  tree.contexts.flatMap((g) => g.spaces.filter(holds).map((s) => sidecarAt(root, s.path, moved)))
+  [...tree.contexts.flatMap((g) => g.spaces), ...stored]
+    .filter(holds)
+    .map((s) => sidecarAt(root, s.path, moved))
@@ findHolders @@
+  const known = read ? await nexusPages(root, tree) : null
   const spaces =
     typeof q.reach === 'string'
       ? [
-          ...spaceFiles(root, tree, holds, q.moved),
+          ...spaceFiles(root, tree, known?.stored ?? (await storedSpaces(root)), holds, q.moved),
@@
   const files = [...pages, ...spaces]
-  if (!read) return { files, held: [] }
-  return readHolders(root, files, q.keys, (await nexusPages(root, tree)).byId, listed)
+  if (!known) return { files, held: [] }
+  return readHolders(root, files, q.keys, known.byId, listed)
@@ readHolders @@
-    const addressed = addressable(byId, id) ? id : null
+    const addressed = addressable(root, byId, id, file) ? id : null
```

```Core/Nexus/cascade.ts diff
@@ imports @@
-import { addressable, nexusPages } from './heldPages'
+import { addressable, nexusPages, storedSpaces } from './heldPages'
@@ linkStrip @@
-  const { byId, archived } = await nexusPages(root, tree)
+  const { byId, archived, stored } = await nexusPages(root, tree)
@@
-    ...spaceFiles(root, tree, (s) => !!s.values && named(s.values).length > 0),
+    ...spaceFiles(root, tree, stored, (s) => !!s.values && named(s.values).length > 0),
@@ deleteCascade @@
       raw: (raw, file) => {
         const named = strip.named(raw)
-        if (named.length && !addressable(strip.byId, rootId(file, raw))) {
-          heldOut++
+        const id = rootId(file, raw)
+        if (named.length && !addressable(root, strip.byId, id, file)) {
+          if (id === undefined || strip.byId.get(id) === null) heldOut++
           return null
         }
@@ renameCascade @@
-      ...spaceFiles(root, tree, (s) => !!s.values && spaceMoved(s.values, '') !== null),
+      ...spaceFiles(
+        root,
+        tree,
+        await storedSpaces(root),
+        (s) => !!s.values && spaceMoved(s.values, '') !== null,
+      ),
```

`findHolders` reads the Trash's Spaces once: with `read`, from the `nexusPages` its pass-over reads anyway, and without it, only when its reach takes Spaces. `deleteCascade`'s docstring (Phase 3's) gains, after "since no restore could put it back", the clause "; a stored copy of a root `byId` addresses elsewhere is passed over unreported, since its live twin holds what the strip takes", so the second count reads where a reader meets it.

`sweepRootsById` is folded onto `rootFile`, the one spelling of "the file a root's writer opens":

```Core/Nexus/governedSweep.ts diff
@@ imports @@
-import { addressable } from './heldPages'
+import { addressable, rootFile } from './heldPages'
@@ sweepRootsById @@
   const files = Object.keys(values).flatMap((id) => {
     const at = roots.get(id)
-    if (at?.kind === 'page') return [join(root, at.path)]
-    return at?.kind === 'space' ? [sidecarPath(join(root, at.path), 'space')] : []
+    return at?.kind === 'page' || at?.kind === 'space' ? [rootFile(root, at)] : []
   })
   const swept = await sweepGovernedRoots(files, {
     raw: (raw, file) => {
       const id = rootId(file, raw)
-      if (!addressable(roots, id) || !Object.hasOwn(values, id)) return null
+      if (!addressable(root, roots, id, file) || !Object.hasOwn(values, id)) return null
```

(Drop `sidecarPath`'s import if nothing else in `governedSweep.ts` reads it: `collectionFolders` doesn't.)

```Core/Contexts/contextCascade.ts diff
@@ unlinkContextKey @@
   contextId: string | undefined,
-  skipUnder: string,
+  left: readonly string[],
 ): Promise<ConfigReach> {
@@
-  return unlinkMembers(root, { keys: [key], id: contextId }, rewrite, skipUnder)
+  return unlinkMembers(root, { keys: [key], id: contextId }, rewrite, left)
@@ unlinkSpaceValue @@
   spaceTitle: string,
-  skipUnder: string,
+  left: readonly string[],
 ): Promise<ConfigReach> {
@@
-  return unlinkMembers(root, { keys: [key], title: spaceTitle }, take, skipUnder)
+  return unlinkMembers(root, { keys: [key], title: spaceTitle }, take, left)
 }
 
-// What sits under `skipUnder` left with the deleted folder, which the tree may still list at its old path until the walk, so it's neither swept nor owed.
+// What sits under `left` left with the deleted folder, at its old path the tree may still list until the walk and in the bundle it moved into, so it's neither swept nor owed.
 async function unlinkMembers(
@@
-  skipUnder: string,
+  left: readonly string[],
 ): Promise<ConfigReach> {
   const { files } = await findHolders(root, { ...holding, reach: 'anywhere' })
-  const kept = files.filter((file) => !isAtOrUnder(file, skipUnder))
+  const kept = files.filter((file) => !left.some((at) => isAtOrUnder(file, at)))
```

▸ Phases 2 (L-1) and 3 (M-8) also rewrite `finishContext` and `finishSpace`. This hunk adds the bundle to the two `left` lists. `bundle` stays optional on both entries, since a rename's carries none, and a strip's entry always carries it, which Phase 3's `leave` calls assert (`e.bundle!`); the lists assert it the same way.

```Core/Nexus/finishOwed.ts diff
@@ finishContext @@
-      return unlinkContextKey(root, old, id, dir)
+      return unlinkContextKey(root, old, id, [dir, join(root, e.bundle!)])
@@ finishSpace @@
-    (old) => unlinkSpaceValue(root, group.def.title, old, under(old)),
+    (old) => unlinkSpaceValue(root, group.def.title, old, [under(old), join(root, e.bundle!)]),
```

**VERIFY**

- [ ] The four new cases are green, and each is watched red with its hunk reverted.
- [ ] **Flips:** `restoreScrub.test.ts:553`, "keeps a passenger tag whose Space died while the subtree sat in the trash, as a live write does". Work's delete now strips trashed Sapphire's `<Areas>` and records Sapphire among its `members`. Rewrite it as "a trashed Space loses a tag of a Space deleted meanwhile and takes it back with that Space's restore": after the Projects restore, `sap['<Areas>']` is undefined; after Work's restore, it's `['Work']`. `contextCascade.test.ts`'s twelve unlink calls change as CHANGE names, every expectation holding.
- [ ] `git grep -n "skipUnder" -- Core` prints nothing, and `git grep -n "stashBlock\|StashBlock" -- Core` shows the schema defined in `properties.ts` alone, with no file importing it from `propertyStash`.
- [ ] Run the gates (`npm run typecheck`, `npm run test`, `npm run lint`). `assignment.test.ts`, `governedWorldWrite.test.ts`, `repairSweep.test.ts`, and `deleteOrder.test.ts` are the suites that break without the move: each enters the cycle through `propertyStash.ts` (`deleteOrder.test.ts` by way of `mutate.ts` and `assignment.ts`), so `record.ts` evaluates before it finishes. Native module evaluation throws a ReferenceError at that read; vitest's module runner answers it `undefined`, and `recordFile` then refuses every property record holding `stashes`.
- [ ] Check for unnecessary code or mistakes.

#### Task 4-3

**TASK:** The Trash is admitted, as the Archive is, and watched. `outsideContent` reads a path inside either store past the store's dotted root: a page is content there only inside a stamped bundle, and the asset root and exclusion judge it by where it lived. `contentRoots` gains `.trash`, and `listInner` reads the same rule. Trashed pages join `byId` under the claim rule and stay out of `archived`. The watcher's ignore rule judges a `.trash` path by what's below it, as Sync's manifest does. This closes B-8, and the restore's Link refill now writes trashed holders through `byId` and names a miss (Decision D-5).

**NOW:**
- `outsideContent` exempts only the Archive and judges it by its store path (`exclusion.ts:62-68`).
- `contentRoots` is the root and `.nexus/archive` (`walk.ts:42-43`).
- `listInner` judges inner items by their origin (`bundle.ts:331-335`), the index by the store path: B-8's two readings, with the stray `.nexus/archive/<ID>/loose.md` indexed.
- `nexusPages` reads the Archive's rows alone (`heldPages.ts:73-85`) through `archivedPageIds` (`:94-103`, and `fileHistory.ts:200`).
- `syncIgnoredUnder` drops every `.trash` path through `neverWatched` (`watcher.ts:55-66`).
- `tap.ts:50` already drops watched `.trash` events and stays as it is. The tree patch already ignores every path below a hidden folder (`fileEvents.ts:256`), so it takes no change.

**CHANGE**

- [ ] Write these and watch each fail:
  - **`exclusion.test.ts`, `describe('outsideContent')`, "admits a page inside either store's bundle, hides one beside the bundles, and judges a stored page where it lived" (B-8):**
    - `.trash/Notes/<stamp>__A.md.deleted/A.md` → null.
    - `.trash/Notes` → null.
    - `.trash/Notes/<stamp>__x.md` → `'hidden'`.
    - `.trash/<stamp>__A.md.deleted/_record.json` → `'hidden'`.
    - `.nexus/archive/C1/loose.md` → `'hidden'`.
    - `.trash` → `'hidden'`.
    - `.trash/Notes/<stamp>__P.md.deleted/P.md` under `scope(['Notes'])` → `'excluded'`.
    - `.nexus/archive/C1/Notes/<stamp>__P.md.archived/P.md` under `scope(['Notes'])` → `'excluded'`.
  - **`heldPages.test.ts`, `describe('nexusPages — the Trash by id')`** (the claim rule; trashed rows indexed through `indexWrittenPages` as `archive()` does):
    - "holds a trashed page at its store path and leaves it out of `archived`."
    - "a live page sharing a trashed page's id keeps its entry."
    - "an archived page sharing it keeps its entry."
    - "of two trashed copies of one id the first listed claims it and neither nulls it."
    - "reads the Trash off disk where no index store opened."
  - **`spend.test.ts`, beside `:1974`, "of two trashed copies of one id the first restores and the second is refused as live" (Decision D-2).**
  - **`restoreProperty.test.ts`, "a property restore returns a value to a page that sat in the Trash through it" (B-2):** page A holds P; P is deleted; A is deleted; P is restored. A's trashed copy holds its value, and A's restore returns it.
  - **`deleteReach.test.ts`, "a trashed bundle removed by hand leaves the index, and a cascade after it owes nothing":** trash a page holding `Related: "[[Target]]"` with `memoryStores` seeded, `rm` the bundle, `applyEvents` a watched `unlinkDir` of it, `settleNow`, then delete `Target`. The reply carries no warning and the notes are empty. It fails today because the row stays and the sweep reads the missing file as skipped.
  - **`watcher.test.ts:671`**, rewritten from "still refuses .trash" to "watches the Trash's contents and refuses what's hidden or excluded below it, as Sync's manifest does":
    - `/nexus/.trash/Notes/<stamp>__A.md.deleted/A.md` → false.
    - `/nexus/.trash/Notes/.DS_Store` → true.
    - `/nexus/.trash/Hidden/x.md` under `excluded: ['Hidden']` → true.
- [ ] Apply the AFTER.
- [ ] Rewrite `CorePM.md:74`'s clause "and `.nexus/archive` is a hidden folder the content index and every cascade reach into while the tree leaves it out" as "and `.nexus/archive` and `.trash` are hidden folders whose bundles the content index and every cascade reach into while the tree leaves them out". In the same paragraph, change "a property sweep reaches only Collections and the Archive" to "a property sweep reaches only Collections and what both stores hold of them".

**AFTER**

```Core/Paths/exclusion.ts diff
@@ imports @@
 import {
-  archiveSegs,
   ASSETS_DIRNAME,
   hiddenFolder,
   NEXUS_DIR,
   THUMBNAILS_SEGMENT,
   TRASH_DIR,
 } from './nexusPaths'
+import { storeOf } from './bundleLayout'
+import { isMarkdownFile } from './posix'
@@ outsideContent @@
-/** What keeps a nexus-relative path outside the content the app reads, or null: a hidden folder or name on the way, counted below `.nexus/archive` for a path inside it (the Archive is the one hidden folder read as content), the asset root (which holds files rather than content while remaining watched), or an excluded folder. */
+/** What keeps a nexus-relative path outside the content the app reads, or null: a hidden folder or name on the way, the asset root (which holds files rather than content while remaining watched), or an excluded folder. A path inside a store is read past the store's dotted root, a page there is content only inside a stamped bundle, and the asset root and exclusion judge it where it lived, so nothing a store holds beside its bundles is read. */
 export function outsideContent(rel: string, scope: WatchScope): OutsideReason | null {
+  const stored = storeOf(rel)
   const segs = rel.split('/')
-  if ((archiveSegs(segs) ?? segs).some(hiddenFolder)) return 'hidden'
-  if (assetMatcher(scope.assetDir)(segs)) return 'asset'
-  return excludedMatcher(scope.excluded)(segs) ? 'excluded' : null
+  const hidden = stored
+    ? segs.slice(1).some(hiddenFolder) || (isMarkdownFile(rel) && !stored.bundle)
+    : segs.some(hiddenFolder)
+  if (hidden) return 'hidden'
+  const lived = stored ? stored.origin.split('/') : segs
+  if (assetMatcher(scope.assetDir)(lived)) return 'asset'
+  return excludedMatcher(scope.excluded)(lived) ? 'excluded' : null
 }
```

```Core/Paths/nexusPaths.ts diff
@@ archiveSegs @@
-export const archiveSegs = (segs: string[]): string[] | null =>
-  `${segs[0]}/${segs[1]}` === ARCHIVE_DIR_REL ? segs.slice(2) : null
-
```

```Core/Files/walk.ts diff
@@ imports @@
-import { ARCHIVE_DIR_REL, hiddenFolder, hiddenName, SIDECARS } from '../Paths/nexusPaths'
+import { ARCHIVE_DIR_REL, hiddenFolder, hiddenName, SIDECARS, TRASH_DIR } from '../Paths/nexusPaths'
@@ contentRoots @@
-/** The Nexus root, then its Archive: the one hidden folder read as content, which the root's own walk prunes with `.nexus`. */
-const contentRoots = (root: string): string[] => [root, join(root, ARCHIVE_DIR_REL)]
+/** The Nexus root, then its two stores, hidden folders whose bundles are read as content and which the root's own walk prunes. */
+const contentRoots = (root: string): string[] => [
+  root,
+  join(root, ARCHIVE_DIR_REL),
+  join(root, TRASH_DIR),
+]
```

▸ Phase 3 also edits `bundle.ts`. The `listInner` fold: inner items read the index's one rule.

```Core/Bundles/bundle.ts diff
@@ listInner @@
   const entries = (await listEntries(folder)).filter(
     (e) =>
       (e.kind === 'dir' || isContentFile(e)) &&
-      !outsideContent(originPathOf(root, join(folder, e.name)), scope),
+      !outsideContent(relative(root, join(folder, e.name)), scope),
   )
```

```Core/Nexus/heldPages.ts diff
@@ header @@
-// The held tree's pages by path and by id, for the host's writers, and the one projection that adds the Archive's pages to the tree's entities, for every refill and every frozen world.
+// The held tree's pages by path and by id, for the host's writers, and the one projection that adds what both stores hold to the tree's entities, for every by-id write and every link world.
@@ imports @@
-import { ARCHIVE_DIR_REL, CONTEXTS_DIR_REL } from '../Paths/nexusPaths'
+import { ARCHIVE_DIR_REL, CONTEXTS_DIR_REL, TRASH_DIR } from '../Paths/nexusPaths'
@@ NexusPages @@
-/** `byId` holds every entity the tree holds and every page the Archive holds, an archived one at the path a writer opens, and null where two files claim one id, so neither is addressed by it; `archived` holds the Archive's pages at the paths they left, where a link written before they left still names them. */
+/** `byId` holds every entity the tree holds and every page and Space a store holds, a stored one at the path a writer opens, and null where two files of the tree or the Archive claim one id, so neither is addressed by it; a trashed one fills only an id nothing else claims, so a live or archived root sharing it stays addressable. `archived` holds the Archive's pages at the paths they left, where a link written before they left still names them; the Trash's stay out, so a link naming a trashed page reads gone. `stored` lists the Trash's Spaces, read from their own sidecars since the index holds pages alone, so a reach reads them once. */
 export interface NexusPages {
@@ nexusPages @@
 export async function nexusPages(root: string, tree: NexusTree): Promise<NexusPages> {
-  const rows = await archivedPageIds(root, tree)
   const byId: ById = new Map(entitiesById(tree))
   const archived: ConnPage[] = []
-  for (const [path, { id }] of rows) {
+  for (const [path, { id }] of await storedPageIds(root, tree, ARCHIVE_DIR_REL)) {
     const at = storeOf(path)
     if (!id || !at) continue
     claim(byId, { id, kind: 'page', title: titleFromPath(path), path })
     archived.push(connPage(id, at.origin))
   }
   const stored = await storedSpaces(root)
-  for (const { id, kind, title, path } of stored)
+  const trashed = [...(await storedPageIds(root, tree, TRASH_DIR))].flatMap(([path, { id }]) =>
+    id ? [{ id, kind: 'page' as const, title: titleFromPath(path), path }] : [],
+  )
+  for (const { id, kind, title, path } of [...trashed, ...stored])
     if (!byId.has(id)) byId.set(id, { id, kind, title, path })
   return { byId, archived, stored }
 }
@@ archivedPageIds @@
-export async function archivedPageIds(
+export async function storedPageIds(
   root: string,
   tree: NexusTree,
+  dir: typeof ARCHIVE_DIR_REL | typeof TRASH_DIR,
 ): Promise<ReadonlyMap<string, { id?: string }>> {
-  const indexed = indexReady() ? readIndexedStats(ARCHIVE_DIR_REL) : null
+  const indexed = indexReady() ? readIndexedStats(dir) : null
   if (indexed) return indexed
-  const rels = await corpusFilesUnder(root, join(root, ARCHIVE_DIR_REL), scopeOf(tree.config))
+  const rels = await corpusFilesUnder(root, join(root, dir), scopeOf(tree.config))
```

```Core/Pages/fileHistory.ts diff
@@ imports @@
-import { archivedPageIds, idHeld, liveIdOf, livePathOf } from '../Nexus/heldPages'
+import { idHeld, liveIdOf, livePathOf, storedPageIds } from '../Nexus/heldPages'
+import { ARCHIVE_DIR_REL } from '../Paths/nexusPaths'
@@ sweepFileHistory @@
-      ? [...(await archivedPageIds(root, tree)).values()].flatMap(({ id }) =>
+      ? [...(await storedPageIds(root, tree, ARCHIVE_DIR_REL)).values()].flatMap(({ id }) =>
```

```Core/Bundles/placement.ts diff
@@ heldElsewhere @@
-/** An id `byId` holds anywhere but inside the restoring bundle is live, and a twin (null) always is; only an archived page's own file sits inside its bundle, since the map holds no Set ids. */
+/** An id `byId` holds anywhere but inside the restoring bundle is live, and a twin (null) always is; only a stored page's or Space's own file sits inside its bundle, since the map holds no stored container ids. */
```

```Desktop/FileWatch/watcher.ts diff
@@ imports @@
   NEXUS_DIR,
   nexusConfigRel,
+  TRASH_DIR,
 } from '@pommora/core/Paths/nexusPaths'
@@ syncIgnoredUnder @@
     const segs = rel.split('/')
     if (isAsset(segs)) return neverWatched(segs.slice(assetDepth))
+    if (segs[0] === TRASH_DIR) return neverWatched(segs.slice(1)) || isExcluded(segs.slice(1))
     return neverWatched(segs) || isExcluded(segs)
```

The watcher's comment above `syncIgnoredUnder` ("We DO watch .nexus/ — Contexts and settings/state live there. …") becomes "We DO watch .nexus/, where Contexts and settings/state live, and the Trash, indexed content judged by what's below it as Sync's manifest judges it, though Sync learns it from the write tap alone (`tap.ts`). Checks only the path BELOW the root, so a dot-segment in the root's own absolute path (a nexus under ~/.something) can't blank the whole watch." That's one comment rewritten and none added: `storedPageIds` is the undocumented `archivedPageIds` renamed.

**Departure, Disclosed:** the mandate's "the tree patch ignoring `.trash` events through the store rule" takes no code. `classifyEvent` already ignores every path below a hidden folder and the `.trash` folder itself (`fileEvents.ts:256,268`), so an explicit `storeOf` arm would be a guard against an event that can't arrive. The new `walk.test.ts` and `deleteReach.test.ts` cases drive watched `.trash` events and prove the tree unchanged. Also, `.nexus/archive` itself now reads `'hidden'`, as each store root does; nothing reads it as content, since the corpus walk starts below it.

**VERIFY**

- [ ] The new cases are green, and each is watched red with its hunk reverted.
- [ ] **Flips:**
  - `exclusion.test.ts:37`: `outsideContent('.nexus/archive')` now answers `'hidden'`, its store root. The expectation changes; `:38-44` hold.
  - `exclusion.test.ts:173-179`, `archiveSegs`' case, leaves with the function.
  - `walk.test.ts:77`, "never reads inside `.trash`, …", becomes "reads the Trash's bundles alone, never a leftover beside them, `.nexus` outside its Archive, or an excluded folder". It adds a page in `.trash/Notes/<stamp>__k.md.deleted/k.md` to the listing, and `opened` becomes `['', 'sub', '.nexus/archive', '.trash', '.trash/deep']`.
  - `walk.test.ts:91`, `sidecarsUnder`'s case, is retitled "… under every content root …"; its expectations hold, since no trashed sidecar is seeded.
  - `indexMaintenance.test.ts:197`, "a delete clears the rows", is retitled "a delete moves its rows under its bundle", and its expectations hold.
  - `indexMaintenance.test.ts:218`'s title becomes "a Set delete moves every row beneath it under its bundle; its restore moves each back", and its first `queryMentions(['beta'])` expects the trashed `Alpha.md`'s `.trash/…` path.
  - `restoreScrub.test.ts:194`, "a trashed copy the restore's refill couldn't write owes its value", becomes "a trashed holder the restore's refill couldn't write is named" (Decision D-5). The reply's `unrestored` is `['Beta']`, no relink entry holds `values`, and the `finishOwed` half leaves.
- [ ] `git grep -nw archiveSegs -- Core` and `git grep -n archivedPageIds -- Core` print nothing.
- [ ] Run the gates.
- [ ] Check for unnecessary code or mistakes.

#### Task 4-4

**TASK:** A property cascade reaches a trashed page or Collection by the Collection its record names (Decision D-4, M-9). `trashedOwners` answers each Trash bundle's Collection from its record, `owningCollection` reads it for a `.trash` path, and `pagesInReach`, `refillStash`'s members, the repair sweep, and the configuration pass's scoped reach all ask the same owner. The configuration pass also reaches trashed Collection and Set sidecars and trashed Spaces' tile docs (Decision D-3). The delete's strip leaves the bundle it filled, and `finishProperty`'s Trash arm shrinks to the trashed Collections' purge. This closes B-7 and B-9.

**NOW:**
- `pagesInReach` reaches live Collection folders and `archiveReach` (`keyHolders.ts:44-59`), so a `.trash` file is never governed.
- `owningCollection` answers nothing for a `.trash` path (`treePatch.ts:110-119`), and `refillStash`'s members (`assignment.ts:43`) and the repair sweep's schema (`repairSweep.ts:20`) read it that way.
- The configuration pass reaches live containers, damaged folders, the Archive's Set sidecars (`configReach.ts:284-304,339-347`), and live tile hosts (`tileHostsOf`).
- `deleteCascade` excludes the live `e.at` alone (`cascade.ts:99-100,129`, from `finishOwed.ts:402`).
- `finishProperty`'s gone-definition arm strips every trashed page and lists trashed Collections (`finishOwed.ts:164-186`).
- B-9: a page restored after a rename holds the old names (`restoreScrub.test.ts:516` pins it, through a hand-written registry rather than an op).

**Contradiction, Taken as Below:** *§The Rules*, 3 states the governed rule as `collectionOf(originOf(record))`, which a Collection record can't answer (`originOf` returns null for it). Read that way, a trashed Collection's own pages would fall out of every property cascade and return stale, which is B-9 for Collections, and that would contradict today's `finishProperty` arm and Decision D-3. A Collection record's owner is therefore its own id.

**Decision, Disclosed:** M-9 lands as `trashedOwners` plus `owningCollection`'s Trash arm, rather than `archivedWithin` taking a store. The repair sweep and `refillStash` need an owner per path, not "records within a Set", and the Archive answers its owner from its path. `archivedWithin` stays the Archive carry's reader.

**Departure, Disclosed:** the mandated views test ("a trashed Collection's view stays current through a property rename") can't fail. Views name properties by id (`configReach.ts:121-173`), so a rename never stales one, live or trashed. Its test is the property delete below, the drift Decision D-3's pass exists for. `finishProperty` keeps its own `listBundles`, which it already reads for `kept`, rather than calling `trashedOwners`; a second listing of the same bundles would buy nothing.

**CHANGE**

- [ ] Write these and watch each fail:
  - **`restoreScrub.test.ts:516`**, rewritten from "leaves a key whose property was renamed while it sat in the Trash as written" to "a page that sat in the Trash through a property, option, Space, and Context rename returns holding the new names" (B-9). It runs `renameProperty`, `renameOption`, `renameSpace`, and `renameContext` through `settledMutate` while Alpha sits in the Trash. Before the restore, the trashed copy reads `Urgency: high` and `<Ventures>: [Pommora 2]`; after it, `Notes/Alpha.md` reads the same, and none of `Priority`, `hi`, `<Projects>`, or `Pommora` remains.
  - **`keyHolders.test.ts`, "a governed reach takes a trashed page and a trashed Collection's pages by their record, a Collection renamed since included, and leaves one that left no Collection":**
    - One page is trashed from `Notes`, and `Notes` is then renamed `Journal`.
    - One Collection is trashed whole.
    - One hand-made bundle has a `{ kind: 'root' }` parent.

    `findHolders(…, { reach: 'governed' })` lists the first two and not the third. Under `{ collection: Journal }`, it lists the first alone.
  - **`registryProperty.test.ts`, "a property rename leaves an ungoverned trashed page's bare key, as a live one's":** the hand-made root-parent bundle's page and a root-level live page both keep `Priority`.
  - **`assignment.test.ts`, "a re-assign drops a trashed page's stashed Link naming a page gone, as a live page's" (B-7):** the stash keeps no entry for the trashed page.
  - **`repairSweep.test.ts`, beside `:80`, "canonicalizes a drifted trashed page against the definitions of the Collection it left":** delete `Col/One.md`, write `Status:\n  - Open\n  - Open` into the trashed copy, seed, and run the sweep; the copy reads `Status:\n  - Open`.
  - **`trashRecovery.test.ts`, beside `:1012`, "a property deleted while a Collection sat in the Trash leaves its saved views, as a live Collection's" (Decision D-3):** the restored Collection's view holds no column, hidden id, or rule naming the property.
  - **`trashRecovery.test.ts`, "a trashed Space's tile docs lose a deleted Collection's sources, as a live Space's do":** a trashed Space's `_tiles.json` view sourced from a Set that is then deleted loses it.
  - **`trashRecovery.test.ts`, "a Set moved to another Collection takes its location from the views a Set trashed from the Collection it left holds" (scoped reach).**
- [ ] Apply the AFTER.
- [ ] Rewrite `CollectionsPM.md:49`'s second sentence to "Pages placed in the archive, like pages in the Trash, are indexed and receive reach-in changes …". Rewrite `ContextsPM.md:25`'s "and on a Trash restore, as a page's is" to "in the Trash as live, as a page's is". In `NexusRecordPM.md:12`, "the Archive's pages included" becomes "both stores' pages included".

**AFTER**

▸ Phase 3 (M-11) adds `ownedArchives` after `archiveOwned`, and Phase 3 (M-5, P-5) reworks `spendBundle`. This hunk adds beside `collectionsElsewhere` alone; Phase 2 removed `identityOf` from the record import.

```Core/Bundles/bundle.ts diff
@@ imports @@
 import {
+  collectionOf,
   originOf,
@@
+import { owningCollection } from '../Nexus/treePatch'
@@ collectionsElsewhere @@
+/** Each Trash bundle's Collection, by the bundle's root-relative path: a trashed Collection's own, or the one a page or Set left, as its record names it, so a Collection renamed or moved since keeps what the Trash holds of it. */
+export async function trashedOwners(root: string): Promise<Map<string, string>> {
+  const owners = new Map<string, string>()
+  for (const { bundlePath, record } of await listBundles(root, { kind: 'trash' })) {
+    const origin = originOf(record)
+    const owner = record.entity === 'collection' ? record.id : origin && collectionOf(origin)
+    if (owner) owners.set(bundlePath, owner)
+  }
+  return owners
+}
+
+export async function trashReach(root: string, tree: NexusTree, rel?: string): Promise<string[]> {
+  const owner = rel === undefined ? undefined : owningCollection(tree, rel)?.id
+  return [...(await trashedOwners(root))].flatMap(([bundle, id]) =>
+    rel === undefined || id === owner ? [bundle] : [],
+  )
+}
```

```Core/Nexus/treePatch.ts diff
@@ owningCollection @@
-/** A Collection owns itself; anything else is owned by the Collection its path starts in, since Collections sit only at the Nexus root, or by the one whose Archive holds it. */
+/** A Collection owns itself; anything else is owned by the Collection its path starts in, since Collections sit only at the Nexus root, by the one whose Archive holds it, or, in the Trash, by the one `trashed` names for its bundle (`trashedOwners`). */
 export function owningCollection(
   tree: NexusTree | null,
   of: string | CollectionNode | SetNode,
+  trashed?: ReadonlyMap<string, string>,
 ): CollectionNode | undefined {
@@
   const at = storeOf(path)
-  const filed = at?.store.kind === 'archive' ? at.store.id : undefined
+  const filed =
+    at?.store.kind === 'archive' ? at.store.id : at?.bundle ? trashed?.get(at.bundle) : undefined
@@ containerSchema @@
 export const containerSchema = (
   tree: NexusTree | null,
   of: string | CollectionNode | SetNode,
+  trashed?: ReadonlyMap<string, string>,
 ): PropertyDefinition[] => {
-  const owner = owningCollection(tree, of)
+  const owner = owningCollection(tree, of, trashed)
```

```Core/Index/keyHolders.ts diff
@@ imports @@
+import { trashReach } from '../Bundles/bundle'
@@ pagesInReach @@
   if (reach === 'anywhere') return files
   const only = reach === 'governed' ? undefined : reach.collection
-  const archive = archiveReach(tree, only && relative(root, only))
+  const scoped = only && relative(root, only)
+  const archive = archiveReach(tree, scoped)
+  const trashed = files.some((f) => storeOf(relative(root, f))?.store.kind === 'trash')
+    ? await trashReach(root, tree, scoped)
+    : []
   const folders = [
     ...(only === undefined ? collectionFolders(root, tree) : [only]),
     ...(archive === null ? [] : [join(root, archive)]),
+    ...trashed.map((bundle) => join(root, bundle)),
   ]
@@ findHolders @@
-/** The pages and Spaces holding any of `keys`: … `governed` reaches the pages of Collections and the Archive, and `{ collection }` one Collection's and its Archive's; …
+/** The pages and Spaces holding any of `keys`: … `governed` reaches the pages of Collections and what both stores hold of them, and `{ collection }` one Collection's and what both stores hold of it; …
```

(Only that clause of the docstring's first sentence changes.) Comments in this task: `trashedOwners`' docstring is added, and `linkStrip`'s inline comment leaves into its docstring. `trashReach` and `storedContainers` read as `archiveReach`'s and `archivedSets`' twins, and `archivedSets` had no docstring.

▸ Phase 3 (M-17) splits the strip's rule into `linkStrip`, which `deleteCascade` and the gatherer (`Core/Trash/gather.ts`) share. These hunks change the exclusion alone, in both and at their callers.

```Core/Nexus/cascade.ts diff
@@ linkStrip doc @@
-/** … Nothing at or under `abs` is reached, since it left with the delete. */
+/** … Nothing at or under `left` is reached, since it left with the delete: the folder it stood in, which the held tree may still list, an archived item's rows, which the index keeps until its artifact leaves the Archive, and the bundle it moved into. */
-export async function linkStrip(root: string, abs: string, paths: readonly string[]) {
-  const deleted = relative(root, abs)
-  const inside = (rel: string): boolean => isAtOrUnder(rel, deleted)
+export async function linkStrip(root: string, left: readonly string[], paths: readonly string[]) {
+  const inside = (rel: string): boolean => left.some((at) => isAtOrUnder(rel, at))
@@
-  // The held tree may still list the deleted pages, since its patch can fall to a walk, and the index an archived one's rows until its artifact leaves the Archive, so each is left out by where it's held.
   const { byId, archived, stored } = await nexusPages(root, tree)
@@ deleteCascade @@
 export async function deleteCascade(
   root: string,
-  abs: string,
+  left: readonly string[],
   paths: readonly string[],
 ): Promise<ConfigReach> {
   try {
-    const strip = await linkStrip(root, abs, paths)
+    const strip = await linkStrip(root, left, paths)
```

(In `linkStrip`'s doc, "archived ones among them" becomes "stored ones among them".)

```Core/Trash/gather.ts diff
@@ gatherLinks @@
 export async function gatherLinks(
   root: string,
-  abs: string,
+  left: readonly string[],
   paths: readonly string[],
 ): Promise<StrippedLink[]> {
-  const strip = await linkStrip(root, abs, paths)
+  const strip = await linkStrip(root, left, paths)
```

```Core/Trash/delete.ts diff
@@ planOf @@
-      const links = await gatherLinks(root, abs, strip)
+      const links = await gatherLinks(root, [rel], strip)
```

`cascade.test.ts`'s `deleteCascade` and `gatherLinks` calls pass `[relative(root, <abs>)]` in place of the path.

▸ Phases 2 (L-1, L-2) and 3 (M-6, M-8, M-11, M-17) also rewrite `finishOwed.ts`. These hunks touch `finishProperty`'s Trash arm and `finishContainer`'s strip alone.

```Core/Nexus/finishOwed.ts diff
@@ imports @@
-import { contentPages, listBundles, ownedArchives } from '../Bundles/bundle'
+import { listBundles, ownedArchives } from '../Bundles/bundle'
@@ finishProperty @@
   if (!def) {
     const strip = (e.strip ?? []).filter((key) => !held(key))
-    // With no Trash entry left for the property it can't come back, so the Collections and pages the Trash holds lose it as the live ones do.
+    // With no Trash entry left for the property it can't come back, so the Collections the Trash holds lose its assignment as the live ones do; every page lost its values at the delete.
     const bundles = await listBundles(root, { kind: 'trash' })
     const kept = bundles.some((b) => b.record.entity === 'property' && b.record.id === id)
-    const trashed = kept
-      ? []
-      : bundles.flatMap((b) =>
-          b.artifactName
-            ? [{ entity: b.record.entity, abs: join(root, b.bundlePath, b.artifactName) }]
-            : [],
-        )
     const folders = [
       ...collectionFolders(root, await liveTreeOf(root)),
-      ...trashed.flatMap((b) => (b.entity === 'collection' ? [b.abs] : [])),
+      ...bundles.flatMap((b) =>
+        !kept && b.record.entity === 'collection' && b.artifactName
+          ? [join(root, b.bundlePath, b.artifactName)]
+          : [],
+      ),
     ]
-    const planned = await deletePlan(root, id, strip)
-    const inTrash = strip.length
-      ? (await Promise.all(trashed.map((b) => contentPages(b.entity, b.abs)))).flat()
-      : []
-    const holders = { ...planned.holders, files: [...planned.holders.files, ...inTrash] }
-    const missed = add(reach, await stripProperty(root, id, folders, { ...planned, holders }))
+    const missed = add(reach, await stripProperty(root, id, folders, await deletePlan(root, id, strip)))
     return { left: { kind: 'property', strip: missed ? strip : undefined }, reach }
   }
@@ finishContainer @@
   const strip = back ? undefined : e.strip
+  const left = [e.at, ...(e.bundle ? [e.bundle] : [])]
   // An emptying's links park, before its strip takes them, with a trashed page that still answers them; a delete's are in its record already.
-  if (strip && !e.bundle) await parkLinks(root, await gatherLinks(root, join(root, e.at), strip))
-  const stripped = !!strip && add(reach, await deleteCascade(root, join(root, e.at), strip))
+  if (strip && !e.bundle) await parkLinks(root, await gatherLinks(root, left, strip))
+  const stripped = !!strip && add(reach, await deleteCascade(root, left, strip))
```

```Core/Properties/assignment.ts diff
@@ imports @@
+import { trashedOwners } from '../Bundles/bundle'
@@ refillStash @@
   const { byId, archived } = await nexusPages(root, tree)
+  const trashed = await trashedOwners(root)
   const members = new Map(
     Object.keys(values).flatMap((id) => {
       const r = byId.get(id)
-      return r?.kind === 'page' && owningCollection(tree, r.path)?.id === collectionId
+      return r?.kind === 'page' && owningCollection(tree, r.path, trashed)?.id === collectionId
```

```Core/Properties/repairSweep.ts diff
@@ imports @@
+import { trashedOwners } from '../Bundles/bundle'
@@ runRepairSweep @@
     const tree = await liveTreeOf(root)
+    const trashed = await trashedOwners(root)
     const raw: Rewrite = (fm, file) => {
-      const schema = containerSchema(tree, relative(root, file))
+      const schema = containerSchema(tree, relative(root, file), trashed)
```

▸ No earlier phase edits `configReach.ts`. `archivedSetIds` and `archivedSets` already share one walk, `setSidecarsUnder`, which this hunk generalizes into `containerSidecarsUnder` for both.

```Core/Nexus/configReach.ts diff
@@ imports @@
-import { SIDECAR_FILENAME } from '../Paths/nexusPaths'
+import { SIDECAR_FILENAME, TRASH_DIR } from '../Paths/nexusPaths'
+import { trashReach } from '../Bundles/bundle'
+import { storedSpaces } from './heldPages'
@@ setSidecarsUnder @@
-const setSidecarsUnder = async (root: string, scope: WatchScope, abs: string): Promise<string[]> =>
-  (await sidecarsUnder(root, scope, abs)).filter((file) => basename(file) === SIDECAR_FILENAME.set)
+const containerSidecarsUnder = async (
+  root: string,
+  scope: WatchScope,
+  abs: string,
+): Promise<Container[]> =>
+  (await sidecarsUnder(root, scope, abs)).flatMap((file) =>
+    (['collection', 'set'] as const).flatMap((kind) =>
+      basename(file) === SIDECAR_FILENAME[kind] ? [{ kind, dir: dirname(file) }] : [],
+    ),
+  )
 
 /** The ids of the Sets an archived folder holds, read from their sidecars. */
 export async function archivedSetIds(root: string, abs: string): Promise<string[]> {
   const ids = await Promise.all(
-    (await setSidecarsUnder(root, await readWatchScope(root), abs)).map((file) =>
-      sidecarId(dirname(file), 'set'),
-    ),
+    (await containerSidecarsUnder(root, await readWatchScope(root), abs)).flatMap(({ kind, dir }) =>
+      kind === 'set' ? [sidecarId(dir, 'set')] : [],
+    ),
   )
   return ids.flatMap((id) => id ?? [])
 }
 
-async function archivedSets(tree: NexusTree, root: string, under?: string): Promise<Container[]> {
-  const archive = archiveReach(tree, under && relative(root, under))
-  if (archive === null) return []
-  return (await setSidecarsUnder(root, scopeOf(tree.config), join(root, archive))).map((file) => ({
-    kind: 'set',
-    dir: dirname(file),
-  }))
+async function storedContainers(tree: NexusTree, root: string, under?: string): Promise<Container[]> {
+  const rel = under && relative(root, under)
+  const archive = archiveReach(tree, rel)
+  const dirs = [
+    ...(archive === null ? [] : [archive]),
+    ...(rel === undefined ? [TRASH_DIR] : await trashReach(root, tree, rel)),
+  ]
+  const scope = scopeOf(tree.config)
+  const found = await Promise.all(
+    dirs.map((d) => containerSidecarsUnder(root, scope, join(root, d))),
+  )
+  return found.flat()
 }
@@ reachConfig @@
   const tiles = tileHostsOf(root, tree)
+  const boards = [
+    ...tiles.hosts,
+    ...(await storedSpaces(root)).map((s) => ({ dir: join(root, s.path) })),
+  ]
@@
-  for (const { kind, dir } of await archivedSets(tree, root, under)) {
+  for (const { kind, dir } of await storedContainers(tree, root, under)) {
     await written(sidecarPath(dir, kind), (cur) => {
       const id = asString(cur.id)
-      // A Set the edit names as gone leaves together with everything else it names, so its own views still answer.
+      // A container the edit names as gone leaves together with everything else it names, so its own views still answer.
@@
-  for (const { host, dir } of tiles.hosts) {
+  for (const { host, dir } of boards) {
```

```Core/Trash/spend.ts diff
@@ emptyBundle @@
   if (record.entity === 'property') {
-    // Gone for good once its bundle goes, so its delete's finish reaches the Trash too; what it misses stays owed, so Try Again reaches it.
+    // Gone for good once its bundle goes, so its delete's finish takes its assignment from the Collections the Trash holds too; what it misses stays owed, so Try Again reaches it.
```

`goneContainers`' doc ("read from the tree, or from an archived Set's sidecars on disk") becomes "read from the tree, or from a stored container's sidecars on disk". `containerSidecarsUnder` answers each sidecar's kind with its folder, so `storedContainers` takes its answer whole and `archivedSetIds` reads its Sets by kind. The configuration pass reads the Trash twice, once for its containers and once for its Spaces' tile docs: two different walks (the store's sidecars, or its scoped bundles' records, against the Contexts chain's Space sidecars), on a pass that deletes and Set moves run, never a rename or an edit.

**VERIFY**

- [ ] The new cases are green, and each is watched red with its hunk reverted.
- [ ] **Flips:**
  - `spend.test.ts:2638`, "an empty that misses %s offers Try Again", moves to the delete, as "a property delete that misses %s offers Try Again". In a sibling `describe` with the same seed and no delete in `beforeEach`, it `chmod`s the file to `000` before `deleteProperty`, then expects the owed `strip: ['Priority']` and `finishOwed` to clear the file.
  - `spend.test.ts:2624`'s expectations hold: the delete stripped both pages, and the empty purges both Collections.
  - `spend.test.ts:2660`, "a live property holding the key keeps it", inverts to "a later property reusing a deleted property's key inherits nothing" (Decision D-4): after the new `Priority` and the empty, `priorityOn(tasksPage)` is undefined. It gains the `held(key)` case it pinned, re-expressed: "an owed strip leaves a key a later property took": a property delete misses a page (`chmod 000`), a property reusing the key is created, the page is restored to `644`, and `finishOwed` leaves its value and drops the strip.
  - `deleteReach.test.ts:346`, "strips the Link values naming its pages outside it, and leaves the pages inside as they were", now fails with `finishContainer`'s `left` reverted, so it pins the own-bundle exclusion. Watch it red.
- [ ] `git grep -nw "archivedSets\|setSidecarsUnder\|inTrash" -- Core` prints nothing.
- [ ] Run the gates.
- [ ] Check for unnecessary code or mistakes.

#### Task 4-5

**TASK:** The returning side of the frozen model leaves:
- `targets` end to end, so I-069 dissolves;
- the scrub, with its schema read and its parking;
- the restore's `repair` map and `returningCascade`'s `repair` parameter;
- `withUnswept`;
- `renameFrontmatterKey`.

A restore now moves the item's bytes, as the Archive's restore does (*§The Rules*, 9). `restoreScrub.ts` keeps `artifactFiles` and `repairLanded` alone, which Phase 5 moves into `Core/Nexus/arrival.ts`.

**NOW:**
- `targets` is gathered (`gather.ts:24-58`, `delete.ts:106-118`), decoded (`record.ts:39-40,60,76,95`), and carried by `innerRecord` (`bundle.ts:270`).
- `restoreTrashed` turns it into a frozen world and a `repair` map (`spend.ts:154-156,221-229`) and runs the scrub (`:157-171`), which owes `scrubbed.worked` and reports `scrubbed.unread` through `withUnswept` (`:232-235,291`).
- `renameFrontmatterKey` has one production caller, the scrub (`restoreScrub.ts:105`, `pageFile.ts:219-229`).

**CHANGE**

- [ ] Apply the AFTER.
- [ ] Rewrite the cases that pinned the removed behavior, by name. Each one listed as leaving asserted what only the scrub or `targets` did.
  - **`restoreScrub.test.ts`, the cases that leave:**
    - `:109-140`: "keeps every governed key that still stands", "keeps a value whose property was deleted …", "keeps a value whose property is no longer assigned …", and "keeps a tag whose Context was erased …".
    - `:164`, "a returning page the scrub can't write owes what it worked out", and `:182`, "an edit made after the restore keeps it through Try Again", with the `missedScrub` helper.
    - `:225`, "a restore whose returning Space sidecar can't be read still restores, and warns".
    - `:264`, `:273`, `:302`, `:307`, `:318`, `:332`, `:345`, and `:363`.
    - The whole `describe('a returning page takes the current keys')` except the B-9 case at `:516`.
    - `:699`, "a variant of a returning Context's own key moves onto it when no live Context shares its title", and `:760`.
  - **`restoreScrub.test.ts`, the cases that stay:**
    - `:394`, "keeps a Link naming a page renamed meanwhile, which follows it once landed": the rename now reaches the trashed copy. Retitle it "a trashed page's Link follows a page renamed meanwhile".
    - `:422`, rewritten as "a restore returns the page's bytes as they stood in the Trash": `readFile` before and after are equal.
    - `:591`, `:619`, `:659`, and `:780-828`, unchanged.
    - `:746`, rewritten as "a trashed Space follows a Context rename and a property rename", through `renameContext` and `renameProperty`.
    - `:1`'s header becomes "// A trashed artifact stays current while it sits in the Trash, since every cascade reaches it there. These pin what it returns holding: the current keys, titles, and links, and its own Context key left for the rekey while a live Context holds its title."
  - **`spend.test.ts`:**
    - `:460-566`, the whole `describe('the bundle records the page each outbound link named')`, leaves with `targets`: "a page delete records each key, embeds included, resolved alone, and none ambiguous or phantom", "a page delete with no index records the same keys, read from its file", "a Set delete records them bundle-wide from the index, reading none of its pages", "a Space delete records the targets of its values", and "a record with targets round-trips, and one without them still reads".
    - `:1217`, "a bundle without targets restores by the name", leaves.
    - `:1391` drops its `targets` expectation and is retitled "a trashed Context's Spaces' values follow a page renamed meanwhile".
    - `:1160` is retitled "keeps its body, and a page deleted meanwhile records the value it stripped from the trashed copy". Its expectations hold.
    - `:2443`, "a Collection comes back reconciled against the definitions its own sidecar assigns", leaves.
    - `:1073-1113` and `:1376` hold, now by reach.
  - **`archive.test.ts:1135`**, "a trashed page's link to an archived page follows it to where it lands on restore", leaves as covered by `:1149`. Its old expectation came from `targets`' frozen identity, and its reach-in outcome is `:1149`'s.
  - **`renameFrontmatterKey`'s tests** move onto `sweepParse(content)?.rekey(from, to, collision) ?? null`, behind one local `rekey` helper in each file: `pageFile.test.ts:215-340`, with the two `describe`s retitled "`rekey` — …"; `rootValues.test.ts:42-57`, "the twin of the page parse's `rekey`"; and `finishOwed.test.ts:121`.
- [ ] Rewrite these docs:
  - `NexusRecordPM.md:10`: drop the clause "every record carries the page each outbound link under its artifact named at the delete, its id and its path then, by the name the link was written with;".
  - `NexusRecordPM.md:14`: replace the passage from "An artifact returning from the Trash is reconciled …" through "… re-spelled for its arrival and for the names that named only it," with "An artifact returns from either store by a move, current since every cascade reached it; once it lands, its own links re-spell to the pages beside it they named, the live world is re-spelled for its arrival and for the names that named only it,". Drop the sentence beginning "A Link value naming a page the tree doesn't hold and the restore doesn't land …".
  - `CorePM.md:98`: drop "; a Trash restore alone rewrites a key a property's label spells into that property's key".
  - `ConnectionsPM.md:30`: change "from every page and Space the tree holds and every page the Archive holds" to "from every page and Space the tree and both stores hold", and "A restore repairs the returning page's own links to pages renamed or moved while it sat in the Trash, re-spells" to "A restore re-spells".
  - `PommoraPRD.md:101`: drop the scrub's sentence. Find it with `grep -n "reconcil" .claude/PommoraPRD.md`, and drop only the clause that says a Trash restore rewrites keys.

**AFTER**

▸ Phases 2 (M-4) and 3 (M-17) also rewrite `gather.ts`. This hunk removes `targets`' gatherers alone; Phase 3's `gatherLinks` and its imports stay.

```Core/Trash/gather.ts diff
@@ imports @@
-import { isAtOrUnder, isMarkdownFile, join } from '../Paths/posix'
+import { isMarkdownFile } from '../Paths/posix'
@@
-import { readTextOrNull } from '../Files/atomicWrite'
@@
-import { readPageRelations } from '../Index/contentIndex'
-import { extractPageIndex } from '../Index/indexSeed'
-import { valueLinks } from '../Connections/scan'
-import { ID_KEY } from '../Nexus/identityMark'
-import { pageIndexOf } from '../Nexus/record'
-import { nexusPages } from '../Nexus/heldPages'
-import { buildPageIndex } from '../Connections/pageIndex'
@@
-import type { Relation } from '../Platform/stores'
@@ pageRelationsOf, gatherLinkTargets @@
-/** The page-to-page rows of the pages at `paths`: … */
-async function pageRelationsOf(…) { … }            (lines 24-32)
-
-/** What each outbound link at or under `rel` named: … */
-export async function gatherLinkTargets(…) { … }   (lines 34-58)
```

▸ Phases 2 (L-1) and 3 (M-1, M-2, M-17) also rewrite `deleteOp`'s body. This hunk removes `targets` and `under`'s second source alone, from Phase 3's shape.

```Core/Trash/delete.ts diff
@@ imports @@
-import { gatherContextRecord, gatherLinks, gatherLinkTargets, gatherSpaceRecord } from './gather'
+import { gatherContextRecord, gatherLinks, gatherSpaceRecord } from './gather'
@@ fromArchive doc @@
-/** … and its record keeps the address it left for the Undo. Its pages' index rows sit at their Archive paths, while Link values name them where they lived. */
+/** … and its record keeps the address it left for the Undo. Link values name its pages where they lived. */
@@ fromArchive @@
-    under: pages.map((file) => relative(root, file)),
     keys: pages.map((file) => originPathOf(root, file)),
@@ deleteOp @@
-  const under =
-    from?.under ?? pagesOf(before).flatMap((p) => (isAtOrUnder(p.path, rel) ? p.path : []))
+  const under = pagesOf(before).flatMap((p) => (isAtOrUnder(p.path, rel) ? p.path : []))
   const planned = await planOf(root, req, abs, before, from, under)
   if (!planned.ok) return planned
   const plan = planned.value
-  const targets = await gatherLinkTargets(root, before, rel, under)
@@
-    bundle = await mintBundle(root, { kind: 'trash' }, from?.origin ?? abs, {
-      ...plan.record,
-      ...(Object.keys(targets).length ? { targets } : {}),
-    })
+    bundle = await mintBundle(root, { kind: 'trash' }, from?.origin ?? abs, plan.record)
```

An archived item's own pages sit in no tree, so `under` answers none for it, and its strip reads `from.keys` (`planOf`).

▸ Phase 2 (L-3, L-4) also edits `recordFile`'s Context and content arms.

```Core/Bundles/record.ts diff
@@ linkTargets @@
-/** The page each outbound link under the artifact named at the delete, by its id and its path then under the key it was written with, so a restore follows it by identity and re-spells only what changed since. */
-const linkTargets = z.record(z.string(), z.object({ id: z.string(), path: z.string() })).optional()
-
@@ contentRecord @@
-    targets: linkTargets,
@@ space arm @@
-    targets: linkTargets,
@@ context arm @@
-    targets: linkTargets,
```

▸ Phase 2 (L-4) removed `innerRecord`'s `partial` and its doc's clause; the `-` line reads Phase 2's wording.

```Core/Bundles/bundle.ts diff
@@ innerRecord @@
-/** What an inner item carries as its own record: its identity, the trail above it as its parent and trail, unaddressable without one, and the bundle's targets; no place, since the siblings it left are gone with it. */
+/** What an inner item carries as its own record: its identity, the trail above it as its parent and trail, unaddressable without one; no place, since the siblings it left are gone with it. */
@@
-    ...(held.targets ? { targets: held.targets } : {}),
```

`restoreScrub.ts` keeps its last two functions:

```Core/Trash/restoreScrub.ts diff
@@ header and imports @@
-// A bundle froze at its delete while the world moved on, so returning content is reconciled before it lands, taking the current keys and spellings and losing a Link naming a page gone, and its own links are repaired once it has.
-
-import type { NexusTree } from '../Nexus/tree'
-import { editHeldList, editList, rekeyHeld, stripKeys } from '../Files/rootValues'
-…                                                   (lines 1-41: every import but the ones below)
+// A restored artifact's own links and keys, re-spelled where it landed.
+
+import { type CascadeReport, noteRelink } from '../Nexus/cascade'
+import { basename, join, relative } from '../Paths/posix'
+import { listPathsUnder } from '../Files/walk'
+import { contentPages } from '../Bundles/bundle'
+import type { RecordFile } from '../Bundles/record'
+import { hiddenFolder, SPACE_SIDECAR } from '../Paths/nexusPaths'
@@ matchOf, currentKeys @@
-type Match = …                                    (lines 43-126, removed)
@@ scrubReturning @@
-/** Reconciles the returning pages against `schema`, … */
-export async function scrubReturning(…) { … }       (lines 140-215, removed)
@@ repairLanded @@
-/** A returning artifact's own links and keys, repaired where it landed under the relink entry keyed by its path: each key in `repair` re-spells, in the landed files alone, to the current name of the page the delete recorded it naming, a Context restored under a new title re-keys its Spaces' sidecars by `landed.rekey`, and a file either misses is owed with Try Again. A repair whose note can't be written still runs, owing nothing. */
+/** A returning artifact's own links and keys, repaired where it landed under the relink entry keyed by its path: each key in `own` re-spells, in the landed files alone, to how it names its returning page now, a Context restored under a new title re-keys its Spaces' sidecars by `landed.rekey`, and a file either misses is owed with Try Again. A repair whose note can't be written still runs, owing nothing. */
 export async function repairLanded(
   root: string,
   landed: { entity: RecordFile['entity']; abs: string; rekey?: [from: string, to: string] },
   label: string,
-  repair: ReadonlyMap<string, string>,
+  own: ReadonlyMap<string, string>,
 ): Promise<CascadeReport | undefined> {
-  if (!repair.size && !landed.rekey) return undefined
+  if (!own.size && !landed.rekey) return undefined
@@
-    names: Object.fromEntries(repair),
+    names: Object.fromEntries(own),
```

```Core/Nexus/settle.ts diff
@@ returningCascade doc @@
-/** A restore's arrival under `title`: the index settled with `back` landed, the returning files repaired at `landed.abs` through `landed.repair` (the returning pages' own re-spellings when it has none), then the live world's collisions swept, … */
+/** A restore's arrival under `title`: the index settled with `back` landed, the returning files' own links re-spelled at `landed.abs`, then the live world's collisions swept, … */
@@ returningCascade @@
     rekey?: [from: string, to: string]
-    repair?: (after: PageIndex) => Map<string, string>
   },
@@
-  const repaired = await repairLanded(root, landed, title, landed.repair?.(after) ?? own)
+  const repaired = await repairLanded(root, landed, title, own)
```

▸ Phases 2 (L-2, L-3, L-4, L-5) and 3 (M-7, P-3) also rewrite `spend.ts`. These hunks remove the frozen model from `restoreTrashed` alone; Phase 5 folds what's left into `Core/Bundles/restore.ts`.

```Core/Trash/spend.ts diff
@@ imports @@
-import { scrubReturning } from './restoreScrub'
@@
-import { pathExists, readJsonObject, relocate } from '../Files/atomicWrite'
+import { pathExists, relocate } from '../Files/atomicWrite'
@@
-import { joinCascades, type StrippedLink, withUnswept } from '../Nexus/cascade'
+import { joinCascades, type StrippedLink } from '../Nexus/cascade'
@@
-import { containerSchema, schemaOf } from '../Nexus/treePatch'
-import { assignedIds } from '../Nexus/containerFields'
-import { sidecarPath } from '../Paths/paths'
@@ restoreTrashed @@
   const back = await originPagesOf(root, await contentPages(record.entity, artifactAbs))
-  const targets = new Map(Object.entries(record.targets ?? {}))
   const world = linkWorld(tree, archived, back)
-  const frozen = frozenWorld(world, targets)
-  // A returning Collection sits in the Trash, outside the tree, so its own sidecar names its schema; a page or Set takes its destination's, and nothing under `.nexus/contexts` has one.
-  const schema =
-    record.entity === 'collection'
-      ? schemaOf(tree, assignedIds(await readJsonObject(sidecarPath(artifactAbs, 'collection'))))
-      : containerSchema(tree, dir)
-  const scrubbed = await scrubReturning(
-    root,
-    tree,
-    record.entity,
-    artifactAbs,
-    schema,
-    frozen,
-    record.entity === 'context' ? contextKey(record.registry.title) : undefined,
-  )
-  await parkLinks(root, scrubbed.dropped)
   // A Context's identity lives ONLY in its registry entry, …
@@ the move @@
-    // The Undo of a delete from the Archive files back at the address its record keeps, in the Archive that holds it now, reconciled as any Trash restore, and nothing lands in the tree.
+    // The Undo of a delete from the Archive files back at the address its record keeps, in the Archive that holds it now, and nothing lands in the tree.
     if (into && (record.entity === 'page' || record.entity === 'set')) {
       const origin = join(root, originPathOf(root, artifactAbs))
-      const { archive, links, targets, ...filed } = record
+      const { archive, links, ...filed } = record
@@ returningCascade call @@
         : undefined,
-    repair: (after) => {
-      const repair = new Map<string, string>()
-      for (const [key, { id, path }] of targets) {
-        const q = after.byId.get(id)
-        const next = q && after.respell(key, q, path)
-        if (next) repair.set(key, next)
-      }
-      return repair
-    },
   })
   const { after, own } = arrived
   const worked: Worked = {}
-  // What the scrub worked out for a returning file it couldn't write follows the file to where it landed.
-  for (const [file, values] of Object.entries(scrubbed.worked))
-    worked[relative(root, join(targetAbs, file))] = values
   const settled = after && heldTreeOf(root)
@@ cascade @@
-  const cascade = joinCascades(
-    withUnswept(joinCascades(arrived.cascade, owed), title, scrubbed.unread),
-    recordedPartly(stored, title),
-  )
+  const cascade = joinCascades(joinCascades(arrived.cascade, owed), recordedPartly(stored, title))
```

(`worked` keeps `refillTrashed`'s share until Task 4-6. `contextKey` stays, since `reapply` reads it.)

```Core/Nexus/cascade.ts diff
@@ withUnswept @@
-/** `cascade` joined with the line counting the files in “title” whose values a restore couldn't reconcile. */
-export function withUnswept(…) { … }               (lines 79-91, removed)
```

```Core/Files/pageFile.ts diff
@@ renameFrontmatterKey @@
-/** `content` with `from` renamed to `to` as `rekeyed` renames it. */
-export function renameFrontmatterKey(…) { … }       (lines 219-229, removed)
```

**VERIFY**

- [ ] **Flips:** exactly the cases CHANGE routes, and nothing else.
- [ ] `restoreScrub.test.ts:516`'s B-9 case stays green with the scrub gone.
- [ ] `git grep -nwE "gatherLinkTargets|pageRelationsOf|linkTargets|scrubReturning|currentKeys|matchOf|withUnswept|renameFrontmatterKey" -- Core` prints nothing, and `git grep -nw targets -- Core ':!*.test.ts' | grep -iE "record|bundle|spend|delete|gather"` prints nothing.
- [ ] `restoreScrub.ts` exports `repairLanded` alone, with `artifactFiles` beside it.
- [ ] `git grep -n "the bundle records the page each outbound link named" -- Core` prints nothing.
- [ ] Run the gates.
- [ ] Check for unnecessary code or mistakes.

#### Task 4-6

**TASK:** The holders' side of the frozen model leaves:
- `refillTrashed`, `trashedHolders`, the trashed split, and `frozenWorld`;
- `refillStash`'s splice;
- `Worked` with `oweWorked`, `landWorked`, and `relinkReach`'s values sweep (Decision D-5, option A);
- `originPagesIn`, with `parkLinks` reading the indexed Trash.

`Frozen` reduces to the link world, a refill and a park share one gone-link partition with `refillOf`'s check (M-12), and `trashedCopies.ts` keeps `parkLinks` alone, which Phase 5 moves into `record.ts`.

**NOW:**
- `refillTrashed` and `trashedHolders` (`trashedCopies.ts:47-118`) serve `spend.ts:273-288`'s trashed split and `assignment.ts:48-61`'s splice, and since Task 4-3 both find nothing, because trashed holders sit in `byId`.
- `Worked`'s last producer is `refillTrashed` (`owed.ts:32-41,48,88,100-101,111,224-240`; `cascade.ts:287-308`; `finishOwed.ts:126`).
- `frozenWorld` wraps `index.holders(t).length > 0` once `targets` is gone (`trashedCopies.ts:22-33`), and four call sites build it (`restoreProperty.ts:70`, `assignment.ts:62`, `spend.ts:272`).
- `Frozen` is an interface in `governedRoot.ts:59-63`, which `cascade.ts:113-114` builds by hand.
- Two partitions do one job: `restoreProperty.ts:72-83` and `assignment.ts:63-72`.
- `parkLinks` walks every bundle through `originPagesIn` (`trashedCopies.ts:36-45`, `bundle.ts:416-426`).

**CHANGE**

**Departure, Disclosed:** `parkLinks` reads the indexed Trash (`storedPageIds(TRASH_DIR)`) rather than listing every bundle's artifact. This is *§The Trash's Model · §Leaves*' "becomes an index read". Its one difference is a trashed page whose origin lies under an excluded folder, which the index doesn't hold and `listMarkdownFiles` did. Parking now reads the one admission rule the index and `listInner` read. The empty's park (Task 3-4) runs after its artifact's disposal, and that disposal's own unlink deindexes the artifact before the park reads the index: `dispose` awaits `noteOwn`, the own tap is `applyOwn` (`settle.ts:52-63`), and its `applyEvents` awaits `indexEvents`' `deindexPath` (`fileEvents.ts:294-298`, `indexSeed.ts:215-223`). So an emptied bundle's own pages answer none of its links, as the listing's skip of an artifactless bundle kept them from answering before.

- [ ] Write **`assignment.test.ts`, "a re-assign refills a trashed page's stashed value into its copy, which returns with it",** and watch it pass at Task 4-4's head and stay green here. It's the splice's behavior, now carried by `byId`.
- [ ] Write **`trashRecovery.test.ts`, beside `:701`, "emptying a Set holding one of two namesakes hands its record's links to the other"**, `:701`'s twin for a container: a Set `Plain/Box` (`_pageset.json` with id `set-box`) holds `Alpha.md` (`linker` with a fresh page id and no keys); `del('Journal/Daily/Alpha.md', 'page')`, then `del('Plain/Box', 'set')`, after which Beta holds no `Related`; empty Box's bundle, restore the Journal Alpha's row, and Beta reads `Related: '[[Alpha]]'`. It passes before and after the AFTER, since the listing skipped the emptied bundle too; it pins the order, so watch it red with `emptyBundle`'s `parkLinks` hoisted above its first `dispose`, where Box's own Alpha still answers the link and it parks with neither namesake.
- [ ] Apply the AFTER.
- [ ] Remove the tests of removed code:
  - `trashedCopies.test.ts`, the whole file: it tested `frozenWorld` alone (Placements name `trashedCopies.ts` for deletion in Phase 5, and its test file has nothing left to test).
  - `spend.test.ts:1005`, "a Link value refilled into a trashed copy is reconciled as a live refill is", which drove `refillTrashed` directly.
- [ ] Re-point the tests of the narrowed signatures, their expectations unchanged: `governedRoot.test.ts:261`'s `const gone = { holds: () => false }` becomes `const gone = () => false`, and `:271`'s `{ holds: (t) => t === 'Alpha' }` becomes `(t) => t === 'Alpha'`; `governedSweep.test.ts:352`'s `refillOf(tags, { holds: () => true })` becomes `refillOf(tags, buildPageIndex([]))`, importing `buildPageIndex` from `'../Connections/pageIndex'`, since a Multi-Select reads no world.
- [ ] Rewrite `NexusRecordPM.md:14`'s "— into its copy in the Trash when it sits there —" as "— in the Trash as live —", and `NexusRecordPM.md:33`'s "a bundle's frozen content" as "a bundle's content".
- [ ] Close I-065 in `.claude/IssuesPM.md` through `batch-issues` as intended (Decision B-4): its index row, its section, its footnote, and its count in TOTALS.

**AFTER**

```Core/Trash/trashedCopies.ts diff
@@ header @@
-// The Link values the Trash keeps for what it holds: a stripped value parked with the trashed page it names, so that page's restore writes it back, and a returning value refilled into a trashed copy it can't reach live.
+// A stripped Link value parked with the trashed page it names, so that page's restore writes it back.
@@ imports @@
-import { join, relative } from '../Paths/posix'
-import { SPACE_SIDECAR } from '../Paths/nexusPaths'
+import { join } from '../Paths/posix'
+import { TRASH_DIR } from '../Paths/nexusPaths'
 import { linkedPage } from '../Connections/linkValue'
-import { buildPageIndex, type PageIndex, pageKey } from '../Connections/pageIndex'
+import { buildPageIndex, connPage } from '../Connections/pageIndex'
 import type { StrippedLink } from '../Nexus/cascade'
-import type { Frozen } from '../Nexus/governedRoot'
-import type { Json } from '../Files/stableJson'
-import { type Worked, workedOut } from '../Nexus/owed'
-import { spaceIdsIn } from '../Contexts/spaceSidecar'
-import { stampedIdOf } from '../Files/pageFile'
-import { refillOf, rootId, sweepGovernedRoots } from '../Nexus/governedSweep'
-import type { PropertyDefinition } from '../Properties/properties'
-import { contentPages, listBundles, originPagesIn } from '../Bundles/bundle'
-import { appendLinks, collectionOf, originOf } from '../Bundles/record'
+import { appendLinks } from '../Bundles/record'
+import { storeOf } from '../Paths/bundleLayout'
+import { storedPageIds } from '../Nexus/heldPages'
+import { liveTreeOf } from '../Nexus/liveTree'
@@ frozenWorld @@
-/** A world a value is read against: … */
-export function frozenWorld(…): Frozen { … }       (lines 22-33, removed)
@@ parkLinks @@
 /** A Link value dropped for naming a page the Trash holds joins that page's bundle, so its restore writes it back; a key two trashed pages answer names neither. */
 export async function parkLinks(root: string, links: StrippedLink[]): Promise<void> {
   if (!links.length) return
-  const index = buildPageIndex(await originPagesIn(root, { kind: 'trash' }))
+  const rows = await storedPageIds(root, await liveTreeOf(root), TRASH_DIR)
+  const index = buildPageIndex(
+    [...rows.keys()].flatMap((rel) => {
+      const at = storeOf(rel)
+      return at?.bundle ? [connPage(join(root, at.bundle), at.origin)] : []
+    }),
+  )
@@ trashedHolders, refillTrashed @@
-/** Where the Trash holds each page or Space `ids` names: … */
-export async function trashedHolders(…) { … }      (lines 47-80, removed)
-
-/** A Link value whose page or Space sits in the Trash … */
-export async function refillTrashed(…): Promise<Worked> { … }   (lines 82-118, removed)
```

(`appendLinks` lives in `record.ts` since Phase 3's M-5, and stays `parkLinks`' writer.)

```Core/Bundles/bundle.ts diff
@@ originPagesIn @@
-/** Every stored page at the path it left, its `id` the bundle holding it, since parking needs the bundle alone and reads no file. */
-export async function originPagesIn(root: string, store: BundleStore): Promise<ConnPage[]> { … }   (lines 416-426, removed)
```

```Core/Nexus/governedRoot.ts diff
@@ Frozen, gonePageEntry @@
-/** The pages a frozen copy may still name: `holds` answers which still exist. */
-export interface Frozen {
-  holds: (title: string) => boolean
-}
-
-export function gonePageEntry(raw: unknown, frozen: Frozen): string | null {
+/** `raw`'s Link entry where it names a page `holds` answers false for, else null. */
+export function gonePageEntry(raw: unknown, holds: (title: string) => boolean): string | null {
   const entry = linkEntry(raw, 2)
   const link = entry === null ? null : readLinkText(entry)
-  const gone = link?.kind === 'page' && link.title !== '' && !frozen.holds(link.title)
+  const gone = link?.kind === 'page' && link.title !== '' && !holds(link.title)
   return gone ? entry : null
 }
```

```Core/Nexus/governedSweep.ts diff
@@ imports @@
-import { type Frozen, gonePageEntry, liveLanding, reencode, rewriteRoot } from './governedRoot'
+import { gonePageEntry, liveLanding, reencode, rewriteRoot } from './governedRoot'
+import type { PageIndex } from '../Connections/pageIndex'
+import type { StrippedLink } from './cascade'
@@ refillOf @@
-/** `value` landed under `def`'s key as a live reconcile lands it, where `root` reads blank; null where it doesn't land, or where it's a Link naming a page `frozen` no longer holds. */
-export const refillOf =
-  (def: PropertyDefinition, frozen: Frozen) =>
-  (root: Json, value: unknown): Json | null => {
-    const gone =
-      PROPERTY_TYPES[def.type].connections === 'value' && gonePageEntry(value, frozen) !== null
-    const next = liveLanding(value, reencode(def, value))
-    return gone || next === undefined || !isBlankRaw(root[def.key])
-      ? null
-      : landValue(root, def.key, next)
-  }
+/** The Link entry `value` holds under `def` where it names a page `world` doesn't hold, else null: the one check a refill lands by and a park takes by. */
+const goneLink =
+  (def: PropertyDefinition, world: PageIndex) =>
+  (value: unknown): string | null =>
+    PROPERTY_TYPES[def.type].connections === 'value'
+      ? gonePageEntry(value, (title) => world.holders(title).length > 0)
+      : null
+
+/** `value` landed under `def`'s key as a live reconcile lands it, where `root` reads blank; null where it doesn't land, or where it's a Link naming a page `world` doesn't hold. */
+export const refillOf = (def: PropertyDefinition, world: PageIndex) => {
+  const gone = goneLink(def, world)
+  return (root: Json, value: unknown): Json | null => {
+    const next = liveLanding(value, reencode(def, value))
+    return gone(value) !== null || next === undefined || !isBlankRaw(root[def.key])
+      ? null
+      : landValue(root, def.key, next)
+  }
+}
+
+export function partitionGone(
+  def: PropertyDefinition,
+  values: Record<string, unknown>,
+  world: PageIndex,
+  above: Record<string, string | undefined> = {},
+): { kept: Record<string, unknown>; gone: StrippedLink[] } {
+  const isGone = goneLink(def, world)
+  const kept: Record<string, unknown> = {}
+  const gone: StrippedLink[] = []
+  for (const [page, value] of Object.entries(values)) {
+    const entry = isGone(value)
+    if (entry === null) kept[page] = value
+    else gone.push({ page, property: def.id, value: entry, above: above[page] })
+  }
+  return { kept, gone }
+}
@@ refillValues @@
-  frozen: Frozen,
+  world: PageIndex,
   above: Record<string, string | undefined> = {},
 ): Promise<{ taken: ReadonlySet<string>; skipped: number }> {
-  return sweepRootsById(root, roots, values, above, refillOf(def, frozen))
+  return sweepRootsById(root, roots, values, above, refillOf(def, world))
 }
@@ RootsById @@
-/** What a by-id sweep reads of each root: where its file is and what kind it is, so a trashed copy joins the live tree's records. */
+/** What a by-id sweep reads of each root: where its file is and what kind it is. */
```

`partitionGone` carries no docstring, since `goneLink`'s states the one check: this AFTER removes four comments and adds three.

```Core/Nexus/cascade.ts diff
@@ imports @@
-import { isBlankRaw, landValue, stripKeys } from '../Files/rootValues'
-import { type Json, same } from '../Files/stableJson'
+import { stripKeys } from '../Files/rootValues'
+import type { Json } from '../Files/stableJson'
@@
-import { type Entry, type RelinkEntry, runNoted, type Worked } from './owed'
+import { type Entry, type RelinkEntry, runNoted } from './owed'
@@ linkStrip @@
-  const goneEntry = (value: unknown): string | null =>
-    gonePageEntry(value, { holds: (t) => !gone.has(pageKey(t)) })
+  const goneEntry = (value: unknown): string | null =>
+    gonePageEntry(value, (t) => !gone.has(pageKey(t)))
@@ landWorked @@
-/** `raw` with each value a restore worked out for it landed … */
-function landWorked(…) { … }                        (lines 287-294, removed)
@@ relinkReach @@
-/** A relink entry's sweep: what a restore worked out landed first in the files `values` names, then its names re-spelled in every file naming them, or in those of its `files` still there with its `rekey` applied, counting each file either missed once. */
+/** A relink entry's sweep: its names re-spelled in every file naming them, or in those of its `files` still there with its `rekey` applied, counting each file it missed. */
@@
-    const landed = await sweepGovernedRoots(await here(Object.keys(e.values ?? {})), {
-      raw: (r, f) => landWorked(r, e.values?.[relative(root, f)]),
-    })
     const { text, spaceMoved } = fileRewrites(…)
@@
     const swept = await sweepGovernedRoots(await here(e.files), { text, raw })
-    const missed = (k: 'skipped' | 'refused'): string[] => [...new Set([...landed[k], ...swept[k]])]
-    return { skipped: missed('skipped').length, refused: missed('refused'), hosts: [] }
+    return { skipped: swept.skipped.length, refused: swept.refused, hosts: [] }
```

▸ Phase 3 (M-6, P-5) adds `MoveEntry`, `containerNote`, and `releaseStrip` to `owed.ts` and widens `owesAnything`'s container line to the `move` kind; none of this hunk's lines change, and its `stableJson` and `cascade` imports stay as they read.

```Core/Nexus/owed.ts diff
@@ imports @@
-import { type Json, same } from '../Files/stableJson'
+import { same } from '../Files/stableJson'
-import type { CascadeReport } from './cascade'
@@ Worked @@
-/** By file, each value a restore worked out and couldn't write: … */
-export type Worked = …
-/** Each value `to` holds other than `from`, as a note keeps it. */
-export const workedOut = …                          (lines 32-41, removed)
@@ RelinkEntry @@
-/** A move's or a restore's re-spell, each old link key mapped to how it spells its page now; `files` scopes a restore's repair of its own landed files to them alone, `rekey` re-keys a Context restored under a new title in its own Spaces' sidecars among them, and `values` holds, by file, what the restore worked out and couldn't write. */
+/** A move's or a restore's re-spell, each old link key mapped to how it spells its page now; `files` scopes a restore's repair of its own landed files to them alone, and `rekey` re-keys a Context restored under a new title in its own Spaces' sidecars among them. */
@@
   rekey?: [from: string, to: string]
-  values?: Worked
 }
@@ owesAnything @@
-  (e.kind === 'relink' && (Object.keys(e.names).length > 0 || !!e.rekey || !!e.values))
+  (e.kind === 'relink' && (Object.keys(e.names).length > 0 || !!e.rekey))
@@ relinkNote doc @@
-/** … its files, and what it worked out for them, follow to where `paths` moves them, … */
+/** … its files follow to where `paths` moves them, … */
@@ relinkNote @@
-  const worked =
-    held?.values && Object.fromEntries(Object.entries(held.values).map(([f, v]) => [paths(f), v]))
@@
-    ...(held?.files ? { files: held.files.map(paths), rekey, values: worked } : {}),
+    ...(held?.files ? { files: held.files.map(paths), rekey } : {}),
@@ oweWorked @@
-/** What a restore worked out for the files it couldn't write … */
-export async function oweWorked(…) { … }            (lines 223-240, removed)
```

(`same` stays for `editNote`, `:145`, and `reachReport`'s import stays for `owedReport`.)

▸ Phases 2 and 3 also rewrite `finishOwed.ts`.

```Core/Nexus/finishOwed.ts diff
@@ finishArm @@
-        left: retries(reach) ? e : { ...e, names: {}, rekey: undefined, values: undefined },
+        left: retries(reach) ? e : { ...e, names: {}, rekey: undefined },
```

▸ Phases 2 and 3 also rewrite `spend.ts`. `restoreTrashed`'s Link refill, final for this phase:

```Core/Trash/spend.ts diff
@@ imports @@
-import { joinCascades, type StrippedLink } from '../Nexus/cascade'
+import { joinCascades } from '../Nexus/cascade'
-import { frozenWorld, parkLinks, refillTrashed } from './trashedCopies'
+import { parkLinks } from './trashedCopies'
@@
-  oweWorked,
@@
-  type Worked,
@@ restoreTrashed @@
   const { after, own } = arrived
-  const worked: Worked = {}
   const settled = after && heldTreeOf(root)
@@ Link refill @@
     const defs = linkDefsOf(tree.config.registry)
     // Back in the Archive the page sits in no settled tree, so only the world from before the landing holds it.
-    const refilled = frozenWorld(settled && !into ? linkWorld(settled, archived) : world)
-    const trashed: StrippedLink[] = []
+    const refilled = settled && !into ? linkWorld(settled, archived) : world
     for (const def of defs) {
@@
       const { taken } = await refillValues(root, def, roots, all, refilled, above)
-      for (const id of Object.keys(all))
-        if (roots.get(id) === undefined)
-          trashed.push({ page: id, property: def.id, value: all[id], above: above[id] })
-        else if (!taken.has(id)) unlinked.add(id)
+      for (const id of Object.keys(all))
+        if (roots.get(id) !== undefined && !taken.has(id)) unlinked.add(id)
     }
-    // A page or Space in the Trash takes its value back into its trashed copy, so it returns with it.
-    Object.assign(worked, await refillTrashed(root, trashed, defs, refilled))
   }
-  const owed = await oweWorked(root, relative(root, targetAbs), title, worked)
-  const cascade = joinCascades(joinCascades(arrived.cascade, owed), recordedPartly(stored, title))
+  const cascade = joinCascades(arrived.cascade, recordedPartly(stored, title))
```

```Core/Properties/assignment.ts diff
@@ refillStash doc @@
-/** Puts the values the Collection at `folder` stashes for `propertyId` back on its pages, and into the Trash copies of pages trashed from it, wherever the property reads blank, … */
+/** Puts the values the Collection at `folder` stashes for `propertyId` back on its pages, trashed ones among them, wherever the property reads blank, … */
@@ imports @@
-import { frozenWorld, parkLinks, trashedHolders } from '../Trash/trashedCopies'
-import { refillValues, type RootsById } from '../Nexus/governedSweep'
-import type { EntityRecord } from '../Nexus/record'
-import { gonePageEntry } from '../Nexus/governedRoot'
+import { parkLinks } from '../Trash/trashedCopies'
+import { partitionGone, refillValues } from '../Nexus/governedSweep'
@@ refillStash @@
-  // The Trash is listed only when a stashed id is missing from the tree, since the listing opens every trashed Set's pages.
-  const unplaced = new Set(Object.keys(values).filter((id) => !byId.has(id)))
-  const trashed = unplaced.size
-    ? await trashedHolders(root, unplaced, collectionId)
-    : new Map<string, string>()
   // A page the tree couldn't read under the Collection could be any id it can't place, so while one is, those stay owed.
   const unread = tree.unreadable?.some((u) => isAtOrUnder(u.path, relative(root, folder)))
-  const unfound = unread ? [...unplaced].filter((id) => !trashed.has(id)) : []
-  const roots: RootsById = new Map<string, Pick<EntityRecord, 'kind' | 'path'>>([
-    ...members,
-    ...[...trashed].map(
-      ([id, file]) => [id, { kind: 'page', path: relative(root, file) }] as const,
-    ),
-  ])
-  const frozen = frozenWorld(linkWorld(tree, archived))
+  const unfound = unread ? Object.keys(values).filter((id) => !byId.has(id)) : []
+  const world = linkWorld(tree, archived)
   // A stashed Link naming a page gone leaves the stash: one whose page the Trash holds joins its bundle, one naming nothing is dropped.
-  const gone =
-    PROPERTY_TYPES[def.type].connections === 'value'
-      ? [...members.keys()].flatMap((id) => {
-          const entry = gonePageEntry(values[id], frozen)
-          return entry === null
-            ? []
-            : [{ page: id, property: propertyId, value: entry, above: stash.above?.[id] }]
-        })
-      : []
-  const { taken, skipped } = await refillValues(root, def, roots, values, frozen, stash.above)
+  const held = Object.fromEntries([...members.keys()].map((id) => [id, values[id]]))
+  const { gone } = partitionGone(def, held, world, stash.above)
+  const { taken, skipped } = await refillValues(root, def, members, values, world, stash.above)
   await parkLinks(root, gone)
-  const owed = new Set([...roots.keys()].filter((id) => !taken.has(id)).concat(unfound))
+  const owed = new Set([...members.keys()].filter((id) => !taken.has(id)).concat(unfound))
```

(`PROPERTY_TYPES` leaves `assignment.ts`'s `./properties` import, the removed partition its one reader: `import type { PropertyDraft } from './properties'`.)

```Core/Trash/restoreProperty.ts diff
@@ imports @@
-import { refillValues } from '../Nexus/governedSweep'
+import { partitionGone, refillValues } from '../Nexus/governedSweep'
-import { gonePageEntry } from '../Nexus/governedRoot'
-import { frozenWorld } from './trashedCopies'
-import { PROPERTY_TYPES, propertyDefinition } from '../Properties/properties'
+import { propertyDefinition } from '../Properties/properties'
@@ restoreInner @@
   const { byId: roots, archived } = await nexusPages(root, tree)
-  const frozen = frozenWorld(linkWorld(tree, archived))
-  const dropped: StrippedLink[] = []
-  const values = Object.fromEntries(
-    Object.entries(record.values).filter(([id, raw]) => {
-      const at = roots.get(id)
-      if ((at !== null && at?.kind !== 'page' && at?.kind !== 'space') || isBlankRaw(raw))
-        return false
-      const entry =
-        PROPERTY_TYPES[def.type].connections === 'value' ? gonePageEntry(raw, frozen) : null
-      if (entry === null) return true
-      dropped.push({ page: id, property: def.id, value: entry, above: record.above?.[id] })
-      return false
-    }),
-  )
-  const { taken } = await refillValues(root, def, roots, values, frozen, record.above)
+  const world = linkWorld(tree, archived)
+  const held = Object.entries(record.values).filter(([id, raw]) => {
+    const at = roots.get(id)
+    return (at === null || at?.kind === 'page' || at?.kind === 'space') && !isBlankRaw(raw)
+  })
+  const { kept: values, gone: dropped } = partitionGone(
+    def,
+    Object.fromEntries(held),
+    world,
+    record.above,
+  )
+  const { taken } = await refillValues(root, def, roots, values, world, record.above)
```

**VERIFY**

- [ ] The new `assignment.test.ts` case is green, and Task 4-4's B-7 case still is.
- [ ] *"emptying a Set holding one of two namesakes hands its record's links to the other"* is green, and watched red with `emptyBundle`'s `parkLinks` hoisted above its first `dispose`, then put back.
- [ ] **Flips:** none beyond the removed `trashedCopies.test.ts` and `spend.test.ts:1005`; `governedRoot.test.ts:261,271` and `governedSweep.test.ts:352` change their arguments alone, as CHANGE names.
- [ ] These print nothing:
  - `git grep -nwE "frozenWorld|Frozen|trashedHolders|refillTrashed|originPagesIn|Worked|workedOut|oweWorked|landWorked" -- Core`;
  - `git grep -n "values: undefined" -- Core/Nexus/finishOwed.ts`;
  - `git grep -n "gonePageEntry" -- Core ':!*.test.ts' | grep -v "governedRoot.ts\|governedSweep.ts\|cascade.ts"`.
- [ ] `trashedCopies.ts` exports `parkLinks` alone.
- [ ] Run the gates.
- [ ] Check for unnecessary code or mistakes.

#### Review Checkpoint

- [ ] **B-9 by Construction:** a page, a Set, a Collection, and a Space that sat in the Trash through a property, option, Space, and Context rename each return holding the new names, with no restore-side rewrite left in the code: `git grep -n "matchOf\|currentKeys\|targets" -- Core/Trash Core/Bundles ':!*.test.ts'` prints nothing.
- [ ] **The Reach Reads One Rule:**
  - The index, the walk, `listInner`, and the watcher judge a stored path by `storeOf` or the store root alone.
  - A governed or scoped reach and the repair sweep take a trashed item's owner from `owningCollection`.
  - `byId` is the one addressing map for both stores.
  - The six display hides read `storeOf`.
- [ ] **Decided Behaviors Hold:**
  - B-2, B-3, B-7, B-8, and B-9 each have a case watched red at its own task's head.
  - The claim rule's four cases and the pass-over are green.
  - A trashed holder's refill miss is named (Decision D-5).
  - A trashed Collection's views and a trashed Space's tile docs follow deletes (Decision D-3).
- [ ] **A Live Drive** on a scratch copy of `~/Test`, from a worktree build (*Development-Environment*):
  1. Trash a page from Collection A.
  2. Rename one of its properties, one of its option words, its Space, and its Context.
  3. Read the trashed file on disk: it holds the new names.
  4. Restore it: it lands holding them, with no notice beyond the restore's own.
  5. Remove another page's bundle in Finder, then rename a property it held: no "Couldn't update" notice.
- [ ] **The Number:** `view-delta`'s Actionable column for the phase is recorded in the Net Ledger's Phase 4 row beside its estimate, and anything above the estimate is reported with what it buys.
- [ ] The two read-only reviewers (`code-simplification`, `adversarial-review`) read the phase outward against Phases 3 and 5's shared files.

---

### Phase 5 — One Restore, Recognition, and the Interface

**GOAL:** One restore in `Core/Bundles/restore.ts` serves both stores, and the arrival every item back from a store runs lives once in `Core/Nexus/arrival.ts`, so a page, Set, or Space moved out of a store by hand finishes through the same tail a restore does (Decisions E-1, E-3, E-4). Every reversible bundle reply carries its own `undo`, one Undo owner follows the item it names, and bundle ops post one notice through one builder. It's a phase of its own because the one restore's size and arms rest on Phase 4's reach-in, and recognition runs its tail (*Investigation · §Order Constraints*, 9).

**THE TREE:** HEAD plus Phases 1–4; every `-` line reads the code as Phase 4 leaves it, and line citations are HEAD's. Phase 2 removed `TrashDeps`, so `settledMutate(root, req)` and `handleMutate(root, req)` take no deps; Phase 4 moved `layout.ts` to `Core/Paths/bundleLayout.ts`, added `storeOf`, `storedPageIds`, `storedSpaces`, and `listBundles`' `chain` parameter, and left `restoreScrub.ts` holding `artifactFiles` and `repairLanded` and `trashedCopies.ts` holding `parkLinks`.

**FLIPS:** each task's VERIFY lists the existing cases its change makes fail and what each becomes. A case that flips and isn't listed is reported, not fixed.

**APPROACH DECIDED (*Investigation · §Approaches Worth Weighing*, 3) · Who Finds the Item to Undo: the Renderer, Through One Helper.** The host composes every Undo request, and the one Undo owner in `confirmations.ts` sends each at its item's place now. `livePagePath` (`Core/Nexus/record.ts:63-66`) widens to `livePath`, covering Sets through `findContainerById` (`Core/Nexus/treePatch.ts:93-94`), which the tree already answers. The reader, `assignValue`, and the Undo owner then share it, and `rearchive`'s own lookup over `nodesByIdOf` (`Core/Bundles/browser.ts:152-168`) leaves. A host-side resolver would have added a third follow-by-id beside these two.

**DEPARTURES, DISCLOSED:**
- **`respell` Into `cascade.ts`:** `returningCascade` re-spells through `respell` (`Core/Nexus/settle.ts:299-308`), which `relink` and `departingCascade` also call. `arrival.ts` can't import `settle.ts`, since `settle.ts` imports it for recognition, so `respell` moves beside `noteRelink` in `Core/Nexus/cascade.ts`, which both import. That's a function moved between existing files that *§Placements* doesn't name.
- **`settledIndex` Stays in the Settle:** `returningCascade` takes the settled index as a parameter instead of calling `settledIndex` (`settle.ts:272-276`), for the same reason; a restore passes `settledIndex(root)`, and the outside lane passes the tree it already settled.
- **The One Missing-Artifact Refusal's Copy:** the Trash's "That deletion never finished; there is nothing to restore." (`spend.ts:136-137`) and the Archive's `NOT_HELD` (`archive.ts:95-96`) become `readBundleAt`'s own "That item is no longer there." (`bundle.ts:230`), which reads right for either store. The case arises only for a bundle whose artifact has left.
- **`archivedKind` Stays (L-7, Handed On by Phase 2):** it builds the Archive's delete request's `kind` (`browser.ts:59-60,119`) because `BundleRow.kind` spans both stores and includes `'property'`; typing the row per store to drop one coercing line would cost more than the line. It stays, read only by `requestOf`'s delete arm, which only the Archive's `rulesOf` reaches.
- **An Archive Restore's Undo Whose Item Has Left the Tree:** `rearchive` skipped such an item without a word (`browser.ts:156-159`); the one Undo owner sends it at the path it stood at, and the host refuses it with its own message.
- **An Undo Over Several Bundles Counts Its Refusals:** the old Undo sent each restore non-quiet, so a refusal posted the host's message until a later row's line replaced it; the one run counts what it couldn't do as a batch does, in one new line, "N Pages couldn’t be undone.", and a lone Undo's refusal keeps the host's message.

#### Task 5-1

**TASK:** Following an item by its id covers a Set as well as a page (*Approaches* 3): `livePagePath` widens to `livePath`, through `findContainerById`, which the tree already answers. The reader and `assignValue` read it now, and from Task 5-2 the one Undo owner reads it in place of `rearchive`'s own lookup over `nodesByIdOf`. **Comments:** none added or removed.

**NOW:** `livePagePath` follows a page alone (`Core/Nexus/record.ts:63-66`), for `PageReaderWindow.tsx:48,140` and `Core/Properties/assignValue.ts:97`; a Set followed by id has only `rearchive`'s lookup (`Core/Bundles/browser.ts:152-168`).

**CHANGE**

- [ ] Write **`treeIndex.test.ts`, `describe('livePath')`, "follows a page or a Set by its id across a rename, else answers where it stood"**: over a `makeTree()` whose first Set is renamed, the Set's id answers its new path, a page's id answers its path through the page index, and an unknown id answers the path given.
- [ ] Apply the AFTER.
- [ ] Rename `livePagePath` to `livePath` at `PageReaderWindow.tsx:20,48,140` and `assignValue.ts:8,97`.

**AFTER**

```Core/Nexus/record.ts diff
@@ imports @@
 import { entityMemo, type NexusTree, type SetNode } from './tree'
+import { findContainerById } from './treePatch'
@@ livePagePath @@
-export const livePagePath = (
-  tree: NexusTree | null,
-  target: { id: string; path: string },
-): string => (tree && pagesByIdOf(tree).get(target.id)?.path) ?? target.path
+export const livePath = (tree: NexusTree | null, target: { id: string; path: string }): string =>
+  (tree && (pagesByIdOf(tree).get(target.id) ?? findContainerById(tree, target.id))?.path) ??
+  target.path
```

`treePatch.ts` imports nothing from `record.ts`, so the import adds no cycle.

**VERIFY**

- [ ] The case is green, and its Set assertion red with `livePath`'s `findContainerById` arm removed (the renamed Set's id then answers the path given).
- [ ] **Flips:** none.
- [ ] `git grep -n "livePagePath" -- Core` prints nothing.
- [ ] Run the gates.
- [ ] Check for unnecessary code or mistakes.

#### Task 5-2

**TASK:** Every reversible bundle reply carries its own `undo` (M-13), and bundle ops post one notice through one builder (M-14). A delete's, a property delete's, and an archive's `undo` is the restore of the bundle it minted, and a delete from the Archive's returns it to the Archive address it left, carried in the request rather than in the record (L-9). `notifyBundled` in `Core/Interface/Notifications/notifications.ts` (*§Placements*) builds the one notice from what the rows' replies said; `runBundled` in `confirmations.ts` sends the rows, gathers the replies for it, and hands their Undo requests to `offerUndo`, which sends each at its item's place now (*Approaches* 3). A single row runs as a batch of one, so a delete, a property delete, an archive, a browser's restore or delete, and an Undo's own run all go through it, and the slice posts nothing for a bundle op but a lone row's refusal, which keeps the host's message. This closes B-4. `MutateOutcome.bundled`, the record's `archive` field, the renderer-chosen destination, `rearchive`'s lookup, `offerDeleted`, and the browser's `restoreOne`, `deleteOne`, `many`, `restoreBatch`, and `deleteBatch` leave. It's one task because the replies' shape and every renderer reader of it change together: once `bundled` leaves and the archive destination needs its `at`, any renderer form short of the final one would be rewritten a commit later. **Fold:** `notifyDeleted`'s cascade and retry parameters lose their only caller, `offerDeleted`, so the views' two callers keep the title and Undo alone; `confirmations.ts`'s `Asked` is the notice's `Titled`, which `Acted` extends, so the shape is written once. **Comments:** the AFTER adds three (`atItemNow`'s, `notifyBundled`'s, and `runBundled`'s) and removes ten (`bundled`'s, the record's `archive`, `Undone`'s, `undoneOf`'s, `rearchive`'s, `offerDeleted`'s, `restoreOne`'s doc and inline, `many`'s, and `deleteBatch`'s inline); `bundleOf`'s is test support.

**NOW:**
- **Replies:** `deleteOp` replies `bundled` (`Core/Trash/delete.ts:222`, unconditional after Phase 2), as do `deleteInner` (`Core/Properties/deleteProperty.ts:113`) and `archiveOp` (`Core/Archive/archive.ts:64`); `restoreArchived` replies a composed `undo` (`archive.ts:125-133`). `MutateOutcome.bundled` is documented at `Core/Nexus/mutateRequest.ts:20-21`.
- **The Archive Address:** `fromArchive` writes it into the record as `archive` (`delete.ts:59`, decoded at `Core/Bundles/record.ts:56-57`), which only `placeRecord`'s archive arm reads (`Core/Bundles/placement.ts:247-250`); the renderer chooses the destination with `ARCHIVE_UNDO` (`Core/Bundles/browser.ts:108,256`). `restoreDestination`'s archive arm carries no address (`mutateRequest.ts:48-52`).
- **The Undo:** `offerUndo` restores bundle paths to a passed destination (`Core/Interface/Confirm/confirmations.ts:54-70`), each non-quiet (`:64`), so the slice posts its lines and, when a restore answers both an unrestored line and a warning, the warning replaces the line. The browser re-sends an Archive restore's `undo` through `Undone`, `undoneOf`, and `rearchive`, finding the item over `nodesByIdOf` by the row's `stored.id` (`browser.ts:144-168`).
- **Four Notices:** `restoreOne` (`browser.ts:383-399`) and `deleteOne` (`:401-407`) beside `many`, `restoreBatch`, and `deleteBatch` (`:410-497`), which collect `bundled` and `undone`; `offerDeleted` through `notifyDeleted` (`confirmations.ts:113-124`, `notifications.ts:130-140`); and `confirmArchive`'s `notifyUndoable` (`confirmations.ts:143-146`), which carries no warning: an archive whose re-spell can't settle has its `warnCascade` and Try Again replaced (B-4, `post` keeping one notice, `notifications.ts:56-59`). `confirmations.ts:27`'s `Asked` and `notifyBundled`'s rows are one shape.
- **The Slice:** a non-quiet `mutate` posts `unrestoredLine` and, for every op but `delete` and `deleteProperty`, `warnCascade` (`Core/Session/nexusSlice.ts:267-279`); `quiet` (`:68,259-260`) has one caller (`browser.ts:436`), and a quiet refusal answers `null` with nothing posted.

**CHANGE**

- [ ] Write these and watch each fail:
  - **`archive.test.ts`, beside `:818`, "a delete from the Archive answers the Undo that files it back at the address it left, and its record keeps none":** the reply's `undo` equals `{ op: 'restore', bundlePath: trashed, destination: { kind: 'archive', at: archived } }`, and `readRecord(at(trashed))` has no `archive` key. Fails today on `undo` being absent.
  - **`deleteProperty.test.ts`, "a property delete answers the Undo that restores its bundle":** the reply's `undo` is `{ op: 'restore', bundlePath }` for the bundle `listBundles` finds.
  - **`browser.test.ts:351`, rewritten in place as "an Archive restore's Undo sends each reply's own request at the item's place now, followed by the id its record carries":** `record` gains `id: 'p1'` for Alpha and `id: 'p2'` for Beta (one `recordOf(id)` helper in the describe), and the expectation keeps its shape. Fails today because `rearchive` reads `row.stored.id`, which the rewrite drops from both rows.
  - **`confirmations.test.ts`, `describe('an archive through the confirmation')`, "an archive whose re-spell couldn't settle posts Archived “A” with its warning and Try Again" (B-4):** `mutate` answers `{ cascade: { pages: [], hosts: [], warning: 'Links weren’t updated.', owed: true }, undo: { op: 'restore', bundlePath: BUNDLE } }`; the notice is `{ message: 'Archived “A”. Links weren’t updated.', tone: 'error', action: { label: 'Try Again' } }`. Fails today: the notice reads `Archived “A”` alone.
  - **`confirmations.test.ts`, `describe('an Undo over several bundles')`, "an Undo's own run posts every line its replies carry in one notice":** two restore requests whose replies carry `unrestored: ['Beta']` and a warning; after the Undo runs (`vi.waitFor`, as `:380` does), one notice reads `Beta didn’t get its value back. <warning>`. Fails today: the old `offerUndo` posts nothing of its own.
  - **`confirmations.test.ts`, `describe('an Undo over several bundles')`, "an Undo over several bundles counts a refusal among its lines":** two restore requests, `mutate` answering `null` for the first and `{ cascade: { pages: [], hosts: [], warning: 'W' } }` for the second; after the Undo runs, the one notice reads `1 Page couldn’t be undone. W`. Red with `notifyBundled`'s refused line kept to a verb (`verb && !lone && …`): the notice reads `W` alone, the refusal lost.
  - **`confirmations.test.ts`, "a bundle op's success posts nothing from the slice":** with the real `mutate` and a dialer whose `mutate` answers `{ unrestored: ['Beta'], cascade: { pages: [], hosts: [], warning: 'W' } }`, `useSession.getState().mutate({ op: 'restore', bundlePath: '.trash/b1' })` leaves `currentNotification()` null. Fails today: the slice posts the warning over the unrestored line.
  - **`TrashFrame.test.tsx`, "a lone restore's refusal is the host's message, with no count":** `mutate` answers `fault('That item is no longer there.')`; the notice reads exactly that. Passes today and must stay green: it pins the batch of one.
- [ ] Apply the AFTER.
- [ ] Rewrite every test read of a reply's `bundled` (94 lines across 19 files, `git grep -n "bundled" -- 'Core/**/*.test.ts' 'Core/**/*.test.tsx'`) through `bundleOf(reply)` from `Core/Testing/settledMutate.ts`. Remove `settle.test.ts:1329`'s local `bundleOf` and `refile.test.ts:45`'s `bundled` in its favor. Stubs that answer `bundled: { bundlePath: X }` answer `undo: { op: 'restore', bundlePath: X }`, apart from `ArchiveView.test.tsx:388,441`, whose Archive deletes answer `undo: { op: 'restore', bundlePath: X, destination: { kind: 'archive', at: <the row's address> } }`, as the host now composes it, and whose `:398,458` expect that request.
- [ ] Rewrite `archive.test.ts:807`'s `UNDO` constant as `const undoTo = (archived: string): RestoreDestination => ({ kind: 'archive', at: archived })`, and each `restore(trashed, UNDO)` (`:941-1219`) as `restore(trashed, undoTo(archived))` for the address its case archived; `:1225`'s `restore(archived, UNDO)` becomes `restore(archived, undoTo(archived))`. Drop `archive: archived` from `:827`'s expectation.
- [ ] Rewrite `spend.test.ts:2229-2244`, "refuses an Undo whose record names a path outside the Archive", as "refuses an Undo whose address lies outside the Archive": the record write drops `archive`, and the restore sends `destination: { kind: 'archive', at: '../Notes/Beta.md.archived' }`. Its expectations hold. `:2216`'s destination becomes `{ kind: 'archive', at: '.nexus/archive/c1/x' }`, and its expectation holds.
- [ ] Rewrite `mutateRequest.test.ts:55-66` so the archive arm keeps `at` and drops a stray `id`: `destination: { kind: 'archive', at: 'a', id: 'x' }` reads back as `{ kind: 'archive', at: 'a' }`.
- [ ] Rewrite `confirmations.test.ts:380`, "offers one Undo returning every bundle it was handed to the destination given", as "offers one Undo running every request it was handed", over `[{ title: 'A', kind: 'page', req: { op: 'restore', bundlePath: '.trash/b1', destination: { kind: 'archive', at: 'x' } } }, { title: 'B', kind: 'page', req: { op: 'restore', bundlePath: '.trash/b2' } }]`: a run of two sends each quietly, so `mutate.mock.calls` equal each request beside `{ quiet: true }`. `:392` passes the same two rows.
- [ ] Rewrite `TrashFrame.test.tsx:272,288,307`'s `offerUndo([bundlePath], …)` as `offerUndo([{ title: 'Alpha', kind: 'page', req: { op: 'restore', bundlePath } }], …)` (`listed[0].bundlePath` at `:307`); their expectations hold.
- [ ] Move the cases that pass `notifyDeleted` a cascade or a retry to the builder that now owns their behavior, each keeping its expectations: `notifications.test.ts:44` (*"carries a note beside its Undo"*) and `:86` (*"offers Try Again beside its note, and keeps Undo on the chord"*) call `notifyOutcome('Deleted “X”', undefined, ['Couldn’t update 1 Item.'], undo)`, `:86` passing `retry` after it; `:55,62` (*"counts the pages whose links it stripped behind a segment"*), `:67` (*"joins a warning to the count"*), and `:79` (*"keeps Undo on the label when a count arrives without a warning"*) call `notifyBundled('Deleted', lone('Ideas', 2), undo)` and its like, through one describe-local `lone = (title: string, links: number, warnings: string[] = []): Bundled => ({ done: [{ title, kind: 'page' }], refused: [], unrestored: [], warnings, renamed: [], links })`, `:79` passing `vi.fn()` as its retry; and `ActionLabel.test.tsx:60` draws through `notifyOutcome('Deleted “Ideas”', '2 Internal Links', [], vi.fn())`. Every other `notifyDeleted` call in both suites passes the title and an Undo alone and holds.
- [ ] `notifyDeleted`'s two view callers (`Core/Tiles/Surfaces/ViewTile.tsx:398`, `Core/Views/deleteViewWithUndo.ts:14`) keep `notifyDeleted(name, undo)` unchanged.
- [ ] Rewrite `NexusRecordPM.md:16`'s "the delete answers with the bundle it minted, and **Undo** restores from that path without the frame being opened" as "the delete answers the Undo that restores the bundle it minted, which **Undo** sends without the frame being opened".

**AFTER**

```Core/Nexus/mutateRequest.ts diff
@@ MutateOutcome @@
   adopted?: string
-  /** Where a removal filed what it took, in the Trash or an Archive. */
-  bundled?: { bundlePath: string }
   /** The titles of what a restore brought back without all it held. */
@@ restoreDestination @@
-/** Checked against the write path's own destination rules: a contradicting claim is refused as malformed. `archive` is a delete from the Archive's Undo, returning the item to the address its record names. */
+/** Checked against the write path's own destination rules: a contradicting claim is refused as malformed. `archive` is a delete from the Archive's Undo, returning the item to the Archive address `at` it left. */
 const restoreDestination = z.discriminatedUnion('kind', [
   z.object({ kind: z.enum(['container', 'context']), id: z.string() }),
-  z.object({ kind: z.literal('archive') }),
+  z.object({ kind: z.literal('archive'), at: z.string() }),
 ])
```

```Core/Bundles/record.ts diff
@@ contentRecord @@
     trail: z.array(z.string()).optional(),
-    /** A Trash record's only: the Archive address a delete took the item from, a bundle or an inner item of one, where its Undo files it back. */
-    archive: z.string().optional(),
     /** Each Link value the delete stripped from a page outside it, by that page's id and the property's, so a restore can put it back. */
```

▸ Task 3-1 gave `deleteOp` one tail and one reply; `from` is `fromArchive`'s answer.

```Core/Trash/delete.ts diff
@@ fromArchive doc @@
-/** A delete naming an Archive bundle, or an inner item of one, takes it to the Trash under the chain it was archived from, so a Trash restore returns it there, and its record keeps the address it left for the Undo. Link values name its pages where they lived. */
+/** A delete naming an Archive bundle, or an inner item of one, takes it to the Trash under the chain it was archived from, so a Trash restore returns it there, and answers the address it left for the Undo. Link values name its pages where they lived. */
@@ fromArchive @@
     edit: sets.length ? goneContainers(sets) : null,
-    record: { ...held, archive: relative(root, resolved.value) },
+    record: held,
+    at: relative(root, resolved.value),
   })
@@ deleteOp @@
-    if (!ran.ok) await unmoved()
-    return ran.ok ? ok({ bundled: { bundlePath: into }, cascade: ran.value.cascade }) : ran
+    if (!ran.ok) {
+      await unmoved()
+      return ran
+    }
+    return ok({
+      undo: {
+        op: 'restore',
+        bundlePath: into,
+        ...(from ? { destination: { kind: 'archive', at: from.at } } : {}),
+      },
+      cascade: ran.value.cascade,
+    })
```

```Core/Properties/deleteProperty.ts diff
@@ deleteInner's reply @@
-  return ok({ bundled: { bundlePath: relative(root, bundle) }, cascade: ran.value.cascade })
+  return ok({
+    undo: { op: 'restore', bundlePath: relative(root, bundle) },
+    cascade: ran.value.cascade,
+  })
```

```Core/Archive/archive.ts diff
@@ archiveOp @@
-  return ok({ ...(cascade ? { cascade } : {}), bundled: { bundlePath: filed.address } })
+  return ok({
+    ...(cascade ? { cascade } : {}),
+    undo: { op: 'restore', bundlePath: filed.address },
+  })
```

```Core/Bundles/placement.ts diff
@@ placeRecord's archive arm @@
   if (destination?.kind === 'archive') {
-    if ((stored.entity !== 'page' && stored.entity !== 'set') || !stored.archive)
-      return fault(NO_DESTINATION)
-    const filing = await archiveFiling(root, tree, stored, stored.archive)
+    if (stored.entity !== 'page' && stored.entity !== 'set') return fault(NO_DESTINATION)
+    const filing = await archiveFiling(root, tree, stored, destination.at)
     if (!filing.ok) return filing
```

`archiveFiling` already refuses an address outside the Archive (`placement.ts:196-197`), which is what `spend.test.ts:2229`'s rewritten case pins.

```Core/Trash/spend.ts diff
@@ restoreTrashed's Undo filing @@
-      const { archive, links, ...filed } = record
+      const { links, ...filed } = record
```

```Core/Bundles/rows.ts diff
@@ BundleRow.stored @@
-  /** A page or Set as stored, by its record's id and its path in the Nexus: what the reader opens and a restore's Undo finds again. */
+  /** A page or Set as stored, by its record's id and its path in the Nexus: what the reader opens. */
   stored?: { id: string; path: string }
```

```Core/Testing/settledMutate.ts diff
@@ settledMutate @@
   return reply
 }
+
+/** The bundle a removal's reply filed what it took in, read from the Undo that restores it; empty for a refusal. */
+export const bundleOf = (reply: MutateReply): string =>
+  reply.ok && reply.value.undo?.op === 'restore' ? reply.value.undo.bundlePath : ''
```

```Core/Session/nexusSlice.ts diff
@@ imports @@
   notifyUnreadable,
   reportRefusal,
-  unrestoredLine,
 } from '../Interface/Notifications/notifications'
@@ NexusSlice.mutate doc @@
-  /** `quiet` posts nothing — no refusal, report, warning, or store change — for a batch that reports once for all its rows; `retry` is a value write's Try Again. */
+  /** `quiet` posts nothing — no refusal, report, warning, or store change — for a batch that reports once for all its rows; a bundle op's caller posts its own notice from the reply (`runBundled`), so for one the slice posts only a refusal; `retry` is a value write's Try Again. */
@@ mutate @@
       if (!quiet) {
-        if (res.value.unrestored) notifyReport(unrestoredLine(res.value.unrestored), true)
         const { cascade, missed } = res.value
-        if (req.op !== 'delete' && req.op !== 'deleteProperty' && cascade)
+        const bundleOp =
+          req.op === 'delete' ||
+          req.op === 'deleteProperty' ||
+          req.op === 'archive' ||
+          req.op === 'restore' ||
+          req.op === 'emptyBundle'
+        if (cascade && !bundleOp)
           warnCascade(
```

The bundle ops are named where the slice reads them, their one reader; `changesSettled` and `changesStores` beside them each answer a set of their own.

```Core/Interface/Notifications/notifications.ts diff
@@ imports @@
-import type { CascadeReport } from '../../Nexus/cascade'
+import { type Counted, countPhrase } from '../../Nexus/entities'
 import type { Unreadable } from '../../Nexus/tree'
@@ notifyDeleted @@
-export function notifyDeleted(
-  title: string,
-  undo?: () => void | Promise<void>,
-  { pages = [], warning }: Partial<Pick<CascadeReport, 'pages' | 'warning'>> = {},
-  retry?: () => void,
-): () => void {
-  const links = pages.length
-    ? `${pages.length} Internal ${pages.length === 1 ? 'Link' : 'Links'}`
-    : undefined
-  return notifyOutcome(`Deleted “${title}”`, links, [warning], undo, retry)
-}
+export const notifyDeleted = (title: string, undo?: () => void | Promise<void>): (() => void) =>
+  notifyOutcome(`Deleted “${title}”`, undefined, [], undo)
+
+export type Titled = Counted & { title: string }
+
+export interface Bundled {
+  done: Titled[]
+  refused: Titled[]
+  unrestored: string[]
+  warnings: string[]
+  renamed: string[]
+  links: number
+}
+
+/** A bundle op's one notice: `verb` with its lone row's title, as it landed when stepped aside, or with its rows' count; then the links a lone delete stripped, or a batch's renames; then every line that didn't go as asked, a batch's refusals counted among them, offering `retry`. A lone row's refusal is the host's message, which the slice already posted, and an Undo's own run, with no verb, posts only its lines. */
+export function notifyBundled(
+  verb: 'Restored' | 'Deleted' | 'Archived' | null,
+  { done, refused, unrestored, warnings, renamed, links }: Bundled,
+  undo?: () => void | Promise<void>,
+  retry?: () => void,
+): () => void {
+  const lone = done.length + refused.length === 1
+  const unmet = [
+    !lone &&
+      refused.length > 0 &&
+      `${countPhrase(refused)} couldn’t be ${verb?.toLowerCase() ?? 'undone'}.`,
+    unrestored.length > 0 && unrestoredLine(unrestored),
+    ...warnings,
+  ].filter((line): line is string => typeof line === 'string')
+  if (!verb || (lone && !done.length))
+    return unmet.length ? notifyUndoable(unmet.join(' '), undefined, 'error', retry) : () => {}
+  const head = lone ? (renamed[0] ?? `“${done[0].title}”`) : countPhrase(done)
+  const segment = lone
+    ? verb === 'Deleted' && links > 0
+      ? `${links} Internal ${links === 1 ? 'Link' : 'Links'}`
+      : undefined
+    : renamed.length > 1
+      ? `${renamed.length} Renamed`
+      : renamed[0]
+  return notifyOutcome(`${verb} ${head}`, segment, unmet, undo, retry)
+}
```

`notifyBundled` is the one place a bundle op's head, segment, and lines are composed; `notifyOutcome` stays the shape every notice with a head and lines takes, which the views and the slice share.

```Core/Interface/Confirm/confirmations.ts diff
@@ imports @@
-import type { MutateOutcome, RestoreDestination } from '../../Nexus/mutateRequest'
+import type { MutateRequest } from '../../Nexus/mutateRequest'
+import { livePath } from '../../Nexus/record'
+import { basename } from '../../Paths/posix'
 import { type Counted, countPhrase, type HeldKind, itemCount } from '../../Nexus/entities'
@@
 import { useSession } from '../../Session/store'
+import { storesChanged } from '../../Session/nexusSlice'
@@
-import { notifyDeleted, notifyUndoable, reportRefusal } from '../Notifications/notifications'
+import {
+  type Bundled,
+  notifyBundled,
+  reportRefusal,
+  type Titled,
+} from '../Notifications/notifications'
@@ Asked @@
-type Asked = Counted & { title: string }
-
 /** What a delete asks of what it acts on: one by its title, more by their count. */
-const deleteQuestion = (targets: readonly Asked[]): string =>
+const deleteQuestion = (targets: readonly Titled[]): string =>
@@ offerUndo @@
-/** Posts through `post` with the one Undo that restores every bundle an act minted, to `destination` when given, arming each so a restore of any one from elsewhere spends it; an act that minted none offers none. */
-export function offerUndo(
-  bundlePaths: readonly string[],
-  post: (undo?: () => Promise<void>) => () => void,
-  destination?: RestoreDestination,
-): void {
-  const spend = post(
-    bundlePaths.length > 0
-      ? async () => {
-          for (const bundlePath of bundlePaths) {
-            spendUndo(bundlePath)
-            await useSession.getState().mutate({ op: 'restore', bundlePath, destination })
-          }
-        }
-      : undefined,
-  )
-  for (const bundlePath of bundlePaths) armed.set(bundlePath, spend)
-}
+/** An Archive restore's Undo at the place its item stands now, followed by the id its record carries, under its new name once a rename has given it one. */
+const atItemNow = (req: MutateRequest): MutateRequest => {
+  const id = req.op === 'archive' ? req.back?.record.id : undefined
+  if (req.op !== 'archive' || !req.back || typeof id !== 'string') return req
+  const path = livePath(useSession.getState().tree, { id, path: req.path })
+  return basename(path) === basename(req.path)
+    ? { ...req, path }
+    : { ...req, path, back: { ...req.back, name: basename(path) } }
+}
+
+/** Posts through `post` with the one Undo that runs every request an act's replies carried, each at its item's place now, as one run whose lines post together, arming each restore's bundle so a restore of it from elsewhere spends the Undo; an act that answered none offers none. */
+export function offerUndo(
+  undos: readonly Acted[],
+  post: (undo?: () => Promise<void>) => () => void,
+): void {
+  const spend = post(
+    undos.length > 0
+      ? async () => {
+          for (const { req } of undos) if (req.op === 'restore') spendUndo(req.bundlePath)
+          await runBundled(null, undos.map((u) => ({ ...u, req: atItemNow(u.req) })))
+        }
+      : undefined,
+  )
+  for (const { req } of undos) if (req.op === 'restore') armed.set(req.bundlePath, spend)
+}
+
+type Acted = Titled & { req: MutateRequest; address?: string }
+
+const steppedTo = (title: string, landedAs: string): string => `“${title}” as “${landedAs}”`
+
+/** Sends each row's request in turn and posts one notice through `notifyBundled` for what they did, with the one Undo their replies carry: a lone row posts its refusal through the slice, a batch counts its refusals, a row's success spends the Undo armed on its `address`, a browser row's bundle, and a switch away from `nexusId`, the Nexus the act began in, stops it with nothing posted. Answers whether any row went through. */
+export async function runBundled(
+  verb: 'Restored' | 'Deleted' | 'Archived' | null,
+  rows: readonly Acted[],
+  nexusId = useSession.getState().tree?.nexus.id,
+): Promise<boolean> {
+  const { mutate, finishOwed } = useSession.getState()
+  const switched = (): boolean => useSession.getState().tree?.nexus.id !== nexusId
+  const counted = rows.length > 1
+  const run: Bundled = {
+    done: [],
+    refused: [],
+    unrestored: [],
+    warnings: [],
+    renamed: [],
+    links: 0,
+  }
+  const undos: Acted[] = []
+  let owed = false
+  for (const row of rows) {
+    if (switched()) break
+    const res = counted ? await mutate(row.req, { quiet: true }) : await mutate(row.req)
+    ;(res ? run.done : run.refused).push(row)
+    if (!res) continue
+    if (row.address) spendUndo(row.address)
+    run.unrestored.push(...(res.unrestored ?? []))
+    const warning = res.cascade?.warning
+    if (warning && !run.warnings.includes(warning)) run.warnings.push(warning)
+    run.links += res.cascade?.pages.length ?? 0
+    owed ||= !!res.cascade?.owed
+    if (res.landedAs) run.renamed.push(steppedTo(row.title, res.landedAs))
+    if (res.undo) undos.push({ title: row.title, kind: row.kind, req: res.undo })
+  }
+  if (counted) storesChanged.emit()
+  if (switched()) return false
+  offerUndo(undos, (undo) => notifyBundled(verb, run, undo, owed ? finishOwed : undefined))
+  return run.done.length > 0
+}
@@ askTrashing @@
-export const askTrashing = async (targets: readonly Asked[]): Promise<boolean> => {
+export const askTrashing = async (targets: readonly Titled[]): Promise<boolean> => {
@@ askEmptyTrash @@
-export const askEmptyTrash = async (targets: readonly Asked[]): Promise<boolean> => {
+export const askEmptyTrash = async (targets: readonly Titled[]): Promise<boolean> => {
@@ confirmDelete @@
 ): Promise<boolean> => {
-  const asked =
-    'propertyId' in target
-      ? askDestroyProperty(target.propertyId, target.title)
-      : askTrashing([target])
-  if (!(await asked)) return false
-  const done = await useSession
-    .getState()
-    .mutate(
-      'propertyId' in target
-        ? { op: 'deleteProperty', propertyId: target.propertyId }
-        : { op: 'delete', path: target.path, kind: target.kind },
-    )
-  if (!done) return false
-  offerDeleted(target.title, done)
-  return true
+  const { title } = target
+  if ('propertyId' in target) {
+    if (!(await askDestroyProperty(target.propertyId, title))) return false
+    const req = { op: 'deleteProperty', propertyId: target.propertyId } as const
+    return runBundled('Deleted', [{ title, kind: 'property', req }])
+  }
+  if (!(await askTrashing([target]))) return false
+  const req = { op: 'delete', path: target.path, kind: target.kind } as const
+  return runBundled('Deleted', [{ title, kind: target.kind, req }])
 }
@@ offerDeleted @@
-/** A delete's one notice, by `title`: the Undo for the bundle it minted, to `undoTo` when given, and the cascade's links, warning, and Try Again. */
-export function offerDeleted(
-  title: string,
-  { bundled, cascade }: MutateOutcome,
-  undoTo?: RestoreDestination,
-): void {
-  …                                                    (lines 118-123, removed)
-}
-
@@ confirmArchive @@
-  const done = await useSession
-    .getState()
-    .mutate({ op: 'archive', path: target.path, kind: target.kind })
-  if (done)
-    offerUndo(done.bundled ? [done.bundled.bundlePath] : [], (undo) =>
-      notifyUndoable(`Archived “${target.title}”`, undo),
-    )
+  const req = { op: 'archive', path: target.path, kind: target.kind } as const
+  await runBundled('Archived', [{ title: target.title, kind: target.kind, req }])
 }
```

`Acted` stays private: the browser hands its rows inline, and a test types them as `Parameters<typeof runBundled>[1]`.

```Core/Bundles/browser.ts diff
@@ imports @@
-import {
-  askEmptyTrash,
-  askTrashing,
-  offerDeleted,
-  offerUndo,
-  spendUndo,
-} from '../Interface/Confirm/confirmations'
-import { countPhrase, isContainerKind } from '../Nexus/entities'
-import { notifyOutcome, unrestoredLine } from '../Interface/Notifications/notifications'
-import type { MutateOutcome, MutateRequest, RestoreDestination } from '../Nexus/mutateRequest'
-import { nodesByIdOf } from '../Nexus/treeIndex'
+import { askEmptyTrash, askTrashing, runBundled } from '../Interface/Confirm/confirmations'
+import { isContainerKind } from '../Nexus/entities'
+import type { MutateRequest, RestoreDestination } from '../Nexus/mutateRequest'
 import { matches, matchQuery } from '../Paths/caseFold'
-import { basename, isAtOrUnder, relDirname } from '../Paths/posix'
+import { isAtOrUnder, relDirname } from '../Paths/posix'
@@ steppedTo @@
-const steppedTo = (title: string, landedAs: string): string => `“${title}” as “${landedAs}”`
-
@@ ARCHIVE_UNDO @@
-const ARCHIVE_UNDO: RestoreDestination = { kind: 'archive' }
-
 type BundleOp = 'restore' | 'emptyBundle' | 'delete'
@@ Undone, undoneOf, rearchive @@
-/** A restored row and the archive request its reply says takes the restore back. */
-type Undone = { row: BundleRow; undo: Extract<MutateRequest, { op: 'archive' }> }
-
-/** The row with the archive request its reply carries, when it carries one. */
-const undoneOf = (row: BundleRow, { undo }: MutateOutcome): Undone[] =>
-  undo?.op === 'archive' ? [{ row, undo }] : []
-
-/** A restore from the Archive undoes by sending each reply's own request, the item found by id so it follows a rename made since, under that new name once it has one. */
-const rearchive = (undone: Undone[]) => async (): Promise<void> => {
-  …                                                    (lines 153-167, removed)
-}
-
@@ rulesOf @@
-/** What the Trash and the Archive do differently under one browser: the date column's setting, what a delete sends and how it asks, and what a restore's and a delete's Undo do. */
+/** What the Trash and the Archive do differently under one browser: the date column's setting, and what a delete sends and how it asks. */
 function rulesOf(kind: BundleStore['kind']): {
   dateKey: DateKey
   deleteOp: 'emptyBundle' | 'delete'
   askDelete: (targets: BundleRow[]) => Promise<boolean>
-  restoreUndo?: (undone: Undone[]) => () => Promise<void>
-  deleteUndo?: RestoreDestination
 } {
@@ rulesOf's archive arm @@
         askDelete: askTrashing,
-        restoreUndo: rearchive,
-        deleteUndo: ARCHIVE_UNDO,
       }
@@ useBundleBrowser's answer @@
-  restore: (targets: BundleRow[]) => Promise<void>
+  restore: (targets: BundleRow[], destination?: RestoreDestination) => Promise<void>
@@ useBundleBrowser @@
   const nexusId = useSession((s) => s.tree?.nexus.id)
-  const mutate = useSession((s) => s.mutate)
-  const finishOwed = useSession((s) => s.finishOwed)
   const [listing, setListing] = useState<Listing>({ status: 'loading' })
@@ restoreOne, deleteOne, many, restoreBatch, deleteBatch, restore, remove @@
-  /** A row whose place is gone asks where to go first, unless the menu's submenu already chose. */
-  const restoreOne = async (…) => { … }                (lines 383-399, removed)
-  const deleteOne = async (…) => { … }                 (lines 401-407, removed)
-  /** Answers null when a Nexus switch stopped it, … */
-  const many = async (…) => { … }                      (lines 410-451, removed)
-  const restoreBatch = async (…) => { … }              (lines 453-477, removed; its ask's comment moves into `restore`)
-  const deleteBatch = async (…) => { … }               (lines 479-497, removed)
-
   // A re-list can drop the checked rows a frame before the bar withdraws, so a press may name none.
-  const restore = (targets: BundleRow[]): Promise<void> =>
-    flight(async () => {
-      if (targets.length > 1) return restoreBatch(targets)
-      if (targets.length) return restoreOne(targets[0])
-    })
+  const restore = (targets: BundleRow[], destination?: RestoreDestination): Promise<void> =>
+    flight(async () => {
+      if (!targets.length) return
+      // What has no home left asks once where it goes, one ask per kind of destination, unless a menu's submenu chose, and a dismissed ask restores nothing.
+      const to = new Map<DestinationKind, RestoreDestination>()
+      const homeless = destination ? [] : targets.filter((r) => !r.homeResolves)
+      for (const kind of new Set(homeless.map(destinationKind))) {
+        const asked = await askDestination(kind)
+        if (!asked) return
+        to.set(kind, asked)
+      }
+      const toOf = (row: BundleRow): RestoreDestination | undefined =>
+        destination ?? (row.homeResolves ? undefined : to.get(destinationKind(row)))
+      const rows = targets.map((row) => ({
+        ...row,
+        address: row.bundlePath,
+        req: requestOf(row, 'restore', toOf(row)),
+      }))
+      await runBundled('Restored', rows, nexusId)
+    })
 
-  const remove = (targets: BundleRow[]): Promise<void> =>
-    flight(async () => {
-      if (targets.length > 1) return deleteBatch(targets)
-      if (targets.length) return deleteOne(targets[0])
-    })
+  const remove = (targets: BundleRow[]): Promise<void> =>
+    flight(async () => {
+      if (!targets.length || !(await rules.askDelete(targets))) return
+      const rows = targets.map((row) => ({
+        ...row,
+        address: row.bundlePath,
+        req: requestOf(row, rules.deleteOp),
+      }))
+      await runBundled('Deleted', rows, nexusId)
+    })
@@ openMenu @@
     if (action.startsWith('restoreTo:') && kind) {
       const id = action.slice('restoreTo:'.length)
-      return flight(() => restoreOne(one, { kind, id }))
+      return restore([one], { kind, id })
     }
```

`storesChanged` stays imported for the listing's subscription (`browser.ts:331`). `nexusId` stays the hook's render-time Nexus, so a switch during a destination ask, before `runBundled` starts, still stops the batch (`ArchiveView.test.tsx:475`).

**VERIFY**

- [ ] The failing cases are green, each red with its hunk reverted, and the lone-refusal pin stays green.
- [ ] **Flips:** exactly the rewrites CHANGE routes (the `bundled` reads, `archive.test.ts`'s `UNDO`, `spend.test.ts:2216,2229`, `mutateRequest.test.ts:55`, `confirmations.test.ts:380,392`, `TrashFrame.test.tsx:272,288,307`, `ArchiveView.test.tsx:388-398,441-458`, `notifications.test.ts:44-93`, `ActionLabel.test.tsx:60`), and nothing else. `archive.test.ts:938-1223`'s delete-from-Archive Undo cases and `:473-640`'s Archive restore Undo cases stay green, and every notice text in `TrashFrame.test.tsx:285-498`, `ArchiveView.test.tsx:385-489`, and `confirmations.test.ts:285-311,400-462` holds: Restored “T”, “T” as “L”, N Pages, N Renamed, the unrestored and warning lines, refused counts, Try Again when owed, and Deleted “T” with its Internal Links segment.
- [ ] These print nothing:
  - `git grep -nE "\.bundled\b|bundled\??:|ARCHIVE_UNDO|\bUndone\b|undoneOf|rearchive|restoreUndo|deleteUndo|\bAsked\b" -- Core ':!*.test.ts' ':!*.test.tsx'`;
  - `git grep -n "stored.archive\|archive: z.string" -- Core`;
  - `git grep -nwE "restoreOne|deleteOne|restoreBatch|deleteBatch|offerDeleted" -- Core ':!*.test.ts' ':!*.test.tsx'`;
  - `git grep -n "unrestoredLine" -- Core/Session`;
  - `git grep -n "quiet: true" -- Core ':!*.test.ts' ':!*.test.tsx' | grep -v confirmations.ts`.
- [ ] Run the gates.
- [ ] Check for unnecessary code or mistakes.

#### Task 5-3

**TASK:** `BundleTable` owns the date column and the footing both skins draw (M-15): `useDateColumn` and `widestDate` move out of the browser hook into `BundleTable.tsx`, keyed `` `${kind}ColumnStyle` ``, and the two `footing()` switches become one `BundleFooting` taking each store's copy and class; the headings and their CSS stay per skin (Decision C-7). The Trash frame moves beside its skin's peers and its channel folds (P-6), `archivePlace.ts` takes a name that says it holds a label (P-8), and Confirm Before Deletion's caption names the Trash among what always asks (I-079). **Comments:** none added; `rulesOf`'s, `useBundleBrowser`'s, and the channel's are rewritten, and `widestDate`'s and `useDateColumn`'s move whole.

**NOW:**
- **The Date Column:** `useDateColumn(key: DateKey)`, `widestDate`, `WIDEST_AT`, and `DAY_MS` live in the browser hook's file (`Core/Bundles/browser.ts:170-233`), keyed through `rulesOf.dateKey` (`:237,246,252`), and the hook answers `date` (`:281,286,544`). `BundleTable`, `DateHeading`, and `BundleRows` read it as `Browser['date']` (`Core/Bundles/BundleTable.tsx:37,61,84-90,121`).
- **The Footings:** `TrashFrame.tsx:26-42` and `ArchiveView.tsx:61-77` each switch on `listing.status` for the same three outcomes, in their own copy and class (`.trash-empty` with the body type, `.archive-empty`).
- **Homes:** `Core/Settings/TrashFrame.tsx` and `trash-frame.css` sit in Settings while `ArchiveView` sits in `Core/Archive`; `frames.ts:42,951` mounts the frame. `Core/Trash/handlers.ts` answers one channel, `delete:facts` (after Phase 2, `{ permanentDelete }` alone), spread into `Core/Contract/serve.ts:13,24`, declared at `bridge.ts:202-203`, read only by `askEmptyTrash` (`confirmations.ts:229-230`). `Core/Archive/archivePlace.ts` holds `ARCHIVE_TITLE` and `ARCHIVE_ICON`, imported at `ArchiveView.tsx:20`, `Interface/Subfield/crumbs.ts:8`, `Views/Settings/ViewFrame.tsx:33`, and `Nexus/treeIndex.ts:7`.
- **I-079:** the caption (`Core/Settings/frames.ts:642-643`, `.claude/Features/ConfigurationPM.md:115`) lists what always asks and leaves out a delete from the Trash, which `askEmptyTrash` always asks (`confirmations.ts:229-241`).

**CHANGE**

- [ ] Write **`confirmations.test.ts`, "an empty from the Trash asks with Confirm Before Deletion off" (I-079):** `switchOff()`, then `askEmptyTrash([row({ title: 'A' })])` asks once. It passes before the change: it pins the behavior the caption now states, which is copy alone.
- [ ] `git mv Core/Settings/TrashFrame.tsx Core/Trash/TrashFrame.tsx`, `git mv Core/Settings/trash-frame.css Core/Trash/trash-frame.css`, `git mv Core/Archive/archivePlace.ts Core/Archive/archiveLabel.ts`, then `git rm Core/Trash/handlers.ts`, and apply the AFTER.
- [ ] Re-point `frames.ts:42` to `'../Trash/TrashFrame'`, `Core/Settings/TrashFrame.test.tsx:6` to `'../Trash/TrashFrame'` (the test stays in place until Phase 6), the four `archivePlace` importers to `archiveLabel`, and `browser.test.ts:5`'s `widestDate` to `'./BundleTable'`.
- [ ] Move `BundleTable.test.tsx:51-57`'s `date` object out of the `browser` prop into a sibling `date={…}` on `<BundleRows>`, which now takes it beside `browser`; its cases hold.
- [ ] Rename every `'delete:facts'` stub to `'bundles:permanentDelete'` answering the boolean alone: `TrashFrame.test.tsx:157`, `ArchiveView.test.tsx:145`, and `confirmations.test.ts`'s stubs (`ok({ permanentDelete: false })` becomes `ok(false)`).
- [ ] Rewrite `ConfigurationPM.md:115`'s row: "… Collections, Sets, Contexts, Spaces, and views ask regardless, since each carries everything filed under it, as do a property's delete and an option's Delete, which name the Items holding what they reach, and a delete from the Trash, which is for good."

**AFTER**

```Core/Bundles/BundleTable.tsx diff
@@ imports @@
-import { memo, type ReactNode, useMemo, useState } from 'react'
+import { memo, type ReactNode, useLayoutEffect, useMemo, useState } from 'react'
@@
 import { entityIcon } from '../Assets/entityIconPolicy'
+import { formatDate } from '../Properties/formatValue'
+import {
+  type DateStyle,
+  dateDefaults,
+  holdsStyle,
+  resolveStyle,
+  storedPick,
+} from '../Properties/columnStyles'
+import { parseStyleAction, styleMenuItems } from '../Actions/columnMenu'
+import { popMenu } from '../Actions/menuActions'
+import { useNexusForms } from '../Views/Host/useColumnStyles'
+import type { BundleStore } from '../Paths/bundleLayout'
 import { propertyTypeIconName } from '../Properties/typeDisplay'
@@
-import { crumbSegments, type useBundleBrowser } from './browser'
+import { crumbSegments, type Listing, type useBundleBrowser } from './browser'
@@ Browser @@
 type Browser = ReturnType<typeof useBundleBrowser>
+
+const WIDEST_AT = new Date(2026, 8, 30, 12, 0)
+const DAY_MS = 86_400_000
+
+/** The widest a style writes: … */                (moved whole from browser.ts:175-185)
+export function widestDate(style: DateStyle): string { … }
+
+/** A store's date column: … */                     (moved from browser.ts:187-233)
+export function useDateColumn(kind: BundleStore['kind']): {
+  …
+} {
+  const key = `${kind}ColumnStyle` as const
   const nexus = useNexusForms()
   const stored = useSession((s) => personalizationOf(s)[key])
   …                                                    (the body as it stood)
+}
+
+type DateColumn = ReturnType<typeof useDateColumn>
@@ BundleTable @@
 export function BundleTable({
   date: { width },
   children,
 }: {
-  date: Browser['date']
+  date: DateColumn
   children: ReactNode
 }): React.JSX.Element {
@@ DateHeading @@
-  date: Browser['date']
+  date: DateColumn
   label: ReactNode
@@ BundleRows @@
 export function BundleRows({
-  browser: { visible, checked, picked, date, toggle, rowClick, openMenu },
+  browser: { visible, checked, picked, toggle, rowClick, openMenu },
+  date,
   scrollEl,
 }: {
-  browser: Pick<
-    Browser,
-    'visible' | 'checked' | 'picked' | 'date' | 'toggle' | 'rowClick' | 'openMenu'
-  >
+  browser: Pick<Browser, 'visible' | 'checked' | 'picked' | 'toggle' | 'rowClick' | 'openMenu'>
+  date: DateColumn
   scrollEl: HTMLElement | null
 }): React.JSX.Element {
@@ BundleFooting @@
+export function BundleFooting({
+  listing,
+  shown,
+  className,
+  failed,
+  empty,
+}: {
+  listing: Listing
+  shown: number
+  className: string
+  failed: string
+  empty: string
+}): React.JSX.Element | null {
+  if (listing.status === 'loading' || shown > 0) return null
+  const line =
+    listing.status === 'failed' ? failed : listing.rows.length === 0 ? empty : 'Nothing matches.'
+  return <div className={className}>{line}</div>
+}
```

```Core/Bundles/browser.ts diff
@@ imports @@
 import { matches, matchQuery } from '../Paths/caseFold'
 import { isAtOrUnder, relDirname } from '../Paths/posix'
-import { formatDate } from '../Properties/formatValue'
-import {
-  type DateStyle,
-  dateDefaults,
-  holdsStyle,
-  resolveStyle,
-  storedPick,
-} from '../Properties/columnStyles'
-import { parseStyleAction, styleMenuItems } from '../Actions/columnMenu'
 import { containerTargets, contextTargets } from '../Actions/destinationTree'
 import { popMenu } from '../Actions/menuActions'
 import { destinationRows, type MoveTarget } from '../Actions/pageMenu'
 import { restoreMenuItems } from '../Actions/restoreMenu'
-import { useNexusForms } from '../Views/Host/useColumnStyles'
 import { useSession } from '../Session/store'
-import { personalizationOf } from '../Session/configSlice'
 import { storesChanged } from '../Session/nexusSlice'
@@ DateKey, WIDEST_AT, DAY_MS, widestDate, useDateColumn @@
-type DateKey = 'trashColumnStyle' | 'archiveColumnStyle'
-…                                                    (lines 170-233, moved to BundleTable.tsx)
@@ rulesOf @@
-/** What the Trash and the Archive do differently under one browser: the date column's setting, and what a delete sends and how it asks. */
+/** What the Trash and the Archive do differently under one browser: what a delete sends and how it asks. */
 function rulesOf(kind: BundleStore['kind']): {
-  dateKey: DateKey
   deleteOp: 'emptyBundle' | 'delete'
   askDelete: (targets: BundleRow[]) => Promise<boolean>
 } {
   switch (kind) {
     case 'trash':
-      return {
-        dateKey: 'trashColumnStyle',
-        deleteOp: 'emptyBundle',
-        askDelete: askEmptyTrash,
-      }
+      return { deleteOp: 'emptyBundle', askDelete: askEmptyTrash }
     case 'archive':
-      return {
-        dateKey: 'archiveColumnStyle',
-        deleteOp: 'delete',
-        askDelete: askTrashing,
-      }
+      return { deleteOp: 'delete', askDelete: askTrashing }
   }
 }
 
-type Listing = { status: 'loading' } | { status: 'failed' } | { status: 'ready'; rows: BundleRow[] }
+export type Listing =
+  | { status: 'loading' }
+  | { status: 'failed' }
+  | { status: 'ready'; rows: BundleRow[] }
@@ useBundleBrowser doc @@
-/** … Restore and Delete, run by the right-click menu over a row or the checked rows in view and by the bar over the checked rows; and its date column. */
+/** … and Restore and Delete, run by the right-click menu over a row or the checked rows in view and by the bar over the checked rows. */
@@ useBundleBrowser's answer @@
   openMenu: (row: BundleRow) => Promise<void>
-  date: ReturnType<typeof useDateColumn>
   restore: (targets: BundleRow[], destination?: RestoreDestination) => Promise<void>
@@
   const rules = rulesOf(store.kind)
-  const date = useDateColumn(rules.dateKey)
@@ return @@
     openMenu,
-    date,
     restore,
```

`popMenu` stays imported in `browser.ts` for `askDestination` and `openMenu`.

```Core/Trash/TrashFrame.tsx diff
@@ imports @@
 import { useBundleBrowser } from '../Bundles/browser'
-import { BundleRows, BundleTable, DateHeading } from '../Bundles/BundleTable'
+import {
+  BundleFooting,
+  BundleRows,
+  BundleTable,
+  DateHeading,
+  useDateColumn,
+} from '../Bundles/BundleTable'
@@ TrashBody @@
   const browser = useBundleBrowser({ kind: 'trash' }, { query, shown: true })
-  const { listing, visible, date } = browser
+  const date = useDateColumn('trash')
+  const { listing, visible } = browser
   const [scrollEl, setScrollEl] = useState<HTMLDivElement | null>(null)
-
-  const footing = (): React.JSX.Element | null => {
-    …                                                  (lines 26-42, removed)
-  }
@@ rows @@
-              <BundleRows browser={browser} scrollEl={scrollEl} />
+              <BundleRows browser={browser} date={date} scrollEl={scrollEl} />
@@ footing @@
-      {footing()}
+      <BundleFooting
+        listing={listing}
+        shown={visible.length}
+        className={cx('trash-empty', text.body.standard)}
+        failed="The trash couldn't be read."
+        empty="Trash is empty."
+      />
       <Scrollbar of={scrollEl} />
```

(`TrashFrame.tsx`'s other imports, `'../Navigation/nav-list.css'` and `'./trash-frame.css'` among them, resolve from `Core/Trash/` unchanged.)

```Core/Archive/ArchiveView.tsx diff
@@ imports @@
-import { BundleRows, BundleTable, DateHeading } from '../Bundles/BundleTable'
+import {
+  BundleFooting,
+  BundleRows,
+  BundleTable,
+  DateHeading,
+  useDateColumn,
+} from '../Bundles/BundleTable'
@@
-import { ARCHIVE_TITLE } from './archivePlace'
+import { ARCHIVE_TITLE } from './archiveLabel'
@@ ArchiveView @@
   const { listing, visible } = browser
+  const date = useDateColumn('archive')
@@ footing @@
-  const footing = (): React.JSX.Element | null => {
-    …                                                  (lines 61-77, removed)
-  }
@@ table @@
-        <BundleTable date={browser.date}>
+        <BundleTable date={date}>
@@
             <DateHeading
-              date={browser.date}
+              date={date}
@@
-          {visible.length > 0 && <BundleRows browser={browser} scrollEl={scrollEl} />}
+          {visible.length > 0 && <BundleRows browser={browser} date={date} scrollEl={scrollEl} />}
         </BundleTable>
-        {footing()}
+        <BundleFooting
+          listing={listing}
+          shown={visible.length}
+          className="archive-empty"
+          failed="The archive couldn't be read."
+          empty={`This ${owner.kind === 'set' ? 'Set' : 'Collection'}'s archive is empty.`}
+        />
```

```Core/Bundles/handlers.ts diff
@@ imports @@
 import { scopeOf } from '../Settings/codec'
+import { readLiveSetting } from '../Settings/settings'
@@ bundlesHandlers @@
       ),
     )
   }),
+  'bundles:permanentDelete': withRoot(async (root) =>
+    ok(await readLiveSetting(root, 'permanentDelete')),
+  ),
 } satisfies Partial<Handlers>
```

```Core/Contract/bridge.ts diff
@@ Asks @@
-  // Read at the moment of asking, never from the renderer's cache, so the confirmation can't promise the system trash while main erases outright.
-  'delete:facts': { args: []; reply: Result<{ permanentDelete: boolean }> }
+  // A setting that decides what the host does to a file is read where it acts, at the moment of asking, so the empty's question can't promise the system trash while main erases outright; one that decides only whether the window asks reads the window's cache (`waived`).
+  'bundles:permanentDelete': { args: []; reply: Result<boolean> }
```

```Core/Contract/serve.ts diff
@@ imports @@
-import { trashHandlers } from '../Trash/handlers'
@@ handlers @@
-  ...trashHandlers,
```

```Core/Interface/Confirm/confirmations.ts diff
@@ DELETE_FACTS_FALLBACK @@
-const DELETE_FACTS_FALLBACK = { permanentDelete: SETTING_DEFAULTS.permanentDelete }
-
@@ askEmptyTrash @@
 export const askEmptyTrash = async (targets: readonly Titled[]): Promise<boolean> => {
-  const { permanentDelete } = valueOr(await dialer().ask('delete:facts'), DELETE_FACTS_FALLBACK)
+  const permanentDelete = valueOr(
+    await dialer().ask('bundles:permanentDelete'),
+    SETTING_DEFAULTS.permanentDelete,
+  )
```

```Core/Settings/frames.ts diff
@@ imports @@
-import { TrashFrame } from './TrashFrame'
+import { TrashFrame } from '../Trash/TrashFrame'
@@ confirmDeletion's caption @@
             caption:
-              'Ask before deleting a page, a tile, or a folder that carries no schema. Collections, Sets, Contexts, Spaces, views and properties always ask.',
+              'Ask before deleting a page, a tile, or a folder that carries no schema. Collections, Sets, Contexts, Spaces, views, properties, and a delete from the Trash always ask.',
```

`archiveLabel.ts`'s contents and `DRAG_SURFACES` (`SettingsWindow.tsx:44-45`) don't change: the skins keep their classes, and the footing wears its skin's.

**VERIFY**

- [ ] The I-079 pin is green.
- [ ] **Flips:** `BundleTable.test.tsx:46-62`'s `date` prop, as CHANGE routes it, and nothing else. `TrashFrame.test.tsx:195` (the footing's parent and class order), `:234,249` (the date column through the Trash skin), `ArchiveView.test.tsx:331-364` (each footing line), and `browser.test.ts:58-79` (`widestDate`) hold as they are.
- [ ] These print nothing:
  - `git grep -nwE "DateKey|dateKey|DELETE_FACTS_FALLBACK|trashHandlers" -- Core`;
  - `git grep -n "delete:facts\|archivePlace\|Settings/TrashFrame" -- Core Desktop`;
  - `git grep -n "footing()" -- Core`.
- [ ] `ls Core/Trash/handlers.ts Core/Settings/TrashFrame.tsx Core/Settings/trash-frame.css Core/Archive/archivePlace.ts 2>/dev/null` prints nothing.
- [ ] Run the gates.
- [ ] Check for unnecessary code or mistakes.

#### Task 5-4

**TASK:** What every item back from a store does once it lands gets its one home (P-1, P-11): `returningCascade`, `returningNames`, `repairLanded`, and `artifactFiles` move into `Core/Nexus/arrival.ts`, which the restores and, from Task 5-6, the settle's outside lane import, so `Core/Nexus` no longer imports `Core/Trash` for a step both stores run. `respell` moves beside `noteRelink` in `cascade.ts`, and `returningCascade` takes the settled index from its caller, so `arrival.ts` imports nothing from `settle.ts` (*§Departures*). `parkLinks` joins the record helpers in `Core/Bundles/record.ts` (P-2). `restoreScrub.ts` and `trashedCopies.ts` are deleted. Behavior doesn't change, and the existing suite proves it. **Comments:** the AFTER rewrites `restoreScrub.ts`'s header as `arrival.ts`'s and removes `trashedCopies.ts`'s; every other doc moves whole.

**NOW:**
- `Core/Trash/restoreScrub.ts` holds `artifactFiles` and `repairLanded` alone after Phase 4, `repairLanded`'s one caller being `returningCascade` (`Core/Nexus/settle.ts:343`, imported at `:46`).
- `returningNames` (private after Phase 2) and `returningCascade` sit at `settle.ts:310-358`, and `respell` at `:298-308`, called by `relink` (`:295`), `returningCascade` (`:350`), and `departingCascade` (`:379`). `returningCascade` calls `settledIndex` itself (`:340`) and reads its live world from the tree it's handed (`:342`).
- `returningCascade`'s callers are `restoreTrashed` (`Core/Trash/spend.ts:214`) and `restoreArchived` (`Core/Archive/archive.ts:117`).
- `Core/Trash/trashedCopies.ts` holds `parkLinks` alone after Phase 4, writing through `appendLinks` in `Core/Bundles/record.ts` (Task 3-2), called by `spend.ts` (`emptyBundle`, `restoreTrashed`'s property arm), `Core/Nexus/finishOwed.ts:408`, `Core/Properties/assignment.ts:74`, and `Core/Trash/trashRecovery.test.ts:12`.

**CHANGE**

- [ ] `git mv Core/Trash/restoreScrub.ts Core/Nexus/arrival.ts`, so the history follows the two functions that stay in it, apply the AFTER, and `git rm Core/Trash/trashedCopies.ts`.
- [ ] Re-point `parkLinks`' importers to `'../Bundles/record'`: `spend.ts`, `finishOwed.ts`, `assignment.ts`, and `trashRecovery.test.ts:12`. `restoreScrub.test.ts` stays in `Core/Trash/` until Phase 6; it imports nothing from the file that left.
- [ ] Task 3-2's `bundle.test.ts` case *"appendLinks adds each link once"* leaves with the export it called, and its behavior moves into `trashRecovery.test.ts`'s parking cases as "a link parked twice parks once": the setup of `:668`, `parkLinks(root, [link])` run twice, and the Notes record's `links` equal to `[link]`. It fails with `appendLinks`' filter removed.

**AFTER**

```Core/Nexus/arrival.ts diff
@@ header and imports @@
-// A restored artifact's own links and keys, re-spelled where it landed.
+// What an item back from a store does once it lands, a restore's and a hand move's alike: its arrival re-spelled into the world it rejoins, and its own links and keys repaired where it landed.
 
-import { type CascadeReport, noteRelink } from '../Nexus/cascade'
-import { basename, join, relative } from '../Paths/posix'
+import { type CascadeReport, joinCascades, linksNotUpdated, noteRelink, respell } from './cascade'
+import { basename, join, relative } from '../Paths/posix'
+import { respellings } from '../Connections/rewrite'
+import { buildPageIndex, type ConnPage, type PageIndex } from '../Connections/pageIndex'
 import { listPathsUnder } from '../Files/walk'
 import { contentPages } from '../Bundles/bundle'
 import type { RecordFile } from '../Bundles/record'
 import { hiddenFolder, SPACE_SIDECAR } from '../Paths/nexusPaths'
@@ artifactFiles @@
 /** A returning or landed artifact's governed files: its pages, and the Space sidecars under it. */
 async function artifactFiles(
@@ repairLanded @@
-export async function repairLanded(
+async function repairLanded(
@@ after repairLanded @@
+
+/** A restore's re-spell, two maps rather than one `relink`: … */      (moved whole from settle.ts:310)
+function returningNames(
+  live: PageIndex,
+  after: PageIndex,
+  back: readonly ConnPage[],
+): { names: Map<string, string>; own: Map<string, string> } {
+  …                                                    (settle.ts:316-320, as they stood)
+}
+
+/** An arrival under `title` into `live`, the world before it: `after`, the index once it landed, re-spells the returning files' own links at `landed.abs`, then the live world's collisions, so live linkers that found a namesake meanwhile stay with it while the returning files keep their own targets; what either misses is owed with Try Again. Answers the notice that links weren't updated when the index couldn't settle, `after` null. */
+export async function returningCascade(
+  root: string,
+  live: PageIndex,
+  after: PageIndex | null,
+  back: readonly ConnPage[],
+  title: string,
+  landed: { entity: RecordFile['entity']; abs: string; rekey?: [from: string, to: string] },
+): Promise<{ own: Map<string, string>; cascade?: CascadeReport }> {
+  if (!after) return { own: new Map(), cascade: linksNotUpdated(title) }
+  const { names, own } = returningNames(live, after, back)
+  const repaired = await repairLanded(root, landed, title, own)
+  if (!names.size) return { own, cascade: repaired }
+  return {
+    own,
+    cascade: joinCascades(
+      repaired,
+      await respell(
+        root,
+        back.map((p) => p.id),
+        names,
+        title,
+      ),
+    ),
+  }
+}
```

```Core/Nexus/cascade.ts diff
@@ imports @@
-import { type Entry, type RelinkEntry, runNoted } from './owed'
+import { type Entry, followRelinks, type RelinkEntry, relinkNote, runNoted } from './owed'
@@ after noteRelink @@
+
+/** Re-spells `names` under the relink entry of the first page it re-spells for, which every caller passes since only a page re-spells; every other relink entry follows the pages `names` moves and the files `paths` moves. */     (moved whole from settle.ts:298)
+export async function respell(
+  root: string,
+  ids: readonly string[],
+  names: Map<string, string>,
+  label: string,
+  paths?: (file: string) => string,
+): Promise<CascadeReport> {
+  await followRelinks(root, names, paths, ids[0])
+  return noteRelink(root, ids[0], (e) => relinkNote(e, names, label))
+}
```

```Core/Nexus/settle.ts diff
@@ imports @@
 import {
   type CascadeReport,
-  joinCascades,
   linksNotUpdated,
-  noteRelink,
   renameCascade,
+  respell,
 } from './cascade'
-import { followRelinks, relinkNote } from './owed'
 import { respellings } from '../Connections/rewrite'
 import { buildPageIndex, type ConnPage, type PageIndex } from '../Connections/pageIndex'
 import { refileMoved } from '../Archive/refile'
-import { repairLanded } from '../Trash/restoreScrub'
-import type { RecordFile } from '../Bundles/record'
 import { contextsDir } from '../Paths/paths'
@@ respell, returningNames, returningCascade @@
-/** Re-spells `names` under the relink entry … */
-async function respell(…) { … }                      (lines 298-308, moved to cascade.ts)
-
-/** A restore's re-spell, two maps rather than one `relink`: … */
-function returningNames(…) { … }                     (lines 310-321, moved to arrival.ts)
-
-/** A restore's arrival under `title`: … */
-export async function returningCascade(…) { … }      (lines 323-358, moved to arrival.ts)
```

```Core/Archive/archive.ts diff
@@ imports @@
-import { departingCascade, returningCascade } from '../Nexus/settle'
+import { departingCascade, settledIndex } from '../Nexus/settle'
+import { returningCascade } from '../Nexus/arrival'
+import { pageIndexOf } from '../Nexus/record'
@@ restoreArchived @@
-  const { cascade } = await returningCascade(root, tree, back, title, {
-    entity: record.entity,
-    abs: targetAbs,
-  })
+  const { cascade } = await returningCascade(
+    root,
+    pageIndexOf(tree),
+    await settledIndex(root),
+    back,
+    title,
+    { entity: record.entity, abs: targetAbs },
+  )
```

▸ Phases 2 and 4 also rewrite `restoreTrashed`; Task 5-5 folds it into the one restore.

```Core/Trash/spend.ts diff
@@ imports @@
-import { returningCascade } from '../Nexus/settle'
+import { settledIndex } from '../Nexus/settle'
+import { returningCascade } from '../Nexus/arrival'
+import { pageIndexOf } from '../Nexus/record'
-import { parkLinks } from './trashedCopies'
+import { parkLinks } from '../Bundles/record'
@@ restoreTrashed @@
-  const arrived = await returningCascade(root, tree, back, title, {
+  const after = await settledIndex(root)
+  const arrived = await returningCascade(root, pageIndexOf(tree), after, back, title, {
     entity: record.entity,
@@
-  const { after, own } = arrived
+  const { own } = arrived
   const settled = after && heldTreeOf(root)
```

`parkLinks` joins `appendLinks`, its writer, which Task 3-2 put beside `patchRecord`; with no reader outside `record.ts` left, `appendLinks`' export leaves.

```Core/Bundles/record.ts diff
@@ imports @@
 import { join, relDirname } from '../Paths/posix'
 import { z } from 'zod'
 import type { CascadeReport, StrippedLink } from '../Nexus/cascade'
 import { isPlainObject } from '../Contract/validators'
+import { TRASH_DIR } from '../Paths/nexusPaths'
+import { storeOf } from '../Paths/bundleLayout'
+import { linkedPage } from '../Connections/linkValue'
+import { buildPageIndex, connPage } from '../Connections/pageIndex'
+import { storedPageIds } from '../Nexus/heldPages'
+import { liveTreeOf } from '../Nexus/liveTree'
@@ appendLinks @@
-export const appendLinks = (bundleDir: string, links: readonly StrippedLink[]): Promise<void> =>
+const appendLinks = (bundleDir: string, links: readonly StrippedLink[]): Promise<void> =>
@@ after removeLinks @@
+
+/** A Link value dropped for naming a page the Trash holds joins that page's bundle, so its restore writes it back; a key two trashed pages answer names neither. */     (moved whole from trashedCopies.ts)
+export async function parkLinks(root: string, links: StrippedLink[]): Promise<void> {
+  …                                                    (Phase 4's body, as it stood)
+}
```

**VERIFY**

- [ ] **Flips:** none. `spend.test.ts`, `trashRecovery.test.ts` (its parking cases at `:462-678` through the moved `parkLinks`), `archive.test.ts`, `settle.test.ts`'s re-spell describes, and `restoreScrub.test.ts`'s surviving cases are green unchanged.
- [ ] These print nothing:
  - `git grep -n "restoreScrub\|trashedCopies" -- Core ':!*.test.ts'`;
  - `git grep -nwE "returningNames|returningCascade|repairLanded|artifactFiles" -- Core/Nexus/settle.ts Core/Trash`, apart from `spend.ts`'s `returningCascade` import and call;
  - `git grep -nE "from '\./settle'" -- Core/Nexus/arrival.ts`.
- [ ] `ls Core/Trash/restoreScrub.ts Core/Trash/trashedCopies.ts 2>/dev/null` prints nothing.
- [ ] Run the gates.
- [ ] Check for unnecessary code or mistakes.

#### Task 5-5

**TASK:** One restore serves both stores (M-3): `restoreBundle` in `Core/Bundles/restore.ts` (*§Placements*) places, moves, and hands what came back to `arrive`, the shared arrival tail in `arrival.ts` (P-11), whose arms select themselves from the record, so an Archive record, carrying no `links`, `membership`, `members`, or `registry`, skips them. The bundle is spent before the cascade, in the Archive's order; the Link refill is one sweep across every Link definition over the world read after landing, so the `into` world switch leaves; the two missing-artifact refusals become one; and the lock is chosen by the bundle's origin, not its store. A restore's move hands its read on to the tree's patch (Write Path's open item), for both stores. `restoreTrashed` and `restoreArchived` leave, and `spend.ts`, holding the empty alone, becomes `empty.ts`. **Fold:** `linkWorld`'s `more` parameter loses its one caller, the switch. **Comments:** the AFTER adds two (`restoreBundle`'s and `arrive`'s) and removes two (`restoreArchived`'s and the switch's); `restoreTrashed`'s six inline comments and `reapply`'s doc move whole, and its carry's comment (Task 3-5's) folds into `arrive`'s doc.

**NOW:**
- **Two Restores:** `restoreTrashed` (`Core/Trash/spend.ts:120-303` at HEAD, its frozen half gone after Phase 4) and `restoreArchived` (`Core/Archive/archive.ts:89-136`), each placing through `placeRecord`, moving, and running `returningCascade` (Task 5-4's), with the prelude written twice (`spend.ts:139-153`, `archive.ts:97-116`) and two missing-artifact refusals (`spend.ts:136-137`, `archive.ts:95-96`, the latter's store test kept only for `store.id`, which Phase 2 handed here). The Archive spends before its cascade (`archive.ts:115`), the Trash after (`spend.ts:295`).
- **The Arms:** the Context's membership and the Space's members re-apply through `reapply` (`spend.ts:239-264,306-317`); the Link refill runs one `refillValues` per Link definition (`spend.ts:274-285`), so a holder stripped under two Link properties is read, parsed, and landed twice, over `settled && !into ? linkWorld(settled, archived) : world` (the `into` switch, `spend.ts:272`), `world` being `linkWorld(tree, archived, back)` (`:155`), `linkWorld`'s only three-argument call (`Core/Nexus/heldPages.ts:88-92`).
- **The Lock:** `mutate.ts:143-157` opens the bundle, then reads its store again through `bundleAddressOf` to choose `inContextsTurn` for every Trash restore; `archive.test.ts:735` pins that a Trash page's restore takes the Contexts lock.
- **The Read:** after Phase 4 both ends of a restore's move are corpus paths, so `moveIndexPaths` renames the rows and re-indexes the landed page through `indexWrittenPages` without its `reads` (`Core/Index/indexSeed.ts:225-249`), and `applyMove` splits the move into an unlink and an add (`Core/Nexus/fileEvents.ts:594-614`) whose `applyPage` reads the page again (`:398-402`).
- **`sweepRootsById`'s Placement:** one key `above` each id (`Core/Nexus/governedSweep.ts:96-121`), so a sweep landing two keys on one page places both above the same one.

**CHANGE**

- [ ] Write these and watch each fail:
  - **`spend.test.ts`, "a holder stripped under two Link properties takes both back in one landing":** page `L` holds `Related: "[[A]]"` and `See: "[[A]]"` under two Link definitions; delete `A`, spy `machine().land`, restore `A`. `L` holds both values back, each above the key it stood above, and the spy's calls name `L`'s path once. Fails today with two landings.
  - **`archive.test.ts:735`, rewritten in place as "a restore takes the Contexts lock only for a Context's or a Space's bundle":** an Archive page's restore and a Trash page's restore take no Contexts lock, and a trashed Space's restore takes it. Fails today on the Trash page.
  - **`spend.test.ts`, "a bundle whose artifact has left refuses its restore in either store with one line":** remove a trashed page's artifact and an archived page's artifact by hand; each restore answers "That item is no longer there.". Fails today on both texts.
  - **`indexMaintenance.test.ts`, `describe('the watcher maintains the rows')`, "a page's restore from the Trash reads the landed page once":** delete `Notes/Daily/Alpha.md` through `settledMutate`, spy `machine().readText`, restore it; the spy's calls name the landed path once. Fails today with two.
- [ ] `git mv Core/Trash/spend.ts Core/Trash/empty.ts`, then apply the AFTER.
- [ ] `spendBundle`'s doc (`Core/Bundles/bundle.ts:369`) states Decision C-6 where a reader meets it: after "the whole bundle, or from an inner item's bundle only the item's share", add "(a container emptied of its last item stays a restorable row, since it still holds its schema, its nested Sets' settings, and its views)". Close I-077 in `.claude/IssuesPM.md` through `batch-issues` as intended: its index row, its section, its footnote, and its count in TOTALS.
- [ ] Every restore case in `spend.test.ts`, `trashRecovery.test.ts`, `restoreProperty.test.ts`, `restoreScrub.test.ts`, and `archive.test.ts` runs through `restoreBundle` unchanged; none imports the restores.

**AFTER**

```Core/Bundles/restore.ts diff
@@ new file @@
+import { basename, dirname, join, relative } from '../Paths/posix'
+import { originPathOf } from '../Paths/bundleLayout'
+import { fail, fault, ok } from '../Contract/result'
+import type { MutateReply, RestoreDestination } from '../Nexus/mutateRequest'
+import { machine } from '../Platform/machine'
+import { relocate } from '../Files/atomicWrite'
+import { liveTreeOf } from '../Nexus/liveTree'
+import { nexusPages } from '../Nexus/heldPages'
+import { pageIndexOf } from '../Nexus/record'
+import { settledIndex } from '../Nexus/settle'
+import { arrive } from '../Nexus/arrival'
+import { joinCascades } from '../Nexus/cascade'
+import { OWED, owedName, readNotes, restoreNote } from '../Nexus/owed'
+import { mutateRegistryFile, unlistContext, withContextAt } from '../Contexts/contextsRegistry'
+import { restoreProperty } from '../Trash/restoreProperty'
+import { contentPages, fileInto, type OpenBundle, originPagesOf, spendBundle } from './bundle'
+import { NO_DESTINATION, placeAmong, placeRecord } from './placement'
+import { parkLinks, recordedPartly } from './record'
+
+const restored = (unrestored: string[]) => (unrestored.length ? { unrestored } : {})
+
+/** The one restore, for either store's bundle: a property rebuilt in the registry, or an item placed against the current tree and moved back, or, as a delete from the Archive's Undo, filed back into the Archive it left; then the arrival every item back from a store runs. A restore from the Archive answers the archive that takes it back. */
+export async function restoreBundle(
+  root: string,
+  bundle: OpenBundle,
+  destination?: RestoreDestination,
+): Promise<MutateReply> {
+  const { store, record: stored, artifact } = bundle
+  if (stored.entity === 'property') {
+    if (destination) return fault(NO_DESTINATION)
+    const rebuilt = await restoreProperty(root, stored)
+    if (!rebuilt.ok) return rebuilt
+    const { unrestored, dropped, ...said } = rebuilt.value
+    await parkLinks(root, dropped)
+    // A value that no longer fits is named rather than kept: the property is back, so its record could only ever refuse.
+    await spendBundle(root, bundle)
+    return ok({ ...restored(unrestored), ...said })
+  }
+  if (!artifact) return fail('not-found', 'That item is no longer there.')
+  const tree = await liveTreeOf(root)
+  const { byId } = await nexusPages(root, tree)
+  const placed = await placeRecord(root, stored, destination, { abs: bundle.abs, artifact }, tree, byId)
+  if (!placed.ok) return placed
+  const { record, placement, writeOrder, landedAs, into } = placed.value
+  const { dir, finalName, finalTitle } = placement
+  const title = finalTitle ?? finalName
+  const back = await originPagesOf(root, await contentPages(record.entity, artifact))
+  // A Context's or Space's own owed titles never refuse it; another's do, since the work still due would land on it. Placement lands a Space only under the live Context its record's `parent` names.
+  const landing =
+    record.entity === 'context'
+      ? { owner: { kind: 'context' as const }, name: title, except: record.registry.id }
+      : record.entity === 'space' && record.parent.kind === 'context'
+        ? {
+            owner: { kind: 'space' as const, contextId: record.parent.id },
+            name: title,
+            except: record.id,
+          }
+        : null
+  if (landing && owedName(await readNotes(root), landing)) return OWED
+  // A Context's identity lives ONLY in its registry entry, so it re-enters BEFORE anything moves: a refused write leaves the bundle intact — the restore is retryable — where an entry written after the move would destroy the evidence on failure and reply ok.
+  if (record.entity === 'context') {
+    const { id } = record.registry
+    const committed = await mutateRegistryFile(root, (cur) =>
+      withContextAt(
+        { ...record.registry, title },
+        placeAmong(
+          cur.contexts.map((c) => c.id),
+          id,
+          record.place,
+        ).indexOf(id),
+      )(cur),
+    )
+    if (!committed.ok) return committed
+  }
+  let landed = join(root, dir, finalName)
+  try {
+    // The Undo of a delete from the Archive files back at the address it left, in the Archive that holds it now, and nothing lands in the tree.
+    if (into && (record.entity === 'page' || record.entity === 'set')) {
+      const { links, ...filed } = record
+      const origin = join(root, originPathOf(root, artifact))
+      landed = (await fileInto(root, into, origin, artifact, filed, dir)).landed
+    } else {
+      await machine().mkdir(dirname(landed))
+      await relocate(artifact, landed)
+    }
+  } catch (e) {
+    // The move is the irreversible half and a Context's entry the reversible one. Reversing it keeps the failure retryable: a ghost entry would trip the next attempt's own id-live guard.
+    if (record.entity === 'context') await unlistContext(root, record.registry.id)
+    return fault(e)
+  }
+  // A conversion that can't land leaves the item live with its delete still owed: the next finish moves it back into its bundle, and the restore can be repeated (H-4).
+  if (landing) {
+    const converted = await restoreNote(root, landing.except)
+    if (!converted.ok) return converted
+  }
+  await writeOrder?.()
+  const arrived = await arrive(root, {
+    opened: bundle,
+    record,
+    title,
+    landed: {
+      entity: record.entity,
+      abs: landed,
+      rekey:
+        record.entity === 'context' && title !== record.registry.title
+          ? [record.registry.title, title]
+          : undefined,
+    },
+    filed: !!into,
+    back,
+    live: pageIndexOf(tree),
+    after: await settledIndex(root),
+  })
+  const cascade = joinCascades(arrived.cascade, recordedPartly(stored, title))
+  const archived = store.kind === 'archive' && (stored.entity === 'page' || stored.entity === 'set')
+  return ok({
+    ...restored(arrived.unrestored),
+    ...(cascade ? { cascade } : {}),
+    ...(landedAs ? { landedAs } : {}),
+    ...(archived
+      ? {
+          undo: {
+            op: 'archive',
+            path: relative(root, landed),
+            kind: stored.entity,
+            back: {
+              at: relative(root, bundle.inner ? artifact : bundle.abs),
+              name: basename(artifact),
+              record: stored,
+            },
+          },
+        }
+      : {}),
+  })
+}
```

`archived` narrows `stored.entity` to a page or a Set for the reply's `kind` as an aliased condition over two `const` references; it is `restoreArchived`'s store test (`archive.ts:95`), kept for the one thing it still decides, the Undo an Archive restore answers.

`refileLanded` takes the Archive the Set's archived records sit in (Task 3-5). `arrive` reads it from the stored record's chain where it stands now, which answers both stores: a Trash record keeps the trail it left on, and an Archive record's trail is the one its carry keeps current, so its chain names the Archive holding the bundle, as `restoreArchived`'s `store.id` did.

```Core/Nexus/arrival.ts diff
@@ imports @@
-import { type CascadeReport, joinCascades, linksNotUpdated, noteRelink, respell } from './cascade'
+import {
+  type CascadeReport,
+  joinCascades,
+  linksNotUpdated,
+  noteRelink,
+  respell,
+  type StrippedLink,
+} from './cascade'
 import { basename, join, relative } from '../Paths/posix'
-import { respellings } from '../Connections/rewrite'
+import { respellings, rewriteConnections } from '../Connections/rewrite'
 import { buildPageIndex, type ConnPage, type PageIndex } from '../Connections/pageIndex'
 import { listPathsUnder } from '../Files/walk'
-import { contentPages } from '../Bundles/bundle'
-import type { RecordFile } from '../Bundles/record'
+import { joinValues, landValue } from '../Files/rootValues'
+import type { Json } from '../Files/stableJson'
+import { contentPages, type OpenBundle, spendBundle } from '../Bundles/bundle'
+import {
+  type ArtifactRecord,
+  collectionOf,
+  currentOrigin,
+  originOf,
+  type RecordFile,
+} from '../Bundles/record'
+import { refileLanded } from '../Archive/refile'
+import { contextKey } from '../Contexts/contexts'
+import { contextWorldOf } from '../Contexts/contextResolve'
+import { spaceIdsIn } from '../Contexts/spaceSidecar'
+import { linkDefsOf } from '../Properties/propertiesRegistry'
+import { readLiveSetting } from '../Settings/settings'
+import { refillOf, sweepRootsById } from './governedSweep'
+import { linkWorld, type NexusPages, nexusPages, shownTitle } from './heldPages'
+import { liveTreeOf } from './liveTree'
+import type { NexusTree } from './tree'
 import { hiddenFolder, SPACE_SIDECAR } from '../Paths/nexusPaths'
@@ after returningCascade @@
+
+/** The tail every item back from a store runs, a restore's and a hand move's alike, `opened` the bundle or the share of one it left and `record` its record as placed: the bundle spent first, since everything after reads the record from memory; the arrival re-spelled from `live`, the world before it, to `after`, the index once it landed; a Context's membership or a Space's members tagged again, or the Link values its delete stripped put back under Restore Links On Deletion in one sweep across every Link definition, over the world read once it landed; and, unless it `filed` back into a store, a Set's archived records carried out of the Archive of the Collection its stored chain stands in now. Answers the titles of what didn't take its tag or value back, and the cascade. */
+export async function arrive(
+  root: string,
+  a: {
+    opened: OpenBundle
+    record: ArtifactRecord
+    title: string
+    landed: { entity: RecordFile['entity']; abs: string; rekey?: [from: string, to: string] }
+    filed?: boolean
+    back: readonly ConnPage[]
+    live: PageIndex
+    after: PageIndex | null
+  },
+): Promise<{ unrestored: string[]; cascade?: CascadeReport }> {
+  const { record, title } = a
+  await spendBundle(root, a.opened)
+  const { own, cascade } = await returningCascade(root, a.live, a.after, a.back, title, a.landed)
+  const tree = await liveTreeOf(root)
+  const { byId, archived } = await nexusPages(root, tree)
+  const missed =
+    record.entity === 'context' || record.entity === 'space'
+      ? await retag(root, tree, byId, record, title, a.landed.abs)
+      : record.links && (await readLiveSetting(root, 'restoreLinksOnDeletion'))
+        ? await refill(root, tree, byId, linkWorld(tree, archived), record.links, own)
+        : []
+  const left = a.filed ? null : originOf(a.opened.record)
+  const now = left && currentOrigin(tree, left)
+  if (now) await refileLanded(root, record, collectionOf(now))
+  const unrestored = missed.flatMap((id) => shownTitle(tree, byId, id) ?? [])
+  return { unrestored, ...(cascade ? { cascade } : {}) }
+}
+
+async function retag(
+  root: string,
+  tree: NexusTree,
+  byId: NexusPages['byId'],
+  record: Extract<ArtifactRecord, { entity: 'context' | 'space' }>,
+  title: string,
+  abs: string,
+): Promise<string[]> {
+  if (record.entity === 'context') {
+    const titlesById = new Map([...(await spaceIdsIn(abs)).ids].map(([name, id]) => [id, name]))
+    const additions: Record<string, string[]> = {}
+    const above: Record<string, string | undefined> = {}
+    for (const m of record.membership) {
+      if (!m.root.id) continue
+      const titles = m.spaces
+        .map((s) => (s.id ? titlesById.get(s.id) : undefined))
+        .filter((t): t is string => typeof t === 'string')
+      if (titles.length) additions[m.root.id] = titles
+      above[m.root.id] = m.root.above
+    }
+    return reapply(root, byId, contextKey(title), additions, above)
+  }
+  const group =
+    record.parent.kind === 'context' && contextWorldOf(tree.contexts).groupById.get(record.parent.id)
+  if (!group) return []
+  const members = record.members.filter((m): m is typeof m & { id: string } => typeof m.id === 'string')
+  const additions = Object.fromEntries(members.map((m) => [m.id, [title]]))
+  const above = Object.fromEntries(members.map((m) => [m.id, m.above]))
+  return reapply(root, byId, contextKey(group.def.title), additions, above)
+}
+
+/** The ids of what's still here and didn't take its tag back, one of two files claiming its id among them; a root gone since has nothing to take it. A root that no longer holds the key takes it back above the key `above` names for it. */     (moved whole from spend.ts:305)
+async function reapply(
+  root: string,
+  roots: NexusPages['byId'],
+  key: string,
+  additions: Record<string, string[]>,
+  above: Record<string, string | undefined>,
+): Promise<string[]> {
+  const { taken } = await sweepRootsById(
+    root,
+    roots,
+    additions,
+    (id) => above[id],
+    (raw, titles) => landValue(raw, key, joinValues(raw[key], titles)),
+  )
+  return Object.keys(additions).filter((id) => roots.get(id) !== undefined && !taken.has(id))
+}
+
+async function refill(
+  root: string,
+  tree: NexusTree,
+  byId: NexusPages['byId'],
+  world: PageIndex,
+  links: readonly StrippedLink[],
+  own: Map<string, string>,
+): Promise<string[]> {
+  const defs = new Map(linkDefsOf(tree.config.registry).map((d) => [d.id, d]))
+  const held: Record<string, StrippedLink[]> = {}
+  for (const link of links)
+    if (defs.has(link.property))
+      (held[link.page] ??= []).push({ ...link, value: rewriteConnections(link.value, own) })
+  const missed = new Set<string>()
+  const { taken } = await sweepRootsById(
+    root,
+    byId,
+    held,
+    (id, key) => held[id]?.find((l) => defs.get(l.property)?.key === key)?.above,
+    (raw, stripped) =>
+      stripped.reduce<Json | null>((acc, l) => {
+        const def = defs.get(l.property)
+        const next = def ? refillOf(def, world)(acc ?? raw, l.value) : null
+        if (next === null) missed.add(l.page)
+        return next ?? acc
+      }, null),
+  )
+  return Object.keys(held).filter((id) => byId.get(id) !== undefined && (missed.has(id) || !taken.has(id)))
+}
```

```Core/Nexus/governedSweep.ts diff
@@ sweepRootsById doc @@
-/** … A key a page's rewrite adds lands above the key `above` names for its ID, and last without one. */
+/** … A key a page's rewrite adds lands above the key `above` names for its ID and that key, and last without one. */
 export async function sweepRootsById<T>(
   root: string,
   roots: RootsById,
   values: Record<string, T>,
-  above: Record<string, string | undefined>,
+  above: (id: string, key: string) => string | undefined,
   rewrite: (root: Json, value: T) => Json | null,
 ): Promise<{ taken: ReadonlySet<string>; skipped: number }> {
@@
-    above: (raw, file) => () => above[rootId(file, raw) ?? ''],
+    above: (raw, file) => (key) => above(rootId(file, raw) ?? '', key),
@@ refillValues @@
-  return sweepRootsById(root, roots, values, above, refillOf(def, world))
+  return sweepRootsById(root, roots, values, (id) => above[id], refillOf(def, world))
```

```Core/Nexus/heldPages.ts diff
@@ linkWorld @@
-export const linkWorld = (
-  tree: NexusTree,
-  archived: readonly ConnPage[],
-  more: readonly ConnPage[] = [],
-): PageIndex => buildPageIndex([...pagesOf(tree), ...archived, ...more])
+export const linkWorld = (tree: NexusTree, archived: readonly ConnPage[]): PageIndex =>
+  buildPageIndex([...pagesOf(tree), ...archived])
```

▸ The restore leaves; `emptyBundle` and `collectionArchive` stay as Phases 2–4 leave them.

```Core/Trash/empty.ts diff
@@ imports @@
-…                                                    (every import)
+import { join, relative } from '../Paths/posix'
+import { archiveDirRel, archiveStoreOf, originPathOf } from '../Paths/bundleLayout'
+import type { MutateReply } from '../Nexus/mutateRequest'
+import { fail, fault, ok } from '../Contract/result'
+import { readLiveSetting } from '../Settings/settings'
+import { serializeSchemaOp } from '../Properties/propertiesRegistry'
+import { asString } from '../Nexus/coerce'
+import { contentPages, openBundle, pageIdsOf, spendBundle } from '../Bundles/bundle'
+import { parkLinks } from '../Bundles/record'
+import { pathExists } from '../Files/atomicWrite'
+import { listMarkdownFiles } from '../Files/walk'
+import { dropPageMetadata } from '../Nexus/pageMetadata'
+import { machine } from '../Platform/machine'
+import { noteOwn, recordWrite } from '../Files/writeEcho'
+import { archivedSetIds, goneContainers } from '../Nexus/configReach'
+import {
+  containerNote,
+  distinct,
+  editNote,
+  owedReport,
+  propertyNote,
+  runNoted,
+} from '../Nexus/owed'
+import { finishEntry } from '../Nexus/finishOwed'
@@ Restored, restored, restoreTrashed, reapply @@
-type Restored = Pick<MutateOutcome, 'unrestored' | 'cascade' | 'landedAs'>
-…                                                    (lines 116-317 at HEAD: restoreTrashed and reapply, which restore.ts and arrival.ts now hold)
```

These are exactly the imports `emptyBundle` and `collectionArchive` read.

```Core/Archive/archive.ts diff
@@ header @@
-// The Archive's own ops: a page or Set leaves its Collection for the Collection's Archive, where every cascade still reaches it, and comes back by a plain move to its exact place, with nothing to reconcile.
+// The Archive's own op: a page or Set leaves its Collection for the Collection's Archive, where every cascade still reaches it, and comes back through the one restore both stores share (`Core/Bundles/restore.ts`).
@@ imports @@
-import { basename, dirname, join, relative, titleFromPath } from '../Paths/posix'
+import { basename, join, relative, titleFromPath } from '../Paths/posix'
-import { relocate } from '../Files/atomicWrite'
-import { machine } from '../Platform/machine'
-import { liveTreeOf, mutableTarget, NOT_HELD } from '../Nexus/liveTree'
+import { liveTreeOf, mutableTarget } from '../Nexus/liveTree'
-import { nexusPages } from '../Nexus/heldPages'
-import { departingCascade, settledIndex } from '../Nexus/settle'
-import { returningCascade } from '../Nexus/arrival'
-import { pageIndexOf } from '../Nexus/record'
+import { departingCascade } from '../Nexus/settle'
-import type { MutateReply, MutateRequest, RestoreDestination } from '../Nexus/mutateRequest'
+import type { MutateReply, MutateRequest } from '../Nexus/mutateRequest'
-import {
-  contentPages,
-  fileInto,
-  originPagesOf,
-  type OpenBundle,
-  spendBundle,
-} from '../Bundles/bundle'
+import { contentPages, fileInto, originPagesOf } from '../Bundles/bundle'
-import { archiveFiling, placeRecord } from '../Bundles/placement'
+import { archiveFiling } from '../Bundles/placement'
@@ restoreArchived @@
-/** An archived page or Set returns by a plain move … */
-export async function restoreArchived(…) { … }     (lines 88-136, removed)
```

```Core/Nexus/mutate.ts diff
@@ imports @@
-import { isMarkdownFile, titleFromPath } from '../Paths/posix'
+import { isAtOrUnder, isMarkdownFile, relative, titleFromPath } from '../Paths/posix'
+import { CONTEXTS_DIR_REL } from '../Paths/nexusPaths'
@@
-import { emptyBundle, restoreTrashed } from '../Trash/spend'
-import { archiveOp, restoreArchived } from '../Archive/archive'
+import { emptyBundle } from '../Trash/empty'
+import { archiveOp } from '../Archive/archive'
+import { restoreBundle } from '../Bundles/restore'
 import { openBundle } from '../Bundles/bundle'
-import { bundleAddressOf } from '../Paths/bundleLayout'
+import { storeOf } from '../Paths/bundleLayout'
@@ restore @@
-    // An Archive bundle holds a page or Set alone, so its restore changes no Context and takes no Contexts lock.
+    // Only a Context's or a Space's bundle, which sits under the Trash's `.nexus/contexts` since its chain mirrors where it lived, restores something that changes which Contexts and Spaces exist, so only its restore takes the Contexts lock; every other restore writes a Space's sidecar by id alone, as a delete's strip does.
     case 'restore': {
       const resolved = await resolveUnderRoot(root, req.bundlePath)
       if (!resolved.ok) return resolved
       const restore = async (): Promise<MutateReply> => {
         const opened = await openBundle(root, resolved.value)
-        if (!opened.ok) return opened
-        return opened.value.store.kind === 'archive'
-          ? restoreArchived(root, opened.value, req.destination)
-          : restoreTrashed(root, opened.value, req.destination)
+        return opened.ok ? restoreBundle(root, opened.value, req.destination) : opened
       }
-      return bundleAddressOf(root, resolved.value)?.store.kind === 'archive'
-        ? inSettleTurn(root, restore)
-        : inContextsTurn(root, restore)
+      const origin = storeOf(relative(root, resolved.value))?.origin ?? ''
+      return isAtOrUnder(origin, CONTEXTS_DIR_REL)
+        ? inContextsTurn(root, restore)
+        : inSettleTurn(root, restore)
     }
```

`bundleAddressOf` had one reader in `mutate.ts`, the lock's choice, so its import leaves.

```Core/Index/indexSeed.ts diff
@@ moveIndexPaths @@
-export async function moveIndexPaths(root: string, oldAbs: string, newAbs: string): Promise<void> {
+export async function moveIndexPaths(
+  root: string,
+  oldAbs: string,
+  newAbs: string,
+  reads?: Map<string, PageRead>,
+): Promise<void> {
@@
-    await indexWrittenPages(root, pages)
+    await indexWrittenPages(root, pages, reads)
     return
@@
-  await indexWrittenPages(root, [{ absPath: newAbs }])
+  await indexWrittenPages(root, [{ absPath: newAbs }], reads)
 }
```

```Core/Nexus/fileEvents.ts diff
@@ indexEvents @@
         case 'move':
-          await moveIndexPaths(root, ev.from, ev.absPath)
+          await moveIndexPaths(root, ev.from, ev.absPath, reads)
           break
@@ applyMove @@
-async function applyMove(root: string, ev: Moved, owed: Owed): Promise<Applied> {
+async function applyMove(root: string, ev: Moved, owed: Owed, given?: PageRead): Promise<Applied> {
@@
-  const landed = await applyOne(root, { event: arrived, absPath: ev.absPath, origin: 'own' }, owed)
+  const landed = await applyOne(
+    root,
+    { event: arrived, absPath: ev.absPath, origin: 'own' },
+    owed,
+    given,
+  )
@@ applyOne @@
-  if (ev.event === 'move') return applyMove(root, ev, owed)
+  if (ev.event === 'move') return applyMove(root, ev, owed, given)
```

A Set's move hands its pages' reads on the same way, and its split's `addDir` reads its folder as it does now; only a page's landing takes the read it was handed.

**VERIFY**

- [ ] The four new or rewritten cases are green, each red with its hunk reverted.
- [ ] **Flips:** `archive.test.ts:735`'s Trash half, as rewritten, and nothing else. Every restore case in the five suites CHANGE names passes through `restoreBundle`: the delete-from-Archive Undo (`archive.test.ts:938-1223`), the Archive restore's Undo (`:473-640`), the Context's registry write-ahead and rollback (`spend.test.ts:1413`), H-4's owed note (`:2533`), step-aside naming (`:1464-1557`), the twin linker (`:1149`), the refill with the setting off (`trashRecovery.test.ts:428-885`), and the inner item's share (`bundle.test.ts:333-372`).
- [ ] The carry holds through `arrive`'s one source: `refile.test.ts`'s *"the restore"* describe, Task 3-5's B-6 case included, and `archive.test.ts:325-416` (a landed Set's carry) are green unchanged.
- [ ] These print nothing:
  - `git grep -nwE "restoreTrashed|restoreArchived" -- Core ':!*.test.ts'`;
  - `git grep -nE "Trash/spend|settled && !into|linkWorld\([^)]*, back\)" -- Core ':!*.test.ts'`;
  - `git grep -nE "refillValues\(" -- Core/Nexus/arrival.ts Core/Bundles/restore.ts`.
- [ ] `ls Core/Trash/spend.ts 2>/dev/null` prints nothing, and `Core/Trash/empty.ts` exports `emptyBundle` alone.
- [ ] Run the gates.
- [ ] Check for unnecessary code or mistakes.

#### Task 5-6

**TASK:** A page or Set moved out of either store by hand finishes as that store's restore where it landed (Decisions E-1, E-3). The settle's outside lane reads each paired id's vanished path, and one that lay inside a bundle comes out of the lane's `left` and `arriving` and goes to `recognize` in `arrival.ts`, which spends the bundle (whole once its artifact has left, else each departed page's share), runs the arrival against the world without it, and puts its delete's Link values back under Restore Links On Deletion through `arrive`. The Trash is watched, so the unlink proves a move; a copy leaves the bundle whole and raises none, so it stays a page of its own. This closes B-11 and I-064, and Decision E-2's rebuild gap is stated where a reader meets the lane. **Comments:** none added: `payOutsideMoves`', `readBundleAt`'s, and `keptLinksUnder`'s docs are rewritten to carry what the change adds.

**NOW:**
- **The Lane:** `payOutsideMoves` (`Core/Nexus/settle.ts:390-424`) pairs each vanished id the tree now holds (`owed.vanished`, `livePathOf`) as a move into `left` and relinks with a world before holding each moved page at the path it left (`:414-417`). A page that left a bundle therefore enters that world at its store path, while every other reader resolves a stored page at its origin (B-11), and its bundle stays behind as record-only litter `listBundles` skips (`Core/Bundles/bundle.ts:165-166`). Its record's Link values never come back (I-064).
- **The Cases:** app open, the watched store's unlink de-indexes the stored row and owes its vanish (`fileEvents.ts:293-297`), and the add owes the landing; app closed, the open's seed prunes the missing stored row into `vanished` (`Core/Index/indexSeed.ts:302-303`) and lands the id at its new path, which `Core/Nexus/handlers.ts:104-105` owes. A cold seed answers `NO_REREAD` (`indexSeed.ts:305`) and pairs nothing (Decision E-2).
- **Opening a Departed Item:** `readBundleAt` refuses an inner item whose file has gone (`bundle.ts:228-233`), `innerRecord` reads its id from the file (Phase 2's form), and `keptLinksUnder` lists the artifact to find an item's share (`bundle.ts:276-290`), so a page moved out of a Set's bundle can't be opened or have its share found. `spendBundle`'s inner arm works from paths alone (`bundle.ts:370-393`).

**CHANGE**

- [ ] Write these in `settle.test.ts`, `describe('an item moved out of a store by hand')`, each through `applyEvents` with the watched `unlink` and `add` a drag raises, then `settleNow`, and watch each fail:
  - **"a page moved out of the Trash while the app runs finishes as its restore":** `Linker` holds `Related: "[[Alpha]]"`; delete `Alpha`; move its file out of the bundle to `Notes/Alpha.md`. `Linker` holds `[[Alpha]]` again, the bundle is gone, and no relink entry names a `.trash` path. Fails today: `Linker` stays stripped and the bundle's record stays.
  - **"a page moved out of the Trash while the app was closed finishes as its restore at the next open":** the same, with `closeSession` before the move, then `openSession`, `seedContentIndex` with `oweSeen`, and `settleNow`. Fails today.
  - **"a page moved out of a trashed Set's bundle takes back its own share, the Set's row staying":** delete Set `Daily` holding `Alpha` and `Beta`, `Linker` holding `Related: "[[Alpha]]"` and `See: "[[Beta]]"` under two Link definitions, so each stripped value names one page; move `Alpha` out. `Linker` holds `[[Alpha]]` again and not `[[Beta]]`, `listBundles` still lists `Daily`, and its record's `links` hold `Beta`'s value alone. Fails today.
  - **"a page moved out of an Archive by hand finishes as the Archive's restore" (B-11, Decision E-3):** archive `Beta`; move it out to `Notes/Daily/Beta.md`. The Archive's bundle is gone, and a linker naming `Notes/Daily/Beta` keeps its key, since the lane's world never held `Beta` at its store path. Fails today on the bundle.
- [ ] Write these and watch them pass, then stay green: they pin what the change keeps.
  - **"a copy out of the Trash stays a page of its own, its bundle whole":** copy `Alpha`'s file out (an `add` alone). The bundle still lists, and `Linker` stays stripped.
  - **"after an index rebuild, a page moved out while the app was closed returns live and current without its delete's Link values, its bundle unlisted" (Decision E-2):** install fresh `memoryStores` before reopening; `Alpha` is live and holds a property renamed while it sat in the Trash, `Linker` stays stripped, and `listBundles` lists nothing for it.
- [ ] Apply the AFTER.
- [ ] Rewrite `NexusRecordPM.md:14`'s Restore paragraph, after its first sentence, with: "A page or Set moved out of either store by hand finishes as that store's restore where it landed, found by the id its bundle's record holds; a copy, which leaves the bundle whole, stays a page of its own, and after an index rebuild nothing pairs, so such a page returns current without its delete's Link values."
- [ ] Close I-064 in `.claude/IssuesPM.md` through `batch-issues`: its index row, its section, its footnote, and its count in TOTALS.

**AFTER**

```Core/Nexus/settle.ts diff
@@ imports @@
 import { refileMoved } from '../Archive/refile'
+import { type Departed, recognize } from './arrival'
+import { storeOf } from '../Paths/bundleLayout'
@@ payOutsideMoves @@
-// An outside move: a page whose rows left one path and whose id the tree now holds at another, paired whichever order its two events came in and however many settles apart; a vanish nothing holds yet waits for its id. Every other landed id the tree holds arrived outright, so only its collisions re-spell; a paired move's own row, landing a batch after its folder, is remembered as the move's and is no arrival. The world before is the tree's pages with each paired page back where it left and each arrival absent.
+// An outside move: a page whose rows left one path and whose id the tree now holds at another, paired whichever order its two events came in and however many settles apart; a vanish nothing holds yet waits for its id. One that left a store's bundle came back by hand and finishes as that store's restore, the unlink proving a move, since a copy leaves the bundle whole and arrives as a page of its own; after an index rebuild nothing pairs, so such a page stays live and current without its delete's Link values, its bundle unlisted. Every other landed id the tree holds arrived outright, so only its collisions re-spell; a paired move's own row, landing a batch after its folder, is remembered as the move's and is no arrival. The world before is the tree's pages with each paired page back where it left and each arrival and each page back from a store absent.
 async function payOutsideMoves(root: string): Promise<void> {
   const owed = owedFor(root)
   const tree = heldTreeOf(root)
   if (!tree || (!owed.vanished.size && !owed.landed.size)) return
   const left = new Map<string, ConnPage>()
+  const back = new Map<string, Departed[]>()
   let label = ''
   for (const [id, from] of owed.vanished) {
     const to = livePathOf(root, id)
     if (to === null) continue
     owed.vanished.delete(id)
     if (!owed.landed.delete(id) && readIndexedStat(to)?.id !== id) owed.paired.add(id)
     if (to === from.path) continue
-    left.set(id, from)
-    label ||= titleFromPath(to)
+    const at = storeOf(from.path)
+    if (at?.bundle) {
+      back.set(at.bundle, [...(back.get(at.bundle) ?? []), { id, from: from.path, to, at }])
+      continue
+    }
+    left.set(id, from)
+    label ||= titleFromPath(to)
   }
@@
   owed.landed.clear()
-  if (!left.size && !arriving.length) return
-  const absent = new Set(arriving)
+  if (!left.size && !arriving.length && !back.size) return
+  const absent = new Set([...arriving, ...[...back.values()].flat().map((p) => p.id)])
   const before = buildPageIndex(
     pagesOf(tree).flatMap((p) => (absent.has(p.id) ? [] : [left.get(p.id) ?? p])),
   )
   const moved = [...left.keys()]
-  paid(
-    root,
-    await relink(root, before, pageIndexOf(tree), label, moved, [...moved, ...arriving]),
-    'outside move',
-  )
+  const after = pageIndexOf(tree)
+  if (moved.length || arriving.length)
+    paid(
+      root,
+      await relink(root, before, after, label, moved, [...moved, ...arriving]),
+      'outside move',
+    )
+  for (const [bundle, pages] of back)
+    paid(root, await recognize(root, before, after, bundle, pages), 'outside restore')
 }
```

```Core/Nexus/arrival.ts diff
@@ imports @@
-import { basename, join, relative } from '../Paths/posix'
+import { basename, join, relative, titleFromPath } from '../Paths/posix'
+import type { Stored } from '../Paths/bundleLayout'
-import { buildPageIndex, type ConnPage, type PageIndex } from '../Connections/pageIndex'
+import { buildPageIndex, type ConnPage, connPage, type PageIndex } from '../Connections/pageIndex'
-import { contentPages, type OpenBundle, spendBundle } from '../Bundles/bundle'
+import {
+  bundleArtifact,
+  contentPages,
+  type OpenBundle,
+  openBundle,
+  spendBundle,
+} from '../Bundles/bundle'
@@ after arrive @@
+
+export type Departed = { id: string; from: string; to: string; at: Stored }
+
+export async function recognize(
+  root: string,
+  before: PageIndex,
+  after: PageIndex,
+  bundle: string,
+  departed: readonly Departed[],
+): Promise<CascadeReport | undefined> {
+  const abs = join(root, bundle)
+  const whole = (await bundleArtifact(abs)) === null
+  const opened = whole
+    ? [await openBundle(root, abs)]
+    : await Promise.all(departed.map((p) => openBundle(root, join(root, p.from), p.id)))
+  let cascade: CascadeReport | undefined
+  for (const [i, at] of opened.entries()) {
+    if (!at.ok || at.value.record.entity === 'property') continue
+    const pages = whole ? departed : [departed[i]]
+    const { to, at: stored } = pages[0]
+    const segs = to.split('/')
+    const landed = whole ? segs.slice(0, segs.length - stored.inner.length + 1).join('/') : to
+    const arrived = await arrive(root, {
+      opened: at.value,
+      record: at.value.record,
+      title: titleFromPath(landed),
+      landed: { entity: at.value.record.entity, abs: join(root, landed) },
+      back: pages.map((p) => connPage(p.id, p.at.origin)),
+      live: before,
+      after,
+    })
+    cascade = joinCascades(cascade, arrived.cascade)
+  }
+  return cascade
+}
```

`recognize` reads as the outside lane's half of the shared tail: a whole bundle's artifact has left, so its landing is the departed page's path less the depth it sat at inside the artifact; one page out of a container's bundle lands as itself and takes back its own share. What doesn't take its value back stays as it is, since no window is there to name it.

▸ `keptLinksUnder`'s doc reads as Task 3-2 left it, and `innerRecord`'s id read as Task 2-3 left it.

```Core/Bundles/bundle.ts diff
@@ readBundleAt @@
-/** An address read once: its bundle, store, record, and artifact, and the inner item it names with the container record and artifact holding it, refused when nothing holds that item any more. */
-async function readBundleAt(root: string, abs: string) {
+/** An address read once: its bundle, store, record, and artifact, and the inner item it names with the container record and artifact holding it, refused when nothing holds that item any more unless it was `movedOut` by hand, which an outside move proved. */
+async function readBundleAt(root: string, abs: string, movedOut = false) {
@@
     !isAtOrUnder(item, artifact) ||
-    !(await pathExists(item))
+    !(movedOut || (await pathExists(item)))
   )
@@ innerRecord @@
 async function innerRecord(
   held: ContainerRecord,
   trail: readonly string[] | null,
   item: string,
+  left?: string,
 ): Promise<InnerRecord> {
   const entity = isMarkdownFile(item) ? 'page' : 'set'
   const { id, icon } =
     entity === 'page'
-      ? { id: (await stampedIdOf(item)) ?? undefined, icon: undefined }
+      ? { id: left ?? (await stampedIdOf(item)) ?? undefined, icon: undefined }
       : await sidecarIdentity(item, 'set')
@@ keptLinksUnder @@
-/** The Link values the bundle keeps whose page, resolved over the bundle's own pages where they lived, lies at or under `item`; a title two of its pages share stays with the bundle. */
+/** The Link values the bundle keeps whose page, resolved over the bundle's own pages where they lived, `item` among them once it was `movedOut` by hand, lies at or under `item`; a title two of its pages share stays with the bundle. */
-async function keptLinksUnder(root: string, held: ContainerRecord, artifact: string, item: string) {
+async function keptLinksUnder(
+  root: string,
+  held: ContainerRecord,
+  artifact: string,
+  item: string,
+  movedOut: boolean,
+) {
   if (!held.links?.length) return []
-  const files = await listMarkdownFiles(artifact)
+  const files = [...(await listMarkdownFiles(artifact)), ...(movedOut ? [item] : [])]
@@ openBundle @@
-export async function openBundle(root: string, abs: string): Promise<Result<OpenBundle>> {
-  const read = await readBundleAt(root, abs)
+export async function openBundle(
+  root: string,
+  abs: string,
+  left?: string,
+): Promise<Result<OpenBundle>> {
+  const movedOut = left !== undefined
+  const read = await readBundleAt(root, abs, movedOut)
@@
-  const own = await innerRecord(held, await trailWithin(held, inner.artifact, dirname(item)), item)
-  const links = await keptLinksUnder(root, held, inner.artifact, item)
+  const trail = await trailWithin(held, inner.artifact, dirname(item))
+  const own = await innerRecord(held, trail, item, left)
+  const links = await keptLinksUnder(root, held, inner.artifact, item, movedOut)
```

**VERIFY**

- [ ] The four failing cases are green, each red with its hunk reverted; the copy and rebuild pins are green.
- [ ] **Flips:** none. `fileEvents.test.ts:605`'s describe *"an outside move or arrival re-spells as an in-app one does"* holds, its moves leaving no bundle.
- [ ] `git grep -n "recognize" -- Core/Nexus/settle.ts` prints the import and the lane's one call.
- [ ] Run the gates.
- [ ] Check for unnecessary code or mistakes.

#### Task 5-7

**TASK:** A Space moved back into its registered Context's folder by hand finishes with the Space restore's own steps (Decision E-4): its bundle opens, its delete's owed note settles, then the shared tail spends its bundle and tags its members again. The page lane never sees a Space, so the settle reads the tree it pushes for a Space whose id the tree it handed the window lacked, and matches it to a trashed Space record whose artifact has left and whose parent is the Context it landed under. Tagging members takes the Contexts lock, which is taken outside the settle's turn (`inContextsTurn`, `settle.ts:268-269`), so the finish runs in a turn of its own once the settle returns, and the settle runs again to push what it wrote. A Context moved back by hand stays a plain arrival: a Context exists only through its registry entry, and Restore stays its way back. **Comments:** none added; `settleNow`'s comment carries the Space's turn.

**NOW:**
- **What a Space Arrival Raises:** a Space sidecar arriving under a registered Context's folder walks in (`classifyEvent` answers `space`, `Core/Nexus/fileEvents.ts:254`; `applySpace` returns null for an arrival the tree doesn't hold, `:462-485`), and its unlink under `.trash` reads as ignored. `owed.vanished` and `owed.landed` hold page ids alone (`fileEvents.ts:318-322`), so the page lane never pairs a Space.
- **The Two Trees:** `settle` holds the tree it last handed the window and the one it pushes (`settle.ts:180-183`). `contextWorldOf(tree.contexts).spaceById` maps every Space's id to its node, memoized per groups array (`Core/Contexts/contextResolve.ts:17-29`), so the Spaces a settle brought in are the pushed tree's whose ids the handed tree's map lacks.
- **Finding the Bundle:** `listBundles` skips a bundle whose artifact has left (`Core/Bundles/bundle.ts:165-166`), the one a hand move leaves, and has no way to list those alone; Phase 4 gave it a `chain` to list `.trash/.nexus/contexts` alone.
- **A Context Moved Back:** `readContextGroups` maps `registry.contexts` (`Core/Nexus/readNexus.ts:246-262`), and `applySpace` answers `'ok'` for a Space under a folder no entry names (`fileEvents.ts:467`), so such a folder stays invisible.

**CHANGE**

- [ ] Write these in `settle.test.ts`, `describe('an item moved out of a store by hand')`, and watch the first fail:
  - **"a Space moved back into its Context's folder by hand finishes as its restore, tagging its members again":** `Alpha` holds `Areas: [Work]`; delete the Space `Work`, which untags `Alpha`; move its folder from the bundle back to `.nexus/contexts/Areas/Work`, raising the watched `unlinkDir`, `addDir`, and `add` of its sidecar; `settleNow`. `Alpha` holds `Areas: [Work]` again, the bundle is gone, and the notes hold no entry for the Space. Fails today: `Alpha` stays untagged and the bundle's record stays.
  - **"a Space copied back stays a Space of its own, its bundle whole":** copy the folder instead. The bundle still lists, and `Alpha` stays untagged. A pin.
  - **"a Context moved back by hand stays a plain arrival":** delete `Areas`, move its folder back into `.nexus/contexts`. The registry holds no `Areas`, the tree holds no such Context, and the bundle's record stays. A pin.
- [ ] Apply the AFTER.
- [ ] Extend the sentence Task 5-6 wrote at `NexusRecordPM.md:14`: after "found by the id its bundle's record holds;", add "a Space moved back into its registered Context's folder finishes the same way, tagging its members again, while a Context moved back stays outside the registry until restored;".

**AFTER**

▸ Task 4-2 gave `listBundles` its `chain`.

```Core/Bundles/bundle.ts diff
@@ listBundles @@
 export async function listBundles(
   root: string,
   store: BundleStore,
   chain = '',
+  { recordOnly }: { recordOnly?: true } = {},
 ): Promise<ListedBundle[]> {
@@
       const artifact = record.entity === 'property' ? null : await bundleArtifact(abs)
-      if (record.entity !== 'property' && !artifact) continue
+      const bare = record.entity !== 'property' && !artifact
+      if (recordOnly ? !bare : bare) continue
```

A listing skips a bundle whose artifact has left by hand, a record alone; with `recordOnly`, it answers those alone, and never a property's, which holds no artifact to begin with. The walk stays one, and every other caller keeps the call it has.

```Core/Nexus/arrival.ts diff
@@ imports @@
+import { CONTEXTS_DIR_REL } from '../Paths/nexusPaths'
 import {
   bundleArtifact,
   contentPages,
+  listBundles,
   type OpenBundle,
   openBundle,
   spendBundle,
 } from '../Bundles/bundle'
+import { restoreNote } from './owed'
+import { pageIndexOf } from './record'
-import type { NexusTree } from './tree'
+import type { NexusTree, SpaceNode } from './tree'
@@ after recognize @@
+
+export function arrivedSpaces(handed: NexusTree, tree: NexusTree): SpaceNode[] {
+  if (handed.contexts === tree.contexts) return []
+  const { spaceById } = contextWorldOf(handed.contexts)
+  return [...contextWorldOf(tree.contexts).spaceById.values()].filter((s) => !spaceById.has(s.id))
+}
+
+export async function recognizeSpaces(
+  root: string,
+  spaces: readonly SpaceNode[],
+): Promise<CascadeReport | undefined> {
+  let cascade: CascadeReport | undefined
+  const records = await listBundles(root, { kind: 'trash' }, CONTEXTS_DIR_REL, { recordOnly: true })
+  for (const { bundlePath, record } of records) {
+    if (record.entity !== 'space' || record.parent.kind !== 'context') continue
+    const contextId = record.parent.id
+    const space = spaces.find((s) => s.id === record.id && s.contextId === contextId)
+    const opened = space && (await openBundle(root, join(root, bundlePath)))
+    if (!space || !opened || !opened.ok || !(await restoreNote(root, record.id)).ok) continue
+    const index = pageIndexOf(await liveTreeOf(root))
+    const arrived = await arrive(root, {
+      opened: opened.value,
+      record,
+      title: space.title,
+      landed: { entity: 'space', abs: join(root, space.path) },
+      back: [],
+      live: index,
+      after: index,
+    })
+    cascade = joinCascades(cascade, arrived.cascade)
+  }
+  return cascade
+}
```

`arrivedSpaces` reads the Spaces whose ids the window's tree lacked from `contextWorldOf`'s `spaceById`, memoized per groups array (`Core/Contexts/contextResolve.ts:17-29`); `shown` keeps `contexts` by reference (`settle.ts:83-91`), so a settle that changed no Space compares one reference.

```Core/Nexus/settle.ts diff
@@ imports @@
-import { recognize } from './arrival'
+import { arrivedSpaces, recognize, recognizeSpaces } from './arrival'
-import type { NexusTree, Unreadable, ValueChange } from './tree'
+import type { NexusTree, SpaceNode, Unreadable, ValueChange } from './tree'
@@ settle @@
-async function settle(pusher: Pusher, root: string): Promise<{ rescope: boolean } | null> {
+async function settle(
+  pusher: Pusher,
+  root: string,
+): Promise<{ moved: { rescope: boolean } | null; spaces: SpaceNode[] } | null> {
@@
   if (handed && tree && delta) await refileMoved(root, handed, tree, delta)
-  return corpus || rescope ? { rescope } : null
+  return {
+    moved: corpus || rescope ? { rescope } : null,
+    spaces: handed && tree ? arrivedSpaces(handed, tree) : [],
+  }
 }
@@ settleNow @@
-// One settle at a time, and one reseed at a time on a chain of its own: a reply waits for the settles ahead of its own, and for a reseed only when its own settle found the corpus moved; a moved scope waits for the watcher's restart, whose catch-up seeds after the reply.
+// One settle at a time, and one reseed at a time on a chain of its own: a reply waits for the settles ahead of its own, and for a reseed only when its own settle found the corpus moved; a moved scope waits for the watcher's restart, whose catch-up seeds after the reply. A Space the settle found moved back from the Trash by hand tags its members again under the Contexts lock, taken outside the settle's turn, so it finishes in a turn of its own once the settle returns, and settles again.
 export async function settleNow(pusher: Pusher, root: string): Promise<void> {
   await stampListed(root, true)
-  const moved = await inTurn(() => settle(pusher, root)).catch(() => null)
+  const settled = await inTurn(() => settle(pusher, root)).catch(() => null)
   // The settle's walk may list more to stamp, which takes a settle of its own; while a batch applies, its turn takes them instead.
   if (owedFor(root).stamp.length && !batching) await settleNow(pusher, root)
+  if (settled?.spaces.length) {
+    const { spaces } = settled
+    paid(root, await inContextsTurn(root, () => recognizeSpaces(root, spaces)), 'outside restore')
+    await settleNow(pusher, root)
+  }
+  const moved = settled?.moved
   if (!moved) return
   await reseeding(() => reseed(pusher, root, moved.rescope)).catch(() => {})
 }
```

**VERIFY**

- [ ] The Space case is green, and red with `settleNow`'s Space finish removed; the two pins are green.
- [ ] **Flips:** none. Every settle and watcher suite holds, `settle`'s callers being `settleNow` alone.
- [ ] Run the gates.
- [ ] Check for unnecessary code or mistakes.
- [ ] **The Live Drive** (*§Constraints · Live Drives*), its result written beside this box:
  1. **Two builds:** `git worktree add "$TMPDIR/pommora-p5-before" <the commit before Task 5-1>` and `git worktree add "$TMPDIR/pommora-p5-after" HEAD`; in each, `npm ci`, `./node_modules/.bin/electron --version`, and `npm run build`.
  2. **Two Nexuses:** `node .claude/scripts/make-benchmark-nexus.mjs test`, then copy `~/Test` to `$TMPDIR/pommora-p5-drive/before` and `$TMPDIR/pommora-p5-drive/after`.
  3. **Launch each** from its worktree's `Desktop` with `POMMORA_USERDATA="$TMPDIR/pommora-p5-drive/<name>-data"`, `POMMORA_DEBUG_PORT` 9335 (before) or 9336 (after), and `env -u ELECTRON_RUN_AS_NODE ../node_modules/.bin/electron .`. A fresh userData opens the first-run chooser; open the Nexus copy over CDP with `Runtime.evaluate` of `window.nexus.ask('nexus:openPath', '<the copy>')`, then `Page.reload`, and confirm the sidebar shows Collections A and B before driving.
  4. **The same setup in both:** trash two pages from Collection A, one of them linked from a third page's Link property; archive one page and one Set from Collection B.
  5. **The screens read the same:** screenshot, over CDP, the Trash frame (Settings → Trash) and Collection B's Archive in each build, empty-searched and with one row checked, and compare: the headings, glyphs, column widths, date column, rows, and empty line match. A difference is reported, not fixed.
  6. **Restore from both stores, in the after build:** restore the linked page from the Trash and the archived page from the Archive. Each notice reads as before (Restored “T”), the Archive restore's Undo re-archives it, and the linker holds its value back.
  7. **The hand move, in the after build, while it runs:** in Finder or with `mv`, move the second trashed page's file out of its bundle into Collection A's folder. Within a settle the page shows in the sidebar, the Trash frame drops its row on its next listing, and its bundle folder is gone from disk.
  8. **Clean up:** quit both instances by exact PID (*Development-Environment · §Running the App*), `git worktree remove` both, and remove `$TMPDIR/pommora-p5-drive`.

#### Review Checkpoint

- [ ] **One Restore, One Arrival:**
  - `restoreBundle` is the only restore, and every restore case in `spend.test.ts`, `trashRecovery.test.ts`, `restoreProperty.test.ts`, `restoreScrub.test.ts`, and `archive.test.ts` passes through it.
  - `arrive` is the only tail, run by the restore, `recognize`, and `recognizeSpaces`; `git grep -nE "from '\./settle'" -- Core/Nexus/arrival.ts` prints nothing.
  - The only store branch the restore keeps is the reply's Undo.
- [ ] **Recognition Holds the Decided Behavior:** the page cases (app open, app closed, a Set's share), the Archive case (B-11), and the Space case each went red at their own task's head; the copy, rebuild (Decision E-2), Space-copy, and Context pins are green.
- [ ] **One Undo Shape, One Notice Owner:**
  - Every reversible bundle reply carries `undo`, and `git grep -nE "\.bundled\b|ARCHIVE_UNDO|rearchive|undoTo|livePagePath" -- Core ':!*.test.ts' ':!*.test.tsx'` prints nothing.
  - Every bundle op's notice comes from `notifyBundled`: `git grep -n "notifyOutcome(" -- Core/Bundles Core/Interface/Confirm` prints nothing.
  - B-4's case is green.
- [ ] **The Live Drive** under Task 5-7's VERIFY ran, and its result is written there.
- [ ] **The Number:** `view-delta`'s Actionable column for the phase is recorded beside the Net Ledger's Phase 5 row, additions and removals apart, and anything above it is reported in chat with what it buys before Phase 6 opens.
- [ ] Two read-only reviewers, one under `code-simplification` and one under `adversarial-review`, read the phase outward against Phases 3 and 4's shared files, `bundle.ts`, `record.ts`, `owed.ts`, and `refile.ts` above all, and what holds is folded before Phase 6 opens.

---

### Phase 6 — Tests, Docs, and the Closing Measurement

**GOAL:** Each test sits in the suite of the module that owns its behavior after Phase 5, over one shared bundle fixture and one browser harness in `Core/Testing/bundles.ts`, and each pair or cluster of duplicated cases is one case. The doc and comment claims no earlier phase's commit makes false, the link strip's second wording among them, are corrected, the property rename is measured at HEAD (Decision G-2), and the measurement harness leaves (Decision A-1). It's a phase of its own because the test homes and the fixture rest on Phase 4's and Phase 5's module moves, and the measurement needs the code natively reach-in; production code changes by comment rewrites and one refusal string alone.

**THE TREE:** HEAD plus Phases 1–5. Line citations are HEAD's; each task names the case by its title as well, since Phases 2–5 rewrite many cases in place and shift every line after them. Phase 2 removed `TrashDeps`, so no case below passes deps; Phase 5 replaced `bundled` with `undo` and added `bundleOf` to `Core/Testing/settledMutate.ts`.

**THE TEST-FILE LEDGER (end of Phase 5):** the five drafts name 63 test files (beside Phase 2's argument-only sweep of 35). One is deleted (`Core/Trash/trashedCopies.test.ts`, Task 4-6), none is renamed, four stand beside a module that moved or was renamed (`Core/Trash/spend.test.ts`, `Core/Trash/restoreScrub.test.ts`, `Core/Bundles/layout.test.ts`, `Core/Settings/TrashFrame.test.tsx`), and 58 are rewritten or extended in place. Phase 6 handles only what's standing:

| Test File | Fate at the End of Phase 5 | Phase 6 | Task |
|---|---|---|---|
| `Core/Trash/spend.test.ts` | Standing; `spend.ts` became `Core/Trash/empty.ts` and its restore `Core/Bundles/restore.ts` (Tasks 5-5, 5-4) | `git mv` → `Core/Bundles/restore.test.ts`; its empty cases leave for `empty.test.ts`, its record and listing cases for `gather.test.ts` and `bundle.test.ts` | 6-3, 6-4, 6-5 |
| `Core/Trash/restoreScrub.test.ts` | Standing, its surviving cases at `:194,394,422,516,553,591,619,659,746,780-820` (Task 4-5); `restoreScrub.ts` became `Core/Nexus/arrival.ts` (Task 5-4) | `git mv` → `Core/Nexus/arrival.test.ts`; `:781` leaves for `gather.test.ts`, `:804` as a duplicate | 6-1, 6-3, 6-4 |
| `Core/Bundles/layout.test.ts` | Standing, with Task 4-1's `storeOf` cases; `layout.ts` became `Core/Paths/bundleLayout.ts` | `git mv` → `Core/Paths/bundleLayout.test.ts` | 6-3 |
| `Core/Settings/TrashFrame.test.tsx` | Standing; `TrashFrame.tsx` moved to `Core/Trash/` (Task 5-3) | `git mv` → `Core/Trash/TrashFrame.test.tsx`; its shared-behavior cases leave for `confirmations.test.ts` and `BundleTable.test.tsx` | 6-7, 6-8 |
| `Core/Trash/gather.test.ts` | — | Created: the delete records' cases, from `spend.test.ts:124-460` and `restoreScrub.test.ts:781` | 6-4 |
| `Core/Trash/empty.test.ts` | — | Created: the empty's cases, from `spend.test.ts:1705-2077,2571-2670` | 6-5 |
| `Core/Trash/discard.test.ts` | — | Created: `discardFile`'s cases, from `Core/Files/atomicWrite.test.ts:390-431` | 6-6 |
| `Core/Testing/bundles.ts` | — | Created (a *§Placements* file): the shared bundle fixture and browser harness | 6-2, 6-7 |
| `Core/Bundles/bundle.test.ts` | Extended in place (Tasks 3-1, 3-2, 5-6) | Gains the listing and record cases from `spend.test.ts:391,567-683` | 6-4 |
| `Core/Trash/deleteOrder.test.ts` | Rewritten in place (Tasks 2-1, 3-1, 3-2) | `:149` folds into `:159`; gains `archive.test.ts:227` | 6-1, 6-6 |
| `Core/Trash/trashRecovery.test.ts` | Extended in place (Tasks 3-2, 3-4, 4-4, 5-5) | `:399` and `:874` leave as duplicates; adopts the fixture's `stateOrder` | 6-1, 6-2 |
| `Core/Archive/refile.test.ts`, `Core/Archive/archive.test.ts` | Rewritten in place | `refile.test.ts:132,151` become one case; `archive.test.ts:352-415` one `it.each`; `archive.test.ts:227` leaves for `deleteOrder.test.ts` | 6-1, 6-6 |
| `Core/Trash/restoreProperty.test.ts` | Rewritten in place (Tasks 4-6, 5-5) | Adopts the fixture's `onlyBundle` | 6-2 |
| `Core/Files/atomicWrite.test.ts` | Its *"discardFile"* describe renamed (Task 2-1) | Loses that describe to `discard.test.ts` | 6-6 |
| `Core/Bundles/browser.test.ts`, `Core/Archive/ArchiveView.test.tsx`, `Core/Bundles/BundleTable.test.tsx` | Rewritten in place (Tasks 5-2, 5-3) | Adopt the browser harness; the skins' duplicated cases collapse; `BundleTable.test.tsx` and `Core/Interface/Confirm/confirmations.test.ts` gain the Trash skin's shared-behavior cases | 6-7, 6-8 |

No test file is deleted in Phase 6. *§Placements* gains the seven test-file entries above (four moved, three created), each following its module.

**DEPARTURES, DISCLOSED:**
- **`gatherLinks`' Cases Stay in `cascade.test.ts`:** after Task 3-2, each case in *"deleteCascade"* (`cascade.test.ts:480-840`) reads `gatherLinks` and `deleteCascade` over one disk and asserts both halves of `linkStrip`'s one rule, which lives in `Core/Nexus/cascade.ts`. Moving the record halves would copy that describe's setup into a second suite for no behavior a reader finds faster.
- **The Container Arm's Crash Windows Stay in `deleteReach.test.ts`:** `deleteReach.test.ts` holds every delete kind's planted-note crash windows in its two *"… delete on the notes"* describes (`:490`, `:732`), the Context arm's (`:652`) beside the container arm's (`:808`, `:829`) and the move arm's (`:888`, `:896`), while `finishOwed.test.ts` holds the property, option, and rename arms. The split is by owning op and reads as designed; moving the container arm alone would leave the Context and Space arms the odd ones out.
- **`trashRecovery.test.ts` Stays Whole:** it's the Trash's end-to-end suite by its own charter (`:1`, "Every restoration combination the surface can produce, driven through the same ops the leaf calls"), so its parking-on-empty and stash cases stay with it; only its duplicates and its `stateOrder` change.

#### Task 6-1

**TASK:** Each duplicated case collapses into the one case that already holds its expectations, in place, before anything moves (*Investigation · §What Becomes False · §Tests · Duplicated Cases*). The skin harnesses' clusters wait for Task 6-7's harness.

**NOW:**
- `deleteOrder.test.ts:149`, *"a content delete records before the artifact moves"*, asserts `atSettle` holds `{ entity: 'page', id: PAGE_A, parent: { kind: 'container' } }`; Task 3-2 rewrote `:159` as *"a content delete records the Link values its strip takes before the artifact moves"*, the same delete asserting `atSettle` with `links`.
- `trashRecovery.test.ts:399`, *"emptying hands the artifact over, and the switch decides whether it goes at all"*, repeats `spend.test.ts:1706` (*"hands the artifact to the system trash and removes the spent bundle behind it"*) and `:1724` (*"with the switch on the artifact never reaches the system trash at all"*), which Task 2-1 moved onto an installed machine.
- `trashRecovery.test.ts:874`, *"with Restore Links On Deletion off, the values stay removed"*, sits outside the describe at `:845` and rewrites the settings file its `beforeEach` already writes; `:853` pins the same restore inside it.
- `spend.test.ts:703`, *"a page returns into its since-renamed parent"*, is `trashRecovery.test.ts:242`'s restore without its row check, and `placement.test.ts:82` pins the placement itself.
- `restoreScrub.test.ts:804`, *"a page beneath a sidecar that cannot be read refuses the delete and leaves every byte"*, repeats `spend.test.ts:405`, *"a page beneath an unreadable parent sidecar refuses the delete and leaves its bytes"*.
- `refile.test.ts:132` (*"… takes nothing outside the Archive"*) and `:151` (*"… reaches no sidecar outside the Archive"*) pin one guard, `archiveStoreOf`'s name test, by two outcomes over the same unsafe id.
- `archive.test.ts:352`, `:368`, `:388`, and `:400` are one case over four arms: a Set restored or pulled from an archived Set, into another Collection or under another Set, put back by its Undo with what was archived from within it.

**CHANGE**

- [ ] `deleteOrder.test.ts`: remove `:149-157`, and widen `:159`'s match to `expect(atSettle).toMatchObject({ entity: 'page', id: PAGE_A, parent: { kind: 'container' }, links: [{ page: PAGE_B, property: 'prop_related', value: '[[Alpha]]' }] })`.
- [ ] `trashRecovery.test.ts`: remove `:399-425` and `:874-883`.
- [ ] `spend.test.ts`: remove `:703-716`.
- [ ] `restoreScrub.test.ts`: remove `:804-819`.
- [ ] `refile.test.ts`: merge `:132` into `:151` as *"a Collection whose id would not make a folder name takes and reaches nothing outside the Archive"*, `:151`'s setup with `:132`'s archived `Note.md` beside it, asserting both `:132`'s `pathExists(at('Escape'))` and filed bundles and `:151`'s untouched outside sidecar.
- [ ] `archive.test.ts`: replace `:352-415` with one `it.each` over the four arms, each row naming its title fragment, its extra sidecars, the archived item, the address it restores, and the destination.

**AFTER**

```Core/Archive/archive.test.ts diff
@@ restore — an archived item comes back by a plain move @@
-  it('a Set restored into another Collection is put back by its Undo with what was archived from within it, each on the trail it was archived on', async () => {
-  …
-  it('a Set pulled from an archived Set into another Collection is put back by its Undo with what was archived from within it', async () => {
-  …
-  it('a Set restored under another Set in its Collection is put back by its Undo with what was archived from within it on the trail it was archived on', async () => {
-  …
-  it('a Set pulled from an archived Set under another Set in its Collection is put back by its Undo with what was archived from within it on the trail it was archived on', async () => {
-  …
+  it.each([
+    ['restored into another Collection', false, OTHER],
+    ['pulled from an archived Set into another Collection', true, OTHER],
+    ['restored under another Set in its Collection', false, SHELF],
+    ['pulled from an archived Set under another Set in its Collection', true, SHELF],
+  ])('a Set %s is put back by its Undo with what was archived from within it, on the trail it was archived on', async (_, pulled, to) => {
+    await putJson(to === OTHER ? at('Other', '_pagecollection.json') : at('Notes', 'Shelf', '_pageset.json'), { id: to })
+    if (pulled) {
+      await putJson(at('Notes', 'Daily', 'Sub', '_pageset.json'), { id: SUB })
+      await writeFile(at('Notes', 'Daily', 'Sub', 'Deep.md'), DEEP)
+      await writeFile(at('Notes', 'Daily', 'Sub', 'Kept.md'), `---\nID: ${KEPT}\n---\nkept\n`)
+    }
+    await reseed()
+    const within = await archive(pulled ? 'Notes/Daily/Sub/Kept.md' : 'Notes/Daily/Beta.md')
+    const record = await readFile(at(within, '_record.json'), 'utf8')
+    const daily = await archive('Notes/Daily', 'set')
+    const restored = await restore(pulled ? join(daily, 'Daily', 'Sub') : daily, { kind: 'container', id: to })
+    if (to === SHELF) expect(await readRawRecord(at(within))).toMatchObject({ trail: [NOTES, SHELF] })
+    expect((await undo(restored)).ok).toBe(true)
+    expect(await readFile(at(within, '_record.json'), 'utf8')).toBe(record)
+    if (to === OTHER) {
+      expect((await listBundles(root, ARCHIVE)).map((b) => b.bundlePath).sort()).toEqual([within, daily].sort())
+      expect(await listBundles(root, { kind: 'archive', id: OTHER })).toEqual([])
+    }
+  })
```

`KEPT` (`'01KVGMT8BFP350FZZXAMG1QDVE'`, written inline twice today) joins the suite's id constants. The `:352` and `:368` arms' mid-case `toHaveLength(1)` read of the other Archive leaves, since the final `toEqual([])` after the Undo is the outcome; the four arms otherwise keep every assertion they had.

**VERIFY**

- [ ] `npm run test -- Core/Trash/deleteOrder.test.ts Core/Trash/trashRecovery.test.ts Core/Trash/spend.test.ts Core/Trash/restoreScrub.test.ts Core/Archive/refile.test.ts Core/Archive/archive.test.ts` is green, with six fewer cases than before and the `it.each` reporting four.
- [ ] The widened `:159` fails with `id: PAGE_A` changed to `PAGE_B`, and the merged refile case fails with `archiveStoreOf`'s name guard removed.
- [ ] Run the gates. Tests: about −140 lines.
- [ ] Check for unnecessary code or mistakes.

#### Task 6-2

**TASK:** `Core/Testing/bundles.ts` holds the on-disk bundle fixture: the seeded Nexus the delete, restore, and empty suites stand on, the Trash's bundle folders and its one listed bundle, the orders `state.json` keeps, and the two bundle fixtures `Core/Testing/fixtures.ts` holds, a listed row and a seeded property bundle. It replaces `spend.test.ts`'s seed and finders, `restoreProperty.test.ts`'s `onlyBundlePath`, and the two `stateOrder`s, before Tasks 6-4 and 6-5 split `spend.test.ts` into suites that each need the seed, so the bundle suites' fixtures have one home.

**NOW:**
- `spend.test.ts:57-79` define `bundleDirs` (every `.deleted` folder under `.trash`, a recordless one included) and `onlyBundle` (`{ dir, record }`, failing unless one); `:81-123` seed and tear down the Nexus (Projects with Pommora and Sapphire, `Notes/Daily/Alpha.md` tagged Pommora) and `:49-51` declare `PAGE_A`–`PAGE_C`.
- `restoreProperty.test.ts:80-84`'s `onlyBundlePath` lists the Trash and fails unless one.
- `stateOrder` is defined at `spend.test.ts:272` (inside *"a Context's place"*) and `trashRecovery.test.ts:63`.
- `trashRecovery.test.ts:39-70`'s `rows`, `find`, `del`, and `restoreRow`, and `archive.test.ts:71,799`'s `archive` and `trash` (one-liners over Phase 5's `bundleOf`), serve their own suites alone and stay.
- `Core/Testing/viewHarness.tsx`'s `mountEachTest(onMount)` is the folder's pattern for a fixture registered once per suite.
- `Core/Testing/fixtures.ts` holds `bundleRow` (`:35-46`) and, after Task 3-2, `seedPropertyBundle` (`:48-55`) beside the page, device, and cascade fixtures; only bundle suites read the two: `bundleRow` in `ArchiveView.test.tsx`, `BundleTable.test.tsx`, `browser.test.ts`, `confirmations.test.ts`, `entities.test.ts` (`countPhrase` over bundle rows), and `TrashFrame.test.tsx`; `seedPropertyBundle` in `bundle.test.ts`, `Bundles/handlers.test.ts`, `rows.test.ts`, `finishOwed.test.ts`, and `spend.test.ts`. They're its only readers of `Bundles/rows`, `Bundles/bundle`, `Bundles/record`, and `posix`.

**CHANGE**

- [ ] Create `Core/Testing/bundles.ts` as the AFTER (`git add` it).
- [ ] `spend.test.ts`: remove `bundleDirs`, `onlyBundle`, the `PAGE_` constants, the top-level `let root`, `beforeEach`, and `afterEach`; open the suite with `let root: string` and `bundleNexusEachTest('pom-prov-', (r) => (root = r))`; call `bundleDirs(root)` for `bundleDirs(join(root, '.trash'))`, `onlyBundle(root)` for `onlyBundle()` (its four `dir` reads become `join(root, bundlePath)`), and `stateOrder(root)` for `:272`'s local, which leaves.
- [ ] `trashRecovery.test.ts`: remove `:63-64`'s `stateOrder`; its calls read `stateOrder(root)`.
- [ ] `restoreProperty.test.ts`: remove `:80-84`; its 24 calls read `(await onlyBundle(root)).bundlePath`.
- [ ] Move `bundleRow` and `seedPropertyBundle` from `fixtures.ts` into `bundles.ts`, bodies unchanged, with the imports only they read (`fixtures.ts` keeps `pageKey`, `CascadeChange`, `PageDetail`, `machine`, and `DeviceRecord`), and re-point the eleven importers above from `'../Testing/fixtures'` (or `'../../Testing/fixtures'`) to `bundles`, each keeping its local name (`bundleRow as row` in four).

**AFTER**

```Core/Testing/bundles.ts diff
+// The bundle suites' shared fixtures: the seeded Nexus their deletes, restores, and empties run on, its bundles found on disk or seeded, the rows a browser lists, and the channels and row queries every bundle browser mounts through.
+
+import type { Dirent } from 'node:fs'
+import { mkdir, readdir, rm, writeFile } from 'node:fs/promises'
+import { afterEach, beforeEach, expect, vi } from 'vitest'
+import { type ListedBundle, listBundles, mintBundle } from '../Bundles/bundle'
+import type { PropertyRecord } from '../Bundles/record'
+import { type BundleRow, matched } from '../Bundles/rows'
+import { dropLiveTree } from '../Nexus/liveTree'
+import { closeSession, openSession } from '../Nexus/session'
+import { contextsDir, contextsRegistryFile } from '../Paths/paths'
+import { join } from '../Paths/posix'
+import { readJsonAt, tempRoot } from './hostFs'
+
+export const PAGE_A = '01KVGMT8BFP350FZZXAMG1QDVA'
+export const PAGE_B = '01KVGMT8BFP350FZZXAMG1QDVB'
+export const PAGE_C = '01KVGMT8BFP350FZZXAMG1QDVC'
+
+export function bundleNexusEachTest(prefix: string, onSeed: (root: string) => void): void {
+  let root: string
+  beforeEach(async () => {
+    root = tempRoot(prefix)
+    onSeed(root)
+    await mkdir(contextsDir(root), { recursive: true })
+    await writeFile(join(root, '.nexus', 'nexus.json'), JSON.stringify({ id: 'nx', createdAt: '2026' }))
+    await writeFile(
+      contextsRegistryFile(root),
+      JSON.stringify({
+        contexts: [{ id: 'ctx_projects', title: 'Projects', singular: 'Project', icon: 'target' }],
+      }),
+    )
+    await mkdir(join(contextsDir(root), 'Projects', 'Pommora'), { recursive: true })
+    await writeFile(join(contextsDir(root), 'Projects', 'Pommora', '_space.json'), JSON.stringify({ id: 'sp-pom' }))
+    await mkdir(join(contextsDir(root), 'Projects', 'Sapphire'), { recursive: true })
+    await writeFile(
+      join(contextsDir(root), 'Projects', 'Sapphire', '_space.json'),
+      JSON.stringify({ id: 'sp-sap', '<Projects>': ['Pommora'] }),
+    )
+    await mkdir(join(root, 'Notes', 'Daily'), { recursive: true })
+    await writeFile(join(root, 'Notes', '_pagecollection.json'), JSON.stringify({ id: 'col-notes' }))
+    await writeFile(join(root, 'Notes', 'Daily', '_pageset.json'), JSON.stringify({ id: 'set-daily' }))
+    await writeFile(join(root, 'Notes', 'Daily', 'Alpha.md'), `---\nID: ${PAGE_A}\n<Projects>:\n  - Pommora\n---\nbody`)
+    await openSession(root)
+  })
+  afterEach(async () => {
+    vi.restoreAllMocks()
+    dropLiveTree()
+    closeSession()
+    await rm(root, { recursive: true, force: true })
+  })
+}
+
+/** Every bundle folder under `.trash`, a recordless one included, never descending into one, exactly as the listing walks. */
+export async function bundleDirs(root: string): Promise<string[]> {
+  const walk = async (dir: string): Promise<string[]> => {
+    let entries: Dirent[]
+    try {
+      entries = await readdir(dir, { withFileTypes: true })
+    } catch {
+      return []
+    }
+    const out: string[] = []
+    for (const e of entries) {
+      if (!e.isDirectory()) continue
+      const abs = join(dir, e.name)
+      if (e.name.endsWith('.deleted')) out.push(abs)
+      else out.push(...(await walk(abs)))
+    }
+    return out
+  }
+  return walk(join(root, '.trash'))
+}
+
+export async function onlyBundle(root: string): Promise<ListedBundle> {
+  const listed = await listBundles(root, { kind: 'trash' })
+  expect(listed).toHaveLength(1)
+  return listed[0]
+}
+
+export const stateOrder = async (root: string): Promise<Record<string, unknown>> =>
+  (await readJsonAt<{ order: Record<string, unknown> }>(join(root, '.nexus', 'state.json'))).order
+
+export function bundleRow(over: Partial<BundleRow> = {}): BundleRow {
+  …                                                  (fixtures.ts:36-45, unchanged)
+}
+
+export const seedPropertyBundle = (root: string, record: PropertyRecord): Promise<string> =>
+  mintBundle(root, { kind: 'trash' }, join(root, `property-${record.id}`), record)
```

```Core/Testing/fixtures.ts diff
@@ imports @@
 import { pageKey } from '../Connections/pageIndex'
-import { type BundleRow, matched } from '../Bundles/rows'
-import { mintBundle } from '../Bundles/bundle'
-import type { PropertyRecord } from '../Bundles/record'
-import { join } from '../Paths/posix'
 import type { CascadeChange } from '../Nexus/cascade'
@@ bundleRow, seedPropertyBundle @@
-export function bundleRow(over: Partial<BundleRow> = {}): BundleRow {
-  …                                                  (lines 35-46, moved)
-}
-
-export const seedPropertyBundle = (root: string, record: PropertyRecord): Promise<string> =>
-  mintBundle(root, { kind: 'trash' }, join(root, `property-${record.id}`), record)
-
 export function titled(title: string, to: string): CascadeChange {
```

```Core/Trash/spend.test.ts diff
@@ imports @@
-import { seedPropertyBundle } from '../Testing/fixtures'
+import {
+  bundleDirs,
+  bundleNexusEachTest,
+  onlyBundle,
+  PAGE_A,
+  PAGE_B,
+  PAGE_C,
+  seedPropertyBundle,
+  stateOrder,
+} from '../Testing/bundles'
@@ :49-123 @@
-const PAGE_A = '01KVGMT8BFP350FZZXAMG1QDVA'
-const PAGE_B = '01KVGMT8BFP350FZZXAMG1QDVB'
-const PAGE_C = '01KVGMT8BFP350FZZXAMG1QDVC'
-
 let root: string
-
-/** Every bundle directory under .trash, recursively — never descending into one, exactly as the listing walks. */
-async function bundleDirs(dir: string): Promise<string[]> {
-  …
-}
-
-const onlyBundle = async (): Promise<{ dir: string; record: unknown }> => {
-  …
-}
-
-beforeEach(async () => {
-  root = tempRoot('pom-prov-')
-  …
-  await openSession(root)
-})
-
-afterEach(async () => {
-  …
-})
+bundleNexusEachTest('pom-prov-', (r) => (root = r))
@@ a Context’s place @@
-    const stateOrder = async (): Promise<unknown> =>
-      (await readJsonAt(join(root, '.nexus', 'state.json'))).order
~      expect(await stateOrder(root)).toEqual(seeded)
```

The seed's `mkdir(contextsDir(root))` makes `.nexus` too, so `spend.test.ts:82`'s separate `mkdir(join(root, '.nexus'))` leaves. The file header is the folder's file-level boundary, as `viewHarness.tsx`'s is, and `bundleDirs`' doc moves with it; Task 6-7's half adds none, so test support grows by the header alone.

**VERIFY**

- [ ] `npm run test -- Core/Trash/spend.test.ts Core/Trash/trashRecovery.test.ts Core/Trash/restoreProperty.test.ts` is green with the same case count as before.
- [ ] `git grep -nE "const (onlyBundlePath|stateOrder|onlyBundle)\b|function bundleDirs" -- Core ':!Core/Testing/bundles.ts'` prints nothing, and `git grep -nE "bundleRow|seedPropertyBundle" -- Core/Testing/fixtures.ts` prints nothing.
- [ ] Run the gates. Tests: about −5 lines (the fixture about +75 against the seed, finders, and ids about −80; the two moved fixtures ±0).
- [ ] Check for unnecessary code or mistakes.

#### Task 6-3

**TASK:** The four test files left beside a module that moved follow it under its base name, history kept by `git mv`, before any case leaves them: the restore suite to `Core/Bundles/restore.test.ts`, the arrival's to `Core/Nexus/arrival.test.ts`, the layout's to `Core/Paths/bundleLayout.test.ts`. The Trash skin's suite moves with Task 6-7's harness.

**NOW:**
- `Core/Trash/spend.test.ts` holds, after Phases 2–5, the delete records' cases (`:124-460`), the listing's (`:567-683`), the restore's (`:702-1704`, `:2078-2570`), and the empty's (`:1705-2077`, `:2571-2670`); its restore share is the largest, and its module's restore now lives in `Core/Bundles/restore.ts` (Task 5-5).
- `Core/Trash/restoreScrub.test.ts`'s survivors (Task 4-5) pin what a returning item holds once it lands: current through every rename (`:516`, the B-9 case; `:394`, `:553`, `:746`), its own links and its Context's own key re-spelled for where it lands (`:591`, `:619`, `:659`), its bytes kept (`:422`), and a trashed holder's refill miss named (`:194`, Decision D-5), which `arrive` (`Core/Nexus/arrival.ts`, Task 5-4) owns.
- `Core/Bundles/layout.test.ts` tests `Core/Paths/bundleLayout.ts` (Task 4-1 wrote its `storeOf` cases there).

**CHANGE**

- [ ] `git mv Core/Trash/spend.test.ts Core/Bundles/restore.test.ts`, `git mv Core/Trash/restoreScrub.test.ts Core/Nexus/arrival.test.ts`, `git mv Core/Bundles/layout.test.ts Core/Paths/bundleLayout.test.ts`.
- [ ] Re-point each moved file's relative imports to its new folder (`'./bundle'` for `'../Bundles/bundle'`, `'../Trash/empty'` for `'./empty'`, `'./bundleLayout'` for `'../Paths/bundleLayout'`, and so on), changing nothing else.

**AFTER**

```Core/Paths/bundleLayout.test.ts diff
@@ imports @@
-import { bundleAddressOf, layoutOf, originPathOf, storeOf } from '../Paths/bundleLayout'
+import { bundleAddressOf, layoutOf, originPathOf, storeOf } from './bundleLayout'
```

The other two files' import blocks change the same way, line for line.

**VERIFY**

- [ ] `test ! -e Core/Trash/spend.test.ts && test ! -e Core/Trash/restoreScrub.test.ts && test ! -e Core/Bundles/layout.test.ts` succeeds, and `git log --follow --oneline -- Core/Bundles/restore.test.ts | wc -l` counts more than one commit, as it does for the other two.
- [ ] `npm run test -- Core/Bundles/restore.test.ts Core/Nexus/arrival.test.ts Core/Paths/bundleLayout.test.ts` is green with the case counts the three files had.
- [ ] Run the gates. Tests: about ±0 lines.
- [ ] Check for unnecessary code or mistakes.

#### Task 6-4

**TASK:** The cases pinning what a delete records leave the restore suite for `Core/Trash/gather.test.ts`, beside `gather.ts`, which builds every record (P-9); the cases pinning the listing and the record file leave for `Core/Bundles/bundle.test.ts`, beside `listBundles` and `writeRecord`'s readers.

**NOW:**
- `restore.test.ts`'s describe *"the bundle — one folder per deletion, holding the artifact and its record"* (`spend.test.ts:124-458`) pins each kind's record: identity and parent (`:125`, `:148`), a Space's and a Context's (`:165`, `:184`), each kind's `place` (`:213`, `:229`, `:246`, `:260`), the refusals before anything moves (`:366`, `:405`), and a Space record's `partial` (`:419`, `:432`). Its nested *"a Context's place"* (`:271-350`) pins one Context's place through its delete, restore, and empty over one setup, so it stays in the restore suite. Phase 2 removed `:314`, `:342`, `:352`, and `:378`, and Phase 4 removes `:460-566` with `targets`.
- The same file's `:391` (*"writeRecord → readRecord round-trips exactly; a malformed record reads null"*), `:567-587` (*"a property bundle"*, two deletes in one stamp), and *"listBundles — what the trash offers"* (`:589-683`, after Phase 2 removed `:685`) pin `Core/Bundles/record.ts` and `bundle.ts`.
- `arrival.test.ts`'s describe *"a parent the filesystem handed Pommora can still be named by id"* holds `restoreScrub.test.ts:781`, *"a page deleted from a Finder-made folder records a real parent and restores"*, alone after Task 6-1.

**CHANGE**

- [ ] Create `Core/Trash/gather.test.ts` (`git add` it), opening with `let root: string` and `bundleNexusEachTest('pom-gather-', (r) => (root = r))`, and move into it, bodies unchanged:
  - the describe *"the bundle — one folder per deletion, holding the artifact and its record"*, retitled *"a delete's record"*, without its nested *"a Context's place"* and without `:391`;
  - `arrival.test.ts`'s *"a page deleted from a Finder-made folder records a real parent and restores"*, as the describe's last case, its describe leaving `arrival.test.ts`; its seed lines (a folder without a sidecar under the Nexus root) move with it.
- [ ] Move *"a Context's place"* to stand alone at the top of `restore.test.ts`, unchanged.
- [ ] In `Core/Bundles/bundle.test.ts`, add a describe *"a Trash a delete fills"* calling `bundleNexusEachTest('pom-bundle-', (r) => (trashRoot = r))` inside it, and move into it, bodies unchanged except `root` reading `trashRoot`: `:391`; *"a property bundle"*'s case; and every case of *"listBundles — what the trash offers"*.
- [ ] Remove the imports each file no longer reads; each moved case carries its own.

**AFTER**

```Core/Trash/gather.test.ts diff
+import { mkdir, readdir, readFile, rename, rm, writeFile } from 'node:fs/promises'
+import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
+import { readRecord } from '../Bundles/record'
+import { settledMutate } from '../Testing/settledMutate'
+import { bundleDirs, bundleNexusEachTest, onlyBundle, PAGE_A, PAGE_B, PAGE_C } from '../Testing/bundles'
+…the imports the moved cases read, as `restore.test.ts` spelled them
+
+let root: string
+bundleNexusEachTest('pom-gather-', (r) => (root = r))
+
+describe('a delete’s record', () => {
+  it('a page delete records identity + its parent container by the id the walk assigns', async () => {
+  …
+  it('a page deleted from a Finder-made folder records a real parent and restores', async () => {
+  …
+})
```

```Core/Bundles/bundle.test.ts diff
@@ after describe('fileInto') @@
+describe('a Trash a delete fills', () => {
+  let trashRoot: string
+  bundleNexusEachTest('pom-bundle-', (r) => (trashRoot = r))
+
+  it('writeRecord → readRecord round-trips exactly; a malformed record reads null', async () => {
+  …
+  it('two deletes in one stamp keep both records', async () => {
+  …
+  it('an incomplete deletion is skipped, and left on disk as evidence', async () => {
+  …
+  it('a chain folder that merely wears the name is walked through, not read as a deletion', async () => {
+  …
+})
```

**VERIFY**

- [ ] `git grep -nE "describe\('(the bundle — one folder|listBundles — what the trash offers|a property bundle|a parent the filesystem)" -- Core` prints nothing, and `git grep -n "describe('a delete’s record'" -- Core/Trash/gather.test.ts` prints one line.
- [ ] The three suites' case counts sum to what `restore.test.ts`, `arrival.test.ts`, and `bundle.test.ts` held before the task.
- [ ] Run the gates. Tests: about +28 lines (two suites' openings and imports).
- [ ] Check for unnecessary code or mistakes.

#### Task 6-5

**TASK:** The empty's cases leave the restore suite for `Core/Trash/empty.test.ts`, beside `empty.ts` (Placements, Task 5-5), so `restore.test.ts` holds the restore alone.

**NOW:** `restore.test.ts` holds *"emptyBundle — giving a bundle up for good"* (`spend.test.ts:1705-2077`, after Task 2-1 removed `:1877` and `:2059` and moved `:1706` and `:1724` onto an installed machine) and *"emptying a property's Trash entry"* (`:2571-2670`, which Task 4-4 narrowed to the trashed Collection's purge and its `:2660` inverted under Decision D-4). Both read the seed Task 6-2 shared.

**CHANGE**

- [ ] Create `Core/Trash/empty.test.ts` (`git add` it), opening with `let root: string` and `bundleNexusEachTest('pom-empty-', (r) => (root = r))`, and move both describes into it, bodies unchanged, each with the suite-local helpers only it reads.
- [ ] Remove the imports `restore.test.ts` no longer reads.

**AFTER**

```Core/Trash/empty.test.ts diff
+import { mkdir, readdir, readFile, rm, writeFile } from 'node:fs/promises'
+import { describe, expect, it, vi } from 'vitest'
+import { emptyBundle } from './empty'
+import { bundleDirs, bundleNexusEachTest, PAGE_A, PAGE_B } from '../Testing/bundles'
+…the imports the moved cases read
+
+let root: string
+bundleNexusEachTest('pom-empty-', (r) => (root = r))
+
+describe('emptyBundle — giving a bundle up for good', () => {
+…
+describe('emptying a property’s Trash entry', () => {
+…
```

**VERIFY**

- [ ] `git grep -nE "describe\('(emptyBundle|emptying a property)" -- Core/Bundles/restore.test.ts` prints nothing, and the two suites' case counts sum to `restore.test.ts`'s before the task.
- [ ] Run the gates. Tests: about +25 lines.
- [ ] Check for unnecessary code or mistakes.

#### Task 6-6

**TASK:** Two misfiled pieces go home: `discardFile`'s cases leave `Core/Files/atomicWrite.test.ts` for `Core/Trash/discard.test.ts`, beside `discard.ts`, and the Archive suite's delete case joins the delete's write-ahead failures in `deleteOrder.test.ts` (P-9).

**NOW:**
- `atomicWrite.test.ts:390-431`'s describe, renamed *"discardFile"* by Task 2-1, holds four cases (a stamped leaf, both ends recorded, the chain mirrored, two trashes de-collided) and the local `trashed` helper they list `.trash` through, since `discardFile` answers nothing (Task 2-1), reading the suite's `dir` (`:37-44`), `atomicWriteFile`, and `setWriteTap`.
- *"the own tap"*'s *"notes a discard as an unlink"* (`atomicWrite.test.ts:518`) also calls `discardFile`, beside the tap's note of every other own write, and stays: it pins the tap.
- `archive.test.ts:227`, rewritten by Task 3-1 as *"a Set delete whose record write throws leaves no bundle and puts the lifted folder back"*, sits in the archive op's describe (`:120`) and pins a delete's rollback, the subject of `deleteOrder.test.ts`'s describe *"a delete whose move fails deletes nothing"* (`:289`), which holds a content delete whose move throws.

**CHANGE**

- [ ] Create `Core/Trash/discard.test.ts` (`git add` it) with its own `dir` under `tempRoot('pom-discard-')`, created and removed around each case, and move the describe into it, its `trashed` helper and bodies unchanged; `atomicWrite.test.ts` keeps its `discardFile` import for the own tap's case, and drops any other name only the describe read.
- [ ] Move `archive.test.ts:227`'s case into `deleteOrder.test.ts`'s *"a delete whose move fails deletes nothing"*, opening with `await putJson(join(root, 'Notes', 'Daily', '_pageset.json'), { id: 'set-daily' })`, since `deleteOrder.test.ts`'s seed holds no Set; its `at` and `text` reads become `join(root, …)` and `readFile(join(root, …), 'utf8')`, and its spy keeps Task 3-1's target.

**AFTER**

```Core/Trash/discard.test.ts diff
+import { mkdir, readdir, readFile, rm, stat } from 'node:fs/promises'
+import { afterEach, beforeEach, describe, expect, it } from 'vitest'
+import { atomicWriteFile } from '../Files/atomicWrite'
+import { setWriteTap } from '../Files/writeEcho'
+import { basename, join } from '../Paths/posix'
+import { tempRoot } from '../Testing/hostFs'
+import { discardFile } from './discard'
+
+let dir: string
+beforeEach(async () => {
+  dir = tempRoot('pom-discard-')
+})
+afterEach(async () => {
+  await rm(dir, { recursive: true, force: true })
+})
+
+describe('discardFile', () => {
+  const trashed = async (...chain: string[]): Promise<string[]> => {
+  …                                                  (Task 2-1's helper, unchanged)
+  it('moves a file into .trash under a stamped leaf and removes the original', async () => {
+  …
+})
```

**VERIFY**

- [ ] `git grep -n "describe('discardFile'" -- Core/Files/atomicWrite.test.ts` prints nothing, `git grep -n "discardFile(" -- Core/Files/atomicWrite.test.ts` prints the own tap's one call, and `npm run test -- Core/Trash/discard.test.ts Core/Trash/deleteOrder.test.ts Core/Archive/archive.test.ts Core/Files/atomicWrite.test.ts` is green with the same total case count as before.
- [ ] Run the gates. Tests: about +17 lines.
- [ ] Check for unnecessary code or mistakes.

#### Task 6-7

**TASK:** The shared browser harness joins `Core/Testing/bundles.ts`: the stubbed channels every bundle browser asks and the row queries its suites read, replacing the three skin harnesses' copies (*Scouts/4-Interface.md · §Tests*, 1). The Trash skin's suite follows `TrashFrame.tsx` to `Core/Trash/`, and each cluster of cases the skins and the shared suites repeat becomes one case in the suite that owns the behavior, the skins keeping only what's theirs.

**NOW:**
- `browser.test.ts:119-170`, `TrashFrame.test.tsx:107-175`, and `ArchiveView.test.tsx:58-166` each stub `bundles:list`, `bundles:children`, `menu`, and `mutate`, and the two skins `bundles:permanentDelete` (Task 5-3), in their own `beforeEach`; each skin defines `rowOf`, `boxOf`, `press`, and `indentOf`, the two `indentOf`s reading one element by two paths (`TrashFrame.test.tsx:131`, `.bundle-title`; `ArchiveView.test.tsx:111`, `.cell-title`'s parent, which `BundleRows` draws as `.bundle-title`, `Core/Bundles/BundleTable.tsx:193`). Every row's box carries `aria-label` "Select <title>" (`BundleTable.tsx:190`).
- `vi.mock('@pommora/uix/Interactions/virtualRows', …)` repeats in each skin (`TrashFrame.test.tsx:24`, `ArchiveView.test.tsx:22`); vitest hoists a mock per module, so it stays in each suite.
- The clusters (*Scouts/4-Interface.md · §Tests*, 2), as each case reads after Phase 5:

| Behavior | Owner (Kept) | Leaves | Folded Into the Kept Case |
|---|---|---|---|
| A batch's homeless rows ask once per kind | `browser.test.ts:256` | `TrashFrame.test.tsx:473`, `ArchiveView.test.tsx:489` | a homed row in the batch goes with no destination; an inner page asks as a page |
| A container's click discloses it | `browser.test.ts:236` | `TrashFrame.test.tsx:513`, `ArchiveView.test.tsx:250` | a second click folds it, and a double-click leaves it open; the nested rows' indent goes to `BundleTable.test.tsx:88` |
| A page's double-click leaves it checked | `browser.test.ts:243` | `TrashFrame.test.tsx:536` | the Trash's opens nothing (`rulesOf`'s store rule) |
| The keyboard steps, checks, and discloses | `BundleTable.test.tsx:174` | `TrashFrame.test.tsx:176` | — (`ArchiveView.test.tsx:214` keeps Enter opening a page's reader, the skin's own, and drops its Space checks) |
| A check survives a collapse | `browser.test.ts:171`, `:183` | `TrashFrame.test.tsx:570` | — |
| A checked Set and its checked page act once | `browser.test.ts:110` (the rule), `:251` (the bar) | `ArchiveView.test.tsx:302` | — |
| An inner row's trail | `rows.test.ts:373` | `TrashFrame.test.tsx:584`, `ArchiveView.test.tsx:285` | — |
| A search that hides the checked row shows no box | `BundleTable.test.tsx:217` | `TrashFrame.test.tsx:57` | a checked row no visible row holds reveals no box (`ArchiveView.test.tsx:527` keeps the bar's withdrawal, the skin's own) |
| A row's box checks it | `BundleTable.test.tsx:198`, `:217` | `TrashFrame.test.tsx:44` | — |
| A Nexus switch stops a batch | `confirmations.test.ts` (Task 6-8 moves `TrashFrame.test.tsx:498` there) | `ArchiveView.test.tsx:475` | a batch handed a Nexus id the session no longer holds posts nothing |

  `browser.test.ts:110` and `:251` stay apart: the first pins `outermostOf`'s look-alike-prefix rule on plain rows, the second the hook handing the bar its result.

**CHANGE**

- [ ] `git mv Core/Settings/TrashFrame.test.tsx Core/Trash/TrashFrame.test.tsx`; its `'../Trash/TrashFrame'` import reads `'./TrashFrame'`.
- [ ] Add the browser half to `Core/Testing/bundles.ts` as the AFTER.
- [ ] `TrashFrame.test.tsx` and `ArchiveView.test.tsx`: replace each describe's `listed`, `children`, `picked`, `list`, `menu`, and `mutated` declarations and their dialer stub with `const channels = stubBrowserEachTest()` (`ArchiveView.test.tsx` passing `() => ({ 'page:open': … })` for its reader), read `channels.listed` and the rest where the cases read the locals, and replace the local `rowOf`, `boxOf`, and `press` with the harness's, passing `host`; each skin's `indentOf` leaves with the cases reading it (`TrashFrame.test.tsx:524`, `ArchiveView.test.tsx:258`, both under *Leaves*). `ArchiveView.test.tsx`'s `titles` and `rowEls` read `.bundle-rows .data-row` and stay.
- [ ] `BundleTable.test.tsx` replaces its local `rowOf` and `boxOf` (`:67-72`) with the harness's, passing `host` (every row draws its box with `aria-label` "Select <title>", `BundleTable.tsx:190`), and defines `indentOf` locally beside `chevronOf`, its one reader being `:88`'s folded indent: `const indentOf = (title: string): string => (rowOf(host, title).querySelector('.bundle-title') as HTMLElement).style.marginLeft`, with `rowIndent` imported for the fold's expectation as the skins import it. Its `rowEls`, `chevronOf`, and `key` stay.
- [ ] `browser.test.ts`'s *"a browser's remembered checks"*: `const channels = stubBrowserEachTest(() => ({ 'bundles:children': children }))`, its deferred `children` staying its own.
- [ ] Fold each cluster's expectations into its kept case, as the table's last column names, then remove each case under *Leaves* — thirteen cases, and the whole `describe('a Trash row')` (`TrashFrame.test.tsx:28-80`) once `:44` and `:57` leave.

**AFTER**

```Core/Testing/bundles.ts diff
@@ imports @@
+import { act } from 'react'
-import { afterEach, beforeEach, expect, vi } from 'vitest'
+import { afterEach, beforeEach, expect, type Mock, vi } from 'vitest'
+import { stubDialer } from '../vitest.setup'
@@ after stateOrder @@
+interface BrowserChannels {
+  listed: BundleRow[]
+  children: Record<string, BundleRow[]>
+  picked: string | null
+  list: Mock
+  menu: Mock
+  mutated: Mock
+}
+
+export function stubBrowserEachTest(more: () => Record<string, unknown> = () => ({})): BrowserChannels {
+  const channels = {} as BrowserChannels
+  beforeEach(() => {
+    Object.assign(channels, { listed: [], children: {}, picked: null })
+    channels.list = vi.fn(async () => ({ ok: true, value: channels.listed }))
+    channels.menu = vi.fn(async () => ({ ok: true, value: channels.picked }))
+    channels.mutated = vi.fn(async () => ({ ok: true, value: {} }))
+    ;(window as unknown as { nexus: unknown }).nexus = stubDialer({
+      'bundles:list': channels.list,
+      'bundles:children': vi.fn(async (addresses: string[]) => ({
+        ok: true,
+        value: addresses.map((address) => channels.children[address] ?? []),
+      })),
+      menu: channels.menu,
+      mutate: channels.mutated,
+      'bundles:permanentDelete': vi.fn(async () => ({ ok: true, value: false })),
+      ...more(),
+    })
+  })
+  return channels
+}
+
+export const boxOf = (host: ParentNode, title: string): HTMLElement =>
+  host.querySelector(`[aria-label="Select ${title}"]`) as HTMLElement
+
+export const rowOf = (host: ParentNode, title: string): HTMLElement =>
+  boxOf(host, title).closest('.data-row') as HTMLElement
+
+export const press = (host: ParentNode, title: string, detail: number): Promise<void> =>
+  act(async () => {
+    rowOf(host, title).dispatchEvent(new MouseEvent('click', { bubbles: true, detail }))
+  })
```

```Core/Trash/TrashFrame.test.tsx diff
@@ the Trash pane @@
-  let listed: BundleRow[]
-  let list: ReturnType<typeof vi.fn>
-  let picked: string | null
-  let menu: ReturnType<typeof vi.fn>
-  let mutated: ReturnType<typeof vi.fn>
-  let children: Record<string, BundleRow[]>
+  const channels = stubBrowserEachTest(() => ({
+    'personalization:set': vi.fn(async () => ({ ok: true, value: null })),
+  }))
@@
-  const rowOf = (title: string): HTMLElement => …
-  const boxOf = (title: string): HTMLElement => …
-  const press = async (title: string, detail: number): Promise<void> => …
-  const indentOf = (title: string): string => …
@@ beforeEach @@
-    listed = [row({ title: 'Alpha' })]
-    picked = null
-    children = {}
-    mutated = vi.fn(async () => ({ ok: true, value: {} }))
-    list = vi.fn(async () => ({ ok: true, value: listed }))
-    menu = vi.fn(async () => ({ ok: true, value: picked }))
-    ;(window as unknown as { nexus: unknown }).nexus = stubDialer({
-      …
-    })
+    channels.listed = [row({ title: 'Alpha' })]
```

`ArchiveView.test.tsx`'s describe changes the same way, its `readable` flag and `page:open` stub passing through `more`.

**VERIFY**

- [ ] `git grep -nE "const (rowOf|boxOf|press) =" -- Core/Trash Core/Archive Core/Bundles` prints nothing, `git grep -n "const indentOf =" -- Core` prints `BundleTable.test.tsx` alone, and `test ! -e Core/Settings/TrashFrame.test.tsx` succeeds; the skins' imports only their removed cases read (`rowIndent` among them) leave with them.
- [ ] Each folded expectation fails with its behavior broken: `browser.test.ts:256`'s homed row with `requestOf`'s destination spread unconditionally; `:236`'s second click with `toggle`'s close removed; `BundleTable.test.tsx:217`'s hidden check with the reveal reading `checked.size` alone.
- [ ] The jsdom suites' case count fell by exactly thirteen.
- [ ] Run the gates. Tests: about −215 lines (the three harnesses about −120 for the fixture's +37; the thirteen cases about −150; the folds about +15).
- [ ] Check for unnecessary code or mistakes.

#### Task 6-8

**TASK:** The browser's shared behavior that the Trash skin's suite pins leaves it (P-9; *Scouts/4-Interface.md · §Tests*, 3), each case for the suite of the module that runs it after Phase 5: the date column's for `BundleTable.test.tsx`, beside `useDateColumn` (Task 5-3); a batch's run, its notices, its Undo chord, and a Nexus switch stopping it for `confirmations.test.ts`, beside `runBundled` (Task 5-2). `TrashFrame.test.tsx` keeps only what the Trash draws.

**NOW:**
- `TrashFrame.test.tsx`'s *"the Trash pane"* drives the browser through the Trash skin: the date menu (`:225-283`: `pickFromDateMenu`, `:234`, `:249`), the Undo a restore or delete spends (the `it.each` at `:264`, `:285`, `:301`), a batch landing pending saves first (`:335`, the slice's `mutate` flushing before each bundle op, `Core/Session/nexusSlice.ts:251`), the batches' notices (`:354`, `:364`, `:375`, `:387`, `:430`, `:443`, `:449`, `:456`, `:465`), and a Nexus switch mid-batch (`:498`). What stays the Trash's own: its line in the frame (`:195`), the opened Nexus's listing (`:217`), an inner row's Restore and Delete (`:548`), a delete made elsewhere (`:591`), and Task 5-2's lone refusal.
- After Task 5-2, `runBundled(verb, rows, nexusId)` (`Core/Interface/Confirm/confirmations.ts`) sends each row's request through the slice's `mutate`, spends each restored row's Undo, stops at a Nexus switch, tells the stores once, and posts one notice through `notifyBundled`; the hook composes the rows and their destinations and hands its render-time Nexus id.
- `confirmations.test.ts` holds the chord's own spend (`:291`, *"gives up its Undo and the chord once the Trash spends its bundle"*, through `spendUndo` directly) and Task 5-2's four notice cases (B-4's archive, an Undo's own run, an Undo's refusal among its lines, the slice posting nothing); none repeats a Trash skin case, each pinning another facet.

**CHANGE**

- [ ] Move `:234` and `:249` into `BundleTable.test.tsx` as a describe *"the date column"*, mounting a `useBundleBrowser({ kind: 'trash' }, …)` harness that draws `BundleTable` with its `DateHeading`, over `stubBrowserEachTest(() => ({ 'personalization:set': … }))`; `pickFromDateMenu` moves with them, reading the heading `DateHeading` draws.
- [ ] Move `:264`, `:285`, `:301`, `:335`, the notice cases, and `:498` into `confirmations.test.ts` as a describe *"a batch through runBundled"*, each case keeping its stubs and its assertions and running `runBundled('Restored' | 'Deleted', rows)` with the rows the skin's pick handed, where it right-clicked or picked for both. `:498` takes `ArchiveView.test.tsx:475`'s fold (Task 6-7): a batch handed a Nexus id the session no longer holds posts nothing.
- [ ] Remove from `TrashFrame.test.tsx` every helper only the moved cases read (`pickFromDateMenu`, `pickForBoth`, `nexus`).

**AFTER**

```Core/Interface/Confirm/confirmations.test.ts diff
+describe('a batch through runBundled', () => {
+  const channels = stubBrowserEachTest()
+  const both = (): Parameters<typeof runBundled>[1] => …the two rows `pickForBoth` checked, as the hook hands them
+
+  it.each([
+    ['Restored', 'restore'],
+    ['Deleted', 'emptyBundle'],
+  ])('a batch %s spends the bundle’s Undo, so the chord reaches the entry beneath', async (verb, op) => {
+  …
+  it('a Nexus switch during a batch stops it, posting no notice and telling the stores once, as does a batch handed a Nexus the session no longer holds', async () => {
+  …
+})
```

**VERIFY**

- [ ] `git grep -nE "Restore All|Delete All|pickFromDateMenu|pickForBoth|spends the bundle" -- Core/Trash/TrashFrame.test.tsx` prints nothing.
- [ ] Every moved case is green with its assertions as they were, and the jsdom and node suites' case count is what Task 6-7 left.
- [ ] Run the gates. Tests: about −20 lines.
- [ ] Check for unnecessary code or mistakes.

#### Task 6-9

**TASK:** The doc and comment claims *§What Becomes False* lists that no earlier phase's commit makes false are corrected, minimally: the link strip's second wording defers to its owner in `ConnectionsPM.md`, and three comments, one refusal, and four feature-doc lines that were already false read true.

**NOW:**
- **The Subtraction:** *§What Becomes False*'s Code Comments, Feature Docs, and Issues, less every claim Phases 1–5's Reconciliation sections and AFTERs take, leaves these.
- **The Link Strip:** the code's rule is `deleteCascade`'s (`Core/Nexus/cascade.ts:108-111`, Task 3-2's `linkStrip`): a value leaves where its name resolves to nothing afterwards. `ConnectionsPM.md:30` states it ("A delete strips a value only where its name resolves to nothing afterwards, so a name another page still answers is left to that page."). `NexusRecordPM.md:12` restates it another way ("unless a page outside it still holds that title"), which is wrong for a path-form value naming the deleted page beside a same-titled page elsewhere (`cascade.test.ts:659`). The other five statements say that a strip happens, not which values it takes: `NexusRecordPM.md:14`'s refill (rewritten by Task 4-5), `CorePM.md:92`'s cascade policy ("under the same rule" naming the rename's report-and-stand policy), `CollectionsPM.md:49`'s reach (Task 4-4), `InterfacePM.md:80`'s label count, and `ConfigurationPM.md:118`'s Restore Links On Deletion row.
- **Already False, Unclaimed:** `Core/Bundles/bundle.ts:50` ("A store reads as a shadow of the nexus", which a carried bundle contradicts, `refile.test.ts:124`); `bundle.ts:221`'s refusal "Only a trash or archive record can be spent.", which `readBundleAt` answers `listInner` too, where nothing is spent; `Core/Nexus/finishOwed.ts:1`, which leaves out the relink entries the settle's turn runs (`:93`) and Task 3-3's move entries; `UIX/Table/table.css:11`, a UIX comment naming Core surfaces; `NexusRecordPM.md:28`'s Known Issue (the folder moves before any sweep, and a cut-short move finishes in `leave`); `NexusRecordPM.md:34`'s Pending item ("which today run per-file", while a move's re-spell runs under a relink entry noted once the move has landed, `cascade.ts:324`, and cascades land in groups); `CorePM.md:14,36` (a page's bundle is `<stamp>__<Page>.md.…`, not `<stamp>__<Page>.…`).

**CHANGE**

- [ ] Apply the AFTER.

**AFTER**

```.claude/Features/NexusRecordPM.md diff
@@ :12 @@
-… A page, Set, or Collection delete strips every Link value naming a page it took, from the tree or an Archive, from the pages and Spaces outside it, both stores' pages included, unless a page outside it still holds that title, once its artifact has moved, …
+… A page, Set, or Collection delete strips the Link values naming a page it took, from the tree or an Archive, by the rule [[ConnectionsPM]] states, from the pages and Spaces outside it, both stores' pages included, once its artifact has moved, …
@@ Known Issues @@
-- **A process dying between the sweep and the settle** leaves the sweep done and the folder still live, with the swept membership readable in the record but not yet spendable in-app.
 - **The baseline pass is best-effort end to end** — a failed walk or row write retains the prior record, and the open proceeds.
@@ Pending @@
-- **Crash-safe moves and link renames** — the write→act→settle shape applied to the move cascade and the `[[link]]` rename cascade, which today run per-file.
+- **Crash-safe moves and link renames** — the write→act→settle shape applied to the move cascade and the `[[link]]` rename cascade, whose relink entry is noted once the move has landed.
```

▸ The `:12` `-` line reads Task 4-4's "both stores' pages included".

```.claude/Features/CorePM.md diff
@@ :14 @@
-│   │       └── // <stamp>__<Page>.archived  | • An archive bundle — the artifact beside its record
+│   │       └── // <stamp>__<Item>.archived  | • An archive bundle — the artifact beside its record
@@ :36 @@
-│       └── // <stamp>__<Page>.deleted       | • A deletion bundle — the artifact beside its record
+│       └── // <stamp>__<Item>.deleted       | • A deletion bundle — the artifact beside its record
```

`<Item>` is the artifact's own name, `Alpha.md` for a page and the folder's for a Set, and keeps the tree's column.

```Core/Bundles/bundle.ts diff
@@ chainDir @@
-/** A store reads as a shadow of the nexus, so a stored item shows where it lived. A path that isn't under the root has no chain to mirror, and following its `..` would write outside the store entirely — it lands flat instead. */
+/** A bundle mints under the folder chain its item leaves from, so a stored item shows where it lived when it left. A path that isn't under the root has no chain to mirror, and following its `..` would write outside the store entirely — it lands flat instead. */
@@ readBundleAt @@
-  if (!at) return fault('Only a trash or archive record can be spent.')
+  if (!at) return fault('That path is in neither the Trash nor an Archive.')
```

```Core/Nexus/finishOwed.ts diff
@@ :1 @@
-// The one finishing pass, at the open and on Try Again: Context and then Space entries under the Contexts lock in the settle's turn, then property entries under the schema lock, then the content deletes' and moves' entries in the settle's turn, the notes file's own lock innermost and never nested; …
+// The one finishing pass, at the open and on Try Again: Context and then Space entries under the Contexts lock in the settle's turn, then property entries under the schema lock, then the content deletes', the Set moves', and the relinks' entries in the settle's turn, the notes file's own lock innermost and never nested; …
```

```UIX/Table/table.css diff
@@ .table-head @@
-  /* The one place a heading's type is set — TableView's and ArchiveView's .col-header and the Trash's head inherit it. */
+  /* The one place a heading's type is set; every table's heading inherits it. */
```

**VERIFY**

- [ ] `git grep -n "still holds that title\|reads as a shadow\|can be spent\|today run per-file\|<Page>.archived\|<Page>.deleted\|ArchiveView's .col-header" -- .claude/Features Core UIX` prints nothing.
- [ ] `git grep -n "resolves to nothing afterwards" -- .claude/Features` prints `ConnectionsPM.md` alone.
- [ ] `git grep -n "can be spent" -- '*.test.ts' '*.test.tsx'` prints nothing, so no case pinned the old refusal.
- [ ] Run the gates. Production: ±0 lines; three comments and one string rewritten, none added.
- [ ] Check for unnecessary code or mistakes.

#### Task 6-10

**TASK:** `.claude/CLAUDE.md`'s Codebase Structure lines that the restructure leaves false read true, in the minimal wording, the table not widened. The file is Nathan's, and he approved the wording below (10-30-2026).

**NOW:**
- `.claude/CLAUDE.md` is Nathan's file, and its Trash line (`:94`) reads his own wording, "Item deletion and restoration".
- After Phase 5, the restore lives in `Core/Bundles/restore.ts`, `Core/Archive/` holds the archive op, the carry (`refile.ts`), `ArchiveView`, and `archiveLabel.ts`, `Core/Trash/` the delete, the empty, the flat discard, and the Trash frame, and `Core/Paths/bundleLayout.ts` the stores' layout and the store-of-path rule. `Core/Testing/` holds 25 files, the tree builder among them, and gains `bundles.ts` in Task 6-2.

**CHANGE**

- [ ] Apply the AFTER's wording, and commit.

**AFTER**

```.claude/CLAUDE.md diff
@@ Codebase Structure @@
-├── // Archive       | • Archiving, restoring, and ArchiveView
+├── // Archive       | • Archiving, re-filing, and ArchiveView
-├── // Bundles       | • The bundle format, record, placement, rows, and browser both stores share
+├── // Bundles       | • The bundle format, record, placement, restore, rows, and browser both stores share
-├── // Paths         | • Path safety, exclusion, and disambiguation
+├── // Paths         | • Path safety, exclusion, disambiguation, and the stores' layout
-├── // Testing       | • The shared test tree builder
+├── // Testing       | • The shared test builders, fixtures, and harnesses
-├── // Trash         | • Item deletion and restoration
+├── // Trash         | • Item deletion, emptying, and the Trash frame
```

**VERIFY**

- [ ] `git diff HEAD~1 -- .claude/CLAUDE.md` changes those five lines and nothing else.
- [ ] Check for unnecessary code or mistakes.

#### Task 6-11

**TASK:** Decision G-2's closing measurement: the property rename at HEAD, natively reach-in, on Medium-0 and Medium-50, three runs each, from a worktree build, set against the medians on record, before the harness leaves. Neither `reach-in.patch` (the prototype, which HEAD now is) nor a second build applies; the instrumentation does, since `launch` waits on its `__bench.repairAt` and `timed` reads its `__benchIo` (`.claude/Benchmarks/Reach-In/lib.mjs`).

**NOW:**
- `setup.sh` takes the commit as its argument and `BUILDS` names the worktrees it cuts; `BUILDS=baseline ./setup.sh HEAD` cuts one, applies `instrumentation.patch` with `git apply`, and builds it. Task 1-2 re-fitted the patch's `Desktop/Platform/nodeMachine.ts` hunks and committed it; Task 2-1 changed its `Core/Nexus/handlers.ts` context (`await finishOwed(root, await trashDeps(ctx))` reads `await finishOwed(root)`), so that hunk refuses, as any hunk Phases 3–5 moved may.
- `fills.sh` builds a size's fills, `PCTS` naming them, deleting each Doomed clone through the worktree's own `mutate` (`fill.mjs`), into `$REACH_IN_WORK/fills/Medium-<pct>`; it moves the `~/Benchmark-Medium` it generates into the working folder.
- `profile.mjs`'s unnamed `timing` mode is a plain timed run, each of `RUNS` on a fresh clone's warm instance, writing `settleMs` and `calls.land` per run to `profiles/timing.json` (Task 1-2); it reads `fills/Medium-0` alone (`profile.mjs:11`). `bench.mjs` alternates two builds and reads `bundled` (Phase 5 removed it), so it isn't used.
- **On Record** (`9b9c0d630`): Medium-0, 14,708 ms over 7,027 files, 2.09 ms a file (`profiles/profile.json`; *Write Path — Implementation Plan · §The Own Pass's Measure*), taken under `profile.mjs profile`'s sampling profiler, so an upper bound beside `timing`'s plain run, the nearest unprofiled figure being the Medium-10 baseline's median, 14,741 ms over 6,961 (`results/Medium-10.jsonl`); Medium-50, the baseline's median 14,785 ms over 6,961 (2.12 ms) and the reach-in prototype's 22,270 ms over 10,553 (2.11 ms) (`results/Medium-50.jsonl`; *Investigation · §The Measurement*).

**CHANGE**

- [ ] With nothing else heavy running and Nathan's instance left alone (ports 9391 and 9395 only), from `.claude/Benchmarks/Reach-In/` in the main checkout:
  1. `BUILDS=baseline ./setup.sh HEAD`. Where `git apply` refuses a hunk, re-fit it onto HEAD in `instrumentation.patch` (in `openNexusSequence`: `openStartedAt` first, `treeAt` after `seedLiveTree(tree)`, `indexAt` after `seedContentIndex`, `openAt` after the open's `settleNow`, `repairAt` once the repair sweep's chain settles; in `nodeMachine.ts`, the counter after `stage` and the wrapping loop after the object), and run the setup again.
  2. `PCTS="0 50" ./fills.sh Medium`.
  3. `RUNS=3 node profile.mjs timing renameProperty`, then `python3 -c 'import json,statistics as s; r=list(json.load(open("profiles/timing.json")).values()); m=s.median(v["settleMs"] for v in r); f=s.median(v["calls"]["land"] for v in r); print(m, f, round(m/f, 2))'`.
  4. In `profile.mjs`, read the fill as `join(WORK, 'fills', process.env.FILL ?? 'Medium-0')`, then `FILL=Medium-50 RUNS=3 node profile.mjs timing renameProperty` and step 3's `python3` line again.
  5. `./teardown.sh`; then, from the repo root, `git restore -- .claude/Benchmarks/Reach-In/instrumentation.patch .claude/Benchmarks/Reach-In/profile.mjs` and `rm -f .claude/Benchmarks/Reach-In/profiles/timing.json`.
- [ ] Record both on a line beneath the plan's Net Ledger, beside Task 1-2's: *"Decision G-2, Property Rename at `<HEAD>` (median of three, `settleMs / calls.land`): Medium-0 `<ms>` over `<files>` (`<per>` ms), against 14,708 over 7,027 (2.09, profiled) at `9b9c0d630`; Medium-50 `<ms>` over `<files>` (`<per>` ms), against the baseline's 14,785 over 6,961 (2.12) and the prototype's 22,270 over 10,553 (2.11)."* Commit the plan file alone, the medians in the message.

**VERIFY**

- [ ] Both lines beneath the Net Ledger carry three-run medians, and every run's reply was `ok`.
- [ ] `git worktree list` shows the main checkout alone; `ls "${TMPDIR}/pommora-reach-in" 2>/dev/null`, `ls -d ~/Benchmark-* 2>/dev/null`, and `git status --short .claude/Benchmarks` print nothing.
- [ ] Check for unnecessary code or mistakes.

#### Task 6-12

**TASK:** The measurement harness leaves with every fixture it built (Decision A-1); *Trash & Archive Restructure — Reach-In Measurement* stays as the record of what it measured, and the one living reference to its files is pointed at that record's history.

**NOW:**
- `.claude/Benchmarks/Reach-In/` holds 32 tracked files (`RERUN.md`, both patches, eleven scripts, `results/`, `profiles/`); `.claude/Benchmarks/`' other three files are unrelated and stay.
- `git grep -n "Benchmarks/Reach-In"` finds, outside the harness, `.claude/IssuesPM.md:1474` (I-081's footnote, citing `profiles/profile.json` and `profile-15fe7422a.json` for the `lstat` counts), the plan's own *§Final Verification · The Cold-Machine Check* (`ls .claude/Benchmarks/Reach-In`, which proves the removal), and completed planning records (*Decisions & Intention · §Sources*, *Investigation · §The Measurement*, *Reach-In Measurement*'s header, and the Write Path plan, brief, and investigation), left as written.
- The two profiles I-081 cites are in history at `e4256d93d`, the commit that re-ran the Medium-0 profile at `9b9c0d630`.

**CHANGE**

- [ ] `git rm -r .claude/Benchmarks/Reach-In`.
- [ ] Rewrite I-081's footnote citation through `batch-issues` as the AFTER.

**AFTER**

```.claude/IssuesPM.md diff
@@ [^81] @@
-… `Core/Files/writeEcho.ts:~9-10` (`PREFIX_WINDOW_MS`), `.claude/Benchmarks/Reach-In/profiles/profile.json` and `profile-15fe7422a.json` (the `lstat` counts)
+… `Core/Files/writeEcho.ts:~9-10` (`PREFIX_WINDOW_MS`), `profiles/profile.json` and `profile-15fe7422a.json` of the Reach-In harness at `e4256d93d` (the `lstat` counts)
```

**VERIFY**

- [ ] `ls .claude/Benchmarks/Reach-In 2>/dev/null` prints nothing, and `git grep -n "Benchmarks/Reach-In" -- ':!.claude/Planning'` prints nothing.
- [ ] `git show e4256d93d:.claude/Benchmarks/Reach-In/profiles/profile.json | head -c 1` prints `{`.
- [ ] `git worktree list` shows the main checkout alone, and `ls -d ~/Benchmark-* 2>/dev/null` and `ls "${TMPDIR}/pommora-reach-in" 2>/dev/null` print nothing.
- [ ] Check for unnecessary code or mistakes.

#### Review Checkpoint

- [ ] **No Coverage Dropped:** before Task 6-1, `npm run test -- --reporter=json --outputFile="$TMPDIR/p6-before.json"`; after Task 6-8, the same into `p6-after.json`. `numTotalTests` fell by exactly nineteen, the six of Task 6-1 and the thirteen of Task 6-7, and every case title the before-run lists is in the after-run, compared by each assertion result's leaf `title` rather than its `fullName`, since Tasks 6-4, 6-7, and 6-8 move cases between describes, but for those nineteen and these retitles: the four `archive.test.ts` titles the `it.each` replaced; whichever of `refile.test.ts`'s *"a Collection whose id would not make a folder name takes nothing outside the Archive"* and *"… reaches no sidecar outside the Archive"* isn't counted among the nineteen, both giving way to Task 6-1's merged title; `TrashFrame.test.tsx`'s *"a restore here spends the bundle’s Undo, so the chord reaches the entry beneath"* and *"a delete here spends the bundle’s Undo, so the chord reaches the entry beneath"*, which read *"a batch Restored spends …"* and *"a batch Deleted spends …"* in `confirmations.test.ts`; and its *"a Nexus switch during a batch stops it, posting no notice and telling the stores once"*, which Task 6-8 widens with `ArchiveView.test.tsx:475`'s fold. Both JSON files are removed afterward.
- [ ] **Tests Where Their Behavior Lives:** every file in the GOAL's ledger stands where it names, `git ls-files 'Core/**/*.test.ts' 'Core/**/*.test.tsx' | xargs -n1 basename | sort | uniq -d` names no Trash or Archive suite twice, and each moved or created suite's base name is a module beside it.
- [ ] **One Fixture:** `Core/Testing/bundles.ts` holds only what two or more suites read: `git grep -l` of each export across `Core`, `bundles.ts` aside, names at least two files.
- [ ] **The Number:** `view-delta`'s Actionable column for the phase is recorded in the Net Ledger's Phase 6 row beside its ±0 production estimate, Task 6-9's three rewritten comments and one refusal alone, with Task 6-11's medians beneath the Ledger.
- [ ] Two read-only reviewers, one under `code-simplification` and one under `adversarial-review`, read the phase outward against Phases 4 and 5's moves; what holds is folded before *§Final Verification* opens, and the compaction checkpoint follows.

---

### Completion Criteria

- **Conformance:** the implementation adheres to the project's guidelines, Nathan's stated preferences, and *§Constraints*; no mechanism landed that an existing one already provided, every file created, moved, or deleted is one *§Constraints · Placements* names, and nothing changed outside what the plan named.
- **Correctness:** each decision is observably true: a page restored after a property, option, Space, and Context rename returns holding the new names; a page, Set, or Space moved out of a store by hand finishes as a restore; a trashed page's refill miss is named; the property rename's time at both ends is recorded; and the whole works end to end as a user would use it, driven live.
- **Completeness:** every task landed and is ticked; nothing was deferred, narrowed, or left as scaffolding, debug output, or an unauthorized TODO.
- **Confirmation:** every verification ran and its result was read; every new test goes red without its change.
- **Continuity:** *§Reconciliation* is walked, the project's living documents read true, and every deviation is fixed or ruled on.
- **Confidence:** gates are green from a clean state across the full range from the BASELINE head, and the diff is the size the Net Ledger implied; growth past it is reported, not tidied away.

#### Final Verification

**THE STANDARD:** The work is finished when a later review of it finds nothing to correct. Not just doing the chores — doing the laundry, folding it, picking up what fell out of the hamper, emptying the lint trap, leaving no trace that anything went wrong. Nothing is carried as a concern, nothing is deferred where the fix is known, and nothing is declared that wasn't watched happen. Where something genuinely couldn't get there, the report names which and why, and everything else is still finished. Ambiguity met during execution took the simplest reading and was recorded; it didn't stop the run.

The reviews run over `<BASELINE>..HEAD`, each wave closed before the next opens. Every reviewer brief carries the Mandate verbatim and has its agent read *§Constraints* whole, except the neutral gate's, which carries the Mandate alone.

- [ ] Phase Review: Phase 1 · Phase 2 · Phase 3 · Phase 4 · Phase 5 · Phase 6
- [ ] **Wave One:** two read-only `opus-xhigh` reviewers briefed with `code-simplification`, one reading inward at the diff and one outward against the rest of Core, Desktop, and UIX; one fix agent folds what holds as numbered fixes beside a Not Taken list with reasons, and the fold commits.
- [ ] **Wave Two:** two fresh `opus-xhigh` reviewers, inward and outward, briefed with `adversarial-review` over the folded range and given the Not Taken list, so a fold left out returns only on new evidence; folded and committed the same way.
- [ ] **The Dashboard Map:** in each wave, one more read-only agent (one per lens: `code-simplification` in Wave One, `adversarial-review` in Wave Two) maps how the Studio dashboard's Pommora line count (`~/The Studio/.claude/dashboard/projects/pommora.mjs`, read with its `README.md` and `line-count.mjs`) would divide so Trash & Archive becomes its own section: which paths it takes from which areas, what the other areas keep, and what the history rebuild costs. The second reconciles the first's map; the result goes to Nathan in the report, and nothing in the dashboard changes.
- [ ] **The Neutral Gate:** one `fable-high` agent given only `<BASELINE>..HEAD`, the Mandate, and the intention under *§Constraints · Neutral Gate*; a yes-or-no verdict, its corrections, and the strengths to keep, re-run after a fold.
- [ ] **The Own Pass:** the gates from a clean state and `npm run build`; the diff read once; *§Completion Criteria* ticked.
- [ ] **The Cold-Machine Check:** each of these prints nothing, or only what it names: `git worktree list` (the main checkout alone); `ls -d ~/Benchmark-* 2>/dev/null`; `ls "${TMPDIR}/pommora-reach-in" 2>/dev/null`; `ls .claude/Benchmarks/Reach-In 2>/dev/null`; and a process listing for Electron or Node launched from a worktree or scratch folder.
- [ ] **Reconciliation:** *§Reconciliation* walked; *§Deviations* ruled on; STATUS and BASELINE's End filled.
- [ ] **The Report:** in `closeout-review`'s closeout format, with the range presented through `view-delta`, the per-phase and total delta, the property rename's before-and-after, every deviation, the Cold-Machine Check's result, and the neutral gate's answer verbatim.

#### Reconciliation

- `Desktop/Platform/nodeMachine.ts:49` — "Answers the file's commit, which lands it once its group has flushed." — Task 1-1
- `Desktop/Platform/nodeMachine.ts:94` — "Every temp is written and flushed before any rename, so the group's flushes overlap rather than wait in turn." — Task 1-1
- `Core/Files/atomicWrite.ts:50` — "each flush holds one of the host's I/O threads until the drive answers, so the app's other reads and writes wait tens of milliseconds behind a chunk" — Task 1-1
- `.claude/Features/CorePM.md:105` — "every temp is flushed before any is renamed into place" — Task 1-1
- `Desktop/Platform/nodeMachine.test.ts:74` (T-N19) — "flushes every file of a group before renaming any", three `synced` — Task 1-1
- `Desktop/main.ts:68` — "each flush holds a pool thread until the drive answers, so the default four threads would queue every other read and write behind a chunk for about 110 ms" — Task 1-2
- `.claude/Planning/Write Path/Write Path — Implementation Plan.md:4010` — "The Thread-Pool Line's Placement" as an open item (AFTER A) — Task 1-2
- `Core/Platform/machine.ts:22` — "the same time, size, and birth … Birth tells a file replaced whole apart only where the new file keeps a birth of its own" — Task 1-3
- `Core/Index/indexSeed.ts:110` — "The index keeps no birth time, so unlike `sameFile` it passes a replacement at the same time and size." — Task 1-3
- `Core/Nexus/fileEvents.ts:395` — "An outside edit can keep the time, size, and birth the walk cache's hit test reads" — Task 1-3
- `Core/Testing/hostFs.ts:51` — "`outside` differs in length from what the file holds" — Task 1-3
- `Core/Files/walkCache.test.ts:44` (T-N40) — "the original born before that time", skipped off macOS — Task 1-3
- `Core/Platform/machine.test.ts:54` — the memory entry as `{ text, mtimeMs }` exactly — Task 1-3
- `.claude/Features/CorePM.md:113` — "reading only files whose mtime or size moved since they were last indexed" — Task 1-3
- `.claude/Features/CorePM.md:160` — "the mtime and size it was read at"; "re-indexes any file whose mtime or size moved" — Task 1-3
- `.claude/Features/DesktopPM.md:22` — "whose modification time, size, and birth time are unchanged" — Task 1-3
- `Core/Files/writeEcho.ts:1` — "the echo window tells the app's writes from outside ones" — Task 1-4
- `Core/Files/writeEcho.ts:5` — "A write recorded with its bytes is an echo while the file still holds them" — Task 1-4
- `Core/Files/writeEcho.ts:83,99,102` — "a bytes-less record"; "The hash of the bytes the app just wrote"; "the bytes their arrival named" — Task 1-4
- `Core/Files/atomicWrite.ts:13` — "each echo is recorded … and forgotten where its landing rejects" — Task 1-4
- `Desktop/FileWatch/watcher.ts:113` — "a bytes-less echo stops here, and one recorded with its bytes is dropped at the settle while the file still holds them" — Task 1-4
- `.claude/Features/DesktopPM.md:22` — "a write is recognized by the bytes it left, while the file still holds them" — Task 1-4
- `Core/Files/writeEcho.test.ts:72-152`, `Core/Files/atomicWrite.test.ts:55` (T-N36), `Desktop/FileWatch/watcher.test.ts:539,596,604` — echoes recorded with bytes — Task 1-4
- `.claude/Features/CorePM.md:113` — "so no row decides what a cascade passes over" — Task 1-5
- `Core/Nexus/fileEvents.test.ts:825` — "an outside edit that keeps its page's time, size, and birth leaves the next walk no parse of the old bytes" stays true, but on APFS it no longer goes red without the watched forget, which the change time covers there; its name drops "and birth" — Phase 1's Review Checkpoint
- `.claude/Planning/Write Path/Write Path — Implementation Plan.md:148` (*§Rulings · The Index's Trust*, "No index row decides what a cascade passes over") and its Deviation D-4 — a completed plan's record, left as written — Tasks 1-2 and 1-5 (no edit)
- `Core/Trash/discard.ts:35` — "still goes where Trash Mode sends deletions" — Task 2-1
- `Core/Trash/trashMode.ts:1` — "The in-nexus `.trash` … or the macOS system Trash" — Task 2-1
- `Core/Nexus/finishOwed.ts:258` — "into its bundle or where Trash Mode sends it" — Task 2-1
- `Core/Nexus/finishOwed.ts:324` — "A Context gone for good, with no bundle to restore it from, takes its order with it." — Task 2-1
- `Core/Trash/delete.ts:105` — "With no bundle to keep them, the pages' metadata entries leave with the delete" — Task 2-1
- `Core/Interface/Confirm/confirmations.ts:88` — "A system-trash delete mints no bundle, so it offers no Undo" — Task 2-1; "`undoTo` returns a held item where the delete took it from" — Task 2-4
- `Core/Nexus/mutateRequest.ts:20` — "absent when the system trash took it" — Task 2-1
- `Core/Assets/assetMigrate.ts:217` — "a discard the system trash refuses" — Task 2-1
- `.claude/Features/CorePM.md:56,148,171`, `DesktopPM.md:38`, `ConfigurationPM.md:266`, `NexusRecordPM.md:12,16`, `InterfacePM.md:80`, `SurfacePM.md:26` — the trash mode, the system-trash delete, and "wherever Trash Mode sends deletions" — Task 2-1
- `Core/Bundles/bundle.ts:256` — "and its partial mark, since what the bundle recorded partly it recorded partly for each item it holds" — Task 2-2
- `Core/Bundles/bundle.test.ts:200`, `Core/Bundles/rows.test.ts:463`, `Core/Trash/deleteReach.test.ts:800` — a content record's `partial` — Task 2-2
- `Core/Trash/spend.test.ts:685` — "old-format trash entries are invisible" — Task 2-2
- `Core/Nexus/reorder.ts:53` — "A Context gone for good takes its panel id and its Space order with it." — Task 2-3
- `Core/Nexus/reorder.ts:77` — "A Context keeps its panel id while bundled, as its restore returns to it." — Task 2-3
- `Core/Trash/spend.test.ts:299` — "A Context in the Trash keeps its order" — Task 2-3
- `Core/Trash/spend.test.ts:314` — "a record from before the place was kept restores its Context at the end" — Task 2-3
- `Core/Trash/spend.test.ts:324` — "emptying a Context's bundle drops its panel id and its Space order" — Task 2-3
- `.claude/Features/NexusRecordPM.md:10` — "A Context carries its registry entry and its place in the registry"; "every record but a Context's or a property's carries … (`place`)" — Task 2-3
- `.claude/Features/NexusRecordPM.md:14` — "its Space order, kept in `state.json` while it sits in the Trash, applies again" — Task 2-3; "the record is removed once every page still present has its tag back" — Task 2-4
- `.claude/Features/NexusRecordPM.md:16` — "taking a Context's kept Space order with it" — Task 2-3
- `Core/Trash/spend.ts:294` — "The record outlives a partial re-tag, so what didn't come back stays written down." — Task 2-4
- `Core/Trash/spend.test.ts:797,810` — "and the record stays" — Task 2-4
- `Core/Interface/Confirm/confirmations.test.ts:275` — "an Undo given a destination restores its bundle there" — Task 2-4
- `Core/Nexus/settle.test.ts:1298` — the describe "returningNames", against an exported function — Task 2-4
- `Core/Trash/delete.ts:95` — "the record lands before anything moves, a Space's or Context's built from what its holders held up front, then its note" — Task 3-1
- `Core/Trash/delete.ts:119,130,140` — "A refused note or list step leaves nothing deleted, so its bundle goes"; "The artifact moves, then what leaves with it"; "A delete in the one order …" — Task 3-1
- `Core/Bundles/bundle.ts:63` — `mintBundle`'s doc, which names no record — Task 3-1
- `Core/Nexus/finishOwed.ts:258` — `leave`, "A deleted Context's or Space's folder … into the bundle its delete noted" (Phase 2's wording), as the finish's alone — Task 3-1
- `Core/Nexus/reorder.ts:77` — "its id read from `tree`, the tree from before it left" (Phase 2's wording) — Task 3-1
- `Core/Archive/archive.test.ts:227` — "a Set delete whose record write throws puts the lifted folder back" (as the whole behavior) — Task 3-1
- `Core/Trash/deleteReach.test.ts:652` — "a crash between the note and the list step finishes the delete" (which left its orders behind) — Task 3-1
- `Core/Nexus/cascade.ts:93` — `deleteCascade`'s doc, as the strip's whole rule — Task 3-2
- `Core/Nexus/cascade.ts:106` — "so they're left out by path" — Task 3-2
- `Core/Index/keyHolders.ts:78` — "With `read`, each file is read once …" (in Task 1-5's `findHolders` docstring), moving to `readHolders` — Task 3-2
- `Core/Bundles/bundle.ts:275` — "so a value its delete's finish appends later stays with the bundle" — Task 3-2
- `Core/Nexus/owed.ts:23` — "the links a finish strips go into `bundle`'s record" — Task 3-2; "or a Set move", "reached under `within`", "parked where `park` says" — Task 3-3
- `Core/Trash/deleteOrder.test.ts:159` — "the links its strip takes join the record" — Task 3-2
- `Core/Bundles/bundle.test.ts:345` — "keeping those a finish appended since the open" — Task 3-2
- `Core/Nexus/cascade.test.ts:480-948` — `deleteCascade` answering `links` — Task 3-2
- `.claude/Features/NexusRecordPM.md:12` — a page, Set, or Collection delete's strip described with no record of its values ahead — Task 3-2
- `Core/Nexus/finishOwed.ts:382` — "a moved Set is live by design, so it's back only while it stands where it left" (moving to `finishMove`) — Task 3-3
- `Core/Nexus/move.test.ts:60`, `Core/Trash/deleteReach.test.ts:879` — a Set move's entry as `kind: 'container'` — Task 3-3
- `Core/Trash/spend.ts:59` — "Artifact first: a failed bundle removal then leaves a record with no artifact" (with a Collection's Archive after its artifact) — Task 3-4
- `Core/Trash/spend.ts:93` — "parked as a finish strips it" — Task 3-4
- `Core/Trash/trashRecovery.test.ts:1051` — "still takes the views naming that Archive's Sets at its Try Again" — Task 3-4
- `Core/Archive/refile.ts:2,124` — "re-files each record a Set moved …"; "re-files each record whose origin the tree holds" — Task 3-5
- `Core/Archive/refile.ts:49,74,88` — `refileArchived`'s, `refileLanded`'s, and `refileFiled`'s docs — Task 3-5
- `IssuesPM.md` — nothing: B-1, B-5, B-6, and B-10 are the Investigation's, and no open issue names them.
- `Core/Paths/exclusion.ts:62` — "the Archive is the one hidden folder read as content" — Task 4-3
- `Core/Files/walk.ts:42` — "the one hidden folder read as content" — Task 4-3
- `Core/Nexus/heldPages.ts:1` — "adds the Archive's pages … for every refill and every frozen world" — Task 4-3 (line 2's "frozen worlds" — Task 4-6)
- `Core/Nexus/heldPages.ts:54` — "`byId` holds every entity the tree holds and every page the Archive holds" — Task 4-3
- `Core/Bundles/placement.ts:38` — "only an archived page's own file sits inside its bundle" — Task 4-3
- `Desktop/FileWatch/watcher.ts:53` — "We DO watch .nexus/" (as the only exemption) — Task 4-3
- `Core/Nexus/governedSweep.ts:79` — "nothing displays an archived path" — Task 4-1
- `Core/Nexus/cascade.ts:42` — "written outside the Archive" — Task 4-1
- `Core/Matrix/matrixGraph.ts:18` — "An archived page answers nothing" — Task 4-1
- `Core/Nexus/cascade.ts:93` — "archived ones among them"; "Nothing at or under `abs`" — Task 4-4
- `Core/Index/keyHolders.ts:77` — "`governed` reaches the pages of Collections and the Archive" — Task 4-4
- `Core/Nexus/treePatch.ts:109` — "or by the one whose Archive holds it" (as the whole rule) — Task 4-4
- `Core/Nexus/finishOwed.ts:166` — "the Collections and pages the Trash holds lose it" — Task 4-4
- `Core/Nexus/configReach.ts:247` — "or from an archived Set's sidecars" — Task 4-4
- `Core/Nexus/configReach.ts:342` — "A Set the edit names as gone" — Task 4-4
- `Core/Trash/spend.ts:77` — "its delete's finish reaches the Trash too" (as the property's whole Trash reach) — Task 4-4
- `Core/Contexts/contextCascade.ts:99` — "What sits under `skipUnder`" — Task 4-2
- `Core/Index/keyHolders.ts:68` — "each Space the tree holds" — Task 4-2
- `Core/Trash/restoreScrub.ts:1` — the scrub's header — Task 4-5
- `Core/Trash/restoreScrub.ts:217` — "the page the delete recorded it naming" — Task 4-5
- `Core/Bundles/record.ts:39` — `linkTargets`' doc — Task 4-5
- `Core/Bundles/bundle.ts:256` — "the bundle's targets" — Task 4-5
- `Core/Trash/delete.ts:40` — "Its pages' index rows sit at their Archive paths" — Task 4-5
- `Core/Trash/spend.ts:194` — "reconciled as any Trash restore" — Task 4-5
- `Core/Nexus/settle.ts:323` — "through `landed.repair`" — Task 4-5
- `Core/Trash/trashedCopies.ts:1` — "and a returning value refilled into a trashed copy" — Task 4-6
- `Core/Nexus/governedRoot.ts:59` — `Frozen`, "a frozen copy" — Task 4-6
- `Core/Nexus/governedSweep.ts:92` — "so a trashed copy joins the live tree's records" — Task 4-6
- `Core/Properties/assignment.ts:25,48,63` — "into the Trash copies"; the Trash listing — Task 4-6
- `Core/Nexus/owed.ts:47,95` — `values`, "what it worked out" — Task 4-6
- `Core/Nexus/cascade.ts:296` — "what a restore worked out landed first" — Task 4-6
- `CorePM.md:74` — "`.nexus/archive` is a hidden folder …"; "a property sweep reaches only Collections and the Archive" — Task 4-3
- `CollectionsPM.md:49` — reach-in stated for the Archive alone — Task 4-4
- `NexusRecordPM.md:12` — "the Archive's pages included" — Task 4-4; "the Spaces the tree shows naming them" — Task 4-2
- `NexusRecordPM.md:33` — "a bundle's frozen content" — Task 4-6
- `ContextsPM.md:25` — "and on a Trash restore" — Task 4-4
- `NexusRecordPM.md:10` — the `targets` clause — Task 4-5
- `NexusRecordPM.md:14` — the reconcile passage and the parking sentence — Task 4-5; "into its copy in the Trash" — Task 4-6
- `CorePM.md:98` — "a Trash restore alone rewrites a key" — Task 4-5
- `ConnectionsPM.md:30` — "outside the Archive it reached" — Task 4-1; "every page the Archive holds"; "repairs the returning page's own links" — Task 4-5
- `PommoraPRD.md:101` — the Trash restore's rewrite — Task 4-5
- `IssuesPM.md` I-069 — dissolves with `targets` — Task 4-5
- `IssuesPM.md` I-039 — "`nexusPages` `byId` … answers null" gains the claim rule's third answer — Task 4-3
- `IssuesPM.md` I-033 — its cause, `parkLinks`' walk through `originPagesIn`, dissolves; it closes with no batch channel — Task 4-6
- `IssuesPM.md` I-065 — closes as intended (Decision B-4) — Task 4-6
- Tests, as each task's VERIFY routes them:
  - `exclusion.test.ts:37,173-189` — Tasks 4-1 and 4-3
  - `walk.test.ts:77` and `indexMaintenance.test.ts:197,218` — Task 4-3
  - `watcher.test.ts:671` and `restoreScrub.test.ts:194` — Task 4-3
  - `restoreScrub.test.ts:553` — Task 4-2
  - `restoreScrub.test.ts:516` and `spend.test.ts:2638,2660` — Task 4-4
  - `archive.test.ts:1135`, `spend.test.ts:460-566,1160,1217,1391,2443`, the scrub's cases and `restoreScrub.test.ts:1`'s header, and `renameFrontmatterKey`'s tests — Task 4-5
  - `spend.test.ts:1005` and `trashedCopies.test.ts` — Task 4-6
- `Core/Nexus/mutateRequest.ts:20` — "Where a removal filed what it took" (`bundled`) — Task 5-2
- `Core/Nexus/mutateRequest.ts:48` — "returning the item to the address its record names" — Task 5-2
- `Core/Bundles/record.ts:56` — "A Trash record's only: the Archive address a delete took the item from" — Task 5-2
- `Core/Trash/delete.ts:40` — "its record keeps the address it left for the Undo" — Task 5-2
- `Core/Bundles/rows.ts:41` — "what the reader opens and a restore's Undo finds again" — Task 5-2
- `Core/Bundles/browser.ts:235` — `rulesOf`'s "what a restore's and a delete's Undo do" — Task 5-2; "the date column's setting" — Task 5-3
- `Core/Interface/Confirm/confirmations.ts:53,112` — `offerUndo`'s "restores every bundle an act minted, to `destination`"; `offerDeleted`'s doc — Tasks 5-1, 5-2
- `Core/Session/nexusSlice.ts:68` — `quiet`'s doc, the slice's notices for every op — Task 5-2
- `Core/Bundles/browser.ts:263` — `useBundleBrowser`'s "and its date column" — Task 5-3
- `Core/Contract/bridge.ts:202` — the one-reading comment over `delete:facts` — Task 5-3
- `Core/Settings/frames.ts:642` — Confirm Before Deletion's caption — Task 5-3 (I-079)
- `Core/Trash/restoreScrub.ts:1`, `Core/Trash/trashedCopies.ts:1` — their headers — Task 5-4
- `Core/Archive/archive.ts:1` — "comes back by a plain move to its exact place" — Task 5-5
- `Core/Nexus/mutate.ts:143` — "An Archive bundle holds a page or Set alone, so its restore … takes no Contexts lock" — Task 5-5
- `Core/Nexus/governedSweep.ts:95` — `sweepRootsById`'s one key `above` each id — Task 5-5
- `Core/Nexus/settle.ts:389` — `payOutsideMoves`' doc, which reads every paired move as a move — Task 5-6
- `Core/Bundles/bundle.ts:218,275` — `readBundleAt`'s and `keptLinksUnder`'s docs — Task 5-6
- `Core/Nexus/settle.ts:426` — `settleNow`'s comment — Task 5-7
- `.claude/Features/NexusRecordPM.md:16` — "the delete answers with the bundle it minted" — Task 5-2
- `.claude/Features/NexusRecordPM.md:4` — "`Core/Trash/spend.ts` and `Core/Archive/archive.ts` for restore" reads "The code is `Core/Bundles/` for the bundle, its record, its placement, and its restore, …" — Task 5-5
- `.claude/Features/ConfigurationPM.md:115` — what always asks — Task 5-3 (I-079)
- `.claude/Features/NexusRecordPM.md:14` — the Restore paragraph, silent on an item moved out by hand — Tasks 5-6, 5-7
- `Core/Bundles/bundle.ts:369` — `spendBundle`'s doc, silent on a container emptied of its last item (Decision C-6) — Task 5-5
- `.claude/IssuesPM.md` — I-064 closes — Task 5-6; I-079 closes — Task 5-3; I-077 closes as intended — Task 5-5
- `.claude/IssuesPM.md` footnotes of issues that stay open, each citation re-pointed through `batch-issues` to where its code stands: I-080's `Core/Settings/TrashFrame.tsx` — Task 5-3; I-039's `Core/Trash/restoreScrub.ts:68` (`ensurePageId`) — Task 5-4; I-036's `Core/Trash/spend.ts:~120-303` (`restoreTrashed`) and I-076's `Core/Trash/spend.ts:185` (the Context and Space restore), both into `Core/Bundles/restore.ts` — Task 5-5
- Tests, as each task's VERIFY routes them:
  - every test read of `bundled`, `archive.test.ts:807` (`UNDO`), `spend.test.ts:2216,2229`, `mutateRequest.test.ts:55`, `confirmations.test.ts:380,392`, `ArchiveView.test.tsx:398,458`, `browser.test.ts:351` — Task 5-2
  - the `delete:facts` stubs (`TrashFrame.test.tsx:157`, `ArchiveView.test.tsx:145`, `confirmations.test.ts`), `browser.test.ts:5` — Task 5-3
  - `bundle.test.ts`'s "appendLinks adds each link once" (Task 3-2's) — Task 5-4
  - `archive.test.ts:735` — Task 5-5
- `.claude/Features/NexusRecordPM.md:12` — "unless a page outside it still holds that title" — Task 6-9
- `.claude/Features/NexusRecordPM.md:28` — "A process dying between the sweep and the settle leaves the sweep done and the folder still live" — Task 6-9
- `.claude/Features/NexusRecordPM.md:34` — "which today run per-file" — Task 6-9
- `.claude/Features/CorePM.md:14,36` — `<stamp>__<Page>.archived`, `<stamp>__<Page>.deleted` — Task 6-9
- `Core/Bundles/bundle.ts:50` — "A store reads as a shadow of the nexus" — Task 6-9
- `Core/Bundles/bundle.ts:221` — "Only a trash or archive record can be spent." — Task 6-9
- `Core/Nexus/finishOwed.ts:1` — "then the content deletes' and moves' entries" — Task 6-9
- `UIX/Table/table.css:11` — "TableView's and ArchiveView's .col-header and the Trash's head inherit it" — Task 6-9
- `.claude/CLAUDE.md` — the `// Archive`, `// Bundles`, `// Paths`, `// Testing`, and `// Trash` lines — Task 6-10
- `.claude/IssuesPM.md:1474` — I-081's footnote citing `.claude/Benchmarks/Reach-In/profiles/` — Task 6-12
- `Core/Trash/trashRecovery.test.ts:1` — "Every restoration combination the surface can produce" stays true; its empties and stashes stay with it (*Departures*) — no edit
- *Trash & Archive Restructure — Reach-In Measurement* `:5` ("HARNESS: this folder; `RERUN.md` has the steps") and *§7 Cleanup* ("What stays here is the harness") — a completed record, left as written — Task 6-12 (no edit)
- *Trash & Archive Restructure — Implementation Plan · §Constraints · The Measurement* ("the harness in `.claude/Benchmarks/Reach-In/` … measures HEAD alone") — the plan's record of its own step, left as written — Task 6-11 (no edit)

#### Open Items

- **Windows and exFAT:** the write-through flag (Decision G-4) and the change time on an NTFS rename-over and on exFAT ship unverified, so the guards the change time retires leave only where it's known to be real.
- **Power Loss:** that a write-through temp counts as flushed when the drive's cache is emptied rests on Apple's `fcntl(2)` documentation and git's batch mode, not on a power-cut test.
- **Extended Attributes:** a sync client that writes extended attributes (iCloud Drive, Dropbox) moves a file's change time, so inside such a folder an own save would be heard as outside and no index row would vouch; that degrades toward re-reading, never toward a missed write, and is unprobed.

#### Deviations

Departures the plan takes from a decision's or the Investigation's "how", each with its reason in the task that departs (*§Constraints · Rulings*); execution adds its own beneath.

**What a User Sees (Nathan, 10-30-2026):**
- **Task 3-5 · An Orphaned Archive Record Re-Files Upward:** the open pass files a record whose parent has gone under the deepest container its chain still holds, where it used to leave it misfiled.
- **Task 5-2 · An Archive Restore's Undo Whose Item Has Left:** the Undo is sent at the path the item stood at and refused with the host's message, where it used to do nothing without a word.
- **Task 5-2 · A Batch Undo Names Its Refusals:** an Undo over several bundles counts the rows it couldn't restore ("N Pages couldn’t be undone.") among its lines, where a refusal's own message used to be replaced by the next row's notice.
- **Task 5-5 · One Missing-Artifact Refusal:** both stores answer "That item is no longer there." for a bundle whose artifact has left, in place of the Trash's "That deletion never finished; there is nothing to restore." and the Archive's own refusal.
- **Task 5-6 · A Hand-Moved Item's Misses Go Unnamed:** a page or Set moved out of a store by hand takes its stripped values back where they still resolve, and what doesn't resolve stays as it is, since no window is open to name it.
- **Task 2-3 · A Deleted Space's Row Shows Its Icon:** the record takes a Space's icon from the tree, which reads the `$icon` the app writes, so its Trash row shows the icon it had, where the old sidecar read looked for `icon` and found none.
- **Task 6-9 · The Spend Refusal's Copy:** "Only a trash or archive record can be spent." becomes "That path is in neither the Trash nor an Archive.", which is what it answers.

**Cautionary Code (Nathan, 10-30-2026):**
- **Task 1-1 · The Landing Hears an Outside Write:** the landing answers the stat taken after its rename only while its modified time and size still match its own temp's, so another program writing the file in that instant (Obsidian on NexusOS, a sync arrival) is heard and re-read rather than mistaken for the app's own write; one line.

**Inside the Code:**
- **Phase 1:** LD-8 isn't taken, so the remint stays serial; LD-9's strict edit stays. Task 1-1's commits each wait on their own drive's flush, and `CHUNK`'s docstring changes there; Task 1-2 runs right after Task 1-1; Task 1-3's index rows take the landing's `FileStat` whole; Task 1-4 removes `forgetWrite` whole; Task 1-6's copy carries its source entry whole rather than merging it; the checkpoint gave the echo record a move-or-landing union, and an in-flight landing's record keeps the stat its file last landed with, so an echo drained during the file's next landing is still dropped.
- **Phase 2:** Task 2-3's `withContextAt` keeps its index parameter.
- **Phase 3:** M-18 is dropped, its premise false; Task 3-1 keeps `oweWalk` at the two finish arms and carries `departing` on the delete plan; Task 3-2's empty no longer reads the strip's links; Task 3-5's carry keeps its own formula beside `currentOrigin`.
- **Phase 4:** Task 4-2's `addressable` takes the lenient reading; Task 4-3's tree patch needs no code for `.trash`; Task 4-4's Collection record owns itself, M-9 lands as `trashedOwners` rather than `archivedWithin`, and its views-rename test becomes a property-delete test; Task 4-6's `parkLinks` reads the indexed Trash; Task 4-2's pass-over leaves a trashed twin silently, neither skipped nor owed, since a copy made out of the Trash by hand would otherwise warn on every strip with a Try Again that can't succeed; Task 4-4's `reachConfig` keeps its two Trash reads, which are different walks.
- **Phase 5:** Task 5-2 keeps `archivedKind`; Task 5-4 moves `respell` into `cascade.ts` and passes the settled index into `returningCascade`; Task 5-5 takes both stores' carry source from the stored record's chain.
- **Phase 6:** `gatherLinks`' cases stay in `cascade.test.ts`, the container arm's crash windows in `deleteReach.test.ts`, and `trashRecovery.test.ts` whole, each for the reason its GOAL gives.
