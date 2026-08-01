## Deletion Bundle — Decision Log

**Status:** written — review round 1 folded, round 2 pending.

### Frame

- **Purpose:** Restructure the provenance half of the NexusRecord so the record is written *before* the destruction it describes and can never be separated from its artifact — one deletion becomes one self-contained folder in `.trash`.
- **Core Value:** A delete that crashes half-way leaves evidence instead of silent loss, and no rename, hand-move, or sync race can strand an artifact without its record.
- **Success Criteria:** Every nexus-trash **entity** delete (page, collection, set, space, context, property) produces a single `.deleted` bundle holding the artifact under its original name plus `record.json`; killing the process at any point mid-delete leaves either a completed bundle or a self-describing incomplete one, never unrecorded destruction; restore behavior is unchanged from the pair design for every already-passing case.

### Sources

- `src/main/provenance.ts` — the pair schema, gathers, resolver, restore mover; the resolver and mover carry over unchanged.
- `src/main/mutate.ts` — the delete arms (gather ordering per kind) and `removeViaMode`; the restore arm.
- `src/main/io/atomicWrite.ts` — `trashWithTimestamp`, the primitive this replaces.
- `src/main/crud/deleteProperty.ts` — already write-ahead (snapshot before scrub); the ordering this design generalizes.
- `src/main/record.ts` — `projectBaseline`, restore's id-live check; untouched.
- [[NexusRecord]] — the feature's durable home; its Provenance sections go false and are rewritten at ship.
- The architecture review of 08-01: an alternatives sweep (db table, central ledger, frontmatter stamps, path-encoded placement, journal, tombstones — all scored and rejected) and an execution-verified attack on the pair design, which converged on one root flaw: naming the record after the artifact's stamped destination makes write-ahead structurally impossible.

### Decisions

#### A — The Bundle Shape

- **A-1:** [confirmed] One deletion = one folder: `.trash/<mirrored-chain>/<stamp>__<base>.deleted/` containing the artifact under its **original basename** and `record.json`. The stamp stays ISO-with-`[:.]→-`; de-collision counters go on the bundle folder name (`<stamp>__<n>__<base>.deleted`), decided at `mkdir`.
- **A-2:** [confirmed] The record schema is the pair schema minus the `name` field and its stamped-leaf parser (`artifactBaseName`) — the artifact keeps its real name, so both dissolve. The zod discriminated union, `parentRef`, per-kind payloads, and `partial` marker carry over unchanged.
- **A-3:** [confirmed] Property deletes become ordinary artifact-less bundles — `.trash/<stamp>__property-<id>.deleted/` holding only `record.json`. The flat-file `writePropertyPair` path, its own de-collision loop, and the property exemption in the listing all dissolve; every deletion is now the same shape.
- **A-4:** [confirmed] System-trash mode is unchanged: no bundle, no gathers — the artifact leaves the nexus and there is nowhere valid for a record to point.
- **A-5:** [confirmed] A markdown-block tile file is **not an entity delete** — it has no record schema entity and no restore semantics. The flat, record-less trash primitive survives (renamed `trashFileFlat`) solely for `blocks.ts`; its tests are unchanged. Bundles are for entity deletes only.

#### B — Write-Ahead Ordering

- **B-1:** [confirmed] The bundle folder and `record.json` are written **before any destructive step**; the artifact moves in **last**. The artifact's presence inside the bundle is the settle marker: a non-property bundle without an artifact is an incomplete delete — never restorable, skipped by the listing, left on disk as evidence.
- **B-2:** [confirmed] Facts that only exist mid-delete (a sweep's captured membership) are patched into `record.json` after the sweep, before the artifact moves in. The pre-sweep record is written with `partial: true` and the patch clears it — so a crash between sweep and patch leaves a record that says it is thinner than the truth, never one affirmatively asserting an empty membership. With that, intermediate record states cannot lie: the bundle is incomplete until the artifact arrives, and the record is marked partial until the patch lands.
- **B-3:** [assumed] In nexus-trash mode, a failed record write **refuses the delete** — nothing has been destroyed yet, so refusal is finally possible and honest. The refusal rolls the mint back (removing the just-created, provably empty bundle folder) so a failed delete leaves no litter in `.trash`. This inverts the pair design's best-effort-and-shrug, which was forced on it by writing last. The user-visible change: a delete can now fail with "this couldn't be recorded" instead of silently degrading to hand-restore.
- **B-4:** [assumed] The Space arm reorders to match: sidecar id and registry entry are read **before** the unlink sweep, and a Space whose id can't be read refuses the delete. The pair design stripped the tag from every page first and only then discovered it couldn't record the act.

#### C — Restore & Listing

- **C-1:** [confirmed] `restoreArtifact` takes a bundle path; the artifact is the single non-`record.json` entry inside; it moves out to the resolver's placement and the bundle is removed. The resolver, the containment/occupancy guards, registry-append-before-move with rollback, passenger re-keying, and the reconcile loop are all unchanged.
- **C-2:** [confirmed] The orphan prune is **deleted**, not ported — a record inside the bundle cannot be separated from its artifact by a rename, hand-move, or sync race, so the failure the prune answered (and the data loss it caused, destroying non-derivable records over temporary artifact absence) no longer exists.
- **C-3:** [confirmed] Restore re-derives the artifact's actual id inside the op and refuses on disagreement with the record — the record's claim is no longer trusted over the artifact's content. Carved by kind: page → frontmatter id; collection/set/space → sidecar id; **context → the re-check does not apply**, because a Context has no artifact-side identity at all — its identity is solely the registry entry the record carries, which is why the record exists. Disagreement refuses; absence on both sides proceeds.
- **C-4:** [assumed] The id-live trap heals by re-mint: when restore finds the recorded id alive in the tree (a Finder copy made before the delete), it restores the artifact under a **fresh id** instead of refusing forever — mirroring the duplicate law (possession is originality; the live holder keeps the id). Order matters: the **record patches to the fresh id first, then the artifact rewrites** — a crash between the two leaves a disagreement that a retried restore re-heals, never a permanently refused bundle. Device rows copy old-id → new-id so the restored entity keeps its folds and view state; the re-mint helpers this reuses are currently module-private and get exported as part of the task (a sidecar re-mint also re-mints `views[].id`, a side effect the heal inherits deliberately). The refusal remains only for Contexts and Spaces, whose identity lives in the registry and cannot re-mint meaningfully without their memberships re-keying.

#### D — Migration

- **D-1:** [confirmed] Clean break, no dual-read, no converter. Nothing reads the trash format today — no surface exists and the only populated trashes are test nexuses — so old flat entries and their sibling `.provenance.json` files simply remain as plain, hand-restorable files the listing ignores. This window closes permanently when the trash browser ships.

#### E — Blast Radius

- **E-1:** [confirmed] [[NexusRecord]]'s Provenance sections go false and are rewritten as-built at ship; History carries the arc. `record.ts` and the baseline half are untouched; `remint.ts` changes only by exporting three private helpers (C-4); the `restore` op keeps its one-path shape with the field renamed `pairPath` → `bundlePath` (two references repo-wide, zero renderer-side).
- **E-2:** [confirmed] The provenance test suite re-points at the bundle layout; the assertion matrix (gather content, resolver decisions, restore round-trips, guard pins) carries over.

### Core (must-have)

- The bundle primitive (mint / settle) replacing `trashWithTimestamp` for nexus-trash deletes.
- Write-ahead reordering of all four delete arms, with B-3/B-4 refusal semantics.
- Bundle-based restore and listing; prune deleted; id re-check (C-3).
- Property deletes as artifact-less bundles.
- Docs and tests trued.

#### Prospects (allowed later, not now)

- The id-live re-mint heal (C-4) ships with this plan **if ratified**; if Nathan prefers, it detaches cleanly into its own later pass — the refusal stays as today.
- The re-mint pass consulting trash records when adjudicating duplicates — deferred; don't-foreclose: bundles are enumerable by one listing call.
- A property restore path (the property record is still write-only) — deferred until a surface needs it.
- Trash browser, empty-trash op, retention policy — the surfaces; sequenced after, they only read what this ships.

#### Out of Scope (won't do)

- Cloud sync itself — the bundle is sync-*ready* (one folder moves as one unit); sync is its own arc.
- Any change to the baseline / diff / re-mint half of the NexusRecord.

#### Considered & Rejected

- **Trash table in `nexus.db`** — the db is device-local, wiped on corruption or schema bump, and legitimately absent; bundle contents (registry entries, memberships, stripped values) are unrecoverable content the db's contract forbids it to solely own.
- **Single `Placement.json` in `.trash`** — total blast radius on one corrupt file, RMW locking on every delete, record no longer travels with its artifact.
- **Central `.nexus/record.json`** — watched folder, whole-nexus scale (rejected in the original design phase; still true).
- **Frontmatter provenance** (`TrashID:` in pages, bundles only for folders) — splits one mechanism into two, makes every page delete a content write with a strip pass on restore, leaks operational keys into live content on hand-restore, can't cover unparseable pages, and buys only Finder flatness.
- **Mirror-by-parent-id trash paths** — illegible to a browsing human or agent; still needs records for half the kinds, so two mechanisms.
- **Append-only journal** — record separates from artifact (the sync-conflict shape), needs compaction, less browsable.
- **Soft-delete tombstones** — exports a filter conditional into every present and future reader, keeps trashed files in the watched tree, and cannot express a Context or property delete at all.
- **Record inside the trashed folder itself** (no envelope for folders) — leaks `record.json` into the live tree on hand-restore and reintroduces sibling separation for single files.

#### Lessons

- A record named after the outcome of the act it records cannot be written ahead of that act — identity must be minted, never derived from the destination. → routes to Guidelines at closeout.
