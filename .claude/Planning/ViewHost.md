## ViewHost — One View Host in the View Seat (Bundle 6)

> **Status:** written, pending review · Spec: [[Codebase-Cleanup-Checklist]] Bundle 6 + the session's rulings (08-31-2026) · Execute tasks in order.
> Citations name files and symbols; re-derive before editing. All paths are `Pommora/src/renderer/` unless rooted.

**Goal**

One `useViewHost(source)` hook, seated in the renamed `ViewHost` component, owns everything a view renderer needs before it can draw: value load/override/epoch, schema, the active view, viewOrders + manual order, the optimistic order/hidden/style patch layers, band ordering, collapse state, the pipeline invocation and its derived maps, the commit writers, view persistence under one fold law, the creation engine's shared config, and the loading/empty decision. `TableView` keeps its column machinery and gestures; `CardsView` keeps its grid and pickers. A future renderer (List, Gallery, Calendar, Timeline) mounts the host and writes presentation only.

The shape: a single hook returning one `ViewHostApi` object, passed to the mounted renderer as a `host` prop. A context provider was weighed and rejected — two consumers, no cross-tree need. Building the host beside the renderers (each keeping its own copy until "someday") was rejected — the drift between the two copies is already four observable defects, and a third copy per future view compounds it. Nathan ratified the shape, the root-state wording ("Loading…" / "No pages here", shared at the root), write silence (also a stamped checklist ruling), the Cards behavior changes the unification implies, and the host-owned fold contract, 08-31-2026.

Not solving here: virtualization, the four unbuilt view types themselves, RendererRework's styling rows (the `.css` → `.css.ts` migration and kebab renames stay put; the empty-state style relocation is the only sheet touch), and any change to what persists where (nexus.db vs sidecar vs tile payload).

**Requirements**

1. `useViewHost(source)` in `Views/useViewHost.ts`, seated in `Views/ViewHost.tsx` (the renamed `ViewRenderer`), owning the machinery enumerated in the Goal — each piece existing exactly once.
2. The optimistic `property_order` / `hidden_properties` / `column_styles` patch layers are host-owned generic layers; Cards thereby gains the optimistic behavior, the `sameIds` catch-up drop, and collapse riding every save (signed behavior changes). Width/align stay Table-local.
3. `persistView` preserves the `mergeOverrides` law for both renderers: host layers + collapse fold into every save, a renderer's fold adds its local layers at fire time, the explicit patch wins last, styles fold per-key.
4. The renderer seam is exactly `foldOverrides?` · `bandBucket` · `viewRootRef` · `onCreated` plus presentation; everything else arrives on `host`.
5. Loading and empty decided once at the root: "Loading…" while `ctx` is null; "No pages here" when the pipeline yields no groups and the container has no Sets; a sets-only container mounts its renderer (Cards' set cards, Table's band grid). Write silence stands.
6. `Properties/Editing/` → `Properties/Assignment/` and `ViewRenderer` → `ViewHost` land first, so the host seats imports at final addresses (RendererRework's ruled rows, taken 08-31-2026).
7. Cards' parallel `resolveColumns` call dies; the pipeline's `columns` output is the one column resolution renderers consume.
8. Net comment-line count across the touched Views files strictly decreases; zero newly-authored comments (relocated whys allowed); `KNOB` markers survive.
9. The record: ContextPM's Open Call retired, the checklist bundle struck, RendererRework's landed rows deleted, ViewTypesPM reconciled, Line-Ledger refreshed, History entry written.

**Acceptance — the whole thing working:** With the app open on a real Collection: Table and Cards each driven through the bundle's own list — grouped and ungrouped, band drag, collapse, value edit, view switch — plus loading on a slow Collection and the empty state on an empty one, painted identically by the root seat in both renderers. And the paper test: sketch the List view — the `host` object plus the four-field seam suffice, with zero preamble effects copied from Table or Cards.

**Forced By**

- `ViewHost` keys renderers by `source.id` (`ViewRenderer.tsx:14,16`) — a view switch never remounts → the host owns the `[view.id]` reset for host layers (Task 3); Table keeps its own `[view.id]` effect for its local column layers (Task 3); Cards' local resets ride Task 4.
- `valueOverride` clears only on a real `source.path` switch, never on `source` identity — the assign-vanish guard (`TableView.tsx:243-249`) → the host preserves those exact dependency arrays (Task 3).
- `bandPatch` deliberately survives a source-identity swap (`useBandOrdering.ts` header) → the host consumes `useBandOrdering` as-is, never re-implements it.
- The pipeline reads `liveView`, and the order/hidden/style patches feed `liveView` → those layers must be host-owned or Table's optimistic paint dies (Requirement 2's forcing fact).
- Empty Sets are present in the pipeline's `setTree` (`Pipeline/group.ts:22`) → the empty predicate must also check `source.sets`, or a sets-only container loses its set cards / band grid (Task 5).
- `useViewCreation`'s `getCfg` runs at gesture time and at the create's reply (`useViewCreation.ts:73-78`) → the host's fold ref and creation config both read fire-time state, never a render closure (Tasks 3, 4's crossing test).
- `viewMint.ts` holds deliberate module-level in-flight state wired at `store.ts:47-48` → the host calls `useSaveView`, never absorbs the mint.
- Tile-embed awareness lives inside `useActiveView` (scope short-circuit) and `useSaveView` (write target) → the host inherits both; no new scope plumbing.

**Inherited Reasoning**

- Persisted-write silence is stamped checklist policy and re-ratified this session — no refused-write feedback ships.
- A card drag in an unsorted structural view writes canonical `page_order`, location-scoped (checklist Decided Ruling, 08-21) — the host's manual-order gate keeps the structural suppression on both paths.
- Bundles 2/3's cost lesson: a seam that removes duplicated *computation* grows files; this bundle removes duplicated *text*, so the checklist's ≈−150 is the floor of an honest −150 to −280 range, reported code-only.

**Grounding** *(re-open these; don't cite them)*

- `.claude/Planning/Codebase-Cleanup-Checklist.md` — the bundle's text, cycle, verification list, and Decided Rulings.
- `.claude/Planning/RendererRework.md` — the two ruled rows Phase 1 lands; its Working Rules (delete rows on landing).
- `Views/ViewRenderer.tsx` · `Views/TableView/TableView.tsx` (1867) · `Views/CardView/CardsView.tsx` (1354) — the duplication and its drift.
- `Views/useActiveView.ts` · `useValuesEpoch.ts` · `useViewOrders.ts` · `useBandOrdering.ts` · `useViewCreation.ts` · `contextCellWrite.ts` · `TableView/viewMerge.ts` — the already-shared hooks the host composes.
- `Views/Pipeline/` — pure; the host invokes, never absorbs.
- `SurfacePM/ViewTileScope.ts` + `ViewTile.tsx:553` — the second mount path and the lock gate.

**Environment:** Plan directory `.claude/Planning/`. Explorer: Explore. Simplification: `code-simplifier` + `comment-killer-agent`. Attack: `build-breaking-agent`. Code review: `feature-dev:code-reviewer`. Neutral verifier: general-purpose. Gates: `npm run typecheck` · `npm run test` · `npm run lint`, run from `Pommora/`, exit codes read directly — never piped.

**Shapes:** refactor (baseline: the full existing suite green; behavior unmoved except the signed Cards changes and the shared root states) · fix (each drift closure sweeps its siblings and lands a pin) · user-visible (Cards' new loading/empty surfaces get the interaction sweep).

**Global Constraints (every task inherits these):**

- The three gates green per task commit; `set -o pipefail` on anything piped for display.
- Zero newly-authored comments; a hoisted block carries at most the one load-bearing why it already had; net comment-line count across `TableView.tsx` + `CardsView.tsx` + `ViewHost.tsx` + `useViewHost.ts` strictly below the Task 3 baseline at closeout (metric: full-line `//` + block-comment lines).
- `KNOB` and `(Nathan's call)` markers survive verbatim — grep before and after every simplification dispatch.
- Stage explicit paths only; bundle Nathan's unattributed doc/style edits into the task commit at hand, never revert them.
- Out of scope everywhere: `src/main`, `src/shared` (no schema or bridge change is needed), `Pipeline/` internals, `viewMint.ts`, `BandDnd.tsx`, virtualization, new view types.

**Made False**

| Doc | The specific claim | What makes it false | Task |
| --- | --- | --- | --- |
| `.claude/Features/ViewTypesPM.md` | Its account of per-renderer state (each renderer loading values, resolving its view, persisting) | The host owns that account | 8 |
| `.claude/Features/PropertiesPM.md` + `CLAUDE.md` codebase map | Any `Properties/Editing` path reference (`grep -rn "Properties/Editing" .claude Pommora/README* CLAUDE.md` at execution) | The Assignment rename | 1 |
| `.claude/Context*.md` Open Call "Cards has no loading or empty state" | — | Task 5 | 8 |
| `Codebase-Cleanup-Checklist.md` Bundle 6 | Unstruck bundle; `mergeOverrides, TableView.tsx:466-471` (stale line ref) | Landing; the strike carries the true site | 8 |
| `RendererRework.md` | The `ViewRenderer` rename row · the `Editing`/`Editors` row | Phase 1 lands both — rows deleted per its Working Rules | 8 |

**Dead Vocabulary**

- `ViewRenderer` → expect 0. Legitimate hits: none. Control: `ViewHost` → ≥ 6.
- `Properties/Editing` → expect 0 (source + docs). Control: `Properties/Assignment` → ≥ 22.
- `table-empty` → expect 0. Legitimate hits: none (class renamed `view-empty`). Control: `view-empty` → ≥ 4.
- `resolveColumns` importers outside `Pipeline/` → expect exactly `HiddenFrame.tsx` and `useViewHost.ts`. Control: `resolveView(` → ≥ 1.

---

### Phase 1 — Final Addresses

#### Task 1: `Properties/Editing/` → `Properties/Assignment/`

**Requirement:** 6

**Why:** Nathan's ruling closed RendererRework's last value-layer row: the folder that does the actual value editing is named for the act — Assignment. Landing it first means the host's imports (Task 3) seat at their final address, honoring the checklist's ordering constraint instead of deferring it.

**Now** — `grep -rl "Properties/Editing" Pommora/src/renderer --include='*.ts*'` → 22 files:

```ts
// Properties/Editing/ — Cell.tsx, PropertyEditor.tsx, PropertyPicker.tsx, cellResolve.ts,
// formatValue.ts, columnLabel.ts, … (the value-editing surface)
// Properties/Editors/ — CheckboxEditor.tsx, StatusEditor.tsx, … (unchanged: definition editors)
import { buildSetNames, buildSetIcons, buildSetPaths } from '@renderer/Properties/Editing/cellResolve'
```

**Becomes** — `git mv Pommora/src/renderer/Properties/Editing Pommora/src/renderer/Properties/Assignment`, every import rewritten:

```ts
import { buildSetNames, buildSetIcons, buildSetPaths } from '@renderer/Properties/Assignment/cellResolve'
```

**Assumed by:** Task 3 (the host imports `cellResolve` and the cell writers from the final address).

**Verify — automated**

- [ ] Gates green, exit codes read directly.
- [ ] `grep -rn "Properties/Editing" Pommora/src` → 0. Control: `grep -rln "Properties/Assignment" Pommora/src | wc -l` → ≥ 22.
- [ ] Doc references swept: `grep -rn "Properties/Editing" "../.claude" CLAUDE.md` inside the project → 0 after the same commit rewrites them.

**Verify — user**

- [ ] *(none — a rename with the type gate as its net.)*

#### Task 2: `ViewRenderer` → `ViewHost`

**Requirement:** 6

**Why:** The ruled collision row ("rename when `Views/` is next opened") — this bundle is that opening; Nathan ruled the name `ViewHost`, 08-31-2026.

**Now** — `Views/ViewRenderer.tsx` (18 lines), two callers:

```ts
// Views/ViewRenderer.tsx · Interface/ContainerView.tsx:9 · SurfacePM/ViewTile.tsx:553
export function ViewRenderer({ source }: { source: CollectionNode | SetNode }): React.JSX.Element
```

**Becomes** — `Views/ViewHost.tsx`, same body, both callers updated:

```ts
export function ViewHost({ source }: { source: CollectionNode | SetNode }): React.JSX.Element
```

**Assumed by:** Tasks 3–5 (every host edit lands in `ViewHost.tsx`).

**Verify — automated**

- [ ] Gates green. `grep -rn "ViewRenderer" Pommora/src` → 0. Control: `grep -rln "ViewHost" Pommora/src | wc -l` → ≥ 3.

**Verify — user**

- [ ] *(none.)*

#### Gate 1 — addresses final, behavior unmoved

- [ ] Gates green; every Task 1–2 box ticked against a watched result; test count unmoved from the phase base.
- [ ] Progress hashes filled in.

---

### Phase 2 — The Host

#### Task 3: `useViewHost.ts` + Table converts

**Requirement:** 1, 2, 3, 4, 8 (baseline)

**Why:** The seat itself. Table converts in the same task because a host with no consumer is unverifiable dead code, and Table is the renderer whose semantics the host adopts (its reset keys, its fold law, its catch-up drop are the documented-deliberate side of every drift pair).

**Now** — `TableView.tsx:126-330` and its writers/creation ranges hold the full preamble (≈355 lines: store reads, value stack, schema+view, viewOrders, order/hidden/style/manual overrides, band ordering, collapse, resets, `liveView`, sort/group gates, pipeline call, ctx/set maps, writers, `persistView` via `mergeOverrides`, creation config); `ViewHost.tsx` computes `schema` and `view` and throws both away. Comment baseline recorded here: `grep -c '^\s*//'` per touched file, summed.

**Becomes** — `Views/useViewHost.ts` (new, ~300 lines):

```ts
// Views/useViewHost.ts (new) — composes the existing hooks; owns no new mechanism
export interface ViewHostSeam {
  foldOverrides?: { current: (v: SavedView) => SavedView }  // fire-time; identity default
  bandBucket: (key: string) => string | null
  viewRootRef: { readonly current: HTMLElement | null }
  onCreated: (created: { id: string; path: string }) => void
}
export interface ViewHostApi {
  source: CollectionNode | SetNode
  schema: PropertyDefinition[]
  view: SavedView            // raw
  liveView: SavedView        // + host order/hidden/style patches + bandPatch
  values: Record<string, PageFrontmatter>
  effectiveValues: Record<string, PageFrontmatter>
  setValueOverride: Dispatch<SetStateAction<Record<string, PageFrontmatter> | null>>
  columns: ResolvedColumn[]  // the pipeline's — the ONE column resolution
  groups: ResolvedGroup[]
  setTree: SetTreeNode[]
  ctx: ResolveContext        // non-null by construction: the root gates on it
  contextIds: string[]
  setNames: Map<string, string>; setIcons: Map<string, string | undefined>; setPaths: Map<string, string>
  rowById: Map<string, ViewRow>; rowBand: Map<string, string>
  collapsed: Set<string>; toggleCollapse: (key: string) => void
  sortKeys: number; sortedOrGrouped: boolean; structuralGrouping: boolean; subGrouped: boolean
  groupPropId: string | undefined; groupPropType: string | undefined
  canReassign: boolean; canReorderWithin: boolean; canRelocate: boolean
  structuralOrder: boolean; dragDisabled: boolean; manualOrder: string[] | undefined
  viewOrders: Record<string, string[]>; persistViewOrder: (ids: string[]) => void
  setManualOverride: Dispatch<SetStateAction<string[] | null>>
  setOrderOverride: Dispatch<SetStateAction<string[] | null>>
  setHiddenOverride: Dispatch<SetStateAction<string[] | null>>
  setStylePatch: (colId: string, key: keyof ColumnStyle & string, value: string) => void
  hideProperty: (id: string) => void; revealProperty: (id: string) => void
  persistView: (patch: Partial<SavedView>, opts?: { viewState?: boolean }) => void
  commitBand: (patch: Partial<SavedView>) => void
  setProperty: (row: ViewRow, propertyId: string, value: PropertyValue | null) => void
  commitValue: (row: ViewRow, column: ResolvedColumn, value: PropertyValue | null) => void
  contextOptionsFor: (column: ResolvedColumn) => ContextOption[] | null
  creation: ViewCreation     // bandAdd · createAdjacent · createAfter · containerPages
  mutate: (req: MutateRequest) => Promise<boolean>
  select: SessionState['select']; tree: NexusTree
}
export function useViewHost(source: CollectionNode | SetNode, seam: ViewHostSeam): ViewHostApi | null
// null while values/ctx are loading — the component decides what loading paints.
// persistView law: saveView((seam.foldOverrides?.current ?? id)(fold(liveView, collapsed)) with
// patch spread last and styles per-key (mergeStyleRecords) — mergeOverrides' precedence, generalized.
// Resets: host layers on [view.id]; manualOverride on [source] identity; valueOverride only on
// [source.path] — the assign-vanish split, byte-for-byte the dep arrays TableView carries today.
// flattenStructural + the locationFsOrder manual-order gate derive from view.type === 'cards'.
```

`ViewHost.tsx` calls the hook per mounted renderer type and passes `host`; the seam callbacks come up from the renderer via a ref established on mount (the `getCfg` pattern `useViewCreation` already uses). `TableView` becomes `({ source, host }: { source: …; host: ViewHostApi })`: its preamble ranges delete; it keeps `widthOverride`/`alignOverride`, resize/drag/edit machinery, `dataRows`/`rowPath`/`rowGroup`/`subTargets`, its `onBandDrop` router, and assigns `host`'s fold ref to fold width/align. `viewMerge.ts` moves to `Views/viewMerge.ts` (the host consumes it; `TableView/` keeps nothing shared). Table-side tests re-harness to mount through `ViewHost`.

**Assumed by:** Task 4 (Cards consumes the same `ViewHostApi`), Task 5 (the root states read the hook's null/groups), Task 7 (comment baseline).

**Skills:** none beyond the standard cycle.

**Verify — automated**

- [ ] Red-green: a new `useViewHost` pin fails before the hook exists (module not found), then greens — covering: persist folds collapse + a live style patch + the fold-ref's width into one save with an explicit patch winning; `manualOverride` drops on a `source`-identity swap while `valueOverride` survives it; the order/hidden catch-up drop fires on `sameIds`.
- [ ] Crossing test: a persist fired after a simulated round-trip reads the fire-time fold, not the mount closure (the `useBandOrdering` hazard, now at the host's seam).
- [ ] Full gates green; the pre-existing Table suites (`bandCommits`, `cellGestures`, `useBandOrdering`, `bandDndModel`, `creationOrder`, `BandDnd`, `GroupBand`, `ViewTileScope`) green, re-harnessed but assertions unweakened.
- [ ] `grep -c '^\s*//' TableView.tsx` strictly below its Task 3 baseline.

**Verify — user**

- [ ] *(carried to Completion Criteria — Table's live gesture pass rides the phase gate's app-open list.)*

#### Task 4: Cards converts — the drift closes by construction

**Requirement:** 1, 2, 7 · the signed behavior changes

**Why:** The second consumer proves the seam; every drift pair dies because Cards now reads the host's single definition. The signed changes land here: collapse rides every Cards save, optimistic order survives tree echoes the way Table's does, the gates and creation engine read `liveView`, and the parallel `resolveColumns` dies.

**Now** — `CardsView.tsx:119-300, 340-410, 486-530` hold the twin preamble (≈340 lines), including the drift sites: `persistView` as a bare spread (`:191-193`), `manualOverride` reset on `[source.path]` (`:219`), gates off raw `view` (`:220-231`), `resolveColumns` direct (`:272-275`), no catch-up drop, no loading/empty.

**Becomes** — `CardsView({ source, host })`: preamble deleted; keeps `setOrderOverride`/`reorderSets`, zoom, FLIP ghosts, pickers, card chassis, its `onBandDrop`, its seam values (`bandBucket: identity`, `onCreated: beginRename`). `columns`, gates, writers, creation all read `host`. No Cards-side fold ref (it has no pipeline-bypassing layers).

**Assumed by:** Task 5 (both renderers now behind one seat).

**Verify — automated**

- [ ] Inverted-in-same-commit pins for the signed changes: a Cards persist mid-collapse keeps the collapse (fails against the old bare spread); Cards' held manual order survives a `source`-identity echo; a pane-side style write is not masked by a stale patch once canon catches up.
- [ ] Full gates green; Cards suites re-harnessed, assertions unweakened.
- [ ] `grep -n "resolveColumns" CardsView.tsx` → 0. Control: `grep -rn "resolveColumns" Pommora/src/renderer/Frames/HiddenFrame.tsx | wc -l` → 2.
- [ ] The paper test, written into the phase gate note: List view = host + four seam fields + presentation; any needed fifth field is a plan defect to report, not patch.

**Verify — user**

- [ ] *(carried — Cards' live gesture pass.)*

#### Task 5: The root states

**Requirement:** 5

**Why:** The loading/empty decision made once, at the seat, for every current and future renderer — the bundle's second checkbox, wording ratified.

**Now** — `TableView.tsx:1214-1215`:

```tsx
if (!ctx) return <div className="table-empty">Loading…</div>
if (groups.length === 0) return <div className="table-empty">No pages here</div>
// CardsView: no loading state, no empty state — renders an empty grid unconditionally
// .table-empty styled in TableView/TableView.css:22, Tables/table-tokens.css:8,54,
// re-styled in a tile at SurfacePM/viewTile.css.ts:167
```

**Becomes** — in `ViewHost.tsx`, before any renderer mounts; Table's returns delete:

```tsx
if (!host) return <div className="view-empty">Loading…</div>
if (host.groups.length === 0 && (source.sets?.length ?? 0) === 0)
  return <div className="view-empty">No pages here</div>
// sets-only container → the renderer mounts: Cards paints set cards, Table its band grid
// (Table's property-grouped sets-only corner changes from the message to an empty grid — disclosed, accepted)
```

`.view-empty` styled once beside `ViewHost.tsx` (`view-host.css.ts`, per R5 — no class painted by an un-emitting sheet remains); the tile override at `viewTile.css.ts:167` renames with it; the `table-empty` rules delete from both sheets.

**Assumed by:** —

**Verify — automated**

- [ ] Red-green: a `ViewHost` mount test — null host paints "Loading…", empty groups + no sets paints "No pages here", sets-only mounts the renderer — red before the seat, green after.
- [ ] `grep -rn "table-empty" Pommora/src` → 0. Control: `grep -rn "view-empty" Pommora/src | wc -l` → ≥ 4.
- [ ] Full gates green.

**Verify — user**

- [ ] Cards' loading flash and empty state look right in place (new surface — first time Cards has either).
- [ ] The empty state inside a dashboard tile still wears the tile's styling.

#### Gate 2 — one host, two renderers, drift dead

- [ ] Gates green; every Now count re-run against its control; every Task 3–5 box ticked against a watched result.
- [ ] Simplification (code-simplifier) then review (feature-dev:code-reviewer) dispatched against `<base>..HEAD` scoped to `Views/`, `Properties/`, the two sheets, `viewTile.css.ts` — reports cite files inside it; KNOB grep unmoved (2) after each dispatch.
- [ ] Every concern fixed or carrying a recorded ruling.
- [ ] The app-open pass driven live (my own instance, reverted after): the Acceptance list, both renderers.
- [ ] Progress hashes filled; divergences rewrote dependents before their commits.

---

### Phase 3 — Closeout

#### Task 6: The comment pass and the attack

**Requirement:** 8

**Why:** The bundle cycle's own order — simplification landed at Gate 2; the comment pass and break-attempt earn "done" instead of asserting it.

**Now** — comment baseline from Task 3's recorded sum; `KNOB` grep → 2.

**Becomes** — comment-killer-agent over the working diff; then build-breaking-agent against the full range with the do-not-re-raise list (write silence · the signed Cards changes · the wording · the Assignment rename); every finding independently verified at its cited lines before folding.

**Verify — automated**

- [ ] Summed comment count strictly below baseline; `KNOB`/`(Nathan's call)` grep → unchanged sites.
- [ ] Gates green after every fold.

**Verify — user**

- [ ] *(none.)*

#### Task 7: Delivery claim, verified

**Requirement:** all

**Why:** Claim → neutral verification → the record. Two dispatches, never one.

**Becomes** — the Delivery Claim written into this Log; a general-purpose verifier handed the claim, Bundle 6's text, this plan, and the commit range — "is this true?"; fixes re-claimed if not.

**Verify — automated**

- [ ] The verifier's answer recorded; every overstatement fixed or struck from the claim.

**Verify — user**

- [ ] *(none.)*

#### Task 8: The record

**Requirement:** 9

**Why:** The checklist cycle's step 4–5: what landed leaves no stale account behind.

**Becomes** — Made False's every row executed: ViewTypesPM reconciled to the host account; ContextPM's Open Call deleted; Bundle 6 struck with its true landing note; RendererRework's two rows deleted and its target tree redrawn (its Working Rules: no tombstones); History entry per History-Format; Line-Ledger refreshed (`loc.py --history`, republish); the Dead Vocabulary sweep run against its controls; net code-only line count reported.

**Verify — automated**

- [ ] Every Dead Vocabulary token → its expected count, each control nonzero.
- [ ] `grep -rn "Cards has no loading" ../.claude` → 0. Control: `grep -c "Bundle 6" Codebase-Cleanup-Checklist.md` → ≥ 1.

**Verify — user**

- [ ] *(none.)*

#### Gate 3 — closed

- [ ] All of Gate 2's standing checks re-affirmed over the full range; Progress complete; Closeout written.

---

## Implementation Log

### Progress

- [ ] **Phase 1** — Final Addresses · base `<commit>`
  - [ ] Task 1 — Editing → Assignment · `<commit>`
  - [ ] Task 2 — ViewRenderer → ViewHost · `<commit>`
- [ ] **Phase 2** — The Host
  - [ ] Task 3 — useViewHost + Table · `<commit>`
  - [ ] Task 4 — Cards converts · `<commit>`
  - [ ] Task 5 — root states · `<commit>`
- [ ] **Phase 3** — Closeout
  - [ ] Task 6 — comment pass + attack · `<commit>`
  - [ ] Task 7 — claim verified · `<commit>`
  - [ ] Task 8 — the record · `<commit>`

### Rulings

- 08-31-2026, Nathan: wording "Loading…" / "No pages here", shared at the root · no refused-write feedback · Cards' unification behavior changes signed · host-owned fold contract · `ViewHost` the name · `Assignment` the folder · proceed ahead of any further RendererRework motion.

### Open Against Later Tasks

### Deviations

### Lessons

### Sequenced After

- List/Gallery/Calendar/Timeline on the host's row model (the checklist's own endgame line).
- Virtualization, in the same seat.
- Any refused-write surface, if silence is ever un-ruled.

### Closeout

---

## Completion Criteria

**The directive**

```
Execute .claude/Planning/ViewHost.md. Live.
Live-verify: the Acceptance list in the app — both renderers, the full gesture set, loading + empty.
Screenshots: Cards' empty state and loading state, in-pane and in a tile.
Pings: at Gate 2 and completion.
Record: History arc "The View Host".
Everything else is the standard below.
```

**The deliverable**

- [ ] Every numbered requirement traces to a landed task.
- [ ] The acceptance criterion observed running, clause by clause.
- [ ] The paper test passes: a List-view sketch needs the host, four seam fields, presentation — nothing copied.

**The passes**

- [ ] Simplification + comment pass over the whole range, then code review, in that order.
- [ ] Delivery Claim written, then checked by a neutral verifier against Bundle 6's text.
- [ ] Build-breaking attack over the full range; every finding from every pass fixed or carrying a defensible ruling.

**The user's own pass**

- [ ] Table and Cards driven by hand: grouped and ungrouped, band drag, collapse, value edit, view switch in each.
- [ ] Cards' new loading and empty states, in the main pane and inside a dashboard tile.
- [ ] The disclosed corner: a property-grouped, sets-only container now renders Table's empty grid instead of "No pages here".

**The record**

- [ ] Documents made false rewritten in the commits that falsified them.
- [ ] The closing sweep at zero against its controls.
- [ ] Context and Handoff current; the History entry written to its format; Line-Ledger refreshed.
- [ ] Net code-only line count reported (comments + tests excluded), against the −150 to −280 honest range.
