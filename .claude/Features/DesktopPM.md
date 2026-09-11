## Desktop


What is true only because Pommora is running as a desktop app: the process that owns the machine, the window it draws into, native menus, the file watcher, and packaging. Per-domain depth lives in each domain's own document.

### The Shape of the App

Two programs share one window. The **host** (`Desktop/main.ts`) is the one that touches the computer: it creates the window, registers the `nexus-asset://` protocol, holds the single-instance lock, pops native menus, and implements the machine seam Core reads and writes files through. The **window** is the React app, drawing everything and holding the working state, unable to touch a file directly. Between them sits a deliberately narrow **bridge** (`Desktop/Bridge`, typed by `Core/Contract/bridge.ts`): the window asks, the host answers, and every ask is declared in one shared contract both sides compile against.

**Platform.** `Desktop/Platform` implements Core's machine seam — `nodeMachine.ts` for the filesystem over `node:fs`, `fileLock.ts` for the in-process advisory lock. `nodeMachine.test.ts` runs it against the `Machine` contract suite in `Core/Testing`, the same proof a second host applies to its own implementation.

**Bridge.** Every channel is declared once, in a types-only map (`Core/Contract/bridge.ts`): its direction, what it carries, and what it answers with. `Desktop/Bridge/preload.ts` derives the whole `window.nexus` dialer from that map with one dialer per declared name, and `ipc.ts` registers every handler through one loop that demands a handler per channel, so a channel on only one side or a drifted signature is a build error. Every channel answers with the `Result` envelope — the value, or a structured refusal naming what went wrong — and never throws across the boundary.

**The Push Path.** Change flows one way. The window asks; the host writes, confirms against its live tree, and when the tree moved pushes it whole to the window on one channel — the write-confirmation path and the watcher share that funnel. The window's structural-sharing pass then collapses unchanged subtrees to their previous identities, so an echoed push re-renders nothing and a real change re-renders only what moved.

### The Store

`Desktop/Store` is the SQLite seam. `driver.ts` wraps `node:sqlite` — Electron's own runtime, so there is no native module to rebuild — and `ddl.ts` holds the schema. `sessionDb.ts` opens `nexus.db` beside the Nexus for this machine's chrome and the content index; `versionsDb.ts` opens `versions.db` for page file history. Both sit inside the Nexus and travel with a moved one; the sync manifest excludes them. `stores.test.ts` runs the key-value, content-index, and snapshot stores against the store contract suites in `Core/Testing`, holding the SQL to the behavior any host's implementation must meet.

### The File Watcher

Out-of-band changes — Obsidian, vim, Finder, cloud sync — reach the app without a restart through a recursive watch on the Nexus root (`Desktop/FileWatch/watcher.ts`). The database and its WAL siblings, `.trash`, `node_modules`, dotfile cruft, block-host content folders, and the user's excluded folders are ignored at intake; `.nexus/` itself stays watched, since Contexts, settings, and ordering live there, and so does the asset directory. Every in-app write records itself and the watcher skips recorded paths, since in-app changes confirm through their own channels; between writes, the newest on-disk state wins. Events accumulate through a debounced settle, then classify: a page created, edited, or deleted, a sidecar edited, and the settings and homepage leaves each patch the live tree at the cost of one file read, an asset event patches that folder's listing, and everything unclassifiable — directory changes, the registries, orderings, a sidecar appearing or vanishing — falls back to one verification walk that re-parses only entries whose mtime or size changed. Identity survives an external rename because the id rides in the file itself.

### Actions

The host answers one `menu` channel, and `menu.ts` is the one popper behind it: it takes the row model any Core menu emits, converts it to an Electron template, pops it under the anchor the request carries or at the cursor when it carries none, and resolves to the action chosen or to nothing. Every menu in the window opens through one door, which decides what reaches the channel: a press with no trigger element — every right-click on content — always pops natively, while a menu hanging from a control pops natively only while Use Native Menus is on and otherwise draws in the window's own presenter, which the host never sees. `appMenu.ts` builds the application menu, `editorMenu.ts` builds the editor's context menu from a snapshot of editor state, and `returningMenu.ts` is the pop-and-resolve primitive under them. Both spell their accelerators from Core's one chord table, read once per menu refresh, and the labels and gating live in Core's tested models, so the window and the host cannot disagree about what a menu says or what a shortcut is.

### Web

`Desktop/Web/webGuests.ts` owns every `<webview>` guest: one shared session partition, media pause and resume for retention, popup denial routed back to Core's link adjudicator, and zoom. `linkTitles.ts` fetches a URL's page title once and caches it → [[WebviewPM]]

### Capture

`Desktop/Capture/thumbnails.ts` renders a page to an offscreen image for the Navigation gallery's card previews.

### Config

`Desktop/Config/appConfig.ts` reads and writes `pommora.json` in the app's own support folder — the last Nexus opened, the recent list, the trash mode, and the device. It belongs to the app rather than to any Nexus, so it holds no matter which one is open. `interfaceScale.ts` maps the Interface Scale setting onto Electron's zoom factor.

`secrets.ts` holds the values the config must not carry in the clear: `secrets.json` sits beside `pommora.json` and each value is encrypted by the OS keychain through Electron's `safeStorage`, so the config file itself stays hand-readable. `device.ts` mints one Ed25519 key per install through WebCrypto — the public half, its SHA-256 fingerprint as the device id, and the machine's hostname go into `pommora.json`, the PKCS8 private half into the secret store, and the key lives on in the host process as a `CryptoKey` the module never hands out. A config naming a key the secret store no longer holds is a lost identity: the host reports it once and mints again; a key the store holds but cannot decrypt leaves the launch identity-less and reported, and the files untouched. The host hands the result to Core as two `HostContext` members, `device` — id, public key, name, `sign`, and `rename` — and `transport`, which sends one HTTP request over Electron's `net.fetch` and answers with the status and body. The private key never leaves the host; Core sees a base64url signature.

### Packaging

`electron.vite.config.ts` builds the three bundles — main, preload, renderer — and `electron-builder.yml` packages them, taking its build resources from `Desktop/build/` and flipping Electron's Node-surface fuses off in the packaged binary alone. Core and UIX are `devDependencies` of Desktop rather than dependencies, because electron-vite externalizes every runtime dependency and Electron's own Node refuses TypeScript under `node_modules`; as dev dependencies they are bundled instead, from source.

### Renderer

`Desktop/Renderer` is the entry point alone: `index.html`, `main.tsx` mounting Core's `App`, the drag-region style, and the Vite environment types.
