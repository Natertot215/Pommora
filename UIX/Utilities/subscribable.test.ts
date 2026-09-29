import { describe, expect, it, vi } from 'vitest'
import { channel, signal } from './subscribable'

describe('signal', () => {
  it('notifies every subscriber', () => {
    const s = signal()
    const a = vi.fn()
    const b = vi.fn()
    s.subscribe(a)
    s.subscribe(b)
    s.notify()
    expect(a).toHaveBeenCalledTimes(1)
    expect(b).toHaveBeenCalledTimes(1)
  })

  it('stops notifying after an unsubscribe', () => {
    const s = signal()
    const a = vi.fn()
    const off = s.subscribe(a)
    off()
    s.notify()
    expect(a).not.toHaveBeenCalled()
  })
})

describe('channel', () => {
  it('notifies on a change and not on an Object.is-equal set', () => {
    const c = channel(1)
    const fn = vi.fn()
    c.subscribe(fn)
    c.set(1)
    expect(fn).not.toHaveBeenCalled()
    c.set(2)
    expect(fn).toHaveBeenCalledTimes(1)
    expect(c.get()).toBe(2)
  })

  it('treats NaN as equal to itself', () => {
    const c = channel(Number.NaN)
    const fn = vi.fn()
    c.subscribe(fn)
    c.set(Number.NaN)
    expect(fn).not.toHaveBeenCalled()
  })
})
