## Mobile Companion & Pommora Sync — Decision Log

> **Standing (09-04-2026):** nothing here is ratified for execution, and the work is not starting now. This log states the v0 mandate and the decisions that stay true regardless of when it starts; the implementation plan holds the specifics and re-derives every one of them at execution.
>
> **Step 1, before anything else:** an app-wide, long-term restructuring of the repository into a monorepo is necessitated, so that desktop, mobile, the server, and the shared core are one long-term solution rather than a package with attachments. Its exact architecture is yet to be decided; the workspace layout named below is the current candidate, and it is settled at a declared stop before the restructure runs.

### Frame

- **Purpose:** Seed the Pommora mobile companion (iOS, Capacitor, the existing renderer and CSS) and Pommora Sync, the app's own file synchronization, so a phone holds a full copy of a Nexus and reconciles it with the desktop's origin folder through a Pommora-owned server. V0 establishes the long-term architecture; its interface is minimal by ruling.
- **Core Value:** `~/NexusOS` on the Mac and the copy on the iPhone stay one set of files, deletions and trash included, with Obsidian Sync off and the desktop folder never moving.
- **Success Criteria:** The companion runs on Nathan's iPhone (a paid developer account assumed for the install; the Simulator gates every step before it), Obsidian Sync is off, and `~/NexusOS` on the desktop and the phone's copy are the same files: an edit on either side reaches the other while both are open without a manual action, a desktop deletion, a desktop trash restore, and a phone-created page each cross, and a device closed during the other's edits catches up when it reopens. The end-to-end criterion is observed first on the Simulator against a server on localhost, then on the phone against a deployed server.

### Sources

- [[ArchitecturePM]] — the two-process shape, the bridge, the watcher, the persistence tiers; "Cross-device sync — placing the Nexus in a synced folder gives device-to-device sync; real cloud sync is a long-term prospect" goes false.
- [[PommoraPRD]] §Audience, §Core Constraints — "cloud-sync-ready", "a mobile companion app is a near-term focus"; the storage philosophy sync must preserve byte-for-byte.
- [[ConfigurationPM]] §General — the Settings leaf that gains Account and Sync sections.
- [[Dependencies]] — the vetted library catalog; every new library sits behind a seam.
- [[Development-Environment]] — gates and parallel-writer rules; CDP does not reach WKWebView.
- The bridge channel map, the preload's api grouping, and the main-process handler map — the surface a second host serves in process.
- The read-and-page-write chain in main (readNexus, readPage, the walk and its cache, page files, sidecars, the property registry, folder kinds, ids, paths, page CRUD, loadValues) — Node-bound only through a handful of filesystem primitives.
- The write-echo funnel and the watcher — every in-app write crosses the funnel, and the watcher skips what it recorded.
- `local_state` in `nexus.db` — the scope/key store the phone mirrors as files.
- The asset URL scheme in the renderer — commented as the one place a non-Electron host swaps.
- The renderer's safe-area variables and the sidebar ribbon's five keys.
- `~/NexusOS/.obsidian/core-plugins.json` — Obsidian Sync carries NexusOS to the phone today, from `~/NexusOS`, with no folder move.
- Obsidian help — selective sync excludes every dot-entry but `.obsidian`; remote-vault E2E with a per-vault password separate from the account; the account under Settings › General.
- Joplin, Standard Notes, Remotely Save, Syncthing — prior art for the sync target abstraction, the sequence cursor, keep-newer conflicts, and per-device versioning.
- Capacitor docs — Capacitor 8 under SPM, the Filesystem plugin's shape, exposing Documents to the Files app.
- `~/NexusOS/.nexus/nexus.json` — the Nexus id the remote Nexus keys on.
- [[Mobile Companion & Pommora Sync — Research]] — the outward research annex; the entries below cite it by section.
- Toolchain checked 09-04-2026: Xcode 26, Node 24, no CocoaPods, no signing identities, no paid Apple Developer membership, Docker not installed.

### Decisions

#### A — Product Frame

- **A-1:** [confirmed] Pommora Sync is Pommora's own; Obsidian Sync is prior art to borrow from, never a dependency. The end state lets Obsidian Sync be switched off.
- **A-2:** [confirmed] The desktop folder is the origin and never moves. Where the phone keeps its copy is Pommora's choice.
- **A-3:** [confirmed] V0 establishes the long-term architecture and does not care much about interface quality. Deletions and trash travel, and updates are live: a change on one open device reaches the other without a manual action.
- **A-4:** [confirmed] A sync server is in scope.
- **A-5:** [confirmed] No paid Apple Developer membership today. Every step is gated on the Simulator with no signing, and the plan carries the device path end to end so that buying the account is the only thing between the Simulator and the phone.
- **A-6:** [open] The repository is restructured into a monorepo first, before any new folder lands; the local folder and the session's working directory stay where they are. The candidate layout is one root with four workspaces, `Core`, `Desktop`, `Mobile`, and `Sync`, the `Pommora/` package folder dissolving into them; the exact architecture is decided at the plan's stop before Task 0 runs.
- **A-7:** [confirmed] V0 mobile scope, in two steps. The arc that ships regardless: the phone holds the Nexus as a Files-visible synced folder with a sign-in and status shell, and nothing of the desktop renderer mounts. Behind a separate go and a phone product spec (the plan's Phase 8): read the tree, open a page, edit the body, create a page, rename, delete a page or container into the trash, move, reorder, open and switch tabs, through the renderer's existing menus opened by a long press. Space and Context deletes, properties, schema, views, and restore wait. No expectation of a pleasant experience; nothing else needs 1-to-1 parity.
- **A-8:** [confirmed] MarkdownPM ships on mobile as-is, no mobile toolbar.
- **A-9:** [confirmed] Bottom bar items: Collections, Spaces, Tabs, Navigation, Settings. No Sync action and no Agenda placeholder. Tap behavior takes the simplest reading; nothing is designed.
- **A-10:** [confirmed] Vocabulary: the remote is a Nexus, never a vault. Nexus' is the plural in prose; code paths that need a plural stay singular.

#### B — Engine Seam

- **B-1:** [confirmed] Long-term correctness outranks "don't touch Electron source"; a mobile-side re-implementation of the walk is a second definition of what a Nexus is and is rejected.
- **B-2:** [confirmed] One host seam in `Core/engine`, bound once per process: read, list, stat, the host's own write (which records the watcher echo on desktop), a raw write for sync landings that records no echo and keeps the envelope's modification time, mkdir, rename, remove, and a per-path lock. The engine owns its own POSIX path helpers and hash. The sync client needs only the seam; the read-and-page-write chain moves behind it in Phase 8, with each host supplying the corpus a Collection view loads from.
- **B-3:** [assumed] The watcher, live tree, content index, file history, and every other mutation stay in main. The engine's page write carries no history or echo policy; hosts add theirs.

#### C — Sync Model

- **C-1:** [assumed] Obsidian's shape in Pommora's vocabulary: each device holds a local copy of the Nexus; all reconcile against the one remote Nexus on a Pommora Sync server. The desktop is a client like the phone, never the server.
- **C-2:** [assumed] The unit is the whole file. The server keeps a change log with a monotonic sequence per remote Nexus; a client pulls everything since its last sequence. Deletions are tombstones in that log, and they ride every page so a snapshot is self-sufficient.
- **C-3:** [assumed] `.trash//` bundles sync as ordinary files, so a deletion arrives on another device as its tombstone plus its bundle and the Trash frame lists it everywhere; restoring from the phone waits on phone-side mutation parity.
- **C-4:** [confirmed] What syncs is every entry the watcher would watch plus `.trash` at the top level, minus the device-local store files inside `.nexus` (`nexus.db`, `versions.db`, and their journals). The app excludes those by construction, as a manifest rule, never by convention. Every other dot-entry stays home: `.obsidian`, `.git`, `.claude`, and their kind. A per-Nexus sync-exclusion setting is a Prospect.
- **C-5:** [confirmed] Conflict: when both sides changed an item since their common base, the newer modification time wins, an equal time breaks deterministically by device id, and a modification beaten by a tombstone is still captured. The loser is never written beside the winner as a sibling file, which would duplicate the page's `ID` key; it is a retained remote version and, on the desktop, a page file history row, so nothing is silently discarded. A fresh local create that meets a remote version of the same path is treated as a modification.
- **C-6:** [assumed] A sync landing on the desktop is written through the seam's raw write: no echo record, so the watcher, the live tree, values pushes, and file history treat it as they treat an Obsidian edit today. The apply takes the page's own lock and never routes through the existing serialized writers. Existing write paths stay untouched.
- **C-7:** [confirmed] Live updates are core. The desktop pushes on a short debounce from the write funnel plus watcher activity; the phone from its own writes; both subscribe to the server's change feed for the Nexus while open, so a landing reaches every connected device within seconds; a reconnect or foreground runs a catch-up pull from the last sequence; a periodic sweep catches what no watcher delivers. Sync Now in Settings is the manual fallback on both hosts.
- **C-8:** [confirmed] End-to-end encryption ships in v0: the server holds ciphertext only, file names included.
- **C-9:** [confirmed] A Pommora Sync server that is always reachable, so a device closed during the other's edits catches up when it reopens. V0 develops against it on localhost beside the desktop and the Simulator, and ships it as one container with an env-configured data directory so it deploys to any always-on host; the host itself is Nathan's pick. Docker is installed before the server phase begins.
- **C-10:** [confirmed] Email and password on the Pommora server. Sign-in yields a device token behind one seam. OAuth providers are deferred (ruled 09-04-2026) and slot in behind that seam later.
- **C-11:** [confirmed] Page history is preserved on mobile. The remote Nexus retains every stored version of an item within the Nexus's History Timeframe, so version history is cross-device in the manner of Obsidian Sync's; the desktop's `versions.db` keeps capturing local edit bursts between syncs, and the Page History window lists local snapshots and remote versions together, timestamp-only. The phone's history is the remote's.

#### D — Mobile Host And Shell

- **D-1:** [assumed] Phase 8: the preload's hand-grouped api shape moves to shared as a declarative table; preload and the mobile host both bind it. Channels the phone can't serve answer the shared refusal envelope; menu channels answer null, which the renderer already reads as dismissed.
- **D-2:** [assumed] `local_state` scopes and the sync state persist as files under the app's private area; tiny values such as the server address and Nexus id sit in preferences. The content index is not served on the phone, so callers full-scan.
- **D-3:** [assumed] Phase 8: the asset scheme is injected per host; the mobile variant encodes per segment as the desktop's does and never double-encodes.
- **D-4:** [assumed] Phase 8: the mobile entry installs the host before rendering; `App.tsx` stays untouched and a `MobileApp` composes the phone shell.
- **D-5:** [assumed] `<webview>` is inert on WKWebView; v0 accepts blank web surfaces.

#### E — Toolchain

- **E-1:** [confirmed] Capacitor 8 with SPM; no CocoaPods.
- **E-2:** [assumed] Verification on the Simulator is Safari Web Inspector plus screenshots and the app container's files read from disk; CDP does not reach WKWebView.
- **E-3:** [confirmed by test] Web Crypto is available in the app's WebView origin, which is a secure context. The hostname stays `localhost`.
- **E-4:** [assumed] Live reload runs from the Simulator against `localhost` only, never the Mac's LAN IP, since plain HTTP over an IP is not a secure context and would remove Web Crypto from the page.
- **E-5:** [open] Capacitor's Filesystem writes are not atomic on iOS and cannot set a modification date, and the engine's contract is an atomic write whose landing keeps the envelope's time. How the phone meets that is undecided: a small Swift plugin that writes atomically and sets the date, or stock writes with the modification time held in the sync record and read from there. Decided at the plan's declared stop before the phone host is built.
- **E-6:** [assumed] The iOS project is committed wholesale from the SPM template with its generated and user-specific folders ignored. The loop is build the web bundle, sync, then run on the Simulator.

#### F — Protocol

- **F-1:** [assumed] A remote Nexus is keyed by the Nexus id from `.nexus/nexus.json`, so the phone's copy carries the same identity. The remote carries an info record (protocol version, key-derivation parameters, the wrapped Nexus key as a list with one entry per recipient so a second person can be added later, and the History Timeframe in days as plaintext so the server can prune); a client refuses a version it doesn't know, and the server creates the record once and refuses a stale rewrite.
- **F-2:** [assumed] Key hierarchy: a random Nexus key minted once at creation and wrapped by a key derived from the Nexus password, so a password change re-wraps one record and never re-encrypts content; per-purpose subkeys derived from it. An item is addressed by a keyed hash of its normalized relative path, so the server never sees a path and every device derives the same token; a pull that would land two items on one case-folded path is refused with a report.
- **F-3:** [assumed] Key derivation is a password-based KDF that both runtimes execute natively and identically, with a random salt and the password normalized first; its parameters live in the info record, so a stronger KDF later is a new Nexus, not a migration. The wrapped key's own authentication tag is the password verifier. The Nexus password is entered once per device and held in the platform keychain.
- **F-4:** [assumed] The server keeps one monotonic sequence per Nexus; an item's version is the sequence of the change that wrote it, so the store precondition and the pull cursor share one counter. A store carries the version the client built on and is refused on inequality with the server's current record; a successful store answers the new version only, never content. Pull answers pages since a cursor; the client persists the cursor only after a page is applied; an unknown cursor is a typed resync that clears the cursor and takes a full snapshot under no-op rules.
- **F-5:** [assumed] Whole-file items, no chunking; a per-file size cap with a skipped-and-reported outcome. A rename is a tombstone plus a new item.
- **F-6:** [assumed] Local change detection is a stat walk against the base recorded at the last sync, confirmed by content hash before a push, so a rewrite that restored identical bytes never pushes; a host that rewrites a file without moving its stat names it for hashing. Modification time is user-facing data (Last Modified), so a landing must not re-date the page: the desktop restores the envelope's time after the write; the phone's means is E-5's decision.
- **F-7:** [assumed] First sync rules: an empty remote takes everything local; an empty local takes everything remote; both non-empty merge item by item, equal content seeding the base without a write and differing content under the conflict rule.
- **F-8:** [assumed] A remote path is validated lexically before it is written, under the root and with every segment a legal name; the desktop's realpath-based check is not reused, since a create has nothing to realpath yet.
- **F-9:** [assumed] Two syncs never run concurrently on one device; the desktop apply takes the page's own file lock so an in-app write queues behind it; the phone, a single non-concurrent writer, supplies none.

#### G — Server

- **G-1:** [confirmed] `Sync/`: one Node process on built-ins alone (HTTP, SQLite, crypto), no framework, no dependency, one SQLite file holding users, device tokens, Nexus', items, versions, and blobs. Packaged as one container with an env-configured data directory. Run as `node` on the source with type stripping, so there is no build step.
- **G-2:** [assumed] Account passwords are hashed with a memory-hard function; device tokens are random, revocable rows; every Nexus request checks ownership, answering not-found rather than forbidden so a foreign id is never confirmed to exist.
- **G-3:** [assumed] The phone's WebView is cross-origin to the server, so the server answers CORS for it. Development runs over plain HTTP to localhost; a deployed server is reached over HTTPS, and no arbitrary-loads exception is ever added.
- **G-4:** [assumed] The server's schema grows additively with a version row, on the same rule `nexus.db` follows.

#### H — Desktop Integration

- **H-1:** [assumed] The desktop sync client runs in main (it owns the files and the watcher); the sync model itself lives in `Core/engine` and is host-neutral.
- **H-2:** [assumed] Sync state per Nexus (last sequence, per-item base, keyed by the remote Nexus id) is a scope in `local_state`; the server address and the signed-in device token are app-level, in the app config and the platform's secret store, since they belong to the machine rather than to any Nexus. Disconnecting keeps the bases so reconnecting resumes.
- **H-3:** [confirmed] Settings › General gains two sections, Account (sign in, sign out, the server, the device's name) and Sync (create the remote from this Nexus or connect to it, the Nexus password, status, Sync Now, Disconnect). Connect lists only remotes whose id matches this Nexus and refuses a mismatch with the reason; Create against an id the server already holds becomes Connect. Every action has its inverse. The design of the sections is Nathan's: the plan stops to ask before they are built.
- **H-4:** [assumed] A remote version landing over a page the desktop has open is not reloaded into the editor in v0; the outgoing text is captured into page file history first and the landing is itself a retained remote version, so the next autosave can overwrite it without losing either. The watcher-driven external-edit reload is the named successor.
- **H-5:** [assumed] Thumbnails sync, as the paths module already names them a synced folder.

#### I — Phone Flow

- **I-1:** [confirmed] First run: server address, sign in, pick a remote Nexus, Nexus password, pull. The local copy lives in the app's Documents folder, exposed to the Files app as On My iPhone › Pommora › the Nexus, the shape Obsidian uses on Nathan's phone today. Known limitation: other apps may then edit in place without file coordination; Obsidian ships without it, most-recent-wins governs the race, and a coordination plugin is a Prospect. Per-device state stays out of Documents.
- **I-2:** [assumed] The phone pushes on a short debounce after its own writes, subscribes to the change feed while foregrounded, and runs a catch-up pull on resume and once at launch. It has no watcher: its own writes are known at the write, and the stat walk that every sync runs before pushing catches an edit another app made through the Files exposure. A sync is always pull, then detect, then push.
- **I-3:** [assumed] Phase 8: the phone applies each pulled item and patches its tree through the same classification the desktop's watcher performs; a full re-walk is the fallback for the unclassifiable, never the mechanism.

#### J — Sweep

- **J-1:** [assumed] Failure recovery: a pull applies per item in sequence order and records progress per page, so an interrupted sync resumes; a refused push re-pulls and retries; a decrypt failure skips the item and reports it.
- **J-2:** [assumed] The sync manifest walk is its own walk, larger than the tree walk, since it enters `.trash`. Threshold: a no-change sync over NexusOS completes within about a second.
- **J-3:** [assumed] Phase 8: the bottom bar floats above the content and below pickers, windows, and confirmations.

#### K — Reconciliation (what goes false)

- **K-1:** [assumed] [[ClaudeOS|CLAUDE.md]] hard rule "Main owns the filesystem. All fs/Node lives in `src/main`" restates as: the host owns the filesystem, main on desktop and the Capacitor host on mobile, and the engine reaches it only through the host seam; main is still the only place Node and Electron APIs are called on desktop. Every path the repo's docs cite is restated for the four workspaces.
- **K-2:** [assumed] [[ArchitecturePM]] replaces "placing the Nexus in a synced folder gives device-to-device sync" with a Pommora Sync section and gains the engine, its two hosts, the sync state row, and the app-level account row.
- **K-3:** [assumed] [[PommoraPRD]] moves sync and mobile into scope and drops iCloud Drive as the sync story.
- **K-4:** [assumed] [[FrameworkPM]] drops "sync, mobile" from the no-commitment list; a version entry records the arc.
- **K-5:** [assumed] [[ConfigurationPM]] gains the Account and Sync sections with where each value is stored.
- **K-6:** [assumed] [[Dependencies]] gains the Capacitor packages under a Mobile heading, each with its seam, and a Server heading stating the built-ins-only rule.
- **K-7:** [assumed] [[Development-Environment]] gains how to run the sync server, the mobile dev loop, Simulator verification, and the gate additions.
- **K-8:** [assumed] New [[MobilePM]] and [[SyncPM]] Features documents; [[NexusRecordPM]] gains a line that a trash bundle travels with sync.
- **K-9:** [assumed] [[HistoryPM]], [[ContextPM]], and the Handoff record the arc under one History heading at closeout.

#### L — Cross-Device Coverage

- **L-1:** [confirmed] Every change that lands in the Nexus's files crosses devices: page bodies and property values, creates, deletes, restores, moves, renames, reorders, icons, banners and crops, Context and Space edits, the property registry, settings, navigation pins and favorites, the homepage config, and the `.trash` bundles. Every mutation op ends in one of those files.
- **L-2:** [assumed] The mechanism is whole-file items plus tombstones, so no op needs its own wire shape: a rename or move is a tombstone and a new item whose file still carries the id, so tabs, pins, recents, and folds keyed by id survive on the receiving device. The desktop applies a landing as an outside edit through the watcher's classification; the phone applies it directly. The watcher is the desktop's means, not the requirement.
- **L-3:** [confirmed] What lives only in `nexus.db` does not cross, and that is the persistence design: folds, views, columns, tabs, windows, recents, the record baseline, device preferences and the rest are per-machine chrome. The block documents behind the Homepage and Space dashboards live in `_tiles.json` sidecars (Tiles, PM-128) and cross like every file.
- **L-4:** [assumed] A fork of one identity (two devices renaming the same page differently before syncing) leaves two files carrying one id; the existing duplicate-id pass adjudicates on the next open and defers when neither claimant sits at the baseline path. Reachable only once rename ships on the phone (Phase 8).

### Core (must-have)

- The repository restructured into a monorepo before anything else lands, to an architecture decided at that step.
- The host seam with a Node binding; the sync client behind it.
- The Pommora Sync server with its change feed, packaged as one deployable container; the desktop client in main; the Settings › General sections to sign in and connect a remote Nexus, designed at a stop.
- The mobile host and a sign-in and status shell booting on the Simulator, with the Nexus visible in the Files app.
- Cross-device history through remote-retained versions, surfaced in the Page History window.
- The device install path documented and configured, gated only on a developer account.
- The success criteria above observed end to end.
- Behind a separate go and a phone product spec: the read-and-page-write chain behind the seam and the desktop renderer in the phone (Phase 8).

#### Prospects (allowed later, not now)

- OAuth providers (Sign in with Apple, Google) — deferred by ruling 09-04-2026; don't-foreclose: sign-in yields a device token behind one seam.
- Chunked transfer and large-file handling — why deferred: a Nexus is pages plus modest assets; don't-foreclose: the store call carries size and hash.
- Mobile toolbar, touch-tuned editor, bottom-bar design — by ruling.
- The list-menu generalization: every list menu drawn from one shared model on both hosts, the per-surface menu channels collapsing into one, the desktop's in-app pane — why deferred: v0 needs the phone to reach the existing menus, not a redesign.
- Phone-local edit-burst capture between syncs — why deferred: the remote retains every synced version; don't-foreclose: the capture rule is the page write's host policy.
- Watcher-driven reload of an open editor on an external edit (H-4) — the Known Issue's own successor.
- Blob folder or Postgres storage — why deferred: SQLite blobs carry a personal Nexus; don't-foreclose: the store is one module behind the request handlers.
- File coordination for the Files-visible copy — why deferred: Obsidian ships without it and most-recent-wins governs the race; don't-foreclose: E-5's write mechanism is where coordination would land.
- Three-way merge of Markdown conflicts — why deferred: most-recent-wins with loser capture is the locked rule; don't-foreclose: the conflict seat is one function in the sync client.
- A stronger key derivation — why deferred: nothing stronger runs natively on both runtimes today; don't-foreclose: the parameters live in the info record.
- Rename hints so a moved file doesn't re-upload — don't-foreclose: the envelope carries the path.
- A per-Nexus sync-exclusion setting — why deferred: C-4's rule covers the real Nexus; don't-foreclose: the manifest rule is one predicate.
- Multi-user Nexus' — why deferred: single-user by the PRD; don't-foreclose: F-1's wrapped-key list and a member table.
- Phone-side mutation parity beyond A-7 (properties, schema, Contexts, views, Space and Context deletes, restore) — don't-foreclose: each lives in one module that moves behind the seam when needed.
- The content index on the phone — why deferred: full scans suffice at personal scale; don't-foreclose: the index is one module behind the session database.
- Non-editor glance hosts, Agenda — unrelated arcs.

#### Out of Scope (won't do — distinct from Prospects)

- Joining Obsidian Sync or reading Obsidian's phone copy — A-1.
- iCloud container storage — needs the paid program, and the origin must not move.
- Folder picker with security-scoped bookmarks — the phone's copy is Pommora's own.
- Syncing `nexus.db` or `versions.db` in any form — SQLite's own documentation rules out file-copy sync, and their contents are device-local or derived.

#### Considered & Rejected

- Desktop as the v0 remote (LAN server in main) — rejected 09-04-2026: v0 must establish the long-term approach, which is a server.
- Mirroring Obsidian Sync via the folder picker — rejected: Pommora is its own thing, and `.nexus//` never syncs there.
- Thin client (phone drives desktop main over a socket) — rejected: nothing lives on the phone, and it dies when the laptop sleeps.
- Polyfilling Node's filesystem, path, and crypto for the WebView bundle — rejected: fragile shims in place of an honest seam.
- A CRDT or structured-state sync layer — rejected after survey (09-04-2026): whole-file items plus a server-retained version log is the shape every E2E product with cross-device history uses; CRDTs solve co-editing v0 does not have.
- Renaming the device-local databases to `*.nosync` — unnecessary once Pommora controls what syncs (C-4).
- Excluding thumbnails from sync — keeping them is the standing design (H-5).
- Client-side sync locks — the server's base-version refusal makes them unnecessary.
- A password-derived Nexus key used directly on content — rejected: a password change would re-encrypt the whole Nexus.
- A separate key-verifier record — rejected: the wrapped key's own tag answers a wrong password.
- A timestamp-valued sync cursor — rejected: a write landing between a request's read and its save can be skipped forever; a monotonic sequence cannot.
- Modification time inside the ciphertext only — rejected: the server needs it in the record to order and page, bound into the encryption so it stays honest.
- A sibling conflict file — rejected: it would carry a second copy of the page's `ID` key; the loser is a retained version instead.
- The phone's copy in the private app area — rejected: Files visibility is the Obsidian shape Nathan uses and asked for (I-1).
- A Pommora folder inside the app's iCloud container — rejected: iCloud would sync it itself, colliding with Pommora Sync, and its desktop half moves the origin.
- Platform preferences for the sync state — rejected: documented as lightweight; a file instead.
- An arbitrary-loads transport exception — rejected: unnecessary for localhost and an App Store review flag.

#### Lessons

- "Never syncs" in a persistence doc described intent, not a physical guarantee: `nexus.db` sat inside the folder any folder-transport would carry. A sync the app owns turns that into a manifest rule; a doc's absolute is verified against where the bytes live. → [[Development-Environment]]
- Obsidian's dot-folder exclusion means a `.nexus//` design cannot ride a third-party vault sync; a locked on-disk layout has to be checked against every transport it is expected to survive. → [[Dependencies]]
