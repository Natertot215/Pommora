## A12 — Dead, Stale, and Obsolete: `renderer/Views`, `Tables`, `Cards`, `Frames`, `Toolbar`

Scope read: 56 + 14 + 2 + 35 + 13 files (12,709 + 1,258 + 308 + 6,975 + 1,066 lines including tests). Method: every `export` in scope was resolved to its non-test importers across all of `src` (word-grep, then alias-resolved for `.css.ts` namespace imports, then in-file recount); every non-exported top-level declaration was checked for in-file references (none dead); the two renderers were checked for which `ViewHostApi` fields they read; git history was checked for renames/deletions in scope. All paths below are relative to `Pommora/src/`.

Confidence key: **H** = verified by grep and read; **M** = verified by read, removal depends on a small refactor or an owner call.

#### 1. Zero-Importer Exports

No exported *file* is unreachable. Eighteen exported *symbols* have zero non-test importers; one is dead in production outright.

| Where | Symbol | External non-test refs | In-file refs | Verdict | Lines | Conf |
|---|---|---|---|---|---|---|
| `renderer/Views/bandDndModel.ts:48-61` | `allStructuralIds` | 0 | 0 (test only) | **Dead in production.** Both renderers build the same list as `setTree.flatMap(subtreeIds)` (`TableView.tsx:308`, `CardsView.tsx:343`). | 12 (+ its test block) | H |
| `renderer/Views/useViewHost.ts:360, :387` | `effectiveValues`, `manualOrder` on the returned `ViewHostApi` | read by neither `TableView` nor `CardsView` (per-field scan of both destructures, `TableView.tsx:110-153`, `CardsView.tsx:96-135`) | used internally | Dead API surface; both are internal intermediates. | 2 | H |
| `renderer/Views/viewMint.ts:21-22` | `pendingViewMint` | 0 | 1 (`:50`) | Two-line wrapper over `inFlight.get`; inline at its one call. | 2 | H |
| `renderer/Frames/frameDnd.tsx:154` | `usePaneDrag` | 0 | 2 (`RowShell`) | `export` keyword dead. | 0 | H |
| `renderer/Views/GroupBand.tsx:151-156` | `BandDragHandle` | 0 | 1 | `export` dead **and** the interface restates `useBandDrag`'s return type (`BandDnd.tsx:127-132`); `ReturnType<typeof useBandDrag>` replaces it. | 6 | H |
| `renderer/Views/useViewHost.ts:45-50` | `ViewHostUpward` | 0 | 1 | `ViewHost.tsx:23` already types the seam as `ViewHostApi['seam']`; the named export is unused. | 0 | H |
| `renderer/Views/useValuesEpoch.ts:7, :12, :35` | `OverrideEntry`, `fetchValues`, `retireSettled` | 0 / 0 / 0 (`retireSettled` test-only) | 1 / 2 / 2 | `export` dead ×3. | 0 | H |
| `renderer/Views/useViewCreation.ts:28, :58` | `ViewCreationConfig`, `ViewCreation` | 0 | 3 / 1 | `export` dead ×2. | 0 | H |
| `renderer/Frames/filterModel.ts:82, :189` | `ValueSlot`, `FilterTarget` | 0 | 1 / 1 | `export` dead ×2. | 0 | H |
| `renderer/Tables/cellSweep.ts:4` | `CellSweep` | 0 | 2 | `export` dead. | 0 | H |
| `renderer/Tables/columnAlign.ts:13`, `columnWidths.ts:6, :62` | `defaultAlignFor`, `ColumnWidth`, `minWidthFor` | 0 (two test-only) | 1 / 3 / 2 | `export` dead ×3. | 0 | H |
| `renderer/Views/Pipeline/group.ts:149, :367` | `dateBucketKey`, `subGroupKey` | 0 (test-only) | 1 / 2 | `export` dead ×2. | 0 | H |
| `renderer/Toolbar/toolbar-menu.css.ts:13, :28, :35` | `wrapper`, `anchor`, `button` | 0 individually; consumed only through `chrome` (`:44`) | 1 each | `export` dead ×3. | 0 | H |

Exports whose only importer is a single file (each is a one-reader indirection, covered in §3): `mergeStyleRecords`, `bandShowsAdd`, `reorderIds`, `iconForTypeSwitch`, `topRowFlat`, `useCellSweep`, `alignFor`, `reorderColumns`, `widthFor`/`clampWidth`, `ColumnHeader`, `useViewOrders`, `useViewCreation`, `useBandOrdering`, `useBandDrag`, `useOutlineDrag`, `writeContextValue`, `resolveContainerSchema`, `filterSeeds`, `orderGroups`, `hiddenListIds`/`placeInShown`/`hiddenPaneSlot`, `outlineTree`, `pane`, `anchorRight`, `chevronButton`, `tileSelected`, `ViewItemMenu`, `LayoutToggles`, `CardsOptions`, `VisibilityList`, `HiddenFrame`, `PageMenu`, `SettingsScaffold`, `PropertyFrame`, `OutlineMenu`, `SpaceMenu`, `ToolbarTrio`, `CardAddPicker`, `CardPickerHost`, `CardValue`, `CardsView`.

What breaks if wrong: nothing at runtime for `export`-keyword removals; `allStructuralIds` removal deletes one test block.

#### 2. Retired-Feature Remnants

**The four unbuilt view types (List, Gallery, Calendar, Timeline).** Less scaffolding exists than the brief suspects. There are no switch arms on `view.type` in either renderer (zero hits for `view.type`, `'cards'`, `'table'` in `TableView.tsx` and `CardsView.tsx`); the only type branch in the whole subsystem is `ViewHost.tsx:19` (`isCards = view.type === 'cards'`, everything else renders as a table), plus two binary `subGrouping={view.type !== 'cards'}` props (`LayoutFrame.tsx:181`, `SettingsFrame.tsx:277`) and the cards-only footing/options at `LayoutFrame.tsx:107-152, :156-174, :257-264`. No CSS exists for the four types.

| Where | What | Label | Lines | Conf |
|---|---|---|---|---|
| `shared/views.ts:12-13, :256` | `VIEW_TYPES` lists six types; zod `.catch('table')` | **KEEP (placeholder).** `FrameworkPM.md:21` names these as the remaining renderers; on-disk views may carry the types. | 0 | H |
| `renderer/Frames/LayoutFrame.tsx:32, :41, :209-219` | `TYPE_ORDER` (six), `IMPLEMENTED = new Set(['table','cards'])`, and the tile grid where `onClick={() => IMPLEMENTED.has(t) && setType(t)}` renders four buttons that do nothing | **KEEP (placeholder)** per `FrameworkPM.md:21` ("their picker tiles are inert"), but it is the *only* live remnant: 4 inert buttons. | 0 (owner's call) | H |
| `renderer/Frames/LayoutFrame.tsx:36-39` | `TYPE_GLYPH` entries for `list`, `gallery`, `calendar`, `timeline` | Dead map entries feeding the inert tiles; `'list-rounded'` and `'chart-gantt'` are registered in `DesignSystem/Symbols/index.tsx:163, :168` with no other consumer anywhere in `renderer`/`shared`. | 4 + 2 registrations | H |
| `renderer/Frames/viewIcon.ts` (12 lines) + `viewIcon.test.ts` (28) | `iconForTypeSwitch(current, oldType, newType, glyphOf)`: "if the icon is unset or equals the old type's glyph, use the new type's glyph." One caller (`LayoutFrame.tsx:102`); the `glyphOf` parameter exists only to avoid importing `TYPE_GLYPH` from its caller. | Inline as two lines in `setType`. | 10 net | H |

**Swift-parity leftovers.** None found in scope. The only "parity" mentions are two comments about on-disk format (`Pipeline/filter.ts:4`, `Pipeline/group.ts:269`); `Tables/columnWidths.ts:12-30` and `TableView.tsx:1116` reference "the Apple table model" as a design reference, not ported code. Git shows the predecessor layout (`renderer/src/Detail/Views/Table/GroupHeader.tsx`, `renderer/src/Components/ViewRowMenu.tsx`) was deleted, not left beside the current files.

**Column machinery in `Tables/` written generic but consumed by one renderer.** The folder name promises a shared table layer; five of its fourteen files have exactly one consumer, `TableView.tsx`:

| File | Lines | Consumers |
|---|---|---|
| `renderer/Tables/ColumnHeader.tsx` | 80 | `TableView.tsx:58` only |
| `renderer/Tables/cellSweep.ts` | 81 | `TableView.tsx:67, :960` only |
| `renderer/Tables/columnAlign.ts` | 30 | `TableView.tsx:46` only |
| `renderer/Tables/columnReorder.ts` | 24 | `TableView.tsx:48` only |
| `renderer/Tables/columnWidths.ts` | 89 | `TableView.tsx:45` only |

Genuinely shared: `tableDnd.tsx` (`TableView.tsx:68` and `Navigation/NavList.tsx:7`), `columnStyles.ts` (five surfaces: `CardsView`, `CardPickerHost`, `TableView`, `FilterFrame`, `PropertyFrame`), `Table.css` (global import `main.tsx:19`; classes used by `Settings/TrashFrame.tsx:207, :222, :299` and `Properties/Assignment/{Cell,LinkCell,PropertyEditor}.tsx`), `table-tokens.css` (global import `main.tsx:18`; every token consumed). Verdict: the five single-consumer files (304 lines) belong beside `TableView`; this is a move, not a deletion. Conf H.

**Old band implementations.** There is one presentational band, `renderer/Views/GroupBand.tsx`, and one adapter, `renderer/Views/ViewGroupBand.tsx`, mounted at `TableView.tsx:1436` and `CardsView.tsx:518`. No second band component exists in scope (the old `GroupHeader.tsx` is deleted in git). The three `band` meanings the Context doc refers to are a *naming* collision, not duplicate behavior — see §4.

**`viewMerge.ts`, `viewMint.ts`, `creationOrder.ts`:**

- `renderer/Views/viewMerge.ts` (14 lines): `mergeStyleRecords` folds column-style overrides per key. Reached from `useViewHost.ts:128, :264` only. Git shows it was moved out of `TableView/` to be shared; it never gained a second reader. One-reader file; inline into `useViewHost` (net −6). Conf H.
- `renderer/Views/viewMint.ts` (64 lines): the default-view mint and sentinel-adopting save. Reached: `wireViewAdopted` ← `renderer/store.ts:47`; `ensureContainerView` ← `renderer/Store/navigationSlice.ts:611, :618`; `saveViewAdopting` ← `renderer/Frames/SettingsFrame.tsx:123`, `renderer/Tiles/ViewTileScope.tsx:47`. Live. Only `pendingViewMint` (§1) is dead. Note for the restructure: `viewMint.ts:39` calls `saveViewAdopting` "the ONE view writer every surface calls", yet `Toolbar/ViewFrame.tsx:85, :95` and `Frames/ViewItemMenu.tsx:27, :34` write `window.nexus.views.save`/`.reorder` directly (deliberately non-adopting). Two writers to the views channel. Conf H.
- `renderer/Views/creationOrder.ts` (64 lines): order-array helpers. Reached from `CardsView.tsx:46`, `useViewCreation.ts:20`, `useViewHost.ts:43`, and `renderer/Store/renameSlice.ts:4, :169`. Multi-reader, live. Keep. Conf H.

#### 3. One-Reader Indirection

**Hook caller counts (non-test):**

| Hook | Callers | Where |
|---|---|---|
| `useViewHost` | 1 | `ViewHost.tsx:29` |
| `useViewCreation` | 1 | `useViewHost.ts:330` |
| `useViewOrders` | 1 | `useViewHost.ts:83` |
| `useBandOrdering` | 1 | `useViewHost.ts:92` (its module's `bandReorderPatch` has two more readers, `TableView.tsx:37`, `CardsView.tsx:63`) |
| `useContainerValues` (the export of `useValuesEpoch.ts`) | 2 | `useViewHost.ts:79`, `GroupFrame.tsx:780` |
| `useActiveView` | 5 | `ViewHost.tsx:18`, `useViewHost.ts:82`, `HiddenFrame.tsx:174`, `Toolbar/ViewMenu.tsx:32`, `PropertyFrame.tsx:192` |
| `useCellSweep` | 1 | `TableView.tsx:960` |
| `useBandDrag` | 1 | `ViewGroupBand.tsx:53` |
| `useOutlineDrag` | 1 | `OutlineMenu.tsx:94` |
| `usePaneDrag` | 1 | `frameDnd.tsx:145` (same file) |
| `useFrameRegions` | 3 | `ViewFrame.tsx:46`, `PropertyFrame.tsx:94`, `HiddenFrame.tsx:47` |
| `useGroupingListDrag` | 2 | `GroupFrame.tsx:449, :684` |
| `useStyleFor` | 5 | see §2 |

Inline candidates among these: `useViewOrders` (33 lines; a `useState` + one `useEffect` around two IPC calls; net −10, M), the `useBandOrdering` hook body (the module stays for `bandReorderPatch`/`groupingKeyOf`; net −10, M). `useViewCreation`'s `getCfg` thunk (`useViewCreation.ts:68-75`) exists so the hook can run before an early return, but its only caller (`useViewHost.ts:330-351`) defines every config field before the call and returns null only at `:353`; the thunk and the 20-field re-listing are ceremony (net −8, M).

**Wrapper components with one mount:**

| Where | Lines | One mount | Verdict | Conf |
|---|---|---|---|---|
| `renderer/Frames/HiddenFrame.tsx:165-184` `HiddenFrame` | 20 | `SettingsFrame.tsx:258` | Wraps `VisibilityList` + `useActiveView`; `SettingsFrame` already holds `view` (`:97`). Mount `VisibilityList` directly. −18 net. | H |
| `renderer/Frames/CardsOptions.tsx` (26) + `renderer/Frames/LayoutToggles.tsx` (34) | 60 | `LayoutFrame.tsx:161, :262` and `:172, :258` | Near-identical: a `SWITCHES` table, `useSaveView`, `<MenuIndex sections={[{rows: switchRows(...)}]}/>`; `LayoutToggles` adds one `<MenuSeparator flush/>`. One `ViewSwitches({entries})` or two constants inside `LayoutFrame`. −30 net. | H |
| `renderer/Toolbar/ToolbarTrio.tsx` | 23 | `Toolbar.tsx:110` | Two-layer glass wrapper; inline −8 net. Owner's call — it carries a real explanation. | M |
| `renderer/Toolbar/ViewFrame.tsx:45-56` `DragRegion` | 12 | `ViewFrame.tsx:156` | Registers one element as both `assigned` and `all` regions (see §5). | H |
| `renderer/Frames/ViewItemMenu.tsx` | 79 | `LayoutFrame.tsx:228` | Duplicates `ViewFrame`'s row menu (§4). | H |

Not wrappers despite one mount (substantive, keep): `SettingsMenu` (the scope switch), `SettingsScaffold`, `CardPickerHost`, `CardAddPicker`, `CardValue`, `OutlineMenu`, `SpaceMenu`. `NavMenu.tsx` (19 lines, a 300px blank `MenuSurface`) is an explicit design placeholder — **KEEP**.

**`.css.ts` files with one class used once:**

| File | Lines | Content | Verdict | Conf |
|---|---|---|---|---|
| `renderer/Views/CardView/card-add-picker.css.ts` | 3 | `topRowFlat = style({ vars: { '--row-pad-y': '0px' } })`, used at `CardAddPicker.tsx:7` only; the same var-zeroing already exists as `chipList` in `frames.css.ts:104` | Fold. −2 net | H |
| `renderer/Views/view-host.css.ts` | 7 | one `globalStyle('.view-empty')`, used at `ViewHost.tsx:33-34`; imported for side effect (`ViewHost.tsx:10`) | Fold into a `style()` in `ViewHost`. −4 net | H |
| `renderer/Toolbar/outline-menu.css.ts` | 11 | `pane` used once (`OutlineMenu.tsx:39`) + a pass-through `export { rowDragging } from menu-base.css` (`:11`) that `OutlineMenu.tsx:131` could import directly | Fold. −8 net | H |
| `renderer/Frames/frames.css.ts:82` | 1 | second pass-through re-export of `rowDragging`, read only as `s.rowDragging` at `frameDnd.tsx:148` | Import from `menu-base.css` directly. −1 | H |

**Tiny model files with one reader:**

| File | Lines | Reader | Verdict | Conf |
|---|---|---|---|---|
| `renderer/Views/CardView/cardsBand.ts` (+10-line test) | 7 | `ViewGroupBand.tsx:5, :74` — the *shared* band adapter, not Cards | Misfiled and a one-line predicate (`kind === 'structural-set'`). Inline. −6 net | H |
| `renderer/Views/CardView/cardsOrder.ts` (+13-line test) | 12 | `CardsView.tsx:71` | Wraps `DesignSystem/Util/moveItem` with an index guard. Inline. −8 net | H |
| `renderer/Views/viewMerge.ts` (+20-line test) | 14 | `useViewHost.ts:41` | Inline. −6 net | H |
| `renderer/Frames/viewIcon.ts` (+28-line test) | 12 | `LayoutFrame.tsx:102` | Inline (see §2). −10 net | H |
| `renderer/Views/contextCellWrite.ts` | 35 | `useViewHost.ts:40, :321` | Its header says "both container views share" it; only `useViewHost.commitValue` calls it now. Inline. −15 net | M |
| `renderer/Tables/columnReorder.ts` (+36-line test) | 24 | `TableView.tsx:48` | Move beside `TableView` (§2). | H |

#### 4. Duplicate Definitions

**Drag models.** Five insertion-line providers exist; four are the same component with different hit-tests.

| Provider | Skeleton lines (context, `els` map, `registerRow`, `useMemo` value, `<Ctx.Provider><div className="drop-line-host">{children}{drag.line}</div>{drag.ghost}`, and a `useXDrag(id)` that throws `must be used inside <X>` and returns `{ref, handle, isDragging}`) |
|---|---|
| `renderer/Frames/frameDnd.tsx` | `:36, :53, :113-116, :122-140, :154-166` |
| `renderer/Views/BandDnd.tsx` | `:31, :48, :99-102, :104-122, :127-141` |
| `renderer/Tables/tableDnd.tsx` | `:34, :62, :134-137, :139-151, :156-168` |
| `renderer/Toolbar/OutlineDnd.tsx` | `:29, :48, :98-101, :103-120, :125-137` |
| `renderer/Frames/groupDnd.tsx` | prop-registered variant of the same (`:41-42, :92-105`) |

What differs per surface is exactly the `take`/`resolve`/`commit`/`lineFor` spec that `Interactions/insertionDrag.tsx:18-37` already parameterizes. A generic provider + row hook removes roughly 4 × 40 lines. −160, M (behavior-preserving refactor, not a deletion). What breaks if wrong: each provider's `Value` shape differs slightly (`allHighlighted`, `nestTargetId`, `section`); the factory needs a per-surface `extra` slot.

- `MeasuredRow` is declared four times: `renderer/Sidebar/sidebarDndModel.ts:128` (canonical; imported by `frameDnd`, `BandDnd`, `frameDndModel`, `bandDndModel`, `hiddenFrameModel`), `renderer/Tables/tableDnd.tsx:18-26`, `renderer/Toolbar/OutlineDnd.tsx:20`, `renderer/Tables/cellSweep.ts:6`. −9, M.
- The view layer depends on `Sidebar/sidebarDndModel` for `MeasuredRow` and `nextOrder` (`bandDndModel.ts:8`, `frameDndModel.ts:6`, `hiddenFrameModel.ts:3`, `TableView.tsx:38`, `CardsView.tsx:64`). `ContextPM.md:64` already plans `Sidebar/sidebarDndModel → Interactions/reorderModel`; this audit corroborates it.
- `renderer/Toolbar/ViewFrame.tsx:32-43` `viewSlot` re-implements `frameDndModel.regionScan` (`:43-57`) — the same filter-dragged, midpoint `while`, next-top/last-bottom line. −10, H.
- `renderer/Views/GroupBand.tsx:151-156` `BandDragHandle` ≡ `useBandDrag`'s return type (§1). −6, H.
- Not a duplicate: `Sidebar/sidebarDndModel` vs `Interactions/` — `Interactions/drag.tsx` is the displacing sortable engine (`SortableZone`/`DragGroup`, used by `CardsView.tsx:29-35` and `Cards/Card.tsx:6`), `insertionDrag.tsx` is the line-drop engine. Two gestures, two engines.

**Column styles.** `shared/columnStyles.ts` (zod schema, `defaultStyleFor`: type → default look) and `renderer/Tables/columnStyles.ts` (`styleFor`: saved ∪ default; `useStyleFor`: bound to the nexus date format) are layers, not copies. The smell is the shared name plus the location: four of `Tables/columnStyles.ts`'s five readers are not the table (`CardsView.tsx:58`, `CardPickerHost.tsx:83`, `FilterFrame.tsx:379`, `PropertyFrame.tsx:190`). Rename/move, no removal. H.

**Band.** Three unrelated things: `renderer/Views/bandDndModel.ts:10 interface Band` (a group header), `renderer/Tiles/Core/model.ts:25 interface Band` (a mosaic row), `renderer/Interface/action-band.css` (a toolbar strip). Two same-named exported interfaces in one renderer. Rename one; no lines removed. H.

**Switch rows.** Not a second switch. `renderer/Frames/switchRows.tsx:18-36` emits `MenuRow`s whose `trailing: { kind: 'switch' }` is `DesignSystem/Menus/menu-index.tsx:15`'s own trailing kind; `DesignSystem/Controls/Switches` is what `menu-index` renders for it. `switchRows` is a SavedView-boolean adapter with two callers (the two wrappers in §3). H.

**View icon lookups.** `LayoutFrame.tsx:33-40 TYPE_GLYPH` is the only type→glyph map and `viewIcon.ts` the only switch helper — but the *default view glyph* `'table'` is restated at seven sites with no `viewGlyph(view)` helper: `shared/views.ts:323` (`mintNewView` always writes `icon: 'table'`), `LayoutFrame.tsx:34`, and five `iconNameOr(v.icon, 'table')` calls at `Toolbar/ViewMenu.tsx:47`, `Toolbar/ViewFrame.tsx:162`, `Frames/SettingsFrame.tsx:159`, `Tiles/Surfaces/ViewTile.tsx:104`, `Tiles/TileHost.tsx:76`. Because the mint always stamps an icon, the fallback only fires for hand-edited JSON. One helper; −5 literals, M.

**Page menus.** Three layers, not three copies: `shared/pageMenu.ts` (item list + action union, read by `main/*` and the renderer), `renderer/Actions/pageMenuActions.ts` (renderer runner for `move:`/copylink/copypath/history; used by `TableView.tsx:30`, `CardsView.tsx:79`, `Navigation/NavList.tsx:10`, `Tabs/TabBar.tsx:15`, `Sidebar/Sidebar.tsx:41`), `renderer/Frames/PageMenu.tsx` (the Settings-menu Page pane). The real overlap: `PageMenu.tsx:21` hardcodes `FOOTER_ACTIONS` and `:36-44` re-implements `title:copylink` (`writeClipboard(pageLinkText(...))`) that `pageMenuActions.ts:31-34` already runs. Route through `runPageSendAction` first. −4, H.

**View deletion.** `renderer/Frames/ViewItemMenu.tsx:37-43 deleteView` and `renderer/Toolbar/ViewFrame.tsx:121-126 deleteRow` are the same six lines (`askDeleteView` → `views.delete` → `notifyError` | `notifyDeleted` + `restoreView`) with two different gates: `ViewFrame.tsx:107 deletable: views.length > 1` vs `ViewItemMenu.tsx:23 views.length > 1 && view.id !== DEFAULT_VIEW_ID`. Two definitions of "can this view be deleted". −7 and one rule, H.

**Identical style definitions.** `renderer/Frames/filter-frame.css.ts:61 valueField = style([cellField, { flex: '1 1 auto' }])` and `:119 controlFieldWide = style([cellField, { flex: '1 1 auto' }])` are byte-identical. −2, H.

**Seam identity defaults.** `ViewHost.tsx:24-25` seeds `foldOverrides` and `bandBucket` with identities; `CardsView.tsx:215-216` writes the same identities every render. −2, H.

#### 5. Defensive Code for Unreachable States

| Where | What | Why unreachable | Lines | Conf | If wrong |
|---|---|---|---|---|---|
| `renderer/Frames/LayoutFrame.tsx:202-204` + `:72-76` | `: frame ? <MenuTopRow current={LEAF_CURRENT[frame]} .../> : null` after `'layout'`, `'group'`, `'sort'`, `'filter'` arms; `LEAF_CURRENT` exists only for it | `type Frame` (`:65`) is exactly those four values | 8 | H | Nothing; closed union |
| `renderer/Frames/SettingsFrame.tsx:292-293` | final `: (blankLeaf)` arm | all seven `FrameId` values are handled at `:243-291` (`blankLeaf` itself stays live via `schemaUnavailable`, `:130`) | 2 | H | Nothing; closed union |
| `renderer/Toolbar/ViewFrame.tsx:32-56` | `viewSlot` ignores regions; `DragRegion` registers one element as both `assigned` and `all` | `frameDnd.tsx:64-68` returns no snapshot unless both region elements exist, so a single-list consumer must fake the second region. 24 lines to satisfy a two-region contract for a one-region list | 24 | M | Needs a single-region mode on `FrameDnd`, or `ViewFrame` using `useInsertionDrag` directly |
| `renderer/Frames/hiddenFrameModel.ts:47-60` `placeInShown(view, fullVisibleIds, sectionIds, …)` | translates a section index into a full-order index via `nexusReorderIndex` | its only caller (`HiddenFrame.tsx:137`) passes `shownIds, shownIds`, so `full === visible` and the translation is the identity | 3 | M | A future windowed section list would need the two-list form back |
| `renderer/Tables/tableDnd.tsx:41, :44` | `canRelocate = false`, `relocate = () => {}` optional, while `reassign` is required | the other consumer (`Navigation/NavList.tsx:235-237`) passes `canReassign={false} reassign={() => {}}` anyway | 2 | L | Cosmetic |
| `renderer/Toolbar/ViewFrame.tsx:143-150`, `renderer/Frames/PageMenu.tsx:83-87`, `renderer/Frames/HiddenFrame.tsx:58-65` | a `disabled` "More" with `onClick={() => {}}`, a `disabled` "Lock", a `disabled` eye on the Title row | inert affordances rendered as controls; the first two read as reserved slots | 0 (owner's call) | H | These are placeholders that display, which the project's own placeholder rule excludes; flagging, not removing |

Checked and reachable (not findings): `ViewHost.tsx:33` `Loading…` (fires while `tree` is null on boot, since `useViewHost.ts:353` returns null only then); the two reset effects at `useViewHost.ts:100-113` fire on distinct triggers.

#### 6. Obscure or Unnecessary

- **`useViewHost.ts:66-70` takes `flattenStructural: boolean`** — it is `isCards` from `ViewHost.tsx:19, :29`, renamed to the mechanism. The only view-type knowledge that reaches the hook arrives as a boolean about grouping. Fine, but it took three reads to connect the two.
- **`useActiveView` runs twice per host render** — `ViewHost.tsx:18` calls it with `NO_SCHEMA` to learn `type`/`view_scale`, then `useViewHost.ts:82` calls it with the real schema. The trick is valid (`pickView.ts:31` uses the schema only for `mintDefaultView`, whose type is always `'table'`), but it doubles the store subscription for `activeViews[source.id]`. Return `view` from the hook and branch after. −4, M.
- **`frames.css.ts` is mostly not for Frames.** Of its 28 exports, eleven (`optionEditor`, `statusGroups`, `statusGroup`, `groupAdd`, `optionList`, `optionLead`, `ghostOptionRow`, `ghostChip`, `optionAnchor`, `optionEditButton`, `configEditor`; `:106-170`, ~65 lines) are read only by `renderer/Properties/{OptionRow,GhostOptionChip}.tsx` and `renderer/Properties/Editors/{OptionEditor,StatusEditor,FileEditor,URLEditor,CheckboxEditor}.tsx`. It is the property-editor sheet living under `Frames/`. Move, H.
- **`GroupFrame.tsx:360-450` doubles as a component library.** `optionsOf`, `PropertyPreview`, `CustomList` are imported by `SortFrame.tsx:10` and `FilterFrame.tsx:39`; a frame file exporting the option-list widgets its siblings render. Extract (~100 lines), no removal, H.
- **Misfiled generics.** `renderer/Views/TableView/reassign.ts` is imported by `CardsView.tsx:59`, `useViewHost.ts:42`, `useViewCreation.ts:21`; `renderer/Views/CardView/cardsBand.ts` only by the shared `ViewGroupBand.tsx:5`; `renderer/Tables/columnStyles.ts` by four non-table surfaces. Each folder name misdescribes its reader set. Moves, H.
- **`useValuesEpoch.ts`** is named for its private hook (`:64`, not exported) while its export is `useContainerValues` (`:107`). Two reads to find the entry point.
- **`Frames/switchRows.tsx` + `CardsOptions.tsx` + `LayoutToggles.tsx`** — 96 lines across three files to render seven toggles from two static tables (§3).
- **`toolbar-menu.css.ts:13-44`** exports `wrapper`/`anchor`/`button` and then a `chrome` object of the same three; only `chrome` is consumed. Three `export`s to drop (§1).
- **`shared/views.ts:91, :232` `group.empty_placement`** is decoded and written (`GroupFrame.tsx:152` mirrors `view.ungrouped_placement` into it) but never read anywhere in `renderer`, `shared`, or `main` (`group.ts:269` says so). Adjacent to scope: a dead on-disk field the Frames still write. −3 (plus the decoder line), M — owner's call since it touches the file format.

#### Totals

**High confidence removable: ~150 lines** — `allStructuralIds` 12; unread `ViewHostApi` fields 2; unreachable arms 10; `viewSlot` 10; `BandDragHandle` 6; duplicate `valueField`/`controlFieldWide` 2; duplicate view-delete 7; `PageMenu` copylink 4; identity seam writes 2; `pendingViewMint` 2; two `rowDragging` shims 2; folds of `cardsBand` 6, `cardsOrder` 8, `card-add-picker.css.ts` 2, `view-host.css.ts` 4, `outline-menu.css.ts` 8, `viewIcon` 10, `viewMerge` 6; `HiddenFrame` wrapper 18; `CardsOptions`+`LayoutToggles` fold 30. Plus 21 dead `export` keywords (no line count) and the four inert-type `TYPE_GLYPH` entries + two icon registrations (6 lines) if the owner retires the placeholder tiles.

**Medium confidence removable: ~250 lines** — one generic insertion-drag provider replacing four skeletons 160; `MeasuredRow` re-declarations 9; `getCfg` thunk 8; `placeInShown` two-list form 3; `useViewOrders` inline 10; `useBandOrdering` hook inline 10; `contextCellWrite` inline 15; `ViewFrame` two-region ceremony 24; double `useActiveView` 4; `ToolbarTrio` 8.

**Moves, not deletions (~570 lines):** five single-consumer `Tables/` files (304) beside `TableView`; `frames.css.ts` option-editor block (~65) to `Properties/`; `GroupFrame`'s shared option widgets (~100) to their own module; `reassign.ts`, `cardsBand.ts`, `columnStyles.ts` relocations; one of the two `Band` interfaces renamed.

**Genuine placeholders to keep:** `VIEW_TYPES`' four unbuilt entries, the inert picker tiles (`LayoutFrame.tsx:41, :215`), `NavMenu.tsx`.

#### Summary

No file in the five folders is unreachable, and the four unbuilt view types left almost no scaffolding: one `IMPLEMENTED` gate, four glyph-map entries, two orphaned icon registrations, and the inert tiles the owner already describes as intentional. Neither renderer branches on `view.type`; the sole type switch is `ViewHost.tsx:19`. One export is dead in production (`allStructuralIds`), two `ViewHostApi` fields are read by neither renderer, eighteen `export` keywords are unused, and two `if`-chain fallthrough arms are unreachable over closed unions. The heaviest duplication is structural: four insertion-drag providers share an identical ~40-line context skeleton, `MeasuredRow` is declared four times, `ViewFrame` re-implements `regionScan` and fakes a second drag region to satisfy `FrameDnd`, view deletion exists twice with two different gates, and the default view glyph `'table'` is a literal at seven sites. Roughly 150 lines are removable at high confidence, ~250 more with small refactors, and ~570 lines are misfiled (`Tables/` is mostly `TableView`-only; `frames.css.ts` is mostly `Properties/`' sheet). `viewMint`, `creationOrder`, and `viewMerge` are all live; only `viewMerge` has a single reader.
