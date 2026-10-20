### Archive — Planning Scout Reports

**DATE:** 10-19-2026
**HEAD:** verified at `d880179b6` through `c22cfe847`; the two later commits touch only `Core/MarkdownPM/`.

The five planning scouts' reports, written for *Archive — Implementation Plan* against the decision log's folder model. Each re-verified the claims of *Archive — Investigation* (itself verified at `213f95a3b`) at its own HEAD and settled the Planner's Calls of its lane with evidence. *Archive — Planning Findings* is the reconciled reading of these five and governs where they disagree. Lanes: 1 reach, index admission, the by-id map, counts, and discovery; 2 the Trash's data layer, the neutral owner, the origin record, placement, and orphans; 3 the lift, the crash-safe carry, and F-6's observation point; 4 ArchiveView, the archive place, the shared browser, the entry, the menus, and scale; 5 ActionLabel, the transform, the reader window, the archive history timeframe, settings, confirmations, and the Undo.

---

### Archive Planning — Scout 1: Reach, Index Admission, the By-ID Map, Counts, and Discovery

**DATE:** 10-19-2026
**HEAD:** `c22cfe847`. The brief named `d880179b6`; the two commits since touch only `Core/MarkdownPM/` and `.claude/Features/MarkdownPM.md`, so every file in this lane is byte-identical to `d880179b6`. Every citation is `path:line` at HEAD.

This report re-verifies the Investigation's claims in the reach lane, settles the ten Planner's Calls, and adds what the lane found that the Investigation didn't. The headline finding is in *§Planner's Calls › 5*: every refill and restore scrub reads "does this page still exist?" from the tree alone, so a Link value naming an archived page is dropped whenever it passes through one. The by-id map as the Investigation shaped it doesn't reach that, and closing it reshapes Call 5.

---

#### Verified at HEAD

##### The Hidden-Folder Rule

- **Confirmed:** `hiddenName` (`Core/Paths/exclusion.ts:17-19`), `hiddenFolder` (`:22-24`), `neverWatched` (`:27-36`, doc `:26`), `manifestAdmits` (`:44-61`), `outsideContent` (`:77-82`, doc `:76`).
- **Confirmed:** `NON_CORPUS_TOP` (`Core/Paths/nexusPaths.ts:7-8`) has one reader, `nexusFolderRefusal` (`Core/Settings/codec.ts:51`, inside `:42-53`), and its comment is false.
- **Extended:** `nexusFolderRefusal` also guards the asset directory (`readAssetDirectoryLeaf`, `codec.ts:55-58`), so the set means "the app's own top folders, which no setting may name", for exclusions and the asset directory alike.
- **Confirmed, Lines Drifted:** the tree and discovery callers of `outsideContent` are `readNexus.ts:160`, `:328`; `adopt.ts:165`, `:183`; `folderKind.ts:102`; `folderEntity.ts:26`; `fileEvents.ts:515`. Every one starts from a root entry or a tree container, so none can name a path inside `.nexus`.
- **Confirmed:** the reach callers are `walk.ts:81` (`corpusFilesUnder`, `:73-83`, feeding `nexusCorpus` `Core/Index/indexSeed.ts:74-76`, `folderCorpus` `:84-87`, and the seed `:225`), `relCorpusPath` (`indexSeed.ts:89-93`, under `indexWrittenPage` `:121-143`, `deindexPath` `:166-173`, `moveIndexPaths` `:175-190`), Clear Exclusion Cache (`exclusionScan.ts:46-47`), and the asset migration's sidecar walk (`assetMigrate.ts:161`).
- **Confirmed and Extended:** the direct `hiddenFolder` callers are `fileEvents.ts:252`, `:264`; `walk.ts:36`, `:48`; `restoreScrub.ts:130`; `names.ts:26`; `assetRoots.ts:49`; `assetDirValidate.ts:34`; and `exclusionScan.ts:42`, which the Investigation didn't list.
- **Confirmed:** `listPathsUnder` admits each directory before entering it (`walk.ts:53-71`) and seeds its segments from `relative(root, absDir)` (`:69`), so a walk started at the archive root hands `outsideContent` full Nexus-relative paths.

##### Where `.nexus/archive/` Stands

- **Confirmed:** it's watched through `syncIgnoredUnder` → `neverWatched` (`Desktop/FileWatch/watcher.ts:55-65`) and admitted by `manifestAdmits` (`exclusion.ts:59`). An in-app move through `relocate` (`Core/Files/atomicWrite.ts:62-75`) is a rename on the wire when both ends are admitted (`feedRename`, `Core/Sync/Client/tap.ts:64-75`).
- **Confirmed:** the tree ignores it. `classifyEvent`'s `.nexus` branch spans `fileEvents.ts:227-249` and falls through to `'ignored'` at `:241`, and `tileHostAt` matches tree boards only (`Core/Tiles/tileHosts.ts:56-62`).
- **Corrected Lines:** `applyMove` is `fileEvents.ts:570-590`. Its `.nexus` check sits inside the in-place branch (`:579-582`, at `:580`), and the unlink-plus-add fallback is `:586-589`.
- **Confirmed:** `indexEvent` (`fileEvents.ts:273-298`) runs first for every event (`applyEvents`, `:655`) and for own events with no tree (`Core/Nexus/settle.ts:52`).

##### Cascade Reach

- **Confirmed:** governed reach is `keyHolders.ts:12-18` and `:21-39` through `corpusUnder` (`indexSeed.ts:78-82`, whose only callers are `keyHolders.ts:17` and `:28`), scoped by `collectionFolders` (`Core/Properties/assignment.ts:152-156`) at six sites (`optionOps.ts:197`; `registryProperty.ts:112`, `:126`; `deleteProperty.ts:82`, `:99`; `replaySchemaCascade.ts:56`), with Remove's one folder at `removeProperty.ts:36-38`.
- **Corrected Lines:** `collectionFolders`' sidecar role is the snapshot (`deleteProperty.ts:44-54`), `unassignAndPurge` (`:144-153`, called at `:135`), and replay (`replaySchemaCascade.ts:56-62`).
- **Confirmed:** content reach is `cascade.ts:87` (the delete) and `:221`, plus `contextCascade.ts:72`. The heading arm's `?? []` is `cascade.ts:222`.
- **Corrected Lines:** the delete strip's tree filter is `cascade.ts:101-106` and its twin branch `:107-121`.
- **Confirmed:** `reachConfig` is `configReach.ts:319-381`, with `containersOf` at `:312-317`, the sidecar loop at `:342-348`, and the tiles' `sources` at `:350-354`.
- **Confirmed:** counts run through `property:holders` (`Core/Properties/handlers.ts:199-208`) into `sweepCount` (`governedSweep.ts:113-114`) from `optionOps.ts:332`, `:359`, `registryProperty.ts:168`, and `deleteProperty.ts:83`, rendered by `askHolding` (`Core/Interface/Confirm/confirmations.ts:109-118`).
- **Confirmed:** `owningCollection` is `Core/Nexus/treePatch.ts:83-91` and `containerSchema` is `:96-99`, called by `repairSweep.ts:27`, `contextWrite.ts:77`, `spend.ts:191`, and `PropertyPanel.tsx:161`, `:265`.
- **Extended:** the other callers are `SettingsFrame.tsx:54`, plus `containerSchema` at `ViewMenu.tsx:34`, `useViewHost.ts:60`, `ViewTile.tsx:259`, `tilesFile.ts:85`, `entityMenuActions.ts:64`, `fileEvents.ts:432-433`, and `optionOps.ts:127`. Each is handed a tree node or a live path. Only `repairSweep.ts:27` ever meets an archived path, through the seed's re-read rels once the corpus holds the Archive.

##### By-ID Reach

- **Confirmed:** the refill sites are `assignment.ts:81` (filter `:82-86`), `spend.ts:250` (used at `:272`, `:282`, `:298-301`, titles at `:320`), and `restoreProperty.ts:57` (filter `:60-69`, titles `:72`). `id-live` reads it at `resolve.ts:36-38`.
- **Confirmed:** the gap. `spend.ts:299-301` hands `refillTrashed` (`holdings.ts:144-162`) every id outside `roots`, `reapply` drops them (`spend.ts:335`), the reassign keeps them cached (`assignment.ts:98-102`), and the property restore filters them out (`restoreProperty.ts:61-62`).
- **Corrected:** "It answers null until the index is ready" (*Archive — Investigation*, `:68`, and the Concern at `:336`) is false. `readIndexedStats` (`Core/Index/contentIndex.ts:92-94`) answers through `queried` (`:50-58`) and never through `queryPaths`' readiness gate (`:60-63`). Before the seed it answers the rows the store persisted from the last session, and it answers null only when no store is installed. `Desktop/Store/stores.ts:180-187` and `IndexedStat` (`Core/Platform/stores.ts:30-35`) are as cited.
- **Confirmed:** the live lookups are `heldPages.ts:16-28`, read by `settle.ts:87`, `:277`, `:287`; `loadValues.ts:15`; `fileHistory.ts:89`, `:117`, `:136`, `:174`; and `captures.ts:16`.
- **Extended:** `idHeld` (`heldPages.ts:30-33`) has two more readers, `adopt.ts:138` and `pageMetadata.ts:120`.

##### Discovery

- **Confirmed:** `pageIndexOf(tree)` serves `Core/Session/pageConnections.ts:30` and `record.ts:78`; `matrixTree` reads `tree.collections` (`matrixInput.ts:33`); `buildGraph`'s `link` drops any edge without both nodes (`Engine/graph.ts:78-83`); `searchEntriesOf` is at `treeIndex.ts:145`; and `reconcileSelection.ts:30-41` keeps only withheld paths alive.
- **Confirmed, Lines Drifted:** the three whole-index reads are `matrixGraph.ts:19-43` (the no-path read at `:20`), `Core/Nexus/handlers.ts:167-169`, and `loadValues.ts:8-18`.
- **Extended:** once the Archive is indexed, archived paths reach the renderer's two asks as well. `pages:changed` names every file a cascade wrote (`settle.ts:171`), archived ones included, and the renderer re-asks the headings and the Matrix for exactly those paths (`Core/Session/useBridgeSubscriptions.ts:84-87`).

##### Moves and the Settle

- **Confirmed:** `relocate` (`atomicWrite.ts:62-75`), `moveIndexPaths` (`indexSeed.ts:175-190`), `addressed` (`Core/Nexus/mutate.ts:89-113`), `settledIndex` (`settle.ts:242-246`), `changesSettled` (`mutateRequest.ts:139-147`), the restore running outside `addressed` (`mutate.ts:134-135`), and `payOutsideMoves` (`settle.ts:270-292`).

---

#### Planner's Calls

##### 1. The Single Exception (B-1)

**Recommendation:** use shape (b) with one refinement. The arm admits `.nexus/archive` itself, along with everything under it whose segments below it pass the hidden rule, and `.nexus` stays hidden. The corpus walk starts at a second root.

```ts
// Core/Paths/nexusPaths.ts
const ARCHIVE_DIRNAME = 'archive'
export const ARCHIVE_DIR_REL = `${NEXUS_DIR}/${ARCHIVE_DIRNAME}`
/** A path's segments below the Archive, the one hidden folder read as content; null for any path outside it. */
export const archiveSegs = (segs: readonly string[]): readonly string[] | null =>
  segs[0] === NEXUS_DIR && segs[1] === ARCHIVE_DIRNAME ? segs.slice(2) : null

// Core/Paths/exclusion.ts:79
if ((archiveSegs(segs) ?? segs).some(hiddenFolder)) return 'hidden'

// Core/Files/walk.ts:41-43
export async function corpusFiles(root: string, scope: WatchScope): Promise<string[]> {
  return [
    ...(await corpusFilesUnder(root, root, scope)),
    ...(await corpusFilesUnder(root, join(root, ARCHIVE_DIR_REL), scope)),
  ]
}
```

**Evidence:**

- `.nexus` alone (`['.nexus']`) still answers `'hidden'`, so the walk from the root never enters `.nexus`, and none of the tree and adoption callers can name a path under it, since each starts from a root entry or a tree container (*§Verified at HEAD*).
- The refinement covers a hand removal of `.nexus/archive`. If the watcher reports it as one `unlinkDir`, `deindexPath` (`indexSeed.ts:166-173`) asks `relCorpusPath` (`:89-93`). Under "strictly inside" that answers null, and every archived row stands until the next seed prunes it (`:251-252`). Admitting the root costs nothing: `listPathsUnder` never calls `admit` on its own starting directory (`walk.ts:69`).
- With the arm and the second root, the enumerators behave as stated, at the lines above:
  - **Index Maintenance:** `relCorpusPath` admits archived paths. `moveIndexPaths` renames rows on an archive move, and its `!oldRel` branch (`indexSeed.ts:182-185`) indexes a landing from outside the corpus.
  - **The Seed and Every `?? nexusCorpus` Fallback:** these walk the Archive through `corpusFiles`. The asset migration's page list (`assetMigrate.ts:135`) does too.
  - **The Watcher and Sync:** both already admit it.
  - **The Classifier:** it ignores the Archive for the tree.
  - **Clear Exclusion Cache, the Trash's Lister and Scrub, and the Exclusion List:** unaffected.
- **Enumerators the Table Missed:**
  - **The Asset Migration's Sidecar Walk:** `sidecarsUnder` (`assetMigrate.ts:158-165`) starts only at the root, so archived Sets' banners and icons would keep links to legacy files the migration trashes. It needs the second root, like `corpusFiles`. The Investigation's table names the problem but not a mechanism; *§Removal & Consolidation* hoists the walker so `reachConfig` (Call 6) shares it.
  - **`normalizeSavedViews`:** it walks `.trash` sidecars and the tile documents only (`Core/Nexus/migrateConfig.ts:45-53`), because tree containers ride `stampFolder` (`adopt.ts:102-115`, `:158`). An archived Set's sidecar rides neither. Today that's inert, since only an app that already normalizes can write one, but the walk's stated scope ("every sidecar the adoption pass doesn't reach") gains a member. Adding the archive root beside `.trash` costs +1 and is a Take Along.
  - **`registerHeldOptions`:** it reads tree containers only (`optionOps.ts:120-123`). An archived page's unregistered Multi-Select members register when it returns, because the landing's add owes a value (`fileEvents.ts:386`) that the settle hands over (`settle.ts:159-160`). That's correct, and nothing changes.
  - **The Stamping Passes and the Remint Ledger:** `stampAdopted` and `stampMissing` (`adopt.ts:133-147`, `:176-195`) and the remint ledger (`remintLedger.ts:21-60`) never see the Archive. A file dropped into it by hand without an ID stays ID-less, which `keyedHolders` already handles by keeping it out of the strip (`keyHolders.ts:62-64`). An id held by both a tree page and an archived page has no adjudicator; Call 4 covers it.
  - **The Frozen Worlds:** these aren't enumerators but every refill's "what still exists" read; Call 5 covers them.
- **Hidden Folders Inside an Archived Set:**
  - **The Path:** `_raw/` in B-1's example sits at `.nexus/archive/<id>/<bundle>/Beta/_raw/…`. `archiveSegs` yields `[<id>, <bundle>, 'Beta', '_raw', …]`, and `hiddenFolder('_raw')` answers `'hidden'`.
  - **What It Keeps It Out Of:** the corpus, `relCorpusPath`, governed reach and content reach (both start from index rows or `corpusFiles`), and the watch and sync. `neverWatched` holds every folder on the way (`exclusion.ts:32-33`), so it's unwatched and unsynced, as inside a live Set. `_raw` as a leaf passes the dot-only leaf rule, as it does today (`exclusion.test.ts:56`).
- **Bundle Folders:**
  - **The Name:** `fileStamp()` produces an ISO stamp (`Core/Trash/bundle.ts:26`) and `stampedLeaf` leads with it (`:28-29`), so every bundle folder starts with a digit. Collection ids come from `newId()` (`Core/Nexus/ids.ts:8-10`) as Crockford ULIDs (`identityMark.ts:14`). Neither ever reads as hidden.
  - **The Exception:** a sidecar id written by hand can be any string (*§Cautionary Items › 3*).

**Alternatives:**

- **Shape (a):** opens every tree caller to `.nexus` and admits `.nexus/interface/homepage/*.md` tile bodies unless the arm narrows again.
- **"Strictly Inside":** the same code with a two-segment minimum, which loses only the root-removal case.

**Cost:** `exclusion.ts` ±0 (one line changed, one import), `walk.ts` +3, and `migrateConfig.ts` +1. The resolver lines are counted in Call 2.

##### 2. The Location Resolver (B-2)

**Recommendation:** the resolver lives in `Core/Paths/nexusPaths.ts`, and there's no `Core/Archive/archivePaths.ts`. It sits beside `METADATA_DIR_REL` (`:21`), `thumbsRel(nexusId)` (`:88-90`), `contextDirRel` (`:101`), and `spaceDirRel` (`:103-104`), which are already the file's id- and title-keyed `.nexus` locations.

```ts
export const archiveDirRel = (collectionId: string): string => `${ARCHIVE_DIR_REL}/${collectionId}`
export const archivedCollectionIdOf = (rel: string): string | null =>
  archiveSegs(rel.split('/'))?.[0] ?? null
```

Together with `ARCHIVE_DIR_REL` and `archiveSegs` from Call 1, that's the whole resolver. Listing what's on disk stays with whoever enumerates:

- **The Corpus and Sidecar Walkers:** their second root lives in `walk.ts`.
- **The Archive Domain:** owns its own bundle listing for ArchiveView and the orphan check, in other lanes.

**Evidence:**

- `exclusion.ts` is in `Core/Paths` and must call `archiveSegs`. A resolver in a feature domain would put the hidden rule's own exception behind an import from `Core/Archive`.
- Of the Investigation's six exports, `contentRoots(root)` has two callers, both in `walk.ts`, and `archiveDirs(root)` has no consumer in this lane. `inArchive` is `archiveSegs`, and `archivedCollectionIdOf` and `archiveDirOf` are the two one-liners above.

**Consumers in This Lane:**

| Consumer | Where | Uses |
| --- | --- | --- |
| The hidden rule | `exclusion.ts:79` | `archiveSegs` |
| The corpus and sidecar walkers | `walk.ts:41-43`; the hoisted `sidecarsUnder` | `ARCHIVE_DIR_REL` |
| The saved-view migration | `migrateConfig.ts:47` | `ARCHIVE_DIR_REL` |
| Governed reach | `keyHolders.ts` (Call 3) | `ARCHIVE_DIR_REL`, `archiveDirRel` |
| `owningCollection` | `treePatch.ts:83-91` | `archivedCollectionIdOf` |
| Configuration reach | `configReach.ts:312-317` (Call 6) | `ARCHIVE_DIR_REL`, `archiveDirRel` |
| `sweepCount` | `governedSweep.ts:113-114` (Call 7) | `archivedCollectionIdOf` |
| The by-id map and world | `heldPages.ts` (Call 5) | `ARCHIVE_DIR_REL` |

**Consumers in Other Lanes:** the archive, unarchive, and delete-from-archive ops; ArchiveView's listing; F-4's disposal in `emptyBundle` and the system-trash delete; F-5's orphan check; F-6's carry; and J-1's history sweep.

**`owningCollection`'s Arm:**

```ts
export function owningCollection(tree, of) {
  if (typeof of !== 'string' && of.kind === 'collection') return of
  const path = typeof of === 'string' ? of : of.path
  const filed = archivedCollectionIdOf(path)
  if (filed !== null) return tree?.collections.find((c) => c.id === filed)
  return tree?.collections.find((c) => c.path === path.split('/', 1)[0])
}
```

The arm closes `containerSchema` (`:96-99`), and through it every schema reader. At HEAD the only one that meets archived paths is `repairSweep.ts:27-31`. It reaches `assignedDefs` (`assignment.ts:33-46`), which reads the held Collection's schema. A Collection that's trashed, excluded, or damaged answers `undefined`, and `assignedDefs(root, null)` is empty (`:37`). The re-read then reconciles Context keys alone, and a live reconcile never shrinks or blanks a value (`Core/Contexts/contextResolve.ts:119-123`), so that path is safe.

**Bundle-Shaped Paths:** the arm reads the segment at index 2 at any depth. `.nexus/archive/<id>/<stamp>__Notes.md.<suffix>/Notes.md` and `…/<stamp>__Beta.<suffix>/Beta/Gamma/Notes.md` both answer `<id>`. Nothing else in this lane parses below the id. One request goes to the Origin Record's owner: make the origin path readable without opening a record (Call 5).

**Alternatives:**

- **`Core/Archive/archivePaths.ts` (the Investigation's shape):** loses for the reasons above.
- **`archiveDir(root, id)` Abs Helpers in `Core/Paths/paths.ts`:** every caller already joins `root`, as it does for `c.path`.

**Cost:** `nexusPaths.ts` +6 (with Call 1's two lines) and `treePatch.ts` +2.

##### 3. Governed Reach (C-3)

**Recommendation:** one `governedReach(root, candidates, only?)` in `keyHolders.ts`.

- **Candidates:** any query result, or null for the corpus.
- **The Whole-Nexus Scope:** every Collection folder plus the archive root.
- **One Collection's Scope:** its folder plus `archiveDirRel(id)`.
- **Where the Mapping Happens:** at the scope step. `collectionFolders` keeps its list unchanged for its sidecar role and moves beside governed reach.

`keyHolderFiles` and `corpusUnder` fold in. The delete's Link strip runs on governed reach in place of its tree filter.

**Evidence:**

- **`collectionFolders`' Two Roles Hold:** besides scoping sweeps, it's the snapshot's sidecar list (`deleteProperty.ts:44-54`), `unassignAndPurge`'s (`:135`, `:144-153`), and replay's (`replaySchemaCascade.ts:56-62`). An archive dir appended to it would mark every property delete partial (`:47`) and have `patchSidecar` write a `_pagecollection.json` into the Archive.
- **The Scope Step:** `corpusUnder` (`indexSeed.ts:78-82`), reached only from `keyHolders.ts:17` and `:28`.
- **Damaged Collections:**
  - **Their Folders:** `damagedFolders` (`treePatch.ts:271-274`) covers container-kind unreadables whose sidecar is `'unparsed'`, and `collectionFolders` lists them by path.
  - **Their Archives:** they fall under the archive-root prefix, since an unparsable sidecar has no readable id. So do the Archives of excluded and trashed Collections, which F-1 and F-4 keep in reach while those Collections' own folders sit out of every sweep.
- **Remove Already Holds Its Id:** `removeInner` reads the sidecar at `removeProperty.ts:29`, so its scope needs no second read.

**Resulting `keyHolders.ts`:**

```ts
// Governed reach: a property key means something only where a schema governs it, so its sweeps and the delete's Link strip take candidates under every Collection's folder and every Archive alone, whatever became of the Collection an Archive is filed under; a link or a `<Context>` key is Pommora syntax wherever it's written, and its sweeps take the whole corpus.

/** One Collection's reach, its folder and its Archive; Remove is the one sweep scoped to it. */
export interface OneCollection { folder: string; id: string | undefined }

export async function collectionFolders(root: string): Promise<string[]> { /* moved from assignment.ts:152-156 */ }

export async function governedReach(
  root: string,
  candidates: string[] | null,
  only?: OneCollection,
): Promise<string[]> {
  const scope = only
    ? [only.folder, ...(only.id ? [join(root, archiveDirRel(only.id))] : [])]
    : [...(await collectionFolders(root)), join(root, ARCHIVE_DIR_REL)]
  return (candidates ?? (await nexusCorpus(root)))
    .map((rel) => join(root, rel))
    .filter((abs) => scope.some((dir) => abs.startsWith(`${dir}/`)))
}

export async function confirmedKeyHolders(root: string, key: string, only?: OneCollection) {
  const indexed = queryKeyHolders(key)
  for (const file of await governedReach(root, indexed, only)) /* unchanged */
  /* the Space loop, unchanged */
}

export async function keyedHolders(files: string[], key: string, byId: NexusIds) /* Call 4 */
```

**What Each Caller Becomes:**

- **The Whole-Nexus Callers:** `optionOps.ts:197`, `registryProperty.ts:112`, and `deleteProperty.ts:123` call `governedReach(root, queryKeyHolders(key))`.
- **Remove:** `removeProperty.ts:37` calls it with `{ folder: collectionFolder, id: asString(sidecar?.id) }`.
- **`bothKeyHolders`:** drops its `collectionFolders` line (`registryProperty.ts:126`), since `confirmedKeyHolders` scopes itself. Its from-disk loop rides the same scope.
- **`deletePlan`:** becomes `deletePlan(root, propertyId, key)` (`deleteProperty.ts:117-126`), and `propertyHolders` (`:82`) stops calling `collectionFolders`.
- **`deleteInner` and Replay:** both keep `folders` for the sidecar role (`deleteProperty.ts:99-106`; `replaySchemaCascade.ts:56-62`).

**Resulting `deleteCascade` (`cascade.ts:72-146`):**

```ts
/** A delete strips every Link property value naming a page it took, by any key that now resolves to nothing, from the governed pages, live and archived, and the Spaces outside it; a key a page outside still answers is left to that page, and bodies keep their links and read unresolved. Nothing at or under `abs` is swept, since it left with the delete, and a page whose id two files claim is left as it was, since a restore couldn't tell them apart. */
export async function deleteCascade(root, abs, paths) {
  const deleted = relative(root, abs)
  const inside = (rel: string): boolean => isAtOrUnder(rel, deleted)
  const tree = heldTreeOf(root)
  /* `after` and `gone`: unchanged (`:81-83`), tree-only by D-1 (Call 5) */
  const { byId } = await nexusPages(root, tree) // Call 5
  try {
    const defs = byKey(linkDefsOf(tree?.config.registry ?? []))
    if (!defs.size || !gone.size) return { cascade: { pages: [], hosts: [] }, links: [] }
    const files = (await governedReach(root, queryMentions([...gone]))).filter(
      (file) => !inside(relative(root, file)),
    )
    /* goneEntry, named, strip: unchanged */
    let twins = 0
    const swept = await sweepGovernedRoots(root, files, {
      raw: (raw, file) => {
        if (named(raw).length && byId.get(asString(raw[ID_KEY]) ?? '') === null) {
          twins++
          return null
        }
        return strip(raw, file)
      },
      ...spaceArm(tree, strip),
    })
    /* links and the report: unchanged */
```

**What Leaves:**

- **Code:** the `held`, `withheld`, and filter lines (`:101-106`) and the four-part twin condition (`:110-116`).
- **Imports:** `withheldIn` (`:19`) and `liveIdIndex` and `livePathOf` (`:32`). `nexusCorpus` stays for `:221`.
- **What `withheldIn` Keeps:** two callers, `treeIndex.ts:119` and `remintLedger.ts:41`.

**Behavior Changes:**

- **C-2:** archived holders are stripped.
- **Root Folders Withheld for Other Reasons:** a root folder listed unreadable for a reason other than `'unparsed'` (`missing`, `malformed`, `contradicting`), or a withheld Agenda folder, was stripped through `withheldIn` and no longer is, matching every property sweep. Missing sidecars are stamped at open (`handlers.ts:90-98`), so this is a mid-session window.
- **No Held Tree:** the strip now reaches Collections through `liveTreeOf`, where today it swept nothing because `liveIdIndex` was empty. `deleteOp` reads `liveTreeOf` first (`delete.ts:37`), so this is a corner.
- **Tests:** `deleteReach.test.ts:113` (the loose linker) and `cascade.test.ts:586` (a loose file) stay true.

**Alternatives:**

- **The Mapping in `collectionFolders`:** wrong for the sidecar role.
- **A Per-Collection Mapping Through Tree Ids:** misses the Archives of damaged, trashed, and excluded Collections.
- **Passing `folders` Everywhere:** the Investigation's `governedReach(root, key, folders?)`. The whole-Nexus callers would keep composing the same scope six times.

**Cost:**

| File | Change | Lines |
| --- | --- | --- |
| `keyHolders.ts` | `governedReach` and `OneCollection` in, `keyHolderFiles` out, `collectionFolders` moved in | +11 / −7 |
| `indexSeed.ts` | `corpusUnder` out | −5 |
| `assignment.ts` | `collectionFolders` moved out | −5 |
| `cascade.ts` | The filter and twin branch out, governed reach in | +5 / −14 |
| `registryProperty.ts`, `deleteProperty.ts` | The redundant `collectionFolders` calls and `deletePlan`'s parameter out | −3 |
| **Net** | | **about −18** |

##### 4. One Twin Rule

**Recommendation:** one rule, *none wins*. An id two files claim can't be addressed by id: no strip that files values by id touches either claimant, and no refill writes either. The authority is one map over the tree and the Archive, in which null marks an id two files claim, as `writablePathsOf` already does (`heldPages.ts:8-13`). `keyedHolders` and `deleteCascade` ask `byId.get(id) === null`, and every refill receives the same map (Call 5).

- **Ids the Map Doesn't Hold:** an id the map doesn't hold at all is stripped as today and falls to each refill's existing absent path. That covers a withheld page, a loose page, and an unstamped id.
- **Sweeps That File Nothing:** renames and option rewrites file nothing by id, so they rewrite both claimants, rightly, and are unchanged.

**Evidence:** four rules exist today, not three.

| Rule | Where | Consumers | Pinned By |
| --- | --- | --- | --- |
| First listed, in tree order | `recordById`, `Core/Nexus/record.ts:48-56` | The three refills (`assignment.ts:81`, `spend.ts:250`, `restoreProperty.ts:57`) and `id-live` (`resolve.ts:36`) | No test. `spend.test.ts:1287` and `:1373` concern title namesakes, not shared ids. |
| None wins | `writablePathsOf`, `heldPages.ts:8-13` | `livePathOf` and `idHeld`: the delete's twin branch, `loadValues`, file history, `payOutsideMoves`, `adopt.ts:138`, and `pageMetadata.ts:120` | `heldPages.test.ts:54` ("an id two files claim answers no path to a writer") |
| First claimant, in path order | `keyedHolders`, `keyHolders.ts:61-64`; the order is `queryKeyHolders`' `ORDER BY path` (`stores.ts:164`) or the corpus walk | Remove (`removeProperty.ts:36`) and the property delete's count, run, and replay (`deleteProperty.ts:123` via `deletePlan`) | No test pins the twin branch. `replaySchemaCascade.test.ts:253` pins the ID-less holder. |
| None wins, exempting withheld files | `deleteCascade`, `cascade.ts:107-121` | Every page, Set, and Collection delete and `emptyBundle` | `deleteReach.test.ts:125` ("leaves two linkers sharing one ID as they were, since a restore couldn't tell them apart") |

**Today's Divergence:** Remove strips the claimant first in path order and caches its value under the id. The reassign refill then writes that value into `recordById`'s claimant, which comes first in tree order and can be the other file. One rule closes this.

**Why None Wins:**

- **It's the Rule the Code Already States:** a filed value is a promise its refill keeps, so an id that can't name one file can't take one. That's `deleteReach.test.ts:125`'s stated reason and `heldPages.ts:8`'s writer rule ("a file writer refuses it").
- **It Needs No Shared Order:** none wins depends on no order at all.

**Behavior Changes:**

1. **Remove and the Property Delete Hold Both Claimants Out:** today the first is stripped. The record or cache reads partial.
2. **A Refill Whose Id Became Shared Since Its Strip Writes Neither:** today the first listed takes it.
   - **The Reassign:** keeps the value cached (`assignment.ts:98-102`), so it lands once the twin resolves.
   - **The Trash Link Refill, Re-Tag, and Property Restore:** handle it as they handle any absent id today: `refillTrashed` finds no holder, `reapply` drops it as "a root gone since", and the property restore filters it out.
3. **Two Withheld Files Sharing an Id:** `keyedHolders`' local `seen` (`:51`) also caught these, and the map doesn't know them. Both are stripped and the later value is filed, matching `deleteCascade`'s existing withheld exemption (`cascade.ts:115`).

**Alternatives:**

- **(B) First Wins in the Map's Order:** strip only the file the map names. It needs one order shared by the index (path order) and the tree, and it contradicts `deleteReach.test.ts:125`'s stated reason.
- **(C) A Local Count Beside the Map:** keep `keyedHolders`' local claimant count as well, so none wins over the files in hand plus the map's claimants. It costs +3 and covers withheld twins, but it's a second mechanism for one rule, earned only if a Finder copy inside a folder whose sidecar doesn't parse proves real.
- **`id-live`:** the same map can serve `id-live`, with the restoring file's own path excepted (*§Cautionary Items › 2*).

**Cost:** `keyedHolders` +1 / −3. The `deleteCascade` lines are counted in Call 3.

##### 5. The By-ID Map, and the World Every Refill Reads

**Recommendation:** one host-side projection in `heldPages.ts` of the Nexus's pages wherever they live, the held tree's and the Archive's, read at every refill site and by the delete. It answers two things:

- **`byId`:** a `ReadonlyMap<string, EntityRecord | null>` over the tree's pages and Spaces and the Archive's pages, with null marking a twin (Call 4). It's handed to `sweepRootsById` in place of `recordById(tree)`.
- **`pages`:** the tree's pages and the Archive's as one `ConnPage[]`. It's handed to every `frozenWorld` in place of `pageIndexOf(tree)`. The delete's `after` doesn't take it (below).

Archived entries come from `readIndexedStats(ARCHIVE_DIR_REL)`, path to id, with titles from the filename. Each half carries its own path:

- **`byId`:** keeps the archive path, since it's the write address `sweepRootsById` opens and the path `owningCollection`'s arm reads.
- **`pages`:** carries whichever path the Origin Record makes readable, the archive path until that's settled (*§The Residue*).

Discovery, meaning resolution, suggestions, search, and the Matrix, keeps reading `pageIndexOf(tree)`. The distinction is stated once, at the projection: "exists in the Nexus" for writes and restores, "is discoverable" for everything a user finds.

```ts
/** Every page a host write can address and every page a restore treats as still there: the held tree's and the Archive's. Null marks an id two files claim, which a writer refuses. What a user can find reads the tree alone. */
export async function nexusPages(
  root: string,
  tree: NexusTree | null,
): Promise<{ pages: ConnPage[]; byId: ReadonlyMap<string, EntityRecord | null> }>
```

**Evidence:**

- **The Four Refill Gaps Close:** these are the Link refill (`spend.ts:298-301`), the Context and Space re-tag (`:272`, `:282`, `:335`), the reassign refill (`assignment.ts:81-86`), and the property restore (`restoreProperty.ts:57-62`). `refillTrashed` then receives only ids found nowhere, its stated purpose (`holdings.ts:143`).
- **The Reassign Filter:** it filters members by `live[id].path.startsWith(under)` (`assignment.ts:79`, `:84`), which an archived path never passes. It becomes `owningCollection(tree, r.path)?.path === relative(root, collectionFolder)` through Call 2's arm, one test for live and archived pages. The reassign always targets a live Collection, so the tree holds it.
- **The Finding the Investigation Missed: the Frozen World Is Tree-Only.**
  - **Where It's Read:** `frozenWorld(index)` answers `holds(title)` from `index.holders(title)` (`Core/Properties/propertyValue.ts:187-197`), and `gonePageEntry` drops any Link entry it doesn't hold (`:199-208`). All four call sites hand it the tree: `assignment.ts:87`, `spend.ts:186` (tree plus the returning pages), `spend.ts:290`, and `restoreProperty.ts:58`. The restore scrub reads it at `restoreScrub.ts:154` and `:169`.
  - **What It Drops:** a Link value naming an archived page reads as gone at each site. It's parked (`parkLinks`, `holdings.ts:98-109`), finds no Trash holder, and is silently dropped. That's a cached value at a reassign, a returning page's own value at a Trash restore, a stripped value at the Link refill, and a value at the property restore, each contradicting D-1 ("Link property values naming it should stay in place and resolve again on its restore").
  - **What Closes It:** the union `pages` above, with no new mechanism, since `frozenWorld` already takes any `PageIndex`.
  - **What It Answers:** `buildPageIndex` files a page under `pageKey(p.title)` (`Core/Connections/pageIndex.ts:68-75`), and `connPage` takes the title from the path's leaf (`:19-22`), so an archived entry answers its title. A key holding `/` matches a tail of the stored path (`:88-95`), so a page inside an archived Set answers the tails up to its Set's folder, and a page archived alone answers none.
- **The Delete's `after` Stays Tree-Only:**
  - **Why:** `gone` is built from the deleted page's own keys alone (`cascade.ts:83`), so an archived page's key can meet it only when the deleted live page is that page's namesake.
  - **What D-1 Says:** D-1 has already ruled on that case: "Title-only links that landed on a namesake while the page was archived stay with the namesake when it returns." Such a `[[Notes]]` is the namesake's, and stripping it with the namesake's delete is right.
  - **Why the World Differs:** a union `after` would keep it dangling, then hand it to the archived page on its return. The frozen worlds differ because a refill asks whether a page is *gone*, and an archived page isn't.
- **The "Index Not Ready" Window Doesn't Exist for Writes:**
  - **During an Adoption:** every write answers BUSY while an adoption runs (`withWriteRoot`, `Core/Contract/handlers.ts:99-111`; `whileAdopting`, `Core/Nexus/session.ts:15-23`; `adoptNexus`, `handlers.ts:116-125`), and the seed runs inside it (`handlers.ts:104`).
  - **At Launch:** the one direct `openNexusSequence` (`Desktop/main.ts:389`) completes before `createWindow()` (`:405`) and `watchNexus()` (`:408`).
  - **After a Failed Seed:** the store is present (`indexSeed.ts:255-258`), and `readIndexedStats` still answers, since it ignores readiness (*§Verified at HEAD › By-ID Reach*).
  - **No Store:** the only concrete null is a session with no store at all (*§Cautionary Items › 1*).
- **The Live Lookups Stay Tree-Only:** `livePathOf`, `liveIdIndex`, `liveIdOf`, and `idHeld` (`heldPages.ts:16-33`) keep serving the outside-move pairing (`settle.ts:277`, `:287`), `valueChangesOf` (`:87`), `loadValues` (`:15`), file history (`fileHistory.ts:89`, `:117`, `:136`, `:174`), sync captures (`captures.ts:16`), stamping (`adopt.ts:138`), and the metadata drop (`pageMetadata.ts:120`). Widening `livePathOf` would pair an archive move as an ordinary move and re-spell inbound links into the Archive (`settle.ts:270-292`).

**The Residue: Path Keys Need Origin Paths.**

- **What the Archive Path Covers:** an archived entry at its archive path answers title keys, and the keys a delete recorded in `targets`, which `frozenWorld` resolves by id (`propertyValue.ts:193-194`).
- **What It Misses:** it doesn't answer an unrecorded path key naming the origin chain. `[[Beta/Notes]]` naming a page archived alone fails, because the tails of `.nexus/archive/<id>/<stamp>__Notes.md.<suffix>/Notes.md` never spell `Beta/Notes`.
- **What Closes It:** archived entries in `pages` placed at their origin paths. How the origin path is read is the Origin Record's call (Open Item 1).
  - **A Flat Layout:** costs one record read per bundle per call. That's affordable, since `pages` is read only at the reassign, Trash-restore, and property-restore sites, never on a delete.
  - **A Chain-Mirrored Layout:** filing each bundle under its origin chain, as `.trash` does (`trashChainDir`, `bundle.ts:13-20`), makes the origin path algebra (`deletedPathOf`, `bundle.ts:22-24`), and the index alone then places every archived page at its origin.
  - **Who Else Reads It:** whichever layout is chosen, the same reading serves the unarchive's relink (Call 9), G-2's "where it lived", and the ancestry reading behind F-6 and G-4, so it's one reading for four consumers.

**Alternatives:**

- **Widening `livePathOf` and `liveIdIndex` in Place:** loses for the reason above.
- **A By-ID Map Without the World:** the Investigation's shape, which leaves D-1 broken at every frozen world.
- **A Union `after` in the Delete:** contradicts D-1's namesake ruling (above).
- **An Index Flag or a Separate Archive Table:** a second notion of "indexed" for a fact the path already carries.

**Cost:**

| Change | Lines |
| --- | --- |
| `heldPages.ts`: the archived pages from the index, the union, the null-on-twin map, and its doc | +14 |
| `sweepRootsById` and `refillValues` take the map (`governedSweep.ts:151-175`, `assignment.ts:49-63`) | ±0 |
| The four sites, each swapping two lines for one call | +1 (the post-landing refill world at `spend.ts:290`) |
| `deleteCascade` | counted in Call 3 |
| **Net, Before the Fallback** | **about +15** |

##### 6. Configuration Reach (C-1)

**Recommendation:** confirmed. `reachConfig`'s container list gains the archived Sets' sidecars, listed by the hoisted sidecar walker.

- **The Whole-Nexus Edits:** walk from `ARCHIVE_DIR_REL`.
- **The Scoped Edits:** walk from `archiveDirRel(id)`, for the Collection the `under` folder names in `tree.collections`.
- **Ids:** each sidecar's id is captured from the same read and joins `sources`, so tiles sourced from an archived Set take the scoped edits.

**Evidence:**

- **Which Edits Reach Them:** `reachConfig` writes option-label edits, property clears, and gone ids into views (`configReach.ts:91-96`).
- **What an Unreached Set Returns With:** an archived Set's `_pageset.json` holds its own views. Without reach, a restored Set returns with filters and groups naming renamed labels, which C-1's "a restore returns a page that's already current" rules out.
- **The Two Scoped Callers:** Remove (`removeProperty.ts:54`) and a Set leaving its Collection (`move.ts:65`).
- **Tiles:** tiles narrow by container id (`configReach.ts:350-354`), so a View Tile sourced from an archived Set (left in place under D-1) would miss a scoped edit without the ids.
- **Whole-Nexus Tile Edits:** already reach every tile regardless of source.

**Alternatives:**

- **Deriving Set Folders From the Index's Archived Page Paths:** misses an empty archived Set.
- **Leaving Archived Sets Unreached and Reconciling Views on Restore:** this is Reconcile-on-Restore, which the log rejects for the Archive.

**Cost:** +7 in `configReach.ts` and +1 for the walker's second root. The walker moves from `assetMigrate.ts:158-165` to `walk.ts` with no net change. The walk runs per configuration edit, not on a high-frequency trigger.

##### 7. Counts (C-4)

**Recommendation:** confirmed, with one refinement. Filter the files before the dry run rather than the touched keys after it:

```ts
export const sweepCount = async (root: string, files: string[], plan: SweepPlan): Promise<number> =>
  (await sweepGovernedRoots(root, files.filter((f) => archivedCollectionIdOf(relative(root, f)) === null), plan, true)).touched.size
```

**Evidence:**

- **The Count Is the Same:** Space sidecars come from the plan's own arm (`governedSweep.ts:88-109`), not from `files`, and touched ⊆ files plus sidecars. Filtering the files first means a count never reads archived files.
- **The Rename Clash Keeps Archived Pages:** `bothKeyHolders` (`registryProperty.ts:124-130`) keeps them once `confirmedKeyHolders` rides governed reach (Call 3). Otherwise a rename would silently drop the old value on an archived page holding both keys.
- **The Clash Refusal Prints a Count:** the refusal (`:153-155`) prints `KEY_REFUSAL.held`'s count, "N Items hold both…" (`properties.ts:272-273`), which will include archived holders (*§Questions for Nathan › 1*).
- **The Zero-Count Consequence of C-4:** an option clear or a format rewrite that only archived pages hold counts 0 and runs without asking (`asksPastOne && r.value <= 1`, `confirmations.ts:117`). A property delete or option removal asks with "0 Items" (*§Questions for Nathan › 2*).

**Cost:** +1.

##### 8. K-2's Trims

**Recommendation:** all three are trimmed host-side, against the held tree.

- **`readMatrixGraph`** (`matrixGraph.ts:19-43`): it takes `root` from its handler (`Core/Matrix/handlers.ts:20-23`) and skips each `rows.pages` entry whose path `liveIdIndex(root)` doesn't hold (`:24-29`). Their relations then drop through `idOf` (`:36-38`). Post-filtering keeps the reply's shape for both asks, with `ids` only when `paths` is given (`:42`). Passing tree paths in would always set `ids` and send every tree path through `json_each` (`stores.ts:17`).
- **`index:headings`** (`Core/Nexus/handlers.ts:167-169`): the outline record is filtered to `liveIdIndex(root)`'s keys. The renderer asks with archived paths whenever a cascade's `pages:changed` names one (`useBridgeSubscriptions.ts:84-87`).
- **`loadValues`** (`loadValues.ts:8-18`): the no-id branch reads `pagePathsIn(containerAt(tree, containerRelPath))` (`treePatch.ts:104-105`) from the held tree, as the id branch already reads `livePathOf`.

**What `folderCorpus` Keeps:** one caller, `moveIndexPaths` (`indexSeed.ts:183`), in its own module. It's inlined there and its export leaves.

**What the Trims Stop Shipping:** besides archived rows, they stop shipping Agenda, loose, and withheld rows today. No row uses any of them, since rows and edges come from tree containers. `folderCorpus(Collection)` never entered the Archive, so `loadValues`' trim is a cost fix rather than an Archive need.

**Cost:** matrix +2, headings +2, `loadValues` and `folderCorpus` +2 / −4.

##### 9. D-1 and the Settle

**Recommendation:** the unarchive doesn't route through `addressed`. It shares the Trash restore's two-map relink, hoisted beside `relink` in `settle.ts` as one returning-pages relink that both restores call.

**Evidence:**

- **`settledIndex` Is the Tree's:** it's `pageIndexOf(heldTree)` (`settle.ts:242-246`), so an unarchived page is absent before and present after, and `pageMoves` reports it as arrived (`record.ts:80-92`).
- **`addressed`'s Relink Re-Spells Collisions Only:** `addressed` (`mutate.ts:89-113`) relinks through `respellings(before, after, moved, [...moved, ...arrivals])` (`Core/Connections/rewrite.ts:21-46`). For an arrival, that re-spells collisions only: keys that named another page alone before, which the arrival's path now spells. That's what D-1 asks for title-only links that landed on a namesake.
- **It Never Maps Origin to Landing:** the archived page is absent from `before`, so its origin keys are never examined, and path links naming its origin don't follow it to a different landing.
- **The Trash Restore Already Solves This:** it uses two maps (`spend.ts:228-247`, and the comment at `:229` says why one `relink` won't do).
  - **`names`:** `respellings(live, after, [], ids)`, the collisions.
  - **`backNames`:** `respellings(buildPageIndex(back), after, ids, [])`, over the returning pages at the paths they left, applied where the live world reads the key phantom.
  - **Where `back` Comes From:** for the Trash it's `trashedPagesOf` (`holdings.ts:85-96`, through `deletedPathOf`). For the Archive it's the origin path joined with each page's place inside the artifact, from the record under a flat layout or by path algebra under a chain-mirrored one (Call 5).
- **The Unarchive Needs Less:** it needs no `targets` repair and no refill, because its own values and its inbound Link values were kept current or in place (C-1, D-1).
- **Routing Through `addressed` Would Need Three Things:**
  1. The unarchive op in its request union (`mutate.ts:89-91`).
  2. A label from the reply, since `titleFromPath(req.path)` (`:99-100`) would read the stamped bundle name.
  3. `back` handed out of the op so `addressed` could fold in `backNames`.
- **Why the Hoist Wins:** with those three, it's the same hoist inside a wrapper whose own `relink` is the wrong map. The Trash restore also needs `backNames` inside the op for its refill (`spend.ts:296`), so the computation lives in the op either way.
- **`changesSettled`:** it should list the archive and unarchive ops beside `restore` (`mutateRequest.ts:139-147`). That belongs to the ops' lane.

**Cost:** `spend.ts` −10, `settle.ts` +12, and the unarchive reuses it.

##### 10. Sync and the Watcher

**Recommendation:** confirmed. Nothing changes.

**Evidence:**

- **The Watch and Sync Admit It:** `neverWatched` exempts `.nexus` at segment 0. `archive`, the ULID, and the digit-stamped bundle name aren't hidden, and `_record.json` passes the dot-only leaf rule (`exclusion.ts:27-36`). So `.nexus/archive/<id>/<bundle>/…` is watched (`watcher.ts:55-65`) and admitted (`exclusion.ts:59`).
- **An In-App Move Is a Rename on the Wire:** `relocate` reports the rename (`atomicWrite.ts:62-75`), and `feedRename` sends `onRename` when both ends are admitted (`tap.ts:64-75`).
- **Reconcile Descends Into `.nexus`:** it walks from the root through `manifestAdmits` (`Core/Sync/Client/reconcile.ts:75`), and `.nexus` is admitted as a directory.
- **On a Receiving Device:** `landRename` is a raw rename (`Core/Sync/Arrival/land.ts:124-147`). The watcher's events index the archived path (`indexEvent`, `fileEvents.ts:287-291`), the tree ignores it, and the vanish stays owed (`settle.ts:270-292`).
- **Hidden Folders Inside an Archived Set:** they stay unwatched and unsynced (Call 1).

**Cost:** 0.

---

#### Removal & Consolidation

| What | Where | Change | Lines |
| --- | --- | --- | --- |
| `keyHolderFiles` and `corpusUnder` | `keyHolders.ts:12-18`; `indexSeed.ts:78-82` | Fold into `governedReach(root, candidates, only?)` | +11 / −12 |
| `collectionFolders`' home | `assignment.ts:152-156` | Moves beside governed reach; the scope callers stop calling it | ±0 moved, −3 calls |
| `deletePlan`'s `folders` | `deleteProperty.ts:117-126`, `:82`; `replaySchemaCascade.ts:60-61` | Dropped; scope is governed reach's | −1 |
| `deleteCascade`'s tree filter and twin branch | `cascade.ts:101-121`, imports `:19`, `:32` | Governed reach plus the map's twin check | +5 / −14 |
| `keyedHolders`' first-claimant `seen` | `keyHolders.ts:51`, `:62-66` | None wins through the map | +1 / −3 |
| `recordById(tree)` and `frozenWorld(pageIndexOf(tree))` at the refill sites | `assignment.ts:80-87`; `spend.ts:185-186`, `:250`, `:290`; `restoreProperty.ts:56-58` | One projection, `nexusPages(root, tree)` | +15 / −4 |
| The reassign's members filter | `assignment.ts:79`, `:82-86` | `owningCollection` through the archive arm | ±0 |
| `outsideContent`'s hidden check | `exclusion.ts:79` | `(archiveSegs(segs) ?? segs).some(hiddenFolder)` | ±0 |
| The resolver | `nexusPaths.ts` | `ARCHIVE_DIR_REL`, `archiveDirRel`, `archiveSegs`, `archivedCollectionIdOf` | +6 |
| `NON_CORPUS_TOP` | `nexusPaths.ts:7-8`; `codec.ts:51` | K-5: renamed to what it is (the app's own top folders, which no setting may name) or inlined into its one reader | ±0 |
| `corpusFiles` | `walk.ts:41-43` | Walks the archive root second | +3 |
| `sidecarsUnder` | `assetMigrate.ts:158-165` | Hoisted to `walk.ts`, started at a given dir; the migration walks both roots, `reachConfig` the Archive | +1 |
| `normalizeSavedViews` | `migrateConfig.ts:45-48` | Walks the archive root beside `.trash` | +1 |
| `owningCollection` | `treePatch.ts:83-91` | The archive arm | +2 |
| `containersOf` | `configReach.ts:312-317`, `:342-354` | Archived Set sidecars and their ids | +7 |
| `sweepCount` | `governedSweep.ts:113-114` | Archived files filtered before the dry run | +1 |
| `readMatrixGraph` and `index:headings` | `matrixGraph.ts:19-29`; `Matrix/handlers.ts:22`; `Nexus/handlers.ts:167-169` | Post-filtered to the held tree | +4 |
| `loadValues` and `folderCorpus` | `loadValues.ts:8-18`; `indexSeed.ts:84-87`, `:183` | Tree pages; `folderCorpus` inlined into its one caller | +2 / −4 |
| The Trash restore's two-map relink | `spend.ts:228-247` | Hoisted beside `relink` (`settle.ts:249-260`), shared with the unarchive | +12 / −10 |

**Lane Total:** about +70 / −51, net about +19 (`<net> (+<added> / -<removed>)`: +19 (+70 / −51)). That excludes the Cautionary Items, which add +3 for the fallback and +4 / −9 for `id-live`, the −9 being `recordById` leaving.

The Investigation's rows for this lane came to about +12. The difference is three items it didn't have:

- **The Union World:** the D-1 fix.
- **Configuration Reach at Its Real Cost:** +7 rather than +4, because of the id capture for `sources`.
- **The Two Take Alongs:** the hoisted relink and `normalizeSavedViews`.

On the other side, governed reach removes more than the Investigation counted.

---

#### Reusable

- **Index Maintenance and the Watch:** `relCorpusPath`, `indexWrittenPage`, `deindexPath`, and `moveIndexPaths` (`indexSeed.ts:89-190`), together with the watcher, `manifestAdmits`, and `feedRename`, carry archived pages unchanged once the arm admits them.
- **The Index's Path-to-Id Answer:** `readIndexedStats(ARCHIVE_DIR_REL)` (`contentIndex.ts:92-94`; `stores.ts:180-187`) is the archive half of the projection.
- **Twins, Ownership, and Order:** `writablePathsOf`'s null-on-twin rule (`heldPages.ts:8-13`) is the twin rule. `owningCollection` (`treePatch.ts:83-91`) is the one owner-by-path answer. `pagePathsIn` and `containerAt` (`treePatch.ts:101-105`) list a container's tree pages.
- **The Frozen World Takes Any Index:** `frozenWorld` and `gonePageEntry` (`propertyValue.ts:187-208`) need only a wider index handed in.
- **The Restore's Relink:** `respellings` (`rewrite.ts:21-46`) and the Trash restore's two-map composition (`spend.ts:228-247`) serve the unarchive. `trashedPagesOf` and `deletedPathOf` (`holdings.ts:85-96`; `bundle.ts:22-24`) are the precedent for reading a returning page's origin from its path.
- **The Sidecar Walker:** `sidecarsUnder`'s admit rule (`assetMigrate.ts:159-165`) lists archived Set sidecars once it's hoisted.
- **The Id-Shape Gate:** `isUlidShaped` (`identityMark.ts:16-18`), with the tile handlers' precedent for an id that becomes a path segment (`Core/Tiles/handlers.ts:26`, `:35`).

---

#### What Becomes False

##### Tests

- **`Core/Paths/exclusion.test.ts`:**
  - **outsideContent › "refuses hidden and package folders at any depth, and hidden names" (`:19`):** gains the arm. `.nexus/archive/<id>/<bundle>/Notes.md` admitted, `…/Beta/_raw/X.md` hidden, `.nexus` still hidden (`:21`).
- **`Core/Files/walk.test.ts`:**
  - **corpusFiles › "never reads inside `.trash`, `.nexus`, or an excluded folder" (`:69`):** the read spy's `['', 'sub']` (`:76-77`) gains `.nexus/archive`, and the name stops being true.
  - **"yields the cascade corpus minus exclusions…" (`:46`):** gains an archived page.
- **`Core/Index/indexSeed.test.ts`:** new cases. `relCorpusPath` admits archived paths, `moveIndexPaths` renames rows into and out of the Archive, and the seed walks it.
- **`Core/Properties/keyHolders.test.ts`:**
  - **keyHolderFiles (`:62-152`):** becomes `governedReach`, including "answers the queried holders intersected with the scope folders" (`:63`) and "with no index it answers the corpus intersected the same way" (`:146`).
  - **keyedHolders › "files no value for a page holding another casing of the key" (`:155`):** takes the map.
- **`Core/Nexus/cascade.test.ts`:** the strip gains archived holders and keeps a value an archived page answers. "Never reaches a loose file outside every Collection" (`:586`) stays.
- **`Core/Trash/deleteReach.test.ts`:** a page delete › `:113` and `:125` stay true (Call 4).
- **`Core/Nexus/heldPages.test.ts`:** "an id two files claim answers no path to a writer" (`:54`) stays. The union projection gains its own cases.
- **`Core/Properties/governedSweep.test.ts`:** sweepCount (`:118`) gains the archive filter.
- **`Core/Properties/assignment.test.ts`, `Core/Trash/spend.test.ts`, `Core/Trash/restoreProperty.test.ts`:** refills reach archived ids, and the frozen world holds archived targets.
- **`spend.test.ts:1287` and `:1373`:** still pin the hoisted relink's behavior and stay.
- **`Core/Nexus/treePatch.test.ts`, `Core/Properties/repairSweep.test.ts`:** `owningCollection`'s arm, and an archived re-read reconciled against its Collection.
- **`Core/Matrix/matrixGraph.test.ts`:** readMatrixGraph (`:58-155`) — every case gains `root` and a held tree, plus "drops rows the tree doesn't hold".
- **`Core/Views/loadValues.test.ts`:** "maps page id → frontmatter across the container and its nested Sets" (`:22`) and every no-id case need a held tree.
- **`Core/Nexus/configReach.test.ts`, `Core/Nexus/migrateConfig.test.ts`, `Core/Assets/assetMigrate.test.ts`:** each gains archived Set sidecars, and the migration gains archived pages.
- **`Core/Testing/storesContract.ts`:** stays valid, since the store has no path filter.

##### Comments

- **`Core/Paths/nexusPaths.ts:7`:** "The walk, the index, and every mutation refuse these" (K-5).
- **`Core/Paths/exclusion.ts:76`:** `outsideContent`'s doc gains the Archive.
- **`Core/Files/walk.ts:31`:** "held to the same hidden-name rule as the content walk", which the content walk no longer is.
- **`Core/Properties/keyHolders.ts:1`:** the header becomes governed reach's reason.
- **`keyHolders.ts:47`:** "whose ID another already took" becomes none wins.
- **`Core/Nexus/cascade.ts:72`:** "from the pages and Spaces the tree holds".
- **`cascade.ts:101`:** the filter's comment leaves with it.
- **`Core/Nexus/heldPages.ts:1`:** the header gains the projection beside the held tree's lookups.
- **`Core/Nexus/treePatch.ts:83`:** "since Collections sit only at the Nexus root" gains the Archive a path is filed in.
- **`Core/Trash/holdings.ts:143`:** `refillTrashed` stops being the catch-all for unknown ids.
- **`Core/Nexus/migrateConfig.ts:45`:** "only the Trash and the tile documents are walked here".
- **`Core/Matrix/matrixGraph.ts:18`:** gains the tree trim.
- **`Core/Properties/governedSweep.ts:150`:** "found where `roots` places it" (the map).
- **`Core/Trash/spend.ts:229`:** moves with the hoist.
- **`Core/Nexus/settle.ts:248`:** "The one re-spell" gains its returning-pages sibling.

##### Docs

- **`.claude/Features/CorePM.md:69` (*§Folder Exclusion*):** three clauses change.
  - **"The app's own `.nexus` and `.trash` aside":** gains the Archive as the one hidden folder read as content.
  - **"One predicate … honored by the read walk, the adoption pass, the watcher, the content index's corpus, and every cascade":** stays true under the arm.
  - **"Un-adopted folders … are indexed and cascade-reachable":** true for content reach only.
- **`.claude/Features/CorePM.md:108`:** "the seed … over the same set of files the sweeps rewrite (`corpusFiles`), so 'indexed' and 'rewritable' name one set" stays true. The corpus gains the archive root.
- ***Archive — Investigation*:** three claims are false.
  - **`:68`:** "It answers null until the index is ready".
  - **`:336`:** the Concern.
  - **`:70`:** "would pair an archive move as an ordinary move". This is true, but the projection Call 5 recommends answers the frozen world too, which its *§By-ID Reach* doesn't name.

---

#### Cautionary Items

1. **The By-ID Projection's Fallback Scan:**
   - **The Cause:** a session with no content-index store. `openStores` hands `openSessionDb` no directory when the identity isn't ULID-shaped (`Desktop/main.ts:311-312`; `Desktop/Store/sessionDb.ts:24`), and `nexus.db` can fail to open (`sessionDb.ts:25-28`). Every query then answers null, and every reach falls back to `nexusCorpus`, which walks the Archive under Call 1. The strips reach archived pages and file their values by id, but a tree-only projection loses those values at refill (`spend.ts:299-301`).
   - **The Shape:** `readIndexedStats(ARCHIVE_DIR_REL) ?? scan`, reading ids with `stampedIdOf` (`Core/Files/pageFile.ts:87`) over `corpusFilesUnder(root, archiveRoot, await readWatchScope(root))`, the scope `nexusCorpus` reads too (`indexSeed.ts:74-76`). It mirrors `?? nexusCorpus` at the other reaches.
   - **What Doesn't Need It:** a failed seed, since `readIndexedStats` still answers (`indexSeed.ts:255-258`; `contentIndex.ts:92-94`).
   - **Cost:** +3.
2. **`id-live` Across the Archive:**
   - **The Cause:** a concurrent offline archive and delete of one page on two devices. Each device's `landRename` finds its source already moved and moves nothing (`land.ts:124-147`), so one device can hold the page in its Trash while the other's Archive holds it. A Trash restore then lands a second claimant of an id the Archive holds, a twin no remint adjudicates, since the ledger is tree-only (`remintLedger.ts:21-60`). This lane didn't trace sync past the landing.
   - **Why the Rule Covers It:** the rule's own words, "nothing may write over a living identity" (`resolve.ts:30`), cover an archived identity, since it stays content.
   - **The Shape:** `resolveRecord` asks Call 5's map, excepting the restoring file's own path so an unarchive isn't refused by itself. Both callers pass the map (`spend.ts:168`, `trashRows.ts:48`), and `recordById`'s last consumer leaves (`record.ts:48-56`).
   - **Cost:** +4 / −9.
3. **The Archive Op Refuses a Collection Id That Isn't ULID-Shaped:**
   - **The Cause:** sidecar ids are read unvalidated, since `readOwnSidecar` takes any string (`readNexus.ts:98-114`), and `archiveDirRel(id)` makes the id a path segment. A hand-edited `"id": "../x"` would file archived pages outside the Archive.
   - **The Shape:** the archive op, the one writer that creates an Archive folder, gates on `isUlidShaped` (`identityMark.ts:16-18`), as tile ids already do for the same reason (`Core/Tiles/handlers.ts:26`, `:35`). Readers need nothing, because a malformed id's prefix names no corpus file.
   - **Cost:** +1 in the archive op's lane.

---

#### Contradictions

None that stops the process. One gap, flagged because it changes the plan's shape:

- **The Investigation's By-ID Map Alone Doesn't Satisfy D-1:** every frozen world reads the tree alone (`assignment.ts:87`; `spend.ts:186`, `:290`; `restoreProperty.ts:58`; `restoreScrub.ts:154`, `:169`). A Link value naming an archived page is dropped whenever it passes through one, against D-1's "Link property values naming it should stay in place and resolve again on its restore".
- **What Closes It:** Call 5's union world closes it for title keys and recorded targets.
- **What's Left:** unrecorded path keys need origin paths, which the Origin Record (Open Item 1) decides how to make readable.
- **What Stays Tree-Only:** the delete's `after` (`cascade.ts:81-83`) keeps reading the tree, as D-1's namesake ruling requires (Call 5).

---

#### Questions for Nathan

1. **Archived Pages in the Rename Refusal's Count:**
   - **The Situation:** renaming a property is refused when some pages hold both its old and new key, and the refusal says how many: "3 Items hold both 'Status' and 'State'" (`properties.ts:272-273`). Under C-4, confirmations count only live items. This refusal has to include archived pages anyway, or the rename would silently erase a value on an archived page, so the question is what its count says.
   - **A Wrinkle:** the clashing holders can include pages in the Archive of a Collection that's in the Trash or excluded, since F-1 keeps those Archives in reach. Those pages show in no ArchiveView until their Collection returns, so the refusal can name something the user can't currently open.
   - **Recommendation:** count every holder. A live-only count would read "0 Items hold both…" when only archived pages block the rename, hiding the refusal's own cause. Whether the copy also says "including archived pages" can be set at the plan's copy review (Open Item 2).
2. **Confirmations When Only Archived Pages Are Affected:**
   - **The Situation:** under C-4, a confirmation counts live pages only. Clearing an option or changing a format that only archived pages hold therefore counts 0, and those two confirmations skip asking at a count of one or less, so the change runs without a prompt. Deleting a property or removing an option always asks, and would read "stripped from 0 Items".
   - **Recommendation:** keep C-4 as ratified. The archived pages are updated either way, and the prompt exists to warn about pages the user can see; the "0 Items" wording of the always-ask prompts goes to the copy review.


---

### Scout 2 — The Trash's Data Layer and What the Archive Shares With It

**HEAD:** `4a910cc7a`, one commit past the brief's `d880179b6`. That commit touches only `Core/MarkdownPM/` and `.claude/Features/MarkdownPM.md`, and nothing between `213f95a3b` and HEAD touches a file in this lane, so every Investigation line number in the lane holds except where corrected below.

**Lane:** `Core/Trash/`, the order fold, the dispatcher and settle, the delete and restore ops, the landing refusals, the record, the Undo plumbing, Clear Exclusion Cache, and the open sequence.

**Terms:** a **store** is one place bundles live (the Trash, or one Collection's Archive). A **bundle** is a stamped folder holding one artifact beside its `_record.json`. **Placement** is the decision of where a record's artifact re-enters the tree. A **landing** is the act of putting it there.

---

#### Verified at HEAD

##### Confirmed

- **The Delete:** `deleteOp` is `Core/Trash/delete.ts:28-116`. It gates on `mutableTarget` (`:32`), mints in Nexus mode (`:46`), gathers system-mode page ids (`:48`), builds `under` from tree pages (`:49`), gathers targets (`:50`), writes the record ahead (`:51-59`, `:96`), relocates (`:99`), drops metadata (`:101`, a no-op when a bundle exists since `pageIds` is `[]`), strips (`:102`), releases excluded entries (`:109`), and runs `goneEdit` (`:38`, `:110`).
- **The Parent:** `gatherParentRef` is `Core/Trash/gather.ts:24-29`. An archived target's folder isn't a container, so it records `unaddressable`.
- **The Record:** `parentRef` is `Core/Trash/record.ts:14-19`, `contentRecord` is `:33-44`, and `excluded` is `:38-39`. Records decode through `recordFile.safeParse` (`:103-108`). Zod is `^4.4.3` (`Core/package.json:40`; `node_modules/zod` is 4.4.3). A plain `z.object` strips unknown keys, and `z.looseObject` (`record.ts:63`) is the one passthrough. A record still carrying `excluded` therefore decodes with it dropped, and a record missing a new optional field decodes with that field absent. The decode never writes back to disk (`record.ts:46`, `:95`), so nothing on disk is lost.
- **The Time:** the deletion time lives only in the stamp. `deletedAtOf` is `Core/Trash/trashRows.ts:14-19`, with `STAMP` at `:12`.
- **Placement:** `resolveRecord` is `Core/Trash/resolve.ts:31-93`.
  - A live id refuses first (`:36-38`).
  - The container arm (`:76-91`) answers `parent-gone` or `cannot-hold` (`:79-80`).
  - Siblings span pages and Sets (`:82-85`), and a collision steps aside through `freeName` (`Core/Paths/names.ts:56-64`).
- **The Landing Refusals:** `landingRefusal` is `Core/Nexus/folderEntity.ts:19-28`, applied at `Core/Trash/spend.ts:174-179`. The `exists` refusal is `spend.ts:180-182`. `createDisambiguated` is `names.ts:66-79`, and the restore doesn't call it.
- **Emptying:** `emptyBundle` is `spend.ts:66-103`, and `contentPages` is `Core/Trash/holdings.ts:48-61`.
- **The Destination Override:** `withDestination` is `spend.ts:105-128`, including `NO_DESTINATION` at `:105`. `REFUSAL_TEXT` is `:51-56`, `openBundle` is `:58-64`, and `restoreArtifact` is `:143-323`.
- **The Move:** `relocate` is `Core/Files/atomicWrite.ts:62-75`.
- **The Settle:**
  - `addressed` is `Core/Nexus/mutate.ts:89-113`, and its label derives from `req.name`, `req.newName`, or `req.path` (`:99-100`).
  - `restore` is dispatched under `underContexts` + `inSettleTurn` (`mutate.ts:134-135`).
  - `settledIndex` is `Core/Nexus/settle.ts:242-246`, `relink` is `:249-260`, and `payOutsideMoves` is `:270-`.
  - `changesSettled` is `Core/Nexus/mutateRequest.ts:138-147`.
- **Order:**
  - `resolveOrder` is `Core/Nexus/order.ts:10-27`.
  - `folderOrderAt` builds from `dest.pages` (`Core/Views/Host/useViewInteractions.tsx:171-184`), and a create builds from `pageIdsIn` (`Core/Views/creationOrder.ts:77`).
  - A move drops the source id (`Core/Nexus/move.ts:37`, `:63`) and writes the destination order (`:33`, `:38`, `:49`, `:64`) through `setChildOrder` (`Core/Nexus/reorder.ts:72-79`). Creates write it the same way (`Core/Nexus/create.ts:50`, `:76`).
  - `spliceBeside` is `creationOrder.ts:12-28`, `placeAt` is `:57-69`, and `mergedRanking` + `tieOrderWith` are `:30-51`.
  - The stale comment is `mutateRequest.ts:88`.
- **Metadata:** `dropPageMetadata` is `Core/Nexus/pageMetadata.ts:119-134`. Its callers are `delete.ts:101`, `spend.ts:88`, and `Core/Settings/exclusionScan.ts:85`, and nothing else.
- **The Bundle Chain:** `trashChainDir` is `Core/Trash/bundle.ts:13-20`, and `frozenCrumbs` is `trashRows.ts:21-29`.
- **Unreadable Sidecars:** `Unreadable` is `Core/Nexus/tree.ts:109-112`. A container sidecar lands there only when it parses with no id (stamped at open) or doesn't parse (`Core/Nexus/readNexus.ts:98-111`), so an unreadable Collection never yields an id.
- **The Undo:**
  - `ALWAYS_ASKS` is `Core/Interface/Confirm/confirmations.ts:28-34`, and `waived` is `:36-38`.
  - `armed` is `:40`, and `spendBundle` is `:42-46`.
  - `notifyTrashed` is `:48-65`, and its Undo is `mutate({ op: 'restore', bundlePath })` (`:59`).
  - `notifyDeleted` is `Core/Interface/Notifications/notifications.ts:84-101`, and `notifyUndoable` is `:106-137`.
  - The chord stack holds up to 100 reverts (`Core/Session/undo.ts:5`, `:15-21`), so an Undo can fire long after its notice is gone.
- **The Gate:** `mutableTarget` is `Core/Nexus/liveTree.ts:79-87`. Its doc at `:79` reads "the root, `.nexus`, the trash, and excluded folders are never a target", and it has 18 callers across 12 files.

##### Corrected

- **Clear Exclusion Cache:** it is `exclusionScan.ts:31-88`, not `:31-95`, since the file is 88 lines. `excludedArtifacts` is `:31-52`, `clearRewrite` is `:54-64`, and `clearExclusionData` is `:66-88`. It sits in Files & Links › Exclusions (`Core/Settings/frames.ts:567-580`), not Maintenance. Metadata › Maintenance (`frames.ts:642-651`) holds only Repair Properties On Open.
- **`goneEdit`:** it is `Core/Nexus/configReach.ts:276-298`, and its container arm is `:288-297`.
- **"Absent Order = Legacy Append":** `mutateRequest.ts:88`'s first sentence is also misleading. The page menu's Move To ▸ sends `movePage` with no order (`Core/Interface/Menus/pageMenuActions.ts:43`), so it's a live path, not a legacy one. K-5's rewrite covers both sentences.
- **The Location Resolver's Home:** the Investigation places it in `Core/Archive/archivePaths.ts`. Its consumers include `Core/Paths/exclusion.ts` and `Core/Files/walk.ts`, which are leaf layers importing nothing from feature domains, so the pure resolver belongs in `Core/Paths/nexusPaths.ts`. Every other `.nexus` location already lives there (`CONTEXTS_DIR_REL` `:14`, `METADATA_DIR_REL` + `isMetadataShardRel` `:21-26`, `ASSETS_DIR_REL` `:29`). See *Call 2*.
- **The Two-Map Comment:** `spend.ts:229` was written by Path Links Phase 8 (`d5462735f`), so Path Links landing didn't make it stale; Path Links created it. See *Call 10*.
- **Restore Under `addressed`:** the Investigation's *§What's Reusable* says `addressed`'s diff "re-spells for an unarchive's arrival". It re-spells only the arrival's collisions. It misses the returning page's own old path keys, which D-1 INFERRED needs. See *Call 10*.

---

#### Planner's Calls

##### 1. The Origin Record (Open Item 1)

**Recommendation:** one bundle per archived item, flat under its Collection's Archive. The bundle is `.nexus/archive/<Collection ID>/<stamp>__<leaf>.archived/`, holding the artifact under its own name beside `_record.json`. That record is the same `contentRecord('page' | 'set')` the Trash writes. The content record gains three optional fields and loses one:

```ts
const contentRecord = <E extends string>(entity: E) =>
  z.object({
    entity: z.literal(entity),
    id: z.string().optional(),
    parent: parentRef,
    /** Its neighbours in its origin's order when it left: the sibling it sat above, and the one it sat below; absent at either end. */
    place: z.object({ above: z.string().optional(), below: z.string().optional() }).optional(),
    /** Where it lived when it left: its own path then, and the trail of container ids from its Collection down to its parent. */
    origin: z.object({ path: z.string(), trail: z.array(z.string()) }).optional(),
    /** The Archive bundle a delete from the Archive took it out of, which that delete's Undo returns it to. */
    archive: z.string().optional(),
    links: z.array(strippedLink).optional(),
    targets: linkTargets,
    partial: z.literal(true).optional(),
  })
```

The record's fields:

- **Kind:** `entity`, as today.
- **Origin Container:** `parent`, the container by id, as today (E-1).
- **Place:** `place.above`, the id of the next sibling, and `place.below`, the id of the previous one. Both come from the origin's resolved order (`parent.pages`, or `parent.sets` for a Set) at the moment it leaves. Pages and Sets are ordered separately (`page_order`, `set_order`; `Core/Nexus/containerFields.ts:58-61`).
- **Origin Path:** `origin.path`, the item's own Nexus-relative path at archive time (`Alpha/Beta/Notes.md`, or `Alpha/Beta` for a Set).
- **Ancestry:** `origin.trail`, the ids of `containerTrailWhere(tree, (n) => n.id === parent.id)` (`Core/Nexus/treePatch.ts:73-76`). That is the same trail the live crumbs walk (`trashRows.ts:43`), Collection first and parent last.
- **Archived Time:** the bundle stamp, read by the existing stamp parse, renamed neutrally. There is no record field.
- **Excluded:** `excluded` leaves under F-3.

Who writes what:

- **The Archive:** writes `parent`, `place`, and `origin`.
- **The Trash's Delete:** writes `parent` and `place`, for E-2. It also writes `origin`, which gives the Trash the origin Collection id Lane 3's F-6 carry needs (`origin.trail[0]`; Scout 3 *§Cautionary*), plus `links`, `targets`, and `partial` as today.
- **A Delete From the Archive and F-5:** both copy the archive record whole. The delete from the Archive adds `archive`.

**Why the Stamp:**

- **One Time Source:** `deletedAtOf` already reads the stamp for the Trash, so time keeps one source in both stores.
- **It Travels:** the stamp moves with the bundle through F-6's relocate. It also survives E-3's Undo, which re-mints the bundle at the exact path `record.archive` names, so the original archived time comes back.
- **No Second Copy:** a record field would be a second copy with nothing to choose between the two, which is B-2's own reason for not storing the location.
- **Hand-Renamed Bundles:** one lists dateless and sorts last, as the Trash already accepts (`Core/Trash/trashRows.test.ts:179`).
- **Auto-Delete:** a later auto-delete would read the same stamp, and a Set bundle expires as one unit.

**How Place Is Consumed:**

- **Composed in the Resolver:** `resolveRecord`'s container arm already holds the parent node (`resolve.ts:78`). It composes the destination order from the live sibling ids, as `const order = spliceBeside(ids, ...slotOf(record.place, ids), id)`:
  - **Next Sibling Live:** the item goes above `place.above`.
  - **Else Previous Sibling Live:** it goes below `place.below`.
  - **Else It Was First:** with no `below`, it goes `'first'`.
  - **Else:** it goes `'last'`.
  - **No Place:** a record naming no place lands `'last'`. That covers Trash bundles written before this work and records given a picked destination.
- **Written Like a Move:** the landing writes the order through `setChildOrder(destAbs, key, order)` after the relocate, as `move.ts:38` and `create.ts:50` do.
- **Read by `resolveOrder`:** `resolveOrder` reads it back unchanged (`order.ts:10-27`). `treePatch.ts:233-234` ranks the arrival by the sidecar's fresh `pageOrder`.
- **The Precedent:** a Context record already keeps its place and restores at the end without one (`spend.test.ts:215-238`, "a record from before the place was kept restores its Context at the end").

**Does the Trash Record Gain `place`:** yes. E-2 says the Trash inherits the exact position, so `gatherContentRecord`, which both stores call (*Call 2*), writes it for pages and Sets alike.

**Evidence:**

- **Shapes That Hold Either Kind:** `contentRecord` (`record.ts:33-44`) already holds pages and Sets, and a bundle already holds a folder artifact (`spend.test.ts:126-140`).
- **Machinery That Serves Unchanged:** `listBundles` (`holdings.ts:24-46`) walks a flat store unchanged, since every entry is a bundle. `bundleArtifact` (`record.ts:110-113`) and `trashRowOf` (`trashRows.ts:58-83`) serve both stores.
- **Hidden Names Stay Hidden:** bundle names start with a digit stamp, so they never read as hidden. The record's own `_` prefix keeps it out of the corpus under B-1's arm.
- **Trailing Fields Don't Break Tests:** existing record assertions use `toMatchObject` (`spend.test.ts:104-140`).

**Alternatives:**

- **A Manifest Per Collection:**
  - **Collisions:** a flat folder of plain files makes two archived `Notes.md` from different Sets collide.
  - **Sync:** the manifest isn't in `OWN_NAMES`, so it lands whole on sync.
  - **Drift and Format:** an entry can drift from its file after a hand-move, and it's a second record format.
  - **Cost:** about +170 per Scout C.
- **A Single Anchor (`before` Only):** one field and no branch, since `spliceBeside(ids, before, id, 'above')` lands last when its anchor is gone. It replays exactly whenever restores run in reverse archive order. That ordering is what the browsers' newest-first batches give with no search query (`trashRows.ts:85-90`, `TrashFrame.tsx:116`); a query ranks by match (`TrashFrame.tsx:52-56`). It misplaces an item whose successor has since been deleted for good, which is a common real case. Two anchors cost about 2 more lines and cover it.
- **An Index:** it drifts the moment any sibling above is added or removed.
- **Keeping the Slot in `page_order`:** the item's id stays in `page_order`, as the Trash does today, and the writers that rebuild from live ids are changed to merge (`tieOrderWith`'s `mergedRanking`).
  - **Exact Everywhere:** it's exact under every sequence.
  - **Sites to Change:** create (`creationOrder.ts:77`, `:81`; `Core/Views/Host/useViewCreation.ts:212`, `:251`; `Core/Actions/createActions.ts:23`, `:41`), `folderOrderAt`, `bandRouter.ts:82`/`:118`, and `sidebarDndModel.ts:300`.
  - **Garbage:** every emptied, system-deleted, or Finder-deleted id stays in a synced sidecar forever.
  - **No Help for a Picked Destination:** it does nothing for a restore given a picked destination.
  - **Verdict:** it loses on Less Stuff and Scalability.
- **A Collection-Exclusive Ancestry:** excluding the Collection avoids staleness after an F-6 carry, but then the Trash can't name the Collection Lane 3 needs, and the parent-inclusive trail is the shape `containerTrailWhere` already produces. The carry rewrites the trail above the moved Set, Collection included, in about 2 lines (*Cautionary Items*).

**Cost:**

| Part | Lines |
| --- | --- |
| Schema fields | +7 |
| `gatherContentRecord`'s place and origin | +8 |
| `slotOf` and the composed order in `resolveRecord` | +6 |
| The landing's `setChildOrder` | +1 |
| `excluded` leaves (F-3) | −2 |
| **Net** | **about +20** |

##### 2. The Neutral Owner (A-4)

**Recommendation:** a new domain, `Core/Bundles/`, beside `Core/Trash/` and `Core/Archive/`. Both import it, and neither imports the other. It owns the bundle format: the store identity, minting, listing, opening, the record and its gather, placement and the landing, and the rows.

**Why "Bundles":** every identifier in this code already says "bundle": `mintBundle`, `listBundles`, `openBundle`, `emptyBundle`, `bundleArtifact`, `bundlePath`, `ListedBundle`, `BUNDLE_SUFFIX`, `spendBundle`, `writePropertyBundle`. Lane 4 independently proposes `BundleRow`/`BundleCrumb` and `bundles:list` (Scout 4 *§The Row*, *§The Channel*). The other candidates lose:

- **"Held" or "Holding":** "held" means in-tree throughout the codebase (`heldTreeOf`, `Core/Nexus/heldPages.ts`, `HeldKind`, `idHeld`).
- **"Record":** it collides with `Core/Nexus/record.ts` and with the Baseline half of NexusRecord.
- **"Provenance":** it's NexusRecordPM's doc word, but not a code word.
- **`Core/Nexus/`:** it buries the format among 50+ tree files.

**The Store's Identity Is a Union, Resolved by Switch (Hard Rule: Finite States):**

```ts
export type BundleStore = { kind: 'trash' } | { kind: 'archive'; id: string }

const layoutOf = (store: BundleStore): { dir: string; suffix: string; chain: boolean } => {
  switch (store.kind) {
    case 'trash':
      return { dir: TRASH_DIR, suffix: '.deleted', chain: true }
    case 'archive':
      return { dir: archiveDirRel(store.id), suffix: '.archived', chain: false }
  }
}
```

- **The Union:** it is exactly Lane 4's channel argument, so the renderer's `bundles:list(store)` and the host's mint and list share one type.
- **Minting:** `mintBundle(root, store, absFrom)` mirrors the chain of `absFrom` relative to the root when `chain`, and lands flat in the store's dir otherwise. This is today's `trashChainDir` (`bundle.ts:13-20`) with the store's dir and a layout switch, about +3 lines.
- **Listing:** `listBundles(root, store)` walks `join(root, layoutOf(store).dir)` and matches its suffix, with one parameter.
- **Opening:** `openBundle(root, rel)` becomes `storeOf(rel)` + read, and answers which store a path belongs to rather than only refusing.
  - **The Trash:** `.trash/…<suffix>`.
  - **An Archive:** `.nexus/archive/<id>/<one leaf>.archived`.
  - **Anything Else:** refuses, as `spend.ts:59-61` does today.

**One Suffix or Two:** keep two.

- **Existing Data:** NexusOS holds Trash bundles named `.deleted`, and `listBundles` matches by suffix. One shared suffix would mean renaming them (a migration) or the Archive wearing `.deleted` (false on disk).
- **Legibility:** the suffix is what tells the two stores apart in Finder.
- **Validation:** `openBundle` validates prefix and suffix per store, and the per-store suffix costs nothing beyond the layout field.

**The Location Resolver (B-2):** B-2's one resolver is a block in `Core/Paths/nexusPaths.ts`: `ARCHIVE_DIR_REL = '.nexus/archive'`, `archiveDirRel(id)`, and `archivedCollectionIdOf(rel)` (the id segment, or null), about +5. These are pure, so `exclusion.ts`, `walk.ts`, `owningCollection`, the owner, and `Core/Archive/` all import a leaf. The I/O half (`archiveDirs(root)`, one `listEntries`) sits in `Core/Archive/`. This replaces the Investigation's `Core/Archive/archivePaths.ts`, which would make `Core/Paths` and `Core/Files` import upward.

**The Import Rule:**

- **Core/Archive:** imports `Core/Bundles` and `Core/Paths`, and never `Core/Trash`.
- **Core/Trash:** imports `Core/Bundles`, and never `Core/Archive`. The Trash finds a Collection's Archive through `{ kind: 'archive', id }` and `nexusPaths`.
- **The Shared Move:** F-5's sweep, the delete from the Archive, F-4's disposal, and E-3's Undo all cross stores, so the one archive-to-Trash move sits in the owner (*Call 6*).

**The Owner's Files:**

| File | Holds | Lines |
| --- | --- | --- |
| `Core/Bundles/bundle.ts` | `BundleStore`, `layoutOf`, `storeOf`, `fileStamp`, `stampedLeaf`, `mintBundle`, `bundleArtifact`, `ListedBundle`, `listBundles`, `openBundle`, `heldPathOf` (from `deletedPathOf`), `stampedAtOf` (from `deletedAtOf`), `contentPages`, `pageIdsOf`, `heldPagesOf` (from `trashedPagesOf`), `heldPagesIn(root, store)` (from `trashedPages`), `moveIntoStore` (*Call 6*) | ~120 |
| `Core/Bundles/record.ts` | The record union, `RecordFile`, `ParentRef`, `readRecord`, `writeRecord`, `gatherParentRef`, `gatherContentRecord` (gaining `place` and `origin`) | ~105 |
| `Core/Bundles/placement.ts` | `resolveRecord`, `findContainerById`, `Refusal`, `ArtifactRecord`, `REFUSAL_TEXT`, `withDestination`, `slotOf`, `freeOnDisk` (*Call 4*) | ~150 |
| `Core/Bundles/rows.ts` | `BundleRow`, `BundleCrumb`, `rowOf`, `rowsOf`, `liveCrumbs`, `frozenCrumbs`, `homeResolvesFor` | ~95 |

`frozenCrumbs` and `heldPathOf` both switch on the layout: a chain store reads its chain, and a flat store reads `record.origin.path`.

**Lane 4's Shared Browser Pieces:** the batch runner, `countPhrase`, the date-column hook, and the checked-row rule sit in the same owner as renderer files, on the precedent of `Core/Views` and `Core/Matrix`, which hold engine and renderer halves side by side.

- **Files:** `Core/Bundles/useBundleBrowser.ts` and `useDateColumn.ts`.
- **`countPhrase`:** it is pure and keys on `BundleRow['kind']`, so it sits in `rows.ts` or beside the hook.
- **The Guard:** the engine graph (`Core/Contract/engineGraph.test.ts:7-21`) already fails if `serve.ts` reaches a renderer file or React.
- **Why:** everything the Trash browser and ArchiveView share has one obvious home. The reconciler unifies the names with Lane 4's.

**Alternatives:**

- **`Core/Nexus/placement.ts` for Placement Alone, Plus `Core/Holding/` for Bundles (Scout C):** two homes for one format, and "Holding" collides with "held".
- **Leaving the Format in `Core/Trash/` and Importing It From `Core/Archive/`:** A-4 rules it out.
- **A Per-Store Schema (Archive Records Decoded With `origin` Required):** a generic `readRecord(dir, schema)` and two unions. One union with optional fields keeps one format. A flat-store record with no `origin` reads its artifact at the store root (`join(dirname(origin?.path ?? ''), rel)`), which is a total function rather than a guard.

**Cost:**

| Part | Lines |
| --- | --- |
| Moves | ±0: about 443 lines into the owner, plus 31 into `settle.ts` and `order.ts` |
| Store parameterization (`layoutOf`, `storeOf`, the `listBundles`/`mintBundle` parameter) | +8 |
| The resolver block | +5 |
| `heldPathOf` and `frozenCrumbs`' layout switch | +2 |
| **Net** | **about +15** |

##### 3. E-2 Exact Placement

**Recommendation:** the fold is `spliceBeside`, the slot-aware wrapper over `nextOrder` that create placement (`placeAt`, `creationOrder.ts:57-69`) and custom order (`tieOrderWith`, `:43-51`) already use. Every other order write in the app ends in `nextOrder` (`UIX/Utilities/moveItem.ts:29-38`, already in the engine graph, `engineGraph.test.ts:23-35`), and the order write rides the `setChildOrder` a move already carries. The record keeps the two neighbours (*Call 1*). The landing composes and writes:

```ts
// Core/Bundles/placement.ts, inside resolveRecord's container arm
const ids = (record.entity === 'page' ? parent.pages : (parent.sets ?? [])).map((n) => n.id)
const order = record.id ? spliceBeside(ids, ...slotOf(record.place, ids), record.id) : undefined

export function slotOf(place: Place | undefined, ids: readonly string[]): [string | null, Slot] {
  if (place?.above && ids.includes(place.above)) return [place.above, 'above']
  if (place?.below && ids.includes(place.below)) return [place.below, 'below']
  return [null, place && !place.below ? 'first' : 'last']
}

// The landing, after the relocate, as move.ts:38 and create.ts:50 order it
if (order) await setChildOrder(join(root, dir), record.entity === 'page' ? 'page_order' : 'set_order', order)
```

**`spliceBeside` Moves to `Core/Nexus/order.ts`:** the owner is host-side, and `Core/Views/creationOrder.ts` is a Views module. With `Slot` (`creationOrder.ts:10-28`) moved beside `resolveOrder`, `order.ts` becomes the one home for how an id list is read and spliced. `creationOrder.ts` re-imports it, with ±0 lines.

**Drop at Departure:** yes. The archive op and the Trash's delete both call `dropFromChildOrder(dirname(abs), key, id)`, as `move.ts:37`/`:63` do and `mutate.test.ts:792` pins for moves.

- **Why:** the record holds the place, so the tombstone has no job. Every in-app removal (move, archive, trash) then drops in the same op, and `page_order` holds what the folder holds, plus only what outside removals leave behind.
- **K-5's Rewrite of `mutateRequest.ts:88`:** "An absent order leaves the destination's order as it stands, so the arrival sorts after the ordered ids; the source drops the id from its own."
- **Legacy Trash Bundles:** today's bundles carry no `place` and land `'last'`. The landing writes a full order from live ids, which erases their tombstone slot. That matches the Context precedent (`spend.test.ts:230-238`).

**`manual_order` Needs Nothing:** `tieOrderWith`'s `mergedRanking` keeps absent ids in place (`creationOrder.ts:30-41`), and `useViewHost.ts:74` applies `manual_order` only in custom order. A restored item regains its custom slot through the id it never lost.

**A Picked Destination:** `withDestination` drops `place` (`{ ...record, parent, place: undefined }`), so the item lands `'last'`, deterministically. The origin's neighbours mean nothing there.

**Evidence:**

- **The Raw Order's One Reader:** only `treePatch.ts:233-234` reads the raw sidecar order. Every writer composes from live ids (`useViewInteractions.tsx:181`, `sidebarDndModel.ts:305`, `creationOrder.ts:77`), so dropping the tombstone breaks no reader.
- **Batch Order:** with no search query, the Trash's batch runs rows newest first (`TrashFrame.tsx:116` over `shown`, which comes sorted newest first from `trashRows.ts:85-90`). A run of consecutive neighbours therefore replays exactly. A query ranks rows by match instead (`filterRows`, `TrashFrame.tsx:52-56`), and two anchors cover a run of two restored out of order either way.

**Alternatives:** the single anchor, the index, and the tombstone-preserving fold (*Call 1*). A further option, landing per New Page Placement on a picked destination, costs a personalization read on the host. `'last'` is simpler and already the precedent.

**Cost:**

| Part | Lines |
| --- | --- |
| `slotOf` | +4 |
| The composed order | +2 |
| `setChildOrder` at the landing | +1 |
| The two departure drops | +2 |
| `withDestination`'s drop | +1 |
| The `spliceBeside` move | ±0 |
| **Net** | **about +10**, matching the Investigation |

##### 4. E-4 Step-Aside

**Recommendation:** one landing name rule in the owner, `freeOnDisk`. It wraps `createDisambiguated` with a predicate asking the disk, and it runs after `resolveRecord`'s tree-side `freeName` and before anything is written:

```ts
// Core/Bundles/placement.ts
export async function freeOnDisk(root: string, entity: ArtifactRecord['entity'], dir: string, name: string): Promise<Result<string>> {
  const abs = join(root, dir)
  const leaf = (n: string): string => (entity === 'page' ? `${n}.md` : n)
  const blocked = async (n: string): Promise<boolean> =>
    (entity !== 'page' && (await landingRefusal(root, abs, n)) !== null) || pathExists(join(abs, leaf(n)))
  return createDisambiguated(name, async (n) => ((await blocked(n)) ? fail('exists', `"${n}" is taken.`) : ok(n)), blocked)
}
```

**What It Replaces:** the landing refusal and the `exists` refusal (`spend.ts:174-182`, 9 lines) leave. `landingRefusal` keeps its two other callers, the create (`create.ts:71`) and the Set move (`move.ts:51`), as a refusal, since a user-chosen name there should be refused rather than silently changed. The restore reads it as a predicate.

**Contexts and Spaces:** they ride the same rule. `freeOnDisk` runs before the Context's registry write (`spend.ts:205-211`), so the registry gets the stepped title. `landingRefusal` already answers null for a path under `.nexus` (`folderEntity.ts:27` ignores `hidden`).

**What `createDisambiguated` Does Exactly (`names.ts:66-79`):**

- **The First Attempt:** it tries the name and returns unless the failure's code is `exists`.
- **The Base:** it takes the base from the bare name, stripping ` (n)` when the bare name is itself taken on disk.
- **The Steps:** it tries `base (2)` … `base (50)` while each answers `exists`.
- **The Shared Rule:** `stepped` (`:53`) and `STEP_SUFFIX` (`:50`) are the one rule `freeName` also uses (`:56-64`).

**The Notice:** `MutateOutcome` gains `landedAs?: string`, the title the item took. Both restores set it whenever the final title differs from the artifact's own title, which covers the tree step today's resolver already takes silently and the new disk step. Lane 4/5 composes the words (Open Item 2).

**Tests That Pin the Refusals** (they become step-aside cases):

- `Core/Trash/spend.test.ts:1506`, 'restore — the gate-four pins' › 'an occupant the tree cannot see refuses the restore — never a clobber'.
- `spend.test.ts:1527`, 'a Set restored onto a folder Settings excludes refuses, the bundle intact'.

**Tests That Stay:**

- `spend.test.ts:784` ('disambiguates a taken title, matching the create convention').
- `spend.test.ts:794`, `:1343`, `:1373`, and `trashRecovery.test.ts:428`.
- `mutate.test.ts:3201-3236` (create, rename, and move onto an excluded or asset name still refuse).

**F-080:** leave it deferred. Preserve Restored Titles would rename the occupant through the rename op, with its `addressed` relink nested inside the restore's settle turn. It needs a Settings key and row, and a fallback for an occupant that is excluded or off-tree, which can't be renamed. F-080's own note on links that followed the namesake still stands. That is about +20 across three files, not a handful on this path. `freeOnDisk` is the single seam where it would branch.

**Alternatives:**

- **Feed `freeName` the Disk Listing:** one `listEntries(dest)` would supply the taken names, keeping one synchronous decision. But a page landing must not count a same-named folder (F-2 INFERRED: excluded folders count toward no title). It must also count excluded or asset entries with no folder on disk, which the listing can't see. The predicate is exact per kind.
- **Keep Refusing Off-Tree Occupants:** E-4 rules it out.

**Cost:**

| Part | Lines |
| --- | --- |
| `freeOnDisk` | +10 |
| `landedAs` (type + two replies) | +3 |
| The refusals leaving | −9 |
| **Net** | **about +4** |

##### 5. The `restoreArtifact` Split (A-3)

**Recommendation:** split by phase, not by kind. The Archive's restore needs four phases from `restoreArtifact`, so those leave it:

| Phase | Function and Home | Lines It Takes From `spend.ts` |
| --- | --- | --- |
| Placement | `placeRecord(record, artifactName, tree, destination?)`: `withDestination` + `resolveRecord` + `REFUSAL_TEXT` → `Result<Placement>` | `:164-170` |
| The Disk Name | `freeOnDisk` (*Call 4*) | `:172-182` |
| The Pages Coming Back | `heldPagesOf(root, bundle, files)`, the pages at the paths they left with their ids | `:183` |
| The Returning Relink | `returningNames(live, after, back)` → `{ names, own }`, in `Core/Nexus/settle.ts` beside `relink` | `:229-237`, `:245-248` |

What stays in `restoreArtifact`:

- **The Reconcile:** the frozen world, the scrub, and the park (`:184-202`).
- **The Context Registry Write and Rollback:** `:203-211`, `:221-227`.
- **The `targets` Repair:** `:238-244`.
- **The Kind Tails:** Context re-tag, Space re-tag, and Link refill (`:253-305`).

The tails stay one if/else chain. Extracting three per-kind functions adds signatures and removes no logic, and no second caller exists.

**What the Archive's Restore Reuses:** placement, the disk name, the pages coming back, the relocate, the order write, the bundle removal (`:315-318`), and the returning relink. It doesn't reuse the reconcile, the repair, or the refill, since Reach-In keeps the artifact current and D-1 never strips its inbound values. Its shape, in `Core/Archive/restore.ts` and about 25 lines (Scout C's figure holds):

```ts
export async function restoreArchived(root: string, bundleAbs: string, destination?: RestoreDestination): Promise<MutateReply> {
  const opened = await openBundle(root, bundleAbs); if (!opened.ok) return opened
  const artifact = await bundleArtifact(bundleAbs); if (!artifact) return fail('not-found', '…')
  const tree = await liveTreeOf(root)
  const placed = placeRecord(opened.value, basename(artifact), tree, destination); if (!placed.ok) return placed
  const name = await freeOnDisk(root, opened.value.entity, placed.value.dir, placed.value.finalName); if (!name.ok) return name
  const back = await heldPagesOf(root, bundleAbs, await contentPages(opened.value.entity, artifact))
  const target = join(root, placed.value.dir, leafOf(opened.value.entity, name.value))
  await relocate(artifact, target)          // the lift's carry rides relocateFolder for a Set (Lane 3)
  if (placed.value.order) await setChildOrder(join(root, placed.value.dir), keyOf(opened.value.entity), placed.value.order)
  recordWrite(bundleAbs); await machine().remove(bundleAbs)
  const after = await settledIndex(root)
  const cascade = after ? await relinkReturning(root, pageIndexOf(tree), after, back, titleOf(name.value)) : linksNotUpdated(titleOf(name.value))
  return ok({ ...(cascade ? { cascade } : {}), ...(stepped ? { landedAs: titleOf(name.value) } : {}) })
}
```

**Alternatives:**

- **Split by Kind (the Investigation's "0 to −20"):** the reconcile and relink run for every kind (a Context's or Space's `targets` repair included), so a by-kind split duplicates them or still shares the phases. The −20 came from the F-3 removals and the moves, which this phase split also takes.
- **Calling `restoreArtifact` From the Archive:** that would run the reconcile on a page Reach-In already keeps current. Rejected.

**Cost:**

| Part | Lines |
| --- | --- |
| Lines leaving `spend.ts` | about −30 |
| Lines landing in the owner and `settle.ts` | about +30 |
| **Net** | **about ±0** |

The new behavior is counted under *Calls 3* and *4*.

##### 6. E-3 and the Undo

**Recommendation:** the Trash record keeps `archive`, the Archive bundle's relative path, which encodes both the Collection id and the original stamp. The `restore` op's destination gains `{ kind: 'archive' }`.

- **The Undo:** after a delete from the Archive, the Undo sends `restore { bundlePath: <trash bundle>, destination: { kind: 'archive' } }`.
- **The Trash Browser's Restore:** it sends a plain `restore`, which goes to the origin.
- **Both From the Record:** both answers come from the record (E-3 INFERRED).

**The Undo's Landing:** inside the Trash's `restoreArtifact`, as a placement arm:

- **The Target:** `join(root, record.archive, basename(artifact))`.
- **The Re-Mint:** `mkdir` (already `spend.ts:213`) re-mints the exact bundle name, so the stamp and archived time return.
- **The Record:** after the relocate, it writes the Archive record (`{ entity, id, parent, place, origin }`).

The reconcile runs as for any Trash restore, since the item sat outside every cascade while in the Trash:

- **The Scrub's Owner:** the scrub resolves its owner Collection through `owningCollection`'s archive arm (Lane 1).
- **The Repair:** `targets` repair the artifact's own links.
- **The Refill:** `links` refill the stripped values while Restore Links On Deletion is on (D-1 keeps them while archived).
- **The Relink:** it's a natural no-op, since the page doesn't arrive in the tree.

The Undo costs about +8 lines in `restoreArtifact` and +2 for the destination union (`mutateRequest.ts:36`).

**The Delete From the Archive:** the seam sits in `deleteOp`, not `mutableTarget`. `mutableTarget` (`liveTree.ts:79-87`) gates 18 call sites across 12 files, among them `setIcon`, `setActiveView`, `setDisclosureLock`, `reorderChildren`, `setProperty`, the move ends, and the create parents. Widening it would let all of them write into the Archive, and its doc at `:79` would turn false. `deleteOp` reads one source built two ways:

```ts
// Core/Trash/delete.ts
type Source = {
  abs: string                                // the artifact
  chainFrom: string                          // live: abs; archived: join(root, record.origin.path)
  under: string[]                            // rel paths for gatherLinkTargets; archived: contentPages' rels inside the bundle
  paths: string[]                            // the strip's keys; archived: heldPathOf(origin) per page
  record: () => Promise<RecordFile>          // live: gatherContentRecord; archived: { ...archiveRecord, archive: req.path }
  edit: ConfigEdit | null                    // live: goneEdit(tree…); archived Set: goneContainers(ids read from its sidecars on disk)
  vacate?: string                            // archived: the emptied archive bundle, removed after the artifact moves
}
```

What the archived source answers:

- **The Chain:** minted from `record.origin.path` (archive time), not the origin's current path. Inbound path links to an archived page keep their archive-time spelling, since `respellings` only re-spells pages the index holds (`Core/Connections/rewrite.ts:22-48`; `settledIndex` is tree-based). With the archive-time chain, the strip keys, `emptyBundle`'s later strip, and the frozen crumbs all read the keys links were written with.
- **The Live Crumbs:** they still come from `parent` by id.
- **A Mismatched Kind:** `req.kind` must match `record.entity`, or the delete answers `NOT_HELD`, as a mismatched `mutableTarget` does (+1).
- **The Gone Ids:** `goneEdit`'s container arm (`configReach.ts:288-297`) hoists to `goneContainers(ids)`, so the archived Set builds the same `ConfigEdit` from ids read off its sidecars on disk (+5).
- **System-Trash Mode:** it discards the artifact and removes the archive bundle.
- **Metadata:** `pageIds` is computed as today (`delete.ts:48`), so B-3 holds in Nexus mode.

**The Shared Archive-to-Trash Move:** `moveIntoStore(root, from: ListedBundle, to: BundleStore, extra)` in the owner mints, writes the record ahead, relocates the artifact, and removes the emptied source bundle. The record it writes spreads `extra` onto the source `_record.json` read raw (`readJsonObject`), not onto the decoded `from.record`, since the format never rewrites a record from its decode (`record.ts:46`, honored by `appendLinks`' raw RMW at `:95-101`). The delete from the Archive calls it, then runs the strip, the final record, and the configuration pass as today. F-5's sweep calls it bare (*Call 8*). It is about +10 and reuses `deleteOp`'s write-ahead order unchanged.

**`armed`/`spendBundle`:** they're keyed by any string (`confirmations.ts:40-46`), so archive bundle paths spend through them unchanged.

- **The Rename:** `spendUndo(key)` is a rename only.
- **ArchiveView:** its Restore and Delete call it with the archive bundle path, as `TrashFrame.tsx:100`, `:121` do.
- **Delete From the Archive:** its Undo is armed by the Trash bundle path.
- **Notices:** `notifyTrashed`'s closure (`:55-61`) serves the archive's Undo (`restore { bundlePath: <archive bundle> }`) with the verb as a parameter. The delete from the Archive passes `destination: { kind: 'archive' }` through.
- **Owner:** Lane 4/5 owns the notice copy.

**One `restore` Op for Both Stores:**

- **The Routing:** the dispatcher routes `restore` by `storeOf(req.bundlePath)`. An archive bundle runs `inSettleTurn(() => restoreArchived(…))`, with no `underContexts`, since it changes no Context. A Trash bundle runs as today.
- **What's Already Keyed by Path:** the Undo closure, `changesSettled`, the batch runner's `{ op, bundlePath }` (`TrashFrame.tsx:98-100`, `:117`), and `spendUndo` are all keyed by bundle path already.
- **Lane 4's Effect:** Lane 4's store table loses its restore-op entry.
- **The Alternative:** a separate `unarchive` op is explicit but gives the user's one verb, Restore, two op names. The routing is the check `openBundle` already performs (`spend.ts:59-61`), answering instead of refusing.

**Alternatives for the Undo:**

- **Restore to the Origin, Then Re-Archive:** the archived time resets, a stepped-aside name carries back into the Archive, and the Undo fails outright when the origin is gone.
- **The Undo Closure Carrying the Archive Path:** this keeps the path out of the record. But the record must carry every archive field anyway for the Undo to rebuild the Archive record, and the renderer would send a raw path to an op. E-3 INFERRED reads it from the record.

**Cost:**

| Part | Lines |
| --- | --- |
| The `deleteOp` source | +20 |
| `moveIntoStore` | +10 |
| `goneContainers` | +5 |
| The Undo arm | +8 |
| The destination union | +2 |
| Dispatch routing | +3 |
| The `armed` rename | ±0 |
| **Net** | **about +48**, overlapping the Investigation's "about 110" Archive-domain estimate |

##### 7. F-4 Disposal

**Recommendation:** when the bundle or target is a Collection, `emptyBundle` and `deleteOp`'s system-trash branch dispose of `.nexus/archive/<record.id>` the way the Collection's artifact goes.

- **Emptying the Trash:** it erases the Archive when Permanently Delete Files is on, and otherwise hands it to the system trash (`spend.ts:85-87`).
- **A System-Trash Delete:** it hands the Archive to `deps.trashToSystem`.

That is F-4's "wherever Trash Mode sends deletions". The shape:

```ts
const kept = record.entity === 'collection' && record.id ? await heldPagesIn(root, { kind: 'archive', id: record.id }) : []
// pageIds += pageIdsOf(kept.map((p) => p.file)); strip paths += kept.map((p) => p.path)  (heldPathOf through each record's origin)
// after the artifact goes: dispose(join(root, archiveDirRel(record.id)))
```

**How the Pieces Fold:**

- **`heldPagesIn`:** it is today's `trashedPages` (`holdings.ts:72-82`) generalized by store. The Trash's `parkLinks` reads it for the Trash, and F-4 for the Archive, so the function is one.
- **The Strip:** the strip runs once over both page sets.
- **The Metadata Drop:** the drop runs once over both id sets. `dropPageMetadata` filters `idHeld` (`pageMetadata.ts:120`; `heldPages.ts:30-33`), which is tree-only, so archived ids drop as intended.
- **A Nexus-Trash Delete or Restore:** neither needs anything (F-4).

**Alternatives:**

- **A Separate `disposeArchive` With Its Own Strip and Drop:** that is two strips per empty. Folding into the one strip is about −4.
- **Moving the Archive Into the Collection's Bundle:** F-4's *Rejected* rules it out.

**Cost:**

| Part | Lines |
| --- | --- |
| `emptyBundle` | +5 |
| `deleteOp`'s system branch | +4 |
| `heldPagesIn`'s store parameter | +1 |
| **Net** | **about +10** (the Investigation said +12) |

##### 8. F-5 Orphans

**Recommendation:** one pass, `sweepOrphanedArchives(root, tree)` in `Core/Archive/orphans.ts`, about 22 lines:

```ts
const ids = await archiveDirs(root)                                    // one listEntries of .nexus/archive
const live = new Set(tree.collections.map((c) => c.id))
let lost = ids.filter((id) => !live.has(id)); if (!lost.length) return
const excluded = await excludedCollectionIds(root)                     // see below
lost = lost.filter((id) => !excluded.has(id)); if (!lost.length) return
const trashed = new Set((await listBundles(root, { kind: 'trash' })).flatMap(({ record }) => record.entity === 'collection' && record.id ? [record.id] : []))
for (const id of lost.filter((id) => !trashed.has(id))) {
  for (const b of await listBundles(root, { kind: 'archive', id })) await moveIntoStore(root, b, { kind: 'trash' }, {})
  await removeIfEmpty(join(root, archiveDirRel(id)))
}
```

**The Order of Checks Keeps It Free in the Common Case:** the tree ids are in memory. The excluded check costs at most one sidecar read per root-level excluded entry (NexusOS: 4). The Trash walk runs only when an id is still unmatched.

**Where It Sits in `.trash`:**

- **The Chain:** `moveIntoStore` mints the chain from `record.origin.path`, so `Alpha/Beta/Notes.md` lands at `.trash/Alpha/Beta/<stamp>__Notes.md.deleted/`. It reads as the Collection it came from (F-5 INFERRED).
- **The Crumbs:** `frozenCrumbs` needs no new prefix rule, since nothing under `.trash/.nexus/archive/…` is ever minted. The Investigation's worry about `trashChainDir` mirroring the archive path falls away because the chain comes from the record, not the source path.
- **The Record:** it is the archive record unchanged, keeping origin id, place, and trail (F-5 INFERRED), with no `archive` field, since there's no Undo.
- **A Restore:** it returns home if `parent` resolves, and otherwise asks for a destination (`homeResolves`, `trashRows.ts:47-50`).

**No Strip, No Configuration Pass:**

- **Why:** this is safekeeping (F-5). Link values naming the item stayed in place while it was archived (D-1), and they stay in place in the Trash.
- **A Restore:** they resolve again on restore with nothing to refill.
- **An Empty:** `emptyBundle`'s strip already takes "a Link value naming one of its pages, recorded by the delete or taken up since" (`spend.ts:90-97`).
- **Trash Mode:** `moveIntoStore` always mints into `.trash`, so Trash Mode never applies.

**Where in the Open Sequence:** inside the seed's `try`, after `seedLiveTree(tree)` and `runOpenLedger` and before `seedContentIndex` (`Core/Nexus/handlers.ts:99-104`), with its own `.catch` logging, as `prepareOpenedNexus`'s steps do (`handlers.ts:44-52`).

- **A Tree, Structurally:** the `try` means it runs only with a seeded tree, with no guard. A failed seed walk (`:101-103`) skips it.
- **Once Per Genuine Open:** it sits inside `if (root !== priorRoot)` (`:85`), so it never runs on a mid-session re-point.
- **Before the Index Seed:** the pass needs only the tree, the Trash's records, and excluded sidecars, never the index. Running it first means the seed never indexes what's leaving. Own moves with a held tree go through `applyOwn` → `applyEvents` (`settle.ts:40-52`), and `classifyEvent` ignores both `.nexus/archive` and `.trash`.
- **Its Own Catch:** an I/O failure in one Archive mustn't abort the open, and the seed's catch would otherwise misreport it as a failed walk.
- **Shared With Lane 3:** Lane 3's F-6 open pass ("re-files a misfiled one", Scout 3 Call 4) wants the same position, so the two share it. The reconciler can make them one pass over `archiveDirs`.

**An Excluded Collection's Id:** Collections live only at the Nexus root (`create.ts:58-59`), so an excluded Collection is a root-level excluded entry carrying `_pagecollection.json`:

```ts
const excludedCollectionIds = async (root: string): Promise<Set<string>> =>
  new Set((await Promise.all((await readWatchScope(root)).excluded.filter((e) => !e.includes('/')).map((e) => sidecarId(join(root, e), 'collection')))).flatMap((id) => id ?? []))
```

`readWatchScope` is `Core/Settings/settings.ts:53`, and `sidecarId` is `Core/Files/sidecar.ts:7-10`.

**Cautionary:** see *Cautionary Items* (unreadable sidecars across devices, interrupted first syncs, empty and litter directories).

**Cost:** about +22, against the Investigation's +20.

##### 9. Clear Nexus Cache (Prospect)

**Inventory:**

| Piece | Where | Lines |
| --- | --- | --- |
| `excludedArtifacts` | `exclusionScan.ts:31-52` | 22 |
| `clearRewrite` | `exclusionScan.ts:54-64` | 11 |
| `clearExclusionData` | `exclusionScan.ts:66-88` | 23 |
| Constants and imports | `exclusionScan.ts:1-29` | ~29 |
| The handler | `Core/Settings/handlers.ts:37-40` | 4 |
| The channel | `Core/Contract/bridge.ts:81` | 1 |
| The renderer action | `frames.ts:145-150` | 6 |
| The row | `frames.ts:574-579` | 6 |
| The confirmation | `confirmations.ts:202-210` | 9 |
| The shared row component | `Core/Settings/ClearActionRow.tsx` (23, shared with Clear History, `frames.ts:626-631`) | — |

**Apart:** Clear Exclusion Cache doesn't change (excluded folders sit outside `.nexus`), and F-5's sweep adds about +22 at open.

**Together:** the same +22 plus about 6 more:

- **The Handler:** it runs both (+1).
- **The Gate:** `clearExclusions`' `count === 0` gate (`frames.ts:146-147`) can no longer short-circuit, since orphans can exist with no exclusions (+1).
- **The Confirmation:** `askClearExclusions` can't name an orphan count without a new query, so its copy and signature change (+2).
- **The Report:** `ClearReport` gains an orphaned count (+1).
- **The Row:** it is renamed and moves to Maintenance (±0).

**Recommendation:** leave it. It leaves more than the two apart (about +6), and nothing shows the on-demand trigger is needed. The one in-session way a user orphans an Archive is Clear Exclusion Cache itself, and F-1 INFERRED already accepts the orphan moving to the Trash at the next open. If immediacy is wanted later, one line in the `exclusions:clear` handler (`Core/Settings/handlers.ts:37-40`) can run `sweepOrphanedArchives` after the clear, without a new action.

##### 10. The Archive's Restore and the Settle

**Recommendation:** the Archive's restore runs in `inSettleTurn`, like the Trash's, and doesn't ride `addressed`. The two-map relink folds into `settle.ts` as the one returning re-spell both restores call:

```ts
// Core/Nexus/settle.ts, beside relink
/** A return re-spells the live world once: for the arrival's collisions, and for the returning pages' own old keys where the world before names nothing, so a title-only link that found a namesake stays with it (D-1). */
export function returningNames(live: PageIndex, after: PageIndex, back: readonly ConnPage[]): { names: Map<string, string>; own: Map<string, string> } {
  const ids = back.map((p) => p.id)
  const own = respellings(buildPageIndex(back), after, ids, [])
  const names = respellings(live, after, [], ids)
  for (const [k, v] of own) if (live.resolve(k).status === 'phantom') names.set(k, v)
  return { names, own }
}
```

- **The Trash's Use:** the Trash calls it after its `targets` repair and feeds `own` to its refill (`spend.ts:296`).
- **The Archive's Use:** the Archive passes `back` = the archived pages at `origin.path`-derived paths (`heldPagesOf`) and ignores `own`.

**Why Not `addressed`:**

- **Arrivals Only:** `addressed`'s single diff (`mutate.ts:103-106`) sees an archived page only as an arrival, since `settledIndex` is tree-based (`settle.ts:242-246`). It re-spells only the arrival's collisions (`rewrite.ts:33-37`).
  - **What It Misses:** a path link naming the item's archive-time path, say `[[Alpha/Beta/Notes]]` when `Beta` was renamed `Gamma` meanwhile or the item stepped aside. That link stays broken, which contradicts D-1 INFERRED ("re-spell to where it lands on restore, as a move's do").
- **The Twin Problem:** seeding the archived page into `before` at its origin path, to make it a move, is exactly what `spend.ts:229` rules out. Beside the returning page, a live twin's bare link reads ambiguous, and a returning `Notes/Alpha` would take `notes/alpha` from a live `X/Notes/Alpha`.
- **The Comment Still Holds:** it was written in Path Links Phase 8 (`d5462735f`), after the path syntax landed.
- **The Label:** `addressed` derives its label from `req.name`, `req.newName`, or `req.path` (`mutate.ts:99-100`). A restore request carries only `bundlePath`, and its title is known only after the disk step.

**Can `restore` Itself Move Under `addressed`:** no, for three reasons:

- **The Two Maps:** the two-map rule is required, as above.
- **The Repair's Position:** the Trash's `targets` repair must run between the after-index and the cascade (`spend.ts:237-248`).
- **The Lock:** a Context or Space restore needs `underContexts`.

`addressed` stays as it is.

**What `changesSettled` Gains:** only `archive` (`mutateRequest.ts:138-147`). Both restores are `restore`, already listed, and the delete from the Archive is `delete`, already listed. The `archive` op runs `inSettleTurn(() => archiveOp(…))`, as a page or Set delete does (`mutate.ts:132`), with no relink: links to it go unresolved (D-1), and a delete re-spells nothing either.

**Alternatives:**

- **`addressed` Gains `back` and a Reply-Derived Label:** this serves the Archive's restore and leaves the Trash out. Same lines, but two wrappers would each own half of the returning rule.
- **Inline the Two-Map in the Archive's Restore:** a second copy of the rule. Rejected under One Way.

**Cost:**

| Part | Lines |
| --- | --- |
| `returningNames` | +8 |
| What leaves `spend.ts` | −9 |
| The `archive` op's dispatch arm and `changesSettled` | +3 |
| **Net** | **about +2** |

##### 11. E-5: An Origin Set Itself Archived

**Recommendation:** it stands as `parent-gone`, and the row asks for a destination, as for a Set that is trashed or excluded.

- **No New Code:** `findContainerById` (`resolve.ts:27-28`) reads the tree only, and an archived Set has left it, so `resolveRecord` answers `parent-gone` (`:79-80`). `homeResolves` turns false (`trashRows.ts:47-50`), and the row offers the destination picker (`TrashFrame.tsx:161-176`, through the shared browser).
- **It Reads Like E-5:** the user who wants the item back in its Set restores the Set first, then the item, which finds it by id. That is E-5's own reading for a trashed Set.
- **Batches:** a batch restore runs newest first. When the item was archived before its Set, the Set (newer) restores first and the item finds it in the same batch. When the item was archived after, it's homeless in the batch and is named among those that "had nowhere to go" (`TrashFrame.tsx:131-135`).

**Alternatives:**

- **Restore Into the Archived Set's Bundle:** the item would ride inside the archived Set, which nests one bundle's artifact inside another's and breaks "one record per bundle". The F-6 carry and ArchiveView would then need to read nested records, and the restore would land in the Archive, which isn't a restore.
- **Refuse Until the Set Returns:** the row would be stuck, with nothing the user can do from it.
- **Unarchiving a Set Brings Back Its Children:** a cascade nobody asked for, and E-5 reads the reverse.

**Copy:** `REFUSAL_TEXT['parent-gone']` reads "The place this belonged to no longer exists" (`spend.ts:52`), which isn't quite true for an archived origin. The picker opens instead of showing it, but the copy is Open Item 2's.

**Cost:** 0.

##### 12. B-3: No Archive Op Calls `dropPageMetadata`

**Confirmed:**

- **The Callers:** `dropPageMetadata` has three, and only three (`delete.ts:101`, `spend.ts:88`, `exclusionScan.ts:85`).
- **The Archive Op and the Archive's Restore:** both are new and call none.
- **A Delete From the Archive:** in Nexus-Trash mode it passes `pageIds = []` (`delete.ts:48`), so the drop is a no-op. In system-trash mode the item leaves the Nexus, so the drop is correct.
- **F-5's Sweep:** it always mints, and drops nothing.
- **F-4's Disposal:** it drops for the disposed Archive's pages, since they're gone for good.
- **The Reads:** `readPageMetadata` loads every shard without pruning, so B-3 costs nothing.
- **The Edge:** see *Cautionary Items* for twin ids.

---

#### Removal & Consolidation

| What | Where | Change | Lines |
| --- | --- | --- | --- |
| The landing refusal and the `exists` refusal | `Core/Trash/spend.ts:174-182` | Replaced by `freeOnDisk`'s step-aside, one rule for both stores (E-4) | −9 / +10 |
| `excluded` in the record and its gather, release, and reseat | `record.ts:38-39`; `gather.ts:72`; `delete.ts:109`; `spend.ts:177`, `:217-219` | Leave (F-3; Lane 3 counts the `settings.ts` half) | −8 |
| The two-map relink | `spend.ts:229-237`, `:245-248` | `returningNames` in `Core/Nexus/settle.ts`, shared by both restores | −9 / +8 |
| `trashChainDir` + `mintBundle` + `BUNDLE_SUFFIX` | `Core/Trash/bundle.ts:11-39` | Store-parameterized in `Core/Bundles/bundle.ts` (`layoutOf` by switch) | −24 / +27 |
| `deletedPathOf` | `bundle.ts:22-24` | `heldPathOf`, reading the chain or `origin.path` by layout | −3 / +4 |
| `deletedAtOf` | `trashRows.ts:12-19` | `stampedAtOf`, the one time source for both stores | ±0 |
| `frozenCrumbs` | `trashRows.ts:21-29` | Chain or `origin.path` by layout | −9 / +10 |
| `openBundle`'s Trash-only gate | `spend.ts:58-64` | `storeOf` + read, answering which store | −7 / +10 |
| `listBundles`' fixed root | `holdings.ts:24-46` | A store parameter | −23 / +23 |
| `trashedPages` / `trashedPagesOf` | `holdings.ts:72-96` | `heldPagesIn(root, store)` / `heldPagesOf`, shared by parking, F-4, and the Archive's restore | ±0 |
| `TrashRow`/`TrashCrumb`/`deletedAt` | `Core/Trash/trashRow.ts:5-28`; `bridge.ts:8`, `:259` | `BundleRow`/`BundleCrumb`/`storedAt` (Lane 4's names) | ±0 |
| `trashRow.ts` (TrashMode, 4 lines left) + `bundle.ts`'s Trash Mode remainder | `trashRow.ts:30-33`; `bundle.ts:41-80` | One file, `Core/Trash/trashMode.ts`: where Trash Mode sends a deletion | −1 file, ±0 |
| `writePropertyBundle` | `record.ts:86-93` | Moves to its one caller, `Core/Properties/deleteProperty.ts` | ±0 |
| `appendLinks` | `record.ts:95-101` | Moves beside `parkLinks`, its one caller (`holdings.ts`) | ±0 |
| `gatherParentRef` + `gatherContentRecord` | `gather.ts:24-29`, `:61-74` | Move to the owner (both stores build a live item's record) and gain `place` + `origin` | −20 / +28 |
| `resolveRecord`'s container arm | `resolve.ts:76-91` | Composes the destination order through `slotOf` + `spliceBeside` | +6 |
| `spliceBeside` + `Slot` | `Core/Views/creationOrder.ts:10-28` | Move to `Core/Nexus/order.ts` beside `resolveOrder`, so the host reaches them without a Views import | ±0 |
| The departure drop | the archive op; `delete.ts` after `:99` | `dropFromChildOrder`, as moves do | +2 |
| `withDestination` | `spend.ts:105-128` | Moves to the owner; drops `place`; gains the `archive` destination | +4 |
| `goneEdit`'s container arm | `configReach.ts:288-297` | `goneContainers(ids)`, shared with the archived-Set delete's disk ids | +5 |
| `restoreArtifact` | `spend.ts:143-323` | Split by phase (placement, disk name, pages back, relink out); the reconcile and kind tails stay | ±0 |
| F-4 disposal | `spend.ts:83-101`; `delete.ts:46-48`, `:100-101` | One strip and one metadata drop over the Collection's and its Archive's pages | +10 |
| F-5 sweep | `Core/Archive/orphans.ts` (new); `handlers.ts:99-104` | Once per open, before the index seed | +22 |
| The delete from the Archive | `delete.ts` (the source) + `moveIntoStore` | One source built two ways | +30 |
| The archive-destination Undo | `restoreArtifact`'s placement step | Re-mints the archive bundle by `record.archive` | +8 |
| `landedAs` | `mutateRequest.ts:12-20`; both restores | The title a restore took (E-4's notice) | +3 |
| The record's new fields | `record.ts:33-44` | `place`, `origin`, `archive` | +7 |
| B-2's resolver | `Core/Paths/nexusPaths.ts` | `ARCHIVE_DIR_REL`, `archiveDirRel`, `archivedCollectionIdOf` | +5 |
| `mutateRequest.ts:88`'s comment | `mutateRequest.ts:88` | Rewritten (K-5) | 0 |
| F-080's text and "Decision 33" | `.claude/IssuesPM.md:1054`, `[^80]` `:1436` | The refusal description goes once E-4 lands; "Decision 33" (stale numbering) becomes E-4; the citations follow the moves | docs |

**Lane Net:** about −113 / +222, or roughly +110. About +60 of that is the Archive's own required lifecycle (the delete from the Archive, F-4, and F-5), and about +25 is the exact-place and step-aside behavior both stores gain. The hoist itself nets about +15.

---

#### File Moves

| From | Symbols | Lines | To |
| --- | --- | --- | --- |
| `Core/Trash/bundle.ts` (80) | `BUNDLE_SUFFIX` (`:11`), `trashChainDir` (`:13-20`), `deletedPathOf` (`:22-24`), `fileStamp` (`:26`), `stampedLeaf` (`:28-29`), `mintBundle` (`:31-39`) | 24 | `Core/Bundles/bundle.ts` |
| `Core/Trash/bundle.ts` | `trashFileFlat` (`:41-51`), `TrashDeps` (`:53-57`), `trashDeps` (`:59-66`), `discardFile` (`:68-80`) | 37 | `Core/Trash/trashMode.ts` (renamed) |
| `Core/Trash/record.ts` (113) | `RECORD_FILENAME` (`:11-12`), `parentRef` (`:14-19`), `memberRoot`/`spaceRef` (`:21-22`), `strippedLink` (`:24-28`), `linkTargets` (`:30-31`), `contentRecord` (`:33-44`), `recordFile` (`:46-77`), the types (`:79-80`), `writeRecord` (`:82-84`), `readRecord` (`:103-108`), `bundleArtifact` (`:110-113`) | 76 | `Core/Bundles/record.ts` (`bundleArtifact` → `Core/Bundles/bundle.ts`) |
| `Core/Trash/record.ts` | `writePropertyBundle` (`:86-93`) | 8 | `Core/Properties/deleteProperty.ts` |
| `Core/Trash/record.ts` | `appendLinks` (`:95-101`) | 7 | `Core/Trash/holdings.ts` |
| `Core/Trash/holdings.ts` (162) | `ListedBundle` (`:18-22`), `listBundles` (`:24-46`), `contentPages` (`:48-61`), `pageIdsOf` (`:63-67`), `trashedPage`/`trashedPages` (`:69-82`, as `heldPagesIn`), `trashedPagesOf` (`:84-96`, as `heldPagesOf`) | 79 | `Core/Bundles/bundle.ts` |
| `Core/Trash/resolve.ts` (93) | the whole file | 93 | `Core/Bundles/placement.ts` |
| `Core/Trash/spend.ts` (336) | `REFUSAL_TEXT` (`:51-56`), `openBundle` (`:58-64`), `NO_DESTINATION` + `withDestination` (`:105-128`) | 37 | `Core/Bundles/placement.ts` (`openBundle` → `bundle.ts`) |
| `Core/Trash/spend.ts` | the two-map relink (`:229-237`, `:245-248`) | 13 | `Core/Nexus/settle.ts` (`returningNames`) |
| `Core/Trash/trashRow.ts` (33) | `TrashCrumb` (`:5-9`), `TrashRow` (`:11-28`) | 24 | `Core/Bundles/rows.ts` (`BundleCrumb`, `BundleRow`) |
| `Core/Trash/trashRow.ts` | `TrashMode`, `DEFAULT_TRASH_MODE` (`:30-33`) | 4 | `Core/Trash/trashMode.ts`; `trashRow.ts` deleted |
| `Core/Trash/trashRows.ts` (90) | the whole file | 90 | `Core/Bundles/rows.ts` |
| `Core/Trash/gather.ts` (144) | `gatherParentRef` (`:24-29`), `gatherContentRecord` (`:61-74`) | 20 | `Core/Bundles/record.ts` |
| `Core/Views/creationOrder.ts` (95) | `Slot` (`:10`), `spliceBeside` (`:12-28`) | 18 | `Core/Nexus/order.ts` |

**Moved Into the Owner:** about 443 lines (the rows bound for `Core/Bundles/` sum to 24 + 76 + 79 + 93 + 37 + 24 + 90 + 20), plus 13 into `Core/Nexus/settle.ts` and 18 into `Core/Nexus/order.ts`. What stays in `Core/Trash/` is the Trash's own model:

- `delete.ts` (116, plus its source)
- `gather.ts` (~120: link targets, Space and Context records)
- `holdings.ts` (~95: parking and refill)
- `spend.ts` (~250: emptying, the reconcile, the kind tails, `reapply`)
- `restoreScrub.ts` (213)
- `restoreProperty.ts` (75)
- `handlers.ts` (24, `delete:facts`, plus `trash:list` until Lane 4's `bundles:list` replaces it)
- `trashMode.ts` (~42)

**Import Sites That Change (Outside Tests):**

- `Core/Contract/bridge.ts:8`
- `Core/Contract/handlers.ts:8`
- `Core/Interface/Confirm/confirmations.ts:4`
- `Core/Settings/TrashFrame.tsx:18`
- `Core/Assets/assetMigrate.ts:20`, `:32`
- `Core/Assets/handlers.ts:17`
- `Core/Nexus/handlers.ts:34`
- `Core/Nexus/mutate.ts:10`, `:11`, `:36`
- `Core/Testing/settledMutate.ts:8`
- `Core/Tiles/handlers.ts:18`
- `Core/Tiles/tilesFile.ts:31`, `:37`
- `Core/Properties/deleteProperty.ts:1`
- `Core/Properties/assignment.ts:23` (unchanged: `parkLinks` stays)
- `Core/Views/Host/useViewCreation.ts:22`, `useViewInteractions.tsx:31`, `Core/Actions/createActions.ts` (for `spliceBeside`, only if they import it directly; today they import `placeAt`/`tieOrderWith`, which stay)

**Test Imports That Change:** `spend.test.ts`, `trashRows.test.ts`, `deleteOrder.test.ts`, `deleteReach.test.ts`, `trashRecovery.test.ts`, `restoreScrub.test.ts`, and `restoreProperty.test.ts` (`listBundles`, `bundleArtifact`, `readRecord`, `resolveRecord`, `deletedPathOf`).

---

#### Reusable

- **The Record and Its Gather:** `contentRecord('page' | 'set')` and `gatherContentRecord` serve the archive op unchanged beyond `place` and `origin`. The parent is right while the item is still in the tree (`gather.ts:24-29`).
- **The Listing and Rows:** `listBundles` + `trashRowOf` give ArchiveView its rows with `homeResolves` included (`trashRows.ts:47-50`, `:58-83`).
- **The Destination Picker:** `withDestination` + `containerTargets` serve homeless archive rows (E-5, F-1).
- **The Order Write:** `setChildOrder`, `dropFromChildOrder` (`reorder.ts:66-79`), `spliceBeside`, and `nextOrder` are the exact-place write.
- **The Disk Name:** `createDisambiguated` is E-4's disk-asking step, unchanged (`names.ts:66-79`).
- **The Write-Ahead Order:** `deleteOp`'s record-ahead → relocate → strip → final-record sequence serves the delete from the Archive and F-5 through `moveIntoStore` unchanged (`delete.ts:45-108`).
- **The Undo:** `armed`/`spendBundle`, `notifyTrashed`'s closure, and `notifyUndoable` serve the archive's Undo with a verb parameter (`confirmations.ts:40-65`; `notifications.ts:106-137`).
- **The Settle Turn:** `inSettleTurn` wraps the archive op and the Archive's restore, as it wraps delete and restore (`mutate.ts:129-135`).
- **The Precedents:** the Context record's `at` place and its restore-at-end are precedents for `place` and the `'last'` fallback (`spend.test.ts:187-238`; `withContextAt`, `Core/Contexts/contextsRegistry.ts:47-52`).
- **The Batch Order:** the newest-first order (`trashRows.ts:85-90`) makes batch restores replay neighbour runs exactly.

---

#### What Becomes False

##### Tests

- `Core/Trash/spend.test.ts`:
  - **The Refusals Turn Into Step-Asides:**
    - **`:1506`:** 'restore — the gate-four pins' › 'an occupant the tree cannot see refuses the restore — never a clobber' becomes the item stepping aside past the occupant.
    - **`:1527`:** 'a Set restored onto a folder Settings excludes refuses, the bundle intact' becomes the Set stepping aside.
  - **`:1542`:** 'only a trash bundle restores — an in-nexus path refuses' keeps refusing, through `storeOf`. Its message may change, and an archive bundle path now routes rather than refusing.
  - **`:1770`, `:1791`:** 'emptyBundle' › 'refuses a chain folder that merely wears the suffix…' and 'refuses a path inside the nexus but outside the trash…' keep refusing through `storeOf`. `emptyBundle` stays the Trash's alone.
  - **`:734-916`:** 'resolveRecord — a placement with final names, or a typed refusal' changes its imports to `Core/Bundles/placement.ts`. New cases cover the composed order.
  - **`:1854-2148`:** 'restore — into a chosen destination' gains the `archive` destination and `place` dropped on a picked destination.
  - **The Record Shape (`:104-185`):** the record cases stay (they use `toMatchObject`) and gain `place` and `origin` assertions.
- `Core/Trash/trashRows.test.ts`:
  - **`:64`:** 'trashRows — a bundle as the browser reads it' becomes `rowsOf`.
  - **`:121`:** 'a missing parent falls back to the frozen chain and says its home is gone' gains the flat store's `origin.path`.
  - **`:167`:** 'reads the deletion time out of the bundle stamp, newest first' becomes `storedAt`.
  - **`:234`:** `describe('deletedPathOf')` becomes `heldPathOf`.
- `Core/Trash/deleteOrder.test.ts:154-220` ('the record is written before the destruction it describes') gains the archive source. Its `toMatchObject` record expectations stay.
- `Core/Trash/trashRecovery.test.ts:122` ('a page deleted and restored comes back where it was, and leaves the list') pins the exact order slot.
- `Core/Trash/deleteReach.test.ts`: the tree-held source assumption gains the archive source (Scout C).
- `Core/Nexus/mutate.test.ts`: no existing case breaks. New cases cover the departure drop beside `:792`, 'movePage drops the page's id from the source folder's page_order'.

##### Comments

- **`Core/Nexus/mutateRequest.ts:88`:** both sentences (K-5).
- **`Core/Trash/bundle.ts:13`:** "`.trash` reads as a shadow of the nexus…" becomes the store's chain layout.
- **`Core/Trash/bundle.ts:22`:** `deletedPathOf`'s doc, which moves.
- **`Core/Trash/trashRow.ts:11`:** "the renderer never sees a `.deleted` suffix" becomes either suffix.
- **`Core/Trash/trashRows.ts:21`:** "`.trash` mirrors the nexus faithfully…" becomes the chain or the recorded origin.
- **`Core/Trash/holdings.ts:1`:** "What the Trash holds — its bundles…" loses the listing.
- **`Core/Trash/resolve.ts:1`, `:30`:** "every name and title choice is made here" becomes the tree's choice, with the landing stepping further aside past the disk. The owner's `placement.ts` header says both.
- **`Core/Trash/spend.ts:180`:** the squatter-refusal comment leaves.
- **`Core/Trash/spend.ts:229`:** the two-map comment moves with `returningNames`.
- **`Core/Trash/record.ts:38`:** the `excluded` doc leaves (F-3).
- **`Core/Nexus/settle.ts:248`:** "The one re-spell…" names the returning rule beside it.
- **`Core/Interface/Confirm/confirmations.ts:42`:** "…spends the Undo its delete's notice offered" becomes its archive's or its delete's.
- **`Core/Paths/nexusPaths.ts:7`:** K-5, now beside the resolver block.
- **Stays True:** `Core/Nexus/liveTree.ts:79`, since the seam is in `deleteOp`.

##### Docs

- `.claude/Features/NexusRecordPM.md`:
  - **`:4`:** "Provenance, a JSON written into every deletion bundle in `.trash`" becomes every bundle in the Trash and the Archive. The code paths become `Core/Bundles/bundle.ts`, `placement.ts`, and `rows.ts`.
  - **`:8`:** Archive bundles sit flat under their Collection's Archive, and the record names its place and origin.
  - **`:10`:** the payload gains `place`, `origin`, and `archive`, and `excluded` leaves.
  - **`:14`:** a landing also steps aside past what the disk holds, and returns to its place.
  - **`:16`:** "listing every bundle `.trash` holds" stays the Trash frame's. The Archive's browser is Lane 4's doc line.
- `.claude/Features/CorePM.md`:
  - **`:29`:** the tree diagram gains `.nexus/archive/<id>/`.
  - **`:69`:** "Trashing one takes those entries into its Trash record…" belongs to Lane 3.
  - **`:87`:** "…the Nexus root, `.nexus`, the trash, and excluded folders fall outside them" gains the delete's archive source.
  - **`:143`:** the metadata lifetime row gains "or emptying its Collection, whose Archive goes with it".
- `.claude/IssuesPM.md`:
  - **F-080 (`:1054`):** "a restore landing on one refuses rather than stepping aside" is false once E-4 lands, and "Decision 33" is already stale numbering. The Solution text stays. `[^80]` (`:1436`) becomes `Core/Bundles/placement.ts`.
  - **F-038 (`:896`, `[^38]` `:1394`):** the citations move (`trashedPages` becomes `heldPagesIn`), and Lane 4's shared runner is where F-038's one-request batch would land.
- `.claude/CLAUDE.md` (project): *§Codebase Structure* gains `// Bundles` (the bundle format both stores share) and `// Archive`. The `// Trash` line becomes "Deletion, Trash Mode, and the restore reconcile".

---

#### Cautionary Items

- **Twin Ids and Metadata:**
  - **Cause:** `dropPageMetadata` spares only tree-held ids (`pageMetadata.ts:120`, `heldPages.ts:30-33`). An archived page sharing an id with a page emptied from the Trash would lose its metadata entry. The open's re-mint reads only the tree, so it never separates such twins (`NexusRecordPM.md:22`).
  - **Recommendation:** no guard. It needs a duplicated id across the Archive and the Trash, which nothing in-app produces. Noted for C-3's twin rule.
- **Unreadable Collection Sidecars and Sync:**
  - **Cause:** `Unreadable` carries no id (`tree.ts:109-112`). A Collection sidecar unreadable at one device's open, mid-sync for instance, orphans its Archive there. F-5 moves the items into `.trash`, and sync (which admits both `.nexus/archive` and `.trash`) carries that move to every device.
  - **Recommendation:** follow F-5 as ratified, since the items are recoverable and restore home by id once the Collection reads. The alternative is *Questions for Nathan* 2.
- **An Interrupted First Sync:**
  - **Cause:** on a device whose Nexus arrived partly, the Archive's bundles can land before their Collection's sidecar. The next open then sweeps them.
  - **Recommendation:** no guard. Restore home by `parent` id works once the Collection arrives (`trashRows.ts:47-50`). Noted so the plan's sync section knows.
- **Empty or Litter-Only Orphan Directories:**
  - **Cause:** `listBundles` skips bundles whose record doesn't parse or that hold no artifact (`holdings.ts:30-36`). An orphaned `<id>/` left with only such entries would trigger the Trash walk at every open.
  - **Recommendation:** `removeIfEmpty` after the sweep (+2). Leave litter in place, since deleting unparsed bundles destroys evidence, and accept its one walk per open.
- **The Sweep's Own Catch:**
  - **Cause:** a failure inside the seed's `try` (`handlers.ts:89-103`) would be logged as "the seed walk failed" after the tree had already seeded.
  - **Recommendation:** a `.catch` logging its own line, matching `prepareOpenedNexus` (`handlers.ts:44-52`).
- **The Delete Source's Kind Check:**
  - **Cause:** `req.kind` drives `contentPages`, `goneEdit`, and `isContainer`. An archive bundle's record names its own entity.
  - **Recommendation:** refuse with `NOT_HELD` on a mismatch, as `mutableTarget` does for a wrong kind (+1).
- **The Disposal Strip Must Skip the Disposed Archive:**
  - **Cause:** once Lane 1's governed reach includes the Archive, F-4's strip could select the disposed Archive's own files from stale index rows. `deleteCascade` excludes only `abs` (`Core/Nexus/cascade.ts:80-81`).
  - **Recommendation:** the disposal passes the Archive directory as a second excluded prefix, or disposes before the strip as `emptyBundle` already orders the artifact (`spend.ts:85-97`). Lane 1 settles which.
- **The Archive's Trail After In-Collection Moves:**
  - **Cause:** `origin.trail` is written at archive time. A sub-Set moved within its Collection and then archived leaves earlier-archived items' stored trails naming the old ancestors. A top-level Set's ArchiveView would then narrow them under the old top-level Set.
  - **Recommendation:** Lane 3's carry rewrites the trail above any moved Set, crossing or not. Its open pass already reads the Archive. Alternatively, the narrowing reads an archived parent's own record before the stored trail. The reconciler picks one.
- **Path Safety on the Two New Path Sources:**
  - **Cause:** `layoutOf({ kind: 'archive', id })` joins a renderer-supplied id (through `bundles:list`), and E-3's Undo lands at `join(root, record.archive, …)` from a record field. The codebase pins this class already: `restoreOp` runs `resolveUnderRoot` on `bundlePath` (`spend.ts:138`), and `spend.test.ts:1573` pins 'a record cannot steer the artifact outside the nexus'.
  - **Recommendation:** `archiveDirRel` accepts only a single path segment (no separator, not `.` or `..`) before the join, and `record.archive` passes `storeOf` + `resolveUnderRoot` exactly as `bundlePath` does (about +2 each).
- **The Undo's Re-Mint Finds Its Path Taken, or Its Archive Gone:**
  - **Cause:** E-3's Undo re-creates the bundle at `record.archive` with `mkdir` (`spend.ts:213`). If something holds that path, `mkdir` answers `'exists'` and the artifact would land beside another entry, so `bundleArtifact` finds two and the bundle turns invisible (`record.ts:110-113`). And if F-4 disposed `.nexus/archive/<id>/` between the delete and a chord-stack Undo (the stack holds 100, `undo.ts:5`), the re-mint revives an Archive for a Collection that's gone.
  - **Recommendation:** on `'exists'`, mint fresh in the same Archive store, which loses the original stamp (disclosed in the notice's copy at review). The dispose-then-Undo case needs nothing: the revived Archive is orphaned at the next open and F-5 moves it into the Trash, recoverably.
- **Not Guarded: Cross-Kind Step-Aside Collisions:**
  - **Cause:** `freeOnDisk` checks the disk leaf per kind, so a page could step aside onto a title a tree Set holds. That needs an off-tree squatter and a tree Set with the stepped name at once.
  - **Recommendation:** no guard; it's a ghost.
- **Not Guarded: Malformed `place`:**
  - **Cause:** a hand-edited `place` that doesn't parse hides the whole bundle, as any malformed field does today (`spend.test.ts:717`).
  - **Recommendation:** no guard, consistent with the format.

---

#### Contradictions

None with a ratified decision.

**The Brief's Premise:** the brief assumed the Archive's restore rides `addressed` (*Call 10*). It isn't a decision, and the evidence sets it aside in favor of the shared returning relink.

**Shared Pieces Outside the Neutral Owner:** `returningNames` sits in `Core/Nexus/settle.ts` beside `relink`, and `spliceBeside` in `Core/Nexus/order.ts` beside `resolveOrder`, rather than in `Core/Bundles/`. This isn't a drift from A-4: both are the existing homes of what they extend (the one re-spell, and E-2's "highest-level fold of what already orders pages"), and moving them into the bundle owner would put the order fold and the re-spell beside the Trash and the Archive instead of beside every other op that uses them.

**F-6 Without One Observation Point:** Lane 3 reports F-6 INFERRED's "one carry, placed where every such landing is observed" can't hold as worded (Scout 3 *§Contradictions*). This lane's record shape (`origin.trail`, plus `origin` in Trash records) supports Lane 3's three-trigger carry, and adds nothing that contradicts it.

---

#### Questions for Nathan

1. **Should a Collection or Space restored from the Trash also come back to its exact place in the sidebar, as pages and Sets now will?**
   - **Today:** Collections and Spaces regain their old slot only until their order is next written (the same weakness E-2 fixes for pages and Sets), and Contexts keep their place by position.
   - **Recommendation:** yes, for Collections and Spaces, through the same neighbour rule, so every restore that lands in an order uses one rule. About +10.
   - **Leaving Them:** this keeps E-2's scope exact, and leaves the Trash with two placement rules.
2. **When a Collection can't be read at open (most often while it's still syncing), should its Archive wait, or move to the Trash?**
   - **The Ratified Reading:** F-5 moves the items to the Trash for safekeeping. That move then syncs to every other device, where the Collection was fine, so their ArchiveViews empty and the items wait in the Trash until restored.
   - **Recommendation:** keep F-5 as ratified, since nothing is lost and each item restores home once its Collection reads.
   - **The Alternative:** skip the move for any open where some Collection can't be read (+1 line). Then a temporarily broken Collection never moves anything, but a permanently broken one keeps its Archive in limbo until fixed.
3. **When an item's Set has itself been archived, should restoring the item ask where to put it, as it does when its Set is in the Trash?**
   - **Recommendation:** yes, and the item finds its Set again if the Set is restored first. Restoring a batch newest first already handles that order.
   - **The Alternative:** the item would wait and return with its Set, which nests one archived thing inside another.


---

### Scout 3 — The Lift, the Carry, and F-6's Observation Point

**DATE:** 10-19-2026
**HEAD:** `4a910cc7a` (one commit past `d880179b6`). `git diff --stat 213f95a3b HEAD` touches none of this lane's files, so every Investigation line cited below still sits where it said.
**Scope:** read-only. Nothing in the repository was changed, no app was run, and the live Trash records in `~/Test/.trash` and `~/NexusOS/.trash` were read but not touched.

---

#### Verified at HEAD

##### Confirmed

- **The Carrying Code:** `excludedWithin` (`Core/Settings/settings.ts:86-88`), `editExcluded` (`:90-95`), `followExcludedFolders` (`:97-106`), `exclusionWriteRefusal` (`:108-116`), `releaseExcludedFolders` (`:118-123`), `reseatExcludedFolders` (`:125-127`). Their callers are the folder rename (`Core/Nexus/rename.ts:20-23`), the Set move (`Core/Nexus/move.ts:50-53`), the container delete (`Core/Trash/delete.ts:41-44`, `:109`), the record (`Core/Trash/record.ts:38-39`; `Core/Trash/gather.ts:72`), the restore (`Core/Trash/spend.ts:177`, `:217-219`), and `relocateFolder` (`Core/Nexus/folderEntity.ts:30-32`). Grep finds no other caller.
- **`relocate`:** it renames under the source's lock (`Core/Files/atomicWrite.ts:67-71`), raises the own move event (`:72`), runs `landed` (`:73`), and then reports the rename to sync (`:74`).
- **Entries Under `.nexus` Drop Silently:** `normalizeExclusions` (`Core/Settings/codec.ts:61-82`) drops anything `nexusFolderRefusal` refuses (`:70-73`), and that refuses a first segment in `NON_CORPUS_TOP` = {`.nexus`, `.trash`} (`codec.ts:51`; `Core/Paths/nexusPaths.ts:8`).
- **The Asset Directory Can Sit Inside a Collection:** `validateAssetDir` only refuses a folder whose subtree holds pages or sidecars (`Core/Settings/assetDirValidate.ts:24-26`, `:29-38`). Nothing checks where the folder sits.
- **`landingRefusal`'s Asset Arm Exists:** `SET_ASIDE.asset` (`folderEntity.ts:15-16`) is the reason `:26-27` refuses with.
- **A Folder Lifted to the Root Never Becomes a Collection:** the root read skips any root folder `outsideContent` names (`Core/Nexus/readNexus.ts:327-329`), and so does `stampAdopted` (`Core/Nexus/adopt.ts:181-183`). `outsideContent` answers `'asset'` before `'excluded'` (`Core/Paths/exclusion.ts:77-82`). `agendaContext` does list the folder through `visibleFolders` (`Core/Files/walk.ts:46-50`; `Core/Nexus/folderKind.ts:74`), but it only counts Agenda sidecar ids there.
- **The Tree and Discovery Callers of `outsideContent`:** `readChildSets` (`readNexus.ts:158-161`), the root read (`:327-329`), `stampTree` (`adopt.ts:165`), `stampAdopted` (`adopt.ts:183`), `adoptsAsCollection` (`folderKind.ts:94-105`), `landingRefusal` (`folderEntity.ts:26`). `fileEvents.ts:515` sits inside `oweRescope`. It lists paths newly in reach for stamping and isn't a walk.
- **`assets:setDir` Is the Only Writer of `asset_directory`:** `Core/Assets/handlers.ts:42-60` is the only caller of `writeAssetDirectory` (`settings.ts:76-78`), and nothing else writes the key. It also runs `migrateAssets` (`handlers.ts:52-58`), which only moves files off the legacy `.nexus/assets` (`Core/Assets/assetMigrate.ts:167-172`). A carry doesn't need that migration.
- **Live Records:** `~/Test` has 5 Trash records and none carries `excluded`. `~/NexusOS` has 60. Eight are Set records with `excluded: []`, and none holds a non-empty list. NexusOS excludes `Agenda`, `TaskNotes`, `slates`, and `file-assets`, and its `asset_directory` is `file-assets`, all at the root. `~/Test` has neither key. Zod is `^4.4.3` (`Core/package.json:40`), and its `z.object` strips unknown keys, so a record still holding `excluded: []` decodes after the field leaves (`record.ts:33-44`).
- **`payOutsideMoves` Pairs Pages Only:** it pairs page ids from the index's `vanished` and `landed` lists (`Core/Nexus/settle.ts:270-304`; `Core/Nexus/fileEvents.ts:301-308`).

##### Corrected

- **`applyMove` Sees the App's Own Moves Only.** `relocate` is the only thing that raises a `move` event (`atomicWrite.ts:72`; the one other grep hit is a test, `fileEvents.test.ts:314`). The watcher only raises `add`, `change`, `unlink`, `addDir`, and `unlinkDir` (`Desktop/FileWatch/watcher.ts:126-131`). `Moved` has no `origin` (`Core/Files/writeEcho.ts:45-49`), `applyOne` sends every move to `applyMove` (`fileEvents.ts:593`), and the own tap applies it right away (`settle.ts:41-56`). So the own move isn't filtered out, and it does reach `:575`. A Finder move arrives as `unlinkDir` plus `addDir` through the `'gone'` and `'folder'` arms (`fileEvents.ts:607-613`, `:333-359`). The brief's line that `applyMove`/`moveNodeInTree` "sees own and outside moves alike" is false.
- **Every Carry Already Walks.** The Investigation (*§Approaches*) said a pre-written entry would "trigger a walk on every carrying Set rename or move" through `fileEvents.ts:574-577`. At HEAD, every carry already causes a walk, a watcher restart, and a sync reconcile, through the settings write's own event:
  - The write lands through `updateSettings` → `updateNexusFile` → `writeJson` → `atomicWriteFile` → `noteOwn` (`settings.ts:16-22`; `atomicWrite.ts:24-25`, `:159`, `:225-235`).
  - `applySettings` patches the new scope into the held tree immediately, then returns `'walk'` whenever the scope changed (`fileEvents.ts:502-518`). That's tested at `fileEvents.test.ts:298-305` and documented at `.claude/Features/DesktopPM.md:22`.
  - The settle then restarts the watcher (`settle.ts:177`, `:181-185`). When the watcher is ready, its catch-up walks and seeds the index again (`watcher.ts:133`; `settle.ts:188-197`, `:222`).
  - Sync rescopes and reconciles (`Core/Sync/Client/session.ts:135-141`; `Core/Sync/Client/reconcile.ts:118-124`, `:73-76`).
  - `Core/Nexus/mutate.test.ts:3252-3274` asserts the watcher restart on a carrying rename (`:3269`).
- **What `moveSetOp`'s `left` Means.** `left` (`move.ts:54-57`) is the highest container the Set left on its source chain. It's non-null for any move out of a container, including within one Collection: `A/X/S` → `A/Z` gives `A/X`. The move crosses Collections only when `diverge === 0`. The Investigation's "already singles out a move that leaves the Set's Collection" narrows to that.
- **The Restore Uses Plain `relocate`.** It doesn't go through `relocateFolder` (`spend.ts:213-220`). Its move doesn't apply in place, because its source isn't in the tree (`fileEvents.ts:585-589`). It lands through `applyFolder`.
- **`sanitizeExclusions` Lives in `settings.ts:137-141`.** `Core/Settings/handlers.ts:19-24` only calls it. `readExclusions` doesn't exist at HEAD. The read path is `readSettings` (`codec.ts:104-106`) through `readExcludedLeaf` (`:84-85`), served by `readWatchScope` (`settings.ts:53-54`).
- **Tests That Change, Narrowed:** `Core/Trash/deleteOrder.test.ts` and `Core/Trash/trashRecovery.test.ts` assert nothing about excluded entries (grep). `Core/Trash/spend.test.ts` has one such test, `:1527-1540`, and it tests `landingRefusal`, which is E-4's lane. Every follow, release, and reseat test lives in `mutate.test.ts:3241-3448`. `Core/Settings/settings.test.ts` tests none of the carrying functions. F-3 doesn't require changing the three Trash test files the Investigation lists.

---

#### Planner's Calls

##### 1. The Lift (F-2, F-3)

**Recommendation:** One function in `folderEntity.ts`, beside `relocateFolder` (it can stay module-private). It lifts the asset directory as well as excluded folders, so its name should cover both. The file already uses `SET_ASIDE` for exactly those two (`folderEntity.ts:12-17`), so I suggest `liftSetAside`; `leaveExcludedBehind` names only half of what it moves.

```ts
/** A Collection or Set leaving the tree leaves every folder Settings sets aside inside it — excluded folders and the asset directory — in its parent, named past what the parent already holds on disk, its setting following it. A folder set aside inside another rides it. */
export async function liftSetAside(root: string, containerAbs: string): Promise<Result<void>> {
  const { excluded, assetDir } = await readWatchScope(root)
  const rel = relative(root, containerAbs)
  const inside = [...excluded, assetDir].flatMap((entry) => {
    const rest = entryWithin(entry, rel)
    return rest?.length ? [rest] : []
  })
  const outermost = inside.filter(
    (rest) => !inside.some((o) => o.length < rest.length && remainderUnder(rest, o.map(foldKey))),
  )
  const parent = dirname(containerAbs)
  const taken = (await listEntries(parent)).map((e) => e.name)
  for (const rest of outermost) {
    const from = join(containerAbs, ...rest)
    if (!(await pathExists(from))) continue
    const held = (await heldName(from)) ?? rest[rest.length - 1]
    const name = freeName(held, taken)
    taken.push(name)
    const lifted = await relocateFolder(root, join(dirname(from), held), join(parent, name))
    if (!lifted.ok) return lifted
  }
  return ok(undefined)
}
```

It has two callers, both running the lift before the container's own move. The first is the archive op. The second is `deleteOp` in both Trash modes, where the lift replaces the gate at `delete.ts:41-44`. That puts it ahead of `mintBundle` (`:46`), the system-mode metadata gather (`:48`), and the move (`:99-100`).

**Evidence:**

- **No Extra Read:** it reads `readWatchScope` once and gets remainders through `entryWithin` (`exclusion.ts:98-99`), so it doesn't need `excludedWithin`. `remainderUnder` (`exclusion.ts:93-96`) keeps only the outermost entries, so a nested entry, or an asset directory under an excluded folder, rides its outer folder. The carry then rewrites every entry at or under the moved folder (Call 2).
- **Naming Asks the Disk:** `freeName` (`Core/Paths/names.ts:56-64`) runs over `listEntries(parent)` (`walk.ts:13-19`). That covers files and folders, folds case, and includes the container itself, which is still on disk. So `Alpha/Beta/Beta` lifts to `Alpha/Beta (2)`, and the container's restore never meets a lifted folder of the same name. A page `Omega.md` and a folder `Omega` are different names on disk, so a page's title never pushes an excluded folder aside. The tree's sibling rule (`freeName` over tree titles inside `resolveRecord`) never sees an excluded folder at all. Only two folders sharing a name collide, and the lifted one steps aside to `Omega (2)`.
- **F-2's Example, Traced:** with the container `Alpha/Beta`, an entry `Alpha/Beta/Omega` gives the remainder `[Omega]` and lands at `Alpha/Omega`. A deeper entry `Alpha/Beta/Gamma/Omega` gives `[Gamma, Omega]` and also lands at `Alpha/Omega`. If both exist, neither sits inside the other, so the second lands at `Alpha/Omega (2)`. An entry `Alpha/Beta/Omega/Deep` rides `Omega`, and its entry becomes `Alpha/Omega/Deep`.
- **A Collection's Lift Lands at the Root:** the root read and `stampAdopted` skip the lifted folder, because its entry or `asset_directory` already names the new path (*§Confirmed*).
- **Writing the Entry First Is Load-Bearing Here.** If the lift moved folders with today's order (move first, entry after), the move event (`atomicWrite.ts:72`) would land before the entry follows (`:73`), and the lifted folder would briefly read as ordinary content:
  - The tree has no node for an excluded folder (`Core/Nexus/treePatch.ts:249-250`), so the move falls to `addDir` (`fileEvents.ts:585-589`).
  - Under the old scope, `addDir` classifies the landing as a plain folder (`fileEvents.ts:224-226`, `:266`).
  - `applyFolder` reads it as a Set (`readNexus.ts:239-243`; `folderKind.ts:53`) and owes a stamp for its missing sidecar (`fileEvents.ts:347-349`; `stampable` at `:153-159`).
  - `stampMissing` writes that stamp without re-checking the scope (`adopt.ts:133-146`).
  - `moveIndexPaths` indexes the folder's pages (`Core/Index/indexSeed.ts:182-185`).

  The asset directory would hit the same path, since the asset arm (`fileEvents.ts:225`) wouldn't match yet. Writing the entry before the rename makes the landing classify as excluded or asset, so both arms ignore it.
- **Partial Failure:** if a later lift fails, the folders already lifted sit beside the container, still excluded, and the operation can run again (*§Approaches · Ordering and Crashes*, confirmed).

**Alternatives:**

- **Today's Follow Order (Move Then Rewrite):** rejected because of the trace above.
- **Naming by Tree Siblings:** misses excluded folders and outside files, since neither is in the tree.
- **Moving Without `freeName`:** a POSIX rename onto an existing empty folder replaces it, and onto a non-empty one it fails, so this risks data.
- **One Settings Write Before and One After for All Lifts:** saves 2N−2 small writes. Sync already merges them in its 2.5-second debounce (`Core/Sync/Client/tap.ts:9`, `:29-39`), and each one only patches the in-memory config before the single walk. Batching would couple every folder's crash window for no real gain.

**Cost:** about +22 in `folderEntity.ts` (the function plus imports). `delete.ts` comes out about even, since the gate becomes the call. The Investigation estimated +26.

##### 2. K-1, the Crash-Safe Carry

**Recommendation:** Replace `followExcludedFolders` with one `carrySetAside(root, from, to)` in `settings.ts`, and delete `editExcluded`, `exclusionWriteRefusal`, and `excludedWithin` with it:

```ts
/** What Settings sets aside at or under `from`, excluded entries and the asset directory, written for `to` before a folder moves there; the step it returns drops `from`'s entries once it has. The folder stays set aside wherever a crash leaves it, and a settings file that can't be written refuses before anything moves. */
export async function carrySetAside(
  root: string,
  from: string,
  to: string,
): Promise<Result<(() => Promise<void>) | null>> {
  const { excluded, assetDir } = await readWatchScope(root)
  const landing = (path: string): string | null => {
    const rest = entryWithin(path, from)
    return rest && [to, ...rest].join('/')
  }
  const asset = landing(assetDir)
  if (asset === null && !excluded.some((e) => landing(e) !== null)) return ok(null)
  const ahead = excluded.flatMap((e) => {
    const at = landing(e)
    return at ? [at, e] : [e]
  })
  const written = await updateNexusConfig(root, 'settings', (cur) => ({
    ...setOrDrop(cur, 'excluded_folders', normalizeExclusions(ahead).folders),
    ...(asset === null ? {} : { asset_directory: asset }),
  }))
  if (!written.ok) return written
  return ok(async () =>
    writeExcludedFolders(
      root,
      (await readWatchScope(root)).excluded.filter(
        (e) => entryWithin(e, from) === null || entryWithin(e, to) !== null,
      ),
    ),
  )
}
```

`relocateFolder` runs the returned step as `relocate`'s `landed`, and returns a `Result`:

```ts
async function relocateFolder(root: string, from: string, to: string): Promise<Result<void>> {
  const carried = await carrySetAside(root, relative(root, from), relative(root, to))
  if (!carried.ok) return carried
  await relocate(from, to, carried.value ?? undefined)
  return ok(undefined)
}
```

`renameFolderEntity` and `moveFolderEntity` pass that `Result` on (+1 line each). The write before the move now does the refusing, so the `exclusionWriteRefusal` arms at `rename.ts:20-23` and `move.ts:50-53` go. The delete's gate becomes the lift's first write. `mutate.test.ts:3276-3298` keeps passing: a failed write still returns `fail('operation-failed', 'Corrupt JSON: settings.json')` (`atomicWrite.ts:122-129`), the delete still leaves no `.trash`, and a move with nothing to carry writes nothing.

**Does the Pre-Written Entry Trip `fileEvents.ts:575`? Yes.** The own move reaches `applyMove` (*§Corrected*), and the write ahead of it has already patched the held scope (`fileEvents.ts:507-508`). So `tree.config.excluded` names `to/rest` when the move lands, `owed.corpus` is set, and `'walk'` comes back (`:576-577`).

**What That Trip Costs Today:** nothing measurable. The settings event has already owed the walk and the rescope, and when `rescope` is set, `reseed` restarts the watcher instead of seeding (`settle.ts:177`, `:183-184`), so `corpus` adds nothing. Its only effect is skipping the in-place patch (`fileEvents.ts:579-581`). That means `moveSetOp`'s `reachConfig` (`move.ts:65`) reads a tree that still holds the Set at its old path (`Core/Nexus/configReach.ts:326`, `:342`). It visits the old, now-missing sidecars, and `editJsonStrict` answers `'absent'` for them (`atomicWrite.ts:244-246`; `configReach.ts:333-339`). It's harmless, but unintended, and the check's own comment ("with no settings write to report it", `fileEvents.ts:574`) becomes false.

**The Smallest Rule (CAUTIONARY):** the corpus only moves when an entry under the landing has no matching excluded path under the source. While a carry is in flight, both `from/rest` and `to/rest` are in the scope. A pre-existing entry that happens to cover the landing has no such counterpart. So `:575` becomes:

```ts
const { excluded } = scopeOf(tree.config)
const moves = excluded.some((entry) => {
  const rest = entryWithin(entry, to)
  return rest !== null && !excludedMatcher(excluded)([...rootSegs(from), ...rest])
})
```

That's about +2 / −1, with no new state, and it rests on the carry's own write order rather than a flag. The existing tests keep their behavior. `mutate.test.ts:3437` (Notes → Job, with an entry `Job/Daily`) has no counterpart under `Notes`, so it still walks and reseeds. `fileEvents.test.ts:307` has no counterpart under `Loose`, so it does too. The lift also applies cleanly: with entries `[A/B/Omega, A/Omega]`, the landing's counterpart is the source itself, so no corpus move is flagged, and the unlink and addDir arms both ignore the move.

**Sync and the Order of the Two Writes:**

- **One Settings Push:** sync's tap debounces each path for 2.5 seconds (`tap.ts:9`, `:29-39`), so the two writes become one push.
- **One Rescope:** `reportRename` runs after `landed` (`atomicWrite.ts:73-74`), so `onRename`'s rescope reads the settled scope (`session.ts:136-140`). That's one rescope and one reconcile, as today. The drop step has to stay inside `landed`. Run after `reportRename`, sync would rescope once at the in-between scope and again at the dirty push, which means two full reconciles (`reconcile.ts:118-124` → `:73-76`).
- **The In-Between Scope Is Safe:** it covers both ends, so sync admits less while it holds (`exclusion.ts:44-61`).
- **The Lift Adds No Rename to the Hub:** `feedRename` sees an excluded source and only marks the landing dirty (`tap.ts:64-68`). That push rescopes first and finds nothing admitted (`session.ts:124-133`; `Core/Sync/Client/push.ts:149`, `:162-168`).

**Crash Windows:**

- **Before the Rename:** both entries are written and the folder is still at its source, so it's covered.
- **Between the Rename and the Drop:** the folder is covered at its landing. The source entry names a path that's gone. It's harmless and never cleaned up, and it only matters if a folder is later created at that exact path.
- **The Asset Directory:** it's a single value, so the crash window is the same size whichever order is used, and one side is left dangling either way. Writing it first matches the excluded entries and is what the lift's arrival needs (Call 1).

**Whether K-1's "The Carry Causes No Walk" Can Hold:** a carry walks today through `applySettings`, as it always has. The write before the move adds no walk, no seed, and no restart beyond that. Making a carry walk-free would mean applying scope changes incrementally in three places: `applySettings`, the watcher's ignore filter (captured when the watcher starts, `watcher.ts:98-107`; `exclusion.ts:87`), and sync's `rescope` (`reconcile.ts:118-124`). That touches every exclusion edit, not just carries. See *§Contradictions* and Q1.

**Alternatives:**

- **Keep the Follow After the Rename:** not crash-safe (K-1), and wrong for the lift (Call 1).
- **A Module-Level "Carrying" Note That `applyMove` Consults:** a side channel the counterpart rule makes unnecessary.
- **Pre-Write and Leave `applyMove` Alone:** works at HEAD, since the trip is absorbed. It leaves K-1's own clause false and the tree stale inside `moveSetOp`.
- **One Write With No Drop:** leaves dangling entries forever.
- **Keep `exclusionWriteRefusal` as a Separate Probe:** a second strict read of the same file, made redundant by the write that already comes before any move.

**Cost:**

| File | Change | Lines |
| --- | --- | --- |
| `settings.ts` | Removes `excludedWithin` (3), `editExcluded` (6), `followExcludedFolders` (10), `exclusionWriteRefusal` (9), `releaseExcludedFolders` (6), `reseatExcludedFolders` (3), and adds `carrySetAside` (~20) | −37 / +20 |
| `folderEntity.ts` | `relocateFolder` returns a `Result`, and its two wrappers pass it on | +6 |
| `rename.ts`, `move.ts` | Drop the refusal arms and imports | −3 each |
| `fileEvents.ts` | Rewrites the `:575` condition | ±1 |

That's about −16 net for the carry and the gates. The Investigation estimated +8.

##### 3. The Asset Directory Today

**Recommendation:** It rides the same carry (two lines inside `carrySetAside`) and joins the lift's candidates (Call 1). It needs no path of its own.

**Evidence:** `assets:setDir` is its only writer (*§Confirmed*), and `followExcludedFolders` only maps `excluded_folders` (`settings.ts:98-105`), so nothing follows the folder today. Here's what visibly breaks when it goes stale, taking a Set `A/B` that holds the asset folder `A/B/Media` and is renamed to `A/B2`:

- **Attachments and Banners Point at a Missing Folder:** the in-memory asset map keeps paths under `A/B/Media`. The rename's own echoes are suppressed (`writeEcho.ts:79-92`), and the map only rebuilds when the asset setting changes or a walk runs (`Core/Assets/assetMap.ts:77-90`; `settle.ts:121`). So `[[File.png]]`, banners, and icons resolve to files that are gone (`Core/Assets/assetRoots.ts:26-36`). After a relaunch, `buildAssetMap` reads the missing folder as empty, and every name shows as unresolved and dimmed (`.claude/Features/PropertiesPM.md:94`).
- **The Folder Becomes a Set:** the asset arm (`fileEvents.ts:225`) no longer matches `A/B2/Media`, so events there go to the content arms. At the next open, `stampTree` stamps `_pageset.json` into it as an ordinary nested folder (`adopt.ts:163-170`; `folderKind.ts:53`), and the asset folder shows in the sidebar as a Set.
- **A Ghost Folder Comes Back:** the next attachment `mkdir`s the stale path (`Core/Assets/assetWrite.ts:19-22`; `Desktop/Platform/nodeMachine.ts:69-70`, which is recursive). That recreates `A/B/Media`, and with it a sidecar-less `A/B`, which then becomes a Set "B" in Collection A.
- **Property Folders Check the Wrong Root:** `validPropertyDir` and `underAssetRoot` (`assetRoots.ts:13-18`, `:43-51`) test against the stale path.

The carry's write owes the walk that rebuilds the asset map (`settle.ts:121`), so no extra code is needed for that.

**Alternatives:**

- **A Separate Follow Step for the Asset Directory:** a second mechanism for the same job, which the "one carry" decision in K-1 rules out.
- **Calling `migrateAssets` on a Carry:** it only empties the legacy `.nexus/assets`, so it doesn't apply here.

**Cost:** +2 in the carry and +1 in the lift, both already counted above.

##### 4. F-6's Observation Point

**Recommendation:** No single point at HEAD sees all three landings, so F-6's INFERRED "one carry, placed where every such landing is observed" can't hold as worded (*§Contradictions*). The closest faithful shape is one carry function in `Core/Archive/`, roughly `refileArchived(root, setId, fromCollectionId)`, with three triggers:

1. **The Settle's Comparison:** the comparison of the tree last handed to the window with the tree now held (`settle.ts:166-170`). It's the one point the in-app move, the Finder move, and any walk all end in.
   - **Reading:** it only reads the container entries the difference drops (looked up in the handed tree, `containerAt`) and adds (`{ set: node }` with a Set kind), pairs them by id, and compares their Collection ids.
   - **Cost:** `deltaOf` never enters a subtree both trees share (`Core/Nexus/treeDelta.ts:40-58`), and it keys lists by `path` (`:13-17`). A Set move shows up as a `drop` under the old path and a `set` under the new one. A page edit produces no container entries. So the cost is limited to what changed.
2. **The Restore:** it passes the Collection its record names, since its Set arrives from outside the tree and no tree comparison can see where it left. The Trash record holds `parent` only (`record.ts:14-19`, `:33-44`). The Trash record should carry the origin Collection id along with the ancestry Open Item 1 gives the Archive's record, which is one shared field in the hoisted record shape.
3. **F-5's Open Pass:** it reads each record's Collection the same way and re-files a misfiled one. A Finder move made while Pommora is closed reaches no session. A session's first tree has no handed baseline, so `deltaOf(undefined, tree)` replaces the whole tree and records no departures (`settle.ts:168`; `treeDelta.ts:41-57`).

The carry reads every record in the source Collection's Archive. A record's origin is inside the Set when:

- **The Origin Is in the Tree:** its current path is at or under the Set's new path.
- **The Origin Isn't in the Tree:** the record's stored ancestor ids include the Set's id.

Stored ancestor ids alone would be wrong for a sub-Set that has moved elsewhere in the old Collection since its items were archived. F-6 places those by their current trail, so their records stay put. The cost is one read per record in one Archive per crossing, and crossings are rare.

**Is the Collection-Crossing Test Cheap?** Yes. Compare Collection ids (`owningCollection`, `treePatch.ts:84-91`: one top-segment split and a find over the root Collections) rather than raw top segments, so a Collection rename (same id, new top segment) never reads as a crossing. Inside one tree state, `moveSetOp`'s `diverge === 0` (`move.ts:54-56`) is the same test.

**Evidence: What Each Landing Passes Through at HEAD:**

| Landing | Route | Seen by `addressed` | `applyMove` in place | `relocateFolder`'s `landed` | `payOutsideMoves` | Settle comparison |
| --- | --- | --- | --- | --- | --- | --- |
| In-app move | `mutate.ts:195-196` → `addressed` (`:89-113`) → `moveSetOp` (`move.ts:42-67`) → `moveFolderEntity` → `relocateFolder` → `relocate` → own `move` → `moveNodeInTree` in place (`fileEvents.ts:579-581`) → `addressed`'s relink (`mutate.ts:102-107`) | Yes | Yes | Yes | No | Yes |
| Restore with a destination | `mutate.ts:134-135` (`underContexts(inSettleTurn(restoreOp))`, outside `addressed`) → `withDestination` (`spend.ts:107-128`) → `resolveRecord` → plain `relocate` (`:213-220`) → own `move` falls through, since the `.trash` source isn't in the tree (`fileEvents.ts:585-589`) → `applyFolder` reads the Set from disk (`:333-359`) → the restore's own two-map relink (`spend.ts:229-248`) | No | No | No | No | Sees the arrival, not where it left |
| Finder move | Watcher batch (`watcher.ts:108-131`) → `settleBatch` (`settle.ts:213-230`) → `'gone'` → `removeNodeInTree` (`fileEvents.ts:607-611`), `'folder'` → `applyFolder`. The pages' index rows feed `vanished`/`landed` (`fileEvents.ts:273-308`) → `payOutsideMoves` pairs page ids (`settle.ts:270-304`), or a walk runs | No | No | No | Pages only | Yes |

**Alternatives:**

- **`addressed`, With the Restore Moved Under It:** sees the in-app move, and the restore once moved, but never a Finder move. Moving the restore costs more than wiring. Its relink deliberately differs from `addressed`'s (`spend.ts:229`), so under `addressed` an arrival would be re-spelled twice, or the two strategies would have to merge. That changes the Trash's link repair: about −3 / +3 of wiring plus roughly −20 / +10 to unify, with behavior risk, and still no Finder coverage.
- **`applyMove` / `moveNodeInTree`:** own moves only (*§Corrected*). The restore falls out of the in-place path, and Finder never reaches it.
- **`relocateFolder`'s `landed`:** renames and Set moves only. The restore uses plain `relocate`, and Finder never reaches it.
- **`payOutsideMoves`:** Finder only, and only through page ids. A Set with no live page — exactly what archiving produces, a Set whose pages are all archived — pairs nothing when moved in Finder, and sub-Set ids never pair.
- **A Ledger Fed From the Event Arms:** record container departures in `'gone'` and in `applyMove`'s in-place path, compare the walk's before and after, and pay beside `payOutsideMoves`. It sees the same landings as the settle comparison, but from three sites instead of one.
- **Deriving the Collection When Reading:** F-6 rules it out ("Nothing derives an item's Collection at read time").

**Cost:** the carry is about +14 (the Investigation estimated +12), the settle observer about +12, the restore +1, the record field +1, and the open pass's re-file arm about +4. That's about +32 total.

##### 5. F-3's Removal Inventory

| What | Where at HEAD | Change |
| --- | --- | --- |
| The record's `excluded` field and its doc | `record.ts:38-39`; the `rootSegs` import, used nowhere else, at `:3` | Removed |
| Its gather | `gather.ts:72`; import at `:2` | Removed |
| `releaseExcludedFolders` | `settings.ts:118-123` | Removed |
| `reseatExcludedFolders` | `settings.ts:125-127` | Removed |
| The release at delete | `delete.ts:109`; import at `:26` | Removed |
| The restore's refusal over recorded entries | `spend.ts:177` (the `??` arm inside `:174-179`) | Removed |
| The restore's reseat | `spend.ts:217-219` (`landed`) | `relocate(artifactAbs, targetAbs)` |
| F-007 | `.claude/IssuesPM.md:13`, `:148-160`, `:1363` (`[^7]`) | Closed: no bundle holds excluded content |

**Live Data:** no record holds a non-empty `excluded` (*§Confirmed*), so nothing needs migrating.

**Behavior Change, System-Trash Delete:** today a container goes to the system trash with its excluded folders inside (`delete.ts:100` → `discardFile`, `Core/Trash/bundle.ts:69-74`), and their entries are released in both modes (`:109`). After the change, the lift runs first in both modes, so excluded folders stay in the parent with their entries and never reach the system trash.

There's also a free side effect. `listMarkdownFiles` only filters hidden folders (`walk.ts:32-39`), so today's system-mode metadata drop (`delete.ts:48`) also drops the metadata of pages inside excluded folders. After the lift, those pages are no longer under the container.

**Behavior Change, Emptying the Trash:** today `emptyBundle` would send whatever excluded content a bundle held to the system trash or delete it (`spend.ts:83-88` through `contentPages` → `listMarkdownFiles`). New bundles never hold any, and no live bundle does.

**A Latent Bug That Leaves With the Reseat (Traced, Not Run):** a restored container's reseat runs in `landed`, after its move event, so the arrival is read under the old scope:

- `readChildSets` reads its excluded subfolders as Sets (`readNexus.ts:158-161`, under the tree's stale scope).
- Stamps are owed for their missing sidecars (`fileEvents.ts:347-349` → `adopt.ts:133-146`).
- `moveIndexPaths` indexes their pages (`indexSeed.ts:182-185`) before the reseat lands.

##### 6. What Remains

| Function | Callers at HEAD | After |
| --- | --- | --- |
| `excludedWithin` | `rename.ts:22`, `move.ts:52`, `delete.ts:42`, `gather.ts:72` | No caller left (the carry's write replaces the gates, F-3 removes the gather, and the lift reads the scope directly). Deleted |
| `editExcluded` | `followExcludedFolders`, `releaseExcludedFolders`, `reseatExcludedFolders` | All three leave. Deleted, since the carry's drop step writes through `writeExcludedFolders` |
| `exclusionWriteRefusal` | `rename.ts:22`, `move.ts:52`, `delete.ts:42`, `spend.ts:177` | The write before the move replaces it, and F-3 removes the restore's use. Deleted |

**End Shape of `settings.ts`'s Exclusion Block:**

| Function | Caller |
| --- | --- |
| `writeAssetDirectory` | `assets:setDir` |
| `writeExcludedFolders` | `exclusions:set`, `Core/Settings/handlers.ts:22`, and the carry's drop step |
| `carrySetAside` | `relocateFolder` only |
| `sanitizeExclusions` | `exclusions:set` |

That's four exports where there are nine today.

##### 7. Tests

**`Core/Nexus/mutate.test.ts`:**

- **`:3252` "rewrites an entry under a renamed Collection and rescopes the session":** stays as written if Q1 keeps today's walk. If Q1 goes incremental, `watch` flips to "not called".
- **`:3276` "refuses a landing that carries excluded entries while settings.json can't be written":** stays. The carry's write before the move is now what refuses.
- **`:3300` "refuses a Set moved, or a Collection restored, with excluded entries while settings.json can't be written":**
  - **The Set-Move Half:** stays.
  - **The Collection-Restore Half:** inverts. Deleting `Other` lifts `Other/Kept/Private` to the root as `Private` first, the record carries no entries, and the restore succeeds with corrupt settings. It should assert that `Other` lands without `Private` and that `Private` stays at the root, excluded.
  - **Name:** "refuses a Set moved with excluded entries while settings.json can't be written".
- **`:3334` "takes a trashed Collection's entries with it and lands them wherever it is restored":** becomes "leaves a trashed Collection's excluded folder at the Nexus root, its entry following, and restores the Collection without it". After the delete it should find:
  - **Settings:** `['Daily']`.
  - **The Root Folder:** `Daily` exists at the root, the tree holds no Collection `Daily`, and no `_pagecollection.json` was written into it.
  - **After the Restore:** the entries are unchanged. The current test overwrites `settings.json` mid-test, which would un-exclude `Daily`, so the rewrite has to add to the entries rather than replace them.
- **`:3362` "reports a Collection delete and its restore to Sync as one rename each, the restore after its entries hold again":** becomes "reports the lift, the Collection's delete, and its restore to Sync, each under settings that already exclude the lifted folder". The renames should be `[Other/Daily → Daily]`, `[Other → bundle]`, `[bundle → Other]`, with `renames[0].excluded` equal to `['Daily']`.
  - **The `inside` Assertion Needs Narrowing:** `wrote.filter(inside)` no longer stays empty. `relocate` records both ends of every rename (`atomicWrite.ts:68-69` → `writeEcho.ts:32`), and the lift's rename records `root/Other/Daily`, which starts with `${folder}/`. Today it passes only because the container's own rename records `root/Other` and `bundle/Other`, neither with a trailing segment. The rewrite either narrows `inside` to the bundle prefix or leaves out the lifted folder's two rename records.
- **`:3412` "carries an entry with a moved Set":** stays. It gains a sibling, "carries the asset directory with a renamed or moved Set".
- **`:3425` and `:3437`:** both stay.
- **New, the Write Order:** "writes the landing's entry before the folder moves". Read `settings.json` from a spy on `machine().rename` and expect both entries. After the reply, expect only the landing's.
- **New, a Case-Only Rename:** `Beta` → `beta` keeps its entries under the new spelling and loses none.
- **New, the Lift:**
  - **Where It Lands:** a Set delete or archive leaves `Omega` in its parent. A deeper entry lands in the parent too.
  - **Name Collisions:** an existing folder `Omega` sends the lifted one to `Omega (2)`, while a page `Omega.md` doesn't count.
  - **Nesting:** a nested entry rides its outer folder.
  - **The Asset Directory:** it lifts, and `asset_directory` is rewritten.
  - **System Trash:** in system mode the folder stays in place and never reaches `trashToSystem`.
  - **Missing Folders:** an entry naming nothing on disk is skipped.

**`Core/Nexus/fileEvents.test.ts`:**

- **`:307` "a folder landing over an excluded entry beneath it owes the walk and the reseed, and no new watch":** stays, since there's no counterpart under `Loose`.
- **New Sibling:** "a folder landing with its excluded entries carried ahead applies in place and owes no reseed", with settings `['Loose/Private', 'Moved/Private']`, expecting `walked()` false, `corpus` false, and the tree holding `Moved`.
- **`:298`:** stays under Q1's recommendation.

**`Core/Trash/deleteOrder.test.ts`:** needs no change. It could take the lift's ordering test ("a container delete lifts its excluded folders before its bundle is minted") if the planner prefers to keep order assertions there.

**`Core/Trash/spend.test.ts`:** needs no change for F-3. `:1527` "a Set restored onto a folder Settings excludes refuses, the bundle intact" changes under E-4 (step aside rather than refuse), which is another lane.

**`Core/Trash/trashRecovery.test.ts`:** unchanged.

**`Core/Settings/settings.test.ts`:** no current test changes. It gains unit tests for `carrySetAside`:

- **No Entries:** nothing is written when nothing is named under `from`.
- **The Write Before the Move:** it keeps the source and the landing.
- **The Drop:** it removes the source.
- **The Asset Directory:** it moves.
- **A Case-Only Rename:** it keeps the landed spelling.

---

#### Removal & Consolidation

| What | Where | Change | Lines |
| --- | --- | --- | --- |
| `followExcludedFolders`, `editExcluded` | `settings.ts:90-106` | Replaced by `carrySetAside` (written before the move, dropped after; excluded entries and `asset_directory`) | −16 / +20 |
| `exclusionWriteRefusal` | `settings.ts:108-116`; `rename.ts:20-23`; `move.ts:50-53`; `delete.ts:41-44`; `spend.ts:177` | Deleted; the carry's write before the move is the refusal | −9, −3, −3, (folded into the lift) |
| `excludedWithin` | `settings.ts:86-88` | Deleted; the lift reads the scope directly | −3 |
| `releaseExcludedFolders`, `reseatExcludedFolders` | `settings.ts:118-127` | Deleted (F-3) | −9 |
| The record's `excluded` and its gather | `record.ts:38-39`; `gather.ts:2`, `:72` | Deleted (F-3) | −4 |
| The release at delete | `delete.ts:109` | Deleted (F-3) | −1 |
| The restore's refusal and reseat | `spend.ts:174-179`, `:214-220` | The reseat goes; `relocate` takes no `landed` (F-3) | −4 |
| `relocateFolder` | `folderEntity.ts:30-32` | Runs the carry and returns a `Result`; its two wrappers pass it on | +6 |
| The lift | `folderEntity.ts` (new) | `liftSetAside`, called by the archive op and `deleteOp` | +22 |
| `applyMove`'s corpus check | `fileEvents.ts:574-578` | The counterpart rule | ±1 |
| F-6's carry and its triggers | `Core/Archive/` (new); `settle.ts:166-170`; the restore; F-5's open pass; the Trash record | One carry with three triggers | +32 |
| F-007 | `IssuesPM.md:13`, `:148-160`, `:1363` | Closed | — |

**Net:** about −52 / +81, or +29, of which F-6 is +32. Everything else in the lane (the lift, the carry, and F-3) nets about −3, where the Investigation estimated +17.

---

#### Reusable

- **Path Matching:** `entryWithin`, `remainderUnder`, and `excludedMatcher` (`exclusion.ts:93-119`) cover the lift's remainders, the outermost filter, and the counterpart rule.
- **Naming and Listing:** `freeName` (`names.ts:56-64`), `listEntries` (`walk.ts:13-19`), and `heldName` (`atomicWrite.ts:340-345`) cover naming against the disk with the folder's own spelling.
- **`relocate`'s `landed`:** the slot the drop step uses, which runs before sync hears of the rename (`atomicWrite.ts:61-75`).
- **`updateNexusConfig`'s `Result`:** gives the refusal before any move without a separate probe (`atomicWrite.ts:265-271`).
- **The Settings Writers and Readers:** `writeExcludedFolders`, `normalizeExclusions`, and `readWatchScope`.
- **Crossing Detection:** `owningCollection` (`treePatch.ts:84-91`) for the Collection-crossing test, and `deltaOf`'s path-keyed difference (`treeDelta.ts:13-58`) for the settle's observer.
- **The Test Tap Pattern:** `mutate.test.ts:3372-3383` asserts what settings held at each rename.

---

#### What Becomes False

##### Tests

These are the `mutate.test.ts` cases `:3300` (the Collection-restore half), `:3334`, and `:3362`, including `:3362`'s `wrote.filter(inside)` emptiness, which the lift's rename records break (Call 7). `:3252`'s `watch` assertion only becomes false if Q1 goes incremental.

##### Comments

- **`Core/Nexus/folderEntity.ts:30`:** "excluded entries follow before sync hears of the rename" becomes the carry: written for the landing before the move, dropped from the source after, with the asset directory carried too.
- **`Core/Nexus/fileEvents.ts:574`:** "moves the corpus with no settings write to report it" becomes: an entry under the landing whose counterpart under the source isn't excluded moves the corpus.
- **`Core/Settings/settings.ts:86`, `:97`, `:108`, `:118`, `:125`:** removed with their functions.
- **`Core/Trash/record.ts:38`:** removed with its field.

These stay true: `Core/Files/atomicWrite.ts:61`; `Core/Sync/Client/session.ts:135`, since a rename still carries entries; and `folderEntity.ts:19`.

##### Docs

- **`.claude/Features/CorePM.md:69`:**
  - "Renaming or moving one carries every excluded entry at or under it to the new path" gains the asset directory.
  - "Trashing one takes those entries into its Trash record, and restoring it puts them back under wherever it lands" becomes the lift on archive and trash.
- **`.claude/Features/CorePM.md:73`:** the asset directory follows its folder through a rename or move and is left behind on archive and trash.
- **`.claude/Features/ConfigurationPM.md:259`:**
  - "Carried along when the Collection or Set above an entry is renamed, moved, trashed, or restored" becomes: carried on rename and move, left behind with its folder on archive and trash, with the asset directory alike.
  - "A Collection or Set rename, move, trash, or restore that would carry an excluded entry refuses before anything moves" becomes rename, move, archive, or trash; a restore carries nothing.
- **`.claude/Features/ConfigurationPM.md:109`:** the Default Asset Directory row says nothing of the folder's following. Optional.
- **`.claude/Features/DesktopPM.md:22`:** "a change to the exclusion scope or asset directory … owes a verification walk" and "the watch starts again after every … change of the exclusion scope" only become false if Q1 goes incremental.
- **`.claude/IssuesPM.md:13`, `:148-160`, `:1363`:** F-007 closes.

---

#### Cautionary Items

- **The Counterpart Rule in `applyMove` (`fileEvents.ts:575`):**
  - **Cause:** the carry's write before the move patches the held scope before the move event lands (`fileEvents.ts:507-508`), so its own entry trips the corpus check. That skips the in-place patch and leaves `moveSetOp`'s `reachConfig` reading a stale tree (`move.ts:65`; `configReach.ts:326`).
  - **Necessity:** K-1 names this trip explicitly. At HEAD it costs no extra walk, since it's absorbed by the settings event.
- **The Lift Skips an Entry Naming Nothing on Disk (`pathExists`, Before Reading the Spelling):**
  - **Cause:** entries outlive their folders. Settings › Exclusions checks spelling, not existence (`codec.ts:61-82`), and `relocate` on a missing source throws (`atomicWrite.ts:70`).
  - **Why `pathExists` Comes First:** `heldName` reads its parent folder through `machine().readDir` without catching (`atomicWrite.ts:340-345`). Only `listEntries` wraps that read (`walk.ts:13-19`), and the Desktop host's tolerance of a missing folder (`Desktop/Platform/nodeMachine.ts:65-67`) is a host detail. `pathExists` catches (`atomicWrite.ts:332-338`), so a deeper entry whose middle folder is gone is skipped rather than thrown.
- **The Lift Names Each Folder by Its On-Disk Spelling (`heldName`):**
  - **Cause:** entries match without regard to case (`exclusion.ts:93-99`), so an entry's spelling can differ from the folder's, and naming the landing from the entry would rename the folder's case.
- **Case-Only Renames: the Landed Entry Goes First, and the Drop Spares Entries Still Within `to`:**
  - **Cause:** `normalizeExclusions` dedupes on the case-folded path and keeps the first spelling (`codec.ts:60`, `:75-79`), and `entryWithin` folds case (`exclusion.ts:93-99`).
  - **Consequence:** in a case-only rename `from` and `to` fold together. A naive write-then-drop would collapse both entries to the old spelling and then drop it, losing the entry. Case-only renames are supported (`atomicWrite.ts:366-372`).
- **The Drop Step Stays Inside `relocate`'s `landed`:**
  - **Cause:** `reportRename` follows `landed` (`atomicWrite.ts:73-74`). A drop after it makes sync rescope twice (`session.ts:136-140`; `reconcile.ts:118-124`).
  - **Kind:** this is an ordering requirement, not a guard.
- **The Trash Record Gains the Origin's Collection Id:**
  - **Cause:** the record holds `parent` only (`record.ts:14-19`). A Trash restore given a destination in another Collection, whose original parent is gone, couldn't name the Archive that holds its Set's archived items. Without the field, those items would wait for F-5's open pass.

---

#### Contradictions

- **K-1, "The Carry Causes No Walk":**
  - **What Holds:** K-1's named clause (the pre-written entry mustn't trip `fileEvents.ts:574-577`) can be met with the counterpart rule.
  - **What Doesn't:** the sentence itself can't, as things stand. At HEAD every carry walks, restarts the watcher (whose catch-up walks and seeds again), and makes sync reconcile, all through the settings event's own handling. That's by design, documented (`.claude/Features/DesktopPM.md:22`), and tested (`fileEvents.test.ts:298-305`; `mutate.test.ts:3269`).
  - **What Honoring It Takes:** making scope changes incremental across `applySettings`, the watcher's captured filter, and sync's `rescope`, which covers every exclusion edit, not just carries.
  - **Status:** under the log's *Intent Over Wording* rule, the plan can read the named clause as K-1's intent and proceed on keeping today's re-read (the counterpart rule meets that clause), with Q1 open. The broader reading is what Q1 settles. This entry is a disclosure, not a hard block.
- **F-6, INFERRED, "One Carry, Placed Where Every Such Landing Is Observed Rather Than in Each Path":**
  - **Why It Can't Hold as Worded:** no point at HEAD observes the restore's departure, since its Set comes from outside the tree, or a Finder move made while Pommora is closed.
  - **Recommended Shape:** one carry with three triggers (the settle's comparison, the restore, and F-5's open pass), with the plan confirming that reading.
  - **Status:** it's a technical constraint rather than a preference, so it isn't put to Nathan. The decision log's rule is that INFERRED entries get confirmed against the code or put to him.

---

#### Questions for Nathan

**Q1 — The Re-Read When an Excluded Folder Moves:**

- **What Happens Today:** when you rename, move, archive, or trash a Collection or Set that holds an excluded folder or the asset folder, Pommora updates its exclusion list. Any change to that list makes Pommora re-read the whole Nexus, restart its file watcher, and have sync re-check every file. On a large Nexus that's a few seconds of background work, and it only happens for those operations.
- **The Conflict:** K-1 says the carry causes no re-read. Holding that literally means teaching three parts of the app (the event handling, the watcher, and sync) to tell a carried entry apart from a real exclusion change.
- **Recommendation:** keep today's re-read for carries in this work, and record incremental exclusion changes as an Issue of their own. The re-read is rare, already tested, and documented, and changing it reaches every exclusion edit well beyond the Archive.

**Q2 — Saying That a Folder Was Left Behind:**

- **What Happens:** archiving or trashing a Set that holds an excluded folder moves that folder up into the Set's parent, sometimes renamed to `Omega (2)`.
- **The Question:** should the Archive or Trash notice mention it?
- **Recommendation:** no added copy. Pommora never shows excluded folders anywhere, so a notice would name something the app doesn't display, and the folder stays where Finder shows it.


---

### Scout 4 — ArchiveView, the Archive Place, the Shared Browser, the Entry, the Menus, and Scale

**HEAD:** `4a910cc7a`, one commit past the briefed `d880179b6` (Outliner rails: `Core/MarkdownPM/decorations.ts`, `markdown-pm.css`, `Engine/intents.ts`, `.claude/Features/MarkdownPM.md`). Nothing in this lane moved; the ActionLabel lane should re-check G-6's `decorations.ts:208` and `markdown-pm.css:1008-1049` cites, since both files changed.

**Lane:** read-only. Nothing in the repository changed and no app ran.

---

#### Verified at HEAD

##### Paths the Brief Named Elsewhere

- `ContainerView.tsx` is `Core/Views/ContainerView.tsx`, `SettingsMenu.tsx` is `Core/Interface/Toolbar/SettingsMenu.tsx`, `pickView.ts` is `Core/Views/Pipeline/pickView.ts`, and `useColumnStyles.ts` is `Core/Views/Host/useColumnStyles.ts`.

##### Views, the Table, and the Trash Browser

- **Confirmed:** `TableView.tsx` is 734 lines and `ViewHostApi` throughout (`Core/Views/Table/TableView.tsx:57-72`, `:97-130`). `table-view.css` is 94 lines. `TrashFrame.tsx` is 327 lines.
- **Confirmed:** The sheet's look is `UIX/Table/table.css`: rows and head on `--cols` (`:4-9`), full-length dividers `.data-cell:not(:last-child)` (`:87-89`), header segment bars `.col-header:not(:last-child)::after` and `:first-child::before` (`:95-114`), the hairline `.data-row { border-top }` with `.row-lead` dropping it (`:116-122`). The only change since `213f95a3b` is `:244-251` (the value seat), outside every cited range.
- **Confirmed:** TableView's shell is `Core/Views/Table/table-view.css:3-28` (bleed, inset, grid zoom), `:39-42` (lead cell), `:49-75` (grip gutter and rail).
- **Extended:** The shell reads `--content-inset`, which only Core defines (`Core/Interface/styles.css:57`); no UIX file references it. The gutter reads only `--rail-inset`, which UIX defines (`UIX/Theme/theme-vars.css.ts:117-118`). Two Core rules key on the shell's classes and serve any surface wearing them: `.detail-scroll.has-header .detail-body:has(.table-head)` (`Core/Interface/interface.css:56-59`) and `.detail-scroll:has(.table-view) > .banner-empty` (`Core/Interface/Header/content-banner.css:94`).
- **Confirmed:** The Trash's search ranks through `rankMatches` (`Core/Settings/TrashFrame.tsx:52-56`), the date column repeats the pick by hand (`:65-69`, `:153-159`), batches run through `many` and report with `countPhrase` (`:36-50`, `:99-151`), and the right-click acts on the checked rows still in view (`:161-165`).
- **Corrected:** The History window's rule is at `Core/Interface/Windows/PageHistoryWindow.tsx:140` (`openMenu` opens at `:139`): `checked.has(ts) ? [...checked] : [ts]`. Its helpers are at `:13`, `:81`, `:122`.
- **Confirmed:** Menu builders are 33 and 12 lines; File History's batch offers Delete All alone (`Core/Actions/fileHistoryMenu.ts:5-12`).
- **Extended:** `trashChanged` has a second emitter besides `nexusSlice.ts:248-249`: `Core/Properties/Schema/PropertyFrame.tsx:297`.
- **Extended:** `styleBranch` now offers a style submenu only past one row (`Core/Actions/columnMenu.ts:96-100`). TrashFrame calls `styleMenuItems` directly (`TrashFrame.tsx:154`), so it's unaffected. The shared date hook must keep that direct call.
- **Verified (was Unverified):** Scout D's `trash-frame.css` ranges hold: `:35-37` (the row bar pulled to the date lane), `:67-74` (the hand-drawn hairline), `:76-79` (`.has-checked` forcing reveal).

##### Navigation and Hosting

- **Confirmed:** `NavRef` and `SelectionState` are unions (`Core/Navigation/navRef.ts:10-14`, `:34`), `navKey` is `kind:id` (`:43-45`), and `NAV_KINDS` validates stored refs (`:47-51`). `tabKey` is `navKey` (`Core/Navigation/tabsModel.ts:21-23`).
- **Confirmed:** The exhaustive sites are `ContentView.tsx:35-42`, `:52-89`; `SettingsMenu.tsx:11-27`; `Subfield/crumbs.ts:50-88`; `navigationSlice.ts:598-617`; `reconcileSelection.ts:19-42`.
- **Extended:** The Investigation's list misses five sites. `DEFAULT_ITEMS` is a record over `SelectionState['kind']` (`Core/Interface/Subfield/subfieldItems.tsx:13-21`). `liveTarget` funnels every non-singleton ref through `selectTargetOf`, which takes a `NodeKind` only (`tabsModel.ts:29-33`, `navRef.ts:18-29`); it serves relaunch (`hydrateTabs`, `:66`) and pinned tabs (`derivePinnedTabs`, `:89-105`), so G-5 depends on it. `NodeRecord.kind` is typed `NavRef['kind']` (`Core/Nexus/treeIndex.ts:23`), so widening `NavRef` widens `searchEntriesOf`'s bucket record (`:149-156`). `hasSpine` and `crumbDepthFor` gate crumb depth (`crumbs.ts:9-16`, `:31-40`). Sidebar highlighting compares kinds (`Core/Interface/Sidebar/Sidebar.tsx:109`, `:210`).
- **Confirmed:** `searchView` admits only containers (`Core/Session/viewSearchSlice.ts:25-32`, check at `:27`). `ViewMenu` renders only on a Collection or a depth-1 Set (`Core/Views/Settings/ViewMenu.tsx:15-28`, depth rule at `:23`).
- **Confirmed:** The active view is the sidecar's `active_view`, switched by `switchTo` (`Core/Views/Settings/ViewFrame.tsx:65-68`).
- **Corrected:** The footing is `ViewFrame.tsx:106-118`; the `// PLACEHOLDER` More button is `:108-117`.
- **Corrected:** Scout D's `ManageRow.tsx:43-48` doesn't exist at HEAD. `pressed` is a `Button` prop (`UIX/Buttons/Button.tsx:29`), styled at `UIX/Buttons/button-base.css.ts:150-156`. The filled inline pattern is `PageHistoryWindow.tsx:207-219`. `MenuFooting` lays out `leading`, a spacer, and `trailing` (`UIX/Menus/MenuRows.tsx:208-231`).
- **Confirmed:** The header chain is `InterfaceScaffold.tsx:42` → `EntityBanner` (`Core/Interface/Header/Banner.tsx:83-190`, search gated on `isContainer(owner)` at `:98`) → `DetailTitleHeader` (`DetailTitleHeader.tsx:43-230`). `.detail-title-clear` carries `margin-left: auto` (`content-title.css:91-95`). It keeps its box while hidden, since `titleActionFadeHidden` is opacity and visibility only (`UIX/Animations/animations.css.ts:46-50`). A label placed after it therefore sits at the row's right edge, with the clear pressed against its left. That is the only placement where "the clear pads against the label" (G-3) holds.

##### Menus

- **Confirmed:** `DELETE_ROW` (`Core/Actions/pageMenu.ts:40`) closes `PAGE_ACTION_ROWS` (`:101-105`) and `pageMetaMenuItems` (`:116-134`, last group `:132`). `runPageAction`'s `title:delete` case is `Core/Interface/Menus/pageMenuActions.ts:66-68`.
- **Confirmed:** The container branch is `Core/Actions/entityMenu.ts:60-80`, `[Rename, Delete]` at `:64-67`. The Space and Context Delete is `:95`. Containers run `confirmDelete(target)` at `entityMenuActions.ts:133-135`.
- **Extended:** `runEntityAction` already answers two spellings of one verb (`'title:rename'`/`'rename'` at `entityMenuActions.ts:118-121`, `'title:icon'`/`'editIcon'` at `:122-125`). The bare `'delete'` action has exactly one handler (`:133`).

##### Discovery and Scale

- **Confirmed:** Nav search lists `nodesOf` (`treeIndex.ts:146-174`). `nodesByIdOf` keys every record by id (`:176-184`), and `nodesOf` is also read by `destinationTree.ts:14`, `sidebarDndModel.ts:34`, and `MatrixView.tsx:29`.
- **Confirmed:** TanStack Virtual's one consumer is `UIX/Pickers/IconPicker.tsx:10`, `:80-97`. It is a UIX dependency only (`UIX/package.json:24`); `Core/package.json:17-40` doesn't list it. Its pattern is a state callback ref for the scroll root, a `scrollMargin` read from the list's `offsetTop`, and `translateY` rows.
- **Confirmed:** Neither renderer virtualizes (`.claude/Features/ViewTypesPM.md:175`).
- **Extended:** The listing reads every record and lists every bundle's directory on each call (`Core/Trash/holdings.ts:24-46`). Each row then walks the tree for its trail (`containerTrailWhere`, `Core/Trash/trashRows.ts:41-44`).

##### Tests the Investigation Named

- **Corrected:** `Core/Views/Settings/ViewFrame.test.tsx` asserts nothing about the footing (its cases are `:69-93` switching and `:95-130` reordering). Removing the placeholder breaks no test; the toggle gains new cases.
- **Confirmed:** `Core/Navigation/navRef.test.ts:11-17` uses `'task'` as its foreign kind, so adding `'archive'` to `NAV_KINDS` flips nothing.

---

#### Planner's Calls

##### 1. ArchiveView's Table (G-1, G-2)

**Recommendation:** `Core/Archive/ArchiveView.tsx` draws TableView's own DOM on the shared sheet and wears the shell by class. It imports `Core/Views/Table/table-view.css`; nothing hoists to `UIX/Table/`. The structure is:

```tsx
<div className="table table-view">
  <div className={cx('table-grid', text.body.standard)} style={{ '--cols': ARCHIVE_COLS }}>
    <div className="table-head">
      <div className="col-header">{titleIcon}Title</div>
      <div className="col-header" onContextMenu={date.openMenu}>{dateIcon}Archived</div>
    </div>
    <div ref={setListEl} className="archive-rows" style={{ height: rows.total }}>
      {rows.items.map(({ index, start }) => <ArchiveRow … lead={index === 0} />)}
    </div>
  </div>
</div>
```

Each row is `.data-row` (with `row-lead` on index 0 and `data-reveal-host={anyChecked ? 'on' : ''}`). It holds two cells:

- **Title:** `.data-cell.cell-lead` with `paddingLeft: var(--loose-inset)`, as TableView's ungrouped rows have (`TableView.tsx:432-433`). Inside sit the compact `Checkbox` in a `.row-check` gutter span, then `.cell-title` with `EntityIcon` and `.cell-title-text`, as TableView's title is (`TableView.tsx:179-205`), then the origin trail beneath it as a `NavTrail` (G-2).
- **Archived:** `.data-cell`, centered as TableView centers a date column (`useColumns.ts:110`).

`ARCHIVE_COLS` is `minmax(${title.default}px, 1fr) ${dateTime.default}px` read from `useColumns.ts:32-46` through a one-line export. The dividers, hairlines, segment bars, banner bleed (`content-banner.css:94`), and header padding (`interface.css:56-59`) all come free with the classes.

**Evidence:**

- "Identical to TableView" means `.data-row` grids of `.data-cell`s on `--cols` under a `.table-head` of `.col-header`s (`table.css:4-9`, `:87-89`, `:95-122`).
- The shell's bleed and inset rules depend on `--content-inset`, defined only in Core (`styles.css:57`), so a hoist into `UIX/Table/` would make UIX read a Core variable for the first time.
- Core already imports CSS across domains (`TrashFrame.tsx:33` imports `Navigation/nav-list.css`; `PageHistoryWindow.tsx:31-32` imports `nav-list.css` and `Tiles/tile-base.css`).
- The compact checkbox is 12px (`UIX/Controls/checkbox.css:47-52`), so it fits the 20px `--rail-inset` gutter. `[data-reveal-host="on"]` already forces a reveal (`UIX/Interactions/hover-reveal.css.ts:13`), so "shown while anything is checked" needs no new CSS.
- The Trash's look stays (A-3). It keeps `MenuItem` rows, `.table-divider`, `.is-clear`, and `trash-frame.css`.

**Alternatives:**

- **Hoist the whole shell to `UIX/Table/`:** this would be a UIX sheet reading Core's `--content-inset`, an odd-one-out against "UIX reaches nothing outside itself", and it moves about 45 lines to say nothing new.
- **Hoist only the gutter (`:49-75`):** this splits one shell across two homes with no reader benefit.
- **A `CheckTable` in UIX (Scout D's C):** it would have one consumer under A-3, which is premature.

**Cost:** `ArchiveView.tsx` about +95 (shared with Calls 4, 7, 10, 11). `Core/Archive/archive-view.css` about +18: the title-over-trail stack, the trail's color, the virtual list's positioning, and the trailing label. `table-view.css` +4: `.row-check` joins the gutter selectors at `:49-57`, `.row-grip`'s cosmetics stay its own, and the file's header comment (`:1`) names both wearers. `useColumns.ts` +1 for the width export.

##### 2. Shared Beneath the Visual Layer

**Recommendation:** five pieces, each with one home.

- **The Row:** `TrashRow`/`TrashCrumb` (`Core/Trash/trashRow.ts:6-28`) become `BundleRow`/`BundleCrumb`, one type for both stores. `deletedAt` becomes `storedAt` (the moment the item entered its store). A new optional `icon` carries the item's own icon, from `.nexus/metadata` for a page (kept by B-3) and from its sidecar for a Set, so ArchiveView's `EntityIcon` reads as TableView's does (`TableView.tsx:183`). The Trash ignores `icon` to keep its look. The noun follows Lane 2's owner name: `BundleRow` reads right if both stores are bundle stores (Open Item 1). Avoid "held": `HeldKind` and `heldPages.ts` mean in-tree (`Core/Nexus/entities.ts:26`).
- **The Checked-Row Rule:** two pure helpers beside `toggled` and `retained` in `UIX/Utilities/checkSet.ts`:

  ```ts
  export const checkedIn = <T, K>(shown: readonly T[], checked: ReadonlySet<K>, key: (t: T) => K): T[] =>
    shown.filter((t) => checked.has(key(t)))
  /** A right-click on a checked item acts on the checked items shown; on an unchecked one, on it alone. */
  export const actedOn = <T, K>(clicked: T, shown: readonly T[], checked: ReadonlySet<K>, key: (t: T) => K): T[] =>
    checked.has(key(clicked)) ? checkedIn(shown, checked, key) : [clicked]
  ```

  The Trash (`TrashFrame.tsx:163`), History (`PageHistoryWindow.tsx:140`, where `shown` is every row, so nothing changes in behavior), and the Archive read `actedOn`. ActionLabel reads `checkedIn`. `batch` is `targets.length > 1` everywhere.
- **The Date Column:** `useDateColumn(key)` returns `{ when(ms), openMenu() }`. It resolves the stored style over `{ ...dateDefaults(nexus.dateFormat), time_format: nexus.clock }`, opens `styleMenuItems({ type: 'dateTime', current })` directly rather than through `styleBranch`, and stores through `storedPick`/`holdsStyle`. That is the Trash's code (`TrashFrame.tsx:65-69`, `:153-159`) plus its formatting (`:254-263`). The personalization key is a sibling, `archiveColumnStyle: setting(columnStyle)` beside `trashColumnStyle` (`Core/Settings/personalization.ts:197`). Sharing one key under a neutral name would rename a synced key (stored picks reset, and `readNexus.test.ts:713`, `mergePolicy.test.ts:171-177`, and `TrashFrame.test.tsx:174`, `:184` change) and tie two surfaces' date styles together. Keeping `trashColumnStyle` for both misnames the Archive's. A per-Collection key writes presentation into the sidecar.
- **The Browser:** `useBundleBrowser(store, { query, shown })` folds TrashFrame's controller into one hook both browsers present:
  - **Rows:** rows and failure state, the checked set, `toggle`, `refresh` with `retained`, and the change subscription (`:74-97`).
  - **Batches:** the single-row path, the batch runner, and the restore and delete batches with their reports (`:99-151`). The runner flushes saves when `changesSettled(op)`, asks `mutate` per row, spends each row's Undo, and collects done, refused, unrestored, and warnings. The reports compose through `countPhrase`.
  - **The Menu:** `openMenu(row)` (`:161-199`), through `actedOn` and Call 9's one builder.
  - **The Store Table:** the store kind picks the restore op, the delete op, the delete confirmation, and a homeless row's destinations (`containerTargets`, plus `contextTargets` for a Trash Space).

  `countPhrase` and `PLURALS` (`:36-50`) and the narrowing (`:52-56`, Call 11) move with it.
- **The Signal:** see Call 6.

**Homes:** one neutral owner folder (Lane 2's name), with the files split by side:

- **The Row File:** `BundleRow` stays in a host-safe file, since `Core/Contract/bridge.ts:8` imports it and `Core/Contract/engineGraph.test.ts:7-9` fails on any renderer file the host reaches.
- **The Browser File:** `useBundleBrowser`, `useDateColumn`, `countPhrase`, and the narrowing sit in a renderer-only file beside it (for example `<owner>/browser.ts`, no JSX). They read `useSession`, `dialer`, and `popMenu`, so they must never share a file with the row type or the store code.

`actedOn` and `checkedIn` go in `UIX/Utilities/checkSet.ts`, since History shares them and they're pure. The menu builder goes in `Core/Actions/` (Call 9).

**Evidence:** TrashFrame's body is about 135 lines of controller over 127 of presentation (`TrashFrame.tsx:64-199` against `:201-327`). ArchiveView needs every controller line with different ops. Without the hook it would copy about 120 lines.

**Alternatives:**

- **Share only the pure helpers (Scout D's list) and leave each browser its own state and menu wiring:** that is two copies of the refresh, the runner glue, and the menu dispatch.
- **Put the browser pieces "beside the browsers" in `Core/Settings/`:** ArchiveView would then import from the Settings domain.

**Cost:** TrashFrame about −160 / +6. The browser file about +142 (moved and generalized). `checkSet.ts` +6. History −1 / +1. Personalization +1. Net about −12 on the Trash's side, with the Archive's controller for free.

##### 3. The Place Kind (G-4, G-5)

**Recommendation:** `type ArchiveTarget = { kind: 'archive'; id: string }`, where `id` names a Collection or a top-level Set. It joins `SelectionState` and `NavRef` on the Matrix precedent, but it carries an id, so it is a non-node, id-bearing place rather than a singleton. Every site it touches:

| Site | Where | Change |
| --- | --- | --- |
| The Unions | `navRef.ts:10-14`, `:34` | `ArchiveTarget` added to both (+3) |
| `NAV_KINDS` | `navRef.ts:47-51` | `'archive'` added (+1); `isNavRef` (`:53-56`) and `isForeignRef` need nothing, since an id-bearing ref already validates |
| `navKey`, `toNavRef`, `tabKey`, `isSingleton` | `navRef.ts:36-45`; `tabsModel.ts:21-23` | Nothing: `archive:<id>` falls out, and it isn't a singleton |
| `liveTarget` | `tabsModel.ts:29-33` | The probe passes the archive ref through as it does a singleton (one line edited); relaunch and pins ride it |
| `reconcileWith` | `reconcileSelection.ts:19-42` | `case 'archive'`: live while `collections.has(id)` or `sets` holds `id` at a top-level path (+2) |
| `select` | `navigationSlice.ts:598-617` | `case 'archive'` (+2); `sameShownTarget` (`:145-150`) needs nothing |
| `HostView`, `SUBFIELD` | `ContentView.tsx:52-89`, `:35-42` | `case 'archive': <ArchiveView id />`; `archive: true` (+3) |
| `DEFAULT_ITEMS` | `subfieldItems.tsx:13-21` | `archive: ['count']`; ArchiveView publishes `usePublishCount(shown.length)` as `ViewHost.tsx:26` does (+1) |
| `scopePane` | `SettingsMenu.tsx:11-27` | `archive` joins `none`'s spacer (+1); see the recommendation below |
| `subfieldCrumbs` | `crumbs.ts:50-88` | `case 'archive'`: the owner's spine, each crumb navigable, then an "Archive" segment (+7); `hasSpine` stays false, so `crumbDepthFor` resets as for the Matrix |
| `searchView` | `viewSearchSlice.ts:27` | Admits `isContainer(target) \|\| target?.kind === 'archive'` (+0, one line edited) |
| `ViewMenu` | `ViewMenu.tsx:16-28` | Resolves its node through `archiveOwnerOf` on the archive place and passes `inArchive` (+4) |
| The Tab's Title and Icon | `treeIndex.ts:124-130` (`resolveIndexOf`) | One core per Collection and top-level Set record, keyed `archive:<id>`, with the archive glyph, a title (Question 2), and the owner's ancestry as its path (+9) |
| `NodeRecord.kind` | `treeIndex.ts:23` | `Exclude<NavRef['kind'], 'archive'>`; `searchEntriesOf` stays untouched and the place stays out of nav search by construction |
| The Owner Lookup | new `Core/Archive/archivePlace.ts` | `ARCHIVE_ICON`, `archiveOwnerOf(tree, id)` (`findCollection ?? top-level findSet`), on `matrixKind.ts`'s precedent (+10) |
| The Depth Rule | `ViewMenu.tsx:23` | Hoisted as `isTopSet(path)` beside `findSet` (`treeIndex.ts:206-209`), read by `ViewMenu`, `archiveOwnerOf`, and `reconcileWith` (+2) |
| The Glyph | `UIX/Symbols/index.tsx:107` | `archive` joins the curated roster (+2), since it's only in the generated name list (`iconNames.ts:53`) |
| Recents and Pins | `navigationSlice.ts:595`; `tabsModel.ts:89-105`; `navRecents.ts:5-13` | Nothing beyond `liveTarget`: a place that opens a tab records, as G-5's "like any place" reads, and a pin of it resolves through `resolveIndexOf` |

**The Toggle:** the button calls `select(inArchive ? selectTargetOf(node) : { kind: 'archive', id: node.id }, { newTab: false })`. On an unpinned tab `openTab` replaces the target and pushes history (`tabsModel.ts:154-184`, the replace at `:172-183`), so each press is a Back/Forward step. `{ newTab: false }` keeps Default Opening Behavior: New Tab (`navigationSlice.ts:557-558`) from spawning a tab per press. On a pinned tab, the pinned rule opens the archive in a new tab (`tabsModel.ts:167-171`), and pressing again focuses the pinned tab through `existing` (`:163-164`).

**The Sliders Button:** `SettingsFrame` returns null off a container (`Core/Views/Settings/SettingsFrame.tsx:46-55`), so routing the archive place there would render an empty frame by accident. Joining `none`'s spacer states it on purpose and is the app's existing answer for "nothing to configure" (NavView). Nathan may prefer disabling the segment (Question 5).

**Evidence:** Adding archive records to `nodesOf` instead would collide in `nodesByIdOf` (`treeIndex.ts:176-184`). An archive record shares its owner's id, so it would overwrite the Collection's record that `Sidebar.tsx:296` and `MatrixLabel.tsx:28` read, and it would enter `destinationTree.ts:14`, `sidebarDndModel.ts:34`, and `MatrixView.tsx:29`. Only `resolveIndexOf` needs to know the place: `TabBar.tsx:37`, `NavWindow.tsx:96`, `useNavData.ts:23`, and `PageWindow.tsx:50` read titles and icons from it.

**Alternatives:**

- **A flag on the Collection target:** every `kind === 'collection'` check would read ArchiveView as the Collection.
- **A pseudo-view:** it writes browsing state into the synced sidecar and skips Back and Forward (*§Rejected*).
- **Archive nodes in `nodesOf`:** the id collision above, plus a filter in every consumer.

**Cost:** about +48 across navigation, with the toggle's lines in Call 5.

##### 4. The Banner and Header (G-3)

**Recommendation:** ArchiveView mounts `InterfaceScaffold` with `containerOwner(owner)` and a `trailing` node, so its header is the owner's own header plus the label: the banner image, the banner menu, rename, edit and toggle icon, and ViewSearch. The `trailing` prop threads through three components:

- **`InterfaceScaffold`:** takes it and passes it on (+2).
- **`EntityBanner`:** passes it on (+2).
- **`DetailTitleHeader`:** renders `{trailing}` after the search or label branch, so it trails `.detail-title-clear` (+3).

The label is `<span className="detail-title-trailing">Archive</span>` at the title's size and weight in `label-tertiary` (`content-title.css` +4). This is Nathan's (Question 1).

**Evidence:** `EntityBanner` already offers search for any container owner (`Banner.tsx:98`). Hiding the image, rename, or icon edit would mean threading flags through `EntityBanner` (`:111-149`) and `DetailTitleHeader` (`:27-41`), and an ArchiveView with a different header from its Collection reads as a different place. A rename from the Archive header changes every row's trail, which Call 6's signal re-reads.

**Alternatives:**

- **No banner image in the Archive:** +3 and a flag.
- **Title read-only:** +4, `onRename` made optional, the menu narrowed.

**Cost:** +11.

##### 5. The Entry Button

**Recommendation:** in `ViewFrame`, the `trailing` More placeholder (`ViewFrame.tsx:108-117`) leaves. `leading` becomes `<>{FootingCreate}<Button type="filled" size="button-inline" label="Archive" pressed={inArchive} onClick={toggle} /></>`. `ViewFrame` gains `inArchive`, passed from `ViewMenu`. `switchTo` (`:65-68`) also returns to the view while in the Archive: it selects the owner, and still writes `active_view` only when the id differs. Without that, a view row would switch the view behind an Archive that stays showing (Question 8).

**Evidence:** `ViewMenu` renders on a Collection and a depth-1 Set only (`ViewMenu.tsx:19-26`), and must also render on the archive place, or the toggle has no way back. On the archive place it resolves the same owner, so `key={node.id}` (`:27`) holds and the dropdown doesn't remount across the toggle. The dropdown's glyph and label keep showing the active view.

**Alternatives:**

- **Leave the placeholder in `trailing`:** dead code beside the real button.
- **Put the button in `trailing`:** G-4 places it right of `+`.

**Cost:** −10 / +10.

##### 6. Listing Rows

**Recommendation:** one channel serves both stores:

- **The Channel:** `'bundles:list': { args: [store: BundleStore]; reply: Result<BundleRow[]> }` with `type BundleStore = { kind: 'trash' } | { kind: 'archive'; id: string }`, replacing `'trash:list'` (`bridge.ts:258-259`, `Core/Trash/handlers.ts:12-14`).
- **The Archive Arm:** takes the place id alone. The host resolves it: a Collection id lists its whole Archive. A Set id lists its Collection's Archive narrowed to records whose origin parent's current trail by ids contains the Set while the tree holds that parent, else whose stored ancestor ids contain it (*§ArchiveView as a Place*, F-6). The listing itself is Lane 2's.
- **The Change Signal:** one signal for both stores. `trashChanged` (`nexusSlice.ts:70-71`) becomes `storesChanged`. It is emitted after every op that changes a store or the tree its rows resolve against, read through one predicate `changesStores(req)` beside `changesSettled` (`Core/Nexus/mutateRequest.ts:138-146`) in place of nexusSlice's inline triple (`:248-249`). The predicate covers delete, restore, emptyBundle, the archive ops, `moveSet` (the F-6 carry), and a `rename` whose `kind` is a Collection or Set. It takes the request rather than the op, because `rename` also renames pages (`mutateRequest.ts:66-71`), and a page's rename moves no trail in either store. `PropertyFrame.tsx:297` emits the same signal.
- **When a Browser Reads:** while it shows, and again each time it's shown. The caller supplies `shown`: ArchiveView passes `!useContentHost()?.parked`, and TrashFrame passes `true`. The hook mustn't read the content host itself, because `usePublishCount`'s rule (`Core/Interface/Subfield/publish.ts:9-10`) reads a null host as hidden, and TrashFrame mounts in the Settings window with no content host. A parked ArchiveView doesn't re-list per signal.

**Evidence:**

- One store-typed argument lets `useBundleBrowser(store)` stay one hook.
- Delete-from-archive lands in `.trash` and a Trash restore of such an item leaves through the Archive (E-3), so one op changes both stores. Twin signals would need both emitted.
- `emitter` can carry a payload (`UIX/Utilities/subscribable.ts:6`), but every listener re-lists its own store anyway.
- Parked hosts stay mounted (`ContentView.tsx:92-136`), and each list reads every record (`holdings.ts:24-46`), so re-listing every parked ArchiveView per op would scale with the Active Tab Cache.

**Alternatives:**

- **Two channels (`trash:list`, `archive:list(id)`):** the hook takes a list function instead. One more bridge entry and one more handler for the same reply shape.
- **A twin `archiveChanged`:** two emits for every op touching both stores.

**Cost:** bridge ±0. Handler +6 (Lane 2's arm). `changesStores` +8 / −2. Signal rename ±0.

##### 7. Scale

**Recommendation:** ArchiveView virtualizes its rows through one thin UIX seam that IconPicker adopts too:

```ts
useVirtualRows({ count, rowHeight, listEl, scrollEl }): { total: number; items: { index: number; start: number }[] }
```

It lives in `UIX/Interactions/virtualRows.ts`, wraps `useVirtualizer` with a layout effect that measures the list's offset within its scroll root (see *§Cautionary Items*), and is the only importer of `@tanstack/react-virtual` (the dependency seam the Hard Rules' Dependencies line asks for). IconPicker's inline virtualizer (`IconPicker.tsx:80-97`) moves onto it. ArchiveView's scroll root is the scaffold's `.detail-scroll`, found by `listEl.closest('.detail-scroll')`, since `InterfaceScaffold` owns it (`InterfaceScaffold.tsx:16-41`). Rows are one fixed height (title over trail, both single-line), so `estimateSize` is a constant from `archive-view.css`'s row height. `.archive-rows` is `position: relative`, rows are absolute with `translateY(start)`, and `.row-lead` comes from index 0 rather than `:first-child`.

**Evidence:**

- An Archive only grows: there's no auto-delete yet (*§Prospects · Auto-Delete*).
- ArchiveView is a warm, parked host whose DOM stays mounted (`ContentView.tsx:92-136`).
- ViewSearch narrows on every keystroke. Rendering every row on each one is the "O(N) on a high-frequency trigger" the Hard Rules forbid. Virtualizing bounds the render to the viewport.
- Core can't import TanStack directly (`Core/package.json:17-40`).

**Alternatives:**

- **Render every row, as TableView does:** consistent with `ViewTypesPM.md:175`'s known issue, but it ships the known lag into a surface designed to accumulate.
- **Paging or "Show More":** new interaction nobody asked for.
- **A Core-local `useVirtualizer` import:** a second consumer outside the seam.

The seam also gives TableView's known issue its later home.

**Cost:** seam +24, IconPicker −14, ArchiveView about +8 (inside its +95), CSS about +6 (inside `archive-view.css`).

##### 8. Set Rows

**Recommendation:** an archived Set is one row, with the Set's icon, its title, its trail, and its archived time. Restore and Delete act on the whole Set, and its pages aren't browsable until it's restored. A page archived out of that Set before the Set itself was archived is its own row, with the trail its stored ancestry gives. This is Nathan's (Question 3).

**Evidence:** Disclosing pages inline would need the host to walk each Set bundle's pages (`contentPages`, `holdings.ts:48-60`). It would also need a nested row model with disclosure state and an answer to whether a page inside an archived Set can be restored alone, which would split one bundle. `--row-indent` (`table-tokens.css:8`) exists but buys nothing without that model.

**Alternatives:** inline disclosure (Scout D) costs about +40 and a bundle-splitting decision.

**Cost:** 0.

##### 9. Menus (I-1, K-4)

**Recommendation:**

- **Pages:** `pageMenu.ts` gains `'title:archive'` in `PageMetaAction`, `ARCHIVE_ROW = { label: 'Archive', action: 'title:archive' }`, and `REMOVAL_ROWS = [ARCHIVE_ROW, DELETE_ROW]`. `REMOVAL_ROWS` replaces `[DELETE_ROW]` at `:104` and `:132`.
- **The Page Runner:** `runPageAction` gains one case (`pageMenuActions.ts`, after `:68`): `case 'title:archive': void confirmArchive({ path, kind: 'page', title }); return true`. `confirmArchive` is the confirmation lane's.
- **Containers:** the container branch (`entityMenu.ts:60-80`) becomes `[open], [create], [Rename], [lock?, Copy Path, Reveal], set ? REMOVAL_ROWS : [DELETE_ROW]`, using the shared constants.
- **The Take Along:** the Space and Context branch's Delete (`:95`) also becomes `DELETE_ROW`. The bare `'delete'` leaves `EntityMenuAction` (`:33`), and `runEntityAction`'s `case 'delete'` becomes `case 'title:delete'` (`entityMenuActions.ts:133`), joined by `case 'title:archive': void confirmArchive(target)`. One Archive row and one Delete row are then defined once, app-wide.
- **The Restore Builder:** `Core/Actions/restoreMenu.ts` replaces `trashMenu.ts` and `fileHistoryMenu.ts`:

  ```ts
  type RestoreMenuAction = 'restore' | 'delete' | `restoreTo:${string}`
  interface RestoreMenuContext {
    batch: boolean
    /** File History restores one snapshot at a time, so its batch offers Delete alone. */
    restoresBatch?: false
    destinations?: MoveTarget[]
  }
  ```

  The labels read "Restore All" and "Delete All" for a batch. The leaf knows `batch`, so `restoreAll` and `deleteAll` fold into `restore` and `delete`.

The resulting shapes:

- **Page Menus:** `… — Copy Link, Copy Path — View History, Reveal — Archive, Delete`.
- **`PAGE_ACTION_ROWS`:** `Rename — Copy Link, Copy Path, View History, Reveal — Archive, Delete`.
- **A Sidebar Collection:** `New Tab — New Page… — Rename — Lock Folder, Copy Path, Reveal Location — Delete`.
- **A Band Set:** `New Page — Rename — Copy Path, Reveal Location — Archive, Delete`.

**Evidence:** Every page Delete builds from `DELETE_ROW` and runs through `runPageAction` (Verified). `runEntityAction` already doubles spellings for rename and icon (`entityMenuActions.ts:118-125`), and `'delete'` has one handler (`:133`). A lone `[Rename]` group mirrors `PAGE_ACTION_ROWS`' own (`pageMenu.ts:102`).

**Menu Tests That Change:**

- `Core/Actions/pageMenu.test.ts`:
  - › "the page menu" › "groups its rows, with Reveal joining History only where it is asked for" (`:15-37`) gains `'Archive'` before `'Delete'`.
  - › "the page action rows" › "hold Rename, the send and locate rows as one group without Move To, and Delete" (`:87-98`) gains the same, and its name gains Archive.
- `Core/Actions/entityMenu.test.ts`:
  - › "the sidebar entity menu" › "a page draws the whole page menu, Reveal included" (`:20-39`) gains `'title:archive'`.
  - "a sidebar collection opens, creates, renames, deletes, locks, copies its path, and reveals in four groups" (`:41-60`): Delete moves to its own last group, and the name reads five groups.
  - "a band set neither opens nor locks, and a context without creators starts at Rename" (`:62-73`): the Set's shape becomes `['New Page','—','Rename','—','Copy Path','Reveal Location','—','Archive','Delete']`; the Context half stands.
- `Core/Actions/cellMenu.test.ts` › "cellMenuModel" › "title: Preview + stateful Open row + … + separator-gated Delete" (`:8-26`): gains `['Archive','title:archive']`, and the separator assertion (`:24`) moves to `title:archive`.
- `Core/Actions/cardMenu.test.ts` › "cardMenuModel" › "lists the page-meta actions with one New Page — the grid has no above" (`:5-20`): the same two changes (`:15`, `:19`).
- `Core/Actions/trashMenu.test.ts` (3 cases, `:4-41`) and `Core/Actions/fileHistoryMenu.test.ts` (2 cases, `:4-15`) collapse into one `restoreMenu.test.ts`. `'restoreAll'` and `'deleteAll'` become `'restore'` and `'delete'` with batch labels (`trashMenu.test.ts:10-13`).

**Alternatives:**

- **Keep the container `'delete'` literal and add `{ label: 'Archive', action: 'archive' }`:** a third spelling pair for one verb.
- **Keep two restore builders:** K-4 rules it out.

**Cost:**

- **Pages:** `pageMenu.ts` +3, `pageMenuActions.ts` +3.
- **Containers and Spaces:** `entityMenu.ts` −5 / +2, `entityMenuActions.ts` +3.
- **The Restore Builder:** −45 / +20.

##### 10. Opening a Row

**Recommendation:** a page row's title click opens the reader window through the window lane's one typed reader slot (for example `openReader({ kind: 'archived', bundlePath })`, replacing `openHistory`, `windowSlice.ts:30-32`, `:142-143`). This mirrors TableView, where the title is the open gesture (`ViewTypesPM.md:91`). A Set row's title opens nothing, since its pages aren't browsable until it's restored (Call 8). The rest of a row toggles its check, as a Trash row does (`TrashFrame.tsx:318`), so one checking gesture covers both browsers. The right-click menu stays Restore and Delete (K-4) and adds no Open row. This is Nathan's (Question 4).

**Evidence:** `PageHistoryWindow.tsx:48-53` is the single-slot opener the reader generalizes. A Set has no reader.

**Alternatives:**

- **Double-click to open:** no precedent on table rows.
- **An Open row in the menu:** a second door, and K-4's builder would gain a row only the Archive uses.

**Cost:** inside ArchiveView; the slot is the window lane's.

##### 11. Search

**Recommendation:** ArchiveView reads the tab's query as `useViewHost` does: `useSession((s) => host && s.viewSearch[host.tabId]?.query)`, from `useViewHost.ts:54-56`. It narrows in place through `matchQuery` and `matchScore(row.match, q) !== null`, keeping Archived order. That is ViewSearch's documented rule (`ViewTypesPM.md:75`, `Core/Views/Pipeline/search.ts:4-14`), and G-1 asks ArchiveView to read as TableView does.

The shared narrowing in the browser file is that one rule. The Trash adopts it in place of `rankMatches` (`TrashFrame.tsx:52-56`), a behavior change A-3's restructuring clause allows but Nathan should see (Question 6). No current `filterRows` case asserts a multi-match order (`TrashFrame.test.tsx:33-64`), so the tests stand.

The Archive's `match` place should start below its Collection, as ViewSearch's starts below its container. Otherwise typing the Collection's own name matches every row. That is one slice in Lane 2's row builder (`trashRows.ts:52-55`'s `matched`).

**Evidence:** both rules start from `matchQuery` and `MatchKey` (`Core/Paths/caseFold.ts:46-57`). ViewSearch keeps order through `matchScore` (`:63-68`) and the Trash ranks through `rankMatches` (`:73-97`).

**Alternatives:** the hook takes a `rank` flag so the Trash keeps ranking. That is +1 parameter and two rules for browsers reading one field type.

**Cost:** ArchiveView +2. Narrowing ±0.

---

#### Removal & Consolidation

| What | Where | Change | Lines |
| --- | --- | --- | --- |
| The Trash browser's controller | `Core/Settings/TrashFrame.tsx:36-56`, `:64-199`, `:254-263` | Moves into `useBundleBrowser`, `useDateColumn`, `countPhrase`, and the narrowing in the neutral owner's renderer file; TrashFrame keeps its presentation | −160 / +6 |
| The batch rule, twice | `TrashFrame.tsx:163`; `PageHistoryWindow.tsx:140` | `actedOn` and `checkedIn` in `UIX/Utilities/checkSet.ts` | −2 / +6 |
| The hand-repeated date pick | `TrashFrame.tsx:65-69`, `:153-159` | `useDateColumn(key)` (in the row above) | — |
| Two restore menu builders | `Core/Actions/trashMenu.ts` (33), `fileHistoryMenu.ts` (12) | One `Core/Actions/restoreMenu.ts`; `restoreAll`/`deleteAll` fold into `restore`/`delete` | −45 / +20 |
| `TrashRow`, `TrashCrumb`, `deletedAt` | `Core/Trash/trashRow.ts:6-28`; `bridge.ts:8`, `:259` | `BundleRow`, `BundleCrumb`, `storedAt`, plus `icon?` | ±0 / +2 |
| `'trash:list'` | `bridge.ts:258-259`; `Core/Trash/handlers.ts:12-14` | One list channel taking the store | ±0 |
| `trashChanged` and its inline op triple | `nexusSlice.ts:70-71`, `:248-249`; `PropertyFrame.tsx:297` | One `storesChanged` emitted through `changesStores(req)` | −2 / +8 |
| The `// PLACEHOLDER` More button | `ViewFrame.tsx:108-117` | Removed; the Archive button joins `leading` | −10 / +10 |
| `DELETE_ROW` alone in the closing groups | `pageMenu.ts:104`, `:132` | `REMOVAL_ROWS` | +3 |
| Container and Space Delete literals, the bare `'delete'` action | `entityMenu.ts:33`, `:64-67`, `:95`; `entityMenuActions.ts:133` | `DELETE_ROW` and `REMOVAL_ROWS` throughout; `'title:delete'` and `'title:archive'` cases | −5 / +5 |
| IconPicker's inline virtualizer | `UIX/Pickers/IconPicker.tsx:80-97` | `useVirtualRows`, the one TanStack seam | −14 / +24 |
| ViewMenu's inline depth rule | `ViewMenu.tsx:23` | `isTopSet(path)` shared with `archiveOwnerOf` and `reconcileWith` | ±0 / +2 |
| `countPhrase`'s lowercase kinds | `TrashFrame.tsx:36-50` | Title Case, "2 Pages", "1 Set", matching `itemCount`'s "Items" (`Core/Properties/properties.ts:263`) and G-6's "3 Pages" (Take Along) | ±0 |
| `table-view.css`'s owner line | `Core/Views/Table/table-view.css:1` | Names TableView and ArchiveView as the shell's wearers | ±0 |

**Lane Net:** about −238 / +406, so about +168. Without tests and docs, the positive part is the Archive's own new surface: ArchiveView, its sheet, the place, the header node, and the button, about +185. The consolidation rows net about −20 while handing the Archive the whole controller, menu, date column, and virtualization seam.

---

#### New Surface

| What | Home | Lines |
| --- | --- | --- |
| `ArchiveView` (owner, scaffold, head, virtual rows, row, opener, search, count) | `Core/Archive/ArchiveView.tsx` | ~95 |
| ArchiveView's sheet | `Core/Archive/archive-view.css` | ~18 |
| `ARCHIVE_ICON`, `archiveOwnerOf` | `Core/Archive/archivePlace.ts` | ~10 |
| The browser controller, date hook, `countPhrase`, narrowing | `<neutral owner>/browser.ts` (renderer-only) | ~142 (moved and generalized) |
| `BundleRow`, `BundleCrumb`, `BundleStore` | `<neutral owner>/bundleRow.ts` (host-safe; replaces `Core/Trash/trashRow.ts`'s row half) | ~30 (moved) |
| `restoreMenuItems` | `Core/Actions/restoreMenu.ts` | ~20 |
| `useVirtualRows` | `UIX/Interactions/virtualRows.ts` | ~24 |
| `checkedIn`, `actedOn` | `UIX/Utilities/checkSet.ts` | +6 |
| `changesStores` | `Core/Nexus/mutateRequest.ts` | +8 |
| `archiveColumnStyle` | `Core/Settings/personalization.ts` | +1 |
| The header's `trailing` node | `InterfaceScaffold.tsx`, `Banner.tsx`, `DetailTitleHeader.tsx`, `content-title.css` | +11 |
| The place kind's site edits | Call 3's table | ~+48 |
| The `archive` glyph | `UIX/Symbols/index.tsx:107` | +2 |

`TrashMode` and `DEFAULT_TRASH_MODE` (`trashRow.ts:30-33`) stay in `Core/Trash/`, since they're the Trash's alone.

---

#### Reusable

- **The Sheet:** `.table`, `.table-head`, `.col-header`, `.col-header-icon`, `.data-row`, `.data-cell`, `.row-lead`, `.cell-title`, `.cell-title-text` (`UIX/Table/table.css`).
- **The Shell:** `.table-view` and its gutter (`table-view.css:3-75`), plus the Core rules keyed on it (`interface.css:56-59`, `content-banner.css:94`).
- **The Owner's Header:** `InterfaceScaffold`, `EntityBanner`, `DetailTitleHeader`, and `containerOwner` (`treeIndex.ts:255-264`), with ViewSearch included.
- **The Footing:** `MenuFooting`, `FootingCreate`, and `Button type="filled" size="button-inline" pressed`.
- **Small Pieces:** `EntityIcon`, `NavTrail`, `Checkbox size="compact"`, `revealTarget` with `data-reveal-host="on"`, and `usePublishCount`.
- **Navigation:** `navKey`, `tabKey`, `openTab`, `pruneHistory`, `recordRecent`, and `resolveIndexOf`: the place rides them all.
- **The Date Column:** `styleMenuItems`, `parseStyleAction`, `resolveStyle`, `storedPick`, `holdsStyle`, `dateDefaults`, `useNexusForms`, and `formatDate`.
- **Search:** `matchQuery`, `matchKey`, and `matchScore`.
- **Restore Plumbing:** `destinationRows` and `containerTargets`, for a homeless row's Restore ▸.
- **Batches:** `notifyReport`, `unrestoredLine`, `spendBundle` (or its `spendUndo` successor), `flushAllSaves`, and `changesSettled`.

---

#### What Becomes False

##### Tests

- **Menu Tests:** Call 9's list.
- `Core/Settings/TrashFrame.test.tsx`:
  - The `filterRows` describe (`:33-64`) and `countPhrase` describe (`:66-85`) move with the hoist. `countPhrase`'s expectations at `:68-79` read "2 Pages", "2 Sets", "2 Contexts", "1 Page", "1 Space" under the Title Case Take Along.
  - The `'trash:list'` mocks (`:93`, `:138`, `:276`) become the list channel with `{ kind: 'trash' }`.
  - "lists a delete made elsewhere while it is open" (`:313-319`) holds through the renamed signal.
  - The DOM cases on `.trash-row` and `.trash-head-date` stay (A-3).
- `Core/Trash/trashRows.test.ts` (`:8`, `:24`, `:223`) and `Core/Trash/trashRecovery.test.ts:13`, `:34`: `TrashRow` becomes `BundleRow`, and `deletedAt` becomes `storedAt`.
- `Core/Nexus/treeIndex.test.ts` › "resolveIndexOf" › "holds display cores for the homepage, the Matrix, spaces, collections, sets, and pages — never groups" (`:68-77`): the name's kind list gains the archive place, with a new expectation.
- `Core/Interface/Subfield/subfieldItems.test.ts` › "subfield item registry" (`:4-21`): gains the archive kind's `['count']`.
- `UIX/Pickers/IconPicker.test.tsx` (`:22`, `:44`): stands; it drives the picker, not the virtualizer.
- **New Cases, Nothing Breaking:** `Core/Navigation/navRef.test.ts` (an archive ref admitted), `Core/Navigation/tabsModel.test.ts` › "tabsModel — the Matrix kind" (`:51-64`, the precedent for an archive `liveTarget` case), and `Core/Views/Settings/ViewFrame.test.tsx` (the toggle and its pressed state).

##### Comments

- `Core/Contract/bridge.ts:258`: "`.trash` is outside the watcher, so the browser asks again after every action it takes." The Archive is inside the watcher, and one channel serves both stores.
- `Core/Session/nexusSlice.ts:70`: "…so an open Trash list reads again" (both browsers).
- `Core/Actions/trashMenu.ts:9`: the batch rule's home moves to `checkSet.ts` (the file leaves).
- `Core/Settings/TrashFrame.tsx:162`: the long rule comment moves to `actedOn`.
- `Core/Settings/TrashFrame.tsx:58`: stays true.
- `Core/Views/Settings/ViewMenu.tsx:15`: "Renders only on a Collection / depth-1 Set" (it also renders on the archive place).
- `Core/Views/Table/table-view.css:1`: "TableView's layer…" (the shell is worn by ArchiveView too).
- `UIX/Table/table.css:18`: "TableView's .col-header and the Trash's head both inherit it" (ArchiveView's too).
- `Core/Trash/trashRow.ts:11`: "the renderer never sees a `.deleted` suffix" (generalizes per store).
- `Core/Actions/destinationTree.ts:1`: "the trash's Restore ▸" (both stores; K-5 already lists this line).

##### Docs

- `.claude/Features/ViewTypesPM.md`:
  - **`:61`:** "over a New View footer" gains the Archive button.
  - **`:75`:** "A container's in-line title in the main pane also carries a search over its view" (ArchiveView's title carries it too).
  - **`:95`:** "TableView adds its own layer over it" (TableView and ArchiveView share that layer).
  - **`:97`:** the SOURCE row stands.
  - **`:175`:** "Neither renderer virtualizes" stays true of the renderers but gains the seam they'd ride.
  - **`:71`:** The View Host's one-seat line stays true, since ArchiveView is a place, not a view renderer.
- `.claude/Features/PommoraUIX.md:391`: "(TableView, the Trash)" gains ArchiveView. `:54`'s `checkSet` entry gains the batch rule. `:317-319` *§Interactions* gains `useVirtualRows`.
- `.claude/Features/InterfacePM.md`:
  - **`:8`:** "a view's in-line title also carries its search" (and ArchiveView's).
  - **`:12`:** "the container's SettingsFrame, a page's own Settings, a Space's own menu, or the Matrix's pane" and "The middle slot holds the ViewMenu on a container" (and on the archive place).
  - **`:48`:** **All**'s scrollbar list gains ArchiveView.
- `.claude/Features/NavigationPM.md:30`: Iconography gains the archive tab's glyph and title.
- `.claude/Features/ConfigurationPM.md:217-221`: the Trash's Date Column row stands. A sibling Archive Date Column row joins wherever the Archive's settings live.

---

#### Cautionary Items

- **ArchiveView's Not-Found Arm:** a lookup can miss in the frame between `set({ tree })` (`nexusSlice.ts:98`) and `reconcileNavigation` (`:100`). ContentView's Collection and Set arms already render a placeholder for that frame (`ContentView.tsx:65-84`). The archive arm follows that one shape; it adds no new guard kind.
- **The Archive Place Never Enters `nodesOf`:** an archive record shares its owner's id, so `nodesByIdOf` (`treeIndex.ts:176-184`) would overwrite the Collection's record that `Sidebar.tsx:296` and `MatrixLabel.tsx:28` read.
- **The Toggle Passes `{ newTab: false }`:** `select`'s default reads `tabOpenBehavior` (`navigationSlice.ts:557-558`), and under New Tab it would spawn a tab per press.
- **The Reconcile's Depth Rule:** the place lives only while its owner is a Collection or a top-level Set, because `ViewMenu` renders only there (`ViewMenu.tsx:23`). An archive place whose Set moved deeper would have no toggle back. A tab left on it closes as one on a deleted entity does. Alternative: keep it alive at any depth and render the views dropdown for it anyway.
- **Re-List Only While Shown:** parked hosts stay mounted (`ContentView.tsx:92-136`), and each list costs a record read and a directory listing per bundle plus a tree walk per row (`holdings.ts:24-46`, `trashRows.ts:41-44`). Lane 2 should weigh an id-keyed trail lookup (`ancestryOf`, `treeIndex.ts:142-143`) over `containerTrailWhere`.
- **Stale Trails and Homes (raised for Lane 2, not settled here):** `crumbs` and `homeResolves` resolve host-side at list time (`trashRows.ts:31-50`). The Trash in Settings rarely sees a rename while open; ArchiveView in the content pane does. There are two shapes:
  - **Re-List on Container Rename and Move:** Call 6's `changesStores(req)`, within the Cost rule because it fires on user ops, not tree pushes.
  - **Resolve Renderer-Side:** rows return origin ids and the stored chain, and the renderer resolves trails through `ancestryOf` and `homeResolves` through `resolveRecord`, which is tree-pure (`Core/Trash/resolve.ts:1-10` imports no file I/O). That is live with no re-list, but it moves `liveCrumbs` (`trashRows.ts:31-45`) renderer-side.
- **Outside Arrivals:** a sync or Finder change landing in `.nexus/archive/` reaches an open ArchiveView only at its next op or next showing, as the Trash behaves today. A watcher-driven push is Lane 2's if wanted.
- **The Warm Scroll Restore Runs Before Rows Arrive:** `InterfaceScaffold.tsx:22-36` sets `scrollTop` on mount, while ArchiveView's rows arrive by IPC. A cold-rebuilt ArchiveView beyond the Active Tab Cache returns at the top. No guard is recommended; it's the cost of an async-listed place.
- **The Virtual List Measures Its Offset Against the Scroll Root:** IconPicker reads `scrollMargin` from the list's `offsetTop` (`IconPicker.tsx:84-88`), which works because its list and scroll root are its own. ArchiveView's scroll root is the scaffold's `.detail-scroll`, which nothing positions (`Core/Interface/interface.css:48-51`), while the parked host above it is `position: absolute` (`:40-46`). `offsetTop` would measure against that host instead. `useVirtualRows` measures the list's offset as the rect difference to the scroll element plus its `scrollTop`, and IconPicker reads the same.
- **The Date Hook Calls `styleMenuItems` Directly:** `styleBranch` now hides a lone row (`columnMenu.ts:96-100`), and the date column always has several.
- **The Row Type Stays Host-Safe:** `bridge.ts:8` imports it, and `engineGraph.test.ts:7-9` fails on any renderer file the host reaches.

---

#### Contradictions

None found. Every recommendation was checked against A-3 (the Trash's look is untouched; only notice copy and search order change, both flagged), A-4, G-1 to G-6, I-1, K-4, and *§Rejected*: no `TableView` read-only mode and no saved-view Archive.

---

#### Questions for Nathan

1. **The Archive's Header:** ArchiveView shows its Collection's full header: banner image, rename, and icon editing, with "Archive" trailing at the right edge in tertiary. **Recommended:** keep it all, since it's the Collection's other face. Alternatives: hide the banner image, or make the title read-only there.
2. **The Archive Tab's Name:** a tab showing an Archive reads as its Collection's title with the archive glyph, or as "Archive" with the Collection as its location. **Recommended:** the Collection's title with the glyph, so two Archives' tabs tell apart.
3. **Archived Sets:** a Set is one row; Restore and Delete act on the whole Set, and its pages stay closed until it's restored. **Recommended:** one row. Alternative: disclose its pages inline, indented.
4. **Clicking a Row:** a page's title opens the read-only window, and clicking elsewhere on any row checks it, as in the Trash. **Recommended:** as stated. Alternative: only the checkbox checks.
5. **The Sliders Button in the Archive:** it opens an empty pane, as on a new tab, or it's disabled there. **Recommended:** the empty pane, the app's existing answer.
6. **One Search Rule for Both Browsers:** typing in the Archive narrows the list in place, keeping newest-first order as every view's search does. The Trash's search would switch to the same rule, from best-match-first. **Recommended:** one rule, in place. Alternative: the Trash keeps ranking.
7. **The Archive Button on a Pinned Tab:** pressing it opens the Archive in a new tab, since pinned tabs never change in place, and pressing it again returns to the pinned tab. **Recommended:** as stated; everywhere else the toggle stays in its tab.
8. **Picking a View While in the Archive:** choosing any view in the dropdown leaves the Archive for that view. **Recommended:** yes.


---

### Archive — Scout 5: ActionLabel, the Reader Window, the Archive History Timeframe, Settings, Confirmations, and the Undo

**DATE:** 10-19-2026
**HEAD:** `c22cfe847`. The brief named `d880179b6`; two commits landed since (`4a910cc7a`, `c22cfe847`), both MarkdownPM outliner-rail work touching `Core/MarkdownPM/decorations.ts` and `markdown-pm.css`. Every line cited here in those files was re-read at `c22cfe847`.
**Lane:** G-6, G-7, H-1, I-2, I-3, J-1, K-3, K-5, Open Item 2, and *§Rejected · A Mode of `PageWindow`*.

---

#### Verified at HEAD

##### Windows

- **The History Slot — Confirmed:** `historyTarget` at `Core/Session/windowSlice.ts:30`, its opener pair declared at `:31-32` and set at `:142-143`, counted by `windowsOpen` at `:64-69`, reset in `CLOSED` (`:71-77`), `PER_NEXUS` (`:79-84`), `closeWindows` (`:258-261`), and `resetWindow` (`:284-287`), reconciled at `:279-281`. `reconcileWith`'s page arm keeps an id the tree lacks only under a withheld path (`Core/Session/reconcileSelection.ts:33-41`), so an archived target would close. **Extended:** the same arm re-keys a vanished id to whatever page now sits at its path (`reconcileSelection.ts:37-38`, pinned by `windowSlice.test.ts:35-45`), which the History branch keeps and the archive branch must not ride.
- **The Title — Confirmed:** `trailOf` answers `NO_TRAIL` off-tree (`Core/Nexus/treeIndex.ts:132-133`); the History title reads it at `Core/Interface/Windows/PageHistoryWindow.tsx:120`.
- **The Body Read — Confirmed, Sharpened:** the Current Version reads through `fetchPageDetail` (`PageHistoryWindow.tsx:106`), which is `fetchPageResult` (`Core/Session/pageDetailCache.ts:102-118`): it always asks `page:open` and never answers from a cached detail, so dropping it changes nothing the window shows and removes only the cache seeding (`:110`). `page:open` reads any path under the root with no tree check (`Core/Pages/handlers.ts:18-24`), refusing only a non-member file (`Core/Files/pageFile.ts:233-246`, `:237`). An archived body must stay out of that cache for a concrete reason: `values:changed` drops cached details by tree path (`Core/Session/useBridgeSubscriptions.ts:55-57`), so a cascade rewriting an archived file would leave a cached archived body stale indefinitely.
- **The Leading Slot — Confirmed:** `WindowBase` draws the scan button only when `onScan` is passed, then `lead` (`UIX/Windows/WindowBase.tsx:243-254`); trailing `actions` at `:256-258`.
- **Parked Hosts Translate — Confirmed, One Citation Corrected:** `.is-parked` uses `translate: -200vw` (`Core/Interface/interface.css:40-46`), and parked hosts stay mounted (`Core/Interface/ContentView.tsx:181`). The Investigation's `UIX/Animations/motion.ts:58-66` points into `slideIn` (`motion.ts:57-68`), the view-swap slide that animates `transform` on the incoming content view (`ContentView.tsx:155`), which is the one that matters for a surface in the content pane; `paneSlide` itself lives in `UIX/Animations/paneSlide.ts:5-16` and holds a standing `transform` (`UIX/Animations/pane-slide.css.ts:9-18`). Glass windows add `backdrop-filter` (`UIX/Glass/glassBase.ts:73`). Each makes a fixed descendant position against its ancestor.
- **The Lock Glyph — Confirmed:** `LockGlyph` at `UIX/Symbols/index.tsx:263-286`, faces `locked` / `lock-outline` at `:197-198`, drawn through the two-face `glyphSwap` stack (`UIX/Symbols/symbols.css.ts:5-11`). Its six surfaces hold: `Disclosure.tsx:157`, `GlancePane.tsx:346`, `ViewTile.tsx:530`, and `FooterLockButton` (`UIX/Menus/MenuRows.tsx:371`) behind `BoardLock.tsx:10`, `SettingsFrame.tsx:138`, and `PageMenu.tsx`'s placeholder (`Core/Pages/PageMenu.tsx:32-33`).

##### File History

- **Capture Is Tree-Keyed — Confirmed:** `Core/Pages/fileHistory.ts:89`, `:117`, `:136`, `:174`; snapshots key on `page_id` (`Desktop/Store/versionsDb.ts:8-15`).
- **The Sweep — Confirmed:** `sweepFileHistory` at `fileHistory.ts:194-203`; `DELETE FROM snapshots WHERE ts < ?` at `versionsDb.ts:71-73`; the port at `Core/Platform/stores.ts:89`; the open-time run at `Core/Nexus/handlers.ts:85-86`, before `readNexus` (`:88`) and the index seed (`:103`); the settings trigger at `Core/Settings/handlers.ts:46`. `HISTORY_DAYS` at `Core/Settings/personalization.ts:42`, `historyDays` at `:189`. JSON1 is already relied on (`json_extract` / `json_type`, `Desktop/Store/stores.ts:49`).
- **Archived Ids Before the Seed — Corrected:** the Investigation says the index "answers null before" the seed. `readIndexedStats` goes through `queried`, which gates on the store's presence only (`Core/Index/contentIndex.ts:50-58`, `:92-94`), unlike `queryPaths`' ready gate (`:60-62`); `markIndexReady` runs at the seed's end (`Core/Index/indexSeed.ts:253`). Before the seed it answers from the previous session's rows, and null only when no store opened. Moving the sweep after `seedContentIndex` is required for correctness (stale archive membership), not for null-avoidance.
- **The Settings Write Reaches the Renderer — Verified:** a host write to `settings.json` patches the held config through the settings-leaf event (`Core/Nexus/fileEvents.ts:502-510`, `:622-623`), which has no own-write short-circuit, unlike `tiles-leaf` (`:625`). A host-side switch-down of the archive timeframe therefore reaches the renderer's row.

##### Settings, Confirmations, and Notices

- **Settings — Confirmed, Ranges Corrected:** `SETTINGS` at `personalization.ts:136-225`; the Deletion section at `Core/Settings/frames.ts:582-604`; File History at `:605-631` (the Investigation's `:605-625` stops short of Clear History); the Trash frame at `:902-908` (not `:903-909`). The Permanently Delete Files hint is at `frames.ts:595` (Scout E's `:596` is off by one). It claims to govern deleted files generally, while `permanentDelete` is read only by `emptyBundle` (`Core/Trash/spend.ts:66-90`) and `askEmptyTrash` (`Core/Interface/Confirm/confirmations.ts:162-173`), matching `.claude/Features/ConfigurationPM.md:116`.
- **The Stepped Picker — Confirmed, Extended:** `ZoomRow` at `Core/Settings/SettingsWindow.tsx:255-266`; `PickerOption` at `UIX/Pickers/PickerControl.tsx:10-14`, no disabled state; the typed clamp at `:62-65`. Both menu renderers already honor a disabled row (`Core/Actions/menuModel.ts:6`; native at `Desktop/Actions/menu.ts:24`; `Core/Interface/Menus/MenuPresenter.tsx:44`), so the dimmed option is a passthrough, missing only from `MenuDoor`'s row type (`PickerControl.tsx:16-20`) and the rows map (`:103-108`). `ZoomRow` hands `settingOf`'s answer straight to `steppedPickerProps`, so an optional key reaches it as `undefined` unless the row resolves it.
- **The Optional-Key Precedent — Confirmed, Extended:** `trashColumnStyle: setting(columnStyle)` at `personalization.ts:197` (no fallback), resolved at `Core/Settings/TrashFrame.tsx:65-69`. The precedent also clears a pick equal to the inherited value (`storedPick`, `Core/Properties/columnStyles.ts:123-131`), which bears on *§Questions for Nathan* 3.
- **Confirmations — Confirmed:** `ALWAYS_ASKS` at `confirmations.ts:29-34`; `waived` at `:36-38`; `armed` / `spendBundle` at `:40-46`; `notifyTrashed` at `:49-65`; `confirmDelete` at `:67-89`. `notifyDeleted` fixes the verb (`Core/Interface/Notifications/notifications.ts:84-101`) around `notifyUndoable` (`:106-137`), which pushes the one-shot revert onto the chord (`Core/Session/undo.ts:15-21`). A `positive` tone draws the action tinted (`Core/Interface/Confirm/ConfirmationWindow.tsx:50`).
- **The Notice Stalls Near the Pointer — Confirmed:** the drain at `Core/Interface/Notifications/NotificationLabel.tsx:33-52`, `trackNear` at `:60-74`, `nearRef` reset on post at `:29`. `trackNear` reports only on a move (`UIX/Interactions/hoverReveal.ts:204-212`); there is no "where is the pointer now" query, which shapes K-3.
- **The Notice's Mount and Chrome — Confirmed:** mounted once after every window (`Core/Interface/App.tsx:198`), fixed top-right at `stack.top.interrupt` (`notification-label.css.ts:11-28`); `NotificationLabel` is imported only by `App.tsx:21` and its test, while `notifications.ts`'s writers have 38 importers.

##### The Two Transforms and the Restore Tint

- **The Code Block's Copy → Copied — Confirmed, Sharpened:** `COPIED_MS = 1000` at `decorations.ts:208`; the press at `:281-292`. Three parts move: the glyph slot's copy glyph cross-fades to the check (`markdown-pm.css:1011-1017`), the tally pill's counts cross-fade to "Copied" laid over the pill's start (`:1028-1054`), and the bare name swaps its text instantly (`decorations.ts:286`), reflowing the right-anchored tag. The fades ride `--reveal-fade`, set to `--duration-slow` for the tag (`markdown-pm.css:958`).
- **Settings' Clear → Cleared — Confirmed, Widened:** `useTimedLabel` (`Core/Settings/useTimedLabel.ts:3-14`, 1500 ms) swaps a Button's label text with no fade. It has two callers, not one: `ClearActionRow.tsx:14` (Clear → Cleared, Clear History and Clear Exclusion Cache) and `NexusRows.tsx:59`, `:211-216` (Sync Now → Synced).
- **The Restore Tint — Clarified:** the File History Restore wears `type="filled"` (`PageHistoryWindow.tsx:207-219`), which is `--fill-secondary` under `--label-primary` ink (`UIX/Buttons/button-base.css.ts:184-190`), a neutral fill rather than an accent tint. `.claude/Features/PommoraUIX.md:229` lists Filled as `--fill-tertiary`, which is drift.
- **The Batch Count — Corrected:** `countPhrase` (`TrashFrame.tsx:36-50`) answers lowercase kinds ("2 pages", "1 set"), while its mixed branch answers `itemCount`'s Title Case "2 Items" (`Core/Properties/properties.ts:263`); `TrashFrame.test.tsx:66-83` pins both. The log's "3 Pages", "2 Sets", "5 Items" (G-6) describes a casing the Trash doesn't produce today.

---

#### Planner's Calls

##### 1. G-7: ActionLabel's Shape

**Recommendation:** option (c). `NotificationLabel` becomes **ActionLabel**, the frame's one top-right label: it shows a posted notice when there is one, otherwise the bar the shown surface has declared, otherwise nothing. The transform is that label cross-fading its content from the bar face to the notice face inside one standing chrome; pressing Restore runs the batch and posts `notifyUndoable("Restored 3 Pages", undo)`, the notice takes the face, drains on `DWELL_MS` with Undo like every notice, and the bar returns if rows are still checked.

- **Files:** `Core/Interface/Notifications/NotificationLabel.tsx` → `ActionLabel.tsx`; `notification-label.css.ts` → `action-label.css.ts`; `NotificationLabel.test.tsx` → `ActionLabel.test.tsx`; `App.tsx:21`, `:198` follow. `notifications.ts` keeps its name and its writers, which post notices and stay notices; it gains the bar's channel. The folder stays `Notifications/`, since its bulk is the notice API and a folder rename would touch 38 importers for nothing.
- **The Slot:** unchanged, App-level at `App.tsx:198`, which already clears every containing-block hazard (`.is-parked`, `slideIn`, glass).
- **The Declare Channel:** store-free, shaped like the notice's, with the parked rule `usePublishCount` already states (`Core/Interface/Subfield/publish.ts:7-15`):

```ts
export interface ActionBar {
  count: string
  restore: () => void
  remove: () => void
}

const declared = channel<ActionBar | null>(null)

export const useActionBar = (): ActionBar | null =>
  useSyncExternalStore(declared.subscribe, declared.get)

/** The shown content view lends the label its batch actions while it holds checked rows; parked or unmounted, it takes them back. */
export function useDeclareActions(bar: ActionBar | null): void {
  const host = useContentHost()
  const shown = host !== null && !host.parked
  useEffect(() => {
    if (!shown || !bar) return
    declared.set(bar)
    return () => declared.set(null)
  }, [shown, bar])
}
```

The declarer memoizes `bar` on its count and its two runners (`useMemo`), or the effect re-declares on every render of the view. Cleanups run before setups within one commit, so a tab switch (one host parking as another unparks) clears and re-declares in order with no ownership check.

- **Yield and Return:** `open = shown || bar !== null`; the face is `shown ? notice : bar`, held through the chrome's exit with `useHeld(face, open)` so a closing label paints its last face rather than the other one. The drain and `trackNear` effects are already gated on `note` (`NotificationLabel.tsx:33-74`), so no effect branches on mode. A notice posted while the bar stands takes the face for its dwell; the bar returns when it ends.
- **The Bar Face:** the notice's own `s.row` and `s.message`, with `Segments` (`UIX/Elements/Segments.tsx:4-16`) drawing `[Restore | 3 Pages]` exactly as it draws `Deleted “Ideas” | 2 Internal Links`, and the trailing Delete where the notice's action sits:

```tsx
<div className={s.row}>
  <span className={s.message}>
    <Segments parts={[<Button type="filled" size="button-inline" label="Restore" onClick={bar.restore} />, bar.count]} />
  </span>
  <Button type="destructive" size="button-inline" icon="trash" iconSize="body" title="Delete" onClick={bar.remove} />
</div>
```

- **Hover and Reveal:** ActionLabel adds no hover or reveal code. The bar's buttons carry `Button`'s own hover, the chrome keeps `paneSlide`, the notice face keeps `trackNear` / `withinBox`, and the cross-fade is the shared `Swap` (Call 2). `role` follows the face: `toolbar` for the bar, `status` / `alert` for a notice.
- **The Count:** the declarer passes `countPhrase(checkedInView)` (Title Case per *§Removal & Consolidation*); the runner posts `Restored ${countPhrase(done)}` / `Deleted ${countPhrase(done)}` through `notifyUndoable`. A delete under system Trash Mode mints no bundle and posts without Undo, as `notifyTrashed` already rules (`confirmations.ts:48`).

**Evidence:** the transformed label is exactly what `notifyUndoable` posts (`notifications.ts:106-137`): a message, Undo, the chord, and the dwell. The bar has to yield to notices anyway (Scout D › *Batch Actions*), so one slot already has two contents; drawing them in one chrome is what makes a "transform" possible at all, since two fixed boxes at one position can only slide past each other.

**Alternatives:**
- **(a) Its Own Component With Hoisted Chrome:** two components own one screen position, each with its own `paneSlide`, and the "transform" degrades to one box sliding out as another slides in, with a width jump between them. It also needs a yield rule in a second component reading `useNotification`. Loses on One Way and on the transform itself; about +70.
- **(b) Folded Into `NotificationLabel` as a Mode:** the same code as (c), keeping a name that describes half of what the surface shows, while the log's own term ActionLabel would map to no file. Loses on Less to Understand only; ±0 against (c).

**Cost:** `ActionLabel.tsx` +20 (bar face 12, face and open logic 5, `Swap` wrap 3), `action-label.css.ts` +2 (face rows stretch across the label), the channel +14 in `notifications.ts`, K-3 +2. About **+38**, against the Investigation's ~70.

##### 2. One Transform

**Recommendation:** the shared transform is a **face swap** plus, for the acknowledgement uses only, **one hold**.

- **The Face Swap:** `glyphSwap` / `glyphSwapFace` (`UIX/Symbols/symbols.css.ts:5-11`) already is the primitive: two faces stacked in one grid cell, the hidden one at opacity 0 over `duration.fast`. It moves to `UIX/Animations/swap.css.ts` beside `Reveal`, gains `pointer-events: none` on the hidden face, and gets a React wrapper `UIX/Animations/Swap.tsx` (`<Swap faces={[a, b]} shown={i} />`) whose hidden face is `aria-hidden` and `inert`. The cell sizes to the larger face, so a box never jumps.
- **The Hold:** `DONE_MS` (one `// KNOB` in `UIX/Animations/motion.ts`) replaces `COPIED_MS` (`decorations.ts:208`) and `ACTIVE_MS` (`useTimedLabel.ts:3`). The notice's `DWELL_MS` (`notification-label.css.ts:8`) is a countdown, not an acknowledgement, and stays its own.
- **Consumers:**
  - **LockGlyph:** drawn through `Swap` (`UIX/Symbols/index.tsx:263-286`), its two faces unchanged.
  - **Settings:** `useTimedLabel` moves to `UIX/Animations/useTimedLabel.tsx` and returns a `Swap` label, so `ClearActionRow.tsx:14` and `NexusRows.tsx:59` don't change; Clear → Cleared and Sync Now → Synced cross-fade where they jump today.
  - **ActionLabel:** bar face ↔ notice face (Call 1), with no hold.
  - **The Code Block:** the tally pill's two faces take the swap classes, `copy()` toggles `data-face` instead of `.is-copied` driving them, and its hand-rolled overlay leaves (`markdown-pm.css:1039-1054`). The counts face is always wider than "Copied", since it holds at least the net, a divider, and the add/del pair, so the pill's rest size doesn't change; "Copied" centers instead of sitting at the pill's start. The glyph slot keeps its own stack, because its copy glyph's opacity is the continuous `--reveal` rather than a binary face (`markdown-pm.css:1002-1004`, `:1058-1061`), and the bare name keeps its instant swap, because the right-anchored tag reflows to the word, so the word can't fade over a narrower name; the CSS comment at `markdown-pm.css:1028` names both exceptions where a reader meets them.

**Callers Today:**

| Transform | Caller | Timing |
| --- | --- | --- |
| `.is-copied` | `CodeTagWidget.toDOM`'s `copy` (`decorations.ts:281-292`), glyph slot, name, tally pill | 1000 ms hold, `--duration-slow` fades |
| `useTimedLabel` | `ClearActionRow.tsx:14` (Clear History, Clear Exclusion Cache, via `SettingsWindow.tsx:195`) | 1500 ms, no fade |
| `useTimedLabel` | `NexusRows.tsx:59` (Sync Now → Synced) | 1500 ms, no fade |
| `glyphSwap` | `LockGlyph` (six surfaces) | `duration.fast` fade |

**Evidence:** the glyph swap and the pill are both two stacked faces cross-fading in place; Settings has no fade at all, so "the same animation" (G-6) can only be the cross-fade.

**Alternatives:**
- **A Hook Alone:** can't reach the code block, whose widget is plain DOM (`decorations.ts:260-299`).
- **A Host `is-done` Class:** generalizes `.is-copied`, but every consumer still hand-writes its face opacities; it moves the duplication rather than removing it.
- **Converting the Name and Glyph Slot Too:** would widen every short language tag at rest to "Copied"'s width, or fight the reveal variable; the visible cost outweighs a cleaner diff.

**Cost:** `Swap.tsx` +18 (keyed faces, `data-face`, `aria-hidden`, `inert`), `swap.css.ts` +9, `symbols.css.ts` −7, `LockGlyph` −10, `DONE_MS` +1, the two old constants −2, `useTimedLabel`'s `Swap` return +1 (the move itself ±0), the pill CSS −12 and its toggle +2. About **±0**: a wash that leaves one face-swap implementation where three hand-rolled stacks stood, and gives Settings the cross-fade it lacks.

##### 3. K-3: A Notice Posted Under the Pointer

**Recommendation:** the notice stays unarmed until a `far` or `out` report arrives after it posts. Since `trackNear` reports only on moves and nothing can ask where the pointer stands, the rule is exactly "unarmed until the pointer has been seen outside the band once."

```ts
useEffect(() => {
  const host = hostRef.current
  if (!note || !shown || !host) return
  let armed = false
  return trackNear({
    anchor: host,
    measure: () => {
      const box = host.getBoundingClientRect()
      return (x, y) => withinBox(box, x, y, s.NEAR_RADIUS)
    },
    report: (at) => {
      if (at === 'far' || at === 'out') armed = true
      if (at !== 'held') nearRef.current = armed && at === 'near'
    },
  }).stop
}, [note, shown])
```

**Evidence:** `NotificationLabel.tsx:60-74`; the effect re-runs per note (`[note, shown]`), so `armed` resets with each post, as `nearRef` does at `:29`. A press reports `held` (`hoverReveal.ts:205-208`), which leaves `nearRef` alone, so the press that posts the notice never stalls it.

**Behavior Widening:** a pointer whose first reported move after a post is already inside the band drains through until it leaves once, whether it got there by the press that posted the notice or was resting near from earlier. That's wider than the log's wording; see *§Questions for Nathan* 6.

**Alternatives:** a window-wide pointer tracker answering the position at post time would be exact, but it's a standing high-frequency listener for one edge, which the Working Rules' cost rule refuses.

**Cost:** **+2** (one line changed), plus the comment at `:60` gaining one clause.

##### 4. H-1: The Reader Window

**Recommendation:** one window, `Core/Interface/Windows/PageReaderWindow.tsx` (renamed from `PageHistoryWindow.tsx`), over a typed slot:

```ts
export type Reader =
  | { kind: 'history'; page: PageTarget }
  | { kind: 'archive'; page: PageTarget; trail: TrailSegment[] }
```

with `reader: Reader | null`, `openReader(reader)`, and `closeReader()` replacing `historyTarget` / `openHistory` / `closeHistory` (`windowSlice.ts:30-32`, `:142-143`). The archive slot holds the trail its opener already drew, the origin's crumbs plus the page's own segment, so the window titles both branches the same way (`trailOf` answers the entity's ancestry including itself) and `Core/Session` takes no import from `Core/Trash`. `TrailSegment` is a UIX type (`UIX/Elements/NavTrail.tsx:9-15`), and session slices already import UIX types (`Core/Session/glanceSlice.ts:1`).

- **The Shape:** one shared shell in the file (presence, `WindowBase` with geometry, the lock as `lead`, the inert editor host, the read-only `MarkdownEditor` with the sentinel ancestor, the `Scrollbar`, and the title `NavTrail`) and two thin branches. **History** is today's body: the snapshot panel as `right`, Current Version or a snapshot as the body, `trailOf` as the title. **Archive** passes no `right`, reads its body with `dialer().ask('page:open', page.path)`, titles itself with the slot's `trail`, which ArchiveView builds through the crumb mapping the shared browser hoists from `TrashFrame.tsx:298-301`, and closes itself through the Archive's change signal. Both read uncached: the History branch's `fetchPageDetail` (`:106`) becomes the same direct ask.
- **The Reconcile `switch`:**

```ts
const reader = get().reader
switch (reader?.kind) {
  case 'history': {
    const r = reconcileWith(index, reader.page)
    if (r !== reader.page) set({ reader: r.kind === 'page' ? { kind: 'history', page: r } : null })
    break
  }
  case 'archive':
  case undefined:
    break
}
```

The `archive` arm is a no-op on tree change: an archived page isn't in the tree, and re-keying it by path would aim it at a live page.
- **Closing the Archive Branch:** the body subscribes to the Archive's change signal (the shared successor of `trashChanged`, `Core/Session/nexusSlice.ts:71`, `:248-249`, which ArchiveView needs for its own refresh) and re-asks `page:open` on each emit, closing on a refusal. A restore, a delete from the Archive, and an archive's Undo all move the file and emit; an archive of some other item re-reads the same file and changes nothing. This is the `TrashFrame.tsx:91-94` pattern, and it follows exactly what ArchiveView follows: a change arriving by sync leaves the reader standing, as it leaves ArchiveView's list.
- **One Remembered Size:** both branches share one window id, renamed `'page-history'` → `'page-reader'` (`PageHistoryWindow.tsx:63`). The snapshot panel is an overlay (`mode: 'overlay'`, `:235-241`), so it doesn't change the window's rect. The rename resets the size once per machine and leaves the old entry unread in `devicePrefs.windows`. H-1's "unremembered" reads as never reopened after relaunch, as the History window already isn't (`windowSlice.ts:129-136`); a remembered size is every window's.
- **A Cascade Rewriting an Open Archived Page:** no re-read. The window is read-only, so a stale body can't be written back; reopening reads fresh; the History branch's Current Version already behaves this way (it re-reads only after its own restore, `:130`).
- **Restore in the Toolbar:** left out. ArchiveView's right-click and ActionLabel both offer it; a third Restore would need the record handle in the slot, the runner reachable from a window, and its own close, and it's a second way to do one thing.
- **The Lock:** `lead={<Icon name="locked" size="body" />}` in a non-interactive span sized to the inline button box, titled "Read Only", in both branches, with no `onScan`. It's the face `LockGlyph` shows when locked, so the glyph keeps one meaning.
- **Renames:** `HISTORY_ANCESTOR = 'page-history'` → `READER_ANCESTOR = 'page-reader'` (`:36`); `.page-history-page` → `.page-reader-page` (`page-window.css:31`, `:34`; `markdown-pm.css:72`); `.page-history-row` and `'page-history-list'` stay, since they name the History panel alone. `ariaLabel` follows the kind: "File History" / "Archived Page".
- **Slice Edits:** `windowsOpen` reads `s.reader !== null` (`:66`); `CLOSED` holds `reader: null` (`:73`); `PER_NEXUS` spreads it unchanged. `title:history` becomes `s.openReader({ kind: 'history', page: ref })` (`Core/Interface/Menus/pageMenuActions.ts:63-65`); `App.tsx:16`, `:191` follow the rename.

**Evidence:** *§Verified at HEAD › Windows*; `WindowBase.tsx:243-254`; `PageHistoryWindow.tsx:100-116`, `:223-258`.

**Alternatives:**
- **Shared Hook, Two Windows (Scout E's B):** a second slot, opener pair, mount, and `windowsOpen` term, and two windows open at once against "single-state." About +70 to +90.
- **A Mode of `PageWindow`:** rejected by H-1, confirmed by Scout E with evidence.
- **Closing on Tree Entry:** the reconcile's archive arm closing once `index.pages.has(page.id)` covers restores by any route, including sync, but not a delete from the Archive, so it needs the signal anyway: two rules for one event.

**Cost:** slice +8 (the `Reader` type 4, the `switch` 4), window +28 (shell split 6, archive branch 18, lock 4), lock alignment CSS +3, one import −1. About **+38**.

##### 5. J-1: The Archive History Timeframe

**Recommendation:**

- **The Key:** `archiveHistoryDays: setting(numberCheck(HISTORY_DAYS, true), undefined, HISTORY_DAYS)` in `SETTINGS`: optional, no fallback, carrying the range so the row and the clamp read it.
- **The One Follow Rule:** one helper in `personalization.ts`, stated once and read by both sides:

```ts
/** A stepped key that follows another until it's picked. */
export const settingWithin = (p: Personalization, key: SteppedKey, within: SteppedKey): number =>
  settingOf(p, key) ?? settingOf(p, within)
```

The host's `readFileHistoryConfig` (`Core/Settings/settings.ts:64-73`) gains `archiveKeepMs: settingWithin(p, 'archiveHistoryDays', 'historyDays') * DAY_MS`; the row reads it through `useRowValue`.
- **The Row:** directly under History Timeframe (`frames.ts:614-619`), `{ kind: 'zoom', key: 'archiveHistoryDays', label: 'Archive History Timeframe', hint, unit: DAYS, within: 'historyDays' }`. `ZoomSpec` (`frames.ts:85-87`) gains `within?: SteppedKey`. `useRowValue` (`SettingsWindow.tsx:226-244`) reads `settingWithin(p, row.key, row.within)` when the row names a bound, in place of `settingOf` (`:235`), so the row shows History Timeframe's value while unset without restating the rule; `ZoomRow` (`:255-266`) caps the range at the bound key's value:

```ts
const ceiling = useSession((s) => row.within && settingOf(personalizationOf(s), row.within))
...steppedPickerProps({ range: ceiling ? { ...range, max: ceiling } : range, value, unit, onPick: set })
```

A pick always stores: `setPersonalization` drops a value equal to `SETTING_DEFAULTS[key]` (`Core/Session/configSlice.ts:66-67`), which is `undefined` for this key.

- **The Dimmed Step:** `PickerOption` gains `disabled?: boolean`; `MenuDoor`'s rows and the rows map carry it; `steppedPickerProps` marks `disabled: f > range.max`. The capped `range.max` also clamps the typed entry (`PickerControl.tsx:64`) with no new code, and no existing caller has a step above its own `max` (`UIX/Utilities/clamp.ts:6-10`).
- **The Switch-Down:** inside `writePersonalization`'s updater (`settings.ts:130-135`), so it lands in the same locked write: after setting the key, a picked `archiveHistoryDays` above the resulting `historyDays` is written down to it. It covers a History Timeframe shortened below a picked step and any archive write that would exceed it. An unset `historyDays` means 90, the top step, so it never lowers anything.
- **The Sweep:** after the seed, `void sweepFileHistory(root)` moves from `Core/Nexus/handlers.ts:86` to after `:103`. The trigger reads `key === 'historyDays' || key === 'archiveHistoryDays'` (`Core/Settings/handlers.ts:46`).

```ts
export async function sweepFileHistory(root: string): Promise<void> {
  try {
    const { keepMs, archiveKeepMs } = await readFileHistoryConfig(root)
    const now = Date.now()
    const ids = [...(readIndexedStats(ARCHIVE_ROOT)?.values() ?? [])].flatMap((s) =>
      s.id && !idHeld(root, s.id) ? [s.id] : [],
    )
    snapshotStore()?.sweepSnapshots(now - keepMs, { ids, cutoffMs: now - archiveKeepMs })
    captureStore()?.sweepCaptures(now - keepMs)
  } catch (e) {
    console.error('file history: the sweep failed:', errText(e))
  }
}
```

```ts
sweepSnapshots(cutoffMs, archived) {
  return removed(
    db
      .prepare('DELETE FROM snapshots WHERE ts < ? OR (ts < ? AND page_id IN (SELECT value FROM json_each(?)))')
      .run(cutoffMs, archived.cutoffMs, JSON.stringify(archived.ids)),
  )
},
```

`ARCHIVE_ROOT` is the location resolver's archive root (the Investigation's `ARCHIVE_DIR_REL`; the location lane names it). The port's signature (`Core/Platform/stores.ts:89`) takes `archived` as required: with no store, `ids` is empty and the second branch matches nothing. Captures stay on the live cutoff. The hub's `history_days` is unrelated (F-013).

**Evidence:** `stepped` is `setting(numberCheck(range, true), range.default, range)` (`personalization.ts:115-116`), and `setting` admits an absent fallback (`:89-101`); `steppedPickerProps` at `PickerControl.tsx:36-68`; `personalization:set` at `Core/Settings/handlers.ts:42-48`; *§Verified at HEAD › File History*.

**Alternatives:**
- **Read-Side `min(historyDays, archiveHistoryDays)` Alone:** a pick of 30, shortened to 14, then lengthened to 60, pops back to 30, which J-1 forbids; the stored value has to move.
- **The Switch-Down as a Second Write in the Handler:** works, but reads the live personalization right after writing it and lands as two writes; the updater does it in one.
- **A `within` Declared on the `SETTINGS` Entry, Resolved by `settingOf`:** states the pairing exactly once, but `SettingValue` would type the key as possibly undefined while `settingOf` never answers undefined, and it's general machinery for one key.
- **A Trim at Archive Time, or a Class Column in `versions.db`:** wrong over time and across devices, and a second truth that drifts (Scout E's B and C).

**Cost:** key +1, `settingWithin` +2, config +2, sweep +3, store SQL +1, the write bound +4, picker +3, `ZoomSpec` +1, `useRowValue` +1, `ZoomRow` +2, the row +7, moved trigger ±0. About **+27**. `Core/Testing/memoryStores.ts:232-237` follows (test fixture).

##### 6. I-2, I-3: Settings, Confirmation, and the Undo

**Recommendation:**

- **Settings:** the section at `frames.ts:583` is retitled "Trash & Archive", and a "Confirm Before Archiving" toggle (`confirmArchiving: flag(true)`) sits directly under Confirm Before Deletion. The Trash frame (`:902-908`) stays the Trash's.
- **One Predicate:** `waived(key: 'confirmDeletion' | 'confirmArchiving', kind?: HeldKind)`. `confirmDelete` calls `waived('confirmDeletion', kind)`, `askRemoveTile` calls `waived('confirmDeletion')` (`confirmations.ts:92`), and `confirmArchive` calls `waived('confirmArchiving')` with no kind, so `ALWAYS_ASKS` never reaches an archive, which is what I-2 wants for Sets.
- **One Spend:** `spendBundle` → `spendUndo(key)` over the same `armed` map; the Trash keys it by bundle path (`TrashFrame.tsx:100`, `:121`), the Archive by its record's path, and ArchiveView spends it after its own restore or delete.
- **`confirmArchive`:** its own export beside `confirmDelete`, sharing `ask`, `waived`, and `armed` but not the body. The two differ in their question, in the delete's Trash-Mode round trip (`:73`), in their op, and in their notice, so a parameterized body would branch on every line it shares.

```ts
export const confirmArchive = async (target: { path: string; kind: 'page' | 'set'; title: string }): Promise<void> => {
  if (!waived('confirmArchiving')) {
    const yes = await ask({
      message: `Archive “${target.title}”?`,
      detail: 'It will be moved to its Collection’s Archive, where it can be restored.',
      action: 'Archive',
      tone: 'positive',
    })
    if (!yes) return
  }
  const done = await useSession.getState().mutate({ op: 'archive', path: target.path, kind: target.kind })
  if (!done?.archived) return
  const key = done.archived.bundlePath
  armed.set(key, notifyUndoable(`Archived “${target.title}”`, async () => {
    spendUndo(key)
    await useSession.getState().mutate({ op: 'unarchive', bundlePath: key })
  }))
}
```

The op names and the outcome's `archived` field belong to the Archive domain's lane; the shape here is what this lane needs from them. I-3 holds by construction: the notice posts whatever the switch says.
- **K-5:** the Permanently Delete Files hint (`frames.ts:595`) is rewritten to match `askEmptyTrash` and ConfigurationPM (*§Copy*).

**Evidence:** *§Verified at HEAD › Settings, Confirmations, and Notices*.

**Alternatives:**
- **`confirmDelete`'s Body Parameterized by `{ key, request, op, notify }`:** saves about three lines and costs a reader the indirection on the app's most-used confirmation.
- **Archiving a Set Always Asks:** set aside by I-2.
- **`notifyDeleted` Generalized to Take a Verb:** archiving strips nothing (D-1), so it would parameterize a verb and a segment for one caller.

**Cost:** the row +6, the key +1, `waived` +1, `confirmArchive` +16, renames ±0. About **+24**.

##### 7. Open Item 2: Copy

*§Copy* holds the proposals.

---

#### Removal & Consolidation

| What | Where | Change | Lines |
| --- | --- | --- | --- |
| `NotificationLabel` and its style and test | `Core/Interface/Notifications/NotificationLabel.tsx`, `notification-label.css.ts`, `NotificationLabel.test.tsx` | Renamed `ActionLabel`, `action-label.css.ts`, `ActionLabel.test.tsx`; the one top-right label, drawing a notice or the shown surface's bar | ±0 (renames) |
| The notice's arming | `NotificationLabel.tsx:60-74` | Unarmed until the pointer is seen outside the band once (K-3) | +2 |
| `glyphSwap` / `glyphSwapFace` | `UIX/Symbols/symbols.css.ts:5-11` | Moved to `UIX/Animations/swap.css.ts` as the one face swap | −7 / +9 |
| `LockGlyph`'s hand-stacked faces | `UIX/Symbols/index.tsx:263-286` | Drawn through `Swap` | −10 |
| `COPIED_MS`, `ACTIVE_MS` | `decorations.ts:208`; `useTimedLabel.ts:3` | One `DONE_MS` in `UIX/Animations/motion.ts` | −2 / +1 |
| `useTimedLabel` | `Core/Settings/useTimedLabel.ts` | Moved to `UIX/Animations/useTimedLabel.tsx`, returning a `Swap` label | +1 |
| The tally pill's hand-rolled overlay | `markdown-pm.css:1039-1054`; `decorations.ts:230`, `:285-290` | The pill's faces take the swap classes; `copy()` toggles `data-face` | −12 / +2 |
| `historyTarget`, `openHistory`, `closeHistory` | `windowSlice.ts:30-32`, `:142-143`, `:279-281` | One typed `reader` slot reconciled by a `switch` on kind | +8 |
| `PageHistoryWindow.tsx` | `Core/Interface/Windows/` | Renamed `PageReaderWindow.tsx`: a shared shell, History and Archive branches, the lock in both | +28 |
| `fetchPageDetail` for the Current Version | `PageHistoryWindow.tsx:18`, `:106` | A direct `page:open` in both branches | −1 |
| `HISTORY_ANCESTOR`, `.page-history-page`, `'page-history'` | `PageHistoryWindow.tsx:36`, `:63`; `page-window.css:31`, `:34`; `markdown-pm.css:72` | `READER_ANCESTOR`, `.page-reader-page`, `'page-reader'` | ±0 |
| `sweepSnapshots(cutoff)` and the open-time sweep | `versionsDb.ts:71-73`; `stores.ts:89`; `fileHistory.ts:194-203`; `Core/Nexus/handlers.ts:86` | One statement with both cutoffs, archived ids from the index, run after the seed | +5 |
| The `personalization:set` trigger | `Core/Settings/handlers.ts:46` | Also fires on `archiveHistoryDays` | ±0 |
| `writePersonalization` | `settings.ts:130-135` | Lowers a picked archive timeframe in the same write | +4 |
| `PickerOption`, `MenuDoor`'s rows, `steppedPickerProps` | `PickerControl.tsx:10-20`, `:52-58`, `:103-108` | A disabled option, steps above `range.max` dimmed | +3 |
| `ZoomSpec`, `useRowValue`, `ZoomRow` | `frames.ts:85-87`; `SettingsWindow.tsx:226-244`, `:255-266` | A row bounded by and following another stepped key, read through one `settingWithin` | +6 |
| `waived(kind?)` | `confirmations.ts:36-38` | `waived(key, kind?)` | +1 |
| `spendBundle` | `confirmations.ts:43-46`; `TrashFrame.tsx:15`, `:100`, `:121` | `spendUndo(key)` | ±0 |
| `countPhrase`'s lowercase kinds (Take Along) | `TrashFrame.tsx:36-50` | Title Case nouns, matching `itemCount` and the log | ±0 |
| The Permanently Delete Files hint (K-5) | `frames.ts:595` | Rewritten to what the setting does | ±0 |
| The Confirm Before Deletion hint (Take Along) | `frames.ts:589` | Names Contexts and Spaces, which `ALWAYS_ASKS` already asks for (`confirmations.ts:29-34`) | ±0 |
| `confirmDelete`'s "system Trash" (Take Along) | `confirmations.ts:78` | "system trash", as `askEmptyTrash` (`:168`) and the hints write it | ±0 |
| Filled's fill in the UIX doc (Take Along) | `.claude/Features/PommoraUIX.md:229` | `--fill-secondary`, as `button-base.css.ts:186` | docs |

**Net for this lane:** about **+127** source lines (Call 1 +38, Call 2 ±0, Call 4 +38, Call 5 +27, Call 6 +24), against the Investigation's ~150 for the same rows. The positive part is required behavior: the bar, the archive branch, the second cutoff, and the archive confirmation. The face swap is a wash in lines that leaves one implementation where three hand-rolled stacks stood.

---

#### New Surface

- **`UIX/Animations/Swap.tsx`** (~18 lines, new) and **`UIX/Animations/swap.css.ts`** (~9, moved from `UIX/Symbols/symbols.css.ts`): the one face swap. `UIX/Animations/` sits beside `Reveal`, since it's a motion primitive used by Symbols, Settings, the label, and the code block.
- **`UIX/Animations/useTimedLabel.tsx`** (moved from `Core/Settings/useTimedLabel.ts`, ~16): the acknowledgement hold over `DONE_MS`.
- **ActionLabel — `Core/Interface/Notifications/ActionLabel.tsx`** (renamed from `NotificationLabel.tsx`, +20), **`action-label.css.ts`** (renamed, +2), **`ActionLabel.test.tsx`** (renamed). The bar's channel and `useDeclareActions` live in **`Core/Interface/Notifications/notifications.ts`** (+14), beside the notice channel, so the label's two inputs share one module. ArchiveView is the one declarer; the Trash's look stays untouched (A-3).
- **`Core/Interface/Windows/PageReaderWindow.tsx`** (renamed from `PageHistoryWindow.tsx`, +28) and the `Reader` type in **`Core/Session/windowSlice.ts`** (+8).
- **`confirmArchive`** in **`Core/Interface/Confirm/confirmations.ts`** (+16), where every question's copy lives.
- **Settings keys:** `archiveHistoryDays` and `confirmArchiving` in `personalization.ts`; two rows in `frames.ts`; `settingWithin` in `personalization.ts`.

No other new file.

---

#### Reusable

- **The Notice and the Undo:** `notifyUndoable` with the chord and the dwell (`notifications.ts:106-137`), for the archive notice and both transformed labels.
- **The Store-Free Channel:** `channel` (`UIX/Utilities/subscribable.ts:27-39`), as the notice uses (`notifications.ts:20-25`).
- **The Shown-Host Rule:** `useContentHost()?.parked` and `usePublishCount`'s declare-and-clear (`Core/Interface/Subfield/publish.ts:7-15`), for the declare hook.
- **The Label's Parts:** `paneSlide`, `useHeld`, `ProgressBar`, `Segments`, `s.row` / `s.message`, `trackNear` / `withinBox`; `Button type="filled"` (the History Restore's look) and `type="destructive"` with `icon="trash"`.
- **The Face Swap:** `glyphSwap`'s stack, generalized.
- **The Read-Only Window:** `useHeldPresence`, `useWindowGeometry`, `WindowBase`'s `lead` slot, `useConnections('inert')`, `useEditorHost({ inert: true })`, `MarkdownEditor readOnly`, the sentinel ancestor, all already in `PageHistoryWindow.tsx`.
- **The Uncached Read:** `dialer().ask('page:open', path)`.
- **The Crumb Mapping:** `TrashFrame.tsx:298-301`, once the shared browser hoists it, for the archive branch's title.
- **The Change Signal:** `trashChanged`'s pattern (`nexusSlice.ts:71`, `TrashFrame.tsx:91-94`), for closing the archive branch.
- **The Disabled Row:** `ActionItem.disabled`, honored natively and by `MenuPresenter`.
- **The Index's Ids and the Twin Test:** `readIndexedStats(prefix)` (`Desktop/Store/stores.ts:180-187`) and `idHeld` (`Core/Nexus/heldPages.ts:30-33`).
- **The Settings Builders:** `setting`, `numberCheck`, `settingOf`, `steppedPickerProps`.
- **The Counts:** `countPhrase`, `itemCount`.

---

#### Copy

Patterns followed: Title Case labels; hints as one present-tense sentence (`frames.ts:601`, `:612`, `:629`); questions as `Verb “Title”?` with a one-line detail (`confirmations.ts:75-79`); notices as `Verbed “Title”` with no period, a count behind a segment (`notifications.ts:90-91`); multi-sentence reports with periods (`TrashFrame.tsx:135-140`); curly quotes around titles.

##### Archive Confirmation

- **Message:** `Archive “Ideas”?`
- **Detail:** `It will be moved to its Collection’s Archive, where it can be restored.` — one detail for pages and Sets; a Set's contents go with it by definition.
- **Action:** `Archive`
- **Tone:** `positive` (drawn tinted), since archiving removes nothing; the default is the action, not Cancel.

##### Archive Notice

- `Archived “Ideas”` with **Undo**, no segment.

##### ActionLabel

- **The Bar:** `Restore | 3 Pages` with the trash button titled `Delete`.
- **Transformed:** `Restored 3 Pages`, `Deleted 3 Pages`, each with **Undo** and the countdown; `Restored 2 Sets`; `Restored 5 Items` for a mix. A batch of one names its title, `Restored “Ideas”`, as single notices do (*§Questions for Nathan* 4). A delete under system Trash Mode posts `Deleted 3 Pages` with no Undo.
- **Partial Outcome:** the Trash's report shape (`TrashFrame.tsx:132-140`), error-toned: `Restored 2 Pages. 1 Page couldn’t be restored.`; `Restored 2 Pages. 1 Page had nowhere to go — restore it on its own to choose where.`

##### Restore Stepping Aside (E-4)

- **One Item:** `Restored “Ideas” as “Ideas (2)”`
- **A Batch, One Renamed:** `Restored 3 Pages | “Ideas” as “Ideas (2)”`
- **A Batch, Several Renamed:** `Restored 3 Pages | 2 Renamed`
- The same lines serve the Trash's restore, since E-4 binds both.

##### Delete From the Archive

- **Message:** `Delete “Ideas”?`, or `Delete these 3 Pages?` for a batch.
- **Detail:** confirmDelete's Trash-Mode lines, plural for a batch: `They will be moved to the nexus’s .trash folder (recoverable).` / `They will be moved to the system trash.`

##### A Refusal

- Archive reached where it doesn't apply: `Only pages and Sets inside a Collection can be archived.`

##### Settings

- **Section:** `Trash & Archive` (was `Deletion`).
- **Confirm Before Deletion:** `Ask before deleting a page, a tile, or a folder that carries no schema; Collections, Sets, Contexts, Spaces, views, and properties always ask.` (Take Along: today's hint omits Contexts and Spaces.)
- **Confirm Before Archiving:** `Ask before archiving a page or a Set.`
- **Permanently Delete Files (K-5):** `Erase items emptied from the Trash instead of moving them to the system trash.`
- **Archive History Timeframe:** `How long archived pages keep their snapshots; it follows History Timeframe until set, and never exceeds it.`

##### Reader Window

- **Aria Labels:** `File History` / `Archived Page`.
- **The Lock's Title:** `Read Only`.

---

#### What Becomes False

##### Tests

- **`Core/Interface/Notifications/NotificationLabel.test.tsx`:** renamed `ActionLabel.test.tsx`; `describe('NotificationLabel')` (`:28`) renamed. In `describe('the drain near the pointer')`, `it('stalls within its band and drains once the pointer leaves it')` (`:76-83`) and `it('holds where it stands through a press')` (`:85-90`) both open with `move(400)`, inside the band, which no longer arms; each must move outside first. New cases: a notice posted under the pointer drains; a declared bar shows, yields to a notice, and returns; a parked declarer withdraws its bar.
- **`Core/Session/windowSlice.test.ts`:** `describe('reconcileWindow')` › `it('keeps the history window while the tree holds its page, and closes it once the page is gone')` (`:22-32`) and `describe('reconcileWindow — a page re-keyed at its path')` › `it('re-keys a window tab and the history target to the page now at their path')` (`:36-45`) move to the `reader` slot; new case: an archive reader survives a tree change.
- **`Core/Session/devicePrefsSeed.test.tsx:227`, `:242`:** `openHistory` / `historyTarget` become `openReader` / `reader`.
- **`Core/Settings/TrashFrame.test.tsx`:** `describe('countPhrase')` (`:66-83`): `'2 pages'`, `'2 sets'`, `'2 contexts'`, `'1 page'`, `'1 space'` flip to Title Case.
- **`Core/Settings/NexusRows.test.tsx:68-70`:** `button(label)` matches `textContent`, which reads both faces once the label is a `Swap` (`'Sync NowSynced'`), so `:179`, `:216-221`, and `:271` stop finding the button; the finder matches the shown face or the accessible name.
- **`Core/Testing/storesContract.ts`:** `it('sweeps snapshots older than a cutoff')` (`:354-365`) takes the new signature and gains an archived-id case; `Core/Testing/memoryStores.ts:232-237` follows.
- **`Core/Pages/fileHistory.test.ts`:** `describe('sweepFileHistory')` (`:365-385`) gains an archived page swept at the shorter cutoff and a live twin kept.
- **`Core/Settings/settings.test.ts`:** a `historyDays` write lowering a picked archive timeframe and leaving an unset one unset.
- **`Core/Settings/handlers.test.ts`:** the archive key triggers the sweep.
- **`Core/Interface/Confirm/confirmations.test.ts`:** `it('gives up its Undo and the chord once the Trash spends its bundle')` (`:184-191`) calls `spendBundle` (`:10`, `:187`); new cases for `confirmArchive` under each switch state, a Set archiving unasked with the switch off, and the notice posting either way.
- **`Core/MarkdownPM/codeDiff.test.tsx`:** `it('reads Copied when clicked, unless a tally takes the word')` (`:58-69`) holds if the widget keeps `.is-copied` on its host; a tally case asserts the pill's `data-face`.
- **`UIX/Pickers/PickerControl.typeable.test.tsx`:** `it('a left press opens the list through the door, marked on the current value')` (`:82-94`) gains `disabled` on the door rows; new case for a step above the cap.

##### Comments

- `Core/Interface/Notifications/NotificationLabel.tsx:60`: gains K-3's arming.
- `Core/Interface/Notifications/notifications.ts:1`: names the bar's channel beside the notice.
- `Core/Interface/Confirm/confirmations.ts:28`: `ALWAYS_ASKS` governs deletes; archiving asks under its own switch alone.
- `Core/Interface/Confirm/confirmations.ts:42`: the spend generalizes from bundles to any undone act.
- `Core/Interface/Windows/PageHistoryWindow.tsx:35`: "embeds inside a snapshot" becomes "embeds inside the reader."
- `Core/Interface/Windows/page-window.css:30`: "A snapshot is a record" becomes the read-only page.
- `Core/MarkdownPM/markdown-pm.css:1028`: the pill's cross-fade is the shared swap; the name and the glyph slot keep their own, with the reasons.

##### Docs

- `.claude/Features/InterfacePM.md:48`: "the History preview" becomes the reader window.
- `.claude/Features/InterfacePM.md:58`: "the Page History window" becomes the reader window; the count holds at seven.
- `.claude/Features/InterfacePM.md:80`: the notification's path becomes `ActionLabel.tsx`, the label gains the declared bar, "Deletion is the first act to use both" gains archiving, the Settings › Trash spend gains ArchiveView, and the drain gains K-3's arming.
- `.claude/Features/CorePM.md:114`, `:120`: `PageHistoryWindow.tsx` and its name.
- `.claude/Features/CorePM.md:118`, `:158`: the sweep runs after the seed with two cutoffs.
- `.claude/Features/ConfigurationPM.md:111-117`: Deletion becomes Trash & Archive with Confirm Before Archiving; `:115`'s description matches the rewritten hint.
- `.claude/Features/ConfigurationPM.md:124`: History Timeframe gains its archive sibling; `:126`'s "reads Cleared for a moment" holds, now as a cross-fade.
- `.claude/Features/PommoraUIX.md:203-217`: the Animations table gains `Swap` and `DONE_MS`; `:387`'s `LockGlyph` line names `Swap`; `:229`'s Filled fill.

---

#### Cautionary Items

- **The Swap's Hidden Face Is `inert` and `aria-hidden`, With `pointer-events: none` in Its Class:** two faces share one grid cell, so without it the invisible bar's buttons under a notice would still take clicks and focus, and a Button's accessible name would read both words.
- **The Declare Hook Clears on Park and Unmount:** ArchiveView stays mounted while parked (`ContentView.tsx:181`), so a bar declared there would otherwise stand over another tab's view.
- **The Face Is Held Through the Chrome's Exit:** without `useHeld(face, open)`, a label closing after its notice would cross-fade to an empty or stale bar face on the way out.
- **The Archive Reader Closes When Its File Is Gone After a Change Signal:** a restore or a delete from ArchiveView while the reader shows that item would otherwise leave a window describing a page that's no longer archived.
- **The Sweep Skips Archived Ids the Live Tree Also Holds (`idHeld`):** a page duplicated in Finder carries its original's `ID`, and twins are a recognized state (`heldPages.ts:8-13`); archiving one twin would otherwise sweep the live twin's shared-keyed history at the archive cutoff. It's inline in the `flatMap`, with no new function.
- **The Switch-Down in the Write:** J-1's rule that a shortened History Timeframe pulls a picked archive step down with it, held in the one locked write so the two values never disagree on disk.
- **K-3's Arming:** the press that posts a notice leaves the pointer inside `NEAR_RADIUS`.
- **The Typed Entry's Clamp:** rides the capped `range.max`; J-1 requires the archive timeframe never exceed History Timeframe.

No guard is recommended for a stored archive value above History Timeframe from a hand edit: the sweep's `ts < live OR …` statement already bounds it.

---

#### Contradictions

None stops the process. Two INFERRED premises in the log don't hold in the code, and each goes to *§Questions for Nathan* under the Working Rules' *Intent Over Wording*:

- **G-6's Count Casing:** "as the Trash's batches do ('3 Pages', '2 Sets', '5 Items')" — the Trash writes "3 pages" and "2 sets" (`TrashFrame.tsx:36-50`). Making it true changes the Trash's report copy (Question 5).
- **G-6's "Same Animation":** Settings' Clear → Cleared has no animation (`useTimedLabel.ts:5-14`), and the code block's name swap is instant (`decorations.ts:286`); only the code block's glyph and pill cross-fade. One shared transform changes Settings' feel (Question 2).

---

#### Questions for Nathan

1. **Restore's Look:** the File History Restore is the neutral `filled` button (`--fill-secondary`), not an accent tint. **Recommendation:** ActionLabel's Restore wears `filled`, an exact match to the History button; `tinted` is the accent alternative if "tint" meant color.
2. **The Settings Buttons' Cross-Fade:** Clear → Cleared and Sync Now → Synced would cross-fade where they jump today, and each button would size to its wider word at rest, so nothing reflows. **Recommendation:** yes. **The Hold:** one hold for Copied, Cleared, and Synced, where the code block holds 1000 ms and Settings 1500 ms today. **Recommendation:** 1500 ms, since the fades now eat into both ends.
3. **A Way Back to Following:** once an archive step is picked, J-1 never lets it follow History Timeframe again. The Trash precedent J-1 cites clears a pick equal to the inherited value (`columnStyles.ts:129`), which would make "pick History Timeframe's own value" the way back, at the cost of that pick then rising with History Timeframe later. **Recommendation:** store every pick as J-1 reads; no way back.
4. **A Batch of One:** "Restored 1 Page" or "Restored “Ideas”"? **Recommendation:** name the title, as every single-item notice does.
5. **Title Case Counts in the Trash:** making the log's "3 Pages" true changes the Trash's report from "Restored 3 pages." to "Restored 3 Pages." **Recommendation:** take it along; it's copy, not the Trash's look (A-3), and `countPhrase` already answers "2 Items" in Title Case from the same function.
6. **K-3's Reach:** the implementable rule drains a notice under any pointer first seen inside the band after the post, including one resting there from earlier, not only the press that posted it. **Recommendation:** accept; the alternative is a standing pointer tracker.
7. **The Bar Over Windows:** the bar stands at `stack.top.interrupt`, above floating windows and Settings, as notices do, so the reader window opened from ArchiveView sits under it. **Recommendation:** accept; hiding it while a window is in front adds a rule for a surface the user just opened from that bar's view.


---

