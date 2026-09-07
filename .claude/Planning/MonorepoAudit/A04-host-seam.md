## A04 — The Host Seam

Read-only audit of `Pommora/src` (commit `7c7c7542`, 09-05-2026). Every number below was re-derived from the tree; where the brief's figure differed, the tree wins and the correction is stated.

#### Corrections to the Brief

- **Channel count is 149, not 119.** `src/shared/bridge.ts` declares 130 Asks, 5 Tells, 14 Pushes. The 119 figure predates the property/tiles/history/web-guest channel growth (74 commits touch bridge.ts; the last on 09-04-2026 added `tiles:changed`).
- **Renderer call sites: 220 in 68 files**, not 216/68. 213 are `window.nexus.X`, 7 are optional-chained `window.nexus?.X` (all in `MarkdownPM/Editor/{gripMenu,citationPointer,citationActions}.ts` + `MarkdownPM/index.tsx`), and two sites Biome-wrapped `window.nexus\n.X` (`citationPointer.ts`, `NavList.tsx`). A single-line grep misses 9 of them; the plan's Task 35 verification ("216 sites") inherits that blind spot.
- **Handler kinds in `main/index.ts`:** `envelope` 67, `menu` 26, `raw` 25, `window` 9 (7 asks + 2 tells). The plan's "26 menu / 25 raw" holds.
- **The preload `api` has exactly 149 leaves — one per channel.** No fan-in, no fan-out, no coercion. It is a rename table (see §2).

---

### 1. Channel Taxonomy

Grouping is by what the handler in `src/main/index.ts` actually does, not by the section comments in `bridge.ts`. "Serve as-is" means the same engine code runs on a phone once `node:fs`/`node:path` are behind a host primitive (the plan's `EngineHost`); "different implementation" means the phone needs its own body; "refuse/null" means the channel has no phone meaning.

#### 1.1 Content & synced-settings READ — 11 asks · serve as-is

`nexus:state` `assets:map` `page:open` `view:loadValues` `trash:list` `tiles:get` `tiles:readMarkdown` `subfield:get` `navViewModes:get` `nav:read` `exclusions:count`

All read files under the Nexus root (`readNexus`, `readPage`, `loadValues`, `listBundles`, `readTileDocAt`, `settings.json`, `navigation.json`). `nav:read` merges one `nexus.db` row (`recents`) into the file's keys — the file half is engine, the row half is chrome. `assets:map` is a held map patched by the watcher; on the phone it is a listing per landing.

#### 1.2 Content & synced-settings WRITE — 41 asks · serve as-is (engine writes over fs primitives)

`page:updateBody` `mutate` `views:save` `views:reorder` `views:delete` `container:configure` `schema:add` `schema:rename` `schema:reorder` `schema:delete` `schema:assign` `registry:reorder` `property:delete` `property:setOptions` `property:setStatusGroups` `property:setLinkConfig` `property:setCheckboxColor` `property:setIcon` `property:setNumberFormat` `property:setFileDirectory` `property:renameOption` `property:removeOption` `property:clearOption` `property:renameStatusOption` `property:removeStatusOption` `property:clearStatusOption` `tiles:save` `tiles:createMarkdown` `tiles:removeTile` `tiles:writeMarkdown` `tiles:convertToPage` `tiles:convertToView` `tiles:duplicateTile` `subfield:set` `navViewModes:set` `personalization:set` `assets:setDir` `exclusions:set` `exclusions:clear` `nav:write` `assets:adopt`

Every one resolves `sessionRoot()`, validates, calls a `CRUD/*` or `mutate.ts` op, then runs a confirm-and-push (`confirmWrite` → `confirmMutation`/`confirmRegistry`/`patchContainerFromDisk` → `push('nexus:changed')`). Three carry desktop side-effects that must be stripped or injected: `personalization:set` calls `setWebZoomFactor`/`setHostZoom` (Electron zoom) for two keys; `assets:setDir` and `exclusions:set` restart the chokidar watcher and push twice; `mutate` reads `MutateDeps` from `app.getPath('userData')` and injects `shell.trashItem` (already a dependency — the seam exists). `assets:adopt` copies a *picked* outside path whose provenance is `pickedPaths` (a main-side allow-list filled by the dialog) — the copy is engine, the source is host.

#### 1.3 Per-machine chrome state (`nexus.db` `local_state`) — 27 asks · different implementation (a KV store, not SQL)

Nine scope pairs (18): `folds` `activeViews` `viewOrders` `embedHeights` `embedZooms` `tableHeadingCols` `headingIcon` `citations` `aliases` × get/set. Four singleton rows (8): `tabs:load/save` `windows:load/save` `glance:load/save` `devicePrefs:load/save`. Plus `linkTitles:get` (the `linkTitle` scope, read whole).

All go through `Database/localState.ts` `readScope`/`writeKey`/`readValue`/`writeValue` — a two-column key/value table. Nothing here needs SQL; a JSON file per scope or Capacitor Preferences serves it identically. The validation (`scopeSet`, `sanitizeTabSet`, `sanitizeWindows`, `isGlanceSize`, `packDevicePrefs`) is host-neutral and lives in `ipc.ts`/`index.ts`/`IO/*` — it moves with the engine. `windows:*` (floating in-renderer windows) and `glance:*` are UI-geometry rows that only matter on a large screen but cost nothing to serve.

#### 1.4 File history (`versions.db`, device-local) — 5 asks · different implementation

`history:list` `history:read` `history:restore` `history:delete` `history:clear`

`CRUD/fileHistory.ts` + `Database/versionsDb.ts`: SQLite with `node:zlib` deflate. The plan's answer (remote versions only on the phone) is the right one; local history on a phone is a later decision.

#### 1.5 Native menu pop — 26 asks + `context-menu` · null on phone today, but see §5(e)

`kind: 'menu'` (25 after moving `nexus:pickFile` to §1.6): `history:menu` `create-menu` `view-button-menu` `view-row-menu` `view-embed-title-menu` `view-embed-area-menu` `icon-favorite-menu` `nexus:iconMenu` `nexus:bannerMenu` `nexus:titleMenu` `table-menu` `grip-menu` `column-menu` `cell-menu` `page-actions-menu` `card-menu` `trash:menu` `trash:columnMenu` `tab-menu` `nav-row-menu` `conn-menu` `citation-menu` `property-menu` `option-menu` `row-menu`; plus `context-menu` (`kind: 'window'`, the one menu whose actions run main-side).

Sixteen of these are `popModelMenu(win, sharedModel(ctx))` or `rowTemplate(sharedModel(ctx))` over a model in `src/shared/*Menu.ts` (11–36 lines each: `tableMenu.ts` is 11 lines). They are `row-menu` with a model lookup the *renderer could do itself*. Seven hold inline templates that have no shared model yet (`nexus:iconMenu`, `nexus:bannerMenu`, `nexus:titleMenu` in `index.ts:1779-1854`; `grip-menu` 92 lines; `trash:menu`/`trash:columnMenu` 64 lines; `create-menu`). `context-menu` and the editor's OS `context-menu` event (`editorMenu.ts`, not a channel) are the two genuinely main-side menus.

Tells: `editor:format-state`, `editor:grip-hot` feed the OS editor menu — no-ops on a phone. Pushes: `menu:action` (app menu + editor menu, also `reload-state` from Open Recent), `begin-rename` `new-page-adjacent` `begin-icon` `open-in-new-tab` `confirm-delete` `open-in-window` `open-history` — the seven hand-backs from the native context menu to the renderer. On a phone with an in-app menu these become plain function calls, not pushes.

#### 1.6 Window & shell control — 13 asks + 2 tells · different implementation or refuse

`nexus:pickFile` (open-file dialog) · `nexus:pasteImage` (`clipboard.readImage` → temp PNG) · `exclusions:choose` `assets:chooseDir` (folder dialogs) · `clipboard:write` `clipboard:read` · `path:reveal` (`shell.showItemInFolder`) · `link:open` (`shell.openExternal`) · `error:show` `trash:report` (`dialog.showMessageBox`) · `theme:systemAccent` (`systemPreferences.getAccentColor`) · `capture:thumbnail` (`webContents.capturePage`) · `nav:evictThumbs` (fs delete under `.nexus/assets/<id>/thumbnails` — engine, paired here because it is the capture's janitor). Tells: `win:dragBy` `win:zoom` (BrowserWindow move/maximize from the tab bar).

Phone: `clipboard:*` → `navigator.clipboard`/Capacitor Clipboard; `link:open` → `window.open`/SFSafariViewController; `error:show`/`trash:report` → an in-app dialog (the renderer already has `ConfirmationWindow`); `nexus:pickFile`/`pasteImage` → photo picker; folder dialogs, reveal, accent, capture, drag, zoom → refuse/null/no-op. `capture:thumbnail` returns a `nexus-asset://` URL string — the phone can't capture but must *display* synced thumbnails, so the read half (`thumbRel`) stays shared.

#### 1.7 Web guest — 2 asks + 1 tell + 1 push · refuse

`webGuestZoom:set` `webGuestMedia:pause` · tell `web:wheel` · push `web:popup`. All address a `<webview>` by `getWebContentsId()`. WKWebView has no `<webview>` and no cross-guest input injection.

#### 1.8 Session & open — 4 asks · different implementation

`nexus:choose` (folder dialog + `adoptNexus`) · `nexus:openPath` (dropped absolute path → `adoptNexus`; the only renderer-supplied absolute path) · `nexus:rename` (renames the root folder, re-adopts) · `delete:facts` (reads `pommora.json` trash mode + `permanentDelete`).

The adopt sequence itself (`openNexusSequence`: `retireFileHistory` → `openSession` → `ensureIdentity`/`ensureContextsRegistry`/`stampAdopted` → `replayPendingRename` → `openSessionDb` → `runOpenRecord`/`refreshTree` → `seedContentIndex` → `replaySchemaCascade` → `runRepairSweep` → `runAssetMigration`) is engine-shaped; the phone connects to a fixed `Documents/<Nexus>` folder instead of choosing one.

#### 1.9 Network — 1 ask · different implementation

`linkTitles:fetch` — Electron `net.request` streamed through `makeTitleScanner` (pure). Phone: `fetch` with a byte cap. The scanner and cache are already separable.

#### 1.10 Live-refresh pushes — 5 · engine, transport swapped

`nexus:changed` `values:changed` `assets:changed` `nav:changed` `tiles:changed`. Sent from `watcher.ts` (settle), `index.ts` (confirm-and-push), `mutate.ts`, `webGuests.ts`. All go through `ipc.push(win, …)` except one: `editorMenu.ts:39` does `wc.send('menu:action', …)` raw because the OS event hands over a `WebContents`, not a `BrowserWindow` — the single bypass of the typed push.

**Totals:** 130 Asks = 11 read + 41 write + 27 chrome + 5 history + 26 menu + 13 shell + 2 guest + 4 session + 1 network. Phone-serviceable as-is: 52 (read + write). Different implementation: 27 + 5 + ~6 shell + 4 session + 1 = ~43. Refuse/null: ~35 (menus, guest, dialogs, capture, drag). Line weight in `index.ts`: content read 75, content write 513, chrome 171, history 46, menu poppers 177, shell 219, guest 14.

---

### 2. The `api` Object

**What it is.** `src/preload/index.ts` lines 32–192: 149 leaves in 27 groups, each `ask('channel')`/`tell('channel')`/`on('channel')`. Exactly one leaf per channel; every channel has exactly one leaf (verified by diffing the declared set against the wired set — both 130 for asks, zero in either difference). Two leaves are not pure renames: `openDropped` wraps `webUtils.getPathForFile` (a preload-only Electron capability — the renderer cannot resolve a dropped `File` to a path), and `personalization.set` calls `ipcRenderer.invoke` directly to carry a `<K extends keyof Personalization>` generic that `ask`'s tuple typing cannot express.

**Three naming systems for one surface.** Channels use colons (`folds:get`), dashes (`view-button-menu`), and bare words (`mutate`); the api uses camel with ad-hoc verbs: `history:list`→`listHistory`, `trash:list`→`listTrash`, `view:loadValues`→`loadValues`, `nexus:pickFile`→`pickFile`, `create-menu`→`popCreateMenu`, `error:show`→`showError`, `link:open`→`openExternal`, `assets:adopt`→`adoptFile`, `nav:evictThumbs`→`capture.evict`, `tableHeadingCols`→`tableHeadingColumns`. A wrong channel string is a compile error (`ask<K extends keyof Asks>`), but an api key is free-floating: nothing stops `listHistory` from being renamed or a second leaf pointing at the same channel.

**The renderer's type contract is the Electron preload.** `tsconfig.web.json` includes `src/preload/index.d.ts`, which declares `Window.nexus: NexusApi` where `NexusApi = typeof api` — the *preload file* is the source of truth for what the UI may call. No renderer file imports `@shared/bridge`. Tests stub the object by hand (`Testing/editorHarness.ts:40` with four keys; ten test files cast `window as unknown as { nexus: {...} }`). So the grouping is not a layer with behavior — it is a second definition of the same 149-name surface, hand-maintained, and it is what makes a second host need a "table" at all.

**Verdict:** not a layer worth keeping as code. It buys readability at call sites (`window.nexus.folds.get()` reads better than `invoke('folds:get')`) and nothing else. The plan's Task 35 preserves it by moving it to a declarative table (`NEXUS_API`) plus `buildApi` plus `Bound<typeof NEXUS_API>` type machinery — that keeps all three naming systems and adds a fourth artifact.

**If the renderer called channels by name through one typed dialer** — all 220 sites in 68 files change spelling, mechanically (a codemod over a 149-row map, one pass). Nothing else changes: each site already passes exactly the channel's args. The `showError`-style call sites (18 of them) become `ask('error:show')`. Nine `on*` subscriptions in `App.tsx` become `on('nexus:changed', …)`.

**Sketch — the smaller shape (no table):**

```ts
// src/shared/bridge.ts (unchanged) — the ONLY definition of the surface
// src/renderer/host.ts (new, ~20 lines)
export interface Host {
  ask<K extends keyof Asks>(k: K, ...args: Asks[K]['args']): Promise<Asks[K]['reply']>
  tell<K extends keyof Tells>(k: K, ...args: Tells[K]): void
  on<K extends keyof Pushes>(k: K, cb: (p: Pushes[K]) => void): () => void
  dropPath?(file: File): string | null   // the one Electron-only extra; absent on a phone
}
let host: Host
export const bindHost = (h: Host): void => { host = h }
export const ask: Host['ask'] = (k, ...a) => host.ask(k, ...a)
export const tell: Host['tell'] = (k, ...a) => host.tell(k, ...a)
export const on: Host['on'] = (k, cb) => host.on(k, cb)

// src/preload/index.ts → ~30 lines: the three dialers + contextBridge.exposeInMainWorld('nexus', { ask, tell, on, dropPath })
// Desktop/main.tsx: bindHost(window.nexus)
// Mobile/main.tsx:  bindHost(createPhoneHost(session))
```

Call-site form: `ask('folds:get')`, `ask('mutate', req)`, `on('nexus:changed', applyTree)`. Tests stub `bindHost({ ask: async (k) => fixtures[k] })` instead of casting `window`.

**Lines.** Today: preload 196 + `index.d.ts` 7. Plan Task 35: preload ~45, `shared/nexusApi.ts` ~190 (149 table rows + `Dialer`/`HostExtras`/`Bound`/`buildApi`/`menuAsks`), `shared/localState.ts` ~30 → net **+60** and two binders each re-deriving 149 keys. Direct dialer: preload ~30, `renderer/host.ts` ~20, `index.d.ts` 7 → net **−145** against today and **−205** against Task 35, with one naming system instead of three and the renderer's type contract owned by `@shared/bridge` rather than the preload. The 220 call-site edits are line-neutral.

---

### 3. `main/index.ts` Autopsy (2,071 lines)

| Class | Lines | Ranges (members) |
|---|---:|---|
| Imports | 193 | 1–193 (74 import statements; 9 Electron symbols, 3 `node:` modules, ~60 main/shared modules) |
| CDP switch + protocol registration | 73 | 195–198 `POMMORA_DEBUG_PORT`; 200–210 `RENDERER_SCHEME`/`ASSET_SCHEME`/`registerSchemesAsPrivileged`; 212–222 `RENDERER_MIME`; 226–243 `registerRendererProtocol`; 247–267 `registerAssetProtocol` |
| App/window lifecycle | 135 | 269–284 `mainWindow`/`refreshMenu`/`applyDefaultZoom`; 286–328 `createWindow`; 1997–2009 single-instance lock; 2011–2047 `whenReady` (restore → theme → protocols → window → menu → watcher → `activate`); 2049–2051 `window-all-closed`; 2053–2071 `before-quit` flush |
| Session/open sequence | 116 | 337–350 `prepareOpenedNexus`; 352–367 `adoptingDepth`/`adopting`/`adoptNexus`; 369–411 `openNexusSequence`; 413–430 `runAssetMigration`; 432–452 `adoptNexusInner` |
| Validators / narrowers / refusal consts | 116 | 330–335 `isRect` `isFiniteNumber` `isGlanceSize`; 454–465 `isString` `isStringArray` `isHeightMap` `isIndexArray` `ResolvedViewContainer`; 509–537 `resolveViewContainer` `resolveSchemaFolder`; 539–543 `NEEDS_*`/`NOT_A_PROPERTY_DIR`; 610–672 `asPatch` `narrowLinkConfig` `narrowFileConfig` `narrowNumberFormat` `isOptionArray` |
| Handler factories | 89 | 545–608 `optionValueOp` `optionRenameOp` `defEditOp`; 674–698 `tileHostAnd` `onTile` |
| Confirm-and-push plumbing | 49 | 467–475 `pushConfirmed` (setImmediate-deferred); 477–482 `pushValueChanges`; 484–507 `confirmWrite` `confirmContainerWrite` `confirmRegistryWrite` `confirmSettingsWrite`; 737–744 `pushAssetWrites` |
| Electron-only glue helpers | 36 | 700–708 `mutateDeps` (`app.getPath`, `shell.trashItem`); 710–735 `pickedPaths` `pickFilePath` `pasteImagePath` (dialog, clipboard, `tmpdir`) |
| `serveBridge(...)` literal | 1,250 | 746–1995 — see per-group below |
| ↳ content read handlers | 75 | 748–770 `nexus:state` `assets:map`; 1095–1114 `page:open`; 1262–1277 `view:loadValues`; 1633–1640 `trash:list`; 1698–1705 `linkTitles:get` |
| ↳ content write handlers | 513 | 1116–1129 `page:updateBody`; 1207–1260 views + `container:configure`; 1279–1442 schema/registry/property; 1444–1480 subfield/navViewModes; 1482–1559 tiles; 1561–1578 `personalization:set`; 1642–1652 `mutate`; 1943–1968 `nexus:rename`; 896–951 `assets:setDir` `exclusions:set`; 978–1005 `exclusions:clear/count`; 1797–1814 `assets:adopt`; 1706–1714 `linkTitles:fetch` |
| ↳ chrome-state handlers | 171 | 772–868 nav/tabs/windows/glance/devicePrefs; 1131–1145, 1160–1205 the nine scope pairs; 1007–1019 `nav:evictThumbs` |
| ↳ file-history handlers | 46 | 1580–1625 |
| ↳ menu poppers | 177 | 1627–1631 `history:menu`; 1654–1675 `context-menu` `create-menu`; 1729–1795 view/icon/banner/title menus + `nexus:pickFile`/`pasteImage`; 1816–1862 banner/title/table/grip/column/cell; 1880–1882; 1909–1941 trash/tab/nav-row/conn/citation/property/option/row |
| ↳ window/shell handlers | 219 | 870–894 `capture:thumbnail`; 953–976 `exclusions:choose`; 1021–1093 `assets:chooseDir` `nexus:choose` `nexus:openPath`; 1677–1696 `error:show` `link:open`; 1716–1727 `theme:systemAccent`; 1864–1879 clipboard/`path:reveal`; 1884–1907 `delete:facts` `trash:report`; 1970–1994 the five tells |
| ↳ web-guest handlers | 14 | 1146–1159 |

Cross-check: 193+73+135+116+116+89+49+36+1,250 = 2,057; the remaining 14 lines are blank separators between top-level members.

**Natural split (nine files), with host placement:**

| File | From | Lines | Phone |
|---|---|---:|---|
| `Desktop/app.ts` | lifecycle, single-instance, `whenReady`, `before-quit`, `createWindow`, zoom, protocols, CDP | ~210 | Desktop-only |
| `Desktop/shellAsks.ts` | dialogs, clipboard, reveal, external, accent, capture, drag/zoom tells, `mutateDeps`, `pickFilePath`/`pasteImagePath` | ~260 | Desktop-only (phone binds `refuse`/its own 4–5 bodies) |
| `Desktop/menuAsks.ts` | the 26 poppers + `context-menu` | ~180 | Desktop-only (phone: null, or the in-app pane) |
| `Desktop/guestAsks.ts` | web guest 2 asks + `web:wheel` | ~20 | Desktop-only |
| `Core/session.ts` (grow existing) | `openNexusSequence`, `adoptNexus`, `prepareOpenedNexus`, `runAssetMigration`, `adoptingDepth` | ~120 | Reusable — after the watcher start, zoom, `app.addRecentDocument`, `refreshMenu` are lifted out as host callbacks (`onOpened(root)`) |
| `Core/contentAsks.ts` | read + write handlers, factories, narrowers, `resolve*` | ~800 | Reusable as-is once `sessionRoot()` and the confirm-and-push sink are injected |
| `Core/chromeAsks.ts` | scope pairs, tabs/windows/glance/devicePrefs, `scopeGet`/`scopeSet` from `ipc.ts` | ~200 | Reusable over a KV primitive |
| `Core/historyAsks.ts` | 5 history handlers | ~50 | Reusable if a versions store exists; otherwise refuse |
| `Core/confirm.ts` | `pushConfirmed` `pushValueChanges` `confirmWrite` `confirm*Write` `pushAssetWrites` | ~50 | Reusable over a `Sink` instead of `mainWindow` |

Everything in the Core rows is already host-neutral in body; what binds it to Electron is three ambient references: `mainWindow` (push target, 13 uses), `app.getPath('userData')` (3 uses: `mutateDeps`, `delete:facts`, recents), and the `BrowserWindow` parameter the `menu`/`window` kinds inject.

---

### 4. `main/ipc.ts`: `serveBridge` and the Handler-Kind Union

**What it is (112 lines).** `AskEntry<K>` = `{kind:'envelope'|'raw', fn}` | `{kind:'menu', fn(win: BrowserWindow, …)}` | `{kind:'window', fn(win: BrowserWindow|null, …)}`; `TellEntry` = `raw` | `window`. `BridgeAsks = {[K in keyof Asks]: AskEntry<K>}` is exhaustive by construction. `serveBridge` loops both maps into `ipcMain.handle`/`ipcMain.on`, catching throws for `envelope`, resolving `null` for `menu` without a sender window, and injecting `BrowserWindow.fromWebContents(e.sender)` for `menu`/`window`. `push(win, k, payload)` is `win.webContents.send`. `scopeGet`/`scopeSet` (the chrome-state validators) also live here — misplaced: they have nothing to do with IPC.

**Is it the right abstraction for an in-process second host?** Half of it. The *exhaustive mapped type* is exactly what a second host needs: a phone host must supply an entry for every channel or fail to compile — that is the "shared refusal envelope" made structural rather than defaulted. The *kind* union is transport policy leaking into the handler table: `menu` and `window` exist only because Electron IPC hands you a `WebContents` sender and the handler wants a `BrowserWindow`. `envelope` vs `raw` encodes "does this channel answer `Result`" — which is already visible in the channel's declared reply type; the plan's simplicity round declined to derive it and kept both, which means a phone binder must re-declare it (the plan's `rawAsks()`/`menuAsks()` sets).

**Two real obstacles to binding the same table in-process:**

1. The handler table is *one 1,250-line object literal* in `index.ts`. A phone cannot "spread the content handlers and refuse the rest" until the literal is split by group (§3's nine files) — TypeScript's exhaustiveness then still applies to the spread union.
2. `push` and every producer of a push (`watcher.ts` takes a `BrowserWindow`; `index.ts` reads `mainWindow`; `mutate.ts`, `webGuests.ts`, `contextMenu.ts`, `menu.ts` import `push`) are typed against `BrowserWindow`. The engine's live-refresh producers need a `Sink`.

**What an in-process binding looks like (~60 lines, replacing the Electron-specific 40 in `serveBridge`):**

```ts
// Core/bridgeBinding.ts
export interface HostContext { window?: WindowRef }           // WindowRef: serializable, per the locked seam
export type Sink = <K extends keyof Pushes>(k: K, payload: Pushes[K]) => void
export type AskFn<K extends keyof Asks> = (ctx: HostContext, ...args: Asks[K]['args']) => Asks[K]['reply'] | Promise<Asks[K]['reply']>
export type AskTable = { [K in keyof Asks]: AskFn<K> }         // no `kind`: the reply type says Result-or-not
export const envelope = <K extends keyof Asks>(fn: AskFn<K>): AskFn<K> => async (ctx, ...a) => { try { return await fn(ctx, ...a) } catch (e) { return fail('operation-failed', errText(e)) as Asks[K]['reply'] } }
export const refuse = <K extends keyof Asks>(): AskFn<K> => () => REFUSED as Asks[K]['reply']   // for Result channels
export const nothing = <K extends keyof Asks>(): AskFn<K> => () => null as Asks[K]['reply']      // for menu channels

// Desktop/ipcBinding.ts (~25 lines): for each channel, ipcMain.handle(k, (e, ...a) => table[k]({ window: refOf(e.sender) }, ...a)); push = win.webContents.send
// Mobile/host.ts (~25 lines): ask = (k, ...a) => table[k]({}, ...a); an EventTarget is both the Sink and `on`
```

Desktop's table = `{ ...contentAsks, ...chromeAsks, ...historyAsks, ...menuAsks, ...shellAsks, ...guestAsks, ...sessionAsks }`; Mobile's = `{ ...contentAsks, ...chromeAsks(kv), ...refuseAll(menuChannels, nothing), ...refuseAll(shellChannels, refuse), ...phoneShellAsks }`. The compiler refuses a missing key in either. `envelope` becomes a wrapper you apply, not a `kind` you declare — the desktop keeps the same catch semantics; a phone gets them free.

---

### 5. Renderer Host Assumptions

#### (a) `window.nexus` — 220 sites, 68 files

| Folder | Files | Sites | Character |
|---|---:|---:|---|
| `Store/` (+ `store.ts`) | 8 | 38 | Boot reads (`nexusSlice.ts` 18: `systemAccent`, `state`, `subfield.get`, `navViewModes.get`, `citations`, `linkTitles`, `activeViews`, `aliases`, `nav.read`, `windows.load`, `tabs.load`, `devicePrefs.load`, `mutate`, `choose`, `openDropped`, `showError`), chrome writes, `popCreateMenu` |
| `Frames/` | 5 | 37 | `PropertyFrame.tsx` alone holds 28 (every `schema.*`/`property.*` + `showError` + `propertyMenu` + `chooseAssetDir`) |
| `Interface/` | 7 | 23 | `PageView.tsx` 10 chrome get/set pairs; Glance 3 (incl. `wheelGuest`); banner/title menus; `updatePageBody`; `restoreSnapshot` |
| `Tiles/` | 5 | 19 | `useTileDoc`/`TileHost`/`MarkdownTile` tile channels; `WebTile` guest zoom/media; `ViewTile` 3 menus |
| `Settings/` | 5 | 16 | trash list/menus/report, exclusions, asset dir, history clear, icon-favorite menu |
| `App.tsx` | 1 | 14 | the 13 `on*` subscriptions + `assetMap` |
| `Windows/` | 4 | 12 | `PageHistoryWindow` history channels + `historyMenu`; `confirmations.ts` `deleteFacts`; `WebWindow` `openExternal`; `PageWindow` `propertyMenu` |
| `Views/` | 7 | 11 | `loadValues`, `views.save`, `viewOrders`, `activeViews.set`, column/cell/card menus, `contextMenu` (ViewGroupBand) |
| `Actions/` | 4 | 10 | `connectionMenu.ts` (clipboard ×3, `connMenu` ×2, `openExternal`), `pageMenuActions.ts` clipboard ×2, `nativeMenus.ts` `rowMenu`, `openWebLink.ts` `openExternal` |
| `MarkdownPM/` | 9 | 16 | 9 direct + 7 optional-chained: `gripMenu`, `citationMenu`, `setGripHot`, `tableMenu`, `titleMenu`, clipboard, `setEditorFormatState`, `onMenuAction` |
| `Toolbar/` | 3 | 8 | view menus, `views.*`, `container.configure`, `titleMenu` |
| `Properties/` | 4 | 6 | `optionMenu` ×2, `propertyMenu`, `filePick.ts` (`pickFile`, `adoptFile`, `cellMenu`) |
| `Tabs/` | 1 | 3 | `winDragBy`, `winZoom`, `tabMenu` |
| `Utilities/` `Sidebar/` `PommoraUIX/` `Navigation/` | 4 | 7 | `useNexusIcon` (`iconMenu`, `pickFile`), `Sidebar` `contextMenu` ×2, `ImagePicker` (`pickFile`, `pasteImage`), `useNavThumbnails` `capture.thumbnail`, `NavList` (wrapped) |

Twenty-six of the 68 files touch only §1.1–1.4 channels and are host-neutral today. The rest mix a menu or shell channel into otherwise neutral UI — the coupling is in the *call*, not the component.

#### (b) `<webview>` and webview-specific APIs

| File | Lines | What it assumes |
|---|---:|---|
| `Tiles/Surfaces/WebTile.tsx` | 235 | `<webview src partition allowpopups>`; events `did-fail-load` `render-process-gone` `did-finish-load`; `getWebContentsId()` (guarded `?.` at 139/149) → `webGuestZoom.set`, `webGuestMedia.pause` |
| `Windows/WebWindow.tsx` | 147 | `<webview>`; `BrowserGuest` interface: `goBack/goForward/canGoBack/canGoForward/getURL/loadURL`; events `page-title-updated` `did-navigate` `did-navigate-in-page`; `getURL()` at 66 inside `try`, at 79–80 inside handlers that never fire without a guest |
| `Interface/Glance/GlancePane.tsx` | 435 (site branch ~40) | `<webview>` for `kind === 'site'`; `ScrollableGuest.getWebContentsId` → `wheelGuest`; the shield `onWheel` replay |
| `Interface/ContentView.tsx:85`, `MarkdownPM/Editor/embedWidget.tsx:355` | comments only | ordering/eq decisions made *because* a moved `<webview>` re-attaches — behavior stays correct without a guest |

Renderer-side there is no `WebviewTag` type import and no `electron` import anywhere (verified). On WKWebView the `<webview>` tag renders as an unknown inline element: WebTile shows its face/snap, WebWindow shows an empty body, GlancePane's site glance is blank. Nothing throws. What a mobile host must provide: a `WebGuest` component seam (`<iframe>` — loses zoom/media/popup/wheel control and many sites refuse framing — or hand-off to SFSafariViewController via `link:open`). The honest v0 is: WebTile face-only with title → `openWebLink`; WebWindow never summoned (`openLinksInApp` forced off); site glance disabled.

#### (c) `nexus-asset://` URLs

Two writers of the scheme string, not one: `renderer/Assets/assetUrl.ts:11` and `main/IO/thumbnails.ts:96` (`return \`nexus-asset://nexus/${rel}\``, returned through `capture:thumbnail` and displayed raw). `index.ts:203` holds `ASSET_SCHEME = 'nexus-asset'` as a third spelling. Seven renderer importers of `assetUrl.ts` (`store.ts`, `AssetImage.tsx`, `CardsView.tsx`, `filePick.ts`, `NavGallery.tsx`, `ImagePicker.tsx`, `Cell.tsx`); all but two go through `resolveAssetUrl`. Options for the phone: (1) the plan's `installAssetUrl` builder over `Capacitor.convertFileSrc`; (2) register `nexus-asset` as a `WKURLSchemeHandler` in the Capacitor host and keep the renderer byte-identical — the scheme handler is ~40 lines of Swift and also keeps the `?v=` cache-busting and per-segment encoding unchanged. Option 2 removes the need for a renderer seam entirely; the one string should move to `@shared/nexusPaths` either way so thumbnails.ts stops hardcoding it.

#### (d) DOM/Electron APIs a WKWebView lacks

- `navigator.clipboard`: **0** uses — clipboard goes through `clipboard:write/read` (good for the seam; the phone binds them to `navigator.clipboard`, and `clipboard:read` is invoked from keydown chords in `pasteLink.ts`/`widget.tsx`, which iOS permits only in a user gesture — it is one).
- `window.open`: **0**. `webUtils`: preload only. `process.`: **0** in renderer. `import.meta.env.DEV`: 3 (Vite, fine).
- `-webkit-app-region`: 16 declarations in 11 CSS files (`styles.css` `.titlebar`/`.sidebar-titlebar` drag; `Sidebar.css` `.surface-glass` drag; `no-drag` on toolbar, subfield, inspector, tab bar, banner, resize frame, reveal bar, `.open-btn`). Inert on WKWebView; the cost is layout, not errors: `--app-inset` and the traffic-light offset (`trafficLightPosition {x:18,y:18}` in `createWindow`, `.sidebar-titlebar` width `-48px`) reserve macOS chrome space the phone should reclaim.
- `screenX/screenY` pointer deltas → `win:dragBy` (`TabBar.tsx:174`) and double-click → `win:zoom` (191): meaningless on a phone; the tell is a no-op, the gesture should not be armed.
- `window.devicePixelRatio` + `getBoundingClientRect` → `capture.thumbnail` (`useNavThumbnails.ts:65-68`): the phone refuses; the hook must treat `{ok:false}` as "no thumbnail" (it already tolerates `null`).
- **Pointer semantics, not APIs, are the real gap:** `rg pointerType|TouchEvent|pointer: coarse|hover: none` → **0** in the renderer. `Interactions/gesture.ts` activates a drag on distance (`ACTIVATION`), so a finger scroll on a sidebar row becomes a drag; hover-revealed chrome (`reveal-on-hover`, `HoverRemove`, the tab bar's `+`) has no hover to reveal on. The plan's Task 38 hold-to-drag/hold-to-menu covers the first; nothing covers hover-only affordances.

#### (e) Native menus assumed — 26 channels, 32 renderer call sites, 28 files

Callers (site count): `ViewTile.tsx` 3 · `TableView.tsx` 2 · `Sidebar.tsx` 2 · `TrashFrame.tsx` 2 · `Banner.tsx` 2 · `PropertyFrame.tsx` 2 · `connectionMenu.ts` 2 · one each in `PageWindow` `PageHistoryWindow` `ViewGroupBand` `CardsView` `CardValue` `useNexusIcon` `ViewMenu` `ViewFrame` `SpaceMenu` `TabBar` `navigationSlice` `iconFavorites` `PageProperties` `StatusEditor` `OptionEditor` `filePick` `Tables/widget` `PageHeader` `useBannerMenu` `PageMenu` `nativeMenus`, plus the optional-chained `gripMenu.ts` (2) and `citationPointer.ts` (2).

Every site has the shape `void window.nexus.xMenu(ctx).then((action) => { if (action === null) return; switch (action) … })`. The renderer already assumes *a pick or null*, never *a native menu* — the coupling is that only main can produce the pick. Three facts make this the cheapest seam to close:

1. The row models are already shared: 24 renderer files import `@shared/*Menu.ts`; `menuModel.ts` (`ActionItem` with `label/action/checked/disabled/submenu/separatorBefore/confirm`) is the row shape both renderers speak.
2. An in-house path already exists: `Actions/nativeMenus.ts` `useNativeMenus()` reads `devicePrefs.nativeMenus`; `PickerControl.tsx:53-75` and `TileHost.tsx:213-220, 355` switch between `popRowMenu` (native, via `row-menu`) and an in-app `MenuDropdown`. The in-app pane for *arbitrary rows* (the plan's `RowMenuPane`) is the one missing piece.
3. Sixteen of the 26 main-side poppers are `sharedModel(ctx)` → rows → pop, nothing else. With the renderer calling the model and popping `row-menu` (native) or the pane (in-app), those 16 channels are redundant on both hosts.

What a mobile host must provide: `presentRowMenu(items, at)` in the renderer (not the host), a long-press → `contextmenu` synthesizer, and the seven native hand-back pushes (`begin-rename` etc.) routed as direct calls. What the renderer must stop assuming: that a menu is a *channel* at all — it should ask for rows from a model and hand them to whichever presenter the device prefers. The plan defers "the list-menu generalization (every menu from one model, the 22 channels collapsing into `row-menu`)" — that deferral is the wrong way round for a host seam: it is the ~500-line deletion that makes the phone's menu story *and* the desktop's in-app-menus preference both fall out of one change.

---

### 6. The Seam Verdict

#### Buckets (non-test lines; tests 17,105 main + renderer tests excluded)

| Bucket | Lines | Contents |
|---|---:|---|
| **ENGINE** (host-neutral over fs/path/hash/KV primitives) | ~12,000 | `src/main` minus the Desktop rows below: `readNexus` 717, `mutate` 784, `provenance` 747, `watchPatch` 498, `CRUD/*` 3,318, `IO/*` (minus thumbnails) 1,033, `Connections/*`, `Properties/*`, adopt/identity/registry/settings/paths/exclusion/asset*/tiles/record/remint/repair/valuesChanged/liveTree/session/appConfig; plus ~1,000 lines of `index.ts` handler bodies, factories, narrowers, session sequence, confirm plumbing once `mainWindow`/`BrowserWindow`/`app.getPath` are injected |
| **SHARED/CORE types & models** | 5,953 | `src/shared` entire — `bridge.ts` 392, `types.ts` 654, `treePatch.ts` 563, `views.ts` 333, 21 `*Menu.ts` models ~1,200 |
| **DESKTOP HOST** (Electron) | ~2,900 | `index.ts` lifecycle/protocol/dialog/clipboard/menu/guest handlers ~700, `ipc.ts` 112, `webGuests.ts` 200, `IO/thumbnails.ts` 117, `linkTitles.ts` net half ~40, menu chassis (`menu` 163, `contextMenu` 201, `editorMenu` 227, `returningMenu` 60, `rowMenu` 94) 745, 18 thin adapters 501, `watcher.ts` chokidar half ~60, `Database/driver.ts` 40 (`node:sqlite`), `preload/` 203 |
| **RENDERER** (host-neutral UI) | ~59,900 | `src/renderer` ts/tsx 60,869 minus the row below (+5,840 CSS) |
| **RENDERER-DESKTOP** | ~1,000 | `WebTile` 235, `WebWindow` 147, GlancePane site branch ~40, `TabBar` drag/zoom ~35, `nativeMenus.ts` 24, `openWebLink.ts` in-app branch, `useNavThumbnails` 81, `AssetDirectoryRow` 40, `ExcludedDirectoriesRow` 148 (folder dialogs), `filePick.ts` 150 (file dialog + adopt), picker halves of `useNexusIcon`/`useBannerMenu`/`ImagePicker` ~60, `PageMenu` reveal ~5, app-region/traffic-light CSS ~30 |

**Engine runtime caveats the plan's Task 1 does not list.** For the engine to run *inside the WKWebView's JS* (the plan's in-process api), these Node-only surfaces need shims beyond `posixPath` and `sha256`: `Buffer` in 6 files (`atomicWrite` binary writes, `fileHistory` `Buffer.byteLength`, `assetWrite`, `assetMigrate`, `mutate`, `linkTitles`); `AsyncLocalStorage` in `IO/fileLock.ts` (the write-lock reentrancy guard — a browser needs a different mechanism); `setImmediate` in `index.ts`/`webGuests.ts`; `NodeJS.Timeout` types in `fileHistory`/`pageFile`/`tiles`; `node:zlib` in `versionsDb`; `node:string_decoder` in `linkTitles`; `node:sqlite`. The `Database/` layer (566 lines) splits cleanly: `localState.ts` is KV (engine with a driver), `contentIndex.ts` and `versionsDb.ts` are SQL (desktop-only until the phone wants them).

#### The ten hardest placements

1. **`main/watcher.ts`** — `chokidar.watch` + ignore filter (host) fused with settle/classify/push orchestration (engine). Cut at `startWatcher`: the host supplies `watch(root, ignored, onEvent)`; `settle` and its three push arms are engine over a `Sink`.
2. **`main/index.ts` session sequence (369–452)** — engine steps interleaved with `startWatcher`, `applyDefaultZoom`, `app.addRecentDocument`, `refreshMenu`. Engine owns the sequence; the host gets one `onOpened(root)` callback.
3. **`main/Database/*`** — KV vs SQL vs `node:sqlite` driver; three different homes in one folder.
4. **`main/IO/thumbnails.ts`** — `capturePage`/`nativeImage` are Electron; `thumbRel`/`thumbKey` and eviction are shared file-layout facts a phone must *read*.
5. **`main/linkTitles.ts`** — `net.request` + `StringDecoder` vs a pure scanner and a KV cache; the split is already visible in the file.
6. **`main/contextMenu.ts`** — the one menu whose actions (create, lock, move, reveal, clipboard) *run in main*; the plan's `shared/contextMenu.ts` model extraction is the right cut, and `reveal`/clipboard stay host.
7. **`main/editorMenu.ts`** — driven by Electron's OS `context-menu` event with spellcheck, Share, Speech roles; no channel. Irreducibly desktop, but `FORMAT_ROWS`/`pasteAsRows` are models a phone editor menu would reuse.
8. **`main/mutate.ts`** — engine, but `realpath` (`mutate.ts:11`, `pathSafety.ts:41-42`) and `MutateDeps.trashToSystem` are host primitives; the second is already injected, the first needs a host `realpath` or a phone that trusts its own sandbox path.
9. **`renderer/Interface/Glance/GlancePane.tsx`** — one component, two guests: the page glance is neutral, the site glance is a `<webview>`.
10. **`renderer/Assets/assetUrl.ts` + `main/IO/thumbnails.ts:96`** — whether the phone serves `nexus-asset://` natively (WKURLSchemeHandler) decides whether this needs a renderer seam at all; today the scheme is spelled in three places.

Runner-up: `main/IO/fileLock.ts` (`AsyncLocalStorage`) — 45 lines that every write in the engine passes through and that cannot run in a browser as written.

#### Should the 149-channel bridge survive as the host contract?

**Yes — as the contract. No — as the transport, the grouping, or the handler literal.**

`bridge.ts` is the one artifact in the repo that already states the host surface completely, typed, with zero runtime imports, and every host-neutral piece of the engine is already written *against it* (the handler bodies take the channel's args and return the channel's reply). Replacing it with something else (a service interface per domain, a REST-ish shape, a GraphQL-ish query layer) would re-derive the same 149 signatures under new names for no behavioral gain. Its three flaws are all fixable in place:

1. **Naming.** One convention (`domain:verb`) for the 130 asks; the 12 dashed menu channels and bare `mutate` are the outliers. A rename here is a compile-checked sweep.
2. **Size.** The 26 menu channels should collapse toward one (`row-menu`) as the shared models take over — the contract shrinks by ~25 and the desktop loses ~500 lines of thin adapters; `nexus:pickFile`/`pasteImage`/`chooseDir`/`exclusions:choose` should become one `host:pick` with a kind argument. A contract of ~110 channels is the honest surface.
3. **Ownership of the type.** The renderer must type against `@shared/bridge`, not against `typeof api` from the Electron preload. That single move (`renderer/host.ts` with `ask/tell/on`, §2) is what makes "Electron is one host among several" true in the type system.

What should *not* survive: the preload's hand-grouped `api` (a second definition of the surface — delete, don't tabulate), `serveBridge`'s `BrowserWindow`-typed `kind` union (replace with `HostContext` + an `envelope` wrapper, §4), the single 1,250-line handler literal (split by taxonomy group so a host spreads what it serves and the compiler names what it doesn't), and `push(win, …)` as the live-refresh transport (a `Sink`, per the locked "swappable transport" decision). The prior art's Phase 1 `EngineHost` fs interface is correct and necessary but is the *lower* seam; the *upper* seam — channel table split by group, dialer owned by the renderer, sink owned by the engine — is what the plan's Tasks 35–37 approximate with a table, and can be had with ~200 fewer lines and one naming system by letting the renderer dial channels directly.

---

### Summary

`bridge.ts` declares 149 channels (130 asks, 5 tells, 14 pushes), not 119; the renderer reaches them at 220 sites in 68 files. Fifty-two asks (content read/write) run on a phone as-is over fs primitives; ~43 need a different body (KV chrome state, history, clipboard, open-link, session); ~35 (26 native menus, web guests, dialogs, capture, window drag) have no phone meaning. The preload `api` is a 1:1 rename table — 149 leaves for 149 channels, three naming systems, and the renderer's type contract owned by the Electron preload file. Delete it: a 20-line `renderer/host.ts` dialer saves ~145 lines against today and ~205 against the plan's shared table. `index.ts` splits into nine files; ~1,000 of its lines are engine once `mainWindow`, `BrowserWindow` injection, and `app.getPath` are lifted. `serveBridge`'s exhaustive map is the right idea; its `kind` union is Electron-shaped — replace with a `HostContext` and an `envelope` wrapper, and split the one 1,250-line handler literal by group so a host spreads what it serves. The bridge should survive as the contract, shrunk to ~110 channels by collapsing the 16 model-driven menu channels into `row-menu` — the deferred "list-menu generalization" is the seam's prerequisite, not its follow-up. Engine-in-WebView also needs shims for `Buffer`, `AsyncLocalStorage`, `setImmediate`, `zlib`, and `sqlite` that Task 1 omits.
