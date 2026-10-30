### Scout 2 — Restore, Empty, and the Hand-Moved Page

**HEAD:** `776f3ea94` on `active`, read-only; cleaned against *Trash & Archive Restructure — Investigation* on 10-29-2026 under Decision B-1 through 37. The inventory, the traced Undo paths, the one restore's steps, the recognition design, the behavior to preserve, and the test notes are this scout's own; every finding is stated once in the Investigation, and this report maps each to it.

**What Moved Since `15fe7422a`:** no production file in this domain changed (`spend.ts`, `restoreScrub.ts`, `trashedCopies.ts`, `restoreProperty.ts`, `archive.ts`, `placement.ts`, `bundle.ts` hold line for line). The code it calls did: the restore's routing is `mutate.ts:144-157` (the Trash arm `inContextsTurn` at `:156`, `openBundle` at `:148`, `bundleAddressOf` at `:154`, the exemption's comment at `:143`, the empty at `:159-163`); in `settle.ts`, `underContexts`' rationale is `:250`, `relink` `:279-296`, `returningNames` `:311-321`, `returningCascade` `:324-358` with `repair` at `:333,343`, `departingCascade` `:361-380`, and `payOutsideMoves` `:390-424`; in `governedSweep.ts`, `sweepGovernedRoots` runs through `rewriteHeld` (`:64-77`), `sweepRootsById` is `:96-121`, `refillOf` `:124-133`, and `refillValues` `:136-145`. Test offsets: `spend.test.ts` +1 past `:115`; `trashRecovery.test.ts` +1 past `:134`; `restoreScrub.test.ts` −10 past `:23`, −9 past `:109`, −8 past `:189`; `archive.test.ts` unchanged. Restore and empty tests fail landings with `failLandings`.

#### 1. Inventory

##### `Core/Trash/spend.ts` (317)

| Item | Job | Callers |
|---|---|---|
| `emptyBundle` (:60-114) | Gives a Trash bundle up for good. The property arm notes the key and runs its finish under the schema lock (:76-87); otherwise it notes a `container` strip (`park: true`), disposes the artifact and a Collection's Archive, drops metadata and Context order, spends the bundle, parks the record's links, and finishes | `mutate.ts:159-163` |
| `dispose` (local, :70-75) | `recordWrite` → remove or system-trash → `noteOwn` unlink | `emptyBundle` only |
| `Restored`, `restored()` (:116-118) | Reply shape, `unrestored` only when non-empty | `restoreTrashed` |
| `restoreTrashed` (:120-303) | Full Trash restore: property arm, placement, scrub, park, landing refusal, Context registry entry, move or `fileInto`, `restoreNote`, order, `returningCascade` with repair and rekey, membership re-apply, Link refill (live and trashed), owed work, spend, refile | `mutate.ts:156` |
| `reapply` (:306-317) | Re-adds a Context key with Space titles to roots by id, answering the ids that didn't take it | `restoreTrashed` (:253, :263) |

##### `Core/Trash/restoreScrub.ts` (233)

| Item | Job | Callers |
|---|---|---|
| `matchOf` (:43-58) | Current key for a returning word, matched exactly or by any format's case-folded spelling; ambiguous → none | `currentKeys` |
| `currentKeys` (:60-126) | The `text`/`json`/`words` rewriters that move held keys, Context keys, and option and Space words onto current spellings | `scrubReturning` |
| `artifactFiles` (:129-138) | An artifact's pages plus the Space sidecars under it | `scrubReturning`, `repairLanded` |
| `scrubReturning` (:141-215) | Rewrites the returning copy inside the bundle against the current world, answering `dropped`, `worked`, and `unread`; re-parses with `splitFrontmatter` (:104,172,197) and `renameFrontmatterKey` (:105), ignoring the sweep's `page`; mints an ID for an ID-less page (:206-208) | `spend.ts:162` |
| `repairLanded` (:218-233) | Writes the relink note that re-spells the landed files' own links and re-keys a renamed Context's Spaces | `settle.ts:343` (both restores) |

##### `Core/Trash/restoreProperty.ts` (94)

| Item | Job | Callers |
|---|---|---|
| `restoreProperty` (:31-36) | Wraps `restoreInner` in `serializeSchemaOp` | `spend.ts:128` |
| `restoreInner` (:38-94) | Rebuilds the definition, `restoreNote`, stashes back, re-assigns from `tree.collections` (:51,53-68), filters values (dropping gone Links into `dropped`), refills, and names misses | `restoreProperty` |

##### `Core/Trash/trashedCopies.ts` (118)

| Item | Job | Callers |
|---|---|---|
| `appendLinks` (:18-21) | Appends `links` to a bundle record; doesn't dedupe | `parkLinks` |
| `frozenWorld` (:23-33) | The `Frozen` predicate over a `PageIndex`; a key in `targets` answers by id | `spend.ts:156,272`, `restoreProperty.ts:70`, `assignment.ts:62` |
| `parkLinks` (:36-45) | Parks each Link value with the trashed page it names, walking the whole Trash (`originPagesIn`) on every call | `spend.ts:112,131,171`, `finishOwed.ts:408`, `assignment.ts:74` |
| `trashedHolders` (:48-80) | Where the Trash holds each id: every bundle, every container page's ID, Space sidecars, a Context's Space sidecars (:70-76) | `refillTrashed`, `assignment.ts:51` |
| `refillTrashed` (:83-118) | Refills Link values into trashed copies in one sweep (:92-109) and owes what it couldn't write (:112) | `spend.ts:287` |

##### `Core/Archive/archive.ts` (Restore Half)

| Item | Job | Callers |
|---|---|---|
| `restoreArchived` (:89-136) | Placement, a plain move, order, spend, `returningCascade`, refile from the store holding the bundle now (:121); the reply carries the `archive` Undo | `mutate.ts` restore arm |
| `filingOf` (:68-86) | An archive's filing: back at `back.at` through `archiveFiling`, or fresh | `archiveOp` (:44) |
| `collectionArchive` (:139-154) | A Collection's Archive folder, files, origins, and Set ids | `spend.ts:90`, `delete.ts:102` |

##### `Core/Bundles/placement.ts` (283)

| Item | Job | Callers |
|---|---|---|
| `heldElsewhere` (:38-40) | An id is live unless its holder sits inside the restoring bundle; a twin (null) always is; its comment names archived pages alone | `resolveRecord`, `placeRecord` archive arm |
| `resolveRecord` (:43-118) | Final names, siblings, or a typed refusal | `placeRecord`, `rows.ts:134` |
| `withDestination` (:129-150), `slotOf` (:152-159), `freeOnDisk` (:162-185) | Re-parent to a picked destination; anchor and slot from `place`; step the free name past the disk | `placeRecord` (`slotOf` exported for `placement.test.ts:5`) |
| `archiveFiling` (:188-227) | Where a page or Set files back into an Archive: re-rooted, re-trailed, refused when its Collection is gone for good | `placeRecord`, `archive.ts:78` |
| `placeRecord` (:229-283) | The archive arm, or destination → resolve → disk step → `landedAs` → `writeOrder` | `spend.ts:141`, `archive.ts:99` |

##### `Core/Bundles/bundle.ts` (Restore Half)

| Item | Job | Callers |
|---|---|---|
| `bundleArtifact` (:81-84) | The bundle's artifact, null when gone | open, list, recognition |
| `readBundleAt` (:219-235), `trailWithin` (:238-254), `innerRecord` (:257-273) | Address → bundle, store, record, artifact, inner item; an inner item's derived record | `openBundle`, `listInner` |
| `keptLinksUnder` (:276-290) | The bundle's `links` whose page sits under the item, found by listing the artifact | `openBundle` |
| `openBundle` (:292-307) | The one open for restore, empty, and Archive delete | `mutate.ts:148`, `delete.ts:45`, `spend.ts:65` |
| `spendBundle` (:370-393) | Removes the whole bundle, or the inner item's share (links, plus its pages off the owed strip) | `spend.ts:110,133,295`, `archive.ts:115`, `delete.ts:136` |
| `originPagesIn` (:417-426), `originPagesOf` (:429-438) | Every stored page at its origin with its bundle as its id; one bundle's pages at origin | `parkLinks`; `spend.ts:153`, `archive.ts:60,111` |

##### `Core/Nexus/settle.ts` (Arrival Half)

| Item | Job | Callers |
|---|---|---|
| `relink` (:279-296), `respell` (:299-308) | A move's re-spell and its relink note | `mutate.ts`, `payOutsideMoves`, both cascades |
| `returningNames` (:311-321) | The live-collision map plus the returning pages' own map; keeps a title-only link that found a namesake (`own` joins `names` only where the live world reads phantom, :310,319) | `returningCascade` (exported for `settle.test.ts`) |
| `returningCascade` (:324-358) | Settles the index, `repairLanded`, sweeps live collisions; answers `after` and `own` | `spend.ts:214`, `archive.ts:117` |
| `paid` (:383-387), `payOutsideMoves` (:390-424) | An outside move's re-spell; pairs vanished and landed ids, builds the world before | `settleNow` (:158) |

##### Undo Paths (Traced)

- **A Delete's Undo:** `offerDeleted` → `offerUndo` → `restore { bundlePath }` (`confirmations.ts:54-68,113-124`) → `restoreTrashed`.
- **An Archive's Undo:** `confirmArchive` → `offerUndo` → `restore` of the Archive bundle (`confirmations.ts:143-146`) → `restoreArchived`; that reply's own `undo` is dropped.
- **A Restore's Undo:** Archive only. `restoreArchived` answers `undo: { op: 'archive', back: { at, name, record } }` (`archive.ts:125-133`); the browser's `rearchive` re-sends it by id (`browser.ts:144-168`) → `archiveOp` → `filingOf` → `archiveFiling` → `fileInto`, plus `refileFiled` for a Set (`archive.ts:53-54`).
- **The Delete-From-Archive's Undo:** `requestOf(row, 'delete')` → `deleteOp`/`fromArchive` writes `record.archive` (`delete.ts:41-60`) → `offerDeleted(…, ARCHIVE_UNDO)` (`browser.ts:407`) → `restore { destination: { kind: 'archive' } }` → `restoreTrashed` → `placeRecord`'s archive arm (`placement.ts:247-264`) → `into` → `fileInto` (`spend.ts:195-198`). A plain restore of the same bundle lands it in the tree at origin (`archive.test.ts:1094`).

#### 2. The One Restore's Steps (M-3)

1. `entity === 'property'` → `restoreProperty`, then `parkLinks(dropped)` and the spend (`spend.ts:126-135`, as is).
2. No artifact → one refusal (today two texts, `spend.ts:136-137` and `archive.ts:95-96`).
3. The tree, then `{ byId, archived } = nexusPages(...)` under the claim rule, then `placeRecord` (`placement.ts:229-283`).
4. `entity` of `context` or `space` → the owed-name refusal (`spend.ts:173-185`).
5. `entity === 'context'` → the registry entry's write-ahead (`:186-192`).
6. The move: an `into` destination files back through `fileInto`; otherwise `mkdir` + `relocate`, with the Context rollback (`:193-207`).
7. `restoreNote` for a Context or Space (`:209-212`), then `writeOrder`.
8. `spendBundle` here, before the cascade, in the Archive's order (`archive.ts:115`): every later arm reads `record.links` and membership from the in-memory `OpenBundle`, and with L-5 the gate leaves, so a throw after the move leaves no record-only litter.
9. `returningCascade(root, live, back, title, { entity, abs, rekey })`, no `repair`.
10. `context` re-applies membership, `space` the members (`:239-264`).
11. Content with `record.links`, under Restore Links On Deletion, refills in one `sweepRootsById` whose rewrite applies each Link definition's `refillOf`, replacing the per-definition loop (`:274-285`); its world is `linkWorld(settled tree, archived after landing)`, one more `nexusPages` read after landing, which removes the `into` world switch at `:272` (inferred).
12. `refileLanded(record, from, dir)` unless `into`, `from` from M-10's current trail (B-6).
13. `MutateReply` with `unrestored`, `cascade`, and `landedAs`, plus `undo` (M-13).

Archive records carry no `links`, `membership`, `members`, or `registry`, and only pages and Sets, so steps 4, 5, 7, 10, and 11 skip themselves. The lock is chosen by origin: Context and Space bundles sit under `.trash/.nexus/contexts/` (`chainDir`, `bundle.ts:51-61`), so the dispatch keeps its synchronous `bundleAddressOf` read (`mutate.ts:154`) and asks whether the chain lies under `CONTEXTS_DIR_REL`, reading no record before choosing its turn. A spine with callbacks would add indirection and remove no branch. The two restores (184 and 48 lines) become about 140 (inferred).

#### 3. Recognition (Decisions E-1–E-3)

**Where:** `payOutsideMoves`, one pass ahead of `relink`. **Reads:** the pending ids (`owed.vanished` with prior paths, `owed.landed`) and, for each id the tree now holds (`livePathOf`), the stored path it left, the vanished entry's `from.path` when it lies inside a bundle; `bundleAddressOf` gives the bundle and `readRecord` its record. **Move Versus Copy:** a move raises the unlink in the watched store; a copy leaves the bundle's page in place, a live page sharing a trashed copy's id.

**What It Does:** takes the ids out of `left` and `arriving`, so `relink` never builds a world holding a stored page at its store path; drops a row still indexed at a now-missing stored path (`indexWrittenPages` unindexes a missing file, `indexSeed.ts:174-176`; `spendBundle`'s `removeOwn` notes no unlink, `atomicWrite.ts:152-155`); and hands each bundle's departed pages to the restore's shared tail: the spend (whole bundle when `bundleArtifact` is null; otherwise the inner share, releasing the departed pages from an owed container strip, a Set's bundle keeping its row under Decision C-6), the share (`keptLinksUnder` over the bundle's pages at origin, from its index rows plus the departed paths), the arrival (`returningCascade` with `live` the lane's `before`, `settle.ts:414-417`), the Link refill under the setting, and the carry (`refileLanded` when a whole Set's bundle left). Misses log through `paid`.

**The Cases:** app open, store watched: the unlink de-indexes and owes a vanish (`fileEvents.ts:293-297`), the add owes the landing, and the lane pairs them, recognized as a paired id whose `from.path` lies inside a bundle. App closed: the open's seed prunes the missing stored row into `vanished` (`indexSeed.ts:302-303`) and lands the id at its new path (`:274`); `Nexus/handlers.ts:104-105` owes both and the lane pairs them. After an index rebuild: a cold seed answers `NO_REREAD` (`indexSeed.ts:305`), so nothing pairs, including the change-time identity's one-time reseed and `reseed` (`settle.ts:197-201`), which owes nothing (Decision E-2). **The Archive (Decision E-3):** the arm is the spend and the arrival, no refill, which also ends the lane's world holding an archived page at its store path while every other reader resolves it at origin (`heldPages.ts:81`).

#### 4. Findings, as the Investigation Holds Them

- **The Prelude Twice, Two Refusals, Two Reply Shapes, Two Carry Sources:** M-3, M-10; `Restored` (`spend.ts:116-118`) and `MutateReply` (`archive.ts:89-93`) become one.
- **The Third Path:** *§What's True · A Third Path*; the missing Set carry on the delete-from-Archive Undo stays unverified.
- **`appendLinks` Twice, `dispose`, "Gone for Good" Twice, the Partition Twice, `frozenWorld(linkWorld(...))` Four Times:** M-5, L-2 and M-8, M-7, M-12.
- **The Per-Definition Refill:** M-3's step 11.
- **`Worked`, `renameFrontmatterKey`, `withUnswept`:** L-10.
- **The Scrub's Re-Parse (OP-4's Second Half):** leaves with the scrub.
- **The Lock Chosen by Store:** *§The Trash's Model · §The Rules*, 8.
- **A Refused Restore's Early Writes:** the scrub writes the trashed copy and parks its dropped links into other bundles' records (`spend.ts:162-171`) before the owed-name refusal (`:185`), so a restore refused `OWED` has already rewritten its copy, and each retry appends the parked links again; harmless today (`refillOf` lands only where a value reads blank) and gone with the scrub.
- **The Kept Record, Test-Only Exports, Ghost Guards:** L-5, L-8, L-7.
- **B-2, B-6, B-7, B-9, B-11:** as the Investigation states them.
- **The Shared Arrival in a Trash File, `trashedCopies.ts`'s Remainder, the One Restore's Home, the Tail's Home:** P-1, P-2, P-14, P-11.
- **`heldElsewhere`'s Comment:** *§What Becomes False*.

#### 5. Behavior to Preserve

- **Write-Ahead:** a Context's registry entry lands before its folder moves, and a failed move rolls it back (`spend.ts:172,186-207`; `spend.test.ts:1413`); `fileInto` writes the record ahead and removes a ghost bundle on a failed move (`archive.test.ts:1082,283`); the empty disposes the artifact before the bundle (`spend.test.ts:2041,2059`); placement refuses before any write (`spend.test.ts:882,894`, `archive.test.ts:699`).
- **Try Again:** `repairLanded`'s relink note, and `linksNotUpdated` when the index can't settle (`spend.test.ts:1350`); the empty's owed note (`spend.test.ts:1851,1861`; `trashRecovery.test.ts:1051`); H-4 `restoreNote` (`spend.test.ts:2533`). A trashed holder's refill miss is named under Decision D-5 (`restoreScrub.test.ts:194` changes).
- **Undo:** a delete's Undo (`archive.test.ts:938` and the others under that describe); an Archive restore's Undo, by id, following a rename (`archive.test.ts:473-640`); the delete-from-Archive Undo into its bundle or a fresh stamp, re-rooted and re-trailed (`archive.test.ts:938-1223`); `spendUndo` arming from either store (`confirmations.ts:47-68`); a Trash restore offers none.
- **Step-Aside Naming:** the tree's free name, stepped past the disk (`placement.test.ts:347-431`, `spend.test.ts:1464-1557`); `landedAs` (`spend.test.ts:1496,1511`); a Context's final title applies everywhere, its Spaces re-keyed (`spend.test.ts:1432,1682`); an Archive Undo files back under its own name (`archive.test.ts:513,630`).
- **Identity and Homes:** `id-live` outranks everything, and an id only inside the restoring bundle isn't live (`placement.test.ts:148-186`); the live page sharing a trashed copy's id keeps its entry (`spend.test.ts:1974`); typed refusals, `homeResolves`, destinations, `NO_DESTINATION` (`spend.test.ts:2078-2338`); place between neighbours (`trashRecovery.test.ts:144-225`).
- **Links:** stripped values come back, under the landed title, where the holder holds none, and with the setting off they stay removed (`trashRecovery.test.ts:428-885`); parking, including the namesake hand-off on empty (`trashRecovery.test.ts:662-791`); a twin linker is named and not written (`spend.test.ts:1149`).
- **Inner Items:** the share is spent with links and strip (`bundle.test.ts:333-372`), and the container's later restore writes nothing twice (`trashRecovery.test.ts:940`).
- **Archived Records Carried With a Landed Set:** `archive.test.ts:325-400`; `trashRecovery.test.ts:962`.
- **Locks:** an Archive restore takes no Contexts lock (`archive.test.ts:735`).

#### 6. Tests

- **Misplaced:** `spend.test.ts:124-701` (about 580 lines) tests delete and gather recording and `listBundles`, not restore or spend; `listBundles` is tested in both `spend.test.ts:589` and `bundle.test.ts:79`.
- **Duplicated Cases:** emptying (`trashRecovery.test.ts:399` ≡ `spend.test.ts:1706` + `:1724`); renamed parent (`trashRecovery.test.ts:242` ≈ `spend.test.ts:703` ≈ `placement.test.ts:82`); homeless destinations (`trashRecovery.test.ts:282` overlaps `spend.test.ts:2078-2175`); place recording and landing (`spend.test.ts:213-270` + `trashRecovery.test.ts:144-225` + `placement.test.ts:299`); `slotOf` tested directly (`placement.test.ts:271`) and through `placeRecord`.
- **Pinning Residue:** `spend.test.ts:797-826` pins the kept record.
- **Pinning Implementation:** `bundle.test.ts:345-372` asserts record and note patches; `trashRecovery.test.ts:929-952` pins the behavior.
- **Fixture Bloat:** `onlyBundle`/`lastBundle`/`bundleDirs` (`spend.test.ts:57-79`), `rows`/`find`/`del`/`restoreRow`/`stateOrder` (`trashRecovery.test.ts:39-70`), `onlyBundlePath` (`restoreProperty.test.ts:80`), and `archive`/`trash` (`archive.test.ts:71,799`); `stateOrder` is defined twice (`spend.test.ts:272`, `trashRecovery.test.ts:63`). One `Core/Testing` bundle helper would serve them all (P-9).
- **Under Reach-In:** most of `restoreScrub.test.ts` (828) and `spend.test.ts:1029-1411` test frozen-model behavior and leave or become cascade-reaches-the-Trash cases beside `archive.test.ts:139-153`; the three tests the prototype broke are routed in *Investigation · §The Trash's Model · §The Measurement*.
- **Gaps:** B-2, B-6, B-7, B-11; recognition's cases, the Archive's and a Set's share included.
