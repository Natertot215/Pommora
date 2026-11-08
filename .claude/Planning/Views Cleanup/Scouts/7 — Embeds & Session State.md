## Scout 7 — Embeds & Session State

**Grounded At:** `cae07c129` · read-only · reconciled against HEAD (`cae07c129`). Every `path:line` below was reopened unless marked *inferred*.

**Reconciliation:** 10 findings kept (7 Verified, 3 Corrected), 1 removed (F5 → Report 1 F4). F2 is now the single home of the view-list duplication, absorbing Report 1 F8 and Report 6 F4.

### The Brief's Four Questions

#### How Does a View Tile Reuse the Host and Renderers, and What Does It Re-Implement?

**Reuses:** `ViewHost` whole — pipeline, renderer seat, interactions (`Core/Tiles/Surfaces/ViewTile.tsx:642`); `SettingsFrame` whole, mounted in a `PickerMenu` (`ViewTile.tsx:646-654`); the write path through `ViewTileScope` → `useSaveView` → `scope.persist` (`Core/Views/viewWrite.ts:47-50`); the tile's page route through `tile.openPage` inside the shared `useViewInteractions` (`Core/Views/Host/useViewInteractions.tsx:360`). Renderers never import tile code (`TableView`, `CardsView`, `useColumns` reference only `ViewHostApi`).

**Re-implements beside them:**
- The view list's CRUD: create, duplicate, delete with undo, restore, reorder, switch (`ViewTile.tsx:350-412`), parallel to `ViewFrame` → `views:*` channels → `Core/Views/viewsFile.ts:67-179`.
- The view list UI and its row menu (`ViewTile.tsx:453-486`, `655-674`), parallel to `Core/Views/Settings/ViewFrame.tsx:91-109`, `111-203`.
- Entering-pill detection (`ViewTile.tsx:77-113`), parallel to `UIX/Animations/useEntrance.ts`.
- A second route for embedded view config writes (`persistConfig`, `ViewTile.tsx:328-330`) beside the scope's own (`viewWrite.ts:47-50`); both end in `writeConfig` (`:315-327`).
- Knowledge of each renderer's DOM: `resolvePeekAnchor` (`ViewTile.tsx:124-141`) and the body overrides in `view-tile.css.ts:140-162`.

#### How Many Places Decide "Which View, Which Scope, Which Config" for a Mounted View?

Twelve sites:

| Site | What It Decides |
| --- | --- |
| `Core/Views/Pipeline/pickView.ts:7-12` | Container's active view (sidecar choice → first → default) |
| `Core/Views/Host/useActiveView.ts:9-10` | `scope.view` vs `pickView`, wrapped live |
| `Core/Views/Host/ViewHost.tsx:18-25` | Calls `useActiveView` (type, scale), tile scale = 1, tile publishes no count |
| `Core/Views/Host/useViewHost.ts:47-49`, `:56` | Calls `useActiveView` *again*; tile gets no search |
| `Core/Views/Host/useViewInteractions.tsx:360` | Tile's `openPage` owns plain opens |
| `Core/Views/viewWrite.ts:41-50` | Write route: dialer vs `scope.persist`, lock gate |
| `Core/Views/Settings/SettingsFrame.tsx:44-53` | Source: `scope.source` vs the global `selection` |
| `SettingsFrame.tsx:76-80`, `94-102` | Icon target, header identity (view vs container), lock |
| `Core/Views/Settings/ViewMenu.tsx:29` | `pickView(node)` — not live, unlike every other mounted-view reader |
| `Core/Views/Settings/ViewFrame.tsx:55-61` | `pickView` for the list, `useLiveView` for the edited view |
| `Core/Tiles/Surfaces/ViewTile.tsx:240-261` | Active index → embedded → source → `coerceEmbeddedView` with derived ids |
| `Core/Tiles/tilesFile.ts:76-90` | Pick-time copy: `readStoredView` or `mintDefaultView` |

`ViewTileScope` is the right single seam (one context, six consumers); the excess is the double resolution in `ViewHost`/`useViewHost` (Report 1 F4) and the off-pattern `ViewMenu` read (*§F10*).

#### Is View State Spread Across Slices or Contexts Where One Owner Would Do?

No. `Core/Session/viewSearchSlice.ts` (per-tab query) is the only Session slice holding view state; `detailCount` in `chromeSlice.ts` is a chrome publish shared with Archive, Matrix, and NavView; staged view edits and painted orders are module records in `Core/Views/Host/pendingView.ts:75`, `:161`, keyed by source + view, which serves both scopes. See *§Keep*.

#### What Would a New View Kind Have to Do to Work Inside a Tile Today?

1. One `VIEW_RENDERERS` entry (`ViewHost.tsx:11-14`) — shared with the main pane.
2. A branch in `resolvePeekAnchor` naming its DOM classes (`ViewTile.tsx:124-141`), or a hidden view strip never drops down on body hover — silently.
3. `globalStyle` rules in `Core/Tiles/Surfaces/view-tile.css.ts:140-162` for its embed zoom (Table reads `--view-embed-zoom`, Cards `--embed-zoom`) and edge padding, or it draws at the wrong scale — silently.

Steps 2–3 are the tile's only renderer leak (*§F1*).

---

### 1. Map

| File | Owns | Called By |
| --- | --- | --- |
| `Core/Tiles/Surfaces/ViewTile.tsx` (678) | View tile surface: heading, view strip/dropdown, embedded-view CRUD over the raw entry, lock gating, peek reveal, settings picker, scope provider | `Core/Tiles/tileKinds.tsx:69-78` |
| `Core/Tiles/tiles.ts` (228) | Entry union + schemas, `TILE_KINDS` (view `copy` re-mints ids), entry patch merge, doc patch gate | Tiles host + main side |
| `Core/Tiles/tilesFile.ts` (322) | Host-run tile lifecycle; `PICK_ENTRIES.view` (`:76-90`) copies a container view into a new entry | `Core/Tiles/handlers.ts` |
| `Core/Tiles/tileHandleMenu.ts` (153) | Handle/insert menu models; view pick tree | `TileHost.tsx` |
| `Core/Views/ViewTileScope.tsx` (19) | The embed scope context: source, view, persist, locked, setLocked, openPage | `ViewHost`, `useActiveView`, `useViewHost`, `useViewInteractions`, `SettingsFrame`, `viewWrite` |
| `Core/Views/ContainerView.tsx` (12) | Main-pane container surface: `InterfaceScaffold` + `ViewHost` | `ContentView.tsx:71`, `:81` |
| `Core/Interface/ContentView.tsx` (242) | Host parking, per-target dispatch, Subfield footer | `Interface` shell |
| `Core/Interface/Toolbar/SettingsMenu.tsx` (45) | Per-selection settings pane; collection/set → `SettingsFrame` | `Toolbar.tsx` |
| `Core/Views/Settings/ViewMenu.tsx` (54) | Toolbar view switcher button + `view_button` toggle | `Toolbar.tsx:102` |
| `Core/Views/Settings/ViewFrame.tsx` (217) | Container view list: switch, CRUD, reorder, Archive row | `ViewMenu.tsx:51` |
| `Core/Views/Settings/SettingsFrame.tsx` (190) | View settings index; scoped vs plain root | `SettingsMenu`, `ViewTile` |
| `Core/Views/viewWrite.ts` (59) | View write routing + lock gate + refusal report | 9 files |
| `Core/Views/deleteViewWithUndo.ts` (18) | Container view delete + undo | `ViewFrame.tsx:89`, `:105` only |
| `Core/Actions/viewMenus.ts` (80), `viewRowMenu.ts` (36) | Embed title/strip menus, toolbar button menu; view row menus | `ViewTile`, `ViewMenu`, `ViewFrame` |
| `Core/Session/viewSearchSlice.ts` (57) | Per-tab view search | `useViewHost:49`, nav/nexus slices |
| `Core/Interface/Windows/PageReaderWindow.tsx` | Only view use is `fetchPageValues` — no view mount | — |

---

### 2. Findings

#### F1 — The Tile Reads Renderer DOM; It's the One Place a New Kind Breaks Silently

**Status:** Verified (code); the CSS move is Unverified — needs a live check of tile padding. **Overlaps:** 2 (F7: `.table-view` class rename would break `view-tile.css.ts:140`), 4 (F4), 8 (F11).

**What's There:** `resolvePeekAnchor` (`ViewTile.tsx:124-141`) queries `.table-head`, `.cards-view .card`, `.group-band-row`; `inPeekAnchor` (`:143-150`) walks `.card` siblings. `view-tile.css.ts:140-162` restyles `.table-view`, `.cards-view`, `.cards-grid`, `.set-cards-row`, `.group-band-row`, `.table`, `.col-header` — including a different zoom variable per renderer (`--view-embed-zoom` vs `--embed-zoom`, from `Core/Settings/personalization.ts:65-67`, deliberate: Table normalizes 13px text to the editor's 15px).

**Why It's a Problem:** `ViewTypesPM.md` (*§The View Host*) states a renderer never switches on a view's type; the tile does, by class name. A List renderer would get `null` from `resolvePeekAnchor` (no reveal) and an unset `--zoom` (wrong scale) — no error either way (*§Clearer Boundaries*).

**Proposed Change:** Renderers declare, the tile reads.
- Reveal: each renderer marks its leading element with one attribute — `data-view-lead` on the table head and on the first group band, `data-view-lead="row"` on the first card. The tile keeps its zone/row logic but keys it on the attribute. Same layout-read budget (resolved once per entry, `:289`).
- Embed styling splits by owner. The zoom choice is renderer knowledge (why Table's differs), so it moves into each renderer's stylesheet under an embed attribute `ViewHost` sets (it already knows it's in a tile, `ViewHost.tsx:20`). The edge-padding rules align view content to the tile's own heading pads (`HEAD_PAD_L/R`, `view-tile.css.ts:13-14`) — tile knowledge — so they stay in the tile but key on renderer-declared attributes rather than `.cards-grid`/`.set-cards-row`/`.col-header` class names.

**Delta:** ~0 (moves). **Touches:** `Core/Views/Table/table-view.css`, `Core/Views/Cards/cards-view.css`, `TableView`/`CardsView`/`GroupBand` markup.

#### F2 — Two View-List Managers With Diverging Behavior

**Status:** Verified (duplication and divergences); the delta is Corrected — the shared-ops layer earns less than the scouts estimated. **Overlaps:** 1 (F8, removed into this), 6 (F4, removed into this), 5 (§Insights).

**What's There:**
- **Algebra.** Container lists go `ViewFrame.tsx:71-109` → `views:save|duplicate|reorder|delete|restore` → `viewsFile.ts:67-179`, delete via `deleteViewWithUndo.ts:7-18`. Tile lists do the same algebra in the surface over the raw entry: `writeConfig` `ViewTile.tsx:315-327` ≈ `saveView` `viewsFile.ts:67-91` (positional id → minted id, apply, `mergeViewEdit`); `duplicate` `:361-375` ≈ `duplicateView` `:94-108` (`freeName`, splice after); `deleteView`/`restoreViewAt` `:376-399` ≈ `deleteView`/`restoreView` `:149-179`; `moveView` `:402-412` ≈ `reorderViews` `:132-147`; `embedViewIds`/`coerceEmbeddedView` `:66-75` ≈ `containerViewIds` + `Nexus/containerFields.ts`. `views.ts:92-102` `mapViews` already walks both shapes.
- **UI.** Row menu: `ViewFrame.tsx:91-109` and `ViewTile.tsx:453-486` are the same `switch` over `viewRowMenuItems` — rename / icon / color / duplicate / delete. List row: `MenuItem` + `picked: 'solo'` + `Icon viewGlyph headline` + `RenamableLabel` + `FootingCreate "New View"` in `ViewFrame.tsx:111-189` and `ViewTile.tsx:655-674`.

**Divergences (verified):**
- Duplicate switches to the copy in a tile (`ViewTile.tsx:373`, `active: i + 1`; documented in `SurfacePM.md:28`), not in a container (`viewsFile.ts:94-108`, `ViewFrame.tsx:84-85`).
- Delete animates out on a tile pill (`:482`), not in `ViewFrame`.
- The tile's dropdown list has no reorder (`:655-674`) though its strip (`:558-564`) and `ViewFrame` (`:129-151`) do.
- Delete prompt says "from the tile" vs "from the container" (`confirmations.ts:214-217`) — correct, keep.

**Why It's a Problem:** *§One Way* — two implementations of "manage a list of saved views," and every behavior question (should duplicate switch?) has two answers.

**Why the Algebra Shares Less Than It Looks:** The two stores differ in where the id lives (`v.id` vs `v.config.id`), how the active view is held (an id vs an index the tile recomputes in every op, `:358, 373, 382, 396, 410`), how refusal is shaped (`refuse(...)` → `Result` vs `null`), and how undo is carried (`RemovedView` over a channel vs a closure, `:395`). What's genuinely shared is the rules — last-view guard, insert-after-original, `freeName` + `mintViewId` — each one to two lines, and the id helpers (`viewIdsOf`, `ownsViewId`, `mergeViewEdit`, `applyViewPatch`) are already shared. Any shared layer must keep `mergeKeys`' depth table and positional-id repair byte-identical on both surfaces (sync).

**Proposed Change:** Two fixes that compose.
- **UI (recommended):** One shared view-row menu dispatcher — `runViewRowAction(action, view, anchor, { rename, save, duplicate, remove })` — beside `viewRowMenuItems`, used by both; one shared list row (`ViewListRow`: glyph, picked, label, menu) used by `ViewFrame` and the tile dropdown. Nathan rules on duplicate-switches (recommend: both switch).
- **Algebra (optional):** the rules as small pure helpers in `views.ts` (e.g. a duplicate's config, the last-view guard), consumed by `viewsFile.ts` and the tile module F6 creates; each store keeps its own addressing and active handling. The larger option — one `ViewList` interface with container and tile providers and one list component — gives the tile dropdown reorder for free; Nathan's call.

**Delta:** UI ≈ −25 to −35; algebra helpers ≈ −10 to −20. All *inferred*; the scouts' −40 to −70 for a shared-ops layer is likely high for the reasons above.

**Touches:** `Core/Actions/viewRowMenu.ts`, `ViewFrame.tsx`, `deleteViewWithUndo.ts`, `views.ts`.

#### F3 — Locked-Tile Rename Bug, and Two Routes for One Edit

**Status:** Corrected (bug verified by code, not driven; the fix no longer routes through `saveViewIn`). **Overlaps:** 1 (F1), 8 (F2).

**What's There:** A view pill's or dropdown row's label begins renaming on double-click with no lock check: `viewLabel` passes `onBegin={() => setRenaming(v.id)}` (`ViewTile.tsx:499`), and `RenamableLabel` starts on `onDoubleClick` whenever `onBegin` is set (`UIX/Fields/RenamableLabel.tsx:52-55`). The commit goes to `persistConfig` (`:328-330`), which drops it silently when locked. The heading's label *is* gated (`:613`), and the row menu returns early when locked (`:456`). Pill rename/icon/color write via `persistConfig` → `writeConfig`; the same edits from `SettingsFrame` go `useSaveView` → gate → `stageView` → `scope.persist` → `writeConfig`, which reports `VIEW_CONFIG_LOCKED`. Lock checks are spread across 12 sites in `ViewTile.tsx` (`311`, `329`, `351`, `363`, `387`, `430`, `443`, `456`, `517`, `536`, `561`, `613`).

**Why It's a Problem:** A user-visible silent drop on a locked tile.

**Proposed Change:** Gate `onBegin` with `locked ? undefined : …` as the heading does. With that gate, every `persistConfig` entry point is already behind a lock check (the row menu at `:456`, the label at `:499`); its own check guards only an icon/color pick whose lock flips while the picker is open, which an outside click on the lock would dismiss first (*inferred*). If a drive confirms that, `persistConfig` collapses into `writeConfig`. The scout's alternative — `scope.persist(id, patch)` and pills calling `saveViewIn` — would give `saveViewIn` a production caller just as Report 1 F1 and Report 8 F2 collapse it, and tile edits likely don't need staging to paint (Unverified, see *§Insights*).

**Delta:** −1 to −3.

#### F4 — `usePillPresence` Hand-Rolls `useEntrance`

**Status:** Verified; the lingering `entering` class is Unverified — needs a live look. **Overlaps:** none.

**What's There:** `ViewTile.tsx:77-113` (37 lines) tracks newly added pill ids with state, an effect, and animation-end cleanup; `UIX/Animations/useEntrance.ts:5-18` does this keyed and StrictMode-safe, with seven callers. The exit half mutates a ref during render (`presence.deleteView.current = deleteView`, `:400`) so the hook can call back into the component.

**Proposed Change:** `const entering = useEntrance(views, (v) => v.id)`; hold `exiting` in `ViewTile` and call `useSettleFallback(exiting !== null, 'menu', () => { deleteView(exiting); setExiting(null) })` directly. `usePillPresence` and the render-time ref assignment go. `useEntrance` reports a key as entering until the list next changes, so the pill keeps its entering class across re-renders; the CSS animation plays once per class add, so that should be harmless unless the pill remounts (*inferred*).

**Delta:** ≈ −22 to −28.

#### F6 — `ViewTile.tsx` Mixes Payload Algebra With Presentation

**Status:** Verified. **Overlaps:** 1 (F8 via F2), 6 (F4 via F2).

**What's There:** 678 lines: entry-payload helpers (`configIdOf`, `embedViewIds`, `coerceEmbeddedView`, `rawViews`, `rawActive` — `:66-75`, `:152-160`), list ops as `mutateEntry` closures (`:315-412`), peek-anchor DOM logic, presence, menus, render. `ViewTile.test.ts:3` imports `embedViewIds` from the `.tsx` surface.

**Proposed Change:** The pure parts — the helpers plus each list op as a `(raw) => EntryPatch | null` function — move to one host-agnostic module, the tile's counterpart to `viewsFile.ts`. `ViewTile.tsx` keeps presentation and wiring. This is where F2's optional rule helpers are consumed on the tile side.

**Delta:** ~0.

#### F7 — Toolbar View Pieces Live on Opposite Sides of the Same Seam

**Status:** Verified. **Overlaps:** 5 (§Placement, same proposal).

**What's There:** `SettingsMenu.tsx` (toolbar button) lives in `Interface/Toolbar/` and mounts `Views/Settings/SettingsFrame`; `ViewMenu.tsx` (toolbar button) lives in `Views/Settings/` and mounts `ViewFrame`, importing `Interface/Toolbar/toolbar-menu.css` (`ViewMenu.tsx:10`). `toolbar-menu.css.ts:32-38` holds `chevronButton`, `archiveRow`, `archiveGlyph`, `archiveDivider` — used only by `ViewFrame.tsx` (`:33`, `:165`, `:190-195`; `OutlineMenu` doesn't read them).

**Proposed Change:** Move `ViewMenu.tsx` to `Interface/Toolbar/` beside `SettingsMenu` and `OutlineMenu`; move the four `ViewFrame` styles to `Views/Settings/view-frame.css.ts`, matching `filter-frame.css.ts`, `group-frame.css.ts`, `layout-frame.css.ts`.

**Delta:** ~0, +1 file.

#### F8 — `ContentView` Does `ContainerView`'s Lookup, Twice

**Status:** Verified. **Overlaps:** 1 (§Placement), 6 (§Keep).

**What's There:** `ContentView.tsx:68-87` repeats find + "not found" placeholder for `collection` and `set`, then hands a node to `ContainerView`; `SpaceView.tsx:6-19` owns its own lookup and placeholder.

**Proposed Change:** `ContainerView` takes the target and owns lookup + placeholder as `SpaceView` does (keeping the kind-specific "Collection not found" / "Set not found" text); `ContentView` gets one `case 'collection': case 'set':` arm.

**Delta:** −8.

#### F9 — SettingsFrame's Header Means Two Things

**Status:** Verified. **Overlaps:** 5 (F2, F8).

**What's There:** In a tile, the header shows and renames the *view* (`SettingsFrame.tsx:94-101`, with the comment at `:99`); in the main pane it shows and renames the *container* (`:94-96`, `:101-102`). The icon chooser forks the same way (`:76-79`).

**Why It Matters:** The same pane's top row is a different entity depending on where it's opened.

**Proposed Change (Nathan's call):** (a) Both scopes show the view (container rename stays on the container's own title/banner), removing the fork — a visible change to what the toolbar's Settings header renames; or (b) keep and document it in `ViewTypesPM.md` *§Surfaces*.

**Delta:** (a) −6; (b) 0.

#### F10 — `ViewMenu` Reads the Active View Without Its Staged Edits

**Status:** Verified (the visible lag is *inferred*). **Overlaps:** 1 (F7: `pickView` placement).

**What's There:** `ViewMenu.tsx:29` uses `pickView(node)`; every other mounted-view reader goes through `useActiveView`/`useLiveView` (`ViewFrame.tsx:61` for the edited view).

**Proposed Change:** `useActiveView(node)`. The toolbar glyph and name then track a staged rename or icon change the moment the pane shows it.

**Delta:** 0.

#### F11 — Two View-Menu Files in Actions

**Status:** Corrected (the file saving is one production file and one test file). **Overlaps:** none.

**What's There:** `Actions/viewMenus.ts` (embed title/strip menus + the toolbar button menu) and `Actions/viewRowMenu.ts` (row menus), each with its own test. `viewButtonMenuItems` (`viewMenus.ts:71-79`) and the `titles` row (`viewRowMenu.ts:30-32`) hand-roll show/hide ternaries while `toggleLabels.ts` holds that wording for every other toggle.

**Proposed Change:** One `Actions/viewMenus.ts`; the two ternaries become one `toggleLabels` entry (wording per *§Names*).

**Delta:** ≈ −5; −1 production file, −1 test file.

---

### 3. Names

| Current | Problem | Proposed |
| --- | --- | --- |
| "Show Title" (toolbar, `viewMenus.ts:76`) and "Show Titles" (tile pill menu, `viewRowMenu.ts:32`) | Same concept (`view_button`), two labels | One label, e.g. "Show View Names" — copy change, Nathan's call; `ConfigurationPM.md:233` names it Show Title |
| "Hide Title" (tile title menu, `viewMenus.ts:53`) | Collides with the toolbar's "Hide Title", which hides something else | Keep if the toolbar's label changes; otherwise "Hide Heading" |
| `embed*` vs `ViewTile*` (`embedViewIds`, `embedAreaMenuItems`, `embedTitleMenuItems`, `coerceEmbeddedView` vs `ViewTile`, `ViewTileEntry`, `ViewTileScope`) | Two words for one thing | `ViewTile*`, the kind's label: `tileViewIds`, `viewTileStripMenu`, `viewTileTitleMenu`, `coerceTileView` |
| `areaMenu` / `embedAreaMenuItems` (`ViewTile.tsx:441`) | "Area" names nothing visible; it's the strip's menu | `stripMenu` / `viewTileStripMenu` |
| `scopePane` (`SettingsMenu.tsx:11`) | "Scope" already means the embed scope | `paneFor` |
| `ViewTileScope` | Fine if `ViewTile*` wins | Keep |
| `view_band` (persisted) / `viewsShown` / `toggleViews` / `strip*` | `view_band` collides with group bands; can't rename on disk | Code says "strip" consistently: `stripShown`, `toggleStrip` |

---

### 4. Placement

- **Embedded-view payload helpers + list ops** (`ViewTile.tsx:66-75`, `152-160`, `315-412`) → a pure module; recommend `Core/Tiles/viewTileEntry.ts` beside `tiles.ts`, which owns `viewEntry` (F6).
- **`ViewMenu.tsx`** → `Core/Interface/Toolbar/` (F7).
- **`chevronButton`, `archive*` styles** → `Core/Views/Settings/view-frame.css.ts` (F7).
- **Renderer embed zoom** (`view-tile.css.ts:140-146`) → each renderer's stylesheet; the padding alignment stays in the tile on renderer-declared attributes (F1).
- **`deleteViewWithUndo.ts`** (18 lines, one importer: `ViewFrame.tsx`) → into `ViewFrame` beside its other inline view-list calls (`duplicate`, `createView`, reorder), or into the container provider under F2's larger option; −1 file.
- **`VIEW_STYLES`** (`Core/Nexus/schemas.ts`) is tile-only yet sits beside the container-shared `VIEW_BUTTONS`. Low value; move to `tiles.ts` only if touching it anyway (*scout cite, not reopened*).
- **`containerConfig.ts`** and the `container:configure` channel → removed by Report 6 F2 (`setViewButton` as a `mutate` op).

---

### 5. Becomes False

- `Core/Tiles/Surfaces/ViewTile.test.ts:3` imports `embedViewIds` from the surface (F6, *§Names*).
- `useViewHost.test.tsx:125`, `:721`, `:889` — `useViewHost(source, nests)` signature (Report 1 F4).
- `ViewTile.tsx:123` comment (peek anchor naming table/cards) (F1).
- `ViewTypesPM.md` *§The View Host* — "resolves the container's active view type" (Report 1 F4 moves it into the hook); *§Surfaces* SettingsFrame bullet if F9(a); ViewFrame bullet if duplicate starts switching (F2).
- `SurfacePM.md:28` — duplicate behavior wording if unified.
- **Already imprecise:** `ViewTypesPM.md:4` says views render inside "dashboard and page tiles"; tiles are hosted by the Homepage and Space surfaces (`HomepageView.tsx:17`, `SpaceView.tsx:17`, plus window tabs), so "page tiles" should read "Space tiles"; no MarkdownPM view embed exists.
- `Core/Tiles/README.md` module map — add the new payload module row if F6 lands.
- `ConfigurationPM.md:233` if the Show Title label changes.

---

### 6. Keep

- **`ViewTileScope` as the one embed seam.** One context, six consumers, renderers never see it. An always-present `ViewScope` with a container provider would remove ~7 null branches but needs providers in both `ContainerView` and `SettingsMenu`; net ~0 plus a layer.
- **Session view state.** Not spread. `pendingView.ts`'s module records are correctly outside Zustand.
- **Positional-id repair twice** (`embedViewIds` + `writeConfig` vs `viewsFile.patchViews`). It crosses the process boundary and already shares `viewIdsOf`/`ownsViewId`/`mergeViewEdit`/`applyViewPatch`; this is why F2's algebra delta is small.
- **`view_button` defaults differ** — toolbar `'icon'` (`ViewMenu.tsx:26`), tile `'labeled'` (`ViewTile.tsx:347`). Set at inception (`0940df967` toolbar, `c03585724` embed header) and documented as Icon in `ConfigurationPM.md:233`.
- **`ContainerView` as a file** — mirrors `SpaceView`; only its lookup moves in (F8).
- **`mapViews`'s tile branch** (`views.ts:94`) — one walker over both payload shapes.
- **Per-view `source_id`** in the tile payload — persisted; leave it.
- **The lock sharing one key** with the tile's position lock — a documented Pending item (`SurfacePM.md:49`, scout cite).

---

### 7. Insights & Concerns

- **PickerMenu:** `bareSurface` has exactly one caller (`ViewTile.tsx:650`), paired with `contentClassName={hostedGutter}`; `hostedGutter` (`UIX/Menus/menu-surface.css.ts:16-20`) repeats `surface`'s padding line. A one-caller mode on a 15-caller primitive; flagged for the PickerMenu pass (Report 5 F5).
- **Tile-path staging may be redundant** (Unverified — needs a live run): `patchTileEntry` paints synchronously (`tileDocStore.ts:315-327`, scout cite), so `stageView` in `viewWrite.ts:49` likely settles at once. A drag's `persistAfter` (`pendingView.ts:222-230`) relies on staging, so don't remove it without a drive.
- **`ViewRow` is used outside views** — Report 6 F1.
- **`saveViewIn`/`resolveViewWrite` are exported only for tests** — Report 1 F1 collapses them.
- **Total for this domain:** ~−70 to −105 production lines across F2–F11 (F5's −3 now counted in Report 1 F4), depending on F2's option and F9; F1 is the structural payoff for List/Gallery and is line-neutral.

---

#### Removed

- **F5 • The Active View Resolves Twice per Mount:** Duplicate of Report 1 F4, which carries the same fix plus the unbuilt-kind `nests` fallback note (shared with Reports 5 F1 and 8 F12).
- **§Names Row `host` → `contentHost` (`useViewHost.ts:48`):** Duplicate of Report 1 §Names.

#### Cross-Report Conflicts

- **View-List Ops (F2 vs Report 1 F8 vs Report 6 F4):** All three found the same duplication; F2 is the home because it holds the behavioral divergences. Reports 1 and 6 proposed a shared pure-ops layer over `mapViews`'s shape at −40 to −70; against the code the two stores differ in id location, active representation, refusal shape, and undo carriage, so the layer shares only the rules. F2's UI fix and a small rule-helper set compose; the larger `ViewList` provider is Nathan's call.
- **Locked-Rename Fix (F3 vs Report 1 F1 / Report 8 F2):** The scout's route through `saveViewIn` conflicts with collapsing it; the bug needs only the `onBegin` gate, so Report 1 F1 stands.
- **`containerConfig.ts` (§Placement vs Report 6 F2 vs Report 1 F10):** The scout kept it "unless another scout folds container-sidecar writes together"; Report 6 F2 does, and holds.
- **`deleteViewWithUndo.ts` (§Placement vs Report 6 F9):** Into `ViewFrame` holds; Report 6 F9 (into `viewWrite.ts`) is removed, since it's a container-only dialer call, not a view-patch write.
- **View Button Defaults (§Keep vs Report 6 §7):** §Keep holds on commit and doc evidence.
- **Embed CSS and Class Renames (F1 vs Report 2 F7):** Report 2 F7 may rename the `.table-view` shell class; `view-tile.css.ts:140` keys on it. F1's attribute keying removes that dependency, so land F1 first or rename both together.
