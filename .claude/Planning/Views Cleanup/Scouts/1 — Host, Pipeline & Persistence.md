### Scout 1 — Host, Pipeline & Persistence

**Grounded At:** `cae07c129` · read-only · reconciled against HEAD (`cae07c129`); every cite below was reopened unless marked *inferred*.

**Reconciliation:** 9 findings kept (5 Verified, 4 Corrected), 2 removed. F8 moved to Report 7 F2 as that finding's home; F10 is superseded by Report 6 F2.

---

#### 1. Map

##### Host (`Core/Views/Host/`, Renderer-Side)

| File | Owns | Called By |
|---|---|---|
| `ViewHost.tsx` (32) | `VIEW_RENDERERS` kind→component map, Table fallback, view scale, publishes the count | `ContainerView.tsx`, `Tiles/Surfaces/ViewTile.tsx:642`, `Testing/viewHarness.tsx` |
| `useViewHost.ts` (256) | The `host` object (42 returned fields, `:213-254`): values + overrides, schema, live view, plan, sort count, drag gates, pipeline call, search, style map, band model, row walk (`rowById`/`rowBand`/`paintOrder`), value writers, view edits, `seatHost` | `ViewHost` only (type `ViewHostApi` read by both renderers, `useColumns`, interactions, creation) |
| `useViewInteractions.tsx` (429) | Band routing, row drop routing (reorder / relocate / reassign), folder-slot gating, line zone, carry, open, page menu, ghost | `TableView`, `CardsView` |
| `useViewCreation.ts` (218) | The create act: seeds, order write, glide, rename handoff | `useViewInteractions` only (plus `useViewHost.test.tsx:127,891`) |
| `pendingView.ts` (233) | Two things: the pending view record (`useLiveView`, `readLiveView`, `stageView`, `unstageView`) **and** tree orders painted ahead of a drag's write (`usePainted`, `mutateAhead`, `refusedDrop`), bridged by `dropIO` | `viewWrite.ts`, `useActiveView`, `useBandHeads`, interactions, `GroupFrame`, `ViewFrame`, `ViewLeaf` |
| `useActiveView.ts` (11) | `useLiveView(source.id, tile ? tile.view : pickView(source))` | `ViewHost`, `useViewHost`, `SettingsFrame`, `PropertyFrame` |
| `useBandHeads.ts` (33) | Paints the container, indexes its Sets, builds band head context | `useViewHost`, `GroupFrame` |
| `useContainerValues.ts` (88) | Container value load + optimistic overrides; `useValuesEpoch` | `useViewHost`, `GroupFrame`, `PropertyPanel` |
| `useColumnStyles.ts` (65) | `styleFor`, `pickedStyle`, `columnStylePatch`, `useNexusForms` — only the last is a hook | `useViewHost`, `useBandHeads`, `GroupFrame`, `FilterFrame`, `PropertyFrame`, `BundleTable` |

##### Pipeline (`Core/Views/Pipeline/`, Renderer-Side — the Engine Graph Reaches None of It)

| File | Owns | Called By |
|---|---|---|
| `resolveView.ts` (56) | Composes columns → filter → group(+sort inside) → hide → prune → band order | `useViewHost` only |
| `columns.ts` (73) | `resolveColumn`, `resolveColumns`, `itemColumns` | Views, Properties, Matrix, Actions |
| `filter.ts` (107) | Filter compile | `resolveView`, `creationSeeds`, `Matrix/matrixInput`, `Navigation/previewRules` |
| `group.ts` (456) | Six jobs: row flattening (`toRow`, `flattenContainer`, `frontmatterOf`), bucket labels (`formatBucketLabel`), bucket keys/order, grouping strategies, pruning, the plan + order modes (`groupPlan`, `pageOrderOf`, `setOrderOf`, `viewSetOrder`, `orderedChildren`) | ~12 files |
| `sort.ts` (85) | Sorter, `resolvedSortCount` | `resolveView`, `useViewHost` |
| `creationSeeds.ts` (82) | Filter-implied seeds | `useViewCreation` |
| `bandOrder.ts` (22) | `orderGroups` | `resolveView.ts:55` only |
| `search.ts` (14) | `searchGroups` | `useViewHost` only |
| `pickView.ts` (12) | Container's shown view or the default placeholder | `useActiveView`, `ViewFrame`, `ViewMenu` |
| `setIndex.ts` (35) | Cached Set lookup maps | `useBandHeads` (Host), `bandModel`, `bandRouter`, and `group.ts` only for `orderedChildren`'s type |

##### Views Root Model & Persistence

| File | Side | Owns | Called By |
|---|---|---|---|
| `views.ts` (402) | engine | SavedView codec, enums, `VIEW_KINDS`, defaults/`viewOption`, patch folding, band keys + hidden buckets, view ids + mint, `mapViews`/`mapTiles`, `removedView`, view-state keys + `ViewWriteOpts` | ~60 files |
| `viewsFile.ts` (179) | engine | Sidecar view CRUD with positional-id repair | `handlers.ts`, `Nexus/mutate.ts:186`, `Tiles/tilesFile.ts:85` |
| `viewWrite.ts` (59) | renderer | Stage → `views:save` or tile persist → unstage on refusal; tile lock gate | 9 files (`PropertyFrame`, `useViewHost`, `GroupFrame`, `LayoutFrame` ×2, `SettingsFrame`, `SortFrame`, `ViewFrame`, `ViewLeaf`, `VisibilityFrame`) |
| `viewRow.ts` (65) | engine | `ViewRow`, `PageValues`, `ResolvedColumn`, `ResolvedGroup`, `UNGROUPED` | ~40 files |
| `pageRow.ts` (61) | renderer | `pageRowOf`, `spaceRowOf`, `fetchPageValues`, `fetchPageRow` | `useContainerValues`, `PropertyPanel`, `PageReaderWindow`, `entityMenuActions`, `matrixInput` |
| `containerConfig.ts` (15) | engine | `setContainerConfig` (`view_button`) | `handlers.ts`, bridge type |

Engine-side Views files, recomputed with `Core/Testing/engineGraph.ts` from `Core/Contract/serve.ts` at this commit: `containerConfig.ts`, `filterRules.ts`, `handlers.ts`, `loadValues.ts`, `viewRow.ts`, `views.ts`, `viewsFile.ts`. Everything else here is renderer-only. `Properties/columnStyles.ts` and `Nexus/order.ts` are also engine-side; `Properties/fieldValue.ts` isn't.

##### What a New Renderer Must Know Today

1. Add itself to `VIEW_RENDERERS` (`ViewHost.tsx:11-14`).
2. Take `host: ViewHostApi` — 42 fields (`useViewHost.ts:213-254`), of which Table reads 12 directly (10 destructured at `TableView.tsx:37-48` plus `viewRootRef` and `seatHost`) and 5 more through `useColumns`, and Cards reads 18 (13 destructured at `CardsView.tsx:111-125` plus `sets`, `plan`, `dragDisabled`, `viewRootRef`, `seatHost`); the rest feed interactions and creation.
3. Call `useViewInteractions(host, { ghost: { graceMs, suppressed, travelHold? }, rename, newPages })` (`useViewInteractions.tsx:38-47`) and wire its returns.
4. Assign `host.viewRootRef.current` on its root (`TableView.tsx:282`, `CardsView.tsx:354`).
5. Pick one of two drag shapes: `listZone(indent)` (Table) or `bandZone()` + per-band `onDrop`/`folderSlot` (Cards).
6. Spread `host.seatHost` into `useValueSeat` with `hold: interactions.ghost.suppressWrap`.
7. Own a rename surface — Table keeps local state plus a stranded-edit effect (`TableView.tsx:73-77`), Cards uses the session's `beginRename` (`CardsView.tsx:161`).
8. Render the ghost from `ghost.ghost`, `ghostStanding`, `ghostCreate`, `closed`, `onGhostEnter/Leave`, and `rowHover(row, ghost.onHover)` on each row.

Items 5–8 are Report 3's; this report covers 1–4 and the host's own surface.

---

#### 2. Findings

##### F1 • The View Write Is Split Across Three Files, and `pendingView.ts` Holds an Unrelated Second Job

**Status:** Verified. **Overlaps:** 6 (F9, removed into this), 7 (F3), 8 (F2, F4).

**What's There:**
- `viewWrite.ts:34-52` (`writeView`) is the only caller of `stageView`/`unstageView` besides `dropIO.persistAfter` (`pendingView.ts:222-230`). It lives at the Views root yet imports `Host/pendingView`.
- `saveViewIn` (`viewWrite.ts:22-32`) only wraps `writeView` with `reportRefusal`, and `resolveViewWrite` (`:12-19`) is a five-line gate used once. `saveViewIn`, `resolveViewWrite`, and `VIEW_CONFIG_LOCKED` are imported only by `viewWrite.test.tsx:12`.
- The gate's inputs — `VIEW_STATE_KEYS`, `pickViewState`, `ViewWriteOpts` (`views.ts:113-119`) — sit in the engine model, but only renderer files read them (`viewWrite`, `pendingView`, `useViewHost`, plus `views.test.ts`).
- `useActiveView.ts` is 11 lines wrapping `useLiveView` from the same record.
- `pendingView.ts:134-197` is tree-order paint-ahead (`withChildOrder`, `orderInTree`, `usePainted`, `mutateAhead`, `refusedDrop`), which has nothing to do with a pending *view*. Its only `usePainted` consumer is `useBandHeads.ts:16`; `mutateAhead`/`refusedDrop` are read by `useViewInteractions.tsx:36`; `dropIO` (`:201-233`) bridges both halves.
- `ViewTileScope.tsx` (19 lines) carries no JSX in a `.tsx` (Report 6 F9's observation).

**Problem:** One act — stage a view patch, send it, take it back on refusal — has three files and a root → `Host/` → root import loop. The file named for the view record also owns tree drag optimism, so neither name tells a reader where to look (*Less to Understand*, *Clearer Boundaries*).

**Proposed:**
- One renderer-side file for the live view (placement for Nathan: `Host/liveView.ts`, the renamed `pendingView.ts`). It holds the pending record, `useActiveView`, `useSaveView` with the lock gate inlined (collapsing `saveViewIn`/`writeView` into one unexported function), `dropIO`, and `ViewWriteOpts` plus the view-state keys moved out of `views.ts`. `stageView`/`unstageView` go private.
- Tree-order paint-ahead leaves: the pure `orderInTree`/`withChildOrder` land in `Nexus/treePatch.ts`, whose header (`:1`) already says "the window applies the same ones to paint a drag ahead of its write" (`treePatch` already imports `resolveOrder`, so no new dependency). The stateful half (`ahead` channel, `usePainted`, `mutateAhead`, `refusedDrop`) becomes its own small Host module named for the job (placement for Nathan: `Host/paintAhead.ts`). The scout put it inside `useBandHeads.ts`, but `mutateAhead`/`refusedDrop` are plain functions imported directly by `useViewInteractions.tsx:36`, and a `use*` file holding non-hook exports is the shape F9 objects to in `useColumnStyles.ts`. `useBandHeads` imports `usePainted`; `dropIO` imports `mutateAhead`.
- `ViewTileScope.tsx` → `.ts`. `deleteViewWithUndo.ts` doesn't join this file; it folds into `ViewFrame` (Report 7 §Placement).

**Delta:** About −25 to −35 (gate inline −4, `saveViewIn`/`writeView` collapse −8, dropped file headers and imports −12, `useActiveView` file −5, offset by one moved import set). *Inferred* line count; structure verified.

**Touches Outside the Domain:** The import lines of all 9 `useSaveView` callers, plus `GroupFrame`, `ViewFrame`, `ViewLeaf`, `SettingsFrame`, `PropertyFrame`. I-070's footnote cites `pendingView.ts:201-233` and `:117-133`. `VisibilityFrame.test.tsx:14` mocks `'../viewWrite'` by path (Report 8 F4).

##### F2 • `useViewCreation` Re-Flattens the Container for IDs the Host Already Holds, and Declares Its Input as a 23-Line `Pick`

**Status:** Verified. **Overlaps:** 8 (F3).

**What's There:**
- `useViewCreation.ts:127` runs `flattenContainer(c.source, c.effectiveValues, {}).rows.map(r => r.id)`.
- `c.source` is the host's `source: painted` (`useViewHost.ts:213`), and the host's `rows` come from `flattenContainer(painted, effectiveValues, pageMetadata)` (`useViewHost.ts:84`). `flattenContainer` (`group.ts:129-141`) emits one row per page regardless of values; `pageMetadata` only sets `icon`, so the id lists are identical. `useViewInteractions.tsx:187` already uses `rows.map(r => r.id)` for the same `tieOrderWith` call.
- `ViewCreationConfig = Pick<ViewHostApi, 17 keys> & {...}` (`useViewCreation.ts:30-52`). Both callers pass `{...host, ...}` (`useViewInteractions.tsx:126-130`, `useViewHost.test.tsx:127,891`).

**Problem:** A container walk repeats on every create. `effectiveValues` is on the host's return only for this call, and the `Pick` is a second listing of the host's fields that drifts whenever the host changes (*One Way*, *Less to Carry*).

**Proposed:** `orderPatch` reads `c.rows`. Drop the `flattenContainer` import here and `effectiveValues` from the host's return. Type the config as `ViewHostApi & { bandBucket; rename }`.

**Delta:** About −20.

##### F3 • The Host API Carries Session Passthroughs, Duplicates, and Interaction-Only Behavior

**Status:** Corrected (the return is 42 fields, not 44; `identity` is only partly duplicated by `ctx`). **Overlaps:** 3 (F2 moves `seatHost` the same direction), 6 (F10), 8 (F4).

**What's There** (consumer matrix rebuilt from the destructures at `TableView.tsx:37-48`, `CardsView.tsx:111-125`, `useColumns.ts:107,123`, `useViewInteractions.tsx:74-103`, and `useViewCreation`'s `c.*` reads):
- **Session Passthroughs:** `tree`, `mutate`, and `openTarget` (`useViewHost.ts:43-45,249-251`), read by Cards (`tree`), Table (`mutate`), and interactions (`openTarget`). Renderers already read the session directly for everything else — `TableView.tsx:49` reads `selection`, and `CardsView.tsx:126-129` reads `tree?.nexus.id`, `defaultIcons`, `beginRename`, and `renamingPath` (Cards reads `tree` from both the host and the session).
- **Duplicates:** `schema` is also `ctx.schema` (`valueContext.ts:43`). `identity` shares its `contexts`/`spaces` maps with `ctx` (`identityOf` is cached, `contextIdentity.ts:33-60`), but `ctx` doesn't carry `contextIds`, which interactions and creation read — so `identity` stays.
- **Interaction-Only Behavior:** `reassignBySortRun` and `commitGroupValue` (`useViewHost.ts:179-198`, with the `sortReassign` memo at `:113-121`) are read only by `useViewInteractions` (`:221`, `:256`). `groupPropType` is read only by creation (`useViewCreation.ts:195`).
- **Second Hide Path:** `hideProperty` (`useViewHost.ts:165-168`) is used by Cards only, while Table hides through its own `persistView(hideShown(view, collapsing))` (`useColumns.ts:213`).

**Problem:** A new renderer receives 42 fields and must learn which are its business. The doc says the host owns "everything a renderer needs before it can draw" (ViewTypesPM *§The View Host*), but the sort-run reassignment is pointer behavior, not drawing state (*Clearer Boundaries*, *Less to Understand*).

**Proposed:**
- Drop `tree`, `mutate`, `openTarget`, `schema`, and (after F2) `effectiveValues` from the return. Consumers read `useSession` / `ctx.schema`.
- Move the sort-run reassign (`sortReassign` memo, `reassignBySortRun`, `commitGroupValue`) into `useViewInteractions`, its only consumer; `reassignTarget` follows it there (Report 6 F10 names `useViewHost` as its destination, which this supersedes).
- Table's `commitHide` calls `host.hideProperty` (its includes-guard is harmless for Table).
- Keep the drag gates (`dragDisabled`, `crossBand`, `canReassign`, `canRelocate`) on the host: renderers read the first two to draw.

**Delta:** About −8 to −12; the return shrinks by about 8 fields. *Inferred*.

**Touches Outside the Domain:** `TableView.tsx` (`mutate`), `CardsView.tsx` (`tree`), `useColumns.ts` (hide), and `useViewHost.test.tsx`'s field accessors (Report 8 F4 counts ~100).

##### F4 • `ViewHost` Reads the Active View Twice and Hands `nests` Into a Hook That Could Derive It

**Status:** Verified. **Overlaps:** 7 (F5, removed into this), 5 (F1), 8 (F12).

**What's There:** `ViewHost.tsx:18` calls `useActiveView(source)`, then `:23` calls `useViewHost(source, VIEW_KINDS[view.type].nests)`, which calls `useActiveView(source)` again (`useViewHost.ts:56`). Each call registers a user on the same pending entry (`pendingView.ts:88-95`).

**Problem:** Two reads of one value, and a parameter that exists only because the caller read it first.

**Proposed:** `useViewHost(source)` derives `nests` from its own view. `ViewHost` reads `host.view.type` and `host.view.view_scale` after the null check (it renders `<div />` when `host` is null anyway).

**Delta:** About −4.

**Touches Outside the Domain:** `useViewHost.test.tsx:125,721,889` pass `nests`.

**Note:** The registry fallback seats Table for an unbuilt kind (`ViewHost.tsx:19`) but groups with that kind's own `nests`. Harmless today because every unbuilt kind has `nests: true` (`views.ts:27-30`); Gallery declaring `nests: false` while falling back to Table would flatten a Table. Report 5 F1's "presented kind" table is the fix that resolves it at the kind level; when it lands, `useViewHost` derives `nests` through it.

##### F5 • `group.ts` Holds Six Jobs; Three of Them Aren't Grouping

**Status:** Corrected (`setIndex.ts` has an importer outside `Bands/`). **Overlaps:** 6 (F1), 4 (§Placement: `useBandHeads` → `Bands/`).

**What's There:**
- **Row Building:** `toRow`/`flattenContainer`/`frontmatterOf` (`group.ts:103-141`) are consumed by `useViewHost`, `useViewCreation`, `useContainerValues`, `GroupFrame`, `matrixInput`, and `previewRules`. The other `ViewRow` builders (`pageRowOf`, `spaceRowOf`) live in `pageRow.ts`.
- **Presentation:** `formatBucketLabel` (`group.ts:143-172`) is read only by `Bands/bandModel.ts`.
- **Not a Pipeline Function:** `orderedChildren` (`group.ts:428-434`) is used only by `CardsView.tsx:134` and `GroupFrame.tsx`. It's the sole reason `setIndex.ts` sits in `Pipeline/` (`2ad73c8f6`: "the Set index moves to Pipeline beside the group reader that imports it"); the pipeline itself uses `SetTreeNode`, never `SetIndex`.

**Problem:** A reader looking for "how rows are built" or "how a date band is labeled" lands in the grouping stage. `Pipeline/` claims pure stages yet holds the band layer's lookup (*Less to Understand*).

**Proposed:**
- One home for every `ViewRow` builder. Minimal form: `toRow`/`flattenContainer`/`frontmatterOf` move into `pageRow.ts`. Report 6 F1 proposes the larger relocation of the item/field model into `Properties/fieldValue.ts`; if Nathan takes that direction, this consolidation is a step inside it, and both are gated on the same engine-graph check (see Report 6 F1).
- `formatBucketLabel` moves beside `dateLabeller` in `Bands/bandModel.ts`.
- `orderedChildren` moves into `setIndex.ts`, and `setIndex.ts` moves to `Bands/`. This places it beside every importer only if `useBandHeads.ts` (Host, imports `setIndexOf` at `:6`) also moves to `Bands/`, as Report 4 §Placement proposes; otherwise Host imports it from `Bands/`, which is still a correct direction.
- `group.ts` drops to roughly 380 lines of grouping alone.

**Delta:** About 0 (moves), −3 imports.

**Touches Outside the Domain:** `Matrix/matrixInput.ts`, `Navigation/previewRules.ts`, `Settings/GroupFrame.tsx`, `Bands/*`.

##### F6 • The Property and Sub-Group Bucket Builders Are Near-Twins

**Status:** Verified. **Overlaps:** 4 (F10, same finding).

**What's There:** `property()` (`group.ts:217-242`) and `structuralSubGrouped()`'s inner block (`:307-321`) both run `groupRows(…, bucketKey)`, split off `null`, order the buckets, build `{key: bandKey(...), kind: 'bucket', value, items: applySort(...)}`, and `placeTail` the value-less run. They differ in three ways: the top level keeps empty *live* options through `liveBucketOrder` while the sub level shows only present buckets through `bucketOrder`; sub-group keys carry a Set scope (`bandKey(…, node.id)`); and the sub level's tail takes its own scoped key (`:318-319`).

**Proposed:** One `bucketBands(rows, grouping, sorter, placement, keyOf, keepLive)` (Report 4 F10's signature, which also carries the tail key through `keyOf`).

**Delta:** About −8 to −12. *Inferred*; `group.test.ts` pins each arm.

**For Nathan:** The empty-option divergence (top level shows an empty Select option's band, sub level never does) is undocumented; Report 4 F10's framing — surface it rather than unify it — is the one to carry.

##### F7 • Small Pipeline Files That Aren't Stages, or Whose Logic Is Split With the Host

**Status:** Corrected (search keys must keep their own memo; the `bandOrder` bullet defers to Report 4 F6). **Overlaps:** 4 (F6).

**What's There:**
- `pickView.ts` (12 lines) picks a container's shown view. That's model, not a pipeline stage, and it reads only `views.ts` exports and tree types.
- `bandOrder.ts` (22) has one caller, `resolveView.ts:55`.
- Search is split in two: key-building in the host (`useViewHost.ts:96-107`) and matching in `search.ts` (14).

**Proposed:**
- `pickView` joins `views.ts` beside the default view it returns (type-only tree import, engine-safe).
- `bandOrder.ts`: Report 4 F6 dissolves it by ordering the Set tree before `resolveGroups`, which removes the slot-holding logic rather than moving it. Defer to that; folding `orderGroups` into `resolveView.ts` is the fallback only if Report 4 F6's equivalence fails its tests.
- `search.ts` owns the key builder as its own export (`searchKeysOf(rows, sourcePath)`), while the host keeps two memos: keys on `[rows, searching, source.path]`, filtering on `[groups, needle, keys]`. Folding key-building into `searchGroups` would re-casefold every row per keystroke (*never "on every X"*).

**Delta:** About −4 (`pickView` file), plus Report 4 F6's −12.

**Touches Outside the Domain:** `ViewFrame.tsx` and `ViewMenu.tsx` imports.

##### F9 • `useColumnStyles.ts` Isn't a Hook File or a Host Concern

**Status:** Corrected (merged with Report 6 F11; only the pure half can join `Properties/columnStyles.ts`; the hand-rolled readers and the BundleTable override earn little). **Overlaps:** 6 (F11, removed into this), 2 (F8).

**What's There:**
- Only `useNexusForms` (`useColumnStyles.ts:61-65`) is a hook. `styleFor`, `pickedStyle`, and `columnStylePatch` are pure. `pickedStyle` is exported only for `useColumnStyles.test.ts:2`.
- Users are `useViewHost`, `useBandHeads`, `GroupFrame`, `FilterFrame`, `Properties/Schema/PropertyFrame.tsx`, and `Bundles/BundleTable.tsx`, so the file isn't host-specific.
- `Properties/columnStyles.ts` is in the engine graph; `useNexusForms` imports `useSetting` from `Session/store`.
- `BundleTable.tsx:69-97` rebuilds `dateDefaults` + `resolveStyle` + `storedPick` itself; it has no `ResolvedColumn` or `SavedView`, reads its stored style from personalization, and defaults `time_format` to the clock.
- `PropertyPanel.tsx:142` reads `dateFormat` alone; `DateTimeValuePicker.tsx:24-27` and `PageReaderWindow.tsx:132-133` read both settings.

**Proposed:**
- Move the pure resolvers out of `Host/`: into `Properties/columnStyles.ts` beside `resolveStyle`/`storedPick`/`defaultStyleFor` (type-only imports of `ResolvedColumn`/`SavedView`, engine-safe), or a renderer-side `Views/columnStyle.ts` — placement for Nathan. `useNexusForms` can't join an engine file; it goes beside its consumers window-side (renamed per §Names).
- Make `pickedStyle` private.
- Leave `BundleTable`'s composition and the three single-setting readers alone: bending `styleFor` to a column-less, view-less caller adds a parameter to save about three lines, and swapping a `useSetting` call for `useNexusForms().dateFormat` saves nothing.

**Delta:** About −2 (the file header and the `pickedStyle` export).

**Touches Outside the Domain:** `BundleTable.tsx`, `PropertyFrame.tsx` (import paths).

##### F11 • Test-Only Exports in the Model

**Status:** Verified. **Overlaps:** 6 (F12, removed into this), 8 (F5).

**What's There:** `decodeGroupConfig`/`decodeSubGroup`/`DEFAULT_VIEW_TYPE` (`views.ts:16,137,144`) are used only in-file plus `views.test.ts:8-10`. `saveViewIn`/`resolveViewWrite`/`VIEW_CONFIG_LOCKED` are covered under F1, and `pickedStyle` under F9.

**Proposed:** Un-export them and test through `savedView.parse` / `useSaveView`.

**Delta:** About 0 production lines.

---

#### 3. Names

| Current | Problem | Proposed |
|---|---|---|
| `host.pageOrder`, `pageOrderOf`, `setOrderOf` (`'custom' \| 'location'`) | Collides with tree nodes' `pageOrder: string[]` / `setOrder` (`pendingView.ts:145-146`); `useViewInteractions` reads both meanings in one function | `rowOrderSource` / `rowOrderSourceOf` / `setOrderSourceOf` |
| `StructuralOrderMode` | Also types the Location *sort* order and the page order, not only structural grouping | `OrderSource` |
| `GroupPlan` kinds `'none' \| 'sets'` | The persisted `GroupConfig` kinds are `'flat' \| 'structural'` for the same states (`views.ts:70-73` vs `group.ts:363-367`) | Use `'flat' \| 'structural' \| 'property'` throughout (site count *inferred*) |
| `sortKeys` (host) | Holds a count | `sortCount` |
| `NexusForms` / local `nexus` | Reads as "the Nexus"; it's the date form + clock | `DateForms` / `forms` |
| `const host = useContentHost()` (`useViewHost.ts:48`) | Shadows the concept the file defines (Report 7 §Names raised the same) | `contentHost` |
| `persistView` / `saveView` / `persist` / `writeView` / `saveViewIn` | Five names for "write a view patch" | One verb: host `saveView(patch, opts)`, tile scope `save`; collapse per F1 |
| `pendingView.ts` | Also owns tree drag paint-ahead | Split per F1: `liveView.ts` + `paintAhead.ts` |
| `useBandHeads` | Also paints the container and indexes Sets | `usePaintedContainer` (Report 4 proposes `useBandSource`; one name for Nathan) |
| `EmptyPlacement` / `EMPTY_PLACEMENTS` | Types `ungrouped_placement`; the doc stresses ungrouped ≠ empty | `UngroupedPlacement` |
| `VIEW_KINDS` / `ViewKind` vs `VIEW_TYPES` / `ViewType` | Two words for one concept (the persisted field is `type`) | Settle on one; `ViewTypeSpec` for the record entry |
| `viewRow.ts` vs `pageRow.ts` | Names don't say "types" vs "builders"; `ViewRow` also models Spaces and Property-panel rows | Resolved by F5 / Report 6 F1's placement |
| `GroupOrderMode` `'configured' \| 'manual'` vs UI "Default" / "Custom", and structural `'custom'` | Persisted, can't change | Leave; note in the feature doc |

---

#### 4. Placement

| What | Now | Proposed (for Nathan's Approval) |
|---|---|---|
| View write path | `viewWrite.ts` (root) + `Host/pendingView.ts` + `Host/useActiveView.ts` | One `Host/liveView.ts` (F1) |
| Tree drag paint-ahead | `Host/pendingView.ts:134-197` | Pure half into `Nexus/treePatch.ts`; stateful half into its own Host module (F1) |
| `ViewWriteOpts`, view-state keys | `views.ts` (engine) | With the write path (F1) |
| Row builders | `Pipeline/group.ts:103-141` | `pageRow.ts`, or with Report 6 F1's item model (F5) |
| `formatBucketLabel` | `Pipeline/group.ts` | `Bands/bandModel.ts` (F5) |
| `setIndex.ts` + `orderedChildren` | `Pipeline/` | `Bands/` (F5) |
| `pickView` | `Pipeline/pickView.ts` | `views.ts` (F7) |
| Search key builder | `useViewHost.ts:96-107` | `Pipeline/search.ts`, memo stays in the host (F7) |
| Column style resolvers | `Host/useColumnStyles.ts` | `Properties/columnStyles.ts` or `Views/columnStyle.ts`; the hook stays window-side (F9) |
| `ContainerView.tsx` | Own file, two call sites in `ContentView.tsx:71,81` | Keep the file; Report 7 F8 moves the container lookup into it |

---

#### 5. Becomes False

- **ViewTypesPM *§The View Host*:** It names `Core/Views/Host/pendingView.ts` and "the pending record" (F1). Its policy description ("ghost timing and what suppresses the ghost, and the naming surface") already omits `newPages` (`useViewInteractions.tsx:46`).
- **ViewTypesPM *§The Pipeline*:** "four pure stages — columns → filter → group → sort" is already imprecise: sort runs inside grouping, then hide, prune, and band order follow (`resolveView.ts:33-55`), and search is a step the host applies. F5 and F7 change the file set it implies.
- **IssuesPM I-070 Footnote:** cites `pendingView.ts:201-233`, `:117-133`, and `useViewCreation.ts:~116-130` (F1, F2).
- **IssuesPM I-040 Footnote:** cites `useViewCreation.ts:141-162` and `useViewInteractions.tsx:~45,~129` (line shifts).
- **Stale Comments:** `sort.ts:38` ("TableView's drag/manual-order gates read this" — the host reads it); `resolveView.ts:1` (the stage list, plus "a future context-dashboard embed" prospect text); `group.ts:265` ("Cards never indent" — any non-nesting kind); `treePatch.ts:1` stays true.
- **Tests Importing Moved or Renamed Symbols:** `Host/pendingView.test.ts:7`; `Host/useActiveView.test.tsx:8`; `Pipeline/pickView.test.ts:4`; `viewWrite.test.tsx:12,15`; `Host/useColumnStyles.test.ts:2`; `views.test.ts:8-10`; `Host/useViewHost.test.tsx:125,127,721,889,891`; `Settings/VisibilityFrame.test.tsx:14`; every suite reading `host.tree`/`host.mutate`/`host.openTarget`/`host.schema` (*inferred*).
- **Drives:** No `.claude/scripts/*Drive` hits on these symbols (Report 8 F11 agrees: drives key on DOM only).

---

#### 6. Keep

- **`VIEW_RENDERERS` Apart From `VIEW_KINDS`:** `views.ts` is in the engine graph (recomputed above), so it can't import React components.
- **`viewsFile.ts` (Engine) Apart From the Renderer Write Path:** The IPC boundary is the seam. F1 merges only the renderer-side halves.
- **`SetTreeNode` Tree vs `SetIndex` Maps:** The pipeline takes a plain tree so the Matrix and `previewRules` can filter without a container; `SetIndex` is the band layer's O(1) lookup.
- **`useViewCreation`'s Getter + `useLatest`:** `createPageIn`'s `rename` fires after the flight lands (`useViewCreation.ts:155-159`) and must read the latest host. Only the `Pick` is ceremony (F2).
- **The Pending Record's `seen`-History Settle/Unstage:** Deliberate (`5ba1eefb0`); I-070's fix lives inside it.
- **`styleById` and `styleOf` Both:** Cards threads the map as props, and `styleOf` falls back for unshown columns (page-menu values, `useViewInteractions.tsx:381`).
- **Two Drag Shapes in Interactions (`listZone` vs `bandZone` + `onDrop`/`folderSlot`):** A List takes the line list, a Gallery the band zones (Report 3 F5 bundles the second into `gridZone`).
- **`resolveView` Taking a Precomputed `plan`:** The host needs `plan` for its drag gates anyway (`useViewHost.ts:62,73`).
- **`mapViews` / `mapTiles` in `views.ts`:** Used by four engine sites (`configReach`, `remint`, `unassignProperty`, `tiles`).
- **`useValuesEpoch` in `useContainerValues.ts`:** Shared with `PropertyPanel`.
- **`viewsFile.ts`'s Module-Level `repaired` Map:** It carries in-flight writes across positional-id repair.

---

#### 7. Insights & Concerns

- **Rename Divergence (I-040):** Table holds rename in local state plus a stranded-edit effect (`TableView.tsx:73-77`); Cards uses the session's path-keyed `beginRename` (`CardsView.tsx:161`). Both open on the create's reply (`useViewCreation.ts:155-158`). Report 3 F1 holds the unification.
- **The Column Layer Lives in `Table/`:** `useColumns.ts` (362) holds widths, reorder, hide, and the header menu. If List takes columns, it would borrow from `Table/` (Report 2's domain).
- **GroupFrame Re-Derives Host State:** It builds `ResolvedGroup` skeletons by hand for `bandModelOf` (`GroupFrame.tsx:369-389`, Report 4 F11) and fetches the container's values a second time through `useContainerValues` while a host is usually mounted (`:495-505`). Flagged only.
- **Redundant Minted Icon:** `mintNewView` writes the kind's icon explicitly (`views.ts:392`), though `viewGlyph` already draws the kind glyph for a view with no icon (`viewIcon.ts:6-7`); `iconForTypeSwitch` (`viewIcon.ts:9-12`) then treats the kind icon as "default" to compensate. On-disk views keep their explicit icons, so the compensation stays either way.
- **`views.ts` Is a Grab Bag:** 402 lines of codec, defaults, patch folding, band keys, ids and minting, and doc walkers. Not splitting it; band-key helpers (`:306-339`) would read better beside `GroupConfig`.
- **Sync:** Nothing proposed changes on-disk keys, the `views[]` shape, id minting, or merge depths (`mergeViewEdit`, `views.ts:291-304`).

---

#### Delta Summary

| Finding | Est. Net |
|---|---|
| F1 Write Path | −25 to −35 |
| F2 Creation | −20 |
| F3 Host API | −8 to −12 |
| F4 ViewHost | −4 |
| F5 Placement | −3 |
| F6 Bucket Builders | −8 to −12 |
| F7 Small Files | −4 (plus Report 4 F6) |
| F9 Column Styles | −2 |
| **Domain Total** | **About −74 to −92**, with about 4 files fewer; F8's CRUD delta is counted in Report 7 F2 and F10's in Report 6 F2 |

---

#### Removed

- **F8 • View CRUD Is Written Twice:** Duplicate of Report 7 F2, which carries the verified behavioral divergences; this finding's line map and its sync constraint (`mergeKeys` depths and positional-id repair stay byte-identical) moved there. The scout's −40 to −60 is inferred and likely high (see Report 7 F2).
- **F10 • `containerConfig.ts` Folds Into `viewsFile.ts`:** Superseded by Report 6 F2, which removes the channel itself by making `view_button` a `mutate` op beside its sibling `setDisclosureLock` (`Nexus/mutate.ts:173-180`); folding the writer into `viewsFile.ts` keeps the second door.

#### Cross-Report Conflicts

- **Write Path (F1 vs Report 6 F9 vs Report 7 F3 vs Report 8 F2):** F1 and Report 8 F2 agree on collapsing `saveViewIn`/`writeView`/`resolveViewWrite`. Report 6 F9's alternative (root `viewWrite.ts` absorbing `ViewTileScope` and `deleteViewWithUndo`) is removed: the tile scope is an embed seam with six consumers, not a write step, and `deleteViewWithUndo` is a container-only dialer call that sits with `ViewFrame`'s other inline view-list calls (Report 7 §Placement). Report 7 F3 wanted `saveViewIn` to gain a production caller; its bug fix doesn't need it (see Report 7 F3), so F1 stands.
- **`container:configure` (F10 vs Report 6 F2 vs Report 7 §Placement):** Report 6 F2 holds against the code — `setDisclosureLock` and `setActiveView` already write the same sidecar through `mutate`.
- **Column Styles (F9 vs Report 2 F8 vs Report 6 F11):** Report 2 F8 moves the whole file into `Properties/columnStyles.ts`; that file is engine-side and `useNexusForms` imports `Session/store`, so the move fails `engineGraph.test.ts`. Only the pure resolvers can go; F9 as corrected holds.
- **Band Order (F7 vs Report 4 F6):** Report 4 F6 removes logic; F7's fold only moves it. Report 4 F6 wins if its tests pass.
- **Bucket Builders (F6 vs Report 4 F10):** Same finding; Report 4's signature and its "surface the divergence" framing are the stronger version.
- **`reassignTarget` (F3 vs Report 6 F10):** If F3 moves the sort-run reassign into interactions, `reassignTarget` goes there, not into `useViewHost`.
- **Row Builders (F5 vs Report 6 F1):** Both want one home for `ViewRow` builders; they differ on Views vs Properties. Report 6 F1 is the direction if Nathan wants the item model out of Views; F5's consolidation is its first step either way.
