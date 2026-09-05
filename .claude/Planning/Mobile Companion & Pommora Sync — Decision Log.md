## Mobile Companion & Pommora Sync — Decision Log

### Frame

- **Purpose:** Seed the Pommora mobile companion (iOS, Capacitor, the existing renderer and CSS) and Pommora Sync, the app's own file synchronization, so a phone holds a full copy of a Nexus and reconciles it with the desktop's origin folder through a Pommora-owned server. V0 establishes the long-term architecture; its interface is minimal by ruling.
- **Core Value:** `~/NexusOS` on the Mac and the copy on the iPhone stay one set of files, deletions and trash included, with Obsidian Sync off and the desktop folder never moving.
- **Success Criteria:** The companion runs on Nathan's iPhone (a paid developer account assumed for the install; the Simulator gates every step before it), Obsidian Sync is off, and `~/NexusOS` on the desktop and the phone's copy are the same files: an edit on either side reaches the other while both are open without a manual action, a desktop deletion, a desktop trash restore, and a phone-created page each cross, and a device closed during the other's edits catches up when it reopens. The end-to-end criterion is observed first on the Simulator against a server on localhost, then on the phone against a deployed server.

### Sources

- [[ArchitecturePM]] — the two-process shape, the bridge, the watcher (`src/main/watcher.ts`), the persistence tiers; "Cross-device sync — placing the Nexus in a synced folder gives device-to-device sync; real cloud sync is a long-term prospect" goes false.
- [[PommoraPRD]] §Audience, §Core Constraints — "cloud-sync-ready", "a mobile companion app is a near-term focus"; the storage philosophy sync must preserve byte-for-byte.
- [[ConfigurationPM]] §General — the Settings leaf that gains Account and Sync rows.
- [[Dependencies]] — the vetted library catalog; every new library sits behind a seam.
- [[Development-Environment]] — gates, parallel-writer rules, CDP limits (none of which reach WKWebView).
- `Pommora/src/shared/bridge.ts` — the one channel map; the mobile host implements the same `Asks` surface in-process.
- `Pommora/src/preload/index.ts` — the hand-grouped `api` object whose shape `NexusApi` is; a second host needs the grouping shared.
- `Pommora/src/main/ipc.ts` — `serveBridge` and the `BridgeAsks` handler-map type the mobile host mirrors.
- `Pommora/src/main/readNexus.ts`, `readPage.ts`, `IO/pageFile.ts`, `IO/walk.ts`, `IO/atomicWrite.ts`, `sidecarIO.ts`, `IO/propertiesRegistry.ts`, `folderKind.ts`, `ids.ts`, `paths.ts`, `walkCache.ts`, `IO/fileLock.ts`, `CRUD/page.ts`, `CRUD/loadValues.ts` — the read-and-page-write chain, Node-bound only through readFile, readdir, stat, exists, path joins, `createHash`, `AsyncLocalStorage`, and `write-file-atomic`.
- `Pommora/src/main/Database/localState.ts` — the scope/key store the phone mirrors as JSON files under its `Library/` folder.
- `Pommora/src/main/index.ts` — `nexus:state`, `page:open`, `page:updateBody`, `assets:map`, `view:loadValues`, `mutate` handlers the mobile host re-serves.
- `Pommora/src/renderer/Assets/assetUrl.ts` — the `nexus-asset://` scheme, commented as the one place a non-Electron host swaps.
- `Pommora/src/renderer/styles.css` — the ratified safe-area variables.
- `Pommora/vite.config.app.ts` — the standalone renderer build that has stood as "the mobile/web build target" since July; it aims at the Electron entry and cannot boot without `window.nexus`.
- `Pommora/src/renderer/Sidebar/Ribbon.tsx` — the five ribbon keys the bottom bar mirrors (navigation, agenda, contexts, collections, settings).
- `Pommora/biome.json`, `tsconfig.web.json`, `tsconfig.node.json` — the gates a `Mobile//` and `Sync//` package must join.
- `~/NexusOS/.obsidian/core-plugins.json` — `"sync": true`: Obsidian Sync carries NexusOS to the phone today, from `~/NexusOS`, with no folder move.
- Obsidian help, *Sync settings and selective syncing* — every dot-prefixed file or folder except `.obsidian` is excluded; sync runs only while Obsidian is open.
- Obsidian help, *Security and privacy* — remote-vault E2E: scrypt key derivation, AES-256-GCM, password never stored, no recovery.
- Obsidian help, *Set up Obsidian Sync* — the account lives in Settings › General › Account; the encryption password is per remote vault and separate from the account.
- Joplin, *Synchronisation* and *Synchronisation locks* — a `Synchronizer` over a `SyncTarget` abstraction; per-item `sync_time` state; sync and exclusive locks with refresh and timeout; `info.json` carrying the target version and E2EE keys.
- Remotely Save, *Sync Algorithm V3* — keep-newer conflict rule; true deletion status computed from a prior-sync record.
- Capacitor docs — Capacitor 8 (Xcode ≥ 26, iOS 15 target, SPM default), Filesystem over absolute `file://` URIs, `readdir` returning mtime and size, `UIFileSharingEnabled` + `LSSupportsOpeningDocumentsInPlace` to expose Documents in Files.
- `Pommora/src/shared/nexusPaths.ts` — `NON_CORPUS_TOP`, the asset and thumbnail roots; thumbnails are named a synced folder.
- `Pommora/src/main/watchPatch.ts:250` — `noteExternalEdit`, the capture an outside edit earns; a sync landing rides it.
- `Pommora/src/renderer/Store/navigationSlice.ts` — `replaceBody`, wired only to snapshot restore today.
- `~/NexusOS/.nexus/nexus.json` — the Nexus id the remote vault keys on.
- [[Mobile Companion & Pommora Sync — Research]] — the outward research annex: sixteen questions with claims, sources, and unresolved points; the entries above cite it by section.
- Toolchain (checked 09-04-2026): Xcode 26.6, Node 24, no CocoaPods, iOS 26.5 Simulator runtime installed this session, zero signing identities, no paid Apple Developer membership.

### Decisions

#### A — Product Frame

- **A-1:** [confirmed] Pommora Sync is Pommora's own; Obsidian Sync is prior art to borrow from, never a dependency. The end state lets Obsidian Sync be switched off.
- **A-2:** [confirmed] The desktop folder is the origin and never moves. Where the phone keeps its copy is Pommora's choice.
- **A-3:** [confirmed] V0 establishes the long-term architecture and does not care much about interface quality. Deletions and trash travel, and updates are live: a change on one open device reaches the other without a manual action.
- **A-4:** [confirmed] A sync server is in scope.
- **A-5:** [confirmed] No paid Apple Developer membership today; Xcode and an iCloud account are available. Every step is gated on the Simulator with no signing, and the plan carries the device path end to end (bundle id, automatic signing under a team, a TestFlight or ad-hoc install) so that buying the account is the only thing between the Simulator and the phone.
- **A-6:** [confirmed] Mobile code lives at `Pommora/Mobile`.
- **A-7:** [confirmed] V0 mobile scope, in two steps. The arc that ships regardless: the phone holds the vault as a Files-visible synced folder with a sign-in and status shell, and nothing of the desktop renderer mounts. Behind a separate go and a phone product spec (the plan's Phase 8): read the tree, open a page, edit the body, create a page, rename, delete a page or container into the trash, move, reorder, open and switch tabs, through the renderer's existing menus opened by a long press. Space and Context deletes, properties, schema, views, and restore wait. No expectation of a pleasant experience; nothing else needs 1-to-1 parity.
- **A-8:** [confirmed] MarkdownPM ships on mobile as-is, no mobile toolbar.
- **A-9:** [assumed] Bottom bar items: Collections, Spaces (the code's Contexts mode), Agenda placeholder, Tabs, Navigation, Settings. Tap behavior is deferred by ruling; the plan takes the simplest reading (a sheet over the content).

#### B — Engine Seam

- **B-1:** [confirmed] Long-term correctness outranks "don't touch Electron source"; a mobile-side re-implementation of the walk is a second definition of what a Nexus is and is rejected.
- **B-2:** [confirmed] The read-and-page-write chain moves out of `src/main` into a process-agnostic engine folder with one host seam: readText, readDir, stat, writeText (the host's own write, which on desktop records the watcher echo), applyRemote (a raw write with no echo, for sync landings), setTimes where the host can, mkdir, rename, remove, path joins, a sync hash, and an optional per-path lock. The moving set, by import census (re-derived at planning): `readNexus`, `readPage`, `IO/pageFile`, `IO/walk`, the read half of `IO/atomicWrite`, `sidecarIO`, the read half of `IO/propertiesRegistry`, `folderKind`, `ids`, `paths`, `walkCache`, `coerce`, `exclusion`, `order`, `CRUD/util`, the create, rename, move, and body-write half of `CRUD/page`, and `CRUD/loadValues` split at its corpus boundary so the engine takes the file list and each host supplies the corpus (main from the index, the phone from a walk). `IO/fileLock` (`node:async_hooks`), `IO/writeEcho`, `CRUD/governedWrite`, `indexSeed`, and `valuesChanged` stay in main as host policy. The `@engine/*` alias lands in `tsconfig.node.json`, the engine tsconfig, and every block of `electron.vite.config.ts`; main's relative-path tests are rewritten mechanically. Main binds Node at boot; the mobile host binds Capacitor. Its own tsconfig project carries no Node types, so a `node:` import there fails typecheck. What this scope leaves on the phone for later (ruled 09-04-2026): the mutations that stay in main (delete, rename, move, property and schema edits, Context and Space edits, views, reorders, restore) cannot be performed on the phone in v0 though they cross to it; the content index stays in main, so the phone full-scans; a first open on the phone runs over the bridge and takes seconds. Each mutation module ports into the engine when the phone needs it.
- **B-3:** [confirmed] The engine folder is `src/engine`.
- **B-4:** [assumed] The watcher, live tree, content index, file history, and every other mutation stay in main. The engine's page write carries no history or echo policy; hosts add theirs.

#### C — Sync Model

- **C-1:** [assumed] Obsidian's vocabulary: each device holds a local vault; all reconcile against one remote vault on a Pommora Sync server. The desktop is a client like the phone, never the server.
- **C-2:** [assumed] The unit is the whole file. The server keeps a change log with a monotonic sequence per remote vault; a client pulls everything since its last sequence. Deletions are tombstones in that log.
- **C-3:** [assumed] `.trash//` bundles sync as ordinary files, so a deletion arrives on another device as its tombstone plus its bundle, so the Trash frame lists it on every device; restoring from the phone waits on phone-side mutation parity (B-2).
- **C-4:** [confirmed] What syncs is every non-hidden entry under the root plus exactly two hidden ones, `.nexus` and `.trash`, minus the device-local files inside them (`nexus.db` and `versions.db` with their WAL and SHM siblings). Every other dot-entry stays home: on NexusOS that is `.obsidian` (13 MB, with `workspace.json` rewritten on every pane change), `.git`, `.claude`, `.unsorted`, and `.DS_Store`. A per-Nexus sync-exclusion setting is a Prospect (ruled 09-04-2026: Obsidian's config is a separate concern from the Nexus).
- **C-5:** [confirmed] Conflict, in Syncthing's shape: when both sides changed an item since their common base, the newer envelope modification time wins, an equal time breaks deterministically by device id, and a modification beaten by a tombstone is still captured. The loser is never written beside the winner as a sibling `.md`, which would duplicate the page's `ID` key; it is a retained remote version and, on the desktop, a page file history row, so nothing is silently discarded. A fresh local create that meets a remote version of the same path is treated as a modification, so Obsidian's documented overwrite of a just-created note cannot happen. Optimistic concurrency on push is F-4's version precondition.
- **C-6:** [assumed] A sync landing on the desktop is written through the seam's `applyRemote` entry: no echo record, so the watcher, the live tree, values pushes, and file history treat it as they treat an Obsidian edit today. The apply writes with raw primitives under the page's lock and never routes through `rmwJsonStrict` or `rewritePageSerialized`, whose lock is non-reentrant. Existing write paths stay untouched.
- **C-7:** [confirmed] Live updates are core. Each client pushes on a short debounce after local change: the desktop from the write funnel every in-app write already crosses (`recordWrite` in `IO/writeEcho.ts`, which the watcher consults to skip the app's own writes, so watcher activity alone would never see a desktop edit) plus watcher activity for outside edits; the phone from its own writes and subscribes to the server's change feed for the vault, so a landing on the server reaches every connected device within seconds; a reconnect or foreground runs a catch-up pull from the last sequence. A manual Sync action stays as the fallback.
- **C-8:** [confirmed] End-to-end encryption ships in v0: the server holds ciphertext only.
- **C-9:** [confirmed] A Pommora Sync server that is always reachable, so a device closed during the other's edits catches up when it reopens. V0 develops against it on localhost beside the desktop and the Simulator, and ships it as one container with an env-configured data directory so it deploys to any always-on host (a VPS, fly.io, a Mac mini) for the phone to reach off the LAN; the host itself is Nathan's pick.
- **C-10:** [confirmed] Email and password on the Pommora server. Sign-in yields a device token behind one seam; OAuth providers slot in later.
- **C-11:** [confirmed] Page history is preserved on mobile. The remote vault retains every stored version of an item within the Nexus's History Timeframe, so version history is cross-device in the manner of Obsidian Sync's; the desktop's `versions.db` keeps capturing local edit bursts between syncs, and the Page History window lists local snapshots and remote versions together. The phone's history is the remote's; a losing phone version in a conflict is a server version already, so nothing is dropped.

#### D — Mobile Host And Shell

- **D-1:** [assumed] The preload's hand-grouped `api` shape moves to shared as a declarative table; preload and the mobile host both bind it. Channels the phone can't serve answer the shared refusal envelope; menu channels answer null, which the renderer already reads as dismissed.
- **D-2:** [assumed] `local_state` scopes and the sync state persist as JSON files under the app's `Library/` through the Filesystem plugin; Capacitor Preferences (UserDefaults) holds only tiny values such as the server address and vault id, since its docs call it lightweight and iOS documents no size ceiling either way. The content index answers null, so callers full-scan.
- **D-3:** [assumed] The asset scheme is injected per host; iOS serves through `Capacitor.convertFileSrc` over the file's `getUri` result, which the WebView's scheme handler reads from any path the process can read. The rewrite is plain concatenation, so the mobile variant encodes per segment as `assetUrl.ts` already does and never double-encodes.
- **D-4:** [assumed] `vite.config.app.ts` and `dist-app` retire into `Pommora/Mobile`; the mobile entry installs the host before rendering; `App.tsx` stays untouched and a `MobileApp` composes the phone shell.
- **D-5:** [assumed] `<webview>` is inert on WKWebView; v0 accepts blank web surfaces.

#### E — Toolchain

- **E-1:** [confirmed] iOS 26.5 Simulator runtime installed 09-04-2026. Capacitor 8 with SPM; no CocoaPods.
- **E-2:** [assumed] Verification on the Simulator is Safari Web Inspector plus `simctl` screenshots; CDP does not reach WKWebView.
- **E-3:** [confirmed by test] `crypto.subtle` exists at `capacitor://localhost`: WebKit treats a localhost host and a scheme served by a `WKURLSchemeHandler` as secure contexts by two independent rules, and a purpose-built WKWebView on the iOS 26.5 Simulator returned `isSecureContext` true with a working PBKDF2, AES-GCM, and HMAC round trip. The hostname stays `localhost`.
- **E-4:** [assumed] Live reload runs with `server.url` at `http://localhost:5173` from the Simulator, Vite bound with `strictPort`, never the Mac's LAN IP: plain HTTP over an IP is not a secure context in WKWebView, which would remove Web Crypto from the page, and it is the case Apple documents ATS restricting since iOS 17. `cleartext` is an Android-only setting and is not set.
- **E-5:** [confirmed] Capacitor's Filesystem writes are not atomic on iOS (`atomically: false`, default `Data.write` options) and a rename over an existing file is a delete then a move. The engine's contract is an atomic write, so the mobile host carries one small Swift plugin whose write lands atomically, and every other operation stays on the stock plugin. An open plugin issue reports `readdir` order differing between platforms, so the walk sorts by name itself rather than trusting either.
- **E-6:** [assumed] The iOS project is committed wholesale from the SPM template: `ios/App/App.xcodeproj` (no workspace, no Podfile), `ios/App/CapApp-SPM/Package.swift` which the CLI rewrites with an exact pin on every sync, with `App/App/public`, `capacitor.config.json`, `DerivedData`, and `xcuserdata` ignored by the template's own `.gitignore`. The loop is build the web bundle, `npx cap sync`, then `npx cap run ios --target <simulator>` or `npx cap open ios`.

#### F — Protocol

- **F-1:** [assumed] A remote vault is keyed by the Nexus id from `.nexus/nexus.json`, so the phone's copy carries the same identity. The vault carries an `info` record (protocol version, KDF salt and parameters, the wrapped vault key as a list with one entry per recipient key, so a second person's key can be added later without a new vault format, and the History Timeframe in days as plaintext so the server can prune retained versions) in the manner of Joplin's `info.json`; a client refuses a version it doesn't know, and the server creates the record once and refuses a stale rewrite, which is what makes Joplin's multi-key merge unnecessary.
- **F-2:** [assumed] Key hierarchy, borrowed from Joplin and Standard Notes: a random 256-bit vault key is minted once at vault creation and wrapped by a key derived from the vault password, so a password change re-wraps one record and never re-encrypts content. HKDF-SHA256 derives per-purpose subkeys from the vault key (content, path, verifier) with distinct info strings, as Obsidian's v3 does. An item is addressed by HMAC-SHA256 of the NFC-normalized nexus-relative POSIX path under the path subkey (Proton Drive derives an HMAC name hash the same way for collision checks, and Obsidian encrypts paths deterministically with AES-SIV), so the server never sees a path and every device derives the same token. The token hashes the path with its case preserved; collision detection folds case, and a pull that would land two items on one case-folded path is refused with a report, since the Mac's volume is case-insensitive and the phone's is not. The blob is AES-256-GCM over path and content with a fresh 12-byte IV, and the GCM additional data binds protocol version, key id, item id, and modification time, closing the gap Obsidian documents where a server can serve one file's ciphertext under another path. The plaintext record the server keeps is item id, version, modification time, size, and the deleted flag, so the server can page and order without reading anything.
- **F-3:** [assumed] Key derivation is PBKDF2-HMAC-SHA256 through Web Crypto at 600,000 iterations or more (OWASP's PBKDF2 floor; it ranks Argon2id and scrypt above it, which is why they sit in Prospects) with a 16-byte random salt, the password NFKC-normalized first (Obsidian's rule, since an iOS keyboard and a Mac keyboard can emit different code points for one visible password). Argon2 is absent from Electron's BoringSSL build and from WebKit, and scrypt would run native on one side and pure JavaScript at ~134 MB on the other, so PBKDF2 is the one primitive both runtimes execute natively and identically. The GCM tag on the wrapped vault key is the password verifier, as in Joplin; there is no separate verifier record. The vault password is entered once per device and held in the platform keychain, Electron `safeStorage` on desktop and the iOS Keychain through `@aparajita/capacitor-secure-storage` (Capacitor 8, SPM, per-item accessibility classes, a maintained Swift dependency) behind one seam, never on the server.
- **F-4:** [assumed] The server keeps one monotonic sequence per vault, and an item's version is the sequence of the change that wrote it, so the store precondition and the pull cursor share one counter. Store carries the version the client built on and is refused on inequality, answering with the server's current record so the client resolves without a second round trip (Standard Notes); a successful store answers the new version only, never content, so an acknowledgement can never clobber an edit made while the request was in flight. Pull answers changes since a cursor as pages with a has-more flag; the client persists the cursor per page only after that page is applied (Joplin, Standard Notes); an unknown cursor is a typed resync error that clears the cursor and takes a full snapshot without tombstones, applied under no-op rules (a delete for an absent item is ignored, identical content is skipped, an own echo is a no-op). A tombstone rides the log as a version with no blob of its own; the item's earlier versions stay retained within the History Timeframe (C-11), so a deleted page's history is still readable and restorable. The server prunes versions older than the vault record's retention days.
- **F-5:** [assumed] Whole-file items, no chunking; a 50 MB per-file cap with a skipped-and-reported outcome (NexusOS's largest asset is under 10 MB, so nothing skips today). A rename is a tombstone plus a new item.
- **F-6:** [assumed] Local change detection is a stat walk against the base recorded at the last sync (modification time and size), confirmed by content hash before a push, so a rewrite that preserved times or restored identical bytes never pushes. Modification time is also user-facing data (Last Modified, `loadValues.ts:58` reads the disk mtime), so a landing must not re-date the page: the desktop apply restores the envelope's mtime after the write (`rewritePreservingTimes` is the existing pattern), and on iOS, where Capacitor's Filesystem cannot set mtime, the phone reads Last Modified from its sync base record rather than from disk. The phone's base record holds the envelope's modification time as authoritative and compares disk mtime and size against the values recorded at its own write.
- **F-7:** [assumed] First sync rules: an empty remote takes everything local; an empty local takes everything remote; both non-empty merge by most-recent-wins with every item treated as changed.
- **F-8:** [assumed] A remote path is validated before it is written by the engine's own rule: lexical containment under the root for a path that need not exist yet, plus `invalidName` on every segment. `pathSafety.resolveUnderRoot` is not reused: it realpaths both sides and requires the target to exist, which no create can satisfy.
- **F-9:** [assumed] Two syncs never run concurrently on one device; the desktop apply takes the page's own file lock (supplied by main through the seam) so an in-app write queues behind it; the phone, a single non-concurrent writer, supplies none.

#### G — Server

- **G-1:** [confirmed] `Pommora/Sync`: one Node process on built-ins alone (`node:http`, `node:sqlite`, `node:crypto`), no framework, one SQLite file holding users, device tokens, vaults, items, versions, and blobs. `node:sqlite` is a release candidate from Node 24.15.0 (no experimental warning, no further breaking changes anticipated), so the server pins node 24.15 or later; `DatabaseSync` is synchronous, so the busy timeout and `limits.length` are set explicitly, WAL is enabled once by pragma, blobs bind whole (no incremental blob I/O), and the request body byte cap is the handler's own. The container is a multistage `node:24-slim` image under `tini` as a non-root user with one `DATA_DIR` environment variable deriving the database and temp paths, configured by a committed `.env-sample` passed with `--env-file`, the real environment overriding the file (Joplin Server's pattern minus its in-image process manager). A blob folder and Postgres are Prospects. TLS terminates at a reverse proxy in deployment; v0 is plain HTTP on localhost.
- **G-2:** [assumed] Account passwords hash with `crypto.scrypt`; device tokens are random, revocable rows; every vault request checks ownership.
- **G-3:** [assumed] The phone's WebView origin is `capacitor://localhost`, so every call is cross-origin and the server answers CORS: it reflects that origin, answers the preflight every authenticated request triggers (the `Authorization` header is outside the safelist) with the allowed methods and headers, and caches it with a max-age. No ATS key is needed for `http://localhost` from the Simulator (an unqualified domain is allowed by default since iOS 10, and the default policy was observed passing loopback while refusing external cleartext); `NSAllowsLocalNetworking` is an optional declaration of intent and `NSAllowsArbitraryLoads` is never added. The deployed server is reached over HTTPS.
- **G-4:** [assumed] The server's schema grows additively with a version row, on the same rule `nexus.db` follows.

#### H — Desktop Integration

- **H-1:** [assumed] The desktop sync client runs in main (it owns the files and the watcher); the sync model itself lives in `src/engine/Sync` and is host-neutral.
- **H-2:** [assumed] Sync state per Nexus (last sequence, per-item base) is a `sync` scope in `local_state`; the server address and the signed-in device token are app-level, in `pommora.json` and `safeStorage`, since they belong to the machine rather than to any Nexus.
- **H-3:** [confirmed] Settings › General gains two sections: Account (server address, email, password, Sign In, Sign Out, device name) and Sync (remote vault Create From This Nexus or Connect, vault password, status, Sync Now, Disconnect). Connect lists only remote vaults whose id matches this Nexus's `nexus.json` id and refuses a mismatch with the reason; Create against an id the server already holds becomes Connect. Every action has its inverse.
- **H-4:** [assumed] A remote version landing over a page the desktop has open is not reloaded into the editor in v0; the outgoing text is captured into page file history first and the landing is itself a retained remote version, so the next autosave can overwrite it without losing either. The watcher-driven external-edit reload is the named successor.
- **H-5:** [assumed] Thumbnails under `.nexus/assets/<id>/thumbnails` sync, as `nexusPaths.ts` already names them a synced folder.

#### I — Phone Flow

- **I-1:** [confirmed] First run: server address, sign in, pick a remote vault, vault password, pull, open. The local copy lives in the app's `Documents/<vault name>/`, exposed to the Files app as `On My iPhone › Pommora › <vault name>` by `UIFileSharingEnabled` and `LSSupportsOpeningDocumentsInPlace`, the shape Obsidian uses for the vault on Nathan's phone today (ruled 09-04-2026). Known limitation: other apps may then edit in place, which Apple says obliges file coordination that Capacitor's Filesystem does not perform; Obsidian ships without it, most-recent-wins governs the race, and a coordination plugin is a Prospect. Per-device state stays out of Documents under `Library/`. The Simulator's container is inspected with `simctl get_app_container` for verification.
- **I-2:** [assumed] The phone pushes on a short debounce after its own writes, subscribes to the change feed while foregrounded, runs a catch-up pull on `@capacitor/app`'s `resume` event (the real background-to-foreground edge; `appStateChange` also fires on focus changes) and once at launch after `getState()`, since launch-time events fire before a listener exists, and offers a Sync action in the bottom bar. It has no watcher: its own writes are known at the write, and the stat walk (F-6) that every sync runs before pushing catches an edit another app made through the Files exposure. A Sync is always pull, then detect, then push.
- **I-3:** [assumed] The phone applies each pulled item and patches its tree through the same classification `watchPatch.ts` performs on the desktop; a full re-walk is the fallback for the unclassifiable, never the mechanism, since a live feed would otherwise re-walk the whole tree on every desktop keystroke debounce. The host then pushes `nexus:changed`.

#### J — Sweep

- **J-1:** [assumed] Failure recovery: a pull applies per item in sequence order and records progress per item, so an interrupted sync resumes; a refused push re-pulls and retries; a decrypt failure skips the item and reports it.
- **J-2:** [assumed] The sync manifest walk is its own walk, larger than the tree walk: it enters `.trash`, which the tree walk skips (on NexusOS, 457 of 1,063 files sit there). It reuses `walkCache`'s stat memo. Threshold: a no-change sync over that manifest completes under one second on NexusOS.
- **J-3:** [assumed] Layering on the phone: the bottom bar floats above the content and below pickers, windows, and confirmations.

#### K — Reconciliation (what goes false)

- **K-1:** [assumed] [[ClaudeOS|CLAUDE.md]] hard rule "Main owns the filesystem. All fs/Node lives in `src/main`" restates as: the host owns the filesystem, main on desktop and the Capacitor host on mobile, and the engine in `src/engine` reaches it only through the host seam; `src/main` is still the only place Node and Electron APIs are called on desktop.
- **K-2:** [assumed] [[ArchitecturePM]] §What the Data Layer Leaves to the OS, "Cross-device sync — placing the Nexus in a synced folder gives device-to-device sync; real cloud sync is a long-term prospect", is replaced by a Pommora Sync section: local vaults, the remote vault, the change log, what never syncs, and how a landing enters through the watcher. §The Shape of the App gains the engine and its two hosts. §Persistence gains the sync state row under "stays on this machine" and the app-level account row under "outside every Nexus".
- **K-3:** [assumed] [[PommoraPRD]] §Audience "neither is a v1 concern" and §Scope "Out (post-v1): … sync, mobile" move sync and mobile into scope; §Core Constraints keeps "cloud-sync-ready" and drops "A Nexus placed in iCloud Drive … already gets device-to-device sync for free" as the sync story.
- **K-4:** [assumed] [[FrameworkPM]] §Post-v1 drops "sync, mobile" from the no-commitment list; a version entry records the arc.
- **K-5:** [assumed] [[ConfigurationPM]] §General gains the Account and Sync tables (H-3) with their keys and where each is stored.
- **K-6:** [assumed] [[Dependencies]] gains Capacitor 8 and its plugins (Filesystem, Preferences, App, the Keychain plugin) under a Mobile heading, each **Decided** with its seam, and a Server heading stating the built-ins-only rule.
- **K-7:** [assumed] [[Development-Environment]] gains how to run the sync server, the mobile dev loop (Vite dev server, `npx cap sync`, `npx cap run ios`), Simulator verification through Safari Web Inspector and `simctl`, and the gate additions (`typecheck:engine`, `typecheck:mobile`, the lint excludes for `Mobile/ios` and `Mobile/dist`).
- **K-8:** [assumed] A new [[MobilePM]] Features document describes the companion (host, shell, first run, sync trigger) and a new [[SyncPM]] describes Pommora Sync (protocol, encryption, server, conflict rule, what never syncs); [[NexusRecordPM]] gains a line that a trash bundle travels with sync.
- **K-9:** [assumed] [[HistoryPM]], [[ContextPM]], and the Handoff record the arc under one History heading at closeout.

#### L — Cross-Device Coverage

- **L-1:** [confirmed] Every change that lands in the Nexus's files crosses devices: page bodies and property values (frontmatter), creates, deletes, restores, moves, renames, reorders (sidecar and `state.json` order), icons, banners and crops, Context and Space edits (`contexts.json`, Space sidecars), the property registry, settings, navigation pins and favorites, the homepage config, and the `.trash` bundles. The 27 mutation ops in `src/shared/mutate.ts` all end in one of those files.
- **L-2:** [assumed] The mechanism is whole-file items plus tombstones, so no op needs its own wire shape: a rename or move is a tombstone and a new item whose file still carries the id, so tabs, pins, recents, and folds keyed by id survive on the receiving device; a property edit is a changed file; a delete is a tombstone plus its bundle. The desktop applies a landing as an outside edit through the watcher's classification; the phone applies it directly and patches its tree. The watcher is the desktop's means, not the requirement.
- **L-3:** [confirmed] What lives only in `nexus.db` does not cross, and that is the persistence design: folds, active view, manual view order, heading columns, header glyph, footnotes, embed heights and zooms, aliases, fetched link titles, tabs, window sets, recents, the record baseline, the glance size, and device preferences are per-machine chrome. The block documents behind the Homepage and Space dashboards are leaving `nexus.db` for sidecar files in a parallel session (ruled 09-04-2026), so by the time the plan is written they are files and cross like everything else; the plan re-derives their location at that time rather than assuming either home, and notes that the watcher ignores `.nexus/homepage` and `.nexus/contexts/**` today, so a landing there needs its own classification.
- **L-4:** [assumed] A fork of one identity (two devices renaming the same page differently before syncing) leaves two files carrying one id; the existing duplicate-id pass (`src/main/remint.ts`) adjudicates on the next open; it defers when neither claimant sits at the baseline path, so the cross-device fork is not fully settled by it. Unreachable in v0, since rename is off the phone; it rides phone-side mutation parity.

### Core (must-have)

- The engine seam with Node and Capacitor bindings, behavior-preserving on desktop.
- The mobile host and shell booting on the Simulator.
- The Pommora Sync server with its change feed, packaged as one deployable container; the sync client in the engine with push-on-change and feed subscription; the desktop client in main; the phone client in the host; and the Settings › General rows to sign in and connect a remote vault.
- The device install path documented and configured, gated only on a developer account.
- Cross-device history through remote-retained versions, surfaced in the Page History window on both devices.
- The success criteria above observed end to end.

#### Prospects (allowed later, not now)

- OAuth providers (Sign in with Apple, Google) — why deferred: Sign in with Apple needs the paid program; don't-foreclose: sign-in yields a device token behind one seam.
- Chunked transfer and large-file handling — why deferred: a Nexus is pages plus modest assets; don't-foreclose: the store call carries size and hash.
- Mobile toolbar, touch-tuned editor, bottom-bar design — by ruling.
- Phone-local edit-burst capture between syncs — why deferred: the remote retains every synced version, so only unsynced intermediate states are uncaptured; don't-foreclose: the capture rule lives in the engine's page write host policy.
- Watcher-driven reload of an open editor on an external edit (H-4) — the Known Issue's own successor.
- Blob folder or Postgres storage — why deferred: SQLite blobs carry a personal Nexus; don't-foreclose: the store is one module behind the request handlers.
- File coordination for the Files-visible copy (an `NSFileCoordinator`-wrapped write and a directory `NSFilePresenter`) — why deferred: Obsidian ships without it and most-recent-wins governs the race; don't-foreclose: the atomic-write plugin of E-5 is where coordination would land.
- Three-way merge of Markdown conflicts (Obsidian uses diff-match-patch) — why deferred: most-recent-wins with loser capture is the locked rule; don't-foreclose: the conflict seat is one function in the sync client.
- Argon2id or scrypt key derivation — why deferred: neither runs natively on both runtimes today; don't-foreclose: the KDF parameters live in the vault record, so a new KDF is a new vault.
- Rename hints so a moved file doesn't re-upload — don't-foreclose: the envelope carries the path.
- A per-Nexus sync-exclusion setting (Obsidian's Excluded folders) — why deferred: C-4's fixed rule covers the real Nexus; don't-foreclose: the manifest rule is one predicate.
- Multi-user vaults — why deferred: single-user by the PRD; don't-foreclose: F-1's wrapped-key list.
- Phone-side mutation parity (delete, rename, move, properties, schema, Contexts, views, reorders, restore) — why deferred: B-2's scope; don't-foreclose: each lives in one module that moves into `src/engine` when needed.
- The content index on the phone — why deferred: full scans suffice at personal scale; don't-foreclose: the index is one module behind `sessionDb`.
- Non-editor glance hosts, Agenda — unrelated arcs.

#### Out of Scope (won't do — distinct from Prospects)

- Joining Obsidian Sync or reading Obsidian's phone copy — A-1.
- iCloud container storage — needs the paid program, and the origin must not move.
- Folder picker with security-scoped bookmarks — the phone's copy is Pommora's own.

#### Considered & Rejected

- Desktop as the v0 remote vault (LAN server in main) — rejected 09-04-2026: v0 must establish the long-term approach, which is a server.
- Piggybacking on Obsidian Sync via the folder picker — rejected: Pommora is its own thing, and `.nexus//` never syncs there.
- Thin client (phone drives desktop main over WebSocket) — rejected: nothing lives on the phone, and it dies when the laptop sleeps.
- Polyfilling `node:fs`, `node:path`, and `node:crypto` for the WebView bundle — rejected: fragile shims in place of an honest seam.
- Renaming the device-local databases to `*.nosync` — unnecessary once Pommora controls what syncs (C-4).
- Excluding thumbnails from sync — `nexusPaths.ts` names them synced; keeping them is the standing design (H-5).
- Client-side sync locks (Joplin) — the server's base-version refusal makes them unnecessary.
- A password-derived vault key used directly on content — rejected: a password change would re-encrypt the whole vault; a random vault key wrapped by the derived key costs one record.
- A separate key-verifier record — rejected: the GCM tag on the wrapped vault key already answers a wrong password, and Obsidian documents no verifier of its own.
- Standard Notes' timestamp-valued sync token — rejected: a write landing between a request's read and its save can be skipped forever; a monotonic sequence cannot.
- Modification time inside the ciphertext only — rejected: the server needs it in the record to order and page, and the AEAD binding keeps it honest.
- A sibling conflict file (`name (Conflicted copy …).md`) — rejected: it would carry a second copy of the page's `ID` key; the loser is a retained version instead.
- The phone's copy in the private `Library/` folder — rejected: Files visibility is the Obsidian shape Nathan uses and asked for (I-1).
- A Pommora folder inside iCloud Drive (the app's iCloud container) — rejected: iCloud would sync it itself, colliding with Pommora Sync, and its desktop half lives in `~/Library/Mobile Documents`, which moves the origin.
- Capacitor Preferences for the sync state — rejected: documented as lightweight; a JSON file under `Library/` instead.
- `NSAllowsArbitraryLoads` — rejected: unnecessary for localhost and an App Store review flag.

#### Lessons

- "Never syncs" in a persistence doc described intent, not a physical guarantee: `nexus.db` sat inside the folder any folder-transport would carry. A sync the app owns turns that into a manifest rule; a doc's absolute is verified against where the bytes live. → [[Development-Environment]]
- Obsidian's dot-folder exclusion means a `.nexus//` design cannot ride a third-party vault sync; a locked on-disk layout has to be checked against every transport it is expected to survive. → [[Dependencies]]

