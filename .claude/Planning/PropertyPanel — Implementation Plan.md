## PropertyPanel — Implementation Plan

> **Status:** written, pending review · Execute tasks in order.
> Citations name files and symbols; re-derive before editing.

**Goal**

One component renders every popup that assigns a property value, and one component renders a property panel. Afterwards `PropertyPicker` is the single popup surface — option rows, a date, a link address, a link alias, a number, a file — optionally opening on a chooser pane first, so "add a property" and "set a value" are one component. `Core/Properties/Page/` is gone, replaced by `Core/Properties/PropertyPanel.tsx` + `property-panel.css.ts`, whose rows are the design system's `MenuItem`.

**This folds hosts, not behavior.** A census of the whole codebase found nine distinct popup compositions for one job. Each surface's *behavior* is correct for that surface and is preserved exactly: Cards pops the link address and inlines the alias; Table and the panel inline the address and pop the alias; Table alone has bar-look numbers and mass select; Cards alone has the `PathField` file pane and centre-origin anchoring. Every one of those survives, chosen by the `kind` its caller passes. What dies is nine hand-rolled `PickerMenu` wrappers around the same content.

Rejected: lifting `CardPickerHost` into `Core/Properties/Pickers/` (keeps a wrapper whose only job is choosing between pickers `PropertyPicker` can choose between itself); importing it from `Views/Cards/` (points `Core/Properties` at a view renderer). Both settled by Nathan.

Bounded by: no behavior change on any surface — **no exceptions**; `Core/Properties` must not import from `Core/Views`; `PropertyPicker`'s existing pure exports keep their signatures, since four files import them; no new helper, hook, or abstraction that a caller does not already need.

**Requirements**

1. `Core/Properties/Page/` deleted — all four files.
2. `Core/Properties/PropertyPanel.tsx` + `property-panel.css.ts` replace it; rows are `MenuItem`s, leading icon + name, value in the trailing slot.
3. `PropertyPanel` takes `panelStyle: 'standard' | 'filled'`; both current callers pass `'filled'`, so nothing moves visually.
4. `defaultRows` decides which rows start visible, replacing the `revealed` / `setAside` pair.
5. `usePropertyRows` and the `PropertyRows` interface no longer exist, and are not re-created as a hook.
6. `PropertyValueEditors`, `CardPickerHost`, `CardAddPicker`, and `DatetimeCellPicker` no longer exist; `PropertyPicker` is the only component mounting a `PickerMenu` to assign a property value.
7. Net source reduction **over 250 lines**, comments and tests excluded.
8. Every behavior in the Behavior Ledger holds, on its own surface, unchanged.

**Acceptance — the whole thing working:** On the page window inspector, Page Settings ▸ Properties, a Cards view, and a Table view, every value type can be set, changed, and cleared exactly as it can today; the re-fold census in Phase 5 returns zero residue against its control; and the net delta is under −250.

**Forced By**

- `PropertyPicker`'s pure exports (`optionsOf`, `pickShape`, `pickSemantics`, `PropertyOptionRows`, `selectedValues`, `toggleValue`, `syntheticContextDef`) are imported by `MassPropertyPicker`, `FilterFrame`, `TableView`, `CardAddPicker` → the component grows props; no export changes signature or leaves the module. *(Task 1)*
- `PickerMenu` latches `origin` and `direction` once per open (`picker-base.tsx:182-191`, `:207`) → a picker that swaps content kind while open cannot renegotiate placement. `FrameSlide` grows the pane in place instead, which is what `CardAddPicker` already does. The chooser pane is therefore the mechanism, not a convenience. *(Task 1)*
- `PickerMenu` already holds its own `children` through exit via `useHeld` (`picker-base.tsx:128`), but not props derived from the same state → `PropertyPicker` holds its own `target` internally with `useHeld`, so no caller re-grows the `lastValue` ref pattern. *(Task 1)*
- `EditableInput` is uncontrolled (`EditableInput.tsx:49`) → a `TextPicker` picks up a changed value only on remount. `TableView.tsx:672` forces this with a `nonce` key. `PropertyPicker` keys its text kinds the same way. *(Task 1)*
- `PickerRow` is a real `<button>` (`picker-base.tsx:411`) → the chooser's entry rows use `MenuItem`, as `CardAddPicker.tsx:105` already does. *(Task 1)*
- `addEntriesFor` reads `SavedView`, `hiddenListIds`, `isCompact` → `cardValueInput.ts` stays in `Views/Cards/`; the chooser takes caller-built entries so `Core/Properties` never sees a view type. *(Tasks 1, 2)*
- The panel currently passes neither `look` nor `dateFormat` to its pickers (`PropertyValueEditors.tsx:51-58`, `:70-73`) → it keeps passing neither. A panel row has no per-view column style to read, and adding one would change what the panel renders. *(Task 4)*

**Inherited Reasoning**

- The **pure** layer below is correctly shared and single-writer: `sharedValueClickAction`, `pickFileInto`, `runFileMenuAction`, `fileValueWithout`, `PropertyOptionRows`, `pickSemantics`, `massAssign`. Do not re-extract it.
- The **write** layer is not, and this plan does not fix it. Three value-write paths exist (`usePropertyRows.commitValue`, `useViewHost.setProperty`, `useViewHost.commitValue`), and `TableView` calls `setProperty` directly for checkbox, file, datetime, url-clear, rename, and both number paths while using `commitValue` for `cell:clear` and the picker. Number parsing has four writers. Recorded, deliberately out of scope, listed in Sequenced After.
- Per-surface behavior differences are **intentional and correct**, ratified by Nathan. The link inversion between Cards and Table/panel is not a defect. Do not homogenize any behavior in the difference matrix.

**Grounding** *(re-open these; don't cite them)*

- `Core/Properties/Page/` — 4 files, 688 lines: `PagePropertyRows.tsx` 363, `usePropertyRows.ts` 192, `PropertyValueEditors.tsx` 78, `page-properties.css.ts` 55.
- `Core/Views/Cards/CardPickerHost.tsx` 230, `CardAddPicker.tsx` 157, `CardsView.tsx:181-195, 268-269, 590`, `cardValueInput.ts`.
- `Core/Views/Table/TableView.tsx:88-108` (`DatetimeCellPicker`), `:173-189` (editing state + last refs), `:457-506` (dispatch), `:547-709` (hosts), `:843-875` (mass).
- `Core/Properties/Pickers/PropertyPicker.tsx` 156 — what grows. Note which exports are public.
- `UIX/Pickers/picker-base.tsx:60` (`PickerMenu`), `UIX/Pickers/TextPicker/TextPicker.tsx:7`, `UIX/Menus/frame-slide.tsx:10`, `UIX/Menus/menu-row.tsx:73`, `UIX/Animations/useHeld.ts:4`.
- `.claude/Features/InterfacePM.md:55`, `ViewTypesPM.md:119`, `PropertiesPM.md:105`.

**Environment**

- **Plan directory:** `.claude/Planning/`. **Spec input:** none — the session's census is the spec; its findings are the Grounding block and the Behavior Ledger.
- **Explorer:** `Explore` (Opus). **Code reviewer:** `feature-dev:code-reviewer`. **Attack reviewer:** `build-breaking-agent`. **Neutral verifier:** `general-purpose`. **Simplification:** `code-simplifier`, then `comment-killer-agent`.
- **Gate commands:** `npm run typecheck` · `npm run test` · `npm run lint`, from the repo root, exit codes read directly.
- **Rules directory:** `.claude/Guidelines/`.

**Shapes:** refactor · removal.

**Baseline invariant:** `npm run test` passes with the same test count before and after every phase, plus only the tests these tasks add. No test deleted, weakened, or narrowed.

**No Declared Stops.** Per standing preference, every **Verify — user** box carries to Completion Criteria and is walked once at the end.

**Global Constraints (every task inherits these)**

- Gates from the repo root, exit codes read directly, never through a pipe.
- Formatting is Biome's. A shell-driven edit bypasses the format hook — run `npm run format` after one.
- Comments only where the why can't be inferred. No block comment spanning lines.
- `Core/Properties/**` may not import from `Core/Views/**`. `UIX/**` may not import from `Core/**`.
- Style files are `.css.ts` (vanilla-extract) — plain `.css` cannot compose `item` / `titleText` from `menu-base.css.ts`.
- **No new helper, hook, wrapper, or abstraction unless a caller already needs it.** A one-writer, one-reader extraction is a defect in this plan, not a feature.
- One writer on the tree at a time. Commit per task, ticking that task's boxes in the same commit.
- Out of scope everywhere: `Showcase/`, `nexus.db`, the on-disk format, `Core/Properties/Schema/**`, the three value-write paths, the four number parsers, the two file-menu builders, `MassPropertyPicker`, `TableView`'s `cellEditor` and `massPicker`, every inline `PropertyEditor`, and every native right-click menu.

**Behavior Ledger** *(each holds unchanged, on its own surface)*

| # | Surface | Behavior | Cite |
| --- | --- | --- | --- |
| B1 | Panel | Un-checking a checkbox re-reveals its row | `usePropertyRows.ts:151` |
| B2 | Panel | Row right-click → Clear (keeps row) vs Remove (hides row) | `PagePropertyRows.tsx:150-168` |
| B3 | Panel | `setAside` — a context row hidden for this session, page frame only | `PagePropertyRows.tsx:157-160, 183-190` |
| B4 | Panel | Panel variant fetches via the warm detail slot; resets editing on path change | `PagePropertyRows.tsx:56-81` |
| B5 | Panel | Page frame's row entrance animation | `PagePropertyRows.tsx:129-133, 302-305` |
| B6 | Panel | Picker receives neither `look` nor `dateFormat` | `PropertyValueEditors.tsx:51-58, 70-73` |
| B7 | Panel | Add ▸ property runs the full click dispatch on the revealed row | `PagePropertyRows.tsx:171-182` |
| B8 | Panel | Page frame seeds Contexts shown; inspector seeds them hidden | `PagePropertyRows.tsx:112-115` |
| B9 | Cards | `clickX` → `anchorX` → centre-origin picker | `CardValue.tsx:83`, `CardPickerHost.tsx:204` |
| B10 | Cards | Link **address** edits in a `TextPicker` popup | `CardPickerHost.tsx:151-163` |
| B11 | Cards | Link **alias** edits inline via `PropertyEditor` | `CardValue.tsx:145, 155, 174` |
| B12 | Cards | `PathField` file pane — Browse and paste-a-path | `CardPickerHost.tsx:176-198` |
| B13 | Cards | `revealOnCommit` reveals a hidden column on first real commit | `CardPickerHost.tsx:116-120` |
| B14 | Cards | Compact-layout blank-dismiss; row-vanished dismiss | `CardPickerHost.tsx:96-107` |
| B15 | Cards | Two-pane add picker, actionable entries first, back button | `CardAddPicker.tsx:97-154` |
| B16 | Cards | An emptied number in the add-flow does not commit | `CardPickerHost.tsx:172` |
| B17 | Table | Bar-look number opens a `TextPicker` with a `/ divisor` suffix | `TableView.tsx:492-494, 672-692` |
| B18 | Table | Link **alias** edits in a `TextPicker` popup, with nonce + re-anchor | `TableView.tsx:696-709` |
| B19 | Table | Link **address** edits inline; a filled http url opens the browser | `TableView.tsx:498-504, 552` |
| B20 | Table | Datetime has no distinct mode; re-derived in `cellPicker` | `TableView.tsx:589` |
| B21 | Table | `dateFormat` and `look` come from the column style | `TableView.tsx:595, 611` |
| B22 | All | Single-select pick dismisses; multi_select and context stay open | `PropertyPicker.tsx:147-154` |

**Made False** *(each rewrite rides the commit that falsifies it)*

| Doc | The claim | What makes it false | Task |
| --- | --- | --- | --- |
| `ViewTypesPM.md:119` | "Pickers mount at one grid-level host…" | The host is deleted; `PropertyPicker` mounts at grid level. | 2 |
| `ViewTypesPM.md:119` | "A two-stage **add-picker**…" | Still two-stage; now `PropertyPicker`'s chooser pane. | 2 |
| `InterfacePM.md:55` | "…rows edited through the table cells' own primitives" | Rows are `MenuItem`s; editing routes to `PropertyPicker`. | 4 |
| `PropertiesPM.md:105` | *(addition)* | The section documents the schema-assign surface, never the value-assign surface. | 6 |

**Dead Vocabulary** *(swept in Phase 5; counts at `9cebfe766`)*

- `PagePropertyRows` → 0 (today 7) · `usePropertyRows` → 0 (4) · `PropertyValueEditors` → 0 (3)
- `CardPickerHost` → 0 (3) · `CardAddPicker` → 0 (3) · `DatetimeCellPicker` → 0 (3) · `Properties/Page` → 0 (3)
- Control: `PropertyPicker` → ≥ 19. Zero here means the sweep never ran.

*From `grep -rF "<token>" --include='*.ts' --include='*.tsx' Core UIX`. Re-derive at execution.*

**Hazard Window:** Task 1 opens it — `PropertyPicker` carries both its old flat props and the new `target` while callers migrate. No new call site may use the old shape while it is open. Task 5 closes it by removing the old props.

---

### Phase 1 — PropertyPicker becomes the one popup surface

#### Task 1: PropertyPicker takes a target union and an optional chooser pane

**Requirement:** 6

**Why:** Every popup that assigns a value is chosen today by a wrapper — `CardPickerHost` by `request.kind`, `TableView` by a type test, `PropertyValueEditors` by `editing.mode`. Moving that choice inside `PropertyPicker` is what lets all three wrappers be deleted. Tasks 2, 4, and 5 each consume this shape.

**Now** — `Core/Properties/Pickers/PropertyPicker.tsx`, 156 lines, one flat option list:

```ts
export function PropertyPicker({
  def, current, open, triggerRef, anchorX, look, contextOptions, onCommit, onDismiss,
}: {
  def: PropertyDefinition
  current: PropertyValue | null
  open: boolean
  triggerRef: RefObject<HTMLElement | null>
  anchorX?: number
  look?: ColumnLook
  contextOptions?: PickOption[]
  onCommit: (value: PropertyValue | null) => void
  onDismiss: () => void
}): React.JSX.Element | null

// unchanged, all public
export const optionsOf, selectedValues, pickShape, toggleValue, syntheticContextDef
export function PropertyOptionRows(...), pickSemantics(...)
```

**Becomes** — a discriminated target, six kinds, an optional chooser root:

```ts
// Core/Properties/Pickers/PropertyPicker.tsx

export type PickTarget = { def: PropertyDefinition; current: PropertyValue | null } & (
  | { kind: 'options'; look?: ColumnLook; contextOptions?: PickOption[] }
  | { kind: 'datetime'; dateFormat?: DateFormatName }
  | { kind: 'link' }
  | { kind: 'alias' }
  | { kind: 'number'; leading?: ReactNode; trailing?: ReactNode; keepNull?: false }
  | { kind: 'file' }
)

export type PickEntry = { id: string; name: string; icon: IconName; target: PickTarget | null }

export function PropertyPicker({
  target, chooser, open, triggerRef, anchorX, nonce, onCommit, onReveal, onDismiss,
}: {
  target: PickTarget | null
  chooser?: PickEntry[]
  open: boolean
  triggerRef: RefObject<HTMLElement | null>
  anchorX?: number
  nonce?: number
  onCommit: (value: PropertyValue | null) => void
  onReveal?: (id: string) => void
  onDismiss: () => void
}): React.JSX.Element | null
```

```tsx
// The body. `held` is why no caller re-grows a lastValue ref.
const held = useHeld(target, open)
const [picked, setPicked] = useState<PickEntry | null>(null)
useEffect(() => {
  if (!open) setPicked(null)
}, [open])

const shown = picked?.target ?? held
const pane = shown === null ? null : valuePane(shown, onCommit, onDismiss, nonce)

if (!chooser) {
  return (
    <PickerMenu
      solid
      open={open}
      onDismiss={onDismiss}
      triggerRef={triggerRef}
      origin={anchorX !== undefined ? 'center' : 'right'}
      anchorX={anchorX}
    >
      {pane}
    </PickerMenu>
  )
}
return (
  <PickerMenu solid open={open} onDismiss={onDismiss} triggerRef={triggerRef} origin="center">
    <FrameSlide
      open={picked !== null}
      minWidth={120}
      minHeight={0}
      root={
        chooser.length === 0 ? (
          <div style={{ minWidth: 96, height: 24 }} />
        ) : (
          <div>
            {chooser.map((e) => (
              <MenuItem
                key={e.id}
                leading={<Icon name={e.icon} size="body" />}
                trailing={e.target ? <Icon name="chevron-right" /> : undefined}
                onClick={() => {
                  if (e.target) return setPicked(e)
                  onReveal?.(e.id)
                  onDismiss()
                }}
              >
                {e.name}
              </MenuItem>
            ))}
          </div>
        )
      }
      detail={
        picked && (
          <div>
            <MenuTopRow
              label="Properties"
              current={picked.name}
              onBack={() => setPicked(null)}
              className="card-add-top-flat"
            />
            {pane}
          </div>
        )
      }
    />
  </PickerMenu>
)
```

```tsx
// The six kinds. Each is the body its wrapper renders today, moved verbatim.
function valuePane(
  t: PickTarget,
  onCommit: (v: PropertyValue | null) => void,
  onDismiss: () => void,
  nonce?: number,
): React.JSX.Element {
  switch (t.kind) {
    case 'options': {
      const { options, selected, pick } = pickSemantics(
        t.def, t.current, onCommit, onDismiss, t.contextOptions,
      )
      return (
        <PropertyOptionRows
          def={t.def}
          look={t.look}
          contextOptions={t.contextOptions}
          options={options}
          selected={selected}
          onPick={pick}
        />
      )
    }
    case 'datetime':
      return <DatetimeValuePicker value={t.current} dateFormat={t.dateFormat} onCommit={onCommit} />
    case 'link': {
      const raw = t.current?.kind === 'url' ? t.current.value : undefined
      return (
        <TextField
          key={nonce}
          value={raw ? linkEditText(raw) : ''}
          accent={solidColorCss(t.def.link_color)}
          onCommit={(v) => {
            // undefined = invalid, no write; null = clear, and a clear needs an existing value.
            const next = urlValueFromEdit(v, raw, resolveTitle)
            if (next !== undefined && (next !== null || raw)) onCommit(next)
            onDismiss()
          }}
        />
      )
    }
    case 'alias': {
      const raw = t.current?.kind === 'url' ? t.current.value : ''
      return (
        <TextField
          key={nonce}
          value={linkAlias(raw) ?? ''}
          accent={solidColorCss(t.def.link_color)}
          onCommit={(v) => {
            onCommit(urlValueFromRename(v, raw))
            onDismiss()
          }}
        />
      )
    }
    case 'number':
      return (
        <TextField
          key={nonce}
          value={t.current?.kind === 'number' ? String(t.current.value) : ''}
          leading={t.leading}
          trailing={t.trailing}
          onCommit={(v) => {
            const next = parseEditorValue('number', v)
            if (next !== undefined && (next !== null || t.keepNull !== false)) onCommit(next)
            onDismiss()
          }}
        />
      )
    case 'file':
      return (
        <PathField
          label={t.def.name}
          value=""
          empty="Choose a file"
          browseLabel="Choose File"
          onBrowse={() => pickFileInto(t.def, t.current, null, (v) => { onCommit(v); onDismiss() })}
          onCommit={(raw) => {
            if (raw.trim()) adoptPathInto(t.def, t.current, raw.trim(), onCommit)
            onDismiss()
          }}
        />
      )
  }
}
```

**Ordered steps** *(the order is not derivable from the fences)*

1. Add `PickTarget`, `PickEntry`, `valuePane`, and the new props; leave the existing props in place — the hazard window is open and all three callers still use the old shape.
2. `TextField` above is the inner field `TextPicker` renders, extracted from `UIX/Pickers/TextPicker/TextPicker.tsx` so a text kind can sit inside `PropertyPicker`'s own `PickerMenu` instead of nesting a second one. **Check first**: if `TextPicker` can be rendered as a child without its `PickerMenu`, do that instead of extracting anything. Adding a component here is only justified if nesting is impossible.
3. `card-add-top-flat` moves from `cards-view.css` beside the picker, or is dropped if it only zeroes padding — read it before assuming.

**Assumed by:** Task 2 (Cards), Task 3 (Table), Task 4 (PropertyPanel).

**Verify — automated**

- [ ] New `PropertyPicker.pane.test.tsx`, red first — expect 6 failures naming the missing props, then green: each of the six kinds renders its own body; a `target: null` chooser entry calls `onReveal` then `onDismiss` and never `onCommit`; a targeted entry slides to the value pane; `options` single-select dismisses and multi_select does not (B22).
- [ ] `npm run typecheck` green — the old props still compile for their three existing callers.
- [ ] `npm run test` green, count = baseline + 6. `npm run lint` green.

**Verify — user**

- [ ] *(none — no caller uses the new shape yet.)*

#### Task 2: CardsView drives PropertyPicker; CardPickerHost and CardAddPicker are deleted

**Requirement:** 6, 8

**Why:** Cards is where the folded mechanism came from, so converting it first proves the shape against the behavior that defined it. B9–B16 live here and nowhere else.

**Now** — `rg -F "CardPickerHost" Core` → 3, `rg -F "CardAddPicker" Core` → 3. `CardsView.tsx:590` renders the host; the request state is `CardsView.tsx:268-269`.

```ts
// Core/Views/Cards/CardPickerHost.tsx (230) and CardAddPicker.tsx (157) — both deleted.
// Core/Views/Cards/cardValueInput.ts — unchanged.
// Core/Views/Cards/CardValue.tsx — unchanged. Its inline alias rename (B11) is correct for Cards.
// Core/Views/Cards/CardsView.tsx:181-195 openAddPicker — unchanged, including its datetime|url short-circuit.
```

**Becomes** — `CardsView` builds the target where it already holds the request:

```tsx
// Core/Views/Cards/CardsView.tsx — the two request types stay; they are CardsView's own state.
const pickTargetFor = (req: ValuePickerRequest): PickTarget | null => {
  const row = rowById.get(req.rowId)
  if (!row) return null
  const current = resolveFieldValue(row, req.column.id, ctx.schema)
  const def = ctx.schema.find((d) => d.id === req.column.id) ?? syntheticContextDef(req.column.id)
  const style = styleFor(req.column.id, ctx.schema, view)
  switch (req.kind) {
    case 'picker': {
      const contextOptions = contextOptionsFor(req.column) ?? undefined
      return { kind: 'options', def, current, look: style.look, contextOptions }
    }
    case 'datetime':
      return { kind: 'datetime', def, current, dateFormat: style.date_format }
    case 'link':
      return { kind: 'link', def, current }
    case 'number':
      return { kind: 'number', def, current, leading: numberFormatGlyph(def), keepNull: false }
    case 'file':
      return { kind: 'file', def, current }
  }
}

const addEntriesFor = (req: AddPickerRequest): PickEntry[] => {
  const row = rowById.get(req.rowId)
  if (!row) return []
  return orderAddableEntries(addEntries(row, view, ctx, columns, tree, capitalize)).map((e) => ({
    id: e.id,
    name: e.name,
    icon: e.def ? propertyIcon(e.def) : (propertyTypeIconName(e.type) ?? 'square-dashed'),
    target: e.revealOnly ? null : pickTargetFor(entryRequest(req, e)),
  }))
}
```

```tsx
// Replacing <CardPickerHost/> at CardsView.tsx:590.
<PropertyPicker
  target={valuePicker ? pickTargetFor(valuePicker) : null}
  chooser={addPicker ? addEntriesFor(addPicker) : undefined}
  open={valuePicker !== null || addPicker !== null}
  triggerRef={pickerAnchorRef}
  anchorX={valuePicker?.clickX}
  onCommit={(v) => {
    const req = valuePicker ?? addPicker
    if (!req) return
    const row = rowById.get(req.rowId)
    const column = valuePicker ? valuePicker.column : addColumn(pickedId, tree)
    if (!row) return
    if (valuePicker?.revealOnCommit) revealProperty(column.id)
    commitValue(row, column, v)
  }}
  onReveal={(id) => revealProperty(id)}
  onDismiss={() => { setValuePicker(null); setAddPicker(null) }}
/>
```

**Ordered steps**

1. Move `CardPickerHost`'s two force-dismiss effects (B14) into `CardsView` — they read `rowById`, `view`, `ctx`, which it already holds.
2. `pickerAnchorRef` is one ref pointed at `(valuePicker ?? addPicker)?.anchor` each render, replacing the `lastValue`/`lastAdd`/`valueAnchorRef` trio — `PropertyPicker` holds the target itself now.
3. Swap the element, delete both files, rewrite the two `ViewTypesPM.md:119` claims.

**Verify — automated**

- [ ] `rg -F "CardPickerHost" Core` → 0; `rg -F "CardAddPicker" Core` → 0. Control: `rg -F "CardsView" Core` → non-zero.
- [ ] `npm run typecheck`, `npm run test` (count unmoved), `npm run lint` green.

**Verify — user**

- [ ] Cards: a value opens its picker centred on the click (B9); a link address opens the `TextPicker` (B10); an alias still renames inline (B11); the file pane offers Browse and a typed path (B12); the card menu's Add ▸ opens the two-pane picker (B15).

#### Task 3: TableView's datetime branch routes through PropertyPicker; DatetimeCellPicker is deleted

**Requirement:** 6, 8

**Why:** `DatetimeCellPicker` is an 18-line wrapper adding nothing over `PickerMenu`, and the third writer of "a datetime picker in a popup." Table's bar-look number and alias rename join the same component.

**Now** — `rg -F "DatetimeCellPicker" Core` → 3, all in `TableView.tsx`:

```tsx
// Core/Views/Table/TableView.tsx:91 — adds nothing over PickerMenu
function DatetimeCellPicker({ open, triggerRef, onDismiss, children }): React.JSX.Element {
  return <PickerMenu solid open={open} onDismiss={onDismiss} triggerRef={triggerRef}>{children}</PickerMenu>
}
// :588-599  the datetime branch of cellPicker · :604-616  the option branch
// :672-692  the bar-look number TextPicker · :696-709  the alias TextPicker
// :547-561 cellEditor and :631-661 massPicker — unchanged, out of scope
```

**Becomes** — one `PropertyPicker` for all four popups:

```tsx
// Core/Views/Table/TableView.tsx — cellPicker builds a target; the datetime special case is gone.
const cellTarget = (): PickTarget | null => {
  const cell = editing?.mode === 'picker' ? editing : lastPicker.current
  const row = cell && rowById.get(cell.rowId)
  const col = cell && columns.find((c) => c.id === cell.colId)
  if (!cell || !row || !col) return null
  const current = resolveFieldValue(row, col.id, schema)
  const contextOptions = contextOptionsFor(col)
  const def = schema.find((d) => d.id === col.id) ?? (contextOptions ? syntheticContextDef(col.id) : null)
  if (!def) return null
  const style = colStyle(col.id)
  if (col.kind === 'property' && declaredType(col.id, schema) === 'datetime')
    return { kind: 'datetime', def, current, dateFormat: style.date_format }
  return { kind: 'options', def, current, look: style.look, contextOptions: contextOptions ?? undefined }
}
```

```tsx
// The bar-look number and the alias rename, previously two hand-rolled TextPickers.
const textTarget = (): PickTarget | null => {
  const cell = editing?.mode === 'rename' ? editing : lastRename.current
  const row = cell && rowById.get(cell.rowId)
  const col = cell && columns.find((c) => c.id === cell.colId)
  if (!cell || !row || !col) return null
  const def = schema.find((d) => d.id === col.id)
  if (!def) return null
  const current = resolveFieldValue(row, col.id, schema)
  return declaredType(col.id, schema) === 'number'
    ? { kind: 'number', def, current, trailing: divisorSuffix(col.id) }
    : { kind: 'alias', def, current }
}
```

```ts
// Core/Properties/Pickers/PropertyPicker.tsx — the old props come off; the hazard window closes here
// only if Task 4 has already landed. Otherwise Task 5 closes it.
```

**Verify — automated**

- [ ] `rg -F "DatetimeCellPicker" Core` → 0. Control: `rg -F "cellPicker" Core` → non-zero.
- [ ] `npm run typecheck`, `npm run test` (count unmoved), `npm run lint` green.

**Verify — user**

- [ ] Table: a date cell opens the calendar in its column's format (B21); a bar-look number opens the `/ divisor` field (B17); a link alias renames in its popup and re-anchors correctly (B18); a filled http url still opens the browser and the address still edits inline (B19); mass-select still fans out.

---

### Phase 2 — PropertyPanel replaces Properties/Page/

#### Task 4: PropertyPanel ships; Core/Properties/Page/ is deleted

**Requirement:** 1, 2, 3, 4, 5, 8

**Why:** The deliverable. Rows become menu rows, visibility becomes one function, value editing becomes `PropertyPicker` — with no hook and no editors component behind it.

**Now** — `rg -F "PagePropertyRows" Core` → 7 (1 definition, 3 imports, 3 call sites):

```tsx
// Core/Properties/Page/PagePropertyRows.tsx (363) — deleted
type Props = { variant: 'page'; page: PageDetail; onBack: () => void }
           | { variant: 'panel'; page: WindowTarget }
const ROW_ATTR = { page: 'data-page-prop', panel: 'data-insp-id' } as const
// forks on `variant` at 11 sites; ROW_ATTR is read by exactly one querySelector, :176

// Core/Properties/Page/usePropertyRows.ts (192) — deleted, PropertyRows interface included
// Core/Properties/Page/PropertyValueEditors.tsx (78) — deleted
// Core/Properties/Page/page-properties.css.ts (55) — deleted; row/label/value re-declare MenuItem

// Call sites:
// Core/Interface/Windows/PageWindow.tsx:173  <PagePropertyRows variant="panel" page={target} />
// Core/Interface/Windows/NavWindow.tsx:174   <PagePropertyRows variant="panel" page={pageTarget} />
// Core/Pages/PageMenu.tsx:106                <PagePropertyRows variant="page" page={pageDetail} onBack={…} />
```

**Becomes** — one component; the caller owns only its header:

```tsx
// Core/Properties/PropertyPanel.tsx
export type PanelStyle = 'standard' | 'filled'

export function PropertyPanel({
  page, panelStyle, onBack,
}: {
  page: PageDetail | WindowTarget
  panelStyle: PanelStyle
  /** The page frame's Back row. Its presence is what marks this the page frame: it seeds
   *  Contexts shown, animates row entrance, and set-asides instead of un-revealing. */
  onBack?: () => void
}): React.JSX.Element
```

```ts
// Core/Properties/PropertyPanel.tsx — B8, inline, one expression. Not a module, not a test file.
const defaultShown = (isContext: boolean, pageFrame: boolean): boolean => isContext && pageFrame
```

```tsx
// The row. B6 is the two props NOT passed.
<MenuItem
  key={id}
  leading={<Icon name={icon} size="control" />}
  value={
    editing?.id === id && editing.mode === 'editor' && def ? (
      <PropertyEditor … />
    ) : (
      (Cell({ row, column, ctx, hideIcon: false, style: { look: 'standard' }, remove }) ??
        <EmptyValue className={s.empty} />)
    )
  }
  onClick={(e) => …}
  onContextMenu={(e) => …}
>
  {label}
</MenuItem>
```

```ts
// Core/Properties/property-panel.css.ts — row, label and value are gone; MenuItem supplies them.
export const rows = style({
  display: 'flex', flexDirection: 'column', gap: '8px',
  flex: 1, minHeight: 0, overflowY: 'auto', scrollbarWidth: 'none', padding: '0 4px 4px',
})
export const pageRows = style([rows, { flex: 'initial', overflowY: 'visible', padding: '4px 0 6px' }])
export const frame = style({ ...growToContent('350px'), display: 'flex', flexDirection: 'column' })
export const group = style({
  display: 'flex', flexDirection: 'column', padding: '2px',
  borderRadius: '8px', background: c.fill.tertiary,
})
export const empty = style([text.caption.standard])
export const add = style({ alignSelf: 'flex-start', color: c.label.secondary })
```

```tsx
// Core/Pages/PageMenu.tsx — only the Back row hoists; the frame and its width ceiling stay inside.
<PropertyPanel page={pageDetail} panelStyle="filled" onBack={() => setPane('root')} />

// PageWindow.tsx:173 / NavWindow.tsx:174 — unchanged wrappers, new component.
<PropertyPanel page={target} panelStyle="filled" />
```

**Ordered steps**

1. The memos formerly in `usePropertyRows` — `schema`, `ctx`, `contextRows`, `contextValues`, `row` — and the two commit writers become locals, roughly 40 lines. The interface, both handler bags, and the `editRow`/`valueMenu` plumbing leave rather than move.
2. One `shown: Set<string>` seeded by `defaultShown`; `revealed`, `setAside`, and `ROW_ATTR` all go. B3's set-aside is `shown.delete` on the page frame, `reveal`-drop on the inspector — the same Set, one branch.
3. B7's Add ▸ keeps running the full dispatch on the revealed row. The `requestAnimationFrame` + `querySelector` anchor path stays as it is: it is B7, and this plan preserves behavior.
4. `panelStyle` is threaded to `group`'s background but both callers pass `'filled'`, so `groupStandard` is not written until a caller asks for it.
5. Convert all three call sites, delete `Core/Properties/Page/`, rewrite `InterfacePM.md:55`.

**Verify — automated**

- [ ] New `PropertyPanel.test.tsx`, red first — expect 2 failures, module not found: an `onBack` panel seeds Context rows shown; one without seeds them hidden (B8).
- [ ] `rg -F "PagePropertyRows" Core` → 0 · `usePropertyRows` → 0 · `PropertyValueEditors` → 0 · `Properties/Page` → 0. Control: `rg -F "PropertyPanel" Core` → ≥ 4.
- [ ] `ls Core/Properties/Page` exits non-zero.
- [ ] `npm run typecheck`, `npm run test` (count = prior + 2), `npm run lint` green.

**Verify — user**

- [ ] Inspector: rows read as menu rows, values set and clear, un-checking a checkbox keeps its row (B1), right-click offers Clear vs Remove (B2), Add ▸ behaves as it does today (B7).
- [ ] Page Settings ▸ Properties: Contexts pre-seeded, a set-aside Context returns from Add (B3), row entrance animation plays (B5), the pane keeps its 350px ceiling.

#### Task 5: The old PropertyPicker props come off

**Requirement:** 6

**Why:** Closes the hazard window. With Cards, Table, and the panel all on `target`, the flat props have no caller and the type gate proves it.

**Now** — the six props Task 1 left in place beside the new ones:

```ts
// Core/Properties/Pickers/PropertyPicker.tsx
def: PropertyDefinition
current: PropertyValue | null
look?: ColumnLook
contextOptions?: PickOption[]
```

**Becomes** — removed; `PickTarget` carries all four.

**Verify — automated**

- [ ] `npm run typecheck` green — this is the proof no caller remains.
- [ ] `npm run test`, `npm run lint` green; count unmoved.

**Verify — user**

- [ ] *(none — a type-level removal.)*

---

### Phase 3 — The re-fold census

#### Task 6: Dispatch the census, then fold whatever it finds

**Requirement:** 6, 7, 8

**Why:** The first census found nine mechanisms where three were expected. The fold is only finished when a fresh census, run against the folded tree, finds no popup assigning a property value outside `PropertyPicker`. This task is the mandate that the plan's own list was not assumed complete.

**Now** — the tree as Phase 2 leaves it; no census has run against it.

**Becomes** — three `Explore` agents dispatched in parallel on Opus, each read-only, each returning a table. Their briefs:

```
A. Every popup, menu, pane, or inline editor opened to SET a property value or a
   Context/Space assignment. Sweep Core/Properties, Core/Views, Core/Contexts,
   Core/Tiles, Core/Pages, Core/Interface, Core/Navigation, Core/MarkdownPM.
   Anchors: PickerMenu · TextPicker · PathField · DatetimeValuePicker · PropertyEditor ·
   sharedValueClickAction · pickFileInto · setProperty · setContext.
   Report file:line, trigger, component, value kinds, commit path, inline-or-popup.
   Flag any PickerMenu mounted to assign a value that is NOT PropertyPicker.

B. Every remaining call site of the deleted symbols and of PropertyPicker's public
   exports. Confirm no second wrapper regrew. Report each with file:line.

C. Re-run the difference matrix across the panel, Cards, and Table against the folded
   tree. Every row must read either "identical" or match the Behavior Ledger's recorded
   per-surface difference. Any NEW divergence is a regression this fold introduced.
```

```
Residue rule: zero PickerMenu mounts for property assignment outside PropertyPicker.
Legitimate exceptions, allowlisted: MassPropertyPicker (its own dismiss semantics,
explicitly out of scope) and every inline PropertyEditor (a cell editor, not a popup).
```

**Ordered steps**

1. Dispatch A, B, C in one message; let the tree settle before any writer runs.
2. Verify every finding against the code before acting — an agent's claim is not evidence.
3. Anything real that is a *popup outside `PropertyPicker`* gets folded here. Anything real that is a *behavior divergence* is a regression and gets fixed here.
4. Anything real that is neither — a write-path fork, a parser fork, a menu-builder fork — is recorded in Sequenced After and **not** fixed. Scope is the fold.

**Verify — automated**

- [ ] Every Dead Vocabulary token → 0, each in its own command. Control: `PropertyPicker` → ≥ 19.
- [ ] Census A returns zero unallowlisted `PickerMenu` mounts for property assignment.
- [ ] Census C returns zero new divergences against the Behavior Ledger.
- [ ] Net source reduction **over 250 lines**, comments and tests excluded, measured with `.claude/scripts/loc.py` — not `wc -l`.
- [ ] All three gates green.

**Verify — user**

- [ ] `PropertiesPM.md` carries a paragraph describing the one value-assign surface.

#### Gate — the fold closes

- [ ] Gate commands green, exit codes read directly.
- [ ] Every task's **Verify — automated** ticked, each against a result just watched.
- [ ] Baseline invariant holds: test count = baseline + 8, no test weakened.
- [ ] Every Now count re-run against its control; matched, or the divergence rewrote the plan.
- [ ] Every Behavior Ledger row confirmed on its surface by reading, each with its new line.
- [ ] `code-simplifier` then `feature-dev:code-reviewer` against the full range; then `build-breaking-agent`.
- [ ] Every concern fixed, or carrying an explicit user ruling recorded in the Log.
- [ ] Hazard window closed by Task 5.
- [ ] Every Made False row rewritten in the commit that falsified it.
- [ ] Progress hashes filled in.

---

## Implementation Log

### Progress

- [ ] **Phase 1** — PropertyPicker becomes the one popup surface · base `<commit>`
  - [ ] Task 1 — target union + chooser pane · `<commit>`
  - [ ] Task 2 — Cards converted; CardPickerHost + CardAddPicker deleted · `<commit>`
  - [ ] Task 3 — Table converted; DatetimeCellPicker deleted · `<commit>`
- [ ] **Phase 2** — PropertyPanel replaces Properties/Page/
  - [ ] Task 4 — PropertyPanel ships; Page/ deleted · `<commit>`
  - [ ] Task 5 — old PropertyPicker props removed · `<commit>`
- [ ] **Phase 3** — The re-fold census
  - [ ] Task 6 — census dispatched, findings folded · `<commit>`
  - [ ] Gate

### Rulings

- **Style files are `.css.ts`.** Nathan's message named `property-panel.css`. Plain CSS cannot compose vanilla-extract's `item` / `titleText`, which is the mechanism behind borrowing from `Menus/`. Raised twice without objection.
- **`sections` cut.** Specified, then withdrawn once the census showed all three callers would pass the default. Returns when a caller needs it.
- **`panelStyle` ships with both callers on `'filled'`**, so nothing moves visually. `groupStandard` is not written until a surface asks for it.
- **Per-surface behavior is correct and preserved.** The link inversion between Cards and Table/panel, Cards' inline alias rename, Table's bar-look number, and the panel's missing `look`/`dateFormat` are all intentional. This plan folds hosts, not behavior.
- **Three defects reported and declined.** The Cards Add ▸ number/file empty pane, the panel's unmount-while-open, and the add-flow's discarded null were raised from the census. Nathan: the first is not real, the second resolves when the panel inherits the new picker, the third is fine. None is a task.

### Open Against Later Tasks

### Deviations

### Lessons

### Sequenced After

- **The write layer.** Three value-write paths; `TableView` uses two of them internally, bypassing `commitValue`'s Context branch for checkbox, file, datetime, url-clear, rename, and both number paths.
- **Number parsing, four writers.** `parseEditorValue` plus two hand-rolled parsers in `TableView` and one discarded-null in the Cards add-flow.
- **The file-menu context, two builders.** `filePick.fileValueMenu` builds its own; `CardValue` and `TableView` build theirs through `cellMenuContextFor` with different flags.
- **The value-click router's two bypasses.** `PagePropertyRows:257` and `TableView:473` send context clicks to the picker without asking `sharedValueClickAction`, which already handles `'context'`.
- **The value right-click menu, three times.** Shared halves are extracted; the branch above them is not.
- **Undo covers only the mass path.** Every single-cell commit on all three surfaces is un-undoable.

### Closeout

---

## Completion Criteria

**The directive**

```
Execute .claude/Planning/PropertyPanel — Implementation Plan.md. Unattended.
Live-verify: the four surfaces' user boxes — inspector, Page Settings ▸ Properties,
  Cards, Table. The only items allowed to stay pending.
Screenshots: none during the run.
Pings: at each phase gate and at completion.
Record: a History entry under the PropertyPanel arc.
Also: Task 6's census is not optional and its findings are not advisory — fold what it
  finds, or record why it is out of scope under Sequenced After.
Everything else is the standard below.
```

**The Standard**

- **The bar.** Not doing the chores — doing the laundry, folding it, picking up what fell out of the hamper, emptying the lint trap, leaving no trace that anything went wrong.
- **Only the live confirmation may be pending.** No concerns carried, no deferrals when the fix is known and could be done now.
- **Reusability first.** Search before writing. A second resolver, cache, or validator means the plan is wrong, or you are — log it before proceeding.
- **No helper that one caller needs.** A one-writer, one-reader extraction is a defect. If a fence in this plan proposes one and the code does not need it, cut it and record the deviation.
- **Fix at the source**, never down-river. Add code only where it repairs something flawed or makes things simpler.
- **Do not fix what is not broken.** Per-surface behavior differences are ratified. A divergence in the Behavior Ledger is a requirement, not a defect.
- **Ambiguity:** take the simplest reading, record it under Rulings, continue. Execution does not stop for input.
- **Per phase:** implement → simplify → comment pass → gates, exit codes read directly and never piped → code review → attack review → every finding fixed or carrying a defensible ruling → commit → ping.
- **Comments** only where the why can't be inferred. **Docs** get rewritten, not amended. Unattributed doc or style edits mid-run belong to the user — fold them in, never revert them.

**Then tick these.**

**The deliverable**

- [ ] Every numbered requirement traces to a landed task.
- [ ] The acceptance criterion observed running, clause by clause.
- [ ] `Core/Properties/Page/` does not exist.
- [ ] `PropertyPicker` is the only component mounting a `PickerMenu` to assign a property value, allowlist aside.
- [ ] Every Behavior Ledger row holds, on its own surface, unchanged.
- [ ] Net source reduction over 250 lines, comments and tests excluded.

**The passes**

- [ ] `code-simplifier` and `comment-killer-agent` over the whole range.
- [ ] `code-simplifier` → `feature-dev:code-reviewer` over the full implementation, in that order.
- [ ] Delivery Claim written, then checked by a neutral verifier against this plan's Requirements.
- [ ] `build-breaking-agent` dispatched after the claim is verified, never in the same brief.
- [ ] Every finding fixed, or carrying a defensible ruling.

**The user's own pass**

- [ ] Page window inspector and NavWindow inspector: rows, values, clear, Add, checkbox reveal, right-click Clear vs Remove.
- [ ] Page Settings ▸ Properties: pre-seeded Contexts, set-aside and return, row entrance, 350px ceiling.
- [ ] Cards: centred pickers, link address popup, inline alias rename, the file pane's Browse and typed path, the two-stage add picker.
- [ ] Table: date cell in column format, bar-look number suffix field, alias rename popup, inline address editing, browser-opening urls, mass-select fan-out.

**The record**

- [ ] Documents made false rewritten in the commits that falsified them.
- [ ] The closing sweep at zero against its control.
- [ ] `ContextPM.md` and `HandoffPM.md` current; the History entry written to its format.
- [ ] Lessons routed to `.claude/Guidelines/`; successor work named in Sequenced After.

**The report**, in plain English — what shipped and why it matters · what the census found and what was folded because of it · every gate's real output · in-flight decisions · what's left for the live pass · final +/- line count, comments and tests excluded. Honest about what didn't work.
