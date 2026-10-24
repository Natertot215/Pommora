import { describe, it, expect } from 'vitest'
import { STASHED_AT } from '../Testing/definitions'
import { patchStashBlock, stashedBlock } from './propertyStash'

describe('the stash block', () => {
  it('reads a stamped block, and none without a stamp', () => {
    const sidecar = {
      id: 'c',
      property_stash: {
        p: { removed_at: STASHED_AT, values: { a: 1 } },
        q: { values: { b: 2 } },
        r: { removed_at: STASHED_AT, values: 'x' },
      },
    }
    expect(stashedBlock(sidecar, 'p')).toEqual({ removed_at: STASHED_AT, values: { a: 1 } })
    expect(stashedBlock(sidecar, 'q')).toBeNull()
    expect(stashedBlock(sidecar, 'r')).toBeNull()
    expect(stashedBlock(sidecar, 'absent')).toBeNull()
  })

  it("writes the block it's given, and a block with no values, or none, leaves no key", () => {
    const block = { removed_at: '2026-10-20T00:00:00.000Z', values: { a: 2 } }
    expect(patchStashBlock({ id: 'c' }, 'p', block)).toEqual({
      id: 'c',
      property_stash: { p: block },
    })
    const held = { id: 'c', property_stash: { p: { removed_at: STASHED_AT, values: { a: 1 } } } }
    expect(patchStashBlock(held, 'p', { removed_at: STASHED_AT, values: {} })).toEqual({ id: 'c' })
    expect(patchStashBlock(held, 'p')).toEqual({ id: 'c' })
  })

  it('an `above` leaves with its value', () => {
    const written = patchStashBlock({ id: 'c' }, 'p', {
      removed_at: STASHED_AT,
      values: { a: 1 },
      above: { a: 'Zed', b: 'Note' },
    })
    expect(JSON.parse(JSON.stringify(written)).property_stash.p).toEqual({
      removed_at: STASHED_AT,
      values: { a: 1 },
      above: { a: 'Zed' },
    })
    const placeless = patchStashBlock({ id: 'c' }, 'p', {
      removed_at: STASHED_AT,
      values: { a: 1 },
      above: { b: 'Note' },
    })
    expect(JSON.parse(JSON.stringify(placeless)).property_stash.p).not.toHaveProperty('above')
  })
})
