### Scout 6 — The Views Root & Its Boundary

**Grounded At:** `cae07c129` · reconciled against HEAD (`cae07c129`). **Host-Run Views Files** (recomputed with `Core/Testing/engineGraph.ts` from `Core/Contract/serve.ts`): `containerConfig.ts`, `filterRules.ts`, `handlers.ts`, `loadValues.ts`, `viewRow.ts`, `views.ts`, `viewsFile.ts`. Everything else at the root is window-side. Outside Views, `Nexus/order.ts`, `Nexus/treePatch.ts`, `Nexus/configReach.ts`, and `Properties/columnStyles.ts` are host-run; `Properties/fieldValue.ts` isn't.

**Prior Art:** IssuesPM I-033 (`.claude/IssuesPM.md:~985`) proposes `filterModel`/`visibilityModel` → `Views/Settings/` and `placeNew` beside the Session creates; I-026 (`:689`) proposes folding `container:configure` and `views:*` into `mutate`.

**Reconciliation:** 9 findings kept (7 Verified, 2 Corrected), 3 removed as duplicates (F4 → Report 7 F2, F9 → Report 1 F1, F11 → Report 1 F9) plus one F12 bullet (→ Report 1 F11).

---

#### 1. Map

| File | Owns | Called By (Non-Test) |
|---|---|---|
| `views.ts` (402) | View kinds registry, `savedView` codec, defaults (`viewOption`), patch folding (`slotsOf`/`foldView`/`applyViewPatch`/`mergeViewEdit`), band keys + hidden-bucket helpers, view ids (`mint*`, `viewIdsOf`, `containerViewIds`), doc walkers (`mapViews`/`mapTiles`), `removedView` | ~45 Views files; outside: Nexus (`configReach`, `containerFields`, `create`, `remint`, `tree`), Tiles (`ViewTile`, `tiles`, `tilesFile`), Properties (`unassignProperty`), Actions (`columnMenu`), MarkdownPM (`tableMenu`), Contract (`bridge`), Testing |
| `viewsFile.ts` (179) | Host: sidecar view-list ops (save, duplicate, reorder, delete, restore, setActive, readStored) with positional-id repair | `handlers.ts`, `Nexus/mutate.ts:186` (setActiveView), `Tiles/tilesFile.ts:85` |
| `handlers.ts` (69) | Host: `views:*`, `container:configure`, `view:loadValues` channels | `Contract/serve.ts` |
| `containerConfig.ts` (15) | Host: writes `view_button` to a container sidecar | `handlers.ts:58` only |
| `loadValues.ts` (32) | Host: reads a container's (or listed pages') frontmatter into `PageValues` | `handlers.ts:67` only |
| `viewRow.ts` (65) | Types: `PageValues`+`pageValuesOf`, `Picked`, `RowValues`, `ViewRow`, `ResolvedColumn`, `ResolvedGroup`, `isEmptyBand`, `UNGROUPED` | 42 non-test files: 24 Views, 11 Properties, 2 Matrix, and one each in Actions, Contract, Navigation, Session, Testing |
| `pageRow.ts` (61) | Row builders `pageRowOf`/`spaceRowOf`; window fetches `fetchPageValues`/`fetchPageRow` | Properties/PropertyPanel, Matrix/matrixInput, Interface (entityMenuActions, PageReaderWindow), Host/useContainerValues |
| `filterRules.ts` (87) | Filter schema, `FILTER_OPS`, rule helpers, `StandaloneFilter` | Views Pipeline/Settings; Matrix, Navigation/previewRules, Nexus/configReach, Session/matrixSlice, Settings/personalization |
| `filterModel.ts` (66) | Filter pane: `decodeFilter`, Title/Location operator lists, `operatorsFor`, `filterTargets` | `Settings/FilterFrame.tsx` only |
| `paneTargets.ts` (44) | `PaneTarget` shape, Filedata/Context/schema target builders, `targetOption` | Settings (Filter/Group/Sort frames), `filterModel`, Navigation/previewRules |
| `valueKinds.ts` (402) | Per value kind: filter ops, rule tests, sort keys, buckets, seeds | Pipeline, Settings, Host, `filterModel`, `reassign` |
| `reassign.ts` (31) | `reassignable`, `groupKeyToValue`, `reassignTarget` | Host/useViewHost, Host/useViewCreation |
| `creationOrder.ts` (75) | `placeNew`/`placeAt`/`placementSlot` (any create's sibling order) + `tieOrderWith` (a view's `manual_order`) | Actions/createActions (`placeAt`, `placeNew`); Host/useViewCreation, Host/useViewInteractions |
| `visibilityModel.ts` (52) | `property_order`/`hidden_properties` patches | Host/useViewHost, Table/useColumns, Settings/VisibilityFrame |
| `viewWrite.ts` (59) | The window's one view-write path (staging, tile lock, refusal report) | 9 files: Settings ×7, Host/useViewHost, Properties/Schema/PropertyFrame |
| `ViewTileScope.tsx` (19) | React context: a tile's view, persist, lock | Tiles/ViewTile (provider); Host ×4, SettingsFrame, `viewWrite` |
| `deleteViewWithUndo.ts` (18) | Container view delete + undo notice | Settings/ViewFrame only (`:89`, `:105`) |
| `viewIcon.ts` (12) | `viewGlyph`, `iconForTypeSwitch` | Settings ×4, Tiles ×2 |
| `ContainerView.tsx` (12) | Wraps `ViewHost` in `InterfaceScaffold` | Interface/ContentView only |

---

#### 2. Findings

##### F1 • The Item/Field Model Lives in Views Under a "View" Name, and Properties Depends on It

**Status:** Corrected (11 Properties files, not 13; `itemColumns` also serves Cards; the destination's engine-graph safety is Unverified). **Overlaps:** 1 (F5), 7 (§Insights).

**There:** `viewRow.ts:8-48` (`PageValues`, `pageValuesOf`, `Picked`, `ViewRow`, `ResolvedColumn`), `Pipeline/columns.ts:13-57` (`propertyColumn`, `contextColumn`, `resolveColumn`, `itemColumns`), and `pageRow.ts:11-43` (`pageRowOf`, `spaceRowOf`) are the record of "an item and its fields" that Properties edits. Eleven non-test Properties files import `Views/viewRow` (`fieldValue.ts:3`, `Cells/Cell.tsx`, `Pickers/ValueSeat.tsx`, `Pickers/PropertyPicker.tsx`, `Pickers/MetadataPicker.tsx`, `Pickers/pickModel.ts`, `assignValue.ts`, `valueOverride.ts`, `valueContext.ts`, `columnDisplay.ts`, `PropertyPanel.tsx`), and `PropertyPanel.tsx:144-147` builds `ViewRow`s for a page with no view. Views imports Properties throughout, so the two domains import each other. `itemColumns` (`columns.ts:43`) serves the Property Panel (`PropertyPanel.tsx:154`), the metadata menu (`Actions/metadataMenu.ts:60`), and Cards' Add list (`CardsView.tsx:188`).

**Problem:** Clearer Boundaries / Less to Understand — the lowest-level record two domains share is owned and named by the higher one. **History:** `3424f5e27` (10-22) moved `pageRow` *from* Properties *to* Views "beside the row it builds"; this proposal keeps that co-location by moving the type too.

**Change:** Move the host-safe half into `Properties/fieldValue.ts` (`resolveFieldValue`, 45 lines): `PageValues`, `pageValuesOf`, `Picked`, `ViewRow`, `ResolvedColumn`, `propertyColumn`/`contextColumn`/`resolveColumn`/`itemColumns`, `pageRowOf`/`spaceRowOf`, and `toRow` from `Pipeline/group.ts:108`. View-only leftovers go to their producer: `ResolvedGroup`/`isEmptyBand`/`UNGROUPED` → `Pipeline/group.ts`, `RowValues` → `Host/useContainerValues.ts`; `resolveColumns` stays in `Pipeline/columns.ts`. `viewRow.ts` and `pageRow.ts` are deleted; `fetchPageRow` (one caller) inlines into `Interface/Menus/entityMenuActions.ts`, `fetchPageValues` joins `useValuesEpoch` in `Host/useContainerValues.ts`. Optional second step: `loadValues` + its channel move to `Properties/handlers.ts`.

**Gate (Reconciler-Found):** `viewRow.ts` is engine-side (`bridge.ts` imports its types), and `fieldValue.ts` isn't in the engine graph today. Moving the types there pulls `fieldValue.ts` and its imports (`propertyValue.ts`, `Nexus/schemas`), plus `pageRowOf`'s (`Contexts/contextResolve`, `Nexus/treeIndex`), into the host graph. Run `engineGraph.test.ts` against the move before committing to this file; if it fails, the destination is a new host-safe Properties file.

**Judgment:** A relocation with ~40 files re-pointing imports for ≈ −10 lines. It earns its place only on *Clearer Boundaries*; it's Nathan's call, and Report 1 F5's row-builder consolidation is its first step either way.

**Delta:** ≈ −10. **Touches:** Properties, Matrix, Navigation, Interface, Session/chromeSlice, Contract/bridge (type import), Testing/pageValues, Actions/metadataMenu, Cards.

##### F2 • `container:configure` Is a One-Field Channel Left After `open_in` Went

**Status:** Verified (one wording correction). **Overlaps:** 1 (F10, removed in favor of this), 7 (§Placement).

**There:** `containerConfig.ts:6-15` writes only `view_button` (as `{ ...cur, ...patch }`); `handlers.ts:55-60`; `Contract/bridge.ts:116-119`; one caller, `Settings/ViewMenu.tsx:36`. `915233964` removed `open_in`, leaving "configure" with one key. Its siblings — `setDisclosureLock` and `setActiveView`, also single container-sidecar fields — are `mutate` ops (`Nexus/mutateRequest.ts:111-112`, `Nexus/mutate.ts:173-187`). `handlers.ts:13` says these handlers are the view *definition*; `view_button` isn't one.

**Problem:** One Way / Reads as Designed — two doors for the same kind of write, a generic name over one field, and a 15-line file plus a channel for one key.

**Change:** Add `setViewButton` to `mutateRequest` beside `setDisclosureLock`, written the way `setDisclosureLock` is (`mutableTarget` + `patchSidecar` + `setOrDrop`, `mutate.ts:173-180`); writing the value explicitly keeps today's on-disk form. ViewMenu calls `mutate` as ViewFrame already does for `setActiveView` (`ViewFrame.tsx:69`). Delete `containerConfig.ts`, the handler, `ContainerConfigPatch`, and the bridge entry. Same file key, same lock, so no sync effect. This is the container slice of I-026.

**Delta:** ≈ −17 to −19. **Touches:** Nexus/mutateRequest, Nexus/mutate, Contract/bridge, Views/Settings/ViewMenu; tests `Views/handlers.test.ts:33-35`, `Files/writePathRace.test.ts:17,56`.

##### F3 • The Per-Field Registry of `SavedView` Is Split Across Views and Nexus

**Status:** Verified. **Overlaps:** none.

**There:** `Nexus/configReach.ts` (376 lines) holds `ROLES` (`:46-81`, a role for every `SavedView` field, `satisfies Record<keyof SavedView, Role>` at `:81`), the `CLEAR`/`GONE` handler tables (`:145`, `:163`), `viewEdit` (`:175`), `propertyClear` (`:189`), and the rule editors `editRules`/`editOperands` (`:92`, `:103`). Per-field knowledge of the same record otherwise lives in `views.ts`: the codec, `VIEW_DEFAULTS`, `VIEW_STATE_KEYS` (`:113`), `ENTRY_KEYS`, and `mergeViewEdit`'s depth map. `Properties/unassignProperty.ts:11-12,39,49` composes `mapViews` (Views) with `propertyClear` (Nexus) to clear one view field set.

**Problem:** Clearer Boundaries — the next view field touches two domains; "what does this field reference" is view knowledge filed in Nexus. The compile check makes it un-forgettable but not discoverable.

**Change:** `ROLES` + `Role` move into `views.ts` beside the codec; `CLEAR`/`GONE`/`viewEdit`/`propertyClear`/`editsOf`/`ConfigEdit` move to a Views host-side file (or the bottom of `views.ts`); `editRules`/`editOperands` move into `filterRules.ts` beside `mapRules`. `configReach.ts` keeps the reach (walks, stored containers, tiles, Matrix, settings).

**Judgment:** A move at ≈ +5; it buys discoverability, not fewer lines. Nathan's call.

**Delta:** ≈ +5. **Touches:** Nexus/configReach, Nexus/finishOwed, Nexus/move, Properties (deleteProperty, optionOps, unassignProperty).

##### F5 • `creationOrder.ts` Holds Two Owners' Logic, and Its `placeAt` Shadows UIX's

**Status:** Corrected (Reconciler-Found: the proposed destination creates an import cycle). **Overlaps:** none.

**There:** `creationOrder.ts:33-75` `placementSlot`/`placeAt`/`placeNew` place *any* create request (pages, Sets, Spaces — `:55-71`) by the personalization setting, wrapping `Nexus/order.ts` `spliceBeside`; `:10-31` `tieOrderWith` writes a view's `manual_order`. `placeNew` and `placeAt` are imported by `Actions/createActions.ts:5`; `placeAt`/`placementSlot` also by `Host/useViewCreation.ts:17`. `UIX/Utilities/moveItem.ts:10` exports a different `placeAt` (array insert with a factory).

**Problem:** Clearer Boundaries / names — Nexus creation placement sits in Views; two unrelated `placeAt`s.

**Change:**
- `tieOrderWith` (+`mergedRanking` and the file's header comment, which describes it) → `Host/useViewCreation.ts`, exported to `useViewInteractions.tsx:31`.
- `placeAt` (renamed, see Names) and `placementSlot` → `Nexus/order.ts` beside `spliceBeside` and `Slot`; they need only `spliceBeside` and type imports.
- `placeNew` can't go to `Nexus/order.ts`: it calls `pageIdsIn`/`containerAt` from `Nexus/treePatch.ts`, and `treePatch.ts:17` imports `resolveOrder` from `./order`, so the move closes a cycle. It needs a home `treePatch` doesn't import — its sole caller, `Actions/createActions.ts`, is the obvious candidate (I-033's "beside the Session creates" reads the same way).
- Delete `creationOrder.ts`.

**Delta:** ≈ −6. **Touches:** Nexus/order, Actions/createActions; `creationOrder.test.ts` splits.

##### F6 • `PaneTarget` Is `PickerOption` With a Different Key, Plus a Dead Field

**Status:** Verified (one placement inconsistency flagged). **Overlaps:** 5 (§Names: `paneTargets` → `pickTargets`).

**There:** `paneTargets.ts:7-11` `{id, label, icon}`; `:40-44` `targetOption` converts to `PickerOption` `{value, label, icon}`; GroupFrame (`:144,268`) and SortFrame (`:92,104`) always convert. `schemaTargets` returns `PaneTarget & { def }` (`:32,37`) and no caller reads a target's `.def` (FilterFrame reads only `.id/.label/.icon`).

**Problem:** Less to Carry — a parallel shape, a converter, and an unread field.

**Change:** Targets are `PickerOption<string>`; delete `PaneTarget`, `targetOption`, and `def`; FilterFrame reads `.value`. Placement: the scout moves the file to `Views/Settings/`, but `Navigation/previewRules.ts:5` imports it — the same "non-pane code importing a pane folder" objection F8 raises against I-033. Keep it at the Views root, or accept that Navigation's preview rules feed a pane; Nathan's call.

**Delta:** ≈ −15. **Touches:** Navigation/previewRules, Settings/PreviewRulesRow (indirect).

##### F7 • Operator Menus Are Split Between `valueKinds.ts` and `filterModel.ts`

**Status:** Verified. **Overlaps:** 5 (F6).

**There:** Every kind's operator list lives in `valueKinds.ts:67-120`; Title's and Location's live in `filterModel.ts:31-39`, with `operatorsFor` (`:41-49`). `decodeFilter` (`:23-28`) and `filterTargets` (`:51-66`) are used only by `FilterFrame.tsx` (`:219, 231, 240`).

**Problem:** One Way — "which operators does the pane offer" has two homes.

**Change:** `TITLE_OPS`/`LOCATION_OPS`/`operatorsFor` → `valueKinds.ts`; `filterTargets` → `paneTargets.ts`; `decodeFilter` → `FilterFrame.tsx` (or `filterRules.ts`). Delete `filterModel.ts`. (I-033's alternative, moving the file whole into Settings, keeps the split.)

**Delta:** ≈ −12. **Touches:** none outside Views.

##### F8 • The "Shown Column" Rule Is Stated Twice

**Status:** Verified. **Overlaps:** 2 (F4: `reorderColumns` restates `placeInShown`).

**There:** `Pipeline/columns.ts:60-73` `resolveColumns`: shown = in `property_order` and not in `hidden_properties` (its header `:1` names this "one allowlist"). `visibilityModel.ts:7-20` `hiddenListIds`: hidden = in `hidden_properties` or not in `property_order` — the complement, written separately. `visibilityModel` is used by Host (`hideShown`, `unhide`) and Table (`hideShown`), not just the Visibility pane.

**Problem:** One Way — two statements of one rule; I-033's "into Settings" would make Host and Table import a pane folder.

**Change:** Merge `visibilityModel.ts` into `Pipeline/columns.ts`, both derived from one shown predicate. Delete `visibilityModel.ts`. With Report 2 F4, `useColumns` then persists `placeInShown` from the same file and `reorderColumns` goes.

**Delta:** ≈ −5. **Touches:** none outside Views.

##### F10 • `reassign.ts` Is Two Value-Kind Queries and One Host Helper

**Status:** Verified (destination of `reassignTarget` follows Report 1 F3). **Overlaps:** 1 (F3).

**There:** `reassign.ts:8-18` `reassignable`/`groupKeyToValue` read `viewSpecOf(...).bucket/seed` — the same kind of question `valueKinds.ts:402` `groupable` answers. `reassignTarget` (`:21-31`) has one caller, `Host/useViewHost.ts:195`.

**Change:** The two queries → `valueKinds.ts` beside `groupable`; `reassignTarget` → wherever the sort-run reassign lives (`useViewInteractions` if Report 1 F3 lands, else `useViewHost.ts`). Delete `reassign.ts`.

**Delta:** ≈ −5. **Touches:** none outside Views.

##### F12 • Minor

**Status:** Verified. **Overlaps:** 8 (§4: `manualOrderDrops.test.tsx` → `Host/`).

- **Two Mint Names:** `mintDefaultView()` (`views.ts:400-402`) is `mintNewView('Table')`; ViewFrame and ViewTile mint `'Untitled'` through `mintNewView`. No change; noted because a reader asks why two exist.
- **`manualOrderDrops.test.tsx`** sits at the root but drives Host behavior — belongs in `Host/` (Report 8 also renames it `rowDrops.test.tsx`).

---

#### 3. Names

| Now | Problem | Proposed |
|---|---|---|
| `ViewRow` | Used for PropertyPanel, Matrix, menus — no view | `ItemRow` (codebase already says "item": `itemColumns`, `ItemColumns`) |
| `ResolvedColumn` / `resolveColumn` / `propertyColumn` / `contextColumn` | A classified field id; in Properties it's a field, not a column | `Field` / `resolveField` / `propertyField` / `contextField` — optional, large churn |
| `Views/Host/` | All window code; "host" elsewhere means the disk-owning process (`hostGraph.test.ts`, I-033's planned host subfolders) | `Views/Seat/` (ViewTypesPM already calls `ViewHost` "one seat") — Nathan's call |
| `view:loadValues` | Only singular-prefixed view channel; loads page values for any container | `values:load` if F1's second step lands; else `views:loadValues` |
| `creationOrder.placeAt` | Shadows `UIX/Utilities/moveItem.placeAt` (different semantics) | `placedBeside` |
| `filterRules.ts` / `filterModel.ts` / `Pipeline/filter.ts` | Three "filter" files, roles unclear by name | After F7: `filterRules.ts` (schema) and `Pipeline/filter.ts` (evaluation) remain |
| `ViewTileScope.tsx` | No JSX | `.ts` (Report 1 F1) |
| `container:configure` / `setContainerConfig` | Generic name, one field | `setViewButton` mutate op (F2) |

---

#### 4. Placement

##### Target Layout (If F1–F10 Land)

```
Core/Views/
├── ContainerView.tsx     | keep; owns the container lookup (Report 7 F8)
├── views.ts              | the saved-view record; + ROLES (F3), + pickView (Report 1 F7)
├── viewsFile.ts          | host: container view-list ops
├── handlers.ts           | host: views:* only (F2 removes container:configure; F1 step 2 removes loadValues)
├── filterRules.ts        | filter schema + standalone filter; + editRules/editOperands (F3)
├── valueKinds.ts         | + Title/Location ops, operatorsFor (F7), reassignable, groupKeyToValue (F10)
├── paneTargets.ts        | PickerOption targets + filterTargets (F6, F7)
├── viewIcon.ts           | keep
├── ViewTileScope.ts      | keep, renamed (Report 1 F1)
├── Bands/ Cards/ Table/
├── Host/ (→ Seat/?)      | + liveView.ts (Report 1 F1), tieOrderWith (F5), reassignTarget (F10), RowValues, fetchPageValues (F1)
├── Pipeline/             | columns.ts + visibility (F8); group.ts + ResolvedGroup/isEmptyBand/UNGROUPED (F1)
└── Settings/
```

**Leaves the Root:** `containerConfig.ts` (deleted), `creationOrder.ts` (split: `Nexus/order.ts`, `Actions/createActions.ts`, Host), `deleteViewWithUndo.ts` (→ `ViewFrame`, Report 7 §Placement), `viewWrite.ts` (→ `Host/liveView.ts`, Report 1 F1), `filterModel.ts` (dissolved), `pageRow.ts` + `viewRow.ts` (→ Properties + producers, gated), `reassign.ts` (dissolved), `visibilityModel.ts` (→ `Pipeline/columns.ts`). `loadValues.ts` stays or → Properties.

**Outside Views:** `Properties/fieldValue.ts` (or a new host-safe Properties file) gains the item/field model (F1); `Nexus/order.ts` gains `placeAt`/`placementSlot` and `Actions/createActions.ts` gains `placeNew` (F5); `Nexus/mutate*` gains `setViewButton` (F2); `Nexus/configReach.ts` sheds its view-edit tables (F3).

**I-033 Compatibility:** After these, Views' host-only files are `viewsFile.ts` and `handlers.ts` (+ `loadValues.ts` if kept); `views.ts`/`filterRules.ts` are pure-shared.

---

#### 5. Becomes False

- **ViewTypesPM.md:26:** "operator families … defined in `Core/Views/filterModel.ts`" (F7).
- **ViewTypesPM.md:71:** every `Core/Views/Host/...` path, only if the folder is renamed.
- **Cross-Device Mutation Checklist.md:68:** `container:configure` → `containerConfig.ts` (F2).
- **IssuesPM I-026:** "six view and container channels" becomes five, and its container-sidecar double-door list loses `container:configure` (F2). **I-033:** its `filterModel`/`visibilityModel` → Settings and `placeNew` → Session lines are superseded by F5/F7/F8.
- **Drives/Scripts (only if `view:loadValues` is renamed):** `scripts/Metadata Drive/live-drive.mjs:79`, `scripts/Archive Drive/live-drive.mjs:356`, `scripts/nexus-watch.mjs:37`, `scripts/README.md:129` (scout cites, not reopened).
- **Comments:** `handlers.ts:13` (after F2); `columns.ts:1` header gains the visibility half (F8); `creationOrder.ts:1` header moves with `tieOrderWith`.
- **Tests:** `creationOrder.test.ts`, `reassign.test.ts`, `filterModel.test.ts`, `visibilityModel.test.ts`, `pageRow.test.ts`, `deleteViewWithUndo.test.ts` re-home; `Views/handlers.test.ts:33-35` and `Files/writePathRace.test.ts:17,56` lose `container:configure`; Properties/Matrix/Actions tests re-point `viewRow`/`columns` imports.

---

#### 6. Keep

- **`ContainerView.tsx`:** thin, but the same pane-wrapper pattern as `Contexts/SpaceView.tsx`, `Archive/ArchiveView.tsx`, `Interface/Homepage/HomepageView.tsx`.
- **`viewIcon.ts`:** can't join `views.ts` — `asRenderableIcon` comes from `UIX/Symbols/index.tsx` (React), which would put a `.tsx` in the host graph and fail `engineGraph.test.ts`.
- **`filterRules.ts` in Views:** Matrix, preview rules, and settings all borrow the view pipeline's evaluator and pane; a new top-level filter domain adds a folder without removing a dependency.
- **`setActiveView` as a `mutate` op routed into `viewsFile.ts`:** it needs `patchViews`' positional-id repair (`viewsFile.ts:43-65`).
- **`mapViews` knowing the tile shape (`views.ts:92-102`):** the one walker both stores need.
- **`valueKinds.ts` at 402 lines:** one record per kind is the right shape.

---

#### 7. Insights & Concerns

- **FilterFrame Speaks SavedView:** two standalone callers (`Matrix/MatrixMenu.tsx`, `Settings/PreviewRulesRow.tsx`) adapt through `filterViewOf`/`standalonePatch`; the frame could speak `StandaloneFilter` and the one view caller (`ViewLeaf.tsx:36`) adapt instead. Report 5's call.
- **Alignment Enum Twice:** `ColumnAlign` (`views.ts:42`) and MarkdownPM's `Align` (`MarkdownPM/Engine/Tables/model.ts:1`) are the same three values; `MarkdownPM/Tables/tableMenu.ts:3` already borrows the Views one. Flag only.
- **Remaining `views:*` Channels:** I-026 would fold them into `mutate` too. Bigger than this cleanup; the `{id}`/`RemovedView` replies and the write path's stage/unstage would need `MutateReply` fields.
- **Churn Warning on F1 Renames:** moving the model is cheap; renaming `ViewRow`/`ResolvedColumn` touches hundreds of references. Move first, rename separately if approved.

---

#### Delta Summary

| Finding | Delta | Status |
|---|---|---|
| F1 Item/field model → Properties | ≈ −10 | Corrected; placement gated |
| F2 `container:configure` → mutate | ≈ −17 to −19 | Verified |
| F3 View-edit tables → Views | ≈ +5 | Verified |
| F5 Split `creationOrder.ts` | ≈ −6 | Corrected |
| F6 `PaneTarget` → `PickerOption` | ≈ −15 | Verified |
| F7 Dissolve `filterModel.ts` | ≈ −12 | Verified |
| F8 Visibility into columns | ≈ −5 | Verified |
| F10 Dissolve `reassign.ts` | ≈ −5 | Verified |
| **Total** | **≈ −65 to −67** (F4, F9, F11 counted in Reports 7, 1, 1) | |

---

#### Removed

- **F4 • View Tiles Re-Implement the Container's View-List Operations:** Duplicate of Report 7 F2, which holds the verified divergences; this finding's function-by-function map (`writeConfig` ≈ `saveView`, `duplicate` ≈ `duplicateView`, `deleteView`/`restoreViewAt` ≈ `deleteView`/`restoreView`, `moveView` ≈ `reorderViews`) moved there. The scout's −40 to −70 is inferred and likely high.
- **F9 • The Window's View-Write Path Is Three Files:** Subsumed by Report 1 F1, which carries the stronger evidence (stage/unstage callers, test-only gate exports). Its two extra pieces go elsewhere: `ViewTileScope.tsx` → `.ts` (Report 1 F1), and `deleteViewWithUndo.ts` → `ViewFrame` (Report 7 §Placement), since it's a container-only dialer call beside `ViewFrame`'s other inline view-list calls, not a view-patch write.
- **F11 • `Host/useColumnStyles.ts` Is Misnamed and Misfiled:** Merged into Report 1 F9. Its "three hand-rolled readers take `useNexusForms`" bullet is dropped there: `PropertyPanel.tsx:142` reads one setting and the swap saves nothing.
- **F12, First Bullet (Test-Only Exports):** Duplicate of Report 1 F11.

#### Cross-Report Conflicts

- **`container:configure` (F2 vs Report 1 F10 vs Report 7 §Placement):** F2 holds — it removes a channel and matches the existing `setDisclosureLock`/`setActiveView` ops on the same sidecar; Report 1 F10 only relocates the writer, and Report 7's "keep" was conditional on no other scout folding it.
- **View-List Ops (F4 vs Report 1 F8 vs Report 7 F2/F6/§Keep):** Homed in Report 7 F2. Report 7 §Keep ("positional-id repair twice") and Report 7 F6 (tile algebra into its own module) agree with the corrected delta there: the two stores differ in id location, active representation, refusal shape, and undo carriage, so only the rules share cleanly.
- **Write Path (F9 vs Report 1 F1):** Report 1 F1 holds; see *Removed*.
- **Column Styles (F11 vs Report 1 F9 vs Report 2 F8):** Report 2 F8's whole-file move into `Properties/columnStyles.ts` fails the engine graph (the hook imports `Session/store`); Report 1 F9 as corrected holds.
- **Row Builders (F1 vs Report 1 F5):** Same goal, different destination (Properties vs `pageRow.ts`). F1 is the direction if Nathan wants the item model out of Views, gated on the engine-graph run; Report 1 F5's consolidation is its first step.
- **`reassignTarget` (F10 vs Report 1 F3):** Follows the sort-run reassign wherever it lands.
- **View Button Defaults (scout §7 vs Report 7 §Keep):** The scout asked whether the toolbar's `'icon'` default (`ViewMenu.tsx:26`) against the tile's `'labeled'` (`ViewTile.tsx:347`) is deliberate. Report 7 holds: both were set at inception (`0940df967`, `c03585724`) and `ConfigurationPM.md:233` documents Icon. The question is dropped from this report.
- **`paneTargets` Placement (F6 vs F8's own objection):** Moving it into `Views/Settings/` makes Navigation import a pane folder — the objection F8 raises against I-033. Flagged in F6.
