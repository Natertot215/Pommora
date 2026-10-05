import { describe, expect, it } from 'vitest'
import { attachBelow, insertBand } from './ops'
import { splitTile } from '../../Testing/tileLayouts'
import type { LayoutNode, TileLayout, TileLeaf } from './model'
import { placeTiles, wedgeFills } from './rects'
import { stackLayout } from './stack'

describe('placeTiles', () => {
  it('places a row as shares of the width with the gutters fixed', () => {
    const row = splitTile(insertBand({ bands: [] }, 0, 'a', 200), 'a', 'e', 'b')
    const b = placeTiles(row, 8).tiles.get('b')
    expect(b?.x).toEqual({ share: 0.5, px: 4 })
    expect(b?.w).toEqual({ share: 0.5, px: -4 })
  })
})

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

const FIXTURES: TileLayout[] = [
  board(),
  board(tile('a', 200)),
  board(row(tile('a', 200), tile('b', 100), tile('c', 160))),
  board(row(tile('a', 200), tile('b', 128))),
  board(row(tile('a', 200), tile('b', 129))),
  board(row(column(tile('a', 100), tile('b', 50)), tile('c', 300))),
  board(column(row(tile('a', 100), tile('b', 200)), tile('e', 100))),
  board(row(column(tile('x', 50), row(tile('a', 100), tile('b', 60))), tile('c', 400))),
  board(column(column(tile('a', 100), tile('b', 100)), tile('c', 100))),
  board(row(tile('a', 100), tile('b', 200)), tile('c', 100)),
]

describe('wedgeFills', () => {
  it('an empty board and a lone tile have no wedge', () => {
    expect(fills(board())).toEqual({})
    expect(fills(board(tile('a', 200)))).toEqual({})
  })

  it('a row’s shorter children end above its floor, less the gutter', () => {
    expect(fills(board(row(tile('a', 200), tile('b', 100), tile('c', 160))))).toEqual({ b: 92 })
  })

  it('a wedge under the minimum height is no wedge', () => {
    expect(fills(board(row(tile('a', 200), tile('b', 128))))).toEqual({ b: 64 })
    expect(fills(board(row(tile('a', 200), tile('b', 129))))).toEqual({})
  })

  it('only a column’s last child inherits the room under the column', () => {
    expect(fills(board(row(column(tile('a', 100), tile('b', 50)), tile('c', 300))))).toEqual({
      b: 134,
    })
    expect(fills(board(column(row(tile('a', 100), tile('b', 200)), tile('e', 100))))).toEqual({
      a: 92,
    })
    expect(
      fills(board(row(column(tile('x', 50), row(tile('a', 100), tile('b', 60))), tile('c', 400)))),
    ).toEqual({ a: 234, b: 274 })
    expect(fills(board(column(column(tile('a', 100), tile('b', 100)), tile('c', 100))))).toEqual({})
  })

  it('a band’s floor is its own; the next band offers no room', () => {
    expect(fills(board(row(tile('a', 100), tile('b', 200)), tile('c', 100)))).toEqual({ a: 92 })
  })

  it('a stacked board has no wedge', () => {
    for (const x of FIXTURES) expect(wedgeFills(stackLayout(x), 8, 64).size).toBe(0)
  })

  it('a tile attached below at its fill lands flush on the floor and moves nothing else', () => {
    for (const x of FIXTURES) {
      const before = placeTiles(x, 8)
      for (const [id, fill] of wedgeFills(x, 8, 64)) {
        const next = attachBelow(x, id, 'n', fill)
        const after = placeTiles(next, 8)
        for (const [tid, p] of before.tiles) expect(after.tiles.get(tid)).toEqual(p)
        expect(after.seams).toEqual(before.seams)
        expect(after.totalHeight).toBe(before.totalHeight)
        const p = before.tiles.get(id)
        if (!p) throw new Error(`no placement for ${id}`)
        expect(after.tiles.get('n')).toEqual({ x: p.x, y: p.y + p.h + 8, w: p.w, h: fill })
        expect(wedgeFills(next, 8, 64).has(id)).toBe(false)
      }
    }
  })
})
