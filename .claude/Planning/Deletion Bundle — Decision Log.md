## Deletion Bundle — Decision Log

**Status:** ratified — in execution.

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

- **A-1:** [confirmed] One deletion = one folder: `.trash/<mirrored-chain>/<stamp>__<base>.deleted/` containing the artifact under its **original basename** and `_record.json`. The record wears the sidecar convention's underscore because it shares that folder with the artifact: `invalidName` forbids a leading `_` for every entity, so no name a user can choose collides with it, and the atomic writer's temp sibling is skipped by the same rule that skips Finder litter. The stamp stays ISO-with-`[:.]→-`; de-collision counters go on the bundle folder name (`<stamp>__<n>__<base>.deleted`), decided at `mkdir`.
- **A-2:** [confirmed] The record schema is the pair schema minus the `name` field and its stamped-leaf parser (`artifactBaseName`) — the artifact keeps its real name, so both dissolve. The zod discriminated union, `parentRef`, per-kind payloads, and `partial` marker carry over unchanged.
- **A-3:** [confirmed] Property deletes become ordinary artifact-less bundles — `.trash/<stamp>__property-<id>.deleted/` holding only the record. The flat-file `writePropertyPair` path, its own de-collision loop, and the property exemption in the listing all dissolve; every deletion is now the same shape.
- **A-4:** [confirmed] System-trash mode is unchanged: no bundle, no gathers — the artifact leaves the nexus and there is nowhere valid for a record to point.
- **A-5:** [confirmed] A markdown-block tile file is **not an entity delete** — it has no record schema entity and no restore semantics. The flat, record-less trash primitive survives (renamed `trashFileFlat`) solely for `blocks.ts`; its tests are unchanged. Bundles are for entity deletes only.

#### B — Write-Ahead Ordering

- **B-1:** [confirmed] The bundle folder and `record.json` are written **before any destructive step**; the artifact moves in **last**. The artifact's presence inside the bundle is the settle marker: a non-property bundle without an artifact is an incomplete delete — never restorable, skipped by the listing, left on disk as evidence. For the sweep arms that evidence carries real weight: a crash between the sweep and the settle leaves the destruction done, the folder still live in the tree, and the swept membership preserved only inside the skipped bundle's record — hand-readable, not in-app spendable. Accepted cost, named here deliberately: the same crash under the pair design left the same destruction with no record anywhere.
- **B-2:** [confirmed] Facts that only exist mid-delete (a sweep's captured membership) are patched into `record.json` after the sweep, before the artifact moves in. The pre-sweep record is written with `partial: true`, and the patch **recomputes** `partial` from the sweep's real outcome rather than clearing it — the existing gatherers stay the single computer of the marker, so a sweep that skipped or refused roots keeps the record partial. A crash between sweep and patch leaves a record that admits it is thinner than the truth, never one affirmatively asserting a complete membership.
- **B-3:** [confirmed — Nathan's ruling] No guard, no rollback. The record writes first, so a failed write faults the op before anything was destroyed — the ordering is the whole protection. A disk that can't write a record can't run Pommora.
- **B-4:** [confirmed — Nathan's ruling] The Space arm reads its sidecar and registry before the unlink sweep — pure reordering, no refusal. Spaces are Pommora-born under `.nexus/contexts/`; no other app creates them, so id-less or unreadable sidecars aren't designed for.

#### C — Restore & Listing

- **C-1:** [confirmed] `restoreArtifact` takes a bundle path; the artifact is the single entry inside that the walk does not hide; it moves out to the resolver's placement and the bundle is removed. The resolver, the containment/occupancy guards, registry-append-before-move with rollback, passenger re-keying, and the reconcile loop are all unchanged.
- **C-1b:** [confirmed] A bundle is a `.deleted` folder that HOLDS a record. The name alone cannot decide it: `.trash` mirrors the nexus, so a Collection a user named `Archive.deleted` puts that name on a chain folder, and a name-only rule would read the scaffold as a bundle and hide every deletion beneath it. The walk stops at a folder with a record and walks through everything else.
- **C-2:** [confirmed] The orphan prune is **deleted**, not ported — a record inside the bundle cannot be separated from its artifact by a rename, hand-move, or sync race, so the failure the prune answered (and the data loss it caused, destroying non-derivable records over temporary artifact absence) no longer exists.
- **C-3:** [confirmed] Restore trusts the record's ids without re-deriving them from the artifact. Reaching a disagreement requires hand-editing an id inside a file sitting in `.trash` — and even then, the resulting state (two live holders of one id) is exactly what the baseline's re-mint pass adjudicates at the next open. The record half never duplicates a net the baseline half already provides.

#### D — Migration

- **D-1:** [confirmed] Clean break, no dual-read, no converter. Nothing reads the trash format today — no surface exists and the only populated trashes are test nexuses — so old flat entries and their sibling `.provenance.json` files simply remain as plain, hand-restorable files the listing ignores. This window closes permanently when the trash browser ships.

#### E — Blast Radius

- **E-1:** [confirmed] [[NexusRecord]]'s Provenance sections go false and are rewritten as-built at ship; History carries the arc. `record.ts`, `remint.ts`, and the baseline half are untouched; the `restore` op keeps its one-path shape with the field renamed `pairPath` → `bundlePath` (two references repo-wide, zero renderer-side).
- **E-2:** [confirmed] The provenance test suite re-points at the bundle layout; the assertion matrix (gather content, resolver decisions, restore round-trips, guard pins) carries over.

### Core (must-have)

- The bundle primitive (mint / settle) replacing `trashWithTimestamp` for nexus-trash deletes.
- Write-ahead reordering of all four delete arms — pure ordering, no guards (B-3, B-4).
- Bundle-based restore and listing; prune deleted.
- Property deletes as artifact-less bundles.
- Docs and tests trued.

#### Prospects (allowed later, not now)

- **The id-live heal:** restore finding its recorded id alive (a Finder copy made and the original deleted within one session) refuses today, permanently. The heal — restore under a fresh id, mirroring the duplicate law — is deferred until a trash surface makes the trap reachable at all; don't-foreclose: the refusal is a typed `Refusal` the heal would branch on, and the re-mint helpers it needs exist (module-private) in `remint.ts`.
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
- **A restore-time id re-check against the artifact** — reachable only by hand-editing ids inside `.trash` with full knowledge of the format, and the state it prevents (two live holders of one id) already lands in the re-mint pass's jurisdiction at the next open. A guard for a self-sabotage path the system already self-heals is complexity with no payer.

#### Lessons

- A record named after the outcome of the act it records cannot be written ahead of that act — identity must be minted, never derived from the destination. → routes to Guidelines at closeout.
