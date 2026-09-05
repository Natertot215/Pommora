## A14 — Renderer Surfaces: Dead, Stale, Obsolete

**Scope:** `src/renderer/Properties/` (60 files, 5,627 lines), `Tiles/` (40, 5,506), `Interface/` (42, 3,982), `Windows/` (22, 3,103). Every path below is relative to `Pommora/src/`. Line counts exclude comments and tests unless stated. Method: a resolver-backed export/importer inventory over all of `src` (relative + `@renderer/*` + `@shared/*` aliases; `*.test.*`, `__fixtures__`, and `Testing/` excluded as importers; `Showcase/` flagged separately), then a full read of every non-test file in scope plus the comparator modules named in the brief.

---

### 1. Zero-Importer Exports (non-test, across all of `src`)

Three classes. Only the first is dead code; the other two are leaked `export` keywords on symbols that are alive in their own file.

#### 1a. Dead in the app (no production importer, no in-file use)

| File:line | Symbol | Lines | Kept alive by | Confidence | Breaks if wrong |
|---|---|---|---|---|---|
| `renderer/Tiles/Core/model.ts:124-146` | `validateLayout` | 23 | `Core/codec.test.ts`, `Core/ops.test.ts` only. `codec.ts:1-4` states the schema already enforces the shape. | High | Two test files need rewriting or deleting. |
| `renderer/Tiles/Core/ops.ts:66-88` | `splitAtTile` | 23 | `Showcase/Leaves/TileLab.tsx` + 4 test files. Production creates tiles via `attachBelow`/`insertBand` (`TileHost.tsx:252,321-322`) and moves via `moveTile`/`moveTileToBand`; nothing splits. | High | TileLab's `demoLayout`/`stressLayout` need another builder; tests. |
| `renderer/Tiles/Core/model.ts:99-110` | `tileIds` | 12 | `validateLayout` (dead above), TileLab, tests. | High | Same as above. |

Total dead: **58 lines**. Removing them makes `Showcase/Leaves/TileLab.tsx` the only production-tree caller; the showcase is out of scope and only has to compile, so either move `splitAtTile`+`tileIds` into TileLab or give TileLab a literal fixture.

#### 1b. Test-only exports (exported so a test can reach them)

`GlancePane.tsx:26,66,70,80` (`GLANCE_DEFAULT`, `glanceSize`, `setGlanceSize`, `glanceWarmSeam`) · `glanceAction.ts:15` (`GLANCE_DWELL`) · `Subfield/subfieldStats.ts:96` (`computeStats`; `pageStats` is the live export) · `Tiles/ViewTileScope.tsx:9,11` (`VIEW_CONFIG_LOCKED`, `ViewTileScopeValue`) · `Tiles/tileKinds.tsx:12,31` (`TileRenderContext`, `TILE_SURFACES`) · `Tiles/useTileDoc.ts:15` (`TileDocSession`) · `Tiles/Core/model.ts:6,12` (`RowNode`, `ColumnNode`) · `Tiles/Surfaces/webRetention.ts:6` (`WEB_RETAINED_MAX`) · `Properties/Assignment/cellResolve.ts:24` (`optionLabel`) · `Properties/Assignment/filePick.ts:41` (`runFilePick`) · `Properties/Editors/CheckboxEditor.tsx:5` (`CheckboxLook`). — 15 symbols, 0 removable lines; none is a defect.

#### 1c. Exported, used only inside its own file, imported by nothing (test included)

`glanceAction.ts:16,59` (`GlanceDwell`, `AnchorWatch`) · `Subfield/subfieldItems.tsx:9,22` (`SubfieldItemId`, `SubfieldItemProps`) · `Subfield/subfieldStats.ts:29` (`PageStats`) · `Interface/viewSettingsScope.ts:5` (`ViewSettingsScope`) · `Properties/Assignment/PropertyPicker.tsx:16` (`optionsOf`) · `cardValueInput.ts:16` (`ADDABLE_TYPES`) · `usePropertyRows.ts:30` (`PropertyRowsPage`) · `valueClick.ts:8` (`ValueClickAction`) · `Editors/NumberEditor.tsx:12` (`NumberLook`) · `Properties/OptionRow.tsx:24,130` (`OptionRow` — mounted only by `OptionSlot` in the same file — and `RowDrag`) · `PropertyTypes.tsx:76` (`PaneTarget`) · `Tiles/Core/edges.ts:4` (`EdgeBoundary`) · `model.ts:37,112` (`NodePath`, `cloneNode`) · `rects.ts:11,16` (`DividerRect`, `BandEdgeRect`) · `webRetention.ts:8` (`WebRetention`) · `TileGrid.tsx:27` (`TileGridProps`) · `ViewTileScope.tsx:24` (`ViewWrite`) · `pageTileWrite.ts:8` (`BodyWriter`) · `tileKinds.tsx:24` (`TileSurface`) · `tileZoom.ts:6` (`ZoomStep`) · `Windows/window-base.tsx:39,48` (`WindowBasePanel`, `WindowBaseProps`) · `Windows/confirmation-window.css.ts:8-11` (`MIN_W`, `MAX_W`, `MIN_H`, `MAX_H` — `ConfirmationWindow.tsx` imports the namespace but reads none of the four). — 30 symbols, 0 removable lines (drop the keyword).

#### 1d. Showcase-only importers

`model.ts:99 tileIds` and `ops.ts:66 splitAtTile` (covered in 1a). No other in-scope export is showcase-only.

---

### 2. Retired-Feature Remnants

#### 2a. The legacy row migration — **clean**

No `legacy|migrat|row migration` hit in any in-scope file, `main/tiles.ts`, or `shared/tiles.ts`. `shared/tiles.ts:13,32 kind: 'row'` is the live layout-node kind, not the migration. Nothing to remove.

#### 2b. SurfacePM/"block" → Tiles/"tile" — residue, not dual paths

- **No "block" identifier survives in scope.** The only hits are `tile-base.css:138` (CSS `display:block` prose) and `WindowTabStrip.tsx:93` (`scrollIntoView({ block })`). Outside scope, `shared/gripMenu.ts:1-21` and `main/gripMenu.ts:1` still say "block grip" in comments, and `.claude/Features/ArchitecturePM.md:108,124` ("block documents", "block-host content folders") and `ConnectionsPM.md:48,62` ("markdown block tiles", "markdown-block healing pass") are stale prose. Doc wording only; non-binding for this audit.
- **`renderer/Tiles/TileHost.tsx:39,299`** — `renderTile as renderSurface`: the import is aliased because three things are named `renderTile` (`tileKinds.tsx:76`, `TileGridProps.renderTile` at `TileGrid.tsx:31`, and TileHost's own callback at `:295`). The alias is rename residue. Removable: 0 lines (rename one). Confidence: high. Breaks nothing.
- **`renderer/Tiles/README.md:42`** — module map lists `TileLab.tsx` as a Tiles file; it lives at `renderer/Showcase/Leaves/TileLab.tsx`. Stale row. Confidence: high.
- **`renderer/Tiles/Surfaces/WebTile.tsx`** (235 lines) is not a tile kind — it is absent from `TILE_SURFACES` (`tileKinds.tsx:31-74`) and its one mount is `MarkdownPM/Editor/embedWidget.tsx:338-339` (lazy import). It is a MarkdownPM embed surface filed under Tiles. The README (`:41`) acknowledges. Misfiled, not dead. Confidence: high. Breaks nothing to move.
- **`renderer/Tiles/tileCache.ts`** (35 lines) — every importer is MarkdownPM (`Editor/embedWidget.tsx:38`, `MarkdownPM/index.tsx:34`); no `Tiles/` file uses it. It caches MarkdownPM embed editor state, not grid tiles. Misfiled; TilesV2-Spec:43 plans to reuse it for inspector tabs, so the filing is deliberate-pending rather than stale.
- **`renderer/Tiles/pageTileWrite.ts`** (54 lines) — a generic debounced body writer; its two instantiations are `Interface/pageFlush.ts:8` (the page autosave) and `Tiles/Surfaces/MarkdownTile.tsx:8`. The name says "page tile", the code is neither. Stale name. Confidence: high.

#### 2c. FloatingWindow.tsx — **gone, no callers, no CSS**

`rg -i 'FloatingWindow|floating-window'` across `src` returns one prose comment (`Windows/window-base.css:1`). `window-panel.css:1` and `window-base.css:40,102` use "floating" as an adjective; `--z-floating` (`theme-vars.css.ts:144`) is a stack-layer token also used by `confirmation-window.css.ts:22`. No class, no import, no selector. Clean.

#### 2d. Two renders of a page's property rows — **measured**

| | `Properties/PageProperties.tsx` | `Windows/PageWindow.tsx` (`PagePanel`) |
|---|---|---|
| Component span | `:31-293` (263 lines) | `:235-507` (273 lines) |
| Significant lines (>12 chars, whitespace-normalized) | 152 | 162 |
| Lines appearing verbatim in the other | **88** (58%) | **88** (54%) |
| Stylesheet | `Properties/page-properties.css.ts:20-58` (39 lines of rules, vanilla-extract) | `Windows/page-window.css:26-88` (63 lines, plain CSS, `.page-window-insp-*`) |

Structurally identical blocks: `editRow` wrapper (`:94-106` ≡ `:296-308`), `rowMenu` (`:119-127` ≡ `:336-344`), the row JSX incl. `PropertyEditor` branch and `Cell({...}) ?? <EmptyValue/>` (`:157-233` ≡ `:361-449`), Add button (`:240-250` ≡ `:453-463`), `PickerMenu` (`:252-280` ≡ `:465-494`), `PropertyValueEditors` (`:281-290` ≡ `:495-504`). Both already share `usePropertyRows`, `PropertyValueEditors`, `PropertyEditor`, `Cell`.

Real divergence: PageProperties keeps every Context row visible until "set aside" (`setAside`, `:45,116,149`); PagePanel shows only assigned rows (`isAssigned`, `:289-294`) — a product difference, not an accident (PageWindow.tsx:285-288 says so). Everything else is copy.

Removable with one row component and one stylesheet: **~170 TSX + ~40 CSS lines**. Confidence: high on the measurement, medium on the figure (the setAside/assigned split must be a prop). Breaks if wrong: nothing structural; the two surfaces would visually converge, which is the stated goal (`ContextPM.md:65`).

#### 2e. Interface/Glance — **complete, not scaffolding**

`GlancePane.tsx` (435) + `glanceAction.ts` (100) + `glance-pane.css` (52) are fully wired: `MarkdownPM/Connections/index.ts:64-65` (`glanceLink` → `armGlance`), `MarkdownPM/Editor/pointerPath.ts:62,109,141` (cancel/close), `Editor/links.ts:60` (`insideGlance`), `Tables/cellStatic.tsx:253-265` and `Tables/MarkdownTable.tsx:554-612` (close/cancel/inside), and four hosts pass `glance: glanceLink` in their `ConnectionsApi`. Both page and site targets render. Mounted once in `App.tsx:282`.

The one piece of forward scaffolding is the multi-host generality the Context doc's "Glance Hosts" pending item describes: `glanceAction.ts:15-16` `GLANCE_DWELL = { link: 1000 }` has one row, `GlanceDwell` one member, and `armGlance(target, el, dwell)` (`:36`) receives `'link'` from its only caller (`Connections/index.ts:65`). ~4 lines of speculative generality; deliberate per `ContextPM.md:19`. Confidence: high that it is single-use today. Breaks if removed: the pending Glance Hosts item re-adds it.

Separately, `GlancePane.tsx:87-94` hand-rolls an insertion-order cap (delete → set → while-loop evict) that PM-126 (`ContextPM.md:91`) collapsed elsewhere onto `capSet` (`DesignSystem/Util/capMap.ts`, used at `Store/tabState.ts:28,41`, `webRetention.ts:18`, `docCache.ts:35`). This one survived. Removable: 6 lines → 1 `capSet` call. Confidence: high.

#### 2f. Inspector tab-strip scaffolding for TilesV2 — **an empty pane ships today**

- `renderer/Interface/InspectorPane/InspectorPane.tsx:8-16` renders a `GlassPane` whose only child is `<div className="inspector-body" />`. Nothing ever mounts into it (`rg inspector-body` → the component and its CSS only).
- It is nonetheless fully plumbed: the toolbar toggle opens it (`App.tsx:61,221`), opening pushes content (`styles.css:98-101` sets `--inspector-clearance`, read by `Interface.css:21,52,71-81`, `content-banner.css:91`, `nav-view.css:32`, `subfield.css` via `--content-start-right`), a resize strip appears (`App.tsx:283-287`, `inspector-pane.css:24-29`), and its width persists to `localStorage` (`Store/chromeSlice.ts:53-65,99-107`, key `pommora.inspectorWidth`). `Navigation/useNavThumbnails.ts:16` even measures `.inspector-glass`.
- `shared/tiles.ts:175,177` `MAX_INSPECTOR_TABS`, `INSPECTOR_STATE_KEY` — zero importers (out of scope; noted because TilesV2-Spec:41 names them as "declared and unread").
- The spec's tab strip ("on the `WindowTabStrip` precedent", TilesV2-Spec:49) does not exist; `WindowTabStrip.tsx` is live for windows only.

In-scope scaffolding: **46 lines** (`InspectorPane.tsx` 17 + `inspector-pane.css` 29); ~35 more in `App.tsx`/`chromeSlice.ts` outside scope. Whether to remove it is a product call — `InterfacePM.md:7,82` calls it "reserved". Confidence: high that it is a shipped no-op. Breaks if removed: the `--inspector-clearance` consumers keep working (the var defaults to 0 when the class is absent); `useNavThumbnails.ts:16` needs a null-safe fallback (it already uses `?.`).

- **`renderer/Windows/WindowActions.tsx:13-19`** — a `disabled` Settings button with no handler, mounted in every Page Window and NavWindow toolbar (`PageWindow.tsx:197`, `NavWindow.tsx:157`). `InterfacePM.md:54` calls it "a parked Settings glyph". 7 lines of dead affordance. Confidence: high. Breaks if removed: `window-base.css:25 --slide-cluster-w: 36px` (KNOB) and the `:3` comment are sized for the pair; retune to one button.

---

### 3. One-Reader Indirection

| File:line | What | Why it is indirection | Removable | Confidence | Breaks if wrong |
|---|---|---|---|---|---|
| `Interface/ContainerView.tsx:6-12`, `HomepageView.tsx:8-22`, `SpaceView.tsx:7-24` | Three components each mounted once from `ContentView.tsx:32-56` (`DetailView`); each is `InterfaceScaffold` + one host. `scope.ts:89-98 containerOwner` exists solely for ContainerView. | Three files to express three `switch` arms. | ~25 lines (inline into `DetailView`) | Medium | Nothing; `HOMEPAGE_HOST` and the `useMemo` host literal (`SpaceView.tsx:9`) must survive the inline (tile memo identity). |
| `Interface/restoreSnapshot.ts:8-17` | One 9-line function, one importer (`PageHistoryWindow.tsx:13`). | A file for a helper its one caller could hold. | ~8 lines (net, after inline) | Medium | Nothing. |
| `Interface/viewSettingsScope.ts` | **Not a context provider** (correcting the brief): a pure `switch` over `selection.kind`. Two importers: `Frames/SettingsMenu.tsx:18` (real) and `Toolbar/OutlineMenu.tsx:32`, which tests `viewSettingsScope(selection) !== 'page'` — identical to `selection.kind !== 'page'`. | Effectively one consumer. | 0 net (OutlineMenu drops the import) | High | Nothing. |
| `Interface/scope.ts` | **Not a context provider**: a helpers module with 7 exports and 10+ importers across Store/Toolbar/Views/Tiles. Only `containerOwner` (`:89`) is single-reader. `allCollections` (`:16-18`) wraps `tree.collections ?? []` on a non-optional field (`shared/types.ts:428`). | The wrapper is a dead guard in a hat. | 3 lines | High | Nothing. |
| `Tiles/ViewTileScope.tsx` | **Is** a context; Provider mounted once (`ViewTile.tsx:490`) but `useViewTileScope` is consumed by `useSaveView` (11 importers), `Views/useActiveView.ts:16`, `Frames/SettingsFrame.tsx:168-311`, `Toolbar/ViewFrame.tsx:21`. | Legit multi-consumer. | 0 | High | — |
| `Properties/useOptionReorder.ts:10-39` | Adapter with one importer (`Editors/OptionEditor.tsx:23`) over `useStatusReorder`; 39 lines to pass `[{ id: 'flat', values }]` and rename `drop.top` → `lineTop`. | The flat list is the one-group case; the adapter is the second implementation the comment says it isn't. | ~25 lines | Medium | OptionEditor calls `useStatusReorder` directly with a one-group array and registers the container as the group. |
| `Properties/OptionRow.tsx:24-128` + `:136-162` | `OptionRow` is mounted only by `OptionSlot` in the same file; `OptionSlot` spreads every prop through. | Two components, one mount. | ~12 lines | Medium | Nothing. |
| `Properties/Editors/date-time-editor.css.ts` (3 lines, 1 class, 1 importer) · `Properties/option-row.css.ts` (8 lines, 1 class, 1 importer) | Stylesheet files holding one class each. | File-per-class. | ~8 lines (fold into `number-editor.css.ts` / `OptionRow`'s neighbor) | Medium | Nothing. |
| `Interface/action-band.css.ts` (122 lines) | Header (`:1-2`) claims a "shared home for toolbar-row affordances any surface can mount"; every one of its 10 exports has exactly one importer: `Tiles/Surfaces/ViewTile.tsx` or `view-tile.css.ts`. | A "shared" band with one host, filed under Interface/. | 0 net (relocate beside `view-tile.css.ts`, or merge) | High | Nothing. |
| `Properties/Assignment/statusCycle.ts` (24 lines) | Both exports imported only by `OptionChip.tsx:6`. No cycling exists: the status cycle-on-click shipped in `84987a43`/`46dd3f7c` and is gone; `sharedValueClickAction` (`valueClick.ts:18-31`) has no cycle arm; `CardValue.tsx:91` still says "cycle/toggle/picker". | Misnamed one-reader module. | ~6 lines (fold into OptionChip) | High | Nothing. |
| `Properties/linkFormat.ts` (11 lines) | A 4-line picker-options constant with 2 importers (`URLEditor.tsx:5`, `Settings/SettingsWindow.tsx:21`). **Not** a duplicate of `shared/linkValue.ts` (value parsing) — different job. | File for one constant. | ~5 lines (move beside `LINK_DISPLAY_LABELS` in `shared/properties` or into `PickerControl`) | Medium | Nothing. |
| `Properties/Assignment/valueUndo.ts` (29 lines) | One importer (`Views/TableView/TableView.tsx`). A module-level ⌘Z stack with its own `keydown` listener. No other value-undo mechanism exists in `Store/`, `Actions/`, `Interactions/`, so it is not a duplicate — just single-reader. | — | 0 | High | — |
| `Windows/windowMorph.ts` (15 lines) | Module-level `DOMRect` stash; 2 importers (`Store/windowSlice.ts:183`, `NavWindow.tsx:70`). Could be a `windowSlice` field. | Store-adjacent state outside the store. | ~5 lines | Low | Nothing. |

---

### 4. Duplicate Definitions

| Pair | Verdict | Evidence | Removable | Confidence |
|---|---|---|---|---|
| **Two property-value renderers** | **One renderer** (`Properties/Assignment/Cell.tsx`). `Views/CardView/CardValue.tsx:206` and `TableView.tsx:1708` mount it as JSX; `PageProperties.tsx:220` and `PageWindow.tsx:432` call `Cell({...}) ?? <EmptyValue/>` **as a plain function** to null-test the result. The "two renderers" are the two row surfaces in §2d. `LinkCell` is Cell's url branch. | `rg "Cell\(\{"` → exactly those two call sites. | 0 (fix the call form, see §6) | High |
| **`ConnectionsApi` built four times** | `TileHost.tsx:147-161`, `PageView.tsx:104-118`, `PageWindow.tsx:107-118`, `NavWindow.tsx:131-142` — the same 12-line `useMemo` (`pageIndexOf(tree)` spread + `open`/`bypass`/`glance: glanceLink`/`menu: showConnectionMenu`), in two variants (with/without `openInWindow`). | `rg -c "glance: glanceLink"` → 4. | ~36 lines via one `useConnectionsApi(mode)` hook | High |
| **Context resolution: `Properties/resolveContext.ts` + `contextIdentity.ts` + `contextOptions.ts` vs `shared/contextResolve.ts` + `shared/contexts.ts`** | **Three different jobs, not duplicates**: `shared/contextResolve.resolveContextKeys` maps frontmatter `<Title>:` keys → Space ids (main + `usePropertyRows.ts:100`); `contextIdentity` memoizes tree → id→identity maps; `contextOptions` builds pickable Space rows; `resolveContext.ts` is a render bag (`schema`, `contextsById`, `contexts`, `assets`) unrelated to Context-key resolution despite the near-identical filename. **One real overlap:** `usePropertyRows.ts:93-102` rebuilds `ctxRegistry` and a `spacesByContext` map from `tree.contexts` on every `fm` change, when `contextIdentity.mapsFor` already holds the same per-tree `spaces` map with `contextId` on each entry. | Read all five files. | ~8 lines | Medium |
| **`Properties/linkFormat.ts` vs `shared/linkValue.ts`** | Not duplicates (picker options vs value parsing). | — | 0 | High |
| **Caches: `Tiles/tileCache.ts` vs `Windows/windowCache.ts` vs `Store/cacheSlice` vs `DesignSystem/Util/capMap`** | `cacheSlice` is id-keyed app state (link titles, aliases, host locks) — not a warm cache; `capMap.capSet` is a utility, not a store. The real duplication is **four WarmSeam-backed `{ editorState, scrollTop }` stores**: `tileCache.ts:6` (`Map`, **unbounded** — no cap; entries die only on a fence miss), `windowCache.ts:13` (`Map`, cleared on window close), `GlancePane.tsx:78` (`Map`, hand-rolled cap of 8 at `:89-93`), `Store/tabState.ts:28` (`capSet` 50). Three eviction policies for one shape. | Read all four. | 6 lines now (glance loop → `capSet`); ~20 more if one store factory | High for the loop; medium for consolidation |
| **Warmth: `Windows/useWindowWarm` vs `MarkdownPM/warmSeam` vs tab warmth** | `warmSeam.ts` is only the 4-line interface. **Four implementations**: `useWindowWarm.ts:21-34`, `tileCache.ts:8-21` (`tileWarmSeam`), `GlancePane.tsx:80-96` (`glanceWarmSeam`), `PageView.tsx:192-210` (inline). `tileWarmSeam` and `glanceWarmSeam` are the same 12 lines modulo map and cap; `useWindowWarm` adds body-scroll restore (`:36-62`). | Read all four. | ~15 lines via `warmSeamFor(store, key, path)` | Medium |
| **Confirmations: `Windows/confirmations.ts` vs main** | `confirmations.ts` is the sole confirmation path (12 `ask*` wrappers, all imported). Main keeps **one** native `dialog.showMessageBox` at `main/contextMenu.ts:76-80` — an *error* box after a failed native-menu mutation, not a confirmation. Separately, **two error-reporting paths** coexist: `window.nexus.showError` (main native dialog) at 15 renderer sites (`PageHistoryWindow.tsx` ×3, `SettingsWindow.tsx` ×3, `PropertyFrame.tsx` ×3, `Banner.tsx:49`, `ViewFrame.tsx`, `renameSlice.ts`, `nexusSlice.ts`, `ExcludedDirectoriesRow.tsx`, `HiddenFrame.tsx`) vs `notifyError` (in-app label) at 4. | `rg showMessageBox main`; `rg -c showError renderer`. | 0 now; a policy decision picks one | High on the count |
| **Notifications** | `Interface/notifications.ts` (in-app) vs `showError` (native) — as above. Also `notifications.ts:23-36 restoreView` is a view *mutation* (save + reorder) filed in the notifications module; 2 importers (`ViewItemMenu.tsx:5`, `ViewFrame.tsx:6`). | — | 0 (relocate) | High |
| **Zoom: `Tiles/tileZoom.ts` vs `MarkdownPM/zoom.ts`** | Different axes: `tileZoom` is the linear Scale factor (`SCALE_STEPS` → `--tile-zoom`); `MarkdownPM/zoom.ts` is the editor font exponent (`2^(z−1)`, one importer `MarkdownPM/index.tsx`). **But** `zoom.ts:11-13 zoomMultiplier(z) = 2^(z−1)` and `shared/types.ts:265 embedZoom(scale) = 1 + log2(scale)` are inverse definitions of one mapping in two files, and `view-tile.css.ts:133-149` juggles `--zoom`, `--view-embed-zoom`, `--embed-zoom`, and `--tile-zoom`. Three vocabularies (factor / exponent / CSS var). | Read all three. | ~5 lines (one mapping, one home) | Medium |
| **Tab models: `Windows/windowTabs.ts` vs `Tabs/tabsModel.ts`** | A second tab model, comment-acknowledged (`windowTabs.ts:4`). `WindowTabStrip.tsx:53-79` (ghosts `Map`, `requestClose`, `setTimeout(EXIT_MS)`, sorted splice-back) is a verbatim twin of `Tabs/TabBar.tsx:87-114`; `EXIT_MS` is defined in both (`WindowTabStrip.tsx:19`, `TabBar.tsx:25`), the former commented as "the toolbar strip's EXIT_MS twin". | Read both. | ~30 lines (one `useGhostClose` hook) | Medium |
| **Slide / FLIP / debounce twins** | `PageWindow.tsx:124-146` (`SLIDE_PX = 14`, `windowSlide`) ≡ `ContentView.tsx:105-121` (`VIEW_SLIDE_PX = 14`, `navSlide`). `PageWindow.tsx:158-176` engulf FLIP ≡ `NavWindow.tsx:69-86` morph FLIP (same center-delta + scale math, direction inverted). `STATS_DEBOUNCE_MS = 120` at `PageView.tsx:23` and `PageWindow.tsx:50` with parallel debounce plumbing (`PageWindow.tsx:78-99` vs `PageView.tsx:56-72,122-129`). | `rg "SLIDE_PX =|STATS_DEBOUNCE_MS ="`. | ~40 lines | Medium |
| **"undefined deletes the key" for tile entries** | `TileHost.tsx:98-107 withKey` and `ViewTile.tsx:282-289 patchEntry`'s loop implement the same absent-key-is-default rule. | Read both. | ~6 lines | Medium |
| **Per-id size memory** | `window-base.tsx:29 sizes` (Map), `window-panel.tsx:18 widths` (Map), `GlancePane.tsx:49-74 sizeCache` (IPC-persisted) — three per-id size stores with three lifetimes. | — | 0 (design-driven) | Low |
| **Sentinel host chains** | `PageHistoryWindow.tsx:24 HISTORY_ANCESTOR = 'page-history'` and `GlancePane.tsx:36 GLANCE_ANCESTORS = ['glance']` — two non-path sentinels for the same "nested embeds render inert" trick. | — | 0 | Low |
| **Deep clone** | `Tiles/Core/codec.ts:16 encodeLayout` (JSON round-trip) vs `model.ts:118 cloneLayout` (structural). Different intent (plain JSON vs typed copy); noted only. | — | 0 | Low |
| **`DRAG_SURFACES` fragments** | `.window-tabwrap, .tab-scroll, .tab-strip` repeated in `PageWindow.tsx:46` and `NavWindow.tsx:31` for the one shared `WindowTabStrip`. | — | 1 line (hoist into `window-base.tsx:72` or export from WindowTabStrip) | Medium |

---

### 5. Defensive Code for Unreachable States

`strict: true`, `noUncheckedIndexedAccess` **not** set (`tsconfig.web.json`), so index guards below are not type-driven.

| File:line | Guard | Why unreachable | Lines | Confidence | Breaks if wrong |
|---|---|---|---|---|---|
| `Windows/windowTabs.ts:56` | `if (!firstPage && win.flavor === 'page') return null` | In `'page'` flavor every tab is a page (the `navwindow` sentinel exists only in `'nav'` flavor, `windowSlice.ts:185`); `tabs.length === 0` already returned at `:50`, so a non-empty page-flavor list always has a `firstPage`. | 1 | High | Nothing. |
| `Interface/scope.ts:17,74`, `Properties/contextOptions.ts:34`, `Properties/Assignment/usePropertyRows.ts:98` (the `.contexts` half) | `tree.collections ?? []`, `tree.contexts ?? []`, `tree.contexts?.find`, `!tree?.contexts` | `collections` and `contexts` are non-optional on `NexusTree` (`shared/types.ts:428-429`); `contextIdentity.ts:43` iterates `tree.contexts` bare. | 3 (the `allCollections` wrapper) + tokens | High | Nothing. |
| `Interface/Subfield/Subfield.tsx:29` | `(order[kind] ?? DEFAULT_ITEMS[kind] ?? [])` | `DEFAULT_ITEMS` is a complete `Record<SelectionState['kind'], …>` (`subfieldItems.tsx:26-34`); the second `??` never fires. | 0 (tokens) | High | Nothing. |
| `Tiles/Core/hitTest.ts:38,43` | `dists[0]?.[0] ?? 'e'`, `dists[0]?.[1] ?? 0` | `dists` is a literal 4-tuple array (`:31-36`). | 0 (tokens) | High | Nothing. |
| `Tiles/Core/model.ts:76-77` | `if (!child) continue` inside `for (let i…)` over `node.children` | Arrays built by `ops.ts` have no holes. | 1 | High | Nothing. |
| `Interface/NotificationLabel.tsx:117` | `if (!shown) return` in the action button's `onClick` | The host is `inert={!shown}` (`:108`); an inert subtree cannot receive the click. | 1 | High | Nothing. |
| `Properties/Assignment/usePropertyRows.ts:157` | `row ? resolveFieldValue(…) : { kind: 'null' }` | `editRow` fires only from rendered rows; both hosts return early when `row` is null (`PageProperties.tsx:146`, `PageWindow.tsx:326`). | 1 | Medium | A future caller with a null row would crash on `resolveFieldValue(null, …)`. |
| `Windows/window-base.tsx:130` | `footer !== false` | `footer` is typed `ReactNode`; every caller passes an element or omits it. | 0 (token) | Low | Nothing. |
| `Tiles/Surfaces/PageTile.tsx:77` | `loaded?.path === path ? loaded : null` | Every mount keys on the path (`PageWindow.tsx:218`, `NavWindow.tsx:207`, `GlancePane.tsx:400`; the embed widget's `this.path` is fixed per widget instance), so `path` never changes under a mounted PageTile. | 1 | Medium-low | A host that swaps `path` without a key would show the previous page's body for one render. |
| `Windows/windowCache.ts:5-11` `scrollTop` field | Documented "always 0 in the window" | The WarmSeam captures the editor scroller's `scrollTop` (`MarkdownPM/index.tsx:464`) and restores it (`:426`) onto a scroller that does not scroll in windows (`.page-tile-grows`, `tile-base.css:84-99` makes the body the scroller). A harmless no-op field kept for interface compatibility. | 0 | Medium | — |
| `Windows/windowCache.ts:32-35` | `import.meta.env.DEV` probe `window.__pommoraCache` | Debug scaffolding (guarded; twin at `main.tsx:34`). Not unreachable, just non-product. | 4 | Low | Headless drives asserting warm entries. |

Reachable guards that **look** defensive but are not — leave them: `TileHost.tsx:240-244` (strict `=== true` on a foreign `locked`), `TileHost.tsx:298` (`inertTile` for a layout id with no entry), `ContentView.tsx:33-34` (`case 'context'` → blank `.detail`; `Sidebar.tsx:708` produces that selection), `ViewTile.tsx:295` (foreign entry shape), `WebWindow.tsx:65-69` / `GlancePane.tsx:120-125` (pre-attach guest throws), `crumbs.ts:74-75` (stale selection).

---

### 6. Obscure or Unnecessary — blunt verdicts

- **`Properties/PageProperties.tsx:220`, `Windows/PageWindow.tsx:432`** — `(Cell({ … }) ?? <EmptyValue/>)`: a component called as a function so its `null` return can be tested. Cell has no hooks so it works, but it bypasses React element identity and reads as a bug on sight. Verdict: give Cell an `empty` fallback prop (or export `hasCellValue`) and render `<Cell/>`. 0 net lines.
- **`Tiles/TileHost.tsx:342`** — `popNativeMenu.current = (id, el) => {…}` assigned in the render body every render (comment at `:340-341` explains the memoization dodge). Verdict: a ref mutated during render is the pattern the comment is apologizing for; a `useCallback` over `[entries, pickers, …]` handed to `onHandleMenu` removes the ref and the comment.
- **`Tiles/TileGrid.tsx:243-250`** (`now`/`live` per-render ref mirror) **and `:254-262`** (`settleRef` mirroring `settle` state) — two state→ref mirrors in one component, plus `gestureOrigin` (`:282-299`) reading through both. Read three times. The README (`:75-77`) calls identity-stable handlers an invariant, so this is deliberate; it is still the densest 60 lines in the tree.
- **`Windows/PageWindow.tsx:75-103`** — `bodyText`/`statsTimer`/`seededPath`/`onBodyText` (25 lines) exist only to feed `Subfield` a debounced body string, when `pageStats` is already `perText`-memoized (`subfieldStats.ts:94`). `PageView.tsx:56-72,122-129` does the same dance under another name (`pushLiveBody`). Verdict: one `useDebouncedBody(path)` or none.
- **`Interface/Glance/GlancePane.tsx:157-163,180-182`** — `shownRef`/`heldRef`/`liveRef` triple-ref hold pattern (`held = shown ?? heldRef.current`). `Interactions/useHeld` exists and is used for exactly this at `NotificationLabel.tsx:96` and `TileHost.tsx:225,227`. Verdict: `useHeld(shown, shown !== null)` replaces `heldRef` (3 lines).
- **`Tiles/useTileDoc.ts:50-53,74-78`** — the host lock lives in two places (store `hostLocks` and the document) with `docLock` ref reconciling them; the "one writer" (`cacheSlice.ts:17`) is a two-hop write. Read twice. Legit given settings surfaces write the store; noted as the tile system's most indirect path.
- **`Windows/NavWindow.tsx:189`** — `className: 'navwindow-inspector'`: no CSS rule, not in `DRAG_SURFACES`, no `querySelector`. Dead class string. 1 line. High.
- **`Windows/page-window.css:25-30`** — `.page-window-insp` (the frontmatter-inspector column) is reused by `PageHistoryWindow.tsx:136` as its snapshot-list column; the comment at `:25` admits it. A properties-inspector class on a history list. Verdict: name the shared thing (`.window-right-column`) or give history its own.
- **`Tiles/README.md:42`** — `TileLab.tsx` row points at a file that is not in `Tiles/`. Stale.
- **`Interface/notifications.ts:23-36 restoreView`** — a view save+reorder in the notifications module (see §4).
- **`Properties/resolveContext.ts` vs `shared/contextResolve.ts`** — two files whose names differ by word order and do unrelated things (render bag vs frontmatter-key resolution). Read three times to be sure. Verdict: rename the render bag (`viewResolveContext` / `RenderContext`).

---

### Totals

**High confidence, removable now:** dead Core helpers 58 · `ConnectionsApi` ×4 → hook 36 · glance hand-LRU → `capSet` 5 · dead Settings button 7 · `allCollections` + dead `??` guards 4 · `windowTabs.ts:56` 1 · `model.ts:76-77` 1 · `NotificationLabel.tsx:117` 1 · `navwindow-inspector` 1 · `statusCycle.ts` fold 6 · `DRAG_SURFACES` hoist 1 — **≈121 lines**, plus 30 leaked `export` keywords, one stale README row, one import alias.

**Medium confidence, needs a design or product call:** property-row unification ≈170 TSX + 40 CSS · three one-mount view wrappers 25 · `useOptionReorder` adapter 25 · `OptionRow`/`OptionSlot` merge 12 · ghost-close twin with TabBar 30 · slide/FLIP/debounce twins 40 · warm-seam factory 15 · `withKey`/`patchEntry` 6 · `usePropertyRows` Context map rebuild 8 · `restoreSnapshot` inline 8 · two one-class `.css.ts` 8 · `linkFormat.ts` 5 · zoom mapping 5 · `usePropertyRows.ts:157` guard 1 · `PageTile.tsx:77` guard 1 — **≈399 lines**.

**Shipped scaffolding, product decision:** empty `InspectorPane` 46 in-scope (+≈35 in `App.tsx`/`chromeSlice.ts`); Glance multi-host dwell table ≈4 (deliberate per Context doc).

**Clean:** the row migration, FloatingWindow, and "block" naming leave nothing in scope; the glance mechanism is complete; `scope.ts`/`viewSettingsScope.ts` are not context providers; `linkFormat`/`linkValue` and the three renderer Context helpers vs `shared/contextResolve` are not duplicates.

---

### Summary

The four surface directories are in better shape than the brief feared. Every retired name is gone: no row-migration code, no `FloatingWindow` caller or class, no "block" identifier, and the glance is a finished mechanism with one host rather than half-built scaffolding. What remains is mostly duplication of *patterns*, not duplication of *systems*. The one genuinely dead code is three Tiles Core helpers (`validateLayout`, `splitAtTile`, `tileIds`, 58 lines) kept alive only by tests and the showcase's TileLab. The largest structural duplicate is the documented one: `PageProperties` and `PagePanel` share 88 verbatim lines and two stylesheets for a row that differs only in how Context rows hide — roughly 210 lines behind one row component. Four identical `ConnectionsApi` builders, four `WarmSeam` implementations over four differently-evicted stores (one unbounded, one still hand-rolling the LRU that PM-126 collapsed), a ghost-close routine copied from `TabBar`, and twin slide/FLIP/debounce blocks make up the rest. The shell `InspectorPane` ships as a fully plumbed empty pane with a resize strip and persisted width, and every window toolbar carries a disabled Settings glyph. High-confidence removable: ~121 lines; medium: ~399.
