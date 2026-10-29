### Scout 4 — Archive Filing, Layout & Store Shape

**Repo:** `~/The Studio/Projects/Project Pommora` at `15fe7422a`, read-only; cleaned against *Trash & Archive Restructure — Investigation* on 10-28-2026 under Decisions 10 through 14. Decision 10 keeps the Archive's layout, so this report's analysis of dropping the Collection's own folder, its migration, and the tests it would have invalidated are removed. The inventory, the behavior to preserve, and the test notes are this scout's own; every finding is stated once in the Investigation, and this report maps each to it. Corrected claims are marked **Corrected**.

**Grounding Check:** the chain under each Collection-ID folder is frozen at filing while the ID folder tracks the current owner, which yields mixed-epoch paths on a cross-Collection carry (`Core/Archive/refile.test.ts:124`). Under Decision 10 that stays, and the origin path it keeps is what links written before the archive still name.
#### 1. Inventory

##### `Core/Archive/refile.ts` (153 Lines)

| Symbol | Job | Callers |
|---|---|---|
| `refile` (`:34`) | Writes `trail` to a record; on a Collection change it moves the bundle into `to`'s ID folder through `moveIntoStore`. | `refileArchived` `:61`, `settleArchives` `:134` |
| `refileArchived` (`:50`) | For each record within Set `setId` in `from`'s Archive, computes the new trail (`held ?? retrailed(...)`) and refiles it. | `refileLanded` `:85`, `refileFiled` `:96`, `refileMoved` `:115` |
| `carried` (`:66`) | Swallows and logs a carry's failure, leaving the fix to the next open. | the three triggers |
| `refileLanded` (`:75`) | Restore trigger: a Set landed in `dir` carries its archived records out of `from`. | `archive.ts:121` (Archive restore), `Trash/spend.ts:297` (Trash restore) |
| `refileFiled` (`:89`) | Undo trigger: a Set filed back into the Archive on `above`. | `archive.ts:54` only |
| `isContainerNode` (`:98`) | Delta-value guard. | `refileMoved` |
| `refileMoved` (`:102`) | Settle trigger: walks the push delta and finds Sets whose parent id changed. | `Nexus/settle.ts:191` |
| `settleArchives` (`:125`) | Open pass: re-files every record in every live Archive, and moves an orphaned ID folder's bundles into `.trash`. | `Nexus/handlers.ts:98` |

##### `Core/Bundles/bundle.ts` (438 Lines; Domain Part)

| Symbol | Job | Callers |
|---|---|---|
| `chainDir` (`:51`) | `<store dir>/<dirname(rel)>`, flat when the source escapes the root. | `mintBundle` `:70`, `Trash/discard.ts:12` (`trashFileFlat`) |
| `mintBundle` (`:64`) | Creates `<stamp>[__n]__<leaf><suffix>` under the chain, optionally re-asking a leaf for Undo. | `fileInto` `:103`, `Trash/delete.ts:99`, `Properties/deleteProperty.ts:63`, `Testing/fixtures.ts:52` |
| `fileInto` (`:87`) | Files an artifact back at an address, either into its standing folder or into a fresh bundle. | `archive.ts:47`, `spend.ts:198`, `moveIntoStore` `:131` |
| `moveIntoStore` (`:120`) | Moves a bundle between stores, or between ID folders, deriving its origin from the old path. | `refile.ts:45` (cross-Collection carry), `refile.ts:148` (orphan → Trash). **Every caller exists because of the ID level.** |
| `ListedBundle` / `listBundles` (`:135`/`:153`) | Walks a store for suffixed folders with a readable record. | refile, handlers, finishOwed, trashedCopies, `collectionsElsewhere`, `archivedWithin`, `originPagesIn` |
| `archivedWithin` (`:142`) | Records in `from`'s Archive whose origin lies within Set `setId`. | `refileArchived`, `Bundles/handlers.ts:30` (Set's ArchiveView), `Nexus/move.ts:62` (moveSet view edit) |
| `collectionsElsewhere` (`:179`) | Ids of Collections in unheld root folders or in the Trash (disk reads). | `archiveOwned` call sites: `refile.ts:145`, `placement.ts:206`, `finishOwed.ts:395` |
| `archiveOwned` (`:193`) | Whether an Archive's Collection still answers: live, elsewhere, or a root sidecar is unreadable. | Same three call sites. |

##### `Core/Bundles/layout.ts` (64 Lines)

| Symbol | Job | Callers |
|---|---|---|
| `BundleStore` (`:10`) | `{trash} \| {archive, id}`. | Bundles/*, `bridge.ts:199` |
| `layoutOf` (`:12`) | Store → `{dir, suffix}`; the Archive's dir is `archiveDirRel(id)`. | bundle.ts, layout.ts, `placement.ts:212-213`, `rows.ts:49` |
| `fileStamp` / `storedAtOf` / `stampedLeaf` (`:21`/`:25`/`:32`) | Stamp mint, parse, and leaf spelling. | mintBundle, discard, rows (`rows.ts:91,99,168`) |
| `stampedSegment` (`:36`) | The bundle is the segment wearing suffix and stamp. | `bundleAddressOf`, `originPathOf` |
| `bundleAddressOf` (`:40`) | Path → bundle, store (ID read from the path), and inner item. | bundle.ts `:95,:126,:220`, `placement.ts:195`, `Nexus/mutate.ts:151` |
| `originPathOf` (`:59`) | Store path → origin path: the path under the store root with the bundle segment removed. **Pure path function;** 14 production call sites, 11 Archive-capable. | `heldPages.ts:81`, `bundle.ts:130,285,334,387,423,436`, `archive.ts:56,151`, `delete.ts:55,57`, `spend.ts:99,196`, `placement.ts:208` |

##### `Core/Bundles/record.ts` (Domain Part)

| Symbol | Job | Callers |
|---|---|---|
| `trailAbove` (`:152`) | The tree's ids above a container. | `refile.ts:56,132`, `bundle.ts:148`, `record.ts:208` |
| `Origin` / `originOf` (`:157`/`:160`) | `{parent, trail}` of a page or Set record. | archive.ts, refile.ts, bundle.ts, placement.ts, spend.ts, trashedCopies.ts |
| `collectionOf` (`:165`) | `trail[0] ?? parent`. | `refile.ts:140`, `spend.ts:297`, `trashedCopies.ts:57` |
| `originWithin` (`:168`) | Within-Set test, using the held trail or else the stored one. | `archivedWithin` only (one-use) |
| `retrailed` (`:172`) | Splices a live prefix onto the stored tail. | `refile.ts:60`, `placement.ts:220` |
| `RECORD_FILENAME` (`:15`) | `_record.json`; the underscore keeps the walker off it. | record I/O |

##### Other Files

- **`Core/Bundles/placement.ts`:** `archiveFiling` (`:188`) chooses the Archive an Undo files into (the deepest live ancestor's Collection, else the address's), refuses one that isn't owned, re-roots the address across ID folders (`:211-214`), and retrails the record (`:216-225`). Callers: `archive.ts:78` (archive op with `back`) and `placement.ts:250` (a Trash restore whose destination is `archive`).
- **`Core/Paths/names.ts`:** `holdsName` (`:14`) has six callers. `archiveStoreOf` (`:20`) is the ID → store guard, needed because "a sidecar can carry any string as its id" (`Files/sidecar.ts:13-14` reads `id` unvalidated; pinned by `refile.test.ts:132,151` with id `../../Escape`).
- **`Core/Paths/nexusPaths.ts`:** `ARCHIVE_DIR_REL` (`:7`), `ArchiveStore` (`:9`), `archiveDirRel` (`:11`), `archiveSegs` (`:13`; used by `exclusion.ts:71`), `archivedCollectionIdOf` (`:16`; used by `layout.ts:45`, `heldPages.ts:78`, `treePatch.ts:116`), `isArchived` (`:19`; used by matrixGraph, governedSweep, Nexus handlers, `delete.ts:42`).
- **`Core/Nexus/treePatch.ts`:** `owningCollection` (`:110`) has an Archive branch that reads the owner from the ID segment, synchronously (`:116-118`). `archiveReach` (`:122`) is every Archive, or the owner's one ID folder (callers `keyHolders.ts:53`, `configReach.ts:298`).
- **`Core/Archive/archive.ts`:**
  - `archiveOp` (`:33`) → `filingOf` (`:68`; one-use).
  - `restoreArchived` (`:89`).
  - `collectionArchive` (`:139`): a Collection's whole ID folder, with its files, origins, and Set ids. Callers: `Trash/delete.ts:102`, only in system Trash Mode (`!bundle`), which leaves under Decision 14, and `Trash/spend.ts:90` (emptying a Collection).
- **`Core/Archive/archivePlace.ts`:** `ARCHIVE_TITLE` and `ARCHIVE_ICON`, display constants with no "place" in them. Callers: ArchiveView, `Interface/Subfield/crumbs.ts`, `Views/Settings/ViewFrame.tsx`, `Nexus/treeIndex.ts`.
- **Adjacent Readers of the Layout:**
  - `heldPages.ts:73-85` (`nexusPages`: archived pages at origin paths).
  - `heldPages.ts:94` (`archivedPageIds`).
  - `configReach.ts:288` (`archivedSetIds`).
  - `finishOwed.ts:388-401` (`owedEdit`, which scans every ID folder through `archiveOwned`).
  - `rows.ts:48-53` (`frozenCrumbs`, which spells crumbs from the chain).
  - `ArchiveView.tsx:30` (`archiveId`).
  - `Bundles/handlers.ts:13-17` (`storeFrom`).
  - `move.ts:58-68`.

---

#### 2. Findings, as the Investigation Holds Them

- **Three Formulas for a Record's Current Trail, Three Triggers Around One Carry (§2):** confirmed by reading (worked by hand, no test isolates it); M-10.
- **Two Re-Root Computations (§2):** confirmed; they stay, since both serve the ID level Decision 10 keeps.
- **Two De-Collision Loops (§2):** confirmed; the flat discard stays under Decision 11.
- **The Store Notion Split Across Three Files (§2):** confirmed; P-4. **Corrected:** `archiveStoreOf` has seven production callers.
- **Owner-From-Record for the Trash (§2):** confirmed; named in *§The Trash's Model* (the `{ collection }` reach).
- **`refileFiled`, `originWithin`, `archivePlace.ts`, `collectionArchive`, `moveIntoStore` (§3):** confirmed; M-10, P-8, P-3 (under Decision 14 `collectionArchive`'s only caller is the empty).
- **Guards With Real Causes (§4):** confirmed; *§Removal & Consolidation Ledger · What Stays*.
- **The Open Pass's Cost (§4):** confirmed; *§Approaches Worth Weighing*, 8.
- **The Stale Trail Feeding the Archive's `from` (§4):** confirmed by reading; B-6. Uncovered; the next open repairs it.
- **Comments (§4):** `bundle.ts:50` confirmed false for a carried bundle (*§What Becomes False*).
- **Reach-In Implications (§5):** **Corrected:** "`nexusPages` must not add trashed pages to `byId`" holds for `archived` only. `byId` resolves nothing; a reach-in Trash needs trashed pages in it for addressing, and the hazard there is the twin rule (*§The Trash's Model*, condition 3). `resolveRecord`'s `heldElsewhere` concern is that same condition.
- **A · Current-Trail Resolver:** M-10. **B · Baseline-Driven Open Pass:** *§Approaches Worth Weighing*, 8. **C · Store Notion in One Home:** P-4.
- **D · Keep the Collection-ID Level:** confirmed; *§The Store Shape*.
- **E · Two Stores, One Owner:** confirmed; *§The Store Shape*.
- **The Collection's Own Folder (Formerly "Nathan's Ruling"):** Decision 10 keeps it; the findings that only the drop needed are removed, and *§The Store Shape* records why it stays. `originPathOf` has 14 production call sites, 11 of them Archive-capable (**Corrected** from "14" as the Archive's count).
- **The Stamped Bundle Wrapper:** **Corrected** from "still open with Nathan": it isn't an open item in the Decisions; *§The Store Shape* settles it as kept in both stores, under Decision 6.
- **Questions (§9):** the path-link identity and chain-policy questions leave with Decision 10; the migration question leaves with it; the open-pass measurement → *§Approaches Worth Weighing*, 8.
#### 7. Behavior to Preserve

| Behavior | Pinned By |
|---|---|
| A page or Set archives under its Collection's ID with its record (`trail`, `place`, `parent`) | `archive.test.ts:121` |
| What was archived from within a Set follows it to another Collection's Archive, records whole, trails current | `refile.test.ts:111,294,319,336` |
| A rename moves nothing | `refile.test.ts:355` |
| A within-Collection move rewrites trails only | `refile.test.ts:279` |
| Archived Sets carried with a Set keep their own saved views; a moved-out Set takes archived sub-Sets from the views it left | `refile.test.ts:189,217,248` |
| A restore or Undo carries archived records into the landing Collection's Archive | `refile.test.ts:367,382,409`; `archive.test.ts:325-415` |
| An Undo files into the Archive the origin sits in now, on its current trail | `archive.test.ts:656,1043` |
| An Undo whose Archive is gone for good refuses, or records afresh | `archive.test.ts:678,1195` |
| An Archive whose Collection is gone everywhere moves into the Trash, records byte-identical | `refile.test.ts:443` |
| An Archive is kept when its Collection is excluded, hidden, in the Trash, or behind an unreadable root sidecar | `refile.test.ts:460,475,483,490` |
| An unparseable bundle stays as evidence | `refile.test.ts:500` |
| A bad Collection id never names a folder or reaches outside the Archive | `refile.test.ts:132,151`; `archive.test.ts:269` |
| A Collection emptied from the Trash takes its Archive; a Collection delete leaves its Archive in place (the system-mode arm leaves under Decision 14) | `delete.ts:100-108`, `spend.ts:90-107` (no direct test of the latter in my files; *Inferred*) |
| Archived pages stay in every cascade's reach and answer links at their origin paths | `archive.test.ts:139,153,1101-1149` |
| A carry failure never fails its landing (`carried`) | `refile.ts:66` (*no test opened*) |

---

#### 8. Tests

- **Near-Duplicates:**
  - `refile.test.ts:132` and `:151` (same bad-id fixture, two assertions; mergeable).
  - `:189` and `:217`.
  - `archive.test.ts:352/368/388/400`, four Undo-carry variations differing only in source (whole or inner) and destination (Collection or Set). Good candidates for one table-driven case.
  - `archive.test.ts:971` versus `:1016/1028`.
  - `refile.test.ts`'s restore block (`:366-440`) overlaps `archive.test.ts:325-415`.
- **Pinning Implementation:**
  - `layout.test.ts:10` asserts `layoutOf`'s literal return.
  - `refile.test.ts:124,307,512` and `archive.test.ts:124` assert exact chain spellings. Decision 10 keeps that layout, so they stay; the layout *is* the Legibility contract.
  - `bundle.test.ts:46`'s de-collision is behavior; keep it.
- **Fixture Bloat:** `archive.test.ts` (52 `mkdir`/`writeFile` calls), `refile.test.ts` (35), and `bundle.test.ts` (30) each hand-build a similar Notes/Daily/Sub disk tree. `Core/Testing/testTree.ts` builds trees in memory, not on disk. A shared disk-fixture builder in `Core/Testing/` would cut those three files' setup *(Inferred: lines not counted)*.
- **Gap:** No test covers the stale-`from` misfile (B-6) or a path-spelled link naming an archived page across a Collection rename, the property Decision 10 keeps.

---
