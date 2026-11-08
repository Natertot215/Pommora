### Run Notes

Running record of the overnight planning run's calls, contradictions, and things not run, folded into the Morning Report at the close. Each line is a fact at the time it was written.

#### Calls Taken

- **Phase shape:** eleven phases from the Investigation's nine themes; Phases 9 (MenuBase) and 10 (I-059) last so either drops at ratification without reshaping the chain; a docs-and-issues phase closes. The Investigation's test-harness consolidation (*§10*) is left out: not production, not asked, and churn against "stop adding tests".
- **MenuBase earns its phase:** 9.1 moves the shell's files into `UIX/Menus/`, and a file named Picker filed under Menus would be the odd-one-out, so it's move-plus-rename as one phase or neither; I-069 is Nathan's own open issue, so it's the phase. 26 files, 136 mentions, 8 docs.
- **1.1 takes form B with one visible change:** the editor keeps its root (F-1), the Layout leaf becomes the Visibility pane titled Layout with the kind's switches, and a Cards view gains the Visibility list there, since the `leaf` flag that denied it was a kind-named flag and Cards honor `hidden_properties`.
- **D-1's reading:** the view-name renames in the dropdown and tiles are surface-held already (local `editing` state over `RenamableLabel`), so they don't adopt a component; Task 8-1 consolidates their two copies into one row. `RenamablePageName` grows into `RenamableName` with the entity's `kind`, serving tabs, page windows, the detail header, and views. `submitRename` takes `fromCreate` explicitly.
- **`'detail'` → `'band'`** in `RenameHost`, the Set band's title being its one claimant after Cards leaves the fence.
- **`reassignTarget` moves at Phase 2** with the sort-run reassign, not Phase 5, so it's written once.
- **Trash keeps its own insets** (reversing the draft's call): the Phase 4 builder's CSS reading had `.table-shell`'s content-pane bleed running into the Settings window's resize strip and moving the File Name heading off the checkbox gutter; no decision names either, so the Trash stands as Task 4-1 leaves it. The Trash heading sitting over the gutter where the Archive's sits over the titles is left for the morning as a prospect.
- **The Trash and Archive table's chevron** takes the shared control, outside the Tab order, keeping its place in the row (before the title below the top level, after it at the top).
- **`data-drop-outline` → `data-chevron`** with the component's rename, drives following in the same patch.
- **`RowLead` is built**, absorbing `RowRail` and applying `rowIndent`, since it gives the ghost row its gutter; `rowIndent` itself stays.
- **The Archive Drive runs whole** at Phase 4's checkpoint rather than guessed groups.
- **Live probes:** twins answered from `ContentView.tsx`'s `useHosts` (one host per target key), correcting the Investigation's parked-tab claim; the locked pill from code, since `~/Test` has no view tile.
- **Phase 1 placement:** `Host/viewKinds.ts` holds the record's type, the built table, and `presentedKind`; the single-file form in `ViewHost.tsx` was a runtime cycle with `useViewHost.ts`. Phase 1 landed +9, above its estimate, paying for three files where two tables stood.
- **Phase 2 fold:** `PageValues`/`pageValuesOf` into an engine-safe `pageValues.ts`, since in `loadValues.ts` the window's two blank-row callers imported the host's readers.
- **I-070's arm fires on any later write,** a remote one under sync included: the local refused drop re-places its one row over the incoming order. Followed as the issue's solution reads; disclosed.
- **Scratch commits** carry whichever model's trailer the builder used; the patches are bare diffs and the execution run's commits carry the plan's.

- **Phases 7 and 8 landed net-positive** (+17 and +54 own) where the Investigation estimated -30 to -37 and -55 to -91: `RowLead` with `DataRow`'s split (7-3), and `ViewListRow` plus `runViewRowAction` with their typed props (8-1). Both are the shared pieces the decisions ask for; both go to Wave One's simplification read first.
- **Hide Disclosure Chevrons reaching the Location tree** (C-4, built as written) leaves that tree's nested folders reachable only by search when the setting is on, since a row click there picks a folder and only the chevron opened one. Reversal: drop `navigationTree` from `LocationTree`'s frame in `LocationField.tsx`, one line.
- **The Location tree's Set order** comes through `ViewPane` ordering the folders it passes in with `orderSetTree`, since the Matrix and Preview Rules filters mount the same tree with no view; two appliers of `viewSetOrder` remain, one over the Set index and one over the folder tree.
- **`persistConfig`'s lock check moved into `editViews(op)`** rather than folding away: another window or an external edit can lock a tile while a rename or chooser is open.
- **`data-view-lead` carries `"head"` or `"row"`,** and the band row declares `"head"` (folded at stacking), so a grouped Cards tile reveals from its first band as it does today.

- **`data-picker-portal` and `pickerBloom` keep their names** after the MenuBase rename: the attribute sits in 27 files, nine of them drives, more than the whole phase touched; a follow-up or never, the owner's call.
- **`UIX/Pickers/FieldPicker.test.tsx`** split out of the shell's test file (two tests that tested `FieldPicker`), so Menus imports nothing from Pickers: a placement to approve.

#### Contradictions With the Log

- **F-1 and the Cards Visibility list:** F-1 allows only consolidation that changes nothing visible; Task 3-1 lets a Cards view's editor Layout leaf show the Visibility list it lacked. Cost to reverse: a per-kind flag on the record (≈ 6 lines) that says which kinds get the list, the odd-one-out B-1 removed.

- **E-2's Location-sorted clause isn't delivered:** under Sort By Location, `setOrderOf` answers `'location'` so no custom Set order reaches `locationFlat`, and under the Custom order `flat()` never reads the Set tree; delivering it changes `setOrderOf`, which also feeds `routeSet` and `pageOrderOf`. What lands is E-2 inside a band: nested Sets' pages in a Cards band or a sub-grouped band follow the custom Set order. Cost to deliver: a `setOrderOf` change reaching drop routing, for Nathan to rule.

#### Corrections to the Investigation

- **Rename twins across tabs don't exist:** `useHosts` mounts one host per target key, so two tabs of one collection share a host. The twin is a homepage or Space tile of the same collection, or a Set's band beside its sidebar row.

- **A filter that empties a Set under a sub-grouping still removes the Set** (Phase 6): E-3 gives such a Set empty option bands, so the prune asks whether a band holds rows rather than whether it's empty, keeping today's behavior; no decision covers it and no pin was named.
- **`Table/bandCommits.test.tsx` holds only column-width and collapse-persist cases** after its band drops moved to `Bands/bandDrops.test.tsx`; its name no longer says what it holds, and the placements didn't approve a rename, so it stands for a reviewer or the morning.

#### Not Run

- **The locked tile pill, live:** no view tile in `~/Test`; the bug is read in code (`ViewTile.tsx:499` vs `:613`, `:328-330`).
- **Drives at planning:** the Archive Drive and the Properties Drive weren't run; their selectors change in Tasks 3-4, 4-1, and 4-3's patches and execution runs them at those checkpoints.
- **The ghost row's gutter hover** (Investigation *§Needs a Live Run*, 7.5): Behavior Change 16 states the structure, not the hover.
- **Tile edge padding and the pill's entering class** after Tasks 8-2 and 8-3: execution's checkpoint reviews look.
- **The drop line's 8px move over tail rows** (Behavior Change 14) and E-3's new drop targets under a Set: read in code and tests, not driven.

#### Overrule Candidates

1. Hide Disclosure Chevrons on makes the Filter's Location tree openable only by search (C-4 as written).
1a. Cards' editor Layout leaf gains the Visibility list (F-1 reading).
2. MenuBase as a phase (26 files of churn for a name and a folder).
3. `data-drop-outline` → `data-chevron` (drives touched).
4. The Trash's heading left over the checkbox gutter where the Archive's sits over the row titles.
5. `'detail'` → `'band'`.
6. `RenamablePageName` → `RenamableName` with `kind`.
7. The Bundle table's chevron becoming the shared control.
8. I-070's arm re-placing a row over a remote write.
9. The test consolidation left out.
10. Phase 1 landing net-positive for its placement.
11. `data-picker-portal` left spelled after the old name.
12. The disclosure shape (`Disclosure`, `useDisclosureSet`, `unfolded`) left in `UIX/Menus/DisclosureRow.tsx` while seven of its eight importers sit outside Menus (Wave One S6; a placement).
13. `OptionOrderList.tsx` keeping its name while it exports the panes' shared rows (Wave One; a placement).
14. The Issues index renumbered at the close (72 → 68 entries; the script's own rule).
15. `table-view.css` keeping its name while it holds `.table-shell`, which ArchiveView imports (Wave Three; a placement).

#### Ratification Review (11-08-2026)

- **Overrule candidates 1 and 1a ruled:** the Filter's Location tree keeps its chevrons whatever Hide Disclosure Chevrons says, and a Cards view's editor Layout leaf stays its switches alone. Both folded as fixups into Tasks 7-4 and 3-1 (the caption's document line into 11-1) and squashed over `cae07c129`; `LayoutFrame.tsx` conflicted at 3-1 and 3-3 and resolved toward both. The head moved from `099c236ee` to `70f5e1071`, +18 production lines (-352 from -370); the Cards leaf cost +19 against the six estimated, since the switches-only frame and the separator's move to the callers weren't counted.
- **Calls inside the rulings:** the caption names the two trees the setting reaches ("the sidebar's and Grouping pane's chevron gutter"), since the log's "Navigation Trees" counts the Location tree among the three; `layout.leaf` is a union (`'visibility' | 'switches'`) rather than a boolean, so a kind states what its Layout row opens; `kindSwitches` draws the rows alone and its callers draw the separator, since a separator under a bare header would have been a visible change; the pin is a Table case and a Cards case, each red when the routing ignores the record.
- **The F-1 contradiction closed** with the second ruling; C-5's shared chevron rule is set aside by the first.
