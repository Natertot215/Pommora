#### Phase 10 — Notes

**Commit:** `e9d4d3462` on `vc-p10`, parent `78238c859` · Task 10-1 `e9d4d3462`

**Patch:** `Phase 10 — One Lock per Row.patch`

**Delivers:** A-5 (I-059), Investigation *§Calls for Nathan 3*; Behavior Change 24

**Measures at the Phase Head:** Actionable from `cae07c129` =🔴-376=(=🟢+3033=/=🔴-3409=); the phase's own, from `78238c859`, =🟢+3=(=🟢+47=/=🔴-44=), tests excluded · Comments 3,493 (3,493 at the parent, 3,517 at BASELINE) · Tests 9,261 passed, 2 skipped

---

#### Task 10-1 · One Lock per Row

**In Plain Terms:** Lists you can drag things around in used to tell screen readers "press Space to pick it up" on every row, even in lists where nothing moves, like the Trash and Archive table or a navigation list with nothing to reorder. Each row now says for itself whether it stays put, the same way it already says what Enter and Space do. A row that stays put can't be picked up from the keyboard and no longer mentions the gesture; three separate ways of locking a list collapse into that one per-row setting.

**What Leaves:**
- `lineList`'s `locked` option and its `if (locked) return null` in `snap`.
- `groupedLine`'s `items.disabled` and `groups.disabled` reads in `snap`.
- `bandSpec`'s `disabled` parameter and the `draggable(node)` guard inside its `snap`.
- `useViewInteractions`' read of the host's `dragDisabled` (it fed only `locked`), and `bandZone`'s `disabled: searching`.
- `draggable`'s switch and type guard over every band kind; it now answers for a head alone.
- Five `locked:` call sites: `BundleTable`, `NavList`, `OptionOrderList`, `ViewFrame`, and the view's row list.
- `groupedLine.test`'s "a disabled spec snaps nothing for its own kind", which asserted the removed read.

**What Arrives:**
- `immovable?: boolean` on `LineRowOptions` (so on `useLineRow` and `LineRow`). The row hook writes it as `data-line-immovable` beside its `data-line-row`, and `measureLine` answers a null snapshot for a row carrying it, so the engine's existing null-snapshot rule refuses its keyboard lift and still lets a pointer carry it out to another zone. The hook drops `aria-describedby` on an immovable row and on any row in a disabled zone.
- `useDragItem` drops `aria-describedby` in a disabled zone.
- `BandView.immovable` (the view's search lock), read by `HeadedBand` as `immovable={bands.immovable || !draggable(node)}`.
- Each former lock, read where its row is built: `BundleRowView` (always), `NavRow` (`!onReorderRecent`), `HideableRow` via `OptionOrderList` (`!onSave`), `ViewFrame`'s row (`views.length < 2`), `DataRow` (`dragDisabled`), `HeadedBand` (search or a Date head), and `MatrixLabel` (always — its zone's `snap` was already `() => null`).

**Pins:**
- **A row that can't lift names no drag gesture, and a row that can does** (`engine.test.tsx`, new): red with `useLineRow`'s description reverted to `INSTRUCTIONS_ID` unconditionally.
- **An immovable row's Space runs its own action in place of a lift** (`engine.test.tsx`, the former null-snapshot version of "runs a row's own Space where it can't lift" rewritten onto the flag): red with `measureLine`'s immovable read reverted.
- **A displace item in a disabled zone carries no description** (one assertion added to "marks a disabled zone on its items from the first render"): red with `useDragItem`'s description reverted.
- `GroupBand.test`'s Date-head test and `bandZone.test`'s held-bands test, rewritten from the removed `snap` guard and `disabled` parameter onto the flag: both red with `HeadedBand`'s `immovable` set to `false`.

**Key Hunks:**

```diff
-  return { geometry, snap: spec.snap(id, geometry), origin, zoom, dirty: false }
+  const snap = entry.els.get(id)?.hasAttribute(IMMOVABLE) ? null : spec.snap(id, geometry)
+  return { geometry, snap, origin, zoom, dirty: false }
```

```diff
-      'aria-describedby': INSTRUCTIONS_ID,
+      'aria-describedby': immovable || disabled ? undefined : INSTRUCTIONS_ID,
       'data-line-row': zoneId,
+      [IMMOVABLE]: immovable ? '' : undefined,
```

```diff
-        const item = items.disabled ? null : items.snap(id, g)
+        const item = items.snap(id, g)
```

```diff
-    snap: (key, g) => {
-      const node = nodeOf(key)
-      return node && draggable(node)
-        ? bandSnap(g, shownHeads(bands.nodes, disclosure.isOpen), key, nests, routing.moves)
-        : null
-    },
+    snap: (key, g) =>
+      bandSnap(g, shownHeads(bands.nodes, disclosure.isOpen), key, nests, routing.moves),
```

**Beyond Behavior Change 24:**
- A Cards view's band list keeps its Tab stop during a search, as the Table's always did; its heads still can't lift. Before, the search disabled the whole band zone.
- Rows in a disabled line zone (the alias list while filtered, renaming, or drafting) and the Matrix's locked-layout label drop the drag description.
