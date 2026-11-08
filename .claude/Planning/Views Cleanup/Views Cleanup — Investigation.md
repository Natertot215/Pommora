## Views Cleanup — Investigation

**Date:** 11-07-2026
**Grounded At:** `cae07c129` (HEAD unchanged; the working tree differs only by this Planning folder)
**Sources:** `Scouts/1 — Host, Pipeline & Persistence.md` · `Scouts/2 — Table and the Second Table.md` · `Scouts/3 — Cards Against Table.md` · `Scouts/4 — Disclosure, Bands & Nesting.md` · `Scouts/5 — Settings Panes & Picker Menus.md` · `Scouts/6 — The Views Root & Its Boundary.md` · `Scouts/7 — Embeds & Session State.md` · `Scouts/8 — Tests, Documents, Drives & Issues.md` · `Views Cleanup — Decisions & Intention.md`

Findings are cited as *Report N FN* (for example *2 F3*). Every delta is production lines (code and stylesheets, no tests, comments, or docs), negative meaning fewer, and is the reports' estimate unless this document re-derives it. **Spot-Checked Here:** the rename mechanics (`editSlice.ts`, `RenamableTitle.tsx`, `useViewCreation.ts`, `TableView.tsx`, `CardsView.tsx`, `ContentView.tsx`), the host's return (`useViewHost.ts:213-254`, 42 fields), `bandOrder.ts`/`group.ts`/`sort.ts`, `LayoutFrame.tsx`/`ViewLeaf.tsx`/`SettingsFrame.tsx`, `useColumnStyles.ts`, `containerConfig.ts`/`mutate.ts`/`ViewMenu.tsx`, `ViewTile.tsx:494-616`, every Views file size (9,801 lines across 69 files, matching *8 §Map*), and every engine-side destination, by running the repo's own walker (`Core/Testing/engineGraph.ts`) from `Core/Contract/serve.ts` against each proposed home.

---

### What's True

**Model and Persistence (Host-Run):** Seven Views files are engine-side — `views.ts`, `viewsFile.ts`, `handlers.ts`, `containerConfig.ts`, `loadValues.ts`, `viewRow.ts`, `filterRules.ts` (*1 §Map*, *6 §Map*, recomputed here). `views.ts` (402) is a grab bag: the `VIEW_KINDS` registry (`views.ts:24-31`), the codec, defaults, patch folding, band keys, ids, and doc walkers. The engine reaches `viewRow.ts` only for `PageValues`/`pageValuesOf`, through `Contract/bridge.ts:17`, `Views/loadValues.ts:2`, and `Matrix/matrixGraph.ts` (walker run). The walker counts type-only imports (`engineGraph.ts:20-45`), so any file holding `PageValues` must stay renderer-free.

**Pipeline (Window-Side, Pure):** `resolveView.ts:22-56` composes columns → filter → group with sort inside → hidden-group prune → empty prune → band order; search is a separate host step (`useViewHost.ts:96-111`). `group.ts` (456) holds six jobs, three of them not grouping (*1 F5*).

**Host:** `ViewHost.tsx` seats a renderer from `VIEW_RENDERERS` (`:11-14`) and hands it the 42-field `host` from `useViewHost` (`useViewHost.ts:213-254`), which carries session passthroughs, duplicates, and interaction-only behavior (*1 F3*). `useViewInteractions.tsx` (429) owns bands, row drops, carry, the page menu, and the ghost; `useViewCreation.ts` (218) owns creates. The view write is one act spread across `viewWrite.ts`, `Host/pendingView.ts`, and `Host/useActiveView.ts`, and `pendingView.ts:134-197` also owns unrelated tree-order paint-ahead (*1 F1*).

**Renderers:** `TableView.tsx` (502) and `CardsView.tsx` (917) each re-wire the same host pieces by hand: page naming (two mechanisms, `TableView.tsx:73-87` vs `CardsView.tsx:161`), the seat↔ghost loop (`TableView.tsx:81-95`, `CardsView.tsx:155-202`), a stable item api (`RowCellApi`, `CardApi`), and two glyph and selection paths (*3 §Map* per-responsibility table, *3 F1-F6*).

**Settings:** Two doors reach the same panes — the toolbar's Settings (`SettingsFrame.tsx`) and the views list's editor (`LayoutFrame door="full"`) — through three dispatchers (`SettingsFrame.tsx:154-180`, `LayoutFrame.tsx:209-231`, `ViewLeaf.tsx:29-47`), and the editor offers a Cards view no Visibility list although Cards honor `hidden_properties` (*5 F2*).

**Embeds:** A View Tile reuses `ViewHost` and `SettingsFrame` whole (`ViewTile.tsx:642-654`), but re-implements the view list's CRUD and row UI (`ViewTile.tsx:315-412, 453-486, 655-674`) and reads each renderer's DOM classes (`ViewTile.tsx:124-150`, `view-tile.css.ts:140-162`) (*7 F1*, *7 F2*).

**Where a New Kind Plugs In Today:** a `VIEW_KINDS` entry (`views.ts:24-31`); a `VIEW_RENDERERS` entry (`ViewHost.tsx:11-14`); a `LAYOUT_OPTIONS` entry, without which its tile in the type grid stays inert (`LayoutFrame.tsx:52-64, 185`), plus a `leaf` choice and a kind-named flag like `cardRows` for any non-switch rows (*5 F1*); the renderer copies the eight-step wiring in *1 §What a New Renderer Must Know* (host, interactions policy, root ref, drag shape, seat spread, rename surface, ghost props); and, inside a tile, a `resolvePeekAnchor` branch and `view-tile.css.ts` zoom rules, or it silently gets no reveal and the wrong scale (*7 §Q4*). An unbuilt kind seats Table but reads its own `nests` (`ViewHost.tsx:19-23`), held together only by every unbuilt kind carrying `nests: true` (`views.ts:27-30`, *8 F12*).

**Structural Faults the Reports Converge On:**
- **Kind identity is answered in three tables plus the tile's DOM reads** — `VIEW_KINDS`, `VIEW_RENDERERS`, `LAYOUT_OPTIONS`, `resolvePeekAnchor` (*5 F1*, *7 F1*, *8 §Insights*).
- **The renderer contract is wide and each renderer re-assembles it** — 42 host fields, two rename sessions, two seat↔ghost loops, two stable apis (*1 F3*, *3 F1-F4*).
- **One act lives in several places** — the view write (three files), the view list's CRUD (container and tile), pane routing (three dispatchers), the shown-column rule (twice), the operator lists (twice), the prune walk (three times), the bucket builder (twice) (*1 F1*, *7 F2*, *5 F2*, *6 F7-F8*, *4 F5*, *4 F10*).
- **The Views root files other domains' logic** — creation placement for every create, the item/field record Properties edits, a one-field container channel (*6 F1*, *6 F2*, *6 F5*).
- **Parallel row primitives** — six collapse-state encodings, five visibility walks, four indent functions, three table-heading constructions (*4 §How Many*, *2 F1*).

---

### Findings by Theme

Markers: **[Removal]** deletes logic or files · **[Move]** relocates without behavior change · **[Rename]** · **[Adds]** introduces a helper, file, or line count, with its justification · **[Fix]** changes behavior that's wrong today · **[Call]** needs Nathan's ruling. A finding carrying two markers does both.

#### 1. Kind Registration and the Settings Panes

The largest theme and the one that decides how a kind plugs in. Total ≈ −158 to −244.

##### 1.1 • One Pane Route; the Editor Stops Being a Second LayoutFrame [Removal] [Adds] [Call]
- **There:** `LayoutFrame` is two components behind `door: 'flat' | 'full'` (`LayoutFrame.tsx:115-124, 193-203`); three dispatchers route the same pane ids; every pane re-declares `{source, view, schema, back}` and re-binds `useSaveView` (`GroupFrame.tsx:122-123`, `SortFrame.tsx:40-42`, `VisibilityFrame.tsx:92,105`, `LayoutFrame.tsx:127-128, 77`, `ViewLeaf.tsx:28`, `SettingsFrame.tsx:72`); the pane list is spelled three ways (`ViewLeafId`, `ViewRowId`/`VIEW_ROWS`, `FrameId`/`ENTRIES`) and its chevron-row builder twice (`SettingsFrame.tsx:109-116`, `LayoutFrame.tsx:261-269`). The editor's Layout leaf gives Cards switches only (`LayoutFrame.tsx:212-220`).
- **Change:** `ViewLeaf.tsx` → `ViewPane.tsx`: one `VIEW_PANES` table (visibility, layout, group, filter, sort) and one dispatcher handing each pane a bound `save`, keeping `FilterFrame`'s own wiring (`ViewLeaf.tsx:36-45`). `LayoutFrame` becomes the flat form only (`door`, `leafFor`, `toView`, `ViewSwitches`, `separated`, `leaf` go). The per-view editor becomes a small `ViewEditor` in `ViewFrame.tsx` routing the same rows through the same dispatcher. The Cards Visibility gap closes by construction.
- **Adds:** `ViewEditor` and the `VIEW_PANES` table, each replacing more than it adds (the full door and two dispatchers).
- **Source:** *5 F2* · **Status:** Verified (structure, dispatchers, re-binds, Cards gap); delta estimated · **Delta:** −70 to −130 under A; about 15 fewer saved under B.
- **Depends On:** 1.2 (kind-agnostic Layout). **Conflicts:** none; composes with 1.4 and 1.5.

##### 1.2 • One Presentation Table per Implemented Kind [Removal] [Move]
- **There:** "which kinds are built" is answered by `VIEW_RENDERERS` (`ViewHost.tsx:11-14`) and `LAYOUT_OPTIONS` (`LayoutFrame.tsx:52-64`, also gating the grid at `:185`); "unbuilt presents as Table" by `?? TableView` (`ViewHost.tsx:19`) and `?? TABLE_LAYOUT` (`LayoutFrame.tsx:130`); three `nests` reads use the declared kind (`ViewHost.tsx:23`, `GroupFrame.tsx:142`, `SortFrame.tsx:89`); `cardRows`/`leaf` are kind-named flags (`LayoutFrame.tsx:38-39, 137-175`).
- **Change:** one interface-side table, `{ Renderer, layout: { switches, rows? } }` per built kind, each entry beside its renderer; one presented-kind lookup answers the seat, the settings, and every `nests` read. It can't join `VIEW_KINDS` — `views.ts` is engine-side and React components would break `engineGraph.test.ts:7-9`.
- **Source:** *5 F1* (with *1 F4 §Note*, *8 F12*) · **Status:** Verified · **Delta:** ≈ −15.
- **Depends On:** none; sequence first (*5 Cross-Report*). **Conflicts:** none.

##### 1.3 • `ViewHost` Reads the Active View Once [Removal]
- **There:** `ViewHost.tsx:18` and `useViewHost.ts:56` both call `useActiveView`; `nests` is passed in only because the caller read it first (`ViewHost.tsx:23`).
- **Change:** `useViewHost(source)` derives `nests` through 1.2's presented kind.
- **Source:** *1 F4* (*7 F5* removed into it) · **Status:** Verified · **Delta:** −4. **Depends On:** 1.2.

##### 1.4 • `SettingsFrame` Builds One Root and Uses the Tree's Lookups [Removal]
- **There:** `plainRoot`/`scopedRoot` differ only by footer (`SettingsFrame.tsx:131-152`); `selectionNode` re-implements `findContainerById` (`:47-52` vs `Nexus/treePatch.ts:93`); `containerSchema` re-resolved (`:74`).
- **Source:** *5 F8* · **Status:** Verified · **Delta:** −10.

##### 1.5 • The Settings Header Means One Thing [Removal] [Call]
- **There:** in a tile the header renames the view; in the main pane, the container (`SettingsFrame.tsx:76-102`).
- **Change:** (a) both show the view — a visible change; (b) keep and document.
- **Source:** *7 F9* · **Status:** Verified · **Delta:** (a) −6, (b) 0. **Composes With:** 1.4.

##### 1.6 • The Filter's Property and Operator Lists Go Through the Menu Door [Removal] [Fix] [Call]
- **There:** Group/Sort lists honor Native Menus via `popMenu` (`PickerControl.tsx:109-123`, `menuActions.ts:14`); the filter's property and operator lists are hand-built `PickerMenu` + `MenuItem` (`FilterFrame.tsx:62-110, 275-292, 417-449`), so they ignore the setting.
- **Change:** property lists pop through `popMenu`; the operator list follows unless Checkbox's `CheckboxGlyph` rows (`:384-389`) must stay.
- **Source:** *5 F6* · **Status:** Verified · **Delta:** −15 to −25. **Depends On:** 5.3 (targets as `PickerOption`). **Touches:** Properties Drive MP-E-3 `ownShield` cases.

##### 1.7 • One Hide-Eye and One Hideable Row [Removal] [Call]
- **There:** three eye wirings (`paneRows.tsx:40-55`, `VisibilityFrame.tsx:53-62`, `GroupFrame.tsx:437-444`) and three hideable-row builders; Set rows dim until hover, option rows beside them don't.
- **Source:** *5 F7* · **Status:** Verified · **Delta:** −15.

##### 1.8 • A `switchRow` Builder Beside `pickerRow` [Removal] [Adds]
- **There:** switch rows hand-built in five places (`switchRows.tsx:13-31`, `MatrixMenu.tsx:62-70`, `typeRows.tsx:115,133,193`, `SettingsWindow.tsx:249`).
- **Change:** `switchRow(...)` in `UIX/Menus/MenuIndex.tsx` beside `pickerRow`/`steppedRow`; `switchRows.tsx` deleted. **Adds:** one helper, justified by five call sites and a kit gap.
- **Source:** *5 F3* · **Status:** Corrected · **Delta:** −15 to −25.

##### 1.9 • One Label and Polarity per View Flag [Removal] [Call]
- **There:** `hide_page_icons` is "Page Icons" inverted for Table and "Hide Icons" for Cards (`LayoutFrame.tsx:46, 58`).
- **Change:** one wording per flag; `SwitchEntry.invert` goes if every switch reads "Hide …".
- **Source:** *5 F4* · **Status:** Verified · **Delta:** −4.

##### 1.10 • Small Odd-Ones-Out in the Panes [Removal] [Call]
- **There:** `'_none'` vs `'none'` sentinels and three spellings of Location (`SortFrame.tsx:88-157`, `GroupFrame.tsx:155-175, 267-268`); Grouping's Order borrows Sort By's glyph (`GroupFrame.tsx:242`); only Cards rows open solid (`LayoutFrame.tsx:99`); two "More" placeholders (`ViewFrame.tsx:118-124` vs `SettingsFrame.tsx:127`); `paneRows.tsx` and two tiny stylesheets.
- **Change:** one `NONE_OPTION`, reuse the Location target; `paneRows.tsx` → `OptionOrderList.tsx`; `group-frame.css.ts` + `option-order.css.ts` merge; the visual ones are calls.
- **Source:** *5 F10* · **Status:** Corrected · **Delta:** −5, −2 files.

##### 1.11 • `ViewMenu` Reads the Live View [Fix]
- **There:** `ViewMenu.tsx:29` uses `pickView(node)`, the one mounted-view reader that misses staged edits.
- **Source:** *7 F10* · **Status:** Verified (visible lag inferred) · **Delta:** 0.

##### 1.12 • Toolbar Pieces Sit Beside Their Seam [Move]
- **There:** `ViewMenu.tsx` (a toolbar button) lives in `Views/Settings/` and imports `Interface/Toolbar/toolbar-menu.css` (`ViewMenu.tsx:10`), whose `chevronButton`/`archive*` styles only `ViewFrame` reads (`toolbar-menu.css.ts:32-38`).
- **Source:** *7 F7* (*5 §Placement*) · **Status:** Verified · **Delta:** 0, +1 stylesheet.

##### 1.13 • One View-Menus File in Actions [Removal]
- **There:** `Actions/viewMenus.ts` and `Actions/viewRowMenu.ts`, two hand-rolled show/hide ternaries beside `toggleLabels.ts` (`viewMenus.ts:71-79`, `viewRowMenu.ts:30-32`).
- **Source:** *7 F11* · **Status:** Corrected · **Delta:** −5, −1 file.

##### 1.14 • A `SettingsPane` Wrapper — Not Recommended
*5 F9*: eight repeated shells, but after 1.1 the wrapper saves ≈ 8 lines for a new layer. Recorded, not planned. Delta 0.

#### 2. The Host ↔ Renderer Contract

What a List would otherwise copy from TableView. Total ≈ −96 to −141.

##### 2.1 • Every View Page Title Renames Through the Session Fence [Removal] [Fix] [Call]
- **There:** Table holds `renaming` locally with a stranded-edit effect and its own `mutate({op:'rename'})` (`TableView.tsx:73-77, 84-87, 112-139`); Cards and Set bands use the session fence (`CardsView.tsx:161`, `GroupBand.tsx:242`), Cards behind a partial restatement of the winner rule (`CardsView.tsx:840` vs `editSlice.ts:53-61`) and with a post-commit flash (`editSlice.ts:111`). The `rename` slot exists to bridge them (`useViewInteractions.tsx:44-45`, `useViewCreation.ts:51, 158`). Both renderers open the create-rename only after the reply (`useViewCreation.ts:155-159`).
- **Change:** both renderers mount `RenamableTitle host="detail"` (claim logic extracted as `useRenameClaim`, `children` forwarded, `doubleClick={false}`); interactions and creation call `beginRename` themselves; `rename` leaves the policy and the creation config.
- **Source:** *3 F1*, *2 F3* (same finding; *8 F10*) · **Status:** Verified mechanics; the Cards flash verified in code, not driven · **Delta:** −18 to −30.
- **Depends On:** the rename call (§Calls 1). **Conflicts:** resolved in §Approaches 1.

##### 2.2 • Creation Reads the Host's Rows and Types Its Config From the Host [Removal]
- **There:** `useViewCreation.ts:127` re-runs `flattenContainer` for ids identical to the host's `rows` (`useViewHost.ts:84`; `pageMetadata` only sets `icon`); `ViewCreationConfig` is a 17-key `Pick` (`useViewCreation.ts:30-52`).
- **Change:** `orderPatch` reads `c.rows`; `effectiveValues` leaves the host's return; config typed `ViewHostApi & { bandBucket }` (with 2.1, `rename` goes too).
- **Source:** *1 F2* · **Status:** Verified · **Delta:** −20.

##### 2.3 • The Seat Lives Inside `useViewInteractions` [Removal] [Move] [Adds]
- **There:** each renderer closes the seat↔ghost loop by hand (`TableView.tsx:84, 90-95`; `CardsView.tsx:158, 174-202`) over a `seatHost` built only for them (`useViewHost.ts:203-211`), and each adds its own extra ghost stand-down (`TableView.tsx:255`; `CardsView.tsx:195-202`); a sidebar rename stands down the Cards ghost but not the Table's.
- **Change:** the hook calls `useValueSeat` and owns ghost suppression (`seat.open !== null || renamingPath !== null`); the policy shrinks; the two extra stand-downs go after a drive. **Adds:** +12 inside interactions, offset by −31 in the renderers and host.
- **Source:** *3 F2* · **Status:** Verified wiring; redundancy needs a live run · **Delta:** −10 to −19.

##### 2.4 • One Held Create for the Ghost [Removal] [Fix] [Adds]
- **There:** only Cards keeps an anchored ghost until its newborn lands (`CardsView.tsx:145, 278-285`); the Table drops it at once (`TableView.tsx:222`, `ghostCreate.ts:127-136`).
- **Change:** the hook returns `ghostAt` + `ghostClosing` + `ghostRootProps`. **Adds:** +8 in interactions.
- **Source:** *3 F3* · **Status:** Corrected; the Table's collapse-then-grow needs a live run · **Delta:** −5 to −10.

##### 2.5 • One Stable Item API [Removal]
- **There:** `RowCellApi` (`TableView.tsx:331-342`) and `CardApi` (`CardsView.tsx:75-106`) re-bundle the same handlers under two names each (`overlay`/`editor`, `commit`/`commitValue`, `grip`/`pageMenu`).
- **Source:** *3 F4* · **Status:** Verified · **Delta:** −10 to −15. **Depends On:** 2.3.

##### 2.6 • The Host's Return Loses Passthroughs, Duplicates, and Pointer Behavior [Removal] [Move]
- **There:** `tree`, `mutate`, `openTarget`, `schema` (also `ctx.schema`), `effectiveValues` ride the return (`useViewHost.ts:213-254`); the sort-run reassign (`:113-121, 179-198`) is read only by interactions; Table hides through `useColumns.ts:213` while Cards uses `host.hideProperty`.
- **Change:** drop the passthroughs; the sort-run reassign (and `reassignTarget`, 5.5) moves into interactions; Table calls `host.hideProperty`.
- **Source:** *1 F3* · **Status:** Corrected (42 fields) · **Delta:** −8 to −12. **Touches:** ≈ 100 accessor sites in `useViewHost.test.tsx` (*8 F4*).

##### 2.7 • One Glyph Path and Per-Row Selection [Removal] [Fix]
- **There:** Cards threads `defaultIcons`/`entityIcon` through six components while Table draws `EntityIcon` (`CardsView.tsx:127, 292, 331, 544, 875`); Table subscribes to the whole selection at the root (`TableView.tsx:49`), re-rendering on every selection anywhere.
- **Source:** *3 F6* · **Status:** Verified · **Delta:** −10 to −16.

##### 2.8 • Small Cuts Across Both Renderers [Removal]
- `interactions.pageMenu` takes the event (`TableView.tsx:143-152`, `CardsView.tsx:855-873`); `viewRootRef` typed `HTMLDivElement` so both pass `ref` (`useViewHost.ts:157`); `fillsBlank` inlined (`cardColumns.ts:7`); `hide_page_icons` read once (`TableView.tsx:218, 248`).
- **Source:** *3 F8* (*2 F9*'s duplicate counted here) · **Status:** Verified · **Delta:** −11.

##### 2.9 • `ghostRootProps` Beside `ghostAnchorProps` in UIX [Removal] [Adds]
- **There:** six sites re-spell `data-ghost-root` + enter/leave (`TableView.tsx:367`, `CardsView.tsx:472`, `Sidebar.tsx:178`, `PropertyPanel.tsx:332`, `GhostOptionChip.tsx:30`, `TileGrid.tsx:687`).
- **Change:** one helper in `UIX/Interactions/ghostCreate.ts`; 2.4's hook return uses it. **Adds:** one helper, justified by six sites.
- **Source:** *3 §Insights* · **Status:** Verified (sites) · **Delta:** −4 to −8.

##### 2.10 • `gridZone` Beside `listZone` [Move] [Adds]
- **There:** Cards reaches into `onDrop`/`folderSlot`/`carry`, returned only for it (`CardsView.tsx:299-300, 385-395`).
- **Source:** *3 F5* · **Status:** Verified · **Delta:** 0 (Cards −12, interactions +12); justified by the smaller return and the Gallery path, so optional.

#### 3. The View Write and the Live View

Total ≈ −26 to −38, plus I-070's +8 if it rides.

##### 3.1 • One `Host/liveView.ts`; Tree Paint-Ahead Becomes Its Own Module [Removal] [Move] [Rename]
- **There:** `useSaveView` → `saveViewIn` → `writeView` → `resolveViewWrite` (`viewWrite.ts:12-59`), three layers exported only for `viewWrite.test.tsx`, each tested separately; the root `viewWrite.ts` imports `Host/pendingView`; `useActiveView.ts` is 11 lines; `ViewWriteOpts`/view-state keys sit in engine `views.ts:113-119` but only window files read them; `pendingView.ts:134-197` is tree-order paint-ahead.
- **Change:** `pendingView.ts` → `Host/liveView.ts` holding the pending record, `useActiveView`, one `useSaveView` with the gate inlined, `dropIO`, and the write opts. `orderInTree`/`withChildOrder` → `Nexus/treePatch.ts` (its header at `:1` already names this; every import is engine-side — walker run). `ahead`/`usePainted`/`mutateAhead`/`refusedDrop` → `Host/paintAhead.ts`. `ViewTileScope.tsx` → `.ts`.
- **Source:** *1 F1* + *8 F2* · **Status:** Verified · **Delta:** −25 to −35 (8 F2's −12 to −15 is inside it).
- **Touches:** nine `useSaveView` callers' imports; `VisibilityFrame.test.tsx:14`'s path mock (*8 F4*); I-070's footnote.

##### 3.2 • A Locked Tile's Pill Can't Begin a Rename [Fix]
- **There:** `ViewTile.tsx:499` `onBegin={() => setRenaming(v.id)}` has no lock check while the heading's does (`:613`); the commit then drops silently in `persistConfig` (`:328-330`).
- **Change:** `onBegin={locked ? undefined : …}`; `persistConfig` collapses into `writeConfig` once a drive confirms its own check is unreachable.
- **Source:** *7 F3* · **Status:** Corrected; bug verified in code here · **Delta:** −1 to −3.

##### 3.3 • I-070 as a Rider [Fix] [Call]
- **There:** every refused cross-band drop joins at `dropIO(...).persistAfter` (`pendingView.ts:222-231`), which holds the view as of the drop.
- **Change:** re-place the row at its prior slot on the live order in the refusal arm (`pendingView.ts:229`). It doesn't fall out of 3.1; it rides only because 3.1 opens the file.
- **Source:** *8 F10*, *IssuesPM I-070* · **Status:** Verified · **Delta:** +8 (the issue's own estimate; excluded from totals until approved).

##### 3.4 • Test-Only Exports in the Model [Removal]
`decodeGroupConfig`/`decodeSubGroup`/`DEFAULT_VIEW_TYPE` (`views.ts:16,137,144`) and `pickedStyle` un-export; tests go through `savedView.parse`. *1 F11*, *8 F5* · Verified · 0.

#### 4. The Table and the Second Table

Total ≈ −102 to −127.

##### 4.1 • `BundleTable` Draws Its Own Heading [Removal] [Call]
- **There:** three heading constructions — `ColumnHeader` (`TableView.tsx:301-318`), Archive's hand-built pair (`ArchiveView.tsx:69-88`), Trash's own classes at an 8px residue gap (`TrashFrame.tsx:40-57`, `trash-frame.css:45-58`) — and the two skins align the date heading differently (`archive-view.css:2-4` vs `trash-frame.css:38-40`).
- **Change:** `BundleTable` renders `.table-head` from two `{icon, label}` props, folding `DateHeading`; skins pass labels.
- **Source:** *2 F1* · **Status:** Verified · **Delta:** −40 to −55 (stylesheets included).

##### 4.2 • The Resize Gesture Joins the Drag Gesture; `ColumnHeader.tsx` Goes [Removal]
- **There:** `useColumns` owns the column drag (`useColumns.ts:246-332`) but hands five resize callbacks to TableView, threaded into `ColumnHeader`'s 13 props (`TableView.tsx:302-317`), where the gesture runs (`ColumnHeader.tsx:38-63`); `onResizeStart(id)` passes an id the hook ignores (`useColumns.ts:197`).
- **Change:** `startResize(e, id)` beside `startColumnDrag` on `beginGesture`; header JSX inlines into TableView's header map; `ColumnHeader.tsx` (77) deleted. Lighter alternative in §Approaches 8.
- **Source:** *2 F2* · **Status:** Verified · **Delta:** −45 to −55 (the reconciler's lower half; the gesture body is ≈ 25 of 77 lines).

##### 4.3 • `reorderColumns` Goes; `useColumns` Persists Through `placeInShown` [Removal]
- **There:** `reorderColumns` (`useColumns.ts:78-87`) is `placeInShown` (`visibilityModel.ts:22-34`) for a shown id.
- **Source:** *2 F4* · **Status:** Verified · **Delta:** −12. **Depends On:** 5.6 (where `placeInShown` lands).

##### 4.4 • The Table Shell Gets a Shared Class; `.row-grip` Lives in One Sheet [Move] [Rename]
- **There:** Archive imports `Views/Table/table-view.css` for its shell and wears `table-view` (`ArchiveView.tsx:21, 67`); `.row-grip` is split across `table.css:199-221` and `table-view.css:45-52`. The shell can't go to UIX: it reads Core's `--content-inset` (`Interface/styles.css:57`).
- **Source:** *2 F7* · **Status:** Verified · **Delta:** −3. **Conflicts:** `view-tile.css.ts:140` keys on `.table-view` — land after 8.4 or rename together.

##### 4.5 • Property-Cell Styles Leave `UIX/Table` [Move]
- **There:** `table.css:222-321` styles classes only `Core/Properties/Cells`, `PropertyPanel`, and Cards emit; `.value-seat` is never on a table.
- **Change:** → `Core/Properties/Cells/cells.css`, imported by `Cell.tsx`.
- **Source:** *2 F5* · **Status:** Verified · **Delta:** +1.

##### 4.6 • Small Cuts in TableView and `useColumns` [Removal]
`DataRow` uses `<LineRow>` like `BundleRowView`; `DragShift` folds into `ColumnDrag` (`useColumns.ts:91-92`). *2 F9* (less the `hide_page_icons` line counted in 2.8) · Verified · −3.

##### 4.7 • Kept: `COLUMN_LAYOUT`, `BundleTable`'s Date-Style Composition, `ROW_H`
*2 F8*'s whole-file column-style move is blocked (5.7); `BundleTable.tsx:69-97` keeps composing its column-less style (*1 F9* as corrected); `ROW_H = 29.75` (`BundleTable.tsx:107`) stays, and the Archive Drive pins the same number (`live-drive.mjs:1740`, *2 F10*). Delta 0.

#### 5. The Views Root and Its Boundary

Dissolutions of misfiled or duplicated root files. Total ≈ −69 to −80.

##### 5.1 • `container:configure` Becomes a `setViewButton` Mutate Op [Removal]
- **There:** a 15-line file and a channel for one key (`containerConfig.ts:6-15`, `handlers.ts:55-60`, `bridge.ts:116-119`), one caller (`ViewMenu.tsx:36`), while sibling single-field sidecar writes are `mutate` ops (`mutate.ts:173-187`).
- **Change:** `setViewButton` written like `setDisclosureLock`; delete the file, handler, type, and bridge entry. Same file key and lock, so sync-neutral.
- **Source:** *6 F2* (*1 F10* removed into it) · **Status:** Verified here · **Delta:** −17 to −19.

##### 5.2 • `filterModel.ts` Dissolves [Removal]
- **There:** Title/Location operator lists (`filterModel.ts:31-49`) apart from every other kind's (`valueKinds.ts:67-120`); `decodeFilter`/`filterTargets` serve only `FilterFrame`.
- **Change:** ops → `valueKinds.ts`; `filterTargets` → `paneTargets.ts`; `decodeFilter` → `FilterFrame.tsx`.
- **Source:** *6 F7* · **Status:** Verified · **Delta:** −12.

##### 5.3 • Targets Are `PickerOption`s [Removal]
- **There:** `PaneTarget` `{id,label,icon}` always converted by `targetOption` (`paneTargets.ts:7-11, 40-44`); `schemaTargets`' `def` unread.
- **Source:** *6 F6* · **Status:** Verified · **Delta:** −15. **Placement:** §Calls 18.

##### 5.4 • `creationOrder.ts` Splits by Owner [Removal] [Move] [Rename]
- **There:** `tieOrderWith` (a view's `manual_order`) beside `placeAt`/`placementSlot`/`placeNew` (any create) (`creationOrder.ts:10-75`); a second, unrelated `placeAt` in `UIX/Utilities/moveItem.ts:10`.
- **Change:** `tieOrderWith` → `Host/useViewCreation.ts`; `placeAt` (renamed `placedBeside`) and `placementSlot` → `Nexus/order.ts` (engine-safe: `personalization.ts`, `mutateRequest.ts`, `order.ts` are all engine-side — walker run); `placeNew` → `Actions/createActions.ts` (into `Nexus/order.ts` would close a cycle through `treePatch.ts:17`).
- **Source:** *6 F5* · **Status:** Corrected · **Delta:** −6.

##### 5.5 • `reassign.ts` Dissolves [Removal]
`reassignable`/`groupKeyToValue` → `valueKinds.ts` beside `groupable`; `reassignTarget` follows the sort-run reassign into interactions (2.6). *6 F10* · Verified · −5.

##### 5.6 • The Shown-Column Rule Is Stated Once [Removal]
- **There:** `resolveColumns` (`columns.ts:60-73`) and its complement `hiddenListIds` (`visibilityModel.ts:7-20`).
- **Change:** `visibilityModel.ts` merges into `Pipeline/columns.ts` over one predicate.
- **Source:** *6 F8* · **Status:** Verified · **Delta:** −5.

##### 5.7 • Column Styles: Pure Resolvers to Properties, the Hook Beside `useSetting` [Removal] [Move] [Rename]
- **There:** `useColumnStyles.ts` is three pure resolvers and one hook (`:61-65`), used by six files in four domains; `pickedStyle` is exported only for its test.
- **Settled:** `styleFor`/`columnStylePatch` (with `pickedStyle` private and `NexusForms` → `DateForms`) → `Properties/columnStyles.ts`, legal because their only new imports are types from engine-side `viewRow.ts`/`views.ts`. `useNexusForms` can't follow: it imports `useMemo` and `Session/store`, and `engineGraph.test.ts:11-21` allows no `react` external. It goes to `Session/store.ts` as `useDateForms`, beside `useSetting`/`useFold` (`store.ts:67-80`), the store's existing setting hooks, so no new file. `PageReaderWindow.tsx:132-133` and `DateTimeValuePicker.tsx:24-27` read the same pair and adopt it. `Host/useColumnStyles.ts` is deleted.
- **Source:** *1 F9* (*2 F8*, *6 F11*) · **Status:** Confirmed against `engineGraph.test.ts` · **Delta:** −2 to −4.
- **Depends On:** `ResolvedColumn` staying in an engine-side file. Under §Approaches 4b `viewRow.ts` turns window-side, so `ResolvedColumn` moves to `Properties/properties.ts` beside `ColumnType` (its only dependencies are that file's types); otherwise the resolvers' type import would drag `treeIndex.ts` and React into the engine graph.

##### 5.8 • Every `ViewRow` Builder in One Home [Move] [Call]
- **There:** row builders split between `group.ts:103-141` (`toRow`/`flattenContainer`/`frontmatterOf`) and `pageRow.ts:11-43`.
- **Change (Minimum):** they join `pageRow.ts`. The larger relocation is §Approaches 4; *6 F1* as written is blocked.
- **Source:** *1 F5*, *6 F1* · **Status:** Verified; 6 F1's gate resolved here · **Delta:** −3 to −10 (the upper end under §Approaches 4b).

##### 5.9 • `pickView` Joins `views.ts`; Search Owns Its Key Builder [Move]
`Pipeline/pickView.ts` (12) → `views.ts` (engine-safe: walker adds only itself); `searchKeysOf` → `search.ts`, the host keeping both memos so keys aren't re-casefolded per keystroke. *1 F7* · Corrected · −4.

##### 5.10 • `ROLES` Into `views.ts` — Not Recommended Now
*6 F3*: a move at ≈ +5 for discoverability only; `satisfies Record<keyof SavedView, Role>` (`configReach.ts:81`) already makes the next field impossible to forget. Excluded from totals.

#### 6. The Pipeline and the Bands

Total ≈ −38 to −50.

##### 6.1 • One Prune Walker [Removal]
`pruneEmptyBuckets`/`pruneEmptyGroups`/`dropHiddenGroups` (`group.ts:85-101, 333-350`) → one bottom-up `pruneGroups(groups, drops)`, composed in `resolveView.ts:51-54`. *4 F5* · Verified · −15.

##### 6.2 • `bandOrder.ts` Dissolves Into an Ordered Set Tree [Removal] [Fix] [Call]
- **There:** `orderGroups` re-walks built groups and holds non-set slots (`bandOrder.ts:1-22`), one caller (`resolveView.ts:55`).
- **Change:** `orderSetTree(tree, group_order)` in `group.ts`, applied beside `pruneHiddenSets`.
- **Found Here:** band order is equivalent, but `structuralFlat` and `structuralSubGrouped` gather a band's pages through `subtreeIds` (`group.ts:74-76, 278, 308`), so an ordered tree reorders pages from nested Sets inside one band whenever `makeSorter` returns null (no sort, no manual order, `sort.ts:57-60`) or rows tie (`sort.ts:76-78`). Table without a sub-grouping (`structural`) and the property plan are unaffected.
- **Source:** *4 F6* (*1 F7* fallback) · **Status:** Corrected; confirmed here · **Delta:** −12 dissolved, ≈ −4 folded unchanged into `resolveView.ts`.

##### 6.3 • One Bucket Builder [Removal] [Call]
`property()` (`group.ts:217-242`) and `structuralSubGrouped`'s block (`:307-321`) become one `bucketBands(rows, grouping, sorter, placement, keyOf, keepLive)`; the empty-live-option divergence (`:232-236` vs `:315-316`) is surfaced, not unified. *1 F6* = *4 F10*, counted once · Verified · −8 to −12.

##### 6.4 • Band Types Live in the Model [Removal] [Move]
`SetRef`/`BucketRef`/`BandRef` and `bucketValueAt` move from `bandRouter.ts:9-20, 149-163` into `bandModel.ts`; mirror types `BandItem`/`BandList` go; the router takes a value import of `bucketValueAt`, with no cycle while the model imports only types back. *4 F7* · Corrected · −6.

##### 6.5 • "Top-Level Set Opens" Is the Tree's Rule [Removal]
`opens = heads.foldersOpen || isTopContainer(set)` (`treePatch.ts:96-98`); `opensTop` leaves `HeadContext` (`bandModel.ts:74, 104`). *4 F8* · Verified · −3.

##### 6.6 • The Member-Indent Rule Has One Owner [Removal] [Fix]
TableView's tail-vs-member indent (`TableView.tsx:212-213, 228-229`) and the drop line's (`useViewInteractions.tsx:337`) disagree by `--loose-inset`, an 8px relative divergence; `memberIndent(kind, depth)` beside `memberDepth` in `bandModel.ts` serves both. *4 F1* (*2 F11* removed into it) · Verified in code; visible offset needs a live run · −2.

##### 6.7 • `group.ts` Sheds Its Non-Grouping Jobs [Move]
`formatBucketLabel` (`group.ts:143-172`) → `Bands/bandModel.ts`; `orderedChildren` + `setIndex.ts` → `Bands/` (its only reason to sit in `Pipeline/`, per `2ad73c8f6`); row builders per 5.8. *1 F5* · Corrected · 0 (imports counted in 5.8).

##### 6.8 • GroupFrame's Fabricated Band Tree — Flag Only
`GroupFrame.tsx:369-383` builds `ResolvedGroup`s with empty `items` to reuse `bandModelOf`. *4 F11* · Corrected · 0, not planned.

#### 7. Disclosure and Row Primitives

Ground for List's disclosable rows. Total ≈ −30 to −37.

##### 7.1 • One `{ isOpen, toggle }` Disclosure Shape [Removal] [Rename]
- **There:** bands take a *collapsed* set (`GroupBand.tsx:36,52,63`), `useDisclosureSet().has` means *open* (`DisclosureRow.tsx:19`), GroupFrame inverts one into the other every render (`GroupFrame.tsx:384-387`), `toggleCollapse` hand-writes `toggled` (`useViewHost.ts:145-150` vs `checkSet.ts:1-5`), LocationField hand-rolls a second set (`LocationField.tsx:106-118`).
- **Source:** *4 F2* · **Status:** Corrected (the hook's default must accept a predicate) · **Delta:** −10.

##### 7.2 • One `unfolded` Walk [Removal]
`shownHeads` (`bandModel.ts:179-188`) and `openHeadingRows` (`MarkdownPM/Autocomplete/autocomplete.ts:141-153`) are one depth-sentinel walk. *4 F3* · Corrected · −8 to −10.

##### 7.3 • GroupBand's Chevron Uses `DropOutline`'s Own Toggle [Removal] [Fix] [Call]
`GroupBand.tsx:178-185` wraps the chevron in its own button with two CSS rules (`group-band.css:42-50`, `table-view.css:69-71`) and an extra Tab stop inside a head that's already the `treeitem` (`:159-160`). *4 F4* · Verified; Tab behavior needs a live run · −10.

##### 7.4 • One Indent Step [Removal] [Call]
`--row-indent` is an alias read once (`table-tokens.css:8`); `rowIndent` reads `--disclosure-indent`; `rowLead` builds on it; dead `--disclosure-rail-x` fallback goes (`listed-outline.css.ts:16`). *4 F9* · Corrected · −2.

##### 7.5 • `RowLead`: One Lead Cell for Three Row Shells [Removal] [Call]
`DataRow`, `GhostRow`, `BundleRowView` each build the lead cell, rail, and rail slot (`TableView.tsx:366-390, 430-495`, `BundleTable.tsx:258-313`). Earns its place only if it also absorbs one indent mechanism or the ghost's missing rail. *2 F6* · Verified (duplication) · 0 to −5. **Conflicts:** 7.4's placement (§Approaches 5).

##### 7.6 • Kept: Sidebar Branch Row, the Two Drop Models, the Bundles Open Map
Merging `Disclosure.tsx:161-221` into `DisclosureRow` grows it by ~6 props to save ~15 lines (*4 F12*); `bandSnap` and `sidebarSlot` serve different worlds (*4 §Keep*). Delta 0.

#### 8. View Tiles

Total ≈ −55 to −91.

##### 8.1 • One View-Row Menu and One List Row for Both View Lists [Removal] [Call]
- **There:** `ViewFrame.tsx:91-109` and `ViewTile.tsx:453-486` are the same switch over `viewRowMenuItems`; the list row repeats (`ViewFrame.tsx:111-189`, `ViewTile.tsx:655-674`); behavior diverges (duplicate switches only in a tile, `ViewTile.tsx:373`; the tile dropdown can't reorder).
- **Change:** `runViewRowAction` beside `viewRowMenuItems` and one `ViewListRow`. Optional: the shared rules (last-view guard, insert-after, `freeName` + `mintViewId`) as small helpers in `views.ts`. The two stores differ in id location, active representation, refusal shape, and undo carriage, so a shared ops layer shares only those rules.
- **Source:** *7 F2* (*1 F8*, *6 F4* removed into it) · **Status:** Verified; delta Corrected · **Delta:** −25 to −35 (UI), −10 to −20 more with the rule helpers.

##### 8.2 • `usePillPresence` Becomes `useEntrance` [Removal]
`ViewTile.tsx:77-113` hand-rolls entrance tracking and assigns a ref during render (`:400`); `useEntrance` (`UIX/Animations/useEntrance.ts:5-18`, seven callers) does it. *7 F4* · Verified; lingering class needs a look · −22 to −28.

##### 8.3 • `ContainerView` Owns Its Lookup [Removal]
`ContentView.tsx:68-87` repeats find + placeholder for collection and set; `ContainerView` takes the target as `SpaceView` does (`SpaceView.tsx:6-19`). *7 F8* · Verified · −8.

##### 8.4 • Renderers Declare; the Tile Reads [Move] [Fix]
`resolvePeekAnchor`/`inPeekAnchor` (`ViewTile.tsx:124-150`) and `view-tile.css.ts:140-162` key on renderer classes; a List would silently get no reveal and the wrong scale. Renderers mark `data-view-lead`; each renderer's stylesheet holds its embed zoom under an attribute `ViewHost` sets; padding stays tile-owned on declared attributes. *7 F1* · Verified; padding needs a live check · 0.

##### 8.5 • The Tile's Payload Algebra Leaves the Surface [Move] [Adds]
`configIdOf`/`embedViewIds`/`coerceEmbeddedView`/`rawViews`/`rawActive` and the list ops as `(raw) => EntryPatch | null` → `Core/Tiles/viewTileEntry.ts`, the tile's counterpart to `viewsFile.ts`. *7 F6* · Verified · 0, +1 file (justified only alongside 8.1's rule helpers; otherwise optional).

#### 9. PickerMenu

Total ≈ −4 to −7.

##### 9.1 • The Pane Shell Is Named and Filed as a Shell (I-069) [Removal] [Move] [Rename] [Call]
Delete the dead `style` prop (`PickerMenu.tsx:85, 112, 297`); move `PickerMenu.tsx`, `panePlacement.ts`, `usePaneResize.tsx`, and the shell half of `picker-base.css.ts` into `UIX/Menus/` under one new name; `treePane` → `filter-frame.css.ts`, `optionRing` → `calendar-picker.css.ts`. `UIX/Menus` imports nothing from `UIX/Pickers`, so no cycle. *5 F5* · Corrected · −4. The `bareSurface` + `hostedGutter` pair (one caller, `ViewTile.tsx:650`; `menu-surface.css.ts:16-20` repeats `surface`'s padding) can fold in the same pass, 0 to −3 (*7 §Insights*).

#### 10. Tests (Counted Apart)

- **Shared view seat and typed builders in `viewHarness.tsx`** — 29 `as unknown as CollectionNode` casts in 15 suites, 18 dialer installs in 12, four stale `properties:` fields (*8 F1*): −200 to −280 (builders +60).
- **Write-path triplication** (`viewWrite.test.tsx:112,211,265` etc.) goes with 3.1 (*8 F2*): −50 to −60.
- **Brittle pins:** `VisibilityFrame.test.tsx:14` path mock, `FilterFrame.test.tsx:363` debug class (*8 F4*): −5.
- **Identical Status defs** (`bandCommits.test.tsx:19-44` = `cellGestures.test.tsx:16-41`) (*8 F6*): −50.
- **`describe.each` over Table and Cards drops** (*8 F7*): −25.
- **Domain suites through `mountEachTest`** (*8 F9*): −40.
- **`reorderColumns` block** (`useColumns.test.ts:121-151`) with 4.3: −31.
- **Creation probes mount `useViewInteractions`**, not the seam (*8 F3*): 0.
- **[Adds] One Table create-to-rename test** before 2.1 changes it (*8 F8*): +20, justified because the path is untested and about to change.
- **Placement:** `bandCommits.test.tsx:194-843` → `Bands/bandDrops.test.tsx`, its column-width describe beside the Table's column suites; `manualOrderDrops.test.tsx` → `Host/rowDrops.test.tsx` (*8 §Placement*, *6 F12*).

---

### Approaches Worth Weighing

##### 1. Page Rename: Fence Now, or an ID-Keyed Claim With I-040
- **What the Code Says:** both renderers open the create-rename from the same post-flight callback (`useViewCreation.ts:155-159`), so the Table's ID-keyed state opens no sooner than Cards; Report 2 F3's premise is false (both reconcilers agree). I-040's proposed solution re-keys the *session* fence by minted ID for creates (`IssuesPM.md` I-040 *Solution*), which touches every `beginRename` caller alike — Cards, `GroupBand`, the sidebar.
- **(a) Fence Now (Recommended):** Table joins the fence in this cleanup (2.1). One mechanism; I-040 later becomes a single change in `editSlice.ts` + `createPageIn` that fixes Table, Cards, and Set bands at once. The Table is then one more call site that change re-keys, not double churn.
- **(b) Fence and I-040 Together:** the same end state in one phase. What it actually changes is scope: it pulls `Session/editSlice.ts` into this cleanup, which Decision 1 doesn't list.
- **(c) Host-Owned, ID-Keyed Naming State per View** (*8 F10*'s reading): keeps the Table's per-instance precision but leaves pages on one mechanism and Set bands, the sidebar, and the Matrix on another — two rename sessions remain.
- **The Twin Trade-Off:** the fence resolves two `'detail'` claims for one path first-come (`editSlice.ts:53-61`, `live.find(...)`). ID keying doesn't change that — twins share the ID too — so (a) and (b) carry the same cost. It's wider than the reports state: `ContentView.tsx:103-129, 192` keeps parked tabs and the homepage *mounted* under `inert`, and effects still run there, so a parked surface showing the same page likely claims too. If so, the twin exists today for Cards and Set bands across any two mounted surfaces, and the Table's "immunity" is just being outside the fence. The fix, if a drive confirms it, belongs in the fence (a parked surface's claim loses), once, for every surface.

##### 2. The View Editor's Root: A or B
- **A (Recommended):** editor root = ⋮ header, name/icon header, and the five pane rows; the type grid lives in Layout, so both doors show identical panes below the root. Largest removal.
- **B:** keep the grid on the editor root as today; ≈ 15 lines more, and the grid becomes reachable twice (root and Layout).

##### 3. `bandOrder.ts`: Dissolve or Fold
- **Dissolve (Recommended if Nathan Accepts the Change):** order the Set tree once before building (−12); removes the slot-holding logic; a custom Set order then also orders pages from nested Sets inside one Cards band or sub-grouped band, which is arguably what the custom order always meant.
- **Fold:** move `orderGroups` unchanged into `resolveView.ts` (≈ −4); no visible change; the slot-holding logic stays.

##### 4. The Item Record (`ViewRow`, `PageValues`, Builders)
- **Report 6 F1 as Written Is Blocked:** `Properties/fieldValue.ts` alone is engine-clean (walker adds only itself), but the builders it would absorb aren't: `spaceRowOf`'s `Nexus/treeIndex.ts` pulls 32 files including `UIX/Symbols/index.tsx`, React, `lucide-react`, and vanilla-extract; `columns.ts` (`contextIdentity.ts` + `treeIndex.ts`) pulls 33; `group.ts`/`toRow` 39. Because `bridge.ts:17` type-imports `PageValues`, the file holding it is engine-reachable, so builders can't share it. That fails `engineGraph.test.ts:7-21` and the hard rule "the app never depends on the renderer".
- **(a) Minimum (5.8):** builders join `pageRow.ts`; the record stays in `viewRow.ts`.
- **(b) Recommended to Verify:** the engine reaches `viewRow.ts` only for `PageValues`/`pageValuesOf` (walker run: `bridge.ts`, `loadValues.ts`, `matrixGraph.ts`). Moving those two into `loadValues.ts`, their producer and already engine-side, frees `viewRow.ts` to become window-only, and `pageRow.ts` plus `group.ts`'s builders merge into it: one window-side file for the record and every builder, `pageRow.ts` deleted. One dependency is visible now: engine-side `Properties/columnStyles.ts` would type-import `ResolvedColumn` from a file that reaches `treeIndex.ts` (5.7), so `ResolvedColumn` moves with it to `Properties/properties.ts` beside `ColumnType`, the only file its definition depends on. Run `engineGraph.test.ts` after the move to confirm.
- **(c) Types Into `fieldValue.ts`, Builders Window-Side:** legal, but Properties still imports Views for `itemColumns`/`pageRowOf`, so the two domains keep importing each other; ≈ 40 import re-points and a `ViewRow` → `ItemRow` rename for ≈ −5. Not recommended in this cleanup.

##### 5. `rowIndent`'s Home
- **Table-Owned `RowLead` (*2 F6*):** matches today, since both consumers are `.table` surfaces and `--row-indent` resolves only inside `.table`.
- **Beside the Chevron in `UIX/Elements` (*4 F9*):** reads `--disclosure-indent` directly, so it can serve a List that isn't a table.
- **Recommended:** 7.4's token change either way; keep `rowIndent` in `UIX/Table` and build `RowLead` only if it absorbs the ghost's missing rail or one indent mechanism. Revisit when List exists.

##### 6. The Two View-List Managers
UI-only sharing (8.1, recommended); plus the pure rule helpers (8.1 optional + 8.5); or one `ViewList` interface with container and tile providers, which gives the tile dropdown reorder for free but adds a layer over two stores that differ in four ways.

##### 7. Disclosure State's Home
`Disclosure` type + `unfolded` + `useDisclosureSet` stay in `UIX/Menus/DisclosureRow.tsx` (recommended; the chevron alone moves to `UIX/Elements`), or all join the chevron in `UIX/Elements`, leaving `DisclosureRow` alone in Menus.

##### 8. `ColumnHeader`: Delete or Keep as a Dumb Component
Delete and inline (4.2, recommended, −45 to −55), or keep it taking `onResizeStart(e)` with the gesture in the hook (about half the saving).

##### 9. The Band Walk
All three reports considered extracting `renderRows` (`TableView.tsx:225-278`) for List; two defer it, and *3 F7* was downgraded to "name the lift point". Recommended: defer — a walker now nets ≈ +3 to +5 with one consumer.

---

### Contradicts the Source

- **Decision 6 ([INFERRED]) Is False on Both Counts:** I-070's fix doesn't fall out of the consolidation; it's a local +8 in the refusal arm (`pendingView.ts:229`, *8 F10*). I-040's doesn't fall out either; it requires deliberately re-keying the session fence (§Approaches 1).
- **Decision 1's Scope Is Narrower Than the Findings:** they reach `Session/editSlice.ts` (only if I-040 rides), `Session/store.ts` (5.7), `Interface/RenamableTitle.tsx` (2.1), `Nexus/mutate*`, `Nexus/order.ts`, `Nexus/treePatch.ts` (5.1, 5.4, 3.1), `Actions/createActions.ts`, `Actions/viewMenus.ts`, `Properties/columnStyles.ts`, `Properties/Cells`, `MarkdownPM/Autocomplete/autocomplete.ts` (7.2), `Interface/ContentView.tsx`, `Interface/Toolbar/`, and `Core/Tiles/`. Each enters on real duplication, but the scope line doesn't name them.
- **The Decision Log's Constraint "Feature Documentation Changes Only Where This Work Makes It False"** leaves the already-false lines below in place, while the Studio's Completeness rule says not to dismiss what's resolvable as pre-existing.
- **Nathan's Framing of the Sidebar Tree as a Sharing Candidate:** it shares primitives already (`DropOutline`, `Reveal`, `MenuItem`) and should share the indent step; merging its branch row into `DisclosureRow` would be net positive (*4 F12*).
- **Nathan's Framing of List's Starting Point:** the closest existing disclosable row is `BundleRowView` (nested rows, chevron riding the indent), not TableView's `DataRow` (*2 F6*), and List's real gap is TableView's band walk, which is deliberately deferred (*4 F1*).
- **`.claude/FrameworkPM.md:21`:** "each carries its own grouping surface" — false against the code: one `GroupFrame` and one `SortFrame` adapt through `nests` (`GroupFrame.tsx:142,174,261`, `SortFrame.tsx:89`); the line predates the one grouping plan (*8 F12*). This resolves the decision log's Open Item 1 toward `ViewTypesPM.md`.
- **`ViewTypesPM.md` Already False:** `:4` "page tiles" (they're Space tiles); `:16` "a persisted ghosted page" and "are use"; `:47` typo; `:71` "scroll root" (it's the view root) and "one policy" omitting `newPages`; `:79` "the cell renderers live in `UIX/Table/`"; `:83` filler track and "every column, including the title, maintains its resolved width" (false since `3b9a119e5`); `:103` `--labels-gap` isn't a `.table` token; *§The Pipeline*'s "four pure stages" omits hide, prune, band order, and search.
- **`.claude/Features/SymbolsPM.md:18`:** view-type glyphs live in `VIEW_KINDS` (`views.ts:24`), not `LayoutFrame.tsx`.
- **`IssuesPM.md` I-040:** footnote (`:1264`) cites `TableView.tsx:~122-131`; the state and policy are `:73-77, 86-87`, and the issue omits that the two renderers rename differently.
- **`Core/Testing/viewHarness.tsx:1`:** "every view suite mounts through" — `useGhostFlip.test.tsx` doesn't (*8 F9*).
- **Overturned From the Cleaned Reports:**
  - *6 F1*'s gate reads "run `engineGraph.test.ts` before committing"; the walker settles it now — blocked for the builders, legal only for the types (§Approaches 4).
  - *2 Cross-Report Conflicts* says *1 F9* "also removes `useDateColumn`'s re-composition"; *1 F9* as corrected leaves `BundleTable`'s composition alone. 1 F9's placement holds; that sentence is wrong.
  - *8 Cross-Report Conflicts* "saveViewIn (8 F2 vs 7 F3)" is moot: *7 F3* was corrected to gate `onBegin` and no longer gives `saveViewIn` a production caller.
  - *2 F3*'s recommendation ("unify on a fence that claims by ID, landing with I-040") rests on ID keying protecting the Table; it doesn't — twins share the ID, and timing is identical (§Approaches 1).
  - *8 F10*'s host-owned, per-view naming state is twin-immune, but it leaves pages on one rename session and Set bands, the sidebar, and the Matrix on another, against One Way (§Approaches 1c).
  - The twin risk is wider than "main view + View Tile": parked tabs and the homepage stay mounted (`ContentView.tsx:103-129`).

---

### Placements

Every row needs Nathan's approval. **Blocked** rows break a hard rule and aren't proposed.

| From | To | Reason |
| --- | --- | --- |
| `Core/Views/Host/pendingView.ts` | `Core/Views/Host/liveView.ts` (renamed) | The live view record, write, and active view in one file (3.1) |
| `Core/Views/viewWrite.ts` | into `Host/liveView.ts`; file deleted | Same act (3.1) |
| `Core/Views/Host/useActiveView.ts` | into `Host/liveView.ts`; file deleted | Same record (3.1) |
| `ViewWriteOpts`, view-state keys (`views.ts:113-119`) | `Host/liveView.ts` | Only window files read them (3.1) |
| `withChildOrder`, `orderInTree` (pure half of `pendingView.ts:134-197`) | `Core/Nexus/treePatch.ts` | Pure tree patching; engine-safe (3.1) |
| `ahead`, `usePainted`, `mutateAhead`, `refusedDrop` (stateful half of `pendingView.ts:134-197`) | new `Core/Views/Host/paintAhead.ts` | Its own job (3.1) |
| `Core/Views/ViewTileScope.tsx` | `ViewTileScope.ts` | No JSX (3.1) |
| `Core/Views/deleteViewWithUndo.ts` | into `Settings/ViewFrame.tsx`; deleted | One importer (*7 §Placement*) |
| `Core/Views/containerConfig.ts` + `container:configure` handler and bridge entry | deleted; `setViewButton` in `Nexus/mutateRequest.ts` + `Nexus/mutate.ts` | One door for sidecar fields (5.1) |
| `Core/Views/filterModel.ts` | ops → `valueKinds.ts`; `filterTargets` → `paneTargets.ts`; `decodeFilter` → `Settings/FilterFrame.tsx`; deleted | One home for operator lists (5.2) |
| `Core/Views/reassign.ts` | queries → `valueKinds.ts`; `reassignTarget` → `Host/useViewInteractions.tsx`; deleted | Value-kind queries and one host helper (5.5) |
| `Core/Views/visibilityModel.ts` | into `Pipeline/columns.ts`; deleted | One shown-column rule (5.6) |
| `Core/Views/creationOrder.ts` | `tieOrderWith` → `Host/useViewCreation.ts`; `placeAt` (→ `placedBeside`) + `placementSlot` → `Nexus/order.ts`; `placeNew` → `Actions/createActions.ts`; deleted | Two owners (5.4) |
| `placeNew` → `Nexus/order.ts` | **Blocked** (import cycle through `treePatch.ts:17`) | — |
| `Core/Views/Host/useColumnStyles.ts` | resolvers → `Properties/columnStyles.ts`; hook → `Session/store.ts` as `useDateForms`; deleted | 5.7 |
| Whole `useColumnStyles.ts` → `Properties/columnStyles.ts` (*2 F8*) | **Blocked** (`react` + `Session/store` into the engine graph) | — |
| `Pipeline/group.ts:103-141` row builders | `Core/Views/pageRow.ts`, or the merged window-side `viewRow.ts` (§Approaches 4b) | One home for builders (5.8) |
| `PageValues`, `pageValuesOf` (`viewRow.ts`) | `Core/Views/loadValues.ts` (only under §Approaches 4b) | Their producer; frees the record from the engine |
| `ResolvedColumn` (`viewRow.ts:46-48`) | `Core/Properties/properties.ts` beside `ColumnType` (only under §Approaches 4b) | Keeps engine-side `columnStyles.ts` (5.7) on an engine-side type |
| Item model + builders → `Properties/fieldValue.ts` (*6 F1*) | **Blocked** (`treeIndex.ts`, `contextIdentity.ts` reach React and `UIX/Symbols`) | — |
| `Core/Views/Pipeline/pickView.ts` | into `views.ts`; deleted | Model, not a stage (5.9) |
| Search keys (`useViewHost.ts:96-107`) | `Pipeline/search.ts` | One search owner (5.9) |
| `Core/Views/Pipeline/bandOrder.ts` | `orderSetTree` in `group.ts`, or folded into `resolveView.ts`; deleted | 6.2 |
| `formatBucketLabel` (`group.ts:143-172`) | `Bands/bandModel.ts` | Presentation (6.7) |
| `Core/Views/Pipeline/setIndex.ts` + `orderedChildren` | `Core/Views/Bands/setIndex.ts` | Band layer's lookup (6.7) |
| `Core/Views/Host/useBandHeads.ts` | `Core/Views/Bands/` (renamed, §Calls 17) | Its product is band faces (*4 §Placement*) |
| Band ref types + `bucketValueAt` (`bandRouter.ts`) | `Bands/bandModel.ts` | Model owns its types (6.4) |
| `Core/Views/Table/ColumnHeader.tsx` | gesture → `useColumns.ts`, markup → `TableView.tsx`; deleted | One gesture owner (4.2) |
| `Core/Views/Table/cellSweep.ts` | `useCellSweep.ts` | File named for its export (*2 §Names*) |
| `UIX/Table/table.css:222-321` | new `Core/Properties/Cells/cells.css` | Styles only Properties emit (4.5) |
| `table-view.css:3-28` shell | shared shell class, kept in `table-view.css` or a Core-level sheet (§Calls 22) | Archive stops wearing `table-view` (4.4) |
| Table shell → `UIX/Table` | **Blocked** (reads Core's `--content-inset`) | — |
| `.row-grip` look (`table-view.css:45-52`) | `UIX/Table/table.css` | One selector, one sheet (4.4) |
| `.col-measure` (`table.css:21-33`) | `Core/Bundles/bundle-table.css` | One consumer (*2 §Placement*) |
| `DropOutline` + `listed-outline.css.ts` (`UIX/Menus`) | `UIX/Elements/DisclosureChevron.tsx` + `disclosure.css.ts` | Every external importer is outside Menus (*4 §Placement*) |
| `UIX/Table/RowRail.tsx` + `rowIndent.ts` | one `RowLead` file in `UIX/Table`, only if 7.5 earns it | §Approaches 5 |
| `Core/Views/Settings/ViewLeaf.tsx` | `ViewPane.tsx` (`VIEW_PANES` + dispatcher) | One pane route (1.1) |
| `LayoutFrame.tsx` full door | new `ViewEditor` in `Settings/ViewFrame.tsx` | 1.1 |
| `LAYOUT_OPTIONS` entries + Cards rows (`LayoutFrame.tsx:42-99, 137-175`) | one presentation entry beside each renderer in `Core/Views/Table/` and `Core/Views/Cards/` | 1.2 |
| Presentation table → `VIEW_KINDS` | **Blocked** (`views.ts` is engine-side) | — |
| `Core/Views/Settings/switchRows.tsx` | `switchRow` in `UIX/Menus/MenuIndex.tsx`; deleted | 1.8 |
| `Core/Views/Settings/paneRows.tsx` | into `OptionOrderList.tsx`; deleted | 1.10 |
| `group-frame.css.ts` + `option-order.css.ts` | one stylesheet | 1.10 |
| `Core/Views/Settings/ViewMenu.tsx` | `Core/Interface/Toolbar/ViewMenu.tsx` | Beside `SettingsMenu`, `OutlineMenu` (1.12) |
| `toolbar-menu.css.ts:32-38` | new `Core/Views/Settings/view-frame.css.ts` | Only `ViewFrame` reads them (1.12) |
| `Core/Actions/viewRowMenu.ts` | into `Actions/viewMenus.ts`; deleted | 1.13 |
| `ViewTile.tsx:66-75, 152-160, 315-412` | new `Core/Tiles/viewTileEntry.ts` | Payload algebra out of the surface (8.5) |
| `view-tile.css.ts:140-146` embed zoom | `Table/table-view.css`, `Cards/cards-view.css` | Renderer knowledge (8.4) |
| `UIX/Pickers/PickerMenu.tsx`, `panePlacement.ts`, `usePaneResize.tsx`, shell half of `picker-base.css.ts` | `UIX/Menus/` under one new name | I-069 (9.1) |
| `treePane`, `optionRing` (`picker-base.css.ts`) | `filter-frame.css.ts`, `calendar-picker.css.ts` | One consumer each (9.1) |
| Properties-only exports of `UIX/Menus/frames.css.ts` | a Properties stylesheet | Header "KNOBS — the ViewFrame tunables" is wrong (*5 §Placement*) |
| `Core/Views/Host/` | `Core/Views/Seat/` (optional) | "Host" means the disk process elsewhere (§Calls 16) |
| `Table/bandCommits.test.tsx:194-843` | `Bands/bandDrops.test.tsx` | Tests band routing (§10) |
| `Core/Views/manualOrderDrops.test.tsx` | `Host/rowDrops.test.tsx` | Tests the host's routing (§10) |

---

### Calls for Nathan

Each is phrased as what was found, what it implies, and a recommendation.

1. **How Page Renaming Unifies.** Found: the Table runs its own rename; Cards and Set bands share an app-wide one, and both open a new page's name field at the same moment. Implies: putting the Table on the shared one removes a second system; the shared one picks the first of two identical claims when the same page is on two mounted surfaces, which likely includes a parked tab or the homepage — a risk Cards and Set bands already carry. Recommend: unify now on the shared one; decide separately whether I-040 rides in the same phase (it pulls the session's rename slice into scope). Confirm the twin with a drive.
2. **I-070 as a Rider.** Found: its fix is a local +8 in the file the write-path work opens anyway; it doesn't fall out. Recommend: ride along.
3. **I-059 Now.** Found: its three lock mechanisms are the row pieces in scope, its victims include the Trash/Archive table's never-dragging list (`BundleTable.tsx:183`), its proposed fix is one flag replacing three, and a non-dragging List would inherit the drift; nothing else here fixes it. Recommend: fold in as its own late phase, since it's removal-shaped and on List's path; it widens the work into `UIX/Interactions/engine.tsx`, so keeping it deferred is reasonable if the scope should stay tight.
4. **Custom Set Order and Page Order Inside a Band.** Found: dissolving `bandOrder.ts` makes a custom Set order also order pages from nested Sets inside one Cards band or sub-grouped band, when nothing else sorts them. Recommend: accept it, since that's what a custom order reads as; otherwise the file folds unchanged.
5. **The View Editor's Root, A or B.** Found: the views dropdown's editor and the toolbar's Settings show the same panes split differently, and Cards views can't reach Visibility from the editor. Recommend A: the editor root shows the view's name and five rows, and the type grid moves into Layout — a visible change.
6. **Where Each Kind's Layout Options Live.** Recommend: beside its renderer (`Core/Views/Table/`, `Core/Views/Cards/`), whether as its own small file or inside the renderer file.
7. **Trash and Archive Date Heading.** Found: Archive centers it, Trash left-aligns it; both center the dates. Recommend: centered.
8. **The Band Chevron's Separate Tab Stop.** Found: the band head is already the keyboard row; the chevron button is a second stop. Recommend: drop the extra stop.
9. **Nesting Idiom.** Recommend: rows in a list indent by depth (Table, Bundles, sidebar, a future List); menu pickers keep their drawn rail; both share one step.
10. **Empty Option Bands.** Found: grouping by a property shows a band for an empty Select option; sub-grouping never does, undocumented. Recommend: keep the difference and document it (an empty band under every Set is clutter).
11. **Switch Wording.** Found: the same flag reads "Page Icons" in Table and "Hide Icons" in Cards. Recommend: one wording everywhere; "Hide …" lets the inversion code go.
12. **Small Visual Unifications.** Recommend each: eyes dim until hover everywhere (*5 F7*); Grouping's Order takes `arrow-down-up` (*5 F10*); every picker over a settings pane opens solid, or none (*5 F10*, likely an oversight that only Cards' do); one "More" placeholder component and glyph (*5 F10*); the filter's Checkbox operators take a plain `square-check`/`square` glyph so the list can go through the menu door (*5 F6*).
13. **PickerMenu's New Name** (I-069). Candidates: `PopoverPane`, `FloatingPane`, `MenuPane`. Recommend `PopoverPane`.
14. **Duplicating a View.** Found: in a tile it switches to the copy; in a container it doesn't. Recommend: both switch. Also whether the tile's dropdown gains reorder via the larger shared list (recommend no, for now).
15. **The Settings Header in a Tile vs the Main Pane.** Found: it renames the view in one place and the container in the other. Recommend (a): it always shows the view.
16. **`Views/Host/` → `Views/Seat/`.** Found: "host" elsewhere means the disk-owning process. Recommend: yes, if folders are moving anyway; otherwise leave.
17. **`useBandHeads`' New Name.** Recommend `useBandSource` in `Bands/`, since paint-ahead gets its own module and doesn't move in.
18. **Where Filter/Group/Sort Targets Live.** Found: Navigation's preview rules import `paneTargets.ts` too. Recommend: keep it at the Views root, renamed `pickTargets.ts`.
19. **The Item Record's Home.** Found: moving it into Properties as proposed breaks the host/window boundary. Recommend §Approaches 4b — the page-values pair moves to the host's reader, the record and every row builder share one window-side file, and the column-type record moves into Properties so the column-style move (5.7) stays legal — confirmed by the engine-graph test; not the Properties move as proposed.
20. **"Show Title" vs "Show Titles".** Found: one setting, two labels, and the tile's "Hide Title" collides with the toolbar's. Recommend: one label, e.g. "Show View Names".
21. **`hideChevrons` Reach.** Found: the setting says it collapses the sidebar's chevron gutter, yet GroupFrame honors it and no other surface does. Recommend: decide sidebar-only or every chevron; if every, it's one CSS rule.
22. **The Table Shell's Class and Sheet.** Recommend `.table-shell`, kept in `table-view.css` with Archive's import stated in its header.
23. **Already-False Documentation.** Recommend: correct the already-false lines on this work's surface in the same pass, rather than leaving them for later.
24. **FrameworkPM vs ViewTypesPM (Open Item 1).** Recommend: ViewTypesPM wins; FrameworkPM:21 is rewritten.
25. **Every Placement** in §Placements.

---

### Needs a Live Run

- **Rename Twins Across Mounted Surfaces:** open the same collection in two tabs (one parked) or beside a homepage View Tile, create a page, and show which surface's field opens; repeat for a Cards view today (2.1, §Approaches 1).
- **Cards' Rename Flash:** commit a Cards rename and show whether the old title shows until the tree push (`editSlice.ts:111`, `CardsView.tsx:757`).
- **Table Ghost Collapse-Then-Grow:** create from the Table's anchored ghost and show whether the ghost row unmounts a round-trip before the newborn appears (2.4).
- **Ghost Stand-Downs:** with the Table's render guard and Cards' effect removed, show the ghost still stands down while a value or name is open, including a sidebar rename (2.3).
- **Ghost Row Gutter Hover:** move into the ghost row's lead gutter and show whether hover drops (no `RowRail`, `TableView.tsx:377-387`) (7.5).
- **Archive Sideways Scroll:** show whether Archive's right inset fails to drop while scrolled sideways (4.4).
- **Tail-Row Drop Line:** drag over ungrouped rows and band members; show the 8px relative offset (6.6).
- **Band Chevron Tab Order:** Tab through a band head before and after 7.3.
- **Locked Tile Pill:** double-click a pill on a locked tile, rename, and show the silent drop; then flip the lock with an icon picker open and show the picker dismisses first (3.2).
- **Pill Entering Class:** after 8.2, show whether the class lingers and replays on remount.
- **Tile Edge Padding:** after 8.4, compare tile padding and zoom for Table and Cards.
- **`ViewMenu` Lag:** rename a view in its editor and show whether the toolbar glyph and name lag today (1.11).
- **Native Menus:** with Native Menus on, open the filter's Property list after 1.6 and re-point Properties Drive MP-E-3.
- **Band Order Dissolve:** a Cards view with nested Sets, a custom Set order, and no sort, before and after 6.2.
- **Editor Root (A):** Properties Drive MP-F-3 after 1.1.

---

### Totals

Production lines, each finding counted once; *1 F6*/*4 F10*, *2 F3*/*3 F1*, *2 F9*/*3 F8*, and *8 F2*/*1 F1* deduplicated.

| Theme | Low | High |
| --- | --- | --- |
| 1. Kind Registration and the Settings Panes | −158 | −244 |
| 2. The Host ↔ Renderer Contract | −96 | −141 |
| 3. The View Write and the Live View | −26 | −38 |
| 4. The Table and the Second Table | −102 | −127 |
| 5. The Views Root and Its Boundary | −69 | −80 |
| 6. The Pipeline and the Bands | −38 | −50 |
| 7. Disclosure and Row Primitives | −30 | −37 |
| 8. View Tiles | −55 | −91 |
| 9. PickerMenu | −4 | −7 |
| **Production Total** | **−578** | **−815** |
| Not Included | I-070 +8; *6 F3* +5 | |
| Tests (Apart) | −381 | −471 |
| Drives (Conditional on Class Renames) | 0 | −20 |

**Adds Inside the Totals:** `ViewEditor` and `VIEW_PANES` (1.1), `switchRow` (1.8), interactions +12 (2.3), +8 (2.4), +12 (2.10), `ghostRootProps` (2.9), `paintAhead.ts` and `liveView.ts` as files (3.1), `cells.css` +1 (4.5), `viewTileEntry.ts` (8.5), `view-frame.css.ts` (1.12), and the test builders and rename test (§10). Each replaces more than it adds or fixes behavior.

**Whether 300+ Is Reachable:** yes, with margin. The two largest single items are estimates gated on Nathan — 1.1 (−70 to −130) and 4.2 (−45 to −55); without both, the total is still ≈ −463 to −630. Themes 1, 2, and 4 at their low ends reach ≈ −356 alone. Many deltas are *inferred*; a 30% haircut on the low total still leaves ≈ −400.

---

### Becomes False

##### Made False by This Cleanup
- **`.claude/Features/ViewTypesPM.md`:** `:4` (`VIEW_RENDERERS` mapping, 1.2); *§The View Host* `:71` (`Core/Views/Host/` paths, `pendingView.ts`, "the pending record", "resolves the container's active view type", the policy's ghost and naming description — 1.3, 2.1, 2.3, 3.1); *§Creation* "the renderer opens its own naming field" (2.1); *§The Pipeline* file set (5.9, 6.2, 6.7); `:26` `filterModel.ts` (5.2); `:87` "the reorder helper" (4.3); `:95` `table-view.css` "which ArchiveView wears too" (4.4); `:104` `--row-indent` row (7.4); `:162` unbuilt kinds seat Table (1.2); *§Surfaces* LayoutFrame bullet and "flat door" (1.1), SettingsFrame bullet under 1.5(a), ViewFrame bullet if duplicate switches (8.1), Filtering under 1.6; "Grouping/Sorting/Filtering" names vs the UI's Group/Sort/Filter (*8 §Names*).
- **`.claude/Features/SymbolsPM.md:18`:** frame-glyph owners (1.1).
- **`.claude/Features/InteractionPM.md:36`:** `dropOutline` (rename to `DisclosureChevron`).
- **`.claude/Features/SurfacePM.md:28`:** duplicate behavior, if unified (8.1).
- **`.claude/Features/ConfigurationPM.md:233`:** Show Title label, if changed (§Calls 20).
- **`.claude/CLAUDE.md`:** the `UIX/Pickers` and `UIX/Menus` lines of *§Codebase Structure* (9.1).
- **`.claude/Resources/PommoraUIX.md`:** `:380` PickerMenu row (9.1); `:393` `UIX/Table/` contents and cell content types (4.4, 4.5, 7.5).
- **`.claude/IssuesPM.md`:** I-069 leaves the index (9.1); I-070 if it rides (3.3); I-040's footnote line cites (2.1, 2.2); I-026's channel count and double-door list lose `container:configure` (5.1); I-033's `filterModel`/`visibilityModel` → Settings and `placeNew` → Session lines are superseded (5.2, 5.4, 5.6); footnotes of I-006, I-013, I-028, I-057, I-059, I-060, I-065 citing moved files.
- **`Cross-Device Mutation Checklist.md:68`:** `container:configure` → `containerConfig.ts` (5.1).
- **`Core/Tiles/README.md`:** module map gains `viewTileEntry.ts` (8.5).
- **Comments:** `sort.ts:38`; `resolveView.ts:1` (stage list and "context-dashboard embed" prospect); `group.ts:265` ("Cards never indent"), `:332` ("Compose bucket-first"); `bandOrder.ts:1`; `handlers.ts:13`; `columns.ts:1`; `creationOrder.ts:1`; `useViewInteractions.tsx:1, 44`; `useViewCreation.ts:1`; `ValueSeat.tsx:57`; `ViewTile.tsx:123`; `table-view.css:1, 54`; `group-band.css:1`; `ArchiveView.tsx:25`; `BundleTable.tsx:56, 107, 110, 133`; `useColumns.ts:1`; `table.css:1, 21`; `frames.css.ts:23`; PickerMenu mentions at `GlancePane.tsx:309`, `TextPane.tsx:9, 28`, `glanceSlice.ts:7`, `picker-control.css.ts:9`, `usePaneResize.tsx:51`, `vitest.setup.ts:11`.
- **Tests:** `Host/pendingView.test.ts:7`, `Host/useActiveView.test.tsx:8`, `Pipeline/pickView.test.ts:4`, `viewWrite.test.tsx:12, 15`, `Host/useColumnStyles.test.ts:2`, `views.test.ts:8-10`, `Host/useViewHost.test.tsx:125, 127, 721, 889, 891` and its ≈ 100 host-field accessors, `Settings/VisibilityFrame.test.tsx:14`, `useColumns.test.ts:4, 121-151`, `BundleTable.test.tsx:19, 251`, `ArchiveView.test.tsx:153-154`, `TrashFrame.test.tsx:103`, `cellGestures.test.tsx:463-480`, `cardCreation.test.tsx:122, 125`, `.group-band-drop-outline` in `bandZone.test.tsx:195` and `bandCommits.test.tsx:209, 701, 747, 874, 882`, `data-drop-outline`/`dropOutlineOpen` in `BundleTable.test.tsx`, `FilterFrame.test.tsx` (×4), `OutlineMenu.test.tsx`, `connectionCommit.test.tsx` (×2), `bandOrder.test.ts`, `group.test.ts` prune arms, `bandModel.test.ts`, `GroupBand.test.tsx`, `autocomplete.test.ts`, `creationOrder.test.ts`, `reassign.test.ts`, `filterModel.test.ts`, `visibilityModel.test.ts`, `pageRow.test.ts`, `deleteViewWithUndo.test.ts`, `Views/handlers.test.ts:33-35`, `Files/writePathRace.test.ts:17, 56`, `Tiles/Surfaces/ViewTile.test.ts:3`, `PickerMenu.test.tsx`/`usePaneResize.test.tsx`/`panePlacement.test.ts` paths, `ViewFrame.test.tsx:154-162`. `bandCommits.test.tsx:847` (`.col-resizer`) stays true.
- **Drives:** Archive Drive `live-drive.mjs:591, 631-640, 1222, 1248, 1722` (Trash/Archive heading and `.table-view` selectors), `:1740` (29.75 row height, true unless tokens change); `data-drop-outline` in Archive Drive, `MATRIX.md`, Properties Drive, `AutocompletePane.tsx:142`, `sidebar.css:198-199`; Properties Drive `MATRIX.md:221-232` (MP-F-3, MP-E-3) and `live-drive.mjs:761, 1574, 2114, 2382`. File moves break no drive; only class and attribute renames do (*8 F11*).
- **Planning (Historical):** *Disclosable Bundles — Plan* glossary rows for `rowIndent`/`RowRail`/`BundleTable`/`DateHeading`; *Wrapped Table Cells — Brainstorm Brief*'s `WIDTHS in useColumns.ts:32-45` and `table.css:76-83`.
- **This Folder:** the decision log's Decision 6 and Open Item 1.

##### Already False Today
`ViewTypesPM.md:4, 16, 47, 71, 79, 83, 103` and *§The Pipeline*; `SymbolsPM.md:18`; `FrameworkPM.md:21`; `IssuesPM.md:1264` (I-040's Table cite); `viewHarness.tsx:1`; the stale `properties: schema` fields in `SortFrame.test.tsx:67`, `FilterFrame.test.tsx:56`, `useActiveView.test.tsx:31`, `ViewFrame.test.tsx:36`; the *Wrapped Table Cells* brief's `WIDTHS` cite; `frames.css.ts:23`'s header; `sort.ts:38`; `group.ts:265`.
