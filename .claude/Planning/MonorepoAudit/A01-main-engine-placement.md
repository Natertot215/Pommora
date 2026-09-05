## A01 — Main Engine Placement Audit

**Scope:** `Pommora/src/main/*.ts` excluding `index.ts`, `ipc.ts`, and every `*Menu.ts`/`menu.ts`; including `IO/`, `Database/`, `Connections/`, `Properties/`. `CRUD/` (3,130 non-test lines) is another agent's scope and is referenced only where placement depends on it. Tests excluded except where a symbol's only consumer is a test.

**Method:** Every in-scope file body was read (61 files, 8,520 non-test lines). Import edges came from line-agnostic `rg` over `from '…'` (multi-line imports included). Importer counts exclude `*.test.ts`; three counts my first regex polluted (`identity`, `mutate`, `tiles` matched same-named `shared/` siblings; `Properties/schema` matched `Database/schema`) were re-verified individually. Birth dates are `git log --diff-filter=A --follow`.

**Headline:** Of the 8,520 lines in scope, roughly 7,350 (86%) import nothing a phone can't provide once a thin host seam exists; roughly 1,170 (14%) are genuinely Electron/Node-only (webview guests, chokidar arm, `capturePage`, `net.request`, `node:sqlite`, `node:zlib`, `AsyncLocalStorage`). The folder structure does not reflect that split at all: 41 non-menu files sit at `main/` root with no admission rule, `IO/` holds four domain modules beside its primitives, `Database/` mixes store interface with SQLite implementation, and `Properties/` is a one-file folder while its domain spans three folders.

---

### 1. File Table

Classification legend — **pure**: no Node/Electron import (may import other main modules); **node**: imports `node:*` or a Node-only package (listed); **electron**: imports `electron` or touches BrowserWindow/webContents/net/nativeImage; **wire**: exists to shape a cross-process payload. "Reducible" answers whether the file's Node use collapses to {readFile, writeFile, stat, readdir, rename, rm, mkdir, per-path lock, sha256, posix path}. Importers are non-test, direct.

#### `main/` root (41 files, 6,673 lines)

| File | Lines | Class · external imports | Importers (folders) | Domain | Reducible | Home · why |
| --- | --- | --- | --- | --- | --- | --- |
| adopt.ts | 229 | node · `fs/promises {readFile, rename, stat}`, `path` | 2 (main: index, provenance) | Identity/ids (open-time stamping) | yes-with-changes: needs `stat.birthtimeMs` (adopt.ts:68) | Core · an idempotent rule over the primitive set once stat carries birth time |
| appConfig.ts | 56 | node · `path {join}` | 3 (main: index, session, menu) | Session/open (per-device app prefs) | yes | Desktop · its content is desktop-shaped (last Nexus *path*, OS trash mode); already parametrized by userData dir |
| assetDirValidate.ts | 53 | node · `fs/promises {stat}`, `fs {Stats}`, `path` | 1 (index) | Assets/Settings | yes (stat kind) | Core · "a folder fit to hold assets" is a Nexus rule, not a host rule |
| assetMap.ts | 144 | pure (fs via IO/walk) | 7 (main: assetMigrate, assetRoots, assetWrite, index, mutate, watchPatch, watcher) | Assets | yes | Core · build/patch/resolve are pure; the held-map singleton + `owedPush` flag are session state, host-neutral |
| assetMigrate.ts | 245 | node · `fs/promises {readFile, rm}`, `crypto {createHash md5}`, `path` | 1 (index) | Assets (one-time migration) | yes-with-changes: md5 → sha256 or host hash (assetMigrate.ts:59) | Core · an open-time pass over Nexus files; nothing Electron |
| assetRoots.ts | 83 | pure | 4 (main: assetMigrate, index, mutate; IO: navigationFile) | Assets | n/a | Core |
| assetWrite.ts | 37 | node · `fs/promises {mkdir}`, `path` | 2 (assetMigrate, mutate) | Assets | yes | Core |
| coerce.ts | 17 | pure | 7 (main) | read-layer helpers | n/a | Core (or shared) |
| contextsRegistry.ts | 59 | pure (fs via atomicWrite) | 6 (main: index, mutate, provenance, tiles; CRUD: 2) | Contexts | n/a | Core |
| disambiguate.ts | 15 | pure | 2 (assetWrite, mutate) | naming rule | n/a | Core |
| exclusion.ts | 98 | pure | 15 (main 13, CRUD 1, IO 1) | Watcher/live-tree scope + walk skips | n/a | Core |
| exclusionInput.ts | 28 | pure | 1 (index) | Settings (exclusion list sanitizer) | n/a | Core → fold into Settings; its header admits it exists only because `index.ts` is untestable |
| exclusionScan.ts | 88 | node · `fs/promises {rm}`, `path` | 1 (index) | Settings (Clear Exclusion Cache) | yes | Core → Settings |
| folderKind.ts | 155 | node · `path {join}` | 4 (adopt, identity, mutate, readNexus) | classification (containers/agenda) | yes | Core · the one kind resolver |
| identity.ts | 67 | node · `fs/promises {mkdir}` | 2 (index; IO/thumbnails) | Identity (nexus.json) + agenda seeding | yes | Core (open pass) |
| ids.ts | 72 | node · `crypto {createHash}`, `ulidx` | 19 (main 13, CRUD 6) | Identity/ids | yes-with-changes: sync `sha256` for `adoptedId` (ids.ts:66) — WebCrypto is async, so either a pure-JS sha256 or an async signature | Core |
| indexSeed.ts | 170 | node · `fs/promises {readFile, stat}`, `path` | 12 (main 5, CRUD 7) | Content index | yes (the store is the question, not the seed) | Core · seed logic is neutral; `contentIndex` already answers null for "no index" |
| linkTitles.ts | 136 | electron · `net`; node `string_decoder` | 1 (index) | Links (fetched page titles) | no: `net.request` (linkTitles.ts:88) | split · `extractTitle`/`makeTitleScanner` (lines 18-65) pure → Core/shared; fetch + cache → Core with a host `fetch` seam, or Desktop |
| liveTree.ts | 85 | pure (fs via atomicWrite.pathExists) | 13 (main 10, CRUD 3) | Watcher/live-tree holder | n/a | Core · zero Node imports; the plan's TreeHolder injection is unnecessary if this file moves |
| mutate.ts | 784 | node · `path`, `fs/promises {readFile, realpath}`; **imports `./ipc` (electron)** for `NO_NEXUS` (mutate.ts:79) | 2 (index, contextMenu) | Mutations dispatcher | yes-with-changes: `realpath` ×3 (mutate.ts:162, 174, 196); `NO_NEXUS` → shared | Core · `MutateDeps.trashToSystem` is already injected; the ipc import is the one accidental Electron edge |
| mutatePatch.ts | 266 | pure | 1 (index) | live-tree confirmation | n/a | Core |
| order.ts | 35 | pure | 2 (readNexus, watchPatch) | ordering rule | n/a | Core (or shared) |
| pathSafety.ts | 51 | node · `path`, `fs/promises {realpath}` | 4 (assetDirValidate, index, mutate, + CRUD) | path containment | yes-with-changes: `realpath` (pathSafety.ts:41-42) not in the set; a sandboxed host falls back to the lexical check | Core with an optional host `realpath` |
| paths.ts | 86 | node · `path {join, relative, sep}` | 34 (main 21, CRUD 9, Database 2, IO 2) | path construction + on-disk names | yes | Core · but `SIDECAR_FILENAME`, `NEXUS_CONFIG_FILES`, `TILE_DOC_FILENAME`, `HOMEPAGE_HOST_DIRNAME` (lines 17-23, 62, 69, 78-87) are on-disk contract names → shared/nexusPaths (see §6) |
| provenance.ts | 747 | node · `fs {Dirent}`, `fs/promises {mkdir, readdir, readFile, rename, rm}`, `path`, `zod` | 5 (main: index, mutate; CRUD 3) | Trash (record schema, gather, resolve, list, restore, empty) | yes | Core → Trash/ · one file holding five concerns; `emptyBundle`'s `trashToSystem` is injected |
| readNexus.ts | 717 | node · `fs/promises {readFile}`, `path`, `yaml` | 18 (main 12, CRUD 6) | read walk + settings/homepage/crops/state decoders | yes (`yaml` is pure JS) | Core → split · lines 80-302 (~220 lines: `readPersonalization`, `readCommands`, `nexusFolderRefusal`, `readSettingsLeaves`, `readHomepageLeaves`, `readCropLeaves`, `readSpaceOrders`) are codecs, not walk |
| readPage.ts | 27 | node · `fs/promises {readFile}`, `path` | 1 (index) | Pages | yes | Core → fold into pageFile as `readPageDetail` |
| record.ts | 186 | node · `fs/promises {stat birthtimeMs}`, `path` | 4 (main: index, provenance, remint; CRUD 1) | Identity/record (id baseline) | yes-with-changes: birth time (record.ts:134); baseline row via `localState` | Core with a KV seam |
| remint.ts | 204 | node · `path` | 1 (record) | Identity/record (duplicate-id re-mint) | yes | Core · single importer is `record.ts` → same module family |
| repairSweep.ts | 60 | node · `path` | 1 (index) | Properties (open-time governed reconcile) | yes | Core → Properties/ or the open-pass sequence |
| session.ts | 60 | node · `fs/promises {realpath, stat}` | 7 (main 5, CRUD 2) | Session/open | yes-with-changes: `realpath` (session.ts:19) | split · `sessionRoot`/`openSession`/`closeSession` → Core; `resolveRestorePath`/`pruneRecents`/`isTrashedPath` (checks macOS `.Trashes`, line 50) → Desktop with appConfig |
| sessionDb.ts | 57 | pure surface over `Database/{open, versionsDb}` (sqlite) | 6 (main 3, CRUD 1, Database 2) | Session/open (DB handles) | no (SQLite) | Desktop · the handle holder for Node stores |
| settings.ts | 161 | pure (fs via atomicWrite) | 11 (main 9, CRUD 1, IO 1) | Settings | n/a | Core |
| sidecarIO.ts | 50 | node · `fs/promises {readFile}`, `zod` | 10 (main: adopt, folderKind; CRUD 8) | container sidecars | yes | Core → IO/ · three one-liners over atomicWrite + `sidecarPath`; the lock-key authority |
| tileDoc.ts | 43 | node · `fs/promises {mkdir, rename}` | 4 (main: index, remint, tiles; CRUD 1) | Tiles | yes | Core → Tiles/ |
| tiles.ts | 195 | node · `fs/promises {mkdir, readFile}`, `path` | 3 (index, mutate, remint) | Tiles | yes | Core → Tiles/ |
| valuesChanged.ts | 91 | pure | 11 (main 4, CRUD 7) | `values:changed` ledger + live id index | n/a | Core · two halves: the ledger (push batching) and a third tree-walking index (see §4) |
| walkCache.ts | 77 | node · `fs/promises {stat}` | 2 (readNexus; **IO/atomicWrite**) | read walk parse gate | yes | Core → IO/ · a root file imported by `IO/` is upside down |
| watchPatch.ts | 498 | node · `path {join}` | 4 (index, mutatePatch, watcher, assetMap [type]) | Watcher/live-tree (classify + patch) | yes | Core · no watcher library in it; event names are strings |
| watcher.ts | 241 | electron (`BrowserWindow`, `push` via ipc) + `chokidar` | 1 (index) | Watcher | no: chokidar (watcher.ts:6, 93) | split · `ignoredUnder`, `valueChangesOf`, `tilesChangedIn`, the settle algorithm (lines 55-86, 147-228) are neutral; the arm + four `pushToWindow` calls are Desktop |
| webGuests.ts | 200 | electron (`app, session, webContents, BrowserWindow`) | 2 (index, menu) | web embeds | no | Desktop, whole |

#### `IO/` (10 files, 1,100 lines)

| File | Lines | Class · external imports | Importers | Domain | Reducible | Home · why |
| --- | --- | --- | --- | --- | --- | --- |
| atomicWrite.ts | 255 | node · `write-file-atomic`, `fs/promises {readFile, rename, mkdir, stat, utimes}`, `path` | 35 (main 18, CRUD 12, Database 1, IO 4) | IO primitives (lines 1-185) **+ trash bundle layout (lines 186-255)** | yes-with-changes: `utimes` (line 30) not in the set; non-recursive `mkdir` with `EEXIST` signaling (line 225); `write-file-atomic` → host atomic write | Core IO/ for the primitives; the bundle half → Trash/ |
| fileLock.ts | 45 | node · `async_hooks {AsyncLocalStorage}` | 13 (main 4, CRUD 6, IO 3) | per-path lock | yes-with-changes: the re-entrancy guard (line 16, 22-33) is Node-only; a phone lock loses deadlock detection unless re-implemented | Core IO/ with the ALS guard as a Node-host extra |
| navigationFile.ts | 131 | node · `fs/promises {mkdir}`; uses `Database/localState` | 4 (index, watcher, mutate, assetMigrate) | Navigation (pins/favorites/banner + recents row) | yes (KV seam for recents) | Core → Navigation/ · a domain module misfiled among primitives (imports settings, assetRoots, localState) |
| pageFile.ts | 200 | node · `fs/promises {readFile}`, `yaml` | 20 (main 8, CRUD 12) | Pages (frontmatter engine) | yes · only `writePageFile` (lines 185-200) touches fs | Core IO/ (or Pages/) |
| propertiesRegistry.ts | 105 | node · `fs/promises {mkdir}` | 11 (main 3, CRUD 8) | Properties (registry file) | yes | Core → Properties/ · domain module, not primitive |
| tabsState.ts | 54 | pure; uses `Database/localState` | 2 (index, windowState) | Tabs (device-local rows) | n/a (KV) | Core with KV seam · zero file IO; misfiled in `IO/`; `sanitizeTabSet` is a wire validator (§6) |
| windowState.ts | 57 | pure; uses `Database/localState` | 2 (index, remint) | floating windows (device rows) | n/a (KV) | Desktop · a phone has no Page Window/NavWindow; misfiled in `IO/` |
| thumbnails.ts | 117 | electron · `nativeImage`, `BrowserWindow.webContents.capturePage`; node `fs/promises {mkdir, readdir, rm}`, `path` | 2 (index, assetMigrate) | Navigation gallery thumbnails | no (lines 52, 71) | Desktop · `evictThumbnails` (lines 102-117) is neutral but too small to split |
| walk.ts | 98 | node · `fs/promises {readdir}`, `fs {Dirent}`, `path` | 14 (main 11, CRUD 3) | enumeration | yes-with-changes: `readdir({recursive:true})` (line 41, 91) and `Dirent.parentPath` (line 97) → hand recursion | Core IO/ |
| writeEcho.ts | 38 | node · `path {sep}` | 9 (main 4, CRUD 4, IO 1) | Watcher echo suppression | yes (`sep` → posix once keys are posix) | Core · a sync engine needs the same "was this my write" test |

#### `Database/` (6 files, 566 lines)

| File | Lines | Class · external imports | Importers | Domain | Reducible | Home · why |
| --- | --- | --- | --- | --- | --- | --- |
| driver.ts | 40 | node · `node:sqlite {DatabaseSync}`, `path` | 7 (main 2, CRUD 1, Database 4) | store seam | no | Desktop |
| open.ts | 74 | node · `fs {rmSync, existsSync, mkdirSync}`, `path` | 1 (sessionDb) | nexus.db lifecycle | no | Desktop |
| schema.ts | 61 | pure surface (SQL DDL; `Db` type) | 1 (open) | nexus.db schema | no (SQL) | Desktop · one importer → fold into open.ts |
| localState.ts | 91 | pure surface over `sessionDb` (sqlite) | 8 (main 5, IO 3) | KV store for device chrome | interface yes, impl no | split · `readScope/readKey/writeKey/readValue/writeValue` over `Scope` is a KV interface → Core; SQL body → Desktop |
| versionsDb.ts | 141 | node · `fs {existsSync, mkdirSync, renameSync}`, `path`, `zlib` | 2 (sessionDb, CRUD/fileHistory) | File history store | no | Desktop |
| contentIndex.ts | 159 | pure surface over `sessionDb` | 4 (main: indexSeed, watchPatch; CRUD 2) | Content index | interface yes, impl no | split · already null-tolerant; interface → Core, SQL → Desktop |

#### `Connections/` (2 files, 129 lines) and `Properties/` (1 file, 52 lines)

| File | Lines | Class | Importers | Domain | Home · why |
| --- | --- | --- | --- | --- | --- |
| Connections/rewrite.ts | 73 | pure (`@shared` only) | 2 (tiles, CRUD/cascade) | Connections (rename rewrite) | shared/ candidate · every import is `@shared`; Core at minimum |
| Connections/scan.ts | 56 | pure (`@shared` only) | 3 (tiles, indexSeed, CRUD/cascade) | Connections (mention scan) | shared/ candidate · same |
| Properties/schema.ts | 52 | pure (`@shared` only) | 2 (CRUD/registryProperty, CRUD/optionOps) | Properties validation | shared/ candidate · pre-flight validation the renderer could run |

**Test-only or self-only exports** (no non-test consumer outside the file): `session.closeSession` (17 test files reference it; production never closes a session — a root switch re-opens), `watcher.ignoredUnder` (3 tests; internal use), `appConfig.appConfigPath`, `assetMap.patchAssetMap`, `exclusionScan.excludedArtifacts`, `folderKind.readAgendaRegistration`, `ids.idAt`, `linkTitles.extractTitle`/`makeTitleScanner`, `record.latchBaseline`/`readBaseline`/`writeBaseline`, `IO/navigationFile.isAssetPath`, `IO/pageFile.assembleEnvelope`, `Database/open.DB_FILENAME`, `Database/versionsDb.VERSIONS_FILENAME`. Most are internal helpers exported for tests; `closeSession` is the one that reads as a real gap.

---

### 2. Misfiled

Birth dates matter here because they show the placement was never a decision — `CRUD/` has existed since 06-27 and `IO/` since the first commit, yet everything below landed at root anyway.

- **Tiles at root:** `tiles.ts` (07-10) and `tileDoc.ts` (09-04) — both node-bound, both Tiles-only, born when `CRUD/` already held `views.ts` and `containerConfig.ts` (the same "rewrite a JSON document under its lock" family). Rightful grouping: `Tiles/` (238 lines), or beside `views.ts` if a domain folder is judged too small.
- **Five asset files at root:** `assetMap`, `assetRoots`, `assetWrite`, `assetMigrate`, `assetDirValidate` — 562 lines born 08-21/22 across two days, all at root, all one domain. Rightful grouping: `Assets/`.
- **Settings scattered across three concepts:** `settings.ts` (per-Nexus `settings.json`), `appConfig.ts` (per-device `pommora.json`), `session.ts` (current root + restore/prune) — and the actual decoders of `settings.json` live in `readNexus.ts:80-302`, with the input sanitizer in `exclusionInput.ts` and the exclusion operation in `exclusionScan.ts`. Rightful grouping: `Settings/` = settings.ts + the readNexus decoders + exclusionInput + exclusionScan (+ assetDirValidate if not under Assets); `Desktop/appConfig` = appConfig.ts + session's `resolveRestorePath`/`pruneRecents`/`isTrashedPath`; `sessionRoot`/`openSession` stay as a 25-line Core session holder.
- **`walkCache.ts` at root, imported by `IO/atomicWrite.ts:12`:** the read-parse cache lives outside the folder that depends on it. → `IO/`.
- **`sidecarIO.ts` at root:** a 50-line adapter over `IO/atomicWrite` + `paths.sidecarPath`; 8 of its 10 importers are `CRUD/`. → `IO/sidecar.ts`.
- **Domain modules inside `IO/`:** `navigationFile.ts` (imports settings, assetRoots, localState — a Navigation module), `propertiesRegistry.ts` (a Properties module; the `Properties/` folder exists with one file), `tabsState.ts` and `windowState.ts` (zero file IO; they are `localState` rows), `thumbnails.ts` (Electron capture). `IO/` should hold primitives only.
- **The open-pass family at root:** `identity` → `adopt` → `contextsRegistry.ensure` → `record` (walk + `remint`) → `indexSeed` → `repairSweep` is one sequence `index.ts` runs on open, spread over six root files. Rightful grouping: `Open/` (or `Identity/` for identity/adopt/record/remint, with indexSeed under `Index/` and repairSweep under `Properties/`).
- **The Trash family split across root, `IO/`, and `CRUD/`:** `provenance.ts` (root, 747), the bundle primitives in `IO/atomicWrite.ts:186-255`, and `CRUD/restoreScrub.ts`, `CRUD/restoreProperty.ts` (both imported only by provenance), `CRUD/trashRows.ts` (imported only by index). Rightful grouping: `Trash/` ≈ 1,070 lines.
- **`Properties/` as a one-file folder** while `IO/propertiesRegistry.ts`, `repairSweep.ts`, and nine `CRUD/` property files exist. Either the folder absorbs its domain or it dissolves into shared/.
- **`linkTitles.ts` at root:** a network fetcher with a DB-backed cache, one importer (index). It is a Links feature, not engine infrastructure.
- **`sessionDb.ts` at root:** its only job is holding `Database/`'s two handles; it belongs in `Database/`.

---

### 3. Coupling Hotspots

Places where a phone could not reuse the file without surgery, quoted by location:

1. **`mutate.ts:79`** — `import { NO_NEXUS } from './ipc'`; `ipc.ts:1` imports `BrowserWindow, ipcMain`. One refusal constant pulls Electron into the 784-line dispatcher and into `contextMenu.ts` behind it. `NO_NEXUS`/`BUSY` belong in `shared/result.ts`.
2. **`watcher.ts:6-7, 21, 93-99, 202-209`** — `chokidar.watch`, `BrowserWindow`, and four `pushToWindow(win, …)` calls woven into a settle pipeline whose classification, value-change grouping, and tile-host grouping (lines 147-180) are host-neutral.
3. **`linkTitles.ts:5, 88`** — `net.request` from Electron; `linkTitles.ts:4, 53` `StringDecoder`. The scanner (lines 18-65) is pure and tested; the fetch is one function.
4. **`IO/thumbnails.ts:8-9, 52, 71`** — `nativeImage.createFromBitmap`, `win.webContents.capturePage()`. Written to the *synced* `.nexus/assets/<id>/thumbnails/` tree (line 2), so a phone consumes what only the desktop can produce.
5. **`webGuests.ts:5`** — entire file is Electron session/webContents policy.
6. **`IO/fileLock.ts:16, 22`** — `AsyncLocalStorage` for re-entrancy detection. Node-only; the plan's `host().lock` would silently drop the deadlock guard unless the host re-implements it.
7. **`Database/driver.ts:5`** `node:sqlite`; **`Database/versionsDb.ts:6`** `node:zlib`; **`Database/open.ts:4`**, **`versionsDb.ts:4`** synchronous `fs`. Reached from otherwise-neutral modules via `Database/localState` at `IO/navigationFile.ts:11`, `IO/tabsState.ts:11`, `IO/windowState.ts:14`, `record.ts:11`, `remint.ts:14`, `linkTitles.ts:7` — SQLite is woven into Navigation, Tabs, and the identity record through a KV that has no interface file.
8. **`IO/atomicWrite.ts:6`** `write-file-atomic`; **`:27-30`** `stat` + `utimes` (mtime preservation — every sweep, adoption, and migration depends on it; not in the plan's host seam); **`:225`** non-recursive `mkdir` relying on `EEXIST` to de-collide same-instant deletes.
9. **`IO/walk.ts:41, 91`** `readdir({recursive:true})`; **`:97`** `Dirent.parentPath` (Node 20+ API).
10. **`realpath` in five places** — `pathSafety.ts:41-42`, `session.ts:19`, `mutate.ts:162, 174, 196`. Not in the primitive set; a Capacitor sandbox has no symlink story, so the phone needs a lexical fallback and the desktop keeps realpath as a host extra.
11. **Birth time** — `adopt.ts:68` (`birthtimeMs` for adopted ids), `record.ts:134` (eldest claimant). The primitive `stat` must expose it or null.
12. **`ids.ts:6, 66`** synchronous `createHash('sha256')` inside `adoptedId(): string`. WebCrypto is async; either a pure-JS sha256 or an async signature rippling into `readNexus.ts:405, 491, 535, 563, 631` and `watchPatch.ts:367, 405`.
13. **`assetMigrate.ts:14, 59`** `createHash('md5')` — a second hash algorithm for no reason sha256 would not serve.
14. **`IO/writeEcho.ts:6, 35`** `sep` in a prefix test over absolute paths — fine on the desktop, wrong on a host whose "absolute" paths are URIs.
15. **`paths.ts:5, 12`** `relative(root, abs).split(sep)` — the one place platform separators are normalized; correct, but every caller that joins with `node:path.join` (`join(root, rel)` appears in 20+ sites) assumes filesystem paths, not host URIs.
16. **`readNexus.ts:8`, `IO/pageFile.ts:6-14`** `yaml` — pure JS, runs anywhere; not a hotspot, noted so it isn't mistaken for one.
17. **Injected already, and the pattern to keep:** `mutate.ts:91-98` `MutateDeps.trashToSystem`; `appConfig.ts:2` "parametrized by the userData dir (not app.getPath)".

The deeper coupling is structural rather than import-level: every root module is a process singleton (`liveTree`, `assetMap.held`, `valuesChanged.ledger`, `walkCache.entries`, `writeEcho.recent`, `fileLock.fileChains`, `session.currentRoot`, `sessionDb.db`, `linkTitles.cache`, `indexSeed.reread`) designed to be poked by the 2,071-line `index.ts`. A phone host can live with one-Nexus-per-process singletons; a multi-window desktop cannot, and the CLAUDE.md "multi-window-ready seams" rule is already violated by ten of them.

---

### 4. Layers

Pass-through modules and what collapses if they go:

- **`sidecarIO.ts` vs `IO/atomicWrite.ts` vs `walkCache.ts`.** `sidecarIO.readSidecar` = `readFile` + `parseJsonText` + `schema.safeParse` (a validating `readJsonObject`); `writeSidecar` = `writeJson(sidecarPath(...))`; `withSidecarLock` = `serializeOnFile(sidecarPath(...))`. All three are one-liners whose only value is building the lock key in one place. Meanwhile `readNexus.ts:336` defines a *second* `readSidecar` (`cachedParse(readJsonObject)`) with different semantics — two functions of one name, one strict-validating, one lenient-cached. `walkCache` is imported by `atomicWrite` solely for `forgetParse` in `rewritePreservingTimes` (atomicWrite.ts:31) — the write primitive reaching into the read cache because mtime preservation defeats the (mtime, size) gate. Collapse: `IO/sidecar.ts` keeps the lock-key authority as one 20-line file; `readJsonValidated(path, schema)` joins `atomicWrite`'s read half; `walkCache` moves into `IO/` so the dependency points inward; the walk's cached `readSidecar` gets a name that says "cached".
- **`mutatePatch.ts` vs `watchPatch.ts` vs `liveTree.ts`.** One subsystem split by *trigger* (watcher event vs write confirmation) rather than by *what changes*. `applyPatch` (watchPatch.ts:237) is a live-tree operation, not a watch operation; `findContainer`/`findPage`/`findSpace` (watchPatch.ts:82-110) are tree lookups by path; `mutatePatch.routeMutation` (lines 130-217) and `watchPatch.applyOne` (lines 253-293) are both "route a fact to its confirmer". Collapse: `LiveTree/` = `holder.ts` (liveTree, 85), `diskPatch.ts` (classify + `patch*FromDisk`, ~380), `confirm.ts` (route + `applyOne` + `confirmBy`, ~330). The plan's Task 34 `TreeHolder` interface exists only because the plan leaves `liveTree.ts` in main; the file has no Node import and nothing host-specific, so moving it removes the need for the abstraction.
- **`record.ts` / `remint.ts` / `provenance.ts` / `repairSweep.ts` / `CRUD/restoreScrub.ts`.** Not one family — two and a stray. (a) `record` + `remint` are the identity baseline; `remint`'s sole importer is `record` (remint.ts is 204 lines; merging or nesting under `Identity/` is the call). (b) `provenance` + `restoreScrub` + `restoreProperty` (both imported only by provenance) + `trashRows` + atomicWrite's bundle half are the Trash subsystem; `provenance` imports `record.projectBaseline` only for the id-live refusal (provenance.ts:344). (c) `repairSweep` is a Properties open-time reconcile that happens to consume `indexSeed.rereadSinceSeed`; it belongs with Properties, not with records or trash. What collapses: `provenance.ts` splits into `Trash/record.ts` (zod schema + `writeRecord`/`readRecord`, ~90), `Trash/gather.ts` (lines 148-278, ~130), `Trash/resolve.ts` (lines 280-401, pure, ~120), `Trash/spend.ts` (list/restore/empty, ~340).
- **Three tree walkers for lookups in main.** `record.buildBaseline` (record.ts:44-82) walks collections/sets/pages for id→record; `valuesChanged.indicesOf` (valuesChanged.ts:36-54) walks the same for path↔id; `watchPatch.findContainer/findPage` walks by path; `provenance.containerChain` (provenance.ts:314-330) walks for ancestry. The renderer has `src/renderer/treeIndex.ts` doing the same job with a WeakMap memo. One memoized index in `shared/treePatch.ts` (which already owns `parentOf`, `updateNodeInTree`, `removeNodeInTree`) would replace all four.
- **`readPage.ts` (27):** `readFile` + `splitFrontmatter` + `splitEnvelope` + id fallback. Folds into `IO/pageFile.ts` as `readPageDetail`; one importer.
- **`exclusionInput.ts` (28):** a sanitizer extracted from `index.ts` for testability; folds into `settings.ts` as `sanitizeExclusions`, or into shared as a wire validator.
- **`Database/schema.ts` (61) ↔ `open.ts` (74):** one importer, one lifecycle; fold.
- **`sessionDb.ts` (57):** holds handles that `Database/open.ts` and `versionsDb.ts` create; belongs in `Database/` as `handles.ts`.
- **`session.ts` + `appConfig.ts`:** `resolveRestorePath(config)` and `pruneRecents` operate on `AppConfig`; they are appConfig operations living in the session-root file.
- **`readNexus.ts` settings decoders + `settings.ts`'s `liveLeaves`:** `settings.ts:56-63` reads leaves from the live tree or disk; `readNexus.ts:254-272` decodes them. Two files, one Settings codec; `readNexus` should import the codec, not own it.
- **`valuesChanged.ts`:** the ledger half (lines 12-25, 79-91) is push batching; the index half (lines 27-77) is a tree index. Different owners.

---

### 5. Folder Verdict

| Folder | Verdict | Admission rule a future file must meet |
| --- | --- | --- |
| `main/` root | **dissolve** — 41 non-menu files with no rule; every one belongs to a domain or to IO | only host bootstrap: `index.ts`, `ipc.ts`, window/menu wiring. A file that has a domain noun in its name does not live here |
| `IO/` | **split** — keep as primitives (atomicWrite read/write half, fileLock, walk, walkCache, writeEcho, pageFile envelope engine, sidecar); move navigationFile → Navigation, propertiesRegistry → Properties, tabsState/windowState → the KV store module, thumbnails → Desktop | imports only host primitives + `@shared`; knows no domain type (`NexusTree`, `NavRef`, `Personalization`, `TileDoc` are all disqualifying) |
| `Database/` | **split** — interfaces (KV over `Scope`, content index, snapshot store) → Core; SQLite bodies + open/schema/versionsDb/sessionDb → Desktop `Store/` | SQL text lives here and only here; a module here never imports a domain module (today `localState`, `contentIndex` are clean; `versionsDb` imports `IO/atomicWrite.fileStamp` for a filename — move `fileStamp` to shared) |
| `Connections/` | **keep, or hoist to `shared/`** — both files import only `@shared`; the renderer's MarkdownPM has six files touching `pageLinkPattern`/`codeMask` and would benefit from one scanner | pure text-level connection logic; `@shared` imports only; no fs, no tree |
| `Properties/` | **grow or dissolve** — one 52-line pure file is not a folder; absorb `IO/propertiesRegistry`, `repairSweep`, and the CRUD property files, or move `schema.ts` to shared | Properties-domain rules and the registry file's IO; validation stays pure |

**Proposed tree for this scope** (line estimates from the file table; CRUD's ~3,130 lines are other-scope and noted in brackets where they would join):

```
// Core/engine                                   ~7,350 in-scope lines
├── // IO                                        ~690  · atomicWrite read+write half (185), fileLock (45), walk (98), walkCache (77), writeEcho (38), pageFile (200), sidecar (50)
├── // Paths                                     ~375  · paths (86), exclusion (98), pathSafety (51), coerce (17), order (35), disambiguate (15), ids (72)
├── // Read                                      ~660  · readNexus walk half (~480), folderKind (155), readPageDetail (27)
├── // LiveTree                                  ~940  · holder (85), diskPatch (~380), confirm (~330), valuesChanged index+ledger (91), watcher's neutral settle half (~120 arrives as settle.ts)
├── // Settings                                  ~560  · settings (161), settingsCodec from readNexus (~230), exclusionInput (28), exclusionScan (88), assetDirValidate (53)
├── // Assets                                    ~510  · assetMap (144), assetRoots (83), assetWrite (37), assetMigrate (245)
├── // Tiles                                     ~240  · tiles (195), tileDoc (43)
├── // Trash                                     ~820  · provenance split four ways (747) + bundle primitives from atomicWrite (~70)   [+ CRUD restoreScrub 89, restoreProperty 82, trashRows 86]
├── // Identity                                  ~690  · identity (67), adopt (229), record (186), remint (204)
├── // Index                                     ~210  · indexSeed (170), contentIndex interface (~40)
├── // Navigation                                ~130  · navigationFile (131)
├── // Contexts                                  ~60   · contextsRegistry (59)   [+ CRUD contextWrite 302, contextCascade 337, contextJournal 49]
├── // Properties                                ~220  · schema (52), propertiesRegistry (105), repairSweep (60)   [+ CRUD registryProperty, assignment, removeProperty, deleteProperty, optionOps, pageValue, propertyJournal, keyHolders ≈ 1,150]
├── // Connections                               ~130  · scan (56), rewrite (73)  — or shared/
├── // Mutate                                    ~790  · mutate (784, minus the ipc import)   [+ CRUD page 118, folderEntity 77, reorder 93, cascade 57, util 44]
├── // Session                                   ~110  · sessionRoot holder (~25), tabsState (54), localState KV interface (~30)
└── // Links                                     ~60   · title scanner (pure half of linkTitles)

// Desktop/host                                  ~1,170 in-scope lines
├── // Store                                     ~500  · driver (40), open+schema (135), versionsDb (141), localState SQL (~60), contentIndex SQL (~120), handles = sessionDb (57)
├── // Watch                                     ~120  · chokidar arm + pushToWindow (watcher's host half)
├── // Web                                       ~200  · webGuests (200)
├── // Capture                                   ~120  · thumbnails (117)
├── // Net                                       ~75   · linkTitles fetch + cache over net.request
├── // AppConfig                                 ~90   · appConfig (56) + session's restore/prune/isTrashedPath (~35)
├── // Windows                                   ~57   · windowState (57)
└── (index.ts, ipc.ts, menus — other scope)
```

Where the numbers disagree with Phase 8: the plan moves "about 2,900" lines and keeps `governedWrite`, `indexSeed`, `valuesChanged`, the write half of `atomicWrite`, and `liveTree` in main to "cut cycles". Those cycles are import cycles among main modules, not host coupling — `valuesChanged` and `liveTree` have zero Node imports, `indexSeed` is `readFile`+`stat` over a null-tolerant store. Placement-wise the neutral portion of this scope alone is ~7,350 lines; the plan's smaller number is a *phone-v0 subset*, which is a fine sequencing choice but should not be mistaken for where files belong. Two of the plan's splits also cut along the wrong grain: `atomicWrite` should split JSON/text primitives vs trash-bundle layout, not read vs write; and `watchPatch` should move whole with `liveTree` rather than gain a `TreeHolder` indirection.

The plan's host seam also omits five things this scope needs: `utimes` (mtime preservation in every sweep), `realpath` (five sites, optional with lexical fallback), `birthtime` in stat (two sites), non-recursive `mkdir` that reports "exists" (bundle minting), and a re-entrancy guard for the lock (or an explicit decision to drop it on the phone).

---

### 6. Wrong Scope Entirely

Files or symbols that should not live in `main/` at all:

**→ `shared/`** (both processes already speak these shapes, or a second host would):
- `paths.ts` on-disk name constants — `SIDECAR_FILENAME`, `SIDECARS`, `SPACE_SIDECAR`, `NEXUS_CONFIG_FILES`, `TILE_DOC_FILENAME`, `HOMEPAGE_HOST_DIRNAME` (paths.ts:17-23, 32, 58, 62, 69, 78-87). The file's own header splits on "names the renderer also speaks" — a renderer-centric criterion that stops meaning anything with two hosts reading the same disk. `shared/nexusPaths.ts` already holds `NEXUS_DIR`, `TRASH_DIR`, `CONTEXTS_REGISTRY_REL`; these are the rest of the on-disk contract.
- `Connections/scan.ts`, `Connections/rewrite.ts` — `@shared`-only imports; the renderer's MarkdownPM touches the same patterns in six files.
- `Properties/schema.ts` — `@shared`-only; pre-flight validation the property editor could run before the round-trip.
- `readNexus.readPersonalization` (lines 88-175) and `readCommands` (179-189) — codecs of `shared/types.Personalization` using `shared/types` coercions; the renderer decodes nothing today only because main hands it the decoded tree.
- Wire validators called by `index.ts` handlers: `IO/tabsState.sanitizeTabSet`, `IO/windowState.sanitizeWindows`, `exclusionInput.sanitizeExclusions`.
- `Database/localState.Scope` (lines 11-27) — the plan already moves it; `watchPatch.WatchEvent`/`WatchEventName` — the sync landing path produces the same events; `IO/atomicWrite.fileStamp` — a filename-safe timestamp imported by `versionsDb` and used in trash leaf names.
- `valuesChanged.containerOf` — trivial and wire-adjacent (`ValueChange.rel`).

**→ Desktop host** (Electron/Node-only by nature, not by accident): `webGuests.ts`, `IO/thumbnails.ts`, `Database/{driver, open, schema, versionsDb}.ts`, `sessionDb.ts`, `appConfig.ts`, the chokidar arm of `watcher.ts`, the `net.request` half of `linkTitles.ts`, the `AsyncLocalStorage` guard in `IO/fileLock.ts`, `session.ts`'s restore/prune/`.Trashes` logic, and `IO/windowState.ts` (a desktop-only concept even though its rows are device chrome).

**→ menu/host scope:** `mutate.ts:79`'s `NO_NEXUS` import is the only thing tying the dispatcher to `ipc.ts`; the constant moves to `shared/result.ts` and the dispatcher owes the host nothing. `contextMenu.ts` importing `handleMutate` directly (bypassing `index.ts`) is a second entry point into the dispatcher that the host scope should know about.

**→ `renderer/`:** nothing in main belongs in the renderer. The reverse is worth stating: `src/renderer/treeIndex.ts` is the fourth memoized tree walker in the codebase (see §4); one shared index would serve both processes.

---

### Summary

Of 8,520 in-scope lines, about 86% is host-neutral engine logic and 14% is Electron/Node-only, but the folders encode none of that: 41 domain files sit at `main/` root with no admission rule, `IO/` holds four domain modules (Navigation, Properties registry, Tabs rows, thumbnails) beside its primitives, `Database/` fuses a KV/index interface with its SQLite body, and `Properties/` is a one-file folder for a domain spread across three. The clearest misfilings are Tiles (two root files born after `CRUD/` existed), five asset files at root, Settings split across `settings.ts`, `appConfig.ts`, `session.ts`, and 220 lines of decoders inside `readNexus.ts`, and a Trash subsystem spanning root, `IO/atomicWrite`, and three `CRUD/` files. Real coupling hotspots are few and quotable: `mutate.ts:79` importing `ipc` for one constant, chokidar and `pushToWindow` woven through `watcher.ts`, `net.request` in `linkTitles.ts`, `capturePage` in `thumbnails.ts`, `AsyncLocalStorage` in `fileLock.ts`, and SQLite reached through `localState` from six otherwise-neutral modules. Phase 8's ~2,900-line move is a phone-v0 subset, not a placement; its `TreeHolder` indirection is unnecessary once `liveTree.ts` (zero Node imports) moves, its `atomicWrite` split cuts along read/write instead of primitives/trash, and its host seam omits `utimes`, `realpath`, birth time, exists-signaling `mkdir`, and lock re-entrancy.
