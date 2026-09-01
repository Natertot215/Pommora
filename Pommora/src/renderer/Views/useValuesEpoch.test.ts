import { describe, expect, it } from 'vitest'
import type { PageFrontmatter } from '@shared/schemas'
import { patchOverride, retireSettled, type Overrides } from './useValuesEpoch'

const fm = (id: string): PageFrontmatter => ({ id }) as never
const inFlight = new Promise(() => {})
const overrides: Overrides = {
  a: { fm: fm('a'), write: inFlight },
  b: { fm: fm('b'), write: null },
}

describe('retireSettled', () => {
  it('a push naming ids retires them, pending or not', () => {
    expect(retireSettled(overrides, ['a'])).toEqual({ b: overrides.b })
    expect(retireSettled(overrides, ['b'])).toEqual({ a: overrides.a })
  })

  it('a push naming none retires only the settled', () => {
    expect(retireSettled(overrides, null)).toEqual({ a: overrides.a })
  })

  it('an emptied map is null, and null stays null', () => {
    expect(retireSettled(overrides, ['a', 'b'])).toBeNull()
    expect(retireSettled({ b: overrides.b }, null)).toBeNull()
    expect(retireSettled(null, ['a'])).toBeNull()
  })
})

describe('patchOverride', () => {
  it('seeds pending and settles once the write lands', async () => {
    let state: Overrides | null = null
    const set: Parameters<typeof patchOverride>[0] = (next) => {
      state = typeof next === 'function' ? next(state) : next
    }
    let land: () => void = () => {}
    const settled = new Promise<void>((r) => {
      land = r
    })
    patchOverride(set, 'a', fm('a'), settled)
    expect(state).toEqual({ a: { fm: fm('a'), write: settled } })
    land()
    await settled
    await Promise.resolve()
    expect(state).toEqual({ a: { fm: fm('a'), write: null } })
  })

  it('an older write landing does not settle a newer override on the same page', async () => {
    let state: Overrides | null = null
    const set: Parameters<typeof patchOverride>[0] = (next) => {
      state = typeof next === 'function' ? next(state) : next
    }
    const first = Promise.resolve()
    patchOverride(set, 'a', fm('a'), first)
    patchOverride(set, 'a', fm('a2'), inFlight)
    await first
    await Promise.resolve()
    expect(state).toEqual({ a: { fm: fm('a2'), write: inFlight } })
    expect(retireSettled(state, null)).toEqual(state)
  })

  it('an override retired before its write lands stays retired', async () => {
    let state: Overrides | null = null
    const set: Parameters<typeof patchOverride>[0] = (next) => {
      state = typeof next === 'function' ? next(state) : next
    }
    const settled = Promise.resolve()
    patchOverride(set, 'a', fm('a'), settled)
    state = null
    await settled
    await Promise.resolve()
    expect(state).toBeNull()
  })
})
