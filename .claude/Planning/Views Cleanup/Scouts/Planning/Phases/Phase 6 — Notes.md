#### Phase 6 — Notes

**Commit:** `64f346526` on `vc-p6`, parent `218fff078` · Task 6-1 `bc764b842` · Task 6-2 `64f346526`

**Patch:** `Phase 6a — One Prune and One Bucket Builder.patch` · `Phase 6b — The Band Layer Owns Its Model.patch` — both replay from `218fff078` to the phase head's tree exactly

**Delivers:** E-2, E-3, G-2 (`useBandSource`); Investigation 6.1–6.7, with 6.8 flagged only as planned

**Measures at the Phase Head:** Actionable from `cae07c129` =🔴-381=(=🟢+1901=/=🔴-2282=); the phase's own, from `218fff078`, =🔴-56=(=🟢+160=/=🔴-216=) — Task 6-1 −47, Task 6-2 −9 · Comments 3,508 (3,511 at the phase's parent, 3,517 at BASELINE) · Tests 9,260 passed, 2 skipped

---

#### Task 6-1 · One Prune and One Bucket Builder

**In Plain Terms:** Before a view draws its bands, the app trims away the ones that shouldn't show: hidden ones, empty ones when Hide Empty Groups is on, and folders a filter emptied. That used to take three separate passes, plus a fourth that reordered folders after everything was built. Now the folders are put in the view's custom order before anything is built, and one pass trims what shouldn't show. Grouping by a Select or Status inside folders now builds its bands the same way the top level does, so an option with no pages shows as an empty band under each folder too, until Hide Empty Groups is turned on.

**What Leaves:** `Pipeline/bandOrder.ts` (`orderGroups` and its slot-holding) and `bandOrder.test.ts`; `dropHiddenGroups`, `pruneEmptyBuckets`, `pruneEmptyGroups`; `property()` and `structuralSubGrouped`'s own bucket block; the "Compose bucket-first" comment; `resolveView.ts:1`'s stage-list header.

**What Arrives:**
- `orderSetTree(tree, order)` in `group.ts`, applied in `resolveView` ahead of `pruneHiddenSets` whenever `viewSetOrder` returns an order.
- `bucketBands(rows, grouping, sorter, placement, scope?)` serves the property plan and each Set under a sub-grouping; `scope` keys the bands and the tail under their Set, and its absence keeps the top-level tail on `UNGROUPED`.
- `pruneGroups(groups, drops)`, one bottom-up walk; `resolveView` composes one predicate from the hidden buckets, Hide Empty Groups, and a filter that bit, and skips the walk when none applies.
- `bandOrder.test.ts`' three tree cases (top level, nested from the one flat array, unlisted trailing) follow into `group.test.ts`' `orderSetTree` block; its tail-slot and property cases had no subject left.
- E-2's Location-sorted list stays in the Nexus's order: under Sort By Location, "Location" draws `locationFlat` while `setOrderOf` reads `'location'`, so `viewSetOrder` returns nothing, and "Custom" draws `flat()`, which never reads the Set tree. Reaching it means changing `setOrderOf`, which `routeSet` and `pageOrderOf` also read.
- A filter that bit still removes a Set it emptied under a sub-grouping, its empty option bands with it: the prune reads whether a band holds rows, where `isEmptyBand` would now count those empty bands and keep the Set.
- Tests asserting the old sub-grouping now assert E-3: `group.test.ts`' three sub-grouping cases, `resolveView.test.ts`' encoded-sub-key case, and four sub-group bucket drags in the band suite, whose glyph indices and pointer heights account for the empty bands now drawn.

**Pins:**
- **E-2** (`group.test.ts` › `orderSetTree` › "a custom Set order orders the pages gathered from nested Sets inside one band when nothing sorts them"): run at `218fff078` before any change, it read `['p1', 'p2']` against `['p2', 'p1']`; at the task head, with the tree's ordering replaced by `let tree = setTree`, it read red the same way; restored, green.
- **E-3** (`group.test.ts` › sub-grouping › "an empty option band shows under a Set while Hide Empty Groups is off, and leaves once it is on"): at `218fff078` it read `['setB/prop_status/opt_done']` lacking `setB/prop_status/opt_in_progress`; at the task head, with `bucketBands` dropping every empty bucket under a scope, it read red the same way; restored, green.

**Key Hunks:**

```diff
-  if (hidden.size > 0) resolved = dropHiddenGroups(resolved, hidden, plan)
-  if (viewOption(view, 'hide_empty_groups'))
-    resolved = pruneEmptyGroups(pruneEmptyBuckets(resolved))
-  else if (filtered.length !== rows.length) resolved = pruneEmptyGroups(resolved)
-  return { columns, groups: orderGroups(resolved, viewSetOrder(plan, view)) }
+  const drops = (group: ResolvedGroup): boolean =>
+    (group.kind === 'bucket' &&
+      grouping !== undefined &&
+      isBucketHidden(hidden, level, grouping.config.property_id, group.value)) ||
+    ((hideEmpty ? group.kind !== 'tail' : filtering && group.kind === 'set') && !holdsRows(group))
+  return { columns, groups: pruneGroups(groups, drops) }
```

```diff
-    let children = bucketOrder(sub, def, new Set(buckets.keys())).flatMap((b): ResolvedGroup[] => {
-      const items = buckets.get(b)
-      if (!items) return []
-      const key = bandKey(sub.property_id, b, node.id)
-      return [{ key, kind: 'bucket', value: b, items: applySort(items, sorter) }]
-    })
-    const tail = bandKey(sub.property_id, UNGROUPED, node.id)
-    children = placeTail(children, noValue, sorter, placement, tail)
+    const children = bucketBands(pages, grouping, sorter, placement, node.id)
```

```diff
+export const orderSetTree = (tree: SetTreeNode[], order: readonly string[]): SetTreeNode[] =>
+  resolveRowOrder(tree, (node) => node.id, order).map((node) =>
+    node.sets ? { ...node, sets: orderSetTree(node.sets, order) } : node,
+  )
```

---

#### Task 6-2 · The Band Layer Owns Its Model

**In Plain Terms:** The code that draws group headings kept some of its own definitions in the file that routes drags, and some in the pipeline, so a reader chased them across three folders. They now sit together in the bands folder. The rule for how far a row in a band is indented had two owners that disagreed by 8px for rows outside any band, which put the drop line slightly left of those rows; one rule now serves the rows and the drop line alike.

**What Leaves:** `BandItem`, `BandList`, and the router's `bucketValue` switch; `HeadContext.opensTop` and `headContextOf`'s `source` parameter; TableView's local `indent` closure and per-band `memberIndent` pick; `Host/useBandHeads.ts`; `Pipeline/setIndex.ts`; `formatBucketLabel` and `orderedChildren` from `group.ts`, with the imports only they used.

**What Arrives:**
- `SetRef`, `BucketRef`, `BandRef`, and `bucketValueAt` in `bandModel.ts`; the router takes them as a value import and the model imports only `BandDrop`'s type back. `bandRouting` and `bandScopeOf` take a `BandModel`.
- A Set band opens on `foldersOpen || isTopContainer(set)`.
- `memberIndent(kind, depth)` beside `memberDepth`, read by TableView's rows, its two ghosts, and the row drop line.
- `formatBucketLabel` beside `dateLabeller`; `orderedChildren` in `Bands/setIndex.ts`; `Bands/useBandSource.ts`.
- `Bands/bandDrops.test.tsx` holds the band suites (`bandCommits.test.tsx:194-843`); `Table/bandCommits.test.tsx` keeps the column-width describe with the setup it reads.
- `formatBucketLabel`'s tests follow it into `bandModel.test.ts`; the band tests' `headContextOf` calls drop `source`.
- `group.ts`' "Cards never indent" reads as any kind that doesn't nest; `sort.ts`' gate comment names the host.

**Pins:** None named.

**Key Hunks:**

```diff
-      const opens = heads.foldersOpen || (heads.opensTop && parentKey === null)
+      const opens = heads.foldersOpen || isTopContainer(set)
```

```diff
+export const memberIndent = (kind: BandNode['kind'], depth: number): string =>
+  kind === 'tail'
+    ? `calc(var(--loose-inset) + ${rowIndent(depth)})`
+    : rowIndent(memberDepth(kind, depth))
```

```diff
-          return rowLine(slot, s, indent(memberDepth(node.kind, node.depth)))
+          return rowLine(slot, s, memberIndent(node.kind, node.depth))
```

```diff
-const bandScopeOf = (bands: BandList, base: BandBase): BandScope => ({
+const bandScopeOf = (bands: BandModel, base: BandBase): BandScope => ({
   ...base,
   valueAt: bucketValueAt(bands.byKey),
-  shown: bands.nodes.flatMap((n) => {
-    const value = bucketValue(n)
-    return value === null ? [] : [value]
-  }),
+  shown: bands.nodes.flatMap((n) => (n.kind === 'bucket' ? [n.value] : [])),
 })
```
