### Channel Census

`bridge.ts` declares **115 channels**: 97 Asks (:60-252), 5 Tells (:254-262) and 13 Pushes (:264-280). I scripted the counts, and every channel is named below.

| Class | n | Channels |
|---|---|---|
| Read · Nexus content | 11 | nexus:state, index:headings, assets:map, page:open, view:loadValues, tiles:get, tiles:readMarkdown, matrix:read, matrix:graph, trash:list, nav:read (mixed: state.json plus local recents, navigationFile.ts:34-38) |
| Read · per-machine | 10 | history:list, history:read, editorPrefs:get, citations:get, matrixLayout:load, tabs:load, windows:load, devicePrefs:load, linkTitles:get, delete:facts |
| Write · Nexus via `mutate` | 1 | mutate: 31 ops (mutateRequest.ts:62-111) |
| Write · Nexus, bypassing `mutate` | 40 | nexus:rename · page:updateBody, history:restore · views:save/duplicate/reorder/delete/restore, container:configure · schema:add/reorder/unassign/assign, registry:reorder, property:rename/delete/replayDelete/setLinkConfig/setCheckboxColor/setIcon/setNumberFormat/setFileDirectory/editOption/renameOption/removeOption/clearOption · tiles:save/createMarkdown/removeTile/restoreTile/writeMarkdown/convert/duplicateTile · personalization:set, exclusions:set, exclusions:clear, assets:setDir, matrix:write, nav:write (mixed: pins go to state.json and recents to local state, navigationFile.ts:40-61) · assets:adopt |
| Write · per-machine | 11 | history:delete, history:clear, editorPrefs:set, citations:set, matrixLayout:save, tabs:save, windows:save, devicePrefs:save, linkTitles:fetch, capture:thumbnail, nav:evictThumbs. The last two write under `.nexus/assets/<id>/thumbnails`, which the sync manifest drops (exclusion.ts:37-41,55), so this is per-machine state stored inside the Nexus. |
| OS / native | 12 | clipboard:write, clipboard:read, path:reveal, assets:chooseDir, exclusions:choose, nexus:pickFile, nexus:pasteImage, link:open, theme:systemAccent, host:platform, menu, editor:menu |
| Session open (outside the eight classes) | 2 | nexus:choose, nexus:openPath. Their adoption pass stamps ids and seeds config, which writes Nexus content outside mutate (Nexus/handlers.ts:33-50). |
| Sync | 8 | sync:state, renameDevice, connect, disconnect, approve, revoke, now, captureLocal |
| Window chrome | 2 | webGuestZoom:set, webGuestMedia:pause |
| Tells · window chrome | 5 | win:dragBy, win:zoom, win:resendFullscreen, app:flushed, web:wheel |
| Pushes · Nexus content changed | 7 | nexus:changed (the whole tree), values:changed, pages:changed, tiles:changed, assets:changed, nav:changed, matrix:changed |
| Pushes · sync | 1 | sync:changed |
| Pushes · OS / native | 2 | menu:action, nexus:openRecent |
| Pushes · window chrome | 3 | app:flush, win:fullscreen, web:popup |

**Write doors:** mutate's 31 ops plus the 40 bypass channels give **71 user-initiated doors** onto Nexus files. That count leaves out the 2 session opens and sync landing.

Three files can each be written through both mutate and a separate channel:

- **Container sidecar:** `setActiveView` and `setDisclosureLock` go through mutate (mutate.ts:117-131). `views:*` and `container:configure` write the same file through their own channels (Views/handlers.ts:14-64).
- **settings.json:** `setProfileIcon` and `setProfileImage` go through mutate (mutate.ts:100-103, setProfileImage.ts:14). `personalization:set`, `exclusions:set` and `assets:setDir` write it directly (Settings/settings.ts:12-16, 76-80, 155).
- **state.json:** `reorderTop` goes through mutate (mutate.ts:150, then reorder.ts:20). `nav:write` writes it directly (navigationFile.ts:50).

Asset adoption also has two doors. Banners and profile images adopt inside mutate (setBanner.ts:26, setProfileImage.ts:12). File properties use a separate ask (Assets/handlers.ts:78, called from Properties/Pickers/filePick.ts:54).

**Why the bypass channels aren't mutate ops.** mutate first appeared on 06-16-2026 (f95a120fe). The dates below come from `git log -S`, meaning when each channel first showed up.

| Family | n | Reason found in code | Verdict |
|---|---|---|---|
| nexus:rename | 1 | The comment says it "re-targets the whole session" (Nexus/handlers.ts:141): it renames the root folder and then re-adopts. | Structural |
| exclusions:clear | 1 | It reaches into excluded folders (exclusionScan.ts:72-93), and mutate's `mutableTarget` refuses those by design. | Structural |
| Body writes: page:updateBody, history:restore | 2 | Base-hash optimistic concurrency with a `BodyWrite` reply (bridge.ts:82-85), plus snapshot capture in `writeBody` (fileHistory.ts:101). | Structural today; a versioned upsert would cover it |
| Views and container config | 6 | Nothing structural. They write the same sidecar `setActiveView` writes. First seen 06-27 (ac3348c83). | History |
| Properties registry and schema | 17 | Nothing structural. mutate already runs journaled multi-file cascades (renameContext/renameSpace, mutate.ts:167-171) and returns `cascade`. `property:setIcon` first seen 07-08 (678eeb9de). The five `defEditOp` channels (Properties/handlers.ts:118-133) are really one "edit a definition field" operation. | History |
| Config files: personalization:set, exclusions:set, assets:setDir, matrix:write, nav:write | 5 | Nothing structural; mutate already writes settings.json and state.json. personalization first seen 07-05 (b81d7bb26). | History |
| Tiles (including writeMarkdown's base hash) | 7 | Tiles aren't nodes in the tree (watchPatch.ts:94-107), and the replies carry `Landed` (tiles.ts:213-216). First seen 09-04 (c280b0b10). | Partly structural: the tree has no tile records |
| assets:adopt | 1 | Returns a path for a later `setProperty` call. Every other adoption happens inside mutate. | History |

**Every bypass family was added after mutate already existed.** They were built beside the dispatcher one feature at a time; they aren't June leftovers. Only 4 of the 40 have a structural reason.

### HostContext & Wrappers

`HostContext` has **20 members** (handlers.ts:42-75):

| Member | Used at |
|---|---|
| push | confirm.ts:14,20,69 · Nexus/handlers.ts:176-177 · Properties/handlers.ts:63 · Assets/handlers.ts:62 · Sync/Client/status.ts:10 (via call.ts:25) |
| pick | Nexus/handlers.ts:124 · Assets/handlers.ts:31,70 · Settings/handlers.ts:29 |
| pasteImage · clipboard · reveal · openExternal · systemAccent | Assets:76 · Interface:87,90 · Nexus:162 · Web:41 · Settings:54 |
| menu · editorMenu | Actions/handlers.ts:9 · :13 |
| thumbnails · webGuests · fetchTitle | Navigation:35,43 · Web:48,54 · Web:31 |
| trashMode | Trash/bundle.ts:65 (every caller of `trashDeps`: mutate, tiles:removeTile/convert, assets:setDir) · Trash/handlers.ts:21 |
| device · secrets · transport | Sync/Client/call.ts:22-25, which feeds Sync/handlers.ts, keyring.ts, pull.ts, push.ts and Arrival/land.ts |
| openStores · adopted · watch · applyZoom | Nexus/handlers.ts:73,80 · :111 · confirm.ts:62 · Settings:49 and Interface:58 |

The members fall into three kinds:

- **13 OS pass-throughs,** each used by one handler file. Eight handlers do nothing except narrow their arguments and forward them to a member of the same name: clipboard:write/read, theme:systemAccent, menu, editor:menu, webGuestZoom:set, webGuestMedia:pause and nexus:pasteImage.
- **3 sync capabilities:** device, secrets and transport.
- **4 lifecycle callbacks:** openStores, adopted, watch and applyZoom. Through these, Core's open sequence tells the host what to do.

**Gates:**

- `withRoot` refuses with `NO_NEXUS` when `sessionRoot()` is null, or answers with `whenClosed` if one is given (handlers.ts:90-95).
- `withWriteRoot` adds a `BUSY` refusal while `adopting()` is true (:98-102).
- Waiting doesn't have its own gate. A waiting open leaves `sessionRoot()` null (session.ts:25-30), so it reads as `NO_NEXUS`, and only nexus:state reports the reason (Nexus/handlers.ts:119-120).
- 15 handlers have no gate: nexus:state, choose, openPath, delete:facts, pickFile, pasteImage, systemAccent, host:platform, the two clipboard channels, link:open, the two webGuest channels, menu and editor:menu. sync:connect re-checks the root by hand (Sync/handlers.ts:349).

**How each handler file confirms its writes:**

| Handler file | Handlers | `confirmWrite` family | Direct push only | Neither |
|---|---|---|---|---|
| Nexus | 7 | 1 (mutate; it also pushes pages, tiles and assets directly, :175-180) | 3 (choose, openPath and rename, through the open sequence's `pushValueChanges` at :98) | 3 |
| Pages | 7 | 0 | 2 (:35, :51) | 5 |
| Properties | 17 | 17 (the 11 that go through `answer` also push tiles:changed directly, :63) | 0 | 0 |
| Views | 7 | 6 | 0 | 1 |
| Tiles | 9 | 0 | 0 | 9 (the 7 writes are confirmed by the `Landed` reply, applied at tileDocStore.ts:134) |
| Trash | 2 | 0 | 0 | 2 |
| Assets | 6 | 1 (setDir, which also pushes assets:changed at :62) | 1 (adopt, :85) | 4 |
| Settings | 6 | 2 | 0 | 4 |
| Sync | 8 | 0 | 0 | 8 (the reply is `SyncState`; status goes out through `setStatus`) |
| Navigation · Matrix · Interface · Web · Actions | 6 · 5 · 10 · 5 · 2 | 0 | 0 | 28 |
| **Total** | **97** | **27** | **6** | **64** |

The host confirms Nexus writes in **four different ways**:

1. `confirmWrite` sends a deferred whole-tree nexus:changed plus values:changed (confirm.ts:24-34).
2. Handlers push values, assets, tiles or pages directly.
3. The reply itself is the confirmation (the tiles' `Landed`).
4. The watcher echoes the app's own write back. nav:write and matrix:write never confirm themselves. The watcher runs `pushConfig` before it drops the app's own recent writes (watcher.ts:93-96, ahead of :97), so the app's own state.json and matrix.json writes come back as nav:changed and matrix:changed.

A fifth way lives in the window: the optimistic patch it applies after a mutate reply (nexusSlice.ts:257-318).

### Host Graph

**What the two tests enforce:**

- `engineGraph.test.ts` walks outward from `Core/Contract/serve.ts`. It checks that no `.tsx` or `.css.ts` file is reached (:7-9), that the external packages exactly match a 7-package allowlist (:11-21), and that the UIX files reached are exactly 8 named leaves (:23-34).
- `hostGraph.test.ts` starts from every `@pommora/core/` import in the non-test files that `Desktop/tsconfig.node.json` includes (:7-29). It checks only the first two conditions (:34-45).
- The walker counts type-only imports (engineGraph.ts:18-36).
- Neither test checks which folder a file sits in. Neither would catch a plain `.css` import, because `resolveBase` accepts the exact filename (engineGraph.ts:66-67) and the filter only looks for `.tsx` and `.css.ts`.

**Closure size.** I scripted the same method and got **215 files: 207 in Core (22,427 LOC) plus 8 in UIX**. Core has 583 production files (70,777 LOC), so the host reaches 35% of its files and 32% of its LOC. Counting only value imports gives 209. The audit's 205 differs by method, not by substance.

**Spread.** The closure reaches **22 of Core's 23 production folders**; only Session is absent. Files and LOC per folder:

- Nexus 36 / 4,867 · Properties 23 / 2,519 · Sync 18 / 2,245 · MarkdownPM/Engine 9 / 1,476
- Trash 11 / 1,096 · Tiles 8 / 1,110 · Contexts 8 / 1,049 · Views 7 / 956 · Files 10 / 862
- Matrix 9 / 843 · Actions 10 / 824 · Settings 7 / 757 · Assets 10 / 727 · Connections 5 / 589
- Paths 8 / 557 · Contract 5 / 475 · Pages 6 / 395 · Index 2 / 321 · Navigation 4 / 259
- Platform 4 / 248 · Interface 4 / 147 · Web 3 / 105

**What would leave the host under the candidate law:**

- **Matrix/Engine (4 files, 565 LOC).** It's reached only through the `Lens` type (Matrix/handlers.ts:5, matrixLayout.ts:2), so moving that one type takes it out.
- **The editor-menu row builders** (blockMenu, gripMenu, pageMenu, propertyRows and toggleLabels, about 415 LOC). They're reached because Desktop builds the editor's context menu (Desktop/Actions/editorMenu.ts:128-131). There is a structural reason: spellcheck suggestions and edit flags exist only in Chromium's `context-menu` event (editorMenu.ts:55-93). So they stay if native menus stay in the host.
- **The confirm and patch machinery would shrink rather than leave:** treePatch 532, watchPatch 487, mutatePatch 240, confirm 70 and valuesChanged 103 LOC. `treeStabilize` (28 LOC) exists for the window's sake (nexusSlice.ts:181), but the host imports it at pageMetadata.ts:13, assetMap.ts:2 and treePatch.ts:4.

**What would enter the host:**

- **The record half of `treeIndex.ts`.** The file (388 LOC) isn't host-safe today. It imports React-side UIX (`@pommora/uix/Symbols` index.tsx at :15 and `NavTrail.tsx` at :17), plus window-side projections from navResolve, navSearch and reconcileSelection. The record builder (kind, id, title, icon name, path, parents) would need to be split out. `Nexus/record.ts` (11 LOC) is already on the host side and already holds `EntityRecord`.
- **The record-level part of the window's apply code:** `applyTree` (nexusSlice.ts:179), the optimistic op switch (nexusSlice.ts:262-318), `bumpContainerValues` and `applyAssetMap` (cacheSlice.ts:44-58), `applyNavChanged` (navigationSlice.ts:509) and `applyMatrixChanged` (matrixSlice.ts:199). The React-facing parts would stay in the window.

### Paths

| File | LOC | Owns | Twin | Under the law |
|---|---|---|---|---|
| posix.ts | 75 | Forward-slash path math, `isMarkdownFile`, `titleFromPath` | Unique (Core's stand-in for `node:path`) | Survives, 75 |
| paths.ts | 49 | Builders for absolute paths to sidecars, `.nexus` files and tiles | Parallel to nexusPaths (relative constants vs absolute builders) | Merges into nexusPaths, about 40 |
| nexusPaths.ts | 97 | Layout constants, sidecar names, journals, the shard regex, thumbnails, `contextDirRel`/`spaceDirRel`. Also `AGENDA_KINDS`/`SidecarKind` (:36-56, an entity-kind list covered by F-212) and `cropKeyFor` (:88-91) | Unique | Survives; the kind list moves to a kind table |
| pathSafety.ts | 38 | `escapes`, `resolveUnderRoot` | Unique | Survives, 38 |
| exclusion.ts | 128 | The hidden, neverWatched, manifestAdmits and outsideContent predicates, the compiled matchers, `WatchScope` | `manifestAdmits` (:43-60) nearly duplicates `syncIgnoredUnder` (watchSettle.ts:37-47) | Survives; the two scope compilers could share one |
| names.ts | 72 | Naming rules, `freeName`, `createDisambiguated` | Unique | Survives, 72 |
| caseFold.ts | 62 | `foldKey`, `compareTitles`, plus `matchScore`/`rankMatches` (:16-62, fuzzy search) | — | `foldKey` survives; about 47 LOC of search ranking moves out |
| urlPath.ts | 36 | Web URL validation | Not about file paths at all | Moves to Web |

**How the predicates overlap.** The differences are deliberate, because "watched", "content" and "synced" are three different sets of files:

- `hiddenName` is a subset of `hiddenFolder`, which is a subset of `neverWatched`. `neverWatched` exempts `.nexus` at the top segment and checks only the last segment for a leading dot, so `_space.json` stays watched.
- `outsideContent` applies `hiddenFolder` to every segment, so sidecars never count as content.
- `manifestAdmits` adds rules for trash, thumbnails, journals and temp siblings.
- `excludedMatcher` and `assetMatcher` are the same `prefixMatcher`, cached two different ways: a WeakMap and a single slot (:110-128).
- `isMetadataShardRel`, `tileBodyUnder` (watchPatch.ts:95), `isConfigPath` (watchSettle.ts:17), `NON_CORPUS_TOP` and `underAssetRoot`/`isAssetPath` (assetRoots.ts:13-23) each classify one subtree.

**Almost none of this exists because entities are addressed by path.** It exists because files are canonical, and the walk, the watcher and the sync manifest all see paths. That follows from the Legibility and Database locked decisions. An id-keyed record store would still need every one of these predicates where the walk, the watcher and sync meet the disk.

What id addressing would shrink:

- `mutableTarget(root, path, kinds)` becomes a lookup by record id.
- `relDirname` and `titleFromPath` (used in 15 and 16 files) get called less, because title and parent become fields on the record.
- `resolveUnderRoot` stays for any path the window supplies (reveal, the pickFile starting folder, the asset protocol).

**Net change to Paths from id addressing: about 0–15 LOC.** Separately, about 130 LOC would move out of the folder because it isn't about filesystem paths.

### What Desktop Owns

Desktop's production code is **2,454 LOC**, not counting Renderer and build configs.

| Area | LOC | Electron/Node-bound | Logic that isn't Electron-specific |
|---|---|---|---|
| main.ts | 443 | Protocols, window, single-instance lock, dialogs, clipboard, quit | About 60: the openNexusPath, watchNexus, refreshMenu and adopted orchestration (:172-194, :308-322), the asset-protocol policy (:141-147), and the store folder layout `${userData}/Nexuses/${id}` (:306-307) |
| Bridge | 86 | All | — |
| Platform | 116 | All (node:fs, AsyncLocalStorage) | — |
| Config | 256 | secrets.ts (Electron's `safeStorage`) | appConfig.ts has no Electron import at all (about 70 LOC of recents, restore and trash-path policy). device.ts mints keys with WebCrypto, which works outside Electron (about 95) |
| Store | about 600 | The driver (node:sqlite) | The root-stamp policy in open.ts (:29-31) |
| FileWatch | 196 | Only the chokidar calls (:81-86, :105-112, :118-132) | About 150: settle, classify, confirm and push fan-out (:153-196), plus `pushConfig` (:48-71) |
| Actions | 358 | All (Menu, context-menu) | The recents pruning in appMenu (:28-33) |
| Web · Capture · Sync | 236 · 105 · 57 | webview, net, capturePage, node:http | `evictThumbnails` (thumbnails.ts:87-105) and the capture's `mkdir` (:81) touch Nexus paths through node:fs instead of Machine |

About **400 LOC (roughly 17%)** of Desktop isn't Electron-specific. Desktop is mostly host-shaped already.

**Where Core assumes Electron.** Core imports no `node:` or `electron` modules (the grep came back empty), but several of its interfaces are Electron-shaped:

- `HostContext.pick` returns an absolute path from a desktop dialog, and one of its kinds, `'exclusion'`, names a UI purpose rather than a dialog type (handlers.ts:10).
- `pasteImage` returns a temp file path (main.ts:266-273), and `reveal(absPath)` assumes a file browser.
- `thumbnails.capture(rect, scaleFactor)` mirrors `BrowserWindow.capturePage`, and `webGuests` are keyed by webview guest id.
- `openStores` and `applyZoom` assume the host opens per-Nexus database files and controls zoom.
- The Tells win:dragBy, win:zoom and web:wheel (bridge.ts:255-261).
- `Dialer.openDropped(File)` (dialer.ts:8), the `nexus-asset://` scheme (assetScheme.ts:4) and `trashToSystem?` (machine.ts:35).

**Distance from the minimal host.** In LOC the gap is small: the minimal host (Machine, stores, the watcher's event source, native menus, the window, IPC, plus secrets, transport, webview and capture) comes to about 2,050 of today's 2,454. The real distance is which side drives which:

1. Core drives the host through four callbacks (handlers.ts:71-74; Nexus/handlers.ts:73, 80, 111; confirm.ts:62). The host doesn't subscribe to Core.
2. The watcher's settle step is Core logic living in Desktop, and it pushes through Desktop's own `push` (watcher.ts:170-182). As a result, five content push channels have two emitters: Core, through `ctx.push`, and Desktop, through the watcher.
3. The order of pushes across channels is managed by hand: `setTimeout` at confirm.ts:13 and :31, and the push ordering at Nexus/handlers.ts:175.

### Inventory & Collapse

"Survive" counts lines kept anywhere, including lines that move to a different folder.

| File | LOC | Job | Twin | Under the law | Survive | Safety property held |
|---|---|---|---|---|---|---|
| Contract/bridge.ts | 280 | Channel map | Parallel to HostContext | Survives as about 70 channels: all writes through 1 door, the 7 content pushes become 1 `changes` push | 190 | Every ask answers with `Result` (:61-251) |
| Contract/handlers.ts | 102 | HostContext, `Untrusted`, the gates | HostContext parallels Platform | Survives; the forwarders and callbacks leave HostContext | 75 | Handlers receive unknowns (:78-83); gates (:90-102) |
| Contract/result.ts | 48 | The `Result` envelope | Unique | Survives | 48 | One spelling of each refusal (:45-48) |
| Contract/serve.ts | 32 | Merges the handler objects | Unique | Survives | 32 | `Handlers` type demands every channel (:17) |
| Contract/validators.ts | 13 | Argument narrowers | Parallel to zod (mutateRequest.ts) | Survives | 13 | — |
| Platform/machine.ts | 54 | Filesystem seam | — | Survives | 46 | Atomic-write contract (:18-21) |
| Platform/stores.ts | 120 | Store interfaces | — | Survives | 128 | — |
| Platform/localState.ts | 70 | Per-machine key-value scopes | — | Survives | 70 | — |
| Platform/dialer.ts | 19 | The window's side of the bridge | — | Survives | 19 | Never rejects (:4) |
| Platform/assetScheme.ts | 4 | Asset URL | — | Survives | 5 | — |
| Paths/posix.ts | 75 | Path math | Unique | Survives | 75 | — |
| Paths/paths.ts | 49 | Absolute path builders | Parallel to nexusPaths | Merges into nexusPaths | 40 | One lock-key string per file (:14-17) |
| Paths/nexusPaths.ts | 97 | Layout constants | — | Survives; the kind list moves | 97 | — |
| Paths/pathSafety.ts | 38 | Containment | Unique | Survives | 38 | `resolveUnderRoot` refuses escapes, first by the path itself, then after resolving symlinks (:14-38) |
| Paths/exclusion.ts | 128 | Admission predicates | Nearly duplicates syncIgnoredUnder | Survives | 125 | — |
| Paths/names.ts | 72 | Naming rules | Unique | Survives | 72 | — |
| Paths/caseFold.ts | 62 | Case folding plus search ranking | — | 47 LOC move to search | 62 | Locale pinned (:4) |
| Paths/urlPath.ts | 36 | Web URLs | — | Moves to Web | 36 | — |
| Desktop/main.ts | 443 | Electron lifecycle, HostContext implementation | Mirrors Core's forwarders | About 60 move to Core | 443 | Single-instance lock (:353-361, :366); quit drain (:421-443); asset containment (:144-147) |
| Desktop/Bridge/ipc.ts | 58 | IPC server, `push` | — | Survives | 58 | One catch covers every ask (:25-29) |
| Desktop/Bridge/preload.ts | 28 | Dialer implementation | — | Survives | 28 | `.catch(fault)` (:8) |
| Desktop/Platform/nodeMachine.ts | 77 | Machine implementation | — | Survives | 77 | Atomic writes (:50-51) |
| Desktop/Platform/fileLock.ts | 34 | Per-file lock | — | Survives | 34 | Refuses re-entrant locking (:9-16) |
| Desktop/Platform/hostPath.ts | 5 | Converts path spelling | — | Survives | 5 | — |
| Desktop/Config/appConfig.ts | 94 | App config, recents | — | About 70 move to Core | 94 | Strict read-modify-write (:49-59) |
| Desktop/Config/device.ts | 117 | Device keys | — | About 95 move to Core | 117 | Private key never leaves the module (:86-115) |
| Desktop/Config/secrets.ts | 45 | Keychain | — | Survives | 45 | A damaged file throws instead of reading as empty (:20-21) |
| Nexus/handlers.ts | 183 | Open sequence, mutate | — | Survives | 170 | Canonical session root through `openSession` (:61-63; session.ts:37-42) |
| Pages/handlers.ts | 62 | Page bodies, history | — | Survives | 55 | — |
| Properties/handlers.ts | 186 | 17 registry and schema doors | Parallel to mutate | Folds into the op union | 90 | — |
| Views/handlers.ts | 73 | 6 sidecar doors | Duplicates mutate's sidecar ops | Folds into the op union | 30 | — |
| Tiles/handlers.ts | 114 | 9 tile doors | Parallel to mutate | Folds into tile records | 70 | Tile ids must be ULID-shaped (:22-33) |
| Trash/handlers.ts | 24 | Trash reads | — | Survives | 24 | — |
| Assets/handlers.ts | 88 | Asset root, adopt | adopt duplicates mutate's internal adoption | Survives | 80 | — |
| Settings/handlers.ts | 56 | Config writes | Parallel to mutate's settings ops | Becomes `config(key, value)` | 45 | — |
| Sync/handlers.ts | 385 | Key ring, server binding | — | Survives | 385 | — |
| Navigation/handlers.ts | 46 | Navigation, tabs, thumbnails | — | nav:write becomes `config` | 40 | — |
| Matrix/handlers.ts | 46 | matrix.json, layout | — | matrix:write becomes `config` | 40 | — |
| Interface/handlers.ts | 91 | Per-machine preferences | 4 matching get/set pairs | Survives (about 45 with one generic local-state ask) | 91 | — |
| Web/handlers.ts | 57 | Titles, links, guests | Forwarders | Survives | 57 | — |
| Actions/handlers.ts | 15 | Menus | Forwarders | Survives | 15 | — |
| **Total** | **3,626** | | | | **about 3,263** | |

**This slice shrinks by only about 10% (roughly 360 LOC)**, and another roughly 355 LOC moves location. That doesn't mean the law buys little. The slice's problem is the number of separate surfaces, not its size:

- 71 write doors.
- 7 content push channels, 5 of them with two emitters.
- 4 host-side ways of confirming a write, plus 1 in the window.
- 41 reply shapes.
- A second seam with no contract tests.

The lines the law would actually collapse sit outside this slice: treePatch, watchPatch, mutatePatch, confirm and valuesChanged (about 1,432 LOC), plus the window's apply code. The mutate path also has a third catch besides ipc.ts and preload.ts: `handleMutate` with `afterThrow` (mutate.ts:50-62).

### Divergences

Is the bridge narrow? No. It has 115 channels, 41 distinct ask reply types and 12 distinct push payloads. What it does have is one envelope (`Result`) on every ask. Where the docs and the code disagree:

1. **"Core reaches it only through `Core/Platform`"** (CLAUDE.md Hard Rule; CorePM §The Host Boundary). `HostContext` (Core/Contract/handlers.ts:42-75) is a second seam. It carries dialogs, clipboard, network (`transport`, `fetchTitle`), keychain, device keys, capture, zoom and store opening. CorePM says hosts are held to contract suites, but `HostContext` has none: Core/Testing contains only machineContract.ts and storesContract.ts. Tests build it as `{} as HostContext` (sessionGate.test.ts:15) or cast it `as unknown as HostContext` (syncHub.ts:241).
2. **"Every channel is declared once"** (CLAUDE.md; DesktopPM §Bridge). This holds for the channel map. But 8 host capabilities are declared twice, once as an ask and once as a `HostContext` member, with a Core handler relaying between them.
3. **"A deliberately narrow bridge"** (DesktopPM §The Shape of the App). See the numbers above.
4. **"Pushes it whole to the window on one channel — the write-confirmation path and the watcher share that funnel"** (DesktopPM §The Push Path). There are 7 content push channels. The watcher's fan-out (watcher.ts:153-196) shares only `confirmBy` with the handlers' `confirmWrite` (confirm.ts:24-34), and it sends through its own `push`.
5. **"Every change funnels through one dispatcher, `mutate`"** (CorePM §Mutations). 40 channels bypass it, and three files are written both through mutate and through a separate channel.
6. **"Every write channel confirms itself … and pushes the tree when it moved"** (CorePM §Mutations). The 7 tile writes confirm only through their reply. nav:write and matrix:write confirm only because the watcher echoes the app's own write back (watcher.ts:93-96). exclusions:clear confirms nothing.
7. **"Two `HostContext` members, `device` … and `transport`"** (DesktopPM §Config). `secrets` is a third (handlers.ts:66-69).
8. **"Every file write goes through an atomic path … behind the machine seam"** (CorePM §The Atomic-Write Contract). The thumbnail code's `mkdir` and `rm` inside the Nexus skip Machine (Capture/thumbnails.ts:81, 103), and the asset protocol reads files with Node's `readFile` directly (main.ts:149).

### What the Audit's Fixes Leave Standing

F-090, 241, 242, 246, 247, 248, 249, 250 and 216 share one mechanism: placement and spelling. They change where a file sits, what a name means and which import form gets used. F-212 adds a single kind table. None of them changes how many write doors, push channels, confirmation paths or reply shapes there are. Nor do they touch Core driving the host through callbacks, or the untested second seam. After every one of them lands, these all remain:

- 71 write doors, and three files that can each be written two ways.
- 7 content push channels, 5 with two emitters.
- 4 host-side confirmation paths, plus 1 in the window.
- The switch that maps each op to its tree update, written once in the host and once in the window.

### Out-of-Slice

- **The op-to-tree-update switch exists twice.** The host has `patchForMutation` (mutatePatch.ts:42+) and the window has its optimistic switch (nexusSlice.ts:262-318), both over the same treePatch.ts transforms. That's direct evidence for the law's single `apply`.
- **nexus:choose and nexus:openPath aren't blocked while a switch is in progress** (Nexus/handlers.ts:123-139). `whileAdopting` only keeps a count (session.ts:16-23), so two opens at once could interleave `openNexusSequence`. I haven't confirmed this live.
- **Push ordering is hand-sequenced:** `setTimeout` at confirm.ts:13 and :31, and pages/tiles pushed before the confirm at Nexus/handlers.ts:175.
- **The host has two HTTP clients:** Electron's `net.request` (Web/linkTitles.ts:25) and the node:http `transport` (Sync/transport.ts:1-2).
- **Thumbnail writes land in the watched `.nexus/assets` tree without the write-echo record Machine writes get** (thumbnails.ts:81, 103). I didn't trace what the watcher does with them.
- **The rule that resets the sync base when a Nexus opens from a different folder lives in the SQLite opener** (Store/open.ts:29-31).
- **`treeStabilize` is in the host closure only because the host's patchers import it.** It exists because the window loses object identity across IPC (nexusSlice.ts:180-181).

### Confidence

- **High:** the channel counts, the per-file confirmation counts and the host-closure numbers. These were scripted against the source or read line by line.
- **Medium:** the history-versus-structural verdict for each bypass family. It rests on git first-appearance dates and on finding no structural blocker in the handler code, not on design documents.
- **Medium-low:** the surviving-LOC figures. They're judgment calls, probably ±25% per row, but the slice-level conclusion (about 10% shrink, with the real weight outside this slice) holds either way.
- **Not reviewed:** the advisor was overloaded, so this report didn't get its second review.
- **Nothing was changed:** no edits or commits. I ran read-only import-graph scripts in the scratchpad.
