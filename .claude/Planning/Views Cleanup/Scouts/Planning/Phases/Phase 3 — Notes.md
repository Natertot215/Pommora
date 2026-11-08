### Phase 3 — Notes

**Commit:** `a550be7ca`, `055cb264f`, `693a64972`, `072c850c2` on `vc-chain`, parent `3927af9ae` (Phases 1 and 2).
**Patch:** `Phase 3a — One Pane Route.patch` · `Phase 3b — The Settings Root and the Toolbar's View Button.patch` · `Phase 3c — The Rows and Their Words.patch` · `Phase 3d — The Filter's Lists.patch`
**Delivers:** Investigation 1.1 (form B under F-1), 1.4, 1.6, 1.7, 1.8, 1.10, 1.11, 1.12, 1.13; decisions E-4, E-5, F-1, F-2, F-4, F-6, F-7, F-9, G-4.
**Measures:** Actionable from `cae07c129` −179 (+1,507 / −1,686), this phase's own −95 (+656 / −751); comments 3,515 (3,514 at Phase 2, +1 for E-4's reason); 9,261 passed, 2 skipped, 544 files; typecheck and lint clean at every task's head.

#### Task 3-1 — One Pane Route

**In Plain Terms:** The toolbar's Settings and the views dropdown's per-view editor used to reach the same settings panes through two different routes and three switchboards. Now one table lists the panes and one switchboard opens them for both. The editor still looks as it did: each kind's record now says what its Layout row opens, the property list with the switches for a Table view, the switches alone for a Cards view.

**What Leaves:** `ViewLeaf.tsx` (renamed `ViewPane.tsx`), `LayoutFrame`'s `door`, `leafFor`, `toView`, `ViewSwitches`, `separated`, `VIEW_ROWS`, `ViewRow`/`ViewRowId`, the `kind !== TABLE_KIND` branch, `SettingsFrame`'s `detailFor` switch and its `FrameId`, the duplicate chevron-row builder, and the `useSaveView` re-binding in Group, Sort, Visibility, and Layout.

**What Arrives:** `ViewPane.tsx` holding `ViewPaneId`, `SettingsPane` (G-4's name for the descriptor), `VIEW_PANES`, `chevronRows`, `PaneProps`/`SavePane`, and the `ViewPane` dispatcher, which takes `current` and `switches` for what the two doors differ by on Visibility. `LayoutFrame.tsx` exports `typeGrid`, `kindSwitches`, and `kindRows`, which `LayoutFrame` and `ViewEditor` (new, in `ViewFrame.tsx`) share. `ViewKindRecord.layout.leaf` (`'visibility' | 'switches'`), Table declaring the first and Cards the second, which `ViewEditor` reads for its Layout row. `SettingsFrame.test.tsx` (new test file).

**Pins:**
- `ViewFrame.test.tsx` · the Layout-row cases, Table asserting the Visibility list present and Cards absent: each red when `ViewEditor`'s routing ignores the record's `layout.leaf` (every kind to the Visibility pane reddens Cards; every kind to the switches reddens Table).
- `SettingsFrame.test.tsx` · "Visibility is the list alone": red with `ViewPane`'s `switches` defaulting to `true`.
- `SettingsFrame.test.tsx` · "Layout is the type grid and the kind's switches, without the list": red with `kindSwitches` removed from `LayoutFrame`.
- `SettingsFrame.test.tsx` · "lists Properties and every view pane": red with Visibility filtered out of `ENTRIES`.

**Key Hunks:**
```tsx
export const VIEW_PANES: SettingsPane[] = [
  { id: 'visibility', label: 'Visibility', icon: 'eye' },
  { id: 'layout', label: 'Layout', icon: 'layout-dashboard' },
  ...
```
```tsx
  const detail =
    pane === 'layout' && presentedKind(view.type).layout.leaf === 'switches' ? (
      <MenuScrollFrame header={<MenuTopRow {...toViews} current="Layout" />} …>
        {kindSwitches(view, save)}
      </MenuScrollFrame>
    ) : (
      pane && <ViewPane {...(pane === 'layout' ? { id: 'visibility', current: 'Layout', switches: true } : { id: pane })} … />
    )
```
```tsx
const ENTRIES: SettingsPane<PaneId>[] = [
  { id: 'properties', label: 'Properties', icon: 'server' },
  ...VIEW_PANES,
]
```

#### Task 3-2 — The Settings Root and the Toolbar's View Button

**In Plain Terms:** The Settings pane built its main screen twice, once for a tile and once for the main window, and the two differed only in the bottom bar; now it builds one. The toolbar's view button now shows a rename or icon change the moment it's made rather than after the save lands. The button's code moved beside the other toolbar buttons, and the view-row menus live in one file.

**What Leaves:** `plainRoot`, `scopedRoot`, `selectionNode`; `Views/Settings/ViewMenu.tsx` (moved); `Actions/viewRowMenu.ts` and its test (merged); the two hand-rolled show/hide ternaries; `chevronButton` and the `archive*` styles from `toolbar-menu.css.ts`.

**What Arrives:** `Interface/Toolbar/ViewMenu.tsx` reading `useActiveView`; `Views/Settings/view-frame.css.ts` (no header line, matching Phase 1's new files); `titleLabel(shown, noun = 'Title')` in `toggleLabels.ts`; `viewRowMenuItems`/`viewItemMenuItems` in `viewMenus.ts`.

**Pins:** None named.

**Key Hunks:**
```tsx
  const node =
    scope?.source ?? (tree && isContainer(selection) ? findContainerById(tree, selection.id) : null)
```
```tsx
-  const view = pickView(node)
+  const view = useActiveView(node)
```

#### Task 3-3 — The Rows and Their Words

**In Plain Terms:** Switch rows were hand-built in several places; now the kit has one `switchRow` beside its picker row. Both page-icon switches read "Title Icons" with the same glyph, on meaning shown. Grouping's Order rows use Sort's glyphs, Cards' pickers open like every other picker, and the views list's disabled More button matches Settings'. The three ways a pane drew its hide eye became one.

**What Leaves:** `switchRows.tsx`, `paneRows.tsx`, `group-frame.css.ts`, `rowEye`, the `'_none'`/`'none'` sentinels and the hand-spelled Location options, `PickerRowLook.solid` (its one user was Cards), the three hand-built switch trailings in `typeRows.tsx` and the one in `MatrixMenu.tsx`, and `typeRows`' `item` reveal parameter.

**What Arrives:** `switchRow` in `MenuIndex.tsx`, with `pickerRow` and `switchRow` over one private `lookRow`; `NONE_OPTION` in `paneTargets.ts`; `SUB_LOOK`, `orderOptions`, `HideControls`, `hideEye`, and `HideableRow` in `OptionOrderList.tsx`; `subChip` in `option-order.css.ts`; E-4's reason at the Set row in `GroupFrame.tsx`.

**Pins:** None named.

**Key Hunks:**
```tsx
+export const switchRow = (
+  glyph: string | undefined,
+  label: string,
+  checked: boolean,
+  onToggle: (next: boolean) => void,
+  look?: PickerRowLook,
+): MenuRow =>
+  lookRow(
+    glyph,
+    label,
+    { kind: 'switch', checked, onChange: onToggle, ariaLabel: look?.ariaLabel ?? label },
+    look,
+  )
```
```tsx
        // Many folders can show at once, and a full-strength eye on each would crowd the list.
        trailing={hideEye(s.title, s.id, { isHidden, onToggleHidden }, true)}
```
```ts
      { icon: 'file-text', label: 'Title Icons', key: 'hide_page_icons', invert: true },
```

#### Task 3-4 — The Filter's Lists

**In Plain Terms:** In the Filter pane, the property list and the condition list now open the same way Sort's and Group's lists do, so they become system menus when Native Menus is on. The checkbox conditions now read "Checked" and "Unchecked" with a plain checkbox glyph. The value pickers still open inside the app.

**What Leaves:** the hand-built `PickerMenu` + `MenuItem` lists (`targetOptions`, the operator list), `CheckboxGlyph` in the Filter, `RuleField`'s `iconColor` (no caller passed it) and `lead`, "Is Checked" and "Isn't Checked".

**What Arrives:** `RuleField` takes either a `pane` (the date picker) or `choices` it pops through `popMenu`; `OperatorChoice.icon`, set on the two Checkbox operators. The tests mount the in-app presenter (`MenuDoorHost`) or stub `presentMenu`; MATRIX MP-E-3's tile filter row names `MenuPresenter`'s shield.

**Pins:** None named.

**Key Hunks:**
```tsx
    const rows = choices.map((c) => ({ ...c, action: c.value, checked: c.value === current }))
    void popMenu(rows, trigger, { compact: true }).then((v) => v !== null && onPick(v))
```
```ts
  { op: FILTER_OPS.is, label: 'Checked', icon: 'square-check', slot: 'none', impliedValue: 'true' },
  { op: FILTER_OPS.is, label: 'Unchecked', icon: 'square', slot: 'none', impliedValue: 'false' },
```
