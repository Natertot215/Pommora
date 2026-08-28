import { describe, expect, it } from 'vitest'
import { validateLayout } from './model'
import { insertBand, splitAtTile, removeTile } from './ops'
import { decodeLayout, encodeLayout } from './codec'

const real = (): ReturnType<typeof splitAtTile> =>
  splitAtTile(insertBand({ bands: [] }, 0, 'a', 200), 'a', 'e', 'b', 0.3)

describe('codec', () => {
  it('round-trips a real layout', () => {
    const l = real()
    expect(decodeLayout(encodeLayout(l))).toEqual(l)
  })

  it('a decoded layout is structurally valid', () => {
    const decoded = decodeLayout(encodeLayout(real()))
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

// The invariants decodeLayout used to re-establish are the writer's job, so assert them there.
describe('ops keep the tree decodable', () => {
  it('a split renormalizes its ratios', () => {
    const l = real()
    const decoded = decodeLayout(encodeLayout(l))
    expect(decoded && validateLayout(decoded)).toEqual([])
  })

  it('removing a tile collapses the single-child split it leaves behind', () => {
    const l = removeTile(real(), 'b')
    expect(validateLayout(l)).toEqual([])
    expect(decodeLayout(encodeLayout(l))).toEqual(l)
  })

  it('emptying a band drops it rather than leaving a childless node', () => {
    const l = removeTile(removeTile(real(), 'b'), 'a')
    expect(l.bands).toEqual([])
    expect(validateLayout(l)).toEqual([])
  })
})
