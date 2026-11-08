#### Phase 9 — Notes

**Commit:** `04e94f523` on `vc-chain`, parent `78238c859` · Task 9-1 `04e94f523`

**Patch:** `Phase 9 — MenuBase.patch`

**Delivers:** G-1 (the rename earns its own phase); Investigation 9.1; I-069

**Measures at the Phase Head:** Actionable from `cae07c129` =🔴-379=(=🟢+3238=/=🔴-3617=); the phase's own, from `78238c859`, ±0 (+249 / −249), tests excluded · Comments 3,493 (3,493 at the parent, 3,517 at BASELINE) · Tests 9,261 passed, 2 skipped · 44 files touched

---

#### Task 9-1 · The Shell Named and Filed as a Shell

**In Plain Terms:** The blank floating pane that every action menu, managed list, and value picker opens inside was called `PickerMenu` and filed with the pickers, though it picks nothing. It's now `MenuBase`, filed in `UIX/Menus/` beside `MenuSurface`, with its placement math, its resize hook, and its own stylesheet beside it. Styles that only one place used moved next to that place, and the Properties editor's styles left the shared frames stylesheet for a Properties one. Nothing on screen changes.

**What Leaves:**
- `UIX/Pickers/PickerMenu.tsx`, `panePlacement.ts`, `usePaneResize.tsx` (and their three tests) from `UIX/Pickers/`; `UIX/Pickers/picker-base.css.ts` whole.
- `PickerMenu`'s dead `style` prop: its parameter, its type line, and its spread into the shell's style.
- From `UIX/Menus/frames.css.ts`: `OPTION`, `assignedFill`, `assignedFillNone`, `allHeading`, `allRow`, `statusGroups`, `statusGroup`, `optionList`, `optionLead`, `compactTitle`, `ghostOptionRow`, `ghostChip`, `optionEditButton`, `configEditor` (with its `globalStyle`), and the five imports only they read; the false header "KNOBS — the ViewFrame tunables".
- `MenuBase.test.tsx`'s `FieldPicker` import and the two tests that exercise `FieldPicker` rather than the shell.

**What Arrives:**
- `UIX/Menus/MenuBase.tsx` (`MenuBase`, `PICKER_PORTAL_ATTR`), `UIX/Menus/panePlacement.ts`, `UIX/Menus/usePaneResize.tsx`, with their tests beside them; the type `PickerDirection` reads `PaneDirection`, beside `PanePos` and `PanePoint`; the DEV warning's tag reads `[MenuBase]`.
- `UIX/Menus/menu-base.css.ts`, no header: the shell half (`layer`, `shield`, `PANE_RADIUS`, `pane`, `surface`, its back-bar `globalStyle`, `resizing`); its doc reads "On a pane's surface" where it read "a picker's".
- `PICKER_MAX_HEIGHT` and `PICKER_WIDTH` in `UIX/Menus/menu-row.css.ts` beside `MENU_MAX_HEIGHT`, the ceiling their doc measures against; their seven Core consumers import them from there.
- `treePane` in `Core/Views/Settings/filter-frame.css.ts`, read by `LocationField` as `fp.treePane`.
- `optionRing` in `UIX/Pickers/calendar-picker.css.ts` as `pillToday`, beside `pill` and `pillSelected`, the one ring it draws.
- `Core/Properties/Schema/schema.css.ts`, no header, as Phase 1's new files took none: the thirteen Properties-only exports and `OPTION`; `GhostOptionChip`, `OptionEditor`, `OptionSlot`, and `PropertyFrame` read it as `s`, and `PropertyFrame` reads `frames.css` as `fr`.
- `frames.css.ts`'s `SIZE` header reads "KNOBS — the header's icon button and a drop slot's highlight."
- `UIX/Pickers/FieldPicker.test.tsx`: the two `FieldPicker` focus tests (the rename field's caret; Escape giving the field's focus up), moved whole from the shell's test so `UIX/Menus` imports nothing from `UIX/Pickers`.
- Every importer and every comment that named `PickerMenu` follows: `GlancePane.tsx`, `TextPane.tsx`, `glanceSlice.ts`, `picker-control.css.ts`, `usePaneResize.tsx`, `vitest.setup.ts`.

**Not Taken:**
- **`bareSurface` + `hostedGutter`:** `bareSurface` has three callers (ViewTile, IconPicker, ManageRow's `!menu`), as it did at `cae07c129`, so the prop stays. `hostedGutter` doesn't repeat the shell's `surface` (4px); it repeats `MenuSurface`'s gutter so a tile's settings pane sits as the toolbar's does, and the shell's `surface` would also bring the back-bar label rule a settings pane opts out of. It stays in `menu-surface.css.ts` beside the gutter it mirrors.
- **`headerPhotoImg`** stays in `frames.css.ts`: its one consumer is `HomepageMenu`, and it's the photo variant of `header` / `iconButton` / `titleField`, which `InlineEditHeader` also reads.
- **`optionRow`** stays in `frames.css.ts` (`OptionOrderList` reads it); `schema.css.ts` composes `ghostOptionRow` from it.

**Pins:** none named.

**Key Hunks:**

```diff
-  contentClassName,
-  style,
-  resize,
+  contentClassName,
+  resize,
 ...
           ...(pos?.origin ? { '--menu-origin': pos.origin } : null),
-          ...style,
           ...(closing ? { pointerEvents: 'none' as const } : null),
```

```diff
-import { PickerMenu } from './PickerMenu'
-import type { PanePoint } from './panePlacement'
-import { optionRing } from './picker-base.css'
+import { MenuBase } from '../Menus/MenuBase'
+import type { PanePoint } from '../Menus/panePlacement'
 ...
-                className={cx(s.pill, k === todayKey && !sel && optionRing, sel && s.pillSelected)}
+                className={cx(s.pill, k === todayKey && !sel && s.pillToday, sel && s.pillSelected)}
```

```diff
 export const MENU_MAX_HEIGHT = 320
+
+/** KNOB — a picker's height ceiling; below MENU_MAX_HEIGHT because a picker hangs off a control rather than filling a pane. */
+export const PICKER_MAX_HEIGHT = 240
```

---

#### For Phase 11 · Documents That Name the Old Shell

Every `.claude` line outside Planning that names `PickerMenu` or what `UIX/Pickers` held (`git grep -n "PickerMenu\|picker-base\|panePlacement\|usePaneResize\|UIX/Pickers\|PICKER_MAX_HEIGHT" -- .claude ':!.claude/Planning'`):

- **Living documents:** `.claude/CLAUDE.md:108-109` (`// Menus` gains the shell; `// Pickers` description); `.claude/Resources/PommoraUIX.md:380` (the `PickerMenu` row), `:211` (`pickerBloom` in the Bloom row, if renamed); `.claude/Guidelines/Development-Environment.md:20`; `.claude/Guidelines/Editor-Internals.md:37, 39`; `.claude/Guidelines/Web-Guests.md:19`; `.claude/Features/MarkdownPM.md:242` (`PICKER_MAX_HEIGHT`, now in `menu-row.css`); `.claude/Features/InteractionPM.md:20` (`pickerBloom`), `:46` ("a picker pane's free edges"); `.claude/Features/InterfacePM.md:89` (the Glance Pane's line); `.claude/Features/SymbolsPM.md:67` (`UIX/Pickers/IconPicker`, still true).
- **Issues:** `.claude/IssuesPM.md:1097, 1101` (I-069's body) and `:1293` (its footnote) leave with I-069; `:1281` (I-057's footnote) cites a `UIX/Pickers/` path that stays true.
- **History (not rewritten):** `.claude/HistoryPM.md:412, 535, 695, 697, 840, 902, 1282, 1346, 1362, 1386, 1394, 1466`; `.claude/Benchmarks/view-band-hide.patch:182, 187`.
