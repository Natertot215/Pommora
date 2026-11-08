## Views Cleanup — Implementation Plan

**DATE:** 11-08-2026
**STATUS:** Ratified 11-08-2026 — Executing
**SOURCE:** *Views Cleanup — Decisions & Intention* (ratified 11-07-2026, Decisions A-1 to G-4 with its *§Constraints* and *§Rejections*), *Views Cleanup — Investigation* (whose numbered findings, such as 1.1 or 5.2, the tasks cite in parentheses), *Views Cleanup — Fresh-Eyes Read*, and the phase patches and reports in `Scouts/Planning/`, all in `.claude/Planning/Views Cleanup/`.

**PLAN REVIEWS:** three waves, folded (*Views Cleanup — Plan Reviews*): Wave One outward, 21 findings; Wave Two inward, 23; Wave Three both ways, 8; then a closing proof that replayed all 27 patches onto a clean `cae07c129` to the chain's exact tree; at the morning review two rulings (the Location tree keeps its chevrons; the Cards leaf stays its switches) folded into Tasks 7-4 and 3-1 and the proof re-ran (*Plan Reviews · §Ratification Folds*).

**BASELINE**

| Head | Tests | Start | End |
|------|-------|-------|-----|
| `cae07c129` | 9,269 passed, 2 skipped (550 files); comments 3,517 | 11-08-2026 11:26 AM; typecheck and lint clean; 9,269 passed, 2 skipped (550 files); comments 3,517; ~/Test e5a32a5d30d6a11310cd559ee2b1b84b261c3265 | |

**Run Start:** comments 3,517; `~/Test` hash `e5a32a5d30d6a11310cd559ee2b1b84b261c3265`.

**Net Ledger** (production lines from the Actionable cell of `view-delta --exclude .claude`, cumulative from the BASELINE head with the phase's own delta beside it; Estimate is what the chain measured at planning after the review waves and the morning's two rulings folded, with the added and removed split in *Scouts/Planning/Phases/Build Log*, and Measured is filled during the run):

| Phase | Estimate | Tests at the Phase's Head | Measured |
|-------|----------|---------------------------|----------|
| 1 · The Kind Record | +11, +11 its own | 9,269 | +11 (+146 / -135); 9,269; comments 3,517 |
| 2 · The Views Root and the Live View | -82, -93 its own | 9,256 | -82 (+907 / -989); 9,256; comments 3,514; after the checkpoint's fold -92 (+901 / -993); 9,257; comments 3,513 |
| 3 · One Pane Route | -158, -76 its own | 9,261 | -168 (+1569 / -1737); 9,262; comments 3,514; after the checkpoint's fold -176 (+1573 / -1749); 9,262; comments 3,514 |
| 4 · The Table and the Second Table | -304, -146 its own | 9,259 | -322 (+1809 / -2131); 9,260; comments 3,510; after the checkpoint's fold -338 (+1799 / -2137); 9,259; comments 3,509 |
| 5 · The Host and Its Renderers | -393, -89 its own | 9,259 | -427 (+2238 / -2665); 9,259; comments 3,495; after the checkpoint's fold -443 (+2255 / -2698); 9,260; comments 3,495 |
| 6 · The Pipeline and the Bands | -439, -46 its own | 9,258 | -489 (+2426 / -2915); 9,259; comments 3,492; after the checkpoint's fold -550 (+2452 / -3002); 9,260; comments 3,492 |
| 7 · Disclosure and Rows | -426, +13 its own | 9,259 | -537 (+2726 / -3263); 9,261; comments 3,490; after the checkpoint's fold -563 (+2740 / -3303); 9,262; comments 3,489 |
| 8 · View Tiles | -355, +71 its own | 9,259 | |
| 9 · MenuBase | -355, ±0 its own | 9,259 | |
| 10 · One Lock per Row | -352, +3 its own | 9,259 | |
| 11 · Docs and Issues | -352 (+3409 / -3761), ±0 its own | 9,259 | |

**Comment Ledger** (the Constraints' command; a phase's row is its head's count, and a phase over its row corrects before it closes):

| Phase | Count | Change | What Arrives and Leaves |
|-------|-------|--------|-------------------------|
| 1 | 3,517 | 0 | Arrives: the pane tree's reason in `GroupFrame.tsx`. Leaves: `ViewHost.tsx`'s "Only the type and scale…". No header on the three new files |
| 2 | 3,514 | -3 | Arrives: `paintAhead.ts`'s header. Leaves: `handlers.ts:13`, `filterModel.ts`'s header, `hiddenListIds`' doc, `pendingView`'s divider; `group.ts`'s header moved onto `flattenContainer` |
| 3 | 3,515 | +1 | Arrives: E-4's reason in `GroupFrame.tsx` |
| 4 | 3,511 | -4 | Leaves: `DateHeading`'s doc and the heading's biome-ignore in `BundleTable.tsx`, `ColumnHeader.tsx`'s four (its header moving onto `useColumns`' gesture, the biome-ignore onto `TableView`'s header map), `useColumns.ts`' Order divider and `reorderColumns`' doc, `table.css`'s eight cell comments and the date-heading note (to `cells.css` and `bundle-table.css`). Arrives: `cells.css`'s header. Rewritten in place: `archive-view.css`, `bundle-table.css`, `trash-frame.css`, `table-view.css`, and `useColumns.ts`'s headers |
| 5 | 3,497 | -14 | Leaves: `TableView.tsx`'s five section dividers and `DetailTitleHeader`'s biome-ignore (5a, 5c), `CardsView.tsx`'s seat and card-api dividers, its inline-field stand-down note, and `CardApi`'s doc (5b, 5c), the policy's `rename` doc and the standing-ghost note in `useViewInteractions.tsx` (5a, 5b), `cardColumns.ts`'s `fillsBlank` doc, `patchSeedValues`' doc (5c). Arrives: the held ghost's one line. Rewritten in place: `useViewCreation.ts`'s and `useViewInteractions.tsx`'s headers; the secondary-click note moves with the title cell into `DataRow` |
| 6 | 3,494 | -3 | Leaves: `bandOrder.ts:1`, `group.ts:332`'s "Compose bucket-first", `resolveView.ts:1`'s stage list. Rewritten in place: `group.ts:265` ("Cards never indent" to "a kind that doesn't nest"), `sort.ts:38` ("TableView's" to "the host's") |
| 7 | 3,492 | -2 | Leaves: `autocomplete.ts`'s hidden-rows note (its walk now `unfolded`'s doc in `DisclosureRow.tsx`), `RowRail.tsx`'s header (its gutter sentence now in `RowLead.tsx`'s), `TableView.tsx`'s grid-cell biome-ignore, `sidebar.css`'s hide-chevrons KNOB comment. Rewritten in place: `rowIndent.ts`'s doc, `table-view.css`'s band-scope comment; the `'spacer'` doc moves with the chevron to `UIX/Elements` |
| 8 | 3,492 | 0 | Arrives: `viewTileEntry.ts`'s header. Leaves: `ViewTile.tsx:123`'s peek-anchor comment |
| 9 | 3,492 | 0 | `frames.css.ts`'s header and `menu-base.css.ts`'s back-bar comment rewritten in place; `frames.css.ts`'s "A type editor's rows" doc moves to `schema.css.ts` with its rows |
| 10 | 3,492 | 0 | No comment line changes |
| 11 | 3,492 | 0 | `viewHarness.tsx:1` rewritten in place |

### Context

A Collection's saved views live in `Core/Views`: 69 production files and 9,801 lines at `cae07c129`, comments and blanks included. Two view kinds are built, Table and Cards; List, Gallery, Calendar, and Timeline are registered with no renderer, their picker tiles inert, and a saved view of one draws as a Table. A kind is defined across three tables (`VIEW_KINDS` in `views.ts`, `VIEW_RENDERERS` in `ViewHost.tsx`, `LAYOUT_OPTIONS` in `LayoutFrame.tsx`), the Table fallback is written twice, and each renderer assembles its own wiring from the 42 fields `useViewHost` returns, so Table and Cards each carry a rename path, a ghost loop, and a stable item interface of their own. Around the views sit the settings panes, reached through two doors and three dispatchers; View Tiles, which embed a view and re-implement the view list's rows and reads each renderer's DOM classes; and the Trash and Archive table, which borrows the views' column layout and builds its heading by hand.

Core has two halves. The engine half runs in the host process and may not reach React or UIX, which `Core/Contract/engineGraph.test.ts` and `Desktop/hostGraph.test.ts` enforce; the window half draws the interface. Seven Views files are engine-side, `views.ts` among them, and the page record in `viewRow.ts` straddles the two because the engine reaches it for one type pair.

### Overview

Eleven phases should leave the views system smaller, stated once, and ready for the row behavior List, Gallery, Calendar, and Timeline would share, without building any of them. Phase 1 gives each built kind one window-side record beside its renderer and one presented-kind lookup. Phase 2 dissolves the Views root's misfiled files, moves the page record off the engine boundary, and gathers the view write into one file. Phase 3 routes both settings doors through one pane table, folds the switch rows and the Filter's lists into the kit's menu door, and settles the panes' wording. Phase 4 lets the Trash and Archive table draw its own heading, folds the column resize into the drag gesture, and gives the Table shell one class. Phase 5 is the host contract: one surface-held rename shape, a view's naming state keyed at the gesture, the seat and the ghost inside the interactions, one item API, and a host return that carries only what renderers read. Phase 6 gives the pipeline one prune walk, one bucket builder, and an ordered Set tree. Phase 7 gives disclosure one shape, the band head one Tab stop, rows one indent step, and the sidebar and the Grouping pane's folder list one chevron rule. Phase 8 shares the view list's row and menu between the dropdown and tiles and lets renderers declare what a tile reads. Phase 9 names and files the menu shell as a shell. Phase 10 gives each row one lock. Phase 11 makes the documents read true.

The order lets each signature land once. The kind record goes first because the pane route reads it; the root dissolutions and the record's move go second because the Filter's native lists read `PickerOption` targets and the Table's `placeInShown` reads the merged columns file; the panes and the Table follow as the largest removals; the host contract comes before the pipeline and disclosure phases because they read its naming state and its `memberIndent`; tiles follow the Table because the shell class renames together with the tile's rule; MenuBase and I-059 sit last since nothing else depends on them, so either can be dropped at ratification without reshaping the chain.

#### Decision Map

| Decisions  | Where                                                                                          |
| ---------- | ---------------------------------------------------------------------------------------------- |
| A-1 to A-6 | Scope and process: *§Constraints* and every task                                               |
| B-1        | Task 1-1                                                                                       |
| B-2        | Tasks 5-1, 5-3                                                                                 |
| C-1        | Task 7-1                                                                                       |
| C-2        | Task 7-3                                                                                       |
| C-3        | Task 7-2                                                                                       |
| C-4, C-5   | Task 7-4; the Filter's Location tree keeps its chevrons (*§Constraints · Rulings*)             |
| D-1, D-2   | Task 5-1; the view-name renames consolidate in Task 8-1                                        |
| E-1        | Task 11-1                                                                                      |
| E-2        | Task 6-1, inside a band; the Location-sorted clause isn't delivered (*§Open Items*)            |
| E-3        | Task 6-1                                                                                       |
| E-4        | Task 3-3                                                                                       |
| E-5        | Task 3-3                                                                                       |
| F-1        | Task 3-1 keeps the grid at the editor's root and each kind's Layout leaf as it draws today     |
| F-2        | Task 3-3                                                                                       |
| F-3, F-4   | Hold: no task touches the title labels, the duplicate switch, or the Settings header's meaning |
| F-5        | Task 8-1                                                                                       |
| F-6        | Task 3-3                                                                                       |
| F-7        | Task 3-4                                                                                       |
| F-8        | Task 4-1                                                                                       |
| F-9        | Task 3-3                                                                                       |
| G-1        | Phase 9 earns the rename; `Views/Host/` stays                                                  |
| G-2        | Tasks 6-2 (`useBandSource`), 4-3 (`.table-shell`), 7-3 (`RowRail` dissolves into `RowLead`)    |
| G-3        | Task 2-2                                                                                       |
| G-4        | Task 3-1 (`SettingsPane`)                                                                      |
| I-040      | Task 5-1                                                                                       |
| I-059      | Task 10-1                                                                                      |
| I-069      | Task 9-1                                                                                       |
| I-070      | Task 2-3                                                                                       |

#### Concepts

**ADDED**

| Concept | Description | Location |
| ------- | ----------- | -------- |
| `ViewPane` • component | Dispatches a view-pane id to its pane for both the toolbar's Settings and the views dropdown's editor; renamed from `ViewLeaf`. | `Core/Views/Settings/ViewPane.tsx` |
| `ViewEditor` • component | Draws the views dropdown's per-view editor over the shared pane table. | `Core/Views/Settings/ViewFrame.tsx` |
| `ViewListRow` • component | Draws one row of a view list, shared by the toolbar dropdown and the tile's dropdown. | `Core/Views/Settings/ViewFrame.tsx` |
| `DisclosureChevron` • component | Draws a fold arrow that reads open or closed from its props; renamed from `DropOutline`. | `UIX/Elements/DisclosureChevron.tsx` |
| `RowLead` • component | Draws a row's lead cell, its click-swallowing gutter, the rail slot's content, and the indent as left padding. | `UIX/Table/RowLead.tsx` |
| `MenuBase` • component | Renders the shared pane shell; renamed from `PickerMenu`. | `UIX/Menus/MenuBase.tsx` |
| `RenamableName` • component | Renders the one renaming piece that tabs, page windows, the detail header, and both view renderers share. | `Core/Interface/RenamableTitle.tsx` |
| `HideableRow` • component | Draws a list row with its hide eye for the panes' hideable option rows, in place of three hand-built eye wirings. | `Core/Views/Settings/OptionOrderList.tsx` |
| `useDateForms` • hook | Reads the Nexus's date form and clock from the store beside `useSetting`; renamed from `useNexusForms`. | `Core/Session/store.ts` |
| `useBandSource` • hook | Produces the band faces a view draws; renamed from `useBandHeads`. | `Core/Views/Bands/useBandSource.ts` |
| `presentedKind(type)` • function | Returns the record for the kind a view draws as, answering Table's record for a kind that has none. | `Core/Views/Host/viewKinds.ts` |
| `switchRow` • function | Builds a switch row beside `pickerRow`, over the private `lookRow`. | `UIX/Menus/MenuIndex.tsx` |
| `shownLabel(shown, noun)` • function | Words a show-or-hide toggle for any noun, in place of five fixed-noun helpers (`iconLabel`, `titleLabel`, `viewsLabel`, `footerLabel`, `citationsLabel`). | `Core/Actions/toggleLabels.ts` |
| `runViewRowAction` • function | Pops a view row's menu and runs the pick, so neither surface builds the row menu. | `Core/Actions/viewMenus.ts` |
| `canDeleteView(count)` • function | States the keep-the-last-view rule once. | `Core/Views/views.ts` |
| `insertDuplicate` • function | Places a view's copy and names it, for both the folder's list and the tile's list. | `Core/Views/views.ts` |
| `embeddedViews(els, entryId)` • function | Returns the coerced view list a tile draws and a duplicate names from. | `Core/Tiles/viewTileEntry.ts` |
| `editViews(op)` • function | Passes every direct tile view-list edit through the one lock gate. | `Core/Tiles/Surfaces/ViewTile.tsx` |
| `placedBeside` • function | Places an entity beside a sibling in a folder's order; renamed from `placeAt`. | `Core/Nexus/order.ts` |
| `unfolded(rows, depthOf, isOpen)` • function | Filters rows to those a folded list shows; serves the group heads and the link autocomplete's heading list. | `UIX/Menus/DisclosureRow.tsx` |
| `orderSetTree` • function | Orders a Set tree by a view's custom order before bands build, over any `{ id, sets? }` tree. | `Core/Views/Pipeline/group.ts` |
| `bucketBands` • function | Builds bands from rows for the top level and for each Set under a sub-grouping. | `Core/Views/Pipeline/group.ts` |
| `pruneGroups` • function | Trims hidden, empty, and filter-emptied groups in one bottom-up walk. | `Core/Views/Pipeline/group.ts` |
| `ghostRootProps` • function | Returns the root props that mark a surface as hosting a hover ghost. | `UIX/Interactions/ghostCreate.ts` |
| `beginNaming(id, flight?)` • function | Opens a row's name field in the host, holding the in-flight create beside it. | `Core/Views/Host/useViewHost.ts` |
| `endNaming()` • function | Closes the host's open name field. | `Core/Views/Host/useViewHost.ts` |
| `overrideValues(pageId, picked, write)` • function | Lays a value override for a page, replacing `setValueOverride` on the host. | `Core/Views/Host/useViewHost.ts` |
| `memberIndent(kind, depth)` • function | Answers a member row's indent for its band kind and depth, read by the Table's rows and the drop line alike. | `Core/Views/Bands/bandModel.ts` |
| `StableHandlers` • type | Names the handlers record a stable API wraps, exported where it's defined; renamed from the interactions' own copy. | `UIX/Utilities/stableApi.ts` |
| `ROOT_ROW_LOOK` • constant | The one row look a settings pane's root rows share, read by the kind's switches and the Cards rows. | `UIX/Menus/frames.css.ts` |
| `naming` • value | Holds the row being named, whether it is a create, and whether its create is still landing, or `null`; the renderers read it for the open field. | `Core/Views/Host/useViewHost.ts` |
| `disclosure` • value | Answers a view's `isOpen` and `toggle` for its bands, replacing the host's `collapsed` set. | `Core/Views/Host/useViewHost.ts` |
| `ViewKindRecord` • type | Declares the record of a built view kind: renderer, `nests`, and its Layout leaf, switches, and rows. | `Core/Views/Host/viewKinds.ts` |
| `ViewPaneId` • type | Names the view panes; renamed from `ViewLeafId`. | `Core/Views/Settings/ViewPane.tsx` |
| `SettingsPane` • type | Describes one pane of the pane table. | `Core/Views/Settings/ViewPane.tsx` |
| `PaneProps` • type | Declares the props each pane receives. | `Core/Views/Settings/ViewPane.tsx` |
| `ViewWriter` • type | Declares a bound view save, `(patch) => Promise<Result<{ id: string }>>`, the one spelling the kind record's rows and every pane take. | `Core/Views/views.ts` |
| `PaneId` • type | Names the Settings root's panes: Properties plus every view pane; renamed from `FrameId`. | `Core/Views/Settings/SettingsFrame.tsx` |
| `NameRename` • type | Declares `{ path, editing, onBegin?, onEnd }`, the shape any renamable name takes. | `Core/Interface/RenamableTitle.tsx` |
| `ChevronKind` • type | Names the fold arrow's kinds; renamed from `DropOutlineKind`. | `UIX/Elements/DisclosureChevron.tsx` |
| `Disclosure` • type | Declares `{ isOpen, toggle }`, the two questions every folding list asks. | `UIX/Menus/DisclosureRow.tsx` |
| `PaneDirection` • type | Names the directions a pane opens in; renamed from `PickerDirection`. | `UIX/Menus/panePlacement.ts` |
| `DateForms` • type | Declares the Nexus's date form and clock; renamed from `NexusForms`. | `Core/Properties/columnStyles.ts` |
| `ItemApi` • type | Declares the one bundle of item handlers both renderers receive. | `Core/Views/Host/useViewInteractions.tsx` |
| `ViewRowRun` • type | Declares the actions a surface hands `runViewRowAction`: rename, save, duplicate, remove, and titles. | `Core/Actions/viewMenus.ts` |
| `EntryOp` • type | Declares a tile payload edit, taken by `MutateEntry` and `patchTileEntry`. | `Core/Tiles/tiles.ts` |
| `OperatorChoice.icon` • field | Carries a glyph on a filter operator; set on the two Checkbox operators. | `Core/Views/valueKinds.ts` |
| `immovable` • field | States that a row stays put; accepted by `useLineRow` and `LineRow`, and set on `BandView` for a search. | `UIX/Interactions/engine.tsx`, `Core/Views/Bands/GroupBand.tsx` |
| `BUILT_KINDS` • constant | Maps each built view type to its record. | `Core/Views/Host/viewKinds.ts` |
| `VIEW_PANES` • constant | Lists the view panes both settings doors open. | `Core/Views/Settings/ViewPane.tsx` |
| `NONE_OPTION` • constant | Names the no-selection option the pickers share, in place of the `'_none'` and `'none'` sentinels. | `Core/Views/paneTargets.ts` |
| `setViewButton` • mutate op | Writes `view_button` onto a container's sidecar beside `setDisclosureLock`, in place of the `container:configure` channel. | `Core/Nexus/mutateRequest.ts` |
| `RenameHost` `'band'` • value | Names the rename host for a Set band; renamed from `'detail'`. | `Core/Session/editSlice.ts` |
| `.table-shell` • CSS class | Names the outer frame the Table and the Archive wear; renamed from `.table-view`. | `Core/Views/Table/table-view.css`, `Core/Views/Table/TableView.tsx`, `Core/Archive/ArchiveView.tsx` |
| `data-chevron` • attribute | Marks a fold arrow; renamed from `data-drop-outline`. | `UIX/Elements/DisclosureChevron.tsx` |
| `data-chevron-spacer` • attribute | Marks the blank slot where an arrow would sit; renamed from `data-drop-outline-spacer`. | `UIX/Elements/disclosure.css.ts` |
| `data-line-immovable` • attribute | Marks a row that stays put, which refuses a keyboard lift and carries no drag description. | `UIX/Interactions/engine.tsx` |
| `data-view-lead` • attribute | Marks the element that leads a view, `head` for a heading, `band` for a band row, `row` for the first card of a wrapping row, which a tile anchors its reveal to. | `Core/Views/Table/TableView.tsx`, `Core/Views/Cards/CardsView.tsx`, `Core/Views/Bands/GroupBand.tsx` |
| `data-view-embed` • attribute | Marks a view root drawn inside a tile, which scoped zoom and padding rules read. | `Core/Views/Host/ViewHost.tsx` |
| `--chevron-beat` • CSS variable | Sets the fold arrow's transition duration; renamed from `--drop-outline-beat`. | `UIX/Elements/disclosure.css.ts` |
| `--tile-inset-l` / `--tile-inset-r` • CSS variables | Carry a tile heading's side padding for Cards' padding to read. | `Core/Tiles/Surfaces/view-tile.css.ts` |
| `chevron` / `chevronOpen` / `chevronSpacer` • CSS classes | Style the fold arrow, its open rotation, and its spacer; renamed from `dropOutline`, `dropOutlineOpen`, and `dropOutlineSpacer`. | `UIX/Elements/disclosure.css.ts` |
| `navigationTree` • CSS class | Marks a folder tree that Hide Disclosure Chevrons reaches: the sidebar and the Grouping folder list; the Filter's Location tree keeps its chevrons, since a row click there picks. | `UIX/Elements/disclosure.css.ts` |
| `headLead` • CSS class | Styles the tile's heading fill, divider, and first-segment alignment on `[data-view-lead="head"]`. | `Core/Tiles/Surfaces/view-tile.css.ts` |
| `pillToday` • CSS class | Draws the calendar's today ring; renamed from `optionRing`. | `UIX/Pickers/calendar-picker.css.ts` |

**REMOVED**

| Concept | Description | Location |
| ------- | ----------- | -------- |
| `container:configure` • bridge channel | Wrote a container's `view_button`; `setViewButton` replaces it. | `Core/Contract/bridge.ts` |
| `RenamablePageName` • component | Edited a page's name in the Table, Cards, and tabs; `RenamableName` replaces it. | `Core/Interface/RenamableTitle.tsx` |
| `PageNameRename` • component | Renamed page names for tabs and windows; `RenamableName` replaces it. | `Core/Interface/RenamableTitle.tsx` |
| `DateHeading` • component | Drew the bundle table's date heading by hand; `BundleTable` draws its own heading. | `Core/Bundles/BundleTable.tsx` |
| `usePillPresence` • hook | Held the tile pills' entrance state; `useEntrance` replaces it. | `Core/Tiles/Surfaces/ViewTile.tsx` |
| `VIEW_RENDERERS` • constant | Mapped view types to renderers with a Table fallback; `BUILT_KINDS` replaces it. | `Core/Views/Host/ViewHost.tsx` |
| `TABLE_LAYOUT` / `LAYOUT_OPTIONS` • constants | Declared the Layout pane's switches by kind; the kind records hold them. | `Core/Views/Settings/LayoutFrame.tsx` |
| `LayoutOptions` • type | Declared the per-kind Layout options; `ViewKindRecord` holds them. | `Core/Views/Settings/LayoutFrame.tsx` |
| `CARD_ROW_LOOK` • constant | Held Cards' own row look; `ROOT_ROW_LOOK` in the frames sheet serves every kind's rows. | `Core/Views/Settings/LayoutFrame.tsx` |
| `ViewKind.nests` • field | Stated folder nesting per kind; `ViewKindRecord.nests` states it. | `Core/Views/views.ts` |
| `VIEW_ROWS` / `ViewRowId` / `ViewRow` (LayoutFrame) • constant and types | Listed and typed the Layout pane's view rows; `VIEW_PANES` and `ViewPaneId` replace them. | `Core/Views/Settings/LayoutFrame.tsx` |
| `door` / `leafFor` / `toView` / `ViewSwitches` / `separated` • functions and props | Routed Layout to its leaf; `ViewPane` routes both doors. | `Core/Views/Settings/LayoutFrame.tsx` |
| `plainRoot` / `scopedRoot` / `selectionNode` • functions | Built the Settings root twice, for a tile and for the main window; one root builds it. | `Core/Views/Settings/SettingsFrame.tsx` |
| `PaneTarget` • type | Typed a pane's target option; every target is a `PickerOption<string>`. | `Core/Views/paneTargets.ts` |
| `targetOption` / `targetOptions` • functions | Built the Filter pane's hand-spelled property options; `filterTargets` replaces them. | `Core/Views/paneTargets.ts` |
| `PickerRowLook.solid` • field | Set Cards' solid picker look, its one user. | `UIX/Menus/MenuIndex.tsx` |
| `CheckboxGlyph` (Filter) • function | Drew the checkbox glyph in the Filter; `OperatorChoice.icon` carries the glyph. | `Core/Views/Settings/FilterFrame.tsx` |
| `RuleField` `iconColor` / `lead` • props | Carried a glyph color no caller passed and a lead the list menus replace. | `Core/Views/Settings/FilterFrame.tsx` |
| `reorderColumns` / `reorderColumn` • functions | Reordered table columns through a separate rule; a drop persists through `placeInShown`. | `Core/Views/Table/useColumns.ts` |
| `resizeColumn` / `abortResize` / `endResize` / `commitResize` • functions | Held the resize gesture in pieces; `startResize` on the one gesture runner holds it. | `Core/Views/Table/useColumns.ts` |
| `DragShift` • type | Typed the column drag's shift; `ColumnDrag` carries the painted shift alone. | `Core/Views/Table/useColumns.ts` |
| `RowCellApi` / `CardApi` • types | Typed each renderer's repackaged item handlers; `ItemApi` replaces both. | `Core/Views/Table/TableView.tsx` |
| `dropHiddenGroups` / `pruneEmptyBuckets` / `pruneEmptyGroups` • functions | Pruned bands in three passes; `pruneGroups` replaces them. | `Core/Views/Pipeline/group.ts` |
| `orderGroups` • function | Reordered Sets after bands built; `orderSetTree` orders them first. | `Core/Views/Pipeline/bandOrder.ts` |
| `property` • function | Built a property plan's buckets by its own block; `bucketBands` replaces it. | `Core/Views/Pipeline/group.ts` |
| `BandItem` / `BandList` / `bucketValue` • types and function | Typed and switched the router's own band shapes; `SetRef`, `BucketRef`, `BandRef`, and `bucketValueAt` in `bandModel.ts` replace them. | `Core/Views/Bands/bandRouter.ts` |
| `DropOutline` / `DropOutlineKind` • component and type | Drew and typed the fold arrow inside `UIX/Menus`; `DisclosureChevron` and `ChevronKind` replace them. | `UIX/Menus/DisclosureRow.tsx` |
| `collapsed` / `toggleCollapse` / `NO_COLLAPSE` / `shownCollapsed` • values and functions | Held the host's own collapse state for bands; `disclosure` replaces them. | `Core/Views/Host/useViewHost.ts` |
| `openHeadingRows` • function | Filtered the autocomplete's heading rows; `unfolded` replaces it. | `Core/MarkdownPM/Autocomplete/autocomplete.ts` |
| `seatHost` • object | Wired a renderer's value editor to its ghost; `useViewInteractions` owns the seat. | `Core/Views/Host/useViewHost.ts` |
| `standingFlight` • ref | Held the standing ghost's create in flight; one `held` create covers it. | `Core/Views/Host/useViewInteractions.tsx` |
| `tree` / `mutate` / `openTarget` / `schema` / `effectiveValues` / `setValueOverride` • host return members | Handed renderers values none of them read, or that they read from the session; `overrideValues` replaces `setValueOverride`. | `Core/Views/Host/useViewHost.ts` |
| `openPage` / `openSet` / `pageMenu` • interactions return members | Repackaged item handlers under per-renderer names; `ItemApi` carries them. | `Core/Views/Host/useViewInteractions.tsx` |
| `persistConfig` / `writeConfig` • functions | Wrote the tile's config through its own closures; `viewTileEntry.ts` ops replace them. | `Core/Tiles/Surfaces/ViewTile.tsx` |
| `saveViewIn` / `resolveViewWrite` • functions | Layered a view's save across three files; `useSaveView` replaces them. | `Core/Views/viewWrite.ts` |
| `ContainerConfigPatch` / `setContainerConfig` • type and function | Typed and wrote a container's view button. | `Core/Views/containerConfig.ts` |
| `RAIL_CENTER_X` • constant | Fixed the rail's center against a `--disclosure-rail-x` nothing set. | `UIX/Menus/listed-outline.css.ts` |
| `.trash-head` / `.trash-head-name` / `.trash-head-date` / `.trash-head-glyph` / `.trash-head-label` • CSS classes | Styled the Trash's hand-built heading; `BundleTable` draws `.table-head` for it. | `Core/Trash/trash-frame.css` |
| `.archive-date` • CSS class | Centered the Archive's date heading, which `BundleTable`'s own heading left-aligns. | `Core/Archive/archive-view.css` |
| `.group-band-drop-outline` • CSS class | Styled the band head's arrow button; a `DisclosureChevron` in a `row-chevron` span replaces it. | `Core/Views/Bands/group-band.css` |
| `--row-indent` • CSS variable | Aliased the row indent; `--disclosure-indent` through `rowIndent` serves every row. | `UIX/Table/table-tokens.css` |
| `--disclosure-rail-x` • CSS variable | A fallback that nothing set. | `UIX/Menus/listed-outline.css.ts` |
| `--sidebar-hidechevron-pad` / `--chevron-gutter` • CSS variables | Padded the sidebar's rows when chevrons hide; `navigationTree` hides chevrons for both trees. | `Core/Interface/Sidebar/sidebar.css` |
| `.hide-chevrons .row` rules • CSS rules | Collapsed the sidebar's chevron gutter alone; one rule on `navigationTree` replaces them. | `Core/Interface/Sidebar/sidebar.css` |
| `'detail'` • RenameHost value | Named the Set band's rename host; `'band'` replaces it. | `Core/Session/editSlice.ts` |

#### Constraints

- **Mandate (Nathan's, verbatim):**
  - **Approach:**
    - Any approaches being considered here must first assess what's true *now* that would be able to be removed, deleted, changed, consolidated, or replaced. We're not going to design based on what's currently there and simply adjust course, we're ensuring totality-first application, removal-first scoping, and residue-eliminating frameworks that provide a clean slate rather than building changes on top of what's ultimately going to be replaced.
    - We're approaching this through consolidation-first properties, ensuring the codebase ends up more understandable, less complex, more efficient in what it does, less conflicting in defining that, and an overall cleaner foundation to work within.
    - We shouldn't adding anything new unless there's evidence that it's required. We'd approach this through the perspective of ending up with cumulatively "less stuff" in the codebase overall — less ways to do similar things, less complexity, fewer paths to go through, less tech debt waiting to surface, less things to maintain, and fewer headaches when approaching future work entirely — while the line-count *may* end up positive. Net-negative lines are the north star, but any net-positive gain *must* have its rationale for that outcome be genuinely backed through this framework and our principles.
    - Anything within our surface area should be left reading as always-intentional, without any odd-ones-out designs, and be reflective across the broader codebases' resulting shape — not just maintaining remnants or adherence to what's true *now* that's ultimately going to change. The approach should reflect the outcome and shouldn't be bound to constraints that were only relevant before.
    - Ensure we're looking *outward* for cross-file opportunities and shared design, avoiding hand-rolling or duplicating what's already there or can be adjusted accordingly. Pommora is an established codebase and we're not starting from scratch.
    - The complex data-level mechanics of the codebase are what least reflect *Nathan's* intentions and are primarily reflective of what's determined appropriate via past session agents. Treat it with care and respect, but don't assume it's beyond changing within reason, where simply presenting the approach to Nathan may be all that's required to genuinely change the codebase for the betterment of everything within it and future iterations.
  - **Principles:**
    - **Less to Carry:** No more functions, helpers, wrappers, types, layers, and call sites than necessary, and no logic stated twice. New code earns its place by removing more than it adds, fixing incorrect behavior, or delivering required behavior in its minimal form.
    - **Less to Understand:** A reader finds what exists, where it lives, what owns it, and what calls it with less searching and tracing than before, whether a developer reading code or Nathan reading file names and headers. A blind-eye review of the surface areas impacted by this implementation should find less confusion, less conflict about intent, and an unambiguously more approachable, maintainable ecosystem to iterate on.
    - **Clearer Boundaries:** Each responsibility has one owner, and the next change of a kind has one obvious place to go, with no choice between layers, helpers, or modules — nothing that exists somewhere where it shouldn't; nothing implemented where something else already does it or adjusting it accordingly would be the more appropriate approach; nothing that increases the risk of misassumption when working here in the future.
    - **Reads as Designed:** Nothing temporary, transitional, kept for compatibility, unreachable, needlessly indirect, or left over from the work remains. Nothing designed around codebase shapes that will ultimately be changed for the better.
    - **One Way:** Each thing has one implementation, one pattern, and one source of truth. No part contradicts another. Exceptions carry their reason where a reader meets them, in code or feature documentation.
    - **Real Purpose:** Anything added to the codebase should have its purpose clearly stated from the perspective of its value in enhancing what's already there — complexity, duplications, divergences, multiple ways to do the same thing — and anything "new" added should be assessed using that. Line-count increases shouldn't translate into maintenance cost or complexity.
    - Anything introduced should have independent justification behind its existence that isn't simply self-induced requirements.
    - Anything changed or implemented should be reflected across the board — nothing that's done this way here, while something else works differently elsewhere, unless that's *genuinely* correct.
    - Zero data-level spaghetti, complexity, or additional 'stuff' should be added without reason. Rewiring things to become more understandable, more efficient, more appropriate, and more effective is preferred when the alternative is just adding more to something that's inherently unfit to suit the long-term mandate of what's actually being offered.
- **The Log's Constraints (verbatim from *Decisions & Intention · §Constraints*):** removal comes first: nothing is added unless its absence would leave a real gap. Nothing here makes decisions for, or materially affects, future cross-device sync work. Nothing here is feature-level; the work does what's necessary to enable future view kinds, without building them. Nathan's *Approach* and *Principles* govern every phase and task, and every agent brief on this topic carries both sections in full. Every placement of a file within the codebase comes to Nathan for approval. Documentation on this work's surface that's false, whether this work or earlier work made it so, is rewritten as user-facing summary in fewer words. Any PickerMenu-related cleanup found joins this line of work. A neutral before-and-after assessment given zero context should prefer the after state, without being told what to look for.
- **Plan Rules:** a task's AFTER is its patch in `Scouts/Planning/Phases/`, as if inlined, with any difference the task names; this plan stands wherever it and a report differ. Every patch was built against `cae07c129` and replays in order; if the head has moved, `git apply --3way` lands it, and a conflict resolves toward the patch's intent and is recorded under *§Deviations*. A checkpoint's fold that changes a line a later patch touches lands the later patch the same way. A test that changes asserts the behavior a decision names rather than being bent to pass. A pin *Scouts/Planning/Phases/Pins* names ran red at planning, and its executor runs that revert again before the task commits. An obvious fold that would be answered "fix it here", with no architectural risk or domino effect, is taken and recorded under *§Deviations*; anything larger is recorded there for the morning. Persisted names (A-4) stay: `hide_page_icons`, `collapsed_groups`, `manual_order`, `group_order`, `active_view`, `view_button`, and every other on-disk key.
- **Briefs:** every agent brief on this plan (executors, checkpoint reviewers, the final waves, the neutral gate, and every compaction continuation) carries the Approach and Principles above in full. Every agent but the neutral gate reads *§Constraints* whole from this file before anything else. The neutral gate's brief carries the Approach, the Principles, and its intention, and nothing else from this plan. Every dispatch states its model and effort.
- **Rulings (Not Re-Raised):** every entry in *Decisions & Intention* and its *§Rejections*, *Investigation · §Calls for Nathan* as the log answered them, and *Plan Reviews*' Not Taken lists aren't re-raised, and a reviewer's disagreement with one is noted unless it names a mechanism they missed. Nathan's rulings at the morning review (11-08-2026) stand with them: the Filter's Location tree keeps its chevrons whatever Hide Disclosure Chevrons says, so C-4 reaches the sidebar and the Grouping pane's folder list and C-5's shared chevron rule is set aside; and a Cards view's editor Layout leaf stays the kind's switches alone, as it draws today, so F-1 holds whole and the kind record declares each kind's leaf.
- **Placements (pending Nathan's approval; every new, moved, renamed, or deleted file is one of these, and no other is created):**

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
  | `UIX/Pickers/FieldPicker.test.tsx` | New (split) | Two tests of `FieldPicker` leave the shell's test file, so `UIX/Menus` imports nothing from `UIX/Pickers` (Task 9-1) |
  | `Core/Nexus/schemas.containerConfig.test.ts` | Renamed `schemas.viewButton.test.ts` | Named for the schema it tests once `containerConfig.ts` is gone (Task 2-1) |
  | `Core/Views/Table/bandCommits.test.tsx` | Deleted | Its band drops move to `Core/Views/Bands/bandDrops.test.tsx`, its column-width cases to `useColumns.test.ts`, and its collapse-persist case to `useViewHost.test.tsx` (Task 6-2) |
  | `Core/Views/manualOrderDrops.test.tsx` | Moved to `Core/Views/Host/rowDrops.test.tsx` | Tests the host's routing (Task 5-2) |

  A test file follows the code it tests: it moves, renames, or deletes with that code and isn't listed here; the test moves and splits listed are placements of their own. Ratification commits the topic's planning folder, `.claude/Planning/Views Cleanup/`, whole, so the run starts from a tree with nothing of its own untracked.
- **Tests:** a test is added only where what it pins is clearly defined and genuinely needs to exist: the pins *Scouts/Planning/Phases/Pins* names, and one Table create-to-rename test before Task 5-1 changes that path. A saved patch lands with the tests it carries, reviewers don't report an untested line as a finding or run mutation sweeps, and a fold adds a test only for a real defect a user could hit. Test files move with their code where *§Placements* says so; the Investigation's wider test consolidation (*§10*) is not this plan's.
- **Comments:** the production comment count, `git grep -c -E '^[[:space:]]*(//|/\*\*|/\*)' -- 'Core' 'Desktop' 'UIX' 'Sync' ':!*.test.*'` summed, reads 3,517 at `cae07c129` and doesn't exceed it at the end, and no comment grows to carry what another held. It's counted at every phase's VERIFY against the Comment Ledger. *Investigation · §Becomes False · Comments* is the removal list; E-4's reason in `GroupFrame.tsx` and the pane tree's always-nesting reason are the two arrivals the log asks for, and each new file's header line is an arrival the ledger's row names.
- **Documentation:** documents change once, in Phase 11, so nothing they describe is still moving. Comments, tests, and drives change with their code. *§Reconciliation* is the list.
- **Sync:** `git diff --stat <BASELINE>..HEAD -- Core/Sync Sync` prints nothing at the end. Task 2-1 is the one place this work touches a channel: `container:configure` leaves `Contract/bridge.ts` and its one key rides the existing `mutate` channel under the same file key and lock, so nothing on the wire changes shape.
- **Gates:** "Run the gates" means `npm run typecheck`, `npm run test`, and `npm run lint` from the repo root, lint clean. A file written by a shell command skips Biome's hook, so `npm run format` follows any scripted edit. A VERIFY grep that uses `\b` runs under `git grep -P`. `npm run build`, confirming `✓ built in`, runs from a clean state at the final head. Known load-flaky files rerun by file before a failure is read as real. A worktree in the session scratchpad needs the Studio `.claude` linked two levels above the worktree's root, where `package.json`'s `../../.claude` resolves. "The ledger checks" in a phase's last VERIFY means three reads: the test count against the Net Ledger's row, the comment count (*§Constraints · Comments*) against the Comment Ledger's row, and `view-delta`'s Actionable cell (*§Constraints · The Number*) against the Net Ledger's Estimate.
- **Commits:** each task commits once its VERIFY passes, through `git commit --only -m "…" -- <paths>` after `git add` for new or renamed files. Messages are past tense, one to three sentences, and end with `Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>`. The post-commit hook pushes `active`. A Bash command carrying `git` can't contain a personal name anywhere, paths and heredocs included. The plan file commits with `--only` whenever its BASELINE, ledgers, ticks, or *§Deviations* change.
- **The Number:** net lines are measured from `cae07c129` across the whole work. Every phase's VERIFY runs `python3 ~/"The Studio/.claude/scripts/view-delta/view-delta.py" <BASELINE> --exclude .claude --save <scratch file>`, a working-tree diff, since VERIFY runs before the commit, and records the **Actionable** cell in the Net Ledger's Measured, cumulative. Without `--save` the script opens a viewer, so it's always passed. A phase whose own delta lands above its estimate is reported by notification before the next opens, with what the increase buys. The north star is 300 or more production lines removed.
- **Live Drives:** the Archive Drive (`.claude/scripts/Archive Drive/live-drive.mjs`, port 9393, every group, about six minutes) runs at Phase 4's checkpoint and the final head, since Task 4-1 changes the chrome it asserts, and its selectors change in Task 4-3's patch. The Properties Drive (`port 9403`) runs its E and F groups at Phase 3's checkpoint and the final head, since Task 3-4 re-points MP-E-3. Each runs from a worktree built by `.claude/scripts/editor-parity/worktree.sh <sha> "$WT"` with `POMMORA_DRIVE_REPO="$WT"`, one at a time, never from the main checkout, and never stopping an instance the run didn't start. The Views Drive (`.claude/scripts/Views Drive/`, port 9423) holds the views' interaction matrix in groups by plan phase, each phase's behavior changes crossed with every surface, input, and setting that reaches them beside the interactions its refactor rewired. It runs whole at every checkpoint from Phase 6 on and at the final head, the same way, after replaying the baseline and each closed phase's head once at Phase 6's checkpoint; a phase's group lands at its own checkpoint. A failing case is fixed in the code, or in the drive where the case misreads a decision, never bent to pass.
- **Execution:** the plan runs end to end through `c/plan-execution`, unattended. Each task goes to an `execution-agent` (`opus-medium`) informed of *§Context* and *§Overview*, which reports insights, concerns, and suggestions rather than diverging, and the orchestrator checks its result against the task's AFTER and VERIFY. Every review checkpoint dispatches two read-only agents at `opus-high`, one under `code-simplification` and one under `adversarial-review`, each weighing the phase against these constraints and its place in the plan, reading outward rather than in isolation, with no implementation running meanwhile; the orchestrator reconciles both reports and weighs the landed work against the **Mandate** before the next phase opens. An in-flight call is weighed against those and the plan's objectives, recorded under *§Deviations* where it changes an outcome, and disclosed in the final report. Each compaction checkpoint in *§Process Overview* runs `c/pre-compaction` and continues; on the continuation the orchestrator rereads *§Constraints* and *§Process Overview* from this file rather than from the handoff's summary before the next phase opens.
- **Notifications:** a PushNotification at the run's start, at each phase's close with the running net, at each wave's fold, when anything goes red that stops progress along with what was done about it, and when the report is ready.
- **Neutral Gate:** the work ends with a `fable-high` neutral reviewer given only the BASELINE head, HEAD, and this intention, with no plan, log, or document: *"Pommora's saved views were drawn by two renderers that each wired themselves to the host by hand, while a view kind was defined across three tables and its Table fallback written twice; the settings panes were reached through two doors and three dispatchers; the Trash and Archive table built its heading by hand beside the Table's; the page record straddled the engine and window halves; and renaming, disclosure, indentation, and the view list's rows were each implemented more than once. This work gives each built kind one record and one lookup, routes both settings doors through one pane table, gives the host a return of only what renderers read with one rename shape and one creation path, dissolves the root's misfiled files to their owners, gives the pipeline one prune walk and one bucket builder, gives disclosure one shape and rows one indent step, shares the view list's row between the dropdown and tiles, names the menu shell as a shell, and gives each row one lock, with each rule stated once, built from what the codebase already had, and nothing left over."* It answers, without hedging, whether a zero-context reader given the before and the after prefers the after, what it would correct, and the strengths to keep. Every phase is written so that review passes.
- **Behavior Changes:** every visible change this plan makes, numbered, with its decision:
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
- **Out of Scope Everywhere:** building any kind; the Table's band walk as a shared walker (*Investigation · §Approaches 9*); `gridZone` (2.10); a `SettingsPane` shell wrapper (1.14); `ROLES` into `views.ts` (5.10); GroupFrame's fabricated band tree (6.8); merging the sidebar's branch row into `DisclosureRow` (7.6); one store for what's open; the Investigation's test-harness consolidation; the Wrapped Table Cells brainstorm (A-6).

#### Process Overview

- [x] `[Stop: ratified; placements approved; no code changes before this]`
- [ ] **Phase 1** — The Kind Record
  - [x] Task 1-1 · One record per built kind
  - [x] Task 1-2 · The host reads the active view once
  - [x] Review Checkpoint
- [ ] **Phase 2** — The Views Root and the Live View
  - [x] Task 2-1 · The root's dissolutions
  - [x] Task 2-2 · The page record's home
  - [x] Task 2-3 · The live view
  - [x] Review Checkpoint
- [ ] **Phase 3** — One Pane Route
  - [x] Task 3-1 · One pane route
  - [x] Task 3-2 · The Settings root and the toolbar's view button
  - [x] Task 3-3 · The rows and their words
  - [x] Task 3-4 · The Filter's lists go through the menu door
  - [x] Review Checkpoint
  - [x] Compaction Checkpoint
- [ ] **Phase 4** — The Table and the Second Table
  - [x] Task 4-1 · The Bundle table draws its heading
  - [x] Task 4-2 · One column gesture
  - [x] Task 4-3 · One shell class and one home per style
  - [x] Review Checkpoint
- [ ] **Phase 5** — The Host and Its Renderers
  - [x] Task 5-1 · One rename shape and the view's naming state
  - [x] Task 5-2 · The seat and the ghost inside the interactions
  - [x] Task 5-3 · One item API and the host's return
  - [x] Review Checkpoint
  - [x] Compaction Checkpoint
- [ ] **Phase 6** — The Pipeline and the Bands
  - [x] Task 6-1 · One prune, one bucket builder, one ordered Set tree
  - [x] Task 6-2 · The band layer owns its model
  - [x] Review Checkpoint
- [ ] **Phase 7** — Disclosure and Rows
  - [x] Task 7-1 · One disclosure shape
  - [x] Task 7-2 · The band head's one Tab stop
  - [x] Task 7-3 · One indent step and one lead cell
  - [x] Task 7-4 · The Navigation Trees
  - [x] Review Checkpoint
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
  - [ ] Compaction Checkpoint
- [ ] *§Final Verification* over `<BASELINE>..HEAD`
- [ ] `[Stop: the final report, per §Final Verification]`

---

### Phase 1 — The Kind Record

**GOAL:** Each built kind should be one record beside its renderer, and one lookup should answer which kind is drawn. It goes first because the pane route reads the record, and because it's the phase that decides what adding a kind takes.

#### Task 1-1

A built kind should be one window-side record: its renderer, its `nests`, and its layout switches and rows, declared beside the renderer. `VIEW_KINDS` keeps the label and icon the engine reads, and `nests` leaves it, since every `nests` read is window-side; `ViewWriter`, `(patch: ViewPatch) => Promise<Result<{ id: string }>>`, joins `views.ts` beside `ViewPatch` as the one spelling of a bound view save the record's rows and, from Task 3-1, every pane take. `presentedKind(type)` in `Host/viewKinds.ts` answers the seat, the settings, and every `nests` read, Table for an unbuilt kind, written once; `VIEW_RENDERERS`, `LAYOUT_OPTIONS`, `TABLE_LAYOUT`, `cardRows`, `leaf`, and both `?? Table` fallbacks go. `GroupFrame.tsx:142` and `SortFrame.tsx:89` read the lookup; the pane tree's `nests: true` at `GroupFrame.tsx:472` stays, with its reason stated where it sits, since the pane's tree arranges the folders themselves, so a Set drops into a Set whatever the view's kind draws. The type grid stays as it is: a tile is live when its kind has a record. The editor's Layout leaf keeps today's shape through `kind !== TABLE_KIND` until Task 3-1 makes the leaf a field of the record.

```Core/Views/Host/viewKinds.ts
interface ViewKindRecord {
  Renderer: (p: { host: ViewHostApi }) => React.JSX.Element
  nests: boolean
  layout: { switches: SwitchEntry[]; rows?: (view: SavedView, write: ViewWriter) => MenuRow[] }
}
export const BUILT_KINDS: Partial<Record<ViewType, ViewKindRecord>> = { table: TABLE_KIND, cards: CARDS_KIND }
export const presentedKind = (type: ViewType): ViewKindRecord => BUILT_KINDS[type] ?? TABLE_KIND
```

**AFTER**

`Scouts/Planning/Phases/Phase 1 — The Kind Record.patch`.

**VERIFY**

- [ ] `git grep -n -E "VIEW_RENDERERS|LAYOUT_OPTIONS|TABLE_LAYOUT|cardRows|\?\? TableView" -- Core ':!*.test.*'` prints nothing, and `git grep -n "nests" -- Core/Views/views.ts` prints nothing.
- [ ] Run the gates.

#### Task 1-2

`useViewHost(source)` should derive `nests` from the presented kind, so `ViewHost` reads the active view once and no caller passes a flag the host can read itself.

**AFTER**

`Scouts/Planning/Phases/Phase 1b — The Host Reads Once.patch`.

**VERIFY**

- [ ] `git grep -n "useViewHost(" -- Core ':!*.test.*'` shows one argument at every call.
- [ ] Run the gates; the ledger checks read their rows.

#### Review Checkpoint

- [x] Adding a kind is one record and one import; both reviewers' findings folded or recorded.

---

### Phase 2 — The Views Root and the Live View

**GOAL:** The Views root should hold the views' own model and nothing filed there for another owner, the page record should stop straddling the engine boundary, and the view write should be one act in one file. It comes second because Phase 3's Filter reads `PickerOption` targets and Phase 4's column persistence reads the merged columns file.

#### Task 2-1

The root's misfiled and duplicated files should dissolve to their owners: `container:configure` becomes the `setViewButton` mutate op written like `setDisclosureLock`, and its file, handler, type, and bridge entry go (5.1); `filterModel.ts`'s operator lists join `valueKinds.ts`, `filterTargets` joins `paneTargets.ts`, and `decodeFilter` joins `FilterFrame.tsx` (5.2); targets are `PickerOption`s, so `PaneTarget` and `targetOption` go and `schemaTargets` drops its unread `def` (5.3); `creationOrder.ts` splits by owner, `tieOrderWith` to `useViewCreation.ts`, `placeAt` as `placedBeside` and `placementSlot` to `Nexus/order.ts`, and `placeNew` to `Actions/createActions.ts` (5.4); `reassign.ts`'s `reassignable` and `groupKeyToValue` join `valueKinds.ts` beside `groupable`, and `reassignTarget` moves into `Host/useViewInteractions.tsx` together with `reassignBySortRun` and the `sortReassign` memo, its only readers (5.5, the host side of 2.6); `visibilityModel.ts` merges into `Pipeline/columns.ts` over one shown-column predicate (5.6); `pickView.ts` joins `views.ts` and `searchKeysOf` joins `Pipeline/search.ts`, the host keeping both memos (5.9); and `decodeGroupConfig`, `decodeSubGroup`, `DEFAULT_VIEW_TYPE`, and `pickedStyle` un-export, their tests going through `savedView.parse` (3.4).

**AFTER**

`Scouts/Planning/Phases/Phase 2a — The Root's Dissolutions.patch`.

**VERIFY**

- [ ] `ls Core/Views/containerConfig.ts Core/Views/filterModel.ts Core/Views/reassign.ts Core/Views/visibilityModel.ts Core/Views/creationOrder.ts Core/Views/Pipeline/pickView.ts` prints only "No such file".
- [ ] `git grep -n "container:configure" -- Core Desktop` prints nothing.
- [ ] Run the gates; `Core/Contract/engineGraph.test.ts` and `Desktop/hostGraph.test.ts` pass.

#### Task 2-2

The page record should stop straddling the halves (G-3, *Investigation · §Approaches 4b*): `PageValues` and `pageValuesOf` move to an engine-safe `pageValues.ts` both halves read, since in `loadValues.ts` the window's two blank-row callers would import the host's readers, so `viewRow.ts` becomes window-side and takes every builder, `pageRowOf`, `spaceRowOf`, `toRow`, `flattenContainer`, and `frontmatterOf`, with `pageRow.ts` deleted; `ResolvedColumn` moves to `Properties/properties.ts` beside `ColumnType`, so the column-style resolvers can read it from the engine side. `styleFor`, `columnStylePatch`, and `columnDefaults` move to `Properties/columnStyles.ts` with `pickedStyle` private and `NexusForms` renamed `DateForms`; `useNexusForms` becomes `useDateForms` in `Session/store.ts` beside `useSetting`, every local and parameter holding its value reading `forms`; `PageReaderWindow.tsx` and `DateTimeValuePicker.tsx` adopt it; `Host/useColumnStyles.ts` is deleted (5.7). Both boundary tests settle the split.

**AFTER**

`Scouts/Planning/Phases/Phase 2b — The Page Record's Home.patch`.

**VERIFY**

- [ ] `npx vitest run Core/Contract/engineGraph.test.ts Desktop/hostGraph.test.ts` passes, and `git grep -n "from '../Views/viewRow'\|from './viewRow'" -- Core/Contract Core/Nexus Desktop` prints nothing.
- [ ] `ls Core/Views/pageRow.ts Core/Views/Host/useColumnStyles.ts` prints only "No such file".
- [ ] Run the gates.

#### Task 2-3

The view write should be one act in `Host/liveView.ts`: the pending record, `useActiveView`, one `useSaveView` with the locked-tile gate inlined, `dropIO`, and `ViewWriteOpts` with the view-state keys, which only window files read. `withChildOrder` and `orderInTree` go to `Nexus/treePatch.ts`, whose header already names them; `ahead`, `usePainted`, `mutateAhead`, and `refusedDrop` go to `Host/paintAhead.ts`; `viewWrite.ts` and `useActiveView.ts` are deleted; `ViewTileScope.tsx` becomes `.ts`; `deleteViewWithUndo.ts` folds into `ViewFrame.tsx` (3.1). I-070 rides: the refusal arm of `dropIO(...).persistAfter` re-places the row at its prior slot on the live order, the way a reorder does (3.3).

**AFTER**

`Scouts/Planning/Phases/Phase 2c — The Live View.patch`.

**VERIFY**

- [ ] `ls Core/Views/viewWrite.ts Core/Views/Host/useActiveView.ts Core/Views/Host/pendingView.ts Core/Views/deleteViewWithUndo.ts` prints only "No such file".
- [ ] The I-070 pin in `Host/liveView.test.tsx` reads red without the refusal arm's re-placement.
- [ ] Run the gates; the ledger checks read their rows.

#### Review Checkpoint

- [x] The engine graph from `Core/Contract/serve.ts` reaches no renderer, and every file at the Views root is the views' own; both reviewers' findings folded or recorded.

---

### Phase 3 — One Pane Route

**GOAL:** Both settings doors should reach the same panes through one table and one dispatcher, the panes' rows should be the kit's rows, and every pane should follow the Native Menus setting alike. It's the largest removal in the plan.

#### Task 3-1

`ViewLeaf.tsx` should become `ViewPane.tsx`: one `VIEW_PANES` table (visibility, layout, group, filter, sort, each with its id, label, and icon) and one dispatcher that hands each pane a bound `save: ViewWriter`, keeping `FilterFrame`'s own wiring. `LayoutFrame` becomes the flat form alone, reading the presented kind's switches and rows; `door`, `leafFor`, `toView`, `ViewSwitches`, `separated`, `VIEW_ROWS`, and the second dispatcher go. The per-view editor becomes `ViewEditor` in `ViewFrame.tsx`, keeping what it shows today (F-1): the ⋮ header, the name and icon header, the type grid at its root, the kind's rows as its footer, and the four rows Layout, Group, Filter, and Sort through the same dispatcher. Its Layout row opens what the kind's record declares as its `layout.leaf`: for Table the Visibility pane titled "Layout" with the kind's switches under the list, for Cards the switches alone under the same title, each what that kind's leaf shows today, so the `kind !== TABLE_KIND` test becomes a field each kind declares. `kindSwitches` draws the switch rows alone, and the two callers that put something above them, the Visibility pane's footer and Settings' Layout, draw the separator. Settings opens Visibility bare and Layout as the grid, the switches, and the kind's rows. The settings descriptor `ViewRow` takes the name `SettingsPane` (G-4), and `SettingsFrame`'s `ENTRIES` is `properties` plus `VIEW_PANES`.

**AFTER**

`Scouts/Planning/Phases/Phase 3a — One Pane Route.patch`.

**VERIFY**

- [ ] `git grep -n -E "door:|door=|ViewLeaf|VIEW_ROWS|leafFor" -- Core ':!*.test.*'` prints nothing, and `git grep -n -P "interface ViewRow\b|ViewRow<" -- Core/Views/Settings` prints nothing, the descriptor reading `SettingsPane`.
- [ ] Run the gates.

#### Task 3-2

`SettingsFrame` should build one root, with the footer the one difference between a tile and the main pane, and look its node up through `findContainerById` rather than its own switch (1.4). `ViewMenu` should read the live view through `useLiveView` so the toolbar's button follows staged edits (1.11), move to `Core/Interface/Toolbar/ViewMenu.tsx` beside the other toolbar menus, and `ViewFrame`'s styles leave `toolbar-menu.css.ts` for `Settings/view-frame.css.ts` (1.12). `viewRowMenu.ts` folds into `Actions/viewMenus.ts`, its two show/hide ternaries going through `toggleLabels.ts`, whose five fixed-noun helpers become one `shownLabel(shown, noun)` beside `lockLabel` (1.13).

**AFTER**

`Scouts/Planning/Phases/Phase 3b — The Settings Root and the Toolbar's View Button.patch`.

**VERIFY**

- [ ] `git grep -n -E "plainRoot|scopedRoot|selectionNode" -- Core/Views` prints nothing, and `ls Core/Actions/viewRowMenu.ts Core/Views/Settings/ViewMenu.tsx` prints only "No such file".
- [ ] Run the gates.

#### Task 3-3

The panes' rows should be the kit's: `switchRow(icon, label, checked, onToggle)` joins `UIX/Menus/MenuIndex.tsx` beside `pickerRow` and `steppedRow`, the five hand-built sites adopt it, and `switchRows.tsx` goes (1.8). Both page-icon switches read "Title Icons" with `file-text`, on meaning shown, over the saved `hide_page_icons` (F-2). `'_none'` and `'none'` become one `NONE_OPTION`, the three spellings of Location reuse the Location target, `paneRows.tsx` folds into `OptionOrderList.tsx`, and `group-frame.css.ts` merges into `option-order.css.ts` (1.10). Grouping's Order rows take `folder` for Sets and `arrow-down-up` for a property (E-5); Cards' three picker rows drop `solid`, and the one `ROOT_ROW_LOOK` in `UIX/Menus/frames.css.ts` serves the kind's switches and rows alike (F-6); the views dropdown's placeholder draws as `FooterIconButton` with `ellipsis` (F-9). The three eye wirings become one hideable row, and the Set rows' dimmed eye keeps its reason where the difference sits: many folders show at once (1.7, E-4).

**AFTER**

`Scouts/Planning/Phases/Phase 3c — The Rows and Their Words.patch`.

**VERIFY**

- [ ] `git grep -n -E "'_none'|Page Icons|Hide Icons|solid: true" -- Core/Views` prints nothing, and `ls Core/Views/Settings/switchRows.tsx Core/Views/Settings/paneRows.tsx Core/Views/Settings/group-frame.css.ts` prints only "No such file".
- [ ] `git grep -n "Title Icons" -- Core/Views` prints the two kind records.
- [ ] Run the gates.

#### Task 3-4

The Filter pane's property and operator lists should pop through the kit's menu door like Sort's and Group's, so they follow Native Menus: `PickerControl.tsx` exports its non-toggle branch as `popOptions(options, current, trigger, solid?)`, which `RuleField` reads over `PickerOption<string>[]` in place of its own spelling (1.6, F-7). The Checkbox operators read "Checked" and "Unchecked" in `valueKinds.ts`, the list and the closed field show the label with a plain `square-check` and `square` glyph, and `CheckboxGlyph`'s colored rows leave the Filter. The Properties Drive's MP-E-3 cases re-point to the native rows.

**AFTER**

`Scouts/Planning/Phases/Phase 3d — The Filter's Lists.patch`.

**VERIFY**

- [ ] `git grep -n -E "Is Checked|Isn't Checked|CheckboxGlyph" -- Core/Views` prints nothing.
- [ ] Run the gates; the ledger checks read their rows.

#### Review Checkpoint

- [x] Every pane is reached one way, every switch and picker is the kit's row, and the Filter follows the setting; both reviewers' findings folded or recorded.
- [x] The Properties Drive's E and F groups green from a worktree of this head.

---

### Phase 4 — The Table and the Second Table

**GOAL:** The Trash and Archive table should draw its own heading, the Table's column gestures should have one owner, and the shell the Table and Archive wear should have one class and one sheet.

#### Task 4-1

`BundleTable` should render `.table-head` from two `{icon, label}` props, folding `DateHeading`; Archive's hand-built pair and Trash's own classes go, with the 8px residue gap, and the date column left-aligns in both skins, heading and dates alike (4.1, F-8).

**AFTER**

`Scouts/Planning/Phases/Phase 4a — The Bundle Table Draws Its Heading.patch`.

**VERIFY**

- [ ] `git grep -n "DateHeading" -- Core` prints nothing, and `git grep -n -E "text-align: ?center" -- Core/Bundles/bundle-table.css Core/Archive/archive-view.css Core/Trash/trash-frame.css` prints nothing.
- [ ] Run the gates.

#### Task 4-2

The resize gesture should join the drag gesture: `startResize(e, id)` beside `startColumnDrag` on `beginGesture` in `useColumns.ts`, the header JSX inlined into TableView's header map, and `ColumnHeader.tsx` deleted (4.2). `reorderColumns` goes, since `placeInShown` for a shown id is the same move (4.3). `DataRow` uses `<LineRow>` as `BundleRowView` does, and `DragShift` folds into `ColumnDrag` (4.6). `cellSweep.ts` takes the name `useCellSweep.ts`.

**AFTER**

`Scouts/Planning/Phases/Phase 4b — One Column Gesture.patch`.

**VERIFY**

- [ ] `ls Core/Views/Table/ColumnHeader.tsx Core/Views/Table/cellSweep.ts` prints only "No such file", and `git grep -n -E "reorderColumns|onResizeStart|DragShift" -- Core` prints nothing.
- [ ] Run the gates.

#### Task 4-3

The shell layer the Table and Archive wear should be `.table-shell`, renamed together with `view-tile.css.ts:140` and `content-banner.css:95`; the Trash keeps its own insets, since it sits inside the Settings window rather than the content pane the shell's inset bleeds into (4.4, G-2); `.row-grip` lives in `UIX/Table/table.css` alone; the property-cell styles at `table.css:222-321` move to `Core/Properties/Cells/cells.css`, imported by `Cell.tsx` (4.5); `.col-measure` moves to `bundle-table.css`, its one consumer. The Archive Drive's selectors follow in the same patch.

**AFTER**

`Scouts/Planning/Phases/Phase 4c — One Shell Class.patch`.

**VERIFY**

- [ ] `git grep -n "table-view" -- Core UIX .claude/scripts ':!*.test.*'` prints only the stylesheet's own file name, and `git grep -n "value-seat\|cell-text" -- UIX/Table/table.css` prints nothing.
- [ ] Run the gates; the ledger checks read their rows.

#### Review Checkpoint

- [x] One heading, one column gesture, one shell class; both reviewers' findings folded or recorded.
- [x] The Archive Drive green, every group, from a worktree of this head.

---

### Phase 5 — The Host and Its Renderers

**GOAL:** The host should hand renderers one rename shape, one creation path, one seat, one ghost, one item API, and nothing they don't read, so a List would copy none of what Table and Cards copy from each other today.

#### Task 5-1

A page's name should edit through one surface-held shape (D-1): `RenamablePageName` grows into `RenamableName`, taking the entity's `kind` (a `RenameKind`, since the detail header renames the homepage too), a `create` flag for the empty start, `renames`, `className`, and `autoSize` for the cell's look, and a children render, and `NameRename` is the interface the surface holds, `{ path, editing, onBegin?, onEnd }`. `submitRename(path, kind, newName, fromCreate?)` takes the create flag explicitly and clears no fence state, the fence's `RenamableTitle` returning `RenamableName` with its claim as the editing state, `renamingCreate` as `create`, and `cancelRename` as its end, so the label is written once and a surface-held commit touches nothing the fence owns. Tabs, page windows, and the detail header's title take `RenamableName`; the view-name renames in the dropdown and tiles are surface-held already and consolidate in Task 8-1.

Inside a view the host owns the state (D-2, I-040): `naming: { id: string; create: boolean; landing: boolean } | null`, `beginNaming(id, flight?)`, and `endNaming()`, where `create` is whether a flight was passed and `landing` holds until that flight settles, so one rule settles both cases: a naming clears when its id is neither in `rowById` nor landing, which a refused create and a filtered-away newborn both reach. `createPageIn` begins naming under `req.id` in the gesture's tick, right after `mutate(req)` returns its flight, lays its seeds through `overrideValues` straight, and the `rename` slot leaves the interactions policy and the creation config (2.1, 2.2); creation reads `c.rows` for `orderPatch`, and `ViewCreationConfig` is typed from `ViewHostApi` with `bandBucket`. Table and Cards both mount `RenamableName` reading `host.naming`; the Table's local `renaming`, its stranded-edit effect, and its own `mutate({ op: 'rename' })` go; Cards leaves the fence, and its `pendingSeat` goes with Task 5-2's held create. A Set band's menu New Page goes through the view's creation, `showEntityMenu(target, trigger, createPage?)` taking a create override as `showPageMenu` already does, so the band's seeds and order ride and the field opens under the minted id. `CardTitle` in `UIX/Cards/Card.tsx` draws one element in every mode, since a label that remounts on a scroll-mode switch loses the title it just committed. `RenameHost`'s `'detail'` becomes `'band'`, the Set band's title being its one claimant; the Matrix keeps `'matrix'`. One Table create-to-rename test lands before the change.

**AFTER**

`Scouts/Planning/Phases/Phase 5a — One Rename Shape.patch`.

**VERIFY**

- [ ] `git grep -n -E "RenamablePageName|PageNameRename|strandedEditId" -- Core ':!*.test.*'` prints nothing; `git grep -n "'detail'" -- Core/Session/editSlice.ts Core/Interface/RenamableTitle.tsx Core/Views Core/Interface/Menus/entityMenuActions.ts` prints nothing (the `chrome: 'detail'` and `connectionMenuActions.ts`'s `open: 'detail'` unions elsewhere are other words); and `git grep -n "rename:" -- Core/Views/Host/useViewCreation.ts` prints nothing, `useViewInteractions.tsx`'s one hit being `showPageMenu`'s host key.
- [ ] The create-to-rename pin reads red with `beginNaming` moved back after the reply.
- [ ] Run the gates.

#### Task 5-2

`useViewInteractions` should own the seat and the ghost: it calls `useValueSeat` and suppresses the ghost while `seat.open !== null || naming !== null`; it returns `ghostAt`, `ghostClosing`, and `ghostRootProps`, holding the anchored create until the newborn lands so the Table's row stops leaving a frame early (2.3, 2.4); the two extra stand-downs go. `ghostRootProps` joins `UIX/Interactions/ghostCreate.ts` beside `ghostAnchorProps`, and the six sites that re-spell `data-ghost-root` adopt it (2.9). `manualOrderDrops.test.tsx` moves to `Host/rowDrops.test.tsx`.

**AFTER**

`Scouts/Planning/Phases/Phase 5b — The Seat and the Ghost.patch`.

**VERIFY**

- [ ] `git grep -n "data-ghost-root" -- Core UIX ':!*.test.*' ':!*.css'` prints `ghostCreate.ts` alone (its helper and its own capture-phase check), and `git grep -n -E "seatHost|pendingSeat" -- Core/Views ':!*.test.*'` prints nothing.
- [ ] Run the gates.

#### Task 5-3

The host's return should carry what renderers read (B-2, 2.6): `tree`, `mutate`, `openTarget`, `schema`, `effectiveValues`, and `setValueOverride` leave it; the Table hides through `host.hideProperty`; `setValueOverride` becomes `overrideValues(pageId, picked, write)`, creation's one route to the override state. `RowCellApi` and `CardApi` become one stable item API, `interactions.item`, which a renderer extends through `policy.item` (the Table adds `sweep`, Cards adds `banner`), so `openPage`, `openSet`, and `pageMenu` live on the item (2.5); its handlers type is `StableHandlers`, exported from `UIX/Utilities/stableApi.ts`. Cards draws `EntityIcon` as the Table does, and the Table subscribes to the selection per row rather than at its root (2.7). `interactions.pageMenu` takes the event, `viewRootRef` is an `HTMLDivElement` ref, `fillsBlank` inlines, and `hide_page_icons` is read once (2.8).

**AFTER**

`Scouts/Planning/Phases/Phase 5c — One Item API.patch`.

**VERIFY**

- [ ] `git grep -n -E "RowCellApi|CardApi|defaultIcons|entityIcon" -- Core/Views/Table Core/Views/Cards ':!*.test.*'` prints nothing, and the host's return holds no `tree`, `mutate`, `openTarget`, `schema`, `effectiveValues`, `seatHost`, or `commitGroupValue` key (the last read only by the interactions, so it lives there): 37 fields at this task's head, from 42, and 36 once Task 7-1 folds `collapsed` and `toggleCollapse` into `disclosure`.
- [ ] Run the gates; the ledger checks read their rows.

#### Review Checkpoint

- [x] A renderer reads the host and the interactions and builds nothing either already builds; both reviewers' findings folded or recorded.

---

### Phase 6 — The Pipeline and the Bands

**GOAL:** The pipeline should prune once, build buckets once, and order Sets once, and the band layer should own its model.

#### Task 6-1

`pruneEmptyBuckets`, `pruneEmptyGroups`, and `dropHiddenGroups` become one bottom-up `pruneGroups(groups, drops)` composed in `resolveView.ts` (6.1). `bandOrder.ts` dissolves into `orderSetTree(tree, order)` in `group.ts`, which returns the tree untouched for an empty order so its callers pass `viewSetOrder(...)` straight, applied beside `pruneHiddenSets`, so a custom Set order also orders the pages gathered from nested Sets inside one band when nothing else sorts them (6.2, E-2); the Location-sorted flat list is out of its reach, since `setOrderOf` answers `'location'` there and `flat()` never reads the Set tree. `property()` and `structuralSubGrouped`'s block become one `bucketBands(...)`, and empty option bands show under each Set as at the top level, both under `hide_empty_groups` (6.3, E-3).

**AFTER**

`Scouts/Planning/Phases/Phase 6a — One Prune and One Bucket Builder.patch`.

**VERIFY**

- [ ] `ls Core/Views/Pipeline/bandOrder.ts` prints "No such file", and `git grep -n -E "pruneEmptyBuckets|pruneEmptyGroups|dropHiddenGroups|orderGroups" -- Core` prints nothing.
- [ ] The E-2 and E-3 pins in `group.test.ts` read red without their change.
- [ ] Run the gates.

#### Task 6-2

`SetRef`, `BucketRef`, `BandRef`, and `bucketValueAt` move from `bandRouter.ts` into `bandModel.ts`, and the mirror types `BandItem` and `BandList` go (6.4). "A top-level Set opens" becomes the tree's rule through `isTopContainer`, and `opensTop` leaves `HeadContext` (6.5). `memberIndent(kind, depth)` beside `memberDepth` serves the Table's rows and the drop line alike (6.6). `formatBucketLabel`, `orderedChildren`, and `setIndex.ts` move to `Bands/` (6.7). `useBandHeads` becomes `Bands/useBandSource.ts`, returning `{ painted, sets, heads }` alone, the host reading its date forms through `useDateForms()` itself (G-2); `BandDrop` joins `bandModel.ts` beside `BandRef`, so the model and the router import one way. `bandCommits.test.tsx:194-843` moves to `Bands/bandDrops.test.tsx`.

**AFTER**

`Scouts/Planning/Phases/Phase 6b — The Band Layer Owns Its Model.patch`.

**VERIFY**

- [ ] `git grep -n -E "useBandHeads|opensTop|BandItem|BandList" -- Core` prints nothing, and `ls Core/Views/Pipeline/setIndex.ts` prints "No such file".
- [ ] Run the gates; the ledger checks read their rows.

#### Review Checkpoint

- [ ] One walk per job in the pipeline and one model under the bands; both reviewers' findings folded or recorded.

---

### Phase 7 — Disclosure and Rows

**GOAL:** Disclosure should read through one shape, a band's head should take no Tab stop, rows should indent through one step and one lead cell, and the three Navigation Trees should answer one chevron rule.

#### Task 7-1

Disclosure state should be one `{ isOpen, toggle }` shape over each surface's own store: bands stop taking a collapsed set and inverting it, `toggleCollapse` goes through `toggled`, and `LocationField`'s hand-rolled set goes (7.1, C-1). `shownHeads` and `openHeadingRows` become one `unfolded` walk (7.2). `DropOutline` and `listed-outline.css.ts` move to `UIX/Elements/DisclosureChevron.tsx` and `disclosure.css.ts`, since every external importer sits outside Menus, and the `data-drop-outline` and `data-drop-outline-spacer` attributes become `data-chevron` and `data-chevron-spacer`, with `DisclosureRow`'s `dropOutline` prop becoming `chevron` and `--drop-outline-beat` becoming `--chevron-beat`, and `sidebar.css`, `AutocompletePane.tsx`, the Archive Drive, its `MATRIX.md`, and the Properties Drive following in the same patch; the state hook stays in `DisclosureRow.tsx`, and `useDisclosureSet(defaultOpen: boolean | ReadonlySet<string>, resetOn?)` takes the reset `LocationField` hand-rolled and its memoized leaves set in place of a fresh predicate. The Trash and Archive table's chevron takes the one control too, outside the Tab order as the band's and the sidebar's, keeping its place in the row.

**AFTER**

`Scouts/Planning/Phases/Phase 7a — One Disclosure Shape.patch`.

**VERIFY**

- [ ] `git grep -n -E "DropOutline|openHeadingRows|listed-outline|data-drop-outline|--drop-outline" -- Core UIX .claude/scripts ':!*.test.*'` prints nothing; the band's `group-band-drop-outline` button is Task 7-2's.
- [ ] Run the gates.

#### Task 7-2

A band's head should take no Tab stop (7.3, C-3): the chevron toggles through `DisclosureChevron`'s own control as the sidebar's does, `group-band-drop-outline`'s button and its two CSS rules go, and the New Page button leaves the Tab order, since the band's menu offers New Page.

**AFTER**

`Scouts/Planning/Phases/Phase 7b — The Band Head's One Tab Stop.patch`.

**VERIFY**

- [ ] `git grep -n "group-band-drop-outline" -- Core UIX .claude/scripts` prints nothing.
- [ ] Run the gates.

#### Task 7-3

Rows should indent through one step (7.4, C-2): `--row-indent` goes, `rowIndent` reads `--disclosure-indent`, `rowLead` builds on it, and the dead `--disclosure-rail-x` fallback goes. `RowLead` is the one lead cell `DataRow`, `GhostRow`, and `BundleRowView` share, absorbing `RowRail` and `rowIndent`, so the ghost row draws the gutter it lacked (7.5, G-2); it takes its indent as a finished value, and `rowIndent` itself stays, reading the one token, since the band head and `memberIndent` compute it.

**AFTER**

`Scouts/Planning/Phases/Phase 7c — One Indent Step.patch`.

**VERIFY**

- [ ] `git grep -n -E "RowRail|--row-indent|--disclosure-rail-x" -- Core UIX ':!*.test.*'` prints nothing.
- [ ] Run the gates.

#### Task 7-4

Hide Disclosure Chevrons should reach the sidebar and the Grouping pane's folder list through one mechanism: the `.hide-chevrons` root class and one rule on the shared chevron, scoped by a `navigationTree` marker class the two trees wear, since bands, the Bundle table, the Property frame, the Outline, the autocomplete, and the Filter's Location tree draw the same chevron and keep it; `GroupFrame`'s React read goes, and the caption names the sidebar and the Grouping pane (C-4). The Location tree keeps its chevrons whatever the setting says, since a row click there picks a folder and the chevron is what opens one (*§Constraints · Rulings*). The Grouping pane's folder list and the Filter's Location tree share their leaf spacing (`'none'`, a flat list of Sets staying flush) and the view's custom Set order, which `ViewPane` applies to the folders it hands the Filter through `orderSetTree`, since the Matrix and Preview Rules filters mount the same tree with no view; the trees differ in what a row does and in the chevron rule (C-5).

**AFTER**

`Scouts/Planning/Phases/Phase 7d — The Navigation Trees.patch`.

**VERIFY**

- [ ] `git grep -n "useSetting('hideChevrons')" -- Core` prints nothing, and `git grep -n "sidebar's chevron gutter" -- Core` prints nothing.
- [ ] Run the gates; the ledger checks read their rows.

#### Review Checkpoint

- [ ] One chevron, one fold, one indent step, one chevron rule; both reviewers' findings folded or recorded.

---

### Phase 8 — View Tiles

**GOAL:** A tile should reuse the view list's row and menu rather than re-implement them, own its payload algebra apart from its surface, and read what a renderer declares rather than its classes.

#### Task 8-1

`runViewRowAction(ctx, view, anchor, run, pop = popMenu)` beside `viewRowMenuItems` in `Actions/viewMenus.ts` pops the row menu and runs its pick, the tile passing its own `popHeld`, and one `ViewListRow` in `ViewFrame.tsx` draws the row for the dropdown and the tile, each surface holding its own renaming id (the tile holds its strip open on it, and one `renameOf(v)` there serves its pill and its dropdown row alike), the run's `titles?: { shown, toggle }` being the one signal the Titles row reads (8.1); `freeName`, `mintViewId`, the last-view guard, and insert-after live in `views.ts`, so the main pane's and the tile's duplicate and delete share their naming and splice while each store keeps its confirmation, exit, and undo (F-5). Duplicating keeps switching to the copy in a tile alone (F-4).

**AFTER**

`Scouts/Planning/Phases/Phase 8a — One View List Row.patch`.

**VERIFY**

- [ ] `git grep -n "viewRowMenuItems" -- Core ':!*.test.*'` prints `viewMenus.ts` alone, since `runViewRowAction` pops the menu there for both surfaces.
- [ ] Run the gates.

#### Task 8-2

`usePillPresence` becomes `useEntrance` (8.2); `ContainerView` takes its target as `SpaceView` does (8.3); a locked tile's pill can't begin a rename, and `persistConfig`'s lock check becomes `editViews(op)`'s, the one gate every direct list edit passes, since another window can lock the tile while a rename or chooser is open (3.2); `configIdOf`, `embedViewIds`, `coerceEmbeddedView`, `rawViews`, `rawActive`, and the list ops as `EntryOp`, `(raw) => EntryPatch | null`, written once in `tiles.ts`, move to `Core/Tiles/viewTileEntry.ts` with `embeddedViews(els, entryId)`, the coerced list the tile and its duplicate read (8.5).

**AFTER**

`Scouts/Planning/Phases/Phase 8b — The Tile's Own Pieces.patch`.

**VERIFY**

- [ ] `git grep -n -E "usePillPresence|persistConfig" -- Core` prints nothing.
- [ ] Run the gates.

#### Task 8-3

Renderers should declare and the tile should read (8.4): each marks its lead with `data-view-lead`, `"head"` on the Table's heading, `"band"` on a band's row, `"row"` on the first card of a wrapping row, so the tile's reveal anchors to the first declared lead; each renderer's stylesheet holds its embed zoom and its embed padding under `[data-view-embed]`, which `ViewHost` sets in a tile scope, reading the tile's `--tile-inset-l/r`; the Table's heading rules stay tile-owned on `[data-view-lead="head"]`; `resolvePeekAnchor` and `view-tile.css.ts` stop keying on renderer classes, and the `.css.ts` zoom fallbacks, which never applied, go.

**AFTER**

`Scouts/Planning/Phases/Phase 8c — Renderers Declare.patch`.

**VERIFY**

- [ ] `git grep -n -E "table-shell|cards-view" -- Core/Tiles` prints nothing.
- [ ] Run the gates; the ledger checks read their rows.

#### Review Checkpoint

- [ ] A tile knows no renderer by name; both reviewers' findings folded or recorded.

---

### Phase 9 — MenuBase

**GOAL:** The blank pane every menu, managed list, and value picker mounts in should be named and filed as a shell (I-069). It stands on its own so it can be dropped at ratification without reshaping the chain.

#### Task 9-1

`PickerMenu` becomes `MenuBase` in `UIX/Menus/`, with `panePlacement.ts`, `usePaneResize.tsx`, and the shell half of `picker-base.css.ts` as `menu-base.css.ts`; `PickerDirection` becomes `PaneDirection` beside `PanePos` and `PanePoint`; the dead `style` prop goes; `treePane` moves to `filter-frame.css.ts`, `optionRing` to `calendar-picker.css.ts` as `pillToday` beside `pill`, and `PICKER_MAX_HEIGHT`/`PICKER_WIDTH` to `menu-row.css.ts` beside `MENU_MAX_HEIGHT`, which their comment compares against; the 44 files that name it and the comments follow, and two `FieldPicker` tests leave the shell's test file for `UIX/Pickers/FieldPicker.test.tsx`, so `UIX/Menus` imports nothing from `UIX/Pickers`; `frames.css.ts`'s thirteen Properties-only exports move to `Core/Properties/Schema/schema.css.ts` and its header reads true. `bareSurface` and `hostedGutter` stay: three callers, and the gutter copies `MenuSurface`'s rather than `surface`'s padding. `data-picker-portal` and `pickerBloom` keep their names (27 files, nine of them drives).

**AFTER**

`Scouts/Planning/Phases/Phase 9 — MenuBase.patch`.

**VERIFY**

- [ ] `git grep -n "PickerMenu\|picker-base" -- Core UIX Desktop .claude/scripts` prints nothing, and `git grep -n "from '../Pickers\|from '@pommora/uix/Pickers" -- UIX/Menus` prints nothing.
- [ ] Run the gates; the ledger checks read their rows.

#### Review Checkpoint

- [ ] Every importer reads the new name and folder, nothing spells the old, and no stylesheet lost a same-specificity tie; both reviewers' findings folded or recorded.

---

### Phase 10 — One Lock per Row

**GOAL:** Each row should say whether it stays put, as it already says what Enter and Space do, and that one flag should refuse its keyboard lift and drop its drag description (I-059).

#### Task 10-1

`lineList`'s `locked`, `groupedLine`'s per-kind `disabled`, the band spec's `draggable` check and `disabled` parameter, and `bandZone`'s `disabled: searching` fold into one per-row flag, `immovable?: boolean` on `LineRowOptions`, written as `data-line-immovable`, for which `measureLine` answers no snapshot, so the engine's existing refusal holds; each row sets it where it's built (`BundleRowView` always, `NavRow` without a reorder, `HideableRow` without a save, the views list under two views, `DataRow` under `dragDisabled`, a band head through `BandView`'s `immovable` or its own `draggable`, `MatrixLabel` always); `useLineRow` and `useDragItem` drop `aria-describedby` on an immovable row or in a disabled zone; the Trash and Archive table's rows and a navigation list's rows stop naming a gesture they don't have.

**AFTER**

`Scouts/Planning/Phases/Phase 10 — One Lock per Row.patch`.

**VERIFY**

- [ ] `git grep -n -E "locked\?: boolean|items\.disabled|groups\.disabled" -- UIX/Interactions` prints nothing.
- [ ] The three pins *Pins* names for this task read red without their change.
- [ ] Run the gates; the ledger checks read their rows.

#### Review Checkpoint

- [ ] One lock, read once; both reviewers' findings folded or recorded.

---

### Phase 11 — Docs and Issues

**GOAL:** Every document this work makes false, and every line on its surface that was already false, should read true as a shorter user-facing summary, once, after the last production phase.

#### Task 11-1

**AFTER**

`Scouts/Planning/Phases/Phase 11 — Docs and Issues.patch`: the documents *§Reconciliation · Documents* lists. A hunk stays only if a sentence went false, it changes the words that went false rather than the paragraph around them, and detail that needed correcting leaves as too specific for a feature document. I-040, I-059, I-069, and I-070 close; I-026 and I-033 lose their superseded lines; every footnote citing a moved file re-cites; `FrameworkPM.md:21` reads as `ViewTypesPM.md` does (E-1).

**VERIFY**

- [ ] Run the gates; `node .claude/scripts/check-atlas.mjs` exits 0.
- [ ] `git grep -n -E "VIEW_RENDERERS|LAYOUT_OPTIONS|pendingView|filterModel|visibilityModel|creationOrder|ColumnHeader|PickerMenu|useBandHeads|RowRail|its own grouping surface" -- .claude/Features .claude/Guidelines .claude/Resources .claude/CLAUDE.md .claude/FrameworkPM.md .claude/IssuesPM.md` prints nothing.

---

### Completion Criteria

- **Conformance:** the implementation adheres to the project's guidelines, Nathan's stated preferences, and *§Constraints*; no mechanism landed that an existing one already provided, every file created, moved, renamed, or deleted is one *§Constraints · Placements* names, and nothing changed outside what the plan named.
- **Correctness:** each decision is observably true: a kind is one record and one lookup; both settings doors reach the same panes one way and the Filter follows Native Menus; the Trash and Archive table draws its heading left-aligned; a page's name edits through one surface-held shape and a created page's field opens with its row; the Table's ghost holds its place; a custom Set order orders nested Sets' pages and empty option bands show at both levels; a band's head takes no Tab stop and Hide Disclosure Chevrons reaches the sidebar and the Grouping list through one rule; a tile reuses the list's row; the menu shell is `MenuBase`; a locked row carries no drag description.
- **Completeness:** every task landed and is ticked; nothing was deferred, narrowed, or left as scaffolding, debug output, or an unauthorized TODO.
- **Confirmation:** every verification ran and its result was read; every pin *Pins* names goes red without its change.
- **Continuity:** *§Reconciliation* is walked, the project's living documents read true, and every deviation is fixed or ruled on.
- **Confidence:** gates are green from a clean state across the full range from the BASELINE head, the comment count sits at or under 3,517, `git diff --stat <BASELINE>..HEAD -- Core/Sync Sync` prints nothing, and the diff is the size the Net Ledger implied.

#### Final Verification

**THE STANDARD:** The work is finished when a later review of it finds nothing to correct. Not just doing the chores — doing the laundry, folding it, picking up what fell out of the hamper, emptying the lint trap, leaving no trace that anything went wrong. Nothing is carried as a concern, nothing is deferred where the fix is known, and nothing is declared that wasn't watched happen. Where something genuinely couldn't get there, the report names which and why, and everything else is still finished. Ambiguity met during execution took the simplest reading and was recorded; it didn't stop the run.

The reviews run over `<BASELINE>..HEAD`, each wave closed before the next opens, every agent here but the neutral gate at `opus-xhigh`.

- [ ] **Wave One:** two read-only reviewers briefed with `code-simplification`, one reading inward at the diff and one reading outward against the rest of Core, Desktop, and UIX; one fix agent folds what holds as numbered fixes beside a Not Taken list with reasons; the fold commits, and every drive *§Constraints · Live Drives* names runs from a worktree of that head.
- [ ] **Wave Two:** two fresh reviewers briefed with `adversarial-review`, one inward and one outward, over the folded range and given the Not Taken list, so a fold left out returns only on new evidence; folded, committed, and driven the same way.
- [ ] **Wave Three, Only If It Helps:** run it where Wave Two's folds were structural, as a final look rather than churn for its own sake. The orchestrator states why it ran or didn't.
- [ ] **The Neutral Gate:** one `fable-high` agent briefed as *§Constraints · Neutral Gate* says, re-run after a fold.
- [ ] **The Own Pass:** the gates from a clean state and `npm run build`; the diff read once; `git diff --stat <BASELINE>..HEAD -- Core/Sync Sync` prints nothing; the comment count sits at or under 3,517; *§Completion Criteria* ticked.
- [ ] **The Teardown:** every worktree the run cut removed with `git worktree remove --force` and `git worktree prune`; every scratch Nexus, userData, and script the run made removed.
- [ ] **The Cold-Machine Check:** each of these prints nothing, or only what it names: `git worktree list` (the main checkout alone); `find "$TMPDIR" -maxdepth 1 -name 'pommora-drive-*'`; `ps -o pid,command -A | grep -E "electron|vitest|vite-node|node .*live-drive" | grep -v grep` (only Nathan's own instance); `git status --short` (nothing the run made); and the `~/Test` hash matching Run Start's.
- [ ] **Reconciliation:** *§Reconciliation* walked; *§Deviations* ruled on; STATUS and BASELINE's End filled, and the plan commits with `--only`.
- [ ] **The Report:** in `closeout-review`'s closeout format, with the range presented through `view-delta`, `<net> (+<added> / -<removed>)` per phase and in total, every deviation, the Cold-Machine Check's result, and the neutral gate's answer verbatim. PushNotification tells Nathan it's ready.

#### Reconciliation

**Documents, Task 11-1:**

- `.claude/Features/ViewTypesPM.md` — rewritten shorter as a user-facing summary: `:4` (`VIEW_RENDERERS`, `nests`, "page tiles"), `:14` ("the renderer opens its own naming field"), `:16` ("a persisted ghosted page", "are use"), `:26` (`filterModel.ts`), `:34` (the Checkbox operators), `:47`, `:71` (*§The View Host*: paths, `pendingView.ts`, the policy's ghost and naming, "scroll root", "one policy"), `:79` ("the cell renderers live in `UIX/Table/`"), `:83` (the filler track and resolved widths), `:87` ("the reorder helper"), `:95` ("which ArchiveView wears too"), `:103`–`:104` (`--labels-gap`, `--row-indent`), `:118` ("Hide Icons"), *§The Pipeline*'s "four pure stages", *§Surfaces*' LayoutFrame, Filtering, and ViewFrame bullets, and "Grouping/Sorting/Filtering" against the UI's Group/Sort/Filter at `:55`, `:64-66`, `:130`; `:162` holds (`presentedKind` seats Table for a kind with no renderer).
- `.claude/Features/PommoraDND.md:38` — "Grouping and Sorting panes" reads Group and Sort.
- `.claude/Features/SymbolsPM.md:18` — view-type glyphs live in `VIEW_KINDS`, and the frame glyphs in `VIEW_PANES`.
- `.claude/Features/InteractionPM.md:36` — `dropOutline` is `DisclosureChevron`; `:20` and `:46` keep `pickerBloom` and "a picker pane's free edges" as they read.
- `.claude/Features/ConfigurationPM.md` — the Hide Disclosure Chevrons caption names the sidebar and the Grouping pane.
- `.claude/Features/InterfacePM.md:89` — the Glance Pane's line names `MenuBase`.
- `.claude/Features/InterfacePM.md:32` — the creation paragraph's closing clause, "one naming field exists at a time across every surface", went false at Task 5-1 (a view's name field is the view's own, the fence governing the sidebar, the Matrix, and the bands); the sentence is rewritten shorter as user-facing summary, the clause removed rather than amended, in natural language with no implementation names.
- `.claude/Features/MarkdownPM.md:242` — `PICKER_MAX_HEIGHT` lives in `menu-row.css.ts`.
- `.claude/Guidelines/Development-Environment.md:20`, `Editor-Internals.md:37, 39`, `Web-Guests.md:19` — `PickerMenu` reads `MenuBase`.
- `.claude/Features/SurfacePM.md:28` — duplicate behavior holds; re-read only.
- `.claude/CLAUDE.md` — the `UIX/Pickers` and `UIX/Menus` lines of *§Codebase Structure* (Menus gains the shell; Pickers reads "Field" for `FieldPicker`, not "Text").
- `.claude/Resources/PommoraUIX.md:380`, `:393`, and its Menus section — the PickerMenu row becomes the `MenuBase` row under Menus; `UIX/Table/` lists `RowLead` and `rowIndent`; the `listed-outline.css.ts` cite, the `dropOutline*` and `--disclosure-rail-x` names, and `DropOutline` leave, the chevron exports taking an Elements row and `DisclosureRow`'s row listing `unfolded` and `Disclosure`; `:161`'s Disclosure Indent row drops `DISCLOSURE_INDENT`, which the Phase 7 checkpoint inlined.
- `.claude/FrameworkPM.md:21` — "each carries its own grouping surface" rewritten: one Grouping pane adapts through `nests` (E-1).
- `.claude/IssuesPM.md` — I-040, I-059, I-069, I-070 close and A7 • Views leaves with them; I-026's channel count and double-door list lose `container:configure`; I-033's `filterModel`/`visibilityModel`/`placeNew` lines are superseded; every footnote citing a moved file or a shifted line re-cites (I-006, I-013, I-016, I-028, I-029, I-031, I-032, I-043, I-046, I-051, I-055, I-057, I-060, I-065, I-066 as numbered before the close). `index-issues.py` closes the gaps, so every issue above I-040 takes a lower number; *Phase 11 — Notes* holds the map, and the planning folder keeps the old numbers as a record of its time.
- `.claude/Planning/Cross-Device Mutation Checklist.md:68` — `container:configure` → `setViewButton` through `mutate`; the one Planning file this work touches, since the row named a deleted handler.
- `Core/Tiles/README.md` — the module map gains `viewTileEntry.ts`.
- `Core/Testing/viewHarness.tsx:1` — "every view suite mounts through"; `useGhostFlip.test.tsx` doesn't.
- The Archive Drive's `live-drive.mjs` and `MATRIX.md` — with Tasks 3-3 (the placeholder's label), 4-1 (the heading classes), 4-3 (`.table-shell`), and 7-1 (`data-chevron`); the Properties Drive's `MATRIX.md` and `live-drive.mjs` — with Tasks 3-4 (MP-E-3's shield) and 7-1 (`data-chevron`).
- `.claude/Planning/Completed/Disclosable Bundles — Plan` glossary and the *Wrapped Table Cells — Brainstorm Brief*'s `WIDTHS` and `table.css` cites — historical; re-cite only where the brief is live.


#### Open Items

- **E-2's Location-sorted clause:** a custom Set order reaching the pages of a Location-sorted flat list needs `setOrderOf` to answer the custom order under Sort By Location, and `setOrderOf` also feeds `routeSet` and `pageOrderOf`, so the change reaches drop routing. Not built; Nathan rules whether it's a follow-up.

Nothing else survives ratification once the placements are approved. *Morning Report* lists the calls taken for Nathan's eye.

#### Deviations

Planning's own folds, and where each landed, sit in *Scouts/Planning/Phases/Wave One — Fold Ledger* and *Wave Two — Fold Ledger*.

- **Phase 1 checkpoint (11-08-2026):** both reviewers found `GroupFrame.tsx:353`'s `persist` prop spelling the bound view save by hand, `(patch: ViewPatch) => Promise<Result<unknown>>`, where Task 1-1 made `ViewWriter` the one spelling; it becomes `persist: ViewWriter` with the `Result` import gone (net 0), landing at Phase 7's checkpoint, since `GroupFrame.tsx`'s import block and that prop sit in the context of patches 2b, 2c, 3a, 3c, 5c, 6b, 7a, and 7d and no patch after 7d touches the file. `bandRouter.ts:45`'s `persistView` keeps its own type, since it receives the host's `Result<unknown>`-returning `persistView` and can't narrow. Not taken: `void` on `LayoutFrame.tsx:83` and `:122`'s discarded `write(...)` calls, since Task 3-1 rewrites both lines as `void save(...)`.
- **Phase 2 checkpoint (11-08-2026), fold `7dac30394`, -10 Actionable and -1 comment; every later row's Measured reads 10 below its Estimate by it:** the I-070 arm re-placed a row whenever its successor-anchored place in the live order differed from the drop's, so a write from another device during the round trip could move a row nobody moved and save it; `priorSlotOf` now re-places only where the live order still carries the drop's slot (the row beside the neighbor its own patch gave it), a row a later write removed from the order stays removed, and a new pin in `liveView.test.tsx` holds the gate. Simplification folds: `pickedStyle` inlined into `columnStylePatch` (-8); `ViewRow extends PageValues` (-3); `setViewButton` writes through `setOrDrop` as `setDisclosureLock` does (-1); `orderInTree`'s comment, a repeat of two headers, left (-1 comment); `TITLE_OPS` reads `TEXT_OPS`; one import re-ordered; `writePathRace.test.ts`'s third writer drives the `setViewButton` op again. Scheduled for Phase 5's checkpoint, since 5a to 5c rewrite `useViewInteractions.tsx`: the arm skips a row the stored `manual_order` never ranked, the default state of a property-grouped view, where the drawn order at the drop is its prior slot, so `placeInView` hands `dropIO` that order. Not taken: `ViewWriter` moving to `liveView.ts` and widening with `ViewWriteOpts` (Wave Two's Fold 7 placed it beside `ViewPatch`, and the option is the host's persist's alone); `useSaveView`'s two closures merged (they separate the write from its one refusal report). The fold's commit carries an Opus trailer where the plan's rule names Fable; the executor read the session's attribution reminder over the brief, and the commit stands as pushed.
- **Phase 3 checkpoint (11-08-2026), fold `fc8b3b4bf`, -8 Actionable; every later row's Measured now reads 18 below its Estimate:** the morning's ruling had left the editor's Layout leaf spelled in the record, `ViewEditor`'s branch, and two editor-only props on the shared dispatcher (`current`, `switches`), so `ViewEditor` now owns both leaf arms (the Table leaf reaches `VisibilityFrame` with its `Layout` title and switches footer from the editor rather than through the dispatcher) and `ViewPane` is `PaneProps & { id, source }`, binding no save of its own; `SettingsFrame` binds `save` once and `detailFor` inlined; the "Visibility is the list alone" pin reddens when `ViewPane`'s visibility case passes a switches footer. The Filter's operator list is keyed by position rather than its wording; `PickerRowLook` is `RowLook`, since `switchRow` and `steppedRow` take it too; `FilterFrame.test.tsx`'s Checked case compares exact operator texts, since "Unchecked" contained "Checked". Tests that mounted `ViewPane` for its own save mount `SavingViewPane` from `viewHarness.tsx` (+7, the fold's -15 reading -8), except `liveView.test.tsx`'s locked-tile case, which binds its save inline because patch 8a carries its `ViewPane` import as context; it moves to the helper at Phase 8's checkpoint, with the helper's return type declared. The Properties Drive's groups 18 and 19 held 67 of 67 from a worktree of `4c66b4171`, `~/Test` restored. Scheduled for Phase 8's checkpoint, since 8a rewrites both: the dropdown's rows read the saved view while the toolbar button reads the live one, so a rename from a row shows the old name under the new one until the write lands (`ViewListRow`'s `onCommit` returns the save, and the row reads the live view); `viewButtonMenuItems(labeled)` in place of recomputing `=== 'labeled'`, which 8a's `viewMenus.ts` hunk blocks today. Scheduled for Phase 10's checkpoint, the last patch touching `OptionOrderList.tsx` and `GroupFrame.tsx`: the hide controls travel both spread as two props and whole as `hide`, so every consumer takes `hide?: HideControls`. Not taken: gathering `SettingsFrame`'s header identity once (+11 measured against the -3 estimated); exporting `lookRow` to delete `typeRows.tsx`'s two-caller `item` (the plan keeps `lookRow` private); `hideEye`'s `dim` as an options object (the E-4 comment carries the reason where it's read); dropping the `// PLACEHOLDER` marker over the dropdown's More button (the markers are the owner's own).
- **Phase 4 checkpoint (11-08-2026), fold `14926adc0`, -16 Actionable and -1 comment; every later row's Measured now reads 34 below its Estimate (added -12, removed -22), tests level with the row again, comments 2 below:** `useColumns`' resize kept a `resizing` state equal at every render to `dragWidth !== null` and cleared the width through three end paths, so `resizing` derives from the width, `teardown` alone clears it, and `onActivate`, `onAbort`, and its comment left (the gesture skeleton runs `teardown` then `onDrop` or `onAbort` in one event); both `.table-grid` lookups assert their grid, since the handles render only inside it; `startResize`'s doc kept only its own two reasons, having joined the deleted `ColumnHeader.tsx`'s header and inline comment against the Comments rule, and `BundleTable`'s doc gave back the `DateHeading` measure sentence it had absorbed, `BundleRows`' doc reading "under the table's heading"; one biome-ignore wording for the shared `.col-header` right-click; `table.css`'s two `.no-borders .data-cell` rules merged, `cells.css`'s carried blank line and `.col-measure`'s dead `flex: none` and inherited `white-space: nowrap` gone; `table-view.css`'s header names the cell sweep it holds; `columns.test.ts`'s own-slot `placeInShown` case left (no caller reaches a row's own slot) and the default-on case reads in the block's idiom. The Archive Drive held 159 of 159 from a worktree of `c9a3a3b6b`, `~/Test` restored. Scheduled for Phase 5's checkpoint, since 5c owns the lines: `hideColumn`, `setColumnAlign`, and `runStyleAction`, each private with one caller in `openHeaderMenu`, inline there. Scheduled for Phase 7's checkpoint, since 7c carries the line as context: `.bundle-date` survives only as a selector for `ArchiveView.test.tsx` and the Archive Drive, so the class goes and both read `.bundle-rows .data-cell:last-child`, the final head's drive run proving it. Not taken: `BundleTable` owning the title heading's icon (both callers pass the same one; the plan's two-prop shape stands); the `.table-shell` double duty (the shared shell and a stand-in for the Table kind, with the band rhythm scoped under it) and `table-view.css`'s name, which the report already holds for the owner as a placement, now with a third option, splitting the three shell rules out so the Archive imports no Table sheet. For the final report: the Archive Drive's 7B column check compares left edges the grid makes equal, so neither it nor any test asserts F-8's left alignment or Behavior Change 9's date lead; the atlas check prints one FAILED table (`ViewTypesPM.md:97`, `--labels-gap` moved to `cells.css`) at every head until Phase 11 rewrites the document, by the plan's documents-change-once rule.
- **Phase 5 checkpoint (11-08-2026), fold `9dd0f59a3`, -16 Actionable; every later row's Measured now reads 50 below its Estimate (added +5, removed -55), tests one above, comments two below:** the two scheduled folds landed. The I-070 arm's prior for a row the stored `manual_order` never ranked is the ranking `placeInView` spliced the drop into, `mergedRanking(view.manual_order, row ids)` computed once and handed to `dropIO` as `prior: { manual_order: ranked }`, which `persistAfter` reads as `prior?.[key] ?? view[key]`; the drawn band-by-band order was wrong for it (a band's last row would return first, shown by a scratch run) and writing it into `view` would have made a second source of truth, since `view` keys the stage and is the live read's fallback; a third pin in `liveView.test.tsx` holds it. `useColumns`' `hideColumn`, `setColumnAlign`, and `runStyleAction` inlined into `openHeaderMenu`. From the reviews: `useGhostFlip`'s `gone` parameter, always `liveId === null` since Task 5-2, left with its unreachable test state; the interactions return `onGhostClosed` and `holdGhost` in place of the raw `ghost` anchor, so a renderer can't read `anchorId` past the held create; `RenamableTitle` dropped the `renames` default `RenamableName` already declares. Scheduled for Phase 6's checkpoint, since 6b rewrites `bandRouter.ts`: `routeSet`'s `group_order` arm has the same unranked gap under a custom Set order never dragged, so the Set `BandEffect` carries `prior: { group_order: ranked }` and `runBandEffect` passes it through. Scheduled for Phase 10's checkpoint, since 7c and 10 carry `DataRow`'s head as context: the per-row selection read spelled in both renderers becomes one `useRowSelected(id)` beside `rowHover`. Left for the final waves: `TableView`'s `activeCell` flattened to one `??` chain and the renderers' item-API types named alike (`RowApi`, `CardItem`), both 0 lines inside later patches' context. For the owner: `RenamableName` lives in `Core/Interface/RenamableTitle.tsx`, a file named for the fence wrapper (a placement); under a view search a band's New Page creates a page the search hides, so no name field opens (true for the band's + before this work, now the band menu's New Page too; a product call between the search keeping the naming id and creation clearing the search); `PageMenu` and `SettingsFrame` still commit names through `InlineEditHeader`'s own `submitRename`, a path outside D-1's list. `InterfacePM.md:32` joined *§Reconciliation*.
- **Phase 6 checkpoint (11-08-2026), fold `20fd7adbf`, -61 Actionable; every later row's Measured now reads 111 below its Estimate (added +31, removed -142), tests two above, comments two below:** the three Set-band builders became one `setBands`; `schemaOptionOrder` and `configuredOrder` gave way to `appendTail` over the schema's options; `flat` and `locationFlat` gave way to `placeTail`, so an empty Location-sorted view emits no band as an empty unsorted one already did, which drops the blank band gap an empty Location-sorted Cards view drew under its Set cards; the Set-order pass runs for Set plans alone, gated as the hidden-Set prune is; the mounted column-width suite in `useColumns.test.ts` is named for what it pins. The scheduled `group_order` prior landed narrower than the Phase 5 entry framed it: a custom order never dragged forms no `after`, so no prior is read there, and the real gap is a stored `group_order` that doesn't rank the dragged Set, such as a Set made since the last Set drag. The Set effect carries `prior: { group_order: ranked }` beside its `after`, and the prior reaches `dropIO` through `bandRouting`'s IO factory rather than `runBandEffect`, since `dropIO` fixes its prior when it's built; a pin in `bandDrops.test.tsx` holds it. Scheduled for Phase 7's checkpoint, since 7a carries `GroupFrame.tsx`'s lines as context: `LocationHierarchy`'s factory passes the prior too (the Grouping pane keeps the gap until then), beside the Phase 1 `persist: ViewWriter` fold, and `BandScope` holds the `BandModel` in place of `valueAt` and `shown`, `BandBase` and `bandScopeOf` leaving (about -16), a type change that lands whole with `GroupFrame`'s caller. Scheduled for Phase 8's checkpoint, once 7d makes `orderSetTree` generic and 8c has last touched `CardsView.tsx`: `setIndex.ts`'s `orderedChildren` gives way to `orderSetTree` over the painted tree both callers already hold (about -14), the mechanism Wave One's Not Taken missed. Scheduled for Phase 10's checkpoint, the last patch carrying `bandZone`'s lines: `listZone` takes the band line's indent as a parameter while its member line reads `memberIndent`, two sources for one Table rule. Not taken: the host's band-name fallback, which reads as dead but isn't, since the Cards' Set-card row sends Set keys through `bandDrop` under a property plan, where the key names no band; widening `optionIds` to take an absent definition (net 0 across three files); folding `searchGroups` into `pruneGroups` (it filters items as it walks). Phase 11's patch needs `--3way` on `viewHarness.tsx:1`, whose context the Phase 3 fold widened. For the owner: a cross-parent Set nest in a view that has never stored a Set order forms no `after`, since the order shows alike, so a refusal has nothing to unwind, and a second Set drag inside the round trip saves the first Set's ahead-painted slot; the fix stages `after` on every cross-parent nest under a custom order, a view write per nest, which is a product call rather than a fold. The Views Drive, built at this checkpoint, held 100 of 100 from a worktree of `20fd7adbf`, after replaying the baseline and Phases 2 to 5's heads, `~/Test` restored after each run. Its one failure on the way, I-070's arm for a row no stored `manual_order` ranked, read red at Phases 2 to 4 and held from Phase 5, the gap Phase 5's fold closed. The fold's two changes carry cases of their own, each reading AWAIT at Phase 5's head. Behavior Change 8's in-app look already held at the baseline (Sort's rows, their height, and the ringed current row), so Task 3-4 changed the Filter's route rather than its look, and its two cases are regression crossings.
- **Phase 7 checkpoint (11-08-2026), folds `47dcbe763` and `2568cbd34`, -26 Actionable; every later row's Measured now reads 137 below its Estimate (added +45, removed -182), tests three above, comments three below, one of them `TableView`'s slot comment moving from `//` to `{/* */}`, which the count doesn't match:** the four scheduled folds landed. `GroupFrame`'s `persist` is `ViewWriter` (-1, its `Result` and `ViewPatch` imports leaving); `.bundle-date` left the Bundle table's date cell, styled by nothing and kept only as a selector, so `ArchiveView.test.tsx` and the Archive Drive read `.bundle-rows .data-cell:last-child` and the Views Drive keys the change in its drift table; the Grouping pane's band IO factory passes the Set effect's `prior` to `dropIO` as the host's does, a second pin in `GroupFrame.test.tsx` holding it; `BandScope` holds the `BandModel` in place of `valueAt` and `shown`, `BandBase` and `bandScopeOf` leaving, `bandSlot`'s per-slot cache keeping the drag path one route per slot. From the reviews: `RowLead` takes its grip or check as a child in place of the `slotted` prop, the slot's absolute position seating it either way (-15); `DataRow`'s and `GhostRow`'s `padLeft` is a string; `DISCLOSURE_INDENT`, private and read once, inlined into its variable (-2), which adds `PommoraUIX.md:161` to *§Reconciliation*; `useDisclosureSet`'s doc says a reset sets flips aside, since a flip returns with its value. `ViewPane`'s ordered Set tree took a memo against the Filter's folder maps rebuilding on a tree push, then left it (`2568cbd34`): keyed on the view, it rebuilt on every staged keystroke anyway, at +7 lines and a grouping plan for every pane. The executor followed Task 7-1's rename into `~/The Studio/.claude/dashboard`'s Benchmarks tab, a kit consumer `npm run typecheck` covers that no patch carried, committed in the Studio repo as `53e336c`; Task 9-1 moves `PickerMenu` and `picker-base.css`, which the dashboard also imports, so Phase 9 follows them the same way. Scheduled for Phase 8's checkpoint, beside the `SavingViewPane` fold already there: the helper passes its static `view` where `ViewFrame` passes `useLiveView(...)`, so no pane test sees a composed write, and `GroupFrame.test.tsx`'s pin wraps the pane in a local live reader the helper would absorb. Scheduled for Phase 9's checkpoint, which carries `AutocompletePane.tsx`'s imports: the link autocomplete is the one folding list off the `Disclosure` shape, its hook building one over its own set as the host does, `collapsed` staying for `resetKey`. Scheduled for Phase 10's checkpoint, the last patch on `TableView.tsx`: the grid cell's keyboard exception lost its written reason when the handlers moved into the `cell` spread, which Biome can't see, so one comment carries it where the spread lands. Not taken: dropping the Views Drive's pre-Phase 7 chevron attribute, which Task 7-1's grep matches, since its drift table is how the drive replays the heads before Phase 7. For the owner: the type `Disclosure` shares its name with the sidebar's `Disclosure.tsx` branch row; `rowIndent.ts` sits in `UIX/Table/` while `UIX/Menus/MenuRows.tsx` reads it as the menus' step too; and the sidebar's first nesting step reads 16px against 14px for every deeper one, as at the baseline, since `MenuRows`' `INDENT_BASE` knob seats nested rows on 8px while a top-level row sits on the 6px row pad, so one even step means retiring that knob and moving every nested menu row 2px. From a worktree of `2568cbd34`, the Views Drive held 125 of 125 with group 7 built, its 25 cases reading AWAIT at Phase 6's head bar the regressions, the Archive Drive 159 of 159, and the Properties Drive's groups 14 and 17, the two reading the sidebar's chevron, 44 of 44, `~/Test` restored after each.
