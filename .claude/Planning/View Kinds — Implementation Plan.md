## View Kinds — Implementation Plan

> **Status:** Ratified · Source: Nathan's direction of 09-10-2026 over `Codebase Audit — Report.md` Topic 6 (R-34, D-6, and the re-flatten half of R-36) · Three phases · Written per Writing-Plans-V3.

### Context

Six view kinds are declared once as `VIEW_TYPES` in `Core/Views/views.ts`, and that tuple already drives the `ViewType` union and the sidecar codec. Nothing else can read it because it isn't exported, so the kind set is hand-copied in five more places: the picker's tile order, its icon map, its "implemented" set, a test fixture of the icon map, and five sites that fall back to the Table glyph whatever the kind. Eight sites branch on the kind: the renderer seat in `ViewHost.tsx`, four settings branches that all ask the same question the seat already answers as `flattenStructural`, two per-kind option surfaces, and one bug where the flat Settings door tests `=== 'table'` while the Layout leaf tests `=== 'cards'`. Beside this, `CardsView.tsx` re-walks the resolved group tree at seven sites for a per-band row list, while `TableView.tsx` builds the same painted-order list once and the host already walks the same tree for its row maps.

This plan folds the kind set onto one registry in `views.ts` that owns each kind's label, icon, and structural flatness, exports the renderer map from the seat, and gives the host one painted-order row list both renderers read. It leaves the two renderers' interaction layers, their drag engines, the Cards picker mounts, the Cards test suites, and virtualization to later plans; the Table Flatten setting stays pending. Nothing in `Core/Views/Pipeline`, any stylesheet, `Core/Actions`, or `Core/Navigation` is touched.

### Summary

The app knows six kinds of view (Table, Cards, List, Gallery, Calendar, Timeline) but only two are built. Today that list is copied by hand in several files, so each copy can drift, and a view whose icon was never set draws a table icon even when it's a Cards view. After this plan, one list in one file says what each kind is called, which icon it uses, and whether it lays its groups flat; every screen that needs that reads it from there. The four unbuilt kinds stay in the picker exactly as they look today and stay unselectable; a view that somehow carries an unbuilt kind falls back to Table, the default kind. The Cards renderer also stops re-computing a row list the host already has. The result is fewer lines, one fewer test fixture, one bug fixed, and no visible change beyond the icon fix.

#### Constraints

- **Gates:** `npm run typecheck` · `npm run test` · `npm run lint` — each exits 0; the test summary reads `Test Files N passed (N)` and `Tests N passed (N)`. Run with `set -o pipefail` when piped.
- **Rulings (09-10-2026):** the four unbuilt tiles stay inert and visually unchanged; a view carrying an unbuilt kind seats the Table renderer, since Table is the default kind; `flat` is per-kind for this plan, with Table Flatten still pending and noted as such on the table entry; the registry is the one source for names and icons.
- **`views.ts` stays React-free.** It is reached from `Core/Contract/serve.ts` through `Core/Nexus/schemas.ts`, and `Core/Contract/engineGraph.test.ts` asserts that graph reaches no `.tsx` and only four UIX files. The registry's `icon` is a plain `string`; anything that resolves an icon at runtime lives on the renderer side.
- **Behavior baseline:** every drop, reorder, relocation, creation, and menu behavior of both renderers is unchanged, proven by the existing suites (`manualOrderDrops.test.tsx`, `bandCommits.test.tsx`, `cellGestures.test.tsx`, `useViewHost.test.tsx`) passing untouched. The only visible changes are the three named: an icon-less view draws its kind's glyph, a view of an unbuilt kind shows the Table switches in the flat Settings door, and the picker tiles' accessible names read Title-Case (`Cards`, not `cards`).
- **Never delete:** `Core/Views/Table/*`, `Core/Views/Cards/*`, `Core/Views/Pipeline/*`, `Core/Views/Bands/*`, and every test file — this plan edits and removes lines inside files; it removes no file.
- **Comment discipline:** `//` full-line comments only; the one comment this plan adds is the Table Flatten note on the table entry. Nothing else the code shows is commented.
- **Formatting:** Biome formats every TS write through the PostToolUse hook; an Edit failing on whitespace means re-read and retry.
- **Out of scope everywhere:** the interaction-layer fold, `tableDnd.tsx`'s commit shape, the drift rulings (structural reorder payload, ⌘-click, URL click, relocate landing), Cards picker hoisting, Cards suites, virtualization, `Showcase/`.

#### Baseline

- Gates: green at `a5232d67b` — 362 test files, 4400 tests.
- `grep -rn "iconNameOr(v.icon, 'table')\|iconNameOr(view.icon, 'table')" Core --include='*.ts' --include='*.tsx'` → 5 — retires to 0
- `grep -rn "TYPE_ORDER\|TYPE_GLYPH\|IMPLEMENTED" Core/Views --include='*.ts' --include='*.tsx'` → 7 lines — retires to 0
- `grep -rn "view.type ===\|view.type !==" Core/Views Core/Tiles --include='*.tsx' | grep -v '\.test\.' | wc -l` → 8 — becomes 2 (the `cards` const in `LayoutFrame`, the Set Cards chrome test in `ViewHost`)
- `grep -c "flattenGroups" Core/Views/Cards/CardsView.tsx` → 8 — retires to 0
- `grep -c "rowPath" Core/Views/Table/TableView.tsx` → 5 — retires to 0
- `wc -l Core/Views/Cards/CardsView.tsx` → 1359 — decreases
- `wc -l Core/Views/Table/TableView.tsx` → 1438 — decreases
- `wc -l Core/Views/viewIcon.test.ts` → 28 — decreases

**START:** 2026-09-10T21:25:28Z
**END:** <same command, run as the report is given>

#### Implementation Process

- [ ] **Phase 1** — The Registry
  - [x] Task 1.1 — The registry in `views.ts`
  - [x] Task 1.2 — The seat reads the registry
  - [x] Task 1.3 — One glyph resolver
  - [x] Task 1.4 — The picker and the flatness reads
  - [ ] Review Checkpoint
- [ ] **Phase 2** — The Host Row List
  - [ ] Task 2.1 — `paintOrder` on the host
  - [ ] Task 2.2 — Cards reads the host
  - [ ] Task 2.3 — Table reads the host
- [ ] **Phase 3** — The Record
  - [ ] Task 3.1 — Features
  - [ ] Task 3.2 — The audit ledger, Context, and History

Phases 1 and 2 share no file, but Phase 1's VERIFY runs the suites that render Phase 2's files, so they run in sequence in one working tree rather than in two worktrees.

### Phase 1 — The Registry

**GOAL:** The kind set is exported once and every reader of a kind's name, icon, renderer, or flatness reads the registry beside it. Separate from Phase 2 because it shares no file with the host row list and is the surface Nathan looks at.

#### Task 1.1

**TASK:** Export the kind tuple, add the default-kind constant and the per-kind registry beside it, and make the codec's catches and the minted default read them.

**FILES:** `Core/Views/views.ts`, `Core/Views/views.test.ts`

**DEPENDENCIES:** Tasks 1.2 through 1.4 and Phase 3 read `VIEW_TYPES`, `VIEW_KINDS`, and `DEFAULT_VIEW_TYPE` introduced here.

**NOW**

```ts
const VIEW_TYPES = ['table', 'cards', 'list', 'gallery', 'calendar', 'timeline'] as const
export type ViewType = (typeof VIEW_TYPES)[number]
```

```ts
  name: z.string().catch('Table'),
  icon: z.string().optional(),
  color: z.string().optional(),
  type: z.enum(VIEW_TYPES).catch('table'),
```

```ts
export function mintNewView(name: string, schema: PropertyDefinition[]): SavedView {
  return {
    id: DEFAULT_VIEW_ID,
    name,
    icon: 'table',
    type: 'table',
    group: { kind: 'structural' },
    property_order: [RESERVED_PROPERTY_ID.title],
    hidden_properties: schema.map((d) => d.id),
  }
}

export function mintDefaultView(schema: PropertyDefinition[]): SavedView {
  return mintNewView('Table', schema)
}
```

**CHANGE**

- [ ] Export `VIEW_TYPES`.
- [ ] Add `DEFAULT_VIEW_TYPE` and the `ViewKind` interface with `VIEW_KINDS: Record<ViewType, ViewKind>` directly under the type, carrying `label`, `icon`, and `flat` for all six kinds. The icon strings are the six from `LayoutFrame.tsx`'s `TYPE_GLYPH` today: `table`, `cards-grid`, `list-rounded`, `layout-dashboard`, `calendar-days`, `chart-gantt`. Cards is the only `flat: true`. The table entry carries the one comment this plan adds.
- [ ] The `name` catch reads `VIEW_KINDS[DEFAULT_VIEW_TYPE].label`; the `type` catch reads `DEFAULT_VIEW_TYPE`.
- [ ] `mintNewView` reads its icon and type from the registry and the constant; `mintDefaultView` reads its name from the registry.
- [ ] In `views.test.ts`, the existing "coerces an unknown type to table" case asserts `DEFAULT_VIEW_TYPE` instead of the literal; no new test.

**AFTER**

```ts
export const VIEW_TYPES = ['table', 'cards', 'list', 'gallery', 'calendar', 'timeline'] as const
export type ViewType = (typeof VIEW_TYPES)[number]
export const DEFAULT_VIEW_TYPE: ViewType = 'table'

export interface ViewKind {
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

```ts
  name: z.string().catch(VIEW_KINDS[DEFAULT_VIEW_TYPE].label),
  icon: z.string().optional(),
  color: z.string().optional(),
  type: z.enum(VIEW_TYPES).catch(DEFAULT_VIEW_TYPE),
```

```ts
export function mintNewView(name: string, schema: PropertyDefinition[]): SavedView {
  return {
    id: DEFAULT_VIEW_ID,
    name,
    icon: VIEW_KINDS[DEFAULT_VIEW_TYPE].icon,
    type: DEFAULT_VIEW_TYPE,
    group: { kind: 'structural' },
    property_order: [RESERVED_PROPERTY_ID.title],
    hidden_properties: schema.map((d) => d.id),
  }
}

export function mintDefaultView(schema: PropertyDefinition[]): SavedView {
  return mintNewView(VIEW_KINDS[DEFAULT_VIEW_TYPE].label, schema)
}
```

**VERIFY**

- [ ] Check the work for unnecessary code or obvious mistakes.
- [ ] `npm run typecheck` and `npx vitest run Core/Views/views.test.ts Core/Contract/engineGraph.test.ts` pass; the engine-graph suite still lists no `.tsx` and the same four UIX files.
- [ ] `grep -c "'table'" Core/Views/views.ts` → 3 (the tuple, `DEFAULT_VIEW_TYPE`, and the table entry's icon); `grep -c "catch('table')\|type: 'table'" Core/Views/views.ts` → 0.

#### Task 1.2

**TASK:** ViewHost seats a renderer from an exported map keyed by kind, falling back to Table, and passes the kind's `flat` to the host instead of a Cards test.

**FILES:** `Core/Views/Host/ViewHost.tsx`

**DEPENDENCIES:** Reads Task 1.1's exports; Task 1.4 reads `VIEW_RENDERERS` introduced here.

**NOW**

```tsx
export function ViewHost({ source }: { source: CollectionNode | SetNode }): React.JSX.Element {
  // Only the type and scale are needed to seat a renderer, and a minted default is a table whatever the schema — so the seat skips the schema walk the host performs.
  const view = useActiveView(source, NO_SCHEMA)
  const isCards = view.type === 'cards'
  // An embedded tile states its own size, so in a tile scope the factor stays 1 and never compounds with the embed zoom.
  const scale = useViewTileScope() ? 1 : coerceScale(view.view_scale, 1)
  const upward = useRef<ViewHostApi['seam']>({ … }).current
  const host = useViewHost(source, isCards, upward)
  // Cards' set cards render independently of the pipeline, so a cards view with Sets present always mounts.
  const setChrome = isCards && (source.sets?.length ?? 0) > 0
  if (!host) return <div className="view-empty">Loading…</div>
  if (host.groups.length === 0 && !setChrome) return <div className="view-empty">No pages here</div>
  return (
    <div style={scale === 1 ? undefined : { zoom: scale }}>
      {isCards ? <CardsView host={host} /> : <TableView host={host} />}
    </div>
  )
}
```

**CHANGE**

- [ ] Add and export `VIEW_RENDERERS`, a `Partial<Record<ViewType, (p: { host: ViewHostApi }) => React.JSX.Element>>` holding `table: TableView` and `cards: CardsView`; the map is the one statement of which kinds are built.
- [ ] Replace `isCards` with `const Renderer = VIEW_RENDERERS[view.type] ?? TableView`. The fallback names `TableView` directly rather than indexing the map by `DEFAULT_VIEW_TYPE`, which would need a non-null assertion; the ruling that Table is the fallback is stated here by the name.
- [ ] Pass `VIEW_KINDS[view.type].flat` to `useViewHost`. The flatness follows the view's own kind, which is what every settings pane reads after Task 1.4, so the seat and the panes agree.
- [ ] `setChrome` keeps its Cards test as `view.type === 'cards'`: Set Cards are a Cards feature, not a flatness consequence.
- [ ] Render `<Renderer host={host} />`.

**AFTER**

```tsx
export const VIEW_RENDERERS: Partial<
  Record<ViewType, (p: { host: ViewHostApi }) => React.JSX.Element>
> = { table: TableView, cards: CardsView }

export function ViewHost({ source }: { source: CollectionNode | SetNode }): React.JSX.Element {
  // Only the type and scale are needed to seat a renderer, and a minted default is a table whatever the schema — so the seat skips the schema walk the host performs.
  const view = useActiveView(source, NO_SCHEMA)
  const Renderer = VIEW_RENDERERS[view.type] ?? TableView
  // An embedded tile states its own size, so in a tile scope the factor stays 1 and never compounds with the embed zoom.
  const scale = useViewTileScope() ? 1 : coerceScale(view.view_scale, 1)
  const upward = useRef<ViewHostApi['seam']>({ … }).current
  const host = useViewHost(source, VIEW_KINDS[view.type].flat, upward)
  // Cards' set cards render independently of the pipeline, so a cards view with Sets present always mounts.
  const setChrome = view.type === 'cards' && (source.sets?.length ?? 0) > 0
  if (!host) return <div className="view-empty">Loading…</div>
  if (host.groups.length === 0 && !setChrome) return <div className="view-empty">No pages here</div>
  return (
    <div style={scale === 1 ? undefined : { zoom: scale }}>
      <Renderer host={host} />
    </div>
  )
}
```

**VERIFY**

- [ ] Check the work for unnecessary code or obvious mistakes.
- [ ] `grep -c "isCards" Core/Views/Host/ViewHost.tsx` → 0.
- [ ] `npx vitest run Core/Views/Host Core/Views/manualOrderDrops.test.tsx Core/Views/Table` passes untouched, including "a cards view with Sets present mounts the renderer".

#### Task 1.3

**TASK:** `viewIcon.ts` becomes the one renderer-side resolver for a view's glyph, reading the registry; the icon-map parameter goes, the test fixture goes, and the five glyph fallbacks read the resolver.

**FILES:** `Core/Views/viewIcon.ts`, `Core/Views/viewIcon.test.ts`, `Core/Views/Settings/ViewFrame.tsx`, `Core/Views/Settings/ViewMenu.tsx`, `Core/Views/Settings/SettingsFrame.tsx`, `Core/Tiles/TileHost.tsx`, `Core/Tiles/Surfaces/ViewTile.tsx`

**DEPENDENCIES:** Reads Task 1.1's `VIEW_KINDS`; Task 1.4 reads the new `iconForTypeSwitch` signature.

**NOW**

```ts
export function iconForTypeSwitch(
  currentIcon: string | undefined,
  oldType: ViewType,
  newType: ViewType,
  glyphOf: Record<ViewType, IconName>,
): IconName | undefined {
  const wasDefault = currentIcon === undefined || currentIcon === glyphOf[oldType]
  return wasDefault ? glyphOf[newType] : undefined
}
```

The five fallback sites each read `iconNameOr(v.icon, 'table')` (or `view.icon`): `ViewFrame.tsx` in the view rows, `ViewMenu.tsx` on the dropdown, `SettingsFrame.tsx` on the inline header when scoped, `TileHost.tsx` in `viewPickerItems`, and `ViewTile.tsx`'s local `viewIcon` const used at four sites. The test carries a six-entry `GLYPH` fixture copying the icon map.

**CHANGE**

- [ ] Add `viewGlyph(view: Pick<SavedView, 'icon' | 'type'>): string` returning `asRenderableIcon(view.icon) ?? VIEW_KINDS[view.type].icon` (import `asRenderableIcon` from `@pommora/uix/Symbols`).
- [ ] `iconForTypeSwitch(view: Pick<SavedView, 'icon' | 'type'>, newType: ViewType): string | undefined` reads the registry for both the old and new glyph; the `glyphOf` parameter and the `IconName` import go. The two stay separate functions: `viewGlyph` treats a non-renderable icon string as absent, while a kind switch must treat it as custom and leave it alone.
- [ ] Each of the five sites calls `viewGlyph(v)` (or `viewGlyph(view)`) in place of the `iconNameOr(…, 'table')` expression; `ViewTile.tsx`'s local `viewIcon` const is deleted and its four call sites read `viewGlyph`. Drop the `iconNameOr` import from any file where it has no other reader.
- [ ] Rewrite `viewIcon.test.ts` without the fixture: the three existing `iconForTypeSwitch` cases on the new signature, plus one `viewGlyph` case: an icon-less `cards` view resolves to `cards-grid`, a view carrying `'star'` resolves to `'star'`.

**AFTER**

```ts
import { asRenderableIcon } from '@pommora/uix/Symbols'
import { type SavedView, VIEW_KINDS, type ViewType } from '@pommora/core/Views/views'

type Glyphed = Pick<SavedView, 'icon' | 'type'>

export const viewGlyph = (view: Glyphed): string =>
  asRenderableIcon(view.icon) ?? VIEW_KINDS[view.type].icon

export function iconForTypeSwitch(view: Glyphed, newType: ViewType): string | undefined {
  const wasDefault = view.icon === undefined || view.icon === VIEW_KINDS[view.type].icon
  return wasDefault ? VIEW_KINDS[newType].icon : undefined
}
```

**VERIFY**

- [ ] Check the work for unnecessary code or obvious mistakes; no file still imports `iconNameOr` without using it.
- [ ] `grep -rn "iconNameOr(v.icon, 'table')\|iconNameOr(view.icon, 'table')" Core --include='*.ts' --include='*.tsx'` → 0.
- [ ] `grep -rn "viewGlyph(" Core --include='*.tsx' | wc -l` → 8 (ViewFrame, ViewMenu, SettingsFrame, TileHost, ViewTile ×4).
- [ ] `npx vitest run Core/Views/viewIcon.test.ts Core/Views/Settings Core/Tiles` passes.
- [ ] User confirms: a view whose sidecar has no `icon` key draws its kind's glyph in the View menu and the view list, not the table glyph.

#### Task 1.4

**TASK:** LayoutFrame's picker maps the exported tuple, labels its tiles from the registry, gates a tile by the renderer map, and computes its per-kind switch list once; the three module-level hand-lists go; the four flatness questions across the settings panes read the kind's `flat`.

**FILES:** `Core/Views/Settings/LayoutFrame.tsx`, `Core/Views/Settings/GroupFrame.tsx`, `Core/Views/Settings/SortFrame.tsx`, `Core/Views/Settings/SettingsFrame.tsx`

**DEPENDENCIES:** Reads Task 1.1's `VIEW_TYPES` and `VIEW_KINDS`, Task 1.2's `VIEW_RENDERERS`, Task 1.3's `iconForTypeSwitch`.

**NOW**

```ts
const TYPE_ORDER: ViewType[] = ['table', 'cards', 'list', 'gallery', 'calendar', 'timeline']
const TYPE_GLYPH: Record<ViewType, IconName> = {
  table: 'table',
  cards: 'cards-grid',
  list: 'list-rounded',
  gallery: 'layout-dashboard',
  calendar: 'calendar-days',
  timeline: 'chart-gantt',
}
const IMPLEMENTED: ReadonlySet<ViewType> = new Set(['table', 'cards'])
```

```tsx
  const setType = (type: ViewType): void => {
    if (type === view.type) return
    const icon = iconForTypeSwitch(view.icon, view.type, type, TYPE_GLYPH)
    write(icon ? { type, icon } : { type })
  }
```

```tsx
      {TYPE_ORDER.map((t) => (
        <button
          key={t}
          type="button"
          className={cx(vs.tile, t === view.type && vs.tileSelected)}
          aria-label={t}
          onClick={() => IMPLEMENTED.has(t) && setType(t)}
        >
          <Icon name={TYPE_GLYPH[t]} size="titleMedium" />
        </button>
      ))}
```

In `LayoutFrame.tsx` the Layout leaf tests `view.type === 'cards'` to choose `CARD_SWITCHES` over the `VisibilityList` with `TABLE_SWITCHES`; the flat door tests `view.type === 'table'` to choose `TABLE_SWITCHES` over `CARD_SWITCHES`; the footing tests `view.type === 'cards'`; the `GroupFrame` it renders takes `subGrouping={view.type !== 'cards'}`. `GroupFrame.tsx` prepends its None row and `SortFrame.tsx` its Location sort under `view.type === 'cards'`; `SettingsFrame.tsx` passes `subGrouping={view.type !== 'cards'}`.

**CHANGE**

- [ ] `LayoutFrame.tsx`: delete `TYPE_ORDER`, `TYPE_GLYPH`, and `IMPLEMENTED`; drop the `IconName` type import if nothing else in the file reads it.
- [ ] `setType` calls `iconForTypeSwitch(view, type)`.
- [ ] The grid maps `VIEW_TYPES`; `aria-label={VIEW_KINDS[t].label}`; `onClick={() => t in VIEW_RENDERERS && setType(t)}`; the glyph is `VIEW_KINDS[t].icon`.
- [ ] Declare `const cards = view.type === 'cards'` and `const switches = cards ? CARD_SWITCHES : TABLE_SWITCHES` once after `saveView`; the footing and the Layout leaf read `cards`; the Layout leaf's `VisibilityList` footer and the flat door both read `switches`, which fixes the flat door's inverted test.
- [ ] `subGrouping={!VIEW_KINDS[view.type].flat}` on the `GroupFrame` in `LayoutFrame.tsx` and in `SettingsFrame.tsx`.
- [ ] `GroupFrame.tsx`: the None row is offered when `VIEW_KINDS[view.type].flat`; `SortFrame.tsx`: the Location sort is offered when `VIEW_KINDS[view.type].flat`.

**AFTER**

```tsx
  const cards = view.type === 'cards'
  const switches = cards ? CARD_SWITCHES : TABLE_SWITCHES
  const setType = (type: ViewType): void => {
    if (type === view.type) return
    const icon = iconForTypeSwitch(view, type)
    write(icon ? { type, icon } : { type })
  }
```

```tsx
      {VIEW_TYPES.map((t) => (
        <button
          key={t}
          type="button"
          className={cx(vs.tile, t === view.type && vs.tileSelected)}
          aria-label={VIEW_KINDS[t].label}
          onClick={() => t in VIEW_RENDERERS && setType(t)}
        >
          <Icon name={VIEW_KINDS[t].icon} size="titleMedium" />
        </button>
      ))}
```

```tsx
      ) : (
        <ViewSwitches source={source} view={view} switches={switches} separated />
      )}
```

```ts
  const groupByOptions: PickerOption<string>[] = [
    ...(VIEW_KINDS[view.type].flat
      ? [{ value: 'none', label: 'None', icon: 'circle-off' as const }]
      : []),
```

```ts
    ...(VIEW_KINDS[view.type].flat
      ? [{ value: LOCATION_SORT, label: 'Location', icon: 'folder' as const }]
      : []),
```

```tsx
        subGrouping={!VIEW_KINDS[view.type].flat}
```

**VERIFY**

- [ ] Check the work for unnecessary code or obvious mistakes.
- [ ] `grep -rn "TYPE_ORDER\|TYPE_GLYPH\|IMPLEMENTED" Core/Views --include='*.ts' --include='*.tsx'` → 0.
- [ ] `grep -rn "view.type ===\|view.type !==" Core/Views Core/Tiles --include='*.tsx' | grep -v '\.test\.' | wc -l` → 2.
- [ ] `npx vitest run Core/Views/Settings` passes.
- [ ] User confirms: the six tiles look as they did; clicking List, Gallery, Calendar, or Timeline does nothing; switching Table ↔ Cards re-icons a view still on its default glyph and leaves a custom one alone.

#### Review Checkpoint

- [ ] Every Baseline grep under Phase 1's files reads its target count.
- [ ] `npm run typecheck`, `npm run test`, `npm run lint` green; `Core/Contract/engineGraph.test.ts` unchanged in its three assertions.
- [ ] User's three hand-checks from Tasks 1.3 and 1.4 confirmed.
- [ ] `git diff --shortstat` for the phase shows deletions exceeding insertions.

### Phase 2 — The Host Row List

**GOAL:** The host's existing group walk also yields the painted order, and both renderers read it instead of walking the tree themselves. Separate because it shares no file with Phase 1 and changes no behavior.

#### Task 2.1

**TASK:** The host's row-map walk also collects each row's id and band in paint order and exposes the list as `paintOrder`.

**FILES:** `Core/Views/Host/useViewHost.ts`

**DEPENDENCIES:** Tasks 2.2 and 2.3 read `paintOrder`.

**NOW**

```ts
  const { rowById, rowBand } = useMemo(() => {
    const byId = new Map<string, ViewRow>()
    const band = new Map<string, string>()
    const walk = (gs: ResolvedGroup[]): void => {
      for (const g of gs) {
        for (const r of g.items) {
          byId.set(r.id, r)
          band.set(r.id, g.key)
        }
        if (g.children) walk(g.children)
      }
    }
    walk(groups)
    return { rowById: byId, rowBand: band }
  }, [groups])
```

**CHANGE**

- [ ] Collect `ordered: { id: string; groupKey: string }[]` in the same loop, pushing `{ id: r.id, groupKey: g.key }` as each row is mapped, and return it as `paintOrder`. The pair shape is what `TableRowDnd`'s `rows` prop takes, so Table passes it through untouched.
- [ ] Add `paintOrder` to the hook's returned object beside `rowById` and `rowBand`.

**AFTER**

```ts
  const { rowById, rowBand, paintOrder } = useMemo(() => {
    const byId = new Map<string, ViewRow>()
    const band = new Map<string, string>()
    const ordered: { id: string; groupKey: string }[] = []
    const walk = (gs: ResolvedGroup[]): void => {
      for (const g of gs) {
        for (const r of g.items) {
          byId.set(r.id, r)
          band.set(r.id, g.key)
          ordered.push({ id: r.id, groupKey: g.key })
        }
        if (g.children) walk(g.children)
      }
    }
    walk(groups)
    return { rowById: byId, rowBand: band, paintOrder: ordered }
  }, [groups])
```

**VERIFY**

- [ ] Check the work for unnecessary code or obvious mistakes; the walk is still one walk.
- [ ] `npx vitest run Core/Views/Host` passes.

#### Task 2.2

**TASK:** CardsView reads each band's rows from the band itself and the painted order from the host; its `flattenGroups` and all seven calls go.

**FILES:** `Core/Views/Cards/CardsView.tsx`

**DEPENDENCIES:** Reads Task 2.1's `paintOrder`. Under `flat`, no band the pipeline hands Cards carries `children` (`structuralFlat`, `locationFlat`, flat, and property grouping build none; `structuralSubGrouped` and `structural` are gated behind `!flattenStructural`; no post-pass adds children), so a band's rows are exactly `g.items`.

**NOW**

The file declares `flattenGroups(groups: ResolvedGroup[]): ViewRow[]` at its foot and calls it at seven sites: `locByRow` walks `flattenGroups(groups)`; `bandRowsWithout` filters `flattenGroups(groups.filter((g) => g.key === bandKey))`; `reorderInBandByIndex` reads `flattenGroups([g])` per group and `flattenGroups(groups)` for `painted`; `onCardDrop` finds the source band with `groups.find((g) => flattenGroups([g]).some((r) => r.id === activeId))` and reads `flattenGroups(groups.filter((g) => g.key === toZone))` for `bandRows`; the band render reads `flattenGroups([g])`.

**CHANGE**

- [ ] Destructure `paintOrder` from `host` beside `rowById` and `rowBand`.
- [ ] `locByRow` iterates `rowById.values()` (order is irrelevant to a map); its dependency array keeps `groups`, since `rowById` is memoized on `groups` and nothing else in the memo changed.
- [ ] `bandRowsWithout` reads `(groups.find((g) => g.key === bandKey)?.items ?? []).filter(…)`.
- [ ] `reorderInBandByIndex`: `flattenGroups([g])` → `g.items`; `painted` → `paintOrder.map((r) => r.id)`.
- [ ] `onCardDrop`: `from` → `rowBand.get(activeId)`; `bandRows` → `groups.find((g) => g.key === toZone)?.items ?? []`.
- [ ] The band render reads `g.items` in place of `flattenGroups([g])`.
- [ ] Delete `flattenGroups`. Drop the `ResolvedGroup` type import if nothing else in the file reads it.

**AFTER**

`grep -c flattenGroups` reads 0; the seven sites read `g.items`, `paintOrder`, `rowById`, or `rowBand` as listed. The band lookup `groups.find((g) => g.key === key)?.items ?? []` appears exactly twice (`bandRowsWithout` and `onCardDrop`) and stays inline.

**VERIFY**

- [ ] Check the work for unnecessary code or obvious mistakes.
- [ ] `grep -c "flattenGroups" Core/Views/Cards/CardsView.tsx` → 0.
- [ ] `npx vitest run Core/Views/manualOrderDrops.test.tsx Core/Views/Host` passes untouched, including both Cards drop cases.
- [ ] `wc -l Core/Views/Cards/CardsView.tsx` reads below 1359.

#### Task 2.3

**TASK:** TableView passes the host's painted order to its row DnD and reads paths from `rowById`; its own walk, the memo, and the `rowPath` map go.

**FILES:** `Core/Views/Table/TableView.tsx`

**DEPENDENCIES:** Reads Task 2.1's `paintOrder`.

**NOW**

```ts
  const { dataRows, rowPath } = useMemo(() => {
    const rows: { id: string; path: string; groupKey: string }[] = []
    const collect = (g: ResolvedGroup): void => {
      for (const r of g.items) rows.push({ id: r.id, path: r.path, groupKey: g.key })
      for (const c of g.children ?? []) collect(c)
    }
    groups.forEach(collect)
    return {
      dataRows: rows,
      rowPath: new Map(rows.map((r) => [r.id, r.path] as const)),
    }
  }, [groups])
```

`dataRows` is read once, as `TableRowDnd`'s `rows` prop. `rowPath.get(…)` is read at three sites: `reassignRow`, `relocateRow`, and `reorderTo`'s `firstPath`.

**CHANGE**

- [ ] Destructure `paintOrder` from `host` beside `rowById` and `rowBand`.
- [ ] Delete the memo; `TableRowDnd` takes `rows={paintOrder}`.
- [ ] The three `rowPath.get(x)` reads become `rowById.get(x)?.path`.
- [ ] Drop the `ResolvedGroup` type import if nothing else in the file reads it.

**AFTER**

```tsx
        <TableRowDnd
          rows={paintOrder}
```

**VERIFY**

- [ ] Check the work for unnecessary code or obvious mistakes.
- [ ] `grep -c "rowPath\|dataRows" Core/Views/Table/TableView.tsx` → 0.
- [ ] `npx vitest run Core/Views/Table Core/Views/manualOrderDrops.test.tsx` passes untouched.
- [ ] `wc -l Core/Views/Table/TableView.tsx` reads below 1438.

### Phase 3 — The Record

**GOAL:** Every document this plan made false reads true, the audit ledger shrinks by what closed, and History carries the entry. After Phases 1 and 2 because it names their commits.

#### Task 3.1

**TASK:** ViewTypesPM describes the registry and the seat as they now are.

**FILES:** `.claude/Features/ViewTypesPM.md`

**NOW**

The opening says six types "are registered in `Core/Views/views.ts`"; The View Host paragraph says "the flattening flag is the exception, decided by the seat before the host runs — a renderer names its own structural shape without the host ever switching on a view's type"; Grouping says "A cards view drops Sub-Group and gains a None row"; Sorting says "A cards view adds **Location** as a reserved sort"; the List · Gallery · Calendar · Timeline section says "Registered in the type union and present as picker tiles, with no renderer behind them; a view of any of these types falls through to the table."

**CHANGE**

- [ ] Opening paragraph: the six kinds are one registry, `VIEW_KINDS` in `views.ts`, each carrying its label, icon, and whether it lays structural groups flat; Table and Cards have renderers in `ViewHost`'s `VIEW_RENDERERS`.
- [ ] The View Host paragraph: the seat reads the kind's flatness from the registry and hands it to the host; a renderer never switches on a view's type. Rewrite the sentence in place; don't append.
- [ ] Grouping and Sorting: "a flat kind" in place of "a cards view" for the None row and the Location sort, keeping the Sub-Group drop with it.
- [ ] The unbuilt section: registered with no renderer; their tiles are inert; a view carrying one seats the default kind's renderer, Table.
- [ ] In The Saved-View Model, where `icon` is named: a view without an icon of its own draws its kind's glyph.
- [ ] `FrameworkPM.md`'s v0.6 sentence ("registered types with none, and their picker tiles are inert") stays true and is not touched.

**AFTER**

Each named claim reads as its CHANGE bullet states, in the paragraph it already occupies, with no "now", "previously", or "as of" framing.

**VERIFY**

- [ ] `grep -n "falls through\|without the host ever switching\|A cards view drops\|A cards view adds" .claude/Features/ViewTypesPM.md` → 0.
- [ ] Read each rewritten paragraph once whole; nothing beside the rewrite contradicts it.

#### Task 3.2

**TASK:** The audit ledger drops what closed, Context gains the Recent Work entry, and History gains the entry.

**FILES:** `.claude/Planning/Codebase Audit — Report.md`, `.claude/ContextPM.md`, `.claude/HistoryPM.md`

**NOW**

The audit's Topic 6 Change list item 3 reads "Scope the ghost's rect reads to the anchor's own zone; replace the per-drop group flattening with the host's existing row-to-band map. *(S; ~25 lines)*"; item 4 reads "Build a view-kind registry, or trim the union to the two kinds that render. *(M; after D-6; ~40 lines of lists)*"; its Deletes line counts "40 lines of view-kind lists"; the Found paragraph says "Six view kinds are registered, two render, and the other four silently render as tables, because there's no registry, only 'is it cards, else table' across twelve places"; the Findings line reads "R-32, R-33, R-34, R-35, R-36"; R-34 stands in the findings table; D-6 stands under Where Brainwaves Go; R-36 reads "The Cards ghost reads every card's rect twice on every hover dwell, and re-flattens the group tree it was handed." `ContextPM.md`'s Current Focus names the audit ledger as what comes next, and its Recent Work holds the five latest History entries. History's latest entry is PM-135.

**CHANGE**

- [ ] Audit Topic 6: trim item 3 to its ghost-rect half; delete item 4 and renumber; drop "40 lines of view-kind lists" from Deletes; rewrite the Found sentence so it no longer claims twelve places or a missing registry, keeping the two-renderer and interaction-layer claims; drop R-34 from the Findings line; delete R-34's table row; delete D-6 and its Recommendation; R-36 keeps its ghost-rect half and drops "and re-flattens the group tree it was handed", with the CardsView citation kept and `useViewHost.ts` dropped from its citation.
- [ ] `ContextPM.md`: Current Focus's audit paragraph stays as written (the renderer fold is still what follows). Recent Work gains PM-136 at the top under the History heading and date with a three-to-four-sentence summary, and the oldest of the five drops off.
- [ ] `HistoryPM.md`: index row and entry PM-136 per `History-Format.md` (`~/The Studio/.claude/references/`), titled for what changed (the view-kind registry and the host paint order), dated 09-10-2026 or the range the commits span, with the commit range and the diff from the report.

**AFTER**

The audit no longer lists R-34 or D-6; R-36 and Change item 3 are each one claim; Context's Recent Work leads with PM-136; History carries PM-136.

**VERIFY**

- [ ] `grep -n "R-34\|D-6\|twelve places\|re-flattens\|per-drop group flattening" ".claude/Planning/Codebase Audit — Report.md"` → 0.
- [ ] `grep -c "PM-136" .claude/HistoryPM.md` → 2 (index row and heading); `grep -c "PM-136" .claude/ContextPM.md` → 1.

### Completion Criteria

**Conformance**
- [ ] One statement of the kind set: `grep -rn "'gallery'" Core/Views Core/Tiles --include='*.ts' --include='*.tsx' | grep -v '\.test\.'` → `views.ts` only.
- [ ] One statement of which kinds are built: `VIEW_RENDERERS` in `ViewHost.tsx`; `grep -rn "IMPLEMENTED" Core/Views` → 0.
- [ ] Nothing changed outside what the plan named: `git diff --name-only a5232d67b..HEAD` matches the FILES lists and the Phase 3 documents.
- [ ] `views.ts` imports nothing new; `engineGraph.test.ts` passes with its three assertions unchanged.

**Correctness**
- [ ] A view with no `icon` draws its kind's glyph in the View menu, the view list, the Settings header, the tile picker, and the view tile (user's check, Task 1.3).
- [ ] The four unbuilt tiles look unchanged and do nothing on click (user's check, Task 1.4).
- [ ] A sidecar hand-edited to `type: 'list'` opens as a Table with the Table switches in the flat Settings door.
- [ ] Both renderers drag, drop, reorder, relocate, create, and open exactly as before: every existing view suite passes without an edit.

**Completeness**
- [ ] Every task ticked; no scaffolding, debug output, or TODO in `a5232d67b..HEAD`.

**Confirmation**
- [ ] Every VERIFY result read; `viewIcon.test.ts`'s `viewGlyph` case goes red with the resolver's fallback removed.
- [ ] User: icon-less view glyph · inert tiles unchanged · Table ↔ Cards re-icon.

**Continuity**
- [ ] Reconciliation complete; `ViewTypesPM.md`, the audit report, `ContextPM.md`, and `HistoryPM.md` read true; Deviations each fixed or ruled on.

**Confidence**
- [ ] Gates green from clean on `a5232d67b..HEAD`; every Baseline count moved as stated.
- [ ] Diff size as the plan implied: a net decrease, comments and tests excluded, reported as +/- in the closing report.

### Final Verification

**THE STANDARD:** The work is finished when a later review of it finds nothing to correct. Nothing is carried as a concern, nothing is deferred where the fix is known, and nothing is declared that wasn't watched happen. Where something genuinely couldn't get there, the report names which and why, and everything else is still finished. Ambiguity met during execution took the simplest reading and was recorded; it didn't stop the run. Edits found in adjacent files that no task made belong to the user — folded into the commit at hand, not reverted.

- [ ] Phase review dispatched: Phase 1 · Phase 2 · Phase 3
- [ ] All findings fixed or ruled on
- [ ] Neutral verification passed on `a5232d67b..HEAD`
- [ ] Final pass: gates · baseline · diff · deviations · criteria
- [ ] Reconciliation walked; living documents read
- [ ] Report delivered

#### Reconciliation

- `.claude/Features/ViewTypesPM.md` — "Six view types are registered in `Core/Views/views.ts`" (true but incomplete; the registry carries label, icon, flatness) — Task 3.1
- `.claude/Features/ViewTypesPM.md` — "the flattening flag is the exception, decided by the seat before the host runs — a renderer names its own structural shape without the host ever switching on a view's type" — Task 3.1
- `.claude/Features/ViewTypesPM.md` — "A cards view drops Sub-Group and gains a None row" · "A cards view adds Location as a reserved sort" — Task 3.1
- `.claude/Features/ViewTypesPM.md` — "a view of any of these types falls through to the table" (true in effect; restated as the default kind's renderer) — Task 3.1
- `.claude/Planning/Codebase Audit — Report.md` — Topic 6 Change items 3 and 4, the Deletes line, the "twelve places" sentence, the Findings line, R-34, D-6, and R-36's re-flatten clause — Task 3.2
- `Core/Views/viewIcon.test.ts` — the `GLYPH` fixture asserting the icon map — Task 1.3
- `Core/Views/views.test.ts` — "coerces an unknown type to table" asserting the literal — Task 1.1
- `Core/Views/Host/ViewHost.tsx` — the comment "a minted default is a table whatever the schema" stays true; no change
- `.claude/ContextPM.md` — Recent Work's five entries — Task 3.2
- `.claude/HistoryPM.md` — PM-136 — Task 3.2

#### Report & Closure

Per Writing-Plans-V3 §5.5: the plain-language report with Phase by Phase, Verification (phase review, neutral verification, final pass, reconciliation, user's own pass), Deviations, Open Items, Diff (+/- lines excluding comments and tests, START → END), and Closing.

### Open Items

- None.

### Deviations

