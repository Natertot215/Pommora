## A05: The Native Menu Subsystem as a Layer

Scope: `Pommora/src/{shared,main,preload,renderer}`, read-only, judged by what the code does. All paths below are relative to `Pommora/src/`.

#### 1. Inventory

Twenty-eight menus in the native family: 26 reached through a bridge channel, plus the editor context menu (a `webContents` event) and the app menu bar (`setApplicationMenu`). Every `Menu.buildFromTemplate(...).popup(...)` in main is accounted for: `returningMenu.ts:29` (every returning menu), `contextMenu.ts:154,199`, `editorMenu.ts:225`, and `menu.ts:162` for the bar.

| # | Menu | Shared model (lines) | Main popper (lines) | Channel | Renderer call site(s) | Rows | Plain list, or what's special |
|---|---|---|---|---|---|---|---|
| 1 | File-history row | `shared/fileHistoryMenu.ts` (13) | inline `main/index.ts:1628-1632` via `popModelMenu` | `history:menu` | `renderer/Windows/PageHistoryWindow.tsx:121` | 1-2 | plain; separator |
| 2 | Trash row | `shared/trashMenu.ts:8-33` (types + labels, no model fn) | `main/trashMenu.ts:15-43` | `trash:menu` | `renderer/Settings/TrashFrame.tsx:176` | 2 + destination tree | hand-built; nested submenu via `destinationNodes`; `enabled` gate; object-shaped action `{kind, destination}` |
| 3 | Trash date column | `shared/trashMenu.ts:37-49` | `main/trashMenu.ts:48-64` | `trash:columnMenu` | `TrashFrame.tsx:153` | 2 (Format ▸ 2 radios) | hand-built; radio submenu; dynamic label; object action |
| 4 | Sidebar / band entity | none of its own: `ContextTarget` at `shared/mutate.ts:124-138`; page branch reuses `shared/pageMenu.ts` | `main/contextMenu.ts` (201) | `context-menu` (kind `window`, reply `void`) | `renderer/Sidebar/Sidebar.tsx:60,707`; `renderer/Views/ViewGroupBand.tsx:61` | page ≤12; container 3-6 | acts in main (`handleMutate`, registry read for creators, error dialog), then fires 7 push channels back; non-returning; Move To ▸ tree; dynamic labels |
| 5 | Create ("New …") | `Creator` at `shared/mutate.ts:140-143` | inline `main/index.ts:1668-1674` | `create-menu` | `renderer/Store/navigationSlice.ts:694` (`createFromMenu`) | n | hand-built; returns a `MutateRequest` object rather than a string |
| 6 | View button | `shared/viewMenus.ts:85-94` | `main/viewButtonMenu.ts` (13) → `popModelMenu` | `view-button-menu` | `renderer/Toolbar/ViewMenu.tsx:36` | 1 | plain; dynamic label |
| 7 | Saved-view row | `shared/viewRowMenu.ts` (29) | `main/viewRowMenu.ts` (11) → `popModelMenu` | `view-row-menu` | `renderer/Toolbar/ViewFrame.tsx:107`; `renderer/Tiles/Surfaces/ViewTile.tsx:387` | 4-5 | plain; `disabled`; separator; dynamic label |
| 8 | Embed title row | `shared/viewMenus.ts:47-67` | `main/viewEmbedMenu.ts:13-19` → `popModelMenu` | `view-embed-title-menu` | `ViewTile.tsx:359` | 3-4 + Title Size ▸ 6 | model-carried submenu + `checked` |
| 9 | Embed switcher area | `shared/viewMenus.ts:73-82` | `main/viewEmbedMenu.ts:21-26` → `popModelMenu` | `view-embed-area-menu` | `ViewTile.tsx:373` | 2-3 + Style ▸ 2 | model-carried submenu + `checked` |
| 10 | Icon favorite | `shared/identityMenus.ts:11` (type only) | `main/iconFavoriteMenu.ts` (14) | `icon-favorite-menu` | `renderer/Settings/iconFavorites.ts:15` → IconPicker | 1 | hand-built; dynamic label |
| 11 | Nexus icon | `shared/identityMenus.ts:5` (type only) | inline `main/index.ts:1780-1792` | `nexus:iconMenu` | `renderer/Utilities/useNexusIcon.ts:17` | 2-5 | hand-built; gated rows; separator; dynamic label |
| 12 | Banner | `shared/identityMenus.ts:9` (type only) | inline `main/index.ts:1819-1834` | `nexus:bannerMenu` | `renderer/Interface/useBannerMenu.ts:60` (Banner, CardsView, PageHeader) | 1-3 | hand-built; dynamic noun |
| 13 | Title / heading | `shared/identityMenus.ts:7` (type only) | inline `main/index.ts:1839-1853` | `nexus:titleMenu` | `renderer/Interface/Banner.tsx:39,84`; `renderer/MarkdownPM/PageHeader.tsx:63`; `renderer/Toolbar/SpaceMenu.tsx:54` (three via `DetailTitleHeader.requestMenu`) | 1-3 | hand-built; dynamic label |
| 14 | Markdown table grip | `shared/tableMenu.ts` (92) | `main/tableMenu.ts` (11) → `popModelMenu` | `table-menu` | `renderer/MarkdownPM/Tables/widget.tsx:252` | 5-8 + Align ▸ 3 | model-carried submenu + `checked`; separators |
| 15 | Block grip / heading chevron | `shared/gripMenu.ts` (57; types + `HEADING_LEVELS`, `LIST_KIND_LABELS`; no model fn) | `main/gripMenu.ts` (92) | `grip-menu` | `renderer/MarkdownPM/Editor/gripMenu.ts:110,174` | 1-4 + Source tree ▸ / Scale ▸ radios / Type ▸ / Size ▸ | hand-built; recursive tree submenu; radios; object action `{action, level|factor|kind|title}` |
| 16 | View column header | `shared/columnMenu.ts` (123; own `StyleMenuItem` row shape) | `main/columnMenu.ts` (36) + `main/styleMenu.ts` (32) | `column-menu` | `renderer/Views/TableView/TableView.tsx:501` | 2-4 + Align ▸ 3 radios + Style ▸ n radios | hand-built; radio submenus with separator-scoped groups; checkbox row |
| 17 | Cell | `shared/cellMenu.ts` (180) | `main/cellMenu.ts` (23) + `styleMenu.ts` | `cell-menu` | `TableView.tsx:855`; `renderer/Views/CardView/CardValue.tsx:147`; `renderer/Properties/Assignment/filePick.ts:148` | 1-12 | model `items` via `rowTemplate`; `style` submenu hand-mapped to radios; Move To ▸ |
| 18 | Page actions subset | `shared/pageMenu.ts` (161, shared by 4, 17, 19, 20, 21, 22) | `main/pageActionsMenu.ts` (13) → `popModelMenu` | `page-actions-menu` | `renderer/Frames/PageMenu.tsx:37` | 4 | plain |
| 19 | Card | `shared/cardMenu.ts` (47) | `main/cardMenu.ts` (25) | `card-menu` | `renderer/Views/CardView/CardsView.tsx:1061` | 8-10 + Add Property ▸ n + Move To ▸ | model `items` via `rowTemplate`; `addProperty` submenu hand-built |
| 20 | Tab | `shared/tabMenu.ts` (16, types only) | `main/tabMenu.ts` (30) | `tab-menu` | `renderer/Tabs/TabBar.tsx:149` | 1-7 | hand-built rows + `rowTemplate(pageMetaMenuSubset(...))` for the send block; dynamic label |
| 21 | Nav row / card | `shared/navRowMenu.ts` (26, types only) | `main/navRowMenu.ts` (41) | `nav-row-menu` | `renderer/Navigation/NavList.tsx:45` | 4-9 | hand-built rows + `rowTemplate` send block; three dynamic labels |
| 22 | Link (connection / URL) | `shared/connMenu.ts` (137) | `main/connMenu.ts` (12) → `popModelMenu` | `conn-menu` | `renderer/Actions/connectionMenu.ts:36,63` (`showConnectionMenu`, popped from editor, cells, card values, inspectors) | 2-9 + Format ▸ 3 | model-carried submenu; separators |
| 23 | Footnote | `shared/citationMenu.ts` (33) | `main/citationMenu.ts` (16) → `popModelMenu` | `citation-menu` | `renderer/MarkdownPM/Editor/citationPointer.ts:122,183` | 1-3 | plain |
| 24 | Property | `shared/propertyMenu.ts` (46) | `main/propertyMenu.ts` (19) → `rowTemplate` | `property-menu` | `renderer/Frames/PropertyFrame.tsx:354,364`; `renderer/Properties/PageProperties.tsx:120`; `renderer/Windows/PageWindow.tsx:337` | 1-2 | plain |
| 25 | Option chip | `shared/optionMenu.ts` (29) | `main/optionMenu.ts` (23) | `option-menu` | `renderer/Properties/Editors/OptionEditor.tsx:92`; `StatusEditor.tsx:84` | 3-4 | model rows hand-mapped; separator synthesized from `confirm` |
| 26 | Generic row menu | `shared/menuModel.ts` (42); `shared/tileMenu.ts` (109) as one feeder | `main/rowMenu.ts:88-94` (`popRowMenu`) | `row-menu` | `renderer/Actions/nativeMenus.ts:20` ← `renderer/PommoraUIX/Elements/PickerControl.tsx:65` (14 pickers), `renderer/Tiles/TileHost.tsx:355` | n | generic: anchor rect, `checked`, `disabled`, `submenu`, `separatorBefore` |
| 27 | Editor context menu | `shared/editorMenu.ts` (63), `shared/pasteAsMenu.ts` (134; ~40 are the rows fn), `HEADING_LEVELS` | `main/editorMenu.ts` (227) | none: `webContents.on('context-menu')` at `editorMenu.ts:218`; state via Tells `editor:format-state` / `editor:grip-hot`; picks via Push `menu:action` | `renderer/MarkdownPM/Editor/menu.ts:30-31`, `formatState.ts` (50), `formatKeymap.ts` (18) | ~10 top + Insert 5-6 / Format 7 / Embed 2 / Heading 6 / Lists 3 / Paste As n, plus OS roles, spelling, Speech, Share | not a list: OS roles and spellcheck (`editorMenu.ts:41-81`), clipboard read at pop time (`:199-204`), display accelerators (`:142-151`), pushed format state, fire-and-forget dispatch |
| 28 | App menu bar | none | `main/menu.ts` (163) | none: `Menu.setApplicationMenu`; picks via Push `menu:action` | `renderer/App.tsx:143` | appMenu, File 8, Edit 10, View 7, windowMenu, help | not a list: accelerators, roles, Open Recent submenu, rebuilt on session change |

**Line totals across the layers (excluding the per-surface action switches at the 37 call sites, which any mechanism keeps):**

| Layer | Files | Lines |
|---|---|---|
| Shared models + `menuModel.ts` + `toggleLabels.ts` (non-test) | 22 | 1,524 |
| Main poppers + `returningMenu.ts` + `rowMenu.ts` + `styleMenu.ts` + `contextMenu.ts` + `editorMenu.ts` + `menu.ts` | 23 | 1,246 |
| Inline menu handlers and their imports in `main/index.ts` | (1) | ~195 |
| Bridge declarations + imports in `shared/bridge.ts`; preload dialers in `preload/index.ts` | (2) | ~83 + 28 |
| Renderer adapters: `Actions/nativeMenus.ts` 24, `Actions/connectionMenu.ts` 129, `Actions/pageMenuActions.ts` 44; editor half `MarkdownPM/Editor/menu.ts` 110 + `formatState.ts` 50; grip half `MarkdownPM/Editor/gripMenu.ts` 226 | 6 | 583 |
| Subtotal, mechanism | | ~3,660 |
| Tests: 14 shared model tests 1,138; `main/rowMenu.test.ts` 96; renderer `gripMenu.test` 68, `gripMenuFlow.test` 281, `navRowMenu.test` 68, `menuSubject.test` 95, `useBannerMenu.test` 132 | 20 | 1,878 |
| Total | | ~5,540 |

`kind: 'menu'` handlers in `main/index.ts`: 26 (`rg -c`), which includes `nexus:pickFile` (a file dialog, not a menu) and excludes `context-menu` (kind `window`). Menu channels proper: 26. Per-surface menu channels beside `row-menu` and `context-menu`: 24.

#### 2. The Generalization That Exists

The generic chassis is complete for a plain list: `shared/menuModel.ts:8-25` states the row (`label`, `action`, `separatorBefore`, `disabled`, `confirm`, `checked`, `submenu`), `:30-35` the anchor rect, `:39-42` the `RowMenuRequest`. `main/rowMenu.ts` converts rows to a native template (`nativeRow` `:28-40`, `rowTemplate` `:48-68`, `menuTemplate` `:72-78`), converts renderer CSS pixels to window DIPs once (`anchorPoint` `:13-23`), and pops either a typed model (`popModelMenu` `:81-86`) or the wire request (`popRowMenu` `:88-94`). `main/returningMenu.ts:10-37` is the pop-and-resolve primitive under all of it, and `:42-60` (`destinationNodes`) the one nesting builder for a Move To / Restore tree. `main/rowMenu.test.ts` covers the anchor math, separators, checkboxes, submenus, and disabled rows.

**Menus on the generic path (11 channels):** `history:menu`, `view-button-menu`, `view-row-menu`, `view-embed-title-menu`, `view-embed-area-menu`, `table-menu`, `page-actions-menu`, `conn-menu`, `citation-menu` (all `popModelMenu`), `property-menu` (`popReturningMenu(rowTemplate(...))`, `main/propertyMenu.ts:16-18`), and `row-menu` itself. Each still owns a channel, a preload dialer, a `kind: 'menu'` handler, and a 11-16 line popper file whose whole body is one `popModelMenu(win, xItems(ctx))` line, so "generic path" today means the template is shared while the plumbing is still per-surface.

**Hybrids (3):** `card-menu` builds its `addProperty` submenu by hand (`main/cardMenu.ts:15-20`) although the model's `submenu` field exists; the model returns it as a sibling array (`shared/cardMenu.ts:26-30`). No visible reason. `cell-menu` carries a `style` block of `StyleMenuItem` rows (`shared/cellMenu.ts:49-54`) that `main/styleMenu.ts:24-32` maps to radios; the action is already composed as `style:${key}:${value}` (`:30`), so an `ActionItem` with that `action` and `checked` would carry the same row. Visible reason: `styleMenu.ts:21-23` states Electron scopes radio groups per separator run, and `nativeRow` emits `checkbox` for `checked` (`rowMenu.ts:35`). Radio versus checkbox is the whole difference. `option-menu` iterates the `ActionItem[]` by hand and inserts a separator before the first `confirm: true` row (`main/optionMenu.ts:14-20`). No visible reason not to use `menuTemplate` with `separatorBefore`.

**Bespoke templates despite being lists (12):**

| Menu | Hand-built at | Visible reason for not being a model |
|---|---|---|
| Tab | `main/tabMenu.ts:11-29` | none; `shared/tabMenu.ts:1-3` only describes it as native; the send block already goes through `rowTemplate` |
| Nav row | `main/navRowMenu.ts:14-40` | none; same shape as Tab |
| Nexus icon, Banner, Title | inline `main/index.ts:1780-1792`, `:1819-1834`, `:1839-1853` | none; `shared/identityMenus.ts:1-3` holds only the action unions |
| Icon favorite | `main/iconFavoriteMenu.ts:11-13` | none |
| Create | `main/index.ts:1668-1674` | reply is a `MutateRequest` object, not a string; an index into `Creator[]` resolves it (the mobile plan does exactly this: `Planning/Mobile ... Implementation Plan.md:1849` "create:<i> → mutate creators[i].req") |
| Block grip | `main/gripMenu.ts:18-91` | object-shaped actions and radio submenus; `shared/tileMenu.ts:25-26` already shows the flattening ("Rows name an index into this list because a menu row can't carry a view pick's three fields") |
| Column header | `main/columnMenu.ts:15-35` | radios (`styleMenu.ts:21-23`), otherwise none |
| Trash row | `main/trashMenu.ts:15-43` | `:12-14` "Uses the nesting primitive, since the flat model helper can't express a submenu" — stale: `ActionItem.submenu` exists (`menuModel.ts:24`) and `rowTemplate` nests (`rowMenu.ts:38`); the remaining difference is the object action |
| Trash column | `main/trashMenu.ts:48-64` | radios + object action; otherwise none |
| Sidebar entity (containers) | `main/contextMenu.ts:161-194` | the one architectural reason: the picks run in main (`:68-81` `handleMutate` + dialog; `:95-132` pushes) and the channel returns `void`; the page branch already draws from `pageMetaMenuItems` (`:138-152`). The renderer already owns every action it pushes to (`beginRename`, `confirmDelete`, `select`, `openWindow`, `openHistory`), which is what `pageMenuActions.ts:23-44` and the surface switches do for the other five page menus |

**Two defects in the existing generalization worth naming:**

- `ActionItem.confirm` (`menuModel.ts:16-18`: "Whoever pops the menu owns the dialog") is ignored by `nativeRow` and read by exactly one popper as a separator marker (`main/optionMenu.ts:15`); the renderer asks anyway (`OptionEditor.tsx:95-99`). That is a dead semantic and a second definition of "separator".
- `shared/tileMenu.ts:2` says the in-app pane and the native menu both draw from the model, but `renderer/Tiles/TileHandleMenu.tsx:169,208-262` re-derives its rows from `entry`/`pageItems`/`viewItems` props and never imports `tileMenuModel`; only the native path (`TileHost.tsx:346-355`) consumes it.

The mobile plan's counts differ from the code: it names "nine main-assembled menu templates" and "22 per-surface menu channels" (`Implementation Plan.md:2042`); the code has 12 hand-assembled plus 3 partial, and 24 per-surface channels beside `row-menu` and `context-menu`.

#### 3. The In-App Equivalent

`renderer/PommoraUIX/Menus/menu-index.tsx:25-44` already renders a row list from a model: `MenuRow` is a union of `heading | separator | caption | action | item`, `MenuIndex({ sections })` (`:131-149`) and `MenuRowView({ row })` (`:81-90`) draw it, and `Frames/*`, `Properties/Editors/*`, and `Settings/*` feed it. The shape is React-flavored (`ReactNode` labels, `onClick`/`onSelect` closures, a `Trailing` union of switch / slider / picker / color / field at `:12-23`), not `ActionItem`; nothing in `renderer/` consumes `ActionItem` except `Actions/nativeMenus.ts:4,16`.

The popup shell exists: `renderer/PommoraUIX/Pickers/picker-base.tsx:59-100` (`PickerMenu`) takes `triggerRef` or `anchorX`/`anchorY`, an `origin`, `modal` dismissal, header/footer, and `maxHeight`. Submenu drilling exists once, hand-rolled: `TileHandleMenu.tsx:41-114` (`DrillLevel`) recurses with `FrameSlide` and a `MenuTopRow` back header, which is the in-app reading of `destinationNodes`.

Two surfaces already switch between the two renderers on the device preference (`Actions/nativeMenus.ts:8-10`, default `false`): `PickerControl.tsx:53-73` (native: options mapped to `ActionItem` rows with `checked`; in-app: `PickerMenu` + `PickerRow`) and `TileHost.tsx:213-221,342-371` (native: `tileMenuModel` → `popRowMenu`; in-app: the 324-line `TileHandleMenu`). So the desktop's default for the only two dual-path menus is already in-app; the other 24 channel menus have no in-app path at all, which is why the mobile plan has them answer `null` (`Decision Log.md:71` D-1) and why every right-click surface is menu-less on the phone until this generalizes.

**Could one `RowMenuRequest` feed both?** Yes; the model side is done. What's missing, in order of size:

1. **An `ActionItem` → `MenuRow` adapter** (~40 lines): `label`, `disabled`, `separatorBefore` → a `separator` row, `checked` → `selected` or a trailing check glyph, `submenu` → a chevron trailing plus the `DrillLevel` slide. `MenuIndex` has no nesting today.
2. **An imperative, promise-returning host** (~60 lines): every in-app menu is declarative component state; the one imperative precedent is `askConfirm` (`renderer/Store/chromeSlice.ts:32,138`, consumed by `renderer/Windows/confirmations.ts:14`), a store-held request that a mounted dialog resolves. `presentRowMenu(items, anchor | point): Promise<string | null>` is the same pattern over `PickerMenu`. The mobile plan already names it (`Implementation Plan.md:1897`).
3. **A point anchor:** `MenuAnchor` is a trigger rect (`menuModel.ts:30-35`); a right-click or long press needs `{x, y}`. `PickerMenu` accepts `anchorX`/`anchorY` already.
4. **A `radio` reading of `checked`** if the desktop is to keep the column/grip/trash radio glyphs: one line in `nativeRow` (`rowMenu.ts:35`) keyed on an optional field, or a convention that a `checked`-bearing group is radio.
5. **Icons:** in-app panes draw leading glyphs (`TileHandleMenu.tsx:215,225,233,251,258`); `ActionItem` has none and `rowMenu.ts:27` says the OS ignores them. An optional `icon?: IconName` the native path drops would let one model serve both without the phone losing glyphs, or generic menus stay iconless.
6. **Exhaustive typing at call sites:** `row-menu` answers `string | null` (`bridge.ts:358`). A renderer-side `popRowMenu<A extends string>(items: ActionItem<A>[]) : Promise<A | null>` keeps each surface's action union without touching the wire.

#### 4. Collapse Estimate

If every list menu ran through one model type, one channel (`row-menu`), one native popper, and one in-app pane:

**Disappears:**

| What | Files | Lines |
|---|---|---|
| Main poppers: card, cell, citation, column, conn, grip, iconFavorite, navRow, option, pageActions, property, tab, table, trash, viewButton, viewEmbed, viewRow, styleMenu | 18 | 501 |
| Inline handlers + imports in `main/index.ts` (history, create, iconMenu, bannerMenu, titleMenu, view ×4, iconFavorite, trash ×2, tab, nav, the one-liners) | 0 | ~195 |
| `main/contextMenu.ts` (rows become a shared model; the pick runs in the renderer, which already owns every target action) | 1 | 201 |
| The 7 pushes that exist only for it: `begin-rename`, `new-page-adjacent`, `begin-icon`, `open-in-new-tab`, `confirm-delete`, `open-in-window`, `open-history` (`bridge.ts:373-382`; only sender `contextMenu.ts:74,100-130`), their 7 preload dialers, and the `push(win, 'menu:action', 'reload-state')` at `index.ts:1665` | 0 | ~30 |
| 24 channel declarations + their type imports in `shared/bridge.ts`; 24 preload dialers | 0 | ~100 |
| Total gone | 19 | ~1,030 |

**Grows:** the 12 hand-built menus become model functions in shared (~250 lines: tab ~25, nav ~30, the four identity menus ~40, grip ~50, column ~30, trash ~40, create ~5, entity/container ~30), the renderer gains a ~40-line entity-menu router replacing `contextMenu.ts:95-132`, and the in-app `presentRowMenu` (adapter + host) is ~100-120 lines. Net for the list family: roughly **-600 lines and -19 files**, with the 22 shared model files (and their 1,138 test lines) surviving as the thing the whole layer is for. Bridge menu channels go from 26 to 1, plus the editor's two Tells and one Push.

**Genuinely resists (host-specific, stays):**

| Menu | Why | Size |
|---|---|---|
| Editor context menu | OS roles, spelling, Speech, Share (`editorMenu.ts:41-91`); clipboard read at pop time (`:199-204`); display accelerators (`:142-151`); pushed `FormatState`; fire-and-forget `menu:action`. Its Pommora block (`pommoraItems` `:113-193`, ~80 lines) is a checkbox/radio list and could become an `ActionItem` model the phone's in-app pane draws, leaving only the system items native | `main/editorMenu.ts` 227 + `shared/editorMenu.ts` 63 + `shared/pasteAsMenu.ts` rows ~40 + renderer `menu.ts` 110, `formatState.ts` 50, `formatKeymap.ts` 18 ≈ 510 |
| App menu bar | `setApplicationMenu`, accelerators, roles, Open Recent, rebuilt on session change (`menu.ts:28-163`); its five renderer actions are already commands (`App.tsx:143-170`) | 163 + ~30 |
| Combined | | ≈ 700 |

Submenus do not resist: `ActionItem.submenu` nests natively (`rowMenu.ts:38`) and `DrillLevel` shows the in-app drill; the Move To / Restore tree's repeat-parent-as-first-row idiom (`returningMenu.ts:42-60`) is one function to port. Object-shaped actions (grip, trash) and the `MutateRequest` reply (create) flatten to indexed strings the way `tileMenu.ts:25-26,64` already does.

#### 5. The Renderer Adapter

`Actions/nativeMenus.ts` and friends are a thin but real adapter, and the thinness is the finding: there is no abstraction over which menu a surface pops.

- `Actions/nativeMenus.ts` (24): `useNativeMenus()` reads `devicePrefs.nativeMenus ?? false` (`:9`), the only host switch, honored by exactly two surfaces. `popRowMenu(items, trigger)` (`:15-24`) is the single place a DOM rect becomes a wire `MenuAnchor`. Everything else in the file is a comment.
- `Actions/pageMenuActions.ts` (44): `pageMoveContext(tree, path)` builds the Move To tree from the store (`:13-18`) and `runPageSendAction` routes move / copy link / copy path / history (`:23-44`); six call sites lean on it (TabBar, NavList, TableView, CardsView, CardValue, connectionMenu). It is the renderer-side twin of `contextMenu.ts:95-132`, which routes the same actions main-side for the sidebar alone.
- `Actions/connectionMenu.ts` (129): a surface adapter, not transport: it derives `ConnMenuContext` from the store (open-in-detail / tab / window at `:50-61`), routes twelve actions back into store and window ops (`:36-43,63-89`), and classifies a Link cell's value into a menu target (`:100-129`).
- `Interface/DetailTitleHeader.tsx:14,35`: takes `requestMenu: () => Promise<TitleMenuAction | null>` as a prop, so three surfaces inject the channel and the header never names it. This is the one component already transport-agnostic.
- `MarkdownPM/Editor/menu.ts:22-32`: `EditorMenuApi { pushState, onAction }` with `nativeEditorMenu` bound to `window.nexus`, explicitly "the seam over the real bridge"; `Testing/editorHarness.ts:45` stubs it. `gripMenu.ts:110,174` and `citationPointer.ts:122,183` call `window.nexus?.gripMenu?.(...)` with optional chaining, so a host without those channels no-ops silently.
- `Interface/useBannerMenu.ts:59-64`, `Utilities/useNexusIcon.ts:16-28`, `Settings/iconFavorites.ts:15`: one-channel hooks with routing.

What the layer adds: geometry (once), store-derived context, action routing, and two explicit seams. What it does not add: any indirection between a surface and its channel. Each of the 37 `window.nexus.*Menu(` sites is its own adapter, so 35 surfaces have no non-native path and would need touching one by one on a host without native menus; with `popRowMenu<A>(xMenuModel(ctx), anchor)` they need one line changed each and keep their action switches intact.

#### 6. Target Shape

```
packages/
  core/                              no DOM, no Electron, no React
    menus/
      menuModel.ts                   ActionItem<A>, MenuAnchor | MenuPoint, RowMenuRequest      ← shared/menuModel.ts
      toggleLabels.ts                                                                          ← shared/toggleLabels.ts
      pageMenu.ts                    pageMetaMenuItems, pageMetaMenuSubset, MoveTarget            ← shared/pageMenu.ts
      models/                        one function per menu, every one → ActionItem<A>[]
        cardMenu.ts cellMenu.ts citationMenu.ts columnMenu.ts connMenu.ts fileHistoryMenu.ts
        optionMenu.ts propertyMenu.ts tableMenu.ts tileMenu.ts viewMenus.ts viewRowMenu.ts   survive as-is (style rows fold into ActionItem)
        tabMenu.ts navRowMenu.ts identityMenus.ts gripMenu.ts trashMenu.ts createMenu.ts      types-only files gain their model fn
        entityMenu.ts                the sidebar/band container rows                            ← contextMenu.ts:161-194
      *.test.ts                      the 14 existing, plus one per new model
    editor/
      editorMenu.ts                  FormatState, FORMAT_CHORDS, acceleratorFor, keyBindingFor  ← shared/editorMenu.ts
      pasteAsMenu.ts                                                                          ← shared/pasteAsMenu.ts
  ui/                                React, host-neutral DOM
    Menus/                           the existing kit: menu-row, menu-index, frame-slide, menu-disclosure, menu-surface
    RowMenu/
      rowMenuRows.tsx                ActionItem → MenuRow (+ DrillLevel-style submenu slide)     new, ~40
      RowMenuHost.tsx                one mounted pane over PickerMenu; presentRowMenu(items, at) → Promise<A | null>   new, ~60 (askConfirm pattern)
      useMenuPresenter.ts            in-app by default; the desktop's nativeMenus pref swaps in the bridge's row-menu   ← Actions/nativeMenus.ts
    Actions/
      pageMenuActions.ts connectionMenu.ts                                                     survive
      entityMenuActions.ts           the renderer-side pick router for the sidebar/band menu     ← contextMenu.ts:95-132, run here
  bridge/
    bridge.ts                        Asks: 'row-menu' (the only menu ask); Tells: 'editor:format-state', 'editor:grip-hot'; Pushes: 'menu:action'
  host-desktop/                      Electron main
    menus/
      returningMenu.ts               popReturningMenu, destinationNodes                          survive
      rowMenu.ts                     anchorPoint, nativeRow (+ radio reading), rowTemplate, menuTemplate, popRowMenu   survive
      editorMenu.ts                  the webContents context-menu: system items + pommoraItems drawn from core FormatState   survive
      appMenu.ts                     Menu.setApplicationMenu                                     ← main/menu.ts
  host-ios/                          Capacitor
    (no menu code)                   presentRowMenu is the only path; useMenuPresenter never selects native
```

Gone: 18 main poppers, `contextMenu.ts`, `styleMenu.ts`, 24 bridge channels, 24 preload dialers, 7 pushes. Kept: every shared model and test, the row chassis, the editor menu, the app menu bar, the in-app menu kit.

#### Summary

Pommora's right-click menus are 28 native menus over a three-layer chassis: 22 shared model files (1,524 lines), 23 main poppers (1,246) plus ~195 inline handler lines in `main/index.ts`, 26 bridge channels, and a thin renderer adapter (583 lines), with 1,878 lines of tests; ~5,540 total. The generalization is already built: `ActionItem` + `rowMenu.ts` + `row-menu` cover separators, checks, disabled rows, submenus, and anchors, and 11 channels ride it. Yet 24 per-surface channels persist, 12 poppers still hand-build Electron templates (tab, nav row, three identity menus, favorite, create, grip, column, two trash menus, the sidebar's containers) with no visible reason beyond radio glyphs, object-shaped actions, and one stale comment; only the sidebar menu has an architectural reason (it acts in main). The in-app side has the row kit and popup shell but no `ActionItem` adapter and no imperative presenter; `askConfirm` is the pattern. Collapsing the list family removes ~19 files and ~600 net lines and takes menu channels from 26 to 1; the editor context menu and app menu bar (~700 lines) stay host-specific. Two defects: `ActionItem.confirm` is dead on the native side, and `tileMenu.ts` claims a shared pane that never reads it.
