import { describe, expect, it } from 'vitest'
import type { PageFrontmatter } from '@shared/schemas'
import { patchOverride, retireSettled, type Overrides } from './useValuesEpoch'

const fm = (id: string): PageFrontmatter => ({ id }) as never
const overrides: Overrides = {
  a: { fm: fm('a'), pending: true },
  b: { fm: fm('b'), pending: false },
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
    expect(state).toEqual({ a: { fm: fm('a'), pending: true } })
    land()
    await settled
    await Promise.resolve()
    expect(state).toEqual({ a: { fm: fm('a'), pending: false } })
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
