#### Model

**Re-grounded:** 09-30-2026 at `d7d00240d`

`NexusTree` (tree.ts:89-115) is one root object. It holds entities, config, derived values and session bookkeeping, and all of it is pushed together as one message.

| Field | Class | Readers (non-test, Core/Desktop) | Does a change to this field alone push the whole tree? |
|---|---|---|---|
| `collections` (nested Collection→Set→Page) | Entity | Everywhere | n/a |
| `contexts` (`{def, spaces}`) | Entity: defs come from the registry, Spaces from sidecars | Everywhere | n/a |
| `nexus.id` | Entity (nexus.json) | **Host:** Navigation/handlers.ts:34,42, Sync/handlers.ts:70. **Window:** NexusRows.tsx:46, TrashFrame.tsx:62, NavGallery.tsx:43, useNavThumbnails.ts:68, PropertyPanel.tsx:145, CardsView.tsx:156, nexusSlice.ts:208,230 | Only through a full walk. nexus.json is treated as structure (watchPatch.ts:118-126,165) |
| `nexus.rootPath` | Session bookkeeping | **Host:** liveTree.ts:61 (`heldTreeOf`, which settings.ts:40, contextWrite.ts:157, tilesFile.ts:65, cascade.ts:60,124,206, watchPatch.ts:233, valuesChanged.ts:70,103 and assignment.ts:38 read through), confirm.ts:14. **Window:** HomepageView.tsx:17, useBridgeSubscriptions.ts:22 | Only on re-open |
| `nexus.name` | Derived: the folder's basename (readNexus.ts:358) | **Window:** HomepageMenu.tsx:43, HomepageView.tsx:12, crumbs.ts:53, treeIndex.ts:64 | Only on re-open |
| `nexus.profileImage/profileIcon` | Config (settings.json) | **Window:** useNexusIcon.ts:11-12, EntityIcon.tsx:48, treeIndex.ts:65 | Yes. The settings patch always builds a new root (watchPatch.ts:427-440; mutatePatch.ts:141-143) |
| `nexus.profileSubtitle` | Config | **None.** It's decoded (codec.ts:99), carried (readNexus.ts:361) and patched (watchPatch.ts:438), but a case-insensitive grep of Core/UIX/Desktop finds no reader | Yes, for a value nothing reads. It can be removed |
| `homepage` | Config (homepage.json) | **Window:** HomepageView.tsx:13-14, NavBanner.tsx:17, nexusSlice.ts:269 | Yes (watchPatch.ts:462 always builds a new root; mutatePatch.ts:131) |
| `crops` | Config | **Window:** ImagePicker.tsx:51, AssetImage.tsx:36 | Yes (watchPatch.ts:467) |
| `pageMetadata` | Config, keyed by page id | **Window:** Sidebar.tsx:317, pageRow.ts:20, useViewHost.ts:82,87, editorHost.tsx:70, matrixInput.ts:41,110, pickTree.ts:30, store.ts:64, treeIndex.ts:98. **Host:** watchPatch.ts:476 | Yes, when the content differs (watchPatch.ts:478; pageMetadata.ts:47) |
| `contextOrder` | Config (state.json) | **Window:** PropertyPanel.tsx:201,245. **Host:** watchPatch.ts:452 | Yes, when the order moved (watchPatch.ts:452-455) |
| `personalization`, `commands` | Config | **Window:** nexusSlice.ts:196-200 copies both into the store, where dozens of surfaces read them; `defaultIcons` is also read off the tree by treeIndex.ts:59, contextIdentity.ts:31 and sidebarDndModel.ts:58, and configSlice.ts:48-52 re-identifies the tree for that one key. **Host:** settings.ts:37-55 (`liveLeaves`, `readLivePersonalization`, `readLiveCommands`, `readLiveSetting`), which feed main.ts:174,211 and the host's other setting reads | Yes (Settings/handlers.ts:44-51) |
| `excluded`, `assetDirectory` | Config | **Host:** settings.ts:49-50 (`readWatchScope`, which the watcher, the index seed and the asset protocol at main.ts:144 use). **Window:** ExcludedDirectoriesRow.tsx:23, frames.ts:136, AssetDirectoryRow.tsx:14, filePick.ts:84, FileEditor.tsx:16 | Worse than a push: `confirmRescope` runs a full walk, an index seed and a watcher re-arm (confirm.ts:58-64) |
| `registry` | Config (properties.json) | **Window:** PropertyFrame.tsx:210, PropertyPanel.tsx:153, entityMenuActions.ts:61, MatrixMenu.tsx:146, matrixInput.ts:108. **Host:** watchPatch.ts:388, treePatch.ts:327, restoreScrub.ts:62 | Yes, when it changed (treePatch.ts:338). An external edit triggers a walk (watchPatch.ts:121) |
| `unreadable` | Session bookkeeping | **Host only:** watchPatch.ts:144, remintLedger.ts:121, tilesFile.ts:45, treePatch.ts:161 | It rides every push, and the window never reads it |

**Derived values inside entity nodes:**
- `CollectionNode.properties` joins the Collection's assignment list against the registry (readNexus.ts:198-208, watchPatch.ts:386-389). `repointRegistryInTree` (treePatch.ts:326-341) keeps each definition reference-identical in both places.
- `CollectionNode.cached` lists the properties a Remove cached values for (containerFields.ts:21-24; readNexus.ts:230, watchPatch.ts:391).
- The order of the `sets`/`pages` arrays comes from each sidecar's `set_order`/`page_order` (containerFields.ts:36-37). Collection order and Space order come from state.json (readNexus.ts:270,331).
- `contextValues` is resolved during the walk (readNexus.ts:333-352).

**Mechanism:** Every lookup projection is cached per root object in a WeakMap (treeIndex.ts:46, valuesChanged.ts:43,85, remintLedger.ts:20, contextOptions.ts:6). Every config patch builds a new root (watchPatch.ts:428,445,462,467,478). So writing a crop, an icon or a setting throws away every entity lookup table in both processes. Only contextIdentity is keyed on a sub-slice (contextIdentity.ts:23-33), and `setIndexOf` on the container node (setIndex.ts:10). This is the mechanism behind F-186's measured cost.

**Constraints the design has to absorb:**
1. **Duplicate ids are a real, held state.** The tree holds both claimants. The remint pass needs the list of claimants (remintLedger.ts:30-66), and title resolution needs duplicates kept so it can answer "ambiguous" (treeIndex.ts:1). The Decision Log's *§Architecture* keeps the tree path-addressed with an id-to-claimants lookup beside it.
2. **Child order is config stored inside the entity's own sidecar** (containerFields.ts:36-37). One sidecar write is therefore both an entity change and a config change.
3. **Adopted ids are a hash of the path** (ids.ts:47-49). A rename or move changes the id of every id-less entity beneath it (mutatePatch.ts:150-157). E-6 retires temporary ids, which removes this constraint.
4. **Unknown pages are neither records nor absent.** They sit in `unreadable` (readNexus.ts:128,148-149), so the store needs a third state; E-2 and M-2 make it a notice the window shows.
5. **Several confirms re-read on purpose because the writer normalizes** (mutatePatch.ts:122,199-209). "The writer produces the change from what it wrote" requires writers to return the normalized value. `updateNexusFile` already does (atomicWrite.ts:192-202).

#### Finders

Side means host-safe, window-only, or usable from both. Duplicate-id policy is which match wins when two entities share an id; n/a means the lookup is by path, and paths are unique.

| # | Function | file:line | Answers | Algorithm | Cached | Side | Duplicate-id policy | Duplicates |
|---|---|---|---|---|---|---|---|---|
| 1 | containerTrailWhere / findContainerWhere | treePatch.ts:209 / :214 | Container matching a predicate, with its trail | Recursive DFS keeping a trail (`trailIn`, :193), pre-order | No | Both | First match | 18, 28 |
| 2 | containerAt | treePatch.ts:237 | Container at a path | Calls 1 | No | Both | n/a | 8, 9 |
| 3 | pageAt | treePatch.ts:240 | Page at a path | Calls 2, then a linear find | No | Both | n/a | 11, 21 |
| 4 | spaceAt | treePatch.ts:243 | Space at a path | flatMap then linear find; allocates on every call | No | Both | n/a | 9 |
| 5 | contextAt | treePatch.ts:246 | Context at a path | Linear; recomputes each Context's folder path | No | Both | n/a | 22's path derivation |
| 6 | pageIdsIn | treePatch.ts:249 | Ids of the pages directly in a container | Calls 2, then map | No | Both | n/a | 21 |
| 7 | holdsPath | treePatch.ts:252 | Whether anything sits at a path | Recursive DFS | No | Both | n/a | 2 and 3 |
| 8 | extract / insert / updateInContainers | treePatch.ts:92 / :128 / :430 | Node at a path, for rewriting | DFS that rebuilds along the way | No | Both | n/a | 2 and 3 |
| 9 | updateNodeInTree | treePatch.ts:410 | Any node at a path | Linear over Spaces, then 8 | No | Both | n/a | 4, then 2/3 |
| 10 | indexFor / walk / nodesOf | treeIndex.ts:48 / :57 / :144 | Every entity, with its parents | One DFS | WeakMap per root | Window | Keeps all | 21, 22, 36 |
| 11 | reconcileIndexOf | treeIndex.ts:146 | Set/page id→path, page path→id | Built from 10 | Yes | Window | Last match | 21 |
| 12 | resolveIndexOf | treeIndex.ts:178 | Nav key→title, icon, parents | Built from 10 | Yes | Window | Last match | 13 |
| 13 | ancestryOf / trailOf | treeIndex.ts:192 / :188 | Parent chain of an entity | Map built from 10 | Yes | Window | Last match | 1's trail |
| 14 | pagesOf | treeIndex.ts:234 | All pages | List built from 10 | Yes | Window | Keeps all | 21's walk |
| 15 | pagesByIdOf / livePagePath | treeIndex.ts:250 / :245 | Page by id | Map built from 14 | Yes | Window | Last match | 21/23 (null on duplicate), 16 |
| 16 | recordsByIdOf | treeIndex.ts:256 | Any entity by id | Map built from 10 | Yes | Window | Last match | 22 (first match) |
| 17 | findCollection | treeIndex.ts:293 | Collection by id | Linear | No | Window file (the logic itself is pure) | First match | 16 |
| 18 | findSet | treeIndex.ts:298 | Set by id | Calls 1 | No | Window file | First match | 16 |
| 19 | owningCollection / containerSchema | treePatch.ts:220 / :232 | Collection that owns a path; its schema | First path segment, then `tree.collections.find` | No | Both | First match | None. `ed0fcaf0a` replaced `findCollectionForSet`, `isDepth1Set`, `resolveContainerSchema`, `collectionOfPage`/`schemaForPage`, `collectionFolderOf`'s prefix scan and Trash's inline scan with this pair |
| 20 | spaceNodeOf / findSpace | treeIndex.ts:330 / :338 | Space by id | Nested linear | No | Window file | First match | 16, 35 |
| 21 | indicesOf | valuesChanged.ts:45 | Page path↔id | DFS | WeakMap per root | Both (a host module the window also imports) | Null on duplicate | 11, 15 |
| 21a | titlesOf | valuesChanged.ts:87 | Page title→paths | DFS | WeakMap per root | Host | Keeps all | 14, 39 |
| 22 | projectBaseline / buildBaseline | remintLedger.ts:22 / :30 | Every entity by id, plus claimants of shared ids | DFS over Contexts and Collections | WeakMap per root | Host | First match (`??=`, :37); adopted ids left out (:34); at open, duplicates are overwritten with the eldest claimant (:113). It is also the "is this id live" check in Trash/resolve.ts:35, spend.ts:264, restoreProperty.ts:70 and assignment.ts:83 | 10, 16 |
| 23 | pageIdIndex / liveIdIndex / liveIdOf / livePathOf | valuesChanged.ts:65/:74/:77/:81 | Page id↔path, on the live tree, pinned to the open root | Calls 21 | Yes | pageIdIndex both (the window uses it at PageTile.tsx:76); the rest host | Null on duplicate | 15 |
| 24 | subtreeHoldsAdoptedId | mutatePatch.ts:78 | Whether an adopted id sits under a path | DFS over all containers with a prefix test | No | Host | n/a | 10 |
| 25 | within / containersOf | configReach.ts:280 / :327 | All containers under a path | Recursive flatten of every Collection, then filter by absolute-path prefix | No | Host | Keeps all | 38, FilterFrame.tsx:319 |
| 26 | goneEdit | configReach.ts:285 | Wraps 5, 4 and 2 | n/a | No | Host | n/a | n/a |
| 27 | tileHostAt | watchPatch.ts:109 | Space for a tile path | Calls 4 | No | Host | n/a | n/a |
| 28 | findContainerById | Trash/resolve.ts:26 | Container by id | Calls 1 | No | Host | First match | 18. `ed0fcaf0a` retired `containerChain`; Trash's crumbs read 1's trail |
| 29–32 | — | — | Closed by `ed0fcaf0a` into 19: the inline owner scan (Trash/spend.ts), `collectionOfPage`/`schemaForPage` (pageRow.ts), `collectionFolderOf`'s prefix scan (now assignment.ts:158-161 over 19). `collectionFolders` (assignment.ts:154) and `assignedDefs`'s held-tree find (:38-41) remain linear over `tree.collections` | | | | | |
| 33 | loadValues `corpus` | Views/loadValues.ts:30 | Files for a set of page ids | Calls 23 | Yes | Host | Null on duplicate | 15 |
| 34 | dropPageMetadata visitor | pageMetadata.ts:121 | All page ids | Uses 1 as a visitor | No | Host | n/a | 14 |
| 35 | identityOf | contextIdentity.ts:29 | Context/Space identity by id | Loop over contexts | WeakMap on `tree.contexts` plus `defaultIcons` | Window (entityIconPolicy.ts imports UIX) | Last match | 16, 20 |
| 36 | matrixTree | Matrix/matrixInput.ts:31 | All pages and folders, with their parent | DFS | Held per tree by its caller (matrixRuntime.ts:148) | Window | Keeps all | 10 |
| 37 | setIndexOf | Views/Pipeline/setIndex.ts:12 | Set id→node and parent under a source | DFS | WeakMap per container node | Window | Last match | 16. `47c16173d` replaced `buildSetMap` and GroupFrame's hand walk |
| 38 | flattenContainer | Views/Pipeline/group.ts:130 | All pages under a container | DFS | No | Window | n/a | 14 filtered by 13 |
| 39 | spacesByTitle / idsByExactTitle | contextResolve.ts:38 / :32 | Space by title, Context by title | Map rebuilt on every call and every key (F-200) | No | Both | Last match | 35 |
| 40 | loadContextWorld `spaceById` | Contexts/contextWrite.ts:64 | Space by id, read from disk | Serial strict sidecar reads | No | Host | Last match | 4, 20, 35 (F-201) |

At the pin, these call sites added no new finder: creationOrder.ts:84, createActions.ts:20, editSlice.ts:140-143, keyHolders.ts:81, tilesFile.ts:201. Those lines have moved and weren't re-checked at HEAD.

Where two entities share an id, the finders disagree three ways:
- **First match wins:** 1, 17–20, 22, 28.
- **Last match wins:** 11–13, 15, 16, 35, 37, 39, 40.
- **Answers null:** 21, 23.

Six cached full-tree traversals exist (10, 21, 21a, 22, 36, and 35 over the contexts), 37 caches per container, and 1, 24, 25 and 28 re-walk the tree on every call.

#### Open Sequence

**Entry paths:**
- **Launch:** `main.ts:382-384` awaits `openNexusSequence(hostContext(null), restore, true)` before `createWindow()` at main.ts:400. There's no `whileAdopting` and no `ctx.adopted`; `watchNexus()` arms the watcher at main.ts:402.
- **In-session open:** `adoptNexus` (handlers.ts:104-113) runs `whileAdopting`, then the same sequence, then `ctx.adopted` (main.ts:311-325).
- **Re-point** (`nexus:rename`, handlers.ts:151): passes `latchRecord: false`.

1. **handlers.ts:58-61:** Stop sync, retire the old root's file history, then `openSession` (realpath; installs the session root, session.ts:37-42). No reads from the Nexus.
2. **handlers.ts:64-68:** On a new root, clear the kept-read map (`forgetLastReads`), drop the live tree, and drop the tile heading links.
3. **handlers.ts:69 `readNexusConfig`:** Reads nexus.json, settings.json and properties.json through `readKept` (config only) and installs `lastRead` copies. On failure it installs a waiting session with stores opened on no id (:71-76).
4. **handlers.ts:78 `prepareOpenedNexus`:**
   - **a.** `ensureIdentity` (identity.ts:17): strict read of nexus.json; may write it and seed the Agenda folders.
   - **b.** `ensureConfigLayout` (migrateConfig.ts:31): 3 folder creations and 3 legacy renames.
   - **c.** `ensureContextsRegistry` (contextsRegistry.ts:21): strict read; seeds the file if it's absent.
   - **d.** `normalizeSavedViews` (migrateConfig.ts:76): recursively lists all of `.trash` and every tile-host folder, then read-modify-writes every trash sidecar and tile doc.
   - **e.** `normalizePropertyTypes`: read-modify-writes properties.json.
   - **f.** **`stampAdopted` (adopt.ts:166) reads the whole corpus, one file at a time.**
     - It reads settings and identity, then runs `agendaContext`, which lists the root and reads 2 Agenda sidecars per root folder.
     - For every root folder it resolves the folder kind, then runs `stampTree` (:130), which recurses into every non-excluded subfolder. Along the way it:
       - read-modify-writes every container sidecar (`stampFolder`, :104-116);
       - reads every content file in full under that file's lock (`stampPage`, :58-70, via atomicWrite.ts:251-263);
       - writes ids and sidecars wherever they're missing.
5. **handlers.ts:79-80:** Stop sync again, then `ctx.openStores`, which opens nexus.db and versions.db (main.ts:309-310).
6. **handlers.ts:81 `replayPendingRename`:** Reads the Context rename journal and cascades only if one is pending.
7. **handlers.ts:83:** `void sweepFileHistory` on versions.db, not awaited.
8. **handlers.ts:85 `runOpenLedger` (remintLedger.ts:117):**
   - **a.** **`readNexus` (:119) reads the whole corpus in parallel.** Changing the root cleared the parse cache (walkCache.ts:18-21). So every Collection page is read and YAML-parsed (readNexus.ts:124-126), along with every container and Space sidecar, the config leaves, every metadata shard and the contexts registry. `agendaContext` runs again.
   - **b.** Reads the baseline from the DB, builds `projectBaseline`, runs `runRemintPass` (writes), `applyRemints`, and `recordEldest` (stats each claimant), then writes the baseline back to the DB.
   - **c.** `seedLiveTree(tree)` (:129) installs the live tree unconditionally (F-210).
   - **d.** If anything was reminted, `refreshTree` (:132) runs a **second whole-corpus walk**. It stats every file; everything except the reminted files is a parse-cache hit.
   - With `latchRecord: false`, only `refreshTree` runs (handlers.ts:87-91).
9. **handlers.ts:93 `seedContentIndex` (indexSeed.ts:185) covers the whole corpus, one file at a time.**
   - It lists `corpusFiles`, which is wider than the tree: it also covers un-adopted folders, root-level files and the Agenda folders.
   - It stats every file, then fully reads and extracts each file whose modification time or size moved. On a cold DB that's every file.
   - It installs the index rows and the ready stamp, and returns the pages it re-read bound to the database it read them into (`SeedReread`, :178-183; `5003a1c7f`). A cold index, a bail or a failure returns none.
10. **handlers.ts:94-97:** `replaySchemaCascade`; if a journal replayed, `refreshAfterWrite` runs **another whole-corpus walk**.
11. **handlers.ts:98:** `void runRepairSweep(root, reread)`. When the seed re-read pages on a warm DB, it loads the Context world, reading every Space sidecar strictly one at a time (contextWrite.ts:60-90), then read-modify-writes exactly the pages the seed re-read (repairSweep.ts:20-53), bailing if the database moved.
12. **handlers.ts:100:** `void startSession` (sync).
13. **main.ts:400-402:** Create the window. `refreshMenu` reads commands from the live tree (main.ts:174). `watchNexus` starts the watcher, which reads the watch scope from the live tree and starts chokidar with `ignoreInitial`; chokidar's initial crawl is inferred to be a full listing.
14. **Window:** `nexus:state` returns the held tree through `liveTreeOf` (handlers.ts:116-121) with no disk read. The window's `applyTree` (nexusSlice.ts:186-201) runs `stabilize` (:189) and a full treeIndex walk through `reconcileIndexOf` (:191) synchronously; `44885c23c` removed the once-per-Nexus gates, so no push lands between the reply and its apply.

**How many whole-corpus passes:**
- **Steps that touch the whole corpus:** 4f, 8a, 8d (only after a remint), 9, and 10 (only after a schema replay).
- **Every launch:** reads every Collection page in full **twice** before the window exists (4f one at a time, 8a in parallel).
- **Cold DB** (first open on a device, or an index-generation bump): adds a **third** full read, over a wider corpus (9).
- **Warm DB:** the repair sweep re-reads the pages the seed re-read a third time (11).

**One read could do the work of these.** Step 8a already holds each page's full text (readNexus.ts:124) and its stat (walkCache.ts:39). Those bytes can answer:
- adoption (F-197's walk-first fix);
- `extractPageIndex`, which takes the content as input;
- the seed's modification-time gate.

**What stops a simple merge:**
- The corpora differ: the tree covers Collections only, while the seed covers all of `corpusFiles`.
- The seed has to bail out if the DB is swapped mid-run (indexSeed.ts:188-219).
- Adoption's writes have to land before the ledger adjudicates ids.

#### Per-File Readers

| File kind | Reader | file:line | Used by | Cache | Id rule | Differences |
|---|---|---|---|---|---|---|
| Page | readPageRecord | readNexus.ts:122 | Walk, watcher, loadValues | walkCache | Admission: the member id, else `adoptedId(rel)`; Unknown → null → `unreadable` | Keeps `<Context>` keys in a WeakMap (:103-114); contexts are attached later by mutating the node (:338) |
| Page | patchPageFromDisk | watchPatch.ts:319 | Watcher, confirms, stampListed | Through readPageRecord | Same | Resolves contexts with `resolveEntityContexts` and writes them onto the cached node (:333-334); re-reads the container sidecar just for `page_order` (:341) |
| Page | pageValuesOf / loadValues | Views/loadValues.ts:18,42 | View values | Through readPageRecord | Same | Decodes the frontmatter again through the `pageFrontmatter` zod schema; created time comes from the id; no contexts (the window resolves them at pageRow.ts:20) |
| Page | readPageDetail | Files/pageFile.ts:168 | `page:open` (Pages/handlers.ts:19-25) | None | **No admission check:** any string `ID` is used, even a malformed or wrong-kind one; else `adoptedId` | Returns the body and its hash; no contexts |
| Page | extractPageIndex | Index/indexSeed.ts:44 | Seed, indexWrittenPage | DB stat gate | `sweepAdmitsBody`; no id (the index is keyed by path) | Titles stay unresolved; any `<Title>` key counts |
| Page (id only) | pageAdmission / stampPage / ensurePageId | adopt.ts:72,58,77 | Adoption, restoreScrub, writePageMeta | None | Admission | `ensurePageId` stamps with the `page` kind only |
| Page (id only) | stampListed | adopt.ts:90 | The delete's Link strip (cascade.ts:130), keyedHolders (keyHolders.ts:59) | None | Stamps only a page the live tree lists under an adopted id, then patches and re-indexes it | Added after the pin (`b111d3605`, `6d296248e`) |
| Page (id only) | stampedId | pageFile.ts:46 | Trash gather/spend/holdings, cascade, Sync | None | Raw string | n/a |
| Container | readSet / readPageCollection | readNexus.ts:177,210 | Walk | walkCache | `id`, else adopted id. An unparseable sidecar becomes `{}` and is listed in `unreadable`; the node is kept | Title is the folder name; children are read fresh; `properties` comes from the registry on disk |
| Container | patchContainerFromDisk | watchPatch.ts:360 | Watcher, confirms, confirmBy's sidecar ledger | None | An id mismatch or an unparseable sidecar sends it to a walk | Title and children come from the held node; `properties` comes from `tree.registry`. The Collection-only tail (:383-392) duplicates readNexus.ts:228-230 |
| Container | zod `pageSetSidecar` / `pageCollectionSidecar` | schemas.ts:50,61 | Tests only | n/a | n/a | Missing `heading_icon_hidden` |
| Space | readSpace | readNexus.ts:235 | Walk | walkCache | `id`, else adopted id. An unparseable sidecar is skipped and listed in `unreadable` | Uses `spaceFieldsFrom`; contexts are attached in the walk's second pass |
| Space | patchSpaceFromDisk | watchPatch.ts:397 | Watcher, confirms | None | An id mismatch or an unparseable sidecar sends it to a walk | Contexts come from `resolveEntityContexts` |
| Space | loadContextWorld | Contexts/contextWrite.ts:60 | Context and property writes, repair sweep, create | None; strict; one file at a time | `id`, else adopted id. One bad sidecar fails the whole load | Builds a bare `{kind,id,title,path,contextId}` with no icon, banner, color or values; keeps the raw sidecar |
| settings.json | readSettings → readSettingsLeaves | codec.ts:108,90 | Walk, watcher, liveLeaves, adoption | readKept | n/a | One decoder |
| state.json | readOrder | readNexus.ts:54 | Walk, patchOrderFromDisk | readAppFile | n/a | `readNavigationFile` (navigationFile.ts:24) decodes the other half of the file |
| homepage.json / crops.json | readHomepageLeaves / readCropLeaves | readNexus.ts:43,50 | Walk and watcher patch | readAppFile | n/a | One decoder each |
| Metadata shard | readShard / withShards | pageMetadata.ts:30,36 | Walk and watcher patch | Strict | n/a | One decoder |
| properties.json | normalizeRegistry | propertiesRegistry.ts:19 (kept read :49, strict read :42) | Walk / confirm | n/a | n/a | One decoder, two failure policies |
| Contexts registry | Walk read | readNexus.ts:303,309 | Walk | walkCache | n/a | Lenient: an unusable file blanks the Contexts layer and is listed in `unreadable` |
| Contexts registry | readRegistryStrict | contextsRegistry.ts:27 | Writers, Context world | None | n/a | Strict; same zod schema |
| nexus.json | readIdentity / ensureIdentity | identity.ts:12 / :17 | Walk and adoption / open | Kept / strict | n/a | Two failure policies |

**How many independent readers per file kind:**
- **Pages:** 3 full readers (readPageRecord, readPageDetail, extractPageIndex) with 3 different id rules, plus a fourth partial decode (`pageValuesOf`'s zod pass) and 3 id-only paths (admission, `stampListed`, `stampedId`).
- **Containers:** 2 node builders. They share `containerFieldsFrom` but duplicate the Collection-only fields, and there's a third, partial read for `page_order`.
- **Spaces:** 3 readers; loadContextWorld's nodes lack 5 fields.
- **Config leaves:** already one decoder each.
- **Registry and identity:** one decoder with two failure policies. That's deliberate: strict reads gate writes, kept reads serve reads.

#### Inventory

LOC counts non-blank, non-comment lines at HEAD. "Reached by" names the mandate point and phase that changes the row; rows it leaves alone say so.

| Row | LOC | Job | Twin | Reached by | Safety property |
|---|---|---|---|---|---|
| tree.ts · model types | 77 | NexusTree and node shapes | Parallel to record.ts and treeIndex's NodeRecord | Phase 1: kinds derive from `entities.ts`; config fields leave the root | n/a |
| tree.ts · AssetMap / ValueChange | 14 | Wire types that aren't tree fields | Unique | Not affected | n/a |
| schemas.ts | 55 | zod decoders | Its container schemas are a test-only twin of containerFields | Phase 1 (`ContainerKind`); phase 3 (the container schemas become the one reader's decoder, or go) | looseObject keeps foreign keys (:1) |
| record.ts | 8 | Baseline tuple | Parallel to treeIndex.ts:19-30 | Phase 1 (`RecordKind` derives) | n/a |
| containerFields.ts | 38 | Container sidecar → fields, ordered children, `cached` | Shared by walk and watcher | Phase 3: the container reader | n/a |
| order.ts | 21 | Apply persisted order, with id/title fallback | Parallel to reorderById (treePatch.ts:401) | Phase 2 (B-4's one ranking rule) | ULID byte order (:12) |
| coerce.ts | 6 | Coercions | Unique | Not affected | n/a |
| readNexus · config leaves | 21 | homepage / crops / order decoders | Unique; walk and watcher share them | Phase 1: they fill the config record | n/a |
| readNexus · per-file readers | 151 | Page / container / Space / sidecar → node | Parallel to watchPatch.ts:319-416, loadContextWorld, readPageDetail | Phase 3: one reader per kind | adoptedId fallback (:130,191,225,245); a corrupt sidecar keeps its node and is listed unreadable (:87) |
| readNexus · context attach | 41 | Raw `<Context>` keys → contextValues | Duplicate of watchPatch.ts:332-334,413-414 and resolveTreeContextKeys | Phase 3 (stored raw keys) and phase 4 (G-3's one lookup) | Cache doesn't depend on the registry (:102) |
| readNexus · walk assembly | 134 | Enumerate, order, assemble the tree | Parallel to the treeIndex walk, buildBaseline, indicesOf | Phase 1 (config split); phase 5 (walk-as-diff) | An unusable registry blanks the layer and marks it unreadable (:313-315) |
| folderKind.ts | 87 | Folder kind decision | Unique | Not affected; the watcher's stamp calls it | Agenda claim counting (:77-98) |
| identity.ts | 56 | Read and ensure nexus.json | Unique | Not affected | Damaged file reads as last parse (:11-15); an id-less file isn't a new Nexus (:38-42) |
| identityMark.ts | 35 | Admission and kind mark | Unique | Not affected; its `unknown` reasons map to E-2 and E-4 | Unknown stays invisible (:43-49) |
| ids.ts | 41 | Id minting, adoptedId | Unique | Phase 3 (E-6 removes `adoptedId`, `isAdoptedId`, the `idTime` guard) | Path-hash adopted id (:47-49); timestamp seed clamp (:11-14) |
| adopt.ts · corpus stamp traversal | 59 | Walks every folder and page to stamp ids | Parallel to the readNexus walk (F-197) | Phase 3: stamps from the walk's read | One failing folder doesn't stop the rest (:141,145,153,178,188) |
| adopt.ts · stampListed | 11 | Stamps a listed id-less page on demand | Unique | Phase 3: goes with E-6 | n/a |
| adopt.ts · folder rules and page stamp | 114 | Re-home Agenda folders, stampFolder, sidecar migration, ensure ids | Unique | Phase 3: `stampPage`/`stampFolder` become the watcher's stamp | Modification time preserved (atomicWrite.ts:18-27); empty-folder rule (:181-188) |
| remint.ts · adjudicate and writes | 118 | Fresh ids on disk | Unique | Phase 1 (I-1's Context re-mint) | Re-reads inside the lock (:78-79,100-102); tile board written first (:90-97) |
| remint.ts · applyRemints | 17 | Hand-written applier over the baseline projection | Parallel to the treePatch transforms | Phase 2: the remint emits changes | n/a |
| remintLedger.ts · baseline projection | 61 | Tree → id→record plus claimants | Duplicate of the treeIndex walk and indicesOf | Phase 2/3: the id-to-claimants lookup | First match wins; adopted ids left out (:34-37) |
| remintLedger.ts · latch / eldest / open | 76 | Baseline IO, eldest pick, seeding | Unique | Phase 2: the post-remint re-walk becomes applying the remint's own changes, so F-210 can't occur | Eldest by birth time (:95-115); unreadable entries carried (:83-91) |
| migrateConfig.ts | 85 | One-time normalizations | Unique | Not affected | n/a |
| pageMetadata.ts | 160 | Shard read and write | Unique | Phase 1 (the config record holds it) | Each id owns its creation-month shard (:36-48) |
| page.ts | 108 | Page writers | Unique | Phase 2 (writers emit changes) | Lock on the source path (:54-61) |
| treePatch.ts · factories and imports | 64 | Node constructors | Unique | Survive as the applier's constructors | Identical key sets, which `stabilize` relies on (:10) |
| treePatch.ts · finders | 53 | Lookups by path or predicate, owner and schema | Parallel to treeIndex finders | Phase 2 (the id lookup) | n/a |
| treePatch.ts · transforms | 400 | Extract, insert, reparent, rename, move, reorder, create, Context ops | Parallel to the window's switch (F-187) and the watcher's patch arms | Phase 2: become the shared applier | NEW_SLOT placement (:122-127); unreadable paths follow renames (:155-174) |
| treeIndex.ts · walk and imports | 133 | One record walk, with icons | Duplicate of buildBaseline, indicesOf, matrixTree | Phase 1: its icon and homepage fields read config (see *§Plan Inputs*) | n/a |
| treeIndex.ts · projections | 129 | Reconcile, resolve, ancestry, search, pages, nav keys | Parallel to indicesOf and identityOf | Phase 2 (incremental projection identity) | Duplicate ids stay listed so titles can answer "ambiguous" (:1) |
| treeIndex.ts · id finders | 8 | findCollection, findSet | Duplicate of findContainerWhere | Phase 2 (the id lookup) | n/a |
| treeIndex.ts · spaceLinks and owners | 54 | Space link map, BannerOwner | Unique | Not affected | n/a |
| treeStabilize.ts | 25 | Recycles unchanged objects by deep comparison | Unique | Phase 2: its tree-push role goes; still serves pageMetadata, assetMap, matrix | n/a |
| valuesChanged.ts · write ledgers | 60 | Noted writes → `values:changed`; sidecar-write ledger; frozen world | Unique | Phase 2: retired by B-2 | Ledger is scoped to one root (:8-18) |
| valuesChanged.ts · indices | 53 | Page path↔id, title→paths | Duplicate of reconcileIndexOf / pagesByIdOf | Phase 2 (the id lookup) | Null on duplicate id (:53); pinned to the open root (:69-72) |
| liveTree.ts · single-flight walk | 70 | Install or discard a walk; the held-tree pin | Unique | Phase 1 (the config record gets a held slot); phase 5 (the walk returns a diff) | A walk that raced a write discards and re-runs (:26-27,36-39,109); a superseded walk installs nothing (:108); a vanished root clears the tree (:100-105) |
| liveTree.ts · mutableTarget / holds | 23 | Admits a path for a given kind | Parallel to classifyEvent's lookups | Phase 1 (`MutableKind` derives) | Root, `.nexus` and trash are never targets (:67) |
| session.ts | 34 | Session root, adopting gate | Unique | Phase 1 (I-1's interleaved opens) | Canonical realpath root (:36-42); writes answer BUSY while adopting (:15-23) |
| walk.ts | 75 | Folder enumeration | Unique | Not affected; could feed both the walk and the seed | A refused subtree is never entered (:52) |
| walkCache.ts | 49 | Modification-time-gated parse cache | Unique | Phase 3: cached values become immutable records, so F-211 can't happen | Racy window (:3-4,48); a parse that straddled a forget isn't cached (:38,55); null results aren't cached (:54-55) |
| pageFile.ts · read half | 59 | Frontmatter split, readPageDetail, admission helpers | readPageDetail parallels readPageRecord | Phase 3: `readPageDetail` becomes the one page reader's caller | n/a |
| pageFile.ts · write half | 104 | Merge, serialize, write | Unique | Not affected | Broken frontmatter is never re-serialized (:49-51) |
| sidecar.ts | 33 | zod sidecar read, sidecar patch | Unique | Not affected | A patch on an id-less sidecar is refused (:30-34) |
| spaceSidecar.ts · enumeration and decoder | 57 | Space folders, spaceFieldsFrom | Parallel to loadContextWorld's inline decode | Phase 3: the one Space decoder | n/a |
| spaceSidecar.ts · row order | 24 | `$order` edits | Unique | Not affected | n/a |
| contextResolve.ts · link resolution | 65 | `<Title>` → Space ids | Duplicate lookups (F-200) | Phase 4 (G-3) | Keys must match exactly (:31) |
| contextResolve.ts · governed reconcile | 58 | Reconcile for sweeps | Unique | Not affected | Never shrinks a value it can't resolve (:128-138) |
| contextIdentity.ts | 62 | Context and Space identity maps | Parallel to the treeIndex walk | Phase 1 (its `defaultIcons` read moves to config) | Keyed on the contexts slice and `defaultIcons` (:23-33) |
| contextsRegistry.ts | 41 | Strict registry IO | Parallel to readNexus.ts:303-310 | Not affected; the walk could share `parseRegistry` | Strict, never falls back to empty (:32) |
| propertiesRegistry.ts | 96 | Registry decode and mutate | Unique | Not affected | Unparsed definitions ride through writes (:29-30) |
| codec.ts | 93 | Settings decode | Unique | Phase 1 (`profileSubtitle` goes) | A file never parsed fails rather than using defaults (:107-110) |
| settings.ts · live reads | 49 | Settings served from the live tree | Unique | Phase 1: become config-record reads | Falls back to disk before a tree exists (:36-41) |
| settings.ts · writers | 90 | Scope and personalization writes | Unique | Phase 2 (writers emit changes) | n/a |
| main.ts | 403 | Protocols, window, menus, quit, open and watch wiring | Mostly out of slice | Phase 1 (I-1's menu `commands`) | Single-instance lock (:358-365) |
| handlers.ts · open sequence and imports | 105 | Open and adopt ordering | Unique | Phase 3: reordered to walk first | A re-point skips the latch (:102-103) |
| handlers.ts · other channels | 61 | State, rename, mutate, reveal | Unique | Phase 2 (the reply carries the change) | n/a |
| **Total** | **4,224** | | | | |

**Where the payoff sits:** outside this slice. `watchPatch.ts`'s patch functions (:228-491) and `mutatePatch.ts`'s routing (:41-191) are the same transforms applied by hand. So is the window's optimistic switch (nexusSlice.ts:238-293, F-187). `stabilize` on every push would also go.

#### Divergences

1. **CorePM §The Read + State Layer says "one eager, read-only walk … in a single pass".**
   - An open reads the corpus 2–3 times (see Open Sequence).
   - readNexus itself makes two traversals: it reads, then attaches contexts (readNexus.ts:323-352).
   - It also writes into objects the parse cache shares (readNexus.ts:338-339, F-211); so does the watcher's page patch (watchPatch.ts:333-334).
2. **Same section, "no per-entity cache".** walkCache keeps one decoded entry per file (walkCache.ts:15). `rawContextByNode` keeps one per node (readNexus.ts:103). `lastRead` keeps one per config file (atomicWrite.ts:145-160). The doc's own next sentence names the parse cache.
3. **"The walk runs at open and on Reload."** It also runs on:
   - every full refresh the watcher decides on (watchPatch.ts:184,215);
   - every confirm that routes to `'refresh'` (mutatePatch.ts:118,149,152-157,159-161,228-235);
   - every rescope (confirm.ts:60);
   - the post-remint walk (remintLedger.ts:132);
   - a schema replay (handlers.ts:95);
   - any read made when no tree is held (liveTree.ts:65).
4. **"Patching it in place."** The live tree is replaced as a new object (liveTree.ts:26-33). The only in-place writes are the F-211 defect.
5. **"Interface lookups derive from treeIndex."** The window also scans the tree on its own (treeIndex.ts:293-350; group.ts:130; setIndex.ts:12; matrixInput.ts:31). It also imports a host walk (PageTile.tsx:76 → valuesChanged.ts:65).
6. **CorePM §The Nexus Layout, "Every sidecar's field shape is canonical in Core/Nexus/schemas.ts".** The container zod schemas are used only by tests (schemas.ts:50-64) and lack `heading_icon_hidden`. Production decodes containers in containerFields.ts:21-44 and Spaces in spaceSidecar.ts:17,44-67.
7. **CorePM §Adoption, "Unknown is invisible and untouched: absent from the tree".**
   - Unknown pages go into `tree.unreadable` (readNexus.ts:128,148-149), whose own comment says "Unparseable, not missing" (tree.ts:113).
   - Every watcher event on such a page triggers a full walk (watchPatch.ts:144), and so does an upsert of one (watchPatch.ts:330).
   - NexusRecordPM says the opposite ("carried as unreadable"), and the code follows NexusRecordPM.
   - The result: an Obsidian note with a foreign `ID:` costs a full re-walk every time it's saved.
   - CorePM also says "Admission is the one place it is checked", yet readPageDetail skips admission entirely (pageFile.ts:168-181).
8. **PRD, "opening a folder that's also an Obsidian vault leaves notes byte-identical until the user edits them".** Adoption turns every non-empty root folder into a Collection (folderKind.ts:54-56; adopt.ts:181-188). It then stamps `ID:` into every id-less page (adopt.ts:58-70) and writes a sidecar into every folder (adopt.ts:104-116). CorePM §Adoption documents this behavior, and E-1 rules the PRD sentence the stale one.
9. **PRD, "The database is off the read path … Reads are a single filesystem walk".**
   - Some reads are served from the index, with a scan fallback: `index:headings` (handlers.ts:155-157); mention, key-holder and member queries; and the Matrix graph (contentIndex.ts:64-92).
   - The baseline in the DB is an input to duplicate-id adjudication at open (remint.ts:23-37). It isn't a dependency: without a baseline, adjudication is deferred.
   - "Single walk" fails per item 1.
10. **NexusRecordPM §Baseline.**
    - "A record per entity of id, kind, title, path, and whether it was readable": `EntityRecord` has no readable flag (record.ts:6-11).
    - "record.ts for the baseline's tuple and diff": record.ts holds only the type.
    - "The diff runs over the union of ids … the drift row keeps the last non-empty diff": no diff and no drift row exist. The `record` scope holds only `baseline` (remintLedger.ts:145-151; localState.ts:14), and its only consumer is remint adjudication and the latch.
    - "One explicit walk": it's one or two (remintLedger.ts:119,132).
11. **Hard Rule, "read-only by construction".** The walk's write into shared objects (F-211, on record) is the violation. The adoption and remint writes around the walk are documented design; they contradict item 1, not this rule.
12. **remintLedger.ts:128 says the pre-remint walk "may seed the session only when the remint wrote nothing",** but :129 seeds unconditionally (F-210, on record).
13. **treeIndex.ts:1 says "A new lookup belongs here, never as its own walk".** Its own id finders (:293-303) contradict it, as do five host walks (Finders 21, 21a, 22, 24, 25).

#### Plan Inputs

##### Phase 1 — `entities.ts`

**The hand-kept kind lists at HEAD:**

| Site | List | With the table |
|---|---|---|
| tree.ts:9 | `NodeKind` = space, collection, set, page | Replaced: derived from the table |
| record.ts:4 | `RecordKind` = NodeKind + context | Replaced: derived |
| mutateRequest.ts:32 | `mutableKind` zod enum = page, collection, set, space, context | Replaced: `z.enum(MUTABLE_KINDS)` reads the table |
| mutateRequest.ts:39 | `CONTAINER_KINDS` = collection, set | Replaced: re-exported from the table |
| schemas.ts:72 | `ContainerKind` = collection, set | Replaced: derived |
| adopt.ts:86 (pin) | a private `ContainerKind` | Closed by `65ba78ce7`: adopt imports schemas' type |
| nexusPaths.ts:48 | `SidecarKind` + `SIDECAR_FILENAME` (:50-56) | Read from. `Core/Paths` imports nothing from `Core/Nexus` today, so the table maps kind → sidecar key and Paths keeps the filenames. Agenda is keyed by folder (`tasks`/`events`), everything else by kind |
| nexusPaths.ts:36 | `AGENDA_KINDS` = task, event | Read from (or the table owns it and nexusPaths reads it; same layering question) |
| identityMark.ts:3,9 | `ContentKind`, `KIND_MARK` (P/T/E) | Read from: the table can carry each content kind's id mark |
| folderKind.ts:9 | `FolderKind` = collection, set, tasks, events, unknown | Read from |
| mutateRequest.ts:36 | `bannerOwner` = entity kinds + homepage, navview | Read from, plus the two surfaces |
| treeIndex.ts:21,28 | NodeRecord/TrailNode kinds + homepage, matrix | Read from, plus the two surfaces |
| navRef.ts:38; personalization.ts:27; sidebarDndModel.ts:10; matrixKind.ts:8 | Navigation, icon, drag and Matrix kind lists | F-212's remaining parts under W16 (C-2) |
| Trash/gather.ts:35; remint.ts:86; configReach.ts:325; bridge.ts:100-120; crumbs.ts:7; entityMenuActions.ts:146 | Inline container or kind unions | Read from (`ContainerKind` or the table's derived unions) |

**Candidate table:**

| Kind | Node type | Record kind | Mutable | Container | Sidecar | Reader (phase 3) |
|---|---|---|---|---|---|---|
| collection | `CollectionNode` | collection | Yes | Yes | `_pagecollection.json` | Container reader (today readPageCollection, patchContainerFromDisk) |
| set | `SetNode` | set | Yes | Yes | `_pageset.json` | Container reader (today readSet, patchContainerFromDisk) |
| page | `PageNode` | page | Yes | No | None; `ID` in frontmatter, mark `P` | Page reader (today readPageRecord, readPageDetail, extractPageIndex) |
| space | `SpaceNode` | space | Yes | No | `_space.json` | Space reader (today readSpace, patchSpaceFromDisk, loadContextWorld) |
| context | `ContextGroup` (no node kind) | context | Yes | No | None; `.nexus/Contexts/contexts.json` | Registry reader (readNexus.ts:303-315 lenient, readRegistryStrict) |
| task | None yet | None | No | No | Folder: `_taskconfig.json`; file mark `T` | None; `stampTree` stamps it, the walk doesn't read it |
| event | None yet | None | No | No | Folder: `_eventconfig.json`; file mark `E` | None; as task |

**Importers of the replaced lists (non-test):** `NodeKind` record.ts. `RecordKind` remint.ts. `MutableKind` RenamableTitle.tsx, sidebarRows.tsx, confirmations.ts, Sidebar.tsx, Banner.tsx, navRef.ts, liveTree.ts, configReach.ts, mutatePatch.ts, entityMenu.ts. `CONTAINER_KINDS` move.ts, reorder.ts, mutate.ts, create.ts. `ContainerKind` adopt.ts, createMenu.ts, containerConfig.ts, Views/handlers.ts, viewsFile.ts. `SidecarKind` paths.ts, folderEntity.ts, sidecar.ts. **Tests:** confirmations.test.ts (157), deleteReach.test.ts (388), mutateRequest.test.ts (44), schemas.test.ts (42).

##### Phase 1 — The Config Record

**What leaves the root:** `nexus.profileImage`, `nexus.profileIcon`, `homepage`, `crops`, `pageMetadata`, `contextOrder`, `personalization`, `commands`, `excluded`, `assetDirectory`, `registry`. `nexus.profileSubtitle` is deleted rather than moved (codec.ts:41,99; readNexus.ts:361; watchPatch.ts:438; Testing/testTree.ts:7). **What stays:** `collections`, `contexts`, `nexus.id`, `nexus.rootPath` (the pin `heldTreeOf` checks, liveTree.ts:60-61), `nexus.name`, and `unreadable`, which M-2 turns into the notice payload the window reads from phase 3 on. Every non-test reader of each moving field is in *§Model*.

**Writers that build a new root for config today:** `applySettingsLeaves` (watchPatch.ts:427-441), `patchOrderFromDisk`'s `contextOrder` (:443-458), `patchHomepageFromDisk` (:460-463), `patchCropsFromDisk` (:465-468), `patchMetadataFromDisk` (:470-479); mutatePatch.ts:131-143 route to them; the window's homepage arm (nexusSlice.ts:266-269) and `defaultIcons` copy (configSlice.ts:48-52); `applyTree`'s copies into the store (nexusSlice.ts:196-200).

**Caches a config write stops invalidating:**
- **treeIndex `byTree` (:46):** its `walk` reads `personalization.defaultIcons` (:59), `nexus.name` (:64), `nexus.profileIcon` (:65) and `pageMetadata[id].icon` (:98). With config off the root, icons and the homepage title go stale unless the walk stops reading config (icons resolved per surface) or the projection is keyed on the tree and the config fields it reads, as contextIdentity already is (:23-33). This is the one design decision the move carries.
- **contextIdentity (:24):** keyed on `tree.contexts` plus `defaultIcons`; its `defaultIcons` read retargets to config and it keeps working.
- **sidebarDndModel.ts:58:** reads `tree.personalization.defaultIcons` per build; retargets.
- **valuesChanged `indices` (:43) and `titles` (:85), remintLedger `byTree` (:20), contextOptions (:6):** read entities only; they stop being thrown away by config writes, which is the payoff.

**The registry join:** `CollectionNode.properties` is the assignment list joined to the registry at walk time (readNexus.ts:198-208, :228) and re-joined by `repointRegistryInTree` (treePatch.ts:326-341) and `patchContainerFromDisk` (watchPatch.ts:386-389). Moving `registry` to the config record leaves the join in the tree; `repointRegistryInTree` stays the one place a registry change reaches Collection nodes.

**Test fixtures:** `Core/Testing/testTree.ts` (`makeTree`) builds the root with every config field. Tests that read or build config fields on a tree (grep, some are false positives on `registry:`/`homepage:`): matrixInput.test.ts (163), matrixRuntime.test.ts (831), spend.test.ts (1713), watchPatch.test.ts (787), readNexus.test.ts (858), mutate.test.ts (2439), propertyMenuActions.test.ts (237), editorHost.test.ts (170), PageView.test.tsx (313), filterModel.test.ts (200), devicePrefsSeed.test.tsx (389), selection.test.ts (149), store.test.tsx (1120), TrashFrame.test.tsx (265), contextIdentity.test.ts (135), contextOptions.test.ts (34), tabsModel.test.ts (444), TileHost.test.tsx (264), valueContext.test.ts (42), treePatch.test.ts (531), cellGestures.test.tsx (717), createActions.test.ts (133), sidebarDnd.test.tsx (343), sidebarIconChoice.test.tsx (110), columnLabel.test.ts (57), Disclosure.test.tsx (207), windowTabs.test.ts (361).

##### Phase 3 — One Reader Per Kind

**Pages today:**

| Reader | Produces | Identity rule | Cache |
|---|---|---|---|
| `readPageRecord` (readNexus.ts:122-137) | `{ node: PageNode{kind, id, title, path}, fm, mtimeMs }`; `<Context>` keys into `rawContextByNode` (:103-114) | `admitContentFile(fm, 'page')`: member → id; missing → `adoptedId(rel)`; unknown → null | `cachedParse` by (mtime, size) |
| `readPageDetail` (pageFile.ts:168-181) | `{ id, title, path, frontmatter, body, bodyHash }` | Any string `ID`, else `adoptedId`; no admission | None; throws on a missing file |
| `extractPageIndex` (indexSeed.ts:44-69) | `{ entry: { relations, headings, values }, outline }` | `sweepAdmitsBody`: anything but unknown; no id | None; the seed's stat gate |

One reader serving all three callers produces: the admission result (member with id, or unknown with its `contradicting`/`malformed` reason, which is E-4 versus E-2), title, path, full frontmatter, the raw `<Context>` keys as a record field instead of a WeakMap side table, `mtimeMs` and size, and, from the same text, body, `bodyHash` and the index rows. After E-6 there's no `missing` outcome at read time: the open and the watcher stamp first. **Fork for the planner:** the parse cache holds whatever the reader returns, so caching body and index rows costs every page's text in memory at 10,000 pages; caching the record (frontmatter, id, raw keys, stat) and deriving body and index rows from the text on demand keeps the cache the size it is today. `pageValuesOf` (loadValues.ts:18-28) re-decodes the same frontmatter through the `pageFrontmatter` zod schema; it can take the reader's frontmatter as-is.

**Spaces today:** `readSpace` (readNexus.ts:235-253; lenient, cached, `unreadable` on a bad sidecar, contexts attached later), `patchSpaceFromDisk` (watchPatch.ts:397-416; uncached, a walk on a bad sidecar or an id mismatch, contexts resolved inline), and `loadContextWorld`'s inline decode (contextWrite.ts:64-87; strict, one bad sidecar fails the load, bare `{kind, id, title, path, contextId}` plus a `SpaceRef` with `contextTitle`, `dir` and the raw sidecar). One reader returns a three-state result (read, absent, unreadable) carrying id, title, path, contextId, the `spaceFieldsFrom` fields, the raw `<Context>` keys and the raw sidecar; the walk lists unreadable, the watcher walks, and the Context world fails strictly, each by its own policy over the same result.

**Containers today:** `readSet`/`readPageCollection` (readNexus.ts:177-233) and `patchContainerFromDisk` (watchPatch.ts:360-395). Both build from `containerFieldsFrom` plus the Collection-only `properties`/`openIn`/`cached`; the walk reads children fresh while the patch keeps the held node's children and title. One builder takes the sidecar, the folder name and the children and returns the node, with the Collection-only fields in one place.

##### Phase 3 — E-6 Retirement Inventory

| Site | What it does at HEAD | Becomes |
|---|---|---|
| ids.ts:45-53 | `ADOPTED_PREFIX`, `adoptedId`, `isAdoptedId` | Deleted |
| ids.ts:25 | `idTime` returns null for an adopted id, which `shardOf` and `pageValuesOf` rely on | The guard goes; `decodeTime`'s own catch answers any non-ULID |
| readNexus.ts:130 | Page: `adoptedId(rel)` for an id-less member | Can't occur after the open's stamp; a page whose stamp failed is listed unreadable |
| readNexus.ts:191, :225 | Set/Collection: `adoptedId(relDir)` for an id-less sidecar | As above, through `stampFolder` |
| readNexus.ts:245; watchPatch.ts:404; contextWrite.ts:76 | Space: `adoptedId(relDir)` for an id-less `_space.json` | **Needs a ruling.** Nothing stamps a Space: `stampAdopted` never enters `.nexus/Contexts`. Either a Space stamp joins the open and the watcher, or an id-less Space sidecar is listed unreadable |
| readNexus.ts:305 | Nexus: `adoptedId(root)` when nexus.json has no id | **Needs a ruling.** `ensureIdentity` writes one at open; the fallback serves only a walk that read an id-less or unreadable identity |
| watchPatch.ts:374 | Container patch: `adoptedId(dirRel)` | The id-mismatch walk covers it |
| pageFile.ts:174 | `readPageDetail`: any `ID`, else `adoptedId` | The one page reader's admission; `page:open` refuses Unknown (E-2) |
| mutatePatch.ts:78-88, :150-157 | `subtreeHoldsAdoptedId` and the rename/move/delete walk arm | Deleted |
| reorder.ts:12 | `persistable` strips adopted ids from four order writes (:30, :33, :42, :91) | Deleted; the four writes take ids as given |
| creationOrder.ts:54 | `tieOrderWith` strips adopted ids | Filter deleted |
| bandRouter.ts:99 | `group_order` strips adopted ids | Filter deleted |
| remintLedger.ts:34 | The baseline skips adopted ids | Deleted |
| watchPatch.ts:484-488 | `patchPageMetaFromDisk` re-reads the page when its held id is adopted | Deleted |
| adopt.ts:90-100 | `stampListed` stamps a listed id-less page on demand | Deleted; cascade.ts:130 reads `stampedId(before)` and keyHolders.ts:59 reads `fields[ID_KEY]`, since a listed page always carries its id |

**Making the stamp callable from the watcher:** `stampPage` (adopt.ts:58-70) and `stampFolder` (:104-116) are private, and both already take the file's lock and record their echo: `stampPage` writes through `rewritePageSerialized` → `rewritePreservingTimes` → `atomicWriteFile` → `recordWrite` (atomicWrite.ts:13-27, 251-263), and `stampFolder` through `rmwJsonStrict` → `writeJson` (:103-135), with `migrateContainerSidecar` recording both rename endpoints (:124-126). Exporting them is the only change the stamps need; the stamp's own write arrives as a next-batch event that `dropOwnEchoes` drops. The watcher's call needs the kind: a folder through `resolveFolderKind` with `agendaContext`, as `ensureFolderId` does (:158-164), and a file through its folder's kind (`page` in a Collection or Set, `task`/`event` in an Agenda folder), which `ensurePageId`'s hard-coded `'page'` (:81) doesn't cover. The stamp runs in `settle` (watcher.ts:152) after `dropOwnEchoes` and before `applyWatchEvents`, so the batch applies stamped files. A stamp that returns null on a file that still exists is the unreadable-with-Try-Again case (M-2).

**`stampAdopted` survives** as the open's enumeration over the same two stamps; with F-197's walk-first order it stamps what the walk's read found missing instead of reading the corpus a second time.

**Persisted temporary ids:** order lists, the baseline and group ranks never persisted one. Window navigation state (tabs, recents) can hold one (navRecents.test.ts exercises it); after retirement an `adopted-` key resolves to nothing and reconcile drops it.

**Tests exercising temporary ids** (grep for `adopted-`, `adoptedId`, `stampListed`, id-less): ids.test.ts (99), reorder.test.ts (163), creationOrder.test.ts (163), bandRouter.test.ts (298), remintLedger.test.ts (392), mutatePatch.test.ts (428), adopt.test.ts (207), admission.test.ts (330), readNexus.test.ts (858), readPageDetail.test.ts (68), loadValues.test.ts (126), pageMetadata.test.ts (188), identity.test.ts (181), treeIndex.test.ts (195), mutate.test.ts (2439), spend.test.ts (1713), contextCascade.test.ts (666), matrixGraph.test.ts (76), editorHost.test.ts (170), glanceSlice.test.ts (119), windowSlice.test.ts (132), navRef.test.ts (19), navRecents.test.ts (54), tabsModel.test.ts (444).

##### Phase 3 — The Open Sequence

After `44885c23c` the host-side order is unchanged; the window applies the tree synchronously. The duplicated reads that remain (F-197): `stampAdopted` reads every page serially (4f) and `readNexus` reads every page again in parallel (8a); `agendaContext` runs in both; a remint re-walks (8d, F-210); a cold seed reads every file a third time over a wider corpus (9); a warm open's repair sweep reads the Context world's Space sidecars strictly and read-modify-writes the pages the seed re-read (11). The one-reader phase removes 4f's read (stamps come from 8a's read), feeds the seed's rows from 8a's text for the tree's corpus so a cold seed reads only the files outside the tree, and serves the repair sweep's Space reads from the tree (with phase 4's world). 8d becomes applying the remint's changes in phase 2.

##### Per File

| File | Deleted (HEAD lines) | Survives | Added (signature) | Non-test importers of what changes | Tests |
|---|---|---|---|---|---|
| Core/Nexus/entities.ts | — | — | `ENTITY_KINDS` table; `EntityKind`, `NodeKind`, `RecordKind`, `MutableKind`, `ContainerKind` derived; `isContainerKind(k)`; `sidecarKeyOf(k)` | — | New |
| tree.ts | `NodeKind` (:9); config fields (:95-96, :100-102, :106-112); `profileSubtitle` (:97) | Node shapes, `NexusTree` entities, `AssetMap`, `ValueChange` | `NexusConfig` interface | Every *§Model* reader | testTree.ts; the fixture list above |
| record.ts | `RecordKind` literal (:4) | `EntityRecord` | — | remint.ts, treeIndex.ts, assignment.ts, governedSweep.ts, spend.ts, remintLedger.ts | remintLedger.test.ts (392), remint.test.ts (442) |
| mutateRequest.ts | Literals at :32, :39 | Zod enums over the table | — | See *§Phase 1 — `entities.ts`* | mutateRequest.test.ts (44) |
| schemas.ts | `ContainerKind` literal (:72) | Decoders | — | adopt.ts, createMenu.ts, containerConfig.ts, Views/handlers.ts, viewsFile.ts | schemas.test.ts (42) |
| readNexus.ts | `PageRecord` and `readPageRecord` (:116-137), `retainContextKeys`/`rawContextByNode` (:102-114), `readSet` (:177-196), `readPageCollection` (:210-233), `readSpace` (:235-253), the attach pass (:333-352), adopted-id mints | `walkNexus` as enumeration; config leaves | Walk returns the config record beside the tree | watchPatch.ts, loadValues.ts, handlers.ts, watcher.ts (`readNexusConfig`) | readNexus.test.ts (858) |
| pageFile.ts | `readPageDetail` (:168-181) | Envelope, merge, `stampedId`, `sweepAdmits*` | — | Pages/handlers.ts | readPageDetail.test.ts (68) |
| indexSeed.ts | `extractPageIndex`'s admission and frontmatter prelude (:44-46) | Relation extraction; `recordPage` takes the reader's record | — | (private) | indexSeed.test.ts (331) |
| watchPatch.ts | `patchContainerFromDisk`'s builder (:376-393), `patchSpaceFromDisk`'s builder (:406-414), inline context resolution (:332-334), :484-488 | Classification, apply, removal arms; the config patches (:427-479) retarget to the config record in phase 1 | — | mutatePatch.ts, confirm.ts, adopt.ts | watchPatch.test.ts (787), mutatePatch.test.ts (428), watcher.test.ts (452) |
| containerFields.ts | — | `containerFieldsFrom`, `cachedIds` fold into the container reader | `readContainer(sidecar, name, children)` | readNexus.ts, watchPatch.ts | viewsFile.test.ts (375) |
| spaceSidecar.ts | — | `spaceFieldsFrom` becomes the Space reader's decoder | `readSpaceFile(abs)` three-state | readNexus.ts, watchPatch.ts, contextWrite.ts | spaceSidecar.test.ts (126), deleteProperty.test.ts (304) |
| contextWrite.ts | Inline decode (:64-87) | `loadContextWorld`'s strict policy | — | contextCascade.ts, repairSweep.ts, create.ts | contextWrite.test.ts (296) |
| adopt.ts | `stampListed` (:90-100); `stampTree`'s page read (:143-146) with walk-first | `stampFolder`, `stampPage` (exported), `ensurePageId`, `ensureFolderId`, `stampAdopted` | `stampArrival(root, abs): Promise<string \| null>` | cascade.ts, keyHolders.ts, handlers.ts, restoreScrub.ts, pageMetadata.ts, gather.ts | adopt.test.ts (207), admission.test.ts (330), normalizeSavedViews.test.ts (145) |
| ids.ts | :25 guard, :45-53 | Minting | — | contextWrite.ts, readNexus.ts, watchPatch.ts, pageFile.ts, adopt.ts, mutatePatch.ts, remintLedger.ts, reorder.ts, creationOrder.ts, bandRouter.ts | ids.test.ts (99) |
| mutatePatch.ts | :78-88, :150-157 | Routing | — | (private) | mutatePatch.test.ts (428) |
| reorder.ts / creationOrder.ts / bandRouter.ts | reorder.ts:12 and its four uses; creationOrder.ts:53-55; bandRouter.ts:99 | Everything else | — | — | reorder.test.ts (163), creationOrder.test.ts (163), bandRouter.test.ts (298) |
| remintLedger.ts | :34 | Everything else | — | — | remintLedger.test.ts (392) |
| treeIndex.ts | Config reads in `walk` (:59, :64-65, :98) move per the cache decision | Projections | Config-aware icon resolution | 43 importers; the projection API is unchanged | treeIndex.test.ts (195) |
| Desktop/FileWatch/watcher.ts | — | `settle` | A stamp step before `applyWatchEvents` | — | watcher.test.ts (452), watchSettle.test.ts (128) |

##### Names

Candidates, for Nathan's ruling: `entities.ts`, `ENTITY_KINDS`, `EntityKind`, `isContainerKind`, `sidecarKeyOf`, `NexusConfig` (the config record), `heldConfigOf` (beside `heldTreeOf`), `readPage`, `readSpaceFile`, `readContainer`, `stampArrival` (the watcher's stamp). Renames: the window's `readPageDetail` (pageDetailCache.ts:30) collides with the host's `readPageDetail` (pageFile.ts:168); when the host's goes, the collision goes with it, and if it stays, the window's is the one to rename.

##### Own Plan

No. The config move is the widest change (about 70 reader sites across both processes plus the treeIndex invalidation decision), but it's mechanical apart from that one decision and fits phase 1. E-6 and the one reader are deep and narrow (about 15 sites across ids.ts, adopt.ts, readNexus.ts, watchPatch.ts and the watcher) and fit phase 3.

##### Lines

Estimates for this slice's files, code lines only:

| Phase | Removed | Added | Net |
|---|---|---|---|
| 1 (kinds, config record, `profileSubtitle`) | ≈40 | ≈95 | ≈+55 |
| 2 (applier, remint changes; this slice's share) | ≈60 | ≈20 | ≈−40 |
| 3 (one reader per kind, E-6, walk-first adoption) | ≈230 | ≈140 | ≈−90 |
| 4, 5 (this slice's share) | ≈40 | ≈10 | ≈−30 |
| **Total** | **≈370** | **≈265** | **≈−105** |

#### Out-of-Slice

- **watchPatch.ts:** the patch*FromDisk arms (:319-491) are the per-kind readers plus an applier, written by hand. classifyEvent does a DFS per event.
- **mutatePatch.ts:** routeMutation / patchForMutation (:41-191) are the host's op table (F-187). confirmBy's sidecar ledger (:212-237) exists because writers don't emit changes.
- **Session/nexusSlice.ts:** each push runs `stabilize` and a full treeIndex rebuild (nexusSlice.ts:189,191). It also holds the optimistic switch (:238-293, F-186/F-187) and copies settings from the tree (:196-200, F-194).
- **Contexts/contextWrite.ts:** loadContextWorld re-reads every Space sidecar on every write instead of using the live tree (F-201).
- **Views/loadValues.ts:** finds files for page ids, and decodes the frontmatter a second time through `pageFrontmatter`.
- **Index/indexSeed.ts:** the seed's corpus differs from the tree's; a cold seed commits row by row (F-081).
- **Properties/repairSweep.ts:** a third read of the pages the seed re-read on a warm open.
- **Trash/resolve.ts and spend.ts:** the "id is live" check uses the baseline projection, which leaves out adopted ids (resolve.ts:35-37).
- **migrateConfig normalizeSavedViews:** read-modify-writes every trash sidecar and tile doc on every open (migrateConfig.ts:76-82).
- **Pages/handlers.ts `page:open`:** serves Unknown pages, since readPageDetail doesn't check admission.
- **Desktop/FileWatch:** the cost of chokidar's initial crawl at launch is unmeasured.
- **Assets/assetMap:** the asset map is relisted on every watcher refresh (watcher.ts:167).

#### Confidence

**Verified by reading:**
- Every file in SOURCES, at the pin and again at `d7d00240d` where it changed.
- watchPatch.ts, mutatePatch.ts, confirm.ts, watcher.ts, indexSeed.ts, contentIndex.ts, Trash/resolve.ts, configReach.ts:270-360, atomicWrite.ts (the readers and rewrite helpers), and the relevant ranges of contextWrite.ts, assignment.ts, loadValues.ts, repairSweep.ts, matrixInput.ts, nexusSlice.ts, configSlice.ts and main.ts.
- CorePM, NexusRecordPM, the PRD claim, and the nine audit findings (at the pin).

**Grep-verified:**
- Field readers, finder call sites, schema consumers, kind lists, and importers of every export *§Plan Inputs* changes.
- The absence of any baseline diff or drift row.
- The absence of any `profileSubtitle` reader (case-insensitive, across Core, UIX and Desktop).
- That `Core/Paths` imports nothing from `Core/Nexus`, and that no layering test forbids it.

**Inferred, not driven:**
- The cost of chokidar's initial crawl.
- How often Obsidian notes carry a foreign `ID:`.
- The per-phase line estimates; these are judgment estimates.
- That the window has dozens of personalization readers; this was counted from grep lines, not deduplicated per surface.
- The test-fixture list for the config move is grep-based and includes some false positives.

No app run and no code edits.
