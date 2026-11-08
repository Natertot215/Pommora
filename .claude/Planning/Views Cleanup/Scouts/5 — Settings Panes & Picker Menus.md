### Scout 5 — Settings Panes & Picker Menus

**Grounded At:** `cae07c129` · reconciled against HEAD (`cae07c129`, unchanged); every file size in the map re-measured and matching. Deltas are production lines only (no tests, comments, or docs) and are estimates.

---

#### 1. Map

##### II. `Core/Views/Settings/` (2,563 production lines + 126 in stylesheets)

| File | Owns | Called By |
| --- | --- | --- |
| `ViewMenu.tsx` (54) | The toolbar's Views button: a `MenuDropdown` around `ViewFrame`, right-click toggles Show Title | `Interface/Toolbar/Toolbar.tsx:102` |
| `ViewFrame.tsx` (217) | The saved-views list (switch, reorder, rename, row menu, Archive row, New View footing) sliding into `LayoutFrame door="full"` as the per-view editor | `ViewMenu.tsx:51` |
| `LayoutFrame.tsx` (283) | Two different panes behind one `door` union: **flat** (type grid + switches + Cards rows, reached from Settings) and **full** (the per-view editor: ⋮, name header, grid, four chevron rows, its own `FrameSlide` to Layout/Group/Filter/Sort leaves). Also owns `TABLE_LAYOUT`, `LAYOUT_OPTIONS`, `VIEW_ROWS`, `ViewRow`, `ViewRowId`, `ViewSwitches` | `ViewFrame.tsx:206`, `SettingsFrame.tsx:176` |
| `SettingsFrame.tsx` (190) | The toolbar's/tile's settings root: container (or tile view) header, six chevron entries, Scale or lock+trail footing; `detailFor` dispatch | `Interface/Toolbar/SettingsMenu.tsx:15`, `Tiles/Surfaces/ViewTile.tsx:653` |
| `ViewLeaf.tsx` (48) | Dispatch for Group/Sort/Filter, shared by both doors | `SettingsFrame.tsx:178`, `LayoutFrame.tsx:211` |
| `VisibilityFrame.tsx` (147) | Shown/hidden property list on `paneSpec` | `SettingsFrame.tsx:167`, `LayoutFrame.tsx:222` |
| `GroupFrame.tsx` (525) | Grouping pane + `LocationHierarchy` (Set tree, drag, eyes) + `DateBucketList` | `ViewLeaf.tsx:31` |
| `SortFrame.tsx` (191) | Sorting pane | `ViewLeaf.tsx:33` |
| `FilterFrame.tsx` (518) | Filter pane + `RuleField`, `ChipsField`, `filterViewOf`, `standalonePatch` | `ViewLeaf.tsx:36`, `Matrix/MatrixMenu.tsx:119`, `Settings/PreviewRulesRow.tsx:23` |
| `LocationField.tsx` (210) | Location rule's `TokenField` + `LocationTree` picker; `flattenNodes`, `Folder` | `FilterFrame.tsx:47,360` |
| `OptionOrderList.tsx` (76) | Draggable option-order list (status sections) with hide eyes | `GroupFrame.tsx:316`, `SortFrame.tsx:179` |
| `paneRows.tsx` (55) | `SUB_LOOK`, `ORDER_WORDS`/`orderOptions`, `HideControls`, `rowEye` | Group, Sort, OptionOrderList |
| `switchRows.tsx` (31) | `SwitchEntry` + `switchRows` (view flags → switch `MenuRow`s, with `invert`) | `LayoutFrame.tsx:82` |
| `useMultiValue.ts` (18) | Optimistic multi-value toggle | `FilterFrame.tsx:138`, `LocationField.tsx:105` |
| `filter-frame.css.ts` (73) / `layout-frame.css.ts` (37) / `option-order.css.ts` (12) / `group-frame.css.ts` (4) | Pane styles | their frames |

##### II. Kit Pieces the Panes Build On

| File | Owns | Consumers (non-test) |
| --- | --- | --- |
| `UIX/Pickers/PickerMenu.tsx` (353) | The floating, portalled, placed, dismissable pane every popover, picker, and in-app action menu mounts in | 20 tags across 16 files (11 in Core, 5 in UIX) |
| `UIX/Pickers/picker-base.css.ts` (51) | Shell styles (`layer`, `shield`, `pane`, `surface`, `resizing`, `PANE_RADIUS`) mixed with picker knobs (`PICKER_MAX_HEIGHT`, `PICKER_WIDTH`, `treePane`, `optionRing`) | PickerMenu, panePlacement, 7 Core files |
| `UIX/Pickers/panePlacement.ts`, `usePaneResize.tsx` | PickerMenu's placement math and opt-in resize | PickerMenu, GlancePane, caretPane |
| `UIX/Pickers/ManageRow.tsx`, `FieldPicker.tsx`, `ColorPicker.tsx`, `IconPicker.tsx`, `CalendarPicker.tsx` | Picker/popover components over PickerMenu | Properties, Settings, Assets |
| `UIX/Menus/PickerControl.tsx` (174) | The trigger-chip select; opens its list through the injected `MenuDoor` (= `popMenu`, set at `Core/Interface/mount.tsx:19`); 2 options toggle; `steppedPickerProps`, `pickerOptions`, `PickerOption` | 17 files |
| `UIX/Menus/MenuIndex.tsx` (179) | `MenuRow`/`Trailing` data model, `pickerRow`, `steppedRow`, `MenuRowView`, `MenuIndex` | 18 files |
| `UIX/Menus/MenuRows.tsx` (419) | `MenuItem`, `MenuTopRow`, `MenuScrollFrame`, footings, accessory/footer buttons, `menuDropLine` | everywhere |
| `UIX/Menus/FrameSlide.tsx` (121) | Two-slot slide with height growth reported to PickerMenu via `SlideGrowth` | 8 files |
| `UIX/Menus/DisclosureRow.tsx` (127) | `useDisclosureSet`, `DropOutline`, `DisclosureRow` | 9 files (Sidebar's `sidebarRows`, BundleTable, GroupBand, GroupFrame, LocationField, …) |
| `UIX/Menus/paneDrop.tsx` (98) | Two-lane members/rest drop spec + `PaneRestGroup` | VisibilityFrame, PropertyFrame |
| `UIX/Menus/pickRuns.ts` (16) | Picked-run ring positions | MenuPresenter, PropertyPicker, LocationField |
| `UIX/Menus/useListEdit.ts` (49) | In-place list rename/draft | AliasList, ExcludedDirectoriesRow (not used by the panes) |
| `UIX/Menus/frames.css.ts` (198) | Settings-pane knobs **and** many Properties-only styles | 20 files |

**Status:** Verified; corrected the PickerMenu file count (16, not 15) and `sidebarRows` belongs to the Sidebar, not NavList.

---

#### 2. Findings

##### F1 • Three Parallel Per-Kind Tables, and a Cards-Shaped Hole in the "Generic" One

**What's There:**
- `VIEW_KINDS` (`Core/Views/views.ts:24-31`) — label, icon, `nests` for six kinds.
- `VIEW_RENDERERS` (`Core/Views/Host/ViewHost.tsx:11-14`) — `table`, `cards`; falls back with `?? TableView` (`ViewHost.tsx:19`).
- `LAYOUT_OPTIONS` (`LayoutFrame.tsx:52-64`) — `table`, `cards`; falls back with `?? TABLE_LAYOUT` (`LayoutFrame.tsx:130`); **also** gates the type tiles with `t in LAYOUT_OPTIONS` (`LayoutFrame.tsx:185`).
- So "which kinds the interface implements" is answered twice (renderer map, layout map), and "an unimplemented kind presents as Table" is stated twice (`ViewHost:19`, `LayoutFrame:130`) — but **not** applied where `nests` is read: `ViewHost.tsx:23` passes `VIEW_KINDS[view.type].nests` (the *declared* kind) while seating `TableView`; `GroupFrame.tsx:142` and `SortFrame.tsx:89` do the same. Today every unrendered kind has `nests: true` like Table (`views.ts:27-30`), so nothing visible breaks; it's coincidence holding it together.
- Inside `LAYOUT_OPTIONS`, `cardRows: boolean` (`LayoutFrame.tsx:38`, read at `:137`) gates a hard-coded block of the three Cards rows (`:137-175`, with `BANNERS` `:88-92`, `FORMATS` `:94-97`, `CARD_ROW_LOOK` `:99`). `leaf: 'visibility' | 'switches'` (`:39`, read `:212`) is the same thing for the editor's Layout leaf.

**Which Special Cases Read the Registry vs. Hard-Code a Kind:**
- **Registry (done right):** `nests` → Group's None row and Sub-Group (`GroupFrame.tsx:142,174,261`), Sort's Location entry (`SortFrame.tsx:89`), the host (`ViewHost.tsx:23`); the pipeline receives it as a parameter (`Pipeline/group.ts:391`); grid labels and glyphs (`LayoutFrame.tsx:184,187`).
- **Hard-coded:** `TABLE_LAYOUT` as fallback (`:42,130`), `LAYOUT_OPTIONS` membership as the implemented-gate (`:185`), `cardRows` (`:38,137`), `leaf` (`:39,212`), `VIEW_RENDERERS` + `TableView` fallback (`ViewHost.tsx:11,19`).

**What a Fifth Kind (List) Requires of These Panes Today:** a `VIEW_RENDERERS` entry; a `LAYOUT_OPTIONS` entry (without one, its tile stays inert even with a renderer); a choice of `leaf`; any non-switch option rows need another boolean like `cardRows` plus a hand-written block in `LayoutFrame`; new view flags need `savedView` fields and `VIEW_DEFAULTS` (`views.ts:206-236`, outside); SymbolsPM/ViewTypesPM rows. Group/Sort/Filter/Visibility need nothing — they adapt through `nests`.

**Proposed Change:** One interface-side presentation table, entry per implemented kind: `{ Renderer, layout: { switches, rows?(view, write): MenuRow[] } }`. Each kind's layout entry lives with its renderer (`Core/Views/Table/`, `Core/Views/Cards/` — placement for Nathan), the Cards pickers becoming Cards' `rows`. One `presentedKind(type)` (or the table lookup itself) answers both the seat and the settings, and every `nests` read goes through the presented kind. `cardRows` and `leaf` go (see F2 for `leaf`). It can't join `VIEW_KINDS`: `views.ts` is host-reachable (imported by `Core/Contract/bridge.ts`, `Core/Nexus/tree.ts`, `Core/Nexus/create.ts`, …), and `VIEW_KINDS.icon` is typed `string`, not UIX's `IconName`. After: a fifth kind = `VIEW_KINDS` entry + one presentation entry beside its renderer.

**Delta:** ≈ −15 (code moves more than it disappears; the win is one table and no kind-named flags).
**Status:** Verified (all three tables, both fallbacks, and the three declared-kind `nests` reads re-read).
**Overlaps:** 1 (F4 and its §Note; §Keep agrees `VIEW_RENDERERS` can't join `VIEW_KINDS`); 7 (F5, the double active-view read; §Q4, a new kind's tile requirements); 8 (F12 and §Insights, `nests` placeholders — this finding holds the mechanism, 8 F12 the document consequence).
**Outside the Domain:** `ViewHost.tsx`, `Table/`, `Cards/`. Only the three direct `VIEW_KINDS[view.type].nests` reads change (`ViewHost.tsx:23`, `GroupFrame.tsx:142`, `SortFrame.tsx:89`); `Pipeline/group.ts:391` takes `nests` as a parameter and needs nothing.

##### F2 • Two Routes Into the Same Panes: `door`, `ViewLeaf`, and Three Dispatchers

**What's There:**
- `LayoutFrame` is two components behind `door: 'flat' | 'full'` (`LayoutFrame.tsx:115-124`); they share only `grid`, `setType`, `cardsRows`. The flat form returns at `:193-203`; the full form is everything after.
- Three dispatchers route the same pane ids: `SettingsFrame.detailFor` (`SettingsFrame.tsx:154-180`), `LayoutFrame.leafFor` (`LayoutFrame.tsx:209-231`), `ViewLeaf` (`ViewLeaf.tsx:29-47`). `ViewLeaf` already unified Group/Sort/Filter in `9ec7b3bd0` ("one route to the view settings panes"), but Visibility and Layout kept per-door routing.
- The two doors split the same content differently: full door = grid on the editor root, Layout leaf = Visibility + switches (Table) or switches alone (Cards), Cards rows pinned to the editor root (`:248`); flat door = grid + switches + Cards rows in Layout, Visibility a sibling (`SettingsFrame.tsx:165-174`).
- **Divergence:** Cards honor `hidden_properties` (`Pipeline/columns.ts:64-67` → host `columns` → `CardsView.tsx:113`), yet the view editor offers a Cards view no Visibility list (`LayoutFrame.tsx:212-220`); only the Settings door reaches it. The cards-only switches leaf dates from `99828cc54` (07-18-2026, "options move behind the Layout leaf") with no stated reason, then was encoded as `leaf` data in `9ec7b3bd0`. *Inferred:* it predates Cards showing properties.
- Every pane re-declares the same props (`{source, view, schema, back}` at `GroupFrame.tsx:115-120`, `SortFrame.tsx:34-39`, `VisibilityFrame.tsx:84-91`, `ViewLeaf.tsx:20-26`, `LayoutFrame.tsx:116-120`) and re-binds its own writer (`useSaveView(source)` + `save = (patch) => void saveView(view, patch)` at `GroupFrame.tsx:122-123`, `SortFrame.tsx:40-42`, `VisibilityFrame.tsx:92,105`, `LayoutFrame.tsx:127-128`, `ViewSwitches` `:77` again inside the same file, `ViewLeaf.tsx:28,44`, `SettingsFrame.tsx:72`).
- The pane list is spelled as `ViewLeafId` (`ViewLeaf.tsx:12`) → `ViewRowId`/`ViewRow<Id>`/`VIEW_ROWS` (`LayoutFrame.tsx:101-113`, exported for SettingsFrame) → `FrameId`/`ENTRIES` (`SettingsFrame.tsx:35-41`), and the chevron-row builder is written twice verbatim (`SettingsFrame.tsx:109-116`, `LayoutFrame.tsx:261-269`).

**Proposed Change:** `ViewLeaf` grows into the one pane route: a `VIEW_PANES` table (visibility, layout, group, filter, sort — label, icon) and one dispatcher taking one props type and handing each pane a bound `save`. `LayoutFrame` becomes the flat form only, kind-agnostic after F1 (`door`, `leafFor`, `toView`, `ViewSwitches`/`separated`, `leaf` all go). The per-view editor (today's full door) becomes a small `ViewEditor` beside `ViewFrame` — ⋮ header, name/icon header, and the same `VIEW_PANES` rows routed through the same dispatcher. SettingsFrame lists `properties` + `VIEW_PANES` through the same row builder. Result: one Layout pane, one Visibility route, the Cards divergence fixed by construction. The dispatcher keeps `FilterFrame`'s own wiring (`ViewLeaf.tsx:36-45`): `key={view.id}`, `read={() => readLiveView(…)}`, `locations`, `tree`, and `onCommit`, since `FilterFrame` is also the Matrix's and Preview Rules' standalone editor; the other four panes take the shared props and the bound `save`.
- **Nathan Ruling Needed — the editor root:** **(A)** editor root = header + the five rows, type grid lives in Layout (both doors identical below the root); **(B)** keep the grid on the editor root as today (≈ 15 lines more, and Layout then shows the grid twice-reachable). A is what this report recommends.

**Delta:** ≈ −100 for A (range −70 to −130), ≈ −85 for B.
**Status:** Verified (structure, three dispatchers, the per-pane writer re-binds, and the Cards-visibility divergence all re-read); the delta is an estimate, and the intent behind the Cards gap stays inferred. A visible design change under A — needs Nathan's yes.
**Overlaps:** 7 (F9, SettingsFrame's header forks between view and container — the same pane's other scope fork); 8 (§Names, `ViewRow<Id>` collides with the page `ViewRow`; §Already False, `SymbolsPM.md:18`; Properties Drive selectors).
**Outside the Domain:** none beyond F1's.

##### F3 • Switch Rows Are Hand-Built in Five Places; `switchRows.tsx` Is a View-Only Patch Over a Kit Gap

**What's There:** `MenuIndex.tsx` gives `pickerRow` (`:55-78`) and `steppedRow` (`:80-88`) but no switch builder, so switch rows are hand-rolled: `switchRows.tsx:13-31` (views), `Matrix/MatrixMenu.tsx:62-70`, `Properties/Schema/typeRows.tsx:115,133,193`, `Settings/SettingsWindow.tsx:249` (through its own `settingsRow`).
**Proposed Change:** `switchRow(glyph, label, checked, onChange, look?)` beside `pickerRow` in `MenuIndex.tsx`; `switchRows.tsx` is deleted (the per-kind `switches` data in F1 maps through `switchRow`); Matrix and typeRows use it. Once F4's polarity ruling lands, `SwitchEntry.invert` (`switchRows.tsx:10,26-28`) goes too.
**Delta:** ≈ −15 to −25.
**Status:** Corrected — the scout's −35 counts `switchRows.tsx`'s 31 lines as fully removed, but the per-kind switch data still maps through the new helper and the helper itself is new; the sites are verified.
**Overlaps:** none.
**Outside:** MatrixMenu, typeRows, possibly SettingsWindow.

##### F4 • One Flag, Two Labels, Opposite Polarity

**What's There:** `hide_page_icons` is "Page Icons" with `invert` for Table (`LayoutFrame.tsx:46`) and "Hide Icons" with no invert for Cards (`:58`), with different glyphs (`file-text` vs `eye-off`). Within Table's own list, "Column Icons" is inverted and "Hide Borders" isn't (`:44-45`). `git log -S` shows both label sets arrived when `LayoutToggles` and `CardsOptions` were merged into `ViewSwitches` (`1878a7f2e`), with no reason recorded.
**Proposed Change:** One label and polarity per flag, the same in every kind; if every switch reads in its flag's own polarity ("Hide …"), `invert` disappears. **Nathan Ruling:** "Hide X" everywhere, or "X" (shown) everywhere. Persisted keys are untouched.
**Delta:** ≈ −4.
**Status:** Verified.
**Overlaps:** none.

##### F5 • PickerMenu Cleanup (Folds In I-069)

**What's There:**
- **Dead prop:** `style` (`PickerMenu.tsx:85,112,297`) — no `<PickerMenu>` tag passes it (GlancePane's `style=` props sit on the child `div`, `GlancePane.tsx:366,426`).
- **Misnamed and misfiled shell (I-069, `IssuesPM.md:1089`):** it picks nothing; it's the pane `MenuPresenter.tsx:102`, `ManageRow.tsx:53`, `InfoButton.tsx:64`, `GlancePane.tsx:350,410`, `caretPane.tsx:74`, `ViewTile.tsx:646,655`, the Filter fields, and every picker mount in. It sits in `UIX/Pickers/` while the other shell, `MenuSurface`, sits in `UIX/Menus/`.
- **Split stylesheet:** `picker-base.css.ts` mixes shell styles (`layer`, `shield`, `pane`, `surface`, `resizing`, `PANE_RADIUS` — `:23-51`) with picker knobs (`PICKER_MAX_HEIGHT`, `PICKER_WIDTH`, `optionRing`, `treePane` — `:8-21`); `treePane` has one consumer (`LocationField.tsx:11`), `optionRing` one (`CalendarPicker.tsx:13`).
- Live single-consumer props are **not** dead: `enter`/`onExited` (glance pins), `bounds` (caretPane), `centerX` (PropertyPicker), `direction` (CalendarPicker), `modal` (glance), `glass` (glance, caretPane), `resize` (glance, caretPane), and `bareSurface` (ViewTile, Report 7 §Insights).

**Proposed Change:** Delete `style`. Rename and move the shell per I-069 — `PickerMenu.tsx`, `panePlacement.ts`, `usePaneResize.tsx`, and the shell half of `picker-base.css.ts` into `UIX/Menus/` (imports then run Pickers → Menus, as they already do; `UIX/Menus` imports nothing from `UIX/Pickers` today, so no cycle forms); `treePane` to `filter-frame.css.ts`, `optionRing` to `calendar-picker.css.ts`; `PICKER_PORTAL_ATTR` follows the rename (consumers: `GlancePane.tsx:5`, `ValueEditor.tsx:6`, `PageTile.tsx:21`). Candidate names (Nathan): `PopoverPane`, `FloatingPane`, `MenuPane`.
**Delta:** −4; the rename/move is ≈ 0 lines across ~25 import sites.
**Status:** Corrected — I-069 sits at `IssuesPM.md:1089` (`:1179` is I-040); the tag count is 20 across 16 files; `bareSurface` added to the live single-consumer list. Otherwise verified. This satisfies I-069's own condition that name and folder be decided together in one pass; the issue entry leaves the index when it lands.
**Overlaps:** 7 (§Insights, `bareSurface` has one caller paired with `hostedGutter`, which repeats `surface`'s padding — the one PickerMenu item this finding doesn't cover); 8 (§Insights, I-069 is in scope).
**Outside:** every PickerMenu consumer, `PICKER_*` importers, `mount.test`, `vitest.setup.ts:11` comment.

##### F6 • The Filter's Property and Operator Lists Bypass the Menu Door

**What's There:** Group/Sort/Filter-footing pickers open lists through `PickerControl` → `MenuDoor` → `popMenu` (`PickerControl.tsx:109-123`, `Core/Actions/menuActions.ts:8-29`), which honors the **Native Menus** device pref (`menuActions.ts:14`). The filter rule's property and operator lists are hand-built `PickerMenu` + `MenuItem` lists (`FilterFrame.tsx:62-110` `RuleField`, `:275-292` `targetOptions`, `:417-449`), so with Native Menus on, the Sort By list goes native and the filter's Property list beside it doesn't. Two mechanisms for "pick a property" across sibling panes.
**Proposed Change:** The property list (rule and draft row) pops through `popMenu` with `checked` and `icon` — `RuleField` keeps its bordered-field trigger and its own pane only for the date picker. The operator list can follow except for Checkbox, whose rows lead with the column's own `CheckboxGlyph` (`:384-389`), which `ActionItem`'s string `icon` can't carry; **Nathan Ruling:** accept a plain `square-check`/`square` glyph there, or keep the operator list hand-built.
**Delta:** ≈ −15 to −25.
**Status:** Verified (divergence and the Native Menus gate); the drive's `ownShield` cases (Properties Drive MATRIX MP-E-3) would need re-pointing at `MenuPresenter`'s own shield (`MenuPresenter.tsx:103`).
**Overlaps:** 6 (F6 turns `PaneTarget` into `PickerOption`, which this route then consumes directly; F7 moves the operator lists into `valueKinds.ts`).

##### F7 • Three Eye Wirings and Three Hideable-Row Builders in the Same Two Panes

**What's There:**
- Eye: `rowEye` in a `side` span (`paneRows.tsx:40-55`); `MenuRowView` with `trailing: {kind:'field'}` wrapping `EyeToggle` (`VisibilityFrame.tsx:53-62`); bare `EyeToggle` with `revealDim` (`GroupFrame.tsx:437-444`). `EyeToggle`'s only consumers in Core and UIX are these three.
- Row: `<LineRow className={cx(optionRow, hidden && hiddenRow)}><OptionChip/>{rowEye}</LineRow>` in `OptionOrderList.tsx:66-69` and `GroupFrame.tsx:405-412`; a `div` variant with a label in `GroupFrame.tsx:517-520`.
- **Divergence:** the Set rows' eye dims until hover (`revealDim`, from `d1f3bbce5`); the option and date rows beside them in the same Grouping pane show theirs at rest.

**Proposed Change:** One hide-eye and one hideable row, both in the file that holds the order list (see F10); one reveal rule. **Nathan Ruling:** eyes dim-until-hover everywhere, or nowhere.
**Delta:** ≈ −15.
**Status:** Verified.
**Overlaps:** none.

##### F8 • `SettingsFrame` Builds Its Root Twice and Looks Up Its Node by Hand

**What's There:** `plainRoot` (`SettingsFrame.tsx:131`) and `scopedRoot` (`:133-152`) are the same `MenuScrollFrame` with different footers. `selectionNode` (`:47-52`) re-implements `findContainerById` (`Core/Nexus/treePatch.ts:93`) through `findCollection`/`findSet`. `containerSchema(tree, schemaCollection)` (`:74`) re-resolves an owner `containerSchema` already resolves (`treePatch.ts:144-151`); `schemaCollection` is still needed for `PropertyFrame` (`:159`).
**Proposed Change:** One frame with `footer = scope ? lockTrail : scaleMore`; `findContainerById` for the lookup; `containerSchema(tree, node)`.
**Delta:** ≈ −10.
**Status:** Verified.
**Overlaps:** 7 (F9, the header's view-vs-container fork in the same component; §Q2, SettingsFrame as one of twelve view-resolution sites).

##### F9 • The Settings-Leaf Shell Is Written Eight Times

**What's There:** `MenuScrollFrame header={<MenuTopRow {...back} current="…" />} maxHeight={SETTINGS_PANE_MAX_HEIGHT}` at `LayoutFrame.tsx:195-198,214-216,234-249`, `VisibilityFrame.tsx:118-121`, `SortFrame.tsx:108-111`, `GroupFrame.tsx:224-227`, `FilterFrame.tsx:478-481`, `Properties/Schema/PropertyFrame.tsx:353-355`; `FrameSlide {...SETTINGS_PANE_FLOOR}` five times (`ViewFrame:216`, `LayoutFrame:277`, `SettingsFrame:184`, `PropertyFrame:399`, `MatrixMenu:114`).
**Proposed Change:** Optional, after F2 removes three of the eight: a `SettingsPane({ back, current, footer, className, children })` beside `SETTINGS_PANE_*`.
**Delta:** ≈ −8 after F2.
**Status:** Verified (sites). **Judgment:** not recommended. A new named wrapper for about −8 after F2 is a layer whose only purpose is the repetition F2 already mostly removes; it earns its place only if F2 doesn't land.
**Overlaps:** none.

##### F10 • Small Odd-Ones-Out

- **Sentinels:** Sort's None is `'_none'` (six references, `SortFrame.tsx:88,103,116,118,155,157`), Group's is `'none'` (`GroupFrame.tsx:155,174`); "Location" is spelled three ways — `LOCATION_SORT` `'__location__'` (persisted; keep), `'location'` (`GroupFrame.tsx:159,175`), `FILEDATA_TARGETS.location` (`GroupFrame.tsx:267-268`). One `NONE_OPTION` and the Location target option reused. ≈ −5.
- **Order row glyph:** Grouping's Order uses `arrow-up-down` (`GroupFrame.tsx:242,252,287`) — Sort By's own glyph — while Sorting's Order uses `arrow-down-up` (`SortFrame.tsx:137,163`). The only collision-free unification is Grouping's Order taking `arrow-down-up`, since Sort By wears `arrow-up-down` two rows above Sorting's Order (`SortFrame.tsx:114`). History shows no recorded reason (`git log -S` lands on a file move, `97d79a19f`).
- **`solid` pickers:** only `CARD_ROW_LOOK` opts in (`LayoutFrame.tsx:99`), deliberately per `34234d098` ("their stacked pickers open solid"); every other picker on the same settings glass (Group, Sort, Filter footings) opens non-solid. **Nathan Ruling:** "every picker over a settings pane is solid" or "none" — either way it's one rule, not one kind's. *Inferred* oversight.
- **"More" placeholder:** ViewFrame's footing uses `AccessoryButton icon="dots" ariaLabel="More"` (`ViewFrame.tsx:118-124`); SettingsFrame and PageMenu use `FooterIconButton icon="ellipsis" ariaLabel="More actions"` (`SettingsFrame.tsx:127`, `PageMenu.tsx:51-52`). Same placeholder, two components, two glyphs.
- **`cx` vs template:** `SortFrame.tsx:178` builds a class string by template where `GroupFrame.tsx:300` uses `cx`.
- **Stylesheets:** `group-frame.css.ts` is one 4-line style (`subChip`), `option-order.css.ts` two; merge (−1 file). `paneRows.tsx` merges into `OptionOrderList.tsx` (−1 file; see §Names).

**Status:** Corrected — `'_none'` appears six times on four rows, not "×4"; Sorting's second Order glyph is `:163`, not `:162`. Otherwise verified.
**Overlaps:** 6 (F6 deletes `PaneTarget`/`targetOption`, which the reused Location target option goes through).

**Combined Domain Delta (F1–F10):** ≈ −190 (range −150 to −240) without F9, of which ≈ −10 to −15 lands outside the domain (Matrix, typeRows). Re-summed from the per-finding estimates; the scout's −170 didn't match its own rows. F2 carries over half of it, so the total rests on Nathan's F2 ruling.

---

#### 3. Names

| Now | Problem | Proposed |
| --- | --- | --- |
| `door` (`LayoutFrame.tsx:121-122`) | Same word as `MenuDoor`/`setMenuDoor` (`PickerControl.tsx:23-33`), a different concept | Gone under F2 |
| `ViewLeaf` / `ViewLeafId` / `ViewRowId` / `ViewRow<Id>` / `VIEW_ROWS` / `FrameId` / `ENTRIES` | Five names across three files for one list of settings panes; `ViewRow<Id>` also collides with the page `ViewRow` (`viewRow.ts:32`, Report 8 §Names) | `ViewPane`, `ViewPaneId`, `VIEW_PANES` |
| `paneRows.tsx` | Says nothing; holds order-picker helpers and the hide eye | Merged into `OptionOrderList.tsx` (or `orderRows.tsx`) |
| `SUB_LOOK` | Also applied to the **primary** Order row when a sub exists (`SortFrame.tsx:131,147`, `GroupFrame.tsx:257`) — it means "tucked under the row above" | `TUCKED_ROW` |
| `cardRows` (field) / `cardsRows` (JSX) | Singular/plural pair for a kind-named flag | Gone under F1 |
| `ViewSwitches` + `separated` | A wrapper that re-binds the writer its parent holds | Inlined under F2 |
| `PickerMenu` / `PICKER_PORTAL_ATTR` | I-069 | Per F5 |
| `Folder` (`LocationField.tsx:17`) | A third name for `CollectionNode \| SetNode` (spelled at 35 production sites in `Core/Views`; `ContainerNode` exists but is unexported, `Nexus/tree.ts:47`) | One exported alias, cross-cutting |
| "pane" modules: `paneDrop`, `panePlacement`, `paneTargets`, `paneRows`, `usePaneResize`, `paneCtl` | Six unrelated meanings of "pane" | `paneTargets` → `pickTargets`, unless Report 6 F6 moves it into Settings and deletes `PaneTarget`, which resolves it; the rest resolve under F5/F10 |
| `MenuFooting`, `FootingItem`, `FootingCreate` vs `FooterIconButton`, `FooterLockButton`, and `MenuScrollFrame`'s `footer` (`MenuRows.tsx:194-387,399-418`) | Two words for one slot in one file | One word ("Footing" for the bar's pieces, or "Footer" throughout) |
| `DropOutline` / `dropOutline` (`DisclosureRow.tsx:27-60`) | A disclosure chevron named like a drag-and-drop target | Report 4's `DisclosureChevron` carries (this report proposed `DisclosureGlyph`) |
| `ViewFrame` | It's the views list; every other `*Frame` is one pane | `ViewList` (optional) |

---

#### 4. Placement (all proposals for Nathan)

- **Per-kind layout options** → beside their renderers in `Core/Views/Table/` and `Core/Views/Cards/` (F1).
- **The pane table and dispatcher** → `ViewLeaf.tsx`, renamed `ViewPane.tsx`; `VIEW_ROWS` leaves `LayoutFrame.tsx` (F2).
- **The per-view editor** → `ViewFrame.tsx` (beside the list it slides from) rather than a second mode of `LayoutFrame.tsx` (F2).
- **PickerMenu shell** (`PickerMenu.tsx`, `panePlacement.ts`, `usePaneResize.tsx`, shell styles) → `UIX/Menus/`; `treePane` → `filter-frame.css.ts`; `optionRing` → `calendar-picker.css.ts` (F5).
- **`UIX/Menus/frames.css.ts`** → about half its exports serve only `Core/Properties/Schema/*` or `HomepageMenu`: `assignedFill`, `assignedFillNone`, `allHeading`, `allRow`, `statusGroups`, `statusGroup`, `optionList`, `optionLead`, `compactTitle`, `ghostOptionRow`, `ghostChip`, `optionEditButton`, `configEditor`, `headerPhotoImg` (consumer map spot-checked). They belong in a Properties stylesheet; its header "KNOBS — the ViewFrame tunables" (`frames.css.ts:23`) is wrong either way.
- **ViewFrame's styles** (`chevronButton`, `archiveRow`, `archiveGlyph`, `archiveDivider`) live in `Core/Interface/Toolbar/toolbar-menu.css.ts:32-38` → a Views/Settings stylesheet. Optional: `ViewMenu.tsx` → `Core/Interface/Toolbar/` beside `OutlineMenu.tsx` and `SettingsMenu.tsx`. Report 7 F7 makes the same two moves as a finding and is their home.
- **`paneRows.tsx`** → into `OptionOrderList.tsx`; **`group-frame.css.ts` + `option-order.css.ts`** → one stylesheet (F10).

---

#### 5. Becomes False

- **`.claude/Features/ViewTypesPM.md`:** §Overview line 4 (`VIEW_RENDERERS` mapping) and §View Host (registry/`nests` sentences) under F1; §Surfaces **LayoutFrame** bullet ("the visibility list for a Table, and the cards options for Cards"; "the flat door") under F1/F2; §Surfaces **Filtering** if F6 lands; §List·Gallery·Calendar·Timeline ("picker tiles are inert") wording under F1.
- **`.claude/Features/SymbolsPM.md:18`** — already false: view-type glyphs live in `VIEW_KINDS` (`views.ts:24`), not `LayoutFrame.tsx`; and it names `SettingsFrame.tsx`/`LayoutFrame.tsx` as the frame-glyph owners (moves to the pane table under F2).
- **Properties Drive** (`.claude/scripts/Properties Drive/MATRIX.md:221-232`, `live-drive.mjs:761,1574,2114,2382`): MP-F-3 "Layout's flat form … no ⋮" (the distinction disappears under F2-A), MP-E-3 filter `ownShield` cases (F6), `VIEW_MENU` `[aria-label="View Menu"]` and `viewFrame(cdp, 'Visibility')` selectors (F2).
- **Tests:** `ViewFrame.test.tsx:154-162` (More button, if unified), `:201-236` (editor's ⋮ and header — survive if labels kept); `MenuIndex.test.tsx:54-57` uses "Page Icons" as a fixture (harmless); `PickerMenu.test.tsx`, `usePaneResize.test.tsx`, `panePlacement.test.ts` paths under F5; `FilterFrame.test.tsx` list-opening assertions under F6; `GroupFrame.test.tsx`/`SortFrame.test.tsx` if Order glyphs or sentinels are asserted (*inferred*, not opened).
- **Comments:** `frames.css.ts:23`; `PickerMenu` mentions at `GlancePane.tsx:309`, `TextPane.tsx:9,28`, `glanceSlice.ts:7`, `picker-control.css.ts:9`, `usePaneResize.tsx:51`, `vitest.setup.ts:11`.
- **Project docs:** `IssuesPM.md` I-069 (`:1089`, resolved by F5); `.claude/CLAUDE.md:109` (`UIX/Pickers` description) and its `UIX/Menus` line; `.claude/Resources/PommoraUIX.md:380` (the PickerMenu row, verified); Views Cleanup Decisions doc Open Item 1 (see §Insights).

---

#### 6. Keep

- **`ViewLeaf`'s role** — `9ec7b3bd0` made it the one route for Group/Sort/Filter; F2 widens it rather than replacing it.
- **`nests`-driven switches** in Group, Sort, host, pipeline — registry-driven, no kind named. The pattern F1 extends.
- **`LOCATION_SORT = '__location__'`** (`views.ts:341`) — a persisted sort `property_id` (`2cf466bc1`); it stays even though `FILEDATA.location.id` is `'_location'`.
- **`ownShield` on the Filter's fields** (`FilterFrame.tsx:105,168`) — drive-pinned (MP-E-3) and correct while those lists stay their own panes.
- **The disabled placeholders** (`ViewFrame.tsx:117-124`, `SettingsFrame.tsx:127`, `VisibilityFrame.tsx:46-52`) — Nathan's; only their mismatched component/glyph is raised (F10).
- **`useMultiValue.ts`** — two consumers in two files, wraps `pickModel.toggleValue`.
- **`PickerControl`'s injected `MenuDoor`** — UIX can't import Core's `popMenu`; the injection is the boundary.
- **PickerMenu's single-consumer props** — each has a live consumer (F5).
- **`FilterFrame` in `Views/Settings/`** despite Matrix and Preview Rules consumers — the filter model it edits lives in `Core/Views`.
- **`LocationHierarchy` and `LocationTree` as separate renderers** (`GroupFrame.tsx:339`, `LocationField.tsx:39`) — one drags, hides, and springs over the band model; the other picks with narrowed/flipped disclosure and `pickRuns`. `DisclosureRow` + `useDisclosureSet` is already the shared piece (Report 4 F2 reshapes that state).
- **Group and Sort as separate panes** — their By/Order/Sub/Order skeleton looks alike, but every row's options and writes differ; a generic "criterion pane" would be an abstraction for its own sake.

---

#### 7. Insights & Concerns

- **Open Item 1 (Decisions doc):** GroupFrame already adapts through the registry's `nests`; a per-kind grouping surface (FrameworkPM's reading, `.claude/FrameworkPM.md:21`) would regress One Way. Recommend ViewTypesPM's reading wins and FrameworkPM's line changes (Report 8 F12 dates FrameworkPM's line as older than the one grouping plan).
- **`nests` carries two meanings:** "bands nest" and "offers flat (Group By None) plus Location sort." Table Flatten is pending (ViewTypesPM §Pending), which will split them. Don't add a capability now; note that the registry field will need it (Report 8 F12 lists five readers).
- **List lens:** in this domain the reusable row behavior is `DisclosureRow`/`useDisclosureSet` and `pickRuns`; a List renderer would share them with the Sidebar tree and BundleTable, not with anything in the panes.
- **Glyph collision:** the Layout pane's glyph (`layout-dashboard`, `LayoutFrame.tsx:109`) is also Gallery's kind glyph (`views.ts:28`); with all six kinds on screen in the grid right under a "Layout" back bar, it reads as Gallery.
- **ViewTile's view list** (`ViewTile.tsx:655-674`) re-draws ViewFrame's rows (glyph, `picked`, right-click, New View footing) over the tile's own views — Report 7 F2 holds this.
- **`CollectionNode | SetNode`** (35 production sites in `Core/Views`) wants one exported alias; cross-cutting, low risk.
- **Concern:** F2-A changes what the views dropdown's editor shows (grid moves into Layout). It's the cleaner end state but it's a visible design change — it needs Nathan's yes before planning assumes it.

---

#### Removed

- None. F9 stays recorded with a not-recommended judgment rather than removed, since its observation is correct.

#### Cross-Report Conflicts

- **Three Per-Kind Tables (5 F1 · 1 F4 · 7 F5 · 8 F12):** 1 F4 and 7 F5 have `useViewHost` derive `nests` from its own `view.type`; 5 F1 requires every `nests` read to go through the *presented* kind, since an unbuilt kind seats Table. These aren't independent: if 5 F1 lands, 1 F4/7 F5's derivation reads `nests` through the presentation lookup, or it inherits today's coincidence. 5 F1 holds the mechanism; 8 F12 holds the document consequence. Sequence 5 F1 first.
- **`ViewRow<Id>` Name (5 §Names vs 8 §Names):** 5 proposes `ViewPane`/`VIEW_PANES`; 8 proposes `FrameRow`/`FRAME_ROWS`. F2 restructures the list into the pane table, so 5's names carry; 8's collision evidence is the reason either way.
- **`DropOutline` Name (5 §Names vs 4 §Names):** 4's `DisclosureChevron` carries.
- **`paneTargets` (5 §Names vs 6 F6):** 5 renames the file; 6 deletes `PaneTarget` and moves the file into Settings. 6 F6 removes more; if it lands, 5's rename is moot.
- **ViewMenu and ViewFrame Styles (5 §Placement vs 7 F7):** Same two moves; 7 F7 is the finding of record.
- **SettingsFrame Forks (5 F8 · 7 F9):** Compatible. 5 F8 merges the two roots by footer; 7 F9 removes the header's view-vs-container fork (Nathan's call). Together they leave SettingsFrame with one scope branch, at the footer.
