## State Placement — Implementation Plan

> **Status:** written, pending review · Spec: the D-1 ruling, 09-07-2026, restated under **The Rule** below · Execute tasks in order.
> Citations name files and symbols; re-derive before editing.

**Goal**

Two `local_state` scopes, two browser-storage holdouts, and the floating-window size move to the home their content belongs to. At the end, a view a person chose and a manual order they dragged travel with the Nexus to every device, `localStorage` holds nothing, and a floating window reopens at the size it was left at — none of which is true today.

The shape follows one rule, stated below, applied item by item. The alternative weighed was placement by convenience — leaving each value wherever it was cheapest to write, which is how the current split arose — and it was rejected because the split is invisible to the person it costs: a manual order lost on a second device looks like a bug, not a storage decision. Three mechanisms already in the codebase settle how each half lands: `setDisclosureLock` is the precedent for a container-sidecar field written through `mutate` with an optimistic tree patch; `setDevicePref` is the precedent for a machine-local preference read once at open and written whole; and `replaySchemaCascade` in `openNexusSequence` is the precedent for a one-time write during an open, followed by a re-walk. None is invented here.

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
| Floating-window size | UIX module map | `nexus.db` | `devicePrefs` → `windows`, keyed by window id | Lost on restart → held per machine, per Nexus |

**Requirements**

1. `active_view` is a container-sidecar field, reaching the container node through one hoisted mapper, and written through `mutate` with an optimistic tree patch.
2. `manual_order` is a field of the view record, resolved and folded through the one `structuralOrder` predicate, and written by every drop site through `persistView`.
3. Pane widths, sidebar disclosure, and window size all live in the `devicePrefs` singleton, seeded before the tree paints and written through `setDevicePref`.
4. UIX holds no window-size module map and takes no `id`; it receives a size and reports a change.
5. A first open after the sidecar moves imports what `local_state` held for `activeView` and `viewOrder`, so nothing a person authored is lost.
6. Once that import is confirmed against the real Nexus, it and the two scopes it reads are deleted; `localStorage` holds no Pommora key.

**Acceptance — the whole thing working:** On the real Nexus, choose a non-first view in a collection and drag a row under a sort; quit; reopen — both hold. Inspect that collection's sidecar and read `active_view` and the view's `manual_order` as plain JSON. Resize the sidebar and a Page window, collapse a sidebar group, quit, reopen — all three hold. `localStorage` is empty of `pommora.*`, and `local_state` holds no `activeView` or `viewOrder` row.

**Forced By** *(what each grounded fact makes mandatory or impossible)*

- `readNexus.ts:196-206,235-249` and `watchPatch.ts:317-333` build near-identical container nodes from the same eight `meta` keys, and `makeSetNode` / `makeCollectionNode` (`treePatch.ts:52-107`) name each field twice more → a new container field is ten sites today. Hoisting the three `meta` mappers first makes it two. → Task 1.
- `container:configure` is a plain `host().ask` with no optimistic tree patch; `setDisclosureLock` is a `mutate` op with one at `nexusSlice.ts:217` → `active_view` rides the mutate rail, so a view switch stays instant. → Task 1.
- `pickView` (`Core/Views/Pipeline/pickView.ts:25`) already resolves `active ?? views[0]`, and a sentinel adoption is precisely the case where the adopted view *is* `views[0]` → the adoption writes nothing; the fallback answers. → Task 1.
- `nexus:state` (`Core/Nexus/handlers.ts:102-111`) is a pure read, and the hard rule is that the read path is read-only by construction → the import belongs in `openNexusSequence`, beside `if (await replaySchemaCascade(root)) await refreshAfterWrite(root)` (`handlers.ts:70`). → Task 2.
- `useResizeFrame`'s `onChange` is `(next, phase)` and fires per pointer move → any persist gates on `phase === 'drop'`, the gate `App.tsx:59,66` already uses. → Task 7.
- `packDevicePrefs` (`devicePrefs.ts:10`) drops a top-level `false` but never a truthy object, and `devicePrefs:load`/`save` already carry an arbitrary object → panes, disclosure, and window sizes are nested keys on the existing rail, not a new scope or channel. → Tasks 5, 6, 7.
- `devicePrefs:load` returns `NO_NEXUS` without a session root, and `local_state` is a table in the Nexus's own `nexus.db` → every device-local item here is per machine *per Nexus*. Ratified. → Tasks 5, 6, 7.
- `resetNexusSession` clears `devicePrefsLoaded` (`nexusSlice.ts:44`) and runs at `applyTree:144`, ahead of the flag check → the foreign-tree re-fetch already works; only the block's position relative to `set({ status: 'ready' })` needs to change. → Task 5.
- `ddl.ts:1` — a `nexus.db` version mismatch drops the file rather than migrating → the import needs no version flag; an empty scope is what "already imported" means. → Task 2.
- `remintSidecar` (`remint.ts:102-115`) already rewrites `views[].id` inside the sidecar lock → `manual_order` rides the view spread for free, and `active_view` is re-pointed in the same write. → Tasks 2, 4.

**Inherited Reasoning**

- Pane widths were placed in `localStorage` to avoid an IPC round trip per drag frame (`layoutSlice.ts:31`). The reason no longer holds: `App.tsx:59,66` gates the persist on `phase === 'drop'`, so it is one write per drag either way.
- `page_order` and `manual_order` stay two fields on purpose. `page_order` is the container's canonical child order, shared with the sidebar and every other view; `manual_order` is one view's tiebreaker under a sort or a group, where a drag expresses a preference about that view alone and must not reorder the container for everyone. What retires is the fork in *placement*, not the fork in meaning.
- One remembered size per window kind, not per entity: the `id` values are already per-kind constants, so the change is where the value lives rather than what it covers. The iteration window is a development scratchpad and keeps no size.
- A cold start now paints the sidebar at its default width during `status === 'loading'` and settles when the tree lands. Ratified over holding the first paint blank.
- Pane widths and the disclosure map are not imported across. `disclosureState.ts:1` calls them "regeneratable, not portable content," and the whole loss is one drag of each pane and one pass of re-collapsing — an import module and its test to rescue two numbers and a boolean map is more code than the thing it saves.

**Grounding** *(re-open these; don't cite them)*

- `Core/Platform/localState.ts` — the `Scope` union, and `writeKey(scope, key, null)` as the delete.
- `Core/Nexus/schemas.ts:36-55` · `Core/Nexus/readNexus.ts:196-250` · `Core/Nexus/watchPatch.ts:315-335` · `Core/Nexus/treePatch.ts:52-107` · `Core/Nexus/tree.ts:45-62` — the ten places a container sidecar field is named today.
- `Core/Pages/setDisclosureLock.ts` · `Core/Nexus/mutatePatch.ts:128` · `Core/Session/nexusSlice.ts:217` · `Core/Nexus/treePatch.ts:477-485` — the mutate rail Task 1 rides.
- `Core/Views/Pipeline/pickView.ts:17-26` · `Core/Views/Host/useActiveView.ts` · `Core/Views/Host/viewMint.ts` · `Core/Session/store.ts:46-47` — the active-view readers and the sentinel adoption.
- `Core/Views/views.ts:80-114,139-144` · `Core/Views/Host/useViewHost.ts:75,103-144,226-239` · `Core/Views/Pipeline/sort.ts:180-188` — the view record, the fold, the resolver.
- `Core/Views/Host/useViewOrders.ts` · `Core/Views/Host/useViewCreation.ts:37-38,47,114-126` · `Core/Views/Table/TableView.tsx:1038-1069` · `Core/Views/Cards/CardsView.tsx:490-532` — the write sites.
- `Core/Session/layoutSlice.ts` · `Core/Interface/Sidebar/disclosureState.ts` · `Core/Interface/Sidebar/Sidebar.tsx:234-240` · `Core/Interface/App.tsx:36-67` — the browser-storage holdouts.
- `Core/Session/configSlice.ts:54-58` · `Core/Settings/devicePrefs.ts` · `Core/Session/nexusSlice.ts:38-52,141-171` — the device-preference rail.
- `UIX/Windows/window-base.tsx:24-37,98-111` · `UIX/Interactions/ResizeFrame.tsx:24-34,119-133` — the module map and the phase-carrying callback.
- `Core/Nexus/handlers.ts:43-111` · `Core/Nexus/treeIndex.ts:145` · `Core/Nexus/remint.ts:50-164` — the open sequence, the id→node lookup, and remint.
- `.claude/Guidelines/` — read before planning in this domain.

**Environment**

- Plan directory `.claude/Planning`. Spec input: the D-1 ruling, restated above; no separate decision log exists.
- Explorer, research, code-review, attack, verifier, and simplification slots all resolve to background Opus agents dispatched with a named return format — this project designates no per-role agent, and the fallback is taken deliberately. Gate commands read from `package.json`.
- Rules directory `.claude/Guidelines`.

**Shapes:** refactor · migration · removal · user-visible

**Declared Stops**

- **Phase 5** — the residue deletions destroy the only path that recovers a pre-move `active_view` or `manual_order`. They cannot run until the user has opened the real Nexus and confirmed a chosen view and a dragged order came across.

**Global Constraints (every task inherits these):**

- Gates from the repo root, exit codes read directly, never through a pipe: `npm run typecheck` · `npm run test` · `npm run lint`.
- Formatting is Biome's — single-quote, no semicolons, a PostToolUse hook formats every TS/CSS/JSON write. Never hand-align; an Edit failing on whitespace means Biome reformatted, so re-read and retry.
- Comments are `//` line comments and reserved for a why the code can't carry. A comment that goes false is rewritten in the commit that falsifies it, never amended.
- Search before writing. A second resolver, cache, or validator means the plan is wrong — log it before proceeding.
- Out of scope everywhere: `Showcase/`; the six page-level `nexus.db` scopes the ruling holds; `UIX/Windows/window-panel.tsx`'s width map; `Mobile/` and `Sync/`.

**Made False**

| Doc | The specific claim | What makes it false | Task |
| --- | --- | --- | --- |
| `Core/Session/layoutSlice.ts:31` | "Pane widths live in localStorage rather than nexus.db: an IPC round trip per drag frame is what storing them main-side would cost (Nathan's call)." | The widths move to `nexus.db`, and the persist was already once per drop. | 6 |
| `Core/Interface/Sidebar/disclosureState.ts:1` | "Transient UI chrome — regeneratable, not portable content — so it lives in app-level localStorage, not `.nexus/`." | The file is deleted. | 6 |
| `Core/Views/handlers.ts:12` | "View SELECTION is the per-machine activeViews pointer; this is the view DEFINITION." | Selection is a sidecar field, not per-machine. | 1 |
| `Core/Views/Pipeline/pickView.ts:17` | "The per-machine active view if still present…" | The active view is sidecar-borne. | 1 |
| `Core/Views/Pipeline/sort.ts:180` | "the persisted per-machine order applies only when the view is sorted or grouped" | The order is no longer per-machine. | 3 |
| `Core/Views/Host/viewMint.ts:11` | "a sentinel adoption must land in the activeViews slice, and this module stays store-free" | The slice and the adoption's write are both deleted. | 1 |
| `UIX/Windows/window-base.tsx:28` | "A window's size outlives its exit-presence unmount, per window id; it reopens centered." | The map is deleted; the size comes in as a prop. | 7 |
| `.claude/Features/*` | Every sentence describing `activeView`, `viewOrder`, or a `localStorage` home for pane width or disclosure. | The homes change. Enumerated by Task 8's sweep across `.claude/Features/`. | 8 |

**Dead Vocabulary** *(the closing sweep, run at Task 8)*

- `rg -F "activeViews" Core` → expect 0. Legitimate hits: none.
- `rg -F "viewOrders" Core` → expect 0. Legitimate hits: none.
- `rg -F "localStorage" Core UIX` → expect 0. Legitimate hits: none — no other Core or UIX file touches it today; re-derive at Task 8 and treat any survivor as a finding.
- `rg -F "pommora." Core` → expect 0.
- Control: `rg -F "devicePrefs" Core` → 12 today. Zero here means the sweep never ran.

**Hazard Window:** Task 2 opens it — from the moment the import lands until Task 8 deletes it, the `'activeView'` and `'viewOrder'` names must stay in the `Scope` union and their `local_state` rows must not be cleared by hand, or the import has nothing to read on a machine that hasn't run it yet. Task 8 closes it.

---

### Phase 1 — Active View on the container sidecar

#### Task 1: One container-node mapper, and `active_view` on the mutate rail

**Requirement:** 1

**Why:** A chosen view is a decision about how a container presents itself, so it belongs in that container's sidecar. Adding the tenth copy of a field that is already spelled out ten times would make the next container field cost ten edits too; hoisting first makes this one cost two, and the two mappers can no longer disagree. With the field on the node, the `activeViews` store slice is a second definition of the same fact and goes.

**Now** — `rg -F "disclosure_locked|disclosureLocked" Core --glob '!*test*'` → 10, three `meta` mappers building the same object and two factories naming each field twice:

```ts
// Core/Nexus/readNexus.ts:196-206 (set) and :235-249 (collection), Core/Nexus/watchPatch.ts:317-333
// — the same eight meta keys read three times: icon, banner, heading_icon_hidden, set_order,
// page_order, views, view_button, disclosure_locked.
viewButton: coerceViewButton(meta.view_button),
disclosureLocked: meta.disclosure_locked === true,
// Core/Nexus/treePatch.ts:52-77 makeSetNode · :81-107 makeCollectionNode — arg type and body
disclosureLocked?: boolean
disclosureLocked: f.disclosureLocked ?? false,

// The active view, per-machine today: rg -F "activeViews" Core --glob '!*test*' → 11
// Core/Contract/bridge.ts:63-64 · Core/Interface/handlers.ts:94-95 — the channel pair
// Core/Session/cacheSlice.ts:54-58 — the slice and its only writer
// Core/Session/nexusSlice.ts:110-112 — seeded in the startup Promise.all
// Readers: Views/Host/useActiveView.ts:14 · Settings/ViewFrame.tsx:67 ·
//   Settings/SettingsFrame.tsx:91 · Session/store.ts:47 · Views/Host/viewMint.ts:48
```

**Becomes** — one mapper, one new field, one mutate op, no slice:

```ts
// Core/Nexus/containerFields.ts (new) — the one reader of a container sidecar's meta.
// treePatch.ts:273-291 constructs from a CREATE REQUEST, not from meta, and is left alone.
export function containerFieldsFrom(meta: Record<string, unknown>): ContainerFields
// Spread into makeSetNode / makeCollectionNode at all three call sites; the factories keep
// their explicit arg types, so activeView is named twice there and once here — 3, not 10.

// Core/Nexus/schemas.ts — on BOTH pageCollectionSidecar and pageSetSidecar
active_view: z.string().optional(),
// Core/Nexus/tree.ts — on BOTH CollectionNode and SetNode
activeView?: string
// An id naming no view in `views` is carried verbatim; pickView already falls back.

// Core/Pages/mutateRequest.ts — beside setDisclosureLock
| { op: 'setActiveView'; path: string; kind: MutableContainerKind; viewId: string }
// Core/Pages/setActiveView.ts (new) — the shape of setDisclosureLock.ts:
// rmwJsonStrict + setOrDrop(cur, 'active_view', req.viewId) under the sidecar lock
// Core/Nexus/mutatePatch.ts and Core/Session/nexusSlice.ts — beside case 'setDisclosureLock'
case 'setActiveView':
  patched = patchNodeInTree(cur, req.path, { activeView: req.viewId })
// Core/Nexus/treePatch.ts:477-485 — activeView joins the patch union, container kinds only
// Core/Views/Host/useActiveView.ts — passes source.activeView to pickView; the slice goes.
// Core/Views/Host/viewMint.ts — the sentinel adoption writes NOTHING: after the mint the
// adopted view IS views[0], which pickView already returns. wireViewAdopted, onViewAdopted,
// the wasSentinel branch, and Core/Session/store.ts:46-47 all go with it.
```

**Assumed by:** Task 2 (the import writes `active_view`; remint re-points it).

**Verify — Automated**

- [ ] Red first: a `Core/Nexus` round-trip case that a sidecar carrying `active_view` decodes onto the node identically through `readNexus` and through `watchPatch`. Expect 2 failures on an undefined property.
- [ ] **The crossing test:** the two mappers agree — the same case asserts every one of the nine container fields matches between the two paths, so a future field added to one alone goes red.
- [ ] A `useActiveView` case that an unknown `active_view` falls back to `views[0]`, an absent one does the same, and a container with no views mints the sentinel.
- [ ] A `nexusSlice` case that `setActiveView` patches the node before the confirming push. Red with the `patchNodeInTree` case removed.
- [ ] A `viewMint` case that a sentinel adoption issues exactly one channel call — `views:save` — and no active-view write.
- [ ] The eight test files mocking `activeViews:get`/`activeViews:set` are updated, not deleted: `rg -l "activeViews:" Core` → 0.
- [ ] `rg -F "activeViews" Core` → 0, and `rg -F "activeView" Core/Nexus` → 3. Control: `rg -F "setDisclosureLock" Core` → 6.
- [ ] Full gate green. `Scope`'s `'activeView'` name still stands — Task 2 needs it.

#### Task 2: Import the two retiring scopes during the open

**Requirements:** 1, 2, 5

**Why:** The rows already in `local_state` are choices a person made; the move is only complete if they arrive in the new home. Both scopes are imported in one pass because both land in the same sidecar, and one write per container is the difference between one watcher event and two. Remint's device-row copies for the same two facts become redundant with the sidecar copy it already performs.

**Now** — one union name per scope, remint's two copy blocks, and the open sequence's existing one-time-write idiom:

```ts
// Core/Platform/localState.ts:6-7 — the Scope names, held open by the Hazard Window
// Core/Nexus/remint.ts:147-153 — inside copyDeviceRows, keyed by minted view id
for (const [old, minted] of viewIds) {
  const order = readKey<string[]>('viewOrder', old)
  if (order !== null) writeKey('viewOrder', minted, order)
}
const active = readKey<string>('activeView', target.id)
const moved = active === null ? undefined : viewIds.get(active)
if (moved) writeKey('activeView', fresh, moved)
// Core/Nexus/handlers.ts:70 — the idiom, inside openNexusSequence's root-changed branch
if (await replaySchemaCascade(root)) await refreshAfterWrite(root)
```

**Becomes** — one import beside that idiom, and remint carrying both for free:

```ts
// Core/Nexus/importPlacedState.ts (new) — id→node through nodesOf (Core/Nexus/treeIndex.ts:145),
// never its own walk. One locked sidecar write per affected container, carrying both scopes:
// active_view from the activeView row keyed by CONTAINER id, and manual_order onto each view
// record whose id matches a viewOrder row. Each imported row is then deleted with
// writeKey(scope, key, null). An id no container claims keeps its row — it may be excluded,
// not gone. Idempotent: an emptied scope is a no-op. Returns whether anything was written.
export async function importPlacedState(root: string): Promise<boolean>
// Core/Nexus/handlers.ts — beside the cascade, inside the same root-changed branch:
if (await importPlacedState(root)) await refreshAfterWrite(root)

// Core/Nexus/remint.ts — inside remintSidecar's locked write, after the views[].id rewrite:
if (typeof next.active_view === 'string')
  next.active_view = viewIds.get(next.active_view) ?? undefined
// manual_order rides remintSidecar's existing { ...v, id: minted } spread. Both copy blocks in
// copyDeviceRows go; it no longer needs viewIds, so writeFreshId's Map|null collapses to boolean.
```

**Assumed by:** Task 8 (deletes the import and both `Scope` names).

**Verify — Automated**

- [ ] Red first: an import case over a two-container tree, each container holding an `activeView` row and two views with `viewOrder` rows — every value lands in its sidecar, every row is gone after, each container's sidecar is written once, and a second run writes nothing. Expect 4 failures, module not found.
- [ ] The degenerate cases: an empty scope writes nothing and triggers no `refreshAfterWrite`; a container id and a view id absent from the tree each keep their row untouched; a container whose sidecar refuses the write keeps its rows.
- [ ] `remint.test.ts:217-300` rewritten to assert `active_view` and `manual_order` on the copy's sidecar rather than on device rows, and that the pointer names the minted id. Red with the re-point line removed.
- [ ] `rg -F "readKey('activeView'" Core` → 0 and `rg -F "readKey<string[]>('viewOrder'" Core` → 0. Control: `rg -F "readKey(" Core` → re-derive.
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
- [ ] The hazard window opened by Task 2 stays open by design; it is not closed here.
- [ ] One smoke launch: `env -u ELECTRON_RUN_AS_NODE POMMORA_DEBUG_PORT=9333 npm run dev`.
- [ ] Progress hashes filled in; lessons written into the later tasks they change.
- [ ] Not a declared stop — Phase 2 opens automatically and Task 2's user box carries to Completion Criteria.

---

### Phase 2 — Manual order in the view record

#### Task 3: `manual_order` on the view, written by every drop site

**Requirement:** 2

**Why:** A drag under a sort is a preference about that view, so it belongs in that view's record. The field, the fold, and the write sites land together because a repointed resolver with the old writers still in place would persist an order nothing reads.

**Now** — the field set, the state list, the resolver, and `rg -F "persistViewOrder" Core --glob '!*test*'` → 9 across five files:

```ts
// Core/Views/views.ts:91,139-144 — collapsed_groups is the only view-state key today
const VIEW_STATE_KEYS = ['collapsed_groups'] as const
export function pickViewState(view: SavedView): ViewState {
  return { collapsed_groups: view.collapsed_groups }
}
// Core/Views/Host/useViewHost.ts:103-118 — three overrides fold into liveView and self-clear
// Core/Views/Host/useViewHost.ts:136-144 — the resolver's third argument
const structuralOrder = groupPropId === undefined && sortKeys === 0
const manualOrder = locationFsOrder ? undefined
  : resolveManualOrder(sortedOrGrouped, manualOverride, structuralOrder ? undefined : viewOrders[view.id])
// Core/Views/Host/useViewOrders.ts — the whole file: a per-mount fetch of every view's order
// Core/Views/Host/useViewHost.ts:75,316-317,365-366 — created, passed on, returned
// Core/Views/Host/useViewCreation.ts:37-38,124-125 — two config fields, one splice
// Core/Views/Table/TableView.tsx:1048,1067 · Core/Views/Cards/CardsView.tsx:504,529
```

**Becomes** — a fourth field, a fourth override under the resolver's own predicate, and one writer:

```ts
// Core/Views/views.ts — beside collapsed_groups, with element-filtering in the codec
manual_order?: string[]
const VIEW_STATE_KEYS = ['collapsed_groups', 'manual_order'] as const
// pickViewState carries both — a locked tile still holds a manual order, as collapse already does.

// Core/Views/Host/useViewHost.ts — liveView folds manual_order under the SAME structuralOrder
// guard the resolver uses, so a structural reorder's manualOverride can never be written into
// manual_order by an unrelated persist.
...(!structuralOrder && manualOverride ? { manual_order: manualOverride } : {}),
// the catch-up effect gains its fourth clause:
if (manualOverride && sameIds(manualOverride, view.manual_order ?? [])) setManualOverride(null)
// the resolver's third argument becomes structuralOrder ? undefined : view.manual_order

// Every drop site: persistView({ manual_order: <ids> }, { viewState: true }). The base for a
// splice is liveView.manual_order, which the fold keeps current across successive gestures
// without waiting for the confirming push.
// useViewCreation's config drops viewOrders and persistViewOrder for persistView itself —
// the config already carries toggleCollapse, the same closure by another name.
// Core/Views/Host/useViewOrders.ts, and the bridge/handler pair at bridge.ts:65-66 and
// handlers.ts:96-97 — deleted.
```

**Assumed by:** Task 4 (remint's copy loop; the import writes the same field).

**Verify — Automated**

- [ ] Red first: a `useViewHost` case that a reorder under a sort puts the ids in `manual_order` on the saved view, and that a structural reorder leaves `manual_order` untouched while writing `page_order`. Expect 2 failures.
- [ ] **The crossing test:** the fold and `resolveManualOrder` agree — a case that toggles a group collapse while a structural `manualOverride` is live and asserts the saved view carries no `manual_order`. Red with the `!structuralOrder` guard removed from the fold.
- [ ] A `useViewCreation` case that two creates in succession, before any tree push, produce a `manual_order` containing both new ids in gesture order — the case the deleted local echo used to cover.
- [ ] A `CardsView` and a `TableView` case each: a cross-band drop under a sort writes `manual_order`; the same drop on a structural view does not.
- [ ] The degenerate cases: `manual_order` absent → the resolver returns undefined; present but empty → the same; a non-string element is dropped, not the whole array. A locked tile's state-only write still carries `manual_order`.
- [ ] `rg -F "persistViewOrder" Core` → 0, `rg -F "useViewOrders" Core` → 0, `rg -F "viewOrders" Core` → 0. Control: `rg -F "persistView(" Core` → re-derive.
- [ ] Full gate green. `Scope`'s `'viewOrder'` name still stands — the import reads it.

#### Task 4: Remint carries the order without copying it

**Requirement:** 2

**Why:** Task 2's import already reads the `viewOrder` scope into view records, and Task 3 gave remint's sidecar copy a field that rides its existing spread. What remains is the device-row loop, which now writes to a home nothing reads.

**Now** — whatever Task 2 left of `copyDeviceRows`, re-derived at execution:

```ts
// Core/Nexus/remint.ts — re-run `rg -F "viewIds" Core/Nexus/remint.ts` before editing.
// Task 2 removed both copy blocks; this task confirms the residue and collapses the signature.
```

**Becomes** — the parameter and the return type follow the deletions:

```ts
// copyDeviceRows(target, fresh) — viewIds is no longer a parameter
// writeFreshId returns boolean; remintSidecar's Map|null collapses, since viewIds is now
// internal to the locked write that uses it.
```

**Verify — Automated**

- [ ] A `remint` case that a copied container's `manual_order` names the same page ids as the original's, on the minted view record. Red with the `views[].id` spread narrowed to drop unknown keys.
- [ ] `rg -F "COPY_SCOPES" Core/Nexus/remint.ts` → 1, and the array holds only the seven page-level scopes the ruling keeps.
- [ ] `rg -F "viewIds" Core` → re-derive; every survivor is inside `remintSidecar`. Control: `rg -F "copyDeviceRows" Core` → 2.
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
- [ ] Not a declared stop — Phase 3 opens automatically and Task 4's user box carries to Completion Criteria.

---

### Phase 3 — Browser storage into the device store

#### Task 5: `DevicePrefs` gains its three machine-local shapes, seeded before the paint

**Requirement:** 3

**Why:** All three values are true of the machine, and the store already has a rail for exactly that. Seeding must precede `status: 'ready'`, or the sidebar paints at its default and jumps a second time when the tree lands.

**Now** — one optional boolean, loaded behind a flag at the tail of `applyTree`:

```ts
// Core/Settings/devicePrefs.ts:3-12 — packDevicePrefs drops top-level undefined, null and false
export interface DevicePrefs { nativeMenus?: boolean }
// Core/Session/nexusSlice.ts:141-171 — order today
if (prevRoot !== undefined && prevRoot !== incoming.nexus.rootPath) resetNexusSession()  // :144
const tree = stabilize(incoming, get().tree)                                             // :146
set({ status: 'ready', tree })                                                           // :147
// … 18 lines of reconcile and theme work …
if (!devicePrefsLoaded) { devicePrefsLoaded = true; … }                                  // :166-170
```

**Becomes** — three nested keys, and the same block five lines earlier:

```ts
// Core/Settings/devicePrefs.ts — nested BECAUSE packDevicePrefs drops a top-level false and a
// disclosure map is mostly false; a truthy object survives whole.
export interface DevicePrefs {
  nativeMenus?: boolean
  panes?: { sidebar?: number; inspector?: number }
  disclosure?: Record<string, boolean>
  windows?: Record<string, { w: number; h: number }>
}
// Core/Session/nexusSlice.ts — the existing devicePrefsLoaded block moves from :166 to between
// :146 and :147, so the first ready paint carries the stored values. The flag stays: it is what
// keeps a push-driven applyTree from round-tripping, and resetNexusSession:44 already clears it
// on the foreign-tree branch at :144, which runs first.
```

**Assumed by:** Task 6 (`panes`, `disclosure`), Task 7 (`windows`).

**Verify — Automated**

- [ ] Red first: a `devicePrefs` case that a nested `false` survives `packDevicePrefs` and a top-level one does not. Expect 1 failure.
- [ ] A `nexusSlice` case that `devicePrefs` is populated before `status` becomes `'ready'`. Red with the block moved back below the `set`.
- [ ] A `nexusSlice` case that a foreign tree arriving by push re-fetches, and that a same-root push does not — the flag's both halves.
- [ ] The degenerate cases: `devicePrefs:load` returning `null`, and returning a `NO_NEXUS` failure, both leave the defaults standing rather than throwing.
- [ ] `rg -F "devicePrefsLoaded" Core` → 3. Control: `rg -F "devicePrefs" Core` → re-derive.
- [ ] Full gate green.

#### Task 6: The panes and the sidebar read the store, and `localStorage` goes

**Requirements:** 3, 6

**Why:** With the values in the store before first paint, the two browser-storage readers are the last thing holding Pommora state in the browser. Neither value is imported: both regenerate in a gesture, and a rescue module would be more code than the thing it saves.

**Now** — `rg -F "localStorage" Core UIX` → 6 across three files:

```ts
// Core/Session/layoutSlice.ts:31-45,70-79 — storedWidth at construction, setItem on drop
export const SIDEBAR_WIDTH = { min: 180, max: 380, def: 240, key: 'pommora.sidebarWidth' }
export const INSPECTOR_WIDTH = { min: 240, max: 420, def: 300, key: 'pommora.inspectorWidth' }
// Core/Interface/Sidebar/disclosureState.ts — the whole file, plus its test
// Core/Interface/Sidebar/Sidebar.tsx:234-240 — loadOpen at mount, saveOpen on toggle
```

**Becomes** — the store on both sides, written through the existing `setDevicePref`:

```ts
// Core/Session/layoutSlice.ts — the bounds keep min/max/def and lose `key`; the slice starts at
// def and Task 5's seed sets it. persistPaneWidths writes one pref:
setDevicePref('panes', { sidebar: get().sidebarWidth, inspector: get().inspectorWidth })
// Core/Interface/Sidebar/Sidebar.tsx — open comes from the store, written the same way:
const stored = useSession((s) => (persistKey ? s.devicePrefs.disclosure?.[persistKey] : undefined))
// setAndSave merges one key into the disclosure map through setDevicePref.
// Core/Interface/Sidebar/disclosureState.ts and disclosureState.test.ts — deleted.
// The three pommora.* keys are left behind, cleared by hand; nothing reads them.
```

**Verify — Automated**

- [ ] Red first: a `layoutSlice` case that a drop writes one `devicePrefs` pref carrying both widths, and a `Sidebar` case that a toggle merges one key without clobbering its siblings. Expect 2 failures.
- [ ] The degenerate cases: a stored width outside `min`/`max` is clamped on read; an absent `panes` or `disclosure` leaves the defaults standing; a `disclosure` entry for a key no group claims is ignored, not rendered.
- [ ] `rg -F "localStorage" Core UIX` → 0. Control: `rg -F "useSession" Core/Interface` → re-derive.
- [ ] Full gate green.

**Verify — User**

- [ ] Sidebar and inspector widths, and the sidebar's collapsed groups, come back after a restart — with a single settle as the Nexus paints, not a jump afterward. On the first launch only, both open at their defaults.

#### Gate 3 — nothing of Pommora's is in the browser

- [ ] Gate commands green, exit codes read directly.
- [ ] Every task's **Verify — automated** list ticked, each against a result just watched.
- [ ] Every Now count re-run against its control; counts matched, or the divergence rewrote the plan.
- [ ] Every task that diverged had its dependents re-derived and rewritten.
- [ ] Simplification, then code review, dispatched against `<base>..HEAD` scoped to this phase's paths.
- [ ] Every concern fixed, or carrying an explicit user ruling recorded in the Log.
- [ ] One smoke launch.
- [ ] Progress hashes filled in; lessons written into the later tasks they change.
- [ ] Not a declared stop — Phase 4 opens automatically and Task 6's user box carries to Completion Criteria.

---

### Phase 4 — Window size into the device store

#### Task 7: UIX takes the size as a prop; Core remembers it

**Requirements:** 3, 4

**Why:** UIX reaches nothing outside itself, so it can hold a size but never persist one. Handing the value in and the change back leaves the decision to Core, where the store is. Both halves land together: the map's deletion without its replacement is a commit in which no window remembers anything.

**Now** — a module map and the `id` prop that exists only to key it:

```ts
// UIX/Windows/window-base.tsx:28-37,74,98,108
const sizes = new Map<string, Size>()
const opening = (id: string, bounds: WindowBounds): Rect => { … sizes.get(id) ?? bounds.def … }
const [geo, setGeo] = useState(() => opening(id, bounds))
onChange: (next) => { sizes.set(id, { w: next.w, h: next.h }); setGeo(next) }
// `id` has no other reader. The six call sites, ids already per-kind constants:
// SettingsWindow.tsx:722 'settings' · WebWindow.tsx:86 'web-browser' ·
// PageWindow.tsx:143 'page-window' · NavWindow.tsx:128 'navwindow' ·
// PageHistoryWindow.tsx:214 'page-history' · IterationWindow.tsx:13 'iteration'
```

**Becomes** — two optional props, the persist gated on the drop, and one Core hook:

```ts
// UIX/Windows/window-base.tsx — id, sizes and opening all deleted
initialSize?: Size          // absent → bounds.def
onSizeChange?: (s: Size) => void
// The frame's callback keeps its phase argument, which is what stops one write per pointer move:
onChange: (next, phase) => {
  setGeo(next)
  if (phase === 'drop') onSizeChange?.({ w: next.w, h: next.h })
}

// Core/Interface/Windows/useWindowGeometry.ts (new) — UIX cannot reach Core, and five sites
// need identical wiring. Reads s.devicePrefs.windows?.[id]; writes through setDevicePref, the
// same rail as panes and disclosure — no new scope, channel, or handler.
export function useWindowGeometry(id: string): { initialSize?: Size; onSizeChange: (s: Size) => void }
// Spread at the five ruled windows. IterationWindow passes neither prop: a development
// scratchpad opens at its default every time.
// A stored entry whose w or h is not a finite number is ignored — isGlanceSize
// (Core/Contract/validators) already answers that shape; do not write a second one.
```

**Verify — Automated**

- [ ] Red first: a UIX case that an absent `initialSize` opens at `bounds.def`, that a given one opens at that size, and that a drag calls `onSizeChange` exactly once — on drop, not per move. Expect 3 failures.
- [ ] **The negative control:** with the `phase === 'drop'` guard removed, the once-per-drag case goes red.
- [ ] A hook case that a stored size is returned as `initialSize` and that a change writes one entry under that id, leaving sibling ids intact.
- [ ] The degenerate cases: a press that moves nothing calls back not at all; no stored entry → `initialSize` undefined; a malformed entry is ignored rather than passed through.
- [ ] `rg -F "sizes.set" UIX` → 0 and `rg -F "id=" UIX/Windows/window-base.tsx` → 0. Control: `rg -F "WindowBase" Core` → 6.
- [ ] Full gate green.

**Verify — User**

- [ ] Resize the Settings window and a Page window, quit, reopen — each returns at its size. Two Page windows in a row open at the same remembered size. The iteration window (⌘⇧T) opens at its default every time.

#### Gate 4 — windows hold their size

- [ ] Gate commands green, exit codes read directly.
- [ ] Every task's **Verify — automated** list ticked, each against a result just watched.
- [ ] Every Now count re-run against its control; counts matched, or the divergence rewrote the plan.
- [ ] Simplification, then code review, dispatched against `<base>..HEAD` scoped to this phase's paths.
- [ ] Every concern fixed, or carrying an explicit user ruling recorded in the Log.
- [ ] One smoke launch.
- [ ] Progress hashes filled in; lessons written into the later tasks they change.
- [ ] Not a declared stop — Phase 5 is, and it opens only on the user's word.

---

### Phase 5 — Residue

#### Task 8: Delete the import and the scopes it emptied

**Requirement:** 6

**Why:** The import exists to carry one machine's rows across once. Once the user has confirmed they arrived, it and the two `Scope` names are code with nothing left to vary.

**Now** — the inventory, bucketed:

```ts
// DEAD REGARDLESS — nothing reads them once the rows are gone:
//   Core/Nexus/importPlacedState.ts + test, and its call site in openNexusSequence
//   Core/Platform/localState.ts — the 'activeView' and 'viewOrder' names
//   Core/Platform/localState.test.ts — the cases keyed on those two names
// DEAD BY STANDING RULE — the ruling places nothing there:
//   the pommora.sidebarWidth / pommora.inspectorWidth / pommora.sidebar.disclosure keys,
//   cleared by hand from the running instance; no code references them after Task 6.
// NEVER DELETE — outside this plan by the ruling:
//   folds · headingCols · headingIcon · citations · embedHeights · embedZooms · aliases ·
//   linkTitle · tabs · windows · recents · record · glancePane · devicePrefs
// ORDER — the import goes first: deleting a Scope name while the import still reads it is a
// compile error, and the compile error is the point.
```

**Becomes** — the import gone, the union two names shorter, every falsified document rewritten:

```ts
// Core/Nexus/handlers.ts — the importPlacedState call in openNexusSequence goes
// .claude/Features/* — every sentence naming activeView, viewOrder, or a localStorage home for
// pane width or disclosure, rewritten to the placement that now holds. Enumerate with
// `rg -l "activeView|viewOrder|localStorage|per-machine" .claude/Features` before editing.
```

**Verify — Automated**

- [ ] The whole Dead Vocabulary sweep at zero against its control.
- [ ] `rg -F "'activeView'" Core` → 0 and `rg -F "'viewOrder'" Core` → 0. Control: `rg -F "'folds'" Core` → re-derive.
- [ ] Full gate green, and one smoke launch on a Nexus whose scopes are already empty.

**Verify — User**

- [ ] Everything Phases 1–4 asked for still holds after the deletions, on the real Nexus.

#### Gate 5 — nothing left with nothing to vary

- [ ] **Declared stop.** This phase opens only once the user has confirmed, against the real Nexus, that a chosen view and a dragged order came across.
- [ ] Gate commands green, exit codes read directly.
- [ ] The hazard window Task 2 opened is closed here.
- [ ] Simplification, then code review, dispatched against `<base>..HEAD`.
- [ ] Every concern fixed, or carrying an explicit user ruling recorded in the Log.
- [ ] Every document in Made False rewritten in the commit that falsified it.

---

## Implementation Log

### Progress

- [ ] **Phase 1** — Active View on the container sidecar · base `<commit>`
  - [ ] Task 1 — One container-node mapper, and `active_view` on the mutate rail · `<commit>`
  - [ ] Task 2 — Import the two retiring scopes during the open · `<commit>`
- [ ] **Phase 2** — Manual order in the view record
  - [ ] Task 3 — `manual_order` on the view, written by every drop site
  - [ ] Task 4 — Remint carries the order without copying it
- [ ] **Phase 3** — Browser storage into the device store
  - [ ] Task 5 — `DevicePrefs` gains its three machine-local shapes, seeded before the paint
  - [ ] Task 6 — The panes and the sidebar read the store, and `localStorage` goes
- [ ] **Phase 4** — Window size into the device store
  - [ ] Task 7 — UIX takes the size as a prop; Core remembers it
- [ ] **Phase 5** — Residue
  - [ ] Task 8 — Delete the import and the scopes it emptied

### Rulings

- **09-07-2026, Nathan:** Per-Nexus granularity accepted for pane widths, sidebar disclosure, and window size. `local_state` and `devicePrefs` are both bound to a session root, so all three are per machine *per Nexus*, not per machine.
- **09-07-2026, Nathan:** The cold-start settle is accepted. `devicePrefs` is read before `status: 'ready'` so the ready paint carries the stored widths; the `loading` state still shows the default, and the pane settles once as the Nexus appears. Holding the first paint blank was rejected.
- **09-07-2026, Claude:** `active_view` rides the `mutate` rail (`setDisclosureLock`'s precedent) rather than `container:configure`, which has no optimistic tree patch and would make a view switch wait on disk. This retires the `activeViews` store slice outright rather than replacing it with a catch-up override layer.
- **09-07-2026, Claude:** `WindowKind` does not exist in the codebase; the D-1 ruling asserted it. No union is introduced — the five window ids are already literals at their call sites, and `useWindowGeometry` keys on them directly.
- **09-07-2026, Claude:** No new `windowGeometry` scope or channel pair. Window size is a nested key on `devicePrefs`, the rail panes and disclosure are already joining — one place to look for a machine-local preference rather than two.
- **09-07-2026, Claude:** Pane widths and the disclosure map are not imported from `localStorage`. Both regenerate in a gesture; the cost of the move is one drag of each pane and one pass of re-collapsing, on the first launch after Task 6 only.
- **09-07-2026, Claude:** The `'activeView'` and `'viewOrder'` Scope names survive through Phase 4 and are deleted in Task 8, because the import that reads them is the only thing that recovers a pre-move value on a machine that has not opened yet.

### Open Against Later Tasks

### Deviations

### Lessons

### Sequenced After

- `UIX/Windows/window-panel.tsx:14` keeps the module-map-keyed-by-window-id pattern Task 7 deletes from `window-base.tsx`. The ruling places panel width nowhere, so it stays session-only and out of scope here — but after Phase 4 it is the last one of its kind in UIX.

### Closeout

---

## Completion Criteria

**The directive**

```
Execute .claude/Planning/State Placement — Implementation Plan.md.
Live-verify: the Phase 5 declared stop — a chosen view and a dragged order under a sort
  surviving a restart on the real Nexus, plus pane widths, disclosure, and a window size.
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
- [ ] One mapper reads a container sidecar's meta; the crossing test proves the two paths agree.
- [ ] The fold and `resolveManualOrder` agree on one `structuralOrder` predicate, proven by its crossing test.
- [ ] No persist fires per pointer move; every geometry write is gated on `phase === 'drop'`.
- [ ] One rail for machine-local preferences — no second scope, channel, or handler was added.
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
