## Nexus Sync


Pommora carries a Nexus between devices itself. A Nexus, a device, and a server are three separate identities: the Nexus is named by the id in its own folder, a device by the fingerprint of a key it mints once and keeps in the machine's keychain, and a server by the address one device binds one Nexus to. The server holds the list of devices a Nexus admits; every request to it is signed by the device key. This document covers what travels, the three identities, the device model, request authority, and the server itself.

### What Travels

The whole Nexus travels, `.nexus/` included: its Contexts registry, `settings.json`, the Nexus identity file, orderings, and the asset directory are as much a part of a Nexus as the Markdown beside them, and a copy missing them is a copy missing its organization.

What travels is one rule, the manifest rule: every entry the watcher would watch, plus `.trash` at the top level, minus any name ending in `.db`, `-wal`, or `-shm`. `nexus.db` and `versions.db` and their journals are excluded by that rule rather than by convention, and they are excluded because they are device-local by content: this machine's chrome and the index derived from content it can rebuild. Every other dot-entry stays home, `.obsidian`, `.git`, and `.claude` among them, since they belong to another application rather than to the Nexus. The watcher's own predicate (`neverWatched` in `Core/Paths/exclusion.ts`) already drops a database and its siblings, so the rule is defined against a predicate the read path shares.

A folder transport of any other kind is prior art, never a dependency. NexusOS reaches a second machine through Obsidian Sync, which drops every dot-entry but `.obsidian` and so leaves `.nexus/` behind; Pommora's own transport is what makes a Nexus a complete travelling unit.

### Three Identities

**A Nexus** is its id: a ULID in `.nexus/nexus.json`, beside the creation stamp and the Agenda folder map, minted on first open when the file is absent (`Core/Nexus/identity.ts`). The id names the Nexus rather than the folder, so a copied folder is a replica of the same Nexus and both copies reconcile against the same server. A `nexus.json` that exists and cannot be read is never written over: that session runs on a throwaway id and writes nothing.

**A device** is its key. Each install mints one Ed25519 pair through WebCrypto (`Desktop/Config/device.ts`); the device id is the lowercase hex SHA-256 of the 32 raw public-key bytes, and the public key travels as unpadded base64url, forty-three characters. The public half, the id, and a name — the machine's hostname by default, one to sixty-four characters — sit in `pommora.json` beside the application; the private half sits keychain-encrypted in `secrets.json` beside it and reaches Core only as a signature. A mint refuses before it writes anything when the keychain is unavailable. A stored device whose secret is absent is a lost identity: the host reports it and mints again. A secret the store holds but cannot decrypt leaves the launch identity-less and reported, with both files untouched, since a key that may return is not a key to replace.

**A server** is the address a Nexus is bound to, held per Nexus and per device in the `sync` scope of `local_state` (`Core/Platform/localState.ts`), a singleton row in that Nexus's own database. Two Nexuses may sit on two servers, and two devices holding one Nexus may reach it at two addresses. Disconnect clears that row and nothing else: the device key stays, and the server's approval stays until it is revoked.

### The Device Model

A Nexus on the server holds a list of devices. The first device to connect a Nexus id creates the Nexus and is approved by construction; every device after it arrives pending and is approved by a device already approved. Revoking removes one device's membership. Several people sharing a Nexus is several people's devices on one list, and an account layer grouping devices under a person is a later addition that leaves the device key as the identity.

Connect is idempotent on the public key: it upserts the device row and adds the membership only when there is none, so a device that connects twice is in the same state it was. The device row is global — one name across every Nexus — while membership is per Nexus, so a rename is visible everywhere at once and approval is not. Renaming re-issues connect for the open Nexus, which is also how a revoked device that renames itself reappears pending on an approver's list.

A refused approve or revoke answers the interface with a freshly fetched list rather than a guess: approve refuses a target that is no member of the Nexus with 409, and both verbs refuse a caller they do not admit with 404; neither refusal says anything true about the list. A device cannot revoke itself; that refusal is what leaves this device's own row without a Revoke.

### Signed Requests

Every request is signed by the device key over one canonical string, pinned in prose beside the wire types in `Core/Sync/contract.ts` and built by `Core/Sync/authority.ts`: the uppercased method, the path, the lowercase hex SHA-256 of the UTF-8 body — of the empty string when there is none — and the integer millisecond timestamp, joined by newlines. The device id, the timestamp, and the base64url signature ride as the `x-pommora-device`, `x-pommora-timestamp`, and `x-pommora-signature` headers, and the server re-derives the string from the raw bytes it received and verifies against the public key it holds.

A timestamp more than five minutes from the server's clock is refused. Connect is the exception to verifying against a stored key: it verifies against the key in its own body and refuses unless that key's fingerprint is the caller's device id, which is what proves possession at first contact. There is no session and no token — four verbs do not amortize one. A request captured inside the five-minute window can be replayed, which localhost accepts; a nonce belongs with the admission secret that guards Nexus creation once the server leaves localhost.

A Nexus id whose caller is not approved answers not-found rather than forbidden, so a foreign Nexus id is never confirmed to exist.

### The Server

The server is one file, `Sync/server.ts`, on built-ins alone — `node:http`, `node:sqlite`, `node:crypto` — run as `npm run sync` on the source under type stripping. It reaches Core with `import type` only, so it re-spells the few things it must execute: the two validators, the fingerprint recipe, and the canonical string. The route table type lives in Core and both ends satisfy it, so a missing or mismatched route is a compile error.

It listens on `127.0.0.1:7473` (`POMMORA_SYNC_PORT`) and keeps one SQLite file, `sync.db`, in its own directory (`POMMORA_SYNC_DATA`, `~/.pommora-sync` by default) — never in the app's config and never inside a Nexus. Three tables: `meta` carrying a schema version the schema grows additively against, `device` keyed by fingerprint, and `membership` keyed by the Nexus id and the fingerprint together. It answers four verbs: connect, devices, approve, revoke. Anything that is not a POST to one of those four paths is not-found, and a body over eight kilobytes is refused unread.

It runs as its own process rather than inside the desktop app because a server inside the app sleeps with the laptop and leaves a phone nothing to talk to. A desktop-hosted server is a trade Nathan may weigh later; nothing in the client assumes where the server runs, and the client reaches it through the host's transport member, which bounds a request at ten seconds.

#### Pending

- The what-travels rule lands as one predicate beside `neverWatched` when the sync client consumes it.
- The Nexus password wraps one random content key per Nexus, and the wrapped-key list on the server carries a second entry per device, wrapped to an X25519 key each device mints alongside its signing key, so an approved device unlocks without the password being typed again.
- Content sync itself: items, versions, blobs, and the change feed.
- The mobile companion, which binds the same client to a native transport and a native secret store.
