#### World Loaders

**Re-grounded:** 09-30-2026 at `d7d00240d`

All citations are at HEAD `d7d00240d`. An unreadable key holder counts as unread (`e3ba5d0da`): a rename onto a key it was last read holding is refused, and a strip that misses it keeps its journal record.

| Loader | Where | Source | Cached? | Callers and Frequency |
|---|---|---|---|---|
| `loadContextWorld` | contextWrite.ts:60-90 | Disk: registry (strict) plus every Space sidecar, read serially and strictly | Rebuilt per call | Once per tag write (contextWrite.ts:214), Space color (273), Space rename (contextCascade.ts:267), seeded page create (Nexus/create.ts:42), repair sweep once per open (repairSweep.ts:25), and inside `loadGovernedWorld` when drift is seen |
| `loadGovernedWorld` | contextWrite.ts:150-160 | Tree (defs, drift) with a disk fallback | Per call | Once per page value write, inside the page lock (setProperty.ts:52) |
| `contextDriftPresent` | contextWrite.ts:134-148 | Tree. With no tree it returns `true`, which forces the disk world | Rebuilds `Map<title, Set<spaceTitle>>` per call | Once per page value write |
| `resolveContextKeys` | contextResolve.ts:44-65 | Passed-in registry and `spacesByContext` | Rebuilds title→id per call (50) and the Space-by-folded-title map per key (56) | Per page and per Space per walk (readNexus.ts:336); per watcher patch; per renderer row |
| `resolveEntityContexts` | readNexus.ts:67-76 | Tree groups, converted to registry plus `spacesByContext` | Per call | Page patch (watchPatch.ts:332), Space patch (413) |
| `resolveTreeContextKeys` | contextResolve.ts:67-74 | The same tree conversion, written a second time | Per call | `pageRowOf` (pageRow.ts:17), in the renderer |
| `reconcileGovernedRoot` lookups | contextResolve.ts:90, 110 | Passed-in world | Title→id per call; Spaces per Context key | Every governed write (governedWrite.ts:28); per page in repair (repairSweep.ts:47) and restore scrub (restoreScrub.ts:48, 77); per sidecar in a Space link (contextWrite.ts:187) |
| `liveWorld` | Trash/restoreScrub.ts:26-36 | A third tree→world adapter | Per call | Once per restore |
| Walk's inline world | readNexus.ts:334 | The walk's own groups | Per walk | Once per walk |
| `identityOf` | contextIdentity.ts:29-54 | Tree | WeakMap on `tree.contexts` plus icons. This is the only one cached per identity | Renderer. `contextOptionsFor` caches per *tree* object (contextOptions.ts:6), so it rebuilds on every push |
| `readRegistry` | propertiesRegistry.ts:42-46 | Disk. Unreadable throws; absent reads as empty | Never | Once per value write (setProperty.ts:41/48), rename (registryProperty.ts:103), delete (deleteProperty.ts:81), remove (removeProperty.ts:32), option op (optionOps.ts:137, 170), replay (replaySchemaCascade.ts:35), seeded create (create.ts:52), assign restore (assignment.ts:79), and every registry confirm (`confirmRegistryWrite`, Nexus/confirm.ts:48, reading at mutatePatch.ts:204). `mutateRegistry` reads it again under the lock (propertiesRegistry.ts:81-84), so a rename reads the registry at least three times |
| `readKeptRegistry` | propertiesRegistry.ts:49-51 | Disk, falling back to the last good read | Only as a damage fallback | Per walk (readNexus.ts:287); per page rename (Nexus/cascade.ts:181) |
| `orderedDefs` | propertiesRegistry.ts:53-54 | Passed in | Per call | Per walk (readNexus.ts:373); per registry confirm (mutatePatch.ts:205) |
| `resolveAssignedSchema` | readNexus.ts:198-208 | Passed-in id map | Per call | Per Collection per walk (228). A container patch rebuilds the id map from `tree.registry` each time (watchPatch.ts:388) |
| `owningCollection`, `containerSchema` | Nexus/treePatch.ts:220, 232 | Tree, by the path's first segment | Per call | One owner lookup since `ed0fcaf0a` (F-189 closed), replacing `resolveContainerSchema`, `schemaForPage` and `collectionFolderOf`'s prefix scan |
| `assignedDefs` | assignment.ts:33-48 | Tree when held, otherwise disk registry plus sidecar | New Map per call | Per tag write (contextWrite.ts:121) and value write (155); per folder in repair, cached locally (repairSweep.ts:34-38); restore (restoreScrub.ts:34) |
| `keyHolderFiles` | keyHolders.ts:13-19 | Index key rows ∩ Collection folders; with no index, the whole corpus | Per call | Once per property rename, delete, remove or option sweep |
| `confirmedKeyHolders` | keyHolders.ts:22-39 | The same, plus a disk read and parse of each candidate and of every Space sidecar | Per call | Once per property rename (registryProperty.ts:109) |
| `keyedHolders` | keyHolders.ts:42-72 | Disk read and parse of each candidate | Per call | Delete (deleteProperty.ts:87), remove (removeProperty.ts:36) |
| `isRegisteredPropertyName` | — | **Doesn't exist** | — | Three stand-ins disagree: assigned-def names (contextResolve.ts:96), registry names ∩ Collection folders (keyHolders.ts:18), and registry-wide names (cascade.ts:181) |

"Spaces by Context" is derived seven ways: the disk world, the walk's inline copy, `resolveEntityContexts`, `resolveTreeContextKeys`, `liveWorld`, the drift map and `identityOf`. Only `identityOf` is cached. Space sidecars are read at eleven sites under four read policies:
- **Cached, lenient:** readNexus.ts:242.
- **Strict:** contextWrite.ts:70, contextCascade.ts:335, and `rmwJsonStrict` at contextWrite.ts:166 and restoreScrub.ts:95.
- **Lenient:** keyHolders.ts:35, deleteProperty.ts:50, watchPatch.ts:398, gather.ts:93, assetMigrate.ts:162.
- **Raw text plus parse:** governedSweep.ts:95-103.

The Trash also reads trashed Space sidecars, which the tree doesn't hold (holdings.ts:113-115, 139; spend.ts:69, 75).

#### Sweeps

"Parses" counts YAML parses of each page's frontmatter. Every write in the shared engine goes through `sweepGovernedRoots`:
- **Admission:** `sweepAdmits` reads and parses once to check identity, then parses again to check the frontmatter can be written back (pageFile.ts:184-191).
- **Raw plan:** parses once to read values, then once more to merge (`rewriteRaw`, governedSweep.ts:47-58).
- **Text plan:** parses once in the rewriter (for example, pageFile.ts:128).
- **Index:** re-reads the file and parses twice (indexSeed.ts:134, 46).

So a **text plan costs 2 reads and 5 parses, and a raw plan 2 reads and 6.**

| Sweep | Where | Enumerates | Locks | Reads and Parses per File | Journal | Confirms | Keeps mtime |
|---|---|---|---|---|---|---|---|
| Property rename | registryProperty.ts:75-130 | `keyHolderFiles` (∩ Collections) and **all** Space sidecars | Schema chain, per file | Text plan, 5 parses; plus a pre-check that reads and parses each candidate for the new key | Yes; registry **first** | Index per page; `confirmRegistryWrite` (Nexus/confirm.ts:48): registry repoint, sidecar re-read, values push | Pages yes; sidecars no (governedSweep.ts:110) |
| Property delete | deleteProperty.ts:73-129 | `keyHolderFiles` over all Collections; the snapshot re-reads every Collection and Space sidecar | Chain, per file | `keyedHolders` 1 plus raw 6, so 7 parses and 3 reads; sidecars read twice | Yes, after the bundle; registry **last** | Same, plus `tiles:changed` | Same |
| Property remove | removeProperty.ts:16-57 | `keyHolderFiles` for one Collection; no sidecars | Chain, sidecar lock, per file | 7 parses | No (the cache is the safety net) | `confirmRegistryWrite` with the container | Yes |
| Option rename, remove, clear | optionOps.ts:145-244 | `keyHolderFiles` over all Collections, all Space sidecars, then `reachConfig` | Chain, per file | Raw 6 | Rename: registry first. Remove: registry last. Clear: none | `confirmRegistryWrite` | Yes |
| Context rename | contextCascade.ts:112-131, 203-258 | `queryMembers(oldKey)` over the **whole** Nexus, with no ∩ Collections (91), and all sidecars | Contexts-folder lock (mutate.ts:67-68), per file | Text 5 | Yes; registry **last**; a failed commit reverses the cascade | Pure transform (mutatePatch.ts:68-69) plus sidecar re-read | Yes |
| Space rename | contextCascade.ts:260-296 | `loadContextWorld`, then `queryMembers(key, folded title)` and all sidecars | Contexts lock, per file | **Raw** 6 (`pageLeg` is undefined, 105-106) | Yes; no registry | Transform | Yes |
| Space-delete unlink | contextCascade.ts:151-190; Trash/delete.ts:53-57 | As Space rename | Contexts lock | Raw 6. On any miss, a rollback loop restores every touched file (183-189) | **No**; a Trash record before and after | Full walk (mutatePatch.ts:119), then `reachConfig` | Yes |
| Context-delete unlink | contextCascade.ts:133-149; delete.ts:58-79 | `queryMembers(key)` and sidecars, skipping the deleted folder | Contexts lock | Raw 6 | **No**; registry **first** (delete.ts:66), re-inserted if the sweep throws (75) | Full walk and `reachConfig` | Yes |
| `setContext` tag write | contextWrite.ts:109-221 | One page, or N far-half Space sidecars (191-203) | Contexts lock, page lock | `loadContextWorld` reads every Space sidecar; the page gets 3 reads and 5 parses (governedWrite.ts:23, 25, 32, index, then the confirm's `patchPage`) | n/a | `patchPage` (mutatePatch.ts:134) | No (user edit) |
| `repairSweep` | repairSweep.ts:19-56 | the seed's returned list | Per file only; **no Contexts lock**; runs un-awaited (Nexus/handlers.ts:98) | Raw 6 | No | Values push only | Yes |
| `replaySchemaCascade` | replaySchemaCascade.ts:15-78 | Delegates to the property sweeps above | Chain | Same | Consumes the property journal | Full walk (Nexus/handlers.ts:94-97) | Yes |
| `replayPendingRename` | contextCascade.ts:298-361 | Delegates to the Context rename cascade. Runs at handlers.ts:81, **before** the seed marks the index ready (indexSeed.ts:217, called at handlers.ts:93), so `queryMembers` is null on a fresh store and it scans the corpus | None (open time) | Text or raw | Consumes the Context journal | The open's walk | Yes |
| `reachConfig` | configReach.ts:334-385 | Tree containers (optionally under a folder), tile hosts, `matrix.json` | Per file (`editJsonStrict`) | JSON: 1 read, 1 parse | Inherits the caller's | `noteSidecarWrite`, tile hosts pushed | n/a |
| `renameCascade` | Nexus/cascade.ts:152-229 | `queryMentions` or the corpus (headings use the index only), plus every Markdown tile | Per file | Text 5-6. Tiles go through `rewritePageSerialized` with no admission check and no index update | No | Reply lists pages and hosts | Yes |
| Asset migration | Assets/assetMigrate.ts:134-162 | Full corpus including excluded folders, all container and Space sidecars | Per file | 3 reads, 4 parses; **no `sweepAdmits` gate, no index update** | No | Caller | Pages yes, sidecars no |

The same engine also serves the exclusion clear (exclusionScan.ts:89), the restore scrub (restoreScrub.ts:86), the by-id restore sweeps (governedSweep.ts:119-143, via spend.ts:336 and assignment.ts:58), and, since the Trash/Link arc, the delete's Link strip (Nexus/cascade.ts:115) and the refill of trashed linkers (Trash/holdings.ts:140).

**Count:** there are **nine** distinct enumerate–lock–read–decide–write loops, not one.
- **The shared engine is really two loops:**
  - A page leg (governedSweep.ts:73-92).
  - A Space-sidecar leg (94-116). It parses raw JSON, checks only that the JSON parses, uses `writeJson`, and doesn't keep mtime.

  Thirteen call sites share this engine, so the doc's claim holds for them.
- **Seven bespoke loops sit outside it:**
  - The unlink rollback (contextCascade.ts:183-188).
  - `reachConfig` (configReach.ts:347-383).
  - The tile link rewrite (tilesFile.ts:314-330).
  - The asset migration (assetMigrate.ts:134-162).
  - The restore-scrub sidecar loop (restoreScrub.ts:94-102).
  - The Space link far-half loop (contextWrite.ts:191-203).
  - The per-Collection unassign (deleteProperty.ts:111, 120-129).
- **Enumerators:** four pick candidate files (`keyHolderFiles`, `queryMembers`, `queryMentions`, `spaceSidecars`), two walk the tree (`containersOf`, `tileHostsOf`), and the asset migration adds `corpusFiles`.
- **JSON read-modify-write variants:** there are five (`rmwJsonStrict`, `editJsonStrict`, `updateNexusFile`, `patchSidecar`, and the sweep's own sidecar leg).

#### Two Registries

This section and *Journals* are F-622's material (Decision Log G-2): phase 4 keeps both registries' machinery and takes only the journal gaps *Plan Inputs* lists.

The two layers are one pattern written twice:

| Properties | Contexts |
|---|---|
| Property rename | Context rename |
| Option rename | Space rename |
| Option remove | Space delete |
| Property delete | Context delete |

The table below compares the two implementations.

| Aspect | Properties | Contexts |
|---|---|---|
| File shape | `{order, defs{id: def}}` | `{contexts: [def]}`, where array position is the order |
| Read | `readRegistry`: absent reads as empty (propertiesRegistry.ts:42-46), plus `readKeptRegistry` | `readRegistryStrict`: absent is a fault (contextsRegistry.ts:27-30). The walk reads it a third way (readNexus.ts:301, 308) |
| Write | `mutateRegistry` over `updateNexusFile`, non-repairable, with a per-def `mergeKeys` (propertiesRegistry.ts:73-111) | `mutateRegistryFile` over `rmwJsonStrict` (contextsRegistry.ts:33-45) |
| Serializes on | `serializeSchemaOp` (schemaChain.ts:5-9) | The Contexts-folder lock (mutate.ts:67-68). Create and reorder take only the file lock |
| Key rename | Page text via `renameFrontmatterKey`, `prefer-new`; sidecar `moveKey` plus `withOrderEntry` (registryProperty.ts:75-91) | Page text via `renameFrontmatterKey`, `merge`; sidecar `rewriteRoot` plus `withOrderEntry` (contextCascade.ts:43-60, 105-131) |
| Rename order | Journal → registry → sweep (registryProperty.ts:111-127) | Journal → folder move → sweep → registry (contextCascade.ts:222-257) |
| Value rename | `valueEditRewrite` with `namesValue` (pageValue.ts:37-44) | `editList` with `namesSpace` (contextCascade.ts:61-67). Same `editList` |
| Key delete | Bundle → journal → strip → unassign → reach → registry last | Record → registry first → strip → record → folder settle → reach. No journal |
| Journal | `propertyJournal`, 4 ops, no supersede | `contextJournal`, rename only, supersedes by entity, persists the skip list |
| Replay | After the index seed, on the chain (handlers.ts:94) | Before the walk and the seed (handlers.ts:81) |
| Index rows | `queryKeyHolders` on the `values` rows | `queryKeyHolders` for the key; `space` relation rows for a Space title (indexSeed.ts:66, 72-85; a `relations` table since `23890f78b`). Space sidecars are unindexed for both |
| Holder scope | ∩ Collection folders (keyHolders.ts:18) | The whole Nexus (contextCascade.ts:91) |
| Reconcile | Type-driven, including option adoption (contextResolve.ts:96-102) | Exact key; folded value; members never dropped |

**Written twice in the same shape:**
- The registry read-modify-write.
- Key rename: two collision rules, and opposite commit orders.
- Value rename and strip.
- Key strip.
- Holder enumeration.
- Journal decoders.
- Replay-on-open: two gate styles, at two points in the open sequence.

**Genuinely different:**
- A Space is a folder, so a rename moves a directory and a replay has to check the sidecar id at both the old and new path (contextCascade.ts:334-358).
- Property values are typed: reconcile, adoption, the removal cache, and per-Collection assignment have no Context analog.
- Views name Spaces by id but options by value, so only option renames reach configuration.
- The registry-commit order differs for real reasons. A Context rename commits last so a mid-cascade tag lands under the old key. A property rename commits first because its guard is "the def now holds `to`".

  No shared law chose either order; each op picks its own.

#### Journals

F-622's material, as *Two Registries* is; phase 4 takes the first three gaps below (*Plan Inputs*).

There is one mechanism, `journalSlot` (journalSlot.ts:15-52): a single-record file under `.nexus`. A write won't displace a different held record (38); a corrupt record is set aside (39); a clear removes only the caller's own record (46). It carries two vocabularies, run by two replayers.

- **Context journal:**
  - **Records:** `{contextId, spaceId?, oldTitle, newTitle, skipped[]}`.
  - **When written:** before the folder move (contextCascade.ts:223, 282).
  - **When cleared:**
    - On a failed move (235, 289).
    - On a failed commit, after the reverse cascade (252).
    - At settle: it is rewritten with the skip list if files were skipped, otherwise cleared (192-195).
  - **Replay:** at open, before the walk.
  - **Crash handling:**
    - **Before the move:** the replay moves the folder and cascades (320-324).
    - **Mid-cascade:** it re-cascades idempotently and commits.
    - **After the commit, before settle:** the title already equals `newTitle`, so it re-cascades and settles.
- **Property journal:**
  - **Records:** rename, delete, option-rename and option-remove intent.
  - **When written:** before the commit for rename and option-rename; after the bundle for delete (deleteProperty.ts:91); before the strip for option-remove (optionOps.ts:235).
  - **When cleared:**
    - When nothing was skipped.
    - By a create that reuses the deleted name or id (registryProperty.ts:65-69).
  - **Replay:** at open after the seed, and on demand for Try Again (Properties/handlers.ts:166-168). Its guards act only on an exactly mapped registry state (replaySchemaCascade.ts:39-72).

**Gaps:**
- Three callers ignore `write`'s `false` return, so an op runs unjournaled while another record is stranded: contextCascade.ts:223/282 and registryProperty.ts:112. The option rename and remove (optionOps.ts:186, 235) and the property delete (deleteProperty.ts:91) read it and answer `replayable` only when journaled (`132a2f111`).
- **Context and Space deletes have no forward replay.** A crash after the registry removal (delete.ts:66) and before the sweep leaves inert `<Title>` keys and an unregistered folder the walk never reads. Recovery rests on the Trash record, which is a restore-backward record, not a replay.
- A failed Context commit discards the skipped files of the reverse cascade and clears the journal (contextCascade.ts:243, 252).
- Trash records form a third write-ahead mechanism.

#### Configuration Reach

**What it walks:** every Collection and Set from the tree (optionally only under one folder: configReach.ts:327-332), every tile host (the homepage and every Space) via `tileHostsOf`, and `matrix.json`.

**What it rewrites:** saved-view fields, classified by a role table (59-94) and edited by three handler tables:
- `RENAME` handles option edits.
- `CLEAR` handles a property delete, a property remove, and a Context delete, which is mapped to "property" by the Context id (291).
- `GONE` handles Space deletes and Collection or Set deletes.

It also edits the Collection `property_cache` on option edits (311-324, through `editCacheBlocks` in Properties/propertyCache.ts since `5003a1c7f`), tile view configs scoped by source (366-377), and the Matrix filter rules.

**Does it duplicate an existing enumeration?** It doesn't duplicate `keyHolders` (pages), `contextCascade` (pages and sidecars) or Trash `gather`, which reads only the deleted folder (gather.ts:93-95); the delete record's membership comes from the sweep's own captures. It does duplicate *writes*:
- A property delete runs `unassignAndPurge` over every Collection sidecar (deleteProperty.ts:111), then `reachConfig` read-modify-writes the same sidecars again (112).
- `removeProperty` clears the views in its own `patchSidecar` (removeProperty.ts:43-53), then `reachConfig` under that folder revisits the same sidecar (54).
- It is a second writer of view sidecars: `editJsonStrict` bypasses `patchViews`' positional-id repair (viewsFile.ts:43-65).
- It is a second writer of `matrix.json`, beside `matrixFile.ts:17`, with the opposite policy on a corrupt file.
- `cacheEdit` restates the value-edit sweep's list edit for cached values.

**What a read-time drop wouldn't do:**
- **Already dropped at read:** filter rules on a property id outside the schema produce no test (filter.ts:72-73), and sort and group behave the same. So `CLEAR` (and a Context delete) largely duplicates behavior the read path already has.
- **Option rename can't be a drop.** It translates string operands, custom orders, and hidden and collapsed bucket keys. Values aren't ids, so a rename needs a write or an alias map.
- **Operand-level gone ids aren't handled at read today.** "Is any of [gone Space]" still filters, and matches nothing. A read-time drop would have to learn which ids are live, and whether an emptied rule becomes "unanswerable."
- **Two effects only the write produces:** clean files for sync and other tools, and the `hosts` report that drives the tile refresh.
- **Behavior would flip.** ContextsPM says "a restore brings none of that back." Under read-time dropping, a restored id's view configuration would return.
- **`property_cache` edits aren't configuration.** They are values and belong to the value sweep.

#### Inventory & Collapse

"Survives" is an estimate of raw lines under the candidate law. "Safety held" names the invariant each file carries.

| File | LOC | Job | Twin | Under the Law | Survives | Safety Held |
|---|---|---|---|---|---|---|
| Contexts/contexts.ts | 47 | Schema, `<Title>` codec | unique | Config decoder | 47 | `holdsName` title (12-17) |
| contextsRegistry.ts | 52 | Registry read and RMW | parallel to propertiesRegistry | One config writer | 25 | Strict RMW refusal (32-45) |
| contextResolve.ts | 138 | Resolve, reconcile, preserve | `resolveTreeContextKeys` duplicates `resolveEntityContexts` | Lookups → cached projection | 95 | `preservedChanges` (128-137) |
| contextIdentity.ts | 75 | Identity maps | parallel to the world loaders | Projection | 40 | — |
| contextWrite.ts | 291 | World load, tag and link writes, creates | loaders parallel to the tree adapters | ~75 loader lines go; writers emit upserts | 190 | Strict world (69-74); page lock (119) |
| contextCascade.ts | 361 | Rename, unlink, replay | parallel to property rename, strip and option edit | Context arm of one cascade | 250 | Journal first (223, 282); registry last (241); rollback (183-189); mtime (185) |
| contextJournal.ts | 49 | Record decoder | parallel to propertyJournal | One journal union | 25 | Supersede by entity (42-45) |
| contextOptions.ts | 36 | Picker options | derived | Projection | 20 | — |
| spaceSidecar.ts | 92 | Space field reader, disk enumeration | 1 of 11 read sites | The one Space reader | 75 | — |
| reorderContexts.ts | 16 | Reorder | unique | Config change | 16 | — |
| Properties/properties.ts | 341 | Type catalog, name rules | unique | Outside the law | 341 | Reserved names (232, 260) |
| propertiesRegistry.ts | 111 | Registry read and merge-RMW | parallel | Config reader and writer | 85 | Strict read (43); unparsed defs kept (29-30) |
| registryProperty.ts | 174 | Create, rename, edit, reorder | `renameSweep` parallel to `cascadeTitle` | Joins the shared cascade | 150 | Journal first (112); registry first (113); holder refusal (109-110) |
| assignment.ts | 169 | `assignedDefs`, cache, assign and restore | loader parallel | `assignedDefs` → projection | 145 | Cache before strip |
| setProperty.ts | 59 | Value write | — | World load goes | 45 | Registry read inside the page lock (46-49) |
| assignValue.ts | 75 | Window optimistic write and undo | window side | — | 70 | — |
| deleteProperty.ts | 129 | Snapshot, strip, unassign, reach | strip parallel to `unlinkContextKey` | Snapshot reads → projection | 105 | Bundle → journal → strip (87-93); registry last (116) |
| removeProperty.ts | 57 | Unassign with cache | unique | — | 50 | One sidecar write (43-53) |
| keyHolders.ts | 72 | Holder enumeration and confirm | parallel to `queryMembers` | Key-holder projection | 25 | Disk confirm (22-39) |
| governedSweep.ts | 143 | The engine | shared | Stays; confirm becomes `apply`; one parse | 110 | Per-file lock (65-71); admission (80-84); mtime (86) |
| governedWrite.ts | 43 | Single-file write | — | Stays | 35 | `preservedChanges` (31) |
| journalSlot.ts | 52 | Write-ahead slot | shared | Stays | 52 | No displacement (38); own clear (46) |
| propertyJournal.ts | 57 | Schema records | parallel | Merged union | 40 | — |
| repairSweep.ts | 56 | Repair on open | — | World from projection | 40 | Never removes (42-49); db guard (22-23) |
| replaySchemaCascade.ts | 78 | Property replay | parallel to `replayPendingRename` | One replayer | 70 | Exact-state guards (39-72) |
| optionOps.ts | 244 | Option edits and cascades | value sweep parallel to Space unlink and rename | Stays | 225 | Journal first (170, 235); remove commits last (238) |
| Properties/handlers.ts | 188 | IPC and confirm | — | Confirm becomes `apply` | 170 | — |
| schema.ts | 56 | Validation | unique | — | 56 | Folded uniqueness (24-26) |
| value.ts | 67 | Renderer decode memo | unique | — | 70 | — |
| pageValue.ts | 44 | In-place list edit | shared | — | 44 | In-place, never re-encode (1) |
| schemaChain.ts | 9 | Schema serializer | parallel to the Contexts lock | One chain | 9 | — |
| Nexus/configReach.ts | 385 | View, tile and Matrix reach | separate writer beside viewsFile | `CLEAR`/`GONE` (~70 lines) move to read time; `RENAME` stays | 260 (+40 in the pipeline) | Strict edit refusal (347-354) |
| Nexus/cascade.ts | 229 | Link cascade, and since the Trash/Link arc the delete's Link strip and the Space arm | — | Names from projection | 220 | mtime via the engine |
| Connections/rewrite.ts | 132 | Pure rewriters | unique | — | 132 | Code masking |
| Files/pageFile.ts | 191 | YAML codec, admission | — | Admission returns the parsed doc | 185 | Never re-serialize broken YAML (51, 129) |
| Index/contentIndex.ts | 100 | Index facade | key queries parallel | Key holders → projection | 85 | Readiness gating (42-62) |
| Views/viewsFile.ts | 179 | View writes | — | — | 179 | Positional-id repair (42-65) |
| Tiles/tilesFile.ts | 331 | Tile I/O and link rewrite | — | — | 323 | Stale-write capture (263-269); mtime (319-320) |

**Total at the pin:** 4,794 raw lines (4,267 excluding blank and comment lines) across 38 files. The estimated survivors are about 3,960 lines, plus about 100 new lines (the world and holder projections, and the read-time drop), for about 4,060, a reduction of roughly 730 lines under the whole candidate law. Under the Decision Log's scope that figure splits: the confirm becoming `apply` and admission returning the parsed doc are phases 2 and 3, the read-time drop of `CLEAR` and `GONE` is in no phase, and the survivor column's journal-union, single-replayer, one-chain and shared-cascade rows (contextJournal, propertyJournal, replaySchemaCascade, schemaChain, registryProperty, much of contextCascade) assume F-622. Phase 4's own count is roughly flat (*Plan Inputs*).

Merging Contexts and Properties into one parameterized key and value cascade, with one journal and one replayer, is F-622 (G-2). Its roughly 150 further lines belong to that estimate, on top of the F-622 rows above.

The rest of the slice is essential semantics the law doesn't touch:
- The type catalog (342).
- The option model.
- The view-config role tables.
- Reconcile and member preservation.
- Journals and folder-moving replays.
- Tile I/O.

Files are canonical, so every holder file still has to be rewritten on a rename.

#### Divergences

1. **`isRegisteredPropertyName`.**
   - **Claim:** CorePM.md:90 names this function in `properties.ts`.
   - **Code:** it doesn't exist.
   - **Effect:** three different "governed key" rules are in use: assigned names for reconcile (contextResolve.ts:96), registry ∩ Collections for sweeps (keyHolders.ts:18), and all registry names for link cascades (cascade.ts:181).
2. **"Share one walk".**
   - **Claim:** CorePM.md:91 says governed-key sweeps share one walk.
   - **Code:** the engine is shared, but enumeration isn't: Collection-scoped (keyHolders.ts:18), Nexus-wide (contextCascade.ts:91), or seed-scoped (repairSweep.ts:20). The sidecar leg differs, and seven loops sit outside.
   - **Same claim, "every Space sidecar":** `removeProperty` and repair open none, correctly (removeProperty.ts:55, repairSweep.ts:51).
3. **"Serialize on one chain and write a crash journal first".**
   - **Claim:** CorePM.md:91.
   - **Code:**
     - There are two serializers (schemaChain.ts:5-9; mutate.ts:67-68).
     - Context and Space deletes write no journal (delete.ts:53-79).
     - Journal-write refusals are ignored (see Journals).
4. **`normalizeContextValue`.**
   - **Claim:** ContextsPM.md:12 names it as the value normalizer.
   - **Code:** it doesn't exist. `normalizeTitle` is the normalizer (connections.ts:7; contextResolve.ts:21, 40, 59).
5. **"Repairs on that file's next context write".**
   - **Claim:** ContextsPM.md:12.
   - **Code:** a drifted value also repairs on any value write that detects drift (setProperty.ts:52 → contextWrite.ts:157-159), and on the open-time sweep.
6. **"A value naming no Space is dropped".**
   - **Claim:** the Repair section of PropertiesPM.md.
   - **Code:** the reconcile computes the drop (contextResolve.ts:116-117), but every live writer withholds it (`preservedChanges`: governedWrite.ts:31, contextWrite.ts:187, repairSweep.ts:42-49). Only the restore scrub drops it (restoreScrub.ts:49, 84).
7. **"Reconciling the whole root".**
   - **Claim:** ContextsPM.md:23.
   - **Code:** Space sidecar writes reconcile with `defs: NO_DEFS` (contextWrite.ts:89, 187; restoreScrub.ts:48), and `setSpaceProperty` reconciles nothing (setProperty.ts:17-32), so a Space's property values are never reconciled.
8. **"One lock on the Contexts folder".**
   - **Claim:** ContextsPM.md:20 says Context-bearing writes run under it.
   - **Code:** `setProperty` isn't wrapped (mutate.ts:133-134), yet it writes Space sidecars and reconciles page Context keys. Property sweeps rewrite Space sidecars on the schema chain, and the repair sweep runs unlocked.
   - **Consequence:** a Space rename moving a folder mid-property-sweep leaves the file skipped and recovered only through the journal.
9. **"A failed commit reverses the cascade".**
   - **Claim:** ContextsPM.md:25.
   - **Code:** the reversal's skipped files are dropped with the journal (contextCascade.ts:243, 252).

#### Plan Inputs

Phase 4 at the Decision Log's scope (G-3 and G-4, with F-200 and F-201 as K-1 and K-2 word them) is one Context-world and key-holder lookup built from the tree, and the five fixes G-3 lists beside it. The two registries, their journals, replayers and sweep loops stay as they are; sharing them is F-622.

##### The Seven Derivations

| Derivation | At HEAD | Phase 4 |
|---|---|---|
| `loadContextWorld` (disk) | contextWrite.ts:60-90 | Deleted. Its callers read the lookup: `setContextOp` (214), `setSpaceColor` (273), `renameSpaceOp` (contextCascade.ts:267), `createPageOp` (Nexus/create.ts:42), `runRepairSweep` (repairSweep.ts:25-26), `loadGovernedWorld` (158) |
| Walk's inline world | readNexus.ts:334-337 | Caller. It is built from the walk's own groups, which become `tree.contexts` (366), so the walk's projection is the tree's |
| `resolveEntityContexts` | readNexus.ts:67-76 | Caller (watchPatch.ts:332, 413); its registry and map rebuild (72-73) goes |
| `resolveTreeContextKeys` | contextResolve.ts:67-74 | Deleted; `pageRowOf` (pageRow.ts:17) resolves through the lookup |
| `liveWorld` | restoreScrub.ts:26-36 | Deleted; `scrubReturning` (61) reads the lookup beside `assignedDefs` |
| `contextDriftPresent` | contextWrite.ts:134-148 | Deleted with the disk fallback. A cached world costs nothing to pass on every value write, and a reconcile of a clean root changes nothing |
| `identityOf` | contextIdentity.ts:29-54 | Stays as the renderer's view of the same slice, since it adds icons from `personalization.defaultIcons`; it may read its Spaces from the lookup |

The per-call rebuilds inside `resolveContextKeys` (contextResolve.ts:50, 56) and `reconcileGovernedRoot` (90, 110), through `idsByExactTitle` and `spacesByTitle` (32-42), become reads of the lookup's prebuilt maps.

##### The Eleven Read Sites

| Site | At HEAD | Phase 4 | Reason |
|---|---|---|---|
| Walk | readNexus.ts:242 | Keeps | Phase 3's one Space reader |
| Watcher Space patch | watchPatch.ts:398 | Keeps | Phases 3 and 5 |
| Disk world | contextWrite.ts:70 | Goes with `loadContextWorld` | — |
| Every Space sidecar write | contextWrite.ts:166 (`writeSpaceSidecar`) | Keeps | G-4: the Space link decides each far half inside its own read-modify-write |
| Restore scrub | restoreScrub.ts:95 | Keeps | G-4: the deliberate drop, inside a read-modify-write |
| Sweep sidecar leg | governedSweep.ts:95-103 | Keeps | Read-modify-write under the file lock; enumerated by folder (`spaceSidecars`, spaceSidecar.ts:29-37) because a Context mid-rename has moved on disk before the tree follows |
| Space rename replay | contextCascade.ts:335 | Keeps | Open time, before the walk; F-622's |
| Rename collision check | keyHolders.ts:34-37 | Candidate caller | Below |
| Property delete snapshot | deleteProperty.ts:49-59 | Keeps | The Trash's write-ahead evidence: the record holds what the files hold |
| Trash gather | Trash/gather.ts:93 | Keeps | Reads only the deleted folder |
| Asset migration | Assets/assetMigrate.ts:162 | Keeps | Out of slice |

The Trash also reads trashed Space sidecars the tree doesn't hold (holdings.ts:113-115, 139; spend.ts:69, 75). The Trash/Link arc added the first tree-built Space key-holder answers: `spaceArm` (Nexus/cascade.ts:52-55) and `spacesLinkHeading` (58-72) read `SpaceNode.values`.

**`confirmedKeyHolders`' Space half:** the page half reads only the candidates the index names (keyHolders.ts:28-29), so it already carries the index's outside-edit window. A Space half answered from `SpaceNode.values` (the tree's copy, built by `spaceFieldsFrom`, spaceSidecar.ts:44-64) matches that window rather than widening it, and becomes a second caller of the answer `spaceArm` already computes. The plan decides whether the rename's refusal (registryProperty.ts:109-110) accepts that window for Spaces.

##### The Lookup

`identityOf` caches on `tree.contexts` identity (contextIdentity.ts:24-33) and holds, per Space, `title`, `icon`, `color` and `contextId`. `loadContextWorld`'s world holds, per Space, `id`, `title`, `contextId`, `contextTitle`, `dir` and `raw` (contextWrite.ts:41-48), plus `spacesByContext` of `SpaceNode` records and the whole `ContextsRegistry`. Against identity, the lookup lacks the Space as a `SpaceNode` record, its `path` (for `dir`), `contextTitle`, `raw`, and the registry with its exact-title index.

`raw` has no tree equivalent: a `SpaceNode` keeps `values` and the resolved `contextValues`, not the `<Title>:` tags. Its one reader is the far-half pre-check (contextWrite.ts:194). Under G-4 that check moves inside the far half's read-modify-write, returning `null` when the back link already matches, so the lookup needs no `raw`.

One projection serves every caller when it is keyed on `ContextGroup[]` rather than `NexusTree`, because the walk's attach (readNexus.ts:333-339) holds groups and no tree. Candidate shape:

```ts
interface ContextWorld {
  registry: ContextsRegistry
  contextIdByTitle: ReadonlyMap<string, string>
  spacesByContext: ReadonlyMap<string, readonly SpaceNode[]>
  spaceByFoldedTitle: ReadonlyMap<string, ReadonlyMap<string, SpaceNode>>
  spaceById: ReadonlyMap<string, { node: SpaceNode; contextTitle: string }>
}
export function contextWorldOf(groups: readonly ContextGroup[]): ContextWorld
```

Host callers read `contextWorldOf((await liveTreeOf(root)).contexts)` and take `dir` as `join(root, node.path)`. `GovernedWorld` (contextResolve.ts:23-27) either wraps `ContextWorld` beside `defs` or keeps its shape over the prebuilt maps; the plan picks one. An unreadable registry blanks the layer (`contexts ?? []`, readNexus.ts:366), and an empty world passes every Context key through as `registry: null` does today. A Context write against it answers not-found from `contextTarget` where `readRegistryStrict` answers a fault today: both refuse, with a different error kind.

**Kept current:** nothing writes to it. It is a `WeakMap` on the groups array, and the applier's Context steps already replace that array by identity (treePatch.ts:280, 292, 346, 422-424; watchPatch.ts:447-455). The invariant phase 2 keeps is that any change to a group's def or to a Space's id, title or path returns a new `contexts` array. F-211's in-place write (readNexus.ts:333-339) touches `contextValues`, which the projection produces and never reads.

**G-4, kept exactly:**
- `setPropertyOp` reads its def from disk inside the page lock (setProperty.ts:46-50).
- `preservedChanges` (contextResolve.ts:128-137) stays in every live writer. It is what makes a tree missing a Space (an unreadable sidecar the walk lists as unreadable) safe to reconcile against.
- The far-half decision sits inside `writeSpaceSidecar`'s read-modify-write.
- The restore scrub keeps `survivingChanges` for pages (restoreScrub.ts:84) and `r.root` for sidecars (49).

**Re-earned first:** governedWorldWrite.test.ts:125 and 159 pin the disk world's strictness. Before `loadContextWorld` goes, a replacement test pins that a Space absent from the tree leaves a property write's tags naming it untouched, and fails a context write targeting it with not-found.

##### G-3's Six Fixes

1. **The lookup:** above. Around it, `assignedDefs` (assignment.ts:33-48) already reads the held tree first and `collectionFolderOf` (158-161) resolves through `owningCollection` (`ed0fcaf0a`), so `defs` is store-built; only the Context half was disk.
2. **`setProperty` under the Contexts lock:** mutate.ts:133-134 becomes `underContexts(() => setPropertyOp(ctx, req))`, one line. A value edit then waits behind a running Context or Space rename. Two other Space-sidecar writers sit outside the lock: `setSpaceColor` (mutate.ts:164-165), which becomes a lookup caller, so a Space rename landing between its lookup and its write hands `rmwJsonStrict` a moved path and a not-found fault; and `setSpaceRowOrder` (182-186). Neither is in G-3's list, so the plan decides. The repair sweep also runs unlocked (Nexus/handlers.ts:98), guarded by `preservedChanges` alone.
3. **Forward replay for Context and Space deletes:** the Space arm is Trash/delete.ts:53-57 (record, sweep, record); the Context arm is 58-79 (record, registry removal at 66, sweep at 73, re-insert on a throw at 75). The smallest change is a delete record in the Context journal (contextJournal.ts), written before the first destructive step and cleared after the settle and reach (88-102), carrying the Context id, the Space id, both titles and the bundle path. `trashMode: 'system'` mints no bundle (40), so there the journal is the only forward record.
   - **Ordering:** `replayPendingRename` runs at Nexus/handlers.ts:81, before `refreshTree` (88). The sweep and settle can run there (`queryMembers ?? nexusCorpus`), but `reachConfig` calls `liveTreeOf` (configReach.ts:341) and would walk early. Either the reach runs after the walk with a `refreshAfterWrite`, as `replaySchemaCascade`'s does (94-97), or the record carries its `ConfigEdit` (`goneEdit`, configReach.ts:285-309, computed from the tree before the delete).
   - **One slot:** the slot holds one record and supersedes only by entity (contextJournal.ts:42-45), so a delete meeting another entity's stranded rename is a refused write, which defect 4's policy answers.
   - The Trash/Link arc left both arms as they were; its `deleteCascade` (delete.ts:92) serves content kinds only.
4. **One policy for a refused journal write:** three sites ignore `write`'s `false` (contextCascade.ts:223, 282; registryProperty.ts:112), and three read it and answer `replayable` only when journaled (optionOps.ts:186, 235; deleteProperty.ts:91; `132a2f111`). Properties' ops return a `SchemaCascade` with a user-facing `replayable` and a Try Again channel (Properties/handlers.ts:166-168); Contexts' ops return `Result<null>` and replay only at open. The two candidate policies:
   - **Refuse** the op while another record is owed: smallest for Contexts, and a behavior change for Properties' three reading sites.
   - **Proceed unjournaled and report it:** the property rename gains `replayable`, and Contexts' two sites gain a report channel.
5. **A failed Context rename keeps its reversal's skipped files:** contextCascade.ts:242-253. The discarded reverse `cascadeTitle` and the `clearJournal` (243, 252) become a reversed record `{ ...j, oldTitle: newName, newTitle: entry.title }` written first (it supersedes the forward record by entity), the reverse cascade, and `settleJournal(root, reversed, undone.skipped)`. The open-time replay already completes a record whose registry title equals its `newTitle` (316, 325). About three lines net.
6. **A Space's own values reconciled like a page's:** a Space holds any registry property, so its defs are the registry by name from `tree.registry` (restoreScrub.ts:62 builds the Link subset the same way). Three sites change:
   - `setSpaceProperty` (setProperty.ts:17-32) reconciles nothing.
   - `setSpaceContext`'s `repaired` (contextWrite.ts:185-188) passes `NO_DEFS`.
   - The restore scrub's `reconciledSidecar` (restoreScrub.ts:48) passes `NO_DEFS`.

   Each passes the registry defs, collects `adoptions` inside the read-modify-write, and runs `applyAdoptions` afterward, as `setPageContext` does (contextWrite.ts:129-130). Since the pin, the scrub strips gone Link values from Space sidecars by hand (`unlinked`, restoreScrub.ts:65-66, 96-101) so it can record them; with the defs and `frozen` passed, the reconcile does the dropping and `unlinked` stays only to note what went.

##### Per File

- **Contexts/contextWrite.ts (291):**
  - **Deleted:** `SpaceRef` 41-48, `NO_CONTEXT_WORLD` 55-58, `loadContextWorld` 60-90, `contextDriftPresent` 134-148.
  - **Changed:** `ContextWorld` 50-53 moves beside `contextWorldOf`; `contextTarget` 93-107 reads `spaceById`; `loadGovernedWorld` 150-160 reads the tree world with no fallback; `setSpaceContext` 172-205 decides inside the read-modify-write and passes defs; `setContextOp` 207-221 finds the owner by path (218); `setSpaceColor` 266-278.
  - **Non-test importers:** `loadContextWorld` in contextCascade.ts, Nexus/create.ts and repairSweep.ts; `NO_CONTEXT_WORLD` in repairSweep.ts; `loadGovernedWorld` and `writeSpaceSidecar` in setProperty.ts; `ContextWorld`, `contextTarget` and `setPageContext` in Nexus/create.ts. `contextDriftPresent` has only test importers.
- **Contexts/contextResolve.ts (138):**
  - **Deleted:** `idsByExactTitle` and `spacesByTitle` 31-42 (into the lookup), `resolveTreeContextKeys` 67-74.
  - **Changed:** `resolveContextKeys` 44-65 becomes `(raw, world)`; `reconcileGovernedRoot` 82-120 reads the world's maps; `GovernedWorld` 23-27.
  - **Added:** `contextWorldOf(groups)`, here or in its own module.
  - **Non-test importers:** `resolveContextKeys` in readNexus.ts; `resolveTreeContextKeys` in pageRow.ts; `GovernedWorld` in contextWrite.ts, restoreScrub.ts, Nexus/page.ts, governedWrite.ts and repairSweep.ts; `reconcileGovernedRoot` in contextWrite.ts, restoreScrub.ts, governedWrite.ts and repairSweep.ts; `NO_DEFS` in contextWrite.ts, restoreScrub.ts and assignment.ts.
- **Contexts/contextCascade.ts (361):** `renameContextOp`'s failure arm (242-253) changes; `renameSpaceOp` (260-296) reads the lookup; `replayPendingRename` (298-361) gains the delete arm, or a sibling replayer does. Importers: Nexus/handlers.ts (`replayPendingRename`), Trash/delete.ts (`unlinkContextKey`, `unlinkSpaceValue`).
- **Contexts/contextJournal.ts (49):** `RenameJournal` (7-14) joins a delete record in one union, and `decode` (16-34), `same` and `sameEntity` (36-43) learn it. Importer: contextCascade.ts.
- **Contexts/contextIdentity.ts (75):** unchanged unless `identityOf` reads the lookup. `contextOptions.ts:6` still caches per tree object and can rekey on the slice.
- **Properties/setProperty.ts (59):** `setSpaceProperty` 17-32 reconciles; `setPropertyOp` 34-59 reads the tree world. Importer: Nexus/mutate.ts.
- **Properties/repairSweep.ts (56):** lines 13 and 25-26 go and the world comes from the lookup. Importer: Nexus/handlers.ts.
- **Properties/keyHolders.ts (72):** `confirmedKeyHolders` 22-39 loses 34-37 if the plan takes the tree answer. Importer: registryProperty.ts.
- **Properties/registryProperty.ts (174), optionOps.ts (244), deleteProperty.ts (129):** the journal-write sites at 112, 186, 235 and 91, per the policy chosen.
- **Trash/restoreScrub.ts (104):** `liveWorld` 26-36 goes; `reconciledSidecar` 38-50 takes defs. Importer: Trash/spend.ts.
- **Trash/delete.ts (108):** journal write and clear around 53-102.
- **Nexus/mutate.ts:** 133-134, and 164-165 and 182-186 if the plan widens the lock.
- **Nexus/readNexus.ts:** `resolveEntityContexts` 67-76 and the attach 333-339. Importer of `resolveEntityContexts`: watchPatch.ts.
- **Nexus/create.ts:** 39-49 read the lookup.
- **Properties/pageRow.ts:** 7 and 17.
- **Nexus/handlers.ts:** 81, plus the delete replay's placement.
- **Unchanged:** governedWrite.ts, governedSweep.ts, journalSlot.ts, assignment.ts, propertyCache.ts, contextsRegistry.ts, spaceSidecar.ts and configReach.ts, unless the delete record reuses `goneEdit` by import.

**Tests importing what phase 4 changes (lines):**
- **Contexts:** contextWrite.test.ts (296), contextResolve.test.ts (184), contextCascade.test.ts (666), contextJournal.test.ts (20), contextIdentity.test.ts (135), contextOptions.test.ts (34).
- **Properties:** governedWorldWrite.test.ts (223), setSpaceProperty.test.ts (85), governedWrite.test.ts (185), pageValue.test.ts (120), repairSweep.test.ts (184), keyHolders.test.ts (179), deleteProperty.test.ts (304), pageRow.test.ts (32), Cells/columnLabel.test.ts (57), valueContext.test.ts (42). The journal policy reaches registryProperty.test.ts (253), journalWiring.test.ts (353), optionOps.test.ts (770) and replaySchemaCascade.test.ts (510); nineteen test files import registryProperty.ts, most for `createProperty` setup.
- **Nexus:** mutate.test.ts (2,439), admission.test.ts (330), handlers.test.ts (261), readNexus.test.ts (858), watchPatch.test.ts (787), mutatePatch.test.ts (428), watchSettle.test.ts (128), liveTree.test.ts (142), treeShape.test.ts (76).
- **Trash:** restoreScrub.ts and delete.ts have no direct test importer; they are reached through trashRecovery.test.ts (714), restoreProperty.test.ts (378), deleteOrder.test.ts (327), deleteReach.test.ts (388), spend.test.ts (1,713) and trashRows.test.ts (231).
- **Elsewhere:** Contract/sessionGate.test.ts (49), Index/indexMaintenance.test.ts (304), Views/loadValues.test.ts (126), Interface/Menus/propertyMenuActions.test.ts (237), Desktop/FileWatch/watcher.test.ts (452).

##### Names (Candidates)

- `contextWorldOf(groups)`: new; the one lookup.
- `ContextWorld`: kept, reshaped to the prebuilt maps.
- `loadGovernedWorld` → `governedWorldOf`: it no longer loads.
- `resolveContextKeys(raw, world)`: signature change; absorbs `resolveEntityContexts`' conversion.
- `registryDefsByName(registry)`: new, cached on `tree.registry`; a Space's defs.
- `spaceKeyHolders(groups, key)`: new, only if `confirmedKeyHolders` takes the tree answer; `spaceArm` reads it too.
- `DeleteJournal` beside `RenameJournal` in one `ContextJournal` union: new.
- `replayPendingRename` → `replayContextJournal`: once it replays deletes.

##### Own Plan

No. At this scope phase 4 is one projection and five local fixes over about ten files, all on the Contexts side except the value write, and it needs phase 2's applier only for the identity invariant above. The one piece with design surface is the delete replay (its record, its placement in the open, its meeting with a stranded rename); if it grows past a record variant and one replay arm, it belongs with F-622.

##### Estimate

Phase 4, raw lines at ±25%: about 120 removed (the disk world, drift map, `liveWorld`, two conversions, the per-call index builders) and about 150 added (the projection about 40, the delete record and replay about 55, the journal policy 10-20, the Space reconcile about 15, the reversal, the lock and the in-RMW decision about 10, reshaped types about 15), so roughly flat to +30 net. This slice feeds no other phase's count.

#### Out-of-Slice

- The walk writes `contextValues` onto cached nodes the live tree shares (readNexus.ts:333-339; F-211).
- The replay moves folders without `recordWrite` (contextCascade.ts:323, 357), so the watcher sees an echo.
- The Context and Space delete confirm is a full walk (mutatePatch.ts:119).
- A page value write reads the page three times and parses it five times (setProperty.ts:50; governedWrite.ts:23; indexSeed.ts:134).
- `matrix.json` has two writers with opposite corrupt-file policies (matrixFile.ts:17 vs configReach.ts:379).
- `removeProperty` and `reachConfig` write views without positional-id repair (removeProperty.ts:43-53; configReach.ts:358).
- `contextOptionsFor` caches per tree object while `identityOf` caches per `tree.contexts` (contextOptions.ts:6 vs contextIdentity.ts:24).
- The repair sweep runs concurrently after open, and only `preservedChanges` keeps it safe against a stale world (handlers.ts:98).
- The restore scrub deliberately drops unresolvable tags (restoreScrub.ts:49, 84).
- The Contexts-folder lock is in-process only.
- `createContextGroup` runs `mkdir` without an echo record (contextWrite.ts:240; F-205).
- `properties.json` merges per def on Sync, while `contexts.json` merges its whole list (propertiesRegistry.ts:95; F-605).

#### Confidence

- **High:** every file:line citation (re-read at `d7d00240d`) and the parse and read counts, which come from following the call chains.
- **Medium:** the Contexts-lock race and the Context-delete crash window, both reasoned from the code and not run.
- **Low to medium:** the LOC survival estimates and phase 4's count, which are judgment calls; treat them as ±25% per file.
- **Not checked:** whether `openStores` reuses the index store when the same root reopens. If it does, the replay may get index answers on a reopen.
