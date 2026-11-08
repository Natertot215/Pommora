### Wave Two — Fold Ledger

**DATE:** 11-08-2026
**CHAIN:** `vc-chain`, rebuilt from `a0740a60b` to `099c236ee` by one fixup commit per fold and task (two where a fold spans two tasks) and `git rebase --autosquash --exec "npm run -s typecheck" cae07c129`; 27 commits, one per task. Every sha changed, since the first fold lands at Task 1-1. The patches beside this file are re-exported from the new chain under their existing names.
**SOURCES:** `Reviews/Wave Two — Simplification.md` findings 1, 5, 6, 7, 8, 9, and 10 (S), as the orchestrator weighed them.

#### Measures

| Measure | Before the Fold (`a0740a60b`) | After the Fold (`099c236ee`) |
|---|---|---|
| Actionable | -387 (+3324 / -3711) | -370 (+3392 / -3762) |
| Comments | 3,493 | 3,492 |
| Tests | 9,259 passed, 2 skipped, 545 files | 9,259 passed, 2 skipped, 545 files |

The fold's own diff, `a0740a60b..099c236ee`, reads Actionable +17 (+124 / -107), comments -1 (+2 / -3), and tests -1 (+3 / -4). The comment that leaves is `patchSeedValues`' doc.

#### Folds

Line deltas are the fold's own diff at the final head, as `+added / -removed`, production unless named.

| # | Finding | Task (Landed) | Files | Delta | Pin or Test, and Its Red Run |
|---|---|---|---|---|---|
| 1 | S1 | 5-1 (`ef1ecfd9e`) | `Core/Interface/RenamableTitle.tsx` | -1 (+11 / -12) | 5-1's pin (`cellGestures.test.tsx` › "a create opens its name field on the newborn's row, empty, before the reply"): red with `c.beginNaming(req.id, flight)` moved into `flight.then(...)`, restored green; `RenamableTitle.test.tsx` and the sidebar, band, and Matrix suites unchanged and green |
| 2 | S5 | 6-2 (`e94db246b`) | `Core/Views/Bands/bandModel.ts`, `bandRouter.ts`, `bandZone.test.tsx` | +5 (+11 / -6); tests ±0 (+1 / -1) | `bandZone.test.tsx` imports `BandDrop` from the model |
| 3 | S6 | 3-4 (`566e9aadb`) | `UIX/Menus/PickerControl.tsx`, `Core/Views/Settings/FilterFrame.tsx`, `Core/Matrix/MatrixMenu.test.tsx` | +6 (+25 / -19); tests -1 (+2 / -3) | `MatrixMenu.test.tsx`'s Filtering case answers through the file's own `door` (`mockImplementationOnce`), and the `presentMenu` stub and its restore that Task 3-4 added leave |
| 4 | S7 | 2-2 (`5a034721a`) for the renames; 6-2 (`e94db246b`) for the host's `useDateForms()` | `Core/Views/Host/useViewHost.ts`, `Core/Properties/columnStyles.ts`, `Core/Views/Settings/FilterFrame.tsx`, `GroupFrame.tsx`, `Core/Bundles/BundleTable.tsx`, `Core/Properties/Schema/PropertyFrame.tsx`, `Core/Views/Host/useBandHeads.ts` (2-2) → `Core/Views/Bands/useBandSource.ts` (6-2) | +1 (+32 / -31) | None; renames, and the one added line is the host's own `useDateForms()` call |
| 5 | S8 | 5-3 (`e3c5d6bc0`) | `Core/Views/Host/useViewCreation.ts` | -8 (+6 / -14), its one comment included | Creation suites unchanged and green |
| 6 | S9 | 4-1 (`971325c5c`) | `Core/Bundles/BundleTable.tsx` | Comment ±0 (+1 / -1) | None; a doc line |
| 7 | S10 | The writer at 1-1 (`4451fca69`) and 3-1 (`18f2e30ec`); `HeadedBand`'s `open` at 7-1 (`cf5ef0aaf`); `ViewFrame`'s `renaming` at 8-1 (`d137b65ae`) | `Core/Views/views.ts`, `Core/Views/Host/viewKinds.ts`, `Core/Views/Settings/LayoutFrame.tsx`, `ViewPane.tsx`, `ViewFrame.tsx`, `Core/Views/Bands/GroupBand.tsx` | Writer +13 (+28 / -15); `open` ±0 (+9 / -9); `renaming` ±0 (+3 / -3) | 3-1's four pins red by their reverts and restored green; 7-2's pin (`bandZone.test.tsx` › "a band head holds no Tab stop") red with New Page's `tabIndex={-1}` removed, restored green |

Production across the folds: +16 (+126 / -110), Actionable +17 once the removed comment is set aside.

#### Where a Fold Landed or Read Otherwise Than the Brief Named

- **Fold 7 (the writer):** the shared type is `ViewWriter = (patch: ViewPatch) => Promise<Result<{ id: string }>>`, the save's own result. A `void` return would have been the simpler type, but `GroupFrame` hands the bound save to `LocationHierarchy`'s `persist`, which the band router awaits as a `Result`. At 1-1, `LayoutFrame`'s `write` changed from `(patch) => void saveView(view, patch)` to `const write: ViewWriter = (patch) => saveView(view, patch)` so it fits the record; that line leaves at 3-1 as before. `views.ts` takes a type import of `Result`. The rows' parameter keeps its name `write` in the record and `save` in the panes.
- **Fold 7 (the delta):** the writer nets +13, against the review's ±0, from Biome wrapping the two `../views` imports in `LayoutFrame.tsx` and `ViewFrame.tsx` past 100 columns (+6 each) and the `Result` import. Fold 2's +5 is the router's model import wrapping the same way.
- **Fold 3:** `popOptions(options, current, trigger, solid = false): Promise<T | null>` resolves to the picked option's value, or `null` with no door or no pick. `PickerControl` keeps its "a pick of the shown value isn't a change" check, so `RuleField`'s re-pick of the current value still calls its `onPick` as before. `RuleField` now opens through the registered door rather than `popMenu` directly; production registers `popMenu` as the door in `mount.tsx`, so nothing a user sees changes.
- **Fold 4:** `useBandHeads.ts`'s local and return key read `forms` from 2-2; the return drops it at 6-2, where the host calls `useDateForms()` itself. `columnStyles.test.ts`'s `nexus(...)` helper, which builds a `DateForms`, keeps its name; the brief named production files.
- **Fold 5:** the line keeps the file's `(done) => done !== null` spelling of the neighboring `flight.then`; Biome wraps it over six lines.

#### Conflicts Resolved During the Rebase

- **1-1:** the `--exec` typecheck stopped on `LayoutFrame.tsx`'s `void`-returning `write`; amended as above.
- **2-2 (fold 4):** `useBandHeads.ts` (rename detection carried the fixup from `useBandSource.ts`), `useViewHost.ts`, and `GroupFrame.tsx` conflicted on context; resolved to 2-2's code with every `DateForms`-holding `nexus` read as `forms`, including `FilterFrame.tsx`'s `checkboxLook` line, which exists at 2-2 and leaves at 3-4.
- **3-1:** `GroupFrame.tsx` and `LayoutFrame.tsx` met folds 4 and 7; resolved to 3-1's code with `forms`. The 3-1 writer fixup then met 3-1's imports; resolved to 3-1's code with `ViewWriter` in place of `SavePane`.
- **3-3 and 3-4:** `LayoutFrame.tsx`'s `../views` import and `FilterFrame.tsx`'s rule cells; resolved to each task's code with `ViewWriter` and `forms`.
- **5-3:** `useViewHost.ts` context; resolved to 5-3's code with `forms`.
- **6-2:** `useBandSource.ts` and `useViewHost.ts`; resolved to 6-2's code with `forms`, then the 6-2 fixups (fold 2 and fold 4's host call) applied cleanly.
- **7-1:** the `open` fixup met 7-1's chevron, which still carries `aria-label` there; resolved with `aria-label={open ? 'Collapse group' : 'Expand group'}`, which 7-2 removes. **7-2, 8-3:** `GroupBand.tsx` resolved to each task's code reading `open`.
- **8-1:** `ViewFrame.tsx`'s imports met fold 7, then the `renaming` fixup met 8-1's single-line `LineRow`; resolved to 8-1's code with both. **10-1:** the same file, resolved to 10-1's code with `ViewWriter` and `renaming`.

Typecheck ran at every task's head through `--exec`, and lint and the whole suite ran at all 27 heads afterward, every one green with no load-flaky rerun needed. A scan of all 27 heads finds no `SavePane`, `type Choice`, `const collapsed = !bands`, or inner `const editing = renamingId` past its fold's task, and no `DateForms` held as `nexus` from 2-2 on; `patchSeedValues` stands only before 5-3, where `overrideValues` arrives.

#### Pins at the New Head

Each pin in `Pins.md` was reddened by its revert, its test run by name, and the file restored from `HEAD`; all twelve went red and came back green. The 3-1 Layout-leaf revert reddens the Table case beside the Cards one, as at Wave One.

#### Replay

A detached worktree of `cae07c129` in the scratchpad took the 27 re-exported patches in order with `git apply --index`, every one applying (Phase 11's five trailing-whitespace warnings are its documents' own lines); `git diff 099c236ee` and `git diff --cached 099c236ee` both printed nothing. The worktree was removed and pruned. The final tree is also byte-equal to the fixup-stacked head before the rebase (`3bb5f1d5b`), where the full suite, typecheck, and lint ran green.
