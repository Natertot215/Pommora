## Mobile Companion & Pommora Sync — Implementation Plan

> **Status:** written, pending review · Phases 1–7 ship regardless; Phase 8 waits on a go and the phone's product spec · Spec: [[Mobile Companion & Pommora Sync — Decision Log]] · Research: [[Mobile Companion & Pommora Sync — Research]] · Execute tasks in order.
> Citations name files and symbols; re-derive before editing. Counts below were taken 09-04-2026 at `e79702e3`.

**Goal**

Pommora gains its own end-to-end-encrypted file synchronization and an iOS companion. At the end, `Pommora/Sync` is one self-hostable Node process shipped as a container; `src/engine` holds the read-and-page-write chain and the sync client behind one filesystem seam that main binds to Node and the phone binds to Capacitor; `Pommora/Mobile` is a Capacitor iOS project that renders the existing renderer with a floating bottom bar; and Settings › General carries Account and Sync sections. Nathan can turn Obsidian Sync off, create a remote Nexus from `~/NexusOS` without moving it, connect the phone to that Nexus, and have both devices edit the same files with live updates, deletions and trash bundles crossing, catch-up on reopen, and page history retained on the server.

Phases 1 through 7 are the arc that ships regardless of what the phone becomes: the host interface, the server, the client, the desktop client, and the phone as a Files-visible synced Nexus with a sign-in shell. Phase 8, the renderer port, is the product bet, and it opens only on an explicit go after Gate 5 and a product spec naming what the phone is for.

The shape follows the ratified decision log: a server rather than the desktop as remote (so a closed laptop never strands the phone), whole-file items with tombstones on a monotonic per-Nexus sequence (one counter serves as the store precondition and the pull cursor), most-recent-wins by envelope mtime with device-id tie-break and every loser retained as a server version, a random Nexus key wrapped by a PBKDF2 key so a password change never re-encrypts content, and an engine seam rather than a phone-side re-implementation of the walk (a second definition of what a Nexus is was rejected). The engine binds its host once per process at boot rather than threading a host parameter through the 400-odd import sites of the moving set; the engine owns POSIX path helpers rather than routing joins through the seam; the phone's atomic-write plugin sets modification dates, so both hosts restore envelope mtime the same way.

Bounded by: v0 phone scope is A-7 as restated by Ruling 8 (tree, open page, edit body, create page with its order, rename, delete of pages and containers, move, reorder, tabs, sign in, connect, sync) and every other mutation refuses; the phone opens the renderer's existing menus on a long press through one in-app row-menu pane drawn from the existing menu kit, and no menu is redesigned; MarkdownPM ships as-is; the bottom bar is five items whose tap behavior is the simplest reading and is not designed; no keyboard shortcuts; the device install waits on a paid developer account and is a documented Declared Stop; block documents stay wherever the Tiles plan leaves them (in execution at planning, moving to `_tiles.json`), and whole-file sync carries their `.md` bodies and that sidecar either way. Not solved here: phone-side mutations beyond v0, the list-menu generalization (every menu drawn from one shared model on both hosts), a content index on the phone, three-way merge, OAuth, file coordination for the Files-visible copy, and multi-user Nexus'.

**Requirements** (the spec's Core, numbered)

1. The engine seam: one host interface in `src/engine`, Node-bound in main (Task 1); the read-and-page-write chain, the rename cascade, folder-entity CRUD, and the content-trash writers move behind it in Phase 8, behavior-preserving on desktop (B-1..B-4).
2. Phase 8: the bridge grouping shared and the asset scheme host-injected, so a second host installs the same `window.nexus` shape (D-1, D-3, D-4).
3. Pommora Sync server: Node 24.15+ built-ins only, one SQLite file, email + password, device tokens, Nexus' keyed by Nexus id, monotonic sequence, tombstones, retained versions with server-side retention pruning, change feed, CORS for `capacitor://localhost`, one Docker container with `DATA_DIR` (C-9, C-10, F-1, F-4, F-5, G-1..G-4).
4. The sync client in `src/engine/Sync`: manifest walk, E2E crypto, base state, pull → detect → push, the conflict rule with loser retention, per-page cursor persistence, resync, per-item apply with empty-directory pruning (C-2..C-8, F-2..F-9, J-1, J-2, L-1, L-2).
5. Desktop client in main: push on the write funnel and watcher activity, feed subscription, landings applied through `applyRemote` under the page lock with the outgoing text captured to file history, Settings › General Account and Sync sections, remote versions listed in Page History (C-7, C-11, H-1..H-5).
6. The mobile skeleton: Capacitor 8 iOS project at `Pommora/Mobile`, the Files-visible copy under `Documents/<Nexus name>`, a Swift atomic-write plugin, Keychain-held secrets, JSON state under `Library`, the first-run and status shell, sync on resume, launch, and the feed, booting on the iOS 26.5 Simulator with the Nexus in the Files app (A-5, A-6, D-2, E-1..E-6, I-1, I-2). Phase 8 adds the in-process api, the tree patched per landing, the bottom bar, a long press opening the renderer's existing menus through an in-app row-menu pane, and rename, delete, move, and reorder through the engine (A-7 as restated by Ruling 8, A-9, D-1, D-4, D-5, I-3, J-3).
7. Verification Nathan asked for on 09-04-2026: an automated two-root integration suite against the real server under `npm run test`, a headless Node sync CLI that stands in for a second device, a dry run over a scratch copy of NexusOS, and a Simulator acceptance that reads the app container's files directly.
8. The device path documented end to end (bundle id, team signing, TestFlight or ad-hoc), gated only on the developer account (A-5).
9. Documentation reconciled per section K, including the CLAUDE.md hard rule restated (K-1..K-9).

**Acceptance — the whole thing working:** With the sync server running on localhost, a desktop instance open on a scratch copy of NexusOS and connected to a remote Nexus, and the companion on the iOS 26.5 Simulator connected to the same Nexus: a body edit saved on the desktop appears in the Simulator's `Documents/NexusOS` copy within five seconds without any manual action; a page created by writing a file into the Simulator's copy reaches the desktop's folder after the app relaunches; a desktop delete removes the page from the Simulator's copy and lands its `.trash` bundle there; the Simulator app is terminated during three desktop edits and holds all three after relaunch; both roots' sync manifests are byte-identical for every file outside the database set; and the server lists two versions for a page both sides edited before syncing, the newer mtime standing at the head. **Phase 8 adds:** a body edit typed on the phone and a page renamed on the Simulator each land on the desktop, the rename with its inbound links rewritten.

**Forced By**

- The watcher skips paths `recordWrite` recorded (`src/main/watcher.ts:107`, `IO/writeEcho.ts`) → the desktop push trigger must hook the write funnel itself; watcher activity alone never sees an in-app write. Binds Task 12.
- `serializeOnFile` is keyed on the literal absolute path and is non-reentrant (`IO/fileLock.ts`) → the desktop apply takes the landed file's absolute path as its key and never calls `rmwJsonStrict` or `rewritePageSerialized` inside it. Binds Task 13.
- `noteExternalEdit` arms a timer that reads the text from disk later (`CRUD/fileHistory.ts`) → by then the remote text has replaced it, so the apply captures the outgoing text itself, before the write. Binds Task 13.
- `rewritePreservingTimes` calls `forgetParse` because a restored mtime is invisible to the (mtime, size) gate (`IO/atomicWrite.ts:25-32`) → `applyRemote` landings forget the parse the same way. Binds Tasks 1, 13, 22.
- `loadValues.ts:58` reads Last Modified from disk mtime → a landing that re-dated the file would move Last Modified; every host restores envelope mtime. Binds Tasks 1, 19.
- The moving set has 9 forward edges into main (`fileLock`, `writeEcho`, `governedWrite`, `indexSeed`, `valuesChanged`) and 3 true cycles (page ⇄ governedWrite, loadValues ⇄ indexSeed, loadValues ⇄ valuesChanged) → the lock and echo become host operations; `updatePageProperty` stays in main; `loadValues` splits at its corpus boundary. Binds Tasks 33, 34.
- `paths.ts` has 51 importers, `IO/atomicWrite.ts` 53, `ids.ts` 24 → the engine binds its host once per process (`setHost`) so no signature changes; moves are import-path rewrites. Binds Task 1.
- `readdir` order is non-deterministic in Capacitor Filesystem (research: Capacitor Filesystem) and Node sorts nothing either → `host.readDir` returns name-sorted entries on every host. Binds Tasks 1, 20.
- Capacitor `readdir` returns mtime and size per entry but `stat` is one bridge call per path → `DirEntry` carries an optional stat and `cachedParse` accepts a known stat, so a phone walk costs one call per directory. Binds Tasks 20, 32.
- `createPage` on desktop is followed by a `page_order` sidecar write (`src/main/mutate.ts:269-279`) and Nathan ruled the order a must → `setChildOrder`, `updateFolderSidecar`, and `createDisambiguated` move into the engine so the phone's create is the desktop's. Binds Tasks 34, 38.
- `mutate.ts:276` and every sidecar writer key the sidecar lock through `sidecarPath` → the engine's `withSidecarLock` keeps that one spelling. Binds Task 33.
- Thumbnails under `.nexus/assets/<id>/thumbnails` are rewritten on every navigation capture and are named a synced folder (`nexusPaths.ts`) → every capture pushes one JPEG; accepted cost per H-5, the phone never captures. Binds Task 8 (manifest includes them).
- A scratch copy of NexusOS carries the real Nexus id, and Create against an existing id becomes Connect (H-3) → every scratch run uses a throwaway server `DATA_DIR` deleted at closeout, never a server the real Nexus will later reach. Binds Tasks 11, 25, 26.
- `nexus:state` answers a `NexusState` union, `systemAccent` is called outside `load()`'s try, and every `on*` return is used as an effect cleanup (`Store/nexusSlice.ts:84`, `App.tsx:84-143`) → the phone's api must serve every boot key and return a function from every `on*`. Binds Task 38.
- `WebWindow.tsx:66` calls `wv.getURL()` on a bare element → on WKWebView a tapped web link throws; D-5 accepts blank, not a throw, so one guard lands. Binds Task 39.
- `Tabs/tabsModel.ts:318` uses `crypto.randomUUID` → the phone origin must stay a secure context (`capacitor://localhost`; live reload at `http://localhost:5173`, never a LAN IP). Binds Tasks 18, 24.
- Node 24.15 strips types unflagged and `node:sqlite` is a release candidate there → the server runs `node src/index.ts` with no build step, erasable syntax only, `.ts` import specifiers. Binds Task 3.
- The renderer resolves `react` from `Pommora/node_modules` by walking up from `src/renderer`; a second React under `Mobile/node_modules` would split hooks → Mobile installs no React and dedupes. Binds Task 18.

**Inherited Reasoning**

- Desktop-as-server, mirroring Obsidian Sync, a thin client over the desktop, and Node polyfills in the WebView were each rejected (spec: Considered & Rejected); a task that reaches for any of them is wrong.
- A sibling conflict file would duplicate a page's `ID` key; losers are retained versions, never files beside the winner.
- Standard Notes' timestamp cursor loses a write landing between a read and its save; the sequence cursor is the rule.
- A separate key-verifier record is redundant: the GCM tag on the wrapped Nexus key is the password check.
- Capacitor Preferences is documented as lightweight; sync state is a JSON file under `Library`.
- `NSAllowsArbitraryLoads` is never added; `localhost` needs no ATS key.
- Client-side sync locks are unnecessary under the server's version precondition.
- `pathSafety.resolveUnderRoot` realpaths and requires existence, so the engine validates remote paths lexically plus `invalidName` per segment (F-8).

**Grounding**

- `Mobile Companion & Pommora Sync — Decision Log.md` — the contract; every `[assumed]` entry is built as written unless the code contradicts it, and the divergences taken are listed under Deviations before execution starts.
- `Mobile Companion & Pommora Sync — Research.md` — Capacitor Filesystem non-atomic writes, `readdir` order, `convertFileSrc` shape, ATS/CORS, live reload, SPM layout, Web Crypto availability, `node:sqlite` status.
- `Pommora/src/shared/bridge.ts`, `src/preload/index.ts` (the `api` object, 150 keys), `src/main/ipc.ts` (`serveBridge`, `BridgeAsks`, `scopeGet`/`scopeSet`).
- `src/main/index.ts:742-1270` — `nexus:state`, `assets:map`, `tabs:*`, `page:open`, `page:updateBody`, `view:loadValues` handlers; `:374-470` the open sequence.
- `src/main/IO/writeEcho.ts`, `IO/atomicWrite.ts`, `IO/fileLock.ts`, `watcher.ts`, `watchPatch.ts`, `CRUD/fileHistory.ts`, `Database/localState.ts`, `Database/versionsDb.ts`, `appConfig.ts`.
- `src/main/readNexus.ts`, `readPage.ts`, `IO/walk.ts`, `walkCache.ts`, `IO/pageFile.ts`, `sidecarIO.ts`, `IO/propertiesRegistry.ts`, `folderKind.ts`, `ids.ts`, `paths.ts`, `exclusion.ts`, `coerce.ts`, `order.ts`, `CRUD/util.ts`, `CRUD/page.ts`, `CRUD/loadValues.ts` — the moving set, 2,861 lines including `watchPatch.ts` and the preload.
- `src/renderer/Store/nexusSlice.ts:80-145` (boot), `App.tsx`, `Assets/assetUrl.ts`, `Settings/SettingsWindow.tsx` (Frames, Row kinds, `settingsRow`), `Windows/PageHistoryWindow.tsx`, `Sidebar/Ribbon.tsx`, `Tabs/tabsModel.ts:318`, `styles.css:10-13`.
- `tsconfig.node.json`, `tsconfig.web.json`, `electron.vite.config.ts`, `vitest.config.ts`, `vite.config.ts`, `vite.config.app.ts`, `biome.json`, `package.json`.
- `~/NexusOS`: 990 files outside `.git`/`.obsidian`/`.claude` on the morning of 09-04-2026, 533 outside `.trash`; by evening `.trash` held one entry and the manifest 506 files across 107 directories — the Nexus moves daily, so every count is re-derived at run time; `.obsidian` 13 MB, `.nexus` 7.6 MB; largest asset under 10 MB; `.nexus/nexus.json` id `01KS5VNGTE7NX7E0KHMF0TF7CT`.
- Toolchain checked 09-04-2026: Node 24.15.0, Xcode 26.6 (17F113), iOS 26.5 Simulator runtime (23F77), iPhone 17 Pro `00887B6E-210B-4E8A-B253-2D544620F25D`, no CocoaPods, zero signing identities.
- npm latest 09-04-2026: `@capacitor/core` `cli` `ios` 8.5.1, `@capacitor/filesystem` 8.1.3, `@capacitor/app` 8.1.1, `@capacitor/preferences` 8.0.1, `@aparajita/capacitor-secure-storage` 8.0.0.
- `.claude/Planning/Tiles — Implementation Plan.md` — status "written, pending review"; `src/main/blocks.ts:67` still reads `readKey('blockDoc'`.

**Environment**

- Plan directory: `.claude/Planning`. Spec input: the decision log. Explorer: `Explore`. Research: `general-purpose` with curl. Code reviewer: `general-purpose` scoped to correctness (no dedicated reviewer agent exists). Attack reviewer: `build-breaking-agent`. Neutral verifier: `general-purpose`. Simplification: `code-simplifier` then `comment-killer-agent`. Rules directory: `.claude/Guidelines`. Standard agents only; never the Workflow tool; at most two verification or synthesis agents per scope.
- Gate commands, run from `Pommora/`, exit codes read directly: `npm run typecheck` (grows `typecheck:engine`, `typecheck:sync`, `typecheck:mobile`), `npm run test`, `npm run lint`, `npm run build`. Baseline at `e79702e3`: typecheck green, 318 test files / 3,981 tests, lint clean over 1,014 files, build green.

**Shapes:** additive (Phases 1–6) · refactor (Phase 8) · user-visible (Tasks 15, 39) · live-data (Tasks 25, 26: NexusOS is Nathan's real Nexus, every run is against a copy on a throwaway server).

**Declared Stops**

- Gate 4 — the Settings › General Account and Sync sections are the first user-visible surface; Nathan sees them before the phone is built on the same channels, and gives the go for Phase 5 here.
- Gate 5 — the companion on the Simulator: the sign-in shell, the status screen, and the Nexus in the Files app. Phase 8 opens only on a separate go given here or later, with the phone's product spec in hand.
- Task 27 — the device install, gated on the paid developer account.

**Global Constraints (every task inherits these):**

- Gates from `Pommora/`, exit codes read directly, never piped: `npm run typecheck && npm run test && npm run lint && npm run build`. `npm run lint` exits 0 with warnings: read the summary line.
- Every line, module, and mechanism is a budget: add only what a task's Becomes names; reuse before invention; a second resolver, walker, cache, or validator is a plan defect to log, not a thing to write.
- Commit as soon as a gate is green, explicit paths only (`git add <path>…`), never a directory, never `git stash`/`checkout .`/`clean`/`reset`. Never touch a path `git status` shows dirty that this arc did not dirty (another session's set; five files and three deleted plans at planning). Check `git status` for foreign staged paths before every commit; the `.claude` auto-stage hook makes a peer's doc edits ride any commit, which is the ratified convention, so name them in the commit report rather than unstaging them. Commit messages end with `Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>`.
- Phase 8 opens only after the Tiles arc's closeout commit: that arc is editing `watchPatch.ts`, `watcher.ts`, `mutate.ts`, `index.ts`, and folding `blocks.ts` into `Tiles/`, and Tasks 32 and 35 rewrite or move those files. Tasks 32 and 35 re-derive their Now first (`watchPatch.ts`'s line count and export list, the `_tiles.json` patcher that will exist and belongs in `diskPatch.ts`, the `blocks.ts` importers).
- Comments only for a why the code cannot state; never a feature's state; `KNOB` and `(Nathan's call)` markers survive every pass. Title-Case UI labels. No keyboard shortcuts.
- Biome formats every write through the hook; a shell-driven edit runs `npm run format` after.
- Main and preload do not hot-reload; a bridge change needs a dev-process restart. React editor extensions need ⌘R.
- Live data: `~/NexusOS` is never opened by a test instance; every verification run copies it (`rsync -a --exclude .git --exclude .obsidian --exclude .claude ~/NexusOS/ /tmp/pommora-scratch/NexusOS/`) and runs the server with a throwaway `DATA_DIR` under `/tmp/pommora-scratch/`, removed at closeout. A test instance uses `POMMORA_USERDATA` pointed at a scratch dir.
- Out of scope everywhere: `Showcase/`, the block-document location (Tiles plan), phone-side mutations beyond A-7 as restated by Ruling 8, the bottom bar's design, every menu's design (the pane draws the existing kit), the list-menu generalization, OAuth, chunked transfer.

**Made False** (each rewrite lands in the commit that falsifies it)

| Doc | The specific claim | What makes it false | Task |
| --- | --- | --- | --- |
| `.claude/CLAUDE.md:29` | "Main owns the filesystem. All fs/Node lives in `src/main`, reached from the renderer only through the narrow typed IPC bridge in `src/preload`" | The engine reaches the filesystem through the host seam; main is the desktop host | 29 |
| `.claude/CLAUDE.md:64` | "A mobile companion app is a near-term focus, which has already been discussed but without formal planning." | The companion exists | 29 |
| `ArchitecturePM.md:7` | "The main process (`src/main/`) is the one that touches the computer: it reads and writes every file" | Main binds the engine's host; the engine reads and writes through it | 29 |
| `ArchitecturePM.md:11` | "It can sit in iCloud Drive, Dropbox, or any synced folder for device-to-device sync." | Pommora Sync is the sync story | 29 |
| `ArchitecturePM.md:14` | "The picked folder — canonical content; syncs with the cloud" | Syncs through Pommora Sync | 29 |
| `ArchitecturePM.md:57,61,71,81,100` | `src/main/paths.ts`, `src/main/folderKind.ts`, `src/main/exclusion.ts`, "walk in main", `src/main/IO/atomicWrite.ts` | Those modules live in `src/engine` (Phase 8 only; true until then) | Gate 8 |
| `ArchitecturePM.md:108,116,147` | "`nexus.db` … never syncs", "`versions.db` … never syncs" (stated as intent) | The manifest rule excludes them by construction; restated as the rule | 29 |
| `ArchitecturePM.md:166` | "Stays on this computer, outside every Nexus" table | Gains the account and server address row | 29 |
| `ArchitecturePM.md:211` | "Cross-device sync — placing the Nexus in a synced folder gives device-to-device sync; real cloud sync is a long-term prospect." | Replaced by a Pommora Sync section | 29 |
| `PommoraPRD.md:23,25,90,205` | "neither is a v1 concern", "sync arrives later", "already gets device-to-device sync for free", "Out (post-v1): … sync, mobile" | Sync and mobile are in scope | 29 |
| `FrameworkPM.md:41` | "No phase commitments — … sync, mobile" | Removed; a version entry records the arc | 29 |
| `ConfigurationPM.md:7,9-16` | "each row writes one key of the `personalization` object"; §General has two rows | Account and Sync rows store elsewhere | 15 |
| `Dependencies.md:3` | "Reconcile against `Pommora/package.json`" | Three package files | 29 |
| `Development-Environment.md:24` | "covering both tsconfig projects" | Five projects; the mobile loop and the server are added | 29 |
| `.claude/CLAUDE.md:43` | "`npm run typecheck` … covers both `tsconfig` projects" | Five projects | 29 |
| `Development-Environment.md:41` | "set `app.setPath('userData', …)` from a `POMMORA_USERDATA` env … (instrumentation — removed before committing, grep-verified gone)" | The flag is standing | 12 |
| `ArchitecturePM.md:188` | "The preload derives its entire API from that map with one dialer per declared name" | It derives from the shared api table | 36 |
| `NexusRecordPM.md:15` | "`.trash` is outside the watcher and the list is fetched when the leaf opens" | Still true; gains "a bundle travels with sync" | 29 |
| `Guidelines/Development-Environment.md` | no mention of the mobile dev loop or Simulator verification | Added (K-7) | 29 |

**Dead Vocabulary**

- `vite.config.app.ts`, `dist-app`, `dev:app`, `build:app` → expect 0 across `Pommora/` outside `node_modules`. Legitimate hits: none.
- Control: `build:showcase` → 3 (`package.json`, `CLAUDE.md`, `Development-Environment.md`). Zero here means the sweep never ran.

**Hazard Window (Phase 8):** Task 32 moves `pathExists`/`readJsonObject` out of `src/main/IO/atomicWrite.ts` while 53 importers still resolve there; the window closes in the same task's commit (importers rewritten before the gate). No task may leave main importing a moved symbol from its old path across a commit.

---

### Phase 1 — The host seam

Additive. Budget: about +250 lines (host interface, posix path, sha256, the engine tsconfig, the node binding) and +200 of tests. Nothing moves; main gains one call at boot.

#### Task 1: The engine project, the host seam, and the Node binding

**Requirement:** 1

**Why:** Every later move needs a home whose typecheck refuses `node:` imports, one interface every host implements, and the desktop binding at boot. The seam is the whole architecture; nothing else in the plan compiles without it.

**Now** — `rg -l "from 'node:" src/main | wc -l` → 71; no `src/engine`; `tsconfig.json` references two projects:

```json
// tsconfig.json
{ "files": [], "references": [{ "path": "./tsconfig.node.json" }, { "path": "./tsconfig.web.json" }] }
```

```ts
// src/main/IO/atomicWrite.ts:18-21
export async function atomicWriteFile(filePath: string, data: string): Promise<void> {
  recordWrite(filePath)
  await writeFileAtomic(filePath, data, { encoding: 'utf8' })
}
```

**Becomes**

```json
// tsconfig.engine.json (new)
{
  "compilerOptions": {
    "composite": true, "module": "ESNext", "moduleResolution": "Bundler", "target": "ES2022",
    "lib": ["ES2022", "DOM"], "types": [], "strict": true, "skipLibCheck": true, "noEmit": true,
    "paths": { "@shared/*": ["./src/shared/*"], "@engine/*": ["./src/engine/*"] }
  },
  "include": ["src/engine/**/*", "src/shared/**/*"],
  "exclude": ["src/engine/**/*.test.ts"]
}
// tsconfig.json gains { "path": "./tsconfig.engine.json" }; tsconfig.node.json include gains
// "src/engine/**/*" and paths gains "@engine/*"; electron.vite.config.ts main block, vitest.config.ts,
// and vite.config.ts gain '@engine': resolve('src/engine'); package.json gains
// "typecheck:engine": "tsc --noEmit -p tsconfig.engine.json" and typecheck runs node && web && engine.
```

```ts
// src/engine/host.ts (new) + host.test.ts
export interface DirEntry {
  name: string
  kind: 'file' | 'directory' | 'other'
  stat?: FileStat // a host that lists stats in one call fills it; the walk's parse gate uses it
}
export interface FileStat { mtimeMs: number; size: number; kind: 'file' | 'directory' }
export class HostNotFound extends Error { readonly code = 'not-found' as const }
export interface EngineHost {
  readText(abs: string): Promise<string>
  readBytes(abs: string): Promise<Uint8Array>
  readDir(abs: string): Promise<DirEntry[]>
  stat(abs: string): Promise<FileStat | null>
  writeText(abs: string, text: string): Promise<void>
  applyRemote(abs: string, bytes: Uint8Array, mtimeMs: number): Promise<void>
  mkdir(abs: string): Promise<void>
  rename(from: string, to: string): Promise<void>
  remove(abs: string): Promise<void>
  lock<T>(key: string, fn: () => Promise<T>): Promise<T>
}
export function setHost(h: EngineHost): void
export function host(): EngineHost
// Contract, pinned by host.test.ts and engineHost.test.ts rather than by comments: readText/readBytes throw HostNotFound when
// absent; readDir answers [] when unreadable and is name-sorted; writeText and rename are the host's own writes (the desktop
// records their echoes); applyRemote is atomic, records no echo, creates parents, restores mtimeMs; mkdir is recursive and
// idempotent; remove tolerates absence and records no echo; host() throws when unbound.
```

```ts
// src/engine/posixPath.ts (new) + posixPath.test.ts — pure; matches node:path.posix on every case tested
export function join(...segs: string[]): string
export function dirname(p: string): string
export function basename(p: string, ext?: string): string
export function extname(p: string): string
export function relative(from: string, to: string): string
export function isAbsolute(p: string): boolean
export function normalize(p: string): string
```

```ts
// src/engine/sha256.ts (new) + sha256.test.ts — pure and synchronous, the one hash in the engine: adoptedId (hot, synchronous read
// paths) and the sync base record (file bytes) both use it; tested equal to node:crypto on 6 vectors for both input kinds
export function sha256Hex(data: string | Uint8Array): string
```

```ts
// src/main/engineHost.ts (new) + engineHost.test.ts
import { setHost, type EngineHost } from '@engine/host'
export const nodeHost: EngineHost   // readFile/readdir(sorted)/stat/write-file-atomic + recordWrite/
                                    // applyRemote = write-file-atomic + utimes + forgetParse, no recordWrite/
                                    // mkdir recursive/rename + recordWrite×2/remove = rmdir for a directory, rm force for a file/serializeOnFile
// stat answers mtimeMs rounded to an integer: APFS stores nanoseconds and utimes takes seconds, so a raw mtimeMs never round-trips
// (measured 09-04-2026: set 1757012345678 → read 1757012345677.999); every mtime the engine compares or ships is integer ms
export function bindNodeHost(): void // setHost(nodeHost); called first thing in src/main/index.ts
// src/main/Testing/setup.ts (new): bindNodeHost() — added to vitest.config.ts setupFiles
```

**Assumed by:** Tasks 7–11 (the sync client reads and writes through it), Task 20 (the Capacitor binding implements the same interface), every Phase 8 move.

**Verify — automated**

- [ ] Red first: `host.test.ts` (unbound `host()` throws), `posixPath.test.ts` (join/relative/dirname/basename/extname/normalize against `node:path.posix` on 30 cases including `..`, trailing slashes, root, empty), `sha256.test.ts`, `engineHost.test.ts` (readDir sorted; `applyRemote` with `mtimeMs` 1757012345678 then `stat` answers exactly 1757012345678; records no echo — `isRecentWrite` false after; `writeText` records — true after; `remove` on absent resolves, on an empty directory resolves, on a non-empty directory rejects). Expect module-not-found, then green.
- [ ] `npm run typecheck:engine` green; a probe file `src/engine/probe.ts` containing `import 'node:fs'` fails `typecheck:engine` and is deleted before commit.
- [ ] Full gate green; test files 318 + 4 new, test count 3,981 + new.
- [ ] `rg -F "@engine" tsconfig.node.json tsconfig.engine.json electron.vite.config.ts vitest.config.ts vite.config.ts` → 5. Control: `rg -F "@shared" vitest.config.ts` → 1.

**Verify — user**

- [ ] *(none — nothing user-visible ships here.)*

#### Gate 1 — the seam exists, nothing moved

- [ ] Gate commands green, exit codes read directly; 318 + 4 test files, 3,981 + new tests, every original test unchanged in body.
- [ ] `rg -n "from 'node:" src/engine -g '!*.test.ts'` → 0; `npm run typecheck:engine` green with `types: []`.
- [ ] `rg -l "@engine" src/main` → 1 (`index.ts`'s `bindNodeHost`). Control: `rg -l "@shared/result" src/main | wc -l` → 48.
- [ ] Simplification and review dispatched against `<base>..HEAD` scoped to `src/engine`, `src/main/index.ts`, `src/main/Testing`, the tsconfigs and configs; the reports cite files inside it.
- [ ] Every concern fixed, or carrying an explicit user ruling recorded in the Log.
- [ ] Progress hashes filled in; line count reported. Not a declared stop: Phase 2 opens.

---

### Phase 2 — Pommora Sync, the server

Additive. Budget: about +900 lines of server (router, db, auth, Nexus', items, feed, env) and +600 of tests. Built-ins only; no framework, no ORM, no dependency.

#### Task 2: The wire contract

**Requirement:** 3, 4

**Why:** The server and both clients must agree on one set of shapes; a type file in `src/shared` is the one place, importable by the engine and by the server through a relative path.

**Now** — `—` (no sync types exist; `src/shared/result.ts` holds the `Result` envelope the client reuses).

**Becomes**

```ts
// src/shared/syncProtocol.ts (new; types and constants only)
export const SYNC_PROTOCOL = 1
export const MAX_ITEM_BYTES = 50 * 1024 * 1024
export const KDF_ITERATIONS_MIN = 600_000
export interface NexusInfo {
  id: string                      // the Nexus id from nexus.json
  name: string                    // the folder's name at creation; the phone's Documents/<name>
  protocol: typeof SYNC_PROTOCOL
  kdf: { name: 'PBKDF2-HMAC-SHA256'; iterations: number; salt: string }   // salt base64, 16 bytes
  keys: { keyId: string; iv: string; wrapped: string }[]                   // base64; one entry per recipient key
  retentionDays: number           // plaintext: the server prunes by it
  infoVersion: number             // the server's precondition for PUT
}
export interface ItemRecord { itemId: string; version: number; mtimeMs: number; size: number; deleted: boolean }   // mtimeMs is always an integer
export interface ChangesPage { changes: ItemRecord[]; cursor: number; hasMore: boolean }
export interface VersionRow extends ItemRecord { head: boolean; storedAt: number }
export interface Session { token: string; deviceId: string; email: string }
export interface AccountFields { server: string; email: string; deviceName: string }
export interface AccountStatus extends AccountFields { signedIn: boolean }
export interface SyncStatus { state: 'off' | 'idle' | 'syncing' | 'error'; nexusId: string | null; lastSync: number | null; error?: string; pending: number }
export interface SyncReport { pulled: number; pushed: number; tombstoned: number; conflicts: { rel: string; kept: 'local' | 'remote' }[]; skipped: { rel: string; why: 'too-large' | 'decrypt' | 'case-collision' | 'invalid-path' }[]; cursor: number }
export type SyncErrorCode = 'unauthorized' | 'not-found' | 'conflict' | 'resync' | 'too-large' | 'exists' | 'signup-closed' | 'bad-request'
export const STATUS_BY_CODE: Readonly<Record<SyncErrorCode, number>>   // 401 · 404 · 409 · 409 · 413 · 409 · 403 · 400 — the server answers by it, the client inverts it once
// Blob endpoints carry bytes, not JSON: PUT /nexus/:id/items/:itemId with headers X-Base-Version (number or 'none'),
// X-Mtime, X-Deleted (0|1), X-Retain-Only (0|1); body = IV || ciphertext || tag. GET answers the same headers plus X-Version.
// Since 409 serves three codes, every error body is { code: SyncErrorCode, message } and the client reads the code, not the status.
```

**Assumed by:** Tasks 3–11, 13, 14, 22.

**Verify — automated**

- [ ] `npm run typecheck` green (the engine, node, and sync projects all include `src/shared`); `syncProtocol.test.ts` asserts `STATUS_BY_CODE` covers every code.

**Verify — user**

- [ ] *(none.)*

#### Task 3: The server scaffold, its database, and its environment

**Requirement:** 3

**Why:** One process, one SQLite file, one `DATA_DIR`; everything the routes need exists before a route does.

**Now** — `—` (`Pommora/Sync` does not exist). `src/main/Database/driver.ts:23-38` is the SQLite pattern to mirror (WAL pragma once, errcode surfaced).

**Becomes**

```
Sync/
  package.json          { "name": "pommora-sync", "private": true, "type": "module", "engines": { "node": ">=24.15" },
                          "scripts": { "start": "node src/index.ts" } }   — no dependencies
  .env-sample           DATA_DIR=./data  PORT=8642  SIGNUP=open
  Dockerfile            built from Pommora/ as its context (`docker build -f Sync/Dockerfile -t pommora-sync .`) so the shared protocol module is inside it:
                        multistage node:24-slim, tini, non-root `node`, COPY Sync/package.json and Sync/src → /app/Sync, src/shared/{syncProtocol,result}.ts → /app/src/shared, WORKDIR /app/Sync, CMD ["node","src/index.ts"]
  src/index.ts          reads env, opens the db, listens
  src/env.ts            parseEnv(process.env, defaults) → { dataDir, port, signup: 'open'|'closed' }; a non-numeric number throws
  src/db.ts             openDb(path): DatabaseSync with WAL, busy timeout 5000, limits.length 64 MiB; applySchema (additive, version row); transaction(fn) = BEGIN IMMEDIATE … COMMIT, ROLLBACK on throw
  src/http.ts           route table, JSON body reader and bytes body reader both capped at MAX_ITEM_BYTES, CORS (reflect Origin, preflight, max-age 86400), errors answered through STATUS_BY_CODE
  src/app.ts            createApp(db, env) → the request handler (what tests import); index.ts wraps it in http.createServer
```

```sql
-- src/db.ts DDL
CREATE TABLE IF NOT EXISTS meta (key TEXT PRIMARY KEY, value TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS users (id TEXT PRIMARY KEY, email TEXT UNIQUE NOT NULL, scrypt TEXT NOT NULL, created_at INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS tokens (token TEXT PRIMARY KEY, user_id TEXT NOT NULL, device_id TEXT NOT NULL, device_name TEXT NOT NULL, created_at INTEGER NOT NULL, revoked INTEGER NOT NULL DEFAULT 0);
CREATE TABLE IF NOT EXISTS nexus (id TEXT PRIMARY KEY, user_id TEXT NOT NULL, name TEXT NOT NULL, info TEXT NOT NULL, info_version INTEGER NOT NULL, seq INTEGER NOT NULL DEFAULT 0, created_at INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS items (nexus_id TEXT NOT NULL, item_id TEXT NOT NULL, version INTEGER NOT NULL, mtime_ms INTEGER NOT NULL, size INTEGER NOT NULL, deleted INTEGER NOT NULL, PRIMARY KEY (nexus_id, item_id));
CREATE INDEX IF NOT EXISTS items_by_version ON items (nexus_id, version);
CREATE TABLE IF NOT EXISTS versions (nexus_id TEXT NOT NULL, item_id TEXT NOT NULL, version INTEGER NOT NULL, mtime_ms INTEGER NOT NULL, size INTEGER NOT NULL, deleted INTEGER NOT NULL, head INTEGER NOT NULL, stored_at INTEGER NOT NULL, blob BLOB, PRIMARY KEY (nexus_id, item_id, version));
-- a tombstone row has blob NULL; a retain-only row has head 0 and never appears in the change feed
```

```json
// tsconfig.sync.json (new): module NodeNext, moduleResolution NodeNext, types ["node"], allowImportingTsExtensions, erasableSyntaxOnly,
// noEmit, strict; include ["Sync/src/**/*", "src/shared/syncProtocol.ts", "src/shared/result.ts"] — the server's own files use relative `.ts` specifiers only;
// the integration test lives in src/engine (Task 11) under the node project, which gains allowImportingTsExtensions so it may import Sync/src/app.ts
// package.json (root): "typecheck:sync": "tsc --noEmit -p tsconfig.sync.json"; typecheck runs it; "dev:sync": "node Sync/src/index.ts"
// vitest.config.ts include gains 'Sync/src/**/*.test.ts'
```

**Assumed by:** Tasks 4–6, 11.

**Verify — automated**

- [ ] Red first: `env.test.ts` (defaults, override, non-numeric throws), `db.test.ts` (schema applies twice idempotently; `PRAGMA journal_mode` answers `wal`; meta holds `schema_version` 1), `http.test.ts` (a body over the cap answers 413 `too-large` and the socket is not left half-read; preflight from `capacitor://localhost` answers the reflected origin, `Authorization, Content-Type`, and `GET, PUT, POST, DELETE, OPTIONS`; an unknown route 404). Expect module-not-found, then green.
- [ ] `node Sync/src/index.ts` with `DATA_DIR=/tmp/pommora-scratch/s` starts and answers `GET /health` 200 `{ ok: true }`; stopped with SIGTERM and exits 0.
- [ ] `db.test.ts` gains: a `transaction` whose body throws leaves no row behind.
- [ ] If Docker is present: `docker build -f Sync/Dockerfile -t pommora-sync .` from `Pommora/`, then `docker run --rm -e DATA_DIR=/data -p 8642:8642 pommora-sync` answers `curl localhost:8642/health` 200 (the build alone proves nothing about the shared module). Otherwise recorded as skipped in the Log with the reason.
- [ ] Full gate green; `npm run typecheck:sync` green.

**Verify — user**

- [ ] *(none.)*

#### Task 4: Accounts and device tokens

**Requirement:** 3

**Why:** Email and password on Nathan's own server, a revocable token per device, and every Nexus request checked against its owner (C-10, G-2).

**Now** — `—`.

**Becomes**

```ts
// Sync/src/auth.ts + auth.test.ts
// POST /auth/register {email,password,deviceName} → 201 Session | 403 signup-closed | 409 exists
// POST /auth/login    {email,password,deviceName} → 200 Session | 401 unauthorized
// POST /auth/logout   (Bearer) → 204; the token row is revoked
export function hashPassword(password: string): string      // scrypt N=2^17 r=8 p=1, 16-byte salt, `scrypt$<salt>$<hash>` base64
export function verifyPassword(password: string, stored: string): boolean   // timingSafeEqual
export function requireSession(db, req): { userId: string; deviceId: string }  // throws unauthorized; every /nexus route calls it
// tokens and device ids are 32 random bytes, base64url; email is trimmed and lower-cased; password NFKC-normalized before scrypt
```

**Verify — automated**

- [ ] Red first: register → login; wrong password 401; second register 409; `SIGNUP=closed` 403; logout revokes (the next Nexus call 401); a Nexus route without Bearer 401. Then green.
- [ ] Full gate green.

**Verify — user**

- [ ] *(none.)*

#### Task 5: Nexus', items, versions, and the change log

**Requirement:** 3

**Why:** The sequence that is both version and cursor, the store precondition that returns the server's record, the tombstone that keeps its history, the retain-only version that holds a conflict loser, and the prune that never touches a head (F-1, F-4, F-5, C-11).

**Now** — `—`.

**Becomes**

```ts
// Sync/src/nexus.ts + nexus.test.ts, Sync/src/items.ts + items.test.ts
// GET    /nexus                          → { nexus: { id, name, createdAt }[] } (the caller's)
// POST   /nexus        NexusInfo         → 201 NexusInfo | 409 exists (create-once; Connect is the client's answer)
// GET    /nexus/:id/info                 → NexusInfo
// PUT    /nexus/:id/info { retentionDays?, keys? } + X-Info-Version → 200 NexusInfo | 409 conflict   (the desktop keeps retentionDays equal to the Nexus's History Timeframe, Task 13)
// GET    /nexus/:id/changes?since=N&limit=500 → ChangesPage read from `items` (heads only, tombstones included at every since, so a snapshot is self-sufficient); since > seq → 409 resync;
//        cursor = the highest version in the page, or `since` when the page is empty (retain-only seqs never appear in items, so the cursor never claims them)
// PUT    /nexus/:id/items/:itemId  (headers of Task 2; the body is read whole, capped, before the database block)
//        one transaction: base mismatch → 409 { current: ItemRecord }; base 'none' with an existing item → 409 likewise; a base given for an item the Nexus never held → 404 not-found;
//        seq += 1 always; retain-only → versions row at that seq with head 0, items untouched, 201 { version } (invisible to changes by construction: changes reads items);
//        else items head replaced at version = seq, versions row head 1, the prior head row's head flag cleared; tombstone = deleted 1, blob NULL; answers { version } and never content
// GET    /nexus/:id/items/:itemId                → head blob + headers; a tombstone answers 404 not-found
// GET    /nexus/:id/items/:itemId/versions       → { versions: VersionRow[] } newest first
// GET    /nexus/:id/items/:itemId/versions/:v    → that blob + headers
// prune: after every store, DELETE FROM versions WHERE nexus_id=? AND head=0 AND deleted=0 AND stored_at < now - retentionDays*86400000
// every route: requireSession, then the Nexus's user_id must equal the session's; else 404 (never 403: a foreign id is not confirmed to exist)
```

**Assumed by:** Tasks 9–11, 13, 16, 22.

**Verify — automated**

- [ ] Red first, each named: create-once (second POST 409); PUT info with a stale `X-Info-Version` → 409 and with the current one bumps it; a store with base `none` creates version 1; a second store with base 1 gives 2; base 1 again → 409 carrying `{version: 2}`; changes since 0 lists the item once at 2 and lists a tombstoned item as deleted; since 1 includes the tombstone; since 99 → 409 resync; two retain-only stores on one item land two versions rows at two fresh seqs the change log never lists and the versions route does, and the head is unmoved; a body of `MAX_ITEM_BYTES + 1` → 413 (client-side skipping is Task 10's; this is the wire's own guard); prune with `retentionDays: 0` deletes only non-head non-tombstone rows (a head and a tombstone survive); a store whose transaction throws after `seq += 1` leaves seq, items, and versions as they were; a store with base 3 for an item never stored → 404; after a retain-only store, `changes?since=<cursor>` answers an empty page with the cursor unmoved; a Nexus of another user → 404; paging with `limit=2` over 5 changes walks three pages with `hasMore` flipping on the last. Then green.
- [ ] Both halves of the ownership guard: the owner's read succeeds; with `requireSession` stubbed to another user the same read is 404.
- [ ] Full gate green.

**Verify — user**

- [ ] *(none.)*

#### Task 6: The change feed and the container

**Requirement:** 3

**Why:** Live updates (C-7) need the server to tell connected devices a sequence moved; Server-Sent Events over `node:http` is the one transport both `fetch` runtimes stream without a library. The container is how the server reaches an always-on host.

**Now** — `—`.

**Becomes**

```ts
// Sync/src/feed.ts + feed.test.ts
// GET /nexus/:id/feed  (Bearer; text/event-stream) → an initial `event: seq\ndata: {"seq":N}\n\n`, then one per store to that Nexus,
// a `: keepalive` comment every 25 s; subscribers held per Nexus in a Map<nexusId, Set<ServerResponse>>, removed on close
export function publish(nexusId: string, seq: number): void   // items.ts calls it after every store's commit
```

`Sync/Dockerfile`, `Sync/.env-sample`, `Sync/README.md` (run locally, run the container: `docker run --env-file .env -v pommora-sync:/data -p 8642:8642 pommora-sync`; TLS at a reverse proxy).

**Verify — automated**

- [ ] Red first: two subscribers on one Nexus both receive the seq of a store within 200 ms; a subscriber on another Nexus receives nothing; a closed response is removed (the Set shrinks). Then green.
- [ ] `curl -N` against the running server shows the initial event and one per store.
- [ ] Full gate green.

**Verify — user**

- [ ] *(none.)*

#### Gate 2 — a server that keeps every promise the protocol makes

- [ ] Gate commands green; `typecheck:sync` in the gate.
- [ ] Simplification and review dispatched against `<base>..HEAD` scoped to `Sync/`, `src/shared/syncProtocol.ts`, the configs; the reports cite files inside it.
- [ ] Every concern fixed, or carrying a ruling in the Log.
- [ ] Progress hashes filled in; line count reported.
- [ ] Not a declared stop: Phase 3 opens.

---

### Phase 3 — The sync client in the engine

Additive. Budget: about +1,100 lines (crypto 200, manifest 80, state 80, transport 200, client 450, CLI 90) and +900 of tests including the integration suite.

#### Task 7: Nexus cryptography

**Requirement:** 4

**Why:** Ciphertext-only on the server (C-8) with a password change that never re-encrypts (F-2), on the one primitive set both runtimes execute natively (F-3).

**Now** — `—` (`ids.ts` is the only hashing in the tree).

**Becomes**

```ts
// src/engine/Sync/crypto.ts + crypto.test.ts — Web Crypto only (`crypto.subtle`, `crypto.getRandomValues`)
export function deriveKek(password: string, salt: Uint8Array, iterations: number): Promise<CryptoKey>  // NFKC first; PBKDF2-HMAC-SHA256 → AES-GCM 256, wrap/unwrap only
export function mintNexusKey(): Uint8Array                                                              // 32 random bytes
export function wrapNexusKey(kek: CryptoKey, nexusKey: Uint8Array): Promise<{ keyId: string; iv: string; wrapped: string }>
export function unwrapNexusKey(kek: CryptoKey, entry: NexusInfo['keys'][number]): Promise<Uint8Array | null>   // null = wrong password (the GCM tag)
export interface NexusKeys { keyId: string; content: CryptoKey; path: CryptoKey }                       // HKDF-SHA256 subkeys, info 'pommora/content' and 'pommora/path'
export function subkeys(nexusKey: Uint8Array, keyId: string): Promise<NexusKeys>
export function itemId(keys: NexusKeys, rel: string): Promise<string>                                   // HMAC-SHA256 over NFC(rel), hex; case preserved
export function seal(keys: NexusKeys, item: { itemId: string; mtimeMs: number; rel: string; bytes: Uint8Array }): Promise<Uint8Array>
export function open(keys: NexusKeys, item: { itemId: string; mtimeMs: number }, blob: Uint8Array): Promise<{ rel: string; bytes: Uint8Array } | null>
// blob = iv(12) || AES-256-GCM( u16 relLen || rel utf8 || bytes ) with AAD = `${SYNC_PROTOCOL}|${keyId}|${itemId}|${mtimeMs}`; null on any tag failure
export function newNexusInfo(id: string, name: string, password: string, retentionDays: number): Promise<{ info: Omit<NexusInfo, 'infoVersion'>; nexusKey: Uint8Array }>
```

**Assumed by:** Tasks 10, 11, 13, 16, 22.

**Verify — automated**

- [ ] Red first: round trip; wrong password → `unwrapNexusKey` null; a flipped byte in the blob → `open` null; the same blob under another `itemId` or another `mtimeMs` → null (the AAD binding); `itemId` equal for `'A/B.md'` on two calls and different for `'a/b.md'`; the password `'é'` composed and decomposed derive the same key; iterations below `KDF_ITERATIONS_MIN` refused by `newNexusInfo`; `deriveKek` at 600,000 iterations completes under 500 ms on this machine (a floor, not a benchmark). Then green.
- [ ] Full gate green.

**Verify — user**

- [ ] *(none.)*

#### Task 8: The sync manifest

**Requirement:** 4

**Why:** What syncs is a rule stated once (C-4, J-2): every non-hidden entry plus `.nexus` and `.trash`, minus the store files. It is its own walk because the tree walk never enters `.trash`.

**Now** — `src/engine/exclusion.ts` `neverWatched(seg)` is the one rule for a segment Pommora never delivers (`.trash`, `node_modules`, a store or its journal, any dot-name but `.nexus`); `IO/walk.ts` `corpusFilesUnder` is the hand-descent pattern:

```ts
// src/engine/exclusion.ts:12-19 (post-move)
export function neverWatched(seg: string): boolean {
  return seg === TRASH_DIR || seg === 'node_modules' || STORE_FILE.test(seg) || (seg.startsWith('.') && seg !== NEXUS_DIR)
}
```

**Becomes** — the manifest is that rule with one exception, a top-level `.trash`; `node_modules` therefore stays home, which C-4's "every non-hidden entry" did not say (Deviation):

```ts
// src/engine/Sync/manifest.ts + manifest.test.ts
export interface ManifestEntry { rel: string; mtimeMs: number; size: number }
export const syncable = (segs: readonly string[]): boolean =>
  segs.every((s, i) => (i === 0 && s === TRASH_DIR) || !neverWatched(s))
export async function syncManifest(root: string): Promise<Map<string, ManifestEntry>>   // host().readDir per directory, name-sorted, rel POSIX, mtimeMs integer
```

**Verify — automated**

- [ ] Red first, over a fixture root: `.trash/X/2026__A.md.deleted/A.md` present; `Ideas/.trash/x.md` absent; `.nexus/nexus.db`, `-wal`, `-shm`, `versions.db` absent; `.obsidian/app.json`, `.git/HEAD`, `.DS_Store`, `Ideas/.DS_Store`, `node_modules/x` absent; `_pagecollection.json` present; `.nexus/assets/<id>/thumbnails/x.jpg` present; the map's iteration order is sorted. Then green.
- [ ] Over the scratch NexusOS copy: the manifest count equals `find` with the same exclusions (re-derived that day), and `syncManifest` completes under 400 ms on this machine (J-2's budget for the whole no-change sync is one second).
- [ ] Full gate green.

**Verify — user**

- [ ] *(none.)*

#### Task 9: Sync state and the transport

**Requirement:** 4

**Why:** The base each item was last synced at is what detection compares against (F-6), and the cursor persists only after a page applied (F-4); both live behind one store interface each host implements. The transport is `fetch` plus a streamed feed, the same code on both hosts.

**Now** — `—`; `src/main/Database/localState.ts` `readScope`/`writeKey` is the desktop store the interface fits.

**Becomes**

```ts
// src/engine/Sync/state.ts + state.test.ts
export type BaseRecord =
  | { itemId: string; version: number; mtimeMs: number; size: number; hash: string }
  | { itemId: string; version: number; deleted: true }                       // after a tombstone pushed or landed; the version is what the next store builds on
// mtimeMs and size are the DISK's: after a landing, host().stat after applyRemote; after a push, the manifest entry whose bytes were hashed.
// The envelope's mtime lives on the server record and never here. hash = sha256Hex(bytes) at that moment.
export interface SyncStateStore {
  cursor(): Promise<number>
  setCursor(seq: number): Promise<void>
  bases(): Promise<Map<string, BaseRecord>>          // rel → record
  setBase(rel: string, rec: BaseRecord | null): Promise<void>
  flush(): Promise<void>                              // called after every applied page
}
export function memoryStore(): SyncStateStore
// src/engine/Sync/transport.ts + transport.test.ts (fake fetch)
export interface Transport {
  register / login / logout
  nexus(): Promise<{ id; name; createdAt }[]>
  createNexus(info): Promise<NexusInfo>              // 409 exists surfaces as { code: 'exists' }
  info(nexusId): Promise<NexusInfo>
  updateInfo(nexusId, patch: { retentionDays?: number; keys?: NexusInfo['keys'] }, infoVersion: number): Promise<NexusInfo>
  changes(nexusId, since, limit): Promise<ChangesPage>   // 409 → { code: 'resync' }
  store(nexusId, itemId, blob: Uint8Array | null, meta: { baseVersion: number | null; mtimeMs; deleted; retainOnly }): Promise<{ version: number } | { conflict: ItemRecord }>
  fetchItem(nexusId, itemId, version?): Promise<{ blob: Uint8Array; record: ItemRecord } | null>
  versions(nexusId, itemId): Promise<VersionRow[]>
  feed(nexusId, onSeq: (seq: number) => void, signal: AbortSignal): Promise<void>   // reconnects with backoff 1s→30s until aborted
}
export function httpTransport(server: string, token: () => string | null, fetchImpl?: typeof fetch): Transport
export class SyncError extends Error { code: SyncErrorCode }
```

**Assumed by:** Tasks 10, 13, 22.

**Verify — automated**

- [ ] Red first: `memoryStore` round trips; `httpTransport` builds the exact headers of Task 2 (asserted through the fake fetch), reads the error body's `code` into `SyncError` for every member of `STATUS_BY_CODE`, parses `changes`, and `feed` parses two SSE events from a streamed body then reconnects once after the stream ends and stops on abort. Then green.
- [ ] Full gate green.

**Verify — user**

- [ ] *(none.)*

#### Task 10: The sync run

**Requirement:** 4

**Why:** Pull, then detect, then push, with the conflict rule, loser retention, per-item apply, per-page cursor persistence, resync, case-fold refusal, the size cap, and a report — the whole of C-2..C-7, F-4..F-9, J-1 in one module every host drives the same way.

**Now** — `—`; `src/engine/CRUD/util.ts` `invalidName` is the per-segment rule F-8 reuses; `src/engine/paths.ts` (Task 31) gains `safeRel(rel: string): boolean` here — no empty, `.`, or `..` segment, no leading `/`, `invalidName` false for every segment — the one rule the landing and the phone's mutations (Task 38) share.

**Becomes**

```ts
// src/engine/Sync/client.ts + client.test.ts (memory host: a Map-backed EngineHost in src/engine/Testing/memoryHost.ts)
export interface SyncDeps {
  root: string
  transport: Transport
  nexusId: string
  keys: NexusKeys
  state: SyncStateStore
  deviceId: string
  /** The host's policy before a remote version replaces a local file — desktop captures file history here. */
  beforeReplace?: (abs: string, rel: string) => Promise<void>
  /** The host's policy after a landing — the phone patches its tree; the desktop lets its watcher classify. */
  afterLanding?: (rel: string, kind: 'upsert' | 'remove') => Promise<void>
  /** Rels the host wrote since the last run, drained per run and hashed regardless of (mtime, size): a rewrite that keeps both
   *  (`rewritePreservingTimes` — a rename cascade, an option rename, a sweep) is invisible to the gate. */
  forceHash?: () => Set<string>
}
export async function runSync(deps: SyncDeps): Promise<SyncReport>      // SyncReport from @shared/syncProtocol
// Never concurrent per root: a second call while one runs queues once and coalesces (F-9).
export interface SyncScheduler { noteDirty(): void; trigger(): void; stop(): Promise<void> }
export function createSyncScheduler(run: () => Promise<SyncReport>, opts?: { debounceMs?: number; sweepMs?: number }): SyncScheduler   // KNOB defaults 1500 and 30000
// noteDirty debounces; trigger runs at once (a feed seq, Sync Now); a run that ended dirty re-runs; the sweep is a periodic noteDirty so an outside edit
// the desktop watcher never delivers (the user's excluded folders, `.trash`, any dot-folder) still pushes within the sweep; both hosts drive this
// Pull: for each page: for each change in sequence: own echo (base.version === change.version) → skip; tombstone → conflict rule vs local
//   (absent locally → base set deleted; a local change since base — or, with NO BASE, a file whose disk mtime is newer than the tombstone's — wins and is re-pushed;
//   else beforeReplace, remove, base set deleted);
//   else fetch + open (null → skipped 'decrypt'); rel validated by safeRel (else 'invalid-path');
//   a second item landing on a case-folded rel already held → 'case-collision', refused; local unchanged since base → land;
//   local changed → newer mtime wins, ties by deviceId order; the loser is stored retain-only (never a file beside the winner);
//   NO BASE and the file present locally (a fresh connect over a populated root, a resync): equal hash → seed the base, no write; else the same conflict rule;
//   land = lock(abs) { beforeReplace; host.applyRemote(abs, bytes, mtimeMs) }; base set from host().stat after the write; afterLanding.
//   After the page: prune directories emptied by removals (never root, never `.nexus`, `.trash`); setCursor(page.cursor); flush.
// Detect: manifest vs bases; new, (mtime, size) moved, or named by forceHash → hash; hash moved → changed; a live base absent from the manifest → deleted; a deleted base stays deleted.
// Push: store(base.version ?? null); a `not-found` on a given base reads as no base (the Nexus never held it) and re-stores with null; conflict → the returned record's
//   `deleted` decides whether there is a blob to fetch, then the same rule, then re-store or land. After a successful store the base takes the manifest entry it hashed
//   (mtime, size, hash) and the answered version; a tombstone store sets the deleted form. A post-store stat that no longer matches the entry leaves the base unset, so the next run re-detects.
//   Over MAX_ITEM_BYTES → skipped 'too-large' before any request. First sync rules (F-7) fall out: an empty remote pushes everything, an empty local pulls everything,
//   both populated merge item by item under the no-base rule above.
// Resync: 'resync' clears the cursor and pulls since 0 (tombstones included) under the same rules; identical content is a no-op, a delete for an absent file is a no-op.
// A page deleted while a device was disconnected from its Nexus is indistinguishable from one another device created: the deletion never pushed, so the file returns
// on reconnect and its trash bundle stands beside it. Disconnect therefore keeps the device's bases and cursor (Task 14) so reconnecting to the same Nexus resumes.
```

**Assumed by:** Tasks 11, 13, 22.

**Verify — automated**

- [ ] Red first, each a named case over two memory hosts and a fake transport: own echo skipped; landing's base equals the host's stat after the write; a no-base landing over an identical local file seeds the base and writes nothing; a no-base landing over a differing local file runs the conflict rule; a no-base tombstone over a newer local file re-pushes and over an older one removes; a rel in `forceHash` whose bytes changed under an unmoved (mtime, size) pushes; a save landing between hash and store (the fake host moves the file mid-run) leaves the base unset and the next run pushes the new bytes; a deleted base then a restore at the same path pushes with the deleted base's version and a `not-found` conflict re-stores with null; conflict both-changed newer wins, loser stored retain-only (the fake transport records it) and never written as a sibling file; equal mtime resolved by deviceId on both sides identically; edit-vs-tombstone both directions; a deleted folder's files removed and the empty folder pruned only after the page (a page and its sidecar landing in one page keep the folder); cursor persisted once per page and not on a thrown apply mid-page; resync clears the cursor and lands nothing identical; case collision refused with a report; `../x.md` and `bad|name.md` refused; 50 MB + 1 skipped; a no-change run makes zero `store` calls; two concurrent `runSync` calls coalesce to two runs, never interleaved; the scheduler runs once for three `noteDirty` calls inside the window, re-runs once when a `noteDirty` lands mid-run, and runs on the sweep with fake timers. Then green.
- [ ] Both halves of the containment guard: a good rel lands (file exists after), and with the validator disabled the `../` case would have written outside root (asserted through the memory host's key set).
- [ ] Full gate green.

**Verify — user**

- [ ] *(none.)*

#### Task 11: The integration suite, the headless client, and the fixture

**Requirement:** 4, 7

**Why:** Nathan's requirement: proof that two roots converge through the real server, runnable under `npm run test`, plus a CLI that stands in for a second device against any folder so a phone is never the only way to exercise the client.

**Now** — `—`; `src/main/engineHost.ts` (Task 1) is the Node binding the CLI reuses; `vitest.config.ts` includes `Sync/src/**/*.test.ts` (Task 3).

**Becomes**

```ts
// src/engine/Sync/e2e.test.ts — imports createApp through '../../../Sync/src/app.ts' (the node project types it; Task 3) and the client beside it
// Sync/test/fixture/  a 14-file Nexus: .nexus/{nexus.json,settings.json,properties.json,contexts.json,state.json}, Ideas/{_pagecollection.json,A.md,B.md},
//                      Ideas/Set/{_pageset.json,C.md}, .trash/Ideas/2026-01-01T00-00-00-000Z__D.md.deleted/{D.md,_record.json}, .nexus/assets/pic.png, .nexus/nexus.db (excluded)
export async function diffRoots(a: string, b: string): Promise<{ onlyA: string[]; onlyB: string[]; differ: string[] }>   // Sync/test/diffRoots.ts; manifests + sha-256 per file
// scenarios, each its own `it`, in this order, two temp roots A and B, one server on an ephemeral port with DATA_DIR in a temp dir:
//  1 A creates the Nexus from the fixture (empty remote takes everything); 2 B connects with the same password and pulls; diffRoots clean
//  3 edit A/Ideas/A.md → sync A → sync B → B holds it, mtime equal; 4 create B/Ideas/New.md → B → A; 5 delete A/Ideas/B.md (move into .trash bundle) → B removed, bundle present
//  6 rename A/Ideas/C.md → A/Ideas/C2.md → B (tombstone + new; id inside the file unchanged); 7 frontmatter edit → crosses; 8 settings.json edit → crosses
//  9 both edit A.md before syncing; the newer mtime stands on both, the server lists 2 versions, the loser's text is the retain-only blob
// 10 A edits, B deletes, A newer → the file revives on B; 11 B offline (no sync) while A makes 3 edits → B syncs once → holds all 3
// 12 B's cursor set to 999 → resync → clean; 13 feed: B subscribes; A stores; B's onSeq fires within 1,000 ms; 14 a no-change sync on both makes 0 stores (server request log)
// 15 B disconnects, deletes Ideas/A.md into its trash, reconnects to the same Nexus → the deletion pushes (bases kept), A loses the page and gains the bundle
// 16 B's bases wiped (a fresh device over a populated copy of A) → connect → zero writes on B, zero stores, every base seeded; then B edits one page → one store
// 17 A deletes Ideas/A.md into its trash → B (with A.md open in its editor, no sync yet) restores it from the bundle on A → the page pushes with the deleted base's version and both roots hold it
// 18 A renames a page whose inbound link text is the same length (`rewritePreservingTimes` on the linking page) → the linking page reaches B with the new link text
// (wrong password, case collision, and the 50 MB skip are client-only and stay in Tasks 7 and 10; the server's 413 is http.test.ts)
// scripts/sync-cli.ts + vite.config.cli.ts (ssr build to out/cli/sync-cli.js; "build:cli" script)
//   node out/cli/sync-cli.js register|login|create|connect|sync|watch --server URL --root DIR --state FILE [--email --password --nexus-password --nexus ID --name NAME]
//   `watch` subscribes to the feed and syncs on every seq plus every 30 s; state is a JSON SyncStateStore at --state
```

**Assumed by:** Tasks 25, 26.

**Verify — automated**

- [ ] The 18 scenarios green under `npm run test`, each red first against a stub `runSync` that does nothing (one commit before the real client is wired proves the assertions bite).
- [ ] `npm run typecheck` green with the test under the node project (`tsconfig.node.json` gains `allowImportingTsExtensions`; `typecheck:sync` never sees it).
- [ ] `npm run build:cli` green; `node out/cli/sync-cli.js sync --root <fixture copy> …` against a running server pushes 14 items and a second run pushes 0.
- [ ] Full gate green.

**Verify — user**

- [ ] *(none.)*

#### Gate 3 — two roots converge

- [ ] Gate commands green.
- [ ] Simplification and review dispatched against `<base>..HEAD` scoped to `src/engine/Sync`, `Sync/test`, `scripts/`, `vite.config.cli.ts`, `tsconfig.node.json`; the reports cite files inside it.
- [ ] Every concern fixed, or carrying a ruling in the Log.
- [ ] Progress hashes filled in; line count reported.
- [ ] Not a declared stop: Phase 4 opens.

---

### Phase 4 — The desktop client

Additive plus user-visible. Budget: about +700 lines (desktopSync 250, channels 150, Settings rows 200, secrets 40, history merge 60).

#### Task 12: The write funnel listener, the sync scope, and the secret seam

**Requirement:** 5

**Why:** The watcher never sees the app's own writes, so the push trigger listens where every in-app write already reports (C-7); sync state is a `local_state` scope (H-2); the device token and Nexus password never touch a plaintext file (F-3).

**Now** — `src/main/IO/writeEcho.ts` 9 importers; `Scope` union in `Database/localState.ts:14-31` has 17 members; `appConfig.ts` `AppConfig { lastNexusPath?, recents?, trashMode? }`; `rg -n "safeStorage" src/main` → 0; `rg -n "POMMORA_" src/main` → 1 (`index.ts:201`, `POMMORA_DEBUG_PORT`); `app.getPath('userData')` at `index.ts:448,695,1902,2029` with no override:

```ts
// src/main/IO/writeEcho.ts:17-23
export function recordWrite(absPath: string): void {
  recent.set(absPath, Date.now())
```

**Becomes**

```ts
// src/main/IO/writeEcho.ts
const listeners = new Set<(absPath: string) => void>()
export function onWrite(fn: (absPath: string) => void): () => void
export function recordWrite(absPath: string): void   // notifies after recording
// src/shared/localState.ts — Scope gains 'sync' (keys: `<nexusId>` = cursor, `<nexusId>/<rel>` = BaseRecord, so a Nexus that has connected to two Nexus' holds both and a reconnect resumes the right one); SCOPE_ASKS has no entry for it (never a renderer channel)
// src/main/Sync/localStateStore.ts — localStateStore(nexusId): SyncStateStore over readScope/writeKey('sync') filtered by the Nexus prefix; flush is a no-op (rows are immediate)
// src/main/appConfig.ts — AppConfig gains account?: AccountFields
// src/main/index.ts:201 — beside POMMORA_DEBUG_PORT: `if (process.env.POMMORA_USERDATA) app.setPath('userData', process.env.POMMORA_USERDATA)`
//   (Development-Environment.md:41 describes it as instrumentation to add and remove; it becomes a standing flag, since every scratch run of this arc writes account rows and secrets)
// src/main/Sync/secrets.ts + secrets.test.ts (safeStorage stubbed)
export function saveSecret(userDataDir: string, key: 'token' | `nexus:${string}`, value: string): Promise<void>   // safeStorage.encryptString → <userData>/secrets/<key>
export function readSecret(userDataDir: string, key: string): Promise<string | null>
export function forgetSecret(userDataDir: string, key: string): Promise<void>
```

**Assumed by:** Tasks 13, 14.

**Verify — automated**

- [ ] Red first: `writeEcho.test.ts` (new) — a listener fires with the path on `recordWrite`, unsubscribes; `localStateStore.test.ts` — cursor and bases round trip through a temp `nexus.db`, and two Nexus ids keep separate cursors and bases; `secrets.test.ts` — save/read/forget with a stubbed `safeStorage`. Then green.
- [ ] `env -u ELECTRON_RUN_AS_NODE POMMORA_USERDATA=/tmp/pommora-scratch/userdata ./node_modules/.bin/electron .` after a build writes `pommora.json` under that directory and leaves the real profile's `pommora.json` mtime unchanged.
- [ ] Full gate green.

**Verify — user**

- [ ] *(none.)*

#### Task 13: The desktop sync session

**Requirement:** 5

**Why:** The desktop is a client like the phone (C-1): it pushes on its own writes and on watcher activity, pulls on the feed, and lands remote versions as an outside edit the watcher classifies, with the outgoing text captured first (C-6, C-7, H-4).

**Now** — `src/main/index.ts:374-411` `openNexusSequence` (where a session starts), `:439` `startWatcher`; `CRUD/fileHistory.ts` `captureIfDue(root, pageId, text, 'external')`; `watcher.ts:107` skips recorded writes; `IO/atomicWrite.ts:25-32` the restore-mtime pattern:

```ts
// src/main/CRUD/fileHistory.ts:147-150
export function noteExternalEdit(root: string, absPath: string): void {
  const pageId = liveIdOf(root, absPath)
  if (pageId) void arm(root, pageId, 'external')
}
```

**Becomes**

```ts
// src/main/Sync/desktopSync.ts + desktopSync.test.ts
export function startDesktopSync(root: string, win: BrowserWindow): Promise<void>   // no-op when the Nexus has no connected Nexus or the app has no session
export function stopDesktopSync(): Promise<void>                                     // scheduler.stop(), aborts the feed
export function syncNow(): Promise<SyncReport>
export function syncStatus(): SyncStatus                                             // SyncStatus from @shared/syncProtocol
// one createSyncScheduler per session: onWrite (paths under root that syncable() admits) → the rel joins the forceHash set and noteDirty; the watcher's settle (watcher.ts calls noteSyncActivity(root)) → noteDirty;
//   the feed's onSeq > cursor and Sync Now → trigger; deps.forceHash drains the set per run
// before each run: if the remote Nexus's retentionDays ≠ the local Nexus's historyDays (readFileHistoryConfig) → transport.updateInfo, so the server prunes by the live Timeframe
// deps.beforeReplace: read the current text; liveIdOf → captureIfDue(root, pageId, text, 'external') for a page; nothing for other files
// deps.afterLanding: none — host.applyRemote records no echo, so the watcher classifies the landing as it does an Obsidian edit
//   (`.trash`, `.nexus/homepage/*.md`, `.nexus/contexts/**/*.md` are watcher-ignored: the Trash frame and the block hosts read those on open)
// lock: host().lock is serializeOnFile keyed on the landed absolute path — the same key every in-app writer of that file takes
// status pushes: push(win, 'sync:changed', status) on every transition
```

`src/main/index.ts`: `openNexusSequence` ends with `await startDesktopSync(root, mainWindow)` after `startWatcher`; the root switch awaits `stopDesktopSync()` beside `retireFileHistory` at `index.ts:378-380`, before `openSession` repoints the root, so an in-flight run's bases never land in the next Nexus's `nexus.db`; quit does the same; `watcher.ts` `settle` calls `noteSyncActivity(root)` after its pushes.

**Assumed by:** Tasks 14, 16, 25, 26.

**Verify — automated**

- [ ] Red first: with a fake transport, an in-app `atomicWriteFile` under root schedules a run and the run pushes the file; a `rewritePreservingTimes` of a page to a same-length body pushes it (the gate alone would not see it); a landing over an open page captures the outgoing text (a `versions.db` row with source `external` appears) and the file's integer mtime equals the envelope's; a second sync after a landing re-hashes nothing (spy on `readBytes` → 0 calls for landed files); a landing's watcher event is not echo-suppressed (`isRecentWrite` false for its path); a tombstone landing removes the file and the watcher classifies `page-remove`; a feed seq triggers a run without a debounce; two overlapping triggers produce one run; a History Timeframe of 30 against a Nexus at 60 sends one `updateInfo` before the run and none after. Then green.
- [ ] Both halves of the capture: the row appears with capture enabled; with `beforeReplace` disabled the row does not.
- [ ] Full gate green.

**Verify — user**

- [ ] *(none yet — the surface lands in Task 15.)*

#### Task 14: The account and sync channels

**Requirement:** 5

**Why:** Sign in, create or connect a Nexus, disconnect, sync now, and a live status are the renderer's only view of sync; they go through the bridge like everything else, and the phone serves the same channels in process (D-1, H-3).

**Now** — `src/shared/bridge.ts` `Asks` has no `account:`/`sync:` channel; `Pushes` has 14 members:

```ts
// src/shared/bridge.ts:57-58
export interface Asks {
  // Nexus / session
```

**Becomes**

```ts
// src/shared/bridge.ts — Asks gains
'account:status': { args: []; reply: AccountStatus }                       // from AppConfig.account plus whether a token secret exists
'account:signIn': { args: [req: AccountFields & { password: string; register: boolean }]; reply: Result<AccountStatus> }
'account:signOut': { args: []; reply: Result<null> }
'sync:status': { args: []; reply: SyncStatus }
'sync:nexus': { args: []; reply: Result<{ id: string; name: string; matches: boolean }[]> }   // matches = id equals this Nexus's
'sync:create': { args: [nexusPassword: string]; reply: Result<{ nexusId: string }> }         // 'exists' → the row offers Connect
'sync:connect': { args: [nexusId: string, nexusPassword: string]; reply: Result<null> }       // id mismatch refused with the reason
'sync:disconnect': { args: []; reply: Result<null> }                                          // stops syncing and forgets the Nexus secret; the 'sync' scope (bases, cursor, keyed by Nexus id) and the server's Nexus both stay, so reconnecting resumes
'sync:now': { args: []; reply: Result<SyncReport> }
// Pushes gains 'sync:changed': SyncStatus   (every type from @shared/syncProtocol)
// src/shared/nexusApi.ts gains account: { status, signIn, signOut }, sync: { status, nexus, create, connect, disconnect, now }, onSyncChanged
// src/main/index.ts — handlers in the serveBridge object beside 'nexus:state', delegating to desktopSync and secrets; envelope kind
```

**Assumed by:** Tasks 15, 38.

**Verify — automated**

- [ ] `npm run typecheck` proves the handler map is exhaustive (a declared channel without a handler is the compile error `serveBridge` exists for).
- [ ] Handler tests with `desktopSync` stubbed: `sync:create` against an existing id answers the `exists` code; `sync:connect` with a mismatched id refuses with `operation-failed` naming the mismatch; `sync:disconnect` forgets the secret and leaves the `sync` scope's rows; `sync:connect` to a Nexus whose bases are held resumes from the held cursor (the transport sees `since=<cursor>`, never 0).
- [ ] Full gate green (preload does not hot-reload: restart the dev process before the user pass).

**Verify — user**

- [ ] *(carried to Task 15.)*

#### Task 15: Settings › General gains Account and Sync

**Requirement:** 5

**Why:** H-3, confirmed: two sections in General, every action with its inverse. The window's row kinds have no text field, so one `field` kind lands on the existing `InputField`.

**Now** — `src/renderer/Settings/SettingsWindow.tsx:203-230` General has one untitled section of two `picker` rows; `Row` kinds: `toggle | slider | device | path | exclusions | clear | color | picker | zoom`; the `clear` kind (`:108-113`) is label + hint + `clear: () => Promise<boolean>` rendered by `ClearActionRow.tsx` with the fixed verbs Clear / Cleared, used at two sites; `MenuCaption` is imported at `:6`; `DesignSystem/Fields/InputField.tsx` exists:

```tsx
// SettingsWindow.tsx:164-169
const settingsRow = (row: RowText, trailing: Trailing): MenuRow => ({ kind: 'item', label: row.label, caption: row.hint, trailing })
```

**Becomes** — `clear` generalizes to `action` (the verb and its done-label become fields; the two existing rows pass Clear / Cleared), a `field` kind lands on `InputField`, and a `caption` kind is `MenuCaption`:

```tsx
// SettingsWindow.tsx — Row: `clear` becomes
| { kind: 'action'; label: string; hint?: string; verb: string; done?: string; destructive?: boolean; act: () => Promise<boolean>; disabled?: boolean }   // the two former clear rows pass destructive
// and gains
| { kind: 'field'; label: string; hint?: string; value: string; secret?: boolean; onCommit: (v: string) => void }
| { kind: 'caption'; text: string }
// Settings/ClearActionRow.tsx → Settings/ActionRow.tsx (verb/done as props); Settings/FieldRow.tsx (new) on InputField
// General sections:
//  { title: 'Account', rows: [ field Server Address · field Email · field Password (secret) · field Device Name ·
//                              action Sign In · action Create Account · action Sign Out (shown when signed in) ] }
//  { title: 'Sync',    rows: [ field Nexus Password (secret) · action Create From This Nexus / Connect (one row; label by sync:nexus) ·
//                              action Sync Now · action Disconnect · caption: the status line ] }
// src/renderer/Store/configSlice.ts gains syncStatus: SyncStatus and applySyncStatus; App.tsx subscribes onSyncChanged like onNavChanged
```

**Verify — automated**

- [ ] `ActionRow.test.tsx` and `FieldRow.test.tsx`: the two former clear rows still read Clear / Cleared and render the destructive button, Sign In renders the default one; a field commits on Enter and blur; a secret field renders `type="password"`; the Create/Connect row reads Connect when `sync:nexus` returns a matching id; Sign Out hides when signed out.
- [ ] `rg -n "kind: 'clear'" src/renderer` → 0. Control: `rg -n "kind: 'action'" src/renderer/Settings/SettingsWindow.tsx` → 8 or more.
- [ ] Full gate green.

**Verify — user**

- [ ] Settings › General shows Account then Sync under the two existing rows; labels Title-Case; every action has its inverse (Sign In / Sign Out, Create or Connect / Disconnect).
- [ ] Against `node Sync/src/index.ts` on localhost with a scratch copy: Create Account, Sign In, Create From This Nexus, the status line moves to idle with a last-sync time; Sync Now reports; Disconnect returns the row to Create/Connect.

#### Task 16: Remote versions in Page History

**Requirement:** 5

**Why:** C-11, core: the history window lists local snapshots and the server's retained versions together, so the phone's history and a device's own bursts read as one.

**Now** — `src/main/CRUD/fileHistory.ts:186-194` `listHistory(pageId): Result<number[]>`, `readHistoryBody(pageId, ts)`; `Windows/PageHistoryWindow.tsx:46` rows are `number[]`:

```ts
export const listHistory = (pageId: string): Result<number[]> =>
  withStore((db) => ok(listSnapshots(db, pageId).map((r) => r.ts)))
```

**Becomes**

```ts
// src/main/Sync/remoteHistory.ts + test
export async function remoteVersions(root: string, pageId: string): Promise<{ ts: number; version: number }[]>   // [] when not connected or the page is not live; ts = the version's mtimeMs
export async function remoteBody(root: string, pageId: string, ts: number): Promise<string | null>
// pageId → livePathOf(root, pageId) → itemId(keys, rel): remote history is keyed by path, so a page's history on the server starts over at a rename
// (the old item's versions stay under its retired id until the prune); the desktop's versions.db keys by page id and is unaffected — stated in SyncPM
// src/main/CRUD/fileHistory.ts — listHistory becomes async: local timestamps ∪ remote, deduped, newest first;
// readHistoryBody: local row else remoteBody; history:list and history:read handlers await them (the bridge types are unchanged: Result<number[]>, Result<string>)
```

**Verify — automated**

- [ ] With a fake transport holding two versions and a `versions.db` holding one: `listHistory` answers three sorted timestamps; `readHistoryBody` of a remote ts answers the decrypted body; disconnected answers the local one alone.
- [ ] Full gate green.

**Verify — user**

- [ ] With the desktop connected and a page edited from the CLI client, View History lists the CLI's version and restores it.

#### Gate 4 — the desktop syncs (Declared Stop)

- [ ] Gate commands green.
- [ ] Every Now count re-run against its control.
- [ ] Simplification and review dispatched against `<base>..HEAD` scoped to `src/main/Sync`, `src/main/index.ts`, `src/main/IO/writeEcho.ts`, `src/main/watcher.ts`, `src/shared/bridge.ts`, `src/shared/nexusApi.ts`, `src/renderer/Settings`, `src/renderer/Store/configSlice.ts`; the reports cite files inside it.
- [ ] Every concern fixed, or carrying a ruling in the Log.
- [ ] Progress hashes filled in; line count reported.
- [ ] **Declared stop.** Execution halts until Nathan closes Task 15's and Task 16's user boxes. This is also where the arc's product decision is put: Phase 5 (the phone as a synced Nexus) opens on his go; Phase 8 (the renderer port) needs its own go and the phone's product spec, given here or at Gate 5.

---

### Phase 5 — The mobile skeleton

Additive plus user-visible, and one removal. The phone in this phase is the Nexus in the Files app plus a sign-in and status shell; no renderer mounts. Budget: about +850 lines (host 250, state and keychain 120, sync wiring 120, shell 150, Swift plugin 80, configs 150) plus the committed `ios/` template.

#### Task 17: The stale mobile build target retires

**Requirement:** 2

**Why:** `vite.config.app.ts` and `dist-app` have stood as "the mobile/web build target" since July and cannot boot without `window.nexus`; the real entry lands in `Pommora/Mobile` (Task 18). Two definitions of the mobile build is the debt this removes.

**Now** — `rg -F "vite.config.app" package.json` → 2 (`dev:app`, `build:app`); `ls dist-app` exists; `.gitignore` names `dist-app/`:

```ts
// vite.config.app.ts:6-8 — "Standalone Vite build of the APP renderer — the mobile/web build target."
```

**Becomes** — `vite.config.app.ts` deleted; `dev:app` and `build:app` scripts removed; `dist-app/` removed from disk and from `.gitignore`. Inventory: dead regardless (no importer, no doc mentions it: verified by the doc scout 09-04-2026). Never-delete: `vite.config.ts` (the showcase). Residue: none.

**Verify — automated**

- [ ] `rg -F "dist-app" . -g '!node_modules'` → 0; `rg -F "vite.config.app" . -g '!node_modules'` → 0. Control: `rg -F "build:showcase" package.json` → 1.
- [ ] Full gate green.

**Verify — user**

- [ ] *(none.)*

#### Task 18: The Mobile project

**Requirement:** 6

**Why:** A Capacitor 8 iOS project under SPM, its own package with the Capacitor dependencies and no React, a Vite entry that resolves the renderer from the parent, and the gates it joins (A-6, E-1, E-4, E-6).

**Now** — `—`; `Pommora/.gitignore` ignores `dist/`; `biome.json` `files.includes` is `["**", "!!**/dist", "!**/graphify-out"]`; root scripts end at `check`:

```json
// biome.json:9
"includes": ["**", "!!**/dist", "!**/graphify-out"]
```

**Becomes**

```
Mobile/
  package.json          name pommora-mobile, private; dependencies: @capacitor/core ^8.5.1, @capacitor/ios ^8.5.1, @capacitor/filesystem ^8.1.3,
                        @capacitor/preferences ^8.0.1, @capacitor/app ^8.1.1, @aparajita/capacitor-secure-storage ^8.0.0, pommora-atomic-write file:./plugins/atomic-write;
                        devDependencies: @capacitor/cli ^8.5.1 — no react, no vite (the root's are used through `npm --prefix`-free scripts below)
  capacitor.config.ts   { appId: 'com.pommora.app', appName: 'Pommora', webDir: 'dist', ios: { contentInset: 'never' } }   // server.hostname stays the default localhost
  vite.config.ts        root Mobile/, plugins react + vanillaExtract from the parent, aliases @shared/@renderer/@engine → ../src/*, resolve.dedupe ['react','react-dom'],
                        server { port: 5173, strictPort: true }, build.outDir 'dist'
  index.html            <div id="root"> + module src/main.tsx
  src/                  (Tasks 20–22, 38, 39)
  ios/                  npx cap add ios — committed wholesale per E-6 (App/App/public, capacitor.config.json, DerivedData, xcuserdata ignored by the template's own .gitignore)
  ios/App/App/Info.plist gains UIFileSharingEnabled true and LSSupportsOpeningDocumentsInPlace true (I-1); CFBundleDisplayName Pommora
tsconfig.mobile.json    extends tsconfig.web.json; include Mobile/src/**/*, src/renderer/**/*, src/shared/**/*, src/engine/**/*; paths add @engine/*; exclude tests
package.json (root)     "typecheck:mobile": "tsc --noEmit -p tsconfig.mobile.json" (in typecheck), "dev:mobile": "vite -c Mobile/vite.config.ts",
                        "build:mobile": "vite build -c Mobile/vite.config.ts", "ios": "npm run build:mobile && cd Mobile && npx cap sync ios"
biome.json              includes gains "!**/Mobile/ios", "!**/Mobile/dist"
.gitignore              Mobile/node_modules/, Mobile/dist/
```

**Assumed by:** Tasks 19–24, 38, 39.

**Verify — automated**

- [ ] `npm run build:mobile` green with a placeholder `main.tsx` rendering nothing; `cd Mobile && npx cap sync ios` green; `xcodebuild -project Mobile/ios/App/App.xcodeproj -scheme App -destination 'id=00887B6E-210B-4E8A-B253-2D544620F25D' -configuration Debug build` green (exit code read directly).
- [ ] `ls Mobile/node_modules/react` → absent. Control: `ls Mobile/node_modules/@capacitor/core` → present.
- [ ] `npm run typecheck` (with `typecheck:mobile`) and `npm run lint` green; `rg -c "Mobile/ios" biome.json` → 1.
- [ ] `plutil -p Mobile/ios/App/App/Info.plist | rg "UIFileSharingEnabled|LSSupportsOpeningDocumentsInPlace"` → 2 lines, both `1`.
- [ ] The placeholder app run once on the Simulator with Safari Web Inspector attached: `isSecureContext` true, `typeof crypto.subtle` `'object'`, `typeof crypto.randomUUID` `'function'` at `capacitor://localhost`, and the same three under live reload at `http://localhost:5173` — the arc's crypto (Task 7 on) and `tabsModel.ts:318` both rest on this, so it is checked here, before either is written, rather than at Task 24.
- [ ] In the same session: `fetch(Capacitor.convertFileSrc(<a Documents file uri>) + '?v=3')` answers 200 — the renderer's `resolveAssetUrl` appends `?v=` to every asset URL.

**Verify — user**

- [ ] *(none yet.)*

#### Task 19: The atomic-write plugin

**Requirement:** 6

**Why:** Capacitor's Filesystem writes are not atomic and cannot set mtime (E-5, research); the engine's contract is an atomic write and a landing that keeps its envelope date. One small Swift plugin does both.

**Now** — `—`. Research (SPM project layout, custom plugin Route B): a local package needs `package.json` `capacitor.ios.src`, a `Package.swift` whose library name equals the CLI's `fixName` of the npm name, and `@objc(<Class>)` first in the Swift file.

**Becomes**

```
Mobile/plugins/atomic-write/
  package.json        { "name": "pommora-atomic-write", "version": "0.0.1", "main": "dist/index.js", "types": "dist/index.d.ts",
                        "capacitor": { "ios": { "src": "ios" } }, "files": ["dist", "ios/Sources", "Package.swift"] }
  Package.swift       Package(name: "PommoraAtomicWrite", platforms: [.iOS(.v15)], products: [.library(name: "PommoraAtomicWrite", targets: ["AtomicWritePlugin"])],
                      dependencies: capacitor-swift-pm from 8.0.0, targets: [.target(name: "AtomicWritePlugin", dependencies: [Capacitor, Cordova], path: "ios/Sources/AtomicWritePlugin")])
  ios/Sources/AtomicWritePlugin/AtomicWritePlugin.swift
    @objc(AtomicWritePlugin) public class AtomicWritePlugin: CAPPlugin, CAPBridgedPlugin { jsName "AtomicWrite"; one method: write }
    write({ path: absolute file path, base64: String, mtimeMs?: Double }) → Data(base64).write(to:, options: .atomic); then setAttributes([.modificationDate]) when mtimeMs is given
  src/index.ts        export const AtomicWrite = registerPlugin<AtomicWritePlugin>('AtomicWrite')
  src/definitions.ts  interface AtomicWritePlugin { write(o: { path: string; base64: string; mtimeMs?: number }): Promise<void> }
  tsconfig.json + a one-line build script (tsc) run by Mobile's postinstall
```

**Assumed by:** Task 20.

**Verify — automated**

- [ ] `npx cap sync ios` lists `PommoraAtomicWrite` in `Mobile/ios/App/CapApp-SPM/Package.swift` and `AtomicWritePlugin` in `ios/App/App/capacitor.config.json`'s `packageClassList`; `xcodebuild … build` green.
- [ ] On the Simulator (Task 18's placeholder app, driven through Safari Web Inspector once): `AtomicWrite.write({path, base64, mtimeMs: 1700000000123})` then `Filesystem.stat` reports `mtime === 1700000000123` (integer ms round-trips through the plugin and the plugin's readdir/stat); a write over an existing file leaves either the old or the new bytes when the app is killed mid-loop of 200 writes (`simctl terminate` during the loop; every file parses).

**Verify — user**

- [ ] *(none.)*

#### Task 20: The Capacitor host

**Requirement:** 6

**Why:** The engine's one seam bound to the phone: Documents-relative POSIX paths, one bridge call per directory, atomic writes through the plugin, mtime restored on landings, no lock (a single non-concurrent writer, F-9).

**Now** — `src/engine/host.ts` (Task 1); `src/main/engineHost.ts` is the shape to mirror.

**Becomes**

```ts
// Mobile/src/host/capacitorHost.ts + capacitorHost.test.ts (the plugins stubbed)
export const DOCUMENTS = Directory.Documents
/** Absolute paths on the phone are Documents-relative POSIX (`NexusOS/Ideas/A.md`); the engine never sees a file:// URI. */
export const capacitorHost: EngineHost
// readText: Filesystem.readFile({ path, directory: DOCUMENTS, encoding: Encoding.UTF8 }) — OS-PLUG-FILE-0008 → HostNotFound
// readBytes: readFile without encoding → base64 → Uint8Array
// readDir: Filesystem.readdir → entries sorted by name, each with stat { mtimeMs: mtime, size, kind } (one bridge call per directory)
// stat: Filesystem.stat, null on 0008
// writeText: AtomicWrite.write({ path: <file uri of DOCUMENTS/path>, base64 }) via Filesystem.getUri once per call
// applyRemote: AtomicWrite.write({ …, mtimeMs }) after mkdir of the parent
// mkdir: Filesystem.mkdir recursive, 0010 (exists) swallowed; rename: Filesystem.rename; remove: deleteFile, or rmdir for a directory; 0008 swallowed
// lock: (_, fn) => fn()
export function bindCapacitorHost(): void
```

**Verify — automated**

- [ ] Red first with stubbed plugins: `readDir` sorts and carries stats; not-found codes map to `HostNotFound`/null; `applyRemote` passes `mtimeMs` to the plugin; `mkdir` on an existing directory resolves. Then green.
- [ ] `npm run typecheck:mobile` green.

**Verify — user**

- [ ] *(none.)*

#### Task 21: Phone state, preferences, and the keychain

**Requirement:** 6

**Why:** D-2: `local_state` scopes and the sync state as JSON under `Library`, tiny values in Preferences, secrets in the Keychain with per-item accessibility (F-3).

**Now** — `—`; `src/main/Database/localState.ts` `Scope` union is the set of scopes a host answers.

**Becomes**

```ts
// Mobile/src/host/state.ts + state.test.ts
export function readScope<T>(scope: Scope): Promise<Record<string, T>>           // Library/state/<scope>.json, {} when absent
export function writeKey(scope: Scope, key: string, value: unknown): Promise<void>   // null deletes; whole-file rewrite through AtomicWrite
export function libraryStateStore(): SyncStateStore                               // Library/sync/<nexusId>.json; buffered; flush writes
// Mobile/src/host/prefs.ts — Preferences: 'account' (AccountFields as JSON), 'nexusId', 'nexusName'
// Mobile/src/host/keychain.ts — SecureStorage: 'token' afterFirstUnlock; `nexus:<id>` whenUnlockedThisDeviceOnly; setSynchronize(false) once
```

**Assumed by:** Tasks 22, 38.

**Verify — automated**

- [ ] Red first with stubbed plugins: a scope round trip; a null write deletes the key and an emptied file is removed; the store's `flush` writes once for three `setBase` calls; the keychain seam passes the accessibility class per key. Then green.

**Verify — user**

- [ ] *(none.)*

#### Task 22: Phone sync wiring

**Requirement:** 6

**Why:** I-2: push on own writes after a short debounce, the feed while foregrounded, catch-up on `resume` and at launch after `getState()`, Sync Now from the status screen. The tree and its per-landing patch arrive with the port (Task 38).

**Now** — `src/engine/Sync/client.ts` (Task 10).

**Becomes**

```ts
// Mobile/src/host/session.ts + session.test.ts
export interface PhoneSession {
  noteOwnWrite(rel: string): void                 // scheduler.noteDirty
  syncNow(): Promise<SyncReport>                  // scheduler.trigger
  connect(nexusId: string, nexusPassword: string): Promise<Result<null>>   // pulls into Documents/<nexusName>; the walk arrives with Task 38
  disconnect(): Promise<void>
  start(): Promise<void>                          // App.getState() → trigger; App.addListener('resume') → trigger; feed while active; pause aborts the feed
}
// the scheduler is createSyncScheduler from the engine (Task 10) — the same debounce as the desktop's
```

**Verify — automated**

- [ ] Red first with a memory host and fake transport: an own write schedules a sync once; `resume` triggers a run; a feed seq above the cursor triggers a run; `pause` aborts the feed. Then green.

**Verify — user**

- [ ] *(carried to Task 24.)*

#### Task 23: The sign-in shell

**Requirement:** 6

**Why:** D-4: the mobile entry binds the host before rendering; `MobileApp` composes the first-run form and, once a Nexus is connected, a status screen. Nothing of the desktop renderer mounts here; the phone is the Nexus in the Files app plus the means to sign in, connect, and sync.

**Now** — `—`.

**Becomes**

```tsx
// Mobile/src/main.tsx — bindCapacitorHost(); the same CSS side-imports as src/renderer/main.tsx; render <MobileApp/>
// Mobile/src/MobileApp.tsx — no Nexus → <FirstRun/>; else <Status/>; a DEV-only seed: Library/dev-first-run.json { server, email, password, nexusId, nexusPassword } performs the first run unattended and is deleted after
// Mobile/src/FirstRun.tsx — server, email, password, Sign In / Create Account, the Nexus list (matches first), Nexus password, Connect — plain InputField + Button on a Surface
// Mobile/src/Status.tsx — the Nexus's name, SyncStatus.state, lastSync, pending, the last SyncReport's counts; Sync Now and Disconnect Buttons; padding-bottom var(--safe-bottom)
```

**Assumed by:** Task 24, Task 39 (grows `MobileApp` with the desktop `App` and the bottom bar).

**Verify — automated**

- [ ] `FirstRun.test.tsx`: Connect disabled until a Nexus is picked and a password typed; `Status.test.tsx`: Sync Now calls `session.syncNow`, Disconnect returns to `FirstRun`.
- [ ] `rg -n "var\(--safe-bottom\)" Mobile/src` → 1. Control: `rg -n "safe-bottom" src/renderer/styles.css` → 1.
- [ ] Full gate green.

**Verify — user**

- [ ] *(carried to Task 24.)*

#### Task 24: The Simulator boot

**Requirement:** 6

**Why:** Every step is gated on the Simulator before a device exists (A-5); this is where the companion first runs.

**Now** — Task 18's project builds; no app has run.

**Becomes** — `npm run ios && cd Mobile && npx cap run ios --target 00887B6E-210B-4E8A-B253-2D544620F25D` boots the app; the live-reload loop documented in `Mobile/README.md`: `npm run dev:mobile` in one shell, `npx cap run ios --live-reload --host localhost --port 5173 --target <id>` in another (never a LAN IP).

**Verify — automated**

- [ ] With the server on localhost and the CLI having created a Nexus from the fixture: the seed file written into the container (`xcrun simctl get_app_container booted com.pommora.app data`)/`Library/dev-first-run.json`; the app launched; within 30 s `Documents/<name>/Ideas/A.md` exists in the container; `xcrun simctl io booted screenshot` shows the status screen with the Nexus's name and an idle state.
- [ ] Safari Web Inspector attached once: no console error at boot (the secure-context checks ran at Task 18).

**Verify — user**

- [ ] Two screenshots: the sign-in form, then the status screen after Connect; and the Simulator's Files app (`xcrun simctl launch booted com.apple.DocumentsApp`) showing On My iPhone › Pommora › the Nexus with its folders.

#### Gate 5 — the companion holds the Nexus (Declared Stop)

- [ ] Gate commands green (`typecheck:mobile`, the lint excludes).
- [ ] Simplification and review dispatched against `<base>..HEAD` scoped to `Mobile/src`, `Mobile/plugins`, `Mobile/*.ts`, `Mobile/package.json`, `vite.config.app.ts`'s removal, the tsconfig and biome changes; the reports cite files inside it.
- [ ] Every concern fixed, or carrying a ruling in the Log.
- [ ] Progress hashes filled in; line count reported.
- [ ] **Declared stop.** Execution halts until Nathan closes Task 24's user box. Phase 6 opens on his go; Phase 8 stays closed until he gives its go and the phone's product spec exists.

---

### Phase 6 — Acceptance

Live-data. Every run uses the scratch copy and a throwaway `DATA_DIR`; both are removed at closeout.

#### Task 25: The NexusOS dry run

**Requirement:** 7

**Why:** The fixture proves the mechanism; Nathan's real Nexus proves the scale (990 files, 53 MB of trash, thumbnails that churn) and J-2's one-second budget.

**Now** — `~/NexusOS` as counted in Grounding.

**Becomes** — a recorded run: `rsync` the copy to `/tmp/pommora-scratch/NexusOS`; server with `DATA_DIR=/tmp/pommora-scratch/server`; desktop instance `POMMORA_USERDATA=/tmp/pommora-scratch/userdata` with `--remote-debugging-port=9333` opened on the copy; Create Account and Create From This Nexus driven over CDP through `window.nexus.account.signIn` and `window.nexus.sync.create`; the CLI connects a second root `/tmp/pommora-scratch/NexusOS-B`; `diffRoots` over both.

**Verify — automated**

- [ ] The first push reports the manifest count re-derived on the copy that morning (`syncManifest` over it; 506 on the evening of 09-04-2026 after Nathan emptied `.trash`, 990 that morning); the CLI's first pull lands the same count; `diffRoots` clean.
- [ ] A no-change `sync:now` on the desktop completes under one second (timed in the report).
- [ ] Over CDP: a body edit through `window.__pommora.getState().…` on a throwaway page created for the run (hit-test the active element first; never an existing page) reaches root B within five seconds of the save; a CLI-side edit reaches the desktop tree (`window.__pommora.getState().tree` shows the change) within five seconds; a desktop delete lands B's tombstone and bundle; a desktop rename crosses with the id intact.
- [ ] The run's instance killed, its pid confirmed gone; `/tmp/pommora-scratch` left only until Task 26.

**Verify — user**

- [ ] *(none — Task 27's device pass is the real-Nexus moment.)*

#### Task 26: Desktop and Simulator end to end

**Requirement:** 7

**Why:** The acceptance criterion, clause by clause, with the phone's files read straight from its container.

**Now** — Task 25's scratch state; the Simulator app from Task 24.

**Becomes** — the seed file aims the app at the scratch server and the dry run's Nexus; the app foregrounded.

**Verify — automated**

- [ ] Desktop body edit → the file under `$(xcrun simctl get_app_container booted com.pommora.app data)/Documents/NexusOS` changes within five seconds (polled `diff`).
- [ ] A page file written into the container's Documents copy → `xcrun simctl terminate` + `launch` → the desktop's tree gains the page within five seconds of launch.
- [ ] Desktop delete → the container's copy loses the page and gains its `.trash` bundle.
- [ ] `simctl terminate`; three desktop edits; `launch` → all three present in the container.
- [ ] `diffRoots` over the desktop copy and the container's copy clean.
- [ ] Both-edited page (desktop and the CLI) → the server's versions route lists two; the newer stands on the desktop, in the container, and in root B.
- [ ] Screenshots after each clause where the desktop shows it (the tree, the edited page); the phone's evidence is the container's files.
- [ ] The Simulator shut down, the server stopped, `/tmp/pommora-scratch` removed, `git -C ~/NexusOS status --short` unchanged from before the phase.

**Verify — user**

- [ ] The screenshots; a page edited in the Simulator's Files app (a text editor that opens Files, or `simctl` writing the file) reaching the desktop after Pommora foregrounds.

#### Task 27: The device path (Declared Stop)

**Requirement:** 8

**Why:** A-5: buying the account is the only thing between the Simulator and the phone, so the plan carries every other step.

**Now** — zero signing identities; `Mobile/ios/App/App.xcodeproj` at the template's `IPHONEOS_DEPLOYMENT_TARGET = 15.0` with no team.

**Becomes** — `Mobile/README.md` §Device: bundle id `com.pommora.app`; in Xcode Signing & Capabilities pick the team and Automatically manage signing; a connected iPhone 17 on iOS 26 with Developer Mode on; `npx cap run ios --target <device udid>` for a direct install (7-day certificate under a free Apple ID; one year under the paid program); TestFlight through Archive → Distribute → App Store Connect for an install that outlives the cable; the deployed server reached over HTTPS behind a reverse proxy, the address entered in Settings › General.

**Verify — automated**

- [ ] `rg -c "com.pommora.app" Mobile/capacitor.config.ts Mobile/ios/App/App.xcodeproj/project.pbxproj` → both 1 or more.

**Verify — user**

- [ ] After buying the account: the install lands, Obsidian Sync switched off, `~/NexusOS` connected as the Nexus, the phone connected, an edit each way.

#### Gate 6 — observed end to end

- [ ] Gate commands green.
- [ ] Every scratch artifact removed; NexusOS untouched.
- [ ] Simplification and review dispatched against `<base>..HEAD` (the phase's only code is the README and any fix the runs forced); the reports cite files inside it.
- [ ] Every concern fixed, or carrying a ruling in the Log.
- [ ] Progress hashes filled in; line count reported.
- [ ] Task 27 is a declared stop on the account; Phase 7 opens regardless, since docs describe what shipped on the Simulator.

---

### Phase 7 — Documentation

The closeout of the arc that ships regardless.

#### Task 28: MobilePM and SyncPM

**Requirement:** 9

**Why:** K-8: two new Features documents, encyclopedic, never naming Nathan or a session.

**Now** — `.claude/Features/` holds 18 documents; none describes sync or mobile.

**Becomes** — `.claude/Features/SyncPM.md` (the local and remote Nexus, the change log and sequence, the manifest rule and what never syncs, the envelope and key hierarchy, the conflict rule and retained versions, the server and its container, how a landing enters each host, the Settings rows by label) and `.claude/Features/MobilePM.md` (the host seam and the Capacitor binding, the api table, the Files-visible copy and per-device state, first run, the sync triggers, the bottom bar, the dev loop, the device path).

**Verify — automated**

- [ ] `rg -n "Nathan|session" .claude/Features/SyncPM.md .claude/Features/MobilePM.md` → 0. Control: `rg -c "Nexus" .claude/Features/SyncPM.md` → 10 or more.

**Verify — user**

- [ ] *(none.)*

#### Task 29: The rewrites the arc made false

**Requirement:** 9

**Why:** Every row of Made False is a sentence that stopped being true; each is restated as currently true, never amended (K-1..K-7, K-8's NexusRecordPM line).

**Now** — the Made False table's rows, each re-read before editing.

**Becomes** — `CLAUDE.md` hard rule: "The host owns the filesystem: main on desktop, the Capacitor host on mobile; the engine in `src/engine` reaches it only through the host seam, and `src/main` is still the only place Node and Electron APIs are called on desktop." `ArchitecturePM` §The Shape of the App gains the engine and its two hosts; §The Nexus Layout comments say what syncs through Pommora Sync; §Persistence gains the sync scope row and the account row; §What the Data Layer Leaves to the OS loses the sync bullet and a §Pommora Sync section points to SyncPM. `PommoraPRD` §Audience, §Core Constraints, §Scope. `FrameworkPM` §Post-v1 and a version entry. `ConfigurationPM` §General gains the Account and Sync tables with keys and where each is stored. `Dependencies` gains Mobile and Server headings. `Development-Environment` gains the server, the mobile loop, Simulator verification, and the five typecheck projects. `NexusRecordPM` gains the bundle-travels-with-sync line.

**Verify — automated**

- [ ] Each quoted claim from Made False → `rg -F "<quote>" <doc>` → 0. Control: `rg -F "Reasonable Legibility" .claude/CLAUDE.md` → 1.

**Verify — user**

- [ ] *(none.)*

#### Task 30: History, Context, Handoff

**Requirement:** 9

**Why:** K-9: the arc under one History heading at closeout; Context rewritten to where things stand.

**Now** — `HistoryPM.md` index tops at `PM-127 | The Resize Frame`; `ContextPM.md` §Current Focus is the Glance Pane.

**Becomes** — `PM-128 || Pommora Sync And The Mobile Companion` to the History format (commits, diff from the closeout's actionable difference); Context's Current Focus, Recent Work (five entries, oldest dropped), Known Issues (the two-host lost update gains the sync landing case; H-4's open-editor reload as the named successor); the Handoff.

**Verify — automated**

- [ ] `rg -c "PM-128" .claude/HistoryPM.md .claude/ContextPM.md` → both 1 or more. Control: `rg -c "PM-127" .claude/HistoryPM.md` → 2.

**Verify — user**

- [ ] *(none.)*

#### Gate 7 — nothing false stands (the arc that ships regardless closes here)

- [ ] Dead Vocabulary sweep at zero against its control.
- [ ] Simplification and review over the whole range (`<phase-1-base>..HEAD`), then the Delivery Claim, the neutral verifier, the attack — per Completion Criteria.
- [ ] Phase 8 is not part of this closeout; if it never opens, the arc is complete as of this gate.

---

### Phase 8 — The renderer port (behind a go)

Opens only on Nathan's explicit go after Gate 5 and a phone product spec that names what the phone is for; if the spec answers "capture and read" rather than "the desktop's editor", this phase is re-planned, not executed. A behavior-preserving refactor plus additive. Baseline invariant: the test-file and test counts at Gate 7 and the same after every move; no test body changes except import paths; `npm run build` green. Budget: about +650 lines new (holder adapter, shared table, scope map, api 300, pane 150, hold 60, bottom bar 80) against about 2,900 moved; preload shrinks from 195 lines to about 40. The Tiles closeout constraint binds here.

#### Task 31: The pure modules move

**Requirement:** 1

**Why:** `exclusion`, `coerce`, `order`, `ids`, and `paths` have no Node dependency beyond `node:path` and `createHash`; moving them first lets every later move import them from their final home instead of rewriting twice.

**Now** — importers: `paths` 51, `ids` 24, `exclusion` 19, `coerce` 7, `order` 3 (`rg -l -U "from '(\.\./)*\.?/?<name>'" src`); `ids.ts:6` imports `createHash` from `node:crypto`; `paths.ts:6` imports `join, relative, sep` from `node:path`:

```ts
// src/main/ids.ts:64-66
export function adoptedId(relPath: string): string {
  return `${ADOPTED_PREFIX}${createHash('sha256').update(relPath).digest('hex').slice(0, 16)}`
}
// src/main/paths.ts:11-12
export const relPosix = (root: string, abs: string): string =>
  relative(root, abs).split(sep).join('/')
```

**Becomes** — `src/engine/{exclusion,coerce,order,ids,paths}.ts` with their tests; every importer rewritten `'./x'`/`'../x'` → `'@engine/x'`; `ids.ts` uses `sha256Hex`; `paths.ts` uses `posixPath`:

```ts
// src/engine/ids.ts
export function adoptedId(relPath: string): string {
  return `${ADOPTED_PREFIX}${sha256Hex(relPath).slice(0, 16)}`
}
// src/engine/paths.ts — relPosix keeps its name and contract; `sep` is gone
export const relPosix = (root: string, abs: string): string => relative(root, abs)
```

**Verify — automated**

- [ ] `ids.test.ts` gains one case: `adoptedId('Ideas/A.md')` equals the value `node:crypto` computes (control against the retired implementation, written into the test as a literal).
- [ ] Full gate green; counts unmoved plus the one case.
- [ ] `rg -l "from '(\.\./)*\.?/?(exclusion|coerce|order|ids|paths)'" src/main` → 0. Control: `rg -l "from '@engine/paths'" src/main` → 51 (the two moving-set importers now inside the engine excluded).

**Verify — user**

- [ ] *(none.)*

#### Task 32: The IO read chain and the JSON writers move

**Requirement:** 1

**Why:** The walk, its parse gate, and the strict JSON reads are what a phone needs to build a tree at all; the JSON writers ride along because `rmwJsonStrict` needs only the lock the host now provides.

**Now** — `IO/atomicWrite.ts` 242 lines, 53 importers; `IO/walk.ts` 17; `walkCache.ts` 3:

```ts
// src/main/IO/walk.ts:25-32
export function isContentFile(entry: Dirent): boolean {
  return entry.isFile() && !entry.name.startsWith('_') && isMarkdownFile(entry.name)
}
export async function listEntries(dir: string): Promise<Dirent[]> { try { return await readdir(dir, { withFileTypes: true }) } catch { return [] } }
// src/main/walkCache.ts:49-56
export async function cachedParse<T>(absPath: string, parse: (stat: FileStat | null) => Promise<T>): Promise<T> {
  ...
  s = await stat(absPath)
// src/main/IO/atomicWrite.ts — write half stays: atomicWriteFile, rewritePreservingTimes, atomicWriteBinary,
// rewritePageSerialized, mintBundle, settleBundle, trashFileFlat, fileStamp, BUNDLE_SUFFIX
```

**Becomes**

```ts
// src/engine/IO/files.ts (new home of the read half + JSON writers; tests move from atomicWrite.test.ts)
export function readJsonStrict(absPath: string): Promise<Result<Record<string, unknown>>>
export function readJsonObject(absPath: string): Promise<Record<string, unknown> | null>
export function readTextOrNull(absPath: string): Promise<string | null>
export function pathExists(p: string): Promise<boolean>          // host().stat !== null
export function stableStringify(value: unknown): string
export function writeJson(filePath: string, value: unknown): Promise<void>   // host().writeText
export function rmwJsonStrict(absPath, mutate, seedOnAbsent?): Promise<Result<Record<string, unknown>>> // host().lock
// src/engine/IO/walk.ts — DirEntry in place of Dirent
export function isContentFile(entry: DirEntry): boolean
export function listEntries(dir: string): Promise<DirEntry[]>    // host().readDir
export function listMarkdownFiles(dir, opts?): Promise<string[]>  // recursion by hand over readDir; enters every directory (dot-dirs and `.trash` included) exactly as readdir({recursive:true}) did, and filters after — skipTopLevel is the only prune
export function corpusFiles / corpusFilesUnder / listFilesRecursive — unchanged contracts (listFilesRecursive recurses by hand too; `parentPath` is gone)
// Every consumer of a listed entry moves from Dirent methods to DirEntry.kind: readNexus.ts:461,590,658 · folderKind.ts:133 (moving) and, staying in main,
// adopt.ts:145,194,226 · assetDirValidate.ts:47,50 · exclusionScan.ts:35,39 · assetMigrate.ts:131,241 · provenance.ts:249,425,497,517 — 8 modules, compile-enumerated
// src/engine/IO/walkCache.ts
export async function cachedParse<T>(absPath: string, parse: (stat: FileStat | null) => Promise<T>, known?: FileStat): Promise<T>
// `known` skips the stat: a readDir that listed the stat already answered it
// src/main/IO/atomicWrite.ts keeps the write half; atomicWriteFile = nodeHost.writeText; imports the read half from @engine/IO/files
```

**Verify — automated**

- [ ] Red first: `walkCache.test.ts` gains "a known stat is used without a stat call" (spy on `host().stat` → 0 calls); `walk.test.ts` gains "`listMarkdownFiles` over a fixture holding `.trash/x.md` and `.hidden/y.md` returns both" and "`listFilesRecursive` matches the retired recursive readdir on a three-level fixture". Expect failure, then green.
- [ ] Full gate green; counts unmoved plus one.
- [ ] `rg -l "from '(\.\./)*\.?/?(IO/walk|walkCache)'" src/main` → 0; `rg -n "pathExists|readJsonObject|readJsonStrict|readTextOrNull|rmwJsonStrict|writeJson|stableStringify" src/main/IO/atomicWrite.ts` shows only imports from `@engine/IO/files`. Control: `rg -l "from '@engine/IO/files'" src/main` → 40 or more.
- [ ] The 8 `vi.mock('…/IO/atomicWrite')` and `vi.mock('./readNexus')` sites (`deleteOrder`, `mutatePatch`, `liveTree`, `journalWiring`, `keyHolders`, `cascade`, `governedWorldWrite` tests) re-aimed at the symbol's new module; `npm run test` proves each still intercepts (a mock that misses its target reads as a real write in a temp dir and the assertion on the spy fails).

**Verify — user**

- [ ] *(none.)*

#### Task 33: Pages, sidecars, the registry, folder kind, and the walk move

**Requirement:** 1

**Why:** With reads and the lock behind the host, the page file engine, the sidecar pair, the registry, and `readNexus` itself have no remaining Node edge; this is the task that gives a phone the tree.

**Now** — importers: `IO/pageFile` 30, `sidecarIO` 20, `IO/propertiesRegistry` 21, `folderKind` 6, `readNexus` 37, `readPage` 2; `readNexus.ts` imports only moving-set modules (0 STAYS edges):

```ts
// src/main/sidecarIO.ts:20-26
export function withSidecarLock<T>(absFolder: string, kind: SidecarKind, fn: () => Promise<T>): Promise<T> {
  return serializeOnFile(sidecarPath(absFolder, kind), fn)
}
// src/main/IO/propertiesRegistry.ts:83-87
export function mutateRegistry<T>(root: string, fn: …): Promise<T> {
  return serializeOnFile(registryPath(root), async () => {
// src/main/IO/pageFile.ts:193 readFile(absPath, 'utf8') · :202 atomicWriteFile(absPath, written)
```

**Becomes** — `src/engine/IO/{pageFile,sidecarIO,propertiesRegistry}.ts`, `src/engine/{folderKind,readNexus,readPage}.ts`, tests moved; `serializeOnFile(...)` → `host().lock(...)` at the three sites; `readFile` → `host().readText` with `HostNotFound` mapped where `ENOENT` was; `mkdir` → `host().mkdir`; `readSidecar` in `readNexus` keeps its lenient null; every main importer rewritten to `@engine/...`. Two read halves the phone's boot needs ride along: `src/engine/assetMap.ts` takes `indexable`, `buildAssetMap`, `patchAssetMap` from `src/main/assetMap.ts` (the held map and its push stay in main), and `src/engine/IO/navigationFile.ts` takes `readNavigationFile` and the ref gate from `src/main/IO/navigationFile.ts` (the write and the recents row stay). `readNexus`'s exports consumed outside the moving set (`splitFrontmatter` 17, `readNexus` 12, `readSettingsLeaves` 4, `scopeOf` 4, `SettingsLeaves`, `readPageRecord`, `excludedFolderRefusal`, `assetDirRefusal`, `parseViews`, `readCropLeaves`, `readHomepageLeaves`, `readSpaceOrders`, `resolveAssignedSchema`, `resolveEntityContexts`) keep their names and signatures.

**Verify — automated**

- [ ] Full gate green; counts unmoved.
- [ ] `rg -l "from '(\.\./)*\.?/?(IO/pageFile|sidecarIO|IO/propertiesRegistry|folderKind|readNexus|readPage)'" src/main` → 0; `rg -n "buildAssetMap|readNavigationFile" src/main --glob '!*.test.ts'` shows only engine imports and their callers. Control: `rg -l "from '@engine/readNexus'" src/main` → 35 or more.
- [ ] `rg -n "from 'node:" src/engine` → 0 (test files excluded with `-g '!*.test.ts'`). Control: `rg -n "from '@shared/" src/engine | wc -l` → 20 or more.
- [ ] Crossing test: `writePageFile` on a missing file starts from empty frontmatter and on an unreadable path refuses — `pageFile.test.ts` covers both with the Node host (`HostNotFound` versus a directory-as-file read).

**Verify — user**

- [ ] *(none.)*

#### Task 34: Page CRUD, the rename cascade, the trash writers, and the value batch move

**Requirement:** 1

**Why:** Create, rename with its link cascade, move, delete into a trash bundle, reorder, and body write are the phone's v0 mutations (Ruling 8); `loadValues` is what a Collection view reads. Both cycles into main (`governedWrite`, `indexSeed`/`valuesChanged`) are cut here by leaving the property write and the corpus in main.

**Now** — `CRUD/page.ts` 16 importers, `CRUD/util.ts` 13, `CRUD/loadValues.ts` 2, `CRUD/reorder.ts` 3, `disambiguate.ts` 2; `updateFolderSidecar` (`CRUD/folderEntity.ts:64-77`) is the sidecar patch `setContainerOrder` rides:

```ts
// src/main/CRUD/page.ts:47-56
async function relocatePage(absFile: string, target: string): Promise<void> {
  await serializeOnFile(absFile, async () => {
    recordWrite(absFile)
    recordWrite(target)
    await rename(absFile, target)
  })
}
// :109-119 updatePageProperty(absFile, def, value, world?) → setGovernedRootKeys(...)   // stays in main
// src/main/CRUD/loadValues.ts:27-38 corpus(rootPath, containerRelPath, pageIds?) — folderCorpus / liveIdIndex
// src/main/CRUD/reorder.ts:80-93 setChildOrder(absFolder, key, ids) → setContainerOrder → updateFolderSidecar; :24-38 setStateOrder (mkdir + rmwJsonStrict)
// src/main/mutate.ts:269-279 createDisambiguated(req.name, name => createPage(…)) then setChildOrder(parent, 'page_order', req.order with NEW_PAGE_SLOT replaced)
// src/main/CRUD/cascade.ts:23-50 renameCascade(root, oldTitle, newTitle) — queryMentions(oldKey) ?? nexusCorpus(root); per page rewritePageSerialized, then indexWrittenPage + noteValueWrite
// src/main/Connections/scan.ts (43 lines), rewrite.ts (52) — pure; @shared imports only
// src/main/CRUD/folderEntity.ts:15-62 createFolderEntity, renameFolderEntity, moveFolderEntity — node mkdir/rename, recordWrite, the sidecar pair
// src/main/IO/atomicWrite.ts:230-254 mintBundle(root, absSource), settleBundle(bundleDir, absPath); src/main/provenance.ts:115-119 writeRecord, :160-192 gatherParentRef (ensureFolderId fallback), gatherContentRecord
// src/main/mutate.ts:195-198 isReserved(root, abs) — realpath(root) then NON_CORPUS_TOP / .trash
```

**Becomes**

```ts
// src/engine/CRUD/page.ts — createPage, renamePage, movePage, updatePageBody; relocate = host().lock + host().rename; plus the one create sequence both hosts run:
export async function createPageInOrder(parentDir: string, name: string, opts: CreateOpts, order?: readonly string[]): Promise<Result<{ id: string; path: string }>>
//   createDisambiguated → createPage → setChildOrder(parentDir, 'page_order', order with NEW_PAGE_SLOT replaced) when order is given; mutate.ts calls it and keeps its index and values side effects
// src/engine/CRUD/util.ts — invalidName, invalidContextTitle, sweepAdmitsBody, sweepAdmits (the pathExists re-export at util.ts:9 is dropped; its 2 importers, page.ts:12 and folderEntity.ts:11, import it from @engine/IO/files)
// src/engine/CRUD/reorder.ts — setStateOrder, setSpaceOrder, setContainerOrder, setChildOrder (host().mkdir; rmwJsonStrict from the engine)
// src/engine/IO/sidecarIO.ts gains updateFolderSidecar (moved from CRUD/folderEntity.ts; the one sidecar patch primitive) — folderEntity keeps create/rename/move in main
// src/engine/disambiguate.ts — createDisambiguated (pure)
// src/engine/Connections/scan.ts, rewrite.ts — moved unchanged
// src/engine/CRUD/cascade.ts
export async function renameCascade(root: string, oldTitle: string, newTitle: string, opts?: { mentions?: readonly string[] | null; afterWrite?: (rel: string, content: string) => Promise<void> }): Promise<Result<{ touched: string[] }>>
//   mentions absent or null → corpusFilesUnder(root) (the phone's case); main passes queryMentions(oldKey) and an afterWrite running indexWrittenPage + noteValueWrite
// src/engine/CRUD/folderEntity.ts — createFolderEntity, renameFolderEntity, moveFolderEntity (host().mkdir / host().rename under host().lock; updateFolderSidecar from sidecarIO)
// src/engine/CRUD/trash.ts — mintBundle, settleBundle, writeRecord, gatherContentRecord(root, kind, abs, ensureId?: (absFolder: string) => Promise<void>) — a parent with no sidecar id and no ensureId records { kind: 'unaddressable' };
//   main passes ensureFolderId; plus isReservedRel(rel): rel === '' || NON_CORPUS_TOP.has(rel) || rel.startsWith(`${TRASH_DIR}/`) — mutate.ts keeps its realpath at the boundary and calls this on the rel
// src/main/provenance.ts — keeps restore, empty, list, rekey; imports the four from @engine/CRUD/trash
// src/main/CRUD/pageProperty.ts (new; the half that stays)
export async function updatePageProperty(absFile, def, value, world?): Promise<Result<Adoption[]>>
// src/engine/loadValues.ts
export async function loadValues(rootPath: string, files: readonly string[]): Promise<Record<string, PageValues>>
// src/main/CRUD/loadValues.ts — keeps corpus(); calls the engine with the file list
export async function loadValues(rootPath, containerRelPath, pageIds?): Promise<Record<string, PageValues>>
```

**Assumed by:** Task 38 (the phone's create, rename, delete, move, reorder, and body write), Task 13 (nothing; the apply never routes through these).

**Verify — automated**

- [ ] Full gate green; counts unmoved plus one (`page.test.ts` moves and gains the `createPageInOrder` case: `[NEW_PAGE_SLOT, existingId]` leaves `page_order` `[newId, existingId]`, a taken name lands as `Name 2`; `loadValues.test.ts` splits into an engine half taking a file list and a main half proving the corpus resolution, same total); `rg -n "createDisambiguated|setChildOrder" src/main/mutate.ts` → the createPage arm calls neither directly.
- [ ] `rg -l "from '(\.\./)*\.?/?(CRUD/page|CRUD/util|CRUD/loadValues|CRUD/reorder|disambiguate)'" src/main` → 0 excluding `pageProperty.ts` and `loadValues.ts` themselves; `rg -n "updateFolderSidecar" src/main/CRUD/folderEntity.ts` → 1 (the import). Control: `rg -l "updatePageProperty" src/main` → 6.
- [ ] `cascade.test.ts` moves and gains: with `mentions` null the corpus is walked (spy on `corpusFilesUnder` → 1 call) and `[[Old]]` in a page under a Set is rewritten; with `mentions` given the walk never runs. `trash.test.ts` (new, memory host): a delete of `Ideas/A.md` leaves `.trash/<stamp> A.md.bundle/{_record.json, A.md}` with `entity: 'page'` and `parent: { kind: 'container', id }`; a parent without a sidecar id records `unaddressable` when no `ensureId` is given and gains one when it is; `isReservedRel('.nexus')` and `('.trash/x')` true, `('Ideas')` false.
- [ ] `rg -l "from '(\.\./)*\.?/?(CRUD/cascade|CRUD/folderEntity|Connections/(scan|rewrite))'" src/main` → 0. Control: `rg -l "@engine/CRUD/trash" src/main` → 2 (`mutate.ts`, `provenance.ts`).
- [ ] `rg -n "from 'node:" src/engine -g '!*.test.ts'` → 0. Control as Task 33.

**Verify — user**

- [ ] *(none.)*

#### Task 35: The disk-to-tree patchers move behind a tree holder

**Requirement:** 1

**Why:** I-3 needs the phone to patch its tree per landed item through the desktop's own classification; those functions read the live tree through two module singletons, so they take a holder instead and main passes its own.

**Now** — `src/main/watchPatch.ts` 471 lines, 7 importers; the patchers close over `getLiveTree`/`patchLiveTree`:

```ts
// src/main/watchPatch.ts:222-228
export const applyPatch = (root: string, fn: (t: NexusTree) => NexusTree | null): 'ok' | 'refresh' => {
  if (getLiveTree()?.nexus.rootPath !== root) return 'refresh'
  return patchLiveTree(fn) === null ? 'refresh' : 'ok'
}
// exported: classifyEvent, touchesCorpus, applyWatchEvents, applyPatch, patchPageFromDisk, patchContainerFromDisk,
// patchSpaceFromDisk, patchSettingsFromDisk, patchTopOrderFromDisk, patchSpaceOrderFromDisk, patchHomepageFromDisk, patchCropsFromDisk
```

**Becomes** — the holder binds once per process like the host, so every patcher keeps its signature and main's callers keep their imports (now from the engine):

```ts
// src/engine/diskPatch.ts (new home; classifyEvent, WatchEvent, WatchClass, applyPatch, and every patch*FromDisk) + diskPatch.test.ts — named apart from @shared/treePatch, the pure node builders it imports
export interface TreeHolder {
  get(): NexusTree | null
  patch(fn: (t: NexusTree) => NexusTree | null): NexusTree | null
}
export function setTreeHolder(h: TreeHolder): void
export function classifyEvent(tree: NexusTree, root: string, ev: WatchEvent, scope: WatchScope): WatchClass
export const applyPatch = (root: string, fn: (t: NexusTree) => NexusTree | null): 'ok' | 'refresh'   // unchanged signature
export function patchPageFromDisk(root: string, rel: string): Promise<'ok' | 'refresh'>              // unchanged; the six others likewise
// src/main/liveTree.ts — bindLiveTree(): setTreeHolder({ get: getLiveTree, patch: patchLiveTree }); called beside bindNodeHost at boot and in the test setup
// src/main/watchPatch.ts — keeps applyWatchEvents, applyOne (index + history side effects), touchesCorpus; imports the patchers from @engine/diskPatch
```

**Assumed by:** Task 22 (the phone binds its own holder).

**Verify — automated**

- [ ] `watchPatch.test.ts` splits: classification and patch cases move to `diskPatch.test.ts` binding a memory holder in `beforeEach`; the `applyOne` side-effect cases stay. Total unmoved.
- [ ] Full gate green.
- [ ] `rg -n "getLiveTree|patchLiveTree" src/engine` → 0. Control: `rg -n "from '@engine/diskPatch'" src/main` → 3 or more (`watchPatch.ts`, `index.ts`, `mutatePatch.ts`).

**Verify — user**

- [ ] *(none.)*

#### Task 36: The api shape becomes a shared table

**Requirement:** 2

**Why:** The preload's hand-grouped `api` is the only definition of `window.nexus`'s shape; a second host cannot re-derive 150 keys without drifting. One table, two binders.

**Now** — `src/preload/index.ts` 195 lines; `rg -o "window\.nexus\." src/renderer | wc -l` → 216; `src/preload/index.d.ts` declares `Window.nexus: NexusApi` from the preload; `Scope` (17 members) lives in `src/main/Database/localState.ts:14-31`, a main-only module, and `index.ts:1125-1198` hand-wires each scope's get/set pair; 26 handlers carry `kind: 'menu'`:

```ts
// src/preload/index.ts:33-36
const api = {
  state: ask('nexus:state'),
  choose: ask('nexus:choose'),
  openDropped: (file: File) => ask('nexus:openPath')(webUtils.getPathForFile(file)),
// :143-148 personalization: { set: <K extends keyof Personalization>(key: K, value: Personalization[K]) => ipcRenderer.invoke('personalization:set', key, value) }
```

**Becomes**

```ts
// src/shared/nexusApi.ts (new) + nexusApi.test.ts
type Leaf = { ask: keyof Asks; menu?: true; raw?: true } | { tell: keyof Tells } | { on: keyof Pushes }   // menu: the reply is a picked action or null; raw: a bare value, never a Result (25 handlers today)
export const NEXUS_API = {
  state: { ask: 'nexus:state' }, choose: { ask: 'nexus:choose' }, openPage: { ask: 'page:open' },
  folds: { get: { ask: 'folds:get' }, set: { ask: 'folds:set' } },
  tableMenu: { ask: 'table-menu', menu: true },
  setEditorFormatState: { tell: 'editor:format-state' }, onMenuAction: { on: 'menu:action' },
  // …every key the preload holds today, in the same grouping; the table is the wire truth's shape
} as const
export interface Dialer {
  ask<K extends keyof Asks>(k: K): (...args: Asks[K]['args']) => Promise<Asks[K]['reply']>
  tell<K extends keyof Tells>(k: K): (...args: Tells[K]) => void
  on<K extends keyof Pushes>(k: K): (cb: (p: Pushes[K]) => void) => () => void
}
export interface HostExtras {
  openDropped(file: File): Promise<Result<boolean>>
  personalization: { set<K extends keyof Personalization>(key: K, value: Personalization[K]): Promise<Result<null>> }
}
export type NexusApi = Bound<typeof NEXUS_API> & HostExtras
export function buildApi(dial: Dialer, extras: HostExtras): NexusApi
export function menuAsks(): ReadonlySet<keyof Asks>      // derived from the table's menu flags
// src/preload/index.ts — the three dialers plus contextBridge.exposeInMainWorld('nexus', buildApi({ask, tell, on}, {openDropped, personalization}))
// src/preload/index.d.ts — imports NexusApi from '@shared/nexusApi'
// src/shared/localState.ts (new): the Scope union moves here from main, plus the one channel ↔ scope pairing
export type Scope = 'folds' | 'activeView' | 'viewOrder' | 'headingCols' | 'headingIcon' | 'citations' | 'embedHeights' | 'embedZooms' | 'aliases' | 'linkTitle' | 'blockDoc' | 'tabs' | 'windows' | 'recents' | 'record' | 'glancePane' | 'devicePrefs'
export const SCOPE_ASKS: Readonly<Record<Scope, { get?: keyof Asks; set?: keyof Asks }>>
// 13 entries carry channels: the 9 scopeGet/scopeSet pairs in index.ts (folds, embedHeights, embedZooms, activeView, viewOrder, headingCols, headingIcon, citations, aliases)
// and the 4 singleton rows with their own sanitizers (tabs: tabs:load/save · windows: windows:load/save · glancePane: glance:load/save · devicePrefs: devicePrefs:load/save);
// linkTitle, blockDoc, recents, record carry none (served raw or never by a renderer channel)
// src/main/Database/localState.ts imports Scope from shared; main's validators in index.ts stay where they are
```

**Assumed by:** Task 38 (the phone binds the same table).

**Verify — automated**

- [ ] Red first: `nexusApi.test.ts` — `buildApi` with a recording dialer yields every leaf as a function, nested groups intact, and calling `api.folds.get()` dials `'folds:get'`; `menuAsks()` has 26 members and `rawAsks()` 25, one per `kind: 'menu'` / `kind: 'raw'` handler (the counts re-derived: `rg -c "kind: 'menu'" src/main/index.ts`, `rg -c "kind: 'raw'"`); `SCOPE_ASKS` has 13 entries with channels and 4 without, every channel in `Asks` (a type-level check). Expect module-not-found, then green.
- [ ] Full gate green; `npm run typecheck:web` proves every renderer call site still types against the table (216 sites; a dropped key is a compile error).
- [ ] `wc -l src/preload/index.ts` → under 50. Control: `rg -c "ask: '" src/shared/nexusApi.ts` → 140 or more.
- [ ] The dev app launched once: boot, a page, a native menu, a settings toggle all work (preload does not hot-reload; restart the dev process).

**Verify — user**

- [ ] *(none — desktop behavior is unchanged.)*

#### Task 37: The asset scheme is installed by the host

**Requirement:** 2

**Why:** `assetUrl.ts` already names itself the one place a non-Electron host swaps; the phone needs to swap it without editing a renderer file.

**Now** — `rg -n "nexus-asset" src/renderer` → 2 (one comment); 7 importers of `assetUrl.ts`; two thumbnail sites build through raw `assetUrl` (`CardsView.tsx:87`, `NavGallery.tsx:114`):

```ts
// src/renderer/Assets/assetUrl.ts:10-11
export const assetUrl = (rel: string): string =>
  `nexus-asset://nexus/${rel.split('/').map(encodeURIComponent).join('/')}`
```

**Becomes**

```ts
// src/renderer/Assets/assetUrl.ts
export type AssetUrlBuilder = (rel: string) => string
const desktopAssetUrl: AssetUrlBuilder = (rel) => `nexus-asset://nexus/${rel.split('/').map(encodeURIComponent).join('/')}`
let builder = desktopAssetUrl
export function installAssetUrl(fn: AssetUrlBuilder): void
export const assetUrl = (rel: string): string => builder(rel)
```

**Assumed by:** Task 39.

**Verify — automated**

- [ ] `assetUrl.test.ts` gains: default builds the desktop scheme; after `installAssetUrl`, `resolveAssetUrl` and `assetUrl` use it; per-segment encoding still holds for `Draft #2.png`.
- [ ] Full gate green.

**Verify — user**

- [ ] *(none.)*

#### Task 38: The in-process api

**Requirement:** 6

**Why:** The renderer boots against `window.nexus`; the phone builds the same table (Task 36) over an in-process dialer that serves the v0 channels through the engine and refuses the rest through the shared envelope, menus answering null (A-7, D-1).

**Now** — `Mobile/src/host/session.ts` (Task 22) holds no tree; `src/engine/diskPatch.ts` (Task 35). Tier-A boot keys (scout 09-04-2026): `systemAccent`, `state`, `subfield.get`, `navViewModes.get`, `citations.get`, `linkTitles.get`, `activeViews.get`, `aliases.get`, `nav.read`, `windows.load`, `tabs.load`, `devicePrefs.load`, `assetMap`, and 13 `on*` subscriptions; `menuAsks()` and `SCOPE_ASKS` (Task 36).

**Becomes**

```ts
// Mobile/src/host/session.ts (Task 22) gains: tree(): NexusState; start() calls setTreeHolder(the phone's) first;
//   afterLanding(rel, kind): classifyEvent over { event: kind === 'remove' ? 'unlink' : 'change', absPath: join(root, rel) } → the matching patch*FromDisk(root, …);
//   'full-refresh' → one debounced readNexus; then emit 'nexus:changed' with the held tree
// Mobile/src/host/api.ts + api.test.ts
export function createPhoneApi(session: PhoneSession): NexusApi   // buildApi({ ask, tell, on }, extras)
// ask(channel): handled.get(channel) ?? (menuAsks().has(channel) ? () => null : rawAsks().has(channel) ? () => undefined : () => REFUSED)   where REFUSED = fail('operation-failed', 'Not available on this device.')
//   the raw channels the boot reads are handled explicitly rather than defaulted: 'linkTitles:get' → {} (nexusSlice.ts:105 stores the answer as the title cache)
// tell: every tell is a no-op; on: an in-process emitter per push channel, returning the unsubscribe
// handled: 'nexus:state' (session.tree() or { status: 'empty' } before a Nexus connects), 'assets:map' (engine buildAssetMap, Task 33),
//   'page:open' (engine readPage), 'page:updateBody' (engine updatePageBody; then session.noteOwnWrite(rel)),
//   'view:loadValues' (engine loadValues over corpusFilesUnder — a full scan; the phone has no index),
//   'mutate' for ops createPage (engine createPageInOrder), rename (renamePage or renameFolderEntity; a page rename then renameCascade with mentions null — the tile heal stays desktop),
//     delete for kinds page | collection | set (isReservedRel → refused; mintBundle → gatherContentRecord → writeRecord → settleBundle; Space and Context deletes REFUSED),
//     movePage, reorderChildren, reorderTop — every path checked by safeRel (Task 10) where the desktop realpaths; each op then session.noteOwnWrite for every file it wrote
//     (the page, the sidecar, the bundle's two files, every cascade-touched page); every other op REFUSED,
//   every SCOPE_ASKS get/set pair through state.ts (derived from the map, never listed by hand), plus 'subfield:get', 'navViewModes:get' (settings.json reads through the engine's readJsonObject) and their sets REFUSED,
//   'nav:read' (engine readNavigationFile, Task 33) and 'nav:write' REFUSED,
//   'theme:systemAccent' → null, 'history:list' / 'history:read' (remote versions only), 'account:*', 'sync:*' (Task 22), 'error:show' → console,
//   menus: 'context-menu' → presentRowMenu(contextMenuModel(target, creators), lastHoldPoint()) (Task 39), the pick run here — page-meta actions as contextMenu.ts maps them
//     (begin-rename, confirm-delete, open-in-new-tab, open-history, begin-icon, new-page-adjacent through the in-process emitter; move: → mutate; copylink/copypath → navigator.clipboard; window/reveal → no-op),
//     rename → emit begin-rename, delete → emit confirm-delete, create:<i> → mutate creators[i].req then begin-rename, lock → mutate setDisclosureLock, reveal → no-op;
//   'page-actions-menu' → presentRowMenu(pageMetaMenuSubset(ctx.actions, ctx.alreadyOpen), lastHoldPoint()); 'row-menu' → presentRowMenu(req.items, req.anchor ?? lastHoldPoint()); every other menu channel → null
// extras: openDropped → REFUSED; personalization.set → REFUSED
```

**Assumed by:** Tasks 22, 39.

**Verify — automated**

- [ ] Red first (`session.test.ts`, memory host, fake transport): a landing of `Ideas/A.md` patches the page node without a walk (spy on `readNexus` → 0 calls); a sidecar landing patches the container; a `.nexus/contexts.json` landing triggers one walk; three landings in one page trigger one `nexus:changed`. Then green.
- [ ] Red first: a `context-menu` ask with a page target presents `contextMenuModel`'s rows (the pane stubbed) and, picked `delete`, emits `confirm-delete` with the target; `mutate` rename on a page rewrites a sibling's `[[Old]]` (memory host) and notes every write; `mutate` delete leaves the bundle and notes both files; a `delete` of kind `space` answers `{ ok: false }`; a path failing `safeRel` answers `{ ok: false }` before any write. Every key the boot needs resolves to a function (the test walks `NEXUS_API` and asserts no leaf is undefined); each `on*` returns a function; an unhandled envelope channel answers `{ ok: false }` with the shared code; a menu channel answers null; an unhandled raw channel answers undefined and `linkTitles.get()` answers `{}`; `tabs.load()` answers `{ ok: true, value: null }` before any save and round-trips a saved set; `page:updateBody` writes through a memory host and notes the write; `mutate` `createPage` notes two own writes (the page and the sidecar). Then green.
- [ ] Full gate green.

**Verify — user**

- [ ] *(carried to Task 24.)*

#### Task 39: The renderer in the shell

**Requirement:** 6

**Why:** D-4 and A-9: the mobile entry installs the asset builder and the in-process api before rendering, `App.tsx` stays untouched, `MobileApp` mounts the desktop `App` and the floating bottom bar under the simplest reading of its taps, and a long press reaches the renderer's own menus (Ruling 8).

**Now** — `src/renderer/App.tsx` renders the shell; `styles.css:10-13` defines `--safe-*` with zero consumers; `Windows/WebWindow.tsx:66` `wv.getURL()`; `Sidebar/Ribbon.tsx:47-52` `onIcon`:

```ts
// src/renderer/Windows/WebWindow.tsx:66
if (wv && wv.getURL() !== url) void wv.loadURL(url)
```

**Becomes**

```tsx
// Mobile/src/main.tsx (Task 23) grows: installAssetUrl(rel => session.assetBase() + '/' + rel.split('/').map(encodeURIComponent).join('/'))
//   where assetBase() is Capacitor.convertFileSrc of the connected Nexus's Documents uri, resolved once at connect and read at call time (nothing is connected at boot);
//   window.nexus = createPhoneApi(session) before render; initNativeCaret()
// Mobile/src/MobileApp.tsx (Task 23) — the connected branch renders <App/> + <BottomBar/> in place of <Status/>; Status moves under Settings › General's Sync section (Task 15's rows, served by Task 38)
// Mobile/src/BottomBar.tsx — a floating Surface at the foot, padding-bottom var(--safe-bottom), five Buttons: Collections and Spaces (sidebarMode + show the sidebar),
//   Tabs (openNewTab), Navigation (toggleNav), Settings (toggleSettings) — Ruling 2: no Sync action, no Agenda; z-order below pickers, windows, confirmations (J-3)
// src/renderer/Windows/WebWindow.tsx:66 — `if (typeof wv?.getURL === 'function' && …)` so a host without <webview> stays blank (D-5)
// src/shared/contextMenu.ts (new) — the sidebar menu's rows stated once, in the order contextMenu.ts holds today
export type ContextMenuAction = PageMetaAction | PageMoveAction | 'open-new-tab' | `create:${number}` | 'rename' | 'delete' | 'lock' | 'reveal'
export function contextMenuModel(target: ContextTarget, creators: readonly Creator[]): ActionItem<ContextMenuAction>[]
//   page → pageMetaMenuItems(target.alreadyOpen, { window: true, newPages: 'pair', move: offersMove(target), clipboard: true, history: true, reveal: true });
//   else open-new-tab (when target.id) · create:<i> per creator · rename · delete · lock (sidebar collection/set; label by disclosureLocked) · reveal
// src/main/contextMenu.ts — its template is rowTemplate(contextMenuModel(target, await creatorsFor(…)), pick, target); the pick map (run / push / reveal / clipboard) stays; the hand-built items go
// src/renderer/Actions/RowMenuPane.tsx (new)
export function presentRowMenu(items: readonly ActionItem<string>[], at: MenuAnchor | { x: number; y: number }): Promise<string | null>
//   one MenuDropdown in a root-level portal from the existing kit (MenuItem, MenuSeparator, checked → the kit's mark, disabled, submenu → FrameSlide with a MenuTopRow back);
//   a pick resolves and unmounts; dismissal through the dismissal stack resolves null; the Bloom origin is `at`; a second call while one is up resolves the first null
// src/renderer/Interactions/hold.ts (new)
export function watchHold(el: HTMLElement, e: PointerEvent, opts: { holdMs: number; onHold: () => void }): { abort: () => void }   // cancels on ACTIVATION movement, pointerup, pointercancel
export function installHoldToContextMenu(root: HTMLElement, holdMs = 450 /* KNOB */): () => void
export function lastHoldPoint(): { x: number; y: number }
//   coarse pointers only; a hold with no move dispatches one synthetic `contextmenu` MouseEvent (bubbles, cancelable, clientX/Y) at the target, records the point, and calls navigator.vibrate?.(10);
//   styles.css: body { -webkit-touch-callout: none } beside the --safe-* block
// src/renderer/Interactions/gesture.ts — a pointer of type 'touch' activates through watchHold rather than distance: a move before the hold aborts (the scroll wins), a hold then a move drags,
//   a hold then an up is the context menu's (Ruling 8: hold lifts, release opens the menu, move drags)
// Mobile/src/main.tsx — installHoldToContextMenu(document.body) before render
```

**Verify — automated**

- [ ] `BottomBar.test.tsx`: five items, each dispatching its store action.
- [ ] `WebWindow.test.tsx` (new or extended): a bare element as the guest does not throw.
- [ ] Red first: `contextMenu.test.ts` (shared) — a page target yields the page-meta rows; a locked sidebar Set yields `Unlock Folder`; a Context group with one creator yields its `New <Singular>` row before Rename. `RowMenuPane.test.tsx` — a pick resolves its action and unmounts; Escape resolves null; a submenu row slides and its leaf resolves. `hold.test.ts` — a held touch pointer dispatches `contextmenu` once at its point; a move within holdMs dispatches nothing; a mouse pointer dispatches nothing. `gesture.test.ts` gains: a touch pointer moving before holdMs never activates; one holding then moving activates. Then green.
- [ ] `contextMenu.test.ts` (main, existing): the popped template's labels equal the model's in order. `rg -n "-webkit-touch-callout" src/renderer/styles.css` → 1.
- [ ] Full gate green.

- [ ] On the Simulator, after the port: the desktop's `page_order` for a folder reordered on the phone equals the container's; the desktop tree holds a title renamed on the phone and a page moved there; the phone delete's `.trash` bundle stands on the desktop; the renamed page's inbound link on the desktop reads the new title; `diffRoots` clean.

**Verify — user**

- [ ] Two screenshots: the sidebar's Collections mode with the fixture's Collection, the bottom bar's five items, a page open in MarkdownPM.
- [ ] A long press on a sidebar row opens its menu at the finger; Rename renames inline; Delete asks and trashes; a hold-then-drag reorders two pages; Move To ▸ moves one; a body edit typed on the phone reaches the desktop.

#### Gate 8 — the port holds, behavior unmoved

- [ ] Gate commands green, exit codes read directly; every original test unchanged in body except import paths.
- [ ] `rg -n "from 'node:" src/engine -g '!*.test.ts'` → 0; every Now count of Tasks 31–37 re-run against its control before its task began; counts matched, or the divergence rewrote the task.
- [ ] The hazard window from Task 32 closed (no main import of a moved symbol from its old path); the 216 `window.nexus.` sites still compile.
- [ ] The dev app launched once against a scratch copy: tree renders, a page opens, a body edit saves, an outside edit (`echo >> file`) reaches the tree, a rename lands. Killed after.
- [ ] Simplification and review dispatched against `<phase-8-base>..HEAD` scoped to `src/engine`, `src/main`, `src/shared/nexusApi.ts`, `src/shared/contextMenu.ts`, `src/preload`, `src/renderer/Assets`, `src/renderer/Actions/RowMenuPane.tsx`, `src/renderer/Interactions`, `src/renderer/Windows/WebWindow.tsx`, `Mobile/src`; the reports cite files inside it.
- [ ] Every concern fixed, or carrying a ruling in the Log.
- [ ] Task 39's user boxes closed; Task 26's clauses re-run with the port's additions.
- [ ] MobilePM, ArchitecturePM's engine section, Context, and the History entry rewritten for what the port made true; the closing sweep at zero against its control.
- [ ] Progress hashes filled in; line count reported. **Declared stop** at the end of the arc.

---

## Implementation Log

### Progress

- [ ] **Phase 1** — The host seam · base `<commit>`
  - [ ] Task 1 — The engine project, the host seam, and the Node binding · `<commit>`
- [ ] **Phase 2** — Pommora Sync, the server
  - [ ] Task 2 — The wire contract · `<commit>`
  - [ ] Task 3 — The server scaffold, its database, and its environment · `<commit>`
  - [ ] Task 4 — Accounts and device tokens · `<commit>`
  - [ ] Task 5 — Nexus', items, versions, and the change log · `<commit>`
  - [ ] Task 6 — The change feed and the container · `<commit>`
- [ ] **Phase 3** — The sync client in the engine
  - [ ] Task 7 — Nexus cryptography · `<commit>`
  - [ ] Task 8 — The sync manifest · `<commit>`
  - [ ] Task 9 — Sync state and the transport · `<commit>`
  - [ ] Task 10 — The sync run · `<commit>`
  - [ ] Task 11 — The integration suite, the headless client, and the fixture · `<commit>`
- [ ] **Phase 4** — The desktop client
  - [ ] Task 12 — The write funnel listener, the sync scope, and the secret seam · `<commit>`
  - [ ] Task 13 — The desktop sync session · `<commit>`
  - [ ] Task 14 — The account and sync channels · `<commit>`
  - [ ] Task 15 — Settings › General gains Account and Sync · `<commit>`
  - [ ] Task 16 — Remote versions in Page History · `<commit>`
- [ ] **Phase 5** — The mobile skeleton
  - [ ] Task 17 — The stale mobile build target retires · `<commit>`
  - [ ] Task 18 — The Mobile project · `<commit>`
  - [ ] Task 19 — The atomic-write plugin · `<commit>`
  - [ ] Task 20 — The Capacitor host · `<commit>`
  - [ ] Task 21 — Phone state, preferences, and the keychain · `<commit>`
  - [ ] Task 22 — Phone sync wiring · `<commit>`
  - [ ] Task 23 — The sign-in shell · `<commit>`
  - [ ] Task 24 — The Simulator boot · `<commit>`
- [ ] **Phase 6** — Acceptance
  - [ ] Task 25 — The NexusOS dry run · `<commit>`
  - [ ] Task 26 — Desktop and Simulator end to end · `<commit>`
  - [ ] Task 27 — The device path (Declared Stop) · `<commit>`
- [ ] **Phase 7** — Documentation
  - [ ] Task 28 — MobilePM and SyncPM · `<commit>`
  - [ ] Task 29 — The rewrites the arc made false · `<commit>`
  - [ ] Task 30 — History, Context, Handoff · `<commit>`
- [ ] **Phase 8** — The renderer port (behind a go)
  - [ ] Task 31 — The pure modules move · `<commit>`
  - [ ] Task 32 — The IO read chain and the JSON writers move · `<commit>`
  - [ ] Task 33 — Pages, sidecars, the registry, folder kind, and the walk move · `<commit>`
  - [ ] Task 34 — Page CRUD, the rename cascade, the trash writers, and the value batch move · `<commit>`
  - [ ] Task 35 — The disk-to-tree patchers move behind a tree holder · `<commit>`
  - [ ] Task 36 — The api shape becomes a shared table · `<commit>`
  - [ ] Task 37 — The asset scheme is installed by the host · `<commit>`
  - [ ] Task 38 — The in-process api · `<commit>`
  - [ ] Task 39 — The renderer in the shell · `<commit>`

### Rulings

Asked and answered 09-04-2026 (Nathan's call on each):

0. **The order (09-04-2026):** the arc runs its reversible, product-independent work first — Task 1, the server, the client, the desktop client, the phone as a Files-visible synced Nexus — and closes at Gate 7 as a complete arc. The read-chain moves and the renderer port are Phase 8, behind an explicit go and a phone product spec, because they are the one piece that cannot be walked back and the one that depends on what the phone is for.

1. **Account creation:** a Create Account action beside Sign In; the server's `SIGNUP=open|closed` env, default open.
2. **Bottom bar (Phase 8):** five items — Collections, Spaces, Tabs, Navigation, Settings. No Sync action (I-2's is withdrawn; the phone syncs on its own writes, resume, launch, and the feed, and Settings › General keeps Sync Now) and no Agenda placeholder. Taps as Task 39 states; nothing designed beyond the simplest reading.
3. **A text field row kind** in the Settings window on `InputField`.
4. **Page History rows** stay timestamp-only with remote and local merged.
5. **Phone create-page (Phase 8) writes the parent's `page_order`** exactly as the desktop does; `setChildOrder`, `updateFolderSidecar`, and `createDisambiguated` move into the engine (Task 34).
6. **Scratch Nexus'** only ever reach a throwaway server `DATA_DIR`, removed at closeout.
7. **OAuth (Google, Apple):** asked for if cheap; the planner's answer is that it is not — Sign in with Apple needs the paid program first, Google needs a Cloud console client, an auth-session browser flow with a deep-link return on both hosts, and server-side token verification — so it stays a Prospect behind the sign-in seam until the device install exists. Stands unless Nathan overrules.
8. **Phone mutations and menus (09-04-2026, Phase 8):** rename, delete of pages, Sets, and Collections, move, and reorder join v0 (A-7 restated); Space and Context deletes stay desktop-only. The phone reaches them through the renderer's existing menus: a long press dispatches the renderer's own `contextmenu`, the sidebar menu's rows are stated once in `src/shared/contextMenu.ts`, and one in-app row-menu pane drawn from the existing menu kit presents them; no menu is redesigned. Hold lifts, release opens the menu, move drags (the iOS convention). The list-menu generalization (every menu from one model, the 22 channels collapsing into `row-menu`, the desktop's in-app default) is deferred. New renderer pieces sit beside their kin (`Actions/`, `Interactions/`), which is where the renderer already keeps menus and gestures.

Review rounds: simplicity round 1 (09-04-2026) returned 20 findings; all folded, with one half-decline — `serveBridge`'s 26 handler kinds stay declared beside their handlers rather than deriving from the api table's `menu` flag, since a menu channel is already typed `X | null` and the two cannot drift without a compile error. Attack round 1 (09-04-2026) returned 17 findings (4 High: a populated reconnect resurrecting deletions, the mtime round-trip on APFS, the Docker build context, the absent `POMMORA_USERDATA`); all 17 folded. Two of its latent notes are accepted as outside this arc: `nexus.db` sitting inside an iCloud-synced root, and `record.ts`'s birth-time adjudication on a pulled file. Attack round 2 (09-04-2026) returned 8 findings (2 High: `rewritePreservingTimes` invisible to the change gate — the `forceHash` set; the desktop's sync rows carrying no Nexus id) and 2 unknowns (the cursor after a retain-only store; `Sync/package.json` in the image); all folded. A third round would exceed the two-agent cap per scope; Nathan decides whether the second round's severity earns one.

### Open Against Later Tasks

- **Tasks 8, 32, 35 — the Tiles arc** (in execution at `4a21b5c6`, 09-04-2026): `_tiles.json` lands as a synced sidecar with its own watcher classification; `blocks.ts` folds into `Tiles/`; the `.nexus/homepage` and Space `.md` ignore in `watcher.ts` may change. Re-derive before editing: the moving set's importers, `watchPatch.ts`'s classes, and whether the manifest test's block-body case still names the right paths.

### Deviations

Taken at planning against the decision log, each the simpler mechanism:

- **B-2 (path joins in the seam):** the engine owns `posixPath.ts`; the host seam carries no path operations. Every path the engine handles is POSIX on both hosts; main keeps `relPosix` for chokidar's absolute paths.
- **B-2 (setTimes in the seam):** folded into `applyRemote`; `rewritePreservingTimes` stays in main as Node.
- **B-2 (host threading):** the host is bound once per process (`setHost`) rather than passed through every signature; the moving set's 400-odd import sites change path only.
- **F-6 (the phone reads Last Modified from its sync record):** the atomic-write plugin sets the modification date, so the phone restores envelope mtime like the desktop and the base record is one shape on both hosts.
- **D-2 (the content index answers null on the phone):** `view:loadValues` full-scans through `corpusFilesUnder`; the index channels are not served at all in v0, which the renderer already reads as "no index".
- **I-3 (watchPatch's classification):** the classification and the patchers move into the engine behind a `TreeHolder` bound once per process (Task 35) rather than being copied to the phone.
- **C-4 (every non-hidden entry syncs):** the manifest is `neverWatched` with a top-level `.trash` admitted, so `node_modules` stays home like every other name the watcher never delivers (Task 8). NexusOS holds none.
- **I-2 (a Sync action in the bottom bar):** withdrawn by Ruling 2; Settings › General's Sync Now is the manual fallback on both hosts.
- **F-4 (a snapshot without tombstones):** the change log carries tombstones at every cursor, since tombstone heads are kept forever anyway; a self-sufficient snapshot is what makes a populated reconnect safe (Task 5, Task 10).
- **F-6 (the base compares against the envelope's time):** the base holds the disk's integer mtime read after each write; a raw APFS mtime never round-trips through `utimes`, so comparing to the envelope would re-hash every landed file on every sync (Task 1, Task 9).
- **A-7 (v0 scope):** restated by Ruling 8 — rename, delete of pages and containers, move, and reorder join v0; the phone reaches them through the renderer's existing menus and drags, never a new surface.
- **C-7 (no periodic sync):** the scheduler carries a 30 s sweep, because the desktop watcher never delivers an outside edit in an excluded folder, `.trash`, or a dot-folder, and those are in the manifest (Task 10).

### Lessons

### Sequenced After

- Watcher-driven reload of an open editor on an external or synced edit through `replaceBody` (H-4's successor; the two-host lost update in Context's Known Issues).
- Phone-side mutation parity, one module at a time into `src/engine` (properties, schema, Contexts, views, Space and Context deletes, restore, the tile heal on rename).
- The list-menu generalization: the nine main-assembled menu templates become shared models, the 22 per-surface menu channels collapse into `row-menu`, `presentRowMenu` becomes the desktop's in-app path with the Use Native Menus default flipped on so the desktop keeps its look, and the sidebar menu's pick is performed by the renderer on both hosts.
- A source label on Page History rows (local snapshot versus remote version), and remote history that survives a rename (the envelope carrying the prior item id).
- `startDesktopSync(root, win)` binds one window for its status push; a second window needs the push to fan out through the live-refresh transport the multi-window seam names.
- The block documents' sync classification once the Tiles plan lands `_tiles.json` (the watcher ignores `.nexus/homepage` and Space `.md` bodies today).
- OAuth providers behind the sign-in seam (Ruling 7: right after the device install, when the paid program exists); Argon2id or scrypt as a new Nexus KDF; chunked transfer; Postgres or a blob folder; multi-user Nexus' on the wrapped-key list; file coordination in the atomic-write plugin.

### Closeout

---

## Completion Criteria

**The directive**

```
Execute Mobile Companion & Pommora Sync — Implementation Plan. Live.
Live-verify: the Simulator screenshots at Gate 5 and the Files app holding the Nexus; the device install (Task 27) waits on the account. Phase 8 does not open without a separate go.
Screenshots: Gate 5 (the sign-in form, the status screen, the Files app); Task 26 (the desktop page after each cross-device clause); Phase 8, if opened: the tree, the bottom bar, a page open.
Pings: at every declared stop and at completion.
Record: PM-128 || Pommora Sync And The Mobile Companion.
Also: never open ~/NexusOS in a test instance; every run is the scratch copy on a throwaway DATA_DIR; the two foreign dirty renderer files are never touched; explicit paths only.
Everything else is the standard below.
```

**The Standard**

- **The bar.** Not doing the chores — doing the laundry, folding it, picking up what fell out of the hamper, emptying the lint trap, leaving no trace that anything went wrong. A future review of this arc finds nothing to correct.
- **Only the live confirmation may be pending.** No concerns carried, no "for a later session," no deferrals when the fix is known and could be done now. Where an item genuinely can't get there, the Log names which and why, and everything else is still finished.
- **Reusability first.** Search before writing. A second resolver, cache, or validator means the plan is wrong, or you are — log it before proceeding. Duplication is debt.
- **Fix at the source**, never down-river; leave a unified thing rather than stitched pieces. Add code only where it repairs something flawed or makes things simpler.
- **Ambiguity:** take the simplest reading, record it under Rulings or Deviations, continue. Execution does not stop for input except at a declared stop.
- **Per phase:** implement → simplify → comment pass → gates, exit codes read directly and never piped → code review → attack review → every finding fixed or carrying a defensible ruling → commit → ping. Simplification before review, never inverted. "Done with concerns" is unfinished work, and a result nobody watched happen is not a result.
- **Comments** only where the why can't be inferred. **Docs** stay clean and non-bloated; what went false gets rewritten, not amended. Unattributed doc or style edits mid-run belong to the user — fold them into the commit at hand, never revert them.

**Then tick these.**

**The deliverable**

- [ ] Every numbered requirement traces to a landed task.
- [ ] The acceptance criterion observed running, clause by clause, on the Simulator against the scratch copy.
- [ ] The integration suite's 18 scenarios green under `npm run test`.
- [ ] `npm run typecheck:engine` green with `types: []`; `rg -n "from 'node:" src/engine -g '!*.test.ts'` → 0.
- [ ] The container builds; `SIGNUP=closed` refuses registration.

**The passes**

- [ ] Simplification and the comment pass over the whole range, not only per phase.
- [ ] Simplification → code review over the full implementation in that order.
- [ ] Delivery Claim written, then checked by a neutral verifier against the decision log.
- [ ] Every finding from every pass fixed, or carrying a defensible ruling.

**The user's own pass**

- [ ] Settings › General: Account and Sync sections, every action and its inverse, against the local server.
- [ ] Page History listing a remote version and restoring it.
- [ ] The Simulator: the sign-in shell, the status screen, the Nexus in the Files app, a file edited there reaching the desktop after Pommora foregrounds. (Phase 8, if opened: the tree, a page, the bottom bar's five items, a body edit typed on the phone.)
- [ ] The device install after the account: Obsidian Sync off, `~/NexusOS` as the Nexus, the phone connected, an edit each way (Task 27, pending until then).

**The record**

- [ ] Documents made false rewritten in the commits that falsified them.
- [ ] The closing sweep at zero against its control.
- [ ] Context and Handoff current; the History entry written to its format.
- [ ] Lessons routed; successor work named in Sequenced After.

**The report**, in plain English — what shipped and why it matters · what happened along the way worth knowing · what any screenshot showed and what changed because of it · every gate's real output · in-flight decisions, a sentence or two each · what's left for the live pass · final +/- line count, comments and tests excluded. Honest about what didn't work.
