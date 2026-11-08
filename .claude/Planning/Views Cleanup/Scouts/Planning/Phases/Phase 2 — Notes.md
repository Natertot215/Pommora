#### Phase 2 — Notes

**Commit:** `6d3d61ed5` on `vc-p2`, parent `cae07c129` · Task 2-1 `853490ee3` · Task 2-2 `94dd45c90` · Task 2-3 `6d3d61ed5`

**Patch:** `Phase 2a — The Root's Dissolutions.patch` · `Phase 2b — The Page Record's Home.patch` · `Phase 2c — The Live View.patch`

**Delivers:** A-4 (no on-disk key renamed), A-5 (I-070), G-3; Investigation 3.1, 3.3, 3.4, 5.1–5.9

**Measures at the Phase Head:** Actionable =🔴-94=(=🟢+744=/=🔴-838=) — Task 2-1 −66 (+313 / −379), Task 2-2 −14 (+263 / −277), Task 2-3 −14 (+172 / −186) · Comments 3,513 (3,517 at BASELINE) · Tests 9,256 passed, 2 skipped (9,269 at BASELINE) · Engine graph from `serve.ts`: 219 files, no `.tsx` or `.css.ts`, `Core/Views/viewRow.ts` absent

---

#### Task 2-1 · The Root's Dissolutions

**In Plain Terms:** Several small files at the top of the views folder held work that belongs to someone else. Each piece moved to the file that already owns its kind of work, and the leftover files are gone. The toolbar's "show the view's name" toggle now saves the same way every other folder setting does.

**What Leaves:** `Views/containerConfig.ts`, the `container:configure` handler and bridge entry, `ContainerConfigPatch`, `Views/filterModel.ts`, `Views/reassign.ts`, `Views/visibilityModel.ts`, `Views/creationOrder.ts`, `Views/Pipeline/pickView.ts`; `PaneTarget`, `targetOption`, `schemaTargets`' `def`; the host's `sortReassign` memo and `reassignBySortRun`; the exports of `decodeGroupConfig`, `decodeSubGroup`, `DEFAULT_VIEW_TYPE`, `pickedStyle`; `Views/handlers.test.ts`, `filterModel.test.ts`, `reassign.test.ts`, `visibilityModel.test.ts`, `creationOrder.test.ts`, `Pipeline/pickView.test.ts`.

**What Arrives:**
- `setViewButton` in `Nexus/mutateRequest.ts` and `Nexus/mutate.ts` beside `setDisclosureLock`; `ViewMenu.tsx` calls `mutate`, which reports its own refusal.
- `valueKinds.ts`: `reassignable`, `groupKeyToValue`, `TITLE_OPS`, `LOCATION_OPS`, `operatorsFor(id, type)`.
- `paneTargets.ts`: every target a `PickerOption<string>`, plus `filterTargets`.
- `Settings/FilterFrame.tsx`: `decodeFilter` and `DecodedFilter`, private.
- `Nexus/order.ts`: `placementSlot`, `placedBeside` (was `placeAt`). `Actions/createActions.ts`: `placeNew`, private to `createNamed`. `Host/useViewCreation.ts`: `tieOrderWith` and `mergedRanking`.
- `Host/useViewInteractions.tsx`: `reassignTarget`, the `sortReassign` memo, `reassignBySortRun`.
- `Pipeline/columns.ts`: one `shownIn` predicate under `resolveColumns` and `hiddenListIds`, plus `placeInShown`, `hideShown`, `unhide`.
- `views.ts`: `pickView`. `Pipeline/search.ts`: `searchKeysOf`; the host keeps both memos.
- Tests follow: `Nexus/order.test.ts` (`placedBeside`), `Actions/createActions.test.ts` (placement through `createNamed`), new `Host/useViewCreation.test.ts` (`tieOrderWith`), new `Host/useViewInteractions.test.ts` (`reassignTarget`), `valueKinds.test.ts` (reassign queries, operators), new `paneTargets.test.ts` (`filterTargets`), `Settings/FilterFrame.test.tsx` (nested filters lock), `Pipeline/columns.test.ts` (visibility), `views.test.ts` (`pickView`, decoders through `savedView.parse`), `Nexus/mutate.test.ts` (`setViewButton` writes `view_button`).

**Pins:** None named.

**Key Hunks:**

```diff
+    case 'setViewButton': {
+      const folder = await mutableTarget(root, req.path, [req.kind])
+      if (!folder.ok) return folder
+      return done(
+        await patchSidecar(folder.value, req.kind, (cur) => ({ ...cur, view_button: req.viewButton })),
+      )
+    }
```

```diff
+const shownIn = (view: SavedView): ((id: string) => boolean) => {
+  const ordered = new Set(view.property_order)
+  const hidden = new Set(view.hidden_properties)
+  return (id) => ordered.has(id) && !hidden.has(id)
+}
```

```diff
-  const propertyOptions = schemaTargets(schema, (d) => groupable(d.type)).map(targetOption)
+  const propertyOptions = schemaTargets(schema, (d) => groupable(d.type))
```

---

#### Task 2-2 · The Page Record's Home

**In Plain Terms:** A page's row in a view was defined in a file the background half of the app also had to load, so the row's builders were scattered to keep that half clean. The values the background half reads now live with the code that reads them, and everything that builds a view row sits in one window-side file. The date-style helpers moved beside the other column styles, and the one hook that reads the Nexus's date form and clock now sits with the store's other setting hooks.

**What Leaves:** `Views/pageRow.ts`, `Views/Host/useColumnStyles.ts` and its test; `toRow`, `flattenContainer`, `frontmatterOf` out of `Pipeline/group.ts`; `NexusForms`, `useNexusForms`.

**What Arrives:**
- `loadValues.ts`: `PageValues`, `pageValuesOf`; `bridge.ts`, `matrixGraph.ts`, and `Testing/pageValues.ts` import from it.
- `viewRow.ts` (window-side): `ViewRow`, `RowValues`, `Picked`, `ResolvedGroup`, `UNGROUPED`, and every builder — `frontmatterOf`, `toRow`, `flattenContainer`, `pageRowOf`, `spaceRowOf`, `fetchPageValues`, `fetchPageRow`. `pageRow.test.ts` became `viewRow.test.ts`.
- `Properties/properties.ts`: `ResolvedColumn` beside `ColumnType`; 26 importers re-pointed.
- `Properties/columnStyles.ts`: `DateForms`, `styleFor`, `columnStylePatch`, private `columnDefaults` and `pickedStyle`; their tests joined `columnStyles.test.ts`.
- `Session/store.ts`: `useDateForms` beside `useSetting`; `BundleTable`, `PropertyFrame`, `useBandHeads`, `FilterFrame`, `GroupFrame`, `PageReaderWindow`, and `DateTimeValuePicker` read it.

**Pins:** None named. Both boundary tests pass, and the walker from `serve.ts` no longer reaches `viewRow.ts`.

**Key Hunks:**

```diff
-import type { PageValues } from '../Views/viewRow'
+import type { PageValues } from '../Views/loadValues'
```

```diff
+export function useDateForms(): DateForms {
+  const dateFormat = useSetting('dateFormat')
+  const clock = useSetting('timeFormat')
+  return useMemo(() => ({ dateFormat, clock }), [dateFormat, clock])
+}
```

```diff
-  const nexusClock = useSetting('timeFormat')
-  const dateFormat = useSetting('dateFormat')
+  const { dateFormat, clock: nexusClock } = useDateForms()
```

---

#### Task 2-3 · The Live View

**In Plain Terms:** Saving a view's settings ran through three files and four layers. It's now one write in one file beside the record of what's been staged, and the drag ordering that paints the sidebar and bands ahead of a move has its own small file. A drop that's refused after another reorder was made on top of it now puts its row back where it was, rather than leaving it at the refused spot.

**What Leaves:** `Views/viewWrite.ts` (`saveViewIn`, `writeView`, `resolveViewWrite`), `Host/useActiveView.ts`, `Views/deleteViewWithUndo.ts`; `ViewWriteOpts`, `pickViewState`, `VIEW_STATE_KEYS` out of `views.ts`; the exports of `stageView`, `unstageView`, `VIEW_CONFIG_LOCKED`; `viewWrite.test.tsx`'s three-layer copies, `useActiveView.test.tsx`, `deleteViewWithUndo.test.ts`, `views.test.ts`'s `pickViewState` case.

**What Arrives:**
- `Host/liveView.ts` (renamed from `Host/pendingView.ts`): the pending record, `useActiveView`, one `useSaveView` with the locked-tile gate inline, `dropIO`, `ViewWriteOpts`, and the view-state keys.
- `Host/paintAhead.ts`: `ahead`, `usePainted`, `mutateAhead`, `refusedDrop`, under a one-line header.
- `Nexus/treePatch.ts`: `withChildOrder` (private) and `orderInTree`.
- `ViewTileScope.tsx` → `ViewTileScope.ts`. `Settings/ViewFrame.tsx`: `deleteViewWithUndo`, private.
- `dropIO` takes the dragged `{ id, name }`; its refusal arm re-places the row at its prior slot (I-070).
- Tests follow: `Host/liveView.test.tsx` (the record, `useActiveView`, `useSaveView`, the pin), new `Host/paintAhead.test.ts`, `Settings/ViewFrame.test.tsx` (the delete notice's Undo), `VisibilityFrame.test.tsx`'s mock path.

**Pins:**
- **I-070:** *a refused drop that a later write composed over returns its row to its prior slot* (`Host/liveView.test.tsx`). Red run: the refusal arm's re-placement (`after`, `back`, and the `persist(back)` call) was removed from `liveView.ts`; the pin failed with `expected "vi.fn()" to be called with arguments` while the other 31 cases passed; the file was restored and all 32 passed.

**Key Hunks:**

```diff
+        if (wrote && (await persistView(shown, opts)).ok) return
+        unstageView(source.id, view.id, patch)
+        const after = readLiveView(source.id, view)
+        const back = Object.fromEntries(
+          Object.keys(patch).flatMap((k) => {
+            const slot = priorSlotOf(view[k as keyof SavedView], after[k as keyof SavedView], id)
+            return slot ? [[k, slot]] : []
+          }),
+        )
+        if (Object.keys(back).length) void persist(back, opts)
```

```diff
+    const allowed = !scope.locked ? patch : opts?.viewState ? pickViewState(patch) : null
+    if (!allowed) return fault(VIEW_CONFIG_LOCKED)
+    stageView(source.id, view, allowed)
+    scope.persist(allowed)
+    return ok({ id: view.id })
```

```diff
-import { useSaveView } from '../viewWrite'
+import { useSaveView } from '../Host/liveView'
```

---

#### Deviations From the Task Text

- **`operatorsFor(id, type)`:** takes the column type rather than resolving the id itself, so `valueKinds.ts` doesn't import a pipeline stage; `filterTargets` drops its `contextIds`, and FilterFrame resolves the column it already holds.
- **`setViewButton`'s Write:** `{ ...cur, view_button }` rather than `setOrDrop`, since both values are always written; the op's shape otherwise matches `setDisclosureLock`.
- **`dropIO`'s Signature:** the I-070 arm needs the dragged row's id, so `dropIO` takes `{ id, name }`; its three callers pass the row or band key they already hold. The arm skips a key whose prior order didn't rank the row, since there's no prior slot to return to.
- **`stageView`/`unstageView` Private:** their only callers now live in `liveView.ts`; the record's tests stage through `useSaveView` under a tile scope and take back through `dropIO`.
- **`DateForms.clock`:** typed `TimeFormatSetting`, the Nexus clock's own type, since `DateTimeValuePicker` needs a clock that is never `none`. This adds a type-only import from `Settings/personalization.ts`, which already imports `columnStyles.ts`; `columnStylePatch` returning `ViewPatch` likewise adds a type-only edge back to `views.ts`. No lint rule objects, and neither enters the engine graph as a new file.
- **`flattenContainer` Returns `SetNode[]`:** its own tree type, so `viewRow.ts` doesn't import `SetTreeNode` back from `group.ts`; `group.ts`'s header line, which described `flattenContainer`, moved onto it.
- **Test Files:** the live view's tests sit in `liveView.test.tsx` (they carry JSX from the save tests), and the paint-ahead tests moved to `paintAhead.test.ts` with their file. `reassignTarget` stays exported from `useViewInteractions.tsx` for its six algorithm tests. `toRow` and `flattenContainer`'s builder cases stay in `group.test.ts`, which holds their fixtures. `decodeFilter`'s flat and empty cases were already covered by FilterFrame's surface tests; its nested shapes moved there.
- **Test Count (−13):** `handlers.test.ts`'s three cases became one `mutate.test.ts` case (−2); `filterModel.test.ts`'s twelve became ten across `valueKinds`, `paneTargets`, and FilterFrame (−2); `viewWrite.test.tsx`'s seventeen became nine `useSaveView` cases (−8); `pickViewState`'s case joined a `useSaveView` case (−1); `deleteViewWithUndo.test.ts`'s two became one ViewFrame case, the decline already covered there (−1); the I-070 pin (+1).


#### Stacked Onto Phase 1

The three commits were cherry-picked onto Phase 1's head (`04baea1ca`) as `010f529c9`, `19febd618`, `3927af9ae`, with import-line conflicts in `GroupFrame.tsx`, `ViewHost.tsx`, and `useViewHost.ts` resolved toward both phases. Three folds landed in the task they belong to, and the patches beside this file are the stacked diffs:

- **Task 2-2:** `PageValues` and `pageValuesOf` took `Core/Views/pageValues.ts`, engine-safe, rather than `loadValues.ts`. In `loadValues.ts` the window's two blank-row callers (`useViewCreation.ts`, `previewRules.ts`) imported the host's readers (`readNexus`, `liveTree`, `heldPages`) into the renderer bundle. The engine graph from `serve.ts` still reaches no renderer.
- **Task 2-1:** `Nexus/schemas.containerConfig.test.ts` became `schemas.viewButton.test.ts`, since the file it was named after is gone.
- **Task 2-3:** `persistAfter`'s comment states the I-070 arm.
