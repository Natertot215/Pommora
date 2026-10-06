## Ghost Tiles — Implementation Plan

### Context

Tile boards (the Homepage and each Space) create a tile through a right-click on the board's background. This plan replaces that with the hover ghost every view renderer, the sidebar, and the option lists already run on: an unlocked board shows a ghosted "New Tile" in the empty space under the pointer, and clicking it opens an Insert Menu at the click. The mandate is `.claude/Planning/Ghost Tiles — Initial Decisions.md`; its *§Decisions* are settled and are not redesigned here.

The work touches the shared ghost hook (`UIX/Interactions/ghostCreate.ts`), the layout engine (`Core/Tiles/Layout/`), the grid and its host (`TileGrid.tsx`, `TileHost.tsx`), the menu door (`Core/Actions/`, `MenuPresenter.tsx`), the Markdown table's add strip (its look moves into the kit), the create channel (`bridge.ts`, `handlers.ts`, `tilesFile.ts`), the tile menu model (`tileHandleMenu.ts`, `tiles.ts`), and the Tiles stylesheets. It leaves alone the convert channel and its file discard, the handle's own right-click menu, view-tile menus, the drag and resize gestures, `Desktop/`, and the log's *§Prospects*.

### Summary

Resting the pointer in a gap under a shorter tile raises a dimmed "New Tile" box exactly where a tile would land. Under the board's last row sits a thin "+" strip, the one a Markdown table uses to add a row, which appears the moment the pointer nears the board's bottom edge. Clicking either opens a three-row menu at the click (New Page, Link Page, Link View); the box or strip stays lit while the menu is open, the box fades if the menu is dismissed, and the tile lands when a row is picked. An empty board shows the box permanently. Right-click on the background does nothing.

Three things change beyond the board's own surface: every ghost in the app starts its timer only on a real pointer move, so scrolling content under a resting pointer raises nothing; a linked tile is created already linked, with no throwaway file; and the board's bottom edge eases when its height changes.

#### Constraints

- Gates: `npm run typecheck` · `npm run test` · `npm run lint`, from the repo root, each exiting 0; lint prints no `Found N warnings` line. Biome reformats every TS/CSS/JSON write, so an Edit failing on whitespace is re-read and retried.
- Commit with `git add <new files>` then `git commit --only -m "…" -- <paths>`; never a whole-tree command. Unattributed edits in adjacent files are Nathan's and are bundled, not reverted.
- No O(N), allocating, or layout-reading work on pointer move or scroll.
- `UIX` imports nothing outside itself; what `useGhostAnchor` gains serves every consumer, with no tile-only branch.
- `TileGrid` stays host-agnostic: it imports nothing from `tiles.ts`, `TileHost.tsx`, or `tileHandleMenu.ts`. `TileHost` owns the menu and every write.
- Every tile write goes through a `tiles:*` channel declared once in `Core/Contract/bridge.ts` and answers with the landed document. The host-run half of Core imports no React.
- The ghost is never a leaf of `layout` or `draft`.
- The Insert Menu's row order is read from `TILE_KINDS.markdown.menuRows`; no second list of those rows exists.
- No comments beyond the ones this plan writes. No guard for a state nothing produces.
- Never delete: the handle's `onContextMenu` and its `biome-ignore` in `TileShell`; `Surfaces/ViewTile.tsx`'s menus and ignores; `dropSlot`, `.tile-placement`, `.drop-slot`; `boardStatic` and the `.is-static` rules; `computeGeometry`; `tiles:convert`, `convertTile`, and `reviseTile`'s file discard; `GhostSuppress`, `suppressWrap`, `useClearStrandedGhost`; `mintSeed`.
- Out of scope: the log's *§Prospects*; a programmatic close for a presented menu; a pick-time recheck of a per-tile lock.
- A task's BEFORE names where the change sits; the file on disk is the full text. A task's AFTER is the code as it must read.

#### Baseline

Recorded 10-05-2026 at `2d0526bb9` on `active`. Execution began from `ffbb04d72`, the other session's Contexts commit landed on top of it, which touches no file this plan names; the diff range is `ffbb04d72..HEAD`.

- Gates: green at `2d0526bb9` — `npm run typecheck` exit 0 · `npm run lint` "Checked 1409 files. No fixes applied." exit 0 · `npm run test` 515 files, 7241 passed, 2 skipped, exit 0.
- `grep -rn "onBackdrop\|BackdropTarget\|onGridContextMenu" Core | wc -l` → 13 — retires to 0
- `grep -rn "CONVERTS" Core | wc -l` → 3 — retires to 0
- `grep -rn "createTile(" Core --include="*.test.ts" | wc -l` → 28 — unchanged in count, every call re-signed
- `grep -rn "useGhostAnchor(" Core UIX --include="*.tsx" --include="*.ts" | grep -v test | wc -l` → 4 — becomes 5 (`TileGrid.tsx`)
- `grep -c "mdpm-tbl-add" Core/MarkdownPM/markdown-tables.css` → 7 — becomes 5
- `npm run test` → 7241 passed, 2 skipped — rises by the tests this plan adds, less the one Task 3.1 replaces

**START:** `2026-10-05T23:10:22Z`
**END:** `2026-10-06T01:48:51Z`

#### Implementation Process

- [x] **Phase 1** — Removal
  - [x] Task 1.1
- [x] **Phase 2** — Kit And Layout Foundations
  - [x] Task 2.1
  - [x] Task 2.2
  - [x] Task 2.3
  - [x] Task 2.4
- [x] **Phase 3** — Create And Menu Models
  - [x] Task 3.1
  - [x] Task 3.2
- [x] **Phase 4** — Ghost Tiles
  - [x] Task 4.1
  - [x] Task 4.2
  - [x] Task 4.3
  - [x] Task 4.4
  - [x] Review Checkpoint (the live pass by hand open)

Between Phase 1 and Phase 4 a board has no way to create a tile; the phases run as one uninterrupted sequence.

---

### Phase 1 — Removal

**GOAL:** Right-click creation leaves the grid and the host entirely, so everything after it is designed against a board with no creation path rather than beside the old one.

#### Task 1.1

**TASK:** Delete the background right-click path: the grid's hit-test, its handler, its lint suppression, the target type, the prop on both sides, and the host's immediate create.

**FILES:** `Core/Tiles/TileGrid.tsx`, `Core/Tiles/TileHost.tsx`, `Core/Tiles/TileGrid.test.tsx`

**BEFORE**

- `TileGrid.tsx` — `import { findTile } from './Layout/model'`; `onBackdrop` in `TileGridProps` and in the destructure; `export type BackdropTarget`; `const onGridContextMenu = …` (the whole function); the `// biome-ignore lint/a11y/noStaticElementInteractions: a right-click affordance…` comment and `onContextMenu={onGridContextMenu}` on the grid div.
- `TileHost.tsx` — `import { TileGrid, type BackdropTarget } from './TileGrid'`; `const onBackdrop = useCallback(…)`; `onBackdrop={onBackdrop}`.
- `TileGrid.test.tsx` — `onBackdrop: () => {},` in the `grid` props object.

**CHANGE**

- [x] `TileGrid.tsx`: delete each item listed above. `TILE_MIN_PX` and `computeGeometry` stay imported; the resize and `gestureOrigin` use them.
- [x] `TileHost.tsx`: delete `onBackdrop` and its prop; the import becomes `import { TileGrid } from './TileGrid'`. `attachBelow`, `insertBand`, `NEW_TILE_H`, and `dialer` stay imported; duplicate and remove use them.
- [x] `TileGrid.test.tsx`: delete the stub line.

**AFTER**

```tsx
// TileGrid.tsx — the props end at onHandleMenu
interface TileGridProps {
  layout: TileLayout
  onLayoutChange: (layout: TileLayout) => void
  renderTile: (id: string) => React.ReactNode
  tileClassName: (id: string) => string | undefined
  editingId: string | null
  menuOpenId: string | null
  tileStyle: (id: string) => CSSProperties | undefined
  onBusyChange: (busy: boolean) => void
  locked: boolean
  isTileLocked: (id: string) => boolean
  onHandleMenu: (id: string, e: React.MouseEvent) => void
}

// TileGrid.tsx — `dropSlot` is followed directly by the return
  const dropSlot = tileDrag && draft ? placed.tiles.get(tileDrag.id) : null

  return (
    <div
      ref={gridRef}
      className={cx(
        'tile-grid',
        resizingId !== null && 'is-interacting',
        boardStatic && 'is-static',
      )}
      style={{ height: placed.totalHeight + BOTTOM_PAD_PX }}
    >
```

```tsx
// TileHost.tsx — `renderTile` is followed directly by the ready gate
  if (!ready) return null

  return (
    <div ref={rootRef} className={cx('tile-host', hostLocked && 'is-host-locked')}>
      <TileGrid
        layout={layout}
        onLayoutChange={setLayout}
        renderTile={renderTile}
        tileClassName={tileClassName}
        editingId={editingId}
        menuOpenId={menuOpenId}
        tileStyle={tileStyle}
        onBusyChange={setBusy}
        locked={hostLocked}
        isTileLocked={(id) => entries.get(id)?.locked ?? false}
        onHandleMenu={onHandleMenu}
      />
    </div>
  )
```

**VERIFY**

- [x] `grep -rn "onBackdrop\|BackdropTarget\|onGridContextMenu" Core` → no output.
- [x] `grep -n "onContextMenu" Core/Tiles/TileGrid.tsx` → one hit, inside `TileShell`'s handle.
- [x] Run the gates; lint reports no unused import and no stale suppression.

---

### Phase 2 — Kit And Layout Foundations

**GOAL:** The four pieces the board builds on, each green on its own and none of them tile-specific in the kit: the hook's move-armed enter, the layout engine's wedge derivation and seat, a click point through the menu door, and the add strip as a kit class.

#### Task 2.1

**TASK:** `useGhostAnchor` arms an entered anchor on the pointer's next move, so content scrolled or drawn under a resting pointer raises no ghost on any surface.

**FILES:** `UIX/Interactions/ghostCreate.ts`, `UIX/Interactions/ghostCreate.test.tsx`, `Core/Views/Cards/cardCreation.test.tsx`

**BEFORE**

- `ghostCreate.ts` — inside the `useState` factory: `let menusOpen = 0`, `clear`, `onHover`, `take`.

**CHANGE**

- [x] Split today's `onHover` body: the entering half becomes `enter`, run by `arrive` on the next `pointermove`; `onHover` records the entered anchor and returns. The leaving half is unchanged apart from forgetting an anchor left before the pointer moved.
- [x] `clear` and `take` drop the entered anchor first.
- [x] `ghostCreate.test.tsx`: add the `enter` helper below; replace every `await act(async () => api.onHover(<id>, true))` with `await enter(<id>)`, including the one inside `dwellOpen`. Add the tests listed under VERIFY.
- [x] `cardCreation.test.tsx`: `hover` follows an entering `pointerover` with a window `pointermove`.
- [x] Run `npm run test`; any other test that arms a ghost through a `pointerover` or `pointerenter` and now fails gains the same one-line move in its own hover helper.

**AFTER**

```ts
// ghostCreate.ts — inside the useState factory, under `let menusOpen = 0`
    // An entered anchor waits for the pointer's next move: content scrolled or drawn under a resting pointer delivers an enter and no move, and a real move delivers its enter first.
    let entered: string | null = null
```

```ts
// ghostCreate.ts — where `clear` and `onHover` stand today, after `armDwell`; `blocked`, `clearTimer`, `closeGhost`, `armDwell`, `onGhostEnter`, `onGhostLeave`, `closed`, and `suppressWrap` are unchanged
    const enter = (id: string): void => {
      clearTimer('dwell')
      clearTimer('grace')
      if (blocked()) return
      const hold = optsRef.current.travelHold
      const g = ghostRef.current
      if (hold && g && g.anchorId !== id && hold.inZone(id)) {
        clearTimer('exit')
        setGhost((cur) => (cur?.closing ? { ...cur, closing: false } : cur))
        timers.grace = window.setTimeout(() => {
          closeGhost()
          armDwell(id)
        }, hold.holdMs)
        return
      }
      if (g?.anchorId === id && g.closing) clearTimer('exit')
      setGhost((cur) => {
        if (cur?.anchorId === id) return cur.closing ? { anchorId: id, closing: false } : cur
        if (cur) return { ...cur, closing: true }
        return cur
      })
      armDwell(id)
    }
    const arrive = (): void => {
      const id = entered
      entered = null
      if (id !== null) enter(id)
    }
    const clear = (anchorId?: string): void => {
      entered = null
      clearTimer('dwell')
      clearTimer('grace')
      const g = ghostRef.current
      if (anchorId === undefined || g?.anchorId === anchorId) {
        clearTimer('exit')
        setGhost(null)
      }
    }
    const onHover = (id: string, entering: boolean): void => {
      if (entering) {
        entered = id
        window.addEventListener('pointermove', arrive, { once: true })
        return
      }
      if (entered === id) entered = null
      clearTimer('dwell')
      clearTimer('grace')
      timers.grace = window.setTimeout(closeGhost, optsRef.current.graceMs)
    }
```

```ts
// ghostCreate.ts — take gains one line
    const take = (): string | null => {
      entered = null
      // A dwell armed on a row crossed en route must not fire after the create.
      clearTimer('dwell')
```

```ts
// ghostCreate.test.tsx — beside `tick`
/** A real move onto an anchor: its enter, then the move that arms it. */
const enter = async (id: string): Promise<void> => {
  await act(async () => {
    api.onHover(id, true)
    firePointer(window, 'pointermove', { x: 0, y: 0 })
  })
}
```

```ts
// cardCreation.test.tsx
const hover = (el: HTMLElement, entering: boolean): void => {
  el.dispatchEvent(
    new MouseEvent(entering ? 'pointerover' : 'pointerout', {
      bubbles: true,
      relatedTarget: document.body,
    }),
  )
  if (entering) window.dispatchEvent(new MouseEvent('pointermove'))
}
```

**VERIFY**

- [x] New tests in `ghostCreate.test.tsx`, each red with the `ghostCreate.ts` change reverted:
  - an enter with no move arms nothing: `api.onHover('a', true)` → `tick(DWELL)` → `api.ghost` is null; then a window `pointermove` → `tick(DWELL)` → `{ anchorId: 'a', closing: false }`.
  - an anchor entered and left before any move never arms, and the anchor entered last does: `onHover('a', true)`, `onHover('a', false)`, `onHover('b', true)`, `pointermove`, `tick(DWELL)` → `anchorId: 'b'`; the same without the enter of `b` → null.
  - an anchor drawn under the pointer neither closes nor replaces a standing ghost: `dwellOpen('a')`, `onHover('b', true)` with no move → `api.ghost` stays `{ anchorId: 'a', closing: false }`.
  - `take()` after an enter with no move, then a `pointermove` and `tick(DWELL)` → null.
- [x] Every pre-existing test in both files passes unchanged in its assertions.
- [x] `grep -n "addEventListener" UIX/Interactions/ghostCreate.ts` → two hits: `pointermove` in `onHover`, `pointerdown` in the effect.
- [x] Over CDP on `~/Test`, in a Cards view tall enough to scroll: rest the pointer with `Input.dispatchMouseEvent` `mouseMoved`, wheel-scroll so a different card comes under it, wait 3s → no `.ghost-card`; one further `mouseMoved` → `.ghost-card` after the dwell. This is the premise the deferral rests on; if a ghost rises without the move, stop and report before the task is committed.
- [x] Run the gates.

#### Task 2.2

**TASK:** The layout engine owns the board's two metrics and gains two pure pieces: the wedge under each tile, and seating a new leaf. The duplicate's layout commit seats through the new op, so a duplicate whose source vanished lands as the last band.

**FILES:** `Core/Tiles/Layout/model.ts`, `Core/Tiles/Layout/rects.ts`, `Core/Tiles/Layout/ops.ts`, `Core/Tiles/Layout/rects.test.ts`, `Core/Tiles/tiles.ts`, `Core/Tiles/tilesFile.ts`, `Core/Tiles/TileGrid.tsx`, `Core/Tiles/TileHost.tsx`, `Core/Tiles/TileHost.test.tsx`, `Core/Tiles/README.md`

**BEFORE**

- `tiles.ts` — `export const NEW_TILE_H = 160`.
- `TileGrid.tsx` — `const GAP = 8` under the `// KNOB — grid gutter, …` comment, and every use of `GAP`.
- `TileHost.tsx` — in `duplicateTile`: `commitLayout((cur) => attachBelow(cur, id, r.value.id, getTile(cur, id)?.h ?? NEW_TILE_H))`.
- `rects.ts` — ends at `computeGeometry`. `ops.ts` — `insertBand` follows `attachBelow`.

**CHANGE**

- [x] `tiles.ts`: delete `NEW_TILE_H`; `seedBoard` imports it from `./Layout/model`. Every other importer re-points: `tilesFile.ts` and `TileHost.tsx` import it from `./Layout/model`. `grep -rn "NEW_TILE_H" Core` finds any other.
- [x] `TileGrid.tsx`: delete `const GAP = 8`; import `TILE_GAP` from `./Layout/model` and replace every `GAP` with it. The KNOB comment becomes `// KNOB — drop-band zone, snap radius, and the clearance under the last band.`
- [x] `model.ts`, `rects.ts`, `ops.ts`: add the code under AFTER.
- [x] `TileHost.tsx`: the duplicate commits through `seatBelow`, which replaces `attachBelow` in the `./Layout/ops` import.
- [x] `README.md` *§Module Map*: the `Layout/rects.ts` row reads "Tree → per-tile placements as shares of the board width, resolved to pixel rects, dividers, and band seams at a measured width; the wedge under each tile"; the `Layout/ops.ts` row's list gains "seat" after "band ops"; the `Layout/model.ts` row reads "Tree types, height derivation, lookup, and the board's two metrics".

**AFTER**

```ts
// model.ts — above `emptyLayout`
// KNOB — the gutter between tiles, and the height a tile with nothing to size it by takes.
export const TILE_GAP = 8
export const NEW_TILE_H = 160
```

```ts
// rects.ts — appended
/** Each tile with a wedge under it → the height a tile attached below it takes to land flush on its branch's floor. A row's shorter children end above the row's floor; only a column's last child inherits the room beneath the column. */
export function wedgeFills(layout: TileLayout, gap: number, minPx: number): Map<string, number> {
  const fills = new Map<string, number>()
  const walk = (node: LayoutNode, room: number): void => {
    if (node.kind === 'tile') {
      if (room - gap >= minPx) fills.set(node.id, room - gap)
      return
    }
    if (node.kind === 'row') {
      const h = nodeHeight(node, gap)
      for (const child of node.children) walk(child, room + h - nodeHeight(child, gap))
      return
    }
    node.children.forEach((child, i) => walk(child, i === node.children.length - 1 ? room : 0))
  }
  for (const band of layout.bands) walk(band.node, 0)
  return fills
}
```

```ts
// ops.ts — after `insertBand`; `NEW_TILE_H` joins the value import from './model'
/** A new leaf lands under `under` at height `h`, or as the board's last band when there is no tile or no height to seat it by. */
export function seatBelow(
  layout: TileLayout,
  id: string,
  under: string | null,
  h: number | undefined,
): TileLayout {
  return under === null || h === undefined
    ? insertBand(layout, layout.bands.length, id, NEW_TILE_H)
    : attachBelow(layout, under, id, h)
}
```

```ts
// TileHost.tsx — duplicateTile's landing
        if (!reportRefusal(r)) return
        commitLayout((cur) => seatBelow(cur, r.value.id, id, getTile(cur, id)?.h))
```

```ts
// rects.test.ts — fixtures for the new describes
const tile = (id: string, h: number): TileLeaf => ({ kind: 'tile', id, h })
const row = (...children: LayoutNode[]): LayoutNode => ({
  kind: 'row',
  ratios: children.map(() => 1 / children.length),
  children,
})
const column = (...children: LayoutNode[]): LayoutNode => ({ kind: 'column', children })
const board = (...nodes: LayoutNode[]): TileLayout => ({ bands: nodes.map((node) => ({ node })) })
const fills = (layout: TileLayout): Record<string, number> =>
  Object.fromEntries(wedgeFills(layout, 8, 64))
```

**VERIFY**

- [x] `describe('wedgeFills')` in `rects.test.ts`, with these exact expectations:
  - `board()` and `board(tile('a', 200))` → `{}`.
  - `board(row(tile('a', 200), tile('b', 100), tile('c', 160)))` → `{ b: 92 }`.
  - `board(row(tile('a', 200), tile('b', 128)))` → `{ b: 64 }`; with `b` at 129 → `{}`.
  - `board(row(column(tile('a', 100), tile('b', 50)), tile('c', 300)))` → `{ b: 134 }`.
  - `board(column(row(tile('a', 100), tile('b', 200)), tile('e', 100)))` → `{ a: 92 }`.
  - `board(row(column(tile('x', 50), row(tile('a', 100), tile('b', 60))), tile('c', 400)))` → `{ a: 234, b: 274 }`.
  - `board(column(column(tile('a', 100), tile('b', 100)), tile('c', 100)))` → `{}`.
  - `board(row(tile('a', 100), tile('b', 200)), tile('c', 100))` → `{ a: 92 }`.
  - `wedgeFills(stackLayout(x), 8, 64).size` is 0 for every fixture above.
  - The invariant, looped over every fixture and every `[id, fill]` it yields: with `next = attachBelow(x, id, 'n', fill)`, `placeTiles(next, 8)` gives every original tile a placement deep-equal to its placement in `placeTiles(x, 8)`, equal `seams` and `totalHeight`, and `n` at `{ x: p.x, y: p.y + p.h + 8, w: p.w, h: fill }` for `p` the placement of `id`; `wedgeFills(next, 8, 64).has(id)` is false.
- [x] `TileHost.test.tsx`: a duplicate whose source left the layout before its reply lands the copy as the last band — stub `tiles:duplicateTile` to resolve after the test removes the source's leaf through a `tiles:changed` reload, then expect the saved layout to hold the new id as its final band and no entry without a leaf.
- [x] `grep -rn "NEW_TILE_H" Core/Tiles/tiles.ts` → the import and `seedBoard`'s use only. `grep -n "\bGAP\b" Core/Tiles/TileGrid.tsx` → no output.
- [x] Run the gates; `Core/Contract/engineGraph.test.ts` passes.

#### Task 2.3

**TASK:** A menu can hang from a click point: one optional `at` on `MenuOptions`, read by both renderers. The trigger element is still passed, for dismissal and window scoping.

**FILES:** `Core/Actions/menuModel.ts`, `Core/Actions/menuActions.ts`, `Core/Interface/Menus/MenuPresenter.tsx`, `Core/Actions/menuActions.test.ts`

**BEFORE**

- `menuModel.ts` — `export interface MenuOptions`.
- `menuActions.ts` — the `anchor:` line inside `dialer().ask('menu', …)`.
- `MenuPresenter.tsx` — `<PickerMenu open={pending !== null} … triggerRef={triggerRef} origin="center"`. A point-anchored menu opens from its left edge, as the system menu does at a click; a trigger-anchored one stays centered.

**AFTER**

```ts
// menuModel.ts
export interface MenuOptions<A extends string = string> {
  solid?: boolean
  stay?: (action: A) => readonly ActionItem<A>[]
  compact?: boolean
  /** A viewport point the menu hangs from in place of its trigger's box. */
  at?: { x: number; y: number }
}
```

```ts
// menuActions.ts
  if (!trigger || useSession.getState().devicePrefs.nativeMenus) {
    const box = trigger?.getBoundingClientRect()
    const at = options?.at
    const res = await dialer().ask('menu', {
      items,
      anchor: at
        ? { left: at.x, top: at.y, height: 0 }
        : box && { left: box.left, top: box.top, height: box.height },
    })
    return valueOr(res, null) as A | null
  }
```

```tsx
// MenuPresenter.tsx
    <PickerMenu
      open={pending !== null}
      onDismiss={() => pending?.settle(null)}
      triggerRef={triggerRef}
      anchorX={shown?.at?.x}
      anchorY={shown?.at?.y}
      origin={shown?.at ? 'left' : 'center'}
      solid={shown?.solid}
    >
```

**VERIFY**

- [x] Two new tests in `menuActions.test.ts`: with `nativeMenus` on, `popMenu(items, trigger(), { at: { x: 40, y: 60 } })` asks with `anchor` equal to `{ left: 40, top: 60, height: 0 }`; with it off, the same call reaches `presented` with `calls[0][2]?.at` equal to `{ x: 40, y: 60 }`.
- [x] Every existing test in the file passes untouched.
- [x] Run the gates.

#### Task 2.4

**TASK:** The bordered "+" strip a Markdown table adds a row or column with becomes a kit class, so the board's add strip is the same control rather than a copy of its rules. The table's look does not change.

**FILES:** `UIX/Interactions/ghost-create.css`, `Core/MarkdownPM/markdown-tables.css`, `Core/MarkdownPM/Tables/MarkdownTable.tsx`, `.claude/Features/PommoraUIX.md`

**BEFORE**

- `markdown-tables.css` — the `.mdpm-tbl-add { … }` rule and `.mdpm-tbl-add:hover { … }`.
- `MarkdownTable.tsx` — `cx('mdpm-tbl-add mdpm-tbl-add-col', revealTarget)` and `cx('mdpm-tbl-add mdpm-tbl-add-row', revealTarget)`.

**CHANGE**

- [x] `markdown-tables.css`: delete the `.mdpm-tbl-add { … }` and `.mdpm-tbl-add:hover { … }` rules. The bridge rule `.mdpm-tbl-add::before` with its comment, and the `-col` / `-row` rules, stay.
- [x] `ghost-create.css`: append the rules under AFTER.
- [x] `MarkdownTable.tsx`: both buttons gain the `add-strip` class.
- [x] `ghost-create.css`: the head comment becomes `/* The create affordances' shared chrome lives here once rather than in each surface: the ghost's dim, lift target, and timing, and the add strip. */`
- [x] `PommoraUIX.md`: the Drop chrome row becomes ``| Drop chrome  | `DropLine` · `DragGhost` · `.drop-slot` · `.add-strip` · `drop-chrome.css` · `ghost-create.css` | The insertion line, dot, the landing slot, the glass drag chip, and the add strip a table and a board extend by. |``

**AFTER**

```css
/* ghost-create.css — appended */
/* The bordered "+" strip a surface is extended by: a table's row and column, a board's bottom row. Its host positions it and reveals it. */
.add-strip {
  position: absolute;
  z-index: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  border: var(--width-150) solid var(--border-base);
  border-radius: 4px;
  background: none;
  color: var(--label-tertiary);
  --reveal-fade: var(--duration-base);
  transition:
    opacity var(--reveal-fade) var(--ease-base),
    background var(--duration-base) var(--ease-base);
}
.add-strip:hover,
.add-strip[data-reveal-held] {
  background: var(--state-hover);
}
```

```tsx
// MarkdownTable.tsx
        className={cx('add-strip mdpm-tbl-add mdpm-tbl-add-col', revealTarget)}
// …
        className={cx('add-strip mdpm-tbl-add mdpm-tbl-add-row', revealTarget)}
```

**VERIFY**

- [x] `grep -n "mdpm-tbl-add {" -A2 Core/MarkdownPM/markdown-tables.css` → no output; `grep -c "mdpm-tbl-add" Core/MarkdownPM/markdown-tables.css` → 5: the bridge, its two positional halves, and the two positional rules.
- [x] Over CDP on `~/Test`, a Markdown table's Add Row and Add Column strips have the same `getComputedStyle` `border`, `borderRadius`, `color`, and hovered `backgroundColor` as at the baseline commit.
- [x] Run the gates.

---

### Phase 3 — Create And Menu Models

**GOAL:** The host can create a tile already linked to its source in one write, and the two tile menus share one definition of their link rows. Both are host- and model-side; nothing draws yet.

#### Task 3.1

**TASK:** `tiles:create` takes an optional `TilePick` in place of a type. With none it makes a blank Markdown Tile; with one it makes the entry a convert would, with no file written and nothing sent to trash. Create and convert resolve a pick through one function.

**FILES:** `Core/Contract/bridge.ts`, `Core/Tiles/handlers.ts`, `Core/Tiles/tilesFile.ts`, `Core/Tiles/tiles.ts`, `Core/Tiles/tilesFile.test.ts`, `Core/Tiles/handlers.test.ts`, `Core/Nexus/fileEvents.test.ts`, `Core/Nexus/mutate.test.ts`, `Core/Nexus/cascade.test.ts`, `Core/Index/indexMaintenance.test.ts`

**BEFORE**

- `tilesFile.ts` — the comment `// A kind is created directly when its bare seed is a whole entry; …` and `createTile(dir, type)`; `const CONVERTS`; `convertTile`'s `const patch = isPlainObject(pick) && isKeyOf(CONVERTS, pick.kind) ? … : fault('Invalid pick.')`.
- `handlers.ts` — `'tiles:create': withWriteRoot(async (root, _ctx, host: unknown, type: unknown) => …`.
- `bridge.ts` — `'tiles:create': { args: [host: TileHostRef, type: TileType] … }`.
- `tiles.ts` — `/** What a convert into each kind is given; … */` above `TilePick`.
- `tilesFile.test.ts` — the test `'creates only a kind whose bare seed is a whole entry, and writes nothing for the rest'`.

**CHANGE**

- [x] `tilesFile.ts`: delete `createTile`'s `type` parameter, its `knownTile({ id, type })` seed, and the "can't be created" refusal. Rename `CONVERTS` to `PICK_ENTRIES` and move it, both arms verbatim, above `createTile`. Hoist the pick resolution out of `convertTile` into `pickEntry`. `TILE_KINDS` and `knownTile` stay imported; `reviseTile`, `restoreTile`, and `duplicateTile` use them.
- [x] `handlers.ts`, `bridge.ts`: re-sign as under AFTER. In `bridge.ts`, delete `TileType` from the `../Tiles/tiles` import; `tiles:create` was its only use.
- [x] `tiles.ts`: `mintSeed` loses its `type` parameter, since only a Markdown Tile is ever seeded: `export const mintSeed = (id: string): Record<string, unknown> => ({ id, type: 'markdown' })`, and `seedBoard` calls `mintSeed(id)`. The `TilePick` comment becomes `/** What a create or a convert into each kind is given; a kind a menu row makes has a member here. */`
- [x] Tests: every `createTile(<dir>, 'markdown')` becomes `createTile(<root>, <dir>)`, `<root>` being the Nexus root the test already holds (`root` in `tilesFile.test.ts`). `grep -rn "createTile(" Core --include="*.test.ts"` lists them. `handlers.test.ts` drops the `'markdown'` argument.
- [x] `tilesFile.test.ts`: delete the "bare seed" test and add the three under VERIFY in its place.

**AFTER**

```ts
// bridge.ts
  'tiles:create': {
    args: [host: TileHostRef, pick?: TilePick]
    reply: Result<Landed<{ id: string }>>
  }
```

```ts
// handlers.ts
  'tiles:create': withWriteRoot(async (root, _ctx, host: unknown, pick?: unknown) => {
    const tile = await tileHostAnd(root, host)
    return tile.ok ? createTile(root, tile.value.dir, pick) : tile
  }),
```

```ts
// tilesFile.ts — `createTile` in place; `PICK_ENTRIES` and `pickEntry` sit above it, moved up from above `convertTile`
const PICK_ENTRIES: Record<PickKind, (root: string, value: unknown) => Promise<Result<Json>>> = {
  // …both arms exactly as CONVERTS has them
}

const pickEntry = (root: string, pick: unknown): Promise<Result<Json>> =>
  isPlainObject(pick) && isKeyOf(PICK_ENTRIES, pick.kind)
    ? PICK_ENTRIES[pick.kind](root, pick.value)
    : Promise.resolve(fault('Invalid pick.'))

// With no pick a tile starts as a blank Markdown Tile; a pick makes the entry a convert would, so a linked tile lands in one write and owns no file.
export async function createTile(
  root: string,
  dir: string,
  pick?: unknown,
): Promise<Result<Landed<{ id: string }>>> {
  const id = newId()
  const linked = pick === undefined ? null : await pickEntry(root, pick)
  if (linked && !linked.ok) return linked
  await machine().mkdir(dir)
  return linked
    ? addTile(dir, id, mergeEntry({ id }, linked.value), null)
    : addTile(dir, id, mintSeed(id), '')
}
```

```ts
// tilesFile.ts
export async function convertTile(
  root: string,
  dir: string,
  tileId: string,
  pick: unknown,
  deps: TrashDeps,
): Promise<Result<Landed>> {
  const patch = await pickEntry(root, pick)
  if (!patch.ok) return patch
  const revised = await reviseTile(root, dir, tileId, patch.value, deps)
  return revised.ok ? ok({ landed: revised.value.landed }) : revised
}
```

**VERIFY**

- [x] Three tests in `tilesFile.test.ts`, replacing the deleted one:
  - a page pick lands `{ id, type: 'page', page_id: 'p1' }` as the only entry, and `pathExists(tileFilePath(home(), id))` is false.
  - a view pick naming a seeded container and no view lands an entry of `type: 'view'` whose `views[0].source_id` is the container's id and whose `views[0].config.id` is a freshly minted view id, with no file beside it. Build the container the way the file's existing `convertTile` view tests do.
  - `createTile(root, home(), { kind: 'widget' })`, `createTile(root, home(), 'markdown')`, and a view pick whose `source_id` names nothing each return a failed `Result`, and `pathExists(tileDocPath(home()))` is false afterward.
- [x] `handlers.test.ts`: `tilesHandlers['tiles:create'](ctx, space)` still creates a Markdown Tile whose file exists; one added assertion that `tilesHandlers['tiles:create'](ctx, space, { kind: 'page', value: 'p1' })` answers `ok` and writes no file for its id.
- [x] `grep -rn "CONVERTS\|can’t be created" Core` → no output.
- [x] Run the gates.

#### Task 3.2

**TASK:** The Insert Menu's model: New Page, then the Markdown Tile's own link rows. The link rows and the pick lookup are defined once and shared with the handle menu, and the order flips to Link Page above Link View at its one definition.

**FILES:** `Core/Tiles/tiles.ts`, `Core/Tiles/tileHandleMenu.ts`, `Core/Tiles/TileHost.tsx`, `Core/Tiles/tiles.test.ts`, `Core/Tiles/tileHandleMenu.test.ts`, `Core/Tiles/README.md`

**BEFORE**

- `tiles.ts` — `TILE_KINDS.markdown.menuRows`.
- `tileHandleMenu.ts` — in `tileMenuItems`: `const picks`, `pickAction`, `pickRowsTo`, and the `...TILE_KINDS[entry.type].menuRows.map(…)` spread.
- `TileHost.tsx` — in `onHandleMenu`'s `run`: `const chosen = action.startsWith('tile:pick:') ? built.picks[Number(action.slice('tile:pick:'.length))] : undefined`.

**CHANGE**

- [x] `tiles.ts`: swap the two `menuRows` entries.
- [x] `tileHandleMenu.ts`: move the link section out of `tileMenuItems` into `linkRows`; add `insertMenuItems` and `pickOf`. The two comments the section carried merge into the one above `linkRows`.
- [x] `TileHost.tsx`: `run` reads its pick through `pickOf`.
- [x] `tiles.test.ts`: the pinned `menuRows` order becomes Link Page, then Link View.
- [x] `README.md` *§Module Map*: the `tileHandleMenu.ts` row reads "The handle menu's and the Insert Menu's models, their shared link rows, and the pick trees".

**AFTER**

```ts
// tiles.ts
    menuRows: [
      { label: 'Link Page', to: 'page' },
      { label: 'Link View', to: 'view' },
    ],
```

```ts
// tileHandleMenu.ts — the action unions
type PickAction = `tile:pick:${number}`

type TileMenuAction =
  | 'tile:open'
  | 'tile:duplicate'
  | 'tile:delete'
  | 'tile:lock'
  | `tile:style:${TileStyle}`
  | `tile:zoom:${number}`
  | PickAction
```

```ts
// tileHandleMenu.ts — below pickTreesOf
// Rows name an index into `picks` because a menu row can't carry a pick; a row with no source is shown and refused rather than dropped.
function linkRows(
  rows: ReadonlyArray<{ label: string; to: PickKind }>,
  pickTree: PickTree,
  locked: boolean,
): { items: ActionItem<PickAction>[]; picks: TilePick[] } {
  const picks: TilePick[] = []
  const rowsTo = <K extends PickKind>(to: K) =>
    pickRows(pickTree(to), (value): PickAction => {
      picks.push({ kind: to, value } as TilePick)
      return `tile:pick:${picks.length - 1}`
    })
  const items = rows.map(({ label, to }) => ({
    label,
    icon: 'link',
    submenu: locked ? [] : rowsTo(to),
  }))
  return { items, picks }
}

export const pickOf = (action: string, picks: readonly TilePick[]): TilePick | undefined =>
  action.startsWith('tile:pick:') ? picks[Number(action.slice('tile:pick:'.length))] : undefined

/** What a ghost tile's click offers: a blank Markdown Tile, or one made already linked through the rows a Markdown Tile's own menu links by. */
export function insertMenuItems(
  pickTree: PickTree,
  pageIcon: string,
): { items: ActionItem<'tile:new' | PickAction>[]; picks: TilePick[] } {
  const links = linkRows(TILE_KINDS.markdown.menuRows, pickTree, false)
  return {
    items: [{ label: 'New Page', icon: pageIcon, action: 'tile:new' }, ...links.items],
    picks: links.picks,
  }
}
```

```ts
// tileHandleMenu.ts — tileMenuItems, from its first line through the items list's link rows
}): { items: ActionItem<TileMenuAction>[]; picks: TilePick[] } {
  const locked = (entry?.locked ?? false) || boardLocked
  const deleteRow = { label: 'Delete', icon: 'x', action: 'tile:delete' as const, disabled: locked }
  // A box with no entry this build can draw offers Delete alone, so it can still be removed.
  if (!entry) return { items: [deleteRow], picks: [] }
  const links = linkRows(TILE_KINDS[entry.type].menuRows, pickTree, locked)
  const borderless = entry.style === 'borderless'
  const items: ActionItem<TileMenuAction>[] = [
    ...(pageInfo
      ? [{ label: pageInfo.title, icon: pageInfo.icon, action: 'tile:open' as const }]
      : []),
    ...links.items,
    {
      label: 'Style',
```

```ts
// tileHandleMenu.ts — tileMenuItems' last line
  return { items, picks: links.picks }
```

```ts
// TileHost.tsx — in run; `pickOf` joins the './tileHandleMenu' import
        const chosen = pickOf(action, built.picks)
```

**VERIFY**

- [x] New tests in `tileHandleMenu.test.ts`, with `pickTree` stubbed as the file's `ctx` does:
  - `insertMenuItems(tree, 'file-text').items.map((i) => i.label)` equals `['New Page', 'Link Page', 'Link View']`, and the first row is `{ label: 'New Page', icon: 'file-text', action: 'tile:new' }`.
  - with one page in the page tree, the Link Page row's submenu holds one row whose action is `'tile:pick:0'`, and `pickOf('tile:pick:0', picks)` equals `{ kind: 'page', value: <that page's pick> }`.
  - with both trees empty, both link rows carry an empty `submenu`, as `tileMenuItems` gives a Markdown Tile today.
  - `pickOf('tile:new', [])` and `pickOf('tile:pick:3', [])` are `undefined`.
- [x] Every existing test in `tileHandleMenu.test.ts` and `tileKinds.test.tsx` passes untouched.
- [x] Run the gates.

---

### Phase 4 — Ghost Tiles

**GOAL:** The board draws its wedge zones, its ghost, and its add strip; the host opens the Insert Menu and seats what it creates; and every document that described right-click creation describes this. Tasks 4.1 and 4.2 change the two sides of one prop contract and share a commit.

#### Task 4.1

**TASK:** The grid derives its wedges from the drawn tree, renders one hover zone per wedge on `useGhostAnchor`, and draws one ghost button for whichever of the held Insert Menu, the hovered wedge, or an empty board applies. Under the last band it draws the add strip, shown while the pointer is near the board's bottom edge, tracked as the tile handle's reach is. A click on either reports the target and the event to the host. The board's height eases outside a live drag or resize.

**FILES:** `Core/Tiles/TileGrid.tsx`, `Core/Tiles/tile-grid.css`, `UIX/Interactions/ghost-create.css`, `Core/Tiles/TileGrid.test.tsx`

**DEPENDENCIES:** Shares Task 4.2's commit; the typecheck is red between them.

**BEFORE**

- `TileGrid.tsx` — the imports; `TileGridProps`; the constants under `HANDLE_REACH`; in `TileGrid`: the `placed` memo through `live`, the `busy` line and its effect, `dropSlot`, and the returned JSX.
- `tile-grid.css` — the `.tile-grid` rule at the head of the file; the `.tile-placement` rule.
- `ghost-create.css` — `[data-ghost-root]:hover { … }`.

**CHANGE**

- [x] Imports: `useHeldPresence` joins `useSettleFallback`; `ghostAnchorProps`, `useClearStrandedGhost`, `useGhostAnchor` from `@pommora/uix/Interactions/ghostCreate`; `REVEAL_GRACE_MS` and `withinBox` join the `hoverReveal` import; `Icon` from `@pommora/uix/Symbols`; `text` from `@pommora/uix/Theme`, as `Surfaces/WebTile.tsx` imports it; `NEW_TILE_H` joins `TILE_GAP`; `wedgeFills` joins the `rects` import.
- [x] Add the types, props, constants, and the `AddStrip` component under AFTER.
- [x] `busy` moves up beside `boardStatic` so `zones` can be derived there; its effect stays where it is.
- [x] Add the wedge memo, the hook, the ghost, the zones, the strip, and the grid's class and height, in the positions AFTER gives.
- [x] CSS as under AFTER.

**AFTER**

```tsx
// TileGrid.tsx — props and types
interface TileGridProps {
  layout: TileLayout
  onLayoutChange: (layout: TileLayout) => void
  renderTile: (id: string) => React.ReactNode
  tileClassName: (id: string) => string | undefined
  editingId: string | null
  menuOpenId: string | null
  inserting: Inserting | null
  tileStyle: (id: string) => CSSProperties | undefined
  onBusyChange: (busy: boolean) => void
  locked: boolean
  isTileLocked: (id: string) => boolean
  onHandleMenu: (id: string, e: React.MouseEvent) => void
  onInsert: (target: InsertTarget, e: React.MouseEvent) => void
}

/** Where a new tile lands: as the board's last band, or flush in the wedge under a tile. */
export type InsertTarget = { kind: 'append' } | { kind: 'wedge'; above: string }

/** The Insert Menu a ghost or the add strip opened, held while the menu is open and then through its create's flight. */
export interface Inserting {
  target: InsertTarget
  phase: 'menu' | 'flight'
}
```

```tsx
// TileGrid.tsx — constants, under BOTTOM_PAD_PX
// KNOB — a wedge's dwell; the add strip's height inside the bottom clearance, and how near the board's bottom edge the pointer comes before it shows: the last band's border, the clearance, and the strip.
const WEDGE_DWELL_MS = 1000
const ADD_STRIP_PX = 14
const ADD_REACH_PX = 16
```

```tsx
// TileGrid.tsx — under TileShell
function AddStrip({
  y,
  held,
  onAdd,
}: {
  y: number
  held: boolean
  onAdd: (e: React.MouseEvent) => void
}): React.JSX.Element {
  const ref = useRef<HTMLDivElement>(null)
  const [near, setNear] = useState(false)
  // A press holds the reveal where it stands, so the strip is still there to take its own click.
  useEffect(() => {
    const el = ref.current
    if (!el) return
    return trackNear({
      anchor: el,
      measure: () => {
        const box = el.getBoundingClientRect()
        return (px, py) => withinBox(box, px, py, ADD_REACH_PX)
      },
      report: (at) => {
        if (at !== 'held') setNear(at === 'near')
      },
    }).stop
  }, [])
  return (
    <div
      ref={ref}
      className="tile-add"
      data-reveal-host={near ? 'on' : ''}
      style={placementStyle({
        x: { share: 0, px: 0 },
        y,
        w: { share: 1, px: 0 },
        h: ADD_STRIP_PX,
      })}
    >
      <button
        type="button"
        className={cx('add-strip', revealTarget)}
        data-create
        data-reveal-held={held || undefined}
        aria-label="New Tile"
        onClick={onAdd}
      >
        <Icon name="plus" size="body" />
      </button>
    </div>
  )
}
```

```tsx
// TileGrid — from the `placed` memo through `live`; `busy` is the line that stood above its effect
  const placed = useMemo(() => placeTiles(draft ?? view, TILE_GAP), [draft, view])
  // Keyed on the drawn tree, so it never recomputes under a gesture's draft; the stacked view is one bare tile per band and so has no wedge.
  const wedges = useMemo(() => wedgeFills(view, TILE_GAP, TILE_MIN_PX), [view])

  const boardStatic = locked || stacked
  const busy = pressedId !== null || resizingId !== null || tileDrag !== null || settle !== null
  // A board with tiles offers its wedge ghosts and its add strip while it is unlocked and at rest; a stacked board has no wedge and keeps the strip.
  const zones = !locked && !busy && view.bands.length > 0
  const live = useLatest({ view, onLayoutChange, boardStatic, isTileLocked })
```

```tsx
// TileGrid — under the `busy` effect, above the stacking sample
  const ghostApi = useGhostAnchor({
    dwellMs: WEDGE_DWELL_MS,
    graceMs: REVEAL_GRACE_MS,
    suppressed: () => inserting !== null,
  })
  useClearStrandedGhost(ghostApi, { has: (id) => zones && wedges.has(id) })
```

```tsx
// TileGrid — from `dropSlot` to the end of the component
  const dropSlot = tileDrag && draft ? placed.tiles.get(tileDrag.id) : null

  // A wedge's ghost fills the wedge; an append's draws only on an empty board, where it is the first tile's box — a board with tiles adds its bottom row from the strip.
  const boxOf = (target: InsertTarget): Placement | null => {
    if (target.kind === 'append')
      return placed.totalHeight > 0
        ? null
        : { x: { share: 0, px: 0 }, y: 0, w: { share: 1, px: 0 }, h: NEW_TILE_H }
    const above = placed.tiles.get(target.above)
    const h = wedges.get(target.above)
    return above && h !== undefined
      ? { x: above.x, y: above.y + above.h + TILE_GAP, w: above.w, h }
      : null
  }

  // The open menu's ghost draws from the live value, so the hovered ghost becomes the held one in place; only a dismissed one waits on the presence.
  const seat = useHeldPresence(inserting, 'base')
  const hovered = ghostApi.ghost
  const shownGhost = (): { target: InsertTarget; closing: boolean } | null => {
    if (locked) return null
    if (inserting) return { target: inserting.target, closing: false }
    if (hovered)
      return { target: { kind: 'wedge', above: hovered.anchorId }, closing: hovered.closing }
    if (view.bands.length === 0) return { target: { kind: 'append' }, closing: false }
    // A dismissed menu's ghost fades where it stood; a landed create's is already its tile.
    return seat?.held.phase === 'menu' ? { target: seat.held.target, closing: true } : null
  }
  const ghost = shownGhost()
  const ghostBox = ghost && boxOf(ghost.target)

  return (
    <div
      ref={gridRef}
      className={cx(
        'tile-grid',
        resizingId !== null && 'is-interacting',
        tileDrag !== null && 'is-dragging',
        boardStatic && 'is-static',
      )}
      style={{
        height: Math.max(placed.totalHeight, ghostBox ? ghostBox.y + ghostBox.h : 0) + BOTTOM_PAD_PX,
      }}
    >
      {zones &&
        [...wedges.keys()].map((id) => {
          const box = boxOf({ kind: 'wedge', above: id })
          return (
            box && (
              <div
                key={`zone-${id}`}
                className="tile-zone"
                style={placementStyle(box)}
                {...ghostAnchorProps(ghostApi, id)}
              />
            )
          )
        })}

      {order.map(([id, place]) => {
        const lifted = tileDrag?.id === id ? tileDrag : null
        const settling = settle?.id === id ? settle : null
        const phase: TilePhase = lifted
          ? 'lifted'
          : settling
            ? 'settling'
            : tileDrag || settle
              ? 'reflow'
              : 'idle'
        return (
          <TileShell
            key={id}
            id={id}
            place={lifted?.lift ?? settling?.to ?? place}
            phase={phase}
            resizing={resizingId === id}
            editing={editingId === id}
            menuOpen={menuOpenId === id}
            extraClass={tileClassName(id)}
            extraStyle={tileStyle(id)}
            renderTile={renderTile}
            onHandleDown={onHandleDown}
            onHandleMenu={onHandleMenu}
            onEdgeDown={onEdgeDown}
            onSettled={finishSettle}
          />
        )
      })}

      {dropSlot && <div className="tile-placement drop-slot" style={placementStyle(dropSlot)} />}

      {ghost && ghostBox && (
        <button
          type="button"
          data-ghost-root
          data-reveal-held={inserting !== null || undefined}
          className={cx('tile-ghost tile-base ghost-worn', ghost.closing && 'is-closing')}
          style={placementStyle(ghostBox)}
          onPointerEnter={ghostApi.onGhostEnter}
          onPointerLeave={ghostApi.onGhostLeave}
          onTransitionEnd={(e) => {
            if (ghost.closing && e.target === e.currentTarget && e.propertyName === 'opacity')
              ghostApi.closed()
          }}
          onClick={(e) => {
            if (inserting !== null) return
            ghostApi.take()
            onInsert(ghost.target, e)
          }}
        >
          {/* A button, so an empty board can be given its first tile from the keyboard; the tile base's border and radius are its chrome. */}
          <Icon name="layout-dashboard" size="titleMedium" />
          <span className={text.footnote.standard}>New Tile</span>
        </button>
      )}

      {zones && (
        <AddStrip
          y={placed.totalHeight + TILE_GAP}
          held={inserting?.target.kind === 'append'}
          onAdd={(e) => {
            if (inserting === null) onInsert({ kind: 'append' }, e)
          }}
        />
      )}
    </div>
  )
```

```css
/* tile-grid.css — the file's head, through the rule that stills tiles under a resize */
.tile-grid {
  position: relative;
  width: 100%;
  min-height: 120px;
  transition: height var(--duration-base) var(--ease-base);
}

/* A drag grows the board under its drop slot and a resize under its edge, frame by frame; easing either would trail the pointer. */
.tile-grid.is-interacting,
.tile-grid.is-dragging {
  transition: none;
}

/* The chassis geometry (border, radius, body clip) is the shared tile-base; what's here is the grid's own layer — placement, motion, and the state selectors that drive --tile-border-color. */
.tile {
  position: absolute;
  top: 0;
  left: 0;
  transition:
    left var(--duration-base) var(--ease-base),
    transform var(--duration-base) var(--ease-base),
    width var(--duration-base) var(--ease-base),
    height var(--duration-base) var(--ease-base),
    opacity var(--duration-base) var(--ease-base),
    border-color var(--duration-base) var(--ease-base),
    --tile-zoom var(--duration-base) var(--ease-base);
}

.tile-grid.is-interacting .tile {
  transition: none;
}
```

```css
/* tile-grid.css — under the .tile-placement rule */
/* A wedge's hover zone is the box its ghost would take; it sits beneath the tiles, so a tile's edges and handle keep every pointer that reaches them. */
.tile-zone {
  position: absolute;
  top: 0;
  left: 0;
}

.tile-grid .tile-ghost {
  position: absolute;
  top: 0;
  left: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 0;
  background: none;
  font: inherit;
  --tile-border: var(--width-200);
  color: var(--label-secondary);
  animation: tile-ghost-in var(--duration-base) var(--ease-base);
}
.tile-grid .tile-ghost.is-closing {
  --ghost-opacity: 0;
}
@keyframes tile-ghost-in {
  from {
    opacity: 0;
  }
}

/* The board's add strip rides under the last band, inside the bottom clearance. */
.tile-add {
  position: absolute;
  top: 0;
  left: 0;
}
.tile-add > .add-strip {
  inset: 0;
}
```

```css
/* ghost-create.css — after the [data-ghost-root]:hover rule */
/* Held while the menu its click opened is open: lifted as a hover lifts it, under the hover wash. */
[data-ghost-root][data-reveal-held] {
  --ghost-opacity: var(--state-ghost);
  background: var(--state-hover);
}
```

**VERIFY**

- [x] New tests in `TileGrid.test.tsx`, the `grid` props object gaining `inserting: null` and `onInsert: () => {}`. A zone is hovered with a `pointerover` on it followed by `window.dispatchEvent(new MouseEvent('pointermove'))`, under fake timers:
  - the row fixture is `splitTile(insertBand({ bands: [] }, 0, 'a', 200), 'a', 'e', 'b')` with `b`'s `h` then set to 100, since `splitTile` gives the new tile its target's height. Over it, the grid renders exactly one `.tile-zone`; hovering it for 1000ms mounts `.tile-ghost` with `height: 92px`; 999ms mounts none.
  - over the same layout, `.tile-add` is in the document with `style.transform` of `translate(0px, 208px)`, and clicking its button calls `onInsert` once with `{ kind: 'append' }` and the event; the grid's `style.height` is `228px` throughout.
  - with `.tile-add`'s `getBoundingClientRect` stubbed through `stubRect` to the strip's box, a window `pointermove` 10px above it sets `data-reveal-host="on"`, one 40px above it sets `""`, and one 10px above it with `buttons: 1` leaves the attribute as it was.
  - over `row[a 200, b 100]`, `locked: true` renders no `.tile-zone` and no `.tile-add`; over an empty layout it renders no `.tile-ghost`.
  - an empty layout renders `.tile-ghost` at once with `transform: translate(0px, 0px)` and `height: 160px`, no `.tile-zone`, and no `.tile-add`.
  - over `row[a 200, b 100]` at a measured width under the stacking threshold, the grid renders no `.tile-zone` and one `.tile-add`.
  - over `row[a 200, b 100]`, after a pointerdown on a tile handle, neither `.tile-zone` nor `.tile-add` is in the document until the gesture ends and its settle commits.
  - clicking the wedge ghost calls `onInsert` once with `{ kind: 'wedge', above: 'b' }` and the event; with `inserting` set, a second click on the ghost or the strip calls nothing.
  - under a wrapper that holds `inserting` in state and sets it to `{ target, phase: 'menu' }` from `onInsert`, as the host does, a hovered wedge ghost that is clicked is the same `.tile-ghost` DOM node after the click as before it, and carries `data-reveal-held`; re-rendered with `inserting: null` it carries `is-closing` and leaves after the exit beat; re-rendered from `phase: 'flight'` to `null` it is gone in that render.
  - with `inserting: { target: { kind: 'append' }, phase: 'menu' }` over a layout with tiles, the strip's button carries `data-reveal-held` and no `.tile-ghost` is drawn.
- [x] `grep -n "from './tiles'\|from './TileHost'\|from './tileHandleMenu'" Core/Tiles/TileGrid.tsx` → no output.
- [x] `grep -n "addEventListener\|onPointerMove" Core/Tiles/TileGrid.tsx` → no output: the zones carry `ghostAnchorProps` alone, and the strip's reach runs on the kit's `trackNear`, whose test is cached between moves.
- [x] Run the gates once Task 4.2 has landed.

#### Task 4.2

**TASK:** The host holds the open Insert Menu as `inserting`, pops the menu at the click, and on a pick creates the tile and seats it against the board as it stands at landing — in one commit with the ghost's removal and, for a blank Markdown Tile, the caret. A pick on a board locked since its menu opened does nothing, from either tile menu.

**FILES:** `Core/Tiles/TileHost.tsx`, `Core/Tiles/TileHost.test.tsx`

**DEPENDENCIES:** Shares Task 4.1's commit.

**BEFORE**

- `TileHost.tsx` — the imports; `const [menuOpenId, setMenuOpenId]`; in `onHandleMenu`: `boardLocked: hostLocked`, the first line of `run`, and `hostLocked` in the dependency list; the `<TileGrid … />` props.

**CHANGE**

- [x] Imports: `flushSync` from `react-dom`; `TILE_GAP` joins the `./Layout/model` import; `wedgeFills` from `./Layout/rects`; `TILE_MIN_PX` from `@pommora/uix/Utilities/tileMetrics`; `type Inserting` and `type InsertTarget` join the `./TileGrid` import; `insertMenuItems` joins the `./tileHandleMenu` import.
- [x] Add `inserting` and `onInsert`.
- [x] `onHandleMenu`: `build` reads the live board lock; `run` refuses a mutating pick on a locked board; `hostLocked` leaves the dependency list.
- [x] Pass `inserting` and `onInsert` to the grid.

**AFTER**

```tsx
// TileHost.tsx — under menuOpenId
  const [inserting, setInserting] = useState<Inserting | null>(null)
```

```tsx
// TileHost.tsx — in onHandleMenu
      const build = (on: TileEntry | undefined): ReturnType<typeof tileMenuItems> =>
        tileMenuItems({
          entry: on,
          pickTree,
          pageInfo: page && {
            title: page.title,
            icon: entityIcon('page', page.icon, defaultIcons),
          },
          boardLocked: readTileDoc(host).locked,
        })
      // …
      const run = (action: string): void => {
        // A board locked since the menu opened answers only the row a locked board still offers.
        if (action !== 'tile:open' && readTileDoc(host).locked) return
        const chosen = pickOf(action, built.picks)
```

```tsx
// TileHost.tsx — under renderTile, where onBackdrop stood
  const onInsert = useCallback(
    (target: InsertTarget, e: React.MouseEvent) => {
      const s = useSession.getState()
      if (!s.tree) return
      const { defaultIcons } = personalizationOf(s)
      const built = insertMenuItems(
        pickTreesOf(s.tree, defaultIcons),
        entityIcon('page', undefined, defaultIcons),
      )
      setInserting({ target, phase: 'menu' })
      void popMenu(built.items, e.currentTarget as HTMLElement, {
        // A keyboard press carries no point, so its menu hangs from the control it pressed.
        at: e.detail > 0 ? { x: e.clientX, y: e.clientY } : undefined,
      }).then((action) => {
        if (action === null || readTileDoc(host).locked) return setInserting(null)
        const pick = pickOf(action, built.picks)
        setInserting({ target, phase: 'flight' })
        void landTileWrite(host, dialer().ask('tiles:create', host, pick)).then((r) => {
          const made = reportRefusal(r) ? r.value.id : null
          const above = target.kind === 'wedge' ? target.above : null
          // One commit outside a sibling mount's held gesture, so no frame draws the ghost beside its tile or neither: the store's write renders at once, and a state set from a promise would trail it.
          flushSync(() => {
            setInserting(null)
            if (made === null) return
            // Seated against the board as it stands now: the wedge takes its present fill, and a wedge that closed or lost its tile gives way to the last band.
            commitLayout((cur) =>
              seatBelow(
                cur,
                made,
                above,
                above === null ? undefined : wedgeFills(cur, TILE_GAP, TILE_MIN_PX).get(above),
              ),
            )
            if (!pick) setEditingId(made)
          })
        })
      })
    },
    [commitLayout, host],
  )
```

```tsx
// TileHost.tsx — the grid
      <TileGrid
        layout={layout}
        onLayoutChange={setLayout}
        renderTile={renderTile}
        tileClassName={tileClassName}
        editingId={editingId}
        menuOpenId={menuOpenId}
        inserting={inserting}
        tileStyle={tileStyle}
        onBusyChange={setBusy}
        locked={hostLocked}
        isTileLocked={(id) => entries.get(id)?.locked ?? false}
        onHandleMenu={onHandleMenu}
        onInsert={onInsert}
      />
```

**VERIFY**

- [x] New tests in `TileHost.test.tsx`, with `devicePrefs: { nativeMenus: true }` and the `menu` channel stubbed to answer the action under test, `tiles:create` stubbed to answer a landed document carrying the new entry:
  - over an empty document, clicking `.tile-ghost` and picking `'tile:new'` asks `tiles:create` with the host and an `undefined` pick (`calls[0][1]` is `undefined`); the saved layout is one band holding the new id at height 160; the new tile carries `.is-editing-tile`; no `.tile-ghost` remains.
  - picking `'tile:pick:0'` asks `tiles:create` with the pick `insertMenuItems` built at index 0, and the new tile does not carry `.is-editing-tile`.
  - over a document with tiles, clicking the add strip's button and picking `'tile:new'` lands the new id as the last band at height 160, with the caret in it; the `menu` request's `anchor` is the click's point, and a click dispatched with `detail: 0` sends the button's box instead.
  - the `menu` channel answering `null` asks nothing, and the standing ghost is still in the document without `data-reveal-held`.
  - a wedge target whose tile left the layout before the reply (a `tiles:changed` reload between the click and the stubbed reply) lands the new id as the last band.
  - a wedge target whose fill changed before the reply lands the new id under its tile at the fill `wedgeFills` gives the reloaded layout.
  - the document reloaded as `locked: true` while the menu is open: the pick asks nothing.
  - the handle menu: with the document reloaded as `locked: true` after the menu opened, a `'tile:duplicate'` pick asks nothing, and a `'tile:open'` pick still opens the page.
- [x] `grep -n "hostLocked" Core/Tiles/TileHost.tsx` → the `useTileDoc` destructure, the host's class name, and the grid's `locked` prop only.
- [x] Run the gates.

#### Task 4.3

**TASK:** Every document, and the decision log, states the board as it now works.

**FILES:** `.claude/Features/SurfacePM.md`, `Core/Tiles/README.md`, `.claude/Planning/TilesV2-Spec.md`, `.claude/FrameworkPM.md`, `.claude/Features/ViewTypesPM.md`, `.claude/Features/ConfigurationPM.md`, `.claude/Planning/Ghost Tiles — Initial Decisions.md`

**CHANGE**

Each edit replaces the quoted text in place; nothing is appended beside it.

- [x] `SurfacePM.md` *§Tile Types*: "a kind a menu converts into adds a `TilePick` member whose convert and pick-tree arms the compiler requires" → "a kind a menu creates or converts into adds a `TilePick` member whose pick-entry and pick-tree arms the compiler requires".
- [x] `SurfacePM.md` *§Surface Interaction*: the sentence "Creation is a right-click on the surface background: … appends as a full-width band." → "Creation is a ghost tile: resting the pointer in the wedge under a shorter tile raises a dimmed "New Tile" in the box a tile would take, and an add strip under the last band, the one a Markdown table adds a row by, shows as the pointer nears the board's bottom edge. Clicking either opens the Insert Menu at the click — **New Page**, which makes a Markdown Tile and hands it the caret, and **Link Page** and **Link View**, which make the tile already linked. The ghost or strip holds while its menu is open, a ghost fades when the menu is dismissed, and the tile lands flush in the wedge or as a full-width band when a row is picked; an empty board stands one ghost without a hover."
- [x] `SurfacePM.md` *§Surface Interaction*: "freezes every tile's position and size and withholds background-create, while content editing and the handle menu stay live; a board narrow enough to draw as one column is frozen the same way." → "freezes every tile's position and size and withholds the ghost tiles and the add strip, while content editing and the handle menu stay live; a board narrow enough to draw as one column is frozen the same way, offering no wedge ghost while keeping its add strip and, when empty, its standing ghost."
- [x] `SurfacePM.md` *§Pending*: delete the "**The Insert menu**" entry.
- [x] `README.md` *§Module Map*: the `TileGrid.tsx` row's list gains "the ghost tiles, their hover zones, and the add strip" after "placement tint".
- [x] `README.md` *§Interaction Invariants*, the last bullet → "**A static board answers no geometry gesture.** A host lock and the stacking width are one state for gestures: the grid refuses the press before the pointer engine sees it, so no gesture path carries a stacked branch. A host lock withholds the ghost tiles and the add strip; a stacked board has no wedge and keeps the strip. Content editing, the handle menu, and view tiles run either way."
- [x] `TilesV2-Spec.md` *§The Seams*: "`tiles:create` makes any kind whose bare seed is a whole entry; a kind that needs a source is reached by convert." → "`tiles:create` makes a blank Markdown Tile, or, given a `TilePick`, the entry that pick resolves to, in one write." In the same paragraph, "convert and pick-tree arms" → "pick-entry and pick-tree arms".
- [x] `TilesV2-Spec.md` *§Prospects* and `FrameworkPM.md` *§v0.9.0*: delete "the background Insert menu" and its comma from each list.
- [x] `ViewTypesPM.md`, the hover-ghost sentence → "Every renderer shares the **hover ghost** (`UIX/Interactions/ghostCreate.ts`) with the sidebar, the option lists, and tile boards: dwelling on a row or card extends a ghost "New Page" beneath it at the inactive dim, on that renderer's own chrome, with click-to-create actions. A dwell begins only on a real pointer move, so content scrolled or drawn under a resting pointer raises none."
- [x] `ConfigurationPM.md`, the Use Native Menus row: "the click-triggered lists that hang from a control, pickers and the tile handle," → "the click-triggered lists that hang from a control or a click, pickers, the tile handle, and a board's Insert Menu,".
- [x] The decision log: its STATUS line reads "Implemented".

**VERIFY**

- [x] `grep -rn "right-click on the surface background\|background-create\|backdrop's create menu\|background Insert menu\|reached by convert" .claude/Features .claude/Planning/TilesV2-Spec.md .claude/FrameworkPM.md Core/Tiles` → no output.
- [x] Read each edited paragraph once in full; none contradicts itself.

#### Task 4.4

**TASK:** Nathan's ruling during the checkpoint: the clearance under the last band is one bottom zone whose shape the room decides. With at least `BOTTOM_FILL_MIN_PX` (80) of tile below the pane's content, a 1s dwell raises a ghost filling that room and the tile lands at that height; with less, the add strip shows at once. `NEW_TILE_H` is 250. The strip's thickness is the kit token `--add-strip-size` (18px), read by the table's row and column strips in place of `--tbl-add-size`.

**FILES:** `Core/Tiles/TileGrid.tsx`, `Core/Tiles/TileHost.tsx`, `Core/Tiles/Layout/model.ts`, `Core/Tiles/Layout/ops.ts`, `Core/Tiles/tile-grid.css`, `Core/MarkdownPM/markdown-tables.css`, `UIX/Interactions/autoscroll.ts`, `UIX/Theme/theme-vars.css.ts`, the two grid and host test files, `Core/Tiles/README.md`, `.claude/Features/SurfacePM.md`, `.claude/Features/PommoraUIX.md`, the decision log

**CHANGE**

- [x] `TileGrid.tsx`: `AddStrip`, `ADD_STRIP_PX`, `ADD_REACH_PX`, and the `withinBox` import leave. `InsertTarget`'s append arm gains `h?: number`; `APPEND` names the bottom zone's hook anchor; `fillBelow(grid)` reads the room below the pane's content through the kit's new `scrollContainer`; `fill` and `strip` state are set on the zone's enter; `boxOf(append)` is the next band's box at `target.h ?? NEW_TILE_H`; `stripped(target)` keeps an append without a height off the ghost and on the strip. The zone is the clearance (`BOTTOM_PAD_PX` tall) with the strip button one gutter in.
- [x] `TileHost.tsx`: the seat takes `target.h` for an append. `ops.ts`: `seatBelow` with no tile to seat under lands at `h` when given. `model.ts`: `NEW_TILE_H = 250`.
- [x] `autoscroll.ts`: `scrollsAxis` and `scrollContainer` — the nearest ancestor that would scroll the axis, whether or not its content overflows yet; `scrollableInAxis` reads `scrolls` from the same place.
- [x] CSS: `.tile-add` shares the zone rule; the strip is `height: var(--add-strip-size)`; the token sits with the drop chrome in `theme-vars.css.ts`; the table's `--tbl-add-size` is gone.
- [x] The zone spans the whole room under the last band, not the clearance alone: the room is read in the board's width sample (`fillBelow(grid, totalHeight)`, from the band so the ghost's own growth never feeds it) and sizes the zone before any hover; a bottom ghost's end is the board's end, taking the clearance as its own; the zone renders with the wedge zones, beneath the tiles, so its ghost takes the click.
- [x] Tests: the grid's bottom-zone describe covers both shapes, the shape re-read between visits, the hold and fade per shape, and the held append with and without a height; the host seats a bottom ghost's measured 292px band; every 160 default reads 250.

**VERIFY**

- [x] Gates green: typecheck 0 errors, lint "Checked 1409 files. No fixes applied.", Tiles 253 passed.
- [x] Live, in the checkpoint: a short board's room gives the filling ghost after 1s and the pane gains no scroll; a board scrolled to its end gives the strip at once. The table's strips read `--add-strip-size` and were not re-measured after the token changed.

#### Review Checkpoint

Driven over CDP on a scratch instance of `~/Test` (port 9334, the dev renderer, main rebuilt after Task 3.1), on a throwaway homepage board of a 300px and a 120px tile in one row, until the live testing was taken over by hand; the rest is that pass.

- [x] Resting in the wedge under the shorter tile for 1s raised the ghost at `[838, 366, 576, 172]`, the wedge's exact box; picking New Page landed a tile at `[838, 366, 576, 172]`, with `.is-editing-tile`, and neither other tile's rect changed.
- [x] A single `mouseMoved` into the wedge raised the ghost after the dwell (null at 903ms, present at 1206ms).
- [x] A ghost left at once was `is-closing` at 250ms and gone by 551ms.
- [x] Resting anywhere in the room under the board raised the bottom ghost filling it (`[254, 546, 1160, 350]`, the board growing 328 → 658 with the pane's scroll range unchanged); its click held it under the `--state-hover` wash at `--state-ghost`; New Page landed a tile at that exact box with the caret.
- [x] On a board scrolled to its end the clearance offered the strip, fully inside the viewport; a press that arrived first and drifted a pixel opened the in-app menu hanging from the click; the strip held lit; New Page landed a full-width 250px band and the board's height eased (776 mid-transition → 1002).
- [x] The strip's reveal needs the pointer in the clearance; the last tile's bottom edge belongs to its resize edge, as designed.
- [x] Screenshots: `g-hover-dark.png`, `g-held-dark.png`, `bottom-fill-dark.png`, `strip-revealed-dark.png`, `strip-held-dark.png`, `wedge-landed-dark.png` in the session scratchpad (dark only).
- [x] Cards, over the scratch instance: a wheel scroll bringing a card under the resting pointer raised no ghost in 3s; one move raised it.
- [ ] The live pass by hand: the wheel scroll and after-drop cases on a board; Use Native Menus on (system menu at the click, Escape fades the ghost); Link Page and Link View (no `.md`, nothing in trash); a Space window under 480px (strip or bottom ghost, no wedge; standing ghost when empty; nothing when locked); Tab to the strip and Enter; deleting the last tile of a scrolled board easing up; a drag to the bottom growing the board unanimated; light-theme reads; Table and sidebar ghosts after a real move.

---

### Completion Criteria

**Conformance**

- [x] One hover mechanism: `grep -rn "useGhostAnchor(" Core UIX | grep -v test` lists the pre-existing consumers plus `TileGrid.tsx`, and `TileGrid.tsx` holds no `pointermove` listener of its own.
- [x] One wedge derivation: `grep -rn "wedgeFills(" Core | grep -v test` → its definition, the grid's memo, and the host's seat.
- [x] One add strip: `grep -rn "^\.mdpm-tbl-add {" Core/MarkdownPM` → no output, and `grep -n "^\.add-strip {" UIX/Interactions/ghost-create.css` → one hit.
- [x] One definition of the link rows: `grep -n "'Link Page'\|'Link View'" -r Core | grep -v test` → `tiles.ts` only.
- [x] `git diff --name-only ffbb04d72..HEAD` lists only files a task names, the commit hook's `Dashboard/Ledger/loc-history.json`, and the planning documents another session's `1d942e615` brought under version control.

**Correctness**

- [x] Every [CONFIRMED] entry of the decision log's *§A* through *§F* is traced to its line by the neutral verifier; the CDP checkpoint observed A-1, A-3, B-1..B-3, C-1..C-3, C-9, C-10, D-1, E-1..E-4, F-1 live, and the live pass by hand covers the rest.
- [x] A user on a fresh board can create a blank tile, a page tile, and a view tile from the ghost (the host tests and the live New Page landings), and cannot create one any other way from the background (the right-click path is gone; `grep onBackdrop|BackdropTarget|onGridContextMenu` → 0).

**Completeness**

- [x] Every task ticked; no scaffolding, debug output, TODO, or commented-out code in `ffbb04d72..HEAD` (grep of the added lines → 0).

**Confirmation**

- [x] Every VERIFY result read; the hook, layout, duplicate, and host lock and fill tests were run red against their change reverted, with the two exceptions *§Deviations* records.

**Continuity**

- [x] *§Reconciliation* walked (every listed phrase gone or rewritten); the living documents read true per the neutral verifier; *§Deviations* each fixed or ruled on.

**Confidence**

- [x] Gates green from clean at `cc9265e69`: `npm run typecheck` exit 0 · `npm run lint` "Checked 1409 files. No fixes applied." · `npm run test` 515 files, 7282 passed, 2 skipped. *§Baseline* counts: 13 → 0, 3 → 0, 28 → 32 (recorded), 4 → 5, 7 → 5, 7241 → 7282.
- [x] Diff size: +504 / −170 production lines (net +334) with comments and tests excluded; +900 / −59 test lines.

### Final Verification

**THE STANDARD:** The work is finished when a later review of it finds nothing to correct, and a neutral reader finds no reason the right-click path, a tile-only hover mechanism, or a second copy of anything would have been the better thing to have in the codebase. Nothing is carried as a concern, nothing is deferred where the fix is known, and nothing is declared that wasn't watched happen. Ambiguity met during execution took the simplest reading and was recorded under *§Deviations*.

- [x] Phase review dispatched (simplification first, then correctness, two reviewers each over Phases 1–2 and 3–4). Simplification: ten findings, all verified and folded in one commit — a point-anchored menu measures no trigger; the stacked-board wedge test pinned only the lone-tile case and left; `rects.test.ts`'s local `row` renamed `split`; the grid's `ResizeObserver` watches the pane too, so a vertical resize re-reads the room; the bottom zone rides `ghostAnchorProps` with `useClearStrandedGhost` keyed on `fill`; `findScroller` and `scrollContainer` share one `ancestorWhere`, `scrollsAxis` private; `seatBelow`'s band height is `h ?? NEW_TILE_H`; the host's seat branches once on the target's kind; three Task 4.4 comments cut or reworded; `lastElementChild!` in place of a fallback that could not run.
- [x] Correctness review dispatched (two adversarial reviewers, Phases 1–2 and 3–4): Phases 1 and 3 clean; six findings, five folded in `a4f93c7a3` — the hook's forgotten anchor drops its `pointermove` listener; the grid's sample watches the pane and its children, so a banner filling in above the board re-reads the room; a bottom ghost whose room closed draws nothing in that render; the bottom zone's anchor is `''`, the one id the codec lets no leaf carry; the spec's "one `tileMenuItems` model" sentence names both models (committed with the planning documents at close). One ruled on at closure and folded after it: a pick made after the host unmounted mid-menu (a keyboard-driven navigation while the Insert Menu is up) wrote an entry no layout seated, a gap `duplicateTile` shared from before this work; the seat now lands in the create's own write (*§Deviations*).
- [x] All findings fixed or ruled on
- [x] Neutral verification on `ffbb04d72..HEAD`: every [CONFIRMED] entry traced to its line, the four conformance greps as stated, no residue, no duplicated mechanism; not a pass at `a4f93c7a3` on five points, all folded — the spec's models sentence committed; `fillBelow` answers null (the strip) with no pane rather than a measured-looking 250; `GHOST_DWELL_MS` names the one dwell both ghosts share; the zone comment in `tile-grid.css` reads the room; the log's G-2 and the plan's Task 4.3 deviation corrected. Of its optional notes, the twin full-width literals became `bandBox` and the ghost comment lost its CSS clause; `createTile`'s body literals (a linked tile owns no file by design) and `scrollContainer`'s `xy` symmetry with `findScroller` stay.
- [x] Final pass: gates · baseline · diff · deviations · criteria
- [x] Reconciliation walked; living documents read
- [x] Report delivered, with the line-count difference

#### Reconciliation

- `Core/Tiles/README.md` — "withholds the backdrop's create menu"; the Module Map rows for `rects.ts`, `ops.ts`, `TileGrid.tsx`, `tileHandleMenu.ts` — Tasks 2.2, 3.2, 4.3
- `.claude/Features/SurfacePM.md` — right-click creation; "withholds background-create"; "convert and pick-tree arms"; the pending Insert menu — Task 4.3
- `.claude/Planning/TilesV2-Spec.md` — "reached by convert"; the background Insert menu — Task 4.3
- `.claude/FrameworkPM.md` — the background Insert menu — Task 4.3
- `.claude/Features/ViewTypesPM.md` — the hover ghost's surfaces and its arming — Task 4.3
- `.claude/Features/ConfigurationPM.md` — what Use Native Menus governs — Task 4.3
- `Core/Tiles/tilesFile.ts` — the "bare seed" comment — Task 3.1
- `Core/Tiles/tiles.ts` — `TilePick`'s comment; the `menuRows` order — Tasks 3.1, 3.2
- `Core/Tiles/TileGrid.tsx` — the KNOB comment naming the gutter — Task 2.2
- `Core/MarkdownPM/markdown-tables.css` — the strip's look, now the kit's; `.claude/Features/PommoraUIX.md` — what `ghost-create.css` holds — Task 2.4
- `Core/Tiles/tilesFile.test.ts` — the "bare seed" refusal test — Task 3.1
- `Core/Tiles/tiles.test.ts` — the pinned `menuRows` order — Task 3.2
- `.claude/Planning/Tiles System Audit.md` and its implementation plan describe the tree at their own dates and are left as written.

#### Report & Closure

The report follows the planning skill's shape: what the log asked for and what now exists, phase by phase, the verification results with each gate's real output, deviations, open items, the diff's line count with comments and tests excluded, and a closing stance.

### Deviations

- **Task 2.1, two tests not red against the old hook.** The "entered and left before any move" and "take() forgets the entered anchor" tests pass against the pre-change hook too, since its leave and `take()` already cleared the dwell. Each is red when its own line (`if (entered === id) entered = null`; `entered = null` in `take`) is removed from the new hook, which is what it pins. Kept as written.
- **Task 2.2, `wedgeFills`' column walk.** Biome's `useIterableCallbackReturn` refuses the AFTER's `forEach` arrow returning `walk(...)`; the column branch iterates `node.children.entries()` with `for…of` instead, the same walk.
- **Task 3.1, the `createTile(` test count.** 28 → 32: the 27 surviving calls re-signed, the deleted test's one call gone, and the three replacing tests carry five calls between them.
- **Task 4.1, the grid tests' click.** A drop in the file's gesture tests arms the kit's one-click swallow (`suppressNextClick`) on a `window.setTimeout(0)` jsdom never fires; the ghost-tile describe spends it with a throwaway `document.body.click()` in its `beforeEach`, and its clicks carry a press and release as a real click does.
- **Task 4.3, the spec's recipe sentence.** `TilesV2-Spec.md`'s "when a menu converts into it" became "when a menu creates or converts into it" alongside the plan's "pick-entry and pick-tree arms" swap, since the same sentence names when the member is required. `Planning/` left `.claude/.gitignore` during execution (`1d942e615`), so the spec, the plan, and the log are committed with the rest.
- **Task 4.4 is Nathan's mid-checkpoint ruling, not a drift:** the strip read as stingy on a board with half a screen free, so the bottom zone takes the shape the room allows. Recorded in the log at Overview, Concepts, A-3, A-5, C-2, C-3, C-9, D-1, G-2.
- **Full suite from clean after Task 4.4 (`8ad07fbc7`, scratch instance closed):** 515 files, 7282 passed, 2 skipped, exit 0, no unhandled errors; the earlier timeouts and the rejection were load.
- **Full-suite run after Task 2.1:** two `embedAbsorb.test.tsx` 5s timeouts and one unhandled rejection from `useViewHost.test.tsx` (`notifications.ts:69` reading `ok` on an undefined reply) under the full parallel run; each file passes alone before and after the change, and the baseline run was clean. Watched at the later full runs.
- **Post-closure fold, the seat in the write (`739f46542`).** `tiles:create` takes the `InsertTarget` beside its pick and `tiles:duplicateTile` seats its copy, each landing the entry and its leaf in one write over the disk's layout, as `restoreTile` does — `seatBelow` after `wedgeFills` for a wedge, `seatBelow(…, null, h)` for an append, under the source at its height for a copy — so a pick that lands after its host unmounted still shows on the board. `wedgeFills` moved from `rects.ts` to `ops.ts` beside `seatBelow`, since `rects.ts` borrows its `Rect` type from a React file the host-run half can't import. The store's `seatTileWrite` flushes the layout it owes before the write and adopts the landed layout, deferring to a held gesture's release as a reload does; the host's two `commitLayout` seats are gone. The in-flight seat tests moved to `tilesFile.test.ts` against the disk's layout, and a host test pins the adoption and the held-gesture deferral (each red with its line removed). Code lines (comments and tests excluded): +25, net-positive where the ruling expected negative — the host shed 18, while the main side gained the target's schema, the one-write seat helper, and the flush-first entry point. Residual: a layout change committed while the write is in flight — a sibling's gesture pressed inside the round trip — saves a tree without the new leaf, and the tile's entry stays unseated until it is placed again.
- **Post-closure fold, `caretPane`'s scroller (`636c1a3e8`).** The editor's surface is `scrollContainer(view.dom, 'y') ?? document.body`, the kit's would-scroll walk in place of the hand-walk; it now also weighs `body` and `html`, which resolve to the same viewport-wide bounds. Code lines: −5.
