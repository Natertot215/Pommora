### Wave One — Fold Ledger

**DATE:** 11-08-2026
**CHAIN:** `vc-chain`, rebuilt from `f8e96f1e2` to `a0740a60b` by one fixup commit per fold (two where a fold spans two tasks) and `git rebase --autosquash cae07c129`; 27 commits, one per task. Tasks 1-1 through 3-1 kept their shas, since no fold reached them. The patches beside this file are re-exported from the new chain under their existing names.
**SOURCES:** `Reviews/Wave One — Simplification.md` (S) and `Reviews/Wave One — Adversarial.md` (A), as the orchestrator weighed them.

#### Measures

| Measure | Before the Fold (`f8e96f1e2`) | After the Fold (`a0740a60b`) |
|---|---|---|
| Actionable | -376 (+3282 / -3658) | -387 (+3324 / -3711) |
| Comments | 3,493 | 3,493 |
| Tests | 9,261 passed, 2 skipped, 546 files | 9,259 passed, 2 skipped, 545 files |

The two fewer tests are `useColumns.test.ts`'s `placeInShown` cases that repeated `columns.test.ts`; the file fewer is `Table/bandCommits.test.tsx`.

#### Folds

Line deltas are the fold's own diff, as `+added / -removed`, split into production, tests, and drive or document lines.

| # | Finding | Task (Landed) | Files | Delta | Pin or Test, and Its Red Run |
|---|---|---|---|---|---|
| 1 | S1, A4 | 4-3 (`a3a421a2b`) and 11-1 (`a0740a60b`) | `Core/Views/Table/table-view.css`, `.claude/Features/ViewTypesPM.md` | Production ±0 (+1 / -1); document ±0 (+1 / -1) | None; a header and a sentence |
| 2 | S2 | 8-1 (`93f79f08e`), its lock gate moving into `renameOf` at 8-2 (`4812cd640`) | `Core/Tiles/Surfaces/ViewTile.tsx` | Production +4 (+38 / -34) | `Core/Tiles` suites, unchanged and green |
| 3 | S3 | 5-1 (`2631dfa33`) | `Core/Views/Host/useViewHost.ts` | Production -10 (+6 / -16) | `cellGestures.test.tsx` · "a create opens its name field on the newborn’s row, empty, before the reply": red with `c.beginNaming(req.id, flight)` moved into `flight.then(...)` in `useViewCreation.ts`, restored green |
| 4 | S4 | 5-3 (`bbbb12ea0`) | `Core/Views/Host/useViewHost.ts`, `Core/Views/Host/useViewInteractions.tsx` | Production -2 (+12 / -14) | Host and band drop suites, unchanged and green |
| 5 | S5 | 3-2 (`b9f0b2241`) | `Core/Actions/toggleLabels.ts`, `identityMenus.ts`, `viewMenus.ts`, `Core/Interface/ContentView.tsx`, `Subfield/CitationsToggle.tsx`, `Windows/NavWindow.tsx`, `Windows/PageWindow.tsx`, `Core/Matrix/MatrixWindow.tsx`, `Core/Tiles/Surfaces/ViewTile.tsx` | Production -10 (+21 / -31) | Menu and window label suites, unchanged and green |
| 6 | S7, A5 | `SwitchEntry` at 3-3 (`be717001d`), `CreateFlight` at 5-2 (`e709bda07`), `SetRef` at 6-2 (`265bead0e`) | `Core/Views/Host/viewKinds.ts`, `Core/Views/Host/useViewCreation.ts`, `Core/Views/Bands/bandModel.ts` | Production ±0 (+3 / -3) | None |
| 7 | S8, A5 | 8-1 (`93f79f08e`), one fixup with fold 10 | `Core/Actions/viewMenus.ts`, `viewMenus.test.ts`, `Core/Views/ViewTileScope.ts`, `Core/Views/Host/liveView.test.tsx` | With fold 10: production +5 (+15 / -10); tests +17 (+45 / -28) | `viewMenus.test.ts`'s row-menu suite now reads the rows `runViewRowAction` hands its `pop` seam; `liveView.test.tsx` types its scope builder by inference |
| 8 | S9 | 6-1 (`37da87e5f`) for `group.ts` and `resolveView.ts`; 7-4 (`41e74f619`) for `ViewPane.tsx` | `Core/Views/Pipeline/group.ts`, `Core/Views/Pipeline/resolveView.ts`, `Core/Views/Settings/ViewPane.tsx` | Production +1 (+8 / -7) | E-2 (`group.test.ts` › `orderSetTree`): red with `let tree = setTree` in `resolveView.ts`, restored green |
| 9 | S10 | 5-3 (`bbbb12ea0`) | `UIX/Utilities/stableApi.ts`, `Core/Views/Host/useViewInteractions.tsx` | Production -2 (+5 / -7) | None |
| 10 | S11 | 8-1 (`93f79f08e`), one fixup with fold 7 | `Core/Actions/viewMenus.ts`, `Core/Tiles/Surfaces/ViewTile.tsx` | Counted with fold 7 | The row-menu suite's Titles case passes `titles` through the run |
| 11 | S12 | 7-1 (`860ae0f7d`) | `UIX/Menus/DisclosureRow.tsx`, `Core/Views/Settings/LocationField.tsx` | Production +1 (+4 / -3) | `LocationField` and `DisclosureRow` suites, unchanged and green |
| 12 | S13 | 5-1 (`2631dfa33`) | `Core/Session/editSlice.ts`, `Core/Interface/RenamableTitle.tsx` | Production +2 (+4 / -2) | `RenamableTitle.test.tsx`, `store.test.tsx`, and the view, navigation, sidebar, and page suites, unchanged and green; no test keys on `submitRename` clearing the fence |
| 13 | S14 | 3-3 (`be717001d`) | `UIX/Menus/frames.css.ts`, `Core/Views/Cards/cardsKind.ts`, `Core/Views/Settings/LayoutFrame.tsx` | Production ±0 (+8 / -8) | None |
| 14 | S15 | 3-4 (`120dd114c`) for `MatrixMenu.test.tsx`; 4-2 (`26abdc7a1`) for the `placeInShown` cases; 6-2 (`265bead0e`) for `bandCommits.test.tsx` | `Core/Matrix/MatrixMenu.test.tsx`, `Core/Views/Table/useColumns.test.ts`, `Core/Views/Pipeline/columns.test.ts`, `Core/Views/Host/useViewHost.test.tsx`, `Core/Views/Table/bandCommits.test.tsx` (deleted) | Tests -63 (+139 / -202) | The two column-width cases run in `useColumns.test.ts`, now under jsdom; the collapse-persist case runs in `useViewHost.test.tsx`'s "the persist fold" through the host's `disclosure.toggle` |
| 15 | A1 | 3-3 (`be717001d`) | `.claude/scripts/Archive Drive/live-drive.mjs`, `MATRIX.md` | Drive ±0 (+2 / -2) | `[g6B G-4]` reads `More actions`; the drive wasn't run here |
| 16 | A2 | 4-1 (`43d6cfa12`) | `.claude/scripts/Archive Drive/MATRIX.md` | Drive ±0 (+5 / -5) | None; rows 72, 78, 79, 175, and 176 name `.table-head`, `.trash-frame .col-header:last-child`, and the first `.col-header` |
| 17 | A3 | 8-3 (`9d0c497a5`) | `Core/Views/Bands/GroupBand.tsx` | Production ±0 (+1 / -1) | None; a tree-wide grep finds no test keying on `data-view-lead`'s value |

Production across the folds: -11 (+42 / -53).

#### Where a Fold Landed Elsewhere Than the Brief Named

- **Fold 6:** `SwitchEntry` landed at 3-3, where `switchRows.tsx`, its last outside importer, is deleted; at 1-1 through 3-2 `LayoutFrame.tsx` and `switchRows.tsx` still import it. `CreateFlight` landed at 5-2, where `standingFlight`, its reader in `useViewInteractions.tsx`, leaves; 5-1's head still imports it.
- **Fold 8:** two fixups, since the `ViewPane.tsx` guard arrives at 7-4 with the Location tree's Set order.
- **Fold 13:** one fixup at 3-3, since the duplicate arrives there, when `switchRow` replaces `switchRows.tsx` and `LayoutFrame` inlines the look. The look is `ROOT_ROW_LOOK` beside `ICON` in `UIX/Menus/frames.css.ts` rather than in `viewKinds.ts`: `viewKinds.ts` imports `CARDS_KIND` as a value, so a value import back from `cardsKind.ts` would close the runtime cycle the placement table built `viewKinds.ts` to avoid.
- **Fold 14:** the `presentMenu` stub in `MatrixMenu.test.tsx` arrives at 3-4, with the Filter's lists, so its restore lands there.
- **Folds 7 and 10:** one fixup, since both rewrite the row-menu suite.

#### Conflicts Resolved During the Rebase

- **3-2 (fold 5):** the fixup's import context carried 8-1's `viewMenus.ts` and `ViewTile.tsx` imports; 3-2's own imports kept, with `shownLabel` in place of the three labels.
- **5-1 (fold 3):** `NO_COLLAPSE` still sits beside `NO_FLIGHTS` at 5-1's head; kept until 7-1 removes it, `NO_FLIGHTS` gone.
- **5-3 (fold 4):** `useViewHost.ts`'s imports at 5-3 lack 7-1's `Disclosure` and `toggled`; only `groupKeyToValue` and `resolveColumn` left.
- **6-1 (fold 8):** `orderSetTree` is `SetTreeNode`-typed at 6-1; the guard went onto that form. **7-4:** 7-4 makes it generic; resolved to the generic form with the guard.
- **6-2 (fold 14):** `bandCommits.test.tsx` modify/delete. The moved cases took 6-2's API, the `.group-band-drop-outline` click and `api.toggleCollapse`. **7-1:** `useViewHost.ts`'s imports and module constants meet folds 3 and 4; the moved collapse case took 7-1's `api.disclosure.toggle`. **7-2:** a second modify/delete on `bandCommits.test.tsx`; 7-2's `.group-band-head [data-chevron]` click went into `useColumns.test.ts`'s moved case.
- **8-1:** the pick met fold 5's labels in `viewMenus.ts` and `ViewTile.tsx`, resolved to 8-1's code with `shownLabel`. Fold 2 took 8-1's names (`persistConfig`, `presence`), and `renameOf`'s `onBegin` carries no lock gate there. Folds 7 and 10 took 8-1's `persistConfig` and `duplicate(v.id)`.
- **8-2:** the pick met `renameOf` and the run's `titles`; resolved to 8-2's `saveView`, `editViews`, and `entering` with `renameOf`, whose `onBegin` takes `locked ? undefined :` here, where Behavior Change 20 lands.

Typecheck ran at every task's head from 7-2 on during the rebase, and at 3-2, 5-1, 5-3, 6-1, 6-2, 7-1, and 8-1 where a conflict stopped it.

#### Pins at the New Head

Each pin in `Pins.md` was reddened by reverting code, its test run by name, and the file restored from `HEAD`; all twelve went red and came back green. The 3-1 Layout-leaf pin's revert sends the editor's Layout leaf to the plain Layout pane (`{ id: 'layout' }`), which reddens the Table case beside the Cards one; at planning it was run against the parent head, where only Cards was red. Phase 10's two `HeadedBand` pins (`GroupBand.test.tsx`'s Date head, `bandZone.test.tsx`'s held bands) went red with `immovable={false}` and came back green.

#### Replay

A detached worktree of `cae07c129` in the scratchpad took the 27 re-exported patches in order with `git apply --index`, every one applying cleanly; `git diff a0740a60b` and `git diff --cached a0740a60b` both printed nothing, so the replay matches the chain byte for byte. The same worktree then checked out each task head from 3-2 to 10-1 and ran typecheck, lint, and the whole suite: all green at every head, with no load-flaky rerun needed. The final head's gates ran in the chain worktree: typecheck and lint clean, 9,259 passed, 2 skipped, 545 files, `engineGraph.test.ts` and `hostGraph.test.ts` 4 of 4, and `git diff --stat cae07c129 -- Core/Sync Sync` empty.
