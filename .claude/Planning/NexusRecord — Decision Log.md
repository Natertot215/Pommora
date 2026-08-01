## NexusRecord — Decision Log

> **Status:** V2 — reviewed, revised, pending Nathan's ratification. Three review lenses ran against V1 (durability at three months, alternative framings, adversarial attack); V1's central-record design did not survive and was replaced rather than patched.

### Frame

- **Purpose:** Let Pommora put a trashed entity back into the folder it belonged to — even when that folder has since been renamed or moved — and let it notice structural change made while it was closed.
- **Core Value:** Pommora can always answer *where is this now*. It cannot answer *where was this then*. Two separate mechanisms close that, each the smallest thing that does its half.
- **Success Criteria:**
  - A page is trashed; its parent folder is renamed; the page restores into the renamed folder.
  - A folder is trashed with pages inside it; restoring the folder restores its contents intact.
  - Opening a nexus reports structural change made since the last open.
  - Adding a tracked fact later is additive — no entry-shape change, no differ rewrite.
  - The code that performs a restore holds no domain policy of its own.

### The Two Halves

They share a module and nothing else. Conflating them is what broke V1.

- **Provenance** — where a departed entity belonged. Written **onto the artifact being trashed**, travels with it, dies with it.
- **Baseline** — what the walk last saw. A derived per-machine projection in `nexus.db`, written once per session, read once per session.

### Sources

- `.claude/Planning/Identity + Enforcement — Decision Log.md` — D-15 (duplicate content ids) and D-17 (the record serves structural revert and trash restore). D-15's relationship to this work is **reversed** in V2; see A-5.
- Commit `be671378` — *"parent_id leaves — folder nesting was always the parentage."* Constrains B-3.
- `src/main/io/atomicWrite.ts` — `trashWithTimestamp`; mirrors the folder chain, stamps the leaf, moves the whole subtree in one rename.
- `src/main/mutate.ts` — `removeViaMode` and its two trash modes; the nexus-trash arm and the system-trash arm behave differently and V1 addressed only one.
- `src/main/watcher.ts` — the ignore predicate. `.nexus/` **is watched**; `nexus.db` is ignored because it thrashes on operational writes.
- `src/main/index.ts` — `prepareOpenedNexus`. It holds no tree; `readNexus` is called from the watcher push, the state IPC arm, and `crud/assignment.ts`.
- `src/renderer/src/store.ts` — `mutate` applies an optimistic patch then calls `load()`, which *"confirms canon."* Every in-app structural mutation already causes a confirming walk.
- `src/main/crud/page.ts` · `src/main/io/pageFile.ts` — `relocatePage`; `mergeFrontmatter` governs only the keys it is given, so a provenance key can be written without bumping `modified_at`.
- `src/shared/schemas.ts` · `src/main/sidecarIO.ts` — every sidecar reads through a loose schema, so a foreign key rides along by construction.
- `src/main/crud/removeProperty.ts` — the `property_cache` block. Co-located with its Collection and portable with it.
- `src/main/crud/deleteProperty.ts` — the path-keyed snapshot; raw non-atomic write, flat in `.trash`, read by nothing.
- `src/main/crud/contextJournal.ts` · `contextCascade.ts` — the rename journal and its discard branches.
- `src/shared/types.ts` — `NodeKind`, the discriminant on every walked node.

### Decisions

#### A — Scope

- **A-1:** [assumed] The record tracks **structural facts** — identity, location, parentage, existence. No *continuous* content snapshotting. Values may enter as event payloads bounded by an event; they never become baseline fields.
- **A-2:** [assumed] Compare **reports** external drift; it never auto-reverts. Separately, the app's own *interrupted* work may complete unattended — that is what the rename journal already does at open, and forbidding it would forbid the record's best future use.
- **A-3:** [assumed] Un-adopted entities are out of scope, and the projection must **actively filter** `adopted-`-prefixed ids. The walk assigns them to every excluded or sidecar-less entity, so without a filter they enter the baseline and report as delete-plus-create forever.
- **A-4:** [assumed] Out of scope entirely, stated rather than discovered: **block tiles** (no id key, `.nexus`-resident, invisible to the walk, and restoring one is a database row insert, not a placement) and **Tasks/Events** (the walk emits no agenda nodes and no delete arm reaches them; this widens for free when Agenda joins the walk).
- **A-5:** [assumed — reverses V1] **D-15 does not fold in.** An id-keyed baseline cannot represent two files holding one id; verified by execution, the entry silently retargets to whichever the walk hit last, so compare reports a move that never happened. The record covers only the narrow case where a restore would collide with a live id. General duplicate-id policy stays D-15's own question.

#### B — Provenance (the restore half)

- **B-1:** [assumed] At detach, the parent is written **onto the artifact being trashed** — a frontmatter key for a page, a sidecar key for a container — not into a central document. It travels with the file, cannot be orphaned, needs no central entry, and survives a trash emptied outside the app, a sync conflict, and multi-window. This is the shape Notion uses and the shape the Windows Recycle Bin uses.
- **B-2:** [assumed] Only the **top of a trashed subtree** carries a key. `trashWithTimestamp` moves the whole subtree in one rename, so a page inside a trashed Set keeps its nesting and needs nothing. Restoring the top restores everything under it.
- **B-3:** [assumed] This does not reverse `be671378`. That removed a cross-entity pointer from **live** entities in the tree, where nesting already answered. A key on a dead copy inside `.trash`, stripped on restore, is never a live pointer — and it exists precisely where nesting has been destroyed.
- **B-4:** [assumed] The parent is a **discriminated union**, not a bare id: a root-level container, a container by id, a Context by registry id, or unaddressable. Verified: root-level Collections, Spaces and Contexts have no parent sidecar, and a Set created in Finder before adoption — or one whose sidecar is unreadable — has no id at all. A bare id cannot express any of those; `unaddressable` becomes a typed refusal the resolver already has a slot for.
- **B-5:** [assumed] A restored file that still carries a provenance key is stripped by the adoption pass that already runs at open — a file carrying trash provenance while sitting in the tree is one someone restored by hand.
- **B-6:** [assumed] Under **system trash mode** the key is still written before the file leaves, so a hand-dragged restore still resolves. But Pommora cannot enumerate the OS trash, so the restore *surface* covers nexus-trash mode only, and says so. The delete confirmation already distinguishes the two modes.

#### C — Baseline (the compare half)

- **C-1:** [assumed] The baseline lives in `nexus.db` as a `local_state` row. It is derived, per-machine, and rebuildable-by-definition. `.nexus/` is watched, so a document rewritten per gesture there buys re-walks; the database is ignored *because* it thrashes. No new schema — `local_state` is already generic.
- **C-2:** [assumed] Written **once per session**, latched, at the first walk that produces a tree — because `prepareOpenedNexus` has no tree and a second walk on the open path is forbidden. The prior baseline is read before it is overwritten; that read is the compare input.
- **C-3:** [assumed] **No mutation hooks at all.** Every in-app structural change already triggers a confirming walk, so the next session's baseline captures it. This deletes V1's entire hook set, the `relocateFolder` extraction, and the create/Space-rename/sidecar-migration gaps that hook set had.
- **C-4:** [assumed] The watcher already attributes live-session drift in memory and pushes a fresh tree. The baseline covers **only the window when the app was closed** — a strictly smaller problem than "compare against last open."
- **C-5:** [assumed] The diff runs over the **union** of keys with absence as a first-class value, and tracked fields must be **scalars**. Pommora encodes deletion as key absence project-wide; a present-key diff loses every clear in one direction and every add in the other, verified both ways. Non-scalar facts enter as event payloads, never as baseline fields.
- **C-6:** [assumed] `kind` derives from `NodeKind`, unwidened. It gains Tasks and Events for free when the walk does. No `'homepage'` member — the homepage has no id and no path and cannot be trashed.

#### D — What Is Not Absorbed

- **D-1:** [assumed] **Absorb the property Delete snapshot only** — it is path-keyed, non-atomic, flat in `.trash`, and read by nothing. Rewrite it to match the Remove cache's discipline in place.
- **D-2:** [assumed — reverses V1] **Leave the Remove cache alone.** Its correctness is its reconciliation branches, not its storage — the same argument that keeps the rename journal separate. It is co-located with its Collection, so it survives a folder rename, move, trash-restore, and copy into another nexus; centralizing it destroys that. And it covers id-less pages, which an id-keyed store cannot.
- **D-3:** [assumed] **Leave the rename journal separate.** Its correctness is eleven discard branches, one of which must never generalize: *"The freed old title was re-minted by another Space — discard, never hijack."* A uniform replay-on-open policy would fire it and corrupt a live Space.
- **D-4:** [assumed] **Leave the order arrays alone.** Absorbing them means inventing a purge that does not exist.
- **D-5:** [confirmed by evidence] No migration is needed: **zero `property_cache` blocks exist on either live nexus.** V1's I-1 collision with the zero-transition-machinery ruling does not arise.

#### E — Resolution

- **E-1:** [assumed] The record **decides** and returns the decision as data. One resolver takes the provenance plus the current tree and returns a placement or a typed refusal: parent gone · parent cannot hold this kind · parent unaddressable · trashed outside the nexus · id already live.
- **E-2:** [assumed] The acting code branches on nothing — a mover, not a decider.
- **E-3:** [assumed] A name collision at the target **disambiguates**, as creates already do. It is not a refusal reason.
- **E-4:** [assumed] Restoring a child out of a still-trashed parent refuses rather than guessing at a destination.
- **E-5:** [assumed] If a fix ever needs ordering, the resolver returns an ordered plan. Still one decider.

### Core (must-have)

- The provenance key: its shape, the discriminated parent, write at detach, strip at restore, strip on adoption.
- The resolver, returning a placement or a typed refusal.
- **A minimal restore path** — even a single menu action. Without one, provenance is written and never spent.
- The baseline projection, its latched once-per-session write, and the union-diff.
- **A compare operation and somewhere its result lands.** V1's Core built the record and never read it.

#### Prospects

- **Crash-safe cascades.** `renameCascade`, `renameSweep` and `optionOps` do write → act → settle with no record; a page rename's only safety net is an in-memory reverse a crash defeats, and its own comment says a partial cascade is *"recoverable by re-running"* while nothing re-runs it. Arguably the highest-value use of this shape.
- A full trash browse-and-restore surface.
- Property and frontmatter change capture, as event payloads.
- Git as opt-in content history — complementary, never the record. Both nexuses are already git repos and one is the home directory, so Pommora must never auto-commit.

#### Out of Scope

- Content versioning or an editing undo stack · un-adopted entities · sync and conflict resolution · order-array purging · block tiles · agenda kinds, until the walk emits them.

#### Considered & Rejected

- **A central `.nexus/record.json` holding detached entries** (V1's design). Rejected on three verified grounds: `.nexus/` is watched, so a per-gesture rewrite buys re-walks; at five thousand entities the file is near a megabyte and each patch is a full re-serialize, an order of magnitude more IO than the rename it accompanies; and its entries can never be spent while no restore surface exists, reproducing the unbounded-growth shape the append-only ledger was rejected for.
- **Per-mutation baseline hooks.** Unnecessary — the confirming walk already runs.
- **Append-only ledger** · **record distributed across live container sidecars** (a trashed entity has no home sidecar — inverted in B-1, where the departed entity remembers the folder) · **git as the mechanism** · **once-per-open as the only trigger**.

#### Lessons

- When a mechanism must remember something about a thing, putting the memory *on the thing* dissolves orphaning, sync conflict, and multi-window at once. Ask it before designing a central store.
- "Bounded in count" is not "bounded in cost." Size it before choosing where it lives.
- A record whose entries are only spent by a surface you have not built is an append-only log wearing a bounded one's clothes.
- Three review lenses — durability, alternatives, attack — found different classes of defect and barely overlapped. Two independently reached the same replacement design, which is the strongest signal available that it is right.

### Open — needs Nathan

- **O-1:** Ratify B-1/B-3 — writing a parent key onto a trashed artifact. This is the successor to V1's blocking question, and materially smaller: it is a key on a dead copy in `.trash`, not a pointer on a live entity.
- **O-2:** Confirm A-5 — that D-15 does **not** fold in after all, against the earlier expectation that it would.
- **O-3:** Confirm D-2 — leaving the Remove cache alone, reversing V1's absorb-both.
- **O-4:** Where a compare result should surface. Core needs somewhere for it to land, and nothing is designed.
