// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { aspectFor, subscribeAspect } from './imageAspect'

let images: MockImage[] = []
class MockImage {
  onload: (() => void) | null = null
  onerror: (() => void) | null = null
  naturalWidth = 0
  naturalHeight = 0
  set src(_v: string) {
    images.push(this)
  }
}
let rafCbs: FrameRequestCallback[] = []
let rafCount = 0

beforeEach(() => {
  images = []
  rafCbs = []
  rafCount = 0
  vi.stubGlobal('Image', MockImage)
  vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => {
    rafCount++
    rafCbs.push(cb)
    return rafCount
  })
})
const flush = (): void => {
  const cbs = rafCbs
  rafCbs = []
  for (const cb of cbs) cb(0)
}
// Flush any pending frame so the module's coalescing flag resets between tests.
afterEach(() => {
  flush()
  vi.unstubAllGlobals()
})

describe('imageAspect', () => {
  it('answers undefined on a miss, then the natural aspect after load, keyed by URL', () => {
    expect(aspectFor('u1')).toBeUndefined()
    expect(images).toHaveLength(1)
    images[0].naturalWidth = 200
    images[0].naturalHeight = 100
    images[0].onload?.()
    expect(aspectFor('u1')).toBe(0.5)
    aspectFor('u1')
    expect(images).toHaveLength(1)
  })

  it('answers null for an image that will not load', () => {
    expect(aspectFor('u2')).toBeUndefined()
    images[0].onerror?.()
    expect(aspectFor('u2')).toBeNull()
  })

  it('coalesces the repaint into one frame for two resolves', () => {
    const fn = vi.fn()
    const unsub = subscribeAspect(fn)
    aspectFor('u3')
    aspectFor('u4')
    images[0].naturalWidth = 10
    images[0].naturalHeight = 10
    images[0].onload?.()
    images[1].naturalWidth = 10
    images[1].naturalHeight = 20
    images[1].onload?.()
    expect(rafCount).toBe(1)
    flush()
    expect(fn).toHaveBeenCalledTimes(1)
    unsub()
  })
})
