### Metadata Picker — Investigation

**DATE:** 11-01-2026
**HEAD:** `16d932567` on `active`, verified against the working tree.

This document reconciles six planning scouts (the two pickers; lists and right-click; the flip; kit structure; adjacent fixes; testing and docs) against *Metadata Picker — Decisions & Intention*, ratified 11-01-2026, including C-9, D-7, F-5 to F-7, The Stop, Cold Machine, and the extended E-2. Every claim kept here was re-read in the code at HEAD, and where scouts disagreed the cited evidence decided. The six reports in `Scouts/Planning/` read true alongside this document and hold the full hunks; this document states the one resolved answer for each design point, and the reports' section names are cited where a hunk is too long to repeat. *§What's True* and *§What's Reusable* state how the code works today. Every later section states what should be true, in the present tense of the finished code wherever a signature or a hunk reads more clearly that way.

**Result:** nine phases, a production delta of about **−470 lines**, five fewer production files, and ten remaining calls for Nathan (*§For Nathan*), one of which holds nine placements.

| Phase | Name | Production Delta | Basis |
|---|---|---|---|
| 0 | Drives and Pins | 0 | No production code |
| 1 | Kit Imports | About −54 | −54 built for the barrel; the moves are import paths |
| 2 | The Pane Shell | About +79 (+195 / −116) | +72 built; about +7 for I-027 from its hunks |
| 3 | Small Folds | About −16 | −4 built; −12 from hunks |
| 4 | The Two Pickers | −96 (+386 / −482) | Built |
| 5 | Settings Panes | About −70 (+46 / −116) | From hunks |
| 6 | One Icon and Color Request | About −170 | From hunks, counted per site |
| 7 | Right-Click | About −140 | From hunks; −125 to −155 |
| 8 | Closeout | 0 | Moves and docs |
| | **Total** | **About −470** | −82 built, the rest estimated |

---

#### What Was Built to Prove This

Scout 1's patch, Scout 4's kit, and Scout 3's flip were each built alone. Their seams were built together here, in a scratch export of `16d932567`, removed afterward:

- **Scout 1's Patch at HEAD:** `1 — Two Pickers.patch` applies cleanly; 548 test files, 9,074 passed, 2 skipped; typecheck clean on UIX, Core, Core src, and Desktop web.
- **The Merged Tree:** the patch, K-4, K-5, I-042's extraction, the fence, the slide's flip, the trigger rule, Open Item 2, the panel's commit fold, and Scout 2's Step 4, all together: the same 548 files, 9,074 passed, 2 skipped, and the same four type projects clean. Beyond renames and the two `connections` fixtures, the only test that needed a change was the one Scout 4 predicted (`GlancePane.test.tsx:597`).
- **K-1:** the codemod run over a fresh export of HEAD changed 51 Core files and came to exactly −54 (+75 / −129) once formatted.
- **The Trigger Rule:** a real Electron 42 probe. A `ResizeObserver` fires when its target is removed, for an HTML element and an SVG element alike, with `isConnected` already false.
- **In-Place Growth, Both Ways:** with a 300px pane over 234px of room, the recommended form stays below and rises (`top` 526 to 460), and the alternative's one clause flips it (`bottom` 274).

**Not Built Here:** Scout 2's Steps 5 to 7 and all of Scout 5 except the trigger rule are read from the code and written as hunks, so Phases 5, 6, and 7 carry estimates. K-2, K-3, K-6, K-8, K-9, and K-11 were built by Scout 4 in its own copy. No drive ran against the merged tree.

---

#### What's True

##### The Route

Every value lands through `seat.run` (`Core/Properties/Cells/ValueSeat.tsx:101`) or the chooser, drawn by the one `PropertyPicker` that `ValueSeat` mounts at `:277`. The chooser reaches it through `chooser`, `resolveTarget`, `onReveal`, and an `entry` argument on `onCommit`, threaded through `SeatChooser` (`:252-257`); the commit branches on `entry` for its row and column (`:296-300`). Four hosts call `useValueSeat`: `TableView.tsx:95`, `CardsView.tsx:198`, `PropertyPanel.tsx:79`, and `MenuSeat` (`ValueSeat.tsx:320`). `MenuSeat` is on every surface: views with their own seats still route a leaf through `requestPick` (`useViewInteractions.tsx:407-417`).

##### The Three Builders

| | Card's Add | Panel | System Menu |
|---|---|---|---|
| **Code** | `addEntriesFor` `cardColumns.ts:31-59`, `orderAddableEntries` `:67-69` | `PropertyPanel.tsx:164-186` | `propertyMenuBranches` `propertyMenuActions.ts:27-62` |
| **Context Order** | Hidden first, then fill-first | `config.order.contexts`, then `spaceNode.rowOrder` (`:174-176`) | Registry (`:59`) |
| **Property Order** | Hidden first, then fill-first | Schema, then `rowOrder` (`:177`) | Option kinds first (`:60`) |
| **Row Shape** | `AddEntry` then `PickEntry` | `Field` then `PickEntry` | `PropertyMenuRow` |

`resolveRowOrder` deletes each listed key after its first hit (`moveItem.ts:60-66`), so nesting two calls equals one call over the concatenated lists. Label and icon already come from `columnLabel` and `columnIcon` (`columnDisplay.ts:6-18`), and value from `resolveFieldValue`, memoized per frontmatter and definition (`fieldValue.ts:41`).

##### Two Meanings of "Held"

The panel asks whether the file names the field (`PropertyPanel.tsx:166-172`: a pending pick answers first, then `Object.hasOwn(fm, key)`, or a Context's ids); a card asks whether a value is there to show (`cardColumns.ts:50`). They differ only for a key present with a blank or unreadable value: `Done: false` (`propertyValue.ts:172-173`), `Stage: Gamma` with no such option (`:182-188`), and a bare `Stage:`. The app never writes that state (`rootValues.ts:14`, `propertyValue.ts:111-113`); external edits do, and an Obsidian checkbox writes `false`. C-9 keeps both meanings.

##### The Sweep

`cellSweep.ts` owns the gesture and the highlight. `TableView` holds `mass`, `massOpen`, and `massTriggerRef` (`:163-165`), a degraded-close effect (`:185-194`), and `massPicker()` (`:196-227`) with its own commit loop and `groupUndo`. `mass` is never cleared, so after any sweep `massPicker()` rebuilds a target and every row's value on each render for the life of the view. The mass pane sits 29px right of the single pane because it takes `origin` `auto` where `PropertyPicker` passes `right`.

##### The Page Menu

`titleMenuContext` (`useViewInteractions.tsx:395-402`) and `showEntityMenu` (`entityMenuActions.ts:45-64`) each build it; `runTitleAction` (`:405-435`) and `runEntityAction` (`:79-132`) each run it. What a host must supply is rename, icon, new page, and the row with its writer, since each of those depends on where its state lives. Cards lack Preview and Reveal Location, the Table lacks Reveal Location, and neither has a reason (`pageMenu.ts:119-137`, `cardMenu.ts:16-24`, `cellMenu.ts:117-126`). `cellMenuContextFor('title', …)` is dead in production: the Table routes a title to `openTitleMenu` (`TableView.tsx:232-233`), and cards filter title out (`cardColumns.ts:24`).

##### The Shell

`PickerMenu` decides its side once (`UIX/Pickers/PickerMenu.tsx:207-217`), once more for content a child builds in an effect (`:279-286`), and keeps it. `anchorX` means a point's x beside `anchorY` and a horizontal override without it (`:187-197`, `:203`). Only the lowest shielded layer draws a shield (`dismissalStack.ts:122`), so a list over a shielded pane draws none and its press lands. The side rule is stated twice (`PickerMenu.tsx:209-214`, `Core/Matrix/MatrixLabel.tsx:107-108`).

##### The Slide's Timeline

A click sets `open`; the detail mounts in slot B (`FrameSlide.tsx:42-44`), and a frame later `active` flips (`:37`). `ResizeObserver` measures B into `size` in that same commit. The commit that changes `active` writes the new height with only the width transition on, and the layout effect at `:67-75` then sets `navigating`, adding `viewportNav` before paint. A layout read between those two commits flushes styles with no height transition and snaps the height, proven live by Scout 3 (204 to 327 in one frame), so a pane may read layout only in the `navigating` commit or later. The height then eases over 280ms on `ease`.

##### The Kit's Imports

`UIX/Menus/index.ts` (31 lines) has 51 Core importers, 49 Core files import Menus by path, and 26 do both. Nothing inside UIX imports it, and `Theme` and `Symbols` are the only other indexes. Menus reaches Pickers at `ManageRow.tsx:3`, `MenuIndex.tsx:7`, and through `MenuIndex.tsx:5` to `Controls/ColorSwatch.tsx:2` to `ColorPicker`. `npm run typecheck` ends in `tsc -p ../../.claude/dashboard` (`package.json:20`), and the dashboard, committed in The Studio's repo, imports the barrel from six files and `PickerControl` from two.

##### Two Summon Models

There are 13 `IconChoice` mounts and 5 `ColorPicker` mounts. Eleven of the 13 icon sites hold local open state; two (`Sidebar.tsx:299`, `MatrixLabel.tsx:159`) read the store's `iconPath`/`iconHost` (`editSlice.ts:34-41`), which exists because `runEntityAction` is a module function with no component. `colorHost` is only ever `'matrix'` (`entityMenu.ts:85`), and `beginIcon`'s `?? 'sidebar'` (`editSlice.ts:153`) is unreachable. `ViewFrame.tsx:226-233` is the only production site that omits a trigger, which is F-1's anchor bug. `ValueSeat.tsx:87-90` states the rule that a pane whose anchor left the page closes, for its own panes only.

##### Settings Panes

Frames that state their own ceiling can't vary by route; `VisibilityFrame` and `FilterFrame` take theirs from a caller, and the Property list passes none (`PropertyFrame.tsx:354`), so their heights depend on route or pane. Floors live in `frame-slide.css.ts:4-6`, `ViewFrame.tsx:41`, and `filter-frame.css.ts:7,20`; the ceiling lives in `frames.css.ts:129-130`. Four back shapes exist among settings frames (`GroupFrame.tsx:115-116`, `VisibilityFrame.tsx:80-83`, `FilterFrame.tsx:219`, `PropertyFrame.tsx:355`), and `MenuPresenter.tsx:26` carries a fifth. `setFrame` is reachable only inside `door === 'full'` (`LayoutFrame.tsx:258-270`), so the flat door's slide at `:278` can't open.

##### The Baseline

`npm run test` is 548 files, 9,072 passed, 2 skipped; `typecheck` and `lint` exit 0. Seven drives pass at HEAD except Properties, whose group 15 crashes at `live-drive.mjs:1100` because `27500c110` dropped the `Date format` labels; repaired, it reaches 78. `reveal-parity` can't start, since the `test` preset writes neither `Collection C/Window One.md` nor `_tiles.json`. All seven take about 29 minutes in series, and two drives at once kill each other (`drive-harness.mjs:563`). No drive presses a back bar on a slid pane, slides from the Add list, opens a file dialog, presses Reveal Location, right-clicks a Matrix node, or checks a window edge.

---

#### What's Reusable

- **`pickOver` and `pickCommits` (`pickModel.ts:21-45`):** already the plural model, so one row and many are one path.
- **`Level` (`MenuPresenter.tsx:61-65`):** `MenuScrollFrame maxHeight={PICKER_MAX_HEIGHT} header={…}` is the shape every in-pane list takes, and it puts the bar inside the 240 limit.
- **`groupUndo` (`undo.ts:36`):** already returns on an empty group, so a single value is a group of one.
- **`flushSync` Before a Read:** `MatrixView.tsx:68` sets the precedent ("Committed before the menu asks for it").
- **`popMenu` With `{ solid, compact }`:** `PickerControl.tsx:118` passes `compact: true`, which leaves a list its content width (`MenuPresenter.tsx:58-59`).
- **`requestPick`/`MenuSeat` and `presentMenu`/`MenuPresenter`:** the request-slot and App-level-mount pattern `pendingChoice` copies.
- **The Shield and `beneathShield` (`dismissalStack.ts:58-66`):** a press's target is read beneath it, so a list can draw its own without new stack logic.
- **`joinGroups` (`menuModel.ts:28-32`):** states separators, which keeps menus' groups out of hand-placed flags.
- **`runPageAction` (`pageMenuActions.ts:35-75`):** already answers Preview and Reveal Location, so cards and the Table gain both with no runner work.
- **`viewRowMenuItems` (`viewRowMenu.ts:11`):** already models Duplicate and Delete.
- **`ownIcon` (`treeIndex.ts:27`):** the value the sidebar's picker already reads.
- **`InlineEditHeader`'s Icon Props (`InlineEditHeader.tsx:9-13`):** `icon`, `iconRef`, `iconOpen`, and `onIconClick` are what `useIconChoice` returns, so F-5 needs no kit change.

---

#### What Leaves

Listed by phase; the phase that makes each removal carries it.

##### Phase 1

| What | Where |
|---|---|
| `UIX/Menus/index.ts` and its export entry | whole file; `UIX/package.json:5` |
| Every `from '@pommora/uix/Menus'` | 51 Core files, 6 dashboard files |
| `PickerControl.options.test.ts` (folds into `PickerControl.test.tsx`) | `UIX/Pickers/` |

##### Phase 2

| What | Where |
|---|---|
| `anchorY`, `anchorHeight`; `anchorX` splits into `at` and `centerX` | `PickerMenu.tsx:85-87,109-111` |
| `PinnedGlance`'s `anchorX`, `anchorY`, `anchorHeight` (become `at`) | `glanceSlice.ts:11-13` |
| `measure`'s body, `VIEWPORT_MARGIN`, `PickerDirection`, `ANCHOR_RESERVE`, `CORNER_CLEAR`, `Pos`, and the `clamp` and `GAP` imports (all move to `panePlacement.ts`) | `PickerMenu.tsx:20-21,28,39,41-44,46-52,202-243` |
| `MatrixLabel`'s copy of the side rule and its import from a component file | `Core/Matrix/MatrixLabel.tsx:6,108` |
| `SLIDE_MS` and the `duration, ms` import | `FrameSlide.tsx:3,7` |
| The two windows' inline copies of the base feel | `NavWindow.tsx:62`; `PageWindow.tsx:83` |
| The comment "Reaches the trigger even when the menu took the left press" | `PickerControl.tsx:159` |
| Unreachable toggle arms | `CalendarPicker.tsx:266,493` |
| `h` on `CalendarPicker`'s `Anchor` (becomes `height`) | `CalendarPicker.tsx:35,38` |
| The centering test block's DOM faking | `PickerMenu.test.tsx:452-520` |

##### Phase 3

| What | Where |
|---|---|
| `NeutralChip` and `colorNameFor` imports and all three chip choices | `PropertyPicker.tsx:18-19,224-228`; `FilterFrame.tsx:14,48,157-175`; `Cell.tsx:6,19,101-104` |
| The `value` re-key | `pickModel.ts:13` |
| `direction="down"`, the default | `FieldPicker.tsx:40`, `ColorPicker.tsx:25`, `TextPane.tsx:38`, `OptionEditPopup.tsx:55` |
| `CalendarPicker`'s duplicate import | `CalendarPicker.tsx:16` |
| `connections`' optional marks | `valueContext.ts:19`, `ValueSeat.tsx:42,174`, `PropertyValueInput.tsx:32,38,41`, `LinkCell.tsx:42`, `TextCell.tsx:50`, `PropertyPanel.tsx:86` |
| The panel's second commit function | `PropertyPanel.tsx:159-162` |

##### Phase 4

| What | Where |
|---|---|
| `MassPropertyPicker.tsx` | whole file (35 lines) |
| `PickEntry`; `chooser`, `onReveal`, `resolveTarget`; the `entry` commit argument | `PropertyPicker.tsx:56-63,67,72,74,77,81,82,84` |
| `picked`, its reset effect, `t`, `commit`, `entryRow`, `spaces`, `rest`, the chooser branch | `PropertyPicker.tsx:87-93,126-141,152-184` |
| `open` on `PropertyPicker` and its `useHeld` | `PropertyPicker.tsx:35,68,78,86` |
| `chooserTop`, its `topRow` import | `property-picker.css.ts:2,4` |
| `MenuTopRow`'s `className` and its `cx(…)` wrap | `MenuRows.tsx:35,41,51` |
| `mass`, `massOpen`, `massTriggerRef`, `massDegraded`, `massPicker()`, the `groupUndo` loop | `TableView.tsx:163-165,185-194,196-227,379` |
| `SeatChooser`, `chooser` prop, `!chooser &&`, `resolveTarget` lambda, dual commit, dual dismiss | `ValueSeat.tsx:251-257,262,265,280,284-293,296-305` |
| `'dateTime'` intent | `valueClick.ts:13,37-38`; `ValueSeat.tsx:130-131` |
| Public `run`, `intentOf` | `ValueSeat.tsx:248` |
| The open-away rule's two copies | `ValueSeat.tsx:342-348`; `CardsView.tsx:495-500` |
| `AddPickerRequest`, `openAddPicker`, `addableFor`, `addPicker`, the orphan effect, `addRow`, `addEntries`, the emptied banner, the `chooser` prop | `CardsView.tsx:76-79,97,101,162,177,215,218-225,275-278,282,476-508` |
| `addEntriesFor`, `AddEntry`, `orderAddableEntries` and eleven imports | `cardColumns.ts:2-11,31-69` |
| `addOpen`, `hidden()`, `revealAndEdit` and its rAF, the standing branch, the `chooser` prop | `PropertyPanel.tsx:67,98,140,183-186,250,260-269,372,405-412` |
| `Field`, `contextFields`, `schemaFields`, `nexusWide`, `fieldOf`, `contextValues` | `PropertyPanel.tsx:42,154,164,165,174,242-243` |
| Writes to `seat.anchor` | `CardsView.tsx:276`; `PropertyPanel.tsx:189` |

##### Phase 5

| What | Where |
|---|---|
| `ViewItemMenu.tsx` | whole file (65 lines); import at `LayoutFrame.tsx:32` |
| `maxHeight` props on `VisibilityFrame` and `FilterFrame`; the callers' passes | `VisibilityFrame.tsx:84,93,124`; `FilterFrame.tsx:211,221,493`; `ViewLeaf.tsx:10,48`; `MatrixMenu.tsx:14,129`; `LayoutFrame.tsx:213` |
| `label` + `onBack` props; the re-wrap | `GroupFrame.tsx:115-116`; `SortFrame.tsx:33-34`; `VisibilityFrame.tsx:80,82`; `ViewLeaf.tsx:19-20,47`; `PropertyFrame`'s `onBack`; `LayoutFrame.tsx:121,128` |
| `door`'s inline branches, `onClose` on `LayoutFrame`, the inert slide | `LayoutFrame.tsx:122,129,237-246,250-255,257-273` |
| `onClose={back}`, `schema`, `onBack` on the flat mount | `SettingsFrame.tsx:180-183` |
| `PANE_SQUARE`; `PANE_MIN_W`, `PANE_MIN_H` and their knob comment | `ViewFrame.tsx:41,223-224`; `frame-slide.css.ts:4-6` |
| `VIEW_SETTINGS_MAX_HEIGHT` (renamed) | `frames.css.ts:130` |
| The local name `FieldPicker` | `FilterFrame.tsx:62,407,421,422,463,475,482` |

##### Phase 6

| What | Where |
|---|---|
| `IconChoice.tsx` and its 13 mounts | whole file; `Sidebar.tsx:299`, `Banner.tsx:159`, `SpaceMenu.tsx:113`, `ViewTile.tsx:673`, `OptionEditPopup.tsx:99`, `PropertyFrame.tsx:406`, `ViewFrame.tsx:226`, `SettingsFrame.tsx:209`, `useViewInteractions.tsx:383`, `NexusIconEditors.tsx:16`, `PageHeader.tsx:91`, `PageMenu.tsx:88`, `MatrixLabel.tsx:159` |
| Four `ColorPicker` mounts | `SpaceMenu.tsx:123`, `ViewTile.tsx:688`, `ViewFrame.tsx:234`, `MatrixLabel.tsx:167` |
| `ColorSwatch`'s own `ColorPicker`, its import, `onPick`, `greyscale`, `useState`, `useRef`, `chipRef` | `ColorSwatch.tsx:1-2,12-13,18-19,22-23,28,45-55` |
| `iconFavorites.ts` (folds into `IdentityChoice.tsx`) | whole file |
| `iconPath`, `iconHost`, `beginIcon`, `endIcon`, `colorPath`, `colorHost`, `beginColor`, `endColor` | `editSlice.ts:34-41,59-62,153-156` |
| `SidebarIconChoice` | `Sidebar.tsx:284-315,370`; imports `:36,47` |
| `picking`, `endIcon`, `endColor`, `mutate` | `MatrixLabel.tsx:38,49,56-58`; imports `:5,8,12,17` |
| `iconPath`, `colorPath`, `pickingId`, `pickKind`, `picker` | `MatrixView.tsx:37-38,111-115,124-125,162` |
| `iconOpen`, `iconTarget`, `iconAnchor`, `openIconPicker`, `iconPicker` | `useViewInteractions.tsx:374-393,477`; `TableView.tsx:337`, `CardsView.tsx:472` |
| `iconFor` and `colorFor`, and `ViewFrame`'s `menuAnchorRef` | `ViewFrame.tsx:58-60`; `ViewTile.tsx:236-237,273-274` |
| `iconRef`, `colorAnchor`, `pickerOpen`, `colorOpen`, `openColor` | `SpaceMenu.tsx:33,35-37,46-49` |
| Ref-and-state pairs | `SettingsFrame.tsx:71-72`; `PageMenu.tsx:29-30`; `PropertyFrame.tsx:180-181`; `Banner.tsx:99-100`; `PageHeader.tsx:39,47`; `OptionEditPopup.tsx:46-47` |
| `'glyph'` editor state, `selectGlyph`'s export and its `closeEditor()` | `useNexusIcon.ts:14,23,41-42,67` |
| `NexusIconEditors.tsx` (its cropper becomes `useNexusIcon`'s `editor`) | whole file |
| `IconPicker`'s optional `triggerRef` and `onClose`; `IconPickerProps`' export | `IconPicker.tsx:24,26-28,42,61,90` |

##### Phase 7

| What | Where |
|---|---|
| `cardMenu.ts`, `cardMenu.test.ts`, `CardMenuAction`, the cast at `:22` | whole files |
| `propertyRows.ts`, `propertyMenuActions.ts`, and both tests (merge into `metadataMenu.ts`, 160 lines to about 100) | `Core/Actions/`, `Core/Interface/Menus/` |
| `PropertyMenuOption`, `PropertyMenuRow`, `propertyRow`, `propertiesRow`, `propertyBranchRows`, `PropertyMenuTarget`, `propertyMenuBranches` as an intermediate | `propertyRows.ts:3-13,19-50`; `propertyMenuActions.ts:21-62` |
| Option-first partition | `propertyMenuActions.ts:60` |
| `{ kind: 'title' }` and its arms, and the `:64-65` guard, since `type` becomes `ColumnType` | `cellMenu.ts:3-9,15,32-34,64-65,95,109,117-126` |
| `titleMenuContext`, `runTitleAction`, `TitleMenuContext` | `useViewInteractions.tsx:50,395-435,475-476` |
| Page branch of `entityMenuItems` | `entityMenu.ts:44-52` |
| `showEntityMenu`'s inline assembly; `runEntityAction`'s page line and arms | `entityMenuActions.ts:49-75,86,102,109-112` |
| `pageMetaMenuItems`' `window`, `reveal`, `spaces`, `properties`, positional `alreadyOpen` | `pageMenu.ts:120-127` |
| `alreadyOpen` and move context at callers | `Sidebar.tsx:44,45,80-81,88,91`; `MatrixView.tsx:9,12,63,76,78` |
| Card's `titleMenuContext`, `titleAction`, `popMenu`, `cardMenuModel`, `holdGhost`, `GhostSuppress.Provider` | `CardsView.tsx:1,44,49,69,70,99,100,280,281,381,509,919,927-936` |
| Table's `cellMenuModel`, `popMenu`, and two-step title menu | `TableView.tsx:4,40,147-159` |
| `GhostSuppress`, its Providers, and its readers (the sidebar's take `suppressWrap` from `SidebarGhostApi`) | `ghostCreate.ts:10-11`; `Sidebar.tsx:12,115,250,413,441`; `useBannerMenu.tsx:6,33` |
| `ValuePickRequest.holder`; `MenuSeat`'s kind branch and registry selector | `chromeSlice.ts:2,20`; `ValueSeat.tsx:6,316,322-327,333` |

##### What Stays, Deliberately

`hiddenListIds` for `VisibilityFrame.tsx:101`, so C-6 doesn't reach Visibility; `fillsBlank` for `CardsView.tsx:684`; `paneTargets.ts` for its four other readers; `propertyMenu.ts`, the Property Frame's ⋮ model; `cellSweep.ts`, the Table's gesture and highlight; `pickOver` and `pickCommits`; `oneShotWriter`, `requestPick`, and `pendingPick`; `valueClick.ts` as its own file; the `:279-286` effect in `PickerMenu`, the only path that re-decides a pane built by its children before first paint; `ValueSeat.tsx:87-90`, which also closes inline editors, which have no shell; `Trailing`'s `color` kind, since `ColorSwatch` reports its press rather than mounting a picker; and `ColorPicker`'s `open`/`onDismiss`/`triggerRef` contract, which `IdentityChoice` alone serves.

---

#### The Resolved Design

##### The Two Pickers

**`PropertyPicker.tsx`:** `PickTarget` should lose its shared `current`, with `currents` on the options arm and `current` on the date arm. `ValuePane({ target, header, onCommit, onClose })` should be the one pane body both pickers draw, and `PropertyPicker` should shrink to the shell around it, taking no `open` and no `useHeld`, since `PickerMenu` already holds its children and freezes placement through the exit:

```tsx
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

The seat's mount drops `open=`.

`header` threads into both `MenuScrollFrame`s (`:218,281`), so the bar sits inside the 240 limit. The calendar takes it above itself, uncapped.

**`MetadataPicker.tsx`:** a new component in `Core/Properties/Pickers/` taking only `seat`, written in *1 — Two Pickers* §5.3. It should carry no doc comment and import by path: `FrameSlide` from `@pommora/uix/Menus/FrameSlide`, and `MenuItem`, `MenuScrollFrame`, `MenuSeparator`, and `MenuTopRow` from `@pommora/uix/Menus/MenuRows`. Rows should use `size="control"` glyphs, with a `chevron-right` trailing only on `'slide'` rows. The back bar reads `GROUP_LABELS[column.kind === 'context' ? 'contexts' : 'properties']`, so "Spaces" holds on both surfaces (B-4). `key={column.id}` on `ValuePane` is what gives a second date its own value. The list keeps `minWidth={120}` alone, since `FrameSlide` applies its box to both slots (`:83`) and `maxWidth={180}` would clip the 215px calendar.

**`valueClick.ts`:** `'dateTime'` should merge into `'picker'`, and the Add outcome should derive from what a click means. `swept` stays off `ValueIntent`, since no click or menu can produce it. Stamps can't reach an Add entry, so the outcome needs no arm for a missing intent:

```ts
type EntryOutcome = 'show' | 'slide' | 'click'

export function entryOutcome(type: ColumnType, value: PropertyValue): EntryOutcome {
  if (!isBlankValue(value)) return 'show'
  return valueClickIntent(type, value)?.kind === 'picker' ? 'slide' : 'click'
}
```

**The Seat (`ValueSeat.tsx`):**

```ts
// SeatHost
/** Present where a surface adds metadata from a list: what the list holds for a row, how a held value shows, and, with `inPlace`, that a typed value edits where the surface shows it. */
add?: { columns: (row: ViewRow) => ItemColumns; show: (column: ResolvedColumn) => void; inPlace?: true }

type PaneOpen = { rowId: string; columnId: string; mode: Mode; seat?: ConnEditAction; x?: number; swept?: string[]; nonce: number }
type SeatOpen = PaneOpen | { mode: 'add'; rowId: string; group?: keyof ItemColumns; slid?: string }

const openAway = (row: ViewRow, column: ResolvedColumn, el: HTMLElement | null): void => {
  const intent = intentOf(row, column)
  if (intent?.kind !== 'edit') run(row, column, intent, el)
  else if (!live.current.add?.inPlace) run(row, column, { kind: 'popover' }, el)
  else {
    flushSync(() => live.current.add?.show(column))
    run(row, column, intent, el && host.anchor(el, column))
  }
}
```

The seat's API should end as `open, anchor, host, close, click, pane, menu, input, editor, target, sweep, openAway, openAdd, slide, commitPicks`, with `intentOf` and `run` private. `target` should take `rows: ViewRow[]`. `commitPicks` wraps `groupUndo`, so a single value is a group of one. `MenuSeat`'s effect becomes `seat.openAway(row, pending.column, pending.trigger)` then `if (pending.column.type === 'file') dismiss()`. `add.show` is required on `add`: a card's list calls it for a `'show'` outcome, and `openAway` calls it for a typed value, which is how the panel reaches it, since the panel's list never yields `'show'`.

**The Panel's rAF (Open Item 1):** it leaves. Its first reason goes with the chooser, since the list's close and the value's open are one state change, and `flushSync` answers the second.

**The Panel's Anchors (Open Item 6):** two vanish, not one. Besides the `+` (`PropertyPanel.tsx:346`), a standing Add row remounts when the first row lands, since it renders at `:372` and its held form at `:379`. Both should survive: `{(addable || opened) && <AccessoryButton…`, and one JSX slot for the Add row. The seat's closing rule stays as it is.

**The Calendar's Ceiling (Open Item 7):** nothing caps the calendar today (331px measured), and it stays uncapped because `ValuePane` draws it outside any `MenuScrollFrame`.

##### The Add List and Builder

`Core/Views/Pipeline/columns.ts`, after `resolveColumn` (`:34`):

```ts
export type ItemColumns = Record<'contexts' | 'properties', ResolvedColumn[]>

/** Every Context and property an item can hold, in the order its panel lists them: the Nexus's Context order and its schema's, with a Space's own row order over both. */
export function itemColumns(tree: NexusTree | null, schema: PropertyDefinition[], itemId: string): ItemColumns
```

`holdsValue(row, column)` should sit in `Core/Properties/fieldValue.ts`, and `GROUP_LABELS = { contexts: 'Spaces', properties: 'Properties' } as const` in `Core/Properties/columnDisplay.ts`. `cardAddColumns(item, row, shown)` replaces `cardColumns.ts:31-69`, listing what the card doesn't draw with held rows last (C-7's exception). Stamps can't enter `itemColumns`, so C-6 needs no filter. `PickEntry` has no successor: `ResolvedColumn` is the one row shape.

The panel's final form, built:

```ts
const fields = itemColumns(tree, schema, subjectId)
const held = (c: ResolvedColumn): boolean =>
  row !== null &&
  (holdsValue(row, c) ||
    (c.def !== undefined && !row.picked?.[c.id] && Object.hasOwn(row.frontmatter, c.def.key)))
const isShown = (c: ResolvedColumn): boolean => held(c) || revealed.has(c.id)
const shown: ItemColumns = {
  contexts: fields.contexts.filter(isShown),
  properties: fields.properties.filter(isShown),
}
const unshown = (key: keyof ItemColumns): ResolvedColumn[] => fields[key].filter((c) => !isShown(c))
```

`renderRow` takes `column: ResolvedColumn` and draws `columnIcon(column, ctx.contexts)` and `columnLabel(column, ctx.contexts)`. `fieldOf` and `GroupKey` leave: `glyphOf` and the line zone's `label` read `seat.host.columnOf`, so no second column lookup lands in the panel. The seat's `add` is `{ columns: () => ({ contexts: unshown('contexts'), properties: unshown('properties') }), show: (column) => reveal(column.id), inPlace: true }`. `addFromRow` compares anchors (`seat.anchor.current !== addRefs.current[addKey]`), so no Add state stays in the panel.

##### The Sweep

The sweep should be a seat open: `swept?: string[]` on `PaneOpen`, and `seat.sweep(row, column, rowIds, cell)`, which calls `run(row, column, { kind: 'picker' }, cell, null, { swept: rowIds })`. `run`'s last parameter is `at?: Pick<PaneOpen, 'x' | 'swept'>`, which `float` spreads into the open, and a click passes `{ x }` there. `ValueSeat` reads `(picked.swept ?? [picked.rowId]).flatMap((id) => host.rowOf(id) ?? [])`, and `TableView` keeps only `cellSweep`, `onSettle` ending in `seat.sweep(…)`, and `onClose: () => cellSweep.clear()` on its seat. This removes `MassPropertyPicker.tsx` and a net 48 lines of `TableView`, and settles B-8 with no origin code: driven live, the sweep's pane opened at the single click's rect. A sweep should close as every pane does, when its cell leaves, and pick over whatever rows remain; the fewer-than-two rule existed only because `mass` kept its own state.

##### The Pane Shell

**`UIX/Pickers/panePlacement.ts`:** a pure module holding `VIEWPORT_MARGIN`, `PickerDirection`, `PanePos`, `TriggerBox`, `ANCHOR_RESERVE`, `CORNER_CLEAR`, `roomAround(t, viewH)`, `sideFor(side, height, room)`, `crossing(from, height, t)`, and:

```ts
export function placePane({ t, pane, view, side, centered, origin, centerX, bounds }: {
  t: TriggerBox
  pane: { w: number; h: number }
  view: { w: number; h: number }
  side: PickerDirection
  centered: boolean | null
  origin: 'auto' | 'right' | 'center' | 'left'
  centerX?: number
  bounds?: { left: number; right: number }
}): { pos: PanePos; centered: boolean }
```

`usePaneResize.tsx:9` and `MatrixLabel.tsx:6` import from it, and `MatrixLabel.tsx:108` becomes `const above = sy - r - st.y - VIEWPORT_MARGIN` and `const up = sideFor('down', box.h, { down: below, up: above }) === 'up'`.

**The Fence:** inside `placePane`, a pane stays inside the window on every path:

```ts
const fenced = (at: number): number =>
  clamp(at, VIEWPORT_MARGIN, Math.max(VIEWPORT_MARGIN, view.h - VIEWPORT_MARGIN - ph))
const vertical =
  side === 'up' ? { bottom: fenced(view.h - t.top + GAP) } : { top: fenced(t.bottom + GAP) }
```

**`measure`, as Built:** this is the one resolved form of `PickerMenu.tsx:184-277`, carrying K-4's `at` and `centerX`, I-042's extraction, E-1's flip, and the trigger rule:

```ts
const place = useRef<((growth?: number) => void) | null>(null)
const slideGrew = useRef((by: number): void => place.current?.(by)).current
const dismissRef = useLatest(onDismiss)

useLayoutEffect(() => {
  if (!mounted || !open) return
  const height = at?.height ?? 0
  const point = at ? { left: at.x, top: at.y, bottom: at.y + height, width: 0, height } : null
  const trigger = triggerRef?.current ?? markerRef.current?.parentElement
  const rectOf = point ? () => point : trigger ? () => trigger.getBoundingClientRect() : null
  if (!rectOf) return
  const measure = (growth = 0): void => {
    if (trigger && !point && !trigger.isConnected) return dismissRef.current?.()
    const t = rectOf()
    const pane = paneBox.current
    const view = { w: window.innerWidth, h: window.innerHeight }
    const held = decidedDir.current
    let side = held ?? direction
    if (held === null || growth > 0) {
      const room = roomAround(t, view.h)
      side = sideFor(side, pane.h + growth, room)
      if (held === null) placeResize?.({ dir: side, room: room[side] })
      else if (side !== held)
        paneRef.current?.animate(
          [{ transform: `translateY(${crossing(held, pane.h, t)}px)` }, { transform: 'none' }],
          BASE_FEEL,
        )
    }
    decidedDir.current = side
    const { pos: next, centered } = placePane({
      t, pane, view, side, centered: decidedCenter.current, origin, centerX, bounds,
    })
    decidedCenter.current = centered
    setPos(next)
  }
  // :245-265 unchanged, except `new ResizeObserver(() => measure())` at :255
}, [mounted, triggerRef, open, origin, direction, at?.x, at?.y, at?.height, centerX, bounds, placeResize])
```

The dependency array names `at`'s fields, since `caretPane` and `GlancePane` build a fresh object each render. `Shell` renders `<SlideGrowth.Provider value={resize ? null : slideGrew}>{body}</SlideGrowth.Provider>`, so a resizable pane never flips, since `usePaneResize` caps its content at the room it opened into and a size-driven rule would flip it mid-drag.

**`FrameSlide.tsx`:** `SlideGrowth` is a context of `((by: number) => void) | null`, and the slide tells its pane the growth from the `navigating` commit:

```ts
const grew = useContext(SlideGrowth)
useLayoutEffect(() => {
  if (navigating) grew?.(open ? size.bh - size.ah : size.ah - size.bh)
}, [navigating, active])
```

`SLIDE_MS` gives way to `BASE_FEEL` (`UIX/Animations/feel.ts`: `{ duration: ms(duration.base), easing: easing.baseEase }`), the base feel `NavWindow.tsx:62` and `PageWindow.tsx:83` already hand-write, so the timeout, the pane's move, and both windows' morphs share one named timing. `SlideGrowth` carries no doc comment; the height-snap reason joins the existing comment at `FrameSlide.tsx:63` and `FrameSlide.test.tsx` pins it.

**In-Place Growth (Call 1):** the design above recommends that only a slide flips. Should Nathan choose that any growth flips, the entire hunk is one clause in `measure`:

```diff
-    if (held === null || growth > 0) {
+    if (held === null || growth > 0 || !placeResize) {
```

Both forms are built and proven apart. `SlideGrowth` stays in either case: the slide keeps its clean move, and only in-place growth changes.

**Why It Can't Flip-Flop:** a flip needs the pane to overrun its side and the other side to have strictly more room, so a stationary trigger allows at most one flip per open. A Back, a shrink, a scroll, or a window resize never moves the side. Driven: Back kept the pane above, and reopening decided afresh.

**The Trigger Rule:** a `PickerMenu` whose trigger leaves the page should dismiss itself, through the `ResizeObserver` it already holds on the trigger (`:256`). `ValueSeat.tsx:87-90` keeps its own check, since it also closes inline editors, which have no shell. The two agree and are idempotent.

**The Guard (K-5):** `:137` becomes `if (import.meta.env.DEV && liveRef.current && onDismiss !== undefined)`, with `:136` rewritten in place. It has to land with K-4, since K-4 removes the `anchorX` it reads. Before Phase 4, `cardGestures` logs two more console errors, which fail nothing.

##### Kit Structure

K-1 deletes the barrel by `Scripts/barrel-codemod.mjs`, run over the tree as it stands and over `~/The Studio/.claude/dashboard/src`. K-2 moves `ManageRow.tsx` and `manage-row.css.ts` to `UIX/Pickers/`, and `PickerControl.tsx`, `picker-control.css.ts`, and `PickerControl.typeable.test.tsx` (as `PickerControl.test.tsx`, folding in the options test) to `UIX/Menus/`, re-pointing 20 Core files, including the `vi.mock` string at `Core/Interface/mount.test.tsx:10`. K-3 cuts the third path at `ColorSwatch`, which reports its press through `onPress` rather than mounting a `ColorPicker`, as `PickerControl` already reaches an App-level pane through a door Core sets; `typeRows.tsx:82` and `SettingsWindow.tsx:206-213` call `chooseColor` at the chip, so `Trailing`'s `color` keeps its kind and `ColorPicker` ends with one mount. It lands in Phase 6 with the one color request. The six `kind: 'color'` entries in `Core/Settings/frames.ts` are that file's own row kind and stay. `Scripts/uixgraph.mjs UIX` should print an empty `MENUS ~> PICKERS` after Phase 6. Hunks and the file list are in *4 — Kit Structure* §5 and its appendix.

**One Rule for Kit Imports (Open Item 5):** a kit file is imported by its path, with `Theme` and `Symbols` as the two exceptions that are real modules. Completing the barrel would need 34 CSS names and can't serve the eight `import * as … from '@pommora/uix/Menus/frames.css'` lines.

##### I-027

Neither of the issue's written solutions delivers E-3. Option B opens the second list, and Option A stops only `click`, while `Slider` scrubs from `onPointerDown` (`Slider.tsx:62`) and a `LineRow` begins there (`engine.tsx:1358`). A list should draw its own shield over a pane: `ownShield` on `PickerMenu` (`(drawsShield || ownShield) && !closing`), passed by `MenuPresenter`, `CalendarPicker`'s month and year list, and `FilterFrame.tsx:105,179`.

The clock list is the one reasoned exception: a part opens on click and types on double-click (`CalendarPicker.tsx:488-498`), and Scout 4's Electron probe showed a shield takes that second press, so `dblclick` never fires. That list should drop the release with `suppressReleaseClick()`, imported from `../Interactions/shared`, in its `onDismiss`, with its one comment stating why. `CalendarPicker.tsx:266,493` lose their unreachable toggle arms, and `toggleTitleMenu` becomes `openTitleMenu`. `:492`'s `e.detail > 1` stays.

##### Small Folds

- **The Space Chip (K-8):** `OptionChip` should choose `NeutralChip` for `type === 'context'`, and `PropertyPicker.tsx:224-228`, `FilterFrame.tsx:157-175`, and `Cell.tsx:101-104` should stop choosing.
- **`PickOption` (K-9):** `export type PickOption = Omit<SelectOption, 'key'>`, with `o.value` becoming `o.id` at `PropertyPicker.tsx:223,249,317,319,320,323,326`, `contextOptions.ts:26,34`, and `propertyMenuActions.ts:50-52`, and `FilterFrame.tsx:140`'s `byValue` becoming `byId`. The kit's `PickerOption.value` is a separate type and stays.
- **`pickGroups`:** the option filter should cover both arms, so a Context with no Spaces draws `emptyPane`. After K-9 it reads `(contextOptions ? [{ id: column.id, options: contextOptions }] : column.def ? optionGroupsOf(column.def).map((g) => ({ id: g.id, options: groupOptions(g) })) : []).filter((g) => g.options.length > 0)`; the filter lands in Phase 4 with the patch.
- **`connections` (Open Item 2):** required on `ValueContext` and `SeatHost`. Built: typecheck is clean, since both test builders are casts, and `PropertyPanel.tsx:86` becomes `() => ctx?.connections()`. `PropertyValueInput`'s prop follows. `Cell.test.tsx:68` and `ValueSeat.test.tsx:71` gain `connections: () => undefined`.
- **The Panel's Commits (E-6):** `commit(id, next)` (`PropertyPanel.tsx:159-162`) should leave. Built:

```ts
clear: (r, column) => emptyRow(r, column, true),
hide: { from: 'row', run: (r, column) => emptyRow(r, column, false) },

const emptyRow = (at: ViewRow, column: ResolvedColumn, keep: boolean): void => {
  assignValue(writer, at, column, null)
  if (keep) reveal(column.id)
  else setRevealed((prev) => new Set([...prev].filter((id) => id !== column.id)))
}
```

`Cell`'s `commit` becomes `(next) => assignValue(writer, row, column, next)`.

##### Right-Click

**`Core/Actions/metadataMenu.ts`:** one file replacing `propertyRows.ts` and `propertyMenuActions.ts`, written in *2 — Lists and Menus* §5 Step 5. It exports `MetadataTarget`, `metadataBranches(target, tree)`, and `runMetadataAction(action, target)`; `parseAction` is private. `MetadataAction` sits in `pageMenu.ts` and `metadataMenu.ts` takes it as a type, since `Core/Testing/engineGraph.ts` counts `import type` and `pageMenu.ts` is on the engine path through `Actions/handlers.ts`, `editorMenu.ts`, and `gripMenu.ts`, while `metadataMenu.ts` reaches the store. `CHECKBOX_OPTIONS` and `option` take `id`, matching K-9. `itemColumns` gives it C-7's order with no sort, and `propertyMenuBranches`' option-first line leaves. An empty option list stays `{ label, submenu: [] }`, which both renderers grey (`Desktop/Actions/menu.ts:25-28`, `menuRows.ts:8`), as D-7 keeps it.

**`Core/Actions/pageMenu.ts`:** `PageMenuContext` becomes `PageMoveContext`, moves only, and `pageMetaMenuItems` becomes `pageMenuItems(ctx)` taking `PageMoveContext & { alreadyOpen?; newPages?: NewPageRows; editImage?: boolean; metadata?: readonly ActionItem<MetadataAction>[] }`, with `window` and `reveal` always on. `PageMenuAction = PageMetaAction | PageMoveAction | MetadataAction | 'image:edit'`. `metadata` is one list, so E-6's "branches twice" can't recur. `cardMenu.ts` should be deleted. `cellMenu`'s `:64-65` are deleted, and `cellMenuContextFor` and `baseCellMenu` take `type: ColumnType`, since neither term can be true: the seat is the only production caller, a title never reaches `seat.menu` (the Table routes it away at `TableView.tsx:233`, cards drop it at `cardColumns.ts:24`, and the panel lists only properties and Contexts), and `column.type` is never undefined.

**`Core/Interface/Menus/pageMenuActions.ts`:**

```ts
interface PageMenuHost {
  trigger: HTMLElement | null
  rename: () => void
  newPage?: { rows: NewPageRows; create: (where: 'above' | 'below') => void }
  editImage?: () => void
  values?: MetadataTarget | null
}

export async function showPageMenu(page: { id: string; path: string; title: string }, host: PageMenuHost): Promise<void>
```

A row exists exactly when its handler does, so "no New Page on the Matrix" lives in one place. Edit Icon is one closure on every surface, so `showPageMenu` answers `title:icon` itself with `chooseIcon(trigger, tree?.config.pageMetadata[page.id]?.icon, (icon) => void mutate({ op: 'setIcon', path: page.path, kind: 'page', icon }))`, and a host supplies only its `trigger`. `useViewInteractions` returns `pageMenu(row, anchor, editImage?)` through `ghost.suppressWrap`, passing `trigger: anchor`, and `ViewInteractionPolicy` gains `newPages: NewPageRows` (`'pair'` at `TableView.tsx:87`, `'single'` at `CardsView.tsx:172`). `showEntityMenu(target, trigger: HTMLElement | null = null)` keeps one job for a page: it builds `readTarget(target, trigger)` and calls `showPageMenu` with `trigger`. It takes over `alreadyOpen` and the move list from `Sidebar.tsx:80-91` and `MatrixView.tsx:63,76,78`. D-2 holds because `commitValue`, not `commitOnCard`, sits in `values`. `pageMenu` must go through `useStableApi` on cards (`CardsView.tsx:268`) and the Table (`TableView.tsx:231`), as `runTitleAction` did.

**`MenuSeat`:** `columnOf: (id) => resolveColumn(id, tree?.config.registry ?? NO_SCHEMA, contextIdsOf(tree))` and `holder: (row) => holderOf(row, identityOf(tree))`, with `holderOf` narrowing to `(row, { spaces }: Pick<ValueContext, 'spaces'>)` at `valueContext.ts:25`. `ValuePickRequest` becomes `Pick<MetadataTarget, 'rowOf' | 'commit' | 'trigger'> & { column: ResolvedColumn; style?: ColumnStyle }`, so `holder` leaves and three fields are stated once; it lands in the same commit as the menus, so `holder` never stands unwritten. `MenuSeat` reads `tree` through its own `useSession((s) => s.tree)`, in place of `registry` at `:316`.

**`GhostSuppress`:** it leaves the kit with the card's `holdGhost`, its one reader at `CardsView.tsx:919`. `useBannerMenu`'s read only ever returns the default passthrough, since its callers sit above that Provider or under none, so `:66` calls `popMenu` directly, and the sidebar's two readers already hold `SidebarGhostApi`, which gains `suppressWrap`. `interactions.holdGhost` stays for the banner menu at `CardsView.tsx:262`.

##### Settings Panes

**One Home for the Floor and Ceiling:** `UIX/Menus/frames.css.ts:129-130` should hold `SETTINGS_PANE_FLOOR = { minWidth: 225, minHeight: 245 }` and `SETTINGS_PANE_MAX_HEIGHT = 440` under one rewritten KNOB comment, and `frame-slide.css.ts:4-6` should go. Each of the five slides (`SettingsFrame.tsx:202`, `LayoutFrame.tsx:278`, `ViewFrame.tsx:219`, `PropertyFrame.tsx:399`, `MatrixMenu.tsx:117`) spreads the floor. `VisibilityFrame.tsx:124`, `FilterFrame.tsx:493`, and `PropertyFrame.tsx:354` state the ceiling, delivering F-7. Roots with no back bar (`SettingsFrame`, `ViewFrame`'s list, `MatrixMenu`) stay at 320.

**One Back Shape:**

```tsx
export type MenuBack = { label: string; onBack: () => void }

export function MenuTopRow({ label, onBack, trailing, current }: MenuBack & {
  trailing?: ReactNode
  current?: string
}): React.JSX.Element
```

`MenuBack` is imported from `@pommora/uix/Menus/MenuRows`. `back: MenuBack` replaces `label` and `onBack` on Group, Sort, Visibility, Property, `ViewLeaf`, and `LayoutFrame`; `back?: MenuBack` stays on Filter. `current: string` is required on Visibility, whose title alone varies by route. `Level`'s `onBack` takes the same shape as `back?: MenuBack`.

**The ⋮ (F-1, F-6):** `ViewItemMenu.tsx` leaves. `viewRowMenu.ts` should share its two rows:

```ts
const itemRows = (ctx: ViewRowMenuContext): ActionItem<ViewRowAction>[] => [
  { label: 'Duplicate', action: 'duplicate', icon: 'copy', disabled: !ctx.duplicable },
  { label: 'Delete', action: 'delete', icon: 'trash', disabled: !ctx.deletable },
]

export const viewItemMenuItems = (ctx: ViewRowMenuContext): ActionItem<ViewRowAction>[] =>
  joinGroups(itemRows(ctx).map((row) => [row]))
```

`viewRowMenuItems` joins its first group with `itemRows(ctx)`, and both take HEAD's `ViewRowAction` and `ViewRowMenuContext`. `ViewFrame` opens the ⋮ with `popMenu(viewItemMenuItems(itemContext), trigger, { solid: true, compact: true })`, which keeps today's separator, in-app draw, and content width, and it keeps `onClose()` after a delete. Its origin goes from `auto` to `center`, so near the window's edge it slides inward rather than hanging from its right side. The button keeps `ariaLabel="View menu"`. The row menu's two rows carry the icons too, where they never draw, since it's always a system menu (`Desktop/Actions/menu.ts:19`).

**`LayoutFrame`:** a discriminated `props`, `{ door: 'flat' } | { door: 'full'; schema; onMenu: (trigger: HTMLElement) => void }`, with one early return for the flat form after `grid` is built. It lands in the same commit as `MenuBack` and the ⋮, so its props change once. Its hunks are in *5 — Adjacent Fixes* §5 Step 4.

**`RuleField`:** the rename of `FilterFrame`'s local `FieldPicker`, at `:62,407,421,422,463,475,482`.

##### One Icon and Color Request

```ts
// Core/Session/chromeSlice.ts
type ChoiceRequest = { trigger: Element; value?: string } & (
  | { of: 'icon'; onPick: (icon: string) => void }
  | { of: 'color'; onPick: (color: string | undefined) => void; greyscale?: boolean }
)
pendingChoice: ChoiceRequest | null
requestChoice: (req: ChoiceRequest) => void
dismissChoice: () => void

export const pickOpen = (s: Pick<ChromeSlice, 'pendingPick' | 'pendingChoice'>): boolean =>
  s.pendingPick !== null || s.pendingChoice !== null
```

`resetChrome` gains `pendingChoice: null`. `Core/Assets/IdentityChoice.tsx` replaces `IconChoice.tsx` and `iconFavorites.ts`, exporting `chooseIcon(trigger, value, onPick)`, `chooseColor(trigger, value, onPick, greyscale?)`, `useChoiceOpen(trigger)`, `useIconChoice(value, onPick)` (returning `{ iconRef, iconOpen, onIconClick }`), and `IdentityChoice()`, mounted once at `App.tsx:197`, with `useIconFavorites` folded in, since `IconChoice` was its only reader. `IdentityChoice` holds the request through the exit with `useHeld`, since the dismissal stack reads its `triggerRef` then. Every site becomes one line at the gesture; the per-site hunks are in *5 — Adjacent Fixes* §5 Step 6.

- **The Ghost (D-3):** `pickOpen` is the one reader. `useViewInteractions.tsx:442` reads `suppressed: () => pickOpen(useSession.getState()) || policy.ghost.suppressed()`, covering Cards and the Table in one place, and `Sidebar.tsx:328` reads `const s = useSession.getState(); return s.renamingPath !== null || pickOpen(s) || glanceShown()`. `MatrixView.tsx:45,82` reads it too.
- **`runEntityAction`:** takes `trigger` from `showEntityMenu(target, trigger: HTMLElement | null = null)`, so `chooseIcon` and `chooseColor` take it with no bridge, and `MatrixView.tsx:69` ends in `null`. Its `title:icon` and `editIcon` call `chooseIcon(trigger, ownIconOf(s.tree, target), …)`, and its `changeColor` calls `chooseColor(trigger, spaceNodeOf(s.tree, id)?.color, …)`. `ownIconOf` reads `tree.contexts` for a Context and `nodesByIdOf(tree).get(id)?.ownIcon` otherwise, so a Matrix node's picker reads the same own icon a sidebar row's does. Once Phase 7 moves a page's Edit Icon into `showPageMenu`, `title:icon` leaves `runEntityAction`, and `ownIconOf`'s second arm reads `target.id ? spaceNodeOf(tree, target.id)?.icon : undefined`.
- **`ContextGroupDisclosure`:** takes `useLineEl()` and passes `rowEl(group.def.id)` to `showEntityMenu` at `Sidebar.tsx:263`, and `:93`'s `trigger ?? undefined` leaves.
- **`MatrixView`:** `:45` reads `useSession(pickOpen)` and `:82` reads `if (!pickOpen(useSession.getState())) setMenuId(null)`, so `menuId` holds the node through a choice as it does through a pick, and `:120` reads `((mine ? menuId : null) ?? hoveredId)`. All three land together, since without the first two the label's anchor unmounts and the trigger rule closes the picker.
- **`ViewTile`:** `titleIconOpen = useChoiceOpen(titleIconRef)` and `rowChoiceOpen = useChoiceOpen(menuAnchorRef)`, the ref `rowMenu` already writes, so `:273-274` read `rowChoiceOpen || titleIconOpen` in place of `iconFor !== null || colorFor !== null`. A selector reading the tile's DOM would miss the portalled rows.
- **`useNexusIcon(trigger)`:** it renames to `useNexusIcon.tsx`. `editIcon` calls `chooseIcon(trigger.current, profileIcon, selectGlyph)`, and since only the cropper remains, `useNexusIcon` returns it as `editor`, as `useBannerMenu` does, so `NexusIconEditors.tsx` leaves. `NexusPhoto.tsx` and `HomepageMenu.tsx` draw `{icon.editor}`.
- **`ColorSwatch`:** `onPick` and `greyscale` become `onPress: (chip: HTMLElement) => void`, and `typeRows.tsx:82` and `SettingsWindow.tsx:206-213` call `chooseColor` at the chip, the settings row passing `row.greyscale ?? false`, since the swatch defaulted `greyscale` to false where the picker defaults it to true. This cuts the last path from Menus to Pickers.
- **`IconPicker`:** `onClose` becomes `onDismiss`, and `triggerRef` is required. `IconPickerProps` stops being exported, since `IconChoice.tsx` was its only outside reader.
- **`PropertyFrame`:** gets `useIconChoice` as every header does, with no extra dismiss. An editor leaving under an open picker is rare, since the shield stops the user from causing it, and the slide's held detail keeps the trigger connected for its 305ms exit, after which the trigger rule closes the picker. The test at `PropertyFrame.test.tsx:711-727` leaves with that guard, and `PickerMenu.test.tsx` pins a detached trigger dismissing.

**F-5:** `LayoutFrame` should take `const iconChoice = useIconChoice(view.icon, (icon) => write({ icon }))` beside its other hooks, above the flat door's return, and its header should read `<InlineEditHeader value={view.name} icon={viewGlyph(view)} onCommit={rename} {...iconChoice} />`.

##### Tests and Drives

**Before Any Code:** `caffeinate -dims` in the background, killed at the end; a hash of `~/Test`; the group 15 repair; the harness additions; the pins; then all seven drives from a worktree of that commit. Every worktree should be cut at `16d932567` or later, where `Desktop/main.ts:78-81` gives any `POMMORA_USERDATA` launch a mock keychain, so no drive build reaches the login keychain.

**Harness (`drive-harness.mjs`):** `dialog.showOpenDialog` and `shell.showItemInFolder` recorded in `PATCHES`, `inMain(expr)`, `shot(cdp, name, around)`, and `SIGTERM` beside `SIGINT` at `:572`. The diff is in *6 — Testing and Docs* §5.

**New Groups:** Properties Drive groups 16 (the Add List), 17 (Right-Click), 18 (Placement), and 19 (Settings Panes), printing `MP-` letters so they can't be misread against that drive's Restructure letters, plus `stepSlides` and `stepMassPicks` in the Option Picker Drive. *6 — Testing and Docs* §5 holds the outcome matrix and each group's cases. Group 18's low window is `Emulation.setDeviceMetricsOverride`, read back through `innerHeight`, since a 640 override reads 711 at the app's zoom.

**Screenshots:** the orchestrator itself runs `Read` on six to ten named shots per phase, with one caption line each, since an executor's read stays in its own transcript. A full window shows position, and `shot`'s `around` crops a pane for a phone.

---

#### Resolved Seams

| Seam | Scouts | The One Answer |
|---|---|---|
| `PickerMenu.tsx:184-277` | 3, 4, 5 | The `measure` in *§The Pane Shell*, built and green |
| Horizontal override's name | 1, 3, 4 | `centerX` on `PickerMenu`, `placePane`, and `PropertyPicker`; `open.x` stays on the seat |
| `'dateTime'` merge and the pane's x | 1, 4 | Once, in Phase 4, by `centerX={options ? centerX : undefined}`; no `paneX` local |
| K-5's timing | 4 | With K-4, since K-4 removes what `:137` reads |
| `MenuTopRow`'s signature | 1, 4, 5 | `className` leaves in Phase 4; `MenuBack` arrives in Phase 5 |
| `MenuBack`'s export | 4, 5 | From `MenuRows`, by path; no barrel |
| `pickModel.ts:13` | 1, 2, 4 | K-9 in Phase 3 drops the re-key; the patch's filter lands over both arms in Phase 4 |
| `metadataBranches`' option key | 2, 4 | `id`, since K-9 lands first; `CHECKBOX_OPTIONS` matches |
| Add outcome's form | 1, 2 | `entryOutcome` in `valueClick.ts`, values `'show' \| 'slide' \| 'click'`; `intentOf` private |
| The panel's `unshown` | 1, 2 | `fields[key].filter((c) => !isShown(c))`, landing with Step 4 inside Phase 4 |
| Ghost suppression | 2, 5 | `pickOpen` in `chromeSlice.ts`, four read sites, Phase 6 |
| A page's Edit Icon | 2, 5 | `showPageMenu` answers `title:icon` itself through `chooseIcon`, taking the host's `trigger`; Phase 6 precedes Phase 7, so the runner lands on it |
| `title:icon` in `runEntityAction` | 2, 5 | Only `editIcon` remains there after Phase 7; a page's Edit Icon runs through `showPageMenu` |
| Seat's anchor check versus the trigger rule | 1, 5 | Both stay; each closes what the other can't reach |
| `PropertyFrame`'s dismiss | 5 | Not built; the trigger rule closes it after the exit |
| `pendingChoice` versus the seat | 1, 5 | No shared state: the seat never reads it, and `IdentityChoice` never reads the seat |
| The sweep's seat versus `MenuSeat` | 1, 2 | `MenuSeat` has no `add` and never sweeps; `openAway` is its one route |
| `MenuSeat`'s `columnOf` versus `openAway` | 1, 2 | Both land: Phase 4 changes its effect, Phase 7 its host |
| `FilterFrame.tsx:62,105,179` | 4, 5 | `ownShield` in Phase 2 on the elements, `RuleField` in Phase 5 on the name; neither line overlaps |
| New files' imports | 1, 4 | By path, since the codemod ran before they existed |
| The second-date pin | 1, 6 | The patch's test ("a second date slides in on its own value"), which uses `daySelected` and fails without `key={column.id}` |
| The typed-entry pin | 1, 6 | Scout 6's Pin 1 stays and gains "the list gone" in Phase 4; the patch's typed case isn't added |
| A date's x | 4, 6 | The patch's `PropertyPicker.pane` pin; the seat now holds `x` on a date, so a pin on `seat.open.x` would be wrong |
| `SeatHost.add.show` | 1, 2 | Required; `openAway` calls it on the panel's typed path |
| `PommoraUIX.md:380` | 3, 4, 6 | One text, in *§What Becomes False* |
| `IssuesPM.md:1120` | 4, 6 | Scout 6's wording |
| `PropertiesPM.md:117` | 1, 2, 6 | "A row shows once its file names it or it was added in the session" |
| `InteractionPM.md:48` | 3, 6 | Holds; no edit |

---

#### What Contradicts the Source

These state what the evidence shows and what each decision should become. The decision log isn't edited here.

| Decision | What the Evidence Shows | What It Should Become |
|---|---|---|
| **A-4** | The patch, F-2, and every later hunk read cleaner with final imports and a shell that already flips, and the codemod runs once over a clean tree | The work should run as one plan in phases, with the kit's imports and the pane shell landing first, so the pickers arrive on final imports and a shell that already flips |
| **B-7** | The file is the small half: `TableView` runs a parallel seat of open flag, anchor ref, close rule, column lookup, and commit loop | A multi-row pick should be a seat open, drawn by the one `PropertyPicker`, with `MassPropertyPicker.tsx` gone (Call 3) |
| **C-3** | The two labels sit identically: 14px bar, 0 padding, 4.55px to the pane's edge over both a list and a calendar, where the chevron opposite draws 8px in, since `MenuItem` zeroes the trailing pad for its `trailing` slot and the label rides there. `chooserTop` also zeroes `--row-pad-y`, 14px against 18px everywhere else | The back bar should take the one layout every other bar takes, 18px tall, by removing `chooserTop`, and on a picker's surface its label should keep the row's trailing pad, while a settings pane's stays flush (Call 2) |
| **C-4** | `maxWidth={180}` would clip the calendar through `FrameSlide`'s shared slot box | Spacing, icon size, and height match; the width floor matches, and the ceiling doesn't |
| **D-3** | The Table (`TableView.tsx:90`) and sidebar (`Sidebar.tsx:328`) carry the same gap as cards, and the Matrix already reads the pick | Every surface's hover ghost should stand down while a leaf is open |
| **E-1** | "As every other menu does" has nothing to match, since no menu re-decides after opening. The flip proved out as a move only when decided at the slide's head (largest step 53.8px, never past the window); an edge switch jumps 321px. In-place growth is worse flipped: 8px of overflow sends the pane 362px | A pane that grows on a slide should flip above its trigger when the other side has more room, deciding at the slide's head and travelling with it. In-place growth is Call 1. Every pane should stay inside the window, overlapping its trigger only where neither side holds it |
| **§Rejected** | Nathan's ruling puts rising over the trigger under *§Rejected* for slides, and the list doesn't name it | *§Rejected* should gain "A Slide Rising Over Its Trigger: the calendar would end sitting on its own card" |
| **E-2** | With the third path cut at `ColorSwatch`, Menus and Pickers run one way, and nothing outside Pickers imports it. `Controls, Fields, Menus, Elements, Buttons` remain one folder-level cycle through `Menus/frames.css.ts:13` and `Elements/eye-toggle.css.ts:3`, which blocks nothing | "One way" should name the pair `UIX/Pickers` → `UIX/Menus` alone. The third path is cut at `ColorSwatch`, which reports its press to the one color request, so `Trailing`'s `color` keeps its kind |
| **E-3** | Neither of I-027's written solutions delivers it, and a shield breaks the clock's double-click | The clock list should drop the release in place of a shield, as its one reasoned exception |
| **E-4** | All six of `[^51]`'s citations are accurate at HEAD, and closing two issues renumbers the rest | I-051's citations should be re-anchored for whatever moves. It becomes I-049, and I-075 becomes I-073 |
| **E-6** | M-24's key would warn on every editor teardown with a caret pane open | The warning should key on `onDismiss`, since a pane nothing dismisses leaves with its host |
| **F-6** | `popMenu` draws a 12px glyph where `ViewItemMenu` draws 13px, `MenuPresenter` passes `origin="center"` where it takes `auto`, and Use Native Menus now reaches the ⋮ | The ⋮ should look the same in rows, order, separator, width, and in-app draw, taking the shared menu's glyph size and origin (Call 6) |
| **G-1** | At HEAD a date never slides (`CardsView.tsx:486`), so the slide half has no route to drive. Proven: with the one-line change alone, the second date shows the first's pick. `cellGestures.test.tsx:564-593` duplicates `PropertyPicker.pane.test.tsx:322` | The click half lands before the restructure, and the slide half lands in the commit that makes a date slide. The seed-status mount should be deleted rather than moved, and only `:595-628` moves |
| **G-2** | The list omits `ViewTypesPM.md:130`, `InterfacePM.md:34,38,41`, `InteractionPM.md:16`, `PommoraUIX.md:210,255,293,357,373,383`, `scripts/README.md`, and `Properties Drive/MATRIX.md`. Resolved issues are deleted, not corrected (`batch-issues.md`) | The plan's *§Reconciliation* is the list, worded by *§What Becomes False*, and I-027 and I-042 should be deleted, with `index-issues.py` run last (Call 7 covers the folder lines) |

##### The Open Items, Closed

1. **The rAF:** it leaves entirely, through `flushSync`.
2. **`connections`:** it can become required; built.
3. **The Docs:** `PommoraUIX.md:373` is false and should read "The width a menu grows to, floored at its host's." `PommoraUIX.md:357,380` are rewritten, and `InteractionPM.md:48` holds.
4. **The Flip Mid-Slide:** it doesn't land mid-slide. It starts with the slide and travels with it.
5. **The Barrel:** it leaves; one rule, by path.
6. **The Panel's Anchor:** both anchors survive.
7. **The Calendar's Ceiling:** the ceiling belongs to the option rows, so the calendar needs no escape.
8. **A Second Date:** `key={column.id}`. A slid calendar always opens blank, since a date holding a value shows rather than slides; the bug is the second date displaying the first's pick.

##### The Leads That Didn't Hold

`PickEntry` needs no successor, where M-7 and M-8 kept a row type. `PropertyMenuRow` has no independent purpose, since `checked` is already a field of `ActionItem` (`menuModel.ts:12`). M-11's seat route stays dead under *§Rejected*. C-5 changes nothing in code and is a guardrail, and D-2 already holds at HEAD and needs only a pin. `MenuDoor` is imported by `shell/MenuDoor.tsx:4`, so it can't be un-exported. `InfoButton` has no production mount, so `:279-286` is kept for what it does.

---

#### What Was Challenged

Each new concept below had to name what it removes.

| Concept | Costs | Removes | Verdict |
|---|---|---|---|
| **`at` / `centerX`** | Two prop names, 8 call sites, three test files | One prop, `anchorX`'s two meanings, a 10-line `point` block; net about −14 lines | **Keep.** It pays for itself |
| **`panePlacement.ts`** | One file; about +58 lines against the same logic inline | The side rule's second copy, a component-file import in Matrix, `usePaneResize`'s reach into `PickerMenu`, the centering tests' DOM faking; `PickerMenu.tsx` shrinks 365 to 338 | **Keep.** I-042's stated fix and E-4 ask for it. At module level it saves about 8 lines and keeps the rest of the mess |
| **`SlideGrowth`** | One context, 4 lines in `FrameSlide`, one provider | Nothing else tells a slide from in-place growth; reading the transition or a callback prop on every consumer are worse | **Keep,** with no doc comment. It's what a slide's clean move costs under either answer to Call 1 |
| **`BASE_FEEL`** | One line in `feel.ts` | `SLIDE_MS`, the `duration, ms` import, and the inline copies in `NavWindow` and `PageWindow` | **Keep.** It names the base feel both windows already hand-write, and both point at it |
| **The Fence** | 4 lines; a one-frame overshoot newly visible at the edge | Panes off the window on every path: today 93px, 70px near the top | **Keep** |
| **`ownShield`** | One prop, four passes | I-027, without touching `dismissalStack.ts` | **Keep** for E-3 as ratified; Call 5 offers a smaller rule |
| **`pendingChoice` + `IdentityChoice`** | A third request slot, one kit rule, one new file, `useChoiceOpen` reading a ref in a selector | Both summon models, 13 + 5 mounts, 8 store fields, the anchor bug class, and the last path from Menus to Pickers; about −170 lines | **Keep.** It's the same shape as `requestPick`, and the runner needs it |
| **The Trigger Rule** | Two lines; every `PickerMenu` with a trigger gains it | Panes measuring zeros on a detached trigger | **Keep.** Proven on HTML and SVG |
| **`PropertyFrame`'s Dismiss** | An effect and a comment | A 305ms window on a rare background change | **Dropped.** Ghosts don't need guards |
| **`pickOpen`** | Two lines | Four copies of one test | **Keep,** exported from `chromeSlice.ts` |
| **`--use-mock-keychain` in `FOREGROUND`** | One word in two files, a second statement of `main.ts:78-81` | Nothing, once every worktree is cut at `16d932567` or later | **Dropped** |
| **Harness Stubs, `inMain`** | About seven lines | An overnight hang on a dialog nobody dismisses | **Keep** |
| **`shot`'s `around`** | Three lines | Unreadable shots on a phone | **Keep.** Proven at 658×660 |
| **`SIGTERM`** | One line | A stranded backup on a plain stop | **Keep** |
| **A Separate Metadata Picker Drive** | A folder and a README paragraph | Nothing group 14 doesn't hold | **Dropped** |
| **`SettingsPane`** | A kit concept for 9 sites | About −25 lines | **Dropped.** The prop's removal solved the defect |
| **`IdentityHeader`** | One component | Sites 1, 2, and 4 only; `SpaceMenu` and sites 5 to 7 don't fit | **Dropped** |

##### The Comment Ledger

The constraint binds every task, and each phase holds it. Rewrites in place count zero.

| Phase | Added | Removed | Rewritten | Net |
|---|---|---|---|---|
| 2 | Clock list's reason (`CalendarPicker`) | `PickerControl.tsx:159` | `PickerMenu.tsx:136`, `FrameSlide.tsx:63` | 0 |
| 4 | `SeatHost.add`, `itemColumns` | `ValueSeat.tsx:251`, `CardsView.tsx:215` | `ValueSeat.tsx:259`, `run`'s doc, `valueClick.ts:1`, `CardsView.tsx:193` | 0 |
| 5 | None | `frame-slide.css.ts:4` | `frames.css.ts:129` | −1 |
| 6 | None | `Sidebar.tsx:284`, `MatrixView.tsx:111` | `IconPicker.tsx:27`, `useViewInteractions.tsx:1` | −2 |
| 7 | The Matrix's reason in `showEntityMenu` | `ValueSeat.tsx:322`, `TableView.tsx:147,151`, `useViewInteractions.tsx:404` | `useViewInteractions.tsx:1` | −3 |
| **Total** | **4** | **10** | | **−6** |

`MetadataPicker`, `openAway`, `sweep`, `openAdd`, `commitPicks`, `swept`, `ValuePane`, `SlideGrowth`, and `sideFor` carry none, since their names and bodies state them, and `MenuSeat`'s existing comment at `:312` keeps stating the open-away rule. `ANCHOR_RESERVE`'s KNOB and "The property can leave…" move unchanged. The drives' new `// ── Group N` lines are offset by the removed chooser comments there.

---

#### The Phase Sequence

Each commit leaves the tree green under `npm run typecheck`, `npm run test`, and `npm run lint`. The drives run per Scout 6's table (*6 — Testing and Docs*, *§When Each Runs*), one chain at a time from a worktree, and two drives never run at once.

##### Phase 0 · Drives and Pins

- **Goal:** the harness can run every case overnight, the baseline is known, and G-1's two unpinned behaviors, D-2, and C-9 have tests before anything moves.
- **Carries:** the decision log rewritten in place to the restatements in *§What Contradicts the Source*; the group 15 repair with `MATRIX.md:154`; the harness additions; Pin 1 (`PropertyPanel.test.tsx`, *picking from the Add list*); Pin 2 (`cardGestures.test.tsx`, *a card's dates*, G-1's click half); the D-2 pin (a right-click value leaves a hidden property hidden, with `views:save` not called); the C-9 pins (`Done: false` shows a row in the panel, and a card's Add lists it and fills it, at behavior level); the baseline run of all seven drives.
- **Delta:** 0 production; tests about +130.
- **Depends On:** nothing.
- **Placements:** none.

##### Phase 1 · Kit Imports

- **Goal:** kit files are imported by path, `ManageRow` and `PickerControl` sit in the folders that stop Menus importing Pickers directly, and every later hunk's imports are final. Phase 6 cuts the one remaining path, through `ColorSwatch`.
- **Carries:** K-1, K-2, and Open Item 5, as two Pommora commits, each with an adjacent Studio commit; between them they touch the dashboard's seven files (`shell/MenuDoor.tsx`, `shell/CornerMenu.tsx`, `claude-code/layout.tsx`, `claude-code/Benchmarks.tsx`, `line-count/LineCountView.tsx`, `showcase/MenuLeaf.tsx`, `showcase/ComponentsLeaf.tsx`).
- **Delta:** about −54, the barrel's −54 (+75 / −129) built, with the moves changing only import paths; tests ±0, one test file fewer.
- **Depends On:** Phase 0.
- **Placements:** `UIX/Menus/PickerControl.test.tsx`.

##### Phase 2 · The Pane Shell

- **Goal:** one placement module, panes that stay in the window, a slide that flips as a move, and a list that only closes.
- **Carries, in Order:** K-4 with K-5; I-042's pure move; the fence; the slide's flip; the trigger rule; K-6 (E-3); E-1, E-4, Open Item 4.
- **Delta:** about +79 (+195 / −116), of which +72 is built; tests about +60. This phase is net-positive on purpose: it delivers E-1's required behavior in its minimal form, closes I-042 and I-027, states the side rule once, and pays the extraction's cost once.
- **Depends On:** Phase 1, for `UIX/Menus/PickerControl.tsx:159` and final imports.
- **Placements:** `UIX/Pickers/panePlacement.ts` and its test.
- **Call:** Call 1 changes one clause; Call 5 replaces K-6's prop.

##### Phase 3 · Small Folds

- **Goal:** the option rows are already clean when the picker splits.
- **Carries:** K-8, K-9, K-11 (`direction="down"`, the duplicate import), Open Item 2, and the panel's commit fold from E-6.
- **Delta:** about −16; tests about ±0.
- **Depends On:** Phase 1.
- **Placements:** none.

##### Phase 4 · The Two Pickers

- **Goal:** one Add list, one value pane, one seat, one builder for the in-app lists, and the sweep as a seat open.
- **Carries:** `1 — Two Pickers.patch`'s items 1 to 9, which hold K-7, K-10, and Scout 2's Steps 2 and 3, with Step 4 added; B-1 to B-8, C-1 to C-9, the `'dateTime'` half of E-6; Open Items 1, 6, 7, and 8; G-1's slide half and test moves.
- **Applying the Patch:** it's written against HEAD, and one commit lands these differences on it: imports by path; `anchorX` as `centerX`; `pickModel.ts` after K-9; `o.id` in `PropertyOptionRows`; no doc comment on `MetadataPicker` or `openAway`; `CardsView.tsx:193` reading "A value from a card's Add shows its property; a right-click pick runs through `MenuSeat` and leaves the view alone."; `valueClick.ts:1` gaining "An Add entry shows a value it holds, slides into a picker, or acts as that click."; `entryOutcome` unexported, with no arm for a missing intent; `PropertyPicker` with no `open` and no `useHeld`; `swept` off `ValueIntent`, through `run`'s last parameter; Step 4's panel in place of the patch's `unshown`, with `keyof ItemColumns` and `seat.host.columnOf`; Pin 1's typed case gaining a 400ms settle and "the list gone" in place of the patch's typed test.
- **Tests:** `cardColumns.test.ts`'s `parseEditorValue` cases move to `Core/Properties/parseEditorValue.test.ts`; `cellGestures.test.tsx:564-593` is deleted as a duplicate of `PropertyPicker.pane.test.tsx:322`, and `:595-628` moves to that file; `ValueSeat.test.tsx:125-131` leaves as the weakest of three pins for one regression; `cardAddColumns` gains the C-5 and C-6 cases; `columns.test.ts` gains page order, Space `rowOrder`, and no stamps.
- **Delta:** −96 (+386 / −482), built; tests about +60.
- **Depends On:** Phases 2 and 3.
- **Placements:** `Core/Properties/parseEditorValue.test.ts`, and `itemColumns` in `columns.ts`.
- **Verification:** the Text Property Drive's group 4 on the built app; a one-line field on a dev scratch instance for Call 8.

##### Phase 5 · Settings Panes

- **Goal:** a pane's height stops depending on route or pane, one back shape, and no hand-built menu.
- **Carries:** *5 — Adjacent Fixes* §5 Steps 1 to 5, with Steps 2 to 4 in one commit so `LayoutFrame`'s props change once; F-1's Visibility height, `ViewItemMenu`, and back shapes; F-3; F-4 unchanged; F-6; F-7.
- **Delta:** about −70 (+46 / −116); tests about +15.
- **Depends On:** Phase 4, since `MenuTopRow`'s `className` is gone.
- **Placements:** none.

##### Phase 6 · One Icon and Color Request

- **Goal:** one way to pick an icon or a color, `ColorSwatch`'s included.
- **Carries:** *5 — Adjacent Fixes* §5 Step 6; F-2; F-1's anchor and `onClose`; F-5; K-3, which completes E-2 at `ColorSwatch`; D-3's ghost through `pickOpen`, with its pin in `cardGestures.test.tsx`.
- **Delta:** about −170; tests about +60.
- **Depends On:** Phase 2's trigger rule; Phase 5, since `ViewFrame`'s rows share `duplicate` and `itemContext`.
- **Placements:** `Core/Assets/IdentityChoice.tsx` and its test; `Core/Assets/useNexusIcon.tsx`, renamed from `useNexusIcon.ts`.
- **Check:** `Scripts/uixgraph.mjs UIX` prints no `MENUS ~> PICKERS`.

##### Phase 7 · Right-Click

- **Goal:** one page menu, one runner, and one metadata menu file.
- **Carries:** *2 — Lists and Menus* §5 Steps 5 to 7, in one commit; C-7 on the menus, C-8's third builder, D-1 to D-5, D-7, E-6's `pageMetaMenuItems` fold, and `GhostSuppress` leaving the kit.
- **Delta:** about −140 (−125 to −155): Scout 2's table reads −152, less the shortfall Step 4 showed once built; tests about −30, as `cardMenu.test.ts`, `propertyRows.test.ts`, and `propertyMenuActions.test.ts` merge.
- **Depends On:** Phase 4 for `itemColumns`; Phase 6 for `chooseIcon`.
- **Placements:** `Core/Actions/metadataMenu.ts` and its test; `Core/Interface/Menus/pageMenuActions.test.ts`.

##### Phase 8 · Closeout

- **Goal:** the seat sits with what it routes to, every doc reads true, and the machine is cold.
- **Carries:** the seat's move, last, so files move once: `git mv` of `ValueSeat.tsx` and its test to `Core/Properties/Pickers/`, re-pointing `App.tsx:29`, `PropertyPanel.tsx:20`, `useViewHost.ts:36`, `CardsView.tsx:56`, `TableView.tsx:13`, `MetadataPicker.tsx`'s type import, and the test's import. Then the full drives. Then G-2 as *§What Becomes False* words it; I-075's text; I-027's and I-042's deletion; `[^51]` and `[^75]` re-anchored; and `index-issues.py` last among the docs, with both numbers in the final report. The reviews follow, with all seven drives after each folded wave, then the closeout measure and the Cold Machine proof, with Scout 6's additions: `git worktree list` shows the main checkout alone; `ls -d "$TMPDIR"/pommora-drive-*` and `ls -d ~/Benchmark-*` print nothing; no Electron or Node carries a worktree or scratch path; `pgrep caffeinate` prints nothing; the `~/Test` hash matches the start.
- **Delta:** 0.
- **Depends On:** every phase.
- **Placements:** `Core/Properties/Pickers/ValueSeat.tsx` and its test.

##### Decision Coverage

| Decisions | Phase |
|---|---|
| A-1 to A-5 | Process only |
| B-1 to B-8, C-1 to C-9 | 4 |
| B-3's seat | 8 |
| D-1, D-2, D-4, D-5, D-7 | 7, with the D-2 pin in 0 |
| D-3 | 6, with `MenuSeat`'s columns in 7 |
| D-6 | No change; `ownShield` and `MenuBack` touch `MenuPresenter` where it shares mechanics |
| E-1, E-3, E-4 | 2 |
| E-2 | 1, with `ColorSwatch`'s path in 6 |
| E-5 | No change |
| E-6 | K-5 in 2; chip, `id`, and panel commits in 3; `'dateTime'` in 4; `pageMetaMenuItems` in 7 |
| F-1 | 5, with the anchor and `onClose` in 6 |
| F-2, F-5 | 6 |
| F-3, F-4, F-6, F-7 | 5 |
| G-1 | 0 and 4 |
| G-2 | 8 |

##### Totals

Production: about **−470 lines**, and 9 files leave (`UIX/Menus/index.ts`, `MassPropertyPicker.tsx`, `ViewItemMenu.tsx`, `cardMenu.ts`, `propertyRows.ts`, `propertyMenuActions.ts`, `IconChoice.tsx`, `NexusIconEditors.tsx`, `iconFavorites.ts`) while 4 arrive (`MetadataPicker.tsx`, `panePlacement.ts`, `metadataMenu.ts`, `IdentityChoice.tsx`). −82 of it is built (−54 in Phase 1, +72 in Phase 2, −4 in Phase 3, and −96 in Phase 4), and the rest is estimated from hunks. Tests rise by about +300 lines, kept apart from that figure, with one more test file than today. The drives gain four groups.

---

#### What's Rejected

- **Reserving Room at Open:** the list opens above whenever a date is listed. It needs a constant for a calendar's height, opens upward for people who never drill, and does nothing for option lists.
- **Reading the Running Transition:** `getAnimations({ subtree: true })` is a hidden dependency on a CSS detail, on a hot path.
- **A `FrameSlide` Callback Prop:** every consumer would wire it, where a context reaches them inert.
- **Clamp Alone, Option C:** the calendar ends on its own card, and Nathan's ruling rejects it for slides.
- **A `useSweepPick` Hook:** it moves `TableView`'s parallels and removes none.
- **B-7 As Read:** `currents[]` with a second `PropertyPicker` in `TableView` keeps all five parallels.
- **A Separate `adding` State:** two states can disagree, every open must clear the other, and hosts check both.
- **Local `slid` in `MetadataPicker`:** it's today's `picked` with its reset effect.
- **Anchoring the Panel's Add on the Heading:** it moves where the pane opens.
- **Exempting Add From the Seat's Close:** the shell re-measures a detached trigger to zeros.
- **A New `Core/Properties/itemColumns.ts`:** a new file for one function, against *The Measure*.
- **`seat.intentOf` Staying Public for Add's Outcome:** `entryOutcome` gives the same answer from what's already pure.
- **`runPageMenuAction`, Runs Only:** "no New Page on the Matrix" would live in two places.
- **Views Calling `showEntityMenu`:** it pulls view closures into a sidebar-shaped function.
- **`metadataMenu.ts` Plus an Actions File:** the pair exists because those runners reach `Interface/Confirm`, and this one doesn't.
- **Completing the Barrel, or "Components Through It, CSS by Path":** one grows, and the other leaves two rules under one name.
- **`anchor?: { x; y?; h? }`:** one prop with the same two meanings.
- **Keying the Guard on `enter={false}` or `onExited`:** caret panes would start warning on editor teardown.
- **I-027's Option A or B, or the Stack Swallowing the Press:** *§I-027* states the first two; the third is a second way of taking a press beside the shield.
- **Local Hooks With the Store Kept, or Headers Only (F-2):** each keeps two summon models or the larger duplication.
- **Sharing `pendingMenu`:** `IconPicker` and `ColorPicker` carry their own shell props, so `MenuPresenter` couldn't share one shell.
- **`HomepageMenu` Onto `InlineEditHeader`, or Merging `PageMenu` and `SpaceMenu`:** three props for six lines, and a shared component for a header and a panel.
- **Repairing `reveal-parity` in This Plan:** a scratch patch only moved the failure to the next missing file (Call 9).
- **A Published Screenshot Gallery or Contact Sheet:** the constraint says "shown in the session".

---

#### What Becomes False

Every change here is replacive, under `r/studio-documentation`, and no doc needs drastic rewording. Docs land in Phase 8, except the drives' own `scripts/README.md` and `MATRIX.md` rows, which land with each drive edit.

##### Docs

| Where | Now | Should Read |
|---|---|---|
| `PropertiesPM.md:115` | "runs through one control (`Core/Properties/Pickers/PropertyPicker.tsx`) across every surface … and it can open on a chooser pane …" | "runs through one value seat across every surface that assigns one — the Properties panel, the Cards and Table views, and a system menu's value rows. It opens what each type needs: option rows for Select, Status, Multi-Select, and Context; a calendar for Date & Time; and the operating system's file dialog for File. Adding a value on a card or in the Properties panel starts from one **Add** list, which slides into option rows and the calendar under a back bar, while any other type opens its own picker." |
| `PropertiesPM.md:117` | "opens that group's chooser"; "A row shows once it holds a value or was added in the session" | "opens that group's **Add** list"; "A row shows once its file names it or it was added in the session" |
| `PropertiesPM.md:119` | "The first lists the nexus Contexts in registry order; the second lists the Collection's assigned properties." | "Both list in the order the item's Properties panel uses." |
| `ViewTypesPM.md:122` | "The value, add, icon, and image pickers mount at the grid level"; "A two-stage **add-picker** … lists the Contexts not shown on the card, then the properties, and reveals a property on its first committed value." | "The value, add, and image pickers mount at the grid level"; "An **Add** list — from empty space in the text area or the location footing — lists the Contexts and properties not shown on the card, with rows that only show a held value last, since picking one shows it rather than sets it, and reveals a property on its first committed value." |
| `ViewTypesPM.md:130` | The row list, already false | "A card's right-click menu is the page menu, led by Edit Image when a banner is set, and its one New Page creates after the anchor, and the hover ghost" |
| `InterfacePM.md:34` | "a sidebar row, a table row, a card, a row grip:" | Adds "a Matrix node" |
| `InterfacePM.md:38` | Open row | Adds that a banner card leads with Edit Image |
| `InterfacePM.md:41` | "New Page Above · New Page Below (a sibling at that slot in the manual order)" | "… in the manual order; one New Page on a card, none on a Matrix node)" |
| `InteractionPM.md:16` | "A menu's placement and collision flip are decided per open once its content is in" | Adds "and again at the head of a slide" |
| `PommoraUIX.md:210` | The Feel row: `DEFAULT_FEEL` · `GLIDE_FEEL`, "Duration + snap as numbers for the drag engine — the `menu` and `slow` rungs." | Adds `BASE_FEEL`: "Duration and curve as numbers — snap for the drag engine on the `menu` and `slow` rungs, and `BASE_FEEL` on `ease` at the `base` rung for a slide, the pane it moves, and the windows' morphs." |
| `PommoraUIX.md:255` | "The switch shape holding a color, anchoring a ColorPicker." | "The switch shape holding a color, reporting its press through `onPress` so the app opens its one color picker there." |
| `PommoraUIX.md:293` | "behind one barrel" | Removed; `UIX/Glass/` has no index |
| `PommoraUIX.md:357` | "`ManageRow.tsx` and `manage-row.css.ts` the row of a list managed in a pane," | "`PickerControl.tsx` the double-chevron picker," |
| `PommoraUIX.md:364` | `Manage` row | Moves to the Pickers table unchanged |
| `PommoraUIX.md:373` | "The measured height a menu grows to." | "The width a menu grows to, floored at its host's." |
| `PommoraUIX.md:380` | "The rectangle every menu, dropdown panel, and picker mounts — … the collision flip decided per open once its content is in, …" | "The pane action menus, managed lists, and pickers mount — anchoring to an element or a bare point, deciding its side per open once its content is in and again at the head of a slide, held inside the window, with dismissal, focus, and an opt-in resize from its free edges (`usePaneResize`). A dropdown list passes `ownShield`, so a press beside it inside a pane only closes it. Under `focus="keep"` the trigger counts as part of the pane and no shield draws." |
| `PommoraUIX.md:383` | "the app binds icon favorites through `UIX/Pickers/IconPicker`" | "… through `Core/Assets/IdentityChoice`" |
| `PommoraUIX.md:385` | `PickerControl` row | Moves to the Menus table, dropping `NumberUnit`, `unitLabel`, and `numberFrom`, which are `UIX/Utilities/numberUnit.ts`'s |
| `IssuesPM.md:90,93,994-1006,1052-1062`, `[^27]`, `[^42]` | I-027, I-042 | Deleted |
| `IssuesPM.md:1120` | "A new name touches the 29 code files that mention it and the seven Feature, Guideline, and Resource documents, and a new folder has to settle which way `UIX/Pickers` and `UIX/Menus` depend on each other." | "A new name touches the code files that mention it and the Feature, Guideline, and Resource documents, and a new folder keeps imports running one way, from Pickers to Menus." |
| `IssuesPM.md` `[^75]` | `UIX/Pickers/PickerMenu.tsx:~74`; `UIX/Menus/ManageRow.tsx:~3,~53-63`; `PommoraUIX.md:~380` | `PickerMenu.tsx:~66`; `UIX/Pickers/ManageRow.tsx`; re-quotes the row above |
| `IssuesPM.md` `[^51]` | Six accurate citations | Re-anchored for whatever moved, in `~#-#` ranges |
| `scripts/README.md:10-16,93-97,99-107` | Surface list; "in fifteen groups"; the focus claim | Adds slid-in and mass-pick surfaces; "in nineteen groups"; a file dialog and Reveal Location are recorded rather than shown |
| `Properties Drive/MATRIX.md:3,143,154` | Source; "chooser"; group 15's row | Names the second source and `MP-` letters; reworded; the repair's row |

**These Hold:** `InteractionPM.md:48`, `ConfigurationPM.md:32` (true of this ⋮, with the Property and Page ⋮ staying system menus always, as D-5 leaves them), `MatrixPM.md:49`, `ContextsPM.md:37`, `SymbolsPM.md:67`, `ViewTypesPM.md:62,91`, `IssuesPM.md:1116`.

##### Comments

The ledger in *§What Was Challenged* lists each one, and three more leave with the code they describe: `NexusIconEditors.tsx:6` with its file, `CardsView.tsx:261` with the ghost's Provider, and `ghostCreate.ts:10` with `GhostSuppress`. Beyond them, the drives' `Properties Drive:870,975`, `Text Property Drive:679`, and `reveal-parity/run.mjs:545` lose "chooser".

##### Tests

| Phase | Test | Change |
|---|---|---|
| 1 | `Core/Interface/mount.test.tsx:4,10`, `Core/Matrix/MatrixMenu.test.tsx:5`, `Core/Properties/Schema/PropertyFrame.test.tsx:20`, `Core/Testing/MenuDoorHost.tsx:1` | Import paths; `:10` is a `vi.mock` string |
| 2 | `PickerMenu.test.tsx:452-520` | Becomes plain calls in `panePlacement.test.ts` |
| 2 | `PickerMenu.test.tsx:561-563,597`; `usePaneResize.test.tsx:45-46`; `PropertyPicker.pane.test.tsx:39,56,142` | Prop names |
| 2 | `GlancePane.test.tsx:373-375,420,517,529,552,570`; `glanceSlice.test.ts:13-15`; `devicePrefsSeed.test.tsx:234-236`; `store.test.tsx:751-753,894-896` | `PinnedGlance` fixtures take `at` |
| 2 | `GlancePane.test.tsx:597` | The control pane becomes `<PickerMenu open onDismiss={() => {}}>` |
| 2 | New | `panePlacement.test.ts`; `PickerMenu.test.tsx`: a child calling `SlideGrowth` flips past the room and a shrink doesn't (stubbing `Element.prototype.animate` and `ResizeObserver`), a detached trigger dismisses, and two shields draw for a list in a pane; `FrameSlide.test.tsx`: `grew` fires only with `navigating` on; `CalendarPicker.test.tsx`: a press on a part closes the other's list and opens nothing; `dismissalStack.test.tsx`, beside `:178` |
| 3 | `contextOptions.test.ts:26,27,31,35`, `pickModel.test.ts:37`, `PropertyPicker.pane.test.tsx:347` | `id` |
| 3 | `Cell.test.tsx:68`, `ValueSeat.test.tsx:71` | `connections` fixture |
| 4 | `PropertyPicker.pane.test.tsx:151-248` and its fixtures (`:13,37-43,55,58,60,66-70,103-105`) | Leave with the mode |
| 4 | `valueClick.test.ts:21-25` | A Date's intent reads `picker` |
| 4 | `cardColumns.test.ts:6-12,62-81,109-121` | Replaced by `cardAddColumns` cases, stamps absent |
| 4 | `cardGestures.test.tsx:275` | "a Date entry slides into its calendar under ‹ Properties, in the same pane" |
| 4 | `ValueSeat.test.tsx:155,159` | Read through `toMatchObject`, since `x` isn't on the `add` arm |
| 5 | `VisibilityFrame.test.tsx:53,109`; `SortFrame.test.tsx:82`; `GroupFrame.test.tsx:72,182-183,205-206,386-387`; `Core/Views/viewWrite.test.tsx:159-165`; `PropertyFrame.test.tsx:96` | `back`, `current` |
| 5 | `viewRowMenu.test.ts` | Gains `viewItemMenuItems`: rows, disabled states, its separator, no leading separator |
| 6 | `IconPicker.test.tsx:27,51` | `onDismiss`, a `triggerRef` |
| 6 | `PropertyFrame.test.tsx:711-727` | Leaves |
| 6 | `PageView.test.tsx`'s `mount`; `DetailTitleHeader.test.tsx:39,136` | Renders `<IdentityChoice />` beside `PageView`; `onIconClick` |
| 6 | `cardGestures.test.tsx:183`; its `beforeEach` | `renderView(root, source(), <IdentityChoice />)`; resets `pendingPick` and `pendingChoice`, since a slot left by an earlier test keeps `pickOpen` true |
| 6 | `typeRows.test.ts:117-120`; `MenuIndex.test.tsx:103-113` | The `color` row and case take `onPress` |
| 6 | `IdentityChoice.test.tsx` | Gains "a swatch's press opens the color picker at its chip and lands the pick" |
| 6 | `sidebarIconChoice.test.tsx:75-92,104-146` | Rewrite through `showEntityMenu` and `IdentityChoice`; the Collection case leaves, since it drives the store directly and can't happen in the app |
| 6 | `store.test.tsx:1378-1393` | Asserts `pendingChoice: null` through `resetChrome` |
| 7 | `propertyMenuActions.test.ts:50-99,171,270`, `propertyRows.test.ts` | Merge into `metadataMenu.test.ts`; `:90-99` flips to schema order |
| 7 | `cardMenu.test.ts`, `cellMenu.test.ts:8-28` | Reborn in `pageMenu.test.ts` with Preview and Reveal |
| 7 | `cellMenu.test.ts:30-43,159-162,166-170,259` | Leave, since `type` is a `ColumnType`; `:272` moves its `hideable` case onto an empty Context |
| 7 | `useBannerMenu.test.tsx:8,42-53,78-88` | Leave with `GhostSuppress` |
| 7 | `Core/Interface/Menus/pageMenuActions.test.ts`, new | Each host handler runs on its action, and an absent `newPage` draws no row |
| 7 | `pageMenu.test.ts:17,37,60,79`; `entityMenu.test.ts:20-40,91-92,126-149` | Signature; `:37` goes; moves |
| 7 | `ValueSeat.test.tsx:302-309` | Stays green, since it grows the store's registry |

**These Hold and Need Watching:** `PickerMenu.test.tsx:190-227` logs at `pointerdown`, so only a real press proves E-3. `PickerMenu.test.tsx:230` is `focus="keep"`'s carve-out. `PropertyPanel.test.tsx:423-444` guards both orders.

---

#### Risks

- **Height Snap:** `grew` must stay behind `navigating`; a read earlier silently kills the height's easing. `FrameSlide.test.tsx` pins it.
- **Fence Reach:** it also applies at open, so an autocomplete at its ceiling sits up to 3px over the caret line, and a pane whose trigger scrolled off stops at the window's edge rather than following it out.
- **One-Frame Overshoot:** a fenced pane's position lags its height by a frame, briefly passing the edge by up to 7px near the top, and 39px once when two wrapped lines were pasted at once. The lag exists today and is only newly visible.
- **Row-Anchored Hop:** in the panel, a first pick from a standing Add row pushes that row down, and the pane follows it 31px. The `+` route doesn't move. It reads as following its anchor; Phase 4's screenshots should show it.
- **CSS Order:** vanilla-extract emits CSS in import order, and Scout 4's fully applied change flips 94 module pairs, none sharing a source file. Other phases reorder again, so the final drives carry a visual pass.
- **`ViewTile`'s Reveal:** a tile with a hidden strip must stay revealed through a pick from a strip row, which `rowChoiceOpen` holds through `menuAnchorRef`, since a portalled row sits outside the tile. Group 19 drives it.
- **The Matrix:** `menuId` now gives the label priority through a pick, and a node filtered out of the graph mid-pick loses its anchor and closes, which matches today's `return null` minus the skipped exit. Group 17 confirms the label stays through an icon pick.
- **Menu Reorder:** option-kind properties stop leading, which C-7 intends and muscle memory will notice.
- **Hold Timing:** `suppressWrap` now spans the action's synchronous run. `createAdjacent` and `policy.rename` don't read the hold.
- **A Press Inside the 225ms Exit:** the shield leaves at `closing`, so a second press faster than the exit still lands. Holding it through the exit would swallow that press, which reads worse.
- **A Press on a Day With the Clock List Open:** it closes the list and acts, since days run on a pointer gesture (`CalendarPicker.tsx:176-188`).
- **Two Drives at Once:** each kills the other, so agents never start one while another runs. A wait must never `grep` `ps` for its own command's text.
- **The Studio Commit:** a Pommora commit without it fails `npm run typecheck`, so the two sit adjacent, each with `--only` and explicit paths.
- **Sync:** nothing here touches persisted shape. `git diff --stat <BASE>..HEAD -- Core/Sync Sync` should print nothing at the end.

---

#### For Nathan

Each of these needs your answer before the plan can be finished. They're in plain terms, each with what's true, what it means, and what I'd do. Questions your decision log already answers aren't here.

##### Call 1 • When a Pane Grows a Little Near the Window's Edge

**What's True:** you ruled that a slide flips, like the calendar sliding in on a low card. That works and reads as a move: the pane rises from the slide's first frame and settles with it, about 400px in 280ms, crossing its own card. A different case is still open: a pane that grows a little where it stands, such as switching on End Date, typing another line, or adding a New Option.

| Case | How Far Past the Window | If It Flips | If It Rises Just Enough |
|---|---|---|---|
| End Date on a popped calendar | 8px | The calendar travels 362px, and the switch moves away from your pointer | It rises 16px, covering its trigger by 11px |
| End Date on a slid calendar | 1px | It travels 428px | It rises 9px |
| Typing in a text pane on a low card | 125px | It travels 428px while you're typing | It rises line by line and stops |

**My Answer:** flip only on a slide, and let small growth rise just enough. Clicking End Date shouldn't throw the calendar 360px to fix 8px. Compare `Scouts/Planning/Crops/18-popped-enddate-cross-move.png` (flip) with `18-popped-enddate-slide.png` (rise). Either answer is one line of code, and both are proven.

**Also Look At:** `Crops/50-filmstrip-three-approaches.png` and `Crops/31-final-date-flipped.png` show the slide's flip. Whether a 400px move in 280ms is tasteful is your eye to judge, and a filmstrip isn't the same as seeing it. Where neither side has room for a pane, it stays on the roomier side and stops at the window's edge, overlapping its trigger, since nothing else keeps it on screen.

##### Call 2 • The Back Bar's Right-Hand Label

**What's True:** the label sits in the same spot over a list and a calendar, 4.5px from the pane's edge, while the chevron opposite draws 8px in. A row drops its right-hand padding for anything in its trailing slot, since a button or glyph there carries its own box, and the bar puts its text label in that slot. Over the calendar it reads worse, since the calendar's head sits 8px in beneath it. Separately, this one bar is 14px tall where every other bar is 18px.

**Answer (11-02-2026):** the bar takes the same height as every other one, and on a picker's surface its label keeps the row's padding, 8px from the edge, matching the chevron. A settings pane's label stays flush, in line with the controls beneath it.

##### Call 3 • Dragging Across Table Cells

**What's True:** B-7 asked to fold the multi-row picker's file. That file is the small half: the Table also runs its own copy of opening, anchoring, closing, and saving. I'm proposing the bigger version: a drag across cells opens through the same machinery as a click, which removes about 80 lines and puts the pane in exactly the spot a single click opens it. The one behavior change: today the pane closes if fewer than two of the dragged rows survive, and it should instead stay open over whichever rows remain, closing when its own cell goes.

**My Answer:** yes.

##### Call 4 • Four Small Add-List Behaviors

Your log doesn't settle these. In each case the plan keeps today's behavior unless you say otherwise, except the last.

1. **Escape in a Slid Pane:** it closes everything rather than stepping back. **My Answer:** keep it.
2. **Picking a Select Option in a Slid Pane:** it closes everything rather than returning to the list. **My Answer:** keep it, since a Select holds one value and you're done.
3. **A Property With Nothing to Pick:** a Select with no options slides to an empty list with New Option under it, which is useful. A Context with no Spaces, or a Status with no options, slides to an empty pane with only a back bar, a small dead end. **My Answer:** keep it, since greying those rows is a new rule for a rare case.
4. **Cancelling a File Pick From the Panel's Add:** today that leaves an empty row. **My Answer:** leave no row, for the same reason as C-2.

##### Call 5 • Clicks Beside Other Pop-Ups

**What's True:** E-3 fixes dropdown lists only, as you ratified. In a tile's settings, clicking beside an open color or icon picker still closes it and also does whatever you clicked, while in the toolbar's settings the same click only closes it. Extending the fix to every pop-up would remove the rule that causes the difference, about 14 lines fewer, and replace four places that opt in with one that opts out (the calendar's clock list, whose double-click to type a shield would break). The cost is a second click after any open pop-up in a tile's settings.

**My Answer:** keep E-3 as you ratified it, dropdown lists only. It's a ruling you've already made, and the wider rule would change what you see in a tile's settings, a second click after any open pop-up, beyond the fix E-3 names. Taking it instead is about 14 lines fewer and changes one task.

##### Call 6 • The ⋮ on a View's Editor

**What's True:** F-1 moves this menu onto the shared route, and F-6 says it looks the same. Rows, order, separator, width, and being an in-app menu all stay. Three small things can't: its icons go from 13px to the 12px every other menu uses, near the window's edge it slides inward rather than hanging from the button's right side, and turning on Use Native Menus now makes it a system menu at the button, which is what that setting promises.

**My Answer:** accept all three.

##### Call 7 • The Folder Lines in the Project Instructions

**What's True:** G-2 says to correct them, but neither `// Menus` nor `// Pickers` claims to be a full list, so swapping `PickerControl` and `ManageRow` makes neither false. I-075 also cites the Pickers line's silence about the shell as part of its case.

**My Answer:** leave them alone.

##### Call 8 • Does a One-Line Field Close Itself in Your Daily App?

**What's True:** in a development run, a scout saw a Link or one-line Text field close the moment it opened. The code explains how that could happen, since development mode mounts things twice and the field's teardown reads as clicking away. But the scout's window wasn't a real focused one, and you'd have noticed this every day.

**My Answer:** tell me if you've ever seen it. If you haven't, the plan checks once on a scratch instance in Phase 4, and it's a two-line fix only if it reproduces (`viewRef.current = null` before `view.destroy()` at `ValueEditor.tsx`, and the blur handler stopping when `viewRef.current` is null).

##### Call 9 • A Broken Test Drive

**What's True:** `reveal-parity`, one of the drives your testing rule leans on, can't start, because the test Nexus it needs no longer has two of its files. A first repair only moved the failure to the next missing file. Its one relevant check can run inside the new Add-list group.

**My Answer:** leave it out of this plan and file it as its own issue.

##### Call 10 • Where New and Moved Files Live

Your *Placement* rule needs each of these approved. `MetadataPicker.tsx` (B-3) and E-2's moves are already settled.

| File | Why There |
|---|---|
| `Core/Properties/Pickers/ValueSeat.tsx` and its test, moved from `Cells/` | Beside everything it opens; `Cells/` returns to drawing values |
| `UIX/Pickers/panePlacement.ts` and its test, new | The pop-up placement math, beside `PickerMenu`; I-042's fix |
| `Core/Actions/metadataMenu.ts` and its test, new | One file replacing `propertyRows.ts` and `propertyMenuActions.ts` |
| `Core/Assets/IdentityChoice.tsx` and its test, new | Replaces `IconChoice.tsx`, the one icon and color picker mount |
| `Core/Assets/useNexusIcon.tsx`, renamed from `useNexusIcon.ts` | It returns the photo cropper as `editor`, as `useBannerMenu` does, so `NexusIconEditors.tsx` leaves |
| `UIX/Menus/PickerControl.test.tsx`, renamed from `PickerControl.typeable.test.tsx` | Its tests already cover more than typing |
| `Core/Properties/parseEditorValue.test.ts`, new | Those tests sit beside their module rather than in `cardColumns.test.ts` |
| `Core/Interface/Menus/pageMenuActions.test.ts`, new | Tests for the one page-menu runner |
| The list builder `itemColumns` in the existing `Core/Views/Pipeline/columns.ts` | No new file; it sits beside what it builds from |

**My Answer:** approve all nine.
