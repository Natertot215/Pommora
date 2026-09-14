## Sync-Scaffolding-V2 — Decision Log

> **Standing (09-13-2026):** in brainstorm. Supersedes the retired [[Sync Groundwork — Decision Log]] and [[Mobile Companion & Pommora Sync — Decision Log]] (both recoverable from git at `7c7a68f47^` and `5f4b07c0b^`) for everything above the identity layer; the identity layer they produced stands and is extended here, never replaced.

### Frame

- **Purpose:** Pommora carries a Nexus between devices through a hub Pommora owns, built on the identity layer that already exists. Syncthing was weighed and set aside (see Considered & Rejected); its conflict rule is the one thing borrowed.
- **Core Value:** an edit on one device reaches every other device holding that Nexus within seconds, with a stated rule for every case in between, and nothing built here needs reworking when accounts, permissions, other authentication methods, or a cloud-hosted hub arrive.
- **Success Criteria:** two desktop instances holding one Nexus id, bound to one hub, observe every row of [[Cross-Device Mutation Checklist]] landing on the other side; a device that edits offline reconciles on reconnect under the conflict rule with the loser recoverable; the propagation timeline in F reads true against measurement.

### Sources

- [[NexusSyncPM]] — what stands: three identities, the device model, signed requests, the four-verb server. Its "never a dependency" line stays true under this log.
- `Sync/server.ts` (316) — the roster server on built-ins; extended here with the change log, blob store, and feed.
- `Core/Sync/contract.ts` (62), `authority.ts` (17), `client.ts` (48), `handlers.ts` (133) — wire types, canonical string, signed `call`, six `sync:*` channels. All kept.
- `Desktop/Config/device.ts`, `secrets.ts` — the Ed25519 device key and keychain store. Kept.
- `Core/Paths/exclusion.ts` `neverWatched` — the watcher predicate the manifest rule is defined against.
- `Core/Nexus/remint.ts` `adjudicate()` — the duplicate-ID judge; takes a baseline read from `local_state`, which never travels.
- `Desktop/FileWatch/watcher.ts:28` — `SETTLE_MS = 200` gates every local render; the sync client's debounce is its own.
- `Core/Files/atomicWrite.ts:15` `rewritePreservingTimes` — byte changes that hold mtime (`governedSweep.ts`, `adopt.ts`); why mtime cannot be the conflict clock.
- `Core/Nexus/watchSettle.ts:36-46` — the chokidar ignore predicate; tile bodies and `.trash` never emit an event today, so the sync feed needs the predicate widened.
- `Desktop/FileWatch/watcher.ts:56` — the write-echo check returns before `batch.push`; the sync tap sits above it.
- `Core/Properties/journalSlot.ts`, `propertyJournal.ts`, `contextJournal.ts` — crash-recovery journals under `.nexus/`; excluded from the manifest.
- `Core/Pages/fileHistory.ts:30-38` — snapshots are page-only and gated on the File History setting; loser capture cannot ride them alone.
- `Core/Platform/machine.ts:28` `utimes` — how Arrival stamps the writer's mtime on a landing.
- `Core/Paths/nexusPaths.ts:28-33` — thumbnails and `crops.json` sit inside `.nexus/`.
- `Core/Contract/engineGraph.test.ts:12` — Core's externals are pinned to `ulidx, yaml, zod`; the merge library stays renderer-only so the list holds.
- `Core/Trash/trashRows.ts:49` — a bundle whose record has landed without its artifact lists nothing; why a half-arrived bundle is safe.
- `Core/Platform/machine.ts:33`, `Core/Contract/handlers.ts:26-31` — `sha256Hex` and the transport body are string-only today.
- `Core/Nexus/watchPatch.ts`, `Desktop/FileWatch/watcher.ts` — chokidar with write-echo suppression; the sync client subscribes here rather than walking.
- `Desktop/Store/versionsDb.ts` — per-page snapshots keyed by `ID`, `edit | external | restore`; per-device.
- [[Cross-Device Mutation Checklist]] — every mutation expected to reach a second instance; this arc's test plan.
- [[9-4 Mobile & Sync Research]] — change-feed semantics (monotonic seq, cursor after apply, typed resync), conflict shape (Syncthing's rule), Node built-ins server findings, Capacitor findings.
- [[Codebase Audit — Report]] Topic 2 — D-2 (open editor never reloads on external change) and D-3 (re-mint under a second writer), both ruled here.
- Sizing (09-13-2026, in-session): Syncthing daemon ~59k Go LOC, under 3% relevant to a star topology; own star build estimated ~2,250 TS LOC on top of the 576 that exist.

### Decisions

#### A — Scope

- **A-1:** [confirmed] This arc is content sync between desktops through the hub: the change log, blob store, feed, client loop, conflict rule, versions capture, and the editor's absorption of a landing. Mobile, accounts, permissions enforcement beyond a role column, other auth methods, and cloud hosting are shaped-for, not built.
- **A-2:** [confirmed] Pommora's own transport. Syncthing, Obsidian Sync, and every folder transport remain prior art only.
- **A-3:** [confirmed] The identity layer stands unchanged: device keys, fingerprints, the roster verbs, signed requests, the Nexus heading. This arc adds to them.
- **A-4:** [confirmed] Any host can create a Nexus and be its first device. Nothing in `Core/Nexus/identity.ts`, `Core/Sync/Keys`, or `Core/Sync/Client` is desktop-only: a phone mints the Nexus id, the content key, and the password, binds first, and is approved by construction, exactly as a desktop is. The desktop is a client like every other.
#### B — Topology

- **B-1:** [confirmed] Star. Every device syncs with the hub and only the hub. Direct device-to-device transfer is a Prospect; no discovery, no NAT traversal, no relays.
- **B-2:** [confirmed] End-to-end encryption is required: the hub holds ciphertext only and never sees the Nexus password or the content key. Transport is TLS on top.
- **B-3:** [confirmed] The hub keeps ciphertext blobs in its SQLite; there is no readable folder on the hub. On every device nothing exists beyond the Nexus folder and the `nexus.db` and `versions.db` already inside it.
- **B-4:** [confirmed] One hub serves many Nexus', keyed by Nexus id, as the roster server already does.
- **B-5:** [confirmed] Development and the first proof run entirely on Nathan's MacBook: the hub process plus two app instances each holding a copy of one Nexus (the two-instance recipe in [[Development-Environment]]). The Windows machine is the first real second device; the iPhone follows under the Mobile Prospect. A Dockerfile is the deploy artifact this arc leaves; running it anywhere is the Cloud Prospect.
- **B-6:** [confirmed] A hub that is unreachable means nothing syncs until it returns, as with Obsidian Sync. The mitigation is an always-on machine, not topology; a hub runnable from the desktop app is a Prospect for the time before one exists.
#### B′ — Keys

- **B′-1:** [confirmed] A Nexus key ring: the first device mints a random content key with an id, and D-4 adds successors; each blob's header names the key that wrote it. The newest entry writes; the user-assigned Nexus password (NFKC-normalized first, since an iPhone and a Mac keyboard can emit different codepoints) derives a wrapping key (PBKDF2-HMAC-SHA256 via Web Crypto, ≥600,000 iterations, random salt, parameters stored so they can rise) that wraps every entry of the ring. A password change re-wraps the ring and never re-encrypts content.
- **B′-2:** [confirmed] Each device also mints an X25519 key beside its Ed25519 signing key; an approving device wraps the ring to the new device's X25519 key, so a paired device unlocks without the password being typed again. The hub's device row gains that public key additively.
- **B′-3:** [confirmed] Items are AES-256-GCM blobs, one per whole file, with the item's path, the key id, and the protocol version bound as additional authenticated data so the hub can neither move ciphertext between paths nor downgrade. The plaintext record beside the blob carries the NFC-normalized relative path, the version, the mtime, and the size, so the hub can order and arbitrate without reading content.
- **B′-4:** [confirmed] The Nexus password is typed once per device at bind and held in the platform keychain; an approving device wraps the ring to the new device so it never types the password. A lost password with no other approved device means the hub copy is rebuilt from one device, as with Obsidian Sync.
- **B′-5:** [confirmed] The Nexus info record on the hub carries the protocol version, the KDF parameters, the History Timeframe, and the wrapped ring per device and for the password; the hub enforces create-once and, since D-4 appends to the ring, refuses a write whose base version is stale, so two concurrent revocations serialize. A wrong password is a failed unwrap, no separate verifier.
#### C — What Travels

- **C-1:** [confirmed] The manifest is its own predicate beside `neverWatched`, defined from it rather than as it: every entry the watcher would watch, plus `.trash` at the top level, minus `.db`, `-wal`, `-shm`, minus `.nexus/Assets/<id>/thumbnails/` (a cache rewritten on navigation that would push on every click and regenerates on the receiver from the assets that do travel; `crops.json` is authored and travels), minus the cascade journals `property-cascade.json` and `context-rename.json` (crash-recovery records that would replay a finished heal on another device).
- **C-2:** [confirmed] Whole-file items; no chunking. A per-file cap of 50 MB with a skipped-and-reported outcome.
- **C-3:** [confirmed] Aliases in `nexus.db` stay a known issue. `settings.json`, `state.json`, every other JSON under `.nexus/`, and every `_*.json` sidecar travel whole and land through the key-level merge in F-6 rather than whole-file mtime-wins; F-6 is therefore Core, ordered last but never cut, since the Concurrency Locked Decision names per-section updates as the approach.
- **C-4:** [confirmed] File names travel in plaintext; only content is encrypted. The hub sees the folder structure and never a body.
- **C-5:** [confirmed] `excluded_folders` in `settings.json` changes the manifest on every device at once. An exclusion change is manifest-only: entries leave or join the set, and never generate tombstones. Exclusion belongs to whoever owns the Nexus; the role that later keeps a non-owner out of `settings.json` entirely is the Accounts Prospect.
- **C-6:** [confirmed] A page's frontmatter is part of the page file and travels with it; nothing inside a page is ever split out.
#### D — Identity, Authority, and Expansion

- **D-1:** [confirmed] Device-key identity stays the day-one credential. The server's `membership` row gains a `role` column (`owner | editor | reader`) additively under the schema-version rule; The creating device is `owner`; `approve` grants `editor`; `store`, `approve`, and `revoke` refuse a `reader`, and only an `owner` revokes. Changing a role is a Prospect route. That is the whole of permissions in this arc: one column and one check per mutating route, so read-only devices and per-user roles land later without a schema break.
- **D-2:** [confirmed] Request authority becomes one function on the hub that resolves a request to a device row and a role; today that resolution is inline across two branches of `route()` (`Sync/server.ts:245-261`) and `verifySigned` only checks a signature. Accounts, OAuth, or any other method later resolve a caller through that one function; no route reads a signature directly. This is the don't-foreclose for authentication methods.
- **D-3:** [confirmed] A person owning several devices is a later grouping over device rows (the Accounts Prospect); the device stays the identity.
- **D-4:** [confirmed] Revoke is cryptographic. The revoking owner mints a new content key, wraps it to every remaining device's X25519 key and to the password, and stores it as the newest entry of the Nexus key ring; every store after that uses the new key, and blobs already on the hub stay under the key that wrote them, so nothing is re-encrypted. A revoked device can read nothing stored after its revocation, and on learning it is revoked it discards its keys from the keychain. What it already holds on disk is plaintext files and was never the hub's to take back.
#### E — Protocol

- **E-1:** [confirmed] One monotonic sequence per Nexus on the hub. An item's version is the sequence of the change that wrote it; the store precondition and the pull cursor share that counter.
- **E-2:** [confirmed] Verbs added to the route table: `store` (items with base version; per-item typed outcome in a 200; conflict outcome carries the hub's item), `pull` (`{changes, cursor, has_more}` since a cursor; typed resync error when the cursor predates retention), `fetch` (one item's bytes by version), `feed` (server-sent events over `node:http`, one stream per open Nexus carrying `{seq}` ticks; the client pulls on a tick — one-directional, so no WebSocket server and no library). A `store` may mark an item as a capture, which the hub keeps as a non-head version under retention without advancing the item's head. A `store` is one SQLite transaction and carries a request id, so a retry after a dropped reply is idempotent. The client persists its cursor per page only after that page is applied.
- **E-3:** [confirmed] Deletes are tombstones in the log; a tombstone is a change with no bytes. Retention is indefinite for tombstones (they are rows, not blobs) so a long-offline device never resurrects a deleted page. Blob retention follows the Nexus's History Timeframe, carried in the plaintext info record since the hub cannot read `settings.json`.
- **E-4:** [confirmed] The wire stays JSON over the existing signed-request shape for verbs; `store` and `fetch` carry bytes. The transport member and `machine().sha256Hex` gain byte forms, the signing string hashes the raw body as today, the hub streams a body to a spool rather than buffering it, and the body cap and the request timeout become per-route (8 KiB and ten seconds for verbs; 50 MB and a transfer budget for bytes).
- **E-5:** [confirmed] Both ends derive from one route table in `Core/Sync/Contract`; the hub re-spells the few validators it executes, as today, since the type-only gate is what keeps the hub on built-ins. Sharing runtime code with the hub is a later call the route table does not foreclose.
- **E-6:** [confirmed] A rename is one change-log entry carrying both paths, so no landing ever sees one `ID` at two paths; a move is the same entry.
- **E-7:** [confirmed] The hub binds to an address from the environment (`POMMORA_SYNC_HOST`, loopback by default) and terminates TLS from a certificate and key it is handed; development runs a self-signed certificate. A device pins the hub's certificate fingerprint at bind, kept in the `sync` scope beside the address, so a rented certificate or a self-signed one are the same to the client.
#### F — Conflict, Landing, and the Timeline

- **F-1:** [confirmed] The hub's version precondition is the one conflict authority: a `store` whose base version is stale is refused with the hub's item. The client fetches the hub's bytes, then decides locally between its bytes and the hub's by the writer's modification time carried on each record, times within two seconds counting as equal and equal times breaking by device id; the loser is captured and the winner is re-stored against the fresh version; when the client's bytes lose, it also ships them as a capture (E-2) so the hub holds both versions in either direction. The files C-3 names skip the mtime decision entirely and go through F-6, re-storing the merged result. Mtime is the tiebreak inside a refused push, never the clock that detects a conflict, because `rewritePreservingTimes` changes bytes without touching mtime. A modification beaten by a tombstone is still captured. No conflict copies are ever written into the Nexus.
- **F-2:** [confirmed] The loser is captured, never dropped: on the device, into a `captures` table in `versions.db` keyed by relative path, for every kind of file and regardless of the File History setting (a page's capture also lands as an `external` snapshot when File History is on); on the hub, as the prior ciphertext version in the blob store within the History Timeframe once the winner is re-stored, and as the loser's capture-store when the client lost, so both sides hold both versions in either direction. This is the only cross-device history in this arc; a File History frame that reads hub versions is a Prospect.
- **F-3:** [confirmed] A landing over an open page is absorbed by a three-way merge in the editor's host, on receipt of a `pages:changed` push from the watcher: base is the text the editor loaded, local is the buffer, remote is the landed file; the caret holds. A clean tab reloads silently as the degenerate case. This rules D-2 of the audit. `pages:changed` is declared as a Push in `bridge.ts`; the merge library is imported by the renderer only, behind one seam, so it never enters the engine graph; `Core/Sync/Arrival` never reaches the editor, it lands the file and the push does the rest.
- **F-4:** [confirmed] The propagation timeline, stated so it can be measured: the writer's watcher settles (200 ms, unchanged), the sync client's own debounce over watcher events runs (2,500 ms), the client encrypts and pushes (one request), the hub appends and ticks the feed (tens of ms), the receiver pulls, decrypts, and lands the file atomically, the receiver's watcher classifies it as external (200 ms), the editor merges. The landing reaches the receiver's sync feed like any external write and is dropped there by the hash short-circuit, so nothing bounces back. Bar: under five seconds on a reachable hub. Every mutation in [[Cross-Device Mutation Checklist]] is measured against this.
- **F-5:** [confirmed] Offline: the client keeps writing locally; on reconnect it pushes first, so every dirty item meets the version precondition, then pulls; a landing never overwrites an unpushed edit. Two devices editing one page offline resolve to the newer mtime with the older captured on both sides.
- **F-6:** [confirmed] JSON files named in C-3 land through a key-level three-way merge: base is the last synced bytes (kept in the `sync` table for these files, since they are small, and regenerable from the hub by version), local is the file on disk, remote is the landing; a key changed on one side takes that side, a key changed on both takes the newer mtime's. Arrays inside a key (`page_order`, `views`) are one key. This is the last phase of Arrival, never cut; it shares its base machinery with F-3.
- **F-7:** [confirmed] The re-mint judge (D-3 of the audit): a landing carries an `ID` that may already exist locally only when two devices created the same page id, which ULIDs make negligible; a rename lands as one entry (E-6) so the judge sees one claimant. No conflict ledger.
- **F-8:** [confirmed] First bind: an empty hub takes everything local; an empty local takes everything hub; both non-empty reconcile item by item, equal hashes seeding the base record without a push or a landing, differing content going through F-1. No page pushes as new against a hub that already holds it.
- **F-9:** [confirmed] A `.trash` bundle is two files that may land in either order; the Trash frame lists a bundle only when both are present, so a half-arrived bundle is invisible rather than broken, and Empty acts only on complete bundles.
#### G — Change Detection

- **G-1:** [confirmed] The sync feed taps the watcher's `onEvent` above the write-echo check, so the app's own writes reach it; chokidar's ignore predicate admits `.trash` and tile bodies, and a predicate in `onEvent` hands those paths to the sync feed and returns before `batch.push`, so the tree never walks them. The client never walks except at bind and on resync; the manifest walk runs once at bind and on resync. A base record per item (`path, mtime, size, hash, version`) lives in a `sync` table in `nexus.db`, since it is device-local and regenerable.
- **G-2:** [confirmed] A push is confirmed by content hash against the base, so an atomic rewrite that restored identical bytes never pushes. A landing is written through the raw write and records no echo, so the watcher treats it as external; the hash short-circuit is what stops it re-pushing.
- **G-3:** [confirmed] One sync loop per device, so no item is pushed or landed twice at once; the desktop apply takes the page's file lock.
- **G-4:** [confirmed] Arrival stamps the writer's mtime from the record onto the landed file through `machine().utimes`, so a landing carries the edit's time rather than its arrival time and the tiebreak in F-1 compares like with like.
- **G-5:** [confirmed] When `nexus.db` is unavailable the session runs without a base record and sync is off for that session, reported in the Nexus heading; a later session rebuilds the base by the F-8 reconcile.
#### H — Placement and Structure

- **H-1:** [confirmed] `Sync/` stays the hub's workspace on Node built-ins, split by concern as it grows: `Sync/hub.ts` (entry, listen, TLS), `Sync/Store/` (SQLite: roster, log, blobs, versions), `Sync/Routes/` (one file per route group, matching the `RouteTable` type), `Sync/feed.ts`. `Core/Sync/` splits the same way: `Contract/` (types, route table), `Keys/`, `Client/` (signed call, the loop, the base record), `Arrival/` (landing, the two merges, versions capture), `handlers.ts`.
- **H-2:** [confirmed] Mobile later binds `Core/Sync/Client` to a native transport and a native secret store, pulls while open, and decrypts locally; the hub gains no phone-specific verb. One client codebase serves every host.
- **H-3:** [confirmed] Crypto sits behind one `Core/Sync/Keys/` seam over Web Crypto, which Node 24 and WKWebView both expose natively, so desktop and phone run one implementation. The retired rule "Core never handles key bytes" narrows to "the host owns the signing key": `HostDevice.sign` stays in Desktop, the wrapped content key and the password stay in `Desktop/Config/secrets.ts`, and Core handles the unwrapped ring in memory only. A phone host binds the same seams to its own keychain, which is what lets A-4's mobile-created Nexus exist.
- **H-4:** [confirmed] Pieces that may move to the cloud are the hub as a whole (a container) and nothing inside a device; no device-side code assumes the hub's address shape beyond "an https origin".
#### K — Reconciliation

- **K-1:** [confirmed] [[NexusSyncPM]] gains the topology, the protocol, the conflict rule, the timeline, and the structure; its Pending list empties.
- **K-2:** [confirmed] [[Codebase Audit — Report]] D-2 and D-3 close under F-3 and F-7.
- **K-3:** [confirmed] [[CorePM]], [[DesktopPM]], [[ConfigurationPM]], [[Dependencies]] (a merge library enters the renderer behind a seam), [[Development-Environment]] (hub start, two-instance recipe), CLAUDE.md's Hard Rule wording for `Sync/` (Nathan's own edit), `bridge.ts` (`pages:changed`, the new `sync:*` channels).
- **K-4:** [confirmed] The Database Locked Decision is honored as written: `versions.db` already held non-regenerable history before this arc, the `sync` table's base bytes are regenerable from the hub, and neither is expected to travel. [[NexusSyncPM]] states the `versions.db` exception in one sentence.
- **K-5:** [confirmed] [[NexusSyncPM]] `:10` and [[Cross-Device Mutation Checklist]] `:7` restate the manifest rule without thumbnails and journals.
### Core (must-have)

- The manifest predicate, consumed.
- Keys: the ring, password wrap, per-device wrap, rotation on revoke, the info record, the Nexus password rows in the Nexus heading.
- Hub: change log, ciphertext blob store, versions retention, four new routes plus rename, the feed, the `role` column, one authority function, configurable bind address, TLS with certificate pinning at bind, Dockerfile.
- Client: base record, watcher subscription, encrypt, push, pull, decrypt, cursor, resync, offline reconcile.
- Conflict rule with loser capture on both ends; first-bind reconcile.
- Arrival: atomic apply with the writer's mtime, editor three-way merge, clean-tab reload, key-level JSON merge (last phase, never cut).
- The timeline measured over the mutation checklist.

#### Prospects (allowed later, not now)

- Mobile companion as a client of the same verbs, including creating a Nexus on the phone (A-4) — don't-foreclose: `Core/Sync/Client` and `Keys` host-neutral over Web Crypto.
- Hub runnable from the desktop app for the time before an always-on machine exists — don't-foreclose: the hub is one process over `node:http` and SQLite.
- Accounts and per-user permissions — don't-foreclose: `role` column exists; authority is one function.
- Other authentication methods (OAuth, secrets, encrypted keys) — don't-foreclose: D-2.
- Cloud-hosted hub — don't-foreclose: the container is the unit.
- Direct device-to-device transfer — don't-foreclose: the client's transport is the host member.
- File History frame reading hub versions.
- A mirror: a headless host binding of Core's engine plus the sync client running beside the hub over a real folder, paired like any device and handed the content key by an approver — why deferred: it requires trusting that machine with plaintext, an opt-in per Nexus; don't-foreclose: the engine and the client stay host-neutral (the engine gate already enforces it), so the mirror is a third `Core/Platform` binding, never a second engine.
- Per-device `settings.local.json` for Interface Scale and Webpage Zoom — don't-foreclose: `settings.json` stays the one travelling settings file.
- Merge below the top-level key for JSON (one entry inside `page_order`, one view inside `views`) — don't-foreclose: F-6's merge takes a depth.
- Read-only Nexus sharing and a route that changes a device's role.
- Thumbnails travelling — why deferred: a cache rewritten on navigation; don't-foreclose: one manifest exclusion line.

#### Out of Scope (won't do)

- Block-level delta, discovery, relays, NAT traversal.
- Conflict copies inside the Nexus.

#### Considered & Rejected

- Embedding Syncthing as a child process — rejected 09-13-2026: a star needs Pommora's hub either way (mobile runs no daemon, and a peer mesh is the 97% of Syncthing this case never uses), so the binary adds ~59k Go, a second device identity, and folder markers to move bytes the hub already serves. Its conflict rule is kept.
- Forking Syncthing in Go — rejected: second language, MPL publication per patched file, and the wanted changes are config.
- Per-page CRDT for live co-editing — rejected for this arc: changes what a file is; a later layer over the same files.
- A trusted plaintext hub serving the phone over a file API — rejected 09-13-2026: E2EE is required, so the hub reads nothing and the phone decrypts itself.
- A headless Pommora as the hub in place of the locker (Core's engine over a real folder, answering the renderer's channels over HTTP so the phone needs no sync code) — rejected 09-13-2026 as the day-one shape: requires plaintext on the hub. Kept as the Mirror Prospect.
- LAN direct fallback when the hub is unreachable — rejected: version vectors and discovery for a case an always-on machine removes.

#### Lessons

- Two conflict authorities is one too many: a version precondition detects, mtime only breaks ties inside a refused push. → [[Development-Environment]]
- "Every entry the watcher would watch" is a definition, not an event source; a predicate defined from another must name its own feed. → [[Development-Environment]]
