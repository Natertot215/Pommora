## Creation Affordances — Plan

**Status:** ratified — in execution (Nathan's go, 08-11-2026)
**Spec:** `Planning/Creation Affordances — Decision Log.md` — the ratified decision log; every task's semantics trace to its entries (cited as A-1…E-3). The log is the tiebreaker for anything this plan under-specifies.

### Goal

In-view page creation, TableView first. One act everywhere: on click the page exists — created on disk as Untitled with its seeds and order written, an ordinary pipeline row from frame one — and its title opens as an ordinary uncommitted rename whose field is empty. The triggers: the group-band "+", New Page Above / Below on a new grip right-click menu and on sidebar pages, and a hover-dwell ghost row. Alongside: the all-surface label renames (Open New Tab · Open Preview), the empty-field rename style unified across every create path, and the `--state-inactive` token minted with its six waiting sites converted.

The approach was ratified through the decision log's two adversarial rounds; the alternatives weighed (a draft-row state machine, ghost-first creation, suppressing menu items under sorts) are recorded in its Considered & Rejected. This plan deliberately does not build: CardView creation chrome, the property-bucket "+", or any dedicated creation button (Prospects / Out of Scope).

**Acceptance criterion (end-to-end):** In a running dev instance, each trigger — band "+", grip-menu Above/Below, sidebar-menu Above/Below — produces a page that is on disk as markdown, stamped with its birth context, placed at the gesture position (or the pipeline's honest position where the log says so), with the title field open, empty, caret drawn; typing "X" then Enter renames the file on disk to X with zero full-nexus cascade walks; Esc or click-off untouched leaves "Untitled". No single task's green proves this — Task 5.0 owns verifying it whole.

### Grounding

All claims below were verified against code during the brainstorm's two attack rounds (08-10/08-11). Re-derive any moved line numbers before editing; cited symbols are the anchors, not the numbers.

- `shared/mutate.ts` — `createPage` op `{op, parentPath, name}`; `MutateReply = Result<{created?: {id, path}}>`; `DEFAULT_NEW_NAME`; `containerCreators`.
- `main/mutate.ts` — `createPage` arm (~193) calls `createPage(parent, name)` with no options; `rename` arm (~230) runs `renameCascade(root, oldTitle, req.newName)` + `rewriteBlockConnections`, returns `ok({})` discarding the landed path; `setProperty` arm (~536) is the definition-resolving pattern; same-parent `movePage` (~547) is a bare `setChildOrder(dst,'page_order', order)`.
- `main/crud/page.ts` — `createPage` writes identity keys only; `renamePage` rejects a colliding target; `createDisambiguated` (main/mutate.ts ~168) is the create-side collision rule.
- `renderer store.ts` — optimistic create ships: `insertCreatedInTree` + `onCreated` fire before `load()` (~1509-1519); `mutate(req, onCreated?)` signature exists; `beginRename`/`renamingPath` (~1383); `createFromMenu` (~1378).
- `TableView.tsx` — `values` + `valueOverride`/`patchBandValue` (~140-158, ~1258); `viewOrders` local state written only at container open (F1: the `.set` at ~1329 never updates it); reorder writers (~1315-1330); `openCellMenu` (~932); `commitEditorText` gate `trimmed && trimmed !== row.title` (~753); grip markup (~1685); `toggleCollapse` (~1405).
- `pipeline/sort.ts` — `viewOrders` is the lowest-priority tiebreaker, absent rows rank last; absent select/status rank last, absent number/date rank first ascending.
- `GroupBand.tsx` (~257) — the "+" with no `onClick`, outside the collapse `Reveal`; `TableGroupBand.tsx` holds `setPath`; `cardsBand.ts` gates `showAdd`.
- `reassign.ts` — `groupKeyToValue(groupKey, type)`.
- `PropertyEditing/PropertyEditor.tsx` — controlled, autoFocus, unmount-flush, `stopPropagation` on every keydown, Escape → cancel.
- `Components/RenamableLabel.tsx` / `EditableInput.tsx` — the sidebar rename; commit guard `next && next !== value ? onCommit : onCancel`; `renames="row"` selects-all.
- `shared/pageMenu.ts` + `main/cellMenu.ts` — `pageMetaMenuItems` feeds title-cell + card menus; `popCellMenu` renders the model generically; renderer routers are if/else chains.
- `main/contextMenu.ts` — sidebar menu, main-side, fire-and-forget; pushes `begin-rename` (bridge `Pushes`, `open-in-new-tab` the shape precedent).
- `main/order.ts` + `crud/reorder.ts` — absent ids resolve into an alphabetical tail; order writes replace wholesale → every write carries the container's full membership.
- `autoscroll.ts` — `scrollGlide(scroller, to, params, onArrive)`, thunk destination re-read per frame.
- `nativeCaret.ts` — draws over any focused `input:not([type])`; `.property-editor` matches.
- Six sites marked `Awaiting proper inactive state token` read `--label-tertiary` (ContextPM debt item).

**Forced By:** Main owns the filesystem — every write crosses the bridge; renderer-side key building is forbidden. IPC returns Result envelopes, channels declared once in `bridge.ts`. No two writers for one thing — extend `pageMetaMenuItems`, the optimistic create, and the existing order writers; never duplicate them. No expensive work per-trigger — the first commit must not inherit the full-nexus rename cascade (A-5). Right-click = native menu, click = in-house (two-surfaces law) — the grip menu is native.

**Work shapes:** Additive (new behavior → failing test first) · Fix-adjacent (the `viewOrders` local-state gap repairs an existing staleness — sibling sweep: the drag path consumes the same fix) · User-visible (interaction sweep ran in the log; inverses and reachability are decided there).

**Blast radius:** `TableViewPM` (grip menu, band-add, in-birth rename, ghost row) · `ViewsPM` (Pending §Group-band creation restates) · `CardViewPM` (Pending §Heading "+" creation — its premise dies) · `SidebarPM` (menu pair) · `NavigationPM`/`PagePreviewPM`/`ConnectionsPM` (label prose) · `PagesPM` ("a colliding rename is rejected" carves the create-origin exception) · `DesignSystemPM` (the state table's Inactive row) · ContextPM's debt line for the inactive token and its Pending Focuses creation item · the two label-pinning tests and the one test name.

### Global Constraints

- Gates from `Pommora/`: `npm run typecheck && npm run lint && npm run test` — run with `&&`, read the summary lines, never trust a piped exit code. A red gate blocks the phase commit, no exceptions.
- Biome's hook formats on write — an Edit failing on whitespace means re-read and retry; never hand-align.
- Comments minimal, why-only; `KNOB` markers are functional and survive every pass.
- Explicit-path staging on every commit. Never `git add -A`.
- **CDP sandbox:** at launch, confirm which nexus the dev instance opened (read the window's root via CDP); all CDP work happens inside one run-created throwaway Collection regardless — never against Nathan's real containers. Teardown: delete the Collection through the app (one bundle, its own sidecar dies with it), then remove exactly that bundle's directory under `<root>/.trash/` — a path-guarded removal that first reads the bundle's `_record.json` and confirms it names the throwaway Collection; nothing else in `.trash` is ever touched. `nexus.db` rows keyed to the dead ids are device-local cache, invisible in the vault, and stay. Kill every dev/test instance when done.
- Overnight protocol: no user questions mid-run. Ambiguity resolves against the decision log; a genuine gap takes the smallest log-consistent choice, recorded in Deviations and surfaced in the final report. Blockers that survive that (a broken toolchain, a red gate no fix clears) stop the run with state committed and the report written to where it stopped.

### Phase 1 — The Creation Engine (shared + main)

**Task 1.1 — `createPage` carries seeds and order.**
*Why:* A page must never exist unstamped or unplaced (A-2, B-5) — a second write leaves a vanish window, and two mutates fire two reloads with a visible tail-flash between them.
*Files:* `shared/mutate.ts` (op shape), `main/mutate.ts` (createPage arm), `main/crud/page.ts` (writer), `shared/schemas.ts` (only if the op shapes are zod-validated there — check first).
*Steps:*
1. Widen the `createPage` op with optional `seeds: Record<propertyId, PropertyValue>` and `order: string[]` — the parent's full `page_order` carrying one `NEW_PAGE_SLOT` sentinel (a shared constant beside `DEFAULT_NEW_NAME`) that main substitutes with the created id.
2. The main arm resolves definitions per the `setProperty` pattern, stamps seeds in the same write the page is born in, and applies the order via `setChildOrder` in the same dispatch. Foreign keys preserved (existing writer discipline).
3. Failing test first: create with seeds → file frontmatter holds them; create with order → `resolveOrder` places it; colliding name → disambiguates with seeds intact. Failure half: a seed naming a dead property is dropped, not fatal; empty seeds behave as today.
*Interfaces:* the widened op shape + reply, stated in the code where both sides derive from `bridge.ts`. Assumed by every later create call site.

**Task 1.2 — The create-origin rename.**
*Why:* The first commit is part of the creation (A-4, A-5): it must auto-disambiguate instead of rejecting, skip the full-nexus link cascade (a just-created page has no inbound links; an unguarded cascade on "Untitled" can rewrite unrelated links), and report the landed name.
*Files:* `shared/mutate.ts` (rename op + reply), `main/mutate.ts` (rename arm), `renderer store.ts` (`submitRename` and the optimistic patch consuming the reply).
*Steps:*
1. Add `fromCreate?: true` to the rename op; the reply gains the landed `{path, name}` (today's arm returns `ok({})`).
2. Under `fromCreate`: disambiguate the target the way `createDisambiguated` does, skip `renameCascade` + `rewriteBlockConnections` entirely.
3. All consumers — the optimistic tree patch, any cascade, the caller — use the landed name from the reply, never the requested one.
   (`createDisambiguated`'s loop logic transfers, but its `attempt` signature returns `{id, path}` while `renamePage` returns `{path}` — implement the suffix loop in the rename arm rather than widening the shared helper.)
4. Tests: `fromCreate` collision lands disambiguated; **negative control:** an ordinary rename still cascades (test goes red with the skip applied unconditionally); the reply's landed name is what the tree shows.
*Must agree:* the disambiguated name main lands and the row title the renderer displays — one test crosses the IPC boundary.

**Phase gate:** simplifier on the phase diff → gates green → commit (explicit paths).

### Phase 2 — The Table Surfaces

**Task 2.1 — Band-add.**
*Why:* The band "+" is the feature's front door (A-1, B-4, E-1): structural Set headers only, creating in that Set, at the pipeline's end of the group, autoscrolled, field open empty.
*Files:* `GroupBand.tsx` (add `onAdd` prop; button gains `onClick`), `TableGroupBand.tsx` (supply the handler from `setPath`), `TableView.tsx` (the create handler + editor open + scroll), `reassign.ts` untouched (structural bands stamp location, not a value; filter implications ride 2.4's derivation).
*Steps:*
1. `onAdd` on `GroupBand`, wired only where the table passes it — Cards stays byte-identical (E-1).
2. Handler: if the band is collapsed, `toggleCollapse` first (B-4). Create via the widened op: `parentPath = setPath`, seeds = filter implications (Task 2.4's helper), order = **the create's parent container's** full membership (the Set at `setPath` — the same resolution the drag writers reach via `setPaths`; a Collection-wide array sent to a Set's sidecar would alphabetize the Set permanently) with the new page last in that group.
3. On `onCreated`: patch `valueOverride` with the seeds (B-6), open the title editor in create mode (empty initial — Task 2.5), `scrollGlide` to the row's resolved position via the thunk destination (never an assumed bottom).
4. Tests: the order array equals the parent container's own children (red if a Collection-wide array reaches a Set) — and the **negative control:** under an active filter, the array still contains the hidden rows' ids (red if built from visible rows).

**Task 2.2 — The grip menu.**
*Why:* The row's creation and meta actions live on the grip (D-1), on MarkdownPM's right-click-vs-drag model; today a grip right-click falls through to whatever cell hosts it.
*Files:* `shared/pageMenu.ts` (parameterize `pageMetaMenuItems` with an explicit item set per consumer — D-4), a new `shared/rowGripMenu.ts` model + `main/rowGripMenu.ts` + its own `row-grip-menu` bridge channel, `TableView.tsx` (grip `onContextMenu` + right-press defaulted away per [[Editor-Internals]] + action routing). The existing `gripMenu.ts`/`grip-menu` channel is MarkdownPM's block-grip menu — a shape precedent only, never widened with a row arm.
*Steps:*
1. Menu order exactly: Open Preview · Open New Tab — Rename · Change Icon — New Page Above · New Page Below — Delete. One definition composed from the meta block; title-cell and card menus keep their current item sets (their routers gain nothing inert).
2. Route every action: Open Preview opens the page-preview window for the row's page; Rename opens the title editor (ordinary mode); the New Page pair calls Task 2.3; Delete follows the existing delete path.
3. Right-press on the grip is defaulted away exactly as the editor's block grips do — the drag never arms from a right press, and the menu never seats a caret.

**Task 2.3 — New Page Above / Below (table).**
*Why:* Creation at a row's position, placed by seeds + order rather than machinery (B-1, B-5, B-8).
*Files:* `TableView.tsx` (handler), `pipeline/sort.ts` untouched (read-only understanding), `reassign.ts` (`groupKeyToValue` for the anchor's band).
*Steps:*
1. Seeds: the anchor's group value (via `groupKeyToValue` on its band) + the anchor's values on every active sort criterion — skipping multi-value properties and Title/Modified (B-1, B-8 accepted) — + filter implications (2.4).
2. Order: sorted/property-grouped views write `viewOrders` with the new id adjacent to the anchor **and update the local `viewOrders` state in the same motion** — the fix that also repairs the drag path's session staleness (B-5). Structural/flat views ride the create's own `order` array (full membership, gesture slot).
3. Open the editor in create mode; no autoscroll (the row is at the gesture).
4. Test: under a two-key sort, the created row ties with its anchor and the manual tiebreaker places it adjacent. Failure half: an anchor with no value on a criterion seeds nothing for it.

**Task 2.4 — Filter implication helper.**
*Why:* B-2 — filter + group apply their matched properties; one owner for the derivation.
*Files:* a small pure module beside the pipeline (`Detail/Views/pipeline/`), consumed by 2.1/2.3/3.1.
*Steps:* derive stamps only from rules naming a single unambiguous value on a user property (positive `Is`, All-mode); Any-groups, negatives, multi-operand, metadata rules derive nothing (B-2, B-3). Where an implication contradicts a gesture-context seed, the gesture wins (B-2). Unit-test the matrix — including the derives-nothing arms as **negative controls**.

**Task 2.5 — Create-mode title editing.**
*Why:* C-1/C-2 — the field opens empty with the caret drawn; Untitled is the fallback, and the first commit routes through the create-origin rename.
*Files:* `TableView.tsx` (editing state gains the create-session bit — A-5's one bit; `editorInitial` becomes `""` under it; `commitEditorText` passes `fromCreate`), `PropertyEditor.tsx` (no changes expected — verify the guards hold for `initial=""`).
*Steps:* type→Enter commits via `fromCreate` rename; empty commit / Esc / click-off leaves Untitled (the existing `trimmed &&` gate already does this — verify, don't rebuild); typing exactly "Untitled" is a no-op by the existing `!== row.title` gate.

**Phase gate:** simplifier → gates → **CDP verification** (in the throwaway Collection: the **table triggers built so far** — band "+" and grip-menu Above/Below — end-to-end, plus the two absorbed checks: the watcher echo under the open field, the pre-focus keystroke gap; screenshots read, not sent). The sidebar trigger belongs to Phase 3 and the whole-criterion pass to Task 5.0 — this gate must not wait on either. → commit.

### Phase 3 — Sidebar, Uniform Field, Labels

**Task 3.1 — Sidebar New Page Above / Below.**
*Why:* D-2, D-5 — the same pair on sidebar pages, computed renderer-side where the sibling order lives.
*Files:* `main/contextMenu.ts` (two items pushing an action — `Pushes` entry on the `open-in-new-tab` precedent), `shared/bridge.ts`, `renderer store.ts` or `Sidebar.tsx` (the handler: full `page_order` from the parent's pages, gesture slot, create via the widened op — no seeds; the sidebar carries no view context), begin-rename in create style.
*Steps:* wire → test the full-array property: **negative control:** a partial array (new+anchor only) must fail the test by alphabetizing the rest.

**Task 3.2 — The empty field everywhere.**
*Why:* C-4 — one creation feel; the prefilled select-all converts.
*Files:* `shared/bridge.ts` (`begin-rename` push widens to carry the style), `main/contextMenu.ts` (its create push sends create style), `renderer App.tsx` (subscription), `store.ts` (`beginRename` carries it), `Components/RenamableTitle.tsx` (the only path from `renamingPath` to the sidebar field — it must thread the style through), `RenamableLabel.tsx`/`EditableInput.tsx`, `Detail/Subfield/subfieldItems.tsx` (its `beginRename` call adopts the style).
*Steps:* the empty-initial style is a separate initial-text notion threading all three layers `value` currently serves — the resting render, `EditableInput`'s `defaultValue`, and the commit guard (which still compares against the real title, so empty → cancel → stays Untitled). Convert both existing paths; the sidebar's first-commit rename also rides `fromCreate` (A-4 applies on every surface). Test **on the sidebar surface itself** — a create there opens empty and an untouched click-off leaves Untitled — so an optional prop silently unpassed by `RenamableTitle` goes red instead of green.

**Task 3.3 — The label renames.**
*Why:* D-3 — a completion condition: the in-drop lands everywhere.
*Derivation:* `grep -rn "Open in New Tab" Pommora/src .claude/Features` and the same for `"Open in Preview"` — at ratification: **16 hits / 13 files** for the first (3 live labels · 2 test assertions + 1 test name · ~9 comments/JSDoc · NavigationPM), **13 hits / 10 files** for the second (3 live labels — `contextMenu`, `navRowMenu`, `connMenu` · comments in `preload`, `main/index`, `shared/types`, `shared/navRowMenu`, `MarkdownPM/editor/connections` · ConnectionsPM + PagePreviewPM). Comments and JSDoc are **in scope** — a comment citing a dead label is lint. Control token: `"Open in Preview"` must hit `main/connMenu.ts` before the sweep and nothing after it.
*Steps:* rename every hit — labels, tests, the test name, comments, doc prose. Re-run both greps — zero hits on the old strings, the control confirming the greps ran.

**Phase gate:** simplifier → gates → commit.

### Phase 4 — The Ghost Row + The Inactive Token

**Task 4.1 — Mint `--state-inactive`.**
*Why:* The ghost row's state is the token six sites already await (Final Phase entry + ContextPM debt).
*Files:* the `--state` family's token source in `design-system/tokens`, the six sites marked `Awaiting proper inactive state token` (Derivation: grep that marker — count 6 at planning time; the marker comments come out with the conversion).
*Steps:* the token is a **theme-aware color** — it joins `color.css.ts`'s `state` contract with both theme values and bridges through `theme-vars`, exactly as `--state-hover/selected/muted` do; never a bare literal copied from the opacity trio beside them. Mint with a sensible interim value marked `KNOB` (Nathan tunes; a knob is not pending work), convert the six sites, delete the markers. The state family's SOURCE-tagged table in [[DesignSystemPM]] **must gain the Inactive row** — the checker verifies table→code only, so a missing row is invisible to every gate; add it deliberately and run `node scripts/check-atlas.mjs` green.

**Task 4.2 — The hover-dwell ghost row.**
*Why:* The fenced final phase — pure chrome until click (the log's Final Phase entry): dwell on a table row extends a ghost-styled "New Page" row below it at `--state-inactive`; click runs the exact Below-path create (2.3). Core is proven by this point via the Phase 2/3 gates and CDP runs — that is what "after the core proves" means in an overnight run.
*Files:* `TableView.tsx` (dwell timer + ghost row render — pixels only, no page, no store state beyond the hover), `Table.css` (ghost styling on the existing row chrome; borders follow the table's state as every row does).
*Steps:* dwell delay is a `KNOB`; the ghost leaves on pointer exit; it never renders while any rename field is open, never on the ungrouped tail's boundary cases the seam law owns, and never arms drag. Interaction sweep: the ghost must stay reachable on the travel from the hovered row into it (it extends below — contiguous), and its appearance must not shift layout out from under a click (dwell delay is the mitigation; verify via CDP that a click at dwell-expiry hits the ghost, not the row beneath).

**Phase gate:** simplifier → gates → CDP pass on the ghost interaction → commit.

### Phase 5 — Docs, Purge, Closeout

**Task 5.0 — The acceptance pass.** The end-to-end criterion, whole, via CDP in the throwaway Collection: all three triggers, the ghost row, the empty field on every converted surface, the zero-cascade first commit (count the walks). This is the criterion's owning task; nothing else stands in for it. Teardown per the CDP-sandbox clause.
**Task 5.1 — Reconcile every blast-radius doc.** TableViewPM (grip menu replaces bubble-to-cell on the grip; band-add real; the in-birth rename; the ghost row; Known Issues/Prospects entries that resolved), ViewsPM (Pending §Group-band creation restates — the built half resolves, the property-bucket rationale survives as the Prospect), CardViewPM (Pending §Heading "+" creation restates as a scope deferral pointing at the Prospect — its "until the affordance is designed" premise dies with this run), SidebarPM, PagesPM (the exact sentence "a colliding rename is rejected" carves the create-origin exception), the three label-prose docs. Surgical repairs per the documentation standard; atlas checker green.
**Task 5.2 — The record.** HistoryPM PM-096: the arc in one entry, explicitly noting the vocab change (the "in" dropped from Open New Tab / Open Preview) per Nathan's instruction. ContextPM: the creation Pending-Focus item and the inactive-token debt line come out; Recent Work gains the entry; anything this arc made stale leaves.
**Task 5.3 — Purge + final review.** comment-killer on the arc diff; the full purge checklist (no dead branches, no orphaned values, no scaffolding, no instrumentation — confirmed by search); then the **build-breaking-agent** against the whole arc (its brief: the decision log + this plan + the commit range). Its findings are verified firsthand and **fixed** — DONE_WITH_CONCERNS means fix; a finding genuinely wrong is recorded with its rejection reason. Gates re-run green after every fix.
**Task 5.4 — The final report** (in chat, the run's last act):
- **What Changed** — plain language, by surface: what Nathan will see and where.
- **Along the Way** — every Deviation, surprise, adjacent fix (the viewOrders staleness repair included), and judgment call the overnight protocol made, with its reasoning.
- **Immediate Work** — what genuinely remains. The accepted answer is: nothing but Nathan's live confirmation — which explicitly includes the one thing CDP can't prove: a real pointer's dwell-then-click landing on the ghost row rather than the row beneath it.
- **Final LOC** — code-only (comments and blanks excluded), net and per-area, plus the commit range.
- **Verification evidence** — the gate summary lines and what the CDP passes proved.

### Execution Standards

- **Trigger:** execution starts on Nathan's explicit go and runs to completion — it stops only when fully done or genuinely blocked (state committed, report written to the stopping point).
- **Per phase:** implement → code-simplifier on the phase diff → gates green (summary lines read) → CDP where the phase says so → commit with explicit paths → tick Progress.
- **Done means:** every decision-log entry implemented or explicitly recorded as deviated-with-reason; every doc in the blast radius trued; the record written; the purge clean; the breaker's findings closed; all gates green; the report delivered. The only pending item on the board is Nathan's live confirmation — nothing else survives as "later."

### Log

- **Progress:** (per phase: base commit · task ticks · phase commit)
- **Deviations:** (what departed from the written task, and why)
- **Open Against Later Tasks:** (review findings aimed at unbuilt tasks)
