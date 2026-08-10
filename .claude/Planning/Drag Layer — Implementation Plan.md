## Drag Layer — Implementation Plan

> **Status:** written, pending review · Spec: none — this plan's Grounding block replaces one · Execute tasks in order.
> Citations name files and symbols; re-derive before editing.

**Goal**

A sidebar reorder persists on the first attempt, for every entity, without a restart — and the drop responds the instant it lands rather than after a full vault re-read. Underneath that, the twelve drag surfaces stop re-deriving the shared drag toolkit and consume it, so the next drag surface inherits a working lifecycle, a working slot resolver, and themed chrome instead of copying a neighbour.

The shape is **removal**. The reorder failure is one workaround compensating for one inconsistency: page writes govern a narrower frontmatter key set than the mechanism they call already supports, so a page Pommora has written to can still hold no identity; and `persistable()` exists to strip those identity-less entries out of order arrays before they reach disk. Close the inconsistency and the workaround has nothing to do — it deletes rather than gets fixed. The same logic runs through the consolidation: the shared toolkit already exists and is good, so every task removes a private re-derivation rather than building a new abstraction. Two files are created; both are extractions of code that exists six and ten times today.

Three alternatives were weighed and rejected. **Persisting the placeholder id** — a placeholder is a stable hash of the entity's relative path, so it works until the entity is stamped and then goes stale; that trades a permanent silent failure for an intermittent one. **Stamping more aggressively at open, or from the watcher** — the read path is read-only by construction, and neither covers an entity that arrives mid-session, which is the actual failure population. **Rebuilding the sidebar's drop resolver first** — the resolver would be tuned against a persistence layer that silently discards its writes, so every ambiguous result costs a round of "my rewrite or the old bug."

Constraints: the shared engines (`engine.tsx`, `group.tsx`) keep their own gesture lifecycles, which handle abort conditions the skeleton has no concept of. Keyboard drag stopping at the single-zone engine stays as documented policy. This plan does not bulk-restamp an existing vault, does not migrate the MarkdownPM drags, and does not resolve whether `feel.tsx`'s context is adopted or deleted.

**Requirements**

1. A page Pommora writes to carries its identity key afterward.
2. An order write persists every id it was handed, or fails and says so.
3. A same-parent page reorder previews immediately, the way a folder reorder already does.
4. A gesture whose callback throws cannot refuse every subsequent gesture in the application.
5. The four surfaces that hand-roll the gesture lifecycle consume the shared skeleton instead.
6. One slot resolver and one snapshot helper replace the per-surface copies.
7. The sidebar's drop line and drag ghost come from the design system rather than from literals.
8. `group.tsx` stops rebuilding its row model on every pointer move.
9. Dragging over a collapsed sidebar container springs it open on dwell.
10. The four surfaces trapped inside their viewport gain edge auto-scroll; the five silent insertion-line surfaces gain announcements.

**Acceptance — the whole thing working**

On a nexus holding a page that was created outside Pommora after the app launched: dragging that page to a new position within its folder shows an insertion line, moves the row on drop without waiting for a vault re-read, and the page is still in that position after a full application restart — with no restart required beforehand to make the drag work at all. Verified on a scratch nexus, not on NexusOS.

**Forced By**

- The read path is read-only by construction → identity cannot be minted while reading; it has to come from a write, so the fix belongs in the write path and nowhere else.
- `adoptedId` is a stable hash of the nexus-relative path (`main/ids.ts`) → a placeholder is an address rather than an identity, which is why persisting one is wrong and why translating one is possible: the same path always hashes the same way.
- `PAGE_MODELED_KEYS` already contains `PAGE_ID_KEY` (`shared/schemas.ts`) → stamping on write is a change to which key set a caller governs, not a new mechanism.
- `gesture.ts` holds one module-level live gesture → any escape that skips `detach` refuses every gesture app-wide, and the exposure grows with each surface migrated onto it. Hardening therefore precedes migration.
- The sidebar mounts `SidebarDnd` twice — the contexts layer and the collections layer (`Sidebar/Sidebar.tsx`) → unmount-during-drag is reachable through the mode cross-fade, which is what makes the leaked scroll listener a real path rather than a theoretical one.
- Keyboard access stops at the single-zone engine, as stated in `Features/PommoraDND.md` → the shared slot resolver must return a boundary, never assume the slot-rect model the insertion-line surfaces deliberately don't carry.
- `stampAdopted` is best-effort and runs only at open (`main/index.ts`) → the failing population is precisely "entities that appeared since launch," which is why a restart currently fixes it.

**Inherited Reasoning**

- `persistable()` carries its own rationale in `main/crud/reorder.ts`: a placeholder "re-stamps to a fresh ULID, breaking continuity." That reasoning is correct and is exactly why the fix is upstream identity rather than persisting the placeholder. Do not resurrect the stripping behaviour.
- `main/mutate.ts` best-efforts the trailing order write after a move deliberately — reporting a completed move as failed leaves the renderer showing a page where it no longer is. Keep that; the defect is that success and partial-success are folded into one reply, not that the move is best-effort.
- `store.ts`'s `moveSet` arm carries the comment explaining why a same-parent move needs an order patch. That reasoning was correct and simply never reached `movePage`.
- Four surfaces are documented as deliberately hand-rolled and must stay so: `engine.tsx` (two input sources sharing one gesture record), `group.tsx` (a stranded-drag guard and a blur abort that only a captureless window-listener drag can hit), `SurfacePM/sensors/pointerDrag.ts` (rAF coalescing and a lost-capture abort), and the chrome drags in `SidePane.tsx` / `FloatingWindow.tsx` / `TabBar.tsx` (element-bound and self-cleaning, with no threshold by design).
- MarkdownPM's `listDrag`/`blockDrag` are blocked on an `onTap` callback the skeleton lacks — a sub-threshold release currently places a caret or toggles a checkbox, and the skeleton's `teardown` cannot distinguish that from an Escape. `ContextPM` already records this decline; it stands.

**Grounding** *(re-open these; don't cite them)*

- `Pommora/src/main/crud/reorder.ts` — `persistable`, `setChildOrder`, `setStateOrder`, `setSpaceOrder`. The strip and the silent success.
- `Pommora/src/main/crud/page.ts` — `createPage` (governs the full key set) beside `updatePageBody` / `relocatePage` (govern `modified_at` alone). The inconsistency.
- `Pommora/src/shared/schemas.ts` — `PAGE_MODELED_KEYS`. Establishes that the id key is already modelled.
- `Pommora/src/main/adopt.ts` — `stampAdopted`, `ensureFolderId`, and the module-private `stampPage`/`stampFolder` the order path needs.
- `Pommora/src/main/order.ts` — `resolveOrder`. Establishes that an unlisted id falls to the title-sorted tail.
- `Pommora/src/renderer/src/store.ts` — the `movePage` and `moveSet` arms of the optimistic patch.
- `Pommora/src/renderer/src/treeMove.ts` — `relocateNodeInTree` (nulls on same-parent) and `reorderChildrenInTree` (folders only).
- `Pommora/src/renderer/src/design-system/interactions/gesture.ts` — the skeleton and its module-level `live`.
- `Pommora/src/renderer/src/Sidebar/sidebarDnd.tsx` — the largest hand-roll; five indicator conventions in `computeTarget`.
- `.claude/Guidelines/Design-Sources.md` — the standing rule this plan enforces, and its four-way action table.
- `.claude/Features/PommoraDND.md` — the keyboard-access boundary.

**Environment**

| Slot | Resolved as |
| --- | --- |
| Plan directory | `.claude/Planning/` — existing convention `<Topic> — Implementation Plan.md` |
| Spec input | None exists. Replaced by this plan's Grounding block plus four dispatched read-only surveys, every load-bearing claim re-verified against the code. |
| Explorer agent | No project-designated explorer → `general-purpose` (four already dispatched) |
| Research agent | Not needed — no external research in scope |
| Code reviewer | No designated correctness agent → `/code-review` at phase gates |
| Attack reviewer | `build-breaking-agent` (designated in StudioMD) |
| Neutral verifier | `general-purpose`, handed the Delivery Claim and this plan only |
| Simplification pass | `code-simplifier` (designated in StudioMD) |
| Gate commands | From `Pommora/package.json`, run in `Pommora/` — see Global Constraints |
| Rules directory | `.claude/Guidelines/` |

**Shapes:** fix · removal · refactor · user-visible

Phase 1 is a **fix** (sibling sweep required — what else consumed the old behaviour) and a **removal** (`persistable` and one silent-success branch). Phase 1 also **writes to live user files**: after it lands, saving a page adds an identity key where none existed. That is ordinary app behaviour rather than a bulk migration — no vault-wide pass runs, no existing file is touched until the user edits or moves it — but it is disclosed here because it changes what Pommora writes to a user's markdown. Census below.

Phases 2–3 are **refactor** and carry a baseline invariant: the full test suite's pass count and the lint warning count do not move. Phase 4 is **additive** and **user-visible**.

**Live-data census** *(measured read-only against `/Users/nathantaichman/NexusOS`, 08-09)*

- 232 pages: 175 carry `PageID`, **57 do not**. Of the 57, roughly 44 sit under `slates/`, a folder with no container sidecar that Pommora does not surface. The remainder are files written from outside Pommora — mirrored Studio documents and Claude Code output.
- 71 content folders: 54 carry a sidecar id, **17 do not**. Three are real Pommora content (`Atlas/II. Projects/Athena`, `Atlas/II. Topics/Aphelion`, `Atlas/II. Topics/Claude`); the rest are `slates/` and its children.
- No bulk restamp is in scope. Files gain an identity as they are next written. The audit script that produced these numbers is disposable and lives in the session scratchpad, not in the repository.

**Global Constraints (every task inherits these)**

- Gates, run from `Pommora/`, exit codes read directly and **never through a pipe** — a piped `vitest | tail` reports the pipe's status and has previously masked a red suite:
  - `npm run typecheck` — covers both tsconfig projects; the only type gate.
  - `npm run test` — Vitest.
  - `npm run lint` — Biome; must stay at zero warnings.
  - `npm run build` — at phase gates only.
- Formatting is Biome's, applied by a PostToolUse hook. Never hand-align, never run Biome manually. An `Edit` failing on whitespace means the file was reformatted — re-read and retry.
- Tokens come from `design-system/tokens`. Never hand-roll a token or a value a token already holds.
- Comments: minimum, why-only. Never restate a value the declaration holds. `KNOB` markers and `(Nathan's call)` annotations are functional — never strip them.
- **A parallel documentation session is active on this repository.** Stage explicit paths only; never `git add -A` or a directory-level add. Never run a whole-tree git operation (`stash`, `checkout .`, `clean`, `reset`).
- One tree-touching writer at a time. Read-only surveys may fan out; implementation does not.
- Out of scope everywhere: `engine.tsx` and `group.tsx` gesture lifecycles · `SurfacePM/sensors/pointerDrag.ts` · `MarkdownPM/editor/listDrag.ts` and `blockDrag.ts` · `SidePane.tsx`, `FloatingWindow.tsx`, `TabBar.tsx` window drag · keyboard drag · any bulk restamp of an existing vault · `feel.tsx`'s adopt-or-delete decision.

**Made False**

| Doc | The specific claim | What makes it false | Task |
| --- | --- | --- | --- |
| `ContextPM.md` | "`group.tsx`'s `cellAt` rebuilds the zone's column model on every call that clears its early return — bounded to append slots rather than every item" | `rowsOf` beside it is the larger per-move rebuild and is unnamed; Task 14 retires both | 14 |
| `ContextPM.md` | "`sidebarDnd`'s collection/context branch re-filters the sibling set per pointermove" | Task 9 moves the scan to the shared resolver | 9 |
| `ContextPM.md` | "The sidebar's contexts↔collections cross-fade renders two full trees … each building its own DnD index" | Task 6 scopes each layer's index to its own section | 6 |
| `ContextPM.md` | "`useOptionReorder`/`useStatusReorder` … near-duplicates of each other that a merge would collapse" | They share the lifecycle, not the drop model — one is flat, one crosses groups. Task 7 removes the shared half and states why the rest stays apart | 7 |
| `ContextPM.md` Fix Log | "The Set-Card drag flash (drop snaps back, then jumps on reload)" | Tasks 1–4 remove the snap-back class | 4 |
| `ContextPM.md` Fix Log | "The sidebars' drag mechanics are still glitchy" | Tasks 1–4 | 4 |
| `ArchitecturePM.md` | "Opening a folder as a Nexus stamps every un-adopted entity with a real ULID" | Identity now also arrives on write, not only at open | 1 |
| `ArchitecturePM.md` | "no key at all (adoptable, **stamped at open**)" — reads as a definition, so a grep for "adopt" skims past it | Same | 1 |
| `PommoraDND.md` | Its account of which surfaces consume the shared skeleton | Tasks 6–8 move four surfaces onto it | 8 |

**Dead Vocabulary** *(the closing sweep)*

- `rg -F "persistable" Pommora/src` → expect **1**. Legitimate hits: the prose use in `renderer/src/Detail/Views/Table/viewMerge.ts`, which is an unrelated adjective in a comment. At planning time: 5 (4 in `main/crud/reorder.ts`, 1 prose).
- Control: `rg -F "rmwJsonStrict" -l Pommora/src` → **11** files at planning time. Zero here means the sweep never ran.

**Hazard Window**

Opened by **Task 1**, closed by **Task 4**. While open, Pommora stamps identity onto pages but the order path has not yet been corrected, so a reorder can still silently fail. Do not run the running-thing verification pass, and do not point the dev build at NexusOS, until Task 4 lands. Use a scratch nexus throughout.

---

### Phase 1 — The saving path

*The bug, end to end. No drag code is touched in this phase.*

#### Task 1: A page write governs its identity key

**Requirement:** 1

**Why:** `createPage` writes a page's full modelled key set, which includes its identity key; `updatePageBody` and `relocatePage` govern `modified_at` alone. Both call the same merge primitive, so the difference is which key set the caller hands it — not a capability gap. The consequence is that Pommora can rewrite a page's frontmatter and leave it with no identity, which is how a page it wrote to today still can't hold a position in an order array. Closing this makes every later task's identity assumption true, and it is the prerequisite Task 2 needs before `persistable` can be deleted.

**Files:**
- Modify: `Pommora/src/main/io/pageFile.ts` — `writePageFile`. **The mint belongs here and never in `mergeFrontmatter`.** `writePageFile` has exactly two callers and already reads the file; `mergeFrontmatter` has thirteen, including `crud/governedSweep.ts`, whose nexus-wide enumeration deliberately reaches files the read walk refuses. A mint inside the shared merge would stamp identity into files Pommora does not surface.
- Modify: `Pommora/src/main/crud/page.ts` — only if the callers need to pass anything new.
- Test: `Pommora/src/main/crud/page.test.ts` (or a sibling if the house pattern differs — check before creating).

**The governed key set is computed per write, never widened unconditionally.** `mergeFrontmatter` throws when a document isn't mergeable and the governed set holds anything but `modified_at`, so adding the identity key unconditionally turns every body save on a broken-frontmatter page into a refusal. The key set has to be derived inside `writePageFile` from the file's own content — the id key joins the set only when `admitContentFile(fm, 'page').state === 'missing'` *and* the frontmatter is writable. That gate also makes it structurally impossible to stamp a second identity key onto a Task or Event file: a page-kind admission on a `TaskID` file returns `contradicting`, not `missing`.

**Interfaces**
- Produces: page writes leave `PAGE_ID_KEY` present on any page whose frontmatter admits one.
- Assumed by: Task 2 (the order path's translation), Task 4 (the optimistic patch keys on ids).

**Failure half:** a page whose frontmatter is unparseable → the existing refusal stands, no mint, no rewrite. A page already holding an id → untouched, no re-mint. A page holding two identity keys, a malformed one, or the wrong kind's key → `admitContentFile` returns Unknown and the file stays **byte-untouched**; this is the existing rule and must not change. A body-only write on a page with broken frontmatter currently passes the original bytes through — confirm the mint does not turn that lenient path into a refusal.

**Negative control:** the test that proves a page gains an id must go red with the mint removed; and a separate test must prove a page whose frontmatter carries a contradicting identity key is written back byte-identical, which must go red if the mint is applied unconditionally.

**Must agree:** `admitContentFile` in `shared/identity.ts` is the one admission predicate shared by the walk and the adoption pass. The mint must consult it and reach the same answer — a page this task stamps must be a page `stampAdopted` would also have stamped. One test crosses both.

**Skills:** `superpowers:test-driven-development` for the failing-test-first sequence.

**Steps:**
- [ ] Read `crud/page.ts`'s write family and `io/pageFile.ts`'s `mergeFrontmatter` whole. Decide and record where the mint belongs.
- [ ] Write the failing tests: page with no id gains one on a body write · page with an id is unchanged · page with a contradicting key is byte-identical · unparseable frontmatter still refuses. Run — expect red.
- [ ] Implement. Re-run the new tests — expect green.
- [ ] Run the full gate. Expect green with no change in the suite's pass count beyond the new tests.
- [ ] Commit: `fix(pages): a page write leaves the page with an identity`

#### Task 2: The order path guarantees identity, and `persistable` deletes

**Requirement:** 1, 2

**Why:** Task 1 covers pages Pommora has written to. It does not cover an entity the user has never edited but wants to drag, nor a container folder with no sidecar. `persistable()` exists to strip those entries out before a write; its own rationale — a placeholder "re-stamps to a fresh ULID, breaking continuity" — is correct, and is exactly why the answer is to guarantee identity upstream rather than to persist the placeholder. Once nothing identity-less can reach the writer, the filter has nothing to do and comes out. A placeholder is a stable hash of the nexus-relative path, so the translation from old id to newly-minted id is exact rather than heuristic.

**Files:**
- Modify: `Pommora/src/main/adopt.ts` — export a scoped stamper covering **the container itself and its direct children**, built from the existing module-private `stampPage`/`stampFolder` plus a new Space arm. `ensureFolderId` is the established precedent for this shape; extend that family rather than adding a parallel one.
- Modify: `Pommora/src/main/crud/reorder.ts` — `setStateOrder`, `setSpaceOrder`, `setChildOrder` call the stamper and translate; **delete `persistable`**.
- Test: `Pommora/src/main/crud/reorder.test.ts` (exists).

**Three corrections this task's first draft got wrong, each verified against the code:**

1. **Translate to the entity's *persisted* id, minting only when it has none.** `stampPage` and `stampFolder` both return false for an entity that is already a member, so a translation built on "what did I just mint" has no arm for an entity stamped by a previous drag but still reading as a placeholder in the renderer's not-yet-refreshed tree. That drops the entry — re-creating the exact silent strip this task deletes. The stamper returns `Map<placeholderId, currentId>` covering every placeholder it resolves, mint-or-read.
2. **Stamp the container, not only its children.** `setChildOrder` writes into the container's own sidecar, so stamping the children alone leaves a sidecar-less folder with nowhere to write — which is the state Task 3 then converts into a user-visible refusal. `ensureFolderId` at `main/adopt.ts` already resolves depth and kind correctly and no-ops on the nexus root; call it at the head.
3. **Spaces are a fourth placeholder population and need their own arm.** `readNexus.ts` synthesises a placeholder for a `_space.json` carrying no usable id, `setSpaceOrder` filters through `persistable`, and `stampFolder`'s kind domain is `collection | set` — nothing in `adopt.ts` touches a space sidecar at all. `stampAdopted` cannot heal it either, since it skips dot-prefixed directories and every Space lives under `.nexus/`. Deleting the filter from three writers while only two have a stamper would carry this plan's own bug to a fourth surface.

**Derivation**
- `rg -F "persistable" Pommora/src` → **5** at planning time (4 in `main/crud/reorder.ts`, 1 prose hit in `renderer/src/Detail/Views/Table/viewMerge.ts`). After this task: **1**.
- Control: `rg -F "rmwJsonStrict" -l Pommora/src` → **11** files. Zero means the search never ran.

**Interfaces**
- Produces: `ensureOrderIds(root, absFolder, order: string[]): Promise<string[]>` — returns the order with every placeholder translated to a minted id. Returns the input unchanged when no placeholder is present, so the common path costs one predicate over the array.
- Assumed by: Task 3 (its failure branch).

**Failure half:** an order containing no placeholder → returned unchanged, nothing stamped, no write. An entity that cannot be stamped because it is Unknown → it stays a placeholder, and Task 3 makes that a refusal rather than a narrowed write. An empty order array → returned unchanged, no folder read. The nexus root as the folder (the `collection_order` case) → its children are root folders, not pages; confirm the enumeration is kind-correct rather than assuming `.md`.

**Negative control:** the test proving a never-edited page keeps its drop position must go red with the stamper call removed. Separately, a test must prove the stamper does **not** run when the order holds only real ids — red if the call is made unconditionally.

**Must agree:** the stamper and `stampAdopted` must reach the same decision about the same entity. A folder this task stamps must be one `stampAdopted` would also stamp, and vice versa. One test crosses both against the same fixture.

**Survivors:** `stampAdopted`'s open-time pass stays. It is not redundant — it heals a vault in one sweep where this path heals one folder on demand.

**Steps:**
- [ ] Re-derive the `persistable` count against its control. A divergence rewrites this task.
- [ ] Read `adopt.ts` whole, including `ensureFolderId` and the private stampers.
- [ ] Write the failing tests: never-edited page keeps its dropped position · sidecar-less folder gains one and its page order persists · an all-real-ids order stamps nothing. Run — expect red.
- [ ] Implement `ensureOrderIds`; wire it into the three order writers.
- [ ] Delete `persistable` and its call sites. Re-run the derivation — expect 1.
- [ ] Full gate. Commit: `fix(reorder): identity is guaranteed before an order is written`

#### Task 3: An order write that persists nothing says so

**Requirement:** 2

**Why:** Three layers currently report success while doing nothing, which is why this class survived so long: `setChildOrder` returns success when it finds no sidecar to write into, and `mutate.ts` discards that reply for both `movePage` and `moveSet`. The best-effort intent behind the discard is correct — reporting a completed move as failed leaves the renderer showing a page where it no longer is — but folding "moved and ordered" and "moved, order lost" into one reply destroys the distinction. `crud/views.ts`'s `reorderViews` is the house pattern: a missing sidecar is an explicit not-found, never a success. Converge on it.

**Files:**
- Modify: `Pommora/src/main/crud/reorder.ts` — `setChildOrder`'s no-sidecar branch.
- Modify: `Pommora/src/main/mutate.ts` — the `movePage` and `moveSet` arms; stop discarding the order result and report the two outcomes distinctly.
- Read first: `Pommora/src/main/crud/views.ts` — `reorderViews`, the pattern being adopted.
- Modify: `Pommora/src/shared/mutate.ts` if the reply shape needs a field to carry partial success.
- Test: `Pommora/src/main/crud/reorder.test.ts`.

**Failure half:** a move that succeeds with a failed order write → the move is still reported as succeeded, with the order failure carried alongside; the renderer must not treat it as a no-op. A folder that genuinely has no sidecar after Task 2 ran → this should now be unreachable for a stamped tree; if it is reachable, that is a Task 2 defect, not a case to guard here.

**Negative control:** the test asserting a sidecar-less folder now fails must go red when the old success branch is restored.

**Steps:**
- [ ] Read `crud/views.ts`'s `reorderViews` and match its refusal shape.
- [ ] Write the failing test: order write with nowhere to land returns a failure, not success. Run — expect red.
- [ ] Implement in `reorder.ts`.
- [ ] Change `mutate.ts`'s two arms to carry the order outcome without failing the move. Check the renderer's consumer of that reply — a new failure field nothing reads is dead weight; wire it or don't add it.
- [ ] Full gate. Commit: `fix(reorder): a write that persists nothing reports it`

#### Task 4: A same-parent page reorder previews immediately

**Requirement:** 3

**Why:** `relocateNodeInTree` returns null when the parent is unchanged, so a same-folder page reorder produces no optimistic patch and the row snaps back until the confirming vault walk lands. The `moveSet` arm directly above it already solves this and carries the comment explaining why; pages never received the same treatment. This is what makes a working drop *look* like a failed one, and it is the half of the symptom that Tasks 1–3 do not address. It closes the hazard window opened at Task 1.

**Files:**
- Modify: `Pommora/src/renderer/src/treeMove.ts` — `reorderChildrenInTree` reorders a container's `sets` only; it needs the pages half.
- Modify: `Pommora/src/renderer/src/store.ts` — the `movePage` arm of the optimistic patch. Consider collapsing `movePage` and `moveSet` into one arm if their shapes converge; do not force it if they don't.
- Test: `Pommora/src/renderer/src/treeMove.test.ts` if it exists — check before creating.

**Failure half:** an order naming an id the container doesn't hold → ignored, the rest still order. A container holding both pages and sets with one order array → confirm which collection the array addresses; a page order must not reorder folders. An empty order → tree returned unchanged, not emptied.

**Must agree:** the optimistic patch and `resolveOrder` in `main/order.ts` must produce the same sequence from the same order array — including the tail rule for entities the array doesn't name. **They diverge today, and the divergence is invisible to the obvious test.** `resolveOrder` title-sorts the unlisted tail; `treeMove.ts`'s `byOrder` gives every unlisted entity the same sort key, so a stable sort leaves them in their current relative order. With one unlisted entity the two agree and a parity test passes vacuously — the divergence needs **two or more**. Fix the comparator in `byOrder` rather than the read path, and write the crossing test with at least two unlisted entities.

**Adjacent gap, same arm:** a drop-at-position into a *different* folder has the same symptom. `relocateNodeInTree` appends the node to the destination's end and no order patch follows, so the row jumps once when the walk lands. Requirement 3 names same-parent only, but `moveSet`'s arm already handles both cases — collapsing the two arms fixes the cross-parent case for free. Do that if their shapes converge; note it and leave it if they don't.

**Steps:**
- [ ] Read `treeMove.ts`'s `reorderChildrenInTree` and `byOrder`, and `main/order.ts`'s `resolveOrder`.
- [ ] Write the failing test: a same-parent page reorder patches the tree; the patched sequence matches what `resolveOrder` produces from the same array. Run — expect red.
- [ ] Implement the pages half, then the store arm.
- [ ] Full gate. Commit: `fix(sidebar): a page reorder previews the way a folder reorder does`

#### Gate 1 — the reorder persists and responds
- [ ] Gate commands green from `Pommora/`, exit codes read directly, never piped.
- [ ] `persistable` derivation re-run against its control: expect 1, control 11.
- [ ] Every task that diverged had its dependents re-derived and rewritten.
- [ ] `code-simplifier` and `/code-review` dispatched against `<base>..HEAD` scoped to `Pommora/src/main` and the two renderer files; reports cite files inside that range.
- [ ] Every concern fixed, or carrying an explicit user ruling recorded in the Log.
- [ ] **Hazard window closed at Task 4.** The acceptance criterion run against a scratch nexus — a page created outside Pommora after launch, dragged, and still in place after a restart.
- [ ] `ArchitecturePM.md`'s identity claim rewritten in the commit that falsified it.
- [ ] Progress hashes filled in.

---

### Phase 2 — Harden the skeleton, then migrate onto it

*Hardening precedes migration because the exposure scales with the number of consumers.*

#### Task 5: A gesture whose callback throws tears itself down

**Requirement:** 4

**Why:** `gesture.ts` holds one module-level `live` gesture and refuses a begin while it is set. `live` is cleared only inside `detach`, which is skipped if `onActivate` or `onDragMove` throws — so a single exception in any consumer's callback would refuse **every drag in the application** until the renderer reloads. Those callbacks do real work: rect loops, scroller resolution, snapshot measurement. Seven surfaces are exposed today and Tasks 6–8 add four more, so this is hardened before the migration rather than after it.

**This is hardening against an unobserved class, not a reproduced bug.** The mechanism is traced and real — the callbacks sit outside any `try`, and `live` nulls only after `teardown`, so a throwing teardown wedges it too — but nothing was found that actually throws. The change is a `try/finally` around three lines, which is proportionate either way. Do not describe it in the commit as a fix for an observed failure. One cheap confirmation before implementing: in the running app's console, throw from a consumer's `onDragMove`, then try to drag anything else.

**Files:**
- Modify: `Pommora/src/renderer/src/design-system/interactions/gesture.ts` — the `move` handler's calls into `spec.onActivate` and `spec.onDragMove`.
- Test: `Pommora/src/renderer/src/design-system/interactions/gesture.test.ts` — check whether one exists; `engine.test.ts` is the sibling if not.

**Failure half:** a throw in `onActivate` → teardown runs, `onAbort` fires, `live` is null, the next begin succeeds. A throw in `onDragMove` after activation → same. A throw inside `teardown` itself → `live` must still clear, or the hardening reintroduces the wedge it removes.

**Negative control:** the test proving a later gesture still begins after a throwing callback must go red with the hardening removed. It must also prove the *first* gesture's `onAbort` fired — a test that only checks the second gesture passes if the implementation swallows the error silently.

**Steps:**
- [ ] Read `gesture.ts` whole.
- [ ] Write the failing test: a consumer whose `onActivate` throws does not prevent a subsequent gesture; its own `onAbort` fires. Run — expect red.
- [ ] Implement. Keep the change to the teardown path only — do not alter activation semantics, capture timing, or the refusal rule.
- [ ] Full gate. Commit: `fix(interactions): a throwing callback cannot wedge the gesture singleton`

#### Task 6: The sidebar consumes the shared gesture skeleton

**Requirement:** 5

**Why:** `sidebarDnd.tsx` re-implements the entire lifecycle the skeleton owns — the pending→active machine, the window listener trio, Escape, deferred capture, and teardown — roughly a hundred lines with no capability the skeleton lacks. Beyond the duplication it carries two real defects the skeleton is immune to by construction: its unmount cleanup captures the mount render's closure, so a capture-phase scroll listener leaks when the contexts↔collections cross-fade unmounts a live drag; and its pointer-id guard returns without detaching on a mismatch, leaving the gesture wedged. `paneDnd.tsx` is the working precedent — the same scroll-dirty listener, added in `onActivate` and removed in `teardown`.

**Files:**
- Modify: `Pommora/src/renderer/src/Sidebar/sidebarDnd.tsx` — replace the lifecycle with `usePointerGesture`; move the scroll listener and autoscroll start into `onActivate`, their teardown into `teardown`. `computeTarget` and the commit derivation stay untouched in this task.
- Read first: `Pommora/src/renderer/src/Components/Detail/paneDnd.tsx` — the precedent.

*The per-layer index rescope moved out to Task 6b. It changes what the drop resolves against, which contradicts this task's own baseline invariant and would make any regression un-attributable — the same reason `computeTarget` is deferred to Task 9.*
- Test: `Pommora/src/renderer/src/Sidebar/sidebarDnd.test.tsx` (exists).

**Interfaces**
- Consumes: `usePointerGesture` from `design-system/interactions/gesture`.
- Assumed by: Task 9, which replaces `computeTarget`'s scan.

**Failure half:** a tree push arriving mid-drag → the snapshot dirties and re-measures, as today. A drop whose commit rejects → the gesture must still reset; the skeleton's ordering (teardown before `onDrop`) gives this for free. An unmount mid-drag → teardown runs from the skeleton's stored spec, not a captured render closure.

**Negative control:** a test proving the scroll listener is removed after an unmount-during-drag must go red against the current implementation. Confirm it does before the migration lands, not after.

**Survivors:** `computeTarget`'s five indicator conventions stay in this task. Collapsing them is Task 9, and doing both at once makes a behavioural regression impossible to attribute.

**Baseline invariant:** the suite's pass count and the lint warning count do not move. Drop behaviour is unchanged by this task.

**Steps:**
- [ ] Read `sidebarDnd.tsx` and `paneDnd.tsx` whole.
- [ ] Write the failing test for the listener leak. Run — expect red against today's code.
- [ ] Migrate the lifecycle. Re-run — expect green.
- [ ] Scope the per-layer index in `Sidebar.tsx`.
- [ ] Full gate; confirm the pass count moved only by the new test.
- [ ] Commit: `refactor(sidebar): the drag consumes the shared gesture skeleton`

#### Task 6b: Each sidebar layer indexes its own section

**Requirement:** 5

**Why:** `SidebarDnd` mounts twice — once for contexts, once for collections — and each builds a full-tree index even though each renders one half. During the mode cross-fade both are mounted, so two full indexes exist for the length of the transition. Split from Task 6 because it changes what `buildIndex` puts in `byId`, which is what every drop resolves against; bundled into a lifecycle migration it would make a behavioural regression impossible to attribute.

**Files:** `Pommora/src/renderer/src/Sidebar/Sidebar.tsx` · `Pommora/src/renderer/src/Sidebar/sidebarDndModel.ts` (`buildIndex`) · test at `Sidebar/sidebarDndModel.test.ts` (exists)

**Failure half:** a drop whose target lives in the other layer's half of the tree → must refuse rather than resolve against a missing entry. Confirm which cross-layer drops are reachable before narrowing the index; a Space and a Collection are never siblings, but a scoped index that drops a needed parent breaks the depth derivation.

**Negative control:** a test asserting the contexts layer's index holds no collection entries must go red against the current full-tree build.

**Baseline invariant:** drop behaviour unchanged. The suite's pass count moves only by the new test.

**Steps:**
- [ ] Read `buildIndex` and both mount sites.
- [ ] Write the failing test for the scoped index; run — expect red.
- [ ] Scope the build per layer; re-run.
- [ ] Full gate; drag in both sidebar modes in the running app.
- [ ] Commit: `perf(sidebar): each layer indexes its own section`

#### Task 7: The option and status reorder hooks consume the skeleton

**Requirement:** 5

**Why:** Both hooks re-implement the same lifecycle, including a hand-rolled capture-phase Escape that is precisely the skeleton's `swallowActiveEscape` flag, already consumed by `paneDnd`. Both leak the same scroll listener the sidebar does. **They are not merged with each other:** `ContextPM` records them as near-duplicates a merge would collapse, and that is wrong — one reorders a flat list, the other moves between groups including empty ones. They share the lifecycle, not the drop model. This task removes the shared half and records why the rest stays apart.

**Files:**
- Modify: `Pommora/src/renderer/src/Components/Detail/useOptionReorder.ts`
- Modify: `Pommora/src/renderer/src/Components/Detail/useStatusReorder.ts`
- Test: their existing test files — check which exist before creating.

**Survivors:** the two drop models stay separate. `useStatusReorder`'s group partition — which assigns every Y coordinate to exactly one group, including gaps and empty groups — has no counterpart in the flat hook and must not be flattened into one.

**Baseline invariant:** pass count and lint warnings unchanged.

**Steps:**
- [ ] Read both hooks whole and diff their drop models to confirm the separation is real.
- [ ] Migrate `useOptionReorder`; full gate; commit.
- [ ] Migrate `useStatusReorder`; full gate; commit.
- [ ] Commit message for the pair: `refactor(properties): the reorder hooks consume the shared gesture skeleton`

#### Task 8: The table's column drag consumes the skeleton

**Requirement:** 5

**Why:** Roughly thirty-five lines of duplicated lifecycle with nothing the skeleton lacks, and migrating gains it an Escape abort it does not currently have. `MarkdownPM/Tables/TableView.tsx` is the working precedent for the same interaction already on the skeleton. One finding rides along: the commit path's bounds check compares indices derived from the same frozen array they are checked against, so it can never fail — while the visual path guards the mid-drag column reshape correctly. Verify that against the code before acting on it; if confirmed, the commit should guard the same way the visual path does.

**Files:**
- Modify: `Pommora/src/renderer/src/Detail/Views/Table/TableView.tsx` — the column drag block only.
- Read first: `Pommora/src/renderer/src/MarkdownPM/Tables/TableView.tsx` — the precedent.
- Test: `Pommora/src/renderer/src/Detail/Views/Table/columnReorder.test.ts` (exists).

**Failure half:** a watcher reshaping columns mid-drag → the commit must not hand stale column ids to the reorder. Confirm the current behaviour first; if the bounds check is dead as suspected, its replacement needs a test that goes red without it.

**Survivors:** the 25px sticky zone and the span-containment slot rule stay. They are a deliberate rejection of closest-centre for columns of unequal width, and Task 9's resolver does not serve them.

**Baseline invariant:** pass count and lint warnings unchanged, except for a test added for the stale-id guard.

**Steps:**
- [ ] Open the column-drag block and the precedent.
- [ ] Verify the bounds-check claim against the code. Record the finding either way in the Log.
- [ ] Migrate the lifecycle; add the stale-id guard and its test if the finding holds.
- [ ] Full gate. Commit: `refactor(table): the column drag consumes the shared gesture skeleton`

#### Gate 2 — one lifecycle
- [ ] Gate commands green, exit codes read directly.
- [ ] Baseline invariant held: pass count and lint warnings unmoved except for tasks that added a test.
- [ ] `code-simplifier` and `/code-review` dispatched against `<base>..HEAD` scoped to the touched paths.
- [ ] Every concern fixed or ruled on.
- [ ] The sidebar, property panes, and table columns seen dragging in the running app.
- [ ] `PommoraDND.md`'s consumer account rewritten in the commit that falsified it.
- [ ] Progress hashes filled in.

---

### Phase 3 — One geometry, one chrome

#### Task 9: One slot resolver

**Requirement:** 6

**Why:** Ten surfaces independently answer "which boundary is the pointer nearest." No shared abstraction exists — only a shared type and a half-step that splits an already-chosen row. Six surfaces can delegate the scan and keep only what is genuinely theirs: the sidebar's five indicator conventions collapse to one, and its per-pointermove sibling filter goes with them. The resolver returns a boundary rather than a slot index, because the insertion-line surfaces deliberately do not carry a slot-rect model and forcing one on them would invent geometry to fit an abstraction.

**Files:**
- Create: `Pommora/src/renderer/src/design-system/interactions/slots.ts` — `slotAtY(rows, y, opts)`, pure, no React, no DOM. Hoist `MeasuredRow` here from `Sidebar/sidebarDndModel.ts`.
- Modify: `Sidebar/sidebarDnd.tsx` + `sidebarDndModel.ts` · `Components/Detail/paneDndModel.ts` · `Components/Detail/useOptionReorder.ts` · `Components/Detail/useStatusReorder.ts` · `Detail/Views/Table/tableDnd.tsx` · `Detail/Views/Table/bandDndModel.ts`
- Create: `Pommora/src/renderer/src/design-system/interactions/slots.test.ts`

**Interfaces**
- Produces: `slotAtY(rows: MeasuredRow[], y: number, opts?: { lineAt?: 'edge' | 'gap'; exclude?: string }): { index: number; beforeId: string | null; lineY: number }`
- `lineAt` covers the two real conventions: a row edge (sidebar, table, pane) and a gap midpoint (option, status). `exclude` skips the dragged id in-scan rather than at measure time.

**Failure half:** an empty rows array → a boundary of index 0 with a caller-supplied fallback, never a crash. The pointer above the first row → boundary 0, not a clamp onto row 0. Below the last row → the trailing boundary. The excluded id being the only row → same as empty.

**Must agree:** the resolver's boundary and each caller's commit derivation must agree about what "before" means. A boundary index that disagrees with the caller's `nextOrder` produces an off-by-one that only appears at the ends of a list. One test per adopting surface crosses both.

**Survivors:** five surfaces keep their own geometry and must not be pulled in — `group.tsx` (row-bucketing then X ordering within a row), `engine.tsx` (closest-centre over a full rect set, driving a displacement preview), `SurfacePM` (computed, not measured; 2-D edges), the column drag (X axis, sticky zone), and the MarkdownPM drags (document offsets, viewport-only candidates). The sidebar's indicator `left` also stays its own — it is derived from the resolved target's tree depth, which no shared resolver can own.

**Baseline invariant:** pass count and lint warnings unmoved except for `slots.test.ts` and the per-surface crossing tests.

**Steps:**
- [ ] Write `slots.test.ts` against the intended signature, including every degenerate case. Run — expect red, module not found.
- [ ] Implement `slots.ts`. Re-run — expect green.
- [ ] Adopt one surface at a time, full gate after each, commit per surface.
- [ ] Sidebar last — it is the largest change and the one whose five conventions collapse.
- [ ] Commit: `refactor(interactions): one slot resolver for six surfaces`

#### Task 10: One snapshot helper

**Requirement:** 6

**Why:** Six files write the same measure-once-and-invalidate six-liner. One of them — `groupingDnd.tsx` — measures at activation and never invalidates at all, so a scroll mid-drag leaves it resolving against stale rects; adopting the helper closes that for free rather than as a separate fix.

**Derivation**
- `rg -F "snapshotDirty" -l Pommora/src` → **6** files at planning time. After: 0 outside the helper.
- Control: `rg -F "useRef" -l Pommora/src/renderer/src` → **66** files. Zero means the search never ran.

**Files:**
- Create: `Pommora/src/renderer/src/design-system/interactions/snapshot.ts` — `useDragSnapshot<T>(take: () => T | null)` returning `{ get, markDirty }`.
- Modify: the six holders named by the derivation, plus `Components/Detail/groupingDnd.tsx`, which has the pattern's absence rather than its presence.

**Failure half:** `take` returning null (a ref not yet attached) → `get` returns null and the caller declines the resolve; it must not cache null as a valid snapshot.

**Steps:**
- [ ] Re-derive against the control.
- [ ] Implement the helper with its test.
- [ ] Adopt per file, full gate after each.
- [ ] Add invalidation to `groupingDnd.tsx`, which never had it.
- [ ] Commit: `refactor(interactions): one snapshot helper, and the pane that never invalidated`

#### Task 11: The duplicated pane model calls its original

**Requirement:** 6

**Why:** `hiddenPaneModel.ts` holds a five-line verbatim copy of `paneDndModel.ts`'s row scan. After Task 9 both delegate to the resolver, so this is the residue task that removes what the deletions leave behind.

**Files:** `Pommora/src/renderer/src/Components/Detail/hiddenPaneModel.ts` · `paneDndModel.ts`

**Steps:**
- [ ] Confirm both now delegate to `slotAtY`; remove the duplicated remainder.
- [ ] Full gate. Commit: `refactor(properties): the hidden pane stops re-deriving its neighbour`

#### Task 12: The sidebar's chrome comes from the design system

**Requirement:** 7

**Why:** The sidebar re-authors both the drag ghost and the drop line as literals — a padding, radius, colour-mix, blur and shadow that transcribe an existing stylesheet rule, and a thickness, dot size and colour that are exactly three existing tokens. Because it spells `var(--accent)` directly rather than the drag-line token that is *defined* as `var(--accent)`, re-theming the drag line silently skips the sidebar. Two other surfaces inline the shared ghost component rather than importing it. This is the standing prohibition in `Design-Sources.md`, three times over.

**Files:**
- Modify: `Sidebar/sidebarDnd.tsx` — ghost and line onto `DragGhost` and the shared line class.
- Modify: `Components/Detail/paneDnd.tsx` · `Detail/Views/Table/bandDnd.tsx` — import `DragGhost` instead of inlining it.
- Read first: `Components/Detail/DragGhost.tsx` · `Detail/Views/Table/Table.css` · `design-system/tokens/theme-vars.css.ts`

**Derivation**
- `rg -F "band-drag-ghost" -l Pommora/src/renderer/src` → **4** at planning time: the component, its stylesheet, and two inline copies. After: 2. The sidebar does not appear in this search because it re-derives the visual without the class — a search that would have missed it, which is why the file list above is explicit rather than derived.

**Survivors:** the sidebar's asymmetric right inset on the drop line is a real difference from the shared inset. Keep it, as a named constant rather than a literal.

**Baseline invariant:** no visual change intended. Screenshot the sidebar drag before and after.

**Steps:**
- [ ] Read the three sources before writing anything.
- [ ] Adopt `DragGhost` in `paneDnd` and `bandDnd`; gate; commit.
- [ ] Move the sidebar's ghost and line onto the shared component, class, and tokens; gate.
- [ ] Screenshot the sidebar mid-drag and compare against the before shot.
- [ ] Commit: `refactor(sidebar): the drag chrome comes from the design system`

#### Task 13: The scattered drag constants come home

**Requirement:** 6, 7

**Why:** A ghost cursor offset is spelled at five call sites with a sixth variant in the sidebar; a second activation tier lives inside `group.tsx` where no other surface can adopt it; a dwell-remeasure timer waits 250ms for a 180ms animation. Each is small; together they are why two surfaces can drift apart without either being wrong.

**Files:** `design-system/interactions/shared.ts` · `group.tsx` · `dragDisclose.ts` · the five ghost call sites · `Tabs/TabBar.tsx`

**Survivors:** the column drag's sticky-zone constant stays a tunable with its KNOB comment; re-site it beside its siblings, do not fold it into one of them. `dragDisclose`'s dwell stays service-owned.

**Steps:**
- [ ] Hoist the ghost offset; prefer absorbing it into `DragGhost` so callers pass raw pointer coordinates.
- [ ] Move the second activation tier to `shared.ts`.
- [ ] Derive the dwell remeasure from the disclosure duration token, as `pageEditor.ts` already does.
- [ ] Full gate. Commit: `refactor(interactions): the drag constants come home`

#### Task 14: The card engine stops rebuilding its row model per move

**Requirement:** 8

**Why:** `rowsOf` runs inside the hit-test on every pointer move — a map, filter, sort and row-bucketing pass over the zone's rects, per event. Its result depends only on the frozen rects and the skipped index, so it can be computed once per zone at activation. This is the project's own hard rule against O(N) allocating work on a high-frequency trigger, and it is larger than the `cellAt` case `ContextPM` names beside it.

**Files:** `Pommora/src/renderer/src/design-system/interactions/group.tsx` — `rowsOf`, `indexAt`, `trackAt`, and `cellAt`.

**Survivors:** `group.tsx`'s gesture lifecycle stays hand-rolled. This task touches its geometry caching only.

**Baseline invariant:** card drag behaviour unchanged. Pass count and lint warnings unmoved.

**Steps:**
- [ ] Read `group.tsx`'s zone entry and hit-test path.
- [ ] Cache the row model beside the frozen rects, keyed per zone; invalidate where the rects invalidate.
- [ ] Hoist `cellAt`'s per-call rebuild the same way.
- [ ] Full gate; drag cards in the running app and confirm no behaviour change.
- [ ] Commit: `perf(interactions): the zone's row model is computed once, not per move`

#### Gate 3 — one geometry, one chrome
- [ ] Gate commands green, exit codes read directly.
- [ ] Both derivations re-run against their controls.
- [ ] Baseline invariant held.
- [ ] `code-simplifier` and `/code-review` against `<base>..HEAD`.
- [ ] Every concern fixed or ruled on.
- [ ] Sidebar, property pane, table, and cards all seen dragging in the running app; sidebar chrome compared against its before-shot.
- [ ] `ContextPM`'s two corrected claims rewritten in the commits that falsified them.
- [ ] Progress hashes filled in.

---

### Phase 4 — Close the adoption gaps

*Additive and user-visible. Every task here is a call to a service that already ships.*

#### Task 15: The sidebar springs open a collapsed container

**Requirement:** 9

**Why:** The spring-open service is engine-agnostic by construction — a drag engine brackets its gesture, and a collapsed header registers itself, neither knowing about the other. Tables and cards use it. The sidebar participates on neither end, so dragging a page over a collapsed Collection or Set hovers indefinitely and the user must abort, expand, and start again. The sidebar tree is the surface where spring-loading matters most.

**Files:**
- Modify: `Sidebar/sidebarDnd.tsx` — bracket the gesture, dirtying the snapshot on disclose.
- Modify: `Sidebar/Sidebar.tsx` — register the `Disclosure` header as a target while collapsed.
- Read first: `Detail/Views/GroupBand.tsx` — the only existing registrar; mirror its guard.

**Failure half:** a container that expands mid-drag → the snapshot must dirty, or the drop resolves against rows that have moved. Dragging a container over its own collapsed self → the existing cycle guard in `computeTarget` still refuses; confirm the spring-open does not bypass it.

**Negative control:** the test proving a collapsed container expands on dwell must go red with the registration removed.

**User-visible sweep:** the expanded container must stay expanded after the drop, or the user loses the place they just navigated to. Confirm this against the running app rather than asserting it.

**Steps:**
- [ ] Read the existing registrar and the service.
- [ ] Bracket the sidebar gesture; register the collapsed header.
- [ ] Full gate; drive it in the running app on a scratch nexus.
- [ ] Commit: `feat(sidebar): a collapsed container springs open on drag-over`

#### Task 16: The table's band drag springs open too

**Requirement:** 9

**Why:** Within one table view, dragging a row springs collapsed bands open and dragging a band does not. Three lines, mirroring the sibling in the same folder.

**Files:** `Detail/Views/Table/bandDnd.tsx` · read first `Detail/Views/Table/tableDnd.tsx`

**Steps:**
- [ ] Mirror the sibling's bracketing. Full gate. Seen running.
- [ ] Commit: `feat(table): a band drag springs collapsed bands open`

#### Task 17: Four trapped surfaces gain edge auto-scroll

**Requirement:** 10

**Why:** Option reorder, status reorder, the grouping pane, and the table's column drag each drag inside a scrolling region and none drives a scroll. The status pane's region is explicitly height-capped with overflow, so the scroller demonstrably exists; the table h-scrolls by construction, so a column cannot be dragged past the visible edge of a table wider than its viewport — which is most tables.

**Files:** `Components/Detail/useOptionReorder.ts` · `useStatusReorder.ts` · `groupingDnd.tsx` · `Detail/Views/Table/TableView.tsx` (column drag, `axis: 'x'`)

**Failure half:** a surface whose scroller cannot be resolved → no loop starts, drag still works within the viewport. Never a crash, never a silent no-op that looks like a frozen drag.

**Steps:**
- [ ] Adopt per surface, full gate after each, commit per surface.
- [ ] Drive each in the running app — a drag must reach an item below the fold.
- [ ] Commit: `feat(interactions): four drag surfaces gain edge auto-scroll`

#### Task 18: The silent insertion-line surfaces announce

**Requirement:** 10

**Why:** The sidebar announces pickup and drop; the other five insertion-line surfaces say nothing. Cheap, additive, and it brings them to a standard already shipped rather than inventing one.

**Files:** `paneDnd.tsx` · `bandDnd.tsx` · `tableDnd.tsx` · `groupingDnd.tsx` · `useOptionReorder.ts` / `useStatusReorder.ts`

**Survivors:** the instructions-text half of the accessibility service stays with the single-zone engine. It describes space-to-lift and arrow-to-move, and attaching it to a pointer-only handle would advertise a keyboard affordance that does not exist.

**Steps:**
- [ ] Adopt `announce` per surface. Full gate. Commit: `feat(a11y): every insertion-line drag announces its pickup and drop`

#### Gate 4 — the adoption gaps close
- [ ] Gate commands green including `npm run build`.
- [ ] Every Phase 4 surface driven in the running app on a scratch nexus.
- [ ] `code-simplifier` and `/code-review` against `<base>..HEAD`.
- [ ] Every concern fixed or ruled on.
- [ ] Closing sweep: `persistable` derivation returns 1 against its control of 11.
- [ ] Progress hashes filled in.

---

## Implementation Log

### Progress

- [ ] **Phase 1** — The saving path · base `<commit>`
  - [ ] Task 1 — A page write governs its identity key · `<commit>`
  - [ ] Task 2 — The order path guarantees identity, and `persistable` deletes · `<commit>`
  - [ ] Task 3 — An order write that persists nothing says so · `<commit>`
  - [ ] Task 4 — A same-parent page reorder previews immediately · `<commit>`
  - [ ] Gate 1
- [ ] **Phase 2** — Harden the skeleton, then migrate onto it
  - [ ] Task 5 — A gesture whose callback throws tears itself down
  - [ ] Task 6 — The sidebar consumes the shared gesture skeleton
  - [ ] Task 6b — Each sidebar layer indexes its own section
  - [ ] Task 7 — The option and status reorder hooks consume the skeleton
  - [ ] Task 8 — The table's column drag consumes the skeleton
  - [ ] Gate 2
- [ ] **Phase 3** — One geometry, one chrome
  - [ ] Task 9 — One slot resolver
  - [ ] Task 10 — One snapshot helper
  - [ ] Task 11 — The duplicated pane model calls its original
  - [ ] Task 12 — The sidebar's chrome comes from the design system
  - [ ] Task 13 — The scattered drag constants come home
  - [ ] Task 14 — The card engine stops rebuilding its row model per move
  - [ ] Gate 3
- [ ] **Phase 4** — Close the adoption gaps
  - [ ] Task 15 — The sidebar springs open a collapsed container
  - [ ] Task 16 — The table's band drag springs open too
  - [ ] Task 17 — Four trapped surfaces gain edge auto-scroll
  - [ ] Task 18 — The silent insertion-line surfaces announce
  - [ ] Gate 4

### Rulings

### Open Against Later Tasks

- **Task 8** carries an unverified finding: the column drag's commit-path bounds check may be dead code that permits stale column ids where the visual path guards correctly. Verify before acting; record the outcome either way.
- **Task 9's signature forecloses what Sequenced After claims it enables.** A Y-only `slotAtY` shared by six callers makes adding a horizontal/depth term *harder*, not easier — the signature and six crossings all move. Either widen it now with an optional `x` five callers ignore, or correct the Sequenced After entry to say Task 9 does not help. Decide when Task 9 opens; do not leave both claims standing.
- **Task 13's ghost-offset fold does not fit the sidebar.** The plan proposes absorbing the constant offset into `DragGhost` so callers pass raw pointer coordinates, but the sidebar's offset is a per-drag measured grab point, not the shared constant. Fold the five that share the constant; leave the sidebar's measured offset at its call site.
- **Task 6b's index narrowing needs its reachable cross-layer drops enumerated** before the scope is cut. A scoped index that drops a parent the depth derivation needs is a silent wrong-depth bug, not a crash.

### Pending Rulings *(these gate the tasks that carry them)*

- **Task 2 — stamping scope on a reorder.** The order array is the full sibling group, so one drag in a folder of twenty id-less pages writes twenty files the user never touched. That contradicts this plan's own Shapes disclosure ("no existing file is touched until the user edits or moves it"). Either restate the disclosure honestly or scope the stamp to the dragged entity alone — which reopens the question of what happens to its unstamped siblings in the same array. **Nathan's call, before Task 2 opens.**
- **Task 3 — what the renderer does when a move lands and its order does not.** Requirement 2 says an order write persists everything or fails and says so, but nothing defines the user-visible behaviour for the partial case. That is an interaction decision under the project's *Ask before designing* rule. **Nathan's call, before Task 3 opens** — or drop the partial-success field and keep Task 3 to the `setChildOrder` refusal alone.
- **Phase order.** Written correctness-first. The user leaned drag-first. The attack review found no coupling between the phases in either direction and backed correctness-first on the verification argument: Task 9's acceptance is "the drop lands where the line promised," which cannot be judged against a layer that silently discards entries. **Nathan's call before Phase 1 opens.**

### Deviations

### Lessons

### Sequenced After

- **`feel.tsx`'s adopt-or-delete decision.** The animation-feel context is consumed by both engines and provided nowhere outside the component showcase, so both always read the default. SurfacePM delivers the same value as a prop instead — two parallel delivery paths for one setting. Either wrap the app shell in a provider and let SurfacePM read context, or delete the context and make it a prop everywhere. A product call, not a build.
- **The MarkdownPM drag migration**, blocked on an `onTap` callback fired on a sub-threshold release and silent on Escape or cancel. Additive and small, but it should land with the migration that consumes it rather than before.
- **The sidebar's horizontal drop aim.** The resolver reads only the vertical axis, so a page's landing depth is decided by the row it is over rather than by moving right. Task 9 makes this changeable by giving the sidebar one convention instead of five; whether it *should* change is a design decision, not a defect.
- **The remaining silent-failure sites** the commit survey found outside this plan's scope — view persistence, manual row order, and dashboard layout each discard their result envelope. `ViewPane.onDrop` is the convergence pattern.

### Closeout
