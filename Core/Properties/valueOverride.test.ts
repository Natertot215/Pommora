import { describe, expect, it } from 'vitest'
import type { PropertyValue } from './propertyValue'
import {
  patchOverride,
  retireSettled,
  settled as settleCount,
  type Overrides,
} from './valueOverride'

const select = (value: string): PropertyValue => ({ kind: 'select', value })
const inFlight = new Promise<boolean>(() => {})
const overrides: Overrides = {
  a: { picked: { p: select('a') }, write: inFlight },
  b: { picked: { p: select('b') }, write: 0 },
}

describe('retireSettled', () => {
  it('retires only settled overrides, among the named pages or across every page for null', () => {
    expect(retireSettled(overrides, ['a', 'b'])).toEqual({ a: overrides.a })
    expect(retireSettled(overrides, ['a'])).toEqual(overrides)
    expect(retireSettled(overrides, [])).toEqual(overrides)
    expect(retireSettled(overrides, null)).toEqual({ a: overrides.a })
  })

  it('an emptied map is null, and null stays null', () => {
    expect(retireSettled({ b: overrides.b }, ['b'])).toBeNull()
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
    let land: (landed: boolean) => void = () => {}
    const settled = new Promise<boolean>((r) => {
      land = r
    })
    patchOverride(set, 'a', { p: select('a') }, settled)
    expect(state).toEqual({ a: { picked: { p: select('a') }, write: settled } })
    land(true)
    await settled
    await Promise.resolve()
    expect(state).toEqual({ a: { picked: { p: select('a') }, write: settleCount() } })
  })

  it('an older write landing does not settle a newer override on the same page', async () => {
    let state: Overrides | null = null
    const set: Parameters<typeof patchOverride>[0] = (next) => {
      state = typeof next === 'function' ? next(state) : next
    }
    const first = Promise.resolve(true)
    patchOverride(set, 'a', { p: select('a') }, first)
    patchOverride(set, 'a', { p: select('a2') }, inFlight)
    await first
    await Promise.resolve()
    expect(state).toEqual({ a: { picked: { p: select('a2') }, write: inFlight } })
    expect(retireSettled(state, null)).toEqual(state)
  })

  it('an override retired before its write lands stays retired', async () => {
    let state: Overrides | null = null
    const set: Parameters<typeof patchOverride>[0] = (next) => {
      state = typeof next === 'function' ? next(state) : next
    }
    const settled = Promise.resolve(true)
    patchOverride(set, 'a', { p: select('a') }, settled)
    state = null
    await settled
    await Promise.resolve()
    expect(state).toBeNull()
  })

  it('a pending pick outlives a later pick on another field and merges per field', () => {
    let state: Overrides | null = null
    const set: Parameters<typeof patchOverride>[0] = (next) => {
      state = typeof next === 'function' ? next(state) : next
    }
    patchOverride(set, 'a', { ctx1: { kind: 'context', value: ['s1'] } }, inFlight)
    patchOverride(set, 'a', { p: select('a') }, inFlight)
    patchOverride(set, 'a', { p: select('a2') }, inFlight)
    expect(state).toEqual({
      a: { picked: { ctx1: { kind: 'context', value: ['s1'] }, p: select('a2') }, write: inFlight },
    })
  })

  it('a refused write takes its override with it, leaving the others', async () => {
    let state: Overrides | null = { b: overrides.b }
    const set: Parameters<typeof patchOverride>[0] = (next) => {
      state = typeof next === 'function' ? next(state) : next
    }
    const refused = Promise.resolve(false)
    patchOverride(set, 'a', { p: select('a') }, refused)
    await refused
    await Promise.resolve()
    expect(state).toEqual({ b: overrides.b })
  })
})
