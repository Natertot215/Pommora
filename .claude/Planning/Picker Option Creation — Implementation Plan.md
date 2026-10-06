## Picker Option Creation — Implementation Plan

### Context

Select and Multi-Select options can only be created, reordered, and edited from the Property Frame's option editor, which sits inside a view's settings. This plan brings those three abilities into the value picker itself — the option list that opens from a Table cell, a Card value, the Properties panel, and the Table's mass-assign — and gives every option row in the app, in the picker and in the Property Frame alike, one right-click menu: **Style ▸ · Edit Option · — · Clear · Remove**. The mandate is this session's conversation of 10-05-2026; its decisions are recorded under *§Constraints › Settled Decisions* and are not redesigned here.

The work touches the picker (`Core/Properties/Pickers/PropertyPicker.tsx`, `MassPropertyPicker.tsx`), the option editor family (`Core/Properties/Schema/OptionEditor.tsx`, `OptionRow.tsx`, `OptionEditPopup.tsx`, `GhostOptionChip.tsx`, `PropertyFrame.tsx`), the option model and its validation (`optionModel.ts`, `schema.ts`), the menu models (`Core/Actions/optionMenu.ts`, `columnMenu.ts`, `cellMenu.ts`), the view host's pick target (`Core/Views/Host/useViewHost.ts`, `Core/Views/Table/TableView.tsx`), two kit fields and two menu styles (`UIX/Fields/EditableInput.tsx`, `RenamableLabel.tsx`, `UIX/Menus/menu-row.css.ts`, `frames.css.ts`), and `.claude/Features/PropertiesPM.md`. It adds one renderer-side module (`Core/Properties/propertyWrite.ts`), one hook (`Core/Properties/Schema/useOptionEdit.tsx`), and one live-drive script. It leaves alone the Filter frame's value picker, Status and Context pickers, native OS menus (the sidebar's **Properties ▸** and **Spaces ▸** branches), the cell chip right-click menu, `UIX/Interactions/ghostCreate.ts` (owned by the in-flight Ghost Tiles plan), and every host channel's shape.

### Summary

Opening a Select or Multi-Select picker now shows a thin divider at the bottom with a `+` — at the left in the standard look, centered in the compact look — exactly like a View Tile's view list. Pressing it adds a blank row at the bottom with a text field ready for typing; Enter (or clicking away) saves a new grey option at the end of the list without assigning it, while Escape or an empty Enter saves nothing. Option rows in the picker can be dragged to reorder the property's options everywhere. Right-clicking an option row offers Style (Standard or Compact for this view, absent in the Properties panel, which has no view), Edit Option (the existing popup with icon, title, color, and appearance), Clear (removes the option from every page), and Remove (deletes the option). A long option list scrolls inside the picker with the footer pinned beneath it, as the View Tile's list does.

The Property Frame's option editor moves onto the same menu and the same behavior: its `+` uses the same text field, an empty name is refused instead of becoming "Label", the group-heading rename uses the same field, and the old Rename and Edit Icon menu rows give way to Edit Option. The hover pencil and the bottom-bar Style control both stay. Underneath, the app refuses an empty option name at the source, so no surface can save one, and one shared piece of code owns the popup, the menu, and every option write for both surfaces.

#### Constraints

- Gates: `npm run typecheck` · `npm run test` · `npm run lint`, from the repo root, each exiting 0; lint prints no `Found N warnings` line. Biome reformats every TS/CSS/JSON write, so an Edit failing on whitespace is re-read and retried.
- Commit with `git add <new files>` then `git commit --only -m "…" -- <paths>`; never a whole-tree command. Unattributed edits in adjacent files are Nathan's and are bundled, not reverted.
- `UIX` imports nothing outside itself. The host-run half of Core imports no React; `propertyWrite.ts` is imported only by interface code, never by a host module, so `Core/Contract/engineGraph.test.ts` stays green.
- Every option write goes through the existing channels — `property:editOption`, `property:renameOption`, `property:removeOption`, `property:clearOption` — unchanged in shape.
- A component's hook calls never depend on a prop: a branch that needs hooks is its own component.
- No comments beyond file-level sectioning, the one-line file comment `optionMenu.ts` already carries, and the ones this plan's AFTERs write. No guard for a state nothing produces.
- Zero dead code: every symbol a task retires is deleted in that task's commit, with its imports, styles, and tests.
- A test's `ColumnStyle` literal spreads `dateDefaults('full')` from `columnStyles.ts` (as `Core/Actions/columnMenu.test.ts` does): `ColumnStyle` requires the date fields.
- Never touch: `UIX/Interactions/ghostCreate.ts` and its test (Ghost Tiles plan); `Core/Views/Settings/FilterFrame.tsx` (stays pick-only); the cell menu's `cell:clear` and `cell:hide` actions.
- A task's NOW names where the change sits; the file on disk is the full text. A task's AFTER is the code as it must read — a whole file where the AFTER says *complete*, otherwise the changed region exactly, with `…` standing only for lines the task leaves as they are.

**Settled Decisions** — ratified with Nathan on 10-05-2026; not re-litigated:

- Picker creation, drag, and the menu apply to **Select and Multi-Select** in **both** pickers sharing `PropertyOptionRows` (`PropertyPicker`, `MassPropertyPicker`). Status and Context pickers stay pick-only; Status gets the new menu in the Property Frame editor only.
- Footer: a `MenuFooting` holding an icon-only `+` `AccessoryButton`, as `ViewTile`'s view list does; the standard look sets it left, the compact look centers it.
- Draft row: `RenamableLabel renames="title"` with `titleInput`, opened empty — the View Tile's rename field — in both looks. Enter with a name adds the option at the end of the registry order with no `color` field (renders `labelColor.default` = `grey-4` = greyDefault). Blank Enter and Escape write nothing. Blur commits, as every `RenamableLabel` does. The new option is not assigned.
- One option menu everywhere an option row is right-clicked: **Style ▸ · Edit Option · — · Clear · Remove**. Style ▸ is the view's column look (Standard / Compact) and is omitted where no view exists (the Properties panel). Edit Option opens `OptionEditPopup` anchored at the row. Clear strips the option's value from every page; Remove deletes the option; both keep their in-app confirmations.
- Align fully: the editor's create row and group-heading rename move to `RenamableLabel`; a blank option name is refused everywhere (create, the popup's title field, the host). The editor's hover square-pen **stays**, and so does the Property Frame's footing Style `PickerControl`.
- The picker's option list scrolls past `PICKER_MAX_HEIGHT` with the footer pinned, through `MenuScrollFrame`.
- A new option arrives in the picker through `Reveal`/`useEntrance`, as it does in `OptionEditor`.
- Native OS menus are out of scope.
- The live-drive script drives every mutation this plan adds, through real gestures, on a throwaway copy of `~/Test`.

#### Baseline

Recorded 10-05-2026 at `4b045c30b` on `active`.

- Gates: green at `4b045c30b` — `npm run typecheck` exit 0 · `npm run lint` "Checked 1409 files in 631ms. No fixes applied." exit 0 · `npm run test` 515 files, 7282 passed, 2 skipped, exit 0.
- `grep -rn "fallbackTitle\|OptionNameCaret\|useOptionIconChoice" Core | grep -v "/out/" | wc -l` → 21 — retires to 0
- `grep -rn "option:rename\|option:edit-icon" Core | grep -v "/out/" | wc -l` → 6 — retires to 0
- `grep -rn "styleMenuLabel(" Core/Actions --include="*.ts" | grep -v test | grep -v "export function" | wc -l` → 2 — becomes 1 (inside `styleBranch`)
- `grep -rn "function warnOwed\|const retryOwed\|const replay" Core | grep -v "/out/" | wc -l` → 3 — stays 3, all in `propertyWrite.ts`
- `npm run test` → 7282 passed, 2 skipped — rises by the tests this plan adds, less those it retires

**START:** <`date -u +"%Y-%m-%dT%H:%M:%SZ"`, as Task 1.1 begins>
**END:** <same, as the report is given>

#### Implementation Process

- [ ] **Phase 1** — Foundations
  - [ ] Task 1.1
  - [ ] Task 1.2
  - [ ] Task 1.3
- [ ] **Phase 2** — The Shared Option Edit And The Editor (one commit)
  - [ ] Task 2.1
  - [ ] Task 2.2
  - [ ] Task 2.3
- [ ] **Phase 3** — The Picker
  - [ ] Task 3.1
  - [ ] Review Checkpoint
- [ ] **Phase 4** — Live Drive And Reconciliation
  - [ ] Task 4.1
  - [ ] Task 4.2
- [ ] `[Stop: Nathan's hand-checks — Footer + Draft Look · Drag Feel · Menu + Popup]`

### Phase 1 — Foundations

**GOAL:** Land the shared pieces that change no surface — the host's blank-name refusal, the kit's required field and centered footer style, and the hoisted write helpers — each its own green commit. It's a separate phase because Phases 2 and 3 both build on all three.

#### Task 1.1

**TASK:** Refuse a blank option title at the host, so `add` and `renameOption` fail on an empty or whitespace title no matter which surface sends it.

**FILES:** `Core/Properties/schema.ts`, `Core/Properties/optionOps.test.ts`

**NOW**

```ts
export function validateOptionValues(options: { value: string }[]): Result<null> {
  if (new Set(options.map((o) => normalizeTitle(o.value))).size < options.length) {
    return fail('invalid-property', 'Option titles must be unique.')
  }
  return ok(null)
}
```

**CHANGE**

- [ ] Write the failing tests first in `optionOps.test.ts`, beside its existing `editOption`/`renameOption` cases and using their fixture: `editOption(root, id, { op: 'add', groupId: SELECT_GROUP, title: '' })` and `renameOption(root, id, 'Alpha', '  ')` each answer `ok: false` with `error.message === 'Option titles can’t be blank.'`, and `readRegistry(root)` shows the options unchanged.
- [ ] Add the blank check ahead of the uniqueness check. `normalizeTitle` trims (`Core/Paths/caseFold.ts`), so a whitespace title folds to `''`.

**AFTER**

```ts
export function validateOptionValues(options: { value: string }[]): Result<null> {
  const titles = options.map((o) => normalizeTitle(o.value))
  if (titles.includes('')) return fail('invalid-property', 'Option titles can’t be blank.')
  if (new Set(titles).size < titles.length) {
    return fail('invalid-property', 'Option titles must be unique.')
  }
  return ok(null)
}
```

**VERIFY**

- [ ] Check for unnecessary code or obvious mistakes.
- [ ] The two new tests go red with the check removed and green with it.
- [ ] Run the gates; commit.

#### Task 1.2

**TASK:** Give `EditableInput` a `required` mode — a blank commit restores the field to `initial` and cancels — move `RenamableLabel`'s blank refusal onto it, and add the centered footing style the compact picker uses.

**FILES:** `UIX/Fields/EditableInput.tsx`, `UIX/Fields/RenamableLabel.tsx`, `UIX/Fields/EditableInput.test.tsx`, `UIX/Menus/menu-row.css.ts`

**NOW**

```tsx
// EditableInput — props end
  invalid?: (text: string) => boolean
  onCommit: (next: string) => void
  onCancel: () => void
// EditableInput — onBlur
      onBlur={(e) => {
        if (settled.current) return
        settled.current = true
        onCommit(e.currentTarget.value.trim())
      }}

// RenamableLabel — editing branch
  return (
    <EditableInput
      initial={emptyInitial ? '' : value}
      className={className}
      type={type}
      autoSize={autoSize}
      boxed={boxed}
      ariaLabel={ariaLabel}
      caretAtEnd={renames === 'title'}
      onCommit={(next) => ((next || emptyCommits) && next !== value ? onCommit(next) : onCancel())}
      onCancel={onCancel}
    />
  )
```

**CHANGE**

- [ ] Write the failing `EditableInput.test.tsx` case: render `<EditableInput initial="Gamma" required className="" onCommit={commit} onCancel={cancel} />`, set the input's value to `''`, blur it; `cancel` was called once, `commit` never, and `input.value === 'Gamma'`.
- [ ] Add `required` to `EditableInput` and `RenamableLabel`, and add `footingCentered` to `menu-row.css.ts`, as below. `MenuFooting` is unchanged: its `children` slot (used today by `PropertyFrame.tsx` and `GroupFrame.tsx`) carries the picker's footer row.

**AFTER**

```tsx
// EditableInput — destructuring gains `required,` after `invalid,`; props end
  invalid?: (text: string) => boolean
  /** A blank commit restores the field and cancels: a name, not a value. */
  required?: boolean
  onCommit: (next: string) => void
  onCancel: () => void
// EditableInput — onBlur
      onBlur={(e) => {
        if (settled.current) return
        settled.current = true
        const next = e.currentTarget.value.trim()
        if (required && !next) {
          e.currentTarget.value = initial
          return onCancel()
        }
        onCommit(next)
      }}

// RenamableLabel — editing branch
  return (
    <EditableInput
      initial={emptyInitial ? '' : value}
      className={className}
      type={type}
      autoSize={autoSize}
      boxed={boxed}
      ariaLabel={ariaLabel}
      caretAtEnd={renames === 'title'}
      required={!emptyCommits}
      onCommit={(next) => (next !== value ? onCommit(next) : onCancel())}
      onCancel={onCancel}
    />
  )
```

```ts
// menu-row.css.ts — directly beneath `footing`
export const footingCentered = style([footing, { justifyContent: 'center' }])
```

**VERIFY**

- [ ] Check for unnecessary code or obvious mistakes; the View Tile's title `RenamableLabel` passes `emptyCommits` and still commits a clear (`grep -n "emptyCommits" Core/Tiles/Surfaces/ViewTile.tsx`).
- [ ] The new test goes red without `required`.
- [ ] Run the gates; commit.

#### Task 1.3

**TASK:** Hoist `PropertyFrame`'s module-private write helpers into a renderer-side `Core/Properties/propertyWrite.ts`, and move `PropertyFrame` onto them.

**FILES:** `Core/Properties/propertyWrite.ts` (new), `Core/Properties/Schema/PropertyFrame.tsx`

**NOW:** `PropertyFrame.tsx` imports `notifyReport, notifyRetry, reportRefusal`, `type Result`, and `type SchemaCascade, SchemaJournal`; declares `type WriteResult = Result<null>`; declares `replay`, `retryOwed`, and `async function warnOwed` at module scope beneath `ListGroups`; and declares, inside the component, the comment `// Every property write is the same round trip; only the channel and its arguments differ.` over `const write = async (res: Promise<WriteResult>)`. `rename` calls `retryOwed(res.value)`; `editorMenu` calls `replay`; `optionSettings` calls `warnOwed`; nine sites call `write`.

**CHANGE**

- [ ] Create `propertyWrite.ts` complete, as below.
- [ ] In `PropertyFrame.tsx`: delete `replay`, `retryOwed`, `warnOwed`, `type WriteResult`, the in-component `write` with its comment, and the imports only they used (`notifyReport`, `notifyRetry`, `type Result`, `type SchemaCascade, SchemaJournal`); `reportRefusal` stays (used by `create`, `rename`, `remove`, `editorMenu`, `rowMenu`, and the file browse). Add the import below. Every call site keeps its shape; `optionSettings` and `PropertyFrame.test.tsx` are left as they are — Task 2.3 changes both.

**AFTER**

```ts
// Core/Properties/propertyWrite.ts — complete
import type { Result } from '../Contract/result'
import { notifyReport, notifyRetry, reportRefusal } from '../Interface/Notifications/notifications'
import { dialer } from '../Platform/dialer'
import type { SchemaCascade, SchemaJournal } from './propertyJournal'

// Every property write is the same round trip; only the channel and its arguments differ.
export const write = async (res: Promise<Result<null>>): Promise<void> => {
  reportRefusal(await res)
}

export const replay = (record: SchemaJournal) => (): void =>
  void dialer()
    .ask('property:replay', record)
    .then((r) => {
      if (!r.ok) notifyRetry(r.error.message, replay(record))
    })

export const retryOwed = ({ cascade, owed }: SchemaCascade): void => {
  if (!cascade.warning) return
  if (owed) notifyRetry(cascade.warning, replay(owed))
  else notifyReport(cascade.warning, true)
}

export async function warnOwed(res: Promise<Result<SchemaCascade>>): Promise<void> {
  const r = await res
  if (reportRefusal(r)) retryOwed(r.value)
}
```

```tsx
// PropertyFrame.tsx — new import, beside the other `../` imports
import { replay, retryOwed, warnOwed, write } from '../propertyWrite'
// PropertyFrame.tsx — `rename`, unchanged, now reading the import
  const rename = async (id: string, name: string): Promise<void> => {
    const res = await dialer().ask('property:rename', id, name)
    if (!reportRefusal(res) || !res.value) return
    bumpValuesEpoch(res.value.from, res.value.to)
    retryOwed(res.value)
  }
```

**VERIFY**

- [ ] `grep -rn "function warnOwed\|const retryOwed\|const replay\|const write = async" Core | grep -v "/out/"` → hits only in `propertyWrite.ts`.
- [ ] `grep -rln "propertyWrite" Core Desktop | grep -v "/out/"` lists only `PropertyFrame.tsx`; `engineGraph.test.ts` passes.
- [ ] Run the gates (`PropertyFrame.test.tsx` passes unchanged); commit.

### Phase 2 — The Shared Option Edit And The Editor

**GOAL:** Build the one option menu, the one hook that owns the Option Edit popup, the menu, and every option write, and move the Property Frame's editor onto both with full alignment. Its three tasks typecheck only together, so the phase lands as **one commit**; it's separate from Phase 3 because the picker consumes the hook exactly as the editor proves it.

#### Task 2.1

**TASK:** Define the Style ▸ branch once and build the one option menu model on it: **Style ▸ · Edit Option · — · Clear · Remove**.

**FILES:** `Core/Actions/columnMenu.ts`, `Core/Actions/cellMenu.ts`, `Core/Actions/optionMenu.ts`, `Core/Actions/optionMenu.test.ts`

**NOW**

```ts
// columnMenu.ts — columnMenuItems
export function columnMenuItems(ctx: ColumnMenuContext): ActionItem<ColumnMenuAction>[] {
  const style = ctx.style
  const styleRows = style ? styleMenuItems(style) : []
  return [
    ...(ctx.alignable ? [{ label: 'Align', submenu: alignRows(ctx.align) }] : []),
    ...(style && styleRows.length > 0
      ? [{ label: styleMenuLabel(style.type), submenu: styleRows }]
      : []),
    { label: 'Icon', action: 'column:toggle-icons', checked: ctx.iconsShown },
    ...(ctx.hideable
      ? [{ label: 'Hide', action: 'column:hide' as const, separatorBefore: true }]
      : []),
  ]
}

// cellMenu.ts — import, and baseCellMenuModel's style-only arm
import { styleMenuItems, styleMenuLabel, type StyleAction } from './columnMenu'
    case 'style-only':
      return [
        [
          {
            label: styleMenuLabel(ctx.type),
            submenu: styleMenuItems({
              type: ctx.type,
              current: ctx.current,
              barCapable: ctx.barCapable,
            }),
          },
        ],
        ctx.clearable ? [{ label: 'Clear', action: 'cell:clear' }] : [],
      ]

// optionMenu.ts — complete
// Remove deletes the option AND strips its value from every page; Clear strips the value only.

import type { ActionItem } from './menuModel'

type OptionMenuAction = 'option:rename' | 'option:edit-icon' | 'option:remove' | 'option:clear'

export function optionMenuModel(): ActionItem<OptionMenuAction>[] {
  return [
    { label: 'Rename', action: 'option:rename' },
    { label: 'Edit Icon', action: 'option:edit-icon' },
    { label: 'Remove', action: 'option:remove', separatorBefore: true },
    { label: 'Clear', action: 'option:clear' },
  ]
}
```

**CHANGE**

- [ ] Rewrite `optionMenu.test.ts` first, as below.
- [ ] Add `styleBranch` to `columnMenu.ts` beneath `styleMenuItems`; use it in `columnMenuItems` and `cellMenu`'s `style-only` arm; rewrite `optionMenu.ts`.

**AFTER**

```ts
// columnMenu.ts — beneath styleMenuItems
export function styleBranch(ctx: StyleMenuContext): ActionItem<StyleAction>[] {
  const submenu = styleMenuItems(ctx)
  return submenu.length > 0 ? [{ label: styleMenuLabel(ctx.type), submenu }] : []
}

// columnMenu.ts — columnMenuItems
export function columnMenuItems(ctx: ColumnMenuContext): ActionItem<ColumnMenuAction>[] {
  return [
    ...(ctx.alignable ? [{ label: 'Align', submenu: alignRows(ctx.align) }] : []),
    ...(ctx.style ? styleBranch(ctx.style) : []),
    { label: 'Icon', action: 'column:toggle-icons', checked: ctx.iconsShown },
    ...(ctx.hideable
      ? [{ label: 'Hide', action: 'column:hide' as const, separatorBefore: true }]
      : []),
  ]
}

// cellMenu.ts — import, and the style-only arm
import { styleBranch, type StyleAction } from './columnMenu'
    case 'style-only':
      return [
        styleBranch({ type: ctx.type, current: ctx.current, barCapable: ctx.barCapable }),
        ctx.clearable ? [{ label: 'Clear', action: 'cell:clear' }] : [],
      ]
```

```ts
// optionMenu.ts — complete
// Clear strips the option's value from every page; Remove deletes the option and strips it too.

import { styleBranch, type StyleAction, type StyleMenuContext } from './columnMenu'
import type { ActionItem } from './menuModel'

type OptionMenuAction = 'option:edit' | 'option:clear' | 'option:remove' | StyleAction

export function optionMenuModel(style?: StyleMenuContext): ActionItem<OptionMenuAction>[] {
  return [
    ...(style ? styleBranch(style) : []),
    { label: 'Edit Option', action: 'option:edit' },
    { label: 'Clear', action: 'option:clear', separatorBefore: true },
    { label: 'Remove', action: 'option:remove' },
  ]
}
```

```ts
// optionMenu.test.ts — complete
import { describe, expect, it } from 'vitest'
import { dateDefaults } from '../Properties/columnStyles'
import { optionMenuModel } from './optionMenu'

const rows = (items: ReturnType<typeof optionMenuModel>) =>
  items.map((i) => [i.label, i.separatorBefore ?? false])

describe('optionMenuModel', () => {
  it('leads with Style where a view gives one, then Edit Option, then Clear and Remove apart', () => {
    const items = optionMenuModel({
      type: 'select',
      current: { ...dateDefaults('full'), look: 'compact' },
    })
    expect(rows(items)).toEqual([
      ['Style', false],
      ['Edit Option', false],
      ['Clear', true],
      ['Remove', false],
    ])
    expect(items[0].submenu?.map((r) => [r.label, 'checked' in r && r.checked])).toEqual([
      ['Standard', false],
      ['Compact', true],
    ])
  })

  it('omits Style where no view exists', () => {
    expect(rows(optionMenuModel())).toEqual([
      ['Edit Option', false],
      ['Clear', true],
      ['Remove', false],
    ])
  })
})
```

**VERIFY**

- [ ] `grep -rn "styleMenuLabel(" Core/Actions --include="*.ts" | grep -v test | grep -v "export function"` → 1 hit, inside `styleBranch`.
- [ ] `columnMenu.test.ts` and `cellMenu.test.ts` pass unchanged.

#### Task 2.2

**TASK:** Create `useOptionEdit`, which owns every option write, which option's popup is open and where it's anchored, keeps that popup on its option across a rename, runs the option menu, and renders the one list-level `OptionEditPopup`; collapse `OptionRow.tsx` to one `OptionSlot`; key the popup's content and make its title field `required`.

**FILES:** `Core/Properties/Schema/useOptionEdit.tsx` (new), `Core/Properties/Schema/OptionEditPopup.tsx`, `Core/Properties/Schema/OptionRow.tsx`, `UIX/Menus/frames.css.ts`

**NOW:** `OptionEditor` holds `editing: { row, value } | null`, an `alias` map, and `keyOf`/`isEditing`, so a renamed row keeps its React key and its open popup across the refresh that carries the rename; `commitRename` re-points `editing.value` at the new title. `OptionRow.tsx` holds `OptionRow` (the chip, the compact title, the inline-rename branch, the pen, and its own `OptionEditPopup` inside an `optionAnchor` span with `triggerRef={editButtonRef}`), `OptionSlot` (a `LineRow` wrapping `OptionRow` through `React.ComponentProps<typeof OptionRow>`), and `useOptionIconChoice`. `OptionEditPopup`'s title `EditableInput` (`defaultValue={initial}`) commits any value, blank included.

**CHANGE**

- [ ] Create `useOptionEdit.tsx` complete, as below.
- [ ] Rewrite `OptionRow.tsx` complete, as below; delete `optionAnchor` from `frames.css.ts`.
- [ ] `OptionEditPopup.tsx`: add the `contentKey` prop, key the `s.root` div on it, and give the title field `required`, as below. (An open `IconChoice` is closed by the dismissal stack on the pointerdown that switches popups, so `iconOpen` needs no reset.)

**AFTER**

```tsx
// Core/Properties/Schema/useOptionEdit.tsx — complete
import { useRef, useState } from 'react'
import { useHeld } from '@pommora/uix/Animations/useExitPresence'
import type { ColumnStyle } from '../columnStyles'
import type { OptionEdit } from '../optionModel'
import type { PropertyDefinition, PropertyType } from '../properties'
import type { OptionChipData } from '../Cells/OptionChip'
import { warnOwed, write } from '../propertyWrite'
import { dialer } from '../../Platform/dialer'
import { popMenu } from '../../Actions/menuActions'
import { optionMenuModel } from '../../Actions/optionMenu'
import { parseStyleAction } from '../../Actions/columnMenu'
import { askClearOption, askRemoveOption } from '../../Interface/Confirm/confirmations'
import { OptionEditPopup } from './OptionEditPopup'

export type OptionStyleControl = {
  current: ColumnStyle
  set: (key: keyof ColumnStyle & string, value: string) => void
}

type Editing = { row: string; value: string }

export function useOptionEdit({
  propertyId,
  type,
  def,
  options,
  style,
}: {
  propertyId: string
  type: PropertyType
  def?: Pick<PropertyDefinition, 'status_groups'>
  options: readonly OptionChipData[]
  style?: OptionStyleControl
}): {
  keyOf: (value: string) => string
  isOpen: (row: string) => boolean
  toggle: (value: string, anchor: HTMLElement) => void
  openMenu: (value: string, row: HTMLElement) => Promise<void>
  editOption: (edit: OptionEdit) => Promise<void>
  busy: boolean
  popup: React.JSX.Element | null
} {
  const [editing, setEditing] = useState<Editing | null>(null)
  const anchor = useRef<HTMLElement | null>(null)
  const alias = useRef(new Map<string, string>())
  const values = options.map((o) => o.value)

  const editOption = (edit: OptionEdit): Promise<void> =>
    write(dialer().ask('property:editOption', propertyId, edit))
  const keyOf = (value: string): string => {
    const key = alias.current.get(value)
    return key !== undefined && !values.includes(key) ? key : value
  }
  const isOpen = (row: string): boolean =>
    editing !== null &&
    (editing.value === row || (editing.row === row && !values.includes(editing.value)))
  const open = (value: string, el: HTMLElement): void => {
    anchor.current = el
    setEditing({ row: value, value })
  }
  const toggle = (value: string, el: HTMLElement): void =>
    isOpen(value) ? setEditing(null) : open(value, el)

  const rename = (title: string): void => {
    if (!editing || title === editing.value) return
    const { row, value: from } = editing
    if (title === row || !values.includes(title)) {
      alias.current.set(title, keyOf(row))
      setEditing((e) => (e && e.value === from ? { row: e.row, value: title } : e))
    }
    void warnOwed(dialer().ask('property:renameOption', propertyId, from, title))
  }

  const openMenu = async (value: string, row: HTMLElement): Promise<void> => {
    const action = await popMenu(optionMenuModel(style && { type, current: style.current }))
    switch (action) {
      case null:
        return
      case 'option:edit':
        return open(value, row)
      case 'option:clear':
        if (await askClearOption(value))
          await write(dialer().ask('property:clearOption', propertyId, value))
        return
      case 'option:remove':
        if (await askRemoveOption(value))
          await warnOwed(dialer().ask('property:removeOption', propertyId, value))
        return
      default: {
        const picked = parseStyleAction(action)
        if (picked) style?.set(picked.key, picked.value)
      }
    }
  }

  const held = useHeld(editing, editing !== null)
  const option =
    held &&
    (options.find((o) => o.value === held.value) ?? options.find((o) => o.value === held.row))
  const popup =
    held && option ? (
      <OptionEditPopup
        open={editing !== null}
        contentKey={held.row}
        type={type}
        option={option}
        def={def}
        triggerRef={anchor}
        onDismiss={() => setEditing(null)}
        onRename={rename}
        onPickIcon={(icon) => void editOption({ op: 'icon', value: held.value, icon })}
        onPickColor={(color) => void editOption({ op: 'recolor', value: held.value, color })}
        onPickAppearance={(appearance) =>
          void editOption({ op: 'appearance', value: held.value, appearance })
        }
      />
    ) : null

  return { keyOf, isOpen, toggle, openMenu, editOption, busy: editing !== null, popup }
}
```

```tsx
// Core/Properties/Schema/OptionRow.tsx — complete
import { LineRow } from '@pommora/uix/Interactions/drag'
import { Button } from '@pommora/uix/Buttons/Button'
import { type ColumnLook, lookOptions, OPTION_LOOKS } from '../columnStyles'
import type { PropertyDefinition } from '../properties'
import { OptionChip, type OptionChipData } from '../Cells/OptionChip'
import { ghostAnchorProps, type GhostAnchor } from '@pommora/uix/Interactions/ghostCreate'
import * as s from '@pommora/uix/Menus/frames.css'
import { compactTitle } from './option-row.css'

export type OptionStyle = (typeof OPTION_LOOKS)[number]

export const OPTION_STYLE_OPTIONS = lookOptions(OPTION_LOOKS)

export function OptionSlot({
  option,
  type,
  look,
  def,
  editing,
  ghost,
  onToggleEditing,
  onOpenMenu,
}: {
  option: OptionChipData
  type: string
  look?: ColumnLook
  def?: Pick<PropertyDefinition, 'status_groups'>
  editing: boolean
  ghost: GhostAnchor
  onToggleEditing: (anchor: HTMLElement) => void
  onOpenMenu: (row: HTMLElement) => void
}): React.JSX.Element {
  return (
    <LineRow
      id={option.value}
      {...ghostAnchorProps(ghost, option.value)}
      className={s.optionRow}
      data-reveal-host=""
      onContextMenu={(e) => {
        e.preventDefault()
        onOpenMenu(e.currentTarget)
      }}
    >
      <span className={s.optionLead}>
        <OptionChip type={type} look={look} option={option} def={def} />
        {look === 'compact' && <span className={compactTitle}>{option.value}</span>}
      </span>
      <Button
        size="button-inline"
        paddingX="0"
        icon="square-pen"
        iconSize={s.ICON.optionEdit}
        className={s.optionEditButton}
        data-reveal-held={editing || undefined}
        aria-label="Edit Option"
        onClick={(e) => onToggleEditing(e.currentTarget)}
      />
    </LineRow>
  )
}
```

```tsx
// OptionEditPopup.tsx — destructuring gains `contentKey,` after `open,`; props gain
  open: boolean
  contentKey: string
// OptionEditPopup.tsx — the root div and the title field
        <div key={contentKey} className={s.root}>
          <div className={s.fieldRow}>
            …the icon seat button, unchanged…
            <EditableInput
              initial={option.value}
              boxed
              autoFocus={false}
              required
              className={s.titleField}
              ariaLabel="Option Title"
              onCommit={onRename}
              onCancel={() => {}}
            />
          </div>
          …separators, ColorGrid, and the Appearance row, unchanged…
        </div>
```

**VERIFY**

- [ ] Check for unnecessary code or obvious mistakes; `grep -rn "useOptionIconChoice\|editButtonRef\|optionAnchor" Core UIX | grep -v "/out/"` → no hits.

#### Task 2.3

**TASK:** Move `OptionEditor` onto `useOptionEdit`, align its create row and group-heading rename on `RenamableLabel`, refuse blank names, derive its look from the style it's handed, and delete everything the change retires.

**FILES:** `Core/Properties/Schema/OptionEditor.tsx`, `Core/Properties/Schema/OptionEditor.test.tsx`, `Core/Properties/Schema/GhostOptionChip.tsx`, `Core/Properties/Schema/PropertyFrame.tsx`, `Core/Properties/Schema/PropertyFrame.test.tsx`, `Core/Properties/optionModel.ts`, `Core/Properties/optionModel.test.ts`

**NOW:** `OptionEditor` takes `type`, `groups`, `look`, and `onEdit`/`onRenameOption`/`onRemoveOption`/`onClearOption` from `PropertyFrame.optionSettings`; holds `adding`, `renamingGroup`, `renaming`, `editing`; `commitAdd` and `commitRename` fall back to `fallbackTitle`; `openMenu` handles `option:rename`/`option:edit-icon`/`option:remove`/`option:clear`; the create slot and the group heading use `OptionNameCaret`. `OptionEditor.test.tsx` renders with `onEdit`/`onRenameOption` mocks and stubs `menu` with `ok('option:edit-icon')` through `stubDialer` from `Core/vitest.setup`. `PropertyFrame.test.tsx` mocks `./OptionEditor` to capture `props.onRemoveOption` and tests `warnOwed`'s notifications through it, and settles confirmations with `useSession.getState().pendingConfirm!.settle(…)`. In `PropertyFrame.tsx`, `SETTINGS` is a `Record<PropertyType, (def, style, look) => React.JSX.Element>` called as `SETTINGS[def.type](def, columnStyle, optionLook)`, and `optionSettings` is the only arm that reads `look`.

**CHANGE**

- [ ] Update `OptionEditor.test.tsx` first. `render` passes `propertyId="p1"` and `style = { current: { ...dateDefaults('full'), look: 'standard' }, set: vi.fn() }`; the `onEdit`/`onRenameOption` mocks give way to `stubDialer` handlers recording `property:editOption`, `property:renameOption`, `property:removeOption`, and `property:clearOption` calls (answering `ok(null)`, or `ok({ cascade: {} })` for the cascade channels). Cases:
  - The `menu` handler answers `option:edit` → the popup opens; `style:look:compact` → `style.set` is called with `('look', 'compact')`.
  - `option:clear` / `option:remove` → `await act(async () => { useSession.getState().pendingConfirm!.settle(true) })` → the matching channel is asked with `('p1', 'Urgent')`. `property:removeOption` answering `ok({ cascade: { warning: 'w' }, owed: { op: 'option-remove', id: 'p1', value: 'Urgent' } })` shows a notification offering Try Again, and answering `ok({ cascade: { warning: 'w' } })` shows one without — the coverage `PropertyFrame.test.tsx` held, read from the session's notification state the way that file read it.
  - A blank create, and a blank popup title on blur, ask nothing; the popup's field reads the option's title again.
  - The `+` with `Fresh` asks `property:editOption` with `{ op: 'add', groupId, title: 'Fresh', atIndex }`.
  - Drop the Edit Icon case. The F-134 popup-follows-rename cases and `openPopup` (the pen path) stay, asserting `property:renameOption` calls in place of `onRenameOption`.
- [ ] Rewrite `OptionEditor.tsx` complete, as below.
- [ ] `PropertyFrame.tsx`: the import, `optionSettings`, `SETTINGS`' type, and its call, as below. Delete `PropertyFrame.test.tsx`'s `vi.mock('./OptionEditor', …)` capture, its `optionEditor` holder, and the cases that used it.
- [ ] `GhostOptionChip.tsx`: delete `OptionNameCaret` and the imports only it used, as below.
- [ ] `optionModel.ts`: delete `fallbackTitle` and the `freeName` import (its only use), as below; delete the two `fallbackTitle` cases from `optionModel.test.ts` and `fallbackTitle` from its import line.

**AFTER**

```tsx
// Core/Properties/Schema/OptionEditor.tsx — complete
import { Fragment, useMemo, useState } from 'react'
import { groupOptions, PROPERTY_TYPES, type PropertyType, type StatusGroup } from '../properties'
import { cx } from '@pommora/uix/Utilities/cx'
import { GhostOptionChip, useGhostOptionAnchor } from './GhostOptionChip'
import { ghostAnchorProps } from '@pommora/uix/Interactions/ghostCreate'
import { Reveal } from '@pommora/uix/Animations/Reveal'
import { useEntrance } from '@pommora/uix/Animations/useEntrance'
import { LineGroup, LineZone, lineList } from '@pommora/uix/Interactions/drag'
import { RenamableLabel } from '@pommora/uix/Fields/RenamableLabel'
import { base } from '@pommora/uix/Fields/fields.css'
import { text } from '@pommora/uix/Theme'
import { OptionSlot } from './OptionRow'
import { type OptionStyleControl, useOptionEdit } from './useOptionEdit'
import { OptionChip } from '../Cells/OptionChip'
import * as s from '@pommora/uix/Menus/frames.css'
import { titleInput } from '@pommora/uix/Menus/menu-row.css'
import { AccessoryButton, heading, menuDropLine } from '@pommora/uix/Menus'
import { optionShapeFor } from '@pommora/uix/Labels/recipes'

export function OptionEditor({
  propertyId,
  type,
  groups,
  style,
}: {
  propertyId: string
  type: PropertyType
  groups: StatusGroup[]
  style: OptionStyleControl
}): React.JSX.Element {
  const grouped = PROPERTY_TYPES[type].options === 'status'
  const look = style.current.look
  const [adding, setAdding] = useState<{ groupId: string; index: number } | null>(null)
  const [renamingGroup, setRenamingGroup] = useState<string | null>(null)
  const options = useMemo(() => groups.flatMap(groupOptions), [groups])
  const def = useMemo(() => ({ status_groups: groups }), [groups])
  const edit = useOptionEdit({ propertyId, type, def, options, style })
  const headingOf = (id: string): string =>
    grouped ? (groups.find((g) => g.id === id)?.label ?? id) : 'Options'
  const entering = useEntrance(options, (o) => edit.keyOf(o.value))
  const ghostApi = useGhostOptionAnchor(adding !== null || renamingGroup !== null || edit.busy)

  const commitAdd = (g: StatusGroup, title: string, atIndex: number): void => {
    setAdding(null)
    void edit.editOption({ op: 'add', groupId: g.id, title, atIndex })
  }
  const slotAt = (g: StatusGroup, index: number, anchorId: string): React.JSX.Element | null =>
    adding?.groupId === g.id && adding.index === index ? (
      <div className={s.optionRow}>
        <RenamableLabel
          renames="title"
          editing
          value=""
          className={titleInput}
          autoSize
          onCommit={(title) => commitAdd(g, title, index)}
          onCancel={() => setAdding(null)}
        />
      </div>
    ) : (
      <GhostOptionChip
        api={ghostApi}
        anchorId={anchorId}
        shape={optionShapeFor(type)}
        onCreate={() => setAdding({ groupId: g.id, index })}
      />
    )

  return (
    <LineZone
      className={s.statusGroups}
      {...lineList({
        laneOf: () => {
          const laneOf = new Map(
            groups.flatMap((grp) => grp.options.map((o) => [o.value, grp.id] as const)),
          )
          return (v) => laneOf.get(v)
        },
        across: true,
        boxes: (g) => g.groups,
        commit: (value, slot) =>
          void edit.editOption({ op: 'move', value, groupId: slot.lane, toIndex: slot.index }),
        line: menuDropLine,
        label: (value) => (options.some((o) => o.value === value) ? value : headingOf(value)),
        chip: (value) => <OptionChip type={type} option={options.find((o) => o.value === value)} />,
        watch: [groups],
      })}
    >
      {groups.map((g) => (
        <div key={g.id} className={s.statusGroup} data-reveal-host="">
          <div className={heading}>
            <RenamableLabel
              renames="title"
              editing={renamingGroup === g.id}
              value={g.label}
              className={cx(base, text.footnote.emphasized)}
              autoSize
              onBegin={grouped ? () => setRenamingGroup(g.id) : undefined}
              onCommit={(label) => {
                setRenamingGroup(null)
                void edit.editOption({ op: 'relabelGroup', groupId: g.id, label })
              }}
              onCancel={() => setRenamingGroup(null)}
            >
              {headingOf(g.id)}
            </RenamableLabel>
            <AccessoryButton
              icon="plus"
              size={s.ICON.optionsAdd}
              ariaLabel={grouped ? `Add to ${g.label}` : 'Add Option'}
              create
              reveal={grouped}
              onClick={() => setAdding({ groupId: g.id, index: g.options.length })}
            />
          </div>
          <LineGroup
            id={g.id}
            className={s.optionList}
            {...(g.options.length === 0 ? ghostAnchorProps(ghostApi, g.id) : {})}
          >
            {groupOptions(g).map((o, i) => (
              <Fragment key={edit.keyOf(o.value)}>
                <Reveal open enterOnMount={entering(edit.keyOf(o.value))} fill>
                  <OptionSlot
                    option={o}
                    type={type}
                    look={look}
                    def={def}
                    editing={edit.isOpen(o.value)}
                    ghost={ghostApi}
                    onToggleEditing={(el) => edit.toggle(o.value, el)}
                    onOpenMenu={(row) => void edit.openMenu(o.value, row)}
                  />
                </Reveal>
                {slotAt(g, i + 1, o.value)}
              </Fragment>
            ))}
            {g.options.length === 0 ? slotAt(g, 0, g.id) : null}
          </LineGroup>
        </div>
      ))}
      {edit.popup}
    </LineZone>
  )
}
```

```tsx
// PropertyFrame.tsx — the import
import { replay, retryOwed, write } from '../propertyWrite'

// PropertyFrame.tsx — optionSettings
  const optionSettings = (def: PropertyDefinition, style: ColumnStyle): React.JSX.Element => (
    <OptionEditor
      propertyId={def.id}
      type={def.type}
      groups={optionGroupsOf(def)}
      style={{
        current: style,
        set: (key, value) => void saveColumnStyle(def.id, { [key]: value }),
      }}
    />
  )

// PropertyFrame.tsx — SETTINGS' type
  const SETTINGS: Record<
    PropertyType,
    (def: PropertyDefinition, style: ColumnStyle) => React.JSX.Element
  > = {
    …arms unchanged…
  }

// PropertyFrame.tsx — the editor's body (optionLook stays for the footing PickerControl)
        {SETTINGS[def.type](def, columnStyle)}
```

```tsx
// GhostOptionChip.tsx — imports after OptionNameCaret leaves
import { Reveal } from '@pommora/uix/Animations/Reveal'
import { useGhostAnchor, type GhostAnchor } from '@pommora/uix/Interactions/ghostCreate'
import { REVEAL_DWELL_MS } from '@pommora/uix/Interactions/hoverReveal'
import { cx } from '@pommora/uix/Utilities/cx'
import * as s from '@pommora/uix/Menus/frames.css'
import { Label } from '@pommora/uix/Labels/Label'
import type { LabelShape } from '@pommora/uix/Labels/label-base.css'
import { useLatest } from '@pommora/uix/Utilities/stableApi'
// …GHOST_GRACE_MS, useGhostOptionAnchor, and GhostOptionChip unchanged; OptionNameCaret deleted
```

```ts
// optionModel.ts — head after fallbackTitle leaves
import { z } from 'zod'
import { optionAppearance, type StatusGroup, type StatusOption } from './properties'

function mapOption(
// …unchanged from here
```

**VERIFY**

- [ ] `grep -rn "fallbackTitle\|OptionNameCaret\|useOptionIconChoice\|option:rename\|option:edit-icon\|warnOwed" Core/Properties/Schema Core/Properties/optionModel.ts | grep -v "/out/"` → only `useOptionEdit.tsx`'s two `warnOwed` calls and its import.
- [ ] `OptionEditor.test.tsx`'s new cases go red against the Phase-1 tree and green now.
- [ ] Run the gates; commit Tasks 2.1–2.3 together.

### Phase 3 — The Picker

**GOAL:** Give the two pickers creation, drag, and the menu through the hook Phase 2 proved. It's a separate phase because it ships the new surface Nathan reviews.

#### Task 3.1

**TASK:** Carry the view's column style on the options pick target in place of its bare look, and render an editable option list — drag rows, the option menu, the divider-plus footer, and the draft row — from both pickers for Select and Multi-Select.

**FILES:** `Core/Properties/Pickers/PropertyPicker.tsx`, `Core/Properties/Pickers/MassPropertyPicker.tsx`, `Core/Properties/Pickers/PropertyPicker.pane.test.tsx`, `Core/Views/Host/useViewHost.ts`, `Core/Views/Table/TableView.tsx`

**NOW**

```tsx
// PropertyPicker.tsx — PickTarget
export type PickTarget = { def: PropertyDefinition; current: PropertyValue | null } & (
  | { kind: 'options'; look?: ColumnLook; contextOptions?: PickOption[] }
  | {
      kind: 'dateTime'
      dateFormat?: ColumnStyle['date_format']
      timeFormat?: ColumnStyle['time_format']
    }
  | { kind: 'file' }
)
// PropertyPicker.tsx — the options pane
        <PropertyOptionRows
          def={t.def}
          look={t.look}
          contextOptions={t.contextOptions}
          options={options}
          selected={selected}
          onPick={pick}
        />
// PropertyPicker.tsx — PropertyOptionRows({ def, look, contextOptions, options, selected, onPick }) returns `<div className={emptyPane} />` for no options, else one MenuItem per option

// PropertyPicker.pane.test.tsx — the compact case
    await render({ target: { kind: 'options', def: selectDef, current: null, look: 'compact' } })

// useViewHost.ts — pickTarget's options return
    return {
      kind: 'options',
      def,
      current,
      look: style.look,
      contextOptions:
        column.kind === 'context' && tree ? contextOptionsFor(column.id, tree) : undefined,
    }

// TableView.tsx — massPicker
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
```

**CHANGE**

- [ ] Write the failing `PropertyPicker.pane.test.tsx` cases (its existing harness; record channel calls through `stubDialer`):
  - A Select target shows a button labelled `New Option` inside a footer; pressing it shows an empty text field as the last row; typing `Fresh` + Enter asks `property:editOption` with `{ op: 'add', groupId: 'select', title: 'Fresh' }` (no `atIndex`), and `onCommit` is not called.
  - Blank Enter and Escape on the draft ask nothing.
  - A Status target and a Context target (with `contextOptions`) render no `New Option` button.
  - With the `menu` handler recording its items, a right-click on a row of a target with no `style` sends items labelled `['Edit Option', 'Clear', 'Remove']`.
- [ ] Update the existing compact case's target to `{ kind: 'options', def: selectDef, current: null, style: { current: { ...dateDefaults('full'), look: 'compact' }, set: () => {} } }`.
- [ ] Apply the AFTERs below. `PropertyPanel.panelTarget` is untouched — it has no view, so it carries no `style`. `colStyle` stays in `TableView` (it has other readers). `FilterFrame`'s `PropertyOptionRows` call passes neither `style` nor `editable` and is untouched.

**AFTER**

```tsx
// PropertyPicker.tsx — import changes
import { type RefObject, useEffect, useState } from 'react'
import type { ColumnStyle } from '../columnStyles'
import {
  optionsOf,
  type OptionPickKind,
  pickKindOf,
  type PickOption,
  PROPERTY_TYPES,
  type PropertyDefinition,
  SELECT_GROUP,
} from '../properties'
import { type OptionStyleControl, useOptionEdit } from '../Schema/useOptionEdit'
import {
  AccessoryButton,
  MenuFooting,
  MenuItem,
  MenuScrollFrame,
  MenuSeparator,
  MenuTopRow,
  menuDropLine,
} from '@pommora/uix/Menus'
import { footing, footingCentered, titleInput } from '@pommora/uix/Menus/menu-row.css'
import { PICKER_MAX_HEIGHT } from '@pommora/uix/Pickers/picker-base.css'
import { LineRow, LineZone, lineList } from '@pommora/uix/Interactions/drag'
import { RenamableLabel } from '@pommora/uix/Fields/RenamableLabel'
import { Reveal } from '@pommora/uix/Animations/Reveal'
import { useEntrance } from '@pommora/uix/Animations/useEntrance'
// `ColumnLook` leaves the `../columnStyles` import; every other existing import unchanged

// PropertyPicker.tsx — PickTarget
export type PickTarget = { def: PropertyDefinition; current: PropertyValue | null } & (
  | { kind: 'options'; style?: OptionStyleControl; contextOptions?: PickOption[] }
  | {
      kind: 'dateTime'
      dateFormat?: ColumnStyle['date_format']
      timeFormat?: ColumnStyle['time_format']
    }
  | { kind: 'file' }
)

// PropertyPicker.tsx — the options pane
        <PropertyOptionRows
          def={t.def}
          style={t.style}
          contextOptions={t.contextOptions}
          options={options}
          selected={selected}
          onPick={pick}
          editable
        />

// PropertyPicker.tsx — PropertyOptionRows and EditableOptionRows
export function PropertyOptionRows({
  def,
  style,
  contextOptions,
  options,
  selected,
  onPick,
  editable,
}: {
  def: PropertyDefinition
  style?: OptionStyleControl
  contextOptions?: PickOption[]
  options: PickOption[]
  selected: string[]
  onPick: (value: string) => void
  editable?: boolean
}): React.JSX.Element {
  if (editable && PROPERTY_TYPES[def.type].options === 'select')
    return (
      <EditableOptionRows
        def={def}
        style={style}
        options={options}
        selected={selected}
        onPick={onPick}
      />
    )
  if (options.length === 0) return <div className={emptyPane} />
  const look = style?.current.look
  return (
    <>
      {options.map((o) => (
        <MenuItem
          key={o.value}
          checked={selected.includes(o.value)}
          centered
          onClick={() => onPick(o.value)}
        >
          {contextOptions ? (
            <NeutralChip color={colorNameFor(o.color)} title={o.label} icon={o.icon} />
          ) : (
            <OptionChip type={def.type} look={look} option={o} def={def} />
          )}
        </MenuItem>
      ))}
    </>
  )
}

function EditableOptionRows({
  def,
  style,
  options,
  selected,
  onPick,
}: {
  def: PropertyDefinition
  style?: OptionStyleControl
  options: PickOption[]
  selected: string[]
  onPick: (value: string) => void
}): React.JSX.Element {
  const look = style?.current.look
  const edit = useOptionEdit({ propertyId: def.id, type: def.type, def, options, style })
  const [naming, setNaming] = useState(false)
  const entering = useEntrance(options, (o) => edit.keyOf(o.value))
  return (
    <>
      <MenuScrollFrame
        maxHeight={PICKER_MAX_HEIGHT}
        footer={
          <MenuFooting>
            <div className={look === 'compact' ? footingCentered : footing}>
              <AccessoryButton
                icon="plus"
                size="control"
                box={20}
                create
                ariaLabel="New Option"
                onClick={() => setNaming(true)}
              />
            </div>
          </MenuFooting>
        }
      >
        <LineZone
          {...lineList({
            commit: (value, slot) =>
              void edit.editOption({ op: 'move', value, groupId: SELECT_GROUP, toIndex: slot.index }),
            line: menuDropLine,
            label: (value) => value,
            chip: (value) => (
              <OptionChip
                type={def.type}
                look={look}
                option={options.find((o) => o.value === value)}
                def={def}
              />
            ),
            watch: [options],
          })}
        >
          {options.map((o) => (
            <Reveal key={edit.keyOf(o.value)} open enterOnMount={entering(edit.keyOf(o.value))} fill>
              <LineRow
                id={o.value}
                onContextMenu={(e) => {
                  e.preventDefault()
                  void edit.openMenu(o.value, e.currentTarget)
                }}
              >
                <MenuItem
                  checked={selected.includes(o.value)}
                  centered
                  onClick={() => onPick(o.value)}
                >
                  <OptionChip type={def.type} look={look} option={o} def={def} />
                </MenuItem>
              </LineRow>
            </Reveal>
          ))}
          {naming && (
            <MenuItem>
              <RenamableLabel
                renames="title"
                editing
                value=""
                className={titleInput}
                autoSize
                onCommit={(title) => {
                  setNaming(false)
                  void edit.editOption({ op: 'add', groupId: SELECT_GROUP, title })
                }}
                onCancel={() => setNaming(false)}
              />
            </MenuItem>
          )}
        </LineZone>
      </MenuScrollFrame>
      {edit.popup}
    </>
  )
}
```

```tsx
// Core/Properties/Pickers/MassPropertyPicker.tsx — complete
import type { RefObject } from 'react'
import type { PickOption, PropertyDefinition } from '../properties'
import type { PropertyValue } from '../propertyValue'
import type { OptionStyleControl } from '../Schema/useOptionEdit'
import { PickerMenu } from '@pommora/uix/Pickers/PickerMenu'
import { massPickCommits, massSelected } from './massAssign'
import { pickShape, PropertyOptionRows, selectedValues } from './PropertyPicker'

export function MassPropertyPicker({
  def,
  currents,
  open,
  triggerRef,
  style,
  contextOptions,
  onPick,
  onDismiss,
}: {
  def: PropertyDefinition
  currents: Array<PropertyValue | null>
  open: boolean
  triggerRef: RefObject<HTMLElement | null>
  style?: OptionStyleControl
  contextOptions?: PickOption[]
  onPick: (commits: Array<{ index: number; next: PropertyValue | null }>) => void
  onDismiss: () => void
}): React.JSX.Element {
  const { options, kind } = pickShape(def, contextOptions)
  const rows = currents.map(selectedValues)
  const selected = massSelected(
    options.map((o) => o.value),
    rows,
  )
  const pick = (value: string): void => {
    onPick(massPickCommits(rows, value, kind))
    if (kind === 'select') onDismiss()
  }
  return (
    <PickerMenu open={open} onDismiss={onDismiss} triggerRef={triggerRef} solid>
      <PropertyOptionRows
        def={def}
        style={style}
        contextOptions={contextOptions}
        options={options}
        selected={selected}
        onPick={pick}
        editable
      />
    </PickerMenu>
  )
}
```

```ts
// useViewHost.ts — pickTarget's options return
    return {
      kind: 'options',
      def,
      current,
      style: { current: style, set: (key, value) => setStylePatch(column.id, key, value) },
      contextOptions:
        column.kind === 'context' && tree ? contextOptionsFor(column.id, tree) : undefined,
    }
```

```tsx
// TableView.tsx — massPicker
    const target = pickTarget(rows[0], col)
    const opts = target.kind === 'options' ? target : undefined
    const currents = rows.map((r) => resolveFieldValue(r, col.id, schema))
    return (
      <MassPropertyPicker
        key={`${mass.colId}:${mass.rowIds.join('.')}`}
        def={target.def}
        currents={currents}
        open={massOpen}
        triggerRef={massTriggerRef}
        style={opts?.style}
        contextOptions={opts?.contextOptions}
```

**VERIFY**

- [ ] Check for unnecessary code or obvious mistakes; no second copy of drag, menu, or popup logic exists outside `useOptionEdit` and `lineList`.
- [ ] The new tests go red against the Phase-2 tree and green now; `cellGestures.test.tsx` and `cardGestures.test.tsx` pass unchanged.
- [ ] Run the gates; commit.

#### Review Checkpoint

- [ ] In a running app on `~/Test`, a Table cell's Select picker creates, reorders, and opens the menu and popup, and the Properties panel's picker offers no Style.

### Phase 4 — Live Drive And Reconciliation

**GOAL:** Prove every mutation end to end in the real app against a throwaway copy of the test Nexus, then rewrite what the plan made false. It's a separate phase because it runs against the finished surface.

#### Task 4.1

**TASK:** Write `.claude/scripts/Option Picker Drive/live-drive.mjs`, which backs up `~/Test`, launches the built app with its own userData and debug port, drives every mutation this plan adds through real gestures, asserts each on disk, and restores `~/Test` whatever the outcome.

**FILES:** `.claude/scripts/Option Picker Drive/live-drive.mjs` (new), `.claude/scripts/README.md`

**NOW:** `.claude/scripts/Case Matrix/live-drive.mjs` is the precedent: a `mkdtempSync` backup of `~/Test`, an own `userData` with `pommora.json` pointing at `~/Test`, `spawn` of the Electron binary in `Desktop/` with `POMMORA_DEBUG_PORT`, an `until` poller, a CDP `connect()` returning `send`/`evaluate`/`close`, `ask` over `window.nexus.ask`, `check(name, pass, detail)` reporting, and a `finally` that kills the process tree and `rsync -a --delete`s the backup back.

**CHANGE**

- [ ] Write the script on the skeleton below: the harness parts marked *precedent* are copied from `Case Matrix/live-drive.mjs` verbatim; the helpers are as written; each step is an `async function` above the `try`, implementing its row of the step table. `npm run build` runs first; the built output is launched. Picker controls are clicked through DOM `.click()` inside `Runtime.evaluate`, as `Guidelines/Development-Environment.md` requires for `PickerMenu` items; right-clicks and drags are real mouse events.
- [ ] Add the README paragraph below to `.claude/scripts/README.md`, after the `check-atlas.mjs` paragraph.

**AFTER**

```js
// .claude/scripts/Option Picker Drive/live-drive.mjs — skeleton with its helpers complete
import { execFileSync, spawn } from 'node:child_process'
import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { homedir, tmpdir } from 'node:os'
import { join } from 'node:path'

const REPO = join(homedir(), 'The Studio/Projects/Project Pommora')
const ELECTRON = join(REPO, 'node_modules/electron/dist/Electron.app/Contents/MacOS/Electron')
const NEXUS = join(homedir(), 'Test')
const PORT = 9343
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
// until, connect, ask, results, check — precedent

const osa = (script) => execFileSync('osascript', ['-e', script], { encoding: 'utf8' }).trim()
const key = (code) => osa(`tell application "System Events" to key code ${code}`)
const KEY = { down: 125, right: 124, ret: 36, esc: 53 }

async function activate(cdp, pid) {
  osa(`tell application "System Events" to set frontmost of (first process whose unix id is ${pid}) to true`)
  await cdp.send('Page.bringToFront')
  await sleep(300)
  const front = osa(`tell application "System Events" to get frontmost of (first process whose unix id is ${pid})`)
  if (front !== 'true') throw new Error('The app is not frontmost; no keystroke was sent.')
}

const boxOf = (cdp, selector) =>
  cdp.evaluate(`(() => { const b = document.querySelector(${JSON.stringify(selector)}).getBoundingClientRect(); return { x: b.x + b.width / 2, y: b.y + b.height / 2 } })()`)

async function rightClick(cdp, selector) {
  const { x, y } = await boxOf(cdp, selector)
  for (const type of ['mousePressed', 'mouseReleased'])
    await cdp.send('Input.dispatchMouseEvent', { type, x, y, button: 'right', clickCount: 1 })
  await sleep(400)
}

// A freshly popped native menu highlights nothing: the first Down lands on row 1.
async function chooseNative(cdp, pid, selector, { downs, into = [] }) {
  await activate(cdp, pid)
  await rightClick(cdp, selector)
  try {
    for (let i = 0; i < downs; i++) key(KEY.down)
    for (const d of into) {
      key(KEY.right)
      for (let i = 0; i < d; i++) key(KEY.down)
    }
    key(KEY.ret)
  } catch (e) {
    key(KEY.esc)
    throw e
  }
  await sleep(600)
}

const click = (cdp, selector) =>
  cdp.evaluate(`document.querySelector(${JSON.stringify(selector)}).click()`)

const VK = { Enter: 13, Escape: 27 }
async function pressKey(cdp, name) {
  for (const type of ['keyDown', 'keyUp'])
    await cdp.send('Input.dispatchKeyEvent', { type, key: name, code: name, windowsVirtualKeyCode: VK[name] })
}
async function typeAndEnter(cdp, text) {
  if (text) await cdp.send('Input.insertText', { text })
  await pressKey(cdp, 'Enter')
  await sleep(600)
}

async function drag(cdp, from, to) {
  const a = await boxOf(cdp, from)
  const b = await boxOf(cdp, to)
  const end = b.y - 6
  await cdp.send('Input.dispatchMouseEvent', { type: 'mousePressed', x: a.x, y: a.y, button: 'left', buttons: 1, clickCount: 1 })
  for (let i = 1; i <= 8; i++)
    await cdp.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: a.x, y: a.y + ((end - a.y) * i) / 8, button: 'left', buttons: 1 })
  await cdp.send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: b.x, y: end, button: 'left', buttons: 0, clickCount: 1 })
  await sleep(800)
}

const defNamed = (name) =>
  Object.values(JSON.parse(readFileSync(join(NEXUS, '.nexus/properties.json'), 'utf8')).defs).find((d) => d.name === name)
const optionValues = (name) => (defNamed(name).select_options ?? []).map((o) => o.value)
const read = (rel) => readFileSync(join(NEXUS, rel), 'utf8')

// backup, userData, launch with POMMORA_DEBUG_PORT=PORT, `child` and its `pid` — precedent
try {
  // connect + wait for the sidebar — precedent
  await seed(cdp)
  await proveNativeMenu(cdp, pid)
  await stepCreate(cdp)
  await stepRefuseBlankAndEscape(cdp)
  await stepRefuseDuplicate(cdp)
  await stepDragReorder(cdp)
  await stepStyleCompact(cdp, pid)
  await stepEditOption(cdp, pid)
  await stepClearRemove(cdp, pid)
  await stepCardsAndMass(cdp)
  await stepMulti(cdp)
  await stepEditor(cdp, pid)
  await stepHostRefusal(cdp)
  cdp.close()
} finally {
  // kill the process tree, rsync the backup back, remove it — precedent
}
console.log(`${results.filter((r) => r.pass).length}/${results.length} passed`)
process.exit(results.every((r) => r.pass) ? 0 : 1)
```

Every step asserts with `check` after `sleep(800)`. Row selectors are found by the option's text inside the open picker (`[data-picker-portal]`); the Table's menu has Style first, so Edit Option is Down ×2, Clear ×3, Remove ×4 there.

| Step | Gesture | Asserts |
| --- | --- | --- |
| `seed` | `ask('schema:add', 'Collection A', { id: '', name, type })` for `Drive Select` (`select`), `Drive Multi` (`multiSelect`), and `Drive Status` (`status`); `ask('property:editOption', id, { op: 'add', groupId: 'select', title })` for `Alpha`, `Beta` and `One`, `Two`; `ask('mutate', …)` creates pages `Drive One` and `Drive Two` in `Collection A` and sets `Drive Select` `[Alpha]` / `[Beta]` and `Drive Multi` `[One]` on `Drive One` | every reply `ok` |
| `proveNativeMenu` | open `Drive One`'s `Drive Select` cell picker; `chooseNative` on the `Alpha` row, `{ downs: 2 }`; `pressKey(cdp, 'Escape')` closes the popup | `[aria-label="Option Title"]` existed; otherwise throw, ending the run |
| `stepCreate` | `click('[aria-label="New Option"]')`; `typeAndEnter('Fresh')` | `optionValues('Drive Select')` ends with `Fresh`, whose option has no `color`; `Drive One.md`'s `Drive Select` still lists `Alpha` alone |
| `stepRefuseBlankAndEscape` | `+` → `typeAndEnter('')`; `+` → `Input.insertText('Nope')` → `pressKey(cdp, 'Escape')` | options unchanged both times |
| `stepRefuseDuplicate` | `+` → `typeAndEnter('alpha')` | options unchanged; a notification is in the DOM |
| `stepDragReorder` | `drag` from the `Fresh` row to the `Alpha` row | order `Fresh, Alpha, Beta` |
| `stepStyleCompact` | `chooseNative(Alpha row, { downs: 1, into: [2] })` (Style ▸ Compact) | the view sidecar's `column_styles[<Drive Select id>].look === 'compact'` |
| `stepEditOption` | `chooseNative(Beta row, { downs: 2 })`; in the popup, set the title field to `Gamma` and blur it; then clear it and blur; click a color cell; pick Clear in Appearance; open the icon seat and pick the first icon | registry and `Drive Two.md` read `Gamma`, and the popup is still open with title `Gamma`; after the blank blur the field reads `Gamma` and the registry is unchanged; `Gamma` carries `color`, `appearance: 'clear'`, and `icon` |
| `stepClearRemove` | `chooseNative(Alpha row, { downs: 3 })` → click the dialog's confirm; then `chooseNative(Alpha row, { downs: 4 })` → confirm | after Clear: no page lists `Alpha`, and `Alpha` is still an option; after Remove: `Alpha` is gone from the registry |
| `stepCardsAndMass` | switch the view to Cards, open `Drive One`'s card `Drive Select` picker, `+` → `typeAndEnter('Card New')`; back to Table, ⌘-click both rows' `Drive Select` cells, open the mass picker, `+` → `typeAndEnter('Mass New')` | both appended; neither page lists them |
| `stepMulti` | `Drive One`'s `Drive Multi` picker, `+` → `typeAndEnter('Three')` | `Three` appended; `Drive One.md`'s `Drive Multi` still lists `One` alone |
| `stepEditor` | open the view settings › Properties › `Drive Status`; `chooseNative` on its first option row, `{ downs: 2 }` → popup; rename it to `Opened` there; click that row's `[aria-label="Edit Option"]` twice; click the first group's `+` → `typeAndEnter('')`; double-click the first heading → select all → `typeAndEnter('Queued')` | the option reads `Opened` in `status_groups`; the popup opened then closed; no option was added; the first group's `label === 'Queued'` |
| `stepHostRefusal` | `ask('property:editOption', <Drive Select id>, { op: 'add', groupId: 'select', title: '' })` | `ok === false` |

```markdown
<!-- .claude/scripts/README.md — new paragraph -->
`Option Picker Drive/live-drive.mjs` drives every option mutation the value picker and the
Property Frame's option editor offer — creation from the picker's footer, blank and duplicate
refusals, drag reorder, the right-click menu's Style, Edit Option, Clear and Remove, the popup's
rename, color, appearance and icon, and the host's own blank refusal — against the real app, and
asserts each one in `.nexus/properties.json`, the page files and the view's sidecar. It backs up
`~/Test`, launches the built app with its own userData and debug port, and restores `~/Test` when it
ends, pass or fail. Native menus are chosen with System Events keystrokes, so the terminal needs
Accessibility permission, and the run refuses to send a key unless the app is frontmost.
```

**VERIFY**

- [ ] Run it; read every line; it exits 0.
- [ ] `diff -r` of `~/Test` against a copy taken before the run shows no difference.

#### Task 4.2

**TASK:** Rewrite the documentation this plan made false.

**FILES:** `.claude/Features/PropertiesPM.md`

**CHANGE**

- [ ] Replace the three passages below in place.

**AFTER**

```markdown
<!-- §Select & Multi-Select — second paragraph, complete -->
The option editor is an inline list under a Style toggle, grouped under labeled headings where the type has groups, with double-click on a heading to relabel its group: a `+` per list or group, a hover square-pen opening the per-option editor — icon and title fields over the color grid over an **Appearance** toggle (**Filled**, the tinted default, or **Clear**, which drops the fill and keeps the tinted border and label) — drag to reorder within or across groups, and a right-click **Style ▸ · Edit Option · Clear · Remove** menu, where Style sets the view's look and Edit Option opens the same per-option editor. The **Compact** style renders each chip icon-only — the option's own icon, or the single- or double-tag default.

<!-- §Shared Mechanisms › The Value Picker — complete -->
**The Value Picker.** Where the Property Frame assigns the schema, setting a member's value runs through one control (`Core/Properties/Pickers/PropertyPicker.tsx`) across every surface that assigns one — the page window's SidePane, the Properties panel, and the Cards and Table views. It renders the popup each type needs: option rows for Select, Status, Multi-Select, and Context; a calendar for Date; a file field for File; and it can open on a chooser pane that adds a property and drills straight into its value. A Select or Multi-Select list also edits its options in place: a `+` beneath it names a new option, added at the end and left unassigned; its rows drag to reorder the property's options; and a row's right-click offers the option editor's menu, without Style where no view is in hand. Text-shaped values — a number, a link's address or alias — keep the shared text field. The Properties panel (`Core/Properties/PropertyPanel.tsx`) is the value surface itself: a page's or a Space's shown Contexts and properties as menu rows, each row's value opening the picker, and the row's own menu clearing the value or removing the row.

<!-- §Validation — replaces "Select and Multi-select option titles are unique within their property, compared without regard to case, a blank option takes the first free `Label` or group label, and a zero-option Select is legal." -->
Select and Multi-select option titles are non-empty and unique within their property, compared without regard to case, and a zero-option Select is legal.
```

**VERIFY**

- [ ] `grep -n "Rename · Edit Icon · Remove · Clear\|first free" .claude/Features/PropertiesPM.md` → no hits; the edited paragraphs read whole.

### Completion Criteria

**Conformance**

- [ ] No duplicated mechanism: `grep -rn "optionMenuModel(" Core | grep -v test | grep -v "export function"` → 1 hit (`useOptionEdit.tsx`); `grep -rn "<OptionEditPopup" Core | grep -v test` → 1 hit (`useOptionEdit.tsx`); `grep -rn "'property:editOption'\|'property:renameOption'\|'property:removeOption'\|'property:clearOption'" Core --include="*.ts*" | grep -v test | grep -v Contract | grep -v handlers` → hits only in `useOptionEdit.tsx`.
- [ ] Nothing changed outside what the plan named: `git diff --name-only <baseline>..HEAD` matches the FILES lists.

**Correctness**

- [ ] A Select or Multi-Select picker in a Table cell, a Card, the Properties panel, and mass-assign creates a grey, unassigned option at the end; refuses a blank; drags to reorder; and opens Style (where a view exists) · Edit Option · Clear · Remove.
- [ ] The Property Frame editor offers the same menu for Select, Multi-Select, and Status, refuses blank names, and keeps the pen and the footing Style control.
- [ ] The host refuses a blank option title.
- [ ] The live-drive script passes every check end to end.

**Completeness**

- [ ] Every task ticked; no scaffolding, debug output, or unauthorized TODO in `<baseline>..HEAD`.

**Confirmation**

- [ ] Every new test goes red with its change reverted; every verification result read.
- [ ] Nathan: Footer + Draft Look · Drag Feel · Menu + Popup.

**Continuity**

- [ ] *§Reconciliation* complete; `PropertiesPM.md` reads true; *§Deviations* each fixed or ruled on.

**Confidence**

- [ ] Gates green from clean on `<baseline>..HEAD`; *§Baseline* counts moved as planned.
- [ ] Diff size as implied — net source growth under ~120 lines (comments and tests excluded), with the editor family's removals offsetting the picker's additions.

### Final Verification

**THE STANDARD:** The work is finished when a later review of it finds nothing to correct. Nothing is carried as a concern, nothing is deferred where the fix is known, and nothing is declared that wasn't watched happen. Ambiguity met during execution took the simplest reading and was recorded; it didn't stop the run. Edits found in adjacent files that no task made belong to Nathan — folded into the commit at hand, not reverted.

- [ ] Phase review dispatched: Phase 1 · Phase 2 · Phase 3 · Phase 4
- [ ] All findings fixed or ruled on
- [ ] Neutral verification passed on `<baseline>..HEAD`
- [ ] Final pass: gates · baseline · diff · deviations · criteria
- [ ] Reconciliation walked; living documents read
- [ ] Report delivered

#### Reconciliation

- `.claude/Features/PropertiesPM.md` §Select & Multi-Select — "a right-click **Rename · Edit Icon · Remove · Clear** menu" — Task 4.2
- `.claude/Features/PropertiesPM.md` §Validation — "a blank option takes the first free `Label` or group label" — Task 4.2
- `.claude/Features/PropertiesPM.md` §The Value Picker — silent on the picker's creation, reorder, and option menu — Task 4.2
- `Core/Actions/optionMenu.ts` — the file comment states Remove/Clear in the old order — Task 2.1
- `Core/Actions/optionMenu.test.ts`, `OptionEditor.test.tsx`, `optionModel.test.ts`, `PropertyFrame.test.tsx`, `PropertyPicker.pane.test.tsx` — assert the old menu, the `fallbackTitle` fallback, the `OptionEditor` mock, and a `look` on the pick target — Tasks 2.1, 2.3, 3.1

#### Report & Closure

Per the skill's 5.5 shape, written when the chain above is confirmed.

### Deviations

