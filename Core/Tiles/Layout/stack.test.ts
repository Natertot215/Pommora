import { describe, expect, it } from 'vitest'
import type { TileLayout, TileLeaf } from './model'
import { getTile, tileIds, validateLayout } from './model'
import { insertBand, splitAtTile } from './ops'
import { computeGeometry } from './rects'
import { stackedAt, stackLayout } from './stack'

// band 0: row [ a | column[b, c] ] · band 1: d
const board = (): TileLayout => {
  let l = insertBand({ bands: [] }, 0, 'a', 200)
  l = splitAtTile(l, 'a', 'e', 'b')
  l = splitAtTile(l, 'b', 's', 'c')
  return insertBand(l, 1, 'd', 140)
}

describe('stackLayout', () => {
  it('flattens every row to one band per tile in reading order, heights kept', () => {
    const stacked = stackLayout(board())
    expect(validateLayout(stacked)).toEqual([])
    expect(tileIds(stacked)).toEqual(['a', 'b', 'c', 'd'])
    expect(stacked.bands.map((b) => (b.node as TileLeaf).h)).toEqual([200, 100, 100, 140])
    expect(stacked.bands.every((b) => b.node.kind === 'tile')).toBe(true)
  })

  it('takes a nested row inside a column left to right at its place in the column', () => {
    let l = insertBand({ bands: [] }, 0, 'x', 100)
    l = splitAtTile(l, 'x', 's', 'y')
    l = splitAtTile(l, 'y', 'e', 'z')
    expect(tileIds(stackLayout(l))).toEqual(['x', 'y', 'z'])
  })

  it('lays the column full width down the surface', () => {
    const geo = computeGeometry(stackLayout(board()), 300, 8)
    expect(geo.tiles.get('a')).toEqual({ x: 0, y: 0, w: 300, h: 200 })
    expect(geo.tiles.get('b')).toEqual({ x: 0, y: 208, w: 300, h: 100 })
    expect(geo.tiles.get('c')).toEqual({ x: 0, y: 316, w: 300, h: 100 })
    expect(geo.tiles.get('d')).toEqual({ x: 0, y: 424, w: 300, h: 140 })
    expect(geo.totalHeight).toBe(564)
    expect(geo.dividers).toEqual([])
  })

  it('shares no node with the tree it derives from', () => {
    const source = board()
    const stacked = stackLayout(source)
    ;(stacked.bands[0]?.node as TileLeaf).h = 999
    expect(getTile(source, 'a')?.h).toBe(200)
  })

  it('takes an empty layout to an empty layout', () => {
    expect(stackLayout({ bands: [] })).toEqual({ bands: [] })
  })
})

describe('stackedAt', () => {
  it('stacks below the threshold and holds until the margin is regained', () => {
    expect(stackedAt(487, false)).toBe(true)
    expect(stackedAt(488, false)).toBe(false)
    expect(stackedAt(500, true)).toBe(true)
    expect(stackedAt(527, true)).toBe(true)
    expect(stackedAt(528, true)).toBe(false)
  })
})
