#### Phase 7 — Notes

**Commit:** `a948d4b93` on `vc-chain`, parent `a7bf39dfe` · Task 7-1 `d496ac73b` · Task 7-2 `de39cec58` · Task 7-3 `d234131d4` · Task 7-4 `a948d4b93`

**Patch:** `Phase 7a — One Disclosure Shape.patch` · `Phase 7b — The Band Head's One Tab Stop.patch` · `Phase 7c — One Indent Step.patch` · `Phase 7d — The Navigation Trees.patch` — each `git diff` from its task's parent, replaying from `a7bf39dfe` to the phase head's tree

**Delivers:** C-1, C-2, C-3, C-4, C-5, G-2 (`RowRail` takes the lead cell's name); Investigation 7.1–7.5, with 7.6 kept as planned

**Measures at the Phase Head:** Actionable from `cae07c129` =🔴-434=(=🟢+2595=/=🔴-3029=); the phase's own, from `a7bf39dfe`, =🟢+17=(=🟢+284=/=🔴-267=) — Task 7-1 −3, Task 7-2 −12, Task 7-3 +29, Task 7-4 +1 (production lines with comments) · Comments 3,493 (3,495 at the phase's parent, 3,517 at BASELINE) · Tests 9,261 passed, 2 skipped, 545 files

---

#### Task 7-1 · One Disclosure Shape

**In Plain Terms:** Every list that folds open and closed now asks the same two questions, "is this open?" and "open or close it", whatever keeps the answer: the saved view for a table's groups, a pane's own memory for its folder trees. The rule for which rows a folded list hides is written once and serves both a view's group heads and the heading list in the link autocomplete. The fold arrow moved to the design kit's general elements, since nothing that uses it is a menu, and the Trash and Archive table's arrow now toggles its folder like every other arrow.

**What Leaves:** `DropOutline` and `DropOutlineKind` from `DisclosureRow.tsx`; `UIX/Menus/listed-outline.css.ts` (moved); `useDisclosureSet().has`; `BandView.collapsed` and `bandSpec`'s `collapsed`; GroupFrame's inverted `collapsed` memo; the host's `collapsed`, `toggleCollapse`, `NO_COLLAPSE`, and `shownCollapsed`, with `toggleCollapse`'s hand-written toggle; LocationField's `NO_FLIPS`, `narrow` state, and hand-rolled narrowed disclosure; `shownHeads`' loop; `openHeadingRows` and its comment; OutlineMenu's local `Disclosure` alias; the `data-drop-outline`, `data-drop-outline-spacer`, and `--drop-outline-beat` names.

**What Arrives:**
- `UIX/Elements/DisclosureChevron.tsx` (`DisclosureChevron`, `ChevronKind`) and `UIX/Elements/disclosure.css.ts` (`chevron`, `chevronOpen`, `chevronSpacer`, `railRow`), with `data-chevron`, `data-chevron-spacer`, and `--chevron-beat`; `DisclosureRow`'s `dropOutline` prop reads `chevron`.
- `Disclosure = { isOpen, toggle }` and `unfolded(rows, depthOf, isOpen)` in `DisclosureRow.tsx`; `useDisclosureSet(defaultOpen, resetOn?)` takes a predicate default and drops its flips when `resetOn` changes, so LocationField's narrowed tree is a second instance keyed on the query.
- The host returns `disclosure`, whose `isOpen` answers open for every band while searching and whose `toggle` goes through `checkSet.ts`'s `toggled`; `BandView` extends `Disclosure`; `bandSpec` takes `disclosure`; GroupFrame passes its `useDisclosureSet` straight through, a sub-group chip reading closed, which hides nothing beneath it.
- `shownHeads(nodes, isOpen)` is `unfolded` with the tail filter; the autocomplete calls `unfolded` over heading levels.
- The Trash and Archive chevron toggles through `onToggle={() => api.rowClick(row, 1)}`, a container's single click, keeping its place after the title at the top level and in the rail slot when nested.
- `openHeadingRows`' test cases follow `unfolded` into `UIX/Menus/DisclosureRow.test.ts`; the drives, `MATRIX.md`, `sidebar.css`, `table.css`, `AutocompletePane.tsx`, and the tests follow the attribute and class names.

**Pins:** none named.

**Key Hunks:**

```diff
-  const collapsed = useMemo(
-    () => new Set(sets.preorder.filter((id) => !expanded.has(id))),
-    [sets, expanded],
-  )
...
-        collapsed,
+        disclosure: expanded,
```

```diff
-  const toggleCollapse = (key: string): void => {
-    if (searching) return
-    const next = new Set(collapsed)
-    if (next.has(key)) next.delete(key)
-    else next.add(key)
-    void persistView({ collapsed_groups: next.size ? [...next] : undefined }, { viewState: true })
-  }
+  const disclosure: Disclosure = {
+    isOpen: (key) => searching || !collapsed.has(key),
+    toggle: (key) => {
+      if (searching) return
+      const next = toggled(collapsed, key)
+      void persistView({ collapsed_groups: next.size ? [...next] : undefined }, { viewState: true })
+    },
+  }
```

```diff
-  const flipped = narrow.q === q ? narrow.ids : NO_FLIPS
-  const disclosure = q
-    ? {
-        has: (id: string) => tree.leads.has(id) !== flipped.has(id),
-        toggle: (id: string) =>
-          setNarrow((prev) => ({ q, ids: toggled(prev.q === q ? prev.ids : NO_FLIPS, id) })),
-      }
-    : expanded
+  const expanded = useDisclosureSet()
+  const narrowedOpen = useDisclosureSet((id) => tree.leads.has(id), q)
+  const disclosure = q ? narrowedOpen : expanded
```

---

#### Task 7-2 · The Band Head's One Tab Stop

**In Plain Terms:** Pressing Tab in a grouped table used to stop on every group's arrow and then its New Page button before reaching anything else. Now a group's head takes no Tab stops of its own: the list is one stop, the arrow keys move between rows, Enter folds a group, and the right-click menu, which already offers New Page, opens from the menu key. The arrow still folds the group on a click, the way the sidebar's does.

**What Leaves:** GroupBand's `<button className="group-band-drop-outline row-chevron">` and its `aria-label`; `group-band.css`'s nine-line `.group-band-drop-outline` rule; `table-view.css`'s `.table-shell .group-band-drop-outline` cursor rule and "the gutter chevron" in its section comment.

**What Arrives:**
- `<span className="row-chevron"><DisclosureChevron open={!collapsed} onToggle={toggle} /></span>`, the table's rail slot unchanged.
- `.group-band-head .row-chevron { display: inline-flex; color: var(--label-tertiary) }` in `group-band.css`, keeping Cards' chevron muted and centered where the button did; inside a table, `table.css` already mutes it.
- `tabIndex={-1}` on the New Page button.
- The tests that clicked `.group-band-drop-outline` (`bandDrops.test.tsx` ×3, `bandCommits.test.tsx` ×2, `bandZone.test.tsx`) dispatch a click on the head's `[data-chevron]`.

**Pins:**
- **The head's Tab stops** (`bandZone.test.tsx` › "a band head holds no Tab stop: Tab from a head passes its chevron and New Page by"): with `GroupBand.tsx` reverted to the 7-1 head, the pin read `expected [ <button …(3)>…(1)</button>, …(1) ] to deeply equal []`, the chevron button and New Page found inside a head; restored, green.

**Key Hunks:**

```diff
-          <button
-            type="button"
-            className="group-band-drop-outline row-chevron"
-            onClick={toggle}
-            aria-label={collapsed ? 'Expand group' : 'Collapse group'}
-          >
-            <DisclosureChevron open={!collapsed} />
-          </button>
+          <span className="row-chevron">
+            <DisclosureChevron open={!collapsed} onToggle={toggle} />
+          </span>
```

```diff
               className="group-band-add"
+              tabIndex={-1}
               onClick={() => bands.add(set.key)}
```

---

#### Task 7-3 · One Indent Step and One Lead Cell

**In Plain Terms:** Rows step in by one shared 14-pixel step wherever they nest: the table, the Trash and Archive table, and the sidebar. The first cell of a row, with the narrow strip to its left where the drag grip or checkbox appears, is now built by one piece that all three kinds of row use, so the "New Page" row that appears on hover gets that strip too and the pointer no longer loses the row when it drifts into it.

**What Leaves:** `UIX/Table/RowRail.tsx`; the `--row-indent` alias in `table-tokens.css`; the never-set `--disclosure-rail-x` fallback and `RAIL_CENTER_X` in `disclosure.css.ts`; `rowLead`'s numeric arithmetic and `MenuRows.tsx`'s `DISCLOSURE_INDENT` import, with `DISCLOSURE_INDENT`'s export; `.bundle-title`'s `marginLeft`; three hand-built lead cells and DataRow's grid-cell lint suppression, which the spread handlers made inert.

**What Arrives:**
- `UIX/Table/RowLead.tsx`: `RowLead({ indent, slotted, ...cell })` draws the `data-cell cell-lead` div, the click-swallowing gutter, what the rail slot holds, and the content, with `indent` as the cell's left padding.
- `rowIndent` reads `--disclosure-indent`; `rowLead` is `` `calc(${INDENT_BASE}px + ${rowIndent(depth)})` ``, so the sidebar's row padding and `menuDropLine` step through the one token.
- DataRow's lead cell passes `memberIndent` when left-aligned and the grip as `slotted`; GhostRow's passes `memberIndent` with no slot; BundleRowView's passes `calc(var(--cell-padding-x) + rowIndent(depth))` and the checkbox, the padding standing where the title's margin did, so a nested row's chevron still rides its indent.
- `BundleTable.test.tsx` reads the indent from the lead cell's padding; `sidebarDnd.test.tsx`'s `indentAt` reads `menuDropLine`'s string rather than appending `px`.
- `railRow` keeps its own 18px clearance, as the log's Rejection holds.

**Pins:** none named.

**Key Hunks:**

```diff
-/** How far a row at `depth` steps in from its lead, by the table's `--row-indent`. */
-export const rowIndent = (depth: number): string => `calc(var(--row-indent) * ${depth})`
+/** How far a row at `depth` steps in from its lead, by the one `--disclosure-indent` step. */
+export const rowIndent = (depth: number): string => `calc(var(--disclosure-indent) * ${depth})`
```

```diff
-          <div
-            key={c.id}
-            className={cx('data-cell', 'ghost-worn', i === 0 && 'cell-lead')}
-            style={i === 0 ? { paddingLeft: padLeft } : undefined}
-          >
+          return i === 0 ? (
+            <RowLead key={c.id} className="ghost-worn" indent={padLeft}>
+              {title}
+            </RowLead>
+          ) : (
```

```diff
-      <div className="data-cell cell-lead">
-        <RowRail />
-        <span className={cx('row-check', revealTarget)}>
+      <RowLead
+        indent={`calc(var(--cell-padding-x) + ${rowIndent(depth)})`}
+        slotted={
+          <span className={cx('row-check', revealTarget)}>
```

---

#### Task 7-4 · The Navigation Trees

**In Plain Terms:** Hide Disclosure Chevrons now reaches the sidebar and the Grouping pane's folder list through one switch on the whole window, and its caption names them; the Filter pane's Location list keeps its chevrons, since clicking a row there picks a folder and the chevron is what opens one. The Grouping and Location lists now look alike: folders without subfolders sit flush where an arrow would be, and the Location list shows folders in the order the view's grouping uses.

**What Leaves:** `sidebar.css`'s two `.hide-chevrons .row` rules and `--sidebar-hidechevron-pad`; GroupFrame's `useSetting('hideChevrons')` read and its `useSetting` import; LocationField's `'spacer'` leaves; "the sidebar's chevron gutter" in the caption.

**What Arrives:**
- `navigationTree`, a marker class in `disclosure.css.ts`, with one rule: `.hide-chevrons ${navigationTree} :is([data-chevron], [data-chevron-spacer]) { display: none }`. The sidebar's `<nav>` and GroupFrame's folder `LineZone` wear it; LocationTree, the bands, the Trash and Archive table, PropertyFrame, the Outline, and the autocomplete don't, and keep their chevrons.
- The caption reads "Collapse the sidebar's and Grouping pane's chevron gutter."
- Grouping's `'none'` leaf gutter is the one both pane trees keep: Behavior Change 21 names it, and a flat list of Sets stays flush where nothing discloses. The sidebar's leaves, the Outline, and the autocomplete keep `'spacer'`.
- `orderSetTree` is generic over any `{ id, sets? }` tree; `ViewPane`'s filter case hands `FilterFrame` the view's Sets ordered by `viewSetOrder(groupPlan(…), view)`, the rule the bands and the Grouping list read. `FilterFrame` and `LocationField` stay view-free, since the Matrix and Preview Rules filters mount them without a view.

**Pins:** none named.

**Key Hunks:**

```diff
+export const navigationTree = style({})
+globalStyle(`.hide-chevrons ${navigationTree} :is([data-chevron], [data-chevron-spacer])`, {
+  display: 'none',
+})
```

```diff
-.hide-chevrons .row > span:has(> [data-chevron]),
-.hide-chevrons .row > span:has(> [data-chevron-spacer]) {
-  --chevron-gutter: 2px;
-  width: var(--chevron-gutter);
-  min-width: var(--chevron-gutter);
-  overflow: hidden;
-  margin-right: calc(var(--chevron-gutter) - 6px - var(--sidebar-hidechevron-pad));
-}
-.hide-chevrons .row {
-  margin-left: var(--sidebar-hidechevron-pad);
-}
```

```diff
-    case 'filter':
+    case 'filter': {
+      const order = viewSetOrder(groupPlan(view, schema, presentedKind(view.type).nests), view)
       return (
         <FilterFrame
           key={view.id}
-          locations={source.sets ?? []}
+          locations={order?.length ? orderSetTree(source.sets ?? [], order) : (source.sets ?? [])}
```
