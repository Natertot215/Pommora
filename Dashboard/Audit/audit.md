## Pommora Codebase Audit

**Pinned:** `f6511401d` (09-23-2026) · **Reconciled:** `3a5a37417` (10-03-2026) · **Findings:** 42/556

Thirty-four Opus investigators read every production file in `Core`, `UIX`, `Desktop`, and `Sync` in full, sliced by folder and by the jobs the code performs. Two mergers combined their 857 candidates by root cause, and twenty-one reviewers who hadn't raised them re-read every citation, reproduced the High ones against real modules, and killed 63. This document is the current state: findings that were fixed, withdrawn, or ruled moot are removed rather than annotated, and rulings are written into the findings they settle. The readiness and pace sections are the orchestrator's judgment, drawn from the evidence below them.

### Verdict

#### Readiness

**Plumb first, narrowly.** Three findings are High, all in Sync: F-064 and F-066 were reproduced against the real code, and F-625 was traced through it by two readers. Each is in code that saves, syncs, or deletes a person's files. The surrounding structure is sound, and the fixes are contained.

**What holds, with evidence:**

- **The layering rules all pass their checks.**
  - Core reaches the machine only through `Core/Platform`: zero Node or Electron imports across 700 Core and UIX files.
  - The code the host runs imports no React: 205 files, verified by `engineGraph.test.ts` and `hostGraph.test.ts`.
  - UIX imports nothing from Core.
  - Every channel is declared once in `bridge.ts`, and one `catch` turns a thrown error into a `Result`.
- **The gates are green at the pin.** Typecheck is clean across 7 projects, Biome is clean, and 5,498 tests pass. Only 0.39% of lines are exact copies.
- **The pure models hold.** The view pipeline, the tile layout model, the MarkdownPM engine and the connections grammar produced no High findings. Their Medium findings are about cost and duplication, not wrong results.

**What's broken, and where:**

| Area | State | High | Medium |
| ------------ | ----------------------------------------------------- | ------- | ---------------------------- |
| Sync | Changes from another device are written to whatever path the hub names, including outside the Nexus and into `.git/` or `.obsidian/` (F-064). A rebuilt or restored hub never gets unchanged files re-uploaded, so new devices receive a partial Nexus (F-066). A list two devices both edited keeps one device's items, so a Context rename can revert and hide its Spaces (F-605). Trashing a Collection or Set uploads the contents of its excluded folders (F-625). | 3 | 4 |
| Menus and pickers | The kit's buttons show no keyboard focus, so a Tab walk through a menu or toolbar loses its place on every button (F-182). | 0 | 1 |
| Identity | An ID lost or damaged outside the app is replaced rather than recovered on every path but a held page's own event, so tabs, pins, metadata, and a Nexus's device store lose what they were keyed to (F-640). | 0 | 1 |

**What extending costs today:**

| Addition | Files Touched | Ways to Do a Step | Grade |
| ------------------------- | ------------------------- | ------------ | -------------------------------------- |
| A new entity kind | ~20 | 1 | Moderate: every kind list reads `entities.ts`, and the compiler names each switch and table the new kind must fill |
| A new property type | 4 plus its editor | 1 | Cheap: one record entry, and the compiler names each table that still needs the type |
| A new editor construct | ~12 inline · ~18 block | 4 | Moderate: block rules are read from one place, and the word counter reads inline constructs from the tokenizer |
| A new view renderer | 3–4 plus the renderer | 4 | Moderate |
| A new floating window | 3–5 | 1 | Cheap |
| A new persisted setting | 2–3 synced · 2 per device | 4 | Cheap |
| A new host channel | 2–5 | 5 | Cheap |

**After Applying Fixes:** Rebuild and republish the Dashboard, which carries the line ledger with this audit below it, to the Dashboard the session's account owns: run `npm run build -w Dashboard`, publish `Dashboard/dist/dashboard.html` with `url: https://claude.ai/artifact/8PRPLWwk9ar9XXyJ8Hy7gQ` under `ntaichman@icloud.com`, or `url: https://claude.ai/code/artifact/7840fc59-41d5-4692-b5b6-c45de4d11401` under `ntaichmanalt@gmail.com`, and the ledger as its `audit.md` supporting file, then write `Dashboard/Ledger/loc-history.json` into its `ledger/history` document.

#### Pace Guidance

**Too fast for verification, not too fast for design.** Pommora has taken 3,955 commits since 05-10-2026, 1,896 of them in the last sixty days. The design choices hold up under that speed. The checking behind each change doesn't.

- **Fixes now match features.** In mid-May there was one fix for every ten features. Since mid-July there has been roughly one fix per feature in every two-week window. Refactors outran features through August and early September.
- **Rework is the norm.** Setting aside the 55 hub files that nearly every change touches, 82–90% of feature commits since July had a fix land on one of their files within fourteen days. In May it was 54%.
- **The problems are old.** The 09-07-2026 audit called the codebase "workable and foundational" and mechanical debt "near zero". The mechanical part is still true: exact duplication is 0.39% and knip finds 24 unused exports. But the twenty High findings the audit raised cited code last touched a median of 36 days ago, so most of them were already present at that audit and it didn't reach them. The median age across all findings, 18 days, mostly reflects the 09-05–09-07 repository restructure rewriting import lines, not new code.
- **Debt enters as drift.** Of the 350 findings:
  - 41% are Drift: two copies of one fact that grew apart.
  - 18% are Parallel Build: something built beside a mechanism that already did the job.
  - 14% are Residue left by a refactor.
  - 11% are Patch-Over: a fix layered on without removing its cause.

  Among the Medium and High findings, Drift and Patch-Over lead. The recurring shape is the one PM-062 named: one fact with two sources. Optimistic view layers shadow the saved view. Two sidecar writers split one file's writes.
- **It collects where the work is.** 53% of findings cite one of the most-edited tenth of files.

The Studio's workflow checks a change against its own diff. Closeout's twin sweep and the simplification pass look at what a session touched, not at the other home of the fact it touched. Drift gets through exactly there. A second surface copies a mechanism, both copies pass their own review, and they part ways a week later.

**What would change this:** a rework rate under 60% for a month after the first tier of the order above lands, and no new Drift findings in the next audit's fresh code.

---

### Workstreams

#### W4 · Sync Paths, Renames, and Resync

These are the ways a change travelling between devices can land in the wrong place, at two names, or not at all: an unchecked path from the hub, renames racing edits, capitalization that differs between devices, and a hub that was rebuilt or restored. Landing them makes the wire path-safe and a rebuilt hub whole again. It sits in the first tier because sync spreads any one device's mistake to every device.

##### F-064 · Changes from other devices are written to whatever path the hub names, including outside the Nexus.

> **Area:** Sync · **Lens:** Integrity · **Weight:** High · **Size:** S · **Net:** +12 · **Origin:** Drift

**Finding**

When another device's change arrives, the app writes, deletes, or moves the file at the path the hub's log names, with no check that the path stays inside the Nexus or inside the set of files sync may touch. A path like `../x` lands outside the Nexus folder, and a change into `.git/`, `.obsidian/`, or an excluded folder lands even though sync rules keep those at home; the hub rejects `..` but not `\`, so on Windows a peer's `a\..\..\x` becomes traversal. A compromised hub, or any editor device through the hub, can place any blob it holds at any path, and by naming an outside file in a delete it can make the app upload that file first, encrypted with the Nexus key every device holds. The documented promise that binding each blob to its path keeps the hub from moving ciphertext between paths holds only for decryption, since the landing path is never compared with it, and with NexusOS also an Obsidian vault, a planted `.obsidian/` plugin or `.git/config` is code that later runs on the receiving machine. Pull tests with hand-built changes landed a write for `../escaped.md` outside the Nexus root, a real page's write replayed as `../planted.md` (which still decrypts), and a write into `.git/hooks/post-commit`, because only reconcile gates arrivals through `manifestAdmits` while the live pull and `resolveStale` don't.[^63]

**Fix | Proposed**

Add one arrival gate in `Core/Sync/Arrival`: a change lands only if `manifestAdmits(session.scope)` accepts `change.path` (and `change.from` for a rename), the path carries no `\`, and a `write` change's `path` equals its `record.path`; otherwise it's skipped, the cursor advances, and status names it. Call it at the top of `landChange` and `resolveStale`; `manifestAdmits` already rejects a leading `..` or `/`, every dot segment but a top-level `.nexus`, every `_`-prefixed folder, and every excluded folder, so it's the survivor. Add `\` to the hub's `itemPath` refusal.

##### F-065 · A misbehaving sync hub can crash the app by sending an enormous reply.

> **Area:** Desktop · **Lens:** Integrity · **Weight:** Low · **Size:** S · **Net:** +5 · **Origin:** Shortcut

**Finding**

A sync hub, hostile or broken, can crash the whole app by sending back a reply that never ends. The hub limits the size of every request it accepts, but the app buffers whatever the hub sends back into memory before looking at it, and the transport runs in the Electron main process. An unbounded reply takes the app down, and the session restarts on every launch. `transport.ts:26` collects chunks with `res.on('data', (chunk) => chunks.push(chunk))` and keeps no running total, and `call.ts:90` casts `JSON.parse(reply.body)` to the route's reply type with no shape check.[^64]

**Fix | Proposed**

Add `TransportRequest.maxBytes`, set by `call` (a fixed JSON reply cap, such as 4 MiB) and by `getBlob` (`BLOB_CAP` plus `SEAL_OVERHEAD`); the transport keeps a running total and destroys the request past it. Checking the paths a reply names belongs to F-064.

##### F-066 · Reconnecting to a rebuilt or restored hub never re-uploads unchanged files.

> **Area:** Sync · **Lens:** Defect · **Weight:** High · **Size:** M · **Net:** +10 · **Origin:** Patch-Over

**Finding**

Each device keeps a record of what it believes the hub already holds, and when the hub loses its history (its data folder wiped and re-created at the same address, or restored from an older backup), the device keeps trusting that record and never re-uploads unchanged files. Reconcile sees files the hub has never heard of and hands them to the ordinary push, which skips every one whose bytes still match the stale record, so only files edited afterward reach the new hub and a device joining later gets a partial Nexus with nobody told. This breaks the documented recovery path, "the hub copy is rebuilt from one device" (Decision Log B′-4), whenever the rebuilt hub keeps its address. A second device rejoining after the rebuilt hub's change counter has passed its old cursor gets no `resync` answer at all, so it never reconciles, never re-uploads its unchanged files, and misses the rebuilt hub's changes numbered at or below its old cursor. Against the fake hub that mirrors `Sync/Store/log.ts`, two files were reconciled, the hub state wiped, and `reconcile` run again, which sent zero `/store` requests and left zero hub items.[^65]

**Fix | TBD**

Two moves, closing different gaps. In `reconcile`, drop a base row whose path has no head in the heads read before the push (`if (head === undefined) deleteBase(rel)` ahead of `toPush.push(rel)`), so the push sends it as a new write; this fixes the first device back after a wipe or a restore. Then tie the binding to the hub's history rather than its address: the key record's KDF salt is minted only when the hub's record is created (`freshKdfParams`), so `SyncScope` stores `salt` at bind, `sync:connect` treats the binding as kept only when address and salt both match, and `withKeys` compares `info.kdf.salt` with the binding before `begin` and, on a mismatch, drops every base row and resets the cursor to 0 so `begin` runs the first-bind reconcile; this fixes every later device after a wipe. A hub restored from backup keeps its salt, so a device whose old cursor it has already re-passed stays undetected until the hub issues a history epoch, and a future password change under fresh KDF parameters would trigger one harmless full reconcile.

##### F-067 · Renaming a page while another device's edit is in flight leaves the page at both names.

> **Area:** Sync · **Lens:** Defect · **Weight:** Medium · **Size:** S · **Net:** +10 · **Origin:** Drift

**Finding**

Renaming a page while another device's edit to it hasn't reached this device yet leaves the same page ID at two paths, which the duplicate-ID judge then splits into two pages. The hub refuses the rename and answers with the other device's edit at the old name, but the app moves its record to the new name anyway and settles the conflict as if that edit belonged there, so the rename is never re-sent. If this device's copy wins, the hub holds the page at both names; if the other device's copy wins, it lands at the old name and the renamed file stays behind unsynced. A local-wins stale rename left the hub with live items `['Notes/One.md', 'Notes/Renamed.md']`, because `pushRename` calls `renameBase` for every outcome (`push.ts:239`) and passes the destination to `resolveStale` with the head read at the source (`push.ts:241`).[^66]

**Fix | Proposed**

On a stale rename, keep the base row at `from`: fetch the head's bytes, pick the winner against the bytes now at `to` with `newerSide` (capturing the loser as `resolveStale` does), land the winner at `to`, record the base at `from` under `head.seq`, and re-send the rename with that base. `renameBase` moves only on an accepted outcome.

##### F-068 · Renaming a Set on one device leaves an empty ghost Set on the others.

> **Area:** Sync · **Lens:** Defect · **Weight:** Medium · **Size:** S · **Net:** +5 · **Origin:** Drift

**Finding**

Renaming a Set on one device leaves an empty folder under the old name on every other device, which Pommora reads as an empty Set. Folders don't travel through sync, only files: a Set rename sends one rename per file inside it, so each receiving device moves the files and leaves the old folder behind. Deleting nested Sets leaves the outer folder behind the same way, because a delete prunes only its immediate parent, and that prune uses a recursive remove that would take any file created there between the check and the remove. Landing `Notes/Ideas/One.md` and `_pageset.json` renamed to `Notes/Plans/` left `Notes` holding both an empty `Ideas` and `Plans`, since `landRename` has no parent cleanup and `resolveFolderKind` returns `'set'` for any nested folder.[^67]

**Fix | Proposed**

Add one `pruneEmptyParents(root, rel)` in `land.ts` that walks up from the vacated path's parent to the first non-empty folder or the root, re-reading each folder immediately before removing it, used by both `landDelete` and `landRename`.

##### F-605 · Two devices editing different items in one synced list keep only one device's edits, and a lost Context rename hides that Context's Spaces.

> **Area:** Sync · **Lens:** Integrity · **Weight:** Medium · **Size:** M · **Net:** +40 · **Origin:** Shortcut

**Finding**

When a synced Pommora JSON file has changed on both devices, arrival merges it key by key against the last synced copy. A key that only one side changed takes that side's value. A key that both sides changed goes whole to the newer side, and the merge descends only into objects that `mergeDepthFor` names. A list never descends, because the gate admits only plain objects and `isPlainObject` rejects arrays. So a list of items with ids merges as one value, and the losing side's items are dropped. The Sync feature doc records this as design ("a merged JSON file keeps its losing keys nowhere"), which leaves item-level merging as the only protection.

The worst case is the Contexts registry, `.nexus/contexts/contexts.json`, which merges at depth `{}` with its `contexts` list whole. Suppose one device renames a Context while the other adds, reorders, or re-icons one. If the second device's registry wins, the renamed title reverts. The folder rename still reaches every device as ordinary file renames, and the walk reads Spaces by registry title. The result is a Context whose folder no longer exists, so it shows no Spaces, next to an unregistered folder that holds all of them. Pages tagged with the new title stop resolving. None of this is captured or reported, and the rename journal was cleared when the rename committed, so nothing repairs it.

Smaller losses follow the same path:

- **`_tiles.json` (`tiles`):** adding a tile on one device while restyling another on the other keeps the new box in `layout` (only one side changed it). `tiles` goes to whichever side is newer, so either the restyle is lost or the new box has no entry and its file is orphaned. The box is deletable since F-105.
- **A Collection's or Set's sidecar (`views`):** editing one saved view on each device keeps only one edit.
- **The same sidecar (`properties`):** this is the schema's list of property ids. Assigning a different property on each device drops one assignment.
- **`properties.json` (`defs.<id>.select_options`, `defs.<id>.status_groups`):** `defs` merges per definition and per field, but each option list is one field, so adding an option to the same property on each device drops one.
- **`state.json` (`navigation.pinned`):** a pin made on each device drops one.

Some lists are out of scope:

- **Order lists** (`state.json` `order.*`, a sidecar's `set_order`, `properties.json` `order`) repair themselves through `resolveOrder` and `resolveRowOrder`, which append anything the kept order is missing.
- **A Space sidecar's `<Context>` and multi-value arrays, and a metadata shard's `aliases`,** already merge more finely than a page's frontmatter, which lands as a whole file.
- **`matrix.json` `filter.rules`** is a tree without ids.

Sync runs between desktops today. Two online devices converge within seconds through the long poll and a 2.5 s debounce, so the ordinary window is a device that edits while offline. A Mobile companion widens that window. In a probe of the real modules, a registry rename against an add kept `Projects` and `People` and lost `Work`. A tile add against a restyle kept `bands:[1,2]` with only `t1` in `tiles`. A sidecar's views and properties kept only the remote side, and select options kept `c` and lost `b`.[^586]

**Fix | Proposed**

Teach `mergeKeys` one structural case. At a level above 0, when base, local and remote are all arrays whose every element is a plain object with a unique string `id`, merge item by item at `level − 1`:

- an item changed on one side takes that side
- an item changed on both sides goes to the newer side
- an addition on either side is kept
- a removal on one side stays removed unless the other side changed that item, which goes to the newer side
- order comes from the newer side, with the other side's additions appended (registry position is display order)

Any other array stays whole. Set a sidecar's `properties` to merge as a set. `mergeDepthFor` then only adds depths: `contexts: 1` for the registry, `tiles: 1` for `_tiles.json`, `views: 1` and the `properties` set for sidecars, and `navigation: 2` for `state.json`.

`tiles` stays at 1, so a tile entry merges whole: a view tile's `active` is a position in its nested `views`, and merging those views by item could point `active` at the wrong view. `layout` stays whole, which can still leave an entry with no box (invisible) or a box with no entry (deletable).

Option lists key on `value`, which a rename changes, so they stay whole. Add one sentence to `NexusSyncPM.md`'s merge paragraph. Per-item merging refines the Concurrency decision's per-section updates the same way the per-definition and per-field merges already do. **Your call:** approval under that Locked Decision.

##### F-625 · Trashing a Collection or Set uploads the contents of its excluded folders to Sync.

> **Area:** Sync, Trash · **Lens:** Integrity · **Weight:** High · **Size:** M · **Net:** +15 · **Origin:** Drift

**Finding**

Sync admits nothing under an excluded folder, so its files stay on the device. When a Collection or Set holding an excluded folder is deleted to the Nexus Trash, the whole folder moves into its bundle, and Sync uploads the excluded folder's files from there, encrypted, to the hub and on to every device. `deleteOp` moves the folder into its bundle through `relocate`, which reports the rename to Sync's write tap; `feedRename` hands it to `pushRename`, whose trailing `pushDirty([to])` lists the bundle folder through `manifestAdmits`. Its `.trash` arm matches the path past `.trash/` against the excluded list, which `releaseExcludedFolders` empties of the deleted folder's entries as the delete finishes, and which a bundle's path can't match in any case, since the stamped `<stamp>__<Name>.deleted` folder sits between the parent folders and the entity's name. `pushDirty` keeps a Markdown file home only when it carries no `ID:`, so within Sync's usual size and name limits the upload takes the non-Markdown files and the pages carrying an ID, which includes the pages of a folder excluded after they were stamped.[^606]

**Fix | TBD**

A bundle's record already keeps the excluded entries the Collection or Set held (`excluded`), which a restore reseats. Sync's admission of a Trash path reads those kept entries, so a file under a bundle's excluded entry stays home in the Trash as it did in place. Where the kept entries live for a synchronous admit, whether folded into the scope at arm time and by each delete and empty or read from each bundle's record, is this fix's design.

#### W5 · Sync Keys and Device Membership

Revoking a device, rotating the encryption key, and renaming or removing devices each leave a gap between what the settings promise and what the devices do. F-078 carries the one decision about what revocation guarantees, and F-079 is only worth landing under one answer to it. They sit together because they share the key ring and its rotation.

##### F-078 · A revoked device that knows the Nexus password can still unlock the new key.

> **Area:** Sync · **Lens:** Integrity · **Weight:** Low · **Size:** S · **Net:** 0 · **Origin:** Shortcut

**Finding**

A revoke mints a new content key and wraps it for each remaining device and for the Nexus password, but the password doesn't change, so a revoked device that holds it can unwrap the new key from the hub's key record. Every device that created or joined the Nexus by typing the password keeps it in its keychain. What actually keeps a revoked device out of content stored afterward is the hub refusing its requests, not cryptography, so the documented promise that "a revoked device can read nothing stored after its revocation" (Decision Log D-4, NexusSyncPM §The Keys) is false for any revoked device that holds the password. `rotateRing` derives its key-encryption key from the stored password and appends `wrapForPassword([raw], kek)` (`handlers.ts:177,193`), and `openWithPassword` unwraps every `holder === 'password'` entry (`keyring.ts:40-44`).[^77]

**Fix | TBD**

Two moves are possible: restate the guarantee as hub-enforced for password holders (a doc edit in NexusSyncPM §The Keys and Decision Log D-4), or make a revoke also change the password, with `rotateRing` taking a new password and re-wrapping the whole ring under fresh KDF parameters (the re-wrap B′-1 already describes, though changing a password is deferred today because no channel carries the re-wrap); F-079 is only worth fixing under the second. **Your call:** restate the guarantee as hub-enforced for password holders (a doc edit), or make a revoke also change the password by re-wrapping the ring under fresh KDF parameters.

##### F-079 · After a revoke, other devices keep encrypting new content with the old key.

> **Area:** Sync · **Lens:** Integrity · **Weight:** Low · **Size:** M · **Net:** +8 · **Origin:** Patch-Over

**Finding**

Revoking a device mints a fresh content key so the revoked device can't read anything stored afterward, but only the revoking device's running session switches to it. Every other running device keeps encrypting with the old key, which the revoked device holds, until it restarts or happens to decrypt something sealed under the new key. If the revoking device then goes idle, the others can keep writing under the compromised key indefinitely, so "every store after that uses the new key" (Decision Log D-4) doesn't hold. The hub still refuses the revoked device on every route, so the gap matters only when the hub leaks blobs. `act` sets `running.ring = rotated` for the local session only (`handlers.ts:240-243`), while other devices seal with `newest(session.ring)` (`push.ts:88`), which changes only in `openRecord`'s `unknown-key` catch and at session start.[^78]

**Fix | TBD**

The hub's `pull` reply carries the key record's `version` (it already bumps on every ring append); the session keeps the version its ring came from, and a pull answering a higher one reloads the ring (`reloaded`) before the next seal, so every running device switches within one 25-second poll. **Your call:** this is worth doing only if revocation stays cryptographic under the call in F-078.

##### F-080 · A non-owner device's Revoke changes the encryption key, then fails, cutting the other device off.

> **Area:** Sync · **Lens:** Defect · **Weight:** Medium · **Size:** S · **Net:** +4 · **Origin:** Drift

**Finding**

Pressing Revoke on a device that isn't the Nexus owner changes the encryption key and then fails, leaving the target device approved but unable to read anything written afterward. Every approved device that holds the Nexus password sees a Revoke button on every other device; on a non-owner it first mints a new key and adds it to the hub's key ring for everyone except the target (any editor may), then asks the hub to revoke, which only the owner may do. The target never gets the new key, so once anything is written under it, every pull fails and the target stops receiving changes with no path to recover. `act` never checks this device's role before `rotateRing` appends under the editor-level `ring` route (`handlers.ts:230-237`), the owner-only `revoke` then fails with 404, and on the target `loadRing` returns only its device-wrapped entries, which lack the new key, so `decryptItem` throws `unknown-key` on every poll.[^79]

**Fix | Literal**

In `act('revoke')`, refuse before rotating unless this device's row in `devices` has `role === 'owner'`, and hide Revoke in `NexusRows` for non-owners from the same listing.

##### F-081 · A device revoked while the app was closed thinks it's waiting for approval and never drops its keys.

> **Area:** Sync · **Lens:** Divergence · **Weight:** Low · **Size:** S · **Net:** 0 · **Origin:** Drift

**Finding**

A device revoked while the app was closed shows "Waiting for approval from another device", keeps its password and key ring in the keychain, and polls the hub every minute forever. Whether this device has been revoked is worked out in three places, three ways: a running session concludes "revoked", stops, and forgets its keys; the settings panel concludes "revoked" but only in its reply; and session start reads the same answer as "waiting for approval" and retries. A revoke deletes the membership row so every gated route answers 404 `not-found`, which `withKeys` treats as pending and retries (`session.ts:183-189`) while `pullWait` and `state` each test it with their own condition (`pull.ts:74-76`, `handlers.ts:124`).[^80]

**Fix | Proposed**

Add one `isRevoked(host, nexusId, outcome)` in `keyring.ts` (404 `not-found` with a cached device ring), used by `pullWait`, `state`, and `withKeys`, where it runs `forgetKeys` and sets the `off/revoked` status instead of retrying. A wiped hub answers 401 for an unknown signer, so the shared check doesn't misfire on F-066's scenario.

##### F-082 · Renaming a device that was removed from a Nexus quietly asks to join it again.

> **Area:** Sync · **Lens:** Defect · **Weight:** Low · **Size:** M · **Net:** +12 · **Origin:** Shortcut

**Finding**

Renaming a device that was revoked from a Nexus puts it back in the owner's device list as a new request waiting for approval. Renaming tells the hub the new name by re-sending the full `connect` request, which also asks to join the bound Nexus, and a revoked device keeps its binding. The Cross-Device Mutation Checklist records "rename re-sends connect" as intended, but the re-join side effect isn't mentioned anywhere. `sync:renameDevice` calls `connect` with the bound `nexusId` (`handlers.ts:271`), and since a revoke deletes the membership row, the hub's `addMembership` with `ON CONFLICT DO NOTHING` inserts a new pending row.[^81]

**Fix | Proposed**

Add a `rename` route to the one route table (`wire.ts` `RouteTable`, `canonical.ts` `ROUTES`, `Sync/wire.ts` `PATHS`/`META` with `requires: 'none'`) that only calls `upsertDevice`, and have `sync:renameDevice` use it instead of `connect`.

##### F-083 · Changing History Timeframe in Settings never reaches the sync hub.

> **Area:** Sync · **Lens:** Defect · **Weight:** Low · **Size:** M · **Net:** +12 · **Origin:** Drift

**Finding**

The hub learns the Nexus's History Timeframe only once, when the first device binds, so changing it later in Settings never reaches the hub. If the user lengthens it, the hub still deletes old versions on the original schedule, contrary to Decision E-3's rule that hub retention "follows the Nexus's History Timeframe". A search for `history_days` in `Sync/Store` finds the table definition, `insertNexus`, the row read, and the retention read but no update statement, and the route table has no route that could carry one.[^82]

**Fix | TBD**

Carry `historyDays` on the `ring` route body, or as an owner-gated field on `info`, and write it with an `UPDATE nexus SET history_days`. The client sends it when a `settings.json` change moves `historyDays` (the `SETTINGS_REL` branch in `session.ts:137` already reacts to that file).

#### W12 · Table Scans and Drags

Typing in a table re-reads the whole table, and dragging a row or column redraws all of it. Landing this makes a table's cost follow the edit.

##### F-170 · Typing in a table cell re-reads the whole table as Markdown on every keystroke, and big tables lag.

> **Area:** MarkdownPM · **Lens:** Hot Path · **Weight:** Medium · **Size:** M · **Net:** +6 · **Origin:** Residue

**Finding**

Every character typed into a table cell makes the editor re-check the entire table by running the full Markdown parser over it, and that parser slows down faster than the table grows. A 50-row table costs under a millisecond per keystroke, a 200-row table about 4 ms, and a 1,000-row table about 70 ms, which is visible typing lag. The editor's incremental scan re-reads only the lines around an edit, but a table row never counts as a safe place to stop, so the scan widens to the whole table and confirms it with one parse of all its text, the parse its comment calls the cheap common case. A benchmark typing one character mid-table measured `rescan` at 0.76 ms for 50 rows, 4.13 ms for 200, and 68.7 ms for 1,000, so 5x the rows cost 16.6x the time.[^168]

**Fix | Proposed**

Keep the two-line parse that confirms header plus delimiter (`regions.ts:50`, already cached per text), then extend the body line by line from per-line facts the scan already has (a blank line or a line that opens another block, such as a heading, rule, quote, fence, list marker, or HTML, ends it) and delete the whole-block confirm and shrink loop. Pin it with a seeded property test against the whole-table parse, the way `rescan` is pinned against `scanDoc`.

##### F-173 · Dragging a table row or column redraws the whole table on every mouse movement.

> **Area:** MarkdownPM · **Lens:** Hot Path · **Weight:** Low · **Size:** S · **Net:** +3 · **Origin:** Parallel Build

**Finding**

While you drag a table row or column, the whole table component redraws on every mouse movement (every row, every cell's classes and position, every grip icon), 60 or more times a second, because the table stores the pointer's exact offset in React state. The collection table view solves the same problem by writing the offset to a CSS variable and redrawing only when the drop slot changes. Large markdown tables drag less smoothly than they need to as a result. Profiling the real `MarkdownTable` recorded one full table commit per pointer move (20 moves inside one slot gave 20 commits), with render time growing with cell count, while `useColumns.ts:364-371` writes `--col-drag-x` per move and calls `setColDrag` only when `to` changes.[^171]

**Fix | Literal**

Keep `delta` out of React state: write it to a CSS variable on the table wrap in `resolve`, read it in the dragged row's or column's transform, and call `setDrag` only when `to` changes.

#### W13 · Focus and Closing Animations

The kit's buttons show no keyboard focus, and a closing list inside a pop-up pane reopens at the next dropdown pressed. Landing this makes keyboard focus bounded and visible across every menu and picker the app opens.

##### F-182 · Buttons never show keyboard focus.

> **Area:** UIX · **Lens:** Divergence · **Weight:** Medium · **Size:** S · **Net:** +4 · **Origin:** Drift

**Finding**

When you move through the interface with Tab, the kit's buttons (toolbar, window, and menu-footer controls) show no sign of having focus. The `button` style sets `outline: none` and puts nothing in its place, while menu rows light a ring on `:focus-visible` through the shared `fieldRing` channel and fields through `focusRing`. One keyboard walk therefore alternates between visible rows and invisible buttons. `button-base.css.ts:80` sets `outline: 'none'`, the file's only `:focus-visible` rule is `revealOnHover`'s opacity, and none of the 9 `focus-visible` rules across Core and UIX stylesheets targets `button`.[^180]

**Fix | Literal**

Give `button` the row's ring: `'&:focus-visible': { boxShadow: fieldRing(ROW_RING), vars: { '--field-ring': tintAt('var(--accent)', 'secondary') } }`, composed with `outlined`'s inset shadow where both apply. Leave the view strip's suppression (`view-strip.css.ts:45`) as it is, since an Enter-committed rename drops focus onto the segment and a ring would flash after every rename.

##### F-568 · Inside a pop-up pane, pressing a second dropdown while one list is open cuts the list's close short and reopens it at the new dropdown.

> **Area:** UIX · **Lens:** Defect · **Weight:** Low · **Size:** S · **Net:** +8 · **Origin:** Shortcut

**Finding**

When a dropdown's list is open inside a pop-up pane, such as a view tile's settings, pressing a second dropdown in that pane closes the first list and opens the second, but every such list is drawn by one shared pane, so the closing list stops partway through its exit, jumps to the second dropdown, and blooms open there with the new rows. The same press in the toolbar's settings pane only closes the list, because there the list itself draws the full-screen shield that takes the press, and a release after the shield is gone reaches nothing. One settings pane therefore answers the same press two ways depending on where it's opened. `onPointerDown` dismisses every layer above the one holding the press and swallows the release only when the press lands on the closing list's own trigger, and only the lowest shielded layer draws a shield (`shields`), so under `ViewTile`'s settings `PickerMenu` the list draws none, while under the toolbar's unshielded pane it does. `PickerControl` opens on click through `popMenu` and `presentMenu`, which feed the single `PickerMenu` in `MenuPresenter`, and `useExitPresence` clears `closing` as soon as `open` returns to true. A probe in the project's Electron 42 (Chromium 148) confirmed that a press whose target is removed before the release fires no click, which is why the toolbar case swallows the press.[^559]

**Fix | TBD**

Either every outside-press dismissal calls `suppressReleaseClick()`, so the tile pane behaves as the toolbar pane does, or clicks keep passing through and `MenuPresenter` holds each presented menu in its own `PickerMenu` until `onExited`, so the closing list finishes its exit while the new one blooms at its own trigger, as pickers that own their `PickerMenu` already do. Keeping the shield up through the exit doesn't reach this case, since the list in a shielded pane never draws one. **Your call:** whether a press that closes a list should also act on what it lands on.

#### W14 · The Host's Write Channels

Forty channels write Nexus files beside `mutate`. Landing this gives one door to every write that has no reason for its own.

##### F-611 · Forty channels write Nexus files beside `mutate`, and seven files can be written through both.

> **Area:** Cross-Cutting · **Lens:** Growth Constraint · **Weight:** Medium · **Size:** L · **Net:** 0 · **Origin:** Parallel Build

**Finding**

Forty channels write Nexus files beside the one dispatcher, `mutate`: six view and container channels, seventeen property and schema channels, seven tile channels, five configuration channels (personalization, the excluded folders, the asset folder, the Matrix, and navigation), asset adoption, the page-body write and history restore, `exclusions:clear`, and `nexus:rename`. Four have a reason to stay separate: `nexus:rename` re-targets the whole session, `exclusions:clear` sweeps files the live tree deliberately doesn't hold, and `page:updateBody` and `tiles:writeMarkdown` carry a base-hash check and answer a stale write with a conflict. The other six tile channels wait on tiles having records, and the remaining thirty have no structural reason. Every family first appears after `mutate` (06-16): views 06-27, properties 06-29, personalization 07-05, and tiles 07-10 as `blocks:*`; nothing requires a new write to use it. Seven files are writable through both `mutate` and a separate channel: a container's sidecar (`setActiveView` and `setDisclosureLock` beside `views:*`, `container:configure`, and `schema:*`), `settings.json` (`setProfileIcon` and `setProfileImage` beside `personalization:set`, `exclusions:set`, and `assets:setDir`), `state.json` (`reorderTop`, `reorderPanelContexts`, and `reorderSpaces` beside `nav:write`), `properties.json` (`setProperty` adopting a new option beside the property channels), `matrix.json` and tile boards (a delete's or move's configuration pass beside `matrix:write` and `tiles:*`), and `homepage.json` (`setBanner` beside `assets:setDir`'s migration). Every door settles through the one write gate, `withWriteRoot`, and `nav:write` and `matrix:write` also answer the window through the watcher, whose `pushConfig` re-reads the file on the app's own echo. The five `defEditOp` channels are one edit-a-definition-field operation. A new feature that writes a Nexus file therefore picks a door by hand.[^592]

**Fix | TBD**

Fold the thirty channels without a structural reason into `mutate`'s operation union, so a new write is one union entry, and keep `nexus:rename`, `exclusions:clear`, and the two base-hash body writes. The other six tile channels fold only once tiles have records, which nothing sizes yet. Every write already settles through the write gate's flush, so a folded channel needs no confirm of its own. `MutateReply` is one optional-field bag, and eleven folded channels answer something other than null (eight types), so the fold carries an op-keyed reply. CorePM's *§Mutations* and the comment on `mutateRequest` follow the fold.

##### F-617 · With two same-titled pages both deleted, restoring the first one deleted leaves the links to their title stripped.

> **Area:** Trash · **Lens:** Defect · **Weight:** Low · **Size:** S · **Net:** +10 · **Origin:** Shortcut

**Finding**

A delete leaves a title's Link values alone while a page outside it still holds that title, since those values resolve to the survivor. When two same-titled pages are deleted in turn, the first delete strips nothing and the second strips the values and records them in its own bundle. Restoring the first from the Trash lands a page the values would resolve to, but they stay stripped until the second bundle is restored; emptying the second bundle hands its rows to a namesake still in the Trash, or drops them once none remains. Before the survivor gate, the first delete stripped and recorded, so restoring the first brought the values back. The undo chord restores in reverse order, so it never produces the gap.[^598]

**Fix | TBD**

**Owner's call.** Either the delete records the rows for a title a survivor still holds without stripping them, and the refill counts a page already holding the recorded value as having taken it back, compared before the landed-title rebuild so a namesake landing as `Ideas (2)` leaves `[[Ideas]]` in place; or F-612's delete half is withdrawn and the first delete strips again.

##### F-618 · Delete All and Restore All walk the whole Trash once for every bundle that hands a Link value to it.

> **Area:** Trash · **Lens:** Hot Path · **Weight:** Low · **Size:** M · **Net:** +15 · **Origin:** Shortcut

**Finding**

Emptying a bundle hands the Link values its record kept, and any its empty-time strip took, to a same-titled page still in the Trash through `parkLinks`, which lists every bundle and each Set or Collection bundle's pages. The Trash frame's Delete All sends one request per row, so a batch of link-carrying bundles walks the Trash once per bundle: about 13 ms per empty at 100 bundles and 32 ms at 300, summing to about 0.45 s and 4 s.[^599]

**Fix | Proposed**

Send the frame's Delete All and Restore All as one request carrying the bundle list; the host reads the Trash's titles once for the batch and strikes each emptied bundle's titles from that map as it goes. Single-row empties and restores keep today's path.

#### W15 · Opening and Watching a Nexus

Every change to a Nexus is one file event, applied in place, with a walk as the fallback. What stays open here is where that path places less than a walk would or drops what it collected, the writes and stores that do more work per change than they need, the stamps that replace an ID the app could recover, and the two registries' journals and sweeps, which still run as two machines. Landing this makes an own write and an outside edit land the same way, at a cost proportional to what changed, with every entity keeping its identity.

##### F-198 · Resetting Sync's records loads every one and deletes them one at a time, and the index's path renames and removals commit table by table.

> **Area:** Desktop · **Lens:** Hot Path · **Weight:** Low · **Size:** S · **Net:** +6 · **Origin:** Drift

**Finding**

The page index (`nexus.db`, the local database that answers link, heading, and value lookups) writes a batch of page rows inside one transaction, but its path methods don't: a page or folder rename and a page or folder removal run one statement per index table, each compiled on the call and committed on its own, so the tables can disagree about a path when the app stops between them. Sync's records sit in the same store, and connecting to a new hub or disconnecting reads every record, its stored base included, then deletes each in its own commit, a cost that grows with the Nexus while the user waits on Sync's settings. `upsertPageIndexes` prepares its inserts once and wraps its rows in `inTransaction`, while `removePathIndex`, `renamePathIndex`, `removePathPrefixIndex`, and `renamePathPrefixIndex` loop over `INDEX_TABLES` with a fresh `db.prepare` each, and both `Core/Sync/handlers.ts` sites run `for (const row of readAllBases()) deleteBase(row.path)`.[^196]

**Fix | Proposed**

Build the path methods' statements once per handle inside `contentIndexStore(db)` and wrap each method's body in `inTransaction` from `Desktop/Store/driver.ts`. Add a `clearBases()` (`DELETE FROM sync_base`) to `syncStore` and use it at both `Core/Sync/handlers.ts` sites.

##### F-626 · An in-app create or rename of a Space, or rename of a Context, leaves the pages already tagged with its new name unlinked until each is read again.

> **Area:** Contexts · **Lens:** Divergence · **Weight:** Low · **Size:** S · **Net:** +10 · **Origin:** Shortcut

**Finding**

A page tag that names no Space, such as `Projects: [Alpha]` before Alpha exists, stays in the page's file, and every read of the page resolves its tags again, so a Space made outside the app links the pages already tagged with its title at the next walk. Creating a Space, or renaming a Space or a Context, in the app places the node in the held tree from the app's own file event, so a page whose kept tag comes to resolve to it stays unlinked in that tree until something re-reads the page or walks the Nexus: the Space's members, a view's Context column, and the Matrix leave those pages out until the page is saved or edited, or until the next open, Reload, or event the settle can't place. The page's own Property Panel, which resolves its tags against the tree as it renders, already shows the Space. A rename's sweep rewrites the pages holding the old name, and each rewrite relinks its page, so only the pages that already held the new name are missed. `applySpace` places a Space the tree doesn't hold from an own write without a walk; a Space or Context rename's `relocate` lands as an own move that `applyMove` places through `moveNodeInTree`, which renames a Context's group in place, so `applyContexts`' `regroup` then finds the new title already held; and only `applyPage` and the walk resolve a page's kept tags, through `contextLinker`.[^607]

**Fix | Proposed**

The settle's placement of a new or renamed Space, or a renamed Context, resolves the kept tags of the pages holding that Context's key against the new name and patches the pages that resolve to it, in place of owing a walk on every create.

##### F-622 · Contexts and Properties each carry their own journal, replayer, and sweep loop for one pattern.

> **Area:** Contexts, Properties · **Lens:** Growth Constraint · **Weight:** Low · **Size:** L · **Net:** −150 to −300 · **Origin:** Parallel Build

**Finding**

Both registries are a Nexus-wide list whose names appear as keys in files, so a rename or delete sweeps every holder. The code implements that twice. The two share one `journalSlot` and resolve Contexts through one lookup, `contextWorldOf`, but keep two journal vocabularies over that slot, two replayers at two points of the open (`Core/Nexus/handlers.ts:81`, `:94`), opposite commit orders (a property rename commits the registry first, a Context rename last), and nine enumerate-lock-read-decide-write loops where one shared walk would serve. The two also report differently. A property rename, a property delete, and an option rename report the files they skipped whether or not the journal took their record, with a Try Again that replays the record they hand back; a Context or Space rename reports them too, with a Try Again that sends the request again rather than replaying the record, since a later rename displaces a journal record a prior rename holds; and an option remove offers Try Again only while its record holds the slot (F-627). The sweeps and the check that guards them list Space sidecars by a disk scan (`spaceSidecars`), where every other reader takes Spaces from the tree: a schema sweep holds the `.nexus` lock and a Context rename the Contexts lock, so a sweep can meet a Context folder that has moved ahead of the tree, and the Context-rename replay sweeps before a tree is held. A Context or Space delete has no crash recovery of its own: one cut short leaves its write-ahead record in the bundle, and deleting again finishes it, where a rename's journal finishes at the next open.[^602]

**Fix | TBD**

One journal-and-replay path and one sweep loop shared by both registries, while they stay separate things to the user. It needs one commit order for both, which changes crash recovery for one of them, and that order is designed and defended here. The shared path carries what each machine leaves today: a record for a Context or Space delete that carries the bundle, with a replay that finishes the sweep, the folder's move, and the configuration reach across both Trash modes; one rule for reporting skipped files and offering Try Again across every rename, delete, and option operation; and room for more than one held record, so an option remove's Try Again rides a record of its own (F-627). With one commit order and a replay that runs once the tree is held, the sweeps and their check take Space sidecars from the tree together, counting a Space the tree lists unreadable as a skip, which retires `spaceSidecars`' scan; moving the check alone would refuse against a list the sweep doesn't write through.

##### F-627 · An option remove the journal refused reports the files it skipped without Try Again.

> **Area:** Properties · **Lens:** Divergence · **Weight:** Low · **Size:** S · **Net:** +15 · **Origin:** Drift

**Finding**

An option remove writes a journal record before sweeping the files that hold the value, and a file the sweep can't update is reported as "Couldn’t update N files." The journal refuses a write while another operation's record holds its one slot or the slot can't be read, and the remove then runs unjournaled: its notice carries the line with no Try Again. The option stays in the definition until every holder is swept, so removing it again reaches the skipped files, but nothing tells the user so. A property rename, a property delete, and an option rename in the same state hand back the record they owe and offer Try Again through it. An option remove can't, because an option has no identity beyond its value: one removed and added back reads on disk exactly as one still owed, so a record handed back after the slot let it go could strip an option the user added again. `removeOption` answers its record only when `writeSchemaJournal` took it, `schemaCascade` sets `owed` only from a record it's given, `retryOwed` shows a line with no `owed` through `notifyReport`, and `replaySchemaCascade`'s option-remove arm acts on a handed-in record only while the slot still holds it.[^608]

**Fix | TBD**

Either an option gains an identity beyond its value, so a handed-back record can tell the option it removed from one added since and the remove answers its record as the other three operations do, or the remove's record rides the multi-record journal F-622 designs, so the slot never refuses it.

##### F-630 · Restarting the watcher drops the events it had collected and misses what changes while it restarts.

> **Area:** Desktop · **Lens:** Defect · **Weight:** Low · **Size:** S · **Net:** +6 · **Origin:** Shortcut

**Finding**

The watcher collects outside edits into a batch and applies it once events go quiet, and it restarts after any change to the excluded folders or the asset folder. Three kinds of outside change around a restart never reach the tree, the index, or the window until the file's next edit or the next full read. The batch collected before the restart is cleared with its timer, so an edit that landed in the moments before is never applied. While the old watcher closes and the new one reads the settings and scans the Nexus, about 0.4 s, the events chokidar still held while it waited for a file to go still close with the old watcher, and a change in a folder the new watcher hasn't scanned yet raises no event, since the new watcher takes what its scan finds as already there. And a page under a folder the scope change admits that another tool modifies within the watcher's quiet window of the change gets no event, so the tree keeps what the change's walk read of it. `startWatcher` begins with `stopWatcher`, which clears `debounce`, closes the old watcher, and sets `batch = []`, then awaits `readWatchScope` before it arms `chokidar.watch` with `ignoreInitial` and `awaitWriteFinish` at `SETTLE_MS` (200 ms); the settle restarts the watch through `pusher.watch` once the scope has changed.[^611]

**Fix | Proposed**

A restart hands the pending batch to the settle before it clears it, and owes one walk once the new watcher's scan is ready, which reads whatever changed during the gap.

##### F-636 · A page missing its ID that a folder's read finds after its own event was spent stays out of the tree until the next full read.

> **Area:** Nexus · **Lens:** Defect · **Weight:** Low · **Size:** M · **Net:** +10 · **Origin:** Shortcut

**Finding**

A page without an ID is stamped by its own watcher event, which arrives once the file stops changing, or by a listing under a folder newly in reach (a Try Again on the folder, or a folder a change of Excluded Folders admits). A folder's read leaves any other page missing its ID out of the tree, waiting for that event. When the event was already spent or never comes, the page is held nowhere, listed nowhere, and stamped by nothing until the next full read, which lists it under a Try Again notice; a full read only lists such a page, and only its own event, Try Again, or a reopen stamps it. Three routes produce it: a missed watcher event (F-630); a folder sidecar removed outside the app, whose folder the walk lists and the stamp reads again; and a Trash restore or move of a folder holding a page already listed missing. Apart from these, a settle that lands while a stamp pass is in flight can push a tree that still lists the page being stamped, so the window may post one Try Again notice for a page whose ID lands a moment later. `applyFolder` lists only the missing entries `stampable` returns, unless the tree had listed the folder unreadable for a reason other than a missing ID, and `stampable` takes a page only under a path in `owed.whole`; `walkWhileOwed` stamps from a walk's listing through the same filter; and `stampListed` splices `owed.stamp` empty before each `stampMissing` call, so `shown` hides nothing while that pass runs.[^617]

**Fix | TBD**

Either a folder's read, or a full read, stamps a page missing its ID whose file has sat still longer than the watcher's quiet window, which is the evidence a stamp needs that its writer has finished, or the page keeps a listed entry that its next read stamps. The notice half closes when an entry stays on the owed list until its stamp lands, which needs the two passes that can overlap (a write's gate and a watcher batch) to share the list without one taking the other's entries.

##### F-633 · A write's reply waits behind a walk an outside change owes.

> **Area:** Nexus · **Lens:** Hot Path · **Weight:** Low · **Size:** M · **Net:** +10 · **Origin:** Shortcut

**Finding**

A write the user makes while the app is re-reading the Nexus for an outside change waits for that read before its result shows and its reply returns. Every settle runs one at a time on one chain, and a walk an outside batch owes runs as a turn on it; a write that lands meanwhile queues its own settle behind the walk and, unless it's the editor's body save, restarts it. An icon change that answers in 1 to 3 ms alone took 98 ms during the walk of a 4,000-page Nexus, and the wait grows with the Nexus. It applies only while a walk is in flight, which a Space or Context leaving, a registry definition arriving from outside, or a change of scope owes. `settleNow` runs `settle` through `inTurn`, the chain `payOwedWalk` shares; `settle` begins with `walkWhileOwed`; and `applyOwn` marks the disk moved for every write but the editor's body save, so the walk in flight reads again.[^614]

**Fix | Proposed**

A write's own change is pushed, and its reply sent, ahead of a walk it didn't owe: the settle pushes what the applied events moved before it pays a walk another batch owed, and the walk's result follows as its own version.

##### F-637 · A page renamed or moved while a refused Space or Context delete puts its sweep back keeps the swept state.

> **Area:** Contexts · **Lens:** Defect · **Weight:** Low · **Size:** S · **Net:** +8 · **Origin:** Shortcut

**Finding**

A Space or Context delete strips its tag from every member and, when one member can't be written, puts back each file it changed and refuses, counting any file it couldn't put back. The putting back reads each file at the path the sweep wrote, and a page the user renamed or moved in the app meanwhile is no longer there: it's passed over, so the page keeps the stripped tag and the refusal's count of files it couldn't put back leaves it out. The app's page rename and move don't take the Contexts lock the delete holds, so nothing orders them. `undoSweep` returns on `now === null`, `unlinkMembers` sums only what `undoSweep` answers, and `dispatch` sends `rename` and `movePage` outside `underContexts`.[^618]

**Fix | Proposed**

`undoSweep` finds a page that left its path by the ID the sweep read from it, through the held tree, puts it back there, and counts it when no live path holds that ID.

##### F-639 · An outside edit to a page inside a folder the app just renamed or moved is lost until the page's next event.

> **Area:** Nexus · **Lens:** Defect · **Weight:** Low · **Size:** S · **Net:** +8 · **Origin:** Shortcut

**Finding**

When the app renames or moves a folder, the held tree carries the folder's pages to the new path at once, as it last read them. An outside edit to one of those pages that the watcher reports under the old path, in a batch that settles after the move, reaches a path that no longer exists: the index drops that path's rows and the tree finds no page there, and the events the move raises at the new path fall inside the move's echo window and are dropped as the app's own. The page shows its earlier state in the tree, the index, and the window until its next edit or the next full read. `applyMove` places the move through `moveNodeInTree`, which carries each node as held; the old path's event reaches `applyPage`, whose `applyFolder` call finds the folder gone and answers `'ok'`, and `indexWrittenPage` removes the path's rows when `stat` finds nothing; `relocate` records both folder paths without bytes, so `isRecentWrite` drops a descendant's event for `PREFIX_WINDOW_MS` (800 ms) whichever side of the move it names.[^620]

**Fix | Proposed**

The move's echo record carries its destination, and a watched event under the vacated path within the window is re-aimed at the path the move landed on, so the edit reaches the page it belongs to.

##### F-640 · An ID lost or damaged outside the app is replaced rather than recovered on every path but a held page's own event, and an ID two files share is answered three ways.

> **Area:** Nexus · **Lens:** Defect · **Weight:** Medium · **Size:** L · **Net:** +20 · **Origin:** Shortcut

**Finding**

Everything that carries an ID is known by it elsewhere: a page by its tabs, pins, recents, and metadata entry; a Set or Collection by its saved-view ids and pins; a Space by its order, pins, and block document; a Context by its Spaces' order; and the Nexus itself by its device store, thumbnails, and sync session, which hold the tabs, recents, folds, and record baseline. An ID replaced by a fresh one cuts the entity off from all of them. One path recovers the ID it lost: a page the tree holds that its own event reads as missing its ID carries the held ID onto its stamp entry, and the stamp writes it back unless another page holds it by then, minting otherwise. Every other path mints or blanks:

- **A page whose `ID:` isn't an ID** is listed `malformed`, and its Try Again writes a fresh ID over it.
- **A held page whose restamp fails,** such as a file locked when the stamp lands, stays listed `missing` with no record of the ID it held, so its Try Again mints.
- **A page stripped while the app is closed** is stamped by the open with no tree to consult, and a restored page with no ID is stamped by the restore.
- **A Collection, Set, or Space whose sidecar loses its `id`,** or holds one that isn't a string, is stamped with a fresh one: by the open's adoption pass, from `applySpace`'s owed stamp, or from a walk's listing.
- **A Context entry that loses its `id`** fails the registry's parse, which blanks the whole Contexts layer for the session and refuses every registry write, and a registry file deleted outside is reseeded with fresh Areas, Topics, and Projects.
- **A `nexus.json` that loses its `id`** takes a fresh one, which opens a new device store and leaves everything in the old one behind.

Two files sharing one ID are held in the tree together until the next open gives the copy a fresh one, and the lookups answer that ID three ways: the window's `pagesByIdOf` keeps the last file, the host's `livePathOf` answers none, and `recordById`, which a restore writes through, keeps the first the walk listed, with the ledger listing the rest and picking the eldest. A Context ID two registry entries share resolves to the last entry through `contextWorldOf`. A copy the open can't re-mint keeps sharing the ID with no notice.

The device already keeps what the last open saw, the record baseline, keyed by ID with each entity's path, but only the remint ledger reads it, the open's adoption pass runs before this Nexus's store is open, and the held page's restamp reads only the stamp entry, which a failed stamp spends. `applyPage` alone pushes `held` onto `owed.stamp`, and `listUnreadable` keeps no `held`, so `oweRetry` and the open's `stampMissing` hand `stampPage` none; `stampPage` mints through `contentIdAt` for a `missing` admission or an overwritten `malformed` one, `stampFolder` through `newId()`, `ensurePageId` through `stampPage`, `ensureIdentity` over an id-less `nexus.json`, and `ensureContextsRegistry` through `seededRegistry`; `contextEntry` requires a non-empty `id`; `idHeld` checks pages alone; `stampAdopted` runs inside `prepareOpenedNexus`, ahead of `openStores`; `readBaseline` is read only by `runOpenLedger`.[^621]

**Fix | Proposed**

One previous-ID lookup serves every stamp, and the comment in `stampPage` marking this approach goes with it.

- **The Lookup:** the ID the listed entry or the held tree last held at the path, else the one the record baseline places there, written back unless another entity holds it by then.
- **Every Stamp:** `stampPage` and `stampFolder` take it for a `missing` admission and a `malformed` one alike, so Try Again, a restore, and the open recover rather than mint. A listed entry keeps the ID its entity held, so a failed stamp's Try Again still has it.
- **The Open:** the adoption pass runs once this Nexus's store is open, or is handed its baseline.
- **Contexts:** the registry reads past an entry missing its `id`, which takes the same lookup by its folder's path, and a deleted registry is rebuilt from the Contexts folders and the baseline rather than reseeded.
- **The Nexus:** the app's record of opened Nexuses keeps each one's ID by path, which `ensureIdentity` reads before minting.
- **Duplicates:** the walk and an entity's own event leave a second claimant of an ID out of the tree, listed with a Try Again that re-mints it; the original is the path the baseline holds, or the eldest by birth time where it holds none. `recordsOf` then lists each ID once, so one rule remains, and the unanswered ID in `heldPages.ts`'s `byId`, the ledger's `duplicates`, and `pickEldest` go.

#### W19 · Where Host and Window Code Live

Nothing in a file's location says whether it runs in the host or the window, and several files sit in another domain's folder. Landing this gives each domain one host-side subfolder and fixes the misplaced files and names; it follows the preferences workstream because several channel moves ride those fixes.

##### F-240 · Nothing in a file's location says whether it runs in the host or the window, and several files sit in another domain's folder.

> **Area:** Cross-Cutting · **Lens:** Growth Constraint · **Weight:** Medium · **Size:** L · **Net:** 0 · **Origin:** Drift

**Finding**

Pommora's code runs in two places, the host process that owns the disk and the window that draws the interface, but every Core folder mixes both kinds of file at its root, so a reader can't tell from a path which side a file runs on, and a new file's author learns it only when the host-graph test goes red. Several files also live in a folder they don't belong to: the floating windows' pure tab model and file schema sit in the Interface component folder, so the store and the channel contract import upward into it; the Nexus-wide governed-write machinery sits in Properties while five other domains use it; the Views root mixes host handlers, window files, and Settings-pane models; and the Settings and Interface channel tables each serve the other's channels. An import-graph closure from Desktop's node-side files reached 205 Core and UIX files spread across nearly every folder (Properties 23 of 70, Views 6 of 58, Interface 4 of 68), while `hostGraph.test.ts` checks only file extensions and an external allowlist.[^238]

**Fix | TBD**

Two parts. (1) The taxonomy: each domain gets one host-side subfolder holding its `handlers.ts` and the file-backed modules those reach, pure shared modules stay at the root, and `hostGraph.test.ts` asserts every host-closure file sits in one. (2) Moves that stand regardless: `windowTabs`/`windowRecord`/`windowState`/`windowCache`/`windowMorph` into `Core/Navigation/` beside `tabsModel`/`tabsState`/`warmTabs`, which keeps `Core/Session` as the store layer; `governedSweep`/`governedWrite`/`journalSlot` into `Core/Files/` and `keyHolders` into `Core/Index/`; `filterModel`/`visibilityModel` into `Core/Views/Settings/` and `placeNew` beside the Session creates; `theme:systemAccent`/`host:platform` into `interfaceHandlers` and `devicePrefs:*` into `settingsHandlers`; `chrome.ts` dissolves (`ThumbRect` moves beside its producer in Navigation). **Your call:** whether to ratify part (1)'s taxonomy of one host-side subfolder per domain, enforced by `hostGraph.test.ts`.

#### W28 · Editor Work on Every Keystroke

The page editor re-derives code coloring and drag handles from the whole block or page on every keystroke. Landing this bounds each to the lines that changed, on the editor's most frequent trigger.

##### F-337 · Code-block coloring re-parses the whole fenced block on every keystroke inside it.

> **Area:** MarkdownPM · **Lens:** Hot Path · **Weight:** Medium · **Size:** M · **Net:** +20 · **Origin:** Shortcut

**Finding**

Code colors come from parsing each visible fenced block with its language, and the parse is remembered by the block's exact text. Any keystroke inside a block therefore misses the memory and the whole block is parsed from scratch, even when only a few of its lines are on screen, so typing in a long code block lags in proportion to the block's length. While a language is still downloading, each redraw also attaches another "loaded" callback. Parsing through the same parser cost 2.4 ms per keystroke at 100 lines, 13.1 ms at 1,000, and 38.6 ms at 3,000, since `paint` joins every line of the block and reads the tree through the text-keyed `drawnLast` while `blockParser.parse(text)` runs with no fragments.[^332]

**Fix | TBD**

Keep the previous tree and its `TreeFragment`s per block, keyed by the opener line mapped through the transaction, and reparse with `TreeFragment.applyChanges` in block-local coordinates so an edit re-parses only around the change; or, simpler, parse only from the block's start through the viewport's last visible line. Attach one load callback per language through a module-level set of pending loads.

##### F-339 · The drag handles beside each block re-read every line's list marker on every keystroke.

> **Area:** MarkdownPM · **Lens:** Hot Path · **Weight:** Medium · **Size:** S · **Net:** +3 · **Origin:** Shortcut

**Finding**

The grab handles drawn beside each paragraph, list, and code block are recomputed on every keystroke, and each recompute re-parses every line of the page for a list marker, even though the editor's scan already re-reads only the lines around the edit. On a long page this is the largest remaining per-keystroke cost, several times the scan it sits on. The block model's comment says it runs once per scan so nothing re-walks the document, which is true per scan, but every keystroke makes a new scan, so the cache never hits on the typing path. On a 20,000-line mixed page, `blockStarts` on a fresh scan took 4.36 ms, of which `lines.map(parseListMarkerPrefixed)` alone was 4.03 ms (92%), against 0.6-1.2 ms for the scan's own `rescan` on the same edit.[^334]

**Fix | Proposed**

Add `markers: (ListMarker | null)[]` to the line scan (`scanLines` computes `lines.map(parseListMarkerPrefixed)` over its window, and `splice` carries it with `perLine`, since marker offsets are line-relative) and have `blockContext` read `scan.markers` in place of `markerOf`; the existing `rescan`-equals-`scanDoc` property test covers the new field. Emitting the grip class from the stepped line intents would also remove the whole-document decoration set, but it needs block membership, which isn't line-local, carried in the intents, so the marker field is the smaller move that takes most of the cost.

#### W29 · Error Surfaces

##### F-621 · Every call site chooses for itself whether an error is shown, logged, or dropped, and about forty host-side failures reach no one.

> **Area:** Cross-Cutting · **Lens:** Growth Constraint · **Weight:** Medium · **Size:** L · **Net:** 0 · **Origin:** Drift

**Finding**

The window's reporter offers several helpers (`reportRefusal`, `persist`, `notifyReport`, `notifyRetry`), and each caller picks one and, for `persist`, whether it's quiet: settings, footnote visibility, and view options post a notice; folds, embed sizes, the glance size, navigation lists, and the session writer log. About forty `console.error` lines across `Core` and `Desktop` record host-side failures in background passes (the index seed, the repair sweep, re-mint, schema replay), and none reaches the user. Sync's failures travel a fourth way, as a status the Settings pane draws. The user-facing copy for an error is written inline at each site.[^603]

**Fix | Deferred**

Deferred from the Data Layer work by its Decision Log (M-1), which keeps only the host-to-notice path its own notices need. One table names each kind of error and decides its surface (a notice, a log line, a status, or nothing), the copy, and the action a notice offers; a call site reports a kind and never chooses a surface. *Error Surfaces — Brainstorm Brief* carries the five questions the design settles: the unit of a kind, host-side reach, other surfaces, mobile, and how batches and bursts collapse. Its home is one file readable by both halves, so the reporter's React hook and undo stack move out of `notifications.ts` first.

---

### Ride-Alongs

#### MarkdownPM

##### F-573 · A `#` line inside an HTML block lists as a heading.

> **Area:** MarkdownPM · **Lens:** Defect · **Weight:** Low · **Size:** M · **Net:** +15 · **Origin:** Drift

**Finding**

The heading scan skips a `#` line inside a fence or a `$$` math block but not one inside an HTML block, so `<div>` / `# x` / `</div>` still lists `x` in the Outline, the heading picker, the fold chevrons, and the index, and the editor draws the line as a heading. The HTML-block detector can't decide it as written: it opens a block on any line that starts with a tag and runs it to the next blank line, so a line led by an inline tag, an autolink, or a one-line comment (`<b>Note:</b> read this`, `<!-- todo -->`) would swallow every heading beneath it. `scanHeadings` skips through `inSealedLine` (fences, math, tables), and `htmlBlocks` matches `HTML_OPEN` without CommonMark's start and end conditions. The editor can now write such a block itself: with **HTML Shortcuts** on, ⌘/ over several lines wraps them in one `<!-- … -->`, and every heading after the first still lists.[^564]

**Fix | Proposed**

Make `htmlBlocks` follow CommonMark's seven start and end conditions, then skip HTML-block lines in the heading scan, the block model's heading kind, and the line intents' heading branch; `quietAt`, the rescan's other reader of the spans, moves with it.

#### UIX

##### F-486 · Where a pop-up appears is worked out inside a 50-line block tangled with its screen updates.

> **Area:** UIX · **Lens:** Complexity · **Weight:** Low · **Size:** S · **Net:** +2 · **Origin:** Patch-Over

**Finding**

Every pop-up picker decides where to sit (flip up or down, center or pin to an edge, clamp to the screen, place its bloom origin) inside one closure in a layout effect, interleaved with latched decisions and state updates. It sits in one of the kit's most-fixed files, and testing any placement decision needs faked DOM measurements. The closure is `measure` in `PickerMenu.tsx`, and nothing in its logic needs React or the DOM. Git history shows 15 commits including 4 fixes in 60 days, while the closure's inputs (trigger rect, pane size, viewport, `bounds`, `direction`, `origin`, `decidedDir`, `decidedCenter`) and outputs (a `Pos`, the effective direction, the latched decisions) are all plain values.[^481]

**Fix | Proposed**

Extract a pure `placePane({ trigger, pane, viewport, bounds, direction, origin, decided }) → { pos, dir, decided }` beside the component; the effect keeps measuring, latching the returned decisions, and `setPos`/`setEffDir`. `setPos` is already change-guarded (`samePos`), so the extraction is purely structural, and the centering tests become plain function tests.

#### Navigation

##### F-596 · Maximum Tab Width has no effect above a tab strip's preferred width, so most of its steps do nothing.

> **Area:** Navigation · **Lens:** Defect · **Weight:** Low · **Size:** S · **Net:** +1 · **Origin:** Shortcut

**Finding**

Settings offers Maximum Tab Width in steps from 150 to 350px, and `ConfigurationPM.md` calls it the widest a tab grows, but a tab never grows past its strip's preferred width, so the setting can only narrow a tab below it. A tab is `flex: 0 1 var(--tab-pref)`, which shrinks in a crowded strip and never grows, so `max-width: var(--tab-max-user, 250px)` takes effect only below `--tab-pref`: 180px on the main bar (`.tabs-standard`) and 150px in a window's strip (`.tabs-compact`). On the main bar the 150 and 175 steps narrow tabs and the other seven change nothing, and in a window's strip none of the nine changes anything; the trailing tab sizes to its label up to `--tab-max-absolute` and ignores the setting too. Measured over CDP against `~/Test`: main-bar tabs read 150, 175, then 180px at every step from 200 to 350, and window-strip tabs read 150px at every step.[^577]

**Fix | TBD**

Give `.tab` `flex-grow: 1`, so tabs fill spare strip width up to the setting; the trailing tab keeps its own label-sized rule, and both strips' resting look changes. **Your call:** growing tabs, a ladder that stops at 180px (which still leaves the setting inert in window strips), or dropping the setting; `ConfigurationPM.md` follows the ruling.

#### Views

##### F-631 · A new item's rename field opens one frame after its row.

> **Area:** Views · **Lens:** Divergence · **Weight:** Low · **Size:** S · **Net:** +5 · **Origin:** Drift

**Finding**

A page created from a view mounts its row from the host's push, keyed by the ID the window minted, and its title field opens when the create's reply returns, because a rename session is claimed by the page's path, which the host decides as it settles the name. The host pushes before it replies, so the field opens at most one frame after its row, no slower than before the Data Layer plan; the session is still a second key beside the ID the row is mounted under. `createPageIn` calls `rename({ id: req.id, path: landed })` once the flight resolves with `created.path`, `useViewInteractions` routes it to `policy.rename(target, true)`, and the Cards view's policy opens `beginRename(target.path, …)`, whose fence is `renamingPath`.[^612]

**Fix | Proposed**

Rename sessions are claimed by ID across creates: a create opens its rename with the minted ID as it asks, and the field binds to the row the push mounts under that ID, keeping the path for the rename it sends.

##### F-632 · Dragging a Set to another band shows it at its old rank for the round trip.

> **Area:** Views · **Lens:** Divergence · **Weight:** Low · **Size:** S · **Net:** +6 · **Origin:** Drift

**Finding**

In a view that groups by Sets in a custom order, dragging a Set under another parent moves it at once, but its place among the groups follows only after the host answers the move, so for the round trip it sits at its old rank and then jumps. The move is painted ahead, while the rank is a view write the band router sends only once the move's reply lands; a page create stages its order with the ask and takes it back on a refusal. `routeSet` returns an `fs` effect carrying `moveSet` and `after: { group_order }`, and `runBandEffect` awaits `io.mutate(effect.req)` before `io.persistView(effect.after)`, where `createPageIn` calls `stageView` before its `mutate` and `unstageView` on a refusal. This predates the Data Layer plan.[^613]

**Fix | Proposed**

The `fs` arm stages `after` with the ask, persists it once the move lands, and unstages it on a refusal, the shape `createPageIn` and the manual-order drop in `useViewInteractions.tsx` already use.

##### F-638 · A refused page create clears another new row's staged order until that row's own order lands.

> **Area:** Views · **Lens:** Defect · **Weight:** Low · **Size:** S · **Net:** +6 · **Origin:** Shortcut

**Finding**

A page created in a custom-ordered view stages its place in the view's hand order as it asks, and a second create made before the first's reply composes its order on the first's. When one of them is refused, it takes back the whole staged order rather than its own row, so the other new row drops to where the view's sort places it until its own reply lands and persists the order, a few milliseconds later. `createPageIn` calls `unstageView(c.source.id, c.view.id, staged)` on a refusal; `unstageView` drops every staged slot the patch wrote, here `manual_order`; and `orderPatch` builds that patch from the live view, which already folds the other create's staged order.[^619]

**Fix | Proposed**

A refusal restages the order without the refused ID rather than dropping the slot, so a create still in flight keeps its place.

#### Matrix

##### F-408 · The Matrix can't be pinch-zoomed on a touchscreen.

> **Area:** Matrix · **Lens:** Growth Constraint · **Weight:** Low · **Size:** S · **Net:** +12 · **Origin:** Premature

**Finding**

On a touchscreen, such as a Windows touch laptop, two fingers on the Matrix pan it instead of zooming. Zoom arrives only as a Ctrl-wheel event, which is how trackpads report a pinch, so trackpads work and only touchscreens break. The canvas turns off the browser's own touch handling, so both fingers go to pointer handlers that follow one pointer and ignore the second. `onWheel` zooms only `if (e.ctrlKey)`, `touchAction: 'none'` routes every touch to the one-pointer `onPointerDown`/`onPointerMove`, and a search of `Core/Matrix` finds no touch or gesture handlers.[^403]

**Fix | Proposed**

In `MatrixCanvas`, keep a small map of active pointer ids on the host; while two are down, feed the change in their distance ratio to `matrixRuntime.zoom` at their midpoint (the same call the wheel makes, which already takes a focus point and factor) and suppress the one-pointer pan.

#### Files

##### F-604 · An app file this session never read and can't read opens as empty, so its section shows defaults and its changes are refused, some without a word.

> **Area:** Files · **Lens:** Integrity · **Weight:** Low · **Size:** M · **Net:** +15 · **Origin:** Drift

**Finding**

Four of Pommora's own JSON files are read through `readAppFile`: `state.json` (Collection, Context and Space order, pins, and the Nexus banner), `matrix.json` (the Matrix's grouping, filter, force and display settings), `homepage.json` (the Homepage banner and heading icon), and `crops.json` (image framing). `readAppFile` treats a file this session never read the same way whether it's absent or only unreadable, for example an evicted iCloud placeholder offline, which `atomicWrite.ts` itself names as the unreadable case: both read as empty. `readLast` already reports `unreadable`, and `readAppFile` drops it (`?? null`). The walk then opens the Nexus with the sidebar sorted by title, no pins, Matrix settings at their defaults, and Homepage banners and crops missing. Only the board's `_tiles.json` reads through `readAppFileKnown`, and it stays closed with a notice that offers to try again.

Every write to one of these files is then refused by `updateNexusConfig`'s strict read-modify-write, and the user hears about it only sometimes. A reorder, a banner, a crop or a heading-icon change goes through `mutate`, and its refusal is posted. A pin toggle or a Matrix change goes through `persist(…, true)`, which only logs. The pin shows as set, isn't saved, and is replaced by the disk's copy once the file reads again. The asset migration breaks its own rule in the same way. `collectRefs` says an unreadable store holds the sweep, but its `state.json` and `homepage.json` refs read through `readAppFile`, answer with no banner, and add no `skipped` entry. `sweepLegacyRoot` then sends to the trash the legacy banner image the unreadable file still names.

The three hand-authored files (`nexus.json`, `settings.json`, `properties.json`) read through `readKept`, which throws on an unreadable file this session never read, so the open fails there first. This finding covers the case where only the four app-written files are unreadable, which is the likely iCloud shape, since they're the least recently touched files in `.nexus/`.[^585]

**Fix | TBD**

Route the four readers (the walk's `readConfig`, `readNavigationFile`, `readMatrixFile`, and the file-event arms for `state.json`, `homepage.json`, and `crops.json`) through `readAppFileKnown`. When a file answers `undefined`, the open posts one notice, as the board does: its section shows defaults, and its changes won't save until it reads. `collectRefs` pushes a `skipped` entry for a store that answers `undefined`, so the sweep holds. Leave `persist`'s quiet flag alone, since the notice at open already tells the user. **Your call:** `state.json` alone. Either it holds the open, because it seeds the order every surface reads, or it opens with defaults and the notice. Matrix, Homepage and crops follow the board.

[^63]: **F-064:** `Core/Sync/Client/pull.ts:39-59` (`landChange`), `Core/Sync/Arrival/land.ts:83-144`, `Core/Sync/Client/push.ts:257-309` (`resolveStale`), `Core/Sync/Client/reconcile.ts:99-108`, `Core/Paths/exclusion.ts:43-60` (`manifestAdmits`), `Sync/Routes/items.ts:10-17` (`itemPath`), `Desktop/Platform/hostPath.ts:5` (`nativePath`)
[^64]: **F-065:** `Desktop/Sync/transport.ts:24-38` (`transport`), `Core/Sync/Client/call.ts:89-91`, `Sync/wire.ts:40-55` (`BLOB_CAP`)
[^65]: **F-066:** `Core/Sync/handlers.ts:304-305`, `Core/Sync/handlers.ts:349-353`, `Core/Sync/handlers.ts:325` (`freshKdfParams`), `Core/Sync/Client/reconcile.ts:88-97` (`reconcile`), `Core/Sync/Client/push.ts:174-210` (`collect`), `Core/Sync/Client/session.ts:144-155` (`begin`), `Core/Sync/Client/session.ts:175-188` (`withKeys`), `Sync/Routes/items.ts:87`
[^66]: **F-067:** `Core/Sync/Client/push.ts:233-255` (`pushRename`), `Core/Sync/Client/push.ts:257-309` (`resolveStale`), `Sync/Store/log.ts:153-154`
[^67]: **F-068:** `Core/Sync/Arrival/land.ts:124-144` (`landRename`), `Core/Sync/Arrival/land.ts:106-122` (`landDelete`), `Core/Sync/Client/push.ts:233-242` (`pushRename`), `Core/Nexus/folderKind.ts:53`
[^77]: **F-078:** `Core/Sync/handlers.ts:175-191` (`rotateRing`), `Core/Sync/handlers.ts:322,345`, `Core/Sync/Client/keyring.ts:39-45,73-82`
[^78]: **F-079:** `Core/Sync/handlers.ts:165-208` (`rotateRing`), `Core/Sync/handlers.ts:238-241`, `Core/Sync/Client/push.ts:98` (`sealed`), `Core/Sync/Client/keyring.ts:85-106` (`openRecord`), `Core/Sync/Contract/wire.ts:129-133` (`PullReply`), `Sync/Store/nexus.ts:28`
[^79]: **F-080:** `Core/Sync/handlers.ts:210-250` (`act`), `Sync/wire.ts:44,46`, `Core/Settings/NexusRows.tsx:231-246`, `Core/Sync/Client/keyring.ts:62-72` (`loadRing`)
[^80]: **F-081:** `Core/Sync/Client/session.ts:175-183` (`withKeys`), `Core/Sync/Client/pull.ts:80-83` (`pullWait`), `Core/Sync/handlers.ts:118-126` (`state`)
[^81]: **F-082:** `Core/Sync/handlers.ts:258-286`, `Sync/Routes/roster.ts:15-30` (`connect`), `Sync/Store/roster.ts:28-30`, `Core/Sync/Contract/wire.ts` (`RouteTable`), `Sync/wire.ts` (`PATHS`)
[^82]: **F-083:** `Core/Sync/handlers.ts:339`, `Sync/Store/nexus.ts:53-68` (`createInfo`), `Sync/Store/log.ts:186-191` (`sweep`), `Core/Sync/Client/session.ts:127`
[^168]: **F-170:** `Core/MarkdownPM/Engine/Tables/regions.ts:24-27` (`isTable`), `Core/MarkdownPM/Engine/Tables/regions.ts:55-58`, `Core/MarkdownPM/Engine/docScan.ts:103-111` (`quietAt`), `Core/MarkdownPM/Engine/docScan.ts:117-134` (`rescan`), `Core/MarkdownPM/Tables/CellEditor.tsx:260-262`
[^171]: **F-173:** `Core/MarkdownPM/Tables/MarkdownTable.tsx:355-361` (`resolve`), `Core/MarkdownPM/Tables/MarkdownTable.tsx:548-580` (`shift`), `Core/Views/Table/useColumns.ts:346-372` (`startColumnDrag`)
[^180]: **F-182:** `UIX/Buttons/button-base.css.ts:68-93` (`button`), `UIX/Buttons/Button.tsx:52-74`, `UIX/Menus/menu-row.css.ts:24-37` (`rowFocus`, `rowShell`), `UIX/Fields/fieldRing.ts:11,19-33` (`fieldRing`)
[^196]: **F-198:** `Desktop/Store/stores.ts:44-46` (`clearPath`), `Desktop/Store/stores.ts:49-76` (`upsertPageIndexes`), `Desktop/Store/stores.ts:77-97` (`removePathIndex`, `renamePathIndex`, `removePathPrefixIndex`, `renamePathPrefixIndex`), `Desktop/Store/driver.ts:16-26` (`inTransaction`), `Desktop/Store/stores.ts:209-251` (`syncStore`), `Core/Sync/handlers.ts:352,365`, `Core/Sync/Client/base.ts:16,21` (`readAllBases`, `deleteBase`)
[^238]: **F-240:** `Desktop/hostGraph.test.ts:31-46`, `Core/Interface/handlers.ts:39-84` (`interfaceHandlers`), `Core/Settings/handlers.ts:50`, `Core/Interface/chrome.ts:1-8`, `Core/Interface/Windows/windowTabs.ts`, `Core/Interface/Windows/windowRecord.ts`, `Core/Interface/Windows/windowState.ts`, `Core/Interface/Windows/windowCache.ts`, `Core/Interface/Windows/windowMorph.ts`, `Core/Properties/governedSweep.ts`, `Core/Properties/governedWrite.ts`, `Core/Properties/journalSlot.ts`, `Core/Properties/keyHolders.ts`, `Core/Views/filterModel.ts`, `Core/Views/visibilityModel.ts`, `Core/Views/creationOrder.ts`
[^332]: **F-337:** `Core/MarkdownPM/codeHighlight.ts:151` (`blockTrees`), `Core/MarkdownPM/codeHighlight.ts:155-183` (`paint`), `Core/MarkdownPM/codeHighlight.ts:185-218` (`colors`), `Core/MarkdownPM/docCache.ts:40-52` (`drawnLast`)
[^334]: **F-339:** `Core/MarkdownPM/Menus/blockHandles.ts:42-53` (`blockHandles`), `Core/MarkdownPM/Engine/blockModel.ts:32-43` (`blockContext`), `Core/MarkdownPM/Engine/blockModel.ts:90-99` (`blockContextOf`), `Core/MarkdownPM/Engine/docScan.ts:157-223` (`splice`)
[^403]: **F-408:** `Core/Matrix/MatrixCanvas.tsx:499-515`, `Core/Matrix/MatrixCanvas.tsx:546-568`, `Core/Matrix/matrix.css.ts:63-70`
[^481]: **F-486:** `UIX/Pickers/PickerMenu.tsx:179-272` (`measure`), `UIX/Pickers/PickerMenu.test.tsx:390-481`
[^559]: **F-568:** `UIX/Interactions/dismissalStack.ts:60-75` (`onPointerDown`), `UIX/Interactions/dismissalStack.ts:114` (`shields`), `UIX/Pickers/PickerMenu.tsx:113-121,292,307` (`PickerMenu`), `UIX/Animations/useExitPresence.ts:9-25` (`useExitPresence`), `UIX/Pickers/PickerControl.tsx:91-114,144-148` (`PickerControl`), `Core/Actions/menuActions.ts:20-23` (`popMenu`), `Core/Session/chromeSlice.ts:62-70` (`presentMenu`), `Core/Interface/Menus/MenuPresenter.tsx:85-104` (`MenuPresenter`), `Core/Tiles/Surfaces/ViewTile.tsx:652-660`, `Core/Interface/Toolbar/Toolbar.tsx:29-33`, `Core/Views/Settings/GroupFrame.tsx:235`, `UIX/Interactions/shared.ts:26-34` (`suppressReleaseClick`)
[^564]: **F-573:** `Core/MarkdownPM/Engine/headingScan.ts:20-34` (`scanHeadings`), `Core/MarkdownPM/Engine/detect.ts:98-126` (`htmlBlocks`), `Core/MarkdownPM/Engine/intents.ts:532`, `Core/MarkdownPM/Engine/blockModel.ts:81` (`kindAt`), `Core/MarkdownPM/Engine/docScan.ts:103-111` (`quietAt`)
[^577]: **F-596:** `Core/Navigation/tab-base.css:8-10` (`.tab`), `Core/Navigation/tab-base.css:29-32` (`.tab:last-child`), `Core/Navigation/tab-base.css:143-155` (`.tabs-standard`, `.tabs-compact`), `Core/Settings/personalization.ts:45-48` (`TAB_MAX_WIDTH`), `Core/Settings/applyPersonalization.ts:50`, `.claude/Features/ConfigurationPM.md:66`
[^585]: **F-604:** `Core/Files/atomicWrite.ts:202-203` (`readAppFile`), `Core/Files/atomicWrite.ts:178-193` (`readLast`), `Core/Files/atomicWrite.ts:207-212` (`readAppFileKnown`), `Core/Files/atomicWrite.ts:144-161` (`rmwLocked`), `Core/Files/atomicWrite.ts:225-236` (`updateNexusFile`), `Core/Files/atomicWrite.ts:265-271` (`updateNexusConfig`), `Core/Nexus/readNexus.ts:68` (`readOrder`), `Core/Nexus/readNexus.ts:113` (`readConfig`), `Core/Nexus/readNexus.ts:287` (`readNexusConfig`), `Core/Navigation/navigationFile.ts:33-41` (`readNavigationFile`), `Core/Matrix/matrixFile.ts:11` (`readMatrixFile`), `Core/Nexus/fileEvents.ts:525-544,607-612` (`applyOrder`), `Core/Session/navigationSlice.ts:267` (`writeNav`), `Core/Session/matrixSlice.ts:189` (`patchMatrix`), `Core/Interface/Notifications/notifications.ts` (`persist`, `reportRefusal`), `Core/Assets/assetMigrate.ts:85-114,166,175` (`collectRefs`, `migrateAssets`), `Core/Tiles/tileDoc.ts:20` (`readTileDocAt`)
[^586]: **F-605:** `Core/Files/jsonMerge.ts:15-46` (`mergeKeys`), `Core/Contract/validators.ts:5-6` (`isPlainObject`), `Core/Sync/Arrival/mergePolicy.ts:19-40` (`isMergedJson`, `mergeDepthFor`), `Core/Sync/Arrival/land.ts:45-64` (`bytesToLand`), `Core/Sync/Arrival/land.ts:95`, `Core/Sync/Client/push.ts:299` (`resolveStale`), `Core/Contexts/contexts.ts:9,20` (`ContextsRegistry`), `Core/Contexts/contextCascade.ts:246-260`, `Core/Nexus/readNexus.ts:247-274` (`readContextGroups`), `Core/Nexus/order.ts:10-27` (`resolveOrder`), `Core/Properties/rowOrder.ts:1-13` (`resolveRowOrder`), `Core/Tiles/tiles.ts:95,182-184` (`active`, `TileDoc`), `Core/Tiles/TileHost.tsx:283` (`renderTile`), `Core/Views/viewsFile.ts:24` (`views`), `Core/Properties/properties.ts:117,142,149-150` (`select_options`, `status_groups`), `Core/Sync/Client/tap.ts:9` (`DEBOUNCE_MS`), `.claude/Features/NexusSyncPM.md:55,63`
[^592]: **F-611:** `Core/Contract/bridge.ts:61-255` (`Asks`), `Core/Nexus/mutateRequest.ts:51-108` (`mutateRequest`), `Core/Nexus/mutate.ts:109-143` (`setProfileImage`, `setProfileIcon`, `setDisclosureLock`, `setActiveView`), `Core/Nexus/mutate.ts:164` (`reorderTop`), `Core/Nexus/reorder.ts:26-55`, `Core/Views/handlers.ts:26-62`, `Core/Properties/assignment.ts:107-165` (`assignInner`, `reorderAssignment`), `Core/Settings/handlers.ts:19-51`, `Core/Assets/handlers.ts:42` (`assets:setDir`), `Core/Assets/handlers.ts:74` (`assets:adopt`), `Core/Assets/assetMigrate.ts:113`, `Core/Pages/setBanner.ts:44`, `Core/Properties/optionOps.ts:82` (`addOptionToDef`), `Core/Nexus/configReach.ts:372,380`, `Core/Nexus/cascade.ts:219`, `Core/Navigation/handlers.ts:18` (`nav:write`), `Core/Matrix/handlers.ts:14` (`matrix:write`), `Core/Pages/handlers.ts:26` (`page:updateBody`), `Core/Pages/handlers.ts:45-47` (`history:restore`), `Core/Pages/fileHistory.ts:169-180`, `Core/Nexus/handlers.ts:146` (`nexus:rename`), `Core/Nexus/liveTree.ts:80` (`mutableTarget`), `Core/Tiles/handlers.ts:60-113`, `Core/Properties/handlers.ts:121-124` (`defEditOp`), `Core/Properties/handlers.ts:165-176`, `Core/Contract/handlers.ts:98-110` (`withWriteRoot`), `Desktop/FileWatch/watcher.ts:69-92,114-117` (`pushConfig`)
[^598]: **F-617:** `Core/Nexus/cascade.ts:81-90` (the survivor gate in `deleteCascade`), `Core/Nexus/heldPages.ts:59` (`titleHeldOutside`), `Core/Trash/spend.ts:251-270` (the restore's link arm over its own record), `Core/Properties/assignment.ts:49` (`refillValues`, blank-only), `Core/Trash/spend.ts:87-88` (the empty-time handoff)
[^599]: **F-618:** `Core/Trash/holdings.ts:68` (`trashedTitles`), `Core/Trash/holdings.ts:82` (`parkLinks`), `Core/Trash/spend.ts:58,88` (`emptyBundle`), `Core/Trash/spend.ts:192` (a restore's parking), `Core/Settings/TrashFrame.tsx:116,143,156` (`many`, one request per row)
[^602]: **F-622:** `Core/Properties/journalSlot.ts:14` (`journalSlot`), `Core/Properties/propertyJournal.ts:47-57` (`writeSchemaJournal`, `schemaCascade`), `Core/Contexts/contextJournal.ts:47-49` (`writeJournal`), `Core/Nexus/handlers.ts:81,100` (the two replays), `Core/Contexts/contextResolve.ts:33` (`contextWorldOf`), `Core/Properties/registryProperty.ts:97-132` (`renameProperty`), `Core/Contexts/contextCascade.ts:208-264` (`renameContextOp`), `Core/Contexts/contextCascade.ts:113-114` (`unswept`), `Core/Nexus/mutate.ts:60-68` (`renamed`), `Core/Trash/delete.ts:61-85` (the delete's write-ahead record), `Core/Properties/governedSweep.ts`, `Core/Contexts/spaceSidecar.ts:45-52` (`spaceSidecars`), `Core/Properties/governedSweep.ts:96`, `Core/Properties/deleteProperty.ts:54`, `Core/Assets/assetMigrate.ts:162`, `Core/Properties/keyHolders.ts:21,33` (`confirmedKeyHolders`), `.claude/Planning/Data Layer — Investigation Reports/E — Governed Data Sweeps.md` (the nine loops and five enumerators)
[^603]: **F-621:** `Core/Interface/Notifications/notifications.ts` (`reportRefusal`, `persist`, `notifyReport`), `Core/Contract/result.ts` (`ErrorCode`), `Core/Sync/Contract/wire.ts` (`SyncStatus`), `.claude/Planning/Error Surfaces — Brainstorm Brief.md`
[^606]: **F-625:** `Core/Trash/delete.ts:27,44,94,104` (`deleteOp`), `Core/Trash/bundle.ts:27-35` (`mintBundle`), `Core/Files/atomicWrite.ts:62-75` (`relocate`), `Core/Files/writeEcho.ts:35` (`reportRename`), `Core/Sync/Client/tap.ts:45-58` (`installTap`), `Core/Sync/Client/tap.ts:64-75` (`feedRename`), `Core/Sync/Client/session.ts:136-139` (`onRename`), `Core/Sync/Client/push.ts:233-254` (`pushRename`), `Core/Sync/Client/push.ts:147-169` (`pushDirty`), `Core/Paths/exclusion.ts:43-60` (`manifestAdmits`), `Core/Paths/exclusion.ts:96-99` (`remainderUnder`), `Core/Settings/settings.ts:119` (`releaseExcludedFolders`), `Core/Trash/record.ts:34-35`
[^607]: **F-626:** `Core/Nexus/fileEvents.ts:437-459` (`applySpace`), `Core/Nexus/fileEvents.ts:546-566` (`applyMove`), `Core/Nexus/treePatch.ts:234-260` (`moveNodeInTree`), `Core/Nexus/fileEvents.ts:462-483` (`regroup`, `applyContexts`), `Core/Contexts/contextCascade.ts:208,240-248` (`renameContextOp`), `Core/Contexts/contextCascade.ts:266,299-305` (`renameSpaceOp`), `Core/Files/atomicWrite.ts:62-75` (`relocate`), `Core/Nexus/readNexus.ts:77-85` (`contextLinker`), `Core/Nexus/fileEvents.ts:363-405` (`applyPage`), `Core/Properties/pageRow.ts:11-17` (`pageRowOf`), `Core/Contexts/contextResolve.ts:61` (`resolveContextKeys`)
[^608]: **F-627:** `Core/Properties/optionOps.ts:221-239` (`removeOption`), `Core/Properties/propertyJournal.ts:52-57` (`SchemaCascade`, `schemaCascade`), `Core/Properties/replaySchemaCascade.ts:75-87`, `Core/Properties/Schema/PropertyFrame.tsx:187-191` (`retryOwed`), `Core/Properties/journalSlot.ts:14` (`journalSlot`), `Core/Properties/governedSweep.ts:38` (`unsweptLine`)
[^611]: **F-630:** `Desktop/FileWatch/watcher.ts:94-134` (`startWatcher`), `Desktop/FileWatch/watcher.ts:38-39,119-124` (`batch`, `debounce`), `Desktop/FileWatch/watcher.ts:106` (`awaitWriteFinish`), `Desktop/FileWatch/watcher.ts:157-171` (`stopWatcher`), `Core/Nexus/fileEvents.ts:498-514` (`applySettings`, `oweRescope`), `Core/Nexus/settle.ts:131-136` (`reseed`), `Desktop/main.ts:328`
[^612]: **F-631:** `Core/Views/Host/useViewCreation.ts:151-177` (`createPageIn`), `Core/Views/Host/useViewInteractions.tsx:45,135` (`rename`), `Core/Views/Cards/CardsView.tsx:196` (`beginRename`), `Core/Views/Table/TableView.tsx:122-130`, `Core/Session/editSlice.ts:16,31,108` (`beginRename`, `renamingPath`), `Core/Session/nexusSlice.ts:220-258` (`mutate`), `Core/Nexus/mutateRequest.ts:125-128` (`minted`)
[^613]: **F-632:** `Core/Views/Bands/bandRouter.ts:74-109` (`routeSet`), `Core/Views/Bands/bandRouter.ts:134-146` (`runBandEffect`), `Core/Views/Host/pendingView.ts:172-186` (`mutateAhead`), `Core/Views/Host/pendingView.ts:109-121` (`stageView`, `unstageView`), `Core/Views/Host/useViewCreation.ts:151-177` (`createPageIn`), `Core/Views/Host/useViewInteractions.tsx:196-203`
[^614]: **F-633:** `Core/Nexus/settle.ts:44` (`inTurn`), `Core/Platform/inTurns.ts:2-9` (`inTurns`), `Core/Nexus/settle.ts:168` (`payOwedWalk`), `Core/Nexus/settle.ts:171-178` (`settleNow`), `Core/Nexus/settle.ts:108-129` (`settle`), `Core/Nexus/settle.ts:85-106` (`walkWhileOwed`), `Core/Nexus/settle.ts:23-35` (`applyOwn`)
[^617]: **F-636:** `Core/Nexus/fileEvents.ts:146-152` (`stampable`), `Core/Nexus/fileEvents.ts:335-361` (`applyFolder`), `Core/Nexus/fileEvents.ts:363-405` (`applyPage`), `Core/Nexus/fileEvents.ts:498-514` (`applySettings`, `oweRescope`), `Core/Nexus/mutate.ts:209-214` (`retryUnreadable`), `Core/Nexus/settle.ts:85-106` (`walkWhileOwed`), `Core/Nexus/settle.ts:139-148` (`stampListed`), `Core/Nexus/settle.ts:52-60` (`shown`), `Core/Nexus/settle.ts:108-129` (`settle`)
[^618]: **F-637:** `Core/Properties/governedSweep.ts:120-130` (`undoSweep`), `Core/Contexts/contextCascade.ts:181-195` (`unlinkMembers`), `Core/Nexus/mutate.ts:73-80` (`underContexts`), `Core/Nexus/mutate.ts:90-91,153-154` (`rename`, `movePage`)
[^619]: **F-638:** `Core/Views/Host/useViewCreation.ts:125-139` (`orderPatch`), `Core/Views/Host/useViewCreation.ts:151-177` (`createPageIn`), `Core/Views/Host/pendingView.ts:116-121` (`unstageView`), `Core/Views/views.ts:337-345` (`slotsOf`)
[^620]: **F-639:** `Core/Nexus/fileEvents.ts:546-566` (`applyMove`), `Core/Nexus/treePatch.ts:234-260` (`moveNodeInTree`), `Core/Nexus/fileEvents.ts:335-361` (`applyFolder`), `Core/Nexus/fileEvents.ts:363-405` (`applyPage`), `Core/Index/indexSeed.ts:114-128` (`indexWrittenPage`), `Core/Files/atomicWrite.ts:62-75` (`relocate`), `Core/Files/writeEcho.ts:10,74-88` (`PREFIX_WINDOW_MS`, `isRecentWrite`)
[^621]: **F-640:** `Core/Nexus/adopt.ts:62-82` (`stampPage`), `Core/Nexus/adopt.ts:89-98` (`ensurePageId`), `Core/Nexus/adopt.ts:102-115` (`stampFolder`), `Core/Nexus/adopt.ts:126-143` (`Stamp`, `stampMissing`), `Core/Nexus/adopt.ts:145-191` (`stampTree`, `stampAdopted`), `Core/Nexus/fileEvents.ts:139-143` (`oweRetry`), `Core/Nexus/fileEvents.ts:146-152` (`stampable`), `Core/Nexus/fileEvents.ts:390-397` (`applyPage`), `Core/Nexus/fileEvents.ts:437-445` (`applySpace`), `Core/Nexus/readNexus.ts:105-109,312-317`, `Core/Nexus/mutate.ts:209-213` (`retryUnreadable`), `Core/Nexus/handlers.ts:33-48,78-95` (`prepareOpenedNexus`, `openStores`), `Core/Nexus/heldPages.ts:43` (`idHeld`), `Core/Nexus/identity.ts:17-50` (`ensureIdentity`), `Core/Nexus/remintLedger.ts:82-98` (`runOpenLedger`, `readBaseline`), `Core/Nexus/remintLedger.ts:17-27,59-80` (`projectBaseline`, `pickEldest`), `Core/Nexus/record.ts:15-47` (`recordsOf`, `recordById`), `Core/Nexus/heldPages.ts:16-25,40-41` (`indicesOf`, `livePathOf`), `Core/Nexus/treeIndex.ts:254-258` (`pagesByIdOf`), `Core/Contexts/contextResolve.ts:33-37` (`contextWorldOf`), `Core/Contexts/contexts.ts:12-17,35-43` (`contextEntry`, `seededRegistry`), `Core/Contexts/contextsRegistry.ts:20-25` (`ensureContextsRegistry`), `Core/Trash/restoreScrub.ts:85`
