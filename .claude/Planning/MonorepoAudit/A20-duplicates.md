## A20 — Two Definitions of One Thing

Scope: `Pommora/src/{main,preload,shared,renderer}` (638 non-test TS/TSX files; main 15,079 lines · preload 203 · shared 5,953 · renderer 60,869). Read-only. Every claim below cites file:line from the tree as of `7c7c7542`. Line-count savings exclude comments and tests and are estimates of deleted code, not moved code.

**Headline:** the process boundary did *not* force widespread double definitions. `shared/` already absorbed nearly every cross-process contract (types, zod codecs, grammars, menu models, path names). The genuine boundary-forced duplicates are four: the tree→entity walk, a bounded-cache helper main can't reach, single-flight promise maps on both sides, and personalization coercion living main-side while the renderer re-defaults per call. Everything else found here is ordinary same-process duplication that could be collapsed today.

---

### 1. Same-Basename Pairs

32 basenames collide. Triage:

| Basename | Files | Verdict |
|---|---|---|
| `identity.ts` | `shared/identity.ts` (content-ID kind marks) · `main/identity.ts` (`.nexus/nexus.json` per-Nexus identity) | **Two unrelated things.** Rename `main/identity.ts` → `nexusIdentity.ts`. |
| `schema.ts` | `main/Database/schema.ts` (SQLite DDL) · `main/Properties/schema.ts` (property-definition validation) | **Unrelated.** Rename one (`ddl.ts` / `validateDefinition.ts`). |
| `connections.ts` | `shared/connections.ts` (`[[…]]` grammar) · `renderer/MarkdownPM/Editor/connections.ts` (CM6 click/dwell/menu handler) | **Unrelated.** Rename renderer → `connectionClicks.ts`. |
| `links.ts` | `shared/links.ts` (URL grammar) · `renderer/MarkdownPM/Editor/links.ts` (CM6 click handler) | **Unrelated.** Rename renderer → `linkClicks.ts`. |
| `menu.ts` | `main/menu.ts` (application menu bar) · `renderer/MarkdownPM/Editor/menu.ts` (applies `mdpm:*` actions) | **Unrelated.** Rename both (`appMenu.ts`, `editorMenuActions.ts`). |
| `selection.ts` | `renderer/Actions/selection.ts` (reconcile SelectionState) · `renderer/MarkdownPM/Editor/selection.ts` (CM6 selection layer) | **Unrelated.** Rename Actions one → `reconcileSelection.ts`. |
| `linkFormat.ts` | `renderer/Properties/linkFormat.ts` (picker rows) · `renderer/MarkdownPM/Editor/linkFormat.ts` (URL link edits) | **Unrelated.** Rename Properties one → `linkFormatOptions.ts`. |
| `IconPicker.tsx` | `renderer/Settings/IconPicker.tsx` (favorites-bound wrapper, exports `IconPicker`) · `renderer/PommoraUIX/Pickers/IconPicker.tsx` | Same exported symbol name for wrapper and wrapped. Rename wrapper `NexusIconPicker`. |
| `codec.ts`, `model.ts` | `renderer/Tiles/Core/*` · `renderer/MarkdownPM/Tables/*` | Folder-scoped, different domains. Fine. |
| `tiles.ts` | `shared/tiles.ts` (zod + TILE_KINDS) · `main/tiles.ts` (fs ops) | Layered contract/implementation. Fine. |
| `columnStyles.ts` | `shared/columnStyles.ts` (vocabulary + `defaultStyleFor`) · `renderer/Tables/columnStyles.ts` (`styleFor` + hook) | Layered. Fine. |
| `mutate.ts`, `editorMenu.ts`, `views.ts`, `record.ts` | `shared/*` contract · `main/*` implementation | Layered. Fine. |
| `propertyValue.ts` vs `renderer/Properties/value.ts` | shared decode/encode · renderer `declaredType`/`resolveFieldValue` | Not duplicates. But see §2.7 — `declaredType` has two more spellings in the renderer. |
| `contexts.ts`/`contextResolve.ts` vs `renderer/Properties/{resolveContext,contextIdentity,contextOptions}.ts` | frontmatter→ids resolution · tree→identity maps | Different jobs. `contextIdentity.mapsFor` is a fourth tree walk (see §3.1). |
| `treeIndex.ts` vs `liveTree.ts` | renderer projections over the tree · main's held-tree slot | Different jobs. The real pair is `treeIndex.walk` vs `main/record.buildBaseline` (§3.1). |
| `exclusion.ts` | main only | Consumers re-spell its predicates (§2.5). |
| 20× `*Menu.ts` (`shared/` model + `main/` native adapter) + `gripMenu.ts` triple | e.g. `shared/cellMenu.ts` 180 / `main/cellMenu.ts` 23 | Legitimate contract + adapter. 8 adapters are one-liners over `popModelMenu` with their own bridge channel while a generic `row-menu` channel exists (§3.6). |

**Same-named exports in different files (non-CSS):**
- `clampZoom` — `shared/cropGeometry.ts:17` (0.25–2 linear) vs `renderer/MarkdownPM/zoom.ts:7` (0–2, exponent). Same name, different domain and range. Rename the editor one `clampEditorZoom`.
- `readRegistry` — `main/contextsRegistry.ts:20` vs `main/IO/propertiesRegistry.ts:49`. Two registries, one name. Rename both.
- `resolveTitle` — `main/linkTitles.ts:126` (fetch a web page's `<title>`) vs `renderer/Actions/linkResolve.ts:9` (resolve a `[[Title]]` to a page). Unrelated. Rename main → `fetchLinkTitle`.
- `optionsOf` — `renderer/Frames/GroupFrame.tsx:360` (`def?.select_options ?? statusOptions(def)`) vs `renderer/Properties/Assignment/PropertyPicker.tsx:16` (`def.type === 'status' ? statusOptions(def) : (def.select_options ?? [])`). **Same concept, two spellings, slightly different precedence.** Keep one in `shared/properties.ts` beside `optionValues` (`:225`). Saves ~4. Independent.
- `renameOption`/`renameStatusOption` — `shared/optionModel.ts` (pure) vs `main/CRUD/optionOps.ts` (IO). Layered; rename IO side `*Op`.
- `popRowMenu`, `restoreSnapshot` — renderer and main halves of one call. Fine.

---

### 2. Same Concept, Different Name

**2.1 URL scheme regexes, twice in `shared/`.**
`shared/links.ts:10 HAS_SCHEME = /^[a-z][a-z0-9+.-]*:/i` ≡ `shared/nexusPaths.ts:48 WEB_ADDRESS` (identical). `shared/links.ts:14 WEB_SCHEME = /^https?:\/\//i` ≡ `shared/nexusPaths.ts:52 HTTP_URL` (identical). `links.ts:7` says "one expression because two callers make opposite decisions from it. A second copy would risk disagreeing" — the second copy is 40 lines away in the same folder. Consumers: `WEB_ADDRESS` (assetUrl.ts:27), `HTTP_URL` (mutate.ts:251, ImagePicker.tsx:126), `hasWebScheme` (5 sites). Keep `links.ts`; delete the two in `nexusPaths.ts`. Saves ~6. Independent.

**2.2 `nexus-asset://` URL, built twice, scheme spelled three times.**
`main/index.ts:203 ASSET_SCHEME = 'nexus-asset'`; `main/IO/thumbnails.ts:96` returns `` `nexus-asset://nexus/${rel}` `` (no encoding); `renderer/Assets/assetUrl.ts:11 assetUrl` encodes per segment ("a file named `Draft #2.png` would truncate at the fragment and 404"). The thumbnail path has the bug the renderer helper fixes. Move `ASSET_SCHEME` + `assetUrl` to `shared/nexusPaths.ts`; thumbnails and the protocol handler read it. Saves ~4; removes a behavioral divergence. Independent.

**2.3 Frontmatter parse, twice in main, with two fence regexes.**
`main/readNexus.ts:321 splitFrontmatter` — fence `/^---\r?\n([\s\S]*?)\r?\n---/`, `parseDocument().toJSON()`, rejects non-plain-object. `main/IO/pageFile.ts:38 readFrontmatterFields` — `splitEnvelope` fence `/^---\r?\n([\s\S]*?)\r?\n---[ \t]*\r?\n?/`, `parseDocument().toJSON()`, accepts any object (an array frontmatter passes as `Record`). `main/mutate.ts:14,68` imports both. Ten files import `splitFrontmatter` (readNexus, readPage, governedSweep, deleteProperty, governedWrite, indexSeed, restoreScrub, pageValue, provenance, mutate). Keep `readFrontmatterFields` (add the array guard), delete `splitFrontmatter`. Saves ~14. Independent.

**2.4 `isPlainObject` exported once, hand-spelled ~20 times.**
`shared/propertyValue.ts:16` exports it (odd home — a value module, imported by `main/IO/navigationFile.ts`, `windowState.ts`, `tabsState.ts`, `atomicWrite.ts`, `main/tiles.ts`). Inline `!= null && typeof === 'object' && !Array.isArray` at: `main/readNexus.ts` (8 hits, e.g. `:89-91`, `:111`, `readSettingsLeaves`, `readSpaceOrders`), `main/index.ts` (4), `main/settings.ts:46,154`, `main/ipc.ts:84`, `main/CRUD/contextCascade.ts` (2), `main/exclusionInput.ts`, `renderer/Sidebar/disclosureState.ts:19`. Move to a `shared/guards.ts`; replace inline spellings. Saves ~40. Independent.

**2.5 File-name predicates, three spellings each.**
- Content file: `main/IO/walk.ts:20 isContentFile` · `main/watchPatch.ts:113 isContentName` ("Mirrors `isContentFile`") · `main/exclusion.ts:42 hiddenName` (`startsWith('.') || startsWith('_')`).
- Skip dir: `main/exclusion.ts:12 neverWatched` · `main/exclusion.ts:49 shouldSkipDir` · `main/exclusionScan.ts:40` (`e.name === 'node_modules' || e.name.startsWith('.')`).
- `.md` strip/test, 11 sites: `main/coerce.ts:15 basenameNoMd`, `shared/connections.ts:13 titleFromPath`, `shared/pageMenu.ts:20 pagePathText`, `shared/links.ts:102`, `main/CRUD/trashRows.ts:71`, `main/provenance.ts:395`, `main/CRUD/util.ts:22`, `shared/treePatch.ts:487,488,492`, `main/IO/walk.ts:14 isMarkdownFile`, `main/CRUD/page.ts:16 MD = '.md'`, `main/paths.ts:74`. `basenameNoMd(basename(p))` ≡ `titleFromPath(p)`.
One `MD_EXT`/`stripMd`/`isMarkdownName` trio in `shared/nexusPaths.ts`; one `isContentName` in `exclusion.ts`. Saves ~20. Independent.

**2.6 Case-fold normalizers, five spellings, not all equivalent.**
`shared/connections.ts:22 normalizeTitle` (trim·lower·NFC) · `shared/contexts.ts:53 normalizeContextValue` (String·trim·lower·NFC) · `main/exclusion.ts:23 normalizeSeg` (NFC·`toLocaleLowerCase`) · `main/provenance.ts:298 fold` (NFC·lower, no trim) · `main/Properties/schema.ts:21-22` (trim·lower, **no NFC** — the duplicate-name check compares an un-normalized input against NFC names already on disk). One `foldKey` in shared; `normalizeContextValue` becomes `foldKey(String(v))`. Saves ~8; fixes the NFC gap. Independent.

**2.7 "What kind of column is this id" — three spellings.**
`renderer/Properties/value.ts:22 declaredType` · `renderer/Views/Pipeline/columns.ts:12 columnKind` · `renderer/Properties/Assignment/cardValueInput.ts:70` inline `STAMP_TYPE[id] ?? def?.type ?? 'context'`. Two callers patch around `declaredType`'s `contextIds = []` default: `CardPickerHost.tsx:108`, `TableView.tsx:974` (`col.kind === 'context' ? 'context' : declaredType(...)`). One classifier taking the context-id set. Saves ~10. Independent.

**2.8 `NavRef` runtime kind lists and validators, twice.**
`main/IO/navigationFile.ts:18-37 NAV_KINDS` + `isNavRef` (includes task/event) · `main/IO/tabsState.ts:13-22 TAB_KINDS` + `isTabRef` (omits them). Identical shape check (`kind === 'homepage' ? !('id' in v) : typeof v.id === 'string' && v.id.length > 0`). `shared/types.ts:471 NavRef` has no runtime list. One `NAV_KINDS` as-const in shared driving the type, one `isNavRef(v, allowed?)`. Saves ~12. Independent; also what a mobile shell would need.

**2.9 Sidecar validation split: zod in CRUD, hand-coercion in the walk.**
`shared/schemas.ts:32-58 baseSidecar/pageCollectionSidecar/pageSetSidecar` are read through `main/sidecarIO.readSidecar` by 11 CRUD files. `main/readNexus.ts:485-545` builds the same nodes from the same files with `asString(meta.id)`, `asStringArray(meta.set_order)`, `meta.heading_icon_hidden === true`, `parseViews`, `coerceViewButton` — two near-identical container builders (set at `:480-500`, collection at `~:530-545`). Two validators of one file format. The walk could `.safeParse` the loose schema (per-field `.catch()` keeps the leniency). Saves ~25 in readNexus. Independent; needs care around the walk's per-field tolerance.

**2.10 Date-format labels, three lists, one disagreement.**
`shared/columnStyles.ts:24-30 DATE_FORMAT_LABELS` ("the two can never drift into two vocabularies") · `renderer/Properties/Editors/DateTimeEditor.tsx:7-11` restates all five identically · `shared/trashMenu.ts:38-39 TRASH_DATE_FORMATS` labels `monthDayYear` as **'Short Date'** where `DATE_FORMAT_LABELS` labels it 'MM/DD/YYYY' and reserves 'Short Date' for `short`. DateTimeEditor derives from the shared record (saves ~5); the trash mismatch is a vocabulary conflict to adjudicate. Independent.

**2.11 Small idioms.**
- `Array.isArray(raw) ? raw : [raw]`: `shared/contextResolve.ts:9 listOf`, `shared/propertyValue.ts:35,75`, `main/CRUD/pageValue.ts:14`. Export `listOf`. ~3.
- `relJoin` `main/mutate.ts:100` ≡ `joinPath` `shared/treePatch.ts:28` (unexported). ~1.
- `asString` `main/coerce.ts:5` ≡ `contentId` `shared/identity.ts:48` body.
- `embedRegex` `renderer/MarkdownPM/Detect/index.ts:17` re-spells `shared/connections.ts:18 pageEmbedPattern` (same class, adds `d`); `Detect/index.ts:371 loneEmbedRe` a third. The connection/link grammars are otherwise single-sourced (`Tokens/index.ts:15,197`, `main/Connections/scan.ts:5-6` all import from shared). ~2.
- Owner-config path by kind is re-derived four times in `main/mutate.ts` (`:525-535`, `:557-565`, `:612-615`, `:626-629`). One `ownerConfigPath(root, kind, path)`. ~20.

**Lists checked and found single-sourced:** sidecar filenames (`main/paths.ts:17-23` only), config filenames (`:78-86` only), `.nexus`/`.trash` (`shared/nexusPaths.ts` only), `'ID'` + retired keys (`shared/identity.ts` only), `ASSET_MIME`/`IMAGE_EXTS` (`main/index.ts:220 RENDERER_MIME` is a different table for the app bundle), `TILE_KINDS`, `VIEW_TYPES`, `SPECTRUM/RAMP_FAMILIES`, `PROPERTY_TYPES` (`Record<PropertyType,…>`, exhaustive), `HEADING_LEVELS`/`LIST_KIND_LABELS`, `DEFAULT_ENTITY_ICONS`, `TAB_CACHE`. **Bridge-side validator duplication:** none found — the renderer does not pre-validate names (`invalidBasename`/`invalidName` appear only in `main/CRUD/util.ts`), and both sides of `isValidLink`/`tilePatchProblem` import from shared.

---

### 3. Parallel Mechanisms

**3.1 Four walks of `NexusTree` into flat entity records (the one real boundary-forced duplicate).**
- `renderer/treeIndex.ts:83-161 walk` → `NodeRecord {id, kind, title, path, icon, parents}` (header: "A new lookup belongs here as another projection, never its own walk").
- `main/record.ts:43-80 buildBaseline` → `EntityRecord {id, kind, title, path, state}` — `shared/record.ts:1` even says this tuple is what "the renderer's tree index derives from".
- `renderer/Sidebar/sidebarDndModel.ts:29-118 buildIndex` → `Entry {id, kind, path, depth, parentId, parentPath, pageIds, containerIds}` — same recursion, same process as treeIndex, violates its own rule.
- `renderer/Properties/contextIdentity.ts:35-62 mapsFor` walks `tree.contexts` a fourth time.
Survivor: one Core `walkEntities(tree)` (id, kind, title, path, ownIcon, parents/depth) with treeIndex, sidebar DnD, baseline, and context identity as projections. Saves ~50 (sidebar, independent) + ~40 (record.ts + contextIdentity, **monorepo-required** for record.ts since main can't import renderer/treeIndex today).

**3.2 Bounded caches outside `capSet`.**
`renderer/PommoraUIX/Util/capMap.ts:4 capSet` has 3 callers (tabState, webRetention, docCache). Hand-rolled: `renderer/Interface/Glance/GlancePane.tsx:86-92` (delete/set/trim loop — literally `capSet`; ~6, independent); `main/IO/writeEcho.ts:16-22` (size>256 age-prune — main can't import a renderer util; **monorepo-enabled**, ~6); `renderer/Tiles/tileCache.ts:6` is unbounded (inconsistent, not a duplicate).

**3.3 Warm-state stores implementing `WarmSeam`, three times.**
`renderer/Tiles/tileCache.ts:8` (Map, unbounded) · `GlancePane.tsx:80 glanceWarmSeam` (Map, cap 8) · `renderer/Windows/useWindowWarm.ts:21` + `windowCache.ts` (Map, liveness-gated). All three: `fenceWarm(map.get(key), readPageDetail(path)?.body)` then set. One `createWarmStore({cap?, live?})`. Saves ~25. Independent.

**3.4 Single-flight promise maps, five times.**
Renderer: `Store/tabState.ts:48 inFlight`, `Views/viewMint.ts:12 inFlight`, `Store/cacheSlice.ts:31 inFlightTitles`+`failedTitles`. Main: `liveTree.ts:10-17 WalkSlot`, `IO/navigationFile.ts:82 inFlight`. One `singleFlight(key, fn)` in Core. Saves ~15 (renderer, independent) + ~10 (main, **monorepo-enabled**).

**3.5 Two serialization chains in main.**
`main/IO/fileLock.ts:24 serializeOnFile` (per-key chain, reentrancy refused via AsyncLocalStorage) vs `main/CRUD/schemaChain.ts:8 serializeSchemaOp` (one global chain, no guard, comment warns of the deadlock fileLock detects). `serializeSchemaOp` = `serializeOnFile('schema', fn)`. Saves ~10. Independent.

**3.6 Dedicated IPC channel per list menu vs the generic `row-menu` channel.**
`shared/bridge.ts:358 'row-menu'` + `main/rowMenu.ts:88 popRowMenu` + `renderer/Actions/nativeMenus.ts:15` already pop any `ActionItem<string>[]`. Eight adapters are one-liners over `popModelMenu`: `main/citationMenu.ts:15`, `viewRowMenu.ts:10`, `connMenu.ts:11`, `tableMenu.ts:10`, `viewButtonMenu.ts:12`, `viewEmbedMenu.ts:18,25`, `pageActionsMenu.ts:12` — each with its own bridge entry, preload dialer, and `main/index.ts` handler. Collapse onto `row-menu` (the renderer builds the model from the shared file and pops it). Saves ~120 across adapters + bridge + preload + handlers; the remaining bespoke adapters (submenus, radios: cell, column, grip, trash, tab, nav-row, card, option, property, icon-favorite) stay. Independent. Note: only `nativeMenus.ts` imports `ActionItem` in the renderer — no DOM renderer of the models exists, which a mobile shell would need.

**3.7 Debounced writers.**
`renderer/Tiles/pageTileWrite.ts:15 createBodyWriter` (keyed pending+timer+flush+cancel; used by `pageFlush.ts` and the markdown tile) vs `renderer/Tiles/useTileDoc.ts:31-35,80-88,137-146` hand-rolled single-slot debounce of `tiles:save` layout (same shape, 300 ms vs 400 ms). `useTileDoc` could hold a `createBodyWriter()` keyed by `hostKey`. Saves ~20. Independent. (`PageWindow.tsx:79`, `PageView.tsx:56` timers are UI throttles; `main/CRUD/fileHistory.ts:103` is the snapshot quiet-timer — different jobs.)

**3.8 Error reporting: renderer notifications vs three native message boxes.**
`renderer/Interface/notifications.ts:12 notifyError` and `renderer/Windows/confirmations.ts` are the confirm/notify path. Main still pops `dialog.showMessageBox` at `main/index.ts:1681` (`error:show`), `:1905` (`trash:report`), `main/contextMenu.ts:76` (mutate failure from a native menu). Route the two channels through renderer notifications; the context-menu case needs a push. Saves ~25. Independent.

**3.9 Per-machine persistence, two stores.**
`nexus.db local_state` via `scopeGet/scopeSet` (`main/ipc.ts:89-112`, 16 scopes) vs `localStorage` at `renderer/Store/chromeSlice.ts:46,60,103-104` (sidebar/inspector width) and `renderer/Sidebar/disclosureState.ts` (55 lines, its own JSON cache). A `chrome` scope in `local_state` retires disclosureState.ts. Saves ~40 (optional — adds an IPC hop per toggle). Independent.

**3.10 Zoom — four systems, one name collision.**
Editor zoom (`MarkdownPM/zoom.ts`, exponent), tile scale (`Tiles/tileZoom.ts` over `shared/types.ts:249 SCALE_STEPS`), crop zoom (`shared/cropGeometry.ts`), interface scale (`shared/types.ts:270-282` + `main/webGuests.ts:184 setHostZoom` + `main/index.ts:275 applyDefaultZoom`). Genuinely different semantics; the defect is the `clampZoom` name (§1). No collapse.

**Checked and clean:** error envelope (`shared/result.ts` only; one stray `{ ok: true }` literal at `renderer/Tiles/Surfaces/MarkdownTile.tsx:55`); title resolution (navResolve/linkResolve/destinationTree are projections over `treeIndex`; main has no page-title index — the cascade scans bodies via `main/Connections/scan.ts` using shared grammars); JSON read/write primitives (`atomicWrite.ts` owns `readJsonStrict`/`readJsonObject`/`rmwJsonStrict`/`writeJson`; `sidecarIO.readSidecar` and `readNexus.readConfig`/`readSidecar` are thin wrappers, not re-implementations).

---

### 4. Two Writers

**4.1 Sidecar files (`_pagecollection.json`, `_pageset.json`, `_space.json`) — four write paths.**
1. `main/sidecarIO.ts:44 writeSidecar` (folderEntity, views).
2. `rmwJsonStrict(sidecarPath(...))` — `main/mutate.ts:532,562,614,628`; `main/CRUD/removeProperty.ts:61,136`; `main/CRUD/reorder.ts:46`; `main/CRUD/contextWrite.ts:201,295` (via `join(ref.dir, SPACE_SIDECAR)`); `main/assetMigrate.ts:103`.
3. `main/remint.ts:113-128` — `readJsonStrict` then **unlocked** `writeJson(join(absFolder, SIDECAR_FILENAME[kind]))`. The `fileLock.ts:7-10` header warns exactly about this.
4. `main/CRUD/governedSweep.ts:125-133` — `writeJson` under its own `serializeOnFile(file)`.
`sidecarIO.ts:15` concedes: "The banner and icon patches reach the same key without coming through here." Survivor: one `updateSidecar(absFolder, kind, mutate)` = `rmwJsonStrict(sidecarPath(...))`; `writeSidecar` becomes internal to create. Saves ~15 and closes the remint race. Independent.

**4.2 `homepage.json` — the funnel exists and is bypassed.**
`main/settings.ts:23 updateNexusConfig(root, file, mutate)` is "the one primitive every writer funnels through"; it is called only for `settings` and `crops`. `homepage.json` is written by raw `rmwJsonStrict(nexusConfig(root, NEXUS_CONFIG_FILES.homepage), …, () => ({}))` at `main/mutate.ts:539-543`, `:567-571`, `:617`, `:629` and `main/assetMigrate.ts:91-96`. Route through `updateNexusConfig(root, 'homepage', …)`. Saves ~6. Independent.

**4.3 `settings.json` — one writer, three readers in main.**
Writes all go through `updateSettings` (`mutate.ts:434,448,455`, `assetMigrate.ts:81`, `settings.ts` writers). Reads: `settings.ts:56 liveLeaves` (tree-first, disk fallback), `settings.ts:102,135 readSubfield/readNavViewModes` (disk-only, bypass the live tree), `watchPatch.ts:423` (disk). Not two writers; noted because the read side has two truths for one file.

**Verified single-writer:** `_tiles.json` (`main/tileDoc.ts:25 writeTileDocAt` — tiles.ts, index.ts:1498, remint.ts:132, contextWrite.ts:272 all go through it); `navigation.json` (`main/IO/navigationFile.ts:88`); `crops.json` (`updateCrops`); `contexts.json` (`mutateRegistryFile`); `properties.json` (`IO/propertiesRegistry.ts:75`). `local_state`: every scope has exactly one channel pair (`main/index.ts:1131-1202`, `774-861`); `linkTitle` is written only by `linkTitles.ts:133`; `record` only by `record.ts:185`.

---

### 5. Totals

| Bucket | Estimated lines removable |
|---|---|
| Independent of the monorepo | **~450–500** — §1 `optionsOf` 4 · §2.1 6 · §2.2 4 · §2.3 14 · §2.4 40 · §2.5 20 · §2.6 8 · §2.7 10 · §2.8 12 · §2.9 25 · §2.10 5 · §2.11 26 · §3.1 sidebar 50 · §3.2 glance 6 · §3.3 25 · §3.4 15 · §3.5 10 · §3.6 120 · §3.7 20 · §3.8 25 · §3.9 40 (optional) · §4.1 15 · §4.2 6 |
| Monorepo-enabled | **~60** — §3.1 `record.ts`/`contextIdentity` onto one walk 40 · §3.2 `writeEcho` onto `capSet` 6 · §3.4 main single-flight 10 |
| Monorepo-relocated, not removed | `main/*Menu.ts` + chassis 1,269 lines (Desktop-only; models need a DOM renderer for mobile) · `readPersonalization` (`main/readNexus.ts:88-165`) to Core · `shared/bridge.ts` + `preload` + `ipc.ts` (~700) become the Desktop transport |

The rename list (§1) saves nothing and removes eleven same-name hazards; do it first, it is free.

---

### Summary

The process boundary forced far fewer double definitions than expected: `shared/` already holds the contracts, grammars, codecs, and menu models, so main and renderer mostly *consume* one definition. Only four duplicates are boundary-caused — the tree→entity walk (`renderer/treeIndex.ts` vs `main/record.ts`), a bounded-cache helper main can't import (`writeEcho.ts` re-rolls `capSet`), single-flight maps on both sides, and personalization coercion split between `main/readNexus.ts` and per-call `?? default` in the renderer. Collapsing those under one Core saves ~60 lines; the monorepo's larger effect is relocation (the 1,269-line native-menu layer, the bridge/preload transport).

The bulk of the duplication is ordinary and fixable today (~450–500 lines): two identical URL regexes inside `shared/`, two frontmatter parsers with two fence grammars in main, `isPlainObject` hand-spelled ~20 times, five case-fold normalizers (one missing NFC), four sidecar write paths (one unlocked), a `homepage.json` funnel that exists but is bypassed, three warm-state stores, two debounced writers, eight menu channels that duplicate the generic `row-menu`, and a date-format label table that disagrees with itself. Eleven files or exports share a name with an unrelated thing (`identity.ts`, `schema.ts`, `clampZoom`, `readRegistry`, `resolveTitle`, …) and should be renamed regardless of the restructure.
