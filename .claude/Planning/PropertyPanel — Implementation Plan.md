## PropertyPanel — Implementation Plan

> **Status:** written, pending review · Spec: this plan's Grounding block · Execute tasks in order.
> Citations name files and symbols; re-derive before editing.

**Goal**

One popup value-assignment surface for the whole app, and one property-panel component. Afterwards `PropertyPicker` is the only thing that opens over an anchor to set a property value — option rows, a date, a link, a number, or a file — and it optionally opens on a chooser pane first, so "add a property to this thing" and "set this property's value" are one component instead of three. `Core/Properties/Page/` is gone, replaced by `Core/Properties/PropertyPanel.tsx` and `property-panel.css.ts`, whose rows are `MenuItem`s rather than a hand-rolled parallel to them.

The shape is Nathan's, ratified over three exchanges: dissolve `Page/`; rows become menu rows; one `defaultRows` function decides which rows start visible; `usePropertyRows` and its `PropertyRows` interface disappear without being re-inlined as a hook; and `CardPickerHost` is deleted rather than lifted, with `PropertyPicker` gaining the optional multi-pane state instead. Two alternatives were weighed and rejected. Lifting `CardPickerHost` into `Core/Properties/Pickers/` as a shared host keeps a wrapper whose whole job is choosing between pickers that `PropertyPicker` could choose between itself — a fourth component where the third was already redundant. Having `PropertyPanel` import `CardPickerHost` from `Views/Cards/` was rejected outright: it would point `Core/Properties` at a view renderer and force the panel to fake `SavedView` and `rowById` state it does not have.

Bounded by: no behavior change on any of the three surfaces except the two named in Forced By; `Core/Properties` must not import from `Core/Views`; the pure helpers `PropertyPicker` already exports stay exported unchanged, because four other files import them. Not solved here: the value right-click menu, still written three times (`PropertyPanel`, `CardValue`, `TableView`), and `TableView`'s `cellEditor` / `massPicker`, which have no counterpart on the other two surfaces.

**Requirements**

1. `Core/Properties/Page/` is deleted — all four files.
2. `Core/Properties/PropertyPanel.tsx` and `property-panel.css.ts` replace it; rows are `MenuItem`s with leading icon + property name and the value in the trailing slot.
3. `PropertyPanel` takes `panelStyle: 'standard' | 'filled'` and `sections?: PanelSection[]`, where `sections` selects which of Properties / Contexts render and in what order.
4. A `defaultRows` function decides which rows start visible, replacing the `revealed` / `setAside` pair.
5. `usePropertyRows` and the `PropertyRows` interface no longer exist, and are not re-created as a hook anywhere.
6. `PropertyValueEditors`, `CardPickerHost`, `CardAddPicker`, and `DatetimeCellPicker` no longer exist; `PropertyPicker` is the single popup value surface and carries the optional chooser pane.
7. Net source reduction of at least 150 lines, comments and tests excluded.
8. Every behavior in the Behavior Ledger holds on all three surfaces.

**Acceptance — the whole thing working:** On a page window's inspector, a Cards view, and a Table view, a property value can be set from empty through the popup, changed, and cleared; the panel's Add affordance and the card's add-picker both open the same two-pane picker; and `rg -F "CardPickerHost" Core` returns 0 while the gates are green.

**Forced By**

- `PropertyPicker`'s pure exports (`pickShape`, `pickSemantics`, `PropertyOptionRows`, `selectedValues`, `toggleValue`, `syntheticContextDef`) are imported by `MassPropertyPicker`, `FilterFrame`, `TableView`, `CardAddPicker` → the component may grow props, but no export changes signature or leaves the module. *(Task 1)*
- `addEntriesFor` reads `SavedView`, `hiddenListIds`, and `isCompact` → `cardValueInput.ts` stays in `Views/Cards/`; the chooser takes caller-built entries so `Core/Properties` never sees a view type. *(Task 1, Task 3)*
- The panel's `rename` mode is link-*alias* rename through `urlValueFromRename`, which is not the `link` kind's URL edit through `urlValueFromEdit` → alias rename does not enter `PropertyPicker`. It becomes an inline `PropertyEditor` in the row, matching `CardValue.tsx:174` and `TableView.tsx:552`. **User-visible change:** the panel's alias rename stops opening a `TextPicker` popup and edits in place. *(Task 5)*
- `CardPickerHost`'s popup `TextPicker`s for number and link exist only for the add-flow, where no row exists to edit inline; all three surfaces already inline-edit an *existing* number or url with `PropertyEditor` → `PropertyPicker`'s `number` and `link` kinds serve the add-flow only, and no surface loses its inline editor. *(Task 1)*
- The panel's add-flow currently reveals a row, waits a frame, and finds its value cell by `document.querySelector` on `ROW_ATTR` → routing the add-flow through the chooser pane deletes the `requestAnimationFrame` + `querySelector` + `ROW_ATTR` mechanism entirely. **User-visible change:** picking a property from Add commits its value in the picker rather than revealing an empty row and re-anchoring to it. *(Task 5)*
- `CardPickerHost` holds `lastValue` / `lastAdd` refs so the anchor survives the close animation → `useHeld` (`UIX/Animations/useHeld.ts`) already does exactly this; the ref pattern is not re-grown. *(Task 1)*
- `nexus.db` and the on-disk format are untouched by every task here → no migration, no backup, and `mutate` op names stay as they are.

**Inherited Reasoning**

- The layer below this one is already correct and single-writer: `sharedValueClickAction`, `pickFileInto`, `fileValueMenu`, `PropertyOptionRows`, `massAssign`. The duplication is exclusively in the layer that turns "a value was clicked" into "this popup is open, anchored here." Do not re-extract what is already extracted.
- `MassPropertyPicker` is a correct reuse of `PropertyPicker`'s helpers and is not a target.
- `DatetimeCellPicker` (`TableView.tsx:92`) is an 18-line wrapper that adds nothing over `PickerMenu`. It was presumably a seam that never grew one.

**Grounding** *(re-open these; don't cite them)*

- `Core/Properties/Page/` — 4 files, 688 lines: `PagePropertyRows.tsx` 363, `usePropertyRows.ts` 192, `PropertyValueEditors.tsx` 78, `page-properties.css.ts` 55. The whole deletion target.
- `Core/Views/Cards/CardPickerHost.tsx` 230, `CardAddPicker.tsx` 157 — the mechanism being folded in, including the `FrameSlide` root/detail pane state.
- `Core/Properties/Pickers/PropertyPicker.tsx` 156 — what grows; note which exports are public.
- `Core/Views/Table/TableView.tsx:88-105, 470-505, 547-645` — the third copy of both the dispatch and the picker host.
- `Core/Views/Cards/CardValue.tsx:77-120, 160-197` — the third copy of the dispatch; the inline-editor precedent for alias rename.
- `UIX/Menus/menu-row.tsx`, `menu-base.css.ts` — `MenuItem`, `item`, `titleText`, `side`, `value`, `detail`. What the panel borrows instead of re-declaring.
- `UIX/Menus/frame-slide.tsx`, `UIX/Animations/useHeld.ts`, `Reveal.tsx`, `useEntrance.ts` — existing mechanisms the plan reuses.
- `.claude/Features/InterfacePM.md:55`, `ViewTypesPM.md:119`, `PropertiesPM.md:105` — the docs describing these surfaces.
- `.claude/Guidelines/Development-Environment.md` — gate behavior.

**Environment**

- **Plan directory:** `.claude/Planning/`. **Spec input:** none — this conversation settled the design; Phase A's discovery pass ran in it and its findings are the Grounding block.
- **Explorer:** `Explore`. **Code reviewer:** `feature-dev:code-reviewer`. **Attack reviewer:** `build-breaking-agent`. **Neutral verifier:** `general-purpose`, handed the adjudication question alone. **Simplification:** `code-simplifier`, then `comment-killer-agent`.
- **Gate commands:** `npm run typecheck` · `npm run test` · `npm run lint` — all from the repo root, exit codes read directly. `npm run lint` is `biome check .` plus the `no-wrapped-comments` scan.
- **Rules directory:** `.claude/Guidelines/`.

**Shapes:** refactor · removal · user-visible.

**Baseline invariant (refactor):** `npm run test` passes with the same test count before and after every phase. No test is deleted, weakened, or narrowed; a test that must change because a signature moved has that change named in its task.

**No Declared Stops.** Per standing preference, per-task visual confirmation is skipped during multi-phase work; every **Verify — user** box carries to Completion Criteria and is walked once at the end, with the two user-visible changes in Forced By called out.

**Global Constraints (every task inherits these)**

- Gates from the repo root: `npm run typecheck`, `npm run test`, `npm run lint`. Exit codes read directly, never through a pipe.
- Formatting is Biome's. A shell-driven edit bypasses the format hook — run `npm run format` after one.
- Comments only where the why can't be inferred from the code. No block comment spanning lines (the `no-wrapped-comments` scan fails on one).
- `Core/Properties/**` may not import from `Core/Views/**`. `UIX/**` may not import from `Core/**`.
- Style files are `.css.ts` (vanilla-extract). Plain `.css` cannot compose `item` / `titleText` from `menu-base.css.ts`, which is the mechanism this plan borrows.
- One writer on the tree at a time. Commit per task, ticking that task's boxes in the same commit.
- Out of scope everywhere: `Showcase/`, `nexus.db`, the on-disk frontmatter format, `Core/Properties/Schema/**`, `MassPropertyPicker`, `TableView`'s `cellEditor` and `massPicker`, the value right-click menu's three copies.

**Behavior Ledger** *(each must hold at closeout; Task 5 and Task 3 own them)*

| # | Behavior | Today | Lands |
| --- | --- | --- | --- |
| B1 | Row right-click → clear / remove | `PagePropertyRows:162` `popRowMenu` | Task 5 |
| B2 | Value right-click → file menu or link menu | `usePropertyRows:161` `valueMenu` | Task 5 |
| B3 | Checkbox toggled to null reveals its row | `usePropertyRows:151` | Task 5 |
| B4 | File value opens the native dialog | `pickFileInto` via `editRow` | Task 5 |
| B5 | Nexus change resets editing and shown state | `PagePropertyRows:85` | Task 5 |
| B6 | Panel fetches detail through the warm slot | `PagePropertyRows:61` | Task 5 |
| B7 | Page variant's row entrance animation | `Reveal` + `useEntrance` | Task 5 |
| B8 | Page variant seeds Contexts shown; panel seeds them hidden | `setAside` vs `revealed` | Task 4 |
| B9 | Multi-select and Context picks keep the popup open | `PropertyPicker:148` | Task 1 |
| B10 | Card add-picker reveals a `revealOnly` entry without committing | `CardAddPicker:119` | Task 3 |
| B11 | Compact cards dismiss a picker whose value went blank | `CardPickerHost:96` | Task 3 |
| B12 | A vanished row dismisses its open picker | `CardPickerHost:99, 106` | Task 3 |

**Made False**

| Doc | The specific claim | What makes it false | Task |
| --- | --- | --- | --- |
| `ViewTypesPM.md:119` | "Pickers mount at one grid-level host so an open picker survives row churn." | The host is deleted; `PropertyPicker` mounts at grid level directly. | 8 |
| `ViewTypesPM.md:119` | "A two-stage **add-picker**…" | Still two-stage, but it is now `PropertyPicker`'s chooser pane, not a Cards component. | 8 |
| `InterfacePM.md:55` | "…an Add affordance alone on an empty page, and rows edited through the table cells' own primitives" | The Add affordance now opens the two-pane picker and commits in it rather than revealing an empty row. | 8 |
| `PropertiesPM.md:105` | *(addition, not a falsification)* | The section documents the schema-assign surface but never the value-assign surface; the unified picker needs a paragraph. | 8 |

**Dead Vocabulary** *(the closing sweep — Task 9)*

- `PagePropertyRows` → expect 0. Today: 7.
- `usePropertyRows` → expect 0. Today: 4.
- `PropertyValueEditors` → expect 0. Today: 3.
- `CardPickerHost` → expect 0. Today: 3.
- `CardAddPicker` → expect 0. Today: 3.
- `DatetimeCellPicker` → expect 0. Today: 3.
- `Properties/Page` → expect 0. Today: 3.
- Control: `PropertyPicker` → expect ≥ 19. Zero here means the sweep never ran.

*All counts from `grep -rF "<token>" --include='*.ts' --include='*.tsx' Core UIX`, taken at `1e12d62ae`. Re-derive at execution.*

**Hazard Window:** Task 1 opens it — `PropertyPicker` carries both its old flat-value shape and the new `target`/`chooser` shape while callers migrate. No task may add a new `PropertyPicker` call site against the old shape while it is open. Task 6 closes it by removing the old props once `TableView` is the last converted caller.

---

### Phase 1 — PropertyPicker becomes the one popup value surface

#### Task 1: PropertyPicker takes a target, five kinds, and an optional chooser pane

**Requirement:** 6

**Why:** Every popup that sets a property value is currently chosen by a wrapper — `CardPickerHost` by `request.kind`, `TableView` by a type test, `PropertyValueEditors` by `editing.mode`. Moving that choice inside `PropertyPicker` is what lets all three wrappers be deleted. Tasks 3, 5, and 6 each consume this shape.

**Now** — `Core/Properties/Pickers/PropertyPicker.tsx`, 156 lines; the component renders one flat option list:

```ts
export function PropertyPicker({
  def, current, open, triggerRef, anchorX, look, contextOptions, onCommit, onDismiss,
}: { def: PropertyDefinition; current: PropertyValue | null; open: boolean
     triggerRef: RefObject<HTMLElement | null>; anchorX?: number; look?: ColumnLook
     contextOptions?: PickOption[]
     onCommit: (value: PropertyValue | null) => void; onDismiss: () => void }): React.JSX.Element | null

// unchanged, all public — imported by MassPropertyPicker, FilterFrame, TableView, CardAddPicker
export const optionsOf, selectedValues, pickShape, toggleValue, syntheticContextDef
export function PropertyOptionRows(...), pickSemantics(...)
```

**Becomes** — one target, five kinds, an optional chooser root pane:

```ts
// Core/Properties/Pickers/PropertyPicker.tsx
export type PropertyPickKind = 'options' | 'datetime' | 'link' | 'number' | 'file'

export type PickTarget = {
  id: string
  def: PropertyDefinition
  current: PropertyValue | null
  kind: PropertyPickKind
  look?: ColumnLook
  dateFormat?: string
  contextOptions?: PickOption[]
}

// target === null → the row only reveals; the caller shows it in place and nothing commits.
export type PickEntry = { id: string; name: string; icon: IconName; target: PickTarget | null }

export const pickKindFor = (type: PropertyType): PropertyPickKind

export function PropertyPicker({
  target, chooser, chooserLabel, open, triggerRef, anchorX, onCommit, onReveal, onDismiss,
}: {
  target: PickTarget | null
  chooser?: PickEntry[]
  chooserLabel?: string
  open: boolean
  triggerRef: RefObject<HTMLElement | null>
  anchorX?: number
  onCommit: (target: PickTarget, value: PropertyValue | null) => void
  onReveal?: (id: string) => void
  onDismiss: () => void
}): React.JSX.Element | null
// chooser absent → opens on target's value pane · present → opens on the entry list,
//   sliding into the value pane on a pick, back on the header's Back
// options: a select commits and dismisses; multi_select and context stay open (B9)
// datetime/link/number/file: commit dismisses
// target held through the exit via useHeld, so the closing pane keeps its content
```

**Ordered steps** *(the order is not derivable from the fences)*

1. Add the types and `pickKindFor`; leave the existing props in place alongside — the hazard window is open and Cards/Table/Panel still call the old shape.
2. Move `CardPickerHost`'s five render branches in as the value pane, one `switch` on `target.kind`. `PathField`, `TextPicker`, `DatetimeValuePicker`, `PropertyOptionRows` are all already imported or importable; `adoptPathInto` and `pickFileInto` come from `filePick.ts`.
3. Move `CardAddPicker`'s `FrameSlide` root/detail as the chooser pane, with `ValuePane`'s `MenuTopRow` header. Its `card-add-top-flat` class moves from `cards-view.css` into `property-picker.css.ts` or is dropped if it only zeroes padding — check before assuming.
4. Replace the `lastValue` ref with `useHeld(target, open)`.

**Assumed by:** Task 3 (Cards), Task 5 (PropertyPanel), Task 6 (Table).

**Verify — automated**

- [ ] New test file `PropertyPicker.pane.test.tsx`: red first on five cases — chooser renders entries; picking a `target: null` entry calls `onReveal` and not `onCommit`; picking a targeted entry slides to the value pane; a `select` commit dismisses; a `multi_select` commit does not. Expect 5 failures naming the missing props, then green.
- [ ] `npm run typecheck` green — the old props still compile for their existing callers.
- [ ] `npm run test` green, test count = baseline + 5.
- [ ] `npm run lint` green.

**Verify — user**

- [ ] *(none — no caller uses the new shape yet.)*

#### Task 2: Baseline the three surfaces before anything moves

**Requirement:** 8

**Why:** This is a refactor, so behavior preservation has to be provable by unchanged numbers rather than asserted. Every later gate compares against what this task records.

**Now** — no baseline exists.

**Becomes** — a recorded baseline in the Log's Rulings, not a file:

```
npm run test  → test count N, all green
rg counts for every Dead Vocabulary token and its control
wc -l on the eight files this plan deletes or grows
```

**Verify — automated**

- [ ] All three gates green at the phase base commit, exit codes read directly.
- [ ] Counts recorded in the Log. Control: `PropertyPicker` → ≥ 19.

**Verify — user**

- [ ] *(none.)*

#### Task 3: CardsView drives PropertyPicker; CardPickerHost and CardAddPicker are deleted

**Requirement:** 6, 8

**Why:** Cards is the surface the folded-in mechanism came from, so converting it first proves the new shape against the behavior that defined it. B10, B11, and B12 live here and nowhere else.

**Now** — `rg -F "CardPickerHost" Core` → 3, `rg -F "CardAddPicker" Core` → 3:

```ts
// Core/Views/Cards/CardPickerHost.tsx (230 lines) — deleted
export type ValuePickerRequest = { rowId: string; column: ResolvedColumn
  kind: 'picker' | 'datetime' | 'link' | 'number' | 'file'; anchor: HTMLElement
  clickX?: number; revealOnCommit?: boolean }
export type AddPickerRequest = { rowId: string; anchor: HTMLElement; initialEntry: AddEntry | null }
export function CardPickerHost({ ... 12 props ... })

// Core/Views/Cards/CardAddPicker.tsx (157 lines) — deleted
// Core/Views/Cards/cardValueInput.ts — unchanged; addEntriesFor still reads SavedView
// Core/Views/Cards/CardValue.tsx:85 — unchanged in this task; Task 7 owns its dispatch
```

**Becomes** — `CardsView` builds the picker's inputs where it already builds the requests:

```ts
// Core/Views/Cards/CardsView.tsx
// The two request types stay — they are CardsView's own state, not the picker's contract.
// Their `kind` field becomes PropertyPickKind; 'picker' → 'options'.
const valueTarget = (req: ValuePickerRequest): PickTarget | null
const addEntries = (req: AddPickerRequest): PickEntry[]   // maps AddEntry → PickEntry
// AddEntry.revealOnly === true → PickEntry.target === null (B10)
<PropertyPicker
  target={valuePicker ? valueTarget(valuePicker) : addTargetFor(addPicker)}
  chooser={addPicker ? addEntries(addPicker) : undefined}
  chooserLabel="Properties"
  open={valuePicker !== null || addPicker !== null}
  ... />
```

**Ordered steps**

1. Write `valueTarget` and `addEntries` in `CardsView.tsx` beside the existing request state.
2. Move `CardPickerHost`'s two dismiss effects (B11, B12) into `CardsView` — they read `rowById`, `view`, and `ctx`, which it already holds.
3. Swap the `<CardPickerHost>` element for `<PropertyPicker>`; delete both files.

**Assumed by:** Task 6 (Table follows the same conversion).

**Verify — automated**

- [ ] Existing Cards tests green, unchanged count.
- [ ] `rg -F "CardPickerHost" Core` → 0 and `rg -F "CardAddPicker" Core` → 0. Control: `rg -F "CardsView" Core` → non-zero.
- [ ] `npm run typecheck`, `npm run test`, `npm run lint` green.

**Verify — user**

- [ ] On a Cards view: a value opens its picker; the card menu's **Add Property ▸** opens the entry list and slides into the value pane; a reveal-only entry appears on the card without committing.

#### Gate 1 — one popup surface, Cards unmoved

- [ ] Gate commands green, exit codes read directly.
- [ ] Every task's **Verify — automated** list ticked, each against a result just watched.
- [ ] Baseline invariant holds: test count = Task 2's N + 5, no test weakened.
- [ ] Every Now count re-run against its control; counts matched, or the divergence rewrote the plan.
- [ ] `code-simplifier` then `feature-dev:code-reviewer` dispatched against `<base>..HEAD` scoped to `Core/Properties/Pickers/ Core/Views/Cards/`; the reports cite files inside it.
- [ ] Every concern fixed, or carrying an explicit user ruling recorded in the Log.
- [ ] Hazard window still open by design; Task 6 closes it. Recorded, not resolved.
- [ ] Progress hashes filled in; lessons written into the later tasks they change.

---

### Phase 2 — PropertyPanel replaces Properties/Page/

#### Task 4: property-panel.css.ts and the panel's row + section model

**Requirement:** 2, 3, 4

**Why:** The styles and the visibility rule are what the component is built out of, and both are small enough to land before the component that consumes them. `defaultRows` is Requirement 4 in one function.

**Now** — `Core/Properties/Page/page-properties.css.ts`, 55 lines, seven styles, two of them re-declaring menu primitives:

```ts
export const row = style([item])              // menu-base.css's item, verbatim
export const label = style([titleText, { flex: '0 1 auto' }])
export const value = style({ marginLeft: 'auto', flex: '0 1 auto', minWidth: 0,
  display: 'flex', alignItems: 'center', justifyContent: 'flex-end', textAlign: 'right' })
export const frame, rows, panelRows, group, empty, add
// The variant fork lives in the component, not here: panelRows vs rows is chosen at the call site.
```

**Becomes** — `Core/Properties/property-panel.css.ts`; `row`, `label`, and `value` are gone because `MenuItem` supplies them:

```ts
// Core/Properties/property-panel.css.ts
export const rows = style({ display: 'flex', flexDirection: 'column', gap: '8px' })
export const group = style({ display: 'flex', flexDirection: 'column', padding: '2px',
  borderRadius: '8px' })
export const groupFilled = style({ background: c.fill.tertiary })  // panelStyle: 'filled'
export const empty = style([text.caption.standard])
export const add = style({ alignSelf: 'flex-start', color: c.label.secondary })
```

```ts
// Core/Properties/propertyPanel.ts — the visibility rule, testable without React
export type PanelSection = 'properties' | 'contexts'

// Which rows a surface starts with shown. A row is also shown once it holds a value on
// disk, or once this session assigned one — that part is the component's, not this rule's.
export function defaultRows(section: PanelSection, panelStyle: PanelStyle): boolean
// contexts + 'standard' (the page frame) → true · everything else → false   (B8)
```

**Assumed by:** Task 5 (the component imports both).

**Verify — automated**

- [ ] New `propertyPanel.test.ts`: red first on four cases — contexts/standard true, contexts/filled false, properties/standard false, properties/filled false. Expect 4 failures, module not found. Then green.
- [ ] `npm run typecheck`, `npm run test` (count = prior + 4), `npm run lint` green.

**Verify — user**

- [ ] *(none — nothing renders these yet.)*

#### Task 5: PropertyPanel replaces PagePropertyRows; Properties/Page/ is deleted

**Requirement:** 1, 2, 3, 4, 5, 8

**Why:** This is the deliverable Nathan asked for. The panel becomes a component whose rows are menu rows, whose visibility is one function, and whose value editing is `PropertyPicker` — with no hook and no editors component behind it.

**Now** — `rg -F "PagePropertyRows" Core` → 7 (1 definition, 3 imports, 3 call sites); `rg -F "Properties/Page" Core` → 3:

```tsx
// Core/Properties/Page/PagePropertyRows.tsx (363) — deleted
type Props = { variant: 'page'; page: PageDetail; onBack: () => void }
           | { variant: 'panel'; page: WindowTarget }
const ROW_ATTR = { page: 'data-page-prop', panel: 'data-insp-id' } as const
// forks on `variant` at 11 sites: frame, rows class, leading markup, Reveal, iconSize,
// isShownContext, emptyRow, showContext, the React key, ROW_ATTR, the props union

// Core/Properties/Page/usePropertyRows.ts (192) — deleted, interface included
// Core/Properties/Page/PropertyValueEditors.tsx (78) — deleted

// Call sites, all three converted here:
// Core/Interface/Windows/PageWindow.tsx:173  <PagePropertyRows variant="panel" page={target} />
// Core/Interface/Windows/NavWindow.tsx:174   <PagePropertyRows variant="panel" page={pageTarget} />
// Core/Pages/PageMenu.tsx:106                <PagePropertyRows variant="page" page={pageDetail} onBack={…} />
```

**Becomes** — one component, no variant union, the frame owned by the caller:

```tsx
// Core/Properties/PropertyPanel.tsx
export type PanelStyle = 'standard' | 'filled'

export function PropertyPanel({
  page, panelStyle, sections = ['contexts', 'properties'], animateRows = false,
}: {
  page: PageDetail | WindowTarget
  panelStyle: PanelStyle
  sections?: PanelSection[]      // which groups render, and their order
  animateRows?: boolean          // the page frame's Reveal entrance (B7)
}): React.JSX.Element
// A PageDetail carries its own frontmatter; a WindowTarget is fetched through the warm
// slot (B6). Rows are MenuItems: leading = Icon + name, trailing = Cell or EmptyValue.
// Editing routes to one <PropertyPicker> — no local editors, no hook.
```

```tsx
// Core/Pages/PageMenu.tsx — the caller owns its frame, so onBack leaves the panel's props
<MenuScrollFrame header={<MenuTopRow label="Settings" current="Properties" onBack={…} />}>
  <PropertyPanel page={pageDetail} panelStyle="standard" animateRows />
</MenuScrollFrame>

// PageWindow.tsx / NavWindow.tsx
<div className="window-panel-column">
  <PropertyPanel page={target} panelStyle="filled" />
</div>
```

**Ordered steps**

1. Write `PropertyPanel.tsx`: the memos formerly in `usePropertyRows` (`schema`, `ctx`, `contextRows`, `contextValues`, `row`) and the two commit writers become locals — roughly 40 lines, not 192, because the interface, both handler bags, `editRow`, and `valueMenu`'s plumbing leave rather than move.
2. Rows render through `MenuItem`. One `shown: Set<string>` seeded by `defaultRows`; `revealed`, `setAside`, and `ROW_ATTR` all go.
3. The dispatch calls `sharedValueClickAction`, then `pickKindFor` for everything it doesn't commit inline — one branch, not four.
4. Alias rename becomes an inline `PropertyEditor` seeded from `linkAlias`, committing through `urlValueFromRename` (Forced By).
5. The Add affordance opens `PropertyPicker` with `chooser`; the `requestAnimationFrame` + `querySelector` reveal-then-anchor path is deleted, not ported.
6. Convert all three call sites, then delete `Core/Properties/Page/`.

**Assumed by:** Task 8 (docs cite the new paths).

**Verify — automated**

- [ ] Red-green on `defaultRows` wiring: a new `PropertyPanel.test.tsx` asserting a `filled` panel starts with no Context rows and a `standard` one starts with them (B8). Red first — expect 2 failures, module not found.
- [ ] `rg -F "PagePropertyRows" Core` → 0, `rg -F "usePropertyRows" Core` → 0, `rg -F "PropertyValueEditors" Core` → 0, `rg -F "Properties/Page" Core` → 0. Control: `rg -F "PropertyPanel" Core` → ≥ 4.
- [ ] `ls Core/Properties/Page` → exits non-zero.
- [ ] `npm run typecheck`, `npm run test`, `npm run lint` green; test count = prior + 2.

**Verify — user**

- [ ] Page window inspector: rows read as menu rows, values set and clear, the Add affordance opens the two-pane picker and commits inside it.
- [ ] Page Settings ▸ Properties: Contexts are pre-seeded, a set-aside Context returns from Add, the row entrance animation still plays.
- [ ] A link value's **Rename** now edits in place rather than opening a popup.

#### Gate 2 — the panel ships, Page/ is gone

- [ ] Gate commands green, exit codes read directly.
- [ ] Every task's **Verify — automated** list ticked, each against a result just watched.
- [ ] Baseline invariant holds; no test weakened or deleted.
- [ ] Every behavior B1–B8 confirmed present in `PropertyPanel.tsx` by reading, each with its line.
- [ ] `code-simplifier` then `feature-dev:code-reviewer` against `<base>..HEAD` scoped to `Core/Properties/ Core/Pages/ Core/Interface/Windows/`.
- [ ] Every concern fixed, or carrying an explicit user ruling recorded in the Log.
- [ ] Progress hashes filled in.

---

### Phase 3 — Table joins, and the old shape retires

#### Task 6: TableView's datetime branch routes through PropertyPicker; DatetimeCellPicker is deleted

**Requirement:** 6

**Why:** `DatetimeCellPicker` is the third writer of "a datetime picker in a popup," and the hard rule says a second writer found must be reported and removed. Closing this also closes the hazard window, because Table is the last caller of `PropertyPicker`'s old props.

**Now** — `rg -F "DatetimeCellPicker" Core` → 3, all in `TableView.tsx`:

```tsx
// Core/Views/Table/TableView.tsx:92 — adds nothing over PickerMenu
function DatetimeCellPicker({ open, triggerRef, onDismiss, children }): React.JSX.Element {
  return <PickerMenu solid open={open} onDismiss={onDismiss} triggerRef={triggerRef}>{children}</PickerMenu>
}
// :588  the datetime branch of cellPicker, then a separate <PropertyPicker> for everything else
// cellEditor (:547) and massPicker (:613) — unchanged, out of scope
```

**Becomes** — one `PropertyPicker` for both branches:

```tsx
// Core/Views/Table/TableView.tsx — cellPicker builds a PickTarget and returns one element
const cellPicker = (): React.ReactNode   // target.kind from pickKindFor; no datetime special case
// DatetimeCellPicker deleted
```

```ts
// Core/Properties/Pickers/PropertyPicker.tsx — the old props come off; hazard window closes
// removed: def, current, look, contextOptions  (all now carried by PickTarget)
```

**Verify — automated**

- [ ] `rg -F "DatetimeCellPicker" Core` → 0. Control: `rg -F "cellPicker" Core` → non-zero.
- [ ] `npm run typecheck` green — this is the proof the old props have no remaining caller.
- [ ] `npm run test`, `npm run lint` green; test count unmoved.

**Verify — user**

- [ ] Table: a Date cell opens the calendar; an option cell opens the dropdown; mass-select over an option column still fans out.

#### Task 7: CardValue and TableView dispatch through pickKindFor

**Requirement:** 6

**Why:** The remaining half of the duplication — three hand-rolled branches turning `sharedValueClickAction`'s result into a picker kind. One function already exists after Task 1; these two are its last non-users.

**Now** — `rg -F "sharedValueClickAction" Core` → 17. The two dispatch tails:

```ts
// Core/Views/Cards/CardValue.tsx:85-95
} else if (t === 'number') { setMode('editor') } else if (t === 'url') { openPicker('link') }
// Core/Views/Table/TableView.tsx:482-505
} else if (t === 'number') { … 'rename' on a bar look, else 'editor' } else if (t === 'url') { … }
// Both keep their inline-editor paths — only the popup branch changes.
```

**Becomes** — the popup branch names its kind once:

```ts
// both files: the shared tail
else openPicker(pickKindFor(t))
// The inline-editor branches stay exactly as they are: a number or url with an existing
// value edits in place on all three surfaces, and Table's bar-look rename is untouched.
```

**Verify — automated**

- [ ] `npm run test` green, count unmoved — this task changes no behavior, only who names the kind.
- [ ] `npm run typecheck`, `npm run lint` green.

**Verify — user**

- [ ] Cards and Table: clicking an empty date, link, number, and file value each opens the right popup; clicking a filled number or url still edits inline.

#### Gate 3 — one dispatch, one popup, no old shape

- [ ] Gate commands green, exit codes read directly.
- [ ] Every task's **Verify — automated** list ticked.
- [ ] Hazard window closed by Task 6; `PropertyPicker` has no old-shape caller.
- [ ] `code-simplifier` then `feature-dev:code-reviewer` against `<base>..HEAD` scoped to `Core/Views/ Core/Properties/Pickers/`.
- [ ] Every concern fixed, or carrying an explicit user ruling recorded in the Log.
- [ ] Progress hashes filled in.

---

### Phase 4 — Record

#### Task 8: Rewrite what this made false

**Requirement:** 8

**Why:** The Made False table's claims describe mechanisms that no longer exist. A doc still false at closeout is a defect in the commit that should have carried it.

**Now** — the four rows of Made False, each quoted there with its file and line.

**Becomes** — each rewritten in place, describing what exists rather than amending what did:

```
ViewTypesPM.md:119   the add-picker described as PropertyPicker's chooser pane
InterfacePM.md:55    the panel's Add affordance described as committing in the picker
PropertiesPM.md:105  a new paragraph under Shared Mechanisms for the one value-assign surface
```

**Verify — automated**

- [ ] `rg -F "CardPickerHost" .claude` → 0 outside `Planning/`. Control: `rg -F "PropertyPicker" .claude` → non-zero.

**Verify — user**

- [ ] The three docs read as descriptions of what exists, with no amendment language.

#### Task 9: The closing sweep and the line count

**Requirement:** 7

**Why:** Requirement 7 is a number, and a number is only true if measured. The sweep is what proves the deletions actually left.

**Now** — the Dead Vocabulary block's seven tokens with their counts at `1e12d62ae`.

**Becomes** — every token at 0 against a live control, and the delta recorded:

```
git diff --stat <plan base>..HEAD          # net, comments and tests excluded per loc.py
.claude/scripts/loc.py                     # the project's own counter, not wc -l
```

**Verify — automated**

- [ ] Every Dead Vocabulary token → 0, each in its own command. Control: `PropertyPicker` → ≥ 19.
- [ ] Net source reduction ≥ 150 lines, comments and tests excluded. Expected range −400 to −600.
- [ ] All three gates green.

**Verify — user**

- [ ] *(none.)*

#### Gate 4 — the record closes

- [ ] Gate commands green.
- [ ] Every Made False row rewritten in the commit that falsified it, or the miss recorded in Deviations.
- [ ] Closing sweep at zero against its control.
- [ ] Progress hashes filled in.

---

## Implementation Log

### Progress

- [ ] **Phase 1** — PropertyPicker becomes the one popup value surface · base `<commit>`
  - [ ] Task 1 — PropertyPicker takes a target, five kinds, and a chooser pane · `<commit>`
  - [ ] Task 2 — Baseline the three surfaces · `<commit>`
  - [ ] Task 3 — CardsView drives PropertyPicker; two files deleted · `<commit>`
  - [ ] Gate 1
- [ ] **Phase 2** — PropertyPanel replaces Properties/Page/
  - [ ] Task 4 — property-panel.css.ts and defaultRows · `<commit>`
  - [ ] Task 5 — PropertyPanel ships; Page/ deleted · `<commit>`
  - [ ] Gate 2
- [ ] **Phase 3** — Table joins, and the old shape retires
  - [ ] Task 6 — Table's datetime branch; DatetimeCellPicker deleted · `<commit>`
  - [ ] Task 7 — CardValue and TableView dispatch through pickKindFor · `<commit>`
  - [ ] Gate 3
- [ ] **Phase 4** — Record
  - [ ] Task 8 — Rewrite what this made false · `<commit>`
  - [ ] Task 9 — Closing sweep and line count · `<commit>`
  - [ ] Gate 4

### Rulings

- **Style files are `.css.ts`.** Nathan's message named `property-panel.css`. Plain CSS cannot compose vanilla-extract's `item` / `titleText`, which is the mechanism "borrowing from Menus/" refers to; plain CSS would force the panel to re-declare row padding, hover, focus ring, and type ramp by hand. Raised twice in conversation without objection. Recorded as the plan's reading, open to reversal at ratification.

### Open Against Later Tasks

### Deviations

### Lessons

### Sequenced After

- **The value right-click menu, three times.** `PropertyPanel`, `CardValue.tsx:99`, and `TableView` each hand-roll the file-menu / link-menu branch. The shared halves (`fileValueMenu`, `linkValueMenuTarget`, `showConnectionMenu`) are already extracted; the branch above them is not. Deliberately out of scope here — it is a different seam from the popup surface.
- **`TableView`'s `cellEditor` and `massPicker`.** Table-only behavior (bar-look rename, title-cell icon, mass fan-out) with no counterpart on the other two surfaces. Folding them in would grow `PropertyPicker` flags to absorb behavior only one caller has.

### Closeout

---

## Completion Criteria

*(Written at ratification, ticked at the end. It stands alone — handed to an executing agent with the plan, it is the whole brief.)*

**The directive**

```
Execute .claude/Planning/PropertyPanel — Implementation Plan.md. Unattended.
Live-verify: the three surfaces' user boxes — page window inspector, Page Settings ▸
  Properties, a Cards view, and a Table view. These are the only items allowed to stay pending.
Screenshots: none during the run.
Pings: at each phase gate and at completion.
Record: a History entry under the PropertyPanel arc.
Also: the two user-visible changes in Forced By — the panel's inline alias rename, and the
  Add affordance committing inside the picker — must be called out explicitly in the report.
Everything else is the standard below.
```

**The Standard**

- **The bar.** Not doing the chores — doing the laundry, folding it, picking up what fell out of the hamper, emptying the lint trap, leaving no trace that anything went wrong. A future review of this arc finds nothing to correct.
- **Only the live confirmation may be pending.** No concerns carried, no "for a later session," no deferrals when the fix is known and could be done now. Where an item genuinely can't get there, the Log names which and why, and everything else is still finished.
- **Reusability first.** Search before writing. A second resolver, cache, or validator means the plan is wrong, or you are — log it before proceeding. Duplication is debt.
- **Fix at the source**, never down-river; leave a unified thing rather than stitched pieces. Add code only where it repairs something flawed or makes things simpler.
- **Ambiguity:** take the simplest reading, record it under Rulings or Deviations, continue. Execution does not stop for input.
- **Per phase:** implement → simplify → comment pass → gates, exit codes read directly and never piped → code review → attack review → every finding fixed or carrying a defensible ruling → commit → ping. Simplification before review, never inverted. "Done with concerns" is unfinished work, and a result nobody watched happen is not a result.
- **Comments** only where the why can't be inferred. **Docs** stay clean and non-bloated; what went false gets rewritten, not amended. Unattributed doc or style edits mid-run belong to the user — fold them into the commit at hand, never revert them.

**Then tick these.**

**The deliverable**

- [ ] Every numbered requirement traces to a landed task.
- [ ] The acceptance criterion observed running, clause by clause.
- [ ] `Core/Properties/Page/` does not exist.
- [ ] `PropertyPicker` is the only component opening a popup to set a property value.
- [ ] Every behavior B1–B12 holds on its surface.
- [ ] Net source reduction ≥ 150 lines, comments and tests excluded.

**The passes**

- [ ] `code-simplifier` and `comment-killer-agent` over the whole range, not only per phase.
- [ ] `code-simplifier` → `feature-dev:code-reviewer` over the full implementation, in that order.
- [ ] Delivery Claim written, then checked by a neutral verifier against this plan's Requirements.
- [ ] `build-breaking-agent` dispatched after the claim is verified, never in the same brief.
- [ ] Every finding from every pass fixed, or carrying a defensible ruling.

**The user's own pass** *(the only thing allowed to be outstanding)*

- [ ] Page window inspector (`filled`): rows, values, clear, Add.
- [ ] NavWindow inspector (`filled`): same, against a nav-constrained page.
- [ ] Page Settings ▸ Properties (`standard`): pre-seeded Contexts, set-aside and return, row entrance.
- [ ] Cards view: value pickers, the two-stage add-picker, reveal-only entries.
- [ ] Table view: date cell, option cell, mass-select fan-out, inline number and url edits.
- [ ] The two in-flight decisions: the panel's alias rename now edits in place; Add commits inside the picker rather than revealing an empty row.

**The record**

- [ ] Documents made false rewritten in the commits that falsified them.
- [ ] The closing sweep at zero against its control.
- [ ] `ContextPM.md` and `HandoffPM.md` current; the History entry written to its format.
- [ ] Lessons routed to `.claude/Guidelines/`; successor work named in Sequenced After.

**The report**, in plain English — what shipped and why it matters · what happened along the way worth knowing · every gate's real output · in-flight decisions, a sentence or two each · what's left for the live pass · final +/- line count, comments and tests excluded. Honest about what didn't work.
