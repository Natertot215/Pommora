## A16 — Renderer Shell: Dead, Stale, and Obsolete

**Scope:** `src/renderer/Store/`, `store.ts`, `treeIndex.ts`, `Navigation/`, `Tabs/`, `Sidebar/`, `Settings/`, `Actions/`, `Showcase/`. Read-only; evidence is `file:line` against the working tree at `7c7c7542`. Line counts exclude comments and tests. "Zero importer" means no non-test importer outside the defining file; "Showcase-only" means the only importer is under `Showcase/` (dead for the app). Method: an export→importer map over every `.ts/.tsx` under `src` (`scratchpad/expmap.txt`), a per-store-key reader census, a per-Personalization-key reader census, and `git log -S` to date when callers left.

### 1. Zero-Importer Exports

#### Entirely Unused (No Caller Anywhere)

| Where | What | Why dead | Lines | Conf. | If wrong |
|---|---|---|---|---|---|
| `Store/chromeSlice.ts:25,129` | `openSettings` | Zero callers in `src`. `toggleSettings`/`closeSettings` carry the window. Caller removed in `bfc175ea` (08-10-2026). | 2 | High | Nothing; no caller exists to break. |
| `Store/windowSlice.ts:41,196` | `setNavOverride` | Zero callers. Its one caller was added and removed on 07-17-2026 (`1aa34f11` → `85a10c1e`). Downstream vestiges: `shared/types.ts:548 navOverride?`, `main/IO/windowState.ts:47` reads it from disk, `Navigation/NavList.tsx:67` tests `st.windowsFile.navOverride ?? true`, which is always `true` because nothing writes it. | 4 | High | A hand-edited `windows.json` carrying `navOverride:false` would stop steering "Open in Window" into a NavWindow tab. No UI can produce that file. |
| `Store/chromeSlice.ts:19,115-118` | `setSubfieldOrder` | `git log -S'setSubfieldOrder('` is empty: it has never had a caller in any commit. `subfieldOrder` is read (`Interface/Subfield/Subfield.tsx:24`) and loaded from disk (`nexusSlice.ts:96`) but has no in-app writer, so the persisted `order` is a disk-only knob. | 5 (action); ~8 more if the key goes too | High (action), Medium (key) | If reordering the Subfield is planned, keep the key and add the UI; the action alone is still dead until then. |
| `Store/windowSlice.ts:35,43,177-195,242-245` | `openNavWindow`, `openNav` | Neither has a reader outside the slice; `openNav` is reached only from `toggleNav` (:253), `openNavWindow` only from `openNav` (:244). Two public actions for one gesture. | 6 (collapse into `toggleNav`) | Medium | Nothing external; both are slice-internal today. |
| `Store/windowSlice.ts:49,259` | `browserSeq` | State key with no reader; a monotonic counter whose sibling `windowSlideSeq` (:67) is a closure variable. Same job, two storage strategies. | 3 | Medium | Nothing; the seq is folded into `browserSummon`. |
| `Store/configSlice.ts:16,69-77` | `setCitationsShown` | Public on the interface; the only caller is `setCitationsVisible` in the same slice (:67). | 2 | Medium | Nothing external. |
| `Navigation/useNavData.ts:18-22` | `SearchResult` | Exported interface, zero importers. See §5A: the `resolved: null` branch it exists for is unreachable. | 5 | High | — |
| `store.ts:15` | `export type { SessionState }` | Zero importers; every consumer imports from `Store/sessionState`. | 1 | High | — |
| `store.ts:14` | `export type { SelectTarget } from '@shared/types'` | A shared type laundered through the store; one consumer, `Interface/Subfield/crumbs.ts:4`, which should import `@shared/types` directly. | 1 | High | — |
| `store.ts:16` | `PageSlot` re-export | Only `store.test.tsx` imports it via `store.ts`. | 1 | High | Test import path changes. |
| `Tabs/tabsModel.ts:148-151,198-202,248-253` | `OpenResult`, `CloseResult`, `ReconcileTabsResult` | Exported interfaces with zero importers; used only as return types of their own functions. Inline as return-type literals. | ~10 net | Medium | — |
| `Tabs/tabsModel.ts:11` | `NEWTAB` | Exported; only internal use (`newTabTab`, :145). | 0 (drop `export`) | High | — |

#### Export-Only-For-Tests (Code Alive, `export` Keyword Dead)

`Store/tabState.ts:9 CacheEntry`, `:40 cachePageDetail`, `:113 readBodyEpoch`, `:115 subscribeBodyEpoch`; `treeIndex.ts:250 pagesOf`; `Sidebar/disclosureState.ts:6 DISCLOSURE_KEY`; `Sidebar/sidebarDndModel.ts:8 Kind`; `Settings/TrashFrame.tsx:34 countPhrase`, `:46 filterRows`; `Actions/connectionMenu.ts:94 LinkCellAction`. Zero removable lines; they widen the public surface for test reach only. High confidence.

#### Fixture In a Source Folder

`Navigation/testTree.ts` (65 lines) is imported only by `navResolve.test.ts`, `navSearch.test.ts`, `treeIndex.test.ts`. `renderer/Testing/` already exists for exactly this (`editorHarness.ts`, `pointerHarness.ts`, `propsAtRoot.ts`, `setup.ts`). Removable from source: 65 lines (move). High.

#### Showcase-Only

- `Settings/SettingsWindow.tsx:63-64` `SETTINGS_WIN`, `SETTINGS_RAIL` — exported solely so `Showcase/Leaves/PanesLeaf.tsx:8` can replicate the window; app use is file-internal. 0 lines (drop `export`), High.
- `Showcase/` as a whole: 28 files, ~2,550 lines TS/TSX plus `showcase.css` (648) and `Lab/interactions.css` (281) ≈ 3,480 lines. No importer outside the folder (`rg Showcase` over `src` excluding the folder returns nothing); it is its own Vite entry (`vite.config.ts` inputs `design-system.html`, `interactions.html`). `Showcase/Lab/` (Board, Interactions, Surfaces, main ≈ 760 lines with CSS) is a second sub-app whose `interactions.html` `vercel.json` does not even rewrite to. It pulls `@renderer/Tiles/Core/*`, `@renderer/Tiles/TileGrid`, `@renderer/Windows/window-base`, `@renderer/Settings/SettingsWindow`, `@renderer/Properties/Assignment/formatValue`, and the DesignSystem — meaning a monorepo split has to keep those app modules reachable from a browser build. High that it is dead for the app; what breaks is the Vercel site.

### 2. Retired-Feature Remnants

**Swift parity:** verified none. The only `Swift` hits are code-language entries (`MarkdownPM/Editor/codeHighlight.ts:34`, `codeGlyphs.ts:40`, `Detect/codeLangs.ts:21`). Negative finding.

**Agenda sidebar mode.** `Sidebar/AgendaMode.tsx` (8 lines) renders a static `<div>No tasks or events</div>`. `8be1cc7e` (07-31-2026) "the interim read surface leaves — the mode slot stays inert" removed the read surface and left the slot. Plumbing that exists only to reach it: `Sidebar/Ribbon.tsx:10,14,17,21` (agenda key, `calendar` icon, default order), `Sidebar/Sidebar.tsx:38,861,864,867` (`agendaLayer`), `shared/types.ts:90` (`'agenda'` in `SidebarMode`), `main/readNexus.ts:97` (accepts `'agenda'`), and `Sidebar/AgendaMode.test.tsx` (38 lines testing a static div). Removable: 8 + ~8 scattered = ~16 lines (+38 test). High that it is a placeholder for nothing; Medium that deletion is the right move rather than leaving a slot. If wrong: a persisted `sidebarMode: 'agenda'` coerces to `undefined` → `collections` at `readNexus.ts:96-97`; the ribbon loses a tab.

**Compact tab density.** `Tabs/tab-base.css:145-150 .tabs-compact` is defined; `Tabs/TabBar.tsx:196` hardcodes `'tabs-standard'`; nothing toggles compact (`Checkbox size="compact"` at `TrashFrame.tsx:317` is a component size, unrelated). One density has ever been applied. Removable: 6 lines (+11 if `.tabs-standard`'s vars fold into `.tab-bar`). High.

**Disk-persisted settings with no writer.** `windowsFile.navOverride` (§1) and `subfieldOrder` (§1) both round-trip through disk (`main/IO/windowState.ts:47`; `subfield:set` at `chromeSlice.ts:80`) with no in-app writer since 07-17-2026 and never, respectively.

**Settings rows nothing reads:** none. Every `Personalization` key `SettingsWindow.tsx` writes has at least one reader (renderer, main, or the CSS-var table in `DesignSystem/Tokens/personalization.ts:43-77`); the census is in `scratchpad/pkeys.py`. What is stale is `SettingsWindow.tsx:681-692`: two frames (`automations`, `shortcuts`) with `sections: []`, plus `:783-785` rendering "Nothing to set here yet." — rail entries for features that do not exist, shown in the live window. 15 lines. Medium (Nathan may want the rail shape reserved).

**`Store/sessionState.ts` vs `Store/tabState.ts` vs `navigationSlice.ts`:** not an overlap of the kind suspected. `sessionState.ts` (21 lines) is the type intersection that breaks the slice↔store import cycle; `tabState.ts` is module-level caches, deliberately outside zustand. The real triplication is a page's detail living in three places (§4F). Every remaining store key has a reader outside its slice except `renameClaims` (slice-internal by design) and the items in §1.

**"Legacy" naming in scope:** none in code. Stale vocabulary survives only in comments: `Sidebar/sidebarDndModel.ts:159` `// area / topic / project`, `Tabs/tabsModel.ts:108` "(area/topic/project collapse to `context`)" — comments are out of lens; noted because the brief asked.

**`Actions/commands.ts`:** nothing dead. All three `DEFAULT_COMMANDS` keys (`shared/types.ts:297-302`) are matched: `App.tsx:178,181` and `MarkdownPM/Editor/pasteLink.ts:136`.

### 3. One-Reader Indirection

**Corrections to the brief's premises:** `useNavData` has two callers (`Interface/NavView.tsx:20`, `Windows/NavWindow.tsx:41`); `Utilities/useNexusIcon.ts` has two (`Sidebar/NexusPhoto.tsx:25`, `Frames/SettingsScaffold.tsx:36`); `useNavThumbnails` has one (`App.tsx`), which is the normal shape for an app-level effect. `Sidebar/sidebarDndModel.ts` does have importers in its own folder (`sidebarDnd.tsx:14-22`, `Sidebar.tsx:36`) — the Context doc's "zero importers in its own folder" is wrong. Its actual problem is the opposite: `nextOrder` (:120-125) and `MeasuredRow` (:128) are imported by eight files outside `Sidebar/` (`Views/CardView/CardsView.tsx:64`, `Views/bandDndModel.ts:8`, `Views/BandDnd.tsx:10`, `Views/TableView/TableView.tsx:38`, `Frames/frameDnd.tsx:11`, `Frames/frameDndModel.ts:6`, `Frames/hiddenFrameModel.ts:3`, `Frames/GroupFrame.tsx:42`) — generic reorder helpers homed under Sidebar. Misplacement, 8 lines to relocate to `Interactions/`.

| Where | What | Why | Lines | Conf. |
|---|---|---|---|---|
| `Store/cacheSlice.ts:21-25,105-108` | `setAssetDirectory`, `setExclusions` | Store actions that touch no store state — pure passthroughs to `window.nexus.setAssetDir` / `setExclusions`; one reader each (`Settings/AssetDirectoryRow.tsx:13`, `Settings/ExcludedDirectoriesRow.tsx:21`). | 8 | Medium |
| `Actions/selection.ts:42-44` | `reconcileSelection` | One consumer (`navigationSlice.ts:215,338,362`) that already holds `tree`; wraps `reconcileWith(reconcileIndexOf(tree), sel)`. | 3 | Low |
| `Store/windowSlice.ts:56` + `store.ts:19` | `windowTargetOf` | `= deriveTarget(s.pageWindow)`; `Actions/connectionMenu.ts:61` calls `deriveTarget` directly. Two names for one function. | 2 | Low |
| `Navigation/navRecents.ts:9` | `RECENTS_CAP` | Exported and passed explicitly at `navigationSlice.ts:568,598` where it is already the default parameter (:22). | 1 | Low |
| `Navigation/navResolve.ts:45-61` | `resolveRecents`, `resolveFavorites`, `resolvePins` | One caller each (`useNavData.ts:56,64,69`); the first two are byte-identical bodies. See §4. | ~10 | High |

**Negatives:** `Settings/IconPicker.tsx` (10 lines) is the single icon-picker path — `DesignSystem/Pickers/IconPicker` has no direct importer besides `iconFavorites.ts` (type only); fifteen surfaces use the wrapper. Misplaced under `Settings/`, not duplicated. `Actions/nativeMenus.ts`, `linkResolve.ts`, `openWebLink.ts`, `pageMenuActions.ts`, `RenamableTitle.tsx` all have multiple readers.

### 4. Duplicate Definitions

**A. Nav-ref resolution and tree walking.** Four resolvers over the same index: `Actions/selection.ts:16 reconcileWith` (existence + live path), `Tabs/tabsModel.ts:28 liveTarget` (builds a probe, calls `reconcileWith`), `treeIndex.ts:261 livePagePath` (page-only re-path via `pagesByIdOf`; readers `Interface/restoreSnapshot.ts:10`, `Windows/PageHistoryWindow.tsx:51`; equals `reconcileWith(index, {kind:'page',…}).path`), `Navigation/navResolve.ts:29 resolveWith` (display core). `ReconcileIndex` is declared in `Actions/selection.ts:8-13` but constructed only by `treeIndex.ts:164-191`. `livePagePath` removable: 5 lines, Medium.

Separately, `treeIndex.ts:1-5` declares itself "the one owner of every navigation-layer lookup … never its own walk", and three other walkers are consumed from the scoped Store: `Interface/scope.ts` (`findCollection` :20, `findSet` :25, `findCollectionForSet` :43, `isDepth1Set` :67, `findContainer` :105 — recursive walks per call; `navigationSlice.ts:611,617-621` walks the tree three times to select one Set; `:682` and `renameSlice.ts:165` walk for `findContainer`), `Sidebar/sidebarDndModel.ts:29-117 buildIndex` (a full walk into `byId`/depth/parentId, memoized at `Sidebar.tsx:784`, duplicating `treeIndex`'s `nodes` + `parents`), and `Actions/destinationTree.ts:11-20 containerTargets` (a container walk beside `treeIndex.containersByPathOf` :284-294). Consolidation candidates ≈ 60 (scope find*) + 90 (buildIndex) lines; Medium-High that they duplicate, Medium on effort. `destinationTree` is not a nav-ref resolver as the brief guessed; it builds `MoveTarget` trees.

**B. Two search loops, one scorer.** `Navigation/navSearch.ts:40-50 filterNav` and `Settings/TrashFrame.tsx:46-59 filterRows` are the same score→filter→sort loop, rewritten because `TrashRow` is not a `SearchEntry`; both call `fuzzyScore`. 14 lines → one generic ranker. Medium.

**C. Two recents writers.** Store `reorderRecent(activeKey, overKey)` (`navigationSlice.ts:130,541-544`) and store `setRecentsOrder(keys)` (:131,545-553), with `moveByKey` re-done locally at `Interface/NavView.tsx:23-27` and `Windows/NavWindow.tsx:55-61`. NavView list-mode uses `setRecentsOrder` (`NavView.tsx:97-98`); NavView gallery-mode (`NavView.tsx:103-108` passes no `onReorderRecent`) falls to the store `reorderRecent` through `NavGallery.tsx:40-42`; `NavList.tsx:181-183`'s fallback is never reached (every reorderable `NavList` caller passes `onReorderRecent`). One surface, one gesture, two writers depending on view mode. Removable: 4 (`reorderRecent`) + 2 + 2 (fallbacks) = 8 once `setRecentsOrder` is canon. Medium-High. If wrong: NavView gallery reorder needs the local `moveByKey` wiring NavView list already has.

**D. Two move-by-key helpers.** `Interactions/drag.tsx:13-21 reorder(items:{id}[])` and `Navigation/navRecents.ts:38-48 moveByKey(list, keyOf)` both find two indexes and call `moveItem`. `Sidebar/Ribbon.tsx:55-59` wraps string keys into `{id}` objects to satisfy `reorder`. 9 lines (seven `reorder` importers to repoint). Medium.

**E. Drag models.** `Interactions/drag.tsx` (sortable, on `engine.tsx`) and `Interactions/insertionDrag.tsx` (line) are legitimately different engines; the duplication is one level down. `Tables/tableDnd.tsx:100-106` re-implements `sidebarDndModel.nextOrder` and `sameOrder` inline; `tableDnd.tsx:18-26` declares its own `MeasuredRow` beside `sidebarDndModel.ts:128`; `sidebarDnd.tsx:191-228` and `tableDnd.tsx:64-97` write near-identical `take` snapshots. `NavList` (tableDnd) and `NavGallery` (SortableZone) reorder the same pins/recents through different engines. Removable: ~8 (inline order math) + 9 (type). Medium.

**F. Three homes for a page's detail, three raw fetches.** `navigationSlice.pages[id].detail` (:68), `tabState.detailByPath` (:38), `tabState.cache[tabId][navKey].pageDetail` (:13) — three invalidation paths (`patchPagesFor` :773-806 / `keepSlots`, `dropPageDetail` :74, `dropCacheDetail` :81); `tabState.ts:1-4` itself says "Two stores live here". `openPage` is called raw at `navigationSlice.ts:648` (`select`, bypassing `fetchPageDetail`'s in-flight dedup), `:668` (`reloadPage`), and `tabState.ts:56` (`fetchPageDetail`). Structural; flagged, not counted. Medium.

**Negatives.** Web-link decider: one. `main/webGuests.ts:94-98` denies popups and forwards `web:popup`; `App.tsx:139` routes to `openWebLink`; `connectionMenu.ts:38-39` offers explicit window/browser items by design. Selection models: `Actions/selection.ts` is a pure reconcile helper over the store's `SelectionState`, not a second model. Icon picker: §3.

### 5. Defensive Code for Unreachable States

**A. The `extras` path.** `Navigation/useNavData.ts:18-36` (`SearchResult.resolved: ResolvedNav | null`, `splitSearch`), `Navigation/NavList.tsx:175,198,219-225` (`extras` prop, guard, "This result can't be opened" rows), `Windows/NavWindow.tsx:226-227,240`, `Interface/NavView.tsx:40`. `searchEntriesOf` (`treeIndex.ts:223-246`) and `resolveIndexOf` (:195-202) are projections of the same `ix.nodes`, keyed by the same `r.key` (`entry.key === navKey(entry.target) === r.key`), so `resolveWith(resolveIndex, entry.target)` cannot return null for a search hit; task/event kinds never enter the walk. `extras` is always `[]`. Removable ≈ 20 net. High. If wrong: a hit whose kind lacked a resolve entry would vanish instead of rendering inert — only possible if the two projections diverge.

**B. task/event guards.** `navigationSlice.ts:481` (`pinTarget`), `:522` (`addFavorite`), `Tabs/tabsModel.ts:29` (`liveTarget`). No code constructs a `kind: 'task'` or `'event'` ref (grep over `shared`, `renderer`, `main`: only these three guards). Reachable only through `main/IO/navigationFile.ts:18-27 NAV_KINDS`, which admits `'task'`/`'event'` from a foreign `navigation.json` — while `main/IO/tabsState.ts:13 TAB_KINDS` rejects them. Dead from the app, alive from disk. Removable: 3 + 2 (`NAV_KINDS`) + the union members at `shared/types.ts:473`. Medium. If wrong: a foreign file's task refs get filtered at read instead of at pin, which is the better place anyway.

**C. Catches on envelope channels.** The code's own rule (`navigationSlice.ts:289` "The envelope never rejects"; `nexusSlice.ts:92-93` "the envelope channels structurally cannot reject") says `Result` channels cannot reject, yet: `navigationSlice.ts:647-652` try/catch around `openPage` (`Result<PageDetail>`, `shared/bridge.ts:100`); `:669 .catch(() => null)` in `reloadPage`; `:228 .catch` on `tabs:save` (`Result`, bridge :262); `chromeSlice.ts:81,88 .catch` on `subfield:set`/`navViewModes:set` (`Result`, bridge :249,251); `nexusSlice.ts:124-126` three `.catch(() => null)` on `nav:read`/`windows:load`/`tabs:load` (all `Result`, bridge :259,263,261); `windowSlice.ts:93 .catch` on `windows:save` (`Result`, :264). Meanwhile the genuinely raw `subfield:get`/`navViewModes:get` (`nexusSlice.ts:95-100`, bridge :248,250 reply `X | null`) have no catch. The guards sit on the wrong channels. ~10 lines. Medium (rests on main's `envelope` wrapper never throwing synchronously).

**D. Test accommodation in production.** `Store/windowSlice.ts:91 (window as { nexus?: typeof window.nexus }).nexus?.windows?.save(file)` and `nexusSlice.ts:125 window.nexus.windows?.load()`. `windows` is unconditionally defined (`preload/index.ts:115`). The cast exists so `Store/windowSlice.test.ts` — which runs `reconcileWindow` → `saveWindowsFile` with no bridge (`renderer/Testing/setup.ts` stubs no `nexus`) — does not throw; every other slice calls `window.nexus.*` bare. 2 lines. Medium-High.

**E. `?? []` on required arrays.** `NexusTree.collections: CollectionNode[]` and `contexts: ContextGroup[]` are required (`shared/types.ts:427-428`), yet 15 sites guard them: `treeIndex.ts:95,145`, `Interface/scope.ts:17,74`, `Sidebar/Sidebar.tsx:836,840`, `Sidebar/sidebarDndModel.ts:78,83`, `Actions/destinationTree.ts:25`, `navigationSlice.ts:684`, `renameSlice.ts:137`, `Toolbar/SpaceMenu.tsx:152`, and `shared/treePatch.ts:275,425,432`. 0 lines, 15 expressions. High.

**F. Smaller.** `Settings/SettingsWindow.tsx:704 frameFor … ?? FRAMES[0]` — `CategoryKey` derives from `FRAMES`' keys, so `find` cannot miss. `Navigation/NavList.tsx:233-237 canReassign={false} reassign={() => {}}` — required-prop no-ops for a reassign feature a nav list cannot have (2 lines). `chromeSlice.ts:44-51,58-65,101-108` and `disclosureState.ts:15-21,44-48` try/catch around `localStorage` in an Electron renderer (~12 lines, Low). Note also that pane widths persist to `localStorage` while every sibling chrome preference persists through IPC to `nexus.db` (`chromeSlice.ts:77-89`) — an inconsistency, not dead code.

**Reachable, not dead:** the `'adopted-'` guards at `navigationSlice.ts:482-483` and `NavList.tsx:104` — `main/ids.ts:60` mints that prefix for raw folders.

### 6. Obscure or Unnecessary

**Dev tooling shipped in the app.** `Utilities/iteration-window.tsx` (25 lines) is mounted unconditionally at `App.tsx:279` whenever status is `ready`, toggled by the one hardcoded chord in a file that otherwise reads `commands[…]` (`App.tsx:184 matchesCommand('cmd+shift+t', e)`), with three store keys for it (`chromeSlice.ts:28-30,133-135`). ~35 lines to drop from prod or gate behind `import.meta.env.DEV`. Medium. Verdict: a scratchpad has no business in the session store.

**`NavRowMenu` is a component that renders `null`.** `Navigation/NavList.tsx:19-93` performs the context-menu IPC inside an effect, guarded by `opened`/`alive` refs (:28-36) against StrictMode's double effect (`renderer/main.tsx:22`), and is mounted via a `menu` state in two places (`NavList.tsx:184,244`; `NavGallery.tsx:44,79`). `Sidebar/Sidebar.tsx:51-70 showContextFor` does the same job as a plain async function with none of it. ~15 lines. Medium. Read three times: yes.

**Key sniffing for the peek.** `Sidebar/Sidebar.tsx:399-403 Children.toArray(children).filter(c => String(c.key).endsWith(peekId))` — the locked-folder peek finds the newborn by inspecting React keys, which works only because `SetRow`/`PageRow` keys happen to be ids. 5 lines. Low-Medium.

**Ad-hoc lookups beside the index.** `Sidebar.tsx:747 tree.collections.find(c => page.path.startsWith(…))` (owner of a page for `openIn`) and `:798-802` a linear scan over `dndIndex.byId` by path — both answered by `ancestryOf`/a path projection. Low.

**Module singletons beside a store that exists to hold state.** `nexusSlice.ts:38-41`, `navigationSlice.ts:183-187`, `renameSlice.ts:58-61`, `cacheSlice.ts:31-32`, and all of `tabState.ts`. Fine for one window; the "multi-window-ready seams" claim is contradicted by five slice files holding module state. Note for the restructure, not a deletion.

**`fenceWarm` peeks into a payload it declares opaque.** `Store/tabState.ts:95-102` reads `(entry.editorState as { doc?: unknown }).doc` after `:10` calls `editorState` "opaque here, parsed only by the seam". 8 lines. Low.

**Default commands seeded twice.** `configSlice.ts:52` and `main/readNexus.ts:180` both start from `DEFAULT_COMMANDS`; main always overlays and pushes `tree.commands` (`nexusSlice.ts:168`), so the renderer seed only covers the pre-load frame. Low; not removable without a different initial value.

### Totals

**High confidence, removable now (in-app, excluding comments/tests):** `openSettings` 2, `setNavOverride` chain 4, `setSubfieldOrder` action 5, `store.ts` re-exports 3, `testTree.ts` relocation 65, `.tabs-compact` 6, `extras`/`splitSearch` path ~20, `AgendaMode.tsx` 8 — **≈ 113 lines**, plus 10 dead `export` keywords and 15 dead `?? []` expressions (0 lines).

**Medium confidence, removable with a decision:** `openNav`/`openNavWindow` collapse 6, `browserSeq` 3, `setCitationsShown` 2, tabsModel result interfaces ~10, Agenda plumbing ~8, empty Settings frames 15, cacheSlice passthroughs 8, `reconcileSelection` 3, `windowTargetOf` 2, `RECENTS_CAP` 1, `livePagePath` 5, `filterRows` 14, second recents writer 8, `reorder` vs `moveByKey` 9, tableDnd inline order math + type 17, task/event guards 6, envelope catches ~10, `nexus?.` cast 2, `NavRowMenu` ref dance ~15, iteration window ~35, `localStorage` try/catch ~12, NavList no-op props 2 — **≈ 190 lines**.

**Structural consolidation candidates (not counted):** `Interface/scope.ts` walks → `treeIndex` projections ≈ 60; `sidebarDndModel.buildIndex` → projection ≈ 90; the three-home page detail (§4F).

**Dead for the app by definition:** `Showcase/` ≈ 3,480 lines across 28 files plus two CSS files, with ~30 reverse dependencies into app modules that a browser build would have to keep reachable.

### Summary

The renderer shell carries little outright rot but a steady residue of orphaned actions and settled-then-forgotten seams. Three store actions have no caller — `openSettings` (since 08-10-2026), `setNavOverride` (since 07-17-2026, with its `navOverride` setting still round-tripping through disk and defaulting the one read to `true`), and `setSubfieldOrder` (never called in any commit). The nav search's `extras`/"can't be opened" path is provably unreachable: the search and resolve indexes are projections of the same node list. Swift parity is genuinely gone; the Agenda sidebar mode is a deliberate placeholder for a removed surface; `.tabs-compact` is a density nothing applies; `testTree.ts` is a fixture in a source folder. The deeper duplication is structural rather than dead: four nav-ref resolvers, three tree walkers outside a `treeIndex` that claims sole ownership, two recents writers one surface uses interchangeably by view mode, `nextOrder` re-implemented inline in `tableDnd`, and a page's detail living in three caches with three invalidation paths. Defensive code clusters on the wrong side: catches on envelope channels that cannot reject, none on the raw ones, plus a production cast that exists for a test without a bridge stub. High-confidence deletions ≈ 113 lines; medium ≈ 190; Showcase ≈ 3,480 dead-for-app.
