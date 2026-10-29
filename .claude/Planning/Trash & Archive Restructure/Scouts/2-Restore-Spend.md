### Scout 2 — Restore & Spend

**HEAD:** `15fe7422a` on `active`, read-only; cleaned against *Trash & Archive Restructure — Investigation* on 10-28-2026 under Decisions 10 through 14. The inventory, the traced Undo paths, the behavior to preserve, and the test notes are this scout's own; every finding is stated once in the Investigation, and this report maps each to it. Corrected claims are marked **Corrected**.

**Grounding Check:** the three corrections hold: the two restores are one restore with record-driven arms (M-3); the delete-from-Archive Undo is a third path through `restoreTrashed` (*§What's True · A Third Path*); a partial re-tag's kept record is unreachable litter (L-5).
#### 1. Inventory

##### `Core/Trash/spend.ts` (317)

| Item | Job | Callers |
|---|---|---|
| `emptyBundle` (:60-114) | Gives a Trash bundle up for good. The property arm notes the key and runs its finish under the schema lock. Otherwise it notes a `container` strip (park: true), disposes the artifact and a Collection's Archive, drops metadata and Context order, spends the bundle, parks the record's links, and finishes | `Core/Nexus/mutate.ts:159` |
| `dispose` (local, :70-75) | recordWrite → remove-or-system-trash → `noteOwn` unlink | `emptyBundle` only |
| `Restored` type, `restored()` (:116-118) | Reply shape, `unrestored` only when non-empty | `restoreTrashed` |
| `restoreTrashed` (:120-303) | Full Trash restore: property arm, placement, scrub, park, landing refusal, Context registry entry, move or `fileInto`, `restoreNote`, order, `returningCascade` with repair and rekey, membership re-apply, Link refill (live and trashed), owed work, spend, refile | `mutate.ts:149` |
| `reapply` (:306-317) | Re-adds a Context key with Space titles to roots by id, returning the ids that didn't take it | `restoreTrashed` (:253, :263) |

##### `Core/Trash/restoreScrub.ts` (233)

| Item | Job | Callers |
|---|---|---|
| `Match` type, `matchOf` (:43-58) | Current key for a returning word, matched exactly or by any format's case-folded spelling, and ambiguous → none | `currentKeys` |
| `currentKeys` (:60-126) | Builds the `text`/`json`/`words` rewriters that move held keys, Context keys, and option and Space words onto their current spellings | `scrubReturning` |
| `artifactFiles` (:129-138) | An artifact's pages plus the Space sidecars under it | `scrubReturning`, `repairLanded` |
| `scrubReturning` (:141-215) | Rewrites the returning copy in place, inside the bundle, against the current world. It answers the dropped gone Links (`dropped`), what it worked out for files it couldn't write (`worked`), and the files it couldn't read (`unread`) | `spend.ts:162` |
| `repairLanded` (:218-233) | Writes the relink note that re-spells the landed files' own links (`repair`) and re-keys a renamed Context's Spaces; the note's finish does the sweep | `Core/Nexus/settle.ts:338` (both restores) |

##### `Core/Trash/restoreProperty.ts` (94)

| Item | Job | Callers |
|---|---|---|
| `PropertyRecord`, `RestoredProperty` (:21-29) | Types | local |
| `restoreProperty` (:31-36) | Wraps `restoreInner` in `serializeSchemaOp` | `spend.ts:128` |
| `restoreInner` (:38-94) | Rebuilds the definition, `restoreNote`, stashes back, re-assigns, filters values (dropping gone Links into `dropped`), refills, and names misses | `restoreProperty` |

##### `Core/Trash/trashedCopies.ts` (118, read as adjacency)

| Item | Job | Callers |
|---|---|---|
| `appendLinks` (:18-21) | Appends `links` to a bundle record | `parkLinks` |
| `frozenWorld` (:23-33) | The `Frozen` predicate over a `PageIndex`; a key in `targets` answers by id | `spend.ts:156,272`, `restoreProperty.ts:70`, `Properties/assignment.ts:62` (four sites, three without `targets`) |
| `parkLinks` (:36-45) | Parks each Link value with the trashed page it names, walking the whole Trash (`originPagesIn`) on every call | `spend.ts:112,131,171`, `finishOwed.ts:408`, `assignment.ts:74` |
| `trashedHolders` (:48-80) | Where the Trash holds each id: walks every bundle and reads every container page's ID | `refillTrashed`, `assignment.ts:51` |
| `refillTrashed` (:83-118) | Refills Link values into trashed copies and answers the owed work for the ones it couldn't write | `spend.ts:287` |

##### `Core/Archive/archive.ts` (restore half)

| Item | Job | Callers |
|---|---|---|
| `restoreArchived` (:89-136) | Placement, then a plain move, order, spend, `returningCascade`, refile; the reply carries the `archive` Undo | `mutate.ts:148` |
| `filingOf` (:68-86) | An archive's filing: back at `back.at` through `archiveFiling`, or fresh | `archiveOp` (:44), for the restore's Undo |
| `collectionArchive` (:139-154) | A Collection's Archive folder, files, origins, and Set ids | `spend.ts:90`, `Trash/delete.ts:102`; Trash-only callers |

##### `Core/Bundles/placement.ts` (283)

| Item | Job | Callers |
|---|---|---|
| `Placement`, `SiblingOrder`, `Refusal`, `Resolution` (:21-36) | Types | local |
| `heldElsewhere` (:39-40) | An id is live unless its holder sits inside the restoring bundle; a twin (null) always is | `resolveRecord`, `placeRecord` archive arm |
| `resolveRecord` (:43-118) | The tree-side decision: final names, siblings, or a typed refusal | `placeRecord`, `Core/Bundles/rows.ts:134` (`homeResolves`) |
| `REFUSAL_TEXT`, `NO_DESTINATION` (:120-127) | Refusal copy | `placeRecord`, `archiveFiling`, `spend.ts:127` |
| `withDestination` (:129-150) | Re-parents a record to a picked destination and drops its place | `placeRecord` |
| `slotOf` (:152-159) | Anchor and slot from `place` among live ids | `placeRecord` only; exported for `placement.test.ts:271` |
| `freeOnDisk` (:162-185) | Steps the tree's free name past what the disk holds | `placeRecord` |
| `archiveFiling` (:188-227) | Where a page or Set files back into an Archive at an address: re-rooted to the Collection its origin sits in now, re-trailed, refused when the Collection is gone for good | `placeRecord` (delete-from-Archive Undo), `archive.ts:78` (restore's Undo) |
| `placeRecord` (:229-283) | The archive arm, or destination → resolve → disk step → `landedAs` → `writeOrder` | `spend.ts:141`, `archive.ts:99` |

##### `Core/Bundles/bundle.ts` (my functions)

| Item | Job | Callers |
|---|---|---|
| `OpenBundle` (:206-209) | The opened bundle; `inner: true` carries the item as its artifact | throughout |
| `readBundleAt` (:219-235) | Address → bundle, store, record, artifact, and inner item | `openBundle`, `listInner` |
| `trailWithin` (:238-254) | Container ids above a folder inside a bundle | `openBundle`, `listInner` |
| `innerRecord` (:257-273) | An inner item's derived record, carrying the bundle's `targets` and `partial` | `openBundle`, `listInner` |
| `keptLinksUnder` (:276-290) | The bundle's `links` whose page sits under the item | `openBundle` |
| `openBundle` (:292-307) | The one open for restore, empty, and Archive delete | `mutate.ts:145`, `Trash/delete.ts:45`, `spend.ts:65` |
| `listInner` (:319-367) | One level of a container bundle's items | `Core/Bundles/handlers.ts:43` |
| `spendBundle` (:370-393) | Removes the whole bundle, or the inner item's share (links, plus its pages off the owed strip) | `spend.ts:110,133,295`, `archive.ts:115`, `delete.ts:136` |
| `contentPages` (:395-408) | An artifact's Markdown pages by entity | 10+ sites (grep `contentPages`) |
| `pageIdsOf` (:411-414) | Stamped ids of files | `spend.ts:92`, `delete.ts:108` |
| `originPagesIn` (:417-426) | Every stored page at its origin, with its bundle as its id | `parkLinks` only |
| `originPagesOf` (:429-438) | One bundle's pages at their origin, with their own ids | `spend.ts:153`, `archive.ts:60,111` |
| `fileInto` (:87-117) | Files an artifact back at an address: re-nests it, or mints a bundle with the record written ahead | `archiveOp`, `spend.ts:198`, `moveIntoStore` |

##### `Core/Nexus/settle.ts` (arrival half)

| Item | Job | Callers |
|---|---|---|
| `relink` (:274-291) | A move's re-spell | `mutate.ts:106`, `payOutsideMoves` |
| `respell` (:294-303) | Follows relinks and writes the relink note | `relink`, `returningCascade`, `departingCascade` |
| `returningNames` (:306-316) | The live-collision map plus the returning pages' own map | `returningCascade` (exported; test-only otherwise, inferred from grep) |
| `returningCascade` (:319-353) | Settles the index, `repairLanded`, then sweeps live collisions; answers `after` and `own` | `spend.ts:214`, `archive.ts:117` |
| `departingCascade` (:356-375) | The archive's re-spell when filed under another path | `archive.ts:57` |

##### `Core/Nexus/governedSweep.ts` (as the restores call it)

| Item | Job | Callers |
|---|---|---|
| `sweepRootsById` (:119-144) | By-id rewrite over a `RootsById` map, answering `taken` and `skipped` | `refillValues`, `spend.ts:313` |
| `refillOf` (:147-156) | Lands a value where the root reads blank; null for a gone Link | `refillValues`, `refillTrashed` |
| `refillValues` (:159-168) | `sweepRootsById` with `refillOf` | `spend.ts:280`, `restoreProperty.ts:84`, `assignment.ts:73` |

##### Undo Paths (Traced)

- **A Delete's Undo:** `offerDeleted` → `offerUndo` → `restore {bundlePath}` (`Core/Interface/Confirm/confirmations.ts:54-68,113-124`) → `restoreTrashed`.
- **An Archive's Undo:** `confirmArchive` → `offerUndo` → `restore` of the Archive bundle (`confirmations.ts:144`) → `restoreArchived`. That reply's own `undo` is dropped.
- **A Restore's Undo:** Archive only. `restoreArchived` answers `undo: {op:'archive', back:{at,name,record}}` (`archive.ts:125-134`); the browser's `rearchive` re-sends it by id (`browser.ts:152-169`) → `archiveOp` → `filingOf` → `archiveFiling` → `fileInto`, plus `refileFiled` for a Set (`archive.ts:53-54`). A Trash restore offers no Undo (`browser.ts:244-249` sets no `restoreUndo`).
- **The Delete-from-Archive's Undo:** `requestOf(row,'delete')` → `deleteOp`/`fromArchive` writes `record.archive` (`delete.ts:41-60`) → `offerDeleted(..., ARCHIVE_UNDO)` (`browser.ts:407`) → `restore {destination:{kind:'archive'}}` → `restoreTrashed` → `placeRecord`'s archive arm (`placement.ts:247-264`) → `into` branch → `fileInto` (`spend.ts:195-198`). A plain restore of the same bundle lands it in the tree at origin (`archive.test.ts:1094`).

---

#### 2. Findings, as the Investigation Holds Them

- **The Restore Prelude Written Twice (§2.1) and the Step Map (§3.1):** confirmed; M-3. `restoreArchived`'s store test is redundant after `mutate.ts:147`; its entity and artifact tests are not (L-7).
- **Two "File Back Into the Archive" Paths (§2.2, §3.2):** confirmed for name, record, and re-spell; the missing Set carry on the delete-from-Archive Undo stays **unverified**.
- **`appendLinks` Twice (§2.3):** confirmed; M-5.
- **`dispose` and `discardFile` (§2.4):** confirmed; under Decision 14 they stop overlapping (M-8).
- **"Gone for Good" Twice (§2.5):** confirmed; under Decision 14 the delete's copy leaves and the empty is its one home (M-7, with B-5's ordering).
- **The Gone-Link Partition Twice, and the Double Check (§2.6, §4.3):** confirmed; M-12.
- **`frozenWorld(linkWorld(...))` Built Repeatedly (§2.7):** confirmed; M-12. **Corrected:** four call sites, three passing no `targets` (`spend.ts:156,272`, `restoreProperty.ts:70`, `assignment.ts:62`).
- **The Refile `from` Two Ways (§2.8):** confirmed; the Trash's is stale, B-6.
- **Store Resolved Twice per Restore (§2.9):** confirmed; M-3.
- **The Lock Chosen by Store (§3.3):** **Corrected:** the Contexts lock earns itself today for every scrubbed entity, since the scrub rewrites `<Title>` keys and Space words against `tree.contexts` (`settle.ts:249`); choosing it by entity holds once the scrub's key moves leave (*§The Trash's Model*, condition 8).
- **Trash Code Owning Shared Steps (§3.4):** confirmed; P-1, P-2, P-3.
- **The Property Restore Split, the "Spend" Name Collision (§3.5, §3.6):** confirmed; M-3.
- **The Kept Record on a Partial Re-Tag (§4.1):** confirmed; L-5.
- **Test-Only Exports (§4.4, §4.5):** confirmed; L-8.
- **Misdescribing Comments (§4.6), Two Reply Shapes (§4.7), `emptyBundle` Outside `runNoted` (§4.8):** confirmed; *§What Becomes False* and M-3.
- **Reach-In Implications (§5):** confirmed and carried into *§The Trash's Model*. **Corrected:** `outsideArchive` and `isArchived` have four production uses each, not seven and four.
- **Proposals (§6):** 1 → M-3; 2 → *§What's True · A Third Path* and M-13; 3 → L-5; 4 → P-1, P-2; 5 → M-7, M-8; 6 → M-5, M-12; 7 → L-8; 8 → M-3.
- **Questions (§9):** twin ids → *§The Trash's Model*, condition 3; the scrub's normalization → condition 9; spend order → M-3; Undo symmetry stays out (feature-level); I-064 and I-065 → *§Questions for Nathan*; the destination-schema asymmetry → *§Approaches Worth Weighing*, 2.
#### 7. Behavior to Preserve (and What Pins It)

- **Write-ahead.**
  - A Context's registry entry lands before its folder moves, and a failed move rolls it back (`spend.ts:172,186-207`), pinned by `spend.test.ts:1412`.
  - `fileInto` writes the record ahead and removes a ghost bundle on a failed move (`bundle.ts:109-115`), pinned by `archive.test.ts:1082,283`.
  - Empty disposes the artifact before the bundle (`spend.ts:59`), pinned by `spend.test.ts:2040,2058`.
  - Placement refuses before any write, pinned by `spend.test.ts:881,893` and `archive.test.ts:699`.
- **Try Again.**
  - Scrub-failed files are owed (`restoreScrub.test.ts:173,191`).
  - A trashed-copy refill miss is owed (`restoreScrub.test.ts:202`).
  - `repairLanded`'s relink note, and `linksNotUpdated` when the index can't settle (`spend.test.ts:1349`).
  - The empty's owed note (`spend.test.ts:1850,1860`; `trashRecovery.test.ts:1050`).
  - H-4 `restoreNote` (`spend.test.ts:2532`).
- **Undo.**
  - A delete's Undo (`archive.test.ts:938` and the others under that describe).
  - An Archive restore's Undo, by id, following a rename (`archive.test.ts:473-640`).
  - The delete-from-Archive Undo into its bundle or a fresh stamp, re-rooted and re-trailed (`archive.test.ts:938-1223`).
  - `spendUndo` arming from either store (`confirmations.ts:47-68`).
  - A Trash restore offers none.
- **Step-aside naming.**
  - The tree's free name, stepped past the disk (`placement.test.ts:347-431`, `spend.test.ts:1463-1556`).
  - `landedAs` (`spend.test.ts:1495,1510`).
  - A Context's final title applies everywhere, with its Spaces re-keyed (`spend.test.ts:1431,1681`).
  - An Archive Undo files back under its own name (`archive.test.ts:513,630`).
- **Identity and homes.**
  - `id-live` outranks everything, and an id only inside the restoring bundle isn't live (`placement.test.ts:148-186`).
  - Typed refusals, `homeResolves`, destinations, `NO_DESTINATION` (`spend.test.ts:2077-2337`).
  - Place between neighbours (`trashRecovery.test.ts:143-224`).
- **Links.**
  - Stripped values come back, under the landed title, where the holder holds none, and with the setting off they stay removed (`trashRecovery.test.ts:427-884`).
  - Parking, including the namesake hand-off on empty (`trashRecovery.test.ts:661-790`).
  - A twin linker is named and not written (`spend.test.ts:1148`).
- **Inner items.** The share is spent with links and strip (`bundle.test.ts:333-372`), and the container's later restore writes nothing twice (`trashRecovery.test.ts:939`). I-077's empty-row decision lands in `spendBundle`'s inner arm.
- **Archived records carried with a landed Set** (`archive.test.ts:325-400`; `trashRecovery.test.ts:961`).
- **Locks.** An Archive restore takes no Contexts lock (`archive.test.ts:735`); this extends to Trash pages, Sets, and Collections only once nothing in their restore rewrites Context keys (**Corrected**, §2 above).

---

#### 8. Tests

- **Misplaced:** `spend.test.ts:123-700` (about 580 lines: "the bundle — one folder per deletion", "records the page each outbound link named", "a property bundle", "listBundles") tests delete and gather recording and `listBundles`, not restore or spend. `listBundles` is tested in both `spend.test.ts:588` and `bundle.test.ts:79`.
- **Duplicated cases:**
  - Emptying: `trashRecovery.test.ts:398` ≡ `spend.test.ts:1705`+`:1723`.
  - Renamed parent: `trashRecovery.test.ts:241` ≈ `spend.test.ts:702` ≈ `placement.test.ts:82`.
  - Homeless destinations: `trashRecovery.test.ts:281` overlaps `spend.test.ts:2077-2174`.
  - Place recording and landing: `spend.test.ts:212-269` + `trashRecovery.test.ts:143-224` + `placement.test.ts:299`.
  - `slotOf`: tested directly (`placement.test.ts:271`) and through `placeRecord`.
- **Pinning residue:** `spend.test.ts:796-825` pins the unreadable kept record (§4.1).
- **Pinning implementation:** `bundle.test.ts:345-372` asserts record and note patches directly; a behavior pin already exists at `trashRecovery.test.ts:928-951`.
- **Fixture bloat:** every file hand-rolls its own bundle finder and order readers: `onlyBundle`/`lastBundle`/`bundleDirs` (`spend.test.ts:57-79`), `rows`/`find`/`del`/`restoreRow`/`stateOrder` (`trashRecovery.test.ts:39-70`), `onlyBundlePath` (`restoreProperty.test.ts:80`), and `archive`/`trash` (`archive.test.ts:71,799`); `stateOrder` is defined in both `spend.test.ts:271` and `trashRecovery.test.ts:63`. A single `Core/Testing` bundle helper would serve them all; its placement goes to Nathan.
- **Under reach-in:** most of `restoreScrub.test.ts` (828) and `spend.test.ts:1028-1410` (link-follow via `targets`) test frozen-model behavior, which would either leave or be re-expressed as cascade-reaches-Trash tests mirroring `archive.test.ts:139-153`.

---
