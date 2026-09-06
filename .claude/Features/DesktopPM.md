## Desktop

**Workspace:** Desktop

The Electron host: the process that owns the machine, the window it draws into, and everything true only because Pommora is running as a desktop app. Core is the engine it mounts and knows nothing of Electron; this document covers the host around it. Per-domain depth lives in each domain's own document.

### The Shape of the App

Two programs share one window. The **host** (`Desktop/main.ts`) is the one that touches the computer: it creates the window, registers the `nexus-asset://` protocol, holds the single-instance lock, pops native menus, and implements the machine seam Core reads and writes files through. The **window** is the React app: Core's interface plus the UIX kit, drawing everything and holding the working state, unable to touch a file directly. Between them sits a deliberately narrow **bridge** (`Desktop/Bridge`, typed by `Core/Contract/bridge.ts`): the window asks, the host answers, and every ask is declared in one shared contract both sides compile against.

**Platform.** `Desktop/Platform` implements Core's machine seam — `nodeMachine.ts` for the filesystem over `node:fs`, `fileLock.ts` for the cross-process advisory lock. Nothing else in the repository imports `node:` or `electron` outside `Desktop/`.

**Bridge.** Every channel is declared once, in a types-only map (`Core/Contract/bridge.ts`): its direction, what it carries, and what it answers with. `Desktop/Bridge/preload.ts` derives the whole `window.nexus` dialer from that map with one dialer per declared name, and `ipc.ts` registers every handler through one loop that demands a handler per channel, so a channel on only one side or a drifted signature is a build error. Requests that read or write data always answer with the `Result` envelope — the value, or a structured refusal naming what went wrong — and never throw across the boundary; a few channels answer more plainly, such as a menu resolving to the action chosen or to nothing, and each declares that beside itself.

**The Push Path.** Change flows one way. The window asks; the host writes, confirms against its live tree, and when the tree moved pushes it whole to the window on one channel — the write-confirmation path and the watcher share that funnel. The window's structural-sharing pass then collapses unchanged subtrees to their previous identities, so an echoed push re-renders nothing and a real change re-renders only what moved.

### The Store

`Desktop/Store` is the SQLite seam. `driver.ts` wraps `node:sqlite` — Electron's own runtime, so there is no native module to rebuild — and `ddl.ts` holds the schema. `sessionDb.ts` opens `nexus.db` beside the Nexus for this machine's chrome and the content index; `versionsDb.ts` opens `versions.db` for page file history. Both sit inside the Nexus and travel with a moved one, and neither ever syncs.

### The File Watcher

Out-of-band changes — Obsidian, vim, Finder, cloud sync — reach the app without a restart through a recursive watch on the Nexus root (`Desktop/FileWatch/watcher.ts`). The database and its WAL siblings, `.trash`, `node_modules`, dotfile cruft, block-host content folders, and the user's excluded folders are ignored at intake; `.nexus/` itself stays watched, since Contexts, settings, and ordering live there, and so does the asset directory. Every in-app write records itself and the watcher skips recorded paths, since in-app changes confirm through their own channels; between writes, the newest on-disk state wins. Events accumulate through a debounced settle, then classify: a page created, edited, or deleted, a sidecar edited, and the settings and homepage leaves each patch the live tree at the cost of one file read, an asset event patches that folder's listing, and everything unclassifiable — directory changes, the registries, orderings, a sidecar appearing or vanishing — falls back to one verification walk that re-parses only entries whose mtime or size changed. Identity survives an external rename because the id rides in the file itself.

### Actions

Right-click menus are native and pop from the host. `rowMenu.ts` is the one popper: it takes the row model any Core menu emits, converts it to an Electron template, pops it, and resolves to the action chosen or to nothing. `appMenu.ts` builds the application menu, `accelerators.ts` maps Pommora's chords to Electron accelerators, `editorMenu.ts` builds the editor's context menu from a snapshot of editor state, and `returningMenu.ts` is the pop-and-resolve primitive under them. The labels and gating live in Core's tested models, so the window and the host cannot disagree about what a menu says. A host without a popper answers the same channel with the in-app presenter instead → [[InterfacePM]]

### Web

`Desktop/Web/webGuests.ts` owns every `<webview>` guest: one shared session partition, media pause and resume for retention, popup denial routed back to Core's link adjudicator, and zoom. `linkTitles.ts` fetches a URL's page title once and caches it → [[WebviewPM]]

### Capture

`Desktop/Capture/thumbnails.ts` renders a page to an offscreen image for the Navigation gallery's card previews.

### Config

`Desktop/Config/appConfig.ts` reads and writes `pommora.json` in the app's own support folder — the last Nexus opened, the recent list, the trash mode, the shell's pane widths, and Use Native Menus. It belongs to the app rather than to any Nexus, so it holds no matter which one is open. `interfaceScale.ts` maps the Interface Scale setting onto Electron's zoom factor.

### Packaging

`electron.vite.config.ts` builds the three bundles — main, preload, renderer — and `electron-builder.yml` packages them, taking its build resources from `Desktop/build/` and flipping Electron's Node-surface fuses off in the packaged binary alone. Core and UIX are `devDependencies` of Desktop rather than dependencies, because electron-vite externalizes every runtime dependency and Electron's own Node refuses TypeScript under `node_modules`; as dev dependencies they are bundled instead, from source.

### Renderer

`Desktop/Renderer` is the entry point alone: `index.html`, `main.tsx` mounting Core's `App`, the drag-region style, and the Vite environment types. Everything it mounts is host-neutral.
