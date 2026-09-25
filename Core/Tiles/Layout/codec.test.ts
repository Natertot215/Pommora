import { describe, expect, it } from 'vitest'
import type { TileLayout } from './model'
import { removeLeaf } from './ops'
import { validateLayout } from '../../Testing/tileLayouts'
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

  it('a decoded layout is structurally valid', () => {
    const decoded = decodeLayout(stored(real()))
    expect(decoded && validateLayout(decoded)).toEqual([])
  })

  it('rejects anything that is not a layout', () => {
    expect(decodeLayout(42)).toBeNull()
    expect(decodeLayout(null)).toBeNull()
    expect(decodeLayout(undefined)).toBeNull()
    expect(decodeLayout({ bands: 'no' })).toBeNull()
  })

  it('rejects a malformed node rather than salvaging it — the writer never emits one', () => {
    expect(decodeLayout({ bands: [{ node: { kind: 'tile', id: 'a', h: null } }] })).toBeNull()
    expect(decodeLayout({ bands: [{ node: { kind: 'row', children: [] } }] })).toBeNull()
    expect(decodeLayout({ bands: [{ node: { kind: 'nope' } }] })).toBeNull()
  })
})

describe('ops keep the tree decodable', () => {
  it('removing a tile collapses the single-child split it leaves behind', () => {
    const l = removeLeaf(real(), 'b')
    expect(validateLayout(l)).toEqual([])
    expect(decodeLayout(stored(l))).toEqual(l)
  })

  it('emptying a band drops it rather than leaving a childless node', () => {
    const l = removeLeaf(removeLeaf(real(), 'b'), 'a')
    expect(l.bands).toEqual([])
    expect(validateLayout(l)).toEqual([])
  })
})
