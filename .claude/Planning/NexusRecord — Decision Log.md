## NexusRecord — Decision Log

### Frame

- **Purpose:** One mechanism that remembers where entities were, so Pommora can compare what it sees now against what it saw before, and can put a trashed entity back into the folder it belonged to — even when that folder has since been renamed or moved.
- **Core Value:** Pommora can always answer *where is this now*. It can never answer *where was this then*. This is the smallest mechanism that closes that gap.
- **Success Criteria:**
  - A page trashed, then whose parent folder is renamed, restores into the renamed folder.
  - An open detects and reports structural change made outside the app since the last open.
  - Adding a new tracked fact later (a property value, a frontmatter key, an id seeding) is additive — no entry-shape change, no consumer rewrite.
  - The acting code that performs a restore holds no domain policy of its own.

### Sources

- `.claude/Planning/Identity + Enforcement — Decision Log.md` — D-15 (duplicate content ids, policy open, reachability answered) and D-17 (the record is a shared mechanism serving structural revert AND trash restore, split to its own plan). Both are this document's direct parents.
- Commit `be671378` — *"parent_id leaves — folder nesting was always the parentage."* Closing line: *"No id-valued cross-entity foreign key now exists on disk."* Constrains D-4 below.
- `src/main/crud/contextJournal.ts` · `src/main/crud/contextCascade.ts` — the only existing completion journal. One record max at `.nexus/context-rename.json`; its correctness lives in eleven discard branches, replayed at open from `src/main/index.ts`.
- `src/main/crud/removeProperty.ts` — the `property_cache` block on collection sidecars. Keyed by page id, timestamped, written before the destructive act, spent per value on restore. The closest existing thing to a correct record.
- `src/main/crud/deleteProperty.ts` — the `.trash/<stamp>__property-<id>.json` snapshot. Keyed by absolute file path, written with a raw non-atomic write, read by nothing.
- `src/main/io/atomicWrite.ts` — `trashWithTimestamp`; the mirrored `.trash` chain with the stamp on the leaf only. The layout is the current restore record.
- `src/main/io/writeEcho.ts` — the precedent for "the app's own writes must not read as external change."
- `src/main/crud/page.ts` — `relocatePage`, the single private funnel for every page rename and move.
- `src/main/crud/folderEntity.ts` — `renameFolderEntity` / `moveFolderEntity`, structurally identical with no shared helper.
- `src/main/mutate.ts` — `dispatch` (23 ops, exhaustive, `never`-guarded) and `removeViaMode`.
- `src/main/index.ts` — `prepareOpenedNexus`, the single high-level open path.
- `src/main/crud/reorder.ts` · `src/main/order.ts` — the order arrays; stale ids are read-tolerated and never purged.
- `src/shared/types.ts` — `NodeKind`, the discriminant written on every walked node.
- `src/renderer/src/treeIndex.ts` — its own stated law: *"A new lookup belongs here as another projection, never as its own walk."*
- `src/renderer/src/Sidebar/sidebarDndModel.ts` — `Entry`, which already derives `parentId` in memory.
- `.claude/Features/Architecture.md` — the `.nexus/` content versus `nexus.db` per-machine line; the trash-restore pending note.

### Decisions

#### A — Purpose & Scope

- **A-1:** [confirmed] D-15 (duplicate content ids) folds into this work rather than standing alone. The record is what distinguishes the file that legitimately holds an id from a copy, turning a coin flip into a fact.
- **A-2:** [assumed] The record tracks **structural facts only** — identity, location, parentage, existence. Never what a page contains. This boundary is what stops it becoming a versioning system.
- **A-3:** [assumed] Compare **detects and reports**; it does not auto-revert. Acting on detected drift is a separate decision and probably a later surface.
- **A-4:** [assumed] Un-adopted entities are out of scope by construction. A path-derived `adoptedId` *is* a different id after a move, so it is unrevertable in principle.

#### B — Shape & Storage

- **B-1:** [assumed] One module, one file: `.nexus/record.json`. Content, not `nexus.db` — trash provenance must survive a schema-version bump, which drops the database wholesale.
- **B-2:** [assumed] Two record types in that file, not one shape:
  - **Baseline** — one entry per entity, structural fields only. Replaced per open, patched per structural mutation. Bounded at one entry per entity; never needs a compaction policy.
  - **Events** — a discriminated union with an **open payload per kind**. Trash carries a parent; a property removal would carry prior values; an id seeding would carry the minted id. Bounded by unresolved events.
- **B-3:** [assumed] `kind` derives from `NodeKind`, widened locally to `NodeKind | 'homepage'`. Not `NavRef['kind']` (admits `task`/`event`, which have no node and no path), not `FolderKind` (includes `'unknown'`, never an entity), not `SidecarKind` (omits `page`).
- **B-4:** [assumed] The reader **preserves event kinds it does not recognize** rather than dropping them, matching the foreign-key preservation every other Pommora document already practises.

#### C — Write Cadence

- **C-1:** [confirmed — Nathan's correction] Once-per-open is **not** the only legitimate trigger. The hard rule forbids expensive work piled onto a high-frequency trigger; it does not forbid event-driven writes. A write is appropriate when the event is *contained*, *human-paced*, and the record write is **THE** companion to that event rather than another listener stacked on it.
- **C-2:** [confirmed — implied by C-1] A structural mutation made in-app updates the baseline. Without this, the app's own work reads as external drift on the next open — a false positive on every gesture. This is `writeEcho`'s principle applied to structure.
- **C-3:** [assumed] Writes on: trash, restore, move, rename, re-home, adoption stamp. Full baseline write once per open, **after** adoption — a snapshot taken before it records a world adoption is about to change.
- **C-4:** [assumed] Never writes on: keystrokes, property value edits, **reorders**, watcher events, walks. Reorder is named explicitly because drag-reorder fires repeatedly and changes order, not location.

#### D — Parentage

- **D-1:** [confirmed] Nesting is the parentage for anything in the tree. The baseline stores `path` and **no parent field** — `be671378` stands untouched.
- **D-2:** [assumed] Only a **detached** entry needs a parent identity, because trashing is precisely what destroys nesting. This is the one case `be671378`'s premise does not reach.
- **D-3:** [assumed] The parent id is read from the parent folder's **existing sidecar** at the moment of detach — `dirname(path)` → read that sidecar → its id. One file read, no persisted map, no staleness possible.
- **D-4:** [open — BLOCKING, needs Nathan] D-2 puts an id-valued cross-entity pointer back on disk, narrowly, for detached entities only. `be671378` removed exactly that class of field. The argument for the exception: it is *read* (by restore), where `parent_id` was read by nothing, and it covers the case where nesting cannot answer. **Without it, restore-into-a-renamed-directory is unimplementable** — the only alternative is matching the old path, which a rename invalidates. Needs an explicit yes.

#### E — Absorption

- **E-1:** [assumed] **Absorb the Remove cache and the Delete snapshot.** They are the same record written twice and have already drifted once — `assignment.ts` says so in its own comment. They disagree on key space (page id versus absolute path), atomicity (strict read-modify-write versus a raw non-atomic write), and trash layout (mirrored chain with collision handling versus flat and silently overwriting). Winner on key space: **id**, the same answer D-15 turns on.
- **E-2:** [open — needs Nathan] **Do not absorb the rename journal**, against the stated "must absorb each" constraint. Its correctness is not the record — the record is four strings — it is eleven discard branches, one of which must never be generalized: *"The freed old title was re-minted by another Space — discard, never hijack."* A uniform replay-on-open policy would replay that and rewrite a live Space's values to a name a different Space now owns. It is a transaction log with a replay driver, not a value snapshot; twenty of its twenty-two call sites are internal to one file, so keeping it separate is cheap and generalizing it is expensive.
- **E-3:** [assumed] **Leave the order arrays alone.** Absorbing them means inventing a purge that does not exist today — a behavior change, since an id that leaves and returns currently resurrects into its old slot.
- **E-4:** [assumed] Unify the `.trash` artifact spelling so every timestamped restore artifact mirrors the chain and de-collides.

#### F — Restore Resolution

- **F-1:** [assumed] The record **decides** and returns the decision as data. A single resolver takes the entry plus the current tree and returns exactly one outcome: a placement directory, or a refusal with a reason (parent gone · parent cannot hold this kind · name taken · id already live).
- **F-2:** [assumed] The acting code executes and branches on nothing. No path resolution, no collision policy, no domain rules — a mover, not a decider. This is what keeps the acting code minimal.
- **F-3:** [assumed] If a fix ever needs ordering (restore a parent before its child), the resolver returns an ordered plan rather than a single placement. Still one decision-maker, still a dumb executor.
- **F-4:** [assumed] A name collision at the target **disambiguates** the way creates already do, rather than refusing.

#### G — Extensibility

- **G-1:** [assumed] The baseline diff is **field-generic** — *"for each id, for each key present, did it change"*, never a hand-written per-field comparison. This is the single commitment that makes later additions free; without it, every new tracked fact forces a rework of the differ.
- **G-2:** [assumed] The tracked-field set lives in **exactly one projection function**. The differ never names a field. Two lists of one fact is the `.MD` failure in a new costume.
- **G-3:** [assumed] Structural facts are bounded (one entry per entity); property values are not (pages × properties). Continuous value snapshotting does not scale and is out. **Event-scoped** value capture is bounded and is how property changes enter later — the shape the Remove cache already proves.

#### H — Integration

- **H-1:** [assumed] Hook sites, all inside functions that already exist and already write to disk: `prepareOpenedNexus` (baseline) · `relocatePage` (every page rename and move, id already free) · `removeViaMode` and `trashTileFile` (both trash routes) · `stampPage` / `stampFolder` / `reHomeRegistered` (adoption).
- **H-2:** [assumed] One extraction: `relocateFolder`, mirroring the existing `relocatePage`, so folder rename and move share a hook instead of needing two.
- **H-3:** [confirmed by census] Restore is **entirely new surface** — no restore, untrash, or put-back code exists anywhere in the codebase.
- **H-4:** [open] `nexus:rename` renames the nexus root outside every funnel — no write echo, no crud primitive, no mutate op. It needs its own hook, and when the root moves every path in the baseline goes stale at once.

#### I — Open Gaps (raised by this log, never discussed)

Each of these is unresolved and none is blocked on the others.

- **I-1:** [open] **Absorbing the Remove cache is a format change.** Existing nexuses carry `property_cache` blocks on collection sidecars. Moving that into the record either strands them or needs migration — and the identity arc's ruling was zero transition machinery. Decide: migrate, strand, or leave the Remove cache where it is.
- **I-2:** [open] **Corrupt or unreadable record.** The codebase's rule is *"a write may act on a fact, never on ignorance."* An unreadable record must not be silently re-seeded over, because it holds trash provenance. Policy undecided.
- **I-3:** [open] **First run.** An existing nexus has no record. The first open has no baseline, so compare has nothing to say. Presumably it seeds silently and reports nothing — unconfirmed.
- **I-4:** [open] **Trash emptied outside the app.** Detached entries then point at files that no longer exist. Nothing purges them. Also: Pommora has no trash-emptying feature at all.
- **I-5:** [open] **Contexts and Spaces coverage.** Content and containers only, or Contexts/Spaces too? This decides whether the record supersedes the rename journal or sits beside it, so it interacts with E-2.
- **I-6:** [open] **What compare surfaces, and where.** "Detect and report" names no surface — a notification, a panel, a silent log read on demand.
- **I-7:** [open] **Excluded folders.** The walk skips them, so their entities never enter the baseline and are invisible to compare. Probably correct; unstated.
- **I-8:** [open] **Multi-window.** The locked decision is single-window now with multi-window-ready seams. Two sessions on one nexus both writing a baseline is undefined.
- **I-9:** [open] **Sync conflict.** The baseline self-heals under most-recent-wins because it is rewritten every open. **Detached entries do not** — losing one loses trash provenance, degrading restore to path-matching.
- **I-10:** [open] **Reading it from the renderer.** A restore surface needs IPC channels. No bridge entries are scoped.
- **I-11:** [open] **Testing crash recovery.** The rename journal has tests for its replay branches; the shape for testing this one is unscoped.
- **I-12:** [open] **Size at scale.** Asserted bounded, never estimated. A concrete figure at a few thousand entities should exist before the write cadence is final.

### Core (must-have)

- The record document, its module, and the four operations: snapshot, detach, settle, resolve.
- Parent captured at detach from the parent's existing sidecar.
- Restore resolution by parent id against the current tree, returning a placement or a typed refusal.
- Baseline maintained on open and on in-app structural mutation, so the app's own work never reads as drift.
- Field-generic diff and a single projection function owning the tracked-field set.

#### Prospects (allowed later, not now)

- **Crash-safe cascades.** `renameCascade`, `renameSweep` and `optionOps` do write → act → settle with **no record at all**; a page rename's only safety net is an in-memory reverse a crash defeats. `cascade.ts` says a partial cascade is *"recoverable by re-running"* — and nothing re-runs it. This is arguably the record's highest-value use. Don't-foreclose: the event-entry plus settle shape covers it almost free.
- **A trash browse-and-restore surface.** The record makes it possible; it is not the record.
- **Property and frontmatter change capture**, as event entries per G-3.
- **Git as opt-in content history.** Complementary, never the record — git tracks paths and detects renames heuristically, where this tracks identities. Both nexuses are already git repos and one is the home directory, so Pommora must not auto-commit.
- **Automatic structural revert**, once detect-and-report has proven itself.

#### Out of Scope (won't do)

- Content versioning or an editing undo stack.
- Any coverage of un-adopted entities.
- Sync or conflict resolution.
- Order-array purging.

#### Considered & Rejected

- **Append-only ledger** (every change an event, state as a fold). More powerful, but demands a compaction policy up front and grows unboundedly — the exact "someone must come back and fix this" shape to avoid.
- **Distributed record** (each container sidecar records its own members). No central hot file and it travels with a folder move, but a trashed entity has no home sidecar to live in, so it fails the headline requirement worst.
- **Split storage** (baseline in `nexus.db`, rest in `.nexus/`). Principled about the per-machine line, but two homes forever; the single file self-heals under most-recent-wins, which is worth more here.
- **Git as the mechanism.** Rejected on structure, not taste: git tracks paths and guesses renames by content similarity, so it answers the address question already answered by the `.trash` chain and contributes nothing to the identity question that is actually missing.
- **Once-per-open as the only trigger.** Rejected by Nathan; it produces a real bug — a page moved in-app then trashed restores to where it was at last open.

#### Lessons

- A record that is *replaced* rather than *appended* never needs a compaction policy. Bounded-by-construction is worth more than powerful.
- "Never on every X" forbids expensive work on a hot trigger, not event-driven writes. The test is whether the write is THE companion to that event or another listener stacked on it.
- A shared mechanism's value is its *discipline*, not its data. The rename journal's record is four strings; its correctness is eleven discard branches, and generalizing it would lose the one that must never fire.
