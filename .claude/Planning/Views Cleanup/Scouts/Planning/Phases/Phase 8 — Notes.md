#### Phase 8 — Notes

**Commit:** `ae57003e8` on `vc-p8`, parent `a7bf39dfe` · Task 8-1 `fcd3b8926` · Task 8-2 `b27baf815` · Task 8-3 `ae57003e8`

**Patch:** `Phase 8a — One View List Row.patch` · `Phase 8b — The Tile's Own Pieces.patch` · `Phase 8c — Renderers Declare.patch`

**Delivers:** D-1 (its view-name clause, as the surface holding the rename), F-4, F-5; Investigation 3.2, 8.1–8.5; Behavior Change 20

**Measures at the Phase Head:** Actionable from `cae07c129` =🔴-397=(=🟢+2717=/=🔴-3114=); the phase's own, from `a7bf39dfe`, =🟢+54=(=🟢+400=/=🔴-346=) — Task 8-1 +67 (+176 / −109), Task 8-2 −24 (+196 / −220), Task 8-3 +11 (+48 / −37), tests excluded · Comments 3,495 (3,495 at the parent, 3,517 at BASELINE) · Tests 9,260 passed, 2 skipped

---

#### Task 8-1 · One View List Row

**In Plain Terms:** The views dropdown in the toolbar and the list inside a view tile each drew their rows and handled their right-click menus with their own copies of the same code. Both now draw one shared row and run one shared menu handler, and duplicating or deleting a view follows one set of rules for naming the copy, placing it, and keeping the last view. Each place still asks its own confirmation, animates its own way, and undoes its own way, and only a tile switches to a copy it just made.

**What Leaves:** both surfaces' `switch` over `viewRowMenuItems`; ViewFrame's `commitRename` and its row's inline `MenuItem` + `RenamableLabel`; the tile's `viewLabel` helper and its dropdown's inline `MenuItem` rows; the duplicate's hand-written `freeName` + `mintViewId` splice in `viewsFile.ts` and `ViewTile.tsx`; the four spelled-out `> 1` / `<= 1` last-view checks.

**What Arrives:**
- `runViewRowAction(ctx, view, anchor, { rename, save, duplicate, remove, titles? }, pop = popMenu)` in `Actions/viewMenus.ts`: it pops `viewRowMenuItems(ctx)` and runs the pick, so neither surface builds the row menu; the tile passes its held `popHeld`.
- `ViewListRow({ view, picked, rename, onCommit, onSwitch, onMenu, trailing?, tabIndex? })` in `Views/Settings/ViewFrame.tsx`, beside the list it draws (no import cycle: nothing under `Core/Views` reaches `Core/Tiles`); `rename` is `Omit<NameRename, 'path'>`, D-1's surface-held shape, and each surface keeps its renaming id since the tile reads it to hold its strip open.
- `canDeleteView(count)` and `insertDuplicate(list, at, names, copy)` in `Views/views.ts`, used by `viewsFile.ts` and the tile.

**Pins:** none named.

**Key Hunks:**

```diff
+  switch (await pop(viewRowMenuItems(ctx))) {
+    case 'rename':
+      return run.rename()
+    case 'icon':
+      return chooseIcon(anchor, view.icon, (icon) => run.save({ icon }))
```

```diff
-    views.splice(at + 1, 0, { ...src, id: mintViewId(), name: freeName(names[at], names) })
+    insertDuplicate(views, at, names, (fresh) => ({ ...src, ...fresh }))
```

---

#### Task 8-2 · The Tile's Own Pieces

**In Plain Terms:** The view tile's file mixed how it looks with the bookkeeping of its saved views; the bookkeeping now lives in its own file beside the tile code, the way the main pane's lives beside its views. A locked tile's view pill and list row no longer start a rename that would quietly go nowhere. The pills' entrance animation uses the shared entrance helper, and the main pane's collection and set views find themselves the way a Space does.

**What Leaves:** `usePillPresence` and the render-time `presence.deleteView.current` assignment; `persistConfig` and `writeConfig`; `coerceEmbeddedView`, `configIdOf`, `embedViewIds`, `rawViews`, `rawActive`, and the six list ops' `mutateEntry` closures from `ViewTile.tsx`; `ContentView`'s two find-plus-placeholder arms; `useLatest` and `moveBefore` from the tile's imports; the `(raw) => EntryPatch | null` shape spelled in `MutateEntry` and `patchTileEntry`.

**What Arrives:**
- `Core/Tiles/viewTileEntry.ts`: `embedViewIds`, `embeddedViews(els, entryId)` (the coerced list the tile draws and a duplicate names from), and the ops `writeView`, `addView`, `duplicateView`, `deleteView`, `moveView` as `EntryOp`s; `restoreView` is the op `deleteView` hands its caller for the undo.
- `EntryOp` in `tiles.ts` beside `EntryPatch`, carrying `MutateEntry`'s comment; `MutateEntry` and `patchTileEntry` take it.
- The tile's `editViews(op)`, the one lock gate every direct list edit passes, and `saveView(id, patch)` for a pill's or row's name, icon, or color; the scope's `persist` writes `writeView` ungated, as before.
- `useEntrance(views, (v) => v.id)` and `exiting` held in the tile, settled by `useSettleFallback` on the exiting pill's `animationend`.
- `onBegin={locked ? undefined : …}` on the pill's label and the dropdown row's.
- `ContainerView({ tree, kind, id })` owns its lookup and its "Collection not found" / "Set not found" placeholder; `ContentView` has one `case 'collection': case 'set':` arm.
- `Core/Tiles/Surfaces/ViewTile.test.ts` → `Core/Tiles/viewTileEntry.test.ts`, following `embedViewIds`.

**Pins:** none named.

**Key Hunks:**

```diff
-  const persistConfig = (id: string, patch: ViewPatch): void => {
-    if (!locked) writeConfig(id, patch)
-  }
+  const editViews = (op: EntryOp): void => {
+    if (!locked) mutateEntry(entry.id, op)
+  }
+  const saveView = (id: string, patch: ViewPatch): void => editViews(writeView(entry.id, id, patch))
```

```diff
-                onBegin={() => setRenaming(v.id)}
+                onBegin={locked ? undefined : () => setRenaming(v.id)}
```

```diff
-  const presence = usePillPresence(views)
+  const entering = useEntrance(views, (v) => v.id)
```

---

#### Task 8-3 · Renderers Declare

**In Plain Terms:** A view tile used to look for the Table's and the Cards' own class names to know where to reveal its view strip on hover and how to scale what it shows, so a new kind of view would have silently shown at the wrong size with no reveal. Each view now marks the element that leads it, and each holds its own scale for when it sits in a tile, so the tile reads what a view declares. The tile still decides its own edge spacing.

**What Leaves:** `view-tile.css.ts`'s `.table-shell`, `.cards-view`, `.cards-grid`, `.set-cards-row`, `.group-band-row`, `.table`, and `.col-header` rules, and their `personalization` fallbacks; `resolvePeekAnchor`'s and `inPeekAnchor`'s `.table-head`, `.cards-view .card`, `.group-band-row`, and `.card` queries; the anchor comment naming the table and cards.

**What Arrives:**
- `ViewHost` sets `data-view-embed` on its root in a tile scope.
- `data-view-lead="head"` on the Table's heading; `data-view-lead="row"` on Cards' first card (the first Set card when Set cards show, else the first page card), through a `lead` prop on `SetCard` and `PageCard`.
- The tile anchors to the first `[data-view-lead]`: a `head` is a zone, a `row` the first row of cards, its hit test walking up to the row's level rather than naming `.card`.
- `table-view.css`: `[data-view-embed] .table-shell { --zoom: var(--view-embed-zoom) }`. `cards-view.css`: its zoom and bottom clearance, its grid and Set-row side padding, and its band row's lead padding under `[data-view-embed]`.
- The tile's body sets `--tile-inset-l` / `--tile-inset-r` (its heading pads), which Cards' padding reads; the tile keeps the heading's fill, divider, and first-segment alignment on `[data-view-lead="head"]`.
- Band rows declare nothing yet, since `GroupBand.tsx` is Phase 7's: a grouped Cards view with Set cards off reveals from its first card row rather than its first band row. `data-view-lead="head"` on GroupBand's `.group-band-row` restores the old rule exactly, the first declared lead in document order, and folds in at stacking.

**Pins:** none named.

**Key Hunks:**

```diff
-  const head = body.querySelector('.table-head')
-  if (head) return { kind: 'zone', el: head }
-  const first = body.querySelector<HTMLElement>('.cards-view .card')
-  if (!first) return null
-  const band = body.querySelector('.group-band-row')
-  if (band && band.compareDocumentPosition(first) & Node.DOCUMENT_POSITION_FOLLOWING)
-    return { kind: 'zone', el: band }
+  const first = body.querySelector<HTMLElement>('[data-view-lead]')
+  if (!first) return null
+  if (first.dataset.viewLead !== 'row') return { kind: 'zone', el: first }
```

```diff
-    <div style={scale === 1 ? undefined : { zoom: scale }}>
+    <div data-view-embed={tile ? '' : undefined} style={scale === 1 ? undefined : { zoom: scale }}>
```

```diff
+[data-view-embed] .table-shell {
+  --zoom: var(--view-embed-zoom);
+}
```
