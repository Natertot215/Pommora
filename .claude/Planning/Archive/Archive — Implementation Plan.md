## Archive — Implementation Plan

**DATE:** 10-20-2026
**STATUS:** Ratified 10-20-2026
**SOURCE:** *Archive — Decisions & Intention* (ratified 10-19-2026, with the planning rulings of 10-19-2026 and the Last Call rulings of 10-20-2026 recorded in its decisions and *§Copy*), *Archive — Planning Findings* (the five planning scouts reconciled at `879074d7b`, every Planner's Call settled), *Archive — Planning Scout Reports*, *Archive — Investigation* (the brainstorm's state at `213f95a3b`; leads only), and the advisor checkpoints on the sequence and on each phase (10-19-2026 to 10-20-2026).

**BASELINE** (filled after ratification; the end logged in the final report)

| Head | Tests | Start | End |
|------|-------|-------|-----|
| `e9ed7942c` | 8,348 passed, 2 skipped (536 files) | 10-20-2026, 11:33 AM | |

### Context

Pommora keeps a user's content in a folder called the Nexus. Pages are Markdown files inside Collections, which are folders carrying a shared set of properties in a `_pagecollection.json` sidecar, and Sets, which are folders nested inside a Collection with a `_pageset.json`. The app reads the Nexus once into the **tree**, its in-memory picture of everything a user sees, navigates, and searches. When a change touches many files, such as a property's rename, an option's removal, or a page's new title, Pommora rewrites every affected file in one pass, a **cascade**. Folders whose names start with `.` or `_` are hidden from content everywhere: the tree, the content index, and every cascade's sweep skip them (`Core/Paths/exclusion.ts`). Pommora's own `.nexus` folder is watched and synced while nothing inside it is read as content.

Removing a page or a Set today has one path, the Trash. A delete moves the item into a bundle under `.trash/`, a stamped folder holding the file beside a `_record.json` that names where it lived, and strips the Link property values that pointed at it from other pages. While it sits in the Trash no cascade reaches it, so a restore reconciles the returning content as it lands: it re-spells property keys into their current formats, scrubs properties that no longer exist, repairs links, and refills the Link values the delete stripped (`Core/Trash/`). The Trash browser is a `MenuItem` list in Settings (`Core/Settings/TrashFrame.tsx`). An excluded folder inside a trashed Set rides into the bundle and its exclusion entry is recorded and reseated on restore; an excluded folder inside a renamed Set has its entry rewritten only after the folder moves. The decision log and the Findings hold the verified state of the code at `879074d7b`; one commit since (`bf4d6cfe2`) touched MarkdownPM's outliner alone.

### Overview

The Archive gives each Collection a place for pages and Sets that are finished with but not deleted. Archiving moves an item into a hidden store at `.nexus/archive/<Collection ID>/`, as a Trash-style bundle mirroring the item's origin chain, so it leaves the tree and with it navigation, views, search, link suggestions, embeds, and the Matrix; unlike a trashed item it stays inside every cascade, because the store is the one hidden folder the content index and the cascades read ("Reach-In"). A restore is therefore a plain move back to the item's origin, resolved by id, into its exact former place in the folder's order, stepping aside to `Name (2)` past anything the tree or the disk holds there, with nothing to reconcile. Every page and Set menu ends in Archive above Delete; archiving asks under its own setting and always posts an Undo. Each Collection and each top-level Set gains an ArchiveView, reached from an Archive button in the views dropdown's footing and remembered like any place: a table on TableView's look whose checked rows act by right-click or through ActionLabel, the one top-right label that shows a notice when one is posted and otherwise the shown view's actions. An archived page opens in the one read-only reader window the File History window becomes; archived pages' snapshots can be kept for a shorter time than live ones'. A delete from the Archive goes to the Trash with an Undo that returns it to the Archive; a Collection's Archive stays while the Collection is trashed and is emptied with it; an Archive whose Collection exists nowhere is moved into the Trash at open; a Set moved into another Collection carries its archived items with it.

The work is removal-first. Before anything archive-shaped lands, the Trash's handling of excluded folders is replaced by one crash-safe carry and a lift that leaves excluded folders and the asset directory behind in the parent (Phase 1); the Trash's bundle format, record, placement, listing, and rows move into a neutral owner both stores share, and every restore gains its exact place and a disk-asking step-aside (Phase 2); the archive root becomes the one hidden folder read as content while three twin-id rules, two reach helpers, and the by-id record map become one of each (Phase 3); then the three ops, the disposal, the orphan sweep, and the Set-crossing carry complete the data layer, which a neutral reader judges before any surface exists (Phase 4). The interface follows the same order: everything two surfaces will share is folded into one home with the Trash as its proving consumer (Phase 5), the way in opens through the menus and the settings (Phase 6A), and the view, the reader, and the bar land last (Phase 6B). The documents are made true once, at the end (Phase 7). Nothing is checked by hand: an Archive Drive on the project's drive harness proves every claim over the Chrome DevTools Protocol at each review checkpoint.

- **Phase 1 — The Lift and the Carry:** `carrySetAside` writes an excluded entry or the asset directory's setting at its landing before the folder moves and drops the source after; `liftSetAside` moves excluded folders and the asset directory up into the parent when their container is trashed, and the Trash's `excluded` record field, release, and reseat leave (F-2, F-3, K-1; the exclusion-carry issue closes).
- **Phase 2 — The Owner and the Format:** `Core/Bundles/` holds one bundle format for two stores (`BundleStore`, `layoutOf`, `storeOf`), the record, the placement, the rows, and the `bundles:list` channel; `Core/Trash/` narrows to deletion, Trash Mode, parking and refill, and the reconcile; every restore returns to its exact place (`place`, `slotOf`) and steps aside past the disk (`freeOnDisk`), the Trash's report naming the title it took (A-4, B-2, E-2, E-4).
- **Phase 3 — Reach:** `.nexus/archive` is admitted by `outsideContent`, walked by the corpus, listed by configuration reach, and read by one governed reach (`governedReach`) and one by-id projection (`nexusPages`) under one twin rule; counts and value loads stay with the tree, and the Matrix and headings leave archived pages out (B-1, C-1 to C-4, D-1, K-2).
- **Phase 4 — The Archive's Ops:** the `archive` op, `restoreArchived` behind one `restore` routed by store, a delete from the Archive to the Trash with an Undo back (`moveIntoStore`, the `archive` field), F-4's disposal, the open pass (`settleArchives`: F-5's orphans, F-6's re-file), and `refileArchived` with three triggers; `returningNames` and `goneContainers` hoist, `trashed` becomes `bundled`. The first neutral gate reads the data layer here.
- **Phase 5 — Shared Chrome:** one face swap (`Swap`, `DONE_MS`) for the lock glyph, the code block's pill, and Settings' timed labels; `NotificationLabel` becomes ActionLabel with K-3; one Restore and Delete builder and one checked-row rule; one TanStack seam with IconPicker on it; the Trash browser's controller becomes `useBundleBrowser` with one in-place search; the Deletion section's hints read true (G-6, G-7, K-3, K-4, K-5).
- **Phase 6A — Archiving:** `confirmArchive` and "Confirm Before Archiving", the Deletion section becoming "Trash & Archive" with its first archive row; Archive above Delete in every page and Set menu; the archive history timeframe following History Timeframe (I-1 to I-3, J-1).
- **Phase 6B — The Archive's View:** ActionLabel's bar; the reader window over one `Reader` slot; the archive place across navigation with its entry button; ArchiveView (G-1 to G-7, H-1).
- **Phase 7 — Reconciliation:** the feature documents, the project's structure map, IssuesPM (the exclusion-carry entry closed, the exclusion-scope and watcher-race entries recorded), the scripts README, and the planning documents read true.

**The Number:** counted from the AFTER blocks under `view-delta`'s Actionable rule (source lines with imports and blank lines in, as Biome wraps them; comments, tests, documents, and the drive out; moved lines counted on both sides), the phases come to about **+1,638** net (+3,369 / −1,731, about 730 of them moved lines on each side), against the Findings' reconciled ≈ +514 (+993 / −479) and the Investigation's ≈ +580. The estimates priced neither the imports nor Biome's wrapping, both of which the measure counts, nor behavior the decisions require that the design left uncosted (the Archive's batch delete and its Undo, a restore's Undo, a row's stored id and icon, the order writers for four kinds). Phase 1 removes more than it adds: one carry and one lift replace the exclusion bookkeeping, its refusals, the record field, the release, and the reseat. Phases 3 and 5 fold `keyHolderFiles` and `corpusUnder`, `recordById`, three twin rules, two restore menus, three face swaps, and the Trash browser's inline controller into one each, and land positive because each shared home states the interface its single inline consumer never needed. Phases 2 and 4 carry the data layer the Archive requires, built on the Trash's mechanisms given a second store rather than beside them: the owner's parameterization, exact placement and the step-aside both stores gain, the three ops, the disposal, the open pass, and the carry. Phase 6B is the Archive's own surface and the largest additive block, with ArchiveView drawing on TableView's sheet and the browser hook rather than its own. Each phase's measured delta is recorded in the Net Ledger beside its written figure, and growth past it is reported before the next phase opens with what it buys.

**Net Ledger** (the Actionable column of `view-delta --exclude .claude`, each phase measured over its own commits, from the parent of its first commit to its last, its review's fix included, and the cumulative summing the rows; *Estimate* is the pre-plan design's figure, *Written* the count of the phase's AFTER blocks under the same rule):

| Phase | Estimate | Written | Measured | Cumulative |
| ----- | -------- | ------- | -------- | ---------- |
| 1 | −17 | −6 | +11 (+99 / −88) | +11 |
| 2 | +49 | +263 | +268 (+893 / −625) | +279 |
| 3 | +10 | +108 | +143 (+333 / −190) | +422 |
| 4 | +176 | +432 | +485 (+606 / −121) | +907 |
| 5 | −21 | +95 | +125 (+503 / −378) | +1,032 |
| 6A | +57 | +102 | +120 (+190 / −70) | +1,152 |
| 6B | +264 | +644 | +755 (+1,050 / −295) | +1,907 |
| 7 | docs | docs | +3 (+4 / −1) | +1,910 |
| Final Verification | — | — | +183 (+899 / −716) | +2,093 |

#### File Placement

Every file the work adds, moves, renames, splits, or removes, with its home, its reason, and the phase that lands it. Edited files whose role changes are listed where a reader would otherwise look for the new thing in the wrong place.

| File | Change | Home and Why | Phase |
| --- | --- | --- | --- |
| `Core/Bundles/bundle.ts` | New, from `Core/Trash/bundle.ts:11-39`, `holdings.ts:18-96`, `record.ts:110-113`, `spend.ts:58-64` | The bundle format both stores share: `BundleStore`, `layoutOf`, `storeOf`, `fileStamp`, `stampedLeaf`, `chainDir`, `mintBundle`, `bundleArtifact`, `listBundles`, `openBundle`, `originPathOf`, `storedAtOf`, `contentPages`, `pageIdsOf`, `originPagesIn`, `originPagesOf`; `moveIntoStore` joins in Phase 4. One owner beside both stores (A-4). | 2 |
| `Core/Bundles/record.ts` | New, from `Core/Trash/record.ts:11-84`, `:103-108` and `gather.ts:24-29`, `:61-74` | The record union, `RecordFile`, `ArtifactRecord`, `readRecord`, `writeRecord`, `gatherContentRecord` (`gatherParentRef` folded in), `placeOf`; `place` (Phase 2), `trail`, `trailAbove`, and `archive` (Phase 4), `originOf` and `originWithin` (Phase 6B). | 2 |
| `Core/Bundles/placement.ts` | New, from `Core/Trash/resolve.ts` (whole) and `spend.ts:51-56`, `:105-128` | Where any bundle lands: `resolveRecord`, `Refusal`, `NO_DESTINATION`, `placeRecord`, `slotOf`, and the module-private `withDestination`, `REFUSAL_TEXT`, and `freeOnDisk`. | 2 |
| `Core/Bundles/rows.ts` | New, from `Core/Trash/trashRows.ts` (whole) and `trashRow.ts:5-28` | `BundleRow`, `BundleCrumb`, the row builders, `liveCrumbs`, `frozenCrumbs`, `homeResolvesFor`; host code with no React, so the bridge's type import stays engine-safe. The Set-origin narrowing and `icon?` join in Phase 6B. | 2 |
| `Core/Bundles/handlers.ts` | New, from `Core/Trash/handlers.ts:12-14` | `bundles:list(store, within?)`, beside the format it lists; `within` from Task 6B-4. | 2, 6B |
| `Core/Bundles/browser.ts` | New, from `TrashFrame.tsx:36-56`, `:64-199`, `:254-263` | Renderer-only: `useBundleBrowser` (its date column inside), `rulesOf`, `countPhrase`, `crumbSegments`, the in-place narrowing; one home for what both browsers present, never imported host-side. | 5 |
| `Core/Trash/trashMode.ts` | New (Task 2-2), from `trashRow.ts:30-33` | `TrashMode`, `DEFAULT_TRASH_MODE`: the leaf the renderer's `confirmations.ts` and Desktop's `appConfig.ts` value-import, kept free of host modules. | 2 |
| `Core/Trash/discard.ts` | New (Task 2-2), from `Core/Trash/bundle.ts:41-80` | `TrashDeps`, `trashDeps`, `trashFileFlat`, `discardFile`: where a deletion goes, the Trash's alone. | 2 |
| `Core/Trash/bundle.ts`, `record.ts`, `resolve.ts`, `trashRow.ts`, `trashRows.ts` | Removed | Moved into the owner, `trashMode.ts`, and `discard.ts`; `writePropertyBundle` to `Core/Properties/deleteProperty.ts` (its one caller), `appendLinks` to `holdings.ts` beside `parkLinks`. | 2 |
| `Core/Trash/gather.ts`, `holdings.ts`, `spend.ts`, `delete.ts`, `handlers.ts` | Narrowed | The Trash's own model: Space and Context records and link targets; parking and refill; emptying, the reconcile, the kind tails, `reapply`; the delete with its two sources (Phase 4); `delete:facts`. | 1, 2, 4 |
| `Core/Archive/archive.ts` | New | `archiveOp`, `restoreArchived`, and `collectionArchive` (F-4's one read of a Collection's Archive): the Archive's own ops (A-4). | 4 |
| `Core/Archive/refile.ts` | New (4-5; `settleArchives` in 4-6) | `refileArchived` (F-6's carry and trail rewrite), `refileMoved` (the settle's comparison trigger), `refileLanded` (either restore's landing trigger), and `settleArchives` (the open pass: F-5's orphans and F-6's re-file). | 4 |
| `Core/Archive/ArchiveView.tsx`, `archive-view.css` | New | The table place (G-1 to G-3), its rows, search, count, bar declaration, and opener; the title-over-trail stack, the virtual list's positioning, the trailing label. | 6B |
| `Core/Archive/archivePlace.ts` | New | `ARCHIVE_ICON` and `archiveOwnerOf`, on `Core/Matrix/matrixKind.ts`'s precedent for a place that isn't a node. | 6B |
| `Core/Paths/nexusPaths.ts` | Edited | The resolver block (`ARCHIVE_DIR_REL`, `archiveDirRel`, `archiveSegs`, and `archivedCollectionIdOf` over it, the last `storeOf`'s first consumer) beside every other `.nexus` location, and `isArchived` (Phase 3) over it; `NON_CORPUS_TOP` leaves (K-5). | 2, 3 |
| `Core/Nexus/order.ts` | Edited | Gains `spliceBeside` and `Slot` from `Core/Views/creationOrder.ts:10-28`: the one home for reading and splicing an id list, reachable by the host. | 2 |
| `Core/Nexus/reorder.ts` | Edited | Gains `dropDeparture`, the one kind-to-order-key drop a departure makes, for the delete, both moves, and the archive op. | 2 |
| `Core/Nexus/settle.ts` | Edited | Gains `returningNames` beside `relink`, and the F-6 observer at the tree comparison. | 4 |
| `Core/Nexus/treePatch.ts` | Edited | Gains `findContainerById` and `containerTrailById` (Phase 2), `owningCollection`'s archive arm and `archiveReach` (Phase 3), and `isTopSet` (Phase 6B); host-safe, unlike `treeIndex.ts`. | 2, 3, 6B |
| `Core/Nexus/heldPages.ts` | Edited | Gains `nexusPages`, the by-id projection beside the held tree's lookups, over the memoized `entitiesById` that `writablePathsOf` reads too, with the twin predicate `addressable` and `shownTitle`; `recordById` leaves `record.ts`. | 3 |
| `Core/Nexus/folderEntity.ts` | Edited | Gains `liftSetAside`; `relocateFolder` runs the carry and returns a `Result`. | 1 |
| `Core/Settings/settings.ts` | Edited | `carrySetAside` replaces `followExcludedFolders`, `editExcluded`, `exclusionWriteRefusal`, `excludedWithin`, `releaseExcludedFolders`, `reseatExcludedFolders` (nine exclusion functions become four). | 1 |
| `Core/Properties/governedSweep.ts` | Edited | Gains `governedReach`, which replaces `keyHolders.ts`' `keyHolderFiles` (and `indexSeed.ts`'s `corpusUnder`), and `collectionFolders` from `assignment.ts:152-156`, beside the sweep they feed. | 3 |
| `Core/Files/walk.ts` | Edited | Gains `sidecarsUnder` from `assetMigrate.ts:158-165`; `corpusFiles` walks two roots. | 3 |
| `Core/Actions/restoreMenu.ts` (+ `restoreMenu.test.ts`) | New, replacing `trashMenu.ts` and `fileHistoryMenu.ts` (both removed, tests merged) | One Restore and Delete builder (K-4). | 5 |
| `Core/Interface/Notifications/ActionLabel.tsx`, `action-label.css.ts`, `ActionLabel.test.tsx` | Renamed from `NotificationLabel.tsx`, `notification-label.css.ts`, `NotificationLabel.test.tsx` | The frame's one top-right label (G-7); `App.tsx` follows; `notifications.ts` keeps its name and gains the bar's channel in Phase 6B; the folder keeps its name for its 38 importers. | 5, 6B |
| `Core/Interface/Windows/PageReaderWindow.tsx` | Renamed from `PageHistoryWindow.tsx` | The one read-only reader (H-1); `App.tsx` follows. | 6B |
| `UIX/Animations/Swap.tsx`, `swap.css.ts` | New; the CSS from `UIX/Symbols/symbols.css.ts:5-11` | The one face swap, a motion primitive beside `Reveal`, used by Symbols, Settings, the label, and the code block. | 5 |
| `UIX/Animations/useTimedLabel.tsx` | Moved from `Core/Settings/useTimedLabel.ts` | The acknowledgement hold over `DONE_MS`, beside the swap it returns. | 5 |
| `UIX/Interactions/virtualRows.ts` | New | The one seam over `@tanstack/react-virtual`, under the Dependencies rule; IconPicker adopts it. | 5 |
| `.claude/scripts/Archive Drive/live-drive.mjs`, `MATRIX.md` | New | The zero-hand-check drive on `drive-harness.mjs`, one group per phase, gated by `POMMORA_ARCHIVE_LANDED`. | 1 (groups follow) |

#### Concepts

**ADDED**

| Concept | Description | Location |
| ------- | ----------- | -------- |
| `Core/Bundles` • Folder | The neutral owner of the bundle format both stores share; imports neither `Core/Trash` nor `Core/Archive`. | N/A |
| `Core/Archive` • Folder | The Archive's own ops, its open pass and carry, its place, and its view. | N/A |
| `BundleStore` • type | `{ kind: 'trash' } \| { kind: 'archive'; id: string }`: which store a bundle belongs to, resolved by switch. | `Core/Bundles/bundle.ts` |
| `layoutOf` • function | A store's root directory and bundle suffix (`.trash`/`.deleted`; `archiveDirRel(id)`/`.archived`). | `Core/Bundles/bundle.ts` |
| `storeOf` • function | The store a bundle path belongs to, or null for a path neither store holds. | `Core/Bundles/bundle.ts` |
| `originPathOf` • function | A bundled file's origin path from its location in either store (`deletedPathOf` generalized; finds the bundle segment by suffix). | `Core/Bundles/bundle.ts` |
| `storedAtOf` • function | The time a bundle was stored, read from its stamp (`deletedAtOf` renamed). | `Core/Bundles/bundle.ts` |
| `originPagesIn`, `originPagesOf` • functions | A store's pages at the paths they left; one bundle's pages with their ids (`trashedPages`, `trashedPagesOf` generalized). | `Core/Bundles/bundle.ts` |
| `moveIntoStore` • function | Moves a bundle from one store to another: mints (with an optional kept leaf), writes the record ahead, relocates the artifact, removes the source. | `Core/Bundles/bundle.ts` |
| `place` • record field, `Place`, `placeOf` • type, function | `{ above?, below? }`: the ids of an item's next and previous siblings in its origin's order when it left, read from the tree as it leaves. | `Core/Bundles/record.ts` |
| `trail` • record field, `trailAbove` • function | The ids of the containers above an item's parent, Collection first, and their one derivation from the tree. | `Core/Bundles/record.ts` |
| `originOf`, `originWithin`, `collectionOf` • functions | A record's origin trail, read from the tree while it holds the origin and from the stored `trail` once it doesn't; whether that origin lies within a Set (Findings 3.4); the Collection an origin sits in (`trail[0] ?? parent`). | `Core/Bundles/record.ts` |
| `archivedWithin` • function | The bundles in a Collection's Archive archived from within one Set, by ids, each listed whole with its origin and held trail; `bundles:list`'s `within` and a Set's move read it. | `Core/Bundles/bundle.ts` |
| `fileInto` • function | The one bundling sequence: mint, write the record, move the item in, and remove the bundle when the move throws; `archiveOp`, `moveIntoStore`, and the Undo into an Archive call it. | `Core/Bundles/bundle.ts` |
| `patchRecord`, `readRawRecord` • functions | A record edited in place, and its raw read, so the record's filename lives in one file. | `Core/Bundles/record.ts` |
| `icon` • record field | A container's or Space's icon, gathered once through `sidecarIdentity`, so a listing reads records alone. | `Core/Bundles/record.ts`, `Core/Files/sidecar.ts` |
| `collectionsElsewhere`, `archiveOwned` • functions | The Collection ids a Nexus holds outside its tree (every root folder's sidecar the tree doesn't hold, and the Collections in the Trash); whether an Archive still has an owner — live, unreadable, or elsewhere — for the open pass and an Undo into an Archive. | `Core/Bundles/bundle.ts` |
| `DateHeading` • component | The measured date heading both browsers render: label, hidden sample, and the style menu's right-click. | `Core/Bundles/DateHeading.tsx` |
| `archive` • record field | On a Trash record alone: the Archive bundle a delete from the Archive took the item out of. | `Core/Bundles/record.ts` |
| `placeRecord` • function | The restore's one placement step for either store: destination, resolution with the siblings and writer of the order it lands in, the composed order, and the disk-asking name, answering the placement, the `writeOrder` step that lands it, `landedAs`, and `into` for an Undo back into the Archive. | `Core/Bundles/placement.ts` |
| `slotOf` • function | Where a returning id re-enters an order from its recorded neighbours: above, below, first, or last. | `Core/Bundles/placement.ts` |
| `freeOnDisk` • function (module-private) | The one landing-name rule for a restore, asking the tree and the disk for the item's own form, stepping aside to `Name (2)`; I-073's seam. | `Core/Bundles/placement.ts` |
| `BundleRow`, `BundleCrumb` • types | A bundle as either browser reads it (`TrashRow`, `TrashCrumb` renamed), with `storedAt`, and for a page or Set row an optional `icon` and `stored` (its id and archive path). | `Core/Bundles/rows.ts` |
| `bundleRows`, `bundleRowOf` • functions | The rows of a store's bundles (`trashRows`, `trashRowOf` generalized), an archive store narrowed by a Set's origin. | `Core/Bundles/rows.ts` |
| `bundles:list` • channel | Lists a store's rows, narrowed to a top-level Set's origin by `within` (`trash:list` replaced). | `Core/Contract/bridge.ts`, `Core/Bundles/handlers.ts` |
| `useBundleBrowser` • hook; `rulesOf`, `crumbSegments` • functions | The browser controller both browsers run on, answering the rows, the checks, the menu, and the date column; the one switch on the store naming what differs between the Trash and the Archive; a row's trail as segments, frozen or live. | `Core/Bundles/browser.ts` |
| `historical` • style | A frozen trail's look, shared by both browsers. | `UIX/Elements/nav-trail.css.ts` |
| `storesChanged`, `changesStores` • emitter, predicate | The one change signal for either store, emitted for the ops that change a store or the crumbs its rows draw, and by a browser's batch (`trashChanged` replaced). | `Core/Session/nexusSlice.ts`, `Core/Nexus/mutateRequest.ts` |
| `bundled`, `landedAs` • outcome fields | The bundle any removal minted (`trashed` renamed); the title a restore took when it stepped aside. | `Core/Nexus/mutateRequest.ts` |
| `archive` • mutate op | Moves a page or Set into its Collection's Archive, under a bundle name it's handed when the item could have been minted under it, as a restore's Undo hands it to keep the Archived date. | `Core/Nexus/mutateRequest.ts`, `Core/Archive/archive.ts` |
| `archiveOp`, `restoreArchived`, `collectionArchive` • functions | The Archive's two ops; a Collection's Archive read once for F-4's disposal (its pages and its archived Sets' ids). | `Core/Archive/archive.ts` |
| `archivedSetIds` • function | The ids of the Sets a bundle holds, read from their sidecars, for the gone edit a Set's departure runs. | `Core/Nexus/configReach.ts` |
| `ArchiveStore`, `archiveStoreOf` • type, function | The archive store's one declaration, and the one rule admitting a Collection id as an Archive store (null unless it can name a folder). | `Core/Paths/nexusPaths.ts`, `Core/Paths/names.ts` |
| `refileArchived`, `refileMoved`, `refileLanded`, `settleArchives` • functions | F-6's carry and trail rewrite; its triggers at the settle's comparison of trees and at either restore's landing; the open pass (F-5's orphans, F-6's re-file). | `Core/Archive/refile.ts` |
| `dropDeparture` • function | The one drop of a departing id from its order, by kind: a page's or Set's sidecar order, a Collection's or Space's `state.json` order. | `Core/Nexus/reorder.ts` |
| `dropContextOrder` • function | A Context gone for good takes its panel id and its Space order from `state.json` (`dropSpaceOrder` renamed). | `Core/Nexus/reorder.ts` |
| `findContainerById`, `containerTrailById` • functions | A container by id, and its trail, beside `findContainerWhere` and `containerTrailWhere`: one spelling for every by-id read. | `Core/Nexus/treePatch.ts` |
| `returningNames`, `returningCascade` • functions | The restore's two-map relink, hoisted for both restores; the arrival both restores enter, repairing the landed files (the Trash by its recorded targets, the Archive by the returning pages' own keys) before the live world's sweep. | `Core/Nexus/settle.ts` |
| `withUnswept` • function | The repair's write failures carried on the arrival's cascade, for both restores. | `Core/Nexus/cascade.ts` |
| `linkWorld` • function | The frozen world every strip and refill reads, the tree's pages and the Archive's, built once. | `Core/Nexus/heldPages.ts` |
| `indexReady` • function | The content index's readiness, one gate for every query that must not read half-filled tables. | `Core/Index/contentIndex.ts` |
| `outsideArchive` • function | C-4's one home: the files a confirmation's count and the push's page list name. | `Core/Properties/governedSweep.ts` |
| `removeOwn` • function | A removal recorded as the app's own, beside `relocate`. | `Core/Files/atomicWrite.ts` |
| `setFace` • function | Swap's face rule, set once for the component and the code block's pill. | `UIX/Animations/Swap.tsx` |
| `goneContainers` • function | The configuration edit for containers that left, from their ids. | `Core/Nexus/configReach.ts` |
| `ARCHIVE_DIR_REL`, `archiveDirRel`, `archiveSegs`, `archivedCollectionIdOf`, `isArchived` • constants, functions | The Archive's location behind one resolver, and the one predicate for a path inside it. | `Core/Paths/nexusPaths.ts` |
| `governedReach`, `collectionFolders` • functions | The one governed reach over every Collection and the Archive, or one Collection and its Archive; every Collection folder the tree it's handed holds, damaged ones included (moved from `assignment.ts`). | `Core/Properties/governedSweep.ts` |
| `nexusPages` • function, `NexusPages` • type | The by-id projection over the tree and the Archive (`byId`, null on a twin; `archived` pages at their origin paths). | `Core/Nexus/heldPages.ts` |
| `entitiesById` • memo (module-private) | The tree's entities by id under the one twin rule, memoized on the tree; `writablePathsOf` and `nexusPages` read it. | `Core/Nexus/heldPages.ts` |
| `addressable`, `shownTitle` • functions | Whether `byId` addresses the one file carrying an id, the one twin predicate every strip and refill reads; the title the window shows for an id, the first-listed page's for a twin. | `Core/Nexus/heldPages.ts` |
| `archiveReach` • function | The Archive a reach covers: the whole store, or the owning Collection's. | `Core/Nexus/treePatch.ts` |
| `archivedSets` • function (module-private) | The archived Set sidecars a configuration edit reaches, in `archiveReach`'s Archive. | `Core/Nexus/configReach.ts` |
| `sidecarsUnder` • function | Container sidecars under both content roots or one folder (hoisted from the asset migration). | `Core/Files/walk.ts` |
| `carrySetAside` • function | Writes an excluded entry's or the asset directory's landing before its folder moves and drops the source after. | `Core/Settings/settings.ts` |
| `liftSetAside` • function | Moves excluded folders and the asset directory out of a container being archived or trashed, into its parent. | `Core/Nexus/folderEntity.ts` |
| `isTopContainer`, `topContainerOf`, `namesContainer` • functions | A Collection or a Set directly inside its Collection, the depth that offers views and an Archive place; the one such container a selection or place belongs to; a target that is a container or the archive place. | `Core/Nexus/treePatch.ts`, `Core/Nexus/entities.ts` |
| `Core/Trash/trashMode.ts`, `discard.ts` • files | The Trash Mode leaf; where a deletion goes. | `Core/Trash/` |
| `LISTED` • constant | The one SQLite list binding, moved to the driver both stores import. | `Desktop/Store/driver.ts` |
| `restoreMenuItems` • function | The one Restore and Delete builder for the Trash, File History, and the Archive. | `Core/Actions/restoreMenu.ts` |
| `checkedIn`, `actedOn` • functions | The checked rows still in view; the rows a right-click acts on. | `UIX/Utilities/checkSet.ts` |
| `useVirtualRows` • hook | The one seam over `@tanstack/react-virtual`. | `UIX/Interactions/virtualRows.ts` |
| `Swap` • component, `DONE_MS` • constant | The one face swap; the hold an acknowledgement keeps its done face (1500 ms). | `UIX/Animations/Swap.tsx`, `swap.css.ts`, `motion.ts` |
| `ActionLabel` • component | The frame's one top-right label: a notice, else the shown view's bar (`NotificationLabel` renamed). | `Core/Interface/Notifications/ActionLabel.tsx` |
| `notifyOutcome` • function | One notice for what an action did: its head, an optional segment, and the lines that didn't go as asked. | `Core/Interface/Notifications/notifications.ts` |
| `ActionBar`, `useDeclareActions`, `useActionBar` • type, hooks | What a shown view declares for the bar, the hook that declares it while shown, and the label's reader. | `Core/Interface/Notifications/notifications.ts` |
| `confirmArchive` • function | Asks under Confirm Before Archiving, archives, and posts the Undo notice. | `Core/Interface/Confirm/confirmations.ts` |
| `spendUndo`, `offerUndo` • functions | Spends any armed Undo by its key (`spendBundle` renamed); offers the one restore-and-spend Undo a delete, an archive, or a batch arms. | `Core/Interface/Confirm/confirmations.ts` |
| `askTrashing` • function | The delete's question, asked for one item or a batch. | `Core/Interface/Confirm/confirmations.ts` |
| `confirmArchiving`, `archiveHistoryDays`, `archiveColumnStyle` • settings | Confirm Before Archiving; Archive History Timeframe; the Archived column's style. | `Core/Settings/personalization.ts` |
| `boundOf` • function | The setting a bounded setting follows until picked; `settingOf` answers an unset bounded key with its bound. | `Core/Settings/personalization.ts` |
| `ARCHIVE_ROW`, `REMOVAL_ROWS`, `'title:archive'` • rows, action | Archive above Delete in every page and Set menu. | `Core/Actions/pageMenu.ts` |
| `{ kind: 'archive'; id }` • place kind | ArchiveView's place in navigation. | `Core/Navigation/navRef.ts` |
| `ARCHIVE_ICON`, `ARCHIVE_TITLE` • constants | The archive glyph and title, on `matrixKind.ts`'s precedent. | `Core/Archive/archivePlace.ts` |
| `ArchiveView` • component | The table of a Collection's or top-level Set's archived items. | `Core/Archive/ArchiveView.tsx`, `archive-view.css` |
| `Reader`, `openReader`, `closeReader` • type, actions | The one read-only reader slot (`historyTarget`, `openHistory`, `closeHistory` replaced). | `Core/Session/windowSlice.ts` |
| `PageReaderWindow` • component | The one read-only reader (`PageHistoryWindow` renamed), with History and Archive branches. | `Core/Interface/Windows/PageReaderWindow.tsx` |
| Archive Drive • script | Groups 1 to 6B over CDP. | `.claude/scripts/Archive Drive/` |
| The exclusion-scope entry • IssuesPM entry | Every exclusion write re-reads the Nexus; scope changes could land incrementally. | `.claude/IssuesPM.md` |

**REMOVED**

| Concept | Description | Location |
| ------- | ----------- | -------- |
| `excludedWithin`, `editExcluded`, `followExcludedFolders`, `exclusionWriteRefusal`, `releaseExcludedFolders`, `reseatExcludedFolders` • functions | The follow-after carry, its refusal, and the Trash's release and reseat. | `Core/Settings/settings.ts` |
| `excluded` • record field | The excluded entries a trashed container carried. | `Core/Trash/record.ts` |
| `NON_CORPUS_TOP` • constant | Inlined into its one reader. | `Core/Paths/nexusPaths.ts` |
| `settingWithin`, `isTopSet`, `ownsArchivePlace`, `archiveOwnerOf`, `findContainerWhere` • functions | Each folded onto one rule in the final review: `settingOf`'s bound, `isTopContainer`, `topContainerOf`, `containerAt`. | `Core/Settings/personalization.ts`, `Core/Nexus/treePatch.ts`, `Core/Archive/archivePlace.ts` |
| `restoreArtifact` • function | Renamed `restoreTrashed`, beside `restoreArchived`. | `Core/Trash/spend.ts` |
| `Core/Trash/bundle.ts`, `record.ts`, `resolve.ts`, `trashRow.ts`, `trashRows.ts` • files | Moved into the owner, `trashMode.ts`, and `discard.ts`. | `Core/Trash/` |
| `trashChainDir`, `deletedPathOf`, `deletedAtOf`, `trashedPages`, `trashedPagesOf`, `trashRows`, `trashRowOf` • functions | Generalized under the owner's names. | `Core/Trash/` |
| `TrashRow`, `TrashCrumb`, `deletedAt` • types, field | Renamed `BundleRow`, `BundleCrumb`, `storedAt`. | `Core/Trash/trashRow.ts` |
| `trash:list` • channel | Replaced by `bundles:list(store)`. | `Core/Contract/bridge.ts` |
| `trashChanged` • emitter | Replaced by `storesChanged`. | `Core/Session/nexusSlice.ts` |
| `trashed` • outcome field | Renamed `bundled`. | `Core/Nexus/mutateRequest.ts` |
| `keyHolderFiles`, `corpusUnder`, `folderCorpus` • functions | Folded into `governedReach`; inlined into `moveIndexPaths`. | `Core/Properties/keyHolders.ts`, `Core/Index/indexSeed.ts` |
| `recordById` • function | Replaced by `nexusPages`'s `byId`. | `Core/Nexus/record.ts` |
| `containersOf` • function | Its live listing inlined into `reachConfig`, its archived arm `archivedSets`. | `Core/Nexus/configReach.ts` |
| `restoreOp` • function | A forwarder once `mutate.ts` resolves the bundle and routes the restore by store. | `Core/Trash/spend.ts` |
| `gatherParentRef` • function | Folded into `gatherContentRecord`, which reads the tree it is handed. | `Core/Trash/gather.ts` |
| `keyedHolders`'s `seen`, `deleteCascade`'s tree filter and twin branch | One twin rule through the map; one governed reach. | `Core/Properties/keyHolders.ts`, `Core/Nexus/cascade.ts` |
| The landing and `exists` refusals • code | Replaced by `freeOnDisk`'s step-aside. | `Core/Trash/spend.ts` |
| `Core/Actions/trashMenu.ts`, `fileHistoryMenu.ts` • files | Replaced by `restoreMenu.ts`. | `Core/Actions/` |
| `restoreAll`, `deleteAll` • menu actions | Folded into `restore`/`delete` with batch labels. | `Core/Actions/trashMenu.ts` |
| `rankMatches` in the Trash's search • call | One in-place rule. | `Core/Settings/TrashFrame.tsx` |
| `glyphSwap`, `glyphSwapFace` • styles | Moved to `UIX/Animations/swap.css.ts`. | `UIX/Symbols/symbols.css.ts` |
| `COPIED_MS`, `ACTIVE_MS` • constants | One `DONE_MS`. | `Core/MarkdownPM/decorations.ts`, `Core/Settings/useTimedLabel.ts` |
| `Core/Settings/useTimedLabel.ts` • file | Moved to `UIX/Animations/useTimedLabel.tsx`. | `Core/Settings/` |
| The tally pill's overlay • styles | The swap classes serve it. | `Core/MarkdownPM/markdown-pm.css` |
| `NotificationLabel` • component, files | Renamed ActionLabel. | `Core/Interface/Notifications/` |
| `spendBundle` • function | Renamed `spendUndo`. | `Core/Interface/Confirm/confirmations.ts` |
| `'delete'` • entity menu action | `'title:delete'` and `DELETE_ROW` serve containers and Spaces. | `Core/Actions/entityMenu.ts` |
| The `// PLACEHOLDER` More button • element | The Archive button takes the footing. | `Core/Views/Settings/ViewFrame.tsx` |
| `PageHistoryWindow`, `historyTarget`, `openHistory`, `closeHistory` • component, slot, actions | The reader and its slot replace them. | `Core/Interface/Windows/`, `Core/Session/windowSlice.ts` |
| The exclusion-carry entry (I-007 before Phase 7's renumbering) • IssuesPM entry | Closed by the lift. | `.claude/IssuesPM.md` |

#### Constraints

This section is copied verbatim into every planning document for this work.

##### Who Carries These

- Nathan's approach, principles, and constraints below are the core philosophy of the planning session and of every agent sent in planning and execution: scouts, executors, and reviewers each carry all three sections in full, word for word, in their briefs.
- The neutral verifier alone receives none of them. It's given only the baseline commit, HEAD, and a plain statement of what the work intended, and its unprimed read is the input against which the work's adherence to them is judged.

##### Approach

Nathan's, verbatim, with one word corrected: *Look Outward* named Sapphire, carried over from an earlier brief, where this codebase is Pommora.

- **Removal First:** any approach first assesses what's true *now* that could be removed, deleted, changed, consolidated, or replaced. The design isn't based on what's currently there with its course adjusted; it ensures totality-first application, removal-first scoping, and residue-eliminating frameworks that provide a clean slate rather than building changes on top of what's ultimately going to be replaced.
- **Consolidation First:** the codebase ends up more understandable, less complex, more efficient in what it does, less conflicting in defining that, and an overall cleaner foundation to work within.
- **Less Stuff:** nothing new is added unless there's evidence it's required. The work ends with cumulatively less in the codebase overall — fewer ways to do similar things, less complexity, fewer paths to go through, less tech debt waiting to surface, fewer things to maintain, and fewer headaches in future work — while the line count *may* end up positive. Net-negative lines are the north star, and any net-positive gain has its rationale genuinely backed by this framework and the principles below.
- **Always Intentional:** anything within the surface area reads as always-intentional, without odd-ones-out designs, and reflects the broader codebase's resulting shape rather than remnants of, or adherence to, what's true now and is ultimately going to change. The approach reflects the outcome and isn't bound by constraints that were only relevant before.
- **Look Outward:** look for cross-file opportunities and shared design, avoiding hand-rolling or duplicating what's already there or can be adjusted to fit. Pommora is an established codebase, and this work doesn't start from scratch.
- **The Data Layer:** the complex data-level mechanics least reflect Nathan's intentions and mostly reflect what past session agents judged appropriate. Treat them with care and respect, without assuming they're beyond reasonable change; presenting an approach to Nathan may be all it takes to change the codebase for the betterment of everything in it and of future iterations.

##### Principles

Nathan's, verbatim.

- **Less to Carry:** No more functions, helpers, wrappers, types, layers, and call sites than necessary, and no logic stated twice. New code earns its place by removing more than it adds, fixing incorrect behavior, or delivering required behavior in its minimal form.
- **Less to Understand:** A reader finds what exists, where it lives, what owns it, and what calls it with less searching and tracing than before, whether a developer reading code or Nathan reading file names and headers. A blind-eye review of the surface areas impacted by this implementation should find less confusion, less conflict about intent, and an unambiguously more approachable, maintainable ecosystem to iterate on.
- **Clearer Boundaries:** Each responsibility has one owner, and the next change of a kind has one obvious place to go, with no choice between layers, helpers, or modules — nothing that exists somewhere where it shouldn't; nothing implemented where something else already does it or adjusting it accordingly would be the more appropriate approach; nothing that increases the risk of misassumption when working here in the future.
- **Reads as Designed:** Nothing temporary, transitional, kept for compatibility, unreachable, needlessly indirect, or left over from the work remains. Nothing designed around codebase shapes that will ultimately be changed for the better.
- **One Way:** Each thing has one implementation, one pattern, and one source of truth. No part contradicts another. Exceptions carry their reason where a reader meets them, in code or feature documentation.
- **Real Purpose:** Anything added to the codebase should have its purpose clearly stated with the perspective of its value enhancing what's already there — complexity, duplications, divergences, multiple ways to do the same thing — and anything "new" added should be assessed using that. Line-count increases shouldn't translate into maintenance cost or complexity.
- Anything introduced should have independent justification behind its existence that isn't simply self-induced requirements.
- Anything changed or implemented should be reflected across the board — nothing that's done this way here, while something else works differently elsewhere, unless that's *genuinely* correct.
- Zero data-level spaghetti, complexity, or additional 'stuff' should be added without reason. Rewiring things to become more understandable, more efficient, more appropriate, and more effective is preferred when the alternative is just adding more to something that's inherently unfit to suit the long-term mandate of what's actually being offered.

##### Nathan's Constraints

Nathan's, verbatim.

- Because of how much trash and archive would share UIX and interaction between them, we *must* approach this through removal-and-unification perspectives *first* so that we're consolidating what's now shared and can be appropriately DRY-hoisted within shared components rather than existing as duplicates. The shared UIX within both views is an obvious example of this.
- Nathan's approach and principles govern every phase and task, and every agent brief on this topic — scouts, executors, and reviewers — carries both sections in full.

##### Working Rules

- **Re-Verify, Then Reuse:** *Archive — Investigation* and *Archive — Scout Findings* are leads verified at `213f95a3b`. A planning session re-verifies every claim it leans on against its own HEAD, and on the data layer and the Trash it rides the mechanism that already does the job before designing anything new.
- **Intent Over Wording:** the decisions record intent. INFERRED and ASSUMED entries are readings the plan confirms against the code or puts to Nathan before building on them.
- **Cost:** nothing the Archive adds runs on a high-frequency trigger. Archived files cost a read only when a cascade's candidates name them, and the orphan check and the history sweep run once at open.
- **Take Along:** any trivial fixes to existing things, folds of existing duplication and divergence, or cleanup that would otherwise be risk-free, obvious, or stupid to ignore now are taken alongside this work.
- **Gates:** `npm run typecheck`, `npm run test`, and `npm run lint` from the repo root; `.claude/Guidelines/Development-Environment.md` before driving the app; `~/Test` for live testing.
- **Process:** planning runs on `~/NexusOS/Studio/Athena/II. Drafts/Plan-Creation.md`. Its blank sections take the installed `writing-plans` skill's guidance, and the processes it names without spelling out, such as Neutral Verification, take the shape of `.claude/Planning/Completed/MetadataV3/MetadataV3 — Implementation Plan.md` and `.claude/Planning/Path Links/Path Links — Plan.md`; the draft wins where they conflict.
- **Models and Reviews (Nathan, 10-19-2026):** execution agents run `opus-medium`; there are no hand-checks, so every visual surface is driven over CDP. The plan's phases are designed one at a time with an advisor checkpoint before each is written. The drafted plan is read in two waves, one at a time: each wave is two `opus-xhigh` reviewers carrying the `closeout-review` perspectives (correctness, simplification, cohesiveness, consequences) with the Approach, Principles, and Constraints, each reading the whole plan for sequencing, for consolidation that a later phase makes possible, and for anything a task adds that an adjacent task makes unnecessary or confusing; the first wave's findings are folded in before the second wave reads. Removal and consolidation precede anything additive, and changes to what exists precede new surface unless the new surface is foundational. One `opus-xhigh` neutral reader then takes the plan alone, with none of these sections, and says what it would change. The finished plan comes back to Nathan as a phase-by-phase account of what gets built, removed, changed, and consolidated, with every last call that's his listed for ruling before ratification.
- **Handoffs:** every handoff on this work repeats the Approach, Principles, and Nathan's Constraints verbatim.

##### Plan Constraints

- **Gates:** `npm run typecheck`, `npm run test`, and `npm run lint`, from the repo root; each prints its own failures, and lint runs clean (`biome lint` exits 0 with warnings, so its `Found N warnings` line is read). Biome formats every TS/CSS/JSON write, so an edit failing on whitespace means it reformatted: re-read and retry. "Run the gates" in a task means these three. A VERIFY grep runs under default `git grep`, whose basic regex alternates with `\|` and matches `\b`; this toolchain's `git grep -E` matches nothing at a `\b`, and under `-P` alternation is a bare `|`. A clean state for the gates is a `git status` showing nothing outside `.claude/`. `Core/Contract/engineGraph.test.ts` and `Desktop/hostGraph.test.ts` are part of the test gate and fail the moment host-run code reaches React or a `.tsx`.
- **The Drive:** every visual or interactive claim is proven by the Archive Drive (`.claude/scripts/Archive Drive/live-drive.mjs`, on `.claude/scripts/drive-harness.mjs`, which builds the app, backs up `~/Test`, launches on its own debug port and userData, records native menus, and restores `~/Test`), groups 1 to 6B following the phases, `POMMORA_ARCHIVE_LANDED` gating an item owned by a later phase as `AWAIT`. Each phase's last task adds its group; every Review Checkpoint runs every landed group from the checkout (nothing else runs against the tree). A drive check is a DOM, channel-reply, or disk assertion; `shot` is evidence beside it, never the check. `.claude/Guidelines/Development-Environment.md` is read before anything drives the app. Nothing is left to Nathan's hand.
- **Frozen:** `Core/Sync/` and the Sync hub (the Archive syncs through the existing `.nexus` admission, unchanged); Project Sapphire; MarkdownPM beyond the code block's tally pill, its one hold (`DONE_MS`, which the glyph slot and the bare name share with the pill, ruling 17), and the one CSS comment; the Trash's model (reconcile-on-restore: `restoreScrub.ts`, `restoreProperty.ts`, the refill, the repair) and its look (the `MenuItem` list, head, search row, and empty states in `TrashFrame.tsx`), its rows drawing each item's own icon as ArchiveView's do; Path Links' link machinery (`respell`, `respellings`, `relink`, `renameCascade`'s link arms), which Phase 4 hoists into `returningNames` without changing a rule; `mutableTarget` and its nineteen call sites; the hidden-folder rule for everything but the Archive's own folder; Trash Mode and `delete:facts`.
- **Conventions:** "Cautionary N" and "ruling N" cite *Archive — Planning Findings*' *§Cautionary Items* and *§Nathan's Rulings*, and each task states the substance it leans on; a cited line is HEAD's, and where an earlier task moved it, the test's or function's title is the anchor; production comments carry no planning ids; finite states are unions plus exhaustive switches; `Core/Contract` is the one bridge, a channel is one `bridge.ts` entry and both sides derive; host-run code imports no React and no `.tsx`, and the engine graph follows `import type`, so every type the host reaches lives in a React-free file (`BundleRow`, `BundleStore`, `Reader` excepted as renderer-only); no O(N), allocating, or layout-reading work lands on a high-frequency trigger (the Archive costs a read only when a cascade's candidates name its files; the open pass and the history sweep run once at open; a browser re-lists only while shown); `UIX` reaches nothing outside itself (which is why TableView's shell is not hoisted there); user-facing copy is the decision log's *§Copy* verbatim (curly quotes around titles, a setting named inside another's hint in single quotes, Title Case counts everywhere, the Trash's reports included); a test whose body inverts takes a title stating the behavior it now asserts, and no production code exists as a test fixture; an AFTER block adds a comment only where the code would otherwise be misread; commit messages are past tense, one to four sentences, and carry no personal names (the `no-name-mentions` hook refuses them); nothing temporary, transitional, or compatibility-kept remains at a phase's end.
- **Sequencing:** removal and consolidation precede anything additive, and changes to what exists precede new surface unless the new surface is foundational; a new type, field, channel, or function lands with its first consumer, in that consumer's task (so `trail`, `archive`, and `moveIntoStore` wait for Tasks 4-2, 4-3, and 4-5; `returningNames`, `goneContainers`, and `bundled` open Phase 4 in Task 4-1, ahead of their second consumers; the bar opens Phase 6B, and `BundleRow.icon` and the Set narrowing wait for Task 6B-4). `BundleStore`'s archive arm is the one foundational exception: it lands in Phase 2 with the format, so every exhaustive switch over a store carries its archive arm from the phase that writes the switch (`layoutOf` in 2-1, the browser's `rulesOf` and its `archiveColumnStyle` key in 5-5), and the guard that keeps an archive bundle out of the Trash's disposal and reconcile lands with `openBundle` in 2-1; nothing is added in one phase that a later phase's consolidation would make unnecessary. Code, comments, and tests are true at every phase boundary; the documents are made true once, in Phase 7.
- **Shape:** a removal, a refactor, and a feature. The removal's inventory is *§Concepts › REMOVED* and the Findings' *§Removal & Consolidation*; its never-delete list is **Frozen** above. The refactor's baseline is today's behavior as the decision log's *§Context* and the Findings' *§Verified at HEAD* state it, kept except where a decision names a change (each named in its task as a behavior change) and proven by the tests each task rewrites or adds; every removal task lists its consumers. The feature's additions ride the Trash's mechanisms given a second store: one layout, two roots, two suffixes. The lift's write order (the entry before the move, the drop after) and the delete's record-ahead order are proven by vitest, never by the drive.
- **The Number:** every phase's VERIFY runs `python3 ~/"The Studio/.claude/scripts/view-delta/view-delta.py" <first>^..<last> --exclude .claude --save <scratch>/phase-<N>-delta.md` (without `--save` it prints the viewer's URL and the all-inclusive summary alone) over the phase's own commits, from the parent of its first commit to its last, its review's fix included, and records that file's **Actionable** column in the Net Ledger beside the phase's *Written* figure, removals and additions apart, the *Cumulative* column summing the rows. Other sessions commit to `active` between the plan's phases, so a range from the BASELINE head would count their work. A phase that lands above its written figure is reported in chat before the next phase opens, with what the increase buys.
- **Execution:** the plan runs end to end through `c/plan-execution`, autonomously, Nathan reachable at the Stops, in the main checkout on `active`: executors edit in place, each phase commits its own files with `git commit --only`, and the Archive Drive builds and launches from the checkout. If Nathan's live app runs from this checkout, the drive instead runs from a worktree of the phase's head built by `editor-parity/worktree.sh` and named by `POMMORA_DRIVE_REPO`, as MetadataV3's did. Each task goes to an `execution-agent` (`opus-medium`) carrying *§Context*, *§Overview*, this *§Constraints* whole (Nathan's Approach, Principles, and Constraints verbatim), and its task, which reports insights, concerns, and suggestions rather than diverging; the orchestrator checks its result against the task's AFTER and VERIFY. Every Review Checkpoint dispatches two read-only `opus-high` agents to the `closeout-review` skill's standards (correctness, simplification, cohesiveness, consequences; its closing procedures, write-guards, and output format don't apply), each carrying *§Constraints* whole and a do-not-re-raise list of the rulings below, reading outward rather than in isolation, with no implementation running meanwhile; the orchestrator verifies each finding against the tree, fixes what holds, and weighs the landed work against the Approach and Principles before the next phase opens; the Archive Drive runs over every landed group at the same checkpoint. An in-flight call is weighed against *§Constraints* and the plan's objectives, disclosed in chat, and recorded under *§Deviations* where it changes an outcome. The three compaction checkpoints in *§Process Overview* sit before Phases 3, 6A, and 6B; each runs `c/pre-compaction`, repeats Nathan's Approach, Principles, and Constraints verbatim in the handoff, and stops until Nathan re-prompts; on the re-prompt the orchestrator rereads *§Constraints* and `c/plan-execution` from the files themselves, rather than from the handoff's summary of them, before the next phase opens.
- **Neutral Gates:** two, each a `fable-high` agent that wrote and reviewed nothing, given only the BASELINE head, the HEAD named, and the intention statement, with no plan, log, or document; it answers, without hedging, whether the result holds to every principle under **Approach**, **Principles**, and **Nathan's Constraints** and what it would correct; a "no" routes back to the orchestrator, the fix lands, and the gate runs again. The first gate closes Phase 4, reading `BASELINE..<Phase 4's head>` with the data layer complete and nothing visible: *"Pommora removed a page or Set one way, into the Trash, where it left every cascade's reach and had to be reconciled on its way back; its excluded folders rode into the bundle, and a restore refused a landing anything outside the tree occupied. This work gives each Collection an Archive at `.nexus/archive/<id>/`, the one hidden folder every cascade and the content index reach into while the tree leaves it out, so an archived page stays current and returns by a plain move; it carries an excluded folder's entry crash-safely with its folder and lifts it out of a container being archived or trashed; it moves the Trash's bundle format, record, placement, and listing into one owner both stores share, gives every restore its exact former place and a step-aside past the disk, routes one restore by store, sends a delete from the Archive to the Trash with an Undo that returns it, sweeps an Archive whose Collection exists nowhere into the Trash at open, and carries archived items with a Set that changes Collection, with each rule stated once, built from what the architecture already had, and nothing left over."* The second gate runs after Phase 7 lands, over `BASELINE..HEAD`: *"Pommora had one way to remove a page or a Set: the Trash, where it left every cascade's reach and came back reconciled, and nothing marked work as finished without deleting it. This work gives each Collection an Archive at `.nexus/archive/<id>/`, the one hidden folder every cascade and the content index reach into while the tree, search, links, and the Matrix leave it out, so an archived page stays current and returns by a plain move to its exact former place; it puts Archive above Delete in every page and Set menu, asks under its own setting, posts an Undo, and lists a Collection's or top-level Set's archived items in an ArchiveView on the table's own look, acted on by right-click or the one top-right label that shows a notice or the shown view's actions; it opens an archived page in the one read-only reader the File History window became, and lets archived pages' snapshots be kept for a shorter time; and it moves the Trash's bundle format, record, placement, listing, and browser controller into one owner both stores share, carries an excluded folder's entry crash-safely with its folder and lifts it out of a container being archived or trashed, gives every restore its exact place and a step-aside past the disk, folds three face swaps into one, two restore menus into one, and three twin-id rules into one, with each rule stated once, built from what the architecture already had, and nothing left over."* The first gate is this plan's addition to the precedent's single end gate, seated where the data layer is whole and the interface hasn't yet leaned on it.
- **Rulings (Not Re-Raised):** every decision in *Archive — Decisions & Intention* and its *§Rejected* list; the Findings' *§Nathan's Rulings* 1 to 22 and the CONFIRMED bullets they added (an unreadable Collection keeps its Archive; today's re-read on an exclusion write stays, incremental scope changes are Phase 7's new IssuesPM entry; Collections and Spaces restore to their exact place; one in-place search rule for both browsers; an archived Set is one row; a page row's title opens the reader and the reader's title isn't renamable; the full header with "Archive" trailing; the tab reads the title with the archive glyph; the toolbar's sliders open the empty pane; Restore wears `filled`; one cross-fade with a 1500 ms hold; no way back from a picked archive timeframe; Title Case counts; the approved *§Copy*); the ten Last Calls ruled at ratification (*§Open Items*); the folder model proceeds, and the mark model (*§Prospects*) is not this plan's concern. The Findings' *§Contradictions* are all ruled on; a new finding that contradicts a ratified decision goes to *§Open Items* with the evidence and the plan proceeds on the ratified reading.
- **Departures (Nathan, 10-19-2026, verbatim):** approaches may diverge from ratified decisions within reason; the "how" can alter slightly if it's genuinely best; the "what" actually gets built still gets brought to Nathan if there's conflict. Removal and consolidation come before anything truly additive, and changes to what exists come before new surface unless the new surface is foundational: never add something in one phase that a later phase's consolidation would have made unnecessary. Every departure the plan took from the Findings is recorded beside its task; one an executor takes in flight is recorded under *§Deviations*.
- **Out of Scope Everywhere:** Indexed Trash, Auto-Delete, read-only properties in the reader window, Resolve Restoration Conflicts (I-073 after Phase 7's renumbering, deferred; `freeOnDisk` is its seam), Clear Nexus Cache, and the Mark Model (*§Prospects*); incremental exclusion-scope changes (recorded in IssuesPM in Phase 7); `Core/Sync/`'s internals and Sapphire; the Agenda folders and pages outside every Collection; Mobile.

#### Process Overview

- [ ] **Phase 1** — The Lift and the Carry
  - [ ] Task 1-1 · `carrySetAside` replaces the follow-after carry, and `relocateFolder` refuses before anything moves
  - [ ] Task 1-2 · `liftSetAside` replaces the Trash's excluded-entry bookkeeping; the Archive Drive opens with group 1
  - [ ] Review Checkpoint
- [ ] **Phase 2** — The Owner and the Format
  - [ ] Task 2-1 · One bundle format, two stores: `Core/Bundles/bundle.ts` and `record.ts`; the Trash refuses an Archive bundle
  - [ ] Task 2-2 · Trash Mode leaves the format: `Core/Trash/trashMode.ts` and `discard.ts`
  - [ ] Task 2-3 · Rows, placement, and `bundles:list` move to the owner; one change signal
  - [ ] Task 2-4 · Every restore returns to its exact place
  - [ ] Task 2-5 · A restore steps aside past the disk, and the Trash's report names the title it took; drive group 2
  - [ ] Review Checkpoint
- [ ] `[Compaction checkpoint: c/pre-compaction; on the re-prompt, reread §Constraints and c/plan-execution before Phase 3 opens]`
- [ ] **Phase 3** — Reach
  - [ ] Task 3-1 · The archive root is the one hidden folder read as content
  - [ ] Task 3-2 · One governed reach
  - [ ] Task 3-3 · One by-id projection over the tree and the Archive, and one twin rule
  - [ ] Task 3-4 · Counts and value loads stay with the tree, and the whole-index reads leave the Archive out; drive group 3
  - [ ] Review Checkpoint
- [ ] **Phase 4** — The Archive's Ops
  - [ ] Task 4-1 · The hoists the ops compose: `returningNames`, `goneContainers`, `bundled`
  - [ ] Task 4-2 · The `archive` op and `restoreArchived`; one `restore` routed by store; `trail`
  - [ ] Task 4-3 · A delete from the Archive goes to the Trash, and its Undo returns to the Archive
  - [ ] Task 4-4 · F-4: a Collection's Archive leaves with it for good
  - [ ] Task 4-5 · The carry, `refileArchived`, with its two in-session triggers and `moveIntoStore`
  - [ ] Task 4-6 · The open pass (F-5's orphans, the re-file); drive group 4
  - [ ] Review Checkpoint
  - [ ] Neutral Gate 1 (`fable-high`, `BASELINE..<Phase 4's head>`)
- [ ] **Phase 5** — Shared Chrome
  - [ ] Task 5-1 · One face swap: `Swap`, `DONE_MS`, and `useTimedLabel` in UIX
  - [ ] Task 5-2 · `NotificationLabel` becomes ActionLabel; a notice posted under the pointer drains
  - [ ] Task 5-3 · One Restore and Delete builder, and one checked-row rule
  - [ ] Task 5-4 · One TanStack seam, `useVirtualRows`, with IconPicker on it
  - [ ] Task 5-5 · The shared browser controller and one in-place search
  - [ ] Task 5-6 · The Deletion section's copy; drive group 5
  - [ ] Review Checkpoint
- [ ] `[Compaction checkpoint: c/pre-compaction; on the re-prompt, reread §Constraints and c/plan-execution before Phase 6A opens]`
- [ ] **Phase 6A** — Archiving
  - [ ] Task 6A-1 · `confirmArchive`, "Confirm Before Archiving" in "Trash & Archive", `waived(key, kind?)`, `spendUndo`
  - [ ] Task 6A-2 · Archive above Delete in every menu
  - [ ] Task 6A-3 · The archive history timeframe; drive group 6A
  - [ ] Review Checkpoint
- [ ] `[Compaction checkpoint: c/pre-compaction; on the re-prompt, reread §Constraints and c/plan-execution before Phase 6B opens]`
- [ ] **Phase 6B** — The Archive's View
  - [ ] Task 6B-1 · ActionLabel's bar: the declare channel and the second face
  - [ ] Task 6B-2 · One read-only reader window
  - [ ] Task 6B-3 · The archive place and its entry
  - [ ] Task 6B-4 · The Archive's rows and listing: `icon`, `stored`, `within`
  - [ ] Task 6B-5 · The browser's doors for both stores
  - [ ] Task 6B-6 · ArchiveView; drive group 6B
  - [ ] Review Checkpoint
- [ ] **Phase 7** — Reconciliation
  - [ ] Task 7-1 · The documents read true
  - [ ] Review Checkpoint
- [ ] `[Stop: the final verification's report, per §Final Verification; Neutral Gate 2 inside it]`

### Phase 1 — The Lift and the Carry

**GOAL:** Excluded folders and the asset directory travel crash-safely with a renamed or moved Collection or Set, and stay behind when it leaves the tree (K-1, F-2, F-3). A rename or move writes the landing's entries and the asset directory's setting before the folder moves and drops the source's entries after, one settings write each, so a failed write refuses the move before anything moves, a crash never leaves the folder un-excluded, and a move that throws writes back what the carry read. A Set or Collection sent to the Trash first lifts its excluded folders and asset directory into its parent, each stepping aside past names already there and carrying its entry, so the Trash's own excluded-entry bookkeeping leaves. The nine exclusion functions in `Core/Settings/settings.ts` become four: `writeAssetDirectory`, `writeExcludedFolders`, `carrySetAside`, and `sanitizeExclusions`. Nothing here depends on another phase; Phase 4's `archive` op becomes the lift's second caller, and Phase 7 writes I-007's closure. The phase creates the Archive Drive with group 1.

#### Task 1-1

**TASK:** Replace the follow-after carry with `carrySetAside`, run first in `relocateFolder` so its write is the move's refusal and its undo answers a move that throws, re-key the asset directory's image crops through one `rekeyCrops` that `migrateAssets` shares, and remove the refusal arms in the rename and the Set move (K-1).

**NOW:** `relocateFolder` (`Core/Nexus/folderEntity.ts:30-32`, module-private) is `relocate(from, to, () => followExcludedFolders(…))`; `relocate` (`Core/Files/atomicWrite.ts:61-75`) runs `landed` after the move's own event, before `reportRename`. Because the follow writes after the move, `exclusionWriteRefusal` (`Core/Settings/settings.ts:108-116`) probes ahead in `renameOp`, `moveSetOp`, `deleteOp`, and the restore (the last two are Task 1-2's). `assets:setDir` (`Core/Assets/handlers.ts:42-60`) is the only writer of `asset_directory`; nothing moves it with its folder.

`updateNexusConfig` (`atomicWrite.ts:265-271`) refuses a corrupt `settings.json`; a mutate answering `null` writes nothing (`:157-158`). `normalizeExclusions` (`Core/Settings/codec.ts:61-82`) dedupes case-folded, keeping the first spelling, and `entryWithin` (`Core/Paths/exclusion.ts:98-99`) folds case, so a case-only rename's `from` and `to` match the same entries (Cautionary 17). The carry's write reaches `applySettings` (`Core/Nexus/fileEvents.ts:502-518`) ahead of the move's event at `applyMove`'s arm (`:574-578`, `'walk'` with `owed.corpus`), and `reseed` restarts only the watcher when a rescope is owed (`Core/Nexus/settle.ts:177-185`), so the move adds no second seed. `folderEntity.test.ts` runs with no session, reading defaults from the absent settings file.

**CHANGE**

- [ ] Write the tests and watch them fail:
  - `Core/Settings/settings.test.ts`, new `describe('carrySetAside')`: "writes each landing entry just ahead of its source, and its drop leaves the landing alone"; "moves the asset directory in the same write, holding its source as an excluded entry until the drop" (`New/Media` with `Old/Media` excluded, then `New/Media` alone); "refuses while settings.json can’t be written, leaving it byte-identical" (read once through `readWatchScope` before `{ corrupt` is written, so the disk read answers its last parse); "writes nothing when no entry or asset directory sits under the source".
  - `Core/Nexus/mutate.test.ts`, in `describe('handleMutate — excluded entries follow their folders')` (`:3241-3448`): "writes a carried entry beside its source before the folder moves, and drops the source before Sync hears of the rename"; "carries the asset directory with a moved Set", beside "carries an entry with a moved Set"; "restores the settings it carried when the folder move throws, so the walk never stamps the asset folder" (`rename` throwing for `Notes`: `settings.json` equals what it held, no `Notes/Media/_pageset.json`); "re-keys a crop to the asset’s new path through a rename and a trash of the container holding the asset directory" (`Journal/Daily/Media/Pic.png`, then `Journal/Media/Pic.png`).
  - Two pins, same describe, passing before and after: "keeps the landed spelling, as one entry, through a case-only rename"; "a carried landing restarts the watcher once and seeds nothing twice" (K-1).
  - Unchanged: "rewrites an entry under a renamed Collection and rescopes the session" (`:3252`, `['Archive', 'Elsewhere/Daily']`, order kept); "refuses a landing that carries excluded entries while settings.json can’t be written" (`:3276`, its rename half now refusing through the carry's write with the same message, its delete half through the gate Task 1-2 replaces); `:3412`; "writes nothing for a rename no entry sits under" (`:3425`); "rescopes a landing beneath an entry that already names the new path" (`:3437`, the `applyMove` arm with no carry); `Core/Nexus/fileEvents.test.ts:298` and `:307`, the two event arms.
- [ ] `settings.ts`: replace `followExcludedFolders` (`:97-106`) with `carrySetAside(root, from, to): Promise<Result<{ drop: () => Promise<void>; undo: () => Promise<void> }>>`: one `readWatchScope`, then one `updateNexusConfig(root, 'settings', …)` whose failure is the answer, putting each entry's landing (re-rooted at `to`) just ahead of each entry at or under `from` (order kept; on a case-only rename `normalizeExclusions` keeps the landed spelling as the one entry), moving an `asset_directory` at or under `from` to `to`, and holding its source as an excluded entry, so the folder isn't adopted before it leaves; nothing under `from` writes nothing and answers no-op steps. `drop` writes the entries re-rooted, without the sources, writing only when it drops one, and re-keys the asset directory's crops; `undo` writes back the entries and asset directory it read. Add `rekeyCrops(root, remap)` beside `updateCrops`, hoisted from `migrateAssets` with its best-effort catch: each crop key `remap` answers moves, the rest stay. `excludedWithin`, `editExcluded`, `exclusionWriteRefusal`, `releaseExcludedFolders`, and `reseatExcludedFolders` stay for Task 1-2.
- [ ] `folderEntity.ts`: `relocateFolder` answers `Promise<Result<{ path: string }>>`: the carry first, its refusal returned before anything moves, then `relocate` with a `landed` that sets a `landed` flag and runs `drop`, so sync hears of the rename once, after it (Cautionary 18); a move that throws before landing runs `undo` and rethrows; rewrite its doc (`:30`). `renameFolderEntity` (`:52-64`) and `moveFolderEntity` (`:66-76`) return `relocateFolder(…)` directly; the import takes `carrySetAside` for `followExcludedFolders`.
- [ ] `Core/Nexus/rename.ts:20-23`: the refusal is `landingRefusal` alone; drop `:10`'s import (`:9`'s `pathExists` stays, used at `:31`). `Core/Nexus/move.ts:50-53`: likewise, dropping `:12`'s import.
- [ ] `fileEvents.ts:574`: rewrite the comment: the arm serves a landing under an entry excluded from outside the move, which has no settings write of its own, so the walk reseeds and the watch stands; a landing the carry wrote ahead already owes the rescope.
- [ ] `Core/Assets/assetMigrate.ts`: `migrateAssets` (`:220-236`) collects its re-keys into a `Map` and calls `rekeyCrops(root, (key) => rekeys.get(key))`; the import takes `rekeyCrops` for `updateCrops`.
- [ ] Sibling sweep, nothing to change: `folderEntity.test.ts` (`:58-91`) and both ops take the unchanged reply shape; `relocate`'s `landed` contract and `atomicWrite.ts:61`'s doc stand; nothing else imports `followExcludedFolders`; `Core/Sync/Client/session.ts:135`'s comment stays true.

**AFTER**

```Core/Settings/settings.ts diff
@@ after updateCrops @@
+/** Best-effort: a corrupt crops.json must not block the change once what it keys has moved. */
+export async function rekeyCrops(
+  root: string,
+  remap: (key: string) => string | undefined,
+): Promise<void> {
+  await updateCrops(root, (byImage) =>
+    Object.fromEntries(Object.entries(byImage).map(([key, crop]) => [remap(key) ?? key, crop])),
+  ).catch(() => {})
+}
@@ followExcludedFolders → carrySetAside @@
-/** An excluded entry follows the folder it names: a Collection or Set landing at `to` carries every entry at or under `from` with it. */
-export async function followExcludedFolders(root: string, from: string, to: string): Promise<void> {
-  if (from === to) return
-  await editExcluded(root, (excluded) =>
-    excluded.map((entry) => {
-      const rest = entryWithin(entry, from)
-      return rest ? [to, ...rest].join('/') : entry
-    }),
-  )
-}
+/** A Collection or Set moving from `from` to `to` carries every excluded entry and the asset directory at or under it. Each landing entry is written just ahead of its source, and the asset directory's source held as an entry, before the folder moves, so the list keeps its order, a case-only rename keeps the landed spelling, a source stays out of the tree until the folder has left it, and the write's refusal is the move's. `drop` settles the landing and re-keys the asset directory's crops once the folder has landed; `undo` writes back what was read when the move fails. */
+export async function carrySetAside(
+  root: string,
+  from: string,
+  to: string,
+): Promise<Result<{ drop: () => Promise<void>; undo: () => Promise<void> }>> {
+  const { excluded, assetDir } = await readWatchScope(root)
+  const landing = (entry: string): string[] => {
+    const rest = entryWithin(entry, from)
+    return rest ? [[to, ...rest].join('/')] : []
+  }
+  const ahead = excluded.flatMap((entry) => [...landing(entry), entry])
+  const [asset] = landing(assetDir)
+  if (ahead.length === excluded.length && !asset)
+    return ok({ drop: async () => {}, undo: async () => {} })
+  const write = (folders: string[], dir: string) =>
+    updateNexusConfig(root, 'settings', (cur) => ({
+      ...setOrDrop(cur, 'excluded_folders', folders.length > 0 && folders),
+      ...(asset ? { asset_directory: dir } : {}),
+    }))
+  const folders = normalizeExclusions(asset ? [...ahead, assetDir] : ahead).folders
+  const written = await write(folders, asset)
+  if (!written.ok) return written
+  const kept = normalizeExclusions(excluded.map((entry) => landing(entry)[0] ?? entry)).folders
+  return ok({
+    drop: async () => {
+      if (kept.length < folders.length) await writeExcludedFolders(root, kept)
+      if (asset) await rekeyCrops(root, (key) => landing(key)[0])
+    },
+    undo: async () => {
+      await write(excluded, assetDir)
+    },
+  })
+}
```

```Core/Nexus/folderEntity.ts diff
@@ imports @@
-import { followExcludedFolders, readWatchScope } from '../Settings/settings'
+import { carrySetAside, readWatchScope } from '../Settings/settings'
@@ relocateFolder @@
-/** A Collection or Set landing at a new path: excluded entries follow before sync hears of the rename, so it pushes under the new scope. */
-const relocateFolder = (root: string, from: string, to: string): Promise<void> =>
-  relocate(from, to, () => followExcludedFolders(root, relative(root, from), relative(root, to)))
+/** A Collection or Set landing at a new path carries its excluded entries and the asset directory: the carry's write refuses the move before anything moves, and its drop runs as `landed`, so sync hears of the rename once, under the scope it settled; a move that throws before landing writes back what the carry read. */
+async function relocateFolder(
+  root: string,
+  from: string,
+  to: string,
+): Promise<Result<{ path: string }>> {
+  const carried = await carrySetAside(root, relative(root, from), relative(root, to))
+  if (!carried.ok) return carried
+  let landed = false
+  try {
+    await relocate(from, to, () => {
+      landed = true
+      return carried.value.drop()
+    })
+  } catch (e) {
+    if (!landed) await carried.value.undo()
+    throw e
+  }
+  return ok({ path: to })
+}
@@ renameFolderEntity @@
   if (await targetTaken(absFolder, target)) return fail('exists', `"${newName}" already exists.`)
-  await relocateFolder(root, absFolder, target)
-  return ok({ path: target })
+  return relocateFolder(root, absFolder, target)
 }
@@ moveFolderEntity @@
   if (await pathExists(target))
     return fail('exists', `"${basename(absFolder)}" already exists there.`)
-  await relocateFolder(root, absFolder, target)
-  return ok({ path: target })
+  return relocateFolder(root, absFolder, target)
 }
```

```Core/Nexus/rename.ts diff
@@ imports @@
 import { pathExists } from '../Files/atomicWrite'
-import { excludedWithin, exclusionWriteRefusal } from '../Settings/settings'
@@ renameOp @@
   if (req.kind !== 'page') {
-    const refused =
-      (await landingRefusal(root, dirname(abs), req.newName)) ??
-      (await exclusionWriteRefusal(root, await excludedWithin(root, req.path)))
+    const refused = await landingRefusal(root, dirname(abs), req.newName)
     if (refused) return refused
```

```Core/Nexus/move.ts diff
@@ imports @@
 import { containerAt, pageAt } from './treePatch'
-import { excludedWithin, exclusionWriteRefusal } from '../Settings/settings'
@@ moveSetOp @@
-  const refused =
-    (await landingRefusal(root, at.value.dst, basename(at.value.src))) ??
-    (await exclusionWriteRefusal(root, await excludedWithin(root, req.path)))
+  const refused = await landingRefusal(root, at.value.dst, basename(at.value.src))
   if (refused) return refused
```

```Core/Nexus/fileEvents.ts diff
@@ applyMove @@
-  // A folder landing where an excluded entry already names a path at or beneath it moves the corpus with no settings write to report it, so it walks and reseeds; the entries themselves are unchanged, so the watch stands.
+  // A folder landing where an excluded entry already names a path at or beneath it moves the corpus, so it walks. An entry excluded from outside the move has no settings write of its own, so the walk reseeds and the watch stands; one the move's carry wrote ahead already owes the rescope, whose restarted watcher seeds in the reseed's place.
   if (tree && scopeOf(tree.config).excluded.some((entry) => entryWithin(entry, to) !== null)) {
```

```Core/Assets/assetMigrate.ts diff
@@ imports @@
-import { readWatchScope, updateCrops, updateSettings } from '../Settings/settings'
+import { readWatchScope, rekeyCrops, updateSettings } from '../Settings/settings'
@@ migrateAssets @@
   await refreshAssetMap(root)
 
-  const rekeys: [string, string][] = []
+  const rekeys = new Map<string, string>()
   for (const { from, to } of result.moved) {
     const toRel = await assetFilePath(root, to)
-    if (toRel) rekeys.push([from, toRel])
-  }
-  if (rekeys.length) {
-    // Best-effort: a corrupt crops.json must not block the change once references moved.
-    await updateCrops(root, (b) => {
-      const next = { ...b }
-      for (const [fromRel, toRel] of rekeys) {
-        if (next[fromRel] === undefined) continue
-        next[toRel] = next[fromRel]
-        delete next[fromRel]
-      }
-      return next
-    }).catch(() => {})
+    if (toRel) rekeys.set(from, toRel)
   }
+  if (rekeys.size) await rekeyCrops(root, (key) => rekeys.get(key))
   // Last, so a discard the system trash refuses leaves the move itself whole.
   if (!result.skipped.length) result.trashed = await sweepLegacyRoot(root, deps)
   return result
```

```Core/Settings/settings.test.ts diff
@@ imports @@
 import {
+  carrySetAside,
   readWatchScope,
   readLiveSetting,
   updateSettings,
   writeExcludedFolders,
   writePersonalization,
 } from './settings'
@@ after describe('writeExcludedFolders') @@
+describe('carrySetAside', () => {
+  it('writes each landing entry just ahead of its source, and its drop leaves the landing alone', async () => {
+    await write({ excluded_folders: ['Archive', 'Old/Private', 'Old/Deep/Raw'] })
+    const carried = await carrySetAside(root, 'Old', 'New')
+    if (!carried.ok) throw new Error(carried.error.message)
+    expect((await readSettings()).excluded_folders).toEqual([
+      'Archive',
+      'New/Private',
+      'Old/Private',
+      'New/Deep/Raw',
+      'Old/Deep/Raw',
+    ])
+    await carried.value.drop()
+    expect((await readSettings()).excluded_folders).toEqual([
+      'Archive',
+      'New/Private',
+      'New/Deep/Raw',
+    ])
+  })
+
+  it('moves the asset directory in the same write, holding its source as an excluded entry until the drop', async () => {
+    await write({ asset_directory: 'Old/Media' })
+    const carried = await carrySetAside(root, 'Old', 'New')
+    if (!carried.ok) throw new Error(carried.error.message)
+    expect(await readSettings()).toEqual({
+      asset_directory: 'New/Media',
+      excluded_folders: ['Old/Media'],
+    })
+    await carried.value.drop()
+    expect(await readSettings()).toEqual({ asset_directory: 'New/Media' })
+  })
+
+  it('refuses while settings.json can’t be written, leaving it byte-identical', async () => {
+    await write({ excluded_folders: ['Old/Private'] })
+    await readWatchScope(root)
+    await writeFile(path(), '{ corrupt', 'utf8')
+    const carried = await carrySetAside(root, 'Old', 'New')
+    expect(carried.ok ? '' : carried.error.message).toContain('settings.json')
+    expect(await readFile(path(), 'utf8')).toBe('{ corrupt')
+  })
+
+  it('writes nothing when no entry or asset directory sits under the source', async () => {
+    await write({ excluded_folders: ['Archive'] })
+    const before = await readFile(path(), 'utf8')
+    const carried = await carrySetAside(root, 'Old', 'New')
+    if (!carried.ok) throw new Error(carried.error.message)
+    await carried.value.drop()
+    expect(await readFile(path(), 'utf8')).toBe(before)
+  })
+})
```

```Core/Nexus/mutate.test.ts diff
@@ describe('handleMutate — excluded entries follow their folders') — after 'rewrites an entry under a renamed Collection and rescopes the session' @@
+  it('writes a carried entry beside its source before the folder moves, and drops the source before Sync hears of the rename', async () => {
+    await exclude(['Archive', 'Notes/Daily/Old'])
+    const settings = join(root, '.nexus', 'settings.json')
+    const to = join(root, 'Journal')
+    const seen: [string, unknown][] = []
+    const note = (at: string): void => {
+      seen.push([at, JSON.parse(readFileSync(settings, 'utf8')).excluded_folders])
+    }
+    setWriteTap({
+      wrote: (path) => {
+        if (path === settings) note('settings write')
+        if (path === to) note('move')
+      },
+      renamed: () => note('renamed'),
+    })
+    try {
+      const r = await settledMutate(
+        root,
+        { op: 'rename', path: 'Notes', kind: 'collection', newName: 'Journal' },
+        nexusDeps,
+      )
+      expect(r.ok).toBe(true)
+    } finally {
+      setWriteTap(null)
+    }
+    const both = ['Archive', 'Journal/Daily/Old', 'Notes/Daily/Old']
+    expect(seen).toEqual([
+      ['settings write', ['Archive', 'Notes/Daily/Old']],
+      ['move', both],
+      ['settings write', both],
+      ['renamed', ['Archive', 'Journal/Daily/Old']],
+    ])
+  })
+
+  it('keeps the landed spelling, as one entry, through a case-only rename', async () => {
+    await exclude(['Notes/Daily/Old'])
+    const r = await settledMutate(
+      root,
+      { op: 'rename', path: 'Notes', kind: 'collection', newName: 'notes' },
+      nexusDeps,
+    )
+    expect(r.ok).toBe(true)
+    expect(await excludedOnDisk()).toEqual(['notes/Daily/Old'])
+  })
+
+  it('a carried landing restarts the watcher once and seeds nothing twice', async () => {
+    await exclude(['Notes/Daily/Old'])
+    const seed = vi.spyOn(indexSeed, 'seedContentIndex')
+    const watch = vi.fn(async () => {})
+    const r = await handleMutate(
+      root,
+      { op: 'rename', path: 'Notes', kind: 'collection', newName: 'Journal' },
+      nexusDeps,
+    )
+    await settleNow({ push: () => {}, watch }, root)
+    expect(r.ok).toBe(true)
+    expect(watch).toHaveBeenCalledTimes(1)
+    expect(seed).not.toHaveBeenCalled()
+    seed.mockRestore()
+  })
@@ after 'carries an entry with a moved Set' @@
+  it('carries the asset directory with a moved Set', async () => {
+    await mkdir(join(root, 'Other'), { recursive: true })
+    await writeFile(join(root, 'Other', '_pagecollection.json'), JSON.stringify({ id: 'ot' }))
+    await mkdir(join(root, 'Notes', 'Daily', 'Media'), { recursive: true })
+    await writeFile(
+      join(root, '.nexus', 'settings.json'),
+      JSON.stringify({ asset_directory: 'Notes/Daily/Media' }),
+    )
+    await refreshTree(root)
+    const r = await settledMutate(
+      root,
+      { op: 'moveSet', path: 'Notes/Daily', newParentPath: 'Other', order: [] },
+      nexusDeps,
+    )
+    expect(r.ok).toBe(true)
+    expect((await readJson('.nexus/settings.json')).asset_directory).toBe('Other/Daily/Media')
+    expect(heldTreeOf(root)?.config.assetDirectory).toBe('Other/Daily/Media')
+  })
+
+  it('restores the settings it carried when the folder move throws, so the walk never stamps the asset folder', async () => {
+    await mkdir(join(root, 'Notes', 'Media'), { recursive: true })
+    await writeFile(join(root, 'Notes', 'Media', 'Pic.png'), 'bytes')
+    const before = { excluded_folders: ['Notes/Daily/Old'], asset_directory: 'Notes/Media' }
+    await writeFile(join(root, '.nexus', 'settings.json'), JSON.stringify(before))
+    await refreshTree(root)
+    const m = machine()
+    const rename = m.rename.bind(m)
+    const held = vi.spyOn(m, 'rename').mockImplementation(async (from, to) => {
+      if (from === join(root, 'Notes')) throw new Error('held')
+      return rename(from, to)
+    })
+    try {
+      const r = await settledMutate(
+        root,
+        { op: 'rename', path: 'Notes', kind: 'collection', newName: 'Journal' },
+        nexusDeps,
+      )
+      expect(r.ok).toBe(false)
+    } finally {
+      held.mockRestore()
+    }
+    expect(await readJson('.nexus/settings.json')).toEqual(before)
+    expect(await pathExists(join(root, 'Notes', 'Media', '_pageset.json'))).toBe(false)
+  })
+
+  it('re-keys a crop to the asset’s new path through a rename and a trash of the container holding the asset directory', async () => {
+    await mkdir(join(root, 'Notes', 'Daily', 'Media'), { recursive: true })
+    await writeFile(join(root, 'Notes', 'Daily', 'Media', 'Pic.png'), 'bytes')
+    await writeFile(
+      join(root, '.nexus', 'settings.json'),
+      JSON.stringify({ asset_directory: 'Notes/Daily/Media' }),
+    )
+    const crop = { x: 0.3, y: 0.4, zoom: 1.5 }
+    await mkdir(join(root, '.nexus', 'assets'), { recursive: true })
+    await writeFile(
+      join(root, '.nexus', 'assets', 'crops.json'),
+      JSON.stringify({ byImage: { 'Notes/Daily/Media/Pic.png': crop } }),
+    )
+    await refreshTree(root)
+    const cropKeys = async (): Promise<unknown> =>
+      (await readJson('.nexus/assets/crops.json')).byImage
+    const renamed = await settledMutate(
+      root,
+      { op: 'rename', path: 'Notes', kind: 'collection', newName: 'Journal' },
+      nexusDeps,
+    )
+    expect(renamed.ok).toBe(true)
+    expect(await cropKeys()).toEqual({ 'Journal/Daily/Media/Pic.png': crop })
+    const trashed = await settledMutate(
+      root,
+      { op: 'delete', path: 'Journal/Daily', kind: 'set' },
+      nexusDeps,
+    )
+    expect(trashed.ok).toBe(true)
+    expect(await cropKeys()).toEqual({ 'Journal/Media/Pic.png': crop })
+  })
```

**VERIFY**

- [ ] The listed tests pass; `mutate.test.ts:3252`, `:3276`, `:3412`, `:3425`, `:3437`, `fileEvents.test.ts:298`, `:307`, and `folderEntity.test.ts` pass unchanged.
- [ ] `git grep -n "followExcludedFolders" -- Core Desktop` finds nothing; `git grep -n "exclusionWriteRefusal" -- Core` finds only `Core/Settings/settings.ts`, `Core/Trash/delete.ts`, and `Core/Trash/spend.ts` (Task 1-2 removes them).
- [ ] Run the gates.
- [ ] Check for unnecessary code or mistakes.

**Lines:** +32 (+68 / −36), none moved. By file: `settings.ts` +40 / −7 (the carry +34 and `rekeyCrops` +9 against `followExcludedFolders`' −10, three lines matching Task 1-2's removals), `folderEntity.ts` +22 / −7, `assetMigrate.ts` +4 / −14, and `rename.ts` and `move.ts` +1 / −4 each. Comments: three rewritten in place, and `migrateAssets`' best-effort note moved into `rekeyCrops`' doc. Tests about +190 apart.

#### Task 1-2

**TASK:** Add `liftSetAside`, which moves every excluded folder and the asset directory inside a Collection or Set into its parent, and run it in `deleteOp` ahead of the mint in both Trash modes; remove the Trash's excluded-entry bookkeeping and the `settings.ts` functions only it used (F-2, F-3). Create the Archive Drive with group 1.

**NOW:** Task 1-1 has landed: `relocateFolder` (`Core/Nexus/folderEntity.ts`) answers `Result<{ path }>` and carries through `carrySetAside`. `deleteOp` (`Core/Trash/delete.ts:28-116`) gates on `exclusionWriteRefusal`, mints the bundle (`:46`; none in system mode), records the excluded entries, moves the folder with them inside (`:99-100`), then releases them; system mode drops the metadata of every page under the folder, excluded ones included (`:48`). The restore (`Core/Trash/spend.ts:143`) refuses on recorded entries while settings can't be written and reseats them after the move's own event, so excluded subfolders arrive read as Sets owed stamps. No record on disk holds a non-empty `excluded` (`~/NexusOS/.trash` and `~/Test/.trash` hold only `excluded: []`), and the record's `z.object` strips the key on decode once the field leaves.

The lift's parts: `readWatchScope`, `entryWithin`, `pathExists` (catches), `heldName` (`Core/Files/atomicWrite.ts:340-345`, reads its parent uncaught), `listEntries`, and `freeName` (folds case). An entry outlives its folder and `relocate` throws on a missing source (`atomicWrite.ts:70`), so the lift reads the spelling through `heldName`, whose `null` for a folder gone from its parent's listing skips the entry (Cautionary 16). A folder landing in a Collection with no entry naming it is stamped as a Set (`Core/Nexus/fileEvents.ts:153-159`), so each lifted folder's entry is written ahead of its move.

`~/Test` holds no excluded folder or asset directory, and already holds `Collection A/Set Alpha` and `Set Beta`, so the drive seeds its own. A folder made inside a Set is adopted as a Set before `assets:setDir` could validate it, and `assets:setDir`'s `migrateAssets` would move `~/Test`'s own `.nexus/assets`, so the drive writes `asset_directory` into `settings.json` from outside before making the folder, and resets it through `assets:setDir ''`, whose migration answers null at the default. The drive builds on `.claude/scripts/Path Links Drive/live-drive.mjs:20-39` and `.claude/scripts/drive-harness.mjs`'s `chooseNative`, `ask`, `launch`, and `restore`. A Set's delete always asks through a `[role="alertdialog"]` labelled by its message; a collapsed sidebar container unmounts its children (`UIX/Animations/Reveal.tsx:21-41`).

**Behavior changes, stated:** a Set or Collection sent to the Trash leaves its excluded folders and the asset directory in its parent, a Collection's at the Nexus root, each entry or setting following its folder; a delete straight to the system trash does the same, so the system trash never takes excluded content and the system-mode metadata drop no longer reaches pages inside excluded folders; emptying the Trash never deletes excluded content, since none enters a bundle; a restore lands without the lifted folders and writes no settings, which retires the latent reseat bug; an entry under a trashed container that names no folder on disk stays in Settings rather than leaving with the delete; a lift that refuses on its second folder leaves the first lifted, its entry consistent, and refuses the delete.

**CHANGE**

- [ ] Write the tests and watch them fail, in `mutate.test.ts`'s `describe('handleMutate — excluded entries follow their folders')`:
  - `:3276` unchanged; its delete half now refuses through the lift's carry (`Notes/Private` stays, no `.trash`, the file stays `{ corrupt`).
  - `:3300`, "refuses a Set moved, or a Collection restored, with excluded entries while settings.json can’t be written", splits in two: "refuses a Set moved with excluded entries while settings.json can’t be written" (the move refuses, `Notes/Daily/Private` stays, a reorder in place succeeds) and "a Collection restores under an unreadable settings.json, writing no settings" (the good-settings delete lifts `Private` to the root, `['Private']` on disk, and the restore succeeds under `{ corrupt`, which stays).
  - `:3334`, "takes a trashed Collection’s entries with it and lands them wherever it is restored", becomes "lifts a trashed Collection’s excluded folder to the root, its entry following, and restores the Collection without it".
  - `:3362`, "reports a Collection delete and its restore to Sync as one rename each, the restore after its entries hold again", becomes "reports the lift, the Collection delete, and its restore to Sync as one rename each, every one under settings already excluding the lifted folder".
  - New: "steps a lifted folder aside past every name its parent holds, the Set’s own among them, and the Set’s restore keeps its name" (the listing counts the Set's own name, so `Notes/Daily/Daily` lands as `Daily (2)`); "lifts only the outermost of nested excluded folders, the inner one riding inside it"; "lifts the asset directory out of a trashed Set, its setting following"; "lifts under the system Trash Mode too, so the system trash never takes an excluded folder"; "lifts an excluded folder and the asset directory spelled apart only by case once" (`Notes/Daily/Media` excluded, `Notes/Daily/media` the asset directory: both read `Notes/Media`); "leaves an entry naming no folder where it stands, lifting nothing for it".
  - `Core/Trash/spend.test.ts:1527` "a Set restored onto a folder Settings excludes refuses, the bundle intact" unchanged (it pins `landingRefusal`, which stays until Phase 2); `deleteOrder.test.ts` and `trashRecovery.test.ts` need nothing.
- [ ] `folderEntity.ts`: add `liftSetAside(root, containerAbs): Promise<Result<null>>` beside `relocateFolder`: one `readWatchScope`; the candidates are the excluded entries and the asset directory at or under the container, as remainders, skipping one strictly beneath another (it rides inside; an entry and the asset directory spelled apart only by case lift once, the second's `heldName` answering `null` after the first's move) and one whose `heldName` answers `null`, gone from its parent's listing (Cautionary 16); each lands at `join(dirname(container), freeName(heldName(abs), listEntries(parent) names))`, listed per lift so the container's own name and each earlier lift count, and moves through `relocateFolder`, its entry written ahead; the first refusal is the answer. Imports gain `heldName`, `freeName`, `entryWithin`, and `listEntries`.
- [ ] `delete.ts`: the gate at `:41-44` becomes the lift, still ahead of the mint, the system-mode page ids, and the move; drop `:109`'s release; `:26` imports `liftSetAside` from `../Nexus/folderEntity`.
- [ ] `Core/Trash/gather.ts`: `gatherContentRecord` (`:61-74`) drops the `excluded` branch (`:72`) and `:2`'s import. `Core/Trash/record.ts`: drop the `excluded` field and its doc (`:38-39`); `:3` imports `hiddenName` alone (used at `:111`).
- [ ] `spend.ts`: the container refusal is `landingRefusal` alone (`:175-177`; the `exists` refusal at `:181-182` stays for Phase 2); drop `targetRel` (`:173`); `relocate(artifactAbs, targetAbs)` takes no `landed` (`:214-220`); `:1` drops `relative`; `:20` imports `readLiveSetting` alone.
- [ ] `settings.ts`: remove `excludedWithin`, `editExcluded`, `exclusionWriteRefusal`, `releaseExcludedFolders`, and `reseatExcludedFolders` with their docs, leaving `writeAssetDirectory`, `writeExcludedFolders`, `carrySetAside`, and `sanitizeExclusions` in the exclusion block.
- [ ] Create `.claude/scripts/Archive Drive/live-drive.mjs` and `MATRIX.md` with group 1 (AFTER), on port 9393, in the Path Links Drive's item shape: items print `[g<group> <decisions>] <name>`; `POMMORA_ARCHIVE_LANDED` (default 1) gates them, so a later phase's item prints `AWAIT` and leaves the exit code alone; `ALL` lists the groups landed so far, each phase's last task adding its own. Group 1, each check a disk, reply, or DOM assertion:
  - Seeds `AR Lift` with an excluded `Private` holding `Keep.md`, written to disk only after the entry holds, so the folder is never adopted.
  - `[g1 K-1] a renamed Set carries its excluded entry to the landing`.
  - `[g1 K-1] the carried folder moves with the Set and is never read as one`.
  - `[g1 F-3] the sidebar's Delete asks, and the Set goes to the Trash`: the disclosure chevron is a lucide `<svg>` with no `.click()` (`UIX/Menus/DisclosureRow.tsx:41-45`), so `unfold` presses it with `mouseClick`, as `.claude/scripts/reveal-parity/run.mjs:305` does.
  - `[g1 F-3] its excluded folder is left behind in Collection A, untouched`.
  - `[g1 F-3] the folder's entry follows it`.
  - `[g1 F-3] the bundle holds no excluded folder, and its record names none`.
  - `[g1 F-3] the sidebar draws neither the Set nor the lifted folder`.
  - `[g1 F-2] the restored Set returns without the folder, which stays where it was left`.
  - `[g1 F-2] the sidebar draws the Set again, and never the folder`.
  - Seeds `AR Second` with its own excluded `Private`.
  - `[g1 F-2] a folder lifted onto a namesake steps aside to Private (2), its entry following`.
  - Seeds `AR Carry`, its `asset_directory` written into `settings.json` from outside before `Media/Pixel.png` exists.
  - `[g1 K-1] a renamed Set carries the asset directory to the landing, the asset file with it`: renamed to `AR Media`, `excluded_folders` holding only the two lifted folders.
  - `[g1 F-2] the asset directory is left behind by a trashed Set, its setting following`.
  - Cleanup removes the lifted folders while still set aside, so none is adopted, then clears the exclusions and the asset directory; the harness restores `~/Test` at the run's end.
- [ ] Sibling sweep, nothing to change: `deleteOp` is the lift's only caller until Phase 4's `archive` op; `Core/Trash/deleteOrder.test.ts:69-82`'s `relocate` mock passes the lift's moves through; `git grep "record.excluded"` finds only `spend.ts`; `delete.ts:45`'s write-ahead comment stays true; the drive's `.claude/scripts/README.md` paragraph is Phase 7's.

**AFTER**

```Core/Nexus/folderEntity.ts diff
@@ imports @@
 import { join, dirname, basename, relative } from '../Paths/posix'
 import { machine } from '../Platform/machine'
 import { recordWrite } from '../Files/writeEcho'
-import { pathExists, relocate, targetTaken, writeJson } from '../Files/atomicWrite'
-import { nameError } from '../Paths/names'
+import { heldName, pathExists, relocate, targetTaken, writeJson } from '../Files/atomicWrite'
+import { listEntries } from '../Files/walk'
+import { freeName, nameError } from '../Paths/names'
 import { sidecarPath } from '../Paths/paths'
 import type { SidecarKind } from '../Paths/nexusPaths'
 import { ok, fail, type Result } from '../Contract/result'
-import { outsideContent } from '../Paths/exclusion'
+import { entryWithin, outsideContent } from '../Paths/exclusion'
 import { carrySetAside, readWatchScope } from '../Settings/settings'
@@ after relocateFolder @@
+
+/** A Collection or Set leaving the tree leaves every excluded folder and the asset directory inside it in its parent, the outermost of a nesting, under its own name or the next one free there, each one's entry carried ahead of it. */
+export async function liftSetAside(root: string, containerAbs: string): Promise<Result<null>> {
+  const { excluded, assetDir } = await readWatchScope(root)
+  const inside = [...excluded, assetDir].flatMap((entry) => {
+    const rest = entryWithin(entry, relative(root, containerAbs))
+    return rest ? [rest.join('/')] : []
+  })
+  const parent = dirname(containerAbs)
+  for (const rest of inside) {
+    if (inside.some((outer) => (entryWithin(rest, outer)?.length ?? 0) > 0)) continue
+    const abs = join(containerAbs, rest)
+    // An entry can outlive its folder, whose spelling is read from its parent's listing.
+    const name = await heldName(abs)
+    if (name === null) continue
+    const taken = (await listEntries(parent)).map((e) => e.name)
+    const lifted = await relocateFolder(root, abs, join(parent, freeName(name, taken)))
+    if (!lifted.ok) return lifted
+  }
+  return ok(null)
+}
```

```Core/Trash/delete.ts diff
@@ imports @@
-import { excludedWithin, exclusionWriteRefusal, releaseExcludedFolders } from '../Settings/settings'
+import { liftSetAside } from '../Nexus/folderEntity'
@@ deleteOp @@
   if (isContainer(req)) {
-    const refused = await exclusionWriteRefusal(root, await excludedWithin(root, req.path))
-    if (refused) return refused
+    const lifted = await liftSetAside(root, abs)
+    if (!lifted.ok) return lifted
   }
   // Write-ahead: the record lands before any sweep destroys what it describes; …
~
       ...(gone.cascade.warning ? { partial: true as const } : {}),
     })
-  if (isContainer(req)) await releaseExcludedFolders(root, rel)
   const reach = edit ? reachReport(await reachConfig(root, edit)) : null
```

```Core/Trash/gather.ts diff
@@ imports @@
 import { basename, dirname, isAtOrUnder, join, relative } from '../Paths/posix'
-import { excludedWithin } from '../Settings/settings'
 import { stampedIdOf } from '../Files/pageFile'
@@ gatherContentRecord @@
   return {
     entity: kind,
     ...(id ? { id } : {}),
     parent,
-    ...(kind === 'page' ? {} : { excluded: await excludedWithin(root, relative(root, abs)) }),
   }
```

```Core/Trash/record.ts diff
@@ imports @@
-import { hiddenName, rootSegs } from '../Paths/exclusion'
+import { hiddenName } from '../Paths/exclusion'
@@ contentRecord @@
     parent: parentRef,
-    /** The excluded entries a Collection or Set held, relative to it, so a restore lands with them wherever it lands. */
-    excluded: z.array(z.string().refine((p) => rootSegs(p).length > 0)).optional(),
     /** Each Link value the delete stripped from a page outside it, by that page's id and the property's, so a restore can put it back. */
```

```Core/Trash/spend.ts diff
@@ imports @@
-import { basename, dirname, join, relative } from '../Paths/posix'
+import { basename, dirname, join } from '../Paths/posix'
~
-import { exclusionWriteRefusal, readLiveSetting, reseatExcludedFolders } from '../Settings/settings'
+import { readLiveSetting } from '../Settings/settings'
@@ restoreArtifact @@
   const targetAbs = join(root, dir, finalName)
-  const targetRel = relative(root, targetAbs)
   if (record.entity === 'collection' || record.entity === 'set') {
-    const refused =
-      (await landingRefusal(root, join(root, dir), finalName)) ??
-      (await exclusionWriteRefusal(root, record.excluded ?? []))
+    const refused = await landingRefusal(root, join(root, dir), finalName)
     if (refused) return refused
   }
~
   try {
     await machine().mkdir(dirname(targetAbs))
-    await relocate(
-      artifactAbs,
-      targetAbs,
-      record.entity === 'collection' || record.entity === 'set'
-        ? () => reseatExcludedFolders(root, targetRel, record.excluded ?? [])
-        : undefined,
-    )
+    await relocate(artifactAbs, targetAbs)
   } catch (e) {
```

```Core/Settings/settings.ts diff
@@ excludedWithin, editExcluded @@
-/** The excluded entries at or under `rel`, each relative to it. */
-export const excludedWithin = async (root: string, rel: string): Promise<string[]> =>
-  (await readWatchScope(root)).excluded.flatMap((entry) => entryWithin(entry, rel)?.join('/') ?? [])
-
-async function editExcluded(root: string, edit: (excluded: string[]) => string[]): Promise<void> {
-  const { excluded } = await readWatchScope(root)
-  const next = normalizeExclusions(edit(excluded)).folders
-  if (next.length !== excluded.length || next.some((entry, i) => entry !== excluded[i]))
-    await writeExcludedFolders(root, next)
-}
-
 /** A Collection or Set moving from `from` to `to` carries every excluded entry … */
 export async function carrySetAside(
~
@@ exclusionWriteRefusal, releaseExcludedFolders, reseatExcludedFolders @@
-/** A landing that moves excluded entries rewrites the settings file, so it refuses before anything moves while that file can't be written. */
-export async function exclusionWriteRefusal(
-  root: string,
-  entries: readonly string[],
-): Promise<Result<never> | null> {
-  if (!entries.length) return null
-  const settings = await updateNexusConfig(root, 'settings', () => null)
-  return settings.ok ? null : settings
-}
-
-/** A trashed Collection or Set takes its excluded entries with it; its record keeps them relative to it. */
-export async function releaseExcludedFolders(root: string, rel: string): Promise<void> {
-  await editExcluded(root, (excluded) =>
-    excluded.filter((entry) => entryWithin(entry, rel) === null),
-  )
-}
-
-/** A restored Collection or Set lands with the entries its record kept. */
-export const reseatExcludedFolders = (root: string, rel: string, within: string[]): Promise<void> =>
-  editExcluded(root, (excluded) => [...excluded, ...within.map((rest) => `${rel}/${rest}`)])
-
 /** An `undefined` value resets the key to its built-in default — JSON omits it. */
```

```Core/Nexus/mutate.test.ts diff
@@ :3300 @@
-  it('refuses a Set moved, or a Collection restored, with excluded entries while settings.json can’t be written', async () => {
+  it('refuses a Set moved with excluded entries while settings.json can’t be written', async () => {
     await mkdir(join(root, 'Notes', 'Daily', 'Private'), { recursive: true })
-    await mkdir(join(root, 'Other', 'Kept', 'Private'), { recursive: true })
-    await writeFile(join(root, 'Other', '_pagecollection.json'), JSON.stringify({ id: 'ot' }))
-    await writeFile(join(root, 'Other', 'Kept', '_pageset.json'), JSON.stringify({ id: 'ok' }))
     await mkdir(join(root, 'Third'))
     await writeFile(join(root, 'Third', '_pagecollection.json'), JSON.stringify({ id: 'th' }))
-    await exclude(['Notes/Daily/Private', 'Other/Kept/Private'])
-    const deleted = await settledMutate(
-      root,
-      { op: 'delete', path: 'Other', kind: 'collection' },
-      nexusDeps,
-    )
-    const bundlePath = (deleted.ok && deleted.value.trashed?.bundlePath) || ''
-    await refreshTree(root)
+    await exclude(['Notes/Daily/Private'])
     await writeFile(join(root, '.nexus', 'settings.json'), '{ corrupt')
     const moved = await settledMutate(
       root,
       { op: 'moveSet', path: 'Notes/Daily', newParentPath: 'Third', order: [] },
       nexusDeps,
     )
     expect(moved.ok ? '' : moved.error.message).toContain('settings.json')
-    const restored = await settledMutate(root, { op: 'restore', bundlePath }, nexusDeps)
-    expect(restored.ok ? '' : restored.error.message).toContain('settings.json')
     expect(await pathExists(join(root, 'Notes', 'Daily', 'Private'))).toBe(true)
-    expect(await pathExists(join(root, 'Other'))).toBe(false)
     const reordered = await settledMutate(
       root,
       { op: 'moveSet', path: 'Notes/Daily', newParentPath: 'Notes', order: [] },
       nexusDeps,
     )
     expect(reordered.ok).toBe(true)
   })
+
+  it('a Collection restores under an unreadable settings.json, writing no settings', async () => {
+    await mkdir(join(root, 'Other', 'Kept', 'Private'), { recursive: true })
+    await writeFile(join(root, 'Other', '_pagecollection.json'), JSON.stringify({ id: 'ot' }))
+    await writeFile(join(root, 'Other', 'Kept', '_pageset.json'), JSON.stringify({ id: 'ok' }))
+    await exclude(['Other/Kept/Private'])
+    const deleted = await settledMutate(
+      root,
+      { op: 'delete', path: 'Other', kind: 'collection' },
+      nexusDeps,
+    )
+    const bundlePath = (deleted.ok && deleted.value.trashed?.bundlePath) || ''
+    expect(await pathExists(join(root, 'Private'))).toBe(true)
+    expect(await excludedOnDisk()).toEqual(['Private'])
+    await refreshTree(root)
+    await writeFile(join(root, '.nexus', 'settings.json'), '{ corrupt')
+    const restored = await settledMutate(root, { op: 'restore', bundlePath }, nexusDeps)
+    expect(restored.ok).toBe(true)
+    expect(await pathExists(join(root, 'Other', 'Kept', '_pageset.json'))).toBe(true)
+    expect(await pathExists(join(root, 'Other', 'Kept', 'Private'))).toBe(false)
+    expect(await pathExists(join(root, 'Private'))).toBe(true)
+    expect(await read('.nexus/settings.json')).toBe('{ corrupt')
+  })
@@ :3334 @@
-  it('takes a trashed Collection’s entries with it and lands them wherever it is restored', async () => {
+  it('lifts a trashed Collection’s excluded folder to the root, its entry following, and restores the Collection without it', async () => {
     await mkdir(join(root, 'Other', 'Daily'), { recursive: true })
     await writeFile(join(root, 'Other', '_pagecollection.json'), JSON.stringify({ id: 'ot' }))
     await writeFile(join(root, 'Other', 'Daily', '_pageset.json'), JSON.stringify({ id: 'od' }))
     await exclude(['Other/Daily'])
     const deleted = await settledMutate(
       root,
       { op: 'delete', path: 'Other', kind: 'collection' },
       nexusDeps,
     )
-    const bundlePath = deleted.ok ? deleted.value.trashed?.bundlePath : undefined
-    expect(bundlePath).toBeDefined()
-    expect(await excludedOnDisk()).toBeUndefined()
-    await settledMutate(
-      root,
-      { op: 'createContainer', id: newId(), parentPath: '', kind: 'collection', name: 'Other' },
-      nexusDeps,
-    )
-    await writeFile(
-      join(root, '.nexus', 'settings.json'),
-      JSON.stringify({ excluded_folders: ['Other/Drafts'] }),
-    )
-    await refreshTree(root)
-    const r = await settledMutate(root, { op: 'restore', bundlePath: bundlePath ?? '' }, nexusDeps)
-    expect(r).toEqual({ ok: true, value: {} })
-    expect(await excludedOnDisk()).toEqual(['Other/Drafts', 'Other (2)/Daily'])
+    const bundlePath = deleted.ok ? (deleted.value.trashed?.bundlePath ?? '') : ''
+    expect(await readJson('Daily/_pageset.json')).toEqual({ id: 'od' })
+    expect(await excludedOnDisk()).toEqual(['Daily'])
+    expect(await readdir(join(root, bundlePath, 'Other'))).toEqual(['_pagecollection.json'])
+    expect('excluded' in (await readJson(`${bundlePath}/_record.json`))).toBe(false)
+    const r = await settledMutate(root, { op: 'restore', bundlePath }, nexusDeps)
+    expect(r).toEqual({ ok: true, value: {} })
+    expect(await readdir(join(root, 'Other'))).toEqual(['_pagecollection.json'])
+    expect(await excludedOnDisk()).toEqual(['Daily'])
+    expect(heldTreeOf(root)?.collections.map((c) => c.path).sort()).toEqual(['Notes', 'Other'])
   })
@@ :3362 @@
-  it('reports a Collection delete and its restore to Sync as one rename each, the restore after its entries hold again', async () => {
+  it('reports the lift, the Collection delete, and its restore to Sync as one rename each, every one under settings already excluding the lifted folder', async () => {
~
       expect(deleted.ok).toBe(true)
-      expect(renames).toHaveLength(1)
-      const bundled = renames[0].to
-      expect(renames[0].from).toBe(folder)
+      expect(renames).toHaveLength(2)
+      const bundled = renames[1].to
+      expect(renames[1].from).toBe(folder)
       expect(bundled.endsWith('.deleted/Other')).toBe(true)
~
       expect(renames.map(({ from, to }) => [from, to])).toEqual([
+        [join(folder, 'Daily'), join(root, 'Daily')],
         [folder, bundled],
         [bundled, folder],
       ])
-      expect(renames[1].excluded).toEqual(['Other/Daily'])
+      expect(renames.map(({ excluded }) => excluded)).toEqual([['Daily'], ['Daily'], ['Daily']])
       const inside = (path: string): boolean =>
         path.startsWith(`${folder}/`) || path.startsWith(`${bundled}/`)
-      expect(wrote.filter(inside)).toEqual([])
+      expect(wrote.filter(inside)).toEqual([join(folder, 'Daily')])
@@ after 'carries the asset directory with a moved Set' @@
+  it('steps a lifted folder aside past every name its parent holds, the Set’s own among them, and the Set’s restore keeps its name', async () => {
+    for (const rel of ['Omega', 'Daily/Omega', 'Daily/Daily'])
+      await mkdir(join(root, 'Notes', rel), { recursive: true })
+    await exclude(['Notes/Omega', 'Notes/Daily/Omega', 'Notes/Daily/Daily'])
+    const deleted = await settledMutate(
+      root,
+      { op: 'delete', path: 'Notes/Daily', kind: 'set' },
+      nexusDeps,
+    )
+    const bundlePath = deleted.ok ? (deleted.value.trashed?.bundlePath ?? '') : ''
+    expect(await excludedOnDisk()).toEqual(['Notes/Omega', 'Notes/Omega (2)', 'Notes/Daily (2)'])
+    for (const rel of ['Omega', 'Omega (2)', 'Daily (2)'])
+      expect(await pathExists(join(root, 'Notes', rel))).toBe(true)
+    const restored = await settledMutate(root, { op: 'restore', bundlePath }, nexusDeps)
+    expect(restored.ok).toBe(true)
+    expect(await pathExists(join(root, 'Notes', 'Daily', 'Alpha.md'))).toBe(true)
+  })
+
+  it('lifts only the outermost of nested excluded folders, the inner one riding inside it', async () => {
+    await mkdir(join(root, 'Notes', 'Daily', 'Gamma', 'Omega', 'Deep'), { recursive: true })
+    await exclude(['Notes/Daily/Gamma/Omega', 'Notes/Daily/Gamma/Omega/Deep'])
+    const r = await settledMutate(
+      root,
+      { op: 'delete', path: 'Notes/Daily', kind: 'set' },
+      nexusDeps,
+    )
+    expect(r.ok).toBe(true)
+    expect(await pathExists(join(root, 'Notes', 'Omega', 'Deep'))).toBe(true)
+    expect(await excludedOnDisk()).toEqual(['Notes/Omega', 'Notes/Omega/Deep'])
+  })
+
+  it('lifts the asset directory out of a trashed Set, its setting following', async () => {
+    await mkdir(join(root, 'Notes', 'Daily', 'Media'), { recursive: true })
+    await writeFile(join(root, 'Notes', 'Daily', 'Media', 'Pic.png'), 'bytes')
+    await writeFile(
+      join(root, '.nexus', 'settings.json'),
+      JSON.stringify({ asset_directory: 'Notes/Daily/Media' }),
+    )
+    await refreshTree(root)
+    const r = await settledMutate(
+      root,
+      { op: 'delete', path: 'Notes/Daily', kind: 'set' },
+      nexusDeps,
+    )
+    expect(r.ok).toBe(true)
+    expect(await read('Notes/Media/Pic.png')).toBe('bytes')
+    expect((await readJson('.nexus/settings.json')).asset_directory).toBe('Notes/Media')
+    expect(heldTreeOf(root)?.config.assetDirectory).toBe('Notes/Media')
+  })
+
+  it('lifts under the system Trash Mode too, so the system trash never takes an excluded folder', async () => {
+    await mkdir(join(root, 'Notes', 'Daily', 'Private'), { recursive: true })
+    await writeFile(join(root, 'Notes', 'Daily', 'Private', 'Kept.md'), '# Kept\n')
+    await exclude(['Notes/Daily/Private'])
+    const trashToSystem = vi.fn((p: string) => rm(p, { recursive: true, force: true }))
+    const r = await settledMutate(
+      root,
+      { op: 'delete', path: 'Notes/Daily', kind: 'set' },
+      { trashMode: 'system', trashToSystem },
+    )
+    expect(r.ok).toBe(true)
+    expect(trashToSystem.mock.calls).toEqual([[join(root, 'Notes', 'Daily')]])
+    expect(await read('Notes/Private/Kept.md')).toBe('# Kept\n')
+    expect(await excludedOnDisk()).toEqual(['Notes/Private'])
+  })
+
+  it('lifts an excluded folder and the asset directory spelled apart only by case once', async () => {
+    await mkdir(join(root, 'Notes', 'Daily', 'Media'), { recursive: true })
+    await writeFile(join(root, 'Notes', 'Daily', 'Media', 'Pic.png'), 'bytes')
+    await writeFile(
+      join(root, '.nexus', 'settings.json'),
+      JSON.stringify({
+        excluded_folders: ['Notes/Daily/Media'],
+        asset_directory: 'Notes/Daily/media',
+      }),
+    )
+    await refreshTree(root)
+    const r = await settledMutate(
+      root,
+      { op: 'delete', path: 'Notes/Daily', kind: 'set' },
+      nexusDeps,
+    )
+    expect(r.ok).toBe(true)
+    expect(await read('Notes/Media/Pic.png')).toBe('bytes')
+    expect(await readJson('.nexus/settings.json')).toEqual({
+      excluded_folders: ['Notes/Media'],
+      asset_directory: 'Notes/Media',
+    })
+  })
+
+  it('leaves an entry naming no folder where it stands, lifting nothing for it', async () => {
+    await exclude(['Notes/Daily/Gone'])
+    const r = await settledMutate(
+      root,
+      { op: 'delete', path: 'Notes/Daily', kind: 'set' },
+      nexusDeps,
+    )
+    expect(r.ok).toBe(true)
+    expect(await excludedOnDisk()).toEqual(['Notes/Daily/Gone'])
+    expect(await pathExists(join(root, 'Notes', 'Gone'))).toBe(false)
+  })
```

`newId` stays imported (used throughout the file); the `:3334` rewrite drops only its own use.

```.claude/scripts/Archive Drive/live-drive.mjs (new)
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import {
  ask, chooseNative, click, launch, mintPageId, mouseClick, must, NEXUS, restore, results, settles, shot, sleep, until,
} from '../drive-harness.mjs'

const PORT = 9393
// The plan's phases in order, named as the plan names them, so `6A` sorts before `6B`.
const PHASES = ['1', '2', '3', '4', '5', '6A', '6B']
const at = (phase) => PHASES.indexOf(String(phase))
const ALL = ['1']
const GROUPS = new Set(process.argv.slice(2))
// The last plan phase landed in the build under test: an item owned by a later phase is expected to fail and doesn't fail the run.
const LANDED = process.env.POMMORA_ARCHIVE_LANDED ?? '1'
if (GROUPS.size === 0 || [...GROUPS].some((g) => !ALL.includes(g)) || at(LANDED) < 0) {
  console.error(`usage: POMMORA_ARCHIVE_LANDED=<${PHASES.join('|')}> node live-drive.mjs <group…>   (groups ${ALL.join(', ')}, each the plan phase of its name)`)
  process.exit(2)
}

// ── Items ───────────────────────────────────────────────────────────────────

const ledger = []
/** One assertion, owned by the plan phase that lands it and the decision it proves, printed as MATRIX.md lists it. */
function item(group, phase, decision, name, pass, detail) {
  const awaited = at(phase) > at(LANDED)
  const mark = pass ? (awaited ? 'AHEAD' : 'PASS') : awaited ? 'AWAIT' : 'FAIL'
  console.log(`${mark.padEnd(5)}  [g${group} ${decision}] ${name}${!pass && detail ? `\n       ${detail}` : ''}`)
  results.push({ name, pass: !!pass || awaited })
  ledger.push({ group: String(group), phase, decision, name, mark })
}
const show = (v) => JSON.stringify(v)
const same = (a, b) => show(a) === show(b)

// ── The Nexus on disk ───────────────────────────────────────────────────────

const COLLECTION = 'Collection A'
const abs = (rel) => join(NEXUS, rel)
const exists = (rel) => existsSync(abs(rel))
const readRel = (rel) => readFileSync(abs(rel), 'utf8')
const settingsOnDisk = () => JSON.parse(readRel('.nexus/settings.json'))
const config = async (cdp) => (await ask(cdp, 'nexus:state')).value.tree.config
const containerId = () => { const id = mintPageId(); return `${id.slice(0, 10)}0${id.slice(11)}` }
const makeSet = (cdp, name) =>
  must(`Set ${name}`, ask(cdp, 'mutate', { op: 'createContainer', id: containerId(), parentPath: COLLECTION, kind: 'set', name }))
/** Through Settings' own channel, held by the tree before any folder it names exists, so none is ever adopted as a Set. */
async function exclude(cdp, folders) {
  await must('exclusions:set', ask(cdp, 'exclusions:set', folders))
  await until('the exclusions in the tree', async () => same((await config(cdp)).excluded, folders))
}
const KEEP = '# Keep\n'
/** A folder Pommora leaves alone, holding a page with no ID as an outside editor leaves one. */
function setAside(rel) {
  mkdirSync(abs(rel), { recursive: true })
  writeFileSync(abs(`${rel}/Keep.md`), KEEP)
}
/** Its page never stamped and no sidecar written: the folder was never read as a Set. */
const untouched = (rel) => exists(`${rel}/Keep.md`) && readRel(`${rel}/Keep.md`) === KEEP && !exists(`${rel}/_pageset.json`)
const bundleOf = (name) => readdirSync(abs(`.trash/${COLLECTION}`)).find((n) => n.endsWith(`__${name}.deleted`))
const PIXEL = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==', 'base64')

// ── The sidebar ─────────────────────────────────────────────────────────────

const sidebarRow = (title) => `[...document.querySelectorAll('.row span')].findLast((e) => e.textContent.trim() === ${JSON.stringify(title)})`
const drawn = (cdp, title) => cdp.evaluate(`!!(${sidebarRow(title)})`)
const DIALOG = `document.querySelector('[role="alertdialog"]')`
/** A folded row's chevron pressed as a pointer presses it, since the chevron is an svg, which takes no `.click()`. */
async function unfold(cdp, title, child) {
  if (await drawn(cdp, child)) return
  await mouseClick(cdp, `${sidebarRow(title)}.closest('.row').querySelector('[data-drop-outline]')`)
  await until(`${child} in the sidebar`, () => drawn(cdp, child))
  await sleep(400)
}
/** Right-click, the native menu's Delete, and the confirmation's Delete, as a user deletes a Set: the menu as chosen and the question asked. */
async function deleteFromSidebar(cdp, title) {
  await unfold(cdp, COLLECTION, title)
  const menu = await chooseNative(cdp, sidebarRow(title), 'Delete')
  await until('the confirmation', () => cdp.evaluate(`!!${DIALOG}`))
  const asked = await cdp.evaluate(`${DIALOG}.getAttribute('aria-label')`)
  await click(cdp, `[...${DIALOG}.querySelectorAll('button')].find((b) => b.textContent.trim() === 'Delete')`)
  return { menu, asked }
}

// ── Group 1 — the lift and the carry (Phase 1) ──────────────────────────────

async function group1(cdp) {
  const LIFT = `${COLLECTION}/AR Lift`
  const MOVED = `${COLLECTION}/AR Moved`
  const LIFTED = `${COLLECTION}/Private`
  await makeSet(cdp, 'AR Lift')
  await exclude(cdp, [`${LIFT}/Private`])
  setAside(`${LIFT}/Private`)

  const renamed = await ask(cdp, 'mutate', { op: 'rename', path: LIFT, kind: 'set', newName: 'AR Moved' })
  await settles(async () => same(settingsOnDisk().excluded_folders, [`${MOVED}/Private`]))
  const carried = (await config(cdp)).excluded
  item(1, 1, 'K-1', 'a renamed Set carries its excluded entry to the landing',
    renamed.ok && same(settingsOnDisk().excluded_folders, [`${MOVED}/Private`]) && same(carried, [`${MOVED}/Private`]),
    show({ renamed, onDisk: settingsOnDisk().excluded_folders, carried }))
  item(1, 1, 'K-1', 'the carried folder moves with the Set and is never read as one',
    untouched(`${MOVED}/Private`) && !exists(LIFT), show(exists(MOVED) && readdirSync(abs(MOVED))))

  const { menu, asked } = await deleteFromSidebar(cdp, 'AR Moved')
  await settles(async () => exists(LIFTED) && !exists(MOVED))
  await sleep(800)
  await shot(cdp, 'g1-lifted')
  const bundle = bundleOf('AR Moved')
  const record = bundle ? JSON.parse(readRel(`.trash/${COLLECTION}/${bundle}/_record.json`)) : null
  item(1, 1, 'F-3', "the sidebar's Delete asks, and the Set goes to the Trash",
    menu.chosen && asked === 'Delete “AR Moved”?' && !exists(MOVED) && !!bundle, show({ menu, asked, bundle }))
  item(1, 1, 'F-3', 'its excluded folder is left behind in Collection A, untouched',
    untouched(LIFTED), show(exists(LIFTED) && readdirSync(abs(LIFTED))))
  item(1, 1, 'F-3', "the folder's entry follows it",
    same(settingsOnDisk().excluded_folders, [LIFTED]), show(settingsOnDisk().excluded_folders))
  item(1, 1, 'F-3', 'the bundle holds no excluded folder, and its record names none',
    !!record && !exists(`.trash/${COLLECTION}/${bundle}/AR Moved/Private`) && !('excluded' in record), show(record))
  item(1, 1, 'F-3', 'the sidebar draws neither the Set nor the lifted folder',
    !(await drawn(cdp, 'AR Moved')) && !(await drawn(cdp, 'Private')))

  const back = await ask(cdp, 'mutate', { op: 'restore', bundlePath: `.trash/${COLLECTION}/${bundle}` })
  await settles(() => drawn(cdp, 'AR Moved'))
  item(1, 1, 'F-2', 'the restored Set returns without the folder, which stays where it was left',
    back.ok && exists(`${MOVED}/_pageset.json`) && !exists(`${MOVED}/Private`) && untouched(LIFTED) && same(settingsOnDisk().excluded_folders, [LIFTED]),
    show({ back, moved: exists(MOVED) && readdirSync(abs(MOVED)), excluded: settingsOnDisk().excluded_folders }))
  item(1, 1, 'F-2', 'the sidebar draws the Set again, and never the folder',
    (await drawn(cdp, 'AR Moved')) && !(await drawn(cdp, 'Private')))

  await makeSet(cdp, 'AR Second')
  await exclude(cdp, [LIFTED, `${COLLECTION}/AR Second/Private`])
  setAside(`${COLLECTION}/AR Second/Private`)
  const second = await ask(cdp, 'mutate', { op: 'delete', path: `${COLLECTION}/AR Second`, kind: 'set' })
  await settles(async () => exists(`${LIFTED} (2)`))
  item(1, 1, 'F-2', 'a folder lifted onto a namesake steps aside to Private (2), its entry following',
    second.ok && untouched(`${LIFTED} (2)`) && untouched(LIFTED) && same(settingsOnDisk().excluded_folders, [LIFTED, `${LIFTED} (2)`]),
    show({ second, excluded: settingsOnDisk().excluded_folders }))

  const CARRY = `${COLLECTION}/AR Carry`
  const MEDIA = `${COLLECTION}/AR Media`
  await makeSet(cdp, 'AR Carry')
  // Written from outside, ahead of the folder: assets:setDir would refuse a folder the watcher already adopted as a Set, and its migration would move ~/Test's own assets.
  writeFileSync(abs('.nexus/settings.json'), `${JSON.stringify({ ...settingsOnDisk(), asset_directory: `${CARRY}/Media` }, null, 2)}\n`)
  await until('the asset directory in the tree', async () => (await config(cdp)).assetDirectory === `${CARRY}/Media`)
  mkdirSync(abs(`${CARRY}/Media`))
  writeFileSync(abs(`${CARRY}/Media/Pixel.png`), PIXEL)
  await sleep(1000)
  const carriedAsset = await ask(cdp, 'mutate', { op: 'rename', path: CARRY, kind: 'set', newName: 'AR Media' })
  await settles(async () => settingsOnDisk().asset_directory === `${MEDIA}/Media`)
  item(1, 1, 'K-1', 'a renamed Set carries the asset directory to the landing, the asset file with it',
    carriedAsset.ok && exists(`${MEDIA}/Media/Pixel.png`) && !exists(`${MEDIA}/Media/_pageset.json`) &&
      (await config(cdp)).assetDirectory === `${MEDIA}/Media` && same(settingsOnDisk().excluded_folders, [LIFTED, `${LIFTED} (2)`]),
    show({ carriedAsset, onDisk: settingsOnDisk() }))

  const media = await ask(cdp, 'mutate', { op: 'delete', path: MEDIA, kind: 'set' })
  await settles(async () => exists(`${COLLECTION}/Media/Pixel.png`))
  item(1, 1, 'F-2', 'the asset directory is left behind by a trashed Set, its setting following',
    media.ok && exists(`${COLLECTION}/Media/Pixel.png`) && !exists(`${COLLECTION}/Media/_pageset.json`) &&
      settingsOnDisk().asset_directory === `${COLLECTION}/Media` && (await config(cdp)).assetDirectory === `${COLLECTION}/Media`,
    show({ media, onDisk: settingsOnDisk().asset_directory }))

  // The lifted folders leave the disk while still set aside, so none is adopted once ~/Test's own settings return.
  for (const rel of [LIFTED, `${LIFTED} (2)`, `${COLLECTION}/Media`]) rmSync(abs(rel), { recursive: true, force: true })
  await must('exclusions:set []', ask(cdp, 'exclusions:set', []))
  await must("assets:setDir ''", ask(cdp, 'assets:setDir', ''))
  await until("~/Test's own scope", async () => {
    const { excluded, assetDirectory } = await config(cdp)
    return excluded.length === 0 && assetDirectory === '.nexus/assets'
  })
}

// ── The run ─────────────────────────────────────────────────────────────────

let cdp
try {
  cdp = (await launch(PORT, 'archive-shots')).cdp
  if (GROUPS.has('1')) await group1(cdp)
  cdp.close()
} catch (e) {
  item(0, 1, '—', 'the run reached its end', false, String(e?.stack ?? e))
  if (cdp) await shot(cdp, 'failure').catch(() => {})
} finally {
  await restore()
}
const count = (f) => ledger.filter(f).length
console.log('\ngroup  pass  fail  ahead  await')
for (const g of ['0', ...ALL].filter((g) => g === '0' || GROUPS.has(g))) {
  const of = (m) => count((r) => r.group === g && r.mark === m)
  console.log(`${g.padStart(5)} ${String(of('PASS')).padStart(5)} ${String(of('FAIL')).padStart(5)} ${String(of('AHEAD')).padStart(6)} ${String(of('AWAIT')).padStart(6)}`)
}
console.log(`${results.filter((r) => r.pass).length}/${results.length} held (an item awaiting a later phase than ${LANDED} holds by definition)`)
process.exit(results.every((r) => r.pass) ? 0 : 1)
```

```.claude/scripts/Archive Drive/MATRIX.md (new)
## Archive Drive — Matrix

The drive's cases, derived from *Archive — Decisions & Intention* and written to the end-state contract of *Archive — Implementation Plan*'s AFTER blocks. Each group lands with the plan phase of its number and drives the channels the interface calls, with a real gesture wherever the decision names one. Every check prints as `[g<group> <decisions>] <name>`, so a run reads against the tables below line for line, and a check owned by a phase past `POMMORA_ARCHIVE_LANDED` (default 1) prints `AWAIT` and leaves the exit code alone. `~/Test` holds no excluded folder and names no asset directory, so each group seeds its own Sets and settings and puts the settings back; the harness restores `~/Test` when the run ends.

#### Group 1 — The Lift and the Carry

| Case | Seeds | Operation | Expected | Decisions |
| --- | --- | --- | --- | --- |
| The carry | Set `AR Lift`; `AR Lift/Private` excluded through `exclusions:set`, then written with `Keep.md` | `mutate` rename to `AR Moved` | `excluded_folders` and the held scope read `Collection A/AR Moved/Private`; the folder moved with its page unstamped and no sidecar | K-1 |
| The lift, by gesture | as above | the sidebar row's right-click › Delete › the confirmation's Delete | the question reads `Delete “AR Moved”?`; `Collection A/Private` holds `Keep.md` untouched; the entry reads `Collection A/Private`; the bundle holds no `Private` and its record no `excluded`; the sidebar draws neither row | F-3 |
| The restore | the bundle above, found under `.trash/Collection A/` | `mutate` restore | `AR Moved` returns without `Private`, which stays where it was left; the entry is unchanged; the sidebar draws the Set and never the folder | F-2 |
| A namesake | Set `AR Second`; `AR Second/Private` excluded beside `Collection A/Private` | `mutate` delete | the folder lands as `Private (2)`, both folders untouched and both entries held | F-2 |
| The asset directory's carry | Set `AR Carry`; `asset_directory` written from outside ahead of `AR Carry/Media/Pixel.png` | `mutate` rename to `AR Media` | `AR Media/Media/Pixel.png`, no sidecar; `asset_directory` and the held scope read `Collection A/AR Media/Media`; `excluded_folders` holds only the two lifted folders | K-1 |
| The asset directory | the carry above | `mutate` delete | `Collection A/Media/Pixel.png`, no sidecar; `asset_directory` and the held scope read `Collection A/Media` | F-2 |

#### Pruned

- **The write order, a case-only rename, the single watcher restart, nesting, an entry naming no folder, and the corrupt-settings refusals:** none is visible, and `mutate.test.ts` and `settings.test.ts` pin each.
- **The system Trash Mode:** the drive would leave its Set in the macOS Trash; `mutate.test.ts` pins the lift under it.
- **The Trash browser's Restore:** Phase 2 renames its channel and Phase 5 rebuilds the browser, so group 1 restores through `mutate` and later groups drive the browser in its final form.
```

**VERIFY**

- [ ] The listed tests pass; `mutate.test.ts:3276` passes unchanged; `spend.test.ts:1527`, `deleteOrder.test.ts`, and `trashRecovery.test.ts` pass unchanged.
- [ ] `git grep -n "excludedWithin\|editExcluded\|exclusionWriteRefusal\|releaseExcludedFolders\|reseatExcludedFolders\|followExcludedFolders" -- Core Desktop` finds nothing.
- [ ] `git grep -n "excluded" -- Core/Trash ':!*.test.ts'` finds nothing.
- [ ] `git grep -n "^export" -- Core/Settings/settings.ts` lists, of the exclusion block, `writeAssetDirectory`, `writeExcludedFolders`, `carrySetAside`, and `sanitizeExclusions` alone.
- [ ] Run the gates.
- [ ] `node ".claude/scripts/Archive Drive/live-drive.mjs" 1` exits 0 with every group-1 check `PASS`, and `~/Test` is restored.
- [ ] Check for unnecessary code or mistakes.

**Lines:** −21 (+31 / −52), none moved. By file: `folderEntity.ts` +23 / −3 (the lift +19, imports +4 / −3); `delete.ts` +3 / −4, `gather.ts` −2, `record.ts` +1 / −2, and `spend.ts` +4 / −13, the F-3 removals −13 across the four; `settings.ts` −28. Comments apart, −3. Tests about +111 apart; the Archive Drive apart: `live-drive.mjs` +189 and `MATRIX.md` +20.

#### Review Checkpoint

- [ ] `Core/Settings/settings.test.ts › carrySetAside` (four cases) and the sixteen new or rewritten cases in `Core/Nexus/mutate.test.ts › handleMutate — excluded entries follow their folders` pass, with `:3252`, `:3276`, `:3412`, `:3425`, `:3437`, `fileEvents.test.ts:298`, `:307`, and `spend.test.ts:1527` unchanged.
- [ ] Both VERIFY greps of Task 1-2 find nothing, and the exclusion block exports four functions.
- [ ] The gates pass from a clean state.
- [ ] Archive Drive group 1 passes in full under `POMMORA_ARCHIVE_LANDED=1`.
- [ ] Two `opus-high` read-only reviewers, to closeout-review's standards, find the carry's order (landing ahead of each source, one write ahead, one drop inside `landed`), the lift's ordering in `deleteOp`, and the removal of every excluded-entry path through the Trash complete and true, with no comment or test left describing the follow-after carry or the record's entries.

#### Departures and Disclosures

##### Departures From the Findings

- **The Landing Goes Just Ahead of Its Own Source (Cautionary 17):** the Findings put the landed entry first in the list, which would reorder the user's list: `mutate.test.ts:3252` asserts `['Archive', 'Elsewhere/Daily']` on disk and in `tree.config.excluded`, and landing-first answers `['Elsewhere/Daily', 'Archive']`. Each landing goes ahead of its own source instead, and `normalizeExclusions`' first-spelling dedupe (`Core/Settings/codec.ts:75-79`) still leaves one entry, the landed spelling, on a case-only rename, which the drop's "still within `to`" clause spares.
- **The Outermost Rule Compares Remainders With `entryWithin` (3.1):** the Findings keep the outermost through `remainderUnder`; `entryWithin` folds both sides itself (`Core/Paths/exclusion.ts:98-99`), so the lift imports one function and folds nothing by hand.
- **The Counterpart Rule Isn't Taken (3.2):** the carry's settings write raises its event first (`Core/Nexus/settle.ts:41-53` applies own events in order), `applySettings` owes the walk and the rescope (`fileEvents.ts:502-518`), and `reseed` runs `pusher.watch` alone when a rescope is owed (`settle.ts:177`, `:181-185`), so `applyMove`'s `owed.corpus` adds no second seed; Task 1-1's "a carried landing restarts the watcher once and seeds nothing twice" pins it. The rule's other credit, "a current tree inside `moveSetOp`", is inert: without it `applyMove` answers `'walk'` for a carried landing, so `reachConfig` (`Core/Nexus/configReach.ts:319-342`) reads a held tree with the moved Set at its old path, `editJsonStrict` answers `'absent'` for those sidecars and writes nothing, and tile views sourced from the Set fall out through the gone ids either way (`:349-353`); the settle's walk installs the true tree before the reply.

##### Behavior Changes and Disclosures

- **Empty Successes:** `relocateFolder` answers `Result<{ path }>` and `liftSetAside` `Result<null>`, the codebase's spelling of an empty success (`Core/Nexus/reorder.ts:72-79`); answering the path lets `renameFolderEntity` and `moveFolderEntity` return `relocateFolder(…)` directly.
- **The Asset Directory's One Value:** the carry can't hold both ends of a single setting, so a crash between the write ahead and the rename leaves `asset_directory` naming the landing with its source excluded: nothing is adopted, but its images don't resolve until the folder lands or the setting is picked again. A move that throws writes back what the carry read. K-1's crash safety covers the excluded entries; the asset directory is moved, which nothing did before.
- **A Delete Refused After the Lift:** a container delete refused once the lift has run, by the system trash refusing or a discard or bundle move throwing, leaves the lifted folders in the parent with the settings consistent; Phase 4's `archive` op lifts before it mints and inherits the same.
- **A Stale Entry:** an entry under a trashed container that names no folder on disk stays in Settings, where `releaseExcludedFolders` removed it with the delete; Task 1-2 states it.
- **No Record Loses Anything:** Findings 3.5's "no live record holds a non-empty `excluded`" holds at HEAD: the eight records under `~/NexusOS/.trash` and `~/Test/.trash` that carry the key all hold `excluded: []`.
- **The Drive's Asset Directory:** a folder made inside a Set in the running app is stamped as a Set first (`stampable` admits every container missing its sidecar, `Core/Nexus/fileEvents.ts:153-159`), which `validateAssetDir` then refuses (`Core/Settings/assetDirValidate.ts:31`), and `assets:setDir` runs `migrateAssets`, which would move `~/Test`'s `.nexus/assets` banners and profile image (`Core/Assets/assetMigrate.ts:167-170`). Group 1 writes the setting first and the folder after, from outside, and resets it through `assets:setDir ''`, whose migration answers null at the default.
- **The Scripts README:** its Archive Drive paragraph is a document, written in Task 7-1.

##### Found False at HEAD

- Findings 3.2's credit for the counterpart rule, above: the move adds no second reseed without it; every line this phase cites from *§Verified at HEAD › The Settle and Moves* and *› The Trash and Excluded Entries* reads as cited.

##### Line Total

- **+11 (+99 / −88):** 1-1 +32, 1-2 −21, under the plan's one counting rule (`view-delta`'s Actionable column: source with imports and blank lines as Biome wraps them; comments, tests, documents, and the drive out; moved lines on both sides, none moving here). Imports are −2 of it (+10 / −12), and comments −3 more. The drive group is apart: `live-drive.mjs` +189 and `MATRIX.md` +20.
- **Against the Estimate:** the estimate's ≈ −17 counted `editExcluded`'s removal in both tasks; counted once, it sits near the Findings' *§Removal & Consolidation* rows for this work (≈ −4: the carry −16 / +20, the refusal arms −15, `excludedWithin` −3, the release and reseat −9, the record −4, the release at delete −1, the restore −4, `relocateFolder` +6, the lift +22). The phase lands fifteen lines past those rows, in the carry: it is +34 where +20 was costed, since it also moves the asset directory and holds its source excluded until the folder lands, keeps the list's order, and answers the drop and the undo; `relocateFolder` runs the undo when the move throws, and `rekeyCrops` re-keys the asset directory's crops in the code `migrateAssets` gave up; the lift is +19 against +22; the removals land as costed, the five `settings.ts` functions at −28 once the blank lines between them count. What the phase adds is the behavior K-1 and F-2 require in its minimal form: one carry where four functions and two refusal arms stood, one crop re-key where `migrateAssets` held its own, and one lift where the record field, its gather, the release, the reseat, and the restore's refusal stood.

### Phase 2 — The Owner and the Format

**GOAL:** The Trash's bundle format, record, listing, placement, and rows move into `Core/Bundles/`, a neutral owner both stores import and that imports neither, parameterized by `BundleStore = { kind: 'trash' } | { kind: 'archive'; id }` through `layoutOf(store)` (`.trash` with `.deleted`; `archiveDirRel(id)` with `.archived`). One channel, `bundles:list(store)`, and one signal, `storesChanged`, serve either store. The Trash keeps its model and look, and gains an exact return to its origin's order (E-2) and a step-aside past the disk (E-4). Nothing archive-only lands: the Trash refuses an Archive bundle until Phase 4 routes it; `trail`, `archive`, `moveIntoStore`, the archive destination, `returningNames`, and `bundled` wait for Phase 4, and the row's `icon?` for Phase 6. Builds on Phase 1's AFTER: the record carries no `excluded`, `delete.ts` lifts set-aside folders before its mint, and `spend.ts` neither reseats nor asks `exclusionWriteRefusal`.

#### Task 2-1

**TASK:** Move the bundle format and record into `Core/Bundles/bundle.ts` and `Core/Bundles/record.ts`, parameterized by store, leaving `Core/Trash/bundle.ts` its Trash Mode half for Task 2-2; make the Trash's empty and restore refuse an Archive bundle; land the Archive's resolver block and inline `NON_CORPUS_TOP` (K-5).

**NOW:** `Core/Trash/bundle.ts:11-39` holds the format (`BUNDLE_SUFFIX`, `trashChainDir`, `deletedPathOf`, `fileStamp`, `stampedLeaf`, `mintBundle`); `:41-80` is Trash Mode's half, whose `trashFileFlat` mints through `trashChainDir` (`:43`). `Core/Trash/record.ts` holds the record union, `writePropertyBundle` (one caller, `deleteProperty.ts:66`), `appendLinks` (one caller, `parkLinks`), `readRecord`, and `bundleArtifact`. `Core/Trash/holdings.ts:18-96` holds the listing and its page helpers; `gather.ts:24-29`, `:61-74` hold `gatherParentRef` and `gatherContentRecord`; `spend.ts:58-64` holds a private `openBundle` refusing anything but `.trash/…​.deleted`; `trashRows.ts:12-19` parses the stamp as `deletedAtOf`. `NON_CORPUS_TOP` (`nexusPaths.ts:7-8`) has one reader, `nexusFolderRefusal` (`codec.ts:51`).

**CHANGE**

- [ ] Write and watch fail: `Core/Bundles/bundle.test.ts` (new, written in the AFTER) — `describe('layoutOf')` › "files the Trash under .trash and an Archive under its Collection’s id, each wearing its own suffix"; `describe('storeOf')` › "answers the store a bundle sits in by its root and its suffix", "answers null for a path neither store holds: an in-Nexus `.deleted`, a `.archived` outside `.nexus/archive`, the id folder itself, and either suffix under the other store"; `describe('mintBundle')` takes `atomicWrite.test.ts:273-307` whole, minting into `{ kind: 'trash' }`, plus "mirrors the chain under an Archive with its suffix"; `describe('originPathOf')` takes `trashRows.test.ts:234-240` in file-only form plus "reads an archived file under its Archive’s root the same way", "keeps a chain or artifact folder that wears the suffix, finding the bundle by its stamp", "a bundle wearing no stamp keeps its folder in the origin path"; `describe('listBundles')` › "lists an Archive’s bundles under its own root and suffix, and none of the Trash’s". `Core/Paths/exclusion.test.ts` › new `describe('the Archive’s segments')`: `archiveSegs(['.nexus', 'archive'])` → `[]`; `archiveSegs(['.nexus', 'archive', 'C1', 'A.md'])` → `['C1', 'A.md']`; `['.nexus']`, `['.nexus', 'contexts']`, `['Notes', 'archive']` → null; `archivedCollectionIdOf('.nexus/archive/C1/Alpha/2026-10-20T12-00-00-000Z__A.md.archived/A.md')` → `'C1'`; `.nexus/archive` and `Notes/A.md` → null. `Core/Trash/spend.test.ts` › "an Archive bundle is neither emptied nor restored as a Trash one": a bundle from `mintBundle(root, { kind: 'archive', id: <a ULID> }, join(root, 'Notes', 'Beta.md'))` holding `Beta.md` and a page record; `emptyBundle` → `Only a trash record can be emptied.`, `restore` → `Only a trash record can be spent.`; the bundle still holds `Beta.md` and its record.
- [ ] `nexusPaths.ts`: replace `NON_CORPUS_TOP` and its comment with `ARCHIVE_DIR_REL`, `archiveDirRel(collectionId)`, `archiveSegs(segs)` (the segments below `.nexus/archive`: `[]` for the folder itself, null outside it), and `archivedCollectionIdOf(rel)` (the first of those segments), beside `TRASH_DIR`. `codec.ts`: `nexusFolderRefusal` reads `[NEXUS_DIR, TRASH_DIR].includes(foldKey(segs[0]))`.
- [ ] `Core/Bundles/bundle.ts` (new): `BundleStore`, `layoutOf`, `storeOf`, `fileStamp`, `storedAtOf` (from `trashRows.ts:12-19`), `stampedLeaf`, `chainDir` (from `trashChainDir`, over the store's root), `mintBundle(root, store, absSource)`, `originPathOf(root, store, file)` (from `deletedPathOf`; finds the bundle segment by stamp and suffix from the file alone, for Phases 3 and 4), `bundleArtifact`, `ListedBundle`, `listBundles(root, store)`, `openBundle(root, bundleAbs)` → `{ store, record }`, `contentPages`, `pageIdsOf`, `originPagesIn(root, store)` (from `trashedPages`), `originPagesOf(root, store, files)` (from `trashedPagesOf`).
- [ ] `Core/Bundles/record.ts` (new): the record union, `RECORD_FILENAME` (exported for `appendLinks`), `RecordFile`, `writeRecord`, `readRecord`, and `gatherContentRecord` with `gatherParentRef` folded in (no `ParentRef` alias).
- [ ] `Core/Trash/bundle.ts` keeps Trash Mode's half alone (`trashFileFlat`, `TrashDeps`, `trashDeps`, `discardFile`); `trashFileFlat` mints through `chainDir(root, { kind: 'trash' }, …)`.
- [ ] Remove `Core/Trash/record.ts`: the format → `Bundles/record.ts`; `bundleArtifact` → `Bundles/bundle.ts`; `writePropertyBundle` → `Core/Properties/deleteProperty.ts`, exported beside `snapshot`; `appendLinks` → `holdings.ts`, private beside `parkLinks`.
- [ ] `holdings.ts`: narrow to `parkLinks`, `trashedHolders`, `refillTrashed`, and the private `appendLinks`, its header rewritten; `parkLinks` builds over `originPagesIn(root, { kind: 'trash' })`, `trashedHolders` lists through `listBundles(root, { kind: 'trash' })`.
- [ ] `gather.ts`: drop `gatherParentRef`, `gatherContentRecord`, and the imports only they used (`relative`, `stampedIdOf`, `liveTreeOf`, `containerAt`, `ContainerKind`, `ParentRef`); `RecordFile` from `../Bundles/record`.
- [ ] `spend.ts`: drop the private `openBundle`; `emptyBundle` and `restoreArtifact` open through the owner's and refuse any store but the Trash (`emptyBundle`: `Only a trash record can be emptied.`; `restoreArtifact`: HEAD's `Only a trash record can be spent.`); `emptyBundle` strips through `originPathOf(root, store, file)` and returns pages through `originPagesOf(root, store, files)`.
- [ ] `trashRows.ts`: `deletedAtOf` and `STAMP` leave for `storedAtOf`; `ListedBundle` from the owner.
- [ ] Sibling sweep, source: `Core/Trash/delete.ts` (`mintBundle(root, { kind: 'trash' }, abs)`; `contentPages`, `mintBundle`, `pageIdsOf` from the owner; `discardFile` still from `./bundle`), `Core/Trash/handlers.ts` (`listBundles(root, { kind: 'trash' })` from the owner), `restoreScrub.ts:31-32`, `restoreProperty.ts:5`, `resolve.ts:9`; `Desktop/Store/driver.ts:5` → `@pommora/core/Bundles/bundle`.
- [ ] Sibling sweep, tests: `listBundles` → `../Bundles/bundle` with `listBundles(root)` → `listBundles(root, { kind: 'trash' })` (`sed -i '' "s/listBundles(root)/listBundles(root, { kind: 'trash' })/g"` over the ten files) and `replaySchemaCascade.test.ts:234`'s `listBundles(crashed, { kind: 'trash' })`; `writePropertyBundle` → `../Properties/deleteProperty` (`spend.test.ts:14`, `trashRows.test.ts:11`, `replaySchemaCascade.test.ts:12`); `readRecord`/`bundleArtifact` → `../Bundles/record`/`../Bundles/bundle` (`spend.test.ts:14`, `trashRecovery.test.ts:12`, `replaySchemaCascade.test.ts:12`, `deleteProperty.test.ts:21`); `deleteOrder.test.ts:75` reads `bundleDir.endsWith('.deleted')` as `spend.test.ts:47` does, dropping its `BUNDLE_SUFFIX` import; `atomicWrite.test.ts:25` takes `mintBundle` from `../Bundles/bundle` (`discardFile`, `trashFileFlat` stay on `../Trash/bundle` until Task 2-2), its `describe('mintBundle')` moves to `bundle.test.ts`, and its `relocate` cases (`:311-325`) mint into `{ kind: 'trash' }`; `trashRows.test.ts`'s `describe('deletedPathOf')` moves to `bundle.test.ts`. `spend.test.ts:1542` › "only a trash bundle restores — an in-nexus path refuses" is retitled "a path neither store holds refuses to restore", body unchanged.

**AFTER**

```Core/Paths/nexusPaths.ts diff
@@ NON_CORPUS_TOP @@
 export const TRASH_DIR = '.trash'
 
-/** The walk, the index, and every mutation refuse these. Not the watcher — it watches `.nexus`. */
-export const NON_CORPUS_TOP: ReadonlySet<string> = new Set([NEXUS_DIR, TRASH_DIR])
+export const ARCHIVE_DIR_REL = `${NEXUS_DIR}/archive`
+
+export const archiveDirRel = (collectionId: string): string => `${ARCHIVE_DIR_REL}/${collectionId}`
+
+export const archiveSegs = (segs: string[]): string[] | null =>
+  `${segs[0]}/${segs[1]}` === ARCHIVE_DIR_REL ? segs.slice(2) : null
+
+export const archivedCollectionIdOf = (rel: string): string | null =>
+  archiveSegs(rel.split('/'))?.[0] ?? null
```

```Core/Settings/codec.ts diff
@@ imports @@
-import { ASSETS_DIR_REL, NON_CORPUS_TOP, NEXUS_CONFIG_FILES } from '../Paths/nexusPaths'
+import { ASSETS_DIR_REL, NEXUS_CONFIG_FILES, NEXUS_DIR, TRASH_DIR } from '../Paths/nexusPaths'
@@ nexusFolderRefusal @@
-  if (NON_CORPUS_TOP.has(foldKey(segs[0]))) return 'That folder belongs to the app.'
+  if ([NEXUS_DIR, TRASH_DIR].includes(foldKey(segs[0]))) return 'That folder belongs to the app.'
```

```Core/Bundles/bundle.ts diff
+import { basename, dirname, join, relative } from '../Paths/posix'
+import { escapes } from '../Paths/pathSafety'
+import { hiddenName } from '../Paths/exclusion'
+import { archiveDirRel, archivedCollectionIdOf, TRASH_DIR } from '../Paths/nexusPaths'
+import { machine } from '../Platform/machine'
+import { fault, ok, type Result } from '../Contract/result'
+import { type ConnPage, connPage } from '../Connections/pageIndex'
+import { stampedIdOf } from '../Files/pageFile'
+import { listEntries, listMarkdownFiles } from '../Files/walk'
+import { type RecordFile, readRecord } from './record'
+
+export type BundleStore = { kind: 'trash' } | { kind: 'archive'; id: string }
+
+export function layoutOf(store: BundleStore): { dir: string; suffix: string } {
+  switch (store.kind) {
+    case 'trash':
+      return { dir: TRASH_DIR, suffix: '.deleted' }
+    case 'archive':
+      return { dir: archiveDirRel(store.id), suffix: '.archived' }
+  }
+}
+
+export function storeOf(root: string, bundleAbs: string): BundleStore | null {
+  const rel = relative(root, bundleAbs)
+  const id = archivedCollectionIdOf(rel)
+  const store: BundleStore = id === null ? { kind: 'trash' } : { kind: 'archive', id }
+  const { dir, suffix } = layoutOf(store)
+  return rel.startsWith(`${dir}/`) && rel.endsWith(suffix) ? store : null
+}
+
+export const fileStamp = (): string => new Date().toISOString().replace(/[:.]/g, '-')
+
+const STAMP = /^(\d{4}-\d{2}-\d{2})T(\d{2})-(\d{2})-(\d{2})-(\d{3})Z$/
+
+export function storedAtOf(bundlePath: string): number | null {
+  const m = STAMP.exec(basename(bundlePath).split('__')[0] ?? '')
+  if (!m) return null
+  const t = Date.parse(`${m[1]}T${m[2]}:${m[3]}:${m[4]}.${m[5]}Z`)
+  return Number.isNaN(t) ? null : t
+}
+
+export const stampedLeaf = (stamp: string, n: number, base: string): string =>
+  n === 0 ? `${stamp}__${base}` : `${stamp}__${n}__${base}`
+
+/** A store reads as a shadow of the nexus, so a stored item shows where it lived. A path that isn't under the root has no chain to mirror, and following its `..` would write outside the store entirely — it lands flat instead. */
+export async function chainDir(
+  root: string,
+  store: BundleStore,
+  absSource: string,
+): Promise<string> {
+  const rel = relative(root, absSource)
+  const chain = rel && !escapes(rel) ? dirname(rel) : '.'
+  const dir = join(root, layoutOf(store).dir, chain)
+  await machine().mkdir(dir)
+  return dir
+}
+
+export async function mintBundle(
+  root: string,
+  store: BundleStore,
+  absSource: string,
+): Promise<string> {
+  const dir = await chainDir(root, store, absSource)
+  const stamp = fileStamp()
+  const base = `${basename(absSource)}${layoutOf(store).suffix}`
+  for (let n = 0; ; n++) {
+    const bundle = join(dir, stampedLeaf(stamp, n, base))
+    if ((await machine().mkdir(bundle)) === 'created') return bundle
+  }
+}
+
+/** Where a stored file lived: its path under the store's root with the bundle's own folder taken out. The bundle is the folder wearing its mint's stamp, so a chain or artifact folder that only wears the suffix stays in the path. */
+export function originPathOf(root: string, store: BundleStore, file: string): string {
+  const { dir, suffix } = layoutOf(store)
+  const segs = relative(join(root, dir), file).split('/')
+  const bundle = segs.findIndex((seg) => seg.endsWith(suffix) && storedAtOf(seg) !== null)
+  return segs.filter((_, i) => i !== bundle).join('/')
+}
+
+export async function bundleArtifact(bundleDir: string): Promise<string | null> {
+  const found = (await listEntries(bundleDir)).filter((e) => !hiddenName(e.name))
+  return found.length === 1 ? join(bundleDir, found[0].name) : null
+}
+
+export interface ListedBundle {
+  bundlePath: string
+  record: RecordFile
+  artifactName?: string
+}
+
+export async function listBundles(root: string, store: BundleStore): Promise<ListedBundle[]> {
+  const { dir, suffix } = layoutOf(store)
+  const out: ListedBundle[] = []
+  const walk = async (at: string): Promise<void> => {
+    for (const e of await listEntries(at)) {
+      if (e.kind !== 'dir') continue
+      const abs = join(at, e.name)
+      const record = e.name.endsWith(suffix) ? await readRecord(abs) : null
+      if (!record) {
+        await walk(abs)
+        continue
+      }
+      const artifact = record.entity === 'property' ? null : await bundleArtifact(abs)
+      if (record.entity !== 'property' && !artifact) continue
+      out.push({
+        bundlePath: relative(root, abs),
+        record,
+        ...(artifact ? { artifactName: basename(artifact) } : {}),
+      })
+    }
+  }
+  await walk(join(root, dir))
+  return out
+}
+
+export async function openBundle(
+  root: string,
+  bundleAbs: string,
+): Promise<Result<{ store: BundleStore; record: RecordFile }>> {
+  const store = storeOf(root, bundleAbs)
+  if (!store) return fault('Only a trash or archive record can be spent.')
+  const record = await readRecord(bundleAbs)
+  return record ? ok({ store, record }) : fault('That record is unreadable.')
+}
+
+export async function contentPages(
+  entity: RecordFile['entity'],
+  artifactAbs: string,
+): Promise<string[]> {
+  switch (entity) {
+    case 'page':
+      return [artifactAbs]
+    case 'collection':
+    case 'set':
+      return listMarkdownFiles(artifactAbs)
+    default:
+      return []
+  }
+}
+
+/** The ids `pages` carry, read from the files themselves. */
+export async function pageIdsOf(pages: string[]): Promise<string[]> {
+  const ids = await Promise.all(pages.map(stampedIdOf))
+  return ids.flatMap((id) => id ?? [])
+}
+
+/** Every stored page at the path it left, its `id` the bundle holding it, since parking needs the bundle alone and reads no file. */
+export async function originPagesIn(root: string, store: BundleStore): Promise<ConnPage[]> {
+  const out: ConnPage[] = []
+  for (const { bundlePath, record, artifactName } of await listBundles(root, store)) {
+    if (!artifactName) continue
+    const bundle = join(root, bundlePath)
+    for (const file of await contentPages(record.entity, join(bundle, artifactName)))
+      out.push(connPage(bundle, originPathOf(root, store, file)))
+  }
+  return out
+}
+
+/** One bundle's pages at the paths they left, with the ids their files carry; an ID-less one answers to its file, which no index holds as an id. */
+export async function originPagesOf(
+  root: string,
+  store: BundleStore,
+  files: readonly string[],
+): Promise<ConnPage[]> {
+  const out: ConnPage[] = []
+  for (const file of files)
+    out.push(connPage((await stampedIdOf(file)) ?? file, originPathOf(root, store, file)))
+  return out
+}
```

```Core/Bundles/record.ts diff
+import { dirname, join, relative } from '../Paths/posix'
+import { z } from 'zod'
+import { readJsonObject, writeJson } from '../Files/atomicWrite'
+import { index } from '../Files/decoders'
+import { stampedIdOf } from '../Files/pageFile'
+import { sidecarId } from '../Files/sidecar'
+import { contextEntry } from '../Contexts/contexts'
+import type { StrippedLink } from '../Nexus/cascade'
+import type { ContainerKind } from '../Nexus/entities'
+import { liveTreeOf } from '../Nexus/liveTree'
+import { containerAt } from '../Nexus/treePatch'
+
+/** The underscore is load-bearing: the artifact shares this folder under its own real name, so the record wears a prefix no entity may. The atomic writer's temp sibling inherits it too, so it is skipped alongside Finder's litter. */
+export const RECORD_FILENAME = '_record.json'
+
+const parentRef = z.discriminatedUnion('kind', [
+  z.object({ kind: z.literal('root') }),
+  z.object({ kind: z.literal('container'), id: z.string() }),
+  z.object({ kind: z.literal('context'), id: z.string() }),
+  z.object({ kind: z.literal('unaddressable') }),
+])
+
+const memberRoot = z.object({ id: z.string().optional(), kind: z.enum(['page', 'space']) })
+const spaceRef = z.object({ id: z.string().optional(), title: z.string() })
+
+const strippedLink: z.ZodType<StrippedLink> = z.object({
+  page: z.string(),
+  property: z.string(),
+  value: z.string(),
+})
+
+/** The page each outbound link under the artifact named at the delete, by its id and its path then under the key it was written with, so a restore follows it by identity and re-spells only what changed since. */
+const linkTargets = z.record(z.string(), z.object({ id: z.string(), path: z.string() })).optional()
+
+const contentRecord = <E extends string>(entity: E) =>
+  z.object({
+    entity: z.literal(entity),
+    id: z.string().optional(),
+    parent: parentRef,
+    /** Each Link value the delete stripped from a page outside it, by that page's id and the property's, so a restore can put it back. */
+    links: z.array(strippedLink).optional(),
+    targets: linkTargets,
+    partial: z.literal(true).optional(),
+  })
+
+// The record itself is never rewritten from its decode; `def` and `registry` decode loose because a restore writes them back.
+const recordFile = z.discriminatedUnion('entity', [
+  contentRecord('page'),
+  contentRecord('collection'),
+  contentRecord('set'),
+  z.object({
+    entity: z.literal('space'),
+    id: z.string(),
+    parent: parentRef,
+    members: z.array(memberRoot),
+    targets: linkTargets,
+    partial: z.literal(true).optional(),
+  }),
+  z.object({
+    entity: z.literal('property'),
+    id: z.string(),
+    // The definition as it stood, kept whole for the restore to decode.
+    def: z.looseObject({ id: z.string() }),
+    values: z.record(z.string(), z.unknown()),
+    assignments: z.array(z.string()).optional(),
+    caches: z.record(z.string(), z.record(z.string(), z.unknown())).optional(),
+    partial: z.literal(true).optional(),
+  }),
+  z.object({
+    entity: z.literal('context'),
+    registry: contextEntry,
+    at: index.optional(),
+    membership: z.array(z.object({ root: memberRoot, spaces: z.array(spaceRef) })),
+    targets: linkTargets,
+    partial: z.literal(true).optional(),
+  }),
+])
+
+export type RecordFile = z.infer<typeof recordFile>
+
+export async function writeRecord(bundleDir: string, record: RecordFile): Promise<void> {
+  await writeJson(join(bundleDir, RECORD_FILENAME), record)
+}
+
+export async function readRecord(bundleDir: string): Promise<RecordFile | null> {
+  const raw = await readJsonObject(join(bundleDir, RECORD_FILENAME))
+  if (raw === null) return null
+  const parsed = recordFile.safeParse(raw)
+  return parsed.success ? parsed.data : null
+}
+
+export async function gatherContentRecord(
+  root: string,
+  kind: 'page' | ContainerKind,
+  abs: string,
+): Promise<RecordFile> {
+  const id = kind === 'page' ? await stampedIdOf(abs) : await sidecarId(abs, kind)
+  const atRoot = dirname(abs) === root
+  const container = atRoot
+    ? null
+    : containerAt(await liveTreeOf(root), relative(root, dirname(abs)))
+  return {
+    entity: kind,
+    ...(id ? { id } : {}),
+    parent: atRoot
+      ? { kind: 'root' }
+      : container
+        ? { kind: 'container', id: container.id }
+        : { kind: 'unaddressable' },
+  }
+}
```

```Core/Trash/bundle.ts diff
@@ imports @@
-import { basename, dirname, join, relative } from '../Paths/posix'
-import { escapes } from '../Paths/pathSafety'
+import { basename, join } from '../Paths/posix'
 import { machine } from '../Platform/machine'
-import { TRASH_DIR } from '../Paths/nexusPaths'
 import { pathExists } from '../Files/atomicWrite'
 import { noteOwn, recordWrite } from '../Files/writeEcho'
 import type { HostContext } from '../Contract/handlers'
 import { readLiveSetting } from '../Settings/settings'
+import { chainDir, fileStamp, stampedLeaf } from '../Bundles/bundle'
 import type { TrashMode } from './trashRow'
@@ the format, :11-40 → Core/Bundles/bundle.ts @@
-export const BUNDLE_SUFFIX = '.deleted'
-…
@@ trashFileFlat @@
 export async function trashFileFlat(nexusRoot: string, absPath: string): Promise<string> {
   recordWrite(absPath)
-  const dir = await trashChainDir(nexusRoot, absPath)
+  const dir = await chainDir(nexusRoot, { kind: 'trash' }, absPath)
```
(`:11-40` leave whole: `BUNDLE_SUFFIX`, `trashChainDir`, `deletedPathOf`, `fileStamp`, `stampedLeaf`, and `mintBundle`, which the owner now holds.)

```Core/Trash/record.ts diff
-(the whole file: the union, readRecord, writeRecord → Core/Bundles/record.ts; bundleArtifact → Core/Bundles/bundle.ts; writePropertyBundle → Core/Properties/deleteProperty.ts; appendLinks → Core/Trash/holdings.ts)
```

```Core/Trash/holdings.ts diff
@@ header @@
-// What the Trash holds — its bundles, the pages they hold at the paths they left, and the pages and Spaces they hold by ID — and the Link values a restore hands to it.
+// The Link values the Trash keeps for what it holds: a stripped value parked with the trashed page it names, so that page's restore writes it back, and a returning value refilled into a trashed copy it can't reach live.
@@ imports @@
-import { basename, join, relative } from '../Paths/posix'
-import { SPACE_SIDECAR, TRASH_DIR } from '../Paths/nexusPaths'
+import { basename, join } from '../Paths/posix'
+import { SPACE_SIDECAR } from '../Paths/nexusPaths'
 import { landValue } from '../Files/rootValues'
 import { readLinkText } from '../Connections/linkValue'
-import { buildPageIndex, type ConnPage, connPage } from '../Connections/pageIndex'
+import { buildPageIndex } from '../Connections/pageIndex'
 import type { StrippedLink } from '../Nexus/cascade'
 import { spaceIdsIn } from '../Contexts/spaceSidecar'
 import { rmwJsonStrict } from '../Files/atomicWrite'
 import { stampedIdOf } from '../Files/pageFile'
-import { listEntries, listMarkdownFiles } from '../Files/walk'
 import { sweepGovernedRoots } from '../Properties/governedSweep'
 import { isBlankRaw } from '../Properties/propertyValue'
-import { BUNDLE_SUFFIX, deletedPathOf } from './bundle'
-import { type RecordFile, appendLinks, bundleArtifact, readRecord } from './record'
-
-export interface ListedBundle { … }
-
-export async function listBundles(root: string): Promise<ListedBundle[]> { … }
-
-export async function contentPages( … ) { … }
-
-/** The ids `pages` carry, read from the files themselves. */
-export async function pageIdsOf(pages: string[]): Promise<string[]> { … }
-
-const trashedPage = (root: string, bundleAbs: string, file: string, id: string): ConnPage =>
-  connPage(id, deletedPathOf(root, bundleAbs, file))
-
-/** Every trashed page at the path it left, … */
-async function trashedPages(root: string): Promise<ConnPage[]> { … }
-
-/** One bundle's pages at the paths they left, … */
-export async function trashedPagesOf( … ) { … }
+import { contentPages, listBundles, originPagesIn } from '../Bundles/bundle'
+import { RECORD_FILENAME } from '../Bundles/record'
+
+/** Raw, since a record is never rewritten from its decode. */
+async function appendLinks(bundleDir: string, links: StrippedLink[]): Promise<void> {
+  await rmwJsonStrict(join(bundleDir, RECORD_FILENAME), (raw) => ({
+    ...raw,
+    links: [...(Array.isArray(raw.links) ? raw.links : []), ...links],
+  }))
+}
@@ parkLinks @@
-  const index = buildPageIndex(await trashedPages(root))
+  const index = buildPageIndex(await originPagesIn(root, { kind: 'trash' }))
@@ trashedHolders @@
-  for (const { bundlePath, record, artifactName } of await listBundles(root)) {
+  for (const { bundlePath, record, artifactName } of await listBundles(root, { kind: 'trash' })) {
```

```Core/Trash/gather.ts diff
@@ imports @@
-import { basename, dirname, isAtOrUnder, join, relative } from '../Paths/posix'
-import { stampedIdOf } from '../Files/pageFile'
+import { basename, dirname, isAtOrUnder, join } from '../Paths/posix'
 import type { ContextDef, ContextsRegistry } from '../Contexts/contexts'
 import type { Result } from '../Contract/result'
-import { liveTreeOf } from '../Nexus/liveTree'
-import { containerAt } from '../Nexus/treePatch'
 import type { SweepCapture, UnlinkOutcome } from '../Contexts/contextCascade'
 …
-import type { RecordFile, ParentRef } from './record'
-import type { ContainerKind } from '../Nexus/entities'
+import type { RecordFile } from '../Bundles/record'
@@ gatherParentRef @@
-async function gatherParentRef(root: string, absEntity: string): Promise<ParentRef> { … }
@@ gatherContentRecord @@
-export async function gatherContentRecord( … ): Promise<RecordFile> { … }
```

```Core/Properties/deleteProperty.ts diff
@@ imports @@
-import { writePropertyBundle } from '../Trash/record'
+import { mintBundle } from '../Bundles/bundle'
+import { type RecordFile, writeRecord } from '../Bundles/record'
 …
-import { relative } from '../Paths/posix'
+import { join, relative } from '../Paths/posix'
@@ snapshot @@
+export async function writePropertyBundle(
+  root: string,
+  record: Extract<RecordFile, { entity: 'property' }>,
+): Promise<string> {
+  const bundle = await mintBundle(root, { kind: 'trash' }, join(root, `property-${record.id}`))
+  await writeRecord(bundle, record)
+  return bundle
+}
+
 async function snapshot(
```

```Core/Trash/spend.ts diff
@@ imports @@
-import { TRASH_DIR } from '../Paths/nexusPaths'
 …
-import { BUNDLE_SUFFIX, deletedPathOf } from './bundle'
+import {
+  bundleArtifact,
+  contentPages,
+  openBundle,
+  originPagesOf,
+  originPathOf,
+  pageIdsOf,
+} from '../Bundles/bundle'
 …
-import { type RecordFile, readRecord, bundleArtifact } from './record'
 …
-import { contentPages, pageIdsOf, parkLinks, refillTrashed, trashedPagesOf } from './holdings'
+import { parkLinks, refillTrashed } from './holdings'
@@ openBundle @@
-async function openBundle(root: string, bundleAbs: string): Promise<Result<RecordFile>> {
-  const trashPrefix = `${join(root, TRASH_DIR)}/`
-  if (!bundleAbs.startsWith(trashPrefix) || !bundleAbs.endsWith(BUNDLE_SUFFIX))
-    return fault('Only a trash record can be spent.')
-  const record = await readRecord(bundleAbs)
-  return record ? ok(record) : fault('That deletion record is unreadable.')
-}
-
@@ emptyBundle @@
   const opened = await openBundle(root, bundleAbs)
   if (!opened.ok) return opened
-  if (opened.value.entity === 'property') {
+  const { store, record } = opened.value
+  if (store.kind !== 'trash') return fault('Only a trash record can be emptied.')
+  if (record.entity === 'property') {
 …
-  const pages = await contentPages(opened.value.entity, artifactAbs)
+  const pages = await contentPages(record.entity, artifactAbs)
 …
-  if (opened.value.entity === 'context') await dropSpaceOrder(root, opened.value.registry.id)
+  if (record.entity === 'context') await dropSpaceOrder(root, record.registry.id)
 …
-        pages.map((file) => deletedPathOf(root, bundleAbs, file)),
+        pages.map((file) => originPathOf(root, store, file)),
 …
-  const recorded = 'links' in opened.value ? (opened.value.links ?? []) : []
+  const recorded = 'links' in record ? (record.links ?? []) : []
@@ restoreArtifact @@
   const opened = await openBundle(root, bundleAbs)
   if (!opened.ok) return opened
-  if (opened.value.entity === 'property') {
+  const { store, record: stored } = opened.value
+  if (store.kind !== 'trash') return fault('Only a trash record can be spent.')
+  if (stored.entity === 'property') {
     if (destination) return fault(NO_DESTINATION)
-    const rebuilt = await restoreProperty(root, opened.value)
+    const rebuilt = await restoreProperty(root, stored)
 …
-  const rehomed = destination ? withDestination(opened.value, destination, tree) : ok(opened.value)
+  const rehomed = destination ? withDestination(stored, destination, tree) : ok(stored)
 …
-  const back = await trashedPagesOf(root, bundleAbs, await contentPages(record.entity, artifactAbs))
+  const back = await originPagesOf(root, store, await contentPages(record.entity, artifactAbs))
```

```Core/Trash/delete.ts diff
@@ imports @@
-import { discardFile, mintBundle } from './bundle'
+import { discardFile } from './bundle'
-import { contentPages, pageIdsOf } from './holdings'
+import { contentPages, mintBundle, pageIdsOf } from '../Bundles/bundle'
 import {
   buildContextRecord,
-  gatherContentRecord,
   gatherContextEvidence,
   gatherLinkTargets,
   gatherSpaceRecord,
 } from './gather'
-import { type RecordFile, writeRecord } from './record'
+import { gatherContentRecord, type RecordFile, writeRecord } from '../Bundles/record'
@@ deleteOp @@
-  const bundle = deps.trashMode === 'system' ? null : await mintBundle(root, abs)
+  const bundle =
+    deps.trashMode === 'system' ? null : await mintBundle(root, { kind: 'trash' }, abs)
```

```Core/Trash/trashRows.ts diff
@@ imports @@
-import { basename, dirname, titleFromPath } from '../Paths/posix'
+import { dirname, titleFromPath } from '../Paths/posix'
 …
-import type { ListedBundle } from './holdings'
+import { type ListedBundle, storedAtOf } from '../Bundles/bundle'
@@ deletedAtOf @@
-const STAMP = /^(\d{4}-\d{2}-\d{2})T(\d{2})-(\d{2})-(\d{2})-(\d{3})Z$/
-
-function deletedAtOf(bundlePath: string): number | null { … }
-
@@ trashRowOf @@
-      deletedAt: deletedAtOf(bundlePath),
+      deletedAt: storedAtOf(bundlePath),
 (both arms)
```

```Core/Trash/handlers.ts diff
@@ imports @@
-import { listBundles } from './holdings'
+import { listBundles } from '../Bundles/bundle'
@@ trash:list @@
-    return ok(trashRows(await listBundles(root), await liveTreeOf(root)))
+    return ok(trashRows(await listBundles(root, { kind: 'trash' }), await liveTreeOf(root)))
```

```Core/Trash/restoreScrub.ts diff
@@ imports @@
-import { contentPages } from './holdings'
-import type { RecordFile } from './record'
+import { contentPages } from '../Bundles/bundle'
+import type { RecordFile } from '../Bundles/record'
```

```Core/Trash/restoreProperty.ts diff
@@ imports @@
-import type { RecordFile } from './record'
+import type { RecordFile } from '../Bundles/record'
```

```Core/Trash/resolve.ts diff
@@ imports @@
-import type { RecordFile } from './record'
+import type { RecordFile } from '../Bundles/record'
```

```Desktop/Store/driver.ts diff
@@ imports @@
-import { fileStamp } from '@pommora/core/Trash/bundle'
+import { fileStamp } from '@pommora/core/Bundles/bundle'
```

```Core/Bundles/bundle.test.ts diff
+import { mkdir, rm, stat, writeFile } from 'node:fs/promises'
+import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
+import { basename, dirname, join } from '../Paths/posix'
+import { tempRoot } from '../Testing/hostFs'
+import { layoutOf, listBundles, mintBundle, originPathOf, storeOf } from './bundle'
+import { writeRecord } from './record'
+
+const ID = '01J9Z8X7W6V5T4S3R2Q1P0N9M8'
+const TRASH = { kind: 'trash' } as const
+const ARCHIVE = { kind: 'archive', id: ID } as const
+const STAMPED = '2026-10-17T00-00-00-000Z'
+
+let root: string
+beforeEach(() => {
+  root = tempRoot('pom-bundle-')
+})
+afterEach(async () => {
+  await rm(root, { recursive: true, force: true })
+})
+
+describe('layoutOf', () => {
+  it('files the Trash under .trash and an Archive under its Collection’s id, each wearing its own suffix', () => {
+    expect(layoutOf(TRASH)).toEqual({ dir: '.trash', suffix: '.deleted' })
+    expect(layoutOf(ARCHIVE)).toEqual({ dir: `.nexus/archive/${ID}`, suffix: '.archived' })
+  })
+})
+
+describe('storeOf', () => {
+  it('answers the store a bundle sits in by its root and its suffix', () => {
+    expect(storeOf('/n', `/n/.trash/Notes/${STAMPED}__Alpha.md.deleted`)).toEqual(TRASH)
+    expect(storeOf('/n', `/n/.nexus/archive/${ID}/Notes/${STAMPED}__Alpha.md.archived`)).toEqual(
+      ARCHIVE,
+    )
+  })
+
+  it('answers null for a path neither store holds: an in-Nexus `.deleted`, a `.archived` outside `.nexus/archive`, the id folder itself, and either suffix under the other store', () => {
+    expect(storeOf('/n', '/n/Notes/fake.deleted')).toBeNull()
+    expect(storeOf('/n', '/n/Notes/fake.archived')).toBeNull()
+    expect(storeOf('/n', `/n/.nexus/archive/${ID}.archived`)).toBeNull()
+    expect(storeOf('/n', `/n/.trash/Notes/${STAMPED}__Alpha.md.archived`)).toBeNull()
+    expect(storeOf('/n', `/n/.nexus/archive/${ID}/${STAMPED}__Alpha.md.deleted`)).toBeNull()
+  })
+})
+
+describe('mintBundle', () => {
~  (atomicWrite.test.ts:273-307's three cases, moved whole: each mints into TRASH, its source written with writeFile)
+  it('mirrors the chain under an Archive with its suffix', async () => {
+    await mkdir(join(root, 'Notes', 'Daily'), { recursive: true })
+    const bundle = await mintBundle(root, ARCHIVE, join(root, 'Notes', 'Daily', 'Beta.md'))
+    expect(dirname(bundle)).toBe(join(root, '.nexus', 'archive', ID, 'Notes', 'Daily'))
+    expect(basename(bundle).endsWith('__Beta.md.archived')).toBe(true)
+    expect((await stat(bundle)).isDirectory()).toBe(true)
+  })
+})
+
+describe('originPathOf', () => {
+  it('reads a bundled file’s origin from the chain and the artifact’s own tree', () => {
+    const page = `/n/.trash/Studio/Pommora/${STAMPED}__ClaudeMD.md.deleted`
+    expect(originPathOf('/n', TRASH, `${page}/ClaudeMD.md`)).toBe('Studio/Pommora/ClaudeMD.md')
+    const set = `/n/.trash/Coll/${STAMPED}__Set.deleted`
+    expect(originPathOf('/n', TRASH, `${set}/Set/X.md`)).toBe('Coll/Set/X.md')
+  })
+
+  it('reads an archived file under its Archive’s root the same way', () => {
+    const set = `/n/.nexus/archive/${ID}/Coll/${STAMPED}__Set.archived`
+    expect(originPathOf('/n', ARCHIVE, `${set}/Set/Sub/X.md`)).toBe('Coll/Set/Sub/X.md')
+  })
+
+  it('keeps a chain or artifact folder that wears the suffix, finding the bundle by its stamp', () => {
+    const bundle = `/n/.trash/Archive.deleted/${STAMPED}__Notes.deleted`
+    expect(originPathOf('/n', TRASH, `${bundle}/Notes/Old.deleted/X.md`)).toBe(
+      'Archive.deleted/Notes/Old.deleted/X.md',
+    )
+  })
+
+  it('a bundle wearing no stamp keeps its folder in the origin path', () => {
+    expect(originPathOf('/n', TRASH, '/n/.trash/Notes/Alpha.md.deleted/Alpha.md')).toBe(
+      'Notes/Alpha.md.deleted/Alpha.md',
+    )
+  })
+})
+
+describe('listBundles', () => {
+  it('lists an Archive’s bundles under its own root and suffix, and none of the Trash’s', async () => {
+    const seed = async (store: typeof TRASH | typeof ARCHIVE, name: string): Promise<void> => {
+      const bundle = await mintBundle(root, store, join(root, 'Notes', name))
+      await writeFile(join(bundle, name), 'body')
+      await writeRecord(bundle, { entity: 'page', parent: { kind: 'container', id: 'col' } })
+    }
+    await seed(ARCHIVE, 'Alpha.md')
+    await seed(TRASH, 'Beta.md')
+    expect((await listBundles(root, ARCHIVE)).map((b) => b.artifactName)).toEqual(['Alpha.md'])
+    expect((await listBundles(root, TRASH)).map((b) => b.artifactName)).toEqual(['Beta.md'])
+  })
+})
```

**VERIFY**

- [ ] `bundle.test.ts` and `exclusion.test.ts`' `describe('the Archive’s segments')` pass; `spend.test.ts` "a path neither store holds refuses to restore" (`:1542`), "refuses a chain folder that merely wears the suffix, bundles and all" (`:1770`), "refuses a path inside the nexus but outside the trash, and one that escapes the root" (`:1791`), "a chain folder that merely wears the name is walked through, not read as a deletion" (`:695`), and "a bundle’s interior is trashed content, never trash structure" (`:680`) pass unchanged in body.
- [ ] `git grep -n "Trash/record'" -- Core Desktop` and `git grep -n "from './record'" -- Core/Trash` find nothing; `git grep -n "Trash/bundle'" -- Core Desktop` and `git grep -n "from './bundle'" -- Core/Trash` find Trash Mode's importers alone (`TrashDeps`, `trashDeps`, `discardFile`, `trashFileFlat`), which Task 2-2 moves.
- [ ] `git grep -n "NON_CORPUS_TOP\|trashChainDir\|deletedPathOf\|trashedPagesOf\|trashedPages\b\|BUNDLE_SUFFIX\|deletedAtOf" -- Core Desktop` finds nothing.
- [ ] `npm run test -- engineGraph hostGraph` passes: `Desktop/Store/driver.ts` now roots the host graph at `Core/Bundles/bundle.ts`, which reaches no `.tsx`.
- [ ] Run the gates.
- [ ] Check for unnecessary code or mistakes.

**Lines:** ≈ +53 (+349 / −296) (view-delta's Actionable column, moved lines on both sides), ≈ 245 of them moved, whole-file and elided removals counted from HEAD. By file: `Bundles/bundle.ts` +164, `Bundles/record.ts` +106, `Trash/bundle.ts` +3 / −32, `Trash/record.ts` −105, `holdings.ts` +14 / −85, `gather.ts` +2 / −25, `spend.ts` +22 / −21, `deleteProperty.ts` +12 / −2, `trashRows.ts` +3 / −11, `nexusPaths.ts` and `codec.ts` +11 / −3, import sweep +12 / −12. Tests: `bundle.test.ts` +94 (≈ 35 moved), the guard's `spend.test.ts` case, sweeps ±0.

#### Task 2-2

**TASK:** Split Trash Mode's half of `Core/Trash/bundle.ts` into the renderer-safe leaf `Core/Trash/trashMode.ts` (`TrashMode`, `DEFAULT_TRASH_MODE`, from `trashRow.ts`) and the host's `Core/Trash/discard.ts` (`trashFileFlat`, `TrashDeps`, `trashDeps`, `discardFile`); remove `Core/Trash/bundle.ts`, sweeping every importer.

**NOW:** `Core/Trash/trashRow.ts:30-33` holds `TrashMode` and `DEFAULT_TRASH_MODE`; the renderer's `confirmations.ts:4` value-imports `DEFAULT_TRASH_MODE`. Trap: these stay two files, since `trashDeps` in `trashMode.ts` would pull `machine()` and `Core/Settings/settings.ts` into the renderer graph, and `discardFile` keeps a file of its own because `Core/Tiles/tilesFile.ts:31` can't import `delete.ts` (the `configReach` → tiles cycle). Twenty test files import `TrashDeps` from `Trash/bundle` (thirteen as `../Trash/bundle`, seven as `./bundle`).

**CHANGE**

- [ ] Write and watch fail: the test sweep below points the twenty `TrashDeps` importers and `atomicWrite.test.ts:25`'s `discardFile` and `trashFileFlat` at `../Trash/discard`; typecheck fails until the file exists, then those cases pass unchanged.
- [ ] `Core/Trash/trashMode.ts` (new): `TrashMode`, `DEFAULT_TRASH_MODE` (from `trashRow.ts:30-33`). `Core/Trash/discard.ts` (new): `trashFileFlat`, `TrashDeps`, `trashDeps`, `discardFile` (from `Core/Trash/bundle.ts` as Task 2-1 leaves it).
- [ ] Remove `Core/Trash/bundle.ts`; `trashRow.ts` loses `TrashMode` and `DEFAULT_TRASH_MODE`.
- [ ] Sibling sweep, source: `TrashDeps`/`trashDeps`/`discardFile` → `../Trash/discard` in `Core/Tiles/handlers.ts:18`, `Core/Tiles/tilesFile.ts:31`, `:37`, `Core/Assets/assetMigrate.ts:20`, `:32`, `Core/Assets/handlers.ts:17`, `Core/Nexus/handlers.ts:34`, `Core/Nexus/mutate.ts:36`, `Core/Testing/settledMutate.ts:8`, `Core/Trash/delete.ts`, `Core/Trash/handlers.ts:5`; `TrashMode`/`DEFAULT_TRASH_MODE` → `Trash/trashMode` in `Core/Contract/bridge.ts:8` (the row type stays on `trashRow` until Task 2-3), `Core/Contract/handlers.ts:8`, `Core/Trash/handlers.ts:7`, `Core/Interface/Confirm/confirmations.ts:4`, `Desktop/Config/appConfig.ts:6`.
- [ ] Sibling sweep, tests: `TrashDeps` → `Trash/discard` in the twenty importers (`git grep -ln "Trash/bundle'\|from './bundle'" -- Core ':!Core/Bundles'` lists them with `atomicWrite.test.ts` and the source importers); `atomicWrite.test.ts:25` takes `discardFile` and `trashFileFlat` from `../Trash/discard`.

**AFTER**

```Core/Trash/trashMode.ts diff
+/** The in-nexus `.trash` (portable, index-aware) or the macOS system Trash. Device-level since system Trash isn't portable nexus data. */
+export type TrashMode = 'nexus' | 'system'
+
+export const DEFAULT_TRASH_MODE: TrashMode = 'nexus'
```

```Core/Trash/discard.ts diff
+import { basename, join } from '../Paths/posix'
+import { machine } from '../Platform/machine'
+import { pathExists } from '../Files/atomicWrite'
+import { noteOwn, recordWrite } from '../Files/writeEcho'
+import type { HostContext } from '../Contract/handlers'
+import { readLiveSetting } from '../Settings/settings'
+import { chainDir, fileStamp, stampedLeaf } from '../Bundles/bundle'
+import type { TrashMode } from './trashMode'
+
+export async function trashFileFlat(nexusRoot: string, absPath: string): Promise<string> {
+  recordWrite(absPath)
+  const dir = await chainDir(nexusRoot, { kind: 'trash' }, absPath)
+  const stamp = fileStamp()
+  const base = basename(absPath)
+  let dest = join(dir, stampedLeaf(stamp, 0, base))
+  for (let n = 1; await pathExists(dest); n++) dest = join(dir, stampedLeaf(stamp, n, base))
+  recordWrite(dest)
+  await machine().rename(absPath, dest)
+  return dest
+}
+
+export interface TrashDeps {
+  trashMode: TrashMode
+  trashToSystem: (absPath: string) => Promise<void>
+  permanentDelete?: boolean
+}
+
+export async function trashDeps(root: string, ctx: HostContext): Promise<TrashDeps> {
+  return {
+    trashMode: await ctx.trashMode(),
+    trashToSystem: (p) =>
+      machine().trashToSystem?.(p) ?? Promise.reject(new Error('This host has no system trash.')),
+    permanentDelete: await readLiveSetting(root, 'permanentDelete'),
+  }
+}
+
+/** A file the Trash can't list — a tile's text, an image sweep's leftover — still goes where Trash Mode sends deletions. */
+export async function discardFile(
+  nexusRoot: string,
+  absPath: string,
+  deps: TrashDeps,
+): Promise<void> {
+  if (deps.trashMode === 'nexus') await trashFileFlat(nexusRoot, absPath)
+  else {
+    recordWrite(absPath)
+    await deps.trashToSystem(absPath)
+  }
+  await noteOwn({ event: 'unlink', absPath, origin: 'own' })
+}
```

```Core/Trash/bundle.ts diff
-(the whole file, as Task 2-1 left it: trashFileFlat, TrashDeps, trashDeps, discardFile → Core/Trash/discard.ts)
```

```Core/Trash/trashRow.ts diff
@@ TrashMode @@
   match: MatchKey
 }
-
-/** The in-nexus `.trash` (portable, index-aware) or the macOS system Trash. Device-level since system Trash isn't portable nexus data. */
-export type TrashMode = 'nexus' | 'system'
-
-export const DEFAULT_TRASH_MODE: TrashMode = 'nexus'
```

```Core/Trash/delete.ts diff
@@ imports @@
-import { discardFile } from './bundle'
+import { discardFile } from './discard'
```

```Core/Trash/handlers.ts diff
@@ imports @@
-import { trashDeps } from './bundle'
+import { trashDeps } from './discard'
-import type { TrashMode } from './trashRow'
+import type { TrashMode } from './trashMode'
```

```Core/Contract/bridge.ts diff
@@ imports @@
-import type { TrashMode, TrashRow } from '../Trash/trashRow'
+import type { TrashMode } from '../Trash/trashMode'
+import type { TrashRow } from '../Trash/trashRow'
```

```Core/Contract/handlers.ts diff
@@ imports @@
-import type { TrashMode } from '../Trash/trashRow'
+import type { TrashMode } from '../Trash/trashMode'
```

```Core/Interface/Confirm/confirmations.ts diff
@@ imports @@
-import { DEFAULT_TRASH_MODE } from '../../Trash/trashRow'
+import { DEFAULT_TRASH_MODE } from '../../Trash/trashMode'
```

```Desktop/Config/appConfig.ts diff
@@ imports @@
-import { DEFAULT_TRASH_MODE, type TrashMode } from '@pommora/core/Trash/trashRow'
+import { DEFAULT_TRASH_MODE, type TrashMode } from '@pommora/core/Trash/trashMode'
```

```Core/Nexus/mutate.ts diff
@@ imports @@
-import type { TrashDeps } from '../Trash/bundle'
+import type { TrashDeps } from '../Trash/discard'
```

```Core/Tiles/tilesFile.ts diff
@@ imports @@
-import { discardFile } from '../Trash/bundle'
+import { discardFile, type TrashDeps } from '../Trash/discard'
 …
-import type { TrashDeps } from '../Trash/bundle'
```

```Core/Assets/assetMigrate.ts diff
@@ imports @@
-import { discardFile } from '../Trash/bundle'
+import { discardFile, type TrashDeps } from '../Trash/discard'
 …
-import type { TrashDeps } from '../Trash/bundle'
```

```Core/Tiles/handlers.ts diff
@@ imports @@
-import { trashDeps } from '../Trash/bundle'
+import { trashDeps } from '../Trash/discard'
```
(`Core/Assets/handlers.ts:17`, `Core/Nexus/handlers.ts:34`, and `Core/Testing/settledMutate.ts:8` take the same one-line change.)

**VERIFY**

- [ ] The tests that import `TrashDeps`, `discardFile`, or `trashFileFlat` pass unchanged but for their imports.
- [ ] `git grep -n "Trash/bundle'" -- Core Desktop` and `git grep -n "from './bundle'" -- Core/Trash` find nothing.
- [ ] `git grep -n "TrashMode\|DEFAULT_TRASH_MODE" -- Core/Trash/trashRow.ts` finds nothing.
- [ ] `npm run test -- engineGraph hostGraph` passes: `Desktop/Config/appConfig.ts` now roots the host graph at `Core/Trash/trashMode.ts`, which reaches no `.tsx`, and the renderer's `confirmations.ts` reaches neither `machine()` nor `settings.ts` through it.
- [ ] Run the gates.
- [ ] Check for unnecessary code or mistakes.

**Lines:** −2 (+66 / −68) (view-delta's Actionable column, moved lines on both sides), ≈ 50 of them moved. By file: `discard.ts` +48, `trashMode.ts` +3, `Trash/bundle.ts` −48, `trashRow.ts` −4, import sweep +15 / −16. Tests: sweep ±0.

#### Task 2-3

**TASK:** Move the rows and placement into `Core/Bundles/rows.ts` and `Core/Bundles/placement.ts`; replace `'trash:list'` with one `bundles:list(store)` channel served from `Core/Bundles/handlers.ts`, and `trashChanged` and its inline triple with one `storesChanged` emitted through `changesStores(req)`.

**NOW:** After Task 2-2, `Core/Trash/trashRow.ts:5-28` holds only `TrashCrumb` and `TrashRow`. `trashRows.ts`' `frozenCrumbs(bundlePath)` (`:21-29`) filters any segment equal to `TRASH_DIR`. `withDestination` (`spend.ts:107-128`) has one caller, `restoreArtifact`. `trashChanged` (`nexusSlice.ts:70-71`) is emitted at `:248-249` and `PropertyFrame.tsx:297`. Handlers receive arguments as `unknown` (`Core/Contract/handlers.ts:78-84`) and narrow them, as `page:open` does through `isString` (`Core/Pages/handlers.ts:18-19`). By-id container lookups spell `(n) => n.id === id` over `treePatch.ts:73-81`'s predicate pair at `resolve.ts:27-28`, `trashRows.ts:43`, `createActions.ts:67`, and `tilesFile.ts:78`; `treeIndex.ts:207`'s `findSet` also matches a kind.

**CHANGE**

- [ ] Write and watch fail: `Core/Bundles/rows.test.ts` (`git mv` from `trashRows.test.ts`): its `rows()` helper (`:24-25`) reads `bundleRows(await listBundles(root, { kind: 'trash' }), { kind: 'trash' }, await readNexus(root))`; the `trashRowOf(` calls at `:157`, `:194` read `bundleRowOf(…, { kind: 'trash' }, …)`; `TrashRow` → `BundleRow`, `deletedAt` → `storedAt`; "a missing parent falls back to the frozen chain and says its home is gone" gains an archive row built by `bundleRowOf` over a hand-made listing at `.nexus/archive/<ID>/Notes/Daily/<stamp>__Alpha.md.archived`, crumbs `[{ title: 'Notes' }, { title: 'Daily' }]`; the two `describe('trashRows — …')` titles read `bundleRows — …`. `Core/Bundles/placement.test.ts` (new) takes `spend.test.ts:734-916` whole, importing `resolveRecord` from `./placement`, with `spend.test.ts:30`'s `PAGE_A`. `Core/Bundles/handlers.test.ts` (new) › "lists the Trash’s rows for the trash store", "lists an Archive whose Collection id isn’t ULID-shaped" (a page bundle minted under `{ kind: 'archive', id: 'col-foreign' }`), "refuses an archive id that isn’t one safe path segment" (`'../x'`, `'a/b'`, `'..'`, and `''` → `A store is required.`), and "refuses a store it can’t read" (`null`, `{ kind: 'shelf' }`, and `{ kind: 'archive' }` without an id → `A store is required.`). `TrashFrame.test.tsx` › "lists the opened Nexus's trash after a switch" (in the AFTER); "lists a delete made elsewhere while it is open" (`:313`) pins `changesStores` through the slice. `Core/Nexus/treePatch.test.ts` › `describe('containerTrailWhere')` (`:233`) gains "finds a container and the trail down to it by id": `containerTrailById(t, 's1')` answers the ids `containerTrailWhere(t, (n) => n.id === 's1')` does, `findContainerById(t, 's1')?.id` is `'s1'`, and an unknown id answers null from both.
- [ ] `Core/Bundles/rows.ts` (new, from `trashRow.ts:5-28` and `trashRows.ts` whole): `BundleCrumb`, `BundleRow` (`storedAt` for `deletedAt`), `frozenCrumbs(store, bundlePath)` stripping the store's root by `relative` instead of filtering a segment name, `liveCrumbs`, `homeResolvesFor`, `bundleRowOf(bundle, store, tree)`, `bundleRows(bundles, store, tree)`. No React: the bridge type-imports it.
- [ ] `Core/Bundles/placement.ts` (new, from `resolve.ts` whole and `spend.ts:51-56`, `:105-128`): `Placement`, `Refusal`, `resolveRecord`, `REFUSAL_TEXT`, `NO_DESTINATION`, `withDestination`; `ArtifactRecord` goes to `record.ts` beside `RecordFile`, which `placement.ts` and `rows.ts` import it from, and `findContainerById` to `treePatch.ts`.
- [ ] `Core/Nexus/treePatch.ts`: add `containerTrailById(tree, id)` and `findContainerById(tree, id)` beside the predicate pair; `rows.ts`' `liveCrumbs` reads `containerTrailById`, and `placement.ts` and (Take Along) `createActions.ts:67` and `tilesFile.ts:78` read `findContainerById`. `findSet` keeps its predicate.
- [ ] `Core/Bundles/handlers.ts` (new): `'bundles:list'` narrows its argument through the module-private `storeFrom` (an object whose `kind` is `trash`, or `archive` with a string `id` that `holdsName` keeps to one safe path segment, since it becomes one under the Archive's root), refusing anything else with `A store is required.` `bridge.ts`: `'bundles:list': { args: [store: BundleStore]; reply: Result<BundleRow[]> }` replaces `'trash:list'`, its comment rewritten. `serve.ts` registers `bundlesHandlers`. `Core/Trash/handlers.ts` keeps `delete:facts` alone.
- [ ] Remove `Core/Trash/trashRow.ts` and `Core/Trash/trashRows.ts` (→ `rows.ts`) and `Core/Trash/resolve.ts` (→ `placement.ts`).
- [ ] `mutateRequest.ts`: `changesStores(req)` beside `changesSettled`, taking the request (Phase 4's container-rename arm reads `req.kind`). `nexusSlice.ts`: `trashChanged` → `storesChanged`, its comment naming any open browser, emitted through `changesStores(req)` in place of the inline triple. `PropertyFrame.tsx:297` emits `storesChanged`.
- [ ] `TrashFrame.tsx`: `TrashRow` → `BundleRow`, `deletedAt` → `storedAt`, asks `bundles:list` with `{ kind: 'trash' }`, subscribes to `storesChanged`; its look is untouched.
- [ ] `spend.ts`: `REFUSAL_TEXT`, `NO_DESTINATION`, and `withDestination` leave for the owner, with the `findContainerById`, `ArtifactRecord`, `Refusal`, and `NexusTree` imports.
- [ ] Sibling sweep: `trashRecovery.test.ts:13`, `:34` (`bundleRows(…, { kind: 'trash' }, …)` from `../Bundles/rows`); `spend.test.ts:15` (the import leaves with the describe); `TrashFrame.test.tsx:5`, `:19-31`, `:93`, `:138`, `:276`; `git grep -n "trashChanged" -- Core` names no other site.

**AFTER**

```Core/Bundles/rows.ts diff
+import { dirname, relative, titleFromPath } from '../Paths/posix'
+import { CONTEXTS_DIR_REL } from '../Paths/nexusPaths'
+import { type MatchKey, matchKey } from '../Paths/caseFold'
+import type { HeldKind } from '../Nexus/entities'
+import type { NexusTree } from '../Nexus/tree'
+import { containerTrailById } from '../Nexus/treePatch'
+import { type PropertyType, propertyType } from '../Properties/properties'
+import { contextWorldOf } from '../Contexts/contextResolve'
+import { type BundleStore, type ListedBundle, layoutOf, storedAtOf } from './bundle'
+import { resolveRecord } from './placement'
+import type { ArtifactRecord } from './record'
+
+/** `kind` is absent on a historical crumb, which is a frozen folder name rather than a live entity. */
+export interface BundleCrumb {
+  kind?: HeldKind
+  title: string
+}
+
+/** Main owns the parse: the renderer never sees a bundle suffix, a folder stamp, or the record union. */
+export interface BundleRow {
+  bundlePath: string
+  kind: HeldKind | 'property'
+  title: string
+  /** A property row's type, which picks its icon. */
+  propertyType?: PropertyType
+  /** Resolved live from the recorded parent id, so a renamed ancestor reads true. */
+  crumbs: BundleCrumb[]
+  /** Set when the recorded parent resolves to nothing and `crumbs` fell back to the frozen chain. */
+  historical?: boolean
+  /** Epoch milliseconds from the bundle's own stamp; null when it won't parse. */
+  storedAt: number | null
+  /** False when restoring would refuse for want of a home — the signal to ask where instead. */
+  homeResolves: boolean
+  /** The search's key: the title, placed by the crumbs. */
+  match: MatchKey
+}
+
+/** The only surviving evidence of where something lived once its recorded parent is gone. A store mirrors the nexus faithfully, Contexts included, so a Space's chain arrives wearing the internal folders the live breadcrumb never shows — the store's root and the Contexts prefix both come back off. */
+function frozenCrumbs(store: BundleStore, bundlePath: string): BundleCrumb[] {
+  const segments = relative(layoutOf(store).dir, dirname(bundlePath)).split('/').filter(Boolean)
+  const contexts = CONTEXTS_DIR_REL.split('/')
+  const inContexts = contexts.every((seg, i) => segments[i] === seg)
+  return (inContexts ? segments.slice(contexts.length) : segments).map((title) => ({ title }))
+}
+
+function liveCrumbs(record: ArtifactRecord, tree: NexusTree): BundleCrumb[] | null {
+  if (record.entity === 'context') return []
+  if (record.entity === 'space') {
+    const parent = record.parent
+    if (parent.kind !== 'context') return null
+    const group = contextWorldOf(tree.contexts).groupById.get(parent.id)
+    return group ? [{ kind: 'context', title: group.def.title }] : null
+  }
+  if (record.parent.kind === 'root') return record.entity === 'collection' ? [] : null
+  if (record.parent.kind !== 'container') return null
+  // Walked structurally rather than split from a path, since a crumb chain built from names is what the record model refuses.
+  const chain = containerTrailById(tree, record.parent.id)
+  return chain?.map((n) => ({ kind: n.kind, title: n.title })) ?? null
+}
+
+function homeResolvesFor(record: ArtifactRecord, artifactName: string, tree: NexusTree): boolean {
+  const resolution = resolveRecord(record, artifactName, tree)
+  return !('refuse' in resolution) || resolution.refuse === 'id-live'
+}
+
+const matched = (row: Omit<BundleRow, 'match'>): BundleRow => ({
+  ...row,
+  match: matchKey(row.title, row.crumbs.map((c) => c.title).join('/')),
+})
+
+/** A property record has no artifact to name it, so its title is its definition's own; it lived nowhere, so it always has a home to return to. */
+export function bundleRowOf(
+  bundle: ListedBundle,
+  store: BundleStore,
+  tree: NexusTree,
+): BundleRow | null {
+  const { record, bundlePath, artifactName } = bundle
+  if (record.entity === 'property') {
+    const type = propertyType.safeParse(record.def.type)
+    return matched({
+      bundlePath,
+      kind: 'property',
+      title: typeof record.def.label === 'string' ? record.def.label : record.id,
+      ...(type.success ? { propertyType: type.data } : {}),
+      crumbs: [],
+      storedAt: storedAtOf(bundlePath),
+      homeResolves: true,
+    })
+  }
+  if (!artifactName) return null
+  const live = liveCrumbs(record, tree)
+  return matched({
+    bundlePath,
+    kind: record.entity,
+    title: record.entity === 'page' ? titleFromPath(artifactName) : artifactName,
+    crumbs: live ?? frozenCrumbs(store, bundlePath),
+    ...(live ? {} : { historical: true }),
+    storedAt: storedAtOf(bundlePath),
+    homeResolves: homeResolvesFor(record, artifactName, tree),
+  })
+}
+
+export function bundleRows(
+  bundles: ListedBundle[],
+  store: BundleStore,
+  tree: NexusTree,
+): BundleRow[] {
+  return bundles
+    .map((b) => bundleRowOf(b, store, tree))
+    .filter((row) => row !== null)
+    .sort((a, b) => (b.storedAt ?? -1) - (a.storedAt ?? -1))
+}
```

```Core/Bundles/placement.ts diff
+// Where a recorded artifact re-enters: the placement resolved against the CURRENT tree, or the refusal that says why it cannot be placed.
+
+import { CONTEXTS_DIR_REL, contextDirRel } from '../Paths/nexusPaths'
+import { titleFromPath } from '../Paths/posix'
+import { freeName } from '../Paths/names'
+import { fail, fault, ok, type Result } from '../Contract/result'
+import type { NexusTree } from '../Nexus/tree'
+import type { RestoreDestination } from '../Nexus/mutateRequest'
+import { recordById } from '../Nexus/record'
+import { findContainerById } from '../Nexus/treePatch'
+import { contextWorldOf } from '../Contexts/contextResolve'
+import type { ArtifactRecord } from './record'
+
+interface Placement {
+  dir: string
+  finalName: string
+  /** For a page, Space, or Context: the final title restore writes everywhere (folder, registry, re-applied membership keys, the links its arrival re-spells). Recorded titles are labels; this is the decision. */
+  finalTitle?: string
+}
+
+export type Refusal = 'parent-gone' | 'cannot-hold' | 'unaddressable' | 'id-live'
+type Resolution = { place: Placement } | { refuse: Refusal }
+
+/** THE decision, against the CURRENT tree — a renamed parent resolves to its renamed path. The acting code branches on nothing: every name and title choice is made here. A live id refusal outranks every other answer — nothing may write over a living identity. */
+export function resolveRecord(
+  record: ArtifactRecord,
+  baseName: string,
+  tree: NexusTree,
+): Resolution {
+  const live = recordById(tree)
+  const recordId = record.entity === 'context' ? record.registry.id : record.id
+  if (recordId && live[recordId]) return { refuse: 'id-live' }
+
+  if (record.entity === 'context') {
+    const finalTitle = freeName(
+      record.registry.title,
+      tree.contexts.map((g) => g.def.title),
+    )
+    return { place: { dir: CONTEXTS_DIR_REL, finalName: finalTitle, finalTitle } }
+  }
+
+  if (record.entity === 'space') {
+    const parent = record.parent
+    if (parent.kind === 'unaddressable') return { refuse: 'unaddressable' }
+    if (parent.kind !== 'context') return { refuse: 'cannot-hold' }
+    const group = contextWorldOf(tree.contexts).groupById.get(parent.id)
+    if (!group) return { refuse: 'parent-gone' }
+    const finalTitle = freeName(
+      baseName,
+      group.spaces.map((s) => s.title),
+    )
+    return {
+      place: { dir: contextDirRel(group.def.title), finalName: finalTitle, finalTitle },
+    }
+  }
+
+  switch (record.parent.kind) {
+    case 'unaddressable':
+      return { refuse: 'unaddressable' }
+    case 'context':
+      return { refuse: 'cannot-hold' }
+    case 'root': {
+      if (record.entity !== 'collection') return { refuse: 'cannot-hold' }
+      const finalName = freeName(
+        baseName,
+        tree.collections.map((c) => c.title),
+      )
+      return { place: { dir: '', finalName } }
+    }
+    case 'container': {
+      if (record.entity === 'collection') return { refuse: 'cannot-hold' }
+      const parent = findContainerById(tree, record.parent.id)
+      if (!parent)
+        return live[record.parent.id] ? { refuse: 'cannot-hold' } : { refuse: 'parent-gone' }
+      // A page and a Set share one folder namespace — both sibling sets block both kinds.
+      const siblings = [
+        ...parent.pages.map((p) => p.title),
+        ...(parent.sets ?? []).map((s) => s.title),
+      ]
+      if (record.entity === 'page') {
+        const finalTitle = freeName(titleFromPath(baseName), siblings)
+        return { place: { dir: parent.path, finalName: `${finalTitle}.md`, finalTitle } }
+      }
+      return { place: { dir: parent.path, finalName: freeName(baseName, siblings) } }
+    }
+  }
+}
+
+export const REFUSAL_TEXT: Record<Refusal, string> = {
+  'parent-gone': 'The place this belonged to no longer exists.',
+  'cannot-hold': 'The place this belonged to can no longer hold it.',
+  unaddressable: 'Where this belonged was never recorded.',
+  'id-live': 'Something in the nexus already carries this identity.',
+}
+
+export const NO_DESTINATION = 'That kind cannot be given a destination.'
+
+export function withDestination(
+  record: ArtifactRecord,
+  destination: RestoreDestination,
+  tree: NexusTree,
+): Result<ArtifactRecord> {
+  switch (record.entity) {
+    case 'space':
+      if (destination.kind !== 'context') return fail('invalid-path', 'A Space lives in a Context.')
+      if (!contextWorldOf(tree.contexts).groupById.has(destination.id))
+        return fail('not-found', 'That Context no longer exists.')
+      return ok({ ...record, parent: { kind: 'context', id: destination.id } })
+    case 'page':
+    case 'set':
+      if (destination.kind !== 'container')
+        return fail('invalid-path', 'Pages and Sets live in Collections and Sets.')
+      if (!findContainerById(tree, destination.id))
+        return fail('not-found', 'That place no longer exists.')
+      return ok({ ...record, parent: { kind: 'container', id: destination.id } })
+    default:
+      return fault(NO_DESTINATION)
+  }
+}
```

```Core/Bundles/record.ts diff
@@ after RecordFile @@
 export type RecordFile = z.infer<typeof recordFile>
 
+/** The property shape is artifact-less — there is nothing to place. */
+export type ArtifactRecord = Exclude<RecordFile, { entity: 'property' }>
+
 export async function writeRecord(bundleDir: string, record: RecordFile): Promise<void> {
```

```Core/Bundles/handlers.ts diff
+import { type Handlers, withRoot } from '../Contract/handlers'
+import { fault, ok } from '../Contract/result'
+import { isPlainObject, isString } from '../Contract/validators'
+import { liveTreeOf } from '../Nexus/liveTree'
+import { holdsName } from '../Paths/names'
+import { type BundleStore, listBundles } from './bundle'
+import { bundleRows } from './rows'
+
+// An archive's id becomes one path segment under the Archive's root, so one the renderer hands in must stay a single segment.
+function storeFrom(raw: unknown): BundleStore | null {
+  if (!isPlainObject(raw)) return null
+  if (raw.kind === 'trash') return { kind: 'trash' }
+  return raw.kind === 'archive' && isString(raw.id) && holdsName(raw.id)
+    ? { kind: 'archive', id: raw.id }
+    : null
+}
+
+export const bundlesHandlers = {
+  'bundles:list': withRoot(async (root, _ctx, raw: unknown) => {
+    const store = storeFrom(raw)
+    if (!store) return fault('A store is required.')
+    return ok(bundleRows(await listBundles(root, store), store, await liveTreeOf(root)))
+  }),
+} satisfies Partial<Handlers>
```

```Core/Nexus/treePatch.ts diff
@@ after findContainerWhere @@
 ): CollectionNode | SetNode | null => containerTrailWhere(tree, match)?.at(-1) ?? null
+
+export const containerTrailById = (
+  tree: NexusTree,
+  id: string,
+): (CollectionNode | SetNode)[] | null => containerTrailWhere(tree, (n) => n.id === id)
+
+export const findContainerById = (tree: NexusTree, id: string): CollectionNode | SetNode | null =>
+  containerTrailById(tree, id)?.at(-1) ?? null
```

```Core/Actions/createActions.ts diff
@@ imports @@
-import { containerAt, findContainerWhere } from '../Nexus/treePatch'
+import { containerAt, findContainerById } from '../Nexus/treePatch'
@@ newPage @@
-  if (isContainer(from))
-    parentPath = findContainerWhere(tree, (n) => n.id === from.id)?.path ?? null
+  if (isContainer(from)) parentPath = findContainerById(tree, from.id)?.path ?? null
   else if (from?.kind === 'page') parentPath = relDirname(from.path)
```

```Core/Tiles/tilesFile.ts diff
@@ imports @@
-import { containerSchema, findContainerWhere } from '../Nexus/treePatch'
+import { containerSchema, findContainerById } from '../Nexus/treePatch'
@@ view @@
-    const source = findContainerWhere(tree, (c) => c.id === value.source_id)
+    const source = findContainerById(tree, value.source_id)
```

```Core/Trash/handlers.ts diff
@@ imports @@
-import { type Handlers, withRoot } from '../Contract/handlers'
+import type { Handlers } from '../Contract/handlers'
 import { ok, type Result } from '../Contract/result'
-import { liveTreeOf } from '../Nexus/liveTree'
 import { sessionRoot } from '../Nexus/session'
-import { listBundles } from '../Bundles/bundle'
 import { trashDeps } from './discard'
 import type { TrashMode } from './trashMode'
-import { trashRows } from './trashRows'
 import { SETTING_DEFAULTS } from '../Settings/personalization'
@@ trash:list @@
 export const trashHandlers = {
-  'trash:list': withRoot(async (root) => {
-    return ok(trashRows(await listBundles(root, { kind: 'trash' }), await liveTreeOf(root)))
-  }),
-
   'delete:facts': async (
```

```Core/Contract/bridge.ts diff
@@ imports @@
+import type { BundleStore } from '../Bundles/bundle'
+import type { BundleRow } from '../Bundles/rows'
 import type { TrashMode } from '../Trash/trashMode'
-import type { TrashRow } from '../Trash/trashRow'
@@ trash:list @@
-  // `.trash` is outside the watcher, so the browser asks again after every action it takes.
-  'trash:list': { args: []; reply: Result<TrashRow[]> }
+  // No push carries what a store holds, so a browser asks again after every action and on `storesChanged`.
+  'bundles:list': { args: [store: BundleStore]; reply: Result<BundleRow[]> }
```

```Core/Contract/serve.ts diff
@@ imports @@
 import { assetsHandlers } from '../Assets/handlers'
+import { bundlesHandlers } from '../Bundles/handlers'
 import { interfaceHandlers } from '../Interface/handlers'
@@ handlers @@
   ...trashHandlers,
+  ...bundlesHandlers,
   ...assetsHandlers,
```

```Core/Nexus/mutateRequest.ts diff
@@ changesSettled @@
   operation === 'emptyBundle'
+
+export const changesStores = (req: MutateRequest): boolean =>
+  req.op === 'delete' || req.op === 'restore' || req.op === 'emptyBundle'
```

```Core/Session/nexusSlice.ts diff
@@ imports @@
-import { changesSettled, type MutateOutcome, type MutateRequest } from '../Nexus/mutateRequest'
+import {
+  changesSettled,
+  changesStores,
+  type MutateOutcome,
+  type MutateRequest,
+} from '../Nexus/mutateRequest'
@@ trashChanged @@
-/** A delete, restore, or emptied bundle landed, so an open Trash list reads again. */
-export const trashChanged = emitter()
+/** What a store holds changed, so an open browser of it lists again. */
+export const storesChanged = emitter()
@@ mutate @@
-      if (req.op === 'delete' || req.op === 'restore' || req.op === 'emptyBundle')
-        trashChanged.emit()
+      if (changesStores(req)) storesChanged.emit()
```

```Core/Properties/Schema/PropertyFrame.tsx diff
@@ imports @@
-import { trashChanged } from '../../Session/nexusSlice'
+import { storesChanged } from '../../Session/nexusSlice'
@@ editorMenu @@
-      trashChanged.emit()
+      storesChanged.emit()
```

```Core/Settings/TrashFrame.tsx diff
@@ imports @@
-import type { TrashRow } from '../Trash/trashRow'
+import type { BundleRow } from '../Bundles/rows'
 …
-import { flushAllSaves, trashChanged } from '../Session/nexusSlice'
+import { flushAllSaves, storesChanged } from '../Session/nexusSlice'
@@ PLURALS, countPhrase, filterRows @@
-const PLURALS: Record<TrashRow['kind'], string> = {
+const PLURALS: Record<BundleRow['kind'], string> = {
 …
-export function countPhrase(rows: TrashRow[]): string {
+export function countPhrase(rows: BundleRow[]): string {
 …
-export function filterRows(rows: TrashRow[], query: string): TrashRow[] {
+export function filterRows(rows: BundleRow[], query: string): BundleRow[] {
@@ TrashBody @@
-  const [rows, setRows] = useState<TrashRow[] | null>(null)
+  const [rows, setRows] = useState<BundleRow[] | null>(null)
 …
-    const res = await dialer().ask('trash:list')
+    const res = await dialer().ask('bundles:list', { kind: 'trash' })
 …
-    return trashChanged.subscribe(() => void refresh())
+    return storesChanged.subscribe(() => void refresh())
 …
~   (TrashRow → BundleRow in `many`, `restoreBatch`, `emptyBatch`, `openMenu`, and `TrashRowView`'s props)
 …
-                    row.deletedAt === null
+                    row.storedAt === null
                       ? ''
                       : formatDate(
-                          new Date(row.deletedAt).toISOString(),
+                          new Date(row.storedAt).toISOString(),
```

```Core/Trash/spend.ts diff
@@ imports @@
-import type { NexusTree } from '../Nexus/tree'
 …
-import { findContainerById, resolveRecord, type ArtifactRecord, type Refusal } from './resolve'
+import { NO_DESTINATION, REFUSAL_TEXT, resolveRecord, withDestination } from '../Bundles/placement'
@@ REFUSAL_TEXT @@
-const REFUSAL_TEXT: Record<Refusal, string> = { … }
-
@@ withDestination @@
-const NO_DESTINATION = 'That kind cannot be given a destination.'
-
-function withDestination( … ): Result<ArtifactRecord> { … }
-
```

```Core/Settings/TrashFrame.test.tsx diff
@@ imports @@
-import type { TrashRow } from '../Trash/trashRow'
+import type { BundleRow } from '../Bundles/rows'
@@ row @@
-const row = (over: Partial<TrashRow>): TrashRow => {
+const row = (over: Partial<BundleRow>): BundleRow => {
 …
-    deletedAt: 0,
+    storedAt: 0,
@@ the mocks @@
-      'trash:list': vi.fn(async () => ({ ok: true, value: [row({ title: 'Alpha' })] })),
+      'bundles:list': vi.fn(async () => ({ ok: true, value: [row({ title: 'Alpha' })] })),
 …
-  let listed: TrashRow[]
+  let listed: BundleRow[]
+  let list: ReturnType<typeof vi.fn>
 …
     mutated = vi.fn(async () => ({ ok: true, value: {} }))
+    list = vi.fn(async () => ({ ok: true, value: listed }))
     ;(window as unknown as { nexus: unknown }).nexus = stubDialer({
-      'trash:list': vi.fn(async () => ({ ok: true, value: listed })),
+      'bundles:list': list,
 …
   it("lists the opened Nexus's trash after a switch", async () => {
     expect(titles()).toEqual(['Alpha'])
+    expect(list).toHaveBeenCalledWith({ kind: 'trash' })
 …
-      'trash:list': vi.fn(async () => ({ ok: true, value: listed })),
+      'bundles:list': vi.fn(async () => ({ ok: true, value: listed })),
```

**VERIFY**

- [ ] `rows.test.ts`, `placement.test.ts`, `Core/Bundles/handlers.test.ts`, `Core/Nexus/treePatch.test.ts`, `TrashFrame.test.tsx`, and `trashRecovery.test.ts` pass; "lists a delete made elsewhere while it is open" (`TrashFrame.test.tsx:313`) passes through `storesChanged`.
- [ ] `git grep -n "trash:list\|trashChanged\|TrashRow\b\|TrashCrumb\|deletedAt\|trashRowOf\|trashRows" -- Core Desktop` finds nothing.
- [ ] `git grep -n "Trash/resolve'\|Trash/trashRow" -- Core Desktop` and `git grep -n "from './resolve'\|from './trashRow" -- Core/Trash` find nothing.
- [ ] `git grep -nP "(containerTrailWhere|findContainerWhere)\(\w+, \((\w)\) => \2\.id === [\w.]+\)" -- Core ':!*.test.ts'` finds `treePatch.ts`' own `containerTrailById` alone: every other by-id lookup reads it or `findContainerById` (`findSet`'s kind-and-id predicate doesn't match).
- [ ] `npm run test -- engineGraph hostGraph` passes: the bridge type-imports `Core/Bundles/bundle.ts` and `Core/Bundles/rows.ts`, and the graph from `serve.ts` reaches `Core/Bundles/handlers.ts`, `rows.ts`, and `placement.ts`, none importing React.
- [ ] Run the gates.
- [ ] Check for unnecessary code or mistakes.

**Lines:** ≈ +31 (+288 / −257) (view-delta's Actionable column, moved lines on both sides), ≈ 213 of them moved, whole-file removals counted from HEAD as Tasks 2-1 and 2-2 leave them. By file: `rows.ts` +101, `placement.ts` +115, `record.ts` +2, `treePatch.ts` +8, `createActions.ts` +2 / −3, `tilesFile.ts` +2 / −2, `Bundles/handlers.ts` +23, `trashRow.ts` −20, `trashRows.ts` −79, `resolve.ts` −88, `spend.ts` +1 / −34, `Trash/handlers.ts` +1 / −8, `TrashFrame.tsx` +15 / −15, `nexusSlice.ts` +8 / −4, `bridge.ts` +3 / −2, `serve.ts` +2, `mutateRequest.ts` +3, `PropertyFrame.tsx` +2 / −2. Tests: `handlers.test.ts` ≈ +50, `placement.test.ts` moved ≈ 180, the rows test's archive case +12.

#### Task 2-4

**TASK:** Make every restore, returning by id to the Collection or Set it left (E-1), land at its exact place in that order (E-2) through a recorded `place` and `placeRecord`'s composed order write; move `spliceBeside` and `Slot` to `Core/Nexus/order.ts`; make a delete leave its order, as a move does, through one `dropDeparture`, and a Context gone for good take its panel id with its Space order.

**NOW:** `spliceBeside` and `Slot` live in `Core/Views/creationOrder.ts:10-28`, importing `nextOrder` from `@pommora/uix/Utilities/moveItem` (already an engine-graph UIX leaf). The tree's child lists are already the resolved order. `reorder.ts`'s `setChildOrder`/`dropFromChildOrder` (`:66-79`) write a sidecar's `page_order`/`set_order`; `setCollectionOrder`/`setSpaceOrder` write `state.json` through `writeStateOrder` (`:13-21`). Only the move ops (`move.ts:34-38`, `:60-64`) call `dropFromChildOrder`; `deleteOp` drops nothing, so trashed ids linger in every order. `gatherContentRecord` calls `liveTreeOf` itself; `deleteOp` calls `gatherSpaceRecord(abs, registry, swept)` (`gather.ts:79-102`) at `delete.ts:69`, `:71`, after `before = await liveTreeOf(root)` (`:37`). `restoreArtifact` writes no order. Trap: `resolveRecord` is also the rows' per-row `homeResolves` probe, so the order is composed outside it. A Context returns to its slot through `at` (`spend.ts:208`). `dropSpaceOrder` (`reorder.ts:50-55`) drops a Context's Space order when the Context is gone for good and leaves its panel id in `order.contexts`. The `movePage` comment (`mutateRequest.ts:88`) is false: an absent order sorts the page among unnamed ids by title, or by id where the folder has none (`order.ts:11-14`, `:25`), and a move drops its own source id.

**CHANGE**

- [ ] Write and watch fail: `Core/Bundles/placement.test.ts` › `describe('slotOf')`: "lands above the sibling it sat above while that one is live", "lands below the sibling it sat below once the one after it is gone", "lands first when nothing preceded it and its follower is gone", "lands last when neither neighbour is live, or the record holds no place"; `describe('placeRecord')`: "composes the parent’s full order with the item in its slot", "a picked destination drops the place and lands last", "writes a Space’s order under its own Context when another Context shares its title" (two Contexts titled `Areas`; the order lands under `ctx_b` alone). `Core/Nexus/reorder.test.ts`' two `dropSpaceOrder` cases become "dropContextOrder removes the Context’s panel id and its Space order, leaving the rest" and "dropContextOrder writes nothing when the Context has no order"; `spend.test.ts`' "emptying a Context’s bundle drops its Space order" and "a system-trash Context delete drops its Space order at once" become "emptying a Context’s bundle drops its panel id and its Space order" and "a system-trash Context delete drops its panel id and its Space order at once", each expecting `contexts: ['ctx_areas']`. `Core/Trash/spend.test.ts` bundle describe (`:103`): "a page records its place between its neighbours as the tree shows them", "a Set records its place in its container’s set_order", "a Collection records its place among the root’s Collections", "a Space records its place in its Context’s order". `Core/Trash/trashRecovery.test.ts`: "a page deleted and restored comes back where it was, and leaves the list" (`:122`) becomes "a page deleted and restored comes back between its old neighbours, and leaves the list" (a sibling each side under a written `page_order`; restored between them); new: "a Set restored returns to its slot in set_order", "a Collection restored returns to its slot in state.order.collections", "a Space restored returns to its slot in its Context’s Space order", "a restore into a folder with no written order writes the order the folder showed, with the page in its slot", "a record from before the place was kept lands last, the order written whole" (`place` removed by hand). "restore — into a chosen destination" (`spend.test.ts:1854`) gains "a picked destination lands last in the destination’s order". `Core/Nexus/mutate.test.ts` › `describe('handleMutate — delete')` (`:621`) gains "a page delete drops its id from the source folder’s page_order, in either Trash Mode", "a Set delete drops its id from the source container’s set_order, and the key with its last id" (the container's only Set; `set_order` leaves the sidecar, as `reorder.test.ts:135` expected), "a Collection delete drops its id from state.json’s order.collections", "a Space delete drops its id from its Context’s order in state.json". `Core/Nexus/order.test.ts` takes `describe('spliceBeside')` from `creationOrder.test.ts:92-96`.
- [ ] `order.ts`: take `Slot` and `spliceBeside` from `creationOrder.ts:10-28` with the `nextOrder` import; `creationOrder.ts` imports them from `../Nexus/order` and drops `nextOrder`; `useViewCreation.ts:22` imports `type Slot` from `../../Nexus/order`.
- [ ] `Core/Bundles/record.ts`: the content and Space records gain `place`; `placeOf(ids, id)` answers it from an id list; `gatherContentRecord(root, tree, kind, abs)` reads its parent and siblings from the passed tree (a page in its container's `pages`, a Set in `sets`, a Collection in `tree.collections`), dropping its `liveTreeOf` read and import.
- [ ] `gather.ts`: `gatherSpaceRecord(tree, abs, registry, swept)` records `place` among its Context's `spaces`.
- [ ] `Core/Bundles/placement.ts`: `slotOf(place, liveIds)`; `resolveRecord`'s resolution carries `order?: SiblingOrder` beside its placement, built from the parent node it already holds: the siblings it lands among, as the tree holds them, and the one writer of their order (`setChildOrder` for a page or Set, `setCollectionOrder`, `setSpaceOrder`); `placeRecord(root, record, destination, baseName, tree)` runs `withDestination` and `resolveRecord`, answers `REFUSAL_TEXT`'s refusal, and, for a record with an id landing in an order, answers the order's ids spliced through `slotOf` and `spliceBeside` with its write; `withDestination` drops `place`, so a picked destination lands last. Unexport `REFUSAL_TEXT` and `withDestination`.
- [ ] `spend.ts`: `restoreArtifact` places through `placeRecord` and runs its order write after the relocate; Contexts keep `at`.
- [ ] `Core/Nexus/reorder.ts`: add `dropDeparture(root, tree, kind, rel)` beside `dropFromChildOrder`, mapping a departing kind to the order it leaves (a page's `page_order`, a Set's `set_order`, a Collection's `order.collections`, a Space's `order.spaces[<context id>]`, the last two through `writeStateOrder`), reading the id from the passed tree. Unexport `dropFromChildOrder`. `dropSpaceOrder` becomes `dropContextOrder`, taking the Context's panel id from `order.contexts` with its Space order; `delete.ts`' system-trash Context delete and `spend.ts`' `emptyBundle` call it.
- [ ] `delete.ts`: `deleteOp` calls `dropDeparture(root, before, req.kind, req.path)` after the move, in either Trash Mode, and passes `before` to `gatherContentRecord` and `gatherSpaceRecord`. An emptied Collection leaves no id in `state.json`; a Context keeps its panel id while bundled (`spend.test.ts:215-228`) and leaves it once gone for good.
- [ ] `Core/Nexus/move.ts` (Take Along): `movePageOp` and `moveSetOp` drop through `dropDeparture` with the tree each already reads; the `containerAt`/`pageAt` import leaves; `mutate.test.ts:792`, `:807` pin both unchanged.
- [ ] `mutateRequest.ts:88` (K-5): rewrite the comment to say what an absent order does, dropping its second sentence.
- [ ] Sibling sweep: `placement.test.ts`' `resolveRecord` cases compare `'place' in r && r.place`, since a resolution carries its order beside its placement; `creationOrder.test.ts:3` (`type Slot` from `../Nexus/order`; `spliceBeside` leaves its import); `reorder.test.ts:6` (the import) and `describe('dropFromChildOrder')` (`:134-148`) leave, the departure cases covering both arms and the key drop; every `gatherContentRecord`/`gatherSpaceRecord` call (`git grep -n "gatherContentRecord(\|gatherSpaceRecord(" -- Core` lists `delete.ts` alone); `spend.test.ts`'s `toMatchObject` record cases (`:104-185`) stay green with `place` added.

**AFTER**

```Core/Nexus/order.ts diff
@@ imports @@
 import { compareTitles } from '../Paths/caseFold'
+import { nextOrder } from '@pommora/uix/Utilities/moveItem'
@@ resolveOrder @@
   return [...known, ...rest]
 }
+
+export type Slot = 'above' | 'below' | 'first' | 'last'
+
+export function spliceBeside(
+  ids: string[],
+  anchorId: string | null,
+  item: string,
+  where: Slot,
+): string[] {
+  const at = anchorId === null ? -1 : ids.indexOf(anchorId)
+  const before =
+    where === 'first'
+      ? (ids[0] ?? null)
+      : where === 'above'
+        ? anchorId
+        : where === 'below' && at >= 0
+          ? (ids[at + 1] ?? null)
+          : null
+  return nextOrder(ids, item, before)
+}
```

```Core/Views/creationOrder.ts diff
@@ imports @@
 import { type Personalization, type Placement, settingOf } from '../Settings/personalization'
-import { nextOrder } from '@pommora/uix/Utilities/moveItem'
+import { type Slot, spliceBeside } from '../Nexus/order'
 import { containerAt, pageIdsIn } from '../Nexus/treePatch'
@@ spliceBeside @@
-export type Slot = 'above' | 'below' | 'first' | 'last'
-
-export function spliceBeside( … ): string[] { … }
-
```

```Core/Views/Host/useViewCreation.ts diff
@@ imports @@
-import { placeAt, placementSlot, type Slot, tieOrderWith } from '../creationOrder'
+import { placeAt, placementSlot, tieOrderWith } from '../creationOrder'
+import type { Slot } from '../../Nexus/order'
```

```Core/Bundles/record.ts diff
@@ imports @@
 import type { ContainerKind } from '../Nexus/entities'
-import { liveTreeOf } from '../Nexus/liveTree'
+import type { NexusTree } from '../Nexus/tree'
 import { containerAt } from '../Nexus/treePatch'
@@ place @@
+/** The ids of the siblings it sat above and below in its origin's order as it left, so a restore lands it back between them. */
+const place = z.object({ above: z.string().optional(), below: z.string().optional() }).optional()
+
+export type Place = NonNullable<z.infer<typeof place>>
+
 const contentRecord = <E extends string>(entity: E) =>
   z.object({
     entity: z.literal(entity),
     id: z.string().optional(),
     parent: parentRef,
+    place,
@@ recordFile @@
   z.object({
     entity: z.literal('space'),
     id: z.string(),
     parent: parentRef,
+    place,
     members: z.array(memberRoot),
@@ placeOf @@
+export function placeOf(ids: readonly string[], id: string): Place | undefined {
+  const at = ids.indexOf(id)
+  if (at === -1) return undefined
+  const above = ids[at + 1]
+  const below = ids[at - 1]
+  return { ...(above ? { above } : {}), ...(below ? { below } : {}) }
+}
@@ gatherContentRecord @@
 export async function gatherContentRecord(
   root: string,
+  tree: NexusTree,
   kind: 'page' | ContainerKind,
   abs: string,
 ): Promise<RecordFile> {
   const id = kind === 'page' ? await stampedIdOf(abs) : await sidecarId(abs, kind)
   const atRoot = dirname(abs) === root
-  const container = atRoot
-    ? null
-    : containerAt(await liveTreeOf(root), relative(root, dirname(abs)))
+  const container = atRoot ? null : containerAt(tree, relative(root, dirname(abs)))
+  const siblings: readonly { id: string }[] | undefined = atRoot
+    ? tree.collections
+    : kind === 'page'
+      ? container?.pages
+      : container?.sets
+  const placed = id && siblings ? placeOf(siblings.map((n) => n.id), id) : undefined
   return {
     entity: kind,
     ...(id ? { id } : {}),
     parent: atRoot
       ? { kind: 'root' }
       : container
         ? { kind: 'container', id: container.id }
         : { kind: 'unaddressable' },
+    ...(placed ? { place: placed } : {}),
   }
 }
```

```Core/Trash/gather.ts diff
@@ imports @@
 import type { NexusTree } from '../Nexus/tree'
 import type { Relation } from '../Platform/stores'
+import { contextWorldOf } from '../Contexts/contextResolve'
 
-import type { RecordFile } from '../Bundles/record'
+import { placeOf, type RecordFile } from '../Bundles/record'
@@ gatherSpaceRecord @@
 export async function gatherSpaceRecord(
+  tree: NexusTree,
   abs: string,
   registry: Result<ContextsRegistry> | null,
   swept: UnlinkOutcome | null,
 ): Promise<RecordFile | null> {
 …
   const def = registry?.ok
     ? registry.value.contexts.find((c) => c.title === contextTitle)
     : undefined
+  const group = def && contextWorldOf(tree.contexts).groupById.get(def.id)
+  const place = group && placeOf(group.spaces.map((s) => s.id), id)
 …
   return {
     entity: 'space',
     id,
     parent: def ? { kind: 'context', id: def.id } : { kind: 'unaddressable' },
+    ...(place ? { place } : {}),
     members,
```

```Core/Bundles/placement.ts diff
@@ imports @@
-import { titleFromPath } from '../Paths/posix'
+import { join, titleFromPath } from '../Paths/posix'
 …
 import { findContainerById } from '../Nexus/treePatch'
+import { type Slot, spliceBeside } from '../Nexus/order'
+import { setChildOrder, setCollectionOrder, setSpaceOrder } from '../Nexus/reorder'
 import { contextWorldOf } from '../Contexts/contextResolve'
-import type { ArtifactRecord } from './record'
+import type { ArtifactRecord, Place } from './record'
@@ Resolution @@
+/** The siblings it lands among, held as the tree holds them, and the one writer of their order. */
+interface SiblingOrder {
+  siblings: readonly { id: string }[]
+  write: (root: string, ids: string[]) => Promise<unknown>
+}
+
 export type Refusal = 'parent-gone' | 'cannot-hold' | 'unaddressable' | 'id-live'
-type Resolution = { place: Placement } | { refuse: Refusal }
+type Resolution = { place: Placement; order?: SiblingOrder } | { refuse: Refusal }
@@ resolveRecord — the Space arm @@
     return {
       place: { dir: contextDirRel(group.def.title), finalName: finalTitle, finalTitle },
+      order: {
+        siblings: group.spaces,
+        write: (root, ids) => setSpaceOrder(root, group.def.id, ids),
+      },
     }
@@ resolveRecord — the root arm @@
-      return { place: { dir: '', finalName } }
+      return {
+        place: { dir: '', finalName },
+        order: { siblings: tree.collections, write: setCollectionOrder },
+      }
@@ resolveRecord — the container arm @@
       ]
+      const key = record.entity === 'page' ? 'page_order' : 'set_order'
+      const order: SiblingOrder = {
+        siblings: record.entity === 'page' ? parent.pages : (parent.sets ?? []),
+        write: (root, ids) => setChildOrder(join(root, parent.path), key, ids),
+      }
       if (record.entity === 'page') {
         const finalTitle = freeName(titleFromPath(baseName), siblings)
-        return { place: { dir: parent.path, finalName: `${finalTitle}.md`, finalTitle } }
+        return { place: { dir: parent.path, finalName: `${finalTitle}.md`, finalTitle }, order }
       }
-      return { place: { dir: parent.path, finalName: freeName(baseName, siblings) } }
+      return { place: { dir: parent.path, finalName: freeName(baseName, siblings) }, order }
@@ REFUSAL_TEXT @@
-export const REFUSAL_TEXT: Record<Refusal, string> = {
+const REFUSAL_TEXT: Record<Refusal, string> = {
@@ withDestination @@
-export function withDestination(
+function withDestination(
 …
-      return ok({ ...record, parent: { kind: 'context', id: destination.id } })
+      return ok({ ...record, parent: { kind: 'context', id: destination.id }, place: undefined })
 …
-      return ok({ ...record, parent: { kind: 'container', id: destination.id } })
+      return ok({ ...record, parent: { kind: 'container', id: destination.id }, place: undefined })
@@ slotOf @@
+export function slotOf(
+  place: Place | undefined,
+  liveIds: readonly string[],
+): { anchor: string | null; where: Slot } {
+  if (place?.above && liveIds.includes(place.above)) return { anchor: place.above, where: 'above' }
+  if (place?.below && liveIds.includes(place.below)) return { anchor: place.below, where: 'below' }
+  return { anchor: null, where: place && !place.below ? 'first' : 'last' }
+}
+
+export function placeRecord(
+  root: string,
+  stored: ArtifactRecord,
+  destination: RestoreDestination | undefined,
+  baseName: string,
+  tree: NexusTree,
+): Result<{ record: ArtifactRecord; placement: Placement; writeOrder?: () => Promise<unknown> }> {
+  const rehomed = destination ? withDestination(stored, destination, tree) : ok(stored)
+  if (!rehomed.ok) return rehomed
+  const record = rehomed.value
+  const resolution = resolveRecord(record, baseName, tree)
+  if ('refuse' in resolution) return fault(REFUSAL_TEXT[resolution.refuse])
+  const placement = resolution.place
+  const { order } = resolution
+  if (record.entity === 'context' || !record.id || !order) return ok({ record, placement })
+  const ids = order.siblings.map((n) => n.id)
+  const { anchor, where } = slotOf(record.place, ids)
+  const next = spliceBeside(ids, anchor, record.id, where)
+  return ok({ record, placement, writeOrder: () => order.write(root, next) })
+}
```

```Core/Trash/spend.ts diff
@@ imports @@
-import { dropSpaceOrder } from '../Nexus/reorder'
+import { dropContextOrder } from '../Nexus/reorder'
 …
-import { NO_DESTINATION, REFUSAL_TEXT, resolveRecord, withDestination } from '../Bundles/placement'
+import { NO_DESTINATION, placeRecord } from '../Bundles/placement'
@@ emptyBundle @@
-  if (record.entity === 'context') await dropSpaceOrder(root, record.registry.id)
+  if (record.entity === 'context') await dropContextOrder(root, record.registry.id)
@@ restoreArtifact @@
   const tree = await liveTreeOf(root)
-  const rehomed = destination ? withDestination(stored, destination, tree) : ok(stored)
-  if (!rehomed.ok) return rehomed
-  const record = rehomed.value
-  const resolution = resolveRecord(record, basename(artifactAbs), tree)
-  if ('refuse' in resolution) return fault(REFUSAL_TEXT[resolution.refuse])
-  const { dir, finalName, finalTitle } = resolution.place
+  const placed = placeRecord(root, stored, destination, basename(artifactAbs), tree)
+  if (!placed.ok) return placed
+  const { record, placement, writeOrder } = placed.value
+  const { dir, finalName, finalTitle } = placement
 …
   } catch (e) {
     // The move is the irreversible half; …
     …
     return fault(e)
   }
+  await writeOrder?.()
```

```Core/Nexus/reorder.ts diff
@@ imports @@
 import { sidecarPath } from '../Paths/paths'
+import { dirname, join } from '../Paths/posix'
 import { ok, type Result } from '../Contract/result'
 import type { ChildOrderKey } from './mutateRequest'
-import { CONTAINER_KINDS } from './entities'
+import { CONTAINER_KINDS, type HeldKind } from './entities'
+import type { NexusTree } from './tree'
+import { containerAt, pageAt, spaceAt } from './treePatch'
@@ dropSpaceOrder → dropContextOrder @@
-/** A Context gone for good takes its Space order with it. */
-export const dropSpaceOrder = (nexusRoot: string, contextId: string): StateOrderWrite =>
+/** A Context gone for good takes its panel id and its Space order with it. */
+export const dropContextOrder = (nexusRoot: string, contextId: string): StateOrderWrite =>
   writeStateOrder(nexusRoot, (order) => {
+    const panel = withoutId(order, 'contexts', contextId)
     const { [contextId]: dropped, ...spaces } = spacesOf(order)
-    return dropped === undefined ? null : { ...order, spaces }
+    if (dropped === undefined) return panel
+    return { ...(panel ?? order), spaces }
   })
@@ dropFromChildOrder, dropDeparture's alone @@
-export const dropFromChildOrder = (
+const dropFromChildOrder = (
   absFolder: string,
   key: ContainerOrderKey,
   id: string,
 ): Promise<Result<unknown>> => patchContainer(absFolder, (cur) => withoutId(cur, key, id))
 
+/** A departing item leaves the order it sat in, its id read from `tree`, the tree from before it left. A Context keeps its panel id while bundled, as its restore returns to it. */
+export async function dropDeparture(
+  root: string,
+  tree: NexusTree,
+  kind: HeldKind,
+  rel: string,
+): Promise<void> {
+  switch (kind) {
+    case 'page':
+    case 'set': {
+      const id = (kind === 'page' ? pageAt(tree, rel) : containerAt(tree, rel))?.id
+      const key = kind === 'page' ? 'page_order' : 'set_order'
+      if (id) await dropFromChildOrder(dirname(join(root, rel)), key, id)
+      return
+    }
+    case 'collection': {
+      const id = containerAt(tree, rel)?.id
+      if (id) await writeStateOrder(root, (order) => withoutId(order, 'collections', id))
+      return
+    }
+    case 'space': {
+      const space = spaceAt(tree, rel)
+      if (space)
+        await writeStateOrder(root, (order) => {
+          const spaces = withoutId(spacesOf(order), space.contextId, space.id)
+          return spaces && { ...order, spaces }
+        })
+      return
+    }
+    case 'context':
+      return
+  }
+}
+
 export async function setChildOrder(
```

```Core/Nexus/move.ts diff
@@ imports (as Phase 1-1 left them) @@
 import { goneEdit, reachConfig, reachReport } from './configReach'
-import { dropFromChildOrder, setChildOrder } from './reorder'
-import { containerAt, pageAt } from './treePatch'
+import { dropDeparture, setChildOrder } from './reorder'
@@ movePageOp @@
-  const id = pageAt(await liveTreeOf(root), req.path)?.id
+  const tree = await liveTreeOf(root)
   const r = await movePage(at.value.src, at.value.dst)
   if (!r.ok) return r
-  if (id) await dropFromChildOrder(dirname(at.value.src), 'page_order', id)
+  await dropDeparture(root, tree, 'page', req.path)
   if (req.order) await setChildOrder(at.value.dst, 'page_order', req.order)
@@ moveSetOp @@
   const edit = left === null ? null : goneEdit(held, 'set', req.path)
-  const id = containerAt(held, req.path)?.id
   const r = await moveFolderEntity(root, at.value.src, at.value.dst)
   if (!r.ok) return r
-  if (id) await dropFromChildOrder(dirname(at.value.src), 'set_order', id)
+  await dropDeparture(root, held, 'set', req.path)
   await setChildOrder(at.value.dst, 'set_order', req.order)
```

```Core/Trash/delete.ts diff
@@ imports @@
-import { dropSpaceOrder } from '../Nexus/reorder'
+import { dropContextOrder, dropDeparture } from '../Nexus/reorder'
@@ deleteOp @@
   const before = await liveTreeOf(root)
   const edit = goneEdit(before, req.kind, req.path)
 …
-    if (write) await write(await gatherSpaceRecord(abs, registry, null))
+    if (write) await write(await gatherSpaceRecord(before, abs, registry, null))
 …
-    if (write) await write(await gatherSpaceRecord(abs, registry, valueOr(swept, null)))
+    if (write) await write(await gatherSpaceRecord(before, abs, registry, valueOr(swept, null)))
 …
-    if (entry && !bundle) await dropSpaceOrder(root, entry.id)
+    if (entry && !bundle) await dropContextOrder(root, entry.id)
 …
-    record = write ? await gatherContentRecord(root, req.kind, abs) : null
+    record = write ? await gatherContentRecord(root, before, req.kind, abs) : null
 …
   if (bundle) await relocate(abs, join(bundle, basename(abs)))
   else await machine().lock(abs, () => discardFile(root, abs, deps))
+  await dropDeparture(root, before, req.kind, req.path)
   await dropPageMetadata(root, pageIds)
```

```Core/Nexus/mutateRequest.ts diff
@@ movePage @@
-  // Absent order = legacy append. Stale ids in a source container self-drop on the next read.
+  // Absent an order, the destination's order stands, and the page sorts where `resolveOrder` places an id its order doesn't name.
   op('movePage', { path: z.string(), newParentPath: z.string(), order: ids.optional() }),
```

```Core/Nexus/reorder.test.ts diff
@@ imports @@
 import {
-  dropFromChildOrder,
-  dropSpaceOrder,
+  dropContextOrder,
 …
@@ dropContextOrder @@
-  it('dropSpaceOrder removes the Context’s Space order and leaves the rest', async () => {
+  it('dropContextOrder removes the Context’s panel id and its Space order, leaving the rest', async () => {
 …
-    await dropSpaceOrder(root, 'ctx_projects')
+    await dropContextOrder(root, 'ctx_projects')
     expect((await readState()).order).toEqual({
       spaces: { ctx_areas: ['x'] },
-      contexts: ['ctx_projects', 'ctx_areas'],
+      contexts: ['ctx_areas'],
     })
   })
 
-  it('dropSpaceOrder writes nothing when the Context has no order', async () => {
-    await dropSpaceOrder(root, 'ctx_projects')
+  it('dropContextOrder writes nothing when the Context has no order', async () => {
+    await dropContextOrder(root, 'ctx_projects')
@@ dropFromChildOrder @@
-describe('dropFromChildOrder', () => { … })
-
```

```Core/Views/creationOrder.test.ts diff
@@ imports @@
-import { placeAt, placeNew, type Slot, spliceBeside, tieOrderWith } from './creationOrder'
+import { placeAt, placeNew, tieOrderWith } from './creationOrder'
+import type { Slot } from '../Nexus/order'
@@ spliceBeside @@
-describe('spliceBeside', () => { … })
-
```

```Core/Nexus/order.test.ts diff
@@ imports @@
-import { resolveOrder } from './order'
+import { resolveOrder, spliceBeside } from './order'
@@ spliceBeside @@
+
+describe('spliceBeside', () => {
+  it('appends for a null anchor — the drop that landed past the last visible card', () => {
+    expect(spliceBeside(['a', 'b'], null, 'x', 'above')).toEqual(['a', 'b', 'x'])
+  })
+})
```

**VERIFY**

- [ ] The listed tests pass; "a Context in the Trash keeps its order, and its restore returns to its sidebar place" (`spend.test.ts:215`) and "a record from before the place was kept restores its Context at the end" (`:230`) pass unchanged.
- [ ] `git grep -n "legacy append\|self-drop" -- Core/Nexus/mutateRequest.ts` finds nothing.
- [ ] `mutate.test.ts` "movePage drops the page's id from the source folder's page_order" (`:792`) and "moveSet drops the Set's id from the source container's set_order" (`:807`) pass unchanged; `git grep -n "dropFromChildOrder" -- Core` finds `reorder.ts` alone, and `git grep -n "dropSpaceOrder\|siblingOrder" -- Core` finds nothing.
- [ ] `git grep -n "spliceBeside\|type Slot\b" -- Core ':!Core/MarkdownPM'` finds `Core/Nexus/order.ts` and its importers (`creationOrder.ts`, `useViewCreation.ts`, `placement.ts`, and the tests) only.
- [ ] `npm run test -- engineGraph hostGraph` passes with its UIX leaf list unchanged: the host already reaches `UIX/Utilities/moveItem.ts` (`engineGraph.test.ts:31`), which `order.ts` now imports.
- [ ] Run the gates.
- [ ] Check for unnecessary code or mistakes.

**Lines:** +110 (+171 / −61) (view-delta's Actionable column, moved lines on both sides), 20 of them moved. By file: `placement.ts` +58 / −10, `record.ts` +23 / −4, `order.ts` +21, `reorder.ts` +42 / −4, `delete.ts` +6 / −5, `move.ts` +4 / −6, `gather.ts` +6 / −1, `spend.ts` +8 / −9, `creationOrder.ts` +1 / −21, `useViewCreation.ts` +2 / −1; the K-5 rewrite is a comment. Tests ≈ +185.

#### Task 2-5

**TASK:** Let a restore step aside past the disk (E-4): a module-private `freeOnDisk` inside `placeRecord` steps past an outside file, an excluded folder, or the asset directory, replacing the landing and `exists` refusals; the reply carries the title taken as `landedAs`, and the Trash's notice names it in the approved copy through `notifyOutcome`, the one composer the delete's notice shares, counts in Title Case (Take Along). Drive group 2 proves E-2 and E-4 on the running app.

**NOW:** `restoreArtifact` refuses an excluded landing through `landingRefusal` (HEAD `spend.ts:174-179`) and an occupant the tree can't see with `fail('exists', 'Something already sits at the restored location.')` and its squatter comment (`:180-182`). Task 2-4's `placeRecord` is synchronous and tree-only; `homeResolvesFor` calls `resolveRecord` alone. `createDisambiguated(name, attempt, taken)` (`names.ts:66-79`) retries on `'exists'` up to `(50)` under `freeName`'s base rule. `landingRefusal` and the `targetTaken`/`pathExists` refusals stay in create, rename, and move, where a user-chosen name is refused, not changed. `TrashFrame.tsx`'s report (`:129-151`) joins `Restored ${countPhrase(done)}.` with the unmet lines; the single-row path (`:99-101`) posts nothing on success; `countPhrase` (`:36-50`) answers lowercase kinds ("2 pages"). `notifyUndoable(message, undo?, tone, retry?, segment?)` (`notifications.ts:106-137`) carries a segment and posts a plain notice without `undo`; `notifyDeleted` (`:84-101`) composes its head, link count, and warning inline before calling it; `notifyReport` carries none. `spend.test.ts:1506` "an occupant the tree cannot see refuses the restore — never a clobber" and `:1527` "a Set restored onto a folder Settings excludes refuses, the bundle intact" pin the refusals; `placement.test.ts`'s "disambiguates a taken title, matching the create convention" stays. The Archive Drive (`.claude/scripts/Archive Drive/live-drive.mjs`, `MATRIX.md`) holds group 1 alone.

**CHANGE**

- [ ] Write and watch fail: `spend.test.ts:1506` becomes "an occupant the tree cannot see is stepped around — never a clobber" (`landedAs: 'Alpha (2)'`, `Notes/Daily/Alpha (2).md` holds the page, the squatter's bytes unchanged, the bundle gone); `:1527` becomes "a Set restored onto a folder Settings excludes steps aside, the excluded entry untouched" (`landedAs: 'Daily (2)'`, `Notes/Daily (2)/_pageset.json` exists, `settings.json` as written); new: "a restore whose title the tree already holds answers the title it took" (a live `Alpha` → `landedAs: 'Alpha (2)'`), "a restore landing on its own title answers no landedAs", "a Space steps past a folder its Context holds that the tree doesn’t", "a Context steps past a folder under .nexus/contexts the registry doesn’t name, and the registry takes the stepped title". `Core/Bundles/placement.test.ts` takes its own temp root (`root = tempRoot('pom-placement-')` in a `beforeEach`, removed in an `afterEach`), passed to every `placeRecord` case; `describe('placeRecord')` (Task 2-4's two cases now awaiting it) gains "lands at the tree’s placement when the disk holds nothing there, answering no landedAs", "steps a page past a file of its name, answering the title it took", "steps a Set past an excluded entry with no folder on disk", "steps a page past a file of its name alone, and a Set past a folder of its name alone, leaving a namesake of the other form beside it" (an outside `Notes/Journal/Alpha/` leaves page `Alpha` at `Alpha.md`, and an outside `Notes/Daily.md` leaves Set `Daily` at `Daily`, neither answering `landedAs`), and "answers no landedAs for a Context whose registry title differs from its folder’s name only by case" (registry `Projects` restored from a `projects` folder keeps `Projects`). `TrashFrame.test.tsx`: `countPhrase`'s three kind cases flip to Title Case ("2 Pages", "2 Sets", "2 Contexts", "1 Page", "1 Space"); "carries what a Restore All couldn’t re-spell into its notice" (`:292`) and "carries what a Delete All couldn’t strip into its notice" (`:302`) read `Restored 2 Pages. ${warning}` and `Deleted 2 Pages. ${warning}`; new: "names the title a restore here stepped to" (`Restored “Alpha” as “Alpha (2)”`, tone normal), "a Restore All with one renamed names it in the segment" (`{ message: 'Restored 2 Pages', segment: '“Alpha” as “Alpha (2)”' }`), "a Restore All with several renamed counts them" (`segment: '2 Renamed'`).
- [ ] `placement.ts`: module-private `freeOnDisk(root, entity, placement)` wraps `createDisambiguated` with a disk probe of the item's own form alone (a page's `.md` file, any other kind's folder), as E-4 reads a taken name, where a Collection's or Set's `landingRefusal` also counts as taken, and answers the placement under the stepped title, or the last `'exists'` refusal after fifty steps. `placeRecord` becomes async, steps its resolved placement through it before composing the order, and answers `landedAs` when the title taken isn't the one it asked for: a Context's registry title, any other kind's artifact name. `homeResolvesFor` keeps calling `resolveRecord` alone, so a listing probes no disk. The header and `resolveRecord`'s doc name the disk step.
- [ ] `spend.ts`: the landing arm, the `exists` refusal, the squatter comment, and the `landingRefusal` and `pathExists` imports leave; `placeRecord`'s step runs before anything is written, so the Context's registry write reads the stepped title through `title = finalTitle ?? finalName`; the reply carries `landedAs`.
- [ ] `mutateRequest.ts`: `MutateOutcome.landedAs?: string`, its doc naming the title a restore stepped aside to.
- [ ] `Core/Interface/Notifications/notifications.ts`: `notifyOutcome(head, segment, unmet, undo?, retry?)`, one notice for what an action did, folded from `notifyDeleted`'s composition: what didn't go as asked is appended to the last part, marks the notice failed, and offers the retry, posted through `notifyUndoable` with its segment and answering its spend; `notifyDeleted` composes its head and link count and calls it.
- [ ] `TrashFrame.tsx`: `countPhrase` in Title Case (Take Along); the batch and single-row notices post through `notifyOutcome(head, segment, unmet)`, so a clean batch reads `Restored 3 Pages` with no trailing period; `notifyReport` keeps `(message, failed)` and this file imports `notifyOutcome` instead; `many` gathers `“Title” as “Landed”` per step; the single-row path posts `Restored “Ideas” as “Ideas (2)”` when its reply carries `landedAs`, carrying the slice's unrestored line and warning.
- [ ] Drive group 2 (written in full in the AFTER): `.claude/scripts/Archive Drive/live-drive.mjs` gains `group2(cdp)`, its run line `if (GROUPS.has('2')) await group2(cdp)`, `'2'` in `ALL`, and the helpers Phase 1's file lacks, copied from the Path Links Drive (`.claude/scripts/Path Links Drive/live-drive.mjs:43-44`, `:56`, `:59-64`) and the Metadata Drive (`.claude/scripts/Metadata Drive/live-drive.mjs:235-241`, `:1333`, `:1339-1348`); `MATRIX.md` gains its table, and its pruned note on the Trash browser names group 2's Restore and Restore All. Checks: `[g2 E-2] a page restored between its neighbours`, `[g2 E-2] a Set restored to its slot`, `[g2 E-2] a Collection restored to its slot`, `[g2 E-2] a Space restored to its slot`, `[g2 E-4] an outside file in the way is stepped around`, `[g2 E-4] an excluded folder in the way is stepped around`, `[g2 A-3] the Trash browser keeps its look and lists through bundles:list`. Traps: a folded sidebar row unmounts its children, so the page check unfolds Collection A and Set Alpha through group 1's `unfold` before reading the DOM; the squatter's task-marked ID (index 10 `T`) is what keeps the tree from holding it; the group puts `excluded_folders` back as it found it, and the harness restores `~/Test` when the run ends.

**AFTER**

```Core/Bundles/placement.ts diff
@@ header @@
-// Where a recorded artifact re-enters: the placement resolved against the CURRENT tree, or the refusal that says why it cannot be placed.
+// Where a recorded artifact re-enters: the placement resolved against the CURRENT tree and stepped past what the disk holds, the order it lands in, or the refusal that says why it cannot be placed.
@@ imports @@
-import { freeName } from '../Paths/names'
+import { createDisambiguated, freeName } from '../Paths/names'
+import { pathExists } from '../Files/atomicWrite'
+import { landingRefusal } from '../Nexus/folderEntity'
@@ resolveRecord @@
-/** THE decision, against the CURRENT tree — a renamed parent resolves to its renamed path. The acting code branches on nothing: every name and title choice is made here. A live id refusal outranks every other answer — nothing may write over a living identity. */
+/** THE decision, against the CURRENT tree — a renamed parent resolves to its renamed path. Every name and title choice the tree can make is made here, and `freeOnDisk` steps it only past what the tree can't see. A live id refusal outranks every other answer — nothing may write over a living identity. */
@@ freeOnDisk @@
+/** The tree's free title stepped further past what the disk holds there that the tree can't see — an outside file, an excluded folder, the asset directory — in the item's own form, so a restore lands beside it, never over it. */
+async function freeOnDisk(
+  root: string,
+  entity: ArtifactRecord['entity'],
+  { dir, finalName, finalTitle }: Placement,
+): Promise<Result<Placement>> {
+  const parent = join(root, dir)
+  const leaf = (title: string): string => (entity === 'page' ? `${title}.md` : title)
+  const taken = async (title: string): Promise<boolean> =>
+    ((entity === 'collection' || entity === 'set') &&
+      (await landingRefusal(root, parent, title)) !== null) ||
+    (await pathExists(join(parent, leaf(title))))
+  const named = await createDisambiguated(
+    finalTitle ?? finalName,
+    async (title) =>
+      (await taken(title)) ? fail('exists', `"${title}" already exists.`) : ok(title),
+    taken,
+  )
+  if (!named.ok) return named
+  return ok({
+    dir,
+    finalName: leaf(named.value),
+    ...(finalTitle === undefined ? {} : { finalTitle: named.value }),
+  })
+}
@@ placeRecord (Task 2-4) @@
-export function placeRecord(
+export async function placeRecord(
   root: string,
   stored: ArtifactRecord,
   destination: RestoreDestination | undefined,
   baseName: string,
   tree: NexusTree,
-): Result<{ record: ArtifactRecord; placement: Placement; writeOrder?: () => Promise<unknown> }> {
+): Promise<
+  Result<{
+    record: ArtifactRecord
+    placement: Placement
+    writeOrder?: () => Promise<unknown>
+    landedAs?: string
+  }>
+> {
   const rehomed = destination ? withDestination(stored, destination, tree) : ok(stored)
   if (!rehomed.ok) return rehomed
   const record = rehomed.value
   const resolution = resolveRecord(record, baseName, tree)
   if ('refuse' in resolution) return fault(REFUSAL_TEXT[resolution.refuse])
-  const placement = resolution.place
+  const named = await freeOnDisk(root, record.entity, resolution.place)
+  if (!named.ok) return named
+  const placement = named.value
+  const title = placement.finalTitle ?? placement.finalName
+  const asked = record.entity === 'context' ? record.registry.title : titleFromPath(baseName)
+  const landedAs = title === asked ? undefined : title
   const { order } = resolution
-  if (record.entity === 'context' || !record.id || !order) return ok({ record, placement })
+  if (record.entity === 'context' || !record.id || !order)
+    return ok({ record, placement, landedAs })
   const ids = order.siblings.map((n) => n.id)
   const { anchor, where } = slotOf(record.place, ids)
   const next = spliceBeside(ids, anchor, record.id, where)
-  return ok({ record, placement, writeOrder: () => order.write(root, next) })
+  return ok({ record, placement, landedAs, writeOrder: () => order.write(root, next) })
 }
```

```Core/Trash/spend.ts diff
@@ imports @@
-import { landingRefusal } from '../Nexus/folderEntity'
 …
-import { pathExists, relocate, rmwJsonStrict } from '../Files/atomicWrite'
+import { relocate, rmwJsonStrict } from '../Files/atomicWrite'
@@ Restored @@
-type Restored = Pick<MutateOutcome, 'unrestored' | 'cascade'>
+type Restored = Pick<MutateOutcome, 'unrestored' | 'cascade' | 'landedAs'>
@@ restoreArtifact @@
-  const placed = placeRecord(root, stored, destination, basename(artifactAbs), tree)
+  const placed = await placeRecord(root, stored, destination, basename(artifactAbs), tree)
   if (!placed.ok) return placed
-  const { record, placement, writeOrder } = placed.value
+  const { record, placement, writeOrder, landedAs } = placed.value
   const { dir, finalName, finalTitle } = placement
-
   const targetAbs = join(root, dir, finalName)
-  if (record.entity === 'collection' || record.entity === 'set') {
-    const refused = await landingRefusal(root, join(root, dir), finalName)
-    if (refused) return refused
-  }
-  // The tree is the resolver's universe; a file the walk cannot see (an Unknown squatter) could still occupy the target — refuse rather than clobber what nothing adjudicated.
-  if (await pathExists(targetAbs))
-    return fail('exists', 'Something already sits at the restored location.')
 …
   return ok({
     ...restored([...unspent, ...unlinked].map((id) => roots[id].title)),
     ...(cascade ? { cascade } : {}),
+    ...(landedAs ? { landedAs } : {}),
   })
```

```Core/Nexus/mutateRequest.ts diff
@@ MutateOutcome @@
   /** The titles of what a restore brought back without all it held. */
   unrestored?: string[]
+  /** The title a restore stepped aside to, when it couldn't land under its own. */
+  landedAs?: string
   retry?: MutateRequest
```

```Core/Interface/Notifications/notifications.ts diff
@@ notifyDeleted → notifyOutcome @@
-export function notifyDeleted(
-  title: string,
+/** One notice for what an action did: its head, an optional segment, and whatever didn't go as asked, which marks it failed and offers the retry. */
+export function notifyOutcome(
+  head: string,
+  segment: string | undefined,
+  unmet: (string | false | undefined)[],
   undo?: () => void | Promise<void>,
-  { pages = [], warning }: Partial<Pick<CascadeReport, 'pages' | 'warning'>> = {},
   retry?: () => void,
 ): () => void {
-  const parts = [`Deleted “${title}”`]
-  if (pages.length) parts.push(`${pages.length} Internal ${pages.length === 1 ? 'Link' : 'Links'}`)
-  if (warning) parts[parts.length - 1] += `. ${warning}`
-  const [message, segment] = parts
+  const lines = unmet.filter(Boolean)
+  const parts = segment ? [head, segment] : [head]
+  if (lines.length) parts[parts.length - 1] += `. ${lines.join(' ')}`
+  const failed = lines.length > 0
   return notifyUndoable(
-    message,
+    parts[0],
     undo,
-    warning ? 'error' : 'normal',
-    warning ? retry : undefined,
-    segment,
+    failed ? 'error' : 'normal',
+    failed ? retry : undefined,
+    parts[1],
   )
 }
 
+export function notifyDeleted(
+  title: string,
+  undo?: () => void | Promise<void>,
+  { pages = [], warning }: Partial<Pick<CascadeReport, 'pages' | 'warning'>> = {},
+  retry?: () => void,
+): () => void {
+  const links = pages.length
+    ? `${pages.length} Internal ${pages.length === 1 ? 'Link' : 'Links'}`
+    : undefined
+  return notifyOutcome(`Deleted “${title}”`, links, [warning], undo, retry)
+}
+
```

```Core/Settings/TrashFrame.tsx diff
@@ imports @@
 import { cx } from '@pommora/uix/Utilities/cx'
+import { capitalize } from '@pommora/uix/Utilities/capitalize'
 …
-import { notifyReport, unrestoredLine } from '../Interface/Notifications/notifications'
+import { notifyOutcome, unrestoredLine } from '../Interface/Notifications/notifications'
@@ PLURALS @@
 const PLURALS: Record<BundleRow['kind'], string> = {
-  page: 'pages',
-  collection: 'collections',
-  set: 'sets',
-  space: 'spaces',
-  context: 'contexts',
-  property: 'properties',
+  page: 'Pages',
+  collection: 'Collections',
+  set: 'Sets',
+  space: 'Spaces',
+  context: 'Contexts',
+  property: 'Properties',
 }
@@ countPhrase @@
-  return rows.length === 1 ? `1 ${kind}` : `${rows.length} ${PLURALS[kind]}`
+  return rows.length === 1 ? `1 ${capitalize(kind)}` : `${rows.length} ${PLURALS[kind]}`
 }
+
+const steppedTo = (title: string, landedAs: string): string => `“${title}” as “${landedAs}”`
@@ one @@
-  const one = async (req: Extract<MutateRequest, { bundlePath: string }>): Promise<void> => {
-    if (await mutate(req)) spendBundle(req.bundlePath)
+  const one = async (
+    req: Extract<MutateRequest, { bundlePath: string }>,
+    row: BundleRow,
+  ): Promise<void> => {
+    const done = await mutate(req)
+    if (!done) return
+    spendBundle(req.bundlePath)
+    if (done.landedAs)
+      notifyOutcome(`Restored ${steppedTo(row.title, done.landedAs)}`, undefined, [
+        done.unrestored !== undefined && unrestoredLine(done.unrestored),
+        done.cascade?.warning,
+      ])
   }
@@ many @@
   ): Promise<{
     done: BundleRow[]
     refused: BundleRow[]
     unrestored: string[]
     warnings: string[]
+    renamed: string[]
   }> => {
     const done: BundleRow[] = []
     const refused: BundleRow[] = []
     const unrestored: string[] = []
     const warnings = new Set<string>()
+    const renamed: string[] = []
 …
       unrestored.push(...(res.value.unrestored ?? []))
       if (res.value.cascade?.warning) warnings.add(res.value.cascade.warning)
+      if (res.value.landedAs) renamed.push(steppedTo(row.title, res.value.landedAs))
     }
     await refresh()
-    return { done, refused, unrestored, warnings: [...warnings] }
+    return { done, refused, unrestored, warnings: [...warnings], renamed }
   }
@@ restoreBatch @@
-    const { done, refused, unrestored, warnings } = await many(addressable, 'restore')
+    const { done, refused, unrestored, warnings, renamed } = await many(addressable, 'restore')
     const homeless = targets.filter((r) => !r.homeResolves)
-    const unmet = [
-      homeless.length > 0 &&
-        `${countPhrase(homeless)} had nowhere to go — restore those one at a time to choose where.`,
-      refused.length > 0 && `${countPhrase(refused)} couldn’t be restored.`,
-      unrestored.length > 0 && unrestoredLine(unrestored),
-      ...warnings,
-    ].filter(Boolean)
-    notifyReport([`Restored ${countPhrase(done)}.`, ...unmet].join(' '), unmet.length > 0)
+    notifyOutcome(
+      `Restored ${countPhrase(done)}`,
+      renamed.length > 1 ? `${renamed.length} Renamed` : renamed[0],
+      [
+        homeless.length > 0 &&
+          `${countPhrase(homeless)} had nowhere to go — restore those one at a time to choose where.`,
+        refused.length > 0 && `${countPhrase(refused)} couldn’t be restored.`,
+        unrestored.length > 0 && unrestoredLine(unrestored),
+        ...warnings,
+      ],
+    )
   }
@@ emptyBatch @@
     const { done, refused, warnings } = await many(targets, 'emptyBundle')
-    const unmet = [
+    notifyOutcome(`Deleted ${countPhrase(done)}`, undefined, [
       refused.length > 0 && `${countPhrase(refused)} couldn’t be deleted.`,
       ...warnings,
-    ].filter(Boolean)
-    notifyReport([`Deleted ${countPhrase(done)}.`, ...unmet].join(' '), unmet.length > 0)
+    ])
   }
@@ openMenu @@
-      await one({ op: 'restore', bundlePath: row.bundlePath, destination })
+      await one({ op: 'restore', bundlePath: row.bundlePath, destination }, row)
 …
-        await one({ op: 'restore', bundlePath: row.bundlePath })
+        await one({ op: 'restore', bundlePath: row.bundlePath }, row)
 …
-        if (await askEmptyTrash(1)) await one({ op: 'emptyBundle', bundlePath: row.bundlePath })
+        if (await askEmptyTrash(1))
+          await one({ op: 'emptyBundle', bundlePath: row.bundlePath }, row)
```

```.claude/scripts/Archive Drive/live-drive.mjs diff
@@ ALL @@
-const ALL = ['1']
+const ALL = ['1', '2']
@@ The Nexus on disk, after bundleOf @@
+const ids = {}
+const A_ALPHA = `${COLLECTION}/Set Alpha`
+const page = (parent, title) => `${parent}/${title}.md`
+async function createAt(cdp, parent, title, seeds = {}) {
+  const id = mintPageId()
+  await must(`createPage ${parent}/${title}`, ask(cdp, 'mutate', { op: 'createPage', id, parentPath: parent, name: title, seeds }))
+  ids[page(parent, title)] = id
+  return page(parent, title)
+}
@@ The sidebar, after sidebarRow @@
+const ribbon = (label) => `document.querySelector('.sidebar-ribbon [aria-label="${label}"]')`
+async function sidebarTo(cdp, mode, title) {
+  if (!(await cdp.evaluate(`!!(${sidebarRow(title)})`))) await click(cdp, ribbon(mode))
+  await until(`${title} in the sidebar`, () => cdp.evaluate(`!!(${sidebarRow(title)})`))
+  await click(cdp, sidebarRow(title))
+}
+const RAIL = `[...document.querySelectorAll('.settings-rail [data-reveal-host]')]`
+async function openSettings(cdp, frame) {
+  if (!(await cdp.evaluate(`!!document.querySelector('.settings-rail')`))) await mouseClick(cdp, ribbon('Settings'))
+  await until('the Settings window', () => cdp.evaluate(`!!document.querySelector('.settings-rail')`))
+  await click(cdp, `${RAIL}.find((r) => r.textContent.trim() === ${JSON.stringify(frame)})`)
+  await sleep(800)
+}
+async function closeSettings(cdp) {
+  if (await cdp.evaluate(`!!document.querySelector('.settings-rail')`)) await mouseClick(cdp, ribbon('Settings'))
+  await sleep(600)
+}
@@ group 2 @@
+// ── Group 2 — every restore returns to its place and steps past the disk (Phase 2) ──
+
+const trashed = async (cdp, title) =>
+  ((await ask(cdp, 'bundles:list', { kind: 'trash' })).value ?? []).find((r) => r.title === title)
+const restoreRow = async (cdp, title) => {
+  const row = await trashed(cdp, title)
+  return row ? ask(cdp, 'mutate', { op: 'restore', bundlePath: row.bundlePath }) : null
+}
+const deleteAt = (cdp, path, kind) => must(`delete ${path}`, ask(cdp, 'mutate', { op: 'delete', path, kind }))
+const orderIn = (rel, key) => JSON.parse(readRel(rel))[key] ?? []
+const stateOrder = () => JSON.parse(readRel('.nexus/state.json')).order ?? {}
+const between = (order, [a, x, b]) =>
+  order.indexOf(a) >= 0 && order.indexOf(x) === order.indexOf(a) + 1 && order.indexOf(b) === order.indexOf(x) + 1
+const heldTree = async (cdp) => (await ask(cdp, 'nexus:state')).value.tree
+const collectionA = async (cdp) => (await heldTree(cdp)).collections.find((c) => c.path === 'Collection A')
+const notice = (cdp) => cdp.evaluate(`document.querySelector('[role=status], [role=alert]')?.textContent ?? ''`)
+const trashRowEl = (title) => `[...document.querySelectorAll('.trash-row')].find((r) => r.textContent.includes(${JSON.stringify(title)}))`
+
+async function createSetIn(cdp, name) {
+  const id = containerId()
+  const held = await collectionA(cdp)
+  await must(`create ${name}`, ask(cdp, 'mutate', { op: 'createContainer', id, parentPath: 'Collection A', kind: 'set', name, order: [...held.sets.map((s) => s.id), id] }))
+  return id
+}
+
+async function group2(cdp) {
+  const titles = ['AR Before', 'AR Middle', 'AR After']
+  for (const t of titles) await createAt(cdp, A_ALPHA, t)
+  const three = titles.map((t) => ids[page(A_ALPHA, t)])
+  const alpha = (await collectionA(cdp)).sets.find((s) => s.path === A_ALPHA)
+  const others = alpha.pages.map((p) => p.id).filter((id) => !three.includes(id))
+  await must('order the three', ask(cdp, 'mutate', { op: 'movePage', path: page(A_ALPHA, 'AR Middle'), newParentPath: A_ALPHA, order: [...others, ...three] }))
+  await deleteAt(cdp, page(A_ALPHA, 'AR Middle'), 'page')
+  const sidecar = `${A_ALPHA}/_pageset.json`
+  item(2, 2, 'E-2', 'a page delete drops its id from its folder’s page_order', !orderIn(sidecar, 'page_order').includes(three[1]), show(orderIn(sidecar, 'page_order')))
+  const listed = await trashed(cdp, 'AR Middle')
+  item(2, 2, 'A-3', 'bundles:list answers the Trash’s row with its stored time', typeof listed?.storedAt === 'number', show(listed))
+  await must('restore AR Middle', restoreRow(cdp, 'AR Middle'))
+  item(2, 2, 'E-2', 'a page restored lands between its old neighbours in page_order', between(orderIn(sidecar, 'page_order'), three), show(orderIn(sidecar, 'page_order')))
+  await sidebarTo(cdp, 'Collections', COLLECTION)
+  await unfold(cdp, COLLECTION, 'Set Alpha')
+  await unfold(cdp, 'Set Alpha', 'AR Middle')
+  const sidebarOrder = await cdp.evaluate(`[...document.querySelectorAll('.tree-item')].map((e) => e.textContent.trim()).filter((t) => ${JSON.stringify(titles)}.includes(t))`)
+  item(2, 2, 'E-2', 'the sidebar draws the three in that order', show(sidebarOrder) === show(titles), show(sidebarOrder))
+
+  const sets = []
+  for (const name of ['AR Set One', 'AR Set Two', 'AR Set Three']) sets.push(await createSetIn(cdp, name))
+  await deleteAt(cdp, 'Collection A/AR Set Two', 'set')
+  await must('restore AR Set Two', restoreRow(cdp, 'AR Set Two'))
+  const setOrder = orderIn('Collection A/_pagecollection.json', 'set_order')
+  item(2, 2, 'E-2', 'a Set restored lands between its old neighbours in set_order', between(setOrder, sets), show(setOrder))
+
+  const coll = containerId()
+  await must('create AR Coll', ask(cdp, 'mutate', { op: 'createContainer', id: coll, parentPath: '', kind: 'collection', name: 'AR Coll' }))
+  const held = (await heldTree(cdp)).collections.filter((c) => c.id !== coll)
+  const tops = held.map((c) => c.id)
+  const a = (await collectionA(cdp)).id
+  const next = tops[tops.indexOf(a) + 1]
+  const ring = [COLLECTION, 'AR Coll', held.find((c) => c.id === next)?.title]
+  await must('place AR Coll', ask(cdp, 'mutate', { op: 'reorderTop', order: tops.flatMap((id) => (id === a ? [id, coll] : [id])) }))
+  await deleteAt(cdp, 'AR Coll', 'collection')
+  item(2, 2, 'E-2', 'a Collection delete drops its id from state.order.collections', !(stateOrder().collections ?? []).includes(coll), show(stateOrder().collections))
+  await must('restore AR Coll', restoreRow(cdp, 'AR Coll'))
+  item(2, 2, 'E-2', 'a Collection restored lands between its old neighbours in state.order.collections', between(stateOrder().collections ?? [], [a, coll, next]), show(stateOrder().collections))
+  await until('AR Coll in the sidebar', () => drawn(cdp, 'AR Coll'))
+  const topOrder = await cdp.evaluate(`[...document.querySelectorAll('.tree-item')].map((e) => e.textContent.trim()).filter((t) => ${JSON.stringify(ring)}.includes(t))`)
+  item(2, 2, 'E-2', 'the sidebar draws the restored Collection between them', show(topOrder) === show(ring), show(topOrder))
+
+  const group = (await heldTree(cdp)).contexts.find((g) => g.spaces.length >= 2)
+  const space = containerId()
+  const [s0, s1, ...rest] = group.spaces.map((s) => s.id)
+  await must('create AR Space', ask(cdp, 'mutate', { op: 'createSpace', id: space, contextId: group.def.id, name: 'AR Space', order: [s0, space, s1, ...rest] }))
+  await deleteAt(cdp, `.nexus/contexts/${group.def.title}/AR Space`, 'space')
+  item(2, 2, 'E-2', 'a Space delete drops its id from its Context’s order', !(stateOrder().spaces?.[group.def.id] ?? []).includes(space), show(stateOrder().spaces?.[group.def.id]))
+  await must('restore AR Space', restoreRow(cdp, 'AR Space'))
+  item(2, 2, 'E-2', 'a Space restored lands between its old neighbours in its Context’s order', between(stateOrder().spaces?.[group.def.id] ?? [], [s0, space, s1]), show(stateOrder().spaces?.[group.def.id]))
+
+  await createAt(cdp, A_ALPHA, 'AR Squat')
+  await deleteAt(cdp, page(A_ALPHA, 'AR Squat'), 'page')
+  writeFileSync(abs(page(A_ALPHA, 'AR Squat')), `---\nID: ${mintPageId().replace(/^(.{10})P/, '$1T')}\n---\nsquatter`)
+  await sleep(1500)
+  await openSettings(cdp, 'Trash')
+  const { chosen } = await chooseNative(cdp, trashRowEl('AR Squat'), 'Restore')
+  const said = await settles(async () => (await notice(cdp)).includes('Restored “AR Squat” as “AR Squat (2)”'))
+  item(2, 2, 'E-4', 'a page restored onto an outside file steps aside, and the Trash names the title it took',
+    chosen && said && exists(page(A_ALPHA, 'AR Squat (2)')) && readRel(page(A_ALPHA, 'AR Squat')).endsWith('squatter'), show({ chosen, notice: await notice(cdp) }))
+  await closeSettings(cdp)
+
+  await createSetIn(cdp, 'AR Excl')
+  await deleteAt(cdp, 'Collection A/AR Excl', 'set')
+  const excluded = JSON.parse(readRel('.nexus/settings.json')).excluded_folders ?? []
+  await must('exclude its origin', ask(cdp, 'exclusions:set', [...excluded, 'Collection A/AR Excl']))
+  const settingsBefore = readRel('.nexus/settings.json')
+  const back = await restoreRow(cdp, 'AR Excl')
+  item(2, 2, 'E-4', 'a Set restored onto an excluded entry steps aside, settings.json unchanged',
+    back?.value?.landedAs === 'AR Excl (2)' && exists('Collection A/AR Excl (2)/_pageset.json') && readRel('.nexus/settings.json') === settingsBefore, show(back))
+  await must('the exclusions as they were', ask(cdp, 'exclusions:set', excluded))
+
+  for (const t of ['AR Look One', 'AR Look Two']) {
+    await createAt(cdp, A_ALPHA, t)
+    await deleteAt(cdp, page(A_ALPHA, t), 'page')
+  }
+  await openSettings(cdp, 'Trash')
+  const drawnRows = await cdp.evaluate(`[...document.querySelectorAll('.trash-row [role=checkbox]')].map((c) => c.getAttribute('aria-label').replace(/^Select /, ''))`)
+  const answered = ((await ask(cdp, 'bundles:list', { kind: 'trash' })).value ?? []).map((r) => r.title)
+  item(2, 2, 'A-3', 'the Trash browser draws the titles bundles:list answers, in its order', same(drawnRows, answered), show({ drawnRows, answered }))
+  for (const t of ['AR Look One', 'AR Look Two']) await click(cdp, `${trashRowEl(t)}.querySelector('[role=checkbox]')`)
+  const { chosen: all } = await chooseNative(cdp, trashRowEl('AR Look One'), 'Restore All')
+  const batch = await settles(async () => (await notice(cdp)).startsWith('Restored 2 Pages'))
+  item(2, 2, 'A-3', 'a Restore All of two reads Restored 2 Pages', all && batch, show(await notice(cdp)))
+  await shot(cdp, 'trash-frame')
+  await closeSettings(cdp)
+}
+
@@ the run @@
   if (GROUPS.has('1')) await group1(cdp)
+  if (GROUPS.has('2')) await group2(cdp)
```

```.claude/scripts/Archive Drive/MATRIX.md diff
@@ Group 2 @@
+#### Group 2 — The Owner and the Format
+
+| Case | Seeds | Operation | Expected | Decisions |
+| --- | --- | --- | --- | --- |
+| Page slot | `AR Before`, `AR Middle`, `AR After` in Set Alpha | `delete`, then `restore` | `page_order` drops the id at the delete and holds it between its neighbours after the restore; the sidebar draws them in that order | E-2 |
+| Set slot | `AR Set One`–`Three` in Collection A | `delete`, then `restore` | `set_order` holds `AR Set Two` between the others | E-2 |
+| Collection slot | `AR Coll` between Collection A and B | `delete`, then `restore` | `state.json` `order.collections` drops the id at the delete and holds it between them after the restore; the sidebar agrees | E-2 |
+| Space slot | `AR Space` in one Context | `delete`, then `restore` | `order.spaces[<id>]` drops the id at the delete and holds it between its neighbours after the restore | E-2 |
+| Outside file | `AR Squat` and a task-marked squatter | Trash browser › Restore | `AR Squat (2).md` lands; the squatter's bytes hold; the notice reads `Restored “AR Squat” as “AR Squat (2)”` | E-4 |
+| Excluded folder | Set `AR Excl` and the entry `Collection A/AR Excl` | `restore` | `landedAs: 'AR Excl (2)'`; the folder lands as `AR Excl (2)`; `settings.json` unchanged by the restore, the entry taken back out after | E-4 |
+| The browser | every Trash row | Settings › Trash; Restore All of two | rows match `bundles:list`; the notice reads `Restored 2 Pages`; a shot beside it | A-3 |
+
@@ Pruned @@
-- **The Trash browser's Restore:** Phase 2 renames its channel and Phase 5 rebuilds the browser, so group 1 restores through `mutate` and later groups drive the browser in its final form.
+- **The Trash browser's Restore in group 1:** group 1 restores through `mutate`; group 2 drives today's browser through Restore and Restore All, and the groups after Phase 5 drive the rebuilt one.
```

**VERIFY**

- [ ] The listed tests pass; `placement.test.ts` › "disambiguates a taken title, matching the create convention" passes unchanged.
- [ ] `git grep -n "Something already sits at the restored location" -- Core` finds nothing; `git grep -n "landingRefusal" -- Core` finds `folderEntity.ts`, `create.ts`, `move.ts`, `rename.ts`, and `placement.ts` only; `git grep -n "freeOnDisk" -- Core ':!*.test.ts'` finds `placement.ts` alone.
- [ ] Run the gates.
- [ ] `POMMORA_ARCHIVE_LANDED=2 node ".claude/scripts/Archive Drive/live-drive.mjs" 1 2` passes every group 1 and group 2 item.
- [ ] Check for unnecessary code or mistakes.

**Lines:** +65 (+120 / −55) (view-delta's Actionable column, moved lines on both sides). By file: `TrashFrame.tsx` +45 / −26, `placement.ts` +45 / −6, `notifications.ts` +24 / −11, `spend.ts` +5 / −12, `mutateRequest.ts` +1. Tests ≈ +130; the drive +138 / −2 (`.mjs` counts in view-delta's Code group) and `MATRIX.md` +13 / −1, apart.

#### Review Checkpoint

- [ ] `Core/Bundles/bundle.test.ts`, `rows.test.ts`, `placement.test.ts`, `handlers.test.ts`; `Core/Trash/spend.test.ts`, `trashRecovery.test.ts`, `deleteOrder.test.ts`; `Core/Nexus/mutate.test.ts` (the departure drops and Phase 1's carry and lift cases); `Core/Nexus/treePatch.test.ts`, `Core/Nexus/order.test.ts`, `Core/Views/creationOrder.test.ts`; `Core/Settings/TrashFrame.test.tsx`; `Core/Contract/engineGraph.test.ts` and `Desktop/hostGraph.test.ts` pass.
- [ ] `git grep -n "Trash/bundle'\|Trash/record'\|Trash/resolve'\|Trash/trashRow\|trash:list\|trashChanged\|NON_CORPUS_TOP\|deletedPathOf\|Something already sits" -- Core Desktop` finds nothing; `Core/Trash/` holds `delete.ts`, `discard.ts`, `gather.ts`, `handlers.ts`, `holdings.ts`, `restoreProperty.ts`, `restoreScrub.ts`, `spend.ts`, `trashMode.ts`, and their tests.
- [ ] Run the gates.
- [ ] Drive groups 1 and 2 pass with `POMMORA_ARCHIVE_LANDED=2`.
- [ ] Two read-only `opus-high` reviewers to `closeout-review`'s standards, its closing procedures, write-guards, and output format exempt.
- [ ] Compaction checkpoint before Phase 3: `c/pre-compaction`; on re-prompt, reread *§Constraints* and `c/plan-execution` from the files, and the handoff repeats the Approach, Principles, and Nathan's Constraints verbatim.

#### Departures and Disclosures

##### Departures From the Findings

- **`freeOnDisk(root, entity, placement): Promise<Result<Placement>>`, Inside `placeRecord` (2.4):** the Findings write `freeOnDisk(root, entity, dir, name)`; `createDisambiguated` refuses after fifty steps (`Core/Paths/names.ts:66-79`), so the answer is a `Result`, and taking and answering the placement keeps `finalName` and `finalTitle` one shape through `placeRecord`, which runs it as every restore's one landing rule, so the Context's registry write reads the stepped title with no new line. It stays module-private, so no restore lands past it, and `homeResolvesFor` reads `resolveRecord` alone, so a listing probes no disk. It probes the item's own form alone, a page's `.md` file or any other kind's folder, as E-4 and the decision log's sibling-name note read a taken name on disk: an excluded `Omega/` sits beside a page titled `Omega` untouched, and only two folders sharing a name collide, the same rule Phase 1's lift steps by. The tree's titles still block across forms, since `resolveRecord`'s container arm reads a page and a Set as one namespace. Phase 1's lift keeps `freeName` over a disk listing: `freeOnDisk` reads `folderEntity.ts`'s `landingRefusal`, so the lift reaching `freeOnDisk` would import `placement.ts` back from `folderEntity.ts`.

##### Behavior Changes and Disclosures

- **`archiveSegs` and `archivedCollectionIdOf` Land in 2-1:** `storeOf`, their first consumer, answers an archive store's id from the path, so the Archive's location has one parse from the start, and Phase 3's `outsideContent` reads both as landed. `archiveSegs` answers the segments below `.nexus/archive` itself (`[]` for the folder, null outside it), so the Archive's own folder is admitted as Findings 1.1 requires: a hand removal of it raises one `unlinkDir` at `.nexus/archive`, and `deindexPath` (`indexSeed.ts:166-173`) prunes its rows only if `relCorpusPath` admits that path. The id segment is held to `hiddenFolder` too, which a ULID always passes.
- **`originPathOf` Finds the Bundle by Its Stamp:** a chain folder (`spend.test.ts:695`, a Collection named `Archive.deleted`) and an artifact's interior folder (`:681`) can each wear the suffix, so the mint's stamp is the mark only a bundle carries. A bundle renamed by hand to drop its stamp (`trashRows.test.ts:179` lists one) reads its files' origin with the bundle folder kept, so its strip and relink find nothing: degraded, never wrong-pathed, and the listing still shows it.
- **`placeRecord` Hands Back Its Order Write:** the order composed for four kinds needs one of three writers, and `resolveRecord` already holds the parent node each lands under, so its resolution carries that parent's siblings and writer, a Space's order landing under its own Context even when another Context shares its title; `placeRecord` composes the order from them and answers `{ record, placement, writeOrder?, landedAs? }` and the restore makes one call after its relocate, on Phase 1's precedent of `carrySetAside` handing back its drop step. 2-4 lands it synchronous over the tree, and 2-5, where the step past the disk arrives, makes it async with `landedAs`, so the title test is stated once.
- **Every Departure Leaves Its Order, in Either Trash Mode:** the delete reads the id from `before`, as the move ops do (`move.ts:34`, `:60`), so a system-trash delete leaves no tombstone either, and a Collection or Space leaves `state.json`'s order, so an emptied Collection leaves no id in the synced file. A Context keeps its panel id while bundled, the precedent `spend.test.ts:215` pins, and one gone for good, deleted to the system Trash or emptied from the Trash, takes it from `order.contexts` with its Space order through `dropContextOrder`. The move ops' two inline drops fold into the same `dropDeparture` (Take Along).
- **One By-Id Lookup (Take Along):** `containerTrailById` and `findContainerById` sit in `treePatch.ts` beside the predicate pair, since five sites spelled `(n) => n.id === id` themselves; `liveCrumbs`, `placement.ts`, `createActions.ts`, and `tilesFile.ts` read them, and so do Phases 4 and 6B's by-id readers. `findSet` keeps its predicate, which matches a kind beside the id.
- **Exports Narrowed to Their Readers:** `withDestination` and `REFUSAL_TEXT` stop being exported once `placeRecord` is their one reader, and `dropFromChildOrder` once `dropDeparture` is its one caller; its `reorder.test.ts` describe leaves, both of its arms and its key drop pinned through 2-4's departure cases.
- **`bundles:list` Reads What It's Handed:** the handler narrows its `unknown` argument through `storeFrom` and refuses anything but a store with `A store is required.`, internal copy no interface reaches. An archive id is held to the one rule the path built from it needs, a single safe segment (`holdsName`), so one that would leave the Archive's root refuses and any other names the folder it lists.
- **One Notice Composer:** `notifyOutcome` composes the delete's notice and the Trash's batches' and single row's from one rule, folded from `notifyDeleted`'s (what didn't go as asked appended to the last part, marking the notice failed and offering its retry, posted through `notifyUndoable` with its segment), so `notifyDeleted` keeps only its head and link count, and `notifyReport` stays the one-line refusal it is. A clean batch now reads `Restored 3 Pages` and `Deleted 3 Pages`, without the trailing period `Restored 3 pages.` had; *§Copy*'s spelled lines carry none. A single restore with a `landedAs` re-posts the slice's unrestored line and warning inside its own notice; one without a step still posts nothing.
- **`openBundle`'s Refusals:** "Only a trash or archive record can be spent." and "That record is unreadable." replace the Trash-only wording, since either store's bundle now opens; neither is reachable from the interface. The Trash's own `emptyBundle` and `restoreArtifact` refuse an Archive bundle from 2-1, `restoreArtifact` with HEAD's reply to that path, so nothing between Phase 2 and Phase 4 runs the Trash's disposal or reconcile on one; Phase 4-2's routing sends an Archive restore to `restoreArchived`, and `restoreArtifact`'s guard leaves there.

##### Found False at HEAD

- *§What Becomes False*'s `trashRecovery.test.ts` "`TrashRow` and `deletedAt` (`:13`, `:34`)": those lines import and call `trashRows`, and neither name appears in the file.
- *§Removal & Consolidation*'s "`trashRow.ts`'s Trash Mode and `bundle.ts`'s Trash Mode half → one file, `trashMode.ts`, −1 file": the renderer's `confirmations.ts:4` value-import makes it two, the `trashMode.ts` leaf and `discard.ts`.

##### Line Total

- **+268 (+893 / −625), Measured:** the tasks' AFTER blocks come to ≈ +257 (+994 / −737): 2-1 ≈ +53, 2-2 −2, 2-3 ≈ +31, 2-4 +110, 2-5 +65, under the plan's one counting rule (`view-delta`'s Actionable column: source with imports and blank lines as Biome wraps them; comments, tests, documents, and the drive out; moved lines on both sides), ≈ 530 of them moved. The phase's one commit never shows the lines one task writes and a later task rewrites, which the blocks count in both, and its net holds the rest in Biome's wrapping and the lines the blocks elide.
- **Against the Estimate (≈ +49), Which Priced Logic Alone:** the rest is imports and Biome's wrapping, and what the decisions require that the estimate costed elsewhere or not at all: `layoutOf`'s exhaustive switch, `storeOf`, `archiveSegs` and `archivedCollectionIdOf` arriving early, the resolution's order landing four kinds through three writers, the departure drop's tree read, `dropDeparture` with the two `state.json` orders, `placeRecord` taking the disk step and `landedAs` (which the later restores' repeated title tests pay back), `bundles:list`'s narrowing of its argument (+9), and the notices' segment and single-row notice.
- **What Leaves:** `NON_CORPUS_TOP`, `trashChainDir`, `deletedPathOf`, `deletedAtOf` (one stamp parse), the private `openBundle`, `trashedPage`, `trashedPages`, `trashedPagesOf`, three exports, five inline by-id predicates (for one pair in `treePatch.ts`), `gatherParentRef`, `trash:list`, `trashChanged`'s triple, the landing and `exists` refusals, the squatter comment, two `.filter(Boolean)` joins, `notifyDeleted`'s own composition, the move ops' two inline order drops, and five files (`Trash/bundle.ts`, `record.ts`, `resolve.ts`, `trashRow.ts`, `trashRows.ts`) for seven (`Bundles/bundle.ts`, `record.ts`, `rows.ts`, `placement.ts`, `handlers.ts`, `Trash/trashMode.ts`, `discard.ts`).

### Phase 3 — Reach

**GOAL:** `.nexus/archive` becomes the one hidden folder Pommora reads as content (B-1): the corpus, the content index, and every governed, content, and configuration reach include it, and one by-id projection spans the tree and the Archive for every refill and frozen world (C-1, C-2, C-3, D-1). The tree, discovery, the confirmations' counts, and a Collection's value load stay tree-only; the Matrix and the headings leave the Archive out (C-4, D-2, K-2). Tests seed `.nexus/archive/<id>/<chain>/<stamp>__<Name>.archived/<Name>` by hand (Phase 4 adds the archive op), as drive group 3 does on `~/Test`. Builds on Phase 2's AFTER: the Archive path helpers in `Core/Paths/nexusPaths.ts`, `originPathOf` (`Core/Bundles/bundle.ts`), `resolveRecord` and `placeRecord` (`Core/Bundles/placement.ts`), the rows builder (`Core/Bundles/rows.ts`), and `bundles:list` (`Core/Bundles/handlers.ts`).

#### Task 3-1

**TASK:** Make `.nexus/archive` content (B-1): `outsideContent` admits it, the corpus walks it as a second root, and the Collection owner, the saved-view migration, and the configuration pass reach it. The tree, discovery, and the watcher are untouched.

**NOW:** `outsideContent` (`Core/Paths/exclusion.ts:76-82`) files any hidden segment, `.nexus` included, as `'hidden'` (`:79`), so the index refuses archived paths; Phase 2's `archiveSegs` (`[]` for the Archive itself, null outside it) is read only by `storeOf`. `applyEvents` indexes every event before the tree's classifier files `.nexus/…` as `ignored`, so `outsideContent` is the whole index change and the tree never sees an archived file. `corpusFiles` (`Core/Files/walk.ts:41-43`) walks the root alone; the seed, every `?? nexusCorpus` fallback, the asset migration (`assetMigrate.ts:135`), and the content reaches (`cascade.ts:221`, `contextCascade.ts:72`) read through it or the index and need no change of their own (C-1). `owningCollection` (`Core/Nexus/treePatch.ts:83-91`) matches a path's first segment, so `containerSchema` and `runRepairSweep` find no schema for an archived page. `containersOf`'s scoped callers pass `under` absolute: `moveSetOp` (`move.ts:65`) the folder the Set left, possibly a Set; `removeInner` (`removeProperty.ts:54`) the Collection folder. `neverWatched` (`exclusion.ts:26-36`) still keeps hidden folders inside an archived Set unwatched and unsynced.

**CHANGE**

- [ ] Write and watch fail:
  - `Core/Paths/exclusion.test.ts` `describe('outsideContent')`, beside "refuses hidden and package folders at any depth, and hidden names" (`:19`, unchanged): "admits the Archive, the one hidden folder read as content, while a hidden folder inside it stays hidden" — null: `.nexus/archive`, `.nexus/archive/C1`, `.nexus/archive/C1/Alpha/2026-10-20T12-00-00-000Z__Beta.archived/Beta/Notes.md`; `'hidden'`: `…/Beta/_raw/X.md`, `.nexus/settings.json`, `.nexus/contexts/Areas/Home`.
  - `Core/Files/walk.test.ts`: "yields the cascade corpus minus exclusions, as nexus-relative POSIX paths" (`:46`) adds `.nexus/archive/C1/sub/2026-10-20T12-00-00-000Z__z.md.archived/z.md` and `…/z.md.archived/_raw/h.md`; both expected lists gain only that `z.md`. "never reads inside `.trash`, `.nexus`, or an excluded folder" (`:69`) → "never reads inside `.trash`, `.nexus` outside its Archive, or an excluded folder"; spy: `['', 'sub', '.nexus/archive']`, in order. New `describe('sidecarsUnder')` › "lists every container sidecar under both content roots, or under one folder, and never inside a hidden folder": seed `Notes/_pagecollection.json`, `Notes/Deep/_pageset.json`, `Notes/_Drafts/_pageset.json`, `.nexus/archive/C1/Notes/2026-10-20T12-00-00-000Z__Old.archived/Old/_pageset.json`; `sidecarsUnder(root, scope())` → the archived one, `Notes/Deep/_pageset.json`, `Notes/_pagecollection.json` (sorted); with `join(root, '.nexus/archive')` → the archived one.
  - `Core/Index/indexSeed.test.ts` `describe('seedContentIndex')`, new: "seeds the Archive as the corpus’s second root, and a hidden folder inside an archived Set gets no rows" (archived `Old.md`, `ULID_B`, `[[Target]]`: in `readIndexedStats()` with `id: ULID_B` and in `queryMentions(['target'])`; `…/Set.archived/Set/_raw/X.md` in neither); "moves a page’s rows into the Archive and back, and a Set’s by prefix" (rename on disk, then `moveIndexPaths`: rows under `readIndexedStats('.nexus/archive')` keep `ULID_A`, none at the origin; then back); "a removal of the Archive itself prunes every row beneath it" (`deindexPath(root, abs('.nexus/archive'))` reports the page vanished; no row left under the prefix).
  - `Core/Nexus/treePatch.test.ts`: "names the Collection a path starts in, a Collection its own owner" (`:215`) → "names the Collection a path starts in or whose Archive holds it, a Collection its own owner", plus `owningCollection(t, '.nexus/archive/c2/Old Name/2026-10-20T12-00-00-000Z__X.md.archived/X.md')` → `t.collections[1]`, `.nexus/archive/c9/…` → undefined, `.nexus/archive` → undefined. New `describe('archiveReach')` › "covers every Archive unscoped, the owning Collection’s whole Archive under a folder, and none for an unowned one": unscoped → `.nexus/archive`; `'Notes/Sub'` → `.nexus/archive/c1`; `'Loose'` → null.
  - `Core/Properties/repairSweep.test.ts`: "canonicalizes a drifted archived page against its own Collection’s definitions" — archived `Two.md` under the Collection's id, `Status: Open`; after `runRepairSweep(root, await seedContentIndex(root))`, `Status:\n  - Open`.
  - `Core/Nexus/configReach.test.ts`: in `describe('an option rename')`, "reaches an archived Set’s sidecar as it reaches a live one" (`.nexus/archive/col_notes/Notes/2026-10-20T12-00-00-000Z__Old.archived/Old/_pageset.json` with `rich('view_o')` reads after `reachConfig(root, rename)` as the live `rich('view_s')` does, id aside); in `describe('a pass scoped under one Collection')`, "edits the Collection’s whole Archive and a tile sourcing an archived Set, and leaves another Collection’s Archive" (archived `set_old` under `col_notes`, chain `Old Name/`; one under `col_other`; a tile view sourcing `set_old`; after `reachConfig(root, clear, col())`, `set_old` and the tile view read `{ kind: 'structural' }`, `col_other`'s sidecar byte-identical); in `describe('what the pass skips')`, `it.skipIf(noModeBits)`: "counts an archived Set’s sidecar it can’t read as one skip" (the archived sidecar at mode `0o000`; `reachConfig(root, rename)` answers `skipped` 1).
  - `Core/Nexus/normalizeSavedViews.test.ts`: "renames the Table view's old glyph key in sidecars, trashed sidecars, and every tile document" (`:81`) → "… in sidecars, trashed and archived sidecars, and every tile document", plus a Set sidecar at `.nexus/archive/col-notes/Notes/2026-10-20T12-00-00-000Z__Old.archived/Old` with `icon: 'table'` → `'view-table'`; comment `:41`: "the walk covers the Trash, the Archive, and tile documents".
  - `Core/Assets/assetMigrate.test.ts` (modeled on `:72`): "rewrites the links in an archived Set’s sidecar and an archived page before the sweep trashes the legacy folder" — `asset('a/Cover.png', 'cover')`; archived Set sidecar `banner` `.nexus/assets/a/Cover.png`; archived page `banner` `"[[Cover.png]]"`; `rewritten` 2, `trashed` 1, sidecar banner `[[Cover.png]]`, `file-assets/Cover.png` exists.
- [ ] `Core/Paths/exclusion.ts`: `outsideContent` holds the hidden rule to `archiveSegs(segs) ?? segs`; its doc names the Archive.
- [ ] `Core/Files/walk.ts`: module-private `contentRoots(root)`; `corpusFiles` walks both; hoist `sidecarsUnder(root, scope, under?)` from `assetMigrate.ts` (container sidecars, both roots or one folder); rewrite `:31`.
- [ ] `Core/Assets/assetMigrate.ts`: delete `sidecarsUnder`; `collectRefs` walks `sidecarsUnder(root, scope)` plus `spaceSidecars(root)`, sorted; drop the `SIDECARS`, `listPathsUnder`, `outsideContent`, and `WatchScope` imports.
- [ ] `Core/Nexus/migrateConfig.ts`: `normalizeSavedViews` walks `TRASH_DIR` and `ARCHIVE_DIR_REL`; comment `:45` names the Archive.
- [ ] `Core/Nexus/treePatch.ts`: `owningCollection` gains the Archive arm (by id segment); add `archiveReach(tree, rel?)`, the scope rule `containersOf` and Task 3-2's `governedReach` share.
- [ ] `Core/Nexus/configReach.ts`: `containersOf`'s live listing moves inline into `reachConfig`, and `archivedSets(tree, root, under?)` lists the Set sidecars `sidecarsUnder` finds in `archiveReach`'s Archive under `scopeOf(tree.config)` (`Core/Settings/codec.ts:99-101`; no settings read outside `reachConfig`'s guard). `reachConfig` edits each through `written`, one read per sidecar, which counts an unreadable one among the skips as it counts a live one, and adds the id it reads to `sources`; `Container` drops its `id`.
- [ ] Sibling sweep: `sidecarsUnder`'s callers are `assetMigrate.ts` and `configReach.ts`; `corpusFiles`' callers (`nexusCorpus`, `assetMigrate.ts:135`) need no change; `indexSeed.test.ts:62` holds; `treePatch.ts`'s new imports come from the leaf `nexusPaths.ts`, so the engine graph holds.

**AFTER**

```Core/Paths/exclusion.ts diff
@@ imports @@
 import {
+  archiveSegs,
   ASSETS_DIRNAME,
   CONTEXT_JOURNAL_REL,
@@ outsideContent @@
-/** What keeps a nexus-relative path outside the content the app reads, or null: a hidden folder or name on the way, the asset root (which holds files rather than content while remaining watched), or an excluded folder. */
+/** What keeps a nexus-relative path outside the content the app reads, or null: a hidden folder or name on the way, counted below `.nexus/archive` for a path inside it (the Archive is the one hidden folder read as content), the asset root (which holds files rather than content while remaining watched), or an excluded folder. */
 export function outsideContent(rel: string, scope: WatchScope): OutsideReason | null {
   const segs = rel.split('/')
-  if (segs.some(hiddenFolder)) return 'hidden'
+  if ((archiveSegs(segs) ?? segs).some(hiddenFolder)) return 'hidden'
   if (assetMatcher(scope.assetDir)(segs)) return 'asset'
```

```Core/Files/walk.ts diff
@@ imports @@
 import { hiddenFolder, hiddenName, outsideContent, type WatchScope } from '../Paths/exclusion'
-import { isMarkdownFile, join, relative } from '../Paths/posix'
+import { ARCHIVE_DIR_REL, SIDECARS } from '../Paths/nexusPaths'
+import { basename, isMarkdownFile, join, relative } from '../Paths/posix'
 import { type DirEntry, machine } from '../Platform/machine'
@@ listMarkdownFiles @@
-// The pages under a folder the tree doesn't hold (a trash bundle's artifact), held to the same hidden-name rule as the content walk.
+// The pages under a folder the tree doesn't hold (a bundle's artifact), every name below it held to the hidden-folder rule.
 export async function listMarkdownFiles(dir: string): Promise<string[]> {
@@ corpusFiles @@
+/** The Nexus root, then its Archive: the one hidden folder read as content, which the root's own walk prunes with `.nexus`. */
+const contentRoots = (root: string): string[] => [root, join(root, ARCHIVE_DIR_REL)]
+
 export async function corpusFiles(root: string, scope: WatchScope): Promise<string[]> {
-  return corpusFilesUnder(root, root, scope)
+  const files: string[] = []
+  for (const dir of contentRoots(root)) files.push(...(await corpusFilesUnder(root, dir, scope)))
+  return files
 }
@@ after corpusFilesUnder @@
+
+export async function sidecarsUnder(
+  root: string,
+  scope: WatchScope,
+  under?: string,
+): Promise<string[]> {
+  const files: string[] = []
+  for (const dir of under === undefined ? contentRoots(root) : [under]) {
+    const rels = await listPathsUnder(root, dir, (rel, kind) =>
+      kind === 'dir' ? !outsideContent(rel, scope) : SIDECARS.has(basename(rel)),
+    )
+    files.push(...rels.map((rel) => join(root, rel)))
+  }
+  return files
+}
```

```Core/Assets/assetMigrate.ts diff
@@ imports @@
-import { ASSETS_DIR_REL, NEXUS_CONFIG_FILES, SIDECARS } from '../Paths/nexusPaths'
+import { ASSETS_DIR_REL, NEXUS_CONFIG_FILES } from '../Paths/nexusPaths'
@@
-import { corpusFiles, listEntries, listFilesRecursive, listPathsUnder } from '../Files/walk'
-import { outsideContent, reachingExcluded, type WatchScope } from '../Paths/exclusion'
+import { corpusFiles, listEntries, listFilesRecursive, sidecarsUnder } from '../Files/walk'
+import { reachingExcluded } from '../Paths/exclusion'
@@ collectRefs @@
   // Links inside excluded folders move with the rest, or the sweep would trash files they still name.
   const scope = reachingExcluded(await readWatchScope(root))
-  for (const file of await sidecarsUnder(root, scope)) {
+  const sidecars = [...(await sidecarsUnder(root, scope)), ...(await spaceSidecars(root))]
+  for (const file of sidecars.sort()) {
     const fields = await readJsonObject(file)
@@ sidecarsUnder @@
-/** The containers `scope` admits, and every Space sidecar, which the content walk never enters. */
-async function sidecarsUnder(root: string, scope: WatchScope): Promise<string[]> {
-  const containers = await listPathsUnder(root, root, (rel, kind) =>
-    kind === 'dir' ? !outsideContent(rel, scope) : SIDECARS.has(basename(rel)),
-  )
-  const spaces = await spaceSidecars(root)
-  return [...containers.map((rel) => join(root, rel)), ...spaces].sort()
-}
-
 export async function migrateAssets(root: string, deps: TrashDeps): Promise<AssetMigration | null> {
```

```Core/Nexus/migrateConfig.ts diff
@@ imports @@
 import {
+  ARCHIVE_DIR_REL,
   CONTEXTS_DIR_REL,
@@ normalizeSavedViews @@
-// Containers in scope ride the adoption pass (`stampFolder`); only the Trash and the tile documents are walked here.
+// Containers in scope ride the adoption pass (`stampFolder`); only the Trash, the Archive, and the tile documents are walked here.
 export async function normalizeSavedViews(root: string): Promise<void> {
-  for (const file of await listFilesRecursive(join(root, TRASH_DIR), [...SIDECARS]))
-    await rmwJsonStrict(file, renamedSidecar)
+  for (const dir of [TRASH_DIR, ARCHIVE_DIR_REL])
+    for (const file of await listFilesRecursive(join(root, dir), [...SIDECARS]))
+      await rmwJsonStrict(file, renamedSidecar)
   // Runs at open, before a tree exists to ask TILE_HOSTS for its boards.
```

```Core/Nexus/treePatch.ts diff
@@ imports @@
-import { CONTEXTS_DIR_REL, contextDirRel } from '../Paths/nexusPaths'
+import {
+  ARCHIVE_DIR_REL,
+  archiveDirRel,
+  archivedCollectionIdOf,
+  CONTEXTS_DIR_REL,
+  contextDirRel,
+} from '../Paths/nexusPaths'
@@ owningCollection @@
-/** A Collection owns itself; anything else is owned by the Collection its path starts in, since Collections sit only at the Nexus root. */
+/** A Collection owns itself; anything else is owned by the Collection its path starts in, since Collections sit only at the Nexus root, or by the one whose Archive holds it. */
 export function owningCollection(
   tree: NexusTree | null,
   of: string | CollectionNode | SetNode,
 ): CollectionNode | undefined {
   if (typeof of !== 'string' && of.kind === 'collection') return of
-  const top = (typeof of === 'string' ? of : of.path).split('/', 1)[0]
-  return tree?.collections.find((c) => c.path === top)
+  const path = typeof of === 'string' ? of : of.path
+  const filed = archivedCollectionIdOf(path)
+  const top = path.split('/', 1)[0]
+  return tree?.collections.find((c) => (filed === null ? c.path === top : c.id === filed))
 }
+
+/** The Archive a reach covers: every one across the whole Nexus, or all of the owning Collection's for a reach scoped under `rel`, since an archived chain spells its folders as they were named when it left. */
+export function archiveReach(tree: NexusTree, rel?: string): string | null {
+  if (rel === undefined) return ARCHIVE_DIR_REL
+  const owner = owningCollection(tree, rel)
+  return owner ? archiveDirRel(owner.id) : null
+}
```

```Core/Nexus/configReach.ts diff
@@ imports @@
 import { sidecarPath, tileDocPath } from '../Paths/paths'
-import { isAtOrUnder, join } from '../Paths/posix'
+import { SIDECAR_FILENAME } from '../Paths/nexusPaths'
+import { asString } from './coerce'
+import { basename, dirname, isAtOrUnder, join, relative } from '../Paths/posix'
+import { sidecarsUnder } from '../Files/walk'
+import { scopeOf } from '../Settings/codec'
 import { isPlainObject } from '../Contract/validators'
@@
-import { containerAt, contextAt, damagedFolders, spaceAt } from './treePatch'
+import { archiveReach, containerAt, contextAt, damagedFolders, spaceAt } from './treePatch'
@@ containersOf → archivedSets @@
-type Container = { kind: ContainerKind; id: string; dir: string }
+type Container = { kind: ContainerKind; dir: string }
 
 const reaches = (dir: string, under?: string): boolean => !under || isAtOrUnder(dir, under)
 
-function containersOf(tree: NexusTree, root: string, under?: string): Container[] {
-  return tree.collections
-    .flatMap(within)
-    .map((node) => ({ kind: node.kind, id: node.id, dir: join(root, node.path) }))
-    .filter(({ dir }) => reaches(dir, under))
+async function archivedSets(tree: NexusTree, root: string, under?: string): Promise<Container[]> {
+  const archive = archiveReach(tree, under && relative(root, under))
+  if (archive === null) return []
+  const files = await sidecarsUnder(root, scopeOf(tree.config), join(root, archive))
+  return files
+    .filter((file) => basename(file) === SIDECAR_FILENAME.set)
+    .map((file) => ({ kind: 'set', dir: dirname(file) }))
 }
@@ reachConfig @@
   const { view: edit, rule } = editsOf(e)
-  const containers = containersOf(tree, root, under)
+  const live = tree.collections
+    .flatMap(within)
+    .map((node) => ({ kind: node.kind, id: node.id, dir: join(root, node.path) }))
+    .filter(({ dir }) => reaches(dir, under))
+  const sources = new Set(live.map((c) => c.id))
   const damaged = damagedFolders(tree.unreadable)
     .map((u) => ({ kind: u.kind, dir: join(root, u.path) }))
     .filter(({ dir }) => reaches(dir, under))
-  for (const { kind, dir } of [...containers, ...damaged]) {
+  for (const { kind, dir } of [...live, ...damaged]) {
     await written(sidecarPath(dir, kind), (cur) => mapViews(cur, edit))
   }
-  const sources = new Set(containers.map((c) => c.id))
+  for (const { kind, dir } of await archivedSets(tree, root, under)) {
+    await written(sidecarPath(dir, kind), (cur) => {
+      const id = asString(cur.id)
+      if (id) sources.add(id)
+      return mapViews(cur, edit)
+    })
+  }
   const inScope = (entry: unknown): boolean => {
```

**VERIFY**

- [ ] The listed tests pass; `exclusion.test.ts:19`, `neverWatched`'s cases, and `indexSeed.test.ts` "MUST AGREE with the corpus" (`:62`) pass unchanged.
- [ ] `seedContentIndex` seeds through `corpusFiles` and so takes the second root (the first new `indexSeed.test.ts` case proves it; the root walk still prunes `.nexus`).
- [ ] `git grep -n "sidecarsUnder" -- Core` finds `walk.ts`, `walk.test.ts`, `assetMigrate.ts`, and `configReach.ts`; `git grep -n "archiveSegs\|archivedCollectionIdOf\|archiveReach" -- Core` finds Phase 2's `nexusPaths.ts` and `Core/Bundles/bundle.ts` (`storeOf`), `exclusion.ts`, `treePatch.ts`, `configReach.ts`, and their tests.
- [ ] `npm run test -- engineGraph hostGraph` passes.
- [ ] Run the gates.
- [ ] Check for unnecessary code or mistakes.

**Lines:** +46 (+77 / −31), view-delta's Actionable rule; moved: `sidecarsUnder`'s walk (4). `configReach.ts` +27 / −11, `walk.ts` +22 / −2, `treePatch.ts` +17 / −3, `assetMigrate.ts` +5 / −12, `migrateConfig.ts` +4 / −2, `exclusion.ts` +2 / −1. Comments +2 / −1, four rewritten. Tests about +185, eight files.

#### Task 3-2

**TASK:** Add `governedReach(root, candidates, only?)` to `Core/Properties/governedSweep.ts`, beside the sweep it feeds: the candidates (or, with no index, the corpus) inside every Collection folder and the Archive, or inside `only` and its own Archive, folding in `keyHolderFiles` and `corpusUnder`. Every property sweep and count reaches archived holders through it, while the rename's both-keys refusal, like every confirmation, names only pages outside the Archive (C-1, C-3, C-4).

**NOW:** `keyHolderFiles` (`Core/Properties/keyHolders.ts:12-18`) and `confirmedKeyHolders` (`:21-39`, inline at `:28`) intersect `queryKeyHolders(key) ?? nexusCorpus(root)` with the caller's folders through `corpusUnder` (`Core/Index/indexSeed.ts:78-82`): `collectionFolders(root)` (`assignment.ts:152-156`, the tree's Collections plus the `'unparsed'` damaged ones) or `removeInner`'s `[collectionFolder]`, so archived holders drop out. `collectionFolders` reads `liveTreeOf` itself and keeps its sidecar role (the snapshot, `stripAndRemove`, the replay). The rename clash (`bothKeyHolders`) refuses a rename onto a key a page already holds beside the old one, through `confirmedKeyHolders`. `deleteCascade`'s strip is Task 3-3's.

**CHANGE**

- [ ] Write and watch fail, in `Core/Properties/keyHolders.test.ts` (`describe('keyHolderFiles')`, `:62-152`, → `describe('governedReach')`; `page`'s text moves into `pageText(n, fm)`, whose ID is a ULID built from the name, and helper `archived(name, fm, collection = 'c1')` writes it at `.nexus/archive/<collection>/Notes/2026-10-20T12-00-00-000Z__<name>.md.archived/<name>.md` and indexes it with `indexWrittenPage`, since the index drops an ID that isn't a ULID):
  - "answers the queried holders intersected with the scope folders" (`:63`) → "answers the queried holders inside every Collection and the Archive": `governedReach(root, queryKeyHolders('Stage'))` → `HolderA`, `HolderB`, an archived holder; never `Loose/Note.md`.
  - "a name registered after the seed finds the pages already holding it, with no re-read" (`:71`) and the unreadable-holder case (`:95`) call `governedReach(root, queryKeyHolders(…))`.
  - "confirmedKeyHolders counts only the exact key, never a page or a Space holding another casing" (`:134`) calls `confirmedKeyHolders(root, 'Phase')`.
  - "with no index it answers the corpus intersected the same way" (`:146`): `governedReach(root, queryKeyHolders('Stage'))` under `NO_STORES`, still 30 files, no `Loose` path.
  - New: "`only` reaches one Collection folder and its own Archive" — Collection `Other` (`c2`) with a holder; an archived holder under each Archive; `dropLiveTree()`, so the tree holds `Other`; `governedReach(root, queryKeyHolders('Stage'), abs('Notes'))` → `Notes`' two holders and `c1`'s archived one.
  - New: "reaches an Archive whose Collection the tree no longer holds" — an archived holder under `.nexus/archive/c9/…` is in the whole-Nexus answer.
  - New: "a rename onto a key an archived page holds beside the old one goes through, the archived page keeping the new key’s value" — `archived('Q9A', 'Stage: s\nPhase: x\n')`; `renameProperty(root, 'prop_s', 'Phase')` ok, and the archived page reads `Phase: x` and holds no `Stage`.
  - New: "an option rename rewrites an archived holder" — `archived('Q9B', 'Stage: Draft\n')`; after `renameOption(root, 'prop_s', 'Draft', 'Sketch')` its file contains `Sketch` (a select writes a one-item list), and `Loose/Note.md` keeps `Draft`.
  - "collectionFolders lists every collection folder from the live tree" moves into `describe('governedReach')` from `Core/Properties/assignment.test.ts:48`, calling `collectionFolders(root, await liveTreeOf(root))` imported from `./governedSweep`.
- [ ] `Core/Properties/deleteProperty.test.ts` `describe('propertyHolders')`: "a property delete strips an archived holder and files its value under its id" — archived page under `notes`' id, `Priority: hi`; after `deleteProperty`, no `Priority`, and the bundle's record maps its id to `hi`. `Core/Properties/removeProperty.test.ts`: "a Remove strips its own Collection’s archived holder and caches its value, and leaves another Collection’s" (archived holders under `folder`'s id and a second Collection's).
- [ ] `Core/Properties/governedSweep.ts`: add `collectionFolders(root, tree)` (moved from `assignment.ts`, reading the tree it's handed) and `governedReach`, which reads `liveTreeOf` once for both its Archive and `collectionFolders`; the reach's reason is its doc.
- [ ] `Core/Paths/nexusPaths.ts`: add `isArchived(rel)` over `archivedCollectionIdOf`, the one predicate for a path inside an Archive, which Task 3-4's three filters read too.
- [ ] `Core/Properties/keyHolders.ts`: delete `keyHolderFiles`; `confirmedKeyHolders(root, key)` loops `governedReach(root, indexed)` and passes over an archived file, since a confirmation names only what's outside the Archive (C-4): an archived page holding both keys takes the rename, keeping the new key's value as `NEW_KEY_IS_FRESHER` writes it; its comment says so, and header `:1` names what the file holds.
- [ ] `Core/Index/indexSeed.ts`: delete `corpusUnder` (`:78-82`).
- [ ] `Core/Properties/assignment.ts`: delete `collectionFolders` (`:152-156`) and the `damagedFolders` import (`:10`), its last use.
- [ ] `Core/Properties/deleteProperty.ts`: `deletePlan(root, propertyId, key)` reads `governedReach(root, queryKeyHolders(key))`; `propertyHolders` drops `collectionFolders`, which `deleteInner` keeps (snapshot, `stripAndRemove`) as `collectionFolders(root, await liveTreeOf(root))`, both imported from `./governedSweep`; `deleteInner`'s comment drops "pre-cache dormant values may sit on any page", since its folders no longer feed the page strip.
- [ ] `Core/Properties/removeProperty.ts`: `keyedHolders(await governedReach(root, queryKeyHolders(key), collectionFolder), key)`, `governedReach` imported from `./governedSweep`.
- [ ] `Core/Properties/optionOps.ts:197` and `Core/Properties/registryProperty.ts:112`: `governedReach(root, queryKeyHolders(…))`, imported from `./governedSweep`; `bothKeyHolders` drops its `collectionFolders` call; both files drop the `collectionFolders` and `keyHolderFiles` imports.
- [ ] `Core/Properties/replaySchemaCascade.ts`: `collectionFolders(root, await liveTreeOf(root))`, imported from `./governedSweep`; `deletePlan` takes no `folders`.
- [ ] Sibling sweep: `Core/Properties/governedWorld.test.ts` drops `collectionFolders` from its import (`:6`) and its `describe('collectionFolders')` (`:86`), which pinned the tree read `collectionFolders` no longer makes; `assignment.test.ts:4` drops it; no other caller of `keyHolderFiles`, `corpusUnder`, or `deletePlan`'s fourth argument (`git grep` below).

**AFTER**

```Core/Properties/keyHolders.ts diff
@@ header @@
-// Intersected with the sweep's own scope folders: the index answers over the whole nexus, so an unintersected query would strip keys from pages the sweeps were meant to leave alone.
+// Key holders: the files holding a property's key, confirmed from disk, and the values they hold filed by ID for a strip to record.
@@ imports @@
 import { queryKeyHolders } from '../Index/contentIndex'
-import { corpusUnder, nexusCorpus } from '../Index/indexSeed'
 import { readJsonObject, readTextOrNull } from '../Files/atomicWrite'
 …
 import { spaceSidecars } from '../Contexts/spaceSidecar'
+import { governedReach } from './governedSweep'
+import { isArchived } from '../Paths/nexusPaths'
+import { relative } from '../Paths/posix'
@@ keyHolderFiles @@
-export async function keyHolderFiles(
-  root: string,
-  key: string,
-  folders: string[],
-): Promise<string[]> {
-  return corpusUnder(root, queryKeyHolders(key) ?? (await nexusCorpus(root)), folders)
-}
-
@@ confirmedKeyHolders @@
-// Both loops answer from disk: the index holds a page as its last settled event read it, which an outside edit not yet settled can have changed, and the Spaces come from the folder enumeration the sweeps write through, which also finds those under a Context folder a rename cut short has moved ahead of the registry.
-export async function confirmedKeyHolders(
-  root: string,
-  key: string,
-  folders: string[],
-): Promise<string[]> {
+// A confirmation names only what's outside the Archive. Both loops answer from disk: the index holds a page as its last settled event read it, which an outside edit not yet settled can have changed, and the Spaces come from the folder enumeration the sweeps write through, which also finds those under a Context folder a rename cut short has moved ahead of the registry.
+export async function confirmedKeyHolders(root: string, key: string): Promise<string[]> {
   const holders: string[] = []
   const indexed = queryKeyHolders(key)
-  for (const file of corpusUnder(root, indexed ?? (await nexusCorpus(root)), folders)) {
+  for (const file of await governedReach(root, indexed)) {
+    if (isArchived(relative(root, file))) continue
     const content = await readTextOrNull(file)
     // An unreadable file holds the key when the index last read it holding it.
     if (content === null ? indexed !== null : Object.hasOwn(splitFrontmatter(content), key))
```

```Core/Properties/governedSweep.ts diff
@@ imports @@
-import { isMarkdownFile, join } from '../Paths/posix'
+import { nexusCorpus } from '../Index/indexSeed'
+import { liveTreeOf } from '../Nexus/liveTree'
+import { archiveReach, damagedFolders } from '../Nexus/treePatch'
+import type { NexusTree } from '../Nexus/tree'
+import { isMarkdownFile, join, relative } from '../Paths/posix'
@@ collectionFolders and governedReach, after SweepPlan @@
 export type SweepPlan = ({ raw: Rewrite } | { text: RewriteText }) & { sidecars?: Rewrite }
 
+export const collectionFolders = (root: string, tree: NexusTree): string[] =>
+  [
+    ...tree.collections,
+    ...damagedFolders(tree.unreadable).filter((u) => u.kind === 'collection'),
+  ].map((c) => join(root, c.path))
+
+/** A property key means something only where a schema governs it, so a property sweep opens its candidates inside a Collection or an Archive, never a loose file the index or the corpus also names. */
+export async function governedReach(
+  root: string,
+  candidates: string[] | null,
+  only?: string,
+): Promise<string[]> {
+  const tree = await liveTreeOf(root)
+  const archive = archiveReach(tree, only && relative(root, only))
+  const folders = [
+    ...(only === undefined ? collectionFolders(root, tree) : [only]),
+    ...(archive === null ? [] : [join(root, archive)]),
+  ]
+  return (candidates ?? (await nexusCorpus(root)))
+    .map((rel) => join(root, rel))
+    .filter((abs) => folders.some((folder) => abs.startsWith(`${folder}/`)))
+}
+
```

```Core/Paths/nexusPaths.ts diff
@@ isArchived, after archivedCollectionIdOf @@
 export const archivedCollectionIdOf = (rel: string): string | null =>
   archiveSegs(rel.split('/'))?.[0] ?? null
 
+export const isArchived = (rel: string): boolean => archivedCollectionIdOf(rel) !== null
+
```

```Core/Index/indexSeed.ts diff
@@ corpusUnder @@
-export function corpusUnder(root: string, rels: string[], folders: string[]): string[] {
-  return rels
-    .map((rel) => join(root, rel))
-    .filter((abs) => folders.some((folder) => abs.startsWith(`${folder}/`)))
-}
-
 export async function folderCorpus(root: string, absFolder: string): Promise<string[]> {
```

```Core/Properties/assignment.ts diff
@@ imports @@
-import { damagedFolders } from '../Nexus/treePatch'
@@ collectionFolders @@
-export async function collectionFolders(root: string): Promise<string[]> {
-  const tree = await liveTreeOf(root)
-  const damaged = damagedFolders(tree.unreadable).filter((u) => u.kind === 'collection')
-  return [...tree.collections, ...damaged].map((c) => join(root, c.path))
-}
-
 export function reorderAssignment(
```

```Core/Properties/deleteProperty.ts diff
@@ imports @@
-import { assignedIds, collectionFolders } from './assignment'
+import { assignedIds } from './assignment'
@@
-import { type KeyedHolders, keyedHolders, keyHolderFiles } from './keyHolders'
+import { type KeyedHolders, keyedHolders } from './keyHolders'
+import { queryKeyHolders } from '../Index/contentIndex'
+import { liveTreeOf } from '../Nexus/liveTree'
@@
-import { type Rewrite, sweepCount, sweepGovernedRoots, type SweepPlan } from './governedSweep'
+import {
+  collectionFolders,
+  governedReach,
+  type Rewrite,
+  sweepCount,
+  sweepGovernedRoots,
+  type SweepPlan,
+} from './governedSweep'
@@ propertyHolders @@
-  const { held, plan } = await deletePlan(root, propertyId, def.key, await collectionFolders(root))
+  const { held, plan } = await deletePlan(root, propertyId, def.key)
   return ok(await sweepCount(root, held.strip, plan))
@@ deleteInner @@
-  // EVERY collection folder, not just current assigners — a Remove-cache block lives on a collection sidecar that no longer assigns the id, and pre-cache dormant values may sit on any page.
-  const folders = await collectionFolders(root)
-  const planned = await deletePlan(root, propertyId, key, folders)
+  // EVERY collection folder, not just current assigners — a Remove-cache block lives on a collection sidecar that no longer assigns the id.
+  const folders = collectionFolders(root, await liveTreeOf(root))
+  const planned = await deletePlan(root, propertyId, key)
   const bundle = await snapshot(root, propertyId, def, folders, planned.held)
@@ deletePlan @@
 export async function deletePlan(
   root: string,
   propertyId: string,
   key: string,
-  folders: string[],
 ): Promise<DeletePlan> {
-  const held = await keyedHolders(await keyHolderFiles(root, key, folders), key)
+  const held = await keyedHolders(await governedReach(root, queryKeyHolders(key)), key)
   const raw: Rewrite = (r) => stripKeys(r, [key])
```

```Core/Properties/removeProperty.ts diff
@@ imports @@
-import { keyedHolders, keyHolderFiles } from './keyHolders'
+import { keyedHolders } from './keyHolders'
+import { queryKeyHolders } from '../Index/contentIndex'
@@
-import { sweepGovernedRoots } from './governedSweep'
+import { governedReach, sweepGovernedRoots } from './governedSweep'
@@ removeInner @@
   const { values, strip } = await keyedHolders(
-    await keyHolderFiles(root, key, [collectionFolder]),
+    await governedReach(root, queryKeyHolders(key), collectionFolder),
     key,
   )
```

```Core/Properties/optionOps.ts diff
@@ imports @@
-import { collectionFolders } from './assignment'
-import { keyHolderFiles } from './keyHolders'
-import { sweepCount, sweepGovernedRoots, type SweepPlan, unsweptLine } from './governedSweep'
+import { queryKeyHolders } from '../Index/contentIndex'
+import {
+  governedReach,
+  sweepCount,
+  sweepGovernedRoots,
+  type SweepPlan,
+  unsweptLine,
+} from './governedSweep'
@@ valueEditPlan @@
-  const files = await keyHolderFiles(root, def.key, await collectionFolders(root))
+  const files = await governedReach(root, queryKeyHolders(def.key))
   const raw = valueEditRewrite(def, keys)
```

```Core/Properties/registryProperty.ts diff
@@ imports @@
-import { collectionFolders } from './assignment'
-import { confirmedKeyHolders, keyHolderFiles } from './keyHolders'
-import { sweepCount, sweepGovernedRoots, type SweepPlan } from './governedSweep'
+import { confirmedKeyHolders } from './keyHolders'
+import { queryKeyHolders } from '../Index/contentIndex'
+import { governedReach, sweepCount, sweepGovernedRoots, type SweepPlan } from './governedSweep'
@@ renamePlan @@
   // Queried by the OLD key: a page holding only the new one needs no rewrite, and one holding both holds the old one too.
-  const files = await keyHolderFiles(root, from, await collectionFolders(root))
+  const files = await governedReach(root, queryKeyHolders(from))
@@ bothKeyHolders @@
 async function bothKeyHolders(root: string, from: string, to: string): Promise<string[]> {
-  const folders = await collectionFolders(root)
-  const fromHolders = await confirmedKeyHolders(root, from, folders)
+  const fromHolders = await confirmedKeyHolders(root, from)
   if (fromHolders.length === 0) return []
-  const toHolders = new Set(await confirmedKeyHolders(root, to, folders))
+  const toHolders = new Set(await confirmedKeyHolders(root, to))
   return fromHolders.filter((f) => toHolders.has(f))
```

```Core/Properties/replaySchemaCascade.ts diff
@@ imports @@
-import { collectionFolders } from './assignment'
+import { collectionFolders } from './governedSweep'
+import { liveTreeOf } from '../Nexus/liveTree'
@@ the delete arm @@
-      const folders = await collectionFolders(root)
+      const folders = collectionFolders(root, await liveTreeOf(root))
       const { skipped, hosts, removed } = await stripAndRemove(
         root,
         journal.id,
         folders,
-        await deletePlan(root, journal.id, journal.key, folders),
+        await deletePlan(root, journal.id, journal.key),
       )
```

**VERIFY**

- [ ] The listed tests pass; `keyHolders.test.ts`' "a property rename reaches the holders of a Collection whose sidecar doesn't parse" and "a corpus-wide governed sweep cannot reach an excluded folder" pass unchanged.
- [ ] `git grep -n "keyHolderFiles\|corpusUnder" -- Core` finds nothing.
- [ ] `git grep -n "collectionFolders" -- Core` finds `governedSweep.ts`, `deleteProperty.ts` (`deleteInner`), `replaySchemaCascade.ts`, and `keyHolders.test.ts`; `git grep -n "isArchived" -- Core` finds `nexusPaths.ts` and `keyHolders.ts`.
- [ ] Run the gates.
- [ ] Check for unnecessary code or mistakes.

**Lines:** +20 (+74 / −54), view-delta's Actionable rule; moved: `collectionFolders` (5). `governedSweep.ts` +27 / −1, `deleteProperty.ts` +16 / −8, `keyHolders.ts` +6 / −15, `optionOps.ts` +9 / −4, `assignment.ts` −7, `indexSeed.ts` −6, `registryProperty.ts` +6 / −7, `removeProperty.ts` +4 / −3, `replaySchemaCascade.ts` +4 / −3, `nexusPaths.ts` +2. Comments +1, three rewritten. Tests about +95, one moved, one removed.

#### Task 3-3

**TASK:** Replace `recordById` and every tree-only frozen world with one projection, `nexusPages(root, tree) → { byId, archived }`, whose one twin rule nulls an id two files claim, read through one predicate, `addressable`, so no strip files a value under it and no refill writes it, and a restore names the value it couldn't put back; a Link value naming an archived page then holds at every frozen world. Move the delete's Link strip onto `governedReach`, holding out a linker with no ID or a twin (C-2, C-3, D-1).

**NOW:**
- `recordById` (`Core/Nexus/record.ts:48-56`) answers the first record per id; the reassign refill's member filter is `path.startsWith(under)` (`assignment.ts:81-86`), and `placeRecord` (async since 2-5) calls `resolveRecord` once per restore, `homeResolvesFor` once per row.
- `frozenWorld` (`Core/Properties/propertyValue.ts:187-197`) is always handed the tree's index, including at `spend.ts:290`, whose `after` (`:230`) is `settledIndex`, so a Link value naming an archived page reads as gone and is dropped.
- Twin rules: `recordById` first in tree order; `writablePathsOf` none (`heldPages.ts:8-13`, pinned by `heldPages.test.ts:54`), over pages alone; `keyedHolders` first claimant in path order (`keyHolders.ts:61-66`); `deleteCascade` none, withheld files exempt (`cascade.ts:107-121`, pinned by `deleteReach.test.ts:125`). `sweepRootsById`'s Space arm (`governedSweep.ts:158-166`) writes every sidecar `values` names, twins included. The restores name what didn't take its value back by `roots[id].title` (`spend.ts`'s answer, `restoreProperty.ts`'s `unrestored`).
- `deleteCascade` (`cascade.ts:73-146`) strips tree-held files plus those under a withheld folder (`:101-106`): an ID-less linker inside a Collection is never reached (`cascade.test.ts:714`, `deleteReach.test.ts:113`), one under a withheld folder is stripped unrecorded (`:127-128`), and the twin branch (`:110-115`) needs `id !== undefined`. With no held tree it returns at `:86` (`defs` come from its registry), so the `:81` comment is false.
- `readIndexedStats(under)` (`Core/Index/contentIndex.ts:92-94`) answers `Map<path, { mtimeMs, size, id? }>` before the seed too, and null only with no store.

**CHANGE**

- [ ] Write and watch fail:
  - `Core/Nexus/heldPages.test.ts`: fixture Collections and Set gain ids `cN`, `cI`, `sD`, and the tree a `config` (`archiveIds` reads `scopeOf(tree.config)`); the `./liveTree` mock (`:7-9`) spreads `await importOriginal()` under `heldTreeOf` (`nexusPages` pulls in `Settings/settings`, `Files/walk`, `Bundles/bundle`). New `describe('nexusPages — the tree and the Archive by id')`, temp root, memory stores, archived `.nexus/archive/cN/Notes/2026-10-20T12-00-00-000Z__Old.md.archived/Old.md` (id `PO`, a ULID) via `indexWrittenPage`: "holds every entity the tree holds and every archived page, the archived one at the path a writer opens" (`byId.get(PO)` = `{ id: PO, kind: 'page', title: 'Old', path: <the archive path> }`, `byId.get('cN')` and `byId.get('sD')` the containers' records); "answers each archived page at the path it left, where a path key naming its chain resolves" (`archived` = `[{ id: PO, title: 'Old', path: 'Notes/Old.md' }]`; `buildPageIndex([...pagesOf(t), ...archived]).resolve('Notes/Old').page?.id` = `PO`); "marks an id two files claim null, within the tree, within the Archive, or across them" (a copy of `pA` in the tree, a second archived `PO`, and `TWIN` both archived and in the tree; `pD` unaffected); "reads the Archive off disk where no index store opened" (`NO_STORES`: same `byId`, `archived`). "an id two files claim answers no path to a writer" (`:54`) stays.
  - `Core/Properties/keyHolders.test.ts` `describe('keyedHolders')`: "files no value for a page holding another casing of the key" (`:155`) passes `new Map()`; new "keeps both claimants of an id the map marks null out of the strip" (`keyedHolders([a, copy], 'Stage', new Map([[id, null]]))` → `{ values: {}, strip: [], partial: true }`) and "files and strips an archived holder by its id" (`nexusPages`' `byId`).
  - `Core/Properties/removeProperty.test.ts`: "a copy sharing an id keeps its own value, and re-assigning fills the one Remove stripped" (`:143`) → "a page and its copy sharing one id both keep their values through Remove, so re-assigning has nothing to fill": both keep `['active']` and `['done']` through `removeProperty` and `assignProperty`; no cache block.
  - `Core/Properties/deleteProperty.test.ts`: "counts what the delete strips, writing nothing" (`:174`) → "counts what the delete strips, holding out an ID-less page and both claimants of one id, and writes nothing", expecting `ok(2)` (the two Space sidecars), not 3.
  - `Core/Nexus/cascade.test.ts` `describe('deleteCascade')`: new "strips an archived linker’s Link value naming the page and records it under its id" and "still strips a linker inside a Collection whose sidecar doesn’t parse"; "an ID-less linker isn’t held, isn’t stamped by the sweep, and keeps its bytes" (`:714`) → "an ID-less linker keeps its bytes and its value, counted among the links left in place", plus `expect(r.cascade.warning).toBe(unsweptLine(1, 'links in '))`; "a linker whose frontmatter can’t round-trip is listed unparsed, never swept, and left as it is" (`:785`) → "… listed unparsed, refused by the sweep, and left as it is", asserting the sweep's `refused` is `[broken]`, since `governedReach` hands an unparsed page inside a Collection to the sweep, which refuses it. Unchanged: "never reaches a loose file outside every Collection" (`:586`), "reaches its linkers through the corpus when there is no index" (`:619`, 4 files), `Core/Trash/deleteReach.test.ts:113` and `:125`.
  - `Core/Properties/assignment.test.ts` `describe('a re-assign puts a cached value back')`: new "refills an archived member of the Collection where the Archive holds it" and "keeps a cached Link value naming an archived page" (D-1).
  - `Core/Trash/restoreProperty.test.ts`: new "a value comes back on an archived page, written where the Archive holds it" and "a Link value naming an archived page comes back" (D-1), and "a value whose page shares its id with a copy goes back to neither, and is named" (`unrestored: ['A copy']`, neither file holding `Priority`); "a Link value naming a page gone since comes back nowhere" (`:344`) stays.
  - `Core/Bundles/placement.test.ts` (Phase 2-3's move of `spend.test.ts:734-916`): its `resolveRecord` cases and Phase 2-4's `describe('placeRecord')` gain `byIdOf = async (tree) => (await nexusPages(root, tree)).byId` over Phase 2-5's temp root, hoisted from `describe('placeRecord')` to the file's scope, with no store installed, so it scans that root's Archive, and `treeOf` gains a `config`; `resolveRecord` cases turn async and pass `await byIdOf(tree)`. New "an id the Archive holds refuses as live" (`PAGE_A` at `.nexus/archive/c1/Notes/2026-10-20T12-00-00-000Z__A.md.archived/A.md`). `Core/Trash/spend.test.ts`, new: "a restore keeps the returning page’s Link value naming an archived page" (HEAD drops it at `restoreScrub.ts:154`), "a restore puts a stripped Link value back into the archived page that held it", "a restore leaves a stripped Link value out of both pages claiming its holder’s id, and names it" (`unrestored: ['Gamma']`), and "a tag neither of two pages claiming one id takes back is named, and the record stays".
  - `Core/Bundles/rows.test.ts` (Phase 2's move of `trashRows.test.ts`): `rows()` passes `(await nexusPages(root, tree)).byId`; direct `bundleRowOf` calls (HEAD `:157`, `:194`, Phase 2-3's archive-store row) pass `new Map()`; `Core/Trash/trashRecovery.test.ts:34`'s `rows` likewise.
- [ ] `Core/Nexus/heldPages.ts`: `entitiesById`, memoized on the tree, holds every entity under the one twin rule (`claim`), and `writablePathsOf` reads it, so the rule spans kinds; add `NexusPages`, `nexusPages(root, tree)`, which copies `entitiesById` and claims the Archive's pages into it, `addressable(byId, id)`, the one twin predicate (an ID present and not null), and `shownTitle(tree, byId, id)`, the title the window shows (the first-listed page's for a twin). The Archive's half reads `readIndexedStats(ARCHIVE_DIR_REL)` or, with no store, its files under `scopeOf(tree.config)`, with origin paths from `originPathOf`; rewrite header `:1`.
- [ ] `Core/Nexus/record.ts`: delete `recordById` (`:48-56`).
- [ ] `Core/Bundles/placement.ts`: `resolveRecord(record, baseName, tree, byId)` reads `byId` for `id-live` and `cannot-hold`; `placeRecord` takes `byId` after `tree` and passes it on.
- [ ] `Core/Bundles/rows.ts`: `homeResolvesFor`, `bundleRowOf`, and `bundleRows` take `byId` after `tree` (`bundleRowOf` already binds `live` to its crumbs); `Core/Bundles/handlers.ts`' `bundles:list` computes the projection once per listing.
- [ ] `Core/Trash/spend.ts`: compute the projection once beside the restore's tree, for `placeRecord`, the returning world, the refill roots, and the Link refill's world (the settled tree's pages plus the Archive's, captured where `after` is). A stripped Link value whose holder is a twin is neither parked nor refilled and counts as unlinked, `reapply` counts a twin's tag as untaken, and the answer names both through `shownTitle`, so the record stays.
- [ ] `Core/Trash/restoreProperty.ts`, `Core/Properties/assignment.ts`: refill roots from `byId`, frozen world `buildPageIndex([...pagesOf(tree), ...archived])`; the reassign's member filter reads `owningCollection(tree, r.path)` (Task 3-1's arm). The property restore keeps a twin's value among those it refills, which `refillValues` leaves alone, so `unrestored` names it through `shownTitle` and the record stays.
- [ ] `Core/Properties/governedSweep.ts`: `sweepRootsById` takes `NexusPages['byId']` and leaves an id `addressable` refuses alone in both arms; its doc (`:150`) names the projection.
- [ ] `Core/Properties/keyHolders.ts`: `keyedHolders(files, key, byId)` drops `seen` and keeps out a holder `addressable` refuses; its doc (`:47`) states the rule. `deletePlan` and `removeInner` pass the projection's `byId`.
- [ ] `Core/Nexus/cascade.ts`: `deleteCascade`'s files are `governedReach(root, queryMentions([...gone]))` outside the delete; it holds out, and counts with the skips, a linker `addressable` refuses; drop the `withheldIn`, `liveIdIndex`, and `livePathOf` imports; one `if (!tree) return NO_STRIP` heads the delete, so `spaceArm` and every read below take a held tree; rewrite doc `:72` and comment `:81`; `:101` goes with its filter. Behavior: a root folder withheld for a reason other than `'unparsed'` stops being stripped, like every property sweep; an archived linker is stripped and recorded under its id, so the Trash restore refills it.
- [ ] Stays tree-only: the delete's `after` (`cascade.ts:82`), discovery (`pageIndexOf(tree)`), the respell's `live` (`spend.ts:245`), `settledIndex`, and `livePathOf`, `liveIdIndex`, `liveIdOf`, and `idHeld` (`heldPages.ts:16-33`), which widened would pair an archive move as an ordinary move. Archived Set ids stay out of `byId` (no sidecar rows): a record whose parent Set is archived reads `parent-gone`, Phase 4's to route and carry. `dropPageMetadata`, sparing tree-held ids only, takes no guard.
- [ ] Sibling sweep: every reader spells the type `NexusPages['byId']` (`placement.ts`, `rows.ts`, `governedSweep.ts`, `assignment.ts`, `spend.ts`, `keyHolders.ts`); `refillValues`' callers (`assignment.ts:96`, `restoreProperty.ts:70`, `spend.ts:298`) pass maps; `keyHolders.test.ts` reads `nexusPages` for its archived holder; `Core/Nexus/treeIndex.test.ts` drops `recordById` from its import (`:14`) and its two assertions in `describe('the record walk')` (`:26`, `:31`); no other reader.

**AFTER**

```Core/Nexus/heldPages.ts diff
@@ header @@
-// The held tree's pages by path and by id, for the host's writers.
+// The held tree's pages by path and by id, for the host's writers, and the one projection that adds the Archive's pages to the tree's entities, for every refill and every frozen world.
@@ imports @@
 import { heldTreeOf } from './liveTree'
-import { relative } from '../Paths/posix'
-import { pagesByPathOf, pagesOf } from './record'
-import { entityMemo } from './tree'
+import { join, relative, titleFromPath } from '../Paths/posix'
+import { type EntityRecord, pagesByIdOf, pagesByPathOf, pagesOf, recordsOf } from './record'
+import { entityMemo, type NexusTree } from './tree'
+import { readIndexedStats } from '../Index/contentIndex'
+import { ARCHIVE_DIR_REL, archivedCollectionIdOf } from '../Paths/nexusPaths'
+import { corpusFilesUnder } from '../Files/walk'
+import { stampedIdOf } from '../Files/pageFile'
+import { scopeOf } from '../Settings/codec'
+import { originPathOf } from '../Bundles/bundle'
+import { type ConnPage, connPage } from '../Connections/pageIndex'
+
+type ById = Map<string, EntityRecord | null>
+
+const claim = (byId: ById, r: EntityRecord): void => {
+  byId.set(r.id, byId.has(r.id) ? null : r)
+}
@@ writablePathsOf → entitiesById, and writablePathsOf over it @@
 /** Null marks an id two files claim: the window shows the first listed (`record.ts`'s `pagesByIdOf`); a file writer refuses it. */
-const writablePathsOf = entityMemo([], (tree): ReadonlyMap<string, string | null> => {
-  const byId = new Map<string, string | null>()
-  for (const p of pagesOf(tree)) byId.set(p.id, byId.has(p.id) ? null : p.path)
+const entitiesById = entityMemo([recordsOf], (tree): ReadonlyMap<string, EntityRecord | null> => {
+  const byId: ById = new Map()
+  for (const r of recordsOf(tree)) claim(byId, r)
   return byId
 })
 
+const writablePathsOf = entityMemo([recordsOf], (tree): ReadonlyMap<string, string | null> => {
+  const byId = entitiesById(tree)
+  return new Map(pagesOf(tree).map((p) => [p.id, byId.get(p.id)?.path ?? null]))
+})
+
@@ after idHeld @@
 }
+
+/** `byId` holds every entity the tree holds and every page the Archive holds, an archived one at the path a writer opens, and null where two files claim one id, so neither is addressed by it; `archived` holds the Archive's pages at the paths they left, where a link written before they left still names them. */
+export interface NexusPages {
+  byId: ReadonlyMap<string, EntityRecord | null>
+  archived: readonly ConnPage[]
+}
+
+/** Whether `byId` addresses the one file carrying `id`: not where the file carries no ID, nor where two files claim it, so no strip files a value under it and no refill writes it. */
+export const addressable = (byId: NexusPages['byId'], id: string | undefined): id is string =>
+  id !== undefined && byId.get(id) !== null
+
+/** The title the window shows for `id`: its one holder's, or the first-listed page's where two files claim it. */
+export const shownTitle = (
+  tree: NexusTree,
+  byId: NexusPages['byId'],
+  id: string,
+): string | undefined => byId.get(id)?.title ?? pagesByIdOf(tree).get(id)?.title
+
+export async function nexusPages(root: string, tree: NexusTree): Promise<NexusPages> {
+  const rows = readIndexedStats(ARCHIVE_DIR_REL) ?? (await archiveIds(root, tree))
+  const byId: ById = new Map(entitiesById(tree))
+  const archived: ConnPage[] = []
+  for (const [path, { id }] of rows) {
+    const owner = archivedCollectionIdOf(path)
+    if (!id || owner === null) continue
+    claim(byId, { id, kind: 'page', title: titleFromPath(path), path })
+    const left = originPathOf(root, { kind: 'archive', id: owner }, join(root, path))
+    archived.push(connPage(id, left))
+  }
+  return { byId, archived }
+}
+
+async function archiveIds(root: string, tree: NexusTree): Promise<Map<string, { id?: string }>> {
+  const rels = await corpusFilesUnder(root, join(root, ARCHIVE_DIR_REL), scopeOf(tree.config))
+  const ids = await Promise.all(rels.map((rel) => stampedIdOf(join(root, rel))))
+  return new Map(rels.map((rel, i) => [rel, { id: ids[i] ?? undefined }]))
+}
```

```Core/Nexus/record.ts diff
@@ recordById @@
-/** The first record listed under each id. */
-export const recordById = entityMemo(
-  [recordsOf],
-  (tree): Readonly<Record<string, EntityRecord>> => {
-    const byId: Record<string, EntityRecord> = {}
-    for (const r of recordsOf(tree)) byId[r.id] ??= r
-    return byId
-  },
-)
-
 export const pagesOf = entityMemo([], (tree): readonly ConnPage[] =>
```

```Core/Bundles/placement.ts diff
@@ imports @@
-import { recordById } from '../Nexus/record'
+import type { NexusPages } from '../Nexus/heldPages'
@@ resolveRecord's doc, its last sentence @@
-… A live id refusal outranks every other answer — nothing may write over a living identity. */
+… A live id refusal, an id the tree or the Archive holds, outranks every other answer: nothing may write over a living identity. */
 export function resolveRecord(
   record: ArtifactRecord,
   baseName: string,
   tree: NexusTree,
+  byId: NexusPages['byId'],
 ): Resolution {
-  const live = recordById(tree)
   const recordId = record.entity === 'context' ? record.registry.id : record.id
-  if (recordId && live[recordId]) return { refuse: 'id-live' }
+  if (recordId && byId.has(recordId)) return { refuse: 'id-live' }
@@ the container arm @@
       if (!parent)
-        return live[record.parent.id] ? { refuse: 'cannot-hold' } : { refuse: 'parent-gone' }
+        return byId.has(record.parent.id) ? { refuse: 'cannot-hold' } : { refuse: 'parent-gone' }
@@ placeRecord (Phase 2-5) @@
 export async function placeRecord(
   root: string,
   stored: ArtifactRecord,
   destination: RestoreDestination | undefined,
   baseName: string,
   tree: NexusTree,
+  byId: NexusPages['byId'],
 ): Promise<
 …
-  const resolution = resolveRecord(record, baseName, tree)
+  const resolution = resolveRecord(record, baseName, tree, byId)
```

```Core/Bundles/rows.ts diff
@@ imports @@
+import type { NexusPages } from '../Nexus/heldPages'
@@ homeResolvesFor @@
-function homeResolvesFor(record: ArtifactRecord, artifactName: string, tree: NexusTree): boolean {
-  const resolution = resolveRecord(record, artifactName, tree)
+function homeResolvesFor(
+  record: ArtifactRecord,
+  artifactName: string,
+  tree: NexusTree,
+  byId: NexusPages['byId'],
+): boolean {
+  const resolution = resolveRecord(record, artifactName, tree, byId)
   return !('refuse' in resolution) || resolution.refuse === 'id-live'
 }
@@ bundleRowOf @@
 export function bundleRowOf(
   bundle: ListedBundle,
   store: BundleStore,
   tree: NexusTree,
+  byId: NexusPages['byId'],
 ): BundleRow | null {
@@
-    homeResolves: homeResolvesFor(record, artifactName, tree),
+    homeResolves: homeResolvesFor(record, artifactName, tree, byId),
@@ bundleRows @@
 export function bundleRows(
   bundles: ListedBundle[],
   store: BundleStore,
   tree: NexusTree,
+  byId: NexusPages['byId'],
 ): BundleRow[] {
   return bundles
-    .map((b) => bundleRowOf(b, store, tree))
+    .map((b) => bundleRowOf(b, store, tree, byId))
```

```Core/Bundles/handlers.ts diff
@@ imports @@
+import { nexusPages } from '../Nexus/heldPages'
@@ 'bundles:list', its listing line as Phase 2 wrote it @@
-    return ok(bundleRows(await listBundles(root, store), store, await liveTreeOf(root)))
+    const tree = await liveTreeOf(root)
+    const { byId } = await nexusPages(root, tree)
+    return ok(bundleRows(await listBundles(root, store), store, tree, byId))
```

```Core/Trash/spend.ts diff
@@ imports @@
-import { liveTreeOf } from '../Nexus/liveTree'
+import { heldTreeOf, liveTreeOf } from '../Nexus/liveTree'
@@
-import { type EntityRecord, pageIndexOf, pagesOf, recordById } from '../Nexus/record'
+import { pageIndexOf, pagesOf } from '../Nexus/record'
+import { type NexusPages, nexusPages, shownTitle } from '../Nexus/heldPages'
@@ restoreArtifact — the tree and the placement (as Phase 2-5 left them) @@
   const tree = await liveTreeOf(root)
-  const placed = await placeRecord(root, stored, destination, basename(artifactAbs), tree)
+  const { byId: roots, archived } = await nexusPages(root, tree)
+  const placed = await placeRecord(root, stored, destination, basename(artifactAbs), tree, roots)
   if (!placed.ok) return placed
@@ the world the returning pages are read against @@
   const targets = new Map(Object.entries(record.targets ?? {}))
-  const world = buildPageIndex([...pagesOf(tree), ...back])
+  const world = buildPageIndex([...pagesOf(tree), ...archived, ...back])
   const frozen = frozenWorld(world, targets)
@@ the settle @@
   const after = await settledIndex(root)
+  const settled = after && heldTreeOf(root)
   const ids = back.map((p) => p.id)
@@ the refill roots @@
-  const roots = recordById(tree)
   const unspent: string[] = []
@@ the Link refill @@
     const defs = linkDefsOf(tree.config.registry)
-    const refilled = frozenWorld(after ?? world)
+    const refilled = frozenWorld(
+      settled ? buildPageIndex([...pagesOf(settled), ...archived]) : world,
+    )
     const trashed: StrippedLink[] = []
@@
       for (const id of Object.keys(all))
-        if (!roots[id]) trashed.push({ page: id, property: def.id, value: all[id] })
+        if (roots.get(id) === undefined)
+          trashed.push({ page: id, property: def.id, value: all[id] })
         else if (!taken.has(id)) unlinked.add(id)
@@ the answer @@
   return ok({
-    ...restored([...unspent, ...unlinked].map((id) => roots[id].title)),
+    ...restored([...unspent, ...unlinked].flatMap((id) => shownTitle(tree, roots, id) ?? [])),
     ...(cascade ? { cascade } : {}),
     ...(landedAs ? { landedAs } : {}),
@@ reapply @@
-/** The ids of what's still here and didn't take its tag back; a root gone since has nothing to take it. */
+/** The ids of what's still here and didn't take its tag back, one of two files claiming its id among them; a root gone since has nothing to take it. */
 async function reapply(
   root: string,
-  roots: Record<string, EntityRecord>,
+  roots: NexusPages['byId'],
   key: string,
   additions: Record<string, string[]>,
 ): Promise<string[]> {
@@
-  return Object.keys(additions).filter((id) => roots[id] && !taken.has(id))
+  return Object.keys(additions).filter((id) => roots.get(id) !== undefined && !taken.has(id))
 }
```

```Core/Trash/restoreProperty.ts diff
@@ imports @@
-import { pageIndexOf, recordById } from '../Nexus/record'
+import { pagesOf } from '../Nexus/record'
+import { nexusPages, shownTitle } from '../Nexus/heldPages'
+import { buildPageIndex } from '../Connections/pageIndex'
@@ restoreInner @@
   const tree = await liveTreeOf(root)
-  const roots = recordById(tree)
-  const frozen = frozenWorld(pageIndexOf(tree))
+  const { byId: roots, archived } = await nexusPages(root, tree)
+  const frozen = frozenWorld(buildPageIndex([...pagesOf(tree), ...archived]))
   const dropped: StrippedLink[] = []
   const values = Object.fromEntries(
     Object.entries(record.values).filter(([id, raw]) => {
-      if ((roots[id]?.kind !== 'page' && roots[id]?.kind !== 'space') || isBlankRaw(raw))
+      const at = roots.get(id)
+      if ((at !== null && at?.kind !== 'page' && at?.kind !== 'space') || isBlankRaw(raw))
         return false
       const entry = def.type === 'link' ? gonePageEntry(raw, frozen) : null
@@
   return ok({
-    unrestored: Object.keys(values).flatMap((id) => (taken.has(id) ? [] : roots[id].title)),
+    unrestored: Object.keys(values).flatMap((id) =>
+      taken.has(id) ? [] : (shownTitle(tree, roots, id) ?? []),
+    ),
     dropped,
```

```Core/Properties/assignment.ts diff
@@ imports @@
-import { type EntityRecord, pageIndexOf, recordById } from '../Nexus/record'
+import { pagesOf } from '../Nexus/record'
+import { type NexusPages, nexusPages } from '../Nexus/heldPages'
+import { owningCollection } from '../Nexus/treePatch'
+import { buildPageIndex } from '../Connections/pageIndex'
@@ refillValues @@
   def: PropertyDefinition,
-  roots: Record<string, EntityRecord>,
+  roots: NexusPages['byId'],
   values: Record<string, unknown>,
@@ restoreCachedValues @@
-  const under = `${relative(root, collectionFolder)}/`
+  const rel = relative(root, collectionFolder)
   const tree = await liveTreeOf(root)
-  const live = recordById(tree)
-  const members = Object.fromEntries(
-    Object.keys(cached).flatMap((id) =>
-      live[id]?.kind === 'page' && live[id].path.startsWith(under) ? [[id, live[id]]] : [],
-    ),
-  )
-  const frozen = frozenWorld(pageIndexOf(tree))
+  const { byId, archived } = await nexusPages(root, tree)
+  const members = new Map(
+    Object.keys(cached).flatMap((id) => {
+      const r = byId.get(id)
+      return r?.kind === 'page' && owningCollection(tree, r.path)?.path === rel
+        ? [[id, r] as const]
+        : []
+    }),
+  )
+  const frozen = frozenWorld(buildPageIndex([...pagesOf(tree), ...archived]))
   // A cached Link naming a page gone leaves the cache: one whose page the Trash holds joins its bundle, one naming nothing is dropped.
   const gone =
     def.type === 'link'
-      ? Object.keys(members).flatMap((id) => {
+      ? [...members.keys()].flatMap((id) => {
```

```Core/Properties/governedSweep.ts diff
@@ imports @@
-import type { EntityRecord } from '../Nexus/record'
+import { addressable, type NexusPages } from '../Nexus/heldPages'
@@ sweepRootsById @@
-/** Rewrites each page or Space whose ID is in `values` — found where `roots` places it, matched by the ID it carries — and answers the IDs whose root now holds what its rewrite asked for; a null rewrite leaves its root as it is. */
+/** Rewrites each page or Space whose ID is in `values` — found where `roots`, the by-id projection, places it, matched by the ID it carries, and left alone where two files claim it — and answers the IDs whose root now holds what its rewrite asked for; a null rewrite leaves its root as it is. */
 export async function sweepRootsById<T>(
   root: string,
-  roots: Record<string, EntityRecord>,
+  roots: NexusPages['byId'],
   values: Record<string, T>,
@@
       const id = asString(raw[idKey])
-      if (id === undefined || !Object.hasOwn(values, id)) return null
+      if (!addressable(roots, id) || !Object.hasOwn(values, id)) return null
       const next = rewrite(raw, values[id])
@@
   const ids = Object.keys(values)
-  const pages = ids.flatMap((id) => (roots[id]?.kind === 'page' ? join(root, roots[id].path) : []))
+  const pages = ids.flatMap((id) => {
+    const at = roots.get(id)
+    return at?.kind === 'page' ? join(root, at.path) : []
+  })
   const { skipped } = await sweepGovernedRoots(root, pages, {
     raw: byId(ID_KEY),
-    ...(ids.some((id) => roots[id]?.kind === 'space') ? { sidecars: byId('id') } : {}),
+    ...(ids.some((id) => roots.get(id)?.kind === 'space') ? { sidecars: byId('id') } : {}),
   })
```

```Core/Properties/keyHolders.ts diff
@@ imports @@
+import { addressable, type NexusPages } from '../Nexus/heldPages'
@@ keyedHolders @@
-/** The values of the pages holding `key`, filed by ID, the files a strip should reach, and whether the values miss a holder: a holder with no ID, or whose ID another already took, is kept out of the strip, and a file that can't be read is stripped once it reads. */
-export async function keyedHolders(files: string[], key: string): Promise<KeyedHolders> {
+/** The values of the pages holding `key`, filed by ID, the files a strip should reach, and whether the values miss a holder: a holder with no ID, or with one `byId` marks as two files' claim, is kept out of the strip, and a file that can't be read is stripped once it reads. */
+export async function keyedHolders(
+  files: string[],
+  key: string,
+  byId: NexusPages['byId'],
+): Promise<KeyedHolders> {
   const values: Record<string, unknown> = {}
   const kept: string[] = []
-  const seen = new Set<string>()
   let unread = false
@@
     const id = asString(fields[ID_KEY])
-    if (!id || seen.has(id)) {
+    if (!addressable(byId, id)) {
       kept.push(file)
       continue
     }
-    seen.add(id)
     if (!isBlankRaw(fields[key])) values[id] = fields[key]
```

```Core/Properties/deleteProperty.ts diff
@@ imports @@
 import { queryKeyHolders } from '../Index/contentIndex'
+import { nexusPages } from '../Nexus/heldPages'
 import { liveTreeOf } from '../Nexus/liveTree'
@@ deletePlan @@
 ): Promise<DeletePlan> {
-  const held = await keyedHolders(await governedReach(root, queryKeyHolders(key)), key)
+  const { byId } = await nexusPages(root, await liveTreeOf(root))
+  const held = await keyedHolders(await governedReach(root, queryKeyHolders(key)), key, byId)
   const raw: Rewrite = (r) => stripKeys(r, [key])
```

```Core/Properties/removeProperty.ts diff
@@ imports @@
 import { queryKeyHolders } from '../Index/contentIndex'
+import { nexusPages } from '../Nexus/heldPages'
+import { liveTreeOf } from '../Nexus/liveTree'
@@ removeInner @@
+  const { byId } = await nexusPages(root, await liveTreeOf(root))
   const { values, strip } = await keyedHolders(
     await governedReach(root, queryKeyHolders(key), collectionFolder),
     key,
+    byId,
   )
```

```Core/Nexus/cascade.ts diff
@@ imports @@
 import {
   type Rewrite,
   type RewriteText,
+  governedReach,
   governedRoot,
   sweepGovernedRoots,
@@
-import { withheldIn } from './treePatch'
@@
-import { liveIdIndex, livePathOf } from './heldPages'
+import { addressable, nexusPages } from './heldPages'
@@ NO_STRIP, and spaceArm's held tree @@
+const NO_STRIP: DeleteCascade = { cascade: { pages: [], hosts: [] }, links: [] }
+
 /** A sweep's Space sidecar arm, planned only when a Space the tree holds answers `rewrite`, since the arm reads every Space sidecar. */
-const spaceArm = (tree: NexusTree | null, rewrite: Rewrite): { sidecars?: Rewrite } =>
-  tree?.contexts.some((g) => g.spaces.some((s) => s.values && rewrite(s.values, '') !== null))
+const spaceArm = (tree: NexusTree, rewrite: Rewrite): { sidecars?: Rewrite } =>
+  tree.contexts.some((g) => g.spaces.some((s) => s.values && rewrite(s.values, '') !== null))
     ? { sidecars: rewrite }
     : {}
@@ deleteCascade @@
-/** A delete strips every Link property value naming a page it took, by any key that now resolves to nothing, from the pages and Spaces the tree holds outside it; a key a page outside still answers is left to that page, and bodies keep their links and read unresolved. Nothing at or under `abs` is swept, since it left with the delete. */
+/** A delete strips every Link property value naming a page it took, by any key that now resolves to nothing, from the governed pages outside it, archived ones among them, and from every Space; a key a page the tree holds outside it still answers is left to that page, and bodies keep their links and read unresolved. A linker with no ID, or one of two files claiming one, keeps its value, since no restore could put it back. Nothing at or under `abs` is swept, since it left with the delete. */
 export async function deleteCascade(
@@
   const tree = heldTreeOf(root)
-  // The held tree may still list the deleted pages, since its patch can fall to a walk, so they're left out by path; with no tree, nothing answers and every key strips.
-  const after = buildPageIndex(tree ? pagesOf(tree).filter((p) => !inside(p.path)) : [])
+  if (!tree) return NO_STRIP
+  // The held tree may still list the deleted pages, since its patch can fall to a walk, so they're left out by path.
+  const after = buildPageIndex(pagesOf(tree).filter((p) => !inside(p.path)))
   const gone = new Set(paths.flatMap(pathKeys).filter((k) => after.resolve(k).status === 'phantom'))
   try {
-    const defs = byKey(linkDefsOf(tree?.config.registry ?? []))
-    if (!defs.size || !gone.size) return { cascade: { pages: [], hosts: [] }, links: [] }
-    const rels = queryMentions([...gone]) ?? (await nexusCorpus(root))
+    const defs = byKey(linkDefsOf(tree.config.registry))
+    if (!defs.size || !gone.size) return NO_STRIP
     const goneEntry = (value: unknown): string | null =>
@@ the strip's files and its held-out rule @@
-    // Tree pages, and the pages beneath a folder the tree withholds: a loose file outside every Collection shows in no view and no restore could reach it; dropping this filter strips them too.
-    const held = liveIdIndex(root)
-    const withheld = withheldIn(tree?.unreadable)
-    const files = rels
-      .filter((rel) => (held.has(rel) || withheld(rel)) && !inside(rel))
-      .map((rel) => join(root, rel))
-    let twins = 0
+    const files = (await governedReach(root, queryMentions([...gone]))).filter(
+      (file) => !inside(relative(root, file)),
+    )
+    const { byId } = await nexusPages(root, tree)
+    let heldOut = 0
     const swept = await sweepGovernedRoots(root, files, {
       raw: (raw, file) => {
         const id = asString(raw[ID_KEY])
-        if (
-          named(raw).length &&
-          id !== undefined &&
-          livePathOf(root, id) === null &&
-          !withheld(relative(root, file))
-        ) {
-          twins++
+        if (named(raw).length && !addressable(byId, id)) {
+          heldOut++
           return null
         }
         return strip(raw, file)
       },
       ...spaceArm(tree, strip),
     })
@@
-    const unswept = swept.skipped.length + twins
+    const unswept = swept.skipped.length + heldOut
```

**VERIFY**

- [ ] The listed tests pass; `heldPages.test.ts:54`, `deleteReach.test.ts:113` and `:125`, `cascade.test.ts:586`, and `restoreProperty.test.ts:344` pass unchanged.
- [ ] `git grep -n "recordById" -- Core` finds nothing; `git grep -n "frozenWorld(pageIndexOf" -- Core` finds nothing; `git grep -n "withheldIn\|liveIdIndex\|livePathOf" -- Core/Nexus/cascade.ts` finds nothing.
- [ ] `git grep -n "nexusPages(" -- Core` finds `heldPages.ts`, `Bundles/handlers.ts`, `spend.ts`, `restoreProperty.ts`, `assignment.ts`, `deleteProperty.ts`, `removeProperty.ts`, `cascade.ts`, their tests, `keyHolders.test.ts`, `placement.test.ts`, `rows.test.ts`, and `trashRecovery.test.ts`: one projection per operation or listing, never on an event; `git grep -n "addressable(" -- Core ':!*.test.ts'` finds `heldPages.ts`, `governedSweep.ts`, `keyHolders.ts`, and `cascade.ts`.
- [ ] `npm run test -- engineGraph hostGraph` passes (`rows.ts` and `placement.ts` take `heldPages.ts` as a type import only).
- [ ] Run the gates.
- [ ] Check for unnecessary code or mistakes.

**Lines:** +79 (+160 / −81), view-delta's Actionable rule. `heldPages.ts` +58 / −6, `cascade.ts` +18 / −22, `assignment.ts` +16 / −10, `spend.ts` +15 / −10, `rows.ts` +12 / −4, `restoreProperty.ts` +10 / −5, `governedSweep.ts` +8 / −5, `keyHolders.ts` +7 / −4, `placement.ts` +6 / −5, `handlers.ts` +4 / −1, `removeProperty.ts` +4, `deleteProperty.ts` +2, `record.ts` −9. Comments +3 / −2, seven rewritten. Tests about +335, two inverted (`removeProperty.test.ts:143`, `deleteProperty.test.ts:174`) and one retitled (`cascade.test.ts:785`).

#### Task 3-4

**TASK:** Keep the Archive out of the confirmations' counts (C-4), the Matrix, and the headings; a Collection's value load reads the tree's pages (K-2), folding `folderCorpus` into its last caller. Drive group 3 proves the phase on `~/Test`.

**NOW:** Since Task 3-2, `sweepCount` (`Core/Properties/governedSweep.ts:113-114`), behind every confirmation, gets archived holders; since Task 3-1, `readMatrixGraph` (`Core/Matrix/matrixGraph.ts:19-43`) and `index:headings` (`Core/Nexus/handlers.ts:166-168`) see archived rows, which `pages:changed` makes the renderer re-ask for. `loadValues`' no-id branch (`Core/Views/loadValues.ts:8-18`) reads `folderCorpus` (`indexSeed.ts:84-87`), withheld pages included (a contradicting ID, a withheld Set); `pagePathsIn(containerAt(tree, rel))` (`treePatch.ts:101-105`) lists only held pages, nested Sets included.

**CHANGE**

- [ ] Write and watch fail:
  - `Core/Properties/governedSweep.test.ts` `describe('sweepCount')` (`:118`), new: "counts no file the Archive holds, while the sweep it previews writes it" — archived `.nexus/archive/C1/Notes/2026-10-20T12-00-00-000Z__C.md.archived/C.md`; `sweepCount(root, [a, archived], { text: (c) => `${c}x` })` is 1, `sweepGovernedRoots(root, [a, archived], { text: (c) => `${c}x` }, true).touched.size` is 2.
  - `Core/Matrix/matrixGraph.test.ts`, new: "drops an archived page’s rows, its links included" (upserted `.nexus/archive/C1/Notes/2026-10-20T12-00-00-000Z__D.md.archived/D.md`, ID D, a body relation: no `values[D]`, no link from it, `readMatrixGraph(false, [that path]).ids` is `[]`); other cases (`:58-155`) unchanged.
  - `Core/Nexus/handlers.test.ts`, new `describe('index:headings')` › "answers every page’s headings but an archived page’s" — a page and an archived page, each with `## Setup`, indexed; `nexusHandlers['index:headings'](ctx, undefined)` answers only the page's path, and `{}` asked for the archived one.
  - `Core/Views/loadValues.test.ts`: `beforeEach` writes `.nexus/nexus.json`, `Col/_pagecollection.json`, `Col/SetA/_pageset.json`; `hold()` (`seedLiveTree(await readNexus(root))`) runs after each case's page writes; `afterEach` drops the tree. "maps page id → frontmatter across the container and its nested Sets" (`:22`) and every no-id case hold; "reads only the named pages, resolved through the live tree" (`:98`) drops its own seeding. "returns an empty map for an absent container" holds too. New "reads the pages the tree holds under the container, never one the tree withholds": `Col/odd.md` with task-marked ID `${P1.slice(0, 10)}T${P1.slice(11)}` and `Col/Loose/p2.md`, in a folder with no sidecar the tree withholds and a folder walk reads, both absent, `p1` present.
- [ ] `Core/Properties/governedSweep.ts`: `sweepCount` filters out the files `isArchived(relative(root, file))` names before its dry run.
- [ ] `Core/Matrix/matrixGraph.ts`: `readMatrixGraph` skips the rows `isArchived` names (no node, no edge), keeping every other page; `:18` names the trim.
- [ ] `Core/Nexus/handlers.ts`: `index:headings` drops the paths `isArchived` names.
- [ ] `Core/Views/loadValues.ts`: the no-id branch reads `pagePathsIn(containerAt(await liveTreeOf(rootPath), containerRelPath))`; `corpus` answers the relative paths both branches hold, and `loadValues` joins each to the root once.
- [ ] `Core/Index/indexSeed.ts`: delete `folderCorpus`; `moveIndexPaths`' arrival branch walks `corpusFilesUnder` itself.
- [ ] Drive group 3 and the run's `Drive Table` prologue (below) in `.claude/scripts/Archive Drive/live-drive.mjs`, its table in `MATRIX.md`, its pruned checks in the file's *§Pruned* list; the view's on-disk `active_view` outlasts group 3's relaunch. Group 3 relaunches, so it drives the run's own `cdp`, which its relaunch reassigns, and a throw inside it leaves the run holding the live session; it waits on the search's rows with `until`, and waits out the watcher's write-finish hold before its seeds leave from outside, since an unlink inside that hold reaches the app as nothing. Its withheld page sits under a Set whose sidecar doesn't parse, which the index and a folder walk read and the tree withholds.
- [ ] Sibling sweep: `readMatrixGraph`'s signature stands (`Matrix/handlers.ts` unchanged); `folderCorpus`' callers were `loadValues.ts` and `indexSeed.ts:183`; `useViewHost.test.tsx` mocks `view:loadValues`.

**AFTER**

```Core/Properties/governedSweep.ts diff
@@ imports @@
 import { isMarkdownFile, join, relative } from '../Paths/posix'
+import { isArchived } from '../Paths/nexusPaths'
@@ sweepCount @@
-export const sweepCount = async (root: string, files: string[], plan: SweepPlan): Promise<number> =>
-  (await sweepGovernedRoots(root, files, plan, true)).touched.size
+export async function sweepCount(root: string, files: string[], plan: SweepPlan): Promise<number> {
+  const shown = files.filter((file) => !isArchived(relative(root, file)))
+  return (await sweepGovernedRoots(root, shown, plan, true)).touched.size
+}
```

```Core/Matrix/matrixGraph.ts diff
@@ imports @@
 import { readPageRelations } from '../Index/contentIndex'
 import { ID_KEY } from '../Nexus/identityMark'
+import { isArchived } from '../Paths/nexusPaths'
 import type { PageRelationRow } from '../Platform/stores'
@@ readMatrixGraph @@
-// `null` when there is no index yet; the renderer keeps what it holds and the next push refetches. Without values, the store reads each page's ID alone. An ask for named paths also answers every page id at them, linked or not, so the renderer lets go of the rows a moved page held under its old path.
+// `null` when there is no index yet; the renderer keeps what it holds and the next push refetches. Without values, the store reads each page's ID alone. An ask for named paths also answers every page id at them, linked or not, so the renderer lets go of the rows a moved page held under its old path. An archived page answers nothing, so it draws no node and no edge.
 export function readMatrixGraph(withValues: boolean, paths?: string[]): MatrixGraphReply | null {
 …
   for (const [path, page] of Object.entries(rows.pages)) {
     const id = page.values[ID_KEY]
-    if (typeof id !== 'string') continue
+    if (typeof id !== 'string' || isArchived(path)) continue
     idOf.set(path, id)
```

```Core/Nexus/handlers.ts diff
@@ imports @@
 import { readHeadings } from '../Index/contentIndex'
+import { isArchived } from '../Paths/nexusPaths'
@@ 'index:headings' @@
-  'index:headings': withRoot(async (_root, _ctx, paths: unknown) =>
-    ok(readHeadings(isStringArray(paths) ? paths : undefined) ?? {}),
-  ),
+  'index:headings': withRoot(async (_root, _ctx, paths: unknown) => {
+    const headings = Object.entries(readHeadings(isStringArray(paths) ? paths : undefined) ?? {})
+    return ok(Object.fromEntries(headings.filter(([path]) => !isArchived(path))))
+  }),
```

```Core/Views/loadValues.ts diff
@@ imports @@
-import { join, relative } from '../Paths/posix'
+import { join } from '../Paths/posix'
 import type { PageValues } from './viewRow'
 …
 import { readPageRecord } from '../Nexus/readNexus'
-import { folderCorpus } from '../Index/indexSeed'
+import { liveTreeOf } from '../Nexus/liveTree'
+import { containerAt, pagePathsIn } from '../Nexus/treePatch'
 import { livePathOf } from '../Nexus/heldPages'
@@ corpus @@
-  if (!pageIds) return folderCorpus(rootPath, join(rootPath, containerRelPath))
-  return pageIds.flatMap((id) => {
-    const rel = livePathOf(rootPath, id)
-    return rel ? [join(rootPath, rel)] : []
-  })
+  if (!pageIds) return pagePathsIn(containerAt(await liveTreeOf(rootPath), containerRelPath))
+  return pageIds.flatMap((id) => livePathOf(rootPath, id) ?? [])
 }
@@ loadValues @@
   const files = await corpus(rootPath, containerRelPath, pageIds)
   const records = await Promise.all(
-    files.map((absFile) => {
-      const relFile = relative(rootPath, absFile)
-      return readPageRecord(absFile, relFile).catch(() => null)
-    }),
+    files.map((rel) => readPageRecord(join(rootPath, rel), rel).catch(() => null)),
   )
```

```Core/Index/indexSeed.ts diff
@@ folderCorpus @@
-export async function folderCorpus(root: string, absFolder: string): Promise<string[]> {
-  const rels = await corpusFilesUnder(root, absFolder, await readWatchScope(root))
-  return rels.map((rel) => join(root, rel))
-}
-
 async function relCorpusPath(root: string, abs: string): Promise<string | null> {
@@ moveIndexPaths @@
   if (!oldRel) {
-    const landed = isMarkdownFile(newRel) ? [newAbs] : await folderCorpus(root, newAbs)
-    for (const abs of landed) await indexWrittenPage(root, abs)
+    const landed = isMarkdownFile(newRel)
+      ? [newRel]
+      : await corpusFilesUnder(root, newAbs, await readWatchScope(root))
+    for (const rel of landed) await indexWrittenPage(root, join(root, rel))
     return
   }
```

```.claude/scripts/Archive Drive/live-drive.mjs diff
@@ imports @@
 import { join } from 'node:path'
+import { parse } from 'yaml'
 import {
-  ask, chooseNative, click, launch, mintPageId, mouseClick, must, NEXUS, restore, results, settles, shot, sleep, until,
+  ask, chooseNative, click, escapeAll, FM, launch, mintPageId, mouseClick, must, NEXUS, openCollection, openPage,
+  pageIds, pressKey, relaunch, restore, results, settles, shot, sleep, typeText, until,
 } from '../drive-harness.mjs'
@@ ALL @@
 const at = (phase) => PHASES.indexOf(String(phase))
-const ALL = ['1', '2']
+const ALL = ['1', '2', '3']
 const GROUPS = new Set(process.argv.slice(2))
@@ The Nexus on disk, after readRel @@
 const readRel = (rel) => readFileSync(abs(rel), 'utf8')
+const frontOf = (rel) => parse(FM.exec(readRel(rel))?.[1] ?? '') ?? {}
+const bodyOf = (rel) => readRel(rel).replace(FM, '')
+function treePaths(tree) {
+  const out = new Set()
+  const walk = (n) => {
+    for (const p of n.pages ?? []) out.add(p.path)
+    for (const s of n.sets ?? []) walk(s)
+  }
+  for (const c of tree.collections) walk(c)
+  return out
+}
 const settingsOnDisk = () => JSON.parse(readRel('.nexus/settings.json'))
@@ Group 3 — Reach (Phase 3), after group2 @@
 
+// ── Group 3 — Reach (Phase 3) ───────────────────────────────────────────────
+
+const STAMP = '2026-10-20T12-00-00-000Z'
+const rowIds = (cdp) => cdp.evaluate(`[...document.querySelectorAll('.data-row[data-rid]')].map((r) => r.dataset.rid)`)
+
+/** Seeds an archived page by hand, as the archive op will file one (Phase 4), and answers the relaunched window. */
+// Group 3 relaunches, so it drives the run's own `cdp`, and a failure inside it leaves the run holding the live session.
+async function group3() {
+  const colA = JSON.parse(readRel('Collection A/_pagecollection.json')).id
+  const alpha = JSON.parse(readRel('Collection A/Set Alpha/_pageset.json')).id
+  const { id: stage } = await must('add Drive Stage', ask(cdp, 'schema:add', 'Collection A', {
+    id: '',
+    label: 'Drive Stage',
+    type: 'select',
+    select_options: [{ key: 'Draft', label: 'Draft' }],
+  }))
+  const live = { rel: 'Collection A/Set Alpha/Drive Live.md', id: mintPageId() }
+  const linker = { rel: 'Collection A/Set Alpha/Drive Linker.md', id: mintPageId() }
+  // A Set whose sidecar doesn't parse is listed unreadable and never stamped, so the tree withholds its page while the index and a folder walk still read it.
+  const withheld = { dir: 'Collection A/Drive Damaged', rel: 'Collection A/Drive Damaged/Drive Withheld.md', id: mintPageId() }
+  const bundle = `.nexus/archive/${colA}/Collection A/Set Alpha/${STAMP}__Drive Arc.md.archived`
+  const arc = { rel: `${bundle}/Drive Arc.md`, id: mintPageId() }
+  cdp = await relaunch(cdp, async () => {
+    writeFileSync(abs(live.rel), `---\nID: ${live.id}\nDrive Stage: Draft\n---\nbody\n`)
+    writeFileSync(abs(linker.rel), `---\nID: ${linker.id}\n---\n[[Drive Arc]]\n`)
+    mkdirSync(abs(withheld.dir), { recursive: true })
+    writeFileSync(abs(`${withheld.dir}/_pageset.json`), '{ not json')
+    writeFileSync(abs(withheld.rel), `---\nID: ${withheld.id}\n---\nbody\n`)
+    mkdirSync(abs(bundle), { recursive: true })
+    writeFileSync(abs(`${bundle}/_record.json`), JSON.stringify({ entity: 'page', id: arc.id, parent: { kind: 'container', id: alpha } }))
+    writeFileSync(abs(arc.rel), `---\nID: ${arc.id}\nDrive Stage: Draft\n---\n## Drive Heading\n\nsee [[Drive Live]]\n`)
+  })
+
+  const state = await must('nexus:state', ask(cdp, 'nexus:state'))
+  const held = treePaths(state.tree)
+  item(3, 3, 'D-2', 'the tree holds the live pages and never the archived one', held.has(live.rel) && ![...held].some((p) => p.startsWith('.nexus/') || p.endsWith('/Drive Arc.md')), show([...held].filter((p) => p.includes('Drive'))))
+  await openCollection(cdp)
+  const search = `document.querySelector('.detail-title-search')`
+  await cdp.evaluate(`${search}.focus()`)
+  await typeText(cdp, 'Drive')
+  const drive = [live.id, linker.id, arc.id]
+  const filtered = async () => { const rows = await rowIds(cdp); return rows.length > 0 && rows.every((id) => drive.includes(id)) && rows }
+  const shown = await until('the search’s rows', filtered).catch(() => rowIds(cdp))
+  item(3, 3, 'D-2', "Collection A's view search for Drive lists Drive Live and never Drive Arc", shown.includes(live.id) && !shown.includes(arc.id), show(shown))
+  await shot(cdp, 'g3-view-search')
+  await cdp.evaluate(`(() => { const i = ${search}; i.select() })()`)
+  await pressKey(cdp, 'Backspace')
+  pageIds['Drive Linker'] = linker.id
+  await openPage(cdp, 'Drive Linker')
+  const drawn = await cdp.evaluate(`(() => { const line = [...document.querySelectorAll('.cm-content .cm-line')].find((l) => l.textContent.includes('Drive Arc')); return line ? { phantom: !!line.querySelector('.md-connection-phantom'), resolved: !!line.querySelector('.md-connection-resolved') } : null })()`)
+  item(3, 3, 'D-1', 'a link naming the archived page draws unresolved', drawn?.phantom === true && drawn.resolved === false, show(drawn))
+  await shot(cdp, 'g3-phantom')
+  await escapeAll(cdp)
+
+  const graph = await must('matrix:graph', ask(cdp, 'matrix:graph', true))
+  item(3, 3, 'K-2', 'the Matrix graph holds the live page and the one the tree withholds, and no archived page or edge', live.id in graph.values && withheld.id in graph.values && !(arc.id in graph.values) && graph.links.every((l) => !l.path.startsWith('.nexus/')), show(Object.keys(graph.values).length))
+  const asked = await must('matrix:graph by path', ask(cdp, 'matrix:graph', false, [arc.rel]))
+  item(3, 3, 'K-2', 'the Matrix graph asked for the archived path answers no id', asked.ids.length === 0, show(asked.ids))
+  const headings = await must('index:headings', ask(cdp, 'index:headings'))
+  const archivedHeadings = await must('index:headings by path', ask(cdp, 'index:headings', [arc.rel]))
+  item(3, 3, 'K-2', 'the headings answer no archived path, whole or asked by path', !Object.keys(headings).some((p) => p.startsWith('.nexus/')) && Object.keys(archivedHeadings).length === 0, show(Object.keys(archivedHeadings)))
+  const loaded = await must('view:loadValues', ask(cdp, 'view:loadValues', 'Collection A'))
+  item(3, 3, 'K-2', "Collection A's value load reads the tree's pages, never the archived one or one under a Set whose sidecar doesn't parse", live.id in loaded && !(arc.id in loaded) && !(withheld.id in loaded), show(Object.keys(loaded).length))
+
+  const count = await must('property:holders', ask(cdp, 'property:holders', stage))
+  item(3, 3, 'C-4', 'the delete confirmation’s count leaves the archived holder out', count === 1, show(count))
+  await must('rename the Draft option', ask(cdp, 'property:renameOption', stage, 'Draft', 'Final'))
+  item(3, 3, 'C-1', 'an option rename rewrites the archived page as it rewrites the live one', show(frontOf(arc.rel)['Drive Stage']) === show(['Final']) && show(frontOf(live.rel)['Drive Stage']) === show(['Final']), show([frontOf(arc.rel)['Drive Stage'], frontOf(live.rel)['Drive Stage']]))
+  await must('rename Drive Live', ask(cdp, 'mutate', { op: 'rename', path: live.rel, kind: 'page', newName: 'Drive Live 2' }))
+  live.rel = 'Collection A/Set Alpha/Drive Live 2.md'
+  item(3, 3, 'C-1', "renaming Drive Live re-spells the archived page's link", bodyOf(arc.rel).includes('[[Drive Live 2]]'), show(bodyOf(arc.rel)))
+  await must('delete Drive Stage', ask(cdp, 'property:delete', stage))
+  item(3, 3, 'C-2', 'the property delete strips the archived page as it strips the live one', !('Drive Stage' in frontOf(arc.rel)) && !('Drive Stage' in frontOf(live.rel)), show(frontOf(arc.rel)))
+
+  // The seeds leave as they came, from outside, and the deleted property's bundle is emptied, so a later group meets Collection A, its Archive, and the Trash as group 3 found them. The watcher holds a file the app just wrote until it's still for 200 ms, and an unlink inside that hold reaches the app as nothing, so the seeds leave once the delete's writes are still.
+  await sleep(400)
+  for (const rel of [live.rel, linker.rel, withheld.dir, `.nexus/archive/${colA}`]) rmSync(abs(rel), { recursive: true, force: true })
+  await until('the seeds out of the tree', async () => !treePaths((await must('nexus:state', ask(cdp, 'nexus:state'))).tree).has(live.rel))
+  const stageRow = ((await ask(cdp, 'bundles:list', { kind: 'trash' })).value ?? []).find((r) => r.title === 'Drive Stage')
+  await must('permanentDelete on', ask(cdp, 'personalization:set', 'permanentDelete', true))
+  if (stageRow) await must('empty Drive Stage', ask(cdp, 'mutate', { op: 'emptyBundle', bundlePath: stageRow.bundlePath }))
+  await must('permanentDelete off', ask(cdp, 'personalization:set', 'permanentDelete', false))
+  const left = ((await ask(cdp, 'bundles:list', { kind: 'archive', id: colA })).value ?? []).length
+  item(3, 3, '—', 'the group leaves Collection A’s Archive and the Trash as it found them', left === 0 && !exists(`.nexus/archive/${colA}`) && !((await ask(cdp, 'bundles:list', { kind: 'trash' })).value ?? []).some((r) => r.title === 'Drive Stage'), show({ left }))
+}
+
 // ── The run ─────────────────────────────────────────────────────────────────
@@ the run @@
   cdp = (await launch(PORT, 'archive-shots')).cdp
+  // Collection A's one saved view draws cards, so the run shows a table of its own, which the harness's restore takes back.
+  const table = { id: 'view_01KZARCHIVEDRIVE0000TABLE', name: 'Drive Table', type: 'table', property_order: ['_title'], hidden_properties: [] }
+  await must('save the Drive Table', ask(cdp, 'views:save', 'Collection A', 'collection', table, {}))
+  await must('show the Drive Table', ask(cdp, 'mutate', { op: 'setActiveView', path: 'Collection A', kind: 'collection', viewId: table.id }))
   if (GROUPS.has('1')) await group1(cdp)
   if (GROUPS.has('2')) await group2(cdp)
+  if (GROUPS.has('3')) await group3()
   cdp.close()
```

```.claude/scripts/Archive Drive/MATRIX.md diff
@@ after Group 2 @@
 
+#### Group 3 — Reach (Phase 3)
+
+The run's prologue saves and shows `Drive Table`, a table view of its own on Collection A, since Collection A's one saved view draws cards; the harness's restore takes it back. Seeds, with the app closed and before a relaunch, so the open's seed reads the Archive as its second root: `Drive Stage` (a Select with `Draft`, added through `schema:add` on Collection A before the quit, its draft's `id` empty as `propertyDraft` requires, `Core/Properties/properties.ts:161`, `:198-200`); `Collection A/Set Alpha/Drive Live.md` holding `Drive Stage: Draft`; `Drive Linker.md` beside it, its body `[[Drive Arc]]`; `Collection A/Drive Damaged/Drive Withheld.md` under a `_pageset.json` that doesn't parse, so the tree lists the Set unreadable and withholds the page, which the index and a folder walk still read; and the archived page `.nexus/archive/<Collection A's id>/Collection A/Set Alpha/2026-10-20T12-00-00-000Z__Drive Arc.md.archived/Drive Arc.md` with its `_record.json`, holding `Drive Stage: Draft`, `## Drive Heading`, and `[[Drive Live]]`. The group removes its seeds and empties the deleted property's bundle before it ends, leaving nothing behind; the harness restores `~/Test` when the run ends.
+
+| Check | Decision | Asserts |
+| --- | --- | --- |
+| the tree holds the live pages and never the archived one | D-2 | `nexus:state`'s tree |
+| Collection A's view search for Drive lists Drive Live and never Drive Arc | D-2 | DOM: `.data-row[data-rid]` |
+| a link naming the archived page draws unresolved | D-1 | DOM: `md-connection-phantom` on Drive Linker's line |
+| the Matrix graph holds the live page and the one the tree withholds, and no archived page or edge | K-2 | `matrix:graph` reply |
+| the Matrix graph asked for the archived path answers no id | K-2 | `matrix:graph` reply |
+| the headings answer no archived path, whole or asked by path | K-2 | `index:headings` reply |
+| Collection A's value load reads the tree's pages, never the archived one or one under a Set whose sidecar doesn't parse | K-2 | `view:loadValues` reply: the withheld page is one a walk of the Collection's folder would read |
+| the delete confirmation’s count leaves the archived holder out | C-4 | `property:holders` reply is 1 |
+| an option rename rewrites the archived page as it rewrites the live one | C-1 | disk: both frontmatters read `['Final']`, the one-item list the option cascade writes (`replaySchemaCascade.test.ts:523`) |
+| renaming Drive Live re-spells the archived page's link | C-1 | disk: the archived body reads `[[Drive Live 2]]` |
+| the property delete strips the archived page as it strips the live one | C-2 | disk: neither frontmatter holds `Drive Stage` |
+| the group leaves Collection A’s Archive and the Trash as it found them | — | the seeds removed from outside, `Drive Stage`'s bundle emptied under `permanentDelete` (then off again); `bundles:list` answers no archived row and no `Drive Stage` row |
+
 #### Pruned
@@ #### Pruned, its last entry @@
 - **The Trash browser's Restore in group 1:** group 1 restores through `mutate`; group 2 drives today's browser through Restore and Restore All, and the groups after Phase 5 drive the rebuilt one.
+- **The NavView sidebar search in group 3:** it reads the same tree `nexus:state` answers and has no driven path in the harness (the Path Links Drive's `pending` at `:786`).
+- **Link suggestions in group 3:** they read the renderer's `pageIndexOf(tree)`, which the tree check covers.
+- **Context and Space cascades into the Archive in group 3:** they ride the content reach the link rename proves (`queryMembers ?? nexusCorpus`, `contextCascade.ts:72`), and vitest pins them.
```

**VERIFY**

- [ ] The listed tests pass, and `matrixGraph.test.ts`'s other cases pass unchanged.
- [ ] `git grep -n "folderCorpus" -- Core` finds nothing.
- [ ] Run the gates.
- [ ] `POMMORA_ARCHIVE_LANDED=3 node live-drive.mjs 1 2 3` from `.claude/scripts/Archive Drive/` passes every landed item; group 3 prints no `FAIL` and no `AWAIT`.
- [ ] Check for unnecessary code or mistakes.

**Lines:** −2 (+22 / −24), view-delta's Actionable rule. `loadValues.ts` +6 / −11, `indexSeed.ts` +4 / −7, `governedSweep.ts` +5 / −2, `Nexus/handlers.ts` +5 / −3, `matrixGraph.ts` +2 / −1. Comments ±0, one rewritten. Tests about +60. Drive +106 / −2, `MATRIX.md` +22, apart.

#### Review Checkpoint

- [ ] Every test the four tasks name passes, with `exclusion.test.ts`, `walk.test.ts`, `indexSeed.test.ts`, `treePatch.test.ts`, `configReach.test.ts`, `normalizeSavedViews.test.ts`, `assetMigrate.test.ts`, `repairSweep.test.ts`, `keyHolders.test.ts`, `heldPages.test.ts`, `cascade.test.ts`, `deleteReach.test.ts`, `deleteProperty.test.ts`, `removeProperty.test.ts`, `assignment.test.ts`, `restoreProperty.test.ts`, `spend.test.ts`, `placement.test.ts`, `rows.test.ts`, `trashRecovery.test.ts`, `governedSweep.test.ts`, `matrixGraph.test.ts`, `Core/Nexus/handlers.test.ts`, `loadValues.test.ts`, and `governedWorld.test.ts` green, and `engineGraph`/`hostGraph` unchanged.
- [ ] `git grep -n "keyHolderFiles\|corpusUnder\|recordById\|folderCorpus\|frozenWorld(pageIndexOf" -- Core Desktop` finds nothing.
- [ ] Run the gates.
- [ ] Archive Drive groups 1–3 pass under `POMMORA_ARCHIVE_LANDED=3`.
- [ ] Two `opus-high` read-only reviewers apply `closeout-review`'s standards (its closing procedures, write guards, and output format exempt), each carrying the Approach, Principles, and Nathan's Constraints in full: correctness of the reach (every governed and content sweep reaches the Archive; the tree, discovery, counts, and the interface's reads don't), the one twin rule at every strip and refill, D-1 at every frozen world, and nothing left of the folded functions.

#### Departures and Disclosures

##### Departures From the Findings

- **The Delete's Strip Moves Onto Governed Reach With the Twin Rule, in 3-3 (1.3, 1.4):** widening the strip's files while keeping HEAD's twin branch breaks `deleteReach.test.ts:113` and `cascade.test.ts:714`, which the Findings keep: `governedReach` reaches `Notes/Loose.md` (inside a Collection folder and in the corpus), and the twin branch (`cascade.ts:110-115`) requires `id !== undefined`, so the ID-less linker falls through to `strip`; it also reads every archived holder as a twin, since `livePathOf` is tree-only. The filter and the held-out rule decide one thing, which files the strip writes, so they change together, where the map arrives.
- **`spend.ts:290`'s Refill World (1.5):** `after` there is `settledIndex` (`settle.ts:242-246`), the settled tree's page index, tree-only, so a Link value whose key only an archived page answers would still be dropped, which D-1 forbids. The fix captures the settled tree beside `after` (`const settled = after && heldTreeOf(root)`, before the awaits that follow) and reads `buildPageIndex([...pagesOf(settled), ...archived])`; `PageIndex` gains nothing for one site. No isolated test reaches the arm (a recorded value reaching it with a key only an archived page answers needs a step-aside collision on landing); it takes the same `archived` list the `:186` world does, which the restore's D-1 case pins.

##### Behavior Changes and Disclosures

- **The Delete Strip Holds Out an ID-Less Linker:** the held-out rule is `addressable`, which `keyedHolders` and `sweepRootsById` read too, so one predicate serves every strip and refill. An ID-less linker inside a Collection, which HEAD left untouched and silent, keeps its value and now counts in the unswept warning (`cascade.test.ts:714` pins `unsweptLine(1, 'links in ')`); one under a withheld folder, which HEAD stripped with nothing recorded (`cascade.ts:127-128`), is now held out. The live app stamps ID-less pages on admission, so both are brief states.
- **Twins Inside an Unparsed Collection (3-3):** with one twin rule over the by-id map, two files sharing an id inside a Collection whose sidecar doesn't parse (reached through `collectionFolders`' damaged arm, while `byId` holds neither, answering `undefined` rather than null) are both stripped, and the second's value overwrites the first's, where HEAD's `seen` (`keyHolders.ts:61-66`) held the second out; a duplicated id nothing in-app produces (Cautionary 4's shape).
- **`archiveReach(tree, rel?)` in `Core/Nexus/treePatch.ts`:** its two consumers are `archivedSets` (3-1) and `governedReach` (3-2), and it states once the rule both scoped reaches follow: unscoped, every Archive; scoped, the owning Collection's whole Archive. `governedReach`'s `only` finds its Archive through it, by the tree, rather than through the folder's sidecar.
- **`contentRoots` Stays Module-Private:** `sidecarsUnder(root, scope, under?)` walks both roots by default, so the asset migration reaches archived Set sidecars, as Findings 1.1's hoisted walker does; `contentRoots(root)` states the pair once for `corpusFiles` and `sidecarsUnder` without the export Findings 1.2 sets aside.
- **The Space Arm Leaves a Twin Alone:** `sweepRootsById`'s one `byId(idKey)` rewrite reads `addressable(roots, id)` for both arms, so its Space arm, which sweeps every Space sidecar, writes neither twin.
- **A Twin's Value on Restore (3-3):** the Space strips (`deleteCascade`'s Space arm, the property delete's Space sidecars and `snapshot`, `sweepMembers`) still strip a Space twin and file its value, since one takes a hand copy inside the hidden `.nexus/contexts`; the restore leaves the value out of both twins, as it does a page twin's, and keeps the record where the record outlives the restore. A Space twin goes unnamed, since the tree has no first-listed Space lookup (`shownTitle` falls back to `pagesByIdOf`).
- **The Twin Rule Spans Kinds:** `entitiesById` claims every record by id, so a page sharing an id with a Set or a Collection reads null to every writer, `writablePathsOf` included, where that map once compared pages alone; only a hand edit makes one.
- **An Archived Page Holding Both Keys (3-2):** the rename's both-keys refusal names only pages outside the Archive, as every confirmation does (C-4), so a rename onto a key an archived page holds beside the old one goes through, and the archived page keeps the new key's value (`NEW_KEY_IS_FRESHER`), its old key's value dropped.
- **`deleteProperty.ts:82` Drops `collectionFolders`:** it's `propertyHolders`' scope argument to `deletePlan`, which loses `folders` (Findings 1.3); `deleteInner` (`:99`) keeps it for the sidecar role, handing it the tree.
- **Take Along:** `cascade.ts:81`'s comment loses "with no tree, nothing answers and every key strips", false at HEAD since `defs` come from the held tree, and one `if (!tree) return NO_STRIP` heads the delete in place of the bail's reads (`:86`); `deleteInner`'s comment (`deleteProperty.ts:98`) loses "pre-cache dormant values may sit on any page", which its folders no longer serve; `loadValues`' `corpus` answers relative paths in both branches.

##### Found False at HEAD

- 1.3's "with no held tree the strip reaches Collections through `liveTreeOf`": `deleteCascade` returns at `cascade.ts:86` with no held tree, since `defs` read `tree?.config.registry`.
- 1.5's "`pages` replaces `pageIndexOf(tree)` at every `frozenWorld`" misses `spend.ts:290`, which reads `settledIndex` (above).
- *What Becomes False* names `Core/Nexus/migrateConfig.test.ts` for `normalizeSavedViews`; its cases live in `Core/Nexus/normalizeSavedViews.test.ts`.
- *What Becomes False*'s "the strip … keeps a value an archived page answers" contradicts 1.5, which keeps the delete's `after` tree-only for D-1's namesake ruling; the plan follows 1.5.
- *What Becomes False* misses `removeProperty.test.ts:143`, which inverts (none wins holds both copies out of Remove), `deleteProperty.test.ts:174`, which counts 2 where it counted 3, `governedWorld.test.ts`' import (`:6`) and `describe('collectionFolders')` (`:86`), and `trashRecovery.test.ts:34`'s `rows` helper.

##### Line Total

| Task | Net | Added / Removed |
| --- | --- | --- |
| 3-1 | +46 | +77 / −31 |
| 3-2 | +20 | +74 / −54 |
| 3-3 | +79 | +160 / −81 |
| 3-4 | −2 | +22 / −24 |
| **Phase 3, Measured** | **+143** | **+333 / −190** |

- **The Rule:** the plan's one counting rule (`view-delta`'s Actionable column: source with imports and blank lines as Biome wraps them; comments, tests, documents, and the drive out; moved lines on both sides), measured over `deb61a449..69f599ab7`. Each task's row is its share of the landed lines, file by file: a line one task writes and a later task rewrites counts once, in its final form, where the AFTER blocks show it in both (`keyedHolders`' call in `deletePlan`). Moved lines: `sidecarsUnder`'s walk (4) and `collectionFolders` (5). Comments, net +3 (+21 / −18): `contentRoots`', `archiveReach`'s, `governedReach`'s, `NexusPages`', `addressable`'s, and `shownTitle`'s docs added, each where the code alone would be misread (the Archive's separate walk, the whole-Archive scope, the reach's reason, the two path conventions, the twin rule, the title a twin shows); `assetMigrate.ts`'s `sidecarsUnder` doc, `record.ts:48`, and `cascade.ts:101` removed; the rest rewritten in place.
- **Against the Written +108:** the phase landed at +111 before its review, Biome's wrapping the difference, and its review's fix added +32 (*§Deviations*).
- **Against the Estimate (+10) and the Findings' Lane 1 (+14), Which Priced Logic Alone:** the growth is imports and Biome's wrapping, and the projection with its memoized tree half and no-store scan, the twin predicate and the title a twin shows, the refill sites' map form and `byId` threaded through `placeRecord`, the rows builder, and its handler, `keyedHolders`' callers taking the map, `sidecarsUnder` walking both roots, `archivedSets` with its counted skip, `archiveReach`, and the `:290` fix. The folds land as priced: `keyHolderFiles`, `corpusUnder`, `recordById`, and `folderCorpus` leave, three of four twin rules go, and `deleteCascade` shrinks by 7. What it buys is the reach itself: every governed, content, configuration, and by-id path now spans the Archive, which none did, with no new mechanism beside the one projection and the one scope rule.

### Phase 4 — The Archive's Ops

**GOAL:** Complete the data layer, with nothing visible yet: the `archive` op, one `restore` routed by store, a delete from the Archive through `deleteOp`'s chain with its Undo (E-3), F-4's disposal, the carry `refileArchived` (F-6), and the open pass `settleArchives` (F-5, F-6). Drive group 4 proves it; the menu row is Phase 6A's. Builds on Phase 1 (`liftSetAside`); Phase 2 (`Core/Bundles/`: `BundleStore`, `storeOf`, `mintBundle`, `openBundle` → `{ store, record }`, `originPathOf`, `originPagesOf`, `listBundles`, `bundleArtifact`, `contentPages`, the record with `place`, `gatherContentRecord`, `placeRecord` with its step past the disk, `withDestination`; `containerTrailById` and `findContainerById` in `Core/Nexus/treePatch.ts`; `storesChanged` through `changesStores(req)`; `dropDeparture(root, tree, kind, rel)` in `Core/Nexus/reorder.ts`); and Phase 3 (`nexusPages(root, tree) → { byId, archived }`, that `byId` in `placeRecord` and `resolveRecord` after `tree`, `owningCollection`'s archive arm, `.nexus/archive` in the index and governed reach, `sidecarsUnder(root, scope, under?)`). Host code only: `Core/Archive/` imports no React.

#### Task 4-1

**TASK:** Hoist `returningNames` and `goneContainers(ids)`; rename `MutateOutcome.trashed` to `bundled` (a removal's bundle, in either store).

**NOW:** The inline relink is `Core/Trash/spend.ts:229-249` (comment at `:229`; `backNames` also feeds the refill, `:296`); Phase 3-3 adds `const settled = after && heldTreeOf(root)` after `:230`, and nothing else there or at `delete.ts:113` moves. `settle.ts` already imports `respellings`, `buildPageIndex`, `ConnPage`, `PageIndex` (`:36-37`). `ConfigEdit` (`configReach.ts:93-96`) stays module-private. `confirmDelete` (`confirmations.ts:88`) and `PropertyFrame.tsx:299` pass `notifyTrashed` the whole reply.

**CHANGE**

- [ ] Tests first, failing. `Core/Nexus/settle.test.ts` › `describe('returningNames')`: `live = buildPageIndex([A at Notes/Alpha.md])`, `back = [B at Notes/Daily/Alpha.md]`, `after = buildPageIndex([A at Notes/Alpha.md, B at Notes/Ideas/Alpha.md])`, read through `after.resolve`. "the arrival's collision re-spells the live page it took a key from": `names.get('Alpha')` → A. "a key only the returning page answered follows it": `own.get('Daily/Alpha')` → B, in `names` too (`live` reads it phantom). "a key the live world still resolves stays out of the cascade": `own.get('Alpha')` → B; `names.get('Alpha')` stays A. `Core/Nexus/configReach.test.ts` › `describe('a gone edit')` (`:447`): "goneContainers names each id as a gone location": `goneContainers(['set_gone', 'set_sub'])` makes `setGone`'s tile and sidecar rewrites. The rename fails typecheck until the producers change.
- [ ] `settle.ts`: `returningNames(live, after, back)` → `{ names, own }` beside `relink`, taking the two-map comment; `relink`'s doc names it.
- [ ] `spend.ts`: one `returningNames(pageIndexOf(tree), after, back)` call replaces the inline relink; `own` feeds `rewriteConnections` (`:296`); drop the `respellings` import; import `returningNames` from `../Nexus/settle`.
- [ ] `configReach.ts`: `goneContainers(ids)` above `goneEdit`; the container arm calls it.
- [ ] `mutateRequest.ts:16`: `trashed` → `bundled`, doc naming either store; follow at `delete.ts:113`, `deleteProperty.ts:77`, `:109`, `confirmations.ts:48-65` (destructured name, `Pick` key). `notifyTrashed` keeps its name (it posts the Trash's notice).
- [ ] Sweep `trashed` → `bundled` in assertions and fixtures: `Core/Interface/Confirm/confirmations.test.ts:157`, `:196`, `:206`; `Core/Properties/Schema/PropertyFrame.test.tsx:74`; `Core/Properties/handlers.test.ts:202`, `:208`; `Core/Properties/replaySchemaCascade.test.ts:650`; `Core/Properties/setSpaceProperty.test.ts:158`, `:160`; `Core/Settings/TrashFrame.test.tsx:213`, `:229`, `:248`; `Core/Trash/deleteOrder.test.ts:328`, `:330`; `Core/Trash/deleteReach.test.ts:119`, `:121`, `:130`, `:137`, `:138`, `:258`, `:330`, `:347`, `:354`, `:356`, `:382`, `:384`; `Core/Trash/restoreProperty.test.ts:251`; `Core/Trash/spend.test.ts:219`, `:232`, `:242`; `Core/Nexus/mutate.test.ts:3313`, `:3344`, `:3396` (HEAD's numbering, in Phase 1's text); Phase 1-2's "steps a lifted folder aside past every name its parent holds, the Set’s own among them, and the Set’s restore keeps its name" (`deleted.value.trashed?.bundlePath`); any Phase 2 or 3 case reading a delete's bundle off its reply. The VERIFY grep lists what's left. `spend.test.ts` "a twin made meanwhile elsewhere…" (`:1287`) and "a Set returning beside a twin made meanwhile…" (`:1373`) stay unchanged, pinning the hoisted relink.
**AFTER**

```Core/Nexus/settle.ts diff
@@ relink @@
-/** The one re-spell, run inside the settle's turn: the map `respellings` builds from `before` to `after`, swept under `label`; undefined when nothing needs re-spelling. */
+/** A move's re-spell, run inside the settle's turn: the map `respellings` builds from `before` to `after`, swept under `label`; undefined when nothing needs re-spelling. A restore's arrival re-spells through `returningNames`. */
 export async function relink(
 …
   return renameCascade(root, { names, label })
 }
+
+/** A restore's re-spell, two maps rather than one `relink`: the arrival's collisions read against the live world alone, since beside the returning pages a twin's bare link reads ambiguous and a returning `Notes/Alpha` would take `notes/alpha` from a live `X/Notes/Alpha`. `own` reads the returning pages' own keys against themselves and joins `names` only where the live world names nothing, so a title-only link that found a namesake meanwhile stays with it. */
+export function returningNames(
+  live: PageIndex,
+  after: PageIndex,
+  back: readonly ConnPage[],
+): { names: Map<string, string>; own: Map<string, string> } {
+  const ids = back.map((p) => p.id)
+  const own = respellings(buildPageIndex(back), after, ids, [])
+  const names = respellings(live, after, [], ids)
+  for (const [k, v] of own) if (live.resolve(k).status === 'phantom') names.set(k, v)
+  return { names, own }
+}
```

```Core/Trash/spend.ts diff
@@ imports @@
-import { respellings, rewriteConnections } from '../Connections/rewrite'
+import { rewriteConnections } from '../Connections/rewrite'
 …
-import { settledIndex } from '../Nexus/settle'
+import { returningNames, settledIndex } from '../Nexus/settle'
@@ restoreArtifact — the returning relink (Phase 3-3's `settled` beside `after`) @@
-  // Two maps rather than one `relink`: the arrival's collisions read against the live world alone, since beside the returning pages a twin's bare link reads ambiguous and a returning `Notes/Alpha` would take `notes/alpha` from a live `X/Notes/Alpha`. `backNames` reads the returning pages' own keys against themselves, feeding the refill whole and the cascade only where the live world names nothing.
   const after = await settledIndex(root)
   const settled = after && heldTreeOf(root)
-  const ids = back.map((p) => p.id)
-  const backNames = after
-    ? respellings(buildPageIndex(back), after, ids, [])
-    : new Map<string, string>()
+  const returned = after ? returningNames(pageIndexOf(tree), after, back) : null
+  const own = returned?.own ?? new Map<string, string>()
   const unswept: string[] = []
   let cascade = after ? undefined : linksNotUpdated(title)
   if (after) {
 …
     unswept.push(...(await repairLanded(root, tree, record.entity, targetAbs, repair)))
-    const live = pageIndexOf(tree)
-    const names = respellings(live, after, [], ids)
-    for (const [k, v] of backNames) if (live.resolve(k).status === 'phantom') names.set(k, v)
-    if (names.size) cascade = await renameCascade(root, { names, label: title })
+    if (returned?.names.size)
+      cascade = await renameCascade(root, { names: returned.names, label: title })
   }
 …
-          .map((l) => [l.page, rewriteConnections(l.value, backNames)]),
+          .map((l) => [l.page, rewriteConnections(l.value, own)]),
```

```Core/Nexus/configReach.ts diff
@@ goneContainers @@
+/** The containers a removal took, as locations every saved view, View Tile, and filter drops: read from the tree, or from an archived Set's sidecars on disk. */
+export const goneContainers = (ids: string[]): ConfigEdit => ({
+  kind: 'gone',
+  propertyId: RESERVED_PROPERTY_ID.location,
+  ids,
+})
+
 export function goneEdit(tree: NexusTree, kind: HeldKind, rel: string): ConfigEdit | null {
@@ goneEdit — the container arm @@
     case 'collection':
     case 'set': {
       const node = containerAt(tree, rel)
-      return node
-        ? {
-            kind: 'gone',
-            propertyId: RESERVED_PROPERTY_ID.location,
-            ids: within(node).map((n) => n.id),
-          }
-        : null
+      return node ? goneContainers(within(node).map((n) => n.id)) : null
     }
```

```Core/Nexus/mutateRequest.ts diff
@@ MutateOutcome @@
   adopted?: string
-  trashed?: { bundlePath: string }
+  /** The bundle a removal minted, in the Trash or an Archive; absent when the system trash took it. */
+  bundled?: { bundlePath: string }
```

```Core/Trash/delete.ts diff
@@ deleteOp — the reply @@
-    ...(bundle ? { trashed: { bundlePath: relative(root, bundle) } } : {}),
+    ...(bundle ? { bundled: { bundlePath: relative(root, bundle) } } : {}),
```

```Core/Properties/deleteProperty.ts diff
@@ PropertyDeletion @@
-export type PropertyDeletion = SchemaCascade & Required<Pick<MutateOutcome, 'trashed'>>
+export type PropertyDeletion = SchemaCascade & Required<Pick<MutateOutcome, 'bundled'>>
@@ deleteInner @@
-  return ok({ trashed: { bundlePath: relative(root, bundle) }, ...schemaCascade(reach, record) })
+  return ok({ bundled: { bundlePath: relative(root, bundle) }, ...schemaCascade(reach, record) })
```

```Core/Interface/Confirm/confirmations.ts diff
@@ notifyTrashed @@
 export function notifyTrashed(
   title: string,
-  { trashed, cascade }: Pick<MutateOutcome, 'trashed' | 'cascade'>,
+  { bundled, cascade }: Pick<MutateOutcome, 'bundled' | 'cascade'>,
   retry?: () => void,
 ): void {
   const spend = notifyDeleted(
     title,
-    trashed &&
+    bundled &&
       (async () => {
-        spendBundle(trashed.bundlePath)
-        await useSession.getState().mutate({ op: 'restore', bundlePath: trashed.bundlePath })
+        spendBundle(bundled.bundlePath)
+        await useSession.getState().mutate({ op: 'restore', bundlePath: bundled.bundlePath })
       }),
     cascade,
     retry,
   )
-  if (trashed) armed.set(trashed.bundlePath, spend)
+  if (bundled) armed.set(bundled.bundlePath, spend)
 }
```

**VERIFY**

- [ ] The new `returningNames` and `goneContainers` cases pass; `spend.test.ts:1154-1453` (`describe('restore — the returning page’s links follow the pages they named')`) and `configReach.test.ts:447` pass unchanged in substance.
- [ ] `git grep -n "backNames" -- Core` finds nothing; `git grep -n "respellings(" -- Core/Trash` finds nothing.
- [ ] `git grep -n "\.trashed\b\|trashed: {\|'trashed'" -- Core Desktop ':!Core/Assets'` finds nothing (`Core/Assets/assetMigrate.ts`'s `trashed` is a count of swept files, a separate word).
- [ ] Run the gates.
- [ ] Check for unnecessary code or mistakes.

**Lines:** +8 (+35 / −27), ≈ 9 of them moved. By file: `delete.ts` +1 / −1, `settle.ts` +12, `spend.ts` +7 / −11, `configReach.ts` +7 / −7, `confirmations.ts` +5 / −5, `deleteProperty.ts` +2 / −2, `mutateRequest.ts` +1 / −1.

#### Task 4-2

**TASK:** Add the `archive` op and `restoreArchived` in `Core/Archive/archive.ts` (A-1, A-2), the record's `trail`, and `restore` routed by `storeOf`: an archived page or Set returns by a plain move to its exact place (E-1), or takes a destination when its origin is gone (E-5, F-1).

**NOW:** Traps: a sidecar id can be any string (`Core/Nexus/readNexus.ts:98-111`; Cautionary 3) and names the Archive's folder, hence `isUlidShaped` (`Core/Nexus/identityMark.ts:16-18`); `Core/Nexus/treeIndex.ts:132` already exports a `trailOf`, so the record's helper takes another name; Phase 3-3's `byId` holds archived pages, so `id-live` (`byId.has(recordId)`) would refuse an archived page's own restore. A relocate into `.nexus/archive` reads as an unlink and an add filed `ignored` (`Core/Nexus/fileEvents.ts:570-590`, `:227-241`), while the index moves its rows (`:276-278`; `Core/Index/indexSeed.ts:175-190`). `restoreOp` (`Core/Trash/spend.ts:134-141`) only resolves `req.bundlePath` before calling `restoreArtifact`. Once Archive bundles route to `restoreArchived`, `restoreArtifact`'s Trash-only guard (Phase 2-1) is unreachable; `emptyBundle`'s stays (E-3). Edits apply to the text Phases 2 and 3 leave in `record.ts`, `placement.ts`, `rows.ts`, `spend.ts`.

**CHANGE**

- [ ] Tests first, failing: `Core/Archive/archive.test.ts` (new, `settledMutate`; ULID-shaped Collection `Notes`, Set `Daily` with `page_order` `Alpha`, `Beta`, `Gamma`; `Linker.md` body `[[Notes/Daily/Beta]]`):
  - "a page archives into its Collection’s Archive under the chain it left, with its record": `archive Notes/Daily/Beta.md` → `bundled.bundlePath` = `.nexus/archive/<Notes id>/Notes/Daily/<stamp>__Beta.md.archived`, holding `Beta.md` byte-identical and `_record.json` = `{ entity: 'page', id: PAGE_B, parent: { kind: 'container', id: <Daily id> }, place: { above: PAGE_G, below: PAGE_A }, trail: [<Notes id>] }`; no `Beta` in the tree; `Daily/_pageset.json` `page_order` = `[PAGE_A, PAGE_G]`.
  - "an archived page stays in every cascade’s reach": `Beta.md` body `[[Alpha]]`; rename `Alpha` → `Alpha 2` rewrites it to `[[Alpha 2]]`.
  - "a Set archives once the excluded folder inside it is lifted to its parent": `Notes/Daily/Private` excluded, a file inside; `archive Notes/Daily` → `Notes/Private/` on disk, entry `Notes/Private`, bundle holds `Daily/` without `Private`.
  - "refuses a page whose Collection’s id would not make a folder name": sidecar id `col-notes` → `Only pages and Sets inside a Collection can be archived.`; nothing moved, no `.nexus/archive`.
  - "refuses what the tree doesn’t hold as the kind it names": `archive Notes`, `kind: 'set'` → `That item can’t be changed.`
  - "a restore returns it to its exact place by a plain move": archive, then `restore`: `Notes/Daily/Beta.md` byte-identical, `page_order` = `[PAGE_A, PAGE_B, PAGE_G]`, bundle gone, no `unrestored` or `landedAs`.
  - "a path link naming where it lived follows it to a chosen destination": `destination: { kind: 'container', id: <Notes id> }` → `Notes/Beta.md`, last in `Notes`' `page_order`; `Linker.md` reads `[[Notes/Beta]]`.
  - "a restore landing on a taken name steps aside and says so": a new `Beta` in `Daily` after the archive → `Beta (2).md`, `landedAs: 'Beta (2)'`.
  - "its own identity in the Archive doesn’t refuse its restore, and a twin elsewhere does": plain restore succeeds; a copy of `Beta.md` in a second Archive bundle → `Something in the nexus already carries this identity.`
  - "an Archive restore takes no Contexts lock": a `machine().lock` spy sees no `contextsDir(root)` key across an Archive restore, and one across a Trash restore.
  - "an item archived out of a Set since trashed returns into that Set once the Set is restored, and with the Set still in the Trash its row reads homeless and its restore takes a destination" (E-5): archive `Beta` and `Gamma`, `delete Notes/Daily`; both `bundleRows` rows over `listBundles(root, { kind: 'archive', id: <Notes id> })` read `homeResolves: false`; plain restore of `Gamma` → `The place this belonged to no longer exists.`; with `destination: { kind: 'container', id: <Notes id> }` → `Notes/Gamma.md`; after `Daily`'s restore, `Beta`'s row reads `homeResolves: true` and its plain restore → `Notes/Daily/Beta.md`.
  - "a restore whose origin has since been excluded finds no parent and takes a destination" (F-1): archive `Beta`, `writeExcludedFolders(root, ['Notes/Daily'])`, `settleNow` (as `Core/Nexus/settle.test.ts:418`); plain restore → `The place this belonged to no longer exists.`, bundle stands; with `destination: { kind: 'container', id: <Notes id> }` → `Notes/Beta.md`.
- [ ] Tests beside, failing: `Core/Trash/spend.test.ts` record cases (`:104-185`): `trail: ['col-notes']` for the page in `Daily`, none for the root Collection. `Core/Bundles/placement.test.ts` `resolveRecord` cases (Phase 2-3's move of `spend.test.ts:734-916`, on `byIdOf`): "an id held only inside the restoring bundle isn’t live; one held anywhere else, or twice, is". (Phase 2-1 retitles `spend.test.ts:1542` "a path neither store holds refuses to restore".) `Core/Nexus/mutateRequest.test.ts` › "refuses a kind or key outside its finite set…" (`:14`) refuses `archive` with `kind: 'collection'`; new "an archive changes what the settle holds and what the stores list": `changesSettled('archive')`, `changesStores({ op: 'archive', … })`. New pin in `spend.test.ts` › `describe('restore — the attack folds')`, green before and after: "a bundle path that escapes the Nexus refuses before anything opens" (`{ op: 'restore', bundlePath: '../x' }` → `Path escapes the nexus root.`).
- [ ] `mutateRequest.ts`: `op('archive', { path, kind: z.enum(['page', 'set']) })` after `delete`; `changesSettled` and `changesStores` name `archive`.
- [ ] `Core/Bundles/record.ts`: `trail` on the content record; `trailAbove(tree, containerId)`, shared with 4-5's carry; `gatherContentRecord` writes `trail` in both stores when the parent is a container.
- [ ] `Core/Bundles/placement.ts`: `resolveRecord` and `placeRecord` take `restoring` (the bundle's nexus-relative path) after `byId`; `id-live` excepts a `byId` entry at or under it (`null`, a twin, still refuses); update `resolveRecord`'s doc. `rows.ts`: `homeResolvesFor` takes `restoring`, which `bundleRowOf` passes as the row's `bundlePath`.
- [ ] `Core/Archive/archive.ts` (new): `archiveOp` and `restoreArchived`, as AFTER.
- [ ] `mutate.ts`: `case 'archive'` in the settle's turn; `case 'restore'` resolves `req.bundlePath`, then an Archive bundle goes to `restoreArchived` (settle's turn only), anything else to the Trash under `underContexts`. `spend.ts`: remove `restoreOp`; export `restoreArtifact`, passing `relative(root, bundleAbs)` to `placeRecord` (`relative` rejoins Phase 1's narrowed posix import); drop the `MutateContext`, `MutateRequest`, `resolveUnderRoot` imports; remove `restoreArtifact`'s store guard, keep `emptyBundle`'s.
- [ ] Sweep: `mutate.test.ts` and `spend.test.ts` reach `restore` through `handleMutate`/`settledMutate`, unchanged; `git grep -n "restoreOp" -- Core` (only `mutate.ts`); other `placeRecord`/`resolveRecord` calls (`placement.test.ts`, `rows.ts`) pass `restoring`; the archive op drops its order through `dropDeparture`.
**AFTER**

```Core/Nexus/mutateRequest.ts diff
@@ mutateRequest @@
   op('delete', { path: z.string(), kind: heldKind }),
+  op('archive', { path: z.string(), kind: z.enum(['page', 'set']) }),
   op('restore', { bundlePath: z.string(), destination: restoreDestination.optional() }),
@@ changesSettled @@
   operation === 'delete' ||
+  operation === 'archive' ||
   operation === 'restore' ||
@@ changesStores (Phase 2-3) @@
-  req.op === 'delete' || req.op === 'restore' || req.op === 'emptyBundle'
+  req.op === 'delete' || req.op === 'archive' || req.op === 'restore' || req.op === 'emptyBundle'
```

```Core/Bundles/record.ts diff
@@ imports (as Phase 2-4 left them) @@
-import { containerAt } from '../Nexus/treePatch'
+import { containerAt, containerTrailById } from '../Nexus/treePatch'
@@ contentRecord @@
     parent: parentRef,
     place,
+    /** The ids of the containers above `parent`, Collection first, so a Trash record's Collection is `trail[0] ?? parent.id`; read once the tree no longer holds `parent`, and kept current in the Archive by its carry. */
+    trail: z.array(z.string()).optional(),
@@ trailAbove, after placeOf @@
+export const trailAbove = (tree: NexusTree, containerId: string): string[] | null =>
+  containerTrailById(tree, containerId)?.slice(0, -1).map((n) => n.id) ?? null
+
@@ gatherContentRecord (Phase 2-4) @@
   const placed = id && siblings ? placeOf(siblings.map((n) => n.id), id) : undefined
+  const trail = container ? trailAbove(tree, container.id) : null
   return {
     entity: kind,
     ...(id ? { id } : {}),
 …
     ...(placed ? { place: placed } : {}),
+    ...(trail ? { trail } : {}),
   }
```

```Core/Bundles/placement.ts diff
@@ imports (as Phase 3-3 left them) @@
-import { join, titleFromPath } from '../Paths/posix'
+import { isAtOrUnder, join, titleFromPath } from '../Paths/posix'
 …
 import type { NexusPages } from '../Nexus/heldPages'
+import type { EntityRecord } from '../Nexus/record'
@@ heldElsewhere, above resolveRecord @@
+/** An id `byId` holds anywhere but inside the restoring bundle is live, and a twin (null) always is; only an archived page's own file sits inside its bundle, since the map holds no Set ids. */
+const heldElsewhere = (held: EntityRecord | null | undefined, restoring: string): boolean =>
+  held !== undefined && !(held && isAtOrUnder(held.path, restoring))
+
@@ resolveRecord @@
-… A live id refusal, an id the tree or the Archive holds, outranks every other answer: nothing may write over a living identity. */
+… A live id refusal, an id the tree or the Archive holds outside the restoring bundle, outranks every other answer: nothing may write over a living identity. */
 export function resolveRecord(
   record: ArtifactRecord,
   baseName: string,
   tree: NexusTree,
   byId: NexusPages['byId'],
+  restoring: string,
 ): Resolution {
   const recordId = record.entity === 'context' ? record.registry.id : record.id
-  if (recordId && byId.has(recordId)) return { refuse: 'id-live' }
+  if (recordId && heldElsewhere(byId.get(recordId), restoring)) return { refuse: 'id-live' }
@@ placeRecord @@
   tree: NexusTree,
   byId: NexusPages['byId'],
+  restoring: string,
 ): Promise<
 …
-  const resolution = resolveRecord(record, baseName, tree, byId)
+  const resolution = resolveRecord(record, baseName, tree, byId, restoring)
```

```Core/Bundles/rows.ts diff
@@ homeResolvesFor (Phase 3-3) @@
 function homeResolvesFor(
   record: ArtifactRecord,
   artifactName: string,
   tree: NexusTree,
   byId: NexusPages['byId'],
+  restoring: string,
 ): boolean {
-  const resolution = resolveRecord(record, artifactName, tree, byId)
+  const resolution = resolveRecord(record, artifactName, tree, byId, restoring)
   return !('refuse' in resolution) || resolution.refuse === 'id-live'
 }
@@ bundleRowOf @@
-    homeResolves: homeResolvesFor(record, artifactName, tree, byId),
+    homeResolves: homeResolvesFor(record, artifactName, tree, byId, bundlePath),
```

```Core/Archive/archive.ts diff
+// The Archive's own ops: a page or Set leaves its Collection for the Collection's Archive, where every cascade still reaches it (Reach-In), and comes back by a plain move to its exact place, with nothing to reconcile.
+
+import { basename, dirname, join, relative } from '../Paths/posix'
+import { fail, ok } from '../Contract/result'
+import { relocate } from '../Files/atomicWrite'
+import { recordWrite } from '../Files/writeEcho'
+import { machine } from '../Platform/machine'
+import { isUlidShaped } from '../Nexus/identityMark'
+import { liveTreeOf, mutableTarget, NOT_HELD } from '../Nexus/liveTree'
+import { owningCollection } from '../Nexus/treePatch'
+import { dropDeparture } from '../Nexus/reorder'
+import { pageIndexOf } from '../Nexus/record'
+import { nexusPages } from '../Nexus/heldPages'
+import { linksNotUpdated, renameCascade } from '../Nexus/cascade'
+import { returningNames, settledIndex } from '../Nexus/settle'
+import { liftSetAside } from '../Nexus/folderEntity'
+import type { MutateContext } from '../Nexus/mutate'
+import type { MutateReply, MutateRequest, RestoreDestination } from '../Nexus/mutateRequest'
+import {
+  type BundleStore,
+  bundleArtifact,
+  contentPages,
+  mintBundle,
+  originPagesOf,
+} from '../Bundles/bundle'
+import { gatherContentRecord, readRecord, writeRecord } from '../Bundles/record'
+import { placeRecord } from '../Bundles/placement'
+
+/** Link values and saved views naming what leaves stay where they are and resolve again on its restore, so nothing is stripped and no configuration pass runs. */
+export async function archiveOp(
+  { root }: MutateContext,
+  req: Extract<MutateRequest, { op: 'archive' }>,
+): Promise<MutateReply> {
+  const resolved = await mutableTarget(root, req.path, [req.kind])
+  if (!resolved.ok) return resolved
+  const abs = resolved.value
+  const tree = await liveTreeOf(root)
+  const id = owningCollection(tree, req.path)?.id
+  // The id names the Archive's folder, and a sidecar can carry any string as its id.
+  if (!isUlidShaped(id))
+    return fail('invalid-path', 'Only pages and Sets inside a Collection can be archived.')
+  if (req.kind === 'set') {
+    const lifted = await liftSetAside(root, abs)
+    if (!lifted.ok) return lifted
+  }
+  const record = await gatherContentRecord(root, tree, req.kind, abs)
+  const bundle = await mintBundle(root, { kind: 'archive', id }, abs)
+  await writeRecord(bundle, record)
+  await relocate(abs, join(bundle, basename(abs)))
+  await dropDeparture(root, tree, req.kind, req.path)
+  return ok({ bundled: { bundlePath: relative(root, bundle) } })
+}
+
+/** An archived page or Set returns by a plain move to the place it left, or to `destination`, with nothing reconciled, repaired, or refilled, since every cascade kept it current; path links naming where it lived follow it. */
+export async function restoreArchived(
+  root: string,
+  bundleAbs: string,
+  store: Extract<BundleStore, { kind: 'archive' }>,
+  destination?: RestoreDestination,
+): Promise<MutateReply> {
+  const held = await readRecord(bundleAbs)
+  const artifactAbs = await bundleArtifact(bundleAbs)
+  if ((held?.entity !== 'page' && held?.entity !== 'set') || !artifactAbs) return NOT_HELD
+  const tree = await liveTreeOf(root)
+  const { byId } = await nexusPages(root, tree)
+  const placed = await placeRecord(
+    root,
+    held,
+    destination,
+    basename(artifactAbs),
+    tree,
+    byId,
+    relative(root, bundleAbs),
+  )
+  if (!placed.ok) return placed
+  const { record, placement, writeOrder, landedAs } = placed.value
+  const { dir, finalName, finalTitle } = placement
+  const targetAbs = join(root, dir, finalName)
+  const back = await originPagesOf(root, store, await contentPages(record.entity, artifactAbs))
+  await machine().mkdir(dirname(targetAbs))
+  await relocate(artifactAbs, targetAbs)
+  await writeOrder?.()
+  recordWrite(bundleAbs)
+  await machine().remove(bundleAbs)
+  const title = finalTitle ?? finalName
+  const after = await settledIndex(root)
+  const names = after && returningNames(pageIndexOf(tree), after, back).names
+  const cascade = !names
+    ? linksNotUpdated(title)
+    : names.size
+      ? await renameCascade(root, { names, label: title })
+      : undefined
+  return ok({
+    ...(cascade ? { cascade } : {}),
+    ...(landedAs ? { landedAs } : {}),
+  })
+}
```

```Core/Nexus/mutate.ts diff
@@ imports @@
-import { emptyBundle, restoreOp } from '../Trash/spend'
+import { emptyBundle, restoreArtifact } from '../Trash/spend'
+import { archiveOp, restoreArchived } from '../Archive/archive'
+import { storeOf } from '../Bundles/bundle'
@@ dispatch @@
     case 'delete':
       return req.kind === 'space' || req.kind === 'context'
         ? underContexts(() => inSettleTurn(root, () => deleteOp(ctx, req)))
         : inSettleTurn(root, () => deleteOp(ctx, req))
 
-    case 'restore':
-      return underContexts(() => inSettleTurn(root, () => restoreOp(ctx, req)))
+    case 'archive':
+      return inSettleTurn(root, () => archiveOp(ctx, req))
+
+    // An Archive bundle holds a page or Set alone, so its restore changes no Context and takes no Contexts lock.
+    case 'restore': {
+      const resolved = await resolveUnderRoot(root, req.bundlePath)
+      if (!resolved.ok) return resolved
+      const store = storeOf(root, resolved.value)
+      return store?.kind === 'archive'
+        ? inSettleTurn(root, () => restoreArchived(root, resolved.value, store, req.destination))
+        : underContexts(() =>
+            inSettleTurn(root, () => restoreArtifact(root, resolved.value, req.destination)),
+          )
+    }
```

```Core/Trash/spend.ts diff
@@ imports (as Phases 1–3 left them) @@
-import { basename, dirname, join } from '../Paths/posix'
-import { resolveUnderRoot } from '../Paths/pathSafety'
+import { basename, dirname, join, relative } from '../Paths/posix'
 …
-import type {
-  MutateOutcome,
-  MutateReply,
-  MutateRequest,
-  RestoreDestination,
-} from '../Nexus/mutateRequest'
+import type { MutateOutcome, MutateReply, RestoreDestination } from '../Nexus/mutateRequest'
 …
-import type { MutateContext } from '../Nexus/mutate'
@@ restoreOp @@
-export async function restoreOp(
-  { root }: MutateContext,
-  req: Extract<MutateRequest, { op: 'restore' }>,
-): Promise<MutateReply> {
-  const resolved = await resolveUnderRoot(root, req.bundlePath)
-  if (!resolved.ok) return resolved
-  return restoreArtifact(root, resolved.value, req.destination)
-}
-
-async function restoreArtifact(
+export async function restoreArtifact(
   root: string,
   bundleAbs: string,
   destination?: RestoreDestination,
 ): Promise<Result<Restored>> {
 …
   const { store, record: stored } = opened.value
-  if (store.kind !== 'trash') return fault('Only a trash record can be spent.')
   if (stored.entity === 'property') {
@@ restoreArtifact — the placement (Phase 3-3) @@
-  const placed = await placeRecord(root, stored, destination, basename(artifactAbs), tree, roots)
+  const placed = await placeRecord(
+    root,
+    stored,
+    destination,
+    basename(artifactAbs),
+    tree,
+    roots,
+    relative(root, bundleAbs),
+  )
```

**VERIFY**

- [ ] The listed `archive.test.ts`, `spend.test.ts`, `placement.test.ts`, and `mutateRequest.test.ts` cases pass; `rows.test.ts` passes with `bundleRowOf` handing each row's `bundlePath` on; `spend.test.ts`'s "a bundle path that escapes the Nexus refuses before anything opens" passes before and after, so the resolve's move into `mutate.ts` still refuses an escaping `bundlePath`.
- [ ] `git grep -n "restoreOp" -- Core` finds nothing; `git grep -n "op: 'archive'" -- Core` finds `Core/Archive/archive.ts`, `archive.test.ts`, and `mutateRequest.test.ts` alone, nothing renderer-side yet; `git grep -n "export const trailOf\|export function trailOf" -- Core` finds `Core/Nexus/treeIndex.ts` alone.
- [ ] `npm run test -- engineGraph hostGraph` passes: `Core/Archive/archive.ts` imports no React.
- [ ] Run the gates.
- [ ] Check for unnecessary code or mistakes.

**Lines:** +112 (+143 / −31). By file: `Core/Archive/archive.ts` +93, `mutate.ts` +16 / −3, `spend.ts` +12 / −21, `placement.ts` +9 / −3, `record.ts` +7 / −1, `rows.ts` +3 / −2, `mutateRequest.ts` +3 / −1.

#### Task 4-3

**TASK:** A delete of an Archive bundle goes to the Trash through `deleteOp`'s chain, under the chain it was archived from, its record keeping the bundle (`archive`); its Undo (`destination: { kind: 'archive' }`) runs the Trash's restore back into that bundle under the same name (E-3).

**NOW:** `deleteOp` (`Core/Trash/delete.ts:28-116`, as Phases 1 and 2 leave it) resolves through `mutableTarget` (`:32`), which refuses what the tree doesn't hold; its link targets come from the index rows at the pages' paths (`gatherLinkTargets`, `Core/Trash/gather.ts:31-59`). An archived Set's sub-Set ids live only in their sidecars. `req.kind` drives `contentPages`, `goneEdit`, `isContainer`, while a bundle's record names its own entity (Cautionary 12). `owner` (`spend.ts:187-192`) answers an archive path's Collection by its id. `mkdir` answers `'exists'` on a held path (`Desktop/Platform/nodeMachine.ts:69-70`; Cautionary 13). An outside bundle path passes `resolveUnderRoot` and `storeOf` (Cautionary 3; `spend.test.ts:1572`). Traps: `resolveUnderRoot`'s `realpath` (`Core/Paths/pathSafety.ts:14-37`) throws on the removed Archive bundle, so the Undo reads `record.archive` by `storeOf` over `join(root, rel)` (`join` collapses `..`); unused rest-sibling keys pass lint (`Core/Nexus/identity.ts:67`); the landing's `catch` (`spend.ts:221-227`) reverses a Context's entry, as `unmint` (`delete.ts:61-64`) removes a refused delete's bundle.

**CHANGE**

- [ ] Tests first, failing: `Core/Archive/archive.test.ts` › `describe('a delete from the Archive')`; `Beta` archived as in 4-2; Link property `Related` on `Linker.md` = `"[[Beta]]"`:
  - "goes to the Trash under the chain it was archived from, keeping the bundle it left": `delete { path: <archive bundlePath>, kind: 'page' }` → `bundled.bundlePath` = `.trash/Notes/Daily/<stamp>__Beta.md.deleted`, holding `Beta.md` and a record with `entity`, `id`, `parent`, `place`, `trail`, `archive: <archive bundlePath>`; Archive bundle gone.
  - "strips the Link values naming it, and records them": `Linker.md` loses `Related`; record `links` = `{ page: <Linker id>, property: <Related id>, value: '[[Beta]]' }`.
  - "an archived Set takes the views naming it and its sub-Sets": a `Notes` view filtering `_location is <Daily id>` and `is_inside <Daily/Sub id>` loses both when archived `Daily` is deleted.
  - "refuses a kind its record doesn’t carry": `kind: 'set'` → `That item can’t be changed.`; bundle stands.
  - "under the system Trash Mode, it leaves for the system trash with its metadata": `trashToSystem` gets the artifact's path; no `.trash` bundle; Archive bundle gone; no `bundled`; `Beta`'s metadata entry dropped.
  - "its Undo returns it to the Archive under the same name, its Link values back": `restore { bundlePath: <trash bundlePath>, destination: { kind: 'archive' } }` → `Beta.md` in a bundle at exactly `<archive bundlePath>`, record `{ entity, id, parent, place, trail }` (no `archive`, `links`, `targets`, `partial`); `Linker.md` reads `Related: "[[Beta]]"`; Trash bundle gone; no `Beta` in the tree; no `landedAs`.
  - "its Undo mints a fresh bundle in the same Archive once the name is taken": a folder pre-made at `<archive bundlePath>` → `Beta.md` in another `__Beta.md.archived` bundle beside it; the folder untouched.
  - "a failed Undo leaves no bundle behind, and its retry lands under the same name": `relocate` rejects once (`vi.spyOn` on `Core/Files/atomicWrite`) → failure reply, no Archive bundle, Trash bundle stands; the next Undo → `Beta.md` at exactly `<archive bundlePath>`.
  - "a plain restore from the Trash returns it to where it was archived from": `restore { bundlePath: <trash bundlePath> }` → `Notes/Daily/Beta.md` between `Alpha` and `Gamma`.
  - "emptying it from the Trash gives it up for good": `emptyBundle` of the Trash bundle leaves neither bundle.
- [ ] Tests beside, failing: `Core/Trash/deleteOrder.test.ts` › "the record is written before the destruction it describes" (`:154-220`) gains "a delete from the Archive records, with the bundle it left, before the artifact moves" (`atSettle` matches `{ entity: 'page', archive: <archive bundlePath>, partial: true }`). `spend.test.ts` › "restore — into a chosen destination" (`:1854`) gains "refuses the Archive as a destination for a record that left none, a Space’s among them" (`That kind cannot be given a destination.` for a page without `archive` and for a Space) and "refuses an Undo whose record names a path outside the Archive" (`archive` hand-set to `../Notes/Beta.md.archived` → `That kind cannot be given a destination.`; nothing moves). `mutateRequest.test.ts` parses `destination: { kind: 'archive' }`, dropping an `id` beside it.
- [ ] `Core/Bundles/record.ts`: `archive` on the content record; the decode-rule comment (from `Core/Trash/record.ts:46`), as AFTER.
- [ ] `Core/Bundles/bundle.ts`: `mintBundle` takes an optional `leaf`, tried first, falling back to a fresh stamp when held.
- [ ] `mutateRequest.ts`: `restoreDestination` becomes a union gaining `{ kind: 'archive' }`.
- [ ] `Core/Bundles/placement.ts`: `placeRecord`'s Archive arm, before `withDestination` (whose type now excludes the Archive): a page or Set naming one gets the placement `record.archive` names and the store as `into`, after the identity check, as AFTER; otherwise `NO_DESTINATION`. `parent`, `place`, `trail` stay as recorded.
- [ ] `Core/Archive/archive.ts`: `archivedSetIds(root, abs)`, the Set ids an archived folder holds, from their sidecars (also 4-4's).
- [ ] `delete.ts`: `fromArchive(root, req)` builds the second source; `deleteOp` reads it where sources differ (artifact, gone containers, a Set's `archivedSetIds`, chain source path, index paths and strip keys, record), then removes the emptied Archive bundle after the artifact leaves. Phase 1's lift and `dropDeparture` run unchanged, finding no excluded entry or tree node on an archive path.
- [ ] `spend.ts`: `restoreArtifact`'s Undo arm: `placeRecord` answers unstepped, with `into`; the scrub runs unchanged against the Archive's Collection; mint the target in `into` under `record.archive`'s name, content record ahead, at the head of the landing's `try`, its `catch` removing it so a retry takes the same name (E-3); no step-aside, order write, or `landedAs`; the relink finds nothing; the refill uses the world holding the returning pages; the Trash bundle goes last.
- [ ] Sweep: `mintBundle`'s other callers (`archiveOp`, `deleteOp`, the property bundle) pass no `leaf`; `RestoreDestination` readers switch on `kind` (Archive arm, then `withDestination`; the renderer's `restoreTo:<id>` sends `{ kind: 'container', id }`).
**AFTER**

```Core/Bundles/record.ts diff
@@ contentRecord @@
     trail: z.array(z.string()).optional(),
+    /** A Trash record's only: the Archive bundle a delete took the item out of, where its Undo returns it. */
+    archive: z.string().optional(),
@@ recordFile @@
-// The record itself is never rewritten from its decode; `def` and `registry` decode loose because a restore writes them back.
+// The record itself is never rewritten from its decode; `def` and `registry` decode loose because a restore writes them back. A page's or Set's record decodes whole, so a delete from the Archive and its Undo each write the other store's record from it.
```

```Core/Bundles/bundle.ts diff
@@ mintBundle (Phase 2-1) @@
+/** `leaf` asks for one bundle name back, which a fresh stamp answers once something holds it. */
 export async function mintBundle(
   root: string,
   store: BundleStore,
   absSource: string,
+  leaf?: string,
 ): Promise<string> {
   const dir = await chainDir(root, store, absSource)
+  if (leaf && (await machine().mkdir(join(dir, leaf))) === 'created') return join(dir, leaf)
   const stamp = fileStamp()
```

```Core/Nexus/mutateRequest.ts diff
@@ restoreDestination @@
-/** Checked against the write path's own destination rules: a contradicting claim is refused as malformed. */
-const restoreDestination = z.object({ kind: z.enum(['container', 'context']), id: z.string() })
+/** Checked against the write path's own destination rules: a contradicting claim is refused as malformed. `archive` is a delete from the Archive's Undo, returning the item to the bundle its record names. */
+const restoreDestination = z.discriminatedUnion('kind', [
+  z.object({ kind: z.enum(['container', 'context']), id: z.string() }),
+  z.object({ kind: z.literal('archive') }),
+])
```

```Core/Bundles/placement.ts diff
@@ imports (as 4-2 left them) @@
 import type { ArtifactRecord, Place } from './record'
+import { type BundleStore, storeOf } from './bundle'
@@ withDestination (Phase 2-4) @@
 function withDestination(
   record: ArtifactRecord,
-  destination: RestoreDestination,
+  destination: Exclude<RestoreDestination, { kind: 'archive' }>,
   tree: NexusTree,
 ): Result<ArtifactRecord> {
@@ placeRecord (4-2) @@
   restoring: string,
 ): Promise<
   Result<{
     record: ArtifactRecord
     placement: Placement
     writeOrder?: () => Promise<unknown>
     landedAs?: string
+    into?: BundleStore
   }>
 > {
+  if (destination?.kind === 'archive') {
+    if ((stored.entity !== 'page' && stored.entity !== 'set') || !stored.archive)
+      return fault(NO_DESTINATION)
+    // The bundle it names was removed, so no realpath answers for it; `join` collapses any `..` before the store's prefix test.
+    const into = storeOf(root, join(root, stored.archive))
+    if (into?.kind !== 'archive') return fault(NO_DESTINATION)
+    if (stored.id && heldElsewhere(byId.get(stored.id), restoring))
+      return fault(REFUSAL_TEXT['id-live'])
+    return ok({
+      record: stored,
+      placement: {
+        dir: stored.archive,
+        finalName: baseName,
+        ...(stored.entity === 'page' ? { finalTitle: titleFromPath(baseName) } : {}),
+      },
+      into,
+    })
+  }
   const rehomed = destination ? withDestination(stored, destination, tree) : ok(stored)
```

```Core/Archive/archive.ts diff
@@ imports (4-2) @@
+import { sidecarId } from '../Files/sidecar'
+import { sidecarsUnder } from '../Files/walk'
+import { readWatchScope } from '../Settings/settings'
@@ archivedSetIds @@
+
+/** The ids of the Sets an archived folder holds, read from their sidecars, so every saved view drops them once the folder leaves for good. */
+export async function archivedSetIds(root: string, abs: string): Promise<string[]> {
+  const sidecars = await sidecarsUnder(root, await readWatchScope(root), abs)
+  const ids = await Promise.all(sidecars.map((file) => sidecarId(dirname(file), 'set')))
+  return ids.flatMap((id) => id ?? [])
+}
```

```Core/Trash/delete.ts diff
@@ imports (as Phase 2 left them) @@
+import { resolveUnderRoot } from '../Paths/pathSafety'
+import { recordWrite } from '../Files/writeEcho'
+import { archivedSetIds } from '../Archive/archive'
-import { liveTreeOf, mutableTarget } from '../Nexus/liveTree'
+import { liveTreeOf, mutableTarget, NOT_HELD } from '../Nexus/liveTree'
-import { goneEdit, reachConfig, reachReport } from '../Nexus/configReach'
+import { goneContainers, goneEdit, reachConfig, reachReport } from '../Nexus/configReach'
-import { contentPages, mintBundle, pageIdsOf } from '../Bundles/bundle'
+import {
+  bundleArtifact,
+  contentPages,
+  mintBundle,
+  originPathOf,
+  pageIdsOf,
+  storeOf,
+} from '../Bundles/bundle'
-import { gatherContentRecord, type RecordFile, writeRecord } from '../Bundles/record'
+import { gatherContentRecord, type RecordFile, readRecord, writeRecord } from '../Bundles/record'
@@ fromArchive @@
+/** A delete naming an Archive bundle takes the item inside it to the Trash under the chain it was archived from, so a Trash restore returns it there, and its record keeps the bundle it left for the Undo. Its pages' index rows sit at their Archive paths, while Link values name them where they lived. */
+async function fromArchive(root: string, req: Extract<MutateRequest, { op: 'delete' }>) {
+  const bundle = await resolveUnderRoot(root, req.path)
+  const store = bundle.ok ? storeOf(root, bundle.value) : null
+  if (!bundle.ok || store?.kind !== 'archive') return null
+  const held = await readRecord(bundle.value)
+  const abs = await bundleArtifact(bundle.value)
+  if ((held?.entity !== 'page' && held?.entity !== 'set') || held.entity !== req.kind || !abs)
+    return NOT_HELD
+  const pages = await contentPages(held.entity, abs)
+  const sets = held.entity === 'set' ? await archivedSetIds(root, abs) : []
+  return ok({
+    bundle: bundle.value,
+    abs,
+    origin: join(root, originPathOf(root, store, abs)),
+    under: pages.map((file) => relative(root, file)),
+    keys: pages.map((file) => originPathOf(root, store, file)),
+    edit: sets.length ? goneContainers(sets) : null,
+    record: { ...held, archive: relative(root, bundle.value) },
+  })
+}
+
@@ deleteOp — the source @@
 export async function deleteOp(
   { root, deps }: MutateContext,
   req: Extract<MutateRequest, { op: 'delete' }>,
 ): Promise<MutateReply> {
-  const resolved = await mutableTarget(root, req.path, [req.kind])
+  const archived = await fromArchive(root, req)
+  if (archived && !archived.ok) return archived
+  const from = archived?.value
+  const resolved = from ? ok(from.abs) : await mutableTarget(root, req.path, [req.kind])
   if (!resolved.ok) return resolved
   const abs = resolved.value
   const rel = relative(root, abs)
   if (!(await pathExists(abs))) return fail('not-found', 'Nothing to delete.')
   const before = await liveTreeOf(root)
-  const edit = goneEdit(before, req.kind, req.path)
+  const edit = from ? from.edit : goneEdit(before, req.kind, req.path)
@@ deleteOp — the mint and the reach @@
-  const bundle =
-    deps.trashMode === 'system' ? null : await mintBundle(root, { kind: 'trash' }, abs)
+  const bundle =
+    deps.trashMode === 'system'
+      ? null
+      : await mintBundle(root, { kind: 'trash' }, from?.origin ?? abs)
 …
-  const under = pagesOf(before).flatMap((p) => (isAtOrUnder(p.path, rel) ? p.path : []))
+  const under =
+    from?.under ?? pagesOf(before).flatMap((p) => (isAtOrUnder(p.path, rel) ? p.path : []))
@@ deleteOp — the content arm @@
   } else {
-    record = write ? await gatherContentRecord(root, before, req.kind, abs) : null
+    record = write
+      ? (from?.record ?? (await gatherContentRecord(root, before, req.kind, abs)))
+      : null
     if (write && record) await write({ ...record, partial: true })
-    paths = under
+    paths = from?.keys ?? under
   }
   if (bundle) await relocate(abs, join(bundle, basename(abs)))
   else await machine().lock(abs, () => discardFile(root, abs, deps))
+  if (from) {
+    recordWrite(from.bundle)
+    await machine().remove(from.bundle)
+  }
   await dropDeparture(root, before, req.kind, req.path)
```

```Core/Trash/spend.ts diff
@@ imports (as 4-2 left them) @@
 import {
   bundleArtifact,
   contentPages,
+  mintBundle,
   openBundle,
   originPagesOf,
   originPathOf,
   pageIdsOf,
 } from '../Bundles/bundle'
+import { writeRecord } from '../Bundles/record'
@@ restoreArtifact — the landing place (Phase 2-5) @@
-  const { record, placement, writeOrder, landedAs } = placed.value
+  const { record, placement, writeOrder, landedAs, into } = placed.value
   const { dir, finalName, finalTitle } = placement
-  const targetAbs = join(root, dir, finalName)
+  let targetAbs = join(root, dir, finalName)
@@ restoreArtifact — the landing (Phase 1-2) @@
+  let minted: string | undefined
   try {
+    // The Undo of a delete from the Archive lands in a bundle minted under the name its record keeps, reconciled as any Trash restore, and nothing lands in the tree.
+    if (into) {
+      const origin = join(root, originPathOf(root, store, artifactAbs))
+      minted = await mintBundle(root, into, origin, basename(dir))
+      targetAbs = join(minted, finalName)
+      if (record.entity === 'page' || record.entity === 'set') {
+        const { archive, links, targets, partial, ...filed } = record
+        await writeRecord(minted, filed)
+      }
+    }
     await machine().mkdir(dirname(targetAbs))
     await relocate(artifactAbs, targetAbs)
   } catch (e) {
-    // The move is the irreversible half; the entry is the reversible one. Reversing it keeps the failure retryable — a ghost entry would trip the next attempt's own id-live guard.
+    // The move is the irreversible half; a Context's entry and a minted bundle are the reversible ones. Reversing them keeps the failure retryable: a ghost entry would trip the next attempt's own id-live guard, and a ghost bundle would take the name the retry asks for.
+    if (minted) {
+      recordWrite(minted)
+      await machine().remove(minted)
+    }
     if (record.entity === 'context')
@@ restoreArtifact — the Link refill's world (Phase 3-3) @@
+    // Back in the Archive the page sits in no settled tree, so only the world from before the landing holds it.
     const refilled = frozenWorld(
-      settled ? buildPageIndex([...pagesOf(settled), ...archived]) : world,
+      settled && !into ? buildPageIndex([...pagesOf(settled), ...archived]) : world,
     )
```

**VERIFY**

- [ ] The listed `archive.test.ts`, `deleteOrder.test.ts`, `spend.test.ts`, and `mutateRequest.test.ts` cases pass; `deleteReach.test.ts` "leaves an ID-less linker the tree doesn’t hold unstamped and byte-identical" (`:113`) and "leaves two linkers sharing one ID as they were…" (`:125`) pass unchanged.
- [ ] `git grep -n "mutableTarget" -- Core/Trash/delete.ts` finds the one live-source call; `git grep -n "moveIntoStore" -- Core` finds nothing yet (it lands with its first consumer in 4-5); `git grep -n "resolveUnderRoot" -- Core/Trash/spend.ts Core/Bundles/placement.ts` finds nothing (the Undo's Archive is read by `storeOf` alone); `git grep -n "sidecarsUnder" -- Core/Trash` finds nothing (`archivedSetIds` reads an archived folder's Sets).
- [ ] Run the gates.
- [ ] Check for unnecessary code or mistakes.

**Lines:** +93 (+109 / −16). By file: `delete.ts` +54 / −11, `spend.ts` +19 / −3, `archive.ts` +9, `placement.ts` +20 / −1, `mutateRequest.ts` +4 / −1, `bundle.ts` +2, `record.ts` +1.

#### Task 4-4

**TASK:** A Collection's Archive leaves with the Collection for good, from the Trash's empty or a system-trash delete: links stripped, metadata dropped, its Sets out of every saved view (F-4).

**NOW:** `emptyBundle` (`Core/Trash/spend.ts:67-103`) repeats three disposal lines for the property bundle and the artifact. A trashed Collection's Archive stays at `.nexus/archive/<id>/`, the id from its record (any string; Cautionary 3). Traps: `recordWrite` then `remove` or `trashToSystem` raises no own event (`Core/Files/writeEcho.ts:22-33`), so the Archive's index rows (Phase 3) stand unless the unlink is noted (`noteOwn`, `:59`), as `discardFile` does (`delete.ts:100`; `Core/Trash/discard.ts`), deindexing by prefix (`fileEvents.ts:279-283`; `indexSeed.ts:166-173`); `holdings.ts:69-82`'s pages carry the bundle as their id, so metadata ids come from the files (`pageIdsOf`, `:64-67`).

**CHANGE**

- [ ] Tests first, failing: `Core/Trash/spend.test.ts` › `describe('emptyBundle — giving a bundle up for good')` (`:1670`): "a Collection emptied for good empties its Archive, its pages’ links stripped and their metadata dropped", both modes (`permanentDelete` removes; the system arm gets `.nexus/archive/<id>`); "a Collection emptied for good takes the saved views naming the Sets in its Archive" (another Collection's view on `_location is <archived Set id>` loses the value). `Core/Trash/deleteReach.test.ts`: "a Collection deleted to the system trash takes its Archive, its pages’ links stripped"; "a Collection deleted to the system trash takes the saved views naming the Sets in its Archive".
- [ ] `Core/Archive/archive.ts`: `collectionArchive(root, id)`, answering the Archive's pages and Sets (through `archivedSetIds`).
- [ ] `spend.ts`: `emptyBundle` disposes through one local `dispose` (the three lines plus `discardFile`'s unlink note), the Archive with it; its pages join the one metadata drop and strip; its Sets get `reachConfig(root, goneContainers(sets))`, the report joined to the strip's as in `deleteOp`.
- [ ] `delete.ts`: for a Collection, the system branch discards its Archive and folds its pages into the drop and strip and its Sets into the one gone edit: `edit` moves beside the Archive's read, `goneEdit(before, req.kind, req.path, archive?.sets)`. `configReach.ts`: `goneEdit` takes `archived` beside the tree's Sets (one configuration pass).
- [ ] Sweep: `git grep -n "deleteCascade(" -- Core` (signature unchanged); `Core/Trash/deleteOrder.test.ts`'s wrapper (`:56-63`) forwards `...args`, nothing new.
**AFTER**

```Core/Archive/archive.ts diff
@@ imports (4-2) @@
-import { relocate } from '../Files/atomicWrite'
+import { pathExists, relocate } from '../Files/atomicWrite'
-import { sidecarsUnder } from '../Files/walk'
+import { listMarkdownFiles, sidecarsUnder } from '../Files/walk'
+import { archiveDirRel } from '../Paths/nexusPaths'
 import {
   type BundleStore,
   bundleArtifact,
   contentPages,
   mintBundle,
   originPagesOf,
+  originPathOf,
 } from '../Bundles/bundle'
@@ collectionArchive @@
+/** A Collection's Archive, its pages at the paths they lived, and its Sets, which leave with the Collection once it leaves for good; null when it has none. The id names a folder, and a sidecar can carry any string. */
+export async function collectionArchive(
+  root: string,
+  id: string | undefined,
+): Promise<{ abs: string; files: string[]; origins: string[]; sets: string[] } | null> {
+  if (!isUlidShaped(id)) return null
+  const abs = join(root, archiveDirRel(id))
+  if (!(await pathExists(abs))) return null
+  const files = await listMarkdownFiles(abs)
+  return {
+    abs,
+    files,
+    origins: files.map((f) => originPathOf(root, { kind: 'archive', id }, f)),
+    sets: await archivedSetIds(root, abs),
+  }
+}
```

```Core/Trash/spend.ts diff
@@ imports @@
-import { recordWrite } from '../Files/writeEcho'
+import { noteOwn, recordWrite } from '../Files/writeEcho'
+import { goneContainers, reachConfig, reachReport } from '../Nexus/configReach'
+import { collectionArchive } from '../Archive/archive'
@@ emptyBundle @@
   const { store, record } = opened.value
   if (store.kind !== 'trash') return fault('Only a trash record can be emptied.')
+  const dispose = async (abs: string): Promise<void> => {
+    recordWrite(abs)
+    if (deps.permanentDelete === true) await machine().remove(abs)
+    else await deps.trashToSystem(abs)
+    await noteOwn({ event: 'unlink', absPath: abs, origin: 'own' })
+  }
   if (record.entity === 'property') {
-    recordWrite(bundleAbs)
-    if (deps.permanentDelete === true) await machine().remove(bundleAbs)
-    else await deps.trashToSystem(bundleAbs)
+    await dispose(bundleAbs)
     return ok({})
   }
   const artifactAbs = await bundleArtifact(bundleAbs)
   if (!artifactAbs)
     return fail('not-found', "That deletion didn't finish, or something else is in with it.")
+  const archive = record.entity === 'collection' ? await collectionArchive(root, record.id) : null
   const pages = await contentPages(record.entity, artifactAbs)
-  const pageIds = await pageIdsOf(pages)
-  recordWrite(artifactAbs)
-  if (deps.permanentDelete === true) await machine().remove(artifactAbs)
-  else await deps.trashToSystem(artifactAbs)
+  const pageIds = await pageIdsOf([...pages, ...(archive?.files ?? [])])
+  await dispose(artifactAbs)
+  if (archive) await dispose(archive.abs)
   await dropPageMetadata(root, pageIds)
   if (record.entity === 'context') await dropContextOrder(root, record.registry.id)
-  // Permanent now: a Link value naming one of its pages, recorded by the delete or taken up since, names nothing any more unless another trashed page answers its key.
-  const gone = pages.length
-    ? await deleteCascade(
-        root,
-        artifactAbs,
-        pages.map((file) => originPathOf(root, store, file)),
-      )
-    : null
+  // Permanent now, a Collection's Archive with it: a Link value naming one of their pages, recorded by the delete or taken up since, names nothing any more unless another trashed page answers its key.
+  const paths = [
+    ...pages.map((file) => originPathOf(root, store, file)),
+    ...(archive?.origins ?? []),
+  ]
+  const gone = paths.length ? await deleteCascade(root, artifactAbs, paths) : null
+  const reach = archive?.sets.length
+    ? reachReport(await reachConfig(root, goneContainers(archive.sets)))
+    : null
 …
-  return ok(gone ? { cascade: gone.cascade } : {})
+  const cascade = gone && reach ? joinCascades(gone.cascade, reach) : (gone?.cascade ?? reach)
+  return ok(cascade ? { cascade } : {})
```

```Core/Trash/delete.ts diff
@@ imports @@
-import { archivedSetIds } from '../Archive/archive'
+import { archivedSetIds, collectionArchive } from '../Archive/archive'
+import { containerAt } from '../Nexus/treePatch'
@@ deleteOp — the gone edit moves beside the Archive's read @@
   const before = await liveTreeOf(root)
-  const edit = from ? from.edit : goneEdit(before, req.kind, req.path)
@@ deleteOp — the system branch's reach @@
   const bundle =
     deps.trashMode === 'system'
       ? null
       : await mintBundle(root, { kind: 'trash' }, from?.origin ?? abs)
+  const archive =
+    !bundle && req.kind === 'collection'
+      ? await collectionArchive(root, containerAt(before, req.path)?.id)
+      : null
+  const edit = from ? from.edit : goneEdit(before, req.kind, req.path, archive?.sets)
   // With no bundle to keep them, the pages' metadata entries leave with the delete, by the ids their files carry before the move.
-  const pageIds = bundle ? [] : await pageIdsOf(await contentPages(req.kind, abs))
+  const pageIds = bundle
+    ? []
+    : await pageIdsOf([...(await contentPages(req.kind, abs)), ...(archive?.files ?? [])])
@@ deleteOp — the discard and the strip @@
   if (bundle) await relocate(abs, join(bundle, basename(abs)))
   else await machine().lock(abs, () => discardFile(root, abs, deps))
+  if (archive) await machine().lock(archive.abs, () => discardFile(root, archive.abs, deps))
 …
-  const gone = paths ? await deleteCascade(root, abs, paths) : null
+  const gone = paths
+    ? await deleteCascade(root, abs, [...paths, ...(archive?.origins ?? [])])
+    : null
```

```Core/Nexus/configReach.ts diff
@@ goneEdit (4-1) @@
-export function goneEdit(tree: NexusTree, kind: HeldKind, rel: string): ConfigEdit | null {
+export function goneEdit(
+  tree: NexusTree,
+  kind: HeldKind,
+  rel: string,
+  archived: string[] = [],
+): ConfigEdit | null {
@@ goneEdit — the container arm (4-1) @@
-      return node ? goneContainers(within(node).map((n) => n.id)) : null
+      return node ? goneContainers([...within(node).map((n) => n.id), ...archived]) : null
```

**VERIFY**

- [ ] The listed `spend.test.ts` and `deleteReach.test.ts` cases pass.
- [ ] `git grep -n "trashToSystem(" -- Core/Trash/spend.ts` finds the one call inside `dispose`.
- [ ] `npm run test -- engineGraph hostGraph` passes.
- [ ] Run the gates.
- [ ] Check for unnecessary code or mistakes.

**Lines:** +40 (+64 / −24). By file: `spend.ts` +24 / −16, `archive.ts` +19 / −2, `delete.ts` +14 / −4, `configReach.ts` +7 / −2.

#### Task 4-5

**TASK:** Add `Core/Archive/refile.ts`'s carry `refileArchived` (F-6) over one `moveIntoStore`, triggered by `refileMoved` (the settle) and `refileLanded` (a Set's restore from either store); `changesStores` gains `moveSet`, a container `rename`, and `renameContext`.

**NOW:** Task 4-4 has landed. `deltaOf` sets gains and drops losses (`treeDelta.ts:30-38`), nodes keyed by path, and a container always carries `sets` (`Core/Nexus/containerFields.ts:58`), so a moved Set appears as `{ set: node }` under its new parent; a first tree has no departures. Only `relocate` raises `move` (`Core/Files/atomicWrite.ts:72`): Finder moves arrive through the walk; restores use plain `relocate`. Trap: a throw inside the settle rejects its turn (`Core/Platform/inTurns.ts:3-8`), read as nothing settled (`settle.ts:309`), losing later pushes and the owed rescope (`:177`). `rename`'s kind is `page`, `collection`, or `set` (`mutateRequest.ts:65-70`); `renameContext` retitles a Context, which a Trash Space row's crumb reads (HEAD `Core/Trash/trashRows.ts:32-37`).

**CHANGE**

- [ ] Tests first, failing: `Core/Archive/refile.test.ts` (new, `settledMutate`, one `settleNow` before the move under test):
  - The comparison: "a Set moved into another Collection carries what was archived from within it" (`moveSet Notes/Daily/Sub → Other`: a page archived out of `Sub` sits in `<Other id>`'s Archive, same leaf, trail `[<Other id>]`); "a Set moved within its Collection rewrites the trails alone" (bundle stays; trail reads the new parent); "a record whose origin was itself archived is placed by the trail it stored" (page archived out of `Sub/Deep`, `Deep` archived, `Sub` moved: both carried); "a Set moved in Finder is carried once the settle sees it" (disk `rename`, then `settleBatch(QUIET, root, events)`); "a rename moves nothing and reads no Archive" (no `listBundles` call across `rename Notes/Daily → Notes/Days`).
  - The restore: "a Set restored from the Trash into another Collection carries what was archived from within it before it left"; "a Set that sat directly in its Collection, restored from the Trash to a destination in another Collection, carries what was archived from within it" (record `trail` `[]`; its Collection is the stored `parent`); "an archived Set restored to a destination in another Collection does the same"; "a carry that throws leaves a restored Set restored, from either store" (`listBundles` rejects for the Archive store: each restore replies ok, the Set lands, its bundle is gone, the error is logged).
- [ ] Tests beside, failing: `Core/Nexus/settle.test.ts`: "a carry that throws leaves the settle whole" (`refileMoved` rejects across a `moveSet` of a Set holding a page: `pages:changed` still pushes; error logged). `Core/Nexus/mutateRequest.test.ts` `changesStores`: true for `moveSet`, Collection or Set `rename`, `renameContext`; false for page `rename`.
- [ ] `Core/Bundles/bundle.ts`: `moveIntoStore(root, fromBundle, to, extra, leaf?)`, as AFTER.
- [ ] `Core/Archive/refile.ts` (new): `refileArchived`, `refileMoved`, `refileLanded` over private `originOf` and `refile`, as AFTER.
- [ ] `Core/Archive/archive.ts`: `restoreArchived` calls `refileLanded` with its store's id after its settled index, caught and logged.
- [ ] `spend.ts`: `restoreArtifact` calls `refileLanded` for a Set with the Collection from the stored record (`withDestination` rewrote the landed `parent`), after the refill and bundle removal, before the reply, caught and logged.
- [ ] `settle.ts:166-177`: keep the handed tree; await `refileMoved` after the pushes, before the `return`, caught and logged (Cautionary 8).
- [ ] `mutateRequest.ts`: `changesStores` gains `moveSet`, non-page `rename`, `renameContext` (Take Along: a Context's new title re-spells a Trash Space row's crumb), with a doc saying why.
- [ ] Sweep: `Core/Testing/settledMutate.ts` needs nothing (the observer runs inside `settleNow`).
**AFTER**

```Core/Bundles/bundle.ts diff
@@ imports (as Phase 2-1 left them) @@
+import { readJsonObject, relocate, writeJson } from '../Files/atomicWrite'
+import { recordWrite } from '../Files/writeEcho'
-import { type RecordFile, readRecord } from './record'
+import { RECORD_FILENAME, type RecordFile, readRecord } from './record'
@@ moveIntoStore @@
+/** Moves a bundle's artifact into `to`, under the chain it left from, with its raw record spread with `extra` written ahead, and removes the emptied bundle; `leaf` asks for that bundle name back. */
+export async function moveIntoStore(
+  root: string,
+  fromBundle: string,
+  to: BundleStore,
+  extra: Record<string, unknown>,
+  leaf?: string,
+): Promise<void> {
+  const from = storeOf(root, fromBundle)
+  const artifact = await bundleArtifact(fromBundle)
+  const raw = await readJsonObject(join(fromBundle, RECORD_FILENAME))
+  if (!from || !artifact || !raw) return
+  const bundle = await mintBundle(root, to, join(root, originPathOf(root, from, artifact)), leaf)
+  await writeJson(join(bundle, RECORD_FILENAME), { ...raw, ...extra })
+  await relocate(artifact, join(bundle, basename(artifact)))
+  recordWrite(fromBundle)
+  await machine().remove(fromBundle)
+}
```

```Core/Archive/refile.ts diff
+// Every archived record stays filed in the Archive of the Collection its origin sits in now, its trail current. One carry, `refileArchived`, serves each landing that moves a Set: the settle's comparison of trees and a restore.
+
+import { basename, join, relDirname } from '../Paths/posix'
+import { isPlainObject } from '../Contract/validators'
+import { rmwJsonStrict } from '../Files/atomicWrite'
+import { sameItems } from '@pommora/uix/Utilities/same'
+import { liveTreeOf } from '../Nexus/liveTree'
+import type { CollectionNode, NexusTree, SetNode } from '../Nexus/tree'
+import type { Delta } from '../Nexus/treeDelta'
+import { findContainerById, owningCollection } from '../Nexus/treePatch'
+import { listBundles, moveIntoStore } from '../Bundles/bundle'
+import { RECORD_FILENAME, type RecordFile, trailAbove } from '../Bundles/record'
+
+/** The container an archived page or Set left, and the ids it stored above it. */
+const originOf = (record: RecordFile): { parent: string; trail: string[] } | null =>
+  (record.entity === 'page' || record.entity === 'set') && record.parent.kind === 'container'
+    ? { parent: record.parent.id, trail: record.trail ?? [] }
+    : null
+
+/** Writes `trail` onto an archived record, moving its bundle into `to`'s Archive when its origin now sits in another Collection; the bundle keeps its name, since its stamp is the archived time. */
+async function refile(
+  root: string,
+  bundlePath: string,
+  stored: string[],
+  trail: string[],
+  from: string,
+  to: string,
+): Promise<void> {
+  const bundle = join(root, bundlePath)
+  if (from !== to)
+    await moveIntoStore(root, bundle, { kind: 'archive', id: to }, { trail }, basename(bundle))
+  else if (!sameItems(stored, trail))
+    await rmwJsonStrict(join(bundle, RECORD_FILENAME), (raw) => ({ ...raw, trail }))
+}
+
+/** Each record in `from`'s Archive whose origin lies within the Set `setId` takes the trail the Set gives it now, and `to`'s Archive when the Set now sits in another Collection. An origin the tree holds is placed by its current trail, and one it no longer holds by the ids its record stored. */
+export async function refileArchived(
+  root: string,
+  setId: string,
+  from: string,
+  to: string,
+  tree: NexusTree,
+): Promise<void> {
+  const above = trailAbove(tree, setId)
+  if (!above) return
+  for (const { bundlePath, record } of await listBundles(root, { kind: 'archive', id: from })) {
+    const origin = originOf(record)
+    if (!origin) continue
+    const held = trailAbove(tree, origin.parent)
+    const at = (held ?? origin.trail).indexOf(setId)
+    if (origin.parent !== setId && at === -1) continue
+    const trail = held ?? [...above, setId, ...origin.trail.slice(at + 1)]
+    await refile(root, bundlePath, origin.trail, trail, from, to)
+  }
+}
+
+/** The restores' trigger: a Set landed in `dir` carries what was archived from within it out of `from`, the Archive of the Collection it left. */
+export async function refileLanded(
+  root: string,
+  record: RecordFile,
+  from: string,
+  dir: string,
+): Promise<void> {
+  if (record.entity !== 'set' || !record.id) return
+  const tree = await liveTreeOf(root)
+  const to = owningCollection(tree, dir)?.id
+  if (to) await refileArchived(root, record.id, from, to, tree)
+}
+
+const isContainerNode = (v: unknown): v is CollectionNode | SetNode =>
+  isPlainObject(v) && (v.kind === 'collection' || v.kind === 'set')
+
+/** The comparison's trigger: a Set the difference sets in place, which `prev` held under another parent, moved, and carries what was archived from within it; a container `prev` never held arrived, and its own Sets are read the same way. A Collection is left alone, since what it holds moves inside it and trails name ids. */
+export async function refileMoved(
+  root: string,
+  prev: NexusTree,
+  next: NexusTree,
+  delta: Delta,
+): Promise<void> {
+  const landed = async (node: CollectionNode | SetNode): Promise<void> => {
+    const was = findContainerById(prev, node.id)
+    if (!was) for (const set of node.sets ?? []) await landed(set)
+    else if (node.kind === 'set' && relDirname(was.path) !== relDirname(node.path)) {
+      const from = owningCollection(prev, was)
+      const to = owningCollection(next, node)
+      if (from && to) await refileArchived(root, node.id, from.id, to.id, next)
+    }
+  }
+  const walk = async (d: Delta): Promise<void> => {
+    if ('set' in d) for (const v of [d.set].flat()) if (isContainerNode(v)) await landed(v)
+    if ('at' in d) for (const sub of Object.values(d.at)) await walk(sub)
+  }
+  await walk(delta)
+}
```

```Core/Archive/archive.ts diff
@@ imports (4-4) @@
-import { fail, ok } from '../Contract/result'
+import { errText, fail, ok } from '../Contract/result'
+import { refileLanded } from './refile'
@@ restoreArchived — the restore trigger @@
       : undefined
+  await refileLanded(root, record, store.id, dir).catch((e) =>
+    console.error('archive: the carry failed:', errText(e)),
+  )
   return ok({
```

```Core/Trash/spend.ts diff
@@ imports (4-4) @@
-import { fail, ok, type Result, fault } from '../Contract/result'
+import { errText, fail, ok, type Result, fault } from '../Contract/result'
+import { refileLanded } from '../Archive/refile'
@@ restoreArtifact — the restore trigger, once the bundle is removed @@
   if (!unspent.length) {
     recordWrite(bundleAbs)
     await machine().remove(bundleAbs)
   }
+  if (stored.entity === 'set' && stored.parent.kind === 'container')
+    await refileLanded(root, record, stored.trail?.[0] ?? stored.parent.id, dir).catch((e) =>
+      console.error('archive: the carry failed:', errText(e)),
+    )
   return ok({
```

```Core/Nexus/settle.ts diff
@@ imports @@
+import { refileMoved } from '../Archive/refile'
@@ settle — the comparison @@
   const held = heldTreeOf(root)
   const tree = held && shown(held, stamp)
-  const delta = tree && deltaOf(pushed?.nexus.rootPath === root ? pushed : undefined, tree)
+  const handed = pushed?.nexus.rootPath === root ? pushed : undefined
+  const delta = tree && deltaOf(handed, tree)
   if (tree) pushed = tree
   if (delta) pusher.push('nexus:changed', { version: ++version, delta })
 …
   if (assets && map) pusher.push('assets:changed', map)
+  // A Set the window saw move carries what was archived from within it; its writes raise only events the tree ignores, and one that throws costs the settle nothing it pushed or owes. A first tree has no baseline, which the open pass covers.
+  if (handed && tree && delta)
+    await refileMoved(root, handed, tree, delta).catch((e) =>
+      console.error('archive: the carry failed:', errText(e)),
+    )
   return corpus || rescope ? { rescope } : null
```

```Core/Nexus/mutateRequest.ts diff
@@ changesStores (4-2) @@
+/** A moved Set carries what was archived from within it, and a container's or Context's new name, or a Set's new place, re-spells the rows' crumbs, so each re-lists an open browser too. */
 export const changesStores = (req: MutateRequest): boolean =>
-  req.op === 'delete' || req.op === 'archive' || req.op === 'restore' || req.op === 'emptyBundle'
+  req.op === 'delete' ||
+  req.op === 'archive' ||
+  req.op === 'restore' ||
+  req.op === 'emptyBundle' ||
+  req.op === 'moveSet' ||
+  req.op === 'renameContext' ||
+  (req.op === 'rename' && req.kind !== 'page')
```

**VERIFY**

- [ ] The listed `refile.test.ts`, `settle.test.ts`, and `mutateRequest.test.ts` cases pass.
- [ ] `git grep -n "moveIntoStore" -- Core` finds `Core/Bundles/bundle.ts` and `Core/Archive/refile.ts` alone (tests apart); `git grep -n "refileArchived" -- Core ':!*.test.ts'` finds `refile.ts` alone, and `git grep -n "refileLanded" -- Core ':!*.test.ts'` finds `refile.ts`, `archive.ts`, and `spend.ts`; `git grep -n "refileMoved" -- Core ':!*.test.ts'` finds `refile.ts` and `settle.ts`.
- [ ] `npm run test -- engineGraph hostGraph` passes.
- [ ] Run the gates.
- [ ] Check for unnecessary code or mistakes.

**Lines:** +128 (+133 / −5). By file: `Core/Archive/refile.ts` +88, `bundle.ts` +20 / −1, `spend.ts` +6 / −1, `archive.ts` +5 / −1, `mutateRequest.ts` +7 / −1, `settle.ts` +7 / −1.

#### Task 4-6

**TASK:** Add the open pass `settleArchives`, once per open before the index seed: an Orphaned Archive moves into `.trash` (F-5); a live Collection's Archive re-files records whose origin the tree holds. Drive group 4 proves the phase on `~/Test`.

**NOW:** Tasks 4-4 and 4-5 have landed (`refile.ts`'s private `refile` and `originOf`). The open stamps sidecars and seeds the tree (`Core/Nexus/handlers.ts:88-100`), then the index (`:104`). An `unreadable` `'collection'` entry is always a root folder (only `readRootFolder` calls `readContainer('collection', …)`, `readNexus.ts:194-205`); `Unreadable` has no id (`Core/Nexus/tree.ts:109-112`), and `oweRetry` is in-memory (`fileEvents.ts:146-150`). `Core/Settings/exclusionScan.ts:31-88` deletes an excluded Collection's sidecar, after which F-5 owns its Archive (F-1). `.claude/scripts/drive-harness.mjs` exports `launch`, `relaunch` (`:542`, callback while closed), `ask`, `must`, `restore`. `.claude/scripts/Archive Drive/live-drive.mjs` (groups 1–3) gates on `POMMORA_ARCHIVE_LANDED` over string-ordered `PHASES`; `ALL = ['1', '2', '3']`; string keys (`GROUPS.has('3')`; group 3 relaunches, so `cdp = await group3(cdp)`). `~/Test`'s Collection ids, ULID-shaped, read from the sidecars at run time: `01KSDZP10YXB1RRKCF5YKFTPZE` (A), `01KVGMT8BHXHWKFZWT4DPXSNZP` (B), `01KVGMT8BMA60K88K6KX40K514` (C, no pages).

**CHANGE**

- [ ] Tests first, failing: `Core/Archive/refile.test.ts`, same baseline, via `settleArchives(root, tree)`: "an Archive whose id names nothing anywhere moves into the Trash with each record whole" (`.nexus/archive/<fresh ULID>/Gone/<stamp>__Orphan.md.archived/` → `.trash/Gone/<new stamp>__Orphan.md.deleted/`, record byte-equal, no `archive`; `.nexus/archive/<fresh>` gone); "an Archive whose Collection sits in an excluded root folder is kept"; "an Archive whose Collection sits in the Trash is kept"; "no Archive is taken for orphaned while a root folder’s sidecar reads unreadable" (an unparsed root `_pagecollection.json` keeps a fresh id's Archive); "a bundle that won’t parse stays as evidence, and its folder with it"; "a record whose origin now sits in another Collection is carried there under its own name, its trail rewritten" (a Set moved on disk first); "a record whose origin the tree no longer holds stays".
- [ ] Tests beside, failing: `Core/Nexus/handlers.test.ts`: "an open sweeps an Orphaned Archive into the Trash before the index seeds"; "a failing open pass leaves the open whole" (`settleArchives` rejects: the index still seeds; error logged).
- [ ] `Core/Archive/refile.ts`: `settleArchives` over `refile` and `originOf`, plus the header's sentence, as AFTER.
- [ ] `Core/Nexus/handlers.ts`: `settleArchives(root, tree)` after `runOpenLedger`, inside the seed's `try` and `root !== priorRoot`, with its own `.catch` (Cautionary 8).
- [ ] Drive group 4: `.claude/scripts/Archive Drive/live-drive.mjs` gains `group4`, `MATRIX.md` its rows (*Drive Group 4*); `ALL` gains `'4'`; run line `if (GROUPS.has('4')) await group4()`: the group relaunches, so it drives the run's own `cdp`, as group 3 does, and a throw inside it leaves the run holding the live session.
**AFTER**

```Core/Archive/refile.ts diff
@@ header @@
~// Every archived record stays filed in the Archive of the Collection its origin sits in now, its trail current. One carry, `refileArchived`, serves each landing that moves a Set: the settle's comparison of trees and a restore.
+// The open pass is its third landing, and moves an Archive whose Collection exists nowhere into the Trash, recoverable.
@@ imports (4-5) @@
+import { ARCHIVE_DIR_REL, archiveDirRel } from '../Paths/nexusPaths'
+import { rootSegs } from '../Paths/exclusion'
+import { sidecarId } from '../Files/sidecar'
+import { listEntries, listFilesRecursive } from '../Files/walk'
+import { recordWrite } from '../Files/writeEcho'
+import { machine } from '../Platform/machine'
+import { readWatchScope } from '../Settings/settings'
@@ settleArchives, after refileMoved @@
+
+/** The open pass, once per open before the index seed: an Archive filed under a live Collection re-files each record whose origin the tree holds, which a Set moved while Pommora was closed leaves misfiled; one whose id names no live Collection, no root-level excluded folder's sidecar, and no Collection in the Trash is orphaned, and its bundles move into `.trash` with their records whole. A root folder whose sidecar reads unreadable could be any Collection, so while one does, that open takes no Archive for orphaned. */
+export async function settleArchives(root: string, tree: NexusTree): Promise<void> {
+  const unread = tree.unreadable?.some((u) => u.kind === 'collection') ?? false
+  let excluded: Set<string | undefined> | undefined
+  let trashed: Set<string | undefined> | undefined
+  for (const { name: id, kind } of await listEntries(join(root, ARCHIVE_DIR_REL))) {
+    if (kind !== 'dir') continue
+    if (tree.collections.some((c) => c.id === id)) {
+      for (const { bundlePath, record } of await listBundles(root, { kind: 'archive', id })) {
+        const origin = originOf(record)
+        const trail = origin && trailAbove(tree, origin.parent)
+        if (origin && trail)
+          await refile(root, bundlePath, origin.trail, trail, id, trail[0] ?? origin.parent)
+      }
+      continue
+    }
+    if (unread) continue
+    excluded ??= new Set(
+      await Promise.all(
+        (await readWatchScope(root)).excluded
+          .filter((entry) => rootSegs(entry).length === 1)
+          .map((entry) => sidecarId(join(root, entry), 'collection')),
+      ),
+    )
+    if (excluded.has(id)) continue
+    trashed ??= new Set(
+      (await listBundles(root, { kind: 'trash' })).map(({ record }) =>
+        record.entity === 'collection' ? record.id : undefined,
+      ),
+    )
+    if (trashed.has(id)) continue
+    for (const { bundlePath } of await listBundles(root, { kind: 'archive', id }))
+      await moveIntoStore(root, join(root, bundlePath), { kind: 'trash' }, {})
+    // A bundle that won't parse stays as evidence; the folder goes once nothing is left beneath it.
+    const archive = join(root, archiveDirRel(id))
+    if (!(await listFilesRecursive(archive)).length) {
+      recordWrite(archive)
+      await machine().remove(archive)
+    }
+  }
+}
```

```Core/Nexus/handlers.ts diff
@@ imports @@
+import { settleArchives } from '../Archive/refile'
@@ openNexusSequence @@
       seedLiveTree(tree)
       if (latchRecord) await runOpenLedger(root, tree)
+      await settleArchives(root, tree).catch((e) =>
+        console.error('archive: the open pass failed:', errText(e)),
+      )
     } catch (e) {
```

**Drive Group 4** (`group4()`, all phase 4; seeds through `ask(cdp, 'mutate', …)` on `~/Test`, ids from the Collections' sidecars; `restore()` resets `~/Test` after the run):

- [ ] `[g4 A-2] a page archives into its Collection’s Archive under the chain it left` — seed `createPage Drive Arc` in `Collection A/Set Alpha` with an explicit `order`: Set Alpha's `pages` ids from `nexus:state`'s tree, the new id right after `Page A`'s (as group 2's `createSetIn`; a create without `order` leaves the id out, `Core/Nexus/create.ts:50`), so its neighbours are `Page A` and the page following it at group start (`Active Context` on `~/Test`, whose `page_order` reads Editor Test, Page A, Active Context, Page B, Page C), both ids read then; body `[[Drive Live]]`, beside a `createPage Drive Live`. `mutate { op: 'archive', path: 'Collection A/Set Alpha/Drive Arc.md', kind: 'page' }` → `bundled.bundlePath` matching `.nexus/archive/<A id>/Collection A/Set Alpha/<stamp>__Drive Arc.md.archived`, holding `Drive Arc.md` and a `_record.json` with `entity: 'page'`, the page's id, `parent` = Set Alpha's id, `place` with that follower above and `Page A` below, `trail: [<A id>]`; `Collection A/Set Alpha/Drive Arc.md` gone; Set Alpha's `page_order` lacks the id.
- [ ] `[g4 D-2] the archived page leaves the tree and lists in its Archive` — no page with its id in `nexus:state`'s tree; `bundles:list({ kind: 'archive', id: <A id> })` → one row titled `Drive Arc`, crumbs `Collection A`, `Set Alpha`.
- [ ] `[g4 C-1] a rename reaches the archived file` — `mutate rename Collection A/Set Alpha/Drive Live.md → Drive Live Renamed` → archived `Drive Arc.md` reads `[[Drive Live Renamed]]`.
- [ ] `[g4 E-2] a restore returns it to its exact place by a plain move` — `mutate { op: 'restore', bundlePath }` → `Collection A/Set Alpha/Drive Arc.md` byte-equal, between `Page A` and that follower in `page_order` (group 2's `between`); bundle gone; no `unrestored` or `landedAs`.
- [ ] `[g4 E-3] a delete from the Archive goes to the Trash keeping the bundle it left` — archive again (bundle `A1`); `mutate { op: 'delete', path: A1, kind: 'page' }` → `bundled.bundlePath` matching `.trash/Collection A/Set Alpha/<stamp>__Drive Arc.md.deleted`, record `archive` = `A1`; `A1` gone.
- [ ] `[g4 E-3] its Undo returns it to the Archive under the same name` — `mutate { op: 'restore', bundlePath: <that Trash bundle>, destination: { kind: 'archive' } }` → `A1/Drive Arc.md` and `A1/_record.json` without `archive`, `links`, `targets`; Trash bundle gone; no `Drive Arc` in `nexus:state`.
- [ ] `[g4 E-3] a Trash restore returns it to where it was archived from` — delete `A1` again; a plain `restore` of the new Trash bundle → `Collection A/Set Alpha/Drive Arc.md`.
- [ ] `[g4 F-6] a Set moved to another Collection carries what was archived from within it` — seed Set `createContainer Drive Sub` in `Collection A/Set Alpha`, `createPage Drive Deep` in it; archive `Drive Deep` (bundle `D1`); `mutate { op: 'moveSet', path: 'Collection A/Set Alpha/Drive Sub', newParentPath: 'Collection B', order: <B's set_order with Drive Sub's id last> }` → `.nexus/archive/<B id>/Collection A/Set Alpha/Drive Sub/<D1's leaf>/Drive Deep.md` with `trail: [<B id>]`; `D1` gone.
- [ ] `[g4 F-6] a Set moved within its Collection rewrites the trail alone` — `moveSet Collection B/Drive Sub → Collection B/Set Alpha`: bundle stays, `trail` = `[<B id>, <B's Set Alpha id>]`.
- [ ] `[g4 F-5] an Archive whose Collection exists nowhere moves into the Trash at the next open` — `relaunch(cdp, closed)`, `closed` writing `.nexus/archive/<fresh ULID>/Drive Gone/2026-10-20T00-00-00-000Z__Drive Orphan.md.archived/` with `Drive Orphan.md` and record `{ entity: 'page', parent: { kind: 'container', id: <a second fresh ULID> } }`; after it, `.trash/Drive Gone/` holds one `__Drive Orphan.md.deleted` bundle with an equal record; `.nexus/archive/<fresh ULID>` gone.
- [ ] `[g4 F-4] a Collection in the Trash keeps its Archive, and emptying it empties both` — seed Collection `createContainer Drive Coll` (id from `containerId()`, so emptying destroys nothing `~/Test` holds), `createPage Drive Kept` in it, archive the page, `mutate { op: 'delete', path: 'Drive Coll', kind: 'collection' }`; after `relaunch`, `.nexus/archive/<Drive Coll id>/` stands; with `ask(cdp, 'personalization:set', 'permanentDelete', true)` first (no system trash touched), `mutate { op: 'emptyBundle', bundlePath: <Drive Coll's row from bundles:list({ kind: 'trash' })> }` leaves neither `.nexus/archive/<Drive Coll id>` nor the bundle.
- [ ] `[g4 —] the group leaves Collections A and B, their Archives, and the Trash as it found them` — in-group cleanup (as group 1 restores its settings), `permanentDelete` still on: delete `Drive Arc` and `Drive Live Renamed`, empty their Trash bundles (the departure drop clears Set Alpha's `page_order`); delete `D1` from B's Archive and empty it, then the Set `Collection B/Set Alpha/Drive Sub` likewise (its `set_order` entry leaving with it); empty the swept `Drive Orphan` bundle; reset `permanentDelete` to its pre-group value (`false` on `~/Test`); `rmSync` `.nexus/archive/<A id>` and `.nexus/archive/<B id>` (only the group's chain folders; groups 1–3 leave no Archive), and the Trash chain folders the group made (`Collection A/Set Alpha`, `Collection B/Set Alpha`, `Drive Gone`) only where empty, since earlier groups' bundles may share them. Assert against start-of-group values: Set Alpha's `page_order`; Collection B's and `Collection B/Set Alpha`'s `set_order`; `.nexus/state.json`'s `order.collections` (`Drive Coll`'s delete dropped its id through `dropDeparture`, and emptying leaves none); `bundles:list` lengths for the Trash and both Archives; `permanentDelete`.
- [ ] `MATRIX.md` gains group 4's rows with these names, decisions, and assertions; `node live-drive.mjs 1 2 3 4` passes under `POMMORA_ARCHIVE_LANDED=4`.
**VERIFY**

- [ ] The listed `refile.test.ts` and `handlers.test.ts` cases pass.
- [ ] `git grep -n "settleArchives\|refileMoved" -- Core ':!*.test.ts'` finds `refile.ts`, `handlers.ts`, and `settle.ts`.
- [ ] `npm run test -- engineGraph hostGraph` passes.
- [ ] Run the gates.
- [ ] Run drive groups 1–4.
- [ ] Check for unnecessary code or mistakes.

**Lines:** +51 (+51 / −0). By file: `Core/Archive/refile.ts` +47, `handlers.ts` +4. The drive group apart.

#### Review Checkpoint

- [ ] Two `opus-high` read-only reviewers, to `closeout-review`'s standards (its closing procedures, write guards, and output format exempt), each carrying the Approach, Principles, and Nathan's Constraints in full, read Phase 4's diff against this phase: the six tasks' AFTERs landed as written or with each departure disclosed; nothing temporary or unreachable left; every comment the phase touched reads true.
- [ ] The tests named in Tasks 4-1 to 4-6 pass, with `Core/Archive/archive.test.ts` and `Core/Archive/refile.test.ts` new; `spend.test.ts`, `placement.test.ts`, `rows.test.ts`, `deleteOrder.test.ts`, `deleteReach.test.ts`, `mutate.test.ts`, `mutateRequest.test.ts`, `settle.test.ts`, `configReach.test.ts`, and `handlers.test.ts` green.
- [ ] Run the gates: `npm run typecheck`, `npm run test`, `npm run lint`, clean.
- [ ] `npm run test -- engineGraph hostGraph` passes.
- [ ] The Archive Drive passes groups 1–4 under `POMMORA_ARCHIVE_LANDED=4`.
- [ ] Neutral Gate 1 (below), run once the reviewers' findings above are fixed, answers yes: each "no" routed back, its fix landed, and the gate ran again over the new head.

#### Neutral Gate 1

This plan's addition to its precedents (MetadataV3 and Path Links ran one neutral gate, at the end): a mid-point gate once the data layer is complete and both stores work, before any surface reads them.

- [ ] One `fable-high` agent, given only the BASELINE head, Phase 4's head, and this intention, with no plan, log, or document, and none of the Approach, Principles, or Constraints: *"Pommora removed a page or Set one way, into the Trash, where it left every cascade's reach and had to be reconciled on its way back; its excluded folders rode into the bundle, and a restore refused a landing anything outside the tree occupied. This work gives each Collection an Archive at `.nexus/archive/<id>/`, the one hidden folder every cascade and the content index reach into while the tree leaves it out, so an archived page stays current and returns by a plain move; it carries an excluded folder's entry crash-safely with its folder and lifts it out of a container being archived or trashed; it moves the Trash's bundle format, record, placement, and listing into one owner both stores share, gives every restore its exact former place and a step-aside past the disk, routes one restore by store, sends a delete from the Archive to the Trash with an Undo that returns it, sweeps an Archive whose Collection exists nowhere into the Trash at open, and carries archived items with a Set that changes Collection, with each rule stated once, built from what the architecture already had, and nothing left over."* It answers, without hedging, whether the data layer holds to every principle the intention states, and what it would correct.
- [ ] It runs after the Review Checkpoint's reviewers have reported and their findings are fixed. A "no" routes back to the orchestrator, who reads it against *§Constraints*: a correction the Approach and Principles agree with lands in Phase 4, one that changes the "what" goes to Nathan, and the gate runs again over the new head until it answers yes, which closes the checkpoint before Phase 5 opens. Each answer is recorded in place with a dated annotation, as Path Links recorded its gate.

#### Departures and Disclosures

##### Departures From the Findings

- **The Delete From the Archive Rides `deleteOp`'s Chain, Not `moveIntoStore` (2.6):** the Findings have the delete from the Archive and F-5 both call `moveIntoStore`. A store-to-store move has no system arm, while every delete follows Trash Mode (`delete.ts:46`: no bundle under `system`; `:99-100`: the discard), and a system-mode delete from the Archive posts no Undo. `fromArchive` feeds the one write-ahead chain instead: the record written partial ahead, the strip after the move, the final record with `links`, the configuration pass. `moveIntoStore`'s first consumers are then F-6's carry and F-5, so it lands with the carry in 4-5.
- **The Undo Lands Through `restoreArtifact`'s Own Landing, Read by `storeOf` Alone (2.6):** the Findings land it at `record.archive` through `storeOf` and `resolveUnderRoot`, whose `realpath` throws on the bundle `fromArchive` removed (`Desktop/Platform/nodeMachine.ts:75`), so every Undo would refuse. `placeRecord`'s Archive arm runs before `withDestination` and reads the store with `storeOf` over `join(root, record.archive)`, and `join` collapses `..` before `storeOf`'s prefix test, so a recorded path outside the store still refuses. The Undo mints with `mintBundle`'s optional `leaf` (which `moveIntoStore` forwards, so re-minting the exact name is no special case), writes the content record minus the Trash's fields and `partial`, relocates as any restore does, and removes the Trash bundle last; the folded chain writes `{ entity, id, parent, place, trail }`, which a raw spread of `extra` can't express. Its refill reads the pre-landing `world`, since a page back in the Archive sits in no tree index.
- **`deleteCascade` Keeps One `abs` (2.7):** the Findings have it take the roots that left, so the strip never selects a disposed Archive's files from index rows still standing. Those rows can't stand: disposing the Archive must deindex it anyway, or `nexusPages`' `byId` keeps ghosts (refill targets and `id-live` refusals for files that are gone), and `recordWrite` plus `remove` raises no event (`writeEcho.ts:22-33`). `emptyBundle`'s `dispose` notes the unlink as `discardFile` does, which deindexes the folder by prefix (`indexSeed.ts:166-173`) before the strip runs.
- **F-4 Reads the Archive's Files Once, Not Through `originPagesIn` (2.7):** that listing's ids are bundles (`holdings.ts:69-82`), so the metadata drop would miss every page. `collectionArchive` walks `.nexus/archive/<id>/` once (`listMarkdownFiles`, the rule `contentPages` applies to a Set's bundle) and answers the files, their origin paths, and the Archive's Sets.
- **F-4 Takes the Archive's Sets Out of Every Saved View (2.7):** every other way a Set leaves for good runs the gone edit (`goneEdit` at every delete; 4-3's `fromArchive`), while the Findings' disposal reads pages alone, which would leave saved views filtering by a Set that exists nowhere. `archivedSetIds` (4-3) reads an archived folder's Sets from their sidecars, `emptyBundle` runs `goneContainers` over them, and the system-mode Collection delete folds them into its one gone edit through `goneEdit`'s `archived`, so that delete still makes one configuration pass. A View Tile sourced from such a Set already answers `That view’s source is gone.` (`tilesFile.ts:78`).
- **The Comparison's Trigger Reads Arrivals Against the Handed Tree (3.4):** the Findings pair `deltaOf`'s `{ drop }` and `{ set }` entries by id. `refileMoved` reads only what the difference sets and asks `prev` for each container's id (`findContainerById`), which covers a Set arriving inside a container that is itself new and needs no drop bookkeeping; renames (same `relDirname`) and Collections (their Sets ride inside the value; trails name ids) carry nothing.
- **The Restore Trigger Runs on Every Set Restore (3.4):** the Findings name a Set restored into another Collection; a Set restored to another parent within its Collection stales the trails below it as a move does, so both restores call one `refileLanded(root, record, from, dir)` for any landed Set, which reads the landed tree itself and writes only what changed. `from` is the store's id for an archive record (the location winning, Cautionary 11) and the stored record's `trail[0] ?? parent.id` for a Trash record, read before `withDestination` rewrote `parent`, since a Set directly in its Collection stores `trail: []`. Under the Undo nothing lands in the tree, and `refileArchived` returns at once.
- **The Open Pass Also Keeps Trails Current (3.4):** besides carrying a misfiled record, its re-file arm writes the current trail of any record whose origin the tree holds, through the same `refile` step, so a Finder move inside one Collection while Pommora was closed leaves no stale trail. It reads the records Cautionary 9 already accepts reading.

##### Behavior Changes and Disclosures

- **A Failed Undo Stays Retryable (E-3):** the Undo mints its bundle and writes its record at the head of the landing's `try`, and the `catch` removes what it minted beside a Context's entry, as `deleteOp`'s `unmint` does, so a failure leaves no record-only bundle (which `listBundles` would skip and nothing would remove) and the retry takes the same name.
- **The Carry Never Takes the Settle Down:** `refileMoved` runs after the settle's pushes, just before its `return`, under its own `.catch`, Cautionary 8's shape extended from the open pass to the settle: a throw inside `settle` rejects its turn (`Core/Platform/inTurns.ts:3-8`), which `settleNow` reads as nothing settled (`settle.ts:309`), losing the remaining pushes and an owed rescope.
- **`changesStores` Admits `renameContext` (Take Along):** a Context's new title re-spells a Trash Space row's crumb (`liveCrumbs`' Space arm), a gap HEAD's `trashChanged` had.
- **The Trash's Store Guards (4-2):** `emptyBundle`'s refusal of an Archive bundle stands from Phase 2-1, where `openBundle` first opens either store (E-3: an archived item leaves for good only through the Trash); `restoreArtifact`'s twin guard leaves here, once `mutate.ts`'s routing hands it nothing but a Trash bundle or a path neither store holds, which `openBundle` refuses.
- **Both Restores' Carry Never Fails the Restore:** `refileLanded` runs after each restore has landed and removed its bundle, under its own `.catch`, the settle's shape, so a carry that throws is logged while the reply still reports the landed Set.
- **Import Order:** `settle.ts` gains an import of `Core/Archive/refile.ts`, as it already imports `Core/Tiles/tilesFile.ts` and `Core/Settings/codec.ts`. `refile.ts` imports nothing that reaches `settle.ts` (its graph is `Core/Bundles/`, `Core/Nexus/treePatch.ts`, `Core/Nexus/liveTree.ts`, `Core/Settings/settings.ts`, and `Core/Files/`): `settle.ts` already imports `./liveTree` (`:29`), and `liveTree.ts`'s own imports never reach `settle.ts`. `delete.ts` imports `Core/Archive/archive.ts` from 4-3, which reaches neither. `biome.json` carries no import-cycle rule and the graph tests check React reach alone, so the drive's launch is the module-load check.
- **F-5's Unreadable Open:** no Archive is swept as orphaned on an open where a root folder's sidecar reads unreadable, and no counter is kept, since `Unreadable` carries no id (`tree.ts:109-112`) and no retry record exists on disk (`oweRetry`, `fileEvents.ts:146-150`, is in-memory); the sweep waits for an open where every root folder reads.
- **Finder Litter:** `listFilesRecursive` counts a `.DS_Store`, so an emptied orphan `<id>/` holding only Finder's litter stays on disk and each open walks it again (Cautionary 7's shape); no guard is added.
- **A Collection Twin:** a Finder copy of a Collection folder carries its sidecar id, so two Collections can share one Archive, and emptying the trashed twin disposes the Archive the live one reads. `dropPageMetadata` spares tree-held ids for the same reason (`pageMetadata.ts:120`); Cautionary 4 accepts no guard for a duplicated id nothing in-app produces.
- **A Legacy Trash Record's `excluded`:** a Trash record written before this work names its excluded folders in `excluded`, which the record no longer carries; decoded, the field drops, so such a Collection or Set returns with those folders as plain content, their entries having been released at its delete. No content is lost, and nothing is kept for compatibility, as with the order a legacy record lacks (ruling 2).
- **A Set Emptied for Good:** the records archived from within a Set stay in its Collection's Archive when the Set is emptied from the Trash or deleted to the system Trash, and restore by a destination (E-5, F-1); the saved views naming their Sets stay, as they do for anything archived.
- **One Arrival, Twice:** both restores land and re-spell their arrival in one shape, but not through one function: the Trash's restore lands into a minted bundle on an Undo, rolls a Context's registry entry back on a failed move, repairs between the re-spell's two steps, and keeps its record until nothing is unspent, none of which the Archive's restore does.
- **The Archive's Collection Id:** an Archive path is built only from a Collection id that makes one safe folder name (`holdsName`), at the op, the carry, the re-file, and `archiveReach`; a directory's own name is one segment by construction.
- **Restore Corner Cases:** an Undo of a delete from the Archive whose Collection has gone for good since lands in an Archive no Collection owns, which the next open sweeps into the Trash; a live page and an archived page sharing an id, which only a copy made outside the app can produce, leave the archived copy's restore refused as `id-live`, a delete from the Archive its way out; a Set renamed and moved in one outside batch is carried at the next open; a device opening before a pull has brought a Collection's folder sweeps its Archive into the Trash, from which it restores.

##### Found False at HEAD

- Findings 2.6 ("the delete from the Archive and F-5 both call `moveIntoStore`", and the Undo through `resolveUnderRoot`) and 2.7 ("`deleteCascade` takes the roots that left", and the Archive's pages through `originPagesIn`) are superseded above, with their evidence.

##### Line Total

- **+432 (+535 / −103):** 4-1 +8, 4-2 +112, 4-3 +93, 4-4 +40, 4-5 +128, 4-6 +51, under the plan's one counting rule (`view-delta`'s Actionable column: source with imports and blank lines as Biome wraps them; comments, tests, documents, and the drive out; moved lines on both sides). Tests (two new files and about thirty-five cases) and the drive group are apart.
- **Against the Estimate (+176: +4, +61, +43, +68, the last for the three tasks that were one), Which Priced Logic Alone:** about 70 of the difference is imports (`archive.ts`, `refile.ts`, and `delete.ts`'s second source carry most of them) and about 45 the wrapping of five- to seven-parameter signatures and long conditionals one argument per line. The rest is cost the estimate placed elsewhere or didn't carry: `moveIntoStore` in 4-5, while the delete's archive source through `deleteOp`'s chain costs what a source and a move together did; the comparison's trigger reading arrivals into new containers; F-4 deindexing the disposed Archive and folding the three repeated disposal lines; both restores running the carry through one `refileLanded`; `restoreArchived` running Phase 2's `placeRecord` and `writeOrder`. The Undo's retryable landing (+7), the Archive's Sets leaving every saved view at F-4 (+18), and the carries' catches (+3 in the settle, +4 across the two restores) buy the failure and configuration paths every other removal already has.
- **What Leaves:** `restoreOp`, the inline relink, `goneEdit`'s literal, and `emptyBundle`'s two disposal triplets; the archive op's departure drop is one call to Phase 2-4's `dropDeparture`.

### Phase 5 — Shared Chrome

**GOAL:** Fold what the Trash and the Archive will share into one home each, proven on the Trash before the Archive's surface exists: `Swap` over one hold, `DONE_MS`, so Clear → Cleared and Sync Now → Synced cross-fade (G-6); ActionLabel, the frame's one top-right label (G-7), whose notice posted under the pointer drains (K-3); one Restore and Delete builder (K-4) and one checked-row rule, `actedOn`; the `useVirtualRows` seam; and the Trash's controller as `useBundleBrowser` in `Core/Bundles/browser.ts`, its search narrowing in place as every view's does (G-1). The Deletion section takes K-5's hint and two copy fixes; Task 6A-1 retitles it "Trash & Archive". The bar face, its channel, and `useDeclareActions` open Phase 6B. The user-visible changes are the hints, the Settings cross-fade, and the Trash's search order.

Phases 2 and 4 rewrite `Core/Settings/TrashFrame.tsx`, `TrashFrame.test.tsx`, `Core/Session/nexusSlice.ts`, and `Core/Interface/Confirm/confirmations.ts` first; diffs on those files are written against their AFTER: `BundleRow` and `BundleCrumb` from `Core/Bundles/rows.ts`, `storedAt` for `deletedAt`, `bundles:list` with `{ kind: 'trash' }`, `storesChanged` for `trashChanged`, Task 2-5's notices (`countPhrase` in Title Case through `PLURALS` and `capitalize`, `steppedTo`, the batch and single-row notices posting through `notifyOutcome(head, segment, unmet)`, `one(req, row)`, and `many`'s `renamed`), and `bundled` for `trashed` (Task 4-1). `spendBundle` keeps its name until Task 6A-1 renames it `spendUndo`.

#### Task 5-1

**TASK:** Fold the three hand-rolled face swaps (the lock glyph, the code block's tally overlay, Settings' timed label) into one UIX primitive, `Swap` over `swap.css.ts`, and `COPIED_MS` and `ACTIVE_MS` into one hold, `DONE_MS` (G-6).

**NOW:** `UIX/Symbols/symbols.css.ts:5-11` holds `glyphSwap` and `glyphSwapFace` (no `pointer-events` rule when hidden); its `motion` import (`:3`) serves them alone, and `lockOpenFace` (`:13-15`) stays. `LockGlyph` (`UIX/Symbols/index.tsx:262-286`) is `cx`'s only reader there (`:102`, `:281`); no stylesheet or test addresses its faces. `Core/Settings/useTimedLabel.ts:3-14` swaps a string after `ACTIVE_MS = 1500` with no fade; its result is `Button`'s `label`, a `ReactNode` (`UIX/Buttons/Button.tsx:25`). `COPIED_MS = 1000` is `Core/MarkdownPM/decorations.ts:209`; `tallyPill` (`:214-233`) writes the counts and a `codeblock-tally-copied` span in one `innerHTML`, and `copy()` (`:281-293`) toggles `.is-copied` on the tag. `markdown-pm.css:983` sets `--reveal-fade: var(--duration-slow)` over the tag, so the glyph slot and the pill fade at 350 ms; the glyph slot's copy glyph (`:1028`, `:1085`) and the bare name (`decorations.ts:287`, `:291`) keep their own swaps. `REVEAL_FADE` (`UIX/Interactions/hover-reveal.css.ts:18`) fades at the host's `--reveal-fade` beat, root `duration.fast`. `Core/Settings/NexusRows.test.tsx:68-70` finds a button by `textContent === label`.

**CHANGE**

- [ ] Write the tests and watch them fail: `UIX/Animations/Swap.test.tsx` (new) › `describe('Swap')`: "shows one face and leaves the other inert and unnamed", "swaps the two when told"; `describe('useTimedLabel')`: "holds its active face for DONE_MS after a mark, then returns". `Core/MarkdownPM/codeDiff.test.tsx` › `describe('a diff fence’s tally')` gains "swaps its counts for Copied while a copy holds, then back".
- [ ] `UIX/Animations/swap.css.ts` (new): `swap` and `face` (`glyphSwap` and `glyphSwapFace` moved); each face its own grid, so an icon draws with no line box; `pointer-events: none` when hidden; the fade at `REVEAL_FADE`.
- [ ] `UIX/Animations/Swap.tsx` (new): `Swap({ swapped, from, to })`, each face in a span carrying `data-face`, plus `aria-hidden` and `inert` when hidden (an svg takes no `inert`, so the span carries it).
- [ ] `UIX/Animations/motion.ts`: `DONE_MS = 1500` after `exitWait`.
- [ ] `UIX/Symbols/symbols.css.ts`: `glyphSwap`, `glyphSwapFace`, and the `motion` import leave; `lockOpenFace` stays.
- [ ] `UIX/Symbols/index.tsx`: `LockGlyph` draws through `Swap` (`from` the open lock, `to` the closed, `swapped` by `locked`); its comment (`:262`) and the `cx` import leave.
- [ ] `git mv Core/Settings/useTimedLabel.ts UIX/Animations/useTimedLabel.tsx`; it holds `DONE_MS` and returns a `Swap` of `idle` and `active`.
- [ ] `Core/Settings/ClearActionRow.tsx:3`, `Core/Settings/NexusRows.tsx:12`: import `useTimedLabel` from `@pommora/uix/Animations/useTimedLabel`.
- [ ] `Core/MarkdownPM/decorations.ts`: `COPIED_MS` → `DONE_MS`; the counts (keeping `.codeblock-tally-counts`) and "Copied" become two faces in one `swap` host; `showCopied(on)` toggles `.is-copied` on the tag and the faces' `data-face` alone, without `inert` or `aria-hidden` (nothing in the pill takes focus).
- [ ] `Core/MarkdownPM/markdown-pm.css`: remove the overlay (`:1069-1073`), the two `.is-copied` tally rules (`:1074-1079`), the counts' transition (`:1067`), and the pill's `position: relative` (`:1058`); the comment at `:1053` names the shared swap and why the glyph slot and the bare name keep their own.
- [ ] Sibling sweep: `Core/Settings/NexusRows.test.tsx:69-70`'s `button(label)` matches the shown face, so `button('Sync Now')` reads `Sync Now` rather than both faces; `codeDiff.test.tsx:17-18`'s `pill()` is unchanged; `LockGlyph`'s four callers change nothing.

**AFTER**

```UIX/Animations/swap.css.ts diff
+import { style } from '@vanilla-extract/css'
+import { REVEAL_FADE } from '../Interactions/hover-reveal.css'
+
+export const swap = style({ display: 'inline-grid', placeItems: 'center' })
+
+// A grid of its own, so an icon face draws with no line box; it fades at its host's beat, so a surface that slows its fades (the code block's tag) slows its swap with them.
+export const face = style({
+  gridArea: '1 / 1',
+  display: 'grid',
+  transition: REVEAL_FADE,
+  selectors: { '&[data-face="hidden"]': { opacity: 0, pointerEvents: 'none' } },
+})
```

```UIX/Animations/Swap.tsx diff
+import type { ReactNode } from 'react'
+import * as s from './swap.css'
+
+/** Two faces in one cell as wide as the wider, so a swap cross-fades with nothing reflowing. The hidden face is inert and unnamed: its controls take no press or focus, and a button names itself by the face it shows. */
+export function Swap({
+  swapped,
+  from,
+  to,
+}: {
+  swapped: boolean
+  from: ReactNode
+  to: ReactNode
+}): React.JSX.Element {
+  return (
+    <span className={s.swap}>
+      {face(from, swapped)}
+      {face(to, !swapped)}
+    </span>
+  )
+}
+
+const face = (node: ReactNode, hidden: boolean): React.JSX.Element => (
+  <span
+    className={s.face}
+    data-face={hidden ? 'hidden' : 'shown'}
+    aria-hidden={hidden || undefined}
+    inert={hidden}
+  >
+    {node}
+  </span>
+)
```

```UIX/Animations/motion.ts diff
@@ exitWait @@
 export const exitWait = (exit: keyof typeof duration): number => ms(duration[exit]) + 30
+
+/** How long an acknowledgement (Copied, Cleared, Synced) holds its done face. */
+export const DONE_MS = 1500
```

```UIX/Symbols/symbols.css.ts diff
@@ imports @@
 import { style } from '@vanilla-extract/css'
 import { vars as colorVars } from '../Theme/color.css'
-import { duration, easing } from '../Animations/motion'
-
-export const glyphSwap = style({ display: 'inline-grid', placeItems: 'center' })
-
-export const glyphSwapFace = style({
-  gridArea: '1 / 1',
-  transition: `opacity ${duration.fast} ${easing.baseEase}`,
-  selectors: { '&[data-face="hidden"]': { opacity: 0 } },
-})
 
 export const lockOpenFace = style({
```

```UIX/Symbols/index.tsx diff
@@ imports @@
 import { size as sizeTokens, type IconSize } from '../Theme/theme-vars.css'
-import { cx } from '../Utilities/cx'
 import { channel } from '../Utilities/subscribable'
+import { Swap } from '../Animations/Swap'
 import * as sym from './symbols.css'
@@ LockGlyph @@
-// Both faces stay mounted in one grid cell so a toggle cross-fades rather than swapping glyphs outright.
 export function LockGlyph({
   locked,
   size = 'control',
 }: {
   locked: boolean
   size?: IconSize
 }): React.JSX.Element {
   return (
-    <span className={sym.glyphSwap}>
-      <Icon
-        name="locked"
-        size={size}
-        className={sym.glyphSwapFace}
-        data-face={locked ? 'shown' : 'hidden'}
-      />
-      <Icon
-        name="lock-outline"
-        size={size}
-        className={cx(sym.glyphSwapFace, sym.lockOpenFace)}
-        data-face={locked ? 'hidden' : 'shown'}
-      />
-    </span>
+    <Swap
+      swapped={locked}
+      from={<Icon name="lock-outline" size={size} className={sym.lockOpenFace} />}
+      to={<Icon name="locked" size={size} />}
+    />
   )
 }
```

```UIX/Animations/useTimedLabel.tsx diff
@@ moved from Core/Settings/useTimedLabel.ts @@
-import { useEffect, useRef, useState } from 'react'
-
-const ACTIVE_MS = 1500
+import { type ReactNode, useEffect, useRef, useState } from 'react'
+import { DONE_MS } from './motion'
+import { Swap } from './Swap'
 
-export function useTimedLabel(idle: string, active: string): [string, () => void] {
+export function useTimedLabel(idle: string, active: string): [ReactNode, () => void] {
   const [done, setDone] = useState(false)
   const timer = useRef<number | undefined>(undefined)
   useEffect(() => () => window.clearTimeout(timer.current), [])
   const mark = (): void => {
     setDone(true)
     window.clearTimeout(timer.current)
-    timer.current = window.setTimeout(() => setDone(false), ACTIVE_MS)
+    timer.current = window.setTimeout(() => setDone(false), DONE_MS)
   }
-  return [done ? active : idle, mark]
+  const label = <Swap swapped={done} from={idle} to={active} />
+  return [label, mark]
 }
```

```Core/Settings/ClearActionRow.tsx diff
@@ imports @@
 import { Button } from '@pommora/uix/Buttons/Button'
+import { useTimedLabel } from '@pommora/uix/Animations/useTimedLabel'
 import { SettingsFieldRow } from './SettingsFieldRow'
-import { useTimedLabel } from './useTimedLabel'
```

```Core/Settings/NexusRows.tsx diff
@@ imports @@
 import { SettingsFieldRow } from './SettingsFieldRow'
-import { useTimedLabel } from './useTimedLabel'
+import { useTimedLabel } from '@pommora/uix/Animations/useTimedLabel'
 import { useSession, useSetting } from '../Session/store'
```

```Core/MarkdownPM/decorations.ts diff
@@ imports @@
 import * as btn from '@pommora/uix/Buttons/button-base.css'
 import { buttonClass, segmentDivider } from '@pommora/uix/Buttons/Button'
+import { DONE_MS } from '@pommora/uix/Animations/motion'
+import * as swap from '@pommora/uix/Animations/swap.css'
 import * as trail from '@pommora/uix/Elements/nav-trail.css'
@@ COPIED_MS @@
-const COPIED_MS = 1000
-
 const count = (kind: keyof DiffTally, n: number): string =>
@@ tallyPill @@
-  pill.innerHTML = `<span class="codeblock-tally-counts"><span class="${run}">${net}</span><span class="${segmentDivider}"></span><span class="${run}"><span>${count('add', add)} / ${count('del', del)}</span></span></span><span class="${cx('codeblock-tally-copied', run)}">Copied</span>`
+  pill.innerHTML = `<span class="${swap.swap}"><span class="${swap.face}" data-face="shown"><span class="codeblock-tally-counts"><span class="${run}">${net}</span><span class="${segmentDivider}"></span><span class="${run}"><span>${count('add', add)} / ${count('del', del)}</span></span></span></span><span class="${swap.face}" data-face="hidden"><span class="${run}">Copied</span></span></span>`
   return pill
@@ CodeTagWidget.toDOM @@
     const pill = this.tally ? el.appendChild(tallyPill(this.tally)) : null
+    const [counts, copied] = pill ? pill.querySelectorAll<HTMLElement>('[data-face]') : []
+    const showCopied = (on: boolean): void => {
+      el.classList.toggle('is-copied', on)
+      if (!pill) return
+      counts.dataset.face = on ? 'hidden' : 'shown'
+      copied.dataset.face = on ? 'shown' : 'hidden'
+    }
 
     let timer: number | undefined
     const copy = (e: MouseEvent): void => {
       e.preventDefault()
       const text = codeBlockTextAt(docScan(view.state.doc), view.posAtDOM(el))
       if (!text) return
       void view.state.facet(editorHost).clipboard.write(text)
-      el.classList.add('is-copied')
+      showCopied(true)
       if (!pill && name.textContent) name.textContent = 'Copied'
       window.clearTimeout(timer)
       timer = window.setTimeout(() => {
-        el.classList.remove('is-copied')
+        showCopied(false)
         name.replaceChildren(...resting)
-      }, COPIED_MS)
+      }, DONE_MS)
     }
```

```Core/MarkdownPM/markdown-pm.css diff
@@ .codeblock-tally @@
-/* A diff block's tag is a Segmented run on plain DOM, outlined rather than glass. A copy keeps the pill's size: its counts fade out as "Copied" fades in over them, at the pill's own start. */
+/* A diff block's tag is a Segmented run on plain DOM, outlined rather than glass. Its counts and "Copied" are the shared swap's two faces, so a copy keeps the pill's size. The glyph slot keeps its own stack, since its copy glyph also fades in with the continuous `--reveal` on hover; the bare name swaps its text outright, since two faces would hold a short name's tag at Copied's width. */
 .mdpm-editor .codeblock .codeblock-language .codeblock-tally {
   --btn-radius: var(--radius-full);
   --button-outline-width: var(--width-175);
   --segment-color: var(--border-strong);
-  position: relative;
   height: auto;
   padding: 2px;
   color: var(--label-secondary);
   font-variant-numeric: tabular-nums;
 }
 .mdpm-editor .codeblock-tally-counts {
   display: flex;
   align-items: center;
-  transition: opacity var(--reveal-fade) var(--ease-base);
 }
-.mdpm-editor .codeblock-tally .codeblock-tally-copied {
-  position: absolute;
-  inset: 2px auto 2px 2px;
-  opacity: 0;
-}
-.mdpm-editor .codeblock-language.is-copied .codeblock-tally-counts {
-  opacity: 0;
-}
-.mdpm-editor .codeblock-language.is-copied .codeblock-tally .codeblock-tally-copied {
-  opacity: 1;
-}
 .mdpm-editor .codeblock-tally :is(.md-diff-add, .md-diff-del) {
```

```Core/Settings/NexusRows.test.tsx diff
@@ button @@
 const buttons = (): HTMLButtonElement[] => Array.from(host.querySelectorAll('button'))
 const button = (label: string): HTMLButtonElement | undefined =>
-  buttons().find((b) => b.textContent === label)
+  buttons().find((b) => (b.querySelector('[data-face="shown"]') ?? b).textContent === label)
```

```UIX/Animations/Swap.test.tsx diff
+// @vitest-environment jsdom
+import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
+import { act } from 'react'
+import { createRoot, type Root } from 'react-dom/client'
+import { DONE_MS } from './motion'
+import { Swap } from './Swap'
+import { useTimedLabel } from './useTimedLabel'
+;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
+
+let host: HTMLDivElement
+let root: Root
+
+beforeEach(() => {
+  host = document.body.appendChild(document.createElement('div'))
+  root = createRoot(host)
+})
+afterEach(() => {
+  act(() => root.unmount())
+  host.remove()
+})
+
+const faces = (): [string | null, string | undefined, string | null, boolean][] =>
+  [...host.querySelectorAll<HTMLElement>('[data-face]')].map((f) => [
+    f.textContent,
+    f.dataset.face,
+    f.getAttribute('aria-hidden'),
+    f.hasAttribute('inert'),
+  ])
+
+describe('Swap', () => {
+  it('shows one face and leaves the other inert and unnamed', () => {
+    act(() => root.render(<Swap swapped={false} from="Clear" to="Cleared" />))
+    expect(faces()).toEqual([
+      ['Clear', 'shown', null, false],
+      ['Cleared', 'hidden', 'true', true],
+    ])
+  })
+
+  it('swaps the two when told', () => {
+    act(() => root.render(<Swap swapped={false} from="Clear" to="Cleared" />))
+    act(() => root.render(<Swap swapped from="Clear" to="Cleared" />))
+    expect(faces()).toEqual([
+      ['Clear', 'hidden', 'true', true],
+      ['Cleared', 'shown', null, false],
+    ])
+  })
+})
+
+describe('useTimedLabel', () => {
+  function Probe(): React.JSX.Element {
+    const [label, mark] = useTimedLabel('Clear', 'Cleared')
+    return (
+      <button type="button" onClick={mark}>
+        {label}
+      </button>
+    )
+  }
+  const shown = (): string | null | undefined =>
+    host.querySelector('[data-face="shown"]')?.textContent
+
+  it('holds its active face for DONE_MS after a mark, then returns', () => {
+    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] })
+    act(() => root.render(<Probe />))
+    act(() => host.querySelector('button')?.click())
+    expect(shown()).toBe('Cleared')
+    act(() => vi.advanceTimersByTime(DONE_MS - 1))
+    expect(shown()).toBe('Cleared')
+    act(() => vi.advanceTimersByTime(1))
+    expect(shown()).toBe('Clear')
+    vi.useRealTimers()
+  })
+})
```

```Core/MarkdownPM/codeDiff.test.tsx diff
@@ imports @@
-import { afterEach, describe, expect, it } from 'vitest'
+import { afterEach, describe, expect, it, vi } from 'vitest'
 import { act } from 'react'
+import { DONE_MS } from '@pommora/uix/Animations/motion'
@@ a diff fence’s tally @@
   it('leaves a line out once it changes to a changed sign', async () => {
     …
   })
+
+  it('swaps its counts for Copied while a copy holds, then back', async () => {
+    const view = await mountEditor({ initialBody: doc })
+    const tally = view.contentDOM.querySelector<HTMLElement>('.codeblock-tally')!
+    const faces = (): (string | null | undefined)[][] =>
+      [...tally.querySelectorAll<HTMLElement>('[data-face]')].map((f) => [
+        f.textContent,
+        f.dataset.face,
+      ])
+    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] })
+    tally.click()
+    expect(faces()).toEqual([
+      ['+1+2 / −1', 'hidden'],
+      ['Copied', 'shown'],
+    ])
+    vi.advanceTimersByTime(DONE_MS)
+    expect(faces()).toEqual([
+      ['+1+2 / −1', 'shown'],
+      ['Copied', 'hidden'],
+    ])
+    vi.useRealTimers()
+  })
 })
```

**VERIFY**

- [ ] `UIX/Animations/Swap.test.tsx` and the new `codeDiff.test.tsx` case pass; `codeDiff.test.tsx` › "reads its net change, then added over removed", "reads Copied when clicked, unless a tally takes the word", and "sits before a diff’s tally" pass unchanged; `NexusRows.test.tsx` passes with its finder reading the shown face.
- [ ] `git grep -n "glyphSwap\|COPIED_MS\|ACTIVE_MS\|codeblock-tally-copied" -- Core UIX` finds nothing.
- [ ] `git grep -n "useTimedLabel" -- Core UIX` finds `UIX/Animations/useTimedLabel.tsx`, `UIX/Animations/Swap.test.tsx`, `Core/Settings/ClearActionRow.tsx`, and `Core/Settings/NexusRows.tsx` alone; `git grep -n "Animations/Swap'\|from './Swap'" -- Core UIX` finds `UIX/Symbols/index.tsx`, `useTimedLabel.tsx`, and the test.
- [ ] Run the gates.
- [ ] Check for unnecessary code or mistakes.

**Lines:** +20 (+71 / −51): the swap's two files +41, `DONE_MS` +2, `LockGlyph` +6 / −15, `symbols.css.ts` −9, `useTimedLabel` +7 / −6 (its 13 moved lines apart), the importers ±0, the pill +13 / −6, the stylesheet −13. Tests +79 apart.

#### Task 5-2

**TASK:** Rename `NotificationLabel` to ActionLabel (G-7) with its stylesheet and test; Phase 6B adds the bar face. A notice posted with the pointer inside its band stays unarmed until the pointer is seen outside it once, so its countdown drains (K-3).

**NOW:** `Core/Interface/Notifications/NotificationLabel.tsx` is imported only by `Core/Interface/App.tsx:21`, drawn at `:198`. The drain slows while `nearRef` is true (`:43`); `nearRef` resets per post (`:29`) and is set by every `trackNear` report but `held` (`:70-72`). `trackNear` reports only on pointer moves (`UIX/Interactions/hoverReveal.ts:204-212`), so the press that posts a notice leaves `near` its first report and stalls the countdown. The test's two drain cases (`:76`, `:85`) open with `move(400)`, inside the band (box right edge 300 plus radius 100), which no longer arms the notice. `Notifications/` and `notifications.ts` keep their names.

**CHANGE**

- [ ] Write the tests and watch them fail, in the renamed `ActionLabel.test.tsx` › `describe('the drain near the pointer')`: new "a notice posted under the pointer drains while the pointer stays in its band"; ":76 stalls within its band and drains once the pointer leaves it" → "stalls within its band once the pointer has been outside it, and drains once it leaves again"; ":85 holds where it stands through a press" → "holds where it stands through a press, once the pointer has been outside its band" (both now open with `move(401)` outside the band).
- [ ] `git mv` in `Core/Interface/Notifications/`: `NotificationLabel.tsx` → `ActionLabel.tsx`, `notification-label.css.ts` → `action-label.css.ts` (content unchanged), `NotificationLabel.test.tsx` → `ActionLabel.test.tsx`.
- [ ] `ActionLabel.tsx`: the export and stylesheet import follow the rename; the proximity effect (re-run per notice on `[note, shown]`) holds a local `armed = false`, set by the first `far` or `out` report; `held` returns before either; `nearRef` reads `armed && near`; the comment at `:60` gains the rule.
- [ ] `Core/Interface/App.tsx:21`, `:198`: `ActionLabel`.
- [ ] Sibling sweep: `ActionLabel.test.tsx`'s import (`:5`), render (`:15`), and `describe('NotificationLabel')` (`:28`) become `ActionLabel`; cases `:29` and `:39` are unchanged.

**AFTER**

```Core/Interface/Notifications/ActionLabel.tsx diff
@@ imports @@
-import * as s from './notification-label.css'
+import * as s from './action-label.css'
@@ ActionLabel @@
-export function NotificationLabel(): React.JSX.Element {
+export function ActionLabel(): React.JSX.Element {
@@ the drain's proximity @@
-  // Proximity rather than hover: the pointer heading for the action reaches the drain before it does, so the label can't leave out from under a reach. A press holds the drain where it stands.
+  // Proximity rather than hover: the pointer heading for the action reaches the drain before it does, so the label can't leave out from under a reach. A press holds the drain where it stands. A notice stays unarmed until the pointer has been seen outside its band once, since the press that posted it can leave the pointer inside.
   useEffect(() => {
     const host = hostRef.current
     if (!note || !shown || !host) return
+    let armed = false
     return trackNear({
       anchor: host,
       measure: () => {
         const box = host.getBoundingClientRect()
         return (x, y) => withinBox(box, x, y, s.NEAR_RADIUS)
       },
       report: (at) => {
-        if (at !== 'held') nearRef.current = at === 'near'
+        if (at === 'held') return
+        armed ||= at !== 'near'
+        nearRef.current = armed && at === 'near'
       },
     }).stop
   }, [note, shown])
```

```Core/Interface/App.tsx diff
@@ imports @@
-import { NotificationLabel } from './Notifications/NotificationLabel'
+import { ActionLabel } from './Notifications/ActionLabel'
@@ App @@
         <ValuePickPresenter />
-        <NotificationLabel />
+        <ActionLabel />
```

```Core/Interface/Notifications/ActionLabel.test.tsx diff
@@ imports @@
-import { NotificationLabel } from './NotificationLabel'
+import { ActionLabel } from './ActionLabel'
@@ beforeEach @@
-  act(() => root.render(<NotificationLabel />))
+  act(() => root.render(<ActionLabel />))
@@ describe @@
-describe('NotificationLabel', () => {
+describe('ActionLabel', () => {
@@ the drain near the pointer @@
-  it('stalls within its band and drains once the pointer leaves it', () => {
+  it('a notice posted under the pointer drains while the pointer stays in its band', () => {
+    move(400)
+    move(390)
+    run(10_000)
+    expect(showing()).toBe(false)
+  })
+
+  it('stalls within its band once the pointer has been outside it, and drains once it leaves again', () => {
+    move(401)
     move(400)
     run(10_000)
     expect(showing()).toBe(true)
     move(401)
     run(10_000)
     expect(showing()).toBe(false)
   })
 
-  it('holds where it stands through a press', () => {
+  it('holds where it stands through a press, once the pointer has been outside its band', () => {
+    move(401)
     move(400)
     move(1000, 1)
     run(10_000)
     expect(showing()).toBe(true)
   })
```

**VERIFY**

- [ ] `ActionLabel.test.tsx` passes, its new case failing before the effect changes.
- [ ] `git grep -n "NotificationLabel\|notification-label" -- Core Desktop UIX` finds nothing.
- [ ] Run the gates.
- [ ] Check for unnecessary code or mistakes.

**Lines:** +3 (+8 / −5): `armed` and the early `held` return +3; the rename ±0. Tests +8 apart.

#### Task 5-3

**TASK:** One Restore and Delete builder, `Core/Actions/restoreMenu.ts`, replaces the Trash's and File History's (K-4), folding `restoreAll` and `deleteAll` into `restore` and `delete` with batch labels; the inline checked-row rule becomes `actedOn`, over a module-private `checkedIn`, in `UIX/Utilities/checkSet.ts`.

**NOW:** `Core/Actions/trashMenu.ts` builds `Restore | Restore All` (or a `restoreTo:<id>` drill for a homeless row) and `Delete | Delete All`, five actions (`:6`), its right-click rule in the `:9` comment; `Core/Actions/fileHistoryMenu.ts` offers `Delete All` alone for a batch. `joinGroups` (`Core/Actions/menuModel.ts:28-32`) drops empty groups and sets `separatorBefore`. TrashFrame's `openMenu` (`Core/Settings/TrashFrame.tsx:161-199` at HEAD, on Tasks 2-3 and 2-5's AFTER) derives the batch inline (`:162-166`, the rule's comment at `:162`) and dispatches `restoreAll` and `deleteAll` (`:192-197`). File History's `openMenu` (`Core/Interface/Windows/PageHistoryWindow.tsx:139-144`) reads `checked.has(ts) ? [...checked] : [ts]`; `checked` is retained to the listed rows (`:80-81`) and History has no search, so `actedOn` changes nothing there. `checkSet.ts` has no test file. Task 5-5 moves this menu into the browser hook; it is edited in TrashFrame first so `trashMenu.ts` leaves with its last importer.

**CHANGE**

- [ ] Write the tests and watch them fail: `Core/Actions/restoreMenu.test.ts` (new, merging `trashMenu.test.ts` and `fileHistoryMenu.test.ts`) › `describe('the restore menu')`: "restores and deletes one row, the plural for a batch", "a homeless row turns Restore into a destination drill keyed by id" and "nowhere to put it keeps the row, refused" (bodies unchanged), "where one item restores at a time, a batch offers Delete All alone". `UIX/Utilities/checkSet.test.ts` (new) › `describe('actedOn')`: "a right-click on an unchecked item acts on it alone, whatever else is checked", "a checked item takes the checked items still shown, in their shown order".
- [ ] `Core/Actions/restoreMenu.ts` (new); `Core/Actions/trashMenu.ts`, `fileHistoryMenu.ts`, `trashMenu.test.ts`, and `fileHistoryMenu.test.ts` removed.
- [ ] `UIX/Utilities/checkSet.ts`: `actedOn(checked, shown, clicked, keyOf)` over a module-private `checkedIn(checked, shown, keyOf)` (Task 6B-5 exports it), item-based, answering the rows acted on; `actedOn`'s doc takes the rule from `trashMenu.ts:9` and `TrashFrame.tsx:162`.
- [ ] `Core/Settings/TrashFrame.tsx`: `openMenu` reads `actedOn` and `restoreMenuItems`; `restore` and `delete` run the batch for more than one target, else the single-row path; the `restoreAll` and `deleteAll` cases leave.
- [ ] `Core/Interface/Windows/PageHistoryWindow.tsx`: `openMenu` reads `actedOn(checked, rows, ts, (t) => t)` and `restoreMenuItems({ batch, restoresBatch: false })`.
- [ ] Sibling sweep: `Core/Settings/TrashFrame.test.tsx`'s picks `'restoreAll'` (`:251`, `:288`, `:295`) become `'restore'` and `'deleteAll'` (`:306`) `'delete'`; their titles still name Restore All and Delete All.

**AFTER**

```Core/Actions/restoreMenu.ts diff
+import { type ActionItem, joinGroups } from './menuModel'
+import { destinationRows, type MoveTarget } from './pageMenu'
+
+type RestoreMenuAction = 'restore' | 'delete' | `restoreTo:${string}`
+
+/** Restore and Delete over what a right-click acts on (`actedOn`), named for a batch; the leaf performs the write and refreshes the list it shows. */
+export function restoreMenuItems({
+  batch,
+  destinations,
+  restoresBatch = true,
+}: {
+  batch: boolean
+  /** Absent means the recorded home resolves and Restore acts without asking. */
+  destinations?: MoveTarget[]
+  /** False where one item restores at a time (File History), so a batch offers Delete All alone. */
+  restoresBatch?: boolean
+}): ActionItem<RestoreMenuAction>[] {
+  const label = batch ? 'Restore All' : 'Restore'
+  const restore: ActionItem<RestoreMenuAction> = destinations
+    ? { label, submenu: destinationRows(destinations, (t) => `restoreTo:${t.id}` as const) }
+    : { label, action: 'restore' }
+  return joinGroups<RestoreMenuAction>([
+    batch && !restoresBatch ? [] : [restore],
+    [{ label: batch ? 'Delete All' : 'Delete', action: 'delete' }],
+  ])
+}
```

```UIX/Utilities/checkSet.ts diff
@@ retained @@
 export function retained<T>(prev: ReadonlySet<T>, live: ReadonlySet<T>): ReadonlySet<T> {
   const next = new Set([...prev].filter((k) => live.has(k)))
   return next.size === prev.size ? prev : next
 }
+
+function checkedIn<T, K>(
+  checked: ReadonlySet<K>,
+  shown: readonly T[],
+  keyOf: (item: T) => K,
+): T[] {
+  return shown.filter((item) => checked.has(keyOf(item)))
+}
+
+/** What a right-click acts on: an unchecked item alone, whatever else is checked, since a checked set is a deliberate construction; a checked one with every checked item still shown, so a narrowed list never offers a batch of rows it hides, and a lone shown row keeps the single-row menu it is owed. */
+export function actedOn<T, K>(
+  checked: ReadonlySet<K>,
+  shown: readonly T[],
+  clicked: T,
+  keyOf: (item: T) => K,
+): T[] {
+  return checked.has(keyOf(clicked)) ? checkedIn(checked, shown, keyOf) : [clicked]
+}
```

```Core/Settings/TrashFrame.tsx diff
@@ imports @@
-import { retained, toggled } from '@pommora/uix/Utilities/checkSet'
+import { actedOn, retained, toggled } from '@pommora/uix/Utilities/checkSet'
@@
-import { trashMenuItems } from '../Actions/trashMenu'
+import { restoreMenuItems } from '../Actions/restoreMenu'
@@ openMenu @@
   const openMenu = async (row: BundleRow): Promise<void> => {
-    // Right-clicking an unchecked row acts on that row alone, whatever else is checked — a checked set is a deliberate construction. The batch is what the menu will actually act on: the CHECKED rows STILL IN VIEW, since deriving it from the unfiltered selection would let a filtered right-click read "Restore All", act on one row, and withhold the destination picker that row was owed.
-    const inSet = checked.has(row.bundlePath) ? shown.filter((r) => checked.has(r.bundlePath)) : []
-    const batch = inSet.length > 1
-    const targets = batch ? inSet : [row]
-    const homeless = !batch && !row.homeResolves
+    const targets = actedOn(checked, shown, row, (r) => r.bundlePath)
+    const batch = targets.length > 1
     const destinationKind = row.kind === 'space' ? ('context' as const) : ('container' as const)
     const action = await popMenu(
-      trashMenuItems({
+      restoreMenuItems({
         batch,
-        ...(homeless
+        ...(!batch && !row.homeResolves
           ? {
               destinations:
                 destinationKind === 'context' ? contextTargets(tree) : containerTargets(tree),
             }
           : {}),
       }),
     )
     if (!action) return
     if (action.startsWith('restoreTo:')) {
       const destination = { kind: destinationKind, id: action.slice('restoreTo:'.length) }
       await one({ op: 'restore', bundlePath: row.bundlePath, destination }, row)
       return
     }
     switch (action) {
       case 'restore':
-        await one({ op: 'restore', bundlePath: row.bundlePath }, row)
+        if (batch) await restoreBatch(targets)
+        else await one({ op: 'restore', bundlePath: row.bundlePath }, row)
         break
       case 'delete':
-        if (await askEmptyTrash(1))
+        if (batch) await emptyBatch(targets)
+        else if (await askEmptyTrash(1))
           await one({ op: 'emptyBundle', bundlePath: row.bundlePath }, row)
         break
-      case 'restoreAll':
-        await restoreBatch(targets)
-        break
-      case 'deleteAll':
-        await emptyBatch(targets)
-        break
     }
   }
```

```Core/Interface/Windows/PageHistoryWindow.tsx diff
@@ imports @@
-import { retained, toggled } from '@pommora/uix/Utilities/checkSet'
+import { actedOn, retained, toggled } from '@pommora/uix/Utilities/checkSet'
@@
-import { fileHistoryMenuItems } from '../../Actions/fileHistoryMenu'
+import { restoreMenuItems } from '../../Actions/restoreMenu'
@@ openMenu @@
   const openMenu = async (ts: number): Promise<void> => {
-    const keys = checked.has(ts) ? [...checked] : [ts]
-    const action = await popMenu(fileHistoryMenuItems(keys.length > 1))
+    const keys = actedOn(checked, rows, ts, (t) => t)
+    const action = await popMenu(restoreMenuItems({ batch: keys.length > 1, restoresBatch: false }))
     if (action === 'restore') await restore(ts)
     else if (action === 'delete') await remove(keys)
   }
```

```Core/Actions/restoreMenu.test.ts diff
+import { describe, expect, it } from 'vitest'
+import { restoreMenuItems } from './restoreMenu'
+
+describe('the restore menu', () => {
+  it('restores and deletes one row, the plural for a batch', () => {
+    expect(restoreMenuItems({ batch: false })).toEqual([
+      { label: 'Restore', action: 'restore' },
+      { label: 'Delete', action: 'delete', separatorBefore: true },
+    ])
+    expect(restoreMenuItems({ batch: true }).map((i) => [i.label, i.action])).toEqual([
+      ['Restore All', 'restore'],
+      ['Delete All', 'delete'],
+    ])
+  })
+
+  it('a homeless row turns Restore into a destination drill keyed by id', () => {
+    const items = restoreMenuItems({
+      batch: false,
+      destinations: [
+        {
+          id: 'c1',
+          label: 'Notes',
+          path: 'Notes',
+          children: [{ id: 's1', label: 'Sub', path: 'Notes/Sub' }],
+        },
+      ],
+    })
+    const notes = items[0].submenu?.[0]
+    expect(notes?.submenu?.map((r) => [r.label, r.action, r.separatorBefore])).toEqual([
+      ['Notes', 'restoreTo:c1', undefined],
+      ['Sub', 'restoreTo:s1', true],
+    ])
+  })
+
+  it('nowhere to put it keeps the row, refused', () => {
+    expect(restoreMenuItems({ batch: false, destinations: [] })[0]).toEqual({
+      label: 'Restore',
+      submenu: [],
+    })
+  })
+
+  it('where one item restores at a time, a batch offers Delete All alone', () => {
+    expect(restoreMenuItems({ batch: true, restoresBatch: false })).toEqual([
+      { label: 'Delete All', action: 'delete' },
+    ])
+    expect(restoreMenuItems({ batch: false, restoresBatch: false })).toEqual([
+      { label: 'Restore', action: 'restore' },
+      { label: 'Delete', action: 'delete', separatorBefore: true },
+    ])
+  })
+})
```

```UIX/Utilities/checkSet.test.ts diff
+import { describe, expect, it } from 'vitest'
+import { actedOn } from './checkSet'
+
+const id = (key: string): string => key
+
+describe('actedOn', () => {
+  it('a right-click on an unchecked item acts on it alone, whatever else is checked', () => {
+    expect(actedOn(new Set(['a', 'c']), ['c', 'b', 'a'], 'b', id)).toEqual(['b'])
+  })
+
+  it('a checked item takes the checked items still shown, in their shown order', () => {
+    expect(actedOn(new Set(['a', 'c', 'z']), ['c', 'b', 'a'], 'a', id)).toEqual(['c', 'a'])
+  })
+})
```

```Core/Settings/TrashFrame.test.tsx diff
@@ a Restore All here spends each bundle’s Undo @@
-    picked = 'restoreAll'
+    picked = 'restore'
@@ a Restore All lands every pending save before its first restore @@
-    await pickForBoth('restoreAll')
+    await pickForBoth('restore')
@@ carries what a Restore All couldn’t re-spell into its notice @@
-    await pickForBoth('restoreAll')
+    await pickForBoth('restore')
@@ carries what a Delete All couldn’t strip into its notice @@
-    await pickForBoth('deleteAll')
+    await pickForBoth('delete')
```

**VERIFY**

- [ ] `restoreMenu.test.ts`, `checkSet.test.ts`, and `TrashFrame.test.tsx` pass.
- [ ] `git grep -n "trashMenuItems\|fileHistoryMenuItems\|Actions/trashMenu\|Actions/fileHistoryMenu\|'restoreAll'\|'deleteAll'" -- Core Desktop UIX` finds nothing (quoted, since `vi.restoreAllMocks` shares the bare word).
- [ ] Run the gates.
- [ ] Check for unnecessary code or mistakes.

**Lines:** −8 (+54 / −62): the builder +23 against −42 (`trashMenu.ts` 30, `fileHistoryMenu.ts` 12), `checkSet.ts` +17, TrashFrame +10 / −16, History +4 / −4. Tests ±0 apart (the merged builder test +10, `checkSet.test.ts` +13).

#### Task 5-4

**TASK:** `UIX/Interactions/virtualRows.ts` becomes the one seam over `@tanstack/react-virtual`, with IconPicker on it; it measures the list's offset in its scroll root as a rect difference plus the root's `scrollTop`, which holds inside an absolutely positioned host where `offsetTop` doesn't.

**NOW:** `UIX/Pickers/IconPicker.tsx` is the package's only importer (`:10`); it measures `scrollMargin` with `listEl.offsetTop` in a layout effect on `[listEl, iconFavs.length, open]` (`:84-88`; the favorites strip moves the list), virtualizes `Math.ceil(filtered.length / COLS)` rows of `CELL` with `overscan: 6` (`:90-97`), and translates each row by `start - scrollMargin` (`:130-151`). Its scroll root `s.grid` is `position: relative` with no border (`UIX/Pickers/icon-picker.css.ts:45-56`), so the rect difference equals `offsetTop` there. Phase 6B's ArchiveView, the second consumer, sits in an absolutely positioned host (`Core/Interface/interface.css:40-46`).

**CHANGE**

- [ ] Write the test and watch it pass before and after: `IconPicker.test.tsx` stands as the pin (jsdom lays out no rects; drive group 5's icon-picker check and group 6B's ArchiveView scroll assert the offset).
- [ ] `UIX/Interactions/virtualRows.ts` (new): `useVirtualRows({ count, rowHeight, listEl, scrollEl }, deps)` → `{ height, rows }`, each `start` measured from the list's top, so callers read no virtualizer type and subtract no margin; `deps` re-measure the offset when what sits above the list changes.
- [ ] `UIX/Pickers/IconPicker.tsx`: the `useVirtualizer` and `useLayoutEffect` imports, the `scrollMargin` state and effect, and the inline virtualizer leave for one `useVirtualRows` call on `[iconFavs.length, open]`; the list draws `virtual.height`, each row translated by its `start`.
- [ ] Sibling sweep: nothing else imports the package.

**AFTER**

```UIX/Interactions/virtualRows.ts diff
+import { type Key, useLayoutEffect, useState } from 'react'
+import { useVirtualizer } from '@tanstack/react-virtual'
+
+/** The one seam over the virtualizer: fixed-height rows of a list inside a scroll root, each `start` measured from the list's own top. `deps` re-measure where the list sits whenever what lies above it changes. */
+export function useVirtualRows(
+  {
+    count,
+    rowHeight,
+    listEl,
+    scrollEl,
+  }: { count: number; rowHeight: number; listEl: HTMLElement | null; scrollEl: HTMLElement | null },
+  deps: readonly unknown[],
+): { height: number; rows: { key: Key; index: number; start: number }[] } {
+  const [margin, setMargin] = useState(0)
+  // Against the scroll root rather than `offsetTop`, which reads the nearest positioned ancestor: a parked content host, in a content view.
+  useLayoutEffect(() => {
+    if (!listEl || !scrollEl) return
+    const top = listEl.getBoundingClientRect().top - scrollEl.getBoundingClientRect().top
+    setMargin(top + scrollEl.scrollTop)
+  }, [listEl, scrollEl, ...deps])
+  const virtual = useVirtualizer({
+    count,
+    getScrollElement: () => scrollEl,
+    estimateSize: () => rowHeight,
+    overscan: 6,
+    scrollMargin: margin,
+  })
+  return {
+    height: virtual.getTotalSize(),
+    rows: virtual
+      .getVirtualItems()
+      .map(({ key, index, start }) => ({ key, index, start: start - margin })),
+  }
+}
```

```UIX/Pickers/IconPicker.tsx diff
@@ imports @@
 import {
   type MouseEvent,
   type RefObject,
   useEffect,
-  useLayoutEffect,
   useMemo,
   useState,
   useSyncExternalStore,
 } from 'react'
-import { useVirtualizer } from '@tanstack/react-virtual'
 import { PickerMenu } from './PickerMenu'
 import { SearchField } from '../Fields/SearchField'
 import { fullIconSet, Icon, loadFullIconSet, subscribeFullIconSet } from '../Symbols'
 import type { IconEntry } from '../Symbols/allSymbols'
 import { SortableZone, useDragItem } from '../Interactions/drag'
+import { useVirtualRows } from '../Interactions/virtualRows'
@@ the virtual grid @@
   // A state-backed callback ref, so the virtualizer re-runs the moment the element mounts.
   const [scrollEl, setScrollEl] = useState<HTMLDivElement | null>(null)
   const [listEl, setListEl] = useState<HTMLDivElement | null>(null)
-
-  // How far the list's top sits below the scroll container's top.
-  const [scrollMargin, setScrollMargin] = useState(0)
-  useLayoutEffect(() => {
-    if (listEl) setScrollMargin(listEl.offsetTop)
-  }, [listEl, iconFavs.length, open])
-
-  const rowCount = Math.ceil(filtered.length / COLS)
-  const rowVirt = useVirtualizer({
-    count: rowCount,
-    getScrollElement: () => scrollEl,
-    estimateSize: () => CELL,
-    overscan: 6,
-    scrollMargin,
-  })
+  const virtual = useVirtualRows(
+    { count: Math.ceil(filtered.length / COLS), rowHeight: CELL, listEl, scrollEl },
+    [iconFavs.length, open],
+  )
@@ the list @@
-        <div ref={setListEl} className={s.list} style={{ height: rowVirt.getTotalSize() }}>
-          {rowVirt.getVirtualItems().map((vr) => {
+        <div ref={setListEl} className={s.list} style={{ height: virtual.height }}>
+          {virtual.rows.map((vr) => {
             const start = vr.index * COLS
             return (
               <div
                 key={vr.key}
                 className={s.row}
-                style={{ height: CELL, transform: `translateY(${vr.start - scrollMargin}px)` }}
+                style={{ height: CELL, transform: `translateY(${vr.start}px)` }}
               >
```

**VERIFY**

- [ ] `IconPicker.test.tsx` passes unchanged.
- [ ] `git grep -n "@tanstack/react-virtual" -- Core UIX Desktop ':!*package.json'` finds `UIX/Interactions/virtualRows.ts` alone.
- [ ] Run the gates.
- [ ] Check for unnecessary code or mistakes.

**Lines:** +21 (+40 / −19): the seam +32, IconPicker +8 / −19.

#### Task 5-5

**TASK:** Move the Trash browser's controller into `Core/Bundles/browser.ts` (renderer-only, never imported host-side) as `useBundleBrowser(store, { query, shown })`, answering the store's date column, `countPhrase`, and a narrowing that keeps order in place as every view's search does (ruling 15); TrashFrame draws its unchanged look on the hook.

**NOW:** After Phases 2 and 4, `Core/Settings/TrashFrame.tsx` holds its presentation (HEAD `:58-62`, `:201-327`) and the controller: `PLURALS`, `countPhrase` (HEAD `:36-50`), and `steppedTo` (Task 2-5); `filterRows` ranking through `rankMatches` (`:52-56`); the date column's resolve (`:65-69`, comment `:67`), pick (`:153-159`), and format (`:254-263`), calling `styleMenuItems` directly since `styleBranch` hides a lone row (`Core/Actions/columnMenu.ts:96-100`); the rows, failure, checked set, and refresh over `bundles:list` (`:74-94`) on `storesChanged`; `one(req, row)` and the batch runner (`:99-151`); the menu (`:161-199`, Task 5-3). TrashFrame mounts only while shown; ArchiveView's parked host stays mounted behind another tab (`Core/Interface/ContentView.tsx:92-136`), hence `shown`. ViewSearch narrows in place through `matchScore` (`Core/Views/Pipeline/search.ts:4-14`, its needle folded by `matchQuery` at `Core/Views/Host/useViewHost.ts:55`); `rankMatches` keeps its other callers. `Core/Testing/fixtures.ts` holds the shared builders (`deviceRecord`, `detail`).

**CHANGE**

- [ ] Write the tests and watch them fail: `Core/Bundles/browser.test.ts` (new) › `describe('filterRows')` takes `TrashFrame.test.tsx:33-64`'s six cases unchanged ("an empty query keeps the list whole and in the order it arrived" among them) plus "narrows in place, keeping the order it arrived in rather than ranking the best match first"; `describe('countPhrase')` takes `:66-85`'s four cases as Task 2-5 left them.
- [ ] `Core/Bundles/browser.ts` (new): the controller moved as it stands (`countPhrase` with its `PLURALS`, `steppedTo`, the single-row path, the batch runner, and the two batch notices, each posting through `notifyOutcome`); `filterRows`, in place through `matchScore`; module-private `useDateColumn(key)`, answering the heading's right-click handler; `rulesOf(kind)`, the one `switch` on the store's kind; `useBundleBrowser(store, { query, shown })`, its refresh keyed on the store's fields (so a caller may pass a literal) and subscribed to `storesChanged` only while `shown`, listing again on each showing; `askEmptyTrash` called directly (the archive arm joins with ArchiveView in Phase 6B).
- [ ] `Core/Settings/TrashFrame.tsx`: the controller and its imports leave; `TrashBody` holds the query and calls `useBundleBrowser({ kind: 'trash' }, { query, shown: true })`; the filtered rows read `matches`; the date head's right-click is `date.onContextMenu`, each row's time `date.when(row.storedAt)`.
- [ ] `Core/Settings/personalization.ts`: `archiveColumnStyle: setting(columnStyle)` beside `trashColumnStyle` (`:197`), for `rulesOf`'s archive arm.
- [ ] `Core/Testing/fixtures.ts`: `bundleRow(over)`, hoisted from `TrashFrame.test.tsx:19-31` for both test files and Phase 6B's `ArchiveView.test.tsx`.
- [ ] Sibling sweep: `Core/Settings/TrashFrame.test.tsx` drops the `countPhrase` and `filterRows` describes and the `matchKey` import, and builds its rows with `bundleRow`; its DOM cases (`:87-320`) stay, `mutate` and `bundles:list` stubbed as Phase 2 left them. No host file imports `Core/Bundles/browser.ts` (`engineGraph.test.ts` fails if one does).

**AFTER**

`PLURALS`, `countPhrase`, `steppedTo`, `one(req, row)`, and `many`'s `renamed` are Task 2-5's lines, moved unchanged, the batch restore's `notifyOutcome` call and the single-row delete in `openMenu` as 2-5 wraps them.
```Core/Bundles/browser.ts diff
+// The renderer's half of the bundle owner: what a store's browser does with the rows `rows.ts` builds host-side.
+import { useCallback, useEffect, useMemo, useState } from 'react'
+import { capitalize } from '@pommora/uix/Utilities/capitalize'
+import { actedOn, retained, toggled } from '@pommora/uix/Utilities/checkSet'
+import { askEmptyTrash, spendBundle } from '../Interface/Confirm/confirmations'
+import { notifyOutcome, unrestoredLine } from '../Interface/Notifications/notifications'
+import { changesSettled, type MutateRequest } from '../Nexus/mutateRequest'
+import { matchQuery, matchScore } from '../Paths/caseFold'
+import { itemCount } from '../Properties/properties'
+import { formatDate } from '../Properties/formatValue'
+import { dateDefaults, holdsStyle, resolveStyle, storedPick } from '../Properties/columnStyles'
+import { parseStyleAction, styleMenuItems } from '../Actions/columnMenu'
+import { containerTargets, contextTargets } from '../Actions/destinationTree'
+import { popMenu } from '../Actions/menuActions'
+import { restoreMenuItems } from '../Actions/restoreMenu'
+import { useNexusForms } from '../Views/Host/useColumnStyles'
+import { useSession } from '../Session/store'
+import { personalizationOf } from '../Session/configSlice'
+import { flushAllSaves, storesChanged } from '../Session/nexusSlice'
+import { dialer } from '../Platform/dialer'
+import type { BundleStore } from './bundle'
+import type { BundleRow } from './rows'
+
+const PLURALS: Record<BundleRow['kind'], string> = {
+  page: 'Pages',
+  collection: 'Collections',
+  set: 'Sets',
+  space: 'Spaces',
+  context: 'Contexts',
+  property: 'Properties',
+}
+
+export function countPhrase(rows: BundleRow[]): string {
+  const kinds = new Set(rows.map((r) => r.kind))
+  const kind = kinds.size === 1 ? [...kinds][0] : null
+  if (kind === null) return itemCount(rows.length)
+  return rows.length === 1 ? `1 ${capitalize(kind)}` : `${rows.length} ${PLURALS[kind]}`
+}
+
+const steppedTo = (title: string, landedAs: string): string => `“${title}” as “${landedAs}”`
+
+/** Typed search narrows in place, keeping the store's order, as a view's search does (`searchGroups`). */
+export function filterRows(rows: BundleRow[], query: string): BundleRow[] {
+  const q = matchQuery(query)
+  return q ? rows.filter((row) => matchScore(row.match, q) !== null) : rows
+}
+
+/** A store's date column: its stored style over the Nexus's date form, and the heading's right-click, which picks one. */
+function useDateColumn(key: 'trashColumnStyle' | 'archiveColumnStyle'): {
+  when: (storedAt: number | null) => string
+  onContextMenu: (e: React.MouseEvent) => Promise<void>
+} {
+  const nexus = useNexusForms()
+  const stored = useSession((s) => personalizationOf(s)[key])
+  const setPersonalization = useSession((s) => s.setPersonalization)
+  // A store shows when each item entered it, where a view's date column leaves the time hidden.
+  const defaults = { ...dateDefaults(nexus.dateFormat), time_format: nexus.clock }
+  const style = resolveStyle(stored, defaults, nexus.clock)
+  return {
+    when: (storedAt) =>
+      storedAt === null
+        ? ''
+        : formatDate(
+            new Date(storedAt).toISOString(),
+            style.date_format,
+            style.time_format,
+            style.weekday,
+          ),
+    onContextMenu: async (e) => {
+      e.preventDefault()
+      const action = await popMenu(styleMenuItems({ type: 'dateTime', current: style }))
+      const pick = action ? parseStyleAction(action) : null
+      if (!pick) return
+      const next = { ...stored, [pick.key]: storedPick(pick.key, pick.value, defaults, nexus.clock) }
+      setPersonalization(key, holdsStyle(next) ? next : undefined)
+    },
+  }
+}
+
+/** What the Trash and the Archive do differently under one browser. */
+function rulesOf(kind: BundleStore['kind']): { dateKey: Parameters<typeof useDateColumn>[0] } {
+  switch (kind) {
+    case 'trash':
+      return { dateKey: 'trashColumnStyle' }
+    case 'archive':
+      return { dateKey: 'archiveColumnStyle' }
+  }
+}
+
+/** A store's browser: its rows, listed again on each change while shown and on each showing; the checked set; the right-click menu's Restore and Delete over a row or the checked rows in view; and its date column. */
+export function useBundleBrowser(
+  store: BundleStore,
+  { query, shown }: { query: string; shown: boolean },
+): {
+  rows: BundleRow[] | null
+  failed: boolean
+  matches: BundleRow[]
+  checked: ReadonlySet<string>
+  toggle: (bundlePath: string) => void
+  openMenu: (row: BundleRow) => Promise<void>
+  date: ReturnType<typeof useDateColumn>
+} {
+  const rules = rulesOf(store.kind)
+  const date = useDateColumn(rules.dateKey)
+  const tree = useSession((s) => s.tree)
+  const mutate = useSession((s) => s.mutate)
+  const [rows, setRows] = useState<BundleRow[] | null>(null)
+  const [failed, setFailed] = useState(false)
+  const [checked, setChecked] = useState<ReadonlySet<string>>(new Set())
+
+  // Keyed on the store's fields rather than the object, so a caller may pass a fresh literal.
+  const refresh = useCallback(async (): Promise<void> => {
+    const res = await dialer().ask('bundles:list', store)
+    if (!res.ok) {
+      setFailed(true)
+      return
+    }
+    setFailed(false)
+    setRows(res.value)
+    const live = new Set(res.value.map((r) => r.bundlePath))
+    setChecked((prev) => retained(prev, live))
+  }, [store.kind, store.kind === 'archive' ? store.id : null])
+
+  // A parked browser stays mounted, so it lists again on its next showing rather than on every change behind another tab.
+  useEffect(() => {
+    if (!shown) return
+    void refresh()
+    return storesChanged.subscribe(() => void refresh())
+  }, [refresh, shown])
+
+  const matches = useMemo(() => filterRows(rows ?? [], query), [rows, query])
+  const toggle = (bundlePath: string): void => setChecked((prev) => toggled(prev, bundlePath))
+
+  const one = async (
+    req: Extract<MutateRequest, { bundlePath: string }>,
+    row: BundleRow,
+  ): Promise<void> => {
+    const done = await mutate(req)
+    if (!done) return
+    spendBundle(req.bundlePath)
+    if (done.landedAs)
+      notifyOutcome(`Restored ${steppedTo(row.title, done.landedAs)}`, undefined, [
+        done.unrestored !== undefined && unrestoredLine(done.unrestored),
+        done.cascade?.warning,
+      ])
+  }
+
+  const many = async (
+    targets: BundleRow[],
+    op: 'restore' | 'emptyBundle',
+  ): Promise<{
+    done: BundleRow[]
+    refused: BundleRow[]
+    unrestored: string[]
+    warnings: string[]
+    renamed: string[]
+  }> => {
+    const done: BundleRow[] = []
+    const refused: BundleRow[] = []
+    const unrestored: string[] = []
+    const warnings = new Set<string>()
+    const renamed: string[] = []
+    if (changesSettled(op)) await flushAllSaves()
+    for (const row of targets) {
+      const res = await dialer().ask('mutate', { op, bundlePath: row.bundlePath })
+      ;(res.ok ? done : refused).push(row)
+      if (!res.ok) continue
+      spendBundle(row.bundlePath)
+      unrestored.push(...(res.value.unrestored ?? []))
+      if (res.value.cascade?.warning) warnings.add(res.value.cascade.warning)
+      if (res.value.landedAs) renamed.push(steppedTo(row.title, res.value.landedAs))
+    }
+    await refresh()
+    return { done, refused, unrestored, warnings: [...warnings], renamed }
+  }
+
+  const restoreBatch = async (targets: BundleRow[]): Promise<void> => {
+    const addressable = targets.filter((r) => r.homeResolves)
+    const { done, refused, unrestored, warnings, renamed } = await many(addressable, 'restore')
+    const homeless = targets.filter((r) => !r.homeResolves)
+    notifyOutcome(
+      `Restored ${countPhrase(done)}`,
+      renamed.length > 1 ? `${renamed.length} Renamed` : renamed[0],
+      [
+        homeless.length > 0 &&
+          `${countPhrase(homeless)} had nowhere to go — restore those one at a time to choose where.`,
+        refused.length > 0 && `${countPhrase(refused)} couldn’t be restored.`,
+        unrestored.length > 0 && unrestoredLine(unrestored),
+        ...warnings,
+      ],
+    )
+  }
+
+  const emptyBatch = async (targets: BundleRow[]): Promise<void> => {
+    if (!(await askEmptyTrash(targets.length))) return
+    const { done, refused, warnings } = await many(targets, 'emptyBundle')
+    notifyOutcome(`Deleted ${countPhrase(done)}`, undefined, [
+      refused.length > 0 && `${countPhrase(refused)} couldn’t be deleted.`,
+      ...warnings,
+    ])
+  }
+
+  const openMenu = async (row: BundleRow): Promise<void> => {
+    const targets = actedOn(checked, matches, row, (r) => r.bundlePath)
+    const batch = targets.length > 1
+    const destinationKind = row.kind === 'space' ? ('context' as const) : ('container' as const)
+    const action = await popMenu(
+      restoreMenuItems({
+        batch,
+        ...(!batch && !row.homeResolves
+          ? {
+              destinations:
+                destinationKind === 'context' ? contextTargets(tree) : containerTargets(tree),
+            }
+          : {}),
+      }),
+    )
+    if (!action) return
+    if (action.startsWith('restoreTo:')) {
+      const destination = { kind: destinationKind, id: action.slice('restoreTo:'.length) }
+      await one({ op: 'restore', bundlePath: row.bundlePath, destination }, row)
+      return
+    }
+    switch (action) {
+      case 'restore':
+        if (batch) await restoreBatch(targets)
+        else await one({ op: 'restore', bundlePath: row.bundlePath }, row)
+        break
+      case 'delete':
+        if (batch) await emptyBatch(targets)
+        else if (await askEmptyTrash(1))
+          await one({ op: 'emptyBundle', bundlePath: row.bundlePath }, row)
+        break
+    }
+  }
+
+  return { rows, failed, matches, checked, toggle, openMenu, date }
+}
```

```Core/Settings/TrashFrame.tsx diff
@@ imports @@
-import { useCallback, useEffect, useMemo, useState } from 'react'
+import { useState } from 'react'
 import { Checkbox } from '@pommora/uix/Controls/Checkbox'
 import { SearchField } from '@pommora/uix/Fields/SearchField'
 import { overScrollEllipsis } from '@pommora/uix/Interactions/OverScroll'
 import { Scrollbar } from '@pommora/uix/Interactions/Scrollbar'
 import { NavTrail } from '@pommora/uix/Elements/NavTrail'
 import { MenuItem } from '@pommora/uix/Menus'
 import { overlay } from '@pommora/uix/Menus/menu-row.css'
-import { actedOn, retained, toggled } from '@pommora/uix/Utilities/checkSet'
 import { cx } from '@pommora/uix/Utilities/cx'
-import { capitalize } from '@pommora/uix/Utilities/capitalize'
 import { Icon } from '@pommora/uix/Symbols'
 import { entityIcon } from '../Assets/entityIconPolicy'
-import { itemCount } from '../Properties/properties'
 import { text } from '@pommora/uix/Theme'
-import { askEmptyTrash, spendBundle } from '../Interface/Confirm/confirmations'
-import { changesSettled, type MutateRequest } from '../Nexus/mutateRequest'
 import type { Personalization } from './personalization'
 import type { BundleRow } from '../Bundles/rows'
 import { PropertyTypeIcon, propertyTypeIconName } from '../Properties/Cells/PropertyTypes'
-import { formatDate } from '../Properties/formatValue'
-import { containerTargets, contextTargets } from '../Actions/destinationTree'
-import { matchQuery, rankMatches } from '../Paths/caseFold'
 import { useSession } from '../Session/store'
-import { flushAllSaves, storesChanged } from '../Session/nexusSlice'
 import { personalizationOf } from '../Session/configSlice'
-import { notifyOutcome, unrestoredLine } from '../Interface/Notifications/notifications'
-import { dialer } from '../Platform/dialer'
-import { popMenu } from '../Actions/menuActions'
-import { restoreMenuItems } from '../Actions/restoreMenu'
-import { parseStyleAction, styleMenuItems } from '../Actions/columnMenu'
-import { dateDefaults, holdsStyle, resolveStyle, storedPick } from '../Properties/columnStyles'
-import { useNexusForms } from '../Views/Host/useColumnStyles'
+import { useBundleBrowser } from '../Bundles/browser'
 import '../Navigation/nav-list.css'
 import './trash-frame.css'
-
-const PLURALS: Record<BundleRow['kind'], string> = {
-  page: 'Pages',
-  collection: 'Collections',
-  set: 'Sets',
-  space: 'Spaces',
-  context: 'Contexts',
-  property: 'Properties',
-}
-
-export function countPhrase(rows: BundleRow[]): string {
-  const kinds = new Set(rows.map((r) => r.kind))
-  const kind = kinds.size === 1 ? [...kinds][0] : null
-  if (kind === null) return itemCount(rows.length)
-  return rows.length === 1 ? `1 ${capitalize(kind)}` : `${rows.length} ${PLURALS[kind]}`
-}
-
-const steppedTo = (title: string, landedAs: string): string => `“${title}” as “${landedAs}”`
-
-export function filterRows(rows: BundleRow[], query: string): BundleRow[] {
-  const q = matchQuery(query)
-  if (!q) return rows
-  return rankMatches(rows, q, (row) => row.match)
-}
 
 // Keyed on the nexus so a switch with Settings open mounts a body with its own list.
 export function TrashFrame(): React.JSX.Element {
@@ TrashBody @@
 function TrashBody(): React.JSX.Element {
-  const nexus = useNexusForms()
-  const stored = useSession((s) => personalizationOf(s).trashColumnStyle)
-  // The Trash shows each deletion's time, where a view's date column leaves it hidden.
-  const defaults = { ...dateDefaults(nexus.dateFormat), time_format: nexus.clock }
-  const style = resolveStyle(stored, defaults, nexus.clock)
-  const setPersonalization = useSession((s) => s.setPersonalization)
-  const defaultIcons = useSession((s) => personalizationOf(s).defaultIcons)
-  const tree = useSession((s) => s.tree)
-  const mutate = useSession((s) => s.mutate)
-  const [rows, setRows] = useState<BundleRow[] | null>(null)
-  const [failed, setFailed] = useState(false)
   const [query, setQuery] = useState('')
-  const [checked, setChecked] = useState<ReadonlySet<string>>(new Set())
-
-  const refresh = useCallback(async (): Promise<void> => {
-    const res = await dialer().ask('bundles:list', { kind: 'trash' })
-    if (!res.ok) {
-      setFailed(true)
-      return
-    }
-    setFailed(false)
-    setRows(res.value)
-    const live = new Set(res.value.map((r) => r.bundlePath))
-    setChecked((prev) => retained(prev, live))
-  }, [])
-
-  useEffect(() => {
-    void refresh()
-    return storesChanged.subscribe(() => void refresh())
-  }, [refresh])
-
-  const shown = useMemo(() => filterRows(rows ?? [], query), [rows, query])
-  const toggle = (bundlePath: string): void => setChecked((prev) => toggled(prev, bundlePath))
-
-  const one = async (
-    req: Extract<MutateRequest, { bundlePath: string }>,
-    row: BundleRow,
-  ): Promise<void> => {
-    const done = await mutate(req)
-    if (!done) return
-    spendBundle(req.bundlePath)
-    if (done.landedAs)
-      notifyOutcome(`Restored ${steppedTo(row.title, done.landedAs)}`, undefined, [
-        done.unrestored !== undefined && unrestoredLine(done.unrestored),
-        done.cascade?.warning,
-      ])
-  }
-
-  const many = async (
-    targets: BundleRow[],
-    op: 'restore' | 'emptyBundle',
-  ): Promise<{
-    done: BundleRow[]
-    refused: BundleRow[]
-    unrestored: string[]
-    warnings: string[]
-    renamed: string[]
-  }> => {
-    const done: BundleRow[] = []
-    const refused: BundleRow[] = []
-    const unrestored: string[] = []
-    const warnings = new Set<string>()
-    const renamed: string[] = []
-    if (changesSettled(op)) await flushAllSaves()
-    for (const row of targets) {
-      const res = await dialer().ask('mutate', { op, bundlePath: row.bundlePath })
-      ;(res.ok ? done : refused).push(row)
-      if (!res.ok) continue
-      spendBundle(row.bundlePath)
-      unrestored.push(...(res.value.unrestored ?? []))
-      if (res.value.cascade?.warning) warnings.add(res.value.cascade.warning)
-      if (res.value.landedAs) renamed.push(steppedTo(row.title, res.value.landedAs))
-    }
-    await refresh()
-    return { done, refused, unrestored, warnings: [...warnings], renamed }
-  }
-
-  const restoreBatch = async (targets: BundleRow[]): Promise<void> => {
-    const addressable = targets.filter((r) => r.homeResolves)
-    const { done, refused, unrestored, warnings, renamed } = await many(addressable, 'restore')
-    const homeless = targets.filter((r) => !r.homeResolves)
-    notifyOutcome(
-      `Restored ${countPhrase(done)}`,
-      renamed.length > 1 ? `${renamed.length} Renamed` : renamed[0],
-      [
-        homeless.length > 0 &&
-          `${countPhrase(homeless)} had nowhere to go — restore those one at a time to choose where.`,
-        refused.length > 0 && `${countPhrase(refused)} couldn’t be restored.`,
-        unrestored.length > 0 && unrestoredLine(unrestored),
-        ...warnings,
-      ],
-    )
-  }
-
-  const emptyBatch = async (targets: BundleRow[]): Promise<void> => {
-    if (!(await askEmptyTrash(targets.length))) return
-    const { done, refused, warnings } = await many(targets, 'emptyBundle')
-    notifyOutcome(`Deleted ${countPhrase(done)}`, undefined, [
-      refused.length > 0 && `${countPhrase(refused)} couldn’t be deleted.`,
-      ...warnings,
-    ])
-  }
-
-  const openColumnMenu = async (): Promise<void> => {
-    const action = await popMenu(styleMenuItems({ type: 'dateTime', current: style }))
-    const pick = action ? parseStyleAction(action) : null
-    if (!pick) return
-    const next = { ...stored, [pick.key]: storedPick(pick.key, pick.value, defaults, nexus.clock) }
-    setPersonalization('trashColumnStyle', holdsStyle(next) ? next : undefined)
-  }
-
-  const openMenu = async (row: BundleRow): Promise<void> => {
-    const targets = actedOn(checked, shown, row, (r) => r.bundlePath)
-    const batch = targets.length > 1
-    const destinationKind = row.kind === 'space' ? ('context' as const) : ('container' as const)
-    const action = await popMenu(
-      restoreMenuItems({
-        batch,
-        ...(!batch && !row.homeResolves
-          ? {
-              destinations:
-                destinationKind === 'context' ? contextTargets(tree) : containerTargets(tree),
-            }
-          : {}),
-      }),
-    )
-    if (!action) return
-    if (action.startsWith('restoreTo:')) {
-      const destination = { kind: destinationKind, id: action.slice('restoreTo:'.length) }
-      await one({ op: 'restore', bundlePath: row.bundlePath, destination }, row)
-      return
-    }
-    switch (action) {
-      case 'restore':
-        if (batch) await restoreBatch(targets)
-        else await one({ op: 'restore', bundlePath: row.bundlePath }, row)
-        break
-      case 'delete':
-        if (batch) await emptyBatch(targets)
-        else if (await askEmptyTrash(1))
-          await one({ op: 'emptyBundle', bundlePath: row.bundlePath }, row)
-        break
-    }
-  }
+  const { rows, failed, matches, checked, toggle, openMenu, date } = useBundleBrowser(
+    { kind: 'trash' },
+    { query, shown: true },
+  )
+  const defaultIcons = useSession((s) => personalizationOf(s).defaultIcons)
 
   return (
@@ the date head @@
-          onContextMenu={(e) => {
-            e.preventDefault()
-            void openColumnMenu()
-          }}
+          onContextMenu={date.onContextMenu}
@@ the rows @@
-      ) : shown.length === 0 ? (
+      ) : matches.length === 0 ? (
         <div className={cx('trash-empty', text.body.standard)}>
           {rows.length === 0 ? 'Trash is empty.' : 'Nothing matches.'}
         </div>
       ) : (
         <>
           <div className="trash-scroll scroll-fade">
             <div className="nav-list">
-              {shown.map((row) => (
+              {matches.map((row) => (
                 <TrashRowView
@@ TrashRowView's time @@
                   defaultIcons={defaultIcons}
-                  when={
-                    row.storedAt === null
-                      ? ''
-                      : formatDate(
-                          new Date(row.storedAt).toISOString(),
-                          style.date_format,
-                          style.time_format,
-                          style.weekday,
-                        )
-                  }
+                  when={date.when(row.storedAt)}
                 />
```

```Core/Settings/personalization.ts diff
@@ :197 @@
   trashColumnStyle: setting(columnStyle),
+  archiveColumnStyle: setting(columnStyle),
```

```Core/Testing/fixtures.ts diff
@@ imports @@
 import { pageKey } from '../Connections/pageIndex'
+import type { BundleRow } from '../Bundles/rows'
 import type { CascadeChange } from '../Nexus/cascade'
 import type { PageDetail } from '../Pages/pageDetail'
+import { matchKey } from '../Paths/caseFold'
 import { machine } from '../Platform/machine'
@@ detail @@
+
+export function bundleRow(over: Partial<BundleRow> = {}): BundleRow {
+  const { title = 'Alpha', crumbs = [{ kind: 'collection', title: 'Notes' }] } = over
+  return {
+    bundlePath: `.trash/${over.title ?? 'x'}.deleted`,
+    kind: 'page',
+    title,
+    crumbs,
+    storedAt: 0,
+    homeResolves: true,
+    match: matchKey(title, crumbs.map((c) => c.title).join('/')),
+    ...over,
+  }
+}
```

```Core/Bundles/browser.test.ts diff
+import { describe, expect, it } from 'vitest'
+import { countPhrase, filterRows } from './browser'
+import { bundleRow as row } from '../Testing/fixtures'
+
+describe('filterRows', () => {
+  const rows = [
+    row({ title: 'Alpha', crumbs: [{ kind: 'collection', title: 'Notes' }] }),
+    row({ title: 'Beta', crumbs: [{ kind: 'collection', title: 'Journals' }] }),
+    row({ title: 'Gamma', crumbs: [] }),
+  ]
+
+  it('an empty query keeps the list whole and in the order it arrived', () => {
+    expect(filterRows(rows, '').map((r) => r.title)).toEqual(['Alpha', 'Beta', 'Gamma'])
+    expect(filterRows(rows, '   ')).toBe(rows)
+  })
+
+  it('matches a title', () => {
+    expect(filterRows(rows, 'bet').map((r) => r.title)).toEqual(['Beta'])
+  })
+
+  it('matches a location, so a row is findable by where it lived', () => {
+    expect(filterRows(rows, 'journ').map((r) => r.title)).toEqual(['Beta'])
+  })
+
+  it('matches a location and a title together, a / reading as a word break', () => {
+    expect(filterRows(rows, 'notes/alpha').map((r) => r.title)).toEqual(['Alpha'])
+  })
+
+  it('a query nothing answers yields nothing', () => {
+    expect(filterRows(rows, 'zzz')).toEqual([])
+  })
+
+  it('a row with no location is still matched on its title alone', () => {
+    expect(filterRows(rows, 'gamma').map((r) => r.title)).toEqual(['Gamma'])
+  })
+
+  it('narrows in place, keeping the order it arrived in rather than ranking the best match first', () => {
+    const listed = [row({ title: 'Notes Archive', crumbs: [] }), row({ title: 'Notes', crumbs: [] })]
+    expect(filterRows(listed, 'notes').map((r) => r.title)).toEqual(['Notes Archive', 'Notes'])
+  })
+})
+
+describe('countPhrase', () => {
+  it('names the kind when every row shares one', () => {
+    expect(countPhrase([row({}), row({})])).toBe('2 Pages')
+    expect(countPhrase([row({ kind: 'set' }), row({ kind: 'set' })])).toBe('2 Sets')
+    expect(countPhrase([row({ kind: 'context' }), row({ kind: 'context' })])).toBe('2 Contexts')
+  })
+
+  it('generalizes when they do not', () => {
+    expect(countPhrase([row({}), row({ kind: 'space' })])).toBe('2 Items')
+  })
+
+  it('stays singular for one', () => {
+    expect(countPhrase([row({})])).toBe('1 Page')
+    expect(countPhrase([row({ kind: 'space' })])).toBe('1 Space')
+  })
+
+  it('reports none honestly', () => {
+    expect(countPhrase([])).toBe('0 Items')
+  })
+})
```

```Core/Settings/TrashFrame.test.tsx diff
@@ imports @@
-import type { BundleRow } from '../Bundles/rows'
-import { matchKey } from '../Paths/caseFold'
-import { countPhrase, filterRows, TrashFrame } from './TrashFrame'
+import type { BundleRow } from '../Bundles/rows'
+import { TrashFrame } from './TrashFrame'
+import { bundleRow as row } from '../Testing/fixtures'
@@ the row builder and the moved describes @@
-const row = (over: Partial<BundleRow>): BundleRow => {
-  const { title = 'Alpha', crumbs = [{ kind: 'collection', title: 'Notes' }] } = over
-  return {
-    bundlePath: `.trash/${over.title ?? 'x'}.deleted`,
-    kind: 'page',
-    title,
-    crumbs,
-    storedAt: 0,
-    homeResolves: true,
-    match: matchKey(title, crumbs.map((c) => c.title).join('/')),
-    ...over,
-  }
-}
-
-describe('filterRows', () => {
-  …six cases, moved to Core/Bundles/browser.test.ts…
-})
-
-describe('countPhrase', () => {
-  …four cases, moved to Core/Bundles/browser.test.ts…
-})
-
 describe('a Trash row', () => {
```


**VERIFY**

- [ ] `Core/Bundles/browser.test.ts` and `TrashFrame.test.tsx`'s DOM cases pass, the latter unchanged but for their imports and builder.
- [ ] `git grep -n "rankMatches\|countPhrase\|filterRows\|useNexusForms\|styleMenuItems" -- Core/Settings` finds nothing.
- [ ] `git grep -n "Bundles/browser" -- Core Desktop` finds `Core/Settings/TrashFrame.tsx` alone (`browser.test.ts` imports `./browser`); `git grep -n "useDateColumn\|rulesOf" -- Core` finds `browser.ts` alone; `npm run test -- engineGraph hostGraph` passes.
- [ ] Run the gates.
- [ ] Check for unnecessary code or mistakes.

**Lines:** +59 (+258 / −199): `browser.ts` +230 against TrashFrame's +11 / −199 (about 165 lines moved, counted on both sides); `rulesOf` +9; `archiveColumnStyle` +1; `Core/Testing/fixtures.ts`' `bundleRow` +16 (counted as code); the rest is the generalization and imports. Tests −25 apart (`browser.test.ts` +56, `TrashFrame.test.tsx` −81).

#### Task 5-6

**TASK:** The Deletion section takes K-5's Permanently Delete Files hint and two copy fixes (Confirm Before Deletion's hint names every kind that always asks; the system-mode detail spells "system trash" as the hints do), and drive group 5 lands.

**NOW:** Task 5-5 has landed. The Deletion section is `Core/Settings/frames.ts:582-604`: its title `:583`; Confirm Before Deletion's hint (`:589`) omits the Spaces and Contexts `ALWAYS_ASKS` holds (`Core/Interface/Confirm/confirmations.ts:29-34`); the Permanently Delete Files hint `:595`. `confirmDelete`'s system-mode detail spells "system Trash" (`confirmations.ts:78`).

**CHANGE**

- [ ] Write the test and watch it fail: `Core/Interface/Confirm/confirmations.test.ts` gains "a delete under the system Trash Mode says it moves to the system trash".
- [ ] `Core/Settings/frames.ts`: Confirm Before Deletion's hint names Contexts and Spaces; the Permanently Delete Files hint reads *§Copy*'s K-5 line; the title stays until Task 6A-1.
- [ ] `Core/Interface/Confirm/confirmations.ts:78`: `system trash`.
- [ ] `.claude/scripts/Archive Drive/live-drive.mjs` and `MATRIX.md`: group 5 (below); `ALL` gains `'5'`, dispatched by `if (GROUPS.has('5')) await group5(cdp)` after group 4.

**AFTER**

```Core/Interface/Confirm/confirmations.test.ts diff
@@ what the Confirm Before Deletion switch governs @@
+  it('a delete under the system Trash Mode says it moves to the system trash', async () => {
+    ;(window as unknown as { nexus: unknown }).nexus = stubDialer({
+      'delete:facts': async () => ok({ trashMode: 'system', permanentDelete: false }),
+    })
+    const details: string[] = []
+    useSession.setState({
+      tree: makeTree(),
+      askConfirm: async (r) => {
+        details.push(r.detail)
+        return false
+      },
+    })
+    await confirmDelete({ path: 'Notes/Alpha.md', kind: 'page', title: 'Alpha' })
+    expect(details).toEqual(['It will be moved to the system trash.'])
+  })
```

```Core/Settings/frames.ts diff
@@ Deletion @@
       {
         title: 'Deletion',
         rows: [
           {
             kind: 'toggle',
             key: 'confirmDeletion',
             label: 'Confirm Before Deletion',
-            hint: 'Ask before deleting a page, a tile, or a folder that carries no schema. Collections, Sets, views and properties always ask.',
+            hint: 'Ask before deleting a page, a tile, or a folder that carries no schema. Collections, Sets, Contexts, Spaces, views and properties always ask.',
           },
           {
             kind: 'toggle',
             key: 'permanentDelete',
             label: 'Permanently Delete Files',
-            hint: 'Permanently deleted files will be deleted from this computer, keeping this off will move them to system trash.',
+            hint: 'Erase items emptied from the Trash instead of moving them to the system trash.',
           },
```

```Core/Interface/Confirm/confirmations.ts diff
@@ confirmDelete @@
         trashMode === 'system'
-          ? 'It will be moved to the system Trash.'
+          ? 'It will be moved to the system trash.'
           : 'It will be moved to the nexus’s .trash folder (recoverable).',
```

**Drive group 5** (`.claude/scripts/Archive Drive/live-drive.mjs` › `group5(cdp)`, each row an `item(5, 5, …)`; `MATRIX.md` gains the table below). Seeds: pages `G5 One`, `G5 Two`, `G5 Note`, and `G5 Note Long` created in `Collection A/Set Alpha` through the harness's `createPage` (ids recorded in `pageIds`), then deleted through `ask(cdp, 'mutate', …)` in that order with a pause between each (stamps are milliseconds, so the Trash lists `G5 Note Long`, `G5 Note`, `G5 Two`, `G5 One`); a page `G5 Diff` whose body is a `diff` fence of `+a`, `+b`, `-c`; `permanentDelete: true` through `personalization:set` before the Delete All row, so the empty erases rather than filling the system trash; `iconFavorites: ['alarm-clock']` before the icon-picker row (without the strip the list's offset is 0, where `offsetTop` and the rect difference agree). Cleanup: the group reads `permanentDelete` and `iconFavorites` from `settings.json`'s personalization at its start and writes each back through `personalization:set` at its end, an absent key as `null` (read as absent, `Core/Settings/personalization.ts:98`); the harness restores `~/Test`.

```.claude/scripts/Archive Drive/MATRIX.md diff
+#### Group 5 — Shared Chrome
+
+| Check | Assertion | Kind |
+| --- | --- | --- |
+| `[g5 G-1] the Trash keeps its look and lists newest first` | Settings › Trash: `.trash-frame.table` holds `.nav-search-row`, then `.trash-head.table-head` with `.trash-head-name` and `.trash-head-date`, then `.trash-row.table-divider` rows; the rows' `Select …` labels begin `G5 Note Long, G5 Note, G5 Two, G5 One`; `shot` beside it | DOM |
+| `[g5 G-1] typed search narrows in place, keeping newest first` | typing `g5 note` in the Trash's search field leaves exactly `['G5 Note Long', 'G5 Note']` (ranking would put `G5 Note` first); clearing the field restores the four | DOM |
+| `[g5 K-4] one row's menu reads Restore and Delete` | `chooseNative` on the unchecked `G5 One` row, path `[]`: rows `['Restore', 'Delete']` | native rows |
+| `[g5 K-4] a checked row's menu names the batch; an unchecked one acts alone` | with `G5 One` and `G5 Two` checked: on `G5 Two`, `['Restore All', 'Delete All']`; on the unchecked `G5 Note`, `['Restore', 'Delete']` | native rows |
+| `[g5 K-4] Restore All restores the checked rows` | choose `Restore All` on `G5 Two`: both `.md` files exist under `Collection A/Set Alpha` and their bundles are gone from `.trash`; the list holds neither; the label's text starts `Restored 2 Pages` | disk, DOM |
+| `[g5 K-3] a notice posted under the pointer drains` | right after it posts, `mouseMoved` to the label's centre and 10 px across it, never leaving: the label's host gains `inert` within 4500 ms | DOM |
+| `[g5 K-4] Delete All empties the checked rows` | with `G5 Note` and `G5 Note Long` checked, choose `Delete All` on one: the dialog reads `Delete these 2 Items?`; Delete: both bundles are gone from `.trash`; the label's text starts `Deleted 2 Pages` | DOM, disk |
+| `[g5 K-3] once the pointer has left its band, returning stalls the drain and leaving drains it` | right after that notice posts, `mouseMoved` far from it (the window's bottom-left), then into its band: no `inert` after 5000 ms; `mouseMoved` far again: `inert` within 4500 ms | DOM |
+| `[g5 G-1] the date column's right-click picks a style and returns to the Nexus's own` | `chooseNative` on `.trash-head-date`, `Short Date`: `.nexus/settings.json` holds `trashColumnStyle: { date_format: 'short' }`; then the Nexus's own form (`Full Date` on `~/Test`): the key is gone | native rows, disk |
+| `[g5 4.7] the icon picker's rows sit where its list starts and virtualize while scrolled` | with `iconFavorites: ['alarm-clock']` seeded (so the favorites strip sits above the list and its offset isn't 0), close Settings and open `G5 One` from Collection A's table (`openCollection`, then the harness's `openPage`), `chooseNative` on `.detail-title-text`, `Edit Icon`: the list's top lies below the strip and the first rendered row's top equals it; after setting the grid's `scrollTop` to 600 and a frame, fewer rows are rendered than the icon set holds and one row spans the grid's top edge; Escape closes | DOM |
+| `[g5 G-6] the lock glyph cross-fades through the one swap` | `setDisclosureLock` on `Collection A`, locked: its sidebar `Unlock Folder` button holds one swap whose closed-lock face is `data-face="shown"` and whose open face carries `inert` and `aria-hidden="true"`; unlocked, with the row hovered: the `Lock Folder` button's faces are the other way round | DOM |
+| `[g5 G-6] Clear History cross-fades to Cleared, holds, and returns` | Settings › Files & Links › Clear History: the button's shown face reads `Clear` at width `w`; press, answer the dialog's Clear: the shown face reads `Cleared`, the `Clear` face carries `inert` and `aria-hidden="true"`, the width is still `w`; after 1800 ms the shown face reads `Clear` | DOM |
+| `[g5 G-6] Sync Now rides the same label` | SKIP: the harness runs no sync hub; `NexusRows` reads the `useTimedLabel` the Clear History row proves | — |
+| `[g5 G-6] the diff tally swaps its counts for Copied in place` | open `G5 Diff`, `mouseClick` the `.codeblock-tally`: its faces read hidden counts and shown `Copied`, the pill's width is unchanged, the tag carries `.is-copied`; after 1800 ms the counts are shown and `.is-copied` is gone | DOM |
+| `[g5 K-5] Settings › Files & Links' Deletion section reads its rewritten hints` | Permanently Delete Files' caption is `Erase items emptied from the Trash instead of moving them to the system trash.`; Confirm Before Deletion's ends `Collections, Sets, Contexts, Spaces, views and properties always ask.` | DOM |
+| `[g5 K-4] File History's batch offers Delete All alone` | SKIP: two snapshots need two saves a Snapshot Interval apart; `restoreMenu.test.ts` pins the rows and `actedOn` the batch | — |
+| `[g5 K-5] a delete under the system Trash Mode names the system trash` | SKIP: the Trash Mode is device configuration the harness doesn't write; `confirmations.test.ts` pins the detail | — |
```


**VERIFY**

- [ ] The new `confirmations.test.ts` case passes.
- [ ] `git grep -n "system Trash\|Permanently deleted files" -- Core/Interface/Confirm/confirmations.ts Core/Settings/frames.ts` finds nothing (`Core/Trash/trashMode.ts`' doc and the new test titles say "system Trash" of the mode, not the copy).
- [ ] Run the gates.
- [ ] Drive groups 1 to 5 pass (`POMMORA_ARCHIVE_LANDED=5`).
- [ ] Check for unnecessary code or mistakes.

**Lines:** ±0 (+3 / −3): the two hints in `frames.ts`, the detail in `confirmations.ts`. Tests: the `confirmations.test.ts` case +15. The drive group apart.

#### Review Checkpoint

- [ ] `UIX/Animations/Swap.test.tsx`, `UIX/Utilities/checkSet.test.ts`, `Core/Actions/restoreMenu.test.ts`, `Core/Bundles/browser.test.ts`, `Core/Interface/Notifications/ActionLabel.test.tsx`, `Core/MarkdownPM/codeDiff.test.tsx`, `Core/Settings/NexusRows.test.tsx`, `Core/Settings/TrashFrame.test.tsx`, `Core/Interface/Confirm/confirmations.test.ts`, and `UIX/Pickers/IconPicker.test.tsx` pass; `engineGraph.test.ts` and `hostGraph.test.ts` pass with `browser.ts` renderer-only.
- [ ] The phase's greps find nothing: `glyphSwap`, `COPIED_MS`, `ACTIVE_MS`, `codeblock-tally-copied`, `NotificationLabel`, `notification-label`, `trashMenuItems`, `fileHistoryMenuItems`, `'restoreAll'`, `'deleteAll'`, and `rankMatches` in `Core/Settings`; `@tanstack/react-virtual` is imported by `UIX/Interactions/virtualRows.ts` alone.
- [ ] Run the gates.
- [ ] The Archive Drive passes groups 1 to 5 from the checkout.
- [ ] Two read-only `opus-high` reviewers, to `closeout-review`'s standards, read the phase outward: one swap, one hold, one restore builder, one checked-row rule, one virtualizer seam, and one browser controller, each with its one owner, and the Trash's look unchanged.
- [ ] The Net Ledger records the phase's measured delta beside its estimate, and growth past it is reported in chat before Phase 6A opens, with what it buys (*§Departures and Disclosures*).

#### Departures and Disclosures

##### Departures From the Findings

- **K-3's `armed` Is a Local of the Proximity Effect (5.3):** the Findings reset it with each post beside `nearRef`; the effect re-runs per notice on `[note, shown]`, so a `let armed = false` inside it is false at each post by construction, and `held` returns before touching it. The rule is the Findings'; only the holder differs.
- **`useVirtualRows(options, deps)` (4.7):** the Findings' options gain the re-measure `deps` IconPicker's effect keyed on (`[iconFavs.length, open]`), since a favorites strip appearing above the list moves it without changing any element the hook holds, and `overscan` stays IconPicker's 6, which no consumer asks to change. The hook answers `{ height, rows }` with each `start` already measured from the list's top, so no caller reads TanStack's item type (the Dependencies rule). No `virtualRows.test.tsx`: jsdom lays out no rects, so drive group 5's icon-picker check and group 6B's ArchiveView scroll pin it.
- **The Date Column Lives Inside the Browser Hook (4.2):** the Findings make `useDateColumn(key)` its own shared piece; `useBundleBrowser` reads one `switch (store.kind)`, `rulesOf`, at its head for what the Trash and the Archive do differently and answers the date column itself, its key chosen there, so no caller pairs a second hook with its store by hand. `useDateColumn` turns module-private and answers the heading's `onContextMenu`, so neither browser writes the right-click. The switch holds both stores from the day it lands, so `archiveColumnStyle` lands here as its archive arm, the setting ArchiveView's Archived column reads in 6B-6, `rulesOf` widening in 6B-5 to the delete, the batch question, and the two Undos.

##### Behavior Changes and Disclosures

- **The Swap Fades at Its Host's Beat:** its fade reads `REVEAL_FADE` (`hover-reveal.css.ts:18`), the codebase's opacity fade at the host's beat (root `duration.fast`, `:11`), already worn by buttons and menu rows. `markdown-pm.css:983` sets `--reveal-fade: var(--duration-slow)` over the code block tag, so the pill keeps the 350 ms its counts and glyph slot share today, and `LockGlyph`, the settings labels, and Phase 6B's bar keep 180 ms with no override. Every other `--reveal-fade` override (`tile-grid.css:108`, `tile-title.css:10`, `cards.css:112`, `ghost-create.css:34`, `menu-row.css.ts:176`) scopes an element holding no lock glyph or timed label.
- **The Code Block's Whole Hold Lengthens (5-1):** one timer drives the tag's copied state (`decorations.ts:288-292`), so `DONE_MS` holds the glyph slot's check and the bare name's `Copied` at 1500 ms as well as the tally pill's, 500 ms longer than `COPIED_MS` held them; ruling 17 names the code block's 1000 ms as the hold `DONE_MS` replaces, and the hold is the one MarkdownPM change beyond the pill.
- **`Swap` Wraps Each Face in a Span:** an svg element carries no `inert`, so the wrapper is what makes an icon face inert (Cautionary 29); the face is a grid of its own, so an icon inside it draws with no line box and `LockGlyph`'s box stays as it is. None of the five hosts' stylesheets addresses `LockGlyph`'s svgs as direct children. The code block's pill mirrors the shape in plain DOM (a `swap` host, two `face` spans), flipping `data-face` alone.
- **The Swap's Fixed Cell:** "Copied" now sits centered in the pill rather than at its start, and the pill sizes to the wider face instead of letting an overlay overhang; Settings' Clear button holds "Cleared"'s width at rest (Sync Now is the wider of its pair already). The pill's `position: relative` leaves with the overlay that needed it.
- **`bundleRow` in `Core/Testing/fixtures.ts` (Take Along):** the move splits `TrashFrame.test.tsx`'s builder between two test files, and 6B's `ArchiveView.test.tsx` is a third.
- **The System Trash Mode Is Vitest's:** it's device configuration (`Desktop/Config/appConfig.ts:14`) with no channel the drive can write, so the drive row is a SKIP naming the test.

##### Found False at HEAD

- `bf4d6cfe2` shifted `markdown-pm.css` by two lines after the Findings were written: the tag's `--reveal-fade` is `:983` (the Findings' `:981`), the pill's comment `:1053` (`:1051`), its rules `:1054-1079` (`:1051-1077`), and the overlay `:1069-1079` (`:1062-1077`). `COPIED_MS` is `decorations.ts:209` (the Findings' `:208`).

##### Line Total

| Task | Estimate | Written | Why |
| --- | --- | --- | --- |
| 5-1 | ±0 | +20 | `Swap`'s face wrapper (+10, what makes an icon face inert) and the pill's explicit flip (+7) over the estimate's figure for the tally; imports +7 |
| 5-2 | +2 | +3 | `armed` and the early `held` return |
| 5-3 | −21 | −8 | Biome lays each `checkSet` function over its parameters (+17 against the estimate's +6); imports +2 |
| 5-4 | +10 | +21 | the seam answers its own row shape and takes `deps` |
| 5-5 | −12 | +59 | the hooks' answer types, the keyed refresh, `shown`, `useDateColumn` as its own function, and `rulesOf`, the store switch (+9); the shared fixture +16; imports +8 |
| 5-6 | (in 5-5's) | ±0 | the copy, rewritten in place |
| **Phase 5** | **−21** | **+95** | |

- **The Rule:** the plan's one counting rule (`view-delta`'s Actionable column: source with imports and blank lines as Biome wraps them; comments, tests, documents, and the drive out; moved lines on both sides, named apart; `Core/Testing/` files counted as code, as `view-delta` files them). Imports are +18 of the +95.
- **What the Growth Buys:** the phase folds three swaps, two menu builders, two batch rules, and one controller into one each, and lands net-positive because each shared home states the interface (answer types, the store and `shown` arguments, the seam's own row shape) its single inline consumer never needed. The return is Phase 6B's: ArchiveView takes `useBundleBrowser` with its date column, `useVirtualRows`, `restoreMenuItems`, `actedOn`, and `Swap` rather than restating about 150 lines of controller, an inline virtualizer, and a third swap.

### Phase 6A — Archiving

**GOAL:** Archive joins every page and Set menu directly above Delete in one divided closing section, and a Collection's menu closes on Delete alone; archiving asks under "Confirm Before Archiving" and always posts `Archived “…”` with an Undo; "Archive History Timeframe" sweeps archived pages' snapshots sooner, following History Timeframe until picked and never exceeding it. Folded on the way: one bundling Undo, `waived` taking its switch, the shared Rename and Delete rows, and `LISTED` as the one SQLite list binding. `page:open` has no tree gate (`resolveUnderRoot` + `readPage`), so Phase 6B's reader reads an archived path as is.

In the AFTER blocks below, a `~` line is context as an earlier phase leaves it (its text is that phase's), a space-prefixed line is context at HEAD, and `…` elides unchanged lines.

#### Task 6A-1

**TASK:** Add `confirmArchive` beside `confirmDelete`, asking under the new `confirmArchiving` setting with §Copy's question and always posting `Archived “…”` with an Undo (I-2, I-3). Hoist the bundling Undo (spend itself, then `restore` each bundle, armed in `armed`) into a module-private `offerUndo(bundlePaths, post)` that `notifyTrashed` and `confirmArchive` end in (one path for a delete or an archive, none for a system-trash delete); `waived` takes the switch it reads; `spendBundle` becomes `spendUndo`; the Deletion section is retitled "Trash & Archive" (§Copy) as it takes the archive row.

**NOW:** `Core/Interface/Confirm/confirmations.ts`, as Phases 4-1 (`trashed` → `bundled`) and 5-6 (`:78` → "system trash") leave it: the `ALWAYS_ASKS` doc at `:28`; `waived(kind?)` (`:36-38`) reads `'confirmDeletion'` alone; `spendBundle` (`:42-46`, its doc at `:42` naming "its delete's notice"); `notifyTrashed` (`:48-65`) builds the Undo inline and seats the spend in `armed` (`:54-64`); `confirmDelete` calls `waived(target.kind)` (`:72`), `askRemoveTile` `waived()` (`:92`). `notifyUndoable(message, undo?, …)` (`Core/Interface/Notifications/notifications.ts:106-137`) answers the spend, as `notifyDeleted` does. `mutate` (`Core/Session/nexusSlice.ts:236-258`) answers `null` after posting the refusal itself. Phase 4-2 lands the `archive` op (`{ op: 'archive', path, kind: 'page' | 'set' }` → `bundled: { bundlePath }`). `spendBundle`'s callers are `useBundleBrowser`'s `one` and `many` in `Core/Bundles/browser.ts` (Phase 5-5). `Core/Settings/personalization.ts:192-193`: `confirmDeletion: flag(true)` under a comment restating `ALWAYS_ASKS`'s doc. `Core/Settings/frames.ts:582-604`: the Deletion section (title `:583`, Confirm Before Deletion `:585-590`). `confirmations.test.ts:184` calls `spendBundle`.

**CHANGE**

- [ ] Write and watch fail: `Core/Interface/Confirm/confirmations.test.ts` — ":184 gives up its Undo and the chord once the Trash spends its bundle" calls `spendUndo('.trash/b1')`; new `describe('an archive through the confirmation')`, its own `mutate` mock answering `{ bundled: { bundlePath: BUNDLE } }` (`BUNDLE = '.nexus/archive/c1/Notes/1__A.archived'`), `archive = (kind) => confirmArchive({ path: 'Notes/A', kind, title: 'A' })`: "asks “Archive “A”?” in the positive tone and sends the archive" (a capturing `askConfirm` sees exactly `{ message: 'Archive “A”?', detail: '“A” will be moved to this Collection’s archive, where it can be restored.', action: 'Archive', tone: 'positive' }`; `mutate` gets `{ op: 'archive', path: 'Notes/A', kind: 'page' }`); "with Confirm Before Archiving off, archives a page and a Set unasked, and Confirm Before Deletion has no say" (`makeTree({ personalization: { confirmArchiving: false } })`: `archive('page')`, `archive('set')` leave `asked` empty; `makeTree({ personalization: { confirmDeletion: false } })`: `archive('set')` asks once; `mutate` called three times); "posts Archived “A” with an Undo that restores its bundle, whatever the switch says" (switch off: `currentNotification()` matches `{ message: 'Archived “A”', tone: 'normal', action: { label: 'Undo' } }`, `segment` undefined; running the action calls `mutate` last with `{ op: 'restore', bundlePath: BUNDLE }`); "archives nothing when the question is declined" (`askConfirm` false → no `mutate`).
- [ ] `confirmations.ts`: the `ALWAYS_ASKS` doc (`:28`) governs deletes alone; `waived(key, kind?)`, `confirmDelete` and `askRemoveTile` passing `'confirmDeletion'`; `spendBundle` → `spendUndo`, its doc (`:42`) naming any act's Undo; `offerUndo(bundlePaths, post)` below it, one Undo restoring each path in turn, armed on each; `notifyTrashed`'s body becomes one `offerUndo` call over `bundled ? [bundled.bundlePath] : []`, as `confirmArchive` calls it; `confirmArchive` after `confirmDelete`; `notifyUndoable` joins the notifications import.
- [ ] `personalization.ts`: `confirmArchiving: flag(true)` under `confirmDeletion`; the comment at `:192` leaves (it restates `ALWAYS_ASKS`'s doc and would read as covering the new key).
- [ ] `frames.ts`: the title `'Deletion'` → `'Trash & Archive'`; the Confirm Before Archiving toggle under Confirm Before Deletion, with §Copy's hint.
- [ ] Archive Drive: group 5's K-5 check (Phase 5-6) finds its section by the `Trash & Archive` heading, its name and `MATRIX.md` row following.
- [ ] Sibling sweep: `Core/Bundles/browser.ts` imports and calls `spendUndo` at its two spends (the single-row path and the batch runner); `git grep -n "spendBundle"` finds no other caller (PropertyFrame.tsx:297-299 calls `notifyTrashed`, its signature unchanged).

**AFTER**

```Core/Interface/Confirm/confirmations.ts diff
@@ imports @@
-import { notifyDeleted, reportRefusal } from '../Notifications/notifications'
+import { notifyDeleted, notifyUndoable, reportRefusal } from '../Notifications/notifications'
@@ ALWAYS_ASKS @@
-/** A container, a Context, and a Space each carry everything filed under them, so they ask regardless of the Confirm Before Deletion switch — the switch governs what a single delete takes: a page, a tile, a folder that carries no schema. */
+/** A container, a Context, and a Space each carry everything filed under them, so deleting one asks regardless of the Confirm Before Deletion switch — the switch governs what a single delete takes: a page, a tile, a folder that carries no schema. An archive removes nothing, so it asks under its own switch alone. */
 const ALWAYS_ASKS: ReadonlySet<HeldKind> = new Set<HeldKind>([
@@ waived @@
-const waived = (kind?: HeldKind): boolean =>
+const waived = (key: 'confirmDeletion' | 'confirmArchiving', kind?: HeldKind): boolean =>
   (kind === undefined || !ALWAYS_ASKS.has(kind)) &&
-  !settingOf(personalizationOf(useSession.getState()), 'confirmDeletion')
+  !settingOf(personalizationOf(useSession.getState()), key)
@@ spendUndo @@
-/** A bundle restored or deleted from anywhere spends the Undo its delete's notice offered, so neither the label nor the chord retries it. */
-export function spendBundle(bundlePath: string): void {
+/** A bundle restored or deleted from anywhere spends the Undo its notice offered, a delete's or an archive's, so neither the label nor the chord retries it. */
+export function spendUndo(bundlePath: string): void {
   armed.get(bundlePath)?.()
   armed.delete(bundlePath)
 }
+
+function offerUndo(
+  bundlePaths: readonly string[],
+  post: (undo?: () => Promise<void>) => () => void,
+): void {
+  const spend = post(
+    bundlePaths.length > 0
+      ? async () => {
+          for (const bundlePath of bundlePaths) {
+            spendUndo(bundlePath)
+            await useSession.getState().mutate({ op: 'restore', bundlePath })
+          }
+        }
+      : undefined,
+  )
+  for (const bundlePath of bundlePaths) armed.set(bundlePath, spend)
+}
@@ notifyTrashed @@
 /** A system-trash delete mints no bundle, so it offers no Undo — the artifact left the nexus and there is nothing to name. */
 export function notifyTrashed(
   title: string,
~  { bundled, cascade }: Pick<MutateOutcome, 'bundled' | 'cascade'>,
   retry?: () => void,
 ): void {
-  const spend = notifyDeleted(
-    title,
-    bundled &&
-      (async () => {
-        spendBundle(bundled.bundlePath)
-        await useSession.getState().mutate({ op: 'restore', bundlePath: bundled.bundlePath })
-      }),
-    cascade,
-    retry,
-  )
-  if (bundled) armed.set(bundled.bundlePath, spend)
+  offerUndo(bundled ? [bundled.bundlePath] : [], (undo) =>
+    notifyDeleted(title, undo, cascade, retry),
+  )
 }
@@ confirmDelete @@
-  if (!waived(target.kind)) {
+  if (!waived('confirmDeletion', target.kind)) {
     const { trashMode } = valueOr(await dialer().ask('delete:facts'), DELETE_FACTS_FALLBACK)
   …
   if (done) notifyTrashed(target.title, done)
 }
+
+export const confirmArchive = async (target: {
+  path: string
+  kind: 'page' | 'set'
+  title: string
+}): Promise<void> => {
+  if (!waived('confirmArchiving')) {
+    const yes = await ask({
+      message: `Archive “${target.title}”?`,
+      detail: `“${target.title}” will be moved to this Collection’s archive, where it can be restored.`,
+      action: 'Archive',
+      tone: 'positive',
+    })
+    if (!yes) return
+  }
+  const done = await useSession
+    .getState()
+    .mutate({ op: 'archive', path: target.path, kind: target.kind })
+  if (done)
+    offerUndo(done.bundled ? [done.bundled.bundlePath] : [], (undo) =>
+      notifyUndoable(`Archived “${target.title}”`, undo),
+    )
+}
@@ askRemoveTile @@
 export const askRemoveTile = (): Promise<boolean> =>
-  waived()
+  waived('confirmDeletion')
     ? Promise.resolve(true)
```

```Core/Settings/personalization.ts diff
@@ SETTINGS @@
   permanentDelete: flag(false),
-  // Off skips the confirmation only where nothing owns a schema: a page, a tile, a bare folder.
   confirmDeletion: flag(true),
+  confirmArchiving: flag(true),
   restoreLinksOnDeletion: flag(true),
```

```Core/Settings/frames.ts diff
@@ Trash & Archive @@
-        title: 'Deletion',
+        title: 'Trash & Archive',
         rows: [
           {
             kind: 'toggle',
             key: 'confirmDeletion',
             label: 'Confirm Before Deletion',
~            hint: 'Ask before deleting a page, a tile, or a folder that carries no schema. Collections, Sets, Contexts, Spaces, views and properties always ask.',
           },
+          {
+            kind: 'toggle',
+            key: 'confirmArchiving',
+            label: 'Confirm Before Archiving',
+            hint: 'Ask before archiving a page or a Set.',
+          },
           {
             kind: 'toggle',
             key: 'permanentDelete',
```

```.claude/scripts/Archive Drive/MATRIX.md diff
@@ Group 5 @@
-| `[g5 K-5] Settings › Files & Links' Deletion section reads its rewritten hints` | …
+| `[g5 K-5] Settings › Files & Links' Trash & Archive section reads its rewritten hints` | …
```

```Core/Bundles/browser.ts diff
@@ imports @@
-import { askEmptyTrash, spendBundle } from '../Interface/Confirm/confirmations'
+import { askEmptyTrash, spendUndo } from '../Interface/Confirm/confirmations'
@@ one @@
~    const done = await mutate(req)
~    if (!done) return
-    spendBundle(req.bundlePath)
+    spendUndo(req.bundlePath)
@@ many @@
~      if (!res.ok) continue
-      spendBundle(row.bundlePath)
+      spendUndo(row.bundlePath)
```

**VERIFY**

- [ ] The listed tests pass; ":162 with the switch off, deletes a page unasked while a container, Space, or Context still asks" and ":217 offers no Undo for a system-trash delete" pass unchanged (the hoisted Undo keeps both arms).
- [ ] `git grep -n "spendBundle" -- Core Desktop` and `git grep -n "title: 'Deletion'" -- Core` find nothing.
- [ ] `git grep -n "waived(" -- Core` finds only calls naming `'confirmDeletion'` or `'confirmArchiving'`.
- [ ] `git grep -n "Deletion section" -- ".claude/scripts/Archive Drive"` finds nothing.
- [ ] Run the gates.
- [ ] Check for unnecessary code or mistakes.

**Lines:** +39 (+60 / −21): `offerUndo` +16 against `notifyTrashed`'s −10 (its one call +3), `confirmArchive` +23, the row +6; the retitle, the key against the dropped comment, the browser's spends, and the renames ±0. Tests apart.

#### Task 6A-2

**TASK:** Put Archive directly above Delete in one divided closing section of every page and Set menu (I-1), as `ARCHIVE_ROW` and `REMOVAL_ROWS`, run by `runPageAction` (pages) and `runEntityAction` (Sets); a Collection closes on Delete alone. The container, Space, and Context menus take the shared `RENAME_ROW` and `DELETE_ROW`, so `'delete'` leaves `EntityMenuAction` and one Rename, one Archive, and one Delete row exist.

**NOW:** `Core/Actions/pageMenu.ts`: `PageMetaAction` (`:5-16`) ends in `'title:delete'`; the row constants (`:35-40`) are all exported; `PAGE_ACTION_ROWS` and `pageMetaMenuItems` close on `[DELETE_ROW]` (`:104`, `:132`), and every page menu builds from them. Page actions run through `runPageAction` (`Core/Interface/Menus/pageMenuActions.ts:35-72`); only the view runner (`useViewInteractions.tsx:404`) brings it the cell and card menus' Delete. `Core/Actions/entityMenu.ts`: `EntityMenuAction` carries a bare `'delete'` (`:33`); the container branch groups literal Rename and Delete rows (`:64-67`); the Space and Context branch closes on a literal Delete (`:95`). `Core/Interface/Menus/entityMenuActions.ts`: `runEntityAction` routes a page with an id to `runPageAction` (`:106`), shares one body for `'title:rename'` and `'rename'` (`:118-121`; `'rename'` is also Spaces' and Contexts' `titleMenuItems` action), and runs `case 'delete'` (`:133-135`). Every `showEntityMenu` caller hands a page its id; `GroupBand.tsx:167-172` hands a band Set none. Context menus with no trigger pop natively (`Core/Actions/menuActions.ts:12`).

**CHANGE**

- [ ] Write and watch fail: `Core/Actions/pageMenu.test.ts` — ":15 groups its rows, with Reveal joining History only where it is asked for" ends `'—', 'Archive', 'Delete'`; ":87" → "hold Rename, the send and locate rows as one group without Move To, and Archive above Delete", the same ending. `Core/Actions/entityMenu.test.ts` — ":20 a page draws the whole page menu, Reveal included" lists `'title:archive'` before `'title:delete'`; ":41" → "a sidebar collection opens, creates, renames, locks, copies its path, and reveals, closing on Delete alone": `['New Tab', '—', 'New Page', '—', 'Rename', '—', 'Lock Folder', 'Copy Path', 'Reveal Location', '—', 'Delete']`, no `'title:archive'`, `items.at(-1)?.action` `'title:delete'`; ":62" → "a band set neither opens nor locks and closes on Archive above Delete, and a context without creators starts at Rename": the Set `['New Page', '—', 'Rename', '—', 'Copy Path', 'Reveal Location', '—', 'Archive', 'Delete']`, the Context `['Rename', 'Edit Icon', '—', 'Delete']`, its last action `'title:delete'`. `Core/Actions/cellMenu.test.ts` — ":8" → "title: Preview + stateful Open row + Rename + Edit Icon + New Page pair + the send block + separator-gated Archive and Delete": `['Archive', 'title:archive']` before `['Delete', 'title:delete']`, `separatorBefore` true on Archive and undefined on Delete. `Core/Actions/cardMenu.test.ts` — ":5 lists the page-meta actions with one New Page — the grid has no above": the same row and separator. `Core/Interface/Menus/entityMenuActions.test.ts` — new `describe('Archive and Delete reach their confirmations')`, `confirmArchive` and `confirmDelete` from `vi.hoisted`, `vi.mock('../Confirm/confirmations', async (importOriginal) => ({ ...(await importOriginal<typeof import('../Confirm/confirmations')>()), confirmArchive, confirmDelete }))` (the spread keeps the other asks `propertyMenuActions.ts` imports): "a page’s and a Set’s Archive ask to archive, and a Space’s Delete asks to delete" (`'title:archive'` on `{ kind: 'page', id: 'p1', path: 'Notes/A.md', title: 'A' }` and on `{ kind: 'set', path: 'Notes/S', title: 'S', host: 'detail' }` → `confirmArchive.mock.calls` equals `[[{ path: 'Notes/A.md', kind: 'page', title: 'A' }], [{ path: 'Notes/S', kind: 'set', title: 'S' }]]`; `'title:delete'` on the file's Space target → `confirmDelete` with an object containing `{ kind: 'space', path: '.nexus/contexts/Realms/Work', title: 'Work' }`).
- [ ] `pageMenu.ts`: `'title:archive'` joins `PageMetaAction` above `'title:delete'`; `ARCHIVE_ROW` above `DELETE_ROW` and `REMOVAL_ROWS` after it, exported; `PAGE_ACTION_ROWS` and `pageMetaMenuItems` close on `REMOVAL_ROWS`.
- [ ] `pageMenuActions.ts`: `case 'title:archive'` → `confirmArchive({ path, kind: 'page', title })`.
- [ ] `entityMenu.ts`: the container branch is `[open, create, [RENAME_ROW], [lock?, COPY_PATH_ROW, REVEAL_ROW], target.kind === 'set' ? REMOVAL_ROWS : [DELETE_ROW]]`; the Space and Context branch closes on `[DELETE_ROW]`; `'delete'` leaves `EntityMenuAction`; the `pageMenu` import gains `DELETE_ROW`, `REMOVAL_ROWS`, `RENAME_ROW`.
- [ ] `entityMenuActions.ts`: `case 'delete'` → `case 'title:delete'`, beside a new `case 'title:archive'` → `confirmArchive({ path, kind: 'set', title: target.title })` (a page never reaches it: `:106` routes it to `runPageAction`).
- [ ] Sibling sweep: `git grep -n "'delete'" -- Core/Actions/entityMenu.ts Core/Interface/Menus/entityMenuActions.ts` finds nothing; nothing reads a container's `'rename'` action (the shared `case 'title:rename': case 'rename':` body keeps Spaces' and Contexts' `titleMenuItems` working).

**AFTER**

```Core/Actions/pageMenu.ts diff
@@ PageMetaAction @@
   | 'title:history'
   | 'title:reveal'
+  | 'title:archive'
   | 'title:delete'
@@ rows @@
 export const REVEAL_ROW = { label: 'Reveal Location', action: 'title:reveal' } as const
+export const ARCHIVE_ROW = { label: 'Archive', action: 'title:archive' } as const
 export const DELETE_ROW = { label: 'Delete', action: 'title:delete' } as const
+export const REMOVAL_ROWS = [ARCHIVE_ROW, DELETE_ROW]
@@ PAGE_ACTION_ROWS @@
 export const PAGE_ACTION_ROWS = joinGroups([
   [RENAME_ROW],
   pageSendGroups({}, true).flat(),
-  [DELETE_ROW],
+  REMOVAL_ROWS,
 ])
@@ pageMetaMenuItems @@
     ...pageSendGroups(opts.move ?? {}, opts.reveal),
-    [DELETE_ROW],
+    REMOVAL_ROWS,
   ])
```

```Core/Interface/Menus/pageMenuActions.ts diff
@@ imports @@
-import { confirmDelete } from '../Confirm/confirmations'
+import { confirmArchive, confirmDelete } from '../Confirm/confirmations'
@@ runPageAction @@
     case 'title:history':
~      …
       return true
+    case 'title:archive':
+      void confirmArchive({ path, kind: 'page', title })
+      return true
     case 'title:delete':
       void confirmDelete({ path, kind: 'page', title })
       return true
```

```Core/Actions/entityMenu.ts diff
@@ imports @@
 import {
   type PageMenuContext,
   type PageMetaAction,
   type PageMoveAction,
   COPY_PATH_ROW,
+  DELETE_ROW,
   pageMetaMenuItems,
+  REMOVAL_ROWS,
+  RENAME_ROW,
   REVEAL_ROW,
 } from './pageMenu'
@@ EntityMenuAction @@
   | 'open'
   | 'preview'
-  | 'delete'
   | 'lock'
@@ the container branch @@
   if (isContainer(target))
     return joinGroups<EntityMenuAction>([
       open,
       create,
-      [
-        { label: 'Rename', action: 'rename' },
-        { label: 'Delete', action: 'delete' },
-      ],
+      [RENAME_ROW],
       [
         ...(target.host === 'sidebar'
           ? [
               {
                 label: lockLabel(target.disclosureLocked ?? false, 'Folder'),
                 action: 'lock' as const,
               },
             ]
           : []),
         COPY_PATH_ROW,
         REVEAL_ROW,
       ],
+      target.kind === 'set' ? REMOVAL_ROWS : [DELETE_ROW],
     ])
@@ the Space and Context branch @@
   return joinGroups<EntityMenuAction>([
     open,
     create,
     identity,
-    [{ label: 'Delete', action: 'delete' }],
+    [DELETE_ROW],
   ])
```

```Core/Interface/Menus/entityMenuActions.ts diff
@@ imports @@
-import { confirmDelete } from '../Confirm/confirmations'
+import { confirmArchive, confirmDelete } from '../Confirm/confirmations'
@@ runEntityAction @@
-    case 'delete':
+    case 'title:archive':
+      void confirmArchive({ path, kind: 'set', title: target.title })
+      return
+    case 'title:delete':
       void confirmDelete(target)
       return
```

**VERIFY**

- [ ] The listed tests pass; `entityMenu.test.ts` ":75 a Space draws its identity rows, then its two branches", ":95", ":127", ":142" and `entityMenuActions.test.ts` ":17 Copy Path and Reveal Location ask the host with the folder’s own path" pass unchanged.
- [ ] `git grep -n "'delete'" -- Core/Actions/entityMenu.ts Core/Interface/Menus/entityMenuActions.ts` finds nothing; `git grep -n "label: 'Rename', action: 'rename'" -- Core/Actions/entityMenu.ts` finds nothing; `git grep -n "\[DELETE_ROW\]" -- Core/Actions/pageMenu.ts` finds nothing.
- [ ] Run the gates.
- [ ] Check for unnecessary code or mistakes.

**Lines:** +9 (+20 / −11): pages +6 (`pageMenu.ts` +3, the page runner +3), containers and Spaces ±0, the Set runner +3. Tests apart.

#### Task 6A-3

**TASK:** Add the archive history timeframe (J-1): `archiveHistoryDays`, unset by default, read through one follow rule, `settingWithin`, in `personalization.ts` (both processes import it); `readFileHistoryConfig` answers `archiveKeepMs`; `writePersonalization`'s one updater keeps a pick at or below History Timeframe on every write; the Settings row follows and is capped by History Timeframe (`ZoomSpec.within`), dimming the steps above the cap through a `disabled` `PickerOption`; the open-time sweep, run after the index seeds, removes archived pages' snapshots at their own cutoff in one SQL statement, sparing an id the tree also holds. `LISTED` moves to `driver.ts`. Then drive group 6A.

**NOW:** `Core/Settings/personalization.ts`: `HISTORY_DAYS` (`:42`, default 90); `setting(schema, fallback?, range?)` admits an absent fallback (`:89-101`); `historyDays` (`:189`). `Core/Settings/settings.ts`: `readFileHistoryConfig` (`:64-73`) answers `{ enabled, intervalMs, keepMs }`; `writePersonalization` (`:129-135`) spreads the already-decoded key into the block inside one `updateSettings` updater. `readPersonalization(raw)` (`Core/Settings/codec.ts:13-14`) is the one block decoder. `setPersonalization` (`Core/Session/configSlice.ts:66-67`) drops a value equal to `SETTING_DEFAULTS[key]`, `undefined` for a key with no fallback, so every pick stores. `Core/Settings/frames.ts`: `ZoomSpec` (`:85-87`); History Timeframe at `:614-619`. `Core/Settings/SettingsWindow.tsx`: `useRowValue` (`:226-244`) reads `settingOf` (`:235`); `ZoomRow` (`:255-267`) passes `SETTING_RANGES[row.key]` to `steppedPickerProps` (`:263`). `UIX/Pickers/PickerControl.tsx`: `PickerOption` (`:10-14`) has no disabled state; `steppedPickerProps` (`:36-68`) maps each step (`:54-57`) and clamps a typed value to `range.min`/`range.max` (`:64`); `onTrigger` maps options to door rows (`:103-108`). `popMenu`'s `ActionItem` already carries `disabled` to both presenters (`Core/Actions/menuModel.ts:3-8`); a disabled in-app `MenuItem` takes no click or `role="button"` (`UIX/Menus/MenuRows.tsx:120-138`). No existing caller has a step above its own `max`. `Core/Nexus/handlers.ts:85-86` fires `sweepFileHistory` (`Core/Pages/fileHistory.ts:194-203`, at the live cutoff) before the walk, ahead of `seedContentIndex` (`:103`); Phase 4-6's `settleArchives` sits between walk and seed and stays. `Core/Settings/handlers.ts:46` sweeps on `historyDays` alone. `SnapshotStore.sweepSnapshots(cutoffMs)` (`Core/Platform/stores.ts:89`) has one production caller and two stores (`Desktop/Store/versionsDb.ts:71-73`, `Core/Testing/memoryStores.ts:232-237`). `LISTED`, the json_each list binding, is module-private in `Desktop/Store/stores.ts:16-17`; `versionsDb.ts` imports `./driver`, and its `deleteSnapshots` (`:58-62`) binds a placeholder per stamp. `readIndexedStats(under)` (`Core/Index/contentIndex.ts:92-94`) answers path → `IndexedStat` with its frontmatter `id`, or null with no index store; `idHeld(root, id)` (`Core/Nexus/heldPages.ts:30-33`) asks the held tree. `ARCHIVE_DIR_REL` lands in Phase 2; Phase 3 indexes the Archive's pages.

**CHANGE**

- [ ] Write and watch fail: `Core/Settings/personalization.test.ts` › new `describe('settingWithin')`: "follows its bound until picked, then holds the pick" (`{}` → `HISTORY_DAYS.default`; `{ historyDays: 14 }` → 14; `{ historyDays: 14, archiveHistoryDays: 7 }` → 7). `Core/Settings/settings.test.ts` › new `describe('the archive timeframe never exceeds History Timeframe')`: "shortening History Timeframe below a picked archive timeframe lowers it in the same write" (`{ historyDays: 60, archiveHistoryDays: 30 }`, write `historyDays` 14 → personalization `{ historyDays: 14, archiveHistoryDays: 14 }`); "lengthening History Timeframe leaves a pick where it is, and an unpicked one unwritten" (`{ historyDays: 14, archiveHistoryDays: 7 }`, write 60 → `{ historyDays: 60, archiveHistoryDays: 7 }`; `{}`, write 7 → `{ historyDays: 7 }`); "a pick above History Timeframe lands at it" (`{ historyDays: 14 }`, write `archiveHistoryDays` 60 → `{ historyDays: 14, archiveHistoryDays: 14 }`). `UIX/Pickers/PickerControl.typeable.test.tsx` — ":82 a left press opens the list through the door, marked on the current value" unchanged (`toHaveBeenCalledWith` reads an undefined `disabled` as absent); new `describe('a stepped picker held under a cap')` over `steppedPickerProps({ range: { ...steppedRange([7, 14, 30, 60, 90]), max: 30 }, value: 14, unit: { scale: 1, suffix: ' Days', digits: 0 }, onPick })`: "dims the steps above the cap in the list" (the door's rows `[['7 Days', false], ['14 Days', false], ['30 Days', false], ['60 Days', true], ['90 Days', true]]` as `[label, disabled]`); "holds a typed value at the cap" (typing `60` → `onPick` with 30). `Core/Testing/storesContract.ts` — ":356 sweeps snapshots older than a cutoff" → "sweeps snapshots older than the live cutoff, and an archived page’s older than its own" (`p1`, `p2` at 100, 200, 300; `sweepSnapshots(200, { ids: ['p2'], cutoffMs: 300 })` answers 3; `p1` keeps 300 and 200, `p2` keeps 300). `Core/Pages/fileHistory.test.ts` › `describe('sweepFileHistory')` (`:365`) gains "sweeps an archived page at the archive timeframe while a twin the tree holds keeps the History Timeframe" (`settle({ historyDays: 30, archiveHistoryDays: 7 })`; capture `PAGE` and `OTHER`; advance 8 days; `mem.stores.contentIndex.upsertPageIndexes` rows at `` `${ARCHIVE_DIR_REL}/c1/Notes/1__${id}.archived/${id}.md` `` with `values: { ID: id }` for both; after the sweep `rows(OTHER)` is empty and `rows()` holds one). `Core/Settings/handlers.test.ts` — `sweepFileHistory` in `vi.hoisted`, `vi.mock('../Pages/fileHistory', () => ({ sweepFileHistory }))`: "sweeps file history when either timeframe is written, and for no other key" (`openLinksInApp` sweeps nothing; `historyDays` and `archiveHistoryDays` each call it with `'/root'`).
- [ ] `personalization.ts`: `archiveHistoryDays: setting(numberCheck(HISTORY_DAYS, true), undefined, HISTORY_DAYS)` under `historyDays`; `settingWithin(p, key, within)` after `settingOf`.
- [ ] `settings.ts`: `readFileHistoryConfig` answers `archiveKeepMs` through `settingWithin`; `writePersonalization` decodes the written block through `readPersonalization` and, in the same updater, lowers a picked `archiveHistoryDays` above the resulting History Timeframe; its doc states the rule.
- [ ] `frames.ts`: `ZoomSpec` gains `within?: SteppedKey`; the Archive History Timeframe row under History Timeframe, `within: 'historyDays'`, with §Copy's hint (Biome double-quotes it, since it holds single quotes).
- [ ] `SettingsWindow.tsx`: `useRowValue` reads `settingWithin` for a row naming `within`; `ZoomRow` caps its declared range's `max` at the bound's value.
- [ ] `PickerControl.tsx`: `PickerOption` and `MenuDoor`'s rows gain `disabled?: boolean`; `steppedPickerProps` marks `disabled: f > range.max`; `onTrigger`'s rows carry `o.disabled`; the capped `max` already clamps the typed entry (`:64`).
- [ ] `fileHistory.ts`: `sweepFileHistory` takes the archived ids from `readIndexedStats(ARCHIVE_DIR_REL)`, minus any id `idHeld` answers for, and passes both cutoffs; captures keep the live cutoff.
- [ ] `Core/Nexus/handlers.ts`: move `void sweepFileHistory(root)` from `:86` to after `oweSeen(root, reread)`, once the index has seeded. `Core/Settings/handlers.ts:46` sweeps on `historyDays` or `archiveHistoryDays`.
- [ ] `Core/Platform/stores.ts:89`: `sweepSnapshots(cutoffMs, archived: { ids: readonly string[]; cutoffMs: number })`, required. `Desktop/Store/driver.ts` takes `LISTED` and its comment from `Desktop/Store/stores.ts:16-17`, which imports it; `versionsDb.ts` runs one statement with both cutoffs through it, and `deleteSnapshots` binds its stamps through it. `Core/Testing/memoryStores.ts:232-237` follows.
- [ ] Archive Drive: `group6A(cdp)` in `.claude/scripts/Archive Drive/live-drive.mjs`, one `MATRIX.md` row per check in group 1's shape; `ALL` gains `'6A'`, dispatched by `if (GROUPS.has('6A')) await group6A(cdp)` after group 5; each check an `item('6A', '6A', …)` (`AWAIT` until `POMMORA_ARCHIVE_LANDED` reaches `6A`). Helpers: group 1's `sidebarRow(title)`, `unfold`, and `DIALOG` (`document.querySelector('[role="alertdialog"]')`, its `aria-label` the message, `ConfirmationWindow.tsx:39-41`); group 2's `notice(cdp)` (message then button text, read with `settles` while the label's host isn't `inert`; Undo is its `button`) and `between`; `archivedBundle(title)` finds the bundle under `.nexus/archive/<Collection A's id>/` (the id from `Collection A/_pagecollection.json`) whose stamped leaf names `<title>` (`__Arc Page.md.archived`, `__Arc Set.archived`). Row menus pop natively (`popNative` then `pickNative([])` to read groups, raw rows keeping `{ separator }`; `chooseNative` to choose); the Settings picker pops in-app (`nativeMenus` defaults off), its rows `[data-picker-portal]` items, a dimmed one without `role="button"`. A switch is `[role="switch"][aria-label=…]`; a section is the `.settings-section` whose heading, matched case-insensitively (`caps: true`), reads Trash & Archive or File History, its controls' `aria-label`s in DOM order. Seeds carry an explicit `order` built as group 2's `createSetIn` does from the held tree's drawn children (a create without `order` leaves the id out, `Core/Nexus/create.ts:50`, `:76`, and a restore writes the folder's whole order), so "its exact place" has neighbours: `mutate createPage { id: mintPageId(), parentPath: 'Collection A/Set Alpha', name: 'Arc Page', order }`, the new id second among Set Alpha's `pages` ids from `nexus:state`, recorded in `pageIds`; `mutate createContainer { id: containerId(), parentPath: 'Collection A', kind: 'set', name: 'Arc Set', order }`, the new id second among Collection A's `sets` ids; the neighbours are the checks' pre-state. Unfold Collection A (`unfold(cdp, COLLECTION, 'Arc Set')`) before any `sidebarRow('Arc Set')` (rows carry no `aria-expanded`; folded children unmount). Set History Timeframe to 30 through its picker before the timeframe checks. The notice drains on `DWELL_MS`: read it and press Undo first, then wait on disk with `until`. Cleanup: each archive is undone in its check and a declined question changes nothing; the group saves `historyDays`, `archiveHistoryDays`, and `confirmArchiving` from `settings.json`'s personalization at its start and writes each back through `personalization:set` at its end, an absent key as `null` (read as absent, `Core/Settings/personalization.ts:98`); the harness restores `~/Test`. Checks:
  - [ ] `[g6A I-1] a page's row menu closes on Archive above Delete`: `popNative` on `Arc Page`'s `.cell-title-text` in Collection A's table → the last three raw rows are `{ separator }`, `Archive`, `Delete`, both enabled.
  - [ ] `[g6A I-2 §Copy] Archive asks its question`: `chooseNative(…, 'Archive')` → `DIALOG`'s `aria-label` is `Archive “Arc Page”?`, its detail `“Arc Page” will be moved to this Collection’s archive, where it can be restored.`, its non-Cancel button `Archive`.
  - [ ] `[g6A I-3 §Copy] the notice reads Archived “Arc Page” with Undo`: press Archive → `notice(cdp)` reads `Archived “Arc Page”Undo`, its one `button` `Undo`.
  - [ ] `[g6A I-1] pressing Archive moved the page into its Collection's Archive`: read at once while the notice shows (`confirmArchive` posts it after the archive's reply): `Collection A/Set Alpha/Arc Page.md` is gone, `archivedBundle('Arc Page')` holds `Arc Page.md` with the seeded `ID`, `Set Alpha/_pageset.json`'s `page_order` lacks it, and the table has no row for it.
  - [ ] `[g6A I-3] Undo returns the page to its exact place`: press Undo → `Arc Page.md` is back in `Set Alpha`, the bundle gone, and `page_order` holds it between its seeded neighbours (group 2's `between(order, [prev, id, next])`).
  - [ ] `[g6A I-2 §Copy] Settings › Trash & Archive holds Confirm Before Archiving under Confirm Before Deletion, on`: open Settings › Files & Links → no heading reads `Deletion`; Trash & Archive's labels read `Confirm Before Deletion`, `Confirm Before Archiving` in that order; its text holds `Ask before archiving a page or a Set.`; the switch's `aria-checked` is `true`.
  - [ ] `[g6A I-2] the switch off writes confirmArchiving: false`: press the switch → `settings.json`'s `personalization.confirmArchiving` is `false`.
  - [ ] `[g6A I-3] with the switch off, Archive asks nothing and still posts its Undo`: close Settings; `chooseNative(…, 'Archive')` on `Arc Page` → no `DIALOG` for 1500 ms (`holds`), the bundle on disk, `notice(cdp)` reads `Archived “Arc Page”Undo`; Undo → the page is back.
  - [ ] `[g6A I-1] a Set's menu holds Rename alone and closes on Archive above Delete`: `popNative` on `sidebarRow('Arc Set')` → `Rename`'s group holds nothing else; the last three rows are `{ separator }`, `Archive`, `Delete`.
  - [ ] `[g6A I-2] with the switch off, a Set archives unasked`: `chooseNative(…, 'Archive')` on `Arc Set` → no `DIALOG` for 1500 ms; `archivedBundle('Arc Set')` holds the folder with its `_pageset.json`; `Collection A/Arc Set` is gone from disk and the sidebar; `notice(cdp)` reads `Archived “Arc Set”Undo`; Undo → `Collection A/Arc Set/` is back, in the sidebar, and between its seeded neighbours in `Collection A/_pagecollection.json`'s `set_order` (`between`).
  - [ ] `[g6A I-2] with the switch on, a Set asks`: switch back on through Settings (`aria-checked` `true`; `confirmArchiving` absent from `settings.json`'s personalization, as its default) → `chooseNative(…, 'Archive')` on `Arc Set` → `DIALOG` reads `Archive “Arc Set”?`; Cancel → `Collection A/Arc Set/` is still on disk.
  - [ ] `[g6A I-1] a Collection's menu closes on Delete alone, which still asks`: `popNative` on `sidebarRow('Collection A')` → no `Archive` row; the last two rows are `{ separator }`, `Delete`; `pickNative(['Delete'])` → `DIALOG` reads `Delete “Collection A”?` (`'title:delete'` reaching `confirmDelete`); Cancel → Collection A is unchanged on disk.
  - [ ] `[g6A J-1 §Copy] Archive History Timeframe follows History Timeframe until picked`: File History's controls read `History Timeframe`, `Archive History Timeframe` in that order; its text holds `How long archived pages keep their snapshots; it follows 'History Timeframe' until set, and never exceeds it.`; the archive picker's button reads `30 Days`; personalization has no `archiveHistoryDays`.
  - [ ] `[g6A J-1] steps above History Timeframe show dimmed and can't be picked`: a left press on the archive picker → in `[data-picker-portal]`, `7 Days`, `14 Days`, `30 Days` carry `role="button"`, `60 Days` and `90 Days` don't; clicking `90 Days` writes no `archiveHistoryDays`; Escape closes the list.
  - [ ] `[g6A J-1] a pick stores, and a typed value clamps to History Timeframe`: pick `14 Days` → `archiveHistoryDays` is 14; a right press, `60` typed, Enter → 30, the button reading `30 Days`.
  - [ ] `[g6A J-1] shortening History Timeframe switches the archive timeframe down in one write`: under `watch(['.nexus/settings.json'])`, pick History Timeframe `7 Days` → one write holding `historyDays: 7` and `archiveHistoryDays: 7`; the archive button reads `7 Days` (`until` the host's echo lands).
  - [ ] `[g6A J-1] lengthening History Timeframe leaves the pick where it is`: pick History Timeframe `60 Days` → `archiveHistoryDays` stays 7, the archive button reads `7 Days`, and its list dims `90 Days` alone.
  - The sweep is vitest's (`fileHistory.test.ts`, `storesContract.ts`): the snapshot store is device-local and a snapshot's age can't be driven without faking time. The refusal (`Only pages and Sets inside a Collection can be archived.`) needs a Collection whose id isn't ULID-shaped, which nothing in-app writes; Phase 4-2's `archive.test.ts` pins its copy, and the menu reaches it through `mutate`'s `reportRefusal`.

**AFTER**

```Core/Settings/personalization.ts diff
@@ SETTINGS @@
   fileHistory: flag(true),
   historyDays: stepped(HISTORY_DAYS),
+  archiveHistoryDays: setting(numberCheck(HISTORY_DAYS, true), undefined, HISTORY_DAYS),
   historyInterval: stepped(HISTORY_INTERVAL),
@@ settingWithin @@
 export const settingOf = <K extends SettingKey>(p: Personalization, key: K): SettingValue<K> =>
   (p[key] ?? SETTING_DEFAULTS[key]) as SettingValue<K>
+
+/** A stepped setting that follows `within` until it's picked. */
+export const settingWithin = (p: Personalization, key: SteppedKey, within: SteppedKey): number =>
+  (p[key] ?? settingOf(p, within)) as number
```

```Core/Settings/settings.ts diff
@@ imports @@
 import {
   type Personalization,
   type SettingKey,
   type SettingValue,
   settingOf,
+  settingWithin,
 } from './personalization'
 …
-import { normalizeExclusions, readSettings, scopeOf, type SettingsLeaves } from './codec'
+import {
+  normalizeExclusions,
+  readPersonalization,
+  readSettings,
+  scopeOf,
+  type SettingsLeaves,
+} from './codec'
@@ readFileHistoryConfig @@
 export async function readFileHistoryConfig(
   root: string,
-): Promise<{ enabled: boolean; intervalMs: number; keepMs: number }> {
+): Promise<{ enabled: boolean; intervalMs: number; keepMs: number; archiveKeepMs: number }> {
   const p = await readLivePersonalization(root)
   return {
     enabled: settingOf(p, 'fileHistory'),
     intervalMs: settingOf(p, 'historyInterval') * MINUTE_MS,
     keepMs: settingOf(p, 'historyDays') * DAY_MS,
+    archiveKeepMs: settingWithin(p, 'archiveHistoryDays', 'historyDays') * DAY_MS,
   }
 }
@@ writePersonalization @@
-/** An `undefined` value resets the key to its built-in default — JSON omits it. */
+/** An `undefined` value resets the key to its built-in default — JSON omits it. A picked archive timeframe above the History Timeframe lowers to it in the same write. */
 export function writePersonalization(root: string, key: string, value: unknown): Promise<void> {
   return updateSettings(root, (cur) => {
-    const p = isPlainObject(cur.personalization) ? cur.personalization : {}
-    return { ...cur, personalization: { ...p, [key]: value } }
+    const p = { ...(isPlainObject(cur.personalization) ? cur.personalization : {}), [key]: value }
+    const read = readPersonalization(p)
+    const history = settingOf(read, 'historyDays')
+    return {
+      ...cur,
+      personalization:
+        (read.archiveHistoryDays ?? 0) > history ? { ...p, archiveHistoryDays: history } : p,
+    }
   })
 }
```

```Core/Settings/frames.ts diff
@@ ZoomSpec @@
 type ZoomSpec = RowText & {
   unit?: NumberUnit
+  within?: SteppedKey
 }
@@ File History @@
           {
             kind: 'zoom',
             key: 'historyDays',
             label: 'History Timeframe',
             unit: DAYS,
           },
+          {
+            kind: 'zoom',
+            key: 'archiveHistoryDays',
+            within: 'historyDays',
+            label: 'Archive History Timeframe',
+            hint: "How long archived pages keep their snapshots; it follows 'History Timeframe' until set, and never exceeds it.",
+            unit: DAYS,
+          },
           {
             kind: 'zoom',
             key: 'historyInterval',
```

```Core/Settings/SettingsWindow.tsx diff
@@ imports @@
-import { SETTING_DEFAULTS, SETTING_RANGES, type SettingKey, settingOf } from './personalization'
+import {
+  SETTING_DEFAULTS,
+  SETTING_RANGES,
+  type SettingKey,
+  type SteppedKey,
+  settingOf,
+  settingWithin,
+} from './personalization'
@@ useRowValue @@
 function useRowValue<V>(row: {
   key: SettingKey | DeviceDefaultKey
   device?: true
+  within?: SteppedKey
 }): [V, (next: V) => void] {
   const setPersonalization = useSession((s) => s.setPersonalization)
   const setDevicePref = useSession((s) => s.setDevicePref)
   const value = useSession((s) =>
     row.device
       ? devicePref(s.devicePrefs, row.key as DeviceDefaultKey)
-      : settingOf(personalizationOf(s), row.key as SettingKey),
+      : row.within
+        ? settingWithin(personalizationOf(s), row.key as SteppedKey, row.within)
+        : settingOf(personalizationOf(s), row.key as SettingKey),
   ) as V
@@ ZoomRow @@
 function ZoomRow({ row }: { row: RowOf<'zoom'> }): React.JSX.Element {
   const [value, set] = useRowValue<number>(row)
-  const range = row.device ? DEVICE_RANGES[row.key] : SETTING_RANGES[row.key]
+  const declared = row.device ? DEVICE_RANGES[row.key] : SETTING_RANGES[row.key]
+  const ceiling = useSession((s) => row.within && settingOf(personalizationOf(s), row.within))
+  const range = ceiling ? { ...declared, max: ceiling } : declared
   return (
     <MenuRowView
       row={settingsRow(row, {
         kind: 'picker',
         ariaLabel: row.label,
         ...steppedPickerProps({ range, value, unit: row.unit ?? PERCENT, onPick: set }),
```

```UIX/Pickers/PickerControl.tsx diff
@@ PickerOption @@
 export type PickerOption<T extends string> = {
   value: T
   label: string
   icon?: React.ComponentProps<typeof Icon>['name']
+  disabled?: boolean
 }
@@ MenuDoor @@
 export type MenuDoor = (
-  rows: { label: string; action: string; checked: boolean; icon?: string }[],
+  rows: { label: string; action: string; checked: boolean; icon?: string; disabled?: boolean }[],
   trigger: HTMLElement,
@@ steppedPickerProps @@
     options: stepsWith(range.steps, value).map((f) => ({
       value: String(f),
       label: unitLabel(f, unit),
+      disabled: f > range.max,
     })),
@@ onTrigger @@
     const rows = options.map((o) => ({
       label: o.label,
       action: o.value,
       checked: o.value === value,
       icon: o.icon,
+      disabled: o.disabled,
     }))
```

```Core/Pages/fileHistory.ts diff
@@ imports @@
 import { join } from '../Paths/posix'
+import { ARCHIVE_DIR_REL } from '../Paths/nexusPaths'
 import { kindOf } from '../Nexus/identityMark'
 …
+import { readIndexedStats } from '../Index/contentIndex'
 import { readFileHistoryConfig } from '../Settings/settings'
-import { liveIdOf, livePathOf } from '../Nexus/heldPages'
+import { idHeld, liveIdOf, livePathOf } from '../Nexus/heldPages'
@@ sweepFileHistory @@
 export async function sweepFileHistory(root: string): Promise<void> {
   try {
-    const { keepMs } = await readFileHistoryConfig(root)
-    const cutoff = Date.now() - keepMs
-    snapshotStore()?.sweepSnapshots(cutoff)
-    captureStore()?.sweepCaptures(cutoff)
+    const { keepMs, archiveKeepMs } = await readFileHistoryConfig(root)
+    const now = Date.now()
+    const ids = [...(readIndexedStats(ARCHIVE_DIR_REL)?.values() ?? [])].flatMap((s) =>
+      s.id && !idHeld(root, s.id) ? [s.id] : [],
+    )
+    snapshotStore()?.sweepSnapshots(now - keepMs, { ids, cutoffMs: now - archiveKeepMs })
+    captureStore()?.sweepCaptures(now - keepMs)
   } catch (e) {
```

```Core/Nexus/handlers.ts diff
@@ openNexusSequence @@
   if (root !== priorRoot) {
-    void sweepFileHistory(root)
     try {
       let tree = await readNexus(root)
 …
       if (latchRecord) await runOpenLedger(root, tree)
~      await settleArchives(root, tree).catch((e) =>
~        console.error('archive: the open pass failed:', errText(e)),
~      )
     } catch (e) {
       console.error('adopt: the seed walk failed; reads will retry:', errText(e))
     }
     const reread = await seedContentIndex(root)
     oweSeen(root, reread)
+    void sweepFileHistory(root)
     await replaySchemaCascade(root)
```

```Core/Settings/handlers.ts diff
@@ personalization:set @@
     if (key === 'webZoomFactor') await ctx.applyZoom()
-    if (key === 'historyDays') void sweepFileHistory(root)
+    if (key === 'historyDays' || key === 'archiveHistoryDays') void sweepFileHistory(root)
     return ok(null)
```

```Core/Platform/stores.ts diff
@@ SnapshotStore @@
   clearSnapshots(): number
-  sweepSnapshots(cutoffMs: number): number
+  sweepSnapshots(cutoffMs: number, archived: { ids: readonly string[]; cutoffMs: number }): number
 }
```

```Desktop/Store/driver.ts diff
@@ Db @@
 export type Db = DatabaseSync
+
+// A list binds as one JSON argument: a placeholder per value fails past SQLite's variable limit.
+export const LISTED = '(SELECT value FROM json_each(?))'
```

```Desktop/Store/stores.ts diff
@@ imports @@
-import { type Db, inTransaction } from './driver'
+import { type Db, inTransaction, LISTED } from './driver'
 import { INDEX_TABLES } from './ddl'
 
-// A list binds as one JSON argument: a placeholder per value fails past SQLite's variable limit.
-const LISTED = '(SELECT value FROM json_each(?))'
-
 // A folder's descendants by range, bound to the folder twice: …
```

```Desktop/Store/versionsDb.ts diff
@@ imports @@
-import { checkIntact, openRebuildable, type Db } from './driver'
+import { checkIntact, LISTED, openRebuildable, type Db } from './driver'
@@ deleteSnapshots @@
   deleteSnapshots(pageId, ts) {
-    const marks = ts.map(() => '?').join(', ')
     return removed(
-      db.prepare(`DELETE FROM snapshots WHERE page_id = ? AND ts IN (${marks})`).run(pageId, ...ts),
+      db
+        .prepare(`DELETE FROM snapshots WHERE page_id = ? AND ts IN ${LISTED}`)
+        .run(pageId, JSON.stringify(ts)),
     )
   },
@@ sweepSnapshots @@
-  sweepSnapshots(cutoffMs) {
-    return removed(db.prepare('DELETE FROM snapshots WHERE ts < ?').run(cutoffMs))
-  },
+  sweepSnapshots(cutoffMs, archived) {
+    return removed(
+      db
+        .prepare(`DELETE FROM snapshots WHERE ts < ? OR (ts < ? AND page_id IN ${LISTED})`)
+        .run(cutoffMs, archived.cutoffMs, JSON.stringify(archived.ids)),
+    )
+  },
 })
```

```Core/Testing/memoryStores.ts diff
@@ snapshots @@
-    sweepSnapshots: (cutoffMs) => {
+    sweepSnapshots: (cutoffMs, archived) => {
+      const short = new Set(archived.ids)
       let n = 0
-      for (const p of pages.values())
-        for (const ts of [...p.keys()]) if (ts < cutoffMs && p.delete(ts)) n++
+      for (const [id, p] of pages)
+        for (const ts of [...p.keys()])
+          if ((ts < cutoffMs || (short.has(id) && ts < archived.cutoffMs)) && p.delete(ts)) n++
       return n
     },
```

**VERIFY**

- [ ] The listed tests pass; `fileHistory.test.ts` ":366 removes rows older than the timeframe the nexus sets" and ":376 sweeps old captures beside old snapshots", `settings.test.ts` ":109 reads the switch on, and sees a write without a reopen", and `PickerControl.typeable.test.tsx` ":82" pass unchanged; `contracts.test.ts` and `Desktop/Store/stores.test.ts` run the rewritten snapshot contract against both stores.
- [ ] `git grep -n "sweepSnapshots(" -- Core Desktop` finds only two-argument calls and implementations; `git grep -n "json_each" -- Desktop` finds `driver.ts` alone; `git grep -n "map(() => '?')" -- Desktop Core` finds nothing; `versionsDb.test.ts:125-126` and `storesContract.ts:352` pass unchanged.
- [ ] `git grep -n "within?: \|within: '" -- Core/Settings` finds `ZoomSpec` and the one row in `frames.ts`, and `useRowValue` in `SettingsWindow.tsx`.
- [ ] Run the gates.
- [ ] Run Archive Drive groups 1–6A with `POMMORA_ARCHIVE_LANDED=6A`; every 6A item prints `PASS`.
- [ ] Check for unnecessary code or mistakes.

**Lines:** +54 (+82 / −28): imports +16 (`settings.ts` +6, `SettingsWindow.tsx` +7), the SQL call's reflow +4, the keys and follow rule +4, the config +1, the switch-down +6, the row and `within` +9, the row value and cap +5, the dimmed step +3, the sweep +5, the trigger and port ±0, `LISTED` ±0 (moved), `deleteSnapshots` +1, `Core/Testing/memoryStores.ts` +2 (counted as code). The drive group apart.

#### Review Checkpoint

- [ ] `confirmations.test.ts` (the archive describe and ":184" on `spendUndo`), `pageMenu.test.ts`, `entityMenu.test.ts`, `cellMenu.test.ts`, `cardMenu.test.ts`, `entityMenuActions.test.ts`, `personalization.test.ts` (`settingWithin`), `settings.test.ts` (the three timeframe writes), `PickerControl.typeable.test.tsx` (the capped picker), `storesContract.ts` (both stores), `fileHistory.test.ts` (the archived sweep and its twin), and `Core/Settings/handlers.test.ts` (the trigger) pass.
- [ ] `git grep` finds no `spendBundle`, no bare `'delete'` in the entity menu or its runner, no container `'rename'` literal, and `json_each` in `driver.ts` alone.
- [ ] Run the gates.
- [ ] Archive Drive groups 1–6A pass with `POMMORA_ARCHIVE_LANDED=6A`.
- [ ] Two `opus-high` read-only reviewers to closeout-review's standards (its closing procedures, write-guards, and output format exempt) find nothing unresolved; a compaction checkpoint follows before Phase 6B.

#### Departures and Disclosures

##### Behavior Changes and Disclosures

- **`sweepSnapshots(cutoffMs, archived)` Takes `archived` Required:** its one production caller (`fileHistory.ts:198`) always has the ids, and `ids: []` makes the second arm match nothing, so an optional parameter would add a branch to each store for no caller.
- **`writePersonalization` Keeps the Cap on Every Write:** one comparison in the one updater covers a History Timeframe shortened below a pick and an archive value written above the cap through the raw channel, which the dimmed rows can't stop. It decodes through `readPersonalization` (`codec.ts:13`) and `settingOf`, so "absent means the default" stays stated once.
- **`offerUndo` (Take Along):** the restore-and-spend Undo `notifyTrashed` built inline is hoisted, so the Trash's and the Archive's notices arm one Undo (−3 against restating it in `confirmArchive`), over the bundle paths an act minted from the start, so Phase 6B's batch delete arms its one Undo through it by adding a destination alone.
- **`RENAME_ROW` (Take Along):** the container branch takes it in place of its `'rename'` literal, the same fold I-1 makes for Delete, with identical dispatch (`entityMenuActions.ts:118-121`).
- **`LISTED` Moves to `driver.ts`:** the snapshot sweep binds its id list the way the index store already does, and `deleteSnapshots` its stamps (Take Along), the one list either store still bound a placeholder at a time.
- **A Following Timeframe:** `PickerControl` treats picking the value already shown as no change (`PickerControl.tsx:112-113`), so picking the step a following Archive History Timeframe already shows leaves it following; lengthening History Timeframe afterwards moves it along. J-1's "until a step is picked" holds for every step other than the one on show.
- **The Switch-Down Is the Host's Write:** after History Timeframe is shortened below a pick, the renderer shows the old archive pick, dimmed and above the cap, until the host's settings echo lands; the drive asserts the settled DOM through `until`.
- **The Sweep's Twin Rule Stays `idHeld` (Cautionary 33):** Phase 3's `nexusPages(…).byId` would copy the tree's memoized by-id map and build an origin path for every archived page to answer a question about ids alone, where `readIndexedStats(ARCHIVE_DIR_REL)` answers the ids directly.
- **One Reader for the Archive's Ids (Task 6A-3):** `heldPages.ts` already read the Archive's indexed rows with a disk walk as its no-index-store fallback, so that read is exported as `archivedPageIds(root, tree)` and the sweep takes its ids from it with the held tree, `ids: []` when none is held, rather than reading `readIndexedStats(ARCHIVE_DIR_REL)` a second way; a missing index store then sweeps archived pages by the walk instead of at the live cutoff.
- **One Bound (Task 6A-3):** "Archive History Timeframe never exceeds History Timeframe" is declared once, `SETTING_BOUNDS` beside `SETTING_RANGES`, which `settingWithin`, the Settings row's value and cap, and `writePersonalization`'s cap all read, in place of a `within` named on the row, in the reader, and in the writer.
- **An Archive Clears the Cache (Task 6A-1):** `patchPagesFor` drops a page's cached detail and slot for an archive as it does for a delete, and a container's delete or archive drops its pages' cached details with it (`dropPageDetailsUnder`), so a page restored after a cascade rewrote it in the Archive opens as the file stands rather than from the body it had when it left.
- **Drive Group 6A Leaves `~/Test` as It Found It:** the group's seeds are deleted and emptied at its end and the Archive folder it made removed, closing on a start-against-end check as groups 3 to 5 do; the task text named no cleanup.

##### Found False at HEAD

- *§What Becomes False*'s `PickerControl.typeable.test.tsx` ":82 gains `disabled` on the door rows" is moot: the case passes unchanged, since `toHaveBeenCalledWith` reads an undefined `disabled` as absent, so the new capped-picker case pins `disabled` instead.

##### Line Total

- **+102 (+162 / −60):** 6A-1 +39, 6A-2 +9, 6A-3 +54, under the plan's one counting rule (`view-delta`'s Actionable column: source with imports and blank lines as Biome wraps them; comments, tests, documents, and the drive out; moved lines on both sides, named apart; `Core/Testing/` files counted as code).
- **Against the Estimate (≈ +57):** imports +19 (16 of them 6A-3's), the SQL call's reflow (+4), `confirmArchive` at its formatted length (+21 against +16), the Set's runner arm (+3, uncosted), the switch-down and the follow-and-cap at their formatted lengths (+6 against +4; +5 against +3), the memory store (+2), and the dimmed-step and sweep counts as written; `offerUndo` and `LISTED` are near-neutral (+4 net against a −10 fold; +1 with `deleteSnapshots` on it).

### Phase 6B — The Archive's View

**GOAL:** Show what was archived: ActionLabel's bar face, `PageReaderWindow` with History and Archive branches, the archive place as a navigation kind entered by the views dropdown's Archive toggle, and ArchiveView on TableView's sheet through the shared browser controller. Depends on Phases 2 (`BundleRow`, `bundles:list`, `storesChanged`), 3 (`nexusPages`, `archiveReach`), 4 (the `archive`, routed `restore`, and archive-source `delete` ops, `trail`, `RestoreDestination`'s `{ kind: 'archive' }`), 5 (`Swap`, `ActionLabel`, `useBundleBrowser` with its date column and `rulesOf`, `countPhrase`, `restoreMenuItems`, `checkedIn`/`actedOn`, `useVirtualRows`), and 6A (`waived(key, kind?)`, `spendUndo`, `offerUndo`, `confirmArchive`).

In the AFTER blocks below, a `~` line is context as an earlier phase leaves it (its text is that phase's), a space-prefixed line is context at HEAD, and `…` elides unchanged lines.

#### Task 6B-1

**TASK:** ActionLabel shows a posted notice, else the shown view's declared bar, else nothing, cross-fading between the faces; a notice posted with the pointer on the label arms at once (K-3). ArchiveView declares the bar in Task 6B-6.

**NOW:** `Core/Interface/Notifications/notifications.ts` holds the notice channel (`shown`, `:20`) and `useNotification` (`:25`). A shown view publishes by `usePublishCount`'s rule (`Core/Interface/Subfield/publish.ts:7-15`): `shown = host !== null && !host.parked`. Phase 5-2's `ActionLabel.tsx` arms per K-3 (`let armed` in the proximity effect, `:61-74`, false at each post until the pointer leaves the band). `Swap`'s faces are `span`s, the hidden one `aria-hidden` and `inert`. The bar's press posts with the pointer on the label, so K-3 alone would start unarmed and drain under a resting pointer; closed, the host is `inert` and off-screen, so it matches `:hover` at a post only when the pointer already stood on the open label. Phase 5's tests read the notice through `label()?.textContent` and `querySelectorAll('[aria-hidden="true"]')`, and `showing()` through the host's `inert`.

**CHANGE**

- [ ] Write the tests and watch them fail: `Core/Interface/Notifications/ActionLabel.test.tsx` › `describe('the bar a shown view declares')`, a `Declarer` calling `useDeclareActions(bar)` in `<ContentHostContext.Provider value={{ tabId: 't1', key: 'collection:c1', parked }}>` beside `<ActionLabel />`: "draws a declared bar as Restore, its count, and a Delete button while nothing is posted" (`Restore`, `2 Pages`, `button[title="Delete"]`; presses call `restore`, `remove` once); "yields the bar to a posted notice and takes it back once the notice drains" (`notifyDeleted('Ideas', vi.fn())` → `Deleted “Ideas”Undo`; after `DWELL_MS` + `duration.base` → `Restore`; the host never inert); "withdraws the bar once its view parks, and once it unmounts" (`parked: true` or unmounting → host `inert`); "keeps the hidden face out of reach: inert and aria-hidden, its buttons unfocusable" (notice over a bar: `button[title="Delete"]` sits under `inert` and `aria-hidden="true"`); "holds phrasing content alone in both faces" (notice over a bar: no `div` under either `[data-face]`); "a notice its own bar's press posts arms at once, so the drain stalls under the pointer" (`restore` posts `notifyDeleted('Ideas', vi.fn())`; drain cases' fake timers and box stub, `matches` answering `:hover`; Restore, `move(400)`, `move(390)`, `run(10_000)` → still `Deleted “Ideas”Undo`, where Phase 5's "a notice posted under the pointer drains while the pointer stays in its band" drains).
- [ ] `UIX/Animations/Swap.tsx`: an optional `className`, merged onto the host through `cx`, so the label's faces can stretch across it.
- [ ] `notifications.ts`: add `ActionBar`, the `declared` channel, `useActionBar`, and `useDeclareActions`; the header names the bar beside the notice.
- [ ] `ActionLabel.tsx`: open while a notice shows or a bar is declared; two faces through `Swap`, their contents `span`s; the bar face is `s.row` with `Segments` of a `filled` inline Restore and the count, then a destructive trash Button titled Delete; `useHeld` holds the bar and the face through their exit (Cautionary 31); the error border and `alert` role follow the notice face; the drain, dismissal, and K-3 arming stay with the notice, arming at once when the host matches `:hover` as it shows (5-2's comment, `:60`, names this); `barRef` → `progressRef`.
- [ ] `action-label.css.ts`: the host's column `gap` moves to a new `face` style, the notice face's stack; `faces` stretches `Swap`'s cell items across the label; `s.row` and `s.face` set their own `display`.
- [ ] `UIX/Elements/ProgressBar.tsx` and `progress-bar.css.ts` (Take Along): track and fill become `span`s with `display: 'block'`, as in `Cell.tsx:142`'s `span.cell-bar`, the look unchanged (`Slider.tsx:97` places it in a `div`); its `ref` types `HTMLSpanElement`.
- [ ] Sibling sweep: in `ActionLabel.test.tsx` (HEAD `:29-43`), `face = () => label()?.querySelector('[data-face="shown"]')` replaces `label()` in "draws the count after the title behind one hidden divider" and "draws a notice without a count as its message alone" (the hidden face adds an `aria-hidden="true"` the host-wide count would read); the drain cases keep `showing()`.

**AFTER**

```UIX/Animations/Swap.tsx diff
@@ imports @@
 import type { ReactNode } from 'react'
+import { cx } from '../Utilities/cx'
 import * as s from './swap.css'
@@ Swap @@
 export function Swap({
   swapped,
   from,
   to,
+  className,
 }: {
   swapped: boolean
   from: ReactNode
   to: ReactNode
+  className?: string
 }): React.JSX.Element {
   return (
-    <span className={s.swap}>
+    <span className={cx(s.swap, className)}>
       {face(from, swapped)}
```

```Core/Interface/Notifications/notifications.ts diff
@@ header and imports @@
-// Store-free, since the slices report through these writers: the notice on screen lives here, beside them.
-import { useSyncExternalStore } from 'react'
+// Store-free, since the slices report through these writers: the notice on screen and the bar the shown view declares live here, beside them.
+import { useEffect, useSyncExternalStore } from 'react'
 import type { Result } from '../../Contract/result'
 import { pushUndo } from '../../Session/undo'
 import type { CascadeReport } from '../../Nexus/cascade'
 import type { Unreadable } from '../../Nexus/tree'
 import { titleFromPath } from '../../Paths/posix'
 import { inTurns } from '../../Platform/inTurns'
 import { channel } from '@pommora/uix/Utilities/subscribable'
+import { useContentHost } from '../contentHost'
@@ useNotification @@
 export const useNotification = (): Posted | null => useSyncExternalStore(shown.subscribe, shown.get)
+
+/** What a shown view offers for its checked rows: the count the bar reads and the two actions it runs. */
+export interface ActionBar {
+  count: string
+  restore: () => void
+  remove: () => void
+}
+
+const declared = channel<ActionBar | null>(null)
+
+export const useActionBar = (): ActionBar | null =>
+  useSyncExternalStore(declared.subscribe, declared.get)
+
+/** Declared only while its view shows, as the count publishes: a parked view's bar would stand over another tab's view. */
+export function useDeclareActions(bar: ActionBar | null): void {
+  const host = useContentHost()
+  const live = host !== null && !host.parked
+  useEffect(() => {
+    if (!live) return
+    declared.set(bar)
+    return () => declared.set(null)
+  }, [live, bar])
+}
```

```Core/Interface/Notifications/ActionLabel.tsx diff
@@ imports @@
 import { useEffect, useRef, useState } from 'react'
-import { dismissNotification, useNotification } from './notifications'
+import { dismissNotification, useActionBar, useNotification } from './notifications'
 import { duration, ms } from '@pommora/uix/Animations/motion'
 import { paneSlide } from '@pommora/uix/Animations/paneSlide'
+import { Swap } from '@pommora/uix/Animations/Swap'
+import { Button } from '@pommora/uix/Buttons/Button'
 import { ProgressBar, paintProgress } from '@pommora/uix/Elements/ProgressBar'
 import { useHeld } from '@pommora/uix/Animations/useExitPresence'
 import { cx } from '@pommora/uix/Utilities/cx'
 import { Segments } from '@pommora/uix/Elements/Segments'
 import * as s from './action-label.css'
 import { clamp } from '@pommora/uix/Utilities/clamp'
 import { trackNear, withinBox } from '@pommora/uix/Interactions/hoverReveal'
@@ ActionLabel @@
 export function ActionLabel(): React.JSX.Element {
   const note = useNotification()
+  const bar = useActionBar()
   const hostRef = useRef<HTMLDivElement>(null)
-  const barRef = useRef<HTMLDivElement>(null)
+  const progressRef = useRef<HTMLSpanElement>(null)
   const nearRef = useRef(false)
   const [shown, setShown] = useState(false)
 
   useEffect(() => {
     if (!note) {
       setShown(false)
       return
     }
-    if (barRef.current) paintProgress(barRef.current, 1)
+    if (progressRef.current) paintProgress(progressRef.current, 1)
     nearRef.current = false
     setShown(true)
   }, [note])
 …
-      if (barRef.current) paintProgress(barRef.current, remaining)
+      if (progressRef.current) paintProgress(progressRef.current, remaining)
 …
-  // Proximity rather than hover: the pointer heading for the action reaches the drain before it does, so the label can't leave out from under a reach. A press holds the drain where it stands. A notice stays unarmed until the pointer has been seen outside its band once, since the press that posted it can leave the pointer inside.
+  // Proximity rather than hover: the pointer heading for the action reaches the drain before it does, so the label can't leave out from under a reach. A press holds the drain where it stands. A notice stays unarmed until the pointer has been seen outside its band once, since the press that posted it can leave the pointer inside; one posted with the pointer on the label itself, as a press of the bar's own leaves it, arms at once.
~  useEffect(() => {
~    const host = hostRef.current
~    if (!note || !shown || !host) return
-    let armed = false
+    let armed = host.matches(':hover')
 …
 
-  // Held so the label paints its own exit instead of retracting empty.
-  const held = useHeld(note, note !== null)
+  const face = note && shown ? 'notice' : bar ? 'bar' : null
+  const open = face !== null
+  // Held so the label paints its own exit, and cross-fades between faces, instead of retracting or fading to an empty one.
+  const held = useHeld(note, note !== null)
+  const heldBar = useHeld(bar, bar !== null)
+  const heldFace = useHeld(face, open)
+  const error = heldFace === 'notice' && held?.tone === 'error'
 
   return (
     <div
       ref={hostRef}
-      className={cx(
-        s.host,
-        paneSlide({ side: 'right', mode: 'overlay', open: shown }),
-        held?.tone === 'error' && s.error,
-      )}
-      role={held?.tone === 'error' ? 'alert' : 'status'}
-      inert={!shown}
+      className={cx(s.host, paneSlide({ side: 'right', mode: 'overlay', open }), error && s.error)}
+      role={error ? 'alert' : 'status'}
+      inert={!open}
     >
-      <div className={s.row}>
-        <span className={s.message}>
-          {held?.segment ? <Segments parts={[held.message, held.segment]} /> : held?.message}
-        </span>
-        {held?.action ? (
-          <button
-            type="button"
-            className={s.action}
-            onClick={() => {
-              if (!shown) return
-              void held.action?.run()
-              setShown(false)
-            }}
-          >
-            {held.action.label}
-          </button>
-        ) : null}
-      </div>
-      <ProgressBar ref={barRef} fill={1} />
+      <Swap
+        className={s.faces}
+        swapped={heldFace === 'notice'}
+        from={
+          heldBar && (
+            <span className={s.row}>
+              <span className={s.message}>
+                <Segments
+                  parts={[
+                    <Button
+                      key="restore"
+                      type="filled"
+                      size="button-inline"
+                      label="Restore"
+                      onClick={heldBar.restore}
+                    />,
+                    heldBar.count,
+                  ]}
+                />
+              </span>
+              <Button
+                type="destructive"
+                size="button-inline"
+                icon="trash"
+                iconSize="body"
+                title="Delete"
+                onClick={heldBar.remove}
+              />
+            </span>
+          )
+        }
+        to={
+          <span className={s.face}>
+            <span className={s.row}>
+              <span className={s.message}>
+                {held?.segment ? <Segments parts={[held.message, held.segment]} /> : held?.message}
+              </span>
+              {held?.action ? (
+                <button
+                  type="button"
+                  className={s.action}
+                  onClick={() => {
+                    if (!shown) return
+                    void held.action?.run()
+                    setShown(false)
+                  }}
+                >
+                  {held.action.label}
+                </button>
+              ) : null}
+            </span>
+            <ProgressBar ref={progressRef} fill={1} />
+          </span>
+        }
+      />
     </div>
   )
 }
```

```Core/Interface/Notifications/action-label.css.ts diff
@@ host @@
 export const host = style({
   position: 'fixed',
   top: `calc(var(--app-inset) + var(--toolbar-h) + var(--app-inset))`,
   right: 'var(--surface-inset)',
   zIndex: stack.top.interrupt,
   display: 'flex',
   flexDirection: 'column',
-  gap: SIZE.padX,
   minWidth: 220,
@@ error @@
 export const error = style({ borderColor: 'var(--error)' })
+
+export const faces = style({ placeItems: 'stretch' })
+
+export const face = style({ display: 'flex', flexDirection: 'column', gap: SIZE.padX })
```

```UIX/Elements/ProgressBar.tsx diff
@@ ProgressBar @@
-  ref?: Ref<HTMLDivElement>
+  ref?: Ref<HTMLSpanElement>
 }): React.JSX.Element {
   const pct = percent(fill)
   return (
-    <div
+    <span
       ref={ref}
 …
     >
-      <div className={s.fill} />
-    </div>
+      <span className={s.fill} />
+    </span>
   )
```

```UIX/Elements/progress-bar.css.ts diff
@@ track @@
 export const track = style({
+  display: 'block',
   width: '100%',
@@ fill @@
 export const fill = style({
+  display: 'block',
   height: '100%',
```

**VERIFY**

- [ ] The six new `ActionLabel.test.tsx` cases pass, and Phase 5's cases pass reading the shown face; `notifications.test.ts` and `UIX/Elements/ProgressBar.test.tsx` pass unchanged.
- [ ] `git grep -n "barRef" -- Core/Interface/Notifications` finds nothing; `git grep -n "useDeclareActions" -- Core` finds `notifications.ts` and the test alone until Task 6B-6.
- [ ] Run the gates.
- [ ] Check for unnecessary code or mistakes.

**Lines:** +70 (+109 / −39): `Swap.tsx` +4 / −1, `notifications.ts` +23 / −1, `ActionLabel.tsx` +72 / −32 (19 moved), `action-label.css.ts` +4 / −1, `ProgressBar.tsx` +4 / −4, `progress-bar.css.ts` +2, these figures including +4 of imports; moved lines count on both sides. Estimate +38. Tests ≈ +70.

#### Task 6B-2

**TASK:** File History becomes `PageReaderWindow` over one typed `Reader` slot: one shell, a History branch as today, and an Archive branch that reads an archived page once, uncached, and closes once a change to either store leaves its file gone; both carry the lock glyph. ArchiveView opens the Archive branch in Task 6B-6.

**NOW:** In `Core/Interface/Windows/PageHistoryWindow.tsx`, `PageHistoryWindow` (`:48-53`) holds `historyTarget` and keys `PageHistoryBody` (`:55-260`) on the page id; the body reads the Current Version through `fetchPageDetail(livePath)` (`:100-116`), which never answers from the cache, so a direct `page:open` reads the same and seeds nothing. `page:open` has no tree gate, so an archived path reads as is. Custom glyphs render `aria-hidden="true"` with no children (`UIX/Symbols/customGlyphs.tsx:20-32`), so `<Icon name="locked">` has no tooltip. `Core/Session/windowSlice.ts` holds `historyTarget`, `openHistory`, `closeHistory` (`:30-32`, `:142-143`), counted in `windowsOpen` (`:66`) and `CLOSED` (`:73`) and re-keyed through `reconcileWith` (`:279-281`). `storesChanged` (Phase 2-3) is both stores' one change signal.

**CHANGE**

- [ ] Write the tests and watch them fail: `Core/Session/windowSlice.test.ts` › "keeps the history window while the tree holds its page, and closes it once the page is gone" (`:22`) and "re-keys a window tab and the history target to the page now at their path" (`:36`, retitled "re-keys a window tab and the history reader to the page now at their path") read `reader` as `{ kind: 'history', page }`; new "keeps an archive reader through a tree change that holds none of its page" (an archive reader at `.nexus/archive/c1/Notes/2026-10-20T00-00-00-000Z__A.archived/A.md` stays the same object after `reconcileWindow(indexOf({}))`). `Core/Session/devicePrefsSeed.test.tsx:227` calls `s.openReader({ kind: 'history', page })`; `:242` expects `reader: null`.
- [ ] `git mv Core/Interface/Windows/PageHistoryWindow.tsx Core/Interface/Windows/PageReaderWindow.tsx`; split into `PageReaderWindow` (presence, a `switch` on kind), `ReaderShell` (geometry under `'page-reader'`, the lock as `lead`, the trail title, the optional right panel, the inert editor host, the read-only editor with `READER_ANCESTOR`, the scrollbar), `HistoryReader` (as today; the Current Version by a direct `page:open`), and `ArchiveReader` (one read; closes on a refused re-ask after `storesChanged`, Cautionary 32); `HISTORY_ANCESTOR` → `READER_ANCESTOR = 'page-reader'`; the `:35` comment → "inside the reader"; drop `fetchPageDetail`'s import.
- [ ] Behavior change: the remembered size moves from `devicePrefs.windows['page-history']` to `'page-reader'`, so each device opens the reader once at its default size.
- [ ] `windowSlice.ts`: `Reader`, `reader`, `openReader`, `closeReader` replace `historyTarget`, `openHistory`, `closeHistory` (`windowsOpen` and `CLOSED` follow); the reconcile `switch`es on kind: History re-keys as today, Archive ignores tree changes.
- [ ] `page-window.css`: `.page-history-page` → `.page-reader-page`, the `:30` comment naming the read-only page; `.reader-lock` seats the glyph at an inline button's height. `markdown-pm.css:79`: the same rename.
- [ ] Sibling sweep: `App.tsx:16`, `:191` mount `PageReaderWindow`; `pageMenuActions.ts:64` → `s.openReader({ kind: 'history', page: ref })`; `git grep` for `historyTarget`, `openHistory`, `closeHistory`, `PageHistoryWindow`, `HISTORY_ANCESTOR`, `page-history-page` across `Core Desktop UIX .claude/scripts` finds only renamed sites; `.page-history-row` and `'page-history-list'` stay.

**AFTER**

```Core/Session/windowSlice.ts diff
@@ imports @@
 import { isWindowTarget, type PageTarget, toNavRef, type WindowTarget } from '../Navigation/navRef'
+import type { TrailSegment } from '@pommora/uix/Elements/NavTrail'
@@ Reader @@
+/** The one read-only reader: a page's File History, or an archived page titled by the trail it left. */
+export type Reader =
+  | { kind: 'history'; page: PageTarget }
+  | { kind: 'archive'; page: PageTarget; trail: TrailSegment[] }
+
 export interface WindowSlice {
@@ WindowSlice @@
-  historyTarget: PageTarget | null
-  openHistory: (target: PageTarget) => void
-  closeHistory: () => void
+  reader: Reader | null
+  openReader: (reader: Reader) => void
+  closeReader: () => void
@@ windowsOpen @@
   s.windowSlot !== null ||
-  s.historyTarget !== null ||
+  s.reader !== null ||
@@ CLOSED @@
   windowSlot: null,
-  historyTarget: null,
+  reader: null,
@@ createWindowSlice @@
-    openHistory: (target) => set({ historyTarget: target }),
-    closeHistory: () => set({ historyTarget: null }),
+    openReader: (reader) => set({ reader }),
+    closeReader: () => set({ reader: null }),
@@ reconcileWindow @@
-      const history = get().historyTarget
-      const r = history && reconcileWith(index, history)
-      if (r && r !== history) set({ historyTarget: r.kind === 'page' ? r : null })
+      const reader = get().reader
+      if (reader)
+        switch (reader.kind) {
+          case 'history': {
+            const r = reconcileWith(index, reader.page)
+            if (r !== reader.page)
+              set({ reader: r.kind === 'page' ? { kind: 'history', page: r } : null })
+            break
+          }
+          case 'archive':
+            break
+        }
     },
```

```Core/Interface/Windows/PageReaderWindow.tsx diff
@@ imports (renamed from PageHistoryWindow.tsx) @@
 import { reportRefusal } from '../Notifications/notifications'
 import { useCallback, useEffect, useState } from 'react'
 import { fault, ok, type Result, valueOr } from '../../Contract/result'
 import { fetchPageValues } from '../../Properties/pageRow'
 import { relDirname } from '../../Paths/posix'
 import { Button } from '@pommora/uix/Buttons/Button'
 import { Checkbox } from '@pommora/uix/Controls/Checkbox'
-import { NavTrail } from '@pommora/uix/Elements/NavTrail'
+import { NavTrail, type TrailSegment } from '@pommora/uix/Elements/NavTrail'
 import { MenuFooting, MenuItem, MenuSeparator } from '@pommora/uix/Menus'
 import { Segments } from '@pommora/uix/Elements/Segments'
 import { gutter } from '@pommora/uix/Menus/menu-row.css'
 import { useHeldPresence } from '@pommora/uix/Animations/useExitPresence'
~import { actedOn, retained, toggled } from '@pommora/uix/Utilities/checkSet'
+import { Icon } from '@pommora/uix/Symbols'
 import { MarkdownEditor } from '../../MarkdownPM/MarkdownEditor'
 import { useEditorHost } from '../../Pages/editorHost'
 import { clockOf, formatDate } from '../../Properties/formatValue'
 import { pageWriter } from '../../Session/saveScheduler'
-import { fetchPageDetail } from '../../Session/pageDetailCache'
+import { storesChanged } from '../../Session/nexusSlice'
 import { livePagePath } from '../../Nexus/record'
 import { trailOf } from '../../Nexus/treeIndex'
 import { useConnections } from '../../Session/pageConnections'
 import { useSession, useSetting } from '../../Session/store'
+import type { Reader } from '../../Session/windowSlice'
 import type { PageTarget } from '../../Navigation/navRef'
 import { askDeleteSnapshots, askRestoreSnapshot } from '../Confirm/confirmations'
 import { WINDOW_BASE_PANEL, WindowBase } from '@pommora/uix/Windows/WindowBase'
 import { Scrollbar } from '@pommora/uix/Interactions/Scrollbar'
 import { dialer } from '../../Platform/dialer'
 import { popMenu } from '../../Actions/menuActions'
~import { restoreMenuItems } from '../../Actions/restoreMenu'
 import { useWindowGeometry } from './useWindowGeometry'
@@ the ancestor @@
-// A non-path host chain: embeds inside a snapshot render inert, and no page path can collide with it.
-const HISTORY_ANCESTOR = 'page-history'
+// A non-path host chain: embeds inside the reader render inert, and no page path can collide with it.
+const READER_ANCESTOR = 'page-reader'
+
+type Branch<K extends Reader['kind']> = { reader: Extract<Reader, { kind: K }>; closing: boolean }
 
 async function restoreFromHistory(target: PageTarget, ts: number): Promise<Result<null>> {
 …
 }
@@ PageReaderWindow @@
-export function PageHistoryWindow(): React.JSX.Element | null {
-  const target = useSession((s) => s.historyTarget)
-  const shown = useHeldPresence(target, 'fast')
-  if (!shown) return null
-  return <PageHistoryBody key={shown.held.id} target={shown.held} closing={shown.closing} />
-}
+export function PageReaderWindow(): React.JSX.Element | null {
+  const reader = useSession((s) => s.reader)
+  const shown = useHeldPresence(reader, 'fast')
+  if (!shown) return null
+  const { held, closing } = shown
+  switch (held.kind) {
+    case 'history':
+      return <HistoryReader key={`history:${held.page.id}`} reader={held} closing={closing} />
+    case 'archive':
+      return <ArchiveReader key={`archive:${held.page.path}`} reader={held} closing={closing} />
+  }
+}
+
+/** The one read-only page window: the lock where the open-fullscreen glyph sits, an inert editor, and a trail that names the page without renaming it. */
+function ReaderShell({
+  reader,
+  closing,
+  ariaLabel,
+  trail,
+  body,
+  embedPath,
+  panel,
+}: {
+  reader: Reader
+  closing: boolean
+  ariaLabel: string
+  trail: TrailSegment[]
+  body: string | null
+  embedPath: string
+  panel?: React.ReactNode
+}): React.JSX.Element {
+  const closeReader = useSession((s) => s.closeReader)
+  const geometry = useWindowGeometry('page-reader')
+  const resolveOnly = useConnections('inert')
+  const editorHost = useEditorHost({ connections: resolveOnly, inert: true })
+  return (
+    <WindowBase
+      {...geometry}
+      closing={closing}
+      onClose={closeReader}
+      raiseOn={reader}
+      ariaLabel={ariaLabel}
+      lead={
+        <span className="reader-lock" role="img" aria-label="Read Only" title="Read Only">
+          <Icon name="locked" size="body" />
+        </span>
+      }
+      title={
+        <div className="window-toolbar-title">
+          <NavTrail segments={trail} selected className="page-window-crumbs" />
+        </div>
+      }
+      right={
+        panel === undefined
+          ? undefined
+          : {
+              windowId: 'page-history-list',
+              bounds: WINDOW_BASE_PANEL,
+              mode: 'overlay',
+              open: true,
+              children: panel,
+            }
+      }
+    >
+      <div className="window-body scroll-fade page-tile-grows">
+        {body !== null && (
+          <div className="page-tile page-reader-page">
+            <MarkdownEditor
+              initialBody={body}
+              onChange={() => {}}
+              host={editorHost}
+              readOnly
+              embedAncestors={[READER_ANCESTOR, embedPath]}
+              edgeFade
+            />
+          </div>
+        )}
+      </div>
+      <Scrollbar page />
+    </WindowBase>
+  )
+}
@@ HistoryReader (was PageHistoryBody) @@
-function PageHistoryBody({
-  target,
-  closing,
-}: {
-  target: PageTarget
-  closing: boolean
-}): React.JSX.Element {
-  const closeHistory = useSession((s) => s.closeHistory)
-  const geometry = useWindowGeometry('page-history')
+function HistoryReader({ reader, closing }: Branch<'history'>): React.JSX.Element {
+  const target = reader.page
   const tree = useSession((s) => s.tree)
 …  (the snapshot rows, checks, shown snapshot, reload, livePath, restoreTarget, refresh, and the modified-time read, unchanged, HEAD :64-98)
@@ the shown body @@
     const read =
       shown === null
-        ? fetchPageDetail(livePath).then((d) => d?.body ?? null)
+        ? dialer()
+            .ask('page:open', livePath)
+            .then((r) => valueOr(r, null)?.body ?? null)
         : dialer()
             .ask('history:read', target.id, shown)
             .then((r) => valueOr(r, null))
@@ the editor host and the trail @@
-  const resolveOnly = useConnections('inert')
-  const editorHost = useEditorHost({ connections: resolveOnly, inert: true })
   const trail = trailOf(tree, { kind: 'page', id: target.id })
 …  (toggle, restore, remove, Phase 5-3's openMenu, when, and `list`, unchanged)
@@ the window @@
-  return (
-    <WindowBase
-      {...geometry}
-      closing={closing}
-      onClose={closeHistory}
-      raiseOn={target}
-      ariaLabel="File History"
-      title={
-        <div className="window-toolbar-title">
-          <NavTrail segments={trail} selected className="page-window-crumbs" />
-        </div>
-      }
-      right={{
-        windowId: 'page-history-list',
-        bounds: WINDOW_BASE_PANEL,
-        mode: 'overlay',
-        open: true,
-        children: list,
-      }}
-    >
-      <div className="window-body scroll-fade page-tile-grows">
-        {body !== null && (
-          <div className="page-tile page-history-page">
-            <MarkdownEditor
-              initialBody={body}
-              onChange={() => {}}
-              host={editorHost}
-              readOnly
-              embedAncestors={[HISTORY_ANCESTOR, livePath]}
-              edgeFade
-            />
-          </div>
-        )}
-      </div>
-      <Scrollbar page />
-    </WindowBase>
-  )
+  return (
+    <ReaderShell
+      reader={reader}
+      closing={closing}
+      ariaLabel="File History"
+      trail={trail}
+      body={body}
+      embedPath={livePath}
+      panel={list}
+    />
+  )
 }
+
+/** An archived page as it stood when opened, read uncached, and closed once a change to either store leaves its file gone. */
+function ArchiveReader({ reader, closing }: Branch<'archive'>): React.JSX.Element {
+  const closeReader = useSession((s) => s.closeReader)
+  const { path } = reader.page
+  const [body, setBody] = useState<string | null>(null)
+  useEffect(() => {
+    let live = true
+    const read = (): void =>
+      void dialer()
+        .ask('page:open', path)
+        .then((r) => {
+          if (!live) return
+          if (r.ok) setBody((was) => was ?? r.value.body)
+          else closeReader()
+        })
+    read()
+    const stop = storesChanged.subscribe(read)
+    return () => {
+      live = false
+      stop()
+    }
+  }, [path, closeReader])
+  return (
+    <ReaderShell
+      reader={reader}
+      closing={closing}
+      ariaLabel="Archived Page"
+      trail={reader.trail}
+      body={body}
+      embedPath={path}
+    />
+  )
+}
```

```Core/Interface/Windows/page-window.css diff
@@ the read-only page @@
-/* A snapshot is a record, not a writing surface: the text stays selectable, but no caret ever seats in it and the pointer keeps its arrow. */
-.page-history-page .mdpm-caret-layer {
+/* A read-only page is a record, not a writing surface: the text stays selectable, but no caret ever seats in it and the pointer keeps its arrow. */
+.page-reader-page .mdpm-caret-layer {
   display: none;
 }
-.page-history-page .cm-editor .cm-scroller .cm-content {
+.page-reader-page .cm-editor .cm-scroller .cm-content {
   cursor: default;
 }
+/* At an inline button's height, so the glyph sits level with the window's other toolbar controls. */
+.reader-lock {
+  display: inline-flex;
+  align-items: center;
+  height: 20px;
+  padding-inline: 2px;
+}
```

```Core/MarkdownPM/markdown-pm.css diff
@@ :79 @@
-:is(.tile.is-locked, .tile-base.is-inert, .page-history-page, .glance-body) .cm-placeholder {
+:is(.tile.is-locked, .tile-base.is-inert, .page-reader-page, .glance-body) .cm-placeholder {
```

```Core/Interface/App.tsx diff
@@ imports @@
-import { PageHistoryWindow } from './Windows/PageHistoryWindow'
+import { PageReaderWindow } from './Windows/PageReaderWindow'
@@ the windows @@
-        {status === 'ready' && <PageHistoryWindow />}
+        {status === 'ready' && <PageReaderWindow />}
```

```Core/Interface/Menus/pageMenuActions.ts diff
@@ title:history @@
     case 'title:history':
-      s.openHistory(ref)
+      s.openReader({ kind: 'history', page: ref })
       return true
```

**VERIFY**

- [ ] The listed `windowSlice.test.ts` and `devicePrefsSeed.test.tsx` cases pass.
- [ ] `git grep -n "historyTarget\|openHistory\|closeHistory\|PageHistoryWindow\|HISTORY_ANCESTOR\|page-history-page\|'page-history'" -- Core Desktop UIX .claude/scripts` finds nothing; `git grep -n "fetchPageDetail" -- Core/Interface/Windows/PageReaderWindow.tsx` finds nothing (`windowTabBanner.ts:7`, `:35` keep their own import and call).
- [ ] `git grep -n "openReader" -- Core` finds `windowSlice.ts`, `pageMenuActions.ts`, and the tests until Task 6B-6.
- [ ] Run the gates.
- [ ] Check for unnecessary code or mistakes.

**Lines:** +99 (+173 / −74): `PageReaderWindow.tsx` +137 / −58 (38 moved; +79 net), `windowSlice.ts` +24 / −10, `page-window.css` +8 / −2, the four renamed sites ±0, these figures including +3 of imports. Estimate +38. Tests ≈ +12 / −6.

#### Task 6B-3

**TASK:** The archive place becomes a navigation kind, `{ kind: 'archive'; id }`, owned by a Collection or a top-level Set and carried by selection, tabs, pins, recents, Back and Forward, relaunch, the settings pane, and the Subfield's count and crumbs; the views dropdown's Archive toggle enters it. `HostView` renders the blank frame for it until Task 6B-6.

**NOW:** `liveTarget` (`Core/Navigation/tabsModel.ts:29-33`) probes each stored ref through `selectTargetOf` (a `NodeKind` switch), then `reconcileWith`. `openTab` already opens a new tab from a pinned tab whatever `newTab` says (`tabsModel.test.ts:96`, "spawns a new tab when the active tab is pinned (D-2)"), so the toggle passes `{ newTab: false }` alone (ruling 13). `crumbDepthFor` answers null for a target without a spine, as an archive place is. In `reconcileSelection.ts`, `index.collections` holds Collection ids and `index.sets` maps Set ids to paths. `searchEntriesOf`'s `byKind` (`Core/Nexus/treeIndex.ts:149-156`) keys on `NodeRecord.kind`, typed `NavRef['kind']` (`:23`): unless excluded, `'archive'` would list the place in nav search and overwrite its owner in `nodesByIdOf`. `treeIndex.ts` is renderer-side, so `ViewMenu.tsx:19-25`'s inline depth rule (`set?.path.split('/').length === 2`, its only copy) moves to the host-safe `Core/Nexus/treePatch.ts`. `Core/Matrix/matrixKind.ts` is the precedent for a non-node place's constants; Lucide 1.18 ships `Archive`. `ViewFrame.tsx:108-117` holds the disabled `// PLACEHOLDER` More `AccessoryButton`; `switchTo` (`:65-68`) returns early on the active view.

**CHANGE**

- [ ] Write the tests and watch them fail: `Core/Navigation/navRef.test.ts` › "admits an archive place by its owner's id and refuses one without" (`isNavRef({ kind: 'archive', id: 'c1' })` true, `{ kind: 'archive' }` false; `isForeignRef({ kind: 'archive', id: 'c1' })` false). `Core/Navigation/tabsModel.test.ts` › `describe('tabsModel — the archive place')`: "liveTarget keeps an archive place while its Collection stands, and drops one whose owner is gone" (`id: 'col'` kept over `mkTree('a')`; `id: 'gone'` → null); "opening an archive place from a pinned tab spawns a tab rather than replacing the pin" (passes before and after: `openTab(…, { kind: 'archive', id: 'col' }, { newTab: false }, 'A1')` from a pinned tab → new tab `A1`). `Core/Nexus/treeIndex.test.ts`: `describe('reconcileIndexOf')` › "an archive place holds while its owner is a Collection or a top-level Set, and reconciles to none once the owner is gone or the Set sits deeper" (`archive:c1`, `archive:s1` kept; `archive:gone`, and `archive:s2` over a pushed `Notes/Ideas/Deep`, → `none`, Cautionary 22); `resolveIndexOf` › `:68` retitled "holds display cores for the homepage, the Matrix, spaces, collections, sets, pages, and each Collection's and top-level Set's archive — never groups" (`archive:c1` → `Notes`, icon `archive`, path `['Notes']`; `archive:s1` → path `['Notes', 'Ideas']`); `searchEntriesOf` › "never lists an archive place the resolve index holds" (`resolveIndexOf(t).has('archive:c1')`; no entry key starts `archive:`); `navKeysOf` › `:186` gains `'archive:c1'` and `'archive:s1'`. `Core/Interface/Subfield/subfieldItems.test.ts` › "a container states its result count" (`:9`) → "a container and its archive state their result count" (adds `DEFAULT_ITEMS.archive`). `Core/Views/Settings/ViewFrame.test.tsx` › `describe('ViewFrame — the Archive toggle')` (`select` stubbed through `useSession.setState`): "the footing holds New View and an Archive button, and no More button"; "pressing Archive shows the archive in place, and pressing it there returns to the view" (`select({ kind: 'archive', id: 'col1' }, { newTab: false })`; from that selection, `aria-pressed` true and `select({ kind: 'collection', id: 'col1' }, { newTab: false })`); "picking a view from the archive returns to it" (`Board` → `select` the Collection, `mutate` `setActiveView`). `Core/Interface/Subfield/crumbs.test.ts` › `describe('subfieldCrumbs')`: "an archive's crumbs are its owner's ancestry, each navigable, then a plain Archive" (`id: 's1'` → `['Notes', 'Ideas', 'Archive']`, `onSelect` on the first two). `Core/Actions/createActions.test.ts` › `describe('newPage')`: "creates in the Set whose archive shows" (`seed({ kind: 'archive', id: 's1' })` → `parentPath` `Notes/Ideas`; HEAD falls back to the first Collection).
- [ ] `navRef.ts`: the archive target joins `SelectionState` and `NavRef`; `'archive'` joins `NAV_KINDS`.
- [ ] `tabsModel.ts`: `liveTarget` passes an archive ref to `reconcileWith` before the `selectTargetOf` probe.
- [ ] `treePatch.ts`: `isTopSet(path)`. `reconcileSelection.ts`: `case 'archive'` keeps the place while its id names a Collection or a top-level Set, else `none`.
- [ ] `navigationSlice.ts` `select`: `case 'archive'`.
- [ ] `Core/Archive/archivePlace.ts` (new): `ARCHIVE_ICON` and `archiveOwnerOf(tree, id)` through `treePatch`'s `findContainerById` and `isTopSet` (`treeIndex.ts`'s `findSet` would cycle: it imports `ARCHIVE_ICON`). `UIX/Symbols/index.tsx`: `archive: Archive` beside `trash`.
- [ ] `treeIndex.ts`: `NodeRecord.kind` excludes `'archive'`; `archiveCoresOf` (one core per Collection and top-level Set, memoized on `nodesOf`) feeds `resolveIndexOf` (the owner's title with the archive glyph, ruling 9) and `navKeysOf`, whose doc names the Archive places.
- [ ] `ContentView.tsx`: `SUBFIELD.archive = true`; `HostView`'s `case 'archive'` returns the blank `detail interface-inset` frame (no copy, Cautionary 19) until Task 6B-6. `subfieldItems.tsx`: `DEFAULT_ITEMS.archive = ['count']`. `crumbs.ts`: the container arm's mapping becomes `crumbsOver(spine, currentPos)`, a closure over `navigate` and `foldersOpen`; `case 'archive'` passes the owner's ancestry from the memoized ancestries (not `archiveOwnerOf`, a tree walk per render) plus an `Archive` node, which `targetOf` answers null for, so the crumbs above it navigate (an owner sits at depth 0 or 1) and `Archive` is plain. `SettingsMenu.tsx`: `case 'archive'` joins `none`'s spacer.
- [ ] `ViewMenu.tsx`: one owner rule through `archiveOwnerOf` for the Collection, the Set, and the archive place (the inline depth rule and the `findCollection`/`findSet` import leave), keyed on the owner's id so the dropdown holds across the toggle; the doc names the place.
- [ ] `ViewFrame.tsx`: drop the placeholder and its `AccessoryButton` import; `leading` holds `FootingCreate`, then the filled inline Archive button, pressed on the archive and toggling in place (`{ newTab: false }`); `switchTo` leaves the archive for the picked view (ruling 14).
- [ ] `Core/Actions/createActions.ts`: `newPage` reads an archive place as the container its id names (`findContainerById`), so New Page there creates in that Collection or Set, not the first Collection.
- [ ] Sibling sweep: `git grep -n "isContainer(" -- Core`: `newPage` (`createActions.ts:66`) takes the arm above; `crumbs.ts:12`'s `hasSpine` is false for the place; `Banner.tsx:98` reads the owner ArchiveView passes; `destinationTree.ts:15`, `entityMenu.ts:60`, `sidebarDndModel.ts:260`, `treePatch.ts:231`, `pendingView.ts:132`, `delete.ts:41`, `:109` never test a selection. `git grep -n "selection.kind ===\|target.kind ===" -- Core`: `Sidebar.tsx:109`, `:210` stay false on the place; `searchView` (`Core/Session/viewSearchSlice.ts:27`) widens in Task 6B-6.

**AFTER**

```Core/Navigation/navRef.ts diff
@@ SelectionState @@
+/** A Collection's or a top-level Set's Archive, addressed by its owner's id: a place of its own, not a node. */
+type ArchiveTarget = { kind: 'archive'; id: string }
+
 export type SelectionState =
   | { kind: 'none' }
   | { kind: 'homepage' }
   | { kind: 'matrix' }
   | NodeTarget
+  | ArchiveTarget
@@ NavRef @@
-export type NavRef = { kind: 'homepage' } | { kind: 'matrix' } | { kind: NodeKind; id: string }
+export type NavRef =
+  | { kind: 'homepage' }
+  | { kind: 'matrix' }
+  | { kind: NodeKind; id: string }
+  | ArchiveTarget
@@ NAV_KINDS @@
 const NAV_KINDS: ReadonlySet<string> = new Set<NavRef['kind']>([
   'homepage',
   'matrix',
   ...NODE_KINDS,
+  'archive',
 ])
```

```Core/Navigation/tabsModel.ts diff
@@ liveTarget @@
 export function liveTarget(index: ReconcileIndex, ref: NavRef): SelectTarget | null {
-  const probe = isSingleton(ref) ? ref : selectTargetOf({ ...ref, path: '' })
+  const probe =
+    isSingleton(ref) || ref.kind === 'archive' ? ref : selectTargetOf({ ...ref, path: '' })
   const r = reconcileWith(index, probe)
```

```Core/Nexus/treePatch.ts diff
@@ archiveReach (Phase 3-1) @@
~  const owner = owningCollection(tree, rel)
~  return owner ? archiveDirRel(owner.id) : null
 }
+
+/** A Set directly inside its Collection: the depth that keeps views of its own and an Archive place. */
+export const isTopSet = (path: string): boolean => path.split('/').length === 2
```

```Core/Session/reconcileSelection.ts diff
@@ imports @@
 import { reconcileIndexOf } from '../Nexus/treeIndex'
+import { isTopSet } from '../Nexus/treePatch'
@@ reconcileWith @@
       return path === selection.path ? selection : { kind: 'page', id: selection.id, path }
     }
+    case 'archive':
+      return index.collections.has(selection.id) || isTopSet(index.sets.get(selection.id) ?? '')
+        ? selection
+        : { kind: 'none' }
   }
 }
```

```Core/Session/navigationSlice.ts diff
@@ select @@
         case 'set':
           set({ selection: { kind: 'set', id: target.id, path: target.path } })
           break
+        case 'archive':
+          set({ selection: { kind: 'archive', id: target.id } })
+          break
         case 'page':
```

```Core/Archive/archivePlace.ts diff
@@ new file @@
+import type { IconName } from '@pommora/uix/Symbols'
+import type { CollectionNode, NexusTree, SetNode } from '../Nexus/tree'
+import { findContainerById, isTopSet } from '../Nexus/treePatch'
+
+export const ARCHIVE_ICON: IconName = 'archive'
+
+/** The Collection or top-level Set with this id, what owns an archive place and saved views of its own; none once it's gone or sits deeper. */
+export function archiveOwnerOf(
+  tree: NexusTree | null,
+  id: string,
+): CollectionNode | SetNode | undefined {
+  const node = tree && findContainerById(tree, id)
+  return node && (node.kind === 'collection' || isTopSet(node.path)) ? node : undefined
+}
```

```UIX/Symbols/index.tsx diff
@@ imports @@
 import {
   AppWindow,
+  Archive,
   ArrowUpDown,
@@ icons @@
   trash: Trash,
+  archive: Archive,
   'chevron-left': ChevronLeft,
```

```Core/Nexus/treeIndex.ts diff
@@ imports @@
 import { MATRIX_ICON, MATRIX_TITLE } from '../Matrix/matrixKind'
+import { ARCHIVE_ICON } from '../Archive/archivePlace'
 import type { CollectionNode, NexusTree, SetNode, SpaceNode } from './tree'
 import { entityMemo } from './tree'
-import { findContainerWhere, withheldIn } from './treePatch'
+import { findContainerWhere, isTopSet, withheldIn } from './treePatch'
@@ NodeRecord @@
 interface NodeRecord extends TrailNode {
   key: string
-  kind: NavRef['kind']
+  /** Every place but an Archive, which shares its owner's id: nav search lists none, and none overwrites its owner by id. */
+  kind: Exclude<NavRef['kind'], 'archive'>
@@ resolveIndexOf @@
+/** One display core per Archive place, each Collection's and each top-level Set's, titled by its owner and trailed by the owner's ancestry. */
+const archiveCoresOf = entityMemo([nodesOf], (tree): [string, NavCore][] =>
+  nodesOf(tree).flatMap((r): [string, NavCore][] =>
+    r.kind === 'collection' || (r.kind === 'set' && isTopSet(r.path))
+      ? [
+          [
+            navKey({ kind: 'archive', id: r.id }),
+            { icon: ARCHIVE_ICON, title: r.title, path: [...r.parents, r] },
+          ],
+        ]
+      : [],
+  ),
+)
+
 export const resolveIndexOf = entityMemo(
   [nodesOf],
   (tree): ResolveIndex =>
-    new Map<string, NavCore>(
-      nodesOf(tree).map((r) => [r.key, { icon: r.icon, title: r.title, path: r.parents }]),
-    ),
+    new Map<string, NavCore>([
+      ...nodesOf(tree).map((r): [string, NavCore] => [
+        r.key,
+        { icon: r.icon, title: r.title, path: r.parents },
+      ]),
+      ...archiveCoresOf(tree),
+    ]),
 )
@@ navKeysOf @@
-/** The closed set thumbnail eviction prunes against — nothing selects a Context group, so the records are the complete universe of capturable keys. */
-export const navKeysOf = entityMemo([(t) => t.contexts], (tree): string[] =>
-  nodesOf(tree).map((r) => r.key),
-)
+/** The closed set thumbnail eviction prunes against — nothing selects a Context group, so the records and their Archive places are the complete universe of capturable keys. */
+export const navKeysOf = entityMemo([(t) => t.contexts], (tree): string[] => [
+  ...nodesOf(tree).map((r) => r.key),
+  ...archiveCoresOf(tree).map(([key]) => key),
+])
```

```Core/Interface/ContentView.tsx diff
@@ SUBFIELD @@
   page: true,
   matrix: true,
+  archive: true,
 }
@@ HostView @@
     case 'matrix':
       return <MatrixView />
+    case 'archive':
+      return <div className="detail interface-inset" />
   }
```

```Core/Interface/Subfield/subfieldItems.tsx diff
@@ DEFAULT_ITEMS @@
   set: ['count'],
   page: ['pageStats'],
+  archive: ['count'],
 }
```

```Core/Interface/Subfield/crumbs.ts diff
@@ imports @@
 import { ancestryOf, type TrailNode, findSpace } from '../../Nexus/treeIndex'
+import { ARCHIVE_ICON } from '../../Archive/archivePlace'
@@ subfieldCrumbs @@
   if (!tree) return []
+  const crumbsOver = (spine: TrailNode[], currentPos: number): TrailSegment[] =>
+    spine.map((node, i) => {
+      const forwardCrumb = i > currentPos
+      // Up the spine the collection (0) and depth-1 set (1) open a detail surface; deeper Sets open only when folders do.
+      const navigable = forwardCrumb || (i < currentPos && (i <= 1 || foldersOpen))
+      const target = navigable ? targetOf(node) : null
+      return {
+        title: node.title,
+        ghost: forwardCrumb || undefined,
+        onSelect: target
+          ? (e: React.MouseEvent) => navigate(target, forwardCrumb ? 'forward' : 'back', isCmd(e))
+          : undefined,
+      }
+    })
   switch (selection.kind) {
@@ the container arm @@
           : currentChain
-      return spine.map((node, i) => {
-        const forwardCrumb = i > currentPos
-        // Up the spine the collection (0) and depth-1 set (1) open a detail surface; deeper Sets open only when folders do.
-        const navigable = forwardCrumb || (i < currentPos && (i <= 1 || foldersOpen))
-        const target = navigable ? targetOf(node) : null
-        return {
-          title: node.title,
-          ghost: forwardCrumb || undefined,
-          onSelect: target
-            ? (e: React.MouseEvent) => navigate(target, forwardCrumb ? 'forward' : 'back', isCmd(e))
-            : undefined,
-        }
-      })
+      return crumbsOver(spine, currentPos)
     }
+    case 'archive': {
+      const chain =
+        ancestryOf(tree, { kind: 'collection', id: selection.id }) ??
+        ancestryOf(tree, { kind: 'set', id: selection.id })
+      const owner = chain?.at(-1)
+      if (!chain || !owner) return []
+      return crumbsOver(
+        [
+          ...chain,
+          { kind: 'archive', id: owner.id, title: 'Archive', path: owner.path, icon: ARCHIVE_ICON },
+        ],
+        chain.length,
+      )
+    }
   }
 }
```

```Core/Actions/createActions.ts diff
@@ newPage (Phase 2-3) @@
-  if (isContainer(from)) parentPath = findContainerById(tree, from.id)?.path ?? null
+  if (isContainer(from) || from?.kind === 'archive')
+    parentPath = findContainerById(tree, from.id)?.path ?? null
   else if (from?.kind === 'page') parentPath = relDirname(from.path)
```

```Core/Interface/Toolbar/SettingsMenu.tsx diff
@@ scopePane @@
     case 'matrix':
       return <MatrixMenu />
+    case 'archive':
     case 'none':
       return <div style={{ minHeight: 24 }} />
```

```Core/Views/Settings/ViewMenu.tsx diff
@@ imports @@
-import { findCollection, findSet } from '../../Nexus/treeIndex'
+import { archiveOwnerOf } from '../../Archive/archivePlace'
@@ ViewMenu @@
-/** Renders only on a Collection / depth-1 Set; a sub-Set's edits save to its one view. */
+/** Renders on a Collection or a top-level Set and on either's Archive, so the dropdown holds across the toggle; a sub-Set's edits save to its one view. */
 export function ViewMenu(): React.JSX.Element | null {
   const selection = useSession((st) => st.selection)
   const tree = useSession((st) => st.tree)
-  const set = selection.kind === 'set' ? findSet(tree, selection.id) : undefined
-  const node =
-    selection.kind === 'collection'
-      ? findCollection(tree, selection.id)
-      : set?.path.split('/').length === 2
-        ? set
-        : undefined
+  const node =
+    selection.kind === 'collection' || selection.kind === 'set' || selection.kind === 'archive'
+      ? archiveOwnerOf(tree, selection.id)
+      : undefined
   if (!node) return null
   return <ViewMenuInner key={node.id} node={node} />
 }
```

```Core/Views/Settings/ViewFrame.tsx diff
@@ imports @@
 import {
   Menu,
   MenuItem,
   MenuFooting,
   MenuScrollFrame,
-  AccessoryButton,
   FootingCreate,
   menuDropLine,
 } from '@pommora/uix/Menus'
+import { selectTargetOf } from '../../Navigation/navRef'
@@ ViewFrame @@
   const mutate = useSession((s) => s.mutate)
+  const select = useSession((s) => s.select)
+  const inArchive = useSession((s) => s.selection.kind === 'archive')
   const saveView = useSaveView(node)
@@ switchTo @@
-  const switchTo = (id: string): void => {
-    if (id === active.id) return
-    void mutate({ op: 'setActiveView', path: node.path, kind: node.kind, viewId: id })
-  }
+  // In place: under New Tab, `select`'s default would open a tab per press.
+  const showArchive = (shown: boolean): void =>
+    void select(shown ? { kind: 'archive', id: node.id } : selectTargetOf(node), { newTab: false })
+  const switchTo = (id: string): void => {
+    if (inArchive) showArchive(false)
+    if (id === active.id) return
+    void mutate({ op: 'setActiveView', path: node.path, kind: node.kind, viewId: id })
+  }
@@ the footing @@
         <MenuFooting
-          leading={<FootingCreate ariaLabel="New View" onClick={() => void createView()} />}
-          trailing={
-            // PLACEHOLDER
-            <AccessoryButton
-              icon="dots"
-              size="control"
-              ariaLabel="More"
-              disabled
-              onClick={() => {}}
-            />
-          }
+          leading={
+            <>
+              <FootingCreate ariaLabel="New View" onClick={() => void createView()} />
+              <Button
+                type="filled"
+                size="button-inline"
+                label="Archive"
+                pressed={inArchive}
+                onClick={() => showArchive(!inArchive)}
+              />
+            </>
+          }
         />
```

**VERIFY**

- [ ] The listed `navRef`, `tabsModel`, `treeIndex`, `subfieldItems`, `crumbs`, `ViewFrame`, and `createActions` tests pass; `tabsModel.test.ts:96` (D-2) passes unchanged.
- [ ] `git grep -nP "(containerTrailWhere|findContainerWhere)\(\w+, \((\w)\) => \2\.id === [\w.]+\)" -- Core ':!*.test.ts'` still finds `treePatch.ts`' own `containerTrailById` alone (`archivePlace.ts` reads `findContainerById`); `git grep -n "spine.map" -- Core/Interface/Subfield/crumbs.ts` finds `crumbsOver` alone.
- [ ] `git grep -n "PLACEHOLDER\|AccessoryButton" -- Core/Views/Settings/ViewFrame.tsx` finds nothing; `git grep -n "split('/').length === 2" -- Core` finds `treePatch.ts` alone; `git grep -n "findCollection\|findSet" -- Core/Views/Settings/ViewMenu.tsx` finds nothing.
- [ ] `npm run test -- engineGraph hostGraph` passes (`archivePlace.ts` imports only `treePatch.ts` and types; nothing host-side imports it).
- [ ] Run the gates.
- [ ] Check for unnecessary code or mistakes.

**Lines:** +80 (+126 / −46): `navRef.ts` +9 / −1, `tabsModel.ts` +2 / −1, `treePatch.ts` +2, `reconcileSelection.ts` +5, `navigationSlice.ts` +3, `archivePlace.ts` +13, `Symbols/index.tsx` +2, `treeIndex.ts` +27 / −8, `ContentView.tsx` +3, `subfieldItems.tsx` +1, `crumbs.ts` +29 / −12 (12 moved), `createActions.ts` +2 / −1, `SettingsMenu.tsx` +1, `ViewMenu.tsx` +5 / −8, `ViewFrame.tsx` +22 / −15, these figures including +8 of imports. Estimate +48. Tests ≈ +90.

#### Task 6B-4

**TASK:** `BundleRow` gains `icon` and `stored` (id and path), the builders turning async for a Set's sidecar icon, and the Trash's rows draw that icon; `record.ts` states once whether an origin lies within a Set (`originOf`, `originWithin`); `bundles:list(store, within?)` narrows a Collection's Archive to what left from within one of its top-level Sets.

**NOW:** This task writes against the AFTERs of Phases 2 to 6A. `Core/Bundles/rows.ts`' `BundleRow` has no id, file path, or icon, and `bundleRowOf` and `bundleRows` are synchronous. Phase 4-5's `refileArchived` (`Core/Archive/refile.ts`) tests a Set origin inline (`const at = (held ?? origin.trail).indexOf(setId)`, then `if (origin.parent !== setId && at === -1) continue`) over its module-private `originOf(record)`. A Set's icon is its bundled sidecar's `icon` (`sidecarPath`); a page's is `tree.config.pageMetadata[id]?.icon`. The Trash's row draws `entityIcon(row.kind, undefined, defaultIcons)` (`Core/Settings/TrashFrame.tsx:246-251`), and `entityIcon` prefers a renderable `own`.

**CHANGE**

- [ ] Write the tests and watch them fail: `Core/Bundles/rows.test.ts`: "a page row carries the metadata's icon and its stored id and path, and a Set row its sidecar's icon". `Core/Bundles/handlers.test.ts` (Phase 2-3's `bundles:list` cases): "listed within a top-level Set, a Collection's Archive holds only what left from within it" (`bundles:list({ kind: 'archive', id: <Notes id> }, <Daily id>)` keeps a page from a sub-Set the tree holds (live trail) and one whose parent Set was archived after it (stored trail); drops one from another Set); "refuses a `within` that isn’t a string" (`bundles:list({ kind: 'archive', id: <Notes id> }, 7)` → `Invalid Set id.`). `Core/Settings/TrashFrame.test.tsx` › `describe('a Trash row')`: "draws its item’s own icon ahead of its kind’s" (a page row with `icon: 'hash'` draws `.lucide-hash`).
- [ ] `rows.ts`: `BundleRow` gains `icon?` and `stored?` (`{ id, path }`: the record's id and the item's path inside the bundle, for the reader and a restore's Undo); `iconOf` reads a page's from the tree's metadata, a Set's from its bundled sidecar (one read per Set row, at listing); `bundleRowOf` and `bundleRows` take `root` first and answer a promise.
- [ ] `Core/Bundles/record.ts`: `originOf(record)` (moved from `refile.ts`) and `originWithin(origin, setId, held)` beside `trailAbove`, where `held` is the tree's trail above the origin's parent (null once the tree no longer holds it), which each caller already holds. `Core/Archive/refile.ts`: the inline test becomes `originWithin(origin, setId, held)`; `at` stays, to rebuild a stored trail.
- [ ] `Core/Settings/TrashFrame.tsx`: a row's leading icon reads `row.icon` ahead of its kind's, as ArchiveView's will.
- [ ] `Core/Bundles/handlers.ts`: `bundles:list(store, within?)`, `BundleStore` always a store; a top-level Set's place lists its Collection's Archive with the Set's id as `within`, keeping what `originWithin` places inside it. `within` reads as `unknown`; anything but a string or nothing answers `Invalid Set id.`, as `assets:adopt` reads `subfolder` (`Core/Assets/handlers.ts:76`). `Core/Contract/bridge.ts`: the entry takes `within?: string`, commented.
- [ ] Sibling sweep: `rows.test.ts`'s three builder calls pass `root` first and `await`, as do `trashRecovery.test.ts:34`'s `rows` and Phase 4-2's E-5 case in `Core/Archive/archive.test.ts`; the browser hook passes no `within` until Task 6B-5.

**AFTER**

```Core/Bundles/rows.ts diff
@@ imports @@
-import { dirname, relative, titleFromPath } from '../Paths/posix'
+import { dirname, join, relative, relJoin, titleFromPath } from '../Paths/posix'
+import { sidecarPath } from '../Paths/paths'
+import { readJsonObject } from '../Files/atomicWrite'
+import { asString } from '../Nexus/coerce'
@@ BundleRow @@
   /** The search's key: the title, placed by the crumbs. */
   match: MatchKey
+  /** The item's own icon: a page's from the metadata the tree holds, a Set's from the sidecar it took into its bundle. */
+  icon?: string
+  /** A page or Set as stored, by its record's id and its path inside the bundle: what the reader opens and a restore's Undo finds again. */
+  stored?: { id: string; path: string }
 }
@@ iconOf (after matched) @@
+async function iconOf(
+  root: string,
+  record: ArtifactRecord,
+  path: string,
+  tree: NexusTree,
+): Promise<string | undefined> {
+  switch (record.entity) {
+    case 'page':
+      return record.id === undefined ? undefined : tree.config.pageMetadata[record.id]?.icon
+    case 'set':
+      return asString((await readJsonObject(sidecarPath(join(root, path), 'set')))?.icon)
+    default:
+      return undefined
+  }
+}
+
@@ bundleRowOf @@
-export function bundleRowOf(
+export async function bundleRowOf(
+  root: string,
   bundle: ListedBundle,
   store: BundleStore,
   tree: NexusTree,
~  byId: NexusPages['byId'],
-): BundleRow | null {
+): Promise<BundleRow | null> {
   const { record, bundlePath, artifactName } = bundle
 …
   if (!artifactName) return null
   const live = liveCrumbs(record, tree)
+  const path = relJoin(bundlePath, artifactName)
   return matched({
     bundlePath,
     kind: record.entity,
     title: record.entity === 'page' ? titleFromPath(artifactName) : artifactName,
     crumbs: live ?? frozenCrumbs(store, bundlePath),
     ...(live ? {} : { historical: true }),
     storedAt: storedAtOf(bundlePath),
+    icon: await iconOf(root, record, path, tree),
+    ...((record.entity === 'page' || record.entity === 'set') && record.id
+      ? { stored: { id: record.id, path } }
+      : {}),
~    homeResolves: homeResolvesFor(record, artifactName, tree, byId, bundlePath),
   })
 }
@@ bundleRows @@
-export function bundleRows(
+export async function bundleRows(
+  root: string,
   bundles: ListedBundle[],
   store: BundleStore,
   tree: NexusTree,
~  byId: NexusPages['byId'],
-): BundleRow[] {
-  return bundles
-    .map((b) => bundleRowOf(b, store, tree, byId))
-    .filter((row) => row !== null)
-    .sort((a, b) => (b.storedAt ?? -1) - (a.storedAt ?? -1))
+): Promise<BundleRow[]> {
+  const rows = await Promise.all(bundles.map((b) => bundleRowOf(root, b, store, tree, byId)))
+  return rows.filter((row) => row !== null).sort((a, b) => (b.storedAt ?? -1) - (a.storedAt ?? -1))
 }
```

```Core/Bundles/record.ts diff
@@ trailAbove (Phase 4-2) @@
~export const trailAbove = (tree: NexusTree, containerId: string): string[] | null =>
~  containerTrailById(tree, containerId)?.slice(0, -1).map((n) => n.id) ?? null
+
+/** The container an archived page or Set left, and the ids it stored above it. */
+export const originOf = (record: RecordFile): { parent: string; trail: string[] } | null =>
+  (record.entity === 'page' || record.entity === 'set') && record.parent.kind === 'container'
+    ? { parent: record.parent.id, trail: record.trail ?? [] }
+    : null
+
+/** Whether an origin lies within the Set `setId`: by `held`, the tree's trail above its parent, while the tree holds the parent, else by the trail it stored. */
+export const originWithin = (
+  origin: { parent: string; trail: string[] },
+  setId: string,
+  held: string[] | null,
+): boolean => origin.parent === setId || (held ?? origin.trail).includes(setId)
```

```Core/Archive/refile.ts diff
@@ imports @@
-import { RECORD_FILENAME, type RecordFile, trailAbove } from '../Bundles/record'
+import {
+  originOf,
+  originWithin,
+  RECORD_FILENAME,
+  type RecordFile,
+  trailAbove,
+} from '../Bundles/record'
@@ originOf (moved to record.ts) @@
-/** The container an archived page or Set left, and the ids it stored above it. */
-const originOf = (record: RecordFile): { parent: string; trail: string[] } | null =>
-  (record.entity === 'page' || record.entity === 'set') && record.parent.kind === 'container'
-    ? { parent: record.parent.id, trail: record.trail ?? [] }
-    : null
-
@@ refileArchived @@
     const held = trailAbove(tree, origin.parent)
     const at = (held ?? origin.trail).indexOf(setId)
-    if (origin.parent !== setId && at === -1) continue
+    if (!originWithin(origin, setId, held)) continue
     const trail = held ?? [...above, setId, ...origin.trail.slice(at + 1)]
```

```Core/Bundles/handlers.ts diff
@@ imports @@
 import { type BundleStore, listBundles } from './bundle'
+import { originOf, originWithin, trailAbove } from './record'
 import { bundleRows } from './rows'
@@ bundles:list @@
-  'bundles:list': withRoot(async (root, _ctx, raw: unknown) => {
+  'bundles:list': withRoot(async (root, _ctx, raw: unknown, within: unknown) => {
~    const store = storeFrom(raw)
~    if (!store) return fault('A store is required.')
+    if (within !== undefined && !isString(within)) return fault('Invalid Set id.')
~    const tree = await liveTreeOf(root)
~    const { byId } = await nexusPages(root, tree)
-    return ok(bundleRows(await listBundles(root, store), store, tree, byId))
+    const bundles = await listBundles(root, store)
+    const listed =
+      within === undefined
+        ? bundles
+        : bundles.filter(({ record }) => {
+            const origin = originOf(record)
+            return origin !== null && originWithin(origin, within, trailAbove(tree, origin.parent))
+          })
+    return ok(await bundleRows(root, listed, store, tree, byId))
   }),
```

```Core/Settings/TrashFrame.tsx diff
@@ TrashBody's rows @@
                         ? propertyTypeIconName(row.propertyType)
                         : 'tag'
-                      : entityIcon(row.kind, undefined, defaultIcons)
+                      : entityIcon(row.kind, row.icon, defaultIcons)
```

```Core/Contract/bridge.ts diff
@@ bundles:list @@
~  // No push carries what a store holds, so a browser asks again after every action and on `storesChanged`.
-  'bundles:list': { args: [store: BundleStore]; reply: Result<BundleRow[]> }
+  // `within` narrows a Collection's Archive to what left from within one of its top-level Sets.
+  'bundles:list': { args: [store: BundleStore, within?: string]; reply: Result<BundleRow[]> }
```

**VERIFY**

- [ ] The listed `rows`, bundles handler, and `TrashFrame` tests pass; `trashRecovery.test.ts` passes unchanged but for the awaited builder, and the rest of `TrashFrame.test.tsx` passes unchanged.
- [ ] `git grep -n "findSet\|containerTrailWhere" -- Core/Bundles Core/Archive` finds nothing.
- [ ] `npm run test -- engineGraph hostGraph` passes: `rows.ts` and `record.ts` read no React.
- [ ] Run the gates.
- [ ] Check for unnecessary code or mistakes.

**Lines:** +48 (+68 / −20): `rows.ts` +35 / −9, `handlers.ts` +12 / −2, `record.ts` +11, `refile.ts` +8 / −7, `bridge.ts` +1 / −1, `TrashFrame.tsx` +1 / −1; `originOf` moved. Tests apart.

#### Task 6B-5

**TASK:** The browser serves both stores: `rulesOf` holds every way the Trash and the Archive differ; an Archive delete goes to the Trash with an Undo back; an Archive restore's Undo re-archives under the bundle name it left, keeping its Archived date; the menu and the bar share `restore` and `remove`; the Trash's trail uses the shared `crumbSegments` and `historical`.

**NOW:** Task 6B-4 has landed: `icon?`, `stored?`, async builders taking `root`, and `bundles:list`'s `within?`. In `Core/Bundles/browser.ts`, `useBundleBrowser` switches on the store once, in `rulesOf(store.kind)`; `one(req, row)` runs through the slice's `mutate`, `many(targets, op)` through the channel (emitting no `storesChanged`), and `openMenu(row)` holds the one-row and batch arms inline. `checkedIn` is module-private in `UIX/Utilities/checkSet.ts`. The Trash's crumb mapping and frozen look sit in its row (HEAD `TrashFrame.tsx:297-304`, `trash-frame.css`'s `.trash-frame .is-historical`). In `confirmations.ts` (6A-1), `offerUndo` is module-private, and `confirmDelete` asks, sends `delete`, and answers nothing. A `delete` naming an Archive bundle moves the item to the Trash, its reply's `bundled` naming the Trash bundle unless Trash Mode is `system`; `restore` takes `{ kind: 'archive' }` (4-3). `mintBundle` tries an optional `leaf` first, a fresh stamp answering once something holds it; its callers pass names the host minted for the same item. A bundle's name is `stampedLeaf(stamp, n, base)`, `storedAtOf` reads the stamp back, and `holdsName` (`Core/Paths/names.ts:14-17`) tests a name that stays inside its folder. A row's leaf is `basename(row.bundlePath)`.

**CHANGE**

- [ ] Write the tests and watch them fail: `Core/Interface/Confirm/confirmations.test.ts` › `describe('a delete through the confirmation')`: "answers whether the delete went through" (true, then false when declined); "an Undo given a destination restores its bundle there"; `describe('an Undo over several bundles')`: "asks once for a batch, unasked only when every item would be" (`askTrashing`: pages with the switch off pass, a Set always asks, detail `They will be moved…`); "offers one Undo returning every bundle it was handed to the destination given" (`offerUndo`); "gives up that Undo once one of its bundles is restored from elsewhere" (`spendUndo` on one). `TrashFrame.test.tsx` › "lists the opened Nexus's trash after a switch" expects `expect(list).toHaveBeenCalledWith({ kind: 'trash' }, undefined)`. `Core/Archive/archive.test.ts`: "an archive handed the bundle name its item left takes it back, and one naming another name or a path takes a fresh stamp" (4-2's `Beta`: archive, restore, re-archive with the first leaf → exactly the first `bundlePath`; restore, rename `Beta 2`, same leaf → fresh `<stamp>__Beta 2.md.archived`; restore, `leaf: '../' + <that leaf>` → fresh bundle under `Notes/Daily`, nothing outside the chain). `Core/Nexus/mutateRequest.test.ts` › "refuses a kind or key outside its finite set…" (`:14`) refuses `archive` with a non-string `leaf`.
- [ ] `confirmations.ts`: export `offerUndo` with an optional destination, so the batch's Undo is the one `notifyTrashed` and `confirmArchive` end in; `notifyTrashed` takes `undoTo?`; extract `confirmDelete`'s question as `askTrashing(message, kinds)` for the batch ("They" for more than one kind); `confirmDelete` takes `undoTo?` and answers whether the delete went through.
- [ ] `browser.ts`: add `crumbSegments` (hoisted from `TrashFrame.tsx:298-301`), `archivedKind`, `requestOf`, and `rearchive` (Sets found by `findContainerById`; each item handed its bundle's leaf). `rulesOf` gains the delete op, the batch-delete question, one row's delete (Trash: `askEmptyTrash` and `emptyBundle`; Archive: `confirmDelete` with `undoTo: { kind: 'archive' }`), and the Archive's Undos (`rearchive` after a restore, `{ kind: 'archive' }` after a delete). `one` reports every restore its store gives an Undo (a batch of one names its title). `many` sends `delete` through `requestOf`, gathers the bundles a delete minted, and emits `storesChanged` with its refresh, so the other browser and an open reader hear a batch. `restoreBatch` passes `notifyOutcome` the restore Undo as its `undo`. `emptyBatch` → `deleteBatch`: the store's question and delete, then `offerUndo` over the gathered bundles (none for a Trash empty) with the delete Undo. `picked`: the checked rows still in view, through `checkedIn`, now exported from `checkSet.ts`. `restore(targets)` and `remove(targets)` take the arms out of `openMenu`, shared by the menu and the bar. A row whose place is gone runs `one` alone, and the slice's `mutate` reports the refusal (`The place this belonged to no longer exists.`); in a batch, the rest restore and the notice adds `<count> had nowhere to go — restore those one at a time to choose where.` The hook takes `within?`, passes it to `bundles:list`, keys its refresh on it, and answers `picked`, `restore`, and `remove`.
- [ ] `TrashFrame.tsx`: the row trail draws through `crumbSegments` and `historical`. `UIX/Elements/nav-trail.css.ts`: `historical`, the frozen trail's look, replacing `trash-frame.css`'s `.trash-frame .is-historical` (removed); the look is unchanged.
- [ ] `mutateRequest.ts`: the `archive` op takes an optional `leaf`. `Core/Archive/archive.ts`: `archiveOp` passes `req.leaf` to `mintBundle`. `Core/Bundles/bundle.ts`: `mintBundle` takes a `leaf` only when the source could have been minted under it: one name (`holdsName`) carrying a stamp (`storedAtOf`) and ending in `__` plus the source's own name and the store's suffix, so a renderer's name can't leave the chain or name another item; anything else gets a fresh stamp, as a taken leaf does, and the doc says so.
- [ ] Sibling sweep: `confirmations.test.ts:148-149`'s `del` answers `Promise<boolean>`; `confirmDelete`'s callers (`pageMenuActions.ts:67`, `entityMenuActions.ts:134`) keep `void`; `PropertyFrame.tsx:299` passes `notifyTrashed` no `undoTo`; `git grep -n "is-historical" -- Core` finds nothing; `mintBundle`'s other callers (`deleteOp`, the delete's Undo, `moveIntoStore`, Phase 2's property bundle) pass no leaf or one the check keeps (Phase 4's `archive.test.ts` cases pass unchanged).

**AFTER**

```Core/Interface/Confirm/confirmations.ts diff
@@ imports @@
-import type { MutateOutcome } from '../../Nexus/mutateRequest'
+import type { MutateOutcome, RestoreDestination } from '../../Nexus/mutateRequest'
@@ offerUndo (Task 6A-1) @@
-function offerUndo(
+/** Posts through `post` with the one Undo that restores every bundle an act minted, to `destination` when given, arming each so a restore of any one from elsewhere spends it; an act that minted none offers none. */
+export function offerUndo(
~  bundlePaths: readonly string[],
~  post: (undo?: () => Promise<void>) => () => void,
+  destination?: RestoreDestination,
~): void {
 …
-            await useSession.getState().mutate({ op: 'restore', bundlePath })
+            await useSession.getState().mutate({ op: 'restore', bundlePath, destination })
@@ notifyTrashed @@
-/** A system-trash delete mints no bundle, so it offers no Undo — the artifact left the nexus and there is nothing to name. */
+/** A system-trash delete mints no bundle, so it offers no Undo — the artifact left the nexus and there is nothing to name. `undoTo` returns it where the delete took it from rather than to its origin. */
 export function notifyTrashed(
   title: string,
   { bundled, cascade }: Pick<MutateOutcome, 'bundled' | 'cascade'>,
   retry?: () => void,
+  undoTo?: RestoreDestination,
 ): void {
-  offerUndo(bundled ? [bundled.bundlePath] : [], (undo) =>
-    notifyDeleted(title, undo, cascade, retry),
-  )
+  offerUndo(
+    bundled ? [bundled.bundlePath] : [],
+    (undo) => notifyDeleted(title, undo, cascade, retry),
+    undoTo,
+  )
 }
@@ confirmDelete @@
-export const confirmDelete = async (target: {
-  path: string
-  kind: HeldKind
-  title: string
-}): Promise<void> => {
-  if (!waived('confirmDeletion', target.kind)) {
-    const { trashMode } = valueOr(await dialer().ask('delete:facts'), DELETE_FACTS_FALLBACK)
-    const yes = await ask({
-      message: `Delete “${target.title}”?`,
-      detail:
-        trashMode === 'system'
-          ? 'It will be moved to the system trash.'
-          : 'It will be moved to the nexus’s .trash folder (recoverable).',
-      action: 'Delete',
-      tone: 'destructive',
-    })
-    if (!yes) return
-  }
-  const done = await useSession
-    .getState()
-    .mutate({ op: 'delete', path: target.path, kind: target.kind })
-  if (done) notifyTrashed(target.title, done)
-}
+/** The one question a move into the Trash asks, put once for a batch: unasked only while Confirm Before Deletion is off and nothing in it always asks. */
+export const askTrashing = async (
+  message: string,
+  kinds: readonly HeldKind[],
+): Promise<boolean> => {
+  if (kinds.every((kind) => waived('confirmDeletion', kind))) return true
+  const { trashMode } = valueOr(await dialer().ask('delete:facts'), DELETE_FACTS_FALLBACK)
+  const it = kinds.length > 1 ? 'They' : 'It'
+  return ask({
+    message,
+    detail:
+      trashMode === 'system'
+        ? `${it} will be moved to the system trash.`
+        : `${it} will be moved to the nexus’s .trash folder (recoverable).`,
+    action: 'Delete',
+    tone: 'destructive',
+  })
+}
+
+export const confirmDelete = async (target: {
+  path: string
+  kind: HeldKind
+  title: string
+  undoTo?: RestoreDestination
+}): Promise<boolean> => {
+  if (!(await askTrashing(`Delete “${target.title}”?`, [target.kind]))) return false
+  const done = await useSession
+    .getState()
+    .mutate({ op: 'delete', path: target.path, kind: target.kind })
+  if (done) notifyTrashed(target.title, done, undefined, target.undoTo)
+  return done !== null
+}
```

```UIX/Utilities/checkSet.ts diff
@@ checkedIn (Phase 5-3) @@
-function checkedIn<T, K>(
+export function checkedIn<T, K>(
```

```Core/Nexus/mutateRequest.ts diff
@@ mutateRequest (Phase 4-2) @@
-  op('archive', { path: z.string(), kind: z.enum(['page', 'set']) }),
+  op('archive', { path: z.string(), kind: z.enum(['page', 'set']), leaf: z.string().optional() }),
```

```Core/Archive/archive.ts diff
@@ archiveOp (Phase 4-2) @@
~  const record = await gatherContentRecord(root, tree, req.kind, abs)
-  const bundle = await mintBundle(root, { kind: 'archive', id }, abs)
+  const bundle = await mintBundle(root, { kind: 'archive', id }, abs, req.leaf)
```

```Core/Bundles/bundle.ts diff
@@ imports (Phase 2-1) @@
~import { hiddenName } from '../Paths/exclusion'
+import { holdsName } from '../Paths/names'
@@ mintBundle (Phase 4-3) @@
-/** `leaf` asks for one bundle name back, which a fresh stamp answers once something holds it. */
+/** `leaf` asks for one bundle name back, tried only when the source could have been minted under it: one name, stamped, ending in the source's own; a fresh stamp answers anything else, and a leaf something holds. */
~export async function mintBundle(
~  root: string,
~  store: BundleStore,
~  absSource: string,
~  leaf?: string,
~): Promise<string> {
~  const dir = await chainDir(root, store, absSource)
-  if (leaf && (await machine().mkdir(join(dir, leaf))) === 'created') return join(dir, leaf)
-  const stamp = fileStamp()
~  const base = `${basename(absSource)}${layoutOf(store).suffix}`
+  const own =
+    leaf !== undefined && holdsName(leaf) && storedAtOf(leaf) !== null && leaf.endsWith(`__${base}`)
+  if (own && (await machine().mkdir(join(dir, leaf))) === 'created') return join(dir, leaf)
+  const stamp = fileStamp()
~  for (let n = 0; ; n++) {
```

```Core/Bundles/browser.ts diff
@@ imports @@
 import { useCallback, useEffect, useMemo, useState } from 'react'
+import type { TrailSegment } from '@pommora/uix/Elements/NavTrail'
 import { capitalize } from '@pommora/uix/Utilities/capitalize'
-import { actedOn, retained, toggled } from '@pommora/uix/Utilities/checkSet'
-import { askEmptyTrash, spendUndo } from '../Interface/Confirm/confirmations'
+import { actedOn, checkedIn, retained, toggled } from '@pommora/uix/Utilities/checkSet'
+import { entityIcon } from '../Assets/entityIconPolicy'
+import {
+  askEmptyTrash,
+  askTrashing,
+  confirmDelete,
+  offerUndo,
+  spendUndo,
+} from '../Interface/Confirm/confirmations'
 import { notifyOutcome, unrestoredLine } from '../Interface/Notifications/notifications'
-import { changesSettled, type MutateRequest } from '../Nexus/mutateRequest'
+import { changesSettled, type MutateRequest, type RestoreDestination } from '../Nexus/mutateRequest'
+import { pagesByIdOf } from '../Nexus/record'
+import { findContainerById } from '../Nexus/treePatch'
 import { matchQuery, matchScore } from '../Paths/caseFold'
+import { basename } from '../Paths/posix'
 …
 import { dialer } from '../Platform/dialer'
+import type { Personalization } from '../Settings/personalization'
 import type { BundleStore } from './bundle'
-import type { BundleRow } from './rows'
+import type { BundleCrumb, BundleRow } from './rows'
@@ the row pieces both browsers share (after filterRows) @@
+/** A row's origin trail as both browsers draw it, each live crumb wearing its kind's glyph. */
+export const crumbSegments = (
+  crumbs: BundleCrumb[],
+  icons: Personalization['defaultIcons'],
+): TrailSegment[] =>
+  crumbs.map((crumb) => ({
+    title: crumb.title,
+    icon: crumb.kind && entityIcon(crumb.kind, undefined, icons),
+  }))
+
+/** What the Archive stores: a page or a Set. */
+export const archivedKind = (row: BundleRow): 'page' | 'set' =>
+  row.kind === 'set' ? 'set' : 'page'
+
+const ARCHIVE_UNDO: RestoreDestination = { kind: 'archive' }
+
+type BatchOp = 'restore' | 'emptyBundle' | 'delete'
+
+const requestOf = (op: BatchOp, row: BundleRow): MutateRequest =>
+  op === 'delete'
+    ? { op, path: row.bundlePath, kind: archivedKind(row) }
+    : { op, bundlePath: row.bundlePath }
+
+/** A restore from the Archive undoes by archiving each item again, found by id so it follows a rename made since, under the bundle name it left, so it keeps its Archived date; one renamed or stepped aside since takes a fresh stamp, since that name no longer fits it. */
+const rearchive = (rows: BundleRow[]) => async (): Promise<void> => {
+  for (const row of rows) {
+    const { tree, mutate } = useSession.getState()
+    const id = row.stored?.id
+    if (!id || !tree) continue
+    const path =
+      row.kind === 'set' ? findContainerById(tree, id)?.path : pagesByIdOf(tree).get(id)?.path
+    if (path)
+      await mutate({ op: 'archive', path, kind: archivedKind(row), leaf: basename(row.bundlePath) })
+  }
+}
@@ rulesOf (Phase 5-5) @@
-/** What the Trash and the Archive do differently under one browser. */
-function rulesOf(kind: BundleStore['kind']): { dateKey: Parameters<typeof useDateColumn>[0] } {
+/** What the Trash and the Archive do differently under one browser: the date column's setting, what a delete sends and how it asks, for one row and for a batch, and what a restore's and a delete's Undo do. */
+function rulesOf(kind: BundleStore['kind']): {
+  dateKey: Parameters<typeof useDateColumn>[0]
+  deleteOp: 'emptyBundle' | 'delete'
+  askBatch: (targets: BundleRow[]) => Promise<boolean>
+  deleteOne: (row: BundleRow) => Promise<boolean>
+  restoreUndo?: (rows: BundleRow[]) => () => Promise<void>
+  deleteUndo?: RestoreDestination
+} {
~  switch (kind) {
~    case 'trash':
-      return { dateKey: 'trashColumnStyle' }
+      return {
+        dateKey: 'trashColumnStyle',
+        deleteOp: 'emptyBundle',
+        askBatch: (targets) => askEmptyTrash(targets.length),
+        deleteOne: async ({ bundlePath }) =>
+          (await askEmptyTrash(1)) &&
+          (await useSession.getState().mutate({ op: 'emptyBundle', bundlePath })) !== null,
+      }
~    case 'archive':
-      return { dateKey: 'archiveColumnStyle' }
+      return {
+        dateKey: 'archiveColumnStyle',
+        deleteOp: 'delete',
+        askBatch: (targets) =>
+          askTrashing(`Delete these ${countPhrase(targets)}?`, targets.map(archivedKind)),
+        deleteOne: (row) =>
+          confirmDelete({
+            path: row.bundlePath,
+            kind: archivedKind(row),
+            title: row.title,
+            undoTo: ARCHIVE_UNDO,
+          }),
+        restoreUndo: rearchive,
+        deleteUndo: ARCHIVE_UNDO,
+      }
~  }
~}
@@ useBundleBrowser @@
-/** A store's browser: its rows, listed again on each change while shown and on each showing; the checked set; the right-click menu's Restore and Delete over a row or the checked rows in view; and its date column. */
+/** A store's browser, narrowed `within` a top-level Set when given: its rows, listed again on each change while shown and on each showing; the checked set, and the checked rows in view; Restore and Delete, run by the right-click menu over a row or the checked rows in view and by the bar over the checked rows; and its date column. */
 export function useBundleBrowser(
   store: BundleStore,
-  { query, shown }: { query: string; shown: boolean },
+  { query, shown, within }: { query: string; shown: boolean; within?: string },
 ): {
   rows: BundleRow[] | null
   failed: boolean
   matches: BundleRow[]
   checked: ReadonlySet<string>
+  picked: BundleRow[]
   toggle: (bundlePath: string) => void
   openMenu: (row: BundleRow) => Promise<void>
~  date: ReturnType<typeof useDateColumn>
+  restore: (targets: BundleRow[]) => Promise<void>
+  remove: (targets: BundleRow[]) => Promise<void>
 } {
@@ refresh @@
-    const res = await dialer().ask('bundles:list', store)
+    const res = await dialer().ask('bundles:list', store, within)
 …
-  }, [store.kind, store.kind === 'archive' ? store.id : null])
+  }, [store.kind, store.kind === 'archive' ? store.id : null, within])
@@ matches @@
   const matches = useMemo(() => filterRows(rows ?? [], query), [rows, query])
+  const picked = useMemo(() => checkedIn(checked, matches, (r) => r.bundlePath), [checked, matches])
   const toggle = (bundlePath: string): void => setChecked((prev) => toggled(prev, bundlePath))
@@ one @@
     const done = await mutate(req)
     if (!done) return
     spendUndo(req.bundlePath)
-    if (done.landedAs)
-      notifyOutcome(`Restored ${steppedTo(row.title, done.landedAs)}`, undefined, [
-        done.unrestored !== undefined && unrestoredLine(done.unrestored),
-        done.cascade?.warning,
-      ])
+    // A restore the store can undo always reports, since its notice carries the Undo; the Trash's reports a step aside alone.
+    if (done.landedAs || rules.restoreUndo)
+      notifyOutcome(
+        `Restored ${done.landedAs ? steppedTo(row.title, done.landedAs) : `“${row.title}”`}`,
+        undefined,
+        [
+          done.unrestored !== undefined && unrestoredLine(done.unrestored),
+          done.cascade?.warning,
+        ],
+        rules.restoreUndo?.([row]),
+      )
   }
@@ many @@
   const many = async (
     targets: BundleRow[],
-    op: 'restore' | 'emptyBundle',
+    op: BatchOp,
   ): Promise<{
     done: BundleRow[]
     refused: BundleRow[]
     unrestored: string[]
     warnings: string[]
     renamed: string[]
+    bundled: string[]
   }> => {
 …
     const renamed: string[] = []
+    const bundled: string[] = []
     if (changesSettled(op)) await flushAllSaves()
     for (const row of targets) {
-      const res = await dialer().ask('mutate', { op, bundlePath: row.bundlePath })
+      const res = await dialer().ask('mutate', requestOf(op, row))
       ;(res.ok ? done : refused).push(row)
 …
       if (res.value.landedAs) renamed.push(steppedTo(row.title, res.value.landedAs))
+      if (res.value.bundled) bundled.push(res.value.bundled.bundlePath)
     }
+    // Asked through the channel, where the slice's `mutate` would have emitted, so the other browser and an open reader of a row hear it here.
+    storesChanged.emit()
     await refresh()
-    return { done, refused, unrestored, warnings: [...warnings], renamed }
+    return { done, refused, unrestored, warnings: [...warnings], renamed, bundled }
   }
@@ restoreBatch @@
         unrestored.length > 0 && unrestoredLine(unrestored),
         ...warnings,
       ],
+      done.length > 0 ? rules.restoreUndo?.(done) : undefined,
     )
   }
@@ emptyBatch → deleteBatch @@
-  const emptyBatch = async (targets: BundleRow[]): Promise<void> => {
-    if (!(await askEmptyTrash(targets.length))) return
-    const { done, refused, warnings } = await many(targets, 'emptyBundle')
-    notifyOutcome(`Deleted ${countPhrase(done)}`, undefined, [
-      refused.length > 0 && `${countPhrase(refused)} couldn’t be deleted.`,
-      ...warnings,
-    ])
-  }
+  const deleteBatch = async (targets: BundleRow[]): Promise<void> => {
+    if (!(await rules.askBatch(targets))) return
+    const { done, refused, warnings, bundled } = await many(targets, rules.deleteOp)
+    // An empty mints no bundle, so only a batch the Archive moved into the Trash offers its Undo.
+    offerUndo(
+      bundled,
+      (undo) =>
+        notifyOutcome(
+          `Deleted ${countPhrase(done)}`,
+          undefined,
+          [refused.length > 0 && `${countPhrase(refused)} couldn’t be deleted.`, ...warnings],
+          undo,
+        ),
+      rules.deleteUndo,
+    )
+  }
+
+  const restore = (targets: BundleRow[]): Promise<void> =>
+    targets.length === 1
+      ? one({ op: 'restore', bundlePath: targets[0].bundlePath }, targets[0])
+      : restoreBatch(targets)
+
+  const remove = async (targets: BundleRow[]): Promise<void> => {
+    if (targets.length > 1) return deleteBatch(targets)
+    if (await rules.deleteOne(targets[0])) spendUndo(targets[0].bundlePath)
+  }
@@ openMenu @@
     switch (action) {
       case 'restore':
-        if (batch) await restoreBatch(targets)
-        else await one({ op: 'restore', bundlePath: row.bundlePath }, row)
-        break
+        return restore(targets)
       case 'delete':
-        if (batch) await emptyBatch(targets)
-        else if (await askEmptyTrash(1))
-          await one({ op: 'emptyBundle', bundlePath: row.bundlePath }, row)
-        break
+        return remove(targets)
     }
   }
 
-  return { rows, failed, matches, checked, toggle, openMenu, date }
+  return { rows, failed, matches, checked, picked, toggle, openMenu, date, restore, remove }
 }
```

```Core/Settings/TrashFrame.tsx diff
@@ imports @@
 import { NavTrail } from '@pommora/uix/Elements/NavTrail'
+import { historical } from '@pommora/uix/Elements/nav-trail.css'
 …
-import { useBundleBrowser } from '../Bundles/browser'
+import { crumbSegments, useBundleBrowser } from '../Bundles/browser'
@@ TrashRowView @@
       detail={
         <NavTrail
-          segments={row.crumbs.map((crumb) => ({
-            title: crumb.title,
-            icon: crumb.kind && entityIcon(crumb.kind, undefined, defaultIcons),
-          }))}
+          segments={crumbSegments(row.crumbs, defaultIcons)}
           iconSize="control"
-          className={cx('trash-trail', row.historical && 'is-historical')}
+          className={cx('trash-trail', row.historical && historical)}
         />
       }
```

```Core/Settings/trash-frame.css diff
@@ the frozen trail @@
-.trash-frame .is-historical {
-  font-style: italic;
-  color: var(--label-tertiary);
-}
-
```

```UIX/Elements/nav-trail.css.ts diff
@@ trail @@
 export const option = style({
@@ after option @@
+/** A trail of frozen names, whose places no longer exist. */
+export const historical = style({ fontStyle: 'italic', color: c.label.tertiary })
```

**VERIFY**

- [ ] The listed `confirmations`, `archive.test.ts`, and `mutateRequest.test.ts` tests pass; `TrashFrame.test.tsx` passes unchanged but for the list mock's `within` argument.
- [ ] `git grep -n "storesChanged.emit" -- Core/Bundles/browser.ts` finds `many`'s one line; `git grep -n "store.kind\|switch (kind)" -- Core/Bundles/browser.ts` finds the hook's `rulesOf(store.kind)`, the refresh's key, and `rulesOf`'s switch alone.
- [ ] `git grep -n "is-historical\|emptyBatch" -- Core` finds nothing; `git grep -n "row.crumbs.map" -- Core` finds nothing.
- [ ] `git grep -n "from '../Bundles/browser'\|Bundles/browser'" -- Core/Contract Core/Nexus Core/Trash Core/Bundles/bundle.ts Core/Bundles/rows.ts Core/Bundles/handlers.ts Core/Archive/archive.ts Core/Archive/refile.ts` finds nothing (Cautionary 28); `npm run test -- engineGraph hostGraph` passes.
- [ ] Run the gates.
- [ ] Check for unnecessary code or mistakes.

**Lines:** +107 (+187 / −80): `browser.ts` +133 / −35, `confirmations.ts` +41 / −29, `TrashFrame.tsx` +4 / −6 and `trash-frame.css` −5, `bundle.ts` +5 / −2, `mutateRequest.ts` +1 / −1, `archive.ts` +1 / −1, `nav-trail.css.ts` +1, `checkSet.ts` +1 / −1. Tests apart.

#### Task 6B-6

**TASK:** ArchiveView draws the archive place: the owner's full header with "Archive" trailing, TableView's DOM and classes, and the browser controller over the Archive (a top-level Set's narrowed by origin on the host), with gutter checks, origin trails, the Archived date column, in-place search, virtual rows, the right-click menu, the bar, and page titles opening the reader; drive group 6B.

**NOW:** Tasks 6B-4 and 6B-5 have landed: the hook answers `picked`, `restore`, and `remove` and takes `within?`; `browser.ts` exports `crumbSegments` and `archivedKind`. `EntityBanner` sits over `.detail-scroll`, the virtual list's scroll root; `DetailTitleHeader`'s search branch ends in `.detail-title-clear` (`DetailTitleHeader.tsx:210-223`). `searchView` opens only on a container target (`Core/Session/viewSearchSlice.ts:27`); a view reads its query as `s.viewSearch[host.tabId]?.query`. ArchiveView follows TableView's sheet (`TableView.tsx:501-523`, `:656-731`) and title cell (`:182-202`); `table-view.css:49-57` seats `.row-grip` in the rail inset; `WIDTHS` (`Core/Views/Table/useColumns.ts:32-46`) is module-private. `Core/Actions/destinationTree.ts:1` says both askers "read the one walk in `record.ts`"; they read `nodesOf` (K-5). Task 6B-3 left `HostView`'s archive arm blank.

**CHANGE**

- [ ] Write the tests and watch them fail: `Core/Archive/ArchiveView.test.tsx` (new; `ContentHostContext` `{ tabId: 't1', key: 'archive:c1', parked }`; `bundles:list`, `menu` via `stubDialer`; `useVirtualRows` mocked to lay out every row): "lists each archived item with the trail it left under its title and its archived time, newest first"; "a click on a row checks it, and a page row's title opens the reader titled by its trail" (`openReader` gets `{ kind: 'archive', page: { kind: 'page', id, path }, trail: [...crumbs, { title }] }`); "a Set row's title opens nothing and checks its row"; "the header names its owner with Archive trailing after the search's clear button"; "an empty archive reads its one line" (`This Collection's archive is empty.`); "a top-level Set's empty archive reads the Set's line" (`This Set's archive is empty.`); "a listing that fails reads its one line and draws no rows" (one row, then a refused `storesChanged` re-list: no row, `The archive couldn't be read.`, no empty line); "narrows in place by the tab's search, keeping archived order"; "declares its bar while rows are checked, reading their count, and withdraws it when parked"; "a right-click Delete moves the row into the Trash with an Undo that returns it to the Archive" (`mutate`: `{ op: 'delete', path: bundlePath, kind: 'page' }`; Undo: `{ op: 'restore', bundlePath: '.trash/…', destination: { kind: 'archive' } }`); "the bar's Restore of one row posts Restored “A”, and of two Restored 2 Pages, whose Undo archives each item again where the tree now holds it, under the bundle name it left" (`mutate`: `{ op: 'archive', path, kind: 'page', leaf }`, the row's `bundlePath` leaf); "the bar's Delete of two asks once and posts Deleted 2 Pages with one Undo returning both to the Archive"; "the bar's Restore of a row whose place is gone posts the placement's refusal, and a batch restores the rest and says what had nowhere to go" (`mutate` refuses the homeless row; with one resolving row: `Restored 1 Page` and `1 Page had nowhere to go — restore those one at a time to choose where.`); "a batch restore closes an open reader of one of its pages" (`PageReaderWindow` open on one of two checked rows; `page:open` answers, then `not-found` after `mutate`; after the bar's Restore, `useSession.getState().reader` is null). `Core/Session/store.test.tsx`, beside the `searchView` cases (`:1427-1441`): "opens a search on an archive place".
- [ ] `useColumns.ts`: export `WIDTHS`. `table-view.css`: `.row-check` joins the gutter selector; `:1` names both wearers. `UIX/Table/table.css:18`: name ArchiveView's heading beside TableView's and the Trash's.
- [ ] `InterfaceScaffold.tsx`, `Banner.tsx` (`EntityBanner`), `DetailTitleHeader.tsx`: one optional `trailing` node, drawn after the title and its clear button (G-3).
- [ ] `viewSearchSlice.ts`: `searchView` admits an archive place, for ArchiveView's header search.
- [ ] `Core/Archive/ArchiveView.tsx` and `archive-view.css` (new): ask for the owner's Collection's Archive as a literal store (the Collection memoized per tree, not derived in a selector), a top-level Set's id as `within` (`?? owner.id` only spells the type); re-measure the virtual rows on the owner's `banner`; the line under the table reads `The archive couldn't be read.` when the listing fails, its rows withdrawn (as HEAD `TrashFrame.tsx:227-228` does), else, when empty, `This Collection's archive is empty.` or `This Set's archive is empty.` by the owner's kind. `ContentView.tsx`'s archive arm draws ArchiveView over `archiveOwnerOf`, the blank frame staying for a lookup that misses between the tree push and the reconcile (Cautionary 19).
- [ ] `destinationTree.ts:1`: the comment names `nodesOf` and both stores' Restore drill (K-5).
- [ ] Drive group 6B: below.

**AFTER**

```Core/Views/Table/useColumns.ts diff
@@ WIDTHS @@
-const WIDTHS: Record<PropertyType | 'title', ColumnWidth> = {
+export const WIDTHS: Record<PropertyType | 'title', ColumnWidth> = {
```

```Core/Views/Table/table-view.css diff
@@ :1 @@
-/* TableView's layer over the Tables chrome: shell width, grid density, hide/slide beat, grip gutter, and group-band rhythm. Values live in Tables/table-tokens.css. */
+/* The layer TableView and ArchiveView wear over the Tables chrome: shell width, grid density, hide/slide beat, the rail gutter's grip and check, and group-band rhythm. Values live in Tables/table-tokens.css. */
@@ the gutter @@
 .row-grip,
+.row-check,
 .table-view .group-band-drop-outline {
```

```UIX/Table/table.css diff
@@ :18 @@
-  /* The one place a heading's type is set — TableView's .col-header and the Trash's head both inherit it. */
+  /* The one place a heading's type is set — TableView's and ArchiveView's .col-header and the Trash's head inherit it. */
```

```Core/Interface/InterfaceScaffold.tsx diff
@@ InterfaceScaffold @@
 export function InterfaceScaffold({
   owner,
+  trailing,
   children,
 }: {
   owner: BannerOwner | null
+  trailing?: React.ReactNode
   children?: React.ReactNode
 }): React.JSX.Element {
@@ the banner @@
-        {owner ? <EntityBanner owner={owner} /> : null}
+        {owner ? <EntityBanner owner={owner} trailing={trailing} /> : null}
```

```Core/Interface/Header/Banner.tsx diff
@@ EntityBanner @@
 export function EntityBanner({
   owner,
   chrome = 'detail',
+  trailing,
 }: {
   owner: BannerOwner
   chrome?: 'detail' | 'window'
+  trailing?: ReactNode
 }): React.JSX.Element {
@@ the title header @@
       search={search}
+      trailing={trailing}
     />
```

```Core/Interface/Header/DetailTitleHeader.tsx diff
@@ Props @@
   search?: TitleSearch
   renameSummon?: number
+  /** Drawn after the title and its search's clear button, which pads against it. */
+  trailing?: React.ReactNode
 }
@@ DetailTitleHeader @@
   search,
   renameSummon,
+  trailing,
 }: Props): React.JSX.Element {
@@ the title row's end @@
       ) : (
         label
       )}
+      {trailing}
     </div>
```

```Core/Session/viewSearchSlice.ts diff
@@ searchView @@
     const target = tabOf(get(), tabId)?.target
-    if (!isContainer(target)) return false
+    if (!isContainer(target) && target?.kind !== 'archive') return false
```

```Core/Interface/ContentView.tsx diff
@@ imports @@
+import { ArchiveView } from '../Archive/ArchiveView'
+import { archiveOwnerOf } from '../Archive/archivePlace'
@@ HostView @@
-    case 'archive':
-      return <div className="detail interface-inset" />
+    case 'archive': {
+      const owner = archiveOwnerOf(tree, target.id)
+      return owner ? <ArchiveView owner={owner} /> : <div className="detail interface-inset" />
+    }
```

```Core/Actions/destinationTree.ts diff
@@ :1 @@
-// Both askers read the one walk in `record.ts` — the card's Move To ▸, which relocates a live page by path, and the trash's Restore ▸, which files a returning one by id — so the two menus can never disagree about what the nexus will hold.
+// Every asker reads `nodesOf` — the card's Move To ▸, which relocates a live page by path, and the Trash's and the Archive's Restore ▸, which file a returning item by id — so the menus can never disagree about what the Nexus will hold.
```

```Core/Archive/ArchiveView.tsx diff
@@ new file @@
+import { memo, useMemo, useState } from 'react'
+import { Checkbox } from '@pommora/uix/Controls/Checkbox'
+import { NavTrail } from '@pommora/uix/Elements/NavTrail'
+import { historical } from '@pommora/uix/Elements/nav-trail.css'
+import { overScrollLabel } from '@pommora/uix/Interactions/OverScroll'
+import { revealTarget } from '@pommora/uix/Interactions/hover-reveal.css'
+import { useVirtualRows } from '@pommora/uix/Interactions/virtualRows'
+import { text } from '@pommora/uix/Theme'
+import { cx } from '@pommora/uix/Utilities/cx'
+import { useStableApi } from '@pommora/uix/Utilities/stableApi'
+import { EntityIcon } from '../Assets/EntityIcon'
+import { entityIcon } from '../Assets/entityIconPolicy'
+import { archivedKind, countPhrase, crumbSegments, useBundleBrowser } from '../Bundles/browser'
+import type { BundleRow } from '../Bundles/rows'
+import { InterfaceScaffold } from '../Interface/InterfaceScaffold'
+import { useContentHost } from '../Interface/contentHost'
+import { type ActionBar, useDeclareActions } from '../Interface/Notifications/notifications'
+import { usePublishCount } from '../Interface/Subfield/publish'
+import type { CollectionNode, SetNode } from '../Nexus/tree'
+import { containerOwner } from '../Nexus/treeIndex'
+import { owningCollection } from '../Nexus/treePatch'
+import { personalizationOf } from '../Session/configSlice'
+import type { Personalization } from '../Settings/personalization'
+import { useSession } from '../Session/store'
+import { WIDTHS } from '../Views/Table/useColumns'
+import '../Views/Table/table-view.css'
+import './archive-view.css'
+
+const ROW_H = 48
+const ARCHIVE_COLS = `minmax(${WIDTHS.title.default}px, 1fr) ${WIDTHS.dateTime.default}px`
+
+type RowApi = {
+  toggle: (row: BundleRow) => void
+  menu: (row: BundleRow) => void
+  open: (row: BundleRow) => void
+}
+
+/** A Collection's or a top-level Set's archived items on TableView's sheet: checked for Restore and Delete, a page opened in the reader. */
+export function ArchiveView({ owner }: { owner: CollectionNode | SetNode }): React.JSX.Element {
+  const host = useContentHost()
+  const shown = host !== null && !host.parked
+  const query = useSession((s) => (host ? s.viewSearch[host.tabId]?.query : undefined)) ?? ''
+  const defaultIcons = useSession((s) => personalizationOf(s).defaultIcons)
+  const openReader = useSession((s) => s.openReader)
+  const tree = useSession((s) => s.tree)
+  const archiveId = useMemo(() => owningCollection(tree, owner)?.id ?? owner.id, [tree, owner])
+  const browser = useBundleBrowser(
+    { kind: 'archive', id: archiveId },
+    { query, shown, within: owner.kind === 'set' ? owner.id : undefined },
+  )
+
+  const [listEl, setListEl] = useState<HTMLDivElement | null>(null)
+  const scrollEl = useMemo(() => listEl?.closest<HTMLElement>('.detail-scroll') ?? null, [listEl])
+  const { rows: slots, height } = useVirtualRows(
+    { count: browser.failed ? 0 : browser.matches.length, rowHeight: ROW_H, listEl, scrollEl },
+    [owner.banner],
+  )
+
+  const api = useStableApi({
+    toggle: (row: BundleRow) => browser.toggle(row.bundlePath),
+    menu: (row: BundleRow) => void browser.openMenu(row),
+    open: (row: BundleRow) => {
+      const stored = row.stored
+      if (!stored) return
+      openReader({
+        kind: 'archive',
+        page: { kind: 'page', ...stored },
+        trail: [
+          ...crumbSegments(row.crumbs, defaultIcons),
+          { title: row.title, icon: entityIcon('page', row.icon, defaultIcons) },
+        ],
+      })
+    },
+    restore: () => void browser.restore(browser.picked),
+    remove: () => void browser.remove(browser.picked),
+  })
+  const count = browser.picked.length > 0 ? countPhrase(browser.picked) : null
+  const bar = useMemo<ActionBar | null>(
+    () => (count === null ? null : { count, restore: api.restore, remove: api.remove }),
+    [count, api],
+  )
+  useDeclareActions(bar)
+  usePublishCount(browser.rows === null ? null : browser.matches.length)
+
+  return (
+    <InterfaceScaffold
+      owner={containerOwner(owner)}
+      trailing={<span className="archive-title-label">Archive</span>}
+    >
+      <div className="table table-view">
+        <div
+          className={cx('table-grid', text.body.standard)}
+          style={{ '--cols': ARCHIVE_COLS } as React.CSSProperties}
+        >
+          <div className="table-head">
+            <div className="col-header">Title</div>
+            {/* biome-ignore lint/a11y/noStaticElementInteractions: a right-click affordance on a column label, as TableView's headings are */}
+            <div className="col-header archive-date" onContextMenu={browser.date.onContextMenu}>
+              Archived
+            </div>
+          </div>
+          <div ref={setListEl} className="archive-rows" style={{ height }}>
+            {slots.map(({ index, start }) => {
+              const row = browser.matches[index]
+              return (
+                <ArchiveRow
+                  key={row.bundlePath}
+                  row={row}
+                  start={start}
+                  lead={index === 0}
+                  checked={browser.checked.has(row.bundlePath)}
+                  revealed={browser.checked.size > 0}
+                  when={browser.date.when(row.storedAt)}
+                  icons={defaultIcons}
+                  api={api}
+                />
+              )
+            })}
+          </div>
+        </div>
+        {browser.failed ? (
+          <div className="archive-empty">The archive couldn't be read.</div>
+        ) : browser.rows?.length === 0 ? (
+          <div className="archive-empty">
+            This {owner.kind === 'set' ? 'Set' : 'Collection'}'s archive is empty.
+          </div>
+        ) : null}
+      </div>
+    </InterfaceScaffold>
+  )
+}
+
+const ArchiveRow = memo(function ArchiveRow({
+  row,
+  start,
+  lead,
+  checked,
+  revealed,
+  when,
+  icons,
+  api,
+}: {
+  row: BundleRow
+  start: number
+  lead: boolean
+  checked: boolean
+  revealed: boolean
+  when: string
+  icons: Personalization['defaultIcons']
+  api: RowApi
+}): React.JSX.Element {
+  return (
+    // biome-ignore lint/a11y/useKeyWithClickEvents lint/a11y/noStaticElementInteractions: a click anywhere on a row checks it, as a Trash row does; the box in its gutter is the keyboard's door
+    <div
+      className={cx('data-row', lead && 'row-lead')}
+      data-reveal-host={revealed ? 'on' : ''}
+      style={{ height: ROW_H, transform: `translateY(${start}px)` }}
+      onClick={() => api.toggle(row)}
+      onContextMenu={(e) => {
+        e.preventDefault()
+        api.menu(row)
+      }}
+    >
+      <div className="data-cell cell-lead">
+        <span className={cx('row-check', revealTarget)} data-reveal-held={checked || undefined}>
+          <Checkbox
+            size="compact"
+            state={checked}
+            onChange={() => api.toggle(row)}
+            ariaLabel={`Select ${row.title}`}
+          />
+        </span>
+        {/* biome-ignore lint/a11y/useKeyWithClickEvents lint/a11y/noStaticElementInteractions: a page's title is the pointer's door to the reader; a Set's opens nothing and its click checks the row */}
+        <span
+          className={cx(overScrollLabel, 'cell-title')}
+          onClick={
+            row.kind === 'page'
+              ? (e) => {
+                  e.stopPropagation()
+                  api.open(row)
+                }
+              : undefined
+          }
+        >
+          <EntityIcon kind={archivedKind(row)} icon={row.icon} size="body" />
+          <span className="cell-title-text">{row.title}</span>
+        </span>
+        <NavTrail
+          segments={crumbSegments(row.crumbs, icons)}
+          iconSize="control"
+          className={cx(row.historical && historical)}
+        />
+      </div>
+      <div className="data-cell archive-date">{when}</div>
+    </div>
+  )
+})
```

```Core/Archive/archive-view.css diff
@@ new file @@
+/* ArchiveView on TableView's sheet: the virtual list, each title over the trail it left, the check in the rail gutter, the Archived column, and the header's trailing label. */
+.archive-rows {
+  position: relative;
+}
+.archive-rows > .data-row {
+  position: absolute;
+  inset-inline: 0;
+}
+.archive-rows .data-cell {
+  display: flex;
+  flex-direction: column;
+  justify-content: center;
+  gap: 2px; /* KNOB — the title from its trail */
+}
+.archive-date {
+  align-items: center;
+  text-align: center;
+}
+.row-check {
+  display: inline-flex;
+  align-items: center;
+}
+.archive-empty {
+  padding: var(--cell-padding-y) var(--cell-padding-x);
+  color: var(--label-tertiary);
+}
+/* At the title's size, so the clear button's auto margin pads against it. */
+.archive-title-label {
+  flex: none;
+  font-size: var(--detail-title-size);
+  font-weight: var(--weight-bold);
+  line-height: 1.15;
+  color: var(--label-tertiary);
+}
```


**Drive group 6B** (`.claude/scripts/Archive Drive/live-drive.mjs` › `group6B()` + `MATRIX.md`; `ALL` gains `'6B'`, run after group 6A as `if (GROUPS.has('6B')) await group6B()`, since the group relaunches and so drives the run's own `cdp`, as group 3 does; each check an `item('6B', '6B', …)` gated by `POMMORA_ARCHIVE_LANDED` over Phase 1's `PHASES`). Seeds on `~/Test`, each archived through `ask(cdp, 'mutate', { op: 'archive', path, kind })` in this order, a beat apart: pages `Drive Arc 1` and `Drive Arc 2` (`Collection A/Set Alpha`), `Drive Arc Root` (`Collection A`), and Set `Drive Arc Set` (`Collection A`, one page); then sixty pages `Drive Bulk 01`–`60` (`Collection B`). A beat before the archives, `Drive Arc Root`'s file gains the body `Root body.` after its frontmatter, written from outside (`writeBody` covers Set Alpha's pages alone). Confirm Before Deletion on. Each state-changing check restores disk through the bridge and the renderer through the interface before the next; the harness restores `~/Test`. A check that undoes reads its result while the notice shows, presses Undo, then waits on disk with `until`. Group 2's `notice(cdp)` reads the shown face from here on (`document.querySelector('[role=status] [data-face="shown"], [role=alert] [data-face="shown"]')?.textContent ?? ''`).

- [ ] `[g6B G-4] the views footing holds New View and an Archive button, and no More button`: in Collection A's `button[title="Views"]` dropdown, a `button` reading `Archive` (`aria-pressed="false"`) sits beside the New View `+`; no `[aria-label="More"]`.
- [ ] `[g6B G-4, G-5] Archive shows the archive place in the same tab, pressed`: press it; `[role=tab]` count unchanged, `aria-pressed="true"`, and `.detail-title` ends in `.archive-title-label` (`Archive`) after `.detail-title-clear`.
- [ ] `[g6B G-3] the header keeps the owner's whole header`: the title reads `Collection A`; `.banner` or `.banner-empty` is present; the title's native menu holds `Rename` (`chooseNative`, closing it).
- [ ] `[g6B G-3 ruling 9] the tab reads the owner's title with the archive glyph`: `activeTab(cdp)` is `Collection A`, holding `svg.lucide-archive`.
- [ ] `[g6B G-1, G-2] rows list each archived item with its trail and time, newest first`: `.archive-rows .data-row .cell-title-text` read `Drive Arc Set`, `Drive Arc Root`, `Drive Arc 2`, `Drive Arc 1`; `Drive Arc 1`'s trail reads `Collection A`, `Set Alpha`; no `.archive-date` cell is empty; `[title="Results"]` reads `4`.
- [ ] `[g6B G-6] two checks declare the bar`: click `Drive Arc 1`'s and `Drive Arc 2`'s rows outside their titles; the shown face reads `Restore` and `2 Pages` and holds `button[title="Delete"]`.
- [ ] `[g6B G-6] Restore cross-fades to Restored 2 Pages, and its Undo archives them again`: press Restore; at once, `Restored 2 Pages` with `Undo`, both rows gone, both pages in `Collection A/Set Alpha` at their seeded `page_order` places; Undo; through `until`, both sit under `.nexus/archive/<Collection A id>/Collection A/Set Alpha/` at their pre-Restore bundle names, and the rows return.
- [ ] `[g6B E-3] Delete from the bar moves one row into the Trash, and its Undo returns it to the Archive`: check `Drive Arc 1` alone, Delete; the confirmation reads `Delete “Drive Arc 1”?`; confirm; disk holds `.trash/…/<stamp>__Drive Arc 1.md.deleted/_record.json`, its `archive` naming the Archive bundle; `Deleted “Drive Arc 1”` with Undo; Undo; the Archive bundle is back under its old name, the Trash bundle gone.
- [ ] `[g6B G-6] a batch Delete asks once and offers one Undo`: check both `Drive Arc` pages, press Delete; one confirmation; confirm; two Trash bundles; `Deleted 2 Pages` with Undo; Undo; both back in the Archive.
- [ ] `[g6B G-6] the right-click menu acts on the checked rows`: on one of two checked rows, `Restore All` and `Delete All`; on an unchecked row, `Restore` and `Delete` (`chooseNative`, closing each); uncheck both, and through `until` the label's host turns `inert`.
- [ ] `[g6B H-1] a page row's title opens the read-only reader`: click `Drive Arc Root`'s title; `[aria-label="Archived Page"]` holds `.reader-lock[title="Read Only"]` in the leading slot, a trail reading `Collection A`, `Drive Arc Root` (no `input` after a double-click), no `Restore` button, and a doc reading `Root body.`; `button[title="Close"]` closes it.
- [ ] `[g6B H-1 Cautionary 32] the reader closes once its item leaves the Archive`: check `Drive Arc Root`'s row, then click its title (the row stays checked); the shown face reads `Restore` and `1 Page`; the bar's Restore (above floating windows, `stack.top.interrupt`, `UIX/Theme/stack.ts:22-28`) leaves no `[aria-label="Archived Page"]`; archive it again (cleanup).
- [ ] `[g6B G-2 ruling 11] a Set row's title opens nothing and checks its row`: click `Drive Arc Set`'s title; no reader; its checkbox is checked; uncheck.
- [ ] `[g6B G-1 ruling 15] search narrows in place, keeping archived order`: click `.detail-title-text`, type `Arc`; the rows read the `Arc` titles in `bundles:list({ kind: 'archive', id: <Collection A id> })`'s order (read, not assumed: the reader check re-stamped `Drive Arc Root`); type ` 2`: `Drive Arc 2` alone; clear.
- [ ] `[g6B G-1] the Archived heading's right-click picks its date style`: `chooseNative` on the `Archived` `.col-header` picks another form; `.nexus/settings.json`'s personalization holds `archiveColumnStyle` with it, and the cells change; picking the Nexus's own form removes the key.
- [ ] `[g6B G-3 ruling 12] the toolbar's settings pane is the empty one`: `SETTINGS_BUTTON` opens the 24px spacer and no `.settings-frame` rows; close it.
- [ ] `[g6B G-5] Back returns to the view and Forward to the archive`: `button[title="Back"]` shows Collection A's table, no `.archive-title-label`; `button[title="Forward"]`, the archive.
- [ ] `[g6B G-5] relaunch reopens the archive tab`: right after the Back and Forward check, `relaunch(cdp, async () => {})` (`drive-harness.mjs:541-547`); the active tab reads `Collection A` with `svg.lucide-archive`, and `.archive-title-label` is up.
- [ ] `[g6B G-4] a top-level Set's archive lists only what left from within it`: press Archive in Set Alpha's views dropdown; the rows match `bundles:list({ kind: 'archive', id: <Collection A id> }, <Set Alpha id>)` in order: `Drive Arc 1` and `Drive Arc 2` alone.
- [ ] `[g6B 4.7] virtual rows render a window of a long archive`: in Collection B's archive, `.archive-rows` is 48 px times the sixty rows `bundles:list` answers tall, holding fewer `.data-row`s; scrolled to the bottom of `.detail-scroll`, `Drive Bulk 01`'s row is present.
- [ ] `[g6B G-6] the bar withdraws when its tab parks`: check a row in Collection B's archive and open a new tab: the label's host is `inert`; return: the bar shows.
- [ ] `shot` of the archive place and of the reader, as evidence beside the checks.

**VERIFY**

- [ ] The listed `ArchiveView` and `store` tests pass.
- [ ] `git grep -n "useDeclareActions\|openReader({ kind: 'archive'" -- Core` finds `ArchiveView.tsx` among the production sites.
- [ ] `npm run test -- engineGraph hostGraph` passes.
- [ ] Run the gates.
- [ ] Drive groups 1 to 6B pass.
- [ ] Check for unnecessary code or mistakes.

**Lines:** +240 (+245 / −5): `ArchiveView.tsx` +195, `archive-view.css` +32, `ContentView.tsx` +6 / −2, the header's three files +9 / −1, `table-view.css` +1, `useColumns.ts` and `viewSearchSlice.ts` +1 / −1 each, and the two rewritten comments (`table.css:18`, `destinationTree.ts:1`) ±0. Estimate +140 for the old single task. Tests ≈ +262 across the three tasks.

#### Review Checkpoint

- [ ] Every test the six tasks name passes: `ActionLabel.test.tsx` (the bar's six cases and Phase 5's cases read on the shown face), `windowSlice.test.ts`, `devicePrefsSeed.test.tsx`, `navRef.test.ts`, `tabsModel.test.ts`, `treeIndex.test.ts`, `subfieldItems.test.ts`, `crumbs.test.ts`, `ViewFrame.test.tsx`, `ArchiveView.test.tsx`, `rows.test.ts`, the bundles handler's cases, `confirmations.test.ts`, `archive.test.ts`, `mutateRequest.test.ts`, `store.test.tsx`; `TrashFrame.test.tsx` and `trashRecovery.test.ts` pass with the Trash's behavior unchanged and its rows wearing their own icons.
- [ ] `npm run test -- engineGraph hostGraph` passes: `rows.ts`, `handlers.ts`, `refile.ts`, `bundle.ts`, `archive.ts`, `mutateRequest.ts`, and `archivePlace.ts` import no React and no `.tsx`; nothing host-side imports `browser.ts`, `ArchiveView.tsx`, or `PageReaderWindow.tsx`.
- [ ] Run the gates.
- [ ] The Archive Drive passes groups 1 to 6B from the checkout with `POMMORA_ARCHIVE_LANDED=6B`, nothing awaited.
- [ ] The two `opus-high` reviewers read the phase outward: the browser's store switch against the Trash's unchanged behavior; the bar, the reader, and the place against Cautionary 19 to 32; the Swap's hidden face and its phrasing content; `rulesOf` as the one place the two stores differ; `bundles:list`'s store always a store, a Set's place narrowed by `within` alone.
- [ ] The Net Ledger records the phase's measured delta beside its estimate, with what the growth buys (*§Departures and Disclosures*).

#### Departures and Disclosures

##### Departures From the Findings

- **`BundleRow.stored` Beside `icon` (4.2):** the Findings give the row `icon` alone; the reader's slot is a `PageTarget` (Findings 5.4), and the row carries neither the record's id nor the artifact's path (HEAD `trashRow.ts:12-28`), while a restore's Undo finds each item again by id. One optional field, `{ id, path }`, for page and Set rows, built where `icon` is.
- **`bundles:list(store, within?)` (4.6):** the Findings' archive arm takes the place id, a Set id listing its Collection's Archive narrowed. `BundleStore` names a store wherever it appears instead, so a top-level Set's place asks for its Collection's Archive with the Set's id as `within`, rather than a Set id inside `{ kind: 'archive'; id }` that `layoutOf` would map to a folder that doesn't exist. ArchiveView holds its owner and `owningCollection` is one host-safe call, so the handler derives no owner; it reads `within` as `unknown` and refuses anything but a string or nothing.

##### Behavior Changes and Disclosures

- **The Listing Lands a Task Ahead of Its Readers (6B-4):** `BundleRow.icon` and `stored`, `bundles:list`'s `within`, and `originWithin` land in 6B-4 with the handler that fills them, while their readers follow inside the phase: the browser's `within` and `rearchive` in 6B-5, ArchiveView's icon, reader, and Set place in 6B-6. Ordering by dependency keeps each task's gates green; nothing crosses the phase boundary unread.

- **No Pinned-Tab Check:** `openTab` (`tabsModel.ts:166-169`) already opens a new tab when the active tab is pinned, whatever `newTab` says (`tabsModel.test.ts:96`), so the toggle passes `{ newTab: false }` alone, and a new archive-target case pins ruling 13.
- **`destinationTree.ts:1` (6B-6):** the comment reads true only once the Archive's homeless row drills, and its existing falsehood (it claims the askers read `record.ts`'s walk; they read `nodesOf`) is fixed in the same rewrite.
- **The Row Builders Go Async and Take `root`:** a Set's icon is a sidecar read inside its bundle, so the builder reads it, one read per Set row per listing, on user ops; a read in the handler after the rows would split the row's construction across two places. Its callers are the handler, `rows.test.ts`'s three, `trashRecovery.test.ts:34`, and Phase 4-2's E-5 case in `archive.test.ts`.
- **Each Row Wears Its Own Icon in Both Browsers (6B-4):** the Trash's row draws `row.icon` ahead of its kind's glyph, as ArchiveView's does, so a page's metadata icon and a Set's sidecar icon read the same in either browser; a row with no icon of its own, and every Collection, Space, Context, and property row, looks as it did.
- **`originOf` and `originWithin` Beside `trailAbove` in `record.ts`:** Findings 3.4's reading, applied inline by Phase 4-5's `refileArchived` and now by the Set's listing, is stated once in `Core/Bundles/record.ts`, a file `refile.ts` already imports, rather than in `rows.ts`, since the listing's filter runs in the handler. It takes the origin and `held`, the tree's trail its caller has already read, so neither caller walks the tree twice; `originOf` moves beside it from `refile.ts` as its second reader arrives. `refileArchived` keeps `at`, since a stored trail is rebuilt from it.
- **`NodeRecord.kind` Excludes `'archive'` by Type:** `searchEntriesOf`'s `byKind` (`treeIndex.ts:149-156`) is keyed on it, so the exclusion is what typechecks, and nav search leaves the place out by construction (Findings 4.3).
- **`archivePlace.ts` Resolves Through `treePatch.ts`:** importing `treeIndex.ts`'s `findSet` would cycle, since `treeIndex.ts` imports `ARCHIVE_ICON`; `findContainerById` and `isTopSet` answer the same. `archiveOwnerOf` also replaces `ViewMenu`'s inline rule and its `findCollection`/`findSet` pair, one rule for the dropdown and the place.
- **The Lock Is a Titled Wrapper:** custom glyphs render `aria-hidden="true"` and draw no children (`customGlyphs.tsx:20-32`), so `Read Only` sits on a `span` with `title`, `role="img"`, and `aria-label`, seated at an inline button's height by one rule.
- **`HostView`'s Archive Arm:** 6B-3 lands it as the blank frame (no copy, the placeholder rule), and 6B-6 fills it, so the phase boundary holds no placeholder. The frame stays only for the one render a lookup can miss (Cautionary 19), where the Collection and Set arms show "not found" copy; the Archive adds none.
- **One Door for a Row's Actions:** the browser's one-row and batch arms move out of `openMenu` into `restore(targets)` and `remove(targets)`, which the menu and the bar both call, so one checked row behaves the same from either: a single row whose place is gone asks where to land from the bar as it does from the menu (`restoreOne`), and an action runs once per press while one is in flight. A single restore runs through `restoreOne` in both stores; `one` reports every restore from the Archive, so a batch of one names its title (*§Copy*'s `Restored “Ideas”`) and carries `rearchive` as its Undo, while the Trash's single restore still reports a step aside alone. `emptyBatch` becomes `deleteBatch`, one batch delete for both stores: the Archive's asks `askTrashing` and sends `delete`, the Trash's asks `askEmptyTrash` and sends `emptyBundle`, and both report through `offerUndo`, which offers no Undo for an empty, since it mints no bundle. Each arm reads what differs from `rulesOf`, so the delete op, the questions, and the two Undos are stated once and the Trash's empty is handed no Archive Undo. A batch, asked through the channel rather than the slice, emits `storesChanged` itself, so the other browser and an open reader hear it. The Trash's arms and notices are unchanged.
- **A Restore's Undo Keeps Its Archived Date (6B-5):** `rearchive` hands the `archive` op its row's bundle leaf, and `mintBundle` takes a leaf only when the item could have been minted under it, so the Undo returns each item under the stamp it left, as a delete's Undo from the Archive does (4-3). The check sits where a leaf is taken, so the host's own leaves pass the same rule. An item renamed or stepped aside between the restore and its Undo takes a fresh stamp, since its bundle's name no longer fits it.
- **One Undo-Offering Function:** 6A-1's `offerUndo` is exported and takes an optional destination, so the Archive's batch delete arms its one Undo on every Trash bundle it minted (restoring one from the Trash browser spends the notice, as a single delete's is spent) through the function `notifyTrashed` and `confirmArchive` already end in. `notifyOutcome` already takes an `undo` and answers its notice's spend, so it is `offerUndo`'s poster as it stands. `confirmDelete` answers a boolean and takes `undoTo`, so the browser spends the archived item's own `Archived “…”` Undo only once the delete went through; `askTrashing` is its question, extracted for the batch.
- **The Frozen Trail (Take Along):** `crumbSegments` (the Trash's crumb mapping) and the `historical` style (the Trash's `.trash-frame .is-historical`) move to `browser.ts` and `UIX/Elements/nav-trail.css.ts` as the second consumer arrives; the Trash's look is unchanged.
- **The Reader's Geometry:** the window's remembered size resets once, as its key becomes `'page-reader'`; the old `devicePrefs.windows['page-history']` entry stays in each device's prefs, unread, with no migration code.
- **A Notice Under the Pointer on the Label Arms at Once (6B-1):** the bar's own press leaves the pointer on the label, so K-3's arming starts armed when the host matches `:hover` as the notice shows; closed, the host is `inert` and parked off-screen, so a notice posted by a press anywhere else starts unarmed as K-3 rules.
- **`Swap` Takes `className` (6B-1):** 5-1's `swap` centers its faces, while the label's two faces must span the label (the message left, the action right); a wrapper element can't stretch the cell's items, and a layout flag would name one host's layout in UIX.
- **The Label's Faces Hold Phrasing Content (6B-1):** `Swap`'s faces are spans, so the label's rows and the notice face's stack are `span`s (`s.row` and `s.face` set their own `display`), and `ProgressBar`'s track and fill become `span`s with `display: 'block'` (Take Along), the nesting `Cell.tsx:142`'s `span.cell-bar` already gives it; no element's look changes.
- **`crumbs.ts`' Archive Arm Reads the Container Arm's Mapping (6B-3):** the per-crumb rule becomes `crumbsOver(spine, currentPos)`, and the archive arm hands it the owner's ancestry with an `Archive` node at the current position, which `targetOf`'s default answers null for; an owner sits at depth 0 or 1, so the up-spine rule already makes every crumb above it navigable.
- **ArchiveView Draws No Banner (the owner, 10-21-2026):** the archive place shows its owner's title with no banner image and no add-banner affordance (`EntityBanner`'s `plain`), so nothing above the virtual list changes while it shows and `useVirtualRows` takes no deps from the owner.
- **The Footing's Archive Button Sits at the Right (the owner, 10-21-2026):** `MenuFooting`'s `trailing` holds it, where the placeholder stood, New View alone in `leading`; its shown state wears the accent (`tinted`, `outline`, `pressed` with `showSelection` off) rather than the grey selected wash.
- **The Trailing "Archive" Is One Type Size Below the Title (the owner, 10-21-2026):** `DetailTitleHeader` wraps `trailing` in `.detail-title-trailing`, typed in `content-title.css` beside the title (title-small under the detail title, headline in the banner contexts) in `--label-secondary`; ArchiveView passes the plain text.
- **A Date Column Fits Its Widest Date (the owner, 10-21-2026):** `useDateColumn` answers the widest string its style can produce (`widestDate`: a late-September Wednesday at noon, seven days or twelve months ago for a relative style) and the width a hidden sample measures once per style, stacked under the heading's label so the column is never narrower than either; ArchiveView's and the Trash's date columns both take it, the Trash's fixed 140px lane and ellipsis leaving. The drive proves no date is cut under the widest style.
- **The Reader's Lock Is the Stroked Glyph (the owner, 10-21-2026):** the filled custom glyph read brighter than the toolbar's Close beside it though both wore `--label-control`; the reader draws Lucide's stroked `lock` at the toolbar's icon size, and the sidebar's lock glyph keeps the filled one.
- **Every Row Wears Its Own Icon (Last Call 8):** a Collection's and a Space's sidecar icon are read as a Set's is, so the Trash's Collection and Space rows wear their own icons too, where this phase first narrowed the rule to pages and Sets.
- **One Reader for "What Left From Within This Set":** `bundles:list`'s `within` reads through `archivedWithin`, which answers each listed bundle whole with its origin and held trail, and refuses a `within` on the Trash.
- **One Owner Rule, One Shown Rule:** `ownsArchivePlace` names a Collection or a top-level Set for `archiveOwnerOf` and the archive cores; `useHostShown` says a view is shown for ArchiveView, the bar's declaration, and the count's publication.

##### Found False or Drifted at HEAD

- `markdown-pm.css`'s History selector is `:79`, not the Findings' `:76`, and the file holds no "snapshot" comment; only `page-window.css:30` does, and the selector renames alone.
- `useColumns.ts` is `Core/Views/Table/useColumns.ts`; Findings 4.1 cite `Core/Views/Host/useColumns.ts:32-46`.
- The depth rule is `ViewMenu.tsx:19-25` (`:23` is its depth test), the only copy in `Core`.
- Findings *§Verified*'s "five exhaustive sites" omit `searchEntriesOf`'s `byKind` (`treeIndex.ts:149-156`), the site that forces `NodeRecord.kind`'s exclusion, and `searchView`'s `isContainer` gate (`viewSearchSlice.ts:27`), which admits the place in 6B-6 beside its consumer.

##### Line Total

- **+644 (+908 / −264):** 6B-1 +70, 6B-2 +99, 6B-3 +80, 6B-4 +48, 6B-5 +107, 6B-6 +240, under the plan's one counting rule (`view-delta`'s Actionable column: source with imports and blank lines as Biome wraps them; comments, tests, documents, and the drive out; moved lines on both sides, named apart).
- **Against the Estimate (+264: +38, +38, +48, +140, the last for the three tasks that were one):** the +380 splits three ways.
  - **Counting (≈ +120):** imports are +66 of the phase (6B-4 to 6B-6's +51, ArchiveView's 27 among them), measured; Biome's layout of signatures, argument lists, and one-attribute-per-line JSX is about +60 more (ArchiveView's table head and row, the reader's shell, the bar face, `askTrashing`, `offerUndo`, the row builders).
  - **Behavior the Estimate Didn't Cost (≈ +130):** `BundleRow.stored` and the Set's sidecar icon, with the row builders going async (+26 in `rows.ts`); the restore's Undo, *§Copy*'s `Restored 3 Pages` with Undo (+22), and its kept Archived date (+5); the batch delete from the Archive and its one Undo armed on every bundle (+25); the one door for the menu and the bar, with `rulesOf` naming every way the two stores differ (+19); the Set place's narrowing through `within`, read as `unknown`, and `originWithin` (+17); a batch's `storesChanged` (+1); the header's `trailing` and `searchView`'s admission (+10); `Swap`'s class (+3).
  - **The Estimate's Own Items, Written Larger (≈ +130):** chiefly ArchiveView (+195 against +95, its failed and per-owner lines among them) and the reader's shell and Archive branch (+79 against +31). ArchiveView's memoized `ArchiveRow` with `RowApi` and `useStableApi` (≈ 25) is TableView's and CardsView's idiom and keeps the bar's `api` stable; the Set row's sidecar icon with the builders' async turn (≈ 15) serves both browsers' rows.
- **What Leaves, Inside the Totals:** `ViewMenu`'s inline rule and `findCollection`/`findSet`, the placeholder More button and its import, `confirmDelete`'s inline question, `emptyBatch`, the Trash's crumb mapping and its frozen-trail CSS, `fetchPageDetail`'s use, `historyTarget`'s three names, and the window markup the shell now owns once.

### Phase 7 — Reconciliation

**GOAL:** Every document describing the code reads true for the codebase the phases leave: the feature documents, the structure map, the issues index, the scripts README, and the planning lines the Findings falsified. Code comments and tests were rewritten in their own phases; this phase touches no source and runs once Phase 6B lands.

#### Task 7-1

**TASK:** Reword every document claim the work makes false, surgically and in place, close I-007, record the exclusion-scope and watcher-race entries, and add the Archive Drive to the scripts README. The Archive's own description already stands in `CollectionsPM.md` *§The Archive* (written by the owner, 10-20-2026) and is not added to or restated anywhere; elsewhere the Archive is named only where a sentence is untrue without it, in the sentence's own register, with no new paragraphs and no over-importance. Every item below is a candidate sentence to read first: where it is still true at HEAD, it is left alone.

**Governing direction (the owner, 10-20-2026):** fix wrong facts; add no bloat; `r/studio-documentation` governs the wording.

**NOW:** Each CHANGE item cites the sentence it replaces. Stale names to expect there: the File History window and `PageHistoryWindow.tsx`, `HISTORY_ANCESTOR`, `recordById`, `trashedPagesOf`, `trashedPages`, `Core/Trash/resolve.ts`, `Core/Trash/record.ts`, `--fill-tertiary`, "Decision 33", and `// Trash` as "Deletion, bundling, and restore records". `~/The Studio/.claude/scripts/index-issues/index-issues.py <issues file>` closes ID gaps, re-points citations, and recomputes **TOTALS** from the index rows; it writes no row itself.

**CHANGE**

- [ ] `.claude/Features/CorePM.md`: the tree diagram (`:29`) gains `.nexus/archive/<id>/`, one line naming it the one hidden folder read as content. *§Folder Exclusion* (`:69`): the Archive is the one hidden folder every cascade and the content index reach while the tree leaves it out; un-adopted folders are indexed and cascade-reachable for content reach alone; renaming or moving a Collection or Set carries every excluded entry and the asset directory's setting (the entry written before the move, dropped after); archiving or trashing one lifts its excluded folders and the asset directory into its parent. `:73`: the asset directory follows a rename or move and is left behind on archive and trash. `:87`: the delete's two sources, a live item and an archive bundle. `:114`, `:120`: `PageReaderWindow.tsx` is the one read-only reader for File History and archived pages. `:118`, `:158`: the sweep runs after the content index seeds, the live and archive cutoffs in one statement. `:143`: the metadata lifetime row gains "an emptied Collection's Archive".
- [ ] `.claude/Features/NexusRecordPM.md`: `:4`: provenance in every bundle of either store, kept at `Core/Bundles/`. `:8`: Archive bundles mirror their origin chain under `.nexus/archive/<Collection ID>/` as Trash bundles do under `.trash/`, and a record names its place (`place`) and the ids above its parent (`trail`). `:10`: the payload gains `place`, `trail`, and `archive` (Trash records alone) and loses `excluded`. `:14`: a landing steps aside past the tree and the disk and returns to its exact place. `:16` stays the Trash frame's.
- [ ] `.claude/Features/ConfigurationPM.md`: `:109`: the asset directory's setting follows its folder on rename and move. `:111-117`: the section is Trash & Archive, with Confirm Before Deletion (naming Contexts and Spaces), Confirm Before Archiving, Permanently Delete Files (the rewritten hint), and Restore Links On Deletion. `:124` gains Archive History Timeframe, following History Timeframe until set and never exceeding it. `:126`: Cleared is a cross-fade held 1500 ms. `:217-221` gains the Archive Date Column row beside the Trash's. `:259`: entries carry on rename and move, are left behind with their folders on archive and trash, the asset directory alike, and a restore carries nothing.
- [ ] `.claude/Features/ViewTypesPM.md`: `:61` gains the footing's Archive button (filled, inline, pressed while ArchiveView shows, toggling); `:75`: ArchiveView's title carries the search too; `:95`: TableView and ArchiveView share the sheet and `table-view.css`; `:175` gains `useVirtualRows` as the seam the renderers would ride.
- [ ] `.claude/Features/PommoraUIX.md`: `:395`'s `checkSet` gains `checkedIn` and `actedOn`; the Animations table (`:203-217`) gains `Swap` and `DONE_MS`; `:229`: Filled is `--fill-secondary`; *§Interactions* (`:317-319`) gains `useVirtualRows`; `:387`: `LockGlyph` is two faces through `Swap`; `:391` gains ArchiveView among `UIX/Table/`'s wearers.
- [ ] `.claude/Features/InterfacePM.md`: `:8` and `:12` gain ArchiveView's title search and the ViewMenu on the archive place; `:48` lists the reader window in **All**'s scrollbar list; `:58` names `PageReaderWindow` and its role, the count holding at seven; `:80`: `ActionLabel.tsx` is the one top-right label drawing a notice or the shown view's bar, covering archiving beside deletion and ArchiveView's spend; a notice posted under the pointer drains once the pointer has left, unless the pointer stood on the label itself (as the bar's own press leaves it), which arms it at once.
- [ ] `.claude/Features/NavigationPM.md:30`: the iconography gains the archive tab's glyph and title.
- [ ] `.claude/Features/ConnectionsPM.md:30`: a delete strips the Link values naming it from every page and Space the tree holds and every page the Archive holds, outside the delete (Task 3-3's governed reach); the rest of the paragraph stands.
- [ ] `.claude/CLAUDE.md` *§Codebase Structure*, written by the orchestrator itself, not the executor: add `// Archive       | • The Archive's ops, re-filing, and ArchiveView` and `// Bundles       | • The bundle format, record, placement, rows, and browser both stores share` in alphabetical place; `// Trash` reads `• Deletion, Trash Mode, parking and refill, and the restore reconcile`.
- [ ] `.claude/IssuesPM.md`:
  - I-007's index row (`:13`), body (`:142-154`), and footnote (`:1273`) leave the index, as a resolved entry does; the commit names its resolution by Phase 1's lift.
  - I-074 (`:956-968`): drop the sentence naming "Something already sits at the restored location."; "Decision 33" reads E-4; the footnote (`:1340`) cites `Core/Bundles/placement.ts` (`freeOnDisk`, `resolveRecord`) and `Core/Paths/names.ts`.
  - I-034's citations (`:806`, `:1300`) follow `originPagesIn` in `Core/Bundles/bundle.ts`.
  - I-042's body (`:727`): the window's `pagesByIdOf` and the reconcile index keep the first the walk listed, while the host's `nexusPages` `byId`, which a restore and every refill read, answers null and `livePathOf` none, the ledger listing the rest and picking the eldest; its footnote (`:1308`) cites `recordsOf` alone at `Core/Nexus/record.ts` and gains `Core/Nexus/heldPages.ts` (`nexusPages`).
  - I-047's body (`:478`): the reader window for the history window, `READER_ANCESTOR` for `HISTORY_ANCESTOR`, and a page titled "page-reader" that can't be embedded inside the reader where it names "page-history" and a history snapshot (Task 6B-2's sentinel); its footnote (`:1313`) cites `Core/Interface/Windows/PageReaderWindow.tsx` (`READER_ANCESTOR`).
  - I-069's body (`:936`) reads `originPagesIn` for `trashedPages`; its footnote (`:1335`) cites `Core/Bundles/bundle.ts` (`originPagesIn`) and `parkLinks` in `Core/Trash/holdings.ts`.
  - I-073's footnote (`:1339`) cites `Core/Bundles/record.ts` (`linkTargets`, `readRecord`) and `Core/Bundles/bundle.ts` (`listBundles`, `openBundle`).
  - New **Every write to the exclusion list re-reads the Nexus, restarts the watcher, and has sync re-check, carried entries included; scope changes could land incrementally.** under *A3 • Nexus & Data*, its id the next free `I-` number, in I-074's format (index row, `####` body with its one-row table, **Description**, **Solution**, and a `[^N]` footnote under *§Sources*; Concern Minimal, Origin Shortcut, Base the *§BASELINE* table's head, Created 10-20-2026). Description: `applySettings` patches the held scope and answers `'walk'` on any scope change, the settle restarts the watcher and sync reconciles; `carrySetAside`'s two writes per carried folder each take that path. Solution: an incremental rescope in `applySettings`, the watcher's captured filter, and sync's `rescope`, reaching every exclusion edit. Cites `Core/Nexus/fileEvents.ts:502-518`, `Core/Nexus/settle.ts:177-185`, `.claude/Features/DesktopPM.md:22`.
  - New **An outside unlink within the watcher's write hold of the app's own write leaves a ghost until the next walk.** under the same area, in the same format: Description: chokidar's `awaitWriteFinish` merges the app's own add (a rename or write) with an outside unlink inside about 200 ms, so no unlink reaches the app and the tree and index keep the file until the next walk (`Desktop/FileWatch/watcher.ts`, the `awaitWriteFinish` option). Solution: drop `awaitWriteFinish` (the event batch already debounces 200 ms; the cost is one unreadable read of a half-written outside page) or re-stat a held path once its hold ends. Concern Minimal, Origin Shortcut, Created 10-21-2026.
  - Remove I-007 and write the new entries by hand in the index's format, then run `python3 ~/"The Studio/.claude/scripts/index-issues/index-issues.py" .claude/IssuesPM.md` to renumber and total.
- [ ] `.claude/Features/PagesPM.md`, `NexusSyncPM.md`, `PropertiesPM.md`, `ContextsPM.md`, `CollectionsPM.md`, and `SurfacePM.md`: sweep for the VERIFY grep's retired names and for any claim that the Trash is the one removal path or that every hidden folder stays out of content, rewriting each hit in place. `PropertiesPM.md:128` (now: a cached Link naming a gone page always leaves the cache): a cached Link naming a page gone leaves the cache, joining that page's Trash bundle when it sits there, while one naming an archived page stays (D-1). `CollectionsPM.md:45` (now: a bare folder rename, only a move dropping an id from its container's order): a rename carries the folder's excluded entries and asset directory, a Set can also leave for its Collection's Archive, and a delete drops its id from its container's order as a move does. `CollectionsPM.md` *§The Archive* (the owner's, uncommitted in the tree; committed with this phase): only its untrue facts are reworded, nothing added or restructured, the heading level kept, its trailing citation kept: the store is not an "index" (it holds the pages and Sets themselves, as bundles) in its first and last uses; a Link property value naming an archived page stays as it is (D-1), so "any metadata-level links pointing towards it are removed" is false; a restore lands in the item's exact former place and steps aside to "Name (2)" past anything the tree or the disk holds there, so the clause tying title conflicts to an "existing-versus-restored prioritization preference" (I-074, deferred) is false; the missing space in "the user's`/.nexus/archive/…`". The other four read true at HEAD where they touch the Trash or `.nexus` (`NexusSyncPM.md:9`'s manifest carries the Archive inside `.nexus`).
- [ ] `.claude/scripts/README.md`: a paragraph for `Archive Drive/live-drive.mjs` in its neighbours' register: what it drives, its groups 1 to 6B following the phases, `POMMORA_ARCHIVE_LANDED`, its seeds in `~/Test`, its debug port, and its non-zero exit on any failed check a landed phase owns.
- [ ] `.claude/Planning/Archive/Archive — Investigation.md`: `:68` and `:336`: `readIndexedStats` answers before the seed and null only with no store; `:251`: the Trash restore's two-map relink, hoisted as `returningNames`, re-spells a restore's arrival; `:294`: the resolver's home is `Core/Paths/nexusPaths.ts` with its four exports; `:306-310`: the chain-mirrored layout.
- [ ] `.claude/Planning/Archive/Archive — Decisions & Intention.md` *§Prospects › The Mark Model*: the migration line spells `.nexus/archive/<ID>/<origin chain>/<stamp>__Name.archived/` (now flat).
- [ ] `.claude/Features/DesktopPM.md:22` stays as it is (the re-read stays).
- [ ] Names that moved during execution, wherever a document cites them: `archivedPageIds` (the Archive's one id reader, `heldPages.ts`), `SETTING_BOUNDS` and `settingWithin(p, key)`, `dropPageDetailsUnder`, `archivedWithin` as the one "what left from within this Set" reader, `ownsArchivePlace`, `useHostShown`, `restoreOne`, `deleteQuestion`; both browsers draw each row's own icon (pages, Sets, Collections, Spaces).

**AFTER**

Each document reads as its CHANGE item states, every sentence replaced in place; no source file changes.

**VERIFY**

- [ ] `node .claude/scripts/check-atlas.mjs` exits 0.
- [ ] `git grep -n -i "PageHistoryWindow\|NotificationLabel\|trash:list\|trashChanged\|TrashRow\b\|deletedAt\|releaseExcludedFolders\|reseatExcludedFolders\|followExcludedFolders\|keyHolderFiles\|recordById\|fileHistoryMenu\|trashMenu\b\|useTimedLabel.ts\|glyphSwap\|trashedPages\|Trash/record\.ts\|HISTORY_ANCESTOR" -- .claude/Features .claude/CLAUDE.md .claude/IssuesPM.md .claude/scripts/README.md` returns nothing.
- [ ] `grep -n "Decision 33\|Something already sits" .claude/IssuesPM.md` returns nothing; `grep -n "Every write to the exclusion list re-reads the Nexus" .claude/IssuesPM.md` finds the index row and the body's heading, and the footnote carries the entry's id.
- [ ] Every cited line above is re-read after the edit and holds the replaced sentence alone.
- [ ] Check for unnecessary code or mistakes.

**Lines:** docs only.

#### Review Checkpoint

- [ ] Two `opus-high` reviewers to `closeout-review`'s standards read outward over `.claude/Features`, `.claude/CLAUDE.md`, `.claude/IssuesPM.md`, `.claude/scripts/README.md`, and the Reconciliation list: every quoted claim reads as replaced, no document still describes the Trash as the one removal path or the hidden-folder rule as absolute, and no sentence the decisions keep (the Trash's model and look; `DesktopPM.md:22`) was rewritten.
- [ ] `node .claude/scripts/check-atlas.mjs` exits 0; `view-delta` shows the phase as documentation alone.

### Completion Criteria

- **Conformance:** every change sits under *§Constraints*; no mechanism landed that an existing one already provided (one bundle format for two stores, one placement, one step-aside, one carry, one lift, one governed reach, one by-id projection, one twin rule, one restore menu, one face swap, one TanStack seam, one browser controller, one top-right label, one read-only reader); nothing changed outside the files the tasks name, and `Core/Sync/`, Project Sapphire, MarkdownPM beyond the pill, the Trash's model and look (its rows' own icons aside), and Path Links' link rules are untouched.
- **Correctness:** each behavior the decisions name is observably true in `~/Test` as the Archive Drive exercises it: a page archived from any menu leaves the sidebar, views, search, and the Matrix and lands under `.nexus/archive/<id>/`; an option rename rewrites it where it sits; its restore returns it between its former neighbours with nothing reconciled, stepping aside to `Name (2)` past an occupant; ArchiveView lists a Collection's or top-level Set's archived items with their trails and dates, searches in place, and acts through right-click and ActionLabel, whose Restore cross-fades into an Undo notice; a delete from the Archive reaches the Trash and its Undo returns to the Archive while the Trash's Restore returns home; a trashed Collection keeps its Archive and an emptied one loses it; an Archive with no Collection anywhere is in `.trash` after the next open; a Set moved to another Collection carries its archived items; an excluded folder and the asset directory ride a rename or move with their settings and are left behind by an archive or a trash; the reader opens an archived page read-only under the lock glyph; the archive history timeframe follows History Timeframe until picked and never exceeds it.
- **Completeness:** every task and checkpoint in *§Process Overview* is ticked; every removal *§Concepts* names is gone; no scaffolding, debug output, or unauthorized TODO remains; the drive's groups 1 to 6B all pass with `POMMORA_ARCHIVE_LANDED` at its last phase.
- **Confirmation:** every "write and watch fail" test went red before its change and green after; every VERIFY ran and its output was read; no check was left to Nathan.
- **Continuity:** *§Reconciliation* is walked; the documents Phase 7 names read true; every deviation is fixed or ruled on under *§Deviations*.
- **Confidence:** the three gates are green from a clean checkout at HEAD; `view-delta` over each phase's own commits is reported with additions and removals apart, per phase and summed in total, against *§Overview › The Number*, and growth past it states what it bought; both neutral gates answered without ambiguity that the result holds to every principle this work set.

#### Final Verification

**THE STANDARD:** The work is finished when a later review of it finds nothing to correct. Not just doing the chores — doing the laundry, folding it, picking up what fell out of the hamper, emptying the lint trap, leaving no trace that anything went wrong. Nothing is carried as a concern, nothing is deferred where the fix is known, and nothing is declared that wasn't watched happen. Where something genuinely couldn't get there, the report names which and why, and everything else is still finished. Ambiguity in how a task is done was taken at its simplest reading and recorded; it didn't stop the run. A conflict with what the decisions build went to Nathan at the next Stop, per *§Departures*.

- [ ] Phase Review (`opus-high` pairs): Phase 1 · Phase 2 · Phase 3 · Phase 4 · Phase 5 · Phase 6A · Phase 6B · Phase 7
- [ ] **Simplification lens** — one `opus-xhigh` agent reads `<BASELINE>..HEAD` whole for what can be removed, folded, or hoisted now that every phase has landed: a duplicated decision, a helper used once, a guard whose cause the plan removed, a type arm no caller reaches. Its findings are applied before any adversarial read.
- [ ] **Adversarial lens** — two `opus-xhigh` agents over `<BASELINE>..HEAD`, one reading inward (each rule against its tests and the decisions) and one outward (cohesion with the rest of Core, Desktop, and UIX; anything that reads as an odd-one-out). The orchestrator verifies each finding against the code before applying it.
- [ ] **Neutral verification** — Neutral Gate 2: one `fable-high` agent, given only the BASELINE head, HEAD, and the second intention under *§Constraints · Neutral Gates*, with no plan, log, or document, answers whether the result holds to every principle it states and what it would correct. (Neutral Gate 1 closed Phase 4 the same way.)
- [ ] **Own pass** — the Archive Drive over every group once more; the gates from a clean state; baseline counts; the diff read once; *§Completion Criteria* ticked.
- [ ] **Reconciliation** — *§Reconciliation* walked; *§Deviations* ruled on; STATUS and BASELINE's End filled.
- [ ] **Report** — in `closeout-review`'s closeout format with `c/save-delta` over the range, the per-phase and total delta, every deviation, and both neutral reviewers' answers verbatim, written for Nathan in plain terms.

#### Reconciliation

**Tests**

- `Core/Nexus/mutate.test.ts:3276` — "refuses a landing that carries excluded entries while settings.json can’t be written" (its delete half) — Task 1-2
- `Core/Nexus/mutate.test.ts:3300` — "refuses a Set moved, or a Collection restored, with excluded entries …" — Task 1-2
- `Core/Nexus/mutate.test.ts:3334` — "takes a trashed Collection’s entries with it and lands them wherever it is restored" — Task 1-2
- `Core/Nexus/mutate.test.ts:3362` — "reports a Collection delete and its restore to Sync as one rename each …" — Task 1-2
- `Core/Trash/spend.test.ts:1506` — "an occupant the tree cannot see refuses the restore — never a clobber" — Task 2-5
- `Core/Trash/spend.test.ts:1527` — "a Set restored onto a folder Settings excludes refuses, the bundle intact" — Task 2-5
- `Core/Trash/spend.test.ts:1542` — "only a trash bundle restores — an in-nexus path refuses" — Task 2-1
- `Core/Trash/trashRows.test.ts:167` — "reads the deletion time out of the bundle stamp, newest first" — Task 2-3
- `Core/Trash/trashRows.test.ts:234` — `describe('deletedPathOf')` — Task 2-1
- `Core/Trash/trashRecovery.test.ts:122` — "a page deleted and restored comes back where it was, and leaves the list" (gains the exact slot) — Task 2-4
- `Core/Properties/keyHolders.test.ts:62-152` — the `keyHolderFiles` describe — Task 3-2
- `Core/Properties/keyHolders.test.ts:155` — "files no value for a page holding another casing of the key" — Task 3-3
- `Core/Files/walk.test.ts:69` — "never reads inside `.trash`, `.nexus`, or an excluded folder" — Task 3-1
- `Core/Views/loadValues.test.ts:22` — "maps page id → frontmatter across the container and its nested Sets" — Task 3-4
- `Core/Properties/governedSweep.test.ts:118` — `describe('sweepCount')` — Task 3-4
- `Core/Trash/deleteOrder.test.ts:154-220` — "the record is written before the destruction it describes" (gains the archive source) — Task 4-3
- `Core/Settings/TrashFrame.test.tsx:33-64` — the `filterRows` describe (ranking) — Task 5-5
- `Core/Settings/TrashFrame.test.tsx:66-85` — the `countPhrase` describe (lowercase) — Task 2-5
- `Core/Settings/TrashFrame.test.tsx:93`, `:138`, `:276` — the `'trash:list'` mocks — Task 2-3
- `Core/Actions/trashMenu.test.ts`, `Core/Actions/fileHistoryMenu.test.ts` — collapse into `restoreMenu.test.ts` — Task 5-3
- `Core/Interface/Notifications/NotificationLabel.test.tsx:76`, `:85` — "stalls within its band …", "holds where it stands through a press" — Task 5-2
- `Core/Settings/NexusRows.test.tsx:69-70` — `button(label)` matching `textContent` — Task 5-1
- `Core/MarkdownPM/codeDiff.test.tsx:58` — "reads Copied when clicked, unless a tally takes the word" — Task 5-1
- `Core/Interface/Confirm/confirmations.test.ts:184` — "gives up its Undo and the chord once the Trash spends its bundle" — Task 6A-1
- `Core/Actions/pageMenu.test.ts:15`, `:87`; `entityMenu.test.ts:20`, `:41`, `:62`; `cellMenu.test.ts:8`; `cardMenu.test.ts:5` — the menus' groups — Task 6A-2
- `UIX/Pickers/PickerControl.typeable.test.tsx:82` — "a left press opens the list through the door, marked on the current value" — Task 6A-3
- `Core/Pages/fileHistory.test.ts:365` — `describe('sweepFileHistory')` — Task 6A-3
- `Core/Testing/storesContract.ts:356` — "sweeps snapshots older than a cutoff" — Task 6A-3
- `Core/Session/windowSlice.test.ts:22`, `:36` — the history window's reconcile — Task 6B-2
- `Core/Session/devicePrefsSeed.test.tsx:227`, `:242` — `openHistory`, `historyTarget` — Task 6B-2
- `Core/Nexus/treeIndex.test.ts:68` — "holds display cores for the homepage, the Matrix, spaces, collections, sets, and pages — never groups" — Task 6B-3

**Comments**

- `Core/Nexus/folderEntity.ts:30` — "excluded entries follow before sync hears of the rename" — Task 1-1
- `Core/Nexus/fileEvents.ts:574` — "with no settings write to report it" — Task 1-1
- `Core/Settings/settings.ts:86`, `:97`, `:108`, `:118`, `:125` — the exclusion functions' docs — Tasks 1-1, 1-2
- `Core/Trash/record.ts:38` — "The excluded entries a Collection or Set held …" — Task 1-2
- `Core/Paths/nexusPaths.ts:7` — "The walk, the index, and every mutation refuse these." — Task 2-1
- `Core/Trash/bundle.ts:13`, `:22` — "`.trash` reads as a shadow of the nexus"; "the bundle's chain under `.trash`" — Task 2-1
- `Core/Trash/holdings.ts:1` — "What the Trash holds — its bundles …" — Task 2-1
- `Core/Trash/trashRow.ts:11` — "the renderer never sees a `.deleted` suffix" — Task 2-3
- `Core/Trash/trashRows.ts:21` — "`.trash` mirrors the nexus faithfully" — Task 2-3
- `Core/Contract/bridge.ts:258` — "`.trash` is outside the watcher, so the browser asks again after every action it takes." — Task 2-3
- `Core/Session/nexusSlice.ts:70` — "so an open Trash list reads again" — Task 2-3
- `Core/Trash/resolve.ts:1`, `:30` — "every name and title choice is made here" — Tasks 2-4, 2-5
- `Core/Trash/spend.ts:180` — the squatter refusal's comment — Task 2-5
- `Core/Nexus/mutateRequest.ts:88` — "Absent order = legacy append. Stale ids in a source container self-drop on the next read." — Task 2-4
- `Core/Paths/exclusion.ts:76` — `outsideContent`'s doc — Task 3-1
- `Core/Files/walk.ts:31` — "held to the same hidden-name rule as the content walk" — Task 3-1
- `Core/Nexus/migrateConfig.ts:45` — "only the Trash and the tile documents are walked here" — Task 3-1
- `Core/Nexus/treePatch.ts:83` — "since Collections sit only at the Nexus root" — Task 3-1
- `Core/Properties/keyHolders.ts:1`, `:47` — the intersection's reason; "whose ID another already took" — Tasks 3-2, 3-3
- `Core/Properties/deleteProperty.ts:98` — "pre-cache dormant values may sit on any page" — Task 3-2
- `Core/Nexus/cascade.ts:72`, `:81`, `:101` — the strip's doc, the no-tree comment, the tree filter's comment — Task 3-3
- `Core/Nexus/heldPages.ts:1` — "The held tree's pages by path and by id" — Task 3-3
- `Core/Properties/governedSweep.ts:150` — "found where `roots` places it" — Task 3-3
- `Core/Matrix/matrixGraph.ts:18` — the graph read's doc — Task 3-4
- `Core/Trash/spend.ts:229` — the two-map comment — Task 4-1
- `Core/Nexus/settle.ts:248` — "The one re-spell" — Task 4-1
- `Core/Interface/Confirm/confirmations.ts:28`, `:42` — `ALWAYS_ASKS`'s scope; the spend's subject — Task 6A-1
- `Core/Actions/trashMenu.ts:9`; `Core/Settings/TrashFrame.tsx:162` — the batch rule's comments — Task 5-3
- `Core/Interface/Notifications/NotificationLabel.tsx:60` — the drain's proximity comment — Task 5-2
- `Core/Interface/Notifications/notifications.ts:1` — "the notice on screen lives here" — Task 6B-1
- `Core/MarkdownPM/markdown-pm.css:1053` — the tally pill's comment — Task 5-1
- `Core/Views/Settings/ViewMenu.tsx:15` — "Renders only on a Collection / depth-1 Set" — Task 6B-3
- `Core/Actions/destinationTree.ts:1` — "the trash's Restore ▸" — Task 6B-6
- `Core/Views/Table/table-view.css:1`; `UIX/Table/table.css:18` — the sheet's wearers — Task 6B-6
- `Core/Interface/Windows/PageHistoryWindow.tsx:35`; `Core/Interface/Windows/page-window.css:30`; `Core/MarkdownPM/markdown-pm.css:79` — "embeds inside a snapshot"; "A snapshot is a record"; the History placeholder selector — Task 6B-2

**Documents** — every entry in Task 7-1's CHANGE list — Task 7-1

#### Open Items

##### Last Calls (ruled 10-20-2026)

1. **K-1's Second Sentence:** K-1 reads by its outcome, the move adding no second reseed; the counterpart rule it named was inert, since the carry's own settings write already restarts the watcher once (Task 1-1's pin).
2. **Restores Write the Whole Order:** accepted, and recorded under E-2: a folder with no order gains the one it showed, and a record from before `place` lands last (Task 2-4).
3. **The Archive's Batch Delete Question:** approved as written and added to *§Copy* (Task 6B-5).
4. **The Bar's Count for One Checked Row:** `Restore | 1 Page`, added to *§Copy* (Task 6B-1).
5. **A Set's Empty ArchiveView:** `This Set's archive is empty.`, added to *§Copy* (Task 6B-6).
6. **A Failed Listing:** `The archive couldn't be read.`, its rows withdrawn as the Trash's are, added to *§Copy* (Task 6B-6).
7. **The Restore's Undo:** each item returns to the Archive under its original Archived date, recorded under E-3: the `archive` op takes the restored bundle's leaf, which `mintBundle` keeps when it is a stamped leaf of the item's own name and replaces with a fresh stamp otherwise (Task 6B-5).
8. **Item Icons:** both browsers draw each row's own icon, recorded in G-1 and *§Constraints › Frozen* (Task 6B-4).
9. **The Bar's Own Notice:** a notice posted with the pointer on the open label, as a press of its own bar leaves it, arms at once, recorded in K-3 (Task 6B-1).
10. **The Matrix and Headings:** both leave out archived pages alone, recorded in K-2, so the Matrix keeps every page it draws today (Task 3-4).

##### Recorded Edges (no ruling needed; disclosed where they land)

- **F-5's Unreadable Open (Task 4-6):** no Archive is swept as orphaned on an open where any root-level container reads unreadable, and no counter is kept, since `Unreadable` carries no id and no retry record exists on disk (`oweRetry` is in-memory); the sweep waits for an open where every root folder reads.
- **Finder Litter (Task 4-6):** an emptied orphan `<id>/` holding only a `.DS_Store` stays on disk, and each open walks it again; no guard is added (Cautionary 7's shape).
- **A Collection Twin (Task 4-4):** a Finder copy of a Collection folder carries its sidecar id, so two Collections can share one Archive, and emptying the trashed twin disposes the Archive the live one reads; no guard (Cautionary 4: a duplicated id nothing in-app produces).
- **The Asset Directory's One Value (Task 1-1):** a crash between the write ahead and the rename leaves `asset_directory` naming the landing with its source excluded, so nothing is adopted, but its images don't resolve until the folder lands or the setting is picked again.
- **A Stale Entry (Task 1-2):** an entry under a trashed container that names no folder on disk stays in Settings, where the release removed it.
- **Twins Inside an Unparsed Collection (Task 3-3):** with one twin rule over the by-id map, two files sharing an id inside a Collection whose sidecar doesn't parse are both stripped, and the second's value overwrites the first's; a duplicated id nothing in-app produces (Cautionary 4's shape).
- **The Strip's Held-Out Rule (Task 3-3):** a Link holder with no ID now appears in the "not updated" warning, and one under a withheld folder is held out rather than stripped with nothing recorded.
- **The Reader's Geometry (Task 6B-2):** the window's remembered size resets once, as its key becomes `'page-reader'`.
- **The Swap's Fixed Cell (Task 5-1):** "Copied" sits centered in the code block's pill, and Settings' Clear button holds "Cleared"'s width at rest.
- **A Following Timeframe (Task 6A-3):** picking the step a following Archive History Timeframe already shows leaves it following, since the picker ignores a pick of the current value.
- **An Undo Across a Set's Move (Task 6A-1):** an archive's Undo names the bundle path the archive minted; moving the item's Set into another Collection carries that bundle, so an Undo pressed afterwards posts a refusal, the item sitting restorable in the new Collection's Archive. A delete's Undo from the Archive (Task 6B-5) shares the shape; the Trash's bundles never move.
- **Sync and the Open Pass (Final Review):** a device whose first pull lands `.nexus/archive/<id>` before the Collection's sidecar sweeps that Archive into the Trash on open, and the swept records carry no `archive`, so a Trash restore lands them live; the pass predates Sync and is gated or softened before Sync lands.
- **An Outside Drag From the Archive (Final Review):** a Finder or Sync move out of the Archive pairs as a move from the archive path, so path links naming the origin aren't re-spelled where it lands (I-067's shape).
- **A Stale Browser Under Host-Side Moves (Final Review):** the settle, the open pass, and Sync move bundles with no renderer op, and only ops emit `storesChanged`, so an open ArchiveView or reader shows what it opened with until re-shown; main classes store paths as ignored, so a `stores:changed` push from the settle is the follow-up.
- **The Archive Tab Under an Unreadable Set (Final Review):** an archive place carries no path, so its tab drops while its Set's sidecar reads unreadable, where the Set's own tab survives.
- **An ID-less Archived Row (Final Review):** an archive inside the watcher's quiet window after an outside edit stripped the page's ID lands a record with no id, so its row neither opens nor checks and its Undo is skipped.

#### Deviations

Phase 1 measured +11 (+99 / −88) against the written −6; the two entries below were +17 of it, and the rest landed as written.

- **The Crops (Task 1-1):** a carried or lifted asset directory's image crops were re-keyed through one `rekeyCrops`, which the asset migration now shares. The plan hadn't priced it, and the decision log promises no banner or attachment breaks; it netted 0, `settings.ts` +10 against `assetMigrate.ts` −10.
- **The Undo (Task 1-1):** the carry held the asset directory's source excluded until the folder landed and wrote back its settings when the move threw, which closed a failed move stamping the asset folder as a Set and an in-between `settings.json` syncing. It added +17: `settings.ts` +8 and `folderEntity.ts` +9.

Phase 2 measured +268 (+893 / −625) against the written +263; its review's fix was −6 of it, the five entries below −2 and its smaller changes −4 (`ArtifactRecord` beside `RecordFile` +1, a Context's `landedAs` read against its registry title +1, and the restore's record read once as `stored` −6, which writes Phase 3-3 at +58 and Phase 4-2 at +112, where its seven-argument call wraps), and the +11 before the fix landed across the tasks as Biome wrapped them.

- **Own Form (Task 2-5):** `freeOnDisk` stepped aside past the item's own form alone, a page's `.md` file or any other kind's folder, following E-4 over the plan's departure that probed both forms, so an excluded folder stays beside a page of its name as the lift leaves it. It was −2 in `placement.ts`.
- **The Composer (Task 2-5):** the delete's notice and the Trash's report folded into one `notifyOutcome` in `notifications.ts`, which `notifyDeleted` calls and which Phases 5 and 6B call where they had moved and extended the Trash's own composer. It added +6, `notifications.ts` +13 against `TrashFrame.tsx` −7; Phase 5-5 moves 7 fewer lines each side, and 6B-5 lands at +107.
- **Contexts (Task 2-4):** a Context gone for good, deleted to the system Trash or emptied from the Trash, dropped its panel id with its Space order through `dropContextOrder` (`dropSpaceOrder` renamed), where the id had stayed in `order.contexts`. It added +2 in `reorder.ts`.
- **The Id Rule (Task 2-3):** `bundles:list` held an archive id to one safe path segment through `holdsName` rather than to ULID shape, the one rule the path built from it needs, and refused an id that failed it rather than answering an empty list. It added +1 in `handlers.ts`.
- **The Order Write (Task 2-4):** the restore's order write used the parent node its resolution already held, carried as the resolution's `order`, in place of a second lookup by path, which had written a Space restored under one of two same-titled Contexts into the other's order. It was −9 in `placement.ts`.

Phase 3 measured +143 (+333 / −190) against the written +108. It landed at +111 before its review, Biome's wrapping the difference, and its review's fix was +32: the twin's way back below +8; one memoized twin map, one predicate, and the Archive's scope read from the tree +9 in `heldPages.ts`; the governed reach moved beside the governed sweep, reading the tree once, +15 (`governedSweep.ts` +26, `deleteProperty.ts` +7, `optionOps.ts` +5, and `replaySchemaCascade.ts` +1 as their imports wrap, against `keyHolders.ts` −24); the rename's both-keys refusal leaving the Archive out (C-4) with one `isArchived` at its four sites +3; the archived arm of the configuration pass reading each sidecar once and counting an unreadable one +3; `deleteCascade`'s one bail +3; and `loadValues`' relative paths −9. The drive's withheld page below changed only the drive.

- **The Twin's Way Back (Task 3-3):** the plan's restores dropped a value whose holder's id two files claim with nothing kept: the Link refill parked it as a trashed page's, and a tag's `reapply` and the property restore left it out unnamed, so the record went with it. A restore now leaves the value out of both twins, names it through `shownTitle` (the first-listed page's title, the one the window shows), and keeps the record where the record outlives the restore. It added +8: `heldPages.ts` +6, `spend.ts` +1, and `restoreProperty.ts` +1.
- **The Drive's Withheld Page (Task 3-4):** the plan's group 3 witnessed K-2 with a page carrying a task-marked ID, which the value load's own record read already refuses, so its value-load item couldn't fail, and which the Matrix graph didn't hold, so its Matrix item failed. The landed witness is a page under a Set whose sidecar doesn't parse, which the index and a folder walk read and the tree withholds: the value-load item fails if the load walks the folder again, and the Matrix item proves the graph keeps a page the tree withholds. It changed the drive and `MATRIX.md` alone, apart from the count.

Phase 4 measured +485 (+606 / −121) against the written +432. It landed at +437 before its review, its doc lines and Biome's wrapping the difference; Neutral Gate 1's two corrections (a Set's archived Sets found by their records' ids, and a carried Set's own views left alone) were +13, and its review's fix was +35: the three entries below about +22, one bundle opener for every restore and delete with `placeRecord` taking the opened bundle, one walk for an Archive's Sets, and the carry stating its own catch the rest.

- **The Id Rule, Again (Tasks 4-2, 4-4, 4-5):** `archiveOp` and `collectionArchive` held the Collection id to one safe path segment through `holdsName`, the rule `bundles:list` took in Phase 2, rather than to ULID shape, so a Collection whose sidecar carries a hand-written id archives like any other; the carry, its re-file, and `archiveReach` took the same gate, so no Archive path built from a Collection id leaves `.nexus/archive`. About +5, the gates in `refile.ts` and `treePatch.ts`.
- **One Link World (Tasks 4-3, 4-4):** the delete's strip judged what a Link value still names against the tree and the Archive, as every refill and frozen world does since Phase 3, so a value an archived page still answers stays in place (D-1) whether the page deleted was archived or live; the Trash recorded a trashed page's link to an archived page as its target where no live page answers its key, so the link follows that page wherever it returns. About +8, `cascade.ts` and `gather.ts`.
- **The Moved Set's Views (Task 4-5):** a Set moved to another Collection took the archived Sets carried with it out of the saved views it left, as it takes its live descendants, finding them by their records' ids, and the configuration pass left those Sets' own views alone. About +12, `move.ts` and `refile.ts`.

Phase 5 measured +125 (+503 / −378) against the written +95. It landed at its written +95 before its review, and its review's fix was +30: the browser hook's one load state and TrashFrame's switch over it, a batch a Nexus switch stops posting nothing, a batch with nowhere to restore posting only that, and the code block tally's hidden face taking `Swap`'s `inert` and `aria-hidden`, against the batch's dead page patch and one `matches` for three searches.

- **One Path for a Batch (Task 5-5):** the batch runner moved into `useBundleBrowser` took the single action's path where the plan moved it as it stood: it stops at a Nexus switch as `mutate` does, and signals `storesChanged` once per batch, which the browser's own subscription re-lists on, rather than awaiting a re-list of its own, so a batch in one store tells the other to re-list (Phase 6B's delete from the Archive to the Trash) and its notice posts before the re-list lands, as a single action's does. About +4.

Phase 6A measured +120 (+190 / −70) against the written +102. It landed at +107 before its review, five lines above the written figure for the one reader of the Archive's ids, and its review's fix was +13: the archive arm of the page cache, a container's pages dropped with it, and the one bound, against the row's `within` and the reader's and writer's spellings of it.

- **An Archive Clears the Page Cache (Task 6A-1):** the plan's `confirmArchive` left the archived page's cached detail and slot at its old path, where a delete drops them, so a page restored after a cascade rewrote it in the Archive would have opened from the body it had when it left and saved against a stale base. The archive takes the delete's arm, and a container's delete or archive drops its pages' details with it. About +8, `navigationSlice.ts` and `pageDetailCache.ts`.

Phase 6B measured +754 (+1,049 / −295) against the written +644. It landed at +661 before its review, and its review's fix was +93: the owner's five rulings on the screenshots (the footing's button at the right, no banner on the archive place, the trailing label's size, both browsers' date columns measured from their widest date, the stroked lock), the bar's one action per press, the destination picker for a homeless single row, and every row's own icon, against the `within` fold, the one owner rule, the one shown rule, and the small folds.

- **The Bar's Restore of a Homeless Row Asks Where (Task 6B-5):** the plan sent a single checked row through the plain restore, so the bar's Restore on a row whose place is gone ended in the placement's refusal while the same row's right-click offered a destination; `restoreOne` pops the destination rows for it, so one checked row behaves the same from either door. About +12, `browser.ts`.
- **Both Date Columns Fit Their Widest Date (Task 6B-6, the owner's ruling of 10-21-2026):** the plan gave ArchiveView the table's fixed date width and left the Trash's 140px lane; both now measure the widest date their style can produce once per style. About +50, `browser.ts`, `ArchiveView.tsx`, `TrashFrame.tsx`.

Phase 7 measured +3 (+4 / −1) where it was written as documents alone: its spotcheck against the documentation reference found one claim the code made false rather than the document, and the code moved.

- **A Delete's Link Count Leaves the Archive Out (Task 7-1):** a delete's "N Internal Links" counted every page the governed sweep stripped a Link value from, archived pages included, where decision C-4 has every count name only what lies outside the Archive; `deleteCascade` keeps stripping the archived pages and leaves their paths out of the count. +3, `Core/Nexus/cascade.ts`.
- **The Documents Read to the Reference (Task 7-1):** the owner's direction of 10-20-2026 governed the rewrite: *§The Archive* in `CollectionsPM.md` is the owner's, fact-fixed in five places and added to nowhere; every other document took only the sentences the code made false, and an opus-high spotcheck against `r/studio-documentation` folded fourteen register and truth findings before the commit. The issues index renumbered on I-007's removal (old I-008 to I-074 are I-007 to I-073; the two new entries are I-074 and I-075), and every citation under `.claude/` was re-pointed.

The final review measured +183 (+899 / −716) over `ddc6f8843..b495bf190`: two waves of two `opus-xhigh` reviewers and their slices, then Neutral Gate 2 (yes on every lens, on `da81976cf`) whose accepted corrections landed as one fold, whose `opus-xhigh` spotcheck's three findings landed as one more; what they changed beyond folds:

- **Bundles Imports No Consumer (Final Review):** Phase 6B had left `archivedWithin`, `originOf`, and `originWithin` in `refile.ts`, with `bundles:list` reaching up into `Core/Archive` for them. They live in `Core/Bundles` (`archivedWithin` beside `listBundles`, the other two with `collectionOf` in the record), and `Core/Bundles` imports neither `Core/Trash` nor `Core/Archive`, as *§Concepts* said.
- **The Returning Files Repaired First (Final Review, Task 4-1):** the first wave's fold hoisted the arrival into one `returningCascade` and ran the live world's sweep before the Trash's identity repair, so a returning page's bare link to its returning sibling was re-pointed at a namesake made meanwhile; `restoreArchived` had the same outcome since Phase 4, having no repair and dropping `own`. Both restores enter one arrival that repairs the landed files first, the Trash by the targets its delete recorded (its Frozen rule) and the Archive by the returning pages' own keys, then sweeps; D-1 governs live links pointing at an archived page, not the archived page's own. Four pins.
- **One Bundling Sequence (Final Review):** three paths minted a bundle, wrote its record, and moved the item in, and only the Undo removed the bundle when the move threw, leaving a record-only folder that took the retry's name. One `fileInto` owns it.
- **The Orphan Rule Reads Every Root Folder (Final Review, F-5):** the open pass exempted live Collections, root-level excluded entries' sidecars, and Collections in the Trash, so a Collection folder renamed hidden in Finder had its Archive swept into the Trash. It exempts the sidecar id of every root folder the tree doesn't hold, through one `collectionsElsewhere`.
- **A Failure Line Counts Every File (Final Review, C-4):** the first wave's fold had a delete's "Couldn't update links" count leave archived write failures out, which also dropped the record's `partial` mark; C-4 governs confirmations and what-changed counts, and a failure line names what wasn't kept current, so the count was restored and `outsideArchive` serves the counts and the push's page list alone.
- **Container Rules Beside the Tree (Final Review):** `isTopSet`, `ownsArchivePlace`, the Sidebar's `depth <= 1`, and the crumbs' `i <= 1` spelled one rule, exported from `Core/Archive`; `isTopContainer` and `topContainerOf` sit beside `findContainerById` and `namesContainer` beside `isContainer`, and `archivePlace.ts` keeps the glyph and the title.
- **ArchiveView's Heading Glyphs (Final Review, G-1):** Phase 6B's headings carried no glyph where TableView draws one on every column and the Trash its own; they wear TableView's, a change made after the owner's screenshots and shown to him.
- **The Index's Readiness Gate (Final Review):** `archivedPageIds` read the content index without the gate every other query applies, so after a seed that threw the frozen worlds lost the archived pages; one `indexReady()` serves the three gates.
- **An Undo Into an Archive Whose Collection Is Gone Refuses (Neutral Gate 2, Task 4-4):** Phase 4 pinned that ⌘Z on a delete-from-the-Archive lands in its Archive whatever became of the Collection, the next open sweeping an orphan into the Trash; three independent reads asked for a refusal, since the page sat where no view reaches until then. Placement refuses as parent gone unless a live Collection has the id or `collectionsElsewhere` (moved beside `listBundles`) knows it, so an Undo into a trashed Collection's Archive still lands; the pin split.
- **The Icon Rides in the Record (Neutral Gate 2, Last Call 8):** Phase 6B gave every row its own icon by reading each container's sidecar per row per listing, new I/O on every store action while a browser is shown; the record declares `icon`, gathered once through `sidecarIdentity`, and the rows build with no I/O. A bundle made before carries none and draws its kind's default.
- **The Lift Undone (Neutral Gate 2, Task 1-2):** `liftSetAside` ran before the bundling in both ops with nothing to put the folders back when the move threw; it answers an undo, runs it from its own refusal or throw, and each op runs it from anywhere between the lift and the artifact's move.
- **One Owner Rule for an Archive (the spotcheck):** the open pass kept an Archive whose Collection was live, whose any root sidecar read unreadable, or which `collectionsElsewhere` knew, while placement's Undo branch checked live or elsewhere alone; one `archiveOwned` beside `collectionsElsewhere` answers both.
- **Not Taken at the Gate:** replacing `SETTING_BOUNDS`, the bounded `settingOf`, the write clamp, and the capped picker with a `Math.min` and a hint (ruled at Phase 6A); one `nexusPages` read through a delete (its gather reads before the move and its cascade after — two worlds, proven by two failing tests); the archived reader noticing an outside removal (main classes everything under `.nexus/` outside Contexts as ignored, so no renderer signal exists — the store push below).
