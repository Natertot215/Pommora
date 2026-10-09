## Pommora Codebase Audit

**Pinned:** `f6511401d` (09-23-2026) · **Reconciled:** `0e7318f68` (10-09-2026) · **Findings:** 106/627

Thirty-four Opus investigators read every production file in `Core`, `UIX`, `Desktop`, and `Sync` in full, sliced by folder and by the jobs the code performs. Two mergers combined their 857 candidates by root cause, and twenty-one reviewers who hadn't raised them re-read every citation, reproduced the High ones against real modules, and killed 63. This document is the current state: findings that were fixed, withdrawn, or ruled moot are removed rather than annotated, and rulings are written into the findings they settle. The readiness and pace sections are the orchestrator's judgment, drawn from the evidence below them. A system audit of MarkdownPM (10-08-2026) read the editor in full at `70fc6063c`, and its findings are folded in here: each fix was typed and compiled on a scratch worktree, so its nets are measured, and the owner's rulings on which fixes wait are written into the findings they settle. Findings were renumbered from F-001 on 10-08-2026, so F-numbers in earlier documents don't match these.

### Verdict

#### Readiness

**Plumb first, narrowly.** Six findings are High. Three are in Sync: F-001 and F-003 were reproduced against the real code, and F-007 was traced through it by two readers. Each is in code that saves, syncs, or deletes a person's files. Three are in the page editor: F-014 and F-023 write into the wrong table or footnote, and F-044 freezes typing on very long pages. The surrounding structure is sound, and the fixes are contained.

**What holds, with evidence:**

- **The layering rules all pass their checks.**
  - Core reaches the machine only through `Core/Platform`: zero Node or Electron imports across 700 Core and UIX files.
  - The code the host runs imports no React: 205 files, verified by `engineGraph.test.ts` and `hostGraph.test.ts`.
  - UIX imports nothing from Core.
  - Every channel is declared once in `bridge.ts`, and one `catch` turns a thrown error into a `Result`.
- **The gates are green at the pin.** Typecheck is clean across 7 projects, Biome is clean, and 5,498 tests pass. Only 0.39% of lines are exact copies.
- **The pure models hold.** The view pipeline, the tile layout model, and the connections grammar produced no High findings. Their Medium findings are about cost and duplication, not wrong results.

**What's broken, and where:**

| Area | State | High | Medium |
| ------------ | ----------------------------------------------------- | ------- | ---------------------------- |
| Sync | Changes from another device are written to whatever path the hub names, including outside the Nexus and into `.git/` or `.obsidian/` (F-001). A rebuilt or restored hub never gets unchanged files re-uploaded, so new devices receive a partial Nexus (F-003). A list two devices both edited keeps one device's items, so a Context rename can revert and hide its Spaces (F-006). Trashing a Collection or Set uploads the contents of its excluded folders (F-007). | 3 | 4 |
| Page editor | A checkbox or link action in a table cell you haven't entered writes into a different table once a table is inserted above it or the tables are reordered (F-014). A footnote renumber hands an orphaned marker's number to a different footnote (F-023). Past about 8,000 lines, the footer's figures re-tokenize the whole page on every typing pause, freezing the editor for up to a second (F-044). | 3 | 11 |
| Menus and pickers | The kit's buttons show no keyboard focus, so a Tab walk through a menu or toolbar loses its place on every button (F-076). | 0 | 1 |
| Identity | An ID lost or damaged outside the app is replaced rather than recovered on every path but a held page's own event, so tabs, pins, metadata, and a Nexus's device store lose what they were keyed to (F-089). | 0 | 1 |

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

#### W1 · Sync Paths, Renames, and Resync

These are the ways a change travelling between devices can land in the wrong place, at two names, or not at all: an unchecked path from the hub, renames racing edits, capitalization that differs between devices, and a hub that was rebuilt or restored. Landing them makes the wire path-safe and a rebuilt hub whole again. It sits in the first tier because sync spreads any one device's mistake to every device.

##### F-001 · Changes from other devices are written to whatever path the hub names, including outside the Nexus.

> **Area:** Sync · **Lens:** Integrity · **Weight:** High · **Size:** S · **Net:** +12 · **Origin:** Drift

**Finding**

When another device's change arrives, the app writes, deletes, or moves the file at the path the hub's log names, with no check that the path stays inside the Nexus or inside the set of files sync may touch. A path like `../x` lands outside the Nexus folder, and a change into `.git/`, `.obsidian/`, or an excluded folder lands even though sync rules keep those at home; the hub rejects `..` but not `\`, so on Windows a peer's `a\..\..\x` becomes traversal. A compromised hub, or any editor device through the hub, can place any blob it holds at any path, and by naming an outside file in a delete it can make the app upload that file first, encrypted with the Nexus key every device holds. The documented promise that binding each blob to its path keeps the hub from moving ciphertext between paths holds only for decryption, since the landing path is never compared with it, and with NexusOS also an Obsidian vault, a planted `.obsidian/` plugin or `.git/config` is code that later runs on the receiving machine. Pull tests with hand-built changes landed a write for `../escaped.md` outside the Nexus root, a real page's write replayed as `../planted.md` (which still decrypts), and a write into `.git/hooks/post-commit`, because only reconcile gates arrivals through `manifestAdmits` while the live pull and `resolveStale` don't.[^1]

**Fix | Proposed**

Add one arrival gate in `Core/Sync/Arrival`: a change lands only if `manifestAdmits(session.scope)` accepts `change.path` (and `change.from` for a rename), the path carries no `\`, and a `write` change's `path` equals its `record.path`; otherwise it's skipped, the cursor advances, and status names it. Call it at the top of `landChange` and `resolveStale`; `manifestAdmits` already rejects a leading `..` or `/`, every dot segment but a top-level `.nexus`, every `_`-prefixed folder, and every excluded folder, so it's the survivor. Add `\` to the hub's `itemPath` refusal.

##### F-002 · A misbehaving sync hub can crash the app by sending an enormous reply.

> **Area:** Desktop · **Lens:** Integrity · **Weight:** Low · **Size:** S · **Net:** +5 · **Origin:** Shortcut

**Finding**

A sync hub, hostile or broken, can crash the whole app by sending back a reply that never ends. The hub limits the size of every request it accepts, but the app buffers whatever the hub sends back into memory before looking at it, and the transport runs in the Electron main process. An unbounded reply takes the app down, and the session restarts on every launch. `transport.ts:26` collects chunks with `res.on('data', (chunk) => chunks.push(chunk))` and keeps no running total, and `call.ts:90` casts `JSON.parse(reply.body)` to the route's reply type with no shape check.[^2]

**Fix | Proposed**

Add `TransportRequest.maxBytes`, set by `call` (a fixed JSON reply cap, such as 4 MiB) and by `getBlob` (`BLOB_CAP` plus `SEAL_OVERHEAD`); the transport keeps a running total and destroys the request past it. Checking the paths a reply names belongs to F-001.

##### F-003 · Reconnecting to a rebuilt or restored hub never re-uploads unchanged files.

> **Area:** Sync · **Lens:** Defect · **Weight:** High · **Size:** M · **Net:** +10 · **Origin:** Patch-Over

**Finding**

Each device keeps a record of what it believes the hub already holds, and when the hub loses its history (its data folder wiped and re-created at the same address, or restored from an older backup), the device keeps trusting that record and never re-uploads unchanged files. Reconcile sees files the hub has never heard of and hands them to the ordinary push, which skips every one whose bytes still match the stale record, so only files edited afterward reach the new hub and a device joining later gets a partial Nexus with nobody told. This breaks the documented recovery path, "the hub copy is rebuilt from one device" (Decision Log B′-4), whenever the rebuilt hub keeps its address. A second device rejoining after the rebuilt hub's change counter has passed its old cursor gets no `resync` answer at all, so it never reconciles, never re-uploads its unchanged files, and misses the rebuilt hub's changes numbered at or below its old cursor. Against the fake hub that mirrors `Sync/Store/log.ts`, two files were reconciled, the hub state wiped, and `reconcile` run again, which sent zero `/store` requests and left zero hub items.[^3]

**Fix | TBD**

Two moves, closing different gaps. In `reconcile`, drop a base row whose path has no head in the heads read before the push (`if (head === undefined) deleteBase(rel)` ahead of `toPush.push(rel)`), so the push sends it as a new write; this fixes the first device back after a wipe or a restore. Then tie the binding to the hub's history rather than its address: the key record's KDF salt is minted only when the hub's record is created (`freshKdfParams`), so `SyncScope` stores `salt` at bind, `sync:connect` treats the binding as kept only when address and salt both match, and `withKeys` compares `info.kdf.salt` with the binding before `begin` and, on a mismatch, drops every base row and resets the cursor to 0 so `begin` runs the first-bind reconcile; this fixes every later device after a wipe. A hub restored from backup keeps its salt, so a device whose old cursor it has already re-passed stays undetected until the hub issues a history epoch, and a future password change under fresh KDF parameters would trigger one harmless full reconcile.

##### F-004 · Renaming a page while another device's edit is in flight leaves the page at both names.

> **Area:** Sync · **Lens:** Defect · **Weight:** Medium · **Size:** S · **Net:** +10 · **Origin:** Drift

**Finding**

Renaming a page while another device's edit to it hasn't reached this device yet leaves the same page ID at two paths, which the duplicate-ID judge then splits into two pages. The hub refuses the rename and answers with the other device's edit at the old name, but the app moves its record to the new name anyway and settles the conflict as if that edit belonged there, so the rename is never re-sent. If this device's copy wins, the hub holds the page at both names; if the other device's copy wins, it lands at the old name and the renamed file stays behind unsynced. A local-wins stale rename left the hub with live items `['Notes/One.md', 'Notes/Renamed.md']`, because `pushRename` calls `renameBase` for every outcome (`push.ts:239`) and passes the destination to `resolveStale` with the head read at the source (`push.ts:241`).[^4]

**Fix | Proposed**

On a stale rename, keep the base row at `from`: fetch the head's bytes, pick the winner against the bytes now at `to` with `newerSide` (capturing the loser as `resolveStale` does), land the winner at `to`, record the base at `from` under `head.seq`, and re-send the rename with that base. `renameBase` moves only on an accepted outcome.

##### F-005 · Renaming a Set on one device leaves an empty ghost Set on the others.

> **Area:** Sync · **Lens:** Defect · **Weight:** Medium · **Size:** S · **Net:** +5 · **Origin:** Drift

**Finding**

Renaming a Set on one device leaves an empty folder under the old name on every other device, which Pommora reads as an empty Set. Folders don't travel through sync, only files: a Set rename sends one rename per file inside it, so each receiving device moves the files and leaves the old folder behind. Deleting nested Sets leaves the outer folder behind the same way, because a delete prunes only its immediate parent, and that prune uses a recursive remove that would take any file created there between the check and the remove. Landing `Notes/Ideas/One.md` and `_pageset.json` renamed to `Notes/Plans/` left `Notes` holding both an empty `Ideas` and `Plans`, since `landRename` has no parent cleanup and `resolveFolderKind` returns `'set'` for any nested folder.[^5]

**Fix | Proposed**

Add one `pruneEmptyParents(root, rel)` in `land.ts` that walks up from the vacated path's parent to the first non-empty folder or the root, re-reading each folder immediately before removing it, used by both `landDelete` and `landRename`.

##### F-006 · Two devices editing different items in one synced list keep only one device's edits, and a lost Context rename hides that Context's Spaces.

> **Area:** Sync · **Lens:** Integrity · **Weight:** Medium · **Size:** M · **Net:** +40 · **Origin:** Shortcut

**Finding**

When a synced Pommora JSON file has changed on both devices, arrival merges it key by key against the last synced copy. A key that only one side changed takes that side's value. A key that both sides changed goes whole to the newer side, and the merge descends only into objects that `mergeDepthFor` names. A list never descends, because the gate admits only plain objects and `isPlainObject` rejects arrays. So a list of items with ids merges as one value, and the losing side's items are dropped. The Sync feature doc records this as design ("a merged JSON file keeps its losing keys nowhere"), which leaves item-level merging as the only protection.

The worst case is the Contexts registry, `.nexus/contexts/contexts.json`, which merges at depth `{}` with its `contexts` list whole. Suppose one device renames a Context while the other adds, reorders, or re-icons one. If the second device's registry wins, the renamed title reverts. The folder rename still reaches every device as ordinary file renames, and the walk reads Spaces by registry title. The result is a Context whose folder no longer exists, so it shows no Spaces, next to an unregistered folder that holds all of them. Pages tagged with the new title stop resolving. None of this is captured or reported, and the rename journal was cleared when the rename committed, so nothing repairs it.

Smaller losses follow the same path:

- **`_tiles.json` (`tiles`):** adding a tile on one device while restyling another on the other keeps the new box in `layout` (only one side changed it). `tiles` goes to whichever side is newer, so either the restyle is lost or the new box has no entry and its file is orphaned. The box is deletable.
- **A Collection's or Set's sidecar (`views`):** editing one saved view on each device keeps only one edit.
- **The same sidecar (`properties`):** this is the schema's list of property ids. Assigning a different property on each device drops one assignment.
- **`properties.json` (`defs.<id>.select_options`, `defs.<id>.status_groups`):** `defs` merges per definition and per field, but each option list is one field, so adding an option to the same property on each device drops one.
- **`state.json` (`navigation.pinned`):** a pin made on each device drops one.

Some lists are out of scope:

- **Order lists** (`state.json` `order.*`, a sidecar's `set_order`, `properties.json` `order`) repair themselves through `resolveOrder` and `resolveRowOrder`, which append anything the kept order is missing.
- **A Space sidecar's `<Context>` and multi-value arrays, and a metadata shard's `aliases`,** already merge more finely than a page's frontmatter, which lands as a whole file.
- **`matrix.json` `filter.rules`** is a tree without ids.

Sync runs between desktops today. Two online devices converge within seconds through the long poll and a 2.5 s debounce, so the ordinary window is a device that edits while offline. A Mobile companion widens that window. In a probe of the real modules, a registry rename against an add kept `Projects` and `People` and lost `Work`. A tile add against a restyle kept `bands:[1,2]` with only `t1` in `tiles`. A sidecar's views and properties kept only the remote side, and select options kept `c` and lost `b`.[^6]

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

##### F-007 · Trashing a Collection or Set uploads the contents of its excluded folders to Sync.

> **Area:** Sync, Trash · **Lens:** Integrity · **Weight:** High · **Size:** M · **Net:** +15 · **Origin:** Drift

**Finding**

Sync admits nothing under an excluded folder, so its files stay on the device. When a Collection or Set holding an excluded folder is deleted to the Nexus Trash, the whole folder moves into its bundle, and Sync uploads the excluded folder's files from there, encrypted, to the hub and on to every device. `deleteOp` moves the folder into its bundle through `relocate`, which reports the rename to Sync's write tap; `feedRename` hands it to `pushRename`, whose trailing `pushDirty([to])` lists the bundle folder through `manifestAdmits`. Its `.trash` arm matches the path past `.trash/` against the excluded list, which `releaseExcludedFolders` empties of the deleted folder's entries as the delete finishes, and which a bundle's path can't match in any case, since the stamped `<stamp>__<Name>.deleted` folder sits between the parent folders and the entity's name. `pushDirty` keeps a Markdown file home only when it carries no `ID:`, so within Sync's usual size and name limits the upload takes the non-Markdown files and the pages carrying an ID, which includes the pages of a folder excluded after they were stamped.[^7]

**Fix | TBD**

A bundle's record already keeps the excluded entries the Collection or Set held (`excluded`), which a restore reseats. Sync's admission of a Trash path reads those kept entries, so a file under a bundle's excluded entry stays home in the Trash as it did in place. Where the kept entries live for a synchronous admit, whether folded into the scope at arm time and by each delete and empty or read from each bundle's record, is this fix's design.

#### W2 · Sync Keys and Device Membership

Revoking a device, rotating the encryption key, and renaming or removing devices each leave a gap between what the settings promise and what the devices do. F-008 carries the one decision about what revocation guarantees, and F-009 is only worth landing under one answer to it. They sit together because they share the key ring and its rotation.

##### F-008 · A revoked device that knows the Nexus password can still unlock the new key.

> **Area:** Sync · **Lens:** Integrity · **Weight:** Low · **Size:** S · **Net:** 0 · **Origin:** Shortcut

**Finding**

A revoke mints a new content key and wraps it for each remaining device and for the Nexus password, but the password doesn't change, so a revoked device that holds it can unwrap the new key from the hub's key record. Every device that created or joined the Nexus by typing the password keeps it in its keychain. What actually keeps a revoked device out of content stored afterward is the hub refusing its requests, not cryptography, so the documented promise that "a revoked device can read nothing stored after its revocation" (Decision Log D-4, NexusSyncPM §The Keys) is false for any revoked device that holds the password. `rotateRing` derives its key-encryption key from the stored password and appends `wrapForPassword([raw], kek)` (`handlers.ts:177,193`), and `openWithPassword` unwraps every `holder === 'password'` entry (`keyring.ts:40-44`).[^8]

**Fix | TBD**

Two moves are possible: restate the guarantee as hub-enforced for password holders (a doc edit in NexusSyncPM §The Keys and Decision Log D-4), or make a revoke also change the password, with `rotateRing` taking a new password and re-wrapping the whole ring under fresh KDF parameters (the re-wrap B′-1 already describes, though changing a password is deferred today because no channel carries the re-wrap); F-009 is only worth fixing under the second. **Your call:** restate the guarantee as hub-enforced for password holders (a doc edit), or make a revoke also change the password by re-wrapping the ring under fresh KDF parameters.

##### F-009 · After a revoke, other devices keep encrypting new content with the old key.

> **Area:** Sync · **Lens:** Integrity · **Weight:** Low · **Size:** M · **Net:** +8 · **Origin:** Patch-Over

**Finding**

Revoking a device mints a fresh content key so the revoked device can't read anything stored afterward, but only the revoking device's running session switches to it. Every other running device keeps encrypting with the old key, which the revoked device holds, until it restarts or happens to decrypt something sealed under the new key. If the revoking device then goes idle, the others can keep writing under the compromised key indefinitely, so "every store after that uses the new key" (Decision Log D-4) doesn't hold. The hub still refuses the revoked device on every route, so the gap matters only when the hub leaks blobs. `act` sets `running.ring = rotated` for the local session only (`handlers.ts:240-243`), while other devices seal with `newest(session.ring)` (`push.ts:88`), which changes only in `openRecord`'s `unknown-key` catch and at session start.[^9]

**Fix | TBD**

The hub's `pull` reply carries the key record's `version` (it already bumps on every ring append); the session keeps the version its ring came from, and a pull answering a higher one reloads the ring (`reloaded`) before the next seal, so every running device switches within one 25-second poll. **Your call:** this is worth doing only if revocation stays cryptographic under the call in F-008.

##### F-010 · A non-owner device's Revoke changes the encryption key, then fails, cutting the other device off.

> **Area:** Sync · **Lens:** Defect · **Weight:** Medium · **Size:** S · **Net:** +4 · **Origin:** Drift

**Finding**

Pressing Revoke on a device that isn't the Nexus owner changes the encryption key and then fails, leaving the target device approved but unable to read anything written afterward. Every approved device that holds the Nexus password sees a Revoke button on every other device; on a non-owner it first mints a new key and adds it to the hub's key ring for everyone except the target (any editor may), then asks the hub to revoke, which only the owner may do. The target never gets the new key, so once anything is written under it, every pull fails and the target stops receiving changes with no path to recover. `act` never checks this device's role before `rotateRing` appends under the editor-level `ring` route (`handlers.ts:230-237`), the owner-only `revoke` then fails with 404, and on the target `loadRing` returns only its device-wrapped entries, which lack the new key, so `decryptItem` throws `unknown-key` on every poll.[^10]

**Fix | Literal**

In `act('revoke')`, refuse before rotating unless this device's row in `devices` has `role === 'owner'`, and hide Revoke in `NexusRows` for non-owners from the same listing.

##### F-011 · A device revoked while the app was closed thinks it's waiting for approval and never drops its keys.

> **Area:** Sync · **Lens:** Divergence · **Weight:** Low · **Size:** S · **Net:** 0 · **Origin:** Drift

**Finding**

A device revoked while the app was closed shows "Waiting for approval from another device", keeps its password and key ring in the keychain, and polls the hub every minute forever. Whether this device has been revoked is worked out in three places, three ways: a running session concludes "revoked", stops, and forgets its keys; the settings panel concludes "revoked" but only in its reply; and session start reads the same answer as "waiting for approval" and retries. A revoke deletes the membership row so every gated route answers 404 `not-found`, which `withKeys` treats as pending and retries (`session.ts:183-189`) while `pullWait` and `state` each test it with their own condition (`pull.ts:74-76`, `handlers.ts:124`).[^11]

**Fix | Proposed**

Add one `isRevoked(host, nexusId, outcome)` in `keyring.ts` (404 `not-found` with a cached device ring), used by `pullWait`, `state`, and `withKeys`, where it runs `forgetKeys` and sets the `off/revoked` status instead of retrying. A wiped hub answers 401 for an unknown signer, so the shared check doesn't misfire on F-003's scenario.

##### F-012 · Renaming a device that was removed from a Nexus quietly asks to join it again.

> **Area:** Sync · **Lens:** Defect · **Weight:** Low · **Size:** M · **Net:** +12 · **Origin:** Shortcut

**Finding**

Renaming a device that was revoked from a Nexus puts it back in the owner's device list as a new request waiting for approval. Renaming tells the hub the new name by re-sending the full `connect` request, which also asks to join the bound Nexus, and a revoked device keeps its binding. The Cross-Device Mutation Checklist records "rename re-sends connect" as intended, but the re-join side effect isn't mentioned anywhere. `sync:renameDevice` calls `connect` with the bound `nexusId` (`handlers.ts:271`), and since a revoke deletes the membership row, the hub's `addMembership` with `ON CONFLICT DO NOTHING` inserts a new pending row.[^12]

**Fix | Proposed**

Add a `rename` route to the one route table (`wire.ts` `RouteTable`, `canonical.ts` `ROUTES`, `Sync/wire.ts` `PATHS`/`META` with `requires: 'none'`) that only calls `upsertDevice`, and have `sync:renameDevice` use it instead of `connect`.

##### F-013 · Changing History Timeframe in Settings never reaches the sync hub.

> **Area:** Sync · **Lens:** Defect · **Weight:** Low · **Size:** M · **Net:** +12 · **Origin:** Drift

**Finding**

The hub learns the Nexus's History Timeframe only once, when the first device binds, so changing it later in Settings never reaches the hub. If the user lengthens it, the hub still deletes old versions on the original schedule, contrary to Decision E-3's rule that hub retention "follows the Nexus's History Timeframe". A search for `history_days` in `Sync/Store` finds the table definition, `insertNexus`, the row read, and the retention read but no update statement, and the route table has no route that could carry one.[^13]

**Fix | TBD**

Carry `historyDays` on the `ring` route body, or as an owner-gated field on `info`, and write it with an `UPDATE nexus SET history_days`. The client sends it when a `settings.json` change moves `historyDays` (the `SETTINGS_REL` branch in `session.ts:137` already reacts to that file).

#### W3 · Tables and Cells

The table widget, its React grid, and the cell editor carry one cross-table corruption, a whole-table parse on every keystroke, a whole-grid redraw on every drag move, and the residue of the first table design. F-014 lands first; F-019, F-017, and F-016 then rewrite `MarkdownTable.tsx` and `widget.tsx` in one pass, in that order. Landing this makes each table write land in its own table and bounds a table's typing and dragging cost to the edit.

##### F-014 · A checkbox or link action in a table cell you haven't entered writes into a different table once a table is inserted above it or the tables are reordered.

> **Area:** MarkdownPM · **Lens:** Integrity · **Weight:** High · **Size:** S · **Net:** +1 · **Origin:** Shortcut

**Finding**

When a page has two tables and a new table is added above one of them, or the tables are dragged into a new order, clicking a checkbox in a cell of the lower table, or choosing a link action from its menu, rewrites a cell in the table above, and the table that was clicked stays unchanged. Nothing warns. Each table's React component hands every resting cell a commit function that captures the table's index in the document, and `StaticCell`'s memo compares only the text, the link style, and the page context, so a cell whose text didn't change keeps the function from an earlier render. When the indices shift, CodeMirror reuses the widget's DOM and `updateDOM` re-renders `MarkdownTable` with new callbacks; each unchanged `StaticCell` skips that render and keeps committing through the old index, and the paired `onSettled` refreshes the wrong table too. Reproduced in a real editor: inserting a table above table B reused B's node, and clicking B's checkbox checked the new table's cell while B stayed unchanged. Deleting a table above recreates the DOM, so that direction writes correctly.[^14]

**Fix | Literal**

In `MarkdownTable.tsx`, `cell()`'s `StaticCell` branch reads `onCellCommit` and `onSettled` through one `useLatest` (already imported, and already the way `geomRef` is read); row and column are positional and stay captured. `CellEditor` already reads its commit through `useLatest`, so an entered cell is unaffected. The regression test sits beside the resting-checkbox test in `Tables/cellLists.test.tsx` (`cellStatic.test.tsx` mounts the table with no editor, so it can't show the bug): `toggles a resting checkbox in its own table after a table is inserted above it` inserts a table above, clicks the lower table's checkbox, and compares the whole document with `toBe`, since the corrupted document also contains `- [x] b` and a `toContain` passes on both. At HEAD it fails with `- [x] n` in the upper table; restoring the captured `onCellCommit` turns it red. When F-019 lands after it, `onSettled` is required and the `useLatest` read drops its `?.`.

##### F-015 · Typing in a table cell re-reads the whole table as Markdown on every keystroke, and big tables lag.

> **Area:** MarkdownPM · **Lens:** Hot Path · **Weight:** Medium · **Size:** M · **Net:** +3 · **Origin:** Residue

**Finding**

Every character typed into a table cell makes the editor re-check the entire table by running the full Markdown parser over it, and the parse grows faster than the table. Typing unique text mid-table measured `rescan` at 27.8 ms for 200 rows and 256 ms for 1,000, with micromark alone at 12.7 and 134 ms, which is visible lag. The incremental scan re-reads only the lines around an edit, but `quietAt` accepts only the line above a blank, a heading, a break, or a list line, so a table row is never a place to stop: `rescan` widens to the whole table, and `tableRegions` grabs the contiguous non-blank block and confirms it with `isTable`, one parse of all its text, shrinking line by line while that parse fails. `isTable` remembers results by text through `perText`, and its own comment notes that a table being typed in mints one entry per keystroke, so every keystroke misses. `CellEditor`'s listener commits each cell keystroke into the page, which steps the scan.[^15]

**Fix | Literal**

`regions.ts` keeps the two-line `isTable` parse that confirms header plus delimiter, then extends the body line by line through `endsBody`: a blank line ends it, and a line that passes the lexical prefilter `MAY_OPEN` (a superset of every block opener's first characters) ends it when `opensBlock`, one parse of `| a |\n| - |\n<line>` remembered per line through `perText` at a cap of 4096, yields more than one block. The whole-block confirm and the shrink loop are deleted. This is the prefilter-then-cached-parse pattern `isHeadingLine` and `isThematicBreakLine` already follow; per-line facts the scan holds can't answer it, since `tableRegions` runs before the scan derives headings, quotes, breaks, and references, and the facts it derives later differ from the table extension for an unpaired fence, a `*` item, a bare `-` or `1.`, a `<span>`-led row, a footnote definition, and indented code. Table extents don't change. The `rescan` window still spans the table, so what remains per keystroke is the linear line scan with no micromark parse: 0.3 ms at 200 rows and about 2 ms at 1,000, and a cold open of a 1,000-row table whose every row is digit-led and unique, the worst case, costs about 80 ms once. HEAD's whole-table parse also throws under the development export condition (a `devlop` assertion in `mdast-util-gfm-task-list-item`) on a body holding an empty list item followed by a `[ ] task` line, which crashes `scanDoc` in `npm run dev`; the new path never parses two body lines together. A seeded property in `Engine/Tables/regions.test.ts`, `a table body runs exactly as far as the whole-table parse reads it`, checks over 2,000 seeds that each region's text parses as one table and that the region plus its next non-blank line doesn't; reverting `endsBody` to blank-only, or dropping any opener class from `MAY_OPEN`, turns it red within 69 seeds. The halves of `codec.test.ts` and `parser.test.ts` that *§Appendix: MarkdownPM Test Dispositions* moves or deletes land in the `regions.test.ts` this extends. The property's seeded `stream` generator is the one `Engine/docScan.test.ts` already holds, shared from a test helper rather than copied.

##### F-016 · Dragging a table row, column, or column edge redraws the whole table on every mouse movement.

> **Area:** MarkdownPM · **Lens:** Hot Path · **Weight:** Low · **Size:** S · **Net:** +4 · **Origin:** Parallel Build

**Finding**

While a row or column is dragged, the whole table component redraws on every pointer move, 60 or more times a second (every row, every cell's classes and transform, every grip), because `MarkdownTable` holds the pointer's exact offset in React state; resizing a column does the same through `setResize` on each move. Large Markdown tables drag less smoothly than they need to as a result. The collection table view solves the same problem by writing the offset to a CSS variable and setting state only when the drop slot changes. Profiling the real `MarkdownTable` recorded one full table commit per pointer move (20 moves inside one slot gave 20 commits), with render time growing with cell count, while `useColumns.ts`'s `startColumnDrag` writes `--col-drag-x` per move and calls `setColDrag` only when `to` changes. `trackHover` also calls `setHover` on each cell crossing, read only for the grips' reveal.[^16]

**Fix | Literal**

React state keeps the slot and the activation: `Drag` becomes `{ axis, from, to }` and `resize` becomes the boundary index. The pointer's offset and the two resize widths move to CSS variables on the table wrap: `startDrag`'s `resolve` writes `--tbl-drag` and `shift` reads it in the dragged row's or column's transform, and `startResize` writes `--tbl-left` and `--tbl-right` at activation and on each move, which `colWidth` reads for the boundary pair. `setDrag` fires only at activation and when the slot changes, and `setResize` only at activation and at the end. Each variable is written at activation before anything reads it and stays after the drop, so the subject holds its drop offset until the reorder's new model clears the drag, the same frame HEAD's state held it, with no snap-back. Hover stays React state: the grips are absolutely positioned siblings of the `<table>`, laid out from the geometry, so no selector relates the hovered cell's index to its grip without one generated rule per index; the update already fires once per cell crossing, and every `StaticCell` is memoized, so a crossing re-renders only `MarkdownTable`'s shell, while the imperative alternative (about +4) would split `data-reveal-host` between React and a handler. Behavior is unchanged; `dragOrigin.test.tsx` and the `Tables` suite pass unchanged, and a per-move render count would need a commit-counting profiler rather than a test. Lands in the same `MarkdownTable.tsx` pass as F-019 and F-017, after them.

##### F-017 · A table cell shows `NaN` for a footnote whose label holds `=` or `;`, and marks a `[x](#Heading)` link to an existing heading as missing.

> **Area:** MarkdownPM · **Lens:** Defect · **Weight:** Low · **Size:** S · **Net:** +1 · **Origin:** Shortcut

**Finding**

If a page cites `[^a]` and also `[^a=b]`, a table cell citing `[^a]` shows `NaN` instead of `1`, and `[^a=b]` draws unnumbered. The table's page context travels as a string: `citeKey` encodes the footnote entries as `LABEL=n;…` for the widget's equality key, and `MarkdownTable` splits that same string on `;` and `=` to rebuild the ordinals. The label grammar admits both characters, so `A=B=2` decodes as label `A` with ordinal `Number('B')`. The encoding isn't injective either: the label sets {`X`→1, `A=1;B`→2} and {`X=1;A`→1, `B`→2} both encode as `X=1;A=1;B=2`. Beside it, a `[x](#Setup)` in a resting cell draws as a missing heading even when `## Setup` exists, because `pageKey` and the decoded `ownKeys` include the page's headings only when the table text holds `[[#`, so `headingMissing` reads an empty outline; probed through `cellHeadings.test.tsx`'s harness.[^17]

**Fix | Literal**

`widget.tsx` gains `cellPage(doc, text)`, which builds the `CellPage` from the scan's citation entries and `docHeadingKeys` and holds one object per page key in a 16-entry `capSet`-bounded map, so `ordinalOf` changes identity exactly when the numbering or outline does. That object is the widget's equality: `TableWidget.page: string` becomes `around: CellPage`, compared by identity in `eq`, in `rebuiltTable`'s skip, and in the page-context recheck; `MarkdownTable` and `StaticCell` drop the `page` prop, the decode in `MarkdownTable.tsx` is deleted, `StaticCell`'s memo compares `a.around === b.around`, and `CellEditor`'s existing `[ordinalOf]` nudge fires exactly on a context change. The key string survives only as the map key, joined as `label ordinal` pairs with spaces, which labels never hold, so it is injective. A context evicted and rebuilt under the same key gets a new identity, which costs its table one redraw. `cellPage` tests the text against `/\[\[#|\]\(#/` and `StaticCell`'s memo regex gains `\]\(#`, so a Markdown self-heading link reads the outline (±0). Holding a string beside the object instead counted +13. The red-first test in `Tables/cellHeadings.test.tsx`, `reads the number a label holding = or ; leaves beside it`, mounts `x[^a] y[^a=b]` with a table citing both and expects the glyphs `1` and `2`; at HEAD React warns `Received NaN for the children attribute`, and rebuilding `around` by splitting the key turns it red. A second case in the same file pins the self-link: `## Setup` above a cell holding `[x](#Setup)` draws no missing mark. `cellStatic.test.tsx` and `widget.test.ts` move from `page` strings to `CellPage` values. Lands after F-019, so the six table suites F-019 gives stubs take an `around` stub in place of its `page` stub.

##### F-018 · A table cell being edited replaces its whole text when new text arrives from elsewhere, throwing a mid-cell caret to the start.

> **Area:** MarkdownPM · **Lens:** Duplication · **Weight:** Low · **Size:** S · **Net:** −5 · **Origin:** Parallel Build

**Finding**

When an entered cell receives text from outside (an undo forwarded to the page, a row or column reorder, a sync from another mount), it replaces its entire document instead of only what changed, so the caret jumps to the cell's start. The editor already has one way to land outside text that keeps the caret: `mirrorBody` dispatches the changed span under the `mirrored` annotation with `filter: false`, out of undo history, and TextPane uses it. `CellEditor`'s `[initial]` effect instead dispatches a whole-document replace under its own `silentEdit` annotation, which its listener skips to keep the landing from echoing back into the page. A test that seats the caret mid-cell and re-renders the table with the cell grown reads the caret at 0.[^18]

**Fix | Literal**

Keep the `cellToSource` guard, folded to two lines, and call `mirrorBody(view, initial)` behind it; the cell's listener skips `mirrored` transactions, and `silentEdit` is deleted. `filter: false` skips the cell's one transaction filter, the paste filter, which a landing must skip anyway; `mirrored` is otherwise read only by page-level listeners a cell doesn't install; and the cell forwards undo and redo to the page, so keeping the landing out of the cell's own history changes nothing a person sees. Two tests in `Tables/cellNavigation.test.tsx` pin it: `keeps a mid-cell caret where it stood` reads 0 at HEAD and turns red when the whole-document replace returns, and `and never commits the landing back into the page` turns red when the listener stops skipping `mirrored`. The test blurs the cell before landing, since jsdom lays nothing out and a focused view reads its selection back as 0 after any redraw. It reads the same before and after F-030 adds `mirrorBody`'s `echo` parameter, since that parameter defaults off.

##### F-019 · The table components carry optional props, clipboard pass-throughs, and payload checks that only tests or nothing at all need.

> **Area:** MarkdownPM · **Lens:** Dead Weight · **Weight:** Low · **Size:** S · **Net:** ≈ −9 · **Origin:** Residue

**Finding**

Ten `MarkdownTable` props are optional with `?.` calls throughout, though `TableWidget.render`, the one production render site, passes all of them. `onCopyText` and `readClipboard` only wrap `host.clipboard`, which the component already receives. `payload.kind !== 'table'` is checked at two call sites, though `fill` already maps a table payload to an unchanged model and `structuralEditChange` skips a no-op serialization. `CellEditor`'s props and `StaticCell`'s (`around`, `linkStyle`, `readOnly`), each rendered only by `MarkdownTable`, follow the same pattern, as does the `connections` getter all three take. `tableWidgetExtension(connections?)` keeps a `: []` branch and a `() => undefined` facet fallback, and `buildWidgetDecorations` reads `state.facet(editorHost)?.`; only `widget.test.ts` and `headingColRemap.test.ts`, which build states with no host and no getter, reach them.[^19]

**Fix | Proposed**

`MarkdownTable`'s props become required (`headingColumn` without its default) and lose their `?.`; it calls `host.clipboard.write` and `read` itself in place of `onCopyText` and `readClipboard`, and both payload checks go, so the cell's paste handler is `onFill(row, col, payload)`. In `widget.tsx`, the two pass-through props go, `toClipboard` inlines into the table menu's copy, `TableWidget.linkStyle` loses `undefined`, and `buildWidgetDecorations` reads the host facet without `?.`. `CellEditor`'s `onTablePaste`, `caretCoords`, `initialSelect`, `sweepFrom`, and `ordinalOf` become required (the three seats stay `| null`), and its paste filter drops the `!onTablePasteRef.current` clause; `StaticCell`'s `readOnly?.()` calls become `readOnly()`. The `connections` getter becomes required on all three components and on `tableWidgetExtension`, which loses its `: []` branch and the facet's fallback; moving the getter onto the host waits with F-094. Behavior is unchanged. `Core/Testing/editorHarness.ts` gains `tableStubs`, every `MarkdownTable` prop but `host` and `model` as a table that writes nowhere; the six suites that mount the table with partial props (`cellNavigation`, `dragOrigin`, `cellSweep`, `cellLinks`, `cellAlias`, `cellStatic`) spread it, `cellSweep`'s clipboard tests hand their spies to the host, and the two widget suites seat `editorHost.of(testHost())` and pass `() => undefined` as the getter. The net is an estimate: the typed form counted −9 with the getter already deleted by F-094's change, and making it required changes lines without changing their count. Lands after F-014 and before F-017 and F-016 in one pass over `MarkdownTable.tsx` and `widget.tsx`, and its test edits share the six table suites with F-072 and F-073, so each file is opened once.

##### F-020 · A table row's cells and the delimiter row are wrapped in one-field objects every reader unwraps immediately.

> **Area:** MarkdownPM · **Lens:** Dead Weight · **Weight:** Low · **Size:** S · **Net:** −7 · **Origin:** Residue

**Finding**

The table code wraps each cell's text in a `{ text }` object (`CellSpan`) and the delimiter's columns in `{ columns }`, both left from the first table design. Every reader takes the field straight out: `regions.ts`'s `modelFromRegion`, `widget.tsx`'s `headerKeyOf`, `clipboard.ts`'s `decodePayload`, `subfieldStats.ts`'s `tableProse`, `sync.ts`'s `cellCommitChange`, and the test builder `parseTable`.[^20]

**Fix | Literal**

`splitRow` returns `cells: string[]`, and a region carries `columns: Column[]` in place of `delimiter: { columns }`. `modelFromRegion` hands the scan's own arrays to `normalize`, which copies every row through `fitRow`, and `columns` was already shared by reference. Behavior is unchanged; four assertions in `codec.test.ts`, `regressionPins.test.ts`, and `regions.test.ts` change shape. The `sync.ts` line after the rewrite hand-spells `pipeRow`, F-068's item, and can land with it, and F-045's bound on `tableProse` is written against the plain `cells` array.

##### F-021 · An entered table cell parses its own text twice per keystroke.

> **Area:** MarkdownPM · **Lens:** Hot Path · **Weight:** Low · **Size:** S · **Net:** +1 · **Origin:** Shortcut

**Finding**

Every keystroke in a cell runs the full Markdown parse of that cell twice: once for drawing, and once more in `cellCitations`, whose plugin re-runs `marks` on every document change, and `marks` runs `tokenize` on the whole cell just to find footnote markers that usually aren't there.[^21]

**Fix | Literal**

`marks` returns `Decoration.none` when the cell's text holds no `[^`. Behavior is unchanged, and the two `cellStatic.test.tsx` cases that number a marker inside an open cell keep the positive path pinned.

##### F-022 · On every page edit, the table widget field rebuilds its page-context keys even when the page has no tables.

> **Area:** MarkdownPM · **Lens:** Hot Path · **Weight:** Low · **Size:** S · **Net:** +1 · **Origin:** Shortcut

**Finding**

With no table on the page, every keystroke still joins the footnote and heading keys, only to iterate an empty decoration set. The outline itself is already derived every version by the decoration build through `docHeadingKeys`, so the widget adds two string joins per keystroke, not a heading walk.[^22]

**Fix | Literal**

`widgetField.update` returns `deco` when it is empty, right after `editAffectsTables` declines and before the set is mapped. `editAffectsTables` returns true whenever a delimiter sits within a line of the edit, which is the only way a table appears on a page that had none, so nothing past the guard can produce a widget. Behavior is unchanged, and `widget.test.ts` passes as it stands.

#### W4 · Footnotes and Guards

The citations section is the document's tail, and every edit near it passes a guard and a renumber. One defect of that pair hands a marker the wrong footnote, and a repaired keystroke leaves the caret behind; the rest remove residue of a deleted guard, bound a per-keystroke string build, and fold a second copy of the editor's whole-body write. Landing this makes footnote numbering and typing near the section follow what the person did.

##### F-023 · A footnote renumber hands an orphaned marker's number to a different footnote, so that marker silently reads someone else's text.

> **Area:** MarkdownPM · **Lens:** Defect · **Weight:** High · **Size:** S · **Net:** +1 · **Origin:** Shortcut

**Finding**

If the body holds a footnote marker with no citation row (one whose row was deleted, or that arrived in a paste), the next renumber can give that marker's number to another footnote. The orphan then points at the wrong citation, and nothing on screen says so; one undo reverts it. `normalizeCitations` builds its `held` set (the numbers it may not rename onto) from loose citation rows only. An orphaned marker has `ordinal: null`, which the scan assigns exactly when no row carries its label, so it never enters the set, and a placed row whose first-use ordinal equals the orphan's label is renamed onto it, taking every marker of that row along. Reproduced two ways in a mounted editor: Insert ▸ Footnote after `Body a[^1] b[^2] c` with only `[^2]: two` defined gave `a[^1] b[^1] c[^2]` with `[^1]: two`, so the orphan now reads "two"; Lists ▸ Bullet over a selection reaching into row 1 turned that row into prose, orphaned its marker, and renamed `[^2]` onto it.[^23]

**Fix | Literal**

After `held` is built in `normalizeCitations`, add the numeric labels of unbound markers (a marker with `ordinal === null` and a `numericLabel`), so an unbound marker keeps its number the way a word-labeled loose row already does. Both reproductions come out unmerged and an ordinary reorder still renumbers; pages already merged by this stay as written. Two tests join the `normalizing the section` describe in `citationEdits.test.ts`, "never renames a row onto the number an unbound marker still holds" and "and a row turned to prose leaves its marker that number too", each checking the renumber leaves the document unchanged; both are red without the added line. The `shadowed` exemption beside it is the same idea built a second way, and can fold into this hold.

##### F-025 · When a guard repairs a keystroke the caret is left behind, so text typed below the footnotes section breaks into one-character lines, and typing over a callout line's start replaces each character with the next.

> **Area:** MarkdownPM · **Lens:** Defect · **Weight:** Medium · **Size:** S · **Net:** +11 · **Origin:** Shortcut

**Finding**

On a blank line below the footnotes section, typing `ab cd` lands in the body as four separate lines, `a`, `b`, `c`, `d`. If a selection on a callout body line starts at the line's beginning and is typed over, every key replaces the character before it, so `xyz` leaves only `z`. Typing over the blank line just above the section loses characters too: `xy` becomes `body\ny\n[^a]: first`. All three come from one cause: `verdictFilter` rebuilds a repaired transaction from its changes, effects, scroll flag, and annotations, but not its selection, so CodeMirror maps the old selection through the new changes. A relocated character lands in the body while the caret stays below the section, so the next key is relocated again as its own line; a clamped replace keeps the old anchor at the line start, so the new selection covers the hidden `> ` and the typed character; and in `citationTailVerdict`'s `fromA <= seat` branch the mapped selection covers the typed character and the appended newline, so the next key replaces it. The footnotes case was reproduced through the full page stack; whether a selection's anchor can be seated at a callout line's start by hand is rated Likely. The parenthetical at `citationGuard.ts:14` saying the head seat "stays reachable" is false, since the caret-seat filter moves any cursor off it.[^25]

**Fix | Literal**

The `rewrite` verdict gains an optional `caret`, where typing resumes in the repaired document. `verdictFilter` passes a cursor whenever the incoming transaction set a selection: at the verdict's caret for a rewrite, or at the repaired change's end for a clamp or extend. `citationTailVerdict` sets the caret after the relocated text and, in the `fromA <= seat` branch, after the typed character, so the following keys join that line; the head-start clamp and the whitespace refusal set no caret and keep today's mapping. The false parenthetical at `citationGuard.ts:14` is removed. A repaired transaction that carried several selection ranges now collapses to one cursor; typed input is always one change, which the caret's coordinates assume. Pure state tests type with the selection set: `citationGuard.test.ts` gains "the caret follows the text a repair moves" (typing below the section keeps one body line; typing over the blank line above it keeps both characters), and `calloutGuard.test.ts` gains "the caret follows a clamped replacement" (`xyz` lands whole after the prefix); all three are red without the `selection` line. It lands after F-028 and F-029, since its changes to `verdictFilter.ts` and `citationGuard.ts` are typed on top of theirs. The tightened `prefixSeat.test.tsx:155` value in *§Appendix: MarkdownPM Test Dispositions* is captured after this lands.

##### F-028 · The shared guard shell carries the table's self-edit annotation, but neither guard that uses it ever repairs a table edit.

> **Area:** MarkdownPM · **Lens:** Dead Weight · **Weight:** Low · **Size:** S · **Net:** −9 · **Origin:** Residue

**Finding**

`verdictFilter`'s `carriedAnnotations` copies `tableSelfEdit` onto any transaction it repairs. Its only users are `calloutGuard` and `citationGuard`. A cell commit replaces one cell segment inside one non-blank table row; tables are refused under `>`, so a commit never touches a callout prefix, and a table row sits above the citations tail, so it never leaves the run unreadable. Either way the verdict is `ok` and the carry never fires. It dates from `headingRenameGuard`, which `2dbb0ba2e` deleted.[^28]

**Fix | Literal**

Delete the `tableSelfEdit` carry and its import. What remains of `carriedAnnotations` re-spells `TransactionSpec.userEvent`, so the helper folds into `userEvent: tr.annotation(Transaction.userEvent)` on the repaired spec and the `Annotation` import goes with it. No test changes; `widget.test.ts` dispatches straight to the table field. It lands before F-025, which adds the selection to the same repaired spec.

##### F-029 · The footnote guard builds the whole post-edit document string on every keystroke inside the footnotes section.

> **Area:** MarkdownPM · **Lens:** Hot Path · **Weight:** Low · **Size:** S · **Net:** −3 · **Origin:** Shortcut

**Finding**

Each keystroke in a footnote's text builds a copy of the entire document (`doc.slice(0, from) + inserted + doc.slice(to)`) in `citationTailVerdict` to test whether the run below still holds, though `tailHolds` reads only the tail from the kept head down. `tailHolds`'s empty-tail branch never runs, since an entry line always holds `[^x]:`.[^29]

**Fix | Literal**

`tailHolds` folds into its one caller, which builds only the tail: `doc.slice(keptAt, from) + inserted + doc.slice(to)` when the kept head sits above the change, otherwise `doc.slice(keptAt)`. The line-start check reads the character before the kept head, which is the last inserted character or `doc[from - 1]` only when the change ends exactly at it. No test is added: `citationGuard.test.ts` and `citationBreakage.test.tsx`, which sweeps every key at every seat and offset, pass unchanged. It lands before F-025, which edits the same verdict.

##### F-030 · Renaming a heading rewrites its links through a second hand-written copy of the editor's whole-body write.

> **Area:** MarkdownPM · **Lens:** Duplication · **Weight:** Low · **Size:** S · **Net:** −7 · **Origin:** Drift

**Finding**

Two places hand-write the same "apply a whole new body as a minimal diff, outside undo, past the guards" dispatch: `mirrorBody` in `api.ts` and `headingRenameSettle`'s rewrite. The only difference is that the rename write must echo through `onChange`, so it omits `mirrored`; neither carries a user event, selection, or scroll, and both skip an unchanged body. Editor-Internals reserves `mirrorBody` for landings, and a rename isn't one, so the shared helper takes an `echo` flag rather than the rename calling the landing seam unqualified.[^30]

**Fix | Literal**

`mirrorBody(view, body, echo = false)` writes `mirrored.of(!echo)`, its doc naming the echo case, and the settle calls it with `echo` set, dropping its `changesTo` import. The echo is already pinned: dropping `true` from the settle's call turns two `headingRename.test.tsx` tests red ("a rename pending when the editor turns read-only still moves its own links on blur" and "unmounting with a rename pending settles it…").

#### W6 · Links and the Picker

The link layer runs two pointer handlers in the body where a resting cell runs one, reads the link grammar off bare line text without asking whether it sits in code, spells link syntax by hand in the picker, and reads a copied link one way in Paste As and another in the Link property. Landing this leaves one link hit-test that every gesture's code check and target conversion sit on, and one reading of a copied link.

##### F-033 · Links written inside a code sample still act like links, so clicking, Enter, typing `]`, or leaving an alias slot there edits the code, and an alias typed there is saved onto another page.

> **Area:** MarkdownPM · **Lens:** Defect · **Weight:** Medium · **Size:** S · **Net:** +5 · **Origin:** Shortcut

**Finding**

Link-shaped text inside code behaves like a live link. Pressing inside `[[Alpha]]` in a fence jumps the caret to the link's edge; Enter inside a fenced `[[Alpha|al]]` moves the caret instead of breaking the line; typing `]` there is swallowed; leaving an empty `[[Page|]]` or `[[Page#]]` slot deletes the `|` or `#` from the code, in a fence and in inline code alike; and typing an alias into a fenced `[[Alpha|]]` records it as one of Alpha's aliases, which `rememberAliasNear` writes through `host.aliases.remember` → `wear` → `setPageMeta` into Alpha.md's frontmatter. All five were reproduced.[^33]

These paths read the link grammar off the bare line: the hit-test's `linkTokenAt(line.text, …)` re-tokenizes the line alone and loses fence context, and `commitAliasOnEnter`, `slotNear`, and the `]` refusal in `typedInput` read `linkAt` and `aliasSpanAt` off the raw line, which inline code reaches too. Their siblings (`headingHash`, `autocompleteQuery`, `linkFor`) already ask `inCodeAt` on the scan.

**Fix | Proposed**

Four gates, each `inCodeAt` on the scan the site already holds or on `docScan(state.doc)`, which is a per-document cache: the link hit-test refuses before tokenizing, so the `§`-run fallback is refused in code too; `commitAliasOnEnter` leaves Enter to break the line; `slotNear` returns nothing in code, which covers both `leaveSlot` and `rememberAliasNear`; and `typedInput`'s refusal becomes `]` refused only outside code and inside an alias. `inAliasAt` stays code-blind, since Connections can't take the editor's `DocScan`, so the code check sits at its call site. Aliases already written stay. `linkEdges.test.tsx` gains "a press on one inside a fence is left to the editor", and `linkEdit.test.tsx` gains "an alias written in code is code" (Enter breaks the line, `]` lands, an empty slot keeps its marker in a fence and in inline code, and a fenced alias isn't remembered); each goes red when its gate line is removed. Lands after F-034, whose single hit-test takes the code check once. Its `]` gate lands on `inAliasAt` (F-068), which rewrites the same `typedInput` line, so F-068's alias fold lands first or with it.

##### F-034 · The body runs two near-identical link click handlers where a resting table cell runs one, and every press parses the line four times without a cache.

> **Area:** MarkdownPM · **Lens:** Duplication · **Weight:** Low · **Size:** M · **Net:** −60 · **Origin:** Parallel Build

**Finding**

Clicking, hovering, and right-clicking a link in the body go through two near-identical handlers mounted by `inlineSurface`, `connectionClicks` for `[[…]]` and `markdownLinkClicks` for `[label](target)`, each doing its own coordinate lookup and line parse; a resting table cell already handles both kinds through one `menuTarget`. `pointerHandlers` calls each handler's hit-test on mousedown and again on click, and each calls `linkTokenAt`, which runs `scanDoc` plus a micromark parse of the line with no memo, where the cell reads `cellTokens`, a `perText(tokenize, 4096)`. Confirmed by reading.[^34]

**Fix | Proposed**

One `linkPointer(getApi)` in `linkClicks.ts` replaces both, and `connectionClicks.ts` is deleted. Its hit-test reads any link token with `linkTokenAt(text, rel)` and `tokenTarget`, keeps the `§`-run DOM fallback, keeps each kind's own label selector and the wikilink's ambiguous-title exception, hits a wikilink only where connections resolve, and builds its menu as `cellStatic.menuTarget` does: a wikilink naming a page gets the editable page target through `applyLinkAction`, and everything else goes through `linkMenuTarget` with `applyUrlLinkAction` unless the editor is read-only. `linkTokenAt` reads one `tokensOf = perText(tokenize, 4096)` exported from `tokens.ts`, which the cell's `cellTokens` folds into. `pointerHandlers` then serves three handlers instead of four. The two appliers keep their own span preludes, since a shared one measured +8. Behavior is unchanged, and the `linkEdges`, `connectionHover`, `mdLinkTarget`, `externalLink`, `linkEdit`, `linkFormat`, `textScope`, and `cellLinks` suites pass with no assertion changed. Lands after F-054, which threads `scope` into `connectionClicks.ts`: the fold takes it as `linkPointer(getApi, scope)` calling `linkTokenAt(line.text, rel, undefined, scope === 'page')`, and the resting cell keeps F-054's derived token memo, so the net becomes −58. F-033's code check and F-038's `heldTarget` land on this hit-test.

##### F-035 · Retargeting a labelled link in the `[[` picker can write a label that repeats the page name, such as `[[Bar|Bar]]`, because the picker spells link syntax by hand.

> **Area:** MarkdownPM · **Lens:** Duplication · **Weight:** Low · **Size:** S · **Net:** +5 · **Origin:** Drift

**Finding**

Choosing page Bar in the picker for `[[Foo|Bar]]` writes `[[Bar|Bar]]`, a label that only repeats the title. `formSyntax` in `autocomplete.ts` spells `[[value|alias]]` itself instead of calling `connectionText`, which drops an alias equal to the title, and `useConnectionAutocomplete`'s commit reads the worn alias through a raw `pageLinkPattern()` match instead of Connections' reader. Reproduced by test.[^35]

**Fix | Literal**

`formSyntax` returns `connectionText(value, alias)`, and the alias read goes through `parseConnectionText`. The two slot openers in `commitEdit` (`[[value#]]`, `[[value|]]`) stay hand-spelled, since `connectionText` can't write an empty slot. `parseConnectionText` trims the alias, so `[[Foo| Bar ]]` retargeted with Remove Title On Link Change off now carries `Bar`. `autocomplete.test.ts` gains "drops a carried alias that only repeats the new title", red without the fix. The net is +1 before Biome wraps the widened import onto six lines.

##### F-036 · Where a markdown link's address starts and ends is calculated in two places.

> **Area:** MarkdownPM · **Lens:** Duplication · **Weight:** Low · **Size:** S · **Net:** +4 · **Origin:** Parallel Build

**Finding**

`linkTarget` in `Engine/tokens.ts` and `linkHalves().address` in `Links/linkFormat.ts` both compute a markdown link's address span as `[close[0] + 2, close[1] - 1]`. Confirmed by reading.[^36]

**Fix | Literal**

`linkHalves` moves into `tokens.ts`, since the Engine can't import `Links/`, and `linkTarget` slices its `address`. `cellStatic.tsx` imports `linkHalves` from `tokens.ts`. The `linkFormat`, `cellLinks`, `mdLinkTarget`, and `tokens` suites pass unchanged. The change itself is −3; Biome wrapping `cellStatic.tsx`'s widened import onto eight lines makes it +4.

##### F-037 · Which look a markdown link wears is decided twice, once for the live editor and once for a resting table cell.

> **Area:** MarkdownPM · **Lens:** Duplication · **Weight:** Low · **Size:** S · **Net:** −2 · **Origin:** Parallel Build

**Finding**

The mapping from a markdown link's target (a page, a heading on the same page, a website, or nothing) to its classes is written once in `decorations.ts`'s `build` and again in `cellStatic.tsx`'s `renderCellContent`, which draws it as two separate spans. The differences between the two renderers (`md-unresolved-fixed` in the cell, `md-connection-open` while the caret reveals a link in the body) are deliberate. Wikilinks already share one mapping through `wikiLinkView`, which answers `status`, `bare`, and `missing` for both renderers. Confirmed by reading.[^37]

**Fix | Literal**

One `mdLinkClass(conn, target, ownKeys)` beside `MD_LINK_CLASS` in `decorations.ts`, a switch over the target's kind that both renderers read; it takes the connections and the surface's own heading keys, since the missing-heading class needs both. `build` adds `md-connection-open` for an active internal link, and the cell adds `md-unresolved-fixed` for an invalid one, so the cell's two spans become one. The `mdLinkTarget`, `externalLink`, `cellLinks`, `aliasRender`, and `textScope` suites pass unchanged.

##### F-038 · In a Text value's editing pane, a same-page heading link like `[[#Setup]]` opens on click but shows no preview on hover and no menu on right-click.

> **Area:** MarkdownPM · **Lens:** Defect · **Weight:** Low · **Size:** S · **Net:** 0 · **Origin:** Drift

**Finding**

In a Text property's editing pane, `[[#Setup]]` opens its holding page when clicked but raises no glance on hover and no menu on right-click; the same value at rest does all three. Only the click path reaches `heldTarget`, through `resolveFollow`; hover passes the raw `self` target, for which `dwellTarget` returns nothing, and the menu requires a `page` target. The resting `TextCell` applies `heldTarget` for all three. Reproduced by test.[^38]

**Fix | Literal**

The link hit-test wraps its target in `heldTarget(…, ownPage(view))`, so hover, click, and menu read the same converted target. `ownPage` answers the holding page only for a Text value's pane, so a cell's `[[#Heading]]` stays `self` and still travels in place; `resolveFollow` keeps its own `heldTarget` call for resting cells, `TextCell`, and `citationPointer`, and the `§`-run fallback isn't converted. The pane's menu is the editable page menu (Add Title, Edit Link), as for every wikilink in an editable editor, where the resting value's is display-only. `textScope.test.tsx` gains "a bare heading in a Text value's pane acts as the resting value does" (hover raises the holding page's glance, right-click opens its menu), red without the wrap. Lands on F-034's single hit-test.

##### F-039 · Paste As writes link syntax inside code, where a plain paste lands the address as literal text.

> **Area:** MarkdownPM · **Lens:** Defect · **Weight:** Low · **Size:** S · **Net:** −3 · **Origin:** Drift

**Finding**

Pasting a web address inside a code block leaves it as plain text, as MarkdownPM.md states; choosing Paste As writes `[example.com](…)` into the code instead. In `pasteLink.ts`, `linkFor` refuses through both `destinationGuard` and `insideCodeAtCaret`, while `pasteAs` checks only `destinationGuard`. Reproduced by test.[^39]

**Fix | Literal**

One `literalAt(view, pos)` replaces `destinationGuard` and `insideCodeAtCaret`, answering for a code span, a fence, and another link's destination, and both `linkFor` and `pasteAs` ask it, so every Paste As form picked in code lands the clipboard literally. Paste As ▸ Footnote at a caret on an inline-code span's closing edge, the one code seat where the menu still offers it, now lands plain text too. `pasteLink.test.tsx` gains "Paste As lands literal inside a fenced code block too", red without the fix, and deletes "writes nothing on a blank line inside a fence", whose Embedded Link refusal the new test's branch now covers. F-072's rows citing `pasteLink.test.tsx` re-anchor after that deletion.

##### F-041 · The `[[Page#` heading list reads another page from a copy that lags typing, and on a miss its disk read overwrites the newer text the app holds for that page.

> **Area:** Pages · **Lens:** Divergence · **Weight:** Low · **Size:** S · **Net:** −3 · **Origin:** Drift

**Finding**

Typing `[[B#` lists B's headings from `warmBody`, which reads B's slot in the main tab's store; that copy lags typing by 120 ms and doesn't exist for a page open only in a window, tile, or glance. In those cases the host re-reads B from disk through `fetchBody`, which misses typing still waiting to save, and the fetched detail then replaces the newer text the session holds for B through `cachePageDetail` → `seat`, where `pageDetailCache.ts` keeps `knownBody` written through before the save's debounce precisely so it never lags a pending write. The downstream effect on a remounting tile is rated Likely. Reproduced by test.[^41]

**Fix | Literal**

`warmBody` reads `knownBody(page.path) ?? null`, and `api.ts`'s comment on it says the body includes a write still waiting to save. `editorHost.test.ts` gains "the warm body a heading list reads" ("is the session's newest text for the page, saved or still waiting to save"), red without the fix.

##### F-042 · Paste As turns a copied web link into a link to a page that doesn't exist and drops a copied link's alias and heading, because it reads copied links its own way.

> **Area:** Connections · **Lens:** Defect · **Weight:** Medium · **Size:** M · **Net:** −14 · **Origin:** Drift

**Finding**

Copy `[x](example.com)` from the body, where it draws and clicks as a website, then Paste As ▸ Connection: it writes `[[example.com]]`, a link to a page that doesn't exist. Copy `[[Notes|Alias]]` and Paste As ▸ Connection writes `[[Notes]]`, losing the alias; copy `[[Notes#Setup]]` and Paste As offers nothing. The Link property reads the same clipboard its own way: it keeps a connection's alias and heading but refuses `[x](example.com)`. Reproduced by probe.[^42]

Paste As classifies through `pasteAsTarget` and `wholeWikiLink`, which refuse any heading, read a markdown link's title-shaped target as a page, and return a `PasteAsTarget` carrying only a title; the Link property classifies through `parsePastedLink`. The editor's `resolveMdTarget` already reads an unresolved schemeless target as a website. MarkdownPM.md:107 promises Connection, Markdown Link, and Embedded Page for "a copied connection or markdown link".

**Fix | Proposed**

One `readPastedLink(text, resolve?)` in `Core/Connections/linkValue.ts` returns the existing `LinkTarget` (a page with title, heading, and alias, or an address with its alias), and `parsePastedLink`, `pasteAsTarget`, `PasteAsTarget`, and `wholeWikiLink` go. A whole connection reads as its page with heading and alias; a markdown link's page-shaped target reads as a page with its fragment as the heading and its label as the alias; a bare string is never a page; and with a resolver, a target no page answers to reads as the address when it is one. `pasteAsWrite` writes `connectionText(title, alias, heading)` for Connection, and for Markdown Link the encoded `title#heading` target under the label `alias ?? heading ?? title`; Embedded Page is withheld for a heading-qualified page, since `pageEmbedText` has no heading; Embedded Link writes `composeWebpageEmbedLine(target.alias ?? '', url)`, so a copied link's label carries into the embed the way it carries through every other conversion. `resolveMdTarget` stays the editor's adapter, since deriving it from the classifier would resolve twice per decorated link.

Paste As rows are built in Desktop main, where `editorMenu.ts` reads the clipboard in the right-click's own turn and no page index is reachable (`treeIndex.ts` imports UIX components), so Paste As classifies without a resolver on both the row and write sides, and only the Link property passes one. Without a resolver a page-shaped target that is also a valid address reads as the address, so `[x](Notes.md)` offers address rows where the editor draws a page link. An unresolved `[[Nowhere]]` still offers Connection and Markdown Link, since it is already connection syntax. The Link property now stores `[x](example.com)` as the address `[x](https://example.com)`, and a markdown link with an empty label pasted into a Link value keeps the value's current alias, as a bare address does. MarkdownPM.md:107 becomes "a copied connection, or a markdown link naming a page, offers Connection and Markdown Link, keeping its label and heading, and Embedded Page where it names no heading; a markdown link whose target is a web address offers what an address does", and PropertiesPM.md:83 adds that a markdown link whose target no page answers to stores as the address it is. `pasteAsMenu.test.ts` gains "a copied link becomes what the editor reads it as" (an address's forms for a schemeless address target, the alias and the heading kept through a conversion, and a heading-qualified connection's rows short of an embed), red without the fix, and its 16 `pasteAsTarget` calls become `readPastedLink`; `linkValue.test.ts` gains "what a copied link names", and its existing assertions pass untouched. F-071's pass over MarkdownPM.md keeps this fix's :107 sentence. `composeWebpageEmbedLine` keeps its `label`, which this gives a production caller, and its doc comment drops the claim to be the only assembly path, since `embedInsert.ts` writes `![]()` itself.

##### F-043 · Format ▸ Page Title on a link in a resting table cell writes the bare domain and never swaps the page title in.

> **Area:** MarkdownPM · **Lens:** Defect · **Weight:** Low · **Size:** S · **Net:** +23 · **Origin:** Drift

**Finding**

In a table cell that isn't being edited, right-click an address, pick Format ▸ Page Title, and the link becomes its domain; when the title arrives, nothing rewrites the cell. In the body the same action swaps the title in: `applyUrlLinkAction` dispatches with `awaitTitle` and `pendingTitle` swaps pending ranges, while the resting cell's `linkActionText` → `onCommit` → `host.linkTitles.resolve` carries no `awaitTitle`, so the page view never learns the range. The menu offers Format because `connectionMenuActions` defaults `surface` to `'editor'`. Confirmed by trace, not driven.[^43]

**Fix | Deferred**

Deferred as a rare corner whose fix costs more than the case. The cell's link edit commits as one page-view transaction carrying `awaitTitle` at the cell's absolute offset: the cell passes the pending link through `onCommit` → `onCellCommit`, and the widget's `commit` re-aims it at the page through `pendingInSource` in `Tables/sync.ts` and dispatches it with the cell's change (+19). The title's swap then lands as an ordinary page change that `editAffectsTables` rebuilds the table from, and `pendingTitle`'s `sweepOnTitles` escapes a fetched title holding `|` through `cellToSource` before writing it into the row (+4). A new `Tables/cellTitle.test.tsx`, "Page Title on a resting cell's link swaps the title in when it lands, escaped for the row", pins both halves. It lands on F-014's `useLatest` index read in `widget.tsx`'s `commit`, and `onCellCommit`'s new parameter stays optional under F-019's required props.

#### W7 · Subfield Figures

The footer's word and character counts walk the whole page on every settle and every selection change, through a cache that falls off a cliff past 8,000 lines, and they are a second reading of what the editor draws. The cache replacement and the table bound make a count's cost follow the edit and the selection; the recount waits.

##### F-044 · Past about 8,000 lines, the footer's word and character figures re-tokenize the whole page on every typing pause and every selection change, freezing the editor for up to a second.

> **Area:** MarkdownPM · **Lens:** Hot Path · **Weight:** High · **Size:** S · **Net:** +15 · **Origin:** Parallel Build

**Finding**

On a long page, each pause in typing and each change of selection freezes the editor. The figures' token cache in `subfieldStats.ts` is a module `perText(…, 8192)` FIFO, one for page text (`pageHidden`) and one for cells (`cellHidden`): a hit returns without refreshing order, and `capSet` evicts the oldest insert. A document walked top-to-bottom with more chunks than that misses every one, so a one-character edit re-tokenizes everything; `CHUNK_LINES = 40` keys a long run per line, so the unit is lines. The page figures and the selection figures share the one module cache, so each also evicts the other's chunks. `drawnLast` in `docCache.ts` already keeps "exactly what the last pass read" for the editor's own drawing, built separately. Measured after a one-character edit: `pageStats` at 3.0 ms for 4,000 lines, 5.7 ms at 8,000, 376 to 404 ms at 10,000, and 755 to 807 ms at 20,000. The triggers are the page settle (`subfieldItems` and `CitationsToggle` call `pageStats(page.body)`) and the selection listener's synchronous `rangeStats` in `MarkdownEditor`.[^44]

**Fix | Literal**

`Engine/perText.ts` gains `perPass(derive)`, a memory across one reader's passes that reuses what the last pass derived and keeps only what it read, and `drawnLast` is rebuilt on it so one implementation remains. In `subfieldStats.ts`, a `counter()` holds one page-vocabulary and one cell-vocabulary memory per caller, since chunks and cells tokenize under different vocabularies, and `computeStats` and `rangeStats` each count through their own (`pageCount`, `rangeCount`), so the page figures and a selection never evict each other; `tableProse` takes the cell reader. An LRU refresh alone wouldn't do, since a sequential walk longer than the cap thrashes LRU the same way. Interleaved against HEAD (minimum times), a one-character edit costs 3.1 ms against 3.0 at 4,000 lines and 6.6 against 6.2 at 8,000, and 9.1 ms against 454 at 10,000 and 18.7 against 936 at 20,000. A cheaper form at +8 keeps the tokens per caller (`perPass(tokenize)`) and re-derives the hidden set on every read, at about 30 to 40% slower than HEAD below the cliff on every debounced page count and every synchronous selection change, which is why the hidden-set form is taken. `rangeCount` is one memory for every open editor's selection. Two tests join `subfieldStats.test.ts` with a transparent spy on `tokenize`: "past 8,192 lines, a one-character edit tokenizes the one line it touched" (8,200 calls instead of one without the fix), and "and a selection counted between the two passes leaves the page its memory" (red when `rangeStats` counts through `pageCount`). F-020 and F-045 rewrite the same cell line in `tableProse`, so whichever lands second takes the other's form.

##### F-045 · Selection figures re-walk every table in the document on each selection change, whatever the selection covers.

> **Area:** MarkdownPM · **Lens:** Hot Path · **Weight:** Low · **Size:** S · **Net:** +2 · **Origin:** Shortcut

**Finding**

While a selection is dragged on a page with tables, every pointer step walks and renders every table row in the document: `rangeStats` calls `tableProse(scan)`, which loops over all of `scan.tables`, and the selection listener runs it on every change that moves the range, then sets a fresh object through `usePublishSelection` and `chromeSlice.setEditorSelection`. The prose side, `proseRuns`, is already bounded to the range. Below F-044's cliff this is sub-millisecond (0.35 ms with 50 tables).[^45]

**Fix | Literal**

`tableProse` takes the range's `[first, last]` lines, skips a region whose last line is above `first`, and stops at one whose first line is past `last`, the walk `proseRuns` already does. Coalescing `onSelection` to one per frame is left out: Chromium delivers pointer moves, and so CodeMirror's selection updates during a drag, aligned to animation frames, and a keyboard-extended selection is discrete, so a frame scheduler would change nothing measurable. No test pins it, since the bound changes no output; the counter and selection tests pass unchanged. It lands after F-044, on the `tableProse` signature that gives the cell reader.

##### F-046 · The footer's word and character figures are a second reading of what the editor draws, and the two already disagree.

> **Area:** MarkdownPM · **Lens:** Duplication · **Weight:** Low · **Size:** M · **Net:** ≈ +21 · **Origin:** Parallel Build

**Finding**

The footer's figures come from `subfieldStats`, which keeps its own chrome reader (`proseStart`) and hidden-token table (`hiddenOf`), where the editor's hide set comes from the line intents and `tokenIntents`; and `pageStats` runs `scanDoc(body)` from scratch on every settled body string while the editor holds the stepped scan of the same text. The two readings disagree: `- [] hello`, which the editor draws as plain text, counts 5 characters instead of 10, and in a paragraph of 40 or more lines a `*…*` spanning two lines has its markers counted as text, because `CHUNK_LINES` tokenizes such a run line by line where the editor tokenizes the chunk whole.[^46]

**Fix | Deferred**

Deferred by the owner, who kept the figures a second reading of the draw while F-044's cache replacement lands. The counts come from the editor's own derivations: a `chromeOf` reading each prose line's cached line intents replaces `proseStart`'s heading, list, quote, callout, and rule logic, the scan's `embeds` and `webpages` spans replace its lone-embed half, and `CHUNK_LINES` goes, so every chunk tokenizes whole. `hiddenOf` stays as the counter's token policy, since `tokenIntents` returns early for link, wikilink, and citation tokens, whose hides live in `decorations.ts`, and draws inline code, against the counter's contract that code counts nothing and link markers are hidden. The page figures read the open editor's held scan through a footer seam: `BodyMount` carries its view, `pageDetailCache.heldView(path)` returns the first mounted editor of a path, `heldStats(view, range?)` in `docCache.ts` counts from it through per-view token memories, and the Subfield page becomes `{ target, stats }`, built once per settled body by `subfieldPage(target, body)`, with `computeStats(body)` kept for a page with no editor mounted. The seam reaches the main pane, Page Windows, and the Glance alike, and the 120 ms settle stays, since it also drives the store write. Two red-first tests in `subfieldStats.test.ts` pin the disagreements (`- [] hello` counts 10; the long paragraph's emphasis drops its markers), and `subfieldItems.test.ts` pins that the figures read the mounted editor rather than the settled body. Typed at +15 beyond F-044's cache fix. It lands on F-044's `perPass` core and carries F-045's bound into the rewritten counter.

#### W8 · Engine Derivations

The Engine steps each derivation from the version before, and these findings are where it doesn't: a heading walk run twice, a list-marker walk run per keystroke, a rail state never reset, heading names that keep their closing hashes, two shapes that let a new field or an unproduced state through, and an intent carry that re-allocates everything below an edit. Landing this makes each derivation a single walk per version, read the same way by every caller.

##### F-047 · The drag handles beside each block re-read every line's list marker on every keystroke.

> **Area:** MarkdownPM · **Lens:** Hot Path · **Weight:** Medium · **Size:** S · **Net:** +5 · **Origin:** Shortcut

**Finding**

The grab handles drawn beside each paragraph, list, and code block are recomputed on every keystroke, and each recompute parses every line of the page for a list marker, though the scan already re-reads only the lines around the edit. On a long page this is the largest remaining per-keystroke cost, several times the scan it sits on. `blockHandles` reaches `blockStarts` through `EditorView.decorations.compute(['doc'], …)`, and `blockContext` runs `lines.map(parseListMarkerPrefixed)`; the block model is memoized per `DocScan`, but every keystroke makes a new scan, so the memo never hits on the typing path. `listRenumber` parses the same markers a second time from the scan's lines. On a 14,500-line page the marker walk measured 2.68 ms per keystroke, more than `rescan` and `stepLineIntents` combined; on a 20,000-line mixed page, `blockStarts` on a fresh scan took 4.36 ms, of which the marker walk was 4.03 ms (92%), against 0.6 to 1.2 ms for `rescan` on the same edit.[^47]

**Fix | Proposed**

The line scan gains `markers: (ListMarker | null)[]`: `scanLines` computes it with `parseListMarkerPrefixed` over its window, and `splice` carries it through `perLine` with no offset mapping, since marker offsets are line-relative, as `headings` and `breaks` are. `blockContext` reads `scan.markers` in place of its own walk, and `listRenumber` reads `scan.markers[i]` in place of re-parsing. The markers are parsed by the page's list grammar on every scan, as `blockContext` parses them today, and scope gating waits with F-093. Every `scanDoc` now parses markers once per line, including the chunk scan inside `tokenizeChunk` and a cell's scan, a chunk-sized regex cost on the tokenize path. `blockStarts` itself stays one walk over the lines per keystroke; emitting the grip class from the stepped line intents would remove that too, but it needs block membership, which isn't line-local, carried in the intents. No test is added: the `rescan ≡ scanDoc` property in `docScan.test.ts` compares every `DocScan` key across 1,500 documents and 40 edits each, its generator already holds every marker kind, and it goes red when `splice` drops `markers`. Lands with or after F-051, since the `listRenumber` line it rewrites calls `isSequenced(lm)`, which takes a marker only once F-051 lands; alone, the call stays `isSequenced(lm.kind)`.

##### F-048 · Outliner rails draw guide lines for list ancestors that sit above an unrelated heading or paragraph.

> **Area:** MarkdownPM · **Lens:** Defect · **Weight:** Low · **Size:** S · **Net:** +6 · **Origin:** Shortcut

**Finding**

An indented item placed after a heading or paragraph draws hairline rails as though it were nested under a list that ended above. `railIntents` writes `railKind` only on list lines and never resets it on a non-list line, so the next indented item inherits the old ancestors' kinds, and the kind also sets the rail's position. Probed: `- a`, `\t- b`, a heading, then `\t\t- c` draws two bullet rails at levels 0 and 1 on the last line.[^48]

**Fix | Proposed**

`railIntents` takes the lines and clears `railKind` on a non-blank line that is neither a list item nor indented, the same blank-or-indented test `blockModel`'s `isListCont` uses; blank lines and indented continuations keep the list open, which loose lists need. `withRails` passes the scan's lines, and `cellStatic.tsx`'s `renderCellBody` passes its own. An unindented line directly under an item now ends the rails there, which follows what the page draws (the line at column 0) where CommonMark would read a lazy continuation; the existing test 'a non-list line between siblings breaks the run (caps on both sides of the gap)' pins the opposite and is rewritten as 'a line outside the list ends it, so a later indented item draws no ancestor rail', which holds the probe above and goes red without the reset. A second test, 'a blank line or an indented continuation keeps the list open', goes red if the reset also fires on blank lines.

##### F-049 · A heading written with closing hashes (`# foo #`) keeps them in its name, so the outline, fold keys, index, and heading links read `foo #` where other Markdown readers read `foo`.

> **Area:** MarkdownPM · **Lens:** Defect · **Weight:** Low · **Size:** S · **Net:** +5 · **Origin:** Shortcut

**Finding**

A heading like `# foo #` lists as "foo #", and a link written `[[Page#foo]]`, as any CommonMark or Obsidian reader would name it, doesn't resolve. Adding closing hashes to an existing heading also counts as a rename: typing ` ##` after `## Setup` rewrites every `[[#Setup]]` link on the page to `[[#Setup ##]]`. `headingParts` captures the rest of the line as `content`, and every heading-name reader (`scanHeadings`, `headingRenameSettle` in `headingRenameOf` and at settle, and `gripMenu`'s linkable check and Copy Link) takes `content.trim()`, while the micromark parse that confirms the heading strips the closing sequence. Probed: the outline of `# foo #`, `## bar ##`, `### baz#`, `#### #` reads `foo #`, `bar ##`, `baz#`, `#`.[^49]

**Fix | Proposed**

`headingParts` gains a `text` field with CommonMark's closing sequence stripped (a `#` run preceded by a space or tab, or a line of only `#`s), and all five name readers take it; `content` and `contentStart` stay raw for the editing callers, so drawing and rewriting keep the hashes. Its unread `space` field goes. Nothing on disk is rewritten, but per-machine fold keys saved through `prefs.save('folds', …)` change once for such headings, so their remembered folds open once; `nexus.db` heading rows regenerate; and a link already written as `[[Page#foo #]]` stops resolving. Two tests pin it: `folding.test.ts`'s 'names a heading without its closing hashes, as CommonMark reads it' expects `foo`, `bar`, `baz#`, and an empty name, and `headingRename.test.tsx`'s 'closing hashes added to a heading rename nothing' expects no rename and an untouched link; both go red against today's `content.trim()`. Lands as one edit of `scanHeadings` with F-050, since both rewrite its heading-name line.

##### F-050 · The heading list is worked out twice on every keystroke, once for the folds and once for the outline.

> **Area:** MarkdownPM · **Lens:** Hot Path · **Weight:** Low · **Size:** S · **Net:** −1 · **Origin:** Drift

**Finding**

Every keystroke walks the document's headings twice: once for the folds (`headingSections`, cached per scan) and once for the outline (`headingOutlineOf`, cached per document through `docOutline`). Both call `scanHeadings` from nothing, and both are read every version, by the fold regions and by the decoration build's `docHeadingKeys` and `docSectionHeadings`. Editor-Internals says the fold and the outline read one fence-aware heading scan per version. Each walk measured 0.085 ms at 20,000 lines. The per-scan memo is already written out by hand twice, as `sectionCache` in `headingScan.ts` and as `contexts` behind `blockContextOf` in `blockModel.ts`.[^50]

**Fix | Literal**

One `perScan(derive)` in `docScan.ts`, the `perDoc` shape keyed on the immutable `DocScan`, replaces the hand-written memos: `scanHeadings`, `headingSections`, and `blockContextOf` each become a `perScan` derivation, so the outline and the sections share one walk per scan and Editor-Internals' sentence becomes true. Outputs are unchanged, so no test is added; `folding.test.ts`, `foldState.test.tsx`, `regressionPins.test.ts`, `blockModel.test.ts`, and `docScan.test.ts` pass as they stand. Lands as one edit of `scanHeadings` with F-049, since both rewrite its heading-name line.

##### F-051 · List-marker readers keep checking for pieces the parser always fills in.

> **Area:** MarkdownPM · **Lens:** Growth Constraint · **Weight:** Low · **Size:** S · **Net:** −10 · **Origin:** Shortcut

**Finding**

`ListMarker` is a kind tag plus optional `bullet`, `ordinal`, `box`, and `checked`, though `parseListMarker` always sets `box` and `checked` for `checkbox`, `ordinal` for the sequenced kinds, and `bullet` for `bullet` and `arrow`. Readers guard anyway: `ordinalOf`'s `?? 'A'` and `?? '0'`, `bullet?.length ?? 1` in the parser, `lm.kind === 'checkbox' && lm.box` and `lm?.box && glyph === 'checkbox'` and `lm.checked ?? false` in `intents.ts`, `!lm.box` and `marker.ordinal ?? ''` in `listDragModel.ts`, and `lm.bullet ?? '-'` twice in `edits.ts`. `parseListMarkerPrefixed` re-spreads every offset, `box` included, to shift a marker past a quote prefix. Confirmed by reading.[^51]

**Fix | Proposed**

A union by kind: `box` required on `checkbox`, optional on `bullet` and the sequenced kinds (`- []` and `1. [ ]` parse with a box), and absent on `arrow`. `isSequenced` narrows the marker itself to a `SequencedMarker`, so `ordinalOf` reads its ordinal unguarded, and every guard drops. `parseListMarker(line, at = 0)` adds `at` to its offsets, so `parseListMarkerPrefixed` becomes one call in place of the re-spread, which is where the reduction comes from; as a trailing optional argument, `at` would take an array index from a point-free `lines.map(parseListMarker)`, and none exists. The type checker is the pin: six `detect.test.ts` expectations that read optional fields become whole-shape matches, and the Engine, Input, Tables, and Gestures suites pass. Lands with or before F-047, whose `listRenumber` line calls `isSequenced` with the marker.

##### F-052 · Moving a styled run copies its fields one by one, so a field added later goes missing from everything the editor draws.

> **Area:** MarkdownPM · **Lens:** Growth Constraint · **Weight:** Low · **Size:** S · **Net:** −2 · **Origin:** Shortcut

**Finding**

`shiftToken` rebuilds each token by naming its fields, so a field added to `Token` later is dropped from every chunk token the decoration pass draws (`visibleInline`) and from `tokenizeChunk`'s HTML-block emphasis; `color` and `inHtml` were each threaded through by hand. Confirmed by reading.[^52]

**Fix | Literal**

`shiftToken` spreads the token and overrides only its ranges: `range`, `contentRange`, `markerRanges`, and the optional `resolveRange` and `fragment`, which keep their conditional spreads because spreading `resolveRange: undefined` would add a key the parity test pins; the `color` and `inHtml` lines go. A new field now rides the spread, and a new range field rides it unshifted rather than missing, which is still silent. The parity test 'shifting a token carries every field the raw one has, offset alike' passes, and its comment is rewritten to describe the spread.

##### F-053 · Each keystroke re-allocates every carried line intent, fence-line record, and table row below the edit just to shift their positions.

> **Area:** MarkdownPM · **Lens:** Hot Path · **Weight:** Low · **Size:** M · **Net:** ≈ +6 · **Origin:** Shortcut

**Finding**

On a very long page, typing near the top costs more than typing near the bottom, because every intent below the edit is rebuilt with shifted positions: `stepLineIntents` carries lines below an edit by re-allocating each intent through `moveIntent`, `splice` runs `moveLine` per fenced line and `moveTable` per table, and `railIntents` re-derives whole-document rails per version though rails are read for the viewport. Measured at 1.81 ms against 0.25 ms at 14,500 lines, and 0.72 ms against 0.17 ms at 20,000. The carry stays O(N) whatever the fix, because every per-line array and `lineStarts` are copied and shifted per keystroke by design; what can go is the per-object allocation, a constant-factor cost.[^53]

**Fix | Deferred**

Deferred until a long-page benchmark is part of the gates. Cached line intents would be held relative to their line start and re-based where they're read (`assembleLineIntents`, `prefixEndAt`, `seatPastMarker`, and `decorations.ts`'s `atomicsOn`), so the carry copies references, and rails would be derived for the window from `railIntents` as F-048 leaves it. Editor-Internals' sentence that an intent carries document positions only in `from` and `to` is rewritten with it, and `docCache.test.ts`'s `stepLineIntents ≡ docLineIntents` property stays the specification. The fence and table half is open: a block's range could be held once in `fenceRangesOf` rather than on every line. It was not typed; the net is an estimate.

#### W9 · Decorations, Embeds, and Folding

The editor's drawing layer redoes on every caret move work that only an edit can change, decides which embeds become tiles in two places, and leaves a few drawn states wrong: a doubled gap under callouts, raw embeds in cells and Text values, text landing outside a fold, and a resting Text value that ignores its page's headings. Landing this gives each drawn state one owner and ties each cost to the edits that can change it.

##### F-054 · In a table cell or a Text value, a page embed alone on its line shows as raw `![[…]]` text.

> **Area:** MarkdownPM · **Lens:** Defect · **Weight:** Medium · **Size:** M · **Net:** +22 · **Origin:** Drift

**Finding**

A Text value or a table cell holding a line like `![[Alpha]]` shows the raw brackets while it's being edited, though the same embed in the middle of a line draws styled, and the resting cell draws it styled too, so the cell changes appearance when clicked into; in none of these is the embed clickable. Whether `![[Page]]` becomes a tile is decided by the tile field, and `build` in `decorations.ts` decides it again on its own through `claimedEmbeds` on every build (every caret move), in every scope, because the scan is page-shaped and `conn` exists in all three. Only the page mounts the tile field (`embedTiles`), so in a cell or Text value the claimed token is suppressed and no tile is drawn, while the resting renderer (`renderCellContent`, which also draws a resting Text value) draws every embed as an unlinked `md-embed` span that its click path never finds. `buildTiles` also resolves each claimed title twice, and Editor-Internals says the claim has one owner. Probed in `cell` and `text`: the lone line renders as `"![[Alpha]]"` and the mid-line embed as `<span class="md-embed">Alpha</span>`.[^54]

**Fix | Literal**

`build` drops an `embed` token inside any range `embedTileRanges(view.state)` returns, and its `conn` gate goes, since a surface without the tile field returns no ranges; a webpage tile's range never holds an `embed` token, so no kind filter is needed. `claimedEmbeds` takes the resolver and returns each claimed line with its resolved page, so `buildTiles` pushes the path and id in one loop line, and `claimedEmbeds` keeps its one caller in `embedWidget.tsx`. Outside a page, by the owner's ruling, `![[Page]]` draws and clicks as the connection it names, and both renderers change: a new `embedAsConnection(text, tk)` in `Engine/tokens.ts` re-reads the `[[…]]` after the `!` as a real `wikiLink` token widened over the `!` (a title past the wikilink pattern's 255-character cap stays an embed), `build` maps its tokens through it when `scope !== 'page'`, and the resting cell's `cellTokens` caches `tokenize(text).map(embedAsConnection)`. `linkTokenAt` gains a `tiles` parameter that maps through `embedAsConnection` when false; `connectionClicks` takes the scope and passes whether it's a page, while `cellStatic.tsx`'s three reads and `applyLinkAction` pass false. The `tiles = true` default answers "a page" for the three callers that omit it (`commitAliasOnEnter`, `linkClicks.ts`, `linkFormat.ts`), and F-034's single link hit-test is where it becomes required. A person sees a cell or Text value draw `![[Alpha]]` with the connection's resolved, phantom, or ambiguous look, its brackets revealed under the caret and a heading or alias read as in `[[…]]`, and it follows on click, glances on hover, and opens the connection menu on right-click; a page is unchanged. `textScope.test.tsx`'s 'a page embed in a Text value' asserts both the lone and mid-line embeds draw as `.md-connection-resolved`, red (`.md-embed`) without the mapping line and raw on the lone line if the re-claim is restored; `cellStatic.test.tsx`'s 'a resting cell draws a page embed as its connection' asserts the resolved class and `data-link-span="0,10"`, red with the plain `tokenize` cache. `embedClaims.test.ts`'s helper returns a resolution instead of a status, with its assertions unchanged. The claim half nets −4 and the connection look +26, of which +7 is Biome splitting `cellStatic.tsx`'s widened import; `ConnectionsPM.md`'s embed sentence gains that a page embed in a cell or Text value, where no tile forms, draws and acts as a connection. Lands before F-034, whose single link hit-test replaces `connectionClicks.ts` and carries the `tiles` reading forward, while the cell keeps its own `cellTokens` memo.

##### F-055 · The gap below a callout is twice the gap above it, from a line margin the editor's layout rules forbid.

> **Area:** MarkdownPM · **Lens:** Defect · **Weight:** Medium · **Size:** S · **Net:** −3 · **Origin:** Residue

**Finding**

Callouts get extra space below them from a rule Editor-Internals forbids for box constructs, because a CodeMirror line margin throws off where clicks and the caret land. `.cm-line.md-callout-last` carries `margin-bottom: var(--callout-gap)` beside the sanctioned `padding-bottom: calc(var(--callout-gap) + var(--callout-inner-pad))` and the `::before { bottom: var(--callout-gap) }` that already provide the gap, so the gap below a callout is double the gap above, while quotes and code blocks carry no margin. The other `md-callout-last` rules are padding and pseudo-elements, and `intents.test.ts` pins only that the class is emitted; the height-model effect and the visual change are confirmed by reading.[^55]

**Fix | Literal**

Delete the three-line margin rule; Editor-Internals' "never a line margin" then holds for callouts with no documentation edit. The check is visual and live: on a `~/Test` page with a paragraph, a two-line `> [!note]` callout, and a paragraph, the gap from the callout border's bottom to the next line's top equals `--callout-gap` and matches the gap above (twice that without the fix), and a click 2px below the border lands the caret on the line under the pointer.

##### F-056 · Every caret move rebuilds the ranges that let the caret step over an embedded tile.

> **Area:** MarkdownPM · **Lens:** Hot Path · **Weight:** Low · **Size:** S · **Net:** +6 · **Origin:** Shortcut

**Finding**

The ranges that make the caret skip an embedded tile in one move are rebuilt on every caret move, where Editor-Internals holds the atomic set once per version. CodeMirror calls every `atomicRanges` provider on each cursor motion, and `embedAtomic` allocates a fresh `RangeSet` and a fresh `Decoration.mark({})` per tile on each call, though `embedField.ranges` changes only when a tile moves: `mapRanges` returns a new array on every document change and `buildTiles` on every rebuild, while a selection-only transaction keeps it. Confirmed by reading and by a test that sees two equal but distinct sets across one caret move.[^56]

**Fix | Literal**

One module-level `Decoration.mark({})`, and a `WeakMap` from the field's `ranges` array to the set built from it, so a caret move returns the set the last edit built; since the array's identity follows the document version, the clamp to the document's length stays valid. Nothing visible changes. `embedBoundaryKeys.test.tsx`'s 'a caret move reads the atomic set the last edit built' finds the provider whose set covers the tile line and asserts a caret move returns the same set, red when each call builds a fresh one.

##### F-057 · While the pointer is over the editor, every caret move re-measures every visible code block's language tag.

> **Area:** MarkdownPM · **Lens:** Hot Path · **Weight:** Low · **Size:** S · **Net:** +2 · **Origin:** Shortcut

**Finding**

While the pointer rests over the editor, every caret move re-measures every visible code block's language tag through `getBoundingClientRect`, including moves along one line that can't change a tag. `TagReveal` invalidates on `selectionSet` and `focusChanged` among its triggers, and `moved()` drops the cached tags and requests a measure while the pointer is inside. A caret move never changes a tag's position, but it does change which tags exist: the tag widget is drawn only when the caret isn't on the fence's opening line, so a caret moving onto or off that line adds or drops a `.codeblock-language` element with no height change, and a blur does the same. Confirmed by reading and by a test that counts measures per caret move.[^57]

**Fix | Literal**

`TagReveal.update` re-measures on a selection change only when the caret's line changes, and keeps `docChanged`, `viewportChanged`, `geometryChanged`, and `focusChanged`, which is rare; dropping `selectionSet` and `focusChanged` outright would strand a tag that appears when the caret leaves an opening line, so the copy reveal wouldn't show until the pointer left. Moves along one line stop measuring. `blockHandles.test.ts`'s 'measures again on a caret move only when the caret changes lines' asserts no measure after a same-line move and one after a cross-line move, red (two measures where one is expected) when `selectionSet` re-measures unconditionally. Keystrokes still re-measure through `docChanged` while the pointer rests over the editor; that cost stays.

##### F-058 · Every redraw searches from the visible area to the end of the page for `↔` arrows.

> **Area:** MarkdownPM · **Lens:** Hot Path · **Weight:** Low · **Size:** S · **Net:** +2 · **Origin:** Shortcut

**Finding**

Highlighting `↔` arrows searches from the top of the visible area to the end of the document on every redraw (every caret move and keystroke) whenever no arrow sits below the viewport: `build` runs `text.indexOf('↔', from)` over the whole `scan.text` per visible range and stops only at a hit at or past `to`. Confirmed by reading.[^58]

**Fix | Literal**

Search the visible slice (`text.slice(from, to)`) and offset each hit by `from`. The output is unchanged, so no test goes red without the fix; a test mounting `'a ↔ b\n↔'` and asserting the two `.dual-direction-arrow` spans' text and positions pins the offset arithmetic. Shares `decorations.ts`'s `build` with F-054, so the two land in one pass over the function.

##### F-059 · Text that arrives from another copy of a page at the end of a folded section shows up below the fold.

> **Area:** MarkdownPM · **Lens:** Defect · **Weight:** Low · **Size:** S · **Net:** +2 · **Origin:** Shortcut

**Finding**

If the same page is open twice (a tab and a window) with a section folded in one, text added at the end of that section from the other copy, or landing from disk, appears below the folded section instead of inside it. `foldField` maps each entry's end backward (`mapPos(e.to, -1)`), so an insertion at exactly `e.to` stays outside, and a landing through `mirrorBody` skips the drop-and-retake Editor-Internals prescribes for a region rewritten under a fold, which `editAcrossCitations` performs. Reproduced in a test that mirrors a body with a line added at a folded section's end: the line draws outside the fold.[^59]

**Fix | Literal**

After `foldField` filters the surviving entries against the live regions, a transaction carrying the `mirrored` annotation takes each entry's end from its live region, so landed text at a section's end joins the fold; a typed edit keeps its own path. `foldState.test.tsx`'s 'text landing from another mount at a folded section's end joins the fold' asserts the landed line isn't drawn, red without the `mirrored` line, and the existing non-mirrored 'and without the teardown the new row draws outside the fold' still passes. Editor-Internals' fold sentence gains that the fold field re-takes a surviving fold's end from the live region for a mirrored landing. F-030's echo flag on `mirrorBody` keeps the `mirrored` annotation on an echoed landing, or that landing's folds don't re-take their ends.

##### F-061 · In a free-text markdown tile, the footnotes divider and the footnote reveal do nothing.

> **Area:** Tiles · **Lens:** Defect · **Weight:** Low · **Size:** S · **Net:** ≈ +2 · **Origin:** Shortcut

**Finding**

In a markdown tile, clicking the footnotes divider or creating a footnote while they're hidden does nothing, because the tile's host has no `pageId` and the host's `citations.set` is a no-op without one; the divider press and the footnote reveal both end in that call.[^61]

**Fix | Deferred**

Waits until tiles decide whether they hold footnotes. Either visibility is keyed by the tile id, or a host that can't toggle draws no divider; neither form was typed, and the net is an estimate.

##### F-062 · A resting Text value draws heading links without its page's headings or the Heading Link Style setting, unlike its live pane.

> **Area:** Properties · **Lens:** Divergence · **Weight:** Low · **Size:** S · **Net:** +4 · **Origin:** Drift

**Finding**

A bare `[[#Gone]]` in a resting Text value is never marked missing, and `[[Page#Heading]]` there always shows the page part regardless of Heading Link Style; the live pane does both. `TextCell` calls `renderCellContent(line, connections, { base })` with no `around` or `headingLinkStyle`, where the live pane's decoration pass takes the holding page's keys from `conn.headingsOf(path)` and the style from the host settings. A bare fragment hides the page part either way. Reproduced in a test that finds no link marked missing.[^62]

**Fix | Literal**

`TextCell` reads `useSetting('headingLinkStyle')` and, when the index knows the holding page, passes `around: { ordinalOf: () => null, ownKeys }` with `ownKeys` from `connections().headingsOf(holder.path)`; `ordinalOf` answers null because a Text value carries no footnotes, so `CellPage` keeps `ordinalOf` required and a table's `CellPage` (F-017) can't omit its numbering. The change lands in `Core/Properties` alone, and `PropertiesPM.md`'s and `ConnectionsPM.md`'s claim that a resting Text value shares the editor's heading display becomes true. `Cell.test.tsx`'s 'marks a bare heading link missing against its holding page's headings, as its live pane does' asserts `['Gone']` is marked missing, red (`[]`) without `around`; the style half has no test in the typed change, and a second test seeding the personalization to `heading-only` and asserting `[[Target#H]]` drops `Target` would pin it.

#### W10 · Warm Editors and Their Scroll

A warm editor keeps its state and scroll so a page reopens where it was left. A tile's scroll repair reaches every warm editor in the app on every update, a window's Page tab saves its scroll in two places, and PageView restores its warm state by hand beside the shared helper. Landing this gives each editor's scroll one owner and limits the repair to the editors a re-slotted tile can affect.

##### F-063 · Every update of any editor holding a tile tells every warm editor in the app to check its scroll position.

> **Area:** MarkdownPM · **Lens:** Hot Path · **Weight:** Low · **Size:** S · **Net:** +2 · **Origin:** Patch-Over

**Finding**

The repair for a real browser behavior, where a tile's inner scroll resets to zero when CodeMirror briefly detaches the tile's DOM to re-slot it, runs on every caret move, focus change, and keystroke in a page with a tile, and reaches every open tab, window, glance, and tile editor rather than the ones inside that page. `reslotHeal` requests a measure whenever `embedField` holds any range, and its `healTileScrolls` emits through a module-global emitter in `scrollHeal.ts` that every warm `MarkdownEditor` subscribes to (PageView, each window tab's `PageTile`, each embedded `PageTile`, and the Glance), each reading its `scrollTop`. Only editors nested in the re-slotting editor's DOM can have been detached, and a re-slot follows only a viewport change or a tile rebuild. Confirmed by reading; the measure key dedupes per view per cycle, so the cost is one fan-out per update.[^63]

**Fix | Literal**

`reslotHeal` requests the heal only when the viewport changed or `embedField.deco` differs from the start state's, which covers every tile rebuild and document change and skips caret, focus, and hover updates; the emit carries the emitting `view.dom`, and a subscriber heals only when that root contains its own editor, excluding the emitter itself. Two tests in `embedBoundaryKeys.test.tsx` under 'the tile scroll heal' pin it: 'a caret move asks for no heal, and an edit does', red without the gate, and 'restores only an editor inside the one that re-slotted', red without the containment check. jsdom has no detach-zeroing, so a live check over CDP verifies the gate is wide enough: typing, arrowing across and onto the tile's line, clicking into and out of the tile, scrolling, and resizing the embedding page never leave the tile's inner scroll at zero for two consecutive frames, and a second window's scrollers and a parked tab's scroller record no `scrollTop` reads or writes during that driving. If the tile's scroll stays at zero after a plain caret move, the gate widens with `selectionSet` and the containment stays. Lands with F-064 as one change, since F-064 points the heal at the scroller that scrolls the page, and without the containment a window page holding a tile would offer its window body to every heal in the app.

##### F-064 · A window's Page tab keeps its scroll twice, and the editor's own saved scroll there is always zero.

> **Area:** MarkdownPM, Interface · **Lens:** Divergence · **Weight:** Low · **Size:** M · **Net:** −4 · **Origin:** Drift

**Finding**

In a window, a page's scroll position is saved by two mechanisms; the editor's own always records the top of the page, and only the window's does anything. A window's Page tab is a `PageTile` under `.window-body.page-tile-grows`, where `tile-base.css` makes the editor's scroller non-scrolling, so `MarkdownEditor`'s warm capture, heal, and restore on `view.scrollDOM` are inert, while `useWindowWarm` keeps the body's real scroll in `windowCache`'s `bodyScroll`; `travel.ts`'s `scrollerOf` already knows the real scroller. The `restored` set in `useWindowWarm` exists only so a parked page body passing through the hook keeps its own scroll. Reproduced in a test that seats an editor under a growing window body and finds its warm capture recording zero.[^64]

**Fix | Literal**

`travel.ts` exports `scrollerOf`, and `MarkdownEditor` reads it once at mount for the warm listener, the heal, the restore after folds, and the unlisten, so a window page saves and restores its own scroll through the shared warm store. `useWindowWarm`'s capture and restore run only for a ready Space tab (`WindowTabBody` passes `spaceTarget !== null && ready`), and `bodyRef` stays on the page body because it also drives the tab-switch slide; the `restored` set and its comment go, and `windowCache`'s lead comment says a Page tab's scroll lives in the warm store and only a Space tab's body scroll is kept there. A person sees no change beyond a window page keeping its place through the editor's path. `travel.test.ts`'s 'a warm editor keeps its place where its page scrolls' asserts the window body's scroll reaches the warm capture, red (zero) with `view.scrollDOM` in place of `scrollerOf(view)`; `useWindowWarm.test.tsx`'s 'leaves a Page tab's scroll to its editor' replaces 'restores a scroller once, so a parked page returning, or a heading arrival on it, keeps its place', red without the readiness gate on capture; the harness's `mountEditor` takes a parent element for the window seat. A live check opens a long page in a Page Window, scrolls its body, switches tabs, closes and re-summons the window, and returns to the tab, which lands where it was after folds settle. Lands with F-063 as one change, for the reason given there.

##### F-065 · PageView restores its editor's saved state through its own code beside the shared helper the other surfaces use.

> **Area:** Pages · **Lens:** Duplication · **Weight:** Low · **Size:** S · **Net:** ≈ −8 or 0 · **Origin:** Parallel Build

**Finding**

Pages restore their editor state through hand-written code (its own generation fence, path fence, and `pageDetail` attachment), while tiles, windows, and the Glance use `warmSeamOf`. The page's version exists because it also tucks a copy of the page's details into the warm entry and reads its owner tab id live, and `dropWarmDetail` keeps that second home consistent with `pageDetailCache`, which already holds the detail; `navigationSlice` reads the tucked copy when it opens a page. Folding it into the helper with capture-patch options only relocates the code.[^65]

**Fix | Deferred**

Waits on a Session question: whether warm entries keep `pageDetail`. If they drop it, PageView takes `warmSeamOf` with a path guard and `dropWarmDetail` goes, about −8; if they keep it, PageView stays as it is. Neither form was typed, and the net is an estimate.

#### W11 · HTML Blocks

The raw-HTML pass has no rule for an opener nothing closes, and the scan doesn't seal HTML blocks the way it seals fences, maths, and tables. F-066's blank-line rule ends the typing lag below a stray opener; F-067's sealing waits and lands on it.

##### F-066 · A raw-HTML opener with no closer makes every keystroke below it re-scan to the end of the document and re-tokenize everything from the opener down.

> **Area:** MarkdownPM · **Lens:** Hot Path · **Weight:** Medium · **Size:** M · **Net:** ≈ +28 · **Origin:** Shortcut

**Finding**

A page with a stray `<!--`, `<pre>`, `<script>`, or `<?` near the top lags heavily when typing far below it: `tokenizeChunk` measured about 115 ms per keystroke on a 4,500-line page, against 0.74 ms without the opener. `htmlBlocks` runs a raw opener to the last line when no closer arrives, `quietAt` refuses every line inside an HTML span so `rescan` widens to the end, and `chunksOver` opens the viewport chunk at the opener. The fence grammar already refuses an opener nothing closes, a documented divergence from CommonMark, and the raw-HTML pass has no such rule. `<div>`-style blocks end at a blank line and are unaffected.[^66]

**Fix | Proposed**

A raw opener whose closer never arrives ends before the next blank line (`htmlBlocks` sets the block's end through a `lastBeforeBlank` helper, as type-6 and type-7 blocks already end), a fourth intentional CommonMark divergence that joins Editor-Internals' list. The raw openers and their end conditions move beside the fence grammar in `markdownCode.ts`, with `unclosedHtmlEnd(d, span)` naming the end condition a span's opener still waits for, so the scan and the parser read one grammar. The parser is handed the same reading: `parse` rewrites an unclosed opener's line as a `<p` start of the same length, so micromark ends it at the blank line too; masking it to prose the way a lone fence marker is masked would make it a paragraph, and `htmlBlockSpans(ast)` would drop a block the scan keeps. Because a raw block now runs across blank lines only to a closer, the rescan window re-pairs it as it re-pairs a fence: `loneAbove` widens up to an unclosed opener above the window when the window holds its end condition, and `pairsBelow` widens down when the window holds an unclosed opener whose end condition appears below. A stray opener then costs the lines up to the next blank line, and everything below it scans and tokenizes as it would without the opener. `docScan.test.ts`'s "ends an opener nothing closes at the next blank line" asserts `<!--` / `x` / blank / `y` holds one span ending before the blank line, and that a `<pre>` closed across a blank line still closes; it goes red with the run-to-the-last-line loop restored. The property generator already holds unclosed `<pre>` and `<?php` lines, so the `rescan ≡ scanDoc` and chunk-by-chunk properties pin the re-pairing and the mask. The net is an estimate: this rule was typed only together with F-067, at +36 for the rule, the re-pairing, the parser masks, and three window edge guards, and the guards and the parser's lone-tag mask belong to F-067's lone-tag start condition.

##### F-067 · A `#` line or a footnote run inside an HTML block still counts as a heading or as the footnotes section.

> **Area:** MarkdownPM · **Lens:** Defect · **Weight:** Low · **Size:** M · **Net:** ≈ +72 · **Origin:** Drift

**Finding**

The heading scan skips a `#` line inside a fence or a `$$` math block but not one inside an HTML block, so `<div>` / `# x` / `</div>` still lists `x` in the Outline, the heading picker, the fold chevrons, and the index, and the editor draws the line as a heading. The same root leaves footnote definitions inside a `<!-- … -->` block numbered and drawn as the footnotes section, where other Markdown readers treat them as a hidden comment: `assembleCitations` excludes lines through `inSealedLine`, which seals fences, maths, and tables but not `html`. The editor can write such a block itself: with **HTML Shortcuts** on, ⌘/ over several lines wraps them in one `<!-- … -->`. The HTML-block detector can't decide this as written: it opens a block on any line that starts with a tag and runs it to the next blank line, so a line led by an inline tag or a one-line comment (`<b>Note:</b> read this`, `<!-- todo -->`) would swallow every heading beneath it. The owner ruled that whether they count follows the **HTML Formatting** setting: on, the heading scan, the footnote assembly, the line intents, and the block model seal HTML-block lines; off, they count and render.[^67]

**Fix | Deferred**

Waits at its measured cost, most of which is following the setting on both sides of the app. CommonMark's start and end conditions in `markdownCode.ts` and `htmlBlocks` are +21 on their own. Following the setting is +41: the scan records the reading it was built under (`DocScan.sealsHtml`, `scanDoc(text, sealsHtml)`), `inSealedLine` adds the HTML clause, the editor's cache re-derives every held document when the setting turns, and the index seed, the rename cascade, and the footer's figures read the setting where they run. A tag alone on a line opens a block only below a blank line (a fifth intentional CommonMark divergence, which the parser is masked to agree with), and keeping `rescan ≡ scanDoc` under that rule takes three window edge guards in `quietAt`, `loneAbove`, and `pairsBelow` beside the parser's lone-tag mask, about +10 that F-066's estimate leaves out, since they serve only the lone-tag start. Two consequences come with it: with the setting on, `listRenumber`, `listDrag`, the `/` menu, and the embed seat also stop inside a raw HTML block, and the content index keeps each page's headings and citation relations under the setting as it stood when the page was indexed, so turning the setting would need a re-index. Lands on F-066's blank-line rule, since sealing without it lets a half-typed `<!--` seal everything below it. Its `sealsHtml` parameter lands on F-044's rewritten `computeStats` and `pageStats`.

#### W12 · Residue and Small Duplications

The editor spells five small jobs a second time beside the helper that does them, and carries types, fields, and lines that only tests read. Landing these leaves one spelling of each job and nothing kept alive for tests alone; only F-068's callout conversion changes what a person sees, on one edge.

##### F-068 · Five small jobs in the editor are written out by hand beside a helper that already does them.

> **Area:** MarkdownPM · **Lens:** Duplication · **Weight:** Low · **Size:** S · **Net:** −15 · **Origin:** Parallel Build

**Finding**

Each of these has two spellings to keep in step, so a change to one leaves the other behind. The ragged-row branch of `cellCommitChange` in `Tables/sync.ts` builds a pipe row inline where the codec's `pipeRow` builds the same string. `calloutLines` in `Engine/detect.ts` asks `isCalloutHead`, then re-runs `quotePrefix` and `calloutTagRe` for the head's `prefixEnd`, which `calloutHeadPrefixLen` already returns. The "inside an alias" check is spelled twice, in `refusedInAlias` (`Guards/aliasGuard.ts`, whose one caller is `typedInput` in `Input/markdownInput.ts`) and in `autoPair` (`Input/edits.ts`), each slicing the line and calling `aliasSpanAt`. `claimCheckbox` in `Tables/cellStatic.tsx` hand-walks a line offset (`at += lines[k].length + 1`) where `lineOffsetsOf` is imported and used in the same file. `stripBlockMarkers` in `Input/format.ts` repeats `stripInnerMarkers` and adds `stripQuotePrefix`. Each was confirmed by reading and typed on a scratch worktree.[^68]

**Fix | Literal**

`cellCommitChange` returns `pipeRow(cells)`. `calloutLines` asks `calloutHeadPrefixLen` once in place of `isCalloutHead` and the re-run, which also drops a `?? 0` fallback for a tag the head is known to carry. One `inAliasAt(doc, at)` joins `aliasSpanAt` in `Core/Connections/connections.ts` (Connections already imports `markdownCode`, so no import cycle forms); `typedInput` refuses when `text === ']'` and `inAliasAt` holds, `autoPair` declines a `[` there, and `aliasGuard.ts` is deleted. `claimCheckbox` reads its offset from `lineOffsetsOf`. `stripBlockMarkers` is deleted and `setBlock`'s callout case composes `stripQuotePrefix(stripInnerMarkers(line))`, which changes one edge: a list line whose content opens with a quote marker, `- > foo`, converts to `> [!callout] foo` where it gave `> [!callout] > foo`; keeping the old output exactly costs four lines more. `aliasGuard.test.ts` goes with its module: its refusal cases become `inAliasAt` tests in `connections.test.ts` (red when the offset isn't taken relative to the line start), its auto-pair case moves to `edits.test.ts` (red when `autoPair` drops the alias check), and `cellAlias.test.tsx`'s "and any other character still lands" stays as the only pin of the `]`-only condition at the call site; a `format.test.ts` case pins the `- > foo` conversion. The alias item lands before F-033, whose code check joins the same `typedInput` line as `text === ']' && !inCodeAt(scan, from) && inAliasAt(scan.text, from)`. The `pipeRow` call lands with F-020, which rewrites the two lines above it in `cellCommitChange`.

##### F-069 · An unused type, a field only tests read, a needlessly optional host member, and one line copied in two components.

> **Area:** MarkdownPM · **Lens:** Dead Weight · **Weight:** Low · **Size:** S · **Net:** −6 · **Origin:** Residue

**Finding**

Four leftovers cost a reader time and a person nothing. `AcQuery` in `Autocomplete/autocomplete.ts` is defined and read nowhere in the repository. The section-level `at` on `BlockMenuMatch` (`Core/Actions/blockMenu.ts`) is written by `filterBlockMenu` and read only by `blockMenu.test.ts`; `BlockMenuPane` reads each row's `at` and never the section's. `EditorHost.paneGeometry` is optional though the one production builder in `Core/Pages/editorHost.tsx` supplies it and only the test harness omits it, so both readers call it through `?.`. `PageView.tsx` and `PageTile.tsx` each spell the same `renameHeading` mutation inline for `onHeadingRename`. Confirmed by reading and a repository-wide search, and typed on a scratch worktree.[^69]

**Fix | Literal**

`AcQuery` and the section `at` are deleted; `blockMenu.test.ts` loses its four section-`at` lines and the one test that asserted only a section's null `at`, whose remaining title check `:62-65` already pins, while every row-level `at` pin stays. `paneGeometry` becomes required, its two `?.` calls in `MarkdownEditor.tsx` and `useConnectionAutocomplete.ts` become plain calls, and `harnessHost` supplies a no-op stub; the type check is the pin, since a host builder that omits it no longer compiles. One `renameHeadingIn(path)` in `Core/Pages/editorHost.tsx`, which both callers already import, replaces the two inline closures. Nothing a person sees changes.

#### W13 · Documentation

The editor's feature and guideline documents contradict the code in a dozen sentences, and the cleanup's taken fixes turn five more false. Landing this makes the documents describe the editor as it stands once that work lands.

##### F-071 · The editor's documentation says eleven things the code doesn't do, and five more go false as this cleanup lands.

> **Area:** MarkdownPM · **Lens:** Divergence · **Weight:** Low · **Size:** S · **Net:** 0 · **Origin:** Drift

**Finding**

A reader of `MarkdownPM.md` is told things the editor doesn't do. Its folder map says `Guards/` holds the transaction filters, though `headingRenameSettle.ts` there is a ViewPlugin that rewrites links, and it places the editor's menu models in `Menus/` when they live in `Core/Actions/`. It says a Text value reads the inline marks alone and that fences stay literal in a table cell, though both a cell and a Text value read a fence pair as code (`tokenizeChunk` suppresses every mark between the fences). It says a nested list run counts from its first number or letter, and that **Type ▸** does the same, where `renumberRuns` and `setListKind` count from 1 or A. It counts four ways to create a page embed, where the `/` menu's Embed ▸ Internal Page is a fifth; it says a citation's number leads back to its first marker, though with no marker bound the press copies `[^label]`; its Plain grip row omits rules and math, which also take that grip; it says fifteen code languages carry a mark, where `CODE_TAGS` holds eleven; and one sentence reads "on disk;here". `Editor-Internals.md`'s cell-model entry lists fences among what a cell renders as literal text. Each was confirmed against the code.[^71]

The taken fixes turn five more sentences false. F-042 changes what Paste As offers a copied markdown link (`MarkdownPM.md`) and lets a Link property store a markdown link whose target is a dotted address as that address (`PropertiesPM.md`); F-054 makes a page embed in a cell or a Text value draw and act as the connection it names, where `ConnectionsPM.md` says such a form is never a connection; F-066 adds a fourth intentional divergence from CommonMark to `Editor-Internals.md`'s fence entry; and F-059 has a landing from another mount re-take each fold's end from the live section, beside the fold entry's account of regions rewritten under a fold. This finding covers the taken work; the sentences that follow deferred work (F-093's scope threading, F-094's connections member, F-067's HTML sealing) stay with those findings.

**Fix | Literal**

Each sentence takes the most surgical correction. In `MarkdownPM.md`: `Guards/` reads "the transaction filters that refuse or repair an edit that would corrupt a construct, and the settle that carries a heading rename to the links naming it"; `Menus/` reads "the block handles, the editor's side of its menus, and the pane controls its pickers share, over the menu models in `Core/Actions/`"; the scope sentence ends "with a fence pair read as code in all three"; "on disk; there is no intermediate model"; both list clauses count "from 1 or A"; the cell list entry reads "Headings, quotes and rules stay literal text, and a pair of fences shows as typed while the lines between them read as code, their marks and connections left literal"; the page-embed list names "**Embed ▸ Internal Page** in the context menu and in the `/` menu" and counts five ways; the citation number "leads back to its first marker, or, where no marker binds it, copies its `[^label]` reference"; the Plain row reads "(paragraph, quote, callout, code, rule, math)"; "eleven languages carry a mark"; and the Paste As sentence reads "a copied connection, or a markdown link naming a page, offers Connection and Markdown Link, keeping its label and heading, and Embedded Page where it names no heading; a markdown link whose target is a web address offers what an address does". `PropertiesPM.md`'s Link sentence reads "a connection naming a title no page answers to is refused at commit, as a malformed address is, and a markdown link whose target no page answers to stores as the address it is". `ConnectionsPM.md`'s scope entry adds that each embed renders "on a page as a live tile, and a page embed in a table cell or a Text value, where no tile forms, draws and acts as a connection". In `Editor-Internals.md`, the fence entry's list reads "Four divergences … and a raw-HTML block whose closer never arrives ends at the next blank line rather than at the end — the parser is handed both readings, the fence's marker masked and the unclosed opener handed over as a block the blank line ends"; the cell-model entry drops fences from what a cell renders literally ("a fence pair reads as code in a cell as on a page") and from its list of cell-side readers; and the fold entry adds "A body landing from another mount takes each fold's end from the live section instead." Five `Editor-Internals.md` sentences already untrue at the pin need no edit, since F-056, F-055, F-054, F-050, and F-075 bring the code to them: the atomic set held once per version, box constructs with no line margin, the embed claim's one owner, the one fence-aware heading scan, and the generator alphabet. This lands last, after F-068, F-066, F-054, F-042, and F-059, the code its new sentences describe.

#### W14 · Tests

The 92 MarkdownPM test files hold 1,696 tests on 15,436 lines; about 140 of them pin nothing a sibling doesn't, assert a vacuous shape, or exercise a state production never produces, beside 236 lines of setup the shared setup already installs. Landing these leaves each behavior pinned once, by an exact expectation, in the file that owns it, at about 830 fewer test lines. Each test file is opened once, after the last finding that edits it; the per-row list is *§Appendix: MarkdownPM Test Dispositions*.

##### F-072 · About 85 tests repeat a sibling or a library, and 13 more repeat a sibling except for one assertion.

> **Area:** MarkdownPM · **Lens:** Duplication · **Weight:** Low · **Size:** M · **Net:** 0 production (≈ −548 test lines, F-073's rows included) · **Origin:** Parallel Build

**Finding**

A change to one behavior means editing several tests that pin it the same way. About 85 tests carry the same input and assertion as a named sibling, check a library behavior (`parser.test.ts` checking that `gfm()` parses, which every table test already needs), or check something true by construction; the largest holders are `regressionPins.test.ts`, `Menus/blockMenuFlow.test.tsx`, `Autocomplete/aliasPicker.test.tsx`, `Guards/citationGuard.test.ts`, and `Menus/gripMenuFlow.test.tsx`. Thirteen more repeat a sibling except for one assertion, among them the five "…and without the guard…" cases in `citationGuard.test.ts`, which run with no guard mounted and are each the precondition of a guarded sibling. Every row was re-found by test name at `70fc6063c` and re-judged against its cited survivor. Two tests that look like repeats stay, since each is the only pin of a line: `Core/Pages/editorHost.test.ts:50` of `warmCache.ts:64`'s drop on a failed fence, and `cellAlias.test.tsx:88-95` of the `]`-only refusal once F-068 moves that condition to the call site.[^72]

**Fix | Literal**

Delete the repeats and fold each one-assertion copy into its sibling as the appendix lists, typed on scratch worktrees with every touched file green. Three folds turned out to be plain deletions, since mutation showed the sibling already covers them: `dragOrigin.test.tsx:100-119` (its sibling is retitled for the re-resolve it also pins), `gripMenuFlow.test.tsx:185-191`, and `connectionCommit.test.tsx:50-54`. Imports that lose their last user go with the tests, and the `autocomplete.test.ts` test that then leads its describe is retitled. `aliasGuard.test.ts:30-32` goes with F-068's deletion of the whole file. The `line bounds` test left alone in `parser.test.ts` moves to `detect.test.ts`, which already pins `markdownCode.ts`'s other helpers, and the file goes. In `citationGuard.test.ts` and `citationCreate.test.tsx` it applies before F-075, whose rewrites there fall inside its deletions. Rows in the table tests that mount `MarkdownTable` bare (`cellLinks`, `cellAlias`, `dragOrigin`, `cellStatic`, `cellNavigation`, `widget.test.ts`) are re-found by test name after F-019 makes the table's props required.

##### F-073 · About 30 tests pass whether or not the bug they name is present, and 8 pin the right thing in the wrong file.

> **Area:** MarkdownPM · **Lens:** Coverage Gap · **Weight:** Low · **Size:** M · **Net:** 0 production (counted in F-072) · **Origin:** Shortcut

**Finding**

About 30 tests are too loose to fail on the regression they name: `not.toBeNull` or `?.insert).not.toBe('')` where an exact edit is the pin (`edits.test.ts`, which passes on `null`), `toContain` on a document that also contains the corrupted form, a `some(...)` that survives a first/last swap (`intents.test.ts`), a mount without `connections` so the menu is null for every link (`externalLink.test.tsx`, `linkEdges.test.tsx`), and a uniform table where an average can't be told from a constant (`operations.test.ts`). Where mutation was run, the tightened form goes red where the original stayed green; six `edits.test.ts` tests fail on an off-by-one `autoPair` selection where one did before. Eight sound tests pin a function their file doesn't own: `cellLists.test.tsx`'s "what a GFM cell can hold" pins `restoreTrailingItem`, which `codec.test.ts` leaves unpinned; `embedInsert.test.ts`'s pair hands off to `autocompleteQuery`; `citationCreate.test.tsx:387-392` and `indexSeed.test.ts:327-331` pin scan ordering and a table cell shaped like a footnote head; and `codec.test.ts:44-47`'s pipe-in-code case is a region question. Two tests that look loose stay as they are: `intents.test.ts:613` is the only pin that an escaped `\[^1]` counts as a word and an unbound `[^9]` as none, and `connectionCommit.test.tsx:118-135` already fails when the closing-animation refusal is removed.[^73]

**Fix | Literal**

Tighten each to the exact expectation the appendix gives, every value captured by running the call at `70fc6063c`: the callout's `lineClasses` hold five entries, the list item's own included; `regressionPins.test.ts:143` tightens to its exact selection, since it's the only pin of `'` in `CLOSERS`; `edits.test.ts` uses `toMatchObject({ insert, selection })` where a full `toEqual` would wrap to six lines, since every `autoPair` branch there returns `from = to = c`; and `prefixSeat.test.tsx:155` pins the exact joined document a forward Delete at a footnote row's end leaves, which is ordinary editing. Move the eight to the files that own them; the `codec.test.ts:44-47` case lands in `regions.test.ts` titled for what it pins, that a pipe inside inline code still splits a cell under GFM, so an over-split header is no table. Its `subfieldStats.test.ts` tightenings land after F-044, which adds its own tests to that file.

##### F-074 · About 400 lines of per-file test setup install what the shared setup already installs.

> **Area:** MarkdownPM · **Lens:** Dead Weight · **Weight:** Low · **Size:** S · **Net:** 0 production (≈ −406 test lines) · **Origin:** Residue

**Finding**

Thirty-two test files repeat setup that never takes effect. `UIX/vitest.setup.ts` installs a no-op `ResizeObserver` for every Core suite through `Core/vitest.setup.ts`. Nine table tests carry a guarded seven-line copy that never runs, two more carry guarded blocks, nineteen files carry an unconditional six-line `ResizeObserverStub` that overwrites the shared stub with an identical one, and `embedResize.test.tsx`'s `Watcher` is the same no-op. Four of the table tests also set `IS_REACT_ACT_ENVIRONMENT = true` after their module-level `stubEditorBridge()` already has, and `readOnlySelection.test.tsx` hand-rolls the 32 lines that `mountEditor`, `cleanupEditor`, and `stubEditorBridge` provide. Deleting every stub and running all touched files through the root config passed, which proves the chain. Twenty-five test files outside the editor carry the same no-op stub through the same chain, since `UIX/vitest.config.ts` runs the same setup file: seventeen unconditional copies across Properties, Matrix, Glance, and the UIX menus and pickers, four guarded copies (`LinkCell`, `PropertyValueInput`, `TextPane`, `Slider`), two `??=` copies (`PageView`, `pendingTravel`), and two `vi.stubGlobal` copies (`AssetImage`, `ImagePicker`), about 170 lines; deleting one of each form, in Properties, Session, Assets, and two UIX suites, passed the same way.[^74]

**Fix | Literal**

Delete the stubs, `embedResize.test.tsx`'s `Watcher` with its `vi.stubGlobal` and `vi.unstubAllGlobals` lines, and the four flags; `cellNavigation.test.tsx:9`'s comment, which explained only the stub, goes, and `headingColRemap.test.ts:12`'s is reworded to the host it still explains. The twenty-five copies outside the editor go in the same change. The stubs in `dragOrigin.test.tsx`, `cellSweep.test.tsx`, `TileGrid.test.tsx`, `TileHost.test.tsx`, `MatrixView.test.tsx`, and `Scrollbar.test.tsx` stay, since they capture the observer's callbacks and fire them by hand. `readOnlySelection.test.tsx` is rewritten on `mountEditor`; it keeps the `contenteditable="true"` expectation and stays the pin that a read-only mount stays editable (red when `editable` follows `readOnly`, or when the change filter admits every change).

##### F-075 · The shared test builders read footnotes and alias memory differently from the app, and the scan's random generator never types a `~` diff line.

> **Area:** MarkdownPM · **Lens:** Duplication · **Weight:** Low · **Size:** S · **Net:** 0 production (≈ −49 test lines) · **Origin:** Parallel Build

**Finding**

The tests built on these helpers check rules the app never runs. `citationScan(d, excluded)` in `Core/Testing/markdownEngine.ts` rebuilds footnotes through `codeMask` and a caller-supplied exclusion list; all 17 callers pass `[]`, while production's `scanDoc` seals fences, maths, and tables through `inSealedLine`, and the two `scanOf` helpers in `citationGuard.test.ts` and `citationEdits.test.ts` assemble exactly a `DocScan` by hand; `citationBreakage.test.tsx` and `citationEdits.test.ts` each define the same `stranded` helper over `citationScan`. The harness's alias memory (`aliases.remember` and `forget` in `editorHarness.ts`) skips production's trim, empty, and unchanged-first guards and bumps a re-render counter instead of firing `aliasWatchers`, which forces `connectionCommit.test.tsx` to fire watchers by hand. The scan's randomized property generator in `Engine/docScan.test.ts` holds no `~`-signed line in `LINES` and neither `~` nor `+` in `CHARS`, though the scan reads `~` as a modified diff line (`'mod'`), against the rule that a construct the scan learns joins the generator's alphabet in the same change; the risk is small, since diff kinds derive per whole fence. Confirmed by reading and typed on a scratch worktree.[^75]

**Fix | Literal**

Every caller reads `scanDoc(text).citations`, or `scanDoc(text)` where it built a scan, so `citationScan` and both `scanOf` helpers are deleted, and one `stranded` over `scanDoc` joins `Core/Testing/markdownEngine.ts` for the two citation files; no expectation changes except a self-comparison in `citationGuard.test.ts`'s sequence test, which F-072 deletes. The harness alias memory takes production's shape: it calls `rememberAlias` or `forgetAlias` on the current list, stores the answer and fires `aliasWatchers` when it isn't `null`, and does nothing when it is, as production writes nothing then; `bump` and its `setTick` state go, matching production, where an alias change re-renders nothing, and `connectionCommit.test.tsx`'s hand-fired loop becomes one `forget` call through the host. `'~changed'` joins `LINES`, and `~` and `+` join `CHARS`, written as a spread string so the literal stays one line; the three properties pass at their default seeds. In `citationGuard.test.ts` and `citationCreate.test.tsx` this lands after F-072, whose deletions take two of its rewrites. Its `editorHarness.ts` change lands beside F-069's `paneGeometry` stub.

#### W15 · Focus and Closing Animations

The kit's buttons show no keyboard focus, and a closing list inside a pop-up pane reopens at the next dropdown pressed. Landing this makes keyboard focus bounded and visible across every menu and picker the app opens.

##### F-076 · Buttons never show keyboard focus.

> **Area:** UIX · **Lens:** Divergence · **Weight:** Medium · **Size:** S · **Net:** +4 · **Origin:** Drift

**Finding**

When you move through the interface with Tab, the kit's buttons (toolbar, window, and menu-footer controls) show no sign of having focus. The `button` style sets `outline: none` and puts nothing in its place, while menu rows light a ring on `:focus-visible` through the shared `fieldRing` channel and fields through `focusRing`. One keyboard walk therefore alternates between visible rows and invisible buttons. `button-base.css.ts:80` sets `outline: 'none'`, the file's only `:focus-visible` rule is `revealOnHover`'s opacity, and none of the 9 `focus-visible` rules across Core and UIX stylesheets targets `button`.[^76]

**Fix | Literal**

Give `button` the row's ring: `'&:focus-visible': { boxShadow: fieldRing(ROW_RING), vars: { '--field-ring': tintAt('var(--accent)', 'secondary') } }`, composed with `outlined`'s inset shadow where both apply. Leave the view strip's suppression (`view-strip.css.ts:45`) as it is, since an Enter-committed rename drops focus onto the segment and a ring would flash after every rename.

##### F-077 · Inside a pop-up pane, pressing a second dropdown while one list is open cuts the list's close short and reopens it at the new dropdown.

> **Area:** UIX · **Lens:** Defect · **Weight:** Low · **Size:** S · **Net:** +8 · **Origin:** Shortcut

**Finding**

When a dropdown's list is open inside a pop-up pane, such as a view tile's settings, pressing a second dropdown in that pane closes the first list and opens the second, but every such list is drawn by one shared pane, so the closing list stops partway through its exit, jumps to the second dropdown, and blooms open there with the new rows. The same press in the toolbar's settings pane only closes the list, because there the list itself draws the full-screen shield that takes the press, and a release after the shield is gone reaches nothing. One settings pane therefore answers the same press two ways depending on where it's opened. `onPointerDown` dismisses every layer above the one holding the press and swallows the release only when the press lands on the closing list's own trigger, and only the lowest shielded layer draws a shield (`shields`), so under `ViewTile`'s settings `PickerMenu` the list draws none, while under the toolbar's unshielded pane it does. `PickerControl` opens on click through `popMenu` and `presentMenu`, which feed the single `PickerMenu` in `MenuPresenter`, and `useExitPresence` clears `closing` as soon as `open` returns to true. A probe in the project's Electron 42 (Chromium 148) confirmed that a press whose target is removed before the release fires no click, which is why the toolbar case swallows the press.[^77]

**Fix | TBD**

Either every outside-press dismissal calls `suppressReleaseClick()`, so the tile pane behaves as the toolbar pane does, or clicks keep passing through and `MenuPresenter` holds each presented menu in its own `PickerMenu` until `onExited`, so the closing list finishes its exit while the new one blooms at its own trigger, as pickers that own their `PickerMenu` already do. Keeping the shield up through the exit doesn't reach this case, since the list in a shielded pane never draws one. **Your call:** whether a press that closes a list should also act on what it lands on.

#### W16 · The Host's Write Channels

Forty channels write Nexus files beside `mutate`. Landing this gives one door to every write that has no reason for its own.

##### F-078 · Forty channels write Nexus files beside `mutate`, and six files can be written through both.

> **Area:** Cross-Cutting · **Lens:** Growth Constraint · **Weight:** Medium · **Size:** L · **Net:** 0 · **Origin:** Parallel Build

**Finding**

Forty channels write Nexus files beside the one dispatcher, `mutate`: six view and container channels, seventeen property and schema channels, seven tile channels, five configuration channels (personalization, the excluded folders, the asset folder, the Matrix, and navigation), asset adoption, the page-body write and history restore, `exclusions:clear`, and `nexus:rename`. Four have a reason to stay separate: `nexus:rename` re-targets the whole session, `exclusions:clear` sweeps files the live tree deliberately doesn't hold, and `page:updateBody` and `tiles:writeMarkdown` carry a base-hash check and answer a stale write with a conflict. The other six tile channels wait on tiles having records, and the remaining thirty have no structural reason. Every family first appears after `mutate` (06-16): views 06-27, properties 06-29, personalization 07-05, and tiles 07-10 as `blocks:*`; nothing requires a new write to use it. Six files are writable through both `mutate` and a separate channel: a container's sidecar (`setActiveView` and `setDisclosureLock` beside `views:*`, `container:configure`, and `schema:*`), `settings.json` (`setProfileIcon` and `setProfileImage` beside `personalization:set`, `exclusions:set`, and `assets:setDir`), `state.json` (`reorderTop`, `reorderPanelContexts`, and `reorderSpaces` beside `nav:write`), `matrix.json` and tile boards (a delete's or move's configuration pass beside `matrix:write` and `tiles:*`), and `homepage.json` (`setBanner` beside `assets:setDir`'s migration). Every door settles through the one write gate, `withWriteRoot`, and `nav:write` and `matrix:write` also answer the window through the watcher, whose `pushConfig` re-reads the file on the app's own echo. The five `defEditOp` channels are one edit-a-definition-field operation. A new feature that writes a Nexus file therefore picks a door by hand.[^78]

**Fix | TBD**

Fold the thirty channels without a structural reason into `mutate`'s operation union, so a new write is one union entry, and keep `nexus:rename`, `exclusions:clear`, and the two base-hash body writes. The other six tile channels fold only once tiles have records, which nothing sizes yet. Every write already settles through the write gate's flush, so a folded channel needs no confirm of its own. `MutateReply` is one optional-field bag, and eleven folded channels answer something other than null (eight types), so the fold carries an op-keyed reply. CorePM's *§Mutations* and the comment on `mutateRequest` follow the fold.

##### F-079 · With two same-titled pages both deleted, restoring the first one deleted leaves the links to their title stripped.

> **Area:** Trash · **Lens:** Defect · **Weight:** Low · **Size:** S · **Net:** +10 · **Origin:** Shortcut

**Finding**

A delete leaves a title's Link values alone while a page outside it still holds that title, since those values resolve to the survivor. When two same-titled pages are deleted in turn, the first delete strips nothing and the second strips the values and records them in its own bundle. Restoring the first from the Trash lands a page the values would resolve to, but they stay stripped until the second bundle is restored; emptying the second bundle hands its rows to a namesake still in the Trash, or drops them once none remains. Before the survivor gate, the first delete stripped and recorded, so restoring the first brought the values back. The undo chord restores in reverse order, so it never produces the gap.[^79]

**Fix | TBD**

**Owner's call.** Either the delete records the rows for a title a survivor still holds without stripping them, and the refill counts a page already holding the recorded value as having taken it back, compared before the landed-title rebuild so a namesake landing as `Ideas (2)` leaves `[[Ideas]]` in place; or the survivor gate is withdrawn and the first delete strips again.

##### F-080 · Delete All and Restore All walk the whole Trash once for every bundle that hands a Link value to it.

> **Area:** Trash · **Lens:** Hot Path · **Weight:** Low · **Size:** M · **Net:** +15 · **Origin:** Shortcut

**Finding**

Emptying a bundle hands the Link values its record kept, and any its empty-time strip took, to a same-titled page still in the Trash through `parkLinks`, which lists every bundle and each Set or Collection bundle's pages. The Trash frame's Delete All sends one request per row, so a batch of link-carrying bundles walks the Trash once per bundle: about 13 ms per empty at 100 bundles and 32 ms at 300, summing to about 0.45 s and 4 s.[^80]

**Fix | Proposed**

Send the frame's Delete All and Restore All as one request carrying the bundle list; the host reads the Trash's titles once for the batch and strikes each emptied bundle's titles from that map as it goes. Single-row empties and restores keep today's path.

#### W17 · Opening and Watching a Nexus

Every change to a Nexus is one file event, applied in place, with a walk as the fallback. What stays open here is where that path places less than a walk would or drops what it collected, the writes and stores that do more work per change than they need, the stamps that replace an ID the app could recover, and the two registries' journals and sweeps, which still run as two machines. Landing this makes an own write and an outside edit land the same way, at a cost proportional to what changed, with every entity keeping its identity.

##### F-081 · Resetting Sync's records loads every one and deletes them one at a time, and the index's path renames and removals commit table by table.

> **Area:** Desktop · **Lens:** Hot Path · **Weight:** Low · **Size:** S · **Net:** +6 · **Origin:** Drift

**Finding**

The page index (`nexus.db`, the local database that answers link, heading, and value lookups) writes a batch of page rows inside one transaction, but its path methods don't: a page or folder rename and a page or folder removal run one statement per index table, each compiled on the call and committed on its own, so the tables can disagree about a path when the app stops between them. Sync's records sit in the same store, and connecting to a new hub or disconnecting reads every record, its stored base included, then deletes each in its own commit, a cost that grows with the Nexus while the user waits on Sync's settings. `upsertPageIndexes` prepares its inserts once and wraps its rows in `inTransaction`, while `removePathIndex`, `renamePathIndex`, `removePathPrefixIndex`, and `renamePathPrefixIndex` loop over `INDEX_TABLES` with a fresh `db.prepare` each, and both `Core/Sync/handlers.ts` sites run `for (const row of readAllBases()) deleteBase(row.path)`.[^81]

**Fix | Proposed**

Build the path methods' statements once per handle inside `contentIndexStore(db)` and wrap each method's body in `inTransaction` from `Desktop/Store/driver.ts`. Add a `clearBases()` (`DELETE FROM sync_base`) to `syncStore` and use it at both `Core/Sync/handlers.ts` sites.

##### F-082 · An in-app create or rename of a Space, or rename of a Context, leaves the pages already tagged with its new name unlinked until each is read again.

> **Area:** Contexts · **Lens:** Divergence · **Weight:** Low · **Size:** S · **Net:** +10 · **Origin:** Shortcut

**Finding**

A page tag that names no Space, such as `Projects: [Alpha]` before Alpha exists, stays in the page's file, and every read of the page resolves its tags again, so a Space made outside the app links the pages already tagged with its title at the next walk. Creating a Space, or renaming a Space or a Context, in the app places the node in the held tree from the app's own file event, so a page whose kept tag comes to resolve to it stays unlinked in that tree until something re-reads the page or walks the Nexus: the Space's members, a view's Context column, and the Matrix leave those pages out until the page is saved or edited, or until the next open, Reload, or event the settle can't place. The page's own Property Panel, which resolves its tags against the tree as it renders, already shows the Space. A rename's sweep rewrites the pages holding the old name, and each rewrite relinks its page, so only the pages that already held the new name are missed. `applySpace` places a Space the tree doesn't hold from an own write without a walk; a Space or Context rename's `relocate` lands as an own move that `applyMove` places through `moveNodeInTree`, which renames a Context's group in place, so `applyContexts`' `regroup` then finds the new title already held; and only `applyPage` and the walk resolve a page's kept tags, through `contextLinker`.[^82]

**Fix | Proposed**

The settle's placement of a new or renamed Space, or a renamed Context, resolves the kept tags of the pages holding that Context's key against the new name and patches the pages that resolve to it, in place of owing a walk on every create.

##### F-083 · Contexts and Properties each carry their own journal, replayer, and sweep loop for one pattern.

> **Area:** Contexts, Properties · **Lens:** Growth Constraint · **Weight:** Low · **Size:** L · **Net:** −150 to −300 · **Origin:** Parallel Build

**Finding**

Both registries are a Nexus-wide list whose names appear as keys in files, so a rename or delete sweeps every holder. The code implements that twice. The two share one `journalSlot` and resolve Contexts through one lookup, `contextWorldOf`, but keep two journal vocabularies over that slot, two replayers at two points of the open (`Core/Nexus/handlers.ts:82`, `:102`), opposite commit orders (a property rename commits the registry first, a Context rename last), and nine enumerate-lock-read-decide-write loops where one shared walk would serve. The two also report differently. A property rename, a property delete, and an option rename report the files they skipped whether or not the journal took their record, with a Try Again that replays the record they hand back; a Context or Space rename reports them too, with a Try Again that sends the request again rather than replaying the record, since a later rename displaces a journal record a prior rename holds; and an option remove offers Try Again only while its record holds the slot (F-084). The sweeps and the check that guards them list Space sidecars by a disk scan (`spaceSidecars`), where every other reader takes Spaces from the tree: a schema sweep holds the `.nexus` lock and a Context rename the Contexts lock, so a sweep can meet a Context folder that has moved ahead of the tree, and the Context-rename replay sweeps before a tree is held. A Context or Space delete has no crash recovery of its own: one cut short leaves its write-ahead record in the bundle, and deleting again finishes it, where a rename's journal finishes at the next open.[^83]

**Fix | TBD**

One journal-and-replay path and one sweep loop shared by both registries, while they stay separate things to the user. It needs one commit order for both, which changes crash recovery for one of them, and that order is designed and defended here. The shared path carries what each machine leaves today: a record for a Context or Space delete that carries the bundle, with a replay that finishes the sweep, the folder's move, and the configuration reach across both Trash modes; one rule for reporting skipped files and offering Try Again across every rename, delete, and option operation; and room for more than one held record, so an option remove's Try Again rides a record of its own (F-084). With one commit order and a replay that runs once the tree is held, the sweeps and their check take Space sidecars from the tree together, counting a Space the tree lists unreadable as a skip, which retires `spaceSidecars`' scan; moving the check alone would refuse against a list the sweep doesn't write through.

##### F-084 · An option remove the journal refused reports the files it skipped without Try Again.

> **Area:** Properties · **Lens:** Divergence · **Weight:** Low · **Size:** S · **Net:** +15 · **Origin:** Drift

**Finding**

An option remove writes a journal record before sweeping the files that hold the value, and a file the sweep can't update is reported as "Couldn’t update N files." The journal refuses a write while another operation's record holds its one slot or the slot can't be read, and the remove then runs unjournaled: its notice carries the line with no Try Again. The option stays in the definition until every holder is swept, so removing it again reaches the skipped files, but nothing tells the user so. A property rename, a property delete, and an option rename in the same state hand back the record they owe and offer Try Again through it. An option remove can't, because an option has no identity beyond its value: one removed and added back reads on disk exactly as one still owed, so a record handed back after the slot let it go could strip an option the user added again. `removeOption` answers its record only when `writeSchemaJournal` took it, `schemaCascade` sets `owed` only from a record it's given, `retryOwed` shows a line with no `owed` through `notifyReport`, and `replaySchemaCascade`'s option-remove arm acts on a handed-in record only while the slot still holds it.[^84]

**Fix | TBD**

Either an option gains an identity beyond its value, so a handed-back record can tell the option it removed from one added since and the remove answers its record as the other three operations do, or the remove's record rides the multi-record journal F-083 designs, so the slot never refuses it.

##### F-085 · A page missing its ID that a folder's read finds after its own event was spent stays out of the tree until the next full read.

> **Area:** Nexus · **Lens:** Defect · **Weight:** Low · **Size:** M · **Net:** +10 · **Origin:** Shortcut

**Finding**

A page without an ID is stamped by its own watcher event, which arrives once the file stops changing, or by a listing under a folder newly in reach (a Try Again on the folder, or a folder a change of Excluded Folders admits). A folder's read leaves any other page missing its ID out of the tree, waiting for that event. When the event was already spent or never comes, the page is held nowhere, listed nowhere, and stamped by nothing until the next full read, which lists it under a Try Again notice; a full read only lists such a page, and only its own event, Try Again, or a reopen stamps it. Two routes produce it: a folder sidecar removed outside the app, whose folder the walk lists and the stamp reads again, and a Trash restore or move of a folder holding a page already listed missing. Apart from these, a settle that lands while a stamp pass is in flight can push a tree that still lists the page being stamped, so the window may post one Try Again notice for a page whose ID lands a moment later. `applyFolder` lists only the missing entries `stampable` returns, unless the tree had listed the folder unreadable for a reason other than a missing ID, and `stampable` takes a page only under a path in `owed.whole`; `walkWhileOwed` stamps from a walk's listing through the same filter; and `stampListed` splices `owed.stamp` empty before each `stampMissing` call, so `shown` hides nothing while that pass runs.[^85]

**Fix | TBD**

Either a folder's read, or a full read, stamps a page missing its ID whose file has sat still longer than the watcher's quiet window, which is the evidence a stamp needs that its writer has finished, or the page keeps a listed entry that its next read stamps. The notice half closes when an entry stays on the owed list until its stamp lands, which needs the two passes that can overlap (a write's gate and a watcher batch) to share the list without one taking the other's entries.

##### F-086 · A write's reply waits behind a walk an outside change owes.

> **Area:** Nexus · **Lens:** Hot Path · **Weight:** Low · **Size:** M · **Net:** +10 · **Origin:** Shortcut

**Finding**

A write the user makes while the app is re-reading the Nexus for an outside change waits for that read before its result shows and its reply returns. Every settle runs one at a time on one chain, and a walk an outside batch owes runs as a turn on it; a write that lands meanwhile queues its own settle behind the walk and, unless it's the editor's body save, restarts it. An icon change that answers in 1 to 3 ms alone took 98 ms during the walk of a 4,000-page Nexus, and the wait grows with the Nexus. It applies only while a walk is in flight, which a Space or Context leaving, a registry definition arriving from outside, or a change of scope owes. `settleNow` runs `settle` through `inTurn`, the chain `payOwedWalk` shares; `settle` begins with `walkWhileOwed`; and `applyOwn` marks the disk moved for every write but the editor's body save, so the walk in flight reads again.[^86]

**Fix | Proposed**

A write's own change is pushed, and its reply sent, ahead of a walk it didn't owe: the settle pushes what the applied events moved before it pays a walk another batch owed, and the walk's result follows as its own version.

##### F-087 · A page renamed or moved while a refused Space or Context delete puts its sweep back keeps the swept state.

> **Area:** Contexts · **Lens:** Defect · **Weight:** Low · **Size:** S · **Net:** +8 · **Origin:** Shortcut

**Finding**

A Space or Context delete strips its tag from every member and, when one member can't be written, puts back each file it changed and refuses, counting any file it couldn't put back. The putting back reads each file at the path the sweep wrote, and a page the user renamed or moved in the app meanwhile is no longer there: it's passed over, so the page keeps the stripped tag and the refusal's count of files it couldn't put back leaves it out. The app's page rename and move don't take the Contexts lock the delete holds, so nothing orders them. `undoSweep` returns on `now === null`, `unlinkMembers` sums only what `undoSweep` answers, and `dispatch` sends `rename` and `movePage` outside `underContexts`.[^87]

**Fix | Proposed**

`undoSweep` finds a page that left its path by the ID the sweep read from it, through the held tree, puts it back there, and counts it when no live path holds that ID.

##### F-088 · An outside edit to a page inside a folder the app just renamed or moved is lost until the page's next event.

> **Area:** Nexus · **Lens:** Defect · **Weight:** Low · **Size:** S · **Net:** +8 · **Origin:** Shortcut

**Finding**

When the app renames or moves a folder, the held tree carries the folder's pages to the new path at once, as it last read them. An outside edit to one of those pages that the watcher reports under the old path, in a batch that settles after the move, reaches a path that no longer exists: the index drops that path's rows and the tree finds no page there, and the events the move raises at the new path fall inside the move's echo window and are dropped as the app's own. The page shows its earlier state in the tree, the index, and the window until its next edit or the next full read. `applyMove` places the move through `moveNodeInTree`, which carries each node as held; the old path's event reaches `applyPage`, whose `applyFolder` call finds the folder gone and answers `'ok'`, and `indexWrittenPage` removes the path's rows when `stat` finds nothing; `relocate` records both folder paths without bytes, so `isRecentWrite` drops a descendant's event for `PREFIX_WINDOW_MS` (800 ms) whichever side of the move it names.[^88]

**Fix | Proposed**

The move's echo record carries its destination, and a watched event under the vacated path within the window is re-aimed at the path the move landed on, so the edit reaches the page it belongs to.

##### F-089 · An ID lost or damaged outside the app is replaced rather than recovered on every path but a held page's own event, and an ID two files share is answered three ways.

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

The device already keeps what the last open saw, the record baseline, keyed by ID with each entity's path, but only the remint ledger reads it, the open's adoption pass runs before this Nexus's store is open, and the held page's restamp reads only the stamp entry, which a failed stamp spends. `applyPage` alone pushes `held` onto `owed.stamp`, and `listUnreadable` keeps no `held`, so `oweRetry` and the open's `stampMissing` hand `stampPage` none; `stampPage` mints through `contentIdAt` for a `missing` admission or an overwritten `malformed` one, `stampFolder` through `newId()`, `ensurePageId` through `stampPage`, `ensureIdentity` over an id-less `nexus.json`, and `ensureContextsRegistry` through `seededRegistry`; `contextEntry` requires a non-empty `id`; `idHeld` checks pages alone; `stampAdopted` runs inside `prepareOpenedNexus`, ahead of `openStores`; `readBaseline` is read only by `runOpenLedger`.[^89]

**Fix | Proposed**

One previous-ID lookup serves every stamp, and the comment in `stampPage` marking this approach goes with it.

- **The Lookup:** the ID the listed entry or the held tree last held at the path, else the one the record baseline places there, written back unless another entity holds it by then.
- **Every Stamp:** `stampPage` and `stampFolder` take it for a `missing` admission and a `malformed` one alike, so Try Again, a restore, and the open recover rather than mint. A listed entry keeps the ID its entity held, so a failed stamp's Try Again still has it.
- **The Open:** the adoption pass runs once this Nexus's store is open, or is handed its baseline.
- **Contexts:** the registry reads past an entry missing its `id`, which takes the same lookup by its folder's path, and a deleted registry is rebuilt from the Contexts folders and the baseline rather than reseeded.
- **The Nexus:** the app's record of opened Nexuses keeps each one's ID by path, which `ensureIdentity` reads before minting.
- **Duplicates:** the walk and an entity's own event leave a second claimant of an ID out of the tree, listed with a Try Again that re-mints it; the original is the path the baseline holds, or the eldest by birth time where it holds none. `recordsOf` then lists each ID once, so one rule remains, and the unanswered ID in `heldPages.ts`'s `byId`, the ledger's `duplicates`, and `pickEldest` go.

#### W18 · Where Host and Window Code Live

Nothing in a file's location says whether it runs in the host or the window, and several files sit in another domain's folder. Landing this gives each domain one host-side subfolder and fixes the misplaced files and names; it follows the preferences workstream because several channel moves ride those fixes.

##### F-090 · Nothing in a file's location says whether it runs in the host or the window, and several files sit in another domain's folder.

> **Area:** Cross-Cutting · **Lens:** Growth Constraint · **Weight:** Medium · **Size:** L · **Net:** 0 · **Origin:** Drift

**Finding**

Pommora's code runs in two places, the host process that owns the disk and the window that draws the interface, but every Core folder mixes both kinds of file at its root, so a reader can't tell from a path which side a file runs on, and a new file's author learns it only when the host-graph test goes red. Several files also live in a folder they don't belong to: the floating windows' pure tab model and file schema sit in the Interface component folder, so the store and the channel contract import upward into it; the Nexus-wide governed-write machinery sits in Properties while five other domains use it; the Views root mixes host handlers, window files, and Settings-pane models; and the Settings and Interface channel tables each serve the other's channels. An import-graph closure from Desktop's node-side files reached 205 Core and UIX files spread across nearly every folder (Properties 23 of 70, Views 6 of 58, Interface 4 of 68), while `hostGraph.test.ts` checks only file extensions and an external allowlist.[^90]

**Fix | TBD**

Two parts. (1) The taxonomy: each domain gets one host-side subfolder holding its `handlers.ts` and the file-backed modules those reach, pure shared modules stay at the root, and `hostGraph.test.ts` asserts every host-closure file sits in one. (2) Moves that stand regardless: `windowTabs`/`windowRecord`/`windowState`/`windowCache`/`windowMorph` into `Core/Navigation/` beside `tabsModel`/`tabsState`/`warmTabs`, which keeps `Core/Session` as the store layer; `governedSweep`/`governedWrite`/`journalSlot` into `Core/Files/` and `keyHolders` into `Core/Index/`; `filterModel`/`visibilityModel` into `Core/Views/Settings/` and `placeNew` beside the Session creates; `theme:systemAccent`/`host:platform` into `interfaceHandlers` and `devicePrefs:*` into `settingsHandlers`; `chrome.ts` dissolves (`ThumbRect` moves beside its producer in Navigation). **Your call:** whether to ratify part (1)'s taxonomy of one host-side subfolder per domain, enforced by `hostGraph.test.ts`.

#### W19 · Editor Work on Every Keystroke

The page editor re-parses a whole fenced block for its colors on every keystroke inside it. Landing this bounds the parse to the lines that changed, on the editor's most frequent trigger.

##### F-091 · Code-block coloring re-parses the whole fenced block on every keystroke inside it.

> **Area:** MarkdownPM · **Lens:** Hot Path · **Weight:** Medium · **Size:** M · **Net:** +20 · **Origin:** Shortcut

**Finding**

Code colors come from parsing each visible fenced block with its language, and the parse is remembered by the block's exact text. Any keystroke inside a block therefore misses the memory and the whole block is parsed from scratch, even when only a few of its lines are on screen, so typing in a long code block lags in proportion to the block's length. While a language is still downloading, each redraw also attaches another "loaded" callback. Parsing through the same parser cost 2.4 ms per keystroke at 100 lines, 13.1 ms at 1,000, and 38.6 ms at 3,000, since `paint` joins every line of the block and reads the tree through the text-keyed `drawnLast` while `blockParser.parse(text)` runs with no fragments.[^91]

**Fix | TBD**

Keep the previous tree and its `TreeFragment`s per block, keyed by the opener line mapped through the transaction, and reparse with `TreeFragment.applyChanges` in block-local coordinates so an edit re-parses only around the change; or, simpler, parse only from the block's start through the viewport's last visible line. Attach one load callback per language through a module-level set of pending loads.

#### W20 · Error Surfaces

##### F-092 · Every call site chooses for itself whether an error is shown, logged, or dropped, and about forty host-side failures reach no one.

> **Area:** Cross-Cutting · **Lens:** Growth Constraint · **Weight:** Medium · **Size:** L · **Net:** 0 · **Origin:** Drift

**Finding**

The window's reporter offers several helpers (`reportRefusal`, `persist`, `notifyReport`, `notifyRetry`), and each caller picks one and, for `persist`, whether it's quiet: settings, footnote visibility, and view options post a notice; folds, embed sizes, the glance size, navigation lists, and the session writer log. About forty `console.error` lines across `Core` and `Desktop` record host-side failures in background passes (the index seed, the repair sweep, re-mint, schema replay), and none reaches the user. Sync's failures travel a fourth way, as a status the Settings pane draws. The user-facing copy for an error is written inline at each site.[^92]

**Fix | Deferred**

Deferred from the Data Layer work by its Decision Log (M-1), which keeps only the host-to-notice path its own notices need. One table names each kind of error and decides its surface (a notice, a log line, a status, or nothing), the copy, and the action a notice offers; a call site reports a kind and never chooses a surface. *Error Surfaces — Brainstorm Brief* carries the five questions the design settles: the unit of a kind, host-side reach, other surfaces, mobile, and how batches and bursts collapse. Its home is one file readable by both halves, so the reporter's React hook and undo stack move out of `notifications.ts` first.

#### W21 · Scope and Host Seams

These prepare the editor for a surface that doesn't exist yet (a SidePane editor, a fourth Properties scope), and every one but F-096 was typed and compiled on a scratch worktree, so their nets are measured. They wait for the surface that needs them and land together, since F-093, F-094, and F-095 all rewrite `MarkdownEditor.tsx`'s extension list and `editorHost.tsx`'s builder, and F-097's grip table lives in F-093's predicates.

##### F-093 · Scope is a three-member string read by 22 bare comparisons and 13 `= 'page'` defaults, so a fourth scope silently inherits page behavior in some places and cell behavior in others.

> **Area:** MarkdownPM · **Lens:** Growth Constraint · **Weight:** Medium · **Size:** M · **Net:** +37 to +75 · **Origin:** Shortcut

**Finding**

A page, a table cell, and a Text value read different amounts of Markdown, and the code asks "is this the page?" or "is this the cell?" in twenty-two places across ten files instead of asking one question about what the surface reads. Thirteen parameters default to `'page'`, so a reader that forgets to pass its scope answers from the page-shaped scan. The only capability switches are `readsLists` and `blockGestures`. A new surface would be classified one site at a time, non-page at every `=== 'page'` and page at every `=== 'cell'`, silently. Inside a cell today the readers that forgot already diverge: `lineBodyBefore` and `opensLine` strip a `> ` prefix the cell draws as prose, `listDrag`, `listRenumber`, and `renumberRuns` read the quote-prefixed list grammar, and `blockDrag` takes block starts from the page's vocabulary; none of those is reachable from a glyph a cell draws, which is why this waits.[^93]

Inside a fence pair in a cell, the inline transforms and the cell's tokenizer agree in treating the paired lines as code, while `listLineAt` ignores the pair, so Enter continues a list line inside it. A cell and a Text value keep reading fences as they do today, and MarkdownPM.md's "fences stay literal text" is corrected to say the pair is read.

**Fix | Deferred**

Waits for a fourth scope. One `Core/MarkdownPM/Engine/surfaces.ts` owns the scope tuple, the `MarkdownScope` type, and the capability predicates `readsLists`, `readsBlocks`, `readsTiles`, `gripKinds`, and `hasGutter`; the twenty-two compares read them, the thirteen defaults go so a forgotten scope is a compile error, the zod enum derives from the tuple, and `blockPrefix`'s two helpers, `listDrag`, `listRenumber`, `renumberRuns`, `dropChanges`, and `blockDragExtension` take the scope. Typed as five switches it measured +75; as one table keyed by scope with the five capabilities as columns, about +37 with the same exhaustiveness. The `![[` query's page compare in `useConnectionAutocomplete` and `smartDelete`'s, which gates the tile hold and the footnote cascade, read `readsTiles` and `readsBlocks`. Lands with F-097, whose grip table becomes `gripKinds(scope)`. `format.ts`'s Lists ▸ menu, `tableGuard.ts`'s paste guard, `subBlockAt`, and `checkboxToggleChange` also read the quote-prefixed grammar with no scope, though in a cell each starts from a glyph drawn only on an unprefixed line; they take the scope with the rest.

##### F-094 · Connections reach the editor through a getter threaded through 23 signatures beside the host facet that carries everything else.

> **Area:** MarkdownPM · **Lens:** Growth Constraint · **Weight:** Medium · **Size:** M · **Net:** −50 · **Origin:** Parallel Build

**Finding**

Every host capability reaches the editor's pieces through one shared facet, except the page index, which is handed down by hand through about a dozen editor functions and built four ways: `() => ConnectionsApi | undefined` appears in 23 production signatures; the getter is built in `MarkdownEditor.tsx`, in TextPane, in `CellEditor.tsx`, and re-wrapped as `embedHost.getConn`; `buildEditorHost` keeps its own `connRef`, a change still needs a manual nudge, and `useEditorHost`'s memo lists `connections` though the builder never reads it. A new host supplies connections twice. The work is a rework of three editor mounts for no behavior change, which is why it waits for the surface that needs it.[^94]

**Fix | Deferred**

Waits for the SidePane editor. Connections become an `EditorHost.connections()` member read live through `view.state.facet(editorHost)`: the host is seated once and every member reads live, where a facet would need a Compartment in each of the three mounts. The parameter drops out of every intermediate, `embedHost.getConn` goes, `connRef` stays as the member's backing, the getter survives only in the resting cell and Text value renderers outside an editor, and the redraw nudge becomes one effect on `[host]`. A Text value's pane then reads connections from its last render, so a rename made in another window while the pane is open can trail by one render. Typed at −50. Lands on `editorBase`, whose `getConn` parameter it removes.

##### F-095 · What kind of surface an editor sits in is spread over five uncoordinated switches, two sentinel ancestor strings, and a CSS list of host classes.

> **Area:** MarkdownPM · **Lens:** Growth Constraint · **Weight:** Low · **Size:** M · **Net:** +30 · **Origin:** Drift

**Finding**

To mount the editor somewhere new, a host picks among `readOnly`, `active`, `locked`, `inert`, `pageSurface`, `preview`, a connections mode (`preview | window | inert`; the history window sets both "inerts"), and fake ancestor strings (`HISTORY_ANCESTOR`, `GLANCE_ANCESTORS`) that switch off nested embeds through `host.ancestors.length <= 1`, then adds itself to the placeholder selector in `markdown-pm.css`. The sentinels carry one latent misfire: `embedExclusions` excludes every ancestor's title, so a page titled "glance" or "page-history" can't be embedded inside a glance or a history snapshot.[^95]

**Fix | Deferred**

Waits for the SidePane editor. One `EditorSurface` union on `EditorHostOptions` in `Core/Pages/editorHost.tsx` (`page`, `tile`, `preview`, `snapshot`, `value`), switched once in a `traitsOf(surface)` that derives the connections mode, `pageSurface`, `liveEmbeds`, `placeholder`, `preview`, and `inert`; `EditorHost` gains `liveEmbeds` and `placeholder`, the sentinel ancestors go, and the CSS host list becomes one `.mdpm-quiet .cm-placeholder` rule the shell sets. A tile's and a Text value's connections mode stays the holder's, since the surface can't derive it. Typed at +30, most of it the switch in `editorHost.tsx`. Typed on top of F-094, so it lands after it.

##### F-096 · The host carries one typed menu member per construct, so a new construct menu needs a new host member in three places.

> **Area:** MarkdownPM · **Lens:** Growth Constraint · **Weight:** Low · **Size:** S · **Net:** ≈ −4 · **Origin:** Shortcut

**Finding**

Every kind of menu the editor shows (grip, table, footnote) has its own entry on `EditorHost.menus`, each of which the host only pops: `api.ts` imports the table and citation menu models to type them, `editorHost.tsx` builds each model only to `popMenu` it, and the test harness mirrors them. Confirmed by reading.[^96]

**Fix | Deferred**

Waits for the SidePane editor. One `menus.pop<A>(items)` beside `format`, with the editor building its own rows from the pure models; moving the model files alone counts for nothing. Not typed, so the net is an estimate. Lands with F-095, whose `EditorSurface` is where the SidePane adds its kind.

##### F-097 · A new block or tile kind falls through to silent defaults in the grip menu and block starts.

> **Area:** MarkdownPM · **Lens:** Growth Constraint · **Weight:** Low · **Size:** S · **Net:** +13 · **Origin:** Shortcut

**Finding**

Adding a new kind of block (images are planned) would get the plain grip menu and default behavior in four places with nothing flagging the miss: `contextFor`'s `default`, the `GRIP_KINDS` plain `Set`, `blockStarts`' `default`, and a `startsWith` action chain in `gripMenu.ts` that drops an unhandled action.[^97]

**Fix | Deferred**

Waits for the next block kind. `contextFor` and `blockStarts` switch over every `BlockKind` with the plain kinds listed, and `GRIP_KINDS` becomes a `Record<BlockKind, boolean>`; deleting one case or key at each site was confirmed to fail the typecheck. The action chain can't be made exhaustive, since its actions are template-literal strings the menu rows mint and its handler returns nothing, so a switch over them compiles with a case missing. Typed at +13. Lands with F-093, whose `gripKinds(scope)` is where the Record lives.

---

### Ride-Alongs

#### MarkdownPM

##### F-098 · The scan records its start-and-end ranges two ways, and carries adapters for both.

> **Area:** MarkdownPM · **Lens:** Divergence · **Weight:** Low · **Size:** M · **Net:** ≈ −2 · **Origin:** Drift

**Finding**

`DocScan`'s `Span` is a tuple for `maths` and `html` and an object for tables, embeds, and webpages, and `fromOf`, `toOf`, and the tuple-versus-object splits exist only because of that. Normalizing `maths` and `html` to `{ from; to }` and deleting the tuple arm touches about twenty `[0]`/`[1]` readers, many in `decorations.ts` and `folding.ts`, for a reduction of about two lines. Confirmed by reading.[^98]

**Fix | Proposed**

Normalize both to objects and delete `fromOf`, `toOf`, and the tuple arm in the change that next rewrites those readers; on its own, the churn outweighs the two lines.

##### F-099 · About thirty names are exported only for tests to import.

> **Area:** MarkdownPM · **Lens:** Dead Weight · **Weight:** Low · **Size:** S · **Net:** 0 · **Origin:** Residue

**Finding**

About thirty `export` keywords in MarkdownPM have a test as their only outside reader (`indentLevel`, `computeStats`, `buildWidgetDecorations`, `refreshTableEffect`, `connectionInsert`, `pendingTitles`, `foldedRegions`, `regionsOf`, `EMPTY_PAGE_TEXT`, and the rest). Each function lives in its file and does real work, so removing the keyword removes no line, and `lineIntentsInto` is the cached-assembly property's reference derivation. Several leave through F-068 and F-072.[^99]

**Fix | Literal**

None on their own; a keyword goes when its file is next rewritten.

##### F-100 · In a development build, a page holding an empty `*` item followed by a `[ ] task` line makes the Markdown parser throw.

> **Area:** MarkdownPM · **Lens:** Defect · **Weight:** Low · **Size:** S · **Net:** TBD · **Origin:** Shortcut

**Finding**

Under `npm run dev`, a body such as `*` on one line and `[ ] task` on the next throws inside `parse` and `tokenize`, so the viewport tokenizer and the footer's figures fail on that page; CodeMirror deactivates a plugin that throws for the rest of the session. The parser's task-list extension (`mdast-util-gfm-task-list-item`) asserts through `devlop`, whose `development` export condition Vite resolves in the dev build and whose default build in production is a no-op, so a shipped build is unaffected. `scanDoc` throws there too until F-015 lands, through the whole-table confirm in `regions.ts`, which is how it surfaced; after it, `parse` and `tokenize` still do. Probed in vitest under the development condition.[^100]

**Fix | TBD**

Either the parser wrapper masks the empty item the way it masks a lone fence marker, so micromark never sees the shape, or the dev build resolves the extension without the development condition. Pin it with `parse('*\n[ ] task')` under the development condition.

##### F-102 · A line holding only a non-breaking space ends a table, where the Markdown parser reads it as one more row.

> **Area:** MarkdownPM · **Lens:** Divergence · **Weight:** Low · **Size:** S · **Net:** TBD · **Origin:** Drift

**Finding**

A table followed by a line containing only U+00A0 draws as a table that stops above that line, while CommonMark readers and the editor's own parser keep the line as a body row. `tableRegions` ends a body at `line.trim() === ''`, and JavaScript's `trim` strips a non-breaking space where micromark's blank-line test doesn't. Probed while building F-015's property, whose alphabet leaves the case out.[^102]

**Fix | TBD**

End the body on CommonMark's blank line (spaces and tabs only) rather than `trim()`, and add the line to the table property's alphabet. Lands with or after F-015, which rewrites the same loop.

#### UIX

##### F-103 · Where a pop-up appears is worked out inside a 50-line block tangled with its screen updates.

> **Area:** UIX · **Lens:** Complexity · **Weight:** Low · **Size:** S · **Net:** +2 · **Origin:** Patch-Over

**Finding**

Every pop-up picker decides where to sit (flip up or down, center or pin to an edge, clamp to the screen, place its bloom origin) inside one closure in a layout effect, interleaved with latched decisions and state updates. It sits in one of the kit's most-fixed files, and testing any placement decision needs faked DOM measurements. The closure is `measure` in `PickerMenu.tsx`, and nothing in its logic needs React or the DOM. Git history shows 15 commits including 4 fixes in 60 days, while the closure's inputs (trigger rect, pane size, viewport, `bounds`, `direction`, `origin`, `decidedDir`, `decidedCenter`) and outputs (a `Pos`, the effective direction, the latched decisions) are all plain values.[^103]

**Fix | Proposed**

Extract a pure `placePane({ trigger, pane, viewport, bounds, direction, origin, decided }) → { pos, dir, decided }` beside the component; the effect keeps measuring, latching the returned decisions, and `setPos`/`setEffDir`. `setPos` is already change-guarded (`samePos`), so the extraction is purely structural, and the centering tests become plain function tests.

##### F-104 · Four waits that let a transition finish each state their own slack.

> **Area:** UIX · **Lens:** Divergence · **Weight:** Low · **Size:** S · **Net:** −2 · **Origin:** Drift

**Finding**

Four places wait out a transition and then add slack for the frame that paints its end, and each states the slack itself: an exit's unmount waits its beat plus 30 ms (`exitWait`, which a fold's travel also reads), a settle fallback its beat plus 80 ms (`SETTLE_FALLBACK`), a drag-disclose remeasure its beat plus 70 ms, and the native caret's settle deadline the slowest bloom plus 50 ms. One fact, the paint-start delay past a transition, is written four ways, so a fifth wait has no shared value to reach for.[^104]

**Fix | Deferred**

Deferred by the owner, who ruled that each wait's timing reads right as it stands; one shared slack would move three of them by 10 to 50 ms. The fold, if it comes, is one slack constant in `motion.ts` that `exitWait`, `useSettleFallback`, `dragDisclose`, and `nativeCaret` add to their durations.

#### Navigation

##### F-105 · Maximum Tab Width has no effect above a tab strip's preferred width, so most of its steps do nothing.

> **Area:** Navigation · **Lens:** Defect · **Weight:** Low · **Size:** S · **Net:** +1 · **Origin:** Shortcut

**Finding**

Settings offers Maximum Tab Width in steps from 150 to 350px, and `ConfigurationPM.md` calls it the widest a tab grows, but a tab never grows past its strip's preferred width, so the setting can only narrow a tab below it. A tab is `flex: 0 1 var(--tab-pref)`, which shrinks in a crowded strip and never grows, so `max-width: var(--tab-max-user, 250px)` takes effect only below `--tab-pref`: 180px on the main bar (`.tabs-standard`) and 150px in a window's strip (`.tabs-compact`). On the main bar the 150 and 175 steps narrow tabs and the other seven change nothing, and in a window's strip none of the nine changes anything; the trailing tab sizes to its label up to `--tab-max-absolute` and ignores the setting too. Measured over CDP against `~/Test`: main-bar tabs read 150, 175, then 180px at every step from 200 to 350, and window-strip tabs read 150px at every step.[^105]

**Fix | TBD**

Give `.tab` `flex-grow: 1`, so tabs fill spare strip width up to the setting; the trailing tab keeps its own label-sized rule, and both strips' resting look changes. **Your call:** growing tabs, a ladder that stops at 180px (which still leaves the setting inert in window strips), or dropping the setting; `ConfigurationPM.md` follows the ruling.

#### Views

##### F-106 · A new item's rename field opens one frame after its row.

> **Area:** Views · **Lens:** Divergence · **Weight:** Low · **Size:** S · **Net:** +5 · **Origin:** Drift

**Finding**

A page created from a view mounts its row from the host's push, keyed by the ID the window minted, and its title field opens when the create's reply returns, because a rename session is claimed by the page's path, which the host decides as it settles the name. The host pushes before it replies, so the field opens at most one frame after its row, no slower than before the Data Layer plan; the session is still a second key beside the ID the row is mounted under. `createPageIn` calls `rename({ id: req.id, path: landed })` once the flight resolves with `created.path`, `useViewInteractions` routes it to `policy.rename(target, true)`, and the Cards view's policy opens `beginRename(target.path, …)`, whose fence is `renamingPath`.[^106]

**Fix | Proposed**

Rename sessions are claimed by ID across creates: a create opens its rename with the minted ID as it asks, and the field binds to the row the push mounts under that ID, keeping the path for the rename it sends.

##### F-107 · Dragging a Set to another band shows it at its old rank for the round trip.

> **Area:** Views · **Lens:** Divergence · **Weight:** Low · **Size:** S · **Net:** +6 · **Origin:** Drift

**Finding**

In a view that groups by Sets in a custom order, dragging a Set under another parent moves it at once, but its place among the groups follows only after the host answers the move, so for the round trip it sits at its old rank and then jumps. The move is painted ahead, while the rank is a view write the band router sends only once the move's reply lands; a page create stages its order with the ask and takes it back on a refusal. `routeSet` returns an `fs` effect carrying `moveSet` and `after: { group_order }`, and `runBandEffect` awaits `io.mutate(effect.req)` before `io.persistView(effect.after)`, where `createPageIn` calls `stageView` before its `mutate` and `unstageView` on a refusal. This predates the Data Layer plan.[^107]

**Fix | Proposed**

The `fs` arm stages `after` with the ask, persists it once the move lands, and unstages it on a refusal, the shape `createPageIn` and the manual-order drop in `useViewInteractions.tsx` already use.

##### F-108 · A refused page create clears another new row's staged order until that row's own order lands.

> **Area:** Views · **Lens:** Defect · **Weight:** Low · **Size:** S · **Net:** +6 · **Origin:** Shortcut

**Finding**

A page created in a custom-ordered view stages its place in the view's hand order as it asks, and a second create made before the first's reply composes its order on the first's. When one of them is refused, it takes back the whole staged order rather than its own row, so the other new row drops to where the view's sort places it until its own reply lands and persists the order, a few milliseconds later. `createPageIn` calls `unstageView(c.source.id, c.view.id, staged)` on a refusal; `unstageView` drops every staged slot the patch wrote, here `manual_order`; and `orderPatch` builds that patch from the live view, which already folds the other create's staged order.[^108]

**Fix | Proposed**

A refusal restages the order without the refused ID rather than dropping the slot, so a create still in flight keeps its place.

#### Matrix

##### F-109 · The Matrix can't be pinch-zoomed on a touchscreen.

> **Area:** Matrix · **Lens:** Growth Constraint · **Weight:** Low · **Size:** S · **Net:** +12 · **Origin:** Premature

**Finding**

On a touchscreen, such as a Windows touch laptop, two fingers on the Matrix pan it instead of zooming. Zoom arrives only as a Ctrl-wheel event, which is how trackpads report a pinch, so trackpads work and only touchscreens break. The canvas turns off the browser's own touch handling, so both fingers go to pointer handlers that follow one pointer and ignore the second. `onWheel` zooms only `if (e.ctrlKey)`, `touchAction: 'none'` routes every touch to the one-pointer `onPointerDown`/`onPointerMove`, and a search of `Core/Matrix` finds no touch or gesture handlers.[^109]

**Fix | Proposed**

In `MatrixCanvas`, keep a small map of active pointer ids on the host; while two are down, feed the change in their distance ratio to `matrixRuntime.zoom` at their midpoint (the same call the wheel makes, which already takes a focus point and factor) and suppress the one-pointer pan.

#### Tiles & Embeds

##### F-110 · A board whose saved layout can't be read opens empty, and the first new tile replaces the saved layout.

> **Area:** Tiles · **Lens:** Integrity · **Weight:** Low · **Size:** S · **Net:** +5 · **Origin:** Shortcut

**Finding**

If a board's stored layout is present but isn't in a shape the app can decode, the board opens looking empty. Its tiles are still in the file. Creating a tile then writes a new one-tile layout over the stored one, and the old arrangement is gone. This is reachable by a hand edit, or by a newer layout format arriving through sync from a newer build. A missing layout is the ordinary fresh board and is unaffected; nothing in the app writes an undecodable layout.

Decoding fails only when `layout` is present and not `{bands: array}`. `adopt` then takes `emptyLayout()` and marks the board ready, and a create commits `insertBand` onto the empty layout. Treating an undecodable layout as an unreadable document at `readTileDocAt` regresses three readers: the rename cascade's tile list, `duplicateTile`, and the heading-link cache.[^110]

**Fix | TBD**

Before a layout write replaces undecodable bytes, the writer copies them under a `.bad-` name, the rule corrupt JSON already follows; the board stays usable and nothing is lost. `setAside` renames the whole file, so this needs a copy primitive beside it in the file layer. It is worth taking when a layout format version exists, which is what makes an undecodable layout something sync can deliver.

##### F-111 · The tile shell's memo comparator lists its props by hand.

> **Area:** Tiles · **Lens:** Growth Constraint · **Weight:** Low · **Size:** S · **Net:** −8 · **Origin:** Shortcut

**Finding**

`TileShell`'s comparator names each of its thirteen props. A prop added later and left off the list silently stops triggering a redraw.[^111]

**Fix | TBD**

A generic comparison over the props doesn't fit as written: the comparator compares `place` field by field, which a shallow comparison can't, and building the objects to compare allocates per shell on every pointer move of a drag. The design has to keep the field-wise `place` comparison and allocate nothing on that path.

##### F-112 · Three sites that run without a tree name the tile hosts' folders by hand.

> **Area:** Tiles, Nexus · **Lens:** Duplication · **Weight:** Low · **Size:** S · **Net:** ≈0 · **Origin:** Drift

**Finding**

`TILE_HOSTS` resolves a host to its folder and lists every board from the held tree, and the watcher, the channels, and the rename cascade read it. Three sites run before or without a tree and name host folders themselves. The saved-view normalization at open walks the Homepage folder and the Contexts folder for tile documents, so a new host whose boards live elsewhere has its view tiles skipped without a word. `ensureConfigLayout` creates the Homepage folder, and the open-time re-mint checks for a Space by kind before rewriting a copied folder's board. Adding a host means finding these three beside the table.[^112]

**Fix | TBD**

Each `TILE_HOSTS` arm names the folder a tree-less pass reaches its boards under, and `normalizeSavedViews` and `ensureConfigLayout` read it. The re-mint's check concerns the copied folder's own kind and may stay.

#### Files

##### F-113 · An app file this session never read and can't read opens as empty, so its section shows defaults and its changes are refused, some without a word.

> **Area:** Files · **Lens:** Integrity · **Weight:** Low · **Size:** M · **Net:** +15 · **Origin:** Drift

**Finding**

Four of Pommora's own JSON files are read through `readAppFile`: `state.json` (Collection, Context and Space order, pins, and the Nexus banner), `matrix.json` (the Matrix's grouping, filter, force and display settings), `homepage.json` (the Homepage banner and heading icon), and `crops.json` (image framing). `readAppFile` treats a file this session never read the same way whether it's absent or only unreadable, for example an evicted iCloud placeholder offline, which `atomicWrite.ts` itself names as the unreadable case: both read as empty. `readLast` already reports `unreadable`, and `readAppFile` drops it (`?? null`). The walk then opens the Nexus with the sidebar sorted by title, no pins, Matrix settings at their defaults, and Homepage banners and crops missing. Only the board's `_tiles.json` reads through `readAppFileKnown`, and it stays closed with a notice that offers to try again.

Every write to one of these files is then refused by `updateNexusConfig`'s strict read-modify-write, and the user hears about it only sometimes. A reorder, a banner, a crop or a heading-icon change goes through `mutate`, and its refusal is posted. A pin toggle or a Matrix change goes through `persist(…, true)`, which only logs. The pin shows as set, isn't saved, and is replaced by the disk's copy once the file reads again. The asset migration breaks its own rule in the same way. `collectRefs` says an unreadable store holds the sweep, but its `state.json` and `homepage.json` refs read through `readAppFile`, answer with no banner, and add no `skipped` entry. `sweepLegacyRoot` then sends to the trash the legacy banner image the unreadable file still names.

The three hand-authored files (`nexus.json`, `settings.json`, `properties.json`) read through `readKept`, which throws on an unreadable file this session never read, so the open fails there first. This finding covers the case where only the four app-written files are unreadable, which is the likely iCloud shape, since they're the least recently touched files in `.nexus/`.[^113]

**Fix | TBD**

Route the four readers (the walk's `readConfig`, `readNavigationFile`, `readMatrixFile`, and the file-event arms for `state.json`, `homepage.json`, and `crops.json`) through `readAppFileKnown`. When a file answers `undefined`, the open posts one notice, as the board does: its section shows defaults, and its changes won't save until it reads. `collectRefs` pushes a `skipped` entry for a store that answers `undefined`, so the sweep holds. Leave `persist`'s quiet flag alone, since the notice at open already tells the user. **Your call:** `state.json` alone. Either it holds the open, because it seeds the order every surface reads, or it opens with defaults and the notice. Matrix, Homepage and crops follow the board.

#### Nexus

##### F-114 · The host can't resolve a page title from the tree it holds, because the tree's title index imports the design kit's icons and trails.

> **Area:** Nexus · **Lens:** Placement & Naming · **Weight:** Low · **Size:** M · **Net:** TBD · **Origin:** Shortcut

**Finding**

Code that runs in Desktop's main process can't answer "which page is this title", though the host holds the tree: the only title index over it, `pageIndexOf` in `Nexus/treeIndex.ts`, imports UIX `.tsx` modules (`Symbols`, `NavTrail`) for icons and trails, and importing it from main fails `tsc -p Desktop/tsconfig.node.json`. This is what keeps F-042's Paste As classifier resolver-free, so a copied `[x](Notes.md)` offers address rows. Confirmed by typing the import.[^114]

**Fix | TBD**

Split the title index (titles, ids, paths, resolution) from the icon and trail decoration, so the host imports the first and the window the second; Paste As can then classify with a resolver in main.

##### F-115 · A store guard against a page move landing in the wrong Nexus holds only by microtask order.

> **Area:** Nexus · **Lens:** Integrity · **Weight:** Low · **Size:** S · **Net:** TBD · **Origin:** Shortcut

**Finding**

`Session/store.test.tsx`'s 'drops a page move whose flush waited out a switch, since its path named the Nexus it left' passes only because `nexusSlice.load` reaches `readTree` without an intervening await: any await added before it reddens the test. The guard it pins, a `movePage` comparing the Nexus id after its flush, therefore depends on scheduling that real IPC doesn't promise. Found while typing an alternative that read the footnote overrides before the tree.[^115]

**Fix | TBD**

Key the pending move to the Nexus it was issued in and compare that identity at landing, so the guard holds whatever the load's await order; the test then pins the identity check rather than the ordering.

---

### Appendix: MarkdownPM Test Dispositions

Every row was re-found by test name at `70fc6063c` and re-judged against its cited survivor; line numbers are at that commit. Paths are relative to `Core/MarkdownPM/` unless they start with `Core/`. Kinds: **BC** by construction · **TL** too loose · **UP** unproduced state · **RP** re-pin · **RT** retired.

| File | Lines | Kind | Disposition | Lines |
| --- | --- | --- | --- | --- |
| `regressionPins.test.ts` | :89 | RP | delete (`edits.test.ts:185`, `:360`, `:203`) | 14 |
| `regressionPins.test.ts` | :327 | RP | delete (`docScan.test.ts:265`); keep :318, :322 | 11 |
| `regressionPins.test.ts` | :66 | RP | delete (`edits.test.ts:222`) | 8 |
| `regressionPins.test.ts` | :242 | TL, RT | tighten to `toEqual([[0, 20]])`, rename after `fenceRangesOf` | 7 |
| `regressionPins.test.ts` | :249 | TL, RP | tighten to `toEqual([[0, 16]])`, drop :253 | 6 |
| `regressionPins.test.ts` | :143 | TL | tighten :145 to `expect(closeConstructOnEnter(scanDoc(doc), 6, 6)?.selection).toBe(7)`; the only pin of `'` in `CLOSERS` | 4 |
| `regressionPins.test.ts` | :155 | RP | merge into `edits.test.ts:70` as `expect(e.selection).toBe(5)` | 4 |
| `regressionPins.test.ts` | :133 | RP, TL | delete (`edits.test.ts:507`) | 3 |
| `regressionPins.test.ts` | :188 | RP | delete (`edits.test.ts:91`) | 3 |
| `Tables/cellLinks.test.tsx` | :223-255 | TL | tighten: `expect(target?.kind).toBe('url')` before the apply | 33 |
| `Tables/cellLinks.test.tsx` | :147-167 | RP | delete (`cellNavigation.test.tsx:131-139`) | 21 |
| `Tables/cellLinks.test.tsx` | :67-72 | RP | keep; `aliasSites.test.tsx:89` is the copy that goes | 6 |
| `Menus/blockMenuFlow.test.tsx` | :85-92 | RP | delete (`Core/Actions/blockMenu.test.ts:54-61`) | 8 |
| `Menus/blockMenuFlow.test.tsx` | :94-101 | RP | delete (`blockMenu.test.ts:90-96`) | 8 |
| `Menus/blockMenuFlow.test.tsx` | :202-209 | RP | delete (:219-231, :135-148, :321-326) | 8 |
| `Menus/blockMenuFlow.test.tsx` | :103-108 | RP | delete (`blockMenu.test.ts:80-88`) | 6 |
| `Menus/blockMenuFlow.test.tsx` | :110-115 | RP | delete (`blockQuery.test.ts:23-25`) | 6 |
| `Menus/blockMenuFlow.test.tsx` | :127-131 | RP | delete (`blockQuery.test.ts:49-51`) | 5 |
| `Menus/blockMenuFlow.test.tsx` | :280-284 | RP | delete (`blockMenu.test.ts:59`, :273-278) | 5 |
| `Autocomplete/connectionCommit.test.tsx` | :338-348 | TL | tighten to `expect(document.querySelector('.mdpm-ac')).toBeNull()` | 11 |
| `Autocomplete/connectionCommit.test.tsx` | :188-196 | RP | delete (`pickFirst` at :40, :143) | 9 |
| `Autocomplete/connectionCommit.test.tsx` | :50-54 | RP | delete (:56-60) | 5 |
| `Guards/citationGuard.test.ts` | :35-38, :46-48, :88-90, :129-131, :266-268 | BC | merge each as a one-line precondition into :28, :40, :81, :121, :260 | 16 (~11 net) |
| `Guards/citationGuard.test.ts` | :100-114 | TL, RP | delete (:54-62) | 15 |
| `Guards/citationGuard.test.ts` | :203-208 | RP | merge `toContain('the citation')` into :28, delete | 6 |
| `Guards/citationGuard.test.ts` | :243-247 | TL | tighten to `toBe(\`${DOC}\n   \n  \`)` | 5 |
| `Engine/intents.test.ts` | :616-622 | UP | delete | 7 |
| `Engine/intents.test.ts` | :752-756 | UP, RP | delete (:155-159) | 5 |
| `Engine/intents.test.ts` | :191-192 | RP | tighten: drop two lines (:195-206) | 2 |
| `Engine/intents.test.ts` | :632-635 | TL | tighten to exact `toEqual` on the five `lineClasses`, the list item's own included | 4 |
| `Engine/intents.test.ts` | :636-638 | RP | merge into :632-635 | 3 |
| `Engine/intents.test.ts` | :445-447 | RP | delete (:459-470) | 3 |
| `Engine/intents.test.ts` | :70-72 | RP | merge into :74-76 | 3 |
| `readOnlySelection.test.tsx` | :9-40 | setup | rewrite on `mountEditor` | 32 (33 net) |
| `readOnlySelection.test.tsx` | :50 | TL | delete | 5 |
| `Menus/editorMenu.test.tsx` | :108-130 | TL | tighten: clipboard `'x'` on `- item` at 6 → `'- itemx'` for menu and chord | 23 |
| `Menus/editorMenu.test.tsx` | :165-176 | TL | tighten to `toBe(<full resulting table>)` | 12 |
| `Menus/gripMenuFlow.test.tsx` | :185-191 | RP | delete (:177-183, `gripMenu.test.ts:26-29`) | 7 |
| `Menus/gripMenuFlow.test.tsx` | :85-90 | RP | delete (`format.test.ts:191-193`, `blockModel.test.ts:61-66`) | 6 |
| `Menus/gripMenuFlow.test.tsx` | :102-107 | RP | delete (`format.test.ts:195-197`, `blockModel.test.ts:157-163`) | 6 |
| `Menus/gripMenuFlow.test.tsx` | :116-121 | RP | delete (:177-183, `gripMenu.test.ts:11-14`) | 6 |
| `Menus/gripMenuFlow.test.tsx` | :152-157 | RP | delete (:143-150, :177-183) | 6 |
| `Autocomplete/autocomplete.test.ts` | :300-306 | RP | delete (:48-55); retitle the :308 test that then leads its describe | 7 |
| `Autocomplete/autocomplete.test.ts` | :74-80 | RP | delete (:123-125) | 5 |
| `Autocomplete/autocomplete.test.ts` | :226-230 | RP | delete (`Core/Connections/links.test.ts:77`) | 5 |
| `Autocomplete/autocomplete.test.ts` | :239-242 | RP | delete (:35-38) | 4 |
| `Autocomplete/autocomplete.test.ts` | :244-247 | RP | delete (:138-144) | 4 |
| `Autocomplete/autocomplete.test.ts` | :159-162 | TL | tighten to `toBeNull()` | 4 |
| `Autocomplete/autocomplete.test.ts` | :188-191 | TL | tighten to `toMatchObject({ form: 'fragment', title: '' })`, the current page's headings | 0 |
| `Links/externalLink.test.tsx` | :121-135 | RP | delete (`linkFormat.test.tsx:72-84`, `:100-103`) | 15 |
| `Links/externalLink.test.tsx` | :90-102 | TL | tighten: mount with the :106-110 `conn`, assert `connMenu` not called | 13 |
| `Core/Pages/editorHost.test.ts` | :183 | BC | tighten: drop :193-196, keep the `mutate` pin, retitle | 4 |
| `Autocomplete/aliasPicker.test.tsx` | :139-145 | RP | delete (:147-154) | 7 |
| `Autocomplete/aliasPicker.test.tsx` | :55-59 | TL, RP | delete | 5 |
| `Autocomplete/aliasPicker.test.tsx` | :125-129 | TL | tighten: leading side span holds `square-split-horizontal` | 5 |
| `Autocomplete/aliasPicker.test.tsx` | :245-249 | RP | move :247-248 into `connections.test.ts:68`, with :233-238 | 5 |
| `Autocomplete/aliasPicker.test.tsx` | :240-243 | RP | delete (`Core/Connections/connections.test.ts:10-25`) | 4 |
| `Tables/cellLists.test.tsx` | :360-377 | misplaced | move to `Engine/Tables/codec.test.ts` | 18 |
| `Tables/cellLists.test.tsx` | :96-100 | BC | delete (`intents.test.ts:80-85`) | 5 |
| `Tables/cellLists.test.tsx` | :379-381 | RP | delete (`codec.test.ts:65`) | 3 |
| `Input/edits.test.ts` | :285-289 | TL | tighten :286, :287 to exact edits, :288 to `toBeNull()` | 5 |
| `Input/edits.test.ts` | :212-216 | TL | tighten :214 `{insert:'__',selection:5}`, :215 `{insert:'``',selection:1}` | 5 |
| `Input/edits.test.ts` | :217-221 | TL | tighten :218 to `{from:2,to:2,insert:'**',selection:3}` | 5 |
| `Input/edits.test.ts` | :168-171 | TL | tighten :169 to `{from:0,to:0,insert:'[]',selection:1}` | 4 |
| `Input/edits.test.ts` | :195-198 | TL | tighten :196, :197 to exact edits | 4 |
| `Input/edits.test.ts` | :348, :369 | TL | tighten to exact edits | 2 |
| `Engine/detect.test.ts` | :144-148 | RP | delete (`links.test.ts:34-39`, `tokens.test.ts:69-73`) | 5 |
| `Engine/detect.test.ts` | :140-143 | RP | delete (`rewrite.test.ts:103-110`, `tokens.test.ts:58-62`) | 4 |
| `Engine/detect.test.ts` | :28-30 | RP | delete (:22) | 3 |
| `Core/Interface/Glance/GlancePane.test.tsx` | :736 | RP | delete (`pageDetailCache.test.ts:38`) | 9 |
| `Core/Interface/Glance/GlancePane.test.tsx` | :728 | RP | delete (`pageDetailCache.test.ts:152`) | 7 |
| `Core/Interface/Glance/GlancePane.test.tsx` | :746 | RP | delete (`pageDetailCache.test.ts:155`) | 5 |
| `Tables/dragOrigin.test.tsx` | :100-119 | RP | delete (:121-137); retitle :121 for the re-resolve it also pins | 20 |
| `Engine/parser.test.ts` | :24-29 | RP | delete (`regressionPins.test.ts:28-32`, `:36`) | 6 |
| `Engine/parser.test.ts` | :6-10 | TL | delete | 5 |
| `Engine/parser.test.ts` | :12-15 | RP | delete (`regions.test.ts:11-17`) | 4 |
| `Engine/parser.test.ts` | :17-20 | RP | delete (`tokens.test.ts:15-20`) | 4 |
| `foldState.test.tsx` | :401 | UP | delete | 8 |
| `Links/mdLinkTarget.test.tsx` | :331-339 | RP | delete (:136-144, :341-355) | 9 |
| `Links/mdLinkTarget.test.tsx` | :101-105 | RP | delete (:66-69) | 5 |
| `Links/mdLinkTarget.test.tsx` | :92-94 | TL, RP | delete (`links.test.ts:81-83`) | 3 |
| `Embeds/embedInsert.test.ts` | :65-73 | RP | move to `autocomplete.test.ts` as an `autocompleteQuery('![[]]', 3, true)` pin | 9 |
| `Embeds/embedInsert.test.ts` | :56-63 | BC, RP | delete | 8 |
| `Guards/calloutGuard.test.ts` | :12-14, :15-17, :18-20, :25-27, :28-30 | RP, TL | delete all five (:48-62) | 15 |
| `Links/pasteLink.test.tsx` | :81-85 | TL, BC | delete | 5 |
| `Links/pasteLink.test.tsx` | :87-91 | BC | delete; the `pasteLink.ts:19` guard stays | 5 |
| `Links/pasteLink.test.tsx` | :195-199 | BC | delete; the `pasteLink.ts:131` guard stays | 5 |
| `Engine/subfieldStats.test.ts` | :55-58 | TL | tighten to `characters === 4` and `=== 9` | 4 |
| `Engine/subfieldStats.test.ts` | :51-53 | TL | tighten to `toMatchObject({ words: 3, characters: 13 })` | 3 |
| `Engine/subfieldStats.test.ts` | :115-117 | TL | tighten to `characters === 9` | 3 |
| `Engine/subfieldStats.test.ts` | :269-271 | TL | tighten to `toMatchObject({ words: 4, characters: 19 })` | 3 |
| `Engine/listMarkerSeats.test.tsx` | :128 | BC | tighten: drop the line | 1 |
| `Engine/listMarkerSeats.test.tsx` | :91-95 | RP | delete (:31-34) | 5 |
| `Tables/sync.test.ts` | :35-39 | TL | merge into :23 as `toEqual({ from: 25, to: 28, insert: ' X ' })` | 5 |
| `Tables/sync.test.ts` | :70-73 | RP | delete (:64-68) | 4 |
| `Tables/sync.test.ts` | :31-33 | TL | delete (:46-50, :52-58, `codec.test.ts:53`) | 3 |
| `Engine/listDragModel.test.ts` | :129-135 | BC, RP | delete (:84-88) | 7 |
| `Engine/listDragModel.test.ts` | :177-181 | TL | tighten to `expect(renumberRuns(doc, [0])).toEqual([])` | 5 |
| `Engine/tokens.test.ts` | :51-56 | RP | delete (:121-127) | 6 |
| `Engine/tokens.test.ts` | :29-34 | TL | tighten :33 to `.toBe('**a**')` and italic markers `toEqual(['*','*'])` | 6 |
| `Engine/Tables/operations.test.ts` | :32-37 | TL | tighten: `base` dashes `[2, 4, 9]`, expect `5` | 6 |
| `Engine/Tables/operations.test.ts` | :58-62 | TL | tighten: add `expect(m.header).toEqual(['a', 'c'])` | 5 |
| `Engine/blockModel.test.ts` | :143-147 | RP | delete (:126-131) | 5 |
| `Engine/blockModel.test.ts` | :314-318 | RP | delete (:271-275); keep the :313 comment | 5 |
| `Engine/Tables/model.test.ts` | :5-14 | RP | delete (`format.test.ts:268-272`) | 10 |
| `Engine/Tables/codec.test.ts` | :72-76 | RP | delete (:14-17, :49-55) | 5 |
| `Engine/Tables/codec.test.ts` | :44-47 | UP | move the pipe-in-code half to `regions.test.ts` as "a pipe inside inline code still splits a cell, so an over-split header is no table"; drop the non-table half | 4 |
| `Links/pasteDecision.test.ts` | :125-131 | BC | delete | 6 |
| `Links/pasteDecision.test.ts` | :91-93 | RP | delete (:58) | 3 |
| `Citations/citationMenu.test.ts` | :38-46 | RP | merge one line into :28 | 9 |
| `Links/pendingTitle.test.ts` | :64-68 | RP | delete (:45-50) | 5 |
| `Links/pendingTitle.test.ts` | :33-35 | RP | delete (:37-50) | 3 |
| `Links/linkEdges.test.tsx` | :393-400 | TL | tighten: mount with `{ ...conn, menu: vi.fn() }`, assert `menu` not called | 8 |
| `Engine/embedClaims.test.ts` | :72-75 | RP | delete (:69) | 4 |
| `Engine/embedClaims.test.ts` | :77-79 | BC | delete | 3 |
| `Core/Pages/bodyMount.test.tsx` | :236 | TL | tighten: after `flush()`, assert `page:updateBody` not called | 7 |
| `prefixSeat.test.tsx` | :156 | TL | tighten :160 to `toBe('a[^1] [^2]\n\n[^1]: one[^2]: two')`, the document a forward Delete at a footnote row's end leaves | 6 |
| `Citations/citationCreate.test.tsx` | :387-392 | BC | move to `Engine/citations.test.ts` as a `scan(body).markers` ordinal test | 6 |
| `aliasSites.test.tsx` | :89 | RP | delete (`cellLinks.test.tsx:67`) | 6 |
| `Core/Index/indexSeed.test.ts` | :318 | RP | delete the one line (`Engine/citations.test.ts:56`) | 1 |
| `Core/Index/indexSeed.test.ts` | :327-331 | misplaced | move to `Engine/citations.test.ts`, keep the row assertion | ~4 |
| `Gestures/listDragTap.test.tsx` | :51-55 | RP, TL | delete (:60-79) | 5 |
| `Links/linkFormat.test.tsx` | :130-133 | RP, BC | delete (:112-115) | 4 |
| `Engine/citations.test.ts` | :175-178 | RP | delete; keep :169-173 | 4 |
| `Engine/codeLangs.test.ts` | :14-17 | BC | delete | 4 |
| `Tables/widget.test.ts` | :58-60 | RP | merge into :71 with `expect(set.size).toBe(1)` | 3 |
| `Engine/outlineTree.test.ts` | :23-25 | BC | delete (`folding.test.ts:10`) | 3 |
| `Menus/blockQuery.test.ts` | :53-55 | RP | delete (:49-51) | 3 |
| Guarded `ResizeObserver` stubs | `headingColRemap:14-20`, `cellHeadings:16-22`, `tableExit:13-19`, `cellNavigation:11-17` (+ :9), `tableGripMenu:17-23`, `cellStatic:17-23`, `cellLinks:15-21`, `cellLists:17-23`, `cellAlias:13-19` | setup | delete (`UIX/vitest.setup.ts:13-19` installs it) | 64 |
| `IS_REACT_ACT_ENVIRONMENT = true` | `cellHeadings:15`, `tableExit:12`, `tableGripMenu:16`, `cellLists:16` | setup | delete (`stubEditorBridge()` sets it) | 4 |
| Unconditional `ResizeObserverStub` | `emptyPage`, `docCache`, `travel`, `codeDiff`, `headingRename`, `aliasSites`, `foldState`, `connectionCommit`, `aliasPicker`, `linkEdges`, `aliasRender`, `mdLinkTarget`, `connectionHover`, `linkFormat`, `externalLink`, `linkEdit`, `listDragTap`, `citationBreakage`, `citationCreate`; guarded blocks at `textScope:16-22`, `editorMenu:18-24` | setup | delete; `dragOrigin` and `cellSweep` stay, since they fire the captured callbacks by hand | 128 |
| `Embeds/embedResize.test.tsx` | :66-72, :77 | setup | delete the no-op `Watcher` with its `vi.stubGlobal` and `vi.unstubAllGlobals` lines | 8 |

Harness (F-075): `Core/Testing/editorHarness.ts:83-90` calls `rememberAlias` or `forgetAlias` on the current list, stores the answer and fires `aliasWatchers` when it isn't `null`, and does nothing when it is; `bump` and its `setTick` state go.

[^1]: **F-001:** `Core/Sync/Client/pull.ts:39-59` (`landChange`), `Core/Sync/Arrival/land.ts:83-144`, `Core/Sync/Client/push.ts:257-309` (`resolveStale`), `Core/Sync/Client/reconcile.ts:99-108`, `Core/Paths/exclusion.ts:44-61` (`manifestAdmits`), `Sync/Routes/items.ts:10-17` (`itemPath`), `Desktop/Platform/hostPath.ts:5` (`nativePath`)
[^2]: **F-002:** `Desktop/Sync/transport.ts:24-38` (`transport`), `Core/Sync/Client/call.ts:89-91`, `Sync/wire.ts:40-55` (`BLOB_CAP`)
[^3]: **F-003:** `Core/Sync/handlers.ts:304-305`, `Core/Sync/handlers.ts:349-353`, `Core/Sync/handlers.ts:325` (`freshKdfParams`), `Core/Sync/Client/reconcile.ts:88-97` (`reconcile`), `Core/Sync/Client/push.ts:174-210` (`collect`), `Core/Sync/Client/session.ts:144-155` (`begin`), `Core/Sync/Client/session.ts:175-188` (`withKeys`), `Sync/Routes/items.ts:87`
[^4]: **F-004:** `Core/Sync/Client/push.ts:233-255` (`pushRename`), `Core/Sync/Client/push.ts:257-309` (`resolveStale`), `Sync/Store/log.ts:153-154`
[^5]: **F-005:** `Core/Sync/Arrival/land.ts:124-144` (`landRename`), `Core/Sync/Arrival/land.ts:106-122` (`landDelete`), `Core/Sync/Client/push.ts:233-242` (`pushRename`), `Core/Nexus/folderKind.ts:53`
[^6]: **F-006:** `Core/Files/jsonMerge.ts:15-46` (`mergeKeys`), `Core/Contract/validators.ts:5-6` (`isPlainObject`), `Core/Sync/Arrival/mergePolicy.ts:19-40` (`isMergedJson`, `mergeDepthFor`), `Core/Sync/Arrival/land.ts:45-64` (`bytesToLand`), `Core/Sync/Arrival/land.ts:95`, `Core/Sync/Client/push.ts:299` (`resolveStale`), `Core/Contexts/contexts.ts:9,20` (`ContextsRegistry`), `Core/Contexts/contextCascade.ts:246-260`, `Core/Nexus/readNexus.ts:247-274` (`readContextGroups`), `Core/Nexus/order.ts:10-27` (`resolveOrder`), `Core/Properties/rowOrder.ts:1-13` (`resolveRowOrder`), `Core/Tiles/tiles.ts:95,182-184` (`active`, `TileDoc`), `Core/Tiles/TileHost.tsx:283` (`renderTile`), `Core/Views/viewsFile.ts:24` (`views`), `Core/Properties/properties.ts:117,142,149-150` (`select_options`, `status_groups`), `Core/Sync/Client/tap.ts:9` (`DEBOUNCE_MS`), `.claude/Features/NexusSyncPM.md:55,63`
[^7]: **F-007:** `Core/Trash/delete.ts:27,44,94,104` (`deleteOp`), `Core/Trash/bundle.ts:27-35` (`mintBundle`), `Core/Files/atomicWrite.ts:62-75` (`relocate`), `Core/Files/writeEcho.ts:35` (`reportRename`), `Core/Sync/Client/tap.ts:45-58` (`installTap`), `Core/Sync/Client/tap.ts:64-75` (`feedRename`), `Core/Sync/Client/session.ts:136-139` (`onRename`), `Core/Sync/Client/push.ts:233-254` (`pushRename`), `Core/Sync/Client/push.ts:147-169` (`pushDirty`), `Core/Paths/exclusion.ts:44-61` (`manifestAdmits`), `Core/Paths/exclusion.ts:93-96` (`remainderUnder`), `Core/Settings/settings.ts:119` (`releaseExcludedFolders`), `Core/Trash/record.ts:34-35`
[^8]: **F-008:** `Core/Sync/handlers.ts:175-191` (`rotateRing`), `Core/Sync/handlers.ts:322,345`, `Core/Sync/Client/keyring.ts:39-45,73-82`
[^9]: **F-009:** `Core/Sync/handlers.ts:165-208` (`rotateRing`), `Core/Sync/handlers.ts:238-241`, `Core/Sync/Client/push.ts:98` (`sealed`), `Core/Sync/Client/keyring.ts:85-106` (`openRecord`), `Core/Sync/Contract/wire.ts:129-133` (`PullReply`), `Sync/Store/nexus.ts:28`
[^10]: **F-010:** `Core/Sync/handlers.ts:210-250` (`act`), `Sync/wire.ts:44,46`, `Core/Settings/NexusRows.tsx:231-246`, `Core/Sync/Client/keyring.ts:62-72` (`loadRing`)
[^11]: **F-011:** `Core/Sync/Client/session.ts:175-183` (`withKeys`), `Core/Sync/Client/pull.ts:80-83` (`pullWait`), `Core/Sync/handlers.ts:118-126` (`state`)
[^12]: **F-012:** `Core/Sync/handlers.ts:258-286`, `Sync/Routes/roster.ts:15-30` (`connect`), `Sync/Store/roster.ts:28-30`, `Core/Sync/Contract/wire.ts` (`RouteTable`), `Sync/wire.ts` (`PATHS`)
[^13]: **F-013:** `Core/Sync/handlers.ts:339`, `Sync/Store/nexus.ts:53-68` (`createInfo`), `Sync/Store/log.ts:186-191` (`sweep`), `Core/Sync/Client/session.ts:127`
[^14]: **F-014:** `Core/MarkdownPM/Tables/cellStatic.tsx:495-502` (`StaticCell`'s memo), `Core/MarkdownPM/Tables/cellStatic.tsx:346,479,490` (the checkbox and link-menu commits), `Core/MarkdownPM/Tables/MarkdownTable.tsx:151` (`geomRef`), `Core/MarkdownPM/Tables/MarkdownTable.tsx:442,483-487` (`cell`), `Core/MarkdownPM/Tables/widget.tsx:235-242` (`renderInto`, `commit`), `Core/MarkdownPM/Tables/widget.tsx:335-336`, `Core/MarkdownPM/Tables/widget.tsx:376-380` (`updateDOM`), `Core/MarkdownPM/Tables/CellEditor.tsx:132`, `Core/MarkdownPM/Tables/cellLists.test.tsx:322`
[^15]: **F-015:** `Core/MarkdownPM/Engine/Tables/regions.ts:23-27` (`isTable`), `Core/MarkdownPM/Engine/Tables/regions.ts:55-58` (`tableRegions`), `Core/MarkdownPM/Engine/docScan.ts:67` (`scanLines`), `Core/MarkdownPM/Engine/docScan.ts:105-113` (`quietAt`), `Core/MarkdownPM/Engine/docScan.ts:119` (`rescan`), `Core/MarkdownPM/Engine/detect.ts:623-640` (`isHeadingLine`, `isThematicBreakLine`), `Core/MarkdownPM/Tables/CellEditor.tsx:239-241`; `micromark-extension-gfm-table` 2.1.1 `lib/syntax.js:480-519`
[^16]: **F-016:** `Core/MarkdownPM/Tables/MarkdownTable.tsx:37-43` (`Drag`), `Core/MarkdownPM/Tables/MarkdownTable.tsx:69-83` (`Resize`, `shift`), `Core/MarkdownPM/Tables/MarkdownTable.tsx:149-161`, `Core/MarkdownPM/Tables/MarkdownTable.tsx:265-268` (`trackHover`), `Core/MarkdownPM/Tables/MarkdownTable.tsx:339-387` (`startDrag`, `resolve`), `Core/MarkdownPM/Tables/MarkdownTable.tsx:388-427` (`startResize`), `Core/MarkdownPM/Tables/MarkdownTable.tsx:505-536` (`colWidth`), `Core/MarkdownPM/Tables/MarkdownTable.tsx:588-626` (the grips' reveal), `Core/MarkdownPM/Tables/markdown-tables.css:97-109`, `Core/Views/Table/useColumns.ts:332-373` (`startColumnDrag`)
[^17]: **F-017:** `Core/MarkdownPM/Tables/widget.tsx:205-233` (`TableWidget`, `eq`), `Core/MarkdownPM/Tables/widget.tsx:412-427` (`buildWidgetDecorations`), `Core/MarkdownPM/Tables/widget.tsx:472-501` (`rebuiltTable`, `citeKey`, `pageKey`), `Core/MarkdownPM/Tables/widget.tsx:536-544`, `Core/MarkdownPM/Tables/MarkdownTable.tsx:270-282` (the decode), `Core/MarkdownPM/Tables/cellStatic.tsx:119-128`, `Core/MarkdownPM/Tables/cellStatic.tsx:495-502` (`StaticCell`'s memo), `Core/MarkdownPM/Tables/CellEditor.tsx:276-278`, `Core/MarkdownPM/Links/connectionsApi.ts:103-111` (`headingMissing`), `Core/MarkdownPM/Engine/detect.ts:245` (the label grammar)
[^18]: **F-018:** `Core/MarkdownPM/Tables/CellEditor.tsx:39-40` (`silentEdit`), `Core/MarkdownPM/Tables/CellEditor.tsx:239-242` (the commit listener), `Core/MarkdownPM/Tables/CellEditor.tsx:280-290` (the landing), `Core/MarkdownPM/Tables/CellEditor.tsx:157-167` (the paste filter), `Core/MarkdownPM/api.ts:62-71` (`mirrorBody`), `Core/Properties/Pickers/TextPane.tsx:169`
[^19]: **F-019:** `Core/MarkdownPM/Tables/MarkdownTable.tsx:96-141` (props), `Core/MarkdownPM/Tables/MarkdownTable.tsx:228-257,325,455-457,481`, `Core/MarkdownPM/Tables/widget.tsx:54-56` (`tableConnections`), `Core/MarkdownPM/Tables/widget.tsx:207-208,268-284` (`fill`), `Core/MarkdownPM/Tables/widget.tsx:318-345` (`render`), `Core/MarkdownPM/Tables/widget.tsx:406` (`buildWidgetDecorations`), `Core/MarkdownPM/Tables/widget.tsx:549-566` (`tableWidgetExtension`), `Core/MarkdownPM/Tables/CellEditor.tsx:120-127,158,165`, `Core/MarkdownPM/Tables/cellStatic.tsx:284,292-295`, `Core/MarkdownPM/Tables/sync.ts:41` (`structuralEditChange`), `Core/MarkdownPM/Tables/widget.test.ts:85-168`, `Core/MarkdownPM/Tables/headingColRemap.test.ts:53`
[^20]: **F-020:** `Core/MarkdownPM/Engine/Tables/codec.ts:5-11` (`CellSpan`, `RowSplit`), `Core/MarkdownPM/Engine/Tables/codec.ts:55-57` (`splitRow`), `Core/MarkdownPM/Engine/Tables/regions.ts:6-21` (`RowGeom`, `TableRegion`), `Core/MarkdownPM/Engine/Tables/regions.ts:72-79` (`modelFromRegion`), `Core/MarkdownPM/Tables/widget.tsx:62-65` (`headerKeyOf`), `Core/MarkdownPM/Engine/Tables/clipboard.ts:27` (`decodePayload`), `Core/MarkdownPM/Engine/subfieldStats.ts:116-120` (`tableProse`), `Core/MarkdownPM/Tables/sync.ts:18-30` (`cellCommitChange`), `Core/Testing/markdownEngine.ts:33-41` (`parseTable`)
[^21]: **F-021:** `Core/MarkdownPM/Tables/cellCitations.ts:16-27` (`marks`), `Core/MarkdownPM/Tables/CellEditor.tsx:155`
[^22]: **F-022:** `Core/MarkdownPM/Tables/widget.tsx:430-448` (`editAffectsTables`), `Core/MarkdownPM/Tables/widget.tsx:534-545` (`widgetField.update`), `Core/MarkdownPM/decorations.ts:547`
[^23]: **F-023:** `Core/MarkdownPM/Citations/citationEdits.ts:88-135` (`normalizeCitations`; `held` at 96-101, renames at 109-112), `Core/MarkdownPM/Engine/detect.ts:347-353` (marker `ordinal`), `Core/MarkdownPM/Citations/citationActions.ts:111-119` (`citationOrder`)
[^25]: **F-025:** `Core/MarkdownPM/Guards/verdictFilter.ts:36-60` (`verdictFilter`), `Core/MarkdownPM/Guards/citationGuard.ts:14,46-57` (`citationTailVerdict`), `Core/MarkdownPM/Guards/calloutGuard.ts:28` (`calloutDeleteVerdict`), `Core/MarkdownPM/decorations.ts:749-767` (the caret-seat filter)
[^28]: **F-028:** `Core/MarkdownPM/Guards/verdictFilter.ts:1-2,15-22,58` (`carriedAnnotations`), `Core/MarkdownPM/Guards/calloutGuard.ts:41`, `Core/MarkdownPM/Guards/citationGuard.ts:60`, `Core/MarkdownPM/Tables/widget.tsx:241` (`tableSelfEdit`), `Core/MarkdownPM/Tables/sync.ts:11-31`, `Core/MarkdownPM/Engine/Tables/regions.ts:48`; commit `2dbb0ba2e`
[^29]: **F-029:** `Core/MarkdownPM/Guards/citationGuard.ts:9-12` (`tailHolds`), `Core/MarkdownPM/Guards/citationGuard.ts:35-39` (`citationTailVerdict`)
[^30]: **F-030:** `Core/MarkdownPM/Guards/headingRenameSettle.ts:57-64` (`headingRenameSettle`), `Core/MarkdownPM/api.ts:62-71` (`mirrorBody`)
[^33]: **F-033:** `Core/MarkdownPM/Links/linkClicks.ts:26-46` (`linkUnder`), `Core/MarkdownPM/Links/connectionClicks.ts:20-34` (`wikiLinkAt`), `Core/MarkdownPM/Gestures/pointerPath.ts:50-51` (`seatAtNearerEdge`), `Core/MarkdownPM/Links/linkEdit.ts:52-68` (`commitAliasOnEnter`), `:77-130` (`slotNear`, `leaveSlot`, `rememberAliasNear`), `:133-161` (`aliasOnLeave`), `Core/MarkdownPM/Input/markdownInput.ts:232-266` (`typedInput`), `Core/MarkdownPM/Guards/aliasGuard.ts:1-9` (`refusedInAlias`), `Core/MarkdownPM/Engine/tokens.ts:329-342` (`linkTokenAt`), `Core/Pages/editorHost.tsx:62` (`wear`), `Core/MarkdownPM/Links/headingHash.ts:21`, `Core/MarkdownPM/Autocomplete/autocomplete.ts:50`, `Core/MarkdownPM/Links/pasteLink.ts:48-52`
[^34]: **F-034:** `Core/MarkdownPM/Links/connectionClicks.ts:56-103` (`connHitAt`, `connectionClicks`), `Core/MarkdownPM/Links/linkClicks.ts:19-46,108-127` (`linkUnder`, `markdownLinkClicks`), `Core/MarkdownPM/Engine/tokens.ts:326-342` (`tokenize`, `linkTokenAt`), `Core/MarkdownPM/Tables/cellStatic.tsx:41-42` (`cellTokens`), `:457-493` (`menuTarget`), `Core/MarkdownPM/surface.ts:48-54` (`inlineSurface`), `Core/MarkdownPM/Gestures/pointerPath.ts:30-99` (`pointerHandlers`), `Core/MarkdownPM/Links/linkEdit.ts:35-50` (`applyLinkAction`), `Core/MarkdownPM/Links/linkFormat.ts:57-93` (`applyUrlLinkAction`), `Core/MarkdownPM/Links/connectionsApi.ts:70-74` (`tokenTarget`)
[^35]: **F-035:** `Core/MarkdownPM/Autocomplete/autocomplete.ts:197-212` (`formSyntax`), `:231-281` (`commitEdit`), `Core/MarkdownPM/Autocomplete/useConnectionAutocomplete.ts:161-181` (`commit`), `Core/Connections/connections.ts:74-96` (`parseConnectionText`, `connectionText`)
[^36]: **F-036:** `Core/MarkdownPM/Engine/tokens.ts:47-50` (`linkTarget`), `Core/MarkdownPM/Links/linkFormat.ts:17-20` (`linkHalves`)
[^37]: **F-037:** `Core/MarkdownPM/decorations.ts:512-534` (`build`), `:557-628`, `Core/MarkdownPM/Tables/cellStatic.tsx:67-118,119-146` (`renderCellContent`), `Core/MarkdownPM/Links/connectionsApi.ts:118-130` (`wikiLinkView`)
[^38]: **F-038:** `Core/MarkdownPM/Links/linkClicks.ts:64-91` (`heldTarget`, `resolveFollow`), `:99-103` (`dwellTarget`), `Core/MarkdownPM/Links/connectionClicks.ts:87,90` (`connectionClicks`), `Core/MarkdownPM/api.ts:53-60` (`ownPage`), `Core/Properties/Cells/TextCell.tsx:26-33`
[^39]: **F-039:** `Core/MarkdownPM/Links/pasteLink.ts:16-52` (`destinationGuard`, `insideCodeAtCaret`, `linkFor`), `:90-114` (`pasteAs`), `Core/MarkdownPM/Citations/citationActions.ts:36-39` (`citationSeatAt`), `.claude/Features/MarkdownPM.md:33`
[^41]: **F-041:** `Core/Pages/editorHost.tsx:139-143` (`warmBody`), `Core/MarkdownPM/api.ts:190-192`, `Core/Session/pageDetailCache.ts:40-43` (`knownBody`), `:103-116` (`fetchPageResult`), `Core/Session/saveScheduler.ts:139-140` (`scheduleBodySave`), `Core/MarkdownPM/Autocomplete/headingTarget.ts:10-28` (`headingTargetOf`, `pageHeadingTarget`)
[^42]: **F-042:** `Core/Connections/linkValue.ts:9-13` (`LinkTarget`), `:48-62` (`parsePastedLink`), `:81-95` (`linkValueFromEdit`), `Core/Actions/pasteAsMenu.ts:28-47` (`wholeWikiLink`, `pasteAsTarget`), `:68-122` (`pasteAsRows`, `pasteAsWrite`), `Core/MarkdownPM/Links/pasteLink.ts:106-108` (`pasteAs`), `Desktop/Actions/editorMenu.ts:103-116`, `Core/MarkdownPM/Links/connectionsApi.ts:63-74` (`resolveMdTarget`, `tokenTarget`), `Core/Nexus/treeIndex.ts` (`pageIndexOf`), `.claude/Features/MarkdownPM.md:107`, `.claude/Features/PropertiesPM.md:83`, `Core/Connections/links.ts:27-30` (`composeWebpageEmbedLine`), `Core/MarkdownPM/Embeds/embedInsert.ts:60`
[^43]: **F-043:** `Core/MarkdownPM/Tables/cellStatic.tsx:483-493` (`menuTarget`), `Core/MarkdownPM/Tables/MarkdownTable.tsx:483-487`, `Core/MarkdownPM/Tables/widget.tsx:239-242` (`commit`), `Core/MarkdownPM/Tables/sync.ts:11-30` (`cellCommitChange`), `Core/MarkdownPM/Links/linkFormat.ts:76-93` (`applyUrlLinkAction`), `Core/MarkdownPM/Links/pendingTitle.ts:20-65` (`sweepOnTitles`), `Core/Interface/Menus/connectionMenuActions.ts:22`, `Core/Actions/connectionMenu.ts:87-99`
[^44]: **F-044:** `Core/MarkdownPM/Engine/subfieldStats.ts:54-69` (`pageHidden`, `cellHidden`, `hiddenIn`), `Core/MarkdownPM/Engine/subfieldStats.ts:93` (`CHUNK_LINES`), `Core/MarkdownPM/Engine/subfieldStats.ts:127-136` (`computeStats`, `pageStats`, `rangeStats`), `Core/MarkdownPM/Engine/perText.ts:4-13` (`perText`), `UIX/Utilities/capMap.ts:9-16` (`capSet`), `Core/MarkdownPM/docCache.ts:40-52` (`drawnLast`), `Core/MarkdownPM/MarkdownEditor.tsx:182-192`, `Core/Pages/PageView.tsx:41`, `Core/Interface/Subfield/subfieldItems.tsx:27`, `Core/Interface/Subfield/CitationsToggle.tsx:10`
[^45]: **F-045:** `Core/MarkdownPM/Engine/subfieldStats.ts:96` (`proseRuns`), `Core/MarkdownPM/Engine/subfieldStats.ts:111-124,142` (`tableProse`), `Core/MarkdownPM/MarkdownEditor.tsx:182-192`, `Core/Interface/Subfield/publish.ts:18-21` (`usePublishSelection`), `Core/Session/chromeSlice.ts:83-88` (`setEditorSelection`)
[^46]: **F-046:** `Core/MarkdownPM/Engine/subfieldStats.ts:28-34` (`proseStart`), `Core/MarkdownPM/Engine/subfieldStats.ts:39-52` (`hiddenOf`), `Core/MarkdownPM/Engine/subfieldStats.ts:93,127-133` (`CHUNK_LINES`, `computeStats`, `pageStats`), `Core/MarkdownPM/Engine/intents.ts:135-155` (`tokenIntents`), `Core/MarkdownPM/docCache.ts:40-52` (`drawnLast`), `Core/Interface/Subfield/subfieldPage.ts:6-7,56-61`, `Core/Interface/Subfield/subfieldItems.tsx:8-11,24-27`, `Core/Interface/Subfield/CitationsToggle.tsx:8-13`, `Core/Interface/ContentView.tsx:210-215`, `Core/Pages/bodyMount.ts:33,39-41,51-57`, `Core/Session/pageDetailCache.ts:45-56` (`BodyMount`), `Core/MarkdownPM/MarkdownEditor.tsx:182-192`
[^47]: **F-047:** `Core/MarkdownPM/Menus/blockHandles.ts:45-53` (`blockHandles`), `Core/MarkdownPM/Engine/blockModel.ts:32-46` (`blockContext`), `Core/MarkdownPM/Engine/blockModel.ts:91-99` (`blockContextOf`), `Core/MarkdownPM/Engine/blockModel.ts:177` (`blockStarts`), `Core/MarkdownPM/Engine/docScan.ts:38-55` (`DocScan`, no `markers` field), `Core/MarkdownPM/Engine/docScan.ts:63` (`scanLines`), `Core/MarkdownPM/Engine/docScan.ts:159-223` (`splice`), `Core/MarkdownPM/Input/listRenumber.ts:30,33` (`listRenumber`), `Core/MarkdownPM/Engine/docScan.test.ts:146` (the `rescan ≡ scanDoc` property).
[^48]: **F-048:** `Core/MarkdownPM/Engine/intents.ts:356-383` (`railIntents`), `Core/MarkdownPM/Engine/intents.ts:414-416` (`withRails`), `Core/MarkdownPM/Tables/cellStatic.tsx:206-226` (`renderCellBody`), `Core/MarkdownPM/Engine/intents.test.ts` ('outliner rails').
[^49]: **F-049:** `Core/MarkdownPM/Engine/detect.ts:642-656` (`headingParts`), `Core/MarkdownPM/Engine/headingScan.ts:28` (`scanHeadings`), `Core/MarkdownPM/Guards/headingRenameSettle.ts:27-28` (`headingRenameOf`), `Core/MarkdownPM/Guards/headingRenameSettle.ts:44` (`headingRenameSettle`), `Core/MarkdownPM/Menus/gripMenu.ts:79,92` (`popHeadingMenu`), `Core/MarkdownPM/folding.ts:65` (`regionsOf`), `Core/Index/indexSeed.ts:52`, `Core/Nexus/cascade.ts:186`.
[^50]: **F-050:** `Core/MarkdownPM/Engine/headingScan.ts:20-34` (`scanHeadings`), `Core/MarkdownPM/Engine/headingScan.ts:44-51` (`headingOutlineOf`), `Core/MarkdownPM/Engine/headingScan.ts:61-83` (`sectionCache`, `headingSections`), `Core/MarkdownPM/Engine/blockModel.ts:90-99` (`blockContextOf`), `Core/MarkdownPM/docCache.ts:95-99` (`docOutline`, `docHeadingKeys`, `docSectionHeadings`), `Core/MarkdownPM/folding.ts:65` (`regionsOf`), `Core/MarkdownPM/decorations.ts:514,633`, `.claude/Guidelines/Editor-Internals.md:26`.
[^51]: **F-051:** `Core/MarkdownPM/Engine/detect.ts:515-525` (`ListMarker`), `Core/MarkdownPM/Engine/detect.ts:533-539` (`isSequenced`, `ordinalOf`), `Core/MarkdownPM/Engine/detect.ts:548-606` (`parseListMarker`), `Core/MarkdownPM/Engine/detect.ts:608-621` (`parseListMarkerPrefixed`), `Core/MarkdownPM/Engine/intents.ts:109,603,617`, `Core/MarkdownPM/Engine/listDragModel.ts:28,207`, `Core/MarkdownPM/Input/edits.ts:82-83` (`continueListOnEnter`), `Core/MarkdownPM/Tables/cellStatic.tsx:194`.
[^52]: **F-052:** `Core/MarkdownPM/Engine/tokens.ts:59-71` (`shiftToken`), `Core/MarkdownPM/Engine/tokens.ts:266` (`tokenizeChunk`), `Core/MarkdownPM/decorations.ts:346` (`visibleInline`), `Core/MarkdownPM/Engine/tokens.test.ts:135-149`.
[^53]: **F-053:** `Core/MarkdownPM/Engine/intents.ts:425-426` (`moveIntent`), `Core/MarkdownPM/Engine/intents.ts:428-449` (`stepLineIntents`), `Core/MarkdownPM/Engine/intents.ts:507-534` (`assembleLineIntents`, `prefixEndAt`, `seatPastMarker`), `Core/MarkdownPM/Engine/docScan.ts:198,204` (`splice`), `Core/MarkdownPM/Engine/docScan.ts:229-241` (`moveRange`, `moveLine`, `moveTable`), `Core/MarkdownPM/docCache.ts:92`, `Core/MarkdownPM/decorations.ts:359` (`atomicsOn`), `Core/MarkdownPM/Engine/detect.ts:92-103`.
[^54]: **F-054:** `Core/MarkdownPM/decorations.ts:433-445` (`build`), `Core/MarkdownPM/Embeds/embedWidget.tsx:403-411` (`buildTiles`), `:646-648` (`embedTileRanges`), `Core/MarkdownPM/Engine/embedClaims.ts:10-25` (`claimedEmbeds`), `Core/MarkdownPM/MarkdownEditor.tsx:164` (`embedTiles`), `Core/MarkdownPM/Tables/cellStatic.tsx:42` (`cellTokens`), `Core/MarkdownPM/Engine/tokens.ts:329-342` (`linkTokenAt`), `Core/MarkdownPM/Links/connectionClicks.ts:20-34,81` (`wikiLinkAt`, `connectionClicks`), `Core/MarkdownPM/Links/linkEdit.ts:35-48` (`applyLinkAction`), `Core/Properties/Cells/TextCell.tsx:60`, `.claude/Guidelines/Editor-Internals.md:24`
[^55]: **F-055:** `Core/MarkdownPM/markdown-pm.css:678-680` (the margin rule), `:681-692` (the `::before` inset and padding), `:588`, `Core/MarkdownPM/Engine/intents.ts:179` (`pageChrome`), `.claude/Guidelines/Editor-Internals.md:21` ("Box constructs float with an outer gap, never a line margin")
[^56]: **F-056:** `Core/MarkdownPM/Embeds/embedWidget.tsx:565-573` (`embedAtomic`), `:495-500` (`mapRanges`), `.claude/Guidelines/Editor-Internals.md:11`
[^57]: **F-057:** `Core/MarkdownPM/Menus/blockHandles.ts:70-77,107-110` (`TagReveal`), `Core/MarkdownPM/Engine/intents.ts:256` (the code tag widget)
[^58]: **F-058:** `Core/MarkdownPM/decorations.ts:643-646` (`build`)
[^59]: **F-059:** `Core/MarkdownPM/folding.ts:195-210` (`foldField`), `:133-149` (`collapseEffect`), `:336-342` (`editAcrossCitations`), `Core/MarkdownPM/api.ts:63-71` (`mirrorBody`), `Core/Session/saveScheduler.ts:142-143` (`followBody`), `Core/Pages/bodyMount.ts:44` (`follow`), `.claude/Guidelines/Editor-Internals.md:30`
[^61]: **F-061:** `Core/Tiles/Surfaces/MarkdownTile.tsx:27` (`useEditorHost`), `Core/Pages/editorHost.tsx:77-82` (`citations`), `Core/MarkdownPM/folding.ts:406-415` (`dividerPress`), `Core/MarkdownPM/Citations/citationActions.ts:31,74` (`travelToCitation`, the marker press's reveal)
[^62]: **F-062:** `Core/Properties/Cells/TextCell.tsx:27,60` (`TextCell`), `Core/MarkdownPM/Tables/cellStatic.tsx:36-39,157` (`CellPage`, `renderCellContent`), `Core/MarkdownPM/decorations.ts:412-419,556,583` (`build`)
[^63]: **F-063:** `Core/MarkdownPM/Embeds/scrollHeal.ts:1-8` (`healTileScrolls`), `Core/MarkdownPM/Embeds/embedWidget.tsx:688-696` (`reslotHeal`), `Core/MarkdownPM/MarkdownEditor.tsx:215-222`
[^64]: **F-064:** `Core/Tiles/tile-base.css:78-92`, `Core/Interface/Windows/WindowTabBody.tsx:84,155-159` (`useWindowTabBody`), `Core/MarkdownPM/MarkdownEditor.tsx:210-229,255`, `Core/Interface/Windows/windowCache.ts:3-12` (`bodyScroll`), `Core/Interface/Windows/useWindowWarm.ts:21-57` (`useWindowWarm`), `Core/MarkdownPM/travel.ts:12-15` (`scrollerOf`)
[^65]: **F-065:** `Core/Pages/PageView.tsx:31-36,114-132` (`warm`), `Core/Session/warmCache.ts:36-40` (`dropWarmDetail`), `:52-71` (`warmSeamOf`), `Core/Session/navigationSlice.ts:322`
[^66]: **F-066:** `Core/MarkdownPM/Engine/detect.ts:170-198` (`htmlBlocks`), `Core/MarkdownPM/Engine/docScan.ts:103-112,131-163,275-277` (`quietAt`, `loneAbove`, `pairsBelow`, `chunksOver`), `Core/MarkdownPM/Engine/parser.ts:17-36` (`parse`), `Core/MarkdownPM/Engine/markdownCode.ts` (the fence grammar), `.claude/Guidelines/Editor-Internals.md:5` (the CommonMark divergences).
[^67]: **F-067:** `Core/MarkdownPM/Engine/headingScan.ts:24-25` (`scanHeadings`), `Core/MarkdownPM/Engine/docScan.ts:38-58,93-99,365-372` (`withCitations`, `scanDoc`, `inSealedLine`), `Core/MarkdownPM/Engine/detect.ts:170-198` (`htmlBlocks`), `Core/MarkdownPM/Engine/blockModel.ts:81` (`kindAt`), `Core/MarkdownPM/Engine/intents.ts:588` (`pushConstruct`), `Core/MarkdownPM/decorations.ts:430`, `Core/MarkdownPM/docCache.ts:15-34,64-67` (`perDoc`, `docScan`), `Core/MarkdownPM/Input/htmlShortcuts.ts:3,9`, `Core/Settings/personalization.ts:150` (`htmlFormatting`), `Core/Index/indexSeed.ts:46-52` (`extractPageIndex`), `Core/Nexus/cascade.ts:186`, `.claude/Features/MarkdownPM.md:28`.
[^68]: **F-068:** `Core/MarkdownPM/Tables/sync.ts:4,26-29` (`cellCommitChange`), `Core/MarkdownPM/Engine/Tables/codec.ts:84` (`pipeRow`), `Core/MarkdownPM/Engine/detect.ts:451-484` (`calloutLines`), `Core/MarkdownPM/Engine/detect.ts:486-491` (`calloutHeadPrefixLen`), `Core/MarkdownPM/Guards/aliasGuard.ts:1-9` (`refusedInAlias`), `Core/MarkdownPM/Input/edits.ts:3,356-360` (`autoPair`), `Core/MarkdownPM/Input/markdownInput.ts:41,249` (`typedInput`), `Core/Connections/connections.ts:50-53` (`aliasSpanAt`), `Core/MarkdownPM/Tables/cellStatic.tsx:16,333-345` (`claimCheckbox`), `Core/MarkdownPM/Input/format.ts:314,340-352` (`setBlock`, `stripInnerMarkers`, `stripBlockMarkers`), `Core/MarkdownPM/Tables/cellAlias.test.tsx:88-95`
[^69]: **F-069:** `Core/MarkdownPM/Autocomplete/autocomplete.ts:30` (`AcQuery`), `Core/Actions/blockMenu.ts:21-27,98-104` (`BlockMenuMatch`, `filterBlockMenu`), `Core/Actions/blockMenu.test.ts:57,83,92,102,112-116,121`, `Core/MarkdownPM/Menus/BlockMenuPane.tsx:46`, `Core/MarkdownPM/api.ts:201-202` (`EditorHost.paneGeometry`), `Core/Pages/editorHost.tsx:93`, `Core/MarkdownPM/MarkdownEditor.tsx:303`, `Core/MarkdownPM/Autocomplete/useConnectionAutocomplete.ts:237`, `Core/Testing/editorHarness.ts:100-127` (`harnessHost`), `Core/Pages/PageView.tsx:102-106`, `Core/Tiles/Surfaces/PageTile.tsx:189-191`
[^71]: **F-071:** `.claude/Features/MarkdownPM.md:8,10,12,24,57,70,77,87,107,171`, `.claude/Features/PropertiesPM.md:83`, `.claude/Features/ConnectionsPM.md:12`, `.claude/Guidelines/Editor-Internals.md:5,18,30`, `Core/MarkdownPM/Guards/headingRenameSettle.ts:2,6`, `Core/Actions/gripMenu.ts`, `Core/Actions/blockMenu.ts:73-76,83` (`EMBED_ROWS`, `BLOCK_MENU_SECTIONS`), `Core/MarkdownPM/Engine/tokens.ts:256-262` (`tokenizeChunk`), `Core/MarkdownPM/Tables/cellLists.test.tsx:91-93`, `Core/MarkdownPM/Engine/listDragModel.ts:201-204` (`renumberRuns`), `Core/MarkdownPM/Input/listRenumber.test.ts:62`, `Core/MarkdownPM/Input/format.ts:268-273` (`setListKind`), `Core/MarkdownPM/Citations/citationPointer.ts:93-105` (`citationRowPointer`), `Core/MarkdownPM/Citations/citationActions.ts:147-149`, `Core/MarkdownPM/Menus/gripMenu.ts:50-69` (`contextFor`), `Core/MarkdownPM/Menus/blockHandles.ts:15-23` (`GRIP_KINDS`), `Core/MarkdownPM/codeGlyphs.ts:14-59` (`CODE_TAGS`)
[^72]: **F-072:** the delete and merge rows of *§Appendix: MarkdownPM Test Dispositions*; `Core/Session/warmCache.ts:64`, `Core/MarkdownPM/Input/markdownInput.ts:249` (`typedInput`), `Core/MarkdownPM/Guards/citationGuard.test.ts:35-38,46-48,88-90,129-131,266-268`
[^73]: **F-073:** the tighten and move rows of *§Appendix: MarkdownPM Test Dispositions*; `Core/MarkdownPM/Engine/Tables/codec.ts:20-29` (`restoreTrailingItem`), `Core/MarkdownPM/Input/edits.ts:478` (`CLOSERS`), `Core/MarkdownPM/Autocomplete/useConnectionAutocomplete.ts:163`, `Core/MarkdownPM/Engine/subfieldStats.test.ts:128-133`
[^74]: **F-074:** `vitest.config.ts:4`, `Core/vitest.config.ts:8`, `Core/vitest.setup.ts:1`, `UIX/vitest.setup.ts:13-19`, `Core/Testing/editorHarness.ts:157-158` (`stubEditorBridge`), `Core/MarkdownPM/Embeds/embedResize.test.tsx:66-77`, `Core/MarkdownPM/Tables/dragOrigin.test.tsx:13-23`, `Core/MarkdownPM/Tables/cellSweep.test.tsx:13-23`, `Core/MarkdownPM/readOnlySelection.test.tsx:9-40`, `Core/Interface/Glance/GlancePane.test.tsx:22-27`, `Core/Properties/PropertyPanel.test.tsx:16-21`, `Core/Assets/ImagePicker.test.tsx:54-61`, `UIX/vitest.config.ts:8`, and the setup rows of *§Appendix: MarkdownPM Test Dispositions*
[^75]: **F-075:** `Core/Testing/markdownEngine.ts:4-10,19,61-68` (`citationScan`), `Core/MarkdownPM/Engine/docScan.ts:94` (`scanDoc`), `Core/MarkdownPM/Guards/citationGuard.test.ts:12-15` (`scanOf`), `Core/MarkdownPM/Citations/citationEdits.test.ts:16-19,280-284` (`scanOf`, `stranded`), `Core/MarkdownPM/Citations/citationBreakage.test.tsx:29-33` (`stranded`), `Core/Testing/editorHarness.ts:65-69,83-90,131-136,175,178` (`harnessHost`, `testHost`), `Core/Pages/editorHost.tsx:46-54,60-68` (`wear`), `Core/Connections/aliasMemory.ts:1-9` (`rememberAlias`, `forgetAlias`), `Core/MarkdownPM/Autocomplete/connectionCommit.test.tsx:85-88`, `Core/MarkdownPM/Engine/detect.ts:45-46`, `Core/MarkdownPM/Engine/docScan.test.ts:58-60,96` (`LINES`, `CHARS`)
[^76]: **F-076:** `UIX/Buttons/button-base.css.ts:68-93` (`button`), `UIX/Buttons/Button.tsx:54-77`, `UIX/Menus/menu-row.css.ts:24-37` (`rowFocus`, `rowShell`), `UIX/Fields/fieldRing.ts:11,19-33` (`fieldRing`)
[^77]: **F-077:** `UIX/Interactions/dismissalStack.ts:60-75` (`onPointerDown`), `UIX/Interactions/dismissalStack.ts:114` (`shields`), `UIX/Pickers/PickerMenu.tsx:113-121,292,307` (`PickerMenu`), `UIX/Animations/useExitPresence.ts:8-24` (`useExitPresence`), `UIX/Pickers/PickerControl.tsx:91-114,144-148` (`PickerControl`), `Core/Actions/menuActions.ts:20-23` (`popMenu`), `Core/Session/chromeSlice.ts:62-70` (`presentMenu`), `Core/Interface/Menus/MenuPresenter.tsx:84-103` (`MenuPresenter`), `Core/Tiles/Surfaces/ViewTile.tsx:652-660`, `Core/Interface/Toolbar/Toolbar.tsx:29-33`, `Core/Views/Settings/GroupFrame.tsx:235`, `UIX/Interactions/shared.ts:26-34` (`suppressReleaseClick`)
[^78]: **F-078:** `Core/Contract/bridge.ts:61-255` (`Asks`), `Core/Nexus/mutateRequest.ts:51-108` (`mutateRequest`), `Core/Nexus/mutate.ts:109-143` (`setProfileImage`, `setProfileIcon`, `setDisclosureLock`, `setActiveView`), `Core/Nexus/mutate.ts:164` (`reorderTop`), `Core/Nexus/reorder.ts:26-55`, `Core/Views/handlers.ts:26-62`, `Core/Properties/assignment.ts:113-171` (`assignInner`, `reorderAssignment`), `Core/Settings/handlers.ts:19-51`, `Core/Assets/handlers.ts:42` (`assets:setDir`), `Core/Assets/handlers.ts:74` (`assets:adopt`), `Core/Assets/assetMigrate.ts:113`, `Core/Pages/setBanner.ts:44`, `Core/Nexus/configReach.ts:372,380`, `Core/Nexus/cascade.ts:219`, `Core/Navigation/handlers.ts:18` (`nav:write`), `Core/Matrix/handlers.ts:14` (`matrix:write`), `Core/Pages/handlers.ts:26` (`page:updateBody`), `Core/Pages/handlers.ts:45-47` (`history:restore`), `Core/Pages/fileHistory.ts:169-180`, `Core/Nexus/handlers.ts:150` (`nexus:rename`), `Core/Nexus/liveTree.ts:80` (`mutableTarget`), `Core/Tiles/handlers.ts:60-113`, `Core/Properties/handlers.ts:121-124` (`defEditOp`), `Core/Properties/handlers.ts:165-176`, `Core/Contract/handlers.ts:98-110` (`withWriteRoot`), `Desktop/FileWatch/watcher.ts:69-92,114-117` (`pushConfig`)
[^79]: **F-079:** `Core/Nexus/cascade.ts:81-90` (the survivor gate in `deleteCascade`), `Core/Nexus/heldPages.ts:59` (`titleHeldOutside`), `Core/Trash/spend.ts:251-270` (the restore's link arm over its own record), `Core/Properties/assignment.ts:49` (`refillValues`, blank-only), `Core/Trash/spend.ts:87-88` (the empty-time handoff)
[^80]: **F-080:** `Core/Trash/holdings.ts:68` (`trashedTitles`), `Core/Trash/holdings.ts:82` (`parkLinks`), `Core/Trash/spend.ts:58,88` (`emptyBundle`), `Core/Trash/spend.ts:192` (a restore's parking), `Core/Settings/TrashFrame.tsx:116,143,156` (`many`, one request per row)
[^81]: **F-081:** `Desktop/Store/stores.ts:44-46` (`clearPath`), `Desktop/Store/stores.ts:49-76` (`upsertPageIndexes`), `Desktop/Store/stores.ts:77-97` (`removePathIndex`, `renamePathIndex`, `removePathPrefixIndex`, `renamePathPrefixIndex`), `Desktop/Store/driver.ts:16-26` (`inTransaction`), `Desktop/Store/stores.ts:209-251` (`syncStore`), `Core/Sync/handlers.ts:352,365`, `Core/Sync/Client/base.ts:16,21` (`readAllBases`, `deleteBase`)
[^82]: **F-082:** `Core/Nexus/fileEvents.ts:454-477` (`applySpace`), `Core/Nexus/fileEvents.ts:564-584` (`applyMove`), `Core/Nexus/treePatch.ts:238-264` (`moveNodeInTree`), `Core/Nexus/fileEvents.ts:480-501` (`regroup`, `applyContexts`), `Core/Contexts/contextCascade.ts:208,240-248` (`renameContextOp`), `Core/Contexts/contextCascade.ts:266,299-305` (`renameSpaceOp`), `Core/Files/atomicWrite.ts:62-75` (`relocate`), `Core/Nexus/readNexus.ts:77-85` (`contextLinker`), `Core/Nexus/fileEvents.ts:376-418` (`applyPage`), `Core/Properties/pageRow.ts:11-17` (`pageRowOf`), `Core/Contexts/contextResolve.ts:70` (`resolveContextKeys`)
[^83]: **F-083:** `Core/Properties/journalSlot.ts:14` (`journalSlot`), `Core/Properties/propertyJournal.ts:47-57` (`writeSchemaJournal`, `schemaCascade`), `Core/Contexts/contextJournal.ts:47-49` (`writeJournal`), `Core/Nexus/handlers.ts:82,102` (the two replays), `Core/Contexts/contextResolve.ts:29` (`contextWorldOf`), `Core/Properties/registryProperty.ts:97-132` (`renameProperty`), `Core/Contexts/contextCascade.ts:208-264` (`renameContextOp`), `Core/Contexts/contextCascade.ts:113-114` (`unswept`), `Core/Nexus/mutate.ts:60-68` (`renamed`), `Core/Trash/delete.ts:61-85` (the delete's write-ahead record), `Core/Properties/governedSweep.ts`, `Core/Contexts/spaceSidecar.ts:45-52` (`spaceSidecars`), `Core/Properties/governedSweep.ts:96`, `Core/Properties/deleteProperty.ts:54`, `Core/Assets/assetMigrate.ts:162`, `Core/Properties/keyHolders.ts:21,33` (`confirmedKeyHolders`), `.claude/Planning/Data Layer — Investigation Reports/E — Governed Data Sweeps.md` (the nine loops and five enumerators)
[^84]: **F-084:** `Core/Properties/optionOps.ts:256-274` (`removeOption`), `Core/Properties/propertyJournal.ts:52-57` (`SchemaCascade`, `schemaCascade`), `Core/Properties/replaySchemaCascade.ts:75-87`, `Core/Properties/Schema/PropertyFrame.tsx:187-191` (`retryOwed`), `Core/Properties/journalSlot.ts:14` (`journalSlot`), `Core/Properties/governedSweep.ts:38` (`unsweptLine`)
[^85]: **F-085:** `Core/Nexus/fileEvents.ts:146-152` (`stampable`), `Core/Nexus/fileEvents.ts:348-374` (`applyFolder`), `Core/Nexus/fileEvents.ts:376-418` (`applyPage`), `Core/Nexus/fileEvents.ts:516-532` (`applySettings`, `oweRescope`), `Core/Nexus/mutate.ts:209-214` (`retryUnreadable`), `Core/Nexus/settle.ts:96-117` (`walkWhileOwed`), `Core/Nexus/settle.ts:172-181` (`stampListed`), `Core/Nexus/settle.ts:63-71` (`shown`), `Core/Nexus/settle.ts:119-154` (`settle`)
[^86]: **F-086:** `Core/Nexus/settle.ts:55` (`inTurn`), `Core/Platform/inTurns.ts:2-9` (`inTurns`), `Core/Nexus/settle.ts:203` (`payOwedWalk`), `Core/Nexus/settle.ts:206-214` (`settleNow`), `Core/Nexus/settle.ts:119-154` (`settle`), `Core/Nexus/settle.ts:96-117` (`walkWhileOwed`), `Core/Nexus/settle.ts:34-46` (`applyOwn`)
[^87]: **F-087:** `Core/Properties/governedSweep.ts:120-130` (`undoSweep`), `Core/Contexts/contextCascade.ts:181-195` (`unlinkMembers`), `Core/Nexus/mutate.ts:73-80` (`underContexts`), `Core/Nexus/mutate.ts:90-91,153-154` (`rename`, `movePage`)
[^88]: **F-088:** `Core/Nexus/fileEvents.ts:564-584` (`applyMove`), `Core/Nexus/treePatch.ts:238-264` (`moveNodeInTree`), `Core/Nexus/fileEvents.ts:348-374` (`applyFolder`), `Core/Nexus/fileEvents.ts:376-418` (`applyPage`), `Core/Index/indexSeed.ts:116-136` (`indexWrittenPage`), `Core/Files/atomicWrite.ts:62-75` (`relocate`), `Core/Files/writeEcho.ts:10,74-88` (`PREFIX_WINDOW_MS`, `isRecentWrite`)
[^89]: **F-089:** `Core/Nexus/adopt.ts:62-82` (`stampPage`), `Core/Nexus/adopt.ts:89-98` (`ensurePageId`), `Core/Nexus/adopt.ts:102-115` (`stampFolder`), `Core/Nexus/adopt.ts:126-143` (`Stamp`, `stampMissing`), `Core/Nexus/adopt.ts:145-191` (`stampTree`, `stampAdopted`), `Core/Nexus/fileEvents.ts:139-143` (`oweRetry`), `Core/Nexus/fileEvents.ts:146-152` (`stampable`), `Core/Nexus/fileEvents.ts:403-404` (`applyPage`), `Core/Nexus/fileEvents.ts:454-463` (`applySpace`), `Core/Nexus/readNexus.ts:105-109,312-317`, `Core/Nexus/mutate.ts:209-213` (`retryUnreadable`), `Core/Nexus/handlers.ts:34-51,79-96` (`prepareOpenedNexus`, `openStores`), `Core/Nexus/heldPages.ts:43` (`idHeld`), `Core/Nexus/identity.ts:17-50` (`ensureIdentity`), `Core/Nexus/remintLedger.ts:82-98` (`runOpenLedger`, `readBaseline`), `Core/Nexus/remintLedger.ts:17-27,59-80` (`projectBaseline`, `pickEldest`), `Core/Nexus/record.ts:15-47` (`recordsOf`, `recordById`), `Core/Nexus/heldPages.ts:16-25,40-41` (`indicesOf`, `livePathOf`), `Core/Nexus/treeIndex.ts:254-258` (`pagesByIdOf`), `Core/Contexts/contextResolve.ts:29-42` (`contextWorldOf`), `Core/Contexts/contexts.ts:12-17,35-43` (`contextEntry`, `seededRegistry`), `Core/Contexts/contextsRegistry.ts:20-25` (`ensureContextsRegistry`), `Core/Trash/restoreScrub.ts:85`
[^90]: **F-090:** `Desktop/hostGraph.test.ts:31-46`, `Core/Interface/handlers.ts:39-84` (`interfaceHandlers`), `Core/Settings/handlers.ts:50`, `Core/Interface/chrome.ts:1-8`, `Core/Interface/Windows/windowTabs.ts`, `Core/Interface/Windows/windowRecord.ts`, `Core/Interface/Windows/windowState.ts`, `Core/Interface/Windows/windowCache.ts`, `Core/Interface/Windows/windowMorph.ts`, `Core/Properties/governedSweep.ts`, `Core/Properties/governedWrite.ts`, `Core/Properties/journalSlot.ts`, `Core/Properties/keyHolders.ts`, `Core/Views/filterModel.ts`, `Core/Views/visibilityModel.ts`, `Core/Views/creationOrder.ts`
[^91]: **F-091:** `Core/MarkdownPM/codeHighlight.ts:151` (`blockTrees`), `Core/MarkdownPM/codeHighlight.ts:155-183` (`paint`), `Core/MarkdownPM/codeHighlight.ts:185-218` (`colors`), `Core/MarkdownPM/docCache.ts:40-52` (`drawnLast`)
[^92]: **F-092:** `Core/Interface/Notifications/notifications.ts` (`reportRefusal`, `persist`, `notifyReport`), `Core/Contract/result.ts` (`ErrorCode`), `Core/Sync/Contract/wire.ts` (`SyncStatus`), `.claude/Planning/Error Surfaces — Brainstorm Brief.md`
[^93]: **F-093:** compares at `Core/MarkdownPM/Engine/intents.ts:341,446,536,588,664`, `Input/edits.ts:47,57,184,213`, `Menus/blockHandles.ts:44,49,174,189`, `decorations.ts:425,657`, `Engine/subfieldStats.ts:40`, `Gestures/listDrag.ts:52`, `Input/listRenumber.ts:39`, `Input/markdownInput.ts:237`, `Menus/menu.ts:94`; defaults at `Input/edits.ts:46,70,153,165,205,259`, `Engine/intents.ts:418,495,532`, `decorations.ts:776`, `Menus/blockHandles.ts:43,148`, `Core/Testing/markdownEngine.ts:51`; switches at `Engine/detect.ts:493-503` (`readsLists`), `surface.ts:26-41`, `docCache.ts:84`; the enum at `Core/Actions/editorMenu.ts:19`; unscoped readers at `Input/edits.ts:637-645` (`lineBodyBefore`, `opensLine`), `Gestures/listDrag.ts:3`, `Input/listRenumber.ts:30`, `Engine/listDragModel.ts` (`renumberRuns`, `dropChanges`), `Gestures/blockDrag.ts:31`; `.claude/Features/MarkdownPM.md:57`.
[^94]: **F-094:** `Core/MarkdownPM/MarkdownEditor.tsx:101-103,154`, `Core/MarkdownPM/Tables/CellEditor.tsx:150`, `Core/MarkdownPM/Embeds/embedWidget.tsx:40-48` (`embedHost.getConn`), `Core/Pages/editorHost.tsx:43,118,166` (`buildEditorHost`, `useEditorHost`), `Core/MarkdownPM/surface.ts:44-54`, `Core/MarkdownPM/api.ts` (`EditorHost`).
[^95]: **F-095:** `Core/Pages/editorHost.tsx:26-33,41-44,83-111,152-167` (`EditorHostOptions`, `buildEditorHost`, `useEditorHost`), `Core/Session/pageConnections.ts:9`, `Core/Interface/Windows/PageHistoryWindow.tsx:34-35,117-118,245-252` (`HISTORY_ANCESTOR`), `Core/Interface/Glance/GlancePane.tsx:42-43,284-295` (`GLANCE_ANCESTORS`), `Core/MarkdownPM/Embeds/embedWidget.tsx:398`, `Core/MarkdownPM/api.ts:198-199` (`pageSurface`), `Core/MarkdownPM/markdown-pm.css:67-69`.
[^96]: **F-096:** `Core/MarkdownPM/api.ts` (`EditorHost.menus`), `Core/Pages/editorHost.tsx:100-103`, `Core/Testing/editorHarness.ts:112`.
[^97]: **F-097:** `Core/MarkdownPM/Menus/gripMenu.ts:50-70,131-165` (`contextFor`, the action chain), `Core/MarkdownPM/Menus/blockHandles.ts:15-26,44` (`GRIP_KINDS`, `blockHandles`), `Core/MarkdownPM/Engine/blockModel.ts:209-210` (`blockStarts`), `Core/Actions/gripMenu.ts:16-24` (`GripMenuAction`).
[^98]: **F-098:** `Core/MarkdownPM/Engine/docScan.ts:47,50` (`maths`, `html`), `Core/MarkdownPM/Engine/docScan.ts:59` (`Span`), `Core/MarkdownPM/Engine/docScan.ts:227-228` (`fromOf`, `toOf`), `Core/MarkdownPM/Engine/blockModel.ts:66`.
[^99]: **F-099:** `Core/MarkdownPM/Engine/detect.ts:508` (`indentLevel`), `Core/MarkdownPM/Engine/subfieldStats.ts:127` (`computeStats`), `Core/MarkdownPM/Tables/widget.tsx:399,450` (`buildWidgetDecorations`, `refreshTableEffect`), `Core/MarkdownPM/Autocomplete/autocomplete.ts:214` (`connectionInsert`), `Core/MarkdownPM/Links/pendingTitle.ts:20` (`pendingTitles`), `Core/MarkdownPM/folding.ts:65,281` (`regionsOf`, `foldedRegions`), `Core/MarkdownPM/MarkdownEditor.tsx:38` (`EMPTY_PAGE_TEXT`), `Core/MarkdownPM/Engine/intents.ts:329` (`lineIntentsInto`).
[^100]: **F-100:** `Core/MarkdownPM/Engine/parser.ts:17-36` (`parse`), `Core/MarkdownPM/Engine/tokens.ts:256-326` (`tokenizeChunk`, `tokenize`), `node_modules/mdast-util-gfm-task-list-item/lib/index.js:11` (`devlop`'s `ok`), `node_modules/devlop/package.json` (the `development` condition)
[^102]: **F-102:** `Core/MarkdownPM/Engine/Tables/regions.ts:57` (`tableRegions`)
[^103]: **F-103:** `UIX/Pickers/PickerMenu.tsx:179-272` (`measure`), `UIX/Pickers/PickerMenu.test.tsx:390-481`
[^104]: **F-104:** `UIX/Animations/motion.ts:19` (`exitWait`), `UIX/Interactions/shared.ts:43` (`SETTLE_FALLBACK`), `UIX/Animations/useExitPresence.ts:29` (`useSettleFallback`), `UIX/Interactions/dragDisclose.ts:5` (`SETTLE_MS`), `UIX/Theme/nativeCaret.ts:335` (`SETTLE_DEADLINE_MS`), `Core/MarkdownPM/folding.ts:20` (`FOLD_SETTLE_MS`)
[^105]: **F-105:** `Core/Navigation/tab-base.css:8-10` (`.tab`), `Core/Navigation/tab-base.css:29-32` (`.tab:last-child`), `Core/Navigation/tab-base.css:143-155` (`.tabs-standard`, `.tabs-compact`), `Core/Settings/personalization.ts:45-48` (`TAB_MAX_WIDTH`), `Core/Settings/applyPersonalization.ts:50`, `.claude/Features/ConfigurationPM.md:66`
[^106]: **F-106:** `Core/Views/Host/useViewCreation.ts:151-177` (`createPageIn`), `Core/Views/Host/useViewInteractions.tsx:46,135` (`rename`), `Core/Views/Cards/CardsView.tsx:196` (`beginRename`), `Core/Views/Table/TableView.tsx:122-130`, `Core/Session/editSlice.ts:16,31,108` (`beginRename`, `renamingPath`), `Core/Session/nexusSlice.ts:220-258` (`mutate`), `Core/Nexus/mutateRequest.ts:125-128` (`minted`)
[^107]: **F-107:** `Core/Views/Bands/bandRouter.ts:74-109` (`routeSet`), `Core/Views/Bands/bandRouter.ts:134-146` (`runBandEffect`), `Core/Views/Host/pendingView.ts:172-186` (`mutateAhead`), `Core/Views/Host/pendingView.ts:109-121` (`stageView`, `unstageView`), `Core/Views/Host/useViewCreation.ts:151-177` (`createPageIn`), `Core/Views/Host/useViewInteractions.tsx:196-203`
[^108]: **F-108:** `Core/Views/Host/useViewCreation.ts:125-139` (`orderPatch`), `Core/Views/Host/useViewCreation.ts:151-177` (`createPageIn`), `Core/Views/Host/pendingView.ts:116-121` (`unstageView`), `Core/Views/views.ts:337-345` (`slotsOf`)
[^109]: **F-109:** `Core/Matrix/MatrixCanvas.tsx:129-145`, `Core/Matrix/MatrixCanvas.tsx:176-197`, `Core/Matrix/matrix.css.ts:39-46`
[^110]: **F-110:** `Core/Tiles/Layout/codec.ts:26-31`, `Core/Tiles/tileDocStore.ts:143-153` (`adopt`), `Core/Tiles/TileHost.tsx:283-295`, `Core/Tiles/tilesFile.ts:136-145,192,235-242,253,277`, `Core/Tiles/tileDoc.ts:20-23` (`readTileDocAt`), `Core/Files/atomicWrite.ts:215` (`setAside`)
[^111]: **F-111:** `Core/Tiles/TileGrid.tsx:207-226` (`TileShell`'s comparator)
[^112]: **F-112:** `Core/Tiles/tileHosts.ts:16-37` (`TILE_HOSTS`), `Core/Nexus/migrateConfig.ts:45-53` (`normalizeSavedViews`), `Core/Nexus/identity.ts:58-62` (`ensureConfigLayout`), `Core/Nexus/remint.ts:110`
[^113]: **F-113:** `Core/Files/atomicWrite.ts:202-203` (`readAppFile`), `Core/Files/atomicWrite.ts:178-193` (`readLast`), `Core/Files/atomicWrite.ts:207-212` (`readAppFileKnown`), `Core/Files/atomicWrite.ts:144-161` (`rmwLocked`), `Core/Files/atomicWrite.ts:225-236` (`updateNexusFile`), `Core/Files/atomicWrite.ts:265-271` (`updateNexusConfig`), `Core/Nexus/readNexus.ts:68` (`readOrder`), `Core/Nexus/readNexus.ts:113` (`readConfig`), `Core/Nexus/readNexus.ts:287` (`readNexusConfig`), `Core/Navigation/navigationFile.ts:33-41` (`readNavigationFile`), `Core/Matrix/matrixFile.ts:11` (`readMatrixFile`), `Core/Nexus/fileEvents.ts:543-562,633-634` (`applyOrder`), `Core/Session/navigationSlice.ts:268` (`writeNav`), `Core/Session/matrixSlice.ts:186` (`patchMatrix`), `Core/Interface/Notifications/notifications.ts` (`persist`, `reportRefusal`), `Core/Assets/assetMigrate.ts:85-114,166,175` (`collectRefs`, `migrateAssets`), `Core/Tiles/tileDoc.ts:20` (`readTileDocAt`)
[^114]: **F-114:** `Core/Nexus/treeIndex.ts` (`pageIndexOf`), `Desktop/Actions/editorMenu.ts:103-116` (`pasteAsItems`), `Desktop/tsconfig.node.json`
[^115]: **F-115:** `Core/Session/store.test.tsx` ('drops a page move whose flush waited out a switch'), `Core/Session/nexusSlice.ts:174-190` (`load`)
