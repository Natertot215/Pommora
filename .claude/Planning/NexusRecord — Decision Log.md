## NexusRecord — Decision Log

> **Status:** settled — verification complete. Scope ruling: the restore **actions** ship — resolver, op, listing — with no user interface; every surface is sequenced after. Every decision below is ratified by Nathan or derived from a verified fact; none is open.

### Frame

- **Purpose:** Let Pommora put a trashed entity back into the folder it belonged to — even when that folder has since been renamed or moved — and let it notice structural change made while it was closed.
- **Core Value:** Pommora can always answer *where is this now*. It cannot answer *where was this then*. Two separate mechanisms close that, each the smallest thing that does its half.
- **Success Criteria:**
  - A page is trashed; its parent folder is renamed; the page restores into the renamed folder.
  - A folder is trashed with pages inside it; restoring the folder restores its contents intact.
  - A Space tagged on many pages is deleted and restored; the pages that still exist carry its tag again.
  - A duplicated file or folder stops sharing its twin's identity: the copy is adjudicated against the prior baseline and re-minted.
  - Adding a tracked fact later is additive — no entry-shape change, no differ rewrite.
  - The code that performs a restore holds no domain policy of its own.

### The Two Halves

They share a module and nothing else.

- **Provenance** — where a departed entity belonged and what it carried. A **paired JSON written beside the artifact in `.trash`**, named from the artifact's final stamped leaf. Created by the delete, read by restore, deleted with its artifact, never entering the live tree.
- **Baseline** — what the walk last saw. A derived per-machine projection in `nexus.db`, written once per session, read once per session.

### Sources

- `.claude/Planning/Identity + Enforcement — Decision Log.md` — D-15 (duplicate ids; folds in via the baseline, see A-5) and D-17 (one record serving structural revert and trash restore).
- Commit `be671378` — *"parent_id leaves — folder nesting was always the parentage."* Constrains B-3.
- `src/main/io/atomicWrite.ts` — `trashWithTimestamp`: mirrors the folder chain, stamps the leaf, de-collides with a counter, moves a whole subtree in one rename, and returns the final destination the pair name derives from.
- `src/main/mutate.ts` — the `delete` arm's real order (sweep → registry erase → move) and `removeViaMode`'s two trash modes.
- `src/main/crud/contextCascade.ts` — `sweepContextRoots` hands its callback each swept root's parsed frontmatter; `unlinkContextKey` / `unlinkSpaceValue` wrap it; the same sweep serves the rename cascade.
- `src/main/watcher.ts` — `.nexus/` is watched; `.trash` and `nexus.db` are ignored, so a pair write costs no watcher event.
- `src/main/index.ts` — `prepareOpenedNexus` holds no tree; the watcher starts before the renderer's first state request.
- `src/renderer/src/store.ts` — `mutate` patches optimistically then confirms with a walk; the error arm skips both, and the write-echo suppresses the watcher push.
- `src/main/crud/removeProperty.ts` — the `property_cache` block: id-keyed, reconciled per value on restore, co-located with its Collection.
- `src/main/crud/deleteProperty.ts` — the property snapshot: path-keyed, non-atomic, flat in `.trash`, read by nothing.
- `src/main/crud/contextJournal.ts` · `contextCascade.ts` — the rename journal and its discard branches.
- `src/main/crud/contextWrite.ts` — a Context's folder resolves as `contextsDir/<title>`; a freed title is immediately mintable by a new Space or Context.
- `src/main/crud/folderEntity.ts` · `mutate.ts` — folder name = title; the create wrapper in the dispatch disambiguates on collision, the primitives themselves refuse.
- `src/shared/types.ts` — `NodeKind`; a Context group is `{def, spaces}` with no node kind of its own.

### Decisions

#### A — Scope

- **A-1:** [assumed] The record tracks **structural facts** — identity, location, parentage, existence. No *continuous* content snapshotting. Values enter only as event payloads bounded by an event; they never become baseline fields.
- **A-2:** [assumed] Compare **reports** external drift; it never auto-reverts. Separately, the app's own *interrupted* work may complete unattended — the rename journal already does, and forbidding that would forbid the record's best future use.
- **A-3:** [assumed] Un-adopted entities are out of scope. The baseline projection **actively filters** `adopted-`-prefixed ids, and a parent whose id is one records as `unaddressable` — a path hash is an address, not an identity.
- **A-4:** [assumed] Out of scope entirely, stated rather than discovered: **block tiles** (no id key, `.nexus`-resident, invisible to the walk; their trash path writes no pair) and **Tasks/Events** (the walk emits no agenda nodes; widens for free when Agenda joins the walk).
- **A-5:** [confirmed — Nathan] **A duplicated id re-mints — content and container alike — and the baseline is what makes that safe.** One Finder folder-duplicate copies the sidecar id along with every page id inside, and container ids key the fold, view, thumbnail and asset stores, so the copy and the original share all of them until re-minted. A sidecar id is exactly as re-mintable as a frontmatter one. The prior session's baseline names the path that legitimately held each id; what sits at that path is the original, the other re-mints.
  - **The refusal preserves its evidence — and spends it or drops it, never hoards it.** When the baseline cannot adjudicate, nothing is minted, and the baseline writer must not collapse the ambiguity: an id the walk saw at two or more paths keeps its prior-session path, marked ambiguous. But a deferral must have a payoff to defer *to*: when the recorded path no longer exists at all, no future session can adjudicate either, so the id drops to unadjudicable rather than freezing forever. Ambiguous-marked ids are **excluded from the diff** — their baseline path is stale by construction, and reporting the same phantom move every open would also overwrite the last-non-empty drift row C-7 protects.
  - **The re-mint re-keys what the id keys.** The device-local rows keyed by entity id — the block layout, the active view, folds, preview origins — move with the id, or a Space re-mint silently empties its board and orphans its tile files. Order arrays need nothing: unknown ids drop and the entity re-enters by title.
  - **The re-mint re-runs the attach pass, not a hand-patch.** A Space's id also lives in the `contextValues` of every node that tags it, so patching the one walked node leaves every chip resolving a dead id on first render. The walk's existing in-memory attach pass re-runs over the patched tree — it already exists and is explicitly cheap. The frontmatter write takes the file lock like every other frontmatter writer.
  - Silent, per C-7.

#### B — Provenance (the restore half)

- **B-1:** [confirmed — Nathan] Provenance is a **paired JSON beside the trashed artifact**. Nathan's rule constrains *what* may be recorded — **ids, never name-based locations**, since a rename rots a name — not where the record lives; an id on the artifact itself would also be legal. The pair wins on cohesion: on-artifact storage needs three shapes (a frontmatter key for pages, a sidecar key for containers, and a new file anyway for Contexts, which have no sidecar), where the pair is one mechanism for every kind, holds the long payloads that have no business in frontmatter, writes nothing into the user's file on the way out, and leaves no residue to strip on the way back.

  Why a record at trash time is necessary at all: the mirrored chain stores only the old **path**, and the baseline holds only the last **session**, overwritten each open. Once the parent is renamed, no surviving structure maps the stale path to the parent's stable id — so the id is captured at the moment of departure.

  The write is **best-effort, gathered at three named points** in the delete arm's real order: the registry entry before the erase, the membership during the sweep, the pair name after the move returns. A pair write that fails does **not** fail the delete — the artifact is already irreversibly moved, and a fault reply would leave the renderer showing an entity that is gone from disk. A missing pair degrades that one entity to hand-restore, which is today's behaviour for everything.

  **All-or-nothing per pair:** if a gather point a kind requires fails — a Context whose registry entry could not be read, a parent that could not resolve — **no pair is written at all**. A missing pair is the accepted degradation; a present pair that is silently incomplete is worse, because restore trusts it. The sweep-scoped partial marker (G-2) covers sweep gaps only and says so.
- **B-2:** [assumed] One pair per trashed **top**. The trash primitive moves a whole subtree in one rename; passengers keep their nesting and need nothing. The pair is named from the final stamped leaf — de-collision counter included — so pairing is injective.
- **B-3:** [assumed] This does not touch `be671378`. No pointer is written on any live entity, and none on the dead one either — the pair sits beside it.
- **B-4:** [assumed] The pair's parent field is a **discriminated union**: root · container by id · Context by registry id · unaddressable. Root-level Collections, Spaces and Contexts have no parent sidecar; a folder made outside the app before adoption has no id at all; a path-derived synthetic is an address. Each records honestly rather than pretending to a bare id.
- **B-5:** [assumed] Per-kind payloads ride the same pair:
  - a **Context** carries its **own registry entry** — id, title, icon — because its identity lives only in the registry, which the delete erases before the folder moves; a perfectly hand-restored Context folder returns nothing without it. No position is recorded: registry order is array position, meaningless after any reorder while the Context sat in trash, so restore **appends at the end**. It also carries the membership map per G-3.
  - a **Space** carries the membership list per G-1.
  - pages and ordinary containers carry parent + identity and nothing else.
  - the **property snapshot** is the pair shape's one **artifact-less variant** — nothing is trashed when a property is deleted, so there is no leaf to pair with; the orphan prune exempts the variant, or it would eat the recovery net the delete confirmation promises.
- **B-6:** [assumed] Under **system trash mode** the artifact leaves the nexus through the OS and no pair is written — there is nowhere valid for it to point. The restore surface covers nexus-trash mode only and says so; the delete confirmation already distinguishes the modes.
- **B-7:** [assumed] A pair whose artifact is gone — trash emptied by hand in Finder — is orphaned and harmless; restore listing prunes orphans as it encounters them, exempting the artifact-less variant. A hand-restored artifact leaves its pair behind the same way, and carries no residue into the live tree.

#### C — Baseline (the compare half)

- **C-1:** [assumed] The baseline lives in `nexus.db` as a `local_state` row. It is derived, per-machine, and rebuildable by definition. `.nexus/` is watched, so a per-gesture document there buys re-walks; the database is ignored *because* it thrashes.
- **C-2:** [assumed] The **open path owns one walk explicitly**: `adoptNexus` and launch-restore call it after the database opens and hand that one tree to the re-mint pass, **then** the baseline writer, then the renderer's first state read — in that order, or the baseline records the pre-mint state and the next open reports the re-minted entity as created. Not "whichever walk happens first" — the watcher starts before the renderer's first request, and a sync daemon materialising another device's changes would otherwise make the post-change walk the baseline.
- **C-2a:** [assumed] An **absent** prior baseline is a distinct outcome: latch and report nothing. First-ever open, a schema bump that drops the database, and a null handle on locked media all reach it; treating absence as an empty map would report every entity as created.
- **C-3:** [assumed] **No mutation hooks.** Every in-app structural change already triggers a confirming walk; the next session's baseline captures it. The one exception is stated in A-5: the re-mint patches the handed tree itself.
- **C-4:** [assumed] The watcher already attributes live-session drift in memory. The baseline covers only the window when the app was closed.
- **C-5:** [assumed] The diff runs over the **union** of keys with absence as a first-class value; tracked fields are **scalars**. Non-scalar facts enter as event payloads, never baseline fields.
- **C-5a:** [assumed] **Existence has three states** — present, absent, unreadable. The walk drops a file whose frontmatter went Unknown and synthesizes an id for a container whose sidecar is unreadable; a two-state diff would report a hand-edit typo as a deletion. The walk distinguishes these internally; the projection carries it through.
- **C-6:** [assumed] `kind` derives from `NodeKind` **plus `context`**. A Context group carries no node kind — it is `{def, spaces}` in its own array — yet it is trashable, id-bearing, and holds the richest pair; a projection that cannot represent it can never report a Context created, renamed or deleted while the app was closed. No `homepage` member (no id, no path, not trashable). Widens further with the walk.
- **C-7:** [confirmed — Nathan] **Compare is silent.** The diff is computed at open — it must be, since the prior baseline is overwritten in the same breath — and its result is kept as a quiet device-local row holding the **last non-empty** diff, so an uneventful open cannot overwrite the one interesting record with nothing. No surface, no notification; a surface, when one is wanted, reads what is already recorded.

#### D — What Is Not Absorbed

- **D-1:** [assumed] **Leave the Remove cache's storage where it is** — co-located with its Collection, travelling with it through rename, move, trash-restore and copy. Restore's re-application uses **the same reconciliation loop** per F-4; the loop is shared, the storage is not.
- **D-2:** [assumed] **Leave the rename journal separate.** It is a transaction log whose correctness is its discard branches — one of which must never generalize: discard, never hijack a re-minted title.
- **D-3:** [assumed] **Leave the order arrays alone.** Absorbing them means inventing a purge that does not exist.
- **D-4:** [confirmed by evidence] No migration anywhere: zero `property_cache` blocks exist on either live nexus, and the pair mechanism creates files only in `.trash`.

#### E — Resolution

- **E-1:** [assumed] The record **decides** and returns the decision as data: a placement — directory, final name, and for a Context the final registry title — or a typed refusal: parent gone · parent cannot hold this kind · parent unaddressable · trashed outside the nexus · id already live.
- **E-2:** [assumed] The acting code branches on nothing — a mover, not a decider. Every name and title choice is the resolver's, since choosing is deciding.
- **E-3:** [assumed] A name or title collision at the target **disambiguates**, as creates already do, for every kind including Contexts: the restored registry entry, its folder, and every re-applied membership key all use the resolver's final title, so two registry ids can never point at one folder. Titles recorded in a pair are labels; **the resolver's final titles are what restore writes**, never the recorded ones — title uniqueness holds only at a moment, and nothing stops an impostor minting a freed title while the original sits in trash.
- **E-4:** [assumed] Restoring a child out of a still-trashed parent refuses rather than guessing.
- **E-5:** [assumed] If a fix ever needs ordering, the resolver returns an ordered plan.

#### F — Consolidation (Nathan's lens: leave no adjacent residue for a future pass)

- **F-1:** [confirmed — Nathan] The feature absorbs its neighbourhood **now**. A future consolidation pass must not find mechanisms this work should have taken; simplicity and cohesion outrank minimal diff.
- **F-2:** [assumed] Absorbed outright: the **property Delete snapshot** becomes the pair's artifact-less variant (fixing, in one move, its path key, its non-atomic raw write, and its flat un-collided placement).
- **F-3:** [assumed] Residue removed in the same work, because the delete path is already open under the editor: the `removed_at` field the Remove cache writes and nothing reads · the four unreachable cascade-failure branches in the context cascade · the stale comment claiming the trash primitive is shared by crud delete helpers that do not exist.
- **F-4:** [assumed] **One reconciliation loop.** Tag re-application on restore is the Remove cache's spend-per-landed-write shape; the plan extracts that loop and points both at it — never a parallel one. The Remove cache's storage and its type-revalidation branches stay exactly where they are.
- **F-5:** [assumed] **The per-entity tuple gets one owner.** The baseline's `{ id, kind, title, path }` shape is declared once in `src/shared/`, and the renderer's tree-index record aligns to it rather than restating it.
- **F-6:** [assumed] Explicitly not absorbed, each a different mechanism rather than a deferred absorption: the **Remove cache** (a value cache on a live entity — nothing departs) · the **rename journal** (a transaction log whose discard branches are domain law) · the **order arrays** (display state with read-time tolerance). A future pass finding these should find this paragraph.

#### G — Membership capture

- **G-1:** [assumed] **Membership is captured at the sweep, keyed per swept root — pages and Space sidecars alike.** Spaces are context-taggable themselves, and the unlink sweep strips `_space.json` roots exactly as it strips pages; a page-only capture would silently destroy every Space-to-Space link a deleted Context held. The capture discriminates the root by which id key it carries.
- **G-1a:** [assumed] **The sweep never strips a passenger.** A root that sits *under the entity being deleted* is leaving with its owner, and its key is still true inside the trashed subtree — stripping it records a loss the same operation then ships to trash, and a restored Context would come back with its internal Space-to-Space links destroyed. The unlink sweeps skip roots under the delete target by path prefix; the damage is removed at its source rather than captured and re-applied.
- **G-2:** [assumed] This is a **signature change to the shared sweep, not a free ride**: the callback gains the file path beside the parsed frontmatter, the return gains the captured values, and the widening reaches the rename cascade, which shares the sweep. The sweep also grows a **third list** for admission-refused roots — a dual-key page keeps its context key through the delete and today appears in neither `touched` nor `skipped` — and the pair records itself **partial** when that list or `skipped` is non-empty, rather than claiming completeness.
- **G-3:** [confirmed — Nathan] A **Context** delete records, per swept root, the Space list its stripped key held, each Space as `{ id, title }` — one root may carry several values, and a root-only record would restore the key empty. The id is the identity; the title is a label for the resolver, which re-applies under final titles per E-3.
- **G-4:** [assumed] Restore re-applies per entry through the shared reconciliation loop — spend an entry only on a landed write, skip what has since moved or died. No standing reverse index exists or is created; the set is computed once, at removal, by a sweep that already runs.

### Core (must-have)

- The pair: its shape, the parent union, per-kind payloads and the artifact-less variant, written best-effort by the delete arm from reads made at the three gather points.
- The resolver, returning a placement with final names or a typed refusal.
- **The restore op** — IPC-reachable and end-to-end tested, spending pairs through the resolver. No surface ships; the op is the spend path until one does.
- The baseline projection, the open path's one explicit walk, the union-diff with three-state existence, the last-non-empty result row.
- The duplicate-id re-mint at open — content and container — baseline-adjudicated, evidence-preserving, refusing when it cannot adjudicate.

#### Prospects

- **Crash-safe cascades** — the write→act→settle shape with no record today; a page rename's only safety net is an in-memory reverse a crash defeats. The pair + settle shape covers it nearly free.
- Every surface — the restore trigger, the trash browser, any compare view. The actions they call all ship in Core; the surfaces read and invoke what already exists.
- Property and frontmatter change capture, as event payloads.
- Git as opt-in content history — complementary, never the record; Pommora must never auto-commit.

#### Out of Scope

- Content versioning or an editing undo stack · un-adopted entities · sync and conflict resolution · order-array purging · block tiles · agenda kinds until the walk emits them · system-trash-mode restore.

#### Considered & Rejected

- **Provenance written into the trashed artifact.** Legal under the ids-not-names rule, rejected on cohesion: three shapes instead of one, a new file needed for Contexts anyway, long payloads in frontmatter, a lock against the autosave, refusals on the five frontmatter shapes that cannot round-trip, a strip pass on restore, and a flow-style degradation on pages that had no fence.
- **A central record document in `.nexus/`.** The folder is watched, so a per-gesture rewrite buys re-walks; near a megabyte at realistic scale, fully re-serialized per patch; entries with no consumer to spend them.
- **Per-mutation baseline hooks.** The confirming walk already runs after every in-app structural change.
- **Title as the membership join key.** Uniqueness holds only at a moment; an impostor can mint a freed title while the original sits in trash.
- **A stored registry position in the Context pair.** Registry order is array position; any reorder while trashed makes a recorded index a lie.
- **Append-only ledger** — demands a compaction policy up front and grows without bound. **Record distributed across live container sidecars** — a trashed entity has no home sidecar; inverted instead, the departed entity's pair remembers the folder. **Git as the mechanism** — tracks paths and guesses renames by content similarity; answers the address question, which is already solved, not the identity question, which is the gap. **Once-per-open as the only write trigger** — a page moved in-app then trashed would restore to where it was at last open.

#### Lessons

- When a mechanism must remember something about a thing, put the memory as close to the thing as possible — *on* it if it must travel, **beside** it if it must not.
- "Bounded in count" is not "bounded in cost." Size it before choosing where it lives.
- A record whose entries are only spent by a surface you have not built is an append-only log wearing a bounded one's clothes.
- The enumeration you need is often already computed and discarded at the exact call site that needs it. Check the return types of the sweeps you already run before designing capture.
- A refusal that defers a decision must preserve the evidence the deferred decision needs, or it launders a guess into the session that trusts it.
