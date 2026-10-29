#### Scout 1 • Delete & Record

Read-only pass at HEAD `15fe7422a`, cleaned against *Trash & Archive Restructure — Investigation* on 10-28-2026 under Decisions 10 through 14. The inventory, the behavior to preserve, and the test notes are this scout's own; every finding is stated once in the Investigation, and this report maps each to it. Corrected claims are marked **Corrected**.
#### 1. Inventory

##### Core/Trash/delete.ts (229)

| Symbol | Job | Callers |
|---|---|---|
| `fromArchive` (:41) | Resolves a delete naming an Archive bundle or an inner item of one: opens it, lists its pages at index paths (`under`) and origin paths (`keys`), its Set ids for the view edit, and the record carried on with `archive` added | `deleteOp` :80 |
| `deleteNote` (:63) | Builds a Context's or Space's owed note (`owedDelete` strip + `bundle`) | `deleteOp` :183, :199 |
| `deleteOp` (:76) | The whole delete: resolve, lift set-asides, mint bundle, gather record + `targets`, note, unlist, move, drop order and metadata, finish arm; 5 inner closures (`write`, `unminted`, `outside`, `leave`, `deleted`) and three kind arms | `mutate.ts:134-135`; renderer via `browser.ts:247-253` (`deleteOp: 'delete'` rule) |

##### Core/Trash/gather.ts (141)

| Symbol | Job | Callers |
|---|---|---|
| `pageRelationsOf` (:25) | Page→page relation rows for `paths`: index, else re-extracted from files | `gatherLinkTargets` :53 |
| `gatherLinkTargets` (:35) | `targets`: each outbound link key under `rel` → `{id, path}` of the page it resolves to (live, else archived) | `deleteOp` :111 |
| `rootsOf` (:61) / `partly` (:70) | Holders → member refs; whether any holder lacked id/values | `gatherSpaceRecord`, `buildContextRecord` |
| `gatherSpaceRecord` (:72) | Space record: sidecar id/icon, parent Context by registry title, `place`, members, `partial` | `deleteOp` :174 |
| `ContextEvidence` (:103) / `gatherContextEvidence` (:110) | Registry entry copy, index, Space ids read from disk, `unresolved` | `deleteOp` :193 |
| `buildContextRecord` (:120) | Context record from evidence + holders | `deleteOp` :196 |

##### Core/Trash/discard.ts (47), trashMode.ts (4), handlers.ts (21)

| Symbol | Job | Callers |
|---|---|---|
| `trashFileFlat` (:10) | Renames a file to `.trash/<chain>/<stamp>__<n>__<name>` — no bundle, no record, no suffix | `discardFile` :41; tests in `Files/atomicWrite.test.ts:326-361` |
| `TrashDeps` (:22) / `trashDeps` (:27) | Trash Mode + system-trash function from the host context | 3 handler files; `TrashDeps` declared in 34 test files (**Corrected** from ~35); the mode half leaves under Decision 14 |
| `discardFile` (:36) | Nexus mode → `trashFileFlat`; system mode → `trashToSystem`; then `noteOwn` unlink | `delete.ts:133,135` (system mode only), `finishOwed.ts:266` (system mode only), `tilesFile.ts:156`, `assetMigrate.ts:228` |
| `TrashMode` / `DEFAULT_TRASH_MODE` (trashMode.ts:2,4) | Renderer-safe leaf type + default | `bridge.ts`, `Contract/handlers.ts`, `confirmations.ts`, `Desktop/Config/appConfig.ts` |
| `trashHandlers['delete:facts']` (handlers.ts:9) | Trash Mode + Permanent Delete setting for confirmations | `Contract/serve.ts:24` |

##### Core/Archive/archive.ts (departure half), archivePlace.ts

| Symbol | Job | Callers |
|---|---|---|
| `archiveOp` (:33) | Archive a page/Set: store from owning Collection, `filingOf`, lift, `fileInto`, `dropDeparture`, carry on Undo, departing re-spell when filed under another path | `mutate.ts:138` |
| `filingOf` (:68) | Undo filing (`back`) via `archiveFiling`, else fresh `gatherContentRecord` | `archiveOp` :44 |
| `collectionArchive` (:139) | A Collection's Archive folder, files, origin paths, Set ids — the "leaves for good" set | `delete.ts:102`, `spend.ts:90` (both Trash-side; no Archive caller) |
| `ARCHIVE_TITLE` / `ARCHIVE_ICON` (archivePlace.ts) | Display constants | renderer crumbs, ViewFrame, treeIndex |

##### Core/Bundles/record.ts (221)

| Symbol | Job | Callers |
|---|---|---|
| `RECORD_FILENAME` (:15) | `_record.json` | internal |
| `parentRef`, `memberRoot`, `spaceRef`, `strippedLink`/`StrippedLink`, `linkTargets`, `place`/`Place`, `contentRecord`, `recordFile`/`RecordFile`, `ArtifactRecord`, `RawRecord` | The schema | see §1 field table below |
| `recordedPartly` (:102) | Restore warning for a `partial` record | `restoreProperty.ts:85`, `spend.ts:292` |
| `writeRecord` / `readRawRecord` / `decodeRecord` / `readRecord` / `patchRecord` (:117-142) | I/O | delete, deleteProperty, bundle, refile, finishOwed :405, trashedCopies :19, archive :75 |
| `placeOf` (:144) | `{above, below}` sibling ids | `gatherContentRecord`, `gatherSpaceRecord` |
| `trailAbove` (:152) | Container ids above a container | record, bundle :148, refile :56,:132 |
| `originOf` / `collectionOf` / `originWithin` / `retrailed` (:160-175) | Origin math on `parent`+`trail` | archive, refile, placement, spend, trashedCopies, bundle |
| `identityOf` (:178) | Page stamped id or container sidecar id+icon from disk | `gatherContentRecord`, `innerRecord` |
| `gatherContentRecord` (:187) | Page/Set/Collection record: id, icon, parent, place, trail | `delete.ts:207`, `archive.ts:85` |

##### Core/Bundles/bundle.ts (minting and filing half)

| Symbol | Job | Callers |
|---|---|---|
| `chainDir` (:51) | `mkdir` of the mirrored chain in a store | `mintBundle`, `trashFileFlat` |
| `mintBundle` (:64) | Atomic `mkdir` of `<stamp>__[n__]<leaf><suffix>`, optionally asking a name back | `delete.ts:99`, `deleteProperty.ts:63`, `fileInto` :103, test fixtures |
| `fileInto` (:87) | File an artifact back at an address (into an existing folder) or into a fresh bundle: mint → write record → move, bundle removed on throw | `archive.ts:47`, `spend.ts:198`, `moveIntoStore` :131 |
| `moveIntoStore` (:120) | Bundle → another store with raw record + extra | `refile.ts:45,148` |
| `contentPages` (:395) / `pageIdsOf` (:411) | Markdown files of an artifact; their stamped ids | delete, archive, spend, finishOwed, restoreScrub, trashedCopies |

##### What leaves with the item

| Symbol | Job | Callers |
|---|---|---|
| `liftSetAside` (`folderEntity.ts:53`) | Excluded folders / asset dir inside a leaving container stay live, lifted to the parent; returns `rollback` | `delete.ts:91`, `archive.ts:45` |
| `dropDeparture` (`reorder.ts:78`) | Drops the item's id from the order it sat in (Context: nothing) | delete :137, archive :51, move :38,:72 |
| `dropPageMetadata` (`pageMetadata.ts:119`) | Drops metadata shard entries for ids no live file holds | delete :138 (system mode only), `spend.ts:108`, `exclusionScan.ts:85` |
| `goneContainers` (`configReach.ts:248`) | `{kind:'gone', propertyId: location, ids}` | goneEdit, delete :58, spend :102 |
| `goneEdit` (`configReach.ts:254`) | Container + its sub-Sets (+ archived Sets) as a gone edit | delete :104, move :68 |
| `archivedSetIds` (`configReach.ts:288`) | Set ids from sidecars on disk under a folder | delete :51, archive :152, finishOwed :397, move :65 |
| `mutate.ts:132-138` | `delete` under Contexts lock for space/context, settle turn for all; `archive` settle turn only | dispatch |
| `deleteProperty.ts` `snapshot` (:38) | Property record + mint + write | `deleteInner` :101 |
| `propertyHolders` (:77) | Counts the files a property delete would sweep | `Properties/handlers.ts:18` |
| `deleteKeys` (:86) | Every key the property still owes plus its current one | `propertyHolders`, `deleteInner` |
| `deleteProperty` / `deleteInner` (:89, :93) | The property delete under the schema lock: snapshot bundle, note, unlist, strip; removes the bundle on refusal | `mutate.ts:318` |
| `DeletePlan` / `deletePlan` (:116, :121) | Holders + the strip rewrite | `propertyHolders`, `deleteInner`, `finishOwed.ts:180` |
| `stripProperty` (:131) | Sweeps holders, unassigns and purges from every Collection, runs the view pass | `deleteInner` :106, `finishOwed.ts:185` |
| `unassignAndPurge` (:148) | Drops the assignment and stash from one Collection sidecar | `stripProperty` |

##### Record Fields: Writer → Reader

| Field | Written by | Read by | Verdict |
|---|---|---|---|
| `entity` | all builders | everyone | — |
| `id` (content) | `gatherContentRecord` :211, `innerRecord` :266 | placement id-live, rows `stored`, refile, trashedHolders, collectionsElsewhere | Cache of the file's own id; earns its place (listing reads no artifact) |
| `icon` (container/space) | `gatherContentRecord`, `gatherSpaceRecord` :95, `innerRecord` | `rows.ts:133` only | Copy of the artifact's own sidecar icon, read for one display field |
| `parent` | all artifact builders | placement, rows, `originOf`, spend :178 | — |
| `place` | `gatherContentRecord` :218, `gatherSpaceRecord` :97 | `placement.ts:280` (`slotOf`) | Contexts use `at` instead (see §2.4) |
| `trail` | `gatherContentRecord` :219, `innerRecord`, refile carry | `originOf`, `trailWithin`, refile, archiveFiling | — |
| `archive` | `fromArchive` :59 only | `placement.ts:248-250` only (the `{kind:'archive'}` Undo destination); stripped at `spend.ts:197` | Persisted forever for a toast-lived Undo (§4.6) |
| `links` | `finishOwed.ts:405`, `parkLinks` :19, spent at `bundle.ts:378` | spend restore :267, `keptLinksUnder`, emptyBundle :111 | — |
| `targets` | `deleteOp` :116 (all kinds), `innerRecord` :270 | `spend.ts:154` only | Exists because the Trash isn't reach-in (§5) |
| `partial` (page/set/collection) | **nobody** | `rows.ts:147`, `recordedPartly`, stripped at `spend.ts:197`, copied at `bundle.ts:271` | Compatibility-only; leaves under Decision 12 |
| `partial` (space/context/property) | `gather.ts:99,139`, `deleteProperty.ts:72` | rows, `recordedPartly` | — |
| `members` (space) | `gather.ts:98` | `spend.ts:258` | — |
| `registry`, `at`, `membership` (context) | `buildContextRecord` | spend :189, :245 | `at` leaves for `place` (Decision 13) |
| property `def`/`values`/`above`/`assignments`/`stashes` | `snapshot` | `restoreProperty`, rows, emptyBundle | — |

#### 2. Findings, as the Investigation Holds Them

- **Two Hand-Written Departures and Three Mint Sites (§2.1):** confirmed; M-1 (one mint-and-record primitive), with the note-ordering constraint that blocks delete calling `fileInto` whole.
- **Two Archive → Trash Moves (§2.2):** confirmed as mechanics written twice with different semantics (orphan sweep vs. user delete); no ledger item, since the strip is earned.
- **Three Container-Note Builders (§2.3):** confirmed; M-6.
- **Three Ways to Remember Sibling Position (§2.4):** confirmed; settled by Decision 13 and mapped in L-3. **Corrected:** the "panel id" is the Property Panel's Context field order in `state.json`, not the sidebar's, which is the registry's order (*§What's True · Two Orders of Contexts*).
- **Records Re-Reading Disk for What `before` Holds (§2.5):** confirmed; M-4. Whether an unusable Space sidecar reaches `tree.unreadable` stays unverified.
- **Two Stamp-Naming Loops (§2.6):** confirmed; the flat discard stays under Decision 11, so the shared allocator is a small optional merge.
- **Two System-Trash Disposers (§2.7):** confirmed; under Decision 14 `discardFile` loses its system arm, so they no longer overlap (M-8).
- **Undo Carried Two Ways (§2.8, §4.6):** confirmed; M-13 and L-9.
- **Context Evidence Split, Record Builders by Store, `collectionArchive`'s Home, `deleteOp`'s Arms (§3):** confirmed; M-4, P-3, M-2. `trashMode.ts` as a renderer-safe leaf is moot under Decision 14, which removes it (L-1).
- **Writerless Content `partial` (§4.1):** confirmed; L-4 under Decision 12.
- **`at: index.optional()` (§4.2):** settled by Decisions 12 and 13; `at` leaves entirely (L-3, L-4). Existing Context records still decode and restore at the end of the sidebar order.
- **The Empty-Bundle Leak (§4.3):** confirmed; B-1, which also covers the property delete's `snapshot`.
- **Guards After the Mint (§4.4):** confirmed; the Space guard is a ghost (L-7); the Context guard is a cross-source check that can fire.
- **Flat Trash as a Second, Unlisted Trash (§4.5):** confirmed; settled by Decision 11 (stays invisible).
- **Smaller Items (§4.7):** confirmed; *§What Becomes False*.
- **Reach-In Implications (§5):** confirmed and carried into *§The Trash's Model*, including the `addressable` gate needing trashed ids in `byId`.
- **Proposals (§6):** 6.1 → M-1; 6.2 → M-2; 6.3 → M-4; 6.4 → L-4; 6.5 → M-6; 6.6 → settled by Decision 11; 6.7 → Decision 13 (L-3); 6.8 → M-13; 6.9 → P-9.
- **Questions (§9):** 1 → *§The Trash's Model*; 2 → its ledger's Holders row; 3 → Decision 11; 4 → Decision 13; 5 → B-1; 6 → *§What Becomes False*; 7 → I-077 and I-069 in *§What Becomes False · Issues*.
#### 7. Behavior to Preserve

| Behavior / Invariant | Pinned By |
|---|---|
| The record lands before the artifact moves; for Space/Context, before the strip as well | `deleteOrder.test.ts:149-216` |
| The strip and the configuration pass run after the move | `deleteOrder.test.ts:230-257` |
| A move that throws deletes nothing and leaves no bundle; a refused note or list step removes the bundle and rolls back the lift | `deleteOrder.test.ts:289-303`, `deleteReach.test.ts:566-636`, `archive.test.ts:184-242,283` |
| A move that throws after `moved` rethrows (`delete.ts:155`); a Context entry that can't go back stays owed and Try Again moves its folder | `deleteReach.test.ts:578,608,652` |
| A crash between note and strip or move finishes at the next open | `deleteReach.test.ts:808-895` |
| System mode mints nothing, drops metadata, and still strips and runs the pass (**Leaves** under Decision 14) | `deleteOrder.test.ts:218`, `deleteReach.test.ts:329,443-488`, `archive.test.ts:919` |
| A Collection delete leaves its Archive owned, and emptying it takes the Archive (the system-mode arm leaves under Decision 14) | `deleteReach.test.ts:458-488`; `spend.test.ts:1894+` |
| A Space/Context delete holds the Contexts lock; an Archive restore doesn't | `mutate.ts:133-135,151-153`, `archive.test.ts:735` |
| `bundled.bundlePath` drives Undo; a delete from the Archive is undone into the Archive under the same name, its Link values back | `archive.test.ts:938-1094` |
| Archive Undo through `back` (address, name, record); step-aside naming; a fresh stamp when the name is taken | `archive.test.ts:245,473-656,1067-1082` |
| A page waits out a save in flight before trashing | `deleteOrder.test.ts:305` |
| `place` restores between siblings | `spend.test.ts:212-297`; the Context-order cases at `:298-349` change under Decision 13 (L-3) |
| Records stay stable under Finder litter and colliding stamps | `spend.test.ts:567-684` |
| Excluded folders lift out and come back on rollback | `archive.test.ts:166-242` |
| Two linkers sharing one ID are left untouched | `deleteReach.test.ts:133` |

#### 8. Tests

- **Duplicated:** `deleteOrder.test.ts:149` and `:159` run the same page delete and inspect the same `atSettle` (one asserts id and parent, the other the post-strip `links`); they could merge into one case. `spend.test.ts:124-260` and `deleteOrder.test.ts:148-216` both assert page/Space/Context record shape (content vs. timing; partial overlap).
- **Pinning residue:** absence of content `partial` (`deleteOrder.test.ts:168,174,215`; `deleteReach.test.ts:800`), the pre-`at` decode (`spend.test.ts:313`), and the retired `.provenance.json` format (`spend.test.ts:684`).
- **Pinning implementation:**
  - `deleteOrder.test.ts:43-95` observes ordering through four `vi.mock`s of named collaborators (`relocate`, `deleteCascade`, `unlinkSpaceValue`/`unlinkContextKey`, `reachConfig`). Renaming or merging any of them breaks the harness without breaking the behavior. Write-ahead is the behavior; a seam at `relocate` alone would pin it.
  - `spend.test.ts:390` round-trips `writeRecord`/`readRecord`.
- **Misfiled:**
  - Delete-record tests sit in the restore suite (`spend.test.ts:123-700`, about 30 cases).
  - A delete test sits inside the archive describe (`archive.test.ts:227`).
  - `trashFileFlat`'s tests sit in `Files/atomicWrite.test.ts:326-361`.
- **Fixture bloat:** `TrashDeps` declared in 34 files (`git grep "trashMode: 'nexus'"`; **Corrected** from about 33).
