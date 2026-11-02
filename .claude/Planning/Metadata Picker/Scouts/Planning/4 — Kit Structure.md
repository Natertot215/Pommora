### Scout 4 — Kit Structure

**Scope:** E-2, E-3, E-5, E-6's kit-side folds, Open Item 5. **Baseline:** `8824cce29`. Repo untouched.

**Verification:** every hunk below was applied together in a throwaway copy of the tree. Typecheck (UIX, Core, Core src, Desktop web and node), Biome, and `npm run build` all passed; the full suite passed at 548 files before the last task's small hunks, and after them the only failures were load timeouts in `citationBreakage.test.tsx` and `embedAbsorb.test.tsx`, which pass alone (49/49). A scratch copy of The Studio's dashboard typechecked clean against that tree with the K-1 and K-2 re-points, and failed on exactly the files §1.2 lists without them. Real Electron 42 probes back §1.4. "Verified" below means those runs.

---

#### 1. Contradictions

##### 1.1 E-2's Third Path Is What Makes "One Way" True

E-2's two moves clear the two direct Menus → Pickers imports (`ManageRow.tsx:3`, `MenuIndex.tsx:7`). A third path, which E-2 also takes out, is `UIX/Menus/MenuIndex.tsx:5` → `UIX/Controls/ColorSwatch.tsx:2` → `UIX/Pickers/ColorPicker.tsx`. The Fresh-Eyes "Confirmed True" (line 33) checked direct imports only.

A graph of every non-test UIX import confirms it: after the moves alone, `MENUS ~> PICKERS` still lists that one path; after §5 Task K-3 it's empty. K-3 cuts it at `ColorSwatch`, which reports its press to the one color request rather than mounting a `ColorPicker`, so its two production users (`typeRows.tsx:82`, `SettingsWindow.tsx:207`) call `chooseColor` and `Trailing`'s `color` keeps its kind. The six `kind: 'color'` entries in `Core/Settings/frames.ts` are that file's own row kind and stay.

"One way" is true of this pair only. `Controls, Fields, Menus, Elements, Buttons` remain one folder-level cycle through `Menus/frames.css.ts:13` → Elements and `Elements/eye-toggle.css.ts:3` → Menus, while Pickers sits outside it once K-3 removes `Controls/ColorSwatch.tsx:2`, the one import into Pickers from another folder. None of that blocks E-2.

##### 1.2 The Studio Dashboard Is Inside Pommora's Gate, in Another Repo

`npm run typecheck` ends in `tsc -p ../../.claude/dashboard` (`package.json`). The dashboard resolves `@pommora/uix` through a symlink and is committed in The Studio's repo, not this one. It imports both things that move or leave:

- `PickerControl`: `src/shell/MenuDoor.tsx:4`, `src/claude-code/layout.tsx:2`.
- The `Menus` barrel, six files: `shell/MenuDoor.tsx:2`, `shell/CornerMenu.tsx:3`, `claude-code/Benchmarks.tsx:2-8`, `line-count/LineCountView.tsx:3`, `showcase/MenuLeaf.tsx:2`, `showcase/ComponentsLeaf.tsx:7`.

The plan pairs a Studio commit with each of K-1's and K-2's Pommora commits, as E-2 approves; without them the gate fails on those seven files, and with the re-points it passes (Verified). Scout C's "`MenuDoor` has zero production importers, un-export it" (C8, C15) is false: `shell/MenuDoor.tsx:4` imports the type.

##### 1.3 Neither of I-027's Written Solutions Delivers E-3

- **Option B** (one pane per request) contradicts E-3 outright: the second list would open.
- **Option A** (`suppressReleaseClick` on every outside dismissal), which M-25 calls the smaller fix, stops only `click`. `Slider` scrubs from `onPointerDown` with `activation: 0` (`UIX/Controls/Slider.tsx:62`), and a `LineRow` begins on `onPointerDown` (`UIX/Interactions/engine.tsx:1358`), so a press on either would still act while the list closes. It also goes app-wide unless keyed, which E-3 ruled out, and it flips `dismissalStack.test.tsx:205`.

The toolbar's behavior comes from a shield taking the press, so E-3 is best met the same way (§4.2).

##### 1.4 A Shield on the Clock List Would Break Double-Click-to-Type

Hour and minute parts open a list on click and type on double-click (`CalendarPicker.tsx:488-498`). A shield up after the first click takes the second press. **Probe (Electron 42, real input events):** with no shield, the second press gives `click` and `dblclick` on the button; with a shield removed before the release, it gives neither. jsdom can't see this, since `CalendarPicker.test.tsx:117` dispatches `dblclick` directly. So the clock list can't take the shield, and it should drop the release instead (Task K-6). A second probe confirms that works: under `suppressReleaseClick` the second `click` never reaches the button's handler and `dblclick` still fires.

##### 1.5 Worth Reconsidering: E-3's Limit (Asked in §8)

Limiting the fix to dropdown lists costs one prop and leaves I-027's stated complaint standing for every other nested pane: in a tile's settings a press beside an open color picker closes it and lands, while in the toolbar's settings the same press only closes it. Letting every shielded pane draw its own shield would settle that with one rule and remove the base-only logic. This plan stays with E-3 as ratified; the alternative is §4.2 Option 3.

##### 1.6 Leads That Didn't Hold

- **M-24's guard key:** keying on `enter={false}` or `onExited` would newly warn whenever an editor unmounts with a caret pane open. The better key is `onDismiss` (§4.4).
- **Scout C's `anchor?: { x; y?; h? }`:** one prop with two meanings, which is the defect itself (§4.5).
- **M-21 / C7 `pickFrom`:** E-5 retires it; `DROPDOWN_MAX_HEIGHT`, `Anchor`, and the two `PickerMenu`s stay.
- **Fresh-Eyes 14 (the calendar centering on the pointer):** answered by `centerX` reaching only option panes.
- **`PommoraUIX.md:293`:** "behind one barrel" is false today; `UIX/Glass/` has no index.

---

#### 2. What's True

##### Imports

- **Pickers → Menus today:** `PickerMenu.tsx:21`, `picker-base.css.ts:4-5`, `picker-control.css.ts:4`, `CalendarPicker.tsx:12,15,16`, `icon-picker.css.ts:6`.
- **Menus → Pickers today:** `ManageRow.tsx:3`, `MenuIndex.tsx:7`, plus the §1.1 path.
- **`PickerControl`'s own imports:** Fields, Interactions, Utilities, Symbols, and its CSS, so it needs nothing from Pickers. `picker-control.css.ts:4` already reaches into Menus.
- **Alias and path rules:** `UIX/package.json`'s `"./Menus"` entry is the only one that cares. The `"./*"` wildcard serves every moved path; no tsconfig `paths`, Vite alias, or Biome rule names these folders. `check-atlas.mjs` has no SOURCE table on these rows.

##### The Barrel

- `UIX/Menus/index.ts` (31 lines) has 51 Core importers (one statement each, 176 names), and nothing inside UIX imports it.
- 49 Core files import Menus by path; 26 do both. Path targets: `menu-row.css` 23, `frames.css` 20, `FrameSlide` 8, `frame-slide.css` 6, `InlineEditHeader` 5, others ≤3.
- `UIX/Pickers`, `Glass`, `Controls`, and the rest have no index. Only `Theme` and `Symbols` do, and neither is a precedent: `Theme/index.ts:1-2` carries side-effect imports (the font, `scroll-fade.css`), and `Symbols/index.tsx` is the implementation itself. The Menus barrel carries neither.

##### I-027's Chain

- `PickerControl.tsx:100-124` opens on `click` through the door, `popMenu`, `presentMenu`, and the one `PickerMenu` at `MenuPresenter.tsx:98`.
- `dismissalStack.ts:122`: only the lowest entry with `shield` draws one. `PickerMenu.tsx:131`: `shield: onDismiss !== undefined && focus !== 'keep'`.
- So a list over a shielded pane draws none and its press lands, while a list over the toolbar's unshielded pane is the lowest and draws one.
- `dismissalStack.ts:68-83` swallows the release only for a press on the list's own trigger.
- A `focus="keep"` pane has no `shield`, which is why that documented behavior sits outside anything keyed on lists.

##### What the Fix Reaches

| Surface | Pane Beneath | Today | Should Become |
|---|---|---|---|
| Every `PickerControl` and `pickerRow`/`steppedRow` in a tile's settings: `ViewFrame`, `LayoutFrame`, `GroupFrame.tsx:201,214`, `SortFrame`, `FilterFrame.tsx:499,508`, `VisibilityFrame`, `PropertyFrame.tsx:303` | `ViewTile.tsx:644` | Lands, list jumps | Only closes |
| `OptionEditPopup.tsx:90` Appearance | The popup over a value pane | Lands, list jumps | Only closes |
| Month and Year, `CalendarPicker.tsx:415` | Value pane | Lands, list jumps | Only closes |
| Hour and Minute, `CalendarPicker.tsx:535` | Value pane | Lands, list jumps | Closes; the release drops (§1.4) |
| `FilterFrame.tsx:105` field list, `:179` chips list | Tile settings | Lands, second opens beside the first's exit | Only closes |
| `ViewItemMenu.tsx:38` | Tile settings | Lands | Inherits it once F-1 moves it to `popMenu` |
| Toolbar panes (`SettingsMenu`, `OutlineMenu`, `MenuDropdown`), `SettingsWindow`, tile menus (`TileHost.tsx:243,301`) | No shielded pane | Already only closes | Unchanged |
| `ColorPicker`, `IconChoice`, `OptionEditPopup` itself, `ManageRow`'s pane, `FieldPicker`, `TextPane`, `PropertyPicker` | Various | Lands | Unchanged (§1.5) |
| `focus="keep"`: `InfoButton.tsx:68`, `caretPane.tsx:86`, `LocationField.tsx:199`; `modal={false}` glances | Various | Lands | Unchanged, pinned by `PickerMenu.test.tsx:230` |

Three side effects come with the shield, all matching the toolbar today and new in tile panes: the pane beneath stops hovering and wheeling while a list is open, a press on a field beneath doesn't focus it, and a right press while a list is open is taken. That last one includes the list's own trigger: the shield's `stopContextBubble` eats the `contextmenu`, and `onPointerDown` returns early on `button !== 0`, so the list doesn't close either. Right-click-to-type on a dropdown needs its list closed first.

##### Anchors

Point anchors: `GlancePane.tsx:418-420`, `MenuPresenter.tsx:102-103`, `caretPane.tsx:81-83`, `CalendarPicker.tsx:420-422,541-543`. Horizontal override, trigger still vertical: `PropertyPicker.tsx:150` only, fed by `ValueSeat.tsx:295`. `PickerMenu.tsx:187-197` reads the pair as a point; `:203` reads `anchorX` alone.

##### The Guard

`PickerMenu.tsx:134-143` captures mount-time `anchorX` in a `[]` effect. **Census across the suite (default reporter):** 200 warnings at baseline, nearly all test teardown. Under the `onDismiss` key, 188: Glance's 17 go, and `cardGestures` +2, `ValueSeat` +1, `PropertyPicker.pane` +1, `PickerMenu` +1 appear. Those are the masked M-2 unmounts, which is the point. `Core` doesn't fail on `console.error`, so all of it is console-only. Panes with no `onDismiss`: `GlancePane.tsx:352,413`, `caretPane.tsx:78`.

##### Intents, Chip, Option Key

- `'dateTime'` differs from `'picker'` only in withholding `x` (`ValueSeat.tsx:128-131`); no other code reads the intent member.
- The Space chip is chosen three times: `PropertyPicker.tsx:224-228`, `FilterFrame.tsx:157-175`, `Cell.tsx:101-104`. `chipOf('context')` falls back to `TAG` (`typeDisplay.ts`), and no other caller passes `type="context"`: `groupable` requires a `def` (`group.ts:375`), so `GroupBand.tsx:258` never gets one.
- `SelectOption` has a required `key` a Space lacks, so `PickOption` survives. `pickGroups`' `{ ...o, value: o.id }` already carries `appearance` at runtime while the type omits it, and `OptionChip` reads it.
- The kit's `PickerOption.value` is a separate type and stays.

---

#### 3. Removal Inventory

| What Leaves | Where |
|---|---|
| `UIX/Menus/index.ts` | whole file, −31 |
| `"./Menus"` export entry | `UIX/package.json:5` |
| `ColorSwatch`'s `ColorPicker` mount and import, `onPick`, `greyscale`, `useState`, `useRef`, `chipRef` | `UIX/Controls/ColorSwatch.tsx:1-2,12-13,18-19,22-23,28,45-55` |
| `PickerControl.options.test.ts` (folds in; −1 file) | `UIX/Pickers/` |
| `anchorY`, `anchorHeight` props; `anchorX` splits into `at` and `centerX` (net −1 prop); `PinnedGlance`'s three fields become `at` | `PickerMenu.tsx:85-87,109-111`; `glanceSlice.ts:11-13` |
| `'dateTime'` intent member and arms | `valueClick.ts:13,37-38`; `ValueSeat.tsx:130-131` |
| `NeutralChip` and `colorNameFor` imports and all three chip choices | `PropertyPicker.tsx:18-19,224-228`; `FilterFrame.tsx:14,48,157-175`; `Cell.tsx:6,19,101-104` |
| The `value` re-key | `pickModel.ts:13` |
| `MenuTopRow`'s `className` | `MenuRows.tsx:35,41,51` |
| `chooserTop` and its `topRow` import | `property-picker.css.ts:2,4` |
| `direction="down"` (the default) | `UIX/Pickers/FieldPicker.tsx:40`, `ColorPicker.tsx:25`, `TextPane.tsx:38`, `OptionEditPopup.tsx:55` |
| Comment "Reaches the trigger even when the menu took the left press", false once the list always shields | `PickerControl.tsx:159` |
| Unreachable toggle arms: a press on a list's own trigger is swallowed by the stack, and focus is trapped in the list | `CalendarPicker.tsx:266,493` |
| Duplicate import line | `CalendarPicker.tsx:16` (merges into `:12`) |

---

#### 4. Approaches

##### 4.1 The Third Path (`ColorSwatch`)

1. **Accept it and reword E-2.** No code, but "one way" stays false and the cycle stays.
2. **Move `ColorSwatch` to `UIX/Pickers/`.** A direct Menus → Pickers import, so it's worse.
3. **`Trailing`'s `color` leaves; its two callers use `kind: 'field'`.** It cuts the path, but `ColorSwatch` keeps a `ColorPicker` of its own beside the App-level one, and `color` becomes a `field` child while `switch` and `slider` stay `Trailing` kinds, solely because `ColorSwatch` is the one Control that reaches Pickers.
4. **`ColorSwatch` reports its press to the one color request.** Recommended. Its `onPick` and `greyscale` become `onPress: (chip: HTMLElement) => void`, and its two Core callers call `chooseColor` at the chip, as `PickerControl` already reaches an App-level pane through a door Core sets. `Trailing`'s `color` keeps its kind, and `ColorPicker` ends with one mount, the App-level one.

`ColorSwatch` staying in `UIX/Controls/` means no new placement.

##### 4.2 I-027

1. **`suppressReleaseClick` for shielded closes (issue's Option A).** Two lines, wrong reach, and it leaves the Slider and `LineRow` hole (§1.3). Rejected.
2. **`ownShield` on `PickerMenu`.** Recommended. A list draws its own shield over a pane, exactly what it does over the toolbar's. It's three lines in `PickerMenu`, reuses the shield and `beneathShield`, leaves `dismissalStack.ts` untouched, and keeps tests `:190`, `:205`, `:297` true. Four sites pass it. The clock list is the one reasoned exception.
3. **Every shielded layer draws its shield** (`shields` and the base-only rule leave). Measured: `dismissalStack.ts` +2/−13, `PickerMenu.tsx` +2/−5. Only `PickerMenu.test.tsx:297` and the stack test "hands the shield to the next popup when the base leaves" fail, plus the `shields()` assertions at `dismissalStack.test.tsx:252,314-317` and the `shield: true` at `:119`, which go with the API. Exceeds E-3's limit, and it still needs an opt-out for the clock list. Not taken unless Nathan reopens E-3 (§8).
4. **The stack swallows the press with `stopPropagation` plus a flag.** Works for the clock too, but it's a second way of taking a press beside the shield, about 11 lines. Rejected on One Way.
5. **`suppressReleaseClick` in each list's `onDismiss`.** No prop, no exception, but the §1.3 hole everywhere. Rejected, and used only for the clock, where a shield can't work.

##### 4.3 The Barrel (Open Item 5)

1. **Drop it.** Recommended. One rule: a kit file is imported by its path, with `Theme` and `Symbols` as the two exceptions that are real modules. Net −54 lines, verified, with six dashboard files on top.
2. **Complete it.** Needs `PickerControl`, `FrameSlide`, `InlineEditHeader`, `paneDrop`, `useListEdit`, `menuAnchor`, `frameGrowth`, and 34 CSS names from five files, and eight files' `import * as … from '@pommora/uix/Menus/frames.css'` can't pass through a barrel at all without exporting that whole file. `frames.css` is Core-only styling (M-30), so the kit's front door would advertise it. It grows, and it pulls `MenuIndex` and everything behind it into every importer.
3. **"Components through the barrel, CSS by path."** Leaves the 26 double-importers, so it's two rules under one name.

##### 4.4 The Guard's Key

1. **`enter={false}` or `onExited`** (M-24). Names only the pinned glance; caret panes start warning on editor teardown.
2. **`onDismiss !== undefined`.** Recommended. A pane nothing can dismiss is its host's to remove, and that's exactly the glances and caret panes, with no list to maintain. `GlancePane.test.tsx:597`'s "plain menu" fixture gains `onDismiss`.
3. **Delete the guard.** Decision E-6 keeps it, and it's what catches M-2.

##### 4.5 `anchorX`'s Two Meanings

1. **Leave it.** Zero churn, two meanings. Against Clearer Boundaries once the plan is in this block anyway.
2. **One `anchor?: { x; y?; h? }`.** Same two meanings in one prop.
3. **`at?: { x; y; height? }` for a point, `centerX?: number` for the override.** Recommended. Each name has one meaning, `at` matches `MenuOptions.at`, `MenuPresenter` and `CalendarPicker` pass their objects straight through, and `c` needs no special case. −1 prop net.

---

#### 5. The Proposed Change

Stated as should-be. `git mv` for every move. Line deltas exclude tests, comments, and docs.

##### Task K-1 — The Barrel Leaves

`UIX/Menus/index.ts` should be deleted and `"./Menus": "./Menus/index.ts",` removed from `UIX/package.json:5`. Every `from '@pommora/uix/Menus'` should split by this map, merging into an existing named import of the same module:

| Module (`@pommora/uix/Menus/…`) | Names |
|---|---|
| `MenuRows` | `MenuItem` `MenuSeparator` `MenuDesc` `MenuTopRow` `Menu` `AccessoryButton` `FootingCreate` `RowRemove` `FooterLockButton` `FooterIconButton` `MenuFooting` `FootingItem` `MenuScrollFrame` `menuDropLine` |
| `MenuIndex` | `MenuIndex` `MenuRowView` `steppedRow` `pickerRow` `PickerRowLook` `MenuRow` `MenuSection` `Trailing` |
| `DisclosureRow` | `DisclosureRow` `DropOutline` `useDisclosureSet` |
| `pickRuns` | `pickRuns` `PickRun` |
| `menu-row.css` | `heading` `itemEmphasized` `titleInput` |
| `MenuSurface` | `MenuSurface` |
| `MenuDropdown` | `MenuDropdown` |

A throwaway script applied this to all 51 Core files in one pass (`Scripts/barrel-codemod.mjs` beside this report; the appendix lists each file). Run it over the tree as it stands at execution, then `~/The Studio/.claude/dashboard/src` too. `Scripts/uixgraph.mjs UIX` reprints the import graph for K-3's check.

**Delta:** −54 (+75 / −129).

##### Task K-2 — The Moves

```
git mv UIX/Menus/ManageRow.tsx            UIX/Pickers/ManageRow.tsx
git mv UIX/Menus/manage-row.css.ts        UIX/Pickers/manage-row.css.ts
git mv UIX/Pickers/PickerControl.tsx      UIX/Menus/PickerControl.tsx
git mv UIX/Pickers/picker-control.css.ts  UIX/Menus/picker-control.css.ts
git mv UIX/Pickers/PickerControl.typeable.test.tsx UIX/Menus/PickerControl.test.tsx
```

`PickerControl.options.test.ts`'s one `describe` should fold into `PickerControl.test.tsx` and the file go; that test file already covers lists and steps as well as typing, so its name was too narrow.

```diff
# UIX/Pickers/ManageRow.tsx
-import { PickerMenu } from '../Pickers/PickerMenu'
+import { PickerMenu } from './PickerMenu'
-import { MenuRowView } from './MenuIndex'
-import { trailingCluster, trailingFigure } from './menu-row.css'
+import { MenuRowView } from '../Menus/MenuIndex'
+import { trailingCluster, trailingFigure } from '../Menus/menu-row.css'

# UIX/Menus/picker-control.css.ts:4
-import { footingBar } from '../Menus/menu-row.css'
+import { footingBar } from './menu-row.css'

# UIX/Menus/MenuIndex.tsx:7
-import { steppedPickerProps, PickerControl, type PickerOption } from '../Pickers/PickerControl'
+import { steppedPickerProps, PickerControl, type PickerOption } from './PickerControl'
```

**Re-point `@pommora/uix/Pickers/PickerControl` → `@pommora/uix/Menus/PickerControl` (20 Core files):** `Interface/mount.tsx:5`, `Interface/mount.test.tsx:4,10`, `Matrix/MatrixMenu.tsx:15`, `Matrix/MatrixMenu.test.tsx:5`, `Properties/displayLabels.ts:2`, `Properties/Schema/OptionEditPopup.tsx:5`, `PropertyFrame.tsx:40`, `PropertyFrame.test.tsx:20`, `formatRows.ts:2`, `typeRows.tsx:3`, `Settings/ScalePicker.tsx:1`, `SettingsWindow.tsx:10`, `frames.ts:10`, `Testing/MenuDoorHost.tsx:1`, `Views/paneTargets.ts:4`, `Views/Settings/FilterFrame.tsx:42`, `GroupFrame.tsx:62`, `LayoutFrame.tsx:27`, `SortFrame.tsx:15`, `paneRows.tsx:4`.

`mount.test.tsx:10` is a `vi.mock` string, the one re-point that fails silently if a typed search misses it.

**Re-point `picker-control.css`:** `SettingsWindow.tsx:2`. **Re-point `ManageRow`:** `Pages/AliasesRow.tsx:2`, `Settings/ExcludedDirectoriesRow.tsx:6`, `PreviewRulesRow.tsx:5`.

**Dashboard (Studio commit):** `src/shell/MenuDoor.tsx:4`, `src/claude-code/layout.tsx:2`.

**Delta:** net 0, since every changed line is an import path.

##### Task K-3 — `ColorSwatch` Reports Its Press

```diff
# UIX/Controls/ColorSwatch.tsx
-import { useRef, useState } from 'react'
-import { ColorPicker } from '../Pickers/ColorPicker'
...
-  greyscale = false,
-  onPick,
+  onPress,
...
-  greyscale?: boolean
-  onPick: (color: string | undefined) => void
+  onPress: (chip: HTMLElement) => void
...
-  const [open, setOpen] = useState(false)
-  const chipRef = useRef<HTMLButtonElement>(null)
...
-        ref={chipRef}
-        onClick={() => setOpen((v) => !v)}
+        onClick={(e) => onPress(e.currentTarget)}
...
-      <ColorPicker
-        greyscale={greyscale}
-        open={open}
-        selected={selected}
-        onPick={(next) => {
-          onPick(next)
-          setOpen(false)
-        }}
-        onDismiss={() => setOpen(false)}
-        triggerRef={chipRef}
-      />

# Core/Properties/Schema/typeRows.tsx:82
-  return item('Color', { kind: 'color', label: 'Color', selected: name, css, onPick })
+  return item('Color', { kind: 'color', label: 'Color', selected: name, css, onPress: (chip) => chooseColor(chip, name, onPick, false) })

# Core/Settings/SettingsWindow.tsx:206-213
       row={settingsRow(row, {
         kind: 'color',
         label: row.label,
         selected: name,
         css,
-        greyscale: row.greyscale,
-        onPick: (next) => setPersonalization(row.key, next as never),
+        onPress: (chip) =>
+          chooseColor(chip, name, (next) => setPersonalization(row.key, next as never), row.greyscale ?? false),
       })}
```

Both files import `chooseColor` from `Core/Assets/IdentityChoice`, so K-3 lands with the one icon and color request rather than among the moves. The settings row passes `row.greyscale ?? false`, since the swatch defaulted `greyscale` to false where the picker defaults it to true. `MenuIndex.test.tsx:103-113`'s `color` case and `typeRows.test.ts:117-120` take `onPress`, and `IdentityChoice.test.tsx` gains "a swatch's press opens the color picker at its chip and lands the pick".

##### Task K-4 — One Meaning per Anchor Prop

```diff
# UIX/Pickers/PickerMenu.tsx
-  anchorX,
-  anchorY,
-  anchorHeight = 0,
+  at,
+  centerX,
...
-  anchorX?: number
-  anchorY?: number
-  anchorHeight?: number
+  at?: { x: number; y: number; height?: number }
+  centerX?: number
...
-    const point =
-      anchorX !== undefined && anchorY !== undefined
-        ? { left: anchorX, right: anchorX, top: anchorY, bottom: anchorY + anchorHeight, width: 0, height: anchorHeight }
-        : null
+    const height = at?.height ?? 0
+    const point = at ? { left: at.x, top: at.y, bottom: at.y + height, width: 0, height } : null
...
-      const c = anchorX ?? t.left + t.width / 2
+      const c = centerX ?? t.left + t.width / 2
...
-    anchorX,
-    anchorHeight,
-    bounds,
-    anchorY,
+    at?.x,
+    at?.y,
+    at?.height,
+    centerX,
+    bounds,

# Core/Interface/Menus/MenuPresenter.tsx:102-103
-      anchorX={shown?.at?.x}
-      anchorY={shown?.at?.y}
+      at={shown?.at}

# Core/MarkdownPM/Menus/caretPane.tsx:81-83
+      at={{ x: at.caretX, y: at.caretTop, height: at.caretBottom - at.caretTop }}

# Core/Session/glanceSlice.ts:11-13
-  anchorX: number
-  anchorY: number
-  anchorHeight: number
+  at: { x: number; y: number; height: number }

# Core/Interface/Glance/GlancePane.tsx (pinning, then :418-420)
+      at: { x: a.left + a.width / 2, y: a.top, height: a.height },
+              at={p.at}

# UIX/Pickers/CalendarPicker.tsx:35,38 (h → height), then at both lists
+        at={menu?.at}
+        at={timeMenu?.at}

# Core/Properties/Cells/ValueSeat.tsx:295
-        anchorX={open?.mode === 'picker' ? open.x : undefined}
+        centerX={open?.mode === 'picker' ? open.x : undefined}
```

The dependency array names `at`'s fields rather than the object, since `caretPane` and `GlancePane` build a fresh one each render. A pinned glance's anchor is session state rather than anything persisted, so `PinnedGlance` takes the same `at`. `point` carries no `right`, which nothing reads. `PropertyPicker`'s prop renames with it. K-5 lands in the same commit, since K-4 removes the `anchorX` that the guard reads.

**Tests:** `PickerMenu.test.tsx:561-563` (`at={at ? { ...at, height: 20 } : undefined}`) and `:597`, `usePaneResize.test.tsx:45-46`, `PropertyPicker.pane.test.tsx:39,56,142`. `PinnedGlance` fixtures take `at` at `GlancePane.test.tsx:373-375,420,517,529,552,570`, `glanceSlice.test.ts:13-15`, `devicePrefsSeed.test.tsx:234-236`, and `store.test.tsx:751-753,894-896`.

##### Task K-5 — The Guard

```diff
# UIX/Pickers/PickerMenu.tsx:136-137
-      // Point-anchored menus (a pinned glance) close by design through an instant unmount — no Bloom-out to skip, so the guard would be a false positive.
-      if (import.meta.env.DEV && liveRef.current && anchorX === undefined)
+      // A pane nothing dismisses leaves with its host, as a pinned glance does with its tab, so only a dismissable one has a Bloom-out to lose.
+      if (import.meta.env.DEV && liveRef.current && onDismiss !== undefined)
```

`GlancePane.test.tsx:597`'s control pane should become `<PickerMenu open onDismiss={() => {}}>`, since "a plain menu" no longer means `modal={false}`.

##### Task K-6 — I-027

```diff
# UIX/Pickers/PickerMenu.tsx
+  ownShield = false,
...
+  ownShield?: boolean
...
-          {drawsShield && !closing ? (
+          {(drawsShield || ownShield) && !closing ? (

# Core/Interface/Menus/MenuPresenter.tsx
+      ownShield

# UIX/Pickers/CalendarPicker.tsx (month and year list)
+        ownShield

# UIX/Pickers/CalendarPicker.tsx (hour and minute list)
-        onDismiss={() => setTimeMenu(null)}
+        // A second press on a part is its double-click, which a shield would take, so this list drops the release instead.
+        onDismiss={() => {
+          suppressReleaseClick()
+          setTimeMenu(null)
+        }}

# UIX/Pickers/CalendarPicker.tsx: the arms that can't run
-      setMenu(menu?.kind === kind ? null : { kind, at: anchorOf(e.currentTarget) })
+      setMenu({ kind, at: anchorOf(e.currentTarget) })
-          setTimeMenu(timeMenu?.part === part ? null : { part, at: anchorOf(e.currentTarget) })
+          setTimeMenu({ part, at: anchorOf(e.currentTarget) })

# Core/Views/Settings/FilterFrame.tsx:105,179
-      <PickerMenu open={open} onDismiss={() => setOpen(false)} triggerRef={ref}>
+      <PickerMenu ownShield open={open} onDismiss={() => setOpen(false)} triggerRef={ref}>

# UIX/Menus/PickerControl.tsx:159
-          // Reaches the trigger even when the menu took the left press.
```

`toggleTitleMenu` should become `openTitleMenu`, and `suppressReleaseClick` imports from `../Interactions/shared`. `CalendarPicker.tsx:492`'s `if (e.detail > 1) return` stays: it's reached when a double-click starts with the list already open, since the first press closes it and the second click arrives with nothing to swallow it.

`ownShield` is the one `PickerMenu` opt-in without a doc comment, a choice forced by *§Comments*: the clock list's +1 is paid by `PickerControl.tsx:159`'s −1, and a second comment would have no offset. Its reason sits in `PommoraUIX.md`'s `PickerMenu` row instead.

**New test, verified, in `PickerMenu.test.tsx`:** "a dropdown list shields the pane beneath it, so a press on that pane closes only the list": two shields drawn, `elementsFromPoint` stubbed as `MenuPresenter.test.tsx:86` does, a press on the list's shield closes only the list and the row beneath sees nothing.

**New test in `CalendarPicker.test.tsx`:** a press on a part while the other part's list is open, followed by its release and click, closes the list and opens nothing.

**Drive:** Properties Drive group 19 should carry these, with real input events: a tile's Layout pane with one list open and a press on a second dropdown; Month open and a press on Year; Hour open and a press on Minute; a double-click on Hour landing in its field; a filter's field list and a press on a second; a press on a slider row with a list open; and a `LocationField` press still landing beneath its `focus="keep"` pane.

##### Task K-7 — `'dateTime'` Into `'picker'`

This lands in Scout 1's commit, whose items 1 and 2 carry it.

```diff
# Core/Properties/Pickers/valueClick.ts
-  | { kind: 'dateTime' }
...
     case 'context':
-      return { kind: 'picker' }
     case 'dateTime':
-      return { kind: 'dateTime' }
+      return { kind: 'picker' }

# Core/Properties/Cells/ValueSeat.tsx:130-131
-      case 'dateTime':
-        return float('picker')
```

The seat then holds `x` on a date, and `PropertyPicker` stops it there: `origin={!options ? 'auto' : centerX !== undefined ? 'center' : 'right'}` and `centerX={options ? centerX : undefined}`. `valueClick.test.ts:24` expects `{ kind: 'picker' }`. A new pin beside `PropertyPicker.pane.test.tsx:141`: a date target given `centerX` doesn't centre its pane.

##### Task K-8 — The Space Chip Stated Once

```diff
# Core/Properties/Cells/OptionChip.tsx
+import { NeutralChip } from '@pommora/uix/Labels/recipes'
...
   const label = option?.label ?? ''
+  const color = colorNameFor(option?.color)
+  const removal = onRemove ? { onRemove } : {}
+  if (type === 'context')
+    return (
+      <NeutralChip color={color} title={label} icon={option?.icon} className={className} {...removal} />
+    )
   return (
     <Label
       shape={chipOf(type).shape}
-      color={colorNameFor(option?.color)}
+      color={color}
...
-      {...(onRemove ? { onRemove } : {})}
+      {...removal}

# Core/Properties/Pickers/PropertyPicker.tsx:224-228
-            {contextOptions ? (
-              <NeutralChip color={colorNameFor(o.color)} title={o.label} icon={o.icon} />
-            ) : (
-              <OptionChip type={column.type} look={look} option={o} def={column.def} />
-            )}
+            <OptionChip type={column.type} look={look} option={o} def={column.def} />

# Core/Views/Settings/FilterFrame.tsx:157-175
-            {shown.map((v) => {
-              const o = byValue.get(v)
-              return contextOptions ? ( …NeutralChip… ) : ( …OptionChip… )
-            })}
+            {shown.map((v) => (
+              <OptionChip
+                key={v}
+                type={column.type}
+                option={byId.get(v) ?? { label: v }}
+                onRemove={() => toggle(v)}
+              />
+            ))}

# Core/Properties/Cells/Cell.tsx:101-104
-              <NeutralChip
-                color={colorNameFor(c?.color)}
-                title={c?.title ?? id}
-                icon={c?.icon}
+              <OptionChip
+                type="context"
+                option={{ label: c?.title ?? id, color: c?.color, icon: c?.icon }}
```

`contextOptions` stays a prop in both pickers, since `pickGroups` reads it. `OptionChip` gains 13 lines against about 20 leaving its three callers.

##### Task K-9 — `PickOption.value` Becomes `id`

```diff
# Core/Properties/properties.ts:237
-export type PickOption = { value: string; label: string; color?: string; icon?: string }
+export type PickOption = Omit<SelectOption, 'key'>

# Core/Properties/Pickers/pickModel.ts:13
-          .map((g) => ({ id: g.id, options: groupOptions(g).map((o) => ({ ...o, value: o.id })) }))
+          .map((g) => ({ id: g.id, options: groupOptions(g) }))

# Core/Contexts/contextOptions.ts:26,34
-  return excludeId ? opts.filter((o) => o.value !== excludeId) : opts
+  return excludeId ? opts.filter((o) => o.id !== excludeId) : opts
-      value: id,
+      id,

# Core/Interface/Menus/propertyMenuActions.ts:50-52
-          value: o.value,
+          value: o.id,
-          checked: selected.includes(o.value),
+          checked: selected.includes(o.id),
```

`o.value` becomes `o.id` at `PropertyPicker.tsx:223,249,317,319,320,323,326`, and `FilterFrame.tsx:140`'s `byValue` becomes `byId`. **Tests:** `contextOptions.test.ts:26,27,31,35`, `pickModel.test.ts:37`, `PropertyPicker.pane.test.tsx:347` (a fixture `value:` that passes at runtime but fails typecheck).

##### Task K-10 — `MenuTopRow`'s `className`

This lands in Scout 1's commit, with `chooserTop` leaving with the chooser (B-2).

```diff
# UIX/Menus/MenuRows.tsx
   current,
-  className,
 }: {
...
-  className?: string
...
-        className={cx(s.topRow, className)}
+        className={s.topRow}

# Core/Properties/Pickers/property-picker.css.ts
-import { topRow } from '@pommora/uix/Menus/menu-row.css'
-export const chooserTop = style([topRow, { vars: { '--row-pad-y': '0px' } }])
```

##### Task K-11 — Small Folds

`direction="down"` leaves its four sites. `CalendarPicker.tsx:12,16` become one `import { MenuItem, MenuScrollFrame } from '../Menus/MenuRows'`.

##### Total

**Code Delta (K-1, K-2, K-4 to K-11):** about −83, before dashboard lines and the K-1 merge of `CalendarPicker`'s import: the barrel's −54 (+75 / −129), the moves' net 0, and the K-4 to K-11 hunks' −29 (+98 / −127), so the barrel is what carries it. K-3 counts with the one icon and color request it lands beside.

---

#### 6. Goes False

| Where | What |
|---|---|
| `.claude/Resources/PommoraUIX.md:357` | Drop `ManageRow.tsx` and `manage-row.css.ts`; add `PickerControl.tsx`. |
| `PommoraUIX.md:255` (ColorSwatch row) | "anchoring a ColorPicker" goes; the swatch reports its press. |
| `PommoraUIX.md:364` (Manage row) | Moves to the Pickers table. |
| `PommoraUIX.md:385` (PickerControl row) | Moves to the Menus table, and drops `NumberUnit`, `unitLabel`, and `numberFrom`, which are `UIX/Utilities/numberUnit.ts`'s. |
| `PommoraUIX.md:380` (PickerMenu row) | Rewritten as Scout 6 §6 states, including that a dropdown list passes `ownShield`, so a press beside it inside a pane only closes it. |
| `PommoraUIX.md:293` | "behind one barrel" should go. |
| `.claude/CLAUDE.md:108-109` | Neither line claims totality, so both hold. |
| `.claude/IssuesPM.md:90,994-1006` | I-027 closes: the index row, section, and `[^27]` should go. Its Option B text and its "Your call" go with it. |
| `IssuesPM.md:1116` | "a managed list through `ManageRow`" stays true; no path in the prose. |
| `IssuesPM.md:1120` | Should read "A new name touches the code files that mention it and the Feature, Guideline, and Resource documents, and a new folder keeps imports running one way, from Pickers to Menus." |
| `IssuesPM.md:1346` `[^75]` | `UIX/Menus/ManageRow.tsx:~3,~53-63` → `UIX/Pickers/ManageRow.tsx`. |
| `UIX/Pickers/PickerMenu.tsx:136` | Rewritten in K-5. |
| `UIX/Menus/PickerControl.tsx:159` | Removed in K-6. |
| `Core/Properties/Pickers/valueClick.ts:1` | Rewritten in Scout 1's commit, with the `'dateTime'` merge. |
| `PickerMenu.test.tsx:190,230,297`, `dismissalStack.test.tsx:205` | Stay true under `ownShield`; `:297`'s stack tests would not under §4.2 Option 3. |
| `GlancePane.test.tsx:585` title | Stays true; only its fixture changes. |

---

#### 7. Risks and Order

##### Order

1. **K-1 → K-2, first.** They land right after the drives and pins, each in its own Pommora commit with an adjacent Studio commit. They touch only import lines in what the picker edits, and every later hunk's imports are then final. This departs from A-4's "picker first", and the Investigation states what A-4 should become.
2. **K-4 with K-5 → I-042's extraction → E-1's flip → K-6, in one ordered pass over `PickerMenu.tsx`.** All of them touch that file; I-042's pure function takes `centerX` and the rect, so K-4 goes first. Until Scout 1's commit, `cardGestures` logs two more console errors, which fail nothing.
3. **K-8, K-9, K-11 before Scout 1's commit,** so the option rows are clean when the picker splits.
4. **K-7 and K-10 inside Scout 1's commit.**
5. **K-3 with the one icon and color request,** since its callers call `chooseColor`; until then `MENUS ~> PICKERS` lists that one path, which blocks nothing.

##### What Can Break

- **CSS Order:** vanilla-extract emits CSS in import order. Compared over debug-identifier builds, the fully applied change flips 94 module pairs, and none shares a source file. The one co-used flip from the moves alone (`picker-base` and `menu-surface` in `ViewTile.tsx`) disappears with the barrel drop and has no overlapping properties anyway. Other phases will reorder again, so this should get a final visual pass through the Drives rather than a claim.
- **The Studio Commit:** a Pommora commit without it fails `npm run typecheck`, and the post-commit dashboard sync builds against the moved files. Each Studio commit should sit adjacent to its Pommora commit.
- **A Press Inside the 225ms Exit:** the shield leaves at `closing` (`motion.ts:5`), so a second press faster than the exit still lands and the presenter jumps. Holding the shield through the exit would swallow that press instead, which reads worse, so it stays.
- **A Press on a Day With the Clock List Open:** closes the list and acts, since days run on a pointer gesture (`CalendarPicker.tsx:176-188`). E-3 names dropdowns, so this is the exception's known edge.
- **Shared Tree:** K-1 touches 51 files; commit with `--only` and explicit paths.

---

#### 8. For the Lead

##### Question for Nathan

**Should every pop-up inside a pane behave like the dropdowns?** Today in a tile's settings, clicking elsewhere while a color or icon picker is open closes it and also does what you clicked; in the toolbar's settings the same click only closes it. E-3 fixes this for dropdown lists only, as ratified. Extending it to every pop-up would remove the rule behind the difference (about 14 lines) and make all panes answer one way, at the cost of a second click after any open pop-up in a tile's settings. The clock list stays an exception either way. **My read:** keep E-3 as ratified, dropdown lists only. It's a ratified ruling, and the wider rule would change what a user sees in a tile's settings, a second click after any open pop-up, beyond the correction E-3 names.

##### In-Flight Calls

- **Scope Additions Under Picker Cleanup:** `ColorSwatch`'s press going to the one color request, the `direction="down"` folds, the two unreachable toggle arms, and the duplicate import.
- **Dropdown Lists:** I counted `FilterFrame`'s two lists as dropdown lists, since they sit beside `PickerControl`s in the same row and leaving them out would be the odd one out.
- **Test File:** `PickerControl.test.tsx` is a new name for a moved test, the one placement beyond E-2's list; it's for Nathan's approval under *§Placement*.

##### What Other Scouts Need From the Kit

- **Add List (B-1, C-1, C-3, C-4):** nothing new. Root rows go in `MenuScrollFrame maxHeight={PICKER_MAX_HEIGHT}`, the back bar in its `header`. After K-1 the imports are `@pommora/uix/Menus/MenuRows`, `/FrameSlide`, and `/pickRuns`.
- **The Calendar's Ceiling (Open Item 7):** nothing from the kit. `ValuePane` draws a calendar outside any `MenuScrollFrame`, so it stays uncapped.
- **E-1, I-042:** build on `at` and `centerX` (§7).
- **B-6:** K-5 stops masking the seat's re-key.
- **B-7, B-8:** `PropertyPicker`'s `centerX` is where one placement rule lands.
- **F-1:** `ViewItemMenu` on `popMenu` inherits `ownShield`; it needs no prop. `IconPicker`'s rename is independent, and the guard keys on `PickerMenu`'s own `onDismiss`.
- **F-2:** K-3's two callers call `chooseColor`, so K-3 lands with the one icon and color request.
- **F-3:** the `FieldPicker` rename touches the same component as K-6 (`FilterFrame.tsx:62,105`), on different lines.
- **Everyone:** new kit imports should be by path, and the kit's `PickerOption.value` isn't `PickOption`; only the latter renames.

---

#### Appendix — K-1's Files

Paths relative to `Core/`; each file's new modules under `@pommora/uix/Menus/`.

Bundles/BundleTable.tsx → DisclosureRow
Contexts/SpaceMenu.tsx → MenuRows
Interface/Homepage/HomepageMenu.tsx → MenuRows
Interface/Menus/MenuPresenter.tsx → MenuRows · pickRuns
Interface/RenamableTitle.tsx → menu-row.css
Interface/Sidebar/Disclosure.tsx → DisclosureRow · MenuRows
Interface/Sidebar/sidebarDnd.test.tsx → MenuRows
Interface/Sidebar/sidebarDnd.tsx → MenuRows
Interface/Sidebar/sidebarRows.tsx → DisclosureRow · MenuRows · menu-row.css
Interface/Toolbar/OutlineMenu.tsx → DisclosureRow · MenuDropdown · MenuRows · menu-row.css
Interface/Toolbar/SettingsMenu.tsx → MenuSurface
Interface/Windows/PageReaderWindow.tsx → MenuRows
MarkdownPM/Autocomplete/AliasList.tsx → MenuRows
MarkdownPM/Autocomplete/AutocompletePane.tsx → DisclosureRow · MenuRows · menu-row.css
MarkdownPM/Menus/BlockMenuPane.tsx → MenuIndex · MenuRows
Matrix/MatrixLabel.tsx → menu-row.css
Matrix/MatrixMenu.tsx → MenuIndex · MenuRows
Navigation/NavList.tsx → MenuRows
Pages/PageMenu.tsx → MenuRows
Properties/Cells/TextCell.tsx → MenuRows
Properties/Pickers/PropertyPicker.tsx → MenuRows · pickRuns
Properties/Pickers/TextPane.tsx → MenuRows
Properties/PropertyPanel.tsx → MenuRows · menu-row.css
Properties/Schema/OptionEditPopup.tsx → MenuRows
Properties/Schema/OptionEditor.tsx → MenuRows · menu-row.css
Properties/Schema/PropertyFrame.tsx → DisclosureRow · MenuIndex · MenuRows
Properties/Schema/formatRows.ts → MenuIndex
Properties/Schema/typeRows.test.ts → MenuIndex
Properties/Schema/typeRows.tsx → MenuIndex
Settings/AssetDirectoryRow.tsx → MenuIndex
Settings/ClearActionRow.tsx → MenuIndex
Settings/NexusRows.tsx → MenuIndex
Settings/SettingsWindow.tsx → MenuIndex · MenuRows
Settings/frames.ts → MenuIndex
Tiles/BoardLock.tsx → MenuRows
Tiles/Surfaces/ViewTile.tsx → MenuRows
Views/Bands/GroupBand.tsx → DisclosureRow
Views/Cards/CardsView.tsx → menu-row.css
Views/Settings/FilterFrame.tsx → MenuRows
Views/Settings/GroupFrame.tsx → DisclosureRow · MenuIndex · MenuRows
Views/Settings/LayoutFrame.tsx → MenuIndex · MenuRows
Views/Settings/LocationField.tsx → DisclosureRow · MenuRows · pickRuns
Views/Settings/OptionOrderList.tsx → MenuRows · menu-row.css
Views/Settings/SettingsFrame.tsx → MenuIndex · MenuRows
Views/Settings/SortFrame.tsx → MenuIndex · MenuRows
Views/Settings/ViewFrame.tsx → MenuRows
Views/Settings/ViewItemMenu.tsx → MenuRows
Views/Settings/ViewMenu.tsx → MenuDropdown
Views/Settings/VisibilityFrame.tsx → MenuIndex · MenuRows
Views/Settings/paneRows.tsx → MenuIndex
Views/Settings/switchRows.tsx → MenuIndex

**Dashboard (`src/`):** `shell/MenuDoor.tsx`, `shell/CornerMenu.tsx`, `line-count/LineCountView.tsx` → MenuRows; `claude-code/Benchmarks.tsx` → DisclosureRow · MenuRows · pickRuns; `showcase/MenuLeaf.tsx` → MenuRows · menu-row.css; `showcase/ComponentsLeaf.tsx` → MenuRows · MenuSurface · pickRuns.
