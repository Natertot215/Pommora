#### Outside-Change Traces

**Re-grounded:** 09-30-2026 at `d7d00240d`

**Shared Pipeline:** every case enters `onEvent` (`watcher.ts:87-104`: `posixPath` → sync tap `emitWatch` `watchSettle.ts:32-34` → nav/matrix `pushConfig` `:93-96` → bytes-less echo stop `isRecentWrite` `:97`, `writeEcho.ts:42-55` → batch with `writtenHash` `:98` → 200 ms debounce → chained `settle` `:100-103`) → `settle` (`:153`) → `dropOwnEchoes` (`writeEcho.ts:61-72`) → `confirmBy` (`mutatePatch.ts:212`) → `applyWatchEvents` (`watchPatch.ts:202-226`) → `classifyEvent` per event (`:212`) → `applyOne` arms (`:265-314`) or `walked()` → [walk: `refreshAfterWrite` `liveTree.ts:36` → `readNexus` `readNexus.ts:275`] → whole-tree `nexus:changed` when identity moved (`watcher.ts:170`) → `pages:`/`values:`/`tiles:`/`assets:changed` (`:173-184`), read from the patch's own classes when it patched and from a second `classifyBatch` pass only after a walk (`:171-172`, `5003a1c7f`) → walk-only tail: `refreshAssetMap` (`:167`), `touchesCorpus` → `seedContentIndex` (`:187`), scope check → seed + re-arm (`:190-194`). Window handlers: `useBridgeSubscriptions.ts:46` (tree → `applyTree`, `nexusSlice.ts:186-201`, whole-tree `stabilize` + reconciles), `:51-62` (values → drop detail by id, bump container epoch, refetch Matrix), `:83-87` (pages → absorb/`replaceBody`, `loadHeadings`, refetch Matrix paths).

| Stage | Page Edit | Page Create in Set | Set Folder Create | `_pagecollection.json` Edit | `settings.json` Edit | `contexts.json` Edit | Sync Landing, 200 Files |
|---|---|---|---|---|---|---|---|
| **Events** | `change Coll/P.md` | `add Coll/S/N.md` | `addDir Coll/New` (+`add` per child if copied in) | `change` (leaf `_` is watched, `exclusion.ts:26-35`) | `change .nexus/settings.json` | `change .nexus/contexts/contexts.json` | `landBytes` records no echo (`atomicWrite.ts:29-39`, `land.ts:96`) → 200 `add`/`change`, each held ≥200 ms by `awaitWriteFinish` (`watcher.ts:85`). Arrivals less than 200 ms apart share one settle, so a gap splits the landing into several full settles (inferred from options) |
| **Class** | `page-upsert` `:169-171` | `page-upsert` (dir is a held Set) `:170` | `full-refresh` `:167-168` | `container-meta` `:174-182` | `settings-leaf` `:152` | `full-refresh` via `bearsStructure` `:125-126,165` | per file; any `addDir`, attachment, `properties.json`, `.nexus/contexts/**`, or sidecar unlink → `full-refresh` |
| **Arm** | `cascadeSeen` `:244-263` → `indexWrittenPage` (`indexSeed.ts:120-151`) → on a one-for-one heading rename, `queryHeadingMentions`/`spacesLinkHeading`/`tilesLinkHeading` → `renameCascade` (`cascade.ts:152`, sweep rewrites + re-index per page); `patchPageFromDisk` `:319-337` (`readPageRecord` → `resolveEntityContexts` → `replaceNode`); `noteExternalEdit` (`fileHistory.ts:132-135`) | as edit, but `patchPageFromDisk` `:338-357` re-reads `_pageset.json` for `page_order` and inserts. Id is frontmatter `ID` or `adoptedId(rel)` (`readNexus.ts:130`), unstamped until next open (`handlers.ts:45`) | `dropTileHeadingLinks` `:213-214` → `walked()` `:215`; the new folder is a Set by position (`folderKind.ts:54`) with an `adoptedId` (`readNexus.ts:191`) | `patchContainerFromDisk` `:360-395` (`readJsonObject` → id check → `containerFieldsFrom` `containerFields.ts:27-44` + `resolveAssignedSchema` + `cachedIds`) → `replaceNode` | `applySettingsLeaf` `:418-421` → `readSettings` (`codec.ts:108`) → `sameScope` → `applySettingsLeaves` `:427-441` (new tree object even when unchanged) | `dropTileHeadingLinks` → walk; every page's `contextValues` re-resolved (`readNexus.ts:333-352`) | sequential `applyOne`: 200× (`indexWrittenPage` + `readPageRecord`), a sidecar read per new page, 200 tree copies, each `containerAt` a DFS. If any event is `full-refresh`, no per-page arm runs (`:215`) |
| **Patch/Walk** | patch | patch | walk | patch (walks on unreadable `:369` or id change `:375`) | patch (walks when scope moved `:420`) | walk | patch only if all 200 classify; else walk |
| **Index** | `indexWrittenPage` `:249` (+ cascade's) | `indexWrittenPage` `:249` | `seedContentIndex` `watcher.ts:187` (corpus list + stat of every page) | none | none (scope moved: seed `watcher.ts:191`, re-arm `:193`) | none (`touchesCorpus` false because `.nexus` is hidden, `exclusion.ts:78`) | patch path: `indexWrittenPage`/`removePathIndex` per page (~15 autocommit statements each, F-198); walk path: stat-gated seed (`indexSeed.ts:204`) |
| **Pushes** | tree; `pages:changed` [P + cascaded]; `values:changed` [{Coll,[id]}] + cascaded ledger; `tiles:changed` per cascaded host | tree; `pages:changed` [N]; `values:changed` [{Coll/S,[id]}] | tree; `assets:changed` if the relist moved; copied children get `pages:changed` and `values:changed` with **empty** id lists from the post-walk classification | tree only | tree only | tree; `assets:changed` if relist moved | tree once per settle; `pages:changed` ≤200 paths; `values:changed` carries ids only on the patch path; `nav:`/`matrix:changed` if `state.json`/`matrix.json` landed |
| **Window** | `applyTree`; absorb shown page; `index:headings` + Matrix refetch; detail dropped by id | same; page shown under its synthetic id | sidebar gains the Set | views/sort/icon from the node | personalization and commands (`nexusSlice.ts:196-200`); native and editor-menu bindings keep launch values (`refreshMenu`, `main.ts:172-177`, runs only at launch and open, `:324,401`) | sidebar, Space membership | as page edit ×N; 200-path heading and Matrix refetches |

#### Classification Predicates

| Group | Predicate (file:line) | Decides | Twin |
|---|---|---|---|
| **A · Hidden** | `hiddenName` `exclusion.ts:16-18`; `hiddenFolder` `:21-23`; `isContentName` `walk.ts:5-7`; `visibleFolders` `walk.ts:46-50`; `listMarkdownFiles` admit `walk.ts:36`; `addDir` arm `watchPatch.ts:168` | dot/underscore/`node_modules` | one rule, six spellings; `neverWatched` `exclusion.ts:26-35` is a near-duplicate that allows `_` on the leaf for sidecars |
| **B · Corpus** | `outsideContent` `exclusion.ts:76-81`; `corpusFilesUnder` admit `walk.ts:81`; `touchesCorpus` `watchPatch.ts:187-194`; `relCorpusPath` `indexSeed.ts:101-105` + `isMarkdownFile` `:125,156`; walk dir filters `readNexus.ts:164,321`; adoption `adopt.ts:148,173,199` | content vs not | near-duplicate: `classifyEvent` re-derives it piecewise as ordered arms (`:140` asset, `:141` excluded, `:169` `isContentName`) |
| **C · Watched/Carried** | `neverWatched` `exclusion.ts:26-35`; `syncIgnoredUnder` `watchSettle.ts:37-48`; `manifestAdmits` `exclusion.ts:43-60`; `indexable` `assetMap.ts:13-15` | what chokidar, sync, and the asset map admit | duplicate: `syncIgnoredUnder:45-46` is the negation of `manifestAdmits:57-58`; `indexable` repeats the asset branch a third time |
| **D · Legacy Bookkeeping** | `thumbnailSegs` `exclusion.ts:37-41`; `legacyBookkeeping` `assetMap.ts:18-23` | thumbnails/crops | near-duplicate (`segs[3]` vs `includes('thumbnails')`; crops only in the second) |
| **E · Root Escape** | `toPosixRel` `watchPatch.ts:89-92`; `relCorpusPath` `indexSeed.ts:102-103`; `syncIgnoredUnder:42-43`; `manifestAdmits:50`; `noteValueWrite` `valuesChanged.ts:16-17`; `flushSidecarWrites` `:31-32` | inside the Nexus | six copies |
| **F · Config Leaf** | `classifyEvent` `:138` (crops), `:152-155`; `isConfigPath` `watchSettle.ts:17-24`; `NEXUS_STRUCTURE`/`bearsStructure` `watchPatch.ts:119-126`; `isMetadataShardRel` `nexusPaths.ts:24-26`; `NON_CORPUS_TOP` `nexusPaths.ts:8` | which `.nexus` file | four spellings of "which config file"; only `codec.ts:54` reads `NON_CORPUS_TOP`, despite its comment |
| **G · Sidecar** | container `watchPatch.ts:174-182`; Space `:156-164`; `SIDECAR_FILENAME`/`SIDECARS` `nexusPaths.ts:50-58`; agenda claim `folderKind.ts:39-42` | structural file | unique per kind; the watcher doesn't use `SIDECARS` |
| **H · Tile Body** | `tileBodyUnder` `watchPatch.ts:95-107`; `tileHostAt` `:109-116`; `.bad` skip `:147` | tile host | near-duplicate: `tileHostAt` re-derives the same segment shapes |
| **I · Asset / Excluded** | `assetMatcher` `exclusion.ts:124-128`; `excludedMatcher` `:113-119`; consumed at `watchPatch.ts:140-141`, `exclusion.ts:79-80`, `watchSettle.ts:45-46`, `exclusion.ts:57-58` | asset root, excluded | shared matchers, four consumer orderings |
| **J · Structural/Unreadable** | `watchPatch.ts:144-145` | walk-owned entry | unique; it also captures every Unknown-admission page (see *§Index vs Tree*) |
| **K · Store/Temp Files** | `STORE_FILE` `exclusion.ts:12` (watch only); `TEMP_SUFFIX` `:14` (manifest only) | journals, temp | unique |

`applyOne`'s switch (`watchPatch.ts:272-313`) covers all 14 kinds the `WatchClass` union declares (`:73-87`). A patched batch carries its classes out on `WatchPatch` (`:197-201`), and `settle` re-runs the whole table (`watchSettle.ts:50-54`) only after a walk, to derive the four push lists (`watchSettle.ts:56-85`, `watcher.ts:171-182`).

#### Index vs Tree

**Index, Per Page** (path-keyed; `ddl.ts:16-42`, `indexSeed.ts:44-69`):
- **`relations`:** kind (body, citation, frontmatter, embed, or space), normalized target, qualifier, count.
- **`headings`:** normalized and deduped, with ordinal.
- **`page_values`:** every frontmatter key as JSON, including `ID` and the `<Context>` keys.
- **`indexed_files`:** mtime and size.

**Tree, Per Page** (`tree.ts:28-31`): `kind`, `id`, `title`, `path`, and `contextValues` (Context id → Space ids). Page metadata lives in `tree.pageMetadata`, keyed by id and read from `.nexus/metadata`, not from the page.

**Facts Held in Both:**
- **Identity:** the tree's `id` (the `ID` or an `adoptedId`) and `page_values['ID']`, which exists only once the page is stamped. `matrixGraph.ts:23-24` drops pages without an ID, so an externally created page shows in the sidebar but stays out of the Matrix until the next open stamps it.
- **Admission:** one rule, `admitContentFile` as `'page'`, in both readers (`readNexus.ts:127`; `indexSeed.ts:45` → `sweepAdmitsBody` `pageFile.ts:184-186`). The seed's corpus includes `/Tasks` and `/Events`, so a Task or Event file there reads as contradicting and indexes with no rows (`identityMark.ts:47`).
- **Path:** the same relative path in both, moved by two independent calls per rename (the tree transform, and `moveIndexPaths` at `indexSeed.ts:160-175`).
- **Context Membership, Four Forms:**
  - resolved `contextValues` (`readNexus.ts:335-340`, `watchPatch.ts:331-334`)
  - the raw-key `WeakMap` (`readNexus.ts:103-114`)
  - `space` rows (`indexSeed.ts:66,72-84`)
  - the raw key in `page_values`
- **Values:** the tree holds none for pages.
  - **Views** read them from the parse cache (`loadValues.ts:42-60` → `readPageRecord`).
  - **The Matrix** reads them from `page_values` (`matrixGraph.ts:17-34`, through `readPageRelations`, `contentIndex.ts:90-92`).
  - **Shared Shape:** both go through `pageValuesOf` (`loadValues.ts:18-28`), but Last Modified comes from the walk's stat in one and from `indexed_files` in the other.
- **Freshness:** `walkCache` (`walkCache.ts:6-15`, in memory, absolute path) and `indexed_files` (SQLite, relative path) both answer "changed since the last parse?". `sync_base` (`ddl.ts:43-52`) is a third per-path stat ledger with fold-keyed paths, used for a different question.

**Reader Swaps:**
- **Tree → Index:**
  - Views could read `page_values` the way the Matrix does.
  - `livePathOf`/`liveIdIndex` (`valuesChanged.ts:74-83`) could read the ID from `page_values`, but only for stamped pages.
- **Index → Tree:**
  - `queryMembers` (`contextCascade.ts:91`) could read resolved `contextValues` for tree pages. Root-level and un-adopted-folder pages exist only in the index (`watchPatch.ts:173`, `index-only`).
  - The heading-rename detector uses the index as its "previous version" (`indexSeed.ts:137`); a previous record would serve the same purpose.
- **The Index's Own Reader Doesn't Trust It:** `confirmedKeyHolders` re-reads and re-parses every candidate the index names (`keyHolders.ts:28-34`), and an unreadable candidate counts as a holder when the index last read it holding the key (`e3ba5d0da`).

**Hazard: Records Aren't Values.** `cachedParse` returns the same `PageRecord` object each time (`walkCache.ts:50-51`). Both the walk (`readNexus.ts:338-339`) and `patchPageFromDisk` (`watchPatch.ts:331-334`, before `applyPatch`) write `contextValues` onto that node in place. It's also the node in the tree currently held.

**Unknown Admission:** a page whose `ID:` isn't ULID-shaped or carries another kind's mark (`identityMark.ts:46-47`) makes `readPageRecord` return null (`readNexus.ts:128`). An Obsidian user's own `ID: 42` is enough.
- The walk lists it as unreadable (`:148-149`).
- `cachedParse` never caches null (`walkCache.ts:55`).
- Every outside edit to it classifies as `full-refresh` (`watchPatch.ts:144-145`).

So each save of such a page from Obsidian re-walks the whole Nexus.

**Parses Per Page:**

- **Open:**
  - **Every Page, Every Open:** `stampPage` does stat + read + YAML parse, whether or not the page is already stamped (`adopt.ts:59,64-65`, `atomicWrite.ts:251-262`).
  - **Walk:** stat + read + YAML parse (`readNexus.ts:122-126`, cold in each new process).
  - **Seed:** stat (`indexSeed.ts:197-199`). For a cold or changed file it adds a read (`:205`), two YAML parses (`pageFile.ts:185`, `indexSeed.ts:46`) and a body scan (`:49`).
  - **Totals:** cold, 3 reads, 4 YAML parses, 1 body scan and 3 stats; warm, 2 reads, 2 parses and 3 stats. A remint adds a second walk (`remintLedger.ts:130-132`).
- **Body Save** (`fileHistory.ts:101-130`): 4 reads, 2 YAML parses, 1 body scan and at least 3 hashes, with no tree confirm.
  1. `updatePageBody` reads the file for the base hash (`page.ts:82-83`).
  2. `writePageFile` reads it again (`pageFile.ts:162`), without a YAML parse (`:90-93`).
  3. `indexWrittenPage` stats, reads, parses YAML twice and scans the body (`indexSeed.ts:126-138`).
  4. The watcher's echo drop reads the bytes again (`writeEcho.ts:67-68`).
- **Property Write:** 4 reads and 5 YAML parses, across `setProperty.ts:50-52`, `governedWrite.ts:23-25`, `pageFile.ts:94`, `indexWrittenPage`, and the echo drop.

#### Re-Walk Triggers

| Trigger (file:line) | Reached By | Safety or Convenience | Removable Under Candidate |
|---|---|---|---|
| `watchPatch.ts:135` | path escapes the Nexus, or is the root | Safety | No |
| `:144-145` | entry or its folder on `unreadable` (includes Unknown pages) | Safety | Yes: the reader returns a status, and apply transitions one record |
| `:165` `properties.json` | outside registry edit | Convenience (`routeRegistry` `mutatePatch.ts:203-210` already patches it) | Yes |
| `:165` `.nexus/contexts/**`, except a held Space's `_space.json` add/change | `contexts.json`, Space/Context folder add/remove, sidecar unlink | Convenience | Yes |
| `:165` `nexus.json` | identity/agenda registration (`folderKind.ts:67-98`) | Safety | No |
| `:167-168` | any non-hidden `addDir`/`unlinkDir` | Convenience (F-199) | Yes: a subtree read through the readers |
| `:184` | attachment beside pages, `_Draft.md`, sidecar unlink/unheld/wrong-kind, agenda sidecar, non-Markdown file at the root | Convenience, except the agenda sidecar | Yes, except the agenda sidecar |
| `:211` | no held tree | Safety | No |
| `:215` | one `full-refresh` walks the whole batch before any arm runs | Convenience (batch granularity) | Yes |
| `:221-224`; `confirmBy` `mutatePatch.ts:217-220`; `handlers.ts:170` | a patch or mutation threw | Safety | No |
| `patchPageFromDisk :325` / `:330` | unreadable / Unknown admission | Safety / Convenience | Yes / Yes |
| `:329`, `:340`, `applyPatch :233` | no tree, container gone, session switched | Safety | No |
| `patchContainerFromDisk :369` / `patchSpaceFromDisk :399` | sidecar unreadable or absent | Safety | Yes (via a status) |
| `:375` / `:405` | sidecar `id` changed | Convenience | Yes: remove + upsert |
| `:367,371,373` / `:401,403`; `patchPageMetaFromDisk :490` | entity not held | Safety | No |
| `applySettingsLeaf :420`; `confirmRescope` `confirm.ts:58-64` | excluded folders or asset folder moved | Structural | The walk stays; the seed folds into its diff |
| `confirmBy` `mutatePatch.ts:221-226` | a flushed sidecar note (`noteSidecarWrite`, e.g. `cascade.ts:219`) that won't patch, after the batch patched | Safety | No; the walk has to report itself (F-620) |
| `routeMutation` `mutatePatch.ts:119` | Space/Context delete | Convenience | Yes: the sweep's writes emit upserts |
| `:124,:127,:132` | kind with no arm (e.g. a Context's icon) | Convenience | Yes |
| `:144-148` | restore of a folder, Space or Context | Convenience | Yes |
| `:153-158` | rename/move/delete over adopted ids | Safety, given path-hash ids | Yes, once E-6 stamps at first sight |
| `:161` | transform can't resolve | Safety | No |
| `remintLedger.ts:119` / `handlers.ts:88` | open / re-point | Initial build | No (it becomes a diff from empty) |
| `remintLedger.ts:130-132`; `handlers.ts:94-97` | after a remint; replayed schema cascade | Convenience | Yes |
| `liveTree.ts:64-65` | lazy read with no tree | Safety | No |

That's about 16 safety triggers, 12 convenience ones and 1 structural. The one-reader-per-file-kind law removes all 12 convenience triggers and turns 3 safety ones (`:144`, `:369`, `:399`) into single-record transitions; E-6 retires the adopted-id one (`mutatePatch.ts:153-158`). Of the convenience triggers, the watcher's own are `:165`, `:167`, `:184`, `:215`, `:330` and `:375`/`:405`; F-199, as K-2 rewrites it, covers them through the one reader rather than three new arms.

#### Store Seam

`Core/Platform/stores.ts` declares five interfaces.

- **`KeyValueStore`** (3 methods: get/write/entries). **Narrow and general; per-machine chrome, the ledger baseline and the sync binding.**
  - **Callers:** only `localState.ts:33,44,60`, which fronts 12 modules: window state, tabs, recents, the `record` baseline (remint/ledger), Matrix layout, device prefs, the `sync` binding (Sync pull/session/handlers), link titles, and the Interface and Web handlers.
- **`ContentIndexStore`** (`stores.ts:43-58`, 13 methods). **Wide: one method per SQL shape.** Every caller goes through the wrappers in `contentIndex.ts`.
  - **`upsertPageIndex`:** reached through `recordPage` (`indexSeed.ts:107-111`) from:
    - `indexWrittenPage`, called at `watchPatch.ts:249`, `contextCascade.ts:186`, `create.ts:66`, `governedWrite.ts:41`, `governedSweep.ts:89`, `fileHistory.ts:116`, `adopt.ts:98` (`stampListed`), and `indexSeed.ts:169,174`
    - the seed (`:211`)
  - **`removePathIndex`:** `watchPatch.ts:282`; `indexSeed.ts:130,156,216`.
  - **`renamePathIndex`, `renamePathPrefixIndex`, `removePathPrefixIndex`:** `indexSeed.ts:172`, `:173` and `:157`, reached from `move.ts:40`, `rename.ts:39,45`, `folderEntity.ts:34`, `spend.ts:262` and `delete.ts:101`.
  - **Readers:**
    - `queryMentions`: `cascade.ts:163`
    - `queryHeadingMentions`: `cascade.ts:164`, `watchPatch.ts:252`
    - `readHeadings`: `handlers.ts:156`, `indexSeed.ts:137`
    - `queryKeyHolders`: `keyHolders.ts:18,28`
    - `queryMembers`: `contextCascade.ts:91`
    - `readIndexedStat(s)`: `indexSeed.ts:209,186`
    - `readPageRelations` (renamed from `readMatrixGraph` in `23890f78b`): `matrixGraph.ts:18`, inside `readMatrixGraph`, called from `Matrix/handlers.ts:22`
- **`SnapshotStore`** (7 methods). **Per-machine history.** Used only by `fileHistory.ts:41-45,153-196`.
- **`SyncStore`** (6 methods). **Sync state.** Wrapped by `Sync/Client/base.ts:14-25` and used by `push.ts`, `pull.ts`, `reconcile.ts`, `land.ts`, `session.ts`, `Sync/handlers.ts` and `tap.ts:60`.
- **`CaptureStore`** (2 methods). Used by `captures.ts:13`, `fileHistory.ts:196` and `session.ts:219`.

The seam runs at two speeds: key-value is narrow, while the index is wide and shaped statement by statement. Its five write methods are per-row calls, each a sequence of autocommits (`Desktop/Store/stores.ts:50-97`). `inTransaction` (`driver.ts:16-26`) already wraps the key-value store's writes in the same file (`stores.ts:29`), but not these. The in-memory double (`Core/Testing/memoryStores.ts:81-123`) mirrors the five, and `Core/Testing/storesContract.ts` exercises both implementations against them.

Under the candidate law, the store would need five things it lacks:

1. **One Batch Apply:** a single `applyIndex({upserts, removes, moves})` in one transaction with prepared statements (F-198), replacing the five write methods.
2. **Id vs Path:** rows are keyed by path while records key by id, so either `indexed_files` gains an `id` column or apply translates `move(id,…)` into path renames. Today id→path goes through the `page_values` JSON (`matrixGraph.ts:23`).
3. **Persisted Readiness:** a complete on-disk index answers null until this process's seed finishes (`contentIndex.ts:43-62`).
4. **Stats From the Walk:** the seed re-stats files the walk just stat-ed (`indexSeed.ts:197-199`); the stats should come from the record.
5. **No Prior-State Reads:** `readHeadings` stops being needed as a "previous version" read if the record keeps headings.

#### Inventory & Collapse

**LOC Basis:** `wc -l` (blank and comment lines included), production code only, at `d7d00240d`. The **Counted** column is what this slice claims. For `mutatePatch.ts` it counts only `confirmBy` (`:212-237`); the rest belongs to the mutation slice. `confirm.ts` and `liveTree.ts` are shared with other slices, counted here, and flagged.

| File | LOC | Counted | Job | Twin | Under Candidate | Surviving | Safety Property Held |
|---|---|---|---|---|---|---|---|
| `Desktop/FileWatch/watcher.ts` | 198 | 198 | intake, settle, pushes, config pushes | parallel to the `confirm.ts` funnel | survives, pushing change lists; `pushConfig` → `config(key)` | ~150 | counted `starts` guard `:40,76-79,137`; chained settles `:100-103`; root pins `:59,154,169,188`; text dedupe `:62-64` |
| `Core/Nexus/watchPatch.ts` | 491 | 491 | classifier, arms, disk re-read patchers | `patch*FromDisk` parallel to the walk's steps (same decoders) | classifier + tile helpers survive; arms and patchers collapse into per-kind readers shared with the walk | ~210 | root pin `:233`; unreadable → walk `:144` |
| `Core/Nexus/watchSettle.ts` | 85 | 85 | ignore filter, classify, push lists | `syncIgnoredUnder` ≡ ¬`manifestAdmits` | lists derive from changes; filter moves to `exclusion.ts` | ~35 | — |
| `Core/Nexus/confirm.ts` (shared) | 70 | 70 | confirm funnel, rescope | parallel to settle | survives as apply + push | ~50 | root pins `:14,29,32` |
| `Core/Nexus/mutatePatch.ts` | 237 | 26 | `confirmBy` | — | becomes `apply` + fallback | ~15 | a failed walk drops the tree `:227-233` |
| `Core/Nexus/liveTree.ts` (shared) | 114 | 114 | held tree, single-flight walk | — | survives as the record-store holder | ~104 | epoch discard `:26-31,36-39,95,109`; vanished root `:100-105` |
| `Core/Index/indexSeed.ts` | 223 | 223 | index extractor, writer re-index, moves, seed | second page reader; second corpus traversal | extractor → page reader; seed → walk diff; moves → apply | ~100 | database-identity bail `:189,207,214`; keeps a fresher row `:209-210` |
| `Core/Index/contentIndex.ts` | 100 | 100 | guarded wrappers, `readyDb` | — | 5 write wrappers → 1 | ~70 | `readyDb` gate `:43-62,91` |
| `Core/Platform/stores.ts` | 129 | 129 | interfaces | — | index writes → one batch | ~119 | — |
| `Desktop/Store/stores.ts` | 250 | 250 | SQL | `indexed_files` ∥ `sync_base` | batch apply | ~240 | prefix range `:48`; SQL `length()` `:91` |
| `Desktop/Store/ddl.ts` | 86 | 86 | schema, generation | — | survives | 86 | generation rebuild `:81-86` |
| `Desktop/Store/driver.ts` | 89 | 89 | open, transactions | — | survives | 89 | damaged store set aside `:75-89` |
| `Desktop/Store/sessionDb.ts` | 54 | 54 | install stores | — | survives | 54 | never throws `:21-40` |
| `Desktop/Store/open.ts` | 40 | 40 | root stamp | — | survives | 40 | a foreign root clears `sync_base` `:29-31` |
| `Core/Files/writeEcho.ts` | 72 | 72 | echo suppression | — | survives | 72 | echo by bytes `:20-24,42-44,58`; late-settle read `:61-72`; prefix window `:8,46-53` |
| `Core/Files/walkCache.ts` | 58 | 58 | parse cache | ∥ `indexed_files` | collapses into the record map (each record carries its stat) | ~15 | racy window `:3-4,48` |
| `Core/Files/walk.ts` | 88 | 88 | listing primitives | — | survives | 88 | pruned descent `:52-71` |
| `Core/Paths/exclusion.ts` | 128 | 128 | predicates | groups A–D above | survives; absorbs the C/D twins | ~125 | scope captured as a unit `:67-71,87-93` |
| `Core/Assets/assetMap.ts` | 113 | 113 | asset listing | `indexable` ∥ group C | survives | ~105 | root pin `:71,76-78` |
| `Core/Navigation/navigationFile.ts` | 62 | 62 | nav config leaf | — | survives | 62 | — |
| `Core/Matrix/matrixFile.ts` | 24 | 24 | matrix config leaf | — | survives | 24 | — |
| **Total** | **2,711** | **2,500** | | | | **~1,857** | |

**Net, Counted Lines:**
- **Removed:** about 640 lines.
- **Added:** about 300 (range 250–350) for:
  - the record map and projection glue
  - the change vocabulary and `apply`
  - walk-as-diff
  - a change-list channel
  - the index batch method

  Window-side code isn't counted here.
- **Result:** 2,500 → about 2,160, roughly −340 lines (−14%, range −250 to −450).

About 1,500 lines survive under any law: the SQLite seam, the watcher's lifecycle, echo suppression, exclusion, listing, the asset map, and the config leaves. What collapses is a second read path that grew one arm at a time:
- **Patch Twins:** the `patch*FromDisk` functions (`watchPatch.ts:319-491`, ~170 lines), which already reuse the walk's decoders (`containerFieldsFrom`, `cachedIds`, `spaceFieldsFrom`, `readOrder`, `readHomepageLeaves`, `readCropLeaves`, `readSettings`).
- **Index Reader:** the index's own page reader.
- **Seed Traversal:** the seed's separate pass over the corpus.
- **Re-Classification:** the second classification pass, which since `5003a1c7f` runs only after a walk; that same branch is the one F-620 names.

This law's larger savings likely sit outside the slice, in `treePatch.ts` (576 lines) and `routeMutation`. That's judged from file size and a partial read, not measured.

#### Divergences

1. **DesktopPM, "Each Patch … at the Cost of One File Read":**
   - **Page Upsert:** reads the page twice (`indexSeed.ts:134`, `readNexus.ts:124`).
   - **Create:** adds a sidecar read (`watchPatch.ts:341`).
   - **Echo Drop:** reads the file again (`writeEcho.ts:67`).
2. **DesktopPM, "Everything Unclassifiable — … Orderings, a Sidecar Appearing … — Falls Back to One Verification Walk":** the doc overstates walking.
   - **`state.json`:** patches rather than walks (`watchPatch.ts:154,309-310,443-458`).
   - **Sidecar Appearing:** a sidecar appearing in a held folder also patches (`:174-182`, `add` included).
3. **DesktopPM, "A Walk That Re-Parses Only Entries Whose Mtime or Size Changed":**
   - **Config Leaves:** the walk re-reads every config leaf uncached (`readNexus.ts:298-301`), including all metadata shards (`pageMetadata.ts:50-61`).
   - **Folder Probes:** it runs 2–3 `pathExists` checks per folder (`folderKind.ts:39-41,56`).
   - **Unknown/Unreadable Pages:** they're never cached (`walkCache.ts:55`).
   - **Watcher Extras:** the watcher's walk also relists assets (`watcher.ts:167`) and stat-seeds the whole corpus (`:187`).
   - **Forfeited Arms:** one unclassifiable event forfeits every other event's arm in the batch (`watchPatch.ts:215`), so heading-rename cascades (`cascadeSeen`) and file-history arming (`noteExternalEdit`) are skipped for those pages.
4. **CorePM, "Derived State, Disposable by Construction … Reading Only Files Whose Mtime or Size Moved":**
   - **The Gate:** equality on (mtime, size) (`indexSeed.ts:204`), while preserved-time writes keep mtime (`atomicWrite.ts:18-27`).
   - **Writer-Maintained:** seven writers outside the index module keep the index current, with the stat gate as a backstop: `watchPatch.ts:249`, `contextCascade.ts:186`, `create.ts:66`, `governedWrite.ts:41`, `governedSweep.ts:89`, `fileHistory.ts:116` and `adopt.ts:98`, plus the module's own `moveIndexPaths` (`indexSeed.ts:169,174`).
   - **What the Backstop Misses:** same-size preserved-time changes. That's F-209 for remint, and also a sync landing of another device's preserved-time sweep whenever its batch walks (`land.ts:96` lands the remote mtime).
   - **Features Lost Until the Seed Completes:**
     - heading cascades (`cascade.ts:164` `?? []`, `watchPatch.ts:252`)
     - the Matrix (`Matrix/handlers.ts:23` returns a fault)
     - heading lists (`handlers.ts:156` `?? {}`)
     - rename detection (`indexSeed.ts:137` `?? []`)
5. **CorePM, "A Query Answers Null … and Its Caller Falls Back to a Full Scan":**
   - **Scan Fallback:** only `queryMentions` (`cascade.ts:163`), `queryMembers` (`contextCascade.ts:91`) and `queryKeyHolders` (`keyHolders.ts:18,28`) fall back to a scan.
   - **Other Fallbacks:** the rest fall back to `[]`, `{}` or a fault.
   - **Ungated Reads:** `readHeadings` and `readIndexedStat(s)` aren't gated on `readyDb` (`contentIndex.ts:75-77,94-100`), so they answer from half-seeded tables.
   - **Gated Queries:** these answer null against a complete on-disk index until this process's seed ends (`:43-62`).
6. **CorePM/DesktopPM, "`sync` Table":** the table is `sync_base` (`ddl.ts:43`); `sync` is a retired name (`ddl.ts:76`).
7. **`nexusPaths.ts:7`, "The Walk, the Index, and Every Mutation Refuse These":** only `codec.ts:54` reads `NON_CORPUS_TOP`. Everything else refuses `.nexus`/`.trash` through `hiddenFolder`.

#### Plan Inputs

##### Classifier to Reader

Every kind `classifyEvent` (`watchPatch.ts:128-185`) returns, the arm `applyOne` runs, and the read it makes today:

| Kind | Classified At | Arm | Disk Read Today | One Reader (Phase 3) | Phase 5 |
|---|---|---|---|---|---|
| `page-upsert` | `:169-171` | `cascadeSeen` `:244-263`, `patchPageFromDisk` `:319-358`, `noteExternalEdit` | the page twice (`indexSeed.ts:134`, `readNexus.ts:124`), plus the container sidecar on insert (`:341`) | page reader, once; its record feeds the tree, the index, and the heading-rename check | one read → upsert change |
| `page-remove` | `:170-171` | `removePathIndex` + `removePage` `:240-241` | none | none | remove change |
| `index-only` | `:173` | `cascadeSeen` | the page once | page reader, index half | index change only (see *§Index From the One Read*) |
| `container-meta` | `:174-182` | `patchContainerFromDisk` `:360-395` | the sidecar | folder-sidecar reader | one read → container change |
| `space-meta` | `:156-164` | `patchSpaceFromDisk` `:397-416` | `_space.json` | Space reader | one read → Space change |
| `settings-leaf` | `:152` | `applySettingsLeaf` `:418-421` | `readSettings` | settings home (D-3) | setting change; a moved scope still walks |
| `homepage-leaf`, `crops-leaf`, `metadata-leaf`, `order-leaf` | `:153`, `:138`, `:155`, `:154` | `patchHomepageFromDisk` `:460-463`, `patchCropsFromDisk` `:465-468`, `patchMetadataFromDisk` `:470-479`, `patchOrderFromDisk` `:443-458` | the one config file | settings home (D-3) | setting change |
| `tiles-leaf` | `:147-151` | re-reads the tile document `:299-302`; no tree patch | the tile doc | outside the three readers | unchanged |
| `asset` | `:140` | `patchHeldAssetMap` `:275-277` | none | — | unchanged |
| `ignored` | `:141`, `:147`, `:151`, `:165`, `:168` | — | — | — | unchanged |
| `full-refresh` | `:135`, `:145`, `:165`, `:168`, `:184` | `walked()` | the whole Nexus | — | a subtree read or a walk that returns its diff |

`patchSettingsFromDisk` (`:423-425`) and `patchPageMetaFromDisk` (`:481-491`) are confirm-only; the watcher never calls them. The walks still reached are in *§Re-Walk Triggers*; the ones phase 5 removes are the convenience rows, and the ones that stay are the root escape, the missing tree, `nexus.json`, a thrown patch, a moved scope, and `confirmBy`'s sidecar fallback.

##### The Stamp at Settle (E-6)

- **Where:** `settle` has already waited out the 200 ms debounce (`watcher.ts:101-103`) behind chokidar's 200 ms `awaitWriteFinish` (`:85`) when it drops echoes (`:158`), so a tool mid-write has finished. With `adoptedId(relFile)` retired (`readNexus.ts:130`), the page reader returns a `missing` admission rather than a temporary ID, and the stamp runs after the read, from that read: in the `page-upsert` arm (`watchPatch.ts:285-292`), which also catches a `change` that stripped an ID, and, for a batch that walks, over the walk's `missing` records the same way the open stamps (D-2, F-197). The open, the settle, and the fallback walk then share one step: read, stamp what came back `missing`, apply. The folder stamp is the one step that precedes the read, since the sidecar it writes is what the folder reader reads; while `addDir` still walks (phases 3 and 4), it runs over the batch's `addDir` events before `confirmBy` (`watcher.ts:161`).
- **What the Stamp Needs:** `stampPage(absFile, kind)` (`adopt.ts:58-70`) and `stampFolder(absDir, kind)` (`:104-116`) aren't exported. Both already take the file lock and record the echo with bytes: `rewritePageSerialized` locks (`atomicWrite.ts:251-262`) and writes through `rewritePreservingTimes` → `atomicWriteFile` → `recordWrite(path, data)` (`:13-27`); `rmwJsonStrict` locks (`:103-109`) and writes through `writeJson` → `atomicWriteFile` (`:59-61`). The stamp's own `change` event therefore carries `writtenHash` and drops at the next settle's `dropOwnEchoes`. The write tap also feeds Sync (`tap.ts:55-58`), which pushes the stamped file. `stampPage` preserves mtime, so the index's stat gate sees only the size change.
- **Kind at Settle:** `ensureFolderId` (`adopt.ts:158-164`) resolves the kind by reading `nexus.json` and every root folder's agenda sidecars (`folderKind.ts:67-98`), which is too costly per event; the tree already answers it (a folder under a held container is a Set, `folderKind.ts:54`). A new root folder resolves `unknown` mid-session (no sidecar, `adopting: false`, `folderKind.ts:55-56`) and stays out of the tree until reopen, while the open's `stampAdopted` adopts it (`adopting: true`, `adopt.ts:169`). Whether the settle stamp adopts a new root folder is a planner decision E-6 doesn't settle. Root files and pages in `unknown` folders aren't stamped at open either (`adopt.ts:171-189` stamps folders only), so they stay `index-only`.
- **When the Stamp Fails:** `stampPage` returns null when the file can't be read or already carries an ID, and throws on a failed write. Today the page lands under `adoptedId(rel)` (`readNexus.ts:130`). Under E-6 it enters `tree.unreadable` with the notice and Try Again (section M). No transform adds an `unreadable` entry outside the walk; `treePatch.ts:155-173` (`repointUnreadable`) only moves and prunes them, so the patch path needs one.
- **What Goes:**
  - `stampListed` (`adopt.ts:90-100`), whose callers are `cascade.ts:130` and `keyHolders.ts:59` (each falls back to it when a file's frontmatter has no `ID`). With every held page stamped, both read the frontmatter ID alone.
  - `patchPageMetaFromDisk`'s adopted branch (`watchPatch.ts:484-488`).
  - The `adoptedId` fallbacks in this slice: `watchPatch.ts:374, 404`, and the walk's `readNexus.ts:130, 191, 225, 245`. `readNexus.ts:305` (`adoptedId(root)` for a Nexus with no identity) isn't a page or folder, and E-6 doesn't say whether it goes.
  - The other E-6 sites sit outside this slice: `mutatePatch.ts:78-88, 153-158`, `reorder.ts:12`, `creationOrder.ts:54`, `bandRouter.ts:99`, `remintLedger.ts:34`, `contextWrite.ts:76`, `pageFile.ts:174`.
- **What Stays:** `ensurePageId` (`adopt.ts:77-88`), whose callers are `pageMetadata.ts:169` (`writePageMeta`) and `restoreScrub.ts:90`. It isn't among E-6's nine; once every held page carries an ID, its stamp branch is reached only when that guarantee breaks, and whether it narrows to a lookup is a planner call.

##### Index From the One Read

- **Corpus Gap:** the seed lists every non-hidden, non-excluded, non-asset `.md` under the root (`nexusCorpus` → `corpusFiles`, `indexSeed.ts:86-88`, `walk.ts:41-43,73-83`). The walk enters only root folders that resolve `collection` and nested folders that resolve `set` (`readNexus.ts:320-328`, `:164-170`). The seed's corpus exceeds the tree's by root-level `.md` files, root folders that resolve `unknown`, nested folders with an agenda sidecar, and the Agenda folders `/Tasks` and `/Events`. On the two live Nexuses the gap is zero files today (NexusOS: 234 corpus, 234 tree; `~/Test`: 10 and 10; Agenda folders are empty or excluded). The Agenda folders are where it grows: they're pre-seeded, the walk never enters them, and their files would be indexed with no rows anyway (see *§Index vs Tree*), so for the seed's traversal to go, the walk has to read the Agenda folders, root files, and `unknown` folders, or accept that they leave the index.
- **The Five Writes:** `upsertPageIndex` (`Desktop/Store/stores.ts:50-75`), `removePathIndex` (`:76-78`), `renamePathIndex` (`:79-83`), `removePathPrefixIndex` (`:84-88`), `renamePathPrefixIndex` (`:89-97`), declared at `Core/Platform/stores.ts:44-48`, wrapped at `contentIndex.ts:22-40`, mirrored at `memoryStores.ts:81-123`. Each prepares its statements per call and autocommits per row; `inTransaction` (`driver.ts:16-26`) wraps only `keyValueStore.write` (`stores.ts:29`). One `applyIndex(batch)` prepares once and runs the batch in one `inTransaction`, with the gate row still last per page (`stores.ts:70-74`).
- **`indexWrittenPage`'s Callers and the Text They Hold (F-206):**

  | Caller | Holds the Written Text |
  |---|---|
  | `governedWrite.ts:41` | `content` (`:32`) |
  | `governedSweep.ts:89` | `next` (`:84`) |
  | `contextCascade.ts:186` | `text`, the restored bytes (`:183`) |
  | `fileHistory.ts:116` | `written` from `updatePageBody` (`pageFile.ts:163-165`) |
  | `create.ts:66` | none; `setPageContext` and `setChildOrder` write after `createPage` |
  | `adopt.ts:98` (`stampListed`) | none in scope; `stampPage`'s rewrite closure holds it |
  | `watchPatch.ts:249` (`cascadeSeen`) | none; `patchPageFromDisk` reads the same file right after |
  | `indexSeed.ts:169,174` (`moveIndexPaths`) | none; a move changes no text |

  Four of the eight hand over text they already hold. The rest read, or take the record the reader produced.

##### F-620

Open at HEAD. `confirmBy` (`mutatePatch.ts:212-237`) walks when a flushed sidecar note won't patch (`:221-226`), after the batch reported `patched`, and returns only the tree. `settle` branches on `patch.outcome` for the asset relist (`watcher.ts:167`), the classes it pushes from (`:171-172`), and the seed and scope check (`:185-194`), so a walk inside `confirmBy` pushes pre-walk classes and skips both upkeeps. Phase 5's walk-as-diff closes the pushes and the index by construction only if `confirmBy`'s fallback walk returns its diff and `settle` pushes and indexes from that change list. `refreshAssetMap` is a listing outside the tree walk, so the asset relist either joins the diff or stays keyed on a walked flag that `confirmBy` returns.

##### Sync Landing

- **`land.ts` at HEAD:**
  - `landWrite` (`:83-104`): knows the path, the record (mtime, size, hash), and the change `seq`; it creates the parent folder (`:93`), merges Pommora JSON (`bytesToLand` `:38-65`), may capture the local loser (`:95`), and lands bytes with the remote mtime (`:96`, `landBytes` `atomicWrite.ts:29-39`).
  - `landDelete` (`:106-122`): knows the path; it captures an unrecorded local copy, removes the file, and removes its parent folder when that empties (`:116-118`).
  - `landRename` (`:124-144`): knows the source (`change.from`) and target paths; it captures a losing target, creates the target folder, renames, and re-cases a case-folded folder (`:136-138`).
  - All three return `void`, and `applyPull` (`pull.ts:88-96`) returns an outcome enum, so the kind, path, and source path are discarded. Callers are `pull.ts:35,51,54,63` and `push.ts:269,270,285,298,308` (`resolveStale`).
- **Echo:** no landing records one. `landBytes` never calls `recordWrite`, and the rename and deletes call neither `recordWrite` nor `reportRename` (`writeEcho.ts:20-32`). Every landing therefore runs the full outside-change path, and Sync's own watch tap sees it (`tap.ts:54`); `pushDirty` finds the hash matching and sends nothing (`push.ts:210`).
- **How They Reach the Tree Today:** a landed page rename arrives as `unlink` + `add`, patched as `page-remove` + `page-upsert` when both folders are held containers; a landed folder rename, a landed new folder (`landWrite`'s `mkdir`), and an emptied parent removed by `landDelete` each arrive as `addDir`/`unlinkDir` and walk (`watchPatch.ts:167-168`).
- **Under Phase 5:** each landing returns the changes it made, read through the one reader: `landWrite` an upsert of its kind (plus a container add when `mkdir` created the folder), `landDelete` a remove (plus a container remove when the parent emptied), `landRename` a move from `from` to `path` (plus the recase). `pull.ts` collects them and hands them to the applier. For the watcher to drop the landing's own events, the landing records an echo: bytes for `landWrite` (the bytes it landed), bytes-less on both endpoints for `landRename`, as `page.ts:54-62` does. The record calls the write tap, which schedules a push that the hash check turns into nothing.

##### Per File

| File | Deleted (Current Lines) | Survives | Added (Signature Level) | Non-Test Importers of What Changes |
|---|---|---|---|---|
| `Core/Nexus/watchPatch.ts` | phase 5: `patchPageFromDisk` `:319-358`, `patchContainerFromDisk` `:360-395`, `patchSpaceFromDisk` `:397-416`, `replaceNode`/`removePage` `:237-241`, the batch forfeit `:215`, the convenience `full-refresh` arms `:165,167-168,184`, `WatchPatch.touched`/`classes` `:197-201`; phase 3: `patchPageMetaFromDisk`'s adopted branch `:484-488`, `adoptedId` at `:374,404` | `classifyEvent`, tile helpers, `touchesCorpus` until phase 5, the config-leaf patchers until D-3 moves them, `cascadeSeen` | phase 5: `applyWatchEvents(root, events, scope): Promise<{ changes: NexusChange[]; walked: boolean }>` | `patchPageFromDisk`: `mutatePatch.ts:30,92`, `adopt.ts:9,97`; `patchContainerFromDisk`: `mutatePatch.ts:26`, `confirm.ts:8`; `patchSpaceFromDisk`: `mutatePatch.ts:33`; `patchSettingsFromDisk`: `settings.ts:15,77`, `confirm.ts:8,55`, `mutatePatch.ts:32`; `patchPageMetaFromDisk`: `mutatePatch.ts:31,123,136`; `applyWatchEvents`/`WatchPatch`: `watcher.ts:28-34`; `WatchEventName`: `assetMap.ts:10` |
| `Core/Nexus/watchSettle.ts` | phase 5: `classifyBatch` `:50-54`, `valueChangesOf` `:56-70`, `pagesChangedIn` `:81-85`, `tilesChangedIn` `:72-79` become projections of the change list | `isConfigPath`, the watch tap, `syncIgnoredUnder` | phase 5: push lists derived from `NexusChange[]` | `watcher.ts:5-13`; `setWatchTap`: `tap.ts:3` |
| `Desktop/FileWatch/watcher.ts` | phase 5: the walk-only tail `:185-194` folds into the change list | lifecycle, `pushConfig`, chained settle, echo intake | phase 3: the folder stamp over `addDir` events between `:158` and `:161` | — |
| `Core/Nexus/adopt.ts` | phase 3: `stampListed` `:90-100` | `stampPage`, `stampFolder`, `ensurePageId`, `ensureFolderId`, `stampAdopted` | phase 3: exported `stampPage(absFile, kind): Promise<string \| null>`, `stampFolder(absDir, kind): Promise<void>` | `stampListed`: `cascade.ts:32,130`, `keyHolders.ts:9,59` |
| `Core/Index/indexSeed.ts` | phase 3: `indexWrittenPage` `:120-151` (its stat and read), `recordPage` `:107-111`, the seed's traversal `:185-223` if the walk covers the corpus | `extractPageIndex` moves into the page reader; `relCorpusPath`, `corpusUnder`, `nexusCorpus`, `folderCorpus` stay for the scan fallbacks | phase 3: `indexPage(rel, text, stat): HeadingRenameSeen \| null` or a batch built from records | `indexWrittenPage`: see the F-206 table; `seedContentIndex`: `handlers.ts:5,93`, `confirm.ts:7,61`, `watcher.ts:23,187,191`, `confirmedMutate.ts:3,18`; `SeedReread`: `repairSweep.ts:16,20`; `moveIndexPaths`: `move.ts:40`, `rename.ts:39,45`, `folderEntity.ts:34`, `spend.ts:262`; `deindexPath`: `delete.ts:101` |
| `Core/Index/contentIndex.ts` | phase 3: the five write wrappers `:22-40` | `readyDb`, the readers | `applyIndex(batch: IndexBatch): void` | `removePathIndex`: `watchPatch.ts:17,282`; the rest only `indexSeed.ts:11-21` |
| `Core/Platform/stores.ts` | phase 3: the five write methods `:44-48` | the readers, the other four interfaces | `applyIndex(batch: IndexBatch): void`; `IndexBatch` | `Desktop/Store/stores.ts:49`, `memoryStores.ts:68` |
| `Desktop/Store/stores.ts` | phase 3: `:50-97` | `clearPath`, the readers, `syncStore` | `applyIndex` under one `inTransaction` | `sessionDb.ts` installs it |
| `Core/Sync/Arrival/land.ts` | — | all three | phase 5: `landWrite`/`landDelete`/`landRename` return `Promise<NexusChange[]>`; echo records | `pull.ts:4`, `push.ts:12-14` |

**Test Files:**

| Module | Test Files (Lines) |
|---|---|
| `watchPatch` | `Core/Nexus/watchPatch.test.ts` (787), `Core/Nexus/watchSettle.test.ts` (128), `Desktop/FileWatch/watcher.test.ts` (452), `Core/Nexus/mutatePatch.test.ts` (428), `Core/Index/indexMaintenance.test.ts` (304) |
| `watchSettle` | `watchPatch.test.ts` (787), `watchSettle.test.ts` (128), `Core/Sync/Client/tap.test.ts` (141), `watcher.test.ts` (452) |
| `watcher` | `watcher.test.ts` (452) |
| `indexSeed` | `Core/Index/indexSeed.test.ts` (331), `indexMaintenance.test.ts` (304), `Core/Contexts/contextCascade.test.ts` (666), `Core/Nexus/cascade.test.ts` (617), `Core/Nexus/mutate.test.ts` (2,439), `watchPatch.test.ts` (787), `Core/Properties/governedSweep.test.ts` (74), `Core/Properties/keyHolders.test.ts` (179), `Core/Properties/repairSweep.test.ts` (184), `Core/Properties/replaySchemaCascade.test.ts` (510), `Core/Trash/spend.test.ts` (1,713), `watcher.test.ts` (452) |
| `contentIndex` | `Core/Index/contentIndex.test.ts` (159), `indexMaintenance.test.ts` (304), `indexSeed.test.ts` (331), `Core/Matrix/matrixGraph.test.ts` (76), `cascade.test.ts` (617), `Core/Settings/exclusionScan.test.ts` (274), `Desktop/Store/open.test.ts` (255), `Desktop/Store/stores.test.ts` (106) |
| `Desktop/Store/stores` | `stores.test.ts` (106), `Core/Platform/localState.test.ts` (72) |
| `land` | `Core/Sync/Arrival/land.test.ts` (332); `Core/Sync/Client/pull.test.ts` (255) and `push.test.ts` (577) drive it through their callers |
| `adopt` | `Core/Nexus/adopt.test.ts` (207; no test calls `stampListed` by name), `Core/Nexus/admission.test.ts` (330), `Core/Nexus/normalizeSavedViews.test.ts` (145) |
| Write methods by name | `contentIndex.test.ts`, `matrixGraph.test.ts`, `stores.test.ts`, `open.test.ts`; test support `Core/Testing/memoryStores.ts` (304) and `Core/Testing/storesContract.ts` (451, 26 call sites) |

##### Names

Candidates, none settled:

- **`NexusChange`:** the Decision Log's change description. `Change` is taken in `Core` by Sync's wire (`Core/Sync/Contract/wire.ts:102`), which `land.ts` already imports beside it.
- **`stampPage` / `stampFolder`:** exported as they are, or as `stampPageId` / `stampFolderId` beside `ensurePageId` / `ensureFolderId`.
- **`stampArrived(root, events)`:** the settle's folder stamp over `addDir` events in phases 3 and 4.
- **`stampMissing(root, records)`:** the one step the open, the settle, and the fallback walk share, stamping what the reader returned `missing`.
- **`markUnreadable(tree, path)`:** the transform that adds an `unreadable` entry, beside `repointUnreadable` in `treePatch.ts`.
- **`applyIndex` / `IndexBatch`:** the batched index write.
- **`indexPage`:** `indexWrittenPage` without its own stat and read.
- **`diffTrees(before, after)`:** walk-as-diff.

##### Own Plan

Phase 5's share (the watcher reading one file, walk-as-diff, Sync landings emitting) is its own plan, written when phase 5 starts: it builds on phase 2's change vocabulary and applier and phase 3's readers, which don't exist yet, and it's the phase that can be cut. The phase 3 share (the settle stamp, the batched index, index from the read) belongs in phase 3's plan, because it follows the page reader's signature.

##### Lines, This Slice

Judgment estimates, ±30%, production code only. *§Inventory & Collapse*'s −640/+300 spans every phase and the shared files (`liveTree`, `confirm`, `walkCache`'s collapse); these figures are what phases 3 and 5 do in this slice's own files.


- **Phase 3:** about 160 removed and 120 added (`stampListed` and the adopted-id branches; `indexWrittenPage`'s read; five writes and five wrappers → one batch; the seed's traversal only if the walk takes the corpus, else about 40 fewer removed; plus the stamp pass and the unreadable transform).
- **Phase 5:** about 165 removed and 140 added (the three disk patchers, the batch forfeit, the push-list derivations and the walk-only tail, against walk-as-diff and landing emits).

#### Out-of-Slice

- **Mutation Writers:** `treePatch.ts` (576 lines) is a second applier beside `patch*FromDisk`; the law's largest savings are likely there and in `routeMutation` (`mutatePatch.ts:113-194`), judged from size and a partial read.
- **Adoption:** `stampPage` reads and parses every page on every open, stamped or not (`adopt.ts:58-70`).
- **Views/Matrix:** page values come from two sources with two different Last Modified stats (`loadValues.ts:42-60` vs `matrixGraph.ts:17-34`).
- **Window Caches:** every push stabilizes the whole tree (`nexusSlice.ts:186-189`).
- **Contexts/Properties Sweeps:** the sweeps don't patch the tree (`governedSweep.ts:72-91`), so Space/Context deletes rely on the walk (`mutatePatch.ts:119`).
- **Trash:** it maintains the index directly (`spend.ts:262`, `delete.ts:101`), and a folder restore walks (`mutatePatch.ts:144-148`).
- **Tiles:** `tileHeadingLinks` is a second mini-index held in a module-level promise (`tilesFile.ts:283-304`).
- **Menus:** a `commands` change in `settings.json` reaches the window but not the native menus until the next open or launch (`main.ts:172-177,324,401`).

#### Confidence

- **Baseline:** all citations are against `d7d00240d`.
- **Code-Read Only:** nothing was observed live except the corpus sizing, taken by a script that applies the walk's and the seed's folder rules to NexusOS and `~/Test`. Inferred from options and code paths rather than seen:
  - chokidar's event sequences for Finder/Obsidian create-then-rename, and whether a folder moved in from outside emits an `add` per child
  - how `awaitWriteFinish` groups a 200-file landing into settles
  - parse counts under concurrency
- **Estimates:** the surviving and added LOC figures are judgment calls, ±30%.
- **High Confidence:** these are direct code paths:
  - the Unknown-admission re-walk
  - the batch-walk skip
  - the stale index after a preserved-time sync landing
  - the in-place node mutation
  - the stamp's echo recording and locks
  - F-620's unreported walk
