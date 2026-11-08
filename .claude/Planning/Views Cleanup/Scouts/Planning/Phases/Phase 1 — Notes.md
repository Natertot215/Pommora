### Phase 1 — Notes

**Commit:** `4e97c8e74` (Task 1-1) and `04baea1ca` (Task 1-2), branch `vc-chain`, parent `cae07c129`.

**Patch:** *Phase 1 — The Kind Record.patch* (Task 1-1, `cae07c129..4e97c8e74`) and *Phase 1b — The Host Reads Once.patch* (Task 1-2, `4e97c8e74..04baea1ca`).

**Delivers:** B-1; Investigation 1.2 and 1.3. It answers Fresh-Eyes questions 3, 5, and 6, and leaves question 4's grid as it is, a tile live when its kind has a record.

**Measures:** Actionable `+9 (+143 / -134)` cumulative from `cae07c129`; comments 3,517 (BASELINE 3,517); tests 9,269 passed, 2 skipped across 550 files, unchanged.

**Placement:** the record type, the built-kinds table, and `presentedKind` sit in `Core/Views/Host/viewKinds.ts`, the plan's named fallback, where the Placements table gives `ViewHost.tsx`. Task 1-2 has `useViewHost.ts` read `presentedKind`, and `ViewHost.tsx` already imports `useViewHost` as a value, so the single-file form makes `ViewHost.tsx ↔ useViewHost.ts` a runtime import cycle. An esbuild metafile walk over runtime imports found no path from either renderer to `ViewHost.tsx`, `useViewHost.ts`, `LayoutFrame`, `GroupFrame`, `SortFrame`, `SettingsFrame`, `ViewFrame`, or `viewKinds.ts`, so the 2-cycle is the only one the single-file form would create, and `viewKinds.ts` creates none. The placement needs Nathan's approval like the rest of the table.

#### Task 1-1 · One Record per Built Kind

**In Plain Terms:** Table and Cards each became one small record that sits beside the code that draws them, listing how they draw, whether their folders nest, and which Layout switches and rows they offer. One lookup answers which record a view uses, and a kind that isn't built yet uses Table's, a rule now written once. The Layout pane reads the switches and the three Cards pickers from the record instead of building them itself; nothing on screen changes.

**What Leaves:** `VIEW_RENDERERS` and its `?? TableView` (`ViewHost.tsx`); `LayoutOptions`, `TABLE_LAYOUT`, `LAYOUT_OPTIONS`, `?? TABLE_LAYOUT`, `cardRows`, `leaf`, `BANNERS`, `FORMATS`, `CARD_ROW_LOOK`, and the inline Cards picker block (`LayoutFrame.tsx`); `nests` from `VIEW_KINDS` and the `ViewKind` interface (`views.ts`); `SwitchEntry` from `switchRows.tsx`, which imports it from the record's file.

**What Arrives:** `Table/tableKind.ts` (`TABLE_KIND`) and `Cards/cardsKind.ts` (`CARDS_KIND`, with the three picker rows as `rows(view, write)` returning descriptors); `Host/viewKinds.ts` with `SwitchEntry`, `ViewKindRecord`, `BUILT_KINDS`, and `presentedKind`. `GroupFrame` and `SortFrame` read `presentedKind(view.type).nests`; the Grouping pane tree's `nests: true` gains its one reason line. The type grid's live test reads `t in BUILT_KINDS`. The editor's Layout leaf keeps its behavior through `kind !== TABLE_KIND` (the Visibility list for Table and every unbuilt kind, the switches alone for Cards), with no `leaf` field; Phase 3 deletes the branch.

**Pins:** none named for this phase.

**Key Hunks:**

```diff
-const VIEW_RENDERERS: Partial<Record<ViewType, (p: { host: ViewHostApi }) => React.JSX.Element>> = {
-  table: TableView,
-  cards: CardsView,
-}
...
-  const Renderer = VIEW_RENDERERS[view.type] ?? TableView
+  const { Renderer, nests } = presentedKind(view.type)
```

```diff
+export const BUILT_KINDS: Partial<Record<ViewType, ViewKindRecord>> = {
+  table: TABLE_KIND,
+  cards: CARDS_KIND,
+}
+
+export const presentedKind = (type: ViewType): ViewKindRecord => BUILT_KINDS[type] ?? TABLE_KIND
```

```diff
-  const cardsRows = options.cardRows ? (
+  const kindRows = kind.layout.rows ? (
     <>
       <MenuSeparator flush />
-      <MenuIndex
-        sections={[ … three inline Cards rows … ]}
-      />
+      <MenuIndex sections={[{ rows: kind.layout.rows(view, write) }]} />
     </>
```

```diff
-    ...(!VIEW_KINDS[view.type].nests || primary?.property_id === LOCATION_SORT
+    ...(!presentedKind(view.type).nests || primary?.property_id === LOCATION_SORT
```

#### Task 1-2 · The Host Reads the Active View Once

**In Plain Terms:** The code that prepares a view's rows now works out for itself whether folders nest, from the view it already reads. The piece that places the view on screen stops reading the view a second time just to hand that answer over. Nothing on screen changes.

**What Leaves:** `useViewHost`'s `nests` parameter; `ViewHost`'s own `useActiveView` read and the comment "Only the type and scale are needed to seat a renderer"; the `nests` prop on the host test's `Probe` and `mount`.

**What Arrives:** `const { nests } = presentedKind(view.type)` after `useViewHost`'s `useActiveView`; `ViewHost` reads `host.view.type` and `host.view.view_scale` after its null check. In `useViewHost.test.tsx`, the Set fixture's view is a Table by default, and the cards-seam cases and the standing-ghost case state `type: 'cards'`, so each nesting-on or nesting-off case gets its answer from the kind, as the hook now does.

**Pins:** none named for this phase.

**Key Hunks:**

```diff
-export function useViewHost(source: CollectionNode | SetNode, nests: boolean) {
+export function useViewHost(source: CollectionNode | SetNode) {
…
   const view = useActiveView(source)
+  const { nests } = presentedKind(view.type)
```

```diff
-  // Only the type and scale are needed to seat a renderer.
-  const view = useActiveView(source)
-  const { Renderer, nests } = presentedKind(view.type)
   const tile = useViewTileScope()
-  const scale = tile ? ZOOM.default : (view.view_scale ?? ZOOM.default)
-  const host = useViewHost(source, nests)
+  const host = useViewHost(source)
…
   if (!host) return <div />
+  const { Renderer } = presentedKind(host.view.type)
+  const scale = tile ? ZOOM.default : (host.view.view_scale ?? ZOOM.default)
```

```diff
-    await mount(carried, false)
+    await mount(setCollection({ ...carried, type: 'cards' }))
…
-    await mount(carried, true)
+    await mount(setCollection(carried))
```
