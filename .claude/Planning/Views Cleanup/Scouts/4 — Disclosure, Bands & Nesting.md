### Scout 4 — Disclosure, Bands & Nesting

**Grounded At:** `cae07c129` · read-only · reconciled against HEAD (`cae07c129`, unchanged); every file size in the map re-measured and matching.

#### Scope Correction

The brief names `Core/Navigation/NavList.tsx` as "the sidebar tree." It isn't one: NavList is the Navigation pane's flat pins + recents list (`NavList.tsx:129-181` — two `lineList` lanes, no depth, no fold, no `Reveal`). The sidebar **tree** is `Core/Interface/Sidebar/` — `Sidebar.tsx:195-235` (`ContainerRow`, recursive), `Disclosure.tsx` (the folding branch row), `sidebarRows.tsx` (`Leaf`), `sidebarDnd.tsx` + `sidebarDndModel.ts` (its drop model). This report scouts that tree as the sharing candidate; NavList has nothing to share with a disclosable List and sits in **Keep**. (The settled scope has since adopted this correction.)

---

### 1. Map

| File | Owns | Called By |
| --- | --- | --- |
| `Core/Views/Pipeline/group.ts` (456) | `GroupPlan`, `resolveGroups` → the `ResolvedGroup` tree (set / bucket / tail), the prune walkers, bucket labels and order, set-order helpers | `resolveView.ts`, `useViewHost.ts`, `bandRouter.ts`, `GroupFrame.tsx`, `bandModel.ts` |
| `Core/Views/Pipeline/bandOrder.ts` (22) | `orderGroups` — applies `group_order` to set groups | `resolveView.ts:55` only |
| `Core/Views/Bands/bandModel.ts` (350) | `bandModelOf` (tree → flat `BandNode[]` with depth/parentKey), `headContextOf` (labels and faces), `shownHeads`, `springsInto`, `memberDepth`, and the band **slot model** (`bandSnap` / `bandSlot`) | `useViewHost.ts:124`, `useViewInteractions.tsx`, `GroupBand.tsx`, `GroupFrame.tsx`, `TableView.tsx:20`, `useBandHeads.ts` |
| `Core/Views/Bands/bandRouter.ts` (197) | Band ref/drop types, `routeBandDrop` (pure), `runBandEffect`, `bandRouting`, `bucketValueAt` | `useViewInteractions.tsx:29`, `GroupFrame.tsx`, `bandModel.ts` |
| `Core/Views/Bands/GroupBand.tsx` (267) + `group-band.css` (53) | `bandSpec` (band `LineSpec`), `GroupBand`/`HeadedBand` (head + `Reveal` body), `BandGlyph` | `TableView.tsx:269`, `CardsView.tsx:384`, `useViewInteractions.tsx:30,145`, `GroupFrame.tsx` (bandSpec) |
| `Core/Views/Host/useBandHeads.ts` (33) | Builds `heads` (plus returns painted, sets, nexus) | `useViewHost.ts`, `GroupFrame.tsx:358` |
| `UIX/Table/rowIndent.ts` (2) | `rowIndent(depth)` → `calc(var(--row-indent) * depth)` | `TableView.tsx`, `BundleTable.tsx:287` |
| `UIX/Table/RowRail.tsx` (12) | The click-swallowing gutter span | `TableView.tsx:480`, `BundleTable.tsx:277` |
| `UIX/Menus/DisclosureRow.tsx` (127) + `listed-outline.css.ts` (31) | `useDisclosureSet`, `DropOutline` (the chevron/spacer), `DisclosureRow` (MenuItem + chevron + `Reveal` on a drawn rail) | DropOutline: GroupBand, BundleTable, Sidebar `Disclosure`/`Leaf`, PropertyFrame. DisclosureRow: GroupFrame, LocationField, OutlineMenu, AutocompletePane |
| `UIX/Interactions/engine.tsx` (1441) | `LineZone`/`LineRow`/`useLineRow` (drag + row keyboard), `useLineSpring`, `useLineGroup`, `disclose` arming | every line surface |
| `UIX/Interactions/dragDisclose.ts` (100) | Spring-open on drag dwell (module singleton) | `engine.tsx:37,590,744-757` |
| `UIX/Interactions/lineList.ts` (65) · `groupedLine.ts` (37) · `reorderModel.ts` (122) | Lane-based row slots; item+group spec composition; `rank`, `INTO_EDGE`, `walksTo`, `buildLanes` | lineList: 9 surfaces; groupedLine/rowLine/rowStep: `useViewInteractions.tsx:326-347` only |
| `UIX/Interactions/virtualRows.ts` (48) | The virtualizer seam | `BundleTable.tsx:177`, `IconPicker.tsx:77` |
| `UIX/Interactions/placement.ts` · `ghostCreate.ts` | Grid slot math (SortableZone); hover ghost row | not disclosure — out of this domain's findings |
| `Core/Bundles/browser.ts` (318) · `rows.ts` (197) · `BundleTable.tsx` (315) | `TreeRow`/`treeRows` (flat visible tree, async open map); row building; the virtualized bundle table | `ArchiveView.tsx`, `TrashFrame.tsx` |
| `Core/Interface/Sidebar/Disclosure.tsx` (224) · `sidebarRows.tsx` (71) · `sidebarDndModel.ts` (325) | The sidebar's branch row (fold via `useFold`, lock, peek, rename-unfold); `Leaf`; the sidebar drop model | `Sidebar.tsx` |

#### How Many Implementations

- **Collapse State — six row-level encodings** (plus MarkdownPM's heading fold and the panel folds, both in **Keep**): `view.collapsed_groups` as a collapsed Set (`useViewHost.ts:58,145-150`); `useFold` in device prefs, exceptions to a default (`store.ts:71-80`); `useDisclosureSet`, exceptions to a default in React state (`DisclosureRow.tsx:11-24`); LocationField's second flipped set for narrowed mode (`LocationField.tsx:106-118`); the Bundles open map with async children (`browser.ts:50-63,161-224`); autocomplete's collapsed headings (`useConnectionAutocomplete.ts:71,246`). Plus PropertyFrame's single `allOpen` boolean.
- **Visibility Walks — five:** `shownHeads` (`bandModel.ts:179-188`), `openHeadingRows` (`autocomplete.ts:141-153`) — flat depth-sentinel; `treeRows` (`browser.ts:54-63`), `shownRows` (`LocationField.tsx:35-36`) — recursive; TableView's `renderRows` `visible` flag (`TableView.tsx:225-278`).
- **Indentation — four functions over one 14px token:** `rowIndent` (`rowIndent.ts:2`), MenuItem's `rowLead` (`MenuRows.tsx:15-16`, `8 + depth × DISCLOSURE_INDENT`), TableView's local `indent` adding `--loose-inset` (`TableView.tsx:212-213`), and DisclosureRow's nested `railRow` padding (`listed-outline.css.ts:18-31`). Drop lines restate them: `menuDropLine` (`MenuRows.tsx:18-28`), `bandZone`'s `calc(var(--drop-line-inset) + …)` (`useViewInteractions.tsx:151`), `rowLine` (`lineList.ts:49-54`).
- **Disclosure Motion — one each, already consolidated:** `Reveal` (`UIX/Animations/Reveal.tsx`), `DropOutline`'s rotate, and `useLineSpring` + `dragDisclose`. Bundles has no motion because it virtualizes; that's a consequence, not a parallel build.
- **Tree Drop Models — two, deliberately apart:** `bandSnap`/`bandSlot` (`bandModel.ts:223-350`) and `sidebarSnapshot`/`sidebarSlot` (`sidebarDndModel.ts:140-294`), both on `rank`/`INTO_EDGE`/`walksTo`. See **Keep**.

**Status:** Verified (the collapse-state, walk, and indent sites re-read). This is the stronger count of what Report 2's §Insights calls three holders.

---

### 2. Findings

##### F1 • The Bands Machinery Is Already Presentation-Agnostic — List's Real Gap Is TableView's Band Walk, Not the Bands

- **What's There:** `bandModelOf` + `bandSpec` + `bandRouting` + `springsInto` already serve two unrelated renderers: `GroupBand` (Table, Cards) and `DisclosureRow` (GroupFrame, `GroupFrame.tsx:369-475`). `interactions.listZone` (`useViewInteractions.tsx:325-347`) is the rows+bands line zone. What a List would still lift out of TableView is the recursion in `renderRows` (`TableView.tsx:225-278`): per group, members then children, wrapped in `GroupBand`, with `memberDepth` and a tail-vs-member indent rule (`:228-229`, `:212-213`).
- **Problem:** The indent rule for a band's members lives only in TableView, while the drop line for the same rows computes its indent in `useViewInteractions.tsx:337` through `memberDepth` with plain `rowIndent` — no `--loose-inset` for tail rows. Two owners for "how far a member row sits," and they disagree for tail rows by `--loose-inset`. Measured from the code: every row line starts `DROP_LINE_INSET` (2px, `theme-vars.css.ts:38`) inside the row (`lineList.ts:37`) plus its indent, so a band member's line sits 2px right of its content while a depth-0 tail row's line sits 6px left of its content (`--loose-inset` 8px, `table-tokens.css:9`) — an 8px divergence between the two.
- **Proposed:** Give the member-indent rule one owner in `Core/Views/Bands/bandModel.ts` beside `memberDepth` (`memberIndent(kind, depth)`), consumed by TableView rows and the listZone line. Defer a shared `BandTree` walker: Table is the only nesting renderer today (Cards is flat, `group.ts:265`), so a walker earns its place only when List lands — it would net about +5 now. Say that to Nathan as the deliberate stopping point.
- **Delta:** ≈ −2 (rule moves; TableView's local `indent` closure goes).
- **Status:** Verified (code and the 8px arithmetic); Unverified (needs a live drag) — how the mismatch reads on screen.
- **Overlaps:** 2 (F11, removed there as this finding's duplicate; §Keep agrees on deferring the walk); 3 (F7 proposes the walker now — see Cross-Report Conflicts).
- **Outside:** `Core/Views/Table/TableView.tsx`, `Core/Views/Host/useViewInteractions.tsx`.

##### F2 • Collapse State: One `{ isOpen, toggle }` Shape for the Band Machinery

- **What's There:** `bandSpec`, `shownHeads`, and `BandView` take a **collapsed** Set (`GroupBand.tsx:36,52,63`, `bandModel.ts:179`). GroupFrame holds an **open** set from `useDisclosureSet` and inverts it each render to feed them: `new Set(sets.preorder.filter((id) => !expanded.has(id)))` (`GroupFrame.tsx:384-387`). `useDisclosureSet` returns `has` meaning *open* (`DisclosureRow.tsx:19`), while views' `collapsed.has` means *closed* — opposite polarities under the same verb. `toggleCollapse` hand-writes `toggled` (`useViewHost.ts:145-150` vs `UIX/Utilities/checkSet.ts:1-5`). LocationField runs a second flipped set by hand for narrowed mode (`LocationField.tsx:106-118`), keeping the un-narrowed expansion intact across a search — deliberate.
- **Problem:** Two polarities, an adapter that exists only to flip one into the other, and a re-implemented helper.
- **Proposed:** One `Disclosure = { isOpen(key), toggle(key) }` type beside `useDisclosureSet` (whose `has` becomes `isOpen`). `bandSpec`/`shownHeads`/`BandView` take it; views build it over `collapsed_groups` (persisted name unchanged) with `toggled`; GroupFrame passes `expanded` straight through. Let `useDisclosureSet` take a default and a reset key so LocationField's narrowed set is a second hook instance rather than hand-rolled state. `useFold` stays its own per-key device-local hook (sync-neutral, one key per component).
- **Delta:** ≈ −10 (GroupFrame −4, useViewHost −3, LocationField −6, hook +3).
- **Status:** Corrected — LocationField's narrowed default is per id (`tree.leads.has(id)`, `LocationField.tsx:116`), not a boolean, so the hook's default must accept a predicate as well as `defaultOpen`. Otherwise verified; the net-negative holds only because both the GroupFrame flip and LocationField's hand-rolled set are present to delete.
- **Overlaps:** 2 (§Insights, pointer to this); 5 (§Keep, `LocationHierarchy`/`LocationTree` stay separate renderers over this shared state).
- **Outside:** `Core/Views/Settings/GroupFrame.tsx`, `LocationField.tsx`, `Core/Interface/Toolbar/OutlineMenu.tsx` (rename of `has`), `Core/Views/Host/useViewHost.ts`.

##### F3 • `shownHeads` and `openHeadingRows` Are the Same Algorithm

- **What's There:** `bandModel.ts:179-188` and `Core/MarkdownPM/Autocomplete/autocomplete.ts:141-153` are the same depth-sentinel walk ("skip everything deeper than a collapsed row until the next row at its depth or above"), one over `depth` with an `Infinity` sentinel and a tail filter, one over `level` with a `null` sentinel.
- **Problem:** One Way. A virtualized List over band nodes needs exactly this walk a third time.
- **Proposed:** One generic `unfolded(rows, depthOf, isOpen)` beside the F2 `Disclosure` type; both become one-line calls (`shownHeads` keeps its tail filter). The recursive variants (`treeRows`, `shownRows`) take tree-shaped input and stay. `browser.ts:44-48`'s `TreeRow { row, depth, open: boolean | null }` is already the flat-visible-row shape a virtualized List would consume — name it as the reference shape rather than inventing one.
- **Delta:** ≈ −8 to −10.
- **Status:** Corrected — the scout called them "line-for-line the same"; they're structurally identical with different sentinels, which doesn't change the proposal. Placement note: beside `DisclosureRow` puts a MarkdownPM import on `UIX/Menus`; the home is Nathan's call.
- **Overlaps:** none.
- **Outside:** `Core/MarkdownPM/Autocomplete/autocomplete.ts` (real duplication, so it enters).

##### F4 • GroupBand's Chevron Is the One Disclosure Chevron That Isn't `DropOutline`'s Own Toggle

- **What's There:** `GroupBand.tsx:178-185` wraps `<DropOutline>` in a `<button className="group-band-drop-outline row-chevron">` with its own `onClick` and an aria-label, plus CSS `group-band.css:42-50` and `table-view.css:69-71`. Every other clickable chevron uses `DropOutline`'s `onToggle` (`DisclosureRow.tsx:46-52`: stopPropagation + `data-drag-slop`). The drag engine treats `button` and `[data-drag-slop]` identically (`UIX/Interactions/gesture.ts:7`), so the 12px slop the test pins (`bandZone.test.tsx:194-212`) holds either way. History: the button predates the monorepo move (`0cdb92cd2`), before `DropOutline` gained `onToggle`.
- **Problem:** A parallel toggle path and two CSS rules for one glyph. The button is also a separate Tab stop inside a head that's already the keyboard `treeitem` with `aria-expanded` (`GroupBand.tsx:159-160`), against the one-Tab-stop row model BundleRows states (`BundleTable.tsx:160`).
- **Proposed:** `<span className="row-chevron"><DropOutline open={!collapsed} onToggle={toggle} /></span>`; a `.group-band [data-drop-outline]` rule replaces the button's tertiary color for Cards (inside `.table`, `table.css:195-197` already colors the chevron tertiary), and `table-view.css:69-71`'s `cursor: pointer` re-targets the same attribute. Surface the lost separate focus stop to Nathan as a deliberate fix.
- **Delta:** ≈ −10.
- **Status:** Verified (mechanics); Unverified (needs a live run) — the Tab-stop behavior.
- **Overlaps:** 8 (F4, `.group-band-drop-outline` pinned six times in tests).
- **Outside:** tests that select `.group-band-drop-outline` (see §5).

##### F5 • `group.ts`'s Three Prune Walkers Are One Walker With Three Predicates

- **What's There:** `pruneEmptyBuckets` (`:333-340`), `pruneEmptyGroups` (`:342-350`), and `dropHiddenGroups` (`:85-101`) share one skeleton: flatMap, split off `children`, filter or recurse, rebuild without an empty `children`. `resolveView.ts:51-54` composes them.
- **Problem:** Less to Carry — three copies of the tree-rebuild idiom. Composition order ("bucket-first", `:332`) is load-bearing only because they're separate passes. A single bottom-up pass that prunes children before judging the parent gives the same result in one walk.
- **Proposed:** `pruneGroups(groups, drops: (g) => boolean)`, evaluated after its children are pruned. Call sites: hidden → `g.kind === 'bucket' && isBucketHidden(…)` keyed by the plan; hide-empty → `g.kind !== 'tail' && isEmptyBand(g)`; filtered → `g.kind === 'set' && isEmptyBand(g)`.
- **Delta:** ≈ −15.
- **Status:** Verified by reading. The scout's inference that one plan-keyed predicate covers both hidden arms holds: the property plan emits buckets only at the top (`group.ts:217-242`), a sub-grouping emits them only as children of top-level Sets (`:307-328`), and `dropHiddenGroups` itself filters only one child level. `group.test.ts` pins each arm and would re-point.
- **Overlaps:** 1 (F5, `group.ts` holds six jobs; this shrinks one of them).
- **Outside:** `Core/Views/Pipeline/resolveView.ts`.

##### F6 • `bandOrder.ts` Dissolves: Order the Set Tree Once, Before Building

- **What's There:** A 22-line file, one function, one caller (`resolveView.ts:55`). `orderGroups` re-walks the built groups, reorders `set` groups by `group_order`, and makes non-set groups "hold their slot" (`bandOrder.ts:1,11-20`).
- **Problem:** Set groups are always contiguous within a level (`placeTail` puts the tail at either end, `group.ts:51-61`; children are all sets or all buckets+tail), so reordering the `setTree` before `resolveGroups` produces the same band order. The slot-holding logic exists only because ordering happens after building. File name (`band…`) and function name (`…Groups`) also disagree.
- **Proposed:** A ~6-line `orderSetTree(tree, order)` in `group.ts`, applied in `resolveView` alongside `pruneHiddenSets` when `viewSetOrder` returns an order (same condition as now). Delete `bandOrder.ts` and `bandOrder.test.ts`'s subject.
- **Delta:** ≈ −12.
- **Status:** Corrected — the band order is equivalent, but item order inside flattened bands isn't. `structuralFlat` and `structuralSubGrouped` gather a band's pages through `subtreeIds(node)` (`group.ts:74-76`, used at `:278` and `:308`), so an ordered tree changes the order in which a top-level band's nested Sets contribute their pages. Wherever the sorter is null (no sort and no manual order, `sort.ts:60`) or rows tie on every key (the sort is stable), Cards bands and sub-grouped bands with nested Sets would list those pages in `group_order` instead of folder order. That's a visible change, arguably what should always have been there, and it needs Nathan's ruling before this dissolves the file; without it, Report 1 F7's relocation is the change-free form.
- **Overlaps:** 1 (F7 folds `orderGroups` into `resolveView.ts` or `group.ts` unchanged — see Cross-Report Conflicts).
- **Outside:** `resolveView.ts`.

##### F7 • `bandRouter`'s Mirror Types Invert the Model ↔ Router Dependency

- **What's There:** `bandRouter.ts:9-20` defines `SetRef`/`BucketRef`/`BandRef` plus `BandItem`/`BandList` — structural stand-ins for `BandNode`/`BandModel` — and `bucketValue`/`bucketValueAt` (`:149-163`), a model query. `bandModel.ts:11-17` imports both from the router to extend them (`SetBand = SetRef & …`, `:33-36`). Created this way in `47c16173d` ("one pure band router"); the stand-ins exist to avoid a value-level cycle.
- **Problem:** The model depends on its router, the router restates the model's shape, and a reader finds band types in two files.
- **Proposed:** Ref/drop types and `bucketValueAt` move into `bandModel.ts`; `BandItem`/`BandList` go, `bandRouting(bands: BandModel, …)`. `bucketValue` must still accept what `bandSnap`'s `byKey` holds — a map over `BandRef` (`bandModel.ts:259`), not `BandNode` — so its parameter becomes `BandNode | BandRef | undefined`.
- **Delta:** ≈ −6.
- **Status:** Corrected — the scout says the router then "`import type`s" from the model and "stays pure (type-only import)." `bandScopeOf` calls `bucketValueAt` (`bandRouter.ts:169`), so the router takes a value import of it from `bandModel.ts`; no cycle forms as long as `bandModel.ts` imports only types back (`BandDrop`). Otherwise verified.
- **Overlaps:** 8 (F5 lists `routeBandDrop`/`runBandEffect`/`BandScope` as test-only exports, kept); I-070 cites `routeSet` in this file (`bandRouter.ts:~72-107`); moving types doesn't touch it.
- **Outside:** `useViewInteractions.tsx:29` import path.

##### F8 • The "Top-Level Set Opens" Rule Is Written Twice

- **What's There:** `bandModel.ts:74,104` derives `opens` from `opensTop` (source is a Collection) and `parentKey === null`; the sidebar uses `isTopContainer(node)` (`Sidebar.tsx:197`, `Core/Nexus/treePatch.ts:97-98`) for the same `openFoldersOnTitleClick` behavior.
- **Proposed:** `opens = heads.foldersOpen || isTopContainer(set)`; `opensTop` leaves `HeadContext`. Equivalent: a depth-0 band in a Collection view has a two-segment path; in a Set view it has three; views exist only on top containers (`treePatch.ts:96`).
- **Delta:** ≈ −3.
- **Status:** Verified.
- **Overlaps:** none.

##### F9 • Indentation: One Step Function, One Token

- **What's There:** `--row-indent` is an alias of `--disclosure-indent` read only by `rowIndent.ts:2` (`table-tokens.css:8`), and it exists only inside `.table`. `rowLead` (`MenuRows.tsx:15-16`) encodes the same 14px step in JS from `DISCLOSURE_INDENT` (`theme-vars.css.ts:36`). `--disclosure-rail-x` is never set anywhere, so `RAIL_X`'s `var()` fallback (`listed-outline.css.ts:16`) is dead indirection.
- **Decision for Nathan:** two nesting idioms coexist. Row lists (Table, Bundles, sidebar) indent each row **absolutely** by depth; menu pickers (DisclosureRow) **nest** containers with a drawn rail line. A virtualized List can only use the absolute idiom, so the recommendation is: absolute depth is the house idiom for row lists, the rail stays the picker idiom — and both share one step.
- **Proposed:** `rowIndent` reads `--disclosure-indent`; the alias row goes; `rowLead` becomes `depth ? calc(8px + rowIndent(depth)) : ROW_LEAD`; drop the dead `--disclosure-rail-x` fallback. `rowIndent` moves beside the chevron (see **Placement**), since Bundles and a List aren't Table.
- **Delta:** ≈ −2.
- **Status:** Corrected — the scout's −5 counts `rowLead` as shrinking; its new expression is the same length, so only the alias row and the dead fallback go. Otherwise verified.
- **Overlaps:** 2 (F6 folds `rowIndent` into a Table-owned `RowLead` — see Cross-Report Conflicts).
- **Outside:** `UIX/Menus/MenuRows.tsx`, `UIX/Table/table-tokens.css`, `ViewTypesPM.md:104`.

##### F10 • The Property Grouping and the Sub-Grouping Build Buckets Twice

- **What's There:** `property()` (`group.ts:217-242`) and `structuralSubGrouped` (`:295-330`, the shared block `:307-321`) each do: bucket rows by `bucketKey`, split off value-less rows, order buckets, emit bucket groups, `placeTail`. One keeps empty **live** options (`:232-236`); the other drops every empty bucket (`:315-316`). The divergence is undocumented in `ViewTypesPM.md`; history doesn't record the reason (*inferred* deliberate: an empty option band under every Set would be clutter).
- **Proposed:** One shared bucket builder both call. Surface the empty-sub-band divergence to Nathan rather than unifying it.
- **Delta:** ≈ −8 to −12.
- **Status:** Verified (shapes; equivalence rests on the group tests).
- **Overlaps:** 1 (F6, the same finding; its `bucketBands(rows, grouping, sorter, placement, scope?)` form, where the Set scope decides both the key and the live-option keep, is tighter than this report's six-parameter form and is the one to carry).

##### F11 • GroupFrame Fabricates a `ResolvedGroup` Tree With Empty `items`

- **What's There:** `GroupFrame.tsx:369-383` builds `ResolvedGroup[]` (`items: []`) from the `SetIndex` purely to feed `bandModelOf`/`bandRouting`, and separately re-walks `orderedChildren` to render (`:405-406`).
- **Concern:** A data shape forced through to reuse a builder. A cleaner seam (a `bandModelOf` input over `{ key, kind, children }` without items) is plausible but low confidence; flag it, don't plan it yet.
- **Status:** Corrected — the scout said `isEmptyBand` then reads *every* Set as empty, which `springsInto` consults for buckets. It reads only a Set with no children as empty (`viewRow.ts:61-62`), and under a sub-grouping — the only case that drags buckets — every Set carries chip children, so `springsInto` isn't misled in practice. The concern stands as shape-forcing only.
- **Overlaps:** 1 (§Insights, GroupFrame re-derives host state).

##### F12 • Sidebar Branch Row vs `DisclosureRow`: Two Compositions of the Same Primitives — Keep Both, Align the Idiom

- **What's There:** `Disclosure.tsx:161-221` and `DisclosureRow.tsx:96-125` both hand-compose `MenuItem` + `DropOutline` + `Reveal fill`. The sidebar's adds a selected state, per-row `indent`, pointer handlers, `belowHeader`, the lock toggle, peek filtering, and rename-unfold (`:84-139`) — all sidebar-only.
- **Assessment:** Merging would grow `DisclosureRow` by ~6 props to save ~15 lines of composition — net positive and a menu primitive bent around the sidebar. Don't merge. The only real divergence is the indentation idiom, settled under F9.
- **Delta:** 0.
- **Status:** Verified.
- **Overlaps:** none.

---

### 3. Names

| Now | Proposed | Why |
| --- | --- | --- |
| `DropOutline`, `dropOutline*`, `data-drop-outline`, `--drop-outline-beat`, `listed-outline.css.ts` | `DisclosureChevron`, `chevron*`, `data-chevron`, `--chevron-beat`, `disclosure.css.ts` | It's the fold chevron; "drop" collides with the drag vocabulary (`DropLine`, `DropSlot`, `drop-chrome.css`, `--drop-line-inset`). Drives select `data-drop-outline` (§5). Report 5 proposes `DisclosureGlyph`; this report's name carries. |
| `useDisclosureSet().has` | `isOpen` | `has` reads as set membership and means *open*; views' `collapsed.has` means *closed*. |
| `Disclosure` (`Core/Interface/Sidebar/Disclosure.tsx`) | `Branch` (`Branch.tsx`) | It's the sidebar's folder row, paired with `Leaf` (`sidebarRows.tsx:40`); `Disclosure` / `DisclosureRow` / `useDisclosureSet` / `dragDisclose` / `devicePrefs.disclosure` are five things sharing one stem. |
| `BandView` (`GroupBand.tsx:35`) | `BandControls` | A bag of callbacks, not a view — collides with `TableView`, `CardsView`, `SavedView`. |
| `HeadContext` / `headContextOf` / `heads` | `BandFaces` / `bandFacesOf` / `faces` | It resolves labels and faces; "heads" also means head **rows** (`shownHeads`, `vacantHeads`). |
| `BandGlyph` | `BandFace` | It draws the whole face (title or chip); the spec's `glyph` (`GroupBand.tsx:71`) means icon only. Matches `BucketFace`. |
| `useBandHeads` | `useBandSource` | Returns painted, sets, nexus, and heads (`useBandHeads.ts:32`). Report 1 proposes `usePaintedContainer` for the same file after it absorbs the paint-ahead (Report 1 F1); one name to pick. |
| `bandOrder.ts` / `orderGroups` | gone (F6) or folded (Report 1 F7) | File and function disagree. |
| `pruneEmptyBuckets` / `pruneEmptyGroups` / `dropHiddenGroups` | `pruneGroups` (F5) | One walker. |
| `BandItem` / `BandList` | gone (F7) | Mirror types. |
| `toggleCollapse` / `isCollapsed` / `itemsVisible` / `expanded` / `open` | one family: `isOpen` / `toggle` in code; "collapsed" only where persisted (`collapsed_groups`) | Four verbs for one state across `useViewHost`, `TableView`, `GroupFrame`, `LocationField`. |

`tail` (the ungrouped run) is opaque but consistent across pipeline, model, and CSS; leave it.

---

### 4. Placement (Proposals for Nathan's Approval)

- **`DropOutline` + its styles:** `UIX/Menus/DisclosureRow.tsx` + `listed-outline.css.ts` → `UIX/Elements/DisclosureChevron.tsx` + `disclosure.css.ts`. Every external importer is outside Menus (GroupBand, BundleTable, Sidebar `Disclosure`, `sidebarRows`, PropertyFrame); only the in-file `DisclosureRow` is a menu; it lived in Elements until `2b2fed847` (08-29) moved it into Menus.
- **`rowIndent`:** `UIX/Table/rowIndent.ts` → beside the chevron in `UIX/Elements/DisclosureChevron.tsx`; the two-line file goes. `RowRail.tsx` stays in Table (its CSS is `table.css:211-217`). Contested by Report 2 F6.
- **`useDisclosureSet` + the `Disclosure` type + `unfolded`:** stay with `DisclosureRow` in `UIX/Menus/DisclosureRow.tsx` (menu-picker state), with the type and `unfolded` exported for `Core/Views/Bands` and autocomplete. Alternative if Nathan prefers one disclosure home: all of these join the chevron in Elements, leaving `DisclosureRow` alone in Menus.
- **`useBandHeads.ts`:** `Core/Views/Host/` → `Core/Views/Bands/` (its product is band faces; GroupFrame imports it from Host today).
- **`bandOrder.ts`:** folds into `Core/Views/Pipeline/group.ts` (F6, or Report 1 F7's change-free fold).
- **Band ref types + `bucketValueAt`:** `bandRouter.ts` → `bandModel.ts` (F7).

---

### 5. Becomes False

- **Docs:** `ViewTypesPM.md:104` (`--row-indent` token row, F9); `InteractionPM.md:36` (`dropOutline`, rename); `ViewTypesPM.md:47` stays true for F4 (chevron still toggles).
- **Comments:** `bandOrder.ts:1` (goes); `group.ts:332` ("Compose bucket-first…", F5); `group-band.css:1` and `table-view.css:54` ("gutter chevron" — still true, but the `.group-band-drop-outline` rule they frame goes); `Reveal.tsx:61` / `group-band.css:14` (the `[data-reveal] > *` contract is untouched — stays true).
- **Tests:** `.group-band-drop-outline` selectors in `bandZone.test.tsx:195`, `bandCommits.test.tsx:209,701,747,874,882` (F4); `data-drop-outline` / `dropOutlineOpen` in `BundleTable.test.tsx`, `FilterFrame.test.tsx` (×4), `OutlineMenu.test.tsx`, `connectionCommit.test.tsx` (×2) (rename); `bandOrder.test.ts` (F6); `group.test.ts` prune arms (F5); `bandModel.test.ts`, `GroupBand.test.tsx`, `bandZone.test.tsx` (`shownHeads`, `headContextOf`, `BandGlyph`, `bucketValueAt` moves and renames); `autocomplete.test.ts` (`openHeadingRows`, F3).
- **Drives:** `.claude/scripts/Archive Drive/live-drive.mjs` + `MATRIX.md`, `.claude/scripts/Properties Drive/live-drive.mjs` (`data-drop-outline`); `AutocompletePane.tsx:142` source selector too; `sidebar.css:198-199` (`.hide-chevrons` keys on `data-drop-outline`).

---

### 6. Keep

- **`bandSnap` and `sidebarSlot` as two drop models.** Same primitives, different worlds: the sidebar interleaves pages and Sets under placement prefs and spans Contexts (`sidebarDndModel.ts:215-294`); bands carry buckets, tails, and band-box extents (`bandModel.ts:233-241`). A shared model would be a union of both.
- **`Reveal`, `useLineSpring` + `dragDisclose`, `groupedLine`, `lineList`.** Already one implementation each. GroupBand's separate `useLineSpring` on the head row (`GroupBand.tsx:133-139`) is deliberate — "the whole band head row springs" (`9d900b2a7`). The three lock mechanisms these carry are I-059's subject (see Report 8).
- **BundleTable's chevron placement:** after the title at depth 0, in the rail slot when nested (`BundleTable.tsx:288,295`) — deliberate per `8c9bc6a75`, since the depth-0 rail slot is the checkbox's.
- **The Bundles open map** (`browser.ts:161-224`): its children load asynchronously, which no other disclosure does.
- **`useFold`'s device-local storage** (`store.ts:71-80`): sidebar folds are per-machine by design (`devicePrefs.ts:1`) and must stay sync-neutral.
- **`NavList`:** a flat two-lane list; nothing disclosure-shaped to share. Its name pairs with `NavGallery` as a layout name.
- **MarkdownPM's heading fold** (`Core/MarkdownPM/folding.ts:375`, its `folds` pref in `Core/Platform/localState.ts:5`, its CSS-mask chevron `--fold-chevron-mask`): the one genuine fold outside the domain. It's a CodeMirror decoration over document ranges, not a React row, so neither the chevron component nor the disclosure state fits it.
- **Panel folds through `useFold`** — the content footer and window footers (`ContentView.tsx:155`, `NavWindow.tsx:42`, `PageWindow.tsx:42`, `MatrixWindow.tsx:21`): one boolean per panel, not row disclosure. The sweep's other hits (`App.tsx:165` "Collapse sidebar", `Button.tsx` `labelCollapsed`, `GlancePane.tsx:303` selection `isCollapsed`, `WindowTabStrip.tsx:94`, `window-base.css`, `frameGrowth.ts:1`, `icon-picker.css.ts:44`, `view-strip.css.ts`, `subfield.css:79`) are word collisions or panel toggles.
- **LocationField's separate narrowed expansion:** keeps the un-narrowed state across a search — deliberate; F2 only changes how it's built.

---

### 7. Insights & Concerns

- **The List Fork:** Table renders every row as nested DOM inside `Reveal` (`TableView.tsx:225-320`, no virtualization); Bundles flattens and virtualizes with no motion (`BundleTable.tsx:177-205`). A List picks one. Nested DOM keeps band motion; flat virtual keeps scale (CLAUDE.md's "never on every X" rule bites a large Table today). The smallest shared shape that serves both is: `TreeRow`-style flat rows with depth and open state, `unfolded`, one `{ isOpen, toggle }`, one indent step, the chevron, and `GroupBand` for heads. Building beyond that before List exists would be speculation.
- **Row Keyboard Lives In The Drag Engine:** BundleRows mounts a never-dragging zone, `lineList({ locked: true, commit: () => {}, label: () => '', watch: [] })` (`BundleTable.tsx:183`), only to get arrow stepping and Enter/Space from `useLineRow` (`engine.tsx:1355-1365`). A non-dragging List hits the same. This is I-059's Trash/Archive case (rows described as draggable); Report 8 covers how it folds.
- **Tree Semantics Are Partial:** only the GroupBand head and BundleRow carry `role="treeitem"` + `aria-expanded` (`GroupBand.tsx:159-160`, `BundleTable.tsx:265-266`); no surface has a `role="tree"` container or Left/Right expand-collapse; the sidebar and DisclosureRow announce nothing. A shared disclosure state is the natural place to fix this if Nathan wants it.
- **`hideChevrons` Reach:** the setting's caption says it collapses "the sidebar's chevron gutter" (`Core/Settings/frames.ts:262-264`), applied by sidebar CSS (`sidebar.css:197-208`), yet GroupFrame honors it too (`GroupFrame.tsx:356,430`, by design in `17ff625fc`) and no other surface does. Either it's the sidebar's or it's every chevron's — a Nathan call; if global, it becomes one `html.hide-chevrons [data-chevron]` rule.
- **Three Walks Over One Tree:** `bandModelOf` (`bandModel.ts:120-131`), useViewHost's row maps (`useViewHost.ts:125-141`), and TableView's render all walk `groups` each pass. Folding the row maps into `bandModelOf` would save ≈ 10 lines but recompute them on face changes; the Host scout's call.
- **`ROW_H`:** see Report 2 F10.
- **`COLUMN_LAYOUT`:** Report 2 F8 keeps it Table-owned with Bundles' import accepted.
- **I-070** (`bandRouter.ts:~72-107`, `routeSet`) sits inside F7's file; moving types doesn't touch its logic.

#### Delta Summary

| Finding | Delta | Status |
| --- | --- | --- |
| F1 member-indent owner | −2 | Verified (visual Unverified) |
| F2 one disclosure shape | −10 | Corrected |
| F3 `unfolded` | −8 to −10 | Corrected |
| F4 GroupBand chevron | −10 | Verified (Tab Unverified) |
| F5 one prune walker | −15 | Verified |
| F6 `bandOrder.ts` | −12 | Corrected (needs a ruling) |
| F7 band types | −6 | Corrected |
| F8 top-Set rule | −3 | Verified |
| F9 indent step | −2 | Corrected |
| F10 bucket builder | −8 to −12 | Verified (shared with Report 1 F6) |
| **Total** | **≈ −76 to −82** | renames and moves are ±0; F10 counted once across Reports 1 and 4 |

---

#### Removed

- None. Every finding held at least in corrected form.

#### Cross-Report Conflicts

- **`bandOrder.ts` (4 F6 vs 1 F7):** 4 dissolves the file by ordering the Set tree before building; 1 relocates `orderGroups` unchanged. Band order is equivalent either way, but 4's form changes the order in which nested Sets' pages appear inside flattened bands (`subtreeIds`, `group.ts:278, 308`) whenever the sorter is null or rows tie. 4 F6 removes more and arguably fixes behavior; 1 F7 is the change-free form. Nathan rules on whether a custom Set order should reach page order inside a flattened band; if yes, 4 F6 wins on removal grounds.
- **Bucket Builders (4 F10 vs 1 F6):** Same finding; both line ranges are right (4 cites the whole function, 1 the shared block). 1 F6's signature, where the Set scope decides both the key and the live-option keep, is the one to carry. Both surface the empty-option divergence to Nathan.
- **`rowIndent` Placement (4 F9 vs 2 F6):** 4 moves it beside the chevron in `UIX/Elements`; 2 folds it with `RowRail` into a Table-owned `RowLead`. Both current consumers are `.table` surfaces and `--row-indent` only resolves inside `.table`, so 2's placement matches today's use; 4's token change is what would let it leave Table. Present both.
- **Band Walk (4 F1 · 2 §Keep vs 3 F7):** Two defer extracting `renderRows`; 3 F7 adds a walker now (≈ +3). Removal-first favors deferring.
- **`DropOutline` Name (4 §Names vs 5 §Names):** `DisclosureChevron` vs `DisclosureGlyph`. 4's rationale (the drag-vocabulary collision and the old "fold chevron" doc row) is more specific; this report's name carries.
- **`useBandHeads` Name (4 §Names vs 1 §Names):** `useBandSource` vs `usePaintedContainer`. 1's name fits if Report 1 F1 moves tree paint-ahead into this file; otherwise 4's. Decide with 1 F1.
- **Collapse-State Count (4 §How Many vs 2 §Insights):** 4's six encodings are the stronger evidence; 2 now points here.
