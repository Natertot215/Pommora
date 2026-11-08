#### Phase 4 — Notes

**Commit:** `b5994d7cc` on `vc-p4`, parent `3927af9ae` · Task 4-1 `fc03d5f54` · Task 4-2 `0f9808c8c` · Task 4-3 `b5994d7cc`

**Patch:** `Phase 4a — The Bundle Table Draws Its Heading.patch` · `Phase 4b — One Column Gesture.patch` · `Phase 4c — One Shell Class.patch`

**Delivers:** F-8, G-2 (`.table-shell`); Investigation 4.1–4.6, with 4.7 kept as written

**Measures at the Phase Head:** Actionable from `cae07c129` =🔴-235=(=🟢+1124=/=🔴-1359=); the phase's own, from `3927af9ae`, =🔴-151=(=🟢+238=/=🔴-389=) — Task 4-1 −62 (+51 / −113), Task 4-2 −89 (+70 / −159), Task 4-3 −5 (+141 / −146), each raw production lines with comments · Comments 3,509 (3,514 at the phase's parent, 3,517 at BASELINE) · Tests 9,256 passed, 2 skipped

---

#### Task 4-1 · The Bundle Table Draws Its Heading

**In Plain Terms:** The Trash and the Archive show the same table, but each built its column heading by hand, and the two disagreed on spacing and alignment. The shared table now draws its own heading from the two labels each one passes. The date column reads left-aligned in both, heading and dates alike, and the Trash's heading glyph sits at the same 6px gap every table heading uses.

**What Leaves:** `DateHeading`; Archive's hand-built heading pair and its `.col-header.archive-date` centering; Trash's `trash-head`, `trash-head-name`, `trash-head-date`, `trash-head-glyph`, and `trash-head-label` classes with their rules and the 8px glyph gap and 8px date-heading knob; `.bundle-date`'s centering; the `Icon` imports in both skins.

**What Arrives:**
- `BundleTable` takes `titleHead` and `dateHead`, each `{ icon, label }`, and renders `.table-head` itself, the date heading's measure and right-click folded in.
- Trash's heading rebinds key on `.trash-frame .table-head` and `.trash-frame .col-header:first-child`.
- `SettingsWindow.tsx`'s window-drag surfaces follow the heading: `.trash-frame .table-head, .trash-frame .col-header`.
- Tests follow: `BundleTable.test.tsx` renders the table with both headings and reads the measure through `.col-measure > [aria-hidden]`; `TrashFrame.test.tsx` right-clicks the last heading.
- The Archive Drive's heading selectors follow (`live-drive.mjs` 591, 631–640, 1222, 1722, 1740, 1744); the drive wasn't run.

**Pins:** None named.

**Key Hunks:**

```diff
-      <div className="table table-view">
-        <BundleTable date={date}>
-          <div className="table-head">
-            <div className="col-header">
-              <span className="col-header-icon">
-                <Icon name={propertyTypeIconName('title')} size="body" />
-              </span>
-              Title
-            </div>
-            <DateHeading
+        <BundleTable
+          date={date}
+          titleHead={{ icon: propertyTypeIconName('title'), label: 'Title' }}
+          dateHead={{ icon: propertyTypeIconName('dateTime'), label: 'Archived' }}
+        >
```

```diff
-.bundle-date {
-  justify-content: center;
-}
```

---

#### Task 4-2 · One Column Gesture

**In Plain Terms:** A table column could be dragged and resized, but the two gestures lived in different places, and the resize was passed through a separate header component that existed mostly to carry it. Both gestures now live in the one column hook, the header is drawn in the table itself, and the separate component is gone. Dropping a column saves its new place through the same rule the Visibility list uses.

**What Leaves:** `Views/Table/ColumnHeader.tsx`; `reorderColumns` and the hook's `reorderColumn`; `resizeColumn`, `abortResize`, `endResize`, `commitResize`, and the id-ignoring `onResizeStart`; `DragShift`; TableView's `headerIcon`; `useLineRow` in `DataRow`; `moveItem` in `useColumns.ts`.

**What Arrives:**
- `useColumns` returns `startResize(e, id)` beside `startColumnDrag(e, i)`, both on its one `beginGesture`; the resize clamps each move and persists the last clamped width.
- A dropped column persists `placeInShown(view, shownIds, id, to)`.
- TableView's header map draws `.col-header` with its icon, label, and `.col-resizer` inline.
- `DataRow` renders `<LineRow>`, as `BundleRowView` does; `ColumnDrag` carries the painted shift alone.
- `Views/Table/cellSweep.ts` → `useCellSweep.ts`. It had no test file to follow it.
- `useColumns.test.ts`' column-order block asserts the four drop cases through `placeInShown`; its view builder moved to module scope for both blocks.

**Pins:** None named.

**Key Hunks:**

```diff
-          reorderColumn(columns[current.from].id, columns[current.to].id)
+          void persistView(
+            placeInShown(
+              view,
+              columns.map((c) => c.id),
+              dragId,
+              current.to,
+            ),
+          )
```

```diff
+                <span className="col-resizer" onPointerDown={(e) => startResize(e, c.id)} />
```

```diff
-export type DragShift = { from: number; to: number; width: number }
-type ColumnDrag = DragShift & { id: string }
+export type ColumnDrag = { from: number; to: number; width: number; id: string }
```

---

#### Task 4-3 · One Shell Class

**In Plain Terms:** The outer frame the Table and the Archive wear was named after the Table, and the Trash built its own version of the same frame. It now has one name, `.table-shell`, worn by all three. Styles that only property values use left the shared table sheet for the Properties folder, and two other stray rules joined the one sheet that uses them.

**What Leaves:** `.table-view`; `.row-grip`'s look in `table-view.css`; the property-cell block and `.col-measure` in `UIX/Table/table.css`; Trash's own horizontal padding and scroll on `.trash-table`, its heading's reach-back margin, and its File Name's zero lead.

**What Arrives:**
- `.table-shell` in `table-view.css`, `TableView.tsx`, `ArchiveView.tsx`, and `TrashFrame.tsx` (which now imports the sheet), and in the two outside matchers, `Tiles/Surfaces/view-tile.css.ts` and `Interface/Header/content-banner.css`. The tile's zoom rule keeps its shape for Phase 8.
- `table-view.css`'s header names TableView, ArchiveView, and TrashFrame, and says the latter two import it from there.
- `.row-grip`'s color, cursor, and touch action beside its slot rule in `UIX/Table/table.css`.
- `Core/Properties/Cells/cells.css`, imported by `Cell.tsx`, holding the former `table.css:222-321`, the table-scoped pen override included.
- `.col-measure` in `Core/Bundles/bundle-table.css`.
- The Archive Drive's `.table-view .data-row` reads `.table-shell .data-row` (1248), and its Trash look case (1740) checks the heading's title glyph against the rows' title glyph, where it checked it sat over the checkbox gutter.

**Pins:** None named.

**Key Hunks:**

```diff
-      <div className="trash-table">
+      <div className="trash-table table-shell">
```

```diff
-/* The heading keeps its own place: reaching back over the gutter to the frame's inset, where its divider and File Name begin, its first track taking up the width so its column line meets the rows'. */
-.trash-frame .table-head {
-  flex-shrink: 0;
-  margin-left: calc(var(--surface-inset) - var(--rail-inset));
-}
```

```diff
+import type { ResolvedColumn } from '../properties'
+import './cells.css'
```

**The Trash's Inset, Read From the Two Rules:** The Trash's inset changed. Before, `.trash-table` padded `0 var(--surface-inset) 0 var(--rail-inset)`, and its heading reached back by `surface − rail`, so the rows' grid ran from 20px to 10px short of the frame's right edge, while the heading's divider ran from 10px to that same right edge, with File Name at 10px over the checkbox gutter. Under `.table-shell`, `--content-inset` is 24px, so the grid still starts at 20px but runs to the frame's right edge, which sits 6px inside the window's glass. The heading full-bleeds from 4px left of the frame to the window's glass on the right, and File Name lands at 32px, over the rows' title glyphs as in the Archive and Table. The date column's right edge moves 10px right. These widths come from the CSS and haven't been checked on screen.


#### Stacked Onto Phase 3

The three commits were cherry-picked onto Phase 3's head (`072c850c2`) as `8282335a7`, `a26af1839`, `218fff078`, with no conflicts. One fold landed in Task 4-3, and the patches beside this file are the stacked diffs: **the Trash keeps its own insets.** The builder's CSS reading had the shell's `--content-inset` bleed running into the Settings window's resize strip and moving the File Name heading from over the checkbox gutter to over the row titles, and no decision names either; the Trash sits in a window, not the content pane the shell bleeds into, so `TrashFrame.tsx` and `trash-frame.css` stand as Task 4-1 left them and the drive's 7B look case keeps its gutter assertion. Phase 4's own delta after the fold is about -146.
