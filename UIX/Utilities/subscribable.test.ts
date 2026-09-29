import { describe, expect, it, vi } from 'vitest'
import { channel } from './subscribable'

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

  it('stops notifying after an unsubscribe', () => {
    const c = channel(1)
    const fn = vi.fn()
    const off = c.subscribe(fn)
    off()
    c.set(2)
    expect(fn).not.toHaveBeenCalled()
  })
})
