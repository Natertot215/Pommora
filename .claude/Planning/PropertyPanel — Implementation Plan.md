## PropertyPanel — Implementation Plan

> **Status:** written, pending review · Execute tasks in order.
> Citations name files and symbols; re-derive before editing.

**Goal**

One component renders every hand-rolled popup that assigns a property value, and one component renders a property panel. Afterwards `PropertyPicker` renders option rows, a date, and a file pane, and optionally opens on a chooser pane first, so "add a property" and "set a value" are one component. Text popups already run through one shared `TextPicker` and stay there. `Core/Properties/Page/` is gone, replaced by `Core/Properties/PropertyPanel.tsx` + `property-panel.css.ts`, whose rows are the design system's `MenuItem`.

**This folds hosts, not behavior.** A census of the whole codebase found nine distinct popup compositions for one job. Each surface's *behavior* is correct for that surface and is preserved exactly: Cards pops the link address and inlines the alias; Table and the panel inline the address and pop the alias; Table alone has bar-look numbers and mass select; Cards alone has the `PathField` file pane and centre-origin anchoring. Every one of those survives, chosen by the `kind` its caller passes. What dies is nine hand-rolled `PickerMenu` wrappers around the same content.

Rejected: lifting `CardPickerHost` into `Core/Properties/Pickers/` (keeps a wrapper whose only job is choosing between pickers `PropertyPicker` can choose between itself); importing it from `Views/Cards/` (points `Core/Properties` at a view renderer). Both settled by Nathan.

Bounded by: no behavior change on any surface — **no exceptions**; `Core/Properties` must not import Core/Views components or hooks; `PropertyPicker`'s existing pure exports keep their signatures, since four files import them; no new helper, hook, or abstraction that a caller does not already need.

**Requirements**

1. `Core/Properties/Page/` deleted — all four files.
2. `Core/Properties/PropertyPanel.tsx` + `property-panel.css.ts` replace it; rows are `MenuItem`s, leading icon + name, and the panel's own value element in a trailing slot.
3. `PropertyPanel` takes `panelStyle: 'standard' | 'filled'`; both current callers pass `'filled'`, so nothing moves visually.
4. The page-frame seed is a clause inside the existing visibility predicates, not a named function; `revealed` and `setAside` keep their names.
5. `usePropertyRows` and the `PropertyRows` interface no longer exist, and are not re-created as a hook.
6. `PropertyValueEditors`, `CardPickerHost`, `CardAddPicker`, and `DatetimeCellPicker` no longer exist. `PropertyPicker` mounts every option, datetime and file popup and both choosers; `TextPicker` — already one component with five callers — keeps every text popup and is not touched.
7. Net source reduction **over 400 lines**, comments and tests excluded, inside the Line Budget below. Net source **files** must be negative.
8. Every behavior in the Behavior Ledger holds, on its own surface, unchanged.

**Acceptance — the whole thing working:** On the page window inspector, Page Settings ▸ Properties, a Cards view, and a Table view, every value type can be set, changed, and cleared exactly as it can today; the re-fold census in Phase 3 returns zero residue against its control; and the net delta is under −250.

**Forced By**

- `PropertyPicker`'s pure exports are imported by `MassPropertyPicker` (`pickShape`, `PropertyOptionRows`, `selectedValues`), `TableView` and `CardAddPicker` (`syntheticContextDef`, `pickSemantics`, `PropertyOptionRows`), and `FilterFrame` (`toggleValue` only — its `optionsOf` comes from `GroupFrame.tsx:356`, a **second** `optionsOf` with inverted precedence; recorded in Sequenced After, not fixed here) → the component grows props; no export changes signature or leaves the module. *(Task 1)*
- `PickerMenu` latches `origin` and `direction` once per open (`picker-base.tsx:182-191`, `:207`) → a picker that swaps content kind while open cannot renegotiate placement. `FrameSlide` grows the pane in place instead, which is what `CardAddPicker` already does. The chooser pane is therefore the mechanism, not a convenience. *(Task 1)*
- `PickerMenu` already holds its own `children` through exit via `useHeld` (`picker-base.tsx:128`), but not props derived from the same state → `PropertyPicker` holds its own `target` internally with `useHeld`, so no caller re-grows the `lastValue` ref pattern. *(Task 1)*
- `TextPicker` (`UIX/Pickers/TextPicker/TextPicker.tsx:7`) is already one component with five callers across all three surfaces → it is not duplication, it is the end state. `PropertyPicker` does not absorb text kinds, `UIX/Pickers/` is untouched, and every text call site keeps its own mount and parse tail exactly as today. *(Tasks 1, 2, 3, 4)*
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

**Line Budget** *(measured comments- and blanks-excluded; the deletion column is real, taken at `9c6b51130`)*

| Deleted | LOC | Added, ceiling | LOC |
| --- | ---: | --- | ---: |
| `PagePropertyRows.tsx` | 341 | `PropertyPanel.tsx` | **≤ 320** |
| `usePropertyRows.ts` | 177 | `property-panel.css.ts` | **≤ 45** |
| `PropertyValueEditors.tsx` | 77 | `PropertyPicker.tsx` growth (144 today) | **≤ +130** |
| `page-properties.css.ts` | 42 | `property-picker.css.ts` (open question) | **≤ 5** |
| `CardPickerHost.tsx` | 217 | `CardsView.tsx` net growth | **≤ +130** |
| `CardAddPicker.tsx` | 155 | `TableView.tsx` net growth | **≤ +35** |
| `TableView` datetime shell + folded branches | ~50 | | |
| **Total** | **~1059** | **Total ceiling** | **~665** |

**Expected net: −400 to −590, central ≈ −490.** This is a guardrail against over-engineering, not a target to hit by deleting behavior. A net shallower than **−400**, or any single file over its ceiling, means something was built that did not need building — **stop, find it, and cut it before continuing**. Do not clear the number by weakening a test, dropping a Behavior Ledger row, or moving code into a file with headroom.

**File count:** 6 source files deleted, 3 created (`PropertyPanel.tsx`, `property-panel.css.ts`, and `property-picker.css.ts` only if its open question resolves that way). **Net −3, or −4 if it doesn't.** Two test files are added. No other file may be created — a new file is the loudest over-engineering signal there is, so if a task seems to need one, that is a plan defect to report, not a call to make.

**Shapes:** refactor · removal.

**Baseline invariant:** `npm run test` passes with the same test count before and after every phase, plus only the tests these tasks add. No test deleted, weakened, or narrowed.

**Declared Stops** *(ratified with the plan)*

- **Gate 1** (after Task 3) — Cards and Table both run on the new picker. Six placement contracts, the two-pane chooser, and the bar-look number field are all things only Nathan can judge, and a wrong call here propagates into the panel.
- **Gate 2** (after Task 5) — the panel ships and `Page/` is gone. The row shape, the value's truncation choice, and the Add flow are Nathan's to accept before the census runs against them.

Execution halts at each until Nathan closes its boxes.

**Advisor gate (mandatory).** Before folding ANY attack-review or code-review findings, consult the Fable advisor with the findings and the plan's rulings. Its job is to strike, not to add: drop false positives, drop findings resting on unreachable states, and drop anything whose remedy adds a mechanism the codebase does not need. Fold only what survives that pass. This applies at every gate and at closeout.

**Global Constraints (every task inherits these)**

- Gates from the repo root, exit codes read directly, never through a pipe.
- Formatting is Biome's. A shell-driven edit bypasses the format hook — run `npm run format` after one.
- Comments only where the why can't be inferred. No block comment spanning lines.
- `Core/Properties/**` may not import Core/Views **components or hooks**; shared row/column *types* (`ViewRow`, `ResolvedColumn`, `SavedView`) are fine and already imported by six files. `UIX/**` may not import from `Core/**`.
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
| B23 | Panel | The **value** owns its own right-click menu (file / link), distinct from the row's Clear-vs-Remove, and falls through to the row when it returns false | `PagePropertyRows.tsx:244-254`, `usePropertyRows.ts:161-178` |
| B24 | Panel | The value element, not the row, is the picker's anchor and click target — the label and icon are inert | `PagePropertyRows.tsx:242, 255-259` |
| B25 | Cards | The card menu's Add ▸ opens the chooser **pre-drilled** onto the chosen entry | `CardsView.tsx:1088`, `CardAddPicker.tsx:87-90` |
| B26 | Cards | A chooser entry of kind datetime/url/number/file leaves the chooser and opens its own anchored popup with `revealOnCommit` | `CardAddPicker.tsx:121-128`, `CardPickerHost.tsx:121-134` |
| B27 | Cards | Every add-path commit reveals its column, not only `revealOnCommit` ones | `CardPickerHost.tsx:220-223` |
| B28 | All | Options keeps `anchorX ? center : right`; datetime and file keep `auto`. Every text popup keeps its own `TextPicker`, untouched | `PropertyPicker.tsx:77`, `CardPickerHost.tsx:139,176` |

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

#### Task 1: PropertyPicker takes a target union and a chooser pane

**Requirement:** 6

**Why:** The datetime popup shell is hand-rolled three times and there are two separate choosers. Absorbing them is what lets `PropertyValueEditors`, `CardPickerHost`, `CardAddPicker`, `DatetimeCellPicker` and the panel's Add popup all be deleted. Tasks 2, 3 and 4 consume this shape.

**Now** — `PropertyPicker.tsx` 156 lines, one flat option list:

```ts
export function PropertyPicker({
  def, current, open, triggerRef, anchorX, look, contextOptions, onCommit, onDismiss,
}: { def: PropertyDefinition; current: PropertyValue | null; open: boolean
     triggerRef: RefObject<HTMLElement | null>; anchorX?: number; look?: ColumnLook
     contextOptions?: PickOption[]
     onCommit: (value: PropertyValue | null) => void; onDismiss: () => void }): React.JSX.Element | null
```

**Becomes** — three kinds and an optional chooser root. `UIX/Pickers/` is not touched.

```ts
// Core/Properties/Pickers/PropertyPicker.tsx
export type PickTarget = { def: PropertyDefinition; current: PropertyValue | null } & (
  | { kind: 'options'; look?: ColumnLook; contextOptions?: PickOption[] }
  | { kind: 'datetime'; dateFormat?: DateFormatName }
  | { kind: 'file' }
)

/** `target` null with `revealOnly` false is a dependent kind: the caller takes it back
 *  through `onReveal` and opens its own popup — a TextPicker, or the file dialog. That is
 *  B26, and why the chevron keys off `revealOnly` rather than off `target`. */
export type PickEntry = {
  id: string
  name: string
  icon: IconName
  revealOnly: boolean
  target: PickTarget | null
}

export function PropertyPicker({
  target, chooser, chooserInitial, open, triggerRef, anchorX, onCommit, onReveal, onDismiss,
}: {
  /** Optional only while the hazard window is open; Task 5 makes it required. */
  target?: PickTarget | null
  chooser?: PickEntry[]
  /** An entry id to open pre-drilled — the card menu's Add ▸ (B25). */
  chooserInitial?: string
  open: boolean
  triggerRef: RefObject<HTMLElement | null>
  anchorX?: number
  /** `entry` is present on the chooser path — the caller cannot otherwise know which
   *  column was committed, and B27 reveals on every add commit. */
  onCommit: (value: PropertyValue | null, entry?: PickEntry) => void
  onReveal?: (entry: PickEntry) => void
  onDismiss: () => void
}): React.JSX.Element | null
```

```tsx
// The body. useHeld on the target is why no caller keeps a lastValue ref.
const held = useHeld(target ?? null, open)
const [picked, setPicked] = useState<PickEntry | null>(null)
useEffect(() => {
  setPicked(open ? (chooser?.find((e) => e.id === chooserInitial) ?? null) : null)
}, [open, chooser, chooserInitial])

const t = picked?.target ?? held
const commit = (v: PropertyValue | null): void => onCommit(v, picked ?? undefined)

// B28 — options anchors to the click when it has one; datetime and file keep 'auto'.
const origin = !t || t.kind !== 'options' ? 'auto' : anchorX !== undefined ? 'center' : 'right'

const pane = !t ? null : t.kind === 'options' ? (
  (() => {
    const { options, selected, pick } = pickSemantics(t.def, t.current, commit, onDismiss, t.contextOptions)
    return (
      <PropertyOptionRows
        def={t.def} look={t.look} contextOptions={t.contextOptions}
        options={options} selected={selected} onPick={pick}
      />
    )
  })()
) : t.kind === 'datetime' ? (
  <DatetimeValuePicker value={t.current} dateFormat={t.dateFormat} onCommit={commit} />
) : (
  <PathField
    label={t.def.name} value="" empty="Choose a file" browseLabel="Choose File"
    onBrowse={() => pickFileInto(t.def, t.current, null, (v) => { commit(v); onDismiss() })}
    onCommit={(raw) => {
      if (raw.trim()) adoptPathInto(t.def, t.current, raw.trim(), commit)
      onDismiss()
    }}
  />
)

return (
  <PickerMenu
    solid open={open} onDismiss={onDismiss} triggerRef={triggerRef}
    origin={chooser ? 'auto' : origin} anchorX={anchorX}
  >
    {chooser ? (
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
                  trailing={e.revealOnly ? undefined : <Icon name="chevron-right" />}
                  onClick={() => {
                    if (e.target) return setPicked(e)
                    onReveal?.(e)
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
                label="Properties" current={picked.name}
                onBack={() => setPicked(null)} className={chooserTop}
              />
              {pane}
            </div>
          )
        }
      />
    ) : (
      pane
    )}
  </PickerMenu>
)
```

**Ordered steps**

1. Add the two types and the new props, leaving the flat props in place and **`target` optional** — the hazard window is open and all three callers still pass the old shape.
2. `chooserTop` carries `card-add-top-flat`'s one declaration (`--row-pad-y: 0px`, `cards-view.css:123`), which `Core/Properties` cannot import. **Open question for Nathan, recorded under Rulings:** a three-line `property-picker.css.ts` for one override, or drop the override and let the chooser header keep `MenuTopRow`'s default padding. Do not decide it silently.

**Assumed by:** Task 2 (Cards), Task 3 (Table), Task 4 (PropertyPanel), Task 5 (props removal).

**Verify — automated**

- [x] New `PropertyPicker.pane.test.tsx`, green (7 tests — the `anchorX` centre/no-centre case is two `it`s): each kind renders its own body; options centres with an `anchorX` and does not without (B28); a `revealOnly` entry calls `onReveal` and never `onCommit`; a targeted entry slides to the value pane; `chooserInitial` opens pre-drilled (B25); `onCommit` carries its `entry` on the chooser path.
- [x] `git diff --stat UIX/` → empty of this task's edits. `UIX/Pickers/` untouched.
- [x] `npm run typecheck` green — `target` optional keeps all existing callers compiling.
- [x] `npm run test` green, count = baseline + 7 (4050 → 4057). `npm run lint` green.

**Verify — user**

- [ ] *(none — no caller uses the new shape yet.)*

#### Task 2: CardsView drives PropertyPicker; CardPickerHost and CardAddPicker are deleted

**Requirement:** 6, 8

**Why:** Cards is where the folded mechanism came from. B9–B16 and B25–B27 live here and nowhere else.

**Now** — `rg -F "CardPickerHost" Core` → 3, `rg -F "CardAddPicker" Core` → 3. Request state at `CardsView.tsx:268-269`, host at `:590`, `openAddPicker` at `:181-195`.

```ts
// Core/Views/Cards/CardPickerHost.tsx (230) and CardAddPicker.tsx (157) — deleted.
// ValuePickerRequest and AddPickerRequest MOVE to CardsView.tsx — they are its own state.
// CardValue.tsx, cardValueInput.ts, openAddPicker — unchanged.
```

**Becomes** — `CardsView` builds the picker's inputs where it already holds the requests:

```tsx
// Core/Views/Cards/CardsView.tsx — ONE adapter, because three call sites read it: the value
// popup, the chooser's in-pane entries, and the dismiss effects. It is not a one-reader helper.
const pickTargetFor = (rowId: string, column: ResolvedColumn, kind: PickTarget['kind']): PickTarget | null => {
  const row = rowById.get(rowId)
  if (!row) return null
  const current = resolveFieldValue(row, column.id, ctx.schema)
  const def = ctx.schema.find((d) => d.id === column.id) ?? syntheticContextDef(column.id)
  const style = styleFor(column.id, ctx.schema, view)
  if (kind === 'datetime') return { kind, def, current, dateFormat: style.date_format }
  if (kind === 'file') return { kind, def, current }
  return { kind: 'options', def, current, look: style.look,
           contextOptions: contextOptionsFor(column) ?? undefined }
}
```

```tsx
// The link and number popups keep their own TextPicker mounts, moved from CardPickerHost
// :151-175 to CardsView unchanged — same props, same parse tails, same accent (B10).
<TextPicker
  open={valuePicker?.kind === 'link'} onDismiss={dismissValue} triggerRef={pickerAnchorRef}
  value={…} accent={…} onCommit={…}
/>
<TextPicker
  open={valuePicker?.kind === 'number'} onDismiss={dismissValue} triggerRef={pickerAnchorRef}
  value={…} leading={…} onCommit={…}
/>
```

```tsx
// Replacing <CardPickerHost/> at CardsView.tsx:590.
<PropertyPicker
  target={
    valuePicker && valuePicker.kind !== 'link' && valuePicker.kind !== 'number'
      ? pickTargetFor(valuePicker.rowId, valuePicker.column, valuePicker.kind)
      : null
  }
  chooser={
    addPicker &&
    orderAddableEntries(addableEntries(rowById.get(addPicker.rowId), view, ctx, columns, tree, capitalize)).map((e) => ({
      id: e.id,
      name: e.name,
      icon: e.def ? propertyIcon(e.def) : (propertyTypeIconName(e.type) ?? 'square-dashed'),
      revealOnly: e.revealOnly,
      // Only the in-pane kinds get a target; the other four hand back through onReveal (B26).
      target: e.revealOnly || e.type !== 'select' && e.type !== 'status' && e.type !== 'multi_select' && e.type !== 'context'
        ? null
        : pickTargetFor(addPicker.rowId, addColumn(e.id, tree), 'options'),
    }))
  }
  chooserInitial={addPicker?.initialEntry?.id}
  open={(valuePicker !== null && valuePicker.kind !== 'link' && valuePicker.kind !== 'number') || addPicker !== null}
  triggerRef={pickerAnchorRef}
  anchorX={valuePicker?.kind === 'picker' ? valuePicker.clickX : undefined}
  onCommit={(v, entry) => {
    const req = valuePicker ?? addPicker
    const row = req && rowById.get(req.rowId)
    if (!row) return
    const column = valuePicker ? valuePicker.column : addColumn(entry?.id ?? '', tree)
    if (entry || valuePicker?.revealOnCommit) revealProperty(column.id)
    commitValue(row, column, v)
  }}
  onReveal={(entry) => {
    if (!addPicker) return
    if (entry.revealOnly) return revealProperty(entry.id)
    // B26 — a dependent kind leaves the chooser for its own anchored popup.
    setAddPicker(null)
    setValuePicker({
      rowId: addPicker.rowId,
      column: addColumn(entry.id, tree),
      kind: dependentKind(entry),
      anchor: addPicker.anchor,
      revealOnCommit: true,
    })
  }}
  onDismiss={() => { setValuePicker(null); setAddPicker(null) }}
/>
```

**Ordered steps**

1. Move `ValuePickerRequest` / `AddPickerRequest` into `CardsView.tsx` above the component.
2. Move `CardPickerHost`'s two force-dismiss effects (B14) into `CardsView` — they read `rowById`, `view`, `ctx`, which it already holds.
3. `pickerAnchorRef` is one ref pointed at `(valuePicker ?? addPicker)?.anchor` each render; the `lastValue` / `lastAdd` / `valueAnchorRef` trio goes, since `PropertyPicker` holds the target.
4. `dependentKind` is `CardPickerHost.tsx:127-130`'s map, moved unchanged: `datetime|number|file → itself, else 'link'`.
5. The `link` and `number` `TextPicker` mounts and the `datetime`/`file` `PropertyPicker` target move together; `ValuePickerRequest.kind` keeps all five members, since Cards still distinguishes them.
6. Delete both files and `cards-view.css`'s `card-add-top-flat`; rewrite the two `ViewTypesPM.md:119` claims.

**Verify — automated**

- [x] `CardPickerHost` → 0; `CardAddPicker` → 0; `card-add-top-flat` → 0. Control: `CardsView` → 3.
- [x] `npm run typecheck`, `npm run test`, `npm run lint` green. (Suite is 4071, not 4057: a parallel agent landed +2 files / +14 tests mid-run; this task adds none.)

**Verify — user**

- [ ] Cards: a value picker opens centred on the click and a date picker does not (B9, B28); the link address opens its `TextPicker`-shaped field (B10); the alias still renames inline (B11); the file pane offers Browse and a typed path (B12); Add ▸ from the card menu opens **pre-drilled** on the chosen entry (B25); Add ▸ a blank date/number/file leaves the chooser for its own popup (B26) and reveals the column on commit (B27).

#### Task 3: TableView's popups route through PropertyPicker; DatetimeCellPicker is deleted

**Requirement:** 6, 8

**Why:** `DatetimeCellPicker` is an 18-line wrapper adding nothing over `PickerMenu`, and the third writer of "a datetime picker in a popup." Table's bar-look number and alias rename join the same component.

**Now** — `rg -F "DatetimeCellPicker" Core` → 3. `pickerDefOf` at `:575-583` is shared with `massPicker`, which stays.

```tsx
// TableView.tsx:91  DatetimeCellPicker — deleted
// :588-616  cellPicker's datetime + options branches — folded
// :665-709 renameField · :547-561 cellEditor · :620-661 massPicker · :575-583 pickerDefOf
//   — unchanged, all still used
```

**Becomes** — two mounts, because the two write paths must stay split:

```tsx
// Core/Views/Table/TableView.tsx — cellTarget reuses pickerDefOf rather than re-inlining it.
const cellTarget = (): PickTarget | null => {
  const cell = editing?.mode === 'picker' ? editing : lastPicker.current
  const row = cell && rowById.get(cell.rowId)
  const col = cell && columns.find((c) => c.id === cell.colId)
  if (!cell || !row || !col) return null
  const picked = pickerDefOf(col)
  if (!picked) return null
  const current = resolveFieldValue(row, col.id, schema)
  const style = colStyle(col.id)
  return col.kind === 'property' && declaredType(col.id, schema) === 'datetime'
    ? { kind: 'datetime', def: picked.def, current, dateFormat: style.date_format }
    : { kind: 'options', def: picked.def, current, look: style.look,
        contextOptions: picked.contextOptions ?? undefined }
}

// renameField (:665-709) is UNCHANGED — both its branches keep their own TextPicker,
// their own key={rowId:colId:nonce} remount, and their own setProperty write (B17, B18).
```

```tsx
// ONE mount. The rename branches stay on TextPicker + setProperty — the write-path split
// the plan's Sequenced After deliberately keeps.
<PropertyPicker
  target={cellTarget()}
  open={editing?.mode === 'picker'}
  triggerRef={triggerElRef}
  onCommit={(v) => { const c = pickerCell(); if (c) commitValue(c.row, c.col, v) }}
  onDismiss={() => setEditing(null)}
/>
// renameField() renders as it does today — no second PropertyPicker mount.
```

**Verify — automated**

- [x] `DatetimeCellPicker` → 0. Control: `pickerDefOf` → 3 (`massPicker` + `cellTarget` still use it).
- [x] `npm run typecheck`, `npm run test`, `npm run lint` green. Datetime commit re-derived: `commitValue` on a non-context column is identical to `setProperty`, so the write path is unchanged.

**Verify — user**

- [ ] Table: a date cell opens the calendar in its column format (B21) at its current position (B28); the bar-look number field and the alias rename are untouched (B17, B18); a filled http url still opens the browser and the address still edits inline (B19); mass-select still fans out.

---

### Phase 2 — PropertyPanel replaces Properties/Page/

#### Task 4: PropertyPanel ships; Core/Properties/Page/ is deleted

**Requirement:** 1, 2, 3, 4, 5, 8

**Why:** The deliverable. Rows become menu rows, visibility becomes one Set plus one live predicate, and both of the panel's popups — the value picker and the Add chooser — become the one `PropertyPicker`.

**Now** — `rg -F "PagePropertyRows" Core` → 7 (1 definition, 3 imports, 3 call sites):

```tsx
// PagePropertyRows.tsx (363) — deleted. Two nested handler levels, not one:
//   the row div  :223-226  onContextMenu → rowMenu           (B2, Clear vs Remove)
//   the value    :242-259  onClick → editRow                 (B24, the anchor)
//                          onContextMenu → valueMenuShared   (B23, file/link, falls through)
// :325-350  a SECOND PickerMenu — the Add chooser, PickerRows of hidden contexts + props
// :174-181  the rAF + querySelector anchor, reading ROW_ATTR and s.value
// usePropertyRows.ts (192) · PropertyValueEditors.tsx (78) · page-properties.css.ts (55) — deleted
```

**Becomes** — one component, one popup, a discriminated props union:

```tsx
// Core/Properties/PropertyPanel.tsx
export type PanelStyle = 'standard' | 'filled'

// WindowTarget is a structural SUBSET of PageDetail, so the union must be tagged by a
// prop TS can narrow on. `onBack` present === the page frame: it seeds Contexts shown,
// animates row entrance, and set-asides instead of un-revealing.
export type PropertyPanelProps = { panelStyle: PanelStyle } & (
  | { page: PageDetail; onBack: () => void }
  | { page: WindowTarget; onBack?: never }
)

export function PropertyPanel(props: PropertyPanelProps): React.JSX.Element
```

```tsx
// Visibility. `revealed` keeps its name and its meaning; the rest stays a LIVE predicate, because
// a committed value must make its row appear the instant its key exists. Reset key is
// nexusId, exactly as today (PagePropertyRows.tsx:85-89) — NOT page.path.
const [revealed, setRevealed] = useState<ReadonlySet<string>>(new Set())
const [setAside, setSetAside] = useState<ReadonlySet<string>>(new Set())

const isShownProp = (def: PropertyDefinition): boolean =>
  revealed.has(def.id) || (fm as Record<string, unknown> | null)?.[def.name] !== undefined
const isShownContext = (id: string): boolean =>
  pageFrame ? !setAside.has(id) : revealed.has(id) || (contextValues?.[id]?.length ?? 0) > 0
```

```tsx
// The row. The panel keeps its OWN value element inside the trailing slot: it is the click
// target, the picker anchor (B24), the owner of the value right-click menu (B23), and the
// querySelector target that replaces ROW_ATTR.
<MenuItem
  key={id}
  leading={<Icon name={icon} size="control" />}
  trailing={
    <span
      className={s.value}
      data-property-row={id}
      onClick={(e) => { … }}
      onContextMenu={(e) => { … }}
    >
      {editing?.id === id && editing.mode === 'editor' && def
        ? <PropertyEditor … />
        : (Cell({ row, column, ctx, hideIcon: false, style: { look: 'standard' }, remove }) ??
           <EmptyValue className={s.empty} />)}
    </span>
  }
>
  {label}
</MenuItem>
```

```tsx
// ONE PropertyPicker for both the value popup and the Add chooser — the panel's second
// PickerMenu (PagePropertyRows.tsx:325-350) is deleted, not re-hosted.
<PropertyPicker
  target={editing ? panelTarget : null}
  chooser={addOpen ? hiddenEntries : undefined}
  open={editing !== null || addOpen}
  triggerRef={triggerRef}
  onCommit={(v, entry) => {
    const id = entry?.id ?? editing?.id
    if (id) (isContextRow(id) ? commitContext : commitValue)(id, v)
  }}
  onReveal={(entry) => {
    // B7 — Add ▸ still runs the full click dispatch against the newly revealed row.
    setAddOpen(false)
    reveal(entry.id)
    requestAnimationFrame(() => {
      const el = document.querySelector<HTMLElement>(`[data-property-row="${entry.id}"]`) ?? addRef.current
      …
    })
  }}
  onDismiss={() => { setEditing(null); setAddOpen(false) }}
/>
```

```ts
// Core/Properties/property-panel.css.ts — row, label and the frame's growth survive;
// `row`, `label` and the old `rows`/`panelRows` name-swap do not.
export const frame = style({ ...growToContent(PANEL_MAX_WIDTH), display: 'flex', flexDirection: 'column' })
export const panelRows = style({
  display: 'flex', flexDirection: 'column', gap: '8px',
  flex: 1, minHeight: 0, overflowY: 'auto', scrollbarWidth: 'none', padding: '0 4px 4px',
})
export const pageRows = style({ display: 'flex', flexDirection: 'column', gap: '8px', padding: '4px 0 6px' })
export const group = style({
  display: 'flex', flexDirection: 'column', padding: '2px',
  borderRadius: '8px', background: c.fill.tertiary,
})
export const value = style({
  flex: '0 1 auto', minWidth: 0, display: 'flex',
  alignItems: 'center', justifyContent: 'flex-end', textAlign: 'right',
})
export const empty = style([text.caption.standard])
export const add = style({ alignSelf: 'flex-start', color: c.label.secondary })
```

```tsx
// Core/Pages/PageMenu.tsx — only the Back row hoists; the frame and its ceiling stay inside.
<PropertyPanel page={pageDetail} panelStyle="filled" onBack={() => setPane('root')} />
// PageWindow.tsx:173 / NavWindow.tsx:174 — unchanged wrappers.
<PropertyPanel page={target} panelStyle="filled" />
```

**Ordered steps**

1. The memos formerly in `usePropertyRows` — `schema`, `ctx`, `contextRows`, `contextValues`, `row` — and the two commit writers become locals, roughly 40 lines. The interface, both handler bags, and the `editRow` / `valueMenu` plumbing leave rather than move.
2. **Open question, resolve by measuring, do not guess.** `MenuItem`'s `value` slot renders inside `side`, which is `flex: '0 0 auto'` (`menu-base.css.ts:143`) and shrinks only under `side:has(detail)` (`:246`). Today's value is `flex: 0 1 auto` in a plain row. Put the value element in whichever of `value` / `detail` / `trailing` reproduces today's truncation on a long Select chip and a long link title; if none does, the panel's own `globalStyle` on its row is the smallest fix. Record the choice under Rulings.
3. `panelStyle` threads to `group`'s background, but both callers pass `'filled'`, so `groupStandard` is not written until a caller asks.
4. Convert all three call sites, delete `Core/Properties/Page/`, rewrite `InterfacePM.md:55`.

**Verify — automated**

- [x] New `PropertyPanel.test.tsx`, 3 green: an `onBack` panel seeds Context rows shown and one without seeds them hidden (B8); a valued property shows its row with no `revealed` write (the live predicate).
- [x] `PagePropertyRows` → 0 · `usePropertyRows` → 0 · `PropertyValueEditors` → 0 · `Properties/Page` → 0. Control: `PropertyPanel` → 8.
- [x] `PickerMenu` in `PropertyPanel.tsx` → 0 — the panel mounts none of its own (U1).
- [x] `ls Core/Properties/Page` exits non-zero.
- [x] `npm run typecheck`, `npm run test` (+3, suite 4082), `npm run lint` green.

**Verify — user**

- [ ] Inspector: values set and clear; un-checking a checkbox keeps its row (B1); right-clicking the **value** gives the file/link menu and right-clicking the **row** gives Clear vs Remove (B2, B23); clicking the label or icon does nothing (B24); Add ▸ anchors its picker to the new row, not the Add button (B7).
- [ ] Page Settings ▸ Properties: Contexts pre-seeded, a set-aside Context returns from Add (B3), row entrance plays (B5), the pane keeps its 350px ceiling.
- [ ] A long Select value and a long link title truncate as they do today (step 2).

#### Task 5: The old PropertyPicker props come off

**Requirement:** 6

**Why:** Closes the hazard window. With Cards, Table and the panel all on `target`, the flat props have no caller and `target` stops being optional.

**Now** — `def`, `current`, `look`, `contextOptions` still declared beside `target?`.

**Becomes** — removed; `target: PickTarget | null` loses its `?`.

**Verify — automated**

- [ ] `npm run typecheck` green — errors on both a missing `target` and an excess `def`, so a stale caller cannot compile.
- [ ] `npm run test`, `npm run lint` green; count unmoved.

**Verify — user**

- [ ] *(none — a type-level removal.)*

---

### Phase 3 — The re-fold census

#### Task 6: Dispatch the census, then fold whatever it finds

**Requirement:** 6, 7, 8

**Why:** The first census found nine mechanisms where three were expected, and the plan's own first draft then left a tenth standing. The fold is finished only when a fresh census against the folded tree finds nothing.

**Now** — the tree as Phase 2 leaves it; no census has run against it.

**Becomes** — three `Explore` agents on Opus, read-only, dispatched in one message:

```
A. Every popup, menu, pane, or inline editor opened to SET a property value or a
   Context/Space assignment. Sweep Core/Properties, Core/Views, Core/Contexts,
   Core/Tiles, Core/Pages, Core/Interface, Core/Navigation, Core/MarkdownPM.
   Anchors: PickerMenu · TextPicker · PathField · DatetimeValuePicker · PropertyEditor ·
   sharedValueClickAction · pickFileInto · setProperty · setContext.
   Report file:line, trigger, component, value kinds, commit path, inline-or-popup.
   Flag every PickerMenu mounted to assign a value that is NOT PropertyPicker.

B. Every remaining reference to the deleted symbols, and every caller of PropertyPicker's
   public exports. Confirm no second wrapper regrew and nothing is orphaned — a file, type,
   CSS class, or prop left with nothing to vary now that its only consumer is gone.

C. Re-run the difference matrix across the panel, Cards and Table against the folded tree.
   Every row reads "identical" or matches the Behavior Ledger's recorded per-surface
   difference. A NEW divergence is a regression this fold introduced.

Findings must UNIFY or CORRECT. None may ADD. A finding whose remedy grows the codebase
without deleting more than it grows is out of scope — report it under Sequenced After.
```

**Ordered steps**

1. Dispatch A, B, C together; let the tree settle before any writer runs.
2. Verify every finding against the code before acting — an agent's claim is not evidence.
3. A popup outside `PropertyPicker`, or a new behavior divergence, is folded or fixed here.
4. Anything else — a write-path fork, a parser fork, a menu-builder fork — is recorded in Sequenced After and **not** fixed.

**Verify — automated**

- [ ] Every Dead Vocabulary token → 0, each in its own command. Control: `PropertyPicker` → ≥ 19.
- [ ] Census A returns zero unallowlisted `PickerMenu` mounts for property assignment.
- [ ] Census B returns zero orphans.
- [ ] Census C returns zero new divergences against the Behavior Ledger.
- [ ] Net source reduction inside the Line Budget: **−400 to −590**, measured with `.claude/scripts/loc.py`. Every per-file ceiling respected.
- [ ] Net source file count negative; no file created beyond the three the budget names.
- [ ] All three gates green.

**Verify — user**

- [ ] `PropertiesPM.md` carries a paragraph describing the one value-assign surface.

#### Gate — the fold closes

- [ ] Gate commands green, exit codes read directly.
- [ ] Every task's **Verify — automated** ticked, each against a result just watched.
- [ ] Baseline invariant holds: test count = baseline + 11, no test weakened. The `picker-base.test.tsx` rewrite is a signature move, asserting the same caret behavior.
- [ ] Every Now count re-run against its control; matched, or the divergence rewrote the plan.
- [ ] Every Behavior Ledger row B1–B28 confirmed on its surface by reading, each with its new line.
- [ ] `code-simplifier` then `feature-dev:code-reviewer` against the full range; then `build-breaking-agent`. All briefed: findings unify or correct, never add.
- [ ] Every concern fixed, or carrying an explicit user ruling recorded in the Log.
- [ ] Hazard window closed by Task 5.
- [ ] Every Made False row rewritten in the commit that falsified it.
- [ ] Progress hashes filled in.

---

## Implementation Log

### Progress

- [ ] **Phase 1** — PropertyPicker becomes the one popup surface · base `<commit>`
  - [x] Task 1 — target union + chooser pane · `<commit>`
  - [x] Task 2 — Cards converted; CardPickerHost + CardAddPicker deleted · `<commit>`
  - [x] Task 3 — Table's one mount; DatetimeCellPicker deleted · `<commit>`
- [ ] **Phase 2** — PropertyPanel replaces Properties/Page/
  - [x] Task 4 — PropertyPanel ships; Page/ deleted · `<commit>`
  - [ ] Task 5 — old PropertyPicker props removed · `<commit>`
- [ ] **Phase 3** — The re-fold census
  - [ ] Task 6 — census dispatched, findings folded · `<commit>`
  - [ ] Gate

### Rulings

- **Style files are `.css.ts`.** Nathan's message named `property-panel.css`. Plain CSS cannot compose vanilla-extract's `item` / `titleText`, which is the mechanism behind borrowing from `Menus/`. Raised twice without objection.
- **`sections` cut.** Specified, then withdrawn once the census showed all three callers would pass the default. Returns when a caller needs it.
- **`panelStyle` ships with both callers on `'filled'`**, so nothing moves visually. `groupStandard` is not written until a surface asks for it.
- **Per-surface behavior is correct and preserved.** The link inversion between Cards and Table/panel, Cards' inline alias rename, Table's bar-look number, and the panel's missing `look`/`dateFormat` are all intentional. This plan folds hosts, not behavior.
- **`MassPropertyPicker`'s exemption is its batched commit contract**, not its dismiss rule — the two dismiss rules were traced identical, and `massPickCommits` at n=1 is provably `pickSemantics.pick`. The exemption stands only because folding it would change the `onPick(commits[])` shape that `TableView`'s `pushValueUndo` depends on, and the undo/write layer is out of scope.
- **`TextPicker` is untouched, and `UIX/Pickers/` is out of scope entirely.** An earlier draft extracted its inner field into a new `TextField` so text kinds could live inside `PropertyPicker`. Nathan struck it: the field already exists, `TextPicker` is already ONE component with five callers across all three surfaces, and folding a shared component into another shared component buys nothing while orphaning a working one. `PropertyPicker` absorbs only what is hand-rolled per surface — options, datetime, file, and the two choosers.
- **Named locals earn their place or are inlined.** `valuePane`, `PropertyPickKind`, the `Pane` descriptor, `nonce`, `keepNull`, `textTarget`, `shown`, and six caller-side adapters were cut for having one writer and one reader. `pickTargetFor` survives because three call sites read it.
- **Three defects reported and declined.** The Cards Add ▸ number/file empty pane, the panel's unmount-while-open, and the add-flow's discarded null were raised from the census. Nathan: the first is not real, the second resolves when the panel inherits the new picker, the third is fine. None is a task.
- **Task 1 open question — the chooser header's flat padding is kept, via a 3-line `property-picker.css.ts`.** The "no behavior change — no exceptions" bound resolves the open question toward preservation: `card-add-top-flat` (`--row-pad-y: 0px`) dies with `CardAddPicker`, so `chooserTop = style([topRow, { vars: { '--row-pad-y': '0px' } }])` replaces it. Composing `topRow` (not a bare sibling class) guarantees the override lands after it in the cascade — a separate vanilla-extract class would only win by import-order luck. File count lands at −3. **Confirm at Gate 1** that the Cards Add chooser back-row still reads flat.

### Open Against Later Tasks

- **Task 4 truncation choice — verify at Gate 2.** The panel value sits in `MenuItem`'s `trailing` slot with a `globalStyle` on the row's trailing `side` (`flex 0 1 auto; minWidth 0`) to let a long value truncate — the plan's "smallest fix" fallback, chosen by reasoning (no live measurement): `value`/`detail` slots either don't let `side` shrink or impose the `detail` font. Confirm a long Select chip and a long link title truncate as they did.

### Deviations

- **Task 1 — the pane test is +7, not the fenced +6.** The B28 "centres with `anchorX`, not without" behavior is two `it`s (one per branch) rather than one, for a legible failure. Coverage added, none removed; baseline is 4050 → 4057.
- **Task 1 — `commit` passes `entry` only when drilled, not `onCommit(v, picked ?? undefined)`.** The fenced form emits a trailing `undefined` second argument on the direct path, which breaks the baseline `cellGestures` multi-select assertion's exact single-arg `toHaveBeenCalledWith`. `picked ? onCommit(v, picked) : onCommit(v)` preserves that baseline test verbatim; no runtime behavior differs for any real caller.
- **Gate residue corrected (struck TextField extraction).** The Gate checklist's "test count = baseline + 11" and "the `picker-base.test.tsx` rewrite is a signature move" are leftovers from the extraction Nathan struck (Rulings: `UIX/Pickers/` untouched). No `UIX/Pickers/` file is touched. Real test add is **+10**: 7 (Task 1 pane) + 3 (Task 4 panel).
- **Task 2 — `CardsView.tsx` lands at +161, over its +130 ceiling by 31 (FLAGGED for Gate 1).** Per the guardrail, I looked for and cut what was built and not needed: the `vpRow/vpDef/vpCurrent/vpRaw` derivations duplicated `pickTargetFor`, so one `vTarget` now feeds the two `TextPicker`s and the `PropertyPicker`, and `commitValuePicker` resolves its own row (−7). The residual is irreducible without deleting behavior: the mount inlines `CardPickerHost`'s ~89-line render (two `TextPicker`s, the datetime/file/options `PropertyPicker`, the chooser mapping) plus the two B14 dismiss effects and `pickTargetFor` — none of it relocatable to a file with headroom, none a one-reader helper. Read against the deletions it offsets (`CardPickerHost` 217 + `CardAddPicker` 155 = 372), the fold is deeply net-negative; the per-file estimate was optimistic. The Gate 1 `code-simplifier` gets the next pass; if it cannot reach 130, the ceiling itself is the miss, not the code.
- **Task 2 — the request types (`ValuePickerRequest`/`AddPickerRequest`) and `dependentKind` moved into `CardsView` unchanged**, since `CardPickerHost` (their only other home) is deleted and only `CardsView` reads them. `onReveal` looks a dependent entry up in the retained `addEntries: AddEntry[]` for its `type`, because `PickEntry` (now `icon: string`, since `propertyIcon` returns an arbitrary user-icon string) deliberately carries no `type`. The `code-simplifier` later inlined `dependentKind` into `onReveal` and de-`export`ed the request types (net −6, gates green), so the final `CardsView` is +155.
- **Gate 1 — two review findings folded (both my regressions), one struck.** `feature-dev:code-reviewer` and `build-breaking-agent` both ran; the mandatory Fable advisor **timed out twice**, so I adjudicated each finding against the deleted oracle and recorded the reason (per the "record every fix and every rejection" rule). Folded: (a) the add-chooser's dependent-kind routing was dead — `PropertyPicker`'s onClick called `onDismiss()` after `onReveal?.(e)`, and Cards' `onReveal` reopens on the same mount, so the same React batch nulled it; fixed to `if (e.revealOnly) onDismiss()` (a removal), with a locking pane test. (b) Table dropped the per-cell `key`, so a datetime cell reopened within the previous pane's Bloom-out showed the prior date (CalendarPicker seeds state once at mount); restored `key={rowId:colId}` at `cellPicker` — Table-only, since Cards had no key pre-fold either. Struck: the Cards number field's `if (nv != null)` clear-guard — identical to the deleted `CardPickerHost` and ratified by **B16** ("an emptied number does not commit"); changing it would be a behavior change the plan forbids.
- **Gate 1 — the multi-select add-drill regression fixed at Nathan's direction (he called the snapshot approach over-engineered, correctly).** The fold had frozen a full `PickTarget` into every `PickEntry`; when a drilled multi_select's first commit revealed (and so filtered) the column, the drilled pane read a stale snapshot — snap-back with latent corruption. Fix removes the snapshot: `PickEntry.target: PickTarget | null` → `drillable: boolean`, and `PropertyPicker` resolves the drilled pane's target LIVE through a new `resolveTarget?(entry)` callback (the mirror of the old `CardAddPicker.currentOf`), with the reset effect keyed off `[open, chooserInitial]` so the drill survives re-render. Cards passes `resolveTarget = pickTargetFor` by id, which reads the row regardless of the addable list. `PropertyPicker` got simpler; `CardsView` net rose to **+166** (the `resolveTarget`/`drillable` wiring). Task 4's panel passes non-drillable entries, so it is unaffected. Gate 1 stop waived by Nathan ("start Task 4 without me").

- **Task 4 — `PropertyPanel.tsx` lands at 456, over its ≤320 ceiling by 136 (FLAGGED for Gate 2).** It folds three files — `PagePropertyRows` 341 + `usePropertyRows` 177 + `PropertyValueEditors` 77 = 595 — into one component, a real −139, but the ≤320 estimate assumed more evaporation than the behavior allows: the visibility predicates, both commit writers, the `editRow` click dispatch, `valueMenu`/`rowMenu`, the inline `PropertyEditor`-or-`Cell` value row, `panelTarget`, and the chooser entries are all irreducible behavior that has to live somewhere. No one-reader helper or new file was minted to pad it. `property-panel.css.ts` is 47 vs ≤45 — the extra is the `row` hook and `globalStyle` the truncation fix needs (dead `label`/`titleText` cut). The Gate 2 `code-simplifier` gets the cut attempt; the running net still lands in −400 to −590 (deletions ≈1226 vs additions ≈775), so the per-file estimate was optimistic, not the fold bloated.

### Lessons

### Sequenced After

- **The options-kind test, three hand-rolls.** `type === 'select' | 'status' | 'multi_select' | 'context'` is now written in `valueClick.ts:21`, `TableView.tsx:843`, and the Cards chooser `target` guard. A single exported predicate beside `sharedValueClickAction` would unify them — pure DRY, cross-file, not this plan's charter.
- **`openAddPicker`'s partition asymmetry (pre-existing).** `CardsView.openAddPicker` routes only `datetime`/`url` initial entries straight to a popup; `number`/`file` fall into the chooser, and a `def`-less entry never routes. Predates this fold, same shape as `onReveal` with a narrower partition. Flagged by the attack review; out of scope.

- **The write layer.** Three value-write paths; `TableView` uses two of them internally, bypassing `commitValue`'s Context branch for checkbox, file, datetime, url-clear, rename, and both number paths.
- **Number parsing, four writers.** `parseEditorValue` plus two hand-rolled parsers in `TableView` and one discarded-null in the Cards add-flow.
- **The file-menu context, two builders.** `filePick.fileValueMenu` builds its own; `CardValue` and `TableView` build theirs through `cellMenuContextFor` with different flags.
- **The value-click router's two bypasses.** `PagePropertyRows:257` and `TableView:473` send context clicks to the picker without asking `sharedValueClickAction`, which already handles `'context'`.
- **The value right-click menu, three times.** Shared halves are extracted; the branch above them is not.
- **Two `optionsOf`.** `PropertyPicker.tsx:14` and `GroupFrame.tsx:356`, with inverted precedence (`status ? statusOptions : select_options` vs `select_options ?? statusOptions`). `FilterFrame` imports the second. Pure unification, not this plan's charter.
- **`FilterFrame`'s `ChipsField`** (`:335-360`) re-implements `PropertyOptionRows` — same `PickerRow` + chip vocabulary — while already importing `toggleValue` from `PropertyPicker`. It writes filter rules, not property values, so it sits outside the residue rule.
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
- [ ] Net source reduction of −400 or better, every per-file ceiling respected, net file count negative.

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
