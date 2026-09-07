## A18 — Docs Reconciliation Audit

**Scope read:** `.claude/CLAUDE.md`, 18 `Features/*.md`, 4 `Guidelines/*.md`, `ContextPM.md`, `FrameworkPM.md`, `PommoraPRD.md`, `HandoffPM.md` (header, lines 1–20), `scripts/README.md`. Reference only: StudioMD, ClaudeOS.
**Source baseline:** `Pommora/src` — 1,012 files (321 tests). `src/main` 114 non-test `.ts`; `src/shared` 87 files; `src/renderer` 440 non-test `.ts/.tsx` outside `Showcase/` + `Testing/`.
**Method:** every file/dir claim checked case-exactly against a `find` inventory (macOS APFS is case-insensitive, so a naive `ls` passes `detect/` for `Detect/`); every identifier claim checked with fixed-string `grep` over `Pommora/src`; ambiguous words (`announce`, `reflow`, `ms`, `partial`) re-checked at definition level. 548 checks total.

**Classification key (§1):** **(a)** stays true under a host-neutral monorepo · **(b)** restates (restatement given) · **(c)** goes false.

---

### 1. Rule Ledger

#### 1.1 `.claude/CLAUDE.md` — Hard Rules, Codebase Information, Testing, Locked Decisions

| # | Rule (quoted) | Source | Class | Restatement / evidence |
| --- | --- | --- | --- | --- |
| 1 | "Pommora is an **Electron** desktop app." | CLAUDE.md:21 | (c) | Pommora becomes an engine (Core) + interface (UIX) mounted by hosts; Electron is the Desktop host. |
| 2 | "`lucide-react` (the curated icon registry — `PommoraUIX/Symbols`…)" | CLAUDE.md:21 | (a) | Path restates to the UIX workspace; `src/renderer/PommoraUIX/Symbols/` exists. |
| 3 | "**No dependency lock-in.** Every library sits behind a thin seam (SQLite behind `Database//driver.ts`, YAML behind `pageFile.ts`, IDs behind `ids.ts`, glass behind `Surface`)" | CLAUDE.md:23 | (a) | Verified: `src/main/Database/driver.ts`, `src/main/IO/pageFile.ts`, `src/main/ids.ts` exist. These seams are exactly where a Mobile host swaps `node:sqlite`/`fs`. |
| 4 | "**Main owns the filesystem.** All fs/Node lives in `src/main`, reached from the renderer only through the **narrow typed IPC** bridge in `src/preload` (contextBridge)." | CLAUDE.md:29 | (b) | *Core owns the filesystem behind one typed API; the interface reaches it only through a host adapter (Electron's is the preload/contextBridge).* Evidence: 0 `electron`/`node:` imports in `src/renderer`; 63 renderer files call `window.nexus.*` (218 sites); but the API type `NexusApi` is defined in `src/preload/index.ts:196` and the renderer compiles against `src/preload/index.d.ts` (`tsconfig.web.json:19`) — the contract's type currently lives inside the Electron host. |
| 5 | "**`src/shared/types.ts` is the cross-process contract.** No fs, no React there." | CLAUDE.md:30 | (a) | Verified: `types.ts` imports only sibling `shared/*` modules; the whole of `src/shared` has zero `electron`/`node:`/`react` imports. Word "cross-process" → "cross-boundary". |
| 6 | "**IPC never throws across the boundary** — data channels return the shared `Result` envelope… every channel is declared once in `src/shared/bridge.ts`; both sides derive from that map" | CLAUDE.md:31 | (b) | *The engine API never throws across a host boundary; data calls answer `Result`; the channel map is Core's and every host derives its transport from it.* Note `src/main/ipc.ts:41–56` has four handler kinds (`envelope`/`raw`/`menu`/`window`) and only `envelope` catches; `menu`/`window` inject a `BrowserWindow` — those two kinds are Desktop transport policy. |
| 7 | "**Read and write are cleanly separable.**" | CLAUDE.md:32 | (a) | Engine rule; host-independent. |
| 8 | "**Condensed control flow / DRY / simplicity-first**… never allow two writers or definitions for the same thing" | CLAUDE.md:33 | (a) | — |
| 9 | "**Never do expensive work "on every X," never "reload the entire Y."**" | CLAUDE.md:34 | (a) | — |
| 10 | "**Placeholders** never display build-status or meta text" | CLAUDE.md:35 | (a) | — |
| 11 | "**Ask before designing.**" | CLAUDE.md:36 | (a) | Process rule. |
| 12 | "**Most recent wins** is the primary philosophy around handling concurrency, cross-device, and external editing conflicts." | CLAUDE.md:37 | (a) | Becomes the Sync workspace's founding rule. |
| 13 | "**The visual iteration scratchpad** — `renderer/Utilities/iteration-window`, opened by ⌘⇧T" | CLAUDE.md:41 | (b) | Path only; it is a file (`iteration-window.tsx`), not a folder. ⌘⇧T is a Desktop binding. |
| 14 | "`npm run typecheck` is the *only* type gate — the build strips types unchecked — and it covers both `tsconfig` projects." | CLAUDE.md:43 | (b) | *The workspace-wide typecheck is the only type gate.* "Both tsconfig projects" (`tsconfig.node.json` + `tsconfig.web.json`) becomes N workspace configs. |
| 15 | "**Launch the GUI** — copy-paste, run from `Pommora/`… `env -u ELECTRON_RUN_AS_NODE npm run dev`" | CLAUDE.md:44–48 | (b) | Desktop-workspace command; the `ELECTRON_RUN_AS_NODE` trap is Electron-only. |
| 16 | "**Worktree Electron binary**…" | CLAUDE.md:49 | (b) | Desktop-only. |
| 17 | **Locked:** "**Reasonable Legibility:** The user's Nexus, its filesystem structure, and the general context… must be understandable through the filesystem structure itself" | CLAUDE.md:55 | (a) | About the Nexus on disk; host-independent. Core's rule. |
| 18 | **Locked:** "**Reasonable Translation:**… per-machine operational info… may be more appropriate to store in the `nexus.db`" | CLAUDE.md:56 | (a) | Core's rule; `nexus.db` stays device-local (Sync never carries it). |
| 19 | **Locked:** "**Single-window now, multi-window-ready seams** — data is main-owned + Query/store-cached per renderer; the live-refresh bus is a swappable transport; windows identified by serializable refs. No global singleton holding shared mutable client state." | CLAUDE.md:57 | (b) | *Data is Core-owned and cached per interface instance; the live-refresh bus is a swappable transport (a second host is the transport this seam was reserved for); windows identified by serializable refs.* "main-owned" is the Electron word. Evidence: the push is one `Tells`/push map in `src/shared/bridge.ts`; window refs (`WindowTarget`) live in `src/renderer/Store/windowSlice.ts`, not in `shared/types.ts` — the "serializable ref" is UIX-local today. |
| 20 | "**Mobile Companion:** A mobile companion app is a near-term focus" | CLAUDE.md:64 | (a) | Contradicted by FrameworkPM:41 (mobile "post-v1", see §1.4 #96). |

#### 1.2 `Features/ArchitecturePM.md` — every rule-shaped sentence

| #   | Rule (quoted)                                                                                                                                                                                                        | Line  | Class | Restatement / evidence                                                                                                                                                                                                                                                                                                                                                              |
| --- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----- | ----- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 21  | "this one is the map… and the home of the cross-cutting rules no single feature owns"                                                                                                                                | 3     | (a)   | —                                                                                                                                                                                                                                                                                                                                                                                   |
| 22  | "Pommora is two programs sharing one window."                                                                                                                                                                        | 7     | (c)   | *Pommora is an engine and an interface; a host mounts both.*                                                                                                                                                                                                                                                                                                                        |
| 23  | "The **main process** (`src/main/`) is the one that touches the computer: it reads and writes every file, owns the database, pops native menus, and creates windows."                                                | 7     | (b)   | Splits: files + database → Core; native menus + windows → Desktop. Evidence: of 114 non-test files in `src/main`, 29 import `electron`; 22 are `*Menu.ts` adapters; the other 7 are `index.ts`, `ipc.ts`, `menu.ts`, `webGuests.ts`, `watcher.ts` (type-only `BrowserWindow`), `linkTitles.ts` (`net`), `IO/thumbnails.ts` (`nativeImage`). 85 files are already host-neutral Node. |
| 24  | "The **renderer** (`src/renderer/`) is the React app inside the window… it cannot touch a file directly."                                                                                                            | 7     | (b)   | *The interface (UIX) is the React app; it reaches the engine only through the host adapter.*                                                                                                                                                                                                                                                                                        |
| 25  | "Between them sits a deliberately narrow **bridge** (`src/preload/`, typed by `src/shared/bridge.ts`)… every ask is declared in one shared contract both sides compile against."                                     | 7     | (b)   | *The bridge map is Core's; each host implements it (Electron: preload).*                                                                                                                                                                                                                                                                                                            |
| 26  | "Only main can act on the world, so every rule about files lives in exactly one process"                                                                                                                             | 7     | (b)   | *Only Core acts on the filesystem, so every file rule lives in one package.*                                                                                                                                                                                                                                                                                                        |
| 27  | "Every sidecar's field shape is canonical in `src/shared/schemas.ts`; every on-disk name both processes speak is in `src/shared/nexusPaths.ts`, and every absolute path main builds comes from `src/main/paths.ts`." | 57    | (b)   | Paths restate; "both processes" → "engine and every host". All three files verified.                                                                                                                                                                                                                                                                                                |
| 28  | "Folder kind is decided by one resolver, `src/main/folderKind.ts`."                                                                                                                                                  | 61    | (a)   | Path restates.                                                                                                                                                                                                                                                                                                                                                                      |
| 29  | "One predicate (`src/main/exclusion.ts`) is honored by the read walk, the adoption pass, the watcher, the content index's corpus, and every cascade"                                                                 | 71    | (a)   | —                                                                                                                                                                                                                                                                                                                                                                                   |
| 30  | "Assets are served to the renderer over the read-only `nexus-asset://` scheme."                                                                                                                                      | 75    | (c)   | The custom protocol is Electron's (`src/main/index.ts:203 ASSET_SCHEME`). `src/renderer/Assets/assetUrl.ts:1` already says "served by the main process **on desktop**". Restate: *a host serves Nexus assets read-only; Desktop uses `nexus-asset://`.*                                                                                                                             |
| 31  | "The read side is one eager, read-only walk in main — `readNexus`"                                                                                                                                                   | 81    | (b)   | "in Core".                                                                                                                                                                                                                                                                                                                                                                          |
| 32  | "There is no per-kind manager layer, no per-entity cache, and no dependency-injection graph."                                                                                                                        | 81    | (a)   | —                                                                                                                                                                                                                                                                                                                                                                                   |
| 33  | "Main reads its own settings from that tree — the labels a native menu shows, the zoom a window opens at, the exclusion list"                                                                                        | 81    | (b)   | *Desktop reads Core's live tree for its native chrome.*                                                                                                                                                                                                                                                                                                                             |
| 34  | "Every change funnels through one dispatcher, `mutate` in `src/main/mutate.ts`"                                                                                                                                      | 87    | (a)   | Path restates.                                                                                                                                                                                                                                                                                                                                                                      |
| 35  | "The write path never runs inside a read, and every write channel confirms itself"                                                                                                                                   | 87    | (a)   | —                                                                                                                                                                                                                                                                                                                                                                                   |
| 36  | Names · No empties · Foreign data survives · Governed keys · Sweeps and journals · Connections                                                                                                                       | 91–96 | (a)   | Pure Core rules.                                                                                                                                                                                                                                                                                                                                                                    |
| 37  | "Every file write goes through an atomic path… every read-modify-write runs under a lock keyed on the file it rewrites"                                                                                              | 100   | (a)   | —                                                                                                                                                                                                                                                                                                                                                                                   |
| 38  | "The locks are process state, and the app holds a single-instance lock, so a relaunch raises the existing window."                                                                                                   | 100   | (b)   | Single-instance lock is Electron's; *locks are per-host process state; cross-host conflicts fall to most-recent-wins.*                                                                                                                                                                                                                                                              |
| 39  | "Autosave belongs to one path-keyed flush registry shared by every editor host"                                                                                                                                      | 102   | (a)   | UIX rule.                                                                                                                                                                                                                                                                                                                                                                           |
| 40  | "`nexus.db` lives inside the Nexus… but it never syncs"                                                                                                                                                              | 108   | (a)   | Sync must honor it.                                                                                                                                                                                                                                                                                                                                                                 |
| 41  | "Out-of-band changes… reach the app… through a recursive watch on the Nexus root (`src/main/watcher.ts`)"                                                                                                            | 124   | (b)   | *Core defines the watch contract; Desktop supplies chokidar.* Mobile has no chokidar.                                                                                                                                                                                                                                                                                               |
| 42  | "Every in-app write records itself and the watcher skips recorded paths"                                                                                                                                             | 124   | (a)   | —                                                                                                                                                                                                                                                                                                                                                                                   |
| 43  | "**Kind authority is the folder's sidecar, and the file must agree with it.**"                                                                                                                                       | 130   | (a)   | —                                                                                                                                                                                                                                                                                                                                                                                   |
| 44  | "Four tiers… the Nexus's own files travel with it, its database stays on the machine that made it, the app's own preferences sit outside every Nexus, and everything else lasts the run."                            | 134   | (a)   | Tier 3 ("app's own preferences", `pommora.json`) is Desktop-owned; Mobile mints its own.                                                                                                                                                                                                                                                                                            |
| 45  | "Every channel between the window and main is declared once, in a types-only map (`src/shared/bridge.ts`)… The preload derives its entire API from that map… main registers every handler through one loop"          | 187   | (b)   | As #6/#25. `serveBridge` is `src/main/ipc.ts:34`.                                                                                                                                                                                                                                                                                                                                   |
| 46  | "Right-click menus are native and pop from main; click-driven menus are in-house and drawn by the renderer."                                                                                                         | 189   | (c)   | Universal form is false (no right-click on Mobile). *Where a host offers native context menus, they are built from Core's shared menu models (`src/shared/*Menu.ts`, 18 files); click-driven menus are UIX.* The 22 `src/main/*Menu.ts` adapters are Desktop.                                                                                                                       |
| 47  | "The renderer asks; main writes, confirms against its live tree, and when the tree moved pushes it whole to the window on one channel"                                                                               | 191   | (b)   | *The interface asks; Core writes and pushes to every mounted interface on one channel* — this is the "swappable transport" of #19.                                                                                                                                                                                                                                                  |
| 48  | "One Zustand store, `useSession`… composed from seven slice files under `src/renderer/Store/`… with `store.ts` composing them"                                                                                       | 195   | (a)   | UIX rule; the paths are stale (see §4: slice files are camelCase, `store.ts` sits at `src/renderer/store.ts`).                                                                                                                                                                                                                                                                      |
| 49  | "The store is per-window working state: main owns the data, and the store caches what main last confirmed."                                                                                                          | 195   | (b)   | "Core owns the data".                                                                                                                                                                                                                                                                                                                                                               |
| 50  | "A Collection renders through one pure pipeline… that… knows nothing about where they came from"                                                                                                                     | 199   | (a)   | `src/renderer/Views/Pipeline/` (9 pure modules) is a Core candidate despite living in the renderer.                                                                                                                                                                                                                                                                                 |
| 51  | "One `PageTile` renders a real page inside any foreign surface… Floating windows share one chassis, `WindowBase`"                                                                                                    | 203   | (a)   | UIX.                                                                                                                                                                                                                                                                                                                                                                                |
| 52  | "Live websites are webview guests governed by one main-side owner and one renderer adjudicator"                                                                                                                      | 203   | (c)   | `<webview>` is Electron-only (3 mount sites verified). Desktop rule; Mobile hosts its own web surface.                                                                                                                                                                                                                                                                              |
| 53  | "Every color, size, weight, and duration is a token defined once in TypeScript and republished as CSS variables"                                                                                                     | 205   | (a)   | —                                                                                                                                                                                                                                                                                                                                                                                   |
| 54  | "**Cross-device sync** — placing the Nexus in a synced folder gives device-to-device sync; real cloud sync is a long-term prospect."                                                                                 | 210   | (c)   | False once a Sync workspace exists.                                                                                                                                                                                                                                                                                                                                                 |

#### 1.3 `Guidelines/Development-Environment.md` — every rule-shaped sentence

| # | Rule (quoted) | Line | Class | Restatement / evidence |
| --- | --- | --- | --- | --- |
| 55 | "**`ELECTRON_RUN_AS_NODE` must be unset.**" | 7 | (b) | Desktop-only. |
| 56 | "**`src/main` and `src/preload` don't hot-reload.**" | 8 | (b) | *The Desktop host's main and preload don't hot-reload.* |
| 57 | "**Killing the dev wrapper orphans the app.**" | 9 | (b) | Desktop-only. |
| 58 | "**Worktree Electron binary**" | 10 | (b) | Desktop-only. |
| 59 | "**Don't auto-launch the GUI** — verify headlessly (`npm run typecheck && npm run build && npx vitest run`)" | 11 | (a) | Commands restate per workspace. |
| 60 | "**CDP-typing into the live editor writes to disk**… `window.nexus.*` is a frozen contextBridge object you cannot stub." | 12 | (c) | The "cannot stub" half goes false: a host-neutral UIX gets a stubbable adapter by construction. |
| 61 | "**CommonJS main/preload** — the package is intentionally not `type: module`" | 16 | (b) | Desktop workspace `package.json`; Core/UIX may be ESM. |
| 62 | "**Version pins: Vite 7 + `@vitejs/plugin-react` 5** — newer plugin-react needs Vite 8, which electron-vite 5 doesn't support" | 17 | (b) | The pin is electron-vite's; a Vite-only UIX/Showcase workspace is free of it. |
| 63 | "**vanilla-extract `*.css.ts` may only export serializable values**" | 18 | (a) | UIX. |
| 64 | "**A theme-contract change splits the dev server's brain.**" | 19 | (a) | UIX. |
| 65 | "**Never transition a property derived from an interpolating variable**" | 20 | (a) | — |
| 66 | "**The gates:** `npm run typecheck` (the only type gate… covering both tsconfig projects)…" | 24 | (b) | Per-workspace gates. |
| 67 | "native Electron menus are OS-level, so unit-test their models and leave the popup to a human" | 28 | (b) | Models are Core (`src/shared/*Menu.ts`, tested); the popup is Desktop. |
| 68 | Parallel Write Agents (commit early · ledger amend · no whole-tree git · one writer) | 36–39 | (a) | — |
| 69 | "**A store slice imports nothing that imports `store.ts`**" | 40 | (a) | UIX-internal. |
| 70 | "the single-instance lock lives in userData, so set `app.setPath('userData', …)`… at the top of `src/main/index.ts`" | 41 | (b) | Desktop. |
| 71 | "**A test nexus without `.nexus/nexus.json` is raw mode**… `refreshTree` joins an in-flight walk… use `refreshAfterWrite`" | 45 | (a) | Core. |
| 72 | SQLite length · `-wal`/`-shm` · null vs empty · containment · path normalizer | 46–50 | (a) | Core. |
| 73 | "**Only an `envelope`-kind IPC handler catches a throw into `{ok:false}`** — a `window`-kind handler is `return entry.fn(...)` with no net (`ipc.ts`)" | 51 | (b) | Verified `ipc.ts:41–56`. The kinds are Desktop's transport policy; the never-throws contract is Core's. |
| 74 | "`npm run lint` runs clean… a change that adds a diagnostic isn't done." | 55 | (a) | — |
| 75 | "Three rules are off in `biome.json`… `graphify-out/` is excluded" | 57 | (a) | Verified `biome.json:9`. |
| 76 | "**A control is a control**… through the single `Interactions/activate.ts` primitive" | 59 | (a) | UIX; file exists. |
| 77 | "**The drag handle already owns its keyboard**… Pass `itemRole` to `SortableZone`" | 60 | (a) | UIX; both identifiers exist. |

#### 1.4 Rule-shaped statements elsewhere in scope

| # | Rule (quoted) | Source | Class | Restatement / evidence |
| --- | --- | --- | --- | --- |
| 78 | "The build is React + Electron; the on-disk model, domain, and design values are stack-independent by design." | PRD:3 | (a) | Already anticipates the split. |
| 79 | "Personal-first, single-user, Mac-first for v1." | PRD:23 | (b) | "Mac-first" is the Desktop workspace's first target. |
| 80 | "Architected so future cross-device and cloud sync stay viable, but neither is a v1 concern." | PRD:25 | (c) | Once Sync is a workspace. |
| 81 | "Pommora is an Electron desktop app — a React + TypeScript renderer over a Node main process that owns the filesystem, bridged by a narrow typed IPC." | PRD:82 | (c) | See #1/#4. |
| 82 | "The main process is the sole filesystem owner; the renderer never touches Node." | PRD:86 | (b) | *Core is the sole filesystem owner; the interface never touches the OS.* |
| 83 | "**The database is off the read path and holds no content.**" | PRD:102 | (a) | — |
| 84 | macOS Integration / Distribution | PRD:180–186 | (b) | Desktop workspace concerns. |
| 85 | "the on-disk model… `.nexus/` … travels with the Nexus" | PRD:98 | (a) | Sync's payload boundary. |
| 86 | "Pommora heavily *prefers* even-factored scaling for all geometrical applications" | PommoraUIX:7 | (a) | UIX. |
| 87 | "`src/renderer/Interactions/` (hoisted to the renderer root, outside the design system)… fields and labels depend down into it, nothing reaches up." | PommoraUIX:353 | (a) | UIX layering rule; path restates. |
| 88 | "Every web surface is an Electron webview guest under one main-process governor, `src/main/webGuests.ts`… Exactly three renderer components mount a guest" | WebviewPM:3 | (b) | Desktop rule. Verified 3 `<webview` sites: `Tiles/Surfaces/WebTile.tsx`, `Interface/Glance/GlancePane.tsx`, `Windows/WebWindow.tsx`. |
| 89 | "Every web surface shares one persistent session partition per machine" | WebviewPM:21 | (b) | Desktop. |
| 90 | "Right-click anywhere in the editor opens the operating system's own menu… `src/main/editorMenu.ts` builds the native menu… The submenu models… are shared code both processes read" | MarkdownPM:83 | (b) | Popup is Desktop; models (`shared/pasteAsMenu.ts`, `gripMenu.ts`, `citationMenu.ts`) are Core. |
| 91 | "The document is the file · Display is not source · The editor sees only the body · Interface state stays out of the file" | MarkdownPM:9–12 | (a) | — |
| 92 | "It has no drag dependency; it is scoped to a known reality — Chromium-only, React-only" | PommoraDND:3 (also Dependencies:33) | (b) | "Chromium-only" holds only if Mobile is Chromium-hosted; PommoraDND:65 already lists Mobile readiness as pending. |
| 93 | "**Creation is right-click-first.**" | InterfacePM:29 | (c) | Universal form false on Mobile; *Desktop creation is right-click-first.* |
| 94 | "Cross-session, machine-local state in `pommora.json` under the app's userData directory (`src/main/appConfig.ts`)… never syncs." | ConfigurationPM:190 | (b) | Desktop per-device store; each host owns one. |
| 95 | "Use Native Menus… A machine-level preference, stored in the device database" | ConfigurationPM:22 | (b) | Desktop-only knob. |
| 96 | "Post-v1 — No phase commitments — Sub-pages… sync, mobile, and a plugin system" | FrameworkPM:41; PRD:205 | (c) | Contradicts CLAUDE.md:64 and PRD:23 ("near-term focus"); the roadmap places Mobile/Sync after v1. |
| 97 | "recents persist per machine, since two machines interleaving one history has no correct answer" | NavigationPM:14 | (a) | Sync must honor. |
| 98 | "A leaf that both the editor and a React surface call must import nothing from either." | Editor-Internals:27 | (a) | UIX. |
| 99 | "Fence pairing is one shared pass… the shared code module beside the mask the write side reads" | Editor-Internals:5 | (a) | `src/shared/markdownCode.ts` — a Core module the editor depends on; the one place UIX's editor grammar is Core's. |
| 100 | "**`node:sqlite`**… Ships inside Electron's own Node, so there is no native module to compile" | Dependencies:24 | (b) | The no-native-module argument is Electron's; Mobile plugs a different driver into `Database/driver.ts`. |
| 101 | "**chokidar 5** — filesystem watcher" | Dependencies:28 | (b) | Desktop. |
| 102 | "the engine knows nothing about what a tile holds or where the tree persists — hosts supply both through one props seam" | SurfacePM:3 | (a) | `src/renderer/Tiles/Core/` (7 pure tested modules) is that engine and is never named in the doc. |
| 103 | Web-Guests (entire doc) | Web-Guests:1–20 | (b) | Electron `<webview>` traps; Desktop-only. |

**Tally:** 103 rules — (a) 55 · (b) 38 · (c) 10. Every (c) is one of three shapes: "Pommora is Electron" (#1, #22, #81), "the OS/host affordance is universal" (#30, #46, #52, #93), or "sync/mobile is later" (#54, #80, #96). The (b) column is dominated by two word swaps — **main → Core** and **renderer → UIX/interface** — plus path prefixes.

---

### 2. Path Surface

Occurrence counts (not line counts). Columns overlap by design: a `Pommora/src/main/…` string counts under both `Pommora/src` and `src/main`; `renderer/<F>/` includes `src/renderer/<F>/`. **Bare-folder** = a backticked location starting with a known renderer/main/PommoraUIX folder name without the `src/…` prefix (e.g. `` `Windows/PageWindow.tsx` ``).

| doc | `Pommora/src` | `src/main` | `src/renderer` | `src/preload` | `src/shared` | `@shared` | `@renderer` | `renderer/<F>/` | `main/<F>/` | bare-folder |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| CLAUDE.md | 0 | 1 | 0 | 1 | 2 | 0 | 0 | 1 | 0 | 3 |
| Features/ArchitecturePM.md | 6 | 16 | 3 | 1 | 8 | 0 | 0 | 2 | 6 | 1 |
| Features/CollectionsPM.md | 0 | 3 | 1 | 0 | 1 | 0 | 0 | 1 | 2 | 0 |
| Features/ConfigurationPM.md | 0 | 1 | 0 | 0 | 1 | 0 | 0 | 0 | 0 | 0 |
| Features/ConnectionsPM.md | 0 | 1 | 0 | 0 | 3 | 0 | 0 | 0 | 1 | 1 |
| Features/ContextsPM.md | 0 | 1 | 0 | 0 | 1 | 0 | 0 | 0 | 1 | 0 |
| Features/PommoraUIX.md | 10 | 0 | 10 | 0 | 3 | 0 | 0 | 9 | 0 | 28 |
| Features/InteractionPM.md | 5 | 0 | 5 | 0 | 0 | 0 | 0 | 4 | 0 | 11 |
| Features/InterfacePM.md | 0 | 0 | 1 | 0 | 2 | 0 | 0 | 1 | 0 | 14 |
| Features/MarkdownPM.md | 1 | 1 | 3 | 0 | 0 | 0 | 0 | 3 | 0 | 21 |
| Features/NavigationPM.md | 0 | 0 | 1 | 0 | 1 | 0 | 0 | 1 | 0 | 4 |
| Features/NexusRecordPM.md | 0 | 2 | 0 | 0 | 1 | 0 | 0 | 0 | 0 | 0 |
| Features/PagesPM.md | 0 | 2 | 1 | 0 | 1 | 0 | 0 | 1 | 1 | 0 |
| Features/PommoraDND.md | 4 | 0 | 4 | 0 | 0 | 0 | 0 | 4 | 0 | 2 |
| Features/PropertiesPM.md | 0 | 2 | 1 | 0 | 3 | 0 | 0 | 1 | 1 | 0 |
| Features/SurfacePM.md | 0 | 1 | 3 | 0 | 3 | 0 | 0 | 3 | 0 | 2 |
| Features/SymbolsPM.md | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 5 |
| Features/ViewTypesPM.md | 5 | 0 | 12 | 0 | 2 | 0 | 0 | 12 | 0 | 2 |
| Features/WebviewPM.md | 0 | 1 | 1 | 0 | 1 | 0 | 0 | 0 | 0 | 2 |
| Guidelines/Dependencies.md | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 3 |
| Guidelines/Development-Environment.md | 0 | 2 | 0 | 1 | 0 | 0 | 0 | 0 | 0 | 1 |
| Guidelines/Editor-Internals.md | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 2 |
| Guidelines/Web-Guests.md | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| ContextPM.md | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 1 | 0 | 18 |
| FrameworkPM.md | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| PommoraPRD.md | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| HandoffPM.md (header, lines 1–20) | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| HandoffPM.md (whole file, for reference) | 7 | 2 | 2 | 0 | 2 | 0 | 0 | 1 | 0 | 0 |
| scripts/README.md | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| **Total (in-scope)** | **31** | **34** | **46** | **3** | **33** | **0** | **0** | **44** | **12** | **120** |

**Observations**

| Finding | Evidence |
| --- | --- |
| The docs never use the code's own aliases. `@shared` / `@renderer` appear 0 times in any doc while code uses them 942 / 1,197 times. Docs anchor on filesystem prefixes; code anchors on aliases. A restructure that keeps the alias names (`@core`, `@uix`…) touches every `src/…` string in the docs and none in the imports. | `tsconfig.web.json:14–15`, `tsconfig.node.json:11`, `vite.config.ts:12`, `vite.config.app.ts:14`, `vitest.config.ts:21`, `electron.vite.config.ts:9,13,17` — the aliases are declared at **7 sites** in 6 config files. |
| The hardest sweep class is the bare-folder token (120 occurrences), concentrated in PommoraUIX (28), MarkdownPM (21), ContextPM (18), InterfacePM (14), InteractionPM (11). They carry no prefix, so a `sed s#src/renderer#…#` misses them; they only break if the folder itself is renamed or re-nested. | §2 table; token dump below. |
| `Pommora/src/…` appears only inside `**SOURCE:**` lines (16 lines across 6 docs) and HandoffPM. Those SOURCE lines are machine-read by `.claude/scripts/check-atlas.mjs`, which also hardcodes `Pommora/src/renderer/PommoraUIX` at line 20. | `grep -c "SOURCE:"`: ArchitecturePM 2 · InteractionPM 3 · PommoraUIX 6 · MarkdownPM 1 · PommoraDND 2 · ViewTypesPM 2. |
| Hidden sed surface outside the docs: `.claude/scripts/loc.py:23 SRC = "Pommora/src"` and its `AREAS` map (lines 28–48) keyed by `renderer/…`/`main` prefixes — including six dead prefixes kept for `--history` (`renderer/SurfacePM`, `renderer/Blocks`, `renderer/Embeds`, `renderer/PagePreview`, `renderer/Components`, `renderer/Detail`); `comment-ledger.mjs:12` and `comment-manifest.mjs:13` import `../../Pommora/node_modules/typescript`; `vitest.config.ts:18` `setupFiles: ['src/renderer/Testing/setup.ts']`; `tsconfig.web.json:19` includes `src/preload/index.d.ts`. | Verified by grep. |
| Host vocabulary density (Electron · IPC · contextBridge · preload · main process · renderer · webview · BrowserWindow · native menu · main), per doc: ArchitecturePM 65 · ViewTypesPM 32 · Development-Environment 31 · CLAUDE.md 26 · Dependencies 19 · PRD 19 · PommoraUIX 16 · MarkdownPM 14 · WebviewPM 14 · ContextPM 12 · InterfacePM 10 · Web-Guests 8 · SurfacePM 7 · Collections 6 · Configuration 6 · Framework 5 · Connections 5 · Interaction 5 · DND 4 · Pages 3 · NexusRecord 3 · Navigation 3 · Properties 3 · Contexts 2 · Editor-Internals 1 · Symbols 0 · scripts/README 0. (ViewTypesPM's 32 is almost entirely the word "renderer" meaning *view renderer*, a vocabulary collision worth renaming before "renderer" stops meaning the Electron process.) | grep counts. |

**Bare-folder token dump (the exact strings a re-nesting must sweep)**

| Doc | Tokens |
| --- | --- |
| CLAUDE.md | `renderer/Utilities/iteration-window` · `PommoraUIX/Symbols` · `Database//driver.ts` |
| ArchitecturePM | `Windows/PageHistoryWindow.tsx` |
| ConnectionsPM | `MarkdownPM/autocomplete.ts` |
| PommoraUIX | `Util/`×2 · `Tokens/`×2 · `Buttons/button-base.css.ts`×2 · `shared/types.ts` · `Windows/window-base.tsx` · `Toolbar/` · `Tokens/theme-vars.css.ts` · `Tiles/tile-base.css` · `Tabs/` · `Tables/` · `Symbols/` · `Switches/` · `Sidebar/` · `Settings/IconPicker` · `Properties/Assignment/` · `Menus/menu-base.css.ts` · `Menus/` · `Labels/` · `Interactions/dismissalStack.ts` · `Glass/` · `Fields/` · `Elements/` · `Controls/` · `Cards/` · `Buttons/` |
| InteractionPM | `Animation/`×2 · `Sidebar/Sidebar.css` · `MarkdownPM/Styles.css` · `MarkdownPM/Editor/caret.ts` · `Interactions/` · `Interactions/ResizeFrame.tsx` · `PommoraUIX/Menus/frame-slide.tsx` · `Animation/useEntrance.ts` · `Animation/motion.ts` · `Animation/Reveal.tsx` |
| InterfacePM | `Windows/`×2 · `Windows/confirmations.ts` · `Windows/PageWindow.tsx` · `Windows/ConfirmationWindow.tsx` · `Toolbar/` · `Toolbar/Toolbar.tsx` · `Settings/SettingsWindow.tsx` · `Interface/` · `Interface/Subfield/` · `Interface/NotificationLabel.tsx` · `Interface/Glance/glanceAction.ts` · `Interface/Glance/` · `Interface/Glance/GlancePane.tsx` |
| MarkdownPM | `detect/`×4 · `input/`×2 · `tokens/` · `decorations/` · `connections/` · `editor/` · `editor/embedWidget.tsx` · `editor/embedRanges.ts` · `editor/citation*.ts` · `editor/blockModel.ts` · `editor/blockHandles.ts` · `editor/blockDrag.ts` · `shared/pasteAsMenu.ts` · `shared/gripMenu.ts` · `shared/citationMenu.ts` · `Tables/` · `MarkdownPM/Tables/` |
| NavigationPM | `Windows/` · `Tabs/tabsModel.ts` · `Tabs/` · `Interface/NavView.tsx` |
| PommoraDND | `Interactions/insertionDrag.tsx` · `Interactions/autoscroll.ts` |
| SurfacePM | `Tiles/tile-base.css` · `Tiles/Surfaces/` |
| SymbolsPM | `Symbols/index.tsx` · `Frames/SettingsFrame.tsx` · `Frames/LayoutFrame.tsx` · `PommoraUIX/Symbols/` · `PommoraUIX/Pickers/IconPicker` |
| ViewTypesPM | `Properties/Assignment/valueClick.ts` · `Interactions/ghostCreate.ts` |
| WebviewPM | `Windows/WebWindow.tsx` · `Tiles/Surfaces/webRetention.ts` |
| Dependencies | `interactions/drag.tsx` · `db//driver.ts` · `PommoraUIX/Symbols/` |
| Development-Environment | `Interactions/activate.ts` |
| Editor-Internals | `Interface/Glance/glanceAction.ts` · `Interface/Glance/GlancePane` |
| ContextPM | `renderer/Tiles/` · `main/index.ts` · `Windows/confirmations.ts` · `Windows/PageWindow.tsx` · `Windows/ConfirmationWindow.tsx` · `Utilities/NexusIconPicker` · `Tiles/` · `Sidebar/sidebarDndModel` · `Sidebar/` · `Settings/IconPicker` · `Properties/PageProperties.tsx` · `MarkdownPM/Tables/TableView.tsx` · `Interface/` · `Interface/NotificationLabel.tsx` · `Interactions/reorderModel` · `Interactions/gesture.ts` · `Interactions/ResizeFrame.tsx` · `PommoraUIX/Util/capMap.ts` |

---

### 3. Spine — Folder-Organized vs Feature-Organized

| Doc | Spine | Evidence | What a renderer re-nesting rewrites |
| --- | --- | --- | --- |
| **PommoraUIX** | **BY FOLDER** (declared) | Line 3: "one section per folder, one row per thing". Sections: Token Atlas (`Tokens/`), Glass (`Glass/`), Labels & Chips (`Labels/`), Elements (`Elements/`), Components → Controls/Pickers/Fields (`Controls/`, `Pickers/`, `Fields/`), Menus (`Menus/`), Composite Shells (app folders `Tiles/`, `Windows/`, `Sidebar/`, `Toolbar/`, `Tabs/`, `Cards/`, `Tables/`), Interactions (`src/renderer/Interactions/`), Animation (`src/renderer/Animation/`), Symbols (`Symbols/`), Util (`Util/`). One heading names a folder that does not exist (`### Components`, line 258 — no `PommoraUIX/Components/`). | The entire spine. Every H3 is a folder; the "hoisted to the renderer root" clauses (lines 3, 353, 373) describe today's nesting explicitly. |
| **ArchitecturePM** | **BY PROCESS/FOLDER** for §The Shape of the App (7), §The Process Boundary (185–191), §The Renderer (193–205); **BY FEATURE** for §Nexus Layout and §Data Layer | §The Renderer's five paragraphs map 1:1 onto `Store/`, `Tabs/`+`Navigation/`, `Views/`, `MarkdownPM/`, `Tiles/`+`Windows/`, `PommoraUIX/`. | §Shape, §Process Boundary, §The Renderer — roughly 40% of the doc. §Nexus Layout and §Data Layer survive intact (they are Core, organized by on-disk concern). |
| **MarkdownPM** | **BY FOLDER** for §Architecture (7); **BY FEATURE** for the rest | Line 7 walks each subfolder: `detect/`, `tokens/`, `decorations/`, `input/`, `Tables/`, `connections/`, `editor/` (all but `Tables/` spelled in the wrong case, and `Parser/` omitted). | One paragraph. |
| **InterfacePM** | **BY FEATURE, coincident with folders** | Line 3 maps the doc onto `Sidebar/`, `Toolbar/`, `Interface/`, `Interface/Glance/`, `Windows/`; the H3s (Toolbar, Sidebar, Subfield, Floating Windows, Glance Pane) mirror them 1:1. | The intro sentence only — unless `Sidebar/` folds into `Interface/` (ContextPM:34's open call), which changes nothing in the sections. |
| **NavigationPM** | **BY FEATURE, coincident with folders** | Line 3: "`src/renderer/Navigation/` for the layer, `Tabs/` for the tab model, and `Windows/` for the window." | Intro sentence only. |
| **InteractionPM** | **BY FEATURE** with per-file SOURCE anchors | §Primitives (31): "The interaction layer in `Interactions/` and `Animation/`"; three SOURCE tables name `Pommora/src/renderer/…` files. | SOURCE lines and line 31. |
| **PommoraDND** | **BY MECHANISM** with SOURCE anchors | Seam / Principles / Displacement / Insertion Line / Autoscroll; SOURCE lines at 7 and 40. | SOURCE lines. |
| **ViewTypesPM** | **BY FEATURE** with heavy path anchoring | Model / Creation / Pipeline / Surfaces / View Host / Table / Cards; 12 `src/renderer/…` references and two SOURCE tables. | Paths only; the H3s are user-visible things. |
| CollectionsPM · ContextsPM · PagesPM · NexusRecordPM · PropertiesPM · ConnectionsPM · ConfigurationPM · SurfacePM · SymbolsPM · WebviewPM | **BY FEATURE** | Sections mirror what the user or the file system shows (Sidecar, Writes, Surfaces, Provenance, Type Catalog, Settings frames, Tile Document…); paths appear inline as citations. | Inline citations only. |

**Net:** one doc's spine is the folder tree (PommoraUIX), one doc is 40% folder-spined (ArchitecturePM), one has a single folder paragraph (MarkdownPM §Architecture). Two more (InterfacePM, NavigationPM) coincide with folders by naming rather than structure. The remaining 13 are feature-spined and survive any re-nesting with a path sweep.

---

### 4. Staleness Probe

548 claims checked (files case-exact against the inventory; identifiers by fixed-string grep). Per doc the probe exceeded five claims everywhere (ArchitecturePM 55 · CollectionsPM 8 · ContextsPM 6 · PagesPM 5 · NexusRecordPM 6 · NavigationPM 6 · SurfacePM 13 · SymbolsPM 14 · WebviewPM 5 · PommoraDND 15 · ConnectionsPM 7 · InterfacePM 15 · InteractionPM 35 · PropertiesPM 11 · ConfigurationPM 64 · ViewTypesPM 32 · MarkdownPM 28 · PommoraUIX 180). **38 misses.**

#### 4.1 Misses by class

**(i) Casing — invisible on macOS, fatal on a Linux/Windows monorepo CI** (21)

| Claim | Doc:line | What exists |
| --- | --- | --- |
| `detect/` (×4), `tokens/`, `decorations/`, `input/` (×2), `connections/`, `editor/` | MarkdownPM:7, 16, 32, 56, 63, 69 | `Detect/`, `Tokens/`, `Decorations/`, `Input/`, `Connections/`, `Editor/` — every MarkdownPM subfolder is PascalCase. |
| `editor/embedRanges.ts`, `editor/embedWidget.tsx` | MarkdownPM:56 | `Editor/embedRanges.ts`, `Editor/embedWidget.tsx` |
| `editor/citation*.ts` | MarkdownPM:63 | `Editor/citationActions.ts` (and siblings) |
| `editor/blockModel.ts`, `editor/blockHandles.ts`, `editor/blockDrag.ts` | MarkdownPM:69 | `Editor/blockModel.ts`, `Editor/blockHandles.ts`, `Editor/blockDrag.ts` |
| `NexusSlice`, `NavigationSlice`, `WindowSlice`, `ChromeSlice`, `ConfigSlice`, `RenameSlice`, `CacheSlice` as "seven slice files under `src/renderer/Store/`" | ArchitecturePM:195 | Files are camelCase: `nexusSlice.ts`, `navigationSlice.ts`, `windowSlice.ts`, `chromeSlice.ts`, `configSlice.ts`, `renameSlice.ts`, `cacheSlice.ts` (the exported *types* are PascalCase, the files are not — the doc uses the type name as the file name). |
| `interactions/drag.tsx` | Dependencies:33 | `Interactions/drag.tsx` |

**(ii) Wrong folder** (6)

| Claim | Doc:line | What exists |
| --- | --- | --- |
| "`store.ts` composing them" under `src/renderer/Store/` | ArchitecturePM:195 | `src/renderer/store.ts` — at the renderer root, not inside `Store/` |
| `src/renderer/openWebLink.ts` | WebviewPM:17 | `src/renderer/Actions/openWebLink.ts` |
| `src/renderer/Properties/PropertyFrame.tsx` | PropertiesPM:108 | `src/renderer/Frames/PropertyFrame.tsx` |
| "the `src/Cards` chassis" · `src/Cards/cards.css` | ViewTypesPM:114, 130 | `src/renderer/Cards/cards.css` (line 132's SOURCE has it right) |
| `db//driver.ts` | Dependencies:24 | `src/main/Database/driver.ts` (CLAUDE.md:23 has it right) |
| `Settings/IconPicker` as a folder-shaped reference | PommoraUIX:301 | A file: `src/renderer/Settings/IconPicker.tsx` (harmless as a module path; listed for the sweep) |

**(iii) Names that do not exist** (7)

| Claim | Doc:line | What grep found |
| --- | --- | --- |
| `### Components` — "`Components/` — grouped as the ledger reads" | PommoraUIX:258 | No `PommoraUIX/Components/` folder; Controls/Pickers/Fields are siblings of Glass/Labels/Menus. The heading is a doc grouping presented as a folder. |
| `FooterMoreButton` | PommoraUIX:327 | `FooterLockButton` and `FooterIconButton` exist (`Menus/menu-row.tsx:258, 282`); no `FooterMoreButton`. |
| `ungrouped_order` | ViewTypesPM:44 | `ungrouped_placement` (`src/shared/views.ts:153, 290`). |
| `--ac-rows` on `.mdpm-ac` | MarkdownPM:174 | Neither `--ac-rows` nor `.mdpm-ac` in `Styles.css`; only `.mdpm-ac-slot` / `.mdpm-ac-match` (lines 949, 953). |
| `revealPageOffset` | ContextPM:67 | No match in `src` for `reveal*Offset` / `revealPage*`. |
| `page-properties.css` | ContextPM:65 | `src/renderer/Properties/page-properties.css.ts` — already migrated to `.css.ts`. |
| `renderer/Utilities/iteration-window` as a folder | CLAUDE.md:41 | A file pair `iteration-window.tsx` / `.css` (fine as a module path). |

**(iv) PRD vocabulary drift** (4 — the PRD describes a retired on-disk contract)

| Claim | Doc:line | Current truth |
| --- | --- | --- |
| "Task — Reminder-shaped `.md`, keyed `TaskID`" · "Event… keyed `EventID`" · "A content file stores it under a key that names its kind (`PageID` / `TaskID` / `EventID`)" · "**Tasks** (`.md`, `TaskID`)" | PRD:59–60, 71, 133–134 | One `ID` key with the kind marked in the ULID's 11th character (CLAUDE.md:17, ArchitecturePM:130). `src/shared/identity.ts:5` lists `PageID`/`TaskID`/`EventID` as `RETIRED_ID_KEYS`. |
| "parenthesized Context keys… `(Projects):`" (×4) | PRD:31, 74, 127, 144 | Angle-bracket keys `<Projects>:` (CLAUDE.md:7, ContextsPM:10, PropertiesPM:93). Zero `(Projects)` in `src`. |
| Type catalog: "**URL**… **Last Edited Time** (derived)" | PRD:142 | Features docs say **Link**, **Creation Time**, **Last Modified** (PropertiesPM:7–21); the code enum says `url`, `created_time`, `last_edited_time`, `datetime`, `multi_select` (`src/shared/properties.ts:7–19`). Three vocabularies for one catalog: PRD, Features, code. |
| "Columns — … Specified, not built." · "Homepage — one composed-blocks dashboard" | PRD:111, 66 | Tiles vocabulary replaced "blocks" (ContextPM:81); "composed-blocks" is the retired word. |

#### 4.2 Verified-true claims worth noting (would have been easy misses)

| Claim | Doc:line | Status |
| --- | --- | --- |
| `FloatingWindow.tsx` "are gone" | ContextPM:86 | Correctly absent. |
| `SCALE_STEPS` in `src/shared/types.ts`; `TILE_KINDS`, `TILE_SURFACES`, `copyEntry`, `mintSeed`, `_tiles.json`, `.tile-base` | SurfacePM:9, 17, 23 | All present. |
| All 61 personalization / settings keys in the Configuration tables | ConfigurationPM:13–186 | All 61 present in `src` (probe OK 64/64). |
| `serveBridge`, `rmwJsonStrict`, `noteValueWrite`, `replaceBody`, `capSet`, `webGuestMedia:pause`, `useHosts`, `armGlance`/`cancelGlance`/`GLANCE_DWELL` | ContextPM:19–91 | All present. |
| 177 of 180 PommoraUIX identifiers/files | PommoraUIX | Present — the atlas hook (`check-atlas.mjs`) is doing its job on the SOURCE tables; the misses are in prose rows outside them. |

#### 4.3 Folders the Features docs never name as a location

| Folder | Contents | Doc that should own it |
| --- | --- | --- |
| `src/renderer/Actions/` (13 files: `commands.ts`, `openWebLink.ts`, `nativeMenus.ts`, `selection.ts`, `pageMenuActions.ts`, …) | The renderer-side command/menu action layer | InterfacePM or ArchitecturePM §The Renderer — currently invisible; WebviewPM:17 mis-files its one member. |
| `src/renderer/Assets/` (`AssetImage`, `assetUrl.ts`, `imageAspect.ts`) | Asset URL + image element | PommoraUIX:260 names `AssetImage`/`imageAspect.ts` without the folder. |
| `src/renderer/Utilities/`, `Testing/`, `Showcase/` | Utilities · Vitest harnesses · deployed showcase | None; Showcase is ruled out of scope. |
| `src/renderer/MarkdownPM/Parser/` | The micromark/mdast seam | MarkdownPM:7 describes "the parser/seam" without naming the folder. |
| `src/renderer/Tiles/Core/` (`codec`, `edges`, `hitTest`, `model`, `ops`, `rects`, `snap`; all tested) | The pure split-tree engine | SurfacePM:3 describes it as "a pure split-tree model" without naming it — this is a Core-candidate module hiding in the renderer. |
| `src/renderer/Interface/InspectorPane/` | A component | InterfacePM:7, 82 say the inspector is "reserved… nothing reads or writes them yet" — a component exists. |

---

### 5. Doc-to-Workspace Map

Under a Core / UIX / Desktop / Mobile / Sync split. **Core** = engine + data model (today `src/main` minus its Electron residue, `src/shared`, and the pure modules hiding in the renderer). **UIX** = host-neutral React interface. **Desktop** = Electron host (window, protocol, native menus, preload, chokidar, `<webview>`, `pommora.json`). Mobile and Sync have no code today; the column records which docs bind them.

| Features doc | Core | UIX | Desktop | Mobile / Sync binds | Verdict |
| --- | :-: | :-: | :-: | --- | --- |
| ArchitecturePM | §Nexus Layout, §Data Layer (read/state, mutations, atomic write, DB, file history, adoption, persistence) | §The Renderer | §Shape of the App, §Process Boundary, §File Watcher (chokidar), `nexus-asset://`, single-instance lock, `pommora.json` | Sync: `nexus.db`/`versions.db` never sync; §Persistence tiers | **Cross-cutting** — the map. Splits cleanly at its own H3s. |
| CollectionsPM | ● | (Open In row, sidebar drag) | — | — | Core |
| ContextsPM | ● (§Registry, §Writes) | §Surfaces | — | — | Core (+ one UIX section) |
| PagesPM | ● | §Outline | — | — | Core |
| NexusRecordPM | ● | §Trash Frame paragraph | — | — | Core |
| PropertiesPM | §Type Catalog, §Identity & Values, §Schema Mutations, §Repair, §Validation | per-type editors, §Property Frame, §Labels | OS file dialog (§File) | — | **Cross-cutting** (model half / editor half) |
| ConnectionsPM | §Syntax + Scope, §Resolution (main half), §Rename Cascade | §Rendering, §Autocomplete, §Link Menu (rows) | native link menu popup | — | **Cross-cutting** |
| ConfigurationPM | the key roster (`Personalization`, sidecar keys, `settings.json`) | §Settings window frames | §App Configuration (`pommora.json`), Use Native Menus | Sync: which keys travel (`settings.json`) vs stay (`nexus.db`) | **Cross-cutting** |
| ViewTypesPM | §Saved-View Model, §Pipeline (pure; lives in `renderer/Views/Pipeline/` today) | §Surfaces, §View Host, §Table, §Cards | native column/cell menus | — | **Cross-cutting** (pipeline is Core-shaped code in the renderer) |
| SurfacePM | §Tile Document (`src/shared/tiles.ts`, `main/tiles.ts`), `Tiles/Core/` | §Embed Framework, §Tile Types (renderer table), §Surface Interaction | — | Sync: `_tiles.json` "most recent wins" (§Storage) | **Cross-cutting** |
| MarkdownPM | `src/shared/markdownCode.ts` (fence grammar) and the three shared menu models | everything else | §Context Menu + Shortcuts (native editor menu via `main/editorMenu.ts`) | Mobile: `index.tsx:262` already carries iOS soft-keyboard hints | UIX (+ one Desktop section) |
| InterfacePM | — | ● | native New/creation menus (§Creation), right-click-first | Mobile: no right-click | UIX |
| NavigationPM | `navigation.json` contract, `NavRef` | ● | — | Sync: pins/favorites travel, recents per machine | UIX (+ Core contract) |
| InteractionPM | — | ● | — | Mobile: touch pass pending (PommoraDND:65) | UIX |
| PommoraDND | — | ● | — | Mobile: "Chromium-only" assumption | UIX |
| PommoraUIX | `src/shared/theme.ts` (Spectrum, `DEFAULT_ACCENT`) | ● | — | — | UIX |
| SymbolsPM | — | ● | — | — | UIX |
| WebviewPM | `src/shared/webpageEmbed.ts` (grammar) | tile/glance/window components | ● `main/webGuests.ts`, `<webview>`, sessions, Web Window | Mobile: a different web surface | **Desktop** |

| Non-Features doc | Workspace |
| --- | --- |
| Guidelines/Development-Environment | Desktop + toolchain (§Running the GUI, §Toolchain are Electron; §Data-Layer Traps are Core; §Lint & Accessibility are UIX) — cross-cutting |
| Guidelines/Editor-Internals | UIX |
| Guidelines/Web-Guests | Desktop |
| Guidelines/Dependencies | Cross-cutting; §Distribution is Desktop |
| PommoraPRD | Cross-cutting product doc; §Stack, §MacOS Integration, §Distribution are Desktop |
| ContextPM · FrameworkPM · HandoffPM | Project-level; unchanged by workspace |
| scripts/README | Repo tooling; `loc.py` AREAS map and `check-atlas.mjs` paths need the sweep in §2 |

**Should `Features/` re-nest per workspace or stay flat with a tag?**

| Option | For | Against |
| --- | --- | --- |
| **Re-nest** (`Features/Core/…`, `Features/UIX/…`, `Features/Desktop/…`) | Mirrors the workspaces; a workspace that later becomes its own repo carries its docs with it. | 7 of 18 docs are cross-cutting at the section level (ArchitecturePM, PropertiesPM, ConnectionsPM, ConfigurationPM, ViewTypesPM, SurfacePM, MarkdownPM) — re-nesting forces splitting coherent feature docs along the process seam the restructure is trying to erase from the reader's view. Wiki-links (`[[InterfacePM]]`) resolve by basename so they survive, but `check-atlas.mjs` and the `Features/` references in `scripts/README.md:23`, Development-Environment:3, StudioMD all assume one flat folder. |
| **Stay flat + workspace tag** (a first-line `**WORKSPACE:** Core · UIX` label, or a table like this one in ArchitecturePM) | Zero churn to 13 feature-spined docs; cross-cutting docs declare two tags instead of being split; the tag is greppable. | The Desktop-only material (WebviewPM, Web-Guests, Development-Environment §Running the GUI, ArchitecturePM §Process Boundary) still sits beside host-neutral docs and reads as universal until the header is read. |

**Recommendation:** stay flat, tag every doc, and make two structural moves that the map above shows are overdue regardless of nesting: (1) split ArchitecturePM into the Core map (§Nexus Layout + §Data Layer + the cross-entity rules) and a Desktop host doc (§Shape of the App, §Process Boundary, §File Watcher, `nexus-asset://`, single-instance lock) — its own H3s already draw that line; (2) move WebviewPM + Web-Guests + Development-Environment §Running the GUI/§Toolchain under a Desktop tag so nothing Electron-shaped reads as a Pommora-wide rule. Re-nest only if a workspace is going to be extracted into its own repository, because that is the one case where the folder does work the tag cannot.

---

### Summary

The docs carry 103 architecture rules; 55 survive a host-neutral monorepo unchanged, 38 restate by two word swaps (main → Core, renderer → UIX) plus path prefixes, and 10 go false — all of the shape "Pommora is Electron," "the OS affordance is universal" (right-click menus, `nexus-asset://`, `<webview>`), or "sync/mobile is later." Code evidence backs the split: `src/shared` imports nothing from Electron, Node, or React; the renderer has zero Electron imports but 218 `window.nexus` calls whose type is defined inside the preload; 85 of `src/main`'s 114 files are already host-neutral Node, the other 29 being menu adapters and the window/protocol/watcher residue. The path sweep is 199 prefixed occurrences plus 120 bare-folder tokens, concentrated in PommoraUIX (the only folder-spined doc), MarkdownPM, InterfacePM, and ContextPM, plus hardcoded paths in `loc.py`, `check-atlas.mjs`, and the two comment scripts. Of 548 verified claims, 38 miss: 21 are casing errors invisible on macOS and fatal on Linux CI, 6 name the wrong folder, 7 name things that no longer exist, and the PRD still describes the retired `PageID`/`(Projects):` contract. Keep `Features/` flat with workspace tags; split ArchitecturePM at its own seams.
