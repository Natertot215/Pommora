#### Phase 5 — Notes

**Commit:** `783d250a5` on `vc-chain`, parent `218fff078` · Task 5-1 `ea7edecc7` · Task 5-2 `2ee2678b4` · Task 5-3 `783d250a5`

**Patch:** `Phase 5a — One Rename Shape.patch` · `Phase 5b — The Seat and the Ghost.patch` · `Phase 5c — One Item API.patch`

**Delivers:** B-2, D-1, D-2, I-040; Investigation 2.1–2.9, with 2.10 out of scope as written

**Measures at the Phase Head:** Actionable from `cae07c129` =🔴-395=(=🟢+2166=/=🔴-2561=); the phase's own, from `218fff078`, =🔴-70=(=🟢+432=/=🔴-502=) — Task 5-1 +4 (+170 / −166), Task 5-2 −25 (+107 / −132), Task 5-3 −49 (+191 / −240) · Comments 3,498 (3,511 at the phase's parent, 3,517 at BASELINE) · Tests 9,261 passed, 2 skipped · The host's return: 41 fields at the parent, 44 after 5-1, 43 after 5-2, 38 after 5-3

---

#### Task 5-1 · One Rename Shape

**In Plain Terms:** A page's name used to be edited three different ways depending on where you were: the Table kept its own private editing state, Cards borrowed the app-wide rename claim, and tabs and windows had a third small component. They now share one renaming piece, and inside a view the view itself remembers which row is being named. A new page's name field opens the moment you create it, keyed to the page's id, and appears with its row instead of a beat later; a Set band's menu New Page now creates the same way the band's own button does.

**What Leaves:** `RenamablePageName` and `PageNameRename`; `submitRename`'s read of `renamingCreate`; the Table's `renaming` state, its stranded-edit effect, and its own `mutate({ op: 'rename' })`; the `rename` slot in the interactions policy and the creation config; Cards' `beginRename`/`renamingPath` subscriptions, its `namingRow`/`titleRow` swap, and its fence claim; `ViewCreationConfig`'s 17-key `Pick` and the second `flattenContainer` in `orderPatch`; `DetailTitleHeader`'s `onRename` prop and the `submitRename` subscriptions in `Banner` and `PageHeader`; `CardTitle`'s separate `OverScroll` branch; `RenameHost`'s `'detail'`.

**What Arrives:**
- `RenamableName({ title, kind, rename, create?, className, renames?, autoSize?, children? })` over `NameRename { path, editing, onBegin?, onEnd }`; `kind` is `RenameKind`, since the detail header renames the homepage too.
- `submitRename(path, kind, newName, fromCreate?)`; the fence's `RenamableTitle` passes `renamingCreate`.
- Tabs, page windows, and `DetailTitleHeader` (now `path` and `kind` props) mount `RenamableName`.
- `useViewHost` returns `naming: { id, create } | null`, `beginNaming(id, flight?)`, and `endNaming()`, holding the ids of creates in flight beside it; a naming whose row isn't in `rowById` clears only once its flight has resolved, so a refused or filtered-away create settles by the same rule.
- `createPageIn` calls `c.beginNaming(req.id, flight)` in the gesture's tick, before the reply.
- The Table's title cell and Cards' card title mount `RenamableName` reading `host.naming`; Cards keeps one label mounted at rest and in edit, so a commit holds its new title until the push.
- `showEntityMenu(target, trigger, createPage?)`; `GroupBand` passes `() => bands.add(set.key)`, so a Set band's menu New Page rides the view's seeds, order, and naming; New Sub-Set stays on `createNamed(req, 'band')`.
- `RenameHost` is `'band' | 'sidebar' | 'matrix'`, `RENAME_RANK` unchanged in rank.
- `CardTitle` renders one `span` in every mode, the scroll mode wearing `overScrollLabel`, so the title's label isn't remounted when naming ends.

**Pins:** `cellGestures.test.tsx` · "a create opens its name field on the newborn's row, empty, before the reply": New Page Below from the title menu with the reply held, the newborn's row landed, and the input under `[data-rid=<minted id>]` read empty. Red run: `beginNaming` moved into `flight.then(...)`; the pin and Cards' changed create test both failed with `expected undefined to be ''`, then the line was restored.

**Key Hunks:**

```diff
     const flight = mutate(req)
+    c.beginNaming(req.id, flight)
     patchSeedValues(
```

```diff
     const path = flight.then((done) => {
       const created = done?.created
-      const landed = created && 'path' in created ? created.path : null
-      if (landed !== null) cfg().rename({ id: req.id, path: landed })
-      return landed
+      return created && 'path' in created ? created.path : null
     })
```

```diff
+  const [naming, setNaming] = useState<{ id: string; create: boolean } | null>(null)
+  const [flights, setFlights] = useState(NO_FLIGHTS)
+  const strandedId =
+    naming !== null && !rowById.has(naming.id) && !flights.has(naming.id) ? naming.id : null
```

```diff
-      const req = createdRequest(creators, action)
-      if (req) void createNamed(req, target.host)
+      const req = createdRequest(creators, action)
+      if (req?.op === 'createPage' && createPage) createPage()
+      else if (req) void createNamed(req, target.host)
```

---

#### Task 5-2 · The Seat and the Ghost

**In Plain Terms:** Each view used to wire its own value editor to its own hover ghost by hand, with slightly different rules for when the ghost should hide. The shared view logic now owns both, with one rule: no ghost while a value or a name is being edited. When you click the ghost to create a page, the ghost now holds its spot until the new row arrives, so the Table no longer briefly shrinks by a row; Cards already did this on its own and now uses the shared version.

**What Leaves:** the host's `seatHost`; each renderer's `useValueSeat` call and `suppressed` closure; the Table's render guard on the ghost; Cards' `pendingSeat`, `ghostSeat`, its inline-editor stand-down effect, its `anyNaming` gate on the ghost's FLIP, and its own `ghostCreate`; the interactions' `standingFlight` ref and `ghostCreate` return; the six hand-spelled `data-ghost-root` plus enter/leave sets.

**What Arrives:**
- `useViewInteractions` calls `useValueSeat` and returns `seat`; the policy carries `seat` options (Table: `anchor`, `onClose`; Cards: `commit`, `anchor`, `centered`, `hide`, `add`).
- The ghost's suppression reads `pickOpen`, `glanceShown`, `seat.open !== null`, and `host.naming !== null`.
- One `held` create covers both the anchored and the standing ghost; the hook returns `ghostAt`, `ghostClosing`, and `ghostRootProps`.
- `ghostRootProps(api)` in `UIX/Interactions/ghostCreate.ts` beside `ghostAnchorProps`; `Sidebar`, `PropertyPanel`, `GhostOptionChip`, `TileGrid`, and both renderers spread it.
- `Core/Views/manualOrderDrops.test.tsx` → `Core/Views/Host/rowDrops.test.tsx`, imports re-pointed.
- `cardCreation.test.tsx`'s inline-field case presses before it clicks, as a real click does; the stand-down it asserts is now the capture-phase press clear plus the seat's suppression.

**Pins:** None named.

**Key Hunks:**

```diff
+  const [held, setHeld] = useState<{ anchorId: string | null; id: string } | null>(null)
+  const ghostCreate = (): void => {
+    if (held) return
+    const anchorId = ghost.take()
+    const anchor = anchorId ? rowById.get(anchorId) : undefined
+    if (!anchor && !ghostStanding) return
+    const flight = anchor ? creation.createAfter(anchor) : creation.createFirst()
```

```diff
-        if (itemsVisible && ghost?.anchorId === row.id && !open && !host.naming)
+        if (itemsVisible && interactions.ghostAt === row.id)
```

---

#### Task 5-3 · One Item API

**In Plain Terms:** The shared view logic used to hand each view a long list of things, several of which no view read, and each view then repackaged the same click, menu, and edit handlers under its own names. The list is now only what views read, and both views receive one bundle of item handlers with one name each. Cards draws page and Set icons the same way the Table does, and a Table row re-renders on selection only when it is the row selected or deselected.

**What Leaves:** `tree`, `mutate`, `openTarget`, `schema`, `effectiveValues`, and `setValueOverride` from the host's return; `RowCellApi`, `CardApi`, and their two `useStableApi` builds; Cards' `defaultIcons` subscription and the `iconName`/`defaultIcons` props through `GhostCard`, `SetCard`, `SetFace`, `CardFace`, `OverlayFace`, and `PageCard`; the Table's root `selection` subscription and `selected` prop; `useColumns`' own hide write; `fillsBlank` and its test block; the callback refs; the Table's second `hide_page_icons` read; `openPage`, `openSet`, and `pageMenu` on the interactions' return.

**What Arrives:**
- `ItemApi` in `useViewInteractions.tsx` and one `useStableApi` build, `interactions.item`, which a renderer extends through `policy.item` (Table: `sweep`; Cards: `banner`).
- `pageMenu(row, e, anchor?, editImage?)` defaults and stops the event; the Table's title cell and grip pass `titleGlyph(...)`, Cards its text block.
- The Table's `DataRow` draws the title cell itself from a `naming` prop, opens the page from a title click, reads its own selection, and edits a value from `editingCol`.
- The host returns `overrideValues(pageId, picked, write)` in place of `setValueOverride`; creation lays its seeds through it.
- `viewRootRef` is `useRef<HTMLDivElement>(null)`; both renderers pass `ref={host.viewRootRef}`.
- Creation and the interactions read `ctx.schema`; the interactions read `openTarget`, and Cards `tree`, from the session.
- `useViewHost.test.tsx`'s refused-create case drops its `effectiveValues` read; `valueOverride.test.ts:90` already holds a refused write's override leaving.

**Pins:** None named.

**Key Hunks:**

```diff
+  const item = useStableApi<ItemApi & Own>({
+    click: seat.click,
+    menu: seat.menu,
+    pane: seat.pane,
+    editor: seat.editor,
+    openAdd: seat.openAdd,
+    commit: seat.host.commit,
+    open: openPage,
+    openSet,
+    hover: ghost.onHover,
+    pageMenu,
+    endNaming: host.endNaming,
+    ...policy.item,
+  })
```

```diff
 }): React.JSX.Element {
+  const selected = useSession((s) => s.selection.kind === 'page' && s.selection.id === row.id)
+  const pageMenu = (e: React.MouseEvent): void =>
+    void api.pageMenu(row, e, titleGlyph(e.currentTarget as HTMLElement))
   return (
```

```diff
-    setCollapsing(null)
-    void persistView(hideShown(view, collapsing))
+    setCollapsing(null)
+    host.hideProperty(collapsing)
```
