## NexusRecord — Decision Log

> **Status:** V5 — folds Nathan's clarified ruling (an id MAY be stored on the deleted item; the prohibition is on name-based locations) and his consolidation lens: this feature absorbs its adjacent residue now, so no future pass finds things it should have taken. Pending the third attack round's findings, then the plan.

### Frame

- **Purpose:** Let Pommora put a trashed entity back into the folder it belonged to — even when that folder has since been renamed or moved — and let it notice structural change made while it was closed.
- **Core Value:** Pommora can always answer *where is this now*. It cannot answer *where was this then*. Two separate mechanisms close that, each the smallest thing that does its half.
- **Success Criteria:**
  - A page is trashed; its parent folder is renamed; the page restores into the renamed folder.
  - A folder is trashed with pages inside it; restoring the folder restores its contents intact.
  - A Space tagged on many pages is deleted and restored; the pages that still exist carry its tag again.
  - A Finder-duplicated page stops rendering its twin's property values: the copy is identified against the prior baseline and re-minted.
  - Adding a tracked fact later is additive — no entry-shape change, no differ rewrite.
  - The code that performs a restore holds no domain policy of its own.

### The Two Halves

They share a module and nothing else.

- **Provenance** — where a departed entity belonged and what it carried. A **paired JSON written beside the artifact in `.trash`**, named from the artifact's final stamped leaf. It is created by the delete, read by restore, deleted with its artifact, and never enters the live tree.
- **Baseline** — what the walk last saw. A derived per-machine projection in `nexus.db`, written once per session, read once per session.

### Sources

- `.claude/Planning/Identity + Enforcement — Decision Log.md` — D-15 (duplicate content ids) and D-17 (the record serves structural revert and trash restore). D-15 folds in via the baseline; see A-5.
- Commit `be671378` — *"parent_id leaves — folder nesting was always the parentage."* Constrains B-3.
- `src/main/io/atomicWrite.ts` — `trashWithTimestamp`; mirrors the folder chain, stamps the leaf, de-collides with a counter, moves the whole subtree in one rename, and **returns the final destination** — the pair name derives from it.
- `src/main/mutate.ts` — the `delete` arm and `removeViaMode`'s two trash modes; the unlink sweeps run before the move and return `{ touched, skipped }`, discarded at the call site.
- `src/main/crud/contextCascade.ts` — `sweepContextRoots` hands its callback each file's parsed frontmatter, so the page's id and its Space values are in hand at the moment of removal; `unlinkContextKey` / `unlinkSpaceValue` wrap it.
- `src/main/watcher.ts` — the ignore predicate. `.nexus/` **is watched**; `.trash` and `nexus.db` are ignored — a pair write in `.trash` costs no watcher event.
- `src/main/index.ts` — `prepareOpenedNexus` holds no tree; the walk is called from the watcher push, the state IPC arm, and `crud/assignment.ts`.
- `src/renderer/src/store.ts` — `mutate` applies an optimistic patch then calls `load()`, which confirms canon; every in-app structural mutation already causes a walk.
- `src/main/crud/removeProperty.ts` — the `property_cache` block: id-keyed, reconciled per value on restore, co-located with its Collection. The reconciliation model restore copies.
- `src/main/crud/deleteProperty.ts` — the path-keyed snapshot; raw non-atomic write, flat in `.trash`, read by nothing.
- `src/main/crud/contextJournal.ts` · `contextCascade.ts` — the rename journal and its discard branches.
- `src/main/crud/folderEntity.ts` — folder name = title; the filesystem itself forbids two same-titled Spaces in one Context, creates disambiguate, renames refuse.
- `src/shared/types.ts` — `NodeKind`, the discriminant on every walked node.

### Decisions

#### A — Scope

- **A-1:** [assumed] The record tracks **structural facts** — identity, location, parentage, existence. No *continuous* content snapshotting. Values may enter as event payloads bounded by an event; they never become baseline fields.
- **A-2:** [assumed] Compare **reports** external drift; it never auto-reverts. Separately, the app's own *interrupted* work may complete unattended — the rename journal already does, and forbidding it would forbid the record's best future use.
- **A-3:** [assumed] Un-adopted entities are out of scope. The baseline projection **actively filters** `adopted-`-prefixed ids, and a parent whose id is one records as `unaddressable` — a path hash is an address, not an identity.
- **A-4:** [assumed] Out of scope entirely, stated rather than discovered: **block tiles** (no id key, `.nexus`-resident, invisible to the walk; their trash path writes no pair) and **Tasks/Events** (the walk emits no agenda nodes; widens for free when Agenda joins the walk).
- **A-5:** [confirmed — Nathan] **A duplicated content id re-mints, and the baseline is what makes that safe.** Two files carrying one id are detected at open; the prior session's baseline names the path that legitimately held that id, so the *other* file is the copy and receives a fresh id. Everything keyed to the id — order slots, folds, pins, thumbnails, asset folders — stays with the original by construction. **When the baseline cannot adjudicate** — a first open with no baseline, or neither file at the recorded path — **nothing is re-minted**: no arm may guess, and the ambiguity waits for a session that can resolve it. The re-mint runs at open, before the new baseline is written, so the adjudicator is always the pre-duplication record. Silent, per C-7.

#### B — Provenance (the restore half)

- **B-1:** [assumed — Nathan permits either form] Provenance is a **paired JSON beside the trashed artifact**. Nathan's ruling, clarified: a parent **id** may be stored on the deleted item itself — the prohibition is on storing a name-based location, which a rename rots. Both forms are therefore legal, and the pair is chosen on his cohesion criterion, not on permission: on-artifact storage needs **three shapes** (a frontmatter key for pages, a sidecar key for containers, and — since a Context has no sidecar — a new file inside the trashed folder anyway), where the pair is **one mechanism for every kind**, and it holds the long payloads (a Space's page list, a Context's membership map) that have no business in frontmatter. It also keeps the four dissolved defect classes dissolved. Revisitable if Nathan actively prefers on-artifact; the facts either form must carry are identical.

  The delete arm gathers what it needs *before* the move — reading, not writing — then writes one pair file next to the destination `trashWithTimestamp` returns. Nothing touches the user's file on the way out, and nothing rides back into the tree on restore.

  Why a record at trash time is still necessary, double-checked: the mirrored chain stores only the **old path**, and the baseline holds only the **last session**, overwritten each open. Once the parent is renamed, no surviving structure maps the stale path to the parent's stable id — so the id must be captured at the moment of departure. It just doesn't have to be captured *inside* the file.

  What this dissolves, from the second attack round: the file-lock hazard (nothing writes to a live page, so nothing races the autosave) · the malformed-frontmatter branch (five of eight shapes refused a frontmatter write; a pair write reads the file at most and writes beside it) · the strip-at-restore pass and its adoption gate (no key ever sits on a restored file) · the empty-fence flow-style degradation (no fence is ever created).
- **B-2:** [assumed] One pair per trashed **top**. `trashWithTimestamp` moves a whole subtree in one rename; passengers keep their nesting and need nothing. The pair is named from the final stamped leaf — the de-collision counter included — so pairing is unambiguous.
- **B-3:** [assumed] This does not touch `be671378`. No pointer is written on any live entity, and none is written on the dead one either — the pair sits beside it.
- **B-4:** [assumed] The pair's parent field is a **discriminated union**: root · container by id · Context by registry id · unaddressable. Root-level Collections, Spaces and Contexts have no parent sidecar; a folder made outside the app before adoption has no id at all; a path-derived synthetic id is an address. Each records honestly rather than pretending to a bare id.
- **B-5:** [assumed] Per-kind payloads ride the same pair:
  - a **Context** carries its **own registry entry** — id, title, icon, position — because its identity lives only in the registry, which the delete arm erases before the folder moves. Verified: a perfectly hand-restored Context folder returns nothing without it. It also carries the membership map per A-1b.
  - a **Space** carries the membership list per A-1a.
  - pages and ordinary containers carry parent + identity and nothing else.
- **B-6:** [assumed] Under **system trash mode** the artifact leaves the nexus through the OS and no pair is written — there is nowhere valid for it to point. The restore surface covers nexus-trash mode only and says so; the delete confirmation already distinguishes the modes.
- **B-7:** [assumed] A pair whose artifact is gone — trash emptied by hand in Finder — is orphaned and harmless; restore listing prunes orphans as it encounters them. A hand-restored artifact leaves its pair behind the same way, and carries **no residue at all** into the live tree.

#### C — Baseline (the compare half)

- **C-1:** [assumed] The baseline lives in `nexus.db` as a `local_state` row. It is derived, per-machine, and rebuildable by definition. `.nexus/` is watched, so a per-gesture document there buys re-walks; the database is ignored *because* it thrashes.
- **C-2:** [assumed] The **open path owns one walk explicitly**: `adoptNexus` and launch-restore call it after the database opens and hand that one tree to the baseline writer and the renderer's first state read. Not "whichever walk happens first" — the watcher starts before the renderer's first request, and a sync daemon materialising another device's changes would otherwise make the post-change walk the baseline.
- **C-2a:** [assumed] An **absent** prior baseline is a distinct outcome: latch and report nothing. First-ever open, a schema bump that drops the database, and a null handle on locked media all reach it; treating absence as an empty map would report every entity as created.
- **C-3:** [assumed] **No mutation hooks.** Every in-app structural change already triggers a confirming walk; the next session's baseline captures it.
- **C-4:** [assumed] The watcher already attributes live-session drift in memory. The baseline covers only the window when the app was closed.
- **C-5:** [assumed] The diff runs over the **union** of keys with absence as a first-class value; tracked fields are **scalars**. Non-scalar facts enter as event payloads, never baseline fields.
- **C-5a:** [assumed] **Existence has three states** — present, absent, unreadable. The walk drops a file whose frontmatter went Unknown and synthesizes an id for a container whose sidecar is unreadable; a two-state diff reports a hand-edit typo as a deletion. The walk distinguishes these internally; the projection carries it through.
- **C-6:** [assumed] `kind` derives from `NodeKind`, unwidened. No `homepage` member. Widens with the walk.
- **C-7:** [confirmed — Nathan] **Compare is silent.** The diff is computed at open — it must be, since the prior baseline is overwritten in the same breath — and its result is kept as a quiet device-local row. No surface, no notification. A surface, when one is wanted, reads what is already being recorded.

#### D — What Is Not Absorbed

- **D-1:** [assumed] **Absorb the property Delete snapshot only** — path-keyed, non-atomic, flat in `.trash`, read by nothing. It becomes an ordinary pair.
- **D-2:** [assumed] **Leave the Remove cache alone.** Its correctness is its reconciliation branches; it is co-located with its Collection and travels with it. Its per-value spend-on-landed-write model is *copied* by restore, not centralized.
- **D-3:** [assumed] **Leave the rename journal separate.** Eleven discard branches, one of which must never generalize: discard, never hijack.
- **D-4:** [assumed] **Leave the order arrays alone.**
- **D-5:** [confirmed by evidence] No migration anywhere: zero `property_cache` blocks exist on either live nexus, and the pair mechanism creates files only in `.trash`.

#### F — Consolidation (Nathan's lens: leave no adjacent residue for a future pass)

- **F-1:** [confirmed — Nathan's directive] The feature absorbs its neighbourhood **now**. A future consolidation pass must not find mechanisms this work should have taken; simplicity and cohesion outrank minimal diff.
- **F-2:** [assumed] Absorbed outright: the **property Delete snapshot** becomes an ordinary pair (fixing, in one move, its path key, its non-atomic raw write, and its flat un-collided placement).
- **F-3:** [assumed] Residue removed in the same work, because the delete path is already open under the editor: the **`removed_at`** field the Remove cache writes and nothing reads · the **four unreachable cascade-failure branches** in the context cascade, whose precondition every caller has already resolved · the **stale comment** claiming `trashWithTimestamp` is shared by crud delete helpers that do not exist.
- **F-4:** [assumed] **One reconciliation loop.** Tag re-application on restore is the Remove cache's spend-per-landed-write shape; the plan implements it by extracting that loop and pointing both at it where the shapes genuinely align — never by writing a parallel one. The Remove cache's storage and its type-revalidation branches stay exactly where they are.
- **F-5:** [assumed] **The per-entity tuple gets one owner.** The baseline's `{ id, kind, title, path }` shape is declared once in `src/shared/`, and the renderer's tree-index record aligns to it rather than restating it — the two are the same fact in two processes today.
- **F-6:** [assumed] Explicitly NOT absorbed, each a different mechanism rather than a deferred absorption: the **Remove cache** (a value cache on a live entity — nothing departs) · the **rename journal** (a transaction log whose discard branches are domain law) · the **order arrays** (display state with read-time tolerance). A future pass finding these should find this paragraph.

#### E — Resolution

- **E-1:** [assumed] The record **decides** and returns the decision as data: a placement (directory + final name) or a typed refusal — parent gone · parent cannot hold this kind · parent unaddressable · trashed outside the nexus · id already live.
- **E-2:** [assumed] The acting code branches on nothing — a mover, not a decider. Name choice on collision is the resolver's, since choosing is deciding.
- **E-3:** [assumed] A name collision at the target **disambiguates**, as creates already do; the resolver returns the chosen name.
- **E-4:** [assumed] Restoring a child out of a still-trashed parent refuses rather than guessing.
- **E-5:** [assumed] If a fix ever needs ordering, the resolver returns an ordered plan.

#### Membership capture

- **A-1a:** [assumed] **Space membership is captured free.** The unlink sweep already returns the exact file set it rewrote and hands its callback each file's parsed frontmatter — page id in hand at the moment its tag is removed. The delete arm currently discards that return. The captured id list rides the Space's pair; restore re-applies per page, reconciling like the Remove cache — spend an entry only on a landed write, skip a page since deleted or moved. No standing reverse index exists or is created.
- **A-1b:** [confirmed — Nathan] A **Context** delete records, per page, the **Space list** the stripped key held — one page may carry several values, and a page-only record would restore the key empty. Each recorded Space carries **`{ id, title }`**: the title is the join key (frontmatter values are titles, and the filesystem forbids two same-titled Spaces in one Context — folder name is title), the id verifies the restored Space's identity, exactly as resolution already verifies existence. No new logic — both values are in hand in the same callback.

### Core (must-have)

- The pair: its shape, the parent union, per-kind payloads, written by the delete arm from reads made before the move.
- The resolver, returning a placement + name or a typed refusal.
- **A minimal restore path** — without one, pairs are written and never spent.
- The baseline projection, the open path's one explicit walk, the union-diff with three-state existence, the silent result row.
- The duplicate-id re-mint at open, baseline-adjudicated, refusing when it cannot adjudicate.

#### Prospects

- **Crash-safe cascades** — the write→act→settle shape with no record today; a page rename's only safety net is an in-memory reverse a crash defeats. The pair + settle shape covers it nearly free.
- A full trash browse-and-restore surface, and any compare surface — both read what Core already records.
- Property and frontmatter change capture, as event payloads.
- Git as opt-in content history — complementary, never the record; Pommora must never auto-commit.

#### Out of Scope

- Content versioning or an editing undo stack · un-adopted entities · sync and conflict resolution · order-array purging · block tiles · agenda kinds until the walk emits them · system-trash-mode restore.

#### Considered & Rejected

- **Provenance written INTO the trashed artifact** (V2/V3). Rejected by Nathan's rule — no writes into content that aren't necessary — and the necessity test failed: a pair beside the artifact carries the same facts. Dissolves the lock hazard, the malformed-frontmatter branch, the strip pass, and the flow-style degradation in one move.
- **A central `.nexus/record.json`** (V1). `.nexus/` is watched; near a megabyte at scale, fully re-serialized per gesture; entries with no consumer to spend them.
- **Per-mutation baseline hooks** — the confirming walk already runs.
- **Append-only ledger** · **record distributed across live container sidecars** · **git as the mechanism** · **once-per-open as the only trigger** — as previously recorded.

#### Lessons

- When a mechanism must remember something about a thing, put the memory as close to the thing as possible — *on* it if it must travel, **beside** it if it must not. The beside-form kept every benefit and dissolved four defect classes the on-form carried.
- "Bounded in count" is not "bounded in cost." Size it before choosing where it lives.
- A record whose entries are only spent by a surface you have not built is an append-only log wearing a bounded one's clothes.
- The enumeration you need is often already computed and discarded at the exact call site that needs it. Check the return types of the sweeps you already run before designing capture.

### Open — none

Every previously open decision is closed by Nathan's rulings: provenance beside the artifact (no content writes) · compare silent · duplicates re-mint with baseline adjudication · Context records carry `{id, title}` Spaces. What remains before ratification is one attack round against this version.
