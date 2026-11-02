### Scout 1 — The Two Pickers

**DATE:** 11-01-2026
**BASE:** `8824cce29`
**SCOPE:** B-1 to B-7, C-1 to C-4, Open Items 1, 6, 7, and 8, plus the open assessment of `MassPropertyPicker`.

Everything below was built before it was written. A scratch copy of the tree at `8824cce29` took the whole proposal, with Scout 2's `itemColumns`, `cardAddColumns`, `holdsValue`, and `GROUP_LABELS` applied as its report writes them, then ran typecheck (UIX, Core, Core src, Desktop web), the full test suite (9,074 passing, 2 skipped), and Biome on the touched folders, which came back clean. Live drives ran on the dev and built apps against a copied `~/Test`, with entries as a small row type; Scout 2's columns are covered by the test suite alone. The repo wasn't touched, and the copy is gone. The exact result is saved as a patch:

`.claude/Planning/Metadata Picker/Scouts/Planning/1 — Two Pickers.patch`

**Result:** `-84 (+361 / -445)` production lines including Scout 2's builder share, or `-82 (+319 / -401)` without it. `ValueSeat.tsx` grows 353 to 392, `PropertyPicker.tsx` falls 338 to 278, `TableView.tsx` falls 555 to 507, `CardsView.tsx` falls 983 to 926, `PropertyPanel.tsx` falls 423 to 405, and `MetadataPicker.tsx` (94) replaces `MassPropertyPicker.tsx` (35).

---

#### 1. Contradictions

**C-3 Rests on a Difference That Isn't There.** The calendar's right-hand label doesn't sit differently from an option list's. Measured live on the same pane route:

| Bar | Row Height | Row Vertical Pad | Row Right Pad | Label To Pane Edge |
|---|---|---|---|---|
| Add, over the Stage list | 14px | 0 | 0 | 4.55px |
| Add, over the calendar | 14px | 0 | 0 | 4.55px |
| Settings slide (`MenuSurface`) | 18px | 2px | 0 | 10px |
| Add, after the change, over both | 18px | 2px | 0 | 4.55px |

Two things produce what Nathan saw. `chooserTop` zeroes `--row-pad-y` (`Core/Properties/Pickers/property-picker.css.ts:4`), so the bar stands 14px where every other bar stands 18px, which is the one real layout difference; and `MenuItem` zeroes `--row-pad-trail` for any `trailing` (`UIX/Menus/MenuRows.tsx`, `rowStyle`), so every back bar's label sits flush on its row's right edge and takes its inset from the surface, 4px in `PickerMenu` against 10px in `MenuSurface`. A wide pane makes that flushness obvious, and the chip-centred option list hides it.

Removing `chooserTop` is the fix, and it's a removal. The label's horizontal inset stays, because in Settings that flush edge is what lines it up with the toggles and values beneath it. Padding `topBarTrailingLabel` is one line, but it moves every bar and breaks that alignment, so I don't recommend it. Nathan should look at the crop before ratifying: `Crops/back-bar-before-after.png` (before on top) beside `Crops/back-bar-settings.png`.

**B-7 Is Right but Understates It.** See *§The Sweep*. The file is the small half; the parallel seat in `TableView` is the large one. The honest answer goes further than B-7 and still satisfies it.

**Open Item 6 Is Wider Than Written.** Two anchors vanish, not one. Besides the `+` (`PropertyPanel.tsx:346`), a standing Add row dies at the same moment: it renders at `:372` and its held form at `:379`, two JSX positions, so the row remounts when the first row lands, and `seat.anchor` goes stale. Both are fixed; the seat's closing rule stays as it is.

**Open Item 7 Isn't a Ceiling Problem.** Nothing caps the calendar today (331px measured). It would only be capped if one `MenuScrollFrame` wrapped both pane kinds. The ceiling belongs to the option rows, so the calendar needs no escape.

**Open Item 8's Wording Is Off, and the Key Is Still Required.** A slid calendar always opens blank, because an entry holding a value shows rather than slides. The failure is the second date displaying the *first* date's pick. Without the key, the pin fails; with it, Due reads one selected day and Start reads none.

**Fresh-Eyes #26 Is Answered:** the seat goes plural as data, not as a mode. `pickOver` already takes a list (`pickModel.ts:31`), so one row and many are the same path.

**The Seam With Scout 2:** its hand-off says `PickEntry` gets no successor, and this design follows it: the list draws plain `ResolvedColumn`s from `ItemColumns`, with `columnLabel`, `columnIcon`, and `GROUP_LABELS`. It needs no `MetadataEntry` row, `entryGroup`, second group key in the panel, or stored name in the back bar. The outcome is `entryOutcome` in `valueClick.ts`, derived from `valueClickIntent`, which is already pure, so `intentOf` goes private as M-4 asks. Scout 2's other finding, that `pickGroups` doesn't filter its Context arm, is in this change, since it decides whether an empty Context draws `emptyPane`.

**The Seam With Scout 5:** it proposes that `PickerMenu` dismiss itself when its trigger disconnects, and leaves the seat's half of that rule to this plan. The seat's check should stay: it also closes inline editors, which have no shell (`ValueSeat.tsx:87`, its compact-card case). The two agree, and neither fires on the panel's Add now that both anchors survive.

**The Seam With Scout 4:** three of its tasks touch the same lines and should merge with this work rather than land twice. E-6's `'dateTime'` merge (K-7) is §5's items 1 and 2 here, and its new pin is the calendar pin in the patch. `MenuTopRow.className` and `chooserTop` appear in both inventories, with one removal between them. `PickerMenu`'s `anchorX` becomes `centerX` in its K-4, so `PropertyPicker`'s prop takes that name. The patch is written against HEAD and uses today's name; the hunks below use the final one. `pickModel.ts:13` takes both its re-key removal, in K-9, and my filter move, which sit on adjacent lines and don't conflict: `optionGroupsOf(column.def).map((g) => ({ id: g.id, options: groupOptions(g) }))`, with the `.filter` outside.

**A Defect at HEAD's Route, Found in Dev:** in the dev app, a one-line Text editor closed itself right after mounting, on a direct click on a shown value as well as from Add. The trace showed `view.destroy()` under StrictMode's double effect firing the blur that calls `leave` (`ValueEditor.tsx:117`), which closes the seat. The built app, where effects don't run twice, is fine, and Text typed through Add landed there. The prototype doesn't touch that path, but I didn't run an unmodified tree, so it's unconfirmed at HEAD, and my drive used focus emulation, which a real window may not share. If it reproduces, it joins *Picker Cleanup*: Nathan's daily instance is the dev app. The fix is `viewRef.current = null` before `view.destroy()` in the effect's cleanup, with the blur handler stopping when `viewRef.current` is null. It should be checked on a scratch instance, since a Text edit on Nathan's live one writes to his files.

**C-4's Width Can't Match:** `Level` passes `maxWidth={180}`, but `FrameSlide` applies its box to both slots (`FrameSlide.tsx:83`), which would clip the 215px calendar. C-4 lists spacing, icon size, and height, so the list keeps `minWidth={120}` alone.

---

#### 2. What's True

**The Route Today:** every value lands through `seat.run` (`ValueSeat.tsx:101`) or the chooser, drawn by one `PropertyPicker` that `ValueSeat` mounts at `:277`. The chooser reaches it through `chooser`, `resolveTarget`, `onReveal`, and an `entry` argument on `onCommit`, each threaded through `SeatChooser` (`:252-257`). `resolveTarget` recomputes `seat.target` (`:285-292`), and the commit branches on `entry` for its row and its column (`:296-300`).

**The Hosts:** `useValueSeat` at `TableView.tsx:95`, `CardsView.tsx:198`, `PropertyPanel.tsx:79`, and `MenuSeat` (`ValueSeat.tsx:320`). `ValueSeat` at `TableView.tsx:378`, `CardsView.tsx:474`, `PropertyPanel.tsx:403`, and `ValueSeat.tsx:352`. Importers of the seat's file: `App.tsx:29`, `PropertyPanel.tsx:20`, `useViewHost.ts:36`, `CardsView.tsx:56`, `TableView.tsx:13`, `ValueSeat.test.tsx:16`.

**Pane Bodies:** `PropertyOptionRows` is also `FilterFrame.tsx:181`'s, and `DateTimeValuePicker` is also `FilterFrame`'s (`:342,351`). Neither changes for filters.

**The Bar:** thirteen `MenuTopRow` sites; `PropertyPicker.tsx:175` is the only `className` user. `Level` (`MenuPresenter.tsx:61-65`) sets the shape every in-pane list should take: `MenuScrollFrame maxHeight={PICKER_MAX_HEIGHT} header={…}`, so 240 includes the bar.

**The Panel's rAF (`:260-269`) Has Two Reasons:** the chooser's dismiss ran `seat.close()` synchronously after `onReveal` (`ValueSeat.tsx:302-305`), and the row's element doesn't exist until the reveal renders, while the seat closes on a disconnected anchor (`:88-90`). What `el` serves in editor mode is only that check: the inline input never reads the anchor (`:204`).

**The Sweep Today:** `cellSweep.ts` owns the gesture and the highlight. `TableView` holds `mass`, `massOpen`, and `massTriggerRef` (`:163-165`), a degraded-close effect (`:185-194`), `massPicker()` (`:196-227`) with its own commit loop and `groupUndo`, and `seat.target(rows[0], col)` (`:205`), of which only `column`, `style`, and `contextOptions` are used. `mass` is never cleared, so after any sweep `massPicker()` rebuilds a target and every row's value on each `TableView` render, for the life of the view. The only automated coverage is the Option Picker Drive (`:207`).

---

#### 3. Removal Inventory

| What Leaves | Where |
|---|---|
| `PickEntry` | `PropertyPicker.tsx:56-63` |
| `chooser`, `onReveal`, `resolveTarget` props; `entry` commit argument | `PropertyPicker.tsx:67,72,74,77,81,82,84` |
| `picked`, its reset effect, `t`, `commit` | `PropertyPicker.tsx:87-93` |
| `entryRow`, `spaces`, `rest`, the chooser branch with `minHeight={0}` and `?? 'Properties'` | `PropertyPicker.tsx:126-141,152-184` |
| Imports: `useEffect`, `useState`, `MenuTopRow`, `FrameSlide`, `Icon`, `chooserTop` | `PropertyPicker.tsx:1,26,31,34,39` |
| The `open` prop and `useHeld`, since `PickerMenu` holds its children and freezes placement through the exit | `PropertyPicker.tsx:35,68,78,86` |
| Shared `{ current }` on `PickTarget` (now `currents` on options, `current` on dates) | `PropertyPicker.tsx:41` |
| `chooserTop`, its `topRow` import | `property-picker.css.ts:2,4` |
| `MenuTopRow`'s `className` prop and its `cx(…)` wrap (the `cx` import stays, `MenuItem` uses it) | `UIX/Menus/MenuRows.tsx:35,41,51` |
| `MassPropertyPicker.tsx` | whole file |
| `mass`, `massOpen`, `massTriggerRef`, `massDegraded` and its effect, `massPicker()`, the `groupUndo` loop | `TableView.tsx:163-165,185-194,196-227,379` |
| Imports: `useRef`, `resolveFieldValue`, `MassPropertyPicker`, `groupUndo` | `TableView.tsx:1,8,11,12` |
| `SeatChooser`, `chooser` prop, `!chooser &&` gate, `resolveTarget` lambda, dual commit, dual dismiss | `ValueSeat.tsx:251-257,262,265,280,284-293,296-305` |
| `'dateTime'` arm (E-6) | `ValueSeat.tsx:130-131`; `valueClick.ts:13,37-38` |
| Public `run`, `intentOf` | `ValueSeat.tsx:248` |
| The open-away rule's two copies | `ValueSeat.tsx:342-348`; `CardsView.tsx:495-500` |
| `AddPickerRequest`, `openAddPicker`, `addableFor`, `addPicker`, the orphan effect, `addRow`, `addEntries`, the `addPicker` ghost check, the emptied *Value and Add Pickers* banner, the `chooser` prop | `CardsView.tsx:76-79,97,101,162,177,215,218-225,275-278,282,476-508` |
| Imports: `PickEntry`, `AddEntry`, `orderAddableEntries`, `pickKindOf`, `columnIcon` | `CardsView.tsx:7,46,54,62-67` |
| `addEntriesFor`, `AddEntry`, `orderAddableEntries` (Scout 2's builder) | `cardColumns.ts:31-69` |
| `addOpen`, its two clears, `hidden()`, `revealAndEdit`, the `addOpen` ghost check, the standing branch, the `chooser` prop | `PropertyPanel.tsx:67,98,140,183-186,250,260-269,372,405-412` |
| Writes to `seat.anchor` | `CardsView.tsx:276`; `PropertyPanel.tsx:189` |
| Tests | `PropertyPicker.pane.test.tsx:151-248`; `cardColumns.test.ts`'s `orderAddableEntries` block and stamp case; `cardGestures.test.tsx:275` (rewritten) |

---

#### 4. Approaches

##### How `MetadataPicker` Reaches the Seat

- **Seat-Owned, Read From `seat` (Recommended):** `ValueSeat` draws three panes, and `MetadataPicker` takes only `seat`. It calls `seat.target([row], column)` itself, so `resolveTarget` has nothing left to do; it commits through `seat.commitPicks`, so nothing flows back up. Hosts change by one `add` member on `SeatHost`.
- **Props From Each Host:** `row`, `entries`, `onPick`, and `onCommit` per host. This keeps `addPicker` in the hosts against B-6 and rebuilds the two-way commit as wiring. Rejected.

##### Where the Open State Lives

- **One Union on `open` (Recommended):** `PaneOpen | { mode: 'add'; rowId; group?; slid? }`. A list and a pane can't both be open, picking a typed entry is one transition, ghost suppression reads `seat.open` alone, and the slid entry needs no reset effect, since closing discards it. It meets the finite-state rule.
- **A Separate `adding` State:** leaves `seat.open`'s shape alone, so `TableView:253` needs no narrowing, but two states can disagree, every open must clear the other, and hosts check both. Rejected.
- **Local `slid` in `MetadataPicker`:** that's today's `picked` with its `useEffect` reset (`PropertyPicker.tsx:87-90`). Rejected.

##### The Sweep: What `MassPropertyPicker` Should Become

What a multi-row pick is: one option pane, opened at one cell, over several rows, landing one fan-out under one undo step. Every part of that is a seat's job, and the sweep runs its own copy of each: an open flag, an anchor ref, a close rule, a column lookup, and a commit loop.

| Option | What Happens | Verdict |
|---|---|---|
| **Leave It**, with `origin="right"` for B-8 | One line. After `ValuePane`, it's a third `pickOver` + `PropertyOptionRows` + `PickerMenu` | Fails *One Way* |
| **B-7 As Read:** `currents[]` on the target, `TableView` mounts a second `PropertyPicker` | Removes 35 lines and keeps all five parallels and the per-render rebuild | Half-done |
| **A `useSweepPick` Hook** in `cellSweep.ts` | Tidies `TableView` by moving the parallels, removing none | Rejected |
| **The Sweep Is a Seat Open (Recommended)** | `swept?: string[]` on the pane's open, `seat.sweep(...)`, one picker in `ValueSeat` | Removes the file and a net 48 lines of `TableView` |

**What Stays:** `cellSweep.ts` is genuinely the table's, a pointer gesture and a highlight. `pickOver` and `pickCommits` are already the right plural model and don't change. `groupUndo` moves into `commitPicks`, where a single value is a group of one, so its `if (commits.length)` guard goes too, since `groupUndo` already returns on an empty group (`undo.ts:36`).

**Result, Driven Live:** the sweep's pane opened at exactly the single-click rect (1109-1188 × 398-557), settling B-8 with no origin code. A Select pick landed on all three rows, closed the pane, and cleared the highlight; ⌘Z reverted all three in one step; a Multi-Select stayed open through two picks.

**One Behavior Change:** a sweep closed at fewer than two surviving rows. It should now close as every pane does, when its cell leaves, and pick over whatever rows remain. The rule existed only because `mass` kept its own state.

##### Whether the rAF Can Leave (Open Item 1)

Yes, entirely. Its first reason goes with the chooser, since the list's close and the value's open are now one state change.

- **`flushSync` (Recommended):** `flushSync(() => show(column))`, then run at `host.anchor(el, column)`. The row is committed before the seat reads it, in one handler, with no frame to fall into. Precedent: `MatrixView.tsx:68` does exactly this ("Committed before the menu asks for it").
- **A Pending-Edit State With a Layout Effect:** deterministic, but more code than the rAF it replaces.
- **Re-Resolving the Anchor in the Close Check:** a query on every render a pane is open, for a one-time need.

##### Where the Panel's Add Anchors (Open Item 6)

- **Keep Both Anchors Alive (Recommended):** `{(addable || opened) && <AccessoryButton…`, and one JSX slot for the Add row so its element survives the first row landing.
- **Anchor on the Heading:** stable, but moves where the pane opens.
- **Exempt Add From the Close Check:** the shell re-measures a detached trigger to zeros. Rejected.

##### Where the Value Seat Lives (For Nathan's Approval)

- **`Core/Properties/Pickers/ValueSeat.tsx` (Recommended):** its collaborators are already there: `valueClick.ts` (its only importer is the seat), `filePick.ts`, `PropertyValueInput.tsx`, and both pickers. It adds no folder, and `Cells/` returns to drawing values (`Cell`, `CheckboxGlyph`, `LinkCell`, `OptionChip`, `TextCell`).
- **`Core/Properties/Seat/`:** a folder for two or three files, and a second place to look.
- **`Core/Properties/ValueSeat.tsx`:** beside `PropertyPanel.tsx`, but apart from everything it routes to.

I'd keep `valueClick.ts` as its own file: it's a pure rule table with its own tests, and Decisions doesn't ask to fold it. `MenuSeat` stays in the seat's file at this size.

---

#### 5. The Proposed Change

Full text is in the patch; these are the shapes that matter, as they land. Paths use the current `Cells/` location, since the move is one commit at the end.

**1. `valueClick.ts`:** `'dateTime'` merges into `'picker'`, and the Add outcome is derived from what a click means, so there's no parallel rule. `swept` stays off `ValueIntent`, since no click or menu can produce it, and `EntryOutcome` stays unexported. The body needs no `!intent` arm, since stamps can't reach it. The file's head comment gains one sentence for it: "An Add entry shows a value it holds, slides into a picker, or acts as that click."

```ts
| { kind: 'picker' }

type EntryOutcome = 'show' | 'slide' | 'click'

export function entryOutcome(type: ColumnType, value: PropertyValue): EntryOutcome {
  if (!isBlankValue(value)) return 'show'
  return valueClickIntent(type, value)?.kind === 'picker' ? 'slide' : 'click'
}
```

**2. `PropertyPicker.tsx:41-187`:** becomes `PickTarget`, `ValuePane`, and a thin `PropertyPicker`, which takes no `open` and no `useHeld`: it reads `target` itself and passes `open={target !== null}` to `PickerMenu`, which holds its children and freezes placement through the exit. `header` threads into both `MenuScrollFrame`s (`:218,281`), which is what puts the bar inside the 240 limit. The calendar takes it above itself, uncapped, which closes Open Item 7.

```tsx
export type PickTarget =
  | { kind: 'options'; column: ResolvedColumn; pick: OptionPickKind
      currents: Array<PropertyValue | null>; style?: OptionStyleControl; contextOptions?: PickOption[] }
  | { kind: 'dateTime'; current: PropertyValue | null
      dateFormat?: ColumnStyle['date_format']; timeFormat?: ColumnStyle['time_format'] }

export function ValuePane({ target, header, onCommit, onClose }: {
  target: PickTarget
  header?: ReactNode
  onCommit: (commits: PickCommit[]) => void
  onClose: () => void
}): React.JSX.Element {
  if (target.kind === 'dateTime')
    return (
      <>
        {header}
        <DateTimeValuePicker value={target.current} dateFormat={target.dateFormat}
          timeFormat={target.timeFormat} span onCommit={(next) => onCommit([{ index: 0, next }])} />
      </>
    )
  const { selected, pick } = pickOver(target.pick, target.currents, onCommit, onClose)
  return (
    <PropertyOptionRows column={target.column} style={target.style} contextOptions={target.contextOptions}
      header={header} selected={selected} onPick={pick} editable />
  )
}

export function PropertyPicker({ target, triggerRef, centerX, onCommit, onDismiss }) {
  const options = target?.kind === 'options'
  return (
    <PickerMenu solid open={target !== null} onDismiss={onDismiss} triggerRef={triggerRef}
      origin={!options ? 'auto' : centerX !== undefined ? 'center' : 'right'}
      centerX={options ? centerX : undefined}>
      {target && <ValuePane target={target} onCommit={onCommit} onClose={onDismiss} />}
    </PickerMenu>
  )
}
```

**3. `MetadataPicker.tsx` (New, `Core/Properties/Pickers/`):** the whole component. It takes no row type, since Scout 2's builder supplies the columns, and it carries no doc comment. Its kit imports go by path: `FrameSlide` from `@pommora/uix/Menus/FrameSlide`, and `MenuItem`, `MenuScrollFrame`, `MenuSeparator`, and `MenuTopRow` from `@pommora/uix/Menus/MenuRows`.

```tsx
export function MetadataPicker({ seat }: { seat: ValueSeatApi }): React.JSX.Element {
  const contexts = contextsByIdOf(useSession((s) => s.tree))
  const { open, host } = seat
  const adding = open?.mode === 'add' ? open : null
  const row = adding ? host.rowOf(adding.rowId) : undefined
  const column = adding?.slid ? host.columnOf(adding.slid) : undefined
  const target = row && column ? seat.target([row], column) : null

  const entryRow = (at: ViewRow, entry: ResolvedColumn): React.JSX.Element => {
    const outcome = entryOutcome(entry.type, resolveFieldValue(at, entry))
    const choose = (): void => {
      switch (outcome) {
        case 'show':
          host.add?.show(entry)
          seat.close()
          break
        case 'slide':
          seat.slide(entry.id)
          break
        case 'click':
          seat.close()
          seat.openAway(at, entry, seat.anchor.current)
      }
    }
    return (
      <MenuItem
        key={entry.id}
        leading={<Icon name={columnIcon(entry, contexts)} size="control" />}
        trailing={outcome === 'slide' ? <Icon name="chevron-right" size="control" /> : undefined}
        onClick={choose}
      >
        {columnLabel(entry, contexts)}
      </MenuItem>
    )
  }
  const item = row && host.add?.columns(row)
  const spaces = item && adding?.group !== 'properties' ? item.contexts : []
  const rest = item && adding?.group !== 'contexts' ? item.properties : []

  return (
    <PickerMenu solid open={adding !== null} onDismiss={seat.close} triggerRef={seat.anchor}>
      <FrameSlide
        open={target !== null}
        minWidth={120}
        root={
          row && spaces.length + rest.length > 0 ? (
            <MenuScrollFrame maxHeight={PICKER_MAX_HEIGHT}>
              {spaces.map((c) => entryRow(row, c))}
              {spaces.length > 0 && rest.length > 0 && <MenuSeparator />}
              {rest.map((c) => entryRow(row, c))}
            </MenuScrollFrame>
          ) : (
            <div className={emptyPane} />
          )
        }
        detail={
          row && column && target && (
            <ValuePane
              key={column.id}
              target={target}
              header={
                <MenuTopRow
                  label={GROUP_LABELS[column.kind === 'context' ? 'contexts' : 'properties']}
                  current={columnLabel(column, contexts)}
                  onBack={() => seat.slide()}
                />
              }
              onCommit={(commits) => seat.commitPicks([row], column, commits)}
              onClose={seat.close}
            />
          )
        }
      />
    </PickerMenu>
  )
}
```

`key={column.id}` is Open Item 8's answer. `slid` holds a column id, so a property deleted while slid falls back to the list through `columnOf`.

**4. `ValueSeat.tsx`:**

```ts
// SeatHost
/** Present where a surface adds metadata from a list: what the list holds for a row, how a held value shows, and, with `inPlace`, that a typed value edits where the surface shows it. */
add?: {
  columns: (row: ViewRow) => ItemColumns
  show: (column: ResolvedColumn) => void
  inPlace?: true
}

type SeatOpen = PaneOpen | { mode: 'add'; rowId: string; group?: keyof ItemColumns; slid?: string }

// :88-90
if (!open) return
if (!anchor.current?.isConnected || (open.mode !== 'add' && !host.columnOf(open.columnId))) close()

const sweep = (row, column, rowIds, cell) => { run(row, column, { kind: 'picker' }, cell, null, { swept: rowIds }) }

const openAway = (row, column, el) => {
  const intent = intentOf(row, column)
  if (intent?.kind !== 'edit') run(row, column, intent, el)
  else if (!live.current.add?.inPlace) run(row, column, { kind: 'popover' }, el)
  else {
    flushSync(() => live.current.add?.show(column))
    run(row, column, intent, el && host.anchor(el, column))
  }
}

const openAdd = (row, el, group?) => {
  const item = host.add?.columns(row)
  if (!item || (group ? item[group] : [...item.contexts, ...item.properties]).length === 0) return
  anchor.current = el
  setOpen({ mode: 'add', rowId: row.id, group })
}
const slide = (columnId?) => setOpen((at) => (at?.mode === 'add' ? { ...at, slid: columnId } : at))

const commitPicks = (rows, column, commits) =>
  groupUndo(() => {
    for (const { index, next } of commits) live.current.commit(rows[index], column, next)
  })
```

`run`'s last parameter becomes `at?: Pick<PaneOpen, 'x' | 'swept'>`, which `float` spreads into the open: `click` passes `{ x }` and `sweep` passes `{ swept: rowIds }`, and `run`'s doc comment is rewritten in place. `target` takes `rows`, and its options arm sets `currents: rows.map(…)`; `contextOptionsFor(column, tree, rows[0].id)` is unchanged, since a table's rows are pages and exclude nothing (`spaceRowOf` reaches no table). `ValueSeat` loses `chooser` and draws:

```tsx
const pickRows = picked ? (picked.swept ?? [picked.rowId]).flatMap((id) => host.rowOf(id) ?? []) : []
<PropertyPicker … target={open?.mode === 'picker' && pickRows.length > 0 && pickColumn
    ? seat.target(pickRows, pickColumn) : null}
  onCommit={(commits) => { if (pickColumn) seat.commitPicks(pickRows, pickColumn, commits) }}
  onDismiss={seat.close} />
{host.add && <MetadataPicker seat={seat} />}
{typed && typedRow && seat.input(typedRow, typed, true)}
```

`MenuSeat`'s effect (`:342-350`) becomes `seat.openAway(row, pending.column, pending.trigger)`, then `if (pending.column.type === 'file') dismiss()`. The return adds `sweep, openAway, openAdd, slide, commitPicks` and drops `intentOf, run`.

**5. `CardsView.tsx`:** the seat takes the list and the reveal, `CardApi.openAdd` is `seat.openAdd`, and `PageCard` calls `api.openAdd(row, textRef.current)` (`:914-915`), the gate now in `openAdd`. `<ValueSeat seat={seat} />`.

```ts
add: {
  columns: (row) =>
    cardAddColumns(itemColumns(tree, ctx.schema, row.id), row, shownColumnsFor(row, columns, isCompact(view))),
  show: (column) => revealProperty(column.id),
},
```

**6. `PropertyPanel.tsx`:** the seat's `group` and the panel's groups are both `keyof ItemColumns`, so nothing maps between them, and `GroupKey` leaves. Under Scout 2's Step 4, `unshown` is its `fields[key].filter((c) => !isShown(c))`, and `glyphOf` and the line zone's `label` read `seat.host.columnOf`, so the panel keeps no column lookup of its own.

```tsx
add: {
  columns: () => ({ contexts: unshown('contexts'), properties: unshown('properties') }),
  show: (column) => reveal(column.id),
  inPlace: true,
},

const adding = seat.open?.mode === 'add' ? seat.open : null
const addKey = adding?.group ?? null
const addFromRow = addKey !== null && seat.anchor.current !== addRefs.current[addKey]
const openAdd = (key: keyof ItemColumns, anchor?: HTMLElement): void => {
  if (row) seat.openAdd(row, anchor ?? addRefs.current[key], key)
}

{(addable || opened) && <AccessoryButton …

{(standing || ghost || addHeld) && (
  <Reveal open={standing || rowOpened || (ghost !== null && !ghost.closing)}
    enterOnMount={!standing} onCollapsed={ghostApi.closed}>
    {addRow((anchor) => { ghostApi.take(); openAdd(key, anchor) }, hover)}
  </Reveal>
)}
```

`addFromRow` compares anchors in place of a `fromRow` field, so no Add state stays in the panel.

**7. `TableView.tsx`:** `onClose: () => cellSweep.clear()` on the seat, and `onSettle` ends in `seat.sweep(row, columns[at], rowIds, cell)`. `activeCell` narrows (`open?.mode === 'picker' ? {…} : popoverTarget`), since `seat.open` is now a union.

**8. `MenuRows.tsx`, `property-picker.css.ts`:** `className` and `chooserTop` leave.

**9. `pickModel.ts:8-15`:** `.filter((g) => g.options.length > 0)` moves over both arms, so a Context with no Spaces draws `emptyPane` on every route (Scout 2's finding).

**In-Flight Calls, Disclosed:**

- Cancelling a File dialog from the panel's Add leaves no row, since only typed values reveal first. Today it leaves one. C-2 doesn't name File; this follows its reason.
- A cancelled Text, Number, or Link row stays blank, as it does today and as C-2 reads.
- A Select pick in the slide still closes everything, and Escape closes rather than steps back. Both are today's behavior, which Decisions doesn't change.
- `add.show` is required on `add`. The panel's list never yields a `'show'` outcome, since it lists only what isn't held, and the panel still reaches `add.show` through `openAway`'s typed path.

---

#### 6. Goes False

**Docs (G-2):**

- `Features/PropertiesPM.md:115`: "can open on a chooser pane" goes, and the doc takes the seat and the **Add** list, as Scout 6 §6 states.
- `Features/PropertiesPM.md:117`: "opens that group's chooser"; "A row shows once it holds a value or was added in the session" should read "A row shows once its file names it or it was added in the session".
- `Features/ViewTypesPM.md:122`: "two-stage add-picker" and its list's description change, as Scout 6 §6 states; "reveals a property on its first committed value" holds.
- `Features/ViewTypesPM.md:91`: cites `Core/Properties/Pickers/valueClick.ts`, which stays true under the recommended placement; "the shared dropdown" stays true.
- `.claude/scripts/Text Property Drive/live-drive.mjs:256,679-688` and `reveal-parity/run.mjs:545`: the word "chooser" in labels. The Text Drive's card flow still holds; its group 4 is the built-app pin for typed hand-offs.

**Comments:**

- `CardsView.tsx:193` ("the Add chooser").
- `ValueSeat.tsx:259` (the floating panes); `:251` leaves.
- `valueClick.ts:1` ("a Date opens the calendar").

**Tests:**

- `PropertyPicker.pane.test.tsx:151-248` leave, with `rowButton`, `buttons`, and the `Host` props; `:32,125,332,346` take `currents`; "Enter on a focused row" asserts `PickCommit[]`.
- `valueClick.test.ts:24`: the Date joins the `picker` list.
- `cardColumns.test.ts`: the `orderAddableEntries` block and the stamp case leave with the builder; `shownColumnsFor` and `fillsBlank` stay.
- `cardGestures.test.tsx:275` becomes "slides into its calendar under ‹ Properties, in the same pane"; `:236`'s title drops "chooser".
- `cellGestures.test.tsx:564-593` is deleted, as a duplicate of `PropertyPicker.pane.test.tsx:322`, and `:595-628` takes `currents`, asserts `PickCommit[]`, and moves beside the picker.
- `ValueSeat.test.tsx:155,159` read through `toMatchObject`, since `x` isn't on the `add` arm.

**New Pins (All Pass in the Patch):**

- `PropertyPanel.test.tsx`, *the Add list*: a Select slides and cancelling leaves no row; a first pick from a group's last entry keeps its `+` and pane; a pick from a standing row keeps that row's element and pane. The patch's typed case isn't added; Scout 6's Pin 1 gains "the list gone", asserted after a 400ms settle inside `act`, since the list's Bloom-out holds its rows for 250ms.
- `cardGestures.test.tsx`: a second date reads none of the first's pick. Removing `key={column.id}` fails it.
- `ValueSeat.test.tsx`, *a sweep*: it opens at the settled cell; a pick lands on every row and one `undoValue` reverts them all.
- `PropertyPicker.pane.test.tsx`: a calendar ignores the click's x.

**Driven Live, for the Plan's Drive Extensions:**

| Flow | Result |
|---|---|
| Card list | Chevrons only on slide rows, 12px icons, capped at 240 with the list scrolling |
| Card: Stage, Due | One pane, 18px bar, calendar 331px uncapped, Back returns with Due gone from the list |
| Card: Note, Rank, Site | One pane each: TextPane, number field, one-line editor |
| Card: Done | No pane, box checked |
| Panel: Tags from a standing row | Row appears on the first pick, pane stays, second pick lands |
| Panel: Stage, Due, cancelled | No row |
| Panel: Rank, Note, Site | Focused in the row, value lands on Enter, list gone |
| Panel: Add Context, Areas | Bar reads ‹ Spaces · Areas (B-4) |
| Table sweep | See *§The Sweep* |

---

#### 7. Risks and Order

**Order:** this work is the plan's Phase 4, after the drives and pins, the kit's imports, the pane shell, and the small folds.

1. G-1's pins land first, against today's code.
2. *§The Proposed Change*'s items 1 to 9 land as one commit with Scout 2's Steps 2 to 4: `ValuePane`'s commit shape, the seat's union, and the hosts only typecheck as a set.
3. The seat's move is the plan's last code step, so files move once. `Placement` goes to Nathan first.

E-1's fix lands in the pane shell, before this work, since a slid calendar on a low card still ran to 988 in a 924px window in my drive, as the Live Check found.

**Risks:**

- **Row-Anchored Hop:** in the panel, a first pick from a standing Add row pushes that row down, and the pane followed it 31px on the next size change. The `+` route doesn't move. It reads as following its anchor; I'd leave it, but it should be looked at.
- **Seat Size:** `ValueSeat.tsx` reaches 392 lines, answering Fresh-Eyes #13 partly. Everything added is a verb the hosts lost, and `MenuSeat` stays in the seat's file.
- **`seat.open` Narrowing:** any later reader of `open.columnId` must narrow past `add`, which the compiler enforces.
- **`groupUndo` Around Single Values:** a calendar's late flush runs through it too. `group` is a module variable set only across the synchronous loop, and `assignValue` pushes synchronously (`assignValue.ts:115`), so it holds.
- **Comments:** this work adds two (`SeatHost.add`, `itemColumns`) and removes two (`SeatChooser`, the emptied banner at `CardsView.tsx:215`), rewriting `ValueSeat`'s doc, `run`'s doc, `valueClick.ts`'s head, and `CardsView.tsx:193` in place, so its net is zero. `MetadataPicker`, `openAway`, `sweep`, `openAdd`, `commitPicks`, `swept`, and `ValuePane` carry none, since their names and bodies state them, and `MenuSeat`'s existing comment keeps stating the open-away rule. The patch still carries the first two as doc comments, which leave when it lands.
- **`CardsView.tsx:193`:** the word "chooser" goes false with this work, so the line becomes "A value from a card's Add shows its property; a right-click pick runs through `MenuSeat` and leaves the view alone."
- **Drive Mode:** the plan's drives should run the built app for one-line Text until *§A Defect at HEAD's Route* is settled. The drive harness already builds.

**Questions for Nathan, With My Read:**

1. **Back Bar:** the fix makes the bar the same height as every other one, and the right-hand label stays where it is, flush with the row, 4.5px from the pane's edge. Over a calendar that's still closer to the edge than in Settings, because menus have tighter padding than settings panes. *My read:* this is correct, and moving the label would knock Settings out of line. Does the crop look right to you?
2. **Multi-Row Picks:** B-7 asked to fold the file. I'm proposing the bigger version: a drag across cells opens through the same seat as a click, so the table stops running its own copy. It behaves the same except that it stays open if some swept rows disappear. *My read:* yes.
3. **Seat Placement:** the code that turns a click into a picker moves from `Core/Properties/Cells/` to `Core/Properties/Pickers/`, beside what it opens. *My read:* yes.
4. **Cancelling a File Pick in the Panel:** today that leaves an empty row; this removes it. *My read:* yes, it's the same reasoning as C-2.
