# Scout D: Every Other Consumer of the Kit

Baseline `69db9942e` (`active`). Read-only. All paths are relative to the repo root.

The kit's own contracts, which every finding below is measured against:

- `PickerMenu` holds its **children** through the exit (`UIX/Pickers/PickerMenu.tsx:154` `useHeld(children, open)`) and stops re-placing while closing (`:185-186`). It does **not** hold its own shell props (`solid`, `origin`, `glass`, `anchorX`).
- `FrameSlide` holds its **detail** through the slide-out (`UIX/Menus/FrameSlide.tsx:41-44`).
- `MenuTopRow` renders `trailing` **or** `current`, never both (`UIX/Menus/MenuRows.tsx:43-47`).
- `PickerControl` sends any list of three or more options through a module-level `door` (`UIX/Pickers/PickerControl.tsx:29-33,109-123`). `Core/Interface/mount.tsx:19` sets that door to `popMenu`, and `popMenu` sends a trigger-anchored menu to `presentMenu`, which `MenuPresenter` renders (`Core/Actions/menuActions.ts:23`).

---

## 1. Map

**Picker-shaped consumers (the ones that matter here)**

| Consumer | What it mounts from the kit | Local state and helpers around it |
|---|---|---|
| `Core/Views/Settings/SettingsFrame.tsx` | `FrameSlide` (`:202`), `MenuScrollFrame`, `MenuIndex` chevron rows, `MenuFooting`, `InlineEditHeader` | `pane` drill state `:70`, `detailFor` switch `:154-198`, `iconOpen` and `iconRef` plus `IconChoice` `:71-72,209-218`, `PANE_MIN_W/H` floors `:206-207` |
| `Core/Views/Settings/LayoutFrame.tsx` | `FrameSlide` (`:278`), `MenuTopRow` ×3 (`:200,239,245`), `MenuScrollFrame`, `MenuIndex`, `InlineEditHeader` | `frame` drill state `:131`, `leafFor` switch `:185-218`, a `door: 'full' \| 'flat'` mode `:127`, hard-coded back labels "Views" and "Settings" |
| `Core/Views/Settings/ViewFrame.tsx` | `FrameSlide` (`:219`), `MenuScrollFrame`, `MenuItem` rows, `ColorPicker`, `IconChoice` | `editingId`, `renamingId`, `iconFor`, `colorFor` `:56-59`, `menuAnchorRef` `:60`, `rowMenu` handler `:90-110`, a local `PANE_SQUARE=225` `:41` |
| `Core/Views/Settings/ViewLeaf.tsx` | none (routes to Group, Sort, and Filter) | Forwards `label` and `onBack`, or wraps them as `back={{label,onBack}}` for Filter `:47`, and injects `VIEW_SETTINGS_MAX_HEIGHT` `:48` |
| `Core/Views/Settings/VisibilityFrame.tsx` | `MenuScrollFrame` with a `MenuTopRow` header `:122`, `MenuRowView`, `paneSpec` and `PaneRestGroup` | Back props `onBack`, `label='Settings'`, `current?`, `maxHeight?`, `footer?` `:80-93` |
| `Core/Views/Settings/SortFrame.tsx` | `MenuScrollFrame` and `MenuTopRow` `:111` (`current="Sorting"` hard-coded), `pickerRow` ×4 | Back props are a required `label` and `onBack` `:33-34` |
| `Core/Views/Settings/GroupFrame.tsx` | `MenuScrollFrame` and `MenuTopRow` `:228` (`current="Grouping"` hard-coded), `pickerRow` ×6, `PickerControl` ×2, `DisclosureRow`, `MenuFooting` | Same back props as Sort `:115-116` |
| `Core/Views/Settings/FilterFrame.tsx` | `MenuScrollFrame` and `MenuTopRow` `:494` (`current="Filtering"` hard-coded), `PickerMenu` ×2 (inside local components), `PickerControl` ×2, `MenuItem` lists | A local `FieldPicker` component `:62-110` with its own `open` and `ref`, `ChipsField` `:125-191` with its own `open` and `ref`, and `targetOptions` hand-built `MenuItem` lists `:288-305`, `:431-461` |
| `Core/Views/Settings/LocationField.tsx` | `PickerMenu` (`focus="keep"`, `origin="left"`) `:193`, `DisclosureRow`, `MenuScrollFrame`, `pickRuns` | `open`, `draft`, and `ref` `:106-108`, plus a `usePaneCtl` key driver `:140` (the editor-pane pattern) |
| `Core/Views/Settings/ViewItemMenu.tsx` | `PickerMenu solid` with two `MenuItem` rows `:38-62` | `open` and `ref` `:20-21`, plus Duplicate and Delete handlers `:25-27,42-58` |
| `Core/Views/Settings/ViewMenu.tsx` | `MenuDropdown` `:43` | none |
| `Core/Properties/Schema/PropertyFrame.tsx` | `FrameSlide` `:399`, `MenuTopRow` ×3 (`:258,317,355`), `MenuScrollFrame`, `MenuIndex`, `InlineEditHeader`, `PickerControl`, `paneSpec` | `SubView` drill union `:54,178`, `iconFor` and `iconRef` plus `IconChoice` `:180-181,406-414`, hard-coded "Settings" and "Properties" labels |
| `Core/Properties/Schema/OptionEditPopup.tsx` | `PickerMenu` (`focus="leave"`) `:51`, `ColorGrid`, `PickerControl` | `iconOpen` and `iconRef` plus `IconChoice` `:46-47,99-105`. Its holder, `useOptionEdit.tsx:145-148`, holds `{option,label}` so the popup stays mounted |
| `Core/Matrix/MatrixMenu.tsx` | `FrameSlide` `:117`, `MenuScrollFrame`, `MenuIndex` (a chevron row, `pickerRow`, `steppedRow`) | `filtering` drill boolean `:48`. Passes `back={{label: MATRIX_TITLE, ...}}` and `VIEW_SETTINGS_MAX_HEIGHT` to `FilterFrame` `:128-129` |
| `Core/Matrix/MatrixLabel.tsx` | `ColorPicker`, `IconChoice`, `VIEWPORT_MARGIN` | Hand-written placement that copies the picker's flip and center rule `:76-83` (relative lines 105-112 in the file body) |
| `Core/MarkdownPM/Menus/caretPane.tsx` | `PickerMenu` (`glass="window"`, `focus="keep"`, point anchor, `resize`) `:78-91` | `CaretGeometry` sentinel `:17-22`, `paneKeys` driver |
| `Core/MarkdownPM/Menus/BlockMenuPane.tsx` | `CaretPane`, `MenuScrollFrame`, `MenuItem`, `usePaneResize` | `useHeld({state ?? CLOSED, selected}, open)` `:28` |
| `Core/MarkdownPM/Autocomplete/AutocompletePane.tsx` | `CaretPane`, `FrameSlide` `:207`, `MenuTopRow` (`label="Links"`) `:175`, `DisclosureRow`, `usePaneResize` | `useHeld({ac ?? CLOSED, ...7 fields}, open)` `:83-86`. Drill is driven by its parent (`behind`) |
| `Core/Interface/Glance/GlancePane.tsx` | `PickerMenu` ×2 (live with `modal={false}`, `focus="leave"`, and `resize`; pinned with `enter={false}` and `onExited`), `PICKER_PORTAL_ATTR` | `useHeld(shown)` `:91`, `anchorRef` through `useLatest` `:89` |
| `Core/Info/InfoButton.tsx` | `PickerMenu` (`focus="keep"`) `:64` | `held` plus a hover reveal `:27-31`, and a module-level `shown` singleton `:15` |
| `Core/Tiles/Surfaces/ViewTile.tsx` | `PickerMenu` ×2 (Settings host `bareSurface` `:644`, views list `solid` `:653`), `MenuScrollFrame`, `MenuFooting`, `ColorPicker`, `IconChoice` | `cfgOpen`, `listOpen`, `iconFor`, `colorFor` `:232-237`, `menuAnchorRef`, `btnRef`, `dropRef` `:238-241`, `rowMenu` `:455-484` |
| `Core/Tiles/Surfaces/PageTile.tsx` | `PICKER_PORTAL_ATTR` only `:162` | none |
| `Core/Contexts/SpaceMenu.tsx` | `MenuScrollFrame`, `MenuFooting`, `InlineEditHeader`, `ColorPicker`, `IconChoice` | `pickerOpen`, `colorOpen`, `iconRef`, `colorRef`, `colorAnchor` `:33-37` |
| `Core/Pages/PageMenu.tsx` | `MenuScrollFrame`, `MenuFooting`, `InlineEditHeader`, `IconChoice` | `iconOpen` and `iconRef` `:29-30` |
| `Core/Interface/Homepage/HomepageMenu.tsx` | `MenuScrollFrame`, `MenuFooting`, `frames.css` classes | Rebuilds `InlineEditHeader`'s markup by hand from `s.header`, `s.iconButton`, `s.titleField` `:26-43` |
| `Core/Interface/Toolbar/Toolbar.tsx` with `SettingsMenu.tsx` | `MenuSurface` | `settingsOpen`, `useDismissal`, and `useExitPresence('slow')` `:25-34,106-108`, which re-implements `MenuDropdown`'s lifecycle |
| `Core/Interface/Toolbar/OutlineMenu.tsx` | `MenuDropdown`, `DisclosureRow`, `MenuScrollFrame` | none |
| `UIX/Menus/ManageRow.tsx` (used by `Core/Settings/PreviewRulesRow.tsx`, `ExcludedDirectoriesRow.tsx`, `Core/Pages/AliasesRow.tsx`) | `PickerMenu` `:53` | `open` and `triggerRef` `:31-32` |
| `Core/Settings/PreviewRulesRow.tsx` | `FilterFrame` without `back` `:23-31` | This is why `FilterFrame.back` is optional |

**Row-only consumers (no findings beyond the import split in §2-F15):** `Core/Interface/Sidebar/{Disclosure,sidebarRows,sidebarDnd}.tsx`, `Core/Navigation/NavList.tsx`, `Core/Bundles/BundleTable.tsx`, `Core/Views/Bands/GroupBand.tsx`, `Core/Interface/Windows/PageReaderWindow.tsx`, `Core/Interface/RenamableTitle.tsx`, `Core/Properties/Cells/TextCell.tsx`, `Core/Assets/ImagePicker.tsx`, `Core/Tiles/BoardLock.tsx`, `Core/MarkdownPM/Autocomplete/AliasList.tsx`, `Core/Settings/{ExcludedDirectoriesRow,NexusRows,AssetDirectoryRow,ClearActionRow,ScalePicker,SettingsWindow,frames}.tsx`, `Core/Properties/Schema/{OptionEditor,OptionSlot,GhostOptionChip,formatRows,typeRows}`, `Core/Views/Settings/{paneRows,switchRows,OptionOrderList}`, `Core/Properties/{PropertyPanel,displayLabels}`, and `Core/Views/{paneTargets,Cards/CardsView}`.

---

## 2. Findings

### F1: The Metadata Picker's Pieces Already Run on Mechanics Shared with Eight Kit Consumers
**Category:** Parallel Definition
**Evidence:** "A row list, then a drill to a detail under a back bar" is wired by hand at eight sites. Each uses its own `useState` drill key, `FrameSlide open={x !== null}`, and a `MenuTopRow onBack={() => setX(null)}`:
- `PropertyPicker.tsx:87,153-181`
- `MenuPresenter.tsx:30,56-81`
- `SettingsFrame.tsx:70,202-208`
- `LayoutFrame.tsx:131,278-284`
- `ViewFrame.tsx:56,219-225`
- `PropertyFrame.tsx:178,399-405`
- `MatrixMenu.tsx:48,117-136`
- `AutocompletePane.tsx:207` (here the parent drives the drill)

The drillable row that leads in is built four ways, each with a different glyph size:
- `PropertyPicker.tsx:126-139` builds a `MenuItem` with an `Icon size="body"` and a default-size chevron.
- `MenuPresenter.tsx:13,40-51` builds a `MenuItem` with a `size="control"` glyph and a `size="control"` chevron.
- `SettingsFrame.tsx:109-116`, `LayoutFrame.tsx:261-267`, and `MatrixMenu.tsx:59-64` use a `MenuIndex` row with `trailing:{kind:'chevron'}` and `ICON.rootEntry` (`headline`).
- `PropertyFrame.tsx:259-268` builds a `MenuItem` with an `ICON.doc` (`control`) glyph and a default chevron.

**Could change:** A kit-level drill row and a "detail with back bar" pane would give one row anatomy and one back-bar wiring. §3 has the options.
**Effect:** About 3–6 lines per site at 8 sites, which comes to roughly −25 to −40 lines. It removes three of the four drill-row recipes. The bigger gain is that one drill and back-bar rule replaces eight hand-wirings.
**Confidence:** Verified for the pattern. The line estimate is Likely.

### F2: Back-Bar Inputs Have Four Signatures, and Three Pane Titles Don't Match the Rows That Open Them
**Category:** Inconsistency (plus a visible correction)
**Evidence:** The four signatures:
- A required `label: string` with `onBack` (`GroupFrame.tsx:115-116`, `SortFrame.tsx:33-34`).
- `label = 'Settings'` as a default, with `current?` (`VisibilityFrame.tsx:82-83`).
- `back?: {label, onBack}` (`FilterFrame.tsx:219`). `ViewLeaf.tsx:47` re-wraps its own `label` and `onBack` into this shape.
- Hard-coded labels (`PropertyFrame.tsx:355` "Settings · Properties", `:258,318` "Properties"; `LayoutFrame.tsx:239,245`).

The picker family adds a fifth: `MenuPresenter`'s `onBack?: {label, back}` (`MenuPresenter.tsx:26`).

The title mismatch: the rows say "Group", "Filter", and "Sort" (`LayoutFrame.tsx:111-113`), but their panes' back bars read "Grouping", "Filtering", and "Sorting" (`GroupFrame.tsx:228`, `FilterFrame.tsx:494`, `SortFrame.tsx:111`). The other panes echo their row: Visibility shows "Visibility" (`SettingsFrame.tsx:172`) and Layout shows "Layout" (`LayoutFrame.tsx:200,245`).

**Could change:** One back shape for every pane, `back?: {label, onBack}`. The level's title should come from the row that opened it rather than being hard-coded inside the pane.
**Effect:** Removes 3 signatures and the `ViewLeaf` re-wrap. Tests that pin "Filtering" would change: `FilterFrame.test.tsx:170,175` and `MatrixMenu.test.tsx:108`.
**Confidence:** Verified for the divergence. Whether "-ing" is meant is unknown and needs Nathan to decide.

### F3: The Same Visibility Pane Gets Two Height Ceilings Depending on How You Reach It
**Category:** Inconsistency / Bug
**Evidence:**
- `LayoutFrame.tsx:207-213` passes `maxHeight={VIEW_SETTINGS_MAX_HEIGHT}` (440).
- `SettingsFrame.tsx:167-173` passes nothing, so it falls back to `MENU_MAX_HEIGHT` (320, `menu-row.css.ts:302`).
- `frames.css.ts:129` defines 440 as "a settings pane's height ceiling, for a View pane or a property's editor".
- The same split exists inside PropertyFrame: the list has no ceiling prop (`:354-362`, so 320) while the editor gets 440 (`:331`).
- Every `FilterFrame` caller that has a back bar passes 440 (`ViewLeaf.tsx:48`, `MatrixMenu.tsx:129`). Only the settings-window instance (`PreviewRulesRow.tsx`) omits it.

**Could change:** Settings panes should own their ceiling, either through a pane-level default or by Visibility and Filter defaulting to `VIEW_SETTINGS_MAX_HEIGHT`. The `maxHeight` prop then disappears from VisibilityFrame, FilterFrame, ViewLeaf, and MatrixMenu.
**Effect:** About −6 lines and one prop gone from two frames.
**Confidence:** Verified.

### F4: ViewFrame's Icon Picker Isn't Anchored to the Row Its Color Picker Uses
**Category:** Bug
**Evidence:**
- `ViewFrame.tsx:92` stores the right-clicked row in `menuAnchorRef`.
- `ColorPicker` uses that ref (`:242`), but `IconChoice` has no `triggerRef` (`:226-233`).
- `IconPicker.tsx` documents that omitting it "anchors to the picker's own mount point", which here is the views dropdown pane.
- `ViewTile.tsx` does the same flow correctly and passes `menuAnchorRef` to both (`:673-676,688-697`).

**Could change:** Pass `triggerRef={menuAnchorRef}`. Better still, share the row-menu flow (see F6).
**Effect:** One line, and a visible correction.
**Confidence:** Likely. I didn't run the app.

### F5: ViewItemMenu Hand-Rolls a Button Menu and Copies ViewFrame's Handlers
**Category:** Duplication
**Evidence:**
- `ViewItemMenu.tsx:20-62` builds its own `open` state, ref, `PickerMenu solid`, and two `MenuItem`s, which is exactly what `popMenu(items, trigger, {solid})` already renders through `MenuPresenter`.
- Its Duplicate (`:44-46`) and Delete (`:26`) repeat `ViewFrame.tsx:104` and `:106` word for word.
- `viewRowMenuItems` already models both actions (`ViewFrame.tsx:94`).

This is an action menu, so per the correction it belongs **beside** the metadata picker. The finding stands as "use the action-menu path that already exists".
**Could change:** `popMenu(viewItemMenuItems, ref.current, {solid: true})`, with one handler shared with `ViewFrame.rowMenu`.
**Effect:** About −30 lines. The file shrinks to a button, or folds into LayoutFrame's header.
**Confidence:** Verified.

### F6: The "Row Menu, Then Icon or Color Picker at the Row" Flow Is Written Three Times
**Category:** Duplication / Parallel Definition
**Evidence:**
- `ViewFrame.tsx:58-60,90-110,226-243` and `ViewTile.tsx:236-238,455-484,673-698` both use `viewRowMenuItems`, the same `iconFor`/`colorFor`/`menuAnchorRef` triple, and the same rename/icon/color/duplicate/delete switch.
- `SpaceMenu.tsx:33-37,46-64,113-132` is a third copy for a Space.
- `MatrixLabel.tsx` (relative lines 130-148) is a fourth, but it uses a different summon model, the session `beginIcon`/`endIcon`/`endColor` (`Core/Session/editSlice.ts:36-41,153-156`).

**Could change:** One `useIdentityEditors(anchor)` hook in Core that holds the open target and the anchor and renders `IconChoice` plus `ColorPicker`. Alternatively, make the store slot the one way. This isn't metadata in the Spaces/properties sense, but it is the same "summon a picker at a trigger" mechanic (see §4).
**Effect:** About −40 to −60 lines across 3–4 sites, and one summon model instead of two.
**Confidence:** Likely.

### F7: The Identity Header Plus Icon Picker Is Wired by Hand Five Times
**Category:** Duplication
**Evidence:** Each of these keeps its own `useRef` and `useState` for the icon, sets `InlineEditHeader iconRef/iconOpen/onIconClick`, and mounts a separate `IconChoice` with the same ref:
- `SettingsFrame.tsx:71-72,91-97,209-218`
- `PageMenu.tsx:29-30,59-67,88-96`
- `SpaceMenu.tsx:33,36,87-100,113-122`
- `PropertyFrame.tsx:180-181,333-340,406-414`

`HomepageMenu.tsx:26-43` rebuilds the header's markup by hand from the same `frames.css` classes because it shows a photo. `PageMenu` and `SpaceMenu` are also near-twins: header, `PropertyPanel host="dropdown"`, the experimental "Connections" row (`PageMenu.tsx:79-86` and `SpaceMenu.tsx:104-111`), and a footing with a lock.
**Could change:** A Core `IdentityHeader` that owns the icon picker. UIX's `InlineEditHeader` can't reach `IconChoice`, which needs the session's favorites, so the wrapper has to live in Core. `HomepageMenu` would use it with a photo slot.
**Effect:** About −35 lines, and four `IconChoice` mounts and four ref/state pairs removed.
**Confidence:** Likely.

### F8: Holding Values Through the Exit Is Done Two Ways
**Category:** Inconsistency / Over-Engineering
**Evidence:**
- **Consumers that hold their own data:** `MenuPresenter.tsx:87`, `ValueSeat.tsx:268-269` (`last` ref) and `:317`, `PropertyPicker.tsx:86`, `useOptionEdit.tsx:145-148`, `AutocompletePane.tsx:83-86` (an 8-field bundle plus a `CLOSED` sentinel `:53-64`), `BlockMenuPane.tsx:28` (sentinel `:20`), and `GlancePane.tsx:91`.
- **Consumers that null their children and rely on the kit's hold:** `FilterFrame.tsx:106` (`open ? children(...) : null`), `:180-186`, and `LocationField.tsx:201`.

Since `PickerMenu` holds children and freezes placement while closing (`PickerMenu.tsx:154,185-186`), a hold that only feeds **children** is redundant. A hold that feeds **shell props** is needed, because the kit doesn't hold those: `MenuPresenter` passes `solid`, `origin`, and `anchorX` from `shown` (`:102-105`), and `PropertyPicker` derives `origin` from `held` (`:95`). `useOptionEdit` holds so the popup stays *mounted*. Mounting `OptionEditPopup` all the time and rendering `{opened && content}` would let the kit do the job.
**Could change:** Have the kit hold its shell props through the exit with one line, `useHeld` on `{solid, origin, glass}`. Consumers then always mount `PickerMenu` and render `open && content`. That lets the sentinel `CLOSED` objects and most data holds go.
**Effect:** About +3 in the kit and roughly −25 to −40 in consumers. Two `CLOSED` sentinels gone. One rule: "the shell holds; consumers don't".
**Confidence:** Likely. Caret panes also feed `at` geometry and resize into the shell, so check each hold before removing it.

### F9: LayoutFrame's Flat Mode Mounts a Slide That Can Never Open
**Category:** Unjustified Separation / Over-Engineering
**Evidence:**
- `setFrame` is only called at `LayoutFrame.tsx:266`, inside the `door === 'full'` branch. In `'flat'` (from `SettingsFrame.tsx:181`), the `FrameSlide` at `:278` stays inert. It nests inside SettingsFrame's slot and applies `PANE_MIN_W/H` floors a second time.
- `door` also switches the header (`:237-246`), the body (`:250-273`), and `onClose` (SettingsFrame passes `onClose={back}`, the same as `onBack`, `:183-184`).
- In practice "flat" is a different pane, made of the type grid and the switches, sharing one component through a mode flag.

**Could change:** Split this into a `LayoutPane` (grid plus switches), which SettingsFrame mounts directly, and the full view editor (header, grid, drill rows). Alternatively, drop the `FrameSlide` when flat.
**Effect:** About −10 lines, one mode prop gone, and one inert nested slide gone.
**Confidence:** Verified for the flat mode being inert.

### F10: FilterFrame's Local `FieldPicker` Shadows the Kit's `FieldPicker`
**Category:** Parallel Definition / Less to Understand
**Evidence:** `FilterFrame.tsx:62` declares `function FieldPicker`. `UIX/Pickers/FieldPicker.tsx:25` exports a different `FieldPicker`, the typed-value popover that `PropertyValueInput.tsx:59,118` uses. Same name, different contracts.

FilterFrame's property and operator pickers (`:407-463`) are hand-built `MenuItem` lists in a `PickerMenu`. Every other pick-one control in the settings frames goes through `PickerControl`, then the door, then `MenuPresenter`. The genuine difference is the operator list's `CheckboxGlyph` leads (`:396-402,440`), which a string-icon `ActionItem` can't carry. The property-target list (`targetOptions`, `:288-305`) has no such need.
**Could change:** Rename the local component to `CellPicker`. Route the target list through the door like every other settings pick-one. The operator list could follow if checkbox leads become an icon name.
**Effect:** The name confusion goes. About −15 lines if the target list moves.
**Confidence:** Verified for the shadowing. Likely for routing the target list.

### F11: MatrixLabel Restates the Picker's Placement Rule
**Category:** Parallel Definition
**Evidence:**
- `MatrixLabel.tsx` (relative lines 76-83) says "The pickers' rule, held to the stage's free box: below the node unless above has more of the room it lacks, and centred until an edge stops it". It then re-implements `PickerMenu.tsx:208-230` (the flip rule plus centered clamping) using `VIEWPORT_MARGIN`.
- It's genuinely different in that it follows a node every frame by writing transforms directly. That's why it doesn't mount `PickerMenu`.

**Could change:** Extract a pure `placeAgainst(anchorRect, paneBox, edges, preferred)` from `PickerMenu`'s inline `measure`, and have both call it.
**Effect:** About −8 lines net, and the rule is stated once.
**Confidence:** Speculative. It's a modest win and touches `PickerMenu`'s hottest code.

### F12: Three Ways to Summon a Floating Picker
**Category:** Inconsistency (cross-domain)
**Evidence:**
- (a) Local `useState` plus a ref: most consumers above.
- (b) Session `editSlice` with `iconPath`/`iconHost`/`colorPath`: Sidebar and Matrix (`editSlice.ts:153-156`).
- (c) Session `chromeSlice` with `pendingMenu` and `pendingPick` (`chromeSlice.ts:29-36,62-75`). These are two slots with the same "picker anchored at a trigger, settled once" contract, differing only in their payload.

**Could change:** For the metadata picker, one request slot shaped as a union over kinds (§3-A). (a) stays for pickers owned by a component.
**Effect:** See §3.
**Confidence:** Verified for the three models.

### F13: The Toolbar's Settings Dropdown Re-Implements MenuDropdown's Lifecycle (Justified)
**Category:** Unjustified Separation, but justified on inspection
**Evidence:** `Toolbar.tsx:25-34,106-108` has open state, `useDismissal`, `useExitPresence('slow')`, and `MenuSurface`, which is `MenuDropdown.tsx:35-43,89-95` again. The separation is documented at `MenuDropdown.tsx:7` ("so the toolbar trio shares one dismiss region"), and the toolbar adds the notch beak and `outsidePress: !matrixPane`.
**Could change:** Nothing now. Only if `MenuDropdown` gains an external-trigger mode.
**Confidence:** Verified. Left as-is on purpose.

### F14: Pane Floors Use Two Constants
**Category:** Inconsistency
**Evidence:** Four settings slides pass `minWidth={PANE_MIN_W} minHeight={PANE_MIN_H}` (225×245: `SettingsFrame.tsx:206-207`, `LayoutFrame.tsx:282-283`, `PropertyFrame.tsx:403-404`, `MatrixMenu.tsx:134-135`). `ViewFrame.tsx:41,223-224` uses its own `PANE_SQUARE` (225×225).
**Could change:** Use one constant, or make the floor part of the settings pane's own wrapper (see §3-B).
**Effect:** About −3 lines.
**Confidence:** Verified.

### F15: Small One-Way Lapses in the Kit's Surface
**Category:** Inconsistency
**Evidence:**
- The dismiss prop has two names. `IconPicker` uses `onClose` (`IconPicker.tsx:25`), while `PickerMenu`, `ColorPicker`, `FieldPicker`, and `OptionEditPopup` use `onDismiss`.
- Imports split between the barrel and direct file paths. `FootingCreate`/`RowRemove` come from `Menus/MenuRows` (`ExcludedDirectoriesRow.tsx:7`, `ImagePicker.tsx:14`) as well as the barrel. `titleInput` comes from the barrel (`CardsView`, `sidebarRows`, `OutlineMenu`) and from `menu-row.css` directly (`PropertyFrame.tsx:33`, `ViewFrame.tsx:20`, `AliasList.tsx:15`). `FrameSlide`, `InlineEditHeader`, `ManageRow`, `paneDrop`, and `useListEdit` exist only by path, while `MenuSurface` and `MenuDropdown` are in the barrel.
- `PropertyPicker`'s back bar needs a padding override class, `chooserTop` (`property-picker.css.ts:4`). No other `MenuTopRow` consumer needs one.

**Could change:** Rename to `onDismiss` everywhere. Pick one import path and apply it everywhere. Drop `chooserTop` or move it into `MenuTopRow`.
**Confidence:** Verified.

### Genuinely Different (Kept Apart for Good Reason)
- **Settings frames vs the pop-up picker:** The settings frames are long-lived panes inside a `MenuSurface` dropdown or a tile's `PickerMenu bareSurface`. They have no settle contract and nothing to commit-and-close. They share the drill and back-bar mechanics, not the picker.
- **Caret panes:** `CaretPane`, `AutocompletePane`, `BlockMenuPane`, and `LocationField` are driven by keys through `paneCtl`, with `focus="keep"`. The editor owns Escape, arrows, and Return. That's genuinely a different focus contract.
- **`GlancePane` and `InfoButton`:** These use `modal={false}`, `focus="leave"`, and hover lifecycles. They aren't pickers.
- **`MenuDoor` row type** (`PickerControl.tsx:23-27`) **vs `ActionItem`:** UIX can't import Core, so the subset is restated on purpose.
- **`ChipsField` reusing `PropertyOptionRows`** (`FilterFrame.tsx:181`): the option rows without commit-and-close semantics. That's the right cut, and it's already shared.
- **`PresenterRow`** (`Core/Interface/Menus/menuRows.ts:3`) **vs the kit's `MenuRow`:** These are not near-copies. `PresenterRow` is `ActionItem`-shaped (a string icon, an `action`, `checked`, a `submenu`), while `MenuRow` carries ReactNode labels and trailing kinds. The parallel is only in how the drill row is drawn (F1).

---

## 3. Approaches

### Unifying the Metadata Picker: What D's Side Shows
Per the correction, plain action menus stay outside. `MenuPresenter` is in scope only for the mechanics the picker shares and where it shows entity management.

**What each piece contributes, seen from the kit's side:**
- **The Add chooser** (`PropertyPicker` in `chooser` mode): a one-level drill. It uses `FrameSlide` (`:153-181`) and `MenuTopRow` with `current` plus a padding override, and its detail is a **value pane** (`PropertyOptionRows` or `DateTimeValuePicker`). It has **two hosts**: cards (`CardsView.tsx:485-491`) and the Properties panel (`PropertyPanel.tsx:403-411`). The panel's entries are all `revealOnly: true, drillable: false` (`PropertyPanel.tsx:186`), so in the panel the chooser never drills. It reveals a row and closes. Cards drill only where `pickKindOf(type) !== null` (`CardsView.tsx:486`). Typed values (text, number, link) never drill into a `FieldPicker` level today; they reveal in place.
- **`MenuSeat`:** It draws nothing itself. It adapts `pendingPick` into `useValueSeat().run`, which then lands in `ValueSeat`, which renders `PropertyPicker` (the value pane alone) or the typed `FieldPicker` popover (`ValueSeat.tsx:313-353`). Its summon contract duplicates `pendingMenu`'s (F12).
- **`MenuPresenter`:** It shares the drill mechanics (recursive `Level`, `FrameSlide`, `MenuTopRow`, `MenuScrollFrame` at `PICKER_MAX_HEIGHT`, the held shell props) and the trigger-and-settle contract. It's in scope only where a system menu's **Properties ▸** branch leads to entity management, and that leaf already hands off to `MenuSeat` through `requestPick` (`propertyMenuActions.ts:89-97`). It also serves as the renderer for every `PickerControl` option list, through `setMenuDoor(popMenu)`: about 36 `pickerRow`/`steppedRow` sites and 7 direct `PickerControl`s in D's domain. That makes it load-bearing for every settings frame and confirms that it stays beside the picker as the generic list and action shell.

**What's genuinely different between the three:** Only the **level content**. The chooser lists entries, `MenuSeat` opens a value pane directly, and the presenter lists action rows. The shell (`PickerMenu`, anchor and trigger, dismissal, held shell props), the drill (`FrameSlide` plus `MenuTopRow`), and the summon-and-settle contract are the same. The current differences in row glyph size, chevron size, the `chooserTop` padding, and the width floors (120/0 vs 120/180) are divergences, not real differences (F1, F15).

**What one metadata picker would remove:**
- `PropertyPicker`'s separate `chooser` branch and its local `picked` state (about 45 lines).
- `chooserTop`.
- The `pendingPick` slot as a separate thing from the picker's own request.
- `MenuSeat`'s separate mount in `App.tsx:197`.
- `ValueSeat`'s `last` ref and the `useHeld` calls whose job F8's kit-level hold takes over.

**Its honest boundary:**
- **Inside:** assigning or managing an entity's Spaces and property values. That means the chooser, value panes (options, date, typed), and the system-menu leaf hand-off. Levels are {entry rows, value pane}.
- **Beside it, sharing the mechanics through the kit:** `MenuPresenter` (actions plus the door's option lists), `ViewItemMenu` (F5), and settings-frame drills.
- **Outside:** caret panes, Glance, Info, `ManageRow`, and the icon/color identity editors. Those last ones could share the same request slot if the store-summon model (F12) is consolidated, but they aren't metadata.
- **A constraint the picker inherits:** `MenuTopRow` can't show a title (`current`) and a trailing control together (`MenuRows.tsx:43-47`).

### A: Move the Drill Mechanics into the Kit, Then Build the Picker and the Presenter on Them
A kit `DrillPane` (or a `FrameSlide` extension) would take `back?: {label, onBack, trailing?}` and render the `MenuScrollFrame` header for the detail. A kit drill row would render one fixed anatomy (glyph size, chevron). Then:
- The metadata picker, `MenuPresenter`'s `Level`, and the settings frames all use one back-bar contract. That fixes F2 and F14 and removes the four back signatures.
- The pane title comes from the row that opened it ("Group"), not a hard-coded string.

**Trade-off:** It's a new kit concept. It earns its place by removing about 8 hand-wirings and 5 signatures. Tests that pin back-bar text would change: MenuPresenter (19 hits), PropertyPicker.pane (13), FilterFrame (2), MatrixMenu (2).

### B: Settings Panes Own Their Floor and Ceiling
A settings-pane wrapper, or defaults on the frames themselves, would fix 225×245 and 440 in one place. That removes the `maxHeight` and `minWidth/minHeight` props threaded through ViewLeaf, MatrixMenu, LayoutFrame, and VisibilityFrame (F3, F14). It's small and safe, and it pairs naturally with A.

### C: The Kit Holds Its Shell Props; Consumers Render `open && content`
This is F8. One small kit change makes the rule uniform and deletes sentinel `CLOSED` objects and most data holds, including in the picker family. Do it before A so the new pieces don't copy the old hold patterns.

### D: Identity Editors Under One Owner
Use a Core `IdentityHeader` for F7 and `useIdentityEditors` (or the `editSlice` store slot) for F6. This is the biggest pure-deletion win in D's domain, but it's adjacent to the metadata picker rather than part of it. Sequence it separately.

### E: Small Corrections Worth Bundling with Any Pass
The ViewFrame icon anchor (F4), `ViewItemMenu` moving to `popMenu` (F5), renaming FilterFrame's local `FieldPicker` (F10), `onClose` becoming `onDismiss` (F15), one import path (F15), and LayoutFrame's flat split (F9).

---

## 4. Concerns and Insights

- **The door's reach is the main risk.** Any rename, relocation, or behavior change to `MenuPresenter` moves every `PickerControl` in the app, and `Core/Testing/MenuDoorHost.tsx` mounts it for tests. Keep the door contract (`MenuDoor` rows plus `solid`/`compact`) stable while the metadata picker is cut out beside it.
- **`popMenu` honors `devicePrefs.nativeMenus`** (`menuActions.ts:12`). With that preference set, button-opened menus, including every `PickerControl` list and `ViewItemMenu` if it moved per F5, become OS menus. That's already true for `PickerControl` today. The metadata picker can't follow that route because its value panes have no native form, which is one more reason it has its own shell request rather than riding `popMenu`.
- **The chooser's two hosts behave differently by data, not by design.** The panel never drills and cards sometimes do. A unified picker should keep that decision in the entry builders (`cardColumns.ts:55`, `PropertyPanel.tsx:186`), not in the picker.
- **`FilterFrame` is mounted from three places:** view settings, the Matrix menu, and the settings window's Preview Rules. Any change to its back bar or ceiling has to keep the back-less, ceiling-less settings-window form (`PreviewRulesRow.tsx:23-31`).
- **I didn't verify visually.** F4, F3's visible effect, and the "-ing" titles are read from code only.
- **Outside my mandate but noticed:** `InfoButton`'s module-level `shown` singleton (`InfoButton.tsx:14-15`) is a second "one at a time" mechanism next to the dismissal stack. `PageMenu`'s lock is a placeholder that locks nothing (`PageMenu.tsx:32-33`).
