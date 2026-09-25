import { describe, expect, it } from 'vitest'
import type { TileLayout } from './model'
import { removeLeaf, repairLayout } from './ops'
import { decodeLayout } from './codec'

const stored = (l: TileLayout): unknown => JSON.parse(JSON.stringify(l))

const real = (): TileLayout => ({
  bands: [
    {
      node: {
        kind: 'row',
        ratios: [1 - 0.3, 0.3],
        children: [
          { kind: 'tile', id: 'a', h: 200 },
          { kind: 'tile', id: 'b', h: 200 },
        ],
      },
    },
  ],
})

describe('codec', () => {
  it('round-trips a real layout', () => {
    const l = real()
    expect(decodeLayout(stored(l))).toEqual(l)
  })

  it('rejects anything that is not a layout', () => {
    expect(decodeLayout(42)).toBeNull()
    expect(decodeLayout(null)).toBeNull()
    expect(decodeLayout(undefined)).toBeNull()
    expect(decodeLayout({ bands: 'no' })).toBeNull()
  })

  it('drops a band it cannot read and keeps the rest', () => {
    const bad = [{ node: { kind: 'row', children: [] } }, { node: { kind: 'nope' } }]
    expect(decodeLayout({ bands: [...bad, ...real().bands] })).toEqual(real())
  })

  it('reads a value off its type, a lone child, and a short share list as repairs, not as a lost band', () => {
    const tile = (id: string, h: unknown) => ({ kind: 'tile' as const, id, h })
    const decoded = decodeLayout({
      bands: [
        { node: { kind: 'row', ratios: [0.5], children: [tile('a', null), tile('b', '200')] } },
        { node: { kind: 'column', children: [tile('c', 120)] } },
      ],
    })
    expect(decoded).toEqual({
      bands: [
        { node: { kind: 'row', ratios: [0.5, 0.5], children: [tile('a', 64), tile('b', 64)] } },
        { node: tile('c', 120) },
      ],
    })
  })

  it('repairs a stored tree to the rules the ops keep', () => {
    const tile = (id: string, h: number) => ({ kind: 'tile' as const, id, h })
    const decoded = decodeLayout({
      bands: [
        {
          node: {
            kind: 'row',
            ratios: [1, 1, -1],
            children: [tile('a', 200), tile('b', 0), tile('c', 200)],
          },
        },
        { node: { kind: 'row', ratios: [0.5, 0.5], children: [tile('a', 100), tile('d', 100)] } },
      ],
    })
    expect(decoded).toEqual({
      bands: [
        {
          node: {
            kind: 'row',
            ratios: [1 / 3, 1 / 3, 1 / 3],
            children: [tile('a', 200), tile('b', 64), tile('c', 200)],
          },
        },
        { node: tile('d', 100) },
      ],
    })
    expect(decodeLayout(stored(decoded as TileLayout))).toEqual(decoded)
  })
})

describe('ops keep the tree decodable', () => {
  it('removing a tile collapses the single-child split it leaves behind', () => {
    const l = removeLeaf(real(), 'b')
    expect(repairLayout(l, 1)).toEqual(l)
    expect(decodeLayout(stored(l))).toEqual(l)
  })

  it('emptying a band drops it rather than leaving a childless node', () => {
    const l = removeLeaf(removeLeaf(real(), 'b'), 'a')
    expect(l.bands).toEqual([])
  })
})
