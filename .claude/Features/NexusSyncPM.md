## Nexus Sync

Pommora carries a Nexus between devices itself. Every device holding a Nexus talks to one hub and only the hub: it encrypts each changed file whole, sends it as a numbered change, and pulls the change log back, so an edit on one machine reaches every other machine holding that Nexus within seconds. A Nexus, a device, and a hub are three separate identities; the hub holds ciphertext, paths, and versions, and never a body, a password, or a content key.

### What Travels

The whole Nexus travels, `.nexus/` included: its Contexts registry, `settings.json`, the identity file, orderings, and the asset directory are as much a part of a Nexus as the Markdown beside them, and a copy missing them is a copy missing its organization.

What travels is one rule, the manifest rule: every entry the watcher would watch, plus `.trash` at the top level. Any `.db` file and its journals stay home, so `nexus.db` and `versions.db` are excluded by content rather than by convention, as this machine's own chrome and derived index. The navigation thumbnail folders stay home as a cache that regenerates from the images that do travel, while `crops.json` beside them is authored and travels. The two cascade journals stay home as crash-recovery records of a heal already finished elsewhere. Every other dot-entry, `.obsidian`, `.git`, and `.claude` among them, stays home as belonging to another application.

Two files are admitted by the manifest and still refused at the push: one over fifty megabytes, and one whose path is not in NFC form. A Markdown file carrying no `ID` key waits until adoption stamps it, and `excluded_folders` in `settings.json` is part of the manifest, so an exclusion change reaches every device at once.

### Three Identities

**A Nexus** is its id: a ULID minted on first open. The id names the Nexus rather than the folder, so a copied folder is a replica of the same Nexus and both copies reconcile against the same hub.

**A device** is its keys. Each install mints one Ed25519 signing pair, the device id being the hash of its public key, and an X25519 agreement pair whose public half is what an approving device wraps the Nexus's keys to. The public halves and a name travel with the app's config; the private halves stay keychain-encrypted and reach Core only as a signature or a shared secret.

**A hub** is the address a Nexus is bound to, held per Nexus and per device, carrying the address, the pinned certificate fingerprint, and this device's pull cursor. Disconnect clears that binding and every base record with it: the device keys stay, and the hub's approval stays until it is revoked.

A Nexus on the hub holds a list of devices. The first device to connect a Nexus id creates the Nexus, is approved by construction, and is its `owner`; every device after it arrives pending and becomes an `editor` when an approved device approves it, and a device cannot revoke itself.

### The Keys

A Nexus owns a key ring. Its first device mints a random content key, and a revoke mints its successor; the newest entry seals new items, and a blob already on the hub stays under the key that wrote it, so nothing is ever re-encrypted. The ring is stored wrapped, never bare: the Nexus password derives a wrapping key, and each ring entry is sealed under it, so a wrong password is simply a failed unwrap.

An approving device also wraps the ring to the joining device's X25519 public key, which is why the Nexus password is typed once per Nexus rather than once per device. A revoke drops the revoked device's entries from the ring, mints a fresh key, and wraps it to every remaining holder, so the revoked device reads nothing stored afterward. Changing a Nexus password re-wraps the ring without touching content, and is a Prospect rather than a channel that exists.

An item is one whole file sealed under the newest key, with the key id and the file's path bound as authenticated data, so a blob stays sealed under the path it was written at and the hub cannot present an older protocol.

### The Hub

The hub is a folder, `Sync/`, running as its own process on Node's built-ins alone. It reaches Core with types only, and both ends satisfy one shared route table, so a missing or mismatched route is a compile error. A request resolves the caller to a device and a role, verifies the signature, then reaches its handler; the byte route resolves the caller and verifies its signature over the addressed hash before a single byte is spooled, since an unauthorized upload is refused without being read. Its JSON routes cover the roster, the key ring, and the change store and pull, each capped and role-gated, while bytes travel their own content-addressed route, spooled to disk and checked against their address before they're stored.

One SQLite file, `sync.db`, lives in the hub's own directory, never in the app's config and never inside a Nexus, holding the roster, the key ring, the change log, and the ciphertext.

The bind address, the data directory, and the port come from the environment, defaulting to loopback. TLS is on whenever a certificate sits in the data directory, and a device pins the hub's fingerprint at bind and checks it on every connection, so a self-signed certificate and a rented one are the same to the client. The hub runs as its own process rather than inside the desktop app, since a hub inside the app would sleep with the laptop and leave a phone nothing to talk to; a desktop-hosted hub is a Prospect for an always-on machine.

### Signed Requests

Every request is signed by the device key over one canonical string of the method, the path, the hash of the body, and a timestamp, and the hub re-derives the string and verifies it against the public key it holds; a timestamp more than five minutes off is refused. Connect is the exception: it verifies against the key in its own request body and refuses unless that key's fingerprint is the caller's device id. There is no session and no token; a foreign Nexus id and a revoked device both answer not-found rather than a distinguishing refusal.

### The Change Log

Each Nexus carries one monotonic counter on the hub. An item's version is the sequence number of the change that wrote it, read by both the store precondition and the pull cursor. A change is a write, a delete, or a rename, and a capture rides the same store without taking a sequence number; tombstones are kept indefinitely, so a long-offline device never resurrects a deleted page.

A store sends a batch of changes, each naming the version it was based on, and answers one typed outcome per change: accepted with its new version, stale with the hub's own head, or missing its blob. A pull asks for everything after a cursor and, when there is nothing newer, parks in a long poll until the counter moves or a wait budget expires, so the client's loop is one long poll rather than a stream.

On each device the client keeps one base record per item — path, mtime, size, hashes, and version. A file whose floored mtime and size still match its base record is not read at all, which is what keeps a session start cheap. The client walks the Nexus at every session start and on resync; between sessions it listens, debouncing a burst of local changes into one push.

### Conflict

The hub's version precondition is the one conflict authority. A store whose base version is stale is refused with the hub's own head, and the client fetches the hub's bytes, compares the writer's modification time on each record, and takes the newer.

The loser is kept rather than discarded: on the device in its capture store, and, when File History is on, a page's losing text also lands there; on the hub, as a capture beside the winning head when the client's bytes lose, or the prior blob under the History Timeframe when they win. A tombstone or a rename that replaces local bytes captures them on the device alone, and a merged JSON file keeps its losing keys nowhere. This leaves the Nexus folder itself free of conflict files.

A landing pushes an unpushed edit first, and captures the local bytes, under the file's own lock, whenever what it replaces is not what the base record holds. Offline, the client keeps writing locally; a session start pushes before it pulls, and a running session re-pushes what failed after its next answered pull. At first bind, an empty side simply takes what the other holds, and two non-empty sides reconcile item by item.

### Landing

A landed file is written atomically under the writer's modification time and records no write echo, leaving the receiving watcher to treat it as an ordinary external change. A landed rename moves the file and every base record beneath it; a delete removes the file and an emptied parent directory.

Two kinds of file land through a merge rather than a replacement. The JSON files under `.nexus/` and the `_*.json` sidecars merge key by key against the last synced bytes: a key changed on one side takes that side, a key changed on both takes the newer writer's, and the merged bytes land under the current time.

A page open in an editor absorbs its landing instead of reloading under the writer: the renderer takes the buffer as one side and the landed file as the other, and dispatches the difference as a changes-only transaction outside undo, so the caret keeps its position; a surface without that merge reloads, capturing any text its last acknowledged save does not hold. A body write is compare-and-swap, keyed to the hash the editor last loaded or saved, and a refusal routes to the same merge or reload rather than to a retry.

### The Timeline

A change takes about 2.7 seconds to cross: the writing device's watcher settles, the sync client's debounce runs, the client encrypts and pushes, the hub appends and wakes the waiting pulls, the receiving device pulls, decrypts, and writes the file, its own watcher classifies the result as external, and the editor merges. [[Cross-Device Mutation Checklist]] records each mutation's own reading.

### Status

Sync reports one state per session — off, idle, syncing, or error — and an off state held by something carries why: a password is needed, the device is pending approval, it was revoked, the Nexus database is unavailable, or the hub refused. The Nexus heading in Settings › General binds to that state; [[ConfigurationPM]] is the roster of those rows.

### Beyond This

The mobile companion binds the same client to a native transport and secret store; nothing in the client, the keys, or the arrival path is desktop-only. Direct device-to-device transfer, a File History frame reading the hub's retained versions, and thumbnails travelling are each shaped for and unbuilt.
