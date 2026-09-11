## The View Engine — Implementation Plan

### Context

The Codebase Audit's topic 6 found that `Core/Views/Table/TableView.tsx` and `Core/Views/Cards/CardsView.tsx` each carry the same interaction layer — band drops, relocation across bands, manual reorder, page opening, the hover glance, the title menu's page actions, and the ghost lifecycle — written twice with one policy detail changed per pair, so they drift. Cards also mounts an icon picker and an image picker inside every card with about ten store subscriptions per card, and its ghost FLIP measures every card in the view on each dwell. This plan hoists that layer into one hook beside the view host, `Core/Views/Host/useViewInteractions.tsx`, normalizes every row drop to `{ activeId, toZone, beforeId | null }` so the two drag engines stay behind their own adapters, consolidates Table's column layer into one module, seats Cards' pickers once at the grid, and gives Cards the interaction suites Table already has. It also closes the small filing debt the scouts found beside it: test fixtures living in the production tree, three one-consumer modules, a duplicate of the design kit's `reorder`, a hardcoded kind test at the seat, and a dead engine prop.

Left alone by design: the pipeline (`Core/Views/Pipeline/`), the host's data half (`useViewHost.ts` gains one returned field), the Settings frames, the two drag engines' collision and presentation (audit topic 8.2 stays a separate arc; this plan makes the views engine-agnostic so that arc later touches only Cards' ten-line adapter), the caret, the frame drop model, `Showcase/`, and every Features doc claim that stays true. The settle-gate duplication between `engine.tsx` and `group.tsx` was weighed and left: a shared gate nets six lines against two engine hot paths, one of which has no DOM test.

### Summary

Today, adding a third view kind means writing the drag-and-drop, band, menu, and ghost behavior a third time, and Table and Cards already disagree in small ways nobody chose. After this plan, one hook owns those behaviors and each view says only what is unique to it: Table supplies its column fold and its inline title editor; Cards supplies its ghost grace, its grid travel hold, and its rename surface. A future List view would supply a policy object of the same shape, its CSS, and its own hover-add behavior, and get every interaction for free.

The outcome is a smaller codebase that is easier to read: two renderers each a few hundred lines lighter, one column module instead of four, one place to look for what a drop does, and files that read top to bottom in the order things happen. Four behaviors converge on purpose, each toward the renderer that had it right: Table's ⌘-click on a title opens a new tab (it silently ignored ⌘ before); Table's cross-band relocate lands at the drop slot instead of always appending; Table's structural reorder builds the on-disk order from the dragged page's true siblings rather than from whichever container the band's first row came from; and a plain click on a card or a Set card follows the Tab Open Behavior preference the way a Table title always did, instead of forcing the current tab. Cards gains real interaction tests on the harness Table's suites already use, and the audit's topic 6 closes.

#### Constraints

- Gates, from the repo root: `npm run typecheck` · `npm run test` · `npm run lint` — each exits 0; `npm run lint` runs `biome check .` and the wrapped-comment scan. Read the summary line, never `tail`'s exit; `set -o pipefail` on any pipe. `npm run format` repairs formatting a shell edit bypassed.
- Formatting is Biome's: single quotes, no semicolons, no hand alignment. Comments are `//` full lines with no width limit; a block comment wrapped across lines fails lint. New comments only where the code cannot say it.
- Words never used in new code or prose: seam, flavor, load-bearing. No human-action verbs for code. UI action labels stay Title Case.
- Frozen: `Core/Views/Pipeline/*`, the `Result` envelope and `Core/Contract`, `UIX/Interactions/engine.tsx`'s collision and presentation, `UIX/Interactions/group.tsx` except nothing (untouched), `useBannerMenu`'s signature, `IconChoice`'s and `ImagePicker`'s props, every CSS class the view suites query (`.drop-line-host`, `[data-rid]`, `.data-row`, `.data-cell`, `.cell-filler`, `.row-grip`, `.group-band-head`, `.group-band-glyph`, `.group-band-drop-outline`, `.cards-grid`, `.ghost-card`, `.ghost-row`, `[data-picker-portal]`).
- The engine gate: nothing under `Core/Views/Host` or `Core/Views/Bands` that `Core/Views/views.ts` or `Core/Views/viewRow.ts` imports may import React; `views.ts` is read on the engine side.
- Refactor shape: every existing view suite passes with its assertions unchanged except the ones this plan names in a task's VERIFY. The `manualOrderDrops` relocate assertion stays `['p2', 'p1']` because that drop lands at the band's end.
- Removal shape: never delete `Core/Views/Host/useColumnStyles.ts`'s `styleFor` export (tested directly), `UIX/Interactions/drag.tsx`'s `reorder` (seven consumers), `UIX/Interactions/group.tsx` (Cards' engine), or `Core/Views/Cards/cardValueInput.ts` (Cards' hover-add, deliberately per-kind).
- Line counts reported exclude comments and tests; a removal that nets positive lines is reported, not tidied.
- No smoke launch while Nathan is present; each Review Checkpoint lists the hand checks he takes.

#### Baseline

- Gates: green at `0739dd191` (`npm run typecheck` · `npm run test` → 371 files, 4,485 tests · `npm run lint`).
- `wc -l Core/Views/Table/TableView.tsx` → 1427 — drops to 827
- `wc -l Core/Views/Cards/CardsView.tsx` → 1348 — drops to 1165
- `wc -l Core/Views/Table/columnWidths.ts Core/Views/Table/columnReorder.ts Core/Views/columnAlign.ts` → 79 + 17 + 27 — retired into `Table/useColumns.ts`
- `ls Core/Views/Host/useViewInteractions.tsx Core/Views/Table/useColumns.ts Core/Testing/viewHarness.tsx Core/Testing/pageValues.ts UIX/Utilities/zoom.ts UIX/Utilities/stableApi.ts` → none exist — six files added (two of them test-only)
- `ls Core/Views/propsAtRoot.ts Core/Views/pageValues.ts Core/Views/viewMerge.ts Core/Views/Bands/cardsBand.ts Core/Views/Cards/cardsOrder.ts` → all exist — five files retired (with their three tests)
- `grep -c "useSession(" Core/Views/Cards/CardsView.tsx` → 14 — drops to 7 (three of them inside `PageCard`, keyed on its own row)
- `grep -rln "IS_REACT_ACT_ENVIRONMENT" Core/Views | wc -l` → 13 — drops to 0 (the harness owns it)
- `grep -rn "itemRole" UIX | wc -l` → 9 — drops to 0
- `grep -rn "view.type === 'cards'" Core/Views/Host | wc -l` → 1 — drops to 0
- `ls Core/Views/Cards/*.test.tsx | wc -l` → 0 — becomes 3
- `python3 .claude/scripts/loc.py | python3 -c "import json,sys; print(json.load(sys.stdin)['total'])"` → 69411 — drops to 69368 (−43). The hoist moves code rather than deleting it, so most of the reduction is structural: five modules and three test files gone, three column modules folded into one, TableView −600 lines, CardsView −183, two mounted pickers and seven store subscriptions per card gone, thirteen copied test preambles gone, one pick-target builder on the host, and one definition of every interaction. See Open Items.

**START:** 2026-09-11T23:12:52Z
**END:** <same command, run as the report is given>

#### Implementation Process

- [ ] **Phase 1** — Root Moves and Fixtures
  - [ ] Task 1.1 — Test fixtures and the view harness
  - [ ] Task 1.2 — The band model and the retired one-liners
  - [ ] Task 1.3 — The registry flag, the host's flatness, and the dead engine prop
  - [ ] Task 1.4 — Two design-kit utilities
  - [ ] Review Checkpoint
- [ ] **Phase 2** — The Shared Layer and Table
  - [ ] Task 2.1 — `useViewInteractions` and the table-drag contract
  - [ ] Task 2.2 — Table onto the shared layer, with one column module
  - [ ] Task 2.3 — The view suites on the harness
  - [ ] Task 2.4 — Documents Phase 2 makes false
  - [ ] Review Checkpoint
- [ ] `[Stop: Nathan drives Table on the shared layer before Cards is rewritten onto it]`
- [ ] **Phase 3** — Cards
  - [ ] Task 3.1 — Cards onto the shared layer, pickers seated once, the FLIP scoped
  - [ ] Task 3.2 — The Cards suites
  - [ ] Task 3.3 — Documents Phase 3 makes false
  - [ ] Review Checkpoint
- [ ] **Phase 4** — The Ledger
  - [ ] Task 4.1 — The audit report, the context document, and history

### Phase 1 — Root Moves and Fixtures

**GOAL:** Put every shared thing where the shared layer will find it, retire what has one consumer or a twin in the design kit, and land the two-line registry and host changes the renderers read — all without changing what any renderer does. Phase 2 and Phase 3 then build on files that already exist, and the diff each renderer carries is only its own rewrite.

#### Task 1.1

**TASK:** Move the two test-only fixture modules out of `Core/Views` into `Core/Testing` as one file, and add the view harness that every view suite mounts through.

**FILES:** `Core/Testing/pageValues.ts` (new), `Core/Testing/viewHarness.tsx` (new), `Core/Views/propsAtRoot.ts` (delete), `Core/Views/pageValues.ts` (delete), and the ten suites importing them: `Core/Properties/Cells/Cell.test.tsx`, `Core/Properties/value.test.ts`, `Core/Views/Host/useViewHost.test.tsx`, `Core/Views/Pipeline/filter.test.ts`, `Core/Views/Pipeline/group.test.ts`, `Core/Views/Pipeline/resolveView.test.ts`, `Core/Views/Pipeline/sort.test.ts`, `Core/Views/Table/bandCommits.test.tsx`, `Core/Views/Table/cellGestures.test.tsx`, `Core/Views/manualOrderDrops.test.tsx`.

**DEPENDENCIES:** Task 2.3 and Task 3.2 mount through `viewHarness.tsx`.

**NOW**

`Core/Views/propsAtRoot.ts` and `Core/Views/pageValues.ts` are two twelve-line modules with zero non-test consumers, imported by ten suites through `../propsAtRoot` / `../pageValues` relative paths. Three of those suites open with the same twelve-line preamble (the act-environment flag, a `ResizeObserverStub` class, `stubPointerCapture()`), the same render-and-flush body, and the same `await act(async () => { await new Promise((r) => setTimeout(r, N)) })` wait.

**CHANGE**

- [ ] Create `Core/Testing/pageValues.ts` holding `propsAtRoot`, `pageValues`, and `valuesReply` verbatim; delete the two `Core/Views` modules.
- [ ] Retarget the ten imports: `Core/Properties/Cells/Cell.test.tsx` → `'../../Testing/pageValues'`; `Core/Properties/value.test.ts` → `'../Testing/pageValues'`; every `Core/Views/**` suite two levels deep → `'../../Testing/pageValues'`; `Core/Views/manualOrderDrops.test.tsx` → `'../Testing/pageValues'`. Where a suite imported both modules, one import line carries both names.
- [ ] Create `Core/Testing/viewHarness.tsx`. The thirteen `Core/Views` suites that carry the preamble adopt it in Task 2.3; this task only adds it.

**AFTER**

`Core/Testing/pageValues.ts`:

```ts
// Per-page value fixtures for view and property suites: frontmatter keyed by the property NAME the file carries, and the loadValues reply a stubbed dialer answers with.

import type { PropertyDefinition } from '@pommora/core/Properties/properties'
import type { PageFrontmatter } from '@pommora/core/Nexus/schemas'
import { ok, type Result } from '@pommora/core/Contract/result'
import type { PageValues } from '@pommora/core/Views/viewRow'

export const propsAtRoot = (
  props: Record<string, unknown>,
  defs: PropertyDefinition[],
): Record<string, unknown> =>
  Object.fromEntries(
    Object.entries(props).map(([id, v]) => {
      const d = defs.find((x) => x.id === id)
      return [d ? d.name : id, v]
    }),
  )

export const pageValues = (fm: Record<string, PageFrontmatter>): Record<string, PageValues> =>
  Object.fromEntries(
    Object.entries(fm).map(([id, frontmatter]) => [
      id,
      { frontmatter, createdAt: null, modifiedAt: null },
    ]),
  )

export const valuesReply = (
  fm: Record<string, PageFrontmatter>,
): Result<Record<string, PageValues>> => ok(pageValues(fm))
```

`Core/Testing/viewHarness.tsx`:

```tsx
// The jsdom seat every view suite mounts through: the act environment, the ResizeObserver jsdom lacks, pointer capture, and one render-and-flush of the real ViewHost.

import { act } from 'react'
import type { Root } from 'react-dom/client'
import type { CollectionNode } from '@pommora/core/Nexus/tree'
import type { PropertyDefinition } from '@pommora/core/Properties/properties'
import { stubPointerCapture } from '@pommora/uix/Interactions/pointerHarness'
import { ViewHost } from '../Views/Host/ViewHost'

class ResizeObserverStub {
  observe(): void {}
  unobserve(): void {}
  disconnect(): void {}
}

/** Once per suite, at module scope. jsdom ships no `CSS.escape`, which the ghost's id-scoped queries call. */
export function installViewEnvironment(): void {
  ;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
  ;(globalThis as { ResizeObserver?: unknown }).ResizeObserver = ResizeObserverStub
  ;(globalThis as { CSS?: unknown }).CSS ??= { escape: (s: string) => s }
  stubPointerCapture()
}

export async function renderView(root: Root, source: CollectionNode): Promise<void> {
  await act(async () => {
    root.render(<ViewHost source={source} />)
  })
  await act(async () => {})
}

/** Lets a timer-gated commit land — a drop's settle, the one-tick click swallower after a drag. */
export const settle = (ms = 1): Promise<void> =>
  act(async () => {
    await new Promise((r) => setTimeout(r, ms))
  })

/** The two-group Status property the card suites group and reassign across. */
export const STATUS_DEF: PropertyDefinition = {
  id: 'prop_status',
  name: 'Status',
  type: 'status',
  status_groups: [
    {
      id: 'in_progress',
      label: 'In Progress',
      color: 'blue',
      options: [{ value: 'active', label: 'Active', color: 'blue', group_id: 'in_progress' }],
    },
    {
      id: 'done',
      label: 'Done',
      color: 'green',
      options: [{ value: 'complete', label: 'Complete', color: 'green', group_id: 'done' }],
    },
  ],
}
```

**VERIFY**

- [ ] Check the work for unnecessary code or obvious mistakes.
- [ ] `grep -rn "Views/propsAtRoot\|Views/pageValues\|from '\.\./propsAtRoot'\|from '\./propsAtRoot'\|from '\.\./pageValues'\|from '\./pageValues'" Core` → no output.
- [ ] `grep -rln "Testing/pageValues'" Core | wc -l` → 10.
- [ ] `npx vitest run Core/Views/ Core/Properties/` → all files pass, count unchanged from Baseline for those paths.

#### Task 1.2

**TASK:** Move the two band-generic helpers Table kept locally into the band model, fold the one-line `bandShowsAdd` into its only caller, replace Cards' `reorderIds` with the design kit's `reorder`, and make `useColumnStyles.ts` the one home of column-style resolution: `mergeStyleRecords` moves beside `styleFor`, and a `useColumnStyleMap(host)` resolves every visible column's style once for both renderers.

**FILES:** `Core/Views/Bands/bandDndModel.ts`, `Core/Views/Bands/ViewGroupBand.tsx`, `Core/Views/Bands/cardsBand.ts` (delete), `Core/Views/Bands/cardsBand.test.ts` (delete), `Core/Views/Cards/cardsOrder.ts` (delete), `Core/Views/Cards/cardsOrder.test.ts` (delete), `Core/Views/Cards/CardsView.tsx` (one import, one call), `Core/Views/Host/useColumnStyles.ts`, `Core/Views/Host/useColumnStyles.test.ts`, `Core/Views/viewMerge.ts` (delete), `Core/Views/viewMerge.test.ts` (delete), `Core/Views/Host/useViewHost.ts` (one import).

**DEPENDENCIES:** Task 2.1's hook imports `childIdsOf` and `subGroupOrderPatch` from the band model.

**NOW**

`TableView.tsx` defines `childIdsOf` (a set-tree walk) and `subGroupOrderPatch` (the nested-bucket band order) as render-scope closures at its lines 196–224; `CardsView.tsx` has no equivalent and silently drops those drops. `Core/Views/Bands/cardsBand.ts` is:

```ts
import type { GroupKind } from '@pommora/core/Views/viewRow'

/** Structural Set bands only — a property or ungrouped bucket has no inferable create location. */
export function bandShowsAdd(kind: GroupKind): boolean {
  return kind === 'structural-set'
}
```

consumed once, by `ViewGroupBand.tsx`'s `showAdd={bandShowsAdd(group.kind)}`. `Core/Views/Cards/cardsOrder.ts` is:

```ts
import { moveItem } from '@pommora/uix/Utilities/moveItem'

export function reorderIds(ids: string[], activeId: string, overId: string): string[] {
  const from = ids.indexOf(activeId)
  const to = ids.indexOf(overId)
  if (from === -1 || to === -1 || from === to) return [...ids]
  return moveItem(ids, from, to)
}
```

a second definition of `reorder<T extends { id: string }>(items, activeId, overId)` in `UIX/Interactions/drag.tsx`, consumed once at `CardsView.tsx`'s `reorderSets`. `Core/Views/viewMerge.ts` is:

```ts
import type { ColumnStyle } from '@pommora/core/Properties/columnStyles'

/** Fold style overrides per-KEY: style entries are objects, so an entry-level spread would wipe a column's saved sibling keys. */
export function mergeStyleRecords(
  saved: Record<string, ColumnStyle> | undefined,
  overrides: Record<string, ColumnStyle>,
): Record<string, ColumnStyle> {
  const folded = Object.fromEntries(
    Object.entries(overrides).map(([id, s]) => [id, { ...saved?.[id], ...s }]),
  )
  return { ...saved, ...folded }
}
```

consumed once, by `useViewHost.ts`.

**CHANGE**

- [ ] Append `childIdsOf` and `subGroupOrderPatch` to `bandDndModel.ts`; `subGroupOrderPatch` takes `groups` as its first parameter since it no longer closes over them. Add the two type imports.
- [ ] In `ViewGroupBand.tsx`, replace the `bandShowsAdd` import and call with `showAdd={group.kind === 'structural-set'}`; delete `cardsBand.ts` and its test.
- [ ] In `CardsView.tsx`, add `reorder` to the `@pommora/uix/Interactions/drag` import, replace the `reorderIds(sets.map((s) => s.id), activeId, overId)` call with `reorder(sets, activeId, overId).map((s) => s.id)`, and drop the `./cardsOrder` import; delete `cardsOrder.ts` and its test.
- [ ] Append `mergeStyleRecords` verbatim to `useColumnStyles.ts`, plus `NO_STYLE` and `useColumnStyleMap(host)` (a `Map` of column id → resolved style, memoized on the columns, the schema, the live view, and the nexus date format); move the two `mergeStyleRecords` cases into `useColumnStyles.test.ts` under a `describe('mergeStyleRecords')`; point `useViewHost.ts`'s import at `./useColumnStyles`; delete `viewMerge.ts` and its test. The two renderers adopt the map in Tasks 2.2 and 3.1.

**AFTER**

`Core/Views/Bands/bandDndModel.ts`, tail (everything above `childIdsOf` is unchanged):

```ts
import type { ResolvedGroup } from '@pommora/core/Views/viewRow'
import type { SavedView } from '@pommora/core/Views/views'
import type { SetTreeNode } from '../Pipeline/group'
import { type MeasuredRow, nextOrder } from '@pommora/uix/Interactions/reorderModel'
```

```ts
export function childIdsOf(nodes: SetTreeNode[], id: string): string[] | null {
  for (const n of nodes) {
    if (n.id === id) return n.children.map((c) => c.id)
    const hit = childIdsOf(n.children, id)
    if (hit) return hit
  }
  return null
}

/** A nested bucket band dragged among its siblings writes the GLOBAL bucket order; a drop beside the same bucket in another Set is a noop. */
export function subGroupOrderPatch(
  groups: ResolvedGroup[],
  sub: NonNullable<SavedView['sub_group']>,
  draggedId: string,
  beforeId: string | null,
): Partial<SavedView> | null {
  const bucketByKey = new Map(
    groups.flatMap((g) =>
      (g.children ?? []).flatMap((c) =>
        c.bucket !== undefined ? [[c.key, c.bucket] as const] : [],
      ),
    ),
  )
  const draggedBucket = bucketByKey.get(draggedId)
  if (draggedBucket === undefined) return null
  const beforeBucket = beforeId === null ? null : (bucketByKey.get(beforeId) ?? null)
  if (beforeBucket === draggedBucket) return null
  const present = [...new Set(bucketByKey.values())]
  return {
    sub_group: { ...sub, order: propertyOrderAfterDrop(present, draggedBucket, beforeBucket) },
  }
}
```

`Core/Views/Bands/ViewGroupBand.tsx`, the changed lines:

```tsx
      showAdd={group.kind === 'structural-set'}
```

`Core/Views/Cards/CardsView.tsx`, the changed lines (the whole file is drawn in Task 3.1):

```tsx
import {
  DragGroup,
  type DragItem,
  reorder,
  SortableZone,
  useDragItem,
  useGroupedDragItem,
} from '@pommora/uix/Interactions/drag'
```

```tsx
  const reorderSets = (activeId: string, overId: string): void => {
    const order = reorder(sets, activeId, overId).map((s) => s.id)
```

`Core/Views/Host/useColumnStyles.ts`:

```ts
import { useCallback, useMemo } from 'react'
import {
  defaultStyleFor,
  type ColumnStyle,
  type DateFormat,
} from '@pommora/core/Properties/columnStyles'
import type { PropertyDefinition } from '@pommora/core/Properties/properties'
import type { SavedView } from '@pommora/core/Views/views'
import { declaredType } from '../../Properties/value'
import type { ViewHostApi } from './useViewHost'
import { useSession } from '../../Session/store'

/** The saved entry's defined keys win over the type defaults — a caught-invalid saved value parses to `undefined` and must not erase a default. */
export function styleFor(
  columnId: string,
  schema: PropertyDefinition[],
  view: SavedView,
  nexusDateFormat?: DateFormat,
): ColumnStyle {
  const saved = Object.entries(view.column_styles?.[columnId] ?? {}).filter(
    ([, v]) => v !== undefined,
  )
  const def = schema.find((d) => d.id === columnId)
  return {
    ...defaultStyleFor(declaredType(columnId, schema), def, nexusDateFormat),
    ...Object.fromEntries(saved),
  }
}

export function useStyleFor(): (
  columnId: string,
  schema: PropertyDefinition[],
  view: SavedView,
) => ColumnStyle {
  const nexusDateFormat = useSession((s) => s.personalization.dateFormat)
  return useCallback(
    (columnId, schema, view) => styleFor(columnId, schema, view, nexusDateFormat),
    [nexusDateFormat],
  )
}

export const NO_STYLE: ColumnStyle = {}

/** Every rendered column's resolved style, keyed by id — one fold of the saved entries over the type defaults for whichever view kind paints them. */
export function useColumnStyleMap(
  host: Pick<ViewHostApi, 'columns' | 'schema' | 'liveView'>,
): Map<string, ColumnStyle> {
  const { columns, schema, liveView } = host
  const nexusDateFormat = useSession((s) => s.personalization.dateFormat)
  return useMemo(
    () => new Map(columns.map((c) => [c.id, styleFor(c.id, schema, liveView, nexusDateFormat)])),
    [columns, schema, liveView, nexusDateFormat],
  )
}

/** Fold style overrides per-KEY: style entries are objects, so an entry-level spread would wipe a column's saved sibling keys. */
export function mergeStyleRecords(
  saved: Record<string, ColumnStyle> | undefined,
  overrides: Record<string, ColumnStyle>,
): Record<string, ColumnStyle> {
  const folded = Object.fromEntries(
    Object.entries(overrides).map(([id, s]) => [id, { ...saved?.[id], ...s }]),
  )
  return { ...saved, ...folded }
}
```

`Core/Views/Host/useColumnStyles.test.ts`, the import and the appended describe:

```ts
import { mergeStyleRecords, styleFor } from './useColumnStyles'
```

```ts
describe('mergeStyleRecords', () => {
  it('folds per-KEY — a partial override never wipes a saved sibling key', () => {
    const out = mergeStyleRecords(
      { a: { look: 'compact', date_format: 'short' } },
      { a: { time_format: 'twelveHour' } },
    )
    expect(out.a).toEqual({ look: 'compact', date_format: 'short', time_format: 'twelveHour' })
  })

  it('keeps untouched columns and lets the override key win', () => {
    const out = mergeStyleRecords(
      { a: { look: 'standard' }, b: { look: 'checkbox' } },
      { a: { look: 'compact' } },
    )
    expect(out).toEqual({ a: { look: 'compact' }, b: { look: 'checkbox' } })
  })
})
```

`Core/Views/Host/useViewHost.ts`, the import block's changed lines:

```ts
import { type Overrides, patchOverride, useContainerValues } from './useValuesEpoch'
import { mergeStyleRecords } from './useColumnStyles'
import { groupingKeyOf, useBandOrdering } from '../Bands/useBandOrdering'
import { useViewCreation } from './useViewCreation'
import { groupKeyToValue, REASSIGNABLE_GROUP_TYPES, reassignTarget } from '../reassign'
```

**VERIFY**

- [ ] Check the work for unnecessary code or obvious mistakes; `subGroupOrderPatch`'s body is Table's, character for character, with `groups` as a parameter.
- [ ] `grep -rn "cardsBand\|cardsOrder\|viewMerge\|reorderIds" Core UIX` → no output.
- [ ] `npx vitest run Core/Views/Bands/ Core/Views/Host/useColumnStyles Core/Views/manualOrderDrops` → all pass; the two `mergeStyleRecords` cases run under `useColumnStyles.test.ts`.
- [ ] `npx tsc -p Core` → no errors (TableView still defines its local copies until Task 2.2).

#### Task 1.3

**TASK:** Give the kind registry the one flag the seat still hardcodes, return the kind's flatness and one pick-target builder from the host so renderers stop restating them, and remove the drag engine's `itemRole` prop that no consumer passes.

**FILES:** `Core/Views/views.ts`, `Core/Views/Host/ViewHost.tsx`, `Core/Views/Host/useViewHost.ts`, `UIX/Interactions/engine.tsx`, `UIX/Interactions/drag.tsx`, `.claude/Guidelines/Development-Environment.md`.

**DEPENDENCIES:** Task 2.2 and Task 3.1 pass `nestable={!host.flat}` and build every property-picker target through `host.pickTarget`; Task 3.1 removes `contextOptionsFor` once Cards no longer reads it.

**NOW**

`ViewHost.tsx`:

```tsx
  const host = useViewHost(source, VIEW_KINDS[view.type].flat, upward)
  // Cards' set cards render independently of the pipeline, so a cards view with Sets present always mounts.
  const setChrome = view.type === 'cards' && (source.sets?.length ?? 0) > 0
```

`views.ts`:

```ts
interface ViewKind {
  label: string
  icon: string
  flat: boolean
}

export const VIEW_KINDS: Record<ViewType, ViewKind> = {
  // Table indents its structural groups until Table Flatten lands, at which point flatness becomes the view's own setting with the kind as its default.
  table: { label: 'Table', icon: 'table', flat: false },
  cards: { label: 'Cards', icon: 'cards-grid', flat: true },
  list: { label: 'List', icon: 'list-rounded', flat: false },
  gallery: { label: 'Gallery', icon: 'layout-dashboard', flat: false },
  calendar: { label: 'Calendar', icon: 'calendar-days', flat: false },
  timeline: { label: 'Timeline', icon: 'chart-gantt', flat: false },
}
```

`useViewHost.ts`, the column helper both renderers wrap in their own picker-target builder (`pickerDefOf` + `cellTarget` in Table, `pickTargetFor` in Cards, each resolving the definition, the current value, the column style, and the kind):

```ts
  const contextOptionsFor = (column: ResolvedColumn): ContextOption[] | null => {
    if (column.kind !== 'context' || !tree) return null
    return contextOptionsForSpaces(column.id, tree)
  }
```

`useViewHost.ts` takes `flattenStructural` as a parameter and never returns it; Table passes `<BandDnd>` its default `nestable` and Cards passes `nestable={false}`, restating the same flag. `engine.tsx` declares `itemRole` in `ZoneValue`, `ZoneProps`, the `Zone` destructure with default `'button'`, the context memo and its deps, the `useZoneItem` destructure, and two handle attributes; `drag.tsx` re-declares it on `SortableZoneProps`. No consumer passes it, so only the `'button'` default is reachable.

**CHANGE**

- [ ] `views.ts`: add `setCards: boolean` to `ViewKind` with its doc line; `true` on `cards`, `false` on the other five.
- [ ] `ViewHost.tsx`: replace the two `setChrome` lines with `const setChrome = VIEW_KINDS[view.type].setCards && (source.sets?.length ?? 0) > 0`.
- [ ] `useViewHost.ts`: add `flat: flattenStructural,` to the returned object after `liveView`; add `pickTarget(row, column)` beside `contextOptionsFor` and return it (the imports change as drawn: `contextOptionsFor` from `contextOptions.ts` under its own name, `PickTarget` + `syntheticContextDef`, `resolveFieldValue`, `styleFor`). The kind comes from the column's declared type, the definition from the schema or the Context synthesis, the style from `styleFor` with the nexus date format. `contextOptionsFor` stays until Task 3.1.
- [ ] `engine.tsx` / `drag.tsx`: delete every `itemRole` declaration and read; the handle carries `role: 'button'` and `'aria-pressed': isDragging || undefined`.
- [ ] `.claude/Guidelines/Development-Environment.md`, the drag-handle bullet: its last sentence names the prop this task deletes; it ends instead with the rule that stays true.

**AFTER**

`views.ts`:

```ts
interface ViewKind {
  label: string
  icon: string
  flat: boolean
  /** Draws a Set Cards row off the pipeline, so the view mounts over Sets even when no page resolves. */
  setCards: boolean
}

export const VIEW_KINDS: Record<ViewType, ViewKind> = {
  // Table indents its structural groups until Table Flatten lands, at which point flatness becomes the view's own setting with the kind as its default.
  table: { label: 'Table', icon: 'table', flat: false, setCards: false },
  cards: { label: 'Cards', icon: 'cards-grid', flat: true, setCards: true },
  list: { label: 'List', icon: 'list-rounded', flat: false, setCards: false },
  gallery: { label: 'Gallery', icon: 'layout-dashboard', flat: false, setCards: false },
  calendar: { label: 'Calendar', icon: 'calendar-days', flat: false, setCards: false },
  timeline: { label: 'Timeline', icon: 'chart-gantt', flat: false, setCards: false },
}
```

`ViewHost.tsx`:

```tsx
  const host = useViewHost(source, VIEW_KINDS[view.type].flat, upward)
  const setChrome = VIEW_KINDS[view.type].setCards && (source.sets?.length ?? 0) > 0
```

`useViewHost.ts`, the changed imports, the builder, and the return's head:

```ts
import { contextOptionsFor } from '../../Contexts/contextOptions'
import { type PickTarget, syntheticContextDef } from '../../Properties/Pickers/PropertyPicker'
import { declaredType, resolveFieldValue } from '../../Properties/value'
import { mergeStyleRecords, styleFor } from './useColumnStyles'
```

```ts
  const nexusDateFormat = useSession((s) => s.personalization.dateFormat)
  const pickTarget = (row: ViewRow, column: ResolvedColumn): PickTarget => {
    const def = schema.find((d) => d.id === column.id) ?? syntheticContextDef(column.id)
    const current = resolveFieldValue(row, column.id, schema)
    const style = styleFor(column.id, schema, liveView, nexusDateFormat)
    const type = declaredType(column.id, schema, contextIds)
    if (type === 'datetime') return { kind: 'datetime', def, current, dateFormat: style.date_format }
    if (type === 'file') return { kind: 'file', def, current }
    return {
      kind: 'options',
      def,
      current,
      look: style.look,
      contextOptions:
        column.kind === 'context' && tree ? contextOptionsFor(column.id, tree) : undefined,
    }
  }
```

```ts
  return {
    source,
    schema,
    view,
    liveView,
    flat: flattenStructural,
    values,
```

with `pickTarget,` returned beside `contextOptionsFor,`.

`engine.tsx`, every changed region:

```ts
type ZoneValue = {
  ids: string[]
  feel: Feel
  activeId: string | null
  overIndex: number
  rects: Box[]
  dropState: DropState
  keyboard: boolean
  disabled: boolean
  register: (id: string, el: HTMLElement | null) => void
  begin: (id: string, e: ReactPointerEvent) => void
  liftKeyboard: (id: string) => void
}
const ZoneCtx = createContext<ZoneValue | null>(null)

type ZoneProps = {
  ids: string[]
  onReorder?: (activeId: string, overId: string) => void
  disabled?: boolean
  axis?: 'x' | 'y'
  getItemLabel?: (id: string) => string
  children: ReactNode
}

export function Zone({
  ids,
  onReorder,
  disabled = false,
  axis,
  getItemLabel,
  children,
}: ZoneProps): React.JSX.Element {
```

```ts
  const value = useMemo<ZoneValue>(
    () => ({
      ids,
      feel,
      activeId,
      overIndex,
      rects,
      dropState,
      keyboard,
      disabled,
      register,
      begin,
      liftKeyboard,
    }),
    [ids, activeId, overIndex, rects, dropState, keyboard, disabled],
  )
```

```ts
  const {
    ids,
    feel,
    activeId,
    overIndex,
    rects,
    dropState,
    keyboard,
    disabled,
    register,
    begin,
    liftKeyboard,
  } = ctx
```

```ts
      role: 'button',
      tabIndex: disabled ? -1 : 0,
      'aria-roledescription': 'sortable',
      'aria-describedby': INSTRUCTIONS_ID,
      'aria-pressed': isDragging || undefined,
      'aria-disabled': disabled || undefined,
```

`drag.tsx`, `SortableZoneProps` without the `itemRole?: string | null` line.

`.claude/Guidelines/Development-Environment.md`, the drag-handle bullet's last sentence:

> … and keyboard reordering dies with no error. Spread `{...handle}` last, and declare nothing it already carries.

**VERIFY**

- [ ] Check the work for unnecessary code or obvious mistakes.
- [ ] `grep -rn "itemRole" UIX Core .claude/Guidelines` → no output; `grep -rn "view.type === 'cards'" Core/Views/Host` → no output.
- [ ] `npx tsc -p UIX && npx tsc -p Core && npx tsc -p Core/tsconfig.src.json` → no errors (the src project proves `views.ts` still compiles on the engine side).
- [ ] `npx vitest run UIX/Interactions/ Core/Views/Host/` → all pass.
- [ ] `grep -c "pickTarget" Core/Views/Host/useViewHost.ts` → 2 (the builder and its return).

#### Task 1.4

**TASK:** Two small design-kit utilities each renderer reaches for: one place that reads an element's rendered CSS zoom, and one hook that gives a memoized row a stable api over handlers rebuilt every render.

**FILES:** `UIX/Utilities/zoom.ts` (new), `UIX/Utilities/stableApi.ts` (new).

**DEPENDENCIES:** Task 2.2 (Table's overflow probe, column drag, header resize strip, and row api) and Task 3.1 (Cards' effective zoom and card api) consume both.

**NOW**

`TableView.tsx` reads `Number.parseFloat(getComputedStyle(gridEl).getPropertyValue('zoom')) || 1` twice (the overflow probe and the column drag's activation), `CardsView.tsx` keeps an `effectiveZoom` state fed by a `ResizeObserver` reading the same expression on its root, and `ColumnHeader.tsx` back-solves zoom from `cell.getBoundingClientRect().width / width`, which TableView's own comment forbids. Both renderers also hand their memoized rows a stable callback bag by hand: TableView's `cellApiRef = useRef({...})` + `cellApiRef.current = {...}` + `useMemo<RowCellApi>(..., [])` (lines 828–878), and CardsView's `handlers` + `handlersRef` + `cardApi = useMemo(..., [])` (lines 262–292).

**CHANGE**

- [ ] Create `UIX/Utilities/zoom.ts` with `readZoom(el)` and `useElementZoom(ref)`.
- [ ] Create `UIX/Utilities/stableApi.ts` with `useStableApi(handlers)`.

**AFTER**

`UIX/Utilities/zoom.ts`:

```ts
import { useEffect, useState } from 'react'

/** The element's own rendered CSS zoom — a scaled surface's pointer math divides by it, and it is never back-solved from a rendered width, which bakes in layout slack. */
export const readZoom = (el: Element): number =>
  Number.parseFloat(getComputedStyle(el).getPropertyValue('zoom')) || 1

/** The live zoom of the element the ref holds at mount, re-read whenever it resizes. */
export function useElementZoom(ref: { readonly current: Element | null }): number {
  const [zoom, setZoom] = useState(1)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const measure = (): void => setZoom(readZoom(el))
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])
  return zoom
}
```

`UIX/Utilities/stableApi.ts`:

```ts
import { useMemo, useRef } from 'react'

type Handlers = Record<string, (...args: never[]) => unknown>

/** One identity for the component's lifetime over handlers rebuilt every render, so memoized rows take the api without re-rendering; the key set is fixed at mount. */
export function useStableApi<T extends Handlers>(handlers: T): T {
  const ref = useRef(handlers)
  ref.current = handlers
  return useMemo(
    () =>
      Object.fromEntries(
        Object.keys(handlers).map((key) => [
          key,
          (...args: unknown[]) => (ref.current[key] as (...a: unknown[]) => unknown)(...args),
        ]),
      ) as unknown as T,
    [],
  )
}
```

**VERIFY**

- [ ] Check the work for unnecessary code or obvious mistakes.
- [ ] `npx tsc -p UIX` → no errors; `npx biome check UIX/Utilities` → clean.

#### Review Checkpoint

- [ ] `npm run typecheck` · `npm run test` · `npm run lint` all green as a set at the end of the phase; `npm run test` reports 368 files (three test files retired, none yet added) with no failures.

### Phase 2 — The Shared Layer and Table

**GOAL:** Land the one hook every view kind mounts, give the table-drag frame the same drop contract the card engine already speaks, and rewrite Table onto both with its column layer consolidated into one module. Table is first because it carries the interaction tests; Cards follows once Nathan has driven Table on the shared layer.

#### Task 2.1

**TASK:** Add `useViewInteractions`, and change `TableRowDnd` to report one drop `(activeId, toGroup, beforeId | null)` instead of pre-routing into three callbacks — the slot it computed and threw away is what lets Table relocate at the drop position.

**FILES:** `Core/Views/Host/useViewInteractions.tsx` (new), `UIX/Interactions/tableDnd.tsx`, `UIX/Interactions/tableDnd.test.tsx`, `Core/Navigation/NavList.tsx`.

**DEPENDENCIES:** Task 2.2 adopts both in `TableView.tsx`; until it lands, `TableView.tsx` fails typecheck on its old `reorderTo` prop, so this task and Task 2.2 share one commit.

**NOW**

`TableRowDnd` today:

```tsx
import {
  createContext,
  useContext,
  useMemo,
  useRef,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from 'react'
import { nearestByTop, useInsertionDrag } from './insertionDrag'
import { type MeasuredRow, nextOrder, slotInGroup } from './reorderModel'
import { DROP_LINE_INSET } from './shared'

type Slot = { lineY: number; left: number; width: number; commit: () => void }
type TableRow = MeasuredRow & { left: number; contentRight: number; group: string }
type Snapshot = { rows: TableRow[]; boxTop: number; boxLeft: number }

type Value = {
  draggingId: string | null
  registerRow: (id: string, el: HTMLElement | null) => void
  begin: (id: string, e: ReactPointerEvent) => void
}
const Ctx = createContext<Value | null>(null)

export function TableRowDnd({
  rows,
  disabled,
  canReorderWithin,
  canReassign,
  canRelocate = false,
  reorderTo,
  reassign,
  relocate = () => {},
  children,
}: {
  rows: { id: string; groupKey: string }[]
  disabled: boolean
  canReorderWithin: boolean
  canReassign: boolean
  /** True under plain location grouping: the bands ARE folders, so a cross-band drop MOVES the page. */
  canRelocate?: boolean
  /** The group key maps a structural group to its on-disk container for the page_order write. */
  reorderTo: (orderIds: string[], groupKey: string, activeId: string) => void
  reassign: (activeId: string, targetGroupKey: string) => void
  relocate?: (activeId: string, targetGroupKey: string) => void
  children: ReactNode
}): React.JSX.Element {
  const els = useRef(new Map<string, HTMLElement>())
  const content = useRef<HTMLDivElement | null>(null)

  const drag = useInsertionDrag<Slot, Snapshot>({
    take: (excludeId) => {
      const box = content.current
      if (!box) return null
      const boxRect = box.getBoundingClientRect()
      const measured: TableRow[] = []
      for (const r of rows) {
        if (r.id === excludeId) continue
        const el = els.current.get(r.id)
        if (!el) continue
        const rect = el.getBoundingClientRect()
        // The row spans a trailing 1fr filler, so rect.right would run the line into the empty gutter past the last column.
        const filler = el.querySelector('.cell-filler')
        const contentRight = filler ? filler.getBoundingClientRect().left : rect.right
        measured.push({
          id: r.id,
          top: rect.top,
          bottom: rect.bottom,
          mid: rect.top + rect.height / 2,
          left: rect.left,
          contentRight,
          group: r.groupKey,
        })
      }
      measured.sort((a, b) => a.top - b.top)
      return { rows: measured, boxTop: boxRect.top, boxLeft: boxRect.left }
    },
    resolve: (id, point, s) => {
      const activeGroup = rows.find((r) => r.id === id)?.groupKey
      if (activeGroup === undefined || s.rows.length === 0) return null
      const near = nearestByTop(s.rows, point.y)
      const above = point.y < near.mid
      const targetGroup = near.group
      const lineY = (above ? near.top : near.bottom) - s.boxTop
      const left = near.left - s.boxLeft + DROP_LINE_INSET
      const width = near.contentRight - near.left - DROP_LINE_INSET * 2

      if (targetGroup === activeGroup) {
        if (!canReorderWithin) return null
        const order = rows.map((x) => x.id)
        const next = nextOrder(order, id, slotInGroup(order, near, point.y, id).beforeId)
        // A slot reproducing the standing order is a noop — no line, no commit.
        if (next.every((x, i) => x === order[i])) return null
        return { lineY, left, width, commit: () => reorderTo(next, activeGroup, id) }
      }
      if (canRelocate) return { lineY, left, width, commit: () => relocate(id, targetGroup) }
      if (!canReassign) return null
      return { lineY, left, width, commit: () => reassign(id, targetGroup) }
    },
    commit: (_id, slot) => slot.commit(),
    lineFor: (slot) => ({ top: slot.lineY, left: slot.left, width: slot.width, right: 'auto' }),
    label: () => 'row',
    ghost: 'none',
    rowEl: (id) => els.current.get(id),
    scrollTarget: () => content.current,
    disabled: () => disabled,
    disclose: true,
    watch: rows,
  })

  const registerRow = (id: string, el: HTMLElement | null): void => {
    if (el) els.current.set(id, el)
    else els.current.delete(id)
  }

  const value = useMemo<Value>(
    () => ({ draggingId: drag.dragging, registerRow, begin: drag.begin }),
    [drag.dragging, drag.begin],
  )

  return (
    <Ctx.Provider value={value}>
      <div ref={content} className="drop-line-host">
        {children}
        {drag.line}
      </div>
    </Ctx.Provider>
  )
}

/** `ref` on the row, `handle` spread on the grip. `isDragging` mutes the row in place. */
export function useTableRowDrag(id: string): {
  ref: (el: HTMLElement | null) => void
  handle: { onPointerDown: (e: ReactPointerEvent) => void }
  isDragging: boolean
} {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useTableRowDrag must be used inside <TableRowDnd>')
  return {
    ref: (el) => ctx.registerRow(id, el),
    handle: { onPointerDown: (e) => ctx.begin(id, e) },
    isDragging: ctx.draggingId === id,
  }
}
```

Its `resolve` computes `slotInGroup(order, near, point.y, id).beforeId` for the same-group case and discards the slot for a cross-group one, so Table's `relocateRow(pageId, destGroupKey)` can only append. `NavList.tsx` consumes the old contract:

```tsx
  const commitReorder = (orderIds: string[], groupKey: string, activeId: string): void => {
    const group = groupKey === 'pins' ? pinRows : recents
    const keys = new Set(group.map((g) => g.key))
    const nextOrder = orderIds.filter((id) => keys.has(id))
    const over = group[nextOrder.indexOf(activeId)]?.key
    if (!over || over === activeId) return
    if (groupKey === 'pins') reorderPin(activeId, over)
    else onReorderRecent?.(activeId, over)
  }
```

```tsx
        <TableRowDnd
          rows={dndRows}
          disabled={false}
          canReorderWithin
          canReassign={false}
          reorderTo={commitReorder}
          reassign={() => {}}
        >
```

There is no shared interaction hook; the behaviors it will hold are at `TableView.tsx` lines 195–294 (bands, `childIdsOf`, `subGroupOrderPatch`, `onBandDrop`), 436–451 (the title branch of `onCellClick`), 694–734 (the title context and the `title:*` arms of `openCellMenu`), 846–853 (the ghost), 883–899 (`subTargets` and the three seam writes), 1009–1066 (`reassignRow`, `relocateRow`, `reorderTo`, `ghostCreate`), 1155–1163 (the icon picker), and 1346–1358 (the row's hover handlers); and at `CardsView.tsx` lines 209–214 (`openPage`), 231–261 (ghost suppression, the ghost, the seam writes), 383–425 (the ghost create), 427–539 (`bands`, `onBandDrop`, `structuralSlotFor`, `reorderInBandByIndex`, `onCardDrop`), 1211–1245 (the card menu's `title:*` arms), and 1279–1291 (the hover handlers).

**CHANGE**

- [ ] Create `Core/Views/Host/useViewInteractions.tsx` as drawn below. `bands` is the flattened groups (`flattenBands` already skips the ungrouped tail, so a Group By: None view yields none without a gate); one `idsUnder(dir)` serves every sibling read. Its bodies are the canonical ones: `onBandDrop` is Table's (the superset; Cards' was a strict subset once `nestable` is off), `reorderWithin` and `relocate` take Cards' sibling-filtered on-disk order with a `beforeId` in place of an index (Table's band is its container while its registry entry is `flat: false`, so every band row shares the parent and the row frame needs no slot veto; a `resolveSlot` veto on `tableDnd` belongs to the Table Flatten arc, not this one), `reassign` is Table's (its sub-group matrix collapses to Cards' one-liner when `subGrouped` is false), `structuralSlot` is Cards' `structuralSlotFor` over the paint order, `openPage` is Cards' with the owner resolved at click time.
- [ ] Rewrite `tableDnd.tsx`'s props and `resolve`/`commit` as drawn; the gates (`canReorderWithin`, `canRelocate`, `canReassign`) still decide whether a line draws, and the same-group noop check keeps the line off a slot that reproduces the standing order; `beforeId` is computed inside the target group so `null` means that group's end.
- [ ] Update `tableDnd.test.tsx` to the new spy and the new expectations: a drop of `r1` below `r2` reports `('r1', 'g', 'r3')`; a drop below the last row reports `('r1', 'g', null)`.
- [ ] `NavList.tsx`: `commitReorder` takes `(activeId, groupKey, beforeId)`, rebuilds the group's order with `nextOrder`, and finds `over` as before; the `reassign={() => {}}` prop goes.

**AFTER**

`Core/Views/Host/useViewInteractions.tsx`:

```tsx
// Everything a row, a band, or a page does in answer to the pointer, defined once for every view kind: band drops, row drops and where the order lands, opening a page, the hover ghost, the title menu's page actions, and the icon picker seat. A kind supplies the policy below and its own presentation, nothing else.

import { useMemo, useRef, useState } from 'react'
import { UNGROUPED } from '@pommora/core/Views/viewRow'
import type { ViewRow } from '@pommora/core/Views/viewRow'
import type { SavedView } from '@pommora/core/Views/views'
import type { PageMoveContext } from '@pommora/core/Actions/pageMenu'
import { relDirname } from '@pommora/core/Paths/posix'
import { nextOrder } from '@pommora/uix/Interactions/reorderModel'
import {
  GHOST_DWELL_MS,
  type GhostAnchor,
  useClearStrandedGhost,
  useGhostAnchor,
} from '@pommora/uix/Interactions/ghostCreate'
import { useSession } from '../../Session/store'
import { confirmDelete } from '../../Interface/Confirm/confirmations'
import { hoverGlance, leaveGlance } from '../../Interface/Glance/glanceLink'
import { pageMoveContext, runPageSendAction } from '../../Interface/Menus/pageMenuActions'
import { findCollectionForSet } from '../../Nexus/treeIndex'
import { isOpenInTabs } from '../../Navigation/tabsModel'
import { IconChoice } from '../../Assets/IconChoice'
import type { BandDrop } from '../Bands/BandDnd'
import {
  childIdsOf,
  flattenBands,
  reparentFsOrder,
  subGroupOrderPatch,
} from '../Bands/bandDndModel'
import { bandReorderPatch } from '../Bands/useBandOrdering'
import { subtreeIds } from '../Pipeline/group'
import { sameIds, spliceBeside, tieOrderWith } from '../creationOrder'
import type { ViewHostApi } from './useViewHost'

export interface ViewInteractionPolicy {
  ghost: {
    graceMs: number
    /** Re-read when the dwell fires; the icon picker seat below adds its own suppression. */
    suppressed: () => boolean
    travelHold?: { inZone: (enteringId: string) => boolean; holdMs: number }
  }
  /** Layers the renderer keeps out of `liveView` and folds into every persist. */
  foldOverrides?: (v: SavedView) => SavedView
  /** Opens the renderer's naming surface over a page that already exists on disk. */
  rename: (target: { id: string; path: string }, fromCreate: boolean) => void
}

export type ViewDrop = { activeId: string; toZone: string; beforeId: string | null }

export type TitleMenuContext = PageMoveContext & { alreadyOpen: boolean }

/** The pointer handlers every row wears: the ghost's hover and the location glance. */
export function rowHover(
  row: ViewRow,
  onHover: GhostAnchor['onHover'],
): {
  onPointerEnter: (e: React.PointerEvent<HTMLElement>) => void
  onPointerLeave: () => void
} {
  return {
    onPointerEnter: (e) => {
      onHover(row.id, true)
      hoverGlance(
        { kind: 'page', id: row.id, path: row.path },
        e.currentTarget,
        'location',
        e.shiftKey,
      )
    },
    onPointerLeave: () => {
      onHover(row.id, false)
      leaveGlance()
    },
  }
}

export function useViewInteractions(host: ViewHostApi, policy: ViewInteractionPolicy) {
  const {
    source,
    liveView,
    groups,
    setTree,
    rows,
    rowById,
    rowBand,
    paintOrder,
    setPaths,
    collapsed,
    tree,
    structuralGrouping,
    subGrouped,
    groupPropId,
    groupPropType,
    canReassign,
    canReorderWithin,
    canRelocate,
    reassignBySortRun,
    structuralOrder,
    setManualOverride,
    persistView,
    commitBand,
    commitGroupValue,
    creation,
    mutate,
    select,
  } = host

  // ── Bands ─────────────────────────────────────────────────────────────────

  const bands = useMemo(() => flattenBands(groups, collapsed), [groups, collapsed])
  const onBandDrop = (draggedId: string, drop: BandDrop): void => {
    const dragged = bands.find((b) => b.id === draggedId)
    if (!dragged) return
    if (dragged.kind === 'property') {
      if (liveView.group?.kind === 'property') {
        if (drop.kind !== 'reorder') return
        const patch = bandReorderPatch({
          dragged,
          beforeId: drop.beforeId,
          view: liveView,
          structuralIds: [],
          propertyKeys: groups.filter((g) => g.kind === 'property').map((g) => g.key),
        })
        if (patch) commitBand(patch)
        return
      }
      if (!subGrouped || !liveView.sub_group || liveView.sub_group.order_mode !== 'manual') return
      const sub = subGroupOrderPatch(groups, liveView.sub_group, draggedId, drop.beforeId)
      if (sub) commitBand(sub)
      return
    }
    // The id universe is the set tree, never the rendered groups — a filter prunes emptied bands out of `groups`, and merging against that drops their stored order.
    const structural = bandReorderPatch({
      dragged,
      beforeId: drop.beforeId,
      view: liveView,
      structuralIds: setTree.flatMap(subtreeIds),
      propertyKeys: [],
    })
    if (!structural) return
    if (drop.kind === 'reorder') {
      if (structuralGrouping && liveView.structural_order_mode === 'location') {
        const parentPath = dragged.parentId === null ? source.path : setPaths.get(dragged.parentId)
        const siblingIds =
          dragged.parentId === null
            ? setTree.map((n) => n.id)
            : (childIdsOf(setTree, dragged.parentId) ?? [])
        if (!parentPath) return
        void mutate({
          op: 'reorderChildren',
          parentPath,
          key: 'set_order',
          order: nextOrder(siblingIds, draggedId, drop.beforeId),
        })
        return
      }
      commitBand(structural)
      return
    }
    const path = setPaths.get(draggedId)
    const destPath = drop.targetParentId === null ? source.path : setPaths.get(drop.targetParentId)
    const destChildIds =
      drop.targetParentId === null
        ? setTree.map((n) => n.id)
        : childIdsOf(setTree, drop.targetParentId)
    if (!path || !destPath || !destChildIds) return
    // The fs move lands before the view write: views.save and set_order are both read-modify-writes on the container sidecar, so a failed move commits nothing.
    void (async () => {
      if (
        !(await mutate({
          op: 'moveSet',
          path,
          newParentPath: destPath,
          order: reparentFsOrder(destChildIds, draggedId),
        }))
      )
        return
      commitBand(structural)
    })()
  }

  // Which Set and which bucket a nested band names — the create engine seeds from it, and a reassign moves across it.
  const subTargets = useMemo(() => {
    const m = new Map<string, { setId: string | null; bucket: string | null }>()
    for (const g of groups) {
      if (g.kind === 'structural-set') {
        for (const c of g.children ?? []) m.set(c.key, { setId: g.key, bucket: c.bucket ?? null })
      } else if (g.kind === 'ungrouped') m.set(g.key, { setId: null, bucket: null })
    }
    return m
  }, [groups])

  // ── Rows ──────────────────────────────────────────────────────────────────

  const bandRowIds = (bandKey: string, excludeId: string): string[] =>
    paintOrder.flatMap((r) => (r.groupKey === bandKey && r.id !== excludeId ? [r.id] : []))
  const isSiblingOf = (parent: string, id: string): boolean => {
    const path = rowById.get(id)?.path
    return path !== undefined && relDirname(path) === parent
  }
  const idsUnder = (dir: string): string[] =>
    rows.flatMap((r) => (relDirname(r.path) === dir ? [r.id] : []))

  const reorderWithin = (bandKey: string, activeId: string, beforeId: string | null): void => {
    const bandOrder = nextOrder(bandRowIds(bandKey, activeId), activeId, beforeId)
    let placed = false
    const full = paintOrder.flatMap((r) => {
      if (r.groupKey !== bandKey) return r.id === activeId ? [] : [r.id]
      if (placed) return []
      placed = true
      return bandOrder
    })
    if (
      sameIds(
        full,
        paintOrder.map((r) => r.id),
      )
    )
      return
    setManualOverride(full)
    if (structuralOrder) {
      const row = rowById.get(activeId)
      if (!row) return
      const parent = relDirname(row.path)
      // The band may gather a whole subtree, so the on-disk order is built from the dragged page's true siblings alone.
      const after = bandOrder
        .slice(bandOrder.indexOf(activeId) + 1)
        .find((id) => isSiblingOf(parent, id))
      const siblings = idsUnder(parent)
      const order = spliceBeside(
        siblings.filter((id) => id !== activeId),
        after ?? null,
        activeId,
        'above',
      )
      if (!sameIds(order, siblings))
        void mutate({ op: 'movePage', path: row.path, newParentPath: parent, order })
      return
    }
    persistView({ manual_order: full }, { viewState: true })
    reassignBySortRun(full, bandKey, activeId)
  }

  const relocate = (activeId: string, toZone: string, beforeId: string | null): void => {
    const row = rowById.get(activeId)
    const destPath = toZone === UNGROUPED ? source.path : setPaths.get(toZone)
    if (!row || !destPath || destPath === relDirname(row.path)) return
    const destIds = idsUnder(destPath)
    const bandIds = bandRowIds(toZone, activeId)
    const at = beforeId === null ? bandIds.length : bandIds.indexOf(beforeId)
    const sibBefore = bandIds.slice(at).find((id) => isSiblingOf(destPath, id))
    const order = spliceBeside(destIds, sibBefore ?? null, activeId, 'above')
    const allIds = rows.map((r) => r.id)
    const spliceLive = (existing: string[] | undefined): string[] =>
      tieOrderWith(existing, allIds, activeId, beforeId, 'above')
    setManualOverride((m) => (m ? spliceLive(m) : m))
    if (liveView.manual_order)
      persistView({ manual_order: spliceLive(liveView.manual_order) }, { viewState: true })
    void mutate({ op: 'movePage', path: row.path, newParentPath: destPath, order })
  }

  const reassign = (activeId: string, toZone: string): void => {
    if (!groupPropId) return
    if (!subGrouped) {
      commitGroupValue(activeId, groupPropId, groupPropType, toZone)
      return
    }
    const path = rowById.get(activeId)?.path
    const dest = subTargets.get(toZone)
    if (!path || !dest) return
    const destPath = dest.setId === null ? source.path : setPaths.get(dest.setId)
    if (!destPath) return
    const cur = subTargets.get(rowBand.get(activeId) ?? '')
    const write =
      dest.bucket === (cur?.bucket ?? null)
        ? Promise.resolve(true)
        : commitGroupValue(activeId, groupPropId, groupPropType, dest.bucket ?? UNGROUPED)
    if (dest.setId !== (cur?.setId ?? null))
      void write?.then((ok) => ok && mutate({ op: 'movePage', path, newParentPath: destPath }))
  }

  /** One entry for every row drop: a same-band slot reorders, a cross-band one moves the page or rewrites its group value. */
  const onDrop = ({ activeId, toZone, beforeId }: ViewDrop): void => {
    const from = rowBand.get(activeId)
    if (from === undefined) return
    if (toZone === from) {
      if (canReorderWithin) reorderWithin(toZone, activeId, beforeId)
      return
    }
    if (canRelocate) relocate(activeId, toZone, beforeId)
    else if (canReassign) reassign(activeId, toZone)
  }

  /** A structural reorder may only land inside the dragged page's own sibling run: a flattened band gathers a whole subtree. Null refuses the slot. */
  const structuralSlot = (zoneId: string, index: number, activeId: string): number | null => {
    if (!structuralOrder || rowBand.get(activeId) !== zoneId) return index
    const row = rowById.get(activeId)
    if (!row) return null
    const parent = relDirname(row.path)
    let first = -1
    let count = 0
    bandRowIds(zoneId, activeId).forEach((id, i) => {
      if (!isSiblingOf(parent, id)) return
      if (first < 0) first = i
      count++
    })
    if (first < 0) return null
    return index >= first && index <= first + count ? index : null
  }

  // ── Pages ─────────────────────────────────────────────────────────────────

  const openPage = (row: ViewRow, newTab: boolean): void => {
    const target = { kind: 'page', id: row.id, path: row.path } as const
    // A plain click passes NO option, so the tab-open preference still decides; forcing `false` would override it.
    if (newTab) {
      void select(target, { newTab: true })
      return
    }
    const owner = source.kind === 'collection' ? source : findCollectionForSet(tree, source.id)
    if (owner?.openIn === 'page-preview') useSession.getState().openWindow(target)
    else void select(target)
  }

  const [iconOpen, setIconOpen] = useState(false)
  const [iconTarget, setIconTarget] = useState<{ path: string; icon?: string } | null>(null)
  const iconAnchor = useRef<HTMLElement | null>(null)
  const iconOpenRef = useRef(iconOpen)
  iconOpenRef.current = iconOpen
  const openIconPicker = (row: ViewRow, anchor: HTMLElement): void => {
    iconAnchor.current = anchor
    setIconTarget({ path: row.path, icon: typeof row.icon === 'string' ? row.icon : undefined })
    setIconOpen(true)
  }
  const iconPicker = (
    <IconChoice
      open={iconOpen}
      onClose={() => setIconOpen(false)}
      triggerRef={iconAnchor}
      value={iconTarget?.icon}
      onSelect={(icon) => {
        if (iconTarget) void mutate({ op: 'setIcon', path: iconTarget.path, kind: 'page', icon })
      }}
    />
  )

  const titleMenuContext = (row: ViewRow): TitleMenuContext => {
    const { tabs, pinned } = useSession.getState()
    return {
      alreadyOpen: isOpenInTabs(tabs, pinned, { kind: 'page', id: row.id, path: row.path }),
      ...pageMoveContext(tree, row.path),
    }
  }
  /** The page half of any title menu; `anchor` seats the icon picker. Returns false for an action the caller owns. */
  const runTitleAction = (action: string, row: ViewRow, anchor: HTMLElement): boolean => {
    if (runPageSendAction(action, row)) return true
    switch (action) {
      case 'title:window':
        useSession.getState().openWindow({ id: row.id, path: row.path })
        return true
      case 'title:newtab':
        openPage(row, true)
        return true
      case 'title:rename':
        policy.rename(row, false)
        return true
      case 'title:icon':
        openIconPicker(row, anchor)
        return true
      case 'title:newabove':
        void creation.createAdjacent(row, 'above')
        return true
      case 'title:newbelow':
        void creation.createAdjacent(row, 'below')
        return true
      case 'title:delete':
        void confirmDelete({ path: row.path, kind: 'page', title: row.title })
        return true
      default:
        return false
    }
  }

  // ── Ghost ─────────────────────────────────────────────────────────────────

  const ghost = useGhostAnchor({
    dwellMs: GHOST_DWELL_MS,
    graceMs: policy.ghost.graceMs,
    suppressed: () => iconOpenRef.current || policy.ghost.suppressed(),
    travelHold: policy.ghost.travelHold,
  })
  useClearStrandedGhost(ghost, rowById)
  /** Claims the ghost's anchor and creates below it; undefined when no ghost stands. */
  const ghostCreate = (): Promise<boolean> | undefined => {
    const anchorId = ghost.take()
    const anchor = anchorId ? rowById.get(anchorId) : undefined
    return anchor && creation.createAfter(anchor)
  }

  // ── What the create engine reads at fire time ─────────────────────────────

  host.seam.foldOverrides.current = policy.foldOverrides ?? ((v) => v)
  host.seam.bandBucket.current = (key) => (subGrouped ? (subTargets.get(key)?.bucket ?? null) : key)
  host.seam.onCreated.current = (created) => policy.rename(created, true)

  return {
    bands,
    onBandDrop,
    onDrop,
    structuralSlot,
    openPage,
    titleMenuContext,
    runTitleAction,
    iconPicker,
    ghost,
    ghostCreate,
    holdGhost: ghost.suppressWrap,
  }
}
```

`UIX/Interactions/tableDnd.tsx`:

```tsx
import {
  createContext,
  useContext,
  useMemo,
  useRef,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from 'react'
import { nearestByTop, useInsertionDrag } from './insertionDrag'
import { type MeasuredRow, nextOrder, slotInGroup } from './reorderModel'
import { DROP_LINE_INSET } from './shared'

type Slot = { lineY: number; left: number; width: number; group: string; beforeId: string | null }
type TableRow = MeasuredRow & { left: number; contentRight: number; group: string }
type Snapshot = { rows: TableRow[]; boxTop: number; boxLeft: number }

type Value = {
  draggingId: string | null
  registerRow: (id: string, el: HTMLElement | null) => void
  begin: (id: string, e: ReactPointerEvent) => void
}
const Ctx = createContext<Value | null>(null)

export function TableRowDnd({
  rows,
  disabled,
  canReorderWithin,
  canReassign,
  canRelocate = false,
  onDrop,
  children,
}: {
  rows: { id: string; groupKey: string }[]
  disabled: boolean
  canReorderWithin: boolean
  canReassign: boolean
  /** True under plain location grouping: the bands ARE folders, so a cross-band drop MOVES the page. */
  canRelocate?: boolean
  /** `beforeId` is null at the target group's end. The caller routes a same-group drop to a reorder and a cross-group one to a relocate or a reassign. */
  onDrop: (activeId: string, toGroup: string, beforeId: string | null) => void
  children: ReactNode
}): React.JSX.Element {
  const els = useRef(new Map<string, HTMLElement>())
  const content = useRef<HTMLDivElement | null>(null)

  const drag = useInsertionDrag<Slot, Snapshot>({
    take: (excludeId) => {
      const box = content.current
      if (!box) return null
      const boxRect = box.getBoundingClientRect()
      const measured: TableRow[] = []
      for (const r of rows) {
        if (r.id === excludeId) continue
        const el = els.current.get(r.id)
        if (!el) continue
        const rect = el.getBoundingClientRect()
        // The row spans a trailing 1fr filler, so rect.right would run the line into the empty gutter past the last column.
        const filler = el.querySelector('.cell-filler')
        const contentRight = filler ? filler.getBoundingClientRect().left : rect.right
        measured.push({
          id: r.id,
          top: rect.top,
          bottom: rect.bottom,
          mid: rect.top + rect.height / 2,
          left: rect.left,
          contentRight,
          group: r.groupKey,
        })
      }
      measured.sort((a, b) => a.top - b.top)
      return { rows: measured, boxTop: boxRect.top, boxLeft: boxRect.left }
    },
    resolve: (id, point, s) => {
      const activeGroup = rows.find((r) => r.id === id)?.groupKey
      if (activeGroup === undefined || s.rows.length === 0) return null
      const near = nearestByTop(s.rows, point.y)
      const group = near.group
      const crossing = group !== activeGroup
      if (crossing ? !canRelocate && !canReassign : !canReorderWithin) return null
      const groupOrder = rows.flatMap((r) => (r.groupKey === group ? [r.id] : []))
      const { beforeId } = slotInGroup(groupOrder, near, point.y, id)
      // A slot reproducing the standing order is a noop — no line, no commit.
      if (!crossing && nextOrder(groupOrder, id, beforeId).every((x, i) => x === groupOrder[i]))
        return null
      const above = point.y < near.mid
      return {
        lineY: (above ? near.top : near.bottom) - s.boxTop,
        left: near.left - s.boxLeft + DROP_LINE_INSET,
        width: near.contentRight - near.left - DROP_LINE_INSET * 2,
        group,
        beforeId,
      }
    },
    commit: (id, slot) => onDrop(id, slot.group, slot.beforeId),
    lineFor: (slot) => ({ top: slot.lineY, left: slot.left, width: slot.width, right: 'auto' }),
    label: () => 'row',
    ghost: 'none',
    rowEl: (id) => els.current.get(id),
    scrollTarget: () => content.current,
    disabled: () => disabled,
    disclose: true,
    watch: rows,
  })

  const registerRow = (id: string, el: HTMLElement | null): void => {
    if (el) els.current.set(id, el)
    else els.current.delete(id)
  }

  const value = useMemo<Value>(
    () => ({ draggingId: drag.dragging, registerRow, begin: drag.begin }),
    [drag.dragging, drag.begin],
  )

  return (
    <Ctx.Provider value={value}>
      <div ref={content} className="drop-line-host">
        {children}
        {drag.line}
      </div>
    </Ctx.Provider>
  )
}

/** `ref` on the row, `handle` spread on the grip. `isDragging` mutes the row in place. */
export function useTableRowDrag(id: string): {
  ref: (el: HTMLElement | null) => void
  handle: { onPointerDown: (e: ReactPointerEvent) => void }
  isDragging: boolean
} {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useTableRowDrag must be used inside <TableRowDnd>')
  return {
    ref: (el) => ctx.registerRow(id, el),
    handle: { onPointerDown: (e) => ctx.begin(id, e) },
    isDragging: ctx.draggingId === id,
  }
}
```

`UIX/Interactions/tableDnd.test.tsx`:

```tsx
// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { firePointer, pressEscape, stubPointerCapture, stubRect } from './pointerHarness'
import { TableRowDnd, useTableRowDrag } from './tableDnd'
;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

stubPointerCapture()

function Row({ id }: { id: string }): React.JSX.Element {
  const { ref, handle, isDragging } = useTableRowDrag(id)
  return <div ref={ref} data-row={id} data-dragging={isDragging || undefined} {...handle} />
}

let host: HTMLDivElement
let root: Root
let dropSpy: ReturnType<
  typeof vi.fn<(activeId: string, toGroup: string, beforeId: string | null) => void>
>

const ROWS = [
  { id: 'r1', groupKey: 'g' },
  { id: 'r2', groupKey: 'g' },
  { id: 'r3', groupKey: 'g' },
]

beforeEach(async () => {
  host = document.createElement('div')
  document.body.appendChild(host)
  root = createRoot(host)
  dropSpy = vi.fn()
  await act(async () => {
    root.render(
      <TableRowDnd
        rows={ROWS}
        disabled={false}
        canReorderWithin
        canReassign={false}
        onDrop={dropSpy}
      >
        <Row id="r1" />
        <Row id="r2" />
        <Row id="r3" />
      </TableRowDnd>,
    )
  })
  const content = host.querySelector('.drop-line-host')
  if (content) stubRect(content, { top: 0, bottom: 72 })
  for (const [i, r] of ROWS.entries()) {
    const el = host.querySelector(`[data-row="${r.id}"]`)
    if (el) stubRect(el, { top: i * 24, bottom: i * 24 + 24 })
  }
})
afterEach(() => {
  act(() => root.unmount())
  host.remove()
})

const row = (id: string): HTMLElement => host.querySelector(`[data-row="${id}"]`) as HTMLElement

const startDrag = async (): Promise<void> => {
  await act(async () => {
    firePointer(row('r1'), 'pointerdown', { x: 4, y: 12 })
  })
  await act(async () => {
    firePointer(window, 'pointermove', { x: 4, y: 40 })
  })
}

describe('table row drag — Esc abort', () => {
  it('drops the insertion line and commits nothing on Escape', async () => {
    await startDrag()
    expect(host.querySelector('.drop-line')).not.toBeNull()
    await act(async () => {
      pressEscape()
    })
    expect(host.querySelector('.drop-line')).toBeNull()
    await act(async () => {
      firePointer(window, 'pointerup')
    })
    expect(dropSpy).not.toHaveBeenCalled()
  })

  it('is a no-op while idle and still commits a normal drop afterwards', async () => {
    await act(async () => {
      pressEscape()
    })
    await startDrag()
    await act(async () => {
      firePointer(window, 'pointerup')
    })
    expect(dropSpy).toHaveBeenCalledExactlyOnceWith('r1', 'g', 'r3')
  })

  it('a mid-drag rows change re-measures, so the drop commits against the live rows', async () => {
    await startDrag()
    // A watcher push removes r2 mid-drag; r3 takes its slot.
    const pushed = [
      { id: 'r1', groupKey: 'g' },
      { id: 'r3', groupKey: 'g' },
    ]
    await act(async () => {
      root.render(
        <TableRowDnd
          rows={pushed}
          disabled={false}
          canReorderWithin
          canReassign={false}
          onDrop={dropSpy}
        >
          <Row id="r1" />
          <Row id="r3" />
        </TableRowDnd>,
      )
    })
    stubRect(row('r3'), { top: 24, bottom: 48 })
    await act(async () => {
      firePointer(window, 'pointermove', { x: 4, y: 40 })
    })
    await act(async () => {
      firePointer(window, 'pointerup')
    })
    // Fresh rects put 40 below r3's midline → r1 lands after it. A frozen snapshot still holds the dead r2 and resolves a no-op, so the drop goes silent.
    expect(dropSpy).toHaveBeenCalledExactlyOnceWith('r1', 'g', null)
  })

  it('a rows push with the pointer held still re-resolves, so an immediate drop commits fresh', async () => {
    await startDrag()
    const pushed = [
      { id: 'r1', groupKey: 'g' },
      { id: 'r3', groupKey: 'g' },
    ]
    await act(async () => {
      root.render(
        <TableRowDnd
          rows={pushed}
          disabled={false}
          canReorderWithin
          canReassign={false}
          onDrop={dropSpy}
        >
          <Row id="r1" />
          <Row id="r3" />
        </TableRowDnd>,
      )
    })
    stubRect(row('r3'), { top: 24, bottom: 48 })
    await act(async () => {
      firePointer(window, 'pointerup')
    })
    expect(dropSpy).toHaveBeenCalledExactlyOnceWith('r1', 'g', null)
  })

  it('a drop below the row the dragged one already follows is a no-op, not a slot above it', async () => {
    await act(async () => {
      firePointer(row('r3'), 'pointerdown', { x: 4, y: 60 })
    })
    await act(async () => {
      firePointer(window, 'pointermove', { x: 4, y: 40 })
    })
    expect(host.querySelector('.drop-line')).toBeNull()
    await act(async () => {
      firePointer(window, 'pointerup')
    })
    expect(dropSpy).not.toHaveBeenCalled()
  })

  it('detaches the keydown listener after the gesture settles', async () => {
    const adds = vi.spyOn(window, 'addEventListener')
    const removes = vi.spyOn(window, 'removeEventListener')
    await startDrag()
    await act(async () => {
      pressEscape()
    })
    const added = adds.mock.calls.filter(([t]) => t === 'keydown').length
    const removed = removes.mock.calls.filter(([t]) => t === 'keydown').length
    expect(added).toBeGreaterThan(0)
    expect(removed).toBe(added)
  })
})
```

`Core/Navigation/NavList.tsx`, the changed regions:

```tsx
import { TableRowDnd, useTableRowDrag } from '@pommora/uix/Interactions/tableDnd'
import { nextOrder } from '@pommora/uix/Interactions/reorderModel'
```

```tsx
  const commitReorder = (activeId: string, groupKey: string, beforeId: string | null): void => {
    const group = groupKey === 'pins' ? pinRows : recents
    const next = nextOrder(
      group.map((g) => g.key),
      activeId,
      beforeId,
    )
    const over = group[next.indexOf(activeId)]?.key
    if (!over || over === activeId) return
    if (groupKey === 'pins') reorderPin(activeId, over)
    else onReorderRecent?.(activeId, over)
  }
```

```tsx
        <TableRowDnd
          rows={dndRows}
          disabled={false}
          canReorderWithin
          canReassign={false}
          onDrop={commitReorder}
        >
```

**VERIFY**

- [ ] Check the work for unnecessary code or obvious mistakes; the hook imports nothing from `Core/Views/Table` or `Core/Views/Cards`.
- [ ] `npx tsc -p UIX` → no errors; `npx tsc -p Core 2>&1 | grep -v Table/TableView` → no output (TableView's `reorderTo` is the only red until Task 2.2).
- [ ] `npx vitest run UIX/Interactions/tableDnd Core/Navigation/` → all pass, `tableDnd.test.tsx` 6 tests.
- [ ] `grep -c "hoverGlance\|runPageSendAction\|confirmDelete\|findCollectionForSet" Core/Views/Host/useViewInteractions.tsx` → 4 or more; these are now defined once for every renderer. `grep -n "export type ViewInteractions\|openIconPicker," Core/Views/Host/useViewInteractions.tsx` → no output (the icon seat is reached through `runTitleAction` alone).

#### Task 2.2

**TASK:** Rewrite `TableView.tsx` onto `useViewInteractions`, and consolidate the width table, the alignment default, the reorder helper, and the column layer TableView held in render scope into one module, `Table/useColumns.ts`, dropping the unreachable fallbacks and the duplicate by-id maps on the way.

**FILES:** `Core/Views/Table/TableView.tsx`, `Core/Views/Table/useColumns.ts` (new), `Core/Views/Table/useColumns.test.ts` (new), `Core/Views/Table/ColumnHeader.tsx`, `Core/Views/Table/columnWidths.ts` (delete), `Core/Views/Table/columnWidths.test.ts` (delete), `Core/Views/Table/columnReorder.ts` (delete), `Core/Views/Table/columnReorder.test.ts` (delete), `Core/Views/columnAlign.ts` (delete), `Core/Views/columnAlign.test.ts` (delete).

**DEPENDENCIES:** Shares Task 2.1's commit (the typecheck is red between them).

**NOW**

`TableView.tsx` is 1,427 lines. Its interaction layer sits at the ranges Task 2.1 lists. Its column layer — `widthOverride`, `alignOverride`, `collapsing`, `sliding`, `colDrag`, `resizing`, the reset effect, the overflow probe, `resolveAlign`/`resolveStyle`/`resolveWidth`, the `alignById`/`styleById`/`widthById` maps AND the `alignByCol`/`styleByCol` arrays holding the same values, three `map.get(id) ?? resolve(id)` fallbacks that can never miss, the widen detector, `dragShift`, the resize/hide/align handlers, `openHeaderMenu`, `startColumnDrag`, and `gapShift` — is spread across lines 139–193, 296–435, 743–826, 908–1007, and 1291–1298. `columnWidths.ts` (79), `columnReorder.ts` (17), and `Core/Views/columnAlign.ts` (27) are three modules with one consumer each (`TableView.tsx`), plus `columnAlign.test.ts`. `ColumnHeader.tsx`'s resize strip computes `zoom` as `cell.getBoundingClientRect().width / width`.

**CHANGE**

- [ ] Create `useColumns.ts` as drawn: the three modules' exports verbatim under `// ── Widths`, `// ── Alignment`, `// ── Order`, then `gapShift`/`DragShift`, `numberBarCapable(schema, columnId)` (one definition, used by the header menu and the cell menu), and the `useColumns(host)` hook. The hook reads `useColumnStyleMap(host)` itself and keeps ONE representation per attribute — the index-aligned `widthByCol`, `alignByCol`, `styleByCol` — plus a single by-id `colStyle` for the four click-path callers that hold a column object; the old maps and their fallbacks are gone, and `dragShift` is the one column-drag truth (no separate `dragging`/`colDragFrom`). It returns `runStyleAction(id, action)` so the header menu and the cell menu share one `style:` arm. The grid's track `onTransitionEnd` moves in as `onTrackTransitionEnd`; the overflow probe and the column drag read zoom through `readZoom`; `foldOverrides` is returned for the interactions policy.
- [ ] Rewrite `TableView.tsx` as drawn: `useColumns` first, editing state, then `useViewInteractions` with Table's policy (`graceMs: 0`, suppression on an open editor or a shown glance, the column fold, and a `rename` that seats the inline title editor); the title click opens through `interactions.openPage(row, isCmd(e))`; the cell menu builds its title context from `interactions.titleMenuContext` and dispatches page actions through `interactions.runTitleAction` before the cell and style arms; the band frame takes `interactions.bands`/`onBandDrop` and `nestable={!flat}`; the row frame's `onDrop` forwards to `interactions.onDrop`; the ghost row reads `interactions.ghost`; `DataRow` spreads `rowHover(row, api.hover)`; the row api is one `useStableApi<RowCellApi>({...})` call in place of the ref-and-memo pair; the icon picker is `{interactions.iconPicker}`; the cell picker's target is `pickTarget(c.row, c.col)` and the mass picker reads its definition and Context options from `pickTarget(rows[0], col)`, so `pickerDefOf` and `cellTarget` go along with the `PickTarget`, `PropertyDefinition`, `ContextOption`, and `syntheticContextDef` imports.
- [ ] `ColumnHeader.tsx`: the resize strip reads `readZoom(grid)` from the header's `.table-grid`, `1` when absent.
- [ ] `useColumns.test.ts`: the three retired test files' cases verbatim under three outer describes; delete the six retired files.

**AFTER**

`Core/Views/Table/useColumns.ts`:

```ts
// Everything a table column is: the width table and its clamp, the default alignment, the reorder helper, and the hook that resolves a view's columns into the per-index width, alignment and style the grid paints — plus the resize, hide, align and drag gestures that rewrite them.

import { useEffect, useMemo, useRef, useState } from 'react'
import { columnMenuItems, parseStyleAction } from '@pommora/core/Actions/columnMenu'
import { defaultStyleFor, type ColumnStyle } from '@pommora/core/Properties/columnStyles'
import type { PropertyDefinition } from '@pommora/core/Properties/properties'
import { RESERVED_PROPERTY_ID } from '@pommora/core/Properties/properties'
import type { ColumnAlign, SavedView } from '@pommora/core/Views/views'
import { announce } from '@pommora/uix/Interactions/a11y'
import { findScroller, startAutoScroll } from '@pommora/uix/Interactions/autoscroll'
import { reorder } from '@pommora/uix/Interactions/drag'
import { usePointerGesture } from '@pommora/uix/Interactions/gesture'
import { ICON_PX } from '@pommora/uix/Theme/theme-vars.css'
import { readZoom } from '@pommora/uix/Utilities/zoom'
import { popMenu } from '../../Actions/menuActions'
import { numberDivisor } from '../../Properties/formatValue'
import { declaredType } from '../../Properties/value'
import { NO_STYLE, useColumnStyleMap } from '../Host/useColumnStyles'
import type { ViewHostApi } from '../Host/useViewHost'

// ── Widths ──────────────────────────────────────────────────────────────────

interface ColumnWidth {
  min: number
  default: number
  max: number
}

// Only `title` is UNCAPPED — a resize past the pane h-scrolls instead of hitting a wall. Mins stay so a stale saved value can't squash a column below legibility.
const UNCAPPED = Number.POSITIVE_INFINITY
const WIDTHS: Record<string, ColumnWidth> = {
  title: { min: 120, default: 280, max: UNCAPPED },
  context: { min: 80, default: 140, max: 350 },
  status: { min: 65, default: 120, max: 250 },
  select: { min: 65, default: 120, max: 350 },
  multi_select: { min: 65, default: 180, max: 350 },
  checkbox: { min: 45, default: 60, max: 80 },
  url: { min: 100, default: 140, max: 350 },
  file: { min: 100, default: 140, max: 250 },
  number: { min: 50, default: 100, max: 350 },
  datetime: { min: 90, default: 140, max: 250 },
  created_time: { min: 90, default: 120, max: 250 },
  last_edited_time: { min: 90, default: 120, max: 250 },
}

const FALLBACK: ColumnWidth = { min: 80, default: 140, max: UNCAPPED }

// Per-look min overrides replace the type's base min; status, select and multi-select are one option-chip family, so they share OPTION_MIN.
const OPTION_MIN = { compact: 65, standard: 80 } as const
const STYLE_MIN: Record<string, Partial<Record<string, number>>> = {
  checkbox: { switch: 70 },
  status: OPTION_MIN,
  select: OPTION_MIN,
  multi_select: OPTION_MIN,
}

const HEADER_ICON_BUMP = ICON_PX.body + 6

/** `contextIds` is what makes a Context column classify as such — omit it and one takes the fallback instead of the Context width. */
export function widthFor(
  columnId: string,
  schema: PropertyDefinition[],
  contextIds: readonly string[] = [],
): ColumnWidth {
  const t = declaredType(columnId, schema, contextIds)
  return (t !== undefined && WIDTHS[t]) || FALLBACK
}

/** `look` omitted resolves the type's DEFAULT look, so an unstyled option column reads its Standard min; reserved timestamp columns keep the base. */
export function minWidthFor(
  columnId: string,
  schema: PropertyDefinition[],
  look?: string,
  contextIds: readonly string[] = [],
  iconsShown = false,
): number {
  const bump = iconsShown ? HEADER_ICON_BUMP : 0
  const base = widthFor(columnId, schema, contextIds).min
  const t = declaredType(columnId, schema, contextIds)
  if (t === undefined) return base + bump
  const resolved = look ?? defaultStyleFor(t).look
  const override = resolved !== undefined ? STYLE_MIN[t]?.[resolved] : undefined
  return (override ?? base) + bump
}

export function clampWidth(
  width: number,
  columnId: string,
  schema: PropertyDefinition[],
  look?: string,
  contextIds: readonly string[] = [],
  iconsShown = false,
): number {
  const { max } = widthFor(columnId, schema, contextIds)
  return Math.max(minWidthFor(columnId, schema, look, contextIds, iconsShown), Math.min(max, width))
}

// ── Alignment ───────────────────────────────────────────────────────────────

// The chip- and box-shaped values center; so does a datetime, whose formatted value reads centered. The reserved Modified timestamp keeps Title's left metadata treatment.
const CENTERED = new Set(['checkbox', 'status', 'select', 'multi_select', 'context', 'datetime'])

/** `contextIds` is what makes a Context column classify as such — omit it and one reads as an unknown type. */
export function defaultAlignFor(
  columnId: string,
  schema: PropertyDefinition[],
  contextIds: readonly string[] = [],
): ColumnAlign {
  if (columnId === RESERVED_PROPERTY_ID.title) return 'left'
  const t = declaredType(columnId, schema, contextIds)
  return t !== undefined && CENTERED.has(t) ? 'center' : 'left'
}

export function alignFor(
  columnId: string,
  schema: PropertyDefinition[],
  view: SavedView,
  contextIds: readonly string[] = [],
): ColumnAlign {
  return view.column_alignments?.[columnId] ?? defaultAlignFor(columnId, schema, contextIds)
}

// ── Order ───────────────────────────────────────────────────────────────────

/** Any hidden property is preserved at the tail so a later hide/show toggle can't drop it, and the full visible order is written explicitly so default-on reserved columns persist the slot they were dragged to. */
export function reorderColumns(
  visibleIds: string[],
  propertyOrder: string[],
  activeId: string,
  overId: string,
): string[] {
  const next = reorder(
    visibleIds.map((id) => ({ id })),
    activeId,
    overId,
  ).map((o) => o.id)
  const hidden = propertyOrder.filter((id) => !visibleIds.includes(id))
  return [...next, ...hidden]
}

// ── The painted shift ───────────────────────────────────────────────────────

export type DragShift = { from: number; to: number; width: number }

export function gapShift(d: DragShift | null, ci: number): string | undefined {
  if (!d) return undefined
  if (d.to < d.from && ci >= d.to && ci < d.from) return `translateX(${d.width}px)`
  if (d.to > d.from && ci > d.from && ci <= d.to) return `translateX(${-d.width}px)`
  return undefined
}

/** A number column offers the Bar look only where a divisor gives the bar a ceiling to fill. */
export function numberBarCapable(schema: PropertyDefinition[], columnId: string): boolean {
  return (
    declaredType(columnId, schema) === 'number' &&
    numberDivisor(schema.find((d) => d.id === columnId)) !== undefined
  )
}

// TUNABLE — px past a column's edge the drag center must travel before the slot flips (sticky zone).
const COL_SHIFT_HYSTERESIS = 25

// ── The hook ────────────────────────────────────────────────────────────────

export function useColumns(host: ViewHostApi) {
  const {
    schema,
    view,
    liveView,
    columns,
    contextIds,
    persistView,
    setOrderOverride,
    setHiddenOverride,
    setStylePatch,
  } = host
  const beginGesture = usePointerGesture()
  // Local column layers stay OUT of `liveView` — a resize must not re-run the pipeline.
  const [widthOverride, setWidthOverride] = useState<Record<string, number>>({})
  const [alignOverride, setAlignOverride] = useState<Record<string, ColumnAlign>>({})
  const [collapsing, setCollapsing] = useState<string | null>(null)
  const [sliding, setSliding] = useState<ReadonlySet<string>>(() => new Set())
  const [colDrag, setColDrag] = useState<{ from: number; to: number; id: string } | null>(null)
  const [resizing, setResizing] = useState(false)
  const [overflowing, setOverflowing] = useState(false)
  // The column sum, read from here rather than scrollWidth: scrollWidth floors at clientWidth, so an is-content-bigger comparison built on it latches.
  const reflowRef = useRef(0)
  // Captured at resize start so an abort restores exactly — an entry absent before the drag is deleted, never written back as a width a later persist would carry to disk.
  const resizeBaseline = useRef<{ id: string; value: number | undefined } | null>(null)

  useEffect(() => {
    setWidthOverride({})
    setAlignOverride({})
    setCollapsing(null)
    setColDrag(null)
  }, [view.id])

  const iconsShown = !(liveView.hide_column_icons ?? true)
  const styleMap = useColumnStyleMap(host)
  const alignByCol = useMemo(
    () => columns.map((c) => alignOverride[c.id] ?? alignFor(c.id, schema, liveView, contextIds)),
    [columns, schema, liveView, alignOverride, contextIds],
  )
  const styleByCol = useMemo(
    () => columns.map((c) => styleMap.get(c.id) ?? NO_STYLE),
    [columns, styleMap],
  )
  const widthByCol = useMemo(
    () =>
      columns.map((c, i) =>
        clampWidth(
          widthOverride[c.id] ??
            liveView.column_widths?.[c.id] ??
            widthFor(c.id, schema, contextIds).default,
          c.id,
          schema,
          styleByCol[i].look,
          contextIds,
          iconsShown,
        ),
      ),
    [columns, schema, liveView, widthOverride, contextIds, styleByCol, iconsShown],
  )
  const indexOf = (id: string): number => columns.findIndex((c) => c.id === id)
  const colStyle = (id: string): ColumnStyle => styleByCol[indexOf(id)]
  const colWidth = (i: number): number => (collapsing === columns[i].id ? 0 : widthByCol[i])

  const [prevStyles, setPrevStyles] = useState(styleByCol)
  if (prevStyles !== styleByCol) {
    setPrevStyles(styleByCol)
    const widened: string[] = []
    columns.forEach((c, i) => {
      const look = styleByCol[i].look
      const prev = prevStyles[i]?.look
      if (prev === look) return
      const basis =
        widthOverride[c.id] ??
        liveView.column_widths?.[c.id] ??
        widthFor(c.id, schema, contextIds).default
      if (
        clampWidth(basis, c.id, schema, look, contextIds, iconsShown) >
        clampWidth(basis, c.id, schema, prev, contextIds, iconsShown)
      )
        widened.push(c.id)
    })
    if (widened.length) setSliding((s) => new Set([...s, ...widened]))
  }
  const dragShift = useMemo(() => {
    if (!colDrag) return null
    // A watcher or pane write can reshape `columns` mid-drag — a vanished source column ends the shift rather than painting a neighbor.
    const src = columns[colDrag.from]
    return src && src.id === colDrag.id
      ? { from: colDrag.from, to: colDrag.to, width: colWidth(colDrag.from) }
      : null
  }, [colDrag, columns])

  const reflowWidth = columns.reduce((sum, _c, i) => sum + colWidth(i), 0)
  reflowRef.current = reflowWidth
  const cols = `${columns.map((_c, i) => `${colWidth(i)}px`).join(' ')} 1fr`

  useEffect(() => {
    const el = host.seam.viewRootRef.current
    if (!el) return
    const check = (): void => {
      const cs = getComputedStyle(el)
      const pads = Number.parseFloat(cs.paddingLeft) + Number.parseFloat(cs.paddingRight)
      const gridEl = el.querySelector('.table-grid')
      setOverflowing(
        reflowRef.current * (gridEl ? readZoom(gridEl) : 1) > el.clientWidth - pads + 1,
      )
    }
    check()
    const ro = new ResizeObserver(check)
    ro.observe(el)
    const grid = el.querySelector('.table-grid')
    if (grid) ro.observe(grid)
    return () => ro.disconnect()
  }, [])

  const reorderColumn = (activeId: string, overId: string): void => {
    const next = reorderColumns(
      columns.map((c) => c.id),
      liveView.property_order,
      activeId,
      overId,
    )
    setOrderOverride(next)
    persistView({ property_order: next })
  }
  const resizeColumn = (id: string, width: number): number => {
    const clamped = clampWidth(
      Math.round(width),
      id,
      schema,
      colStyle(id).look,
      contextIds,
      iconsShown,
    )
    setWidthOverride((prev) => ({ ...prev, [id]: clamped }))
    return clamped
  }
  const startResize = (id: string): void => {
    resizeBaseline.current = { id, value: widthOverride[id] }
    setResizing(true)
  }
  // Cleared by whichever end fires, never by teardown — the skeleton runs teardown BEFORE onAbort.
  const abortResize = (): void => {
    const b = resizeBaseline.current
    if (!b) return
    resizeBaseline.current = null
    setWidthOverride((prev) => {
      const next = { ...prev }
      if (b.value === undefined) delete next[b.id]
      else next[b.id] = b.value
      return next
    })
  }
  const endResize = (): void => {
    setResizing(false)
  }
  const commitResize = (id: string, width: number): void => {
    resizeBaseline.current = null
    persistView({
      column_widths: {
        ...liveView.column_widths,
        ...widthOverride,
        [id]: clampWidth(width, id, schema, colStyle(id).look, contextIds, iconsShown),
      },
    })
  }
  const hideColumn = (id: string): void => {
    setCollapsing(id)
  }
  const commitHide = (): void => {
    if (!collapsing) return
    const hidden = [...(liveView.hidden_properties ?? []), collapsing]
    setCollapsing(null)
    setHiddenOverride(hidden)
    persistView({ hidden_properties: hidden })
  }
  const setColumnAlign = (id: string, align: ColumnAlign): void => {
    setAlignOverride((prev) => ({ ...prev, [id]: align }))
    persistView({
      column_alignments: { ...liveView.column_alignments, ...alignOverride, [id]: align },
    })
  }
  /** The style half of any column menu — false when the action belongs to the caller. */
  const runStyleAction = (id: string, action: string): boolean => {
    const parsed = parseStyleAction(action)
    if (!parsed) return false
    setStylePatch(id, parsed.key, parsed.value)
    return true
  }
  const openHeaderMenu = async (
    id: string,
    isTitle: boolean,
    e: React.MouseEvent,
  ): Promise<void> => {
    e.preventDefault()
    const t = declaredType(id, schema)
    const barCapable = numberBarCapable(schema, id)
    const style =
      t !== undefined && t !== 'title' && t !== 'context'
        ? { type: t, current: colStyle(id), ...(barCapable ? { barCapable: true } : {}) }
        : undefined
    const action = await popMenu(
      columnMenuItems({
        align: alignByCol[indexOf(id)],
        alignable: !isTitle,
        hideable: !isTitle,
        iconsShown,
        style,
      }),
    )
    if (action === 'column:hide') hideColumn(id)
    else if (action === 'column:toggle-icons') persistView({ hide_column_icons: iconsShown })
    else if (action?.startsWith('align:'))
      setColumnAlign(id, action.slice('align:'.length) as ColumnAlign)
    else if (action) runStyleAction(id, action)
  }
  const startColumnDrag = (e: React.PointerEvent, from: number): void => {
    if (e.button !== 0) return
    e.preventDefault()
    const header = e.currentTarget as HTMLElement
    const grid = header.closest('.table-grid') as HTMLElement | null
    if (!grid) return
    // Snapshot in the activation, not the press: a per-move rect loop forces layout in the drag hot path, and a pending-phase scroll would strand a press-time origin.
    let zoom = 1
    let startCenter = 0
    let startX = 0
    let gridLeft = 0
    let widths: number[] = []
    let lefts: number[] = []
    const dragId = columns[from].id
    let current: { from: number; to: number; id: string } | null = null
    let lastX = e.clientX
    let lastY = e.clientY
    let stopScroll: (() => void) | null = null
    const resolve = (): void => {
      const projected = startCenter + (lastX - startX)
      const cur = current?.to ?? from
      const curLeft = gridLeft + lefts[cur]
      const curRight = curLeft + widths[cur]
      let to = cur
      if (
        projected < curLeft - COL_SHIFT_HYSTERESIS ||
        projected > curRight + COL_SHIFT_HYSTERESIS
      ) {
        to = columns.length - 1
        for (let i = 0; i < columns.length; i++) {
          if (projected < gridLeft + lefts[i] + widths[i]) {
            to = i
            break
          }
        }
      }
      grid.style.setProperty(
        '--col-drag-x',
        `${(projected - (gridLeft + lefts[from] + widths[from] / 2)) / zoom}px`,
      )
      if (!current || current.to !== to) {
        current = { from, to, id: dragId }
        setColDrag(current)
      }
    }
    beginGesture({
      el: header,
      event: e,
      onActivate: (ev) => {
        // Read computed so a scaled tile's drag maps 1:1 — not the --zoom token alone, and never back-solved from rendered width ÷ track width (that bakes in layout slack).
        zoom = readZoom(grid)
        const hr = header.getBoundingClientRect()
        startCenter = hr.left + hr.width / 2
        startX = ev.clientX
        lastX = ev.clientX
        gridLeft = grid.getBoundingClientRect().left
        widths = columns.map((_c, i) => colWidth(i) * zoom)
        lefts = new Array(columns.length)
        let acc = 0
        for (let i = 0; i < columns.length; i++) {
          lefts[i] = acc
          acc += widths[i]
        }
        const sc = findScroller(grid, 'x')
        if (sc) {
          stopScroll = startAutoScroll({
            getPoint: () => ({ x: lastX, y: lastY }),
            scroller: sc,
            dragEl: grid,
            axis: 'x',
          })
        }
        announce('Picked up column.')
        return true
      },
      onDragMove: (ev) => {
        lastX = ev.clientX
        lastY = ev.clientY
        resolve()
      },
      scrollTarget: () => grid,
      onWindowScroll: () => {
        gridLeft = grid.getBoundingClientRect().left
        resolve()
      },
      onDrop: () => {
        if (current && current.to !== current.from) {
          reorderColumn(columns[current.from].id, columns[current.to].id)
          announce('Moved column.')
        }
      },
      teardown: () => {
        stopScroll?.()
        stopScroll = null
        grid.style.removeProperty('--col-drag-x')
        setColDrag(null)
      },
    })
  }
  /** The hide collapses the track to zero and the widen slides it out — both land on the same track transition. */
  const onTrackTransitionEnd = (e: React.TransitionEvent): void => {
    if (e.propertyName !== 'grid-template-columns') return
    commitHide()
    setSliding((s) => (s.size ? new Set() : s))
  }

  return {
    foldOverrides: (v: SavedView): SavedView => ({
      ...v,
      column_widths: { ...v.column_widths, ...widthOverride },
      column_alignments: { ...v.column_alignments, ...alignOverride },
    }),
    iconsShown,
    alignByCol,
    styleByCol,
    widthByCol,
    colStyle,
    dragShift,
    cols,
    reflowWidth,
    overflowing,
    hiding: collapsing !== null,
    sliding: sliding.size > 0,
    resizing,
    resizeColumn,
    startResize,
    abortResize,
    endResize,
    commitResize,
    openHeaderMenu,
    runStyleAction,
    startColumnDrag,
    onTrackTransitionEnd,
  }
}
```

`Core/Views/Table/TableView.tsx`:

```tsx
import { memo, useEffect, useRef, useState } from 'react'
import type { ResolvedColumn, ResolvedGroup, ViewRow } from '@pommora/core/Views/viewRow'
import type { ColumnStyle } from '@pommora/core/Properties/columnStyles'
import {
  type CellMenuContext,
  cellMenuContextFor,
  cellMenuModel,
} from '@pommora/core/Actions/cellMenu'
import type { ColumnAlign } from '@pommora/core/Views/views'
import { isBlankValue, type PropertyValue } from '@pommora/core/Properties/propertyValue'
import { isOptionsKind } from '@pommora/core/Properties/properties'
import { declaredType, resolveFieldValue } from '../../Properties/value'
import { PropertyEditor } from '../../Properties/Pickers/PropertyEditor'
import { parseEditorValue } from '../../Properties/parseEditorValue'
import { MassPropertyPicker } from '../../Properties/Pickers/MassPropertyPicker'
import { groupValueUndo } from '../../Properties/valueUndo'
import { PropertyPicker } from '../../Properties/Pickers/PropertyPicker'
import { sharedValueClickAction } from '../../Properties/Pickers/valueClick'
import type { ViewHostApi } from '../Host/useViewHost'
import { rowHover, useViewInteractions } from '../Host/useViewInteractions'
import { fileChipIndex, pickFileInto, runFileMenuAction } from '../../Properties/Pickers/filePick'
import { useSession } from '../../Session/store'
import { glanceShown } from '../../Interface/Glance/glanceAction'
import type { ValueContext } from '../../Properties/valueContext'
import { BandDnd } from '../Bands/BandDnd'
import { isCmd, isSecondaryClick } from '@pommora/uix/Interactions/chords'
import { Cell } from '../../Properties/Cells/Cell'
import { EntityIcon } from '../../Assets/EntityIcon'
import { PropertyTypeIcon, propertyIcon } from '../../Properties/Cells/PropertyTypes'
import { ViewGroupBand } from '../Bands/ViewGroupBand'
import { Reveal } from '@pommora/uix/Animations/Reveal'
import { columnLabel, useCapitalizeMetadata } from '../../Properties/Cells/columnLabel'
import { type DragShift, gapShift, numberBarCapable, useColumns } from './useColumns'
import { cx } from '@pommora/uix/Utilities/cx'
import { useStableApi } from '@pommora/uix/Utilities/stableApi'
import { text } from '@pommora/uix/Theme'
import { Icon } from '@pommora/uix/Symbols'
import { TextPicker } from '@pommora/uix/Pickers/TextPicker'
import { numberDivisor } from '../../Properties/formatValue'
import { ColumnHeader } from './ColumnHeader'
import './table-view.css'
import type { GhostAnchor } from '@pommora/uix/Interactions/ghostCreate'
import { useCellSweep } from './cellSweep'
import { TableRowDnd, useTableRowDrag } from '@pommora/uix/Interactions/tableDnd'
import { solidColorCss } from '@pommora/uix/Theme/ramp'
import { openWebLink } from '../../Web/openWebLink'
import {
  linkAlias,
  linkEditText,
  urlClickTarget,
  urlValueFromRename,
} from '@pommora/core/Connections/linkValue'
import { validateLink } from '../../Properties/Cells/linkResolve'
import {
  linkValueMenuTarget,
  showConnectionMenu,
} from '../../Interface/Menus/connectionMenuActions'
import { popMenu } from '../../Actions/menuActions'

export function TableView({ host }: { host: ViewHostApi }): React.JSX.Element {
  const capitalize = useCapitalizeMetadata()
  const {
    source,
    schema,
    liveView,
    columns,
    groups,
    ctx,
    setNames,
    setIcons,
    setPaths,
    rowById,
    paintOrder,
    bandLabel,
    collapsed,
    toggleCollapse,
    flat,
    canReassign,
    canReorderWithin,
    canRelocate,
    dragDisabled,
    commitValue,
    pickTarget,
    creation,
    mutate,
    select,
  } = host
  const selection = useSession((s) => s.selection)
  const {
    foldOverrides,
    iconsShown,
    alignByCol,
    styleByCol,
    widthByCol,
    colStyle,
    dragShift,
    cols,
    reflowWidth,
    overflowing,
    hiding,
    sliding,
    resizing,
    resizeColumn,
    startResize,
    abortResize,
    endResize,
    commitResize,
    openHeaderMenu,
    runStyleAction,
    startColumnDrag,
    onTrackTransitionEnd,
  } = useColumns(host)

  // ── Editing ───────────────────────────────────────────────────────────────

  const [editing, setEditing] = useState<{
    rowId: string
    colId: string
    mode: 'picker' | 'editor' | 'rename'
    nonce?: number
    fromCreate?: true
  } | null>(null)
  const triggerElRef = useRef<HTMLElement | null>(null)
  const lastPicker = useRef<{ rowId: string; colId: string } | null>(null)
  if (editing?.mode === 'picker')
    lastPicker.current = { rowId: editing.rowId, colId: editing.colId }
  const renameNonce = useRef(0)
  const lastRename = useRef<{ rowId: string; colId: string; nonce: number } | null>(null)
  if (editing?.mode === 'rename') {
    lastRename.current = { rowId: editing.rowId, colId: editing.colId, nonce: editing.nonce ?? 0 }
  }
  const editingRef = useRef(editing)
  editingRef.current = editing
  const strandedEditId = editing !== null && !rowById.has(editing.rowId) ? editing.rowId : null
  useEffect(() => {
    if (strandedEditId !== null) setEditing((e) => (e?.rowId === strandedEditId ? null : e))
  }, [strandedEditId])
  const titleCol = columns.find((c) => c.kind === 'title')
  const titleColId = titleCol?.id

  const interactions = useViewInteractions(host, {
    ghost: { graceMs: 0, suppressed: () => editingRef.current !== null || glanceShown() },
    foldOverrides,
    rename: (target, fromCreate) => {
      if (titleColId)
        setEditing({
          rowId: target.id,
          colId: titleColId,
          mode: 'editor',
          ...(fromCreate ? { fromCreate: true } : {}),
        })
    },
  })

  // ── Cell click ────────────────────────────────────────────────────────────

  const onCellClick = (row: ViewRow, col: ResolvedColumn, e: React.MouseEvent): void => {
    // A secondary-click fires `click` alongside `contextmenu`, so bail and let the right-click menu win.
    if (isSecondaryClick(e)) return
    triggerElRef.current = e.currentTarget as HTMLElement
    if (col.kind === 'title') {
      e.stopPropagation()
      interactions.openPage(row, isCmd(e))
      return
    }
    if (col.kind !== 'property' && col.kind !== 'context') return
    const t = col.kind === 'context' ? 'context' : declaredType(col.id, schema)
    const value = resolveFieldValue(row, col.id, schema)
    const def = schema.find((d) => d.id === col.id)
    const shared = sharedValueClickAction(t, value)
    if (shared) {
      e.stopPropagation()
      if (shared.kind === 'commit') commitValue(row, col, shared.value)
      else if (shared.kind === 'file') {
        if (def) pickFileInto(def, value, fileChipIndex(e.target), (n) => commitValue(row, col, n))
      } else setEditing({ rowId: row.id, colId: col.id, mode: 'picker' })
    } else if (t === 'number') {
      e.stopPropagation()
      if (colStyle(col.id).look === 'bar') {
        renameNonce.current += 1
        setEditing({ rowId: row.id, colId: col.id, mode: 'rename', nonce: renameNonce.current })
      } else {
        setEditing({ rowId: row.id, colId: col.id, mode: 'editor' })
      }
    } else if (t === 'url') {
      e.stopPropagation()
      const v = resolveFieldValue(row, col.id, schema)
      const raw = v.kind === 'url' ? v.value : undefined
      const url = urlClickTarget(raw)
      if (url) openWebLink(url)
      else if (!raw) setEditing({ rowId: row.id, colId: col.id, mode: 'editor' })
    }
  }

  // ── The inline editor and the pickers ─────────────────────────────────────

  const editorInitial = (row: ViewRow, col: ResolvedColumn): string => {
    if (col.kind === 'title') return editing?.fromCreate ? '' : row.title
    const v = resolveFieldValue(row, col.id, schema)
    if (v.kind === 'number') return String(v.value)
    if (v.kind === 'url') return linkEditText(v.value)
    return ''
  }
  const commitEditorText = (row: ViewRow, col: ResolvedColumn, raw: string): void => {
    const fromCreate = editing?.fromCreate
    setEditing(null)
    if (col.kind === 'title') {
      const trimmed = raw.trim()
      if (trimmed && trimmed !== row.title)
        void mutate({
          op: 'rename',
          path: row.path,
          kind: 'page',
          newName: trimmed,
          ...(fromCreate ? { fromCreate } : {}),
        })
      return
    }
    const next = parseEditorValue(
      declaredType(col.id, schema),
      raw,
      resolveFieldValue(row, col.id, schema),
    )
    if (next !== undefined) commitValue(row, col, next)
  }
  const cellEditor = (row: ViewRow, col: ResolvedColumn): React.ReactNode => {
    if (editing?.mode !== 'editor' || editing.rowId !== row.id || editing.colId !== col.id)
      return null
    const t = declaredType(col.id, schema)
    const editor = (
      <PropertyEditor
        initial={editorInitial(row, col)}
        numeric={t === 'number'}
        validate={t === 'url' ? validateLink : undefined}
        color={
          t === 'url' ? solidColorCss(schema.find((d) => d.id === col.id)?.link_color) : undefined
        }
        onCommit={(raw) => commitEditorText(row, col, raw)}
        onCancel={() => setEditing(null)}
      />
    )
    if (col.kind !== 'title' || liveView.hide_page_icons) return editor
    return (
      <span className="cell-rename">
        <EntityIcon kind="page" icon={row.icon} size="body" />
        {editor}
      </span>
    )
  }

  const pickerCell = (): { row: ViewRow; col: ResolvedColumn } | null => {
    const cell = editing?.mode === 'picker' ? editing : lastPicker.current
    const row = cell && rowById.get(cell.rowId)
    const col = cell && columns.find((c) => c.id === cell.colId)
    return row && col ? { row, col } : null
  }
  const cellPicker = (): React.ReactNode => {
    const c = pickerCell()
    return (
      <PropertyPicker
        key={c ? `${c.row.id}:${c.col.id}` : 'none'}
        target={c ? pickTarget(c.row, c.col) : null}
        open={editing?.mode === 'picker'}
        triggerRef={triggerElRef}
        onCommit={(v) => {
          if (c) commitValue(c.row, c.col, v)
        }}
        onDismiss={() => setEditing(null)}
      />
    )
  }
  const massPicker = (): React.ReactNode => {
    if (!mass) return null
    const col = columns.find((c) => c.id === mass.colId)
    if (!col) return null
    const rows = mass.rowIds.flatMap((id) => {
      const r = rowById.get(id)
      return r ? [r] : []
    })
    if (rows.length < 2) return null
    const target = pickTarget(rows[0], col)
    const contextOptions = target.kind === 'options' ? target.contextOptions : undefined
    const currents = rows.map((r) => resolveFieldValue(r, col.id, schema))
    return (
      <MassPropertyPicker
        key={`${mass.colId}:${mass.rowIds.join('.')}`}
        def={target.def}
        currents={currents}
        open={massOpen}
        triggerRef={massTriggerRef}
        look={colStyle(col.id).look}
        {...(contextOptions ? { contextOptions } : {})}
        onPick={(commits) => {
          if (commits.length)
            groupValueUndo(() => {
              for (const { index, next } of commits) commitValue(rows[index], col, next)
            })
        }}
        onDismiss={() => {
          setMassOpen(false)
          cellSweep.clear()
        }}
      />
    )
  }
  const renameField = (): React.ReactNode => {
    const cell = editing?.mode === 'rename' ? editing : lastRename.current
    const row = cell && rowById.get(cell.rowId)
    const col = cell && columns.find((c) => c.id === cell.colId)
    if (!cell || !row || !col) return null
    const v = resolveFieldValue(row, col.id, schema)
    const open = editing?.mode === 'rename'
    const key = `${cell.rowId}:${cell.colId}:${cell.nonce}`
    if (declaredType(col.id, schema) === 'number') {
      const divisor = numberDivisor(schema.find((d) => d.id === col.id))
      return (
        <TextPicker
          key={key}
          open={open}
          triggerRef={triggerElRef}
          value={v.kind === 'number' ? String(v.value) : ''}
          trailing={divisor !== undefined ? `/ ${divisor}` : undefined}
          onCommit={(text) => {
            const next = parseEditorValue('number', text)
            if (next !== undefined) commitValue(row, col, next)
            setEditing(null)
          }}
          onDismiss={() => setEditing(null)}
        />
      )
    }
    const raw = v.kind === 'url' ? v.value : ''
    const linkDef = schema.find((d) => d.id === col.id)
    return (
      <TextPicker
        key={key}
        open={open}
        triggerRef={triggerElRef}
        value={linkAlias(raw) ?? ''}
        accent={solidColorCss(linkDef?.link_color)}
        onCommit={(alias) => {
          commitValue(row, col, urlValueFromRename(alias, raw))
          setEditing(null)
        }}
        onDismiss={() => setEditing(null)}
      />
    )
  }

  // ── The cell menu ─────────────────────────────────────────────────────────

  const openCellMenu = async (
    row: ViewRow,
    col: ResolvedColumn,
    e: React.MouseEvent,
  ): Promise<void> => {
    e.preventDefault()
    e.stopPropagation()
    // Captured before the await — React recycles the synthetic event, so the popover can't read `e.currentTarget` once the menu resolves.
    const el = e.currentTarget as HTMLElement
    const cellEl = el.closest<HTMLElement>('.data-cell') ?? el
    const filled = !isBlankValue(resolveFieldValue(row, col.id, schema))
    const dt = declaredType(col.id, schema)
    if (dt === 'url') {
      const v = resolveFieldValue(row, col.id, schema)
      const target = linkValueMenuTarget(v.kind === 'url' ? v.value : '', (action) => {
        if (action === 'link:clear') return commitValue(row, col, null)
        if (action === 'editLink')
          return setEditing({ rowId: row.id, colId: col.id, mode: 'editor' })
        if (action !== 'rename') return
        triggerElRef.current = cellEl
        renameNonce.current += 1
        setEditing({ rowId: row.id, colId: col.id, mode: 'rename', nonce: renameNonce.current })
      })
      if (target) {
        await interactions.holdGhost(async () => showConnectionMenu(target))
        return
      }
    }
    const chip = fileChipIndex(e.target)
    const base = cellMenuContextFor(col, dt, colStyle(col.id), filled, {
      barCapable: numberBarCapable(schema, col.id),
      onChip: chip !== null,
    })
    if (!base) return
    const ctx: CellMenuContext =
      base.kind === 'title' ? { ...base, ...interactions.titleMenuContext(row) } : base
    const action = await interactions.holdGhost(() => popMenu(cellMenuModel(ctx)))
    if (!action) return
    if (interactions.runTitleAction(action, row, cellEl)) return
    if (
      runFileMenuAction(
        action,
        schema.find((d) => d.id === col.id),
        resolveFieldValue(row, col.id, schema),
        chip,
        (n) => commitValue(row, col, n),
      )
    )
      return
    if (action === 'cell:edit') setEditing({ rowId: row.id, colId: col.id, mode: 'editor' })
    else if (action === 'cell:rename') {
      triggerElRef.current = cellEl
      renameNonce.current += 1
      setEditing({ rowId: row.id, colId: col.id, mode: 'rename', nonce: renameNonce.current })
    } else if (action === 'cell:clear') {
      commitValue(row, col, null)
    } else runStyleAction(col.id, action)
  }

  // ── The sweep ─────────────────────────────────────────────────────────────

  const [mass, setMass] = useState<{ colId: string; rowIds: string[] } | null>(null)
  const [massOpen, setMassOpen] = useState(false)
  const massTriggerRef = useRef<HTMLElement | null>(null)
  const cellSweep = useCellSweep({
    gridEl: () => host.seam.viewRootRef.current,
    onSettle: (colId, rowIds, settleRowId) => {
      const at = columns.findIndex((c) => c.id === colId)
      const cell = host.seam.viewRootRef.current
        ?.querySelector(`[data-rid="${CSS.escape(settleRowId)}"]`)
        ?.children.item(at)
      if (!(cell instanceof HTMLElement)) return cellSweep.clear()
      massTriggerRef.current = cell
      setMass({ colId, rowIds })
      setMassOpen(true)
    },
  })
  const startSweep = (row: ViewRow, col: ResolvedColumn, e: React.PointerEvent): boolean => {
    const t = col.kind === 'context' ? 'context' : declaredType(col.id, schema)
    if (!isOptionsKind(t)) return false
    if (e.button !== 0) return false
    cellSweep.begin(row.id, col.id, e)
    return true
  }
  const massDegraded =
    mass !== null &&
    massOpen &&
    (columns.every((c) => c.id !== mass.colId) ||
      mass.rowIds.filter((id) => rowById.has(id)).length < 2)
  useEffect(() => {
    if (!massDegraded) return
    setMassOpen(false)
    cellSweep.clear()
  })

  // ── The row api ───────────────────────────────────────────────────────────

  const cellApi = useStableApi<RowCellApi>({
    menu: (row, col, e) => void openCellMenu(row, col, e),
    click: onCellClick,
    overlay: cellEditor,
    remove: commitValue,
    grip: (row, e) => {
      if (titleCol) void openCellMenu(row, titleCol, e)
    },
    sweep: startSweep,
    hover: interactions.ghost.onHover,
  })
  const overlayTarget = editing?.mode === 'editor' ? editing : null
  const renameTarget = editing?.mode === 'rename' ? editing : null
  const activeCell = editing ? { rowId: editing.rowId, colId: editing.colId } : null

  // ── The render ────────────────────────────────────────────────────────────

  const headerIcon = (id: string): React.ReactNode => {
    if (!iconsShown) return null
    const contextIcon = ctx?.contexts.get(id)?.icon
    if (contextIcon) {
      return (
        <span className="col-header-icon">
          <Icon name={contextIcon} size="body" />
        </span>
      )
    }
    const def = schema.find((d) => d.id === id)
    if (def) {
      return (
        <span className="col-header-icon">
          <Icon name={propertyIcon(def)} size="body" />
        </span>
      )
    }
    const t = declaredType(id, schema)
    if (t === undefined) return null
    return (
      <span className="col-header-icon">
        <PropertyTypeIcon type={t} size="body" />
      </span>
    )
  }
  const indent = (depth: number): string =>
    depth > 0 ? `calc(var(--loose-inset) + var(--row-indent) * ${depth})` : 'var(--loose-inset)'
  const groupIndent = (depth: number): string => `calc(var(--row-indent) * ${depth})`

  const ghost = interactions.ghost.ghost
  let renderedAnyRow = false
  const renderRows = (g: ResolvedGroup, depth: number, visible: boolean): React.JSX.Element[] => {
    const isCollapsed = collapsed.has(g.key)
    const itemsVisible = visible && !isCollapsed
    const itemDepth = g.kind === 'ungrouped' ? depth : depth + 1
    const memberIndent = g.kind === 'ungrouped' ? indent : groupIndent
    const members: React.JSX.Element[] = [
      ...g.items.flatMap((row, i) => {
        const lead = i === 0 && (g.kind !== 'ungrouped' || !renderedAnyRow)
        if (itemsVisible) renderedAnyRow = true
        const rendered = [
          <DataRow
            key={row.id}
            row={row}
            columns={columns}
            ctx={ctx}
            padLeft={memberIndent(itemDepth)}
            dragShift={dragShift}
            alignByCol={alignByCol}
            styleByCol={styleByCol}
            api={cellApi}
            overlayCol={overlayTarget?.rowId === row.id ? overlayTarget.colId : null}
            renameCol={renameTarget?.rowId === row.id ? renameTarget.colId : null}
            activeCol={activeCell?.rowId === row.id ? activeCell.colId : null}
            hideIcon={liveView.hide_page_icons ?? false}
            selected={selection.kind === 'page' && selection.id === row.id}
            dragDisabled={dragDisabled}
            sweepCol={cellSweep.sweep?.rows.has(row.id) ? cellSweep.sweep.colId : null}
            lead={lead}
          />,
        ]
        if (itemsVisible && ghost?.anchorId === row.id && !editing)
          rendered.push(
            <GhostRow
              key={`ghost-${row.id}`}
              padLeft={memberIndent(itemDepth)}
              columns={columns}
              hideIcon={liveView.hide_page_icons ?? false}
              closing={ghost.closing}
              onClosed={interactions.ghost.closed}
              onEnter={interactions.ghost.onGhostEnter}
              onLeave={interactions.ghost.onGhostLeave}
              onCreate={() => void interactions.ghostCreate()}
            />,
          )
        return rendered
      }),
      ...(g.children ?? []).flatMap((child) => renderRows(child, itemDepth, itemsVisible)),
    ]
    if (g.kind === 'ungrouped') return members
    return [
      <ViewGroupBand
        key={`gb-${g.key}`}
        group={g}
        view={liveView}
        ctx={ctx}
        setNames={setNames}
        setIcons={setIcons}
        source={source}
        setPath={g.kind === 'structural-set' ? setPaths.get(g.key) : undefined}
        onAdd={
          g.kind === 'structural-set' && setPaths.has(g.key)
            ? () => creation.bandAdd(g.key)
            : undefined
        }
        onOpen={
          g.kind === 'structural-set' &&
          source.kind === 'collection' &&
          depth === 0 &&
          setPaths.has(g.key)
            ? () => void select({ kind: 'set', id: g.key, path: setPaths.get(g.key) as string })
            : undefined
        }
        collapsed={isCollapsed}
        onToggle={() => toggleCollapse(g.key)}
        indent={groupIndent(depth)}
      >
        {members}
      </ViewGroupBand>,
    ]
  }

  return (
    <div
      ref={(el) => {
        host.seam.viewRootRef.current = el
      }}
      className={cx('table table-view', overflowing && 'overflowing')}
    >
      {interactions.iconPicker}
      <BandDnd
        bands={interactions.bands}
        labelFor={bandLabel}
        onDrop={interactions.onBandDrop}
        nestable={!flat}
      >
        <TableRowDnd
          rows={paintOrder}
          disabled={dragDisabled}
          canReorderWithin={canReorderWithin}
          canReassign={canReassign}
          canRelocate={canRelocate}
          onDrop={(activeId, toGroup, beforeId) =>
            interactions.onDrop({ activeId, toZone: toGroup, beforeId })
          }
        >
          <div
            className={cx(
              'table-grid',
              text.body.standard,
              liveView.hide_borders && 'no-borders',
              columns.length === 1 && 'single-column',
              hiding && 'col-hiding',
              sliding && 'col-sliding',
              dragShift !== null && 'col-dragging-active',
              resizing && 'col-resizing-active',
            )}
            style={{ minWidth: reflowWidth, '--cols': cols } as React.CSSProperties}
          >
            <div className="table-head" onTransitionEnd={onTrackTransitionEnd}>
              {columns.map((c, i) => (
                <ColumnHeader
                  key={c.id}
                  id={c.id}
                  label={columnLabel(c.id, schema, ctx.contexts, capitalize)}
                  icon={headerIcon(c.id)}
                  width={widthByCol[i]}
                  align={alignByCol[i]}
                  transform={gapShift(dragShift, i)}
                  dragging={dragShift?.from === i}
                  onDragStart={(e) => startColumnDrag(e, i)}
                  onResize={resizeColumn}
                  onResizeStart={startResize}
                  onResizeAbort={abortResize}
                  onResizeEnd={endResize}
                  onResizeCommit={commitResize}
                  onContextMenu={(e) => void openHeaderMenu(c.id, c.kind === 'title', e)}
                />
              ))}
              {/* The :last-child anchor that keeps the last real column's right divider (table.css). */}
              <div className="cell-filler" aria-hidden="true" />
            </div>
            {groups.flatMap((g) => renderRows(g, 0, true))}
          </div>
        </TableRowDnd>
      </BandDnd>
      {cellPicker()}
      {massPicker()}
      {renameField()}
    </div>
  )
}

type RowCellApi = {
  menu: (row: ViewRow, col: ResolvedColumn, e: React.MouseEvent) => void
  click: (row: ViewRow, col: ResolvedColumn, e: React.MouseEvent) => void
  overlay: (row: ViewRow, col: ResolvedColumn) => React.ReactNode
  remove: (row: ViewRow, col: ResolvedColumn, next: PropertyValue | null) => void
  grip: (row: ViewRow, e: React.MouseEvent) => void
  sweep: (row: ViewRow, col: ResolvedColumn, e: React.PointerEvent) => boolean
  hover: GhostAnchor['onHover']
}

function GhostRow({
  padLeft,
  columns,
  hideIcon,
  closing,
  onClosed,
  onEnter,
  onLeave,
  onCreate,
}: {
  padLeft: string | undefined
  columns: ResolvedColumn[]
  hideIcon: boolean
  closing: boolean
  onClosed: () => void
  onEnter: () => void
  onLeave: () => void
  onCreate: () => void
}): React.JSX.Element {
  return (
    <Reveal open={!closing} enterOnMount onCollapsed={onClosed}>
      {/* biome-ignore lint/a11y/useKeyWithClickEvents lint/a11y/useSemanticElements: a hover-born affordance that must use the row grid's own chrome — a real <button> can't host a .data-row, and keyboard creation lives in the menus */}
      <div
        data-ghost-root
        className="data-row ghost-row"
        role="button"
        tabIndex={-1}
        aria-label="New Page"
        onPointerEnter={onEnter}
        onPointerLeave={onLeave}
        onClick={onCreate}
      >
        {columns.map((c, i) => (
          <div
            key={c.id}
            className={cx('data-cell', 'ghost-worn', i === 0 && 'cell-lead')}
            style={i === 0 ? { paddingLeft: padLeft } : undefined}
          >
            {c.kind === 'title' && (
              <span className="cell-title">
                {hideIcon ? null : <EntityIcon kind="page" size="body" />}
                <span className="cell-title-text">New Page</span>
              </span>
            )}
          </div>
        ))}
        <div className="cell-filler" aria-hidden="true" />
      </div>
    </Reveal>
  )
}

const DataRow = memo(function DataRow({
  row,
  columns,
  ctx,
  padLeft,
  dragShift,
  alignByCol,
  styleByCol,
  api,
  overlayCol,
  renameCol,
  activeCol,
  hideIcon,
  selected,
  dragDisabled,
  sweepCol,
  lead,
}: {
  row: ViewRow
  columns: ResolvedColumn[]
  ctx: ValueContext
  padLeft: string | undefined
  dragShift: DragShift | null
  alignByCol: ColumnAlign[]
  styleByCol: ColumnStyle[]
  api: RowCellApi
  overlayCol: string | null
  renameCol: string | null
  activeCol: string | null
  hideIcon: boolean
  selected: boolean
  dragDisabled: boolean
  sweepCol: string | null
  lead: boolean
}): React.JSX.Element {
  const { ref, handle, isDragging } = useTableRowDrag(row.id)
  return (
    <div
      ref={ref}
      data-rid={row.id}
      className={cx(
        'data-row',
        selected && 'selected',
        isDragging && 'row-dragging',
        lead && 'row-lead',
      )}
      {...rowHover(row, api.hover)}
      {...(dragDisabled ? {} : handle)}
    >
      {columns.map((c, i) => {
        const style: React.CSSProperties = {
          transform: gapShift(dragShift, i),
          textAlign: alignByCol[i],
        }
        if (i === 0 && alignByCol[i] === 'left') style.paddingLeft = padLeft
        const stateCx = activeCol === c.id && 'cell-active'
        const editor = overlayCol === c.id ? api.overlay(row, c) : null
        const content = editor ?? (
          <Cell
            row={row}
            column={c}
            ctx={ctx}
            hideIcon={hideIcon}
            style={styleByCol[i]}
            showFullLink={renameCol === c.id}
            remove={(next) => api.remove(row, c, next)}
          />
        )
        return (
          // biome-ignore lint/a11y/useKeyWithClickEvents lint/a11y/noStaticElementInteractions: a grid cell — per-cell tab stops are the wrong pattern; the grid wants roving tabindex, which is a feature rather than a lint fix
          <div
            key={c.id}
            className={cx(
              'data-cell',
              i === 0 && 'cell-lead',
              dragShift?.from === i && 'col-dragging',
              sweepCol === c.id && 'cell-sweep',
              stateCx,
            )}
            style={style}
            onContextMenu={(e) => api.menu(row, c, e)}
            onPointerDown={(e) => {
              if (api.sweep(row, c, e)) e.stopPropagation()
            }}
            onClick={(e) => {
              if (!isDragging) api.click(row, c, e)
            }}
          >
            {i === 0 && (
              // biome-ignore lint/a11y/useKeyWithClickEvents lint/a11y/noStaticElementInteractions: a bubble guard, not a control
              <span
                className="row-grip"
                {...(dragDisabled ? {} : handle)}
                // A right-press is defaulted away here — preventing only the context menu comes too late to stop a seated caret.
                onPointerDown={(e) => {
                  if (e.button === 2) {
                    e.preventDefault()
                    return
                  }
                  if (!dragDisabled) handle.onPointerDown?.(e)
                }}
                onContextMenu={(e) => api.grip(row, e)}
                onClick={(e) => e.stopPropagation()}
                title={dragDisabled ? undefined : 'Drag to reorder'}
              >
                <Icon name="grip-vertical" size="body" />
              </span>
            )}
            {content}
          </div>
        )
      })}
      <div className="cell-filler" aria-hidden="true" />
    </div>
  )
})
```

`Core/Views/Table/ColumnHeader.tsx`, the changed region:

```tsx
import { cx } from '@pommora/uix/Utilities/cx'
import { usePointerGesture } from '@pommora/uix/Interactions/gesture'
import { readZoom } from '@pommora/uix/Utilities/zoom'
import type { ColumnAlign } from '@pommora/core/Views/views'
```

```tsx
    const grip = e.currentTarget
    const grid = grip.closest('.table-grid')
    const zoom = grid ? readZoom(grid) : 1
    const startX = e.clientX
```

`Core/Views/Table/useColumns.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { RESERVED_PROPERTY_ID, type PropertyDefinition } from '@pommora/core/Properties/properties'
import { savedView, type SavedView } from '@pommora/core/Views/views'
import {
  alignFor,
  clampWidth,
  defaultAlignFor,
  minWidthFor,
  reorderColumns,
  widthFor,
} from './useColumns'

describe('column widths', () => {
  const schema: PropertyDefinition[] = [
    { id: 'prop_status', name: 'Status', type: 'status' },
    { id: 'prop_select', name: 'Tag', type: 'select' },
    { id: 'prop_multi', name: 'Tags', type: 'multi_select' },
    { id: 'prop_n', name: 'Count', type: 'number' },
    { id: 'prop_done', name: 'Done', type: 'checkbox' },
  ]

  describe('widthFor', () => {
    it('keys reserved columns by their declared type', () => {
      expect(widthFor(RESERVED_PROPERTY_ID.title, schema).default).toBe(280)
      expect(widthFor('ctx_areas', schema, ['ctx_areas']).default).toBe(140)
      expect(widthFor(RESERVED_PROPERTY_ID.modifiedAt, schema).default).toBe(120)
      expect(widthFor(RESERVED_PROPERTY_ID.createdAt, schema).default).toBe(120)
    })

    it('keys user properties by their schema type', () => {
      expect(widthFor('prop_status', schema)).toEqual({ min: 65, default: 120, max: 250 })
      expect(widthFor('prop_n', schema).default).toBe(100)
    })

    it('falls back for an unknown column', () => {
      expect(widthFor('prop_gone', schema)).toEqual({
        min: 80,
        default: 140,
        max: Number.POSITIVE_INFINITY,
      })
    })
  })

  describe('minWidthFor', () => {
    it('returns the type base min when no look is given', () => {
      expect(minWidthFor('prop_done', schema)).toBe(45)
      expect(minWidthFor('prop_status', schema)).toBe(80)
    })

    it('widens a checkbox to the switch min for the switch look', () => {
      expect(minWidthFor('prop_done', schema, 'checkbox')).toBe(45)
      expect(minWidthFor('prop_done', schema, 'switch')).toBe(70)
    })

    it('shares one option-chip min set across status, select and multi-select', () => {
      for (const p of ['prop_status', 'prop_select', 'prop_multi']) {
        expect(minWidthFor(p, schema, 'compact')).toBe(65)
        expect(minWidthFor(p, schema, 'standard')).toBe(80)
      }
    })

    it('falls back to the base min for a type/look with no override', () => {
      expect(minWidthFor('prop_n', schema, 'switch')).toBe(50)
      expect(minWidthFor('prop_done', schema, 'nonsense')).toBe(45)
    })
  })

  describe('clampWidth', () => {
    it('clamps a resized width up to its min; the title grows uncapped, typed columns cap per-type', () => {
      expect(clampWidth(10, RESERVED_PROPERTY_ID.title, schema)).toBe(120)
      expect(clampWidth(9999, RESERVED_PROPERTY_ID.title, schema)).toBe(9999)
      expect(clampWidth(300, RESERVED_PROPERTY_ID.title, schema)).toBe(300)
      expect(clampWidth(999, 'prop_status', schema)).toBe(250)
    })

    it('applies the style-aware min — a Switch checkbox clamps up to the switch min', () => {
      expect(clampWidth(45, 'prop_done', schema, 'switch')).toBe(70)
      expect(clampWidth(45, 'prop_done', schema, 'checkbox')).toBe(45)
      expect(clampWidth(45, 'prop_done', schema)).toBe(45)
    })
  })
})

describe('column alignment', () => {
  const schema: PropertyDefinition[] = [
    { id: 'prop_status', name: 'Status', type: 'status' },
    { id: 'prop_multi', name: 'Tags', type: 'multi_select' },
    { id: 'prop_n', name: 'Count', type: 'number' },
    { id: 'prop_url', name: 'Link', type: 'url' },
    { id: 'prop_date', name: 'Due', type: 'datetime' },
  ]

  function view(over: Partial<SavedView>): SavedView {
    return savedView.parse({
      id: 'view_x',
      name: 'V',
      type: 'table',
      property_order: [],
      hidden_properties: [],
      ...over,
    })
  }

  describe('defaultAlignFor', () => {
    it('centers the chip/box + context types', () => {
      expect(defaultAlignFor('prop_status', schema)).toBe('center')
      expect(defaultAlignFor('prop_multi', schema)).toBe('center')
      expect(defaultAlignFor('ctx_areas', schema, ['ctx_areas'])).toBe('center')
      expect(defaultAlignFor('prop_date', schema)).toBe('center')
    })

    it('left-aligns title, number, url, and modified', () => {
      expect(defaultAlignFor(RESERVED_PROPERTY_ID.title, schema)).toBe('left')
      expect(defaultAlignFor('prop_n', schema)).toBe('left')
      expect(defaultAlignFor('prop_url', schema)).toBe('left')
      expect(defaultAlignFor(RESERVED_PROPERTY_ID.modifiedAt, schema)).toBe('left')
    })

    it('falls back to left for an unknown column', () => {
      expect(defaultAlignFor('prop_gone', schema)).toBe('left')
    })
  })

  describe('alignFor', () => {
    it('uses the type default when no override is saved', () => {
      expect(alignFor('prop_status', schema, view({}))).toBe('center')
      expect(alignFor('prop_n', schema, view({}))).toBe('left')
    })

    it('honors a saved column_alignments override over the default', () => {
      const v = view({ column_alignments: { prop_status: 'left', prop_n: 'right' } })
      expect(alignFor('prop_status', schema, v)).toBe('left')
      expect(alignFor('prop_n', schema, v)).toBe('right')
    })
  })
})

describe('column order', () => {
  describe('reorderColumns', () => {
    it('moves a visible column to a new slot, writing the full explicit order', () => {
      expect(
        reorderColumns(['_title', 'a', 'b', 'c'], ['_title', 'a', 'b', 'c'], 'c', 'a'),
      ).toEqual(['_title', 'c', 'a', 'b'])
    })

    it('preserves a hidden property (in property_order, not rendered) at the tail — survives hide/show', () => {
      expect(reorderColumns(['_title', 'a'], ['_title', 'hidden1', 'a'], 'a', '_title')).toEqual([
        'a',
        '_title',
        'hidden1',
      ])
    })

    it('writes default-on Context/title columns explicitly even when absent from property_order', () => {
      expect(reorderColumns(['_title', 'ctx_areas'], [], 'ctx_areas', '_title')).toEqual([
        'ctx_areas',
        '_title',
      ])
    })

    it('normalizes (visible + hidden) without moving when active === over', () => {
      expect(reorderColumns(['_title', 'a'], ['_title', 'a', 'hidden1'], 'a', 'a')).toEqual([
        '_title',
        'a',
        'hidden1',
      ])
    })
  })
})
```

**VERIFY**

- [ ] Check the work for unnecessary code or obvious mistakes; `TableView.tsx` imports nothing from `glanceLink`, `pageMenuActions`, `treeIndex`, `tabsModel`, `confirmations`, `ghostCreate` (beyond the `GhostAnchor` type), `IconChoice`, `bandDndModel`, or `useBandOrdering`.
- [ ] `wc -l Core/Views/Table/TableView.tsx` → 827; `wc -l Core/Views/Table/useColumns.ts` → 515; `ls Core/Views/Table/columnWidths.ts Core/Views/Table/columnReorder.ts Core/Views/columnAlign.ts` → three "No such file" lines.
- [ ] `grep -c "alignById\|widthById\|?? resolve\|colDragFrom\|parseStyleAction" Core/Views/Table/TableView.tsx` → 0.
- [ ] Run the gates: `npx tsc -p UIX && npx tsc -p Core && npx tsc -p Core/tsconfig.src.json` clean; `npx vitest run Core/Views/ UIX/Interactions/ Core/Navigation/ Core/Properties/` → all files pass; `npx biome check Core UIX` clean; `node .claude/hooks/no-wrapped-comments.mjs --scan` clean.
- [ ] `npx vitest run Core/Views/Table/useColumns` → 3 describes, every case from the three retired files present by name.

#### Task 2.3

**TASK:** Put every `Core/Views` suite that carries the jsdom preamble on the shared harness, and pin the ⌘-click convergence.

**FILES:** `Core/Views/Table/bandCommits.test.tsx`, `Core/Views/Table/cellGestures.test.tsx`, `Core/Views/manualOrderDrops.test.tsx`, `Core/Views/ViewTileScope.test.tsx`, `Core/Views/Bands/BandDnd.test.tsx`, `Core/Views/Bands/GroupBand.test.tsx`, `Core/Views/Host/useActiveView.test.tsx`, `Core/Views/Host/useViewHost.test.tsx`, `Core/Views/Settings/FilterFrame.test.tsx`, `Core/Views/Settings/GroupFrame.test.tsx`, `Core/Views/Settings/SortFrame.test.tsx`, `Core/Views/Settings/ViewFrame.test.tsx`, `Core/Views/Settings/groupDnd.test.tsx`.

**DEPENDENCIES:** Task 1.1's `viewHarness.tsx`; Task 2.2's ⌘-click behavior.

**NOW**

Thirteen suites carry the act-environment line, eight of them the `ResizeObserverStub` class as well; the three view suites also carry a `mountX` that renders `<ViewHost>` inside `act` and flushes once, and hand-rolled timeout waits. `cellGestures.test.tsx`'s "title cell click navigates; row background click does not" asserts the plain click only.

**CHANGE**

- [ ] In all thirteen, replace the preamble with `installViewEnvironment()`; in the three view suites, each `mountX` body's render-and-flush with `await renderView(root, source)` and each timeout wait with `await settle(N)`; drop the imports that go unused.
- [ ] Add to `cellGestures.test.tsx`, after the title-click case, the ⌘-click case drawn below.
- [ ] No assertion changes.

**AFTER**

The diff, in full:

```diff
diff --git a/Core/Views/Bands/BandDnd.test.tsx b/Core/Views/Bands/BandDnd.test.tsx
index 930109961..f3f3da030 100644
--- a/Core/Views/Bands/BandDnd.test.tsx
+++ b/Core/Views/Bands/BandDnd.test.tsx
@@ -4,18 +4,12 @@ import { act } from 'react'
 import { createRoot, type Root } from 'react-dom/client'
 import type { ResolvedGroup } from '@pommora/core/Views/viewRow'
 import type { SavedView } from '@pommora/core/Views/views'
-import {
-  firePointer,
-  pressEscape,
-  stubPointerCapture,
-  stubRect,
-} from '@pommora/uix/Interactions/pointerHarness'
+import { firePointer, pressEscape, stubRect } from '@pommora/uix/Interactions/pointerHarness'
 import type { Band } from './bandDndModel'
 import { BandDnd, useBandDrag, type BandDrop } from './BandDnd'
 import { ViewGroupBand } from './ViewGroupBand'
-;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
-
-stubPointerCapture()
+import { installViewEnvironment } from '../../Testing/viewHarness'
+installViewEnvironment()
 
 // A[A1], B — the glyph span is the drag surface, the header div is the measured band row.
 const BANDS: Band[] = [
diff --git a/Core/Views/Bands/GroupBand.test.tsx b/Core/Views/Bands/GroupBand.test.tsx
index b9853c18b..317133bdd 100644
--- a/Core/Views/Bands/GroupBand.test.tsx
+++ b/Core/Views/Bands/GroupBand.test.tsx
@@ -9,7 +9,8 @@ import type { ResolvedGroup } from '@pommora/core/Views/viewRow'
 import type { GroupConfig, SavedView } from '@pommora/core/Views/views'
 import type { ValueContext } from '../../Properties/valueContext'
 import { resolveBandHead } from './GroupBand'
-;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
+import { installViewEnvironment } from '../../Testing/viewHarness'
+installViewEnvironment()
 
 const schema: PropertyDefinition[] = [
   {
diff --git a/Core/Views/Host/useActiveView.test.tsx b/Core/Views/Host/useActiveView.test.tsx
index dfd94f1c3..def70824e 100644
--- a/Core/Views/Host/useActiveView.test.tsx
+++ b/Core/Views/Host/useActiveView.test.tsx
@@ -6,7 +6,8 @@ import type { CollectionNode } from '@pommora/core/Nexus/tree'
 import type { PropertyDefinition } from '@pommora/core/Properties/properties'
 import { DEFAULT_VIEW_ID, type SavedView } from '@pommora/core/Views/views'
 import { useActiveView } from './useActiveView'
-;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
+import { installViewEnvironment } from '../../Testing/viewHarness'
+installViewEnvironment()
 
 const schema: PropertyDefinition[] = [{ id: 'prop_status', name: 'Status', type: 'status' }]
 
diff --git a/Core/Views/Host/useViewHost.test.tsx b/Core/Views/Host/useViewHost.test.tsx
index c20d04865..e0e9314ce 100644
--- a/Core/Views/Host/useViewHost.test.tsx
+++ b/Core/Views/Host/useViewHost.test.tsx
@@ -7,13 +7,13 @@ import type { CollectionNode, SetNode } from '@pommora/core/Nexus/tree'
 import { LOCATION_SORT, type SavedView } from '@pommora/core/Views/views'
 import { useSession } from '../../Session/store'
 import { useViewHost, type ViewHostApi } from './useViewHost'
-import { ViewHost } from './ViewHost'
-import { propsAtRoot } from '../propsAtRoot'
-import { pageValues } from '../pageValues'
+import { propsAtRoot } from '../../Testing/pageValues'
+import { pageValues } from '../../Testing/pageValues'
 import { ID_KEY } from '@pommora/core/Nexus/identityMark'
 import { stubDialer } from '../../vitest.setup'
+import { installViewEnvironment, renderView } from '../../Testing/viewHarness'
 
-;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
+installViewEnvironment()
 
 const statusDef: PropertyDefinition = {
   id: 'prop_status',
@@ -505,12 +505,7 @@ describe('settleOrders — a create composes with the live order', () => {
 })
 
 describe('the root seat', () => {
-  const mountSeat = async (source: CollectionNode): Promise<void> => {
-    await act(async () => {
-      root.render(<ViewHost source={source} />)
-    })
-    await act(async () => {})
-  }
+  const mountSeat = (source: CollectionNode): Promise<void> => renderView(root, source)
 
   it('paints Loading… while the host is null', async () => {
     useSession.setState({ tree: null as never })
diff --git a/Core/Views/Settings/FilterFrame.test.tsx b/Core/Views/Settings/FilterFrame.test.tsx
index 8933f7ac2..3a57fe891 100644
--- a/Core/Views/Settings/FilterFrame.test.tsx
+++ b/Core/Views/Settings/FilterFrame.test.tsx
@@ -8,14 +8,8 @@ import type { SavedView } from '@pommora/core/Views/views'
 import { useSession } from '../../Session/store'
 import { FilterFrame } from './FilterFrame'
 import { stubDialer } from '../../vitest.setup'
-;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
-
-class ResizeObserverStub {
-  observe(): void {}
-  unobserve(): void {}
-  disconnect(): void {}
-}
-;(globalThis as { ResizeObserver?: unknown }).ResizeObserver = ResizeObserverStub
+import { installViewEnvironment } from '../../Testing/viewHarness'
+installViewEnvironment()
 
 const statusDef: PropertyDefinition = {
   id: 'prop_status',
diff --git a/Core/Views/Settings/GroupFrame.test.tsx b/Core/Views/Settings/GroupFrame.test.tsx
index 17e15285c..0fe2c98fa 100644
--- a/Core/Views/Settings/GroupFrame.test.tsx
+++ b/Core/Views/Settings/GroupFrame.test.tsx
@@ -9,14 +9,8 @@ import { useSession } from '../../Session/store'
 import { GroupFrame } from './GroupFrame'
 import { stubDialer } from '../../vitest.setup'
 import { MenuDoorHost } from '../../Testing/MenuDoorHost'
-;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
-
-class ResizeObserverStub {
-  observe(): void {}
-  unobserve(): void {}
-  disconnect(): void {}
-}
-;(globalThis as { ResizeObserver?: unknown }).ResizeObserver = ResizeObserverStub
+import { installViewEnvironment } from '../../Testing/viewHarness'
+installViewEnvironment()
 
 const statusDef: PropertyDefinition = {
   id: 'prop_status',
diff --git a/Core/Views/Settings/SortFrame.test.tsx b/Core/Views/Settings/SortFrame.test.tsx
index 8773cff1f..7bfcae072 100644
--- a/Core/Views/Settings/SortFrame.test.tsx
+++ b/Core/Views/Settings/SortFrame.test.tsx
@@ -9,14 +9,8 @@ import { useSession } from '../../Session/store'
 import { SortFrame } from './SortFrame'
 import { stubDialer } from '../../vitest.setup'
 import { MenuDoorHost } from '../../Testing/MenuDoorHost'
-;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
-
-class ResizeObserverStub {
-  observe(): void {}
-  unobserve(): void {}
-  disconnect(): void {}
-}
-;(globalThis as { ResizeObserver?: unknown }).ResizeObserver = ResizeObserverStub
+import { installViewEnvironment } from '../../Testing/viewHarness'
+installViewEnvironment()
 
 const statusDef: PropertyDefinition = {
   id: 'prop_status',
diff --git a/Core/Views/Settings/ViewFrame.test.tsx b/Core/Views/Settings/ViewFrame.test.tsx
index 8ed202c05..1fa6a474c 100644
--- a/Core/Views/Settings/ViewFrame.test.tsx
+++ b/Core/Views/Settings/ViewFrame.test.tsx
@@ -8,14 +8,8 @@ import type { SavedView } from '@pommora/core/Views/views'
 import { useSession } from '../../Session/store'
 import { ViewFrame } from './ViewFrame'
 import { stubDialer } from '../../vitest.setup'
-;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
-
-class ResizeObserverStub {
-  observe(): void {}
-  unobserve(): void {}
-  disconnect(): void {}
-}
-;(globalThis as { ResizeObserver?: unknown }).ResizeObserver = ResizeObserverStub
+import { installViewEnvironment } from '../../Testing/viewHarness'
+installViewEnvironment()
 
 const schema: PropertyDefinition[] = [{ id: 'prop_status', name: 'Status', type: 'status' }]
 
diff --git a/Core/Views/Settings/groupDnd.test.tsx b/Core/Views/Settings/groupDnd.test.tsx
index d7c6c369f..07b9c2f7f 100644
--- a/Core/Views/Settings/groupDnd.test.tsx
+++ b/Core/Views/Settings/groupDnd.test.tsx
@@ -2,12 +2,11 @@
 import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
 import { act } from 'react'
 import { createRoot, type Root } from 'react-dom/client'
-import { firePointer, stubPointerCapture, stubRect } from '@pommora/uix/Interactions/pointerHarness'
+import { firePointer, stubRect } from '@pommora/uix/Interactions/pointerHarness'
 import type { Band } from '../Bands/bandDndModel'
 import { useGroupingListDrag, type GroupingDrop } from './groupDnd'
-;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
-
-stubPointerCapture()
+import { installViewEnvironment } from '../../Testing/viewHarness'
+installViewEnvironment()
 
 const BANDS: Band[] = [
   { id: 'A', kind: 'property', depth: 0, parentId: null },
diff --git a/Core/Views/Table/bandCommits.test.tsx b/Core/Views/Table/bandCommits.test.tsx
index e2ae22591..7a3829b4f 100644
--- a/Core/Views/Table/bandCommits.test.tsx
+++ b/Core/Views/Table/bandCommits.test.tsx
@@ -6,31 +6,18 @@ import { createRoot, type Root } from 'react-dom/client'
 import type { PropertyDefinition } from '@pommora/core/Properties/properties'
 import type { CollectionNode } from '@pommora/core/Nexus/tree'
 import type { SavedView } from '@pommora/core/Views/views'
-import {
-  firePointer,
-  pressEscape,
-  stubPointerCapture,
-  stubRect,
-} from '@pommora/uix/Interactions/pointerHarness'
+import { firePointer, pressEscape, stubRect } from '@pommora/uix/Interactions/pointerHarness'
+import { installViewEnvironment, renderView, settle } from '../../Testing/viewHarness'
 import { useSession } from '../../Session/store'
 import { ViewHost } from '../Host/ViewHost'
-import { propsAtRoot } from '../propsAtRoot'
-import { valuesReply } from '../pageValues'
+import { propsAtRoot } from '../../Testing/pageValues'
+import { valuesReply } from '../../Testing/pageValues'
 import { ID_KEY } from '@pommora/core/Nexus/identityMark'
 import { stubDialer } from '../../vitest.setup'
 import { entityMenuItems } from '@pommora/core/Actions/entityMenu'
 import { containerCreators } from '@pommora/core/Nexus/mutateRequest'
 
-;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
-
-class ResizeObserverStub {
-  observe(): void {}
-  unobserve(): void {}
-  disconnect(): void {}
-}
-;(globalThis as { ResizeObserver?: unknown }).ResizeObserver = ResizeObserverStub
-
-stubPointerCapture()
+installViewEnvironment()
 
 const statusDef: PropertyDefinition = {
   id: 'prop_status',
@@ -169,10 +156,7 @@ afterEach(() => {
 })
 
 const mountTable = async (source: CollectionNode): Promise<void> => {
-  await act(async () => {
-    root.render(<ViewHost source={source} />)
-  })
-  await act(async () => {})
+  await renderView(root, source)
   stubBandRects()
 }
 
@@ -200,9 +184,7 @@ const drop = async (): Promise<void> => {
     firePointer(window, 'pointerup')
   })
   // A committed drop arms the one-tick post-drag click swallower — flush it so a test's follow-up click isn't eaten.
-  await act(async () => {
-    await new Promise((r) => setTimeout(r, 1))
-  })
+  await settle()
 }
 
 const lastSavedView = (): SavedView => saveSpy.mock.calls.at(-1)?.[2] as SavedView
diff --git a/Core/Views/Table/cellGestures.test.tsx b/Core/Views/Table/cellGestures.test.tsx
index f37f1056d..a2c05db70 100644
--- a/Core/Views/Table/cellGestures.test.tsx
+++ b/Core/Views/Table/cellGestures.test.tsx
@@ -8,19 +8,13 @@ import type { CollectionNode } from '@pommora/core/Nexus/tree'
 import { useSession } from '../../Session/store'
 import { PropertyPicker } from '../../Properties/Pickers/PropertyPicker'
 import { ViewHost } from '../Host/ViewHost'
-import { propsAtRoot } from '../propsAtRoot'
-import { valuesReply } from '../pageValues'
+import { propsAtRoot } from '../../Testing/pageValues'
+import { valuesReply } from '../../Testing/pageValues'
 import { ID_KEY } from '@pommora/core/Nexus/identityMark'
 import { stubDialer } from '../../vitest.setup'
+import { installViewEnvironment, renderView, settle } from '../../Testing/viewHarness'
 
-;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
-
-class ResizeObserverStub {
-  observe(): void {}
-  unobserve(): void {}
-  disconnect(): void {}
-}
-;(globalThis as { ResizeObserver?: unknown }).ResizeObserver = ResizeObserverStub
+installViewEnvironment()
 
 const statusDef: PropertyDefinition = {
   id: 'prop_status',
@@ -184,10 +178,7 @@ afterEach(() => {
 })
 
 const mountTable = async (source: CollectionNode): Promise<void> => {
-  await act(async () => {
-    root.render(<ViewHost source={source} />)
-  })
-  await act(async () => {})
+  await renderView(root, source)
 }
 
 const statusCell = (): HTMLElement => {
@@ -223,9 +214,7 @@ describe('status cell gestures', () => {
     await act(async () => {
       option?.click()
     })
-    await act(async () => {
-      await new Promise((r) => setTimeout(r, 450))
-    })
+    await settle(450)
     expect(pickerButtons().some((b) => b.textContent?.includes('Not started'))).toBe(false)
   })
 
@@ -456,6 +445,18 @@ describe('open actions + row-click narrowing', () => {
     expect(selectSpy).not.toHaveBeenCalled()
   })
 
+  it('a ⌘-click on the title opens the page in a new tab', async () => {
+    await mountTable(sourceWith())
+    const title = host.querySelector<HTMLElement>('.data-cell')
+    await act(async () => {
+      title?.dispatchEvent(new MouseEvent('click', { bubbles: true, metaKey: true }))
+    })
+    expect(selectSpy).toHaveBeenCalledExactlyOnceWith(
+      { kind: 'page', id: 'p1', path: 'Col/Page One.md' },
+      { newTab: true },
+    )
+  })
+
   it('url cell click opens externally through the sanctioned IPC, not navigation', async () => {
     await mountTable(sourceWith())
     const link = host.querySelector<HTMLElement>('.cell-link')
diff --git a/Core/Views/ViewTileScope.test.tsx b/Core/Views/ViewTileScope.test.tsx
index 71c884bbe..b7e9c6d31 100644
--- a/Core/Views/ViewTileScope.test.tsx
+++ b/Core/Views/ViewTileScope.test.tsx
@@ -16,14 +16,8 @@ import {
   type ViewTileScopeValue,
 } from './ViewTileScope'
 import { stubDialer } from '../vitest.setup'
-;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
-
-class ResizeObserverStub {
-  observe(): void {}
-  unobserve(): void {}
-  disconnect(): void {}
-}
-;(globalThis as { ResizeObserver?: unknown }).ResizeObserver = ResizeObserverStub
+import { installViewEnvironment } from '../Testing/viewHarness'
+installViewEnvironment()
 
 const statusDef: PropertyDefinition = {
   id: 'prop_status',
diff --git a/Core/Views/manualOrderDrops.test.tsx b/Core/Views/manualOrderDrops.test.tsx
index a0fcbedda..888723193 100644
--- a/Core/Views/manualOrderDrops.test.tsx
+++ b/Core/Views/manualOrderDrops.test.tsx
@@ -5,24 +5,15 @@ import { createRoot, type Root } from 'react-dom/client'
 import type { PropertyDefinition } from '@pommora/core/Properties/properties'
 import type { CollectionNode } from '@pommora/core/Nexus/tree'
 import type { SavedView } from '@pommora/core/Views/views'
-import { firePointer, stubPointerCapture, stubRect } from '@pommora/uix/Interactions/pointerHarness'
+import { firePointer, stubRect } from '@pommora/uix/Interactions/pointerHarness'
 import { ID_KEY } from '@pommora/core/Nexus/identityMark'
 import { useSession } from '../Session/store'
-import { ViewHost } from './Host/ViewHost'
-import { propsAtRoot } from './propsAtRoot'
-import { valuesReply } from './pageValues'
+import { propsAtRoot } from '../Testing/pageValues'
+import { valuesReply } from '../Testing/pageValues'
 import { stubDialer } from '../vitest.setup'
+import { installViewEnvironment, renderView, settle } from '../Testing/viewHarness'
 
-;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
-
-class ResizeObserverStub {
-  observe(): void {}
-  unobserve(): void {}
-  disconnect(): void {}
-}
-;(globalThis as { ResizeObserver?: unknown }).ResizeObserver = ResizeObserverStub
-
-stubPointerCapture()
+installViewEnvironment()
 
 const statusDef: PropertyDefinition = {
   id: 'prop_status',
@@ -140,10 +131,7 @@ afterEach(() => {
 })
 
 const mountTable = async (view?: Partial<SavedView>): Promise<void> => {
-  await act(async () => {
-    root.render(<ViewHost source={source(view)} />)
-  })
-  await act(async () => {})
+  await renderView(root, source(view))
   const box = host.querySelector('.drop-line-host')
   if (box) stubRect(box, { top: 0, bottom: 48 })
   for (const [i, id] of ['p1', 'p2'].entries()) {
@@ -164,16 +152,11 @@ const dragSecondRowUp = async (): Promise<void> => {
   await act(async () => {
     firePointer(window, 'pointerup')
   })
-  await act(async () => {
-    await new Promise((r) => setTimeout(r, 1))
-  })
+  await settle()
 }
 
 const mountBanded = async (view?: Partial<SavedView>): Promise<void> => {
-  await act(async () => {
-    root.render(<ViewHost source={banded(view)} />)
-  })
-  await act(async () => {})
+  await renderView(root, banded(view))
   const box = host.querySelector('.drop-line-host')
   if (box) stubRect(box, { top: 0, bottom: 96 })
   for (const [i, id] of ['p1', 'p2'].entries()) {
@@ -194,16 +177,11 @@ const dragFirstRowDown = async (): Promise<void> => {
   await act(async () => {
     firePointer(window, 'pointerup')
   })
-  await act(async () => {
-    await new Promise((r) => setTimeout(r, 1))
-  })
+  await settle()
 }
 
 const mountCards = async (view?: Partial<SavedView>): Promise<void> => {
-  await act(async () => {
-    root.render(<ViewHost source={source({ type: 'cards', ...view })} />)
-  })
-  await act(async () => {})
+  await renderView(root, source({ type: 'cards', ...view }))
   const zone = host.querySelector('.cards-grid')
   if (zone) stubRect(zone, { top: 0, bottom: 200, left: 0, right: 200 })
   for (const [i, id] of ['p1', 'p2'].entries()) {
@@ -224,9 +202,7 @@ const dragSecondCardUp = async (): Promise<void> => {
   await act(async () => {
     firePointer(window, 'pointerup')
   })
-  await act(async () => {
-    await new Promise((r) => setTimeout(r, 400))
-  })
+  await settle(400)
 }
 
 const lastSavedView = (): SavedView => saveSpy.mock.calls.at(-1)?.[2] as SavedView
```

**VERIFY**

- [ ] `grep -rn "IS_REACT_ACT_ENVIRONMENT\|ResizeObserverStub" Core/Views` → no output; `npx vitest run Core/Views/` → every file passes.
- [ ] `npx vitest run Core/Views/Table/ Core/Views/manualOrderDrops` → all pass; `cellGestures.test.tsx` 26 tests; `manualOrderDrops.test.tsx` 6 tests with the relocate case still expecting `['p2', 'p1']`.
- [ ] Revert the `interactions.openPage(row, isCmd(e))` line to `interactions.openPage(row, false)` and run `cellGestures` — the ⌘-click case goes red; restore it.

#### Task 2.4

**TASK:** Rewrite the sentences Phase 2 makes false in the two Features docs that describe the view host, the Table renderer, and the drag engine.

**FILES:** `.claude/Features/ViewTypesPM.md`, `.claude/Features/PommoraDND.md`.

**NOW**

`ViewTypesPM.md` §The View Host, the sentences from "A renderer contributes presentation plus a four-field seam" through "so a renderer never switches on a view's type", then "except a Cards view over a container with Sets, whose Set Cards row renders independently of the pipeline, so it always mounts", and the closing "A new renderer mounts the host and writes presentation only." §Columns opens "Widths are per-type `{min, default, max}` from one source (`columnWidths.ts`)". §Rows & Cells says "the title navigates". `PommoraDND.md` §Constraints & Accessibility carries two claims the code never had: "**Constraints and modifiers** — an `axis` lock, a `bounds` clamp, a `modifiers` escape hatch, `swap` mode (exchange active and over), and async drop rejection, where the item holds lifted in a `pending` state until the verdict resolves." and, ending the Keyboard bullet, "Items are focusable, and the handle role is `button` by default, settable to `null` so table rows keep `<tr>` semantics."

**CHANGE**

- [ ] §The View Host: replace the four-field paragraph with the policy paragraph below; replace the Cards exception with the registry one; replace the closing sentence.
- [ ] §Columns: `columnWidths.ts` → `useColumns.ts`, which now also holds the alignment default and the reorder helper.
- [ ] §Rows & Cells: "the title navigates" → "the title navigates, or opens a new tab under ⌘".
- [ ] `PommoraDND.md`: the two bullets as drawn.

**AFTER**

`ViewTypesPM.md` §The View Host, the replaced span:

> A renderer contributes presentation and one policy. It mounts `useViewInteractions` (`Core/Views/Host/useViewInteractions.tsx`) beside the host, stating its ghost timing and what suppresses the ghost, the fold that adds its local layers to every persist (Table folds column widths and alignments; Cards folds nothing), and the naming surface it opens over a page that already exists on disk — and receives every pointer behavior in return: band drops, row drops routed from one `{ activeId, toZone, beforeId }` to a reorder, a relocate at that slot, or a reassign, page opening, the title menu's page actions, the icon picker seated once per view, and the ghost lifecycle. The hook writes the refs the creation engine reads at fire time (the fold, the band-key-to-bucket resolver, and the create's naming callback), and the renderer assigns only its scroll root; whether structural grouping flattens comes from the registry through the host's `flat`, so a renderer never switches on a view's type.

> … "No pages here" when the pipeline yields no groups — except a kind whose registry entry states `setCards`, whose Set Cards row renders independently of the pipeline, so it mounts over a container that has Sets. A new renderer mounts the host and the interactions hook, supplies its policy, and writes presentation only.

`ViewTypesPM.md` §Columns, the opening clause:

> Widths are per-type `{min, default, max}` from one source (`useColumns.ts`, which also holds the alignment default, the reorder helper, and the column layer the Table keeps out of `liveView`), clamped on every resolve …

`ViewTypesPM.md` §Rows & Cells:

> … the title navigates, or opens a new tab under ⌘, option cells open the shared value dropdown, …

`PommoraDND.md` §Constraints & Accessibility:

> - **Constraints** — an `axis` lock on the single-zone engine, and a `resolveIndex` veto on the cross-list engine that refuses a landing slot outside the dragged item's run.
> - **Announcements** — an assertive ARIA live region announces every product drag's pick-up and drop, pointer or keyboard, through the one `announce` primitive.
> - **Keyboard** — Space or Enter lifts, arrow keys move on a geometric next-slot getter covering list, row, and grid, Space, Enter, or Tab drops, and Esc cancels; focus returns to the item on drop. Items are focusable and the handle role is `button`.

**VERIFY**

- [ ] `grep -n "four-field\|seam\|columnWidths.ts\|bounds\` clamp\|settable to \`null\`" .claude/Features/ViewTypesPM.md .claude/Features/PommoraDND.md` → no output.
- [ ] Read §The View Host once end to end; it contradicts nothing in §Table.

#### Review Checkpoint

- [ ] `npm run typecheck` · `npm run test` · `npm run lint` all green; `Core/Views/Table/*.test.tsx` and `Core/Views/manualOrderDrops.test.tsx` pass with their assertions unchanged.
- [ ] `wc -l Core/Views/Table/TableView.tsx` moved by the amount Task 2.2 states; `Core/Views/Table/useColumns.ts` exists and `columnWidths.ts`, `columnReorder.ts`, `Core/Views/columnAlign.ts` do not.
- [ ] Nathan drives, in a Table view: (1) drag a row across two location bands and drop it between two rows — it lands between them, not at the end; (1b) with Tab Open Behavior set to New Tab, a plain title click opens a new tab and a card title click does the same; (2) ⌘-click a title — a new tab opens; (3) right-click a title cell → Edit Icon — one icon picker opens at the cell; (4) hover a row for the ghost, click it — the new page opens its inline title editor; (5) drag a band glyph; (6) resize, reorder, hide a column — unchanged.


### Phase 3 — Cards

**GOAL:** Rewrite Cards onto the shared layer, seat its icon and image pickers once at the grid, cut every card's store subscriptions to the three keyed on its own row, scope the ghost FLIP to the anchor's grid, and give Cards the interaction suites it never had. Cards comes after Table because Table carried the regression net; Cards' net is written here.

#### Task 3.1

**TASK:** Rewrite `CardsView.tsx` onto `useViewInteractions`, with one card api object, one banner seat, one icon seat, and the FLIP scoped.

**FILES:** `Core/Views/Cards/CardsView.tsx`, `Core/Views/Host/useViewHost.ts` (one helper removed).

**DEPENDENCIES:** Task 2.1's hook and Task 1.4's utilities.

**NOW**

`CardsView.tsx` is 1,348 lines (1,344 after Task 1.2). Its interaction layer sits at the ranges Task 2.1 lists. Every `PageCard` mounts its own `IconChoice` and `ImagePicker` and calls `useBannerMenu`; it subscribes to `thumbVersions`, the whole `tree`, `mutate`, `renamingPath`, `defaultIcons`, and `selection`, and `CardProperties` inside it subscribes again for `capitalize` and the date format — about ten store reads per card. `SetCard` subscribes to `select` and `defaultIcons` and mounts a third `useBannerMenu` + `ImagePicker`. The ghost FLIP's two layout effects query `.card-displace, .group-band` across the whole view. Twelve separate `onX` callbacks are threaded into each card through a `handlers` / `handlersRef` / `cardApi` triple. `ctx` is typed nullable in every card component although the host narrows it before returning.

**CHANGE**

- [ ] Call the hook with Cards' policy: `graceMs: CARDS_GHOST_GRACE_MS`, suppression on an open value or add picker, a live rename, or a shown glance, the grid travel hold (`ghostRowmate` stays Cards-specific), and a `rename` that clears the pending seat on a create and calls `beginRename(path, fromCreate, 'detail')`.
- [ ] Delete `owner`/`openPage`, the icon-picker counters, the ghost hooks, the three `host.seam` writes, `bands`, `onBandDrop`, `bandRowsWithout`, `structuralSlotFor`, `reorderInBandByIndex`, `onCardDrop`, the `effectiveZoom` state and effect (→ `useElementZoom(host.seam.viewRootRef)`), and `ghostCreate`'s body (→ the pending seat + `interactions.ghostCreate()`).
- [ ] `DragGroup`'s `onCommit` converts the engine's landing index into the shared drop (`beforeId` = the id at `toIndex` among the target band's other cards, or null); `resolveIndex={interactions.structuralSlot}`; `BandDnd` takes `interactions.bands`/`onBandDrop` and `nestable={!host.flat}`.
- [ ] One `CardApi` shape, built once with `useStableApi`, passed as a single `api` prop to `PageCard`, `DraggableSetCard`, `CardFace`, and `CardProperties` (`ValueApi` for the last two; `OverlayFace` passes `INERT_API`). `defaultIcons`, `capitalize`, and the root `useColumnStyleMap(host)` come down as props; one `useThumb(nexusId, rowId, banner)` serves `PageCard` and `OverlayFace`; `addableFor(row)` lives on the api so no card reads the tree. `PageCard` keeps three subscriptions (`thumbVersions[page:id]`, `naming`, `active`); `SetCard` keeps none and opens through `api.openSet`, which passes no option on a plain click so the tab preference decides (a one-line convergence with `openPage`).
- [ ] Root seats: `{interactions.iconPicker}`, and one banner seat — a `BannerRequest` state naming the owner (`id`, `kind`, `frame`, `mode`, `nonce`) whose `path` and `value` are resolved at render from `rowById` or the Set list, so a cover added through the menu reaches the editor and the crop write instead of a stale snapshot; one `useBannerMenu(owner?.path ?? '', request?.kind ?? 'page', { value: owner?.value, frame: bannerFrameRef, noun, autoEdit: true })` call at the root, an effect on the request that assigns the frame and opens the menu (inside `interactions.holdGhost`, since the seat sits above the `GhostSuppress` provider) or the editor, and one `<ImagePicker>`. Cards request it through `api.banner(...)` from the thumb's context menu and the card menu's `image:edit`; `PageCard` and `SetCard` lose their `useBannerMenu`, `ImagePicker`, and `IconChoice`.
- [ ] `PageCard`'s context menu: the model takes `...api.titleMenuContext(row)`; dispatch runs `api.titleAction(action, row, anchor)` first, then `image:edit` and the `add:` arms; the anchor is captured before the await.
- [ ] `PageCard` spreads `rowHover(row, api.hover)`.
- [ ] FLIP: the first effect measures `.card-displace` only inside the grid holding the anchor (`ghostLiveId ?? ghostShown`) and `.group-band` root-wide; the second iterates the measured map and skips disconnected nodes.
- [ ] `ctx` is `ValueContext`, not nullable, in every card component; the unreachable `if (!ctx) return null` guards go.
- [ ] `pickTargetFor` and the `useStyleFor` reader go: the value picker's target is `pickTarget(vRow, valuePicker.column)` over the row looked up once, and the add picker's `resolveTarget` is `pickTarget(addRow, addColumn(e.id, tree))`. `useViewHost.ts` then drops `contextOptionsFor` (the wrapper and its return line), which has no reader left.

**AFTER**

`Core/Views/Cards/CardsView.tsx`:

```tsx
import {
  memo,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import type { ResolvedColumn, ViewRow } from '@pommora/core/Views/viewRow'
import type { SetNode } from '@pommora/core/Nexus/tree'
import { isBlankValue, type PropertyValue } from '@pommora/core/Properties/propertyValue'
import { type CardBanner, isCompact, type SavedView } from '@pommora/core/Views/views'
import type { ColumnStyle } from '@pommora/core/Properties/columnStyles'
import { isOptionsKind } from '@pommora/core/Properties/properties'
import { Icon } from '@pommora/uix/Symbols'
import { isCmd } from '@pommora/uix/Interactions/chords'
import { entityIcon } from '../../Assets/entityIconPolicy'
import { text } from '@pommora/uix/Theme/typography.css'
import {
  CardBody,
  CardDropSlot,
  CardPlaceholder,
  CardRoot,
  CardText,
  CardThumb,
  CardTitle,
  CardTrail,
} from '@pommora/uix/Cards/Card'
import {
  DragGroup,
  type DragItem,
  reorder,
  SortableZone,
  useDragItem,
  useGroupedDragItem,
} from '@pommora/uix/Interactions/drag'
import { cx } from '@pommora/uix/Utilities/cx'
import { useElementZoom } from '@pommora/uix/Utilities/zoom'
import { useStableApi } from '@pommora/uix/Utilities/stableApi'
import { assetUrl } from '../../Platform/assetScheme'
import { useSession } from '../../Session/store'
import { glanceShown } from '../../Interface/Glance/glanceAction'
import { AssetImage } from '../../Assets/AssetImage'
import { ImagePicker } from '../../Assets/ImagePicker'
import { useBannerMenu } from '../../Interface/Header/useBannerMenu'
import { byOrder } from '@pommora/core/Nexus/treePatch'
import { thumbKey, thumbRel } from '@pommora/core/Paths/nexusPaths'
import { navKey } from '../../Navigation/navRecents'
import type { ViewHostApi } from '../Host/useViewHost'
import { GHOST_TRAVEL_HOLD_MS, GhostSuppress } from '@pommora/uix/Interactions/ghostCreate'
import { DEFAULT_FEEL } from '@pommora/uix/Animations/feel'
import { Reveal } from '@pommora/uix/Animations/Reveal'
import { columnLabel, useCapitalizeMetadata } from '../../Properties/Cells/columnLabel'
import { NO_STYLE, useColumnStyleMap } from '../Host/useColumnStyles'
import { ViewGroupBand } from '../Bands/ViewGroupBand'
import { BandDnd } from '../Bands/BandDnd'
import { rowHover, type TitleMenuContext, useViewInteractions } from '../Host/useViewInteractions'
import type { ValueContext } from '../../Properties/valueContext'
import { NO_TRAIL, type TrailSegment } from '@pommora/uix/Elements/NavTrail'
import { ancestryOf } from '../../Nexus/treeIndex'

import { TextPicker } from '@pommora/uix/Pickers/TextPicker'
import { solidColorCss } from '@pommora/uix/Theme/ramp'
import { type PickEntry, PropertyPicker } from '../../Properties/Pickers/PropertyPicker'
import { resolveFieldValue } from '../../Properties/value'
import {
  numberFormatGlyph,
  propertyIcon,
  propertyTypeIconName,
} from '../../Properties/Cells/PropertyTypes'
import { parseEditorValue } from '../../Properties/parseEditorValue'
import { linkEditText } from '@pommora/core/Connections/linkValue'
import { CardValue } from './CardValue'
import {
  type AddEntry,
  addColumn,
  addEntriesFor,
  orderAddableEntries,
  shownColumnsFor,
} from './cardValueInput'
import { RenamableTitle } from '../../Interface/RenamableTitle'
import { titleInput } from '@pommora/uix/Menus'
import { popMenu } from '../../Actions/menuActions'
import { cardMenuModel } from '@pommora/core/Actions/cardMenu'
import './cards-view.css'

// ── Types and constants ─────────────────────────────────────────────────────

type ValuePickerRequest = {
  rowId: string
  column: ResolvedColumn
  kind: 'picker' | 'datetime' | 'link' | 'number' | 'file'
  anchor: HTMLElement
  clickX?: number
  revealOnCommit?: boolean
}

type AddPickerRequest = {
  rowId: string
  anchor: HTMLElement
  initialEntry: AddEntry | null
}

/** What a card asks the one root banner seat to do; the nonce re-fires a repeat request on the same card. */
type BannerRequest = {
  id: string
  kind: 'page' | 'set'
  frame: HTMLElement
  mode: 'menu' | 'edit'
  nonce: number
}

/** Every gesture a card hands back, as one identity-stable object. */
type CardApi = {
  commitValue: (row: ViewRow, column: ResolvedColumn, value: PropertyValue | null) => void
  setStyle: (colId: string, key: keyof ColumnStyle & string, value: string) => void
  open: (row: ViewRow, newTab: boolean) => void
  reveal: (id: string) => void
  hide: (id: string) => void
  openValuePicker: (req: ValuePickerRequest) => void
  openAddPicker: (req: AddPickerRequest) => void
  hover: (id: string, entering: boolean) => void
  titleMenuContext: (row: ViewRow) => TitleMenuContext
  titleAction: (action: string, row: ViewRow, anchor: HTMLElement) => boolean
  addableFor: (row: ViewRow) => AddEntry[]
  openSet: (set: SetNode, newTab: boolean) => void
  banner: (req: Omit<BannerRequest, 'nonce'>) => void
}

type ValueApi = Pick<CardApi, 'commitValue' | 'setStyle' | 'hide' | 'openValuePicker'>

/** A card's preview image: the current thumbnail version, and the failure that falls the face back to its placeholder until the source changes. */
function useThumb(
  nexusId: string,
  rowId: string,
  banner: CardBanner,
): { src: string | undefined; onError: () => void } {
  const version = useSession((s) => s.thumbVersions[`page:${rowId}`] ?? 0)
  const [failed, setFailed] = useState(false)
  const lastSrc = useRef<string | undefined>(undefined)
  const src =
    banner === 'preview'
      ? `${assetUrl(thumbRel(nexusId, thumbKey(navKey({ kind: 'page', id: rowId }))))}?v=${version}`
      : undefined
  if (src !== lastSrc.current) {
    lastSrc.current = src
    if (failed) setFailed(false)
  }
  return { src: failed ? undefined : src, onError: useCallback(() => setFailed(true), []) }
}

const coverOf = (row: ViewRow): string | undefined =>
  typeof row.frontmatter.banner === 'string' ? row.frontmatter.banner : undefined

const CARDS_GHOST_GRACE_MS = 200 // KNOB

type DefaultIcons = Parameters<typeof entityIcon>[2]

const NOOP = (): void => {}

const INERT_API: ValueApi = {
  commitValue: NOOP,
  setStyle: NOOP,
  hide: NOOP,
  openValuePicker: NOOP,
}

// ── The view ────────────────────────────────────────────────────────────────

export function CardsView({ host }: { host: ViewHostApi }): React.JSX.Element {
  const {
    source,
    view,
    liveView,
    columns,
    groups,
    ctx,
    setNames,
    setIcons,
    setPaths,
    rowById,
    bandLabel,
    collapsed,
    toggleCollapse,
    structuralGrouping: structural,
    canReassign,
    canRelocate,
    dragDisabled,
    setStylePatch,
    hideProperty,
    revealProperty,
    commitValue,
    pickTarget,
    creation,
    mutate,
    select,
    tree,
  } = host
  const nexusId = useSession((s) => s.tree?.nexus.id ?? '')
  const defaultIcons = useSession((s) => s.personalization.defaultIcons)
  const beginRename = useSession((s) => s.beginRename)
  const anyNaming = useSession((s) => s.renamingPath !== null)

  // ── Set cards ─────────────────────────────────────────────────────────────

  const [setOrderOverride, setSetOrderOverride] = useState<string[] | null>(null)
  useEffect(() => setSetOrderOverride(null), [source])

  const baseSets = source.sets ?? []
  const sets = useMemo(
    () => (setOrderOverride ? byOrder(baseSets, setOrderOverride) : baseSets),
    [baseSets, setOrderOverride],
  )
  const showSetCards = (view.set_cards ?? true) && sets.length > 0
  const reorderSets = (activeId: string, overId: string): void => {
    const order = reorder(sets, activeId, overId).map((s) => s.id)
    const moved = sets.find((s) => s.id === activeId)
    if (!moved) return
    setSetOrderOverride(order)
    void mutate({ op: 'moveSet', path: moved.path, newParentPath: source.path, order }).then(
      (ok) => {
        if (!ok) setSetOrderOverride((cur) => (cur === order ? null : cur))
      },
    )
  }

  // ── Interactions ──────────────────────────────────────────────────────────

  const banner: CardBanner = view.card_banner ?? 'image'
  const flatMode = view.group?.kind === 'flat'
  const hideLocation = view.hide_location ?? false

  const pickersOpenRef = useRef(false)
  const [pendingSeat, setPendingSeat] = useState<string | null>(null)
  const ghostRowmate = (enteringId: string): boolean => {
    const root = host.seam.viewRootRef.current
    const ghostEl = root?.querySelector('.ghost-card')
    const cardEl = root?.querySelector(`[data-rid="${CSS.escape(enteringId)}"]`)
    if (!ghostEl || !cardEl) return false
    const g = ghostEl.getBoundingClientRect()
    return Math.abs(g.top - cardEl.getBoundingClientRect().top) < g.height / 2
  }

  const interactions = useViewInteractions(host, {
    ghost: {
      graceMs: CARDS_GHOST_GRACE_MS,
      suppressed: () =>
        pickersOpenRef.current || useSession.getState().renamingPath !== null || glanceShown(),
      travelHold: { inZone: ghostRowmate, holdMs: GHOST_TRAVEL_HOLD_MS },
    },
    rename: (target, fromCreate) => {
      if (fromCreate) setPendingSeat(null)
      beginRename(target.path, fromCreate, 'detail')
    },
  })
  const effectiveZoom = useElementZoom(host.seam.viewRootRef)

  // ── Value and add pickers ─────────────────────────────────────────────────

  const [valuePicker, setValuePicker] = useState<ValuePickerRequest | null>(null)
  const [addPicker, setAddPicker] = useState<AddPickerRequest | null>(null)
  pickersOpenRef.current = valuePicker !== null || addPicker !== null

  const openValuePicker = (req: ValuePickerRequest): void => setValuePicker(req)
  const openAddPicker = (req: AddPickerRequest): void => {
    const t = req.initialEntry?.def?.type
    if (req.initialEntry && !req.initialEntry.revealOnly && (t === 'datetime' || t === 'url')) {
      setValuePicker({
        rowId: req.rowId,
        column: addColumn(req.initialEntry.id, tree),
        kind: t === 'datetime' ? 'datetime' : 'link',
        anchor: req.anchor,
        revealOnCommit: true,
      })
      return
    }
    setAddPicker(req)
  }

  const capitalize = useCapitalizeMetadata()
  const styleById = useColumnStyleMap(host)
  const pickerAnchorRef = useRef<HTMLElement | null>(null)
  pickerAnchorRef.current = (valuePicker ?? addPicker)?.anchor ?? null

  useEffect(() => {
    if (!valuePicker) return
    const row = rowById.get(valuePicker.rowId)
    if (!row) return setValuePicker(null)
    if (valuePicker.revealOnCommit) return
    const cur = resolveFieldValue(row, valuePicker.column.id, ctx.schema)
    const isCheckbox = ctx.schema.find((d) => d.id === valuePicker.column.id)?.type === 'checkbox'
    if (isCompact(liveView) && isBlankValue(cur) && !isCheckbox) setValuePicker(null)
  }, [valuePicker, rowById, ctx, liveView])
  useEffect(() => {
    if (addPicker && !rowById.get(addPicker.rowId)) setAddPicker(null)
  }, [addPicker, rowById])

  const valuePopup =
    valuePicker && valuePicker.kind !== 'link' && valuePicker.kind !== 'number' ? valuePicker : null
  const vRow = valuePicker && rowById.get(valuePicker.rowId)
  const vTarget = valuePicker && vRow ? pickTarget(vRow, valuePicker.column) : null
  const vRaw = vTarget?.current?.kind === 'url' ? vTarget.current.value : undefined
  const commitPicked = (v: PropertyValue | null, entry?: PickEntry): void => {
    const req = valuePicker ?? addPicker
    const row = req && rowById.get(req.rowId)
    if (!row) return
    const column = valuePicker ? valuePicker.column : addColumn(entry?.id ?? '', tree)
    const creating = entry !== undefined || (valuePicker?.revealOnCommit ?? false)
    if (creating && !isBlankValue(v)) revealProperty(column.id)
    commitValue(row, column, v)
  }

  const addRow = addPicker ? rowById.get(addPicker.rowId) : undefined
  const addEntries = addRow
    ? orderAddableEntries(addEntriesFor(addRow, liveView, ctx, columns, tree, capitalize))
    : []

  // ── The root banner seat ──────────────────────────────────────────────────

  const [bannerRequest, setBannerRequest] = useState<BannerRequest | null>(null)
  const bannerFrameRef = useRef<HTMLElement | null>(null)
  const bannerNonce = useRef(0)
  // Resolved every render rather than snapshotted into the request: a cover written while the seat is open must reach the editor, and a vanished owner leaves it inert.
  const bannerOwner = ((): { path: string; value: string | undefined } | null => {
    if (!bannerRequest) return null
    if (bannerRequest.kind === 'set') {
      const set = sets.find((s) => s.id === bannerRequest.id)
      return set ? { path: set.path, value: set.banner } : null
    }
    const row = rowById.get(bannerRequest.id)
    return row ? { path: row.path, value: coverOf(row) } : null
  })()
  const {
    openMenu: openBannerMenu,
    editing: bannerEditing,
    openEditor: openBannerEditor,
    closeEditor: closeBannerEditor,
    boxAspect,
    onSave,
    onRepick,
  } = useBannerMenu(bannerOwner?.path ?? '', bannerRequest?.kind ?? 'page', {
    value: bannerOwner?.value,
    frame: bannerFrameRef,
    noun: bannerRequest?.kind === 'page' ? 'Banner' : undefined,
    autoEdit: true,
  })
  useEffect(() => {
    if (!bannerRequest) return
    bannerFrameRef.current = bannerRequest.frame
    // The seat sits above the ghost's Provider, so the hold is applied here rather than read from context.
    if (bannerRequest.mode === 'menu') void interactions.holdGhost(openBannerMenu)
    else openBannerEditor()
  }, [bannerRequest])

  // ── The card api ──────────────────────────────────────────────────────────

  const cardApi = useStableApi<CardApi>({
    commitValue,
    setStyle: setStylePatch,
    open: interactions.openPage,
    reveal: revealProperty,
    hide: hideProperty,
    openValuePicker,
    openAddPicker,
    hover: interactions.ghost.onHover,
    titleMenuContext: interactions.titleMenuContext,
    titleAction: interactions.runTitleAction,
    addableFor: (row) => addEntriesFor(row, liveView, ctx, columns, tree, capitalize),
    openSet: (set, newTab) => {
      // A plain click passes NO option, so the tab-open preference still decides, the way `openPage` does.
      void select(
        { kind: 'set', id: set.id, path: set.path },
        newTab ? { newTab: true } : undefined,
      )
    },
    banner: (req) => {
      bannerNonce.current += 1
      setBannerRequest({ ...req, nonce: bannerNonce.current })
    },
  })
  const locByRow = useMemo(() => {
    const m = new Map<string, TrailSegment[]>()
    if (hideLocation) return m
    for (const r of rowById.values()) {
      if (!r.parentSetId) continue
      const chain = ancestryOf(tree, { kind: 'set', id: r.parentSetId })
      if (chain) m.set(r.id, chain.slice(structural ? 2 : 1))
    }
    return m
  }, [groups, tree, structural, hideLocation])

  // ── The ghost's seat and its FLIP ─────────────────────────────────────────

  const feel = DEFAULT_FEEL
  const flipPrev = useRef<Map<Element, DOMRect> | null>(null)
  // Kept mounted through `closing` so its Reveal can collapse it out, matching the sidebar and table ghosts; it leaves render only once the ghost is truly gone.
  const ghostLiveId =
    interactions.ghost.ghost && !anyNaming ? interactions.ghost.ghost.anchorId : null
  const [ghostShown, setGhostShown] = useState<string | null>(null)
  useLayoutEffect(() => {
    if (ghostLiveId === ghostShown) return
    const root = host.seam.viewRootRef.current
    const hardGone = ghostShown !== null && interactions.ghost.ghost === null
    const anchorId = ghostLiveId ?? ghostShown
    if (root && !hardGone && anchorId !== null) {
      // Only the grid holding the anchor reflows horizontally; cards in other grids move vertically alone, which the band rects already cover.
      const grid = root
        .querySelector(`[data-rid="${CSS.escape(anchorId)}"]`)
        ?.closest('.cards-grid')
      const m = new Map<Element, DOMRect>()
      for (const el of [
        ...(grid?.querySelectorAll('.card-displace') ?? []),
        ...root.querySelectorAll('.group-band'),
      ])
        m.set(el, el.getBoundingClientRect())
      flipPrev.current = m
    } else flipPrev.current = null
    setGhostShown(ghostLiveId)
  }, [ghostLiveId, ghostShown])
  useLayoutEffect(() => {
    const prev = flipPrev.current
    flipPrev.current = null
    if (!prev) return
    const z = effectiveZoom || 1
    for (const [el, before] of prev) {
      if (!el.isConnected) continue
      const after = el.getBoundingClientRect()
      const dx = (before.left - after.left) / z
      const dy = (before.top - after.top) / z
      if (dx !== 0 || dy !== 0)
        el.animate([{ transform: `translate(${dx}px, ${dy}px)` }, { transform: 'none' }], {
          duration: feel.duration,
          easing: feel.easing,
        })
    }
  }, [ghostShown])
  const ghostCreate = (): void => {
    const seat = interactions.ghost.ghost?.anchorId ?? null
    setPendingSeat(seat)
    void interactions.ghostCreate()?.then((ok) => {
      if (!ok) setPendingSeat(null)
    })
  }

  return (
    <GhostSuppress.Provider value={interactions.holdGhost}>
      <div
        ref={(el) => {
          host.seam.viewRootRef.current = el
        }}
        className={cx('cards-view', banner === 'none' && 'is-compact')}
        data-view-id={view.id}
        style={{ '--card-scale': view.card_size ?? 1 } as React.CSSProperties}
      >
        {showSetCards && (
          <div className="set-cards-row">
            <SortableZone
              items={sets.map((s) => s.id)}
              onReorder={reorderSets}
              getItemLabel={(id) => sets.find((s) => s.id === id)?.title ?? id}
            >
              <CardDropSlot />
              {sets.map((s) => (
                <DraggableSetCard key={s.id} set={s} defaultIcons={defaultIcons} api={cardApi} />
              ))}
            </SortableZone>
          </div>
        )}
        <DragGroup
          onCommit={(activeId, toZone, toIndex) =>
            interactions.onDrop({
              activeId,
              toZone,
              beforeId:
                (groups.find((g) => g.key === toZone)?.items.filter((r) => r.id !== activeId) ??
                  [])[toIndex]?.id ?? null,
            })
          }
          zoom={effectiveZoom}
          crossZone={canReassign || canRelocate}
          resolveIndex={interactions.structuralSlot}
          renderOverlay={(id, rect) => {
            const r = rowById.get(id)
            if (!r) return null
            return (
              <div
                className={cx('cards-view', banner === 'none' && 'is-compact')}
                style={
                  {
                    zoom: effectiveZoom,
                    '--card-scale': view.card_size ?? 1,
                    width: `${rect.width / effectiveZoom}px`,
                    height: `${rect.height / effectiveZoom}px`,
                  } as React.CSSProperties
                }
              >
                <CardRoot
                  dragging
                  className="card-overlay"
                  style={{ width: '100%', height: '100%' }}
                >
                  <CardBody pop={false}>
                    <OverlayFace
                      row={r}
                      view={liveView}
                      banner={banner}
                      ctx={ctx}
                      crumbs={locByRow.get(id) ?? NO_TRAIL}
                      cover={coverOf(r)}
                      iconName={entityIcon('page', r.icon, defaultIcons)}
                      columns={columns}
                      nexusId={nexusId}
                      capitalize={capitalize}
                      styleById={styleById}
                    />
                  </CardBody>
                </CardRoot>
              </div>
            )
          }}
        >
          <BandDnd
            bands={interactions.bands}
            labelFor={bandLabel}
            onDrop={interactions.onBandDrop}
            nestable={!host.flat}
          >
            {groups.map((g) => {
              const isCollapsed = !flatMode && collapsed.has(g.key)
              return (
                <ViewGroupBand
                  key={g.key}
                  group={g}
                  view={liveView}
                  ctx={ctx}
                  setNames={setNames}
                  setIcons={setIcons}
                  source={source}
                  collapsed={isCollapsed}
                  onToggle={() => toggleCollapse(g.key)}
                  onAdd={setPaths.has(g.key) ? () => creation.bandAdd(g.key) : undefined}
                  headless={flatMode}
                  fill
                >
                  <SortableZone
                    group="cards"
                    id={g.key}
                    items={g.items.map((r) => r.id)}
                    className="cards-grid card-grid is-fill"
                  >
                    {g.items.flatMap((row) => {
                      const card = (
                        <PageCard
                          key={row.id}
                          row={row}
                          view={liveView}
                          banner={banner}
                          nexusId={nexusId}
                          columns={columns}
                          ctx={ctx}
                          loc={locByRow.get(row.id)}
                          defaultIcons={defaultIcons}
                          capitalize={capitalize}
                          styleById={styleById}
                          draggable={!dragDisabled}
                          api={cardApi}
                          allowInlineRemove={effectiveZoom >= 0.8}
                        />
                      )
                      if (ghostShown !== row.id && pendingSeat !== row.id) return [card]
                      return [
                        card,
                        // FLIP seats the ghost among its neighbors on the way in; Reveal collapses it on the way out, so an aborted ghost animates away like the sidebar and table ones instead of vanishing.
                        <Reveal
                          key={`ghost-${row.id}`}
                          open={!interactions.ghost.ghost?.closing}
                          fill
                          onCollapsed={interactions.ghost.closed}
                        >
                          <GhostCard
                            banner={banner}
                            view={liveView}
                            columns={columns}
                            ctx={ctx}
                            capitalize={capitalize}
                            iconName={entityIcon('page', undefined, defaultIcons)}
                            onEnter={interactions.ghost.onGhostEnter}
                            onLeave={interactions.ghost.onGhostLeave}
                            onCreate={ghostCreate}
                          />
                        </Reveal>,
                      ]
                    })}
                  </SortableZone>
                </ViewGroupBand>
              )
            })}
          </BandDnd>
        </DragGroup>
        {interactions.iconPicker}
        <ImagePicker
          open={bannerEditing}
          value={bannerOwner?.value ?? ''}
          shape="rect"
          boxAspect={boxAspect}
          onCancel={closeBannerEditor}
          onSave={onSave}
          onRepick={onRepick}
        />
        <TextPicker
          open={valuePicker?.kind === 'link'}
          onDismiss={() => setValuePicker(null)}
          triggerRef={pickerAnchorRef}
          value={vRaw ? linkEditText(vRaw) : ''}
          accent={solidColorCss(vTarget?.def.link_color)}
          onCommit={(raw) => {
            const nv = parseEditorValue('url', raw, vTarget?.current)
            if (nv !== undefined && (nv !== null || vRaw)) commitPicked(nv)
            setValuePicker(null)
          }}
        />
        <TextPicker
          open={valuePicker?.kind === 'number'}
          onDismiss={() => setValuePicker(null)}
          triggerRef={pickerAnchorRef}
          value={vTarget?.current?.kind === 'number' ? String(vTarget.current.value) : ''}
          leading={vTarget ? numberFormatGlyph(vTarget.def) : undefined}
          onCommit={(raw) => {
            const nv = parseEditorValue('number', raw)
            if (nv != null) commitPicked(nv)
            setValuePicker(null)
          }}
        />
        <PropertyPicker
          target={valuePopup ? vTarget : null}
          chooser={
            addPicker
              ? addEntries.map(
                  (e): PickEntry => ({
                    id: e.id,
                    name: e.name,
                    icon: e.def
                      ? propertyIcon(e.def)
                      : (propertyTypeIconName(e.type) ?? 'square-dashed'),
                    revealOnly: e.revealOnly,
                    drillable: !e.revealOnly && isOptionsKind(e.type),
                  }),
                )
              : undefined
          }
          chooserInitial={addPicker?.initialEntry?.id}
          resolveTarget={(e) => (addRow ? pickTarget(addRow, addColumn(e.id, tree)) : null)}
          open={valuePopup !== null || addPicker !== null}
          triggerRef={pickerAnchorRef}
          anchorX={valuePicker?.kind === 'picker' ? valuePicker.clickX : undefined}
          onCommit={commitPicked}
          onReveal={(entry) => {
            if (!addPicker) return
            if (entry.revealOnly) return revealProperty(entry.id)
            const src = addEntries.find((e) => e.id === entry.id)
            setAddPicker(null)
            setValuePicker({
              rowId: addPicker.rowId,
              column: addColumn(entry.id, tree),
              kind:
                src && (src.type === 'datetime' || src.type === 'number' || src.type === 'file')
                  ? src.type
                  : 'link',
              anchor: addPicker.anchor,
              revealOnCommit: true,
            })
          }}
          onDismiss={() => {
            setValuePicker(null)
            setAddPicker(null)
          }}
        />
      </div>
    </GhostSuppress.Provider>
  )
}

// ── The ghost card ──────────────────────────────────────────────────────────

function GhostCard({
  banner,
  view,
  columns,
  ctx,
  capitalize,
  iconName,
  onEnter,
  onLeave,
  onCreate,
}: {
  banner: CardBanner
  view: SavedView
  columns: ResolvedColumn[]
  ctx: ValueContext
  capitalize: boolean
  iconName: string
  onEnter: () => void
  onLeave: () => void
  onCreate: () => void
}): React.JSX.Element {
  const props = isCompact(view) ? [] : columns.filter((c) => c.kind !== 'title')
  return (
    <CardRoot
      data-ghost-root
      className="ghost-card"
      onPointerEnter={onEnter}
      onPointerLeave={onLeave}
      onClick={onCreate}
    >
      <CardBody pop={false} className="ghost-worn">
        {banner !== 'none' && (
          <CardThumb>
            <CardPlaceholder>
              <Icon name={iconName} size="titleMedium" />
            </CardPlaceholder>
          </CardThumb>
        )}
        <CardText>
          <CardTitle mode="static">
            <Icon name={iconName} className="card-title-icon" />
            <span>New Page</span>
          </CardTitle>
          {props.length > 0 && (
            <div className="card-props">
              {props.map((c) => (
                <div key={c.id} className="card-prop-row">
                  <span className={cx('card-prop-label', text.caption.emphasized)}>
                    {columnLabel(c.id, ctx.schema, ctx.contexts, capitalize)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardText>
      </CardBody>
    </CardRoot>
  )
}

// ── Set cards ───────────────────────────────────────────────────────────────

interface SetCardProps {
  set: SetNode
  defaultIcons: DefaultIcons
  api: Pick<CardApi, 'openSet' | 'banner'>
}

function DraggableSetCard(props: SetCardProps): React.JSX.Element {
  const drag = useDragItem(props.set.id)
  return <SetCard {...props} drag={drag} />
}

function SetCard({
  set,
  defaultIcons,
  api,
  drag,
}: SetCardProps & { drag?: DragItem }): React.JSX.Element {
  const iconName = entityIcon('set', set.icon, defaultIcons)
  const thumbRef = useRef<HTMLDivElement>(null)
  return (
    <CardRoot
      drag={drag}
      locked
      onClick={(e) => {
        if (!drag?.isDragging) api.openSet(set, isCmd(e))
      }}
    >
      <CardBody>
        <CardThumb
          ref={thumbRef}
          onContextMenu={(e) => {
            e.preventDefault()
            e.stopPropagation()
            const frame = thumbRef.current ?? (e.currentTarget as HTMLElement)
            api.banner({ id: set.id, kind: 'set', frame, mode: 'menu' })
          }}
        >
          <AssetImage
            value={set.banner}
            fallback={
              <CardPlaceholder>
                <Icon name={iconName} size="titleLarge" />
              </CardPlaceholder>
            }
          />
        </CardThumb>
        <CardText>
          <CardTitle>
            <Icon name={iconName} className="card-title-icon" />
            <span>{set.title}</span>
          </CardTitle>
        </CardText>
      </CardBody>
    </CardRoot>
  )
}

// ── A card's properties ─────────────────────────────────────────────────────

interface PageCardProps {
  row: ViewRow
  view: SavedView
  banner: CardBanner
  nexusId: string
  columns: ResolvedColumn[]
  ctx: ValueContext
  loc?: TrailSegment[]
  defaultIcons: DefaultIcons
  capitalize: boolean
  styleById: Map<string, ColumnStyle>
  api: CardApi
  draggable: boolean
  allowInlineRemove: boolean
}

function CardProperties({
  row,
  view,
  ctx,
  capitalize,
  styleById,
  shown,
  onZoneClick,
  api,
  allowInlineRemove,
}: Pick<
  PageCardProps,
  'row' | 'view' | 'ctx' | 'capitalize' | 'styleById' | 'allowInlineRemove'
> & {
  api: ValueApi
  shown: ResolvedColumn[]
  onZoneClick: (e: React.MouseEvent) => void
}): React.JSX.Element {
  const compact = isCompact(view)
  const zoneClick = (e: React.MouseEvent): void => {
    if (e.target === e.currentTarget) onZoneClick(e)
  }
  const value = (c: ResolvedColumn): React.JSX.Element => (
    <CardValue
      row={row}
      column={c}
      ctx={ctx}
      style={styleById.get(c.id) ?? NO_STYLE}
      onCommit={(col, v) => api.commitValue(row, col, v)}
      onStyle={api.setStyle}
      onHide={api.hide}
      onOpenPicker={(column, kind, anchor, clickX) =>
        api.openValuePicker({ rowId: row.id, column, kind, anchor, clickX })
      }
      allowInlineRemove={allowInlineRemove}
    />
  )
  return compact ? (
    // biome-ignore lint/a11y/useKeyWithClickEvents lint/a11y/noStaticElementInteractions: a grid cell — per-cell tab stops are the wrong pattern; the grid wants roving tabindex, which is a feature rather than a lint fix
    <div className="card-props is-flow" onClick={zoneClick}>
      {shown.map((c) => (
        <span key={c.id}>{value(c)}</span>
      ))}
    </div>
  ) : (
    // biome-ignore lint/a11y/useKeyWithClickEvents lint/a11y/noStaticElementInteractions: a grid cell — per-cell tab stops are the wrong pattern; the grid wants roving tabindex, which is a feature rather than a lint fix
    <div className="card-props" onClick={zoneClick}>
      {shown.map((c) => (
        <div key={c.id} className="card-prop-row">
          <span className={cx('card-prop-label', text.caption.emphasized)}>
            {columnLabel(c.id, ctx.schema, ctx.contexts, capitalize)}
          </span>
          {value(c)}
        </div>
      ))}
    </div>
  )
}

// ── A card's face ───────────────────────────────────────────────────────────

const CardFace = memo(function CardFace({
  row,
  view,
  banner,
  ctx,
  capitalize,
  styleById,
  crumbs,
  src,
  cover,
  iconName,
  columns,
  allowInlineRemove,
  naming,
  onImgError,
  textRef,
  thumbRef,
  onThumbContextMenu,
  onZoneClick,
  api,
}: {
  row: ViewRow
  naming: boolean
  view: SavedView
  banner: CardBanner
  ctx: ValueContext
  capitalize: boolean
  styleById: Map<string, ColumnStyle>
  crumbs: TrailSegment[]
  src: string | undefined
  cover?: string
  iconName: string
  columns: ResolvedColumn[]
  allowInlineRemove: boolean
  onImgError?: () => void
  textRef?: React.Ref<HTMLDivElement>
  thumbRef?: React.Ref<HTMLDivElement>
  onThumbContextMenu?: (e: React.MouseEvent) => void
  onZoneClick?: (e: React.MouseEvent) => void
  api: ValueApi
}): React.JSX.Element {
  const shown = useMemo(
    () => shownColumnsFor(row, columns, ctx, isCompact(view)),
    [ctx, columns, row, view],
  )
  const titleIcon = !(view.hide_page_icons ?? false) && (
    <Icon name={iconName} className="card-title-icon" />
  )
  const titleRow = (
    <CardTitle mode={(view.wrap_titles ?? false) ? 'wrap' : 'scroll'}>
      {titleIcon}
      <span>{row.title}</span>
    </CardTitle>
  )
  const namingRow = naming && (
    <CardTitle mode="static" onPointerDown={(e) => e.stopPropagation()}>
      {titleIcon}
      <RenamableTitle
        path={row.path}
        kind="page"
        title={row.title}
        className={cx(titleInput, 'card-title-input')}
        host="detail"
      />
    </CardTitle>
  )
  const ph = (
    <CardPlaceholder>
      <Icon name={iconName} size="titleMedium" />
    </CardPlaceholder>
  )
  return (
    <>
      {banner !== 'none' && (
        <CardThumb
          ref={thumbRef}
          capture={banner === 'preview'}
          onContextMenu={onThumbContextMenu ? (e) => void onThumbContextMenu(e) : undefined}
        >
          {banner === 'image' ? (
            <AssetImage value={cover} fallback={ph} />
          ) : src ? (
            <img src={src} alt="" onError={onImgError} />
          ) : (
            ph
          )}
        </CardThumb>
      )}
      <CardText
        ref={textRef}
        onClick={
          onZoneClick
            ? (e) => {
                if (e.target === e.currentTarget) onZoneClick(e)
              }
            : undefined
        }
      >
        {namingRow || titleRow}
        {shown.length > 0 && (
          <CardProperties
            row={row}
            view={view}
            ctx={ctx}
            capitalize={capitalize}
            styleById={styleById}
            shown={shown}
            api={api}
            allowInlineRemove={allowInlineRemove}
            onZoneClick={onZoneClick ?? NOOP}
          />
        )}
        <CardTrail segments={crumbs} onClick={onZoneClick} />
      </CardText>
    </>
  )
})

// ── The drag overlay's face ─────────────────────────────────────────────────

function OverlayFace({
  row,
  view,
  banner,
  ctx,
  capitalize,
  styleById,
  crumbs,
  cover,
  iconName,
  columns,
  nexusId,
}: {
  row: ViewRow
  view: SavedView
  banner: CardBanner
  ctx: ValueContext
  capitalize: boolean
  styleById: Map<string, ColumnStyle>
  crumbs: TrailSegment[]
  cover?: string
  iconName: string
  columns: ResolvedColumn[]
  nexusId: string
}): React.JSX.Element {
  const { src } = useThumb(nexusId, row.id, banner)
  return (
    <CardFace
      row={row}
      view={view}
      banner={banner}
      ctx={ctx}
      capitalize={capitalize}
      styleById={styleById}
      crumbs={crumbs}
      src={src}
      cover={cover}
      iconName={iconName}
      columns={columns}
      allowInlineRemove={false}
      naming={false}
      api={INERT_API}
    />
  )
}

// ── A page card ─────────────────────────────────────────────────────────────

const PageCard = memo(function PageCard({
  row,
  view,
  banner,
  nexusId,
  columns,
  ctx,
  loc,
  defaultIcons,
  capitalize,
  styleById,
  api,
  draggable,
  allowInlineRemove,
}: PageCardProps): React.JSX.Element {
  const gdrag = useGroupedDragItem(row.id)
  const drag = draggable ? gdrag : null
  // The boolean, not the object: `gdrag` is a fresh object per slot flip, so a handler keyed on it would rebuild on every drag frame — exactly when CardFace's memo has to hold.
  const isDragging = drag?.isDragging ?? false
  const naming = useSession((s) => s.renamingPath === row.path && s.renamingHost !== 'sidebar')
  const active = useSession((s) => s.selection.kind === 'page' && s.selection.id === row.id)
  const { src, onError } = useThumb(nexusId, row.id, banner)

  const textRef = useRef<HTMLDivElement>(null)
  const thumbRef = useRef<HTMLDivElement>(null)
  const openAdd = useCallback(
    (e: React.MouseEvent): void => {
      e.stopPropagation()
      if (!isDragging && api.addableFor(row).length > 0 && textRef.current)
        api.openAddPicker({ rowId: row.id, anchor: textRef.current, initialEntry: null })
    },
    [isDragging, api, row],
  )
  const holdGhost = useContext(GhostSuppress)
  const cover = coverOf(row)

  const requestBanner = (mode: 'menu' | 'edit', fallback: HTMLElement): void =>
    api.banner({ id: row.id, kind: 'page', frame: thumbRef.current ?? fallback, mode })
  const onCardContextMenu = async (e: React.MouseEvent): Promise<void> => {
    e.preventDefault()
    e.stopPropagation()
    if (drag?.isDragging) return
    const anchor = textRef.current ?? (e.currentTarget as HTMLElement)
    const addable = api.addableFor(row)
    const action = await holdGhost(() =>
      popMenu(
        cardMenuModel({
          addable: orderAddableEntries(addable).map((a) => ({ id: a.id, name: a.name })),
          editableImage: banner === 'image' && !!cover,
          ...api.titleMenuContext(row),
        }),
      ),
    )
    if (!action) return
    if (api.titleAction(action, row, anchor)) return
    if (action === 'image:edit') requestBanner('edit', anchor)
    else if (action.startsWith('add:')) {
      const entry = addable.find((a) => a.id === action.slice(4))
      if (!entry) return
      if (entry.revealOnly) api.reveal(entry.id)
      else if (textRef.current)
        api.openAddPicker({ rowId: row.id, anchor: textRef.current, initialEntry: entry })
    }
  }

  const iconName = entityIcon('page', row.icon, defaultIcons)

  return (
    <CardRoot
      drag={drag}
      active={active}
      data-rid={row.id}
      {...rowHover(row, api.hover)}
      onClick={(e) => {
        if (drag?.isDragging || naming) return
        const hit = document.elementFromPoint(e.clientX, e.clientY)
        if (hit && e.currentTarget.contains(hit) && hit.closest('.card-title, .card-thumb'))
          api.open(row, isCmd(e))
      }}
      onContextMenu={onCardContextMenu}
    >
      <div className="card-displace">
        <CardBody>
          <CardFace
            row={row}
            view={view}
            banner={banner}
            ctx={ctx}
            capitalize={capitalize}
            styleById={styleById}
            crumbs={loc ?? NO_TRAIL}
            src={src}
            cover={cover}
            iconName={iconName}
            columns={columns}
            allowInlineRemove={allowInlineRemove}
            naming={naming}
            onImgError={onError}
            textRef={textRef}
            thumbRef={thumbRef}
            onThumbContextMenu={(e) => {
              e.preventDefault()
              e.stopPropagation()
              requestBanner('menu', e.currentTarget as HTMLElement)
            }}
            onZoneClick={openAdd}
            api={api}
          />
        </CardBody>
      </div>
    </CardRoot>
  )
})
```

**VERIFY**

- [ ] Check the work for unnecessary code or obvious mistakes; `CardsView.tsx` imports nothing from `glanceLink`, `pageMenuActions`, `treeIndex` (beyond `ancestryOf`), `tabsModel`, `confirmations`, `creationOrder`, `bandDndModel`, `useBandOrdering`, `reorderModel`, `IconChoice`, or `clamp`.
- [ ] `wc -l Core/Views/Cards/CardsView.tsx` → 1165; `grep -c "useSession(" Core/Views/Cards/CardsView.tsx` → 7; `grep -c "<IconChoice\|<ImagePicker\|useBannerMenu(" Core/Views/Cards/CardsView.tsx` → 2 (one seat, one hook call).
- [ ] Run the gates; `npx vitest run Core/Views/manualOrderDrops` → 6 pass with the two Cards cases unchanged.

#### Task 3.2

**TASK:** Three Cards suites on the shared harness: drops, gestures, creation.

**FILES:** `Core/Views/Cards/cardDrops.test.tsx` (new), `Core/Views/Cards/cardGestures.test.tsx` (new), `Core/Views/Cards/cardCreation.test.tsx` (new).

**DEPENDENCIES:** Task 3.1.

**NOW**

Cards is exercised by the two drag cases in `manualOrderDrops.test.tsx` and nothing else: no relocate, no reassign, no band drag, no click, no value pick, no menu, no ghost.

**CHANGE**

- [ ] Add the three suites as drawn. Each mounts the real `ViewHost` over a `type: 'cards'` view and asserts a write the user would see: the `mutate` call, the `views:save` call, the `select` call, or the one portal in `[data-picker-portal]`.

**AFTER**

`Core/Views/Cards/cardDrops.test.tsx`:

```tsx
// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import type { CollectionNode } from '@pommora/core/Nexus/tree'
import type { SavedView } from '@pommora/core/Views/views'
import { firePointer, stubRect } from '@pommora/uix/Interactions/pointerHarness'
import { ID_KEY } from '@pommora/core/Nexus/identityMark'
import { useSession } from '../../Session/store'
import { installViewEnvironment, STATUS_DEF, renderView, settle } from '../../Testing/viewHarness'
import { propsAtRoot, valuesReply } from '../../Testing/pageValues'
import { stubDialer } from '../../vitest.setup'

installViewEnvironment()

const collection = (sets: unknown[], pages: unknown[], group: unknown): CollectionNode =>
  ({
    kind: 'collection',
    id: 'col1',
    title: 'Col',
    path: 'Col',
    sets,
    pages,
    properties: [STATUS_DEF],
    views: [
      {
        id: 'view_1',
        name: 'Cards',
        type: 'cards',
        property_order: ['_title', 'prop_status'],
        hidden_properties: [],
        group,
      },
    ],
  }) as unknown as CollectionNode

const page = (id: string, title: string, path: string): unknown => ({
  kind: 'page',
  id,
  title,
  path,
})
const set = (id: string, title: string, pages: unknown[]): unknown => ({
  kind: 'set',
  id,
  title,
  path: `Col/${title}`,
  pages,
  sets: [],
})

const STRUCTURAL = { kind: 'structural' }

// A loose page and one inside a Set: under structural grouping the two land in different bands.
const nested = (): CollectionNode =>
  collection(
    [set('sA', 'A', [page('p2', 'Two', 'Col/A/Two.md')])],
    [page('p1', 'One', 'Col/One.md')],
    STRUCTURAL,
  )

// Two Sets, each with one page, so a band drag has a neighbor to land beside.
const twoSets = (): CollectionNode =>
  collection(
    [
      set('sA', 'A', [page('p1', 'One', 'Col/A/One.md')]),
      set('sB', 'B', [page('p2', 'Two', 'Col/B/Two.md')]),
    ],
    [],
    STRUCTURAL,
  )

// Two option bands of one page each, so a cross-band drop can only rewrite the value.
const byStatus = (): CollectionNode =>
  collection([], [page('p1', 'One', 'Col/One.md'), page('p2', 'Two', 'Col/Two.md')], {
    kind: 'property',
    property_id: 'prop_status',
  })

const VALUES = valuesReply({
  p1: { [ID_KEY]: 'p1', ...propsAtRoot({ prop_status: 'active' }, [STATUS_DEF]) },
  p2: { [ID_KEY]: 'p2', ...propsAtRoot({ prop_status: 'complete' }, [STATUS_DEF]) },
})

let host: HTMLDivElement
let root: Root
let mutateSpy: ReturnType<typeof vi.fn>
let saveSpy: ReturnType<typeof vi.fn>

beforeEach(() => {
  host = document.createElement('div')
  document.body.appendChild(host)
  root = createRoot(host)
  mutateSpy = vi.fn(async () => true)
  saveSpy = vi.fn(async () => ({ ok: true, value: { id: 'view_1' } }))
  ;(window as unknown as { nexus: unknown }).nexus = stubDialer({
    'view:loadValues': async () => VALUES,
    'views:save': saveSpy,
    menu: async () => ({ ok: true, value: null }),
  })
  useSession.setState({
    tree: { collections: [], contexts: [], personalization: {}, nexus: { id: 'nx' } } as never,
    selection: { kind: 'none' } as never,
    renamingPath: null,
    mutate: mutateSpy as never,
    select: vi.fn(async () => {}) as never,
  })
})
afterEach(() => {
  act(() => root.unmount())
  host.remove()
})

const ROW = 100
const GRID = 200

// Each grid owns a 200px slice, its cards a 100px row apiece — enough for zoneAt and the row banding to resolve.
const layout = (): void => {
  const box = host.querySelector('.drop-line-host')
  if (box) stubRect(box, { top: 0, bottom: 800 })
  for (const [i, el] of [...host.querySelectorAll('.group-band-head')].entries())
    stubRect(el, { top: i * 24, bottom: i * 24 + 24 })
  for (const [gi, grid] of [...host.querySelectorAll('.cards-grid')].entries()) {
    const top = gi * GRID
    stubRect(grid, { top, bottom: top + GRID, left: 0, right: GRID })
    for (const [i, el] of [...grid.querySelectorAll('[data-rid]')].entries())
      stubRect(el, { top: top + i * ROW, bottom: top + i * ROW + ROW, left: 0, right: GRID })
  }
}

const mount = async (source: CollectionNode): Promise<void> => {
  await renderView(root, source)
  layout()
}

const dragTo = async (from: Element, y: number): Promise<void> => {
  const start = from.getBoundingClientRect()
  await act(async () => {
    firePointer(from, 'pointerdown', { x: 100, y: start.top + ROW / 2 })
  })
  await act(async () => {
    firePointer(window, 'pointermove', { x: 100, y })
  })
  await act(async () => {
    firePointer(window, 'pointerup')
  })
  await settle(400)
}

const card = (id: string): HTMLElement => host.querySelector(`[data-rid="${id}"]`) as HTMLElement
const gridOf = (id: string): Element => card(id).closest('.cards-grid') as Element
const lastSavedView = (): SavedView => saveSpy.mock.calls.at(-1)?.[2] as SavedView

describe('a card dropped across structural bands', () => {
  it('moves the page into the Set at the slot it landed on', async () => {
    await mount(nested())
    const dest = gridOf('p2').getBoundingClientRect()
    await dragTo(card('p1'), dest.top + 10)
    expect(mutateSpy).toHaveBeenCalledExactlyOnceWith({
      op: 'movePage',
      path: 'Col/One.md',
      newParentPath: 'Col/A',
      order: ['p1', 'p2'],
    })
  })
})

describe('a card dropped across property bands', () => {
  it('rewrites the grouped value and never touches the fs', async () => {
    await mount(byStatus())
    const dest = gridOf('p2').getBoundingClientRect()
    await dragTo(card('p1'), dest.top + 10)
    expect(mutateSpy).toHaveBeenCalledExactlyOnceWith({
      op: 'setProperty',
      path: 'Col/One.md',
      propertyId: 'prop_status',
      value: { kind: 'select', value: 'complete' },
    })
  })
})

describe('a band dragged over another', () => {
  it('persists group_order and never touches the fs', async () => {
    await mount(twoSets())
    const glyphs = host.querySelectorAll('.group-band-glyph')
    await act(async () => {
      firePointer(glyphs[1], 'pointerdown', { x: 10, y: 36 })
    })
    await act(async () => {
      firePointer(window, 'pointermove', { x: 10, y: 2 })
    })
    await act(async () => {
      firePointer(window, 'pointerup')
    })
    await settle(1)
    expect(lastSavedView().group_order).toEqual(['sB', 'sA'])
    expect(mutateSpy).not.toHaveBeenCalled()
  })
})
```

`Core/Views/Cards/cardGestures.test.tsx`:

```tsx
// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { ok } from '@pommora/core/Contract/result'
import type { CollectionNode } from '@pommora/core/Nexus/tree'
import type { PropertyDefinition } from '@pommora/core/Properties/properties'
import { ID_KEY } from '@pommora/core/Nexus/identityMark'
import { useSession } from '../../Session/store'
import { installViewEnvironment, STATUS_DEF, renderView } from '../../Testing/viewHarness'
import { propsAtRoot, valuesReply } from '../../Testing/pageValues'
import { stubDialer } from '../../vitest.setup'

installViewEnvironment()
// Absent from property_order and blank on every page, so it is the card menu's one addable entry.
const numberDef: PropertyDefinition = { id: 'prop_n', name: 'Count', type: 'number' }

const source = (): CollectionNode =>
  ({
    kind: 'collection',
    id: 'col1',
    title: 'Col',
    path: 'Col',
    sets: [],
    pages: [
      { kind: 'page', id: 'p1', title: 'One', path: 'Col/One.md' },
      { kind: 'page', id: 'p2', title: 'Two', path: 'Col/Two.md' },
    ],
    properties: [STATUS_DEF, numberDef],
    views: [
      {
        id: 'view_1',
        name: 'Cards',
        type: 'cards',
        property_order: ['_title', 'prop_status'],
        hidden_properties: [],
        group: { kind: 'structural' },
      },
    ],
  }) as unknown as CollectionNode

const VALUES = valuesReply({
  p1: { [ID_KEY]: 'p1', ...propsAtRoot({ prop_status: 'active' }, [STATUS_DEF]) },
  p2: { [ID_KEY]: 'p2' },
})

let host: HTMLDivElement
let root: Root
let mutateSpy: ReturnType<typeof vi.fn>
let selectSpy: ReturnType<typeof vi.fn>
let menuSpy: ReturnType<typeof vi.fn>
let menuAnswer: string | null

beforeEach(() => {
  host = document.createElement('div')
  document.body.appendChild(host)
  root = createRoot(host)
  mutateSpy = vi.fn(async (req: { op: string }, onCreated?: (c: unknown) => void) => {
    if (req.op === 'createPage') onCreated?.({ id: 'p3', path: 'Col/Untitled.md' })
    return true
  })
  selectSpy = vi.fn(async () => {})
  menuAnswer = null
  menuSpy = vi.fn(async () => ok(menuAnswer))
  ;(window as unknown as { nexus: unknown }).nexus = stubDialer({
    'view:loadValues': async () => VALUES,
    'views:save': async () => ({ ok: true, value: { id: 'view_1' } }),
    menu: menuSpy,
  })
  useSession.setState({
    tree: { collections: [], contexts: [], personalization: {}, nexus: { id: 'nx' } } as never,
    selection: { kind: 'none' } as never,
    renamingPath: null,
    tabs: [] as never,
    pinned: [] as never,
    mutate: mutateSpy as never,
    select: selectSpy as never,
  })
})
afterEach(() => {
  act(() => root.unmount())
  host.remove()
})

const card = (id: string): HTMLElement => host.querySelector(`[data-rid="${id}"]`) as HTMLElement
const titleIn = (id: string): HTMLElement => card(id).querySelector('.card-title') as HTMLElement
const portalButtons = (): HTMLButtonElement[] => [
  ...document.querySelectorAll<HTMLButtonElement>('[data-picker-portal] button'),
]
// The icon picker is the only seat here carrying a search field.
const iconSeats = (): number => document.querySelectorAll('[data-picker-portal] input').length
// A picker portals a shield alongside its pane; the pane is the half holding the options.
const openPanes = (): number =>
  [...document.querySelectorAll('[data-picker-portal]')].filter((e) => e.querySelector('button'))
    .length

const clickTitle = async (id: string, metaKey: boolean): Promise<void> => {
  const el = titleIn(id)
  document.elementFromPoint = () => el
  await act(async () => {
    el.dispatchEvent(new MouseEvent('click', { bubbles: true, metaKey }))
  })
}

const rightClick = async (id: string, answer: string | null): Promise<void> => {
  menuAnswer = answer
  await act(async () => {
    card(id).dispatchEvent(new MouseEvent('contextmenu', { bubbles: true }))
  })
  await act(async () => {})
}

describe('opening a card', () => {
  it('a title click selects the page; ⌘ sends it to a new tab', async () => {
    await renderView(root, source())
    await clickTitle('p1', false)
    // No second argument: the tab-open preference decides where a plain click lands.
    expect(selectSpy.mock.calls.at(-1)).toEqual([{ kind: 'page', id: 'p1', path: 'Col/One.md' }])

    selectSpy.mockClear()
    await clickTitle('p1', true)
    expect(selectSpy).toHaveBeenCalledWith(
      { kind: 'page', id: 'p1', path: 'Col/One.md' },
      { newTab: true },
    )
  })
})

describe('a card value', () => {
  it('a status click opens one picker at the root, and a pick writes the value', async () => {
    await renderView(root, source())
    await act(async () => {
      ;(card('p1').querySelector('.card-value') as HTMLElement).click()
    })
    expect(openPanes()).toBe(1)

    const complete = portalButtons().find((b) => b.textContent?.includes('Complete'))
    expect(complete).toBeTruthy()
    await act(async () => {
      complete?.click()
    })
    expect(mutateSpy).toHaveBeenCalledWith({
      op: 'setProperty',
      path: 'Col/One.md',
      propertyId: 'prop_status',
      value: { kind: 'select', value: 'complete' },
    })
  })
})

describe('the card menu', () => {
  it('offers Add Property while a blank addable property stands', async () => {
    await renderView(root, source())
    await rightClick('p1', null)
    const items = (menuSpy.mock.calls.at(-1)?.[0] as { items: Array<{ label: string }> }).items
    expect(items.map((i) => i.label)).toContain('Add Property')
  })

  it('answering Icon mounts the one root icon picker', async () => {
    await renderView(root, source())
    expect(iconSeats()).toBe(0)
    await rightClick('p1', 'title:icon')
    expect(iconSeats()).toBe(1)
  })

  it('answering New Page Below creates one seated after the anchor', async () => {
    await renderView(root, source())
    await rightClick('p1', 'title:newbelow')
    expect(mutateSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        op: 'createPage',
        parentPath: 'Col',
        order: ['p1', '$new-page', 'p2'],
      }),
      expect.any(Function),
    )
  })
})
```

`Core/Views/Cards/cardCreation.test.tsx`:

```tsx
// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import type { CollectionNode } from '@pommora/core/Nexus/tree'
import { GHOST_DWELL_MS } from '@pommora/uix/Interactions/ghostCreate'
import { ID_KEY } from '@pommora/core/Nexus/identityMark'
import { useSession } from '../../Session/store'
import { installViewEnvironment, renderView } from '../../Testing/viewHarness'
import { valuesReply } from '../../Testing/pageValues'
import { stubDialer } from '../../vitest.setup'

installViewEnvironment()

const source = (): CollectionNode =>
  ({
    kind: 'collection',
    id: 'col1',
    title: 'Col',
    path: 'Col',
    sets: [],
    pages: [
      { kind: 'page', id: 'p1', title: 'One', path: 'Col/One.md' },
      { kind: 'page', id: 'p2', title: 'Two', path: 'Col/Two.md' },
    ],
    properties: [],
    views: [
      {
        id: 'view_1',
        name: 'Cards',
        type: 'cards',
        property_order: ['_title'],
        hidden_properties: [],
        group: { kind: 'structural' },
      },
    ],
  }) as unknown as CollectionNode

const VALUES = valuesReply({ p1: { [ID_KEY]: 'p1' }, p2: { [ID_KEY]: 'p2' } })

let host: HTMLDivElement
let root: Root
let mutateSpy: ReturnType<typeof vi.fn>
let renameSpy: ReturnType<typeof vi.fn>

beforeEach(() => {
  host = document.createElement('div')
  document.body.appendChild(host)
  root = createRoot(host)
  mutateSpy = vi.fn(async (req: { op: string }, onCreated?: (c: unknown) => void) => {
    if (req.op === 'createPage') onCreated?.({ id: 'p3', path: 'Col/Untitled.md' })
    return true
  })
  renameSpy = vi.fn()
  ;(window as unknown as { nexus: unknown }).nexus = stubDialer({
    'view:loadValues': async () => VALUES,
    'views:save': async () => ({ ok: true, value: { id: 'view_1' } }),
    menu: async () => ({ ok: true, value: null }),
  })
  useSession.setState({
    tree: { collections: [], contexts: [], personalization: {}, nexus: { id: 'nx' } } as never,
    selection: { kind: 'none' } as never,
    renamingPath: null,
    mutate: mutateSpy as never,
    select: vi.fn(async () => {}) as never,
    beginRename: renameSpy as never,
  })
})
afterEach(() => {
  vi.useRealTimers()
  act(() => root.unmount())
  host.remove()
})

const card = (id: string): HTMLElement => host.querySelector(`[data-rid="${id}"]`) as HTMLElement
const ghost = (): HTMLElement | null => host.querySelector('.ghost-card')

// React derives enter/leave from pointerover/pointerout plus relatedTarget — a native pointerenter reaches nothing.
const hover = (el: HTMLElement, entering: boolean): void => {
  el.dispatchEvent(
    new MouseEvent(entering ? 'pointerover' : 'pointerout', {
      bubbles: true,
      relatedTarget: document.body,
    }),
  )
}
const tick = async (ms: number): Promise<void> => {
  await act(async () => {
    vi.advanceTimersByTime(ms)
  })
}

const dwellOn = async (id: string): Promise<void> => {
  await renderView(root, source())
  vi.useFakeTimers()
  await act(async () => {
    hover(card(id), true)
  })
  await tick(GHOST_DWELL_MS)
}

describe('the cards ghost — dwell, create, and exit', () => {
  it('a dwell over a card mounts the ghost beside it', async () => {
    await dwellOn('p1')
    expect(ghost()).toBeTruthy()
  })

  it('clicking the ghost creates a page below its anchor and opens the rename', async () => {
    await dwellOn('p1')
    await act(async () => {
      ghost()?.click()
    })
    expect(mutateSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        op: 'createPage',
        parentPath: 'Col',
        order: ['p1', '$new-page', 'p2'],
      }),
      expect.any(Function),
    )
    expect(renameSpy).toHaveBeenCalledWith('Col/Untitled.md', true, 'detail')
  })

  it('leaving the card past the grace closes the ghost out', async () => {
    await dwellOn('p1')
    await act(async () => {
      hover(card('p1'), false)
    })
    // The ghost owns the only armed timers here: its grace, then its exit beat.
    await act(async () => {
      vi.runAllTimers()
    })
    expect(ghost()).toBeNull()
  })
})
```

**VERIFY**

- [ ] `npx vitest run Core/Views/Cards/` → 3 files, 11 tests pass.
- [ ] Each suite goes red with its change reverted: `cardDrops` "moves the page into the Set at the slot it landed on" with `relocate`'s `sibBefore` forced to `null` (the order flips to `['p2', 'p1']`); `cardGestures` "answering Icon mounts the one root icon picker" with `{interactions.iconPicker}` removed from the root; `cardCreation` "clicking the ghost creates a page below its anchor and opens the rename" with the policy's `rename` made a no-op. Restore each.

#### Task 3.3

**TASK:** Rewrite the sentences Phase 3 makes false in the Cards sections of the view-types doc.

**FILES:** `.claude/Features/ViewTypesPM.md`.

**NOW**

§Properties on Cards: "The value and add pickers mount at the grid level, so an open picker survives row churn." §Drag & Menus: "Cards reorder within their band by displacement, writing the view's `manual_order` the pipeline reads as its lowest-priority tiebreaker; two effective sort criteria or a Location sort retire it. A card dropped across location bands moves the page into that band's Set at its landing slot."

**CHANGE**

- [ ] §Properties on Cards: name all four grid-level seats.
- [ ] §Drag & Menus: say where the drop is routed.

**AFTER**

> The value, add, icon, and image pickers mount at the grid level, so an open picker survives row churn and a card carries no picker of its own.

> Cards reorder within their band by displacement; the card engine reports the landing index, the view turns it into the shared `{ activeId, toZone, beforeId }` drop, and the interactions hook writes the view's `manual_order` the pipeline reads as its lowest-priority tiebreaker; two effective sort criteria or a Location sort retire it. A card dropped across location bands moves the page into that band's Set at its landing slot through the same route.

**VERIFY**

- [ ] `grep -n "The value and add pickers mount" .claude/Features/ViewTypesPM.md` → no output.

#### Review Checkpoint

- [ ] `npm run typecheck` · `npm run test` · `npm run lint` all green; three Cards suites exist and pass; `manualOrderDrops.test.tsx` unchanged and green.
- [ ] `grep -c "useSession(" Core/Views/Cards/CardsView.tsx` → 7; `grep -c "<IconChoice\|<ImagePicker" Core/Views/Cards/CardsView.tsx` → 1 (the image seat; the icon seat is the hook's).
- [ ] Nathan drives, in a Cards view: (1) drop a card across two location bands at a slot; (2) right-click a card → Edit Icon, then another card → Edit Icon — one picker each time; (3) right-click a cover → Edit Image, and Edit Image from the card menu; (3b) on a card with no cover, right-click the thumb → Add, pick an image — the crop editor opens showing the new image, and saving keeps it; (4) hover a card for the ghost, click it — the new card opens its rename field and neighbors glide into place; (5) a Set card's right-click cover menu; (6) drag a Set card.

### Phase 4 — The Ledger

**GOAL:** Close the audit's topic 6 the way the report's own rules say to, correct its two engine claims the scouts overturned, and carry the arc into the context and history documents.

#### Task 4.1

**TASK:** Remove the four closed findings and their topic from the audit report, restate the two claims the search corrected, and update the context document and history.

**FILES:** `.claude/Planning/Codebase Audit — Report.md`, `.claude/ContextPM.md`, `.claude/HistoryPM.md`.

**NOW**

The report carries topic 6 (`##### 6. The Table/Cards View Engine`, its Found paragraph, four Change items, and `**Findings:** R-32, R-33, R-35, R-36`), ledger rows R-32, R-33, R-35, R-36, the Verdict clause "every new view kind is written a third time", the Where Brainwaves row "The state-placement plan (ruled, still unbuilt) and folding the Table and Cards renderers onto one engine (Topic 6) before a third view kind is written a third time.", the Grounding bullet "`Core/Views/Pipeline`: finished work. `Core/Views/Table` and `Core/Views/Cards`: two prototypes past 1,300 lines each, a rework target, not a risk.", topic 8's Found sentence "And reordering by dragging is implemented twice behind one façade, the larger version serving exactly one screen, carrying no keyboard support, and having no tests.", topic 8's Change item 2 "Fold cross-zone support into the single-zone engine as a zone registry; retire the second engine. Cards gains keyboard dragging for free. *(L; ~350–450 lines)*", and D-9's first bullet "Which slot a page lands in when moved across bands (Table appends, Cards lands at the drop slot, neither documented as intentional)." `ContextPM.md`'s second paragraph orders the work "…then the ruled foundation work of folding the Table and Cards renderers onto one engine; then building on the openings whose plumbing exists." `HistoryPM.md`'s newest entry is PM-135.

**CHANGE**

- [ ] Delete the four ledger rows; delete topic 6 whole; renumber nothing (the report keeps its gaps).
- [ ] Verdict: "…every new hover control lengthens the touch backlog. Deferral has a linear price."
- [ ] Where Brainwaves, the ~55% row: "The state-placement plan (ruled, still unbuilt)."
- [ ] Grounding: "`Core/Views/Pipeline` and `Core/Views/Host`: finished work; the renderers draw presentation over one interaction layer."
- [ ] Topic 8 Found: "And reordering by dragging is implemented twice behind one façade, the larger version serving exactly one screen and carrying no keyboard support, while the single-zone engine serving the other twelve call sites has no DOM test of its own."
- [ ] Topic 8 Change 2: "Fold cross-zone support into the single-zone engine as a zone registry and retire the second. The fold is three axes — the registry, the collision model, and the overlay presentation — and cross-zone keyboard is its own step after it; the views consume one drop contract, so the fold touches only Cards' adapter. *(L; −200 to −400 lines)*"
- [ ] D-9: delete the first bullet.
- [ ] Grep the report for `R-32`, `R-33`, `R-35`, `R-36`, `Topic 6`, `TableView.tsx`, `CardsView.tsx`, `third time` and confirm no residue outside Appendix B's method note.
- [ ] `ContextPM.md`: "…then building on the openings whose plumbing exists." — and add one sentence to Current Focus naming the shared interaction layer as the foundation a List view now builds on, per `~/The Studio/.claude/references/Context-Format.md`.
- [ ] `HistoryPM.md`: index row and entry PM-136 "The View Engine" per `~/The Studio/.claude/references/History-Format.md`: what changed (the hook, the drop contract, the column module, the picker seats, the Cards suites, the retired modules), the commit range, and the diff from the closeout's Actionable Difference.

**AFTER**

The report reads with topics 1, 2, 8, 9, 11 and a 16-row ledger; the two D-9 rulings that remain open are unchanged; `ContextPM.md` and `HistoryPM.md` carry the arc as described.

**VERIFY**

- [ ] `grep -n "R-32\|R-33\|R-35\|R-36\|Topic 6\|third time\|keyboard dragging for free\|Which slot a page lands" ".claude/Planning/Codebase Audit — Report.md"` → no output.
- [ ] `grep -c "^| R-" ".claude/Planning/Codebase Audit — Report.md"` → 16.
- [ ] `grep -n "PM-136" .claude/HistoryPM.md | wc -l` → 2 (index row and entry heading).

### Completion Criteria

**Conformance**

- [ ] No duplicated mechanism: `grep -rn "hoverGlance(" Core/Views` → only `useViewInteractions.tsx`; `grep -rn "runPageSendAction\|confirmDelete\|isOpenInTabs" Core/Views` → only `useViewInteractions.tsx`; `grep -rn "findCollectionForSet" Core/Views` → `useViewInteractions.tsx` and the two Settings readers that predate this plan (`ViewMenu.tsx`, `SettingsFrame.tsx`); `grep -rn "getPropertyValue('zoom')\|getComputedStyle(.*).zoom" Core UIX` → only `UIX/Utilities/zoom.ts`.
- [ ] No renderer imports the other's folder: `grep -rn "Views/Cards\|Views/Table" Core/Views/Host` → no output.
- [ ] Nothing changed outside what the plan named: `git diff --name-only <baseline>..HEAD` lists only the FILES of the tasks above.
- [ ] No new comment restates what its code shows; no new text uses seam, flavor, or load-bearing (`grep -rn "seam\|flavor\|load-bearing" <changed files>` → only pre-existing lines the plan did not touch).

**Correctness**

- [ ] A Table row dropped across two location bands between two rows lands between them (Nathan's hand check, Phase 2).
- [ ] ⌘-click on a Table title opens a new tab (hand check); `cellGestures.test.tsx` gains one assertion for it in Task 2.3.
- [ ] A Cards card dropped across bands lands at its slot, and the same drop under property grouping rewrites the value (`cardDrops.test.tsx`).
- [ ] One icon picker and one image picker exist in a Cards view regardless of card count (`cardGestures.test.tsx` counts `[data-picker-portal]` before and after).
- [ ] Both renderers' band drags, ghost creates, and title menus behave as before (hand checks, both phases); a plain click on a card follows the Tab Open Behavior preference (`cardGestures.test.tsx` asserts `select` is called with no options).

**Completeness**

- [ ] Every task ticked; no scaffolding, debug output, or unauthorized TODO in `<baseline>..HEAD`; the five retired files and their three tests are gone; the six new files exist.

**Confirmation**

- [ ] Every verification result read; each new Cards suite goes red when its CardsView change is reverted (Task 3.2 VERIFY names the reverts).
- [ ] User: the Phase 2 and Phase 3 hand-check lists, each item confirmed in Nathan's own words.

**Continuity**

- [ ] Reconciliation complete; `ViewTypesPM.md`, `PommoraDND.md`, the audit report, `ContextPM.md`, and `HistoryPM.md` read true; Deviations each fixed or ruled on.

**Confidence**

- [ ] Gates green from clean on `<baseline>..HEAD`; every Baseline count moved as stated.
- [ ] Diff size as the plan states: the ledger total moves from 69411 to 69368 (−43 non-blank, non-comment, non-test lines); a different figure is reported in Deviations, not tidied.

### Final Verification

**THE STANDARD:** The work is finished when a later review of it finds nothing to correct. Not just doing the chores — doing the laundry, folding it, picking up what fell out of the hamper, emptying the lint trap, leaving no trace that anything went wrong. Nothing is carried as a concern, nothing is deferred where the fix is known, and nothing is declared that wasn't watched happen. Where something genuinely couldn't get there, the report names which and why, and everything else is still finished. Ambiguity met during execution took the simplest reading and was recorded; it didn't stop the run. Edits found in adjacent files that no task made belong to the user — folded into the commit at hand, not reverted.

- [ ] Phase review dispatched: Phase 1 · Phase 2 · Phase 3 · Phase 4 (two Opus reviewers per phase: one to break it, one to simplify it; scoped to the phase's commit range and FILES; briefed with the tasks, Constraints, the audit's topic 6, and the rulings under Open Items)
- [ ] All findings fixed or ruled on
- [ ] Neutral verification passed on `<baseline commit>..HEAD`
- [ ] Final pass: gates · baseline · diff · deviations · criteria
- [ ] Reconciliation walked; living documents read
- [ ] Report delivered

#### Reconciliation

- `.claude/Features/ViewTypesPM.md` — "A renderer contributes presentation plus a four-field seam … so a renderer never switches on a view's type." — Task 2.4
- `.claude/Features/ViewTypesPM.md` — "except a Cards view over a container with Sets … so it always mounts. A new renderer mounts the host and writes presentation only." — Task 2.4
- `.claude/Features/ViewTypesPM.md` — "Widths are per-type `{min, default, max}` from one source (`columnWidths.ts`)" — Task 2.4
- `.claude/Features/ViewTypesPM.md` — "the title navigates" (no ⌘ behavior stated) — Task 2.4
- `.claude/Features/ViewTypesPM.md` — "The value and add pickers mount at the grid level" — Task 3.3
- `.claude/Features/ViewTypesPM.md` — "Cards reorder within their band by displacement, writing the view's `manual_order`" — Task 3.3
- `.claude/Features/PommoraDND.md` — "a `bounds` clamp, a `modifiers` escape hatch, `swap` mode … a `pending` state" — Task 2.4
- `.claude/Features/PommoraDND.md` — "the handle role is `button` by default, settable to `null`" — Task 2.4
- `.claude/Planning/Codebase Audit — Report.md` — topic 6, R-32/R-33/R-35/R-36, "every new view kind is written a third time", the ~55% row, the Grounding bullet, topic 8's "having no tests" and "keyboard dragging for free", D-9's first bullet — Task 4.1
- `.claude/ContextPM.md` — "folding the Table and Cards renderers onto one engine" — Task 4.1
- `.claude/HistoryPM.md` — PM-136 — Task 4.1
- `Core/Views/Table/TableView.tsx`, comment "Local column layers stay OUT of `liveView` — a resize must not re-run the pipeline." — moves with the layer into `useColumns.ts` — Task 2.2
- `UIX/Interactions/tableDnd.tsx`, comment "The group key maps a structural group to its on-disk container for the page_order write." — replaced by the `onDrop` doc line — Task 2.1
- `.claude/Guidelines/Development-Environment.md` — "Pass `itemRole` to `SortableZone` instead of overriding after the spread." — Task 1.3

#### Report & Closure

The orchestrator writes the report in the shape the planning skill prescribes (feature, phase by phase, verification, deviations, open items, diff with START → END, closing) once phase review is closed, neutral verification has passed on the full range, the final pass is ticked, and every reconciliation entry has been opened and read.

### Open Items

- **The line count.** The mandate asked for a net-negative tree; the draft this plan was drawn from measures −43 on the project ledger, most of it structural (listed under Baseline). One further cut was left out as marginal: folding `alignFor`'s one-line wrapper into its single caller (−8, breaks a test's named import).
- Whether `useBannerMenu` should take a call-time owner instead of the request-state-plus-effect seat Cards adopts in Task 3.1. The seat needs no signature change and matches how Cards already opens its value pickers; a call-time owner would touch six consumers for the same result. Ruled for the seat unless Nathan says otherwise.
- The settle-gate duplication between `engine.tsx` and `group.tsx` (audit R-52's one genuine twin inside UIX) is left for the engine-fold arc; a shared gate nets six lines against two untested hot paths.

### Deviations

