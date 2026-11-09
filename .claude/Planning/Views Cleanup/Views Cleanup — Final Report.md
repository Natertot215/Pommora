## Views Cleanup — Final Report

**DATE:** 11-09-2026
**RANGE:** `cae07c129..c3dfbef2e` on `active`, with the Studio repo's dashboard and view-delta follows (`53e336c`, `df77e13`, `b5989ba`, `3d6c42c`)
**DELTA:** -501 (+3725 / -4226) production lines; [the Difference Viewer](https://claude.ai/artifact/NGhVrgJyUaPugSUM1PfDEn) shows the whole range, tests included (285 files, +6450 / -6504)

#### The Plan, Plainly

Saved views worked, but the code behind them had grown by accretion: the same idea was built two or three times in different places. A view type was defined in three separate tables, Table and Cards each wired themselves to the view by hand, the settings panes had two doors with three different routers, and renaming, folding groups open and closed, indentation, row locking, and the view list's rows each existed in more than one version. The plan set out to state each of those once, remove what was left over, and leave the views ready for List, Gallery, Calendar, and Timeline without building any of them — removal first, with fewer lines as the north star.

#### What Was Done

Eleven phases landed in order, each reviewed by two agents before the next opened, then three review waves over the whole range, a zero-context neutral review, and live drives of the real app at every checkpoint from Phase 6 on.

- **View Kinds:** each built kind is one small record (`Table/tableKind.ts`, `Cards/cardsKind.ts`) found through one lookup (`Host/viewKinds.ts`), and an unbuilt kind falls back to Table in exactly one place.
- **Settings Panes:** the toolbar's dropdown and the settings door open the same panes through one table (`Settings/ViewPane.tsx`).
- **Table and Cards:** both renderers take one interaction layer (`Host/useViewInteractions.tsx`) for clicks, drags, the ghost row, new pages, and renaming, and draw only their own look.
- **Saving a View:** every write goes through one live record (`Host/liveView.ts`), which paints a change ahead of its save and puts a refused drop back.
- **Trash and Archive:** their table draws its own heading, left-aligned.
- **Rows and Menus:** one chevron, one indent step, one lead cell, and one lock rule across the drag engine; the floating menu shell is `MenuBase`, filed with the menus.
- **Housekeeping:** nine misfiled root files dissolved into their owners, the documents that went false were rewritten shorter, and I-040, I-059, I-069, and I-070 closed.

#### What You'll Notice

- A page created from a view opens its name field with its row, and a Cards rename no longer flashes the old title.
- Tab treats a grouped list as one stop: band chevrons and New Page buttons no longer take Tab stops, Enter folds a band, and a list keeps its stop however its focused row disappears.
- Trash and Archive dates left-align under their heading.
- The Filter's lists follow Native Menus, and its Checkbox operators read Checked and Unchecked.
- Both page-icon switches read Title Icons, and Cards' pickers open over the pane like every other picker.
- A custom Set order also orders pages inside a band, and empty option bands show under Sets as they do at the top level.
- Hide Disclosure Chevrons reaches the sidebar and the Grouping pane.
- A page created during a view's search stays shown until you leave the view, and a tile's view dropdown reorders by drag.
- A row that can't move no longer tells a screen reader to press Space to pick it up.

#### What Matters Going Forward

- **A New View Kind:** one record file beside its renderer and one entry in `viewKinds.ts`; the renderer supplies its look and hands its rows to `useViewInteractions`. Per-kind switches written anywhere else are the old shape returning.
- **A View's Saved State:** changes go through `useSaveView` or `dropIO` in `liveView.ts`, never a direct write to `_pagecollection.json`, since that's where painting ahead and putting refused drops back live.
- **A New Settings Pane:** one entry in `VIEW_PANES`, and both doors pick it up.
- **Rows:** a row that can't move takes `immovable`; indentation reads `rowIndent`; folding uses `Disclosure` and `DisclosureChevron`. Hand-rolling any of these restarts the duplication this work removed.
- **Floating Panes:** every anchored pane is a `MenuBase`.
- **The Views Drive:** `.claude/scripts/Views Drive/` holds the views' interaction matrix, 215 cases against the real app; run it after any view change.
- **The Drag Engine's Tab Stop:** a list lends its Tab stop to whichever row holds focus and takes it back when that row leaves; three review waves each found a way it could go wrong, and its three pins in `engine.test.tsx` now hold every exit.
- **Test Temp Folders:** the test suites leave their temp folders in the system temp directory on every run; this run alone left 4,140, now removed. The fix is a follow-up of its own, partly in `Sync/`'s tests.

#### Your Calls

**Placements:** the plan gives every file placement to you.
- `ViewList` and `viewNameField` live in `Settings/ViewFrame.tsx` while a tile imports them; their own `Settings/ViewList.tsx` would be easier to find.
- `paneTargets.ts` stayed at the `Views/` root while every other pane concern sits under `Settings/`.
- `RenamableName` lives in `Interface/RenamableTitle.tsx`, a file named for the fence wrapper.
- `rowIndent.ts` sits in `UIX/Table/` while the menus read it too.
- `ManageRow` sits in `UIX/Pickers/` while picking nothing; `UIX/Menus/` would hold it.
- `.table-shell` serves both the shared shell and the Table kind, in `table-view.css`; the three options are renaming the sheet, scoping the band rhythm apart, or splitting the three shell rules out so the Archive imports no Table sheet.

**Smaller Behavior:** each is rare or narrow, with my stance beside it.
- A refused cross-parent Set nest in a view that never stored a Set order, followed by a second Set drag inside the same round trip, saves the first Set's painted slot. The fix writes the view on every cross-parent nest. Leave it.
- A lone row in list zones beyond the view lists (an icon favorite, a property alone in its group, a lone option, a lone outline heading) still offers a keyboard pick-up that goes nowhere. Worth a small follow-up beside I-059's close.

**Names Left Behind:** the menu shell's portal attribute and bloom animation still say "picker" (about 30 tests and 11 drives select the attribute); `data-line-immovable`'s `line-` prefix now marks displace items too; the type `Disclosure` shares its name with the sidebar's `Disclosure.tsx`; `treePane`'s width clamp is written in both repos; `caretPane.tsx` spells the pane's bounds a third time.

**Untested Look:** no test asserts the Trash and Archive dates' left alignment (Behavior Change 9); the drives confirm it on screen.

#### Verification

- **Gates:** typecheck and lint clean; 9,269 passed and 2 skipped across 546 files; `npm run build` read `✓ built in 3.40s`; production comments 3,492 against the 3,517 cap; `git diff --stat cae07c129..HEAD -- Core/Sync Sync` printed nothing; the atlas check read 17 of 17 tables true.
- **Reviews:** two reviewers at each of the eleven checkpoints; Wave One (simplification, inward and outward), Wave Two (adversarial, inward and outward), and Wave Three (a final look, run because Wave Two moved the Tab-stop restore into the drag engine), each folded and driven; the neutral gate twice. Every finding was folded or recorded under *§Deviations* with its reason.
- **Live:** from a worktree of `fb13015e3`, the Views Drive held 215 of 215, the Archive Drive 159 of 159, and the Properties Drive's groups 18 and 19 67 of 67, `~/Test` restored after each.
- **Cold-Machine Check:** `git worktree list` showed the main checkout alone; no `pommora-drive-*` folder remained; the process list showed only your own instance on port 9333; `git status --short` showed only the plan's own records before their commit; `~/Test` hashed `e5a32a5d30d6a11310cd559ee2b1b84b261c3265`, Run Start's.

#### Line Count by Phase

| Phase | Net |
|---|---|
| 1 · The Kind Record | +11 (+146 / -135) |
| 2 · The Views Root and the Live View | -92 (+901 / -993) |
| 3 · One Pane Route | -176 (+1573 / -1749) |
| 4 · The Table and the Second Table | -338 (+1799 / -2137) |
| 5 · The Host and Its Renderers | -443 (+2255 / -2698) |
| 6 · The Pipeline and the Bands | -550 (+2452 / -3002) |
| 7 · Disclosure and Rows | -563 (+2740 / -3303) |
| 8 · View Tiles | -511 (+3166 / -3677) |
| 9 · MenuBase | -513 (+3435 / -3948) |
| 10 · One Lock per Row | -492 (+3611 / -4103) |
| 11 · Docs and Issues | -492 (+3611 / -4103) |
| Wave One | -512 (+3647 / -4159) |
| Your Rulings | -500 (+3719 / -4219) |
| Waves Two and Three | -498 (+3726 / -4224) |
| **Final** | **-501 (+3725 / -4226)** |

Each row is cumulative from `cae07c129`, measured after its checkpoint's fold. The plan estimated -352; the work landed 149 lines further under it.

#### Deviations

*Implementation Plan · §Deviations* holds each in full. In brief:

- **Phase 1:** `GroupFrame`'s writer prop scheduled to read `ViewWriter`, landed at Phase 7.
- **Phase 2:** I-070's refused-drop arm re-placed a row only where the live order still holds the drop's slot; the fold's commit carries an Opus trailer.
- **Phase 3:** the editor's Layout leaf owned by `ViewEditor`, keeping editor-only props off the shared pane table.
- **Phase 4:** the column resize derived its state from its width; `.bundle-date` scheduled out.
- **Phase 5:** the unranked-drop prior; the interactions hand renderers `onGhostClosed` and `holdGhost` rather than the raw anchor.
- **Phase 6:** one `setBands` builder; the Set drop's prior; the Views Drive built and every closed head replayed.
- **Phase 7:** the scheduled folds; `RowLead` taking its grip as a child; the Studio dashboard following the kit.
- **Phase 8:** `SavingViewPane` reading the live view; a tile's lock read at write time; `orderSetTree` replacing `orderedChildren`.
- **Phase 9:** the pane constants renamed with the shell; the dashboard following again.
- **Phase 10:** drag items took the same `immovable` lock as line rows, closing I-059's displace half.
- **Phase 11:** the documents and footnotes re-cited, the atlas reading true again.
- **Wave One:** the first Tab-stop fix and nine simplification folds; the view-delta kit followed `MenuBase`.
- **Your Rulings:** recorded with their two pins.
- **Waves Two and Three:** the Tab-stop restore moved to an item's detach and widened to every item; the search exemption narrowed to creates made while searching; a tile's reorder kept its view mounted.
- **The Neutral Gate:** the header renames' dead guards removed; the Views Drive's search-end case corrected to read the live header.

#### The Neutral Gate, Verbatim

##### First Run, at `9d654fe78`

> ## Verdict: Pommora `cae07c129` → `9d654fe78`
>
> Affected test dirs (Core/Views, Tiles, Bundles, Settings, Trash, Archive, Sidebar; UIX/Menus, Table, Elements, Interactions): 129 files / 2202 tests pass. Net −51 lines over 285 files.
>
> ### 1. Preference: Yes
>
> A zero-context reader prefers the after. The before made a reader hold a view kind across three tables (`LAYOUT_OPTIONS` in LayoutFrame, the renderer switch, `pickView`'s fallback) with the Table default written in two of them; the after has one `ViewKindRecord` per kind (`Table/tableKind.ts`, `Cards/cardsKind.ts`), one registry (`Host/viewKinds.ts`), and one fallback (`presentedKind`). `LayoutFrame`'s `door: 'flat' | 'full'` union — one component rendering two unrelated shells — is gone; both settings doors now build their index from `VIEW_PANES` through `chevronRows` and open leaves through `ViewPane`. `useViewHost`'s return shrank from ~45 fields (including `mutate`, `openTarget`, `tree`, `effectiveValues`, `seatHost`) to what the renderers and the two policy hooks read; pointer behavior lives once in `useViewInteractions`. `stageView`/`unstageView` went private inside `liveView.ts`, so the only write path is `useSaveView`/`dropIO`. Five root files (`filterModel`, `visibilityModel`, `reassign`, `creationOrder`, `deleteViewWithUndo`, plus `containerConfig`, `viewWrite`, `pageRow`) dissolved into real owners, and `container:configure` left the bridge for a `setViewButton` mutate op. `pruneGroups(groups, drops)` replaces two prune walks; `orderSetTree` replaces `bandOrder.orderGroups` by ordering the input tree instead of re-walking the output. `rowIndent` reads one `--disclosure-indent`; `RowLead` absorbs `RowRail`; `DisclosureChevron` is the one chevron for sidebar, menus, bands, and bundle rows. Files are smaller where it matters (TableView 502→393, CardsView 917→843, ViewTile 678→535, SettingsFrame 190→146).
>
> ### 2. Corrections, most important first
>
> 1. **The Layout pane is composed two ways.** `Core/Views/Settings/ViewFrame.tsx:201-211` hand-builds the dropdown editor's Layout leaf (VisibilityFrame + switches for `leaf: 'visibility'`, bare switches otherwise) while the settings door routes `'layout'` through `ViewPane` → `LayoutFrame` (grid + switches + kind rows). `ViewKindRecord.layout.leaf` is read by exactly that one ternary and ignored by `LayoutFrame`; `VisibilityFrame`'s `current` prop (`VisibilityFrame.tsx:76`) exists only to be relabeled "Layout" there; `EDITOR_PANES` (`ViewFrame.tsx:144`) filters `'visibility'` out because the editor folds it into Layout. One pane id, two contents, one door bypassing the table it's meant to route through — this contradicts the intention's own sentence. Fix: give `LayoutFrame` the composition (grid shown or not, visibility folded or not), have it read `leaf`, and let `ViewEditor` go through `ViewPane` for `'layout'` like every other pane.
>
> 2. **Column-heading markup stated three times.** `ColumnHeader.tsx` was deleted and `<div className="col-header"><span className="col-header-icon"><Icon/></span>{label}</div>` is now inlined at `Core/Views/Table/TableView.tsx:182-194` and twice at `Core/Bundles/BundleTable.tsx:133-147`. The CSS is one way (`UIX/Table/table.css`); the markup isn't. Moving the resize gesture into `useColumns.ts` was right; the head cell should be a small `ColumnHead` beside `RowLead` in `UIX/Table`, consumed by both.
>
> 3. **View-rename guard stated twice, and in the wrong layer.** `ViewFrame.tsx:189` and `SettingsFrame.tsx:121` both hand-write `if (name && name !== view.name) void save({ name })` under `InlineEditHeader`. `RenamableLabel` already suppresses empty (`required`) and unchanged (`next !== value ? commit : onCancel`, `RenamableLabel.tsx:69-71`) commits, so the list rows (`ViewFrame.tsx:319`, `ViewTile.tsx:426,524`) commit cleanly without a guard. `InlineEditHeader` (`UIX/Menus/InlineEditHeader.tsx:57`) passes `onCommit` straight through. Fix: give `InlineEditHeader` the same empty/unchanged suppression and delete both guards.
>
> 4. **`ViewList` lives in the wrong file.** `Core/Tiles/Surfaces/ViewTile.tsx:31-32` imports `ViewList` and `viewNameField` from `Views/Settings/ViewFrame` — a tile surface reaching into the toolbar dropdown's frame for a list row. Sharing the row was right; a reader looking for it by filename won't find it. `Omit<NameRename, 'path'>` is also spelled three times (`ViewFrame.tsx:166,230`, `ViewTile.tsx:324`). Fix: `Core/Views/Settings/ViewList.tsx` exporting `ViewList`, `viewNameField`, and a named `ViewRename` type.
>
> 5. **`ROOT_ROW_LOOK` dropped `solid`.** Before, card rows used `CARD_ROW_LOOK = { iconSize: ICON.rootEntry, solid: true }`; after, `cardsKind.ts` uses `ROOT_ROW_LOOK = { iconSize: ICON.rootEntry }` (`UIX/Menus/frames.css.ts:28`). Either the Card Image/Style/Scale rows lost their solid look as an unflagged visual change, or `solid` was dead; confirm which and either restore it on the record or note it as intended.
>
> 6. **Placeholders carried through.** `ViewFrame.tsx:289` (`// PLACEHOLDER` + disabled ellipsis), `SettingsFrame.tsx:106` (the identical disabled ellipsis footer, uncommented — so the placeholder is itself stated twice), `VisibilityFrame.tsx:48`. All pre-date the work, but a pass whose banner is "nothing left over" touched both footers and kept them. Either one shared footer or none.
>
> 7. **`ViewPane.tsx:27` "The singular here is intentional."** It doesn't say singular *what* (the labels? the type name?). A reader can't act on it; name the thing or drop the line.
>
> 8. **`MenuBase` still wears the picker's clothes.** `UIX/Menus/MenuBase.tsx:35` `PICKER_PORTAL_ATTR = 'data-picker-portal'` and `pickerBloom` (`:11,291`) — the shell was renamed but its attribute and animation still name the one client it used to be. Minor, but it's exactly the "odd one out" the standard calls out.
>
> 9. `reassignTarget` (`useViewInteractions.tsx:531`) is exported only for its test — pre-existing, but the move was the moment to make it a module-private with a behavioral test.
>
> ### 3. Strengths to keep
>
> - `presentedKind(type)` as the single Table fallback; `BUILT_KINDS` as the one gate on which kinds are selectable (`LayoutFrame.tsx:339`).
> - `stageView`/`unstageView` private to `liveView.ts`; every write enters through `useSaveView` or `dropIO`, and `dropIO.persistAfter` is the one paint-ahead-then-settle rule for row drops.
> - `useViewInteractions` as the one pointer policy both renderers take, with each kind supplying only `ghost`/`seat`/`newPages`/`item`.
> - `pruneGroups(groups, drops)` with a predicate, `orderSetTree` ordering the input instead of re-sorting the output, `pruneHiddenSets` ahead of resolution.
> - `viewTileEntry.ts` as the tile's explicit counterpart to `viewsFile.ts` — the two stores are legible side by side.
> - `rowIndent` on one `--disclosure-indent`; `RowLead` owning the rail; `DisclosureChevron` with `chevron | spacer | none` as the one chevron everywhere.
> - `container:configure` leaving the bridge for a `mutate` op — the bridge got smaller, not wider.
> - `pageValues.ts` as the host-side record and `viewRow.ts` as the renderer-side one, with `Core/Contract/bridge.ts` importing only the former.

##### Second Run, at `6eb700dd0`, After Its Fold

> ## 1. Preference
>
> **Yes.** The after is the one a zero-context reader wants. Production code is net −526 lines (+3,822 / −4,348, tests excluded); Desktop source is untouched; `npm run typecheck` is green; no stale name (`pendingView`, `RowRail`, `PickerMenu`, `ViewLeaf`, `viewWrite`, `switchRows`, `paneRows`, `containerConfig`, `useColumnStyles`…) survives anywhere outside the untracked `Desktop/out` build. Nine root-level `Core/Views/*.ts` files (`creationOrder`, `deleteViewWithUndo`, `filterModel`, `handlers`, `pageRow`, `reassign`, `viewWrite`, `visibilityModel`, `containerConfig`) are gone, their rules now sitting beside their owners (`Pipeline/columns`, `Pipeline/group`, `valueKinds`, `Host/liveView`, `Settings/ViewFrame`). The concrete wins a reader meets first:
>
> - A view kind is one record (`Table/tableKind.ts`, `Cards/cardsKind.ts`) holding renderer, `nests`, switches, and extra rows, looked up once through `Host/viewKinds.ts:presentedKind` with one Table fallback. Before: `VIEW_RENDERERS` in ViewHost, `nests` in `views.ts`, `LAYOUT_OPTIONS` in LayoutFrame, and `?? TableView` / `?? TABLE_LAYOUT` written separately.
> - `Host/useViewInteractions.tsx` is the one place every row/band/ghost/menu gesture is defined; `TableView` and `CardsView` supply a policy object and presentation only. TableView 475→~390 lines, CardsView 396→~840 but absorbing what was spread across `cellSweep`, `ColumnHeader`, and host wiring.
> - `Settings/ViewPane.tsx` is the single pane table (`VIEW_PANES` + `ViewPane` switch + `chevronRows`) that both doors (`SettingsFrame`, `ViewFrame`) route through; `ViewLeaf`, `paneRows`, `switchRows` and the `door: 'flat' | 'full'` union are gone.
> - `BundleTable` now draws its own `table-head` from two `Heading` props; Archive and Trash stopped hand-building headings and their per-skin CSS (`archive-date`, `trash-head-*`) is deleted.
> - Single hoisted rules replace repeats: `isSelected` (navigationSlice), `DetailPlaceholder` (replacing three hand-rolled `.detail-placeholder` blocks), `useDateForms`, `orderInTree`/`paintAhead`, `runViewRowAction`, `insertDuplicate` shared by `viewsFile.ts` and `viewTileEntry.ts`, `RowLead` owning the rail, `DisclosureChevron` + `unfolded` shared by bands and menus, `immovable` replacing the `locked` / `fixed` / `disabled` triple in the drag engine.
> - `pageValues.ts` breaks `Contract/bridge.ts`'s import of the renderer-side `viewRow.ts`; `cells.css` moved from `UIX/Table/table.css` to `Properties/Cells`, its owner.
>
> ## 2. Corrections (most important first)
>
> 1. **`Core/Views/Settings/ViewFrame.tsx:199–220` — the Layout pane is composed by hand in one door.** `ViewEditor` special-cases `pane === 'layout'`, importing `typeGrid`/`kindSwitches`/`kindRows` out of `LayoutFrame.tsx` and reading `ViewKindRecord.layout.leaf` — the only consumer of that field. The Settings door's `LayoutFrame` ignores `leaf` entirely, so the "one pane table" has a hole exactly where the kind record points, and `EDITOR_PANES = VIEW_PANES.filter(...)` (line 147) is a second exception. Fix: make `ViewPane`'s `'layout'` case honor `leaf` for both doors (LayoutFrame takes a `typed?: boolean` or similar for the editor's root-hoisted type grid), and stop exporting the three composers from LayoutFrame.
> 2. **`Core/Views/Settings/ViewPane.tsx:26` — `// The singular here is intentional.`** Added by this work; it defends a name against a presumed reviewer and states no reason. Delete it, or if `SettingsPane` for a row entry genuinely needs defending, rename the type (`PaneEntry`).
> 3. **`orderSetTree(x.sets ?? [], viewSetOrder(plan, view))` stated four times** — `Pipeline/resolveView.ts:44`, `Settings/GroupFrame.tsx:364`, `Settings/ViewPane.tsx:76–80`, `Cards/CardsView.tsx:125`. ViewPane additionally rebuilds `groupPlan(view, schema, presentedKind(view.type).nests)` from scratch when `useViewHost` already holds `plan`. Fix: one `orderedSets(source, plan, view)` in `Pipeline/group.ts` (or an `orderedSets` key on the host), and pass `plan` into ViewPane.
> 4. **`Core/Views/Settings/ViewFrame.tsx:75–145` — `ViewList` and `viewNameField` live in one door's frame file** and are imported by `Core/Tiles/Surfaces/ViewTile.tsx:31`. The shared row has no home of its own; a reader looking for "the view list row" has to know it's inside `ViewFrame`. Fix: `Core/Views/Settings/ViewList.tsx` owning `ViewList` + `viewNameField`; both doors import it.
> 5. **Disabled "More actions" footer, twice** — `ViewFrame.tsx:287–293` (marked `// PLACEHOLDER`) and `SettingsFrame.tsx:106` (unmarked). Pre-existing, but both files were rewritten in this sweep and still ship a labeled no-op control; the owner's rule is that placeholders stay blank. Fix: remove the button in both, or mark both identically if it must stay.
> 6. **`Core/Views/Host/useViewHost.ts:178–215` — the return still carries keys no renderer reads.** `overrideValues`, `groupPropType`, and `persistView` reach only `useViewCreation` / `useViewInteractions`. Minor against the stated intention ("only what renderers read"); either accept the host as the shared bag or move those three onto the interactions result.
> 7. **`Core/Session/store.ts:17` imports `DateForms` from `Properties/columnStyles`** — a Session module reaching a Properties leaf for what is a settings shape. Fix: define `DateForms` in `Settings/personalization.ts` (where `TimeFormatSetting` already lives) and have `columnStyles.ts` import it.
> 8. **`Core/Views/paneTargets.ts` stayed at the `Views/` root** while every other settings-pane concern moved under `Settings/`. Placement only; move it.
>
> ## 3. Strengths to keep
>
> - **The kind record pattern** (`ViewKindRecord` + `BUILT_KINDS` + `presentedKind`): adding a view kind is one file and one map entry. Protect it by routing anything per-kind (layout leaf included) through it, never by a parallel table.
> - **Policy-vs-presentation split in `useViewInteractions`**: the renderer passes `{ ghost, seat, newPages, item }` and nothing else. Resist letting gesture logic creep back into `TableView`/`CardsView`.
> - **One drag vocabulary**: `immovable` on `LineRow`/`useDragItem` replacing `locked`/`fixed`/`disabled`; `lineList` lost its `locked` flag. Keep the engine's one word.
> - **Paint-ahead as data**: `paintAhead.ts` (tree orders) and `liveView.ts` (view patches) each hold one staging channel; `dropIO` composes both. The split is by data shape and is correct — don't merge them.
> - **Hoisted singletons**: `isSelected`, `DetailPlaceholder`, `useDateForms`, `runViewRowAction`, `insertDuplicate`, `RowLead`, `DisclosureChevron`/`unfolded`. Each is the obvious place for the next change of its kind.
> - **CSS moved to its owner** (`cells.css`, `disclosure.css.ts`, `menu-base.css.ts`) and **tests moved with their files** (`pageRow.test → viewRow.test`, `PickerMenu.test → MenuBase.test`, `bandCommits.test → Bands/bandDrops.test`). Keep co-location as the default.
> - **`Contract/bridge.ts` no longer imports from the renderer half** via `pageValues.ts`; that boundary is worth a guard in `engineGraph.test.ts` if it isn't already covered.
