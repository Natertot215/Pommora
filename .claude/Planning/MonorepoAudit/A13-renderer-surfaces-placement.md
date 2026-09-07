### A13: Renderer Surfaces Placement (Properties, Tiles, Interface, Windows)

Scope: `src/renderer/Properties/` (43 non-test files, 3,905 lines), `Tiles/` (33, 4,120), `Interface/` (35, 3,022), `Windows/` (20, 2,739). 13,786 non-test lines total. Importer counts below come from a resolver script that follows `@renderer/`, `@shared/`, and relative specifiers to real files (stem-only greps double-counted `model`, `codec`, `value`, `scope`; those were discarded). Judgments are by code and importers; comments and CLAUDE.md rules were read for vocabulary only.

**Classification legend:** `pure` (no React, DOM, store, or bridge), `component`, `hook`, `style`, `store-glue` (reads `useSession`), `bridge` (calls a `window.nexus` data channel a Capacitor bridge could reimplement), `host-bound` (Electron-only: `<webview>`, native menus, dialogs, `-webkit-app-region`). A file can be several; the dominant one leads.

---

### 1. File Table

#### Interface/ (35 files)

| File | Lines | Class | Importers (n / folders) | Concern | New home |
| --- | --- | --- | --- | --- | --- |
| `AddBannerButton.tsx` | 20 | component | 3 / Interface ×2, MarkdownPM/PageHeader | "Add Banner" affordance | `Surfaces/Header` |
| `Banner.tsx` | 153 | component + host-bound (`titleMenu` L39, L84; `showError` L49) + bridge (`renameNexus` L48) | 1 / InterfaceScaffold | banner band + title for container, space, homepage | `Surfaces/Header` |
| `ContainerView.tsx` | 12 | component (shim) | 1 / ContentView | scaffold + `ViewHost` | `Surfaces/Container` or inline into ContentView's switch |
| `ContentView.tsx` | 194 | component + module singleton (`paneEl`, `getContentViewRect`) | 2 / App, Windows/PageWindow | selection → surface router, parked page hosts, footer | `Shell/ContentView` |
| `DetailTitleHeader.tsx` | 75 | component | 2 / Banner, MarkdownPM/PageHeader | icon + renamable title + title menu | `Surfaces/Header` |
| `Glance/GlancePane.tsx` | 435 | component + bridge (`glance.load/save`) + host-bound (`<webview>` L412–416, `getWebContentsId` L108–122, guest events L267–273, `wheelGuest` L122) | 1 / App | hover preview pane (page + site) | `Shell/Glance` (page branch); site branch → `Surfaces/Web` (Desktop) |
| `Glance/glance-pane.css` | 52 | style | 1 | | `Shell/Glance` (`.glance-web*` rules → Desktop) |
| `Glance/glanceAction.ts` | 100 | pure DOM seam, zero imports | 6 / MarkdownPM ×5, GlancePane | presenter slot, dwell arm, anchor watch | `Shell/Glance` (leaf; all consumers are MarkdownPM) |
| `HomepageView.tsx` | 22 | component (shim) | 1 / ContentView | scaffold + TileHost | `Surfaces/Board` |
| `InspectorPane/InspectorPane.tsx` | 17 | component | 1 / App | empty glass pane | `Shell/Inspector` |
| `InspectorPane/inspector-pane.css` | 29 | style + host-bound (L14) | 1 | | `Shell/Inspector` |
| `Interface.css` | 108 | style | 1 / main.tsx | main-pane geometry, `.detail*` insets | `Shell` |
| `InterfaceScaffold.tsx` | 52 | component + store-glue (tabState warmth) | 3 / Container, Space, Homepage views | banner + scroll-warm body | `Shell/ContentView` |
| `NavView.tsx` | 113 | component | 1 / ContentView | main-pane Navigation surface | `Surfaces/Nav` |
| `NotificationLabel.tsx` | 129 | component + store-glue | 1 / App | toast | `Shell/Notifications` |
| `PageView.tsx` | 225 | component + bridge (`headingIcon`, `folds`, `embedHeights`, `embedZooms`, `tableHeadingColumns`) | 1 / ContentView | the main-pane page editor surface | `Surfaces/Page` |
| `SpaceView.tsx` | 24 | component (shim) | 1 / ContentView | scaffold + TileHost | `Surfaces/Board` |
| `Subfield/CitationsToggle.tsx` | 29 | component | 2 / ContentView, PageWindow | footnotes toggle | `Shell/Subfield` |
| `Subfield/Subfield.tsx` | 51 | component | 2 / ContentView, PageWindow | footer bar | `Shell/Subfield` |
| `Subfield/crumbs.ts` | 98 | pure (types from PommoraUIX, store) | 2 / Subfield, Store/navigationSlice | crumb spine; `crumbDepthFor` | `crumbDepthFor` → `Store/navigation`; rest → `Shell/Subfield` |
| `Subfield/subfield.css` | 103 | style + host-bound (L11, L55) | 1 | | `Shell/Subfield` |
| `Subfield/subfieldItems.tsx` | 101 | component registry + store-glue | 4 | per-kind footer items | `Shell/Subfield` |
| `Subfield/subfieldStats.ts` | 125 | pure (over MarkdownPM Detect + docCache) | 2 / Subfield items, CitationsToggle | page stats from the editor's own scan | `MarkdownPM` (it is a document derivation; Subfield is a consumer) |
| `action-band.css.ts` | 122 | style | 2 / Tiles/Surfaces (ViewTile, view-tile.css) | segment row + settings button styles | `PommoraUIX/Elements/ActionBand` |
| `content-banner.css` | 126 | style + host-bound (L124) | 2 / NavView, main.tsx | | `Surfaces/Header` |
| `content-title.css` | 49 | style | 1 / DetailTitleHeader | | `Surfaces/Header` |
| `nav-view.css` | 41 | style | 1 | | `Surfaces/Nav` |
| `notification-label.css.ts` | 56 | style | 1 | | `Shell/Notifications` |
| `notifications.ts` | 36 | store-glue + bridge (`views.save/reorder`) | 5 / Frames, Store, Tiles, Toolbar, Windows | `notify*` helpers, `Notification` type, `restoreView` | type → `Store/chromeSlice`; `notify*` → `Actions/notify`; `restoreView` → `Views` |
| `pageEditor.ts` | 55 | module registry (CM6 `EditorView`) | 3 / Toolbar ×2, PageView | live page editor handle for the outline | `Surfaces/Page` |
| `pageFlush.ts` | 37 | store-glue + bridge (`updatePageBody`) | 5 / Store ×2, Interface ×2, Tiles/Surfaces | the page autosave | `Store/pageSave` |
| `restoreSnapshot.ts` | 17 | action + bridge | 1 / Windows/PageHistoryWindow | | `Actions` (or beside PageHistoryWindow) |
| `scope.ts` | 123 | pure tree lookups | 16 / Interface ×7, Store ×2, Toolbar ×2, Frames, Tiles ×2, Views ×2 | `findCollection/Set/Space/Container`, `BannerOwner`, `isDepth1Set`, `parentPathOf` | merge into `Store/treeIndex` |
| `useBannerMenu.ts` | 72 | hook + host-bound (`pickFile` L50, `bannerMenu` L60) | 5 / Interface ×2, MarkdownPM, Tiles/Surfaces, Views/CardView | banner menu, pick, crop | `Surfaces/Header` (menu + dialog through the Host seam) |
| `viewSettingsScope.ts` | 21 | pure | 2 / Toolbar/OutlineMenu, Frames/SettingsMenu | selection → settings scope | beside `Frames/SettingsMenu` |

#### Windows/ (20 files)

| File | Lines | Class | Importers | Concern | New home |
| --- | --- | --- | --- | --- | --- |
| `ConfirmationWindow.tsx` | 88 | component + store-glue | 1 / App | modal confirm presenter | `Shell/Confirm` |
| `confirmation-window.css.ts` | 65 | style | 1 | | `Shell/Confirm` |
| `confirmations.ts` | 150 | actions + bridge (`deleteFacts` L30, L103) | 14 / Frames ×3, Properties/Editors ×2, Settings ×2, App, Store, Tiles, Toolbar, Views ×2, PageHistoryWindow | `ask*` catalog, `confirmDelete` + undo toast | `Actions/confirm`; `ConfirmRequest` type → `Store` |
| `NavWindow.tsx` | 257 | component + store-glue | 1 / App | floating navigation window | `Windows/Nav` |
| `nav-window.css` | 77 | style | 1 | | `Windows/Nav` |
| `PageHistoryWindow.tsx` | 243 | component + bridge + host-bound (`showError` L57, L105, L116; `historyMenu` L121) | 1 / App | snapshot list + read-only preview | `Windows/PageHistory` |
| `PageWindow.tsx` | 507 | component + host-bound (`propertyMenu` L337) | 2 / App, NavWindow (`PagePanel`) | floating page window AND `PagePanel` property rows | `Windows/Page`; `PagePanel` (L235–507) → `Properties/Page` |
| `page-window.css` | 101 | style | 2 / PageWindow, PageHistoryWindow | | `Windows/Page`; `.page-window-insp-*` → `Properties/Page` |
| `useWindowWarm.ts` | 65 | hook + store-glue | 2 / PageWindow, NavWindow | window-tab editor warmth | `Windows` (shared by both flavors) |
| `WebWindow.tsx` | 147 | component + host-bound (`<webview>` L135–142, guest API L26–31, L66, L80–88; `openExternal` L125) | 3 / App, Actions ×2 (`openInAppBrowser`) | in-app browser | `Surfaces/Web` (Desktop implementation); `openInAppBrowser` → `Actions/openWebLink` |
| `web-window.css` | 32 | style + host-bound (`webview` selector L8) | 1 | | Desktop |
| `WindowActions.tsx` | 30 | component | 2 / PageWindow, NavWindow | settings + inspector pair | `PommoraUIX/Window` |
| `WindowTabStrip.tsx` | 212 | component + store-glue (reads `pageWindow`) + Navigation resolve | 2 / PageWindow, NavWindow | tab strip with title morph | `Windows` (DS-grade only if fed by props instead of the store) |
| `window-base.css` | 297 | style | 1 | chassis | `PommoraUIX/Window` |
| `window-base.tsx` | 249 | component | 7 / Windows ×4, Settings, Utilities, Showcase | chassis | `PommoraUIX/Window` |
| `window-panel.css` | 9 | style | 1 | | `PommoraUIX/Window` |
| `window-panel.tsx` | 92 | component | 2 / WindowBase, Settings | side panel + resize strip | `PommoraUIX/Window` |
| `windowCache.ts` | 35 | module state (+ dev CDP probe) | 2 / Store/windowSlice, useWindowWarm | per-tab warm entries | `Store` |
| `windowMorph.ts` | 15 | DOM stash (`querySelector('.page-window')`) | 2 / Store/windowSlice, NavWindow | FLIP rect stash | `Windows` (the store calls it; it reads Windows' DOM) |
| `windowTabs.ts` | 68 | pure state model | 3 / Store, Actions, WindowTabStrip | tab set ops | `Store/windowTabs` |

#### Tiles/ (33 files)

| File | Lines | Class | Importers | Concern | New home |
| --- | --- | --- | --- | --- | --- |
| `Core/codec.ts` | 17 | pure (zod via `@shared/tiles`) | 1 / useTileDoc | layout parse | `Core/TileLayout` |
| `Core/edges.ts` | 46 | pure | 1 / TileGrid | edge → boundary | `Core/TileLayout` |
| `Core/hitTest.ts` | 49 | pure, one impurity: `HYSTERESIS` from `Interactions/shared` L1 | 1 / TileGrid | drop target | `Core/TileLayout` (pass hysteresis in) |
| `Core/model.ts` | 146 | pure | 9 / Core ×5, Tiles ×3, Showcase/TileLab | tree types + lookups | `Core/TileLayout` |
| `Core/ops.ts` | 265 | pure | 3 / TileGrid, TileHost, Showcase | mutations | `Core/TileLayout` |
| `Core/rects.ts` | 84 | pure | 4 / Core ×2, TileGrid, Showcase | geometry | `Core/TileLayout` |
| `Core/snap.ts` | 42 | pure | 1 / TileGrid | magnetism | `Core/TileLayout` |
| `Surfaces/MarkdownTile.tsx` | 83 | component + bridge (`tiles.readMarkdown/writeMarkdown`) | 1 / tileKinds | markdown tile body | `Surfaces/Board/Kinds` |
| `Surfaces/PageTile.tsx` | 215 | component + store-glue | 5 / Windows ×2, Interface/Glance, MarkdownPM/embedWidget (lazy), tileKinds | THE page embed | `Surfaces/Page/PageTile` |
| `Surfaces/ViewTile.tsx` | 598 | component + host-bound (`viewEmbedTitleMenu` L359, `viewEmbedAreaMenu` L373, `viewRowMenu` L387) | 1 / tileKinds | view embed + switcher | `Surfaces/Board/Kinds` |
| `Surfaces/view-tile.css.ts` | 155 | style (imports `Interface/action-band.css`) | 1 | | `Surfaces/Board/Kinds` |
| `Surfaces/WebTile.tsx` | 235 | component + host-bound (`<webview>` L193–202; `capturePage` L100–118; `getWebContentsId` L139–151; guest events L177–183) | 1 / MarkdownPM/embedWidget (lazy, L339) | webpage embed | `Surfaces/Web` (Desktop implementation behind a slot) |
| `Surfaces/webRetention.ts` | 29 | pure (`capSet`) | 1 / WebTile | hidden guest cap | `Surfaces/Web` |
| `TileGrid.tsx` | 564 | component (controlled, generic `renderTile`) | 2 / TileHost, Showcase/TileLab | drag + resize gestures | `PommoraUIX/TileGrid` (or `Surfaces/Board/Grid`) |
| `tile-grid.css` | 144 | style | 1 | | with TileGrid |
| `TileHandleMenu.tsx` | 324 | component (in-DOM menu presenter) | 1 / TileHost | handle menu | `Surfaces/Board` |
| `handle-menu.css.ts` | 61 | style | 1 | | `Surfaces/Board` |
| `TileHost.tsx` | 410 | component + bridge (`tiles.*`) + host-bound (native path L213, L355 via `popRowMenu`) | 2 / SpaceView, HomepageView | host binding: doc, entries, menus, CRUD | `Surfaces/Board` |
| `tileKinds.tsx` | 82 | component table | 2 / TileHost, ViewTile (type) | kind → surface | `Surfaces/Board` |
| `tileCache.ts` | 35 | module state | 2 / MarkdownPM/embedWidget, MarkdownPM/index | nested-embed warmth + scroll heal | `MarkdownPM/Editor` (misfiled; no Tiles importer) |
| `tileZoom.ts` | 35 | pure (over `SCALE_STEPS`) | 4 / Tiles ×2, MarkdownPM ×2 | scale steps + inline style | `PommoraUIX/Tile` (or Core beside `SCALE_STEPS`) |
| `useTileDoc.ts` | 173 | hook + bridge (`tiles.get/save`, `onTilesChanged`) + store-glue | 1 / TileHost | document session | `Surfaces/Board` |
| `pageTileWrite.ts` | 54 | pure-ish (installs `beforeunload`) | 2 / Interface/pageFlush, MarkdownTile | debounced body writer | `Store/bodyWriter` |
| `ViewTileScope.tsx` | 55 | React context + hook | 14 / Frames ×9, Views ×3, Toolbar, ViewTile | view-write scope (locked embed) | `Views` (its consumers are the view frames) |
| `tile-base.css` | 187 | style + host-bound (`webview` selectors L147–161) | 6 / Tiles ×4, MarkdownPM/embedWidget, PageHistoryWindow | tile chassis + markdown/page/web body chrome | `PommoraUIX/Tile`; `.web-tile*` → `Surfaces/Web` css |
| `tile-title.css` | 32 | style | 2 / PageTile, WebTile | hover-revealed crumbs/title | `PommoraUIX/Tile` |

#### Properties/ (43 files)

| File | Lines | Class | Importers | Concern | New home |
| --- | --- | --- | --- | --- | --- |
| `Assignment/Cell.tsx` | 198 | component | 4 / PageProperties, CardValue, TableView, PageWindow | type-aware value render | `Properties/Cells` |
| `Assignment/DatetimeValuePicker.tsx` | 30 | component + store-glue | 3 / PropertyValueEditors, CardView, TableView | | `Properties/Pickers` |
| `Assignment/LinkCell.tsx` | 101 | component + store-glue (`linkTitles`) | 1 / Cell | url + connection cell | `Properties/Cells` |
| `Assignment/MassPropertyPicker.tsx` | 50 | component | 1 / TableView | multi-row pick | `Properties/Pickers` |
| `Assignment/OptionChip.tsx` | 62 | component | 7 / Frames ×2, Properties ×4, Views | option → `Label` | `Properties/Cells` |
| `Assignment/PropertyEditor.tsx` | 76 | component | 4 | inline text field | `Properties/Pickers` |
| `Assignment/PropertyPicker.tsx` | 179 | component + pure `pickSemantics` | 6 / CardView ×2, Assignment ×2, Frames, TableView | option dropdown | `Properties/Pickers` |
| `Assignment/PropertyValueEditors.tsx` | 78 | component | 2 / PageProperties, PageWindow | page-row editors bundle | `Properties/Page` |
| `Assignment/cardValueInput.ts` | 122 | mixed: pure + store (`resolveTitle`) + `Frames/hiddenFrameModel` | 6 / CardView ×4, PageProperties, PageWindow | card add-menu model; `parseEditorValue` | `parseEditorValue` → `Properties/Value`; rest → `Views/CardView` |
| `Assignment/cellResolve.ts` | 70 | pure | 3 / Views ×2, Cell | `findOption`, `groupLabel`, `buildSet*` | `findOption` → Core beside `optionModel`; `groupLabel`/`buildSet*` → `Views/Pipeline` |
| `Assignment/checkboxLook.tsx` | 16 | component | 3 | | `Properties/Cells` |
| `Assignment/columnLabel.ts` | 31 | mixed: pure + hook (`useCapitalizeMetadata`) | 13 / Frames ×5, CardView ×3, Properties ×3, TableView, Windows | labels | pure half → Core; hook → `Properties` |
| `Assignment/filePick.ts` | 150 | host-bound (`pickFile` L49, `adoptFile` L60, `cellMenu` L148) + store-glue | 5 / Assignment ×2, CardView ×2, TableView | file value gesture | `Properties/Pickers` through the Host seam |
| `Assignment/formatValue.ts` | 236 | pure (`pad` from PommoraUIX/Util) | 11 / Frames ×2, Assignment ×2, Editors, Settings, Showcase, Views ×3, Windows | date/number formatting | `Core/format` |
| `Assignment/massAssign.ts` | 27 | pure | 2 / MassPropertyPicker, PropertyPicker (type) | | Core or `Properties/Pickers` |
| `Assignment/statusCycle.ts` | 24 | pure (`IconName` type) | 1 / OptionChip | status group glyph | `Properties/Cells` |
| `Assignment/usePropertyRows.ts` | 204 | hook + store-glue (`mutate`) | 3 / PageProperties, PageWindow, PropertyValueEditors | page rows model | `Properties/Page` |
| `Assignment/valueClick.ts` | 31 | pure | 3 / usePropertyRows, CardView, TableView | click router | Core or `Properties/Pickers` |
| `Assignment/valueUndo.ts` | 29 | DOM listener (`Actions/commands`) | 1 / Views/TableView | ⌘Z stack | `Views/TableView` (misfiled) |
| `Editors/CheckboxEditor.tsx` | 63 | component | 1 / Frames/PropertyFrame | definition config | `Properties/Schema` |
| `Editors/DateTimeEditor.tsx` | 82 | component | 1 / PropertyFrame | | `Properties/Schema` |
| `Editors/FileEditor.tsx` | 47 | component + store-glue | 1 / PropertyFrame | | `Properties/Schema` |
| `Editors/NumberEditor.tsx` | 192 | component | 1 / PropertyFrame | | `Properties/Schema` |
| `Editors/OptionEditor.tsx` | 166 | component + host-bound (`optionMenu` L92) | 1 / PropertyFrame | | `Properties/Schema` |
| `Editors/StatusEditor.tsx` | 187 | component + host-bound (`optionMenu` L84) | 1 / PropertyFrame | | `Properties/Schema` |
| `Editors/URLEditor.tsx` | 69 | component | 1 / PropertyFrame | | `Properties/Schema` |
| `Editors/date-time-editor.css.ts` | 3 | style | 1 | | `Properties/Schema` |
| `Editors/number-editor.css.ts` | 36 | style (`fieldSizing: 'content'` L33) | 1 | | `Properties/Schema` |
| `GhostOptionChip.tsx` | 109 | component + hook | 3 / Editors ×2, OptionRow | new-option slot | `Properties/Schema` |
| `OptionEditPopup.tsx` | 110 | component | 1 / OptionRow | | `Properties/Schema` |
| `OptionRow.tsx` | 162 | component | 3 / Editors ×2, PropertyFrame | | `Properties/Schema` |
| `PageProperties.tsx` | 293 | component + host-bound (`propertyMenu` L120) | 1 / Frames/PageMenu | page rows (Settings leaf) | `Properties/Page`, merged with `PagePanel` |
| `PropertyTypes.tsx` | 100 | mixed: pure type table + `PropertyTypeIcon` component | 11 / Frames ×5, CardView ×2, Properties, Settings, TableView, Windows | type metadata + glyphs | `Properties/Cells`; the `PROPERTY_TYPES` table → Core |
| `contextIdentity.ts` | 92 | pure except `entityIcon` (PommoraUIX/Symbols) L6 | 9 / Frames ×3, Assignment ×3, Properties ×2, Views | id → identity maps | Core once the kind → default-icon map moves to shared |
| `contextOptions.ts` | 52 | pure | 6 / CardView ×2, Frames, Assignment, TableView, Views | context → pick options | Core (same condition) |
| `linkFormat.ts` | 11 | UI adapter (`PickerOption` type) | 2 / URLEditor, Settings/SettingsWindow | picker rows for `LINK_DISPLAYS` | `Properties/Schema` |
| `option-edit-popup.css.ts` | 75 | style | 1 | | `Properties/Schema` |
| `option-row.css.ts` | 8 | style | 1 | | `Properties/Schema` |
| `page-properties.css.ts` | 58 | style | 1 | | `Properties/Page` |
| `resolveContext.ts` | 31 | pure | 11 / Assignment ×4, CardView ×3, Views ×3, TableView | the resolve bundle | Core |
| `useOptionReorder.ts` | 39 | hook (adapter over `useStatusReorder`) | 1 / OptionEditor | | `Properties/Schema` |
| `useStatusReorder.ts` | 116 | hook (`Interactions/insertionDrag`) | 2 / StatusEditor, useOptionReorder | | `Properties/Schema` |
| `value.ts` | 90 | pure | 22 / Frames ×4, Assignment ×4, Tables ×3, Views ×9, Properties, Windows | `declaredType`, `resolveFieldValue`, `fileName` | Core beside `propertyValue.ts` |

**Exports whose only importer is a test:** `GLANCE_DEFAULT`, `glanceWarmSeam`, `setGlanceSize` (GlancePane), `WEB_RETAINED_MAX` (webRetention), `validateLayout` (model; also named in a codec comment). `ADDABLE_TYPES` and `optionLabel` are exported but used only inside their own files.

---

### 2. Interface/ Is a Grab Bag

Yes. Nothing in it shares an admission rule; its 35 files span four tiers and one folder-of-convenience (`Glance/`). The split by what the code does and who imports it:

**The shell (mounted once by `App.tsx`, selection-agnostic chrome):** `ContentView.tsx` (the router; it holds the only `paneEl` singleton, read by PageWindow's engulf FLIP), `InterfaceScaffold.tsx`, `Interface.css`, `InspectorPane/`, `Subfield/` (Subfield, CitationsToggle, subfieldItems, subfield.css; `crumbs.ts` minus `crumbDepthFor`), `NotificationLabel.tsx` + css, `Glance/` (the page branch of GlancePane, glance-pane.css, glanceAction.ts). `ConfirmationWindow.tsx` from `Windows/` joins them; it is a shell overlay, not a window.

**A page surface:** `PageView.tsx` (the main-pane editor mount), `pageEditor.ts` (the live editor registry the Toolbar outline drives), and `Tiles/Surfaces/PageTile.tsx` (the embed every other host renders). `pageFlush.ts` is not a page surface file; it is the store-tier autosave that PageView, PageTile, Store/navigationSlice, and Store/nexusSlice all call.

**An entity header shared across surfaces, not a page surface:** `Banner.tsx`, `DetailTitleHeader.tsx`, `AddBannerButton.tsx`, `useBannerMenu.ts`, `content-banner.css`, `content-title.css`. Importers prove the reach: `DetailTitleHeader` and `AddBannerButton` are mounted by `MarkdownPM/PageHeader.tsx`; `useBannerMenu` by NavView, PageTile's `EmbedBanner`, and `Views/CardView/CardsView`. This is `Surfaces/Header`, consumed by container, page, space, homepage, nav, card, and embed.

**A container surface:** `ContainerView.tsx` (12 lines wrapping `ViewHost` in the scaffold). `SpaceView.tsx` and `HomepageView.tsx` are not container surfaces; both are 20-line shims mounting `TileHost` and belong with the board. `NavView.tsx` + `nav-view.css` are the Navigation surface (its data and list/gallery components already live in `Navigation/`).

**Glue that belongs to other tiers:** `scope.ts` (16 importers across nine folders; pure tree lookups overlapping `renderer/treeIndex.ts`, which already holds `containersByPathOf`, `ancestryOf`, `pagesByIdOf`) → one tree index in Store/Core. `notifications.ts` is three things: the `Notification` type the store slice imports, three `notify*` posters, and `restoreView`, a view mutation that re-saves and reorders a deleted view. `restoreSnapshot.ts` is an action with one caller. `viewSettingsScope.ts` is the switch key for `Frames/SettingsMenu`. `action-band.css.ts` is segment styling with no Interface importer at all (both importers are `Tiles/Surfaces`). `subfieldStats.ts` is a document derivation built on MarkdownPM's own scanner.

**Proposed split:** `Shell/` (≈1,780 lines from this folder plus ConfirmationWindow), `Surfaces/Header/` (495), `Surfaces/Page/` (PageView + pageEditor, 280; plus PageTile 215), `Surfaces/Board/` (SpaceView, HomepageView, 46), `Surfaces/Nav/` (154), and the glue relocated as the table says.

---

### 3. Windows/

One folder is wrong because it holds three tiers under one name:

**Chassis (design-system grade):** `window-base.tsx` + `window-base.css`, `window-panel.tsx` + `window-panel.css`, `WindowActions.tsx`. `WindowBase` already has seven importers, three outside Windows (`Settings/SettingsWindow`, `Utilities/iteration-window`, `Showcase/Leaves/PanesLeaf`); `WindowPanel` is imported by Settings directly. Its own dependencies are PommoraUIX (Buttons, Glass, Symbols), Interactions (ResizeFrame, revealBar), and Animation. That is a PommoraUIX member by every measure. `WindowTabStrip.tsx` is chassis-shaped but reads `useSession((s) => s.pageWindow)` and resolves through `Navigation/navResolve`, so today it is a Windows feature component; hand it `tabs`/`activeTabId`/callbacks as props and it joins the chassis. `windowMorph.ts` reads `.page-window` out of the DOM and is called by the store; it is Windows-feature glue.

**Features on the chassis:** `PageWindow.tsx`, `NavWindow.tsx`, `PageHistoryWindow.tsx`, `WebWindow.tsx`, plus `useWindowWarm.ts` (shared by Page and Nav flavors), `page-window.css`, `nav-window.css`. `Settings/SettingsWindow.tsx` is the fifth feature window and lives in another folder for no structural reason.

**Not windows at all:** `confirmations.ts` (14 importers; an `ask*` catalog plus `confirmDelete`, the one delete route with its undo toast) is Actions-tier, and `ConfirmRequest` is a store type (`Store/chromeSlice` imports it). `ConfirmationWindow.tsx` is a shell modal presenter. `windowTabs.ts` is a pure state model the store owns; `windowCache.ts` is module state the store clears.

**WebWindow:** yes, Desktop-only. Every line of its body is the Electron guest contract: the `<webview>` element with `partition` and `allowpopups` (L135–142), the `BrowserGuest` interface (L26–31: `goBack`, `goForward`, `canGoBack`, `getURL`, `loadURL`), the `did-navigate`/`did-navigate-in-page`/`page-title-updated` events (L82–88), and `openExternal` (L125). On iOS the same intent (open a link in-app) is the Capacitor `Browser` plugin, which has no DOM body to host. The host-neutral part is the 3-line `openInAppBrowser(url)` action (L20–22) that `Actions/openWebLink` and `Actions/connectionMenu` call; that moves to `Actions/openWebLink` and dispatches through a Host seam (`host.web.open(url)`); the Electron implementation mounts WebWindow, the Capacitor one calls the plugin.

---

### 4. Properties/

**Three surfaces plus a pure layer, currently filed as two subfolders and a flat top.**

**Schema (definition editing):** `Editors/*` (seven config editors, each imported by exactly one file, `Frames/PropertyFrame.tsx`), `OptionRow`, `OptionEditPopup`, `GhostOptionChip`, `useOptionReorder`, `useStatusReorder`, `linkFormat`, and their css. 1,475 lines. Admission: "edits a property definition or its options."

**Cells and pickers (value render and value edit, shared by table, cards, page rows):** `Cell`, `LinkCell`, `OptionChip`, `checkboxLook`, `statusCycle`, `PropertyTypes` (render half) and `PropertyPicker`, `MassPropertyPicker`, `DatetimeValuePicker`, `PropertyEditor`, `filePick`, `valueClick`, `massAssign`. Admission: "renders or edits one value given a definition, with no knowledge of which surface hosts it."

**Page rows (the property surface of one page):** `usePropertyRows`, `PropertyValueEditors`, `PageProperties`, and `PagePanel` (currently L235–507 of `Windows/PageWindow.tsx`, exported to `NavWindow`). These are the two renders the Context doc names. Read side by side they are the same component: both call `usePropertyRows(page, fm, setFm)`, both render `[contextRows, schema]` groups of `[icon, label, Cell | PropertyEditor]` rows with the same `onContextMenu` → `valueMenuShared`/`rowMenu(propertyMenu)` branching, the same `Add Property` `PickerMenu` of hidden rows, the same `revealAndEdit` rAF-then-`querySelector` trick, and the same `PropertyValueEditors` tail. They differ in: page source (`shownDetail` vs a `WindowTarget` fetched through `readPageDetail`/`fetchPageDetail`), "set aside" contexts (PageProperties) vs "isAssigned" filtering (PagePanel), a `MenuTopRow` header and `Reveal` entrance (PageProperties only), and styling (vanilla-extract `page-properties.css.ts` vs `.page-window-insp-*` classes in `page-window.css`). One `PagePropertyRows({ page, variant })` under `Properties/Page` removes roughly 200 lines and one styling system.

**Pure value logic vs `shared/`:** none of these duplicate `shared/propertyValue.ts`, `shared/contextResolve.ts`, or `shared/linkValue.ts`; they layer on them and belong beside them.

- `value.ts` → `resolveFieldValue` is `decodeValue` plus the reserved-column branches (`_title`, stamps, Context patch rider) and a per-frontmatter `WeakMap` memo; `declaredType` is the schema-type switch. Zero renderer imports. Move to `shared/` beside `propertyValue.ts` (22 importers, the most-imported file in scope; Tables, Views/Pipeline, Frames all reach for it).
- `formatValue.ts` → pure Intl formatting over `shared/columnStyles` types; its only renderer import is `pad` from `PommoraUIX/Util`. Move to `shared/` with `pad`.
- `contextIdentity.ts`, `contextOptions.ts`, `resolveContext.ts` → pure maps over the tree; the one blocker is `contextIdentity.ts` L6 importing `entityIcon` from `PommoraUIX/Symbols` to fill default icon names. `DEFAULT_ENTITY_ICONS` is a kind → icon-name string table; move that table to `shared/` and all three are Core. They do not overlap `shared/contextResolve.ts` (which goes title → id on read/write); these go id → title/icon/color for display.
- `valueClick.ts`, `massAssign.ts`, `cellResolve.findOption` → pure; Core.
- `columnLabel.ts` → `RESERVED_LABEL`, `displayPropertyName`, `columnLabel` are pure; `useCapitalizeMetadata` is a store hook in the same file. Split.
- `cardValueInput.ts` → `parseEditorValue` is pure apart from `resolveTitle` (which reads `useSession.getState().tree`); the rest (`addEntriesFor`, `shownColumnsFor`, `addColumn`, `orderAddableEntries`) is the card add-menu model and imports `Frames/hiddenFrameModel`. Four of its six importers are `Views/CardView`; it belongs there.
- `linkFormat.ts` → a `PickerOption[]` adapter over `LINK_DISPLAYS`; UI, stays with Schema.

---

### 5. Tiles/

**Core vs Surfaces: separable, and already nearly so.** `Core/` (649 lines) imports only `./model`, `@shared/clamp`, `@shared/tiles` (codec's zod schema), and one constant, `HYSTERESIS`, from `Interactions/shared` (`hitTest.ts` L1). Pass hysteresis as a parameter (it already takes `bandZonePx`) and `Core/` is a Core-workspace module with 14 test importers proving it runs headless. `TileGrid.tsx` is a controlled component (`layout` in, `onLayoutChange` out, `renderTile` injected) with no knowledge of kinds, hosts, or the store; its imports are Interactions (gesture, autoscroll, shared), Animation (feel), PommoraUIX tokens, and Core. It is a layout primitive; `Showcase/TileLab` already drives it standalone. `tileKinds.tsx` is the kind → component table and `TileHost.tsx` is the binding (document hook, entry map, menus, create/remove/convert/duplicate); those, with `TileHandleMenu`, `useTileDoc`, `MarkdownTile`, `ViewTile`, are the board feature.

**Files that are not tile-engine or tile-kind:** `PageTile.tsx` has five importers and only one is Tiles; it is the page embed framework (`Surfaces/Page`). `tileCache.ts` has zero Tiles importers (both are MarkdownPM) and holds nested-embed warmth for the editor. `pageTileWrite.ts` is the debounced writer the page autosave runs on (`Interface/pageFlush` imports it from Tiles, an inverted dependency). `ViewTileScope.tsx` has 14 importers, nine of them `Frames/`; it is the view-write scope every view frame consults. `tileZoom.ts` is a `SCALE_STEPS` adapter used equally by MarkdownPM.

**WebTile in a host-neutral layout:** it is Electron end to end: `<webview partition allowpopups>` (L193–202), `capturePage()` for the parked-frame snapshot (L100–118), `getWebContentsId()` for `webGuestZoom.set` and `webGuestMedia.pause` (L139–151), and `did-fail-load`/`render-process-gone`/`did-finish-load` (L177–183). `webRetention.ts` is pure but exists only to cap live guest processes. Its single importer is a lazy `import('@renderer/Tiles/Surfaces/WebTile')` in `MarkdownPM/Editor/embedWidget.tsx` L339; that lazy import is the injection point. Define a `WebSurface` slot type in UIX (props: `url`, `label`, `visible`, `tabInactive`, `zoom`, `refocusHost`), register the implementation per host (Electron: this file; Capacitor: an `<iframe>` or a "open in browser" face), and file the Electron implementation under `Surfaces/Web/` in the Desktop workspace with `WebWindow`, the glance site branch, and the `.web-tile*`/`webview` css rules pulled out of `tile-base.css` L146–161 and `web-window.css`.

---

### 6. Host-Bound Inventory

Every site in scope a Capacitor host could not reuse unchanged. Bridge data channels (`tiles.*`, `folds`, `embedHeights`, `glance.load/save`, `updatePageBody`, `listHistory`, `views.*`, `deleteFacts`, `renameNexus`) are excluded; they are IPC a Capacitor bridge reimplements behind the same `window.nexus` surface.

**`<webview>` element and guest API (WKWebView has no guest element):**

- `Tiles/Surfaces/WebTile.tsx` L193–202 (`<webview src partition allowpopups>`), L19–20 and L100–118 (`capturePage`), L139–151 (`getWebContentsId` → `window.nexus.webGuestZoom.set`, `webGuestMedia.pause`), L177–183 (`did-fail-load`, `render-process-gone`, `did-finish-load`).
- `Windows/WebWindow.tsx` L26–31 (`BrowserGuest`: `goBack`, `goForward`, `canGoBack`, `canGoForward`, `getURL`, `loadURL`), L66, L80–88 (`page-title-updated`, `did-navigate`, `did-navigate-in-page`), L108, L116, L135–142 (`<webview>`).
- `Interface/Glance/GlancePane.tsx` L108 (`ScrollableGuest`), L121–122 (`getWebContentsId` → `window.nexus.wheelGuest`), L267–273 (guest events), L412–416 (`<webview partition>`).
- CSS: `Tiles/tile-base.css` L147, L155, L161 (`webview` selectors); `Windows/web-window.css` L8; `Interface/Glance/glance-pane.css` `.glance-web` block.
- `shared/types.ts` L245 `WEB_PARTITION = 'persist:pommora-web'` (an Electron session partition name).

**Native OS menus (a `Menu.popup` round-trip returning an action; iOS has none):**

- `Properties/PageProperties.tsx` L120 `propertyMenu`; `Windows/PageWindow.tsx` L337 `propertyMenu`.
- `Properties/Editors/OptionEditor.tsx` L92 and `StatusEditor.tsx` L84 `optionMenu`.
- `Properties/Assignment/filePick.ts` L148 `cellMenu`.
- `Tiles/Surfaces/ViewTile.tsx` L359 `viewEmbedTitleMenu`, L373 `viewEmbedAreaMenu`, L387 `viewRowMenu`.
- `Tiles/TileHost.tsx` L213 `useNativeMenus()`, L355 `popRowMenu(items, el)` (the tile handle menu's native path; the in-DOM `TileHandleMenu` is the other branch, and it is the one existing precedent for a per-host presenter).
- `Interface/Banner.tsx` L39, L84 `titleMenu`; `Interface/useBannerMenu.ts` L60 `bannerMenu`.
- `Windows/PageHistoryWindow.tsx` L121 `historyMenu`.

**Native dialogs and shell:**

- `Properties/Assignment/filePick.ts` L49 `pickFile` (file chooser), L60 `adoptFile` (copy into the Nexus; bridge-able but the source path comes from the chooser).
- `Interface/useBannerMenu.ts` L50 `pickFile`.
- `Interface/Banner.tsx` L49, `Windows/PageHistoryWindow.tsx` L57, L105, L116 `showError` (`dialog.showMessageBox`).
- `Windows/WebWindow.tsx` L125 `openExternal` (`shell.openExternal`; Capacitor `Browser.open` is the analogue, so this one is a bridge rename rather than a rewrite).

**Frameless-window drag regions (no meaning in WKWebView):**

- `Interface/Subfield/subfield.css` L11, L55; `Interface/content-banner.css` L124; `Interface/InspectorPane/inspector-pane.css` L14 (`-webkit-app-region: no-drag`).

**`capture:thumbnail`:** not in scope. Its only renderer binding is `preload/index.ts` L119 (`capture.thumbnail`), consumed by `Navigation/useNavThumbnails`.

**WebKit compatibility watch (not host-bound, but renders differently in WKWebView until verified):** `Tiles/tile-base.css` L66, L102, L116 (`timeline-scope`, `animation-timeline`: scroll-driven animations), `Windows/window-base.css` L149 (`@starting-style`), `Properties/Editors/number-editor.css.ts` L33 (`fieldSizing: 'content'`), `Tiles/tile-base.css` L127 (`-webkit-user-drag`, fine on WebKit).

---

### 7. Folder Verdicts

**Interface/: dissolve.** No admission rule survives contact with its contents (a router, a toast, a tree index, a view mutation, and a segment stylesheet). Its files go to `Shell/`, `Surfaces/Header`, `Surfaces/Page`, `Surfaces/Board`, `Surfaces/Nav`, `Store/`, `Actions/`, `PommoraUIX/`, and `MarkdownPM/` as tabled.

**Windows/: split three ways.** Chassis → `PommoraUIX/Window/` (admission: "renders a floating window's frame, panel, or toolbar cluster and knows nothing about what it hosts"). Feature windows stay as `Windows/` (admission: "a component that mounts `WindowBase` and is toggled from the store"; SettingsWindow joins). `confirmations.ts` → `Actions/`, `ConfirmationWindow` → `Shell/`, `windowTabs`/`windowCache` → `Store/`, `WebWindow` → Desktop `Surfaces/Web`.

**Tiles/: split.** `Core/` → Core workspace `TileLayout/` (admission: "a pure function over `TileLayout`"). `TileGrid` + `tile-grid.css` → `PommoraUIX/TileGrid/` (admission: "gesture and geometry with an injected `renderTile`; no kinds, no store"). `tile-base.css`, `tile-title.css`, `tileZoom.ts` → `PommoraUIX/Tile/` (the chassis every embed host keys onto). `TileHost`, `TileHandleMenu`, `tileKinds`, `useTileDoc`, `MarkdownTile`, `ViewTile`, `SpaceView`, `HomepageView` → `Surfaces/Board/` (admission: "reads or writes a host's `_tiles.json` document, or is a kind that document names"). `PageTile` → `Surfaces/Page/`. `WebTile` + `webRetention` → Desktop `Surfaces/Web/`. `tileCache` → `MarkdownPM/Editor`. `pageTileWrite` → `Store/bodyWriter`. `ViewTileScope` → `Views/`.

**Properties/: keep, re-nest.** The name is right; the subfolders are wrong (`Assignment/` mixes cells, pickers, page rows, and pure logic; `Editors/` is really Schema). New shape: `Properties/Value/` (what stays in UIX of the pure layer after the Core moves: `parseEditorValue`, `useCapitalizeMetadata`), `Properties/Cells/`, `Properties/Pickers/`, `Properties/Page/`, `Properties/Schema/`. Admission for the folder: "renders, edits, or configures a property, independent of which view or window hosts it." `valueUndo.ts` and the card half of `cardValueInput.ts` fail that rule and leave.

#### Proposed Tree for This Scope

Line counts are non-test estimates after the moves and the PagePanel merge.

```
Core/
  TileLayout/            model, ops, rects, edges, hitTest, snap, codec        649
  Properties/            fieldValue (value.ts), format (formatValue.ts),
                         contextIdentity, contextOptions, resolveContext,
                         valueClick, massAssign, findOption, columnLabel (pure),
                         parseEditorValue, PROPERTY_TYPES table              ~660

UIX/
  PommoraUIX/
    Window/              WindowBase(+css), WindowPanel(+css), WindowActions    677
    TileGrid/            TileGrid, tile-grid.css                               708
    Tile/                tile-base.css (minus web rules), tile-title.css,
                         tileZoom                                            ~230
    Elements/ActionBand/ action-band.css.ts                                    122
  Store/
    treeIndex            (+ scope.ts merged)                                  ~123
    windowTabs, windowCache, pageSave (pageFlush), bodyWriter (pageTileWrite),
    crumbDepthFor, Notification + ConfirmRequest types                        ~230
  Actions/
    confirm (confirmations.ts), restoreSnapshot, notify, openWebLink
    (+ openInAppBrowser), filePick (through Host)                             ~340
  Host/
    menus (useNativeMenus, popRowMenu + DOM presenter fallback),
    dialogs (pickFile, showError), web (WebSurface slot, open)                 new, ~120
  Shell/
    ContentView, InterfaceScaffold, Interface.css                              354
    Inspector/                                                                  46
    Subfield/            Subfield, CitationsToggle, subfieldItems, crumbs, css  ~370
    Notifications/       NotificationLabel + css                               185
    Confirm/             ConfirmationWindow + css                              153
    Glance/              GlancePane (page branch), glanceAction, css           ~530
  Surfaces/
    Header/              Banner, DetailTitleHeader, AddBannerButton,
                         useBannerMenu, content-banner.css, content-title.css  495
    Page/                PageView, pageEditor, PageTile                        495
    Container/           ContainerView (+ Views, Tables, Cards, Frames)          12 (+13,088)
    Board/               SpaceView, HomepageView, TileHost, TileHandleMenu,
                         useTileDoc, tileKinds, MarkdownTile, ViewTile, css   1,932
    Nav/                 NavView, nav-view.css (+ Navigation/)                  154 (+872)
  Properties/
    Cells/               Cell, LinkCell, OptionChip, checkboxLook, statusCycle,
                         PropertyTypeIcon                                     ~500
    Pickers/             PropertyPicker, MassPropertyPicker, DatetimeValuePicker,
                         PropertyEditor                                        335
    Page/                usePropertyRows, PropertyValueEditors,
                         PagePropertyRows (merged), css                       ~660
    Schema/              7 editors, OptionRow, OptionEditPopup, GhostOptionChip,
                         useOptionReorder, useStatusReorder, linkFormat, css  1,475
  Windows/
    PageWindow (minus PagePanel), NavWindow, PageHistoryWindow, WindowTabStrip,
    useWindowWarm, windowMorph, css                                          ~1,170
  MarkdownPM/            (+ tileCache, subfieldStats)                          +160
  Views/                 (+ ViewTileScope, cardValueInput card half, valueUndo,
                          groupLabel/buildSet*, restoreView, viewSettingsScope → Frames) +275

Desktop/
  Surfaces/Web/          WebTile, webRetention, WebWindow, web-window.css,
                         glance site branch, .web-tile css                    ~530
```

#### Collapsing the Renderer's Folders to Ten

From this vantage the 23 directories under `renderer/` (Actions, Animation, Assets, Cards, PommoraUIX, Frames, Interactions, Interface, MarkdownPM, Navigation, Properties, Settings, Showcase, Sidebar, Store, Tables, Tabs, Testing, Tiles, Toolbar, Utilities, Views, Windows) become:

1. **`PommoraUIX/`** absorbs `Animation/`, `Interactions/`, `Utilities/EntityIcon`, `Assets/AssetImage`, `Tabs/tab-base.css`, the Windows chassis, TileGrid, the tile chassis css, and action-band. Admission: no store, no bridge, no entity knowledge.
2. **`Store/`** absorbs `treeIndex.ts`, `Interface/scope.ts`, `Windows/windowTabs|windowCache`, `Interface/pageFlush` + `Tiles/pageTileWrite`, `Assets/assetUrl` resolution, and the `Notification`/`ConfirmRequest` types. Admission: state, caches, and pure derivations over state.
3. **`Actions/`** absorbs `Windows/confirmations`, `Interface/restoreSnapshot`, the `notify*` posters, `restoreView`. Admission: an imperative verb a surface calls; no JSX.
4. **`Host/`** (new) holds the host seam: native-menu presenter with the DOM fallback (`TileHandleMenu` is the model), dialogs, the web-surface slot. Desktop and Mobile each implement it in their workspace.
5. **`Shell/`** absorbs `App.tsx`, `Sidebar/`, `Toolbar/`, `Tabs/TabBar`, and the shell tier of `Interface/` and `Windows/` above. Admission: mounted once, selection-agnostic chrome.
6. **`Surfaces/`** holds `Header/`, `Page/`, `Container/` (absorbing `Views/`, `Tables/`, `Cards/`, `Frames/`), `Board/`, `Nav/` (absorbing `Navigation/`), and the UIX side of `Web/`. Admission: what the main pane or an embed shows for one selection kind.
7. **`Properties/`** re-nested as above.
8. **`Windows/`** the feature windows, absorbing `Settings/SettingsWindow` (and `Settings/` generally, since IconPicker and TrashFrame are settings-window leaves).
9. **`MarkdownPM/`** unchanged, plus `tileCache` and `subfieldStats`.
10. **`Dev/`** for `Showcase/`, `Testing/`, `Utilities/iteration-window`; not product code.

`Cards/` (two files) and `Tables/` are view-type internals and dissolve into `Surfaces/Container/`. `Assets/` splits between PommoraUIX (the image component) and Store (URL resolution).

---

### 8. Files Owned by the Wrong Scope Entirely

- **Core workspace, not renderer:** `Tiles/Core/*` (649 lines, pure, one constant to parameterize); `Properties/value.ts`, `formatValue.ts`, `contextIdentity.ts`, `contextOptions.ts`, `resolveContext.ts`, `valueClick.ts`, `massAssign.ts`, `cellResolve.findOption`, the pure half of `columnLabel.ts`, `PropertyTypes.PROPERTY_TYPES`, `tileZoom.ts` (once `DEFAULT_ENTITY_ICONS` and `pad` move with them).
- **Desktop workspace, not UIX:** `Tiles/Surfaces/WebTile.tsx`, `webRetention.ts`, `Windows/WebWindow.tsx`, `web-window.css`, the site branch of `Interface/Glance/GlancePane.tsx` (L108–122, L267–273, L412–430), `tile-base.css` L146–161, `glance-pane.css` `.glance-web*`, `shared/types.ts` `WEB_PARTITION`.
- **MarkdownPM, not Tiles or Interface:** `Tiles/tileCache.ts` (both importers are MarkdownPM), `Interface/Subfield/subfieldStats.ts` (built on `MarkdownPM/Editor/docCache` and `Detect`).
- **Views, not Tiles or Properties:** `Tiles/ViewTileScope.tsx` (9 of 14 importers are `Frames/`), `Properties/Assignment/valueUndo.ts` (one importer, `Views/TableView`), the card half of `Properties/Assignment/cardValueInput.ts` (imports `Frames/hiddenFrameModel`; four of six importers are `Views/CardView`), `cellResolve.groupLabel/buildSetNames/Icons/Paths`, `Interface/notifications.restoreView`, `Interface/viewSettingsScope.ts` (beside `Frames/SettingsMenu`).
- **Store, not Interface or Windows:** `Interface/scope.ts`, `Interface/pageFlush.ts`, `Tiles/pageTileWrite.ts`, `Windows/windowTabs.ts`, `Windows/windowCache.ts`, `Subfield/crumbs.crumbDepthFor`, the `Notification` and `ConfirmRequest` types.
- **Actions, not Windows or Interface:** `Windows/confirmations.ts`, `Interface/restoreSnapshot.ts`, `Interface/notifications.notify*`, `WebWindow.openInAppBrowser`.
- **PommoraUIX, not Interface or Windows or Tiles:** `Interface/action-band.css.ts`, `Windows/window-base.*`, `window-panel.*`, `WindowActions.tsx`, `Tiles/TileGrid.tsx` + `tile-grid.css`, `tile-base.css` (chassis half), `tile-title.css`.
- **Properties/Page, not Windows:** `PagePanel` inside `Windows/PageWindow.tsx` L235–507.
- **Surfaces/Page, not Tiles:** `Tiles/Surfaces/PageTile.tsx`.

---

### Summary

The four folders hold 13,786 non-test lines filed by birth order, not by role. `Interface/` is a grab bag with no admission rule and dissolves into Shell (router, inspector, subfield, toast, glance), a cross-surface Header, Page/Board/Nav surfaces, and store, action, and design-system glue. `Windows/` mixes a design-system-grade chassis (`WindowBase`, already reused by Settings, Utilities, Showcase) with four feature windows and three non-window files; `WebWindow` is Electron end to end and belongs in a Desktop `Surfaces/Web` behind a Host seam with `WebTile` and the glance site branch. `Tiles/Core` is pure (one constant to parameterize) and is Core-workspace material; `TileGrid` is a generic layout primitive; `PageTile`, `tileCache`, `pageTileWrite`, and `ViewTileScope` are misfiled by their importers. `Properties/` keeps its name and re-nests into Value, Cells, Pickers, Page, Schema; its pure layer (`value.ts`, `formatValue.ts`, the context identity trio) belongs beside `shared/propertyValue.ts` with no duplication, and `PageProperties` plus `PagePanel` merge into one page-rows component. Every host-bound site is quoted by file and line; the tile handle menu's native-or-DOM branch is the existing presenter precedent.
