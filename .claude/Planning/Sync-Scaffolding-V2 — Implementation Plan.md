## Sync-Scaffolding-V2 — Implementation Plan

> **Status:** Closed 09-14-2026 · implements [[Sync-Scaffolding-V2 — Decision Log]] · [[NexusSyncPM]] describes what stands · 63 commits, `7913eadca`..`f1f1349b1` · START 2026-09-14T03:08:15Z · END 2026-09-14T20:19:44Z

### Context

This plan implements the content half of Pommora Sync on the identity layer the Sync Groundwork arc shipped: a star topology in which every device pushes encrypted whole-file items to one hub Pommora owns and pulls the change log back, with the hub's version counter detecting conflicts and recency resolving them, the loser captured on both ends, a landing merged into an open editor without a prompt, and every JSON configuration file merged key by key. It touches `Sync/` (the hub, from one file into a folder), `Core/Sync/` (the contract, keys, client, and arrival), the host seams in `Desktop/` (machine bytes, the sync transport, the device's second key, the watcher tap, two store tables), the renderer's page view and save scheduler, the Settings › General Nexus heading, and the documents the arc makes false.

It leaves alone the phone, accounts, other authentication methods, cloud hosting beyond a Dockerfile, direct device-to-device transfer, a Nexus password change (a Prospect: the ring re-wraps, no channel exists yet), content-key rotation beyond revoke, the File History frame's reading of hub versions, thumbnails travelling, the Windows machine, `Dashboard/`, and every Locked Decision. The retired decision logs are recoverable at `7c7a68f47^` and `5f4b07c0b^`; this plan cites the V2 log only.

### Summary

Today Pommora knows which devices belong to a Nexus and nothing crosses between them. When this plan is done, an edit on one Mac reaches another Mac holding the same Nexus within a few seconds through a small hub process: the file is encrypted on the device, sent to the hub as a numbered change, and pulled down by every other device, which decrypts it, writes it in place with the original edit time, and, if the page is open, merges it into the editor around the caret. If two devices edit the same file while apart, the hub notices, the newer edit wins, and the older one is kept in both places rather than lost. Settings and organization files merge one setting at a time instead of one side overwriting the other.

The arc shipped in ten phases across two sessions: host seams, the manifest predicate and one walker, the hub as a folder with roles, caps, TLS, blobs, a change log, and a long poll, the keys and the ring, arrival and the two merges, the client's tap, push, pull, reconcile, and session, the editor's compare-and-swap and landing merge, the Nexus heading, the container image, the two-instance proof, and the documents. Every phase ran executor → gates → simplification review → build-breaking review with fixes folded back; three Fable reviews then read the whole diff and their fixes landed in four commits. The final source diff is +4,201 / −646 lines excluding tests.

### Deviations

The rulings that changed the design from the plan's letter, each written in chat as it was made.

- **A blob stays sealed under the path it was written at.** `itemAad` binds the NFC path, so the hub keeps a renamed item's record unchanged; `record.path` is the AAD path for every decrypt and `change.path` is where the file lives. A rename whose source is absent locally lands as a write of its record's blob.
- **The long poll waits outside the session chain;** only applying a reply runs under it, so a push queued during the 25 s wait runs at once. A thrown push or reconcile reports an error status instead of `idle` and never ends the loop; a generation token keeps a stop during the key fetch from resurrecting a session; `stopSession` drains the chain and the store swap in `openNexusSequence` waits for it, and a rebind wipes its base rows only after that drain.
- **A snapshot's mtime is whole milliseconds** (the hub's validator requires an integer and macOS stat reports fractions for app-written files); a 400 never requeues its batch; a non-NFC or over-cap path stays home with a status notice and no `failed` entry.
- **A session starting over existing base rows sweeps every local path and base row,** skipping a path whose floored mtime and size match its row; the short-circuit applies to that sweep alone, since a tap delivery is known dirty and the cascade writers restore mtime and often length. A session loads its ring from a fresh `info` when the hub answers and starts from its cached ring when it does not.
- **A landing never overwrites an unpushed edit uncaptured:** a pull over a path in `failed` answers `error` and keeps the cursor; a landing over a dirty file whose push was declined captures the local bytes first; a rename onto a file that exists locally captures it; merged JSON lands under the current time and, with no base row, merges against `{}`; a write over a delete head resurrects with `base: null`.
- **The editor's body base lives as long as the open page:** a cache refresh and the LRU cap never delete it, a save never fetches a base (an unload flush cannot await a round trip), a landing with no base is a conflict that captures the buffer, the merged text is re-saved whenever it differs from disk, a merge-lost buffer resolves its page id from the live tree, `pages:changed` is pushed before `values:changed`, and the landing dispatch is diff-minimal so the caret keeps its logical position.
- **`sync:state` reports and never forgets;** the pull loop owns the revoke transition. Approve and revoke answer the running status. After a rotation the running session seals under the new ring at once.
- **The Nexus heading** is the executor's design under the brief, reviewed: captions ride their rows, the idle hint is the clock time of the last pass, the password field holds its text so it can be cleared and is emptied inside the connect closure, the pin rides only an `https:` address, Connect stays reachable on a password refusal, and a pushed approval refetches the binding.
- **A timer armed inside a file lock inherited the lock's held key** through `AsyncLocalStorage`, which broke `exclusions:set` on a bound device; the lock frame now carries liveness per key and refuses a take only while that key's call is in flight.
- **The hub certificate carries a named curve** (LibreSSL's explicit parameters made BoringSSL refuse every pinned handshake); `cert.sh` never overwrites an existing key. Docker was installed user-local (Lima, Colima, the static CLI under `~/.local`); the per-Dockerfile ignore list was inert under the classic builder and shipped the tests and a test private key, so the rules live in a root `.dockerignore`.
- **Phase 10 was run by the orchestrator on two rigs** (this session's over `http`, the resumed overnight session's over pinned `https`) rather than a phase executor; the neutral Opus verifier was skipped and three Fable agents reviewed the whole diff, all on Nathan's instruction. The arc added two code comments, the TLS notes in `Desktop/Sync/transport.ts`, and shortened one in `Core/Files/walk.ts`; the other comment rewrites the plan named became deletions.

### Open for Nathan

- A capture's retention clock is its arrival time; whether a client-supplied timestamp should travel.
- `captures` has no reader: with File History off a losing buffer sits in the database unseen.
- The reconnect backoff caps at 30 s, so a hub returning mid-sleep is noticed at the sleep's end (35 s in the proof); a shorter cap or a wake on `sync:now` alone.
- `SyncStatus` and `Change` are flat shapes with optional members beside sibling unions; discriminated forms would remove the `record`/`from` throws and the `reason?`/`why?` reads.
- `Core/Testing/syncHub.ts` is a hand-ported copy of the hub's `apply`, and its validation, device, and clock have drifted from the hub's; the client suites could boot `Sync/Testing/hub.ts` in-process, or the copy could call `openStore` and `log.applyStore` directly.
- With no certificate in its data directory the hub serves plain HTTP on whatever address it binds, and the Dockerfile binds `0.0.0.0`; refusing to start off loopback without a certificate would close that.
- The stale-head lookup scans the change log by path and source path with no index; `change(nexus_id, path, seq)` and `change(nexus_id, from_path, seq)` would make it a seek.
- The change log is never compacted and `reconcile` replays it from zero on every join, resync, and rescope; the hub's `item` table could answer heads in O(files).
- The AAD path binding is transit integrity, not blob-for-path confusion protection, since a device decrypts under whatever `record.path` the hub hands back.
- Row 17's undo half and the heading's rows are manual checks; `nav:write` accepts a duplicate pinned entry.

### Proof

**Results (09-14-2026, built output at `252e46cd4`, hub over `http://127.0.0.1:7481`, two scratch copies of NexusOS with the database files stripped, ports 9341 and 9342; the delta is B's disk reading minus A's ask return, polled every 100 ms; every row's observed column was written after the harness output was read).**

| Row | Expected | Observed | Delta ms | Result |
| --- | --- | --- | --- | --- |
| 1 createPage | new `.md` on B | landed | 2751 | pass |
| 2 page:updateBody | body on B | landed | 2756 | pass |
| 3 setProperty number | frontmatter on B | the second rig's run: `ProofNumber: 42` on B (2755); this rig's copy assigned no number definition, so checkbox (`Pinned`), datetime (`Timeframe`), and url (`Link`) values landed in its place | 2755 · 2753 · 2759 · 2758 | pass |
| 4 setProperty new select option | page and `.nexus/properties.json` on B | the second rig's run, through `property:setOptions` then `setProperty`: both files on B carry the new option | 2746 | pass |
| 5 setContext | frontmatter on B | `Areas: Area A` landed | 2754 | pass |
| 6 setIcon | `icon` on B | landed | 2755 | pass |
| 7 reorderChildren `page_order` | sidecar on B | landed (a `set_order` reorder takes the same writer) | 2754 | pass |
| 8 reorderTop | `.nexus/state.json` on B | landed | 2762 | pass |
| 9 createContainer set | folder and sidecar on B | landed; rename set and disclosure lock also landed | 2551 · 102 · 2749 | pass |
| 10 views:save | sidecar `views` on B | landed | 2757 | pass |
| 11 personalization:set | `.nexus/settings.json` on B | landed (`hideChevrons`; the second run's key merge is row 18) | 0 (already equal) · see 18 | pass |
| 12 nav:write pinned | `.nexus/state.json` on B | landed | 2858 | pass |
| 13 assets:adopt | the asset on B | the channel refuses a path the host picker did not hand over; the second rig's run adopted through `nexus:pasteImage` → `assets:adopt`, and the 391,260-byte PNG landed on B | 2799 | pass |
| 14 tiles:save homepage | `_tiles.json` on B | landed | 2861 | pass |
| 15 rename a connected page | one `rename` change on the hub; the rename and the rewritten holder on B | one `rename` row; the renamed file and its one holder's `[[Title]]` landed | 2863 | pass |
| 16 schema:rename | every holder on B; no cascade journal on B | the holder's key and `properties.json` landed; `.nexus/property-cascade.json` never on B | 2757 | pass |
| 17 remote edit into B's open editor | text arrives, selection head unchanged, outside undo | the second rig's run over CDP: B's mounted editor read head 35 before and after, and the line landed; the undo half stays Nathan's manual check | 2752 | pass |
| 18 hub stopped, two settings keys | both keys on both sides | after the hub returned, both sides hold both keys: 511 ms after an explicit `sync:now`; 35.5 s left to the loop's own reconnect (the second rig's run), since a session whose calls failed sleeps `1000 * 2 ** failures` capped at 30 s and a hub returning mid-sleep waits the sleep out | 511 · 35 500 | pass; over five seconds unassisted |
| 19 hub stopped, same page A then B | the newer body on both; the older captured | the newer (B) body on both; the older on B's `captures` as `remote-lost`; no hub capture row, since the side that lost was the remote — a hub capture ships only when the local side loses | 0 (A had pulled before the ask) | pass |
| 20 delete → restore → empty | bundle on B and in its `trash:list`; page back and bundle gone; bundle gone | all three landed | 2630 · 2750 · 2543 | pass |
| 21 thumbnail and `nexus.db` never on B | none | the hub's `item` table holds no `.db`, journal, or `thumbnails/` path across 443 items; B renders its own thumbnails | — | pass |
| 22 sync:revoke B | B `off` / `revoked`; no ring row for B | B answered `off`, `reason: revoked` | 12 | pass |

Beyond the plan's rows, the Cross-Device Mutation Checklist rows the bridge can drive were walked in the same run: move page into a set (102), rename page (102), create Context group (2863), create Space (2548), Space color (2755), assign a page to the new Space (2751), rename Space with its holder rewritten (2851), homepage heading icon hidden (2753). `exclusions:set` first failed on A with a re-entrant `settings.json` lock (the fix is recorded under Deviations); re-run at `0353b2e11`, the settings file landed on B in 2549 ms and B's tree dropped the folder 3063 ms after A's ask, and clearing the list landed the same way.
