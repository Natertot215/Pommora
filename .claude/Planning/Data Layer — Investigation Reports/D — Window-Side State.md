### Window-Side Copies

**Re-grounded:** 09-30-2026 at `d7d00240d`

`Core/Navigation/warmTabs.ts` doesn't exist; warm tab state lives in `Core/Session/warmCache.ts`. N = entities in the Nexus.

| Copy | Lives | Shadows | Refreshed by | Optimistic local writes | Invalidated by | Stale vs. tree, and for how long |
|---|---|---|---|---|---|---|
| `tree` | `nexusSlice.ts:37`, set `:190` | Host live tree (itself a copy of disk) | `nexus:changed` (`useBridgeSubscriptions.ts:46`); `nexus:state` ask in `load` (`nexusSlice.ts:112`) | `mutate`'s per-op patch (`nexusSlice.ts:238-282`), created insert (`:284-296`); `defaultIcons` only (`configSlice.ts:49-52`) | Whole replacement per push; `null` on error (`:94`, `:115`) | Leads the host by one round trip after a mutate; `tree.personalization` lags the slice for every key but `defaultIcons` until the settings push lands (F-194) |
| `personalization` | `configSlice.ts:16`, `:42-56` | `settings.json` via `tree.personalization` | `applyTree` overwrites it when the tree's copy changed identity (`nexusSlice.ts:196-199`, `44885c23c`) | `setPersonalization` (`configSlice.ts:47-48`) | Never reset on switch; the first `applyTree` overwrites | Ahead of the tree by design; a settings push carrying another key's older value rolls this key back for one round trip (F-194) |
| `commands` | `configSlice.ts:18`, set `nexusSlice.ts:200` | `tree.commands` | `applyTree`, on identity change | None | Overwritten when the tree's copy changes | Same data as `tree.commands`; pure duplicate, read at `App.tsx:52`, `editorHost.tsx:171` |
| `devicePrefs` + `devicePrefsLive` | `configSlice.ts:20-22`, `:60-66` | `nexus.db` `devicePrefs` row | One `devicePrefs:load` ask at the start of `load`, ahead of the tree (`nexusSlice.ts:147-157`) | `setDevicePref` (`configSlice.ts:62-66`), saved only when `devicePrefsLive` | `resetNexusSession` (`nexusSlice.ts:70`) | Window is the sole writer; a refused load leaves `devicePrefsLive` false and nothing saves; the host decodes the record once (`44885c23c`) |
| `headings` | `nexusSlice.ts:40`, `:137-141` | Content index `headings` table | Full ask in `load` after the tree applies (`:159`); partial on `pages:changed` (`useBridgeSubscriptions.ts:85`) | None | `resetNexusSession` (`:68`) | Path-keyed and never reconciled against the tree: an in-app rename, move, or delete leaves the old key and no new one for the session, which reads as "unknown" (`connectionsApi.ts:101-114`) rather than wrong; full-after-partial overwrite (F-196) |
| `citationsShown` | `configSlice.ts:25`, `:68-82` | `nexus.db` `citations` | `citations:get` on each `load` (`nexusSlice.ts:161-163`) | `setCitationsVisible` | Not cleared by `resetNexusSession` (`nexusSlice.ts:66-83`) | Id-keyed, so rename-safe; the old Nexus's map stands from the first `applyTree` until `citations:get` lands (a copied Nexus shares page ids) |
| `linkTitles` | `cacheSlice.ts:7`, `:21-35` | `nexus.db` `linkTitle` | `linkTitles:get` on `load`; `linkTitles:fetch` per URL | Set on reply | `resetCaches`; module `failedTitles` (`:19`) never clears | URL-keyed, tree-independent |
| `pages` slots | `navigationSlice.ts:72`, `:312-336` | Page file (title, frontmatter, body) | `select`/`landPage`; `replaceBody` (`:377-386`); `reloadPage` (`:605-614`) | `setPageBody` (`:370-376`) from the editor's settle (`PageView.tsx:42`) | `pruneSlots` (`:229-237`), `keepSlots` in reconcile (`:630-634`), `patchPagesFor` delete (`:677-679`), reset | `slot.detail` is never refreshed by `values:changed` or `pages:changed`: `replaceBody`/`absorbLanding` swap the body only (`:383`, `bodyMount.ts:78-97`), so the header's banner (`PageView.tsx:92`) keeps an outside frontmatter edit's old value until the page re-lands |
| `pageDetailCache` | `pageDetailCache.ts:11-12` (cap 50), heads `:48`, `inFlight` `:94`, epochs `:134` | Page file via `page:open` | Fetch on demand; `values:changed` drops by id (`useBridgeSubscriptions.ts:56-58`); `pages:changed` absorb | `writeThroughBody` (`:116-119`); `setBodyBase` on ack (`saveScheduler.ts:117`) | `dropCacheDetail`, `dropPageDetail`, `clearCache` | Path-keyed; a moved page's old entry lingers to the cap, lookups verify path |
| `warmCache` | `warmCache.ts:15` (50 per owner) | Editor state, scroll, a detail snapshot | Capture at teardown (`PageView.tsx:122-131`) | — | Owner drops (`navigationSlice.ts:301,447,485,650`), `dropWarmDetail` (`warmCache.ts:36-40`), `clearWarm`, the body fence at restore | Detail dropped per changed id (F-575, landed `100d17882`); editor state kept until restore compares bodies |
| View values + overrides | `useContainerValues.ts:70-71`; `valueOverride.ts:10-57` | Container pages' frontmatter via `view:loadValues` | `values:changed` → `valuesEpoch` (`cacheSlice.ts:48-51`) → scoped refetch (`useContainerValues.ts:37-61`); rename → `bumpValuesEpoch` | `patchOverride` (`valueOverride.ts:17-41`) | Path change (`useContainerValues.ts:72-81`); `retireSettled` | One round trip per push; overrides lead disk by design |
| PropertyPanel `base`/`override` | `PropertyPanel.tsx:96-97`, `:108-142` | The subject page's frontmatter | Detail cache or `page:open`; `useValuesEpoch` | `patchOverride` (`:182`) | Subject/path change; a Space's override retires on its node's identity swap (`:139-142`) | A third frontmatter copy beside the detail cache and view values |
| Tile docs | `tileDocStore.ts:101`, bodies/bases `:48-51` | Tile layout and entry files | `tiles:get` on subscribe; `tiles:changed` → drop bodies + reload (`:212-217`) | `writeLayout`, `patchTileEntry`, `setTileDocLock` (`:175-179`, `:304-323`) | `retire` (`:234-249`), `dropAllTileDocs` (`:334-347`) | Held while a gesture holds (`:190-193`); overlapped writes keep own paint until the last lands (`:124-137`) |
| `treeIndex` projections | `treeIndex.ts:32-55` (WeakMap per root) | The tree | Lazily rebuilt per new root | — | Root identity | Never stale; O(N) walk plus each table per new root (F-186) |
| `windowsFile` | `windowSlice.ts:24`; loaded `nexusSlice.ts:168`, `:171` | `nexus.db` `windows` | `windows:load` on first load only | `commitWindow` (`windowSlice.ts:125-133`) | `resetWindow` | Refs resolve only at open (`:100-114`); dead refs persist in the file |
| Navigation refs | selection, `tabs`, `pinned`/`pinnedTabs`, `recents` (`navigationSlice.ts:71-97`); glances (`glanceSlice.ts:19`); `historyTarget` | Tree ids + paths; `state.json` pins; `nexus.db` tabs/recents | Reconciled inside every `applyTree` (`nexusSlice.ts:192-194`); pins via `nav:changed`; tabs/recents read once | Every navigation action | Resets | None after `applyTree` returns; resolved rows derived per render (`useNavData.ts:23-35`) |
| `matrixConfig` | `matrixSlice.ts:29` | `matrix.json` | `matrix:read` in load; `matrix:changed` (stabilized, `:195-196`) | `patchMatrix` (`:189-192`) | `resetMatrix` | An echo of an older write can roll back a newer section; load guards per section (`:161-167`), the push path doesn't |
| `matrixGraph` (+ `matrixTree`) | `matrixSlice.ts:30`; `matrixRuntime.ts:148` | Content index `relations`; the tree | Load; 150 ms per-path refetch on `values:changed`/`pages:changed` (`:113-131`, `:198-210`); `matrixTree` re-walked per new tree root while visible | — | `unloadMatrix`, `resetMatrix` | 150 ms + a round trip |
| `matrixPositions`/`matrixLens` | `matrixSlice.ts:31-32`, `unsaved` `:85` | `nexus.db` layout | Load | `saveMatrixLayout` (`:212-225`) | Unload/reset | Window-led; lost nodes pruned once per load (`:182-185`) |
| `syncStatus` | `nexusSlice.ts:39`, `:135` | Host sync client | `sync:changed` only | — | Not cleared by `resetNexusSession` | Carries the previous Nexus's status across a switch until the new one pushes |
| `assetMap` | `cacheSlice.ts:9`, `:39-41` | Host asset listing | `assets:map` ask per root (`useBridgeSubscriptions.ts:105-110`); `assets:changed` | — | `resetCaches` | The ask's reply isn't ordered against a push that lands before it |

Also held: PageTile's `seed` detail per embed (`PageTile.tsx:71-82`) and the DOM's CSS variables and classes (see *§The Two Settings Copies*).

### Push Consumers

The window already runs a change vocabulary for three of the four content pushes. `values:changed` carries `{rel, pageIds, bodyOnly}` (`tree.ts:77-82`), `pages:changed` carries paths, `tiles:changed` names one host, and each consumer reacts per item. Only `nexus:changed`, with settings and commands riding inside the tree, is whole-state. `Pushes` declares 14 channels (`bridge.ts:267-284`); `useBridgeSubscriptions.ts` subscribes 13 and `tileDocStore.ts:212` takes the 14th, although the file's header says every push lands there (`useBridgeSubscriptions.ts:1`).

| Push | Consumer | On receipt | Cost | Duplicates | Under change lists |
|---|---|---|---|---|---|
| `nexus:changed` | `applyTree` (`nexusSlice.ts:186-201`) | See below | Per push: O(N) compare + O(N) index when the root moves + O(tabs × history) + one store notification, plus every tabled DOM key when the settings copy moved | The optimistic patch already applied the change; the host already knew it (F-186); personalization and commands are store twins | Per-change: `upsert`/`move`/`remove` touch records; reconcile only held refs naming moved or removed ids; `config` → one key |
| `values:changed` | `useBridgeSubscriptions.ts:49-64` | Per id not `bodyOnly`: `dropCacheDetail`, which scans every warm entry (`warmCache.ts:36-40`); bump `valuesEpoch`; queue Matrix refetch | Per changed page, plus one `view:loadValues` per mounted view or panel in scope | Frontmatter re-read on three paths: view values, `page:open`, `matrix:graph` | Already per-change; stays |
| `pages:changed` | `useBridgeSubscriptions.ts:67-91` | Per path: `absorbLanding` merge, or flush + `replaceBody`, or conflict capture + `replaceBody`; `loadHeadings(paths)`; Matrix refetch | 1–2 asks per path | — | Already per-change; stays |
| `tiles:changed` | `tileDocStore.ts:212-217` | Every open doc's listener filters by key; the match drops bodies and reloads | O(open docs) filter + one `tiles:get` | — | Whole doc per host; stays |
| `nav:changed` | `applyNavChanged` (`navigationSlice.ts:505-511`) | `setPinned`, banner, graduate, ensure active | O(pins + tabs) | Echoes the window's own `nav:write`; `pinned` isn't stabilized, so an echo re-identifies it | `config('pinned')`, still a whole list |
| `matrix:changed` | `applyMatrixChanged` (`matrixSlice.ts:195-196`) | Stabilize whole config | O(config) | Echoes own writes | Per-section config |
| `assets:changed` | `applyAssetMap` (`cacheSlice.ts:39-41`) | Stabilize whole map | O(asset files) | — | Could be per-file; stays whole unless designed |
| `sync:changed` | `applySyncStatus` | Replace | O(1) | — | Unchanged |
| `theme:systemAccent` | `applySystemAccent` (`useBridgeSubscriptions.ts:38`) | One CSS variable | O(1) | — | Unchanged |
| `win:fullscreen`, `web:popup`, `menu:action`, `nexus:openRecent`, `app:flush` | `useBridgeSubscriptions.ts:35-37, 112-132` | Events, not state | — | — | Unaffected |

**`applyTree`, in order:**

1. `stabilize(incoming, prev)` (`:188-189`).
2. `set({ status: 'ready', tree })` (`:190`), store notification 1.
3. `reconcileIndexOf(tree)` (`:191`), a full walk when the root is new (`treeIndex.ts:48-55`, `:57-142`).
4. `reconcileNavigation` (`navigationSlice.ts:616-648`): `setPinned` `set`s (`:269-278`), which notifies only when something moved (`c2977396e`). Then the selection is reconciled and a moved page re-`select`s. Then slots prune, each tab's history is pruned (`tabsModel.ts:82-92`), dropped tabs lose their warm owner and glance pins, and the result goes to `applyTabResult` or `ensureLiveActive`.
5. `reconcileWindow` (`windowSlice.ts:261-279`), which commits and schedules a windows save only on change, and `reconcileGlance` (`glanceSlice.ts:50-56`).
6. When `tree.personalization` changed identity: `set({ personalization })` and `applyPersonalization`, which rewrites every tabled key (`:196-199`).
7. When `tree.commands` changed identity: `set({ commands })` (`:200`).

The device-prefs read, the first full `loadHeadings()`, and the accent ask left `applyTree` in `44885c23c`: `load` asks `devicePrefs:load` ahead of the tree (`:147-157`) and headings after it (`:159`), and the OS accent arrives as the `theme:systemAccent` push.

Every notification runs every `useSession` selector plus `matrixRuntime.sync` (`matrixRuntime.ts:89`). A new root then re-renders 20 `useSession((s) => s.tree)` subscribers, rebuilds `useConnections` (`pageConnections.ts:39`), and so nudges every mounted editor's decorations (`MarkdownEditor.tsx:106-108`). It also re-walks `matrixTree` when the Matrix is visible.

**If the host pushed changes:** only `applyTree` changes character. Its tree half becomes per-change, and its reconcile calls could narrow to the ids a `move` or `remove` names, although those passes are O(held refs) today, not O(N). The whole-state residue is open, Reload, and the walk fallback; the once-per-Nexus bootstrap already lives in `load`. `values`, `pages`, and `tiles` are change-shaped already, and the three stabilized pushes (`nav`, `matrix`, `assets`) are small.

### The Two Settings Copies

The trace for one Settings change, `editorScale`:

1. `setPersonalization` normalizes the value (`configSlice.ts:44-45`) and writes the slice while leaving `tree.personalization` stale (`:47-53`).
2. `applyPersonalizationKey` writes `--editor-scale` (`:54` → `applyPersonalization.ts:38`, `:66-82`).
3. It asks `personalization:set` (`:55`).
4. The host validates and writes `settings.json` (`Settings/handlers.ts:44-46`, `settings.ts:160-165`). Then `confirmSettingsWrite` → `confirmBy` → `patchSettingsFromDisk` re-reads the whole file and `applySettingsLeaves` builds a new root every time (`watchPatch.ts:423-441`). `now !== before` holds (`mutatePatch.ts:235-236`), so `pushConfirmed` sends the whole tree a macrotask later (`confirm.ts:10-16`).
5. The window's `applyTree` runs `stabilize` against its stale `tree.personalization`, so the root re-identifies, and the whole sequence above runs. The identity gate swaps the slice's object for the tree's and `applyPersonalization` rewrites every tabled key (`nexusSlice.ts:196-199`). Since `44885c23c` only a push whose settings copy moved reaches the slice, so an unrelated confirm no longer rolls a toggle back; two toggles of different keys inside one round trip still do (F-194).

**Copies of `personalization`:**

- The slice (`configSlice.ts:16`).
- The store's `tree.personalization` (`tree.ts:107`).
- The host's live tree (`watchPatch.ts:430`, read back by `settings.ts:37-41` for 19 host files).
- `settings.json`.
- The DOM's variables and classes (`applyPersonalization.ts:71-81`).
- The slice's `commands` twin of `tree.commands`.
- `editorSettingsOf`'s identity memo (`MarkdownPM/api.ts:82-94`).

**Call sites:**

- `applyPersonalizationKey`: `configSlice.ts:54`; `SettingsWindow.tsx:294` (slider live preview); and inside `applyPersonalization` (`applyPersonalization.ts:87`).
- `applyPersonalization`: `nexusSlice.ts:198`.
- `applySystemAccent`: `useBridgeSubscriptions.ts:38`, on the `theme:systemAccent` push.

Because a settings push re-applies every key, one landing mid-drag snaps a slider's DOM preview back to the tree's value.

**Under `config(key, value)`,** three copies remain: disk, the host's config record, and the window's config record, with the DOM as its materialization. The store's tree copy and the `commands` twin go. `applyPersonalizationKey` becomes the window's per-key config applier. `applyPersonalization` runs once at load; `applySystemAccent` already runs only on the OS-accent push (`44885c23c`). The law doesn't by itself fix echo ordering: a host `config` echo for an older value landing after a newer local change of the same key still rolls it back. That needs per-key sequence numbers, origin-tagged changes, or no echo of the window's own config writes.

### Late-Reply Idioms

| Family | Idiom | File:line | Cause |
|---|---|---|---|
| Effect-scoped cancel | `canceled` on container swap | `useContainerValues.ts:73-80` | Inherent |
| | `live` flag | `PropertyPanel.tsx:116-125`; `PageTile.tsx:97-107` (and `MarkdownTile`, `PageHistoryWindow` ×2, `useNavThumbnails`, `useConnectionAutocomplete`) | Inherent |
| | `mountedGen` vs `warmGeneration()` | `PageView.tsx:33-36`, `:123` | Inherent |
| Module counter / generation | `pageFetchSeq` | `navigationSlice.ts:179`, `:326-333`, `:561`, `:622`, `:689` | Inherent |
| | `coldStampSeq` | `navigationSlice.ts:182`, `:327`, `:564` | Inherent (animation) |
| | Matrix `generation` | `matrixSlice.ts:83`, `:116-120`, `:150-160` | Inherent |
| | Matrix `switches` | `matrixSlice.ts:87`, `:217-222`, `:244` | Nexus-switch safety |
| | Matrix `asked` per-section snapshot | `matrixSlice.ts:152`, `:162-166` | Inherent (load vs. local patch) |
| | `warmCache` `generation` | `warmCache.ts:43-49`, `:58-69` | Inherent |
| | Override `settles` | `valueOverride.ts:13-15`, `:25`, `:44-55` | Inherent |
| | `fullReads` | `useContainerValues.ts:35`, `:52-55` | Inherent |
| | Body `heads` seq | `pageDetailCache.ts:47-92` | Local-edit ordering across mounts |
| | Glance `pendingFetch` | `GlancePane.tsx:80`, `:130-136` | Inherent |
| Identity ownership | `inFlight.get(path) === p` | `pageDetailCache.ts:96-110` | Inherent |
| | `inFlight.get(key) === run` | `saveScheduler.ts:40-42` | Inherent |
| | `at(doc.host) !== doc`, `lastSave !== saved`, `writing`/`overlapped`, `holds`/`heldPush` | `tileDocStore.ts:103`, `:124-137`, `:159`, `:182-195`, `:280-293` | Inherent |
| | `entry.write !== write` | `valueOverride.ts:32-39` | Inherent |
| | `handled.current`; `live.current.path !== path` | `useContainerValues.ts:36-38`, `:49`, `:55` | Epoch dedupe |
| | `inFlightTitles`/`failedTitles` | `cacheSlice.ts:18-34` | Dedupe |
| Nexus-switch gates | `nexus.id` after flush | `nexusSlice.ts:208`, `:230` | Safety; survives |
| | Hold/release | `saveScheduler.ts:14-15`, `:33`, `:80-98`; `nexusSlice.ts:90-91`, `:106` | Safety; survives |
| | `matrixLoad: 'switching'` | `matrixSlice.ts:24`, `:246` | Safety; survives |
| Tree identity as a signal | `matrixLoad.refused.tree !== tree` | `matrixSlice.ts:26`, `:146-149`, `:171` | Tree identity as a "moved" signal |
| Missing (F-196) | `loadHeadings`, `reloadPage`, the `assets:map` ask | `nexusSlice.ts:137-141`; `navigationSlice.ts:605-614`; `useBridgeSubscriptions.ts:106-108` | Mixed |

The once-per-Nexus gates (`devicePrefsState`, `headingsLoaded`, `systemAccentCache`, and `activeTabId === ''`) left with `44885c23c`, and `applyTree` no longer awaits. Everything else guards lazy fetches of content the tree never carries, or Nexus-switch safety, and survives any push shape.

### Stabilize

`stabilize` (`treeStabilize.ts:5-27`) walks `next` recursively against `prev`. An array or object whose length or key count matches, and whose every child comes back identical, returns `prev`. Otherwise it returns a fresh container holding the recycled children, and primitives return as-is.

For an IPC-delivered tree, every object is new, so it visits every node and allocates a discarded container per object: O(N) time and transient memory per push. F-186 measured 7 ms at 10,000 pages. For the window's own optimistic patches it's cheap, because unchanged subtrees short-circuit on `Object.is`.

**What depends on it:**

- The `treeIndex` WeakMap (`treeIndex.ts:46-55`). Only a true echo returning `prev` avoids a full rebuild.
- Subtree selectors keep identity: `pageMetaOf` (`store.ts:61-64`), Sidebar rows, and every memo keyed on a subtree.
- Root-keyed consumers re-render on any real change: 20 `useSession((s) => s.tree)` subscribers, `useConnections` → editor nudges, and `matrixRuntime`'s `held.tree` (`matrixRuntime.ts:148`).
- PropertyPanel retires a Space's override on its node's identity swap (`PropertyPanel.tsx:139-142`). That is a behavioral dependency: without stabilize, every push would retire every settled Space override.
- The node factories. `treePatch.ts:10`, `:381`, and `:507` bind every producer to emit identical key sets, keeping a cleared key as `undefined`, because stabilize compares key counts (`treeStabilize.ts:18`). Their stated premise is that an optimistic node missing a key never converges with the confirm push. That's a perf-identity invariant imposed on every producer; whether IPC keeps `undefined`-valued keys is unverified here.
- `repointRegistryInTree` (`treePatch.ts:326-340`, host-side) stabilizes the registry so one def object sits in both `tree.registry` and each Collection's `properties`, and `d === held[i]` detects change.
- Non-tree users: `applyAssetMap`, `applyMatrixChanged`, `CardsView.tsx:317`, and host-side `pageMetadata.ts:47,104` and `assetMap.ts:96`.

**Under window-held records with change lists,** the window's tree use of stabilize goes, because identity holds by construction: an untouched record keeps its object. Three replacements are needed instead:

- A per-record equality check in `apply`, so an echoed `upsert` of an optimistically applied record is a no-op.
- Spine-only rebuilds of any nested projection, which `treePatch`'s path-copying already does.
- For open, Reload, and the walk fallback, a host-side id-keyed diff of old and new records. That is stabilize's O(N) moved to the host and keyed by id rather than position. Otherwise `nexus:changed` and stabilize survive for those paths, which is F-186's own plan.

`repointRegistryInTree` goes if Collections reference defs by id. The key-count rule goes with stabilize.

### Inventory & Collapse

| File | LOC | Job | Twin | Under the law | Survives | Safety held |
|---|---|---|---|---|---|---|
| `Session/store.ts` | 80 | Compose slices; `useSetting`, `useFold`, `pageMetaOf` | Unique | Survives; `pageMetaOf` reads records | 80 | — |
| `Session/sessionState.ts` | 27 | State type | Unique | Survives | 27 | — |
| `Session/nexusSlice.ts` | 300 | Open/switch, `load`, `applyTree`, `mutate` | `applyTree` parallel to the host confirm; the `mutate` switch duplicates the host router (F-187) | `applyTree` (16) survives for whole pushes; switch (45) → one shared call (~6) | ~255 | Flush-before-move `:209-228`; `nexus.id` after flush `:208`, `:230`; hold `:90-91`, `:106`; `cancelAllSaves` `:67` |
| `Session/configSlice.ts` | 83 | Settings, commands, device prefs, citations | `personalization` twin of the tree; `commands` duplicate | Tree patch `:46-53` goes | ~75 | `devicePrefsLive` save gate `:64` |
| `Session/cacheSlice.ts` | 53 | Link titles, asset map, values epoch | Unique | Survives | 53 | — |
| `Session/editSlice.ts` | 165 | Rename/icon/color sessions | Unique | Survives | 165 | Flush before root rename `:128-130` |
| `Session/chromeSlice.ts` | 99 | Menus, confirms, picks | Unique | Survives | 99 | — |
| `Session/layoutSlice.ts` | 46 | Pane layout | Unique | Survives | 46 | — |
| `Session/glanceSlice.ts` | 58 | Pinned glances | Reconcile parallel to window/nav | Survives | 58 | — |
| `Session/windowSlice.ts` | 286 | Floating windows | Reconcile parallel | Survives | 286 | — |
| `Session/navigationSlice.ts` | 696 | Selection, slots, tabs, pins, recents | Slots parallel to the detail cache | Survives | ~693 | `pageFetchSeq`; reset clears caches and tile docs `:688-693`; body-epoch reseed `:377-386` |
| `Session/matrixSlice.ts` | 249 | Matrix config, graph, layout | Whole-config echo | `refused.tree` → a store version | ~246 | `generation` `:83`; `switches` `:87`, `:217-222` |
| `Session/viewSearchSlice.ts` | 56 | View search | Unique | Survives | 56 | — |
| `Session/useBridgeSubscriptions.ts` | 133 | Push fan-in | Unique | `nexus:changed` line → a change channel | 133 | Flush before `replaceBody` `:75` |
| `Session/pageDetailCache.ts` | 161 | Content cache, body heads, epochs | Parallel to warm detail and slots | Survives | 161 | Fetch ownership `:96-110`; body epoch `:134-151` |
| `Session/warmCache.ts` | 76 | Editor warmth | Parallel | Survives | 76 | Clear generation `:43-49` |
| `Session/saveScheduler.ts` | 170 | Debounced writers | Unique | Survives | 170 | Held-saves gate `:14-15`, `:33`, `:80-98`; one in flight per key `:29-45` |
| `Session/reconcileSelection.ts` | 63 | Ref reconcile | Parallel to `liveTarget` | Survives over records | ~60 | — |
| `Session/pageConnections.ts` | 40 | Editor connections | Unique | Survives; keyed on page-index identity | 40 | — |
| `Session/undo.ts` | 42 | Value undo | Unique | Survives | 42 | — |
| `Nexus/treeStabilize.ts` | 28 | Identity restore | Unique | Tree use goes; asset, Matrix, and host callers keep it | 28 (0 if those also become changes) | — |
| `Nexus/treeIndex.ts` | 361 | Walk + projections | Parallel to host indices (F-188) | The walk becomes the record map; projections maintained incrementally; finders become record reads. A rewrite, not a deletion | ~400 ± 60 | — |
| `Settings/applyPersonalization.ts` | 88 | DOM application | Unique | Survives | ~92 | — |
| `Settings/personalization.ts` | 263 | Setting schema | Unique | Survives | 263 | — |
| `Settings/devicePrefs.ts` | 69 | Device-pref shape and its decoder (`44885c23c`) | Unique | Survives | 69 | — |
| `Navigation/navResolve.ts`, `navSearch.ts`, `navRef.ts`, `tabsModel.ts` | 432 | Ref types, resolution, tab model | `liveTarget` parallel to `reconcileWith` | Survive | 432 | — |
| `Views/Host/useContainerValues.ts` | 102 | View values | Parallel to PropertyPanel | Survives (content) | 102 | — |
| `Properties/valueOverride.ts` | 57 | Optimistic values | Unique | Survives | 57 | — |
| `Pages/pageDetail.ts` | 13 | Type | Unique | Survives | 13 | — |
| `Tiles/tileDocStore.ts` | 347 | Tile docs | Unique | Survives | 347 | Drop without writing `:334-347` |
| **Total** | **4,643** | | | | **≈4,580 (−1.4%)** | |

**Basis:** Only `nexusSlice`, `configSlice`, `treeStabilize`'s tree use, and `treeIndex`'s shape change; roughly 3.6K lines of navigation, window, tab, edit, chrome, glance, save, cache, content, and tile code don't touch the push shape. The law also adds its applier and change types, shared host and window, at about 100–200 lines outside these files, so this slice nets roughly flat. Most of what it removes here, the audit's fixes remove already: F-187 the mutate switch, F-194 the settings rider, F-186/F-188 the per-push stabilize and index rebuild; `44885c23c` took the F-195/F-196 gates.

### Divergences

- **"An echoed push re-renders nothing"** (`DesktopPM.md:14`; also `CorePM.md:77`). A true echo commits nothing, but it still does work:
  - an O(N) compare;
  - one store notification, running every selector and `matrixRuntime.sync`.

  "A real change re-renders only what moved" holds for subtree selectors only. Any real change re-identifies the root, re-renders 20 root subscribers, rebuilds the index, and nudges every mounted editor.
- **The settings confirm is never an echo.** `configSlice.ts:46` says a new tree identity is "a cost a boolean toggle must never pay," yet one round trip later `applySettingsLeaves` (`watchPatch.ts:428-440`) plus the window's stale tree copy re-identify the root (`nexusSlice.ts:189`). Every toggle pays the full-root cost.
- **"The store slice is what updates live"** doesn't appear in `CorePM.md` or `DesktopPM.md`. The nearest statements are comments: `pageConnections.ts:16` ("setPersonalization updates it before the tree echoes") and `configSlice.ts:46` ("Everything else reads the slice"). Since `44885c23c`, `applyTree` overwrites the slice only when the tree's copy changed identity (`nexusSlice.ts:196-199`), so optimistic patches built from the stale tree no longer reach it; a settings push carrying another key's older value still does (F-194).
- **Warm tab state ending "on an outside edit to that page"** (`CorePM.md` §Persistence, "Lasts the run"). The entry isn't ended: `dropWarmDetail` removes only `pageDetail` (`warmCache.ts:36-40`), and editor state and scroll are fenced lazily at restore by body text (`PageView.tsx:117-120`, `warmSeam.ts` `fenceWarm`). A frontmatter-only outside edit keeps the editor warm. That's a mechanism difference, not a defect.
- **"A new lookup belongs here, never as its own walk"** (`treeIndex.ts:1`; `CorePM.md:79`). `findCollection`, `findSet`, and `spaceNodeOf` walk per call (`treeIndex.ts:293-336`), and `matrixTree` re-walks per root (`matrixInput.ts:31`). This is F-188; `ed0fcaf0a` retired `findCollectionForSet` and closed F-189.

### Plan Inputs

The shared change vocabulary, the applier, the reply's change list, the per-op emission table, the side-by-side harness, and the host-side files are in *B — Write Path & Confirmation*, *§Plan Inputs*. This section covers the window's half and the settings move.

**The Shared Mechanism:** `applyTree` is the single entry point for a whole-tree push that also carries configuration. F-186 is the whole-tree cost and F-194 the configuration rider; `44885c23c` closed F-195 and F-196's tree-apply race by moving the once-per-Nexus work into `load` and gating the settings copy on identity. F-575 has landed (`100d17882`) as the per-id `pagesByIdOf` drop at `useBridgeSubscriptions.ts:56-58`. F-340 is independent of push shape. F-527 concerns content-override representation, so the law doesn't touch it.

#### Phase 1: Settings Off the Root

**The Toggle at HEAD:** `setPersonalization` (configSlice.ts:43-56) writes the slice, patches the tree only for `defaultIcons` (:47-53), paints the one key (:54), and asks `personalization:set` (:55). The host writes through `writePersonalization` (settings.ts:160-165) → `updateSettings` (:17-23), which discards the record, then `confirmSettingsWrite` (confirm.ts:54-55) → `confirmBy` → `patchSettingsFromDisk` (watchPatch.ts:423-425) re-reads the whole file, and `applySettingsLeaves` (:427-441) spreads a new root every time, so `now !== before` (mutatePatch.ts:235-236) and `pushConfirmed` sends the whole tree a macrotask after the reply. The window's `applyTree` (nexusSlice.ts:186-201) finds a new root (its own `tree.personalization` is stale for every key but `defaultIcons`), so the `treeIndex` WeakMap misses (treeIndex.ts:46-55), the index walks and the reconcile table rebuilds, the three reconciles run, and every root subscriber re-renders; the identity gate (:196-199) then replaces the slice and `applyPersonalization` rewrites every tabled key.

**What Phase 1 Removes:** With settings in their own record, `applySettingsLeaves` replaces that record and the tree root keeps its identity, so a toggle no longer misses the index WeakMap, runs the reconciles, or re-renders the root's subscribers. `configSlice.ts:46-53`'s `defaultIcons` tree patch goes, provided the index stops reading settings from the tree: `treeIndex.ts:57-70`'s walk reads `tree.personalization.defaultIcons` and `tree.nexus.profileIcon`, so either the icon resolution leaves the walk or the index keys on the settings record too.

**What Remains Until Phase 2:** The confirm still re-reads all of `settings.json` for one key, and the whole settings record still arrives in a push. Two toggles of different keys inside one round trip still roll the second back: the first key's push carries the second key's old value, `applyTree`'s gate sees a changed copy, and the slice and the DOM show the old value until the second push lands (F-194). The same push snaps a slider's live preview (`SettingsWindow.tsx:294`) back mid-drag. Both close when the reply carries the one key it wrote and the window applies that key alone.

**The Push:** Phase 1 has to carry the settings record to the window somehow, since today it rides inside `nexus:changed` (bridge.ts:275). Either the payload becomes the tree plus its configuration, as `NexusState` would (`tree.ts:117`), or a separate configuration push joins `Pushes` (bridge.ts:267-284). That's the one design call phase 1 forces.

**Root Fields and Their Readers:** The root holds `nexus.profileImage`/`profileIcon`/`profileSubtitle`, `homepage`, `crops`, `pageMetadata`, `contextOrder`, `personalization`, `commands`, `excluded`, `assetDirectory`, and `registry` (tree.ts:89-115). Non-test readers, found by a `tree.<field>` search that misses destructured reads:

| Field | Readers |
|---|---|
| `personalization` | configSlice.ts:50-51, nexusSlice.ts:196-198, treeIndex.ts:59, contextIdentity.ts, sidebarDndModel.ts |
| `commands` | nexusSlice.ts:200 |
| `excluded`, `assetDirectory` | ExcludedDirectoriesRow.tsx, frames.ts, AssetDirectoryRow.tsx, filePick.ts, FileEditor.tsx |
| `homepage` | HomepageView.tsx (2), NavBanner.tsx, nexusSlice.ts:268 |
| `crops` | AssetImage.tsx, ImagePicker.tsx |
| `pageMetadata` | store.ts (`pageMetaOf`), treeIndex.ts, Sidebar.tsx, pickTree.ts, matrixInput.ts (2), editorHost.tsx (2), pageRow.ts, useViewHost.ts (2) |
| `contextOrder` | PropertyPanel.tsx (2), watchPatch.ts |
| Profile fields | useNexusIcon.ts (2), treeIndex.ts |
| `registry` | entityMenuActions.ts, MatrixMenu.tsx, matrixInput.ts, PropertyPanel.tsx, PropertyFrame.tsx, restoreScrub.ts, spend.ts, treePatch.ts (3), watchPatch.ts |

On the host, `liveLeaves` (settings.ts:37-41) serves `readLivePersonalization`, `readLiveCommands`, `readWatchScope`, `readLiveSetting`, and `readFileHistoryConfig` from `heldTreeOf(root)`; 19 host files call them, and they keep their signatures while `liveLeaves` re-points to the settings record. `updateScope` (settings.ts:72-78) is the one writer that patches the live tree from inside a writer. The root is built by the walk (`readNexus.ts`, slice A) and by `Core/Testing/testTree.ts`'s `makeTree` (104 lines, root literal :5-64), which 35 test files build through.

#### Phase 2: The Window's Apply

**The Switch at HEAD:** `mutate` (nexusSlice.ts:207-298) flushes saves a path-moving op would strand (:210-227), asks `mutate` (:231), then applies 15 case labels (:243-280): `orderInTree` for movePage, moveSet, reorderChildren, and reorderTop (:244-248); `renameNodeInTree`, `removeNodeInTree`, `patchNodeInTree` for setIcon, setDisclosureLock, setActiveView, and setHeadingIconHidden (the homepage arm inline); `patchContextGroupsInTree` for the five Context ops. A create inserts through `insertCreatedInTree` only when a caller passes `onCreated` (:284-296). Each lands through a second `applyTree`.

**What `applyTree` Costs Now:** After `44885c23c` it's synchronous and holds no once-per-Nexus work: `load` reads the device record ahead of the tree (:147-157) and asks headings after it (:159), and the accent is a push. A whole-tree apply still costs `stabilize`'s O(N) compare (:189), a full index walk plus the reconcile table on any new root (treeIndex.ts:46-176), the three reconciles, one store notification (more only when navigation or the settings copy moved), and every root subscriber's re-render.

**What the Window's Apply Needs That the Host's Doesn't:**

- Flush-before-move (nexusSlice.ts:210-227) stays ahead of the ask.
- `patchPagesFor` (navigationSlice.ts:675-685) drops a deleted page's detail and slots and a page banner's cached detail, keyed off the request today; it keys off a `remove` or page `upsert` change instead.
- Re-pathing held references: `reconcileNavigation`, `reconcileWindow`, and `reconcileGlance` (navigationSlice.ts:616-648, windowSlice.ts:261-279, glanceSlice.ts:50-56) consume a `ReconcileIndex` (reconcileSelection.ts:7-13) that `reconcileIndexOf` builds per root (treeIndex.ts:146-176). Only a `move` or `remove` can strand a reference, so the other entries can skip the reconciles.
- `treeIndex` maintenance: one walk per root feeds ten lazy projections (treeIndex.ts:32-44). Every applied change makes a new root, so without incremental maintenance each change still rebuilds the index, once per change rather than twice per mutation as today. Incremental maintenance is the larger job and can follow.
- Echo identity: an optimistically applied change followed by the reply's change has to leave the record untouched, which a per-record equality check in the applier gives in place of `stabilize`.
- The view paint-ahead (`pendingView.ts:121-157`) folds `orderInTree` over the store tree; it composes the shared applier instead.
- A version stamp with resync, since change lists heal only what they name.

The host needs what the window doesn't: the root pin (watchPatch.ts:229-235), the epoch (liveTree.ts:19, 26-39), and the walk fallback.

#### Per File

| File | Deleted | Survives | Added |
|---|---|---|---|
| `Core/Session/nexusSlice.ts` (300) | Phase 2: the switch (:238-282) and the create insert's own transform (:284-296 keeps `onCreated` ordering) | `load`, `openVia`, `applyTree` for whole pushes, flush-before-move, the `nexus.id` gate | An `applyChanges` action |
| `Core/Session/configSlice.ts` (83) | Phase 1: the tree patch (:46-53) | The slice, `setDevicePref`, citations | A per-key setter the reply's change calls in phase 2 |
| `Core/Session/useBridgeSubscriptions.ts` (133) | — | `nexus:changed` (:46) for whole pushes | The change-list subscription |
| `Core/Nexus/treeIndex.ts` (361) | — | Everything | Incremental maintenance, when taken on |
| `Core/Nexus/treeStabilize.ts` (28) | — | Whole pushes, `applyAssetMap`, `applyMatrixChanged`, `CardsView.tsx:317`, `pageMetadata.ts:47,104`, `assetMap.ts:96`, `repointRegistryInTree` | — |
| `Core/Nexus/tree.ts` | Phase 1: the root's configuration fields (:90-112) | The entity shape | The settings record's type |
| `Core/Settings/settings.ts` (171) | Phase 1: `liveLeaves`'s tree read (:37-41) | Every reader's signature | — |
| `Core/Testing/testTree.ts` (104) | Phase 1: the root literal's configuration keys | The builder | The settings record's builder |

**Non-Test Importers:** `nexusSlice.ts` is imported by `store.ts`, `sessionState.ts`, `editSlice.ts`, and `useBridgeSubscriptions.ts` (`flushAllSaves`). `configSlice.ts` by `store.ts` and `sessionState.ts`.

**Test Files:** `store.test.tsx` (1,120), `useViewHost.test.tsx` (940), `useTileDoc.test.tsx` (498), `devicePrefsSeed.test.tsx` (389), `TrashFrame.test.tsx` (265), `useBridgeSubscriptions.test.tsx` (209), `Ribbon.test.tsx` (196), `configSlice.test.ts` (69), `applyPersonalization.test.ts` (36), `treeIndex.test.ts` (195), `treeStabilize.test.ts` (52), and the 35 files building through `makeTree`. The tests that touch root configuration fields directly: `spend.test.ts` (1,713), `mutate.test.ts` (2,439), `readNexus.test.ts` (858), `watchPatch.test.ts` (787), `matrixInput.test.ts` (163).

#### Names

Candidates: the settings record's type (`NexusConfig`) and its field on `NexusState` and the window store; `applyChanges` on the nexus slice; a configuration push (`config:changed`) if phase 1 doesn't extend `nexus:changed`'s payload. The change-list push and the union are named in B.

#### Own Plan?

No. Phase 1's piece re-points about 35 read sites behind one record and a push decision; phase 2's piece is the window half of B's applier. Incremental `treeIndex` maintenance is the only part large enough to stand alone, and correctness doesn't depend on it.

#### Estimated Lines

| Phase | Removed | Added | Basis |
|---|---|---|---|
| 1 | ~30 | ~40 | configSlice.ts:46-53, tree.ts:90-112's fields and `applySettingsLeaves`'s root spread out; the record type, its read in `liveLeaves`, the push, and the `testTree` builder in |
| 2 | ~55 | ~40 | nexusSlice.ts:238-296 out; `applyChanges`, the subscription, and the version check in; about 60 more if incremental index maintenance lands |

### Out-of-Slice

- `pushConfig` echoes the app's own `state.json`/`matrix.json` writes, deduping against the last pushed text rather than the window's write (`watcher.ts:48-66`, `:94-96`).
- `applySettingsLeaves` builds a new root and re-reads all of `settings.json` for one key (`watchPatch.ts:423-441`).
- `applySystemAccent` forces a style read when `systemColor` is null (`ramp.ts:166-170`, `:173-181`).
- `PageTile.tsx:76` imports the host walk `pageIdIndex` (F-188).
- `repointRegistryInTree` keeps defs in two homes by identity (`treePatch.ts:326-340`).
- The mutate handler pushes `pages:changed`/`tiles:changed` ahead of the confirm (`Nexus/handlers.ts:175-178`).
- The walk fallback (`mutatePatch.ts:212-237`) is where a change-list host would need an id-keyed diff.

### Confidence

Everything above is from reading the code; nothing was driven live.

- **High:** the inventory, the push table, the `applyTree` sequence, the settings trace, and the idiom catalogue.
- **Medium:** the slot-banner staleness (read end to end through `replaceBody`/`absorbLanding`/`PageView`, not observed), the `syncStatus`-across-switch effect on `NexusRows`, and the narrow echo-rollback timing.
- **Estimates:** the LOC projections are judgment. The `treeIndex` rewrite could land ±60, and the applier's size depends on a design that doesn't exist yet.
