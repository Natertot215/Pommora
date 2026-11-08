### Views Cleanup — Morning Report

**DATE:** 11-08-2026
**STATUS:** Ready to Ratify — Placements Pending, at `cae07c129`

The plan is written and nothing is committed: the planning folder waits on your ratification, and the placements table waits on your approval. It should take the views system down by **352 production lines** (+3409 / −3761), with the comment count at 3,492 against the cap of 3,517. Three review waves folded before this report, and the final reader's verdict was: "Yes: a reader inheriting `099c236ee` with no context prefers it to `cae07c129`." Two of this report's items were then ruled at the morning review and folded (*§Ruled at Review*): the head is now `70f5e1071`, the verdict having been read at `099c236ee`, and the difference between the two is those two folds.

The most useful things to read below are *§What You'd Probably Overrule*, then *§Placements for Approval*, then the prompt at the end, which starts execution.

#### Overview

Eleven phases should leave the views system smaller, stated once, and ready for the row behavior List, Gallery, Calendar, and Timeline would share, without building any of them. In plain terms: a view kind becomes one record beside the component that draws it, so adding a kind is one file and one line in a table rather than entries in three places; the settings panes are reached one way from both doors; the small files that sat at the views folder's root for other owners dissolve to those owners, and the page record stops straddling the line between the half of the app that runs on disk and the half that draws; the view write becomes one act in one file; renaming a page goes through one shape that the surface showing the name holds, and a page created in a view opens its name field with its row rather than a tick after it; the Trash and Archive table draws its own heading; the pipeline prunes once and builds its option bands once; disclosure reads through one chevron and one fold, a band's head takes no Tab stop, and rows indent through one step; a tile reuses the view list's row and reads what a renderer declares rather than its class names; the menu shell is named and filed as a shell; and each row says whether it can be dragged. The last phase rewrites every document the work made false, and four Issues close.

The order lets each signature land once. The kind record goes first because the pane route reads it; the root dissolutions second because the Filter's native lists and the Table's column persistence read what they produce; the panes and the Table follow as the largest removals; the host contract comes before the pipeline and disclosure phases because they read its naming state and its indent rule; tiles follow the Table because the shell class renames together with the tile's rule; MenuBase and the row lock sit last so either drops at ratification without reshaping the chain. Everything is measured from real patches: all 27 replayed in the plan's order onto a clean `cae07c129`, matching the chain byte for byte, with typecheck, lint, 9,259 tests, both boundary tests, and `npm run build` green there, and the Archive Drive read whole on the head's build.

#### Process Overview

- [ ] `[Stop: ratified; placements approved; no code changes before this]`
- [ ] **Phase 1** — The Kind Record
  - [ ] Task 1-1 · One record per built kind
  - [ ] Task 1-2 · The host reads the active view once
  - [ ] Review Checkpoint
- [ ] **Phase 2** — The Views Root and the Live View
  - [ ] Task 2-1 · The root's dissolutions
  - [ ] Task 2-2 · The page record's home
  - [ ] Task 2-3 · The live view
  - [ ] Review Checkpoint
- [ ] **Phase 3** — One Pane Route
  - [ ] Task 3-1 · One pane route
  - [ ] Task 3-2 · The Settings root and the toolbar's view button
  - [ ] Task 3-3 · The rows and their words
  - [ ] Task 3-4 · The Filter's lists go through the menu door
  - [ ] Review Checkpoint
  - [ ] Compaction Checkpoint
- [ ] **Phase 4** — The Table and the Second Table
  - [ ] Task 4-1 · The Bundle table draws its heading
  - [ ] Task 4-2 · One column gesture
  - [ ] Task 4-3 · One shell class and one home per style
  - [ ] Review Checkpoint
- [ ] **Phase 5** — The Host and Its Renderers
  - [ ] Task 5-1 · One rename shape and the view's naming state
  - [ ] Task 5-2 · The seat and the ghost inside the interactions
  - [ ] Task 5-3 · One item API and the host's return
  - [ ] Review Checkpoint
  - [ ] Compaction Checkpoint
- [ ] **Phase 6** — The Pipeline and the Bands
  - [ ] Task 6-1 · One prune, one bucket builder, one ordered Set tree
  - [ ] Task 6-2 · The band layer owns its model
  - [ ] Review Checkpoint
- [ ] **Phase 7** — Disclosure and Rows
  - [ ] Task 7-1 · One disclosure shape
  - [ ] Task 7-2 · The band head's one Tab stop
  - [ ] Task 7-3 · One indent step and one lead cell
  - [ ] Task 7-4 · The Navigation Trees
  - [ ] Review Checkpoint
  - [ ] Compaction Checkpoint
- [ ] **Phase 8** — View Tiles
  - [ ] Task 8-1 · One view list row and menu
  - [ ] Task 8-2 · The tile's own pieces
  - [ ] Task 8-3 · Renderers declare, the tile reads
  - [ ] Review Checkpoint
- [ ] **Phase 9** — MenuBase
  - [ ] Task 9-1 · The shell named and filed as a shell
  - [ ] Review Checkpoint
- [ ] **Phase 10** — One Lock per Row
  - [ ] Task 10-1 · One lock per row
  - [ ] Review Checkpoint
- [ ] **Phase 11** — Docs and Issues
  - [ ] Task 11-1 · Docs and issues
- [ ] *§Final Verification* over `<BASELINE>..HEAD`
- [ ] `[Stop: the final report, per §Final Verification]`

#### Net Lines

| Phase | Own | Cumulative | Comments |
|---|---|---|---|
| 1 · The Kind Record | +11 | +11 | 3,517 |
| 2 · The Views Root and the Live View | −93 | −82 | 3,514 |
| 3 · One Pane Route | −76 | −158 | 3,515 |
| 4 · The Table and the Second Table | −146 | −304 | 3,511 |
| 5 · The Host and Its Renderers | −89 | −393 | 3,497 |
| 6 · The Pipeline and the Bands | −46 | −439 | 3,494 |
| 7 · Disclosure and Rows | +13 | −426 | 3,492 |
| 8 · View Tiles | +71 | −355 | 3,492 |
| 9 · MenuBase | ±0 | −355 | 3,492 |
| 10 · One Lock per Row | +3 | −352 | 3,492 |
| 11 · Docs and Issues | ±0 | −352 (+3409 / −3761) | 3,492 |

Three phases land net-positive. Phase 1 pays +11 for a kind being one record in one file beside its renderer, plus the one lookup, where two tables stood (the alternative, one file, was a runtime import cycle). Phase 7 pays +13 for `RowLead`, the one lead cell three row shells share, which also gives the ghost row the gutter it lacked. Phase 8 pays +71 for `ViewListRow` and `runViewRowAction`, the one view-list row and menu the dropdown and the tile share, with their typed props, in place of two inline switches and two inline rows, plus the tile's own payload file. Wave One's simplification read weighed each and kept them; the report's *§What You'd Probably Overrule* doesn't list them because the decisions ask for exactly these shared pieces, but if you'd rather have the lines back, Phase 8's row and menu are the place to look.

The Investigation estimated −578 to −815 at its low and high ends. The chain lands lower than the low end for three reasons the Build Log records phase by phase: the editor keeps its root (F-1), so the panes' largest removal took its smaller form; the shared pieces the decisions ask for (the kind record's three files, the one lead cell, the one view-list row, the host's naming state) carry lines of their own that the Investigation's per-finding estimates didn't price; and two phases (7 and 8) landed net-positive for those pieces, which Wave One's simplification read then trimmed. The north star of 300 removed is passed with margin.

#### Ruled at Review

Two items from the overnight list were ruled this morning and are folded into the chain, so they're off the list below.

1. **The Filter's Location tree keeps its chevrons whatever Hide Disclosure Chevrons says.** `LocationTree` no longer wears `navigationTree`, so the setting reaches the sidebar and the Grouping pane's folder list, where a row click opens a folder anyway. The caption reads "Collapse the sidebar's and Grouping pane's chevron gutter." and `ConfigurationPM.md:30` says the same, since the log's "Navigation Trees" counts the Location tree among the three and couldn't stay (Tasks 7-4 and 11-1, −1 line). C-5's shared chevron rule is set aside; the two trees still share their leaf spacing and the view's Set order.
2. **A Cards view's editor Layout leaf stays its switches alone.** The kind record declares it: `ViewKindRecord.layout.leaf` is `'visibility'` for Table and `'switches'` for Cards, and `ViewEditor` opens the Visibility pane titled Layout for the first and the switches under the same header for the second, each what that kind draws today, so F-1 holds whole. `kindSwitches` draws the switch rows alone and the two callers that put something above them, the Visibility pane's footer and Settings' Layout, draw the separator, since a separator under a bare header would have been a visible change. The pin became two cases, Table asserting the list present and Cards absent, each red when the routing ignores the record (Task 3-1, +19 lines; the estimate of six didn't count the switches-only frame or Biome's wrapping of the footer).

#### What You'd Probably Overrule

1. **The menu shell is renamed `MenuBase` and moved to `UIX/Menus/`.** G-1 keeps `PickerMenu` unless planning finds a rename earns its own phase. Moving the shell's files into Menus while they say "Picker" would be the odd-one-out the Principles forbid, so it's move and rename as one phase, Phase 9, your own open issue I-069 closing with it; 44 files change for no net lines. Reversing it is dropping Phase 9 at ratification, which also means I-069 stays open and the Decision Map, the Neutral Gate's intention, and *§Completion Criteria* lose their MenuBase lines; nothing later depends on it.
2. **Removing the drag description from rows that can't drag is its own phase.** A-5 lifts I-059's deferral, and Phase 10 does it: one `immovable` flag per row, which the engine reads once. It landed at +3 lines for the call-site threading, the engine side itself net-negative. Reversing it is dropping Phase 10 at ratification, with the same three documents losing its lines; nothing later depends on it.
3. **The Trash's heading stays over the checkbox gutter.** The Archive's and the Table's sit over the row titles. Phase 4 built the Trash onto the shared shell and the builder's CSS reading had the shell's content-pane bleed running into the Settings window's resize strip and moving the File Name heading 22px right; no decision names either, so I reversed it at stacking and the Trash keeps its own insets. The difference between the two tables stands as before. If you want the Trash's heading over the titles, that's a one-rule change in `trash-frame.css`, and a look at the window first.
4. **A page's rename component is `RenamableName` and takes a `kind`.** D-1 grows `PageNameRename` for views; the detail header renames Sets, Collections, and the homepage through the same component, so the name stopped saying "page". A rename back is mechanical.
5. **The band's fence host is `'band'`.** D-1 asks for a name for the fence's `'detail'` surface once the Set band is its one claimant. Mechanical to change.
6. **The chevron attribute is `data-chevron`.** The component became `DisclosureChevron`, and the attribute `data-drop-outline` followed, which touched the Archive and Properties drives and their matrices. Keeping the old attribute under the new component is a small revert across those files.
7. **A refused cross-band drop returns its row over any later write, a remote one included.** I-070's fix (Task 2-3) re-places the row at its prior slot whenever the live order after the take-back differs from the drop's; a write arriving from another device during the round trip triggers it too, and the local re-placement wins for that one row. The issue's wording covers it, nothing on the wire changes shape, and it's one row's slot, but it's the one place this plan's behavior meets sync. Dropping the rider is removing the arm (about eight lines) and leaving I-070 open.
8. **The Issues index renumbered.** Closing I-040, I-059, I-069, and I-070 and the emptied A7 • Views ran `index-issues.py`'s own rule, which closes gaps, so every issue above I-040 moved down (72 entries to 68, A8 • Matrix to A7). The map from old to new numbers is in *Phase 11 — Notes*. The planning folder keeps the old numbers as a record of its time. If you'd rather hold the numbers, the Issues edits are one patch to redo.
9. **`data-picker-portal` and `pickerBloom` keep their names.** The attribute sits in 27 files, nine of them drives, more than the whole MenuBase phase touched. A follow-up, or never.
10. **Two placements the reviewers would move.** The disclosure shape (`Disclosure`, `useDisclosureSet`, `unfolded`) stays in `UIX/Menus/DisclosureRow.tsx` while seven of its eight importers sit outside Menus, the rule Task 7-1 applied to the chevron; and `OptionOrderList.tsx` keeps its name while it now exports the panes' shared rows. Both are placements, so I left them for you rather than moving files overnight.
11. **The Investigation's test-harness consolidation is left out.** About 300 test lines of shared builders and de-duplicated suites; not production, not asked, and churn against "stop adding tests". A follow-up if you want it.
12. **E-2 lands inside bands only.** See *§Contradictions With the Log*.
13. **`table-view.css` keeps its name.** It's named for TableView, its header calls it the shell TableView and ArchiveView wear, its block class is `.table-shell`, and ArchiveView imports it. Wave Three would rename it `table-shell.css` or reword its header; both are placements, so it waits for you.

#### Placements for Approval

Every new, moved, renamed, and deleted file, as the plan's *§Constraints · Placements* lists them. A test file follows the file it tests and isn't listed. Approving this table is part of ratifying the plan.

| Path | Change | Why |
|---|---|---|
| `Core/Views/Table/tableKind.ts` | New | Table's record: renderer, `nests`, layout switches (Task 1-1) |
| `Core/Views/Cards/cardsKind.ts` | New | Cards' record: renderer, `nests`, layout switches and its three picker rows, moved from `LayoutFrame.tsx` (Task 1-1) |
| `Core/Views/Host/viewKinds.ts` | New | The record's type, the table of built kinds, and `presentedKind`, the one lookup of the kind drawn, Table for an unbuilt one; it can't sit in `ViewHost.tsx`, which `useViewHost.ts` would then import back in a runtime cycle (Task 1-1) |
| `Core/Views/containerConfig.ts` | Deleted | `container:configure` becomes the `setViewButton` mutate op in `Nexus/mutateRequest.ts` and `Nexus/mutate.ts`, beside `setDisclosureLock` (Task 2-1) |
| `Core/Views/filterModel.ts` | Deleted | Operator lists → `valueKinds.ts`; `filterTargets` → `paneTargets.ts`; `decodeFilter` → `Settings/FilterFrame.tsx` (Task 2-1) |
| `Core/Views/reassign.ts` | Deleted | `reassignable`, `groupKeyToValue` → `valueKinds.ts`; `reassignTarget` and the sort-run reassign → `Host/useViewInteractions.tsx` (Task 2-1) |
| `Core/Views/visibilityModel.ts` | Deleted | Into `Pipeline/columns.ts` over one shown-column predicate (Task 2-1) |
| `Core/Views/creationOrder.ts` | Deleted | `tieOrderWith` → `Host/useViewCreation.ts`; `placeAt` (as `placedBeside`) and `placementSlot` → `Nexus/order.ts`; `placeNew` → `Actions/createActions.ts` (Task 2-1) |
| `Core/Views/Pipeline/pickView.ts` | Deleted | Into `views.ts` (Task 2-1) |
| `Core/Views/pageRow.ts` | Deleted | Every `ViewRow` builder joins `viewRow.ts` (Task 2-2) |
| `Core/Views/pageValues.ts` | New | `PageValues` and `pageValuesOf`, the pair both halves read: the host's reader and the Matrix graph build it, the bridge types it, and two window callers build a blank; in `loadValues.ts` it dragged the host's readers into the window bundle (Task 2-2) |
| `Core/Views/viewRow.ts` | Window-side | Holds `ViewRow`, `ResolvedGroup`, and every builder; `ResolvedColumn` → `Properties/properties.ts` beside `ColumnType` (Task 2-2) |
| `Core/Views/Host/useColumnStyles.ts` | Deleted | `styleFor`, `columnStylePatch`, `columnDefaults` → `Properties/columnStyles.ts`; `useNexusForms` → `Session/store.ts` as `useDateForms` beside `useSetting` (Task 2-2) |
| `Core/Views/Host/pendingView.ts` | Renamed `Host/liveView.ts` | The live view's record, write, and active read in one file (Task 2-3) |
| `Core/Views/viewWrite.ts`, `Core/Views/Host/useActiveView.ts` | Deleted | Into `Host/liveView.ts` (Task 2-3) |
| `Core/Views/Host/paintAhead.ts` | New | `ahead`, `usePainted`, `mutateAhead`, `refusedDrop`: the tree-order paint-ahead, out of the view record (Task 2-3) |
| `Core/Views/ViewTileScope.tsx` | Renamed `.ts` | No JSX (Task 2-3) |
| `Core/Views/deleteViewWithUndo.ts` | Deleted | Into `Settings/ViewFrame.tsx`, its one importer (Task 2-3) |
| `Core/Views/Settings/ViewLeaf.tsx` | Renamed `Settings/ViewPane.tsx` | `VIEW_PANES` and the one dispatcher (Task 3-1) |
| `Core/Views/Settings/switchRows.tsx` | Deleted | `switchRow` joins `UIX/Menus/MenuIndex.tsx` beside `pickerRow` (Task 3-3) |
| `Core/Views/Settings/paneRows.tsx` | Deleted | Into `OptionOrderList.tsx` (Task 3-3) |
| `Core/Views/Settings/group-frame.css.ts`, `option-order.css.ts` | Merged into `option-order.css.ts` | One stylesheet for one list (Task 3-3) |
| `Core/Views/Settings/ViewMenu.tsx` | Moved to `Core/Interface/Toolbar/ViewMenu.tsx` | A toolbar button beside `SettingsMenu` and `OutlineMenu` (Task 3-2) |
| `Core/Views/Settings/view-frame.css.ts` | New | `chevronButton` and the `archive*` styles only `ViewFrame` reads, out of `toolbar-menu.css.ts` (Task 3-2) |
| `Core/Actions/viewRowMenu.ts` | Deleted | Into `Actions/viewMenus.ts` (Task 3-2) |
| `Core/Views/Table/ColumnHeader.tsx` | Deleted | Gesture → `useColumns.ts`, markup → `TableView.tsx` (Task 4-2) |
| `Core/Views/Table/cellSweep.ts` | Renamed `useCellSweep.ts` | Named for its export (Task 4-2) |
| `Core/Properties/Cells/cells.css` | New | `UIX/Table/table.css:222-321`, styles only Properties' cells emit (Task 4-3) |
| `UIX/Elements/DisclosureChevron.tsx`, `UIX/Elements/disclosure.css.ts` | New (moved) | `DropOutline` and `listed-outline.css.ts` out of `UIX/Menus`; every external importer is outside Menus (Task 7-1) |
| `UIX/Table/RowLead.tsx` | New (merged) | `RowRail.tsx` dissolves into the one lead cell three row shells share, which applies `rowIndent` (Task 7-3) |
| `Core/Views/Host/useBandHeads.ts` | Renamed `Core/Views/Bands/useBandSource.ts` | Its product is band faces (Task 6-2) |
| `Core/Views/Pipeline/bandOrder.ts` | Deleted | `orderSetTree` in `group.ts` (Task 6-1) |
| `Core/Views/Pipeline/setIndex.ts` | Moved to `Core/Views/Bands/setIndex.ts` | The band layer's lookup (Task 6-2) |
| `Core/Tiles/viewTileEntry.ts` | New | The tile's payload algebra, the tile's counterpart to `viewsFile.ts` (Task 8-2) |
| `UIX/Pickers/PickerMenu.tsx`, `panePlacement.ts`, `usePaneResize.tsx` | Moved to `UIX/Menus/MenuBase.tsx`, `UIX/Menus/panePlacement.ts`, `UIX/Menus/usePaneResize.tsx` | The shell named and filed as a shell, I-069 (Task 9-1) |
| `UIX/Pickers/picker-base.css.ts` | Shell half → `UIX/Menus/menu-base.css.ts`; `treePane` → `Settings/filter-frame.css.ts`; `optionRing` → `UIX/Pickers/calendar-picker.css.ts` | Each style beside its one consumer (Task 9-1) |
| `UIX/Menus/frames.css.ts`'s Properties-only exports | Moved to `Core/Properties/Schema/schema.css.ts` | The header "KNOBS — the ViewFrame tunables" is wrong for them (Task 9-1) |
| `Core/Views/Table/bandCommits.test.tsx:194-843` | Moved to `Core/Views/Bands/bandDrops.test.tsx` | Tests band routing (Task 6-2) |
| `Core/Views/manualOrderDrops.test.tsx` | Moved to `Core/Views/Host/rowDrops.test.tsx` | Tests the host's routing (Task 5-2) |

#### Contradictions With the Log

I followed each decision where I could.

- **E-2's Location-sorted clause isn't delivered.** E-2 says a custom Set order also orders the pages of nested Sets inside one band or a Location-sorted list. Inside a band it does (Task 6-1). Under Sort By Location, `setOrderOf` answers the Nexus's order so no custom Set order reaches the flat list, and under the Custom order the flat list never reads the Set tree; delivering it changes `setOrderOf`, which also feeds drop routing (`routeSet`, `pageOrderOf`). It's the plan's one *§Open Item*, for you to rule a follow-up or not.
- **A filter that empties a Set under a sub-grouping still removes the Set.** E-3 gives such a Set empty option bands, so the old emptiness test would have kept it; the prune now asks whether a band holds rows, keeping today's behavior. No decision covers it.
- **The Investigation's rename-twin claim was wrong, not the log's:** `ContentView.tsx`'s `useHosts` mounts one host per target, so two tabs of one collection share a host. The twin is a homepage or Space tile of the same collection, or a Set's band beside its sidebar row, which the fence already ranks.

#### Calls I Took

**Order and Shape:**

- **Eleven phases from the Investigation's nine themes,** with MenuBase (9) and the row lock (10) last so either drops at ratification, and a docs-and-issues phase closing. Phases built in pairs in parallel worktrees and stacked onto one chain, each stacking fold landing in its task's commit.
- **Form B for the editor** (F-1), the grid staying at the editor's root; each kind's Layout leaf stays what it draws today, declared on the record as `layout.leaf` (ruled at review).
- **D-1's reading:** the view-name renames in the dropdown and tiles were surface-held already (local editing state over `RenamableLabel`), so they adopt no component; Task 8-1 consolidates their two copies into one `ViewListRow`. `RenamablePageName` grows into `RenamableName` with the entity's kind, serving tabs, page windows, the detail header, and views; `submitRename` takes `fromCreate` explicitly, and the fence's own commit clears the fence.
- **D-2's state:** the host holds `naming: { id, create, landing }`, begun under the minted id in the gesture's tick and cleared when the id is neither drawn nor landing, which a refused create and a filtered-away newborn both reach. The live probe showed the row arrives about 2ms before the field opens today, both on the reply, and the Table's ghost leaves 21ms before the newborn lands; both fixes are in Phase 5.
- **`reassignTarget` moved at Phase 2** with the sort-run reassign, so it's written once.
- **The Trash keeps its own insets** (overrule item 3); the Trash and Archive table's chevron takes the shared control outside the Tab order, keeping its place in the row.
- **`RowLead` is built,** absorbing `RowRail` and applying `rowIndent`, since it gives the ghost row the gutter it lacked; `rowIndent` itself stays.
- **The Archive Drive runs whole** at Phase 4's checkpoint rather than guessed groups; the Properties Drive's E and F groups at Phase 3's.
- **Phases 9 and 10 kept** (overrule items 1 and 2).

**In the Code:**

- `Host/viewKinds.ts` holds the kind record's type, the built table, and `presentedKind`, since the single-file form in `ViewHost.tsx` was a runtime cycle with `useViewHost.ts`; Phase 1 landed +9 for three files where two tables stood.
- `PageValues` and `pageValuesOf` took an engine-safe `pageValues.ts`, since in `loadValues.ts` the window's two blank-row callers imported the host's readers.
- `ViewPane` takes `current?` and `switches?`, what the two doors differ by on Visibility; `SettingsWindow`'s own toggles stayed (they carry captions `switchRow` doesn't); `PickerRowLook.solid` went with F-6.
- `beginNaming(id, flight?)` derives `create` from a flight; `showEntityMenu(target, trigger, createPage?)` takes the band's create override; `CardTitle` draws one element in every mode so a committed title survives a scroll-mode switch.
- `bucketBands(rows, grouping, sorter, placement, scope?)`, since after E-3 both levels keep empty live options and the top-level tail key stays `_ungrouped`.
- `navigationTree` scopes the one hide rule to the sidebar and the Grouping list, since bands, the Bundle table, the Property frame, the Outline, the autocomplete, and the Filter's Location tree draw the same chevron and keep it; the caption names the two trees, since the log's "Navigation Trees" counts the Location tree among them. `layout.leaf` is a two-member union rather than a boolean, so a kind says what its editor's Layout row opens. The Location tree's Set order comes through `ViewPane` ordering the folders it hands the Filter, since the Matrix and Preview Rules filters mount the same tree with no view.
- `persistConfig`'s lock check became `editViews(op)`'s, the one gate every direct list edit passes, since another window can lock a tile mid-rename; `data-view-lead` carries `"head"`, `"row"`, or `"band"`.
- `immovable` is the row lock's name, since `fixed` and `locked` already mean other things; a searching Cards view's band list keeps its Tab stop.
- `bareSurface` and `hostedGutter` weren't folded (three callers, not one); `headerPhotoImg` stayed with its header kin.

**From the Reviews:**

- Wave One's seventeen folds (*Plan Reviews*), among them the Trash claim the stacking fold had left in a header and a document, the tile's rename stated once, `naming.landing` in place of a set of flights, `commitGroupValue` off the host, one `shownLabel`, dead exports gone, and the drive's stale label and matrix rows.
- Wave Two's seven code folds and its plan cuts (*Plan Reviews*): the fence's label written once through `RenamableName`, `BandDrop` beside its model, one `popOptions` menu-door spelling, `forms` for every `DateForms` local, `patchSeedValues` gone, one `ViewWriter` type for every bound view save; the plan lost its Concepts file rows (Placements is the one file ledger), 22 non-concept rows, and its restated rules, and gained the ledger checks stated once. The code folds cost +17 lines, almost all Biome wrapping import lines past the column limit once one more name joined them; each stands for One Way rather than lines.
- Wave Three's eight plan-text folds (*Plan Reviews*), the Comment Ledger's Phase 9 cell among them, with its one placement question (the shell stylesheet's name) left for you below as item 13.

**From the Close:**

- Scratch commits carry whichever model's trailer the builder used; the patches are bare diffs, and the execution run's commits carry the plan's.
- The two `.claude` symlinks the gates needed (in the scratchpad and the session directory, both outside the repo) were removed at the close.

#### Flagged Behavior Changes

Every row the plan's *§Behavior Changes* lists, numbered as it does, with its decision. Each is a decision you made in the log, a fix the Investigation named, or a change the build surfaced; the plan numbers them in task order.

1. **(I-070, Task 2-3)** A refused cross-band drop that a later write composed over returns its row to its prior slot.
2. **(1.11, Task 3-2)** The toolbar's view button reflects a rename or icon change the moment it's staged, rather than after the write lands.
3. **(F-2, Task 3-3)** Both page-icon switches read "Title Icons" with the `file-text` glyph, on meaning shown; the Cards switch flips polarity on screen while `hide_page_icons` stays the saved key.
4. **(E-5, Task 3-3)** Grouping's Order rows take `folder` for the Sets order and `arrow-down-up` for a property's.
5. **(F-6, Task 3-3)** Cards' Card Image, Card Style, and Card Scale pickers open over the pane like every other picker, without the solid background.
6. **(F-9, Task 3-3)** The views dropdown's disabled "More" placeholder draws as `FooterIconButton` with `ellipsis`, as Settings' does, and reads "More actions" to a screen reader.
7. **(F-7, Task 3-4)** The Filter pane's property and operator lists follow the Native Menus setting; the Checkbox operators read "Checked" and "Unchecked" in the list and the closed field, with a plain check glyph.
8. **(1.6, Task 3-4)** With Native Menus off, the Filter's property and condition lists draw as Sort's do: compact rows, the current row ringed, in place of the field's own item pane.
9. **(F-8, Task 4-1)** The Trash and Archive date column left-aligns, heading and dates alike; Trash's heading glyph gap goes from 8px to 6px and its date heading's lead lines up with the dates.
10. **(I-040, D-2, Task 5-1)** A page created from a view opens its name field with its row rather than a tick after it, and a Set band's menu New Page creates through the view's path, with the band's seeds and order, opening its field the same way.
11. **(2.1, D-1, Task 5-1)** A Cards title rename commits without the old title flashing before the tree push.
12. **(D-1, Task 5-1)** A sidebar rename no longer hides the Cards hover ghost, since the ghost reads the view's own naming rather than the app-wide rename; a Cards ghost closing when a page-menu rename opens fades out rather than vanishing; and clicking a Table ghost held for an in-flight create does nothing, as Cards' already did.
13. **(2.4, Task 5-2)** The Table's anchored ghost holds its place until the newborn lands, where it left a frame early.
14. **(E-2, Task 6-1)** A custom Set order also orders the pages gathered from nested Sets inside one band, a Cards band or a sub-grouped band, when nothing else sorts them; a sort or a manual page order still wins. A Location-sorted flat list keeps the Nexus's own order (*§Open Items*).
15. **(E-3, Task 6-1)** Grouping by a Select or Status shows empty option bands under each Set as it does at the top level, both governed by Hide Empty Groups; those bands take row and bucket drops, and a Set holding only empty bands springs open on a drag. A Set a filter empties still leaves the view.
16. **(6.6, Task 6-2)** The drop line over a tail row sits where the row's indent does; the 8px disagreement goes.
17. **(7.1, Task 7-1)** The Trash and Archive table's chevron is the shared control: a double-click opens and closes the folder as the sidebar's does, where the second click did nothing. Its nested rows' trail caps slightly shorter, measured against the indented cell.
18. **(C-3, Task 7-2)** Tab no longer stops on a band's chevron or its New Page button; the list is the one stop, Enter toggles the band, and the context-menu key opens its menu. The band head's own `aria-expanded` carries the state in place of the button's label, and the Table's band chevron shows no pointer cursor.
19. **(7.5, Task 7-3)** The ghost row draws the lead cell the data rows draw, gutter included.
20. **(C-4, Task 7-4)** Hide Disclosure Chevrons' caption names the sidebar and the Grouping pane. In the sidebar with it on, the empty chevron slot keeps the row's 8px gap, so icons sit about 2px further right and the row's hover fill reaches 6px further left.
21. **(C-5, Task 7-4)** The Location tree lists folders in the view's custom Set order with the Grouping tree's leaf spacing.
22. **(8.1, 8.2, Tasks 8-1, 8-2)** A tile's dropdown rows no longer auto-size their rename field, matching the toolbar's dropdown; a new pill's entering class stays until the list next changes, so its entrance replays if the pill remounts or a reorder moves it.
23. **(3.2, Task 8-2)** A locked tile's view pill no longer opens a rename that would drop silently; the tile's duplicate reads sibling names from the stored entry rather than the drawn list.
24. **(I-059, Task 10-1)** A row that can't be dragged no longer tells screen readers to press Space to pick it up, a displace item in a disabled zone included; a searching Cards view's band list keeps its Tab stop, as the Table's always did.

#### Not Run

- **Execution itself:** none of this ran on `active`. Patches replay onto a clean `cae07c129`.
- **The locked tile pill, live:** `~/Test` has no view tile; the bug is read in code (`ViewTile.tsx:499` against `:613`), and Task 8-2 fixes it.
- **The Properties Drive's E and F groups:** not run at planning; Task 3-4 re-points its MP-E-3 matrix row, and execution runs the groups at Phase 3's checkpoint.
- **On screen:** the Trash's heading and date column under Task 4-1, the drop line's 8px move over tail rows (16), E-3's new drop targets under a Set (15), the band chevron's cursor, the sidebar's 2px icon shift under Hide Chevrons, the tile's padding and zoom under `[data-view-embed]`, and the pill's entering class were read in code and tests, not looked at; the Archive Drive's 158 green cases cover the Trash and Archive table's chrome.
- **The Cards rename flash fix (behavior change 11) and the two ghost stand-downs' removal** rest on code reading and jsdom tests; the Investigation had asked for a drive.
- **Real native menus:** jsdom stubs the menu door, so the Filter's lists under Native Menus on were reasoned from Sort's and Group's identical path, not run.

#### The Prompt That Starts Execution

```
Execute Views Cleanup now, unattended and overnight, through `c/plan-execution`, from `.claude/Planning/Views Cleanup/Views Cleanup — Implementation Plan.md`, on `active`. Don't stop until its *§Final Verification* report is written; I'll read it in the morning, and nothing here needs me.

Nathan's Approach and Principles, verbatim in the plan's *§Constraints · Mandate*, govern every phase and task, and every agent brief — executors, checkpoint reviewers, the final waves, the neutral gate, and any continuation or handoff — carries both sections in full, with an explicit model and effort. The neutral gate's brief carries those and its intention under *§Constraints · Neutral Gate*, and nothing else from the plan.

**Read first, from the files themselves:** the plan's *§Context*, *§Overview*, *§Concepts*, *§Constraints*, *§Process Overview*, *§Completion Criteria*, and *§Final Verification*; `Scouts/Planning/Phases/Build Log.md` and `Pins.md`; then `~/The Studio/.claude/skills/agent-orchestration/SKILL.md` before dispatching anything.

**Rules:**
- The plan is ratified and its placements approved, and the planning folder is committed, before any code changes; that's the first `[Stop]` in *§Process Overview*, already passed when this prompt runs.
- A task's AFTER is its patch in `Scouts/Planning/Phases/`. Apply it with `git apply`, or `git apply --3way` if `active` has moved past `cae07c129`, resolving toward the patch's intent and recording the conflict under *§Deviations*; run its VERIFY as written, revert and restore each pin `Pins.md` names for the task, and commit with the plan's Commits form and its trailer. Every patch replays in order onto the BASELINE.
- Each Review Checkpoint dispatches its two read-only reviewers at `opus-high`; the Properties Drive's E and F groups run at Phase 3's checkpoint and the Archive Drive whole at Phase 4's, each from a worktree built by `editor-parity/worktree.sh`, one at a time, never from the main checkout, never stopping an instance you didn't start.
- Every stop is yours to handle. The plan's Compaction Checkpoints replace the command's, so nothing waits. An ambiguity takes its simplest reading, gets recorded under *§Deviations*, and the run carries on.
- This run will compact. The plan file holds all state, so after any compaction re-read *§Constraints* and *§Process Overview* from the file rather than from a summary, and resume from what's ticked.
- Send a PushNotification at each checkpoint, in plain language: what landed, what the reviewers and drives found, and what's next.
- A Bash command carrying `git` can't contain a personal name, and that includes heredocs.
- Remove every worktree and scratch fixture before the report, and prove it with *§Final Verification · The Cold-Machine Check*.
```
