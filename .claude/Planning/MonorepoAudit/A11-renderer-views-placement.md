### A11: Placement Audit of `renderer/Views`, `Tables`, `Cards`, `Frames`, `Toolbar`

Scope measured: 74 non-test source files, 14,128 lines (CSS included, tests excluded): Views 7,149 · Frames 4,798 · Toolbar 1,040 · Tables 833 · Cards 308. Every claim below is from reading the code and its importers; comments and CLAUDE rules were not treated as evidence. Paths are relative to `Pommora/src/renderer/` unless prefixed.

**Reading the tables:** *Class* is what the file is (pure · react · hook · style · model+hook). *IPC* lists `window.nexus` call sites (file:line) or `–`. *Importers* counts production files that import it, with their folders. *Home* is the slot in the proposed layout (Section 6).

---

### 1. File Table

#### Views/ (root)

| File | Lines | Class | IPC | Importers | Concern | Home |
|---|---|---|---|---|---|---|
| `ViewHost.tsx` | 40 | react | – | 2: Interface/ContainerView, Tiles/Surfaces/ViewTile | host seat (type switch, scale, loading/empty) | `UIX/Views/Host` |
| `useViewHost.ts` | 406 | hook | – (via store + `useSaveView`) | 3: ViewHost, TableView, CardsView (type) | host: values, layers, pipeline call, writers, creation | `UIX/Views/Host` |
| `useActiveView.ts` | 18 | hook | – | 5: ViewMenu, PropertyFrame, HiddenFrame, ViewHost, useViewHost | active-view read | `UIX/Views/Host` |
| `useValuesEpoch.ts` | 124 | hook + pure helpers | `:16 loadValues` | 5: GroupFrame, contextCellWrite, useViewHost, useViewCreation, TableView | container values + optimistic override layer | `UIX/Views/Host` |
| `useViewOrders.ts` | 33 | hook | `:19 viewOrders.get`, `:30 viewOrders.set` | 1: useViewHost | per-machine manual order | `UIX/Views/Host` |
| `useViewCreation.ts` | 221 | hook | – (store `mutate`; DOM scroll glide) | 1: useViewHost | creation engine | `UIX/Views/Host` |
| `contextCellWrite.ts` | 35 | logic (React setState type) | – | 1: useViewHost | optimistic context write | `UIX/Views/Host` |
| `viewMint.ts` | 64 | host-bound module | `:30,:53 views.save`, `:59 activeViews.set` | 4: store.ts, Store/navigationSlice, Frames/SettingsFrame, Tiles/ViewTileScope | the one view writer + default mint | `UIX/Views/Host` |
| `viewMerge.ts` | 14 | pure | – | 1: useViewHost | column-style fold | `Core/Views` |
| `creationOrder.ts` | 64 | pure | – | 4: useViewCreation, useViewHost, CardsView, Store/renameSlice | creation ordering | `Core/Views` |
| `bandDndModel.ts` | 186 | pure (imports `nextOrder` from Sidebar/sidebarDndModel) | – | 6: GroupFrame, groupDnd, CardsView, useBandOrdering, BandDnd, TableView | band hit-test + order math | `UIX/Views/Bands` (order math Core-eligible) |
| `BandDnd.tsx` | 141 | react (context + insertionDrag) | – | 3: ViewGroupBand, CardsView, TableView | band drag | `UIX/Views/Bands` |
| `useBandOrdering.ts` | 87 | hook + pure (`groupingKeyOf`, `bandReorderPatch`) | – | 3: useViewHost, CardsView, TableView | band-order patch layer | `UIX/Views/Bands` |
| `GroupBand.tsx` | 280 | react (presentational + `resolveBandHead`) | – | 2: ViewGroupBand, useViewHost | band chrome | `UIX/Views/Bands` |
| `ViewGroupBand.tsx` | 87 | react adapter | `:61 contextMenu` | 2: CardsView, TableView | band adapter + native Set menu | `UIX/Views/Bands` |
| `group-band.css` | 67 | style | – | side-effect: GroupBand | band chrome | `UIX/Views/Bands` |
| `view-host.css.ts` | 7 | style | – | side-effect: ViewHost | `.view-empty` | `UIX/Views/Host` |

#### Views/Pipeline/

| File | Lines | Class | IPC | Importers | Concern | Home |
|---|---|---|---|---|---|---|
| `resolveView.ts` | 83 | pure | – | 1: useViewHost | pipeline orchestrator | `Core/Views/pipeline` |
| `columns.ts` | 51 | pure | – | 2: HiddenFrame, resolveView | columns stage | `Core/Views/pipeline` |
| `filter.ts` | 434 | pure | – | 3: Frames/filterModel, creationSeeds, resolveView | filter stage + `FILTER_OPS` | `Core/Views/pipeline` |
| `group.ts` | 521 | pure | – | 8: GroupFrame, SortFrame, useViewHost, TableView, CardsView, useViewCreation, filter, resolveView | group stage + set-tree helpers | `Core/Views/pipeline` |
| `sort.ts` | 207 | pure | – | 2: useViewHost, resolveView | sort stage | `Core/Views/pipeline` |
| `bandOrder.ts` | 27 | pure | – | 1: resolveView | manual band order | `Core/Views/pipeline` |
| `pickView.ts` | 32 | pure | – | 4: SettingsFrame, Tiles/ViewTile, useActiveView, useViewHost | container schema + active view pick (not a stage) | `Core/Views` |
| `creationSeeds.ts` | 47 | pure | – | 1: useViewCreation | creation (filter-implied seeds) | `Core/Views` |

#### Views/TableView/ and Views/CardView/

| File | Lines | Class | IPC | Importers | Concern | Home |
|---|---|---|---|---|---|---|
| `TableView/TableView.tsx` | 1,788 | react renderer | `:501 columnMenu`, `:855 cellMenu` | 1: ViewHost | table renderer | `UIX/Views/Table` |
| `TableView/table-view.css` | 90 | style | – | side-effect: TableView | table renderer | `UIX/Views/Table` |
| `TableView/reassign.ts` | 37 | pure | – | 4: useViewCreation, TableView, useViewHost, CardsView | group-key ↔ value (both renderers) | `Core/Views` (misfiled under TableView) |
| `CardView/CardsView.tsx` | 1,176 | react renderer | `:1061 cardMenu` | 1: ViewHost | cards renderer | `UIX/Views/Cards` |
| `CardView/CardValue.tsx` | 220 | react | `:147 cellMenu` | 1: CardsView | cards cell | `UIX/Views/Cards` |
| `CardView/CardPickerHost.tsx` | 258 | react | – | 1: CardsView | cards pickers seat | `UIX/Views/Cards` |
| `CardView/CardAddPicker.tsx` | 160 | react | – | 1: CardPickerHost | cards add-property picker | `UIX/Views/Cards` |
| `CardView/cardsOrder.ts` | 12 | pure | – | 1: CardsView | cards reorder | `UIX/Views/Cards` |
| `CardView/cardsBand.ts` | 7 | pure | – | 1: Views/ViewGroupBand | band "+" rule (shared, not cards) | fold into `UIX/Views/Bands` |
| `CardView/cards-view.css` | 122 | style | – | side-effect: CardsView | cards renderer | `UIX/Views/Cards` |
| `CardView/card-add-picker.css.ts` | 3 | style | – | 1: CardAddPicker | cards | `UIX/Views/Cards` |

#### Tables/

| File | Lines | Class | IPC | Importers | Concern | Home |
|---|---|---|---|---|---|---|
| `ColumnHeader.tsx` | 80 | react | – | 1: TableView | table header cell (reorder grab + resize strip) | `UIX/Views/Table` |
| `cellSweep.ts` | 81 | hook (queries `.data-row`, `data-rid`) | – | 1: TableView | table column sweep | `UIX/Views/Table` |
| `columnWidths.ts` | 89 | pure (imports `ICON_PX` token) | – | 1: TableView | table px widths | `UIX/Views/Table` |
| `columnReorder.ts` | 24 | pure (over Interactions `reorder`) | – | 1: TableView | table column order | `UIX/Views/Table` |
| `columnAlign.ts` | 30 | pure | – | 1: TableView | column alignment from view + type | `Core/Views` |
| `columnStyles.ts` | 39 | pure `styleFor` + store hook `useStyleFor` | – | 5: PropertyFrame, FilterFrame, TableView, CardPickerHost, CardsView | view-wide column style resolve (NOT table-only) | `styleFor` → `Core/Views`; `useStyleFor` → `UIX/Views/Host` |
| `tableDnd.tsx` | 168 | react (context + insertionDrag) | – | 2: TableView, Navigation/NavList | generic row insertion drag | `UIX/PommoraUIX/Interactions` |
| `Table.css` | 278 | style (global `.table .data-row .col-header …`) | – | main.tsx; classes used by TableView, Settings/TrashFrame, Showcase | shared table chrome | `UIX/PommoraUIX/Table` |
| `table-tokens.css` | 44 | style tokens | – | main.tsx | shared table chrome | `UIX/PommoraUIX/Table` |

#### Cards/

| File | Lines | Class | IPC | Importers | Concern | Home |
|---|---|---|---|---|---|---|
| `Card.tsx` | 127 | react primitives (Root/Body/Thumb/Placeholder/Text/Title/DropSlot/Trail) | – | 2: CardsView, Navigation/NavGallery | shared card primitive | `UIX/PommoraUIX/Elements/Card` |
| `cards.css` | 181 | style (global `.card*`) | – | Card.tsx and main.tsx (double import) | shared card primitive | `UIX/PommoraUIX/Elements/Card` |

#### Frames/

| File | Lines | Class | IPC | Importers | Concern | Home |
|---|---|---|---|---|---|---|
| `SettingsFrame.tsx` | 317 | react | `:114 container.configure` | 2: SettingsMenu, Tiles/ViewTile | container/view settings root (7 leaves + Scale) | `UIX/Views/Settings` |
| `LayoutFrame.tsx` | 277 | react (`document.querySelectorAll` scrub) | – | 2: SettingsFrame, Toolbar/ViewFrame | per-view editor (name, type, options) | `UIX/Views/Settings` |
| `layout-frame.css.ts` | 38 | style | – | 1: LayoutFrame | settings | `UIX/Views/Settings` |
| `LayoutToggles.tsx` | 34 | react | – | 1: LayoutFrame | table toggles | `UIX/Views/Settings` |
| `CardsOptions.tsx` | 26 | react | – | 1: LayoutFrame | cards toggles | `UIX/Views/Settings` |
| `switchRows.tsx` | 36 | react helper | – | 2: LayoutToggles, CardsOptions | settings | `UIX/Views/Settings` |
| `viewIcon.ts` | 12 | pure | – | 1: LayoutFrame | type-switch icon | `UIX/Views/Settings` |
| `FilterFrame.tsx` | 763 | react | – | 2: LayoutFrame, SettingsFrame | filter pane | `UIX/Views/Settings` |
| `filter-frame.css.ts` | 119 | style | – | 1: FilterFrame | filter pane | `UIX/Views/Settings` |
| `filterModel.ts` | 220 | pure over FilterGroup, but carries icon names (`type Icon`, `Properties/PropertyTypes` targets) | – | 1: FilterFrame | filter encode/decode + operator/target choices | encode/decode → `Core/Views`; choice tables → `UIX/Views/Settings` |
| `GroupFrame.tsx` | 834 | react; also exports `optionsOf`, `PropertyPreview`, `CustomList` | – | 4: LayoutFrame, SettingsFrame, FilterFrame, SortFrame | group pane + shared pane widgets | `UIX/Views/Settings` (widgets extracted) |
| `group-frame.css.ts` | 39 | style | – | 2: GroupFrame, SortFrame | group/sort panes | `UIX/Views/Settings` |
| `groupDnd.tsx` | 106 | hook (insertionDrag + bandDndModel) | – | 1: GroupFrame | group-list drag | `UIX/Views/Settings` |
| `SortFrame.tsx` | 277 | react | – | 2: LayoutFrame, SettingsFrame | sort pane | `UIX/Views/Settings` |
| `HiddenFrame.tsx` | 184 | react (`VisibilityList`, `HiddenFrame`) | `:132 showError` | 2: LayoutFrame, SettingsFrame | visibility pane | `UIX/Views/Settings` |
| `hiddenFrameModel.ts` | 113 | pure | – | 3: HiddenFrame, Properties/Assignment/cardValueInput, useViewHost | column visibility writes (`hiddenListIds`, `placeInShown`, `hideShown`, `unhide`) + DnD slot rule | writes → `Core/Views/columnVisibility`; `hiddenPaneSlot` stays with HiddenFrame |
| `ViewItemMenu.tsx` | 79 | react | `:26 views.save`, `:34 views.reorder`, `:39 views.delete` | 1: LayoutFrame | view duplicate/delete | `UIX/Views/Settings` |
| `frameDnd.tsx` | 180 | react (context + insertionDrag, two regions) | – | 3: PropertyFrame, HiddenFrame, Toolbar/ViewFrame | generic two-region list drag | `UIX/PommoraUIX/Interactions` |
| `frameDndModel.ts` | 87 | pure | – | 5: frameDnd, hiddenFrameModel, HiddenFrame, PropertyFrame, ViewFrame | two-region slot math | `UIX/PommoraUIX/Interactions` |
| `InlineEditHeader.tsx` | 69 | react | – | 5: PropertyFrame, LayoutFrame, SettingsFrame, PageMenu, Toolbar/SpaceMenu | generic icon+title menu header | `UIX/PommoraUIX/Menus` |
| `frames.css.ts` | 174 | style (three unrelated bundles) | – | 17: 10 Frames + 7 Properties (OptionRow, GhostOptionChip, Editors/Checkbox·Option·URL·File·Status) | menu header · two-region list · option-editor styles | split three ways (Section 6) |
| `PropertyFrame.tsx` | 569 | react | 30 sites, `:244–:497` (`schema.add/rename/delete/assign/reorder`, `property.*`, `registry.reorder`, `propertyMenu`, `chooseAssetDir`, `showError`) | 1: SettingsFrame | schema + registry editor | `UIX/Properties/Schema` |
| `PageMenu.tsx` | 117 | react | `:37 pageActionsMenu`, `:40 writeClipboard`, `:41 revealPath` | 1: SettingsMenu | page menu | `UIX/Surfaces/Page` |
| `SettingsMenu.tsx` | 34 | react | – | 1: Toolbar/Toolbar | trio settings panel: switch on selection scope | `UIX/Shell/Toolbar` |
| `SettingsScaffold.tsx` | 94 | react | – | 1: SettingsMenu | homepage settings (nexus icon/photo, board lock) | `UIX/Surfaces/Homepage` |

#### Toolbar/

| File | Lines | Class | IPC | Importers | Concern | Home |
|---|---|---|---|---|---|---|
| `Toolbar.tsx` | 120 | react (`ResizeObserver`, `.app-toolbar`) | – | 1: App.tsx | app toolbar (back/forward, TabBar, trio) | `UIX/Shell/Toolbar` |
| `ToolbarTrio.tsx` | 23 | react | – | 1: Toolbar | shell glass trio | `UIX/Shell/Toolbar` |
| `NavMenu.tsx` | 19 | react placeholder | – | 1: Toolbar | shell | `UIX/Shell/Toolbar` |
| `toolbar.css` | 69 | style (`-webkit-app-region:36`, 135px traffic-light pad) | – | side-effect: Toolbar | shell, Electron frameless window | `UIX/Shell/Toolbar` (Desktop-specific rules → `Desktop/`) |
| `toolbar-menu.css.ts` | 48 | style (`WebkitAppRegion:18`) | – | 5: NavMenu, ViewMenu, SpaceMenu, OutlineMenu, ViewFrame | toolbar menu button chassis | `UIX/Shell/Toolbar` |
| `ViewMenu.tsx` | 57 | react | `:36 viewButtonMenu`, `:40 container.configure` | 1: Toolbar | view switcher button | `UIX/Views/Settings` |
| `ViewFrame.tsx` | 236 | react (frameDnd reorder, rename, icon, color) | `:85 views.save`, `:95 views.reorder`, `:96 showError`, `:107 viewRowMenu`, `:123 views.delete` | 1: ViewMenu | saved-view list + CRUD | `UIX/Views/Settings` |
| `SpaceMenu.tsx` | 157 | react | `:54 titleMenu` | 1: Toolbar | Space heading menu | `UIX/Surfaces/Space` |
| `OutlineMenu.tsx` | 140 | react (MarkdownPM folding + live editor registry) | – | 1: Toolbar | page heading outline | `UIX/Editor/Outline` |
| `OutlineDnd.tsx` | 137 | react (insertionDrag over headings) | – | 1: OutlineMenu | outline section drag | `UIX/Editor/Outline` |
| `outlineTree.ts` | 23 | pure | – | 1: OutlineMenu | heading nesting | `UIX/Editor/Outline` |
| `outline-menu.css.ts` | 11 | style | – | 1: OutlineMenu | outline | `UIX/Editor/Outline` |

**Test-only importers:** no in-scope file has a test as its sole importer; every non-test file has at least one production importer. Per-symbol export usage was not audited beyond what the table records.

---

### 2. The Five Folders as One Domain

**Verdict:** Views, Frames, and two Toolbar files are one Views domain split by birth date; Tables and Cards are each half design-system primitive and half table-renderer detail; Toolbar is shell chrome with three selection-scoped menus seated in it, only one of which is a view concern.

#### Views and Frames are one domain

`Frames/` has no chassis of its own. The pane machinery it renders into (`FrameSlide`, `MenuScrollFrame`, `MenuTopRow`, `MenuFooting`, `MenuIndex`) already lives in `PommoraUIX/Menus`. What `Frames/` actually holds is "everything the toolbar's Settings button can show", filed by *where it opens* rather than what it is:

- View configuration (Filter, Group, Sort, Layout, Hidden, LayoutToggles, CardsOptions, ViewItemMenu, SettingsFrame root): 3,159 lines. They read the pipeline (`Pipeline/group`, `Pipeline/columns`, `Pipeline/filter`), the host's hooks (`useActiveView`, `useValuesEpoch`), and the band model (`bandDndModel`); the host reads back `hiddenFrameModel`. The import graph is already bidirectional Views ↔ Frames, which is the signature of one domain with a folder wall through it.
- A schema editor (`PropertyFrame`, 569): edits the Collection's property assignment and the nexus-wide registry over ~30 IPC channels; touches no view field. It is a Properties surface that happens to be reachable from the view settings root.
- A page menu (`PageMenu`, 117), a homepage settings pane (`SettingsScaffold`, 94), and the trio's scope switch (`SettingsMenu`, 34): none are view-level.
- Two generic chassis pieces (`InlineEditHeader`, `frameDnd` + `frameDndModel`) reused by Toolbar and Properties.

Conversely `Toolbar/ViewMenu` + `ViewFrame` (293 lines) are the view switcher and the saved-view list with CRUD, reorder, rename, icon, and color; they import `Frames/LayoutFrame`, `Frames/frameDnd`, `Views/useActiveView`, and `Tiles/ViewTileScope`. They are the Views domain's toolbar entry, filed under the toolbar.

#### Tables/: table-renderer-specific vs generic

| Table-renderer-specific (304 lines) | Generic or view-wide (529 lines) |
|---|---|
| `ColumnHeader.tsx` (TableView-shaped callbacks, `.col-header`) | `tableDnd.tsx`: row insertion-line drag with reorder/reassign/relocate semantics injected; `Navigation/NavList.tsx:7,160,231` uses it for the nav list. Nothing table-specific except the `.cell-filler` line-end probe at `:83`. |
| `cellSweep.ts` (queries `.data-row:not(.ghost-row)`, `data-rid`) | `columnStyles.ts`: `styleFor`/`useStyleFor` are read by Cards (`CardsView`, `CardPickerHost`) and by Frames (`PropertyFrame`, `FilterFrame`); a per-view column-style resolver, not table machinery. |
| `columnWidths.ts` (px min/default/max per type) | `Table.css` + `table-tokens.css`: global `.table` chrome imported in `main.tsx`; `Settings/TrashFrame.tsx:207,222,223,231,299` and `Showcase/Leaves/TypographyLeaf.tsx` use the same classes. Shared chrome, which the code's own consumers already treat as design system. |
| `columnReorder.ts` | |
| `columnAlign.ts` (pure; view + type → align) | |

#### Cards/Card.tsx alone in its folder

Yes, for a real reason: `Navigation/NavGallery.tsx` renders the same eight primitives (`CardRoot/Body/Thumb/Placeholder/Text/Title/DropSlot/Trail`) as `CardsView`, and `cards.css` is a global stylesheet. It is a shared primitive that was separated from the Cards *view* so the nav gallery could use it. The reason is right; the top-level folder is wrong. A two-file shared primitive belongs under `PommoraUIX/Elements/Card`, next to `NavTrail`, which it already imports. `cards.css` is also imported twice (from `Card.tsx:9` and `main.tsx:10`).

#### Toolbar/: app toolbar or view toolbar

App toolbar. `Toolbar.tsx` renders back/forward (`goBack`/`goForward` from the store), `TabBar`, the trio (Navigation / Settings / Inspector), and floats over the frameless titlebar (`toolbar.css:36 -webkit-app-region: no-drag`; `:23 padding-left: 135px` reserving room for the traffic lights). That is shell. Three menus are seated in its right cluster, gated by selection kind: `ViewMenu` (container → Views), `OutlineMenu` (page → editor), `SpaceMenu` (space → Space surface). `toolbar-menu.css.ts` is the shared button/anchor chassis those three use and stays with the shell.

#### OutlineMenu belongs to the editor

Its data is `headingOutline(body)` from `MarkdownPM/Editor/folding`; its actions are `travelPageTo`, `renameHeadingAtOffset`, `moveHeadingSection` from `Interface/pageEditor.ts`, which is a module-level registry of the live `EditorView` whose **only importers are `Toolbar/OutlineMenu.tsx` and `Toolbar/OutlineDnd.tsx`**. `outlineTree.ts` nests `OutlineHeading[]` from the same folding module. The whole cluster (311 lines) plus `pageEditor.ts` is an editor feature with a toolbar seat.

---

### 3. The Pure Pipeline

**Confirmed pure.** The eight files under `Views/Pipeline/` import no React, no `window`, no `document`, no `window.nexus`. Their imports, exhaustively:

- `@shared/*`: `types`, `views`, `properties`, `propertyValue`, `schemas`, `identity`, `linkValue` — all of which import only each other plus `zod`. No Node, no fs.
- `@renderer/Properties/value` (`declaredType`, `resolveFieldValue`, `fileName`): 90 lines, imports only `@shared/*`. Pure.
- `@renderer/PommoraUIX/Util/pad` (`pad`): a one-line `padStart`. Pure.

Runtime determinism for a server or phone: `sort.ts:23` uses `localeCompare(…, undefined, { sensitivity: 'accent' })`, so text ordering follows the host's default locale (a server should pin one). `group.ts:154–158` bucket dates through an explicit `utc` flag with local-time getters on the other branch; a server evaluating a date-grouped view bucket-for-bucket with a phone must agree on that flag. Week math at `:138–142` is UTC. Nothing else is environment-sensitive.

**Could it live in Core?** Yes, with two moves: `Properties/value.ts` → `Core/Properties/value.ts` (it is already the pure typed-value reader everything leans on) and `pad` → a Core util. Nothing in Pipeline knows a container, a store, or a DOM node; `resolveView` takes `{ rows, setTree, view, schema, manualOrder?, flattenStructural?, contextIds? }` and returns `{ columns, groups }`. That is exactly the signature a sync server or mobile host needs.

Two files in the folder are not stages and should be labeled as what they are when it moves: `pickView.ts` (container schema inheritance + active-view pick) and `creationSeeds.ts` (creation-time seeds derived from the filter). Both are pure and Core-eligible, but they belong at `Core/Views/` root, not under `pipeline/`.

**Pure files outside the Pipeline folder that belong beside it** (all import only `@shared` or other pure renderer modules): `Views/viewMerge.ts`, `Views/creationOrder.ts`, `Views/TableView/reassign.ts`, `Tables/columnAlign.ts`, `Tables/columnStyles.ts` (`styleFor` half), `Frames/hiddenFrameModel.ts` (the four visibility writers; `hiddenListIds` is already read from `Properties/Assignment/cardValueInput.ts:5`), and `Frames/filterModel.ts` (`encodeFilter`/`decodeFilter`/`connectorFor`; the operator and target tables carry icon names and stay UIX).

---

### 4. PageMenu, SettingsMenu, SettingsScaffold, SettingsFrame

| File | Level | Evidence | Misfiled? |
|---|---|---|---|
| `Frames/PageMenu.tsx` | **Page** | Reads `shownDetail`; renames the page, sets its icon, pushes into `Properties/PageProperties`, opens page History, footer actions are `title:rename / reveal / copylink / delete` over `pageActionsMenu`. No view field is read. | Yes. It is the page's settings menu; home is beside `PageView`. |
| `Frames/SettingsMenu.tsx` | **Shell** | Switches on `viewSettingsScope(selection)`: `view` → SettingsFrame, `page` → PageMenu, `homepage`/`context` → SettingsScaffold. It binds the trio's Settings button to whichever surface is selected. | Yes. It belongs with `Toolbar.tsx`, its only importer. |
| `Frames/SettingsScaffold.tsx` | **Homepage** | Returns null unless `selection.kind === 'homepage'`; edits the nexus icon/photo and the homepage board lock (`HOMEPAGE_HOST`). The name says "generic scaffold"; the code is homepage settings. | Yes, and misnamed. `HomepageSettings.tsx` beside `HomepageView`. |
| `Frames/SettingsFrame.tsx` | **Container/view** | The Settings root for a Collection or Set: Configuration (`open_in`, container-level), Properties (schema, collection-level), Visibility, Layout, Group, Filter, Sort (view-level), Scale footing (view-level). Also mounted by `Tiles/Surfaces/ViewTile.tsx:33`. | Correctly a Views-domain file; its Configuration and Properties leaves are container/schema concerns it hosts as doors. |

---

### 5. Host-Bound Inventory

Everything a Capacitor (WKWebView) host could not reuse unchanged. Four categories.

#### 5a. Native menu channels (Electron `Menu.popup` behind the bridge)

The contracts live in `shared/*Menu.ts` and are built main-side (`main/cardMenu.ts`, `cellMenu.ts`, `columnMenu.ts`, `contextMenu.ts`, `gripMenu.ts`, …). A WKWebView host has no native context menu to pop; each call site needs a renderer-drawn menu behind the same bridge entry.

- `Views/TableView/TableView.tsx:501` `window.nexus.columnMenu` · `:855` `window.nexus.cellMenu`
- `Views/CardView/CardsView.tsx:1061` `window.nexus.cardMenu`
- `Views/CardView/CardValue.tsx:147` `window.nexus.cellMenu`
- `Views/ViewGroupBand.tsx:61` `window.nexus.contextMenu({ kind: 'set' … })`
- `Frames/PropertyFrame.tsx:354, :364` `window.nexus.propertyMenu`
- `Frames/PageMenu.tsx:37` `window.nexus.pageActionsMenu`
- `Toolbar/ViewMenu.tsx:36` `window.nexus.viewButtonMenu` · `Toolbar/ViewFrame.tsx:107` `window.nexus.viewRowMenu` · `Toolbar/SpaceMenu.tsx:54` `window.nexus.titleMenu`

#### 5b. Desktop-only bridge calls (dialogs, shell, clipboard, chooser)

- `Frames/PropertyFrame.tsx:244, :258, :299` `showError`; `:497` `chooseAssetDir`
- `Frames/HiddenFrame.tsx:132` `showError` · `Toolbar/ViewFrame.tsx:96` `showError`
- `Frames/PageMenu.tsx:40` `writeClipboard`; `:41` `revealPath` (Finder reveal has no iOS equivalent)
- Data channels that are host-neutral in shape but Electron-wired today: `Views/useValuesEpoch.ts:16` `loadValues`; `Views/useViewOrders.ts:19,30` `viewOrders`; `Views/viewMint.ts:30,53,59` `views.save`/`activeViews.set`; `Frames/ViewItemMenu.tsx:26,34,39` `views.*`; `Toolbar/ViewFrame.tsx:85,95,123` `views.*`; `Frames/SettingsFrame.tsx:114`, `Toolbar/ViewMenu.tsx:40` `container.configure`; `PropertyFrame.tsx:251–:339` `schema.*`, `property.*`, `registry.reorder`. These survive a host swap if the bridge is reimplemented; they are listed so the count is honest (Views domain: 9 files touch the bridge directly; everything else goes through the store).

#### 5c. Mouse-only interactions with no touch path

**Right-click as the only route** (no long-press alternative anywhere in scope): `TableView.tsx:1534` (column header), `:1730, :1772` (cell), `:1753` (grip); `CardsView.tsx:704` (set card), `:912` (thumb), `:1126` (card); `CardValue.tsx:191`; `GroupBand.tsx:221` via `ViewGroupBand.tsx:82`; `Tables/ColumnHeader.tsx:73`; `Frames/PropertyFrame.tsx:121, :152`; `Toolbar/ViewMenu.tsx:51`; `Toolbar/ViewFrame.tsx:177`; `Toolbar/SpaceMenu.tsx:105`; `Toolbar/OutlineMenu.tsx:123` (rename by right-click).

**Modifier keys as the only route:** ⌘-click opens in a new tab at `TableView.tsx:534`, `CardsView.tsx:698, :1124`; ctrl-click secondary-click guards at `TableView.tsx:521`, `CardValue.tsx:82`.

**Hover as the trigger:** the hover ghost row/card (`useGhostAnchor`) is armed on `onPointerEnter/Leave` at `TableView.tsx:1596–1597, 1686–1687` and `CardsView.tsx:631–632, 1118–1119`; a finger never "enters" without pressing, so the create ghost has no touch path. CSS hover reveals: `TableView/table-view.css:64` (`.row-grip`), `Tables/Table.css:161, :165`, `Cards/cards.css:114` (`.card-pin`), `Frames/frames.css.ts:115, :159–160`, `Frames/group-frame.css.ts:36–37`, `Frames/filter-frame.css.ts:98`.

**Pointer drags without `touch-action: none`:** the `Interactions/engine.tsx:532` and `group.tsx:760` drag engines (used by Cards' `DragGroup`) set it; `Interactions/gesture.ts` and `insertionDrag.tsx` do not, so on a touch host the finger scrolls instead of dragging for: `Tables/tableDnd.tsx:171` (row grip), `Tables/ColumnHeader.tsx:72, :76` (column reorder + resize strip), `Tables/cellSweep.ts:47`, `Views/BandDnd.tsx` (band glyph), `Frames/frameDnd.tsx`, `Frames/groupDnd.tsx`, `Toolbar/OutlineDnd.tsx`, and the `TableView.tsx:1136+` column-header gesture.

**Double-click:** `Views/GroupBand.tsx:248` (band rename).

#### 5d. Electron shell rules

`Toolbar/toolbar.css:36` `-webkit-app-region: no-drag` and `:23` traffic-light padding; `Toolbar/toolbar-menu.css.ts:18` `WebkitAppRegion: 'no-drag'`. Harmless no-ops elsewhere, but they encode the frameless-window shell and mark `Toolbar/` as the Desktop host's chrome.

**Not host-bound, for the record:** CSS `zoom` (`ViewHost.tsx:36`, `table-view.css:24`, `cards-view.css:11`, `CardsView.tsx:483`) and the `getComputedStyle(...).zoom` reads (`TableView.tsx:230, :1212`, `CardsView.tsx:437`) work in WebKit. `ResizeObserver`, `getBoundingClientRect`, `requestAnimationFrame` are fine.

---

### 6. Folder Verdicts and the Proposed Tree

#### Verdicts

| Folder | Verdict | Admission rule a future file must meet |
|---|---|---|
| `Views/` | **Keep as the domain root, re-nest inside.** Pure stages leave for Core; the flat root splits into `Host/` and `Bands/`; `TableView/` → `Table/`, `CardView/` → `Cards/`; the view-settings frames and the two toolbar view files move in as `Settings/`. | It renders or configures a saved view's presentation of a container's Pages, or seats a renderer. It touches the bridge only through the store, `useSaveView`, or the Host folder. |
| `Tables/` | **Dissolve.** Renderer-specific pieces → `Views/Table/`; `tableDnd` → Interactions; `styleFor` → Core, `useStyleFor` → `Views/Host`; `columnAlign` → Core; `Table.css` + tokens → `PommoraUIX/Table/`. | (none; folder retired) |
| `Cards/` | **Dissolve into `PommoraUIX/Elements/Card/`.** | A card primitive with no knowledge of Pages, views, or the store. |
| `Frames/` | **Dissolve.** View panes → `Views/Settings/`; `PropertyFrame` → `Properties/Schema/`; `PageMenu` → `Surfaces/Page/`; `SettingsScaffold` → `Surfaces/Homepage/HomepageSettings`; `SettingsMenu` → `Shell/Toolbar/`; `InlineEditHeader` + header styles → `PommoraUIX/Menus/`; `frameDnd` + model + region styles → Interactions; option-editor styles → `Properties/Editors/`. | (none; folder retired) |
| `Toolbar/` | **Rename to `Shell/Toolbar/` and split.** Keeps `Toolbar`, `ToolbarTrio`, `NavMenu`, `SettingsMenu`, both css files. `ViewMenu`/`ViewFrame` → `Views/Settings/`; `SpaceMenu` → `Surfaces/Space/`; `Outline*` → `Editor/Outline/`. | Persistent app chrome that is present for every selection kind. A selection-scoped menu belongs to the surface that selection opens; the toolbar only seats it. |

#### The Views domain in the new layout (line estimates, tests excluded)

```
Core/Views/                                     ~1,900
  pipeline/                                      1,323
    resolveView.ts · columns.ts · filter.ts · group.ts · sort.ts · bandOrder.ts
  pickView.ts (32) · creationSeeds.ts (47) · creationOrder.ts (64) · viewMerge.ts (14)
  reassign.ts (37) · columnAlign.ts (30) · columnStyle.ts (styleFor, ~25)
  columnVisibility.ts (hiddenListIds/placeInShown/hideShown/unhide, ~80)
  filterCodec.ts (encode/decode/connectorFor, ~90) · viewIcon.ts (12)
  (moves with it: Core/Properties/value.ts 90 · Core/util/pad.ts 4)

UIX/Views/                                      ~9,300
  Host/        ~950   ViewHost · useViewHost · useActiveView · useValuesEpoch
                      useViewOrders · useViewCreation · contextCellWrite · viewMint
                      useStyleFor · view-host.css.ts
  Bands/       ~850   GroupBand · ViewGroupBand · BandDnd · bandDndModel
                      useBandOrdering · group-band.css   (cardsBand folded in)
  Table/     ~2,150   TableView · table-view.css · ColumnHeader · cellSweep
                      columnWidths · columnReorder
  Cards/     ~1,950   CardsView · CardValue · CardPickerHost · CardAddPicker
                      cardsOrder · cards-view.css · card-add-picker.css.ts
  Settings/  ~3,400   SettingsFrame · LayoutFrame (+css) · LayoutToggles · CardsOptions
                      switchRows · FilterFrame (+css) · filterChoices (operator/target tables)
                      GroupFrame (+css) · groupDnd · frameWidgets (optionsOf/PropertyPreview/CustomList)
                      SortFrame · HiddenFrame (+hiddenPaneSlot) · ViewItemMenu
                      ViewMenu · ViewFrame
```

Leaving the domain (≈2,900): `PropertyFrame` 569 → `UIX/Properties/Schema`; `Toolbar`/`Trio`/`NavMenu`/`SettingsMenu`/two css ≈ 313 → `UIX/Shell/Toolbar`; `PageMenu` 117 → `UIX/Surfaces/Page`; `SettingsScaffold` 94 → `UIX/Surfaces/Homepage`; `SpaceMenu` 157 → `UIX/Surfaces/Space`; `Outline*` 311 → `UIX/Editor/Outline`; `Card.tsx` + `cards.css` 308 and `Table.css` + `table-tokens.css` 322 → `UIX/PommoraUIX`; `InlineEditHeader` 69 + header styles ≈ 80 → `UIX/PommoraUIX/Menus`; `frameDnd` + `frameDndModel` + `tableDnd` 435 + region styles → `UIX/PommoraUIX/Interactions`; option-editor styles ≈ 90 → `UIX/Properties/Editors`.

#### The renderer's folders collapsed to ten

From this domain's vantage, using the same rule (file by what it is and who imports it, not where it opens):

| # | Folder | Absorbs (today's folders) | Admission rule |
|---|---|---|---|
| 1 | `PommoraUIX/` | PommoraUIX, Animation, Interactions, Cards, Tables' chrome, `Utilities/EntityIcon`, `Settings/IconPicker`, `Actions/RenamableTitle` | Knows tokens, gestures, and motion; knows no Page, view, or store. |
| 2 | `Session/` | store.ts, Store, treeIndex, Actions (commands, selection, nativeMenus, clipboard/external), `Interface/notifications`, `Windows/confirmations`, Assets (`assetUrl`, `AssetImage`), `Utilities/useNexusIcon`, `Settings/iconFavorites` | The renderer's one seam to the bridge and its cached state. A new `window.nexus` call lands here or nowhere. |
| 3 | `Properties/` | Properties (+ `PropertyFrame` as `Schema/`, + option-editor styles) | Typed values, their editors and cells, and the schema/registry editor. |
| 4 | `Views/` | Views, Frames' view panes, Tables' renderer pieces, `Toolbar/ViewMenu` + `ViewFrame` | Section 6 rule above. |
| 5 | `Editor/` | MarkdownPM, `Toolbar/Outline*`, `Interface/pageEditor` | Renders or manipulates a Markdown body. |
| 6 | `Tiles/` | Tiles | Grid engine and tile surfaces. |
| 7 | `Shell/` | App.tsx, Toolbar (+ `SettingsMenu`), Tabs, Sidebar, Windows, `Interface/InspectorPane`, `Interface/InterfaceScaffold` + `ContentView` + `Banner`, `Settings/SettingsWindow` + `TrashFrame` | Present for every selection kind; frames the surfaces. Desktop-only rules (`-webkit-app-region`, traffic-light insets) factor to `Desktop/`. |
| 8 | `Surfaces/` | `Interface/{Page,Container,Space,Homepage,Nav}View`, Glance, Subfield, `Frames/PageMenu`, `Frames/SettingsScaffold` → `HomepageSettings`, `Toolbar/SpaceMenu`, Navigation | What one selection kind shows in the content pane, plus that kind's own menus. |
| 9 | `Showcase/` | Showcase | Compiles; never in scope. |
| 10 | `Testing/` | Testing, `Utilities/iteration-window` | Test and iteration fixtures. |

---

### 7. Files That Belong to a Different Scope Entirely

**Core (host-free, no React):** `Views/Pipeline/*` (8 files), `Views/viewMerge.ts`, `Views/creationOrder.ts`, `Views/TableView/reassign.ts`, `Tables/columnAlign.ts`, `Tables/columnStyles.ts` (`styleFor`), `Frames/hiddenFrameModel.ts` (the four writers), `Frames/filterModel.ts` (encode/decode), `Frames/viewIcon.ts`; dependencies that go with them: `Properties/value.ts`, `PommoraUIX/Util/pad.ts`. Not in scope but in the same boat: `Sidebar/sidebarDndModel.ts` (pure geometry + `nextOrder`; imported by Views, Frames, Sidebar) is a generic drag model misfiled under Sidebar.

**PommoraUIX:** `Cards/Card.tsx` + `cards.css`; `Tables/Table.css` + `table-tokens.css`; `Frames/InlineEditHeader.tsx` with the header/iconButton/titleField/anchor/footerLock/ICON exports of `frames.css.ts`; `Tables/tableDnd.tsx`, `Frames/frameDnd.tsx`, `Frames/frameDndModel.ts` and the two-region styles of `frames.css.ts` (beside `Interactions/insertionDrag`).

**Editor:** `Toolbar/OutlineMenu.tsx`, `OutlineDnd.tsx`, `outlineTree.ts`, `outline-menu.css.ts`, and `Interface/pageEditor.ts`.

**Shell:** `Toolbar/Toolbar.tsx`, `ToolbarTrio.tsx`, `NavMenu.tsx`, `toolbar.css`, `toolbar-menu.css.ts`, `Frames/SettingsMenu.tsx`.

**Surfaces (page / space / homepage):** `Frames/PageMenu.tsx`, `Toolbar/SpaceMenu.tsx`, `Frames/SettingsScaffold.tsx`.

**Properties:** `Frames/PropertyFrame.tsx`; the option-editor exports of `frames.css.ts` (already imported by seven Properties files).

**Two small misfilings inside the domain:** `Views/TableView/reassign.ts` is read by both renderers, the host, and creation; `Views/CardView/cardsBand.ts` is read only by `Views/ViewGroupBand.tsx`.

---

### Summary

The five folders are one Views domain plus strays. `Views/` and the view panes in `Frames/` already import each other in both directions; `Toolbar/ViewMenu` + `ViewFrame` are the domain's toolbar entry. `Tables/` is 304 lines of table-renderer detail and 529 lines of generic or view-wide code (`tableDnd` is reused by NavList, `columnStyles` by Cards and Frames, `Table.css` by Trash and Showcase). `Cards/Card.tsx` is a shared primitive NavGallery also renders; it belongs in the design system. `Frames/` has no chassis of its own (that lives in `PommoraUIX/Menus`) and is filed by where things open, so it also holds a schema editor, a page menu, homepage settings, and the shell's scope switch. `Toolbar/` is app shell, with `OutlineMenu` an editor feature (sole consumer of the live-editor registry) and `SpaceMenu` a Space surface.

The pipeline is genuinely pure and Core-ready once `Properties/value.ts` and `pad` move with it; nine more pure files should join it. Host-bound work for a WKWebView host is concentrated: nine native-menu call sites, three desktop-only bridge calls, right-click and ⌘-click as sole routes, hover-armed create ghosts, and every insertion-line drag lacking `touch-action: none`. Proposed: Core/Views ≈1.9k, UIX/Views ≈9.3k in five subfolders, and a ten-folder renderer.
