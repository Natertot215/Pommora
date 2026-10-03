import { describe, expect, it, vi } from 'vitest'
import { channel, emitter } from './subscribable'

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

describe('emitter', () => {
  it('hands every emit to each subscriber until it unsubscribes', () => {
    const e = emitter<number>()
    const fn = vi.fn()
    const off = e.subscribe(fn)
    e.emit(1)
    e.emit(1)
    off()
    e.emit(2)
    expect(fn.mock.calls).toEqual([[1], [1]])
  })
})
