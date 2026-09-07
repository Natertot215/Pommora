## State Placement — Implementation Plan

> **Status:** written, pending review · Spec: the D-1 ruling, 09-07-2026, restated under **The Rule** below · Execute tasks in order.
> Citations name files and symbols; re-derive before editing.

**Goal**

Two `local_state` scopes, two browser-storage holdouts, and the floating-window size move to the home their content belongs to. At the end, a view a person chose and a manual order they dragged travel with the Nexus to every device, `localStorage` holds nothing, and a floating window reopens at the size it was left at — none of which is true today.

The shape follows one rule, stated below, applied item by item. The alternative weighed was placement by convenience — leaving each value wherever it was cheapest to write, which is how the current split arose — and it was rejected because the split is invisible to the person it costs: a manual order lost on a second device looks like a bug, not a storage decision. Two mechanisms already in the codebase settle how each half lands: `setDisclosureLock` is the precedent for a container-sidecar field written through `mutate` with an optimistic tree patch, and `setDevicePref` is the precedent for a machine-local preference read once at open and written whole. Neither is invented here.

Bounded to the five items in the placement table. The six page-level scopes the ruling holds in `nexus.db` — `headingIcon`, `aliases`, `citations`, `headingCols`, `embedHeights`, `embedZooms` — are outside this plan, as is the window panel width, whose session map in `UIX/Windows/window-panel.tsx:14` stands unchanged.

#### The Rule

State is placed by what it belongs to, not by what is convenient to write. Anything a person decided about a piece of content or about how a container presents itself is part of that content: it goes into the entity's own Markdown frontmatter, or into its container's JSON sidecar, both of which live under `.nexus/` and travel with the Nexus to every device. Anything true only of the machine in front of the user — window and pane geometry, the operating system's menu style, which tabs a device happens to have open — goes to `nexus.db` through `Core/Platform`, the device-local store, which never syncs and may be discarded on a schema change without losing anything a person authored. Browser `localStorage` holds none of it. Interface Scale and Webpage Zoom are the deliberate exception in the other direction: they stay in `.nexus/settings.json` because the Nexus, not the device, defines how it is meant to be read.

#### The Placement Table

| Item | Current Home | Ruled Home | On-Disk Key | Second Device Before → After |
| --- | --- | --- | --- | --- |
| `activeView` | `nexus.db` | Container sidecar | `active_view: <viewId>` | Opens on the first view → opens on the chosen one |
| `viewOrder` | `nexus.db` | View record in the container sidecar | `manual_order: [<pageId>…]` | Manual order lost under sort or group → held |
| Pane widths | `localStorage` | `nexus.db` | `devicePrefs` → `panes` | Per machine → per machine, per Nexus |
| Sidebar disclosure | `localStorage` | `nexus.db` | `devicePrefs` → `disclosure` | Per machine → per machine, per Nexus |
| Floating-window size | UIX module map | `nexus.db` | `windowGeometry`, keyed by window id | Lost on restart → held per machine, per Nexus |

**Requirements**

1. `active_view` is a container-sidecar field, read onto the container node by both sidecar mappers, and written through `mutate` with an optimistic tree patch.
2. `manual_order` is a field of the view record, resolved and folded through the one `structuralOrder` predicate, and written by every drop site through `persistView`.
3. Pane widths and sidebar disclosure live in the `devicePrefs` singleton, seeded before the tree paints and written through `setDevicePref`.
4. Floating-window size lives in a `windowGeometry` scope keyed by window id; UIX holds no module map and takes no `id`.
5. A first open after each change imports what the retiring home held, so nothing a person set is lost.
6. Once the imports are confirmed against the real Nexus, they and the scopes they read are deleted; `localStorage` holds no Pommora key.

**Acceptance — the whole thing working:** On the real Nexus, choose a non-first view in a collection and drag a row under a sort; quit; reopen — both hold. Inspect that collection's sidecar and read `active_view` and the view's `manual_order` as plain JSON. Resize the sidebar and a Page window, collapse a sidebar group, quit, reopen — all three hold. `localStorage` is empty of `pommora.*`, and `local_state` holds no `activeView` or `viewOrder` row.

**Forced By** *(what each grounded fact makes mandatory or impossible)*

- `readNexus.ts:204,246` and `watchPatch.ts:321,332` are two independent sidecar→node mappers → any new container field is added to both, or an external sidecar edit silently drops it. → Task 1.
- `container:configure` is a plain `host().ask` with no optimistic tree patch; `setDisclosureLock` is a `mutate` op with one at `nexusSlice.ts:217` → `active_view` rides the mutate rail, so a view switch stays instant. → Task 2.
- `useResizeFrame`'s `onChange` is `(next, phase)` and fires per pointer move → any persist gates on `phase === 'drop'`, the gate `App.tsx:59,66` already uses. → Task 10.
- `devicePrefs:load` returns `NO_NEXUS` without a session root, and `local_state` is a table in the Nexus's own `nexus.db` → every device-local item here is per machine *per Nexus*. Ratified. → Tasks 7, 10.
- `ddl.ts:1` — a `nexus.db` version mismatch drops the file rather than migrating → the imports need no version flag; an empty scope is what "already imported" means. → Tasks 3, 6, 8.
- `remintSidecar` (`remint.ts:102-115`) already rewrites `views[].id` inside the sidecar lock → `manual_order` rides the view spread for free, and `active_view` is re-pointed in the same write. → Tasks 3, 6.

**Inherited Reasoning**

- Pane widths were placed in `localStorage` to avoid an IPC round trip per drag frame (`layoutSlice.ts:31`). The reason no longer holds: `App.tsx:59,66` gates the persist on `phase === 'drop'`, so it is one write per drag either way.
- `page_order` and `manual_order` stay two fields on purpose. `page_order` is the container's canonical child order, shared with the sidebar and every other view; `manual_order` is one view's tiebreaker under a sort or a group, where a drag expresses a preference about that view alone and must not reorder the container for everyone. What retires is the fork in *placement*, not the fork in meaning.
- One remembered size per window kind, not per entity: the `id` values are already per-kind constants, so the change is where the value lives rather than what it covers. The iteration window is a development scratchpad and keeps no size.
- A cold start now paints the sidebar at its default width during `status === 'loading'` and settles when the tree lands. Ratified over holding the first paint blank.

**Grounding** *(re-open these; don't cite them)*

- `Core/Platform/localState.ts` — the `Scope` union, and `writeKey(scope, key, null)` as the delete.
- `Core/Nexus/schemas.ts:36-55` · `Core/Nexus/readNexus.ts:196-250` · `Core/Nexus/watchPatch.ts:315-335` · `Core/Nexus/tree.ts:45-62` — the four places a container sidecar field must be named.
- `Core/Pages/setDisclosureLock.ts` · `Core/Nexus/mutatePatch.ts:128` · `Core/Session/nexusSlice.ts:217` · `Core/Nexus/treePatch.ts:477-485` — the mutate rail Task 2 rides.
- `Core/Views/views.ts:80-114,139-144` · `Core/Views/Host/useViewHost.ts:75,103-144,226-239` · `Core/Views/Pipeline/sort.ts:180-188` — the view record, the fold, the resolver.
- `Core/Views/Host/useViewOrders.ts` · `Core/Views/Host/useViewCreation.ts:37-38,114-126` · `Core/Views/Table/TableView.tsx:1038-1069` · `Core/Views/Cards/CardsView.tsx:490-532` — the write sites.
- `Core/Session/layoutSlice.ts` · `Core/Interface/Sidebar/disclosureState.ts` · `Core/Interface/Sidebar/Sidebar.tsx:234-240` · `Core/Interface/App.tsx:36-67` — the browser-storage holdouts.
- `Core/Session/configSlice.ts:54-58` · `Core/Settings/devicePrefs.ts` · `Core/Session/nexusSlice.ts:38-52,80-139,141-171` — the device-preference rail and the startup load.
- `UIX/Windows/window-base.tsx:24-37,98-111` · `UIX/Interactions/ResizeFrame.tsx:24-34,119-133` — the module map and the phase-carrying callback.
- `Core/Nexus/remint.ts:50-164` · `Core/Nexus/handlers.ts:101-111` · `Core/Nexus/liveTree.ts` — remint and the import's site.
- `.claude/Guidelines/` — read before planning in this domain.

**Environment**

- Plan directory `.claude/Planning`. Spec input: the D-1 ruling, restated above; no separate decision log exists.
- Explorer, research, code-review, attack, verifier, and simplification slots all resolve to background Opus agents dispatched with a named return format — this project designates no per-role agent, and the fallback is taken deliberately. Gate commands read from `package.json`.
- Rules directory `.claude/Guidelines`.

**Shapes:** refactor · migration · removal · user-visible

**Declared Stops**

- **Phase 5** — the residue deletions destroy the only path that recovers a pre-move value. They cannot run until the user has opened the real Nexus and confirmed a chosen view, a dragged order, pane widths, disclosure, and a window size all came across.

**Global Constraints (every task inherits these):**

- Gates from the repo root, exit codes read directly, never through a pipe: `npm run typecheck` · `npm run test` · `npm run lint`.
- Formatting is Biome's — single-quote, no semicolons, a PostToolUse hook formats every TS/CSS/JSON write. Never hand-align; an Edit failing on whitespace means Biome reformatted, so re-read and retry.
- Comments are `//` line comments and reserved for a why the code can't carry. A comment that goes false is rewritten in the commit that falsifies it, never amended.
- Search before writing. A second resolver, cache, or validator means the plan is wrong — log it before proceeding.
- Out of scope everywhere: `Showcase/`; the six page-level `nexus.db` scopes the ruling holds; `UIX/Windows/window-panel.tsx`'s width map; `Mobile/` and `Sync/`.

**Made False**

| Doc | The specific claim | What makes it false | Task |
| --- | --- | --- | --- |
| `Core/Session/layoutSlice.ts:31` | "Pane widths live in localStorage rather than nexus.db: an IPC round trip per drag frame is what storing them main-side would cost (Nathan's call)." | The widths move to `nexus.db`, and the persist was already once per drop. | 8 |
| `Core/Interface/Sidebar/disclosureState.ts:1` | "Transient UI chrome — regeneratable, not portable content — so it lives in app-level localStorage, not `.nexus/`." | The file is deleted. | 8 |
| `Core/Views/handlers.ts:12` | "View SELECTION is the per-machine activeViews pointer; this is the view DEFINITION." | Selection is a sidecar field, not per-machine. | 2 |
| `Core/Views/Pipeline/sort.ts:180` | "the persisted per-machine order applies only when the view is sorted or grouped" | The order is no longer per-machine. | 4 |
| `Core/Views/Host/viewMint.ts:11` | "a sentinel adoption must land in the activeViews slice, and this module stays store-free" | The slice is deleted; the adoption lands on the tree node. | 2 |
| `UIX/Windows/window-base.tsx:28` | "A window's size outlives its exit-presence unmount, per window id; it reopens centered." | The map is deleted; the size comes in as a prop. | 9 |
| `.claude/Features/*` | Every sentence describing `activeView`, `viewOrder`, or a `localStorage` home for pane width or disclosure. | The homes change. Enumerated by Task 11's sweep across `.claude/Features/`. | 11 |

**Dead Vocabulary** *(the closing sweep, run at Task 11)*

- `rg -F "activeViews:" Core` → expect 0. Legitimate hits: none.
- `rg -F "viewOrders" Core` → expect 0. Legitimate hits: none.
- `rg -F "localStorage" Core UIX` → expect 0. Legitimate hits: none — no other Core or UIX file touches it today; re-derive the count at Task 11 and treat any survivor as a finding.
- `rg -F "pommora.sidebar" Core` → expect 0.
- Control: `rg -F "devicePrefs" Core` → 12 today. Zero here means the sweep never ran.

**Hazard Window:** Task 3 opens it — from the moment the `activeView` import lands until Task 11 deletes it, the `'activeView'` and `'viewOrder'` names must stay in the `Scope` union and their `local_state` rows must not be cleared by hand, or the import has nothing to read on the machine that hasn't run it yet. Task 11 closes it.

---

### Phase 1 — Active View on the container sidecar

#### Task 1: `active_view` reaches the container node

**Requirement:** 1

**Why:** A chosen view is a decision about how a container presents itself, so it belongs in that container's sidecar. Tasks 2 and 3 both write and read the field this task defines; until the node carries it, neither has anywhere to land.

**Now** — `rg -F "disclosure_locked" Core --glob '!*test*'` → 6, which is the exact site set any container sidecar field occupies:

```ts
// Core/Nexus/schemas.ts:36-55 — pageCollectionSidecar and pageSetSidecar
disclosure_locked: z.boolean().optional(),
// Core/Nexus/tree.ts:49-62 — CollectionNode and SetNode
disclosureLocked?: boolean
// Core/Nexus/readNexus.ts:205,248 — the walk's mapper, both container kinds
disclosureLocked: meta.disclosure_locked === true,
// Core/Nexus/watchPatch.ts:322,333 — the external-edit mapper, both container kinds
disclosureLocked: meta.disclosure_locked === true,
```

**Becomes** — the same six sites, plus `active_view`:

```ts
// Core/Nexus/schemas.ts — on BOTH pageCollectionSidecar and pageSetSidecar
active_view: z.string().optional(),
// Core/Nexus/tree.ts — on BOTH CollectionNode and SetNode
activeView?: string
// Core/Nexus/readNexus.ts and Core/Nexus/watchPatch.ts — all four mapper sites
activeView: typeof meta.active_view === 'string' ? meta.active_view : undefined,
// An id naming no view in `views` is not repaired here — the reader falls back (Task 2).
```

**Assumed by:** Task 2 (reads `source.activeView`), Task 3 (the import writes `active_view`).

**Verify — Automated**

- [ ] A `Core/Nexus` round-trip case: a sidecar carrying `active_view` decodes onto the node through `readNexus`, and the same sidecar through `watchPatch` produces the same node value. Red first — expect 2 failures on an undefined property.
- [ ] The degenerate cases: sidecar with no `active_view` → `undefined`; `active_view` present but naming no id in `views` → carried verbatim onto the node, not dropped.
- [ ] `rg -F "activeView" Core/Nexus` → 6. Control: `rg -F "disclosureLocked" Core/Nexus` → 8.
- [ ] Full gate green, exit codes read directly.

#### Task 2: The view switch writes the sidecar and patches the tree

**Requirement:** 1

**Why:** With the field on the node, the `activeViews` store slice is a second definition of the same fact and goes. Riding the `mutate` rail keeps the switch instant, which a plain sidecar ask would not.

**Now** — `rg -F "activeViews" Core --glob '!*test*'` → 11, one channel pair and one slice feeding five readers:

```ts
// Core/Contract/bridge.ts:63-64 · Core/Interface/handlers.ts:94-95
'activeViews:get': { args: []; reply: Record<string, string> }
'activeViews:set': { args: [containerId: string, viewId: string]; reply: Result<null> }
// Core/Session/cacheSlice.ts:54-58 — the slice and its only writer
activeViews: {},
setActiveView: async (containerId, viewId) => { await host().ask('activeViews:set', …); set(…) },
// Readers: Core/Views/Host/useActiveView.ts:14 · Settings/ViewFrame.tsx:67 ·
// Settings/SettingsFrame.tsx:91 · Session/store.ts:47 · Views/Host/viewMint.ts:48
// Seeded at Core/Session/nexusSlice.ts:110-112 in the startup Promise.all
```

**Becomes** — one mutate op, no slice:

```ts
// Core/Pages/mutateRequest.ts — beside setDisclosureLock
| { op: 'setActiveView'; path: string; kind: MutableContainerKind; viewId: string }
// Core/Pages/setActiveView.ts (new) — the shape of setDisclosureLock.ts
export async function setActiveViewOp(ctx: MutateContext, req: …): Promise<MutateReply>
// rmwJsonStrict + setOrDrop(cur, 'active_view', req.viewId) under the sidecar lock
// Core/Nexus/mutatePatch.ts — beside case 'setDisclosureLock'
// Core/Session/nexusSlice.ts — beside case 'setDisclosureLock'
case 'setActiveView':
  patched = patchNodeInTree(cur, req.path, { activeView: req.viewId })
// Core/Nexus/treePatch.ts:477-485 — activeView joins the patch union, container kinds only
// Core/Views/Host/useActiveView.ts — reads source.activeView, falling back to views[0]
// Core/Views/Host/viewMint.ts — the sentinel adoption calls mutate, and wireViewAdopted goes
```

**Assumed by:** Task 3 (remint's re-point replaces `copyDeviceRows`' `activeView` block).

**Verify — Automated**

- [ ] Red first: a `useActiveView` case that an unknown `activeView` falls back to `views[0]`, and that an absent one does the same — expect 2 failures before the reader moves.
- [ ] A `nexusSlice` case that `setActiveView` patches the node optimistically, before the confirming push. Red with the `patchNodeInTree` case removed.
- [ ] The eight test files mocking `activeViews:get`/`activeViews:set` are updated, not deleted — `rg -l "activeViews:" Core` → 0.
- [ ] `rg -F "activeViews" Core` → 0. Control: `rg -F "setDisclosureLock" Core` → 6.
- [ ] Full gate green. `Scope`'s `'activeView'` name still stands — Task 3 needs it.

#### Task 3: Import the `activeView` scope, and remint re-points the field

**Requirements:** 1, 5

**Why:** The rows already in `local_state` are choices a person made; the move is only complete if they arrive in the new home. Remint's device-row copy for the same fact is now the wrong writer and goes.

**Now** — `rg -F "'activeView'" Core --glob '!*test*'` → 3, one union name and remint's copy:

```ts
// Core/Platform/localState.ts:6 — the Scope union name, held open by the Hazard Window
// Core/Nexus/remint.ts:151-153 — a copied container's pointer, re-pointed device-side
const active = readKey<string>('activeView', target.id)
const moved = active === null ? undefined : viewIds.get(active)
if (moved) writeKey('activeView', fresh, moved)
```

**Becomes** — an import at the tree's first install, and remint re-pointing inside the write it already makes:

```ts
// Core/Nexus/importPlacedState.ts (new) — called from 'nexus:state' (Core/Nexus/handlers.ts:106)
// once the tree is in hand, then refreshAfterWrite so the reply carries the imported values.
export async function importPlacedState(root: string, tree: NexusTree): Promise<boolean>
// Reads readScope<string>('activeView'), resolves each container id to its path through the
// tree, writes active_view through the same sidecar lock, then writeKey('activeView', id, null).
// An id the tree can't resolve keeps its row: the container may be excluded, not gone.
// Returns whether anything was written. Idempotent — an emptied scope is a no-op.

// Core/Nexus/remint.ts — inside remintSidecar's locked write, after the views[].id rewrite
if (typeof next.active_view === 'string')
  next.active_view = viewIds.get(next.active_view) ?? undefined
```

**Assumed by:** Task 11 (deletes `importPlacedState` and the `'activeView'` name).

**Verify — Automated**

- [ ] Red first: an import case over a two-container tree — both `active_view` values land, both rows are gone after, and a second run writes nothing. Expect 3 failures, module not found.
- [ ] The degenerate cases: an empty scope writes nothing and triggers no refresh; a row whose container id is absent from the tree survives untouched.
- [ ] `remint.test.ts:217-300` rewritten to assert `active_view` on the copy's sidecar rather than on the device row, and that the copy's id is the minted one. Red with the re-point line removed.
- [ ] `rg -F "readKey('activeView'" Core` → 0. Control: `rg -F "readKey(" Core` → re-derive.
- [ ] Full gate green.

**Verify — User**

- [ ] Open the real Nexus. A collection whose non-first view was selected before this change still opens on it, and its `.collection.json` carries `active_view`.

#### Gate 1 — the chosen view is sidecar-borne

- [ ] Gate commands green, exit codes read directly.
- [ ] Every task's **Verify — automated** list ticked, each against a result just watched.
- [ ] Every Now count re-run against its control; counts matched, or the divergence rewrote the plan.
- [ ] Every task that diverged had its dependents re-derived and rewritten.
- [ ] Simplification, then code review, dispatched against `<base>..HEAD` scoped to this phase's paths; the reports cite files inside it.
- [ ] Every concern fixed, or carrying an explicit user ruling recorded in the Log.
- [ ] The hazard window opened by Task 3 stays open by design; it is not closed here.
- [ ] One smoke launch: `env -u ELECTRON_RUN_AS_NODE POMMORA_DEBUG_PORT=9333 npm run dev`.
- [ ] Progress hashes filled in; lessons written into the later tasks they change.
- [ ] Not a declared stop — Phase 2 opens automatically and Task 3's user box carries to Completion Criteria.

---

### Phase 2 — Manual order in the view record

#### Task 4: `manual_order` on the view, resolved through one predicate

**Requirement:** 2

**Why:** A drag under a sort is a preference about that view, so it belongs in that view's record. Task 5's write sites need the field and the fold to exist before they can stop threading a separate order map.

**Now** — the field set, the state list, and the two places the order is consumed:

```ts
// Core/Views/views.ts:91,108,139-144 — collapsed_groups is the only view-state key today
collapsed_groups?: string[]
const VIEW_STATE_KEYS = ['collapsed_groups'] as const
export function pickViewState(view: SavedView): ViewState {
  return { collapsed_groups: view.collapsed_groups }
}
// Core/Views/Host/useViewHost.ts:103-118 — three overrides fold into liveView and self-clear
// Core/Views/Host/useViewHost.ts:136-144 — the resolver's third argument
const structuralOrder = groupPropId === undefined && sortKeys === 0
const manualOrder = locationFsOrder ? undefined
  : resolveManualOrder(sortedOrGrouped, manualOverride, structuralOrder ? undefined : viewOrders[view.id])
```

**Becomes** — a fourth field, a fourth override, and one predicate governing both:

```ts
// Core/Views/views.ts — beside collapsed_groups, and in the zod codec with element filtering
manual_order?: string[]
const VIEW_STATE_KEYS = ['collapsed_groups', 'manual_order'] as const
// pickViewState carries both — a locked tile still holds a manual order, as collapse already does.

// Core/Views/Host/useViewHost.ts — liveView folds manual_order under the SAME structuralOrder
// guard the resolver uses, so a structural reorder's manualOverride can never be written into
// manual_order by an unrelated persist.
...(!structuralOrder && manualOverride ? { manual_order: manualOverride } : {}),
// and the catch-up effect gains its fourth clause:
if (manualOverride && sameIds(manualOverride, view.manual_order ?? [])) setManualOverride(null)
// The resolver's third argument becomes structuralOrder ? undefined : view.manual_order
```

**Assumed by:** Task 5 (writes `manual_order` through `persistView`), Task 6 (the import writes it).

**Verify — Automated**

- [ ] Red first: a `useViewHost` case that a reorder under a sort puts the ids in `manual_order` on the saved view, and that a structural reorder leaves `manual_order` untouched while writing `page_order`. Expect 2 failures.
- [ ] **The crossing test:** the fold and `resolveManualOrder` agree — a case that toggles a group collapse while a structural `manualOverride` is live and asserts the saved view carries no `manual_order`. Red with the `!structuralOrder` guard removed from the fold.
- [ ] The degenerate cases: `manual_order` absent → the resolver returns undefined; present but empty → same; a non-string element in the stored array is dropped, not the whole array.
- [ ] A `pickViewState` case that a locked tile's state-only write carries `manual_order`.
- [ ] `rg -F "manual_order" Core` → 8. Control: `rg -F "collapsed_groups" Core` → re-derive.
- [ ] Full gate green.

#### Task 5: Every drop site writes through `persistView`

**Requirement:** 2

**Why:** With the order on the view, `useViewOrders` and the two props threaded through four files are a second write path for one fact.

**Now** — `rg -F "persistViewOrder" Core --glob '!*test*'` → 9 across five files:

```ts
// Core/Views/Host/useViewOrders.ts — the whole file: a per-mount fetch of every view's order
// Core/Views/Host/useViewHost.ts:75,316-317,365-366 — created, passed to creation, returned
// Core/Views/Host/useViewCreation.ts:37-38,124-125 — two config fields, one splice
if (!latest.structuralOrder || latest.viewOrders[latest.view.id])
  latest.persistViewOrder(splice(latest.viewOrders[latest.view.id]))
// Core/Views/Table/TableView.tsx:1048,1067 — relocateRow and reorderTo
// Core/Views/Cards/CardsView.tsx:504,529 — reorderInBandByIndex and onCardDrop
```

**Becomes** — one writer, reading the folded view rather than a separate map:

```ts
// Every site: persistView({ manual_order: <ids> }, { viewState: true })
// The base for a splice is liveView.manual_order, which Task 4's fold keeps current across
// successive gestures without waiting for the confirming push.
// useViewCreation's config loses viewOrders and persistViewOrder, gaining:
persistManualOrder: (ids: string[]) => void
// Core/Views/Host/useViewOrders.ts — deleted.
```

**Verify — Automated**

- [ ] Red first: a `useViewCreation` case that two creates in succession, before any tree push, produce a `manual_order` containing both new ids in gesture order. Expect 1 failure — the second splice would drop the first.
- [ ] A `CardsView` and a `TableView` case each: a cross-band drop under a sort writes `manual_order`, and the same drop on a structural view does not.
- [ ] `rg -F "persistViewOrder" Core` → 0, and `rg -F "useViewOrders" Core` → 0. Control: `rg -F "persistView(" Core` → re-derive.
- [ ] Full gate green.

#### Task 6: Import the `viewOrder` scope into each view record

**Requirements:** 2, 5

**Why:** Orders already dragged are choices a person made, and remint's per-view copy loop is now redundant with the sidecar copy it already performs.

**Now** — the import's sibling and remint's loop:

```ts
// Core/Nexus/importPlacedState.ts — carries the activeView pass from Task 3
// Core/Nexus/remint.ts:147-150 — copied inside copyDeviceRows, keyed by minted view id
for (const [old, minted] of viewIds) {
  const order = readKey<string[]>('viewOrder', old)
  if (order !== null) writeKey('viewOrder', minted, order)
}
```

**Becomes** — a second pass in the same import, and remint carrying the order for free:

```ts
// importPlacedState gains a viewOrder pass: readScope<string[]>('viewOrder') is keyed by VIEW
// id, so each container's views are scanned for a match and the record gains manual_order in
// the same locked sidecar write as the activeView pass — one write per container, not two.
// A view id no tree container claims keeps its row.

// Core/Nexus/remint.ts — the loop is deleted; remintSidecar's `{ ...v, id: minted }` spread
// already carries manual_order onto the copy. With Task 3's re-point, copyDeviceRows no longer
// needs viewIds, and writeFreshId's Map|null return collapses to boolean.
```

**Assumed by:** Task 11 (deletes the import and the `'viewOrder'` name).

**Verify — Automated**

- [ ] Red first: an import case over a container with two views, each holding an order — both land in their own view record, both rows are gone after, and a container's sidecar is written once, not twice. Expect 3 failures.
- [ ] The degenerate cases: a view id matching no container survives untouched; an empty scope is a no-op.
- [ ] `remint.test.ts` rewritten to assert `manual_order` on the copy's minted view record. Red with the `views[].id` spread narrowed to drop unknown keys.
- [ ] `rg -F "'viewOrder'" Core --glob '!*localState*'` → 0. Control: `rg -F "readScope" Core` → re-derive.
- [ ] Full gate green.

**Verify — User**

- [ ] A view sorted and hand-ordered before this change still shows that order, and the order reads as `manual_order` inside the view record in the container's sidecar.

#### Gate 2 — the manual order travels

- [ ] Gate commands green, exit codes read directly.
- [ ] Every task's **Verify — automated** list ticked, each against a result just watched.
- [ ] Every Now count re-run against its control; counts matched, or the divergence rewrote the plan.
- [ ] Every task that diverged had its dependents re-derived and rewritten.
- [ ] Simplification, then code review, dispatched against `<base>..HEAD` scoped to this phase's paths.
- [ ] Every concern fixed, or carrying an explicit user ruling recorded in the Log.
- [ ] The hazard window stays open by design.
- [ ] One smoke launch.
- [ ] Progress hashes filled in; lessons written into the later tasks they change.
- [ ] Not a declared stop — Phase 3 opens automatically and Task 6's user box carries to Completion Criteria.

---

### Phase 3 — Browser storage into the device store

#### Task 7: `panes` and `disclosure` on `DevicePrefs`, seeded before the tree paints

**Requirement:** 3

**Why:** Both values are true of the machine, and the store already has a rail for exactly that. Seeding must happen before `applyTree` sets `status: 'ready'`, or the sidebar paints at its default and jumps a second time when the tree lands.

**Now** — one optional boolean, loaded at the tail of `applyTree` behind a module flag:

```ts
// Core/Settings/devicePrefs.ts:3-12 — packDevicePrefs drops top-level undefined, null and false
export interface DevicePrefs { nativeMenus?: boolean }
// Core/Session/nexusSlice.ts:40,44,166-170 — after set({ status: 'ready', tree })
let devicePrefsLoaded = false
if (!devicePrefsLoaded) { devicePrefsLoaded = true; const prefs = await host().ask('devicePrefs:load'); … }
```

**Becomes** — two nested objects, fetched before the tree is applied:

```ts
// Core/Settings/devicePrefs.ts — nested BECAUSE packDevicePrefs drops a top-level false and a
// disclosure map is mostly false; an object is truthy and survives whole.
export interface DevicePrefs {
  nativeMenus?: boolean
  panes?: { sidebar?: number; inspector?: number }
  disclosure?: Record<string, boolean>
}
// Core/Session/nexusSlice.ts — inside load(), after nexus:state answers 'open' and BEFORE
// applyTree, so the first ready paint already carries the widths. The module flag goes: load()
// runs once per nexus open. The foreign-tree branch at applyTree:142-144 re-fetches, since a
// reload-state adopt reaches it without load().
```

**Assumed by:** Task 8 (reads the store), Task 10 (seeded in the same fetch).

**Verify — Automated**

- [ ] Red first: a `devicePrefs` case that a nested `false` survives `packDevicePrefs` and a top-level one does not. Expect 1 failure.
- [ ] A `nexusSlice` case that `devicePrefs` is populated before `status` becomes `'ready'`. Red with the fetch moved back after `applyTree`.
- [ ] The degenerate cases: `devicePrefs:load` returning `null`, and returning a `NO_NEXUS` failure, both leave the defaults standing rather than throwing.
- [ ] `rg -F "devicePrefsLoaded" Core` → 0. Control: `rg -F "devicePrefs" Core` → re-derive.
- [ ] Full gate green.

#### Task 8: The panes and the sidebar read the store, and `localStorage` goes

**Requirements:** 3, 5

**Why:** With the values in the store before first paint, the two browser-storage readers are the last thing holding Pommora state in the browser.

**Now** — `rg -F "localStorage" Core UIX` → 6 across three files:

```ts
// Core/Session/layoutSlice.ts:31-45,70-79 — storedWidth at construction, setItem on drop
export const SIDEBAR_WIDTH = { min: 180, max: 380, def: 240, key: 'pommora.sidebarWidth' }
export const INSPECTOR_WIDTH = { min: 240, max: 420, def: 300, key: 'pommora.inspectorWidth' }
// Core/Interface/Sidebar/disclosureState.ts — the whole file, plus its test
// Core/Interface/Sidebar/Sidebar.tsx:235,239 — loadOpen at mount, saveOpen on toggle
```

**Becomes** — the store on both sides, written through the existing `setDevicePref`:

```ts
// Core/Session/layoutSlice.ts — the bounds keep min/max/def and lose `key`; the slice starts at
// def and Task 7's seed sets it. persistPaneWidths writes one pref:
setDevicePref('panes', { sidebar: get().sidebarWidth, inspector: get().inspectorWidth })
// Core/Interface/Sidebar/Sidebar.tsx — open comes from the store, written the same way:
const stored = useSession((s) => (persistKey ? s.devicePrefs.disclosure?.[persistKey] : undefined))
// setAndSave merges one key into the disclosure map through setDevicePref.
// Core/Interface/Sidebar/disclosureState.ts and its test — deleted.

// Core/Session/importBrowserState.ts (new) — run once from load(), before the seed is read:
// the three pommora.* keys are read, folded into one devicePrefs:save, and removed. Self-erasing.
```

**Verify — Automated**

- [ ] Red first: a `layoutSlice` case that a drop writes one `devicePrefs` pref carrying both widths, and a `Sidebar` case that a toggle merges one key without clobbering its siblings. Expect 2 failures.
- [ ] An import case: three `localStorage` keys land as `panes` and `disclosure` and are removed; a second run is a no-op; absent keys write nothing.
- [ ] The degenerate cases: a width outside `min`/`max` is clamped on read; a `localStorage` that throws leaves the defaults standing.
- [ ] `rg -F "localStorage" Core UIX` → 3, all inside `importBrowserState.ts`. Control: `rg -F "useSession" Core/Interface` → re-derive.
- [ ] Full gate green.

**Verify — User**

- [ ] Sidebar and inspector widths, and the sidebar's collapsed groups, come back after a restart — with a single settle as the Nexus paints, not a jump afterward.

#### Gate 3 — nothing of Pommora's is in the browser

- [ ] Gate commands green, exit codes read directly.
- [ ] Every task's **Verify — automated** list ticked, each against a result just watched.
- [ ] Every Now count re-run against its control; counts matched, or the divergence rewrote the plan.
- [ ] Every task that diverged had its dependents re-derived and rewritten.
- [ ] Simplification, then code review, dispatched against `<base>..HEAD` scoped to this phase's paths.
- [ ] Every concern fixed, or carrying an explicit user ruling recorded in the Log.
- [ ] One smoke launch.
- [ ] Progress hashes filled in; lessons written into the later tasks they change.
- [ ] Not a declared stop — Phase 4 opens automatically and Task 8's user box carries to Completion Criteria.

---

### Phase 4 — Window size into the device store

#### Task 9: UIX takes the size as a prop

**Requirement:** 4

**Why:** UIX reaches nothing outside itself, so it can hold a size but never persist one. Handing the value in and the change back leaves the decision to Core, where the store is.

**Now** — a module map and the `id` prop that exists only to key it:

```ts
// UIX/Windows/window-base.tsx:28-37,74,98,108
const sizes = new Map<string, Size>()
const opening = (id: string, bounds: WindowBounds): Rect => { … sizes.get(id) ?? bounds.def … }
const [geo, setGeo] = useState(() => opening(id, bounds))
onChange: (next) => { sizes.set(id, { w: next.w, h: next.h }); setGeo(next) }
// `id` has no other reader: rg -F "id" is unusable here — the six call sites are
// SettingsWindow.tsx:722 · WebWindow.tsx:86 · PageWindow.tsx:143 · IterationWindow.tsx:13 ·
// NavWindow.tsx:128 · PageHistoryWindow.tsx:214
```

**Becomes** — two optional props, and the persist gated on the drop:

```ts
// UIX/Windows/window-base.tsx — id, sizes and opening all deleted
initialSize?: Size          // absent → bounds.def
onSizeChange?: (s: Size) => void
// The frame's callback keeps its phase argument, which is what stops one write per pointer move:
onChange: (next, phase) => {
  setGeo(next)
  if (phase === 'drop') onSizeChange?.({ w: next.w, h: next.h })
}
// The opening rect is centered from initialSize ?? bounds.def, as before.
```

**Assumed by:** Task 10 (supplies both props).

**Verify — Automated**

- [ ] Red first: a UIX case that an absent `initialSize` opens at `bounds.def`, that a given one opens at that size, and that a drag calls `onSizeChange` exactly once — on drop, not per move. Expect 3 failures.
- [ ] The negative control: with the `phase === 'drop'` guard removed, the once-per-drag case goes red.
- [ ] The degenerate case: a press that moves nothing calls back not at all.
- [ ] `rg -F "sizes.set" UIX` → 0. Control: `rg -F "useResizeFrame" UIX` → re-derive.
- [ ] Full gate green.

#### Task 10: Core remembers a size per window

**Requirement:** 4

**Why:** A window's size is a fact about this machine's screen, so `nexus.db` is its home. One helper wires it, rather than five hand-written pairs.

**Now** — no channel and no scope; the five ruled ids are string literals at their call sites:

```ts
// Core/Platform/localState.ts:4-21 — the Scope union, with no windowGeometry
// The five ruled ids: 'settings' · 'page-window' · 'navwindow' · 'page-history' · 'web-browser'
// IterationWindow's 'iteration' is a development scratchpad and is deliberately not ruled.
```

**Becomes** — one scope, one channel pair, one hook:

```ts
// Core/Platform/localState.ts — 'windowGeometry' joins the Scope union, keyed by window id.
// Core/Contract/bridge.ts + Core/Interface/handlers.ts — the pair, beside activeViews' old slot:
'windowGeometry:get': { args: []; reply: Record<string, Size> }
'windowGeometry:set': { args: [id: string, size: Size]; reply: Result<null> }
// Seeded into the store in the same pre-applyTree fetch as Task 7.
// Core/Interface/Windows/useWindowGeometry.ts (new) — the whole wiring, spread at five sites:
export function useWindowGeometry(id: string): { initialSize?: Size; onSizeChange: (s: Size) => void }
// IterationWindow passes neither prop and opens at its default every time.
```

**Verify — Automated**

- [ ] Red first: a hook case that a stored size is returned as `initialSize` and that a change writes one row under that id. Expect 2 failures.
- [ ] The degenerate cases: no stored row → `initialSize` undefined; a stored row whose `w` or `h` is not a finite number is ignored rather than passed through.
- [ ] `rg -F "useWindowGeometry" Core` → 6. Control: `rg -F "WindowBase" Core` → 6.
- [ ] Full gate green.

**Verify — User**

- [ ] Resize the Settings window and a Page window, quit, reopen — each returns at its size. Two Page windows in a row open at the same remembered size. The iteration window (⌘⇧T) opens at its default every time.

#### Gate 4 — windows hold their size

- [ ] Gate commands green, exit codes read directly.
- [ ] Every task's **Verify — automated** list ticked, each against a result just watched.
- [ ] Every Now count re-run against its control; counts matched, or the divergence rewrote the plan.
- [ ] Every task that diverged had its dependents re-derived and rewritten.
- [ ] Simplification, then code review, dispatched against `<base>..HEAD` scoped to this phase's paths.
- [ ] Every concern fixed, or carrying an explicit user ruling recorded in the Log.
- [ ] One smoke launch.
- [ ] Progress hashes filled in; lessons written into the later tasks they change.
- [ ] Not a declared stop — Phase 5 is, and it opens only on the user's word.

---

### Phase 5 — Residue

#### Task 11: Delete the imports and the homes they emptied

**Requirement:** 6

**Why:** Each import exists to carry one machine's values across once. Once the user has confirmed they arrived, the import, the scopes it read, and the browser keys are code with nothing left to vary.

**Now** — the inventory, bucketed:

```ts
// DEAD REGARDLESS — nothing reads them once the rows are gone:
//   Core/Nexus/importPlacedState.ts + test · Core/Session/importBrowserState.ts + test
//   Core/Platform/localState.ts — the 'activeView' and 'viewOrder' names
//   Core/Platform/localState.test.ts — the cases keyed on those two names
// DEAD BY STANDING RULE — the ruling places nothing here:
//   the pommora.sidebarWidth / pommora.inspectorWidth / pommora.sidebar.disclosure keys
// NEVER DELETE — outside this plan by the ruling:
//   the six page-level scopes: folds, headingCols, headingIcon, citations, embedHeights,
//   embedZooms, aliases · linkTitle · tabs · windows · recents · record · glancePane
// ORDER — the imports go first: deleting a Scope name while an import still reads it
// is a compile error, and the compile error is the point.
```

**Becomes** — the two imports and their call sites gone, the union two names shorter, and every document the moves falsified rewritten:

```ts
// Core/Nexus/handlers.ts — the importPlacedState call in 'nexus:state' goes
// Core/Session/nexusSlice.ts — the importBrowserState call in load() goes
// .claude/Features/* — every sentence naming activeView, viewOrder, or a localStorage home
// for pane width or disclosure, rewritten to the placement that now holds.
```

**Verify — Automated**

- [ ] The whole Dead Vocabulary sweep at zero against its control.
- [ ] `rg -F "'activeView'" Core` → 0 and `rg -F "'viewOrder'" Core` → 0. Control: `rg -F "'folds'" Core` → re-derive.
- [ ] Full gate green, and one smoke launch on a Nexus whose scopes are already empty.

**Verify — User**

- [ ] Everything Phases 1–4 asked for still holds after the deletions, on the real Nexus.

#### Gate 5 — nothing left with nothing to vary

- [ ] **Declared stop.** This phase opens only once the user has confirmed, against the real Nexus, that a chosen view, a dragged order, pane widths, disclosure, and a window size all came across.
- [ ] Gate commands green, exit codes read directly.
- [ ] The hazard window Task 3 opened is closed here.
- [ ] Simplification, then code review, dispatched against `<base>..HEAD`.
- [ ] Every concern fixed, or carrying an explicit user ruling recorded in the Log.
- [ ] Every document in Made False rewritten in the commit that falsified it.

---

## Implementation Log

### Progress

- [ ] **Phase 1** — Active View on the container sidecar · base `<commit>`
  - [ ] Task 1 — `active_view` reaches the container node · `<commit>`
  - [ ] Task 2 — The view switch writes the sidecar and patches the tree · `<commit>`
  - [ ] Task 3 — Import the `activeView` scope, and remint re-points the field · `<commit>`
- [ ] **Phase 2** — Manual order in the view record
  - [ ] Task 4 — `manual_order` on the view, resolved through one predicate
  - [ ] Task 5 — Every drop site writes through `persistView`
  - [ ] Task 6 — Import the `viewOrder` scope into each view record
- [ ] **Phase 3** — Browser storage into the device store
  - [ ] Task 7 — `panes` and `disclosure` on `DevicePrefs`, seeded before the tree paints
  - [ ] Task 8 — The panes and the sidebar read the store, and `localStorage` goes
- [ ] **Phase 4** — Window size into the device store
  - [ ] Task 9 — UIX takes the size as a prop
  - [ ] Task 10 — Core remembers a size per window
- [ ] **Phase 5** — Residue
  - [ ] Task 11 — Delete the imports and the homes they emptied

### Rulings

- **09-07-2026, Nathan:** Per-Nexus granularity accepted for pane widths, sidebar disclosure, and window size. `local_state` and `devicePrefs` are both bound to a session root, so all three are per machine *per Nexus*, not per machine.
- **09-07-2026, Nathan:** The cold-start settle is accepted. `devicePrefs` is fetched before `applyTree` so the ready paint carries the stored widths; the `loading` state still shows the default, and the pane settles once as the Nexus appears. Holding the first paint blank was rejected.
- **09-07-2026, Claude:** `active_view` rides the `mutate` rail (`setDisclosureLock`'s precedent) rather than `container:configure`, which has no optimistic tree patch and would make a view switch wait on disk. This retires the `activeViews` store slice outright rather than replacing it with a catch-up override layer.
- **09-07-2026, Claude:** `WindowKind` does not exist in the codebase; the D-1 ruling asserted it. No union is introduced — the five window ids are already literals at their call sites, and `useWindowGeometry` keys on them directly.
- **09-07-2026, Claude:** The `'activeView'` and `'viewOrder'` Scope names survive through Phase 4 and are deleted in Task 11, because the import that reads them is the only thing that recovers a pre-move value on a machine that hasn't opened yet.

### Open Against Later Tasks

### Deviations

### Lessons

### Sequenced After

### Closeout

---

## Completion Criteria

**The directive**

```
Execute .claude/Planning/State Placement — Implementation Plan.md.
Live-verify: the Phase 5 declared stop — a chosen view, a dragged order under a sort,
  pane widths, sidebar disclosure, and a window size all surviving a restart on the real Nexus.
Screenshots: none — every surface here is one Nathan sees on his own.
Pings: at each phase gate, and at the Phase 5 stop.
Record: History arc "State Placement".
Everything else is the standard below.
```

**The Standard**

- **The bar.** Not doing the chores — doing the laundry, folding it, picking up what fell out of the hamper, emptying the lint trap, leaving no trace that anything went wrong. A future review of this arc finds nothing to correct.
- **Only the live confirmation may be pending.** No concerns carried, no "for a later session," no deferrals when the fix is known and could be done now. Where an item genuinely can't get there, the Log names which and why, and everything else is still finished.
- **Reusability first.** Search before writing. A second resolver, cache, or validator means the plan is wrong, or you are — log it before proceeding. Duplication is debt.
- **Fix at the source**, never down-river; leave a unified thing rather than stitched pieces. Add code only where it repairs something flawed or makes things simpler.
- **Ambiguity:** take the simplest reading, record it under Rulings or Deviations, continue. Execution does not stop for input.
- **Per phase:** implement → simplify → comment pass → gates, exit codes read directly and never piped → code review → attack review → every finding fixed or carrying a defensible ruling → commit → ping. Simplification before review, never inverted. "Done with concerns" is unfinished work, and a result nobody watched happen is not a result.
- **Comments** only where the why can't be inferred. **Docs** stay clean and non-bloated; what went false gets rewritten, not amended. Unattributed doc or style edits mid-run belong to Nathan — fold them into the commit at hand, never revert them.

**Then tick these.**

**The deliverable**

- [ ] Every numbered requirement traces to a landed task.
- [ ] The acceptance criterion observed running, clause by clause.
- [ ] Both sidecar mappers carry `active_view`; an external sidecar edit does not drop it.
- [ ] The fold and `resolveManualOrder` agree on one `structuralOrder` predicate, proven by the crossing test.
- [ ] No persist fires per pointer move; every geometry write is gated on `phase === 'drop'`.
- [ ] Net line count reported, comments and tests excluded.

**The passes**

- [ ] One round: simplification, then attack review, over the whole range — in that order.
- [ ] Delivery Claim written, then checked by a neutral verifier against the D-1 ruling as restated here.
- [ ] Every finding from every pass fixed, or carrying a defensible ruling.

**The user's own pass**

- [ ] A collection whose non-first view was chosen opens on it, and its sidecar reads `active_view`.
- [ ] A hand-ordered view under a sort holds its order, and the view record reads `manual_order`.
- [ ] Pane widths and sidebar disclosure survive a restart, settling once as the Nexus paints.
- [ ] Settings and Page windows reopen at their remembered size; the iteration window does not.
- [ ] Everything above still holds after Phase 5's deletions.

**The record**

- [ ] Documents made false rewritten in the commits that falsified them.
- [ ] The closing sweep at zero against its control.
- [ ] Context and Handoff current; the History entry written to its format.
- [ ] Lessons routed to `.claude/Guidelines`; successor work named in Sequenced After.

**The report**, in plain English — what shipped and why it matters · what happened along the way worth knowing · every gate's real output · in-flight decisions, a sentence or two each · what's left for the live pass · final +/− line count, comments and tests excluded. Honest about what didn't work.
