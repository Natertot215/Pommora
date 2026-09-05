## A15: Renderer Shell Placement

**Scope:** `src/renderer/store.ts`, `treeIndex.ts`, `Store/`, `Navigation/`, `Tabs/`, `Sidebar/`, `Settings/`, `Actions/`, `Showcase/`, with `App.tsx` and `main.tsx` read for mounting context. Every non-test file was read in full; importer counts come from an `rg` census over `src/` excluding `*.test.*`. Judgments are by what the code does and who imports it; comments and CLAUDE.md rules were treated as non-binding.

**Vocabulary used below:** *Session* = the renderer's shared Zustand room and the tree derivations every surface reads. *Shell* = the desktop window's regions and chrome (sidebar, ribbon, toolbar, floating windows, settings). *Content* = what fills the center pane. *Bridge* = `window.nexus`, the preload-exposed contract a host implements.

---

### 1. File Table

Classification key: **pure** (no React, no DOM, no bridge), **component**, **hook**, **style**, **slice** (Zustand slice factory), **module-store** (module-level mutable state outside Zustand), **bridge-adapter** (renderer half of a native menu, dialog, or window op). Importer counts exclude tests and the file's own folder-mates only where noted.

#### Root

| File | Lines | Class | Importers | Concern | New home |
|---|---|---|---|---|---|
| `store.ts` | 49 | composer + 2 hooks + side effect | 96 files, every folder | Composes seven slices into `useSession`; re-exports selectors; `useEmbedScale`, `useAssetUrl`; wires `viewMint` | `Session/store.ts` |
| `treeIndex.ts` | 312 | pure (imports `DesignSystem/Symbols`, `NavTrail` type, `MarkdownPM/Connections`) | 22 files across Actions, Frames, Interface, MarkdownPM, Navigation, Store, Tabs, Tiles, Views, Windows | One walk per tree; cached projections: reconcile, resolve, search, pages, containers, ancestry, connections index | `Session/treeIndex.ts` |

#### Store/

| File | Lines | Class | Importers | Concern | New home |
|---|---|---|---|---|---|
| `sessionState.ts` | 21 | types | 7 slices + store.ts | `SessionState` union, `Slice<T>` helper (exists to break the store↔slice value cycle) | `Session/sessionState.ts` |
| `nexusSlice.ts` | 263 | slice | store.ts | status/tree, `load`, `applyTree` (reconcile fan-out, accent + personalization application, device prefs), `choose`, `openDropped`, `mutate` with optimistic tree patching | `Session/nexusSlice.ts` |
| `navigationSlice.ts` | 814 | slice | store.ts (selectors re-exported) | selection, open page slots, tabs + MRU + history, pins/recents/favorites, nav persistence, thumbnail versions, `select`, `newPage`, `createFromMenu`, `patchPagesFor` | `Navigation/navigationSlice.ts` |
| `windowSlice.ts` | 316 | slice | store.ts | Page Window / NavWindow / history window / browser summon; `windowsFile` persistence | `Shell/Windows/windowSlice.ts` |
| `chromeSlice.ts` | 160 | slice | store.ts, `App.tsx` (`SIDEBAR_WIDTH`, `INSPECTOR_WIDTH`) | Two concerns: desktop layout (pane widths in localStorage, sidebar/ribbon visibility, settings/iteration open) and neutral plumbing (subfield state, nav view modes, `askConfirm`, `notify`) | Split: `Shell/layoutSlice.ts` + `Session/chromeSlice.ts` |
| `configSlice.ts` | 78 | slice | store.ts (`citationsVisible` re-exported) | personalization, device prefs, per-page citations visibility, `commands` chord map | `Session/configSlice.ts` |
| `renameSlice.ts` | 207 | slice | store.ts | Rename fence + claims, icon picker target, peek signal, `newPageAdjacent`, property rename + `valuesEpoch` | `Session/mutationSlice.ts` (it is the mutation-gesture slice, not only rename) |
| `cacheSlice.ts` | 113 | slice | store.ts | link titles, active views, page aliases, tile host locks, asset map, `setAssetDirectory`, `setExclusions` | `Session/cacheSlice.ts` (the two settings writers move to `configSlice`) |
| `tabState.ts` | 134 | module-store + one hook | 10 files: Interface ×4, Tiles ×2, Windows ×3, navigationSlice; all bypass store.ts | Two concerns: per-tab warm entries (`captureCache`/`readCache`, editor state + scroll) and the path-keyed page-detail slot (`fetchPageDetail` single-flight, `writeThroughBody`, body epoch, `fenceWarm`) | Split: `Navigation/warmTabs.ts` + `Session/pageDetailCache.ts` |

#### Navigation/

| File | Lines | Class | Importers | Concern | New home |
|---|---|---|---|---|---|
| `navRecents.ts` | 55 | pure | 12 files: Interface ×3, Navigation ×4, Store, Tabs, Views, Windows, treeIndex | `navKey` (the identity primitive for every nav ref), `recordRecent`, `moveByKey`, `removeRecentByKey` | `Navigation/navRecents.ts` |
| `navResolve.ts` | 61 | pure | 7: Navigation ×3, Tabs, Utilities/EntityIcon, Windows/WindowTabStrip, treeIndex | `ResolvedNav`, `ResolveIndex`, resolve recents/pins/favorites against the index (render-prune) | `Navigation/navResolve.ts` |
| `navSearch.ts` | 50 | pure | 3: useNavData, treeIndex, **Settings/TrashFrame** (`fuzzyScore`) | `SearchEntry`, `fuzzyScore`, `filterNav` | `Navigation/navSearch.ts`; `fuzzyScore` → a shared util (see §9) |
| `thumbMarkers.ts` | 19 | module-store | 2: useNavThumbnails, navigationSlice | Capture gate markers per nav key, scoped per nexus | `Navigation/thumbMarkers.ts` |
| `useNavData.ts` | 98 | hook | 2: Interface/NavView, Windows/NavWindow | Resolved recents/pins/favorites, `search`, `go` (mints a live target) | `Navigation/useNavData.ts` |
| `useNavThumbnails.ts` | 81 | hook (DOM-measuring) | 1: App.tsx | Full-window thumbnail capture of the content pane after selection settles | `Shell/useNavThumbnails.ts` (it measures the desktop layout) |
| `NavList.tsx` | 249 | component + bridge-adapter (`NavRowMenu`) | 3: NavView, NavGallery, NavWindow | List rows, pin button, row context menu via `navRowMenu` | `Navigation/NavList.tsx`; `NavRowMenu` → `Shell/Menus/` |
| `NavGallery.tsx` | 151 | component | 2: NavView, NavWindow | Card gallery with thumbnails, pins zone, reorder | `Navigation/NavGallery.tsx` |
| `nav-list.css` | 33 | style | NavList, **Settings/TrashFrame** | `.nav-search-row`, `.nav-list`, `.nav-pin` | `Navigation/nav-list.css`; `.nav-search-row`/`.nav-list` are generic list chrome (see §9) |
| `nav-gallery.css` | 10 | style | NavGallery | Gallery flow | `Navigation/` |
| `testTree.ts` | 65 | test fixture | 0 non-test; 3 tests (treeIndex, navResolve, navSearch) | Shared `NexusTree` fixture | `Testing/fixtures/tree.ts` |

#### Tabs/

| File | Lines | Class | Importers | Concern | New home |
|---|---|---|---|---|---|
| `tabsModel.ts` | 318 | pure | 11: Actions/connectionMenu, App, Navigation ×2, Sidebar, Store ×2, TabBar, Toolbar, Views ×2 | Tab open/close/reorder/reconcile/hydrate, pinned derivation, `liveTarget`, `isOpenInTabs`, `contextTargetToSelect`, `cycle`, `makeTabId` | `Navigation/tabsModel.ts` |
| `TabBar.tsx` | 395 | component + bridge-adapter | 1: Toolbar/Toolbar | Pinned/unpinned strips, ghost close, Ctrl+Tab cycling, `tabMenu`, window drag (`winDragBy`) and zoom (`winZoom`) on the bar | `Navigation/TabBar.tsx`; the bar-drag/zoom handlers and `runTabMenu` → `Shell/` |
| `tab-base.css` | 254 | style | TabBar | Tab chrome, `.tabs-standard`/`.tabs-compact`, plus-button reveal rules that reach into `.shell`, `.app-toolbar`, `.mdpm-header` | `Navigation/tab-base.css` |

#### Sidebar/

| File | Lines | Class | Importers | Concern | New home |
|---|---|---|---|---|---|
| `Sidebar.tsx` | 915 | component + bridge-adapter (`showContextFor`) | 1: App.tsx | Tree browser: Collections/Contexts/Agenda modes, disclosure with lock + peek, ghost create, native context menus, mode-switch animation | `Shell/Sidebar/Sidebar.tsx` |
| `Sidebar.css` | 284 | style | main.tsx (global), Ribbon.tsx | `.surface-glass`, `.sidebar-ribbon`, `.ribbon-icon`, `.sidebar-toggle`, `.sidebar`, rows, modes, `.agenda-empty` | `Shell/Sidebar/sidebar.css` (one import site) |
| `Ribbon.tsx` | 117 | component | 1: App.tsx | Mode switcher (`personalization.sidebarMode`), reorderable (`ribbonOrder`), Navigation/Settings window summoners, homepage button | `Shell/Sidebar/Ribbon.tsx` |
| `NexusPhoto.tsx` | 67 | component | 1: Ribbon | Nexus avatar with icon/image pickers via `useNexusIcon` | `Shell/Sidebar/NexusPhoto.tsx` |
| `nexus-header.css.ts` | 22 | style | NexusPhoto | Avatar slot | `Shell/Sidebar/` |
| `AgendaMode.tsx` | 8 | component | 1: Sidebar.tsx | `<div className="agenda-empty">No tasks or events</div>` | Inline into `Sidebar.tsx` (see §4) |
| `disclosureState.ts` | 49 | pure (Storage-shaped parameter) | 1: Sidebar.tsx | Disclosure open map in localStorage, parsed once | `Shell/Sidebar/disclosureState.ts` |
| `sidebarDnd.tsx` | 301 | component + hook | 1: Sidebar.tsx | Tree-drop slot resolution over `Interactions/insertionDrag` | `Shell/Sidebar/sidebarDnd.tsx` |
| `sidebarDndModel.ts` | 172 | pure | 10: Frames ×4, Views ×4, Sidebar ×2 | Two concerns: tree drag index (`buildIndex`, `Entry`, `Index`, `setContainerOf`, `isSelfOrDescendant`) and generic slot math (`nextOrder`, `slotInGroup`, `MeasuredRow`) that Frames and Views import | Split: `Shell/Sidebar/sidebarDndModel.ts` + `Interactions/reorderModel.ts` |

#### Settings/

| File | Lines | Class | Importers | Concern | New home |
|---|---|---|---|---|---|
| `SettingsWindow.tsx` | 946 | component + bridge-adapter | 2: App.tsx, **Showcase/PanesLeaf** (constants) | Data-driven `FRAMES` roster on `WindowBase`; row renderers; `clearExclusions`/`clearHistory` | `Shell/Settings/SettingsWindow.tsx`; `SETTINGS_WIN`/`SETTINGS_RAIL` → a constants file (see §6) |
| `AssetDirectoryRow.tsx` | 40 | component + bridge-adapter | 1: SettingsWindow | Asset dir path field, `chooseAssetDir` | `Shell/Settings/` |
| `ExcludedDirectoriesRow.tsx` | 148 | component + bridge-adapter | 1 | Exclusions pane, `chooseExclusion` | `Shell/Settings/` |
| `exclusion-rows.css.ts` | 44 | style | 1 | | `Shell/Settings/` |
| `ClearActionRow.tsx` | 45 | component | 1 | Destructive clear with "Cleared" flash | `Shell/Settings/` |
| `settings-window.css` | 42 | style | SettingsWindow | | `Shell/Settings/` |
| `TrashFrame.tsx` | 332 | component + bridge-adapter | 1: SettingsWindow | Trash list, restore/empty, batch menus (`trashMenu`, `trashColumnMenu`), `reportTrash` | `Shell/Settings/TrashFrame.tsx` |
| `trash-frame.css` | 104 | style | TrashFrame | | `Shell/Settings/` |
| `IconPicker.tsx` | 10 | component | 15 files: Frames ×4, Interface ×2, Properties ×2, Sidebar ×2, Tiles, Toolbar ×2, Views ×2; **0 in Settings/** | DesignSystem `IconPicker` bound to nexus favorites | `Session/Bound/NexusIconPicker.tsx` |
| `iconFavorites.ts` | 16 | hook + bridge-adapter | 1: IconPicker.tsx | `personalization.favoriteIcons` read/write; `iconFavoriteMenu` | `Session/Bound/useIconFavorites.ts` |

#### Actions/

| File | Lines | Class | Importers | Concern | New home |
|---|---|---|---|---|---|
| `commands.ts` | 49 | pure (KeyboardEvent) | 6: App, MarkdownPM ×4, Properties/valueUndo | Chord spec → `KeyboardEvent` match, memoized | `Interactions/commands.ts` |
| `selection.ts` | 44 | pure | 6: MarkdownPM ×2, Store ×2, Tabs, treeIndex | `ReconcileIndex` type, `reconcileWith`, `reconcileSelection` | `Session/selection.ts` (co-located with `treeIndex`, which it mutually imports) |
| `destinationTree.ts` | 30 | pure | 2: pageMenuActions, TrashFrame | `MoveTarget[]` walks for Move To / Restore To | `Session/destinationTree.ts` |
| `linkResolve.ts` | 14 | store reader | 6: Properties ×2, Views ×3, Windows/PageWindow | Live `[[Title]]` → page for Link property paste gate | `Properties/Assignment/linkResolve.ts` |
| `connectionMenu.ts` | 129 | bridge-adapter | 7: Interface/PageView, Properties, Tiles/TileHost, Views ×2, Windows ×2 | Connection/url context menu → `connMenu`, runs actions | `Shell/Menus/connectionMenu.ts` |
| `pageMenuActions.ts` | 44 | bridge-adapter | 5: NavList, Sidebar, TabBar, Views ×2 | Page "send block" (move, copy link/path, history) | `Shell/Menus/pageMenuActions.ts` |
| `nativeMenus.ts` | 24 | bridge-adapter + hook | 2: DesignSystem/PickerControl, Tiles/TileHost | `useNativeMenus`, `popRowMenu` with anchor rect | `Shell/Menus/nativeMenus.ts` |
| `openWebLink.ts` | 12 | bridge-adapter | 5: App, MarkdownPM/links, Properties/LinkCell, Tiles/WebTile, Views/TableView | External link → in-app browser or `openExternal` | `Shell/Windows/openWebLink.ts` (beside `WebWindow`, which it imports) |
| `RenamableTitle.tsx` | 53 | component | 3: Sidebar, Views/CardsView, Views/GroupBand | `RenamableLabel` bound to the rename fence | `Session/Bound/RenamableTitle.tsx` |

---

### 2. The Store

**One thing in two places?** By name only. `store.ts` is the composer and barrel: `create<SessionState>()` spreading seven slice factories, re-exports of six selectors and four types, two hooks (`useEmbedScale`, `useAssetUrl`), and a module-scope side effect (`wireViewAdopted`). `Store/` holds the slice factories, the `SessionState` type, and one file that is not a slice at all. The root/folder split is convention, not duplication. The real "two places" problems are inside:

- **`tabState.ts` is a second store.** It is module-level mutable state (`cache`, `detailByPath`, `inFlight`, `bodyEpochs`) with its own subscription (`useBodyEpoch` via `useSyncExternalStore`), and ten files import it directly, bypassing `store.ts`. It also holds two unrelated concerns: per-tab warm entries keyed by `tabId + navKey` (Tabs) and a path-keyed page-detail slot with single-flight fetch and body epoch (Pages). `Interface/pageFlush.ts` writes through it, so the save scheduler and the store share it as a side channel.
- **Two access conventions.** Selectors (`shownPage`, `frozenOf`, `citationsVisible`, `windowTargetOf`) are re-exported through `store.ts`; `SIDEBAR_WIDTH`/`INSPECTOR_WIDTH` are imported by `App.tsx` straight from `Store/chromeSlice`. Either everything the outside needs goes through the barrel or nothing does.
- **The store is a hub, not a leaf.** The slices import from ten folders: `Interface/scope`, `Interface/pageFlush` (→ `Tiles/pageTileWrite`), `Interface/Subfield/crumbs` (breadcrumb depth computed inside `select`), `Views/viewMint`, `Views/creationOrder`, `Windows/windowTabs|windowCache|windowMorph`, `Assets/assetUrl`, `DesignSystem/Tokens/accent|personalization`, `Navigation/navRecents|thumbMarkers`, `Tabs/tabsModel`, `Actions/selection`, and `treeIndex` (→ `MarkdownPM/Connections`, `DesignSystem/Symbols`, `NavTrail`). Every one of those is a pure model or a token applier except `pageFlush` (a scheduler) and `WebWindow` (via `Actions/openWebLink`, not the store). The store is where feature models meet; it was never independent of them.

**Host-neutral versus desktop chrome, slice by slice:**

| Slice | Verdict | Evidence |
|---|---|---|
| `nexusSlice` | Neutral, with three desktop calls | `openDropped(file: File)` (file drop), `choose()` (folder dialog), `systemAccent()` (OS accent). `load`/`applyTree`/`mutate` are the contract any host implements. |
| `navigationSlice` | Neutral working state a phone holds identically | Selection, open page slots, recents/pins/favorites, and the tab set with per-tab history are exactly a mobile back stack plus a working set; a phone may render no tab bar and still keep the model. Desktop-coupled edges: `createFromMenu` → `popCreateMenu` (native menu), `evictThumbs` → `capture.evict` (screenshot files), `navSlide` (an animation cue stored as model state). |
| `windowSlice` | Desktop chrome | Floating Page Window, NavWindow, history window, browser summon, `windowsFile` per-origin tab sets. A phone has none of these; they become routes or sheets. |
| `chromeSlice` | Half and half | Desktop: `sidebarWidth`/`inspectorWidth` (localStorage), `sidebarVisible`, `ribbonVisible`, `settingsOpen`, `iterationOpen`. Neutral: `subfieldExpanded`/`subfieldOrder`, `navWindowMode`/`navViewMode` (persisted per nexus through the bridge), `askConfirm`/`pendingConfirm`, `notify`/`notification`. |
| `configSlice` | Neutral | `personalization`, `devicePrefs`, `citationsShown`. `commands` is a keyboard-chord map, which only a keyboard host consumes, but holding it is harmless. |
| `renameSlice` | Neutral logic, desktop vocabulary | The fence/claim mechanism is host-free; `RENAME_RANK: Record<RenameHost, number> = { detail: 2, sidebar: 1 }` (line 62) bakes two desktop surface names, and `RenameHost` itself lives in `shared/mutate.ts:122`. Also carries `valuesEpoch`/property rename, which is not rename-fence business. |
| `cacheSlice` | Neutral | Maps keyed by id. `setAssetDirectory`/`setExclusions` are settings writers filed under "cache". |
| `tabState.ts` | Neutral | Warm cache and page-detail slot; `fetchPageDetail` calls the `openPage` data channel. |

**Where the Store belongs.** Beside the features that own each slice, composed in one place. The slices already import their feature's pure model (`navigationSlice` ↔ `tabsModel`/`navRecents`; `windowSlice` ↔ `windowTabs`/`windowCache`/`windowMorph`; `renameSlice` ↔ `creationOrder`/`scope`), so a `Store/` folder is filing by kind, which is the taxonomy the restructure is trying to leave. The admission rule that works: *a feature's state is `<feature>Slice.ts` in the feature's folder; `Session/store.ts` lists it once; `Session/sessionState.ts` holds the union.* Concretely: `navigationSlice` → `Navigation/`, `windowSlice` → `Shell/Windows/`, the layout half of `chromeSlice` → `Shell/layoutSlice.ts`; `nexusSlice`, `configSlice`, `cacheSlice`, the mutation slice, the neutral half of `chromeSlice`, `treeIndex`, `selection`, `destinationTree`, and the page-detail cache stay together in `Session/`, because they are the Nexus as the renderer holds it and every surface reads them.

The alternative, one `Session/` folder holding all slices with the desktop ones marked, is simpler to file into but reproduces today's `Store/`. Given the mobile host is next and would leave `windowSlice` and `layoutSlice` idle, placing those two with the Shell makes the desktop-shaped state findable as desktop state. A per-host slice-injection mechanism (generic `SessionState`) is not warranted for a single-window app; idle fields on the phone cost nothing.

---

### 3. Actions/

**What it is:** a junk drawer with one real seam hidden inside it. The nine files share no importer set, no vocabulary, and no layer; "actions" was where anything imperative went. Sorted by what each actually is:

- **Pure tree derivations** (`selection.ts`, `destinationTree.ts`): siblings of `treeIndex.ts`. `selection.ts` and `treeIndex.ts` import each other (the `ReconcileIndex` type one way, `reconcileIndexOf` the other); they are one module family split across two folders.
- **A pure input matcher** (`commands.ts`): chord parsing against `KeyboardEvent`; belongs with the other input engines in `Interactions/`, which already holds `keyboard.ts`, `activate.ts`, `gesture.ts`.
- **The renderer half of native menus** (`connectionMenu.ts`, `pageMenuActions.ts`, `nativeMenus.ts`): each pops a main-side menu through the bridge and runs the chosen action. This is the seam. The same pattern is duplicated in `Navigation/NavList.tsx` (`NavRowMenu`), `Tabs/TabBar.tsx` (`runTabMenu`), `Sidebar/Sidebar.tsx` (`showContextFor`), `Settings/TrashFrame.tsx` (`openMenu`, `openColumnMenu`), `Settings/iconFavorites.ts` (`iconFavoriteMenu`), and `navigationSlice.createFromMenu` (`popCreateMenu`). `src/shared/` already holds one `*Menu.ts` model per menu (`connMenu`, `pageMenu`, `tabMenu`, `navRowMenu`, `trashMenu`, `menuModel`). The renderer counterpart deserves the same shape: one `Shell/Menus/` folder holding every adapter, so a Capacitor host that renders action sheets swaps one folder instead of hunting through six.
- **A link adjudicator** (`openWebLink.ts`): imports `openInAppBrowser` from `Windows/WebWindow`; it is the WebWindow's front door and belongs next to it.
- **A Link-property resolver** (`linkResolve.ts`): six importers, all Link property cells and their hosts; belongs in `Properties/`.
- **A bound component** (`RenamableTitle.tsx`): `DesignSystem/RenamableLabel` wired to the rename fence; one of the "primitive bound to session state" widgets (with `Settings/IconPicker`, `Utilities/EntityIcon`, `Utilities/useNexusIcon`, `Assets/AssetImage`) that currently have no shared home.

**Verdict:** dissolve. Nothing in it needs the name.

---

### 4. Navigation/ + Tabs/ + Sidebar/

**Navigation and Tabs are one domain.** The import graph says so before the docs do: `navigationSlice` imports both; `tabsModel` imports `navKey` from `navRecents` and `reconcileWith` from `selection`; `TabBar` imports `navResolve` and `treeIndex`; `NavList` and `useNavData` import `tabsModel` (`isOpenInTabs`, `liveTarget`); pins are simultaneously a nav list and the pinned tabs (`derivePinnedTabs` runs off `pinned: NavRef[]`). `navKey` is the identity primitive both sides key on. NavigationPM already documents Tabs as a section of Navigation. Merge `Tabs/` into `Navigation/`: models (`tabsModel`, `navRecents`, `navResolve`, `navSearch`, `thumbMarkers`, `navigationSlice`, the warm-tab half of `tabState`), surfaces (`NavList`, `NavGallery`, `TabBar`), hooks (`useNavData`). `TabBar` is mounted by `Toolbar/Toolbar.tsx`, which is fine: the toolbar is a Shell region that hosts a Navigation surface, the same way `NavWindow` and `NavView` host `NavList`. `Interface/NavView.tsx` (113 lines) composes `useNavData`, `NavList`, and `NavGallery` under Interface's banner chrome (`useBannerMenu`, `AddBannerButton`, `content-banner.css`); it is the center-pane surface for the new-tab target, so it stays a Content surface that consumes Navigation, as `NavWindow` is a Shell surface that consumes it.

**Sidebar is a different domain.** It imports nothing from `Navigation/`; from `Tabs/` only `isOpenInTabs` and `contextTargetToSelect` for menu labels. It is the tree browser (Collections/Contexts modes with disclosure, lock, peek, ghost-create, drag-reorder) plus the Ribbon. That is a window region, not wayfinding.

**Does Interface/ absorb Sidebar/?** Yes, if Interface means "the window's regions"; no, if it means "content surfaces". Today it means both: `InspectorPane/`, `InterfaceScaffold`, `NotificationLabel` are regions; `PageView`, `ContainerView`, `SpaceView`, `HomepageView`, `Banner`, `Subfield`, `Glance` are content. The clean cut is a **`Shell/`** for regions and chrome (App layout, Sidebar + Ribbon, Toolbar, InspectorPane, NotificationLabel, ConfirmationWindow, the floating Windows, the Settings window, the menu adapters) and a **`Content/`** for what fills the center. Under that cut Sidebar/ moves into `Shell/Sidebar/`, and the question "does Interface absorb Sidebar" dissolves because Interface stops existing under that name.

**Where the Ribbon lives:** `Shell/Sidebar/Ribbon.tsx`. It is the sidebar's mode switcher: its state is `personalization.sidebarMode` and `ribbonOrder`, its styles are `.sidebar-ribbon`/`.ribbon-icon` in `Sidebar.css`, and `App.tsx` mounts it inside the same `Surface` as the Sidebar. Its two non-mode buttons summon floating windows (`toggleNav`, `toggleSettings`), which is Shell behavior either way. A phone would render the same switcher as a bottom tab bar over the same `sidebarMode` key. Note in passing: `sidebarMode` and `ribbonOrder` persist in nexus-wide `Personalization` (`shared/types.ts:173,195`), so the phone would inherit the desktop's chosen sidebar mode; that is a data-placement question outside this scope.

**Where `AgendaMode.tsx` belongs:** nowhere as a file. It is eight lines rendering `<div className="agenda-empty">No tasks or events</div>`, imported once by `Sidebar.tsx`, with a 38-line test asserting the div exists. Inline it into `Sidebar.tsx` (`agendaLayer`) and keep the `.agenda-empty` rule. When Agenda grows a content model it becomes its own domain (`Agenda/`), and the sidebar's agenda mode imports that domain's list surface, exactly as the collections mode renders `CollectionRow` over the tree. If a named slot is wanted before then, `Shell/Sidebar/AgendaMode.tsx` with the admission rule "a sidebar mode's body" is defensible; a separate test for a placeholder div is not.

---

### 5. Settings/

**A window, not a feature folder.** `SettingsWindow.tsx` is a `WindowBase` shell around a data-driven `FRAMES` roster; the row components exist only to serve it (one importer each); `TrashFrame` is a `Surface`-kind frame in that roster (`foot: true`); `chromeSlice.settingsOpen` summons it; the Ribbon toggles it. Everything it edits is `personalization`/`devicePrefs` through `configSlice`, plus four bridge dialogs. That is Shell chrome: `Shell/Settings/`.

Two files are not settings at all. `IconPicker.tsx` (the DesignSystem picker bound to `favoriteIcons`) has fifteen importers across Frames, Interface, Properties, Sidebar, Tiles, Toolbar, Views and zero inside `Settings/`; `iconFavorites.ts` is its hook. The Context doc's `Utilities/NexusIconPicker` names the right thing; the folder it names is another junk drawer (`Utilities/` holds `EntityIcon`, `useNexusIcon`, `iteration-window`, three unrelated things). The category these belong to is "a design-system primitive bound to session state": `NexusIconPicker` + `useIconFavorites`, `EntityIcon`, `useNexusIcon`, `AssetImage`, `RenamableTitle`. They cannot live in `DesignSystem/` (which is store-free, and the showcase bundles it from the same sources), so they live where the store lives: `Session/Bound/`.

`TrashFrame` reaches across the tree for two things it should not need to know about: `fuzzyScore` from `Navigation/navSearch` and `'../Navigation/nav-list.css'` for `.nav-search-row`/`.nav-list`. Both are generic (a scorer; a search row over a list) wearing a Navigation address.

---

### 6. Showcase/

Showcase is a standalone Vite site (`vite.config.ts`, `design-system.html`, `interactions.html`, `vercel.json`, `npm run showcase|build:showcase`) that nothing in the app imports; the only references to it outside its folder are build configuration and `tsconfig.web.json`'s `src/renderer/**/*` include, so `npm run typecheck` covers it. Its 28 files import the app renderer 60 times: 44 from `DesignSystem/`, 7 from `Interactions/`, 1 from `Animation/`, and 8 that reach into features: `Tiles/TileGrid` + `Tiles/Core/{model,ops,rects}` (TileLab), `Windows/window-base` (PanesLeaf), `Settings/SettingsWindow` for `SETTINGS_WIN`/`SETTINGS_RAIL` (PanesLeaf), and `Properties/Assignment/formatValue` (ComponentsLeaf). The Settings import is the one that bites: `SettingsWindow.tsx` imports `useSession`, so the showcase bundle carries `store.ts`, all seven slices, `treeIndex`, `MarkdownPM/Connections`, `Interface/pageFlush`, `Tiles/pageTileWrite`, and `Windows/confirmations` to obtain two constant objects; it works in a browser only because no slice touches `window.nexus` at import time. Moving those two constants to a store-free file (or letting the showcase declare its own replica numbers) cuts the dependency. With that done, Showcase can be its own workspace importing the UIX workspace's `DesignSystem`, `Interactions`, `Animation`, plus `Tiles/Core` and `window-base` as re-exported pieces, or it can be deleted with zero app impact beyond removing `vite.config.ts`, the two HTML entries, `vercel.json`, and two `package.json` scripts.

---

### 7. Host-Bound

Three grades. **A** = desktop interaction or layout a phone cannot reuse. **B** = a bridge data channel the host implements to the same contract (`window.nexus.*`); the file is reusable once the host supplies `window.nexus`. **C** = neutral.

##### Grade A (needs a different design on a phone)

- `App.tsx:63-76` sidebar/inspector `useResizeFrame`; `:84-173` thirteen `window.nexus.on*` native-menu and menu-bar listeners; `:175-191` `keydown` chord dispatch; `:211-216` `onDrop` → `openDropped(e.dataTransfer.files[0])`; `:218,255` `.titlebar`/`.sidebar-titlebar`; `:274-279` six floating windows mounted (`NavWindow`, `PageWindow`, `PageHistoryWindow`, `WebWindow`, `SettingsWindow`, `IterationWindow`).
- `main.tsx:4,28` `initNativeCaret()` (drawn caret for native fields); `:32-35` `__pommora` CDP seam.
- `Store/nexusSlice.ts:29,178` `openDropped: (file: File)` → `window.nexus.openDropped(file)`; `:177` `choose: () => openVia(() => window.nexus.choose())`; `:84,160,162` `window.nexus.systemAccent()`.
- `Store/chromeSlice.ts:7-15` `sidebarVisible`, `ribbonVisible`, `sidebarWidth`, `inspectorWidth`; `:46,60` `localStorage.getItem(SIDEBAR_WIDTH_KEY|INSPECTOR_WIDTH_KEY)`; `:103-104` `localStorage.setItem(...)`; `:24-30` `settingsOpen`, `iterationOpen`.
- `Store/windowSlice.ts:25-54` the whole interface: `pageWindow`, `navOpen`, `historyTarget`, `browserSummon`, `windowsFile`; `:91-93` `window.nexus.windows?.save(file)`.
- `Store/navigationSlice.ts:694` `window.nexus.popCreateMenu(items)`; `:517` `window.nexus.capture.evict(live)`.
- `Store/configSlice.ts:9,52` `commands: Record<string, string>` = `DEFAULT_COMMANDS` (keyboard chords).
- `Store/renameSlice.ts:62` `RENAME_RANK: Record<RenameHost, number> = { detail: 2, sidebar: 1 }` (desktop surface names; `RenameHost` at `shared/mutate.ts:122`).
- `Navigation/useNavThumbnails.ts:14-18` `document.querySelector('.surface-glass'|'.inspector-glass'|'.app-toolbar')?.getBoundingClientRect()`; `:65-69` `window.nexus.capture.thumbnail(key, contentRect(pane), window.devicePixelRatio)`.
- `Navigation/NavList.tsx:44-52` `window.nexus.navRowMenu({...})`; `:145-148` `onContextMenu`. `Navigation/NavGallery.tsx:128` `onContextMenu={(e) => onMenu(it, e)}`.
- `Tabs/TabBar.tsx:126-133` `window.addEventListener('keydown', onKey)` Ctrl+Tab; `:149` `window.nexus.tabMenu({...})`; `:165-188` `onBarDown` → `window.nexus.winDragBy(dx, dy)`; `:189-192` `onBarDoubleClick` → `window.nexus.winZoom()`; `:307,378` `onContextMenu`.
- `Sidebar/Sidebar.tsx:60` `window.nexus.contextMenu({... host: 'sidebar' ...})`; `:707` same for contexts; `:228,232` `loadOpen(window.localStorage, ...)`/`saveOpen(window.localStorage, ...)`; `:749` `if (e?.metaKey) ... { newTab: true }`; `:140,345,389-397,443,547,688,904` `onContextMenu` on rows, disclosure bodies, and the mode body.
- `Sidebar/Ribbon.tsx:32-33,50-51` `toggleNav()`/`toggleSettings()` summon floating windows (the buttons are fine; their targets are desktop).
- `Sidebar/NexusPhoto.tsx:37-40` `onContextMenu` → `openMenu()` (native menu via `useNexusIcon`).
- `Settings/SettingsWindow.tsx:14-16,718-749` `WindowBase` floating window with `SETTINGS_WIN`/`SETTINGS_RAIL` bounds and `DRAG_SURFACES` (`:66-67`); `:146-161` `window.nexus.countExclusions()`, `.clearExclusions()`, `.clearHistory()`, `.showError()`; `:250-255` "Use Native Menus" device row.
- `Settings/AssetDirectoryRow.tsx:30` `window.nexus.chooseAssetDir()`. `Settings/ExcludedDirectoriesRow.tsx:39` `window.nexus.showError`; `:53` `window.nexus.chooseExclusion()`.
- `Settings/TrashFrame.tsx:125,144` `window.nexus.reportTrash(...)`; `:153` `window.nexus.trashColumnMenu({...})`; `:176-185` `window.nexus.trashMenu({...})`; `:232-235,324-327` `onContextMenu`.
- `Settings/iconFavorites.ts:15` `onMenu: (isFavorite) => window.nexus.iconFavoriteMenu(isFavorite)`.
- `Actions/nativeMenus.ts:19-23` `trigger?.getBoundingClientRect()` → `window.nexus.rowMenu({ items, anchor })`. `Actions/connectionMenu.ts:36,63` `window.nexus.connMenu(ctx)`; `:38-39` `openInAppBrowser` / `window.nexus.openExternal`; `:40,74,77` `window.nexus.writeClipboard`. `Actions/pageMenuActions.ts:32,36` `window.nexus.writeClipboard`. `Actions/openWebLink.ts:10-11` `openInAppBrowser(url)` else `window.nexus.openExternal(url)`. `Actions/commands.ts:39-48` `e.metaKey === chord.cmd && e.ctrlKey === chord.ctrl ...`.

##### Grade B (reusable once the host implements the same channels)

`Store/nexusSlice.ts` (`state`, `mutate`, `subfield.get`, `navViewModes.get`, `citations/linkTitles/activeViews/aliases.get`, `nav.read`, `tabs.load`, `devicePrefs.load`, `showError`), `Store/navigationSlice.ts:227,290,646-668` (`tabs.save`, `nav.write`, `openPage`), `Store/tabState.ts:56` (`openPage`), `Store/cacheSlice.ts:44,52,67,106,108` (`aliases.set`, `linkTitles.fetch`, `activeViews.set`, `setAssetDir`, `setExclusions`), `Store/configSlice.ts:49,57,76` (`personalization.set`, `devicePrefs.save`, `citations.set`), `Store/chromeSlice.ts:79,86` (`subfield.set`, `navViewModes.set`), `Store/renameSlice.ts:198,200` (`schema.rename`, `showError`), `Settings/TrashFrame.tsx:78,108` (`listTrash`, `mutate`).

##### Grade C (neutral as written)

`store.ts`, `treeIndex.ts`, `Store/sessionState.ts`, `Navigation/navRecents|navResolve|navSearch|thumbMarkers|useNavData.ts`, `Tabs/tabsModel.ts` (`crypto.randomUUID` is web-standard), `Sidebar/disclosureState.ts` (Storage is a parameter), `Sidebar/sidebarDnd.tsx` and `sidebarDndModel.ts` (pointer events, DOM rects; touch-capable), `Settings/ClearActionRow.tsx`, `Actions/selection|destinationTree|linkResolve.ts`, `Actions/RenamableTitle.tsx`, all `.css` (though `tab-base.css:244-252` and `Sidebar.css:13,38,81` key off `.shell`/`.app-toolbar` hover, which a touch host never fires).

---

### 8. Folder Verdicts and the Proposed Tree

| Folder | Verdict | Admission rule a future file must meet |
|---|---|---|
| `Store/` | **Dissolve.** `sessionState.ts`, `nexusSlice`, `configSlice`, `cacheSlice`, the mutation slice, and the neutral half of `chromeSlice` → `Session/`; `navigationSlice` → `Navigation/`; `windowSlice` → `Shell/Windows/`; layout half of `chromeSlice` → `Shell/layoutSlice.ts`; `tabState.ts` split into `Navigation/warmTabs.ts` + `Session/pageDetailCache.ts`. | A slice file exports one `create<X>Slice: Slice<XSlice>` and is spread once in `Session/store.ts`; it lives in the folder whose pure model it imports. |
| `store.ts`, `treeIndex.ts` (root) | **Move** into `Session/`, with `Actions/selection.ts` and `Actions/destinationTree.ts`. The barrel exports every selector and constant the outside reads; nothing imports a slice file directly. | `Session/` holds the open Nexus as the renderer sees it: the store composer, tree-wide derivations cached per tree, and the slices every surface reads. A new tree lookup is another projection in `treeIndex.ts`, never its own walk. |
| `Navigation/` | **Keep, absorb `Tabs/`.** `useNavThumbnails` → `Shell/`; `NavRowMenu` and `runTabMenu` bodies → `Shell/Menus/`. | Recents, pins, favorites, search, tabs, per-tab history, and any component whose rows are `ResolvedNav` or `Tab`. A pane-filling surface that composes these (`NavView`, `NavWindow`) lives with its pane. |
| `Tabs/` | **Dissolve into `Navigation/`.** | (none) |
| `Sidebar/` | **Rename to `Shell/Sidebar/`.** Generic slot math (`nextOrder`, `slotInGroup`, `MeasuredRow`) → `Interactions/reorderModel.ts`; `AgendaMode` inlined. | The left region: the tree browser, its modes, the Ribbon, the Nexus avatar, and the drag model specific to the tree's rows. |
| `Settings/` | **Rename to `Shell/Settings/`.** `IconPicker` + `iconFavorites` → `Session/Bound/`. | The Settings window and the frames its `FRAMES` roster mounts. A new preference is a row in `FRAMES`; a new frame kind is a `Surface` entry. |
| `Actions/` | **Dissolve.** `commands` → `Interactions/`; `selection`, `destinationTree` → `Session/`; `linkResolve` → `Properties/Assignment/`; `connectionMenu`, `pageMenuActions`, `nativeMenus` → `Shell/Menus/`; `openWebLink` → `Shell/Windows/`; `RenamableTitle` → `Session/Bound/`. | (none) |
| `Showcase/` | **Split out** as its own workspace once `SETTINGS_WIN`/`SETTINGS_RAIL` leave `SettingsWindow.tsx`; or delete. | Renders design-system sources; imports nothing that imports the store. |

#### The scope in the new layout (non-test lines, in-scope files only)

```
Session/                              ~1,270
  store.ts                              49   composer + barrel + useEmbedScale/useAssetUrl
  sessionState.ts                       21
  nexusSlice.ts                        263
  configSlice.ts                        78   (+ setAssetDirectory/setExclusions from cacheSlice)
  cacheSlice.ts                        ~95
  mutationSlice.ts                     207   (renameSlice renamed; rename fence, icon target, peek, valuesEpoch)
  chromeSlice.ts                       ~80   (askConfirm, notify, subfield, nav view modes)
  treeIndex.ts                         312
  selection.ts                          44
  destinationTree.ts                    30
  pageDetailCache.ts                   ~75   (from tabState: detail slot, fetch, body epoch, fenceWarm)
  Bound/
    NexusIconPicker.tsx                 10
    useIconFavorites.ts                 16
    RenamableTitle.tsx                  53
    (EntityIcon, useNexusIcon, AssetImage arrive from Utilities/ and Assets/)

Navigation/                           ~2,650
  navigationSlice.ts                   814
  tabsModel.ts                         318
  navRecents.ts                         55
  navResolve.ts                         61
  navSearch.ts                         ~30   (fuzzyScore leaves)
  thumbMarkers.ts                       19
  warmTabs.ts                          ~60   (from tabState: captureCache/readCache/dropCacheTab)
  useNavData.ts                         98
  NavList.tsx                         ~190   (NavRowMenu leaves)
  NavGallery.tsx                       151
  TabBar.tsx                          ~330   (bar drag/zoom + runTabMenu leave)
  nav-list.css                          33
  nav-gallery.css                       10
  tab-base.css                         254

Shell/                                ~4,560 in-scope (+ Toolbar 1,040, Windows 2,739, InspectorPane from out of scope)
  App.tsx                              292
  layoutSlice.ts                       ~80   (pane widths, sidebar/ribbon visible, settingsOpen, iterationOpen)
  useNavThumbnails.ts                   81
  Sidebar/
    Sidebar.tsx                        ~920  (AgendaMode inlined)
    sidebar.css                         284
    Ribbon.tsx                          117
    NexusPhoto.tsx                       67
    nexus-header.css.ts                  22
    sidebarDnd.tsx                      301
    sidebarDndModel.ts                 ~120  (buildIndex, Entry, Index, setContainerOf, isSelfOrDescendant)
    disclosureState.ts                   49
  Settings/
    SettingsWindow.tsx                  946
    settingsBounds.ts                   ~6   (SETTINGS_WIN, SETTINGS_RAIL)
    AssetDirectoryRow.tsx                40
    ExcludedDirectoriesRow.tsx          148
    exclusion-rows.css.ts                44
    ClearActionRow.tsx                   45
    settings-window.css                  42
    TrashFrame.tsx                      332
    trash-frame.css                     104
  Windows/
    windowSlice.ts                      316
    openWebLink.ts                       12
    (window-base, PageWindow, NavWindow, WebWindow, PageHistoryWindow, confirmations arrive from Windows/)
  Menus/
    connectionMenu.ts                   129
    pageMenuActions.ts                   44
    nativeMenus.ts                       24
    navRowMenu.ts                       ~75   (from NavList)
    tabMenu.ts                          ~20   (from TabBar)
    sidebarContextMenu.ts               ~20   (showContextFor from Sidebar)
    trashMenus.ts                       ~60   (from TrashFrame)

Interactions/                         +~100
  commands.ts                           49
  reorderModel.ts                      ~50   (nextOrder, slotInGroup, MeasuredRow)

Properties/Assignment/
  linkResolve.ts                        14

Testing/fixtures/
  tree.ts                               65   (testTree)

Showcase/  → separate workspace     3,197
```

#### Collapsing the renderer's folders to ten

Today: 23 folders plus nine root files (`App`, `main`, `store`, `treeIndex`, `nativeCaret`, `styles.css`, `Carets.css`, `text-selection.css`, `env.d.ts`). Proposed:

| # | Folder | Absorbs | Approx. lines | Admission rule |
|---|---|---|---|---|
| 1 | `DesignSystem/` | `Animation/` (motion tokens and presence hooks), `Cards/` (card chassis used by NavGallery and Views) | ~8,300 | Store-free visual primitives, tokens, pickers, menus, glass, motion. Anything importing `useSession` is refused. |
| 2 | `Interactions/` | `Actions/commands.ts`, `Sidebar/sidebarDndModel`'s generic half | ~3,700 | Input engines and their pure models: drag, gesture, resize, dismissal, keyboard, reorder math. No store. |
| 3 | `Session/` | `store.ts`, `treeIndex.ts`, `Store/` (neutral slices), `Actions/selection|destinationTree`, `Assets/`, `tabState`'s detail half, `Interface/pageFlush` + `Tiles/pageTileWrite` (the save scheduler), `Bound/` widgets from `Utilities/`, `Settings/IconPicker`, `Actions/RenamableTitle` | ~3,200 | The open Nexus as the renderer holds it, and primitives bound to it. |
| 4 | `Navigation/` | `Tabs/`, `navigationSlice`, `tabState`'s tab half | ~2,700 | Wayfinding: recents, pins, favorites, search, tabs, history, and the list/gallery/bar components that render them. |
| 5 | `Shell/` | `App.tsx`, `Sidebar/`, `Toolbar/`, `Windows/`, `Settings/`, `Interface/InspectorPane|NotificationLabel|InterfaceScaffold`, `windowSlice`, `layoutSlice`, `Menus/` (all native-menu adapters), `Utilities/iteration-window`, `nativeCaret.ts`, `styles.css`/`Carets.css`/`text-selection.css` | ~11,000 | The desktop window's regions, chrome, floating windows, and every renderer-side native affordance. The folder a mobile host replaces wholesale. |
| 6 | `Content/` | `Interface/` minus what moved: `ContentView`, `PageView`, `ContainerView`, `SpaceView`, `HomepageView`, `NavView`, `Banner`, `Subfield/`, `Glance/`, `scope.ts`, `restoreSnapshot`, `notifications` | ~2,700 | A surface that fills the center pane for one selection or tab target, and its banner/subfield chrome. |
| 7 | `Views/` | `Frames/` (view-settings frames), `Tables/` (table tokens and styles) | ~12,800 | The Collection view pipeline, its renderers, and the frames that edit a view. |
| 8 | `Properties/` | `Actions/linkResolve.ts` | ~3,900 | Property schema editing and value assignment. |
| 9 | `MarkdownPM/` | (unchanged) | ~14,000 | The editor. |
| 10 | `Tiles/` | (unchanged, minus `pageTileWrite`) | ~4,100 | Embedded surfaces and their documents. |

`Showcase/` becomes its own workspace; `Testing/` (harnesses and fixtures) moves to a `test/` root beside `src/` so the renderer tree lists only shipped code. `Shell/` is large, and deliberately so: it is the one folder whose contents are desktop-shaped, so the Capacitor host's question "what do I rewrite" has a one-word answer. Whether `Shell/` later moves from the UIX workspace into the Desktop workspace is a workspace-boundary decision this scope does not force; keeping it as one folder makes that move one move.

---

### 9. Files That Belong to a Different Scope

- **`Navigation/navSearch.ts:fuzzyScore`** is imported by `Settings/TrashFrame.tsx:19` to rank trash rows. A subsequence scorer has nothing to do with navigation; `src/shared/` (pure, both processes) or `DesignSystem/Util/` is its home. `filterNav` stays.
- **`Navigation/nav-list.css`** is imported by `Settings/TrashFrame.tsx:21` for `.nav-search-row` and `.nav-list`. A search row over a list is a menu-surface pattern; it belongs with `DesignSystem/Menus/`, named without `nav-`.
- **`Sidebar/sidebarDndModel.ts`**: `nextOrder`, `slotInGroup`, `MeasuredRow` are imported by `Frames/frameDnd|frameDndModel|hiddenFrameModel|GroupFrame` and `Views/BandDnd|bandDndModel|CardsView|TableView`. That is the reorder engine's model wearing the sidebar's name; `Interactions/reorderModel.ts`, as the Context doc already rules.
- **`DesignSystem/Util/moveItem.ts`** and **`capMap.ts`** are pure array helpers consumed by `navRecents`, `tabsModel`, `Windows/windowTabs`, `tabState`. They are not design-system; `src/shared/` is where a helper both processes could use belongs.
- **`Store/tabState.ts`** is imported by ten files that never touch `store.ts` (`Interface/GlancePane|InterfaceScaffold|PageView|pageFlush`, `Tiles/PageTile|tileCache`, `Windows/PageHistoryWindow|PageWindow|useWindowWarm`). It is the renderer's page-detail cache and the save scheduler's write-through target; it belongs in `Session/` under that name, with the per-tab warm entries split off to `Navigation/`.
- **`Store/chromeSlice.ts:39,53`** `SIDEBAR_WIDTH`/`INSPECTOR_WIDTH` are layout knobs read by `App.tsx:65-66,72-73`; they belong with the shell layout, not a store file.
- **`Store/navigationSlice.ts:59,575`** imports `crumbDepthFor` from `Interface/Subfield/crumbs.ts` and computes breadcrumb dimming inside `select`. That is Subfield presentation state living in the navigation model; the Subfield can derive it from `selection` and its own last-deepest memory.
- **`Store/cacheSlice.ts:105-108`** `setAssetDirectory`/`setExclusions` are settings writers; they belong beside `setPersonalization` in `configSlice`.
- **`Store/renameSlice.ts:46-55,181-206`** `renamingProperty`, `valuesEpoch`, `bumpValuesEpoch`, `bumpContainerValues`, `submitPropertyRename` are Properties mutation signals sharing a file with the rename fence because both are "renames". The slice is the mutation-gesture slice; name it so, or move the property half to `Properties/`.
- **`shared/mutate.ts:122`** `RenameHost = 'detail' | 'sidebar'` puts two renderer surface names in the cross-process contract; main only relays it back (`onBeginRename`). A renderer-owned type would keep the contract free of shell vocabulary.
- **`Settings/IconPicker.tsx`** + **`iconFavorites.ts`**: fifteen importers, none in Settings; `Session/Bound/NexusIconPicker`.
- **`Actions/linkResolve.ts`**: six importers, all Link-property cells; `Properties/Assignment/`.
- **`Actions/openWebLink.ts`**: imports `Windows/WebWindow`; belongs beside it.
- **`Navigation/testTree.ts`**: zero non-test importers (three tests); a fixture in shipped source. `Testing/fixtures/`.
- **`Showcase/Leaves/PanesLeaf.tsx:8`** imports `Settings/SettingsWindow` for two constants and thereby bundles the store graph into the showcase. Two-line fix: `Shell/Settings/settingsBounds.ts`.
- **Export hygiene:** `Tabs/tabsModel.ts:11` `NEWTAB` is exported with no external importer; `Sidebar/disclosureState.ts:6` `DISCLOSURE_KEY`, `Settings/TrashFrame.tsx:34,46` `countPhrase`/`filterRows` are exported only for their tests. Test-file casing does not match source: `Actions/Commands.test.ts` ↔ `commands.ts`, `Store/TabState.test.ts` ↔ `tabState.ts`.
- **`Sidebar/Sidebar.css`** is imported globally by `main.tsx:15` and again by `Sidebar/Ribbon.tsx:6`; one sheet, two import sites.
- **`Utilities/`** is a second junk drawer: `EntityIcon` (store-bound, imports `Navigation/navResolve`'s `ResolvedNav`), `useNexusIcon` (store-bound), `iteration-window` (dev tool on the window chassis). The first two are `Session/Bound/`; the third is `Shell/`.
- **`Cards/`** (308 lines, two files) is the card chassis used by `NavGallery` and `Views`; it is a design-system primitive filed as its own top-level folder.

---

### Summary

The scope is 8,367 non-test lines across two root files and six folders, plus the 3,197-line Showcase. `Store/` is a filing-by-kind folder whose slices already import their feature's models; dissolve it, keep one `Session/store.ts` composer, and place `navigationSlice` in `Navigation/`, `windowSlice` and the layout half of `chromeSlice` in `Shell/`. `tabState.ts` is a second store bypassing the first and holds two concerns; split it. `Navigation/` and `Tabs/` are one domain by import graph and shared `navKey` identity; merge them. `Sidebar/` is a window region, not wayfinding; under a `Shell/` (regions and chrome) versus `Content/` (center-pane surfaces) split of today's `Interface/`, Sidebar, Ribbon, Toolbar, Windows, and the Settings window all land in `Shell/`, which becomes the folder a Capacitor host replaces. `Actions/` is a junk drawer hiding one real seam, the renderer half of native menus, which recurs in six other files and deserves a single `Shell/Menus/`. `Settings/` is a window; its two icon-picker files are nexus-bound primitives with fifteen external importers and belong in `Session/Bound/`. Showcase imports the app store transitively through two Settings constants; fix that and it is a separable workspace. The 23 folders collapse to ten: DesignSystem, Interactions, Session, Navigation, Shell, Content, Views, Properties, MarkdownPM, Tiles.
